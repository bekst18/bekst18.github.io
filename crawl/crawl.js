import * as dom from "../shared/dom.js";
import * as iter from "../shared/iter.js";
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
    get hidden() {
        return this.elem.hidden;
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
        this.elem.addEventListener("keydown", ev => {
            const key = ev.key.toUpperCase();
            if (key === "ESCAPE") {
                this.hide();
            }
        });
    }
    show() {
        const player = this.player;
        const healthSpan = dom.byId("statsHealth");
        const strengthSpan = dom.byId("statsStrength");
        const agilitySpan = dom.byId("statsAgility");
        const intelligenceSpan = dom.byId("statsIntelligence");
        const attackSpan = dom.byId("statsAttack");
        const damageSpan = dom.byId("statsDamage");
        const defenseSpan = dom.byId("statsDefense");
        const levelSpan = dom.byId("statsLevel");
        const experienceSpan = dom.byId("statsExperience");
        const experienceRequirement = rl.getExperienceRequirement(player.level + 1);
        healthSpan.textContent = `${player.health} / ${player.maxHealth}`;
        strengthSpan.textContent = `${player.strength}`;
        agilitySpan.textContent = `${player.agility}`;
        intelligenceSpan.textContent = `${player.intelligence}`;
        attackSpan.textContent = `${player.meleeAttack} / ${player.rangedWeapon ? player.rangedAttack : "NA"}`;
        damageSpan.textContent = `${player.meleeDamage} / ${player.rangedDamage ? player.rangedDamage : "NA"}`;
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
        this.elem.addEventListener("keydown", (ev) => {
            const key = ev.key.toUpperCase();
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
            if (key === "ARROWDOWN" || key === "S") {
                ++this.selectedIndex;
                this.selectedIndex = Math.min(this.selectedIndex, 8);
                this.refresh();
            }
            if (key === "ARROWUP" || key === "W") {
                --this.selectedIndex;
                this.selectedIndex = Math.max(this.selectedIndex, -1);
                this.refresh();
            }
            if (key === "ESCAPE") {
                this.hide();
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
    get hidden() {
        return this.dialog.hidden;
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
    const sortedItems = iter.orderBy(items, i => i.name);
    return sortedItems;
}
function getSortedItemsPage(items, pageIndex, pageSize) {
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    const sortedItems = getSortedItems(items);
    const page = sortedItems.slice(startIndex, endIndex);
    return page;
}
function canSee(map, eye, target, lightRadius) {
    if (geo.calcManhattenDist(eye, target) > lightRadius) {
        return false;
    }
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
var TargetCommand;
(function (TargetCommand) {
    TargetCommand[TargetCommand["None"] = 0] = "None";
    TargetCommand[TargetCommand["Attack"] = 1] = "Attack";
    TargetCommand[TargetCommand["Shoot"] = 2] = "Shoot";
    TargetCommand[TargetCommand["Look"] = 3] = "Look";
})(TargetCommand || (TargetCommand = {}));
class App {
    constructor() {
        this.canvas = dom.byId("canvas");
        this.attackButton = dom.byId("attackButton");
        this.shootButton = dom.byId("shootButton");
        this.lookButton = dom.byId("lookButton");
        this.renderer = new gfx.Renderer(this.canvas);
        this.player = things.player.clone();
        this.inp = new input.Input(this.canvas);
        this.statsDialog = new StatsDialog(this.player, this.canvas);
        this.inventoryDialog = new InventoryDialog(this.player, this.canvas);
        this.containerDialog = new ContainerDialog(this.player, this.canvas);
        this.defeatDialog = new DefeatDialog(this.canvas);
        this.map = new maps.Map(0, 0, this.player);
        this.targetCommand = TargetCommand.None;
        const player = this.player;
        player.inventory.add(things.healthPotion.clone());
        player.inventory.add(things.slingShot);
    }
    async exec() {
        this.canvas.focus();
        this.map = await gen.generateOutdoorMap(this.renderer, this.player, 64, 64);
        if (!this.player.position) {
            throw new Error("Player is not positioned");
        }
        output.write("Your adventure begins");
        this.handleResize();
        requestAnimationFrame(() => this.tick());
        document.addEventListener("keypress", (ev) => this.handleKeyPress(ev));
        this.attackButton.addEventListener("click", () => {
            this.targetCommand = TargetCommand.Attack;
        });
        this.shootButton.addEventListener("click", () => {
            this.targetCommand = TargetCommand.Shoot;
        });
        this.lookButton.addEventListener("click", () => {
            this.targetCommand = TargetCommand.Look;
        });
    }
    tick() {
        this.handleResize();
        const nextCreature = this.getNextCreature();
        if (nextCreature instanceof rl.Player) {
            if (this.handleInput()) {
                this.updateVisibility();
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
        for (const monster of iter.filter(this.map.monsters, m => m.state === rl.MonsterState.aggro)) {
            const reserve = Math.min(monster.actionReserve, monster.agility);
            monster.action = 1 + monster.agility + reserve;
            monster.actionReserve = 0;
        }
        // cap action reserve 
        const reserve = Math.min(this.player.actionReserve, this.player.agility);
        this.player.action = 1 + this.player.agility + reserve;
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
        const mxy = cxy.subPoint(scrollOffset).divScalar(rl.tileSize).floor();
        return mxy;
    }
    mapToCanvasPoint(mxy) {
        const scrollOffset = this.getScrollOffset();
        const cxy = mxy.mulScalar(rl.tileSize).addPoint(scrollOffset);
        return cxy;
    }
    processPlayerMeleeAttack(defender) {
        var _a;
        // base 60% chance to hit
        // 10% bonus / penalty for every point difference between attack and defense
        // bottoms out at 5% - always SOME chance to hit
        const attacker = this.player;
        const bonus = (attacker.meleeAttack - defender.defense) * .1;
        const hitChance = Math.min(Math.max(.6 + bonus, .05), .95);
        const hit = rand.chance(hitChance);
        const weapon = (_a = attacker.meleeWeapon) !== null && _a !== void 0 ? _a : things.fists;
        const attackVerb = weapon.verb ? weapon.verb : "attacks";
        attacker.action -= weapon.action;
        if (!hit) {
            output.warning(`${attacker.name} ${attackVerb} ${defender.name} but misses!`);
            return;
        }
        // hit - calculate damage
        const damage = attacker.meleeDamage.roll();
        output.warning(`${attacker.name} ${attackVerb} ${defender.name} and hits for ${damage} damage!`);
        defender.health -= damage;
        if (defender.health < 0) {
            output.warning(`${defender.name} has been defeated and ${attacker.name} receives ${defender.experience} experience`);
            this.player.experience += defender.experience;
            this.map.monsters.delete(defender);
        }
    }
    processPlayerRangedAttack(defender) {
        var _a, _b;
        // base 40% chance to hit
        // 10% bonus / penalty for every point difference between attack and defense
        // bottoms out at 5% - always SOME chance to hit
        const attacker = this.player;
        if (!attacker.rangedWeapon) {
            throw new Error("Player has no ranged weapon equipped");
        }
        const bonus = (attacker.rangedAttack - defender.defense) * .1;
        const hitChance = Math.min(Math.max(.6 + bonus, .05), .95);
        const hit = rand.chance(hitChance);
        const weapon = attacker.rangedWeapon;
        const attackVerb = weapon.verb ? weapon.verb : "attacks";
        attacker.action -= weapon.action;
        if (!hit) {
            output.warning(`${attacker.name} ${attackVerb} ${defender.name} but misses!`);
            return;
        }
        // hit - calculate damage
        const damage = (_b = (_a = attacker.rangedDamage) === null || _a === void 0 ? void 0 : _a.roll()) !== null && _b !== void 0 ? _b : 0;
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
        const lightRadius = this.calcLightRadius();
        if (monster.state !== rl.MonsterState.aggro && canSee(map, monster.position, map.player.position, lightRadius)) {
            monster.action = 0;
            monster.state = rl.MonsterState.aggro;
        }
        if (monster.state === rl.MonsterState.aggro && !canSee(map, monster.position, map.player.position, lightRadius)) {
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
        this.updateVisibility();
    }
    handleInput() {
        const map = this.map;
        const player = this.player;
        const inp = this.inp;
        const position = player.position.clone();
        if (this.targetCommand !== TargetCommand.None) {
            this.handleTargetingInput();
            return false;
        }
        if (inp.mouseLeftReleased) {
            // determine the map coordinates the user clicked on
            const mxy = this.canvasToMapPoint(new geo.Point(inp.mouseX, inp.mouseY));
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
        if (!this.map.inBounds(position)) {
            return false;
        }
        const tile = map.tileAt(position);
        if (tile && !tile.passable) {
            output.info(`Blocked by ${tile.name}`);
            return false;
        }
        const monster = map.monsterAt(position);
        if (monster) {
            this.processPlayerMeleeAttack(monster);
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
    handleTargetingInput() {
        if (!this.inp.mouseLeftReleased) {
            this.inp.flush();
            return false;
        }
        const cxy = new geo.Point(this.inp.mouseX, this.inp.mouseY);
        const mxy = this.canvasToMapPoint(cxy);
        const lightRadius = this.calcLightRadius();
        if (!canSee(this.map, this.player.position, mxy, lightRadius)) {
            this.inp.flush();
            output.error(`Can't see!`);
            return false;
        }
        switch (this.targetCommand) {
            case TargetCommand.Look:
                {
                    // show what user clicked on
                    for (const th of this.map.at(mxy)) {
                        output.info(`You see ${th.name}`);
                    }
                }
                break;
            case TargetCommand.Attack:
                {
                    const monster = this.map.monsterAt(mxy);
                    if (monster) {
                        this.processPlayerMeleeAttack(monster);
                    }
                }
                break;
            case TargetCommand.Shoot:
                {
                    const monster = this.map.monsterAt(mxy);
                    if (monster) {
                        this.processPlayerRangedAttack(monster);
                    }
                }
                break;
        }
        this.targetCommand = TargetCommand.None;
        this.inp.flush();
        return false;
    }
    updateVisibility() {
        // update visibility around player
        // limit radius to visible viewport area
        const lightRadius = this.calcLightRadius();
        maps.updateVisibility(this.map, this.player.position, lightRadius);
    }
    calcMapViewport() {
        const aabb = new geo.AABB(this.canvasToMapPoint(new geo.Point(0, 0)), this.canvasToMapPoint(new geo.Point(this.canvas.width + rl.tileSize, this.canvas.height + rl.tileSize)))
            .intersection(new geo.AABB(new geo.Point(0, 0), new geo.Point(this.map.width, this.map.height)));
        return aabb;
    }
    calcLightRadius() {
        const viewportAABB = this.calcMapViewport();
        const viewportLightRadius = Math.max(viewportAABB.width, viewportAABB.height);
        if (this.map.lighting === maps.Lighting.Ambient) {
            return viewportLightRadius;
        }
        return Math.min(viewportLightRadius, this.player.lightRadius);
    }
    drawFrame() {
        // center the grid around the playerd
        const viewportAABB = this.calcMapViewport();
        const offset = this.getScrollOffset();
        // note - drawing order matters - draw from bottom to top
        if (this.targetCommand !== TargetCommand.None) {
            this.canvas.style.cursor = "crosshair";
        }
        else {
            this.canvas.style.cursor = "";
        }
        this.shootButton.disabled = !this.player.rangedWeapon;
        const map = this.map;
        const tiles = map.tiles.within(viewportAABB);
        const fixtures = map.fixtures.within(viewportAABB);
        const containers = map.containers.within(viewportAABB);
        const monsters = map.monsters.within(viewportAABB);
        for (const tile of tiles) {
            this.drawThing(offset, tile);
        }
        for (const fixture of fixtures) {
            this.drawThing(offset, fixture);
        }
        for (const container of containers) {
            this.drawThing(offset, container);
        }
        for (const creature of monsters) {
            this.drawThing(offset, creature);
        }
        this.drawThing(offset, this.player);
        this.drawHealthBar(offset, this.player);
        this.renderer.flush();
    }
    drawThing(offset, th) {
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
    hideDialogs() {
        this.inventoryDialog.hide();
        this.statsDialog.hide();
    }
    handleKeyPress(ev) {
        const key = ev.key.toUpperCase();
        switch (key) {
            case "I":
                {
                    const wasHidden = this.inventoryDialog.hidden;
                    this.hideDialogs();
                    if (wasHidden) {
                        this.inventoryDialog.show();
                    }
                }
                break;
            case "Z":
                {
                    const wasHidden = this.statsDialog.hidden;
                    this.hideDialogs();
                    if (wasHidden) {
                        this.statsDialog.show();
                    }
                }
                break;
            case "L":
                this.targetCommand = TargetCommand.Look;
                break;
            case "ENTER":
                if (ev.ctrlKey && this.player.rangedWeapon) {
                    this.targetCommand = TargetCommand.Shoot;
                }
                else {
                    this.targetCommand = TargetCommand.Attack;
                }
                break;
            case "L":
                this.targetCommand = TargetCommand.Shoot;
                break;
        }
    }
}
async function init() {
    const app = new App();
    await app.exec();
}
init();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBQ2pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFFekMsTUFBTSxNQUFNO0lBRVIsWUFBNEIsSUFBaUIsRUFBbUIsTUFBeUI7UUFBN0QsU0FBSSxHQUFKLElBQUksQ0FBYTtRQUFtQixXQUFNLEdBQU4sTUFBTSxDQUFtQjtRQUR4RSxvQkFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQW1CLENBQUE7SUFDYSxDQUFDO0lBRTlGLElBQUk7UUFDQSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVELElBQUk7UUFDQSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7UUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFN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QkFDRyxNQUFNO1lBRVYsS0FBSyxHQUFHO2dCQUFFO29CQUNOLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFBO29CQUN6QyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7b0JBQ2xCLElBQUksU0FBUyxFQUFFO3dCQUNYLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUE7cUJBQzFCO2lCQUNKO2dCQUNHLE1BQU07WUFFVixLQUFLLEdBQUc7Z0JBQ0osSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFBO2dCQUN2QyxNQUFNO1lBRVYsS0FBSyxPQUFPO2dCQUNSLElBQUksRUFBRSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRTtvQkFDeEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFBO2lCQUMzQztxQkFBTTtvQkFDSCxJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUE7aUJBQzVDO2dCQUNELE1BQU07WUFFVixLQUFLLEdBQUc7Z0JBQ0osSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFBO2dCQUN4QyxNQUFNO1NBQ2I7SUFDTCxDQUFDO0NBQ0o7QUFFRCxLQUFLLFVBQVUsSUFBSTtJQUNmLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7SUFDckIsTUFBTSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUE7QUFDcEIsQ0FBQztBQUVELElBQUksRUFBRSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgaXRlciBmcm9tIFwiLi4vc2hhcmVkL2l0ZXIuanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuaW1wb3J0ICogYXMgZ2VuIGZyb20gXCIuL2dlbi5qc1wiXHJcbmltcG9ydCAqIGFzIGlucHV0IGZyb20gXCIuLi9zaGFyZWQvaW5wdXQuanNcIlxyXG5pbXBvcnQgKiBhcyBybCBmcm9tIFwiLi9ybC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgb3V0cHV0IGZyb20gXCIuL291dHB1dC5qc1wiXHJcbmltcG9ydCAqIGFzIHRoaW5ncyBmcm9tIFwiLi90aGluZ3MuanNcIlxyXG5pbXBvcnQgKiBhcyBtYXBzIGZyb20gXCIuL21hcHMuanNcIlxyXG5pbXBvcnQgKiBhcyByYW5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiXHJcblxyXG5jbGFzcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtb2RhbEJhY2tncm91bmQgPSBkb20uYnlJZChcIm1vZGFsQmFja2dyb3VuZFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGVsZW06IEhUTUxFbGVtZW50LCBwcml2YXRlIHJlYWRvbmx5IGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHsgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5tb2RhbEJhY2tncm91bmQuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmVsZW0uaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmVsZW0uZm9jdXMoKVxyXG4gICAgfVxyXG5cclxuICAgIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5tb2RhbEJhY2tncm91bmQuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuZWxlbS5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgdGhpcy5jYW52YXMuZm9jdXMoKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBoaWRkZW4oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZWxlbS5oaWRkZW5cclxuICAgIH1cclxuXHJcbiAgICB0b2dnbGUoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZWxlbS5oaWRkZW4pIHtcclxuICAgICAgICAgICAgdGhpcy5zaG93KClcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU3RhdHNEaWFsb2cgZXh0ZW5kcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBvcGVuQnV0dG9uID0gZG9tLmJ5SWQoXCJzdGF0c0J1dHRvblwiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwic3RhdHNDbG9zZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXIsIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICBzdXBlcihkb20uYnlJZChcInN0YXRzRGlhbG9nXCIpLCBjYW52YXMpXHJcblxyXG4gICAgICAgIHRoaXMub3BlbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy50b2dnbGUoKSlcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgZXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkVTQ0FQRVwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgY29uc3QgaGVhbHRoU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNIZWFsdGhcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3Qgc3RyZW5ndGhTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c1N0cmVuZ3RoXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGFnaWxpdHlTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0FnaWxpdHlcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgaW50ZWxsaWdlbmNlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNJbnRlbGxpZ2VuY2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgYXR0YWNrU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNBdHRhY2tcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZGFtYWdlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNEYW1hZ2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZGVmZW5zZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRGVmZW5zZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBsZXZlbFNwYW4gPSBkb20uYnlJZChcInN0YXRzTGV2ZWxcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZXhwZXJpZW5jZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRXhwZXJpZW5jZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuXHJcbiAgICAgICAgY29uc3QgZXhwZXJpZW5jZVJlcXVpcmVtZW50ID0gcmwuZ2V0RXhwZXJpZW5jZVJlcXVpcmVtZW50KHBsYXllci5sZXZlbCArIDEpXHJcblxyXG4gICAgICAgIGhlYWx0aFNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuaGVhbHRofSAvICR7cGxheWVyLm1heEhlYWx0aH1gXHJcbiAgICAgICAgc3RyZW5ndGhTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLnN0cmVuZ3RofWBcclxuICAgICAgICBhZ2lsaXR5U3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5hZ2lsaXR5fWBcclxuICAgICAgICBpbnRlbGxpZ2VuY2VTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmludGVsbGlnZW5jZX1gXHJcbiAgICAgICAgYXR0YWNrU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5tZWxlZUF0dGFja30gLyAke3BsYXllci5yYW5nZWRXZWFwb24gPyBwbGF5ZXIucmFuZ2VkQXR0YWNrIDogXCJOQVwifWBcclxuICAgICAgICBkYW1hZ2VTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLm1lbGVlRGFtYWdlfSAvICR7cGxheWVyLnJhbmdlZERhbWFnZSA/IHBsYXllci5yYW5nZWREYW1hZ2UgOiBcIk5BXCJ9YFxyXG4gICAgICAgIGRlZmVuc2VTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmRlZmVuc2V9YFxyXG4gICAgICAgIGFnaWxpdHlTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmFnaWxpdHl9YFxyXG4gICAgICAgIGxldmVsU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5sZXZlbH1gXHJcbiAgICAgICAgZXhwZXJpZW5jZVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuZXhwZXJpZW5jZX0gLyAke2V4cGVyaWVuY2VSZXF1aXJlbWVudH1gXHJcblxyXG4gICAgICAgIHN1cGVyLnNob3coKVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBJbnZlbnRvcnlEaWFsb2cgZXh0ZW5kcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBvcGVuQnV0dG9uID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlCdXR0b25cIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW5mb0RpdiA9IGRvbS5ieUlkKFwiaW52ZW50b3J5SW5mb1wiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBlbXB0eURpdiA9IGRvbS5ieUlkKFwiaW52ZW50b3J5RW1wdHlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdGFibGUgPSBkb20uYnlJZChcImludmVudG9yeVRhYmxlXCIpIGFzIEhUTUxUYWJsZUVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaXRlbVRlbXBsYXRlID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlJdGVtVGVtcGxhdGVcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBuZXh0UGFnZUJ1dHRvbiA9IGRvbS5ieUlkKFwiaW52ZW50b3J5TmV4dFBhZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcHJldlBhZ2VCdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeVByZXZQYWdlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNsb3NlQnV0dG9uID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlDbG9zZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWdlU2l6ZTogbnVtYmVyID0gOVxyXG4gICAgcHJpdmF0ZSBwYWdlSW5kZXg6IG51bWJlciA9IDBcclxuICAgIHByaXZhdGUgc2VsZWN0ZWRJbmRleDogbnVtYmVyID0gLTFcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyLCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgc3VwZXIoZG9tLmJ5SWQoXCJpbnZlbnRvcnlEaWFsb2dcIiksIGNhbnZhcylcclxuICAgICAgICB0aGlzLm9wZW5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMudG9nZ2xlKCkpXHJcbiAgICAgICAgdGhpcy5jbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5oaWRlKCkpXHJcblxyXG4gICAgICAgIHRoaXMubmV4dFBhZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5wYWdlSW5kZXgrK1xyXG4gICAgICAgICAgICB0aGlzLnBhZ2VJbmRleCA9IE1hdGgubWluKHRoaXMucGFnZUluZGV4LCBNYXRoLmNlaWwodGhpcy5wbGF5ZXIuaW52ZW50b3J5LnNpemUgLyB0aGlzLnBhZ2VTaXplKSlcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLnByZXZQYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucGFnZUluZGV4LS1cclxuICAgICAgICAgICAgdGhpcy5wYWdlSW5kZXggPSBNYXRoLm1heCh0aGlzLnBhZ2VJbmRleCwgMClcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGV2LmtleS50b1VwcGVyQ2FzZSgpXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoZXYua2V5KVxyXG5cclxuICAgICAgICAgICAgaWYgKGluZGV4ICYmIGluZGV4ID4gMCAmJiBpbmRleCA8PSA5KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSBpbmRleCAtIDFcclxuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiVVwiICYmIHRoaXMuc2VsZWN0ZWRJbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVzZSh0aGlzLnNlbGVjdGVkSW5kZXgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiRVwiICYmIHRoaXMuc2VsZWN0ZWRJbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmVxdWlwKHRoaXMuc2VsZWN0ZWRJbmRleClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJSXCIgJiYgdGhpcy5zZWxlY3RlZEluZGV4ID49IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlKHRoaXMuc2VsZWN0ZWRJbmRleClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJEXCIgJiYgdGhpcy5zZWxlY3RlZEluZGV4ID49IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZHJvcCh0aGlzLnNlbGVjdGVkSW5kZXgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiQVJST1dET1dOXCIgfHwga2V5ID09PSBcIlNcIikge1xyXG4gICAgICAgICAgICAgICAgKyt0aGlzLnNlbGVjdGVkSW5kZXhcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWluKHRoaXMuc2VsZWN0ZWRJbmRleCwgOClcclxuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiQVJST1dVUFwiIHx8IGtleSA9PT0gXCJXXCIpIHtcclxuICAgICAgICAgICAgICAgIC0tdGhpcy5zZWxlY3RlZEluZGV4XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSBNYXRoLm1heCh0aGlzLnNlbGVjdGVkSW5kZXgsIC0xKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFU0NBUEVcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LXVzZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGV2LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5nZXRSb3dJbmRleChldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpXHJcbiAgICAgICAgICAgIHRoaXMudXNlKGluZGV4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LWRyb3AtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZ2V0Um93SW5kZXgoZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50KVxyXG4gICAgICAgICAgICB0aGlzLmRyb3AoaW5kZXgpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKHRoaXMuZWxlbSwgXCJjbGlja1wiLCBcIi5pbnZlbnRvcnktZXF1aXAtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZ2V0Um93SW5kZXgoZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50KVxyXG4gICAgICAgICAgICB0aGlzLmVxdWlwKGluZGV4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LXJlbW92ZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGV2LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5nZXRSb3dJbmRleChldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpXHJcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKGluZGV4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaXRlbS1yb3dcIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IChldi50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgaWYgKHJvdykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Qocm93IGFzIEhUTUxUYWJsZVJvd0VsZW1lbnQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICBzdXBlci5zaG93KClcclxuICAgIH1cclxuXHJcbiAgICByZWZyZXNoKCkge1xyXG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy50YWJsZS50Qm9kaWVzWzBdXHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRib2R5KVxyXG5cclxuICAgICAgICBpZiAodGhpcy5wbGF5ZXIuaW52ZW50b3J5LnNpemUgPT09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lbXB0eURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgICAgICB0aGlzLmluZm9EaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW1wdHlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgICAgICB0aGlzLmluZm9EaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBhZ2VDb3VudCA9IE1hdGguY2VpbCh0aGlzLnBsYXllci5pbnZlbnRvcnkuc2l6ZSAvIHRoaXMucGFnZVNpemUpXHJcbiAgICAgICAgdGhpcy5wYWdlSW5kZXggPSBNYXRoLm1pbihNYXRoLm1heCgwLCB0aGlzLnBhZ2VJbmRleCksIHBhZ2VDb3VudCAtIDEpXHJcbiAgICAgICAgdGhpcy5wcmV2UGFnZUJ1dHRvbi5kaXNhYmxlZCA9IHRoaXMucGFnZUluZGV4IDw9IDBcclxuICAgICAgICB0aGlzLm5leHRQYWdlQnV0dG9uLmRpc2FibGVkID0gdGhpcy5wYWdlSW5kZXggPj0gcGFnZUNvdW50IC0gMVxyXG5cclxuICAgICAgICB0aGlzLmluZm9EaXYudGV4dENvbnRlbnQgPSBgUGFnZSAke3RoaXMucGFnZUluZGV4ICsgMX0gb2YgJHtwYWdlQ291bnR9YFxyXG5cclxuICAgICAgICBjb25zdCBpdGVtcyA9IGdldFNvcnRlZEl0ZW1zUGFnZSh0aGlzLnBsYXllci5pbnZlbnRvcnksIHRoaXMucGFnZUluZGV4LCB0aGlzLnBhZ2VTaXplKVxyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWluKHRoaXMuc2VsZWN0ZWRJbmRleCwgaXRlbXMubGVuZ3RoIC0gMSlcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gaXRlbXNbaV1cclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0aGlzLml0ZW1UZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHRyID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLml0ZW0tcm93XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1JbmRleFRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0taW5kZXhcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLW5hbWVcIilcclxuICAgICAgICAgICAgY29uc3QgZXF1aXBCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LWVxdWlwLWJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCByZW1vdmVCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LXJlbW92ZS1idXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3QgdXNlQnV0dG9uID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLmludmVudG9yeS11c2UtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcblxyXG4gICAgICAgICAgICBpdGVtSW5kZXhUZC50ZXh0Q29udGVudCA9IChpICsgMSkudG9TdHJpbmcoKVxyXG4gICAgICAgICAgICBpdGVtTmFtZVRkLnRleHRDb250ZW50ID0gaXRlbS5uYW1lXHJcblxyXG4gICAgICAgICAgICBpZiAoIShpdGVtIGluc3RhbmNlb2YgcmwuVXNhYmxlKSkge1xyXG4gICAgICAgICAgICAgICAgdXNlQnV0dG9uLnJlbW92ZSgpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCFybC5pc0VxdWlwcGFibGUoaXRlbSkgfHwgdGhpcy5wbGF5ZXIuaXNFcXVpcHBlZChpdGVtKSkge1xyXG4gICAgICAgICAgICAgICAgZXF1aXBCdXR0b24ucmVtb3ZlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCF0aGlzLnBsYXllci5pc0VxdWlwcGVkKGl0ZW0pKSB7XHJcbiAgICAgICAgICAgICAgICByZW1vdmVCdXR0b24ucmVtb3ZlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGkgPT09IHRoaXMuc2VsZWN0ZWRJbmRleCkge1xyXG4gICAgICAgICAgICAgICAgdHIuY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNlbGVjdChzZWxlY3RlZFJvdzogSFRNTFRhYmxlUm93RWxlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IHJvd3MgPSBBcnJheS5mcm9tKHRoaXMuZWxlbS5xdWVyeVNlbGVjdG9yQWxsKFwiLml0ZW0tcm93XCIpKVxyXG4gICAgICAgIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcclxuICAgICAgICAgICAgcm93LmNsYXNzTGlzdC5yZW1vdmUoXCJzZWxlY3RlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2VsZWN0ZWRSb3cuY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRSb3dJbmRleChlbGVtOiBIVE1MQnV0dG9uRWxlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IGluZGV4ID0gZG9tLmdldEVsZW1lbnRJbmRleChlbGVtLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudClcclxuICAgICAgICByZXR1cm4gaW5kZXhcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVzZShpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaSA9IHRoaXMucGFnZUluZGV4ICogdGhpcy5wYWdlU2l6ZSArIGluZGV4XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEl0ZW1zKHRoaXMucGxheWVyLmludmVudG9yeSlbaV1cclxuICAgICAgICBpZiAoIShpdGVtIGluc3RhbmNlb2YgcmwuVXNhYmxlKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVzZUl0ZW0odGhpcy5wbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyb3AoaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGkgPSB0aGlzLnBhZ2VJbmRleCAqIHRoaXMucGFnZVNpemUgKyBpbmRleFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLnBsYXllci5pbnZlbnRvcnkpW2ldXHJcbiAgICAgICAgZHJvcEl0ZW0odGhpcy5wbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGVxdWlwKGluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBpID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplICsgaW5kZXhcclxuICAgICAgICBjb25zdCBpdGVtID0gZ2V0U29ydGVkSXRlbXModGhpcy5wbGF5ZXIuaW52ZW50b3J5KVtpXVxyXG4gICAgICAgIGlmICghcmwuaXNFcXVpcHBhYmxlKGl0ZW0pKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXF1aXBJdGVtKHRoaXMucGxheWVyLCBpdGVtKVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZW1vdmUoaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGkgPSB0aGlzLnBhZ2VJbmRleCAqIHRoaXMucGFnZVNpemUgKyBpbmRleFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLnBsYXllci5pbnZlbnRvcnkpW2ldXHJcbiAgICAgICAgaWYgKCFybC5pc0VxdWlwcGFibGUoaXRlbSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZW1vdmVJdGVtKHRoaXMucGxheWVyLCBpdGVtKVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIENvbnRhaW5lckRpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpYWxvZzogRGlhbG9nXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG5hbWVTcGFuID0gZG9tLmJ5SWQoXCJjb250YWluZXJOYW1lXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwiY29udGFpbmVyQ2xvc2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdGFrZUFsbEJ1dHRvbiA9IGRvbS5ieUlkKFwiY29udGFpbmVyVGFrZUFsbEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXJUYWJsZSA9IGRvbS5ieUlkKFwiY29udGFpbmVyVGFibGVcIikgYXMgSFRNTFRhYmxlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXJJdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcImNvbnRhaW5lckl0ZW1UZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwcml2YXRlIG1hcDogbWFwcy5NYXAgfCBudWxsID0gbnVsbFxyXG4gICAgcHJpdmF0ZSBjb250YWluZXI6IHJsLkNvbnRhaW5lciB8IG51bGwgPSBudWxsXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IERpYWxvZyhkb20uYnlJZChcImNvbnRhaW5lckRpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgICAgIHRoaXMucGxheWVyID0gcGxheWVyXHJcbiAgICAgICAgdGhpcy5jbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5oaWRlKCkpXHJcbiAgICAgICAgdGhpcy50YWtlQWxsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnRha2VBbGwoKSlcclxuICAgICAgICBjb25zdCBlbGVtID0gdGhpcy5kaWFsb2cuZWxlbVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUoZWxlbSwgXCJjbGlja1wiLCBcIi5jb250YWluZXItdGFrZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBidG4gPSBldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KHJvdylcclxuICAgICAgICAgICAgdGhpcy50YWtlKGlkeClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qga2V5ID0gZXYua2V5LnRvVXBwZXJDYXNlKClcclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJDXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiQVwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRha2VBbGwoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHBhcnNlSW50KGV2LmtleSlcclxuICAgICAgICAgICAgaWYgKGluZGV4ICYmIGluZGV4ID4gMCAmJiBpbmRleCA8PSA5KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRha2UoaW5kZXggLSAxKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KG1hcDogbWFwcy5NYXAsIGNvbnRhaW5lcjogcmwuQ29udGFpbmVyKSB7XHJcbiAgICAgICAgdGhpcy5tYXAgPSBtYXBcclxuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IGNvbnRhaW5lclxyXG4gICAgICAgIHRoaXMubmFtZVNwYW4udGV4dENvbnRlbnQgPSB0aGlzLmNvbnRhaW5lci5uYW1lXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB0aGlzLmRpYWxvZy5zaG93KClcclxuICAgIH1cclxuXHJcbiAgICBoaWRlKCkge1xyXG4gICAgICAgIGlmICh0aGlzLm1hcCAmJiB0aGlzLmNvbnRhaW5lciAmJiB0aGlzLmNvbnRhaW5lci5pdGVtcy5zaXplID09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5tYXAuY29udGFpbmVycy5kZWxldGUodGhpcy5jb250YWluZXIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IG51bGxcclxuICAgICAgICB0aGlzLmRpYWxvZy5oaWRlKClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgaGlkZGVuKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRpYWxvZy5oaWRkZW5cclxuICAgIH1cclxuXHJcbiAgICByZWZyZXNoKCkge1xyXG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy5jb250YWluZXJUYWJsZS50Qm9kaWVzWzBdXHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRib2R5KVxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaXRlbXMgPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLmNvbnRhaW5lci5pdGVtcylcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBpdGVtc1tpXVxyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMuY29udGFpbmVySXRlbVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgdHIgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbUluZGV4VGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1pbmRleFwiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtTmFtZVRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0tbmFtZVwiKVxyXG4gICAgICAgICAgICBpdGVtSW5kZXhUZC50ZXh0Q29udGVudCA9IGAke2kgKyAxfWBcclxuICAgICAgICAgICAgaXRlbU5hbWVUZC50ZXh0Q29udGVudCA9IGl0ZW0ubmFtZVxyXG4gICAgICAgICAgICB0Ym9keS5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGFrZShpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLmNvbnRhaW5lci5pdGVtcylbaW5kZXhdXHJcbiAgICAgICAgaWYgKCFpdGVtKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuaXRlbXMuZGVsZXRlKGl0ZW0pXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIuaW52ZW50b3J5LmFkZChpdGVtKVxyXG5cclxuICAgICAgICAvLyBoaWRlIGlmIHRoaXMgd2FzIHRoZSBsYXN0IGl0ZW1cclxuICAgICAgICBpZiAodGhpcy5jb250YWluZXIuaXRlbXMuc2l6ZSA9PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGFrZUFsbCgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuY29udGFpbmVyLml0ZW1zKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLml0ZW1zLmRlbGV0ZShpdGVtKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXllci5pbnZlbnRvcnkuYWRkKGl0ZW0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBEZWZlYXREaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0cnlBZ2FpbkJ1dHRvbiA9IGRvbS5ieUlkKFwidHJ5QWdhaW5CdXR0b25cIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGlhbG9nOiBEaWFsb2dcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cgPSBuZXcgRGlhbG9nKGRvbS5ieUlkKFwiZGVmZWF0RGlhbG9nXCIpLCBjYW52YXMpXHJcbiAgICAgICAgdGhpcy50cnlBZ2FpbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy50cnlBZ2FpbigpKVxyXG4gICAgICAgIHRoaXMuZGlhbG9nLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlRcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50cnlBZ2FpbigpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiRU5URVJcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50cnlBZ2FpbigpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cuc2hvdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB0cnlBZ2FpbigpIHtcclxuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKGZhbHNlKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTb3J0ZWRJdGVtcyhpdGVtczogSXRlcmFibGU8cmwuSXRlbT4pOiBybC5JdGVtW10ge1xyXG4gICAgY29uc3Qgc29ydGVkSXRlbXMgPSBpdGVyLm9yZGVyQnkoaXRlbXMsIGkgPT4gaS5uYW1lKVxyXG4gICAgcmV0dXJuIHNvcnRlZEl0ZW1zXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFNvcnRlZEl0ZW1zUGFnZShpdGVtczogSXRlcmFibGU8cmwuSXRlbT4sIHBhZ2VJbmRleDogbnVtYmVyLCBwYWdlU2l6ZTogbnVtYmVyKTogcmwuSXRlbVtdIHtcclxuICAgIGNvbnN0IHN0YXJ0SW5kZXggPSBwYWdlSW5kZXggKiBwYWdlU2l6ZVxyXG4gICAgY29uc3QgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgcGFnZVNpemVcclxuICAgIGNvbnN0IHNvcnRlZEl0ZW1zID0gZ2V0U29ydGVkSXRlbXMoaXRlbXMpXHJcbiAgICBjb25zdCBwYWdlID0gc29ydGVkSXRlbXMuc2xpY2Uoc3RhcnRJbmRleCwgZW5kSW5kZXgpXHJcbiAgICByZXR1cm4gcGFnZVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYW5TZWUobWFwOiBtYXBzLk1hcCwgZXllOiBnZW8uUG9pbnQsIHRhcmdldDogZ2VvLlBvaW50LCBsaWdodFJhZGl1czogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICBpZiAoZ2VvLmNhbGNNYW5oYXR0ZW5EaXN0KGV5ZSwgdGFyZ2V0KSA+IGxpZ2h0UmFkaXVzKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCBwdCBvZiBtYXJjaChleWUsIHRhcmdldCkpIHtcclxuICAgICAgICAvLyBpZ25vcmUgc3RhcnQgcG9pbnRcclxuICAgICAgICBpZiAocHQuZXF1YWwoZXllKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCB0aCBvZiBtYXAuYXQocHQpKSB7XHJcbiAgICAgICAgICAgIGlmICghdGgudHJhbnNwYXJlbnQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uKiBtYXJjaChzdGFydDogZ2VvLlBvaW50LCBlbmQ6IGdlby5Qb2ludCk6IEdlbmVyYXRvcjxnZW8uUG9pbnQ+IHtcclxuICAgIGNvbnN0IGN1ciA9IHN0YXJ0LmNsb25lKClcclxuICAgIGNvbnN0IGR5ID0gTWF0aC5hYnMoZW5kLnkgLSBzdGFydC55KTtcclxuICAgIGNvbnN0IHN5ID0gc3RhcnQueSA8IGVuZC55ID8gMSA6IC0xO1xyXG4gICAgY29uc3QgZHggPSAtTWF0aC5hYnMoZW5kLnggLSBzdGFydC54KTtcclxuICAgIGNvbnN0IHN4ID0gc3RhcnQueCA8IGVuZC54ID8gMSA6IC0xO1xyXG4gICAgbGV0IGVyciA9IGR5ICsgZHg7XHJcblxyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICB5aWVsZCBjdXJcclxuXHJcbiAgICAgICAgaWYgKGN1ci5lcXVhbChlbmQpKSB7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZTIgPSAyICogZXJyO1xyXG4gICAgICAgIGlmIChlMiA+PSBkeCkge1xyXG4gICAgICAgICAgICBlcnIgKz0gZHg7XHJcbiAgICAgICAgICAgIGN1ci55ICs9IHN5O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUyIDw9IGR5KSB7XHJcbiAgICAgICAgICAgIGVyciArPSBkeTtcclxuICAgICAgICAgICAgY3VyLnggKz0gc3g7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcm9wSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuSXRlbSk6IHZvaWQge1xyXG4gICAgcGxheWVyLmRlbGV0ZShpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSB3YXMgZHJvcHBlZGApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZUl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLlVzYWJsZSk6IHZvaWQge1xyXG4gICAgY29uc3QgYW1vdW50ID0gTWF0aC5taW4oaXRlbS5oZWFsdGgsIHBsYXllci5tYXhIZWFsdGggLSBwbGF5ZXIuaGVhbHRoKVxyXG4gICAgcGxheWVyLmhlYWx0aCArPSBhbW91bnRcclxuICAgIHBsYXllci5kZWxldGUoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gcmVzdG9yZWQgJHthbW91bnR9IGhlYWx0aGApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVxdWlwSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuRXF1aXBwYWJsZSk6IHZvaWQge1xyXG4gICAgcGxheWVyLmVxdWlwKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHdhcyBlcXVpcHBlZGApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZUl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkVxdWlwcGFibGUpOiB2b2lkIHtcclxuICAgIHBsYXllci5yZW1vdmUoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gd2FzIHJlbW92ZWRgKVxyXG59XHJcblxyXG5lbnVtIFRhcmdldENvbW1hbmQge1xyXG4gICAgTm9uZSxcclxuICAgIEF0dGFjayxcclxuICAgIFNob290LFxyXG4gICAgTG9va1xyXG59XHJcblxyXG5jbGFzcyBBcHAge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW52YXMgPSBkb20uYnlJZChcImNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBhdHRhY2tCdXR0b24gPSBkb20uYnlJZChcImF0dGFja0J1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzaG9vdEJ1dHRvbiA9IGRvbS5ieUlkKFwic2hvb3RCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbG9va0J1dHRvbiA9IGRvbS5ieUlkKFwibG9va0J1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZW5kZXJlciA9IG5ldyBnZnguUmVuZGVyZXIodGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyID0gdGhpbmdzLnBsYXllci5jbG9uZSgpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGlucDogaW5wdXQuSW5wdXQgPSBuZXcgaW5wdXQuSW5wdXQodGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN0YXRzRGlhbG9nID0gbmV3IFN0YXRzRGlhbG9nKHRoaXMucGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW52ZW50b3J5RGlhbG9nID0gbmV3IEludmVudG9yeURpYWxvZyh0aGlzLnBsYXllciwgdGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lckRpYWxvZyA9IG5ldyBDb250YWluZXJEaWFsb2codGhpcy5wbGF5ZXIsIHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBkZWZlYXREaWFsb2cgPSBuZXcgRGVmZWF0RGlhbG9nKHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSBtYXA6IG1hcHMuTWFwID0gbmV3IG1hcHMuTWFwKDAsIDAsIHRoaXMucGxheWVyKVxyXG4gICAgcHJpdmF0ZSB0YXJnZXRDb21tYW5kOiBUYXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5Ob25lXHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5wbGF5ZXJcclxuICAgICAgICBwbGF5ZXIuaW52ZW50b3J5LmFkZCh0aGluZ3MuaGVhbHRoUG90aW9uLmNsb25lKCkpXHJcbiAgICAgICAgcGxheWVyLmludmVudG9yeS5hZGQodGhpbmdzLnNsaW5nU2hvdClcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjKCkge1xyXG4gICAgICAgIHRoaXMuY2FudmFzLmZvY3VzKClcclxuICAgICAgICB0aGlzLm1hcCA9IGF3YWl0IGdlbi5nZW5lcmF0ZU91dGRvb3JNYXAodGhpcy5yZW5kZXJlciwgdGhpcy5wbGF5ZXIsIDY0LCA2NClcclxuICAgICAgICBpZiAoIXRoaXMucGxheWVyLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBsYXllciBpcyBub3QgcG9zaXRpb25lZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgb3V0cHV0LndyaXRlKFwiWW91ciBhZHZlbnR1cmUgYmVnaW5zXCIpXHJcbiAgICAgICAgdGhpcy5oYW5kbGVSZXNpemUoKVxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLnRpY2soKSlcclxuXHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4gdGhpcy5oYW5kbGVLZXlQcmVzcyhldikpXHJcblxyXG4gICAgICAgIHRoaXMuYXR0YWNrQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuQXR0YWNrXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5zaG9vdEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLlNob290XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5sb29rQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuTG9va1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHRpY2soKSB7XHJcbiAgICAgICAgdGhpcy5oYW5kbGVSZXNpemUoKVxyXG4gICAgICAgIGNvbnN0IG5leHRDcmVhdHVyZSA9IHRoaXMuZ2V0TmV4dENyZWF0dXJlKClcclxuICAgICAgICBpZiAobmV4dENyZWF0dXJlIGluc3RhbmNlb2YgcmwuUGxheWVyKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmhhbmRsZUlucHV0KCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eSgpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKG5leHRDcmVhdHVyZSBpbnN0YW5jZW9mIHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgdGhpcy50aWNrTW9uc3RlcihuZXh0Q3JlYXR1cmUpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy50aWNrUm91bmQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmF3RnJhbWUoKVxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLnRpY2soKSlcclxuICAgIH1cclxuXHJcbiAgICBnZXROZXh0TW9uc3RlcigpOiBybC5Nb25zdGVyIHwgbnVsbCB7XHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHdob3NlIHR1cm4gaXQgaXNcclxuICAgICAgICBsZXQgbmV4dE1vbnN0ZXIgPSBudWxsXHJcbiAgICAgICAgZm9yIChjb25zdCBtb25zdGVyIG9mIHRoaXMubWFwLm1vbnN0ZXJzKSB7XHJcbiAgICAgICAgICAgIGlmIChtb25zdGVyLnN0YXRlICE9PSBybC5Nb25zdGVyU3RhdGUuYWdncm8pIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChtb25zdGVyLmFjdGlvbiA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIW5leHRNb25zdGVyIHx8IG1vbnN0ZXIuYWN0aW9uID4gbmV4dE1vbnN0ZXIuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBuZXh0TW9uc3RlciA9IG1vbnN0ZXJcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG5leHRNb25zdGVyXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TmV4dENyZWF0dXJlKCk6IHJsLk1vbnN0ZXIgfCBybC5QbGF5ZXIgfCBudWxsIHtcclxuICAgICAgICBjb25zdCBtb25zdGVyID0gdGhpcy5nZXROZXh0TW9uc3RlcigpXHJcbiAgICAgICAgaWYgKHRoaXMucGxheWVyLmFjdGlvbiA+IDAgJiYgdGhpcy5wbGF5ZXIuYWN0aW9uID4gKG1vbnN0ZXI/LmFjdGlvbiA/PyAwKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wbGF5ZXJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtb25zdGVyXHJcbiAgICB9XHJcblxyXG4gICAgdGlja1JvdW5kKCkge1xyXG4gICAgICAgIC8vIGFjY3VtdWxhdGUgYWN0aW9uIHBvaW50c1xyXG4gICAgICAgIGZvciAoY29uc3QgbW9uc3RlciBvZiBpdGVyLmZpbHRlcih0aGlzLm1hcC5tb25zdGVycywgbSA9PiBtLnN0YXRlID09PSBybC5Nb25zdGVyU3RhdGUuYWdncm8pKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc2VydmUgPSBNYXRoLm1pbihtb25zdGVyLmFjdGlvblJlc2VydmUsIG1vbnN0ZXIuYWdpbGl0eSlcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gPSAxICsgbW9uc3Rlci5hZ2lsaXR5ICsgcmVzZXJ2ZVxyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvblJlc2VydmUgPSAwXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjYXAgYWN0aW9uIHJlc2VydmUgXHJcbiAgICAgICAgY29uc3QgcmVzZXJ2ZSA9IE1hdGgubWluKHRoaXMucGxheWVyLmFjdGlvblJlc2VydmUsIHRoaXMucGxheWVyLmFnaWxpdHkpXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIuYWN0aW9uID0gMSArIHRoaXMucGxheWVyLmFnaWxpdHkgKyByZXNlcnZlXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIuYWN0aW9uUmVzZXJ2ZSA9IDBcclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGVNb25zdGVyU3RhdGVzKClcclxuICAgIH1cclxuXHJcbiAgICBnZXRTY3JvbGxPZmZzZXQoKTogZ2VvLlBvaW50IHtcclxuICAgICAgICAvLyBjb252ZXJ0IG1hcCBwb2ludCB0byBjYW52YXMgcG9pbnQsIG5vdGluZyB0aGF0IGNhbnZhcyBpcyBjZW50ZXJlZCBvbiBwbGF5ZXJcclxuICAgICAgICBjb25zdCBwbGF5ZXJQb3NpdGlvbiA9IHRoaXMucGxheWVyLnBvc2l0aW9uXHJcbiAgICAgICAgY29uc3QgY2FudmFzQ2VudGVyID0gbmV3IGdlby5Qb2ludCh0aGlzLmNhbnZhcy53aWR0aCAvIDIsIHRoaXMuY2FudmFzLmhlaWdodCAvIDIpXHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gY2FudmFzQ2VudGVyLnN1YlBvaW50KHBsYXllclBvc2l0aW9uLmFkZFNjYWxhciguNSkubXVsU2NhbGFyKHJsLnRpbGVTaXplKSlcclxuICAgICAgICByZXR1cm4gb2Zmc2V0LmZsb29yKClcclxuICAgIH1cclxuXHJcbiAgICBjYW52YXNUb01hcFBvaW50KGN4eTogZ2VvLlBvaW50KSB7XHJcbiAgICAgICAgY29uc3Qgc2Nyb2xsT2Zmc2V0ID0gdGhpcy5nZXRTY3JvbGxPZmZzZXQoKVxyXG4gICAgICAgIGNvbnN0IG14eSA9IGN4eS5zdWJQb2ludChzY3JvbGxPZmZzZXQpLmRpdlNjYWxhcihybC50aWxlU2l6ZSkuZmxvb3IoKVxyXG4gICAgICAgIHJldHVybiBteHlcclxuICAgIH1cclxuXHJcbiAgICBtYXBUb0NhbnZhc1BvaW50KG14eTogZ2VvLlBvaW50KSB7XHJcbiAgICAgICAgY29uc3Qgc2Nyb2xsT2Zmc2V0ID0gdGhpcy5nZXRTY3JvbGxPZmZzZXQoKVxyXG4gICAgICAgIGNvbnN0IGN4eSA9IG14eS5tdWxTY2FsYXIocmwudGlsZVNpemUpLmFkZFBvaW50KHNjcm9sbE9mZnNldClcclxuICAgICAgICByZXR1cm4gY3h5XHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc1BsYXllck1lbGVlQXR0YWNrKGRlZmVuZGVyOiBybC5Nb25zdGVyKSB7XHJcbiAgICAgICAgLy8gYmFzZSA2MCUgY2hhbmNlIHRvIGhpdFxyXG4gICAgICAgIC8vIDEwJSBib251cyAvIHBlbmFsdHkgZm9yIGV2ZXJ5IHBvaW50IGRpZmZlcmVuY2UgYmV0d2VlbiBhdHRhY2sgYW5kIGRlZmVuc2VcclxuICAgICAgICAvLyBib3R0b21zIG91dCBhdCA1JSAtIGFsd2F5cyBTT01FIGNoYW5jZSB0byBoaXRcclxuICAgICAgICBjb25zdCBhdHRhY2tlciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgY29uc3QgYm9udXMgPSAoYXR0YWNrZXIubWVsZWVBdHRhY2sgLSBkZWZlbmRlci5kZWZlbnNlKSAqIC4xXHJcbiAgICAgICAgY29uc3QgaGl0Q2hhbmNlID0gTWF0aC5taW4oTWF0aC5tYXgoLjYgKyBib251cywgLjA1KSwgLjk1KVxyXG4gICAgICAgIGNvbnN0IGhpdCA9IHJhbmQuY2hhbmNlKGhpdENoYW5jZSlcclxuICAgICAgICBjb25zdCB3ZWFwb24gPSBhdHRhY2tlci5tZWxlZVdlYXBvbiA/PyB0aGluZ3MuZmlzdHNcclxuICAgICAgICBjb25zdCBhdHRhY2tWZXJiID0gd2VhcG9uLnZlcmIgPyB3ZWFwb24udmVyYiA6IFwiYXR0YWNrc1wiXHJcbiAgICAgICAgYXR0YWNrZXIuYWN0aW9uIC09IHdlYXBvbi5hY3Rpb25cclxuXHJcbiAgICAgICAgaWYgKCFoaXQpIHtcclxuICAgICAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7YXR0YWNrZXIubmFtZX0gJHthdHRhY2tWZXJifSAke2RlZmVuZGVyLm5hbWV9IGJ1dCBtaXNzZXMhYClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoaXQgLSBjYWxjdWxhdGUgZGFtYWdlXHJcbiAgICAgICAgY29uc3QgZGFtYWdlID0gYXR0YWNrZXIubWVsZWVEYW1hZ2Uucm9sbCgpXHJcbiAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7YXR0YWNrZXIubmFtZX0gJHthdHRhY2tWZXJifSAke2RlZmVuZGVyLm5hbWV9IGFuZCBoaXRzIGZvciAke2RhbWFnZX0gZGFtYWdlIWApXHJcbiAgICAgICAgZGVmZW5kZXIuaGVhbHRoIC09IGRhbWFnZVxyXG5cclxuICAgICAgICBpZiAoZGVmZW5kZXIuaGVhbHRoIDwgMCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHtkZWZlbmRlci5uYW1lfSBoYXMgYmVlbiBkZWZlYXRlZCBhbmQgJHthdHRhY2tlci5uYW1lfSByZWNlaXZlcyAke2RlZmVuZGVyLmV4cGVyaWVuY2V9IGV4cGVyaWVuY2VgKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXllci5leHBlcmllbmNlICs9IGRlZmVuZGVyLmV4cGVyaWVuY2VcclxuICAgICAgICAgICAgdGhpcy5tYXAubW9uc3RlcnMuZGVsZXRlKGRlZmVuZGVyKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzUGxheWVyUmFuZ2VkQXR0YWNrKGRlZmVuZGVyOiBybC5Nb25zdGVyKSB7XHJcbiAgICAgICAgLy8gYmFzZSA0MCUgY2hhbmNlIHRvIGhpdFxyXG4gICAgICAgIC8vIDEwJSBib251cyAvIHBlbmFsdHkgZm9yIGV2ZXJ5IHBvaW50IGRpZmZlcmVuY2UgYmV0d2VlbiBhdHRhY2sgYW5kIGRlZmVuc2VcclxuICAgICAgICAvLyBib3R0b21zIG91dCBhdCA1JSAtIGFsd2F5cyBTT01FIGNoYW5jZSB0byBoaXRcclxuICAgICAgICBjb25zdCBhdHRhY2tlciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgaWYgKCFhdHRhY2tlci5yYW5nZWRXZWFwb24pIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUGxheWVyIGhhcyBubyByYW5nZWQgd2VhcG9uIGVxdWlwcGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBib251cyA9IChhdHRhY2tlci5yYW5nZWRBdHRhY2sgLSBkZWZlbmRlci5kZWZlbnNlKSAqIC4xXHJcbiAgICAgICAgY29uc3QgaGl0Q2hhbmNlID0gTWF0aC5taW4oTWF0aC5tYXgoLjYgKyBib251cywgLjA1KSwgLjk1KVxyXG4gICAgICAgIGNvbnN0IGhpdCA9IHJhbmQuY2hhbmNlKGhpdENoYW5jZSlcclxuICAgICAgICBjb25zdCB3ZWFwb24gPSBhdHRhY2tlci5yYW5nZWRXZWFwb25cclxuICAgICAgICBjb25zdCBhdHRhY2tWZXJiID0gd2VhcG9uLnZlcmIgPyB3ZWFwb24udmVyYiA6IFwiYXR0YWNrc1wiXHJcbiAgICAgICAgYXR0YWNrZXIuYWN0aW9uIC09IHdlYXBvbi5hY3Rpb25cclxuXHJcbiAgICAgICAgaWYgKCFoaXQpIHtcclxuICAgICAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7YXR0YWNrZXIubmFtZX0gJHthdHRhY2tWZXJifSAke2RlZmVuZGVyLm5hbWV9IGJ1dCBtaXNzZXMhYClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoaXQgLSBjYWxjdWxhdGUgZGFtYWdlXHJcbiAgICAgICAgY29uc3QgZGFtYWdlID0gYXR0YWNrZXIucmFuZ2VkRGFtYWdlPy5yb2xsKCkgPz8gMFxyXG4gICAgICAgIG91dHB1dC53YXJuaW5nKGAke2F0dGFja2VyLm5hbWV9ICR7YXR0YWNrVmVyYn0gJHtkZWZlbmRlci5uYW1lfSBhbmQgaGl0cyBmb3IgJHtkYW1hZ2V9IGRhbWFnZSFgKVxyXG4gICAgICAgIGRlZmVuZGVyLmhlYWx0aCAtPSBkYW1hZ2VcclxuXHJcbiAgICAgICAgaWYgKGRlZmVuZGVyLmhlYWx0aCA8IDApIHtcclxuICAgICAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7ZGVmZW5kZXIubmFtZX0gaGFzIGJlZW4gZGVmZWF0ZWQgYW5kICR7YXR0YWNrZXIubmFtZX0gcmVjZWl2ZXMgJHtkZWZlbmRlci5leHBlcmllbmNlfSBleHBlcmllbmNlYClcclxuICAgICAgICAgICAgdGhpcy5wbGF5ZXIuZXhwZXJpZW5jZSArPSBkZWZlbmRlci5leHBlcmllbmNlXHJcbiAgICAgICAgICAgIHRoaXMubWFwLm1vbnN0ZXJzLmRlbGV0ZShkZWZlbmRlcilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc01vbnN0ZXJBdHRhY2soYXR0YWNrZXI6IHJsLk1vbnN0ZXIsIGF0dGFjazogcmwuQXR0YWNrKSB7XHJcbiAgICAgICAgLy8gYmFzZSA2MCUgY2hhbmNlIHRvIGhpdFxyXG4gICAgICAgIC8vIDEwJSBib251cyAvIHBlbmFsdHkgZm9yIGV2ZXJ5IHBvaW50IGRpZmZlcmVuY2UgYmV0d2VlbiBhdHRhY2sgYW5kIGRlZmVuc2VcclxuICAgICAgICAvLyBjbGFtcHMgdG8gb3V0IGF0IFs1LCA5NV0gLSBhbHdheXMgU09NRSBjaGFuY2UgdG8gaGl0IG9yIG1pc3NcclxuICAgICAgICAvLyBjaG9vc2UgYW4gYXR0YWNrIGZyb20gcmVwZXJ0b2lyZSBvZiBtb25zdGVyXHJcbiAgICAgICAgY29uc3QgZGVmZW5kZXIgPSB0aGlzLnBsYXllclxyXG4gICAgICAgIGNvbnN0IGJvbnVzID0gKGF0dGFjay5hdHRhY2sgLSBkZWZlbmRlci5kZWZlbnNlKSAqIC4xXHJcbiAgICAgICAgY29uc3QgaGl0Q2hhbmNlID0gTWF0aC5tYXgoLjYgKyBib251cywgLjA1KVxyXG4gICAgICAgIGNvbnN0IGhpdCA9IHJhbmQuY2hhbmNlKGhpdENoYW5jZSlcclxuICAgICAgICBjb25zdCBhdHRhY2tWZXJiID0gYXR0YWNrLnZlcmIgPyBhdHRhY2sudmVyYiA6IFwiYXR0YWNrc1wiXHJcbiAgICAgICAgYXR0YWNrZXIuYWN0aW9uIC09IGF0dGFjay5hY3Rpb25cclxuXHJcbiAgICAgICAgaWYgKCFoaXQpIHtcclxuICAgICAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7YXR0YWNrZXIubmFtZX0gJHthdHRhY2tWZXJifSAke2RlZmVuZGVyLm5hbWV9IGJ1dCBtaXNzZXMhYClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoaXQgLSBjYWxjdWxhdGUgZGFtYWdlXHJcbiAgICAgICAgY29uc3QgZGFtYWdlID0gYXR0YWNrLmRhbWFnZS5yb2xsKClcclxuICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYW5kIGhpdHMgZm9yICR7ZGFtYWdlfSBkYW1hZ2UhYClcclxuICAgICAgICBkZWZlbmRlci5oZWFsdGggLT0gZGFtYWdlXHJcblxyXG4gICAgICAgIGlmIChkZWZlbmRlci5oZWFsdGggPD0gMCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHtkZWZlbmRlci5uYW1lfSBoYXMgYmVlbiBkZWZlYXRlZCFgKVxyXG4gICAgICAgICAgICB0aGlzLmRlZmVhdERpYWxvZy5zaG93KClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlTW9uc3RlclN0YXRlcygpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IG1vbnN0ZXIgb2YgdGhpcy5tYXAubW9uc3RlcnMpIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVNb25zdGVyU3RhdGUobW9uc3RlcilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlTW9uc3RlclN0YXRlKG1vbnN0ZXI6IHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAvLyBhZ2dybyBzdGF0ZVxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgY29uc3QgbGlnaHRSYWRpdXMgPSB0aGlzLmNhbGNMaWdodFJhZGl1cygpXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIuc3RhdGUgIT09IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dybyAmJiBjYW5TZWUobWFwLCBtb25zdGVyLnBvc2l0aW9uLCBtYXAucGxheWVyLnBvc2l0aW9uLCBsaWdodFJhZGl1cykpIHtcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gPSAwXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuc3RhdGUgPSBybC5Nb25zdGVyU3RhdGUuYWdncm9cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChtb25zdGVyLnN0YXRlID09PSBybC5Nb25zdGVyU3RhdGUuYWdncm8gJiYgIWNhblNlZShtYXAsIG1vbnN0ZXIucG9zaXRpb24sIG1hcC5wbGF5ZXIucG9zaXRpb24sIGxpZ2h0UmFkaXVzKSkge1xyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvbiA9IDBcclxuICAgICAgICAgICAgbW9uc3Rlci5zdGF0ZSA9IHJsLk1vbnN0ZXJTdGF0ZS5pZGxlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRpY2tNb25zdGVyKG1vbnN0ZXI6IHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAvLyBpZiBwbGF5ZXIgaXMgd2l0aGluIHJlYWNoIChhbmQgYWxpdmUpLCBhdHRhY2tcclxuICAgICAgICBpZiAodGhpcy5wbGF5ZXIuaGVhbHRoID4gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBkaXN0YW5jZVRvUGxheWVyID0gZ2VvLmNhbGNNYW5oYXR0ZW5EaXN0KHRoaXMucGxheWVyLnBvc2l0aW9uLCBtb25zdGVyLnBvc2l0aW9uKVxyXG4gICAgICAgICAgICBjb25zdCBhdHRhY2tzID0gbW9uc3Rlci5hdHRhY2tzLmZpbHRlcihhID0+IGEucmFuZ2UgPj0gZGlzdGFuY2VUb1BsYXllcilcclxuICAgICAgICAgICAgaWYgKGF0dGFja3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYXR0YWNrID0gcmFuZC5jaG9vc2UoYXR0YWNrcylcclxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc01vbnN0ZXJBdHRhY2sobW9uc3RlciwgYXR0YWNrKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGRldGVybWluZSB3aGV0aGVyIG1vbnN0ZXIgY2FuIHNlZSBwbGF5ZXJcclxuICAgICAgICAvLyBzZWVrIGFuZCBkZXN0cm95XHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBjb25zdCBwYXRoID0gbWFwcy5maW5kUGF0aChtYXAsIG1vbnN0ZXIucG9zaXRpb24sIHRoaXMucGxheWVyLnBvc2l0aW9uKVxyXG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAvLyBwYXNzXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gcGF0aFswXVxyXG4gICAgICAgIGlmIChtYXAuaXNQYXNzYWJsZShwb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gLT0gMVxyXG4gICAgICAgICAgICBtb25zdGVyLnBvc2l0aW9uID0gcGF0aFswXVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBoYW5kbGVSZXNpemUoKSB7XHJcbiAgICAgICAgY29uc3QgY2FudmFzID0gdGhpcy5jYW52YXNcclxuICAgICAgICBpZiAoY2FudmFzLndpZHRoID09PSBjYW52YXMuY2xpZW50V2lkdGggJiYgY2FudmFzLmhlaWdodCA9PT0gY2FudmFzLmNsaWVudEhlaWdodCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5KClcclxuICAgIH1cclxuXHJcbiAgICBoYW5kbGVJbnB1dCgpOiBib29sZWFuIHtcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgY29uc3QgaW5wID0gdGhpcy5pbnBcclxuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IHBsYXllci5wb3NpdGlvbi5jbG9uZSgpXHJcblxyXG4gICAgICAgIGlmICh0aGlzLnRhcmdldENvbW1hbmQgIT09IFRhcmdldENvbW1hbmQuTm9uZSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZVRhcmdldGluZ0lucHV0KClcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLm1vdXNlTGVmdFJlbGVhc2VkKSB7XHJcbiAgICAgICAgICAgIC8vIGRldGVybWluZSB0aGUgbWFwIGNvb3JkaW5hdGVzIHRoZSB1c2VyIGNsaWNrZWQgb25cclxuICAgICAgICAgICAgY29uc3QgbXh5ID0gdGhpcy5jYW52YXNUb01hcFBvaW50KG5ldyBnZW8uUG9pbnQoaW5wLm1vdXNlWCwgaW5wLm1vdXNlWSkpXHJcblxyXG4gICAgICAgICAgICBjb25zdCBjbGlja0ZpeHR1cmUgPSBtYXAuZml4dHVyZUF0KG14eSlcclxuICAgICAgICAgICAgaWYgKGNsaWNrRml4dHVyZSkge1xyXG4gICAgICAgICAgICAgICAgb3V0cHV0LmluZm8oYFlvdSBzZWUgJHtjbGlja0ZpeHR1cmUubmFtZX1gKVxyXG4gICAgICAgICAgICAgICAgaW5wLmZsdXNoKClcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjbGlja0NyZWF0dXJlID0gbWFwLm1vbnN0ZXJBdChteHkpXHJcbiAgICAgICAgICAgIGlmIChjbGlja0NyZWF0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke2NsaWNrQ3JlYXR1cmUubmFtZX1gKVxyXG4gICAgICAgICAgICAgICAgaW5wLmZsdXNoKClcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBkeHkgPSBteHkuc3ViUG9pbnQocGxheWVyLnBvc2l0aW9uKVxyXG4gICAgICAgICAgICBjb25zdCBzZ24gPSBkeHkuc2lnbigpXHJcbiAgICAgICAgICAgIGNvbnN0IGFicyA9IGR4eS5hYnMoKVxyXG5cclxuICAgICAgICAgICAgaWYgKGFicy54ID4gMCAmJiBhYnMueCA+PSBhYnMueSkge1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb24ueCArPSBzZ24ueFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYWJzLnkgPiAwICYmIGFicy55ID4gYWJzLngpIHtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uLnkgKz0gc2duLnlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJ3XCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dVcFwiKSkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbi55IC09IDFcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJzXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dEb3duXCIpKSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnkgKz0gMVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChpbnAucHJlc3NlZChcImFcIikgfHwgaW5wLnByZXNzZWQoXCJBcnJvd0xlZnRcIikpIHtcclxuICAgICAgICAgICAgcG9zaXRpb24ueCAtPSAxXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGlucC5wcmVzc2VkKFwiZFwiKSB8fCBpbnAucHJlc3NlZChcIkFycm93UmlnaHRcIikpIHtcclxuICAgICAgICAgICAgcG9zaXRpb24ueCArPSAxXHJcbiAgICAgICAgfSBlbHNlIGlmIChpbnAucHJlc3NlZChcIiBcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5wbGF5ZXIuYWN0aW9uUmVzZXJ2ZSArPSB0aGlzLnBsYXllci5hY3Rpb25cclxuICAgICAgICAgICAgdGhpcy5wbGF5ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaW5wLmZsdXNoKClcclxuXHJcbiAgICAgICAgaWYgKHBvc2l0aW9uLmVxdWFsKHBsYXllci5wb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXRoaXMubWFwLmluQm91bmRzKHBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRpbGUgPSBtYXAudGlsZUF0KHBvc2l0aW9uKVxyXG4gICAgICAgIGlmICh0aWxlICYmICF0aWxlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBCbG9ja2VkIGJ5ICR7dGlsZS5uYW1lfWApXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbW9uc3RlciA9IG1hcC5tb25zdGVyQXQocG9zaXRpb24pXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5wcm9jZXNzUGxheWVyTWVsZWVBdHRhY2sobW9uc3RlcilcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IG1hcC5jb250YWluZXJBdChwb3NpdGlvbilcclxuICAgICAgICBpZiAoY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyRGlhbG9nLnNob3cobWFwLCBjb250YWluZXIpXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZml4dHVyZSA9IG1hcC5maXh0dXJlQXQocG9zaXRpb24pXHJcbiAgICAgICAgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5Eb29yKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGAke2ZpeHR1cmUubmFtZX0gb3BlbmVkYClcclxuICAgICAgICAgICAgdGhpcy5tYXAuZml4dHVyZXMuZGVsZXRlKGZpeHR1cmUpXHJcbiAgICAgICAgICAgIHBsYXllci5hY3Rpb24gLT0gMVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH0gZWxzZSBpZiAoZml4dHVyZSBpbnN0YW5jZW9mIHJsLlN0YWlyc1VwKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5lcnJvcihcIlN0YWlycyBub3QgaW1wbGVtZW50ZWRcIilcclxuICAgICAgICB9IGVsc2UgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5TdGFpcnNEb3duKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5lcnJvcihcIlN0YWlycyBub3QgaW1wbGVtZW50ZWRcIilcclxuICAgICAgICB9IGVsc2UgaWYgKGZpeHR1cmUgJiYgIWZpeHR1cmUucGFzc2FibGUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYENhbid0IG1vdmUgdGhhdCB3YXksIGJsb2NrZWQgYnkgJHtmaXh0dXJlLm5hbWV9YClcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwbGF5ZXIucG9zaXRpb24gPSBwb3NpdGlvblxyXG4gICAgICAgIHBsYXllci5hY3Rpb24gLT0gMVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVUYXJnZXRpbmdJbnB1dCgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaW5wLm1vdXNlTGVmdFJlbGVhc2VkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wLmZsdXNoKClcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjeHkgPSBuZXcgZ2VvLlBvaW50KHRoaXMuaW5wLm1vdXNlWCwgdGhpcy5pbnAubW91c2VZKVxyXG4gICAgICAgIGNvbnN0IG14eSA9IHRoaXMuY2FudmFzVG9NYXBQb2ludChjeHkpXHJcblxyXG4gICAgICAgIGNvbnN0IGxpZ2h0UmFkaXVzID0gdGhpcy5jYWxjTGlnaHRSYWRpdXMoKVxyXG4gICAgICAgIGlmICghY2FuU2VlKHRoaXMubWFwLCB0aGlzLnBsYXllci5wb3NpdGlvbiwgbXh5LCBsaWdodFJhZGl1cykpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnAuZmx1c2goKVxyXG4gICAgICAgICAgICBvdXRwdXQuZXJyb3IoYENhbid0IHNlZSFgKVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN3aXRjaCAodGhpcy50YXJnZXRDb21tYW5kKSB7XHJcbiAgICAgICAgICAgIGNhc2UgVGFyZ2V0Q29tbWFuZC5Mb29rOiB7XHJcbiAgICAgICAgICAgICAgICAvLyBzaG93IHdoYXQgdXNlciBjbGlja2VkIG9uXHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHRoIG9mIHRoaXMubWFwLmF0KG14eSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke3RoLm5hbWV9YClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVGFyZ2V0Q29tbWFuZC5BdHRhY2s6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG1vbnN0ZXIgPSB0aGlzLm1hcC5tb25zdGVyQXQobXh5KVxyXG4gICAgICAgICAgICAgICAgaWYgKG1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NQbGF5ZXJNZWxlZUF0dGFjayhtb25zdGVyKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUYXJnZXRDb21tYW5kLlNob290OiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBtb25zdGVyID0gdGhpcy5tYXAubW9uc3RlckF0KG14eSlcclxuICAgICAgICAgICAgICAgIGlmIChtb25zdGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzUGxheWVyUmFuZ2VkQXR0YWNrKG1vbnN0ZXIpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLk5vbmVcclxuICAgICAgICB0aGlzLmlucC5mbHVzaCgpXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVWaXNpYmlsaXR5KCkge1xyXG4gICAgICAgIC8vIHVwZGF0ZSB2aXNpYmlsaXR5IGFyb3VuZCBwbGF5ZXJcclxuICAgICAgICAvLyBsaW1pdCByYWRpdXMgdG8gdmlzaWJsZSB2aWV3cG9ydCBhcmVhXHJcbiAgICAgICAgY29uc3QgbGlnaHRSYWRpdXMgPSB0aGlzLmNhbGNMaWdodFJhZGl1cygpXHJcbiAgICAgICAgbWFwcy51cGRhdGVWaXNpYmlsaXR5KHRoaXMubWFwLCB0aGlzLnBsYXllci5wb3NpdGlvbiwgbGlnaHRSYWRpdXMpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYWxjTWFwVmlld3BvcnQoKTogZ2VvLkFBQkIge1xyXG4gICAgICAgIGNvbnN0IGFhYmIgPSBuZXcgZ2VvLkFBQkIoXHJcbiAgICAgICAgICAgIHRoaXMuY2FudmFzVG9NYXBQb2ludChuZXcgZ2VvLlBvaW50KDAsIDApKSxcclxuICAgICAgICAgICAgdGhpcy5jYW52YXNUb01hcFBvaW50KG5ldyBnZW8uUG9pbnQodGhpcy5jYW52YXMud2lkdGggKyBybC50aWxlU2l6ZSwgdGhpcy5jYW52YXMuaGVpZ2h0ICsgcmwudGlsZVNpemUpKSlcclxuICAgICAgICAgICAgLmludGVyc2VjdGlvbihuZXcgZ2VvLkFBQkIobmV3IGdlby5Qb2ludCgwLCAwKSwgbmV3IGdlby5Qb2ludCh0aGlzLm1hcC53aWR0aCwgdGhpcy5tYXAuaGVpZ2h0KSkpXHJcblxyXG4gICAgICAgIHJldHVybiBhYWJiXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYWxjTGlnaHRSYWRpdXMoKTogbnVtYmVyIHtcclxuICAgICAgICBjb25zdCB2aWV3cG9ydEFBQkIgPSB0aGlzLmNhbGNNYXBWaWV3cG9ydCgpXHJcbiAgICAgICAgY29uc3Qgdmlld3BvcnRMaWdodFJhZGl1cyA9IE1hdGgubWF4KHZpZXdwb3J0QUFCQi53aWR0aCwgdmlld3BvcnRBQUJCLmhlaWdodClcclxuICAgICAgICBpZiAodGhpcy5tYXAubGlnaHRpbmcgPT09IG1hcHMuTGlnaHRpbmcuQW1iaWVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdmlld3BvcnRMaWdodFJhZGl1c1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIE1hdGgubWluKHZpZXdwb3J0TGlnaHRSYWRpdXMsIHRoaXMucGxheWVyLmxpZ2h0UmFkaXVzKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd0ZyYW1lKCkge1xyXG4gICAgICAgIC8vIGNlbnRlciB0aGUgZ3JpZCBhcm91bmQgdGhlIHBsYXllcmRcclxuICAgICAgICBjb25zdCB2aWV3cG9ydEFBQkIgPSB0aGlzLmNhbGNNYXBWaWV3cG9ydCgpXHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gdGhpcy5nZXRTY3JvbGxPZmZzZXQoKVxyXG5cclxuICAgICAgICAvLyBub3RlIC0gZHJhd2luZyBvcmRlciBtYXR0ZXJzIC0gZHJhdyBmcm9tIGJvdHRvbSB0byB0b3BcclxuICAgICAgICBpZiAodGhpcy50YXJnZXRDb21tYW5kICE9PSBUYXJnZXRDb21tYW5kLk5vbmUpIHtcclxuICAgICAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuY3Vyc29yID0gXCJjcm9zc2hhaXJcIlxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2FudmFzLnN0eWxlLmN1cnNvciA9IFwiXCJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2hvb3RCdXR0b24uZGlzYWJsZWQgPSAhdGhpcy5wbGF5ZXIucmFuZ2VkV2VhcG9uXHJcblxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgY29uc3QgdGlsZXMgPSBtYXAudGlsZXMud2l0aGluKHZpZXdwb3J0QUFCQilcclxuICAgICAgICBjb25zdCBmaXh0dXJlcyA9IG1hcC5maXh0dXJlcy53aXRoaW4odmlld3BvcnRBQUJCKVxyXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lcnMgPSBtYXAuY29udGFpbmVycy53aXRoaW4odmlld3BvcnRBQUJCKVxyXG4gICAgICAgIGNvbnN0IG1vbnN0ZXJzID0gbWFwLm1vbnN0ZXJzLndpdGhpbih2aWV3cG9ydEFBQkIpXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgdGlsZSBvZiB0aWxlcykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIHRpbGUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGZpeHR1cmUgb2YgZml4dHVyZXMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCBmaXh0dXJlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBjb250YWluZXIgb2YgY29udGFpbmVycykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIGNvbnRhaW5lcilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgY3JlYXR1cmUgb2YgbW9uc3RlcnMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCBjcmVhdHVyZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgdGhpcy5wbGF5ZXIpXHJcbiAgICAgICAgdGhpcy5kcmF3SGVhbHRoQmFyKG9mZnNldCwgdGhpcy5wbGF5ZXIpXHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZmx1c2goKVxyXG4gICAgfVxyXG5cclxuICAgIGRyYXdUaGluZyhvZmZzZXQ6IGdlby5Qb2ludCwgdGg6IHJsLlRoaW5nKSB7XHJcbiAgICAgICAgaWYgKHRoLnZpc2libGUgPT09IHJsLlZpc2liaWxpdHkuTm9uZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbG9yID0gdGguY29sb3IuY2xvbmUoKVxyXG4gICAgICAgIGlmICh0aC52aXNpYmxlID09PSBybC5WaXNpYmlsaXR5LkZvZykge1xyXG4gICAgICAgICAgICBjb2xvci5hID0gLjVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHNwcml0ZVBvc2l0aW9uID0gdGgucG9zaXRpb24ubXVsU2NhbGFyKHJsLnRpbGVTaXplKS5hZGRQb2ludChvZmZzZXQpXHJcbiAgICAgICAgY29uc3Qgc3ByaXRlID0gbmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24sXHJcbiAgICAgICAgICAgIGNvbG9yOiBjb2xvcixcclxuICAgICAgICAgICAgd2lkdGg6IHJsLnRpbGVTaXplLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IHJsLnRpbGVTaXplLFxyXG4gICAgICAgICAgICB0ZXh0dXJlOiB0aC50ZXh0dXJlLFxyXG4gICAgICAgICAgICBsYXllcjogdGgudGV4dHVyZUxheWVyLFxyXG4gICAgICAgICAgICBmbGFnczogZ2Z4LlNwcml0ZUZsYWdzLkFycmF5VGV4dHVyZVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd1Nwcml0ZShzcHJpdGUpXHJcbiAgICB9XHJcblxyXG4gICAgZHJhd0hlYWx0aEJhcihvZmZzZXQ6IGdlby5Qb2ludCwgY3JlYXR1cmU6IHJsLkNyZWF0dXJlKSB7XHJcbiAgICAgICAgaWYgKCFjcmVhdHVyZS5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGhlYWx0aCA9IE1hdGgubWF4KGNyZWF0dXJlLmhlYWx0aCwgMClcclxuICAgICAgICBjb25zdCBib3JkZXJXaWR0aCA9IGhlYWx0aCAqIDQgKyAyXHJcbiAgICAgICAgY29uc3QgaW50ZXJpb3JXaWR0aCA9IGhlYWx0aCAqIDRcclxuICAgICAgICBjb25zdCBzcHJpdGVQb3NpdGlvbiA9IGNyZWF0dXJlLnBvc2l0aW9uLm11bFNjYWxhcihybC50aWxlU2l6ZSkuYWRkUG9pbnQob2Zmc2V0KS5zdWJQb2ludChuZXcgZ2VvLlBvaW50KDAsIHJsLnRpbGVTaXplIC8gMikpXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3U3ByaXRlKG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLFxyXG4gICAgICAgICAgICBjb2xvcjogZ2Z4LkNvbG9yLndoaXRlLFxyXG4gICAgICAgICAgICB3aWR0aDogYm9yZGVyV2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodDogOFxyXG4gICAgICAgIH0pKVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdTcHJpdGUobmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24uYWRkUG9pbnQobmV3IGdlby5Qb2ludCgxLCAxKSksXHJcbiAgICAgICAgICAgIGNvbG9yOiBnZnguQ29sb3IucmVkLFxyXG4gICAgICAgICAgICB3aWR0aDogaW50ZXJpb3JXaWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0OiA2XHJcbiAgICAgICAgfSkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoaWRlRGlhbG9ncygpIHtcclxuICAgICAgICB0aGlzLmludmVudG9yeURpYWxvZy5oaWRlKClcclxuICAgICAgICB0aGlzLnN0YXRzRGlhbG9nLmhpZGUoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlS2V5UHJlc3MoZXY6IEtleWJvYXJkRXZlbnQpIHtcclxuICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG5cclxuICAgICAgICBzd2l0Y2ggKGtleSkge1xyXG4gICAgICAgICAgICBjYXNlIFwiSVwiOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB3YXNIaWRkZW4gPSB0aGlzLmludmVudG9yeURpYWxvZy5oaWRkZW5cclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZURpYWxvZ3MoKVxyXG4gICAgICAgICAgICAgICAgaWYgKHdhc0hpZGRlbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW52ZW50b3J5RGlhbG9nLnNob3coKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCJaXCI6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHdhc0hpZGRlbiA9IHRoaXMuc3RhdHNEaWFsb2cuaGlkZGVuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVEaWFsb2dzKClcclxuICAgICAgICAgICAgICAgIGlmICh3YXNIaWRkZW4pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRzRGlhbG9nLnNob3coKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCJMXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLkxvb2tcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIkVOVEVSXCI6XHJcbiAgICAgICAgICAgICAgICBpZiAoZXYuY3RybEtleSAmJiB0aGlzLnBsYXllci5yYW5nZWRXZWFwb24pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLlNob290XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuQXR0YWNrXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCJMXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLlNob290XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICBjb25zdCBhcHAgPSBuZXcgQXBwKClcclxuICAgIGF3YWl0IGFwcC5leGVjKClcclxufVxyXG5cclxuaW5pdCgpIl19