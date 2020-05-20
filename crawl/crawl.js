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
        console.log(damageSpan);
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
        const mxy = cxy.subPoint(scrollOffset).divScalar(rl.tileSize);
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
        if (inp.mouseLeftReleased) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBQ2pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFFekMsTUFBTSxNQUFNO0lBRVIsWUFBNEIsSUFBaUIsRUFBbUIsTUFBeUI7UUFBN0QsU0FBSSxHQUFKLElBQUksQ0FBYTtRQUFtQixXQUFNLEdBQU4sTUFBTSxDQUFtQjtRQUR4RSxvQkFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQW1CLENBQUE7SUFDYSxDQUFDO0lBRTlGLElBQUk7UUFDQSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVELElBQUk7UUFDQSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7UUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFN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S0FBSyxVQUFVLElBQUk7SUFDZixNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFBO0lBQ3JCLE1BQU0sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFBO0FBQ3BCLENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuaW1wb3J0ICogYXMgZ2VuIGZyb20gXCIuL2dlbi5qc1wiXHJcbmltcG9ydCAqIGFzIGlucHV0IGZyb20gXCIuLi9zaGFyZWQvaW5wdXQuanNcIlxyXG5pbXBvcnQgKiBhcyBybCBmcm9tIFwiLi9ybC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgb3V0cHV0IGZyb20gXCIuL291dHB1dC5qc1wiXHJcbmltcG9ydCAqIGFzIHRoaW5ncyBmcm9tIFwiLi90aGluZ3MuanNcIlxyXG5pbXBvcnQgKiBhcyBtYXBzIGZyb20gXCIuL21hcHMuanNcIlxyXG5pbXBvcnQgKiBhcyByYW5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiXHJcblxyXG5jbGFzcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtb2RhbEJhY2tncm91bmQgPSBkb20uYnlJZChcIm1vZGFsQmFja2dyb3VuZFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGVsZW06IEhUTUxFbGVtZW50LCBwcml2YXRlIHJlYWRvbmx5IGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHsgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5tb2RhbEJhY2tncm91bmQuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmVsZW0uaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmVsZW0uZm9jdXMoKVxyXG4gICAgfVxyXG5cclxuICAgIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5tb2RhbEJhY2tncm91bmQuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuZWxlbS5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgdGhpcy5jYW52YXMuZm9jdXMoKVxyXG4gICAgfVxyXG5cclxuICAgIHRvZ2dsZSgpIHtcclxuICAgICAgICBpZiAodGhpcy5lbGVtLmhpZGRlbikge1xyXG4gICAgICAgICAgICB0aGlzLnNob3coKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBTdGF0c0RpYWxvZyBleHRlbmRzIERpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wZW5CdXR0b24gPSBkb20uYnlJZChcInN0YXRzQnV0dG9uXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNsb3NlQnV0dG9uID0gZG9tLmJ5SWQoXCJzdGF0c0Nsb3NlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHN1cGVyKGRvbS5ieUlkKFwic3RhdHNEaWFsb2dcIiksIGNhbnZhcylcclxuXHJcbiAgICAgICAgdGhpcy5vcGVuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnRvZ2dsZSgpKVxyXG4gICAgICAgIHRoaXMuY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuaGlkZSgpKVxyXG5cclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZXYua2V5LnRvVXBwZXJDYXNlKCkgPT09IFwiWlwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgY29uc3QgaGVhbHRoU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNIZWFsdGhcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3Qgc3RyZW5ndGhTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c1N0cmVuZ3RoXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGFnaWxpdHlTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0FnaWxpdHlcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgaW50ZWxsaWdlbmNlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNJbnRlbGxpZ2VuY2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgYXR0YWNrU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNBdHRhY2tcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZGFtYWdlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNEYW1hZ2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZGVmZW5zZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRGVmZW5zZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBsZXZlbFNwYW4gPSBkb20uYnlJZChcInN0YXRzTGV2ZWxcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZXhwZXJpZW5jZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRXhwZXJpZW5jZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuXHJcbiAgICAgICAgY29uc3QgZXhwZXJpZW5jZVJlcXVpcmVtZW50ID0gcmwuZ2V0RXhwZXJpZW5jZVJlcXVpcmVtZW50KHBsYXllci5sZXZlbCArIDEpXHJcblxyXG4gICAgICAgIGhlYWx0aFNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuaGVhbHRofSAvICR7cGxheWVyLm1heEhlYWx0aH1gXHJcbiAgICAgICAgc3RyZW5ndGhTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLnN0cmVuZ3RofWBcclxuICAgICAgICBhZ2lsaXR5U3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5hZ2lsaXR5fWBcclxuICAgICAgICBpbnRlbGxpZ2VuY2VTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmludGVsbGlnZW5jZX1gXHJcbiAgICAgICAgYXR0YWNrU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5tZWxlZUF0dGFja30gLyAke3BsYXllci5yYW5nZWRXZWFwb24gPyBwbGF5ZXIucmFuZ2VkQXR0YWNrIDogXCJOQVwifWBcclxuICAgICAgICBkYW1hZ2VTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLm1lbGVlRGFtYWdlfSAvICR7cGxheWVyLnJhbmdlZERhbWFnZSA/IHBsYXllci5yYW5nZWREYW1hZ2UgOiBcIk5BXCJ9YFxyXG4gICAgICAgIGNvbnNvbGUubG9nKGRhbWFnZVNwYW4pXHJcbiAgICAgICAgZGVmZW5zZVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuZGVmZW5zZX1gXHJcbiAgICAgICAgYWdpbGl0eVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuYWdpbGl0eX1gXHJcbiAgICAgICAgbGV2ZWxTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmxldmVsfWBcclxuICAgICAgICBleHBlcmllbmNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5leHBlcmllbmNlfSAvICR7ZXhwZXJpZW5jZVJlcXVpcmVtZW50fWBcclxuXHJcbiAgICAgICAgc3VwZXIuc2hvdygpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEludmVudG9yeURpYWxvZyBleHRlbmRzIERpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wZW5CdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeUJ1dHRvblwiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbmZvRGl2ID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlJbmZvXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVtcHR5RGl2ID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlFbXB0eVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0YWJsZSA9IGRvbS5ieUlkKFwiaW52ZW50b3J5VGFibGVcIikgYXMgSFRNTFRhYmxlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcImludmVudG9yeUl0ZW1UZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG5leHRQYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlOZXh0UGFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwcmV2UGFnZUJ1dHRvbiA9IGRvbS5ieUlkKFwiaW52ZW50b3J5UHJldlBhZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2xvc2VCdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeUNsb3NlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhZ2VTaXplOiBudW1iZXIgPSA5XHJcbiAgICBwcml2YXRlIHBhZ2VJbmRleDogbnVtYmVyID0gMFxyXG4gICAgcHJpdmF0ZSBzZWxlY3RlZEluZGV4OiBudW1iZXIgPSAtMVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXIsIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICBzdXBlcihkb20uYnlJZChcImludmVudG9yeURpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgICAgIHRoaXMub3BlbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy50b2dnbGUoKSlcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuXHJcbiAgICAgICAgdGhpcy5uZXh0UGFnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnBhZ2VJbmRleCsrXHJcbiAgICAgICAgICAgIHRoaXMucGFnZUluZGV4ID0gTWF0aC5taW4odGhpcy5wYWdlSW5kZXgsIE1hdGguY2VpbCh0aGlzLnBsYXllci5pbnZlbnRvcnkuc2l6ZSAvIHRoaXMucGFnZVNpemUpKVxyXG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMucHJldlBhZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5wYWdlSW5kZXgtLVxyXG4gICAgICAgICAgICB0aGlzLnBhZ2VJbmRleCA9IE1hdGgubWF4KHRoaXMucGFnZUluZGV4LCAwKVxyXG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuZWxlbS5hZGRFdmVudExpc3RlbmVyKFwia2V5cHJlc3NcIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGV2LmtleS50b1VwcGVyQ2FzZSgpXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiSVwiIHx8IGtleSA9PT0gXCJDXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoZXYua2V5KVxyXG4gICAgICAgICAgICBpZiAoaW5kZXggJiYgaW5kZXggPiAwICYmIGluZGV4IDw9IDkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IGluZGV4IC0gMVxyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJVXCIgJiYgdGhpcy5zZWxlY3RlZEluZGV4ID49IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudXNlKHRoaXMuc2VsZWN0ZWRJbmRleClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFXCIgJiYgdGhpcy5zZWxlY3RlZEluZGV4ID49IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXF1aXAodGhpcy5zZWxlY3RlZEluZGV4KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlJcIiAmJiB0aGlzLnNlbGVjdGVkSW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUodGhpcy5zZWxlY3RlZEluZGV4KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkRcIiAmJiB0aGlzLnNlbGVjdGVkSW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kcm9wKHRoaXMuc2VsZWN0ZWRJbmRleClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LXVzZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGV2LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5nZXRSb3dJbmRleChldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpXHJcbiAgICAgICAgICAgIHRoaXMudXNlKGluZGV4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LWRyb3AtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZ2V0Um93SW5kZXgoZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50KVxyXG4gICAgICAgICAgICB0aGlzLmRyb3AoaW5kZXgpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKHRoaXMuZWxlbSwgXCJjbGlja1wiLCBcIi5pbnZlbnRvcnktZXF1aXAtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZ2V0Um93SW5kZXgoZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50KVxyXG4gICAgICAgICAgICB0aGlzLmVxdWlwKGluZGV4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LXJlbW92ZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGV2LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5nZXRSb3dJbmRleChldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpXHJcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKGluZGV4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaXRlbS1yb3dcIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IChldi50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgaWYgKHJvdykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Qocm93IGFzIEhUTUxUYWJsZVJvd0VsZW1lbnQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICBzdXBlci5zaG93KClcclxuICAgIH1cclxuXHJcbiAgICByZWZyZXNoKCkge1xyXG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy50YWJsZS50Qm9kaWVzWzBdXHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRib2R5KVxyXG5cclxuICAgICAgICBpZiAodGhpcy5wbGF5ZXIuaW52ZW50b3J5LnNpemUgPT09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lbXB0eURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgICAgICB0aGlzLmluZm9EaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW1wdHlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgICAgICB0aGlzLmluZm9EaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBhZ2VDb3VudCA9IE1hdGguY2VpbCh0aGlzLnBsYXllci5pbnZlbnRvcnkuc2l6ZSAvIHRoaXMucGFnZVNpemUpXHJcbiAgICAgICAgdGhpcy5wYWdlSW5kZXggPSBNYXRoLm1pbihNYXRoLm1heCgwLCB0aGlzLnBhZ2VJbmRleCksIHBhZ2VDb3VudCAtIDEpXHJcbiAgICAgICAgdGhpcy5wcmV2UGFnZUJ1dHRvbi5kaXNhYmxlZCA9IHRoaXMucGFnZUluZGV4IDw9IDBcclxuICAgICAgICB0aGlzLm5leHRQYWdlQnV0dG9uLmRpc2FibGVkID0gdGhpcy5wYWdlSW5kZXggPj0gcGFnZUNvdW50IC0gMVxyXG5cclxuICAgICAgICB0aGlzLmluZm9EaXYudGV4dENvbnRlbnQgPSBgUGFnZSAke3RoaXMucGFnZUluZGV4ICsgMX0gb2YgJHtwYWdlQ291bnR9YFxyXG5cclxuICAgICAgICBjb25zdCBpdGVtcyA9IGdldFNvcnRlZEl0ZW1zUGFnZSh0aGlzLnBsYXllci5pbnZlbnRvcnksIHRoaXMucGFnZUluZGV4LCB0aGlzLnBhZ2VTaXplKVxyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWluKHRoaXMuc2VsZWN0ZWRJbmRleCwgaXRlbXMubGVuZ3RoIC0gMSlcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gaXRlbXNbaV1cclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0aGlzLml0ZW1UZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHRyID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLml0ZW0tcm93XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1JbmRleFRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0taW5kZXhcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLW5hbWVcIilcclxuICAgICAgICAgICAgY29uc3QgZXF1aXBCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LWVxdWlwLWJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCByZW1vdmVCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LXJlbW92ZS1idXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3QgdXNlQnV0dG9uID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLmludmVudG9yeS11c2UtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcblxyXG4gICAgICAgICAgICBpdGVtSW5kZXhUZC50ZXh0Q29udGVudCA9IChpICsgMSkudG9TdHJpbmcoKVxyXG4gICAgICAgICAgICBpdGVtTmFtZVRkLnRleHRDb250ZW50ID0gaXRlbS5uYW1lXHJcblxyXG4gICAgICAgICAgICBpZiAoIShpdGVtIGluc3RhbmNlb2YgcmwuVXNhYmxlKSkge1xyXG4gICAgICAgICAgICAgICAgdXNlQnV0dG9uLnJlbW92ZSgpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCFybC5pc0VxdWlwcGFibGUoaXRlbSkgfHwgdGhpcy5wbGF5ZXIuaXNFcXVpcHBlZChpdGVtKSkge1xyXG4gICAgICAgICAgICAgICAgZXF1aXBCdXR0b24ucmVtb3ZlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCF0aGlzLnBsYXllci5pc0VxdWlwcGVkKGl0ZW0pKSB7XHJcbiAgICAgICAgICAgICAgICByZW1vdmVCdXR0b24ucmVtb3ZlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGkgPT09IHRoaXMuc2VsZWN0ZWRJbmRleCkge1xyXG4gICAgICAgICAgICAgICAgdHIuY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNlbGVjdChzZWxlY3RlZFJvdzogSFRNTFRhYmxlUm93RWxlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IHJvd3MgPSBBcnJheS5mcm9tKHRoaXMuZWxlbS5xdWVyeVNlbGVjdG9yQWxsKFwiLml0ZW0tcm93XCIpKVxyXG4gICAgICAgIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcclxuICAgICAgICAgICAgcm93LmNsYXNzTGlzdC5yZW1vdmUoXCJzZWxlY3RlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2VsZWN0ZWRSb3cuY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRSb3dJbmRleChlbGVtOiBIVE1MQnV0dG9uRWxlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IGluZGV4ID0gZG9tLmdldEVsZW1lbnRJbmRleChlbGVtLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudClcclxuICAgICAgICByZXR1cm4gaW5kZXhcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVzZShpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaSA9IHRoaXMucGFnZUluZGV4ICogdGhpcy5wYWdlU2l6ZSArIGluZGV4XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEl0ZW1zKHRoaXMucGxheWVyLmludmVudG9yeSlbaV1cclxuICAgICAgICBpZiAoIShpdGVtIGluc3RhbmNlb2YgcmwuVXNhYmxlKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVzZUl0ZW0odGhpcy5wbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyb3AoaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGkgPSB0aGlzLnBhZ2VJbmRleCAqIHRoaXMucGFnZVNpemUgKyBpbmRleFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLnBsYXllci5pbnZlbnRvcnkpW2ldXHJcbiAgICAgICAgZHJvcEl0ZW0odGhpcy5wbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGVxdWlwKGluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBpID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplICsgaW5kZXhcclxuICAgICAgICBjb25zdCBpdGVtID0gZ2V0U29ydGVkSXRlbXModGhpcy5wbGF5ZXIuaW52ZW50b3J5KVtpXVxyXG4gICAgICAgIGlmICghcmwuaXNFcXVpcHBhYmxlKGl0ZW0pKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXF1aXBJdGVtKHRoaXMucGxheWVyLCBpdGVtKVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZW1vdmUoaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGkgPSB0aGlzLnBhZ2VJbmRleCAqIHRoaXMucGFnZVNpemUgKyBpbmRleFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLnBsYXllci5pbnZlbnRvcnkpW2ldXHJcbiAgICAgICAgaWYgKCFybC5pc0VxdWlwcGFibGUoaXRlbSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZW1vdmVJdGVtKHRoaXMucGxheWVyLCBpdGVtKVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIENvbnRhaW5lckRpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpYWxvZzogRGlhbG9nXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG5hbWVTcGFuID0gZG9tLmJ5SWQoXCJjb250YWluZXJOYW1lXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwiY29udGFpbmVyQ2xvc2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdGFrZUFsbEJ1dHRvbiA9IGRvbS5ieUlkKFwiY29udGFpbmVyVGFrZUFsbEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXJUYWJsZSA9IGRvbS5ieUlkKFwiY29udGFpbmVyVGFibGVcIikgYXMgSFRNTFRhYmxlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXJJdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcImNvbnRhaW5lckl0ZW1UZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwcml2YXRlIG1hcDogbWFwcy5NYXAgfCBudWxsID0gbnVsbFxyXG4gICAgcHJpdmF0ZSBjb250YWluZXI6IHJsLkNvbnRhaW5lciB8IG51bGwgPSBudWxsXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IERpYWxvZyhkb20uYnlJZChcImNvbnRhaW5lckRpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgICAgIHRoaXMucGxheWVyID0gcGxheWVyXHJcbiAgICAgICAgdGhpcy5jbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5oaWRlKCkpXHJcbiAgICAgICAgdGhpcy50YWtlQWxsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnRha2VBbGwoKSlcclxuICAgICAgICBjb25zdCBlbGVtID0gdGhpcy5kaWFsb2cuZWxlbVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUoZWxlbSwgXCJjbGlja1wiLCBcIi5jb250YWluZXItdGFrZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBidG4gPSBldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KHJvdylcclxuICAgICAgICAgICAgdGhpcy50YWtlKGlkeClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qga2V5ID0gZXYua2V5LnRvVXBwZXJDYXNlKClcclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJDXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiQVwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRha2VBbGwoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHBhcnNlSW50KGV2LmtleSlcclxuICAgICAgICAgICAgaWYgKGluZGV4ICYmIGluZGV4ID4gMCAmJiBpbmRleCA8PSA5KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRha2UoaW5kZXggLSAxKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KG1hcDogbWFwcy5NYXAsIGNvbnRhaW5lcjogcmwuQ29udGFpbmVyKSB7XHJcbiAgICAgICAgdGhpcy5tYXAgPSBtYXBcclxuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IGNvbnRhaW5lclxyXG4gICAgICAgIHRoaXMubmFtZVNwYW4udGV4dENvbnRlbnQgPSB0aGlzLmNvbnRhaW5lci5uYW1lXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB0aGlzLmRpYWxvZy5zaG93KClcclxuICAgIH1cclxuXHJcbiAgICBoaWRlKCkge1xyXG4gICAgICAgIGlmICh0aGlzLm1hcCAmJiB0aGlzLmNvbnRhaW5lciAmJiB0aGlzLmNvbnRhaW5lci5pdGVtcy5zaXplID09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5tYXAuY29udGFpbmVycy5kZWxldGUodGhpcy5jb250YWluZXIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IG51bGxcclxuICAgICAgICB0aGlzLmRpYWxvZy5oaWRlKClcclxuICAgIH1cclxuXHJcbiAgICByZWZyZXNoKCkge1xyXG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy5jb250YWluZXJUYWJsZS50Qm9kaWVzWzBdXHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRib2R5KVxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaXRlbXMgPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLmNvbnRhaW5lci5pdGVtcylcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBpdGVtc1tpXVxyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMuY29udGFpbmVySXRlbVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgdHIgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbUluZGV4VGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1pbmRleFwiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtTmFtZVRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0tbmFtZVwiKVxyXG4gICAgICAgICAgICBpdGVtSW5kZXhUZC50ZXh0Q29udGVudCA9IGAke2kgKyAxfWBcclxuICAgICAgICAgICAgaXRlbU5hbWVUZC50ZXh0Q29udGVudCA9IGl0ZW0ubmFtZVxyXG4gICAgICAgICAgICB0Ym9keS5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGFrZShpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLmNvbnRhaW5lci5pdGVtcylbaW5kZXhdXHJcbiAgICAgICAgaWYgKCFpdGVtKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuaXRlbXMuZGVsZXRlKGl0ZW0pXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIuaW52ZW50b3J5LmFkZChpdGVtKVxyXG5cclxuICAgICAgICAvLyBoaWRlIGlmIHRoaXMgd2FzIHRoZSBsYXN0IGl0ZW1cclxuICAgICAgICBpZiAodGhpcy5jb250YWluZXIuaXRlbXMuc2l6ZSA9PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGFrZUFsbCgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuY29udGFpbmVyLml0ZW1zKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLml0ZW1zLmRlbGV0ZShpdGVtKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXllci5pbnZlbnRvcnkuYWRkKGl0ZW0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBEZWZlYXREaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0cnlBZ2FpbkJ1dHRvbiA9IGRvbS5ieUlkKFwidHJ5QWdhaW5CdXR0b25cIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGlhbG9nOiBEaWFsb2dcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cgPSBuZXcgRGlhbG9nKGRvbS5ieUlkKFwiZGVmZWF0RGlhbG9nXCIpLCBjYW52YXMpXHJcbiAgICAgICAgdGhpcy50cnlBZ2FpbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy50cnlBZ2FpbigpKVxyXG4gICAgICAgIHRoaXMuZGlhbG9nLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlRcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50cnlBZ2FpbigpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiRU5URVJcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50cnlBZ2FpbigpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cuc2hvdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB0cnlBZ2FpbigpIHtcclxuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKGZhbHNlKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTb3J0ZWRJdGVtcyhpdGVtczogSXRlcmFibGU8cmwuSXRlbT4pOiBybC5JdGVtW10ge1xyXG4gICAgY29uc3Qgc29ydGVkSXRlbXMgPSBhcnJheS5vcmRlckJ5KGl0ZW1zLCBpID0+IGkubmFtZSlcclxuICAgIHJldHVybiBzb3J0ZWRJdGVtc1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTb3J0ZWRJdGVtc1BhZ2UoaXRlbXM6IEl0ZXJhYmxlPHJsLkl0ZW0+LCBwYWdlSW5kZXg6IG51bWJlciwgcGFnZVNpemU6IG51bWJlcik6IHJsLkl0ZW1bXSB7XHJcbiAgICBjb25zdCBzdGFydEluZGV4ID0gcGFnZUluZGV4ICogcGFnZVNpemVcclxuICAgIGNvbnN0IGVuZEluZGV4ID0gc3RhcnRJbmRleCArIHBhZ2VTaXplXHJcbiAgICBjb25zdCBzb3J0ZWRJdGVtcyA9IGdldFNvcnRlZEl0ZW1zKGl0ZW1zKVxyXG4gICAgY29uc3QgcGFnZSA9IHNvcnRlZEl0ZW1zLnNsaWNlKHN0YXJ0SW5kZXgsIGVuZEluZGV4KVxyXG4gICAgcmV0dXJuIHBhZ2VcclxufVxyXG5cclxuZnVuY3Rpb24gY2FuU2VlKG1hcDogbWFwcy5NYXAsIGV5ZTogZ2VvLlBvaW50LCB0YXJnZXQ6IGdlby5Qb2ludCk6IGJvb2xlYW4ge1xyXG4gICAgZm9yIChjb25zdCBwdCBvZiBtYXJjaChleWUsIHRhcmdldCkpIHtcclxuICAgICAgICAvLyBpZ25vcmUgc3RhcnQgcG9pbnRcclxuICAgICAgICBpZiAocHQuZXF1YWwoZXllKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCB0aCBvZiBtYXAuYXQocHQpKSB7XHJcbiAgICAgICAgICAgIGlmICghdGgudHJhbnNwYXJlbnQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uKiBtYXJjaChzdGFydDogZ2VvLlBvaW50LCBlbmQ6IGdlby5Qb2ludCk6IEdlbmVyYXRvcjxnZW8uUG9pbnQ+IHtcclxuICAgIGNvbnN0IGN1ciA9IHN0YXJ0LmNsb25lKClcclxuICAgIGNvbnN0IGR5ID0gTWF0aC5hYnMoZW5kLnkgLSBzdGFydC55KTtcclxuICAgIGNvbnN0IHN5ID0gc3RhcnQueSA8IGVuZC55ID8gMSA6IC0xO1xyXG4gICAgY29uc3QgZHggPSAtTWF0aC5hYnMoZW5kLnggLSBzdGFydC54KTtcclxuICAgIGNvbnN0IHN4ID0gc3RhcnQueCA8IGVuZC54ID8gMSA6IC0xO1xyXG4gICAgbGV0IGVyciA9IGR5ICsgZHg7XHJcblxyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICB5aWVsZCBjdXJcclxuXHJcbiAgICAgICAgaWYgKGN1ci5lcXVhbChlbmQpKSB7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZTIgPSAyICogZXJyO1xyXG4gICAgICAgIGlmIChlMiA+PSBkeCkge1xyXG4gICAgICAgICAgICBlcnIgKz0gZHg7XHJcbiAgICAgICAgICAgIGN1ci55ICs9IHN5O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUyIDw9IGR5KSB7XHJcbiAgICAgICAgICAgIGVyciArPSBkeTtcclxuICAgICAgICAgICAgY3VyLnggKz0gc3g7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcm9wSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuSXRlbSk6IHZvaWQge1xyXG4gICAgcGxheWVyLmRlbGV0ZShpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSB3YXMgZHJvcHBlZGApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZUl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLlVzYWJsZSk6IHZvaWQge1xyXG4gICAgY29uc3QgYW1vdW50ID0gTWF0aC5taW4oaXRlbS5oZWFsdGgsIHBsYXllci5tYXhIZWFsdGggLSBwbGF5ZXIuaGVhbHRoKVxyXG4gICAgcGxheWVyLmhlYWx0aCArPSBhbW91bnRcclxuICAgIHBsYXllci5kZWxldGUoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gcmVzdG9yZWQgJHthbW91bnR9IGhlYWx0aGApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVxdWlwSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuRXF1aXBwYWJsZSk6IHZvaWQge1xyXG4gICAgcGxheWVyLmVxdWlwKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHdhcyBlcXVpcHBlZGApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZUl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkVxdWlwcGFibGUpOiB2b2lkIHtcclxuICAgIHBsYXllci5yZW1vdmUoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gd2FzIHJlbW92ZWRgKVxyXG59XHJcblxyXG5jbGFzcyBBcHAge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW52YXMgPSBkb20uYnlJZChcImNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZW5kZXJlciA9IG5ldyBnZnguUmVuZGVyZXIodGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyID0gdGhpbmdzLnBsYXllci5jbG9uZSgpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGlucDogaW5wdXQuSW5wdXQgPSBuZXcgaW5wdXQuSW5wdXQodGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN0YXRzRGlhbG9nID0gbmV3IFN0YXRzRGlhbG9nKHRoaXMucGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW52ZW50b3J5RGlhbG9nID0gbmV3IEludmVudG9yeURpYWxvZyh0aGlzLnBsYXllciwgdGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lckRpYWxvZyA9IG5ldyBDb250YWluZXJEaWFsb2codGhpcy5wbGF5ZXIsIHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBkZWZlYXREaWFsb2cgPSBuZXcgRGVmZWF0RGlhbG9nKHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSBtYXA6IG1hcHMuTWFwID0gbmV3IG1hcHMuTWFwKDAsIDAsIHRoaXMucGxheWVyKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgcGxheWVyLmludmVudG9yeS5hZGQodGhpbmdzLmhlYWx0aFBvdGlvbi5jbG9uZSgpKVxyXG4gICAgICAgIHBsYXllci5pbnZlbnRvcnkuYWRkKHRoaW5ncy5jbG90aEFybW9yKVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWMoKSB7XHJcbiAgICAgICAgdGhpcy5jYW52YXMuZm9jdXMoKVxyXG4gICAgICAgIHRoaXMubWFwID0gYXdhaXQgZ2VuLmdlbmVyYXRlTWFwKHRoaXMucGxheWVyLCB0aGlzLnJlbmRlcmVyLCAzMiwgMzIpXHJcbiAgICAgICAgaWYgKCF0aGlzLnBsYXllci5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQbGF5ZXIgaXMgbm90IHBvc2l0aW9uZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG91dHB1dC53cml0ZShcIllvdXIgYWR2ZW50dXJlIGJlZ2luc1wiKVxyXG4gICAgICAgIG1hcHMudXBkYXRlVmlzaWJpbGl0eSh0aGlzLm1hcCwgdGhpcy5tYXAucGxheWVyLnBvc2l0aW9uLCBybC5saWdodFJhZGl1cylcclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy50aWNrKCkpXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHRpY2soKSB7XHJcbiAgICAgICAgY29uc3QgbmV4dENyZWF0dXJlID0gdGhpcy5nZXROZXh0Q3JlYXR1cmUoKVxyXG4gICAgICAgIGlmIChuZXh0Q3JlYXR1cmUgaW5zdGFuY2VvZiBybC5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaGFuZGxlSW5wdXQoKSkge1xyXG4gICAgICAgICAgICAgICAgbWFwcy51cGRhdGVWaXNpYmlsaXR5KHRoaXMubWFwLCB0aGlzLnBsYXllci5wb3NpdGlvbiwgcmwubGlnaHRSYWRpdXMpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKG5leHRDcmVhdHVyZSBpbnN0YW5jZW9mIHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgdGhpcy50aWNrTW9uc3RlcihuZXh0Q3JlYXR1cmUpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy50aWNrUm91bmQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmF3RnJhbWUoKVxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLnRpY2soKSlcclxuICAgIH1cclxuXHJcbiAgICBnZXROZXh0TW9uc3RlcigpOiBybC5Nb25zdGVyIHwgbnVsbCB7XHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHdob3NlIHR1cm4gaXQgaXNcclxuICAgICAgICBsZXQgbmV4dE1vbnN0ZXIgPSBudWxsXHJcbiAgICAgICAgZm9yIChjb25zdCBtb25zdGVyIG9mIHRoaXMubWFwLm1vbnN0ZXJzKSB7XHJcbiAgICAgICAgICAgIGlmIChtb25zdGVyLnN0YXRlICE9PSBybC5Nb25zdGVyU3RhdGUuYWdncm8pIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChtb25zdGVyLmFjdGlvbiA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIW5leHRNb25zdGVyIHx8IG1vbnN0ZXIuYWN0aW9uID4gbmV4dE1vbnN0ZXIuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBuZXh0TW9uc3RlciA9IG1vbnN0ZXJcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG5leHRNb25zdGVyXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TmV4dENyZWF0dXJlKCk6IHJsLk1vbnN0ZXIgfCBybC5QbGF5ZXIgfCBudWxsIHtcclxuICAgICAgICBjb25zdCBtb25zdGVyID0gdGhpcy5nZXROZXh0TW9uc3RlcigpXHJcbiAgICAgICAgaWYgKHRoaXMucGxheWVyLmFjdGlvbiA+IDAgJiYgdGhpcy5wbGF5ZXIuYWN0aW9uID4gKG1vbnN0ZXI/LmFjdGlvbiA/PyAwKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wbGF5ZXJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtb25zdGVyXHJcbiAgICB9XHJcblxyXG4gICAgdGlja1JvdW5kKCkge1xyXG4gICAgICAgIC8vIGFjY3VtdWxhdGUgYWN0aW9uIHBvaW50c1xyXG4gICAgICAgIGZvciAoY29uc3QgbW9uc3RlciBvZiBhcnJheS5maWx0ZXIodGhpcy5tYXAubW9uc3RlcnMsIG0gPT4gbS5zdGF0ZSA9PT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvKSkge1xyXG4gICAgICAgICAgICBjb25zdCByZXNlcnZlID0gTWF0aC5taW4obW9uc3Rlci5hY3Rpb25SZXNlcnZlLCBtb25zdGVyLmFnaWxpdHkpXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMSArIG1vbnN0ZXIuYWdpbGl0eSArIHJlc2VydmVcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb25SZXNlcnZlID0gMFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY2FwIGFjdGlvbiByZXNlcnZlIFxyXG4gICAgICAgIGNvbnN0IHJlc2VydmUgPSBNYXRoLm1pbih0aGlzLnBsYXllci5hY3Rpb25SZXNlcnZlLCB0aGlzLnBsYXllci5hZ2lsaXR5KVxyXG4gICAgICAgIHRoaXMucGxheWVyLmFjdGlvbiA9IDEgKyB0aGlzLnBsYXllci5hZ2lsaXR5ICsgcmVzZXJ2ZVxyXG4gICAgICAgIHRoaXMucGxheWVyLmFjdGlvblJlc2VydmUgPSAwXHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlTW9uc3RlclN0YXRlcygpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0U2Nyb2xsT2Zmc2V0KCk6IGdlby5Qb2ludCB7XHJcbiAgICAgICAgLy8gY29udmVydCBtYXAgcG9pbnQgdG8gY2FudmFzIHBvaW50LCBub3RpbmcgdGhhdCBjYW52YXMgaXMgY2VudGVyZWQgb24gcGxheWVyXHJcbiAgICAgICAgY29uc3QgcGxheWVyUG9zaXRpb24gPSB0aGlzLnBsYXllci5wb3NpdGlvblxyXG4gICAgICAgIGNvbnN0IGNhbnZhc0NlbnRlciA9IG5ldyBnZW8uUG9pbnQodGhpcy5jYW52YXMud2lkdGggLyAyLCB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyKVxyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IGNhbnZhc0NlbnRlci5zdWJQb2ludChwbGF5ZXJQb3NpdGlvbi5hZGRTY2FsYXIoLjUpLm11bFNjYWxhcihybC50aWxlU2l6ZSkpXHJcbiAgICAgICAgcmV0dXJuIG9mZnNldC5mbG9vcigpXHJcbiAgICB9XHJcblxyXG4gICAgY2FudmFzVG9NYXBQb2ludChjeHk6IGdlby5Qb2ludCkge1xyXG4gICAgICAgIGNvbnN0IHNjcm9sbE9mZnNldCA9IHRoaXMuZ2V0U2Nyb2xsT2Zmc2V0KClcclxuICAgICAgICBjb25zdCBteHkgPSBjeHkuc3ViUG9pbnQoc2Nyb2xsT2Zmc2V0KS5kaXZTY2FsYXIocmwudGlsZVNpemUpXHJcbiAgICAgICAgcmV0dXJuIG14eVxyXG4gICAgfVxyXG5cclxuICAgIG1hcFRvQ2FudmFzUG9pbnQobXh5OiBnZW8uUG9pbnQpIHtcclxuICAgICAgICBjb25zdCBzY3JvbGxPZmZzZXQgPSB0aGlzLmdldFNjcm9sbE9mZnNldCgpXHJcbiAgICAgICAgY29uc3QgY3h5ID0gbXh5Lm11bFNjYWxhcihybC50aWxlU2l6ZSkuYWRkUG9pbnQoc2Nyb2xsT2Zmc2V0KVxyXG4gICAgICAgIHJldHVybiBjeHlcclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzUGxheWVyTWVsZWVBdHRhY2soZGVmZW5kZXI6IHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAvLyBiYXNlIDYwJSBjaGFuY2UgdG8gaGl0XHJcbiAgICAgICAgLy8gMTAlIGJvbnVzIC8gcGVuYWx0eSBmb3IgZXZlcnkgcG9pbnQgZGlmZmVyZW5jZSBiZXR3ZWVuIGF0dGFjayBhbmQgZGVmZW5zZVxyXG4gICAgICAgIC8vIGJvdHRvbXMgb3V0IGF0IDUlIC0gYWx3YXlzIFNPTUUgY2hhbmNlIHRvIGhpdFxyXG4gICAgICAgIGNvbnN0IGF0dGFja2VyID0gdGhpcy5wbGF5ZXJcclxuICAgICAgICBjb25zdCBib251cyA9IChhdHRhY2tlci5tZWxlZUF0dGFjayAtIGRlZmVuZGVyLmRlZmVuc2UpICogLjFcclxuICAgICAgICBjb25zdCBoaXRDaGFuY2UgPSBNYXRoLm1pbihNYXRoLm1heCguNiArIGJvbnVzLCAuMDUpLCAuOTUpXHJcbiAgICAgICAgY29uc3QgaGl0ID0gcmFuZC5jaGFuY2UoaGl0Q2hhbmNlKVxyXG4gICAgICAgIGNvbnN0IHdlYXBvbiA9IGF0dGFja2VyLm1lbGVlV2VhcG9uID8/IHRoaW5ncy5maXN0c1xyXG4gICAgICAgIGNvbnN0IGF0dGFja1ZlcmIgPSB3ZWFwb24udmVyYiA/IHdlYXBvbi52ZXJiIDogXCJhdHRhY2tzXCJcclxuICAgICAgICBhdHRhY2tlci5hY3Rpb24gLT0gd2VhcG9uLmFjdGlvblxyXG5cclxuICAgICAgICBpZiAoIWhpdCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYnV0IG1pc3NlcyFgKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhpdCAtIGNhbGN1bGF0ZSBkYW1hZ2VcclxuICAgICAgICBjb25zdCBkYW1hZ2UgPSBhdHRhY2tlci5tZWxlZURhbWFnZS5yb2xsKClcclxuICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYW5kIGhpdHMgZm9yICR7ZGFtYWdlfSBkYW1hZ2UhYClcclxuICAgICAgICBkZWZlbmRlci5oZWFsdGggLT0gZGFtYWdlXHJcblxyXG4gICAgICAgIGlmIChkZWZlbmRlci5oZWFsdGggPCAwKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke2RlZmVuZGVyLm5hbWV9IGhhcyBiZWVuIGRlZmVhdGVkIGFuZCAke2F0dGFja2VyLm5hbWV9IHJlY2VpdmVzICR7ZGVmZW5kZXIuZXhwZXJpZW5jZX0gZXhwZXJpZW5jZWApXHJcbiAgICAgICAgICAgIHRoaXMucGxheWVyLmV4cGVyaWVuY2UgKz0gZGVmZW5kZXIuZXhwZXJpZW5jZVxyXG4gICAgICAgICAgICB0aGlzLm1hcC5tb25zdGVycy5kZWxldGUoZGVmZW5kZXIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NQbGF5ZXJSYW5nZWRBdHRhY2soZGVmZW5kZXI6IHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAvLyBiYXNlIDQwJSBjaGFuY2UgdG8gaGl0XHJcbiAgICAgICAgLy8gMTAlIGJvbnVzIC8gcGVuYWx0eSBmb3IgZXZlcnkgcG9pbnQgZGlmZmVyZW5jZSBiZXR3ZWVuIGF0dGFjayBhbmQgZGVmZW5zZVxyXG4gICAgICAgIC8vIGJvdHRvbXMgb3V0IGF0IDUlIC0gYWx3YXlzIFNPTUUgY2hhbmNlIHRvIGhpdFxyXG4gICAgICAgIGNvbnN0IGF0dGFja2VyID0gdGhpcy5wbGF5ZXJcclxuICAgICAgICBpZiAoIWF0dGFja2VyLnJhbmdlZFdlYXBvbikge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQbGF5ZXIgaGFzIG5vIHJhbmdlZCB3ZWFwb24gZXF1aXBwZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGJvbnVzID0gKGF0dGFja2VyLnJhbmdlZEF0dGFjayAtIGRlZmVuZGVyLmRlZmVuc2UpICogLjFcclxuICAgICAgICBjb25zdCBoaXRDaGFuY2UgPSBNYXRoLm1pbihNYXRoLm1heCguNiArIGJvbnVzLCAuMDUpLCAuOTUpXHJcbiAgICAgICAgY29uc3QgaGl0ID0gcmFuZC5jaGFuY2UoaGl0Q2hhbmNlKVxyXG4gICAgICAgIGNvbnN0IHdlYXBvbiA9IGF0dGFja2VyLnJhbmdlZFdlYXBvblxyXG4gICAgICAgIGNvbnN0IGF0dGFja1ZlcmIgPSB3ZWFwb24udmVyYiA/IHdlYXBvbi52ZXJiIDogXCJhdHRhY2tzXCJcclxuICAgICAgICBhdHRhY2tlci5hY3Rpb24gLT0gd2VhcG9uLmFjdGlvblxyXG5cclxuICAgICAgICBpZiAoIWhpdCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYnV0IG1pc3NlcyFgKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhpdCAtIGNhbGN1bGF0ZSBkYW1hZ2VcclxuICAgICAgICBjb25zdCBkYW1hZ2UgPSBhdHRhY2tlci5yYW5nZWREYW1hZ2U/LnJvbGwoKSA/PyAwXHJcbiAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7YXR0YWNrZXIubmFtZX0gJHthdHRhY2tWZXJifSAke2RlZmVuZGVyLm5hbWV9IGFuZCBoaXRzIGZvciAke2RhbWFnZX0gZGFtYWdlIWApXHJcbiAgICAgICAgZGVmZW5kZXIuaGVhbHRoIC09IGRhbWFnZVxyXG5cclxuICAgICAgICBpZiAoZGVmZW5kZXIuaGVhbHRoIDwgMCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHtkZWZlbmRlci5uYW1lfSBoYXMgYmVlbiBkZWZlYXRlZCBhbmQgJHthdHRhY2tlci5uYW1lfSByZWNlaXZlcyAke2RlZmVuZGVyLmV4cGVyaWVuY2V9IGV4cGVyaWVuY2VgKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXllci5leHBlcmllbmNlICs9IGRlZmVuZGVyLmV4cGVyaWVuY2VcclxuICAgICAgICAgICAgdGhpcy5tYXAubW9uc3RlcnMuZGVsZXRlKGRlZmVuZGVyKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzTW9uc3RlckF0dGFjayhhdHRhY2tlcjogcmwuTW9uc3RlciwgYXR0YWNrOiBybC5BdHRhY2spIHtcclxuICAgICAgICAvLyBiYXNlIDYwJSBjaGFuY2UgdG8gaGl0XHJcbiAgICAgICAgLy8gMTAlIGJvbnVzIC8gcGVuYWx0eSBmb3IgZXZlcnkgcG9pbnQgZGlmZmVyZW5jZSBiZXR3ZWVuIGF0dGFjayBhbmQgZGVmZW5zZVxyXG4gICAgICAgIC8vIGNsYW1wcyB0byBvdXQgYXQgWzUsIDk1XSAtIGFsd2F5cyBTT01FIGNoYW5jZSB0byBoaXQgb3IgbWlzc1xyXG4gICAgICAgIC8vIGNob29zZSBhbiBhdHRhY2sgZnJvbSByZXBlcnRvaXJlIG9mIG1vbnN0ZXJcclxuICAgICAgICBjb25zdCBkZWZlbmRlciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgY29uc3QgYm9udXMgPSAoYXR0YWNrLmF0dGFjayAtIGRlZmVuZGVyLmRlZmVuc2UpICogLjFcclxuICAgICAgICBjb25zdCBoaXRDaGFuY2UgPSBNYXRoLm1heCguNiArIGJvbnVzLCAuMDUpXHJcbiAgICAgICAgY29uc3QgaGl0ID0gcmFuZC5jaGFuY2UoaGl0Q2hhbmNlKVxyXG4gICAgICAgIGNvbnN0IGF0dGFja1ZlcmIgPSBhdHRhY2sudmVyYiA/IGF0dGFjay52ZXJiIDogXCJhdHRhY2tzXCJcclxuICAgICAgICBhdHRhY2tlci5hY3Rpb24gLT0gYXR0YWNrLmFjdGlvblxyXG5cclxuICAgICAgICBpZiAoIWhpdCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYnV0IG1pc3NlcyFgKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhpdCAtIGNhbGN1bGF0ZSBkYW1hZ2VcclxuICAgICAgICBjb25zdCBkYW1hZ2UgPSBhdHRhY2suZGFtYWdlLnJvbGwoKVxyXG4gICAgICAgIG91dHB1dC53YXJuaW5nKGAke2F0dGFja2VyLm5hbWV9ICR7YXR0YWNrVmVyYn0gJHtkZWZlbmRlci5uYW1lfSBhbmQgaGl0cyBmb3IgJHtkYW1hZ2V9IGRhbWFnZSFgKVxyXG4gICAgICAgIGRlZmVuZGVyLmhlYWx0aCAtPSBkYW1hZ2VcclxuXHJcbiAgICAgICAgaWYgKGRlZmVuZGVyLmhlYWx0aCA8PSAwKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke2RlZmVuZGVyLm5hbWV9IGhhcyBiZWVuIGRlZmVhdGVkIWApXHJcbiAgICAgICAgICAgIHRoaXMuZGVmZWF0RGlhbG9nLnNob3coKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVNb25zdGVyU3RhdGVzKCkge1xyXG4gICAgICAgIGZvciAoY29uc3QgbW9uc3RlciBvZiB0aGlzLm1hcC5tb25zdGVycykge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZU1vbnN0ZXJTdGF0ZShtb25zdGVyKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVNb25zdGVyU3RhdGUobW9uc3RlcjogcmwuTW9uc3Rlcikge1xyXG4gICAgICAgIC8vIGFnZ3JvIHN0YXRlXHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBpZiAobW9uc3Rlci5zdGF0ZSAhPT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvICYmIGNhblNlZShtYXAsIG1vbnN0ZXIucG9zaXRpb24sIG1hcC5wbGF5ZXIucG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgICAgICBtb25zdGVyLnN0YXRlID0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobW9uc3Rlci5zdGF0ZSA9PT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvICYmICFjYW5TZWUobWFwLCBtb25zdGVyLnBvc2l0aW9uLCBtYXAucGxheWVyLnBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvbiA9IDBcclxuICAgICAgICAgICAgbW9uc3Rlci5zdGF0ZSA9IHJsLk1vbnN0ZXJTdGF0ZS5pZGxlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRpY2tNb25zdGVyKG1vbnN0ZXI6IHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAvLyBpZiBwbGF5ZXIgaXMgd2l0aGluIHJlYWNoIChhbmQgYWxpdmUpLCBhdHRhY2tcclxuICAgICAgICBpZiAodGhpcy5wbGF5ZXIuaGVhbHRoID4gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBkaXN0YW5jZVRvUGxheWVyID0gZ2VvLmNhbGNNYW5oYXR0ZW5EaXN0KHRoaXMucGxheWVyLnBvc2l0aW9uLCBtb25zdGVyLnBvc2l0aW9uKVxyXG4gICAgICAgICAgICBjb25zdCBhdHRhY2tzID0gbW9uc3Rlci5hdHRhY2tzLmZpbHRlcihhID0+IGEucmFuZ2UgPj0gZGlzdGFuY2VUb1BsYXllcilcclxuICAgICAgICAgICAgaWYgKGF0dGFja3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYXR0YWNrID0gcmFuZC5jaG9vc2UoYXR0YWNrcylcclxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc01vbnN0ZXJBdHRhY2sobW9uc3RlciwgYXR0YWNrKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGRldGVybWluZSB3aGV0aGVyIG1vbnN0ZXIgY2FuIHNlZSBwbGF5ZXJcclxuICAgICAgICAvLyBzZWVrIGFuZCBkZXN0cm95XHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBjb25zdCBwYXRoID0gbWFwcy5maW5kUGF0aChtYXAsIG1vbnN0ZXIucG9zaXRpb24sIHRoaXMucGxheWVyLnBvc2l0aW9uKVxyXG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAvLyBwYXNzXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gcGF0aFswXVxyXG4gICAgICAgIGlmIChtYXAuaXNQYXNzYWJsZShwb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gLT0gMVxyXG4gICAgICAgICAgICBtb25zdGVyLnBvc2l0aW9uID0gcGF0aFswXVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBoYW5kbGVSZXNpemUoKSB7XHJcbiAgICAgICAgY29uc3QgY2FudmFzID0gdGhpcy5jYW52YXNcclxuICAgICAgICBpZiAoY2FudmFzLndpZHRoID09PSBjYW52YXMuY2xpZW50V2lkdGggJiYgY2FudmFzLmhlaWdodCA9PT0gY2FudmFzLmNsaWVudEhlaWdodCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICB9XHJcblxyXG4gICAgaGFuZGxlSW5wdXQoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLnBsYXllclxyXG4gICAgICAgIGNvbnN0IGlucCA9IHRoaXMuaW5wXHJcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBwbGF5ZXIucG9zaXRpb24uY2xvbmUoKVxyXG5cclxuICAgICAgICBpZiAoaW5wLm1vdXNlTGVmdFJlbGVhc2VkKSB7XHJcbiAgICAgICAgICAgIC8vIGRldGVybWluZSB0aGUgbWFwIGNvb3JkaW5hdGVzIHRoZSB1c2VyIGNsaWNrZWQgb25cclxuICAgICAgICAgICAgY29uc3QgbXh5ID0gdGhpcy5jYW52YXNUb01hcFBvaW50KG5ldyBnZW8uUG9pbnQoaW5wLm1vdXNlWCwgaW5wLm1vdXNlWSkpLmZsb29yKClcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNsaWNrRml4dHVyZSA9IG1hcC5maXh0dXJlQXQobXh5KVxyXG4gICAgICAgICAgICBpZiAoY2xpY2tGaXh0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke2NsaWNrRml4dHVyZS5uYW1lfWApXHJcbiAgICAgICAgICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNsaWNrQ3JlYXR1cmUgPSBtYXAubW9uc3RlckF0KG14eSlcclxuICAgICAgICAgICAgaWYgKGNsaWNrQ3JlYXR1cmUpIHtcclxuICAgICAgICAgICAgICAgIG91dHB1dC5pbmZvKGBZb3Ugc2VlICR7Y2xpY2tDcmVhdHVyZS5uYW1lfWApXHJcbiAgICAgICAgICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGR4eSA9IG14eS5zdWJQb2ludChwbGF5ZXIucG9zaXRpb24pXHJcbiAgICAgICAgICAgIGNvbnN0IHNnbiA9IGR4eS5zaWduKClcclxuICAgICAgICAgICAgY29uc3QgYWJzID0gZHh5LmFicygpXHJcblxyXG4gICAgICAgICAgICBpZiAoYWJzLnggPiAwICYmIGFicy54ID49IGFicy55KSB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbi54ICs9IHNnbi54XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChhYnMueSA+IDAgJiYgYWJzLnkgPiBhYnMueCkge1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb24ueSArPSBzZ24ueVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChpbnAucHJlc3NlZChcIndcIikgfHwgaW5wLnByZXNzZWQoXCJBcnJvd1VwXCIpKSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnkgLT0gMVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChpbnAucHJlc3NlZChcInNcIikgfHwgaW5wLnByZXNzZWQoXCJBcnJvd0Rvd25cIikpIHtcclxuICAgICAgICAgICAgcG9zaXRpb24ueSArPSAxXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGlucC5wcmVzc2VkKFwiYVwiKSB8fCBpbnAucHJlc3NlZChcIkFycm93TGVmdFwiKSkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbi54IC09IDFcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJkXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dSaWdodFwiKSkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbi54ICs9IDFcclxuICAgICAgICB9IGVsc2UgaWYgKGlucC5wcmVzc2VkKFwielwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRzRGlhbG9nLnNob3coKVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJpXCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW52ZW50b3J5RGlhbG9nLnNob3coKVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaW5wLnByZXNzZWQoXCIgXCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGxheWVyLmFjdGlvblJlc2VydmUgKz0gdGhpcy5wbGF5ZXIuYWN0aW9uXHJcbiAgICAgICAgICAgIHRoaXMucGxheWVyLmFjdGlvbiA9IDBcclxuICAgICAgICAgICAgaW5wLmZsdXNoKClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlucC5mbHVzaCgpXHJcblxyXG4gICAgICAgIGlmIChwb3NpdGlvbi5lcXVhbChwbGF5ZXIucG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdGlsZSA9IG1hcC50aWxlQXQocG9zaXRpb24pXHJcbiAgICAgICAgaWYgKHRpbGUgJiYgIXRpbGUucGFzc2FibGUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYEJsb2NrZWQgYnkgJHt0aWxlLm5hbWV9YClcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtb25zdGVyID0gbWFwLm1vbnN0ZXJBdChwb3NpdGlvbilcclxuICAgICAgICBpZiAobW9uc3Rlcikge1xyXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NQbGF5ZXJNZWxlZUF0dGFjayhtb25zdGVyKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29udGFpbmVyID0gbWFwLmNvbnRhaW5lckF0KHBvc2l0aW9uKVxyXG4gICAgICAgIGlmIChjb250YWluZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5jb250YWluZXJEaWFsb2cuc2hvdyhtYXAsIGNvbnRhaW5lcilcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmaXh0dXJlID0gbWFwLmZpeHR1cmVBdChwb3NpdGlvbilcclxuICAgICAgICBpZiAoZml4dHVyZSBpbnN0YW5jZW9mIHJsLkRvb3IpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYCR7Zml4dHVyZS5uYW1lfSBvcGVuZWRgKVxyXG4gICAgICAgICAgICB0aGlzLm1hcC5maXh0dXJlcy5kZWxldGUoZml4dHVyZSlcclxuICAgICAgICAgICAgcGxheWVyLmFjdGlvbiAtPSAxXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfSBlbHNlIGlmIChmaXh0dXJlIGluc3RhbmNlb2YgcmwuU3RhaXJzVXApIHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiU3RhaXJzIG5vdCBpbXBsZW1lbnRlZFwiKVxyXG4gICAgICAgIH0gZWxzZSBpZiAoZml4dHVyZSBpbnN0YW5jZW9mIHJsLlN0YWlyc0Rvd24pIHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKFwiU3RhaXJzIG5vdCBpbXBsZW1lbnRlZFwiKVxyXG4gICAgICAgIH0gZWxzZSBpZiAoZml4dHVyZSAmJiAhZml4dHVyZS5wYXNzYWJsZSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgQ2FuJ3QgbW92ZSB0aGF0IHdheSwgYmxvY2tlZCBieSAke2ZpeHR1cmUubmFtZX1gKVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHBsYXllci5wb3NpdGlvbiA9IHBvc2l0aW9uXHJcbiAgICAgICAgcGxheWVyLmFjdGlvbiAtPSAxXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuXHJcbiAgICBkcmF3RnJhbWUoKSB7XHJcbiAgICAgICAgdGhpcy5oYW5kbGVSZXNpemUoKVxyXG5cclxuICAgICAgICAvLyBjZW50ZXIgdGhlIGdyaWQgYXJvdW5kIHRoZSBwbGF5ZXJkXHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gdGhpcy5nZXRTY3JvbGxPZmZzZXQoKVxyXG5cclxuICAgICAgICAvLyBub3RlIC0gZHJhd2luZyBvcmRlciBtYXR0ZXJzIC0gZHJhdyBmcm9tIGJvdHRvbSB0byB0b3BcclxuXHJcbiAgICAgICAgLy8gZHJhdyB2YXJpb3VzIGxheWVycyBvZiBzcHJpdGVzXHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBmb3IgKGNvbnN0IHRpbGUgb2YgbWFwLnRpbGVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgdGlsZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgZml4dHVyZSBvZiBtYXAuZml4dHVyZXMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCBmaXh0dXJlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBjb250YWluZXIgb2YgbWFwLmNvbnRhaW5lcnMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCBjb250YWluZXIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGNyZWF0dXJlIG9mIG1hcC5tb25zdGVycykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIGNyZWF0dXJlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCB0aGlzLnBsYXllcilcclxuICAgICAgICB0aGlzLmRyYXdIZWFsdGhCYXIob2Zmc2V0LCB0aGlzLnBsYXllcilcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5mbHVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgZHJhd1RoaW5nKG9mZnNldDogZ2VvLlBvaW50LCB0aDogcmwuVGhpbmcpIHtcclxuICAgICAgICAvLyBkb24ndCBkcmF3IHRoaW5ncyB0aGF0IGFyZW4ndCBwb3NpdGlvbmVkXHJcbiAgICAgICAgaWYgKCF0aC5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aC52aXNpYmxlID09PSBybC5WaXNpYmlsaXR5Lk5vbmUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb2xvciA9IHRoLmNvbG9yLmNsb25lKClcclxuICAgICAgICBpZiAodGgudmlzaWJsZSA9PT0gcmwuVmlzaWJpbGl0eS5Gb2cpIHtcclxuICAgICAgICAgICAgY29sb3IuYSA9IC41XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzcHJpdGVQb3NpdGlvbiA9IHRoLnBvc2l0aW9uLm11bFNjYWxhcihybC50aWxlU2l6ZSkuYWRkUG9pbnQob2Zmc2V0KVxyXG4gICAgICAgIGNvbnN0IHNwcml0ZSA9IG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLFxyXG4gICAgICAgICAgICBjb2xvcjogY29sb3IsXHJcbiAgICAgICAgICAgIHdpZHRoOiBybC50aWxlU2l6ZSxcclxuICAgICAgICAgICAgaGVpZ2h0OiBybC50aWxlU2l6ZSxcclxuICAgICAgICAgICAgdGV4dHVyZTogdGgudGV4dHVyZSxcclxuICAgICAgICAgICAgbGF5ZXI6IHRoLnRleHR1cmVMYXllcixcclxuICAgICAgICAgICAgZmxhZ3M6IGdmeC5TcHJpdGVGbGFncy5BcnJheVRleHR1cmVcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdTcHJpdGUoc3ByaXRlKVxyXG4gICAgfVxyXG5cclxuICAgIGRyYXdIZWFsdGhCYXIob2Zmc2V0OiBnZW8uUG9pbnQsIGNyZWF0dXJlOiBybC5DcmVhdHVyZSkge1xyXG4gICAgICAgIGlmICghY3JlYXR1cmUucG9zaXRpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBoZWFsdGggPSBNYXRoLm1heChjcmVhdHVyZS5oZWFsdGgsIDApXHJcbiAgICAgICAgY29uc3QgYm9yZGVyV2lkdGggPSBoZWFsdGggKiA0ICsgMlxyXG4gICAgICAgIGNvbnN0IGludGVyaW9yV2lkdGggPSBoZWFsdGggKiA0XHJcbiAgICAgICAgY29uc3Qgc3ByaXRlUG9zaXRpb24gPSBjcmVhdHVyZS5wb3NpdGlvbi5tdWxTY2FsYXIocmwudGlsZVNpemUpLmFkZFBvaW50KG9mZnNldCkuc3ViUG9pbnQobmV3IGdlby5Qb2ludCgwLCBybC50aWxlU2l6ZSAvIDIpKVxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd1Nwcml0ZShuZXcgZ2Z4LlNwcml0ZSh7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBzcHJpdGVQb3NpdGlvbixcclxuICAgICAgICAgICAgY29sb3I6IGdmeC5Db2xvci53aGl0ZSxcclxuICAgICAgICAgICAgd2lkdGg6IGJvcmRlcldpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IDhcclxuICAgICAgICB9KSlcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3U3ByaXRlKG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLmFkZFBvaW50KG5ldyBnZW8uUG9pbnQoMSwgMSkpLFxyXG4gICAgICAgICAgICBjb2xvcjogZ2Z4LkNvbG9yLnJlZCxcclxuICAgICAgICAgICAgd2lkdGg6IGludGVyaW9yV2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodDogNlxyXG4gICAgICAgIH0pKVxyXG4gICAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBpbml0KCkge1xyXG4gICAgY29uc3QgYXBwID0gbmV3IEFwcCgpXHJcbiAgICBhd2FpdCBhcHAuZXhlYygpXHJcbn1cclxuXHJcbmluaXQoKSJdfQ==