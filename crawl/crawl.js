import * as dom from "../shared/dom.js";
import * as array from "../shared/array.js";
import * as gfx from "./gfx.js";
import * as gen from "./gen.js";
import * as input from "../shared/input.js";
import * as rl from "./rl.js";
import * as geo from "../shared/geo2d.js";
import * as output from "./output.js";
import * as things from "./things.js";
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
        for (const th of map.thingsAt(pt)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBR3JDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFzQixDQUFBO0FBQ3RELE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQW1CLENBQUE7QUFDckUsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQW1CLENBQUE7QUFDN0QsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBbUIsQ0FBQTtBQUNyRSxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFtQixDQUFBO0FBQ3JFLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQXFCLENBQUE7QUFDckUsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBcUIsQ0FBQTtBQUNyRSxNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQXdCLENBQUE7QUFDdEYs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QUE7U0FDZDtRQUVELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN0QixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUE7UUFFckIsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDN0IsUUFBUSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFBO1NBQ3RCO1FBRUQsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDNUIsUUFBUSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFBO1NBQ3RCO0tBRUo7U0FDSSxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDdkIsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7S0FDbEI7U0FDSSxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDdkIsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7S0FDbEI7U0FDSSxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDdkIsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7S0FDbEI7U0FDSSxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDdkIsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7S0FDbEI7U0FBTSxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDekIsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0tBQ3BCO1NBQU0sSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcs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Q0FBQyxJQUFJLGNBQWMsQ0FBQyxDQUFBO0FBQzNDLENBQUM7QUFFRCxTQUFTLG1CQUFtQixDQUFDLE1BQWlCO0lBQzFDLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQW1CLENBQUE7SUFDdEUsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQTtJQUN4RSxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFtQixDQUFBO0lBQzFFLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7QUFDbEUsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUFDLE1BQWlCO0lBQzlCLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQTtBQUMvQixDQUFDO0FBRUQsSUFBSSxFQUFFLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBkb20gZnJvbSBcIi4uL3NoYXJlZC9kb20uanNcIlxyXG5pbXBvcnQgKiBhcyBhcnJheSBmcm9tIFwiLi4vc2hhcmVkL2FycmF5LmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbiBmcm9tIFwiLi9nZW4uanNcIlxyXG5pbXBvcnQgKiBhcyBpbnB1dCBmcm9tIFwiLi4vc2hhcmVkL2lucHV0LmpzXCJcclxuaW1wb3J0ICogYXMgcmwgZnJvbSBcIi4vcmwuanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcbmltcG9ydCAqIGFzIG91dHB1dCBmcm9tIFwiLi9vdXRwdXQuanNcIlxyXG5pbXBvcnQgKiBhcyB0aGluZ3MgZnJvbSBcIi4vdGhpbmdzLmpzXCJcclxuaW1wb3J0ICogYXMgbWFwcyBmcm9tIFwiLi9tYXBzLmpzXCJcclxuXHJcbmNvbnN0IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbmNvbnN0IG1vZGFsQmFja2dyb3VuZCA9IGRvbS5ieUlkKFwibW9kYWxCYWNrZ3JvdW5kXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbmNvbnN0IHN0YXRzRGlhbG9nID0gZG9tLmJ5SWQoXCJzdGF0c0RpYWxvZ1wiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5jb25zdCBpbnZlbnRvcnlEaWFsb2cgPSBkb20uYnlJZChcImludmVudG9yeURpYWxvZ1wiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5jb25zdCBjb250YWluZXJEaWFsb2cgPSBkb20uYnlJZChcImNvbnRhaW5lckRpYWxvZ1wiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5jb25zdCBpbnZlbnRvcnlUYWJsZSA9IGRvbS5ieUlkKFwiaW52ZW50b3J5VGFibGVcIikgYXMgSFRNTFRhYmxlRWxlbWVudFxyXG5jb25zdCBjb250YWluZXJUYWJsZSA9IGRvbS5ieUlkKFwiY29udGFpbmVyVGFibGVcIikgYXMgSFRNTFRhYmxlRWxlbWVudFxyXG5jb25zdCBpbnZlbnRvcnlJdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcImludmVudG9yeUl0ZW1UZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbmNvbnN0IGNvbnRhaW5lckl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwiY29udGFpbmVySXRlbVRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuXHJcbmVudW0gQ29tbWFuZFR5cGUge1xyXG4gICAgTW92ZSxcclxuICAgIEVxdWlwLFxyXG4gICAgVXNlLFxyXG4gICAgUGFzcyxcclxuICAgIE9wZW4sXHJcbiAgICBBdHRhY2ssXHJcbiAgICBDbGltYlVwLFxyXG4gICAgQ2xpbWJEb3duXHJcbn1cclxuXHJcbmludGVyZmFjZSBNb3ZlQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5Nb3ZlXHJcbiAgICBwb3NpdGlvbjogZ2VvLlBvaW50XHJcbn1cclxuXHJcbmludGVyZmFjZSBFcXVpcENvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuRXF1aXBcclxuICAgIGl0ZW06IHJsLkVxdWlwcGFibGVcclxufVxyXG5cclxuaW50ZXJmYWNlIFBhc3NDb21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLlBhc3NcclxufVxyXG5cclxuaW50ZXJmYWNlIFVzZUNvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuVXNlXHJcbiAgICBpdGVtOiBybC5Vc2FibGVcclxufVxyXG5cclxuaW50ZXJmYWNlIE9wZW5Db21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLk9wZW5cclxuICAgIGZpeHR1cmU6IHJsLkRvb3JcclxufVxyXG5cclxuaW50ZXJmYWNlIEF0dGFja0NvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuQXR0YWNrXHJcbiAgICBtb25zdGVyOiBybC5Nb25zdGVyXHJcbn1cclxuXHJcbmludGVyZmFjZSBDbGltYlVwQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5DbGltYlVwXHJcbn1cclxuXHJcbmludGVyZmFjZSBDbGltYkRvd25Db21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLkNsaW1iRG93blxyXG59XHJcblxyXG50eXBlIENvbW1hbmQgPSBNb3ZlQ29tbWFuZCB8IEVxdWlwQ29tbWFuZCB8IFBhc3NDb21tYW5kIHwgVXNlQ29tbWFuZCB8IE9wZW5Db21tYW5kIHwgQXR0YWNrQ29tbWFuZCB8IENsaW1iVXBDb21tYW5kIHwgQ2xpbWJEb3duQ29tbWFuZFxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVNYXAocGxheWVyOiBybC5QbGF5ZXIsIHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogUHJvbWlzZTxtYXBzLk1hcD4ge1xyXG4gICAgY29uc3QgbWFwID0gZ2VuLmdlbmVyYXRlTWFwKHdpZHRoLCBoZWlnaHQsIHBsYXllcilcclxuXHJcbiAgICAvLyBiYWtlIGFsbCAyNHgyNCB0aWxlIGltYWdlcyB0byBhIHNpbmdsZSBhcnJheSB0ZXh0dXJlXHJcbiAgICAvLyBzdG9yZSBtYXBwaW5nIGZyb20gaW1hZ2UgdXJsIHRvIGluZGV4XHJcbiAgICBsZXQgaW1hZ2VVcmxzOiBzdHJpbmdbXSA9IFtdXHJcbiAgICBpbWFnZVVybHMucHVzaCguLi5hcnJheS5tYXAobWFwLnRpbGVzLCB0ID0+IHQuaW1hZ2UpKVxyXG4gICAgaW1hZ2VVcmxzLnB1c2goLi4uYXJyYXkubWFwKG1hcC5maXh0dXJlcywgdCA9PiB0LmltYWdlKSlcclxuICAgIGltYWdlVXJscy5wdXNoKC4uLmFycmF5Lm1hcChtYXAubW9uc3RlcnMsIGMgPT4gYy5pbWFnZSkpXHJcbiAgICBpbWFnZVVybHMucHVzaChwbGF5ZXIuaW1hZ2UpXHJcbiAgICBpbWFnZVVybHMgPSBpbWFnZVVybHMuZmlsdGVyKHVybCA9PiB1cmwpXHJcbiAgICBpbWFnZVVybHMgPSBhcnJheS5kaXN0aW5jdChpbWFnZVVybHMpXHJcblxyXG4gICAgY29uc3QgbGF5ZXJNYXAgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPihpbWFnZVVybHMubWFwKCh1cmwsIGkpID0+IFt1cmwsIGldKSlcclxuICAgIGNvbnN0IGltYWdlcyA9IGF3YWl0IFByb21pc2UuYWxsKGltYWdlVXJscy5tYXAodXJsID0+IGRvbS5sb2FkSW1hZ2UodXJsKSkpXHJcbiAgICBjb25zdCB0ZXh0dXJlID0gcmVuZGVyZXIuYmFrZVRleHR1cmVBcnJheShybC50aWxlU2l6ZSwgcmwudGlsZVNpemUsIGltYWdlcylcclxuXHJcbiAgICBmb3IgKGNvbnN0IHRoIG9mIG1hcCkge1xyXG4gICAgICAgIGlmICghdGguaW1hZ2UpIHtcclxuICAgICAgICAgICAgdGgudGV4dHVyZUxheWVyID0gLTFcclxuICAgICAgICAgICAgdGgudGV4dHVyZSA9IG51bGxcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGxheWVyID0gbGF5ZXJNYXAuZ2V0KHRoLmltYWdlKVxyXG4gICAgICAgIGlmIChsYXllciA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdGV4dHVyZSBpbmRleCBub3QgZm91bmQgZm9yICR7dGguaW1hZ2V9YClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoLnRleHR1cmUgPSB0ZXh0dXJlXHJcbiAgICAgICAgdGgudGV4dHVyZUxheWVyID0gbGF5ZXJcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRpY2socmVuZGVyZXI6IGdmeC5SZW5kZXJlciwgaW5wOiBpbnB1dC5JbnB1dCwgbWFwOiBtYXBzLk1hcCkge1xyXG4gICAgY29uc3QgY21kID0gaGFuZGxlSW5wdXQobWFwLCBpbnApXHJcbiAgICBpZiAoY21kKSB7XHJcbiAgICAgICAgcHJvY2Vzc1R1cm4obWFwLCBjbWQpXHJcbiAgICB9XHJcblxyXG4gICAgZHJhd0ZyYW1lKHJlbmRlcmVyLCBtYXApXHJcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGljayhyZW5kZXJlciwgaW5wLCBtYXApKVxyXG59XHJcblxyXG5mdW5jdGlvbiBwcm9jZXNzVHVybihtYXA6IG1hcHMuTWFwLCBjbWQ6IENvbW1hbmQpIHtcclxuICAgIC8vIGZpbmQgY3JlYXR1cmUgd2l0aCBtYXggYWdpbGl0eVxyXG4gICAgLy8gZXZlcnlvbmUgbW92ZXMgcmVsYXRpdmUgdG8gdGhpcyByYXRlXHJcbiAgICAvLyBldmVyeW9uZSBnZXRzIG9uZSBhY3Rpb24gcG9pbnQgcGVyIHJvdW5kXHJcbiAgICAvLyBmYXN0ZXN0IGNyZWF0dXJlKHMpIHJlcXVpcmUgMSBhY3Rpb24gcG9pbnQgdG8gbW92ZVxyXG4gICAgLy8gdGhlIHJlc3QgcmVxdWlyZSBhbiBhbW91bnQgb2YgYWN0aW9uIHBvaW50cyBhY2NvcmRpbmcgdG8gdGhlaXIgcmF0aW8gd2l0aCB0aGUgZmFzdGVzdFxyXG4gICAgLy8gdGhpcyBhbGwgc2hvdWxkIGJlIHJlcGVhdGVkIHVudGlsIHBsYXllcidzIHR1cm4gaXMgcHJvY2Vzc2VkIGF0IHdoaWNoIHBvaW50IHdlIHNob3VsZCB3YWl0IGZvciBuZXh0IHBsYXllciBtb3ZlXHJcbiAgICBjb25zdCBjcmVhdHVyZXMgPSBhcnJheS5vcmRlckJ5RGVzYyhhcnJheS5hcHBlbmQ8cmwuQ3JlYXR1cmU+KG1hcC5tb25zdGVycywgbWFwLnBsYXllciksIG0gPT4gbS5hZ2lsaXR5KVxyXG4gICAgY29uc3QgbWF4QWdpbGl0eSA9IGNyZWF0dXJlcy5yZWR1Y2UoKHgsIHkpID0+IHguYWdpbGl0eSA8IHkuYWdpbGl0eSA/IHggOiB5KS5hZ2lsaXR5XHJcbiAgICBjb25zdCBhY3Rpb25QZXJSb3VuZCA9IDEgLyBtYXhBZ2lsaXR5XHJcbiAgICBsZXQgcGxheWVyTW92ZWQgPSBmYWxzZVxyXG5cclxuICAgIHdoaWxlICghcGxheWVyTW92ZWQpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IGNyZWF0dXJlIG9mIGNyZWF0dXJlcykge1xyXG4gICAgICAgICAgICBpZiAoY3JlYXR1cmUuYWN0aW9uIDwgMSkge1xyXG4gICAgICAgICAgICAgICAgY3JlYXR1cmUuYWN0aW9uICs9IGFjdGlvblBlclJvdW5kXHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjcmVhdHVyZS5hY3Rpb24gLT0gMVxyXG5cclxuICAgICAgICAgICAgaWYgKGNyZWF0dXJlIGluc3RhbmNlb2YgcmwuUGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICB0aWNrUGxheWVyKG1hcCwgY3JlYXR1cmUsIGNtZClcclxuICAgICAgICAgICAgICAgIHBsYXllck1vdmVkID0gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoY3JlYXR1cmUgaW5zdGFuY2VvZiBybC5Nb25zdGVyKSB7XHJcbiAgICAgICAgICAgICAgICB0aWNrTW9uc3RlcihtYXAsIGNyZWF0dXJlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTY3JvbGxPZmZzZXQocGxheWVyUG9zaXRpb246IGdlby5Qb2ludCk6IGdlby5Qb2ludCB7XHJcbiAgICAvLyBjb252ZXJ0IG1hcCBwb2ludCB0byBjYW52YXMgcG9pbnQsIG5vdGluZyB0aGF0IGNhbnZhcyBpcyBjZW50ZXJlZCBvbiBwbGF5ZXJcclxuICAgIGNvbnN0IGNhbnZhc0NlbnRlciA9IG5ldyBnZW8uUG9pbnQoY2FudmFzLndpZHRoIC8gMiwgY2FudmFzLmhlaWdodCAvIDIpXHJcbiAgICBjb25zdCBvZmZzZXQgPSBjYW52YXNDZW50ZXIuc3ViUG9pbnQocGxheWVyUG9zaXRpb24uYWRkU2NhbGFyKC41KS5tdWxTY2FsYXIocmwudGlsZVNpemUpKVxyXG4gICAgcmV0dXJuIG9mZnNldC5mbG9vcigpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbnZhc1RvTWFwUG9pbnQocGxheWVyUG9zaXRpb246IGdlby5Qb2ludCwgY3h5OiBnZW8uUG9pbnQpIHtcclxuICAgIGNvbnN0IHNjcm9sbE9mZnNldCA9IGdldFNjcm9sbE9mZnNldChwbGF5ZXJQb3NpdGlvbilcclxuICAgIGNvbnN0IG14eSA9IGN4eS5zdWJQb2ludChzY3JvbGxPZmZzZXQpLmRpdlNjYWxhcihybC50aWxlU2l6ZSlcclxuICAgIHJldHVybiBteHlcclxufVxyXG5cclxuZnVuY3Rpb24gbWFwVG9DYW52YXNQb2ludChwbGF5ZXJQb3NpdGlvbjogZ2VvLlBvaW50LCBteHk6IGdlby5Qb2ludCkge1xyXG4gICAgY29uc3Qgc2Nyb2xsT2Zmc2V0ID0gZ2V0U2Nyb2xsT2Zmc2V0KHBsYXllclBvc2l0aW9uKVxyXG4gICAgY29uc3QgY3h5ID0gbXh5Lm11bFNjYWxhcihybC50aWxlU2l6ZSkuYWRkUG9pbnQoc2Nyb2xsT2Zmc2V0KVxyXG4gICAgcmV0dXJuIGN4eVxyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVJbnB1dChtYXA6IG1hcHMuTWFwLCBpbnA6IGlucHV0LklucHV0KTogQ29tbWFuZCB8IG51bGwge1xyXG4gICAgY29uc3QgcGxheWVyID0gbWFwLnBsYXllclxyXG4gICAgaWYgKCFwbGF5ZXIucG9zaXRpb24pIHtcclxuICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHBvc2l0aW9uID0gcGxheWVyLnBvc2l0aW9uLmNsb25lKClcclxuXHJcbiAgICBpZiAoaW5wLm1vdXNlTGVmdFByZXNzZWQpIHtcclxuICAgICAgICAvLyBkZXRlcm1pbmUgdGhlIG1hcCBjb29yZGluYXRlcyB0aGUgdXNlciBjbGlja2VkIG9uXHJcbiAgICAgICAgY29uc3QgbXh5ID0gY2FudmFzVG9NYXBQb2ludChwbGF5ZXIucG9zaXRpb24sIG5ldyBnZW8uUG9pbnQoaW5wLm1vdXNlWCwgaW5wLm1vdXNlWSkpLmZsb29yKClcclxuXHJcbiAgICAgICAgY29uc3QgY2xpY2tGaXh0dXJlID0gbWFwLmZpeHR1cmVBdChteHkpXHJcbiAgICAgICAgaWYgKGNsaWNrRml4dHVyZSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke2NsaWNrRml4dHVyZS5uYW1lfWApXHJcbiAgICAgICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICAgICAgICAgIHJldHVybiBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjbGlja0NyZWF0dXJlID0gbWFwLm1vbnN0ZXJBdChteHkpXHJcbiAgICAgICAgaWYgKGNsaWNrQ3JlYXR1cmUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYFlvdSBzZWUgJHtjbGlja0NyZWF0dXJlLm5hbWV9YClcclxuICAgICAgICAgICAgaW5wLmZsdXNoKClcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGR4eSA9IG14eS5zdWJQb2ludChwbGF5ZXIucG9zaXRpb24pXHJcbiAgICAgICAgY29uc3Qgc2duID0gZHh5LnNpZ24oKVxyXG4gICAgICAgIGNvbnN0IGFicyA9IGR4eS5hYnMoKVxyXG5cclxuICAgICAgICBpZiAoYWJzLnggPiAwICYmIGFicy54ID49IGFicy55KSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnggKz0gc2duLnhcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChhYnMueSA+IDAgJiYgYWJzLnkgPiBhYnMueCkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbi55ICs9IHNnbi55XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGlucC5wcmVzc2VkKFwid1wiKSkge1xyXG4gICAgICAgIHBvc2l0aW9uLnkgLT0gMVxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJzXCIpKSB7XHJcbiAgICAgICAgcG9zaXRpb24ueSArPSAxXHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChpbnAucHJlc3NlZChcImFcIikpIHtcclxuICAgICAgICBwb3NpdGlvbi54IC09IDFcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGlucC5wcmVzc2VkKFwiZFwiKSkge1xyXG4gICAgICAgIHBvc2l0aW9uLnggKz0gMVxyXG4gICAgfSBlbHNlIGlmIChpbnAucHJlc3NlZChcInpcIikpIHtcclxuICAgICAgICBzaG93U3RhdHMocGxheWVyKVxyXG4gICAgfSBlbHNlIGlmIChpbnAucHJlc3NlZChcImlcIikpIHtcclxuICAgICAgICBzaG93SW52ZW50b3J5KHBsYXllcilcclxuICAgIH1cclxuXHJcbiAgICBpbnAuZmx1c2goKVxyXG5cclxuICAgIGlmIChwb3NpdGlvbi5lcXVhbChwbGF5ZXIucG9zaXRpb24pKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGxcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0aWxlID0gbWFwLnRpbGVBdChwb3NpdGlvbilcclxuICAgIGlmICh0aWxlICYmICF0aWxlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgb3V0cHV0LmluZm8oYENhbid0IG1vdmUgdGhhdCB3YXksIGJsb2NrZWQgYnkgJHt0aWxlLm5hbWV9YClcclxuICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGZpeHR1cmUgPSBtYXAuZml4dHVyZUF0KHBvc2l0aW9uKVxyXG4gICAgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5Eb29yKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdHlwZTogQ29tbWFuZFR5cGUuT3BlbixcclxuICAgICAgICAgICAgZml4dHVyZTogZml4dHVyZVxyXG4gICAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAoZml4dHVyZSBpbnN0YW5jZW9mIHJsLlN0YWlyc1VwKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogQ29tbWFuZFR5cGUuQ2xpbWJVcCB9XHJcbiAgICB9IGVsc2UgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5TdGFpcnNEb3duKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogQ29tbWFuZFR5cGUuQ2xpbWJEb3duIH1cclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGZpeHR1cmUgJiYgIWZpeHR1cmUucGFzc2FibGUpIHtcclxuICAgICAgICBvdXRwdXQuaW5mbyhgQ2FuJ3QgbW92ZSB0aGF0IHdheSwgYmxvY2tlZCBieSAke2ZpeHR1cmUubmFtZX1gKVxyXG4gICAgICAgIHJldHVybiBudWxsXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY29udGFpbmVyID0gbWFwLmNvbnRhaW5lckF0KHBvc2l0aW9uKVxyXG4gICAgaWYgKGNvbnRhaW5lcikge1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBtb25zdGVyID0gbWFwLm1vbnN0ZXJBdChwb3NpdGlvbilcclxuICAgIGlmIChtb25zdGVyICYmICFtb25zdGVyLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdHlwZTogQ29tbWFuZFR5cGUuQXR0YWNrLFxyXG4gICAgICAgICAgICBtb25zdGVyOiBtb25zdGVyXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgdHlwZTogQ29tbWFuZFR5cGUuTW92ZSxcclxuICAgICAgICBwb3NpdGlvbjogcG9zaXRpb25cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0ZyYW1lKHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIG1hcDogbWFwcy5NYXApIHtcclxuICAgIGNvbnN0IHBsYXllciA9IG1hcC5wbGF5ZXJcclxuICAgIGlmICghcGxheWVyLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaGFuZGxlUmVzaXplKHJlbmRlcmVyLmNhbnZhcylcclxuXHJcbiAgICAvLyBjZW50ZXIgdGhlIGdyaWQgYXJvdW5kIHRoZSBwbGF5ZXJkXHJcbiAgICBjb25zdCBvZmZzZXQgPSBnZXRTY3JvbGxPZmZzZXQocGxheWVyLnBvc2l0aW9uKVxyXG5cclxuICAgIC8vIG5vdGUgLSBkcmF3aW5nIG9yZGVyIG1hdHRlcnMgLSBkcmF3IGZyb20gYm90dG9tIHRvIHRvcFxyXG5cclxuICAgIC8vIGRyYXcgdmFyaW91cyBsYXllcnMgb2Ygc3ByaXRlc1xyXG4gICAgZm9yIChjb25zdCB0aWxlIG9mIG1hcC50aWxlcykge1xyXG4gICAgICAgIGRyYXdUaGluZyhyZW5kZXJlciwgb2Zmc2V0LCB0aWxlKVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgZml4dHVyZSBvZiBtYXAuZml4dHVyZXMpIHtcclxuICAgICAgICBkcmF3VGhpbmcocmVuZGVyZXIsIG9mZnNldCwgZml4dHVyZSlcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IGNyZWF0dXJlIG9mIG1hcC5tb25zdGVycykge1xyXG4gICAgICAgIGRyYXdUaGluZyhyZW5kZXJlciwgb2Zmc2V0LCBjcmVhdHVyZSlcclxuICAgIH1cclxuXHJcbiAgICBkcmF3VGhpbmcocmVuZGVyZXIsIG9mZnNldCwgcGxheWVyKVxyXG4gICAgZHJhd0hlYWx0aEJhcihyZW5kZXJlciwgcGxheWVyLCBvZmZzZXQpXHJcblxyXG4gICAgcmVuZGVyZXIuZmx1c2gocmwubGlnaHRSYWRpdXMgKiBybC50aWxlU2l6ZSlcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd1RoaW5nKHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIG9mZnNldDogZ2VvLlBvaW50LCB0aDogcmwuVGhpbmcpIHtcclxuICAgIC8vIGRvbid0IGRyYXcgdGhpbmdzIHRoYXQgYXJlbid0IHBvc2l0aW9uZWRcclxuICAgIGlmICghdGgucG9zaXRpb24pIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzcHJpdGVQb3NpdGlvbiA9IHRoLnBvc2l0aW9uLm11bFNjYWxhcihybC50aWxlU2l6ZSkuYWRkUG9pbnQob2Zmc2V0KVxyXG4gICAgY29uc3Qgc3ByaXRlID0gbmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgIHBvc2l0aW9uOiBzcHJpdGVQb3NpdGlvbixcclxuICAgICAgICBjb2xvcjogdGguY29sb3IsXHJcbiAgICAgICAgd2lkdGg6IHJsLnRpbGVTaXplLFxyXG4gICAgICAgIGhlaWdodDogcmwudGlsZVNpemUsXHJcbiAgICAgICAgdGV4dHVyZTogdGgudGV4dHVyZSxcclxuICAgICAgICBsYXllcjogdGgudGV4dHVyZUxheWVyLFxyXG4gICAgICAgIGZsYWdzOiBnZnguU3ByaXRlRmxhZ3MuTGl0IHwgZ2Z4LlNwcml0ZUZsYWdzLkFycmF5VGV4dHVyZSB8IGdmeC5TcHJpdGVGbGFncy5DYXN0c1NoYWRvd3NcclxuICAgIH0pXHJcblxyXG4gICAgcmVuZGVyZXIuZHJhd1Nwcml0ZShzcHJpdGUpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdIZWFsdGhCYXIocmVuZGVyZXI6IGdmeC5SZW5kZXJlciwgY3JlYXR1cmU6IHJsLkNyZWF0dXJlLCBvZmZzZXQ6IGdlby5Qb2ludCkge1xyXG4gICAgaWYgKCFjcmVhdHVyZS5wb3NpdGlvbikge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHdpZHRoID0gY3JlYXR1cmUubWF4SGVhbHRoICogNCArIDJcclxuICAgIGNvbnN0IHNwcml0ZVBvc2l0aW9uID0gY3JlYXR1cmUucG9zaXRpb24ubXVsU2NhbGFyKHJsLnRpbGVTaXplKS5hZGRQb2ludChvZmZzZXQpLnN1YlBvaW50KG5ldyBnZW8uUG9pbnQoMCwgcmwudGlsZVNpemUgLyAyKSlcclxuICAgIHJlbmRlcmVyLmRyYXdTcHJpdGUobmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgIHBvc2l0aW9uOiBzcHJpdGVQb3NpdGlvbixcclxuICAgICAgICBjb2xvcjogZ2Z4LkNvbG9yLndoaXRlLFxyXG4gICAgICAgIHdpZHRoOiB3aWR0aCxcclxuICAgICAgICBoZWlnaHQ6IDhcclxuICAgIH0pKVxyXG5cclxuICAgIHJlbmRlcmVyLmRyYXdTcHJpdGUobmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgIHBvc2l0aW9uOiBzcHJpdGVQb3NpdGlvbi5hZGRQb2ludChuZXcgZ2VvLlBvaW50KDEsIDEpKSxcclxuICAgICAgICBjb2xvcjogZ2Z4LkNvbG9yLnJlZCxcclxuICAgICAgICB3aWR0aDogd2lkdGggLSAyLFxyXG4gICAgICAgIGhlaWdodDogNlxyXG4gICAgfSkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZVJlc2l6ZShjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICBpZiAoY2FudmFzLndpZHRoID09PSBjYW52YXMuY2xpZW50V2lkdGggJiYgY2FudmFzLmhlaWdodCA9PT0gY2FudmFzLmNsaWVudEhlaWdodCkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgY2FudmFzLmhlaWdodCA9IGNhbnZhcy5jbGllbnRIZWlnaHRcclxufVxyXG5cclxuZnVuY3Rpb24gc2hvd0RpYWxvZyhkaWFsb2c6IEhUTUxEaXZFbGVtZW50KSB7XHJcbiAgICBtb2RhbEJhY2tncm91bmQuaGlkZGVuID0gZmFsc2VcclxuICAgIGRpYWxvZy5oaWRkZW4gPSBmYWxzZVxyXG4gICAgZGlhbG9nLmZvY3VzKClcclxufVxyXG5cclxuZnVuY3Rpb24gaGlkZURpYWxvZyhkaWFsb2c6IEhUTUxEaXZFbGVtZW50KSB7XHJcbiAgICBtb2RhbEJhY2tncm91bmQuaGlkZGVuID0gdHJ1ZVxyXG4gICAgZGlhbG9nLmhpZGRlbiA9IHRydWVcclxuICAgIGNhbnZhcy5mb2N1cygpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3dTdGF0cyhwbGF5ZXI6IHJsLlBsYXllcikge1xyXG4gICAgY29uc3QgaGVhbHRoU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNIZWFsdGhcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICBjb25zdCBhdHRhY2tTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0F0dGFja1wiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgIGNvbnN0IGRlZmVuc2VTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0RlZmVuc2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICBjb25zdCBhZ2lsaXR5U3BhbiA9IGRvbS5ieUlkKFwic3RhdHNBZ2lsaXR5XCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgY29uc3QgbGV2ZWxTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0xldmVsXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgY29uc3QgZXhwZXJpZW5jZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRXhwZXJpZW5jZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgIGNvbnN0IGV4cGVyaWVuY2VSZXF1aXJlbWVudCA9IHJsLmdldEV4cGVyaWVuY2VSZXF1aXJlbWVudChwbGF5ZXIubGV2ZWwgKyAxKVxyXG5cclxuICAgIGhlYWx0aFNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuaGVhbHRofSAvICR7cGxheWVyLm1heEhlYWx0aH1gXHJcbiAgICBhdHRhY2tTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmF0dGFja31gXHJcbiAgICBkZWZlbnNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5kZWZlbnNlfWBcclxuICAgIGFnaWxpdHlTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmFnaWxpdHl9YFxyXG4gICAgbGV2ZWxTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmxldmVsfWBcclxuICAgIGV4cGVyaWVuY2VTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmV4cGVyaWVuY2V9IC8gJHtleHBlcmllbmNlUmVxdWlyZW1lbnR9YFxyXG5cclxuICAgIHNob3dEaWFsb2coc3RhdHNEaWFsb2cpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRvZ2dsZVN0YXRzKHBsYXllcjogcmwuUGxheWVyKSB7XHJcbiAgICBpZiAoc3RhdHNEaWFsb2cuaGlkZGVuKSB7XHJcbiAgICAgICAgc2hvd1N0YXRzKHBsYXllcilcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaGlkZURpYWxvZyhzdGF0c0RpYWxvZylcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gc2hvd0ludmVudG9yeShwbGF5ZXI6IHJsLlBsYXllcikge1xyXG4gICAgY29uc3QgdGJvZHkgPSBpbnZlbnRvcnlUYWJsZS50Qm9kaWVzWzBdXHJcbiAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGJvZHkpXHJcblxyXG4gICAgY29uc3QgaXRlbXMgPSBnZXRTb3J0ZWRJbnZlbnRvcnlJdGVtcyhwbGF5ZXIpXHJcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcclxuICAgICAgICBjb25zdCBmcmFnbWVudCA9IGludmVudG9yeUl0ZW1UZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgY29uc3QgdHIgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaXRlbS1yb3dcIilcclxuICAgICAgICBjb25zdCBpdGVtTmFtZVRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0tbmFtZVwiKVxyXG4gICAgICAgIGNvbnN0IGVxdWlwQnV0dG9uID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLmludmVudG9yeS1lcXVpcC1idXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICBjb25zdCByZW1vdmVCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LXJlbW92ZS1idXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICBjb25zdCB1c2VCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LXVzZS1idXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuXHJcbiAgICAgICAgaXRlbU5hbWVUZC50ZXh0Q29udGVudCA9IGl0ZW0ubmFtZVxyXG4gICAgICAgIHVzZUJ1dHRvbi5oaWRkZW4gPSAhKGl0ZW0gaW5zdGFuY2VvZiBybC5Vc2FibGUpXHJcbiAgICAgICAgZXF1aXBCdXR0b24uaGlkZGVuID0gIXJsLmlzRXF1aXBwYWJsZShpdGVtKSB8fCBwbGF5ZXIuaXNFcXVpcHBlZChpdGVtKVxyXG4gICAgICAgIHJlbW92ZUJ1dHRvbi5oaWRkZW4gPSAhcGxheWVyLmlzRXF1aXBwZWQoaXRlbSlcclxuXHJcbiAgICAgICAgdGJvZHkuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICB9XHJcblxyXG4gICAgc2hvd0RpYWxvZyhpbnZlbnRvcnlEaWFsb2cpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFNvcnRlZEludmVudG9yeUl0ZW1zKHBsYXllcjogcmwuUGxheWVyKTogcmwuSXRlbVtdIHtcclxuICAgIGNvbnN0IGl0ZW1zID0gYXJyYXkub3JkZXJCeShwbGF5ZXIuaW52ZW50b3J5LCBpID0+IGkubmFtZSlcclxuICAgIHJldHVybiBpdGVtc1xyXG59XHJcblxyXG5mdW5jdGlvbiB0b2dnbGVJbnZlbnRvcnkocGxheWVyOiBybC5QbGF5ZXIpIHtcclxuICAgIGlmIChpbnZlbnRvcnlEaWFsb2cuaGlkZGVuKSB7XHJcbiAgICAgICAgc2hvd0ludmVudG9yeShwbGF5ZXIpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGhpZGVEaWFsb2coaW52ZW50b3J5RGlhbG9nKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0aWNrUGxheWVyKG1hcDogbWFwcy5NYXAsIHBsYXllcjogcmwuUGxheWVyLCBjbWQ6IENvbW1hbmQpIHtcclxuICAgIHN3aXRjaCAoY21kLnR5cGUpIHtcclxuICAgICAgICBjYXNlIENvbW1hbmRUeXBlLk9wZW46IHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oXCJEb29yIG9wZW5lZFwiKVxyXG4gICAgICAgICAgICBtYXAuZml4dHVyZXMuZGVsZXRlKGNtZC5maXh0dXJlKVxyXG4gICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5QYXNzOiB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKFwiUGFzc1wiKVxyXG4gICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5Nb3ZlOiB7XHJcbiAgICAgICAgICAgIHBsYXllci5wb3NpdGlvbiA9IGNtZC5wb3NpdGlvblxyXG4gICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5FcXVpcDoge1xyXG4gICAgICAgICAgICBvdXRwdXQuZXJyb3IoXCJFcXVpcCBub3QgeWV0IGltcGxlbWVudGVkXCIpXHJcbiAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICBjYXNlIENvbW1hbmRUeXBlLlVzZToge1xyXG4gICAgICAgICAgICBvdXRwdXQuZXJyb3IoXCJVc2Ugbm90IHlldCBpbXBsZW1lbnRlZFwiKVxyXG4gICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5BdHRhY2s6IHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiQXR0YWNrIG5vdCB5ZXQgaW1wbGVtZW50ZWRcIilcclxuICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuQ2xpbWJVcDoge1xyXG4gICAgICAgICAgICBvdXRwdXQuZXJyb3IoXCJDbGltYiB1cCBub3QgeWV0IGltcGxlbWVudGVkXCIpXHJcbiAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICBjYXNlIENvbW1hbmRUeXBlLkNsaW1iRG93bjoge1xyXG4gICAgICAgICAgICBvdXRwdXQuZXJyb3IoXCJDbGltYiBkb3duIHlldCBpbXBsZW1lbnRlZFwiKVxyXG4gICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdGlja01vbnN0ZXIobWFwOiBtYXBzLk1hcCwgbW9uc3RlcjogcmwuTW9uc3Rlcikge1xyXG4gICAgLy8gZGV0ZXJtaW5lIHdoZXRoZXIgbW9uc3RlciBjYW4gc2VlIHBsYXllclxyXG4gICAgaWYgKCFtb25zdGVyLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFtYXAucGxheWVyLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGNhblNlZShtYXAsIG1vbnN0ZXIucG9zaXRpb24sIG1hcC5wbGF5ZXIucG9zaXRpb24pICYmIG1vbnN0ZXIuc3RhdGUgIT09IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dybykge1xyXG4gICAgICAgIG91dHB1dC53YXJuaW5nKGAke21vbnN0ZXIubmFtZX0gaGFzIHNwb3R0ZWQgeW91IWApXHJcbiAgICAgICAgbW9uc3Rlci5zdGF0ZSA9IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dyb1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghY2FuU2VlKG1hcCwgbW9uc3Rlci5wb3NpdGlvbiwgbWFwLnBsYXllci5wb3NpdGlvbikgJiYgbW9uc3Rlci5zdGF0ZSA9PT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvKSB7XHJcbiAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7bW9uc3Rlci5uYW1lfSBoYXMgbG9zdCBzaWdodCBvZiB5b3UhYClcclxuICAgICAgICBtb25zdGVyLnN0YXRlID0gcmwuTW9uc3RlclN0YXRlLmlkbGVcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2FuU2VlKG1hcDogbWFwcy5NYXAsIGV5ZTogZ2VvLlBvaW50LCB0YXJnZXQ6IGdlby5Qb2ludCk6IGJvb2xlYW4ge1xyXG4gICAgZm9yIChjb25zdCBwdCBvZiBtYXJjaChleWUsIHRhcmdldCkpIHtcclxuICAgICAgICAvLyBpZ25vcmUgc3RhcnQgcG9pbnRcclxuICAgICAgICBpZiAocHQuZXF1YWwoZXllKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCB0aCBvZiBtYXAudGhpbmdzQXQocHQpKSB7XHJcbiAgICAgICAgICAgIGlmICghdGgudHJhbnNwYXJlbnQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uKiBtYXJjaChzdGFydDogZ2VvLlBvaW50LCBlbmQ6IGdlby5Qb2ludCk6IEdlbmVyYXRvcjxnZW8uUG9pbnQ+IHtcclxuICAgIGNvbnN0IGN1ciA9IHN0YXJ0LmNsb25lKClcclxuICAgIGNvbnN0IGR5ID0gTWF0aC5hYnMoZW5kLnkgLSBzdGFydC55KTtcclxuICAgIGNvbnN0IHN5ID0gc3RhcnQueSA8IGVuZC55ID8gMSA6IC0xO1xyXG4gICAgY29uc3QgZHggPSAtTWF0aC5hYnMoZW5kLnggLSBzdGFydC54KTtcclxuICAgIGNvbnN0IHN4ID0gc3RhcnQueCA8IGVuZC54ID8gMSA6IC0xO1xyXG4gICAgbGV0IGVyciA9IGR5ICsgZHg7XHJcblxyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICB5aWVsZCBjdXJcclxuXHJcbiAgICAgICAgaWYgKGN1ci5lcXVhbChlbmQpKSB7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZTIgPSAyICogZXJyO1xyXG4gICAgICAgIGlmIChlMiA+PSBkeCkge1xyXG4gICAgICAgICAgICBlcnIgKz0gZHg7XHJcbiAgICAgICAgICAgIGN1ci55ICs9IHN5O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUyIDw9IGR5KSB7XHJcbiAgICAgICAgICAgIGVyciArPSBkeTtcclxuICAgICAgICAgICAgY3VyLnggKz0gc3g7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xyXG4gICAgY29uc3QgcmVuZGVyZXIgPSBuZXcgZ2Z4LlJlbmRlcmVyKGNhbnZhcylcclxuXHJcbiAgICBjb25zdCBwbGF5ZXIgPSB0aGluZ3MucGxheWVyLmNsb25lKClcclxuICAgIHBsYXllci5pbnZlbnRvcnkuYWRkKHRoaW5ncy5zdGVlbFNoaWVsZC5jbG9uZSgpKVxyXG4gICAgcGxheWVyLmludmVudG9yeS5hZGQodGhpbmdzLnN0ZWVsU3dvcmQuY2xvbmUoKSlcclxuICAgIHBsYXllci5pbnZlbnRvcnkuYWRkKHRoaW5ncy5zdGVlbFBsYXRlQXJtb3IuY2xvbmUoKSlcclxuICAgIHBsYXllci5pbnZlbnRvcnkuYWRkKHRoaW5ncy53ZWFrSGVhbHRoUG90aW9uLmNsb25lKCkpXHJcbiAgICBwbGF5ZXIuaW52ZW50b3J5LmFkZCh0aGluZ3MuaGVhbHRoUG90aW9uLmNsb25lKCkpXHJcblxyXG4gICAgY29uc3QgbWFwID0gYXdhaXQgZ2VuZXJhdGVNYXAocGxheWVyLCByZW5kZXJlciwgNjQsIDY0KVxyXG4gICAgY29uc3QgaW5wID0gbmV3IGlucHV0LklucHV0KGNhbnZhcylcclxuXHJcbiAgICBpbml0U3RhdHNEaWFsb2cocGxheWVyKVxyXG4gICAgaW5pdEludmVudG9yeURpYWxvZyhwbGF5ZXIpXHJcbiAgICBpbml0Q29udGFpbmVyRGlhbG9nKHBsYXllcilcclxuXHJcbiAgICBvdXRwdXQud3JpdGUoXCJZb3VyIGFkdmVudHVyZSBiZWdpbnNcIilcclxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aWNrKHJlbmRlcmVyLCBpbnAsIG1hcCkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluaXRTdGF0c0RpYWxvZyhwbGF5ZXI6IHJsLlBsYXllcikge1xyXG4gICAgY29uc3Qgc3RhdHNCdXR0b24gPSBkb20uYnlJZChcInN0YXRzQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBjb25zdCBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwic3RhdHNDbG9zZUJ1dHRvblwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgc3RhdHNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRvZ2dsZVN0YXRzKHBsYXllcikpXHJcbiAgICBjbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gaGlkZURpYWxvZyhzdGF0c0RpYWxvZykpXHJcblxyXG4gICAgc3RhdHNEaWFsb2cuYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4ge1xyXG4gICAgICAgIGlmIChldi5rZXkudG9VcHBlckNhc2UoKSA9PT0gXCJaXCIpIHtcclxuICAgICAgICAgICAgaGlkZURpYWxvZyhzdGF0c0RpYWxvZylcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0SW52ZW50b3J5RGlhbG9nKHBsYXllcjogcmwuUGxheWVyKSB7XHJcbiAgICBjb25zdCBpbnZlbnRvcnlCdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgY29uc3QgY2xvc2VCdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeUNsb3NlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBpbnZlbnRvcnlCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRvZ2dsZUludmVudG9yeShwbGF5ZXIpKVxyXG4gICAgY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IGhpZGVEaWFsb2coaW52ZW50b3J5RGlhbG9nKSlcclxuXHJcbiAgICBpbnZlbnRvcnlEaWFsb2cuYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4ge1xyXG4gICAgICAgIGlmIChldi5rZXkudG9VcHBlckNhc2UoKSA9PT0gXCJJXCIpIHtcclxuICAgICAgICAgICAgaGlkZURpYWxvZyhpbnZlbnRvcnlEaWFsb2cpXHJcbiAgICAgICAgfVxyXG4gICAgfSlcclxuXHJcbiAgICBkb20uZGVsZWdhdGUoaW52ZW50b3J5RGlhbG9nLCBcImNsaWNrXCIsIFwiLmludmVudG9yeS1lcXVpcC1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgY29uc3QgYnRuID0gZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgocm93KVxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJbnZlbnRvcnlJdGVtcyhwbGF5ZXIpW2lkeF1cclxuICAgICAgICBpZiAoIWl0ZW0pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJsLmlzRXF1aXBwYWJsZShpdGVtKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGVxdWlwSXRlbShwbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgc2hvd0ludmVudG9yeShwbGF5ZXIpXHJcbiAgICB9KVxyXG5cclxuICAgIGRvbS5kZWxlZ2F0ZShpbnZlbnRvcnlEaWFsb2csIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LXJlbW92ZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgY29uc3QgYnRuID0gZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgocm93KVxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJbnZlbnRvcnlJdGVtcyhwbGF5ZXIpW2lkeF1cclxuICAgICAgICBpZiAoIWl0ZW0pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJsLmlzRXF1aXBwYWJsZShpdGVtKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghcGxheWVyLmlzRXF1aXBwZWQoaXRlbSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZW1vdmVJdGVtKHBsYXllciwgaXRlbSlcclxuICAgICAgICBzaG93SW52ZW50b3J5KHBsYXllcilcclxuICAgIH0pXHJcblxyXG4gICAgZG9tLmRlbGVnYXRlKGludmVudG9yeURpYWxvZywgXCJjbGlja1wiLCBcIi5pbnZlbnRvcnktdXNlLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICBjb25zdCBidG4gPSBldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICBjb25zdCByb3cgPSBidG4uY2xvc2VzdChcIi5pdGVtLXJvd1wiKSBhcyBIVE1MVGFibGVSb3dFbGVtZW50XHJcbiAgICAgICAgY29uc3QgaWR4ID0gZG9tLmdldEVsZW1lbnRJbmRleChyb3cpXHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEludmVudG9yeUl0ZW1zKHBsYXllcilbaWR4XVxyXG4gICAgICAgIGlmICghaXRlbSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghKGl0ZW0gaW5zdGFuY2VvZiBybC5Vc2FibGUpKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXNlSXRlbShwbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgc2hvd0ludmVudG9yeShwbGF5ZXIpXHJcbiAgICB9KVxyXG5cclxuICAgIGRvbS5kZWxlZ2F0ZShpbnZlbnRvcnlEaWFsb2csIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LWRyb3AtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgIGNvbnN0IGJ0biA9IGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IHJvdyA9IGJ0bi5jbG9zZXN0KFwiLml0ZW0tcm93XCIpIGFzIEhUTUxUYWJsZVJvd0VsZW1lbnRcclxuICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KHJvdylcclxuICAgICAgICBjb25zdCBpdGVtID0gZ2V0U29ydGVkSW52ZW50b3J5SXRlbXMocGxheWVyKVtpZHhdXHJcbiAgICAgICAgaWYgKCFpdGVtKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZHJvcEl0ZW0ocGxheWVyLCBpdGVtKVxyXG4gICAgICAgIHNob3dJbnZlbnRvcnkocGxheWVyKVxyXG4gICAgfSlcclxufVxyXG5cclxuZnVuY3Rpb24gZHJvcEl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkl0ZW0pOiB2b2lkIHtcclxuICAgIHBsYXllci5kZWxldGUoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gd2FzIGRyb3BwZWRgKVxyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5Vc2FibGUpOiB2b2lkIHtcclxuICAgIGNvbnN0IGFtb3VudCA9IE1hdGgubWluKGl0ZW0uaGVhbHRoLCBwbGF5ZXIubWF4SGVhbHRoIC0gcGxheWVyLmhlYWx0aClcclxuICAgIHBsYXllci5oZWFsdGggKz0gYW1vdW50XHJcbiAgICBwbGF5ZXIuZGVsZXRlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHJlc3RvcmVkICR7YW1vdW50fSBoZWFsdGhgKVxyXG59XHJcblxyXG5mdW5jdGlvbiBlcXVpcEl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkVxdWlwcGFibGUpOiB2b2lkIHtcclxuICAgIHBsYXllci5lcXVpcChpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSB3YXMgZXF1aXBwZWRgKVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5FcXVpcHBhYmxlKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIucmVtb3ZlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHdhcyByZW1vdmVkYClcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdENvbnRhaW5lckRpYWxvZyhwbGF5ZXI6IHJsLlBsYXllcikge1xyXG4gICAgY29uc3QgY2xvc2VCdXR0b24gPSBkb20uYnlJZChcImNvbnRhaW5lckNsb3NlQnV0dG9uXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBjbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gaGlkZURpYWxvZyhjb250YWluZXJEaWFsb2cpKVxyXG4gICAgY29uc3QgdGFrZUFsbEJ1dHRvbiA9IGRvbS5ieUlkKFwiY29udGFpbmVyVGFrZUFsbEJ1dHRvblwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgdGFrZUFsbEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGFrZUFsbChwbGF5ZXIpKVxyXG59XHJcblxyXG5mdW5jdGlvbiB0YWtlQWxsKHBsYXllcjogcmwuUGxheWVyKSB7XHJcbiAgICBoaWRlRGlhbG9nKGNvbnRhaW5lckRpYWxvZylcclxufVxyXG5cclxubWFpbigpIl19