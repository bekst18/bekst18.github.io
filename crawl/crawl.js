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
        this.inventoryTable = dom.byId("inventoryTable");
        this.inventoryItemTemplate = dom.byId("inventoryItemTemplate");
    }
    show() {
        this.refresh();
        super.show();
    }
    refresh() {
        const tbody = this.inventoryTable.tBodies[0];
        dom.removeAllChildren(tbody);
        const items = getSortedItems(this.player.inventory);
        for (const item of items) {
            const fragment = this.inventoryItemTemplate.content.cloneNode(true);
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
        this.closeButton = dom.byId("containerCloseButton");
        this.takeAllButton = dom.byId("containerTakeAllButton");
        this.containerTable = dom.byId("containerTable");
        this.containerItemTemplate = dom.byId("containerItemTemplate");
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
            this.refresh();
        });
    }
    show(container) {
        this.container = container;
        this.refresh();
        this.dialog.show();
    }
    hide() {
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
        player.inventory.add(things.steelShield.clone());
        player.inventory.add(things.steelSword.clone());
        player.inventory.add(things.steelPlateArmor.clone());
        player.inventory.add(things.weakHealthPotion.clone());
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
            output.info(`Can't move that way, blocked by ${tile.name}`);
            return null;
        }
        const container = map.containerAt(position);
        if (container) {
            this.containerDialog.show(container);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBRWpDLElBQUssV0FTSjtBQVRELFdBQUssV0FBVztJQUNaLDZDQUFJLENBQUE7SUFDSiwrQ0FBSyxDQUFBO0lBQ0wsMkNBQUcsQ0FBQTtJQUNILDZDQUFJLENBQUE7SUFDSiw2Q0FBSSxDQUFBO0lBQ0osaURBQU0sQ0FBQTtJQUNOLG1EQUFPLENBQUE7SUFDUCx1REFBUyxDQUFBO0FBQ2IsQ0FBQyxFQVRJLFdBQVcsS0FBWCxXQUFXLFFBU2Y7QUF5Q0QsTUFBTSxNQUFNO0lBRVIsWUFBNEIsSUFBaUIsRUFBbUIsTUFBeUI7UUFBN0QsU0FBSSxHQUFKLElBQUksQ0FBYTtRQUFtQixXQUFNLEdBQU4sTUFBTSxDQUFtQjtRQUR4RSxvQkFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQW1CLENBQUE7SUFDYSxDQUFDO0lBRTlGLElBQUk7UUFDQSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxN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cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiXHJcbmltcG9ydCAqIGFzIGdmeCBmcm9tIFwiLi9nZnguanNcIlxyXG5pbXBvcnQgKiBhcyBnZW4gZnJvbSBcIi4vZ2VuLmpzXCJcclxuaW1wb3J0ICogYXMgaW5wdXQgZnJvbSBcIi4uL3NoYXJlZC9pbnB1dC5qc1wiXHJcbmltcG9ydCAqIGFzIHJsIGZyb20gXCIuL3JsLmpzXCJcclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvMmQuanNcIlxyXG5pbXBvcnQgKiBhcyBvdXRwdXQgZnJvbSBcIi4vb3V0cHV0LmpzXCJcclxuaW1wb3J0ICogYXMgdGhpbmdzIGZyb20gXCIuL3RoaW5ncy5qc1wiXHJcbmltcG9ydCAqIGFzIG1hcHMgZnJvbSBcIi4vbWFwcy5qc1wiXHJcblxyXG5lbnVtIENvbW1hbmRUeXBlIHtcclxuICAgIE1vdmUsXHJcbiAgICBFcXVpcCxcclxuICAgIFVzZSxcclxuICAgIFBhc3MsXHJcbiAgICBPcGVuLFxyXG4gICAgQXR0YWNrLFxyXG4gICAgQ2xpbWJVcCxcclxuICAgIENsaW1iRG93blxyXG59XHJcblxyXG5pbnRlcmZhY2UgTW92ZUNvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuTW92ZVxyXG4gICAgcG9zaXRpb246IGdlby5Qb2ludFxyXG59XHJcblxyXG5pbnRlcmZhY2UgRXF1aXBDb21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLkVxdWlwXHJcbiAgICBpdGVtOiBybC5FcXVpcHBhYmxlXHJcbn1cclxuXHJcbmludGVyZmFjZSBQYXNzQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5QYXNzXHJcbn1cclxuXHJcbmludGVyZmFjZSBVc2VDb21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLlVzZVxyXG4gICAgaXRlbTogcmwuVXNhYmxlXHJcbn1cclxuXHJcbmludGVyZmFjZSBPcGVuQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5PcGVuXHJcbiAgICBmaXh0dXJlOiBybC5Eb29yXHJcbn1cclxuXHJcbmludGVyZmFjZSBBdHRhY2tDb21tYW5kIHtcclxuICAgIHR5cGU6IENvbW1hbmRUeXBlLkF0dGFja1xyXG4gICAgbW9uc3RlcjogcmwuTW9uc3RlclxyXG59XHJcblxyXG5pbnRlcmZhY2UgQ2xpbWJVcENvbW1hbmQge1xyXG4gICAgdHlwZTogQ29tbWFuZFR5cGUuQ2xpbWJVcFxyXG59XHJcblxyXG5pbnRlcmZhY2UgQ2xpbWJEb3duQ29tbWFuZCB7XHJcbiAgICB0eXBlOiBDb21tYW5kVHlwZS5DbGltYkRvd25cclxufVxyXG5cclxudHlwZSBDb21tYW5kID0gTW92ZUNvbW1hbmQgfCBFcXVpcENvbW1hbmQgfCBQYXNzQ29tbWFuZCB8IFVzZUNvbW1hbmQgfCBPcGVuQ29tbWFuZCB8IEF0dGFja0NvbW1hbmQgfCBDbGltYlVwQ29tbWFuZCB8IENsaW1iRG93bkNvbW1hbmRcclxuXHJcbmNsYXNzIERpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1vZGFsQmFja2dyb3VuZCA9IGRvbS5ieUlkKFwibW9kYWxCYWNrZ3JvdW5kXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgZWxlbTogSFRNTEVsZW1lbnQsIHByaXZhdGUgcmVhZG9ubHkgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkgeyB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICB0aGlzLm1vZGFsQmFja2dyb3VuZC5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuZWxlbS5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuZWxlbS5mb2N1cygpXHJcbiAgICB9XHJcblxyXG4gICAgaGlkZSgpIHtcclxuICAgICAgICB0aGlzLm1vZGFsQmFja2dyb3VuZC5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgdGhpcy5lbGVtLmhpZGRlbiA9IHRydWVcclxuICAgICAgICB0aGlzLmNhbnZhcy5mb2N1cygpXHJcbiAgICB9XHJcblxyXG4gICAgdG9nZ2xlKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmVsZW0uaGlkZGVuKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvdygpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5jbGFzcyBTdGF0c0RpYWxvZyBleHRlbmRzIERpYWxvZyB7XHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyLCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgc3VwZXIoZG9tLmJ5SWQoXCJzdGF0c0RpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgY29uc3QgaGVhbHRoU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNIZWFsdGhcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5wbGF5ZXJcclxuICAgICAgICBjb25zdCBhdHRhY2tTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0F0dGFja1wiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBkZWZlbnNlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNEZWZlbnNlXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGFnaWxpdHlTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0FnaWxpdHlcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgbGV2ZWxTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0xldmVsXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGV4cGVyaWVuY2VTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0V4cGVyaWVuY2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZXhwZXJpZW5jZVJlcXVpcmVtZW50ID0gcmwuZ2V0RXhwZXJpZW5jZVJlcXVpcmVtZW50KHBsYXllci5sZXZlbCArIDEpXHJcblxyXG4gICAgICAgIGhlYWx0aFNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuaGVhbHRofSAvICR7cGxheWVyLm1heEhlYWx0aH1gXHJcbiAgICAgICAgYXR0YWNrU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5hdHRhY2t9YFxyXG4gICAgICAgIGRlZmVuc2VTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmRlZmVuc2V9YFxyXG4gICAgICAgIGFnaWxpdHlTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmFnaWxpdHl9YFxyXG4gICAgICAgIGxldmVsU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5sZXZlbH1gXHJcbiAgICAgICAgZXhwZXJpZW5jZVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuZXhwZXJpZW5jZX0gLyAke2V4cGVyaWVuY2VSZXF1aXJlbWVudH1gXHJcblxyXG4gICAgICAgIHN1cGVyLnNob3coKVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBJbnZlbnRvcnlEaWFsb2cgZXh0ZW5kcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbnZlbnRvcnlUYWJsZSA9IGRvbS5ieUlkKFwiaW52ZW50b3J5VGFibGVcIikgYXMgSFRNTFRhYmxlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbnZlbnRvcnlJdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcImludmVudG9yeUl0ZW1UZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHN1cGVyKGRvbS5ieUlkKFwiaW52ZW50b3J5RGlhbG9nXCIpLCBjYW52YXMpXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIHN1cGVyLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIHJlZnJlc2goKSB7XHJcbiAgICAgICAgY29uc3QgdGJvZHkgPSB0aGlzLmludmVudG9yeVRhYmxlLnRCb2RpZXNbMF1cclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGJvZHkpXHJcblxyXG4gICAgICAgIGNvbnN0IGl0ZW1zID0gZ2V0U29ydGVkSXRlbXModGhpcy5wbGF5ZXIuaW52ZW50b3J5KVxyXG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMuaW52ZW50b3J5SXRlbVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgdHIgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLW5hbWVcIilcclxuICAgICAgICAgICAgY29uc3QgZXF1aXBCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LWVxdWlwLWJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCByZW1vdmVCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LXJlbW92ZS1idXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3QgdXNlQnV0dG9uID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLmludmVudG9yeS11c2UtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcblxyXG4gICAgICAgICAgICBpdGVtTmFtZVRkLnRleHRDb250ZW50ID0gaXRlbS5uYW1lXHJcbiAgICAgICAgICAgIHVzZUJ1dHRvbi5oaWRkZW4gPSAhKGl0ZW0gaW5zdGFuY2VvZiBybC5Vc2FibGUpXHJcbiAgICAgICAgICAgIGVxdWlwQnV0dG9uLmhpZGRlbiA9ICFybC5pc0VxdWlwcGFibGUoaXRlbSkgfHwgdGhpcy5wbGF5ZXIuaXNFcXVpcHBlZChpdGVtKVxyXG4gICAgICAgICAgICByZW1vdmVCdXR0b24uaGlkZGVuID0gIXRoaXMucGxheWVyLmlzRXF1aXBwZWQoaXRlbSlcclxuXHJcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQ29udGFpbmVyRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGlhbG9nOiBEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2xvc2VCdXR0b24gPSBkb20uYnlJZChcImNvbnRhaW5lckNsb3NlQnV0dG9uXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRha2VBbGxCdXR0b24gPSBkb20uYnlJZChcImNvbnRhaW5lclRha2VBbGxCdXR0b25cIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29udGFpbmVyVGFibGUgPSBkb20uYnlJZChcImNvbnRhaW5lclRhYmxlXCIpIGFzIEhUTUxUYWJsZUVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29udGFpbmVySXRlbVRlbXBsYXRlID0gZG9tLmJ5SWQoXCJjb250YWluZXJJdGVtVGVtcGxhdGVcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSBjb250YWluZXI6IHJsLkNvbnRhaW5lciB8IG51bGwgPSBudWxsXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IERpYWxvZyhkb20uYnlJZChcImNvbnRhaW5lckRpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgICAgIHRoaXMucGxheWVyID0gcGxheWVyXHJcbiAgICAgICAgdGhpcy5jbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5oaWRlKCkpXHJcbiAgICAgICAgdGhpcy50YWtlQWxsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnRha2VBbGwoKSlcclxuXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKHRoaXMuZGlhbG9nLmVsZW0sIFwiY2xpY2tcIiwgXCIuY29udGFpbmVyLXRha2UtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgYnRuID0gZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGJ0bi5jbG9zZXN0KFwiLml0ZW0tcm93XCIpIGFzIEhUTUxUYWJsZVJvd0VsZW1lbnRcclxuICAgICAgICAgICAgY29uc3QgaWR4ID0gZG9tLmdldEVsZW1lbnRJbmRleChyb3cpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLmNvbnRhaW5lci5pdGVtcylbaWR4XVxyXG4gICAgICAgICAgICBpZiAoIWl0ZW0pIHtcclxuICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5pdGVtcy5kZWxldGUoaXRlbSlcclxuICAgICAgICAgICAgdGhpcy5wbGF5ZXIuaW52ZW50b3J5LmFkZChpdGVtKVxyXG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdyhjb250YWluZXI6IHJsLkNvbnRhaW5lcikge1xyXG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB0aGlzLmRpYWxvZy5zaG93KClcclxuICAgIH1cclxuXHJcbiAgICBoaWRlKCkge1xyXG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gbnVsbFxyXG4gICAgICAgIHRoaXMuZGlhbG9nLmhpZGUoKVxyXG4gICAgfVxyXG5cclxuICAgIHJlZnJlc2goKSB7XHJcbiAgICAgICAgY29uc3QgdGJvZHkgPSB0aGlzLmNvbnRhaW5lclRhYmxlLnRCb2RpZXNbMF1cclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGJvZHkpXHJcblxyXG4gICAgICAgIGlmICghdGhpcy5jb250YWluZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBpdGVtcyA9IGdldFNvcnRlZEl0ZW1zKHRoaXMuY29udGFpbmVyLml0ZW1zKVxyXG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMuY29udGFpbmVySXRlbVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgdHIgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLW5hbWVcIilcclxuICAgICAgICAgICAgaXRlbU5hbWVUZC50ZXh0Q29udGVudCA9IGl0ZW0ubmFtZVxyXG4gICAgICAgICAgICB0Ym9keS5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGFrZUFsbCgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuY29udGFpbmVyLml0ZW1zKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLml0ZW1zLmRlbGV0ZShpdGVtKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXllci5pbnZlbnRvcnkuYWRkKGl0ZW0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTb3J0ZWRJdGVtcyhpdGVtczogSXRlcmFibGU8cmwuSXRlbT4pOiBybC5JdGVtW10ge1xyXG4gICAgY29uc3Qgc29ydGVkSXRlbXMgPSBhcnJheS5vcmRlckJ5KGl0ZW1zLCBpID0+IGkubmFtZSlcclxuICAgIHJldHVybiBzb3J0ZWRJdGVtc1xyXG59XHJcblxyXG5mdW5jdGlvbiBjYW5TZWUobWFwOiBtYXBzLk1hcCwgZXllOiBnZW8uUG9pbnQsIHRhcmdldDogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICBmb3IgKGNvbnN0IHB0IG9mIG1hcmNoKGV5ZSwgdGFyZ2V0KSkge1xyXG4gICAgICAgIC8vIGlnbm9yZSBzdGFydCBwb2ludFxyXG4gICAgICAgIGlmIChwdC5lcXVhbChleWUpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHRoIG9mIG1hcC5hdChwdCkpIHtcclxuICAgICAgICAgICAgaWYgKCF0aC50cmFuc3BhcmVudCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWVcclxufVxyXG5cclxuZnVuY3Rpb24qIG1hcmNoKHN0YXJ0OiBnZW8uUG9pbnQsIGVuZDogZ2VvLlBvaW50KTogR2VuZXJhdG9yPGdlby5Qb2ludD4ge1xyXG4gICAgY29uc3QgY3VyID0gc3RhcnQuY2xvbmUoKVxyXG4gICAgY29uc3QgZHkgPSBNYXRoLmFicyhlbmQueSAtIHN0YXJ0LnkpO1xyXG4gICAgY29uc3Qgc3kgPSBzdGFydC55IDwgZW5kLnkgPyAxIDogLTE7XHJcbiAgICBjb25zdCBkeCA9IC1NYXRoLmFicyhlbmQueCAtIHN0YXJ0LngpO1xyXG4gICAgY29uc3Qgc3ggPSBzdGFydC54IDwgZW5kLnggPyAxIDogLTE7XHJcbiAgICBsZXQgZXJyID0gZHkgKyBkeDtcclxuXHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgIHlpZWxkIGN1clxyXG5cclxuICAgICAgICBpZiAoY3VyLmVxdWFsKGVuZCkpIHtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlMiA9IDIgKiBlcnI7XHJcbiAgICAgICAgaWYgKGUyID49IGR4KSB7XHJcbiAgICAgICAgICAgIGVyciArPSBkeDtcclxuICAgICAgICAgICAgY3VyLnkgKz0gc3k7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZTIgPD0gZHkpIHtcclxuICAgICAgICAgICAgZXJyICs9IGR5O1xyXG4gICAgICAgICAgICBjdXIueCArPSBzeDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyb3BJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5JdGVtKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIuZGVsZXRlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHdhcyBkcm9wcGVkYClcclxufVxyXG5cclxuZnVuY3Rpb24gdXNlSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuVXNhYmxlKTogdm9pZCB7XHJcbiAgICBjb25zdCBhbW91bnQgPSBNYXRoLm1pbihpdGVtLmhlYWx0aCwgcGxheWVyLm1heEhlYWx0aCAtIHBsYXllci5oZWFsdGgpXHJcbiAgICBwbGF5ZXIuaGVhbHRoICs9IGFtb3VudFxyXG4gICAgcGxheWVyLmRlbGV0ZShpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSByZXN0b3JlZCAke2Ftb3VudH0gaGVhbHRoYClcclxufVxyXG5cclxuZnVuY3Rpb24gZXF1aXBJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5FcXVpcHBhYmxlKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIuZXF1aXAoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gd2FzIGVxdWlwcGVkYClcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuRXF1aXBwYWJsZSk6IHZvaWQge1xyXG4gICAgcGxheWVyLnJlbW92ZShpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSB3YXMgcmVtb3ZlZGApXHJcbn1cclxuXHJcbmNsYXNzIEFwcCB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJlbmRlcmVyID0gbmV3IGdmeC5SZW5kZXJlcih0aGlzLmNhbnZhcylcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXIgPSB0aGluZ3MucGxheWVyLmNsb25lKClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW5wOiBpbnB1dC5JbnB1dCA9IG5ldyBpbnB1dC5JbnB1dCh0aGlzLmNhbnZhcylcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3RhdHNEaWFsb2cgPSBuZXcgU3RhdHNEaWFsb2codGhpcy5wbGF5ZXIsIHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbnZlbnRvcnlEaWFsb2cgPSBuZXcgSW52ZW50b3J5RGlhbG9nKHRoaXMucGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29udGFpbmVyRGlhbG9nID0gbmV3IENvbnRhaW5lckRpYWxvZyh0aGlzLnBsYXllciwgdGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIG1hcDogbWFwcy5NYXAgPSBuZXcgbWFwcy5NYXAoMCwgMCwgdGhpcy5wbGF5ZXIpXHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5wbGF5ZXJcclxuICAgICAgICBwbGF5ZXIuaW52ZW50b3J5LmFkZCh0aGluZ3Muc3RlZWxTaGllbGQuY2xvbmUoKSlcclxuICAgICAgICBwbGF5ZXIuaW52ZW50b3J5LmFkZCh0aGluZ3Muc3RlZWxTd29yZC5jbG9uZSgpKVxyXG4gICAgICAgIHBsYXllci5pbnZlbnRvcnkuYWRkKHRoaW5ncy5zdGVlbFBsYXRlQXJtb3IuY2xvbmUoKSlcclxuICAgICAgICBwbGF5ZXIuaW52ZW50b3J5LmFkZCh0aGluZ3Mud2Vha0hlYWx0aFBvdGlvbi5jbG9uZSgpKVxyXG4gICAgICAgIHBsYXllci5pbnZlbnRvcnkuYWRkKHRoaW5ncy5oZWFsdGhQb3Rpb24uY2xvbmUoKSlcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjKCkge1xyXG4gICAgICAgIHRoaXMubWFwID0gYXdhaXQgZ2VuLmdlbmVyYXRlTWFwKHRoaXMucGxheWVyLCB0aGlzLnJlbmRlcmVyLCA2NCwgNjQpXHJcbiAgICAgICAgaWYgKCF0aGlzLnBsYXllci5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQbGF5ZXIgaXMgbm90IHBvc2l0aW9uZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG91dHB1dC53cml0ZShcIllvdXIgYWR2ZW50dXJlIGJlZ2luc1wiKVxyXG4gICAgICAgIG1hcHMudXBkYXRlVmlzaWJpbGl0eSh0aGlzLm1hcCwgdGhpcy5tYXAucGxheWVyLnBvc2l0aW9uLCBybC5saWdodFJhZGl1cylcclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy50aWNrKCkpXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHRpY2soKSB7XHJcbiAgICAgICAgY29uc3QgY21kID0gdGhpcy5oYW5kbGVJbnB1dCgpXHJcbiAgICAgICAgaWYgKGNtZCkge1xyXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NUdXJuKGNtZClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZHJhd0ZyYW1lKClcclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy50aWNrKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc1R1cm4oY21kOiBDb21tYW5kKSB7XHJcbiAgICAgICAgLy8gZmluZCBjcmVhdHVyZSB3aXRoIG1heCBhZ2lsaXR5XHJcbiAgICAgICAgLy8gZXZlcnlvbmUgbW92ZXMgcmVsYXRpdmUgdG8gdGhpcyByYXRlXHJcbiAgICAgICAgLy8gZXZlcnlvbmUgZ2V0cyBvbmUgYWN0aW9uIHBvaW50IHBlciByb3VuZFxyXG4gICAgICAgIC8vIGZhc3Rlc3QgY3JlYXR1cmUocykgcmVxdWlyZSAxIGFjdGlvbiBwb2ludCB0byBtb3ZlXHJcbiAgICAgICAgLy8gdGhlIHJlc3QgcmVxdWlyZSBhbiBhbW91bnQgb2YgYWN0aW9uIHBvaW50cyBhY2NvcmRpbmcgdG8gdGhlaXIgcmF0aW8gd2l0aCB0aGUgZmFzdGVzdFxyXG4gICAgICAgIC8vIHRoaXMgYWxsIHNob3VsZCBiZSByZXBlYXRlZCB1bnRpbCBwbGF5ZXIncyB0dXJuIGlzIHByb2Nlc3NlZCBhdCB3aGljaCBwb2ludCB3ZSBzaG91bGQgd2FpdCBmb3IgbmV4dCBwbGF5ZXIgbW92ZVxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgY29uc3QgY3JlYXR1cmVzID0gYXJyYXkub3JkZXJCeURlc2MoYXJyYXkuYXBwZW5kPHJsLkNyZWF0dXJlPihtYXAubW9uc3RlcnMsIG1hcC5wbGF5ZXIpLCBtID0+IG0uYWdpbGl0eSlcclxuICAgICAgICBjb25zdCBtYXhBZ2lsaXR5ID0gY3JlYXR1cmVzLnJlZHVjZSgoeCwgeSkgPT4geC5hZ2lsaXR5IDwgeS5hZ2lsaXR5ID8geCA6IHkpLmFnaWxpdHlcclxuICAgICAgICBjb25zdCBhY3Rpb25QZXJSb3VuZCA9IDEgLyBtYXhBZ2lsaXR5XHJcbiAgICAgICAgbGV0IHBsYXllck1vdmVkID0gZmFsc2VcclxuXHJcbiAgICAgICAgd2hpbGUgKCFwbGF5ZXJNb3ZlZCkge1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNyZWF0dXJlIG9mIGNyZWF0dXJlcykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGNyZWF0dXJlLmFjdGlvbiA8IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICBjcmVhdHVyZS5hY3Rpb24gKz0gYWN0aW9uUGVyUm91bmRcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNyZWF0dXJlLmFjdGlvbiAtPSAxXHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGNyZWF0dXJlIGluc3RhbmNlb2YgcmwuUGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aWNrUGxheWVyKGNtZClcclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXJNb3ZlZCA9IHRydWVcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoY3JlYXR1cmUgaW5zdGFuY2VvZiBybC5Nb25zdGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aWNrTW9uc3RlcihjcmVhdHVyZSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG1hcC5wbGF5ZXIucG9zaXRpb24pIHtcclxuICAgICAgICAgICAgICAgIG1hcHMudXBkYXRlVmlzaWJpbGl0eShtYXAsIG1hcC5wbGF5ZXIucG9zaXRpb24sIHJsLmxpZ2h0UmFkaXVzKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldFNjcm9sbE9mZnNldCgpOiBnZW8uUG9pbnQge1xyXG4gICAgICAgIC8vIGNvbnZlcnQgbWFwIHBvaW50IHRvIGNhbnZhcyBwb2ludCwgbm90aW5nIHRoYXQgY2FudmFzIGlzIGNlbnRlcmVkIG9uIHBsYXllclxyXG4gICAgICAgIGNvbnN0IHBsYXllclBvc2l0aW9uID0gdGhpcy5wbGF5ZXIucG9zaXRpb25cclxuICAgICAgICBjb25zdCBjYW52YXNDZW50ZXIgPSBuZXcgZ2VvLlBvaW50KHRoaXMuY2FudmFzLndpZHRoIC8gMiwgdGhpcy5jYW52YXMuaGVpZ2h0IC8gMilcclxuICAgICAgICBjb25zdCBvZmZzZXQgPSBjYW52YXNDZW50ZXIuc3ViUG9pbnQocGxheWVyUG9zaXRpb24uYWRkU2NhbGFyKC41KS5tdWxTY2FsYXIocmwudGlsZVNpemUpKVxyXG4gICAgICAgIHJldHVybiBvZmZzZXQuZmxvb3IoKVxyXG4gICAgfVxyXG5cclxuICAgIGNhbnZhc1RvTWFwUG9pbnQoY3h5OiBnZW8uUG9pbnQpIHtcclxuICAgICAgICBjb25zdCBzY3JvbGxPZmZzZXQgPSB0aGlzLmdldFNjcm9sbE9mZnNldCgpXHJcbiAgICAgICAgY29uc3QgbXh5ID0gY3h5LnN1YlBvaW50KHNjcm9sbE9mZnNldCkuZGl2U2NhbGFyKHJsLnRpbGVTaXplKVxyXG4gICAgICAgIHJldHVybiBteHlcclxuICAgIH1cclxuXHJcbiAgICBtYXBUb0NhbnZhc1BvaW50KG14eTogZ2VvLlBvaW50KSB7XHJcbiAgICAgICAgY29uc3Qgc2Nyb2xsT2Zmc2V0ID0gdGhpcy5nZXRTY3JvbGxPZmZzZXQoKVxyXG4gICAgICAgIGNvbnN0IGN4eSA9IG14eS5tdWxTY2FsYXIocmwudGlsZVNpemUpLmFkZFBvaW50KHNjcm9sbE9mZnNldClcclxuICAgICAgICByZXR1cm4gY3h5XHJcbiAgICB9XHJcblxyXG4gICAgdGlja1BsYXllcihjbWQ6IENvbW1hbmQpIHtcclxuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLnBsYXllclxyXG4gICAgICAgIHN3aXRjaCAoY21kLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5PcGVuOiB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQuaW5mbyhcIkRvb3Igb3BlbmVkXCIpXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1hcC5maXh0dXJlcy5kZWxldGUoY21kLmZpeHR1cmUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIENvbW1hbmRUeXBlLlBhc3M6IHtcclxuICAgICAgICAgICAgICAgIG91dHB1dC5pbmZvKFwiUGFzc1wiKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5Nb3ZlOiB7XHJcbiAgICAgICAgICAgICAgICBwbGF5ZXIucG9zaXRpb24gPSBjbWQucG9zaXRpb25cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuRXF1aXA6IHtcclxuICAgICAgICAgICAgICAgIG91dHB1dC5lcnJvcihcIkVxdWlwIG5vdCB5ZXQgaW1wbGVtZW50ZWRcIilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuVXNlOiB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQuZXJyb3IoXCJVc2Ugbm90IHlldCBpbXBsZW1lbnRlZFwiKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBDb21tYW5kVHlwZS5BdHRhY2s6IHtcclxuICAgICAgICAgICAgICAgIG91dHB1dC5lcnJvcihcIkF0dGFjayBub3QgeWV0IGltcGxlbWVudGVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIENvbW1hbmRUeXBlLkNsaW1iVXA6IHtcclxuICAgICAgICAgICAgICAgIG91dHB1dC5lcnJvcihcIkNsaW1iIHVwIG5vdCB5ZXQgaW1wbGVtZW50ZWRcIilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZFR5cGUuQ2xpbWJEb3duOiB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQuZXJyb3IoXCJDbGltYiBkb3duIHlldCBpbXBsZW1lbnRlZFwiKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aWNrTW9uc3Rlcihtb25zdGVyOiBybC5Nb25zdGVyKSB7XHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHdoZXRoZXIgbW9uc3RlciBjYW4gc2VlIHBsYXllclxyXG4gICAgICAgIGlmICghbW9uc3Rlci5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgaWYgKCFtYXAucGxheWVyLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGNhblNlZShtYXAsIG1vbnN0ZXIucG9zaXRpb24sIG1hcC5wbGF5ZXIucG9zaXRpb24pICYmIG1vbnN0ZXIuc3RhdGUgIT09IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dybykge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHttb25zdGVyLm5hbWV9IGhhcyBzcG90dGVkIHlvdSFgKVxyXG4gICAgICAgICAgICBtb25zdGVyLnN0YXRlID0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIWNhblNlZShtYXAsIG1vbnN0ZXIucG9zaXRpb24sIG1hcC5wbGF5ZXIucG9zaXRpb24pICYmIG1vbnN0ZXIuc3RhdGUgPT09IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dybykge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHttb25zdGVyLm5hbWV9IGhhcyBsb3N0IHNpZ2h0IG9mIHlvdSFgKVxyXG4gICAgICAgICAgICBtb25zdGVyLnN0YXRlID0gcmwuTW9uc3RlclN0YXRlLmlkbGVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaGFuZGxlUmVzaXplKCkge1xyXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IHRoaXMuY2FudmFzXHJcbiAgICAgICAgaWYgKGNhbnZhcy53aWR0aCA9PT0gY2FudmFzLmNsaWVudFdpZHRoICYmIGNhbnZhcy5oZWlnaHQgPT09IGNhbnZhcy5jbGllbnRIZWlnaHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYW52YXMud2lkdGggPSBjYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgfVxyXG5cclxuICAgIGhhbmRsZUlucHV0KCk6IENvbW1hbmQgfCBudWxsIHtcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgY29uc3QgaW5wID0gdGhpcy5pbnBcclxuXHJcbiAgICAgICAgaWYgKCFwbGF5ZXIucG9zaXRpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gcGxheWVyLnBvc2l0aW9uLmNsb25lKClcclxuXHJcbiAgICAgICAgaWYgKGlucC5tb3VzZUxlZnRQcmVzc2VkKSB7XHJcbiAgICAgICAgICAgIC8vIGRldGVybWluZSB0aGUgbWFwIGNvb3JkaW5hdGVzIHRoZSB1c2VyIGNsaWNrZWQgb25cclxuICAgICAgICAgICAgY29uc3QgbXh5ID0gdGhpcy5jYW52YXNUb01hcFBvaW50KG5ldyBnZW8uUG9pbnQoaW5wLm1vdXNlWCwgaW5wLm1vdXNlWSkpLmZsb29yKClcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNsaWNrRml4dHVyZSA9IG1hcC5maXh0dXJlQXQobXh5KVxyXG4gICAgICAgICAgICBpZiAoY2xpY2tGaXh0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke2NsaWNrRml4dHVyZS5uYW1lfWApXHJcbiAgICAgICAgICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgY2xpY2tDcmVhdHVyZSA9IG1hcC5tb25zdGVyQXQobXh5KVxyXG4gICAgICAgICAgICBpZiAoY2xpY2tDcmVhdHVyZSkge1xyXG4gICAgICAgICAgICAgICAgb3V0cHV0LmluZm8oYFlvdSBzZWUgJHtjbGlja0NyZWF0dXJlLm5hbWV9YClcclxuICAgICAgICAgICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBkeHkgPSBteHkuc3ViUG9pbnQocGxheWVyLnBvc2l0aW9uKVxyXG4gICAgICAgICAgICBjb25zdCBzZ24gPSBkeHkuc2lnbigpXHJcbiAgICAgICAgICAgIGNvbnN0IGFicyA9IGR4eS5hYnMoKVxyXG5cclxuICAgICAgICAgICAgaWYgKGFicy54ID4gMCAmJiBhYnMueCA+PSBhYnMueSkge1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb24ueCArPSBzZ24ueFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYWJzLnkgPiAwICYmIGFicy55ID4gYWJzLngpIHtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uLnkgKz0gc2duLnlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJ3XCIpKSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnkgLT0gMVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChpbnAucHJlc3NlZChcInNcIikpIHtcclxuICAgICAgICAgICAgcG9zaXRpb24ueSArPSAxXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGlucC5wcmVzc2VkKFwiYVwiKSkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbi54IC09IDFcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJkXCIpKSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnggKz0gMVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJ6XCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdHNEaWFsb2cuc2hvdygpXHJcbiAgICAgICAgfSBlbHNlIGlmIChpbnAucHJlc3NlZChcImlcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnZlbnRvcnlEaWFsb2cuc2hvdygpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpbnAuZmx1c2goKVxyXG5cclxuICAgICAgICBpZiAocG9zaXRpb24uZXF1YWwocGxheWVyLnBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdGlsZSA9IG1hcC50aWxlQXQocG9zaXRpb24pXHJcbiAgICAgICAgaWYgKHRpbGUgJiYgIXRpbGUucGFzc2FibGUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYENhbid0IG1vdmUgdGhhdCB3YXksIGJsb2NrZWQgYnkgJHt0aWxlLm5hbWV9YClcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IG1hcC5jb250YWluZXJBdChwb3NpdGlvbilcclxuICAgICAgICBpZiAoY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyRGlhbG9nLnNob3coY29udGFpbmVyKVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZml4dHVyZSA9IG1hcC5maXh0dXJlQXQocG9zaXRpb24pXHJcbiAgICAgICAgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5Eb29yKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBDb21tYW5kVHlwZS5PcGVuLFxyXG4gICAgICAgICAgICAgICAgZml4dHVyZTogZml4dHVyZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChmaXh0dXJlIGluc3RhbmNlb2YgcmwuU3RhaXJzVXApIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogQ29tbWFuZFR5cGUuQ2xpbWJVcCB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChmaXh0dXJlIGluc3RhbmNlb2YgcmwuU3RhaXJzRG93bikge1xyXG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiBDb21tYW5kVHlwZS5DbGltYkRvd24gfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoZml4dHVyZSAmJiAhZml4dHVyZS5wYXNzYWJsZSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgQ2FuJ3QgbW92ZSB0aGF0IHdheSwgYmxvY2tlZCBieSAke2ZpeHR1cmUubmFtZX1gKVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbW9uc3RlciA9IG1hcC5tb25zdGVyQXQocG9zaXRpb24pXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIgJiYgIW1vbnN0ZXIucGFzc2FibGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IENvbW1hbmRUeXBlLkF0dGFjayxcclxuICAgICAgICAgICAgICAgIG1vbnN0ZXI6IG1vbnN0ZXJcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdHlwZTogQ29tbWFuZFR5cGUuTW92ZSxcclxuICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGRyYXdGcmFtZSgpIHtcclxuICAgICAgICB0aGlzLmhhbmRsZVJlc2l6ZSgpXHJcblxyXG4gICAgICAgIC8vIGNlbnRlciB0aGUgZ3JpZCBhcm91bmQgdGhlIHBsYXllcmRcclxuICAgICAgICBjb25zdCBvZmZzZXQgPSB0aGlzLmdldFNjcm9sbE9mZnNldCgpXHJcblxyXG4gICAgICAgIC8vIG5vdGUgLSBkcmF3aW5nIG9yZGVyIG1hdHRlcnMgLSBkcmF3IGZyb20gYm90dG9tIHRvIHRvcFxyXG5cclxuICAgICAgICAvLyBkcmF3IHZhcmlvdXMgbGF5ZXJzIG9mIHNwcml0ZXNcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGZvciAoY29uc3QgdGlsZSBvZiBtYXAudGlsZXMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCB0aWxlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBmaXh0dXJlIG9mIG1hcC5maXh0dXJlcykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIGZpeHR1cmUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGNyZWF0dXJlIG9mIG1hcC5tb25zdGVycykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIGNyZWF0dXJlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCB0aGlzLnBsYXllcilcclxuICAgICAgICB0aGlzLmRyYXdIZWFsdGhCYXIob2Zmc2V0LCB0aGlzLnBsYXllcilcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5mbHVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgZHJhd1RoaW5nKG9mZnNldDogZ2VvLlBvaW50LCB0aDogcmwuVGhpbmcpIHtcclxuICAgICAgICAvLyBkb24ndCBkcmF3IHRoaW5ncyB0aGF0IGFyZW4ndCBwb3NpdGlvbmVkXHJcbiAgICAgICAgaWYgKCF0aC5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aC52aXNpYmxlID09PSBybC5WaXNpYmlsaXR5Lk5vbmUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb2xvciA9IHRoLmNvbG9yLmNsb25lKClcclxuICAgICAgICBpZiAodGgudmlzaWJsZSA9PT0gcmwuVmlzaWJpbGl0eS5Gb2cpIHtcclxuICAgICAgICAgICAgY29sb3IuYSA9IC41XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzcHJpdGVQb3NpdGlvbiA9IHRoLnBvc2l0aW9uLm11bFNjYWxhcihybC50aWxlU2l6ZSkuYWRkUG9pbnQob2Zmc2V0KVxyXG4gICAgICAgIGNvbnN0IHNwcml0ZSA9IG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLFxyXG4gICAgICAgICAgICBjb2xvcjogY29sb3IsXHJcbiAgICAgICAgICAgIHdpZHRoOiBybC50aWxlU2l6ZSxcclxuICAgICAgICAgICAgaGVpZ2h0OiBybC50aWxlU2l6ZSxcclxuICAgICAgICAgICAgdGV4dHVyZTogdGgudGV4dHVyZSxcclxuICAgICAgICAgICAgbGF5ZXI6IHRoLnRleHR1cmVMYXllcixcclxuICAgICAgICAgICAgZmxhZ3M6IGdmeC5TcHJpdGVGbGFncy5BcnJheVRleHR1cmVcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdTcHJpdGUoc3ByaXRlKVxyXG4gICAgfVxyXG5cclxuICAgIGRyYXdIZWFsdGhCYXIob2Zmc2V0OiBnZW8uUG9pbnQsIGNyZWF0dXJlOiBybC5DcmVhdHVyZSkge1xyXG4gICAgICAgIGlmICghY3JlYXR1cmUucG9zaXRpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB3aWR0aCA9IGNyZWF0dXJlLm1heEhlYWx0aCAqIDQgKyAyXHJcbiAgICAgICAgY29uc3Qgc3ByaXRlUG9zaXRpb24gPSBjcmVhdHVyZS5wb3NpdGlvbi5tdWxTY2FsYXIocmwudGlsZVNpemUpLmFkZFBvaW50KG9mZnNldCkuc3ViUG9pbnQobmV3IGdlby5Qb2ludCgwLCBybC50aWxlU2l6ZSAvIDIpKVxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd1Nwcml0ZShuZXcgZ2Z4LlNwcml0ZSh7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBzcHJpdGVQb3NpdGlvbixcclxuICAgICAgICAgICAgY29sb3I6IGdmeC5Db2xvci53aGl0ZSxcclxuICAgICAgICAgICAgd2lkdGg6IHdpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IDhcclxuICAgICAgICB9KSlcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3U3ByaXRlKG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLmFkZFBvaW50KG5ldyBnZW8uUG9pbnQoMSwgMSkpLFxyXG4gICAgICAgICAgICBjb2xvcjogZ2Z4LkNvbG9yLnJlZCxcclxuICAgICAgICAgICAgd2lkdGg6IHdpZHRoIC0gMixcclxuICAgICAgICAgICAgaGVpZ2h0OiA2XHJcbiAgICAgICAgfSkpXHJcbiAgICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICBjb25zdCBhcHAgPSBuZXcgQXBwKClcclxuICAgIGF3YWl0IGFwcC5leGVjKClcclxufVxyXG5cclxuaW5pdCgpIl19