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
        player.inventory.add(things.healthPotion.clone());
    }
    async exec() {
        this.map = await gen.generateMap(this.player, this.renderer, 64, 64);
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
                    this.tickPlayer(cmd);
                    playerMoved = true;
                }
                if (creature instanceof rl.Monster) {
                    this.tickMonster(creature);
                }
            }
            if (map.player.position) {
                maps.updateVisibility(map, map.player.position, rl.lightRadius);
            }
        }
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
        if (canSee(map, monster.position, map.player.position) && monster.state !== rl.MonsterState.aggro) {
            output.warning(`${monster.name} has spotted you!`);
            monster.state = rl.MonsterState.aggro;
        }
        if (!canSee(map, monster.position, map.player.position) && monster.state === rl.MonsterState.aggro) {
            output.warning(`${monster.name} has lost sight of you!`);
            monster.state = rl.MonsterState.idle;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBRWpDLElBQUssV0FTSjtBQVRELFdBQUssV0FBVztJQUNaLDZDQUFJLENBQUE7SUFDSiwrQ0FBSyxDQUFBO0lBQ0wsMkNBQUcsQ0FBQTtJQUNILDZDQUFJLENBQUE7SUFDSiw2Q0FBSSxDQUFBO0lBQ0osaURBQU0sQ0FBQTtJQUNOLG1EQUFPLENBQUE7SUFDUCx1REFBUyxDQUFBO0FBQ2IsQ0FBQyxFQVRJLFdBQVcsS0FBWCxXQUFXLFFBU2Y7QUF5Q0QsTUFBTSxNQUFNO0lBRVIsWUFBNEIsSUFBaUIsRUFBbUIsTUFBeUI7UUFBN0QsU0FBSSxHQUFKLElBQUksQ0FBYTtRQUFtQixXQUFNLEdBQU4sTUFBTSxDQUFtQjtRQUR4RSxvQkFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQW1CLENBQUE7SUFDYSxDQUFDO0lBRTlGLElBQUk7UUFDQSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxN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Q0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RELEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUc7WUFDcEIsS0FBSyxFQUFFLEtBQUssR0FBRyxDQUFDO1lBQ2hCLE1BQU0sRUFBRSxDQUFDO1NBQ1osQ0FBQyxDQUFDLENBQUE7SUFDUCxDQUFDO0NBQ0o7QUFFRCxLQUFLLFVBQVUsSUFBSTtJQUNmLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7SUFDckIsTUFBTSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUE7QUFDcEIsQ0FBQztBQUVELElBQUksRUFBRSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiXHJcbmltcG9ydCAqIGFzIGdmeCBmcm9tIFwiLi9nZnguanNcIlxyXG5pbXBvcnQgKiBhcyBnZW4gZnJvbSBcIi4vZ2VuLmpzXCJcclxuaW1wb3J0ICogYXMgaW5wdXQgZnJvbSBcIi4uL3NoYXJlZC9pbnB1dC5qc1wiXHJcbmltcG9ydCAqIGFzIHJsIGZyb20gXCIuL3JsLmpzXCJcclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvMmQuanNcIlxyXG5pbXBvcnQgKiBhcyBvdXRwdXQgZnJvbSBcIi4vb3V0cHV0LmpzXCJcclxuaW1wb3J0ICogYXMgdGhpbmdzIGZyb20gXCIuL3RoaW5ncy5qc1wiXHJcbmltcG9ydCAqIGFzIG1hcHMgZnJvbSBcIi4vbWFwcy5qc1wiXHJcblxyXG5lbnVtIENvbW1hbmRUeXBlIHtcclxuICAgIE1vdmUsXHJcbiAgICBFcXVpcCxcclxuICAgIFVzZSxcclxuICAgIFBhc3MsXHJcbiAgICBPcGVuLFxyXG4gICAgQXR0YWNrLFxyXG4gICAgQ2xpbWJVcCxcclxuICAgIENsaW1iRG93blxyXG59XHJcblxyXG5pbnRlcmZhY2UgTW92ZUNvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuTW92ZVxyXG4gICAgcG9zaXRpb246IGdlby5Qb2ludFxyXG59XHJcblxyXG5pbnRlcmZhY2UgRXF1aXBDb21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLkVxdWlwXHJcbiAgICBpdGVtOiBybC5FcXVpcHBhYmxlXHJcbn1cclxuXHJcbmludGVyZmFjZSBQYXNzQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5QYXNzXHJcbn1cclxuXHJcbmludGVyZmFjZSBVc2VDb21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLlVzZVxyXG4gICAgaXRlbTogcmwuVXNhYmxlXHJcbn1cclxuXHJcbmludGVyZmFjZSBPcGVuQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5PcGVuXHJcbiAgICBmaXh0dXJlOiBybC5Eb29yXHJcbn1cclxuXHJcbmludGVyZmFjZSBBdHRhY2tDb21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLkF0dGFja1xyXG4gICAgbW9uc3RlcjogcmwuTW9uc3RlclxyXG59XHJcblxyXG5pbnRlcmZhY2UgQ2xpbWJVcENvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuQ2xpbWJVcFxyXG59XHJcblxyXG5pbnRlcmZhY2UgQ2xpbWJEb3duQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5DbGltYkRvd25cclxufVxyXG5cclxudHlwZSBDb21tYW5kID0gTW92ZUNvbW1hbmQgfCBFcXVpcENvbW1hbmQgfCBQYXNzQ29tbWFuZCB8IFVzZUNvbW1hbmQgfCBPcGVuQ29tbWFuZCB8IEF0dGFja0NvbW1hbmQgfCBDbGltYlVwQ29tbWFuZCB8IENsaW1iRG93bkNvbW1hbmRcclxuXHJcbmNsYXNzIERpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1vZGFsQmFja2dyb3VuZCA9IGRvbS5ieUlkKFwibW9kYWxCYWNrZ3JvdW5kXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgZWxlbTogSFRNTEVsZW1lbnQsIHByaXZhdGUgcmVhZG9ubHkgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkgeyB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICB0aGlzLm1vZGFsQmFja2dyb3VuZC5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuZWxlbS5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuZWxlbS5mb2N1cygpXHJcbiAgICB9XHJcblxyXG4gICAgaGlkZSgpIHtcclxuICAgICAgICB0aGlzLm1vZGFsQmFja2dyb3VuZC5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgdGhpcy5lbGVtLmhpZGRlbiA9IHRydWVcclxuICAgICAgICB0aGlzLmNhbnZhcy5mb2N1cygpXHJcbiAgICB9XHJcblxyXG4gICAgdG9nZ2xlKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmVsZW0uaGlkZGVuKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvdygpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5jbGFzcyBTdGF0c0RpYWxvZyBleHRlbmRzIERpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wZW5CdXR0b24gPSBkb20uYnlJZChcInN0YXRzQnV0dG9uXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNsb3NlQnV0dG9uID0gZG9tLmJ5SWQoXCJzdGF0c0Nsb3NlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHN1cGVyKGRvbS5ieUlkKFwic3RhdHNEaWFsb2dcIiksIGNhbnZhcylcclxuXHJcbiAgICAgICAgdGhpcy5vcGVuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnRvZ2dsZSgpKVxyXG4gICAgICAgIHRoaXMuY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuaGlkZSgpKVxyXG5cclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZXYua2V5LnRvVXBwZXJDYXNlKCkgPT09IFwiWlwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIGNvbnN0IGhlYWx0aFNwYW4gPSBkb20uYnlJZChcInN0YXRzSGVhbHRoXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgY29uc3QgYXR0YWNrU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNBdHRhY2tcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZGVmZW5zZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRGVmZW5zZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBhZ2lsaXR5U3BhbiA9IGRvbS5ieUlkKFwic3RhdHNBZ2lsaXR5XCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGxldmVsU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNMZXZlbFwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBleHBlcmllbmNlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNFeHBlcmllbmNlXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGV4cGVyaWVuY2VSZXF1aXJlbWVudCA9IHJsLmdldEV4cGVyaWVuY2VSZXF1aXJlbWVudChwbGF5ZXIubGV2ZWwgKyAxKVxyXG5cclxuICAgICAgICBoZWFsdGhTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmhlYWx0aH0gLyAke3BsYXllci5tYXhIZWFsdGh9YFxyXG4gICAgICAgIGF0dGFja1NwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuYXR0YWNrfWBcclxuICAgICAgICBkZWZlbnNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5kZWZlbnNlfWBcclxuICAgICAgICBhZ2lsaXR5U3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5hZ2lsaXR5fWBcclxuICAgICAgICBsZXZlbFNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIubGV2ZWx9YFxyXG4gICAgICAgIGV4cGVyaWVuY2VTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmV4cGVyaWVuY2V9IC8gJHtleHBlcmllbmNlUmVxdWlyZW1lbnR9YFxyXG5cclxuICAgICAgICBzdXBlci5zaG93KClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgSW52ZW50b3J5RGlhbG9nIGV4dGVuZHMgRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgb3BlbkJ1dHRvbiA9IGRvbS5ieUlkKFwiaW52ZW50b3J5QnV0dG9uXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRhYmxlID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlUYWJsZVwiKSBhcyBIVE1MVGFibGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwiaW52ZW50b3J5SXRlbVRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2xvc2VCdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeUNsb3NlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHN1cGVyKGRvbS5ieUlkKFwiaW52ZW50b3J5RGlhbG9nXCIpLCBjYW52YXMpXHJcbiAgICAgICAgdGhpcy5vcGVuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnRvZ2dsZSgpKVxyXG4gICAgICAgIHRoaXMuY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuaGlkZSgpKVxyXG5cclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZXYua2V5LnRvVXBwZXJDYXNlKCkgPT09IFwiSVwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgc3VwZXIuc2hvdygpXHJcbiAgICB9XHJcblxyXG4gICAgcmVmcmVzaCgpIHtcclxuICAgICAgICBjb25zdCB0Ym9keSA9IHRoaXMudGFibGUudEJvZGllc1swXVxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0Ym9keSlcclxuXHJcbiAgICAgICAgY29uc3QgaXRlbXMgPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLnBsYXllci5pbnZlbnRvcnkpXHJcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy5pdGVtVGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCB0ciA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5pdGVtLXJvd1wiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtTmFtZVRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0tbmFtZVwiKVxyXG4gICAgICAgICAgICBjb25zdCBlcXVpcEJ1dHRvbiA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pbnZlbnRvcnktZXF1aXAtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHJlbW92ZUJ1dHRvbiA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pbnZlbnRvcnktcmVtb3ZlLWJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCB1c2VCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LXVzZS1idXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuXHJcbiAgICAgICAgICAgIGl0ZW1OYW1lVGQudGV4dENvbnRlbnQgPSBpdGVtLm5hbWVcclxuICAgICAgICAgICAgdXNlQnV0dG9uLmhpZGRlbiA9ICEoaXRlbSBpbnN0YW5jZW9mIHJsLlVzYWJsZSlcclxuICAgICAgICAgICAgZXF1aXBCdXR0b24uaGlkZGVuID0gIXJsLmlzRXF1aXBwYWJsZShpdGVtKSB8fCB0aGlzLnBsYXllci5pc0VxdWlwcGVkKGl0ZW0pXHJcbiAgICAgICAgICAgIHJlbW92ZUJ1dHRvbi5oaWRkZW4gPSAhdGhpcy5wbGF5ZXIuaXNFcXVpcHBlZChpdGVtKVxyXG5cclxuICAgICAgICAgICAgdGJvZHkuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBDb250YWluZXJEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBkaWFsb2c6IERpYWxvZ1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBuYW1lU3BhbiA9IGRvbS5ieUlkKFwiY29udGFpbmVyTmFtZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2xvc2VCdXR0b24gPSBkb20uYnlJZChcImNvbnRhaW5lckNsb3NlQnV0dG9uXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRha2VBbGxCdXR0b24gPSBkb20uYnlJZChcImNvbnRhaW5lclRha2VBbGxCdXR0b25cIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29udGFpbmVyVGFibGUgPSBkb20uYnlJZChcImNvbnRhaW5lclRhYmxlXCIpIGFzIEhUTUxUYWJsZUVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29udGFpbmVySXRlbVRlbXBsYXRlID0gZG9tLmJ5SWQoXCJjb250YWluZXJJdGVtVGVtcGxhdGVcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSBtYXA6IG1hcHMuTWFwIHwgbnVsbCA9IG51bGxcclxuICAgIHByaXZhdGUgY29udGFpbmVyOiBybC5Db250YWluZXIgfCBudWxsID0gbnVsbFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXIsIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICB0aGlzLmRpYWxvZyA9IG5ldyBEaWFsb2coZG9tLmJ5SWQoXCJjb250YWluZXJEaWFsb2dcIiksIGNhbnZhcylcclxuICAgICAgICB0aGlzLnBsYXllciA9IHBsYXllclxyXG4gICAgICAgIHRoaXMuY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuaGlkZSgpKVxyXG4gICAgICAgIHRoaXMudGFrZUFsbEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy50YWtlQWxsKCkpXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmRpYWxvZy5lbGVtLCBcImNsaWNrXCIsIFwiLmNvbnRhaW5lci10YWtlLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGJ0biA9IGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCByb3cgPSBidG4uY2xvc2VzdChcIi5pdGVtLXJvd1wiKSBhcyBIVE1MVGFibGVSb3dFbGVtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgocm93KVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gZ2V0U29ydGVkSXRlbXModGhpcy5jb250YWluZXIuaXRlbXMpW2lkeF1cclxuICAgICAgICAgICAgaWYgKCFpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5jb250YWluZXIuaXRlbXMuZGVsZXRlKGl0ZW0pXHJcbiAgICAgICAgICAgIHRoaXMucGxheWVyLmludmVudG9yeS5hZGQoaXRlbSlcclxuXHJcbiAgICAgICAgICAgIC8vIGhpZGUgaWYgdGhpcyB3YXMgdGhlIGxhc3QgaXRlbVxyXG4gICAgICAgICAgICBpZiAodGhpcy5jb250YWluZXIuaXRlbXMuc2l6ZSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdyhtYXA6IG1hcHMuTWFwLCBjb250YWluZXI6IHJsLkNvbnRhaW5lcikge1xyXG4gICAgICAgIHRoaXMubWFwID0gbWFwXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIgPSBjb250YWluZXJcclxuICAgICAgICB0aGlzLm5hbWVTcGFuLnRleHRDb250ZW50ID0gdGhpcy5jb250YWluZXIubmFtZVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgdGhpcy5kaWFsb2cuc2hvdygpXHJcbiAgICB9XHJcblxyXG4gICAgaGlkZSgpIHtcclxuICAgICAgICBpZiAodGhpcy5tYXAgJiYgdGhpcy5jb250YWluZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5tYXAuY29udGFpbmVycy5kZWxldGUodGhpcy5jb250YWluZXIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IG51bGxcclxuICAgICAgICB0aGlzLmRpYWxvZy5oaWRlKClcclxuICAgIH1cclxuXHJcbiAgICByZWZyZXNoKCkge1xyXG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy5jb250YWluZXJUYWJsZS50Qm9kaWVzWzBdXHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRib2R5KVxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaXRlbXMgPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLmNvbnRhaW5lci5pdGVtcylcclxuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0aGlzLmNvbnRhaW5lckl0ZW1UZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHRyID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLml0ZW0tcm93XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1OYW1lVGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1uYW1lXCIpXHJcbiAgICAgICAgICAgIGl0ZW1OYW1lVGQudGV4dENvbnRlbnQgPSBpdGVtLm5hbWVcclxuICAgICAgICAgICAgdGJvZHkuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRha2VBbGwoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLmNvbnRhaW5lci5pdGVtcykge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5pdGVtcy5kZWxldGUoaXRlbSlcclxuICAgICAgICAgICAgdGhpcy5wbGF5ZXIuaW52ZW50b3J5LmFkZChpdGVtKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5oaWRlKClcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U29ydGVkSXRlbXMoaXRlbXM6IEl0ZXJhYmxlPHJsLkl0ZW0+KTogcmwuSXRlbVtdIHtcclxuICAgIGNvbnN0IHNvcnRlZEl0ZW1zID0gYXJyYXkub3JkZXJCeShpdGVtcywgaSA9PiBpLm5hbWUpXHJcbiAgICByZXR1cm4gc29ydGVkSXRlbXNcclxufVxyXG5cclxuZnVuY3Rpb24gY2FuU2VlKG1hcDogbWFwcy5NYXAsIGV5ZTogZ2VvLlBvaW50LCB0YXJnZXQ6IGdlby5Qb2ludCk6IGJvb2xlYW4ge1xyXG4gICAgZm9yIChjb25zdCBwdCBvZiBtYXJjaChleWUsIHRhcmdldCkpIHtcclxuICAgICAgICAvLyBpZ25vcmUgc3RhcnQgcG9pbnRcclxuICAgICAgICBpZiAocHQuZXF1YWwoZXllKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCB0aCBvZiBtYXAuYXQocHQpKSB7XHJcbiAgICAgICAgICAgIGlmICghdGgudHJhbnNwYXJlbnQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uKiBtYXJjaChzdGFydDogZ2VvLlBvaW50LCBlbmQ6IGdlby5Qb2ludCk6IEdlbmVyYXRvcjxnZW8uUG9pbnQ+IHtcclxuICAgIGNvbnN0IGN1ciA9IHN0YXJ0LmNsb25lKClcclxuICAgIGNvbnN0IGR5ID0gTWF0aC5hYnMoZW5kLnkgLSBzdGFydC55KTtcclxuICAgIGNvbnN0IHN5ID0gc3RhcnQueSA8IGVuZC55ID8gMSA6IC0xO1xyXG4gICAgY29uc3QgZHggPSAtTWF0aC5hYnMoZW5kLnggLSBzdGFydC54KTtcclxuICAgIGNvbnN0IHN4ID0gc3RhcnQueCA8IGVuZC54ID8gMSA6IC0xO1xyXG4gICAgbGV0IGVyciA9IGR5ICsgZHg7XHJcblxyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICB5aWVsZCBjdXJcclxuXHJcbiAgICAgICAgaWYgKGN1ci5lcXVhbChlbmQpKSB7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZTIgPSAyICogZXJyO1xyXG4gICAgICAgIGlmIChlMiA+PSBkeCkge1xyXG4gICAgICAgICAgICBlcnIgKz0gZHg7XHJcbiAgICAgICAgICAgIGN1ci55ICs9IHN5O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUyIDw9IGR5KSB7XHJcbiAgICAgICAgICAgIGVyciArPSBkeTtcclxuICAgICAgICAgICAgY3VyLnggKz0gc3g7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcm9wSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuSXRlbSk6IHZvaWQge1xyXG4gICAgcGxheWVyLmRlbGV0ZShpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSB3YXMgZHJvcHBlZGApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZUl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLlVzYWJsZSk6IHZvaWQge1xyXG4gICAgY29uc3QgYW1vdW50ID0gTWF0aC5taW4oaXRlbS5oZWFsdGgsIHBsYXllci5tYXhIZWFsdGggLSBwbGF5ZXIuaGVhbHRoKVxyXG4gICAgcGxheWVyLmhlYWx0aCArPSBhbW91bnRcclxuICAgIHBsYXllci5kZWxldGUoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gcmVzdG9yZWQgJHthbW91bnR9IGhlYWx0aGApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVxdWlwSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuRXF1aXBwYWJsZSk6IHZvaWQge1xyXG4gICAgcGxheWVyLmVxdWlwKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHdhcyBlcXVpcHBlZGApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZUl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkVxdWlwcGFibGUpOiB2b2lkIHtcclxuICAgIHBsYXllci5yZW1vdmUoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gd2FzIHJlbW92ZWRgKVxyXG59XHJcblxyXG5jbGFzcyBBcHAge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW52YXMgPSBkb20uYnlJZChcImNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZW5kZXJlciA9IG5ldyBnZnguUmVuZGVyZXIodGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyID0gdGhpbmdzLnBsYXllci5jbG9uZSgpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGlucDogaW5wdXQuSW5wdXQgPSBuZXcgaW5wdXQuSW5wdXQodGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN0YXRzRGlhbG9nID0gbmV3IFN0YXRzRGlhbG9nKHRoaXMucGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW52ZW50b3J5RGlhbG9nID0gbmV3IEludmVudG9yeURpYWxvZyh0aGlzLnBsYXllciwgdGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lckRpYWxvZyA9IG5ldyBDb250YWluZXJEaWFsb2codGhpcy5wbGF5ZXIsIHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSBtYXA6IG1hcHMuTWFwID0gbmV3IG1hcHMuTWFwKDAsIDAsIHRoaXMucGxheWVyKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgcGxheWVyLmludmVudG9yeS5hZGQodGhpbmdzLmhlYWx0aFBvdGlvbi5jbG9uZSgpKVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWMoKSB7XHJcbiAgICAgICAgdGhpcy5tYXAgPSBhd2FpdCBnZW4uZ2VuZXJhdGVNYXAodGhpcy5wbGF5ZXIsIHRoaXMucmVuZGVyZXIsIDY0LCA2NClcclxuICAgICAgICBpZiAoIXRoaXMucGxheWVyLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBsYXllciBpcyBub3QgcG9zaXRpb25lZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgb3V0cHV0LndyaXRlKFwiWW91ciBhZHZlbnR1cmUgYmVnaW5zXCIpXHJcbiAgICAgICAgbWFwcy51cGRhdGVWaXNpYmlsaXR5KHRoaXMubWFwLCB0aGlzLm1hcC5wbGF5ZXIucG9zaXRpb24sIHJsLmxpZ2h0UmFkaXVzKVxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLnRpY2soKSlcclxuICAgIH1cclxuXHJcblxyXG4gICAgdGljaygpIHtcclxuICAgICAgICBjb25zdCBjbWQgPSB0aGlzLmhhbmRsZUlucHV0KClcclxuICAgICAgICBpZiAoY21kKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc1R1cm4oY21kKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmF3RnJhbWUoKVxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLnRpY2soKSlcclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzVHVybihjbWQ6IENvbW1hbmQpIHtcclxuICAgICAgICAvLyBmaW5kIGNyZWF0dXJlIHdpdGggbWF4IGFnaWxpdHlcclxuICAgICAgICAvLyBldmVyeW9uZSBtb3ZlcyByZWxhdGl2ZSB0byB0aGlzIHJhdGVcclxuICAgICAgICAvLyBldmVyeW9uZSBnZXRzIG9uZSBhY3Rpb24gcG9pbnQgcGVyIHJvdW5kXHJcbiAgICAgICAgLy8gZmFzdGVzdCBjcmVhdHVyZShzKSByZXF1aXJlIDEgYWN0aW9uIHBvaW50IHRvIG1vdmVcclxuICAgICAgICAvLyB0aGUgcmVzdCByZXF1aXJlIGFuIGFtb3VudCBvZiBhY3Rpb24gcG9pbnRzIGFjY29yZGluZyB0byB0aGVpciByYXRpbyB3aXRoIHRoZSBmYXN0ZXN0XHJcbiAgICAgICAgLy8gdGhpcyBhbGwgc2hvdWxkIGJlIHJlcGVhdGVkIHVudGlsIHBsYXllcidzIHR1cm4gaXMgcHJvY2Vzc2VkIGF0IHdoaWNoIHBvaW50IHdlIHNob3VsZCB3YWl0IGZvciBuZXh0IHBsYXllciBtb3ZlXHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBjb25zdCBjcmVhdHVyZXMgPSBhcnJheS5vcmRlckJ5RGVzYyhhcnJheS5hcHBlbmQ8cmwuQ3JlYXR1cmU+KG1hcC5tb25zdGVycywgbWFwLnBsYXllciksIG0gPT4gbS5hZ2lsaXR5KVxyXG4gICAgICAgIGNvbnN0IG1heEFnaWxpdHkgPSBjcmVhdHVyZXMucmVkdWNlKCh4LCB5KSA9PiB4LmFnaWxpdHkgPCB5LmFnaWxpdHkgPyB4IDogeSkuYWdpbGl0eVxyXG4gICAgICAgIGNvbnN0IGFjdGlvblBlclJvdW5kID0gMSAvIG1heEFnaWxpdHlcclxuICAgICAgICBsZXQgcGxheWVyTW92ZWQgPSBmYWxzZVxyXG5cclxuICAgICAgICB3aGlsZSAoIXBsYXllck1vdmVkKSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgY3JlYXR1cmUgb2YgY3JlYXR1cmVzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3JlYXR1cmUuYWN0aW9uIDwgMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0dXJlLmFjdGlvbiArPSBhY3Rpb25QZXJSb3VuZFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY3JlYXR1cmUuYWN0aW9uIC09IDFcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoY3JlYXR1cmUgaW5zdGFuY2VvZiBybC5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpY2tQbGF5ZXIoY21kKVxyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllck1vdmVkID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChjcmVhdHVyZSBpbnN0YW5jZW9mIHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpY2tNb25zdGVyKGNyZWF0dXJlKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobWFwLnBsYXllci5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICAgICAgbWFwcy51cGRhdGVWaXNpYmlsaXR5KG1hcCwgbWFwLnBsYXllci5wb3NpdGlvbiwgcmwubGlnaHRSYWRpdXMpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0U2Nyb2xsT2Zmc2V0KCk6IGdlby5Qb2ludCB7XHJcbiAgICAgICAgLy8gY29udmVydCBtYXAgcG9pbnQgdG8gY2FudmFzIHBvaW50LCBub3RpbmcgdGhhdCBjYW52YXMgaXMgY2VudGVyZWQgb24gcGxheWVyXHJcbiAgICAgICAgY29uc3QgcGxheWVyUG9zaXRpb24gPSB0aGlzLnBsYXllci5wb3NpdGlvblxyXG4gICAgICAgIGNvbnN0IGNhbnZhc0NlbnRlciA9IG5ldyBnZW8uUG9pbnQodGhpcy5jYW52YXMud2lkdGggLyAyLCB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyKVxyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IGNhbnZhc0NlbnRlci5zdWJQb2ludChwbGF5ZXJQb3NpdGlvbi5hZGRTY2FsYXIoLjUpLm11bFNjYWxhcihybC50aWxlU2l6ZSkpXHJcbiAgICAgICAgcmV0dXJuIG9mZnNldC5mbG9vcigpXHJcbiAgICB9XHJcblxyXG4gICAgY2FudmFzVG9NYXBQb2ludChjeHk6IGdlby5Qb2ludCkge1xyXG4gICAgICAgIGNvbnN0IHNjcm9sbE9mZnNldCA9IHRoaXMuZ2V0U2Nyb2xsT2Zmc2V0KClcclxuICAgICAgICBjb25zdCBteHkgPSBjeHkuc3ViUG9pbnQoc2Nyb2xsT2Zmc2V0KS5kaXZTY2FsYXIocmwudGlsZVNpemUpXHJcbiAgICAgICAgcmV0dXJuIG14eVxyXG4gICAgfVxyXG5cclxuICAgIG1hcFRvQ2FudmFzUG9pbnQobXh5OiBnZW8uUG9pbnQpIHtcclxuICAgICAgICBjb25zdCBzY3JvbGxPZmZzZXQgPSB0aGlzLmdldFNjcm9sbE9mZnNldCgpXHJcbiAgICAgICAgY29uc3QgY3h5ID0gbXh5Lm11bFNjYWxhcihybC50aWxlU2l6ZSkuYWRkUG9pbnQoc2Nyb2xsT2Zmc2V0KVxyXG4gICAgICAgIHJldHVybiBjeHlcclxuICAgIH1cclxuXHJcbiAgICB0aWNrUGxheWVyKGNtZDogQ29tbWFuZCkge1xyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgc3dpdGNoIChjbWQudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIENvbW1hbmRUeXBlLk9wZW46IHtcclxuICAgICAgICAgICAgICAgIG91dHB1dC5pbmZvKFwiRG9vciBvcGVuZWRcIilcclxuICAgICAgICAgICAgICAgIHRoaXMubWFwLmZpeHR1cmVzLmRlbGV0ZShjbWQuZml4dHVyZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuUGFzczoge1xyXG4gICAgICAgICAgICAgICAgb3V0cHV0LmluZm8oXCJQYXNzXCIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIENvbW1hbmRUeXBlLk1vdmU6IHtcclxuICAgICAgICAgICAgICAgIHBsYXllci5wb3NpdGlvbiA9IGNtZC5wb3NpdGlvblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5FcXVpcDoge1xyXG4gICAgICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiRXF1aXAgbm90IHlldCBpbXBsZW1lbnRlZFwiKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5Vc2U6IHtcclxuICAgICAgICAgICAgICAgIG91dHB1dC5lcnJvcihcIlVzZSBub3QgeWV0IGltcGxlbWVudGVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIENvbW1hbmRUeXBlLkF0dGFjazoge1xyXG4gICAgICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiQXR0YWNrIG5vdCB5ZXQgaW1wbGVtZW50ZWRcIilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuQ2xpbWJVcDoge1xyXG4gICAgICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiQ2xpbWIgdXAgbm90IHlldCBpbXBsZW1lbnRlZFwiKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5DbGltYkRvd246IHtcclxuICAgICAgICAgICAgICAgIG91dHB1dC5lcnJvcihcIkNsaW1iIGRvd24geWV0IGltcGxlbWVudGVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRpY2tNb25zdGVyKG1vbnN0ZXI6IHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAvLyBkZXRlcm1pbmUgd2hldGhlciBtb25zdGVyIGNhbiBzZWUgcGxheWVyXHJcbiAgICAgICAgaWYgKCFtb25zdGVyLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBpZiAoIW1hcC5wbGF5ZXIucG9zaXRpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoY2FuU2VlKG1hcCwgbW9uc3Rlci5wb3NpdGlvbiwgbWFwLnBsYXllci5wb3NpdGlvbikgJiYgbW9uc3Rlci5zdGF0ZSAhPT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke21vbnN0ZXIubmFtZX0gaGFzIHNwb3R0ZWQgeW91IWApXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuc3RhdGUgPSBybC5Nb25zdGVyU3RhdGUuYWdncm9cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghY2FuU2VlKG1hcCwgbW9uc3Rlci5wb3NpdGlvbiwgbWFwLnBsYXllci5wb3NpdGlvbikgJiYgbW9uc3Rlci5zdGF0ZSA9PT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke21vbnN0ZXIubmFtZX0gaGFzIGxvc3Qgc2lnaHQgb2YgeW91IWApXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuc3RhdGUgPSBybC5Nb25zdGVyU3RhdGUuaWRsZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBoYW5kbGVSZXNpemUoKSB7XHJcbiAgICAgICAgY29uc3QgY2FudmFzID0gdGhpcy5jYW52YXNcclxuICAgICAgICBpZiAoY2FudmFzLndpZHRoID09PSBjYW52YXMuY2xpZW50V2lkdGggJiYgY2FudmFzLmhlaWdodCA9PT0gY2FudmFzLmNsaWVudEhlaWdodCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICB9XHJcblxyXG4gICAgaGFuZGxlSW5wdXQoKTogQ29tbWFuZCB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5wbGF5ZXJcclxuICAgICAgICBjb25zdCBpbnAgPSB0aGlzLmlucFxyXG5cclxuICAgICAgICBpZiAoIXBsYXllci5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBwbGF5ZXIucG9zaXRpb24uY2xvbmUoKVxyXG5cclxuICAgICAgICBpZiAoaW5wLm1vdXNlTGVmdFByZXNzZWQpIHtcclxuICAgICAgICAgICAgLy8gZGV0ZXJtaW5lIHRoZSBtYXAgY29vcmRpbmF0ZXMgdGhlIHVzZXIgY2xpY2tlZCBvblxyXG4gICAgICAgICAgICBjb25zdCBteHkgPSB0aGlzLmNhbnZhc1RvTWFwUG9pbnQobmV3IGdlby5Qb2ludChpbnAubW91c2VYLCBpbnAubW91c2VZKSkuZmxvb3IoKVxyXG5cclxuICAgICAgICAgICAgY29uc3QgY2xpY2tGaXh0dXJlID0gbWFwLmZpeHR1cmVBdChteHkpXHJcbiAgICAgICAgICAgIGlmIChjbGlja0ZpeHR1cmUpIHtcclxuICAgICAgICAgICAgICAgIG91dHB1dC5pbmZvKGBZb3Ugc2VlICR7Y2xpY2tGaXh0dXJlLm5hbWV9YClcclxuICAgICAgICAgICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjbGlja0NyZWF0dXJlID0gbWFwLm1vbnN0ZXJBdChteHkpXHJcbiAgICAgICAgICAgIGlmIChjbGlja0NyZWF0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke2NsaWNrQ3JlYXR1cmUubmFtZX1gKVxyXG4gICAgICAgICAgICAgICAgaW5wLmZsdXNoKClcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGR4eSA9IG14eS5zdWJQb2ludChwbGF5ZXIucG9zaXRpb24pXHJcbiAgICAgICAgICAgIGNvbnN0IHNnbiA9IGR4eS5zaWduKClcclxuICAgICAgICAgICAgY29uc3QgYWJzID0gZHh5LmFicygpXHJcblxyXG4gICAgICAgICAgICBpZiAoYWJzLnggPiAwICYmIGFicy54ID49IGFicy55KSB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbi54ICs9IHNnbi54XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChhYnMueSA+IDAgJiYgYWJzLnkgPiBhYnMueCkge1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb24ueSArPSBzZ24ueVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChpbnAucHJlc3NlZChcIndcIikpIHtcclxuICAgICAgICAgICAgcG9zaXRpb24ueSAtPSAxXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGlucC5wcmVzc2VkKFwic1wiKSkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbi55ICs9IDFcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJhXCIpKSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnggLT0gMVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChpbnAucHJlc3NlZChcImRcIikpIHtcclxuICAgICAgICAgICAgcG9zaXRpb24ueCArPSAxXHJcbiAgICAgICAgfSBlbHNlIGlmIChpbnAucHJlc3NlZChcInpcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5zdGF0c0RpYWxvZy5zaG93KClcclxuICAgICAgICB9IGVsc2UgaWYgKGlucC5wcmVzc2VkKFwiaVwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmludmVudG9yeURpYWxvZy5zaG93KClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlucC5mbHVzaCgpXHJcblxyXG4gICAgICAgIGlmIChwb3NpdGlvbi5lcXVhbChwbGF5ZXIucG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB0aWxlID0gbWFwLnRpbGVBdChwb3NpdGlvbilcclxuICAgICAgICBpZiAodGlsZSAmJiAhdGlsZS5wYXNzYWJsZSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgQmxvY2tlZCBieSAke3RpbGUubmFtZX1gKVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29udGFpbmVyID0gbWFwLmNvbnRhaW5lckF0KHBvc2l0aW9uKVxyXG4gICAgICAgIGlmIChjb250YWluZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5jb250YWluZXJEaWFsb2cuc2hvdyhtYXAsIGNvbnRhaW5lcilcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGZpeHR1cmUgPSBtYXAuZml4dHVyZUF0KHBvc2l0aW9uKVxyXG4gICAgICAgIGlmIChmaXh0dXJlIGluc3RhbmNlb2YgcmwuRG9vcikge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogQ29tbWFuZFR5cGUuT3BlbixcclxuICAgICAgICAgICAgICAgIGZpeHR1cmU6IGZpeHR1cmVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoZml4dHVyZSBpbnN0YW5jZW9mIHJsLlN0YWlyc1VwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IENvbW1hbmRUeXBlLkNsaW1iVXAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoZml4dHVyZSBpbnN0YW5jZW9mIHJsLlN0YWlyc0Rvd24pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogQ29tbWFuZFR5cGUuQ2xpbWJEb3duIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGZpeHR1cmUgJiYgIWZpeHR1cmUucGFzc2FibGUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYENhbid0IG1vdmUgdGhhdCB3YXksIGJsb2NrZWQgYnkgJHtmaXh0dXJlLm5hbWV9YClcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG1vbnN0ZXIgPSBtYXAubW9uc3RlckF0KHBvc2l0aW9uKVxyXG4gICAgICAgIGlmIChtb25zdGVyICYmICFtb25zdGVyLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBDb21tYW5kVHlwZS5BdHRhY2ssXHJcbiAgICAgICAgICAgICAgICBtb25zdGVyOiBtb25zdGVyXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHR5cGU6IENvbW1hbmRUeXBlLk1vdmUsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBkcmF3RnJhbWUoKSB7XHJcbiAgICAgICAgdGhpcy5oYW5kbGVSZXNpemUoKVxyXG5cclxuICAgICAgICAvLyBjZW50ZXIgdGhlIGdyaWQgYXJvdW5kIHRoZSBwbGF5ZXJkXHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gdGhpcy5nZXRTY3JvbGxPZmZzZXQoKVxyXG5cclxuICAgICAgICAvLyBub3RlIC0gZHJhd2luZyBvcmRlciBtYXR0ZXJzIC0gZHJhdyBmcm9tIGJvdHRvbSB0byB0b3BcclxuXHJcbiAgICAgICAgLy8gZHJhdyB2YXJpb3VzIGxheWVycyBvZiBzcHJpdGVzXHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBmb3IgKGNvbnN0IHRpbGUgb2YgbWFwLnRpbGVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgdGlsZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgZml4dHVyZSBvZiBtYXAuZml4dHVyZXMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCBmaXh0dXJlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBjb250YWluZXIgb2YgbWFwLmNvbnRhaW5lcnMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCBjb250YWluZXIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGNyZWF0dXJlIG9mIG1hcC5tb25zdGVycykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIGNyZWF0dXJlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCB0aGlzLnBsYXllcilcclxuICAgICAgICB0aGlzLmRyYXdIZWFsdGhCYXIob2Zmc2V0LCB0aGlzLnBsYXllcilcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5mbHVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgZHJhd1RoaW5nKG9mZnNldDogZ2VvLlBvaW50LCB0aDogcmwuVGhpbmcpIHtcclxuICAgICAgICAvLyBkb24ndCBkcmF3IHRoaW5ncyB0aGF0IGFyZW4ndCBwb3NpdGlvbmVkXHJcbiAgICAgICAgaWYgKCF0aC5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aC52aXNpYmxlID09PSBybC5WaXNpYmlsaXR5Lk5vbmUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb2xvciA9IHRoLmNvbG9yLmNsb25lKClcclxuICAgICAgICBpZiAodGgudmlzaWJsZSA9PT0gcmwuVmlzaWJpbGl0eS5Gb2cpIHtcclxuICAgICAgICAgICAgY29sb3IuYSA9IC41XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzcHJpdGVQb3NpdGlvbiA9IHRoLnBvc2l0aW9uLm11bFNjYWxhcihybC50aWxlU2l6ZSkuYWRkUG9pbnQob2Zmc2V0KVxyXG4gICAgICAgIGNvbnN0IHNwcml0ZSA9IG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLFxyXG4gICAgICAgICAgICBjb2xvcjogY29sb3IsXHJcbiAgICAgICAgICAgIHdpZHRoOiBybC50aWxlU2l6ZSxcclxuICAgICAgICAgICAgaGVpZ2h0OiBybC50aWxlU2l6ZSxcclxuICAgICAgICAgICAgdGV4dHVyZTogdGgudGV4dHVyZSxcclxuICAgICAgICAgICAgbGF5ZXI6IHRoLnRleHR1cmVMYXllcixcclxuICAgICAgICAgICAgZmxhZ3M6IGdmeC5TcHJpdGVGbGFncy5BcnJheVRleHR1cmVcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdTcHJpdGUoc3ByaXRlKVxyXG4gICAgfVxyXG5cclxuICAgIGRyYXdIZWFsdGhCYXIob2Zmc2V0OiBnZW8uUG9pbnQsIGNyZWF0dXJlOiBybC5DcmVhdHVyZSkge1xyXG4gICAgICAgIGlmICghY3JlYXR1cmUucG9zaXRpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB3aWR0aCA9IGNyZWF0dXJlLm1heEhlYWx0aCAqIDQgKyAyXHJcbiAgICAgICAgY29uc3Qgc3ByaXRlUG9zaXRpb24gPSBjcmVhdHVyZS5wb3NpdGlvbi5tdWxTY2FsYXIocmwudGlsZVNpemUpLmFkZFBvaW50KG9mZnNldCkuc3ViUG9pbnQobmV3IGdlby5Qb2ludCgwLCBybC50aWxlU2l6ZSAvIDIpKVxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd1Nwcml0ZShuZXcgZ2Z4LlNwcml0ZSh7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBzcHJpdGVQb3NpdGlvbixcclxuICAgICAgICAgICAgY29sb3I6IGdmeC5Db2xvci53aGl0ZSxcclxuICAgICAgICAgICAgd2lkdGg6IHdpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IDhcclxuICAgICAgICB9KSlcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3U3ByaXRlKG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLmFkZFBvaW50KG5ldyBnZW8uUG9pbnQoMSwgMSkpLFxyXG4gICAgICAgICAgICBjb2xvcjogZ2Z4LkNvbG9yLnJlZCxcclxuICAgICAgICAgICAgd2lkdGg6IHdpZHRoIC0gMixcclxuICAgICAgICAgICAgaGVpZ2h0OiA2XHJcbiAgICAgICAgfSkpXHJcbiAgICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICBjb25zdCBhcHAgPSBuZXcgQXBwKClcclxuICAgIGF3YWl0IGFwcC5leGVjKClcclxufVxyXG5cclxuaW5pdCgpIl19