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
import * as rand from "../shared/rand.js";
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
        var _a;
        const healthSpan = dom.byId("statsHealth");
        const player = this.player;
        const attackSpan = dom.byId("statsAttack");
        const defenseSpan = dom.byId("statsDefense");
        const agilitySpan = dom.byId("statsAgility");
        const damageSpan = dom.byId("statsDamage");
        const levelSpan = dom.byId("statsLevel");
        const experienceSpan = dom.byId("statsExperience");
        const experienceRequirement = rl.getExperienceRequirement(player.level + 1);
        healthSpan.textContent = `${player.health} / ${player.maxHealth}`;
        attackSpan.textContent = `${player.attack}`;
        defenseSpan.textContent = `${player.defense}`;
        agilitySpan.textContent = `${player.agility}`;
        const weapon = (_a = this.player.weapon) !== null && _a !== void 0 ? _a : things.fists;
        damageSpan.textContent = `${weapon.damage.min} - ${weapon.damage.max}`;
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
        this.infoDiv = dom.byId("inventoryInfo");
        this.emptyDiv = dom.byId("inventoryEmpty");
        this.table = dom.byId("inventoryTable");
        this.itemTemplate = dom.byId("inventoryItemTemplate");
        this.nextPageButton = dom.byId("inventoryNextPageButton");
        this.prevPageButton = dom.byId("inventoryPrevPageButton");
        this.closeButton = dom.byId("inventoryCloseButton");
        this.pageSize = 9;
        this.pageIndex = 0;
        this.selectedIndex = -1;
        this.openButton.addEventListener("click", () => this.toggle());
        this.closeButton.addEventListener("click", () => this.hide());
        this.nextPageButton.addEventListener("click", () => {
            this.pageIndex++;
            this.pageIndex = Math.min(this.pageIndex, Math.ceil(this.player.inventory.size / this.pageSize));
            this.refresh();
        });
        this.prevPageButton.addEventListener("click", () => {
            this.pageIndex--;
            this.pageIndex = Math.max(this.pageIndex, 0);
            this.refresh();
        });
        this.elem.addEventListener("keypress", (ev) => {
            const key = ev.key.toUpperCase();
            if (key === "I" || key === "C") {
                this.hide();
            }
            const index = parseInt(ev.key);
            if (index && index > 0 && index <= 9) {
                this.selectedIndex = index - 1;
                this.refresh();
            }
            if (key === "U" && this.selectedIndex >= 0) {
                this.use(this.selectedIndex);
            }
            if (key === "E" && this.selectedIndex >= 0) {
                this.equip(this.selectedIndex);
            }
            if (key === "R" && this.selectedIndex >= 0) {
                this.remove(this.selectedIndex);
            }
            if (key === "D" && this.selectedIndex >= 0) {
                this.drop(this.selectedIndex);
            }
        });
        dom.delegate(this.elem, "click", ".inventory-use-button", (ev) => {
            ev.stopImmediatePropagation();
            const index = this.getRowIndex(ev.target);
            this.use(index);
        });
        dom.delegate(this.elem, "click", ".inventory-drop-button", (ev) => {
            ev.stopImmediatePropagation();
            const index = this.getRowIndex(ev.target);
            this.drop(index);
        });
        dom.delegate(this.elem, "click", ".inventory-equip-button", (ev) => {
            ev.stopImmediatePropagation();
            const index = this.getRowIndex(ev.target);
            this.equip(index);
        });
        dom.delegate(this.elem, "click", ".inventory-remove-button", (ev) => {
            ev.stopImmediatePropagation();
            const index = this.getRowIndex(ev.target);
            this.remove(index);
        });
        dom.delegate(this.elem, "click", ".item-row", (ev) => {
            const row = ev.target.closest(".item-row");
            if (row) {
                this.select(row);
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
        if (this.player.inventory.size === 0) {
            this.emptyDiv.hidden = false;
            this.infoDiv.hidden = true;
        }
        else {
            this.emptyDiv.hidden = true;
            this.infoDiv.hidden = false;
        }
        const pageCount = Math.ceil(this.player.inventory.size / this.pageSize);
        this.pageIndex = Math.min(Math.max(0, this.pageIndex), pageCount - 1);
        this.prevPageButton.disabled = this.pageIndex <= 0;
        this.nextPageButton.disabled = this.pageIndex >= pageCount - 1;
        this.infoDiv.textContent = `Page ${this.pageIndex + 1} of ${pageCount}`;
        const items = getSortedItemsPage(this.player.inventory, this.pageIndex, this.pageSize);
        this.selectedIndex = Math.min(this.selectedIndex, items.length - 1);
        for (let i = 0; i < items.length; ++i) {
            const item = items[i];
            const fragment = this.itemTemplate.content.cloneNode(true);
            const tr = dom.bySelector(fragment, ".item-row");
            const itemIndexTd = dom.bySelector(tr, ".item-index");
            const itemNameTd = dom.bySelector(tr, ".item-name");
            const equipButton = dom.bySelector(tr, ".inventory-equip-button");
            const removeButton = dom.bySelector(tr, ".inventory-remove-button");
            const useButton = dom.bySelector(tr, ".inventory-use-button");
            itemIndexTd.textContent = (i + 1).toString();
            itemNameTd.textContent = item.name;
            if (!(item instanceof rl.Usable)) {
                useButton.remove();
            }
            if (!rl.isEquippable(item) || this.player.isEquipped(item)) {
                equipButton.remove();
            }
            if (!this.player.isEquipped(item)) {
                removeButton.remove();
            }
            if (i === this.selectedIndex) {
                tr.classList.add("selected");
            }
            tbody.appendChild(fragment);
        }
    }
    select(selectedRow) {
        const rows = Array.from(this.elem.querySelectorAll(".item-row"));
        for (const row of rows) {
            row.classList.remove("selected");
        }
        selectedRow.classList.add("selected");
    }
    getRowIndex(elem) {
        const index = dom.getElementIndex(elem.closest(".item-row"));
        return index;
    }
    use(index) {
        const i = this.pageIndex * this.pageSize + index;
        const item = getSortedItems(this.player.inventory)[i];
        if (!(item instanceof rl.Usable)) {
            return;
        }
        useItem(this.player, item);
        this.refresh();
    }
    drop(index) {
        const i = this.pageIndex * this.pageSize + index;
        const item = getSortedItems(this.player.inventory)[i];
        dropItem(this.player, item);
        this.refresh();
    }
    equip(index) {
        const i = this.pageIndex * this.pageSize + index;
        const item = getSortedItems(this.player.inventory)[i];
        if (!rl.isEquippable(item)) {
            return;
        }
        equipItem(this.player, item);
        this.refresh();
    }
    remove(index) {
        const i = this.pageIndex * this.pageSize + index;
        const item = getSortedItems(this.player.inventory)[i];
        if (!rl.isEquippable(item)) {
            return;
        }
        removeItem(this.player, item);
        this.refresh();
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
        const elem = this.dialog.elem;
        dom.delegate(elem, "click", ".container-take-button", (ev) => {
            if (!this.container) {
                return;
            }
            const btn = ev.target;
            const row = btn.closest(".item-row");
            const idx = dom.getElementIndex(row);
            this.take(idx);
        });
        elem.addEventListener("keypress", (ev) => {
            const key = ev.key.toUpperCase();
            if (key === "C") {
                this.hide();
            }
            if (key === "A") {
                this.takeAll();
            }
            const index = parseInt(ev.key);
            if (index && index > 0 && index <= 9) {
                this.take(index - 1);
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
        if (this.map && this.container && this.container.items.size == 0) {
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
        for (let i = 0; i < items.length; ++i) {
            const item = items[i];
            const fragment = this.containerItemTemplate.content.cloneNode(true);
            const tr = dom.bySelector(fragment, ".item-row");
            const itemIndexTd = dom.bySelector(tr, ".item-index");
            const itemNameTd = dom.bySelector(tr, ".item-name");
            itemIndexTd.textContent = `${i + 1}`;
            itemNameTd.textContent = item.name;
            tbody.appendChild(fragment);
        }
    }
    take(index) {
        if (!this.container) {
            return;
        }
        const item = getSortedItems(this.container.items)[index];
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
class DefeatDialog {
    constructor(canvas) {
        this.tryAgainButton = dom.byId("tryAgainButton");
        this.dialog = new Dialog(dom.byId("defeatDialog"), canvas);
        this.tryAgainButton.addEventListener("click", () => this.tryAgain());
        this.dialog.elem.addEventListener("keypress", (ev) => {
            const key = ev.key.toUpperCase();
            if (key === "T") {
                this.tryAgain();
            }
            if (key === "ENTER") {
                this.tryAgain();
            }
        });
    }
    show() {
        this.dialog.show();
    }
    tryAgain() {
        window.location.reload(false);
    }
}
function getSortedItems(items) {
    const sortedItems = array.orderBy(items, i => i.name);
    return sortedItems;
}
function getSortedItemsPage(items, pageIndex, pageSize) {
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    const sortedItems = getSortedItems(items);
    const page = sortedItems.slice(startIndex, endIndex);
    return page;
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
        this.defeatDialog = new DefeatDialog(this.canvas);
        this.map = new maps.Map(0, 0, this.player);
        const player = this.player;
        player.inventory.add(things.healthPotion.clone());
        player.inventory.add(things.clothArmor);
    }
    async exec() {
        this.canvas.focus();
        this.map = await gen.generateMap(this.player, this.renderer, 32, 32);
        if (!this.player.position) {
            throw new Error("Player is not positioned");
        }
        output.write("Your adventure begins");
        maps.updateVisibility(this.map, this.map.player.position, rl.lightRadius);
        requestAnimationFrame(() => this.tick());
    }
    tick() {
        const nextCreature = this.getNextCreature();
        if (nextCreature instanceof rl.Player) {
            if (this.handleInput()) {
                maps.updateVisibility(this.map, this.player.position, rl.lightRadius);
            }
        }
        else if (nextCreature instanceof rl.Monster) {
            this.tickMonster(nextCreature);
        }
        else {
            this.tickRound();
        }
        this.drawFrame();
        requestAnimationFrame(() => this.tick());
    }
    getNextMonster() {
        // determine whose turn it is
        let nextMonster = null;
        for (const monster of this.map.monsters) {
            if (monster.state !== rl.MonsterState.aggro) {
                continue;
            }
            if (monster.action <= 0) {
                continue;
            }
            if (!nextMonster || monster.action > nextMonster.action) {
                nextMonster = monster;
            }
        }
        return nextMonster;
    }
    getNextCreature() {
        var _a;
        const monster = this.getNextMonster();
        if (this.player.action > 0 && this.player.action > ((_a = monster === null || monster === void 0 ? void 0 : monster.action) !== null && _a !== void 0 ? _a : 0)) {
            return this.player;
        }
        return monster;
    }
    tickRound() {
        // accumulate action points
        for (const monster of array.filter(this.map.monsters, m => m.state === rl.MonsterState.aggro)) {
            const reserve = Math.min(monster.actionReserve, monster.agility);
            monster.action = monster.agility + reserve;
            monster.actionReserve = 0;
        }
        // cap action reserve 
        const reserve = Math.min(this.player.actionReserve, this.player.agility);
        this.player.action = this.player.agility + reserve;
        this.player.actionReserve = 0;
        this.updateMonsterStates();
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
    processPlayerAttack(defender) {
        var _a;
        // base 60% chance to hit
        // 10% bonus / penalty for every point difference between attack and defense
        // bottoms out at 5% - always SOME chance to hit
        const attacker = this.player;
        const bonus = (attacker.attack - defender.defense) * .1;
        const hitChance = Math.min(Math.max(.6 + bonus, .05), .95);
        const hit = rand.chance(hitChance);
        const weapon = (_a = attacker.weapon) !== null && _a !== void 0 ? _a : things.fists;
        const attackVerb = weapon.verb ? weapon.verb : "attacks";
        attacker.action -= weapon.action;
        if (!hit) {
            output.warning(`${attacker.name} ${attackVerb} ${defender.name} but misses!`);
            return;
        }
        // hit - calculate damage
        const damage = weapon.damage.roll();
        output.warning(`${attacker.name} ${attackVerb} ${defender.name} and hits for ${damage} damage!`);
        defender.health -= damage;
        if (defender.health < 0) {
            output.warning(`${defender.name} has been defeated and ${attacker.name} receives ${defender.experience} experience`);
            this.player.experience += defender.experience;
            this.map.monsters.delete(defender);
        }
    }
    processMonsterAttack(attacker, attack) {
        // base 60% chance to hit
        // 10% bonus / penalty for every point difference between attack and defense
        // clamps to out at [5, 95] - always SOME chance to hit or miss
        // choose an attack from repertoire of monster
        const defender = this.player;
        const bonus = (attack.attack - defender.defense) * .1;
        const hitChance = Math.max(.6 + bonus, .05);
        const hit = rand.chance(hitChance);
        const attackVerb = attack.verb ? attack.verb : "attacks";
        attacker.action -= attack.action;
        if (!hit) {
            output.warning(`${attacker.name} ${attackVerb} ${defender.name} but misses!`);
            return;
        }
        // hit - calculate damage
        const damage = attack.damage.roll();
        output.warning(`${attacker.name} ${attackVerb} ${defender.name} and hits for ${damage} damage!`);
        defender.health -= damage;
        if (defender.health <= 0) {
            output.warning(`${defender.name} has been defeated!`);
            this.defeatDialog.show();
        }
    }
    updateMonsterStates() {
        for (const monster of this.map.monsters) {
            this.updateMonsterState(monster);
        }
    }
    updateMonsterState(monster) {
        // aggro state
        const map = this.map;
        if (monster.state !== rl.MonsterState.aggro && canSee(map, monster.position, map.player.position)) {
            monster.action = 0;
            monster.state = rl.MonsterState.aggro;
        }
        if (monster.state === rl.MonsterState.aggro && !canSee(map, monster.position, map.player.position)) {
            monster.action = 0;
            monster.state = rl.MonsterState.idle;
        }
    }
    tickMonster(monster) {
        // if player is within reach (and alive), attack
        if (this.player.health > 0) {
            const distanceToPlayer = geo.calcManhattenDist(this.player.position, monster.position);
            const attacks = monster.attacks.filter(a => a.range >= distanceToPlayer);
            if (attacks.length > 0) {
                const attack = rand.choose(attacks);
                this.processMonsterAttack(monster, attack);
                return;
            }
        }
        // determine whether monster can see player
        // seek and destroy
        const map = this.map;
        const path = maps.findPath(map, monster.position, this.player.position);
        if (path.length === 0) {
            // pass
            monster.action = 0;
            return;
        }
        const position = path[0];
        if (map.isPassable(position)) {
            monster.action -= 1;
            monster.position = path[0];
        }
        else {
            monster.action = 0;
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
        const position = player.position.clone();
        if (inp.mouseLeftPressed) {
            // determine the map coordinates the user clicked on
            const mxy = this.canvasToMapPoint(new geo.Point(inp.mouseX, inp.mouseY)).floor();
            const clickFixture = map.fixtureAt(mxy);
            if (clickFixture) {
                output.info(`You see ${clickFixture.name}`);
                inp.flush();
                return false;
            }
            const clickCreature = map.monsterAt(mxy);
            if (clickCreature) {
                output.info(`You see ${clickCreature.name}`);
                inp.flush();
                return false;
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
        else if (inp.pressed("w") || inp.pressed("ArrowUp")) {
            position.y -= 1;
        }
        else if (inp.pressed("s") || inp.pressed("ArrowDown")) {
            position.y += 1;
        }
        else if (inp.pressed("a") || inp.pressed("ArrowLeft")) {
            position.x -= 1;
        }
        else if (inp.pressed("d") || inp.pressed("ArrowRight")) {
            position.x += 1;
        }
        else if (inp.pressed("z")) {
            this.statsDialog.show();
        }
        else if (inp.pressed("i")) {
            this.inventoryDialog.show();
        }
        else if (inp.pressed(" ")) {
            this.player.actionReserve += this.player.action;
            this.player.action = 0;
            inp.flush();
            return true;
        }
        inp.flush();
        if (position.equal(player.position)) {
            return false;
        }
        const tile = map.tileAt(position);
        if (tile && !tile.passable) {
            output.info(`Blocked by ${tile.name}`);
            return false;
        }
        const monster = map.monsterAt(position);
        if (monster) {
            this.processPlayerAttack(monster);
            return true;
        }
        const container = map.containerAt(position);
        if (container) {
            this.containerDialog.show(map, container);
            return false;
        }
        const fixture = map.fixtureAt(position);
        if (fixture instanceof rl.Door) {
            output.info(`${fixture.name} opened`);
            this.map.fixtures.delete(fixture);
            player.action -= 1;
            return true;
        }
        else if (fixture instanceof rl.StairsUp) {
            output.error("Stairs not implemented");
        }
        else if (fixture instanceof rl.StairsDown) {
            output.error("Stairs not implemented");
        }
        else if (fixture && !fixture.passable) {
            output.info(`Can't move that way, blocked by ${fixture.name}`);
            return false;
        }
        player.position = position;
        player.action -= 1;
        return true;
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
        const health = Math.max(creature.health, 0);
        const borderWidth = health * 4 + 2;
        const interiorWidth = health * 4;
        const spritePosition = creature.position.mulScalar(rl.tileSize).addPoint(offset).subPoint(new geo.Point(0, rl.tileSize / 2));
        this.renderer.drawSprite(new gfx.Sprite({
            position: spritePosition,
            color: gfx.Color.white,
            width: borderWidth,
            height: 8
        }));
        this.renderer.drawSprite(new gfx.Sprite({
            position: spritePosition.addPoint(new geo.Point(1, 1)),
            color: gfx.Color.red,
            width: interiorWidth,
            height: 6
        }));
    }
}
async function init() {
    const app = new App();
    await app.exec();
}
init();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBQ2pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFFekMsTUFBTSxNQUFNO0lBRVIsWUFBNEIsSUFBaUIsRUFBbUIsTUFBeUI7UUFBN0QsU0FBSSxHQUFKLElBQUksQ0FBYTtRQUFtQixXQUFNLEdBQU4sTUFBTSxDQUFtQjtRQUR4RSxvQkFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQW1CLENBQUE7SUFDYSxDQUFDO0lBRTlGLElBQUk7UUFDQSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVELElBQUk7UUFDQSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7UUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFN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QUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RELEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUc7WUFDcEIsS0FBSyxFQUFFLGFBQWE7WUFDcEIsTUFBTSxFQUFFLENBQUM7U0FDWixDQUFDLENBQUMsQ0FBQTtJQUNQLENBQUM7Q0FDSjtBQUVELEtBQUssVUFBVSxJQUFJO0lBQ2YsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQTtJQUNyQixNQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtBQUNwQixDQUFDO0FBRUQsSUFBSSxFQUFFLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBkb20gZnJvbSBcIi4uL3NoYXJlZC9kb20uanNcIlxyXG5pbXBvcnQgKiBhcyBhcnJheSBmcm9tIFwiLi4vc2hhcmVkL2FycmF5LmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbiBmcm9tIFwiLi9nZW4uanNcIlxyXG5pbXBvcnQgKiBhcyBpbnB1dCBmcm9tIFwiLi4vc2hhcmVkL2lucHV0LmpzXCJcclxuaW1wb3J0ICogYXMgcmwgZnJvbSBcIi4vcmwuanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcbmltcG9ydCAqIGFzIG91dHB1dCBmcm9tIFwiLi9vdXRwdXQuanNcIlxyXG5pbXBvcnQgKiBhcyB0aGluZ3MgZnJvbSBcIi4vdGhpbmdzLmpzXCJcclxuaW1wb3J0ICogYXMgbWFwcyBmcm9tIFwiLi9tYXBzLmpzXCJcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIlxyXG5cclxuY2xhc3MgRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbW9kYWxCYWNrZ3JvdW5kID0gZG9tLmJ5SWQoXCJtb2RhbEJhY2tncm91bmRcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBlbGVtOiBIVE1MRWxlbWVudCwgcHJpdmF0ZSByZWFkb25seSBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7IH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIHRoaXMubW9kYWxCYWNrZ3JvdW5kLmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5lbGVtLmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5lbGVtLmZvY3VzKClcclxuICAgIH1cclxuXHJcbiAgICBoaWRlKCkge1xyXG4gICAgICAgIHRoaXMubW9kYWxCYWNrZ3JvdW5kLmhpZGRlbiA9IHRydWVcclxuICAgICAgICB0aGlzLmVsZW0uaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuY2FudmFzLmZvY3VzKClcclxuICAgIH1cclxuXHJcbiAgICB0b2dnbGUoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZWxlbS5oaWRkZW4pIHtcclxuICAgICAgICAgICAgdGhpcy5zaG93KClcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU3RhdHNEaWFsb2cgZXh0ZW5kcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBvcGVuQnV0dG9uID0gZG9tLmJ5SWQoXCJzdGF0c0J1dHRvblwiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwic3RhdHNDbG9zZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXIsIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICBzdXBlcihkb20uYnlJZChcInN0YXRzRGlhbG9nXCIpLCBjYW52YXMpXHJcblxyXG4gICAgICAgIHRoaXMub3BlbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy50b2dnbGUoKSlcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuXHJcbiAgICAgICAgdGhpcy5lbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgaWYgKGV2LmtleS50b1VwcGVyQ2FzZSgpID09PSBcIlpcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICBjb25zdCBoZWFsdGhTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0hlYWx0aFwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLnBsYXllclxyXG4gICAgICAgIGNvbnN0IGF0dGFja1NwYW4gPSBkb20uYnlJZChcInN0YXRzQXR0YWNrXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGRlZmVuc2VTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0RlZmVuc2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgYWdpbGl0eVNwYW4gPSBkb20uYnlJZChcInN0YXRzQWdpbGl0eVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBkYW1hZ2VTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0RhbWFnZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBsZXZlbFNwYW4gPSBkb20uYnlJZChcInN0YXRzTGV2ZWxcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZXhwZXJpZW5jZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRXhwZXJpZW5jZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBleHBlcmllbmNlUmVxdWlyZW1lbnQgPSBybC5nZXRFeHBlcmllbmNlUmVxdWlyZW1lbnQocGxheWVyLmxldmVsICsgMSlcclxuXHJcbiAgICAgICAgaGVhbHRoU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5oZWFsdGh9IC8gJHtwbGF5ZXIubWF4SGVhbHRofWBcclxuICAgICAgICBhdHRhY2tTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmF0dGFja31gXHJcbiAgICAgICAgZGVmZW5zZVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuZGVmZW5zZX1gXHJcbiAgICAgICAgYWdpbGl0eVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuYWdpbGl0eX1gXHJcblxyXG4gICAgICAgIGNvbnN0IHdlYXBvbiA9IHRoaXMucGxheWVyLndlYXBvbiA/PyB0aGluZ3MuZmlzdHNcclxuICAgICAgICBkYW1hZ2VTcGFuLnRleHRDb250ZW50ID0gYCR7d2VhcG9uLmRhbWFnZS5taW59IC0gJHt3ZWFwb24uZGFtYWdlLm1heH1gXHJcbiAgICAgICAgbGV2ZWxTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmxldmVsfWBcclxuICAgICAgICBleHBlcmllbmNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5leHBlcmllbmNlfSAvICR7ZXhwZXJpZW5jZVJlcXVpcmVtZW50fWBcclxuXHJcbiAgICAgICAgc3VwZXIuc2hvdygpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEludmVudG9yeURpYWxvZyBleHRlbmRzIERpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wZW5CdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeUJ1dHRvblwiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbmZvRGl2ID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlJbmZvXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVtcHR5RGl2ID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlFbXB0eVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0YWJsZSA9IGRvbS5ieUlkKFwiaW52ZW50b3J5VGFibGVcIikgYXMgSFRNTFRhYmxlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcImludmVudG9yeUl0ZW1UZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG5leHRQYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlOZXh0UGFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwcmV2UGFnZUJ1dHRvbiA9IGRvbS5ieUlkKFwiaW52ZW50b3J5UHJldlBhZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2xvc2VCdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeUNsb3NlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhZ2VTaXplOiBudW1iZXIgPSA5XHJcbiAgICBwcml2YXRlIHBhZ2VJbmRleDogbnVtYmVyID0gMFxyXG4gICAgcHJpdmF0ZSBzZWxlY3RlZEluZGV4OiBudW1iZXIgPSAtMVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXIsIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICBzdXBlcihkb20uYnlJZChcImludmVudG9yeURpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgICAgIHRoaXMub3BlbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy50b2dnbGUoKSlcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuXHJcbiAgICAgICAgdGhpcy5uZXh0UGFnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnBhZ2VJbmRleCsrXHJcbiAgICAgICAgICAgIHRoaXMucGFnZUluZGV4ID0gTWF0aC5taW4odGhpcy5wYWdlSW5kZXgsIE1hdGguY2VpbCh0aGlzLnBsYXllci5pbnZlbnRvcnkuc2l6ZSAvIHRoaXMucGFnZVNpemUpKVxyXG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMucHJldlBhZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5wYWdlSW5kZXgtLVxyXG4gICAgICAgICAgICB0aGlzLnBhZ2VJbmRleCA9IE1hdGgubWF4KHRoaXMucGFnZUluZGV4LCAwKVxyXG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuZWxlbS5hZGRFdmVudExpc3RlbmVyKFwia2V5cHJlc3NcIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGV2LmtleS50b1VwcGVyQ2FzZSgpXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiSVwiIHx8IGtleSA9PT0gXCJDXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoZXYua2V5KVxyXG4gICAgICAgICAgICBpZiAoaW5kZXggJiYgaW5kZXggPiAwICYmIGluZGV4IDw9IDkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IGluZGV4IC0gMVxyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJVXCIgJiYgdGhpcy5zZWxlY3RlZEluZGV4ID49IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudXNlKHRoaXMuc2VsZWN0ZWRJbmRleClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFXCIgJiYgdGhpcy5zZWxlY3RlZEluZGV4ID49IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXF1aXAodGhpcy5zZWxlY3RlZEluZGV4KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlJcIiAmJiB0aGlzLnNlbGVjdGVkSW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUodGhpcy5zZWxlY3RlZEluZGV4KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkRcIiAmJiB0aGlzLnNlbGVjdGVkSW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kcm9wKHRoaXMuc2VsZWN0ZWRJbmRleClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LXVzZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGV2LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5nZXRSb3dJbmRleChldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpXHJcbiAgICAgICAgICAgIHRoaXMudXNlKGluZGV4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LWRyb3AtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZ2V0Um93SW5kZXgoZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50KVxyXG4gICAgICAgICAgICB0aGlzLmRyb3AoaW5kZXgpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKHRoaXMuZWxlbSwgXCJjbGlja1wiLCBcIi5pbnZlbnRvcnktZXF1aXAtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZ2V0Um93SW5kZXgoZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50KVxyXG4gICAgICAgICAgICB0aGlzLmVxdWlwKGluZGV4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LXJlbW92ZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGV2LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5nZXRSb3dJbmRleChldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpXHJcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKGluZGV4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaXRlbS1yb3dcIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IChldi50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgaWYgKHJvdykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Qocm93IGFzIEhUTUxUYWJsZVJvd0VsZW1lbnQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICBzdXBlci5zaG93KClcclxuICAgIH1cclxuXHJcbiAgICByZWZyZXNoKCkge1xyXG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy50YWJsZS50Qm9kaWVzWzBdXHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRib2R5KVxyXG5cclxuICAgICAgICBpZiAodGhpcy5wbGF5ZXIuaW52ZW50b3J5LnNpemUgPT09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lbXB0eURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgICAgICB0aGlzLmluZm9EaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW1wdHlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgICAgICB0aGlzLmluZm9EaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBhZ2VDb3VudCA9IE1hdGguY2VpbCh0aGlzLnBsYXllci5pbnZlbnRvcnkuc2l6ZSAvIHRoaXMucGFnZVNpemUpXHJcbiAgICAgICAgdGhpcy5wYWdlSW5kZXggPSBNYXRoLm1pbihNYXRoLm1heCgwLCB0aGlzLnBhZ2VJbmRleCksIHBhZ2VDb3VudCAtIDEpXHJcbiAgICAgICAgdGhpcy5wcmV2UGFnZUJ1dHRvbi5kaXNhYmxlZCA9IHRoaXMucGFnZUluZGV4IDw9IDBcclxuICAgICAgICB0aGlzLm5leHRQYWdlQnV0dG9uLmRpc2FibGVkID0gdGhpcy5wYWdlSW5kZXggPj0gcGFnZUNvdW50IC0gMVxyXG5cclxuICAgICAgICB0aGlzLmluZm9EaXYudGV4dENvbnRlbnQgPSBgUGFnZSAke3RoaXMucGFnZUluZGV4ICsgMX0gb2YgJHtwYWdlQ291bnR9YFxyXG5cclxuICAgICAgICBjb25zdCBpdGVtcyA9IGdldFNvcnRlZEl0ZW1zUGFnZSh0aGlzLnBsYXllci5pbnZlbnRvcnksIHRoaXMucGFnZUluZGV4LCB0aGlzLnBhZ2VTaXplKVxyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWluKHRoaXMuc2VsZWN0ZWRJbmRleCwgaXRlbXMubGVuZ3RoIC0gMSlcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gaXRlbXNbaV1cclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0aGlzLml0ZW1UZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHRyID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLml0ZW0tcm93XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1JbmRleFRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0taW5kZXhcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLW5hbWVcIilcclxuICAgICAgICAgICAgY29uc3QgZXF1aXBCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LWVxdWlwLWJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCByZW1vdmVCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LXJlbW92ZS1idXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3QgdXNlQnV0dG9uID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLmludmVudG9yeS11c2UtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcblxyXG4gICAgICAgICAgICBpdGVtSW5kZXhUZC50ZXh0Q29udGVudCA9IChpICsgMSkudG9TdHJpbmcoKVxyXG4gICAgICAgICAgICBpdGVtTmFtZVRkLnRleHRDb250ZW50ID0gaXRlbS5uYW1lXHJcblxyXG4gICAgICAgICAgICBpZiAoIShpdGVtIGluc3RhbmNlb2YgcmwuVXNhYmxlKSkge1xyXG4gICAgICAgICAgICAgICAgdXNlQnV0dG9uLnJlbW92ZSgpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCFybC5pc0VxdWlwcGFibGUoaXRlbSkgfHwgdGhpcy5wbGF5ZXIuaXNFcXVpcHBlZChpdGVtKSkge1xyXG4gICAgICAgICAgICAgICAgZXF1aXBCdXR0b24ucmVtb3ZlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCF0aGlzLnBsYXllci5pc0VxdWlwcGVkKGl0ZW0pKSB7XHJcbiAgICAgICAgICAgICAgICByZW1vdmVCdXR0b24ucmVtb3ZlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGkgPT09IHRoaXMuc2VsZWN0ZWRJbmRleCkge1xyXG4gICAgICAgICAgICAgICAgdHIuY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNlbGVjdChzZWxlY3RlZFJvdzogSFRNTFRhYmxlUm93RWxlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IHJvd3MgPSBBcnJheS5mcm9tKHRoaXMuZWxlbS5xdWVyeVNlbGVjdG9yQWxsKFwiLml0ZW0tcm93XCIpKVxyXG4gICAgICAgIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcclxuICAgICAgICAgICAgcm93LmNsYXNzTGlzdC5yZW1vdmUoXCJzZWxlY3RlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2VsZWN0ZWRSb3cuY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRSb3dJbmRleChlbGVtOiBIVE1MQnV0dG9uRWxlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IGluZGV4ID0gZG9tLmdldEVsZW1lbnRJbmRleChlbGVtLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudClcclxuICAgICAgICByZXR1cm4gaW5kZXhcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVzZShpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaSA9IHRoaXMucGFnZUluZGV4ICogdGhpcy5wYWdlU2l6ZSArIGluZGV4XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEl0ZW1zKHRoaXMucGxheWVyLmludmVudG9yeSlbaV1cclxuICAgICAgICBpZiAoIShpdGVtIGluc3RhbmNlb2YgcmwuVXNhYmxlKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVzZUl0ZW0odGhpcy5wbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyb3AoaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGkgPSB0aGlzLnBhZ2VJbmRleCAqIHRoaXMucGFnZVNpemUgKyBpbmRleFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLnBsYXllci5pbnZlbnRvcnkpW2ldXHJcbiAgICAgICAgZHJvcEl0ZW0odGhpcy5wbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGVxdWlwKGluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBpID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplICsgaW5kZXhcclxuICAgICAgICBjb25zdCBpdGVtID0gZ2V0U29ydGVkSXRlbXModGhpcy5wbGF5ZXIuaW52ZW50b3J5KVtpXVxyXG4gICAgICAgIGlmICghcmwuaXNFcXVpcHBhYmxlKGl0ZW0pKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXF1aXBJdGVtKHRoaXMucGxheWVyLCBpdGVtKVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZW1vdmUoaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGkgPSB0aGlzLnBhZ2VJbmRleCAqIHRoaXMucGFnZVNpemUgKyBpbmRleFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLnBsYXllci5pbnZlbnRvcnkpW2ldXHJcbiAgICAgICAgaWYgKCFybC5pc0VxdWlwcGFibGUoaXRlbSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZW1vdmVJdGVtKHRoaXMucGxheWVyLCBpdGVtKVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIENvbnRhaW5lckRpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpYWxvZzogRGlhbG9nXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG5hbWVTcGFuID0gZG9tLmJ5SWQoXCJjb250YWluZXJOYW1lXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwiY29udGFpbmVyQ2xvc2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdGFrZUFsbEJ1dHRvbiA9IGRvbS5ieUlkKFwiY29udGFpbmVyVGFrZUFsbEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXJUYWJsZSA9IGRvbS5ieUlkKFwiY29udGFpbmVyVGFibGVcIikgYXMgSFRNTFRhYmxlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXJJdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcImNvbnRhaW5lckl0ZW1UZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwcml2YXRlIG1hcDogbWFwcy5NYXAgfCBudWxsID0gbnVsbFxyXG4gICAgcHJpdmF0ZSBjb250YWluZXI6IHJsLkNvbnRhaW5lciB8IG51bGwgPSBudWxsXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IERpYWxvZyhkb20uYnlJZChcImNvbnRhaW5lckRpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgICAgIHRoaXMucGxheWVyID0gcGxheWVyXHJcbiAgICAgICAgdGhpcy5jbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5oaWRlKCkpXHJcbiAgICAgICAgdGhpcy50YWtlQWxsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnRha2VBbGwoKSlcclxuICAgICAgICBjb25zdCBlbGVtID0gdGhpcy5kaWFsb2cuZWxlbVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUoZWxlbSwgXCJjbGlja1wiLCBcIi5jb250YWluZXItdGFrZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBidG4gPSBldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KHJvdylcclxuICAgICAgICAgICAgdGhpcy50YWtlKGlkeClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qga2V5ID0gZXYua2V5LnRvVXBwZXJDYXNlKClcclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJDXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiQVwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRha2VBbGwoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHBhcnNlSW50KGV2LmtleSlcclxuICAgICAgICAgICAgaWYgKGluZGV4ICYmIGluZGV4ID4gMCAmJiBpbmRleCA8PSA5KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRha2UoaW5kZXggLSAxKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KG1hcDogbWFwcy5NYXAsIGNvbnRhaW5lcjogcmwuQ29udGFpbmVyKSB7XHJcbiAgICAgICAgdGhpcy5tYXAgPSBtYXBcclxuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IGNvbnRhaW5lclxyXG4gICAgICAgIHRoaXMubmFtZVNwYW4udGV4dENvbnRlbnQgPSB0aGlzLmNvbnRhaW5lci5uYW1lXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB0aGlzLmRpYWxvZy5zaG93KClcclxuICAgIH1cclxuXHJcbiAgICBoaWRlKCkge1xyXG4gICAgICAgIGlmICh0aGlzLm1hcCAmJiB0aGlzLmNvbnRhaW5lciAmJiB0aGlzLmNvbnRhaW5lci5pdGVtcy5zaXplID09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5tYXAuY29udGFpbmVycy5kZWxldGUodGhpcy5jb250YWluZXIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IG51bGxcclxuICAgICAgICB0aGlzLmRpYWxvZy5oaWRlKClcclxuICAgIH1cclxuXHJcbiAgICByZWZyZXNoKCkge1xyXG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy5jb250YWluZXJUYWJsZS50Qm9kaWVzWzBdXHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRib2R5KVxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaXRlbXMgPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLmNvbnRhaW5lci5pdGVtcylcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBpdGVtc1tpXVxyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMuY29udGFpbmVySXRlbVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgdHIgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbUluZGV4VGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1pbmRleFwiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtTmFtZVRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0tbmFtZVwiKVxyXG4gICAgICAgICAgICBpdGVtSW5kZXhUZC50ZXh0Q29udGVudCA9IGAke2kgKyAxfWBcclxuICAgICAgICAgICAgaXRlbU5hbWVUZC50ZXh0Q29udGVudCA9IGl0ZW0ubmFtZVxyXG4gICAgICAgICAgICB0Ym9keS5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGFrZShpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLmNvbnRhaW5lci5pdGVtcylbaW5kZXhdXHJcbiAgICAgICAgaWYgKCFpdGVtKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuaXRlbXMuZGVsZXRlKGl0ZW0pXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIuaW52ZW50b3J5LmFkZChpdGVtKVxyXG5cclxuICAgICAgICAvLyBoaWRlIGlmIHRoaXMgd2FzIHRoZSBsYXN0IGl0ZW1cclxuICAgICAgICBpZiAodGhpcy5jb250YWluZXIuaXRlbXMuc2l6ZSA9PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGFrZUFsbCgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuY29udGFpbmVyLml0ZW1zKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLml0ZW1zLmRlbGV0ZShpdGVtKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXllci5pbnZlbnRvcnkuYWRkKGl0ZW0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBEZWZlYXREaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0cnlBZ2FpbkJ1dHRvbiA9IGRvbS5ieUlkKFwidHJ5QWdhaW5CdXR0b25cIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGlhbG9nOiBEaWFsb2dcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cgPSBuZXcgRGlhbG9nKGRvbS5ieUlkKFwiZGVmZWF0RGlhbG9nXCIpLCBjYW52YXMpXHJcbiAgICAgICAgdGhpcy50cnlBZ2FpbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy50cnlBZ2FpbigpKVxyXG4gICAgICAgIHRoaXMuZGlhbG9nLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlRcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50cnlBZ2FpbigpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiRU5URVJcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50cnlBZ2FpbigpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cuc2hvdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB0cnlBZ2FpbigpIHtcclxuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKGZhbHNlKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTb3J0ZWRJdGVtcyhpdGVtczogSXRlcmFibGU8cmwuSXRlbT4pOiBybC5JdGVtW10ge1xyXG4gICAgY29uc3Qgc29ydGVkSXRlbXMgPSBhcnJheS5vcmRlckJ5KGl0ZW1zLCBpID0+IGkubmFtZSlcclxuICAgIHJldHVybiBzb3J0ZWRJdGVtc1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTb3J0ZWRJdGVtc1BhZ2UoaXRlbXM6IEl0ZXJhYmxlPHJsLkl0ZW0+LCBwYWdlSW5kZXg6IG51bWJlciwgcGFnZVNpemU6IG51bWJlcik6IHJsLkl0ZW1bXSB7XHJcbiAgICBjb25zdCBzdGFydEluZGV4ID0gcGFnZUluZGV4ICogcGFnZVNpemVcclxuICAgIGNvbnN0IGVuZEluZGV4ID0gc3RhcnRJbmRleCArIHBhZ2VTaXplXHJcbiAgICBjb25zdCBzb3J0ZWRJdGVtcyA9IGdldFNvcnRlZEl0ZW1zKGl0ZW1zKVxyXG4gICAgY29uc3QgcGFnZSA9IHNvcnRlZEl0ZW1zLnNsaWNlKHN0YXJ0SW5kZXgsIGVuZEluZGV4KVxyXG4gICAgcmV0dXJuIHBhZ2VcclxufVxyXG5cclxuZnVuY3Rpb24gY2FuU2VlKG1hcDogbWFwcy5NYXAsIGV5ZTogZ2VvLlBvaW50LCB0YXJnZXQ6IGdlby5Qb2ludCk6IGJvb2xlYW4ge1xyXG4gICAgZm9yIChjb25zdCBwdCBvZiBtYXJjaChleWUsIHRhcmdldCkpIHtcclxuICAgICAgICAvLyBpZ25vcmUgc3RhcnQgcG9pbnRcclxuICAgICAgICBpZiAocHQuZXF1YWwoZXllKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCB0aCBvZiBtYXAuYXQocHQpKSB7XHJcbiAgICAgICAgICAgIGlmICghdGgudHJhbnNwYXJlbnQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uKiBtYXJjaChzdGFydDogZ2VvLlBvaW50LCBlbmQ6IGdlby5Qb2ludCk6IEdlbmVyYXRvcjxnZW8uUG9pbnQ+IHtcclxuICAgIGNvbnN0IGN1ciA9IHN0YXJ0LmNsb25lKClcclxuICAgIGNvbnN0IGR5ID0gTWF0aC5hYnMoZW5kLnkgLSBzdGFydC55KTtcclxuICAgIGNvbnN0IHN5ID0gc3RhcnQueSA8IGVuZC55ID8gMSA6IC0xO1xyXG4gICAgY29uc3QgZHggPSAtTWF0aC5hYnMoZW5kLnggLSBzdGFydC54KTtcclxuICAgIGNvbnN0IHN4ID0gc3RhcnQueCA8IGVuZC54ID8gMSA6IC0xO1xyXG4gICAgbGV0IGVyciA9IGR5ICsgZHg7XHJcblxyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICB5aWVsZCBjdXJcclxuXHJcbiAgICAgICAgaWYgKGN1ci5lcXVhbChlbmQpKSB7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZTIgPSAyICogZXJyO1xyXG4gICAgICAgIGlmIChlMiA+PSBkeCkge1xyXG4gICAgICAgICAgICBlcnIgKz0gZHg7XHJcbiAgICAgICAgICAgIGN1ci55ICs9IHN5O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUyIDw9IGR5KSB7XHJcbiAgICAgICAgICAgIGVyciArPSBkeTtcclxuICAgICAgICAgICAgY3VyLnggKz0gc3g7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcm9wSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuSXRlbSk6IHZvaWQge1xyXG4gICAgcGxheWVyLmRlbGV0ZShpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSB3YXMgZHJvcHBlZGApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZUl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLlVzYWJsZSk6IHZvaWQge1xyXG4gICAgY29uc3QgYW1vdW50ID0gTWF0aC5taW4oaXRlbS5oZWFsdGgsIHBsYXllci5tYXhIZWFsdGggLSBwbGF5ZXIuaGVhbHRoKVxyXG4gICAgcGxheWVyLmhlYWx0aCArPSBhbW91bnRcclxuICAgIHBsYXllci5kZWxldGUoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gcmVzdG9yZWQgJHthbW91bnR9IGhlYWx0aGApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVxdWlwSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuRXF1aXBwYWJsZSk6IHZvaWQge1xyXG4gICAgcGxheWVyLmVxdWlwKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHdhcyBlcXVpcHBlZGApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZUl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkVxdWlwcGFibGUpOiB2b2lkIHtcclxuICAgIHBsYXllci5yZW1vdmUoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gd2FzIHJlbW92ZWRgKVxyXG59XHJcblxyXG5jbGFzcyBBcHAge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW52YXMgPSBkb20uYnlJZChcImNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZW5kZXJlciA9IG5ldyBnZnguUmVuZGVyZXIodGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyID0gdGhpbmdzLnBsYXllci5jbG9uZSgpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGlucDogaW5wdXQuSW5wdXQgPSBuZXcgaW5wdXQuSW5wdXQodGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN0YXRzRGlhbG9nID0gbmV3IFN0YXRzRGlhbG9nKHRoaXMucGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW52ZW50b3J5RGlhbG9nID0gbmV3IEludmVudG9yeURpYWxvZyh0aGlzLnBsYXllciwgdGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lckRpYWxvZyA9IG5ldyBDb250YWluZXJEaWFsb2codGhpcy5wbGF5ZXIsIHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBkZWZlYXREaWFsb2cgPSBuZXcgRGVmZWF0RGlhbG9nKHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSBtYXA6IG1hcHMuTWFwID0gbmV3IG1hcHMuTWFwKDAsIDAsIHRoaXMucGxheWVyKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgcGxheWVyLmludmVudG9yeS5hZGQodGhpbmdzLmhlYWx0aFBvdGlvbi5jbG9uZSgpKVxyXG4gICAgICAgIHBsYXllci5pbnZlbnRvcnkuYWRkKHRoaW5ncy5jbG90aEFybW9yKVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWMoKSB7XHJcbiAgICAgICAgdGhpcy5jYW52YXMuZm9jdXMoKVxyXG4gICAgICAgIHRoaXMubWFwID0gYXdhaXQgZ2VuLmdlbmVyYXRlTWFwKHRoaXMucGxheWVyLCB0aGlzLnJlbmRlcmVyLCAzMiwgMzIpXHJcbiAgICAgICAgaWYgKCF0aGlzLnBsYXllci5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQbGF5ZXIgaXMgbm90IHBvc2l0aW9uZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG91dHB1dC53cml0ZShcIllvdXIgYWR2ZW50dXJlIGJlZ2luc1wiKVxyXG4gICAgICAgIG1hcHMudXBkYXRlVmlzaWJpbGl0eSh0aGlzLm1hcCwgdGhpcy5tYXAucGxheWVyLnBvc2l0aW9uLCBybC5saWdodFJhZGl1cylcclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy50aWNrKCkpXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHRpY2soKSB7XHJcbiAgICAgICAgY29uc3QgbmV4dENyZWF0dXJlID0gdGhpcy5nZXROZXh0Q3JlYXR1cmUoKVxyXG4gICAgICAgIGlmIChuZXh0Q3JlYXR1cmUgaW5zdGFuY2VvZiBybC5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaGFuZGxlSW5wdXQoKSkge1xyXG4gICAgICAgICAgICAgICAgbWFwcy51cGRhdGVWaXNpYmlsaXR5KHRoaXMubWFwLCB0aGlzLnBsYXllci5wb3NpdGlvbiwgcmwubGlnaHRSYWRpdXMpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKG5leHRDcmVhdHVyZSBpbnN0YW5jZW9mIHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgdGhpcy50aWNrTW9uc3RlcihuZXh0Q3JlYXR1cmUpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy50aWNrUm91bmQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmF3RnJhbWUoKVxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLnRpY2soKSlcclxuICAgIH1cclxuXHJcbiAgICBnZXROZXh0TW9uc3RlcigpOiBybC5Nb25zdGVyIHwgbnVsbCB7XHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHdob3NlIHR1cm4gaXQgaXNcclxuICAgICAgICBsZXQgbmV4dE1vbnN0ZXIgPSBudWxsXHJcbiAgICAgICAgZm9yIChjb25zdCBtb25zdGVyIG9mIHRoaXMubWFwLm1vbnN0ZXJzKSB7XHJcbiAgICAgICAgICAgIGlmIChtb25zdGVyLnN0YXRlICE9PSBybC5Nb25zdGVyU3RhdGUuYWdncm8pIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChtb25zdGVyLmFjdGlvbiA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIW5leHRNb25zdGVyIHx8IG1vbnN0ZXIuYWN0aW9uID4gbmV4dE1vbnN0ZXIuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBuZXh0TW9uc3RlciA9IG1vbnN0ZXJcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG5leHRNb25zdGVyXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TmV4dENyZWF0dXJlKCk6IHJsLk1vbnN0ZXIgfCBybC5QbGF5ZXIgfCBudWxsIHtcclxuICAgICAgICBjb25zdCBtb25zdGVyID0gdGhpcy5nZXROZXh0TW9uc3RlcigpXHJcbiAgICAgICAgaWYgKHRoaXMucGxheWVyLmFjdGlvbiA+IDAgJiYgdGhpcy5wbGF5ZXIuYWN0aW9uID4gKG1vbnN0ZXI/LmFjdGlvbiA/PyAwKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wbGF5ZXJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtb25zdGVyXHJcbiAgICB9XHJcblxyXG4gICAgdGlja1JvdW5kKCkge1xyXG4gICAgICAgIC8vIGFjY3VtdWxhdGUgYWN0aW9uIHBvaW50c1xyXG4gICAgICAgIGZvciAoY29uc3QgbW9uc3RlciBvZiBhcnJheS5maWx0ZXIodGhpcy5tYXAubW9uc3RlcnMsIG0gPT4gbS5zdGF0ZSA9PT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvKSkge1xyXG4gICAgICAgICAgICBjb25zdCByZXNlcnZlID0gTWF0aC5taW4obW9uc3Rlci5hY3Rpb25SZXNlcnZlLCBtb25zdGVyLmFnaWxpdHkpXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gbW9uc3Rlci5hZ2lsaXR5ICsgcmVzZXJ2ZVxyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvblJlc2VydmUgPSAwXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjYXAgYWN0aW9uIHJlc2VydmUgXHJcbiAgICAgICAgY29uc3QgcmVzZXJ2ZSA9IE1hdGgubWluKHRoaXMucGxheWVyLmFjdGlvblJlc2VydmUsIHRoaXMucGxheWVyLmFnaWxpdHkpXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIuYWN0aW9uID0gdGhpcy5wbGF5ZXIuYWdpbGl0eSArIHJlc2VydmVcclxuICAgICAgICB0aGlzLnBsYXllci5hY3Rpb25SZXNlcnZlID0gMFxyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZU1vbnN0ZXJTdGF0ZXMoKVxyXG4gICAgfVxyXG5cclxuICAgIGdldFNjcm9sbE9mZnNldCgpOiBnZW8uUG9pbnQge1xyXG4gICAgICAgIC8vIGNvbnZlcnQgbWFwIHBvaW50IHRvIGNhbnZhcyBwb2ludCwgbm90aW5nIHRoYXQgY2FudmFzIGlzIGNlbnRlcmVkIG9uIHBsYXllclxyXG4gICAgICAgIGNvbnN0IHBsYXllclBvc2l0aW9uID0gdGhpcy5wbGF5ZXIucG9zaXRpb25cclxuICAgICAgICBjb25zdCBjYW52YXNDZW50ZXIgPSBuZXcgZ2VvLlBvaW50KHRoaXMuY2FudmFzLndpZHRoIC8gMiwgdGhpcy5jYW52YXMuaGVpZ2h0IC8gMilcclxuICAgICAgICBjb25zdCBvZmZzZXQgPSBjYW52YXNDZW50ZXIuc3ViUG9pbnQocGxheWVyUG9zaXRpb24uYWRkU2NhbGFyKC41KS5tdWxTY2FsYXIocmwudGlsZVNpemUpKVxyXG4gICAgICAgIHJldHVybiBvZmZzZXQuZmxvb3IoKVxyXG4gICAgfVxyXG5cclxuICAgIGNhbnZhc1RvTWFwUG9pbnQoY3h5OiBnZW8uUG9pbnQpIHtcclxuICAgICAgICBjb25zdCBzY3JvbGxPZmZzZXQgPSB0aGlzLmdldFNjcm9sbE9mZnNldCgpXHJcbiAgICAgICAgY29uc3QgbXh5ID0gY3h5LnN1YlBvaW50KHNjcm9sbE9mZnNldCkuZGl2U2NhbGFyKHJsLnRpbGVTaXplKVxyXG4gICAgICAgIHJldHVybiBteHlcclxuICAgIH1cclxuXHJcbiAgICBtYXBUb0NhbnZhc1BvaW50KG14eTogZ2VvLlBvaW50KSB7XHJcbiAgICAgICAgY29uc3Qgc2Nyb2xsT2Zmc2V0ID0gdGhpcy5nZXRTY3JvbGxPZmZzZXQoKVxyXG4gICAgICAgIGNvbnN0IGN4eSA9IG14eS5tdWxTY2FsYXIocmwudGlsZVNpemUpLmFkZFBvaW50KHNjcm9sbE9mZnNldClcclxuICAgICAgICByZXR1cm4gY3h5XHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc1BsYXllckF0dGFjayhkZWZlbmRlcjogcmwuTW9uc3Rlcikge1xyXG4gICAgICAgIC8vIGJhc2UgNjAlIGNoYW5jZSB0byBoaXRcclxuICAgICAgICAvLyAxMCUgYm9udXMgLyBwZW5hbHR5IGZvciBldmVyeSBwb2ludCBkaWZmZXJlbmNlIGJldHdlZW4gYXR0YWNrIGFuZCBkZWZlbnNlXHJcbiAgICAgICAgLy8gYm90dG9tcyBvdXQgYXQgNSUgLSBhbHdheXMgU09NRSBjaGFuY2UgdG8gaGl0XHJcbiAgICAgICAgY29uc3QgYXR0YWNrZXIgPSB0aGlzLnBsYXllclxyXG4gICAgICAgIGNvbnN0IGJvbnVzID0gKGF0dGFja2VyLmF0dGFjayAtIGRlZmVuZGVyLmRlZmVuc2UpICogLjFcclxuICAgICAgICBjb25zdCBoaXRDaGFuY2UgPSBNYXRoLm1pbihNYXRoLm1heCguNiArIGJvbnVzLCAuMDUpLCAuOTUpXHJcbiAgICAgICAgY29uc3QgaGl0ID0gcmFuZC5jaGFuY2UoaGl0Q2hhbmNlKVxyXG4gICAgICAgIGNvbnN0IHdlYXBvbiA9IGF0dGFja2VyLndlYXBvbiA/PyB0aGluZ3MuZmlzdHNcclxuICAgICAgICBjb25zdCBhdHRhY2tWZXJiID0gd2VhcG9uLnZlcmIgPyB3ZWFwb24udmVyYiA6IFwiYXR0YWNrc1wiXHJcbiAgICAgICAgYXR0YWNrZXIuYWN0aW9uIC09IHdlYXBvbi5hY3Rpb25cclxuXHJcbiAgICAgICAgaWYgKCFoaXQpIHtcclxuICAgICAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7YXR0YWNrZXIubmFtZX0gJHthdHRhY2tWZXJifSAke2RlZmVuZGVyLm5hbWV9IGJ1dCBtaXNzZXMhYClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoaXQgLSBjYWxjdWxhdGUgZGFtYWdlXHJcbiAgICAgICAgY29uc3QgZGFtYWdlID0gd2VhcG9uLmRhbWFnZS5yb2xsKClcclxuICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYW5kIGhpdHMgZm9yICR7ZGFtYWdlfSBkYW1hZ2UhYClcclxuICAgICAgICBkZWZlbmRlci5oZWFsdGggLT0gZGFtYWdlXHJcblxyXG4gICAgICAgIGlmIChkZWZlbmRlci5oZWFsdGggPCAwKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke2RlZmVuZGVyLm5hbWV9IGhhcyBiZWVuIGRlZmVhdGVkIGFuZCAke2F0dGFja2VyLm5hbWV9IHJlY2VpdmVzICR7ZGVmZW5kZXIuZXhwZXJpZW5jZX0gZXhwZXJpZW5jZWApXHJcbiAgICAgICAgICAgIHRoaXMucGxheWVyLmV4cGVyaWVuY2UgKz0gZGVmZW5kZXIuZXhwZXJpZW5jZVxyXG4gICAgICAgICAgICB0aGlzLm1hcC5tb25zdGVycy5kZWxldGUoZGVmZW5kZXIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NNb25zdGVyQXR0YWNrKGF0dGFja2VyOiBybC5Nb25zdGVyLCBhdHRhY2s6IHJsLkF0dGFjaykge1xyXG4gICAgICAgIC8vIGJhc2UgNjAlIGNoYW5jZSB0byBoaXRcclxuICAgICAgICAvLyAxMCUgYm9udXMgLyBwZW5hbHR5IGZvciBldmVyeSBwb2ludCBkaWZmZXJlbmNlIGJldHdlZW4gYXR0YWNrIGFuZCBkZWZlbnNlXHJcbiAgICAgICAgLy8gY2xhbXBzIHRvIG91dCBhdCBbNSwgOTVdIC0gYWx3YXlzIFNPTUUgY2hhbmNlIHRvIGhpdCBvciBtaXNzXHJcbiAgICAgICAgLy8gY2hvb3NlIGFuIGF0dGFjayBmcm9tIHJlcGVydG9pcmUgb2YgbW9uc3RlclxyXG4gICAgICAgIGNvbnN0IGRlZmVuZGVyID0gdGhpcy5wbGF5ZXJcclxuICAgICAgICBjb25zdCBib251cyA9IChhdHRhY2suYXR0YWNrIC0gZGVmZW5kZXIuZGVmZW5zZSkgKiAuMVxyXG4gICAgICAgIGNvbnN0IGhpdENoYW5jZSA9IE1hdGgubWF4KC42ICsgYm9udXMsIC4wNSlcclxuICAgICAgICBjb25zdCBoaXQgPSByYW5kLmNoYW5jZShoaXRDaGFuY2UpXHJcbiAgICAgICAgY29uc3QgYXR0YWNrVmVyYiA9IGF0dGFjay52ZXJiID8gYXR0YWNrLnZlcmIgOiBcImF0dGFja3NcIlxyXG4gICAgICAgIGF0dGFja2VyLmFjdGlvbiAtPSBhdHRhY2suYWN0aW9uXHJcblxyXG4gICAgICAgIGlmICghaGl0KSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke2F0dGFja2VyLm5hbWV9ICR7YXR0YWNrVmVyYn0gJHtkZWZlbmRlci5uYW1lfSBidXQgbWlzc2VzIWApXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGl0IC0gY2FsY3VsYXRlIGRhbWFnZVxyXG4gICAgICAgIGNvbnN0IGRhbWFnZSA9IGF0dGFjay5kYW1hZ2Uucm9sbCgpXHJcbiAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7YXR0YWNrZXIubmFtZX0gJHthdHRhY2tWZXJifSAke2RlZmVuZGVyLm5hbWV9IGFuZCBoaXRzIGZvciAke2RhbWFnZX0gZGFtYWdlIWApXHJcbiAgICAgICAgZGVmZW5kZXIuaGVhbHRoIC09IGRhbWFnZVxyXG5cclxuICAgICAgICBpZiAoZGVmZW5kZXIuaGVhbHRoIDw9IDApIHtcclxuICAgICAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7ZGVmZW5kZXIubmFtZX0gaGFzIGJlZW4gZGVmZWF0ZWQhYClcclxuICAgICAgICAgICAgdGhpcy5kZWZlYXREaWFsb2cuc2hvdygpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZU1vbnN0ZXJTdGF0ZXMoKSB7XHJcbiAgICAgICAgZm9yIChjb25zdCBtb25zdGVyIG9mIHRoaXMubWFwLm1vbnN0ZXJzKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlTW9uc3RlclN0YXRlKG1vbnN0ZXIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZU1vbnN0ZXJTdGF0ZShtb25zdGVyOiBybC5Nb25zdGVyKSB7XHJcbiAgICAgICAgLy8gYWdncm8gc3RhdGVcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGlmIChtb25zdGVyLnN0YXRlICE9PSBybC5Nb25zdGVyU3RhdGUuYWdncm8gJiYgY2FuU2VlKG1hcCwgbW9uc3Rlci5wb3NpdGlvbiwgbWFwLnBsYXllci5wb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gPSAwXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuc3RhdGUgPSBybC5Nb25zdGVyU3RhdGUuYWdncm9cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChtb25zdGVyLnN0YXRlID09PSBybC5Nb25zdGVyU3RhdGUuYWdncm8gJiYgIWNhblNlZShtYXAsIG1vbnN0ZXIucG9zaXRpb24sIG1hcC5wbGF5ZXIucG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgICAgICBtb25zdGVyLnN0YXRlID0gcmwuTW9uc3RlclN0YXRlLmlkbGVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGlja01vbnN0ZXIobW9uc3RlcjogcmwuTW9uc3Rlcikge1xyXG4gICAgICAgIC8vIGlmIHBsYXllciBpcyB3aXRoaW4gcmVhY2ggKGFuZCBhbGl2ZSksIGF0dGFja1xyXG4gICAgICAgIGlmICh0aGlzLnBsYXllci5oZWFsdGggPiAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlVG9QbGF5ZXIgPSBnZW8uY2FsY01hbmhhdHRlbkRpc3QodGhpcy5wbGF5ZXIucG9zaXRpb24sIG1vbnN0ZXIucG9zaXRpb24pXHJcbiAgICAgICAgICAgIGNvbnN0IGF0dGFja3MgPSBtb25zdGVyLmF0dGFja3MuZmlsdGVyKGEgPT4gYS5yYW5nZSA+PSBkaXN0YW5jZVRvUGxheWVyKVxyXG4gICAgICAgICAgICBpZiAoYXR0YWNrcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhdHRhY2sgPSByYW5kLmNob29zZShhdHRhY2tzKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzTW9uc3RlckF0dGFjayhtb25zdGVyLCBhdHRhY2spXHJcbiAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHdoZXRoZXIgbW9uc3RlciBjYW4gc2VlIHBsYXllclxyXG4gICAgICAgIC8vIHNlZWsgYW5kIGRlc3Ryb3lcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGNvbnN0IHBhdGggPSBtYXBzLmZpbmRQYXRoKG1hcCwgbW9uc3Rlci5wb3NpdGlvbiwgdGhpcy5wbGF5ZXIucG9zaXRpb24pXHJcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIC8vIHBhc3NcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gPSAwXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBwYXRoWzBdXHJcbiAgICAgICAgaWYgKG1hcC5pc1Bhc3NhYmxlKHBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvbiAtPSAxXHJcbiAgICAgICAgICAgIG1vbnN0ZXIucG9zaXRpb24gPSBwYXRoWzBdXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gPSAwXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGhhbmRsZVJlc2l6ZSgpIHtcclxuICAgICAgICBjb25zdCBjYW52YXMgPSB0aGlzLmNhbnZhc1xyXG4gICAgICAgIGlmIChjYW52YXMud2lkdGggPT09IGNhbnZhcy5jbGllbnRXaWR0aCAmJiBjYW52YXMuaGVpZ2h0ID09PSBjYW52YXMuY2xpZW50SGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IGNhbnZhcy5jbGllbnRIZWlnaHRcclxuICAgIH1cclxuXHJcbiAgICBoYW5kbGVJbnB1dCgpOiBib29sZWFuIHtcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgY29uc3QgaW5wID0gdGhpcy5pbnBcclxuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IHBsYXllci5wb3NpdGlvbi5jbG9uZSgpXHJcblxyXG4gICAgICAgIGlmIChpbnAubW91c2VMZWZ0UHJlc3NlZCkge1xyXG4gICAgICAgICAgICAvLyBkZXRlcm1pbmUgdGhlIG1hcCBjb29yZGluYXRlcyB0aGUgdXNlciBjbGlja2VkIG9uXHJcbiAgICAgICAgICAgIGNvbnN0IG14eSA9IHRoaXMuY2FudmFzVG9NYXBQb2ludChuZXcgZ2VvLlBvaW50KGlucC5tb3VzZVgsIGlucC5tb3VzZVkpKS5mbG9vcigpXHJcblxyXG4gICAgICAgICAgICBjb25zdCBjbGlja0ZpeHR1cmUgPSBtYXAuZml4dHVyZUF0KG14eSlcclxuICAgICAgICAgICAgaWYgKGNsaWNrRml4dHVyZSkge1xyXG4gICAgICAgICAgICAgICAgb3V0cHV0LmluZm8oYFlvdSBzZWUgJHtjbGlja0ZpeHR1cmUubmFtZX1gKVxyXG4gICAgICAgICAgICAgICAgaW5wLmZsdXNoKClcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjbGlja0NyZWF0dXJlID0gbWFwLm1vbnN0ZXJBdChteHkpXHJcbiAgICAgICAgICAgIGlmIChjbGlja0NyZWF0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke2NsaWNrQ3JlYXR1cmUubmFtZX1gKVxyXG4gICAgICAgICAgICAgICAgaW5wLmZsdXNoKClcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBkeHkgPSBteHkuc3ViUG9pbnQocGxheWVyLnBvc2l0aW9uKVxyXG4gICAgICAgICAgICBjb25zdCBzZ24gPSBkeHkuc2lnbigpXHJcbiAgICAgICAgICAgIGNvbnN0IGFicyA9IGR4eS5hYnMoKVxyXG5cclxuICAgICAgICAgICAgaWYgKGFicy54ID4gMCAmJiBhYnMueCA+PSBhYnMueSkge1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb24ueCArPSBzZ24ueFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYWJzLnkgPiAwICYmIGFicy55ID4gYWJzLngpIHtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uLnkgKz0gc2duLnlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJ3XCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dVcFwiKSkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbi55IC09IDFcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJzXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dEb3duXCIpKSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnkgKz0gMVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChpbnAucHJlc3NlZChcImFcIikgfHwgaW5wLnByZXNzZWQoXCJBcnJvd0xlZnRcIikpIHtcclxuICAgICAgICAgICAgcG9zaXRpb24ueCAtPSAxXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGlucC5wcmVzc2VkKFwiZFwiKSB8fCBpbnAucHJlc3NlZChcIkFycm93UmlnaHRcIikpIHtcclxuICAgICAgICAgICAgcG9zaXRpb24ueCArPSAxXHJcbiAgICAgICAgfSBlbHNlIGlmIChpbnAucHJlc3NlZChcInpcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5zdGF0c0RpYWxvZy5zaG93KClcclxuICAgICAgICB9IGVsc2UgaWYgKGlucC5wcmVzc2VkKFwiaVwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmludmVudG9yeURpYWxvZy5zaG93KClcclxuICAgICAgICB9IGVsc2UgaWYgKGlucC5wcmVzc2VkKFwiIFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLnBsYXllci5hY3Rpb25SZXNlcnZlICs9IHRoaXMucGxheWVyLmFjdGlvblxyXG4gICAgICAgICAgICB0aGlzLnBsYXllci5hY3Rpb24gPSAwXHJcbiAgICAgICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpbnAuZmx1c2goKVxyXG5cclxuICAgICAgICBpZiAocG9zaXRpb24uZXF1YWwocGxheWVyLnBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRpbGUgPSBtYXAudGlsZUF0KHBvc2l0aW9uKVxyXG4gICAgICAgIGlmICh0aWxlICYmICF0aWxlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBCbG9ja2VkIGJ5ICR7dGlsZS5uYW1lfWApXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbW9uc3RlciA9IG1hcC5tb25zdGVyQXQocG9zaXRpb24pXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5wcm9jZXNzUGxheWVyQXR0YWNrKG1vbnN0ZXIpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb250YWluZXIgPSBtYXAuY29udGFpbmVyQXQocG9zaXRpb24pXHJcbiAgICAgICAgaWYgKGNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lckRpYWxvZy5zaG93KG1hcCwgY29udGFpbmVyKVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGZpeHR1cmUgPSBtYXAuZml4dHVyZUF0KHBvc2l0aW9uKVxyXG4gICAgICAgIGlmIChmaXh0dXJlIGluc3RhbmNlb2YgcmwuRG9vcikge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgJHtmaXh0dXJlLm5hbWV9IG9wZW5lZGApXHJcbiAgICAgICAgICAgIHRoaXMubWFwLmZpeHR1cmVzLmRlbGV0ZShmaXh0dXJlKVxyXG4gICAgICAgICAgICBwbGF5ZXIuYWN0aW9uIC09IDFcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9IGVsc2UgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5TdGFpcnNVcCkge1xyXG4gICAgICAgICAgICBvdXRwdXQuZXJyb3IoXCJTdGFpcnMgbm90IGltcGxlbWVudGVkXCIpXHJcbiAgICAgICAgfSBlbHNlIGlmIChmaXh0dXJlIGluc3RhbmNlb2YgcmwuU3RhaXJzRG93bikge1xyXG4gICAgICAgICAgICBvdXRwdXQuZXJyb3IoXCJTdGFpcnMgbm90IGltcGxlbWVudGVkXCIpXHJcbiAgICAgICAgfSBlbHNlIGlmIChmaXh0dXJlICYmICFmaXh0dXJlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBDYW4ndCBtb3ZlIHRoYXQgd2F5LCBibG9ja2VkIGJ5ICR7Zml4dHVyZS5uYW1lfWApXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGxheWVyLnBvc2l0aW9uID0gcG9zaXRpb25cclxuICAgICAgICBwbGF5ZXIuYWN0aW9uIC09IDFcclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIGRyYXdGcmFtZSgpIHtcclxuICAgICAgICB0aGlzLmhhbmRsZVJlc2l6ZSgpXHJcblxyXG4gICAgICAgIC8vIGNlbnRlciB0aGUgZ3JpZCBhcm91bmQgdGhlIHBsYXllcmRcclxuICAgICAgICBjb25zdCBvZmZzZXQgPSB0aGlzLmdldFNjcm9sbE9mZnNldCgpXHJcblxyXG4gICAgICAgIC8vIG5vdGUgLSBkcmF3aW5nIG9yZGVyIG1hdHRlcnMgLSBkcmF3IGZyb20gYm90dG9tIHRvIHRvcFxyXG5cclxuICAgICAgICAvLyBkcmF3IHZhcmlvdXMgbGF5ZXJzIG9mIHNwcml0ZXNcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGZvciAoY29uc3QgdGlsZSBvZiBtYXAudGlsZXMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCB0aWxlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBmaXh0dXJlIG9mIG1hcC5maXh0dXJlcykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIGZpeHR1cmUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGNvbnRhaW5lciBvZiBtYXAuY29udGFpbmVycykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIGNvbnRhaW5lcilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgY3JlYXR1cmUgb2YgbWFwLm1vbnN0ZXJzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgY3JlYXR1cmUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIHRoaXMucGxheWVyKVxyXG4gICAgICAgIHRoaXMuZHJhd0hlYWx0aEJhcihvZmZzZXQsIHRoaXMucGxheWVyKVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmZsdXNoKClcclxuICAgIH1cclxuXHJcbiAgICBkcmF3VGhpbmcob2Zmc2V0OiBnZW8uUG9pbnQsIHRoOiBybC5UaGluZykge1xyXG4gICAgICAgIC8vIGRvbid0IGRyYXcgdGhpbmdzIHRoYXQgYXJlbid0IHBvc2l0aW9uZWRcclxuICAgICAgICBpZiAoIXRoLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoLnZpc2libGUgPT09IHJsLlZpc2liaWxpdHkuTm9uZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbG9yID0gdGguY29sb3IuY2xvbmUoKVxyXG4gICAgICAgIGlmICh0aC52aXNpYmxlID09PSBybC5WaXNpYmlsaXR5LkZvZykge1xyXG4gICAgICAgICAgICBjb2xvci5hID0gLjVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHNwcml0ZVBvc2l0aW9uID0gdGgucG9zaXRpb24ubXVsU2NhbGFyKHJsLnRpbGVTaXplKS5hZGRQb2ludChvZmZzZXQpXHJcbiAgICAgICAgY29uc3Qgc3ByaXRlID0gbmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24sXHJcbiAgICAgICAgICAgIGNvbG9yOiBjb2xvcixcclxuICAgICAgICAgICAgd2lkdGg6IHJsLnRpbGVTaXplLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IHJsLnRpbGVTaXplLFxyXG4gICAgICAgICAgICB0ZXh0dXJlOiB0aC50ZXh0dXJlLFxyXG4gICAgICAgICAgICBsYXllcjogdGgudGV4dHVyZUxheWVyLFxyXG4gICAgICAgICAgICBmbGFnczogZ2Z4LlNwcml0ZUZsYWdzLkFycmF5VGV4dHVyZVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd1Nwcml0ZShzcHJpdGUpXHJcbiAgICB9XHJcblxyXG4gICAgZHJhd0hlYWx0aEJhcihvZmZzZXQ6IGdlby5Qb2ludCwgY3JlYXR1cmU6IHJsLkNyZWF0dXJlKSB7XHJcbiAgICAgICAgaWYgKCFjcmVhdHVyZS5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGhlYWx0aCA9IE1hdGgubWF4KGNyZWF0dXJlLmhlYWx0aCwgMClcclxuICAgICAgICBjb25zdCBib3JkZXJXaWR0aCA9IGhlYWx0aCAqIDQgKyAyXHJcbiAgICAgICAgY29uc3QgaW50ZXJpb3JXaWR0aCA9IGhlYWx0aCAqIDRcclxuICAgICAgICBjb25zdCBzcHJpdGVQb3NpdGlvbiA9IGNyZWF0dXJlLnBvc2l0aW9uLm11bFNjYWxhcihybC50aWxlU2l6ZSkuYWRkUG9pbnQob2Zmc2V0KS5zdWJQb2ludChuZXcgZ2VvLlBvaW50KDAsIHJsLnRpbGVTaXplIC8gMikpXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3U3ByaXRlKG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLFxyXG4gICAgICAgICAgICBjb2xvcjogZ2Z4LkNvbG9yLndoaXRlLFxyXG4gICAgICAgICAgICB3aWR0aDogYm9yZGVyV2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodDogOFxyXG4gICAgICAgIH0pKVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdTcHJpdGUobmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24uYWRkUG9pbnQobmV3IGdlby5Qb2ludCgxLCAxKSksXHJcbiAgICAgICAgICAgIGNvbG9yOiBnZnguQ29sb3IucmVkLFxyXG4gICAgICAgICAgICB3aWR0aDogaW50ZXJpb3JXaWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0OiA2XHJcbiAgICAgICAgfSkpXHJcbiAgICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICBjb25zdCBhcHAgPSBuZXcgQXBwKClcclxuICAgIGF3YWl0IGFwcC5leGVjKClcclxufVxyXG5cclxuaW5pdCgpIl19