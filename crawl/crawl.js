import * as dom from "../shared/dom.js";
import * as array from "../shared/array.js";
import * as gfx from "./gfx.js";
import * as gen from "./gen.js";
import * as input from "../shared/input.js";
import * as rl from "./rl.js";
import * as geo from "../shared/geo2d.js";
import * as output from "./output.js";
import * as things from "./things.js";
import * as maps from "./maps.js";
const canvas = dom.byId("canvas");
const modalBackground = dom.byId("modalBackground");
const statsDialog = dom.byId("statsDialog");
const inventoryDialog = dom.byId("inventoryDialog");
const containerDialog = dom.byId("containerDialog");
const inventoryTable = dom.byId("inventoryTable");
const containerTable = dom.byId("containerTable");
const inventoryItemTemplate = dom.byId("inventoryItemTemplate");
const containerItemTemplate = dom.byId("containerItemTemplate");
var CommandType;
(function (CommandType) {
    CommandType[CommandType["Move"] = 0] = "Move";
    CommandType[CommandType["Equip"] = 1] = "Equip";
    CommandType[CommandType["Use"] = 2] = "Use";
    CommandType[CommandType["Pass"] = 3] = "Pass";
    CommandType[CommandType["Open"] = 4] = "Open";
    CommandType[CommandType["Attack"] = 5] = "Attack";
    CommandType[CommandType["ClimbUp"] = 6] = "ClimbUp";
    CommandType[CommandType["ClimbDown"] = 7] = "ClimbDown";
})(CommandType || (CommandType = {}));
async function generateMap(player, renderer, width, height) {
    const map = gen.generateMap(width, height, player);
    // bake all 24x24 tile images to a single array texture
    // store mapping from image url to index
    let imageUrls = [];
    imageUrls.push(...array.map(map.tiles, t => t.image));
    imageUrls.push(...array.map(map.fixtures, t => t.image));
    imageUrls.push(...array.map(map.monsters, c => c.image));
    imageUrls.push(player.image);
    imageUrls = imageUrls.filter(url => url);
    imageUrls = array.distinct(imageUrls);
    const layerMap = new Map(imageUrls.map((url, i) => [url, i]));
    const images = await Promise.all(imageUrls.map(url => dom.loadImage(url)));
    const texture = renderer.bakeTextureArray(rl.tileSize, rl.tileSize, images);
    for (const th of map) {
        if (!th.image) {
            th.textureLayer = -1;
            th.texture = null;
            continue;
        }
        const layer = layerMap.get(th.image);
        if (layer === undefined) {
            throw new Error(`texture index not found for ${th.image}`);
        }
        th.texture = texture;
        th.textureLayer = layer;
    }
    return map;
}
function tick(renderer, inp, map) {
    const cmd = handleInput(map, inp);
    if (cmd) {
        processTurn(map, cmd);
    }
    drawFrame(renderer, map);
    requestAnimationFrame(() => tick(renderer, inp, map));
}
function processTurn(map, cmd) {
    // find creature with max agility
    // everyone moves relative to this rate
    // everyone gets one action point per round
    // fastest creature(s) require 1 action point to move
    // the rest require an amount of action points according to their ratio with the fastest
    // this all should be repeated until player's turn is processed at which point we should wait for next player move
    const creatures = array.orderByDesc(array.append(map.monsters, map.player), m => m.agility);
    const maxAgility = creatures.reduce((x, y) => x.agility < y.agility ? x : y).agility;
    const actionPerRound = 1 / maxAgility;
    let playerMoved = false;
    while (!playerMoved) {
        for (const creature of creatures) {
            if (creature.action < 1) {
                creature.action += actionPerRound;
                continue;
            }
            creature.action -= 1;
            if (creature instanceof rl.Player) {
                tickPlayer(map, creature, cmd);
                playerMoved = true;
            }
            if (creature instanceof rl.Monster) {
                tickMonster(map, creature);
            }
        }
        if (map.player.position) {
            maps.updateVisibility(map, map.player.position, rl.lightRadius);
        }
    }
}
function getScrollOffset(playerPosition) {
    // convert map point to canvas point, noting that canvas is centered on player
    const canvasCenter = new geo.Point(canvas.width / 2, canvas.height / 2);
    const offset = canvasCenter.subPoint(playerPosition.addScalar(.5).mulScalar(rl.tileSize));
    return offset.floor();
}
function canvasToMapPoint(playerPosition, cxy) {
    const scrollOffset = getScrollOffset(playerPosition);
    const mxy = cxy.subPoint(scrollOffset).divScalar(rl.tileSize);
    return mxy;
}
function mapToCanvasPoint(playerPosition, mxy) {
    const scrollOffset = getScrollOffset(playerPosition);
    const cxy = mxy.mulScalar(rl.tileSize).addPoint(scrollOffset);
    return cxy;
}
function handleInput(map, inp) {
    const player = map.player;
    if (!player.position) {
        return null;
    }
    const position = player.position.clone();
    if (inp.mouseLeftPressed) {
        // determine the map coordinates the user clicked on
        const mxy = canvasToMapPoint(player.position, new geo.Point(inp.mouseX, inp.mouseY)).floor();
        const clickFixture = map.fixtureAt(mxy);
        if (clickFixture) {
            output.info(`You see ${clickFixture.name}`);
            inp.flush();
            return null;
        }
        const clickCreature = map.monsterAt(mxy);
        if (clickCreature) {
            output.info(`You see ${clickCreature.name}`);
            inp.flush();
            return null;
        }
        const dxy = mxy.subPoint(player.position);
        const sgn = dxy.sign();
        const abs = dxy.abs();
        if (abs.x > 0 && abs.x >= abs.y) {
            position.x += sgn.x;
        }
        if (abs.y > 0 && abs.y > abs.x) {
            position.y += sgn.y;
        }
    }
    else if (inp.pressed("w")) {
        position.y -= 1;
    }
    else if (inp.pressed("s")) {
        position.y += 1;
    }
    else if (inp.pressed("a")) {
        position.x -= 1;
    }
    else if (inp.pressed("d")) {
        position.x += 1;
    }
    else if (inp.pressed("z")) {
        showStats(player);
    }
    else if (inp.pressed("i")) {
        showInventory(player);
    }
    inp.flush();
    if (position.equal(player.position)) {
        return null;
    }
    const tile = map.tileAt(position);
    if (tile && !tile.passable) {
        output.info(`Can't move that way, blocked by ${tile.name}`);
        return null;
    }
    const fixture = map.fixtureAt(position);
    if (fixture instanceof rl.Door) {
        return {
            type: CommandType.Open,
            fixture: fixture
        };
    }
    else if (fixture instanceof rl.StairsUp) {
        return { type: CommandType.ClimbUp };
    }
    else if (fixture instanceof rl.StairsDown) {
        return { type: CommandType.ClimbDown };
    }
    else if (fixture && !fixture.passable) {
        output.info(`Can't move that way, blocked by ${fixture.name}`);
        return null;
    }
    const container = map.containerAt(position);
    if (container) {
    }
    const monster = map.monsterAt(position);
    if (monster && !monster.passable) {
        return {
            type: CommandType.Attack,
            monster: monster
        };
    }
    return {
        type: CommandType.Move,
        position: position
    };
}
function drawFrame(renderer, map) {
    const player = map.player;
    if (!player.position) {
        return;
    }
    handleResize(renderer.canvas);
    // center the grid around the playerd
    const offset = getScrollOffset(player.position);
    // note - drawing order matters - draw from bottom to top
    // draw various layers of sprites
    for (const tile of map.tiles) {
        drawThing(renderer, offset, tile);
    }
    for (const fixture of map.fixtures) {
        drawThing(renderer, offset, fixture);
    }
    for (const creature of map.monsters) {
        drawThing(renderer, offset, creature);
    }
    drawThing(renderer, offset, player);
    drawHealthBar(renderer, player, offset);
    renderer.flush();
}
function drawThing(renderer, offset, th) {
    // don't draw things that aren't positioned
    if (!th.position) {
        return;
    }
    if (th.visible === rl.Visibility.None) {
        return;
    }
    const color = th.color.clone();
    if (th.visible === rl.Visibility.Fog) {
        color.a = .5;
    }
    const spritePosition = th.position.mulScalar(rl.tileSize).addPoint(offset);
    const sprite = new gfx.Sprite({
        position: spritePosition,
        color: color,
        width: rl.tileSize,
        height: rl.tileSize,
        texture: th.texture,
        layer: th.textureLayer,
        flags: gfx.SpriteFlags.ArrayTexture
    });
    renderer.drawSprite(sprite);
}
function drawHealthBar(renderer, creature, offset) {
    if (!creature.position) {
        return;
    }
    const width = creature.maxHealth * 4 + 2;
    const spritePosition = creature.position.mulScalar(rl.tileSize).addPoint(offset).subPoint(new geo.Point(0, rl.tileSize / 2));
    renderer.drawSprite(new gfx.Sprite({
        position: spritePosition,
        color: gfx.Color.white,
        width: width,
        height: 8
    }));
    renderer.drawSprite(new gfx.Sprite({
        position: spritePosition.addPoint(new geo.Point(1, 1)),
        color: gfx.Color.red,
        width: width - 2,
        height: 6
    }));
}
function handleResize(canvas) {
    if (canvas.width === canvas.clientWidth && canvas.height === canvas.clientHeight) {
        return;
    }
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
function showDialog(dialog) {
    modalBackground.hidden = false;
    dialog.hidden = false;
    dialog.focus();
}
function hideDialog(dialog) {
    modalBackground.hidden = true;
    dialog.hidden = true;
    canvas.focus();
}
function showStats(player) {
    const healthSpan = dom.byId("statsHealth");
    const attackSpan = dom.byId("statsAttack");
    const defenseSpan = dom.byId("statsDefense");
    const agilitySpan = dom.byId("statsAgility");
    const levelSpan = dom.byId("statsLevel");
    const experienceSpan = dom.byId("statsExperience");
    const experienceRequirement = rl.getExperienceRequirement(player.level + 1);
    healthSpan.textContent = `${player.health} / ${player.maxHealth}`;
    attackSpan.textContent = `${player.attack}`;
    defenseSpan.textContent = `${player.defense}`;
    agilitySpan.textContent = `${player.agility}`;
    levelSpan.textContent = `${player.level}`;
    experienceSpan.textContent = `${player.experience} / ${experienceRequirement}`;
    showDialog(statsDialog);
}
function toggleStats(player) {
    if (statsDialog.hidden) {
        showStats(player);
    }
    else {
        hideDialog(statsDialog);
    }
}
function showInventory(player) {
    const tbody = inventoryTable.tBodies[0];
    dom.removeAllChildren(tbody);
    const items = getSortedInventoryItems(player);
    for (const item of items) {
        const fragment = inventoryItemTemplate.content.cloneNode(true);
        const tr = dom.bySelector(fragment, ".item-row");
        const itemNameTd = dom.bySelector(tr, ".item-name");
        const equipButton = dom.bySelector(tr, ".inventory-equip-button");
        const removeButton = dom.bySelector(tr, ".inventory-remove-button");
        const useButton = dom.bySelector(tr, ".inventory-use-button");
        itemNameTd.textContent = item.name;
        useButton.hidden = !(item instanceof rl.Usable);
        equipButton.hidden = !rl.isEquippable(item) || player.isEquipped(item);
        removeButton.hidden = !player.isEquipped(item);
        tbody.appendChild(fragment);
    }
    showDialog(inventoryDialog);
}
function getSortedInventoryItems(player) {
    const items = array.orderBy(player.inventory, i => i.name);
    return items;
}
function toggleInventory(player) {
    if (inventoryDialog.hidden) {
        showInventory(player);
    }
    else {
        hideDialog(inventoryDialog);
    }
}
function tickPlayer(map, player, cmd) {
    switch (cmd.type) {
        case CommandType.Open:
            {
                output.info("Door opened");
                map.fixtures.delete(cmd.fixture);
            }
            break;
        case CommandType.Pass:
            {
                output.info("Pass");
            }
            break;
        case CommandType.Move:
            {
                player.position = cmd.position;
            }
            break;
        case CommandType.Equip:
            {
                output.error("Equip not yet implemented");
            }
            break;
        case CommandType.Use:
            {
                output.error("Use not yet implemented");
            }
            break;
        case CommandType.Attack:
            {
                output.error("Attack not yet implemented");
            }
            break;
        case CommandType.ClimbUp:
            {
                output.error("Climb up not yet implemented");
            }
            break;
        case CommandType.ClimbDown:
            {
                output.error("Climb down yet implemented");
            }
            break;
    }
}
function tickMonster(map, monster) {
    // determine whether monster can see player
    if (!monster.position) {
        return;
    }
    if (!map.player.position) {
        return;
    }
    if (canSee(map, monster.position, map.player.position) && monster.state !== rl.MonsterState.aggro) {
        output.warning(`${monster.name} has spotted you!`);
        monster.state = rl.MonsterState.aggro;
    }
    if (!canSee(map, monster.position, map.player.position) && monster.state === rl.MonsterState.aggro) {
        output.warning(`${monster.name} has lost sight of you!`);
        monster.state = rl.MonsterState.idle;
    }
}
function canSee(map, eye, target) {
    for (const pt of march(eye, target)) {
        // ignore start point
        if (pt.equal(eye)) {
            continue;
        }
        for (const th of map.at(pt)) {
            if (!th.transparent) {
                return false;
            }
        }
    }
    return true;
}
function* march(start, end) {
    const cur = start.clone();
    const dy = Math.abs(end.y - start.y);
    const sy = start.y < end.y ? 1 : -1;
    const dx = -Math.abs(end.x - start.x);
    const sx = start.x < end.x ? 1 : -1;
    let err = dy + dx;
    while (true) {
        yield cur;
        if (cur.equal(end)) {
            break;
        }
        const e2 = 2 * err;
        if (e2 >= dx) {
            err += dx;
            cur.y += sy;
        }
        if (e2 <= dy) {
            err += dy;
            cur.x += sx;
        }
    }
}
async function main() {
    const renderer = new gfx.Renderer(canvas);
    const player = things.player.clone();
    player.inventory.add(things.steelShield.clone());
    player.inventory.add(things.steelSword.clone());
    player.inventory.add(things.steelPlateArmor.clone());
    player.inventory.add(things.weakHealthPotion.clone());
    player.inventory.add(things.healthPotion.clone());
    const map = await generateMap(player, renderer, 64, 64);
    const inp = new input.Input(canvas);
    initStatsDialog(player);
    initInventoryDialog(player);
    initContainerDialog(player);
    if (!player.position) {
        throw new Error("Player is not positioned");
    }
    maps.updateVisibility(map, player.position, rl.lightRadius);
    output.write("Your adventure begins");
    requestAnimationFrame(() => tick(renderer, inp, map));
}
function initStatsDialog(player) {
    const statsButton = dom.byId("statsButton");
    const closeButton = dom.byId("statsCloseButton");
    statsButton.addEventListener("click", () => toggleStats(player));
    closeButton.addEventListener("click", () => hideDialog(statsDialog));
    statsDialog.addEventListener("keypress", (ev) => {
        if (ev.key.toUpperCase() === "Z") {
            hideDialog(statsDialog);
        }
    });
}
function initInventoryDialog(player) {
    const inventoryButton = dom.byId("inventoryButton");
    const closeButton = dom.byId("inventoryCloseButton");
    inventoryButton.addEventListener("click", () => toggleInventory(player));
    closeButton.addEventListener("click", () => hideDialog(inventoryDialog));
    inventoryDialog.addEventListener("keypress", (ev) => {
        if (ev.key.toUpperCase() === "I") {
            hideDialog(inventoryDialog);
        }
    });
    dom.delegate(inventoryDialog, "click", ".inventory-equip-button", (ev) => {
        const btn = ev.target;
        const row = btn.closest(".item-row");
        const idx = dom.getElementIndex(row);
        const item = getSortedInventoryItems(player)[idx];
        if (!item) {
            return;
        }
        if (!rl.isEquippable(item)) {
            return;
        }
        equipItem(player, item);
        showInventory(player);
    });
    dom.delegate(inventoryDialog, "click", ".inventory-remove-button", (ev) => {
        const btn = ev.target;
        const row = btn.closest(".item-row");
        const idx = dom.getElementIndex(row);
        const item = getSortedInventoryItems(player)[idx];
        if (!item) {
            return;
        }
        if (!rl.isEquippable(item)) {
            return;
        }
        if (!player.isEquipped(item)) {
            return;
        }
        removeItem(player, item);
        showInventory(player);
    });
    dom.delegate(inventoryDialog, "click", ".inventory-use-button", (ev) => {
        const btn = ev.target;
        const row = btn.closest(".item-row");
        const idx = dom.getElementIndex(row);
        const item = getSortedInventoryItems(player)[idx];
        if (!item) {
            return;
        }
        if (!(item instanceof rl.Usable)) {
            return;
        }
        useItem(player, item);
        showInventory(player);
    });
    dom.delegate(inventoryDialog, "click", ".inventory-drop-button", (ev) => {
        const btn = ev.target;
        const row = btn.closest(".item-row");
        const idx = dom.getElementIndex(row);
        const item = getSortedInventoryItems(player)[idx];
        if (!item) {
            return;
        }
        dropItem(player, item);
        showInventory(player);
    });
}
function dropItem(player, item) {
    player.delete(item);
    output.info(`${item.name} was dropped`);
}
function useItem(player, item) {
    const amount = Math.min(item.health, player.maxHealth - player.health);
    player.health += amount;
    player.delete(item);
    output.info(`${item.name} restored ${amount} health`);
}
function equipItem(player, item) {
    player.equip(item);
    output.info(`${item.name} was equipped`);
}
function removeItem(player, item) {
    player.remove(item);
    output.info(`${item.name} was removed`);
}
function initContainerDialog(player) {
    const closeButton = dom.byId("containerCloseButton");
    closeButton.addEventListener("click", () => hideDialog(containerDialog));
    const takeAllButton = dom.byId("containerTakeAllButton");
    takeAllButton.addEventListener("click", () => takeAll(player));
}
function takeAll(player) {
    hideDialog(containerDialog);
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBRWpDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFzQixDQUFBO0FBQ3RELE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQW1CLENBQUE7QUFDckUsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQW1CLENBQUE7QUFDN0QsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBbUIsQ0FBQTtBQUNyRSxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFtQixDQUFBO0FBQ3JFLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQXFCLENBQUE7QUFDckUsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBcUIsQ0FBQTtBQUNyRSxNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FB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SSxFQUFFLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBkb20gZnJvbSBcIi4uL3NoYXJlZC9kb20uanNcIlxyXG5pbXBvcnQgKiBhcyBhcnJheSBmcm9tIFwiLi4vc2hhcmVkL2FycmF5LmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbiBmcm9tIFwiLi9nZW4uanNcIlxyXG5pbXBvcnQgKiBhcyBpbnB1dCBmcm9tIFwiLi4vc2hhcmVkL2lucHV0LmpzXCJcclxuaW1wb3J0ICogYXMgcmwgZnJvbSBcIi4vcmwuanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcbmltcG9ydCAqIGFzIG91dHB1dCBmcm9tIFwiLi9vdXRwdXQuanNcIlxyXG5pbXBvcnQgKiBhcyB0aGluZ3MgZnJvbSBcIi4vdGhpbmdzLmpzXCJcclxuaW1wb3J0ICogYXMgbWFwcyBmcm9tIFwiLi9tYXBzLmpzXCJcclxuXHJcbmNvbnN0IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbmNvbnN0IG1vZGFsQmFja2dyb3VuZCA9IGRvbS5ieUlkKFwibW9kYWxCYWNrZ3JvdW5kXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbmNvbnN0IHN0YXRzRGlhbG9nID0gZG9tLmJ5SWQoXCJzdGF0c0RpYWxvZ1wiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5jb25zdCBpbnZlbnRvcnlEaWFsb2cgPSBkb20uYnlJZChcImludmVudG9yeURpYWxvZ1wiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5jb25zdCBjb250YWluZXJEaWFsb2cgPSBkb20uYnlJZChcImNvbnRhaW5lckRpYWxvZ1wiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5jb25zdCBpbnZlbnRvcnlUYWJsZSA9IGRvbS5ieUlkKFwiaW52ZW50b3J5VGFibGVcIikgYXMgSFRNTFRhYmxlRWxlbWVudFxyXG5jb25zdCBjb250YWluZXJUYWJsZSA9IGRvbS5ieUlkKFwiY29udGFpbmVyVGFibGVcIikgYXMgSFRNTFRhYmxlRWxlbWVudFxyXG5jb25zdCBpbnZlbnRvcnlJdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcImludmVudG9yeUl0ZW1UZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbmNvbnN0IGNvbnRhaW5lckl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwiY29udGFpbmVySXRlbVRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuXHJcbmVudW0gQ29tbWFuZFR5cGUge1xyXG4gICAgTW92ZSxcclxuICAgIEVxdWlwLFxyXG4gICAgVXNlLFxyXG4gICAgUGFzcyxcclxuICAgIE9wZW4sXHJcbiAgICBBdHRhY2ssXHJcbiAgICBDbGltYlVwLFxyXG4gICAgQ2xpbWJEb3duXHJcbn1cclxuXHJcbmludGVyZmFjZSBNb3ZlQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5Nb3ZlXHJcbiAgICBwb3NpdGlvbjogZ2VvLlBvaW50XHJcbn1cclxuXHJcbmludGVyZmFjZSBFcXVpcENvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuRXF1aXBcclxuICAgIGl0ZW06IHJsLkVxdWlwcGFibGVcclxufVxyXG5cclxuaW50ZXJmYWNlIFBhc3NDb21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLlBhc3NcclxufVxyXG5cclxuaW50ZXJmYWNlIFVzZUNvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuVXNlXHJcbiAgICBpdGVtOiBybC5Vc2FibGVcclxufVxyXG5cclxuaW50ZXJmYWNlIE9wZW5Db21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLk9wZW5cclxuICAgIGZpeHR1cmU6IHJsLkRvb3JcclxufVxyXG5cclxuaW50ZXJmYWNlIEF0dGFja0NvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuQXR0YWNrXHJcbiAgICBtb25zdGVyOiBybC5Nb25zdGVyXHJcbn1cclxuXHJcbmludGVyZmFjZSBDbGltYlVwQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5DbGltYlVwXHJcbn1cclxuXHJcbmludGVyZmFjZSBDbGltYkRvd25Db21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLkNsaW1iRG93blxyXG59XHJcblxyXG50eXBlIENvbW1hbmQgPSBNb3ZlQ29tbWFuZCB8IEVxdWlwQ29tbWFuZCB8IFBhc3NDb21tYW5kIHwgVXNlQ29tbWFuZCB8IE9wZW5Db21tYW5kIHwgQXR0YWNrQ29tbWFuZCB8IENsaW1iVXBDb21tYW5kIHwgQ2xpbWJEb3duQ29tbWFuZFxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVNYXAocGxheWVyOiBybC5QbGF5ZXIsIHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogUHJvbWlzZTxtYXBzLk1hcD4ge1xyXG4gICAgY29uc3QgbWFwID0gZ2VuLmdlbmVyYXRlTWFwKHdpZHRoLCBoZWlnaHQsIHBsYXllcilcclxuXHJcbiAgICAvLyBiYWtlIGFsbCAyNHgyNCB0aWxlIGltYWdlcyB0byBhIHNpbmdsZSBhcnJheSB0ZXh0dXJlXHJcbiAgICAvLyBzdG9yZSBtYXBwaW5nIGZyb20gaW1hZ2UgdXJsIHRvIGluZGV4XHJcbiAgICBsZXQgaW1hZ2VVcmxzOiBzdHJpbmdbXSA9IFtdXHJcbiAgICBpbWFnZVVybHMucHVzaCguLi5hcnJheS5tYXAobWFwLnRpbGVzLCB0ID0+IHQuaW1hZ2UpKVxyXG4gICAgaW1hZ2VVcmxzLnB1c2goLi4uYXJyYXkubWFwKG1hcC5maXh0dXJlcywgdCA9PiB0LmltYWdlKSlcclxuICAgIGltYWdlVXJscy5wdXNoKC4uLmFycmF5Lm1hcChtYXAubW9uc3RlcnMsIGMgPT4gYy5pbWFnZSkpXHJcbiAgICBpbWFnZVVybHMucHVzaChwbGF5ZXIuaW1hZ2UpXHJcbiAgICBpbWFnZVVybHMgPSBpbWFnZVVybHMuZmlsdGVyKHVybCA9PiB1cmwpXHJcbiAgICBpbWFnZVVybHMgPSBhcnJheS5kaXN0aW5jdChpbWFnZVVybHMpXHJcblxyXG4gICAgY29uc3QgbGF5ZXJNYXAgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPihpbWFnZVVybHMubWFwKCh1cmwsIGkpID0+IFt1cmwsIGldKSlcclxuICAgIGNvbnN0IGltYWdlcyA9IGF3YWl0IFByb21pc2UuYWxsKGltYWdlVXJscy5tYXAodXJsID0+IGRvbS5sb2FkSW1hZ2UodXJsKSkpXHJcbiAgICBjb25zdCB0ZXh0dXJlID0gcmVuZGVyZXIuYmFrZVRleHR1cmVBcnJheShybC50aWxlU2l6ZSwgcmwudGlsZVNpemUsIGltYWdlcylcclxuXHJcbiAgICBmb3IgKGNvbnN0IHRoIG9mIG1hcCkge1xyXG4gICAgICAgIGlmICghdGguaW1hZ2UpIHtcclxuICAgICAgICAgICAgdGgudGV4dHVyZUxheWVyID0gLTFcclxuICAgICAgICAgICAgdGgudGV4dHVyZSA9IG51bGxcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGxheWVyID0gbGF5ZXJNYXAuZ2V0KHRoLmltYWdlKVxyXG4gICAgICAgIGlmIChsYXllciA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdGV4dHVyZSBpbmRleCBub3QgZm91bmQgZm9yICR7dGguaW1hZ2V9YClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoLnRleHR1cmUgPSB0ZXh0dXJlXHJcbiAgICAgICAgdGgudGV4dHVyZUxheWVyID0gbGF5ZXJcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRpY2socmVuZGVyZXI6IGdmeC5SZW5kZXJlciwgaW5wOiBpbnB1dC5JbnB1dCwgbWFwOiBtYXBzLk1hcCkge1xyXG4gICAgY29uc3QgY21kID0gaGFuZGxlSW5wdXQobWFwLCBpbnApXHJcbiAgICBpZiAoY21kKSB7XHJcbiAgICAgICAgcHJvY2Vzc1R1cm4obWFwLCBjbWQpXHJcbiAgICB9XHJcblxyXG4gICAgZHJhd0ZyYW1lKHJlbmRlcmVyLCBtYXApXHJcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGljayhyZW5kZXJlciwgaW5wLCBtYXApKVxyXG59XHJcblxyXG5mdW5jdGlvbiBwcm9jZXNzVHVybihtYXA6IG1hcHMuTWFwLCBjbWQ6IENvbW1hbmQpIHtcclxuICAgIC8vIGZpbmQgY3JlYXR1cmUgd2l0aCBtYXggYWdpbGl0eVxyXG4gICAgLy8gZXZlcnlvbmUgbW92ZXMgcmVsYXRpdmUgdG8gdGhpcyByYXRlXHJcbiAgICAvLyBldmVyeW9uZSBnZXRzIG9uZSBhY3Rpb24gcG9pbnQgcGVyIHJvdW5kXHJcbiAgICAvLyBmYXN0ZXN0IGNyZWF0dXJlKHMpIHJlcXVpcmUgMSBhY3Rpb24gcG9pbnQgdG8gbW92ZVxyXG4gICAgLy8gdGhlIHJlc3QgcmVxdWlyZSBhbiBhbW91bnQgb2YgYWN0aW9uIHBvaW50cyBhY2NvcmRpbmcgdG8gdGhlaXIgcmF0aW8gd2l0aCB0aGUgZmFzdGVzdFxyXG4gICAgLy8gdGhpcyBhbGwgc2hvdWxkIGJlIHJlcGVhdGVkIHVudGlsIHBsYXllcidzIHR1cm4gaXMgcHJvY2Vzc2VkIGF0IHdoaWNoIHBvaW50IHdlIHNob3VsZCB3YWl0IGZvciBuZXh0IHBsYXllciBtb3ZlXHJcbiAgICBjb25zdCBjcmVhdHVyZXMgPSBhcnJheS5vcmRlckJ5RGVzYyhhcnJheS5hcHBlbmQ8cmwuQ3JlYXR1cmU+KG1hcC5tb25zdGVycywgbWFwLnBsYXllciksIG0gPT4gbS5hZ2lsaXR5KVxyXG4gICAgY29uc3QgbWF4QWdpbGl0eSA9IGNyZWF0dXJlcy5yZWR1Y2UoKHgsIHkpID0+IHguYWdpbGl0eSA8IHkuYWdpbGl0eSA/IHggOiB5KS5hZ2lsaXR5XHJcbiAgICBjb25zdCBhY3Rpb25QZXJSb3VuZCA9IDEgLyBtYXhBZ2lsaXR5XHJcbiAgICBsZXQgcGxheWVyTW92ZWQgPSBmYWxzZVxyXG5cclxuICAgIHdoaWxlICghcGxheWVyTW92ZWQpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IGNyZWF0dXJlIG9mIGNyZWF0dXJlcykge1xyXG4gICAgICAgICAgICBpZiAoY3JlYXR1cmUuYWN0aW9uIDwgMSkge1xyXG4gICAgICAgICAgICAgICAgY3JlYXR1cmUuYWN0aW9uICs9IGFjdGlvblBlclJvdW5kXHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjcmVhdHVyZS5hY3Rpb24gLT0gMVxyXG5cclxuICAgICAgICAgICAgaWYgKGNyZWF0dXJlIGluc3RhbmNlb2YgcmwuUGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICB0aWNrUGxheWVyKG1hcCwgY3JlYXR1cmUsIGNtZClcclxuICAgICAgICAgICAgICAgIHBsYXllck1vdmVkID0gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoY3JlYXR1cmUgaW5zdGFuY2VvZiBybC5Nb25zdGVyKSB7XHJcbiAgICAgICAgICAgICAgICB0aWNrTW9uc3RlcihtYXAsIGNyZWF0dXJlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobWFwLnBsYXllci5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICBtYXBzLnVwZGF0ZVZpc2liaWxpdHkobWFwLCBtYXAucGxheWVyLnBvc2l0aW9uLCBybC5saWdodFJhZGl1cylcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFNjcm9sbE9mZnNldChwbGF5ZXJQb3NpdGlvbjogZ2VvLlBvaW50KTogZ2VvLlBvaW50IHtcclxuICAgIC8vIGNvbnZlcnQgbWFwIHBvaW50IHRvIGNhbnZhcyBwb2ludCwgbm90aW5nIHRoYXQgY2FudmFzIGlzIGNlbnRlcmVkIG9uIHBsYXllclxyXG4gICAgY29uc3QgY2FudmFzQ2VudGVyID0gbmV3IGdlby5Qb2ludChjYW52YXMud2lkdGggLyAyLCBjYW52YXMuaGVpZ2h0IC8gMilcclxuICAgIGNvbnN0IG9mZnNldCA9IGNhbnZhc0NlbnRlci5zdWJQb2ludChwbGF5ZXJQb3NpdGlvbi5hZGRTY2FsYXIoLjUpLm11bFNjYWxhcihybC50aWxlU2l6ZSkpXHJcbiAgICByZXR1cm4gb2Zmc2V0LmZsb29yKClcclxufVxyXG5cclxuZnVuY3Rpb24gY2FudmFzVG9NYXBQb2ludChwbGF5ZXJQb3NpdGlvbjogZ2VvLlBvaW50LCBjeHk6IGdlby5Qb2ludCkge1xyXG4gICAgY29uc3Qgc2Nyb2xsT2Zmc2V0ID0gZ2V0U2Nyb2xsT2Zmc2V0KHBsYXllclBvc2l0aW9uKVxyXG4gICAgY29uc3QgbXh5ID0gY3h5LnN1YlBvaW50KHNjcm9sbE9mZnNldCkuZGl2U2NhbGFyKHJsLnRpbGVTaXplKVxyXG4gICAgcmV0dXJuIG14eVxyXG59XHJcblxyXG5mdW5jdGlvbiBtYXBUb0NhbnZhc1BvaW50KHBsYXllclBvc2l0aW9uOiBnZW8uUG9pbnQsIG14eTogZ2VvLlBvaW50KSB7XHJcbiAgICBjb25zdCBzY3JvbGxPZmZzZXQgPSBnZXRTY3JvbGxPZmZzZXQocGxheWVyUG9zaXRpb24pXHJcbiAgICBjb25zdCBjeHkgPSBteHkubXVsU2NhbGFyKHJsLnRpbGVTaXplKS5hZGRQb2ludChzY3JvbGxPZmZzZXQpXHJcbiAgICByZXR1cm4gY3h5XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZUlucHV0KG1hcDogbWFwcy5NYXAsIGlucDogaW5wdXQuSW5wdXQpOiBDb21tYW5kIHwgbnVsbCB7XHJcbiAgICBjb25zdCBwbGF5ZXIgPSBtYXAucGxheWVyXHJcbiAgICBpZiAoIXBsYXllci5wb3NpdGlvbikge1xyXG4gICAgICAgIHJldHVybiBudWxsXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcG9zaXRpb24gPSBwbGF5ZXIucG9zaXRpb24uY2xvbmUoKVxyXG5cclxuICAgIGlmIChpbnAubW91c2VMZWZ0UHJlc3NlZCkge1xyXG4gICAgICAgIC8vIGRldGVybWluZSB0aGUgbWFwIGNvb3JkaW5hdGVzIHRoZSB1c2VyIGNsaWNrZWQgb25cclxuICAgICAgICBjb25zdCBteHkgPSBjYW52YXNUb01hcFBvaW50KHBsYXllci5wb3NpdGlvbiwgbmV3IGdlby5Qb2ludChpbnAubW91c2VYLCBpbnAubW91c2VZKSkuZmxvb3IoKVxyXG5cclxuICAgICAgICBjb25zdCBjbGlja0ZpeHR1cmUgPSBtYXAuZml4dHVyZUF0KG14eSlcclxuICAgICAgICBpZiAoY2xpY2tGaXh0dXJlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBZb3Ugc2VlICR7Y2xpY2tGaXh0dXJlLm5hbWV9YClcclxuICAgICAgICAgICAgaW5wLmZsdXNoKClcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNsaWNrQ3JlYXR1cmUgPSBtYXAubW9uc3RlckF0KG14eSlcclxuICAgICAgICBpZiAoY2xpY2tDcmVhdHVyZSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke2NsaWNrQ3JlYXR1cmUubmFtZX1gKVxyXG4gICAgICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZHh5ID0gbXh5LnN1YlBvaW50KHBsYXllci5wb3NpdGlvbilcclxuICAgICAgICBjb25zdCBzZ24gPSBkeHkuc2lnbigpXHJcbiAgICAgICAgY29uc3QgYWJzID0gZHh5LmFicygpXHJcblxyXG4gICAgICAgIGlmIChhYnMueCA+IDAgJiYgYWJzLnggPj0gYWJzLnkpIHtcclxuICAgICAgICAgICAgcG9zaXRpb24ueCArPSBzZ24ueFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGFicy55ID4gMCAmJiBhYnMueSA+IGFicy54KSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnkgKz0gc2duLnlcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJ3XCIpKSB7XHJcbiAgICAgICAgcG9zaXRpb24ueSAtPSAxXHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChpbnAucHJlc3NlZChcInNcIikpIHtcclxuICAgICAgICBwb3NpdGlvbi55ICs9IDFcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGlucC5wcmVzc2VkKFwiYVwiKSkge1xyXG4gICAgICAgIHBvc2l0aW9uLnggLT0gMVxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJkXCIpKSB7XHJcbiAgICAgICAgcG9zaXRpb24ueCArPSAxXHJcbiAgICB9IGVsc2UgaWYgKGlucC5wcmVzc2VkKFwielwiKSkge1xyXG4gICAgICAgIHNob3dTdGF0cyhwbGF5ZXIpXHJcbiAgICB9IGVsc2UgaWYgKGlucC5wcmVzc2VkKFwiaVwiKSkge1xyXG4gICAgICAgIHNob3dJbnZlbnRvcnkocGxheWVyKVxyXG4gICAgfVxyXG5cclxuICAgIGlucC5mbHVzaCgpXHJcblxyXG4gICAgaWYgKHBvc2l0aW9uLmVxdWFsKHBsYXllci5wb3NpdGlvbikpIHtcclxuICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHRpbGUgPSBtYXAudGlsZUF0KHBvc2l0aW9uKVxyXG4gICAgaWYgKHRpbGUgJiYgIXRpbGUucGFzc2FibGUpIHtcclxuICAgICAgICBvdXRwdXQuaW5mbyhgQ2FuJ3QgbW92ZSB0aGF0IHdheSwgYmxvY2tlZCBieSAke3RpbGUubmFtZX1gKVxyXG4gICAgICAgIHJldHVybiBudWxsXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZml4dHVyZSA9IG1hcC5maXh0dXJlQXQocG9zaXRpb24pXHJcbiAgICBpZiAoZml4dHVyZSBpbnN0YW5jZW9mIHJsLkRvb3IpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0eXBlOiBDb21tYW5kVHlwZS5PcGVuLFxyXG4gICAgICAgICAgICBmaXh0dXJlOiBmaXh0dXJlXHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIGlmIChmaXh0dXJlIGluc3RhbmNlb2YgcmwuU3RhaXJzVXApIHtcclxuICAgICAgICByZXR1cm4geyB0eXBlOiBDb21tYW5kVHlwZS5DbGltYlVwIH1cclxuICAgIH0gZWxzZSBpZiAoZml4dHVyZSBpbnN0YW5jZW9mIHJsLlN0YWlyc0Rvd24pIHtcclxuICAgICAgICByZXR1cm4geyB0eXBlOiBDb21tYW5kVHlwZS5DbGltYkRvd24gfVxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoZml4dHVyZSAmJiAhZml4dHVyZS5wYXNzYWJsZSkge1xyXG4gICAgICAgIG91dHB1dC5pbmZvKGBDYW4ndCBtb3ZlIHRoYXQgd2F5LCBibG9ja2VkIGJ5ICR7Zml4dHVyZS5uYW1lfWApXHJcbiAgICAgICAgcmV0dXJuIG51bGxcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBjb250YWluZXIgPSBtYXAuY29udGFpbmVyQXQocG9zaXRpb24pXHJcbiAgICBpZiAoY29udGFpbmVyKSB7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG1vbnN0ZXIgPSBtYXAubW9uc3RlckF0KHBvc2l0aW9uKVxyXG4gICAgaWYgKG1vbnN0ZXIgJiYgIW1vbnN0ZXIucGFzc2FibGUpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0eXBlOiBDb21tYW5kVHlwZS5BdHRhY2ssXHJcbiAgICAgICAgICAgIG1vbnN0ZXI6IG1vbnN0ZXJcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB0eXBlOiBDb21tYW5kVHlwZS5Nb3ZlLFxyXG4gICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvblxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3RnJhbWUocmVuZGVyZXI6IGdmeC5SZW5kZXJlciwgbWFwOiBtYXBzLk1hcCkge1xyXG4gICAgY29uc3QgcGxheWVyID0gbWFwLnBsYXllclxyXG4gICAgaWYgKCFwbGF5ZXIucG9zaXRpb24pIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBoYW5kbGVSZXNpemUocmVuZGVyZXIuY2FudmFzKVxyXG5cclxuICAgIC8vIGNlbnRlciB0aGUgZ3JpZCBhcm91bmQgdGhlIHBsYXllcmRcclxuICAgIGNvbnN0IG9mZnNldCA9IGdldFNjcm9sbE9mZnNldChwbGF5ZXIucG9zaXRpb24pXHJcblxyXG4gICAgLy8gbm90ZSAtIGRyYXdpbmcgb3JkZXIgbWF0dGVycyAtIGRyYXcgZnJvbSBib3R0b20gdG8gdG9wXHJcblxyXG4gICAgLy8gZHJhdyB2YXJpb3VzIGxheWVycyBvZiBzcHJpdGVzXHJcbiAgICBmb3IgKGNvbnN0IHRpbGUgb2YgbWFwLnRpbGVzKSB7XHJcbiAgICAgICAgZHJhd1RoaW5nKHJlbmRlcmVyLCBvZmZzZXQsIHRpbGUpXHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCBmaXh0dXJlIG9mIG1hcC5maXh0dXJlcykge1xyXG4gICAgICAgIGRyYXdUaGluZyhyZW5kZXJlciwgb2Zmc2V0LCBmaXh0dXJlKVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgY3JlYXR1cmUgb2YgbWFwLm1vbnN0ZXJzKSB7XHJcbiAgICAgICAgZHJhd1RoaW5nKHJlbmRlcmVyLCBvZmZzZXQsIGNyZWF0dXJlKVxyXG4gICAgfVxyXG5cclxuICAgIGRyYXdUaGluZyhyZW5kZXJlciwgb2Zmc2V0LCBwbGF5ZXIpXHJcbiAgICBkcmF3SGVhbHRoQmFyKHJlbmRlcmVyLCBwbGF5ZXIsIG9mZnNldClcclxuXHJcbiAgICByZW5kZXJlci5mbHVzaCgpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdUaGluZyhyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBvZmZzZXQ6IGdlby5Qb2ludCwgdGg6IHJsLlRoaW5nKSB7XHJcbiAgICAvLyBkb24ndCBkcmF3IHRoaW5ncyB0aGF0IGFyZW4ndCBwb3NpdGlvbmVkXHJcbiAgICBpZiAoIXRoLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoLnZpc2libGUgPT09IHJsLlZpc2liaWxpdHkuTm9uZSkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNvbG9yID0gdGguY29sb3IuY2xvbmUoKVxyXG4gICAgaWYgKHRoLnZpc2libGUgPT09IHJsLlZpc2liaWxpdHkuRm9nKSB7XHJcbiAgICAgICAgY29sb3IuYSA9IC41XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc3ByaXRlUG9zaXRpb24gPSB0aC5wb3NpdGlvbi5tdWxTY2FsYXIocmwudGlsZVNpemUpLmFkZFBvaW50KG9mZnNldClcclxuICAgIGNvbnN0IHNwcml0ZSA9IG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24sXHJcbiAgICAgICAgY29sb3I6IGNvbG9yLFxyXG4gICAgICAgIHdpZHRoOiBybC50aWxlU2l6ZSxcclxuICAgICAgICBoZWlnaHQ6IHJsLnRpbGVTaXplLFxyXG4gICAgICAgIHRleHR1cmU6IHRoLnRleHR1cmUsXHJcbiAgICAgICAgbGF5ZXI6IHRoLnRleHR1cmVMYXllcixcclxuICAgICAgICBmbGFnczogZ2Z4LlNwcml0ZUZsYWdzLkFycmF5VGV4dHVyZVxyXG4gICAgfSlcclxuXHJcbiAgICByZW5kZXJlci5kcmF3U3ByaXRlKHNwcml0ZSlcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0hlYWx0aEJhcihyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBjcmVhdHVyZTogcmwuQ3JlYXR1cmUsIG9mZnNldDogZ2VvLlBvaW50KSB7XHJcbiAgICBpZiAoIWNyZWF0dXJlLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgd2lkdGggPSBjcmVhdHVyZS5tYXhIZWFsdGggKiA0ICsgMlxyXG4gICAgY29uc3Qgc3ByaXRlUG9zaXRpb24gPSBjcmVhdHVyZS5wb3NpdGlvbi5tdWxTY2FsYXIocmwudGlsZVNpemUpLmFkZFBvaW50KG9mZnNldCkuc3ViUG9pbnQobmV3IGdlby5Qb2ludCgwLCBybC50aWxlU2l6ZSAvIDIpKVxyXG4gICAgcmVuZGVyZXIuZHJhd1Nwcml0ZShuZXcgZ2Z4LlNwcml0ZSh7XHJcbiAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLFxyXG4gICAgICAgIGNvbG9yOiBnZnguQ29sb3Iud2hpdGUsXHJcbiAgICAgICAgd2lkdGg6IHdpZHRoLFxyXG4gICAgICAgIGhlaWdodDogOFxyXG4gICAgfSkpXHJcblxyXG4gICAgcmVuZGVyZXIuZHJhd1Nwcml0ZShuZXcgZ2Z4LlNwcml0ZSh7XHJcbiAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLmFkZFBvaW50KG5ldyBnZW8uUG9pbnQoMSwgMSkpLFxyXG4gICAgICAgIGNvbG9yOiBnZnguQ29sb3IucmVkLFxyXG4gICAgICAgIHdpZHRoOiB3aWR0aCAtIDIsXHJcbiAgICAgICAgaGVpZ2h0OiA2XHJcbiAgICB9KSlcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlUmVzaXplKGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgIGlmIChjYW52YXMud2lkdGggPT09IGNhbnZhcy5jbGllbnRXaWR0aCAmJiBjYW52YXMuaGVpZ2h0ID09PSBjYW52YXMuY2xpZW50SGVpZ2h0KSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY2FudmFzLndpZHRoID0gY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzLmNsaWVudEhlaWdodFxyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93RGlhbG9nKGRpYWxvZzogSFRNTERpdkVsZW1lbnQpIHtcclxuICAgIG1vZGFsQmFja2dyb3VuZC5oaWRkZW4gPSBmYWxzZVxyXG4gICAgZGlhbG9nLmhpZGRlbiA9IGZhbHNlXHJcbiAgICBkaWFsb2cuZm9jdXMoKVxyXG59XHJcblxyXG5mdW5jdGlvbiBoaWRlRGlhbG9nKGRpYWxvZzogSFRNTERpdkVsZW1lbnQpIHtcclxuICAgIG1vZGFsQmFja2dyb3VuZC5oaWRkZW4gPSB0cnVlXHJcbiAgICBkaWFsb2cuaGlkZGVuID0gdHJ1ZVxyXG4gICAgY2FudmFzLmZvY3VzKClcclxufVxyXG5cclxuZnVuY3Rpb24gc2hvd1N0YXRzKHBsYXllcjogcmwuUGxheWVyKSB7XHJcbiAgICBjb25zdCBoZWFsdGhTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0hlYWx0aFwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgIGNvbnN0IGF0dGFja1NwYW4gPSBkb20uYnlJZChcInN0YXRzQXR0YWNrXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgY29uc3QgZGVmZW5zZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRGVmZW5zZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgIGNvbnN0IGFnaWxpdHlTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0FnaWxpdHlcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICBjb25zdCBsZXZlbFNwYW4gPSBkb20uYnlJZChcInN0YXRzTGV2ZWxcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICBjb25zdCBleHBlcmllbmNlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNFeHBlcmllbmNlXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgY29uc3QgZXhwZXJpZW5jZVJlcXVpcmVtZW50ID0gcmwuZ2V0RXhwZXJpZW5jZVJlcXVpcmVtZW50KHBsYXllci5sZXZlbCArIDEpXHJcblxyXG4gICAgaGVhbHRoU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5oZWFsdGh9IC8gJHtwbGF5ZXIubWF4SGVhbHRofWBcclxuICAgIGF0dGFja1NwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuYXR0YWNrfWBcclxuICAgIGRlZmVuc2VTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmRlZmVuc2V9YFxyXG4gICAgYWdpbGl0eVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuYWdpbGl0eX1gXHJcbiAgICBsZXZlbFNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIubGV2ZWx9YFxyXG4gICAgZXhwZXJpZW5jZVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuZXhwZXJpZW5jZX0gLyAke2V4cGVyaWVuY2VSZXF1aXJlbWVudH1gXHJcblxyXG4gICAgc2hvd0RpYWxvZyhzdGF0c0RpYWxvZylcclxufVxyXG5cclxuZnVuY3Rpb24gdG9nZ2xlU3RhdHMocGxheWVyOiBybC5QbGF5ZXIpIHtcclxuICAgIGlmIChzdGF0c0RpYWxvZy5oaWRkZW4pIHtcclxuICAgICAgICBzaG93U3RhdHMocGxheWVyKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBoaWRlRGlhbG9nKHN0YXRzRGlhbG9nKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93SW52ZW50b3J5KHBsYXllcjogcmwuUGxheWVyKSB7XHJcbiAgICBjb25zdCB0Ym9keSA9IGludmVudG9yeVRhYmxlLnRCb2RpZXNbMF1cclxuICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0Ym9keSlcclxuXHJcbiAgICBjb25zdCBpdGVtcyA9IGdldFNvcnRlZEludmVudG9yeUl0ZW1zKHBsYXllcilcclxuICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xyXG4gICAgICAgIGNvbnN0IGZyYWdtZW50ID0gaW52ZW50b3J5SXRlbVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICBjb25zdCB0ciA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5pdGVtLXJvd1wiKVxyXG4gICAgICAgIGNvbnN0IGl0ZW1OYW1lVGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1uYW1lXCIpXHJcbiAgICAgICAgY29uc3QgZXF1aXBCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LWVxdWlwLWJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IHJlbW92ZUJ1dHRvbiA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pbnZlbnRvcnktcmVtb3ZlLWJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IHVzZUJ1dHRvbiA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pbnZlbnRvcnktdXNlLWJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5cclxuICAgICAgICBpdGVtTmFtZVRkLnRleHRDb250ZW50ID0gaXRlbS5uYW1lXHJcbiAgICAgICAgdXNlQnV0dG9uLmhpZGRlbiA9ICEoaXRlbSBpbnN0YW5jZW9mIHJsLlVzYWJsZSlcclxuICAgICAgICBlcXVpcEJ1dHRvbi5oaWRkZW4gPSAhcmwuaXNFcXVpcHBhYmxlKGl0ZW0pIHx8IHBsYXllci5pc0VxdWlwcGVkKGl0ZW0pXHJcbiAgICAgICAgcmVtb3ZlQnV0dG9uLmhpZGRlbiA9ICFwbGF5ZXIuaXNFcXVpcHBlZChpdGVtKVxyXG5cclxuICAgICAgICB0Ym9keS5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgIH1cclxuXHJcbiAgICBzaG93RGlhbG9nKGludmVudG9yeURpYWxvZylcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U29ydGVkSW52ZW50b3J5SXRlbXMocGxheWVyOiBybC5QbGF5ZXIpOiBybC5JdGVtW10ge1xyXG4gICAgY29uc3QgaXRlbXMgPSBhcnJheS5vcmRlckJ5KHBsYXllci5pbnZlbnRvcnksIGkgPT4gaS5uYW1lKVxyXG4gICAgcmV0dXJuIGl0ZW1zXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRvZ2dsZUludmVudG9yeShwbGF5ZXI6IHJsLlBsYXllcikge1xyXG4gICAgaWYgKGludmVudG9yeURpYWxvZy5oaWRkZW4pIHtcclxuICAgICAgICBzaG93SW52ZW50b3J5KHBsYXllcilcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaGlkZURpYWxvZyhpbnZlbnRvcnlEaWFsb2cpXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRpY2tQbGF5ZXIobWFwOiBtYXBzLk1hcCwgcGxheWVyOiBybC5QbGF5ZXIsIGNtZDogQ29tbWFuZCkge1xyXG4gICAgc3dpdGNoIChjbWQudHlwZSkge1xyXG4gICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuT3Blbjoge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhcIkRvb3Igb3BlbmVkXCIpXHJcbiAgICAgICAgICAgIG1hcC5maXh0dXJlcy5kZWxldGUoY21kLmZpeHR1cmUpXHJcbiAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICBjYXNlIENvbW1hbmRUeXBlLlBhc3M6IHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oXCJQYXNzXCIpXHJcbiAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICBjYXNlIENvbW1hbmRUeXBlLk1vdmU6IHtcclxuICAgICAgICAgICAgcGxheWVyLnBvc2l0aW9uID0gY21kLnBvc2l0aW9uXHJcbiAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICBjYXNlIENvbW1hbmRUeXBlLkVxdWlwOiB7XHJcbiAgICAgICAgICAgIG91dHB1dC5lcnJvcihcIkVxdWlwIG5vdCB5ZXQgaW1wbGVtZW50ZWRcIilcclxuICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuVXNlOiB7XHJcbiAgICAgICAgICAgIG91dHB1dC5lcnJvcihcIlVzZSBub3QgeWV0IGltcGxlbWVudGVkXCIpXHJcbiAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICBjYXNlIENvbW1hbmRUeXBlLkF0dGFjazoge1xyXG4gICAgICAgICAgICBvdXRwdXQuZXJyb3IoXCJBdHRhY2sgbm90IHlldCBpbXBsZW1lbnRlZFwiKVxyXG4gICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5DbGltYlVwOiB7XHJcbiAgICAgICAgICAgIG91dHB1dC5lcnJvcihcIkNsaW1iIHVwIG5vdCB5ZXQgaW1wbGVtZW50ZWRcIilcclxuICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuQ2xpbWJEb3duOiB7XHJcbiAgICAgICAgICAgIG91dHB1dC5lcnJvcihcIkNsaW1iIGRvd24geWV0IGltcGxlbWVudGVkXCIpXHJcbiAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0aWNrTW9uc3RlcihtYXA6IG1hcHMuTWFwLCBtb25zdGVyOiBybC5Nb25zdGVyKSB7XHJcbiAgICAvLyBkZXRlcm1pbmUgd2hldGhlciBtb25zdGVyIGNhbiBzZWUgcGxheWVyXHJcbiAgICBpZiAoIW1vbnN0ZXIucG9zaXRpb24pIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBpZiAoIW1hcC5wbGF5ZXIucG9zaXRpb24pIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBpZiAoY2FuU2VlKG1hcCwgbW9uc3Rlci5wb3NpdGlvbiwgbWFwLnBsYXllci5wb3NpdGlvbikgJiYgbW9uc3Rlci5zdGF0ZSAhPT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvKSB7XHJcbiAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7bW9uc3Rlci5uYW1lfSBoYXMgc3BvdHRlZCB5b3UhYClcclxuICAgICAgICBtb25zdGVyLnN0YXRlID0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFjYW5TZWUobWFwLCBtb25zdGVyLnBvc2l0aW9uLCBtYXAucGxheWVyLnBvc2l0aW9uKSAmJiBtb25zdGVyLnN0YXRlID09PSBybC5Nb25zdGVyU3RhdGUuYWdncm8pIHtcclxuICAgICAgICBvdXRwdXQud2FybmluZyhgJHttb25zdGVyLm5hbWV9IGhhcyBsb3N0IHNpZ2h0IG9mIHlvdSFgKVxyXG4gICAgICAgIG1vbnN0ZXIuc3RhdGUgPSBybC5Nb25zdGVyU3RhdGUuaWRsZVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYW5TZWUobWFwOiBtYXBzLk1hcCwgZXllOiBnZW8uUG9pbnQsIHRhcmdldDogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICBmb3IgKGNvbnN0IHB0IG9mIG1hcmNoKGV5ZSwgdGFyZ2V0KSkge1xyXG4gICAgICAgIC8vIGlnbm9yZSBzdGFydCBwb2ludFxyXG4gICAgICAgIGlmIChwdC5lcXVhbChleWUpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHRoIG9mIG1hcC5hdChwdCkpIHtcclxuICAgICAgICAgICAgaWYgKCF0aC50cmFuc3BhcmVudCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWVcclxufVxyXG5cclxuZnVuY3Rpb24qIG1hcmNoKHN0YXJ0OiBnZW8uUG9pbnQsIGVuZDogZ2VvLlBvaW50KTogR2VuZXJhdG9yPGdlby5Qb2ludD4ge1xyXG4gICAgY29uc3QgY3VyID0gc3RhcnQuY2xvbmUoKVxyXG4gICAgY29uc3QgZHkgPSBNYXRoLmFicyhlbmQueSAtIHN0YXJ0LnkpO1xyXG4gICAgY29uc3Qgc3kgPSBzdGFydC55IDwgZW5kLnkgPyAxIDogLTE7XHJcbiAgICBjb25zdCBkeCA9IC1NYXRoLmFicyhlbmQueCAtIHN0YXJ0LngpO1xyXG4gICAgY29uc3Qgc3ggPSBzdGFydC54IDwgZW5kLnggPyAxIDogLTE7XHJcbiAgICBsZXQgZXJyID0gZHkgKyBkeDtcclxuXHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgIHlpZWxkIGN1clxyXG5cclxuICAgICAgICBpZiAoY3VyLmVxdWFsKGVuZCkpIHtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlMiA9IDIgKiBlcnI7XHJcbiAgICAgICAgaWYgKGUyID49IGR4KSB7XHJcbiAgICAgICAgICAgIGVyciArPSBkeDtcclxuICAgICAgICAgICAgY3VyLnkgKz0gc3k7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZTIgPD0gZHkpIHtcclxuICAgICAgICAgICAgZXJyICs9IGR5O1xyXG4gICAgICAgICAgICBjdXIueCArPSBzeDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XHJcbiAgICBjb25zdCByZW5kZXJlciA9IG5ldyBnZnguUmVuZGVyZXIoY2FudmFzKVxyXG5cclxuICAgIGNvbnN0IHBsYXllciA9IHRoaW5ncy5wbGF5ZXIuY2xvbmUoKVxyXG4gICAgcGxheWVyLmludmVudG9yeS5hZGQodGhpbmdzLnN0ZWVsU2hpZWxkLmNsb25lKCkpXHJcbiAgICBwbGF5ZXIuaW52ZW50b3J5LmFkZCh0aGluZ3Muc3RlZWxTd29yZC5jbG9uZSgpKVxyXG4gICAgcGxheWVyLmludmVudG9yeS5hZGQodGhpbmdzLnN0ZWVsUGxhdGVBcm1vci5jbG9uZSgpKVxyXG4gICAgcGxheWVyLmludmVudG9yeS5hZGQodGhpbmdzLndlYWtIZWFsdGhQb3Rpb24uY2xvbmUoKSlcclxuICAgIHBsYXllci5pbnZlbnRvcnkuYWRkKHRoaW5ncy5oZWFsdGhQb3Rpb24uY2xvbmUoKSlcclxuXHJcbiAgICBjb25zdCBtYXAgPSBhd2FpdCBnZW5lcmF0ZU1hcChwbGF5ZXIsIHJlbmRlcmVyLCA2NCwgNjQpXHJcbiAgICBjb25zdCBpbnAgPSBuZXcgaW5wdXQuSW5wdXQoY2FudmFzKVxyXG5cclxuICAgIGluaXRTdGF0c0RpYWxvZyhwbGF5ZXIpXHJcbiAgICBpbml0SW52ZW50b3J5RGlhbG9nKHBsYXllcilcclxuICAgIGluaXRDb250YWluZXJEaWFsb2cocGxheWVyKVxyXG5cclxuICAgIGlmICghcGxheWVyLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUGxheWVyIGlzIG5vdCBwb3NpdGlvbmVkXCIpXHJcbiAgICB9XHJcbiAgICBcclxuICAgIG1hcHMudXBkYXRlVmlzaWJpbGl0eShtYXAsIHBsYXllci5wb3NpdGlvbiwgcmwubGlnaHRSYWRpdXMpXHJcblxyXG4gICAgb3V0cHV0LndyaXRlKFwiWW91ciBhZHZlbnR1cmUgYmVnaW5zXCIpXHJcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGljayhyZW5kZXJlciwgaW5wLCBtYXApKVxyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0U3RhdHNEaWFsb2cocGxheWVyOiBybC5QbGF5ZXIpIHtcclxuICAgIGNvbnN0IHN0YXRzQnV0dG9uID0gZG9tLmJ5SWQoXCJzdGF0c0J1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgY29uc3QgY2xvc2VCdXR0b24gPSBkb20uYnlJZChcInN0YXRzQ2xvc2VCdXR0b25cIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHN0YXRzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0b2dnbGVTdGF0cyhwbGF5ZXIpKVxyXG4gICAgY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IGhpZGVEaWFsb2coc3RhdHNEaWFsb2cpKVxyXG5cclxuICAgIHN0YXRzRGlhbG9nLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCAoZXYpID0+IHtcclxuICAgICAgICBpZiAoZXYua2V5LnRvVXBwZXJDYXNlKCkgPT09IFwiWlwiKSB7XHJcbiAgICAgICAgICAgIGhpZGVEaWFsb2coc3RhdHNEaWFsb2cpXHJcbiAgICAgICAgfVxyXG4gICAgfSlcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdEludmVudG9yeURpYWxvZyhwbGF5ZXI6IHJsLlBsYXllcikge1xyXG4gICAgY29uc3QgaW52ZW50b3J5QnV0dG9uID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIGNvbnN0IGNsb3NlQnV0dG9uID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlDbG9zZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgaW52ZW50b3J5QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0b2dnbGVJbnZlbnRvcnkocGxheWVyKSlcclxuICAgIGNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiBoaWRlRGlhbG9nKGludmVudG9yeURpYWxvZykpXHJcblxyXG4gICAgaW52ZW50b3J5RGlhbG9nLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCAoZXYpID0+IHtcclxuICAgICAgICBpZiAoZXYua2V5LnRvVXBwZXJDYXNlKCkgPT09IFwiSVwiKSB7XHJcbiAgICAgICAgICAgIGhpZGVEaWFsb2coaW52ZW50b3J5RGlhbG9nKVxyXG4gICAgICAgIH1cclxuICAgIH0pXHJcblxyXG4gICAgZG9tLmRlbGVnYXRlKGludmVudG9yeURpYWxvZywgXCJjbGlja1wiLCBcIi5pbnZlbnRvcnktZXF1aXAtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgIGNvbnN0IGJ0biA9IGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IHJvdyA9IGJ0bi5jbG9zZXN0KFwiLml0ZW0tcm93XCIpIGFzIEhUTUxUYWJsZVJvd0VsZW1lbnRcclxuICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KHJvdylcclxuICAgICAgICBjb25zdCBpdGVtID0gZ2V0U29ydGVkSW52ZW50b3J5SXRlbXMocGxheWVyKVtpZHhdXHJcbiAgICAgICAgaWYgKCFpdGVtKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFybC5pc0VxdWlwcGFibGUoaXRlbSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBlcXVpcEl0ZW0ocGxheWVyLCBpdGVtKVxyXG4gICAgICAgIHNob3dJbnZlbnRvcnkocGxheWVyKVxyXG4gICAgfSlcclxuXHJcbiAgICBkb20uZGVsZWdhdGUoaW52ZW50b3J5RGlhbG9nLCBcImNsaWNrXCIsIFwiLmludmVudG9yeS1yZW1vdmUtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgIGNvbnN0IGJ0biA9IGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IHJvdyA9IGJ0bi5jbG9zZXN0KFwiLml0ZW0tcm93XCIpIGFzIEhUTUxUYWJsZVJvd0VsZW1lbnRcclxuICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KHJvdylcclxuICAgICAgICBjb25zdCBpdGVtID0gZ2V0U29ydGVkSW52ZW50b3J5SXRlbXMocGxheWVyKVtpZHhdXHJcbiAgICAgICAgaWYgKCFpdGVtKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFybC5pc0VxdWlwcGFibGUoaXRlbSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXBsYXllci5pc0VxdWlwcGVkKGl0ZW0pKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVtb3ZlSXRlbShwbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgc2hvd0ludmVudG9yeShwbGF5ZXIpXHJcbiAgICB9KVxyXG5cclxuICAgIGRvbS5kZWxlZ2F0ZShpbnZlbnRvcnlEaWFsb2csIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LXVzZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgY29uc3QgYnRuID0gZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgocm93KVxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJbnZlbnRvcnlJdGVtcyhwbGF5ZXIpW2lkeF1cclxuICAgICAgICBpZiAoIWl0ZW0pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIShpdGVtIGluc3RhbmNlb2YgcmwuVXNhYmxlKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVzZUl0ZW0ocGxheWVyLCBpdGVtKVxyXG4gICAgICAgIHNob3dJbnZlbnRvcnkocGxheWVyKVxyXG4gICAgfSlcclxuXHJcbiAgICBkb20uZGVsZWdhdGUoaW52ZW50b3J5RGlhbG9nLCBcImNsaWNrXCIsIFwiLmludmVudG9yeS1kcm9wLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICBjb25zdCBidG4gPSBldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICBjb25zdCByb3cgPSBidG4uY2xvc2VzdChcIi5pdGVtLXJvd1wiKSBhcyBIVE1MVGFibGVSb3dFbGVtZW50XHJcbiAgICAgICAgY29uc3QgaWR4ID0gZG9tLmdldEVsZW1lbnRJbmRleChyb3cpXHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEludmVudG9yeUl0ZW1zKHBsYXllcilbaWR4XVxyXG4gICAgICAgIGlmICghaXRlbSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRyb3BJdGVtKHBsYXllciwgaXRlbSlcclxuICAgICAgICBzaG93SW52ZW50b3J5KHBsYXllcilcclxuICAgIH0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyb3BJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5JdGVtKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIuZGVsZXRlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHdhcyBkcm9wcGVkYClcclxufVxyXG5cclxuZnVuY3Rpb24gdXNlSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuVXNhYmxlKTogdm9pZCB7XHJcbiAgICBjb25zdCBhbW91bnQgPSBNYXRoLm1pbihpdGVtLmhlYWx0aCwgcGxheWVyLm1heEhlYWx0aCAtIHBsYXllci5oZWFsdGgpXHJcbiAgICBwbGF5ZXIuaGVhbHRoICs9IGFtb3VudFxyXG4gICAgcGxheWVyLmRlbGV0ZShpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSByZXN0b3JlZCAke2Ftb3VudH0gaGVhbHRoYClcclxufVxyXG5cclxuZnVuY3Rpb24gZXF1aXBJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5FcXVpcHBhYmxlKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIuZXF1aXAoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gd2FzIGVxdWlwcGVkYClcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuRXF1aXBwYWJsZSk6IHZvaWQge1xyXG4gICAgcGxheWVyLnJlbW92ZShpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSB3YXMgcmVtb3ZlZGApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluaXRDb250YWluZXJEaWFsb2cocGxheWVyOiBybC5QbGF5ZXIpIHtcclxuICAgIGNvbnN0IGNsb3NlQnV0dG9uID0gZG9tLmJ5SWQoXCJjb250YWluZXJDbG9zZUJ1dHRvblwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IGhpZGVEaWFsb2coY29udGFpbmVyRGlhbG9nKSlcclxuICAgIGNvbnN0IHRha2VBbGxCdXR0b24gPSBkb20uYnlJZChcImNvbnRhaW5lclRha2VBbGxCdXR0b25cIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHRha2VBbGxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRha2VBbGwocGxheWVyKSlcclxufVxyXG5cclxuZnVuY3Rpb24gdGFrZUFsbChwbGF5ZXI6IHJsLlBsYXllcikge1xyXG4gICAgaGlkZURpYWxvZyhjb250YWluZXJEaWFsb2cpXHJcbn1cclxuXHJcbm1haW4oKSJdfQ==