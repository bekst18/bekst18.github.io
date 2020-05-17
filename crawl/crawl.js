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
    renderer.flush(rl.lightRadius * rl.tileSize);
}
function drawThing(renderer, offset, th) {
    // don't draw things that aren't positioned
    if (!th.position) {
        return;
    }
    if (th.visible === rl.Visibility.None) {
        return;
    }
    const color = th.color;
    console.log(th.visible);
    if (th.visible === rl.Visibility.Fog) {
        color.a = .75;
    }
    const spritePosition = th.position.mulScalar(rl.tileSize).addPoint(offset);
    const sprite = new gfx.Sprite({
        position: spritePosition,
        color: color,
        width: rl.tileSize,
        height: rl.tileSize,
        texture: th.texture,
        layer: th.textureLayer,
        flags: gfx.SpriteFlags.Lit | gfx.SpriteFlags.ArrayTexture | gfx.SpriteFlags.CastsShadows
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBRWpDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFzQixDQUFBO0FBQ3RELE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQW1CLENBQUE7QUFDckUsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQW1CLENBQUE7QUFDN0QsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBbUIsQ0FBQTtBQUNyRSxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFtQixDQUFBO0FBQ3JFLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQXFCLENBQUE7QUFDckUsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBcUIsQ0FBQTtBQUNyRSxNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FB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RUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUNsRSxDQUFDO0FBRUQsU0FBUyxPQUFPLENBQUMsTUFBaUI7SUFDOUIsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0FBQy9CLENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuaW1wb3J0ICogYXMgZ2VuIGZyb20gXCIuL2dlbi5qc1wiXHJcbmltcG9ydCAqIGFzIGlucHV0IGZyb20gXCIuLi9zaGFyZWQvaW5wdXQuanNcIlxyXG5pbXBvcnQgKiBhcyBybCBmcm9tIFwiLi9ybC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgb3V0cHV0IGZyb20gXCIuL291dHB1dC5qc1wiXHJcbmltcG9ydCAqIGFzIHRoaW5ncyBmcm9tIFwiLi90aGluZ3MuanNcIlxyXG5pbXBvcnQgKiBhcyBtYXBzIGZyb20gXCIuL21hcHMuanNcIlxyXG5cclxuY29uc3QgY2FudmFzID0gZG9tLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuY29uc3QgbW9kYWxCYWNrZ3JvdW5kID0gZG9tLmJ5SWQoXCJtb2RhbEJhY2tncm91bmRcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuY29uc3Qgc3RhdHNEaWFsb2cgPSBkb20uYnlJZChcInN0YXRzRGlhbG9nXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbmNvbnN0IGludmVudG9yeURpYWxvZyA9IGRvbS5ieUlkKFwiaW52ZW50b3J5RGlhbG9nXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbmNvbnN0IGNvbnRhaW5lckRpYWxvZyA9IGRvbS5ieUlkKFwiY29udGFpbmVyRGlhbG9nXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbmNvbnN0IGludmVudG9yeVRhYmxlID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlUYWJsZVwiKSBhcyBIVE1MVGFibGVFbGVtZW50XHJcbmNvbnN0IGNvbnRhaW5lclRhYmxlID0gZG9tLmJ5SWQoXCJjb250YWluZXJUYWJsZVwiKSBhcyBIVE1MVGFibGVFbGVtZW50XHJcbmNvbnN0IGludmVudG9yeUl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwiaW52ZW50b3J5SXRlbVRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuY29uc3QgY29udGFpbmVySXRlbVRlbXBsYXRlID0gZG9tLmJ5SWQoXCJjb250YWluZXJJdGVtVGVtcGxhdGVcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG5cclxuZW51bSBDb21tYW5kVHlwZSB7XHJcbiAgICBNb3ZlLFxyXG4gICAgRXF1aXAsXHJcbiAgICBVc2UsXHJcbiAgICBQYXNzLFxyXG4gICAgT3BlbixcclxuICAgIEF0dGFjayxcclxuICAgIENsaW1iVXAsXHJcbiAgICBDbGltYkRvd25cclxufVxyXG5cclxuaW50ZXJmYWNlIE1vdmVDb21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLk1vdmVcclxuICAgIHBvc2l0aW9uOiBnZW8uUG9pbnRcclxufVxyXG5cclxuaW50ZXJmYWNlIEVxdWlwQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5FcXVpcFxyXG4gICAgaXRlbTogcmwuRXF1aXBwYWJsZVxyXG59XHJcblxyXG5pbnRlcmZhY2UgUGFzc0NvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuUGFzc1xyXG59XHJcblxyXG5pbnRlcmZhY2UgVXNlQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5Vc2VcclxuICAgIGl0ZW06IHJsLlVzYWJsZVxyXG59XHJcblxyXG5pbnRlcmZhY2UgT3BlbkNvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuT3BlblxyXG4gICAgZml4dHVyZTogcmwuRG9vclxyXG59XHJcblxyXG5pbnRlcmZhY2UgQXR0YWNrQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5BdHRhY2tcclxuICAgIG1vbnN0ZXI6IHJsLk1vbnN0ZXJcclxufVxyXG5cclxuaW50ZXJmYWNlIENsaW1iVXBDb21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLkNsaW1iVXBcclxufVxyXG5cclxuaW50ZXJmYWNlIENsaW1iRG93bkNvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuQ2xpbWJEb3duXHJcbn1cclxuXHJcbnR5cGUgQ29tbWFuZCA9IE1vdmVDb21tYW5kIHwgRXF1aXBDb21tYW5kIHwgUGFzc0NvbW1hbmQgfCBVc2VDb21tYW5kIHwgT3BlbkNvbW1hbmQgfCBBdHRhY2tDb21tYW5kIHwgQ2xpbWJVcENvbW1hbmQgfCBDbGltYkRvd25Db21tYW5kXHJcblxyXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZU1hcChwbGF5ZXI6IHJsLlBsYXllciwgcmVuZGVyZXI6IGdmeC5SZW5kZXJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBQcm9taXNlPG1hcHMuTWFwPiB7XHJcbiAgICBjb25zdCBtYXAgPSBnZW4uZ2VuZXJhdGVNYXAod2lkdGgsIGhlaWdodCwgcGxheWVyKVxyXG5cclxuICAgIC8vIGJha2UgYWxsIDI0eDI0IHRpbGUgaW1hZ2VzIHRvIGEgc2luZ2xlIGFycmF5IHRleHR1cmVcclxuICAgIC8vIHN0b3JlIG1hcHBpbmcgZnJvbSBpbWFnZSB1cmwgdG8gaW5kZXhcclxuICAgIGxldCBpbWFnZVVybHM6IHN0cmluZ1tdID0gW11cclxuICAgIGltYWdlVXJscy5wdXNoKC4uLmFycmF5Lm1hcChtYXAudGlsZXMsIHQgPT4gdC5pbWFnZSkpXHJcbiAgICBpbWFnZVVybHMucHVzaCguLi5hcnJheS5tYXAobWFwLmZpeHR1cmVzLCB0ID0+IHQuaW1hZ2UpKVxyXG4gICAgaW1hZ2VVcmxzLnB1c2goLi4uYXJyYXkubWFwKG1hcC5tb25zdGVycywgYyA9PiBjLmltYWdlKSlcclxuICAgIGltYWdlVXJscy5wdXNoKHBsYXllci5pbWFnZSlcclxuICAgIGltYWdlVXJscyA9IGltYWdlVXJscy5maWx0ZXIodXJsID0+IHVybClcclxuICAgIGltYWdlVXJscyA9IGFycmF5LmRpc3RpbmN0KGltYWdlVXJscylcclxuXHJcbiAgICBjb25zdCBsYXllck1hcCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KGltYWdlVXJscy5tYXAoKHVybCwgaSkgPT4gW3VybCwgaV0pKVxyXG4gICAgY29uc3QgaW1hZ2VzID0gYXdhaXQgUHJvbWlzZS5hbGwoaW1hZ2VVcmxzLm1hcCh1cmwgPT4gZG9tLmxvYWRJbWFnZSh1cmwpKSlcclxuICAgIGNvbnN0IHRleHR1cmUgPSByZW5kZXJlci5iYWtlVGV4dHVyZUFycmF5KHJsLnRpbGVTaXplLCBybC50aWxlU2l6ZSwgaW1hZ2VzKVxyXG5cclxuICAgIGZvciAoY29uc3QgdGggb2YgbWFwKSB7XHJcbiAgICAgICAgaWYgKCF0aC5pbWFnZSkge1xyXG4gICAgICAgICAgICB0aC50ZXh0dXJlTGF5ZXIgPSAtMVxyXG4gICAgICAgICAgICB0aC50ZXh0dXJlID0gbnVsbFxyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbGF5ZXIgPSBsYXllck1hcC5nZXQodGguaW1hZ2UpXHJcbiAgICAgICAgaWYgKGxheWVyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB0ZXh0dXJlIGluZGV4IG5vdCBmb3VuZCBmb3IgJHt0aC5pbWFnZX1gKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGgudGV4dHVyZSA9IHRleHR1cmVcclxuICAgICAgICB0aC50ZXh0dXJlTGF5ZXIgPSBsYXllclxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBtYXBcclxufVxyXG5cclxuZnVuY3Rpb24gdGljayhyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBpbnA6IGlucHV0LklucHV0LCBtYXA6IG1hcHMuTWFwKSB7XHJcbiAgICBjb25zdCBjbWQgPSBoYW5kbGVJbnB1dChtYXAsIGlucClcclxuICAgIGlmIChjbWQpIHtcclxuICAgICAgICBwcm9jZXNzVHVybihtYXAsIGNtZClcclxuICAgIH1cclxuXHJcbiAgICBkcmF3RnJhbWUocmVuZGVyZXIsIG1hcClcclxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aWNrKHJlbmRlcmVyLCBpbnAsIG1hcCkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByb2Nlc3NUdXJuKG1hcDogbWFwcy5NYXAsIGNtZDogQ29tbWFuZCkge1xyXG4gICAgLy8gZmluZCBjcmVhdHVyZSB3aXRoIG1heCBhZ2lsaXR5XHJcbiAgICAvLyBldmVyeW9uZSBtb3ZlcyByZWxhdGl2ZSB0byB0aGlzIHJhdGVcclxuICAgIC8vIGV2ZXJ5b25lIGdldHMgb25lIGFjdGlvbiBwb2ludCBwZXIgcm91bmRcclxuICAgIC8vIGZhc3Rlc3QgY3JlYXR1cmUocykgcmVxdWlyZSAxIGFjdGlvbiBwb2ludCB0byBtb3ZlXHJcbiAgICAvLyB0aGUgcmVzdCByZXF1aXJlIGFuIGFtb3VudCBvZiBhY3Rpb24gcG9pbnRzIGFjY29yZGluZyB0byB0aGVpciByYXRpbyB3aXRoIHRoZSBmYXN0ZXN0XHJcbiAgICAvLyB0aGlzIGFsbCBzaG91bGQgYmUgcmVwZWF0ZWQgdW50aWwgcGxheWVyJ3MgdHVybiBpcyBwcm9jZXNzZWQgYXQgd2hpY2ggcG9pbnQgd2Ugc2hvdWxkIHdhaXQgZm9yIG5leHQgcGxheWVyIG1vdmVcclxuICAgIGNvbnN0IGNyZWF0dXJlcyA9IGFycmF5Lm9yZGVyQnlEZXNjKGFycmF5LmFwcGVuZDxybC5DcmVhdHVyZT4obWFwLm1vbnN0ZXJzLCBtYXAucGxheWVyKSwgbSA9PiBtLmFnaWxpdHkpXHJcbiAgICBjb25zdCBtYXhBZ2lsaXR5ID0gY3JlYXR1cmVzLnJlZHVjZSgoeCwgeSkgPT4geC5hZ2lsaXR5IDwgeS5hZ2lsaXR5ID8geCA6IHkpLmFnaWxpdHlcclxuICAgIGNvbnN0IGFjdGlvblBlclJvdW5kID0gMSAvIG1heEFnaWxpdHlcclxuICAgIGxldCBwbGF5ZXJNb3ZlZCA9IGZhbHNlXHJcblxyXG4gICAgd2hpbGUgKCFwbGF5ZXJNb3ZlZCkge1xyXG4gICAgICAgIGZvciAoY29uc3QgY3JlYXR1cmUgb2YgY3JlYXR1cmVzKSB7XHJcbiAgICAgICAgICAgIGlmIChjcmVhdHVyZS5hY3Rpb24gPCAxKSB7XHJcbiAgICAgICAgICAgICAgICBjcmVhdHVyZS5hY3Rpb24gKz0gYWN0aW9uUGVyUm91bmRcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNyZWF0dXJlLmFjdGlvbiAtPSAxXHJcblxyXG4gICAgICAgICAgICBpZiAoY3JlYXR1cmUgaW5zdGFuY2VvZiBybC5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgIHRpY2tQbGF5ZXIobWFwLCBjcmVhdHVyZSwgY21kKVxyXG4gICAgICAgICAgICAgICAgcGxheWVyTW92ZWQgPSB0cnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChjcmVhdHVyZSBpbnN0YW5jZW9mIHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgICAgIHRpY2tNb25zdGVyKG1hcCwgY3JlYXR1cmUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChtYXAucGxheWVyLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIG1hcHMudXBkYXRlVmlzaWJpbGl0eShtYXAsIG1hcC5wbGF5ZXIucG9zaXRpb24sIHJsLmxpZ2h0UmFkaXVzKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U2Nyb2xsT2Zmc2V0KHBsYXllclBvc2l0aW9uOiBnZW8uUG9pbnQpOiBnZW8uUG9pbnQge1xyXG4gICAgLy8gY29udmVydCBtYXAgcG9pbnQgdG8gY2FudmFzIHBvaW50LCBub3RpbmcgdGhhdCBjYW52YXMgaXMgY2VudGVyZWQgb24gcGxheWVyXHJcbiAgICBjb25zdCBjYW52YXNDZW50ZXIgPSBuZXcgZ2VvLlBvaW50KGNhbnZhcy53aWR0aCAvIDIsIGNhbnZhcy5oZWlnaHQgLyAyKVxyXG4gICAgY29uc3Qgb2Zmc2V0ID0gY2FudmFzQ2VudGVyLnN1YlBvaW50KHBsYXllclBvc2l0aW9uLmFkZFNjYWxhciguNSkubXVsU2NhbGFyKHJsLnRpbGVTaXplKSlcclxuICAgIHJldHVybiBvZmZzZXQuZmxvb3IoKVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYW52YXNUb01hcFBvaW50KHBsYXllclBvc2l0aW9uOiBnZW8uUG9pbnQsIGN4eTogZ2VvLlBvaW50KSB7XHJcbiAgICBjb25zdCBzY3JvbGxPZmZzZXQgPSBnZXRTY3JvbGxPZmZzZXQocGxheWVyUG9zaXRpb24pXHJcbiAgICBjb25zdCBteHkgPSBjeHkuc3ViUG9pbnQoc2Nyb2xsT2Zmc2V0KS5kaXZTY2FsYXIocmwudGlsZVNpemUpXHJcbiAgICByZXR1cm4gbXh5XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1hcFRvQ2FudmFzUG9pbnQocGxheWVyUG9zaXRpb246IGdlby5Qb2ludCwgbXh5OiBnZW8uUG9pbnQpIHtcclxuICAgIGNvbnN0IHNjcm9sbE9mZnNldCA9IGdldFNjcm9sbE9mZnNldChwbGF5ZXJQb3NpdGlvbilcclxuICAgIGNvbnN0IGN4eSA9IG14eS5tdWxTY2FsYXIocmwudGlsZVNpemUpLmFkZFBvaW50KHNjcm9sbE9mZnNldClcclxuICAgIHJldHVybiBjeHlcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlSW5wdXQobWFwOiBtYXBzLk1hcCwgaW5wOiBpbnB1dC5JbnB1dCk6IENvbW1hbmQgfCBudWxsIHtcclxuICAgIGNvbnN0IHBsYXllciA9IG1hcC5wbGF5ZXJcclxuICAgIGlmICghcGxheWVyLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGxcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBwb3NpdGlvbiA9IHBsYXllci5wb3NpdGlvbi5jbG9uZSgpXHJcblxyXG4gICAgaWYgKGlucC5tb3VzZUxlZnRQcmVzc2VkKSB7XHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHRoZSBtYXAgY29vcmRpbmF0ZXMgdGhlIHVzZXIgY2xpY2tlZCBvblxyXG4gICAgICAgIGNvbnN0IG14eSA9IGNhbnZhc1RvTWFwUG9pbnQocGxheWVyLnBvc2l0aW9uLCBuZXcgZ2VvLlBvaW50KGlucC5tb3VzZVgsIGlucC5tb3VzZVkpKS5mbG9vcigpXHJcblxyXG4gICAgICAgIGNvbnN0IGNsaWNrRml4dHVyZSA9IG1hcC5maXh0dXJlQXQobXh5KVxyXG4gICAgICAgIGlmIChjbGlja0ZpeHR1cmUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYFlvdSBzZWUgJHtjbGlja0ZpeHR1cmUubmFtZX1gKVxyXG4gICAgICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY2xpY2tDcmVhdHVyZSA9IG1hcC5tb25zdGVyQXQobXh5KVxyXG4gICAgICAgIGlmIChjbGlja0NyZWF0dXJlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBZb3Ugc2VlICR7Y2xpY2tDcmVhdHVyZS5uYW1lfWApXHJcbiAgICAgICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICAgICAgICAgIHJldHVybiBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBkeHkgPSBteHkuc3ViUG9pbnQocGxheWVyLnBvc2l0aW9uKVxyXG4gICAgICAgIGNvbnN0IHNnbiA9IGR4eS5zaWduKClcclxuICAgICAgICBjb25zdCBhYnMgPSBkeHkuYWJzKClcclxuXHJcbiAgICAgICAgaWYgKGFicy54ID4gMCAmJiBhYnMueCA+PSBhYnMueSkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbi54ICs9IHNnbi54XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYWJzLnkgPiAwICYmIGFicy55ID4gYWJzLngpIHtcclxuICAgICAgICAgICAgcG9zaXRpb24ueSArPSBzZ24ueVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChpbnAucHJlc3NlZChcIndcIikpIHtcclxuICAgICAgICBwb3NpdGlvbi55IC09IDFcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGlucC5wcmVzc2VkKFwic1wiKSkge1xyXG4gICAgICAgIHBvc2l0aW9uLnkgKz0gMVxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJhXCIpKSB7XHJcbiAgICAgICAgcG9zaXRpb24ueCAtPSAxXHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChpbnAucHJlc3NlZChcImRcIikpIHtcclxuICAgICAgICBwb3NpdGlvbi54ICs9IDFcclxuICAgIH0gZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJ6XCIpKSB7XHJcbiAgICAgICAgc2hvd1N0YXRzKHBsYXllcilcclxuICAgIH0gZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJpXCIpKSB7XHJcbiAgICAgICAgc2hvd0ludmVudG9yeShwbGF5ZXIpXHJcbiAgICB9XHJcblxyXG4gICAgaW5wLmZsdXNoKClcclxuXHJcbiAgICBpZiAocG9zaXRpb24uZXF1YWwocGxheWVyLnBvc2l0aW9uKSkge1xyXG4gICAgICAgIHJldHVybiBudWxsXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdGlsZSA9IG1hcC50aWxlQXQocG9zaXRpb24pXHJcbiAgICBpZiAodGlsZSAmJiAhdGlsZS5wYXNzYWJsZSkge1xyXG4gICAgICAgIG91dHB1dC5pbmZvKGBDYW4ndCBtb3ZlIHRoYXQgd2F5LCBibG9ja2VkIGJ5ICR7dGlsZS5uYW1lfWApXHJcbiAgICAgICAgcmV0dXJuIG51bGxcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmaXh0dXJlID0gbWFwLmZpeHR1cmVBdChwb3NpdGlvbilcclxuICAgIGlmIChmaXh0dXJlIGluc3RhbmNlb2YgcmwuRG9vcikge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHR5cGU6IENvbW1hbmRUeXBlLk9wZW4sXHJcbiAgICAgICAgICAgIGZpeHR1cmU6IGZpeHR1cmVcclxuICAgICAgICB9XHJcbiAgICB9IGVsc2UgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5TdGFpcnNVcCkge1xyXG4gICAgICAgIHJldHVybiB7IHR5cGU6IENvbW1hbmRUeXBlLkNsaW1iVXAgfVxyXG4gICAgfSBlbHNlIGlmIChmaXh0dXJlIGluc3RhbmNlb2YgcmwuU3RhaXJzRG93bikge1xyXG4gICAgICAgIHJldHVybiB7IHR5cGU6IENvbW1hbmRUeXBlLkNsaW1iRG93biB9XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChmaXh0dXJlICYmICFmaXh0dXJlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgb3V0cHV0LmluZm8oYENhbid0IG1vdmUgdGhhdCB3YXksIGJsb2NrZWQgYnkgJHtmaXh0dXJlLm5hbWV9YClcclxuICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNvbnRhaW5lciA9IG1hcC5jb250YWluZXJBdChwb3NpdGlvbilcclxuICAgIGlmIChjb250YWluZXIpIHtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbW9uc3RlciA9IG1hcC5tb25zdGVyQXQocG9zaXRpb24pXHJcbiAgICBpZiAobW9uc3RlciAmJiAhbW9uc3Rlci5wYXNzYWJsZSkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHR5cGU6IENvbW1hbmRUeXBlLkF0dGFjayxcclxuICAgICAgICAgICAgbW9uc3RlcjogbW9uc3RlclxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHR5cGU6IENvbW1hbmRUeXBlLk1vdmUsXHJcbiAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdGcmFtZShyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBtYXA6IG1hcHMuTWFwKSB7XHJcbiAgICBjb25zdCBwbGF5ZXIgPSBtYXAucGxheWVyXHJcbiAgICBpZiAoIXBsYXllci5wb3NpdGlvbikge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGhhbmRsZVJlc2l6ZShyZW5kZXJlci5jYW52YXMpXHJcblxyXG4gICAgLy8gY2VudGVyIHRoZSBncmlkIGFyb3VuZCB0aGUgcGxheWVyZFxyXG4gICAgY29uc3Qgb2Zmc2V0ID0gZ2V0U2Nyb2xsT2Zmc2V0KHBsYXllci5wb3NpdGlvbilcclxuXHJcbiAgICAvLyBub3RlIC0gZHJhd2luZyBvcmRlciBtYXR0ZXJzIC0gZHJhdyBmcm9tIGJvdHRvbSB0byB0b3BcclxuXHJcbiAgICAvLyBkcmF3IHZhcmlvdXMgbGF5ZXJzIG9mIHNwcml0ZXNcclxuICAgIGZvciAoY29uc3QgdGlsZSBvZiBtYXAudGlsZXMpIHtcclxuICAgICAgICBkcmF3VGhpbmcocmVuZGVyZXIsIG9mZnNldCwgdGlsZSlcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IGZpeHR1cmUgb2YgbWFwLmZpeHR1cmVzKSB7XHJcbiAgICAgICAgZHJhd1RoaW5nKHJlbmRlcmVyLCBvZmZzZXQsIGZpeHR1cmUpXHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCBjcmVhdHVyZSBvZiBtYXAubW9uc3RlcnMpIHtcclxuICAgICAgICBkcmF3VGhpbmcocmVuZGVyZXIsIG9mZnNldCwgY3JlYXR1cmUpXHJcbiAgICB9XHJcblxyXG4gICAgZHJhd1RoaW5nKHJlbmRlcmVyLCBvZmZzZXQsIHBsYXllcilcclxuICAgIGRyYXdIZWFsdGhCYXIocmVuZGVyZXIsIHBsYXllciwgb2Zmc2V0KVxyXG5cclxuICAgIHJlbmRlcmVyLmZsdXNoKHJsLmxpZ2h0UmFkaXVzICogcmwudGlsZVNpemUpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdUaGluZyhyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBvZmZzZXQ6IGdlby5Qb2ludCwgdGg6IHJsLlRoaW5nKSB7XHJcbiAgICAvLyBkb24ndCBkcmF3IHRoaW5ncyB0aGF0IGFyZW4ndCBwb3NpdGlvbmVkXHJcbiAgICBpZiAoIXRoLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoLnZpc2libGUgPT09IHJsLlZpc2liaWxpdHkuTm9uZSkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNvbG9yID0gdGguY29sb3JcclxuICAgIGNvbnNvbGUubG9nKHRoLnZpc2libGUpXHJcbiAgICBpZiAodGgudmlzaWJsZSA9PT0gcmwuVmlzaWJpbGl0eS5Gb2cpIHtcclxuICAgICAgICBjb2xvci5hID0gLjc1XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc3ByaXRlUG9zaXRpb24gPSB0aC5wb3NpdGlvbi5tdWxTY2FsYXIocmwudGlsZVNpemUpLmFkZFBvaW50KG9mZnNldClcclxuICAgIGNvbnN0IHNwcml0ZSA9IG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24sXHJcbiAgICAgICAgY29sb3I6IGNvbG9yLFxyXG4gICAgICAgIHdpZHRoOiBybC50aWxlU2l6ZSxcclxuICAgICAgICBoZWlnaHQ6IHJsLnRpbGVTaXplLFxyXG4gICAgICAgIHRleHR1cmU6IHRoLnRleHR1cmUsXHJcbiAgICAgICAgbGF5ZXI6IHRoLnRleHR1cmVMYXllcixcclxuICAgICAgICBmbGFnczogZ2Z4LlNwcml0ZUZsYWdzLkxpdCB8IGdmeC5TcHJpdGVGbGFncy5BcnJheVRleHR1cmUgfCBnZnguU3ByaXRlRmxhZ3MuQ2FzdHNTaGFkb3dzXHJcbiAgICB9KVxyXG5cclxuICAgIHJlbmRlcmVyLmRyYXdTcHJpdGUoc3ByaXRlKVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3SGVhbHRoQmFyKHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIGNyZWF0dXJlOiBybC5DcmVhdHVyZSwgb2Zmc2V0OiBnZW8uUG9pbnQpIHtcclxuICAgIGlmICghY3JlYXR1cmUucG9zaXRpb24pIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB3aWR0aCA9IGNyZWF0dXJlLm1heEhlYWx0aCAqIDQgKyAyXHJcbiAgICBjb25zdCBzcHJpdGVQb3NpdGlvbiA9IGNyZWF0dXJlLnBvc2l0aW9uLm11bFNjYWxhcihybC50aWxlU2l6ZSkuYWRkUG9pbnQob2Zmc2V0KS5zdWJQb2ludChuZXcgZ2VvLlBvaW50KDAsIHJsLnRpbGVTaXplIC8gMikpXHJcbiAgICByZW5kZXJlci5kcmF3U3ByaXRlKG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24sXHJcbiAgICAgICAgY29sb3I6IGdmeC5Db2xvci53aGl0ZSxcclxuICAgICAgICB3aWR0aDogd2lkdGgsXHJcbiAgICAgICAgaGVpZ2h0OiA4XHJcbiAgICB9KSlcclxuXHJcbiAgICByZW5kZXJlci5kcmF3U3ByaXRlKG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24uYWRkUG9pbnQobmV3IGdlby5Qb2ludCgxLCAxKSksXHJcbiAgICAgICAgY29sb3I6IGdmeC5Db2xvci5yZWQsXHJcbiAgICAgICAgd2lkdGg6IHdpZHRoIC0gMixcclxuICAgICAgICBoZWlnaHQ6IDZcclxuICAgIH0pKVxyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVSZXNpemUoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgaWYgKGNhbnZhcy53aWR0aCA9PT0gY2FudmFzLmNsaWVudFdpZHRoICYmIGNhbnZhcy5oZWlnaHQgPT09IGNhbnZhcy5jbGllbnRIZWlnaHQpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjYW52YXMud2lkdGggPSBjYW52YXMuY2xpZW50V2lkdGhcclxuICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMuY2xpZW50SGVpZ2h0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3dEaWFsb2coZGlhbG9nOiBIVE1MRGl2RWxlbWVudCkge1xyXG4gICAgbW9kYWxCYWNrZ3JvdW5kLmhpZGRlbiA9IGZhbHNlXHJcbiAgICBkaWFsb2cuaGlkZGVuID0gZmFsc2VcclxuICAgIGRpYWxvZy5mb2N1cygpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhpZGVEaWFsb2coZGlhbG9nOiBIVE1MRGl2RWxlbWVudCkge1xyXG4gICAgbW9kYWxCYWNrZ3JvdW5kLmhpZGRlbiA9IHRydWVcclxuICAgIGRpYWxvZy5oaWRkZW4gPSB0cnVlXHJcbiAgICBjYW52YXMuZm9jdXMoKVxyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93U3RhdHMocGxheWVyOiBybC5QbGF5ZXIpIHtcclxuICAgIGNvbnN0IGhlYWx0aFNwYW4gPSBkb20uYnlJZChcInN0YXRzSGVhbHRoXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgY29uc3QgYXR0YWNrU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNBdHRhY2tcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICBjb25zdCBkZWZlbnNlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNEZWZlbnNlXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgY29uc3QgYWdpbGl0eVNwYW4gPSBkb20uYnlJZChcInN0YXRzQWdpbGl0eVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgIGNvbnN0IGxldmVsU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNMZXZlbFwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgIGNvbnN0IGV4cGVyaWVuY2VTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0V4cGVyaWVuY2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICBjb25zdCBleHBlcmllbmNlUmVxdWlyZW1lbnQgPSBybC5nZXRFeHBlcmllbmNlUmVxdWlyZW1lbnQocGxheWVyLmxldmVsICsgMSlcclxuXHJcbiAgICBoZWFsdGhTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmhlYWx0aH0gLyAke3BsYXllci5tYXhIZWFsdGh9YFxyXG4gICAgYXR0YWNrU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5hdHRhY2t9YFxyXG4gICAgZGVmZW5zZVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuZGVmZW5zZX1gXHJcbiAgICBhZ2lsaXR5U3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5hZ2lsaXR5fWBcclxuICAgIGxldmVsU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5sZXZlbH1gXHJcbiAgICBleHBlcmllbmNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5leHBlcmllbmNlfSAvICR7ZXhwZXJpZW5jZVJlcXVpcmVtZW50fWBcclxuXHJcbiAgICBzaG93RGlhbG9nKHN0YXRzRGlhbG9nKVxyXG59XHJcblxyXG5mdW5jdGlvbiB0b2dnbGVTdGF0cyhwbGF5ZXI6IHJsLlBsYXllcikge1xyXG4gICAgaWYgKHN0YXRzRGlhbG9nLmhpZGRlbikge1xyXG4gICAgICAgIHNob3dTdGF0cyhwbGF5ZXIpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGhpZGVEaWFsb2coc3RhdHNEaWFsb2cpXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3dJbnZlbnRvcnkocGxheWVyOiBybC5QbGF5ZXIpIHtcclxuICAgIGNvbnN0IHRib2R5ID0gaW52ZW50b3J5VGFibGUudEJvZGllc1swXVxyXG4gICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRib2R5KVxyXG5cclxuICAgIGNvbnN0IGl0ZW1zID0gZ2V0U29ydGVkSW52ZW50b3J5SXRlbXMocGxheWVyKVxyXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XHJcbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBpbnZlbnRvcnlJdGVtVGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgIGNvbnN0IHRyID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLml0ZW0tcm93XCIpXHJcbiAgICAgICAgY29uc3QgaXRlbU5hbWVUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLW5hbWVcIilcclxuICAgICAgICBjb25zdCBlcXVpcEJ1dHRvbiA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pbnZlbnRvcnktZXF1aXAtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgY29uc3QgcmVtb3ZlQnV0dG9uID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLmludmVudG9yeS1yZW1vdmUtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgY29uc3QgdXNlQnV0dG9uID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLmludmVudG9yeS11c2UtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcblxyXG4gICAgICAgIGl0ZW1OYW1lVGQudGV4dENvbnRlbnQgPSBpdGVtLm5hbWVcclxuICAgICAgICB1c2VCdXR0b24uaGlkZGVuID0gIShpdGVtIGluc3RhbmNlb2YgcmwuVXNhYmxlKVxyXG4gICAgICAgIGVxdWlwQnV0dG9uLmhpZGRlbiA9ICFybC5pc0VxdWlwcGFibGUoaXRlbSkgfHwgcGxheWVyLmlzRXF1aXBwZWQoaXRlbSlcclxuICAgICAgICByZW1vdmVCdXR0b24uaGlkZGVuID0gIXBsYXllci5pc0VxdWlwcGVkKGl0ZW0pXHJcblxyXG4gICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgfVxyXG5cclxuICAgIHNob3dEaWFsb2coaW52ZW50b3J5RGlhbG9nKVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTb3J0ZWRJbnZlbnRvcnlJdGVtcyhwbGF5ZXI6IHJsLlBsYXllcik6IHJsLkl0ZW1bXSB7XHJcbiAgICBjb25zdCBpdGVtcyA9IGFycmF5Lm9yZGVyQnkocGxheWVyLmludmVudG9yeSwgaSA9PiBpLm5hbWUpXHJcbiAgICByZXR1cm4gaXRlbXNcclxufVxyXG5cclxuZnVuY3Rpb24gdG9nZ2xlSW52ZW50b3J5KHBsYXllcjogcmwuUGxheWVyKSB7XHJcbiAgICBpZiAoaW52ZW50b3J5RGlhbG9nLmhpZGRlbikge1xyXG4gICAgICAgIHNob3dJbnZlbnRvcnkocGxheWVyKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBoaWRlRGlhbG9nKGludmVudG9yeURpYWxvZylcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdGlja1BsYXllcihtYXA6IG1hcHMuTWFwLCBwbGF5ZXI6IHJsLlBsYXllciwgY21kOiBDb21tYW5kKSB7XHJcbiAgICBzd2l0Y2ggKGNtZC50eXBlKSB7XHJcbiAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5PcGVuOiB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKFwiRG9vciBvcGVuZWRcIilcclxuICAgICAgICAgICAgbWFwLmZpeHR1cmVzLmRlbGV0ZShjbWQuZml4dHVyZSlcclxuICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuUGFzczoge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhcIlBhc3NcIilcclxuICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuTW92ZToge1xyXG4gICAgICAgICAgICBwbGF5ZXIucG9zaXRpb24gPSBjbWQucG9zaXRpb25cclxuICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuRXF1aXA6IHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiRXF1aXAgbm90IHlldCBpbXBsZW1lbnRlZFwiKVxyXG4gICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5Vc2U6IHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiVXNlIG5vdCB5ZXQgaW1wbGVtZW50ZWRcIilcclxuICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuQXR0YWNrOiB7XHJcbiAgICAgICAgICAgIG91dHB1dC5lcnJvcihcIkF0dGFjayBub3QgeWV0IGltcGxlbWVudGVkXCIpXHJcbiAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICBjYXNlIENvbW1hbmRUeXBlLkNsaW1iVXA6IHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiQ2xpbWIgdXAgbm90IHlldCBpbXBsZW1lbnRlZFwiKVxyXG4gICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5DbGltYkRvd246IHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiQ2xpbWIgZG93biB5ZXQgaW1wbGVtZW50ZWRcIilcclxuICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRpY2tNb25zdGVyKG1hcDogbWFwcy5NYXAsIG1vbnN0ZXI6IHJsLk1vbnN0ZXIpIHtcclxuICAgIC8vIGRldGVybWluZSB3aGV0aGVyIG1vbnN0ZXIgY2FuIHNlZSBwbGF5ZXJcclxuICAgIGlmICghbW9uc3Rlci5wb3NpdGlvbikge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGlmICghbWFwLnBsYXllci5wb3NpdGlvbikge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGlmIChjYW5TZWUobWFwLCBtb25zdGVyLnBvc2l0aW9uLCBtYXAucGxheWVyLnBvc2l0aW9uKSAmJiBtb25zdGVyLnN0YXRlICE9PSBybC5Nb25zdGVyU3RhdGUuYWdncm8pIHtcclxuICAgICAgICBvdXRwdXQud2FybmluZyhgJHttb25zdGVyLm5hbWV9IGhhcyBzcG90dGVkIHlvdSFgKVxyXG4gICAgICAgIG1vbnN0ZXIuc3RhdGUgPSBybC5Nb25zdGVyU3RhdGUuYWdncm9cclxuICAgIH1cclxuXHJcbiAgICBpZiAoIWNhblNlZShtYXAsIG1vbnN0ZXIucG9zaXRpb24sIG1hcC5wbGF5ZXIucG9zaXRpb24pICYmIG1vbnN0ZXIuc3RhdGUgPT09IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dybykge1xyXG4gICAgICAgIG91dHB1dC53YXJuaW5nKGAke21vbnN0ZXIubmFtZX0gaGFzIGxvc3Qgc2lnaHQgb2YgeW91IWApXHJcbiAgICAgICAgbW9uc3Rlci5zdGF0ZSA9IHJsLk1vbnN0ZXJTdGF0ZS5pZGxlXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhblNlZShtYXA6IG1hcHMuTWFwLCBleWU6IGdlby5Qb2ludCwgdGFyZ2V0OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgIGZvciAoY29uc3QgcHQgb2YgbWFyY2goZXllLCB0YXJnZXQpKSB7XHJcbiAgICAgICAgLy8gaWdub3JlIHN0YXJ0IHBvaW50XHJcbiAgICAgICAgaWYgKHB0LmVxdWFsKGV5ZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgdGggb2YgbWFwLmF0KHB0KSkge1xyXG4gICAgICAgICAgICBpZiAoIXRoLnRyYW5zcGFyZW50KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiogbWFyY2goc3RhcnQ6IGdlby5Qb2ludCwgZW5kOiBnZW8uUG9pbnQpOiBHZW5lcmF0b3I8Z2VvLlBvaW50PiB7XHJcbiAgICBjb25zdCBjdXIgPSBzdGFydC5jbG9uZSgpXHJcbiAgICBjb25zdCBkeSA9IE1hdGguYWJzKGVuZC55IC0gc3RhcnQueSk7XHJcbiAgICBjb25zdCBzeSA9IHN0YXJ0LnkgPCBlbmQueSA/IDEgOiAtMTtcclxuICAgIGNvbnN0IGR4ID0gLU1hdGguYWJzKGVuZC54IC0gc3RhcnQueCk7XHJcbiAgICBjb25zdCBzeCA9IHN0YXJ0LnggPCBlbmQueCA/IDEgOiAtMTtcclxuICAgIGxldCBlcnIgPSBkeSArIGR4O1xyXG5cclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgeWllbGQgY3VyXHJcblxyXG4gICAgICAgIGlmIChjdXIuZXF1YWwoZW5kKSkge1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGUyID0gMiAqIGVycjtcclxuICAgICAgICBpZiAoZTIgPj0gZHgpIHtcclxuICAgICAgICAgICAgZXJyICs9IGR4O1xyXG4gICAgICAgICAgICBjdXIueSArPSBzeTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlMiA8PSBkeSkge1xyXG4gICAgICAgICAgICBlcnIgKz0gZHk7XHJcbiAgICAgICAgICAgIGN1ci54ICs9IHN4O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gbWFpbigpIHtcclxuICAgIGNvbnN0IHJlbmRlcmVyID0gbmV3IGdmeC5SZW5kZXJlcihjYW52YXMpXHJcblxyXG4gICAgY29uc3QgcGxheWVyID0gdGhpbmdzLnBsYXllci5jbG9uZSgpXHJcbiAgICBwbGF5ZXIuaW52ZW50b3J5LmFkZCh0aGluZ3Muc3RlZWxTaGllbGQuY2xvbmUoKSlcclxuICAgIHBsYXllci5pbnZlbnRvcnkuYWRkKHRoaW5ncy5zdGVlbFN3b3JkLmNsb25lKCkpXHJcbiAgICBwbGF5ZXIuaW52ZW50b3J5LmFkZCh0aGluZ3Muc3RlZWxQbGF0ZUFybW9yLmNsb25lKCkpXHJcbiAgICBwbGF5ZXIuaW52ZW50b3J5LmFkZCh0aGluZ3Mud2Vha0hlYWx0aFBvdGlvbi5jbG9uZSgpKVxyXG4gICAgcGxheWVyLmludmVudG9yeS5hZGQodGhpbmdzLmhlYWx0aFBvdGlvbi5jbG9uZSgpKVxyXG5cclxuICAgIGNvbnN0IG1hcCA9IGF3YWl0IGdlbmVyYXRlTWFwKHBsYXllciwgcmVuZGVyZXIsIDY0LCA2NClcclxuICAgIGNvbnN0IGlucCA9IG5ldyBpbnB1dC5JbnB1dChjYW52YXMpXHJcblxyXG4gICAgaW5pdFN0YXRzRGlhbG9nKHBsYXllcilcclxuICAgIGluaXRJbnZlbnRvcnlEaWFsb2cocGxheWVyKVxyXG4gICAgaW5pdENvbnRhaW5lckRpYWxvZyhwbGF5ZXIpXHJcblxyXG4gICAgaWYgKCFwbGF5ZXIucG9zaXRpb24pIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQbGF5ZXIgaXMgbm90IHBvc2l0aW9uZWRcIilcclxuICAgIH1cclxuICAgIFxyXG4gICAgbWFwcy51cGRhdGVWaXNpYmlsaXR5KG1hcCwgcGxheWVyLnBvc2l0aW9uLCBybC5saWdodFJhZGl1cylcclxuXHJcbiAgICBvdXRwdXQud3JpdGUoXCJZb3VyIGFkdmVudHVyZSBiZWdpbnNcIilcclxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aWNrKHJlbmRlcmVyLCBpbnAsIG1hcCkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluaXRTdGF0c0RpYWxvZyhwbGF5ZXI6IHJsLlBsYXllcikge1xyXG4gICAgY29uc3Qgc3RhdHNCdXR0b24gPSBkb20uYnlJZChcInN0YXRzQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBjb25zdCBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwic3RhdHNDbG9zZUJ1dHRvblwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgc3RhdHNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRvZ2dsZVN0YXRzKHBsYXllcikpXHJcbiAgICBjbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gaGlkZURpYWxvZyhzdGF0c0RpYWxvZykpXHJcblxyXG4gICAgc3RhdHNEaWFsb2cuYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4ge1xyXG4gICAgICAgIGlmIChldi5rZXkudG9VcHBlckNhc2UoKSA9PT0gXCJaXCIpIHtcclxuICAgICAgICAgICAgaGlkZURpYWxvZyhzdGF0c0RpYWxvZylcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0SW52ZW50b3J5RGlhbG9nKHBsYXllcjogcmwuUGxheWVyKSB7XHJcbiAgICBjb25zdCBpbnZlbnRvcnlCdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgY29uc3QgY2xvc2VCdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeUNsb3NlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBpbnZlbnRvcnlCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRvZ2dsZUludmVudG9yeShwbGF5ZXIpKVxyXG4gICAgY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IGhpZGVEaWFsb2coaW52ZW50b3J5RGlhbG9nKSlcclxuXHJcbiAgICBpbnZlbnRvcnlEaWFsb2cuYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4ge1xyXG4gICAgICAgIGlmIChldi5rZXkudG9VcHBlckNhc2UoKSA9PT0gXCJJXCIpIHtcclxuICAgICAgICAgICAgaGlkZURpYWxvZyhpbnZlbnRvcnlEaWFsb2cpXHJcbiAgICAgICAgfVxyXG4gICAgfSlcclxuXHJcbiAgICBkb20uZGVsZWdhdGUoaW52ZW50b3J5RGlhbG9nLCBcImNsaWNrXCIsIFwiLmludmVudG9yeS1lcXVpcC1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgY29uc3QgYnRuID0gZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgocm93KVxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJbnZlbnRvcnlJdGVtcyhwbGF5ZXIpW2lkeF1cclxuICAgICAgICBpZiAoIWl0ZW0pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJsLmlzRXF1aXBwYWJsZShpdGVtKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGVxdWlwSXRlbShwbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgc2hvd0ludmVudG9yeShwbGF5ZXIpXHJcbiAgICB9KVxyXG5cclxuICAgIGRvbS5kZWxlZ2F0ZShpbnZlbnRvcnlEaWFsb2csIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LXJlbW92ZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgY29uc3QgYnRuID0gZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgocm93KVxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJbnZlbnRvcnlJdGVtcyhwbGF5ZXIpW2lkeF1cclxuICAgICAgICBpZiAoIWl0ZW0pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJsLmlzRXF1aXBwYWJsZShpdGVtKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghcGxheWVyLmlzRXF1aXBwZWQoaXRlbSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZW1vdmVJdGVtKHBsYXllciwgaXRlbSlcclxuICAgICAgICBzaG93SW52ZW50b3J5KHBsYXllcilcclxuICAgIH0pXHJcblxyXG4gICAgZG9tLmRlbGVnYXRlKGludmVudG9yeURpYWxvZywgXCJjbGlja1wiLCBcIi5pbnZlbnRvcnktdXNlLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICBjb25zdCBidG4gPSBldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICBjb25zdCByb3cgPSBidG4uY2xvc2VzdChcIi5pdGVtLXJvd1wiKSBhcyBIVE1MVGFibGVSb3dFbGVtZW50XHJcbiAgICAgICAgY29uc3QgaWR4ID0gZG9tLmdldEVsZW1lbnRJbmRleChyb3cpXHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEludmVudG9yeUl0ZW1zKHBsYXllcilbaWR4XVxyXG4gICAgICAgIGlmICghaXRlbSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghKGl0ZW0gaW5zdGFuY2VvZiBybC5Vc2FibGUpKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXNlSXRlbShwbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgc2hvd0ludmVudG9yeShwbGF5ZXIpXHJcbiAgICB9KVxyXG5cclxuICAgIGRvbS5kZWxlZ2F0ZShpbnZlbnRvcnlEaWFsb2csIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LWRyb3AtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgIGNvbnN0IGJ0biA9IGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IHJvdyA9IGJ0bi5jbG9zZXN0KFwiLml0ZW0tcm93XCIpIGFzIEhUTUxUYWJsZVJvd0VsZW1lbnRcclxuICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KHJvdylcclxuICAgICAgICBjb25zdCBpdGVtID0gZ2V0U29ydGVkSW52ZW50b3J5SXRlbXMocGxheWVyKVtpZHhdXHJcbiAgICAgICAgaWYgKCFpdGVtKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZHJvcEl0ZW0ocGxheWVyLCBpdGVtKVxyXG4gICAgICAgIHNob3dJbnZlbnRvcnkocGxheWVyKVxyXG4gICAgfSlcclxufVxyXG5cclxuZnVuY3Rpb24gZHJvcEl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkl0ZW0pOiB2b2lkIHtcclxuICAgIHBsYXllci5kZWxldGUoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gd2FzIGRyb3BwZWRgKVxyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5Vc2FibGUpOiB2b2lkIHtcclxuICAgIGNvbnN0IGFtb3VudCA9IE1hdGgubWluKGl0ZW0uaGVhbHRoLCBwbGF5ZXIubWF4SGVhbHRoIC0gcGxheWVyLmhlYWx0aClcclxuICAgIHBsYXllci5oZWFsdGggKz0gYW1vdW50XHJcbiAgICBwbGF5ZXIuZGVsZXRlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHJlc3RvcmVkICR7YW1vdW50fSBoZWFsdGhgKVxyXG59XHJcblxyXG5mdW5jdGlvbiBlcXVpcEl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkVxdWlwcGFibGUpOiB2b2lkIHtcclxuICAgIHBsYXllci5lcXVpcChpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSB3YXMgZXF1aXBwZWRgKVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5FcXVpcHBhYmxlKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIucmVtb3ZlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHdhcyByZW1vdmVkYClcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdENvbnRhaW5lckRpYWxvZyhwbGF5ZXI6IHJsLlBsYXllcikge1xyXG4gICAgY29uc3QgY2xvc2VCdXR0b24gPSBkb20uYnlJZChcImNvbnRhaW5lckNsb3NlQnV0dG9uXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBjbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gaGlkZURpYWxvZyhjb250YWluZXJEaWFsb2cpKVxyXG4gICAgY29uc3QgdGFrZUFsbEJ1dHRvbiA9IGRvbS5ieUlkKFwiY29udGFpbmVyVGFrZUFsbEJ1dHRvblwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgdGFrZUFsbEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGFrZUFsbChwbGF5ZXIpKVxyXG59XHJcblxyXG5mdW5jdGlvbiB0YWtlQWxsKHBsYXllcjogcmwuUGxheWVyKSB7XHJcbiAgICBoaWRlRGlhbG9nKGNvbnRhaW5lckRpYWxvZylcclxufVxyXG5cclxubWFpbigpIl19