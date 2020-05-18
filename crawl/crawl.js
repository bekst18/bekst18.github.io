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
class Dialog {
    constructor(elem, canvas) {
        this.elem = elem;
        this.canvas = canvas;
        this.modalBackground = dom.byId("modalBackground");
    }
    show() {
        this.modalBackground.hidden = false;
        this.elem.hidden = false;
        this.elem.focus();
    }
    hide() {
        this.modalBackground.hidden = true;
        this.elem.hidden = true;
        this.canvas.focus();
    }
    toggle() {
        if (this.elem.hidden) {
            this.show();
        }
        else {
            this.hide();
        }
    }
}
class StatsDialog extends Dialog {
    constructor(player, canvas) {
        super(dom.byId("statsDialog"), canvas);
        this.player = player;
        this.openButton = dom.byId("statsButton");
        this.closeButton = dom.byId("statsCloseButton");
        this.openButton.addEventListener("click", () => this.toggle());
        this.closeButton.addEventListener("click", () => this.hide());
        this.elem.addEventListener("keypress", (ev) => {
            if (ev.key.toUpperCase() === "Z") {
                this.hide();
            }
        });
    }
    show() {
        const healthSpan = dom.byId("statsHealth");
        const player = this.player;
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
        super.show();
    }
}
class InventoryDialog extends Dialog {
    constructor(player, canvas) {
        super(dom.byId("inventoryDialog"), canvas);
        this.player = player;
        this.openButton = dom.byId("inventoryButton");
        this.table = dom.byId("inventoryTable");
        this.itemTemplate = dom.byId("inventoryItemTemplate");
        this.closeButton = dom.byId("inventoryCloseButton");
        this.openButton.addEventListener("click", () => this.toggle());
        this.closeButton.addEventListener("click", () => this.hide());
        this.elem.addEventListener("keypress", (ev) => {
            if (ev.key.toUpperCase() === "I") {
                this.hide();
            }
        });
    }
    show() {
        this.refresh();
        super.show();
    }
    refresh() {
        const tbody = this.table.tBodies[0];
        dom.removeAllChildren(tbody);
        const items = getSortedItems(this.player.inventory);
        for (const item of items) {
            const fragment = this.itemTemplate.content.cloneNode(true);
            const tr = dom.bySelector(fragment, ".item-row");
            const itemNameTd = dom.bySelector(tr, ".item-name");
            const equipButton = dom.bySelector(tr, ".inventory-equip-button");
            const removeButton = dom.bySelector(tr, ".inventory-remove-button");
            const useButton = dom.bySelector(tr, ".inventory-use-button");
            itemNameTd.textContent = item.name;
            useButton.hidden = !(item instanceof rl.Usable);
            equipButton.hidden = !rl.isEquippable(item) || this.player.isEquipped(item);
            removeButton.hidden = !this.player.isEquipped(item);
            tbody.appendChild(fragment);
        }
    }
}
class ContainerDialog {
    constructor(player, canvas) {
        this.player = player;
        this.nameSpan = dom.byId("containerName");
        this.closeButton = dom.byId("containerCloseButton");
        this.takeAllButton = dom.byId("containerTakeAllButton");
        this.containerTable = dom.byId("containerTable");
        this.containerItemTemplate = dom.byId("containerItemTemplate");
        this.map = null;
        this.container = null;
        this.dialog = new Dialog(dom.byId("containerDialog"), canvas);
        this.player = player;
        this.closeButton.addEventListener("click", () => this.hide());
        this.takeAllButton.addEventListener("click", () => this.takeAll());
        dom.delegate(this.dialog.elem, "click", ".container-take-button", (ev) => {
            if (!this.container) {
                return;
            }
            const btn = ev.target;
            const row = btn.closest(".item-row");
            const idx = dom.getElementIndex(row);
            const item = getSortedItems(this.container.items)[idx];
            if (!item) {
                return;
            }
            this.container.items.delete(item);
            this.player.inventory.add(item);
            // hide if this was the last item
            if (this.container.items.size == 0) {
                this.hide();
            }
            else {
                this.refresh();
            }
        });
    }
    show(map, container) {
        this.map = map;
        this.container = container;
        this.nameSpan.textContent = this.container.name;
        this.refresh();
        this.dialog.show();
    }
    hide() {
        if (this.map && this.container) {
            this.map.containers.delete(this.container);
        }
        this.container = null;
        this.dialog.hide();
    }
    refresh() {
        const tbody = this.containerTable.tBodies[0];
        dom.removeAllChildren(tbody);
        if (!this.container) {
            return;
        }
        const items = getSortedItems(this.container.items);
        for (const item of items) {
            const fragment = this.containerItemTemplate.content.cloneNode(true);
            const tr = dom.bySelector(fragment, ".item-row");
            const itemNameTd = dom.bySelector(tr, ".item-name");
            itemNameTd.textContent = item.name;
            tbody.appendChild(fragment);
        }
    }
    takeAll() {
        if (!this.container) {
            return;
        }
        for (const item of this.container.items) {
            this.container.items.delete(item);
            this.player.inventory.add(item);
        }
        this.hide();
    }
}
function getSortedItems(items) {
    const sortedItems = array.orderBy(items, i => i.name);
    return sortedItems;
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
class App {
    constructor() {
        this.canvas = dom.byId("canvas");
        this.renderer = new gfx.Renderer(this.canvas);
        this.player = things.player.clone();
        this.inp = new input.Input(this.canvas);
        this.statsDialog = new StatsDialog(this.player, this.canvas);
        this.inventoryDialog = new InventoryDialog(this.player, this.canvas);
        this.containerDialog = new ContainerDialog(this.player, this.canvas);
        this.map = new maps.Map(0, 0, this.player);
        const player = this.player;
        player.agility = 9;
        player.inventory.add(things.healthPotion.clone());
    }
    async exec() {
        this.map = await gen.generateMap(this.player, this.renderer, 16, 16);
        if (!this.player.position) {
            throw new Error("Player is not positioned");
        }
        output.write("Your adventure begins");
        maps.updateVisibility(this.map, this.map.player.position, rl.lightRadius);
        requestAnimationFrame(() => this.tick());
    }
    tick() {
        const cmd = this.handleInput();
        if (cmd) {
            this.processTurn(cmd);
        }
        this.drawFrame();
        requestAnimationFrame(() => this.tick());
    }
    processTurn(cmd) {
        // find creature with max agility
        // everyone moves relative to this rate
        // everyone gets one action point per round
        // fastest creature(s) require 1 action point to move
        // the rest require an amount of action points according to their ratio with the fastest
        // this all should be repeated until player's turn is processed at which point we should wait for next player move
        const map = this.map;
        const creatures = array.orderByDesc(array.append(map.monsters, map.player), m => m.agility);
        const minAgility = creatures.reduce((x, y) => x.agility < y.agility ? x : y).agility;
        const maxAgility = creatures.reduce((x, y) => x.agility > y.agility ? x : y).agility;
        const offset = 1 - minAgility;
        const tickThreshold = maxAgility + offset;
        let playerMoved = false;
        while (!playerMoved) {
            for (const creature of creatures) {
                if (creature.action < tickThreshold) {
                    creature.action += creature.agility + offset;
                    continue;
                }
                creature.action -= tickThreshold;
                if (creature instanceof rl.Player) {
                    this.tickPlayer(cmd);
                    playerMoved = true;
                    break;
                }
                if (creature instanceof rl.Monster) {
                    this.tickMonster(creature);
                }
            }
        }
        maps.updateVisibility(map, map.player.position, rl.lightRadius);
    }
    getScrollOffset() {
        // convert map point to canvas point, noting that canvas is centered on player
        const playerPosition = this.player.position;
        const canvasCenter = new geo.Point(this.canvas.width / 2, this.canvas.height / 2);
        const offset = canvasCenter.subPoint(playerPosition.addScalar(.5).mulScalar(rl.tileSize));
        return offset.floor();
    }
    canvasToMapPoint(cxy) {
        const scrollOffset = this.getScrollOffset();
        const mxy = cxy.subPoint(scrollOffset).divScalar(rl.tileSize);
        return mxy;
    }
    mapToCanvasPoint(mxy) {
        const scrollOffset = this.getScrollOffset();
        const cxy = mxy.mulScalar(rl.tileSize).addPoint(scrollOffset);
        return cxy;
    }
    tickPlayer(cmd) {
        const player = this.player;
        switch (cmd.type) {
            case CommandType.Open:
                {
                    output.info("Door opened");
                    this.map.fixtures.delete(cmd.fixture);
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
    tickMonster(monster) {
        // determine whether monster can see player
        if (!monster.position) {
            return;
        }
        const map = this.map;
        if (!map.player.position) {
            return;
        }
        // aggro state
        if (monster.state !== rl.MonsterState.aggro && canSee(map, monster.position, map.player.position)) {
            monster.state = rl.MonsterState.aggro;
        }
        if (monster.state === rl.MonsterState.aggro && !canSee(map, monster.position, map.player.position)) {
            monster.state = rl.MonsterState.idle;
        }
        // if player is within range, attack
        // no aggro, done for now
        if (!rl.MonsterState.aggro) {
            return;
        }
        // aggro - seek and destroy
        const path = maps.findPath(map, monster.position, this.player.position);
        if (path.length === 0) {
            return;
        }
        const position = path[0];
        if (map.isPassable(position)) {
            monster.position = path[0];
        }
    }
    handleResize() {
        const canvas = this.canvas;
        if (canvas.width === canvas.clientWidth && canvas.height === canvas.clientHeight) {
            return;
        }
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    handleInput() {
        const map = this.map;
        const player = this.player;
        const inp = this.inp;
        if (!player.position) {
            return null;
        }
        const position = player.position.clone();
        if (inp.mouseLeftPressed) {
            // determine the map coordinates the user clicked on
            const mxy = this.canvasToMapPoint(new geo.Point(inp.mouseX, inp.mouseY)).floor();
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
            this.statsDialog.show();
        }
        else if (inp.pressed("i")) {
            this.inventoryDialog.show();
        }
        inp.flush();
        if (position.equal(player.position)) {
            return null;
        }
        const tile = map.tileAt(position);
        if (tile && !tile.passable) {
            output.info(`Blocked by ${tile.name}`);
            return null;
        }
        const container = map.containerAt(position);
        if (container) {
            this.containerDialog.show(map, container);
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
    drawFrame() {
        this.handleResize();
        // center the grid around the playerd
        const offset = this.getScrollOffset();
        // note - drawing order matters - draw from bottom to top
        // draw various layers of sprites
        const map = this.map;
        for (const tile of map.tiles) {
            this.drawThing(offset, tile);
        }
        for (const fixture of map.fixtures) {
            this.drawThing(offset, fixture);
        }
        for (const container of map.containers) {
            this.drawThing(offset, container);
        }
        for (const creature of map.monsters) {
            this.drawThing(offset, creature);
        }
        this.drawThing(offset, this.player);
        this.drawHealthBar(offset, this.player);
        this.renderer.flush();
    }
    drawThing(offset, th) {
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
        this.renderer.drawSprite(sprite);
    }
    drawHealthBar(offset, creature) {
        if (!creature.position) {
            return;
        }
        const width = creature.maxHealth * 4 + 2;
        const spritePosition = creature.position.mulScalar(rl.tileSize).addPoint(offset).subPoint(new geo.Point(0, rl.tileSize / 2));
        this.renderer.drawSprite(new gfx.Sprite({
            position: spritePosition,
            color: gfx.Color.white,
            width: width,
            height: 8
        }));
        this.renderer.drawSprite(new gfx.Sprite({
            position: spritePosition.addPoint(new geo.Point(1, 1)),
            color: gfx.Color.red,
            width: width - 2,
            height: 6
        }));
    }
}
async function init() {
    const app = new App();
    await app.exec();
}
init();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBRWpDLElBQUssV0FTSjtBQVRELFdBQUssV0FBVztJQUNaLDZDQUFJLENBQUE7SUFDSiwrQ0FBSyxDQUFBO0lBQ0wsMkNBQUcsQ0FBQTtJQUNILDZDQUFJLENBQUE7SUFDSiw2Q0FBSSxDQUFBO0lBQ0osaURBQU0sQ0FBQTtJQUNOLG1EQUFPLENBQUE7SUFDUCx1REFBUyxDQUFBO0FBQ2IsQ0FBQyxFQVRJLFdBQVcsS0FBWCxXQUFXLFFBU2Y7QUF5Q0QsTUFBTSxNQUFNO0lBRVIsWUFBNEIsSUFBaUIsRUFBbUIsTUFBeUI7UUFBN0QsU0FBSSxHQUFKLElBQUksQ0FBYTtRQUFtQixXQUFNLEdBQU4sTUFBTSxDQUFtQjtRQUR4RSxvQkFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQW1CLENBQUE7SUFDYSxDQUFDO0lBRTlGLElBQUk7UUFDQSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxN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Q0FBQyxTQUFTLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN4QyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1SCxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUM7WUFDcEMsUUFBUSxFQUFFLGNBQWM7WUFDeEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSztZQUN0QixLQUFLLEVBQUUsS0FBSztZQUNaLE1BQU0sRUFBRSxDQUFDO1NBQ1osQ0FBQyxDQUFDLENBQUE7UUFFSCxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUM7WUFDcEMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0RCxLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHO1lBQ3BCLEtBQUssRUFBRSxLQUFLLEdBQUcsQ0FBQztZQUNoQixNQUFNLEVBQUUsQ0FBQztTQUNaLENBQUMsQ0FBQyxDQUFBO0lBQ1AsQ0FBQztDQUNKO0FBRUQsS0FBSyxVQUFVLElBQUk7SUFDZixNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFBO0lBQ3JCLE1BQU0sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFBO0FBQ3BCLENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuaW1wb3J0ICogYXMgZ2VuIGZyb20gXCIuL2dlbi5qc1wiXHJcbmltcG9ydCAqIGFzIGlucHV0IGZyb20gXCIuLi9zaGFyZWQvaW5wdXQuanNcIlxyXG5pbXBvcnQgKiBhcyBybCBmcm9tIFwiLi9ybC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgb3V0cHV0IGZyb20gXCIuL291dHB1dC5qc1wiXHJcbmltcG9ydCAqIGFzIHRoaW5ncyBmcm9tIFwiLi90aGluZ3MuanNcIlxyXG5pbXBvcnQgKiBhcyBtYXBzIGZyb20gXCIuL21hcHMuanNcIlxyXG5cclxuZW51bSBDb21tYW5kVHlwZSB7XHJcbiAgICBNb3ZlLFxyXG4gICAgRXF1aXAsXHJcbiAgICBVc2UsXHJcbiAgICBQYXNzLFxyXG4gICAgT3BlbixcclxuICAgIEF0dGFjayxcclxuICAgIENsaW1iVXAsXHJcbiAgICBDbGltYkRvd25cclxufVxyXG5cclxuaW50ZXJmYWNlIE1vdmVDb21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLk1vdmVcclxuICAgIHBvc2l0aW9uOiBnZW8uUG9pbnRcclxufVxyXG5cclxuaW50ZXJmYWNlIEVxdWlwQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5FcXVpcFxyXG4gICAgaXRlbTogcmwuRXF1aXBwYWJsZVxyXG59XHJcblxyXG5pbnRlcmZhY2UgUGFzc0NvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuUGFzc1xyXG59XHJcblxyXG5pbnRlcmZhY2UgVXNlQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5Vc2VcclxuICAgIGl0ZW06IHJsLlVzYWJsZVxyXG59XHJcblxyXG5pbnRlcmZhY2UgT3BlbkNvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuT3BlblxyXG4gICAgZml4dHVyZTogcmwuRG9vclxyXG59XHJcblxyXG5pbnRlcmZhY2UgQXR0YWNrQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5BdHRhY2tcclxuICAgIG1vbnN0ZXI6IHJsLk1vbnN0ZXJcclxufVxyXG5cclxuaW50ZXJmYWNlIENsaW1iVXBDb21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLkNsaW1iVXBcclxufVxyXG5cclxuaW50ZXJmYWNlIENsaW1iRG93bkNvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuQ2xpbWJEb3duXHJcbn1cclxuXHJcbnR5cGUgQ29tbWFuZCA9IE1vdmVDb21tYW5kIHwgRXF1aXBDb21tYW5kIHwgUGFzc0NvbW1hbmQgfCBVc2VDb21tYW5kIHwgT3BlbkNvbW1hbmQgfCBBdHRhY2tDb21tYW5kIHwgQ2xpbWJVcENvbW1hbmQgfCBDbGltYkRvd25Db21tYW5kXHJcblxyXG5jbGFzcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtb2RhbEJhY2tncm91bmQgPSBkb20uYnlJZChcIm1vZGFsQmFja2dyb3VuZFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGVsZW06IEhUTUxFbGVtZW50LCBwcml2YXRlIHJlYWRvbmx5IGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHsgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5tb2RhbEJhY2tncm91bmQuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmVsZW0uaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmVsZW0uZm9jdXMoKVxyXG4gICAgfVxyXG5cclxuICAgIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5tb2RhbEJhY2tncm91bmQuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuZWxlbS5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgdGhpcy5jYW52YXMuZm9jdXMoKVxyXG4gICAgfVxyXG5cclxuICAgIHRvZ2dsZSgpIHtcclxuICAgICAgICBpZiAodGhpcy5lbGVtLmhpZGRlbikge1xyXG4gICAgICAgICAgICB0aGlzLnNob3coKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuY2xhc3MgU3RhdHNEaWFsb2cgZXh0ZW5kcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBvcGVuQnV0dG9uID0gZG9tLmJ5SWQoXCJzdGF0c0J1dHRvblwiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwic3RhdHNDbG9zZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXIsIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICBzdXBlcihkb20uYnlJZChcInN0YXRzRGlhbG9nXCIpLCBjYW52YXMpXHJcblxyXG4gICAgICAgIHRoaXMub3BlbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy50b2dnbGUoKSlcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuXHJcbiAgICAgICAgdGhpcy5lbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgaWYgKGV2LmtleS50b1VwcGVyQ2FzZSgpID09PSBcIlpcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICBjb25zdCBoZWFsdGhTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0hlYWx0aFwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLnBsYXllclxyXG4gICAgICAgIGNvbnN0IGF0dGFja1NwYW4gPSBkb20uYnlJZChcInN0YXRzQXR0YWNrXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGRlZmVuc2VTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0RlZmVuc2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgYWdpbGl0eVNwYW4gPSBkb20uYnlJZChcInN0YXRzQWdpbGl0eVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBsZXZlbFNwYW4gPSBkb20uYnlJZChcInN0YXRzTGV2ZWxcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZXhwZXJpZW5jZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRXhwZXJpZW5jZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBleHBlcmllbmNlUmVxdWlyZW1lbnQgPSBybC5nZXRFeHBlcmllbmNlUmVxdWlyZW1lbnQocGxheWVyLmxldmVsICsgMSlcclxuXHJcbiAgICAgICAgaGVhbHRoU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5oZWFsdGh9IC8gJHtwbGF5ZXIubWF4SGVhbHRofWBcclxuICAgICAgICBhdHRhY2tTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmF0dGFja31gXHJcbiAgICAgICAgZGVmZW5zZVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuZGVmZW5zZX1gXHJcbiAgICAgICAgYWdpbGl0eVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuYWdpbGl0eX1gXHJcbiAgICAgICAgbGV2ZWxTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmxldmVsfWBcclxuICAgICAgICBleHBlcmllbmNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5leHBlcmllbmNlfSAvICR7ZXhwZXJpZW5jZVJlcXVpcmVtZW50fWBcclxuXHJcbiAgICAgICAgc3VwZXIuc2hvdygpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEludmVudG9yeURpYWxvZyBleHRlbmRzIERpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wZW5CdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeUJ1dHRvblwiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0YWJsZSA9IGRvbS5ieUlkKFwiaW52ZW50b3J5VGFibGVcIikgYXMgSFRNTFRhYmxlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcImludmVudG9yeUl0ZW1UZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNsb3NlQnV0dG9uID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlDbG9zZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXIsIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICBzdXBlcihkb20uYnlJZChcImludmVudG9yeURpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgICAgIHRoaXMub3BlbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy50b2dnbGUoKSlcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuXHJcbiAgICAgICAgdGhpcy5lbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgaWYgKGV2LmtleS50b1VwcGVyQ2FzZSgpID09PSBcIklcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIHN1cGVyLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIHJlZnJlc2goKSB7XHJcbiAgICAgICAgY29uc3QgdGJvZHkgPSB0aGlzLnRhYmxlLnRCb2RpZXNbMF1cclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGJvZHkpXHJcblxyXG4gICAgICAgIGNvbnN0IGl0ZW1zID0gZ2V0U29ydGVkSXRlbXModGhpcy5wbGF5ZXIuaW52ZW50b3J5KVxyXG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMuaXRlbVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgdHIgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLW5hbWVcIilcclxuICAgICAgICAgICAgY29uc3QgZXF1aXBCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LWVxdWlwLWJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCByZW1vdmVCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LXJlbW92ZS1idXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3QgdXNlQnV0dG9uID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLmludmVudG9yeS11c2UtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcblxyXG4gICAgICAgICAgICBpdGVtTmFtZVRkLnRleHRDb250ZW50ID0gaXRlbS5uYW1lXHJcbiAgICAgICAgICAgIHVzZUJ1dHRvbi5oaWRkZW4gPSAhKGl0ZW0gaW5zdGFuY2VvZiBybC5Vc2FibGUpXHJcbiAgICAgICAgICAgIGVxdWlwQnV0dG9uLmhpZGRlbiA9ICFybC5pc0VxdWlwcGFibGUoaXRlbSkgfHwgdGhpcy5wbGF5ZXIuaXNFcXVpcHBlZChpdGVtKVxyXG4gICAgICAgICAgICByZW1vdmVCdXR0b24uaGlkZGVuID0gIXRoaXMucGxheWVyLmlzRXF1aXBwZWQoaXRlbSlcclxuXHJcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQ29udGFpbmVyRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGlhbG9nOiBEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbmFtZVNwYW4gPSBkb20uYnlJZChcImNvbnRhaW5lck5hbWVcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNsb3NlQnV0dG9uID0gZG9tLmJ5SWQoXCJjb250YWluZXJDbG9zZUJ1dHRvblwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0YWtlQWxsQnV0dG9uID0gZG9tLmJ5SWQoXCJjb250YWluZXJUYWtlQWxsQnV0dG9uXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lclRhYmxlID0gZG9tLmJ5SWQoXCJjb250YWluZXJUYWJsZVwiKSBhcyBIVE1MVGFibGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lckl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwiY29udGFpbmVySXRlbVRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHByaXZhdGUgbWFwOiBtYXBzLk1hcCB8IG51bGwgPSBudWxsXHJcbiAgICBwcml2YXRlIGNvbnRhaW5lcjogcmwuQ29udGFpbmVyIHwgbnVsbCA9IG51bGxcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyLCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cgPSBuZXcgRGlhbG9nKGRvbS5ieUlkKFwiY29udGFpbmVyRGlhbG9nXCIpLCBjYW52YXMpXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIgPSBwbGF5ZXJcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuICAgICAgICB0aGlzLnRha2VBbGxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMudGFrZUFsbCgpKVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5kaWFsb2cuZWxlbSwgXCJjbGlja1wiLCBcIi5jb250YWluZXItdGFrZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBidG4gPSBldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KHJvdylcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEl0ZW1zKHRoaXMuY29udGFpbmVyLml0ZW1zKVtpZHhdXHJcbiAgICAgICAgICAgIGlmICghaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLml0ZW1zLmRlbGV0ZShpdGVtKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXllci5pbnZlbnRvcnkuYWRkKGl0ZW0pXHJcblxyXG4gICAgICAgICAgICAvLyBoaWRlIGlmIHRoaXMgd2FzIHRoZSBsYXN0IGl0ZW1cclxuICAgICAgICAgICAgaWYgKHRoaXMuY29udGFpbmVyLml0ZW1zLnNpemUgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHNob3cobWFwOiBtYXBzLk1hcCwgY29udGFpbmVyOiBybC5Db250YWluZXIpIHtcclxuICAgICAgICB0aGlzLm1hcCA9IG1hcFxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyXHJcbiAgICAgICAgdGhpcy5uYW1lU3Bhbi50ZXh0Q29udGVudCA9IHRoaXMuY29udGFpbmVyLm5hbWVcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIHRoaXMuZGlhbG9nLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIGhpZGUoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMubWFwICYmIHRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmNvbnRhaW5lcnMuZGVsZXRlKHRoaXMuY29udGFpbmVyKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIgPSBudWxsXHJcbiAgICAgICAgdGhpcy5kaWFsb2cuaGlkZSgpXHJcbiAgICB9XHJcblxyXG4gICAgcmVmcmVzaCgpIHtcclxuICAgICAgICBjb25zdCB0Ym9keSA9IHRoaXMuY29udGFpbmVyVGFibGUudEJvZGllc1swXVxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0Ym9keSlcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGl0ZW1zID0gZ2V0U29ydGVkSXRlbXModGhpcy5jb250YWluZXIuaXRlbXMpXHJcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy5jb250YWluZXJJdGVtVGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCB0ciA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5pdGVtLXJvd1wiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtTmFtZVRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0tbmFtZVwiKVxyXG4gICAgICAgICAgICBpdGVtTmFtZVRkLnRleHRDb250ZW50ID0gaXRlbS5uYW1lXHJcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0YWtlQWxsKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5jb250YWluZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5jb250YWluZXIuaXRlbXMpIHtcclxuICAgICAgICAgICAgdGhpcy5jb250YWluZXIuaXRlbXMuZGVsZXRlKGl0ZW0pXHJcbiAgICAgICAgICAgIHRoaXMucGxheWVyLmludmVudG9yeS5hZGQoaXRlbSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFNvcnRlZEl0ZW1zKGl0ZW1zOiBJdGVyYWJsZTxybC5JdGVtPik6IHJsLkl0ZW1bXSB7XHJcbiAgICBjb25zdCBzb3J0ZWRJdGVtcyA9IGFycmF5Lm9yZGVyQnkoaXRlbXMsIGkgPT4gaS5uYW1lKVxyXG4gICAgcmV0dXJuIHNvcnRlZEl0ZW1zXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhblNlZShtYXA6IG1hcHMuTWFwLCBleWU6IGdlby5Qb2ludCwgdGFyZ2V0OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgIGZvciAoY29uc3QgcHQgb2YgbWFyY2goZXllLCB0YXJnZXQpKSB7XHJcbiAgICAgICAgLy8gaWdub3JlIHN0YXJ0IHBvaW50XHJcbiAgICAgICAgaWYgKHB0LmVxdWFsKGV5ZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgdGggb2YgbWFwLmF0KHB0KSkge1xyXG4gICAgICAgICAgICBpZiAoIXRoLnRyYW5zcGFyZW50KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiogbWFyY2goc3RhcnQ6IGdlby5Qb2ludCwgZW5kOiBnZW8uUG9pbnQpOiBHZW5lcmF0b3I8Z2VvLlBvaW50PiB7XHJcbiAgICBjb25zdCBjdXIgPSBzdGFydC5jbG9uZSgpXHJcbiAgICBjb25zdCBkeSA9IE1hdGguYWJzKGVuZC55IC0gc3RhcnQueSk7XHJcbiAgICBjb25zdCBzeSA9IHN0YXJ0LnkgPCBlbmQueSA/IDEgOiAtMTtcclxuICAgIGNvbnN0IGR4ID0gLU1hdGguYWJzKGVuZC54IC0gc3RhcnQueCk7XHJcbiAgICBjb25zdCBzeCA9IHN0YXJ0LnggPCBlbmQueCA/IDEgOiAtMTtcclxuICAgIGxldCBlcnIgPSBkeSArIGR4O1xyXG5cclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgeWllbGQgY3VyXHJcblxyXG4gICAgICAgIGlmIChjdXIuZXF1YWwoZW5kKSkge1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGUyID0gMiAqIGVycjtcclxuICAgICAgICBpZiAoZTIgPj0gZHgpIHtcclxuICAgICAgICAgICAgZXJyICs9IGR4O1xyXG4gICAgICAgICAgICBjdXIueSArPSBzeTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlMiA8PSBkeSkge1xyXG4gICAgICAgICAgICBlcnIgKz0gZHk7XHJcbiAgICAgICAgICAgIGN1ci54ICs9IHN4O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZHJvcEl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkl0ZW0pOiB2b2lkIHtcclxuICAgIHBsYXllci5kZWxldGUoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gd2FzIGRyb3BwZWRgKVxyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5Vc2FibGUpOiB2b2lkIHtcclxuICAgIGNvbnN0IGFtb3VudCA9IE1hdGgubWluKGl0ZW0uaGVhbHRoLCBwbGF5ZXIubWF4SGVhbHRoIC0gcGxheWVyLmhlYWx0aClcclxuICAgIHBsYXllci5oZWFsdGggKz0gYW1vdW50XHJcbiAgICBwbGF5ZXIuZGVsZXRlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHJlc3RvcmVkICR7YW1vdW50fSBoZWFsdGhgKVxyXG59XHJcblxyXG5mdW5jdGlvbiBlcXVpcEl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkVxdWlwcGFibGUpOiB2b2lkIHtcclxuICAgIHBsYXllci5lcXVpcChpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSB3YXMgZXF1aXBwZWRgKVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5FcXVpcHBhYmxlKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIucmVtb3ZlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHdhcyByZW1vdmVkYClcclxufVxyXG5cclxuY2xhc3MgQXBwIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FudmFzID0gZG9tLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmVuZGVyZXIgPSBuZXcgZ2Z4LlJlbmRlcmVyKHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciA9IHRoaW5ncy5wbGF5ZXIuY2xvbmUoKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbnA6IGlucHV0LklucHV0ID0gbmV3IGlucHV0LklucHV0KHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdGF0c0RpYWxvZyA9IG5ldyBTdGF0c0RpYWxvZyh0aGlzLnBsYXllciwgdGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGludmVudG9yeURpYWxvZyA9IG5ldyBJbnZlbnRvcnlEaWFsb2codGhpcy5wbGF5ZXIsIHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXJEaWFsb2cgPSBuZXcgQ29udGFpbmVyRGlhbG9nKHRoaXMucGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgIHByaXZhdGUgbWFwOiBtYXBzLk1hcCA9IG5ldyBtYXBzLk1hcCgwLCAwLCB0aGlzLnBsYXllcilcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLnBsYXllclxyXG4gICAgICAgIHBsYXllci5hZ2lsaXR5ID0gOVxyXG4gICAgICAgIHBsYXllci5pbnZlbnRvcnkuYWRkKHRoaW5ncy5oZWFsdGhQb3Rpb24uY2xvbmUoKSlcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjKCkge1xyXG4gICAgICAgIHRoaXMubWFwID0gYXdhaXQgZ2VuLmdlbmVyYXRlTWFwKHRoaXMucGxheWVyLCB0aGlzLnJlbmRlcmVyLCAxNiwgMTYpXHJcbiAgICAgICAgaWYgKCF0aGlzLnBsYXllci5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQbGF5ZXIgaXMgbm90IHBvc2l0aW9uZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG91dHB1dC53cml0ZShcIllvdXIgYWR2ZW50dXJlIGJlZ2luc1wiKVxyXG4gICAgICAgIG1hcHMudXBkYXRlVmlzaWJpbGl0eSh0aGlzLm1hcCwgdGhpcy5tYXAucGxheWVyLnBvc2l0aW9uLCBybC5saWdodFJhZGl1cylcclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy50aWNrKCkpXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHRpY2soKSB7XHJcbiAgICAgICAgY29uc3QgY21kID0gdGhpcy5oYW5kbGVJbnB1dCgpXHJcbiAgICAgICAgaWYgKGNtZCkge1xyXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NUdXJuKGNtZClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZHJhd0ZyYW1lKClcclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy50aWNrKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc1R1cm4oY21kOiBDb21tYW5kKSB7XHJcbiAgICAgICAgLy8gZmluZCBjcmVhdHVyZSB3aXRoIG1heCBhZ2lsaXR5XHJcbiAgICAgICAgLy8gZXZlcnlvbmUgbW92ZXMgcmVsYXRpdmUgdG8gdGhpcyByYXRlXHJcbiAgICAgICAgLy8gZXZlcnlvbmUgZ2V0cyBvbmUgYWN0aW9uIHBvaW50IHBlciByb3VuZFxyXG4gICAgICAgIC8vIGZhc3Rlc3QgY3JlYXR1cmUocykgcmVxdWlyZSAxIGFjdGlvbiBwb2ludCB0byBtb3ZlXHJcbiAgICAgICAgLy8gdGhlIHJlc3QgcmVxdWlyZSBhbiBhbW91bnQgb2YgYWN0aW9uIHBvaW50cyBhY2NvcmRpbmcgdG8gdGhlaXIgcmF0aW8gd2l0aCB0aGUgZmFzdGVzdFxyXG4gICAgICAgIC8vIHRoaXMgYWxsIHNob3VsZCBiZSByZXBlYXRlZCB1bnRpbCBwbGF5ZXIncyB0dXJuIGlzIHByb2Nlc3NlZCBhdCB3aGljaCBwb2ludCB3ZSBzaG91bGQgd2FpdCBmb3IgbmV4dCBwbGF5ZXIgbW92ZVxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgY29uc3QgY3JlYXR1cmVzID0gYXJyYXkub3JkZXJCeURlc2MoYXJyYXkuYXBwZW5kPHJsLkNyZWF0dXJlPihtYXAubW9uc3RlcnMsIG1hcC5wbGF5ZXIpLCBtID0+IG0uYWdpbGl0eSlcclxuICAgICAgICBjb25zdCBtaW5BZ2lsaXR5ID0gY3JlYXR1cmVzLnJlZHVjZSgoeCwgeSkgPT4geC5hZ2lsaXR5IDwgeS5hZ2lsaXR5ID8geCA6IHkpLmFnaWxpdHlcclxuICAgICAgICBjb25zdCBtYXhBZ2lsaXR5ID0gY3JlYXR1cmVzLnJlZHVjZSgoeCwgeSkgPT4geC5hZ2lsaXR5ID4geS5hZ2lsaXR5ID8geCA6IHkpLmFnaWxpdHlcclxuICAgICAgICBjb25zdCBvZmZzZXQgPSAxIC0gbWluQWdpbGl0eVxyXG4gICAgICAgIGNvbnN0IHRpY2tUaHJlc2hvbGQgPSBtYXhBZ2lsaXR5ICsgb2Zmc2V0XHJcblxyXG4gICAgICAgIGxldCBwbGF5ZXJNb3ZlZCA9IGZhbHNlXHJcblxyXG4gICAgICAgIHdoaWxlICghcGxheWVyTW92ZWQpIHtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBjcmVhdHVyZSBvZiBjcmVhdHVyZXMpIHtcclxuICAgICAgICAgICAgICAgIGlmIChjcmVhdHVyZS5hY3Rpb24gPCB0aWNrVGhyZXNob2xkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXR1cmUuYWN0aW9uICs9IGNyZWF0dXJlLmFnaWxpdHkgKyBvZmZzZXRcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNyZWF0dXJlLmFjdGlvbiAtPSB0aWNrVGhyZXNob2xkXHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGNyZWF0dXJlIGluc3RhbmNlb2YgcmwuUGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aWNrUGxheWVyKGNtZClcclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXJNb3ZlZCA9IHRydWVcclxuICAgICAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChjcmVhdHVyZSBpbnN0YW5jZW9mIHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpY2tNb25zdGVyKGNyZWF0dXJlKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtYXBzLnVwZGF0ZVZpc2liaWxpdHkobWFwLCBtYXAucGxheWVyLnBvc2l0aW9uLCBybC5saWdodFJhZGl1cylcclxuICAgIH1cclxuXHJcbiAgICBnZXRTY3JvbGxPZmZzZXQoKTogZ2VvLlBvaW50IHtcclxuICAgICAgICAvLyBjb252ZXJ0IG1hcCBwb2ludCB0byBjYW52YXMgcG9pbnQsIG5vdGluZyB0aGF0IGNhbnZhcyBpcyBjZW50ZXJlZCBvbiBwbGF5ZXJcclxuICAgICAgICBjb25zdCBwbGF5ZXJQb3NpdGlvbiA9IHRoaXMucGxheWVyLnBvc2l0aW9uXHJcbiAgICAgICAgY29uc3QgY2FudmFzQ2VudGVyID0gbmV3IGdlby5Qb2ludCh0aGlzLmNhbnZhcy53aWR0aCAvIDIsIHRoaXMuY2FudmFzLmhlaWdodCAvIDIpXHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gY2FudmFzQ2VudGVyLnN1YlBvaW50KHBsYXllclBvc2l0aW9uLmFkZFNjYWxhciguNSkubXVsU2NhbGFyKHJsLnRpbGVTaXplKSlcclxuICAgICAgICByZXR1cm4gb2Zmc2V0LmZsb29yKClcclxuICAgIH1cclxuXHJcbiAgICBjYW52YXNUb01hcFBvaW50KGN4eTogZ2VvLlBvaW50KSB7XHJcbiAgICAgICAgY29uc3Qgc2Nyb2xsT2Zmc2V0ID0gdGhpcy5nZXRTY3JvbGxPZmZzZXQoKVxyXG4gICAgICAgIGNvbnN0IG14eSA9IGN4eS5zdWJQb2ludChzY3JvbGxPZmZzZXQpLmRpdlNjYWxhcihybC50aWxlU2l6ZSlcclxuICAgICAgICByZXR1cm4gbXh5XHJcbiAgICB9XHJcblxyXG4gICAgbWFwVG9DYW52YXNQb2ludChteHk6IGdlby5Qb2ludCkge1xyXG4gICAgICAgIGNvbnN0IHNjcm9sbE9mZnNldCA9IHRoaXMuZ2V0U2Nyb2xsT2Zmc2V0KClcclxuICAgICAgICBjb25zdCBjeHkgPSBteHkubXVsU2NhbGFyKHJsLnRpbGVTaXplKS5hZGRQb2ludChzY3JvbGxPZmZzZXQpXHJcbiAgICAgICAgcmV0dXJuIGN4eVxyXG4gICAgfVxyXG5cclxuICAgIHRpY2tQbGF5ZXIoY21kOiBDb21tYW5kKSB7XHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5wbGF5ZXJcclxuICAgICAgICBzd2l0Y2ggKGNtZC50eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuT3Blbjoge1xyXG4gICAgICAgICAgICAgICAgb3V0cHV0LmluZm8oXCJEb29yIG9wZW5lZFwiKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5tYXAuZml4dHVyZXMuZGVsZXRlKGNtZC5maXh0dXJlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5QYXNzOiB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQuaW5mbyhcIlBhc3NcIilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuTW92ZToge1xyXG4gICAgICAgICAgICAgICAgcGxheWVyLnBvc2l0aW9uID0gY21kLnBvc2l0aW9uXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIENvbW1hbmRUeXBlLkVxdWlwOiB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQuZXJyb3IoXCJFcXVpcCBub3QgeWV0IGltcGxlbWVudGVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIENvbW1hbmRUeXBlLlVzZToge1xyXG4gICAgICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiVXNlIG5vdCB5ZXQgaW1wbGVtZW50ZWRcIilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuQXR0YWNrOiB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQuZXJyb3IoXCJBdHRhY2sgbm90IHlldCBpbXBsZW1lbnRlZFwiKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5DbGltYlVwOiB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQuZXJyb3IoXCJDbGltYiB1cCBub3QgeWV0IGltcGxlbWVudGVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIENvbW1hbmRUeXBlLkNsaW1iRG93bjoge1xyXG4gICAgICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiQ2xpbWIgZG93biB5ZXQgaW1wbGVtZW50ZWRcIilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGlja01vbnN0ZXIobW9uc3RlcjogcmwuTW9uc3Rlcikge1xyXG4gICAgICAgIC8vIGRldGVybWluZSB3aGV0aGVyIG1vbnN0ZXIgY2FuIHNlZSBwbGF5ZXJcclxuICAgICAgICBpZiAoIW1vbnN0ZXIucG9zaXRpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGlmICghbWFwLnBsYXllci5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFnZ3JvIHN0YXRlXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIuc3RhdGUgIT09IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dybyAmJiBjYW5TZWUobWFwLCBtb25zdGVyLnBvc2l0aW9uLCBtYXAucGxheWVyLnBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICBtb25zdGVyLnN0YXRlID0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobW9uc3Rlci5zdGF0ZSA9PT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvICYmICFjYW5TZWUobWFwLCBtb25zdGVyLnBvc2l0aW9uLCBtYXAucGxheWVyLnBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICBtb25zdGVyLnN0YXRlID0gcmwuTW9uc3RlclN0YXRlLmlkbGVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGlmIHBsYXllciBpcyB3aXRoaW4gcmFuZ2UsIGF0dGFja1xyXG5cclxuICAgICAgICAvLyBubyBhZ2dybywgZG9uZSBmb3Igbm93XHJcbiAgICAgICAgaWYgKCFybC5Nb25zdGVyU3RhdGUuYWdncm8pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhZ2dybyAtIHNlZWsgYW5kIGRlc3Ryb3lcclxuICAgICAgICBjb25zdCBwYXRoID0gbWFwcy5maW5kUGF0aChtYXAsIG1vbnN0ZXIucG9zaXRpb24sIHRoaXMucGxheWVyLnBvc2l0aW9uKVxyXG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gcGF0aFswXVxyXG4gICAgICAgIGlmIChtYXAuaXNQYXNzYWJsZShwb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgbW9uc3Rlci5wb3NpdGlvbiA9IHBhdGhbMF1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaGFuZGxlUmVzaXplKCkge1xyXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IHRoaXMuY2FudmFzXHJcbiAgICAgICAgaWYgKGNhbnZhcy53aWR0aCA9PT0gY2FudmFzLmNsaWVudFdpZHRoICYmIGNhbnZhcy5oZWlnaHQgPT09IGNhbnZhcy5jbGllbnRIZWlnaHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYW52YXMud2lkdGggPSBjYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgfVxyXG5cclxuICAgIGhhbmRsZUlucHV0KCk6IENvbW1hbmQgfCBudWxsIHtcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgY29uc3QgaW5wID0gdGhpcy5pbnBcclxuXHJcbiAgICAgICAgaWYgKCFwbGF5ZXIucG9zaXRpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gcGxheWVyLnBvc2l0aW9uLmNsb25lKClcclxuXHJcbiAgICAgICAgaWYgKGlucC5tb3VzZUxlZnRQcmVzc2VkKSB7XHJcbiAgICAgICAgICAgIC8vIGRldGVybWluZSB0aGUgbWFwIGNvb3JkaW5hdGVzIHRoZSB1c2VyIGNsaWNrZWQgb25cclxuICAgICAgICAgICAgY29uc3QgbXh5ID0gdGhpcy5jYW52YXNUb01hcFBvaW50KG5ldyBnZW8uUG9pbnQoaW5wLm1vdXNlWCwgaW5wLm1vdXNlWSkpLmZsb29yKClcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNsaWNrRml4dHVyZSA9IG1hcC5maXh0dXJlQXQobXh5KVxyXG4gICAgICAgICAgICBpZiAoY2xpY2tGaXh0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke2NsaWNrRml4dHVyZS5uYW1lfWApXHJcbiAgICAgICAgICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgY2xpY2tDcmVhdHVyZSA9IG1hcC5tb25zdGVyQXQobXh5KVxyXG4gICAgICAgICAgICBpZiAoY2xpY2tDcmVhdHVyZSkge1xyXG4gICAgICAgICAgICAgICAgb3V0cHV0LmluZm8oYFlvdSBzZWUgJHtjbGlja0NyZWF0dXJlLm5hbWV9YClcclxuICAgICAgICAgICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBkeHkgPSBteHkuc3ViUG9pbnQocGxheWVyLnBvc2l0aW9uKVxyXG4gICAgICAgICAgICBjb25zdCBzZ24gPSBkeHkuc2lnbigpXHJcbiAgICAgICAgICAgIGNvbnN0IGFicyA9IGR4eS5hYnMoKVxyXG5cclxuICAgICAgICAgICAgaWYgKGFicy54ID4gMCAmJiBhYnMueCA+PSBhYnMueSkge1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb24ueCArPSBzZ24ueFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYWJzLnkgPiAwICYmIGFicy55ID4gYWJzLngpIHtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uLnkgKz0gc2duLnlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJ3XCIpKSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnkgLT0gMVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChpbnAucHJlc3NlZChcInNcIikpIHtcclxuICAgICAgICAgICAgcG9zaXRpb24ueSArPSAxXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGlucC5wcmVzc2VkKFwiYVwiKSkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbi54IC09IDFcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJkXCIpKSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnggKz0gMVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJ6XCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdHNEaWFsb2cuc2hvdygpXHJcbiAgICAgICAgfSBlbHNlIGlmIChpbnAucHJlc3NlZChcImlcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnZlbnRvcnlEaWFsb2cuc2hvdygpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpbnAuZmx1c2goKVxyXG5cclxuICAgICAgICBpZiAocG9zaXRpb24uZXF1YWwocGxheWVyLnBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdGlsZSA9IG1hcC50aWxlQXQocG9zaXRpb24pXHJcbiAgICAgICAgaWYgKHRpbGUgJiYgIXRpbGUucGFzc2FibGUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYEJsb2NrZWQgYnkgJHt0aWxlLm5hbWV9YClcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IG1hcC5jb250YWluZXJBdChwb3NpdGlvbilcclxuICAgICAgICBpZiAoY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyRGlhbG9nLnNob3cobWFwLCBjb250YWluZXIpXHJcbiAgICAgICAgICAgIHJldHVybiBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmaXh0dXJlID0gbWFwLmZpeHR1cmVBdChwb3NpdGlvbilcclxuICAgICAgICBpZiAoZml4dHVyZSBpbnN0YW5jZW9mIHJsLkRvb3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IENvbW1hbmRUeXBlLk9wZW4sXHJcbiAgICAgICAgICAgICAgICBmaXh0dXJlOiBmaXh0dXJlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5TdGFpcnNVcCkge1xyXG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiBDb21tYW5kVHlwZS5DbGltYlVwIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5TdGFpcnNEb3duKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IENvbW1hbmRUeXBlLkNsaW1iRG93biB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChmaXh0dXJlICYmICFmaXh0dXJlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBDYW4ndCBtb3ZlIHRoYXQgd2F5LCBibG9ja2VkIGJ5ICR7Zml4dHVyZS5uYW1lfWApXHJcbiAgICAgICAgICAgIHJldHVybiBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtb25zdGVyID0gbWFwLm1vbnN0ZXJBdChwb3NpdGlvbilcclxuICAgICAgICBpZiAobW9uc3RlciAmJiAhbW9uc3Rlci5wYXNzYWJsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogQ29tbWFuZFR5cGUuQXR0YWNrLFxyXG4gICAgICAgICAgICAgICAgbW9uc3RlcjogbW9uc3RlclxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0eXBlOiBDb21tYW5kVHlwZS5Nb3ZlLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb25cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZHJhd0ZyYW1lKCkge1xyXG4gICAgICAgIHRoaXMuaGFuZGxlUmVzaXplKClcclxuXHJcbiAgICAgICAgLy8gY2VudGVyIHRoZSBncmlkIGFyb3VuZCB0aGUgcGxheWVyZFxyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHRoaXMuZ2V0U2Nyb2xsT2Zmc2V0KClcclxuXHJcbiAgICAgICAgLy8gbm90ZSAtIGRyYXdpbmcgb3JkZXIgbWF0dGVycyAtIGRyYXcgZnJvbSBib3R0b20gdG8gdG9wXHJcblxyXG4gICAgICAgIC8vIGRyYXcgdmFyaW91cyBsYXllcnMgb2Ygc3ByaXRlc1xyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgZm9yIChjb25zdCB0aWxlIG9mIG1hcC50aWxlcykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIHRpbGUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGZpeHR1cmUgb2YgbWFwLmZpeHR1cmVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgZml4dHVyZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgY29udGFpbmVyIG9mIG1hcC5jb250YWluZXJzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgY29udGFpbmVyKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBjcmVhdHVyZSBvZiBtYXAubW9uc3RlcnMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCBjcmVhdHVyZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgdGhpcy5wbGF5ZXIpXHJcbiAgICAgICAgdGhpcy5kcmF3SGVhbHRoQmFyKG9mZnNldCwgdGhpcy5wbGF5ZXIpXHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZmx1c2goKVxyXG4gICAgfVxyXG5cclxuICAgIGRyYXdUaGluZyhvZmZzZXQ6IGdlby5Qb2ludCwgdGg6IHJsLlRoaW5nKSB7XHJcbiAgICAgICAgLy8gZG9uJ3QgZHJhdyB0aGluZ3MgdGhhdCBhcmVuJ3QgcG9zaXRpb25lZFxyXG4gICAgICAgIGlmICghdGgucG9zaXRpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGgudmlzaWJsZSA9PT0gcmwuVmlzaWJpbGl0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29sb3IgPSB0aC5jb2xvci5jbG9uZSgpXHJcbiAgICAgICAgaWYgKHRoLnZpc2libGUgPT09IHJsLlZpc2liaWxpdHkuRm9nKSB7XHJcbiAgICAgICAgICAgIGNvbG9yLmEgPSAuNVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc3ByaXRlUG9zaXRpb24gPSB0aC5wb3NpdGlvbi5tdWxTY2FsYXIocmwudGlsZVNpemUpLmFkZFBvaW50KG9mZnNldClcclxuICAgICAgICBjb25zdCBzcHJpdGUgPSBuZXcgZ2Z4LlNwcml0ZSh7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBzcHJpdGVQb3NpdGlvbixcclxuICAgICAgICAgICAgY29sb3I6IGNvbG9yLFxyXG4gICAgICAgICAgICB3aWR0aDogcmwudGlsZVNpemUsXHJcbiAgICAgICAgICAgIGhlaWdodDogcmwudGlsZVNpemUsXHJcbiAgICAgICAgICAgIHRleHR1cmU6IHRoLnRleHR1cmUsXHJcbiAgICAgICAgICAgIGxheWVyOiB0aC50ZXh0dXJlTGF5ZXIsXHJcbiAgICAgICAgICAgIGZsYWdzOiBnZnguU3ByaXRlRmxhZ3MuQXJyYXlUZXh0dXJlXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3U3ByaXRlKHNwcml0ZSlcclxuICAgIH1cclxuXHJcbiAgICBkcmF3SGVhbHRoQmFyKG9mZnNldDogZ2VvLlBvaW50LCBjcmVhdHVyZTogcmwuQ3JlYXR1cmUpIHtcclxuICAgICAgICBpZiAoIWNyZWF0dXJlLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgd2lkdGggPSBjcmVhdHVyZS5tYXhIZWFsdGggKiA0ICsgMlxyXG4gICAgICAgIGNvbnN0IHNwcml0ZVBvc2l0aW9uID0gY3JlYXR1cmUucG9zaXRpb24ubXVsU2NhbGFyKHJsLnRpbGVTaXplKS5hZGRQb2ludChvZmZzZXQpLnN1YlBvaW50KG5ldyBnZW8uUG9pbnQoMCwgcmwudGlsZVNpemUgLyAyKSlcclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdTcHJpdGUobmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24sXHJcbiAgICAgICAgICAgIGNvbG9yOiBnZnguQ29sb3Iud2hpdGUsXHJcbiAgICAgICAgICAgIHdpZHRoOiB3aWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0OiA4XHJcbiAgICAgICAgfSkpXHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd1Nwcml0ZShuZXcgZ2Z4LlNwcml0ZSh7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBzcHJpdGVQb3NpdGlvbi5hZGRQb2ludChuZXcgZ2VvLlBvaW50KDEsIDEpKSxcclxuICAgICAgICAgICAgY29sb3I6IGdmeC5Db2xvci5yZWQsXHJcbiAgICAgICAgICAgIHdpZHRoOiB3aWR0aCAtIDIsXHJcbiAgICAgICAgICAgIGhlaWdodDogNlxyXG4gICAgICAgIH0pKVxyXG4gICAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBpbml0KCkge1xyXG4gICAgY29uc3QgYXBwID0gbmV3IEFwcCgpXHJcbiAgICBhd2FpdCBhcHAuZXhlYygpXHJcbn1cclxuXHJcbmluaXQoKSJdfQ==