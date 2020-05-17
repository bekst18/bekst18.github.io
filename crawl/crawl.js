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
    if (th.visible !== rl.Visible.Visible) {
        return;
    }
    const spritePosition = th.position.mulScalar(rl.tileSize).addPoint(offset);
    const sprite = new gfx.Sprite({
        position: spritePosition,
        color: th.color,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBRWpDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFzQixDQUFBO0FBQ3RELE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQW1CLENBQUE7QUFDckUsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQW1CLENBQUE7QUFDN0QsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBbUIsQ0FBQTtBQUNyRSxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFtQixDQUFBO0FBQ3JFLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQXFCLENBQUE7QUFDckUsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBcUIsQ0FBQTtBQUNyRSxNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FB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IGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiXHJcbmltcG9ydCAqIGFzIGdmeCBmcm9tIFwiLi9nZnguanNcIlxyXG5pbXBvcnQgKiBhcyBnZW4gZnJvbSBcIi4vZ2VuLmpzXCJcclxuaW1wb3J0ICogYXMgaW5wdXQgZnJvbSBcIi4uL3NoYXJlZC9pbnB1dC5qc1wiXHJcbmltcG9ydCAqIGFzIHJsIGZyb20gXCIuL3JsLmpzXCJcclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvMmQuanNcIlxyXG5pbXBvcnQgKiBhcyBvdXRwdXQgZnJvbSBcIi4vb3V0cHV0LmpzXCJcclxuaW1wb3J0ICogYXMgdGhpbmdzIGZyb20gXCIuL3RoaW5ncy5qc1wiXHJcbmltcG9ydCAqIGFzIG1hcHMgZnJvbSBcIi4vbWFwcy5qc1wiXHJcblxyXG5jb25zdCBjYW52YXMgPSBkb20uYnlJZChcImNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG5jb25zdCBtb2RhbEJhY2tncm91bmQgPSBkb20uYnlJZChcIm1vZGFsQmFja2dyb3VuZFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5jb25zdCBzdGF0c0RpYWxvZyA9IGRvbS5ieUlkKFwic3RhdHNEaWFsb2dcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuY29uc3QgaW52ZW50b3J5RGlhbG9nID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlEaWFsb2dcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuY29uc3QgY29udGFpbmVyRGlhbG9nID0gZG9tLmJ5SWQoXCJjb250YWluZXJEaWFsb2dcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuY29uc3QgaW52ZW50b3J5VGFibGUgPSBkb20uYnlJZChcImludmVudG9yeVRhYmxlXCIpIGFzIEhUTUxUYWJsZUVsZW1lbnRcclxuY29uc3QgY29udGFpbmVyVGFibGUgPSBkb20uYnlJZChcImNvbnRhaW5lclRhYmxlXCIpIGFzIEhUTUxUYWJsZUVsZW1lbnRcclxuY29uc3QgaW52ZW50b3J5SXRlbVRlbXBsYXRlID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlJdGVtVGVtcGxhdGVcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG5jb25zdCBjb250YWluZXJJdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcImNvbnRhaW5lckl0ZW1UZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcblxyXG5lbnVtIENvbW1hbmRUeXBlIHtcclxuICAgIE1vdmUsXHJcbiAgICBFcXVpcCxcclxuICAgIFVzZSxcclxuICAgIFBhc3MsXHJcbiAgICBPcGVuLFxyXG4gICAgQXR0YWNrLFxyXG4gICAgQ2xpbWJVcCxcclxuICAgIENsaW1iRG93blxyXG59XHJcblxyXG5pbnRlcmZhY2UgTW92ZUNvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuTW92ZVxyXG4gICAgcG9zaXRpb246IGdlby5Qb2ludFxyXG59XHJcblxyXG5pbnRlcmZhY2UgRXF1aXBDb21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLkVxdWlwXHJcbiAgICBpdGVtOiBybC5FcXVpcHBhYmxlXHJcbn1cclxuXHJcbmludGVyZmFjZSBQYXNzQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5QYXNzXHJcbn1cclxuXHJcbmludGVyZmFjZSBVc2VDb21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLlVzZVxyXG4gICAgaXRlbTogcmwuVXNhYmxlXHJcbn1cclxuXHJcbmludGVyZmFjZSBPcGVuQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5PcGVuXHJcbiAgICBmaXh0dXJlOiBybC5Eb29yXHJcbn1cclxuXHJcbmludGVyZmFjZSBBdHRhY2tDb21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLkF0dGFja1xyXG4gICAgbW9uc3RlcjogcmwuTW9uc3RlclxyXG59XHJcblxyXG5pbnRlcmZhY2UgQ2xpbWJVcENvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuQ2xpbWJVcFxyXG59XHJcblxyXG5pbnRlcmZhY2UgQ2xpbWJEb3duQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5DbGltYkRvd25cclxufVxyXG5cclxudHlwZSBDb21tYW5kID0gTW92ZUNvbW1hbmQgfCBFcXVpcENvbW1hbmQgfCBQYXNzQ29tbWFuZCB8IFVzZUNvbW1hbmQgfCBPcGVuQ29tbWFuZCB8IEF0dGFja0NvbW1hbmQgfCBDbGltYlVwQ29tbWFuZCB8IENsaW1iRG93bkNvbW1hbmRcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlTWFwKHBsYXllcjogcmwuUGxheWVyLCByZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFByb21pc2U8bWFwcy5NYXA+IHtcclxuICAgIGNvbnN0IG1hcCA9IGdlbi5nZW5lcmF0ZU1hcCh3aWR0aCwgaGVpZ2h0LCBwbGF5ZXIpXHJcblxyXG4gICAgLy8gYmFrZSBhbGwgMjR4MjQgdGlsZSBpbWFnZXMgdG8gYSBzaW5nbGUgYXJyYXkgdGV4dHVyZVxyXG4gICAgLy8gc3RvcmUgbWFwcGluZyBmcm9tIGltYWdlIHVybCB0byBpbmRleFxyXG4gICAgbGV0IGltYWdlVXJsczogc3RyaW5nW10gPSBbXVxyXG4gICAgaW1hZ2VVcmxzLnB1c2goLi4uYXJyYXkubWFwKG1hcC50aWxlcywgdCA9PiB0LmltYWdlKSlcclxuICAgIGltYWdlVXJscy5wdXNoKC4uLmFycmF5Lm1hcChtYXAuZml4dHVyZXMsIHQgPT4gdC5pbWFnZSkpXHJcbiAgICBpbWFnZVVybHMucHVzaCguLi5hcnJheS5tYXAobWFwLm1vbnN0ZXJzLCBjID0+IGMuaW1hZ2UpKVxyXG4gICAgaW1hZ2VVcmxzLnB1c2gocGxheWVyLmltYWdlKVxyXG4gICAgaW1hZ2VVcmxzID0gaW1hZ2VVcmxzLmZpbHRlcih1cmwgPT4gdXJsKVxyXG4gICAgaW1hZ2VVcmxzID0gYXJyYXkuZGlzdGluY3QoaW1hZ2VVcmxzKVxyXG5cclxuICAgIGNvbnN0IGxheWVyTWFwID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oaW1hZ2VVcmxzLm1hcCgodXJsLCBpKSA9PiBbdXJsLCBpXSkpXHJcbiAgICBjb25zdCBpbWFnZXMgPSBhd2FpdCBQcm9taXNlLmFsbChpbWFnZVVybHMubWFwKHVybCA9PiBkb20ubG9hZEltYWdlKHVybCkpKVxyXG4gICAgY29uc3QgdGV4dHVyZSA9IHJlbmRlcmVyLmJha2VUZXh0dXJlQXJyYXkocmwudGlsZVNpemUsIHJsLnRpbGVTaXplLCBpbWFnZXMpXHJcblxyXG4gICAgZm9yIChjb25zdCB0aCBvZiBtYXApIHtcclxuICAgICAgICBpZiAoIXRoLmltYWdlKSB7XHJcbiAgICAgICAgICAgIHRoLnRleHR1cmVMYXllciA9IC0xXHJcbiAgICAgICAgICAgIHRoLnRleHR1cmUgPSBudWxsXHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBsYXllciA9IGxheWVyTWFwLmdldCh0aC5pbWFnZSlcclxuICAgICAgICBpZiAobGF5ZXIgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHRleHR1cmUgaW5kZXggbm90IGZvdW5kIGZvciAke3RoLmltYWdlfWApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aC50ZXh0dXJlID0gdGV4dHVyZVxyXG4gICAgICAgIHRoLnRleHR1cmVMYXllciA9IGxheWVyXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG1hcFxyXG59XHJcblxyXG5mdW5jdGlvbiB0aWNrKHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIGlucDogaW5wdXQuSW5wdXQsIG1hcDogbWFwcy5NYXApIHtcclxuICAgIGNvbnN0IGNtZCA9IGhhbmRsZUlucHV0KG1hcCwgaW5wKVxyXG4gICAgaWYgKGNtZCkge1xyXG4gICAgICAgIHByb2Nlc3NUdXJuKG1hcCwgY21kKVxyXG4gICAgfVxyXG5cclxuICAgIGRyYXdGcmFtZShyZW5kZXJlciwgbWFwKVxyXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRpY2socmVuZGVyZXIsIGlucCwgbWFwKSlcclxufVxyXG5cclxuZnVuY3Rpb24gcHJvY2Vzc1R1cm4obWFwOiBtYXBzLk1hcCwgY21kOiBDb21tYW5kKSB7XHJcbiAgICAvLyBmaW5kIGNyZWF0dXJlIHdpdGggbWF4IGFnaWxpdHlcclxuICAgIC8vIGV2ZXJ5b25lIG1vdmVzIHJlbGF0aXZlIHRvIHRoaXMgcmF0ZVxyXG4gICAgLy8gZXZlcnlvbmUgZ2V0cyBvbmUgYWN0aW9uIHBvaW50IHBlciByb3VuZFxyXG4gICAgLy8gZmFzdGVzdCBjcmVhdHVyZShzKSByZXF1aXJlIDEgYWN0aW9uIHBvaW50IHRvIG1vdmVcclxuICAgIC8vIHRoZSByZXN0IHJlcXVpcmUgYW4gYW1vdW50IG9mIGFjdGlvbiBwb2ludHMgYWNjb3JkaW5nIHRvIHRoZWlyIHJhdGlvIHdpdGggdGhlIGZhc3Rlc3RcclxuICAgIC8vIHRoaXMgYWxsIHNob3VsZCBiZSByZXBlYXRlZCB1bnRpbCBwbGF5ZXIncyB0dXJuIGlzIHByb2Nlc3NlZCBhdCB3aGljaCBwb2ludCB3ZSBzaG91bGQgd2FpdCBmb3IgbmV4dCBwbGF5ZXIgbW92ZVxyXG4gICAgY29uc3QgY3JlYXR1cmVzID0gYXJyYXkub3JkZXJCeURlc2MoYXJyYXkuYXBwZW5kPHJsLkNyZWF0dXJlPihtYXAubW9uc3RlcnMsIG1hcC5wbGF5ZXIpLCBtID0+IG0uYWdpbGl0eSlcclxuICAgIGNvbnN0IG1heEFnaWxpdHkgPSBjcmVhdHVyZXMucmVkdWNlKCh4LCB5KSA9PiB4LmFnaWxpdHkgPCB5LmFnaWxpdHkgPyB4IDogeSkuYWdpbGl0eVxyXG4gICAgY29uc3QgYWN0aW9uUGVyUm91bmQgPSAxIC8gbWF4QWdpbGl0eVxyXG4gICAgbGV0IHBsYXllck1vdmVkID0gZmFsc2VcclxuXHJcbiAgICB3aGlsZSAoIXBsYXllck1vdmVkKSB7XHJcbiAgICAgICAgZm9yIChjb25zdCBjcmVhdHVyZSBvZiBjcmVhdHVyZXMpIHtcclxuICAgICAgICAgICAgaWYgKGNyZWF0dXJlLmFjdGlvbiA8IDEpIHtcclxuICAgICAgICAgICAgICAgIGNyZWF0dXJlLmFjdGlvbiArPSBhY3Rpb25QZXJSb3VuZFxyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY3JlYXR1cmUuYWN0aW9uIC09IDFcclxuXHJcbiAgICAgICAgICAgIGlmIChjcmVhdHVyZSBpbnN0YW5jZW9mIHJsLlBsYXllcikge1xyXG4gICAgICAgICAgICAgICAgdGlja1BsYXllcihtYXAsIGNyZWF0dXJlLCBjbWQpXHJcbiAgICAgICAgICAgICAgICBwbGF5ZXJNb3ZlZCA9IHRydWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGNyZWF0dXJlIGluc3RhbmNlb2YgcmwuTW9uc3Rlcikge1xyXG4gICAgICAgICAgICAgICAgdGlja01vbnN0ZXIobWFwLCBjcmVhdHVyZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG1hcC5wbGF5ZXIucG9zaXRpb24pIHtcclxuICAgICAgICAgICAgbWFwcy51cGRhdGVWaXNpYmlsaXR5KG1hcCwgbWFwLnBsYXllci5wb3NpdGlvbiwgcmwubGlnaHRSYWRpdXMpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTY3JvbGxPZmZzZXQocGxheWVyUG9zaXRpb246IGdlby5Qb2ludCk6IGdlby5Qb2ludCB7XHJcbiAgICAvLyBjb252ZXJ0IG1hcCBwb2ludCB0byBjYW52YXMgcG9pbnQsIG5vdGluZyB0aGF0IGNhbnZhcyBpcyBjZW50ZXJlZCBvbiBwbGF5ZXJcclxuICAgIGNvbnN0IGNhbnZhc0NlbnRlciA9IG5ldyBnZW8uUG9pbnQoY2FudmFzLndpZHRoIC8gMiwgY2FudmFzLmhlaWdodCAvIDIpXHJcbiAgICBjb25zdCBvZmZzZXQgPSBjYW52YXNDZW50ZXIuc3ViUG9pbnQocGxheWVyUG9zaXRpb24uYWRkU2NhbGFyKC41KS5tdWxTY2FsYXIocmwudGlsZVNpemUpKVxyXG4gICAgcmV0dXJuIG9mZnNldC5mbG9vcigpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbnZhc1RvTWFwUG9pbnQocGxheWVyUG9zaXRpb246IGdlby5Qb2ludCwgY3h5OiBnZW8uUG9pbnQpIHtcclxuICAgIGNvbnN0IHNjcm9sbE9mZnNldCA9IGdldFNjcm9sbE9mZnNldChwbGF5ZXJQb3NpdGlvbilcclxuICAgIGNvbnN0IG14eSA9IGN4eS5zdWJQb2ludChzY3JvbGxPZmZzZXQpLmRpdlNjYWxhcihybC50aWxlU2l6ZSlcclxuICAgIHJldHVybiBteHlcclxufVxyXG5cclxuZnVuY3Rpb24gbWFwVG9DYW52YXNQb2ludChwbGF5ZXJQb3NpdGlvbjogZ2VvLlBvaW50LCBteHk6IGdlby5Qb2ludCkge1xyXG4gICAgY29uc3Qgc2Nyb2xsT2Zmc2V0ID0gZ2V0U2Nyb2xsT2Zmc2V0KHBsYXllclBvc2l0aW9uKVxyXG4gICAgY29uc3QgY3h5ID0gbXh5Lm11bFNjYWxhcihybC50aWxlU2l6ZSkuYWRkUG9pbnQoc2Nyb2xsT2Zmc2V0KVxyXG4gICAgcmV0dXJuIGN4eVxyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVJbnB1dChtYXA6IG1hcHMuTWFwLCBpbnA6IGlucHV0LklucHV0KTogQ29tbWFuZCB8IG51bGwge1xyXG4gICAgY29uc3QgcGxheWVyID0gbWFwLnBsYXllclxyXG4gICAgaWYgKCFwbGF5ZXIucG9zaXRpb24pIHtcclxuICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHBvc2l0aW9uID0gcGxheWVyLnBvc2l0aW9uLmNsb25lKClcclxuXHJcbiAgICBpZiAoaW5wLm1vdXNlTGVmdFByZXNzZWQpIHtcclxuICAgICAgICAvLyBkZXRlcm1pbmUgdGhlIG1hcCBjb29yZGluYXRlcyB0aGUgdXNlciBjbGlja2VkIG9uXHJcbiAgICAgICAgY29uc3QgbXh5ID0gY2FudmFzVG9NYXBQb2ludChwbGF5ZXIucG9zaXRpb24sIG5ldyBnZW8uUG9pbnQoaW5wLm1vdXNlWCwgaW5wLm1vdXNlWSkpLmZsb29yKClcclxuXHJcbiAgICAgICAgY29uc3QgY2xpY2tGaXh0dXJlID0gbWFwLmZpeHR1cmVBdChteHkpXHJcbiAgICAgICAgaWYgKGNsaWNrRml4dHVyZSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke2NsaWNrRml4dHVyZS5uYW1lfWApXHJcbiAgICAgICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICAgICAgICAgIHJldHVybiBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjbGlja0NyZWF0dXJlID0gbWFwLm1vbnN0ZXJBdChteHkpXHJcbiAgICAgICAgaWYgKGNsaWNrQ3JlYXR1cmUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYFlvdSBzZWUgJHtjbGlja0NyZWF0dXJlLm5hbWV9YClcclxuICAgICAgICAgICAgaW5wLmZsdXNoKClcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGR4eSA9IG14eS5zdWJQb2ludChwbGF5ZXIucG9zaXRpb24pXHJcbiAgICAgICAgY29uc3Qgc2duID0gZHh5LnNpZ24oKVxyXG4gICAgICAgIGNvbnN0IGFicyA9IGR4eS5hYnMoKVxyXG5cclxuICAgICAgICBpZiAoYWJzLnggPiAwICYmIGFicy54ID49IGFicy55KSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnggKz0gc2duLnhcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChhYnMueSA+IDAgJiYgYWJzLnkgPiBhYnMueCkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbi55ICs9IHNnbi55XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGlucC5wcmVzc2VkKFwid1wiKSkge1xyXG4gICAgICAgIHBvc2l0aW9uLnkgLT0gMVxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJzXCIpKSB7XHJcbiAgICAgICAgcG9zaXRpb24ueSArPSAxXHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChpbnAucHJlc3NlZChcImFcIikpIHtcclxuICAgICAgICBwb3NpdGlvbi54IC09IDFcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGlucC5wcmVzc2VkKFwiZFwiKSkge1xyXG4gICAgICAgIHBvc2l0aW9uLnggKz0gMVxyXG4gICAgfSBlbHNlIGlmIChpbnAucHJlc3NlZChcInpcIikpIHtcclxuICAgICAgICBzaG93U3RhdHMocGxheWVyKVxyXG4gICAgfSBlbHNlIGlmIChpbnAucHJlc3NlZChcImlcIikpIHtcclxuICAgICAgICBzaG93SW52ZW50b3J5KHBsYXllcilcclxuICAgIH1cclxuXHJcbiAgICBpbnAuZmx1c2goKVxyXG5cclxuICAgIGlmIChwb3NpdGlvbi5lcXVhbChwbGF5ZXIucG9zaXRpb24pKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGxcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0aWxlID0gbWFwLnRpbGVBdChwb3NpdGlvbilcclxuICAgIGlmICh0aWxlICYmICF0aWxlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgb3V0cHV0LmluZm8oYENhbid0IG1vdmUgdGhhdCB3YXksIGJsb2NrZWQgYnkgJHt0aWxlLm5hbWV9YClcclxuICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGZpeHR1cmUgPSBtYXAuZml4dHVyZUF0KHBvc2l0aW9uKVxyXG4gICAgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5Eb29yKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdHlwZTogQ29tbWFuZFR5cGUuT3BlbixcclxuICAgICAgICAgICAgZml4dHVyZTogZml4dHVyZVxyXG4gICAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAoZml4dHVyZSBpbnN0YW5jZW9mIHJsLlN0YWlyc1VwKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogQ29tbWFuZFR5cGUuQ2xpbWJVcCB9XHJcbiAgICB9IGVsc2UgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5TdGFpcnNEb3duKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogQ29tbWFuZFR5cGUuQ2xpbWJEb3duIH1cclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGZpeHR1cmUgJiYgIWZpeHR1cmUucGFzc2FibGUpIHtcclxuICAgICAgICBvdXRwdXQuaW5mbyhgQ2FuJ3QgbW92ZSB0aGF0IHdheSwgYmxvY2tlZCBieSAke2ZpeHR1cmUubmFtZX1gKVxyXG4gICAgICAgIHJldHVybiBudWxsXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY29udGFpbmVyID0gbWFwLmNvbnRhaW5lckF0KHBvc2l0aW9uKVxyXG4gICAgaWYgKGNvbnRhaW5lcikge1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBtb25zdGVyID0gbWFwLm1vbnN0ZXJBdChwb3NpdGlvbilcclxuICAgIGlmIChtb25zdGVyICYmICFtb25zdGVyLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdHlwZTogQ29tbWFuZFR5cGUuQXR0YWNrLFxyXG4gICAgICAgICAgICBtb25zdGVyOiBtb25zdGVyXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgdHlwZTogQ29tbWFuZFR5cGUuTW92ZSxcclxuICAgICAgICBwb3NpdGlvbjogcG9zaXRpb25cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0ZyYW1lKHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIG1hcDogbWFwcy5NYXApIHtcclxuICAgIGNvbnN0IHBsYXllciA9IG1hcC5wbGF5ZXJcclxuICAgIGlmICghcGxheWVyLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaGFuZGxlUmVzaXplKHJlbmRlcmVyLmNhbnZhcylcclxuXHJcbiAgICAvLyBjZW50ZXIgdGhlIGdyaWQgYXJvdW5kIHRoZSBwbGF5ZXJkXHJcbiAgICBjb25zdCBvZmZzZXQgPSBnZXRTY3JvbGxPZmZzZXQocGxheWVyLnBvc2l0aW9uKVxyXG5cclxuICAgIC8vIG5vdGUgLSBkcmF3aW5nIG9yZGVyIG1hdHRlcnMgLSBkcmF3IGZyb20gYm90dG9tIHRvIHRvcFxyXG5cclxuICAgIC8vIGRyYXcgdmFyaW91cyBsYXllcnMgb2Ygc3ByaXRlc1xyXG4gICAgZm9yIChjb25zdCB0aWxlIG9mIG1hcC50aWxlcykge1xyXG4gICAgICAgIGRyYXdUaGluZyhyZW5kZXJlciwgb2Zmc2V0LCB0aWxlKVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgZml4dHVyZSBvZiBtYXAuZml4dHVyZXMpIHtcclxuICAgICAgICBkcmF3VGhpbmcocmVuZGVyZXIsIG9mZnNldCwgZml4dHVyZSlcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IGNyZWF0dXJlIG9mIG1hcC5tb25zdGVycykge1xyXG4gICAgICAgIGRyYXdUaGluZyhyZW5kZXJlciwgb2Zmc2V0LCBjcmVhdHVyZSlcclxuICAgIH1cclxuXHJcbiAgICBkcmF3VGhpbmcocmVuZGVyZXIsIG9mZnNldCwgcGxheWVyKVxyXG4gICAgZHJhd0hlYWx0aEJhcihyZW5kZXJlciwgcGxheWVyLCBvZmZzZXQpXHJcblxyXG4gICAgcmVuZGVyZXIuZmx1c2gocmwubGlnaHRSYWRpdXMgKiBybC50aWxlU2l6ZSlcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd1RoaW5nKHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIG9mZnNldDogZ2VvLlBvaW50LCB0aDogcmwuVGhpbmcpIHtcclxuICAgIC8vIGRvbid0IGRyYXcgdGhpbmdzIHRoYXQgYXJlbid0IHBvc2l0aW9uZWRcclxuICAgIGlmICghdGgucG9zaXRpb24pIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBpZiAodGgudmlzaWJsZSAhPT0gcmwuVmlzaWJsZS5WaXNpYmxlKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc3ByaXRlUG9zaXRpb24gPSB0aC5wb3NpdGlvbi5tdWxTY2FsYXIocmwudGlsZVNpemUpLmFkZFBvaW50KG9mZnNldClcclxuICAgIGNvbnN0IHNwcml0ZSA9IG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24sXHJcbiAgICAgICAgY29sb3I6IHRoLmNvbG9yLFxyXG4gICAgICAgIHdpZHRoOiBybC50aWxlU2l6ZSxcclxuICAgICAgICBoZWlnaHQ6IHJsLnRpbGVTaXplLFxyXG4gICAgICAgIHRleHR1cmU6IHRoLnRleHR1cmUsXHJcbiAgICAgICAgbGF5ZXI6IHRoLnRleHR1cmVMYXllcixcclxuICAgICAgICBmbGFnczogZ2Z4LlNwcml0ZUZsYWdzLkxpdCB8IGdmeC5TcHJpdGVGbGFncy5BcnJheVRleHR1cmUgfCBnZnguU3ByaXRlRmxhZ3MuQ2FzdHNTaGFkb3dzXHJcbiAgICB9KVxyXG5cclxuICAgIHJlbmRlcmVyLmRyYXdTcHJpdGUoc3ByaXRlKVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3SGVhbHRoQmFyKHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIGNyZWF0dXJlOiBybC5DcmVhdHVyZSwgb2Zmc2V0OiBnZW8uUG9pbnQpIHtcclxuICAgIGlmICghY3JlYXR1cmUucG9zaXRpb24pIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB3aWR0aCA9IGNyZWF0dXJlLm1heEhlYWx0aCAqIDQgKyAyXHJcbiAgICBjb25zdCBzcHJpdGVQb3NpdGlvbiA9IGNyZWF0dXJlLnBvc2l0aW9uLm11bFNjYWxhcihybC50aWxlU2l6ZSkuYWRkUG9pbnQob2Zmc2V0KS5zdWJQb2ludChuZXcgZ2VvLlBvaW50KDAsIHJsLnRpbGVTaXplIC8gMikpXHJcbiAgICByZW5kZXJlci5kcmF3U3ByaXRlKG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24sXHJcbiAgICAgICAgY29sb3I6IGdmeC5Db2xvci53aGl0ZSxcclxuICAgICAgICB3aWR0aDogd2lkdGgsXHJcbiAgICAgICAgaGVpZ2h0OiA4XHJcbiAgICB9KSlcclxuXHJcbiAgICByZW5kZXJlci5kcmF3U3ByaXRlKG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24uYWRkUG9pbnQobmV3IGdlby5Qb2ludCgxLCAxKSksXHJcbiAgICAgICAgY29sb3I6IGdmeC5Db2xvci5yZWQsXHJcbiAgICAgICAgd2lkdGg6IHdpZHRoIC0gMixcclxuICAgICAgICBoZWlnaHQ6IDZcclxuICAgIH0pKVxyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVSZXNpemUoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgaWYgKGNhbnZhcy53aWR0aCA9PT0gY2FudmFzLmNsaWVudFdpZHRoICYmIGNhbnZhcy5oZWlnaHQgPT09IGNhbnZhcy5jbGllbnRIZWlnaHQpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjYW52YXMud2lkdGggPSBjYW52YXMuY2xpZW50V2lkdGhcclxuICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMuY2xpZW50SGVpZ2h0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3dEaWFsb2coZGlhbG9nOiBIVE1MRGl2RWxlbWVudCkge1xyXG4gICAgbW9kYWxCYWNrZ3JvdW5kLmhpZGRlbiA9IGZhbHNlXHJcbiAgICBkaWFsb2cuaGlkZGVuID0gZmFsc2VcclxuICAgIGRpYWxvZy5mb2N1cygpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhpZGVEaWFsb2coZGlhbG9nOiBIVE1MRGl2RWxlbWVudCkge1xyXG4gICAgbW9kYWxCYWNrZ3JvdW5kLmhpZGRlbiA9IHRydWVcclxuICAgIGRpYWxvZy5oaWRkZW4gPSB0cnVlXHJcbiAgICBjYW52YXMuZm9jdXMoKVxyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93U3RhdHMocGxheWVyOiBybC5QbGF5ZXIpIHtcclxuICAgIGNvbnN0IGhlYWx0aFNwYW4gPSBkb20uYnlJZChcInN0YXRzSGVhbHRoXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgY29uc3QgYXR0YWNrU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNBdHRhY2tcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICBjb25zdCBkZWZlbnNlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNEZWZlbnNlXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgY29uc3QgYWdpbGl0eVNwYW4gPSBkb20uYnlJZChcInN0YXRzQWdpbGl0eVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgIGNvbnN0IGxldmVsU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNMZXZlbFwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgIGNvbnN0IGV4cGVyaWVuY2VTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0V4cGVyaWVuY2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICBjb25zdCBleHBlcmllbmNlUmVxdWlyZW1lbnQgPSBybC5nZXRFeHBlcmllbmNlUmVxdWlyZW1lbnQocGxheWVyLmxldmVsICsgMSlcclxuXHJcbiAgICBoZWFsdGhTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmhlYWx0aH0gLyAke3BsYXllci5tYXhIZWFsdGh9YFxyXG4gICAgYXR0YWNrU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5hdHRhY2t9YFxyXG4gICAgZGVmZW5zZVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuZGVmZW5zZX1gXHJcbiAgICBhZ2lsaXR5U3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5hZ2lsaXR5fWBcclxuICAgIGxldmVsU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5sZXZlbH1gXHJcbiAgICBleHBlcmllbmNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5leHBlcmllbmNlfSAvICR7ZXhwZXJpZW5jZVJlcXVpcmVtZW50fWBcclxuXHJcbiAgICBzaG93RGlhbG9nKHN0YXRzRGlhbG9nKVxyXG59XHJcblxyXG5mdW5jdGlvbiB0b2dnbGVTdGF0cyhwbGF5ZXI6IHJsLlBsYXllcikge1xyXG4gICAgaWYgKHN0YXRzRGlhbG9nLmhpZGRlbikge1xyXG4gICAgICAgIHNob3dTdGF0cyhwbGF5ZXIpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGhpZGVEaWFsb2coc3RhdHNEaWFsb2cpXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3dJbnZlbnRvcnkocGxheWVyOiBybC5QbGF5ZXIpIHtcclxuICAgIGNvbnN0IHRib2R5ID0gaW52ZW50b3J5VGFibGUudEJvZGllc1swXVxyXG4gICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRib2R5KVxyXG5cclxuICAgIGNvbnN0IGl0ZW1zID0gZ2V0U29ydGVkSW52ZW50b3J5SXRlbXMocGxheWVyKVxyXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XHJcbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBpbnZlbnRvcnlJdGVtVGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgIGNvbnN0IHRyID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLml0ZW0tcm93XCIpXHJcbiAgICAgICAgY29uc3QgaXRlbU5hbWVUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLW5hbWVcIilcclxuICAgICAgICBjb25zdCBlcXVpcEJ1dHRvbiA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pbnZlbnRvcnktZXF1aXAtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgY29uc3QgcmVtb3ZlQnV0dG9uID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLmludmVudG9yeS1yZW1vdmUtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgY29uc3QgdXNlQnV0dG9uID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLmludmVudG9yeS11c2UtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcblxyXG4gICAgICAgIGl0ZW1OYW1lVGQudGV4dENvbnRlbnQgPSBpdGVtLm5hbWVcclxuICAgICAgICB1c2VCdXR0b24uaGlkZGVuID0gIShpdGVtIGluc3RhbmNlb2YgcmwuVXNhYmxlKVxyXG4gICAgICAgIGVxdWlwQnV0dG9uLmhpZGRlbiA9ICFybC5pc0VxdWlwcGFibGUoaXRlbSkgfHwgcGxheWVyLmlzRXF1aXBwZWQoaXRlbSlcclxuICAgICAgICByZW1vdmVCdXR0b24uaGlkZGVuID0gIXBsYXllci5pc0VxdWlwcGVkKGl0ZW0pXHJcblxyXG4gICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgfVxyXG5cclxuICAgIHNob3dEaWFsb2coaW52ZW50b3J5RGlhbG9nKVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTb3J0ZWRJbnZlbnRvcnlJdGVtcyhwbGF5ZXI6IHJsLlBsYXllcik6IHJsLkl0ZW1bXSB7XHJcbiAgICBjb25zdCBpdGVtcyA9IGFycmF5Lm9yZGVyQnkocGxheWVyLmludmVudG9yeSwgaSA9PiBpLm5hbWUpXHJcbiAgICByZXR1cm4gaXRlbXNcclxufVxyXG5cclxuZnVuY3Rpb24gdG9nZ2xlSW52ZW50b3J5KHBsYXllcjogcmwuUGxheWVyKSB7XHJcbiAgICBpZiAoaW52ZW50b3J5RGlhbG9nLmhpZGRlbikge1xyXG4gICAgICAgIHNob3dJbnZlbnRvcnkocGxheWVyKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBoaWRlRGlhbG9nKGludmVudG9yeURpYWxvZylcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdGlja1BsYXllcihtYXA6IG1hcHMuTWFwLCBwbGF5ZXI6IHJsLlBsYXllciwgY21kOiBDb21tYW5kKSB7XHJcbiAgICBzd2l0Y2ggKGNtZC50eXBlKSB7XHJcbiAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5PcGVuOiB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKFwiRG9vciBvcGVuZWRcIilcclxuICAgICAgICAgICAgbWFwLmZpeHR1cmVzLmRlbGV0ZShjbWQuZml4dHVyZSlcclxuICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuUGFzczoge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhcIlBhc3NcIilcclxuICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuTW92ZToge1xyXG4gICAgICAgICAgICBwbGF5ZXIucG9zaXRpb24gPSBjbWQucG9zaXRpb25cclxuICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuRXF1aXA6IHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiRXF1aXAgbm90IHlldCBpbXBsZW1lbnRlZFwiKVxyXG4gICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5Vc2U6IHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiVXNlIG5vdCB5ZXQgaW1wbGVtZW50ZWRcIilcclxuICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuQXR0YWNrOiB7XHJcbiAgICAgICAgICAgIG91dHB1dC5lcnJvcihcIkF0dGFjayBub3QgeWV0IGltcGxlbWVudGVkXCIpXHJcbiAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICBjYXNlIENvbW1hbmRUeXBlLkNsaW1iVXA6IHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiQ2xpbWIgdXAgbm90IHlldCBpbXBsZW1lbnRlZFwiKVxyXG4gICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5DbGltYkRvd246IHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiQ2xpbWIgZG93biB5ZXQgaW1wbGVtZW50ZWRcIilcclxuICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRpY2tNb25zdGVyKG1hcDogbWFwcy5NYXAsIG1vbnN0ZXI6IHJsLk1vbnN0ZXIpIHtcclxuICAgIC8vIGRldGVybWluZSB3aGV0aGVyIG1vbnN0ZXIgY2FuIHNlZSBwbGF5ZXJcclxuICAgIGlmICghbW9uc3Rlci5wb3NpdGlvbikge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGlmICghbWFwLnBsYXllci5wb3NpdGlvbikge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGlmIChjYW5TZWUobWFwLCBtb25zdGVyLnBvc2l0aW9uLCBtYXAucGxheWVyLnBvc2l0aW9uKSAmJiBtb25zdGVyLnN0YXRlICE9PSBybC5Nb25zdGVyU3RhdGUuYWdncm8pIHtcclxuICAgICAgICBvdXRwdXQud2FybmluZyhgJHttb25zdGVyLm5hbWV9IGhhcyBzcG90dGVkIHlvdSFgKVxyXG4gICAgICAgIG1vbnN0ZXIuc3RhdGUgPSBybC5Nb25zdGVyU3RhdGUuYWdncm9cclxuICAgIH1cclxuXHJcbiAgICBpZiAoIWNhblNlZShtYXAsIG1vbnN0ZXIucG9zaXRpb24sIG1hcC5wbGF5ZXIucG9zaXRpb24pICYmIG1vbnN0ZXIuc3RhdGUgPT09IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dybykge1xyXG4gICAgICAgIG91dHB1dC53YXJuaW5nKGAke21vbnN0ZXIubmFtZX0gaGFzIGxvc3Qgc2lnaHQgb2YgeW91IWApXHJcbiAgICAgICAgbW9uc3Rlci5zdGF0ZSA9IHJsLk1vbnN0ZXJTdGF0ZS5pZGxlXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhblNlZShtYXA6IG1hcHMuTWFwLCBleWU6IGdlby5Qb2ludCwgdGFyZ2V0OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgIGZvciAoY29uc3QgcHQgb2YgbWFyY2goZXllLCB0YXJnZXQpKSB7XHJcbiAgICAgICAgLy8gaWdub3JlIHN0YXJ0IHBvaW50XHJcbiAgICAgICAgaWYgKHB0LmVxdWFsKGV5ZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgdGggb2YgbWFwLmF0KHB0KSkge1xyXG4gICAgICAgICAgICBpZiAoIXRoLnRyYW5zcGFyZW50KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiogbWFyY2goc3RhcnQ6IGdlby5Qb2ludCwgZW5kOiBnZW8uUG9pbnQpOiBHZW5lcmF0b3I8Z2VvLlBvaW50PiB7XHJcbiAgICBjb25zdCBjdXIgPSBzdGFydC5jbG9uZSgpXHJcbiAgICBjb25zdCBkeSA9IE1hdGguYWJzKGVuZC55IC0gc3RhcnQueSk7XHJcbiAgICBjb25zdCBzeSA9IHN0YXJ0LnkgPCBlbmQueSA/IDEgOiAtMTtcclxuICAgIGNvbnN0IGR4ID0gLU1hdGguYWJzKGVuZC54IC0gc3RhcnQueCk7XHJcbiAgICBjb25zdCBzeCA9IHN0YXJ0LnggPCBlbmQueCA/IDEgOiAtMTtcclxuICAgIGxldCBlcnIgPSBkeSArIGR4O1xyXG5cclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgeWllbGQgY3VyXHJcblxyXG4gICAgICAgIGlmIChjdXIuZXF1YWwoZW5kKSkge1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGUyID0gMiAqIGVycjtcclxuICAgICAgICBpZiAoZTIgPj0gZHgpIHtcclxuICAgICAgICAgICAgZXJyICs9IGR4O1xyXG4gICAgICAgICAgICBjdXIueSArPSBzeTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlMiA8PSBkeSkge1xyXG4gICAgICAgICAgICBlcnIgKz0gZHk7XHJcbiAgICAgICAgICAgIGN1ci54ICs9IHN4O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gbWFpbigpIHtcclxuICAgIGNvbnN0IHJlbmRlcmVyID0gbmV3IGdmeC5SZW5kZXJlcihjYW52YXMpXHJcblxyXG4gICAgY29uc3QgcGxheWVyID0gdGhpbmdzLnBsYXllci5jbG9uZSgpXHJcbiAgICBwbGF5ZXIuaW52ZW50b3J5LmFkZCh0aGluZ3Muc3RlZWxTaGllbGQuY2xvbmUoKSlcclxuICAgIHBsYXllci5pbnZlbnRvcnkuYWRkKHRoaW5ncy5zdGVlbFN3b3JkLmNsb25lKCkpXHJcbiAgICBwbGF5ZXIuaW52ZW50b3J5LmFkZCh0aGluZ3Muc3RlZWxQbGF0ZUFybW9yLmNsb25lKCkpXHJcbiAgICBwbGF5ZXIuaW52ZW50b3J5LmFkZCh0aGluZ3Mud2Vha0hlYWx0aFBvdGlvbi5jbG9uZSgpKVxyXG4gICAgcGxheWVyLmludmVudG9yeS5hZGQodGhpbmdzLmhlYWx0aFBvdGlvbi5jbG9uZSgpKVxyXG5cclxuICAgIGNvbnN0IG1hcCA9IGF3YWl0IGdlbmVyYXRlTWFwKHBsYXllciwgcmVuZGVyZXIsIDY0LCA2NClcclxuICAgIGNvbnN0IGlucCA9IG5ldyBpbnB1dC5JbnB1dChjYW52YXMpXHJcblxyXG4gICAgaW5pdFN0YXRzRGlhbG9nKHBsYXllcilcclxuICAgIGluaXRJbnZlbnRvcnlEaWFsb2cocGxheWVyKVxyXG4gICAgaW5pdENvbnRhaW5lckRpYWxvZyhwbGF5ZXIpXHJcblxyXG4gICAgaWYgKCFwbGF5ZXIucG9zaXRpb24pIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQbGF5ZXIgaXMgbm90IHBvc2l0aW9uZWRcIilcclxuICAgIH1cclxuICAgIFxyXG4gICAgbWFwcy51cGRhdGVWaXNpYmlsaXR5KG1hcCwgcGxheWVyLnBvc2l0aW9uLCBybC5saWdodFJhZGl1cylcclxuXHJcbiAgICBvdXRwdXQud3JpdGUoXCJZb3VyIGFkdmVudHVyZSBiZWdpbnNcIilcclxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aWNrKHJlbmRlcmVyLCBpbnAsIG1hcCkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluaXRTdGF0c0RpYWxvZyhwbGF5ZXI6IHJsLlBsYXllcikge1xyXG4gICAgY29uc3Qgc3RhdHNCdXR0b24gPSBkb20uYnlJZChcInN0YXRzQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBjb25zdCBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwic3RhdHNDbG9zZUJ1dHRvblwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgc3RhdHNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRvZ2dsZVN0YXRzKHBsYXllcikpXHJcbiAgICBjbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gaGlkZURpYWxvZyhzdGF0c0RpYWxvZykpXHJcblxyXG4gICAgc3RhdHNEaWFsb2cuYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4ge1xyXG4gICAgICAgIGlmIChldi5rZXkudG9VcHBlckNhc2UoKSA9PT0gXCJaXCIpIHtcclxuICAgICAgICAgICAgaGlkZURpYWxvZyhzdGF0c0RpYWxvZylcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0SW52ZW50b3J5RGlhbG9nKHBsYXllcjogcmwuUGxheWVyKSB7XHJcbiAgICBjb25zdCBpbnZlbnRvcnlCdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgY29uc3QgY2xvc2VCdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeUNsb3NlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBpbnZlbnRvcnlCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRvZ2dsZUludmVudG9yeShwbGF5ZXIpKVxyXG4gICAgY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IGhpZGVEaWFsb2coaW52ZW50b3J5RGlhbG9nKSlcclxuXHJcbiAgICBpbnZlbnRvcnlEaWFsb2cuYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4ge1xyXG4gICAgICAgIGlmIChldi5rZXkudG9VcHBlckNhc2UoKSA9PT0gXCJJXCIpIHtcclxuICAgICAgICAgICAgaGlkZURpYWxvZyhpbnZlbnRvcnlEaWFsb2cpXHJcbiAgICAgICAgfVxyXG4gICAgfSlcclxuXHJcbiAgICBkb20uZGVsZWdhdGUoaW52ZW50b3J5RGlhbG9nLCBcImNsaWNrXCIsIFwiLmludmVudG9yeS1lcXVpcC1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgY29uc3QgYnRuID0gZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgocm93KVxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJbnZlbnRvcnlJdGVtcyhwbGF5ZXIpW2lkeF1cclxuICAgICAgICBpZiAoIWl0ZW0pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJsLmlzRXF1aXBwYWJsZShpdGVtKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGVxdWlwSXRlbShwbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgc2hvd0ludmVudG9yeShwbGF5ZXIpXHJcbiAgICB9KVxyXG5cclxuICAgIGRvbS5kZWxlZ2F0ZShpbnZlbnRvcnlEaWFsb2csIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LXJlbW92ZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgY29uc3QgYnRuID0gZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgocm93KVxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJbnZlbnRvcnlJdGVtcyhwbGF5ZXIpW2lkeF1cclxuICAgICAgICBpZiAoIWl0ZW0pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJsLmlzRXF1aXBwYWJsZShpdGVtKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghcGxheWVyLmlzRXF1aXBwZWQoaXRlbSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZW1vdmVJdGVtKHBsYXllciwgaXRlbSlcclxuICAgICAgICBzaG93SW52ZW50b3J5KHBsYXllcilcclxuICAgIH0pXHJcblxyXG4gICAgZG9tLmRlbGVnYXRlKGludmVudG9yeURpYWxvZywgXCJjbGlja1wiLCBcIi5pbnZlbnRvcnktdXNlLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICBjb25zdCBidG4gPSBldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICBjb25zdCByb3cgPSBidG4uY2xvc2VzdChcIi5pdGVtLXJvd1wiKSBhcyBIVE1MVGFibGVSb3dFbGVtZW50XHJcbiAgICAgICAgY29uc3QgaWR4ID0gZG9tLmdldEVsZW1lbnRJbmRleChyb3cpXHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEludmVudG9yeUl0ZW1zKHBsYXllcilbaWR4XVxyXG4gICAgICAgIGlmICghaXRlbSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghKGl0ZW0gaW5zdGFuY2VvZiBybC5Vc2FibGUpKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXNlSXRlbShwbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgc2hvd0ludmVudG9yeShwbGF5ZXIpXHJcbiAgICB9KVxyXG5cclxuICAgIGRvbS5kZWxlZ2F0ZShpbnZlbnRvcnlEaWFsb2csIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LWRyb3AtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgIGNvbnN0IGJ0biA9IGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IHJvdyA9IGJ0bi5jbG9zZXN0KFwiLml0ZW0tcm93XCIpIGFzIEhUTUxUYWJsZVJvd0VsZW1lbnRcclxuICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KHJvdylcclxuICAgICAgICBjb25zdCBpdGVtID0gZ2V0U29ydGVkSW52ZW50b3J5SXRlbXMocGxheWVyKVtpZHhdXHJcbiAgICAgICAgaWYgKCFpdGVtKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZHJvcEl0ZW0ocGxheWVyLCBpdGVtKVxyXG4gICAgICAgIHNob3dJbnZlbnRvcnkocGxheWVyKVxyXG4gICAgfSlcclxufVxyXG5cclxuZnVuY3Rpb24gZHJvcEl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkl0ZW0pOiB2b2lkIHtcclxuICAgIHBsYXllci5kZWxldGUoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gd2FzIGRyb3BwZWRgKVxyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5Vc2FibGUpOiB2b2lkIHtcclxuICAgIGNvbnN0IGFtb3VudCA9IE1hdGgubWluKGl0ZW0uaGVhbHRoLCBwbGF5ZXIubWF4SGVhbHRoIC0gcGxheWVyLmhlYWx0aClcclxuICAgIHBsYXllci5oZWFsdGggKz0gYW1vdW50XHJcbiAgICBwbGF5ZXIuZGVsZXRlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHJlc3RvcmVkICR7YW1vdW50fSBoZWFsdGhgKVxyXG59XHJcblxyXG5mdW5jdGlvbiBlcXVpcEl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkVxdWlwcGFibGUpOiB2b2lkIHtcclxuICAgIHBsYXllci5lcXVpcChpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSB3YXMgZXF1aXBwZWRgKVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5FcXVpcHBhYmxlKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIucmVtb3ZlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHdhcyByZW1vdmVkYClcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdENvbnRhaW5lckRpYWxvZyhwbGF5ZXI6IHJsLlBsYXllcikge1xyXG4gICAgY29uc3QgY2xvc2VCdXR0b24gPSBkb20uYnlJZChcImNvbnRhaW5lckNsb3NlQnV0dG9uXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBjbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gaGlkZURpYWxvZyhjb250YWluZXJEaWFsb2cpKVxyXG4gICAgY29uc3QgdGFrZUFsbEJ1dHRvbiA9IGRvbS5ieUlkKFwiY29udGFpbmVyVGFrZUFsbEJ1dHRvblwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgdGFrZUFsbEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGFrZUFsbChwbGF5ZXIpKVxyXG59XHJcblxyXG5mdW5jdGlvbiB0YWtlQWxsKHBsYXllcjogcmwuUGxheWVyKSB7XHJcbiAgICBoaWRlRGlhbG9nKGNvbnRhaW5lckRpYWxvZylcclxufVxyXG5cclxubWFpbigpIl19