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
import * as math from "../shared/math.js";
const STORAGE_KEY = "crawl_storage";
class Animation {
    constructor(startPosition, endPosition, startTime, duration) {
        this.startPosition = startPosition;
        this.endPosition = endPosition;
        this.startTime = startTime;
        this.duration = duration;
        this._position = startPosition;
        this._done = false;
    }
    update(time) {
        const t = math.clamp(math.unlerp(this.startTime, this.startTime + this.duration, time), 0, 1);
        this._position = geo.lerp(this.startPosition, this.endPosition, t);
        this._done = t >= 1;
    }
    get position() {
        return this._position;
    }
    get done() {
        return this._done;
    }
}
class Animations {
    constructor() {
        this.animations = new Map();
        this.time = 0;
    }
    insert(th, startPosition, endPosition, duration) {
        this.animations.set(th, new Animation(startPosition, endPosition, this.time, duration));
    }
    update(time) {
        for (const anim of this.animations.values()) {
            anim.update(time);
        }
        this.time = time;
    }
    position(th) {
        const anim = this.animations.get(th);
        return anim === null || anim === void 0 ? void 0 : anim.position;
    }
    *processDone() {
        for (const [th, anim] of this.animations) {
            yield [th, anim];
            if (anim.done) {
                this.animations.delete(th);
            }
        }
    }
    get size() {
        return this.animations.size;
    }
}
function directionVector(dir) {
    switch (dir) {
        case 0 /* North */:
            return new geo.Point(0, -1);
        case 1 /* South */:
            return new geo.Point(0, 1);
        case 2 /* East */:
            return new geo.Point(1, 0);
        case 3 /* West */:
            return new geo.Point(-1, 0);
    }
}
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
        const goldSpan = dom.byId("statsGold");
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
        goldSpan.textContent = `${player.gold}`;
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
            this.nextPage();
        });
        this.prevPageButton.addEventListener("click", () => {
            this.prevPage();
        });
        this.elem.addEventListener("keydown", ev => {
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
                this.nextItem();
            }
            if (key === "ARROWUP" || key === "W") {
                this.prevItem();
            }
            if (key === "PAGEDOWN" || key === "N") {
                this.nextPage();
            }
            if (key === "PAGEUP" || key === "P") {
                this.prevPage();
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
    nextPage() {
        this.pageIndex++;
        this.pageIndex = Math.min(this.pageIndex, Math.ceil(this.player.inventory.length / this.pageSize) - 1);
        this.refresh();
    }
    prevPage() {
        this.pageIndex--;
        this.pageIndex = Math.max(this.pageIndex, 0);
        this.refresh();
    }
    nextItem() {
        ++this.selectedIndex;
        this.selectedIndex = Math.min(this.selectedIndex, this.pageSize);
        this.refresh();
    }
    prevItem() {
        --this.selectedIndex;
        this.selectedIndex = Math.max(this.selectedIndex, -1);
        this.refresh();
    }
    show() {
        // sort inventory
        this.player.inventory.sort((a, b) => {
            const aeq = this.player.isEquipped(a);
            const beq = this.player.isEquipped(b);
            if (aeq === beq) {
                return a.name <= b.name ? -1 : 1;
            }
            return (aeq ? 1 : 2) - (beq ? 1 : 2);
        });
        this.refresh();
        super.show();
    }
    refresh() {
        const tbody = this.table.tBodies[0];
        dom.removeAllChildren(tbody);
        if (this.player.inventory.length === 0) {
            this.emptyDiv.hidden = false;
            this.infoDiv.hidden = true;
        }
        else {
            this.emptyDiv.hidden = true;
            this.infoDiv.hidden = false;
        }
        const pageCount = Math.ceil(this.player.inventory.length / this.pageSize);
        this.pageIndex = Math.min(Math.max(0, this.pageIndex), pageCount - 1);
        this.prevPageButton.disabled = this.pageIndex <= 0;
        this.nextPageButton.disabled = this.pageIndex >= pageCount - 1;
        this.infoDiv.textContent = `Page ${this.pageIndex + 1} of ${pageCount}`;
        const items = iter.page(this.player.inventory, this.pageIndex, this.pageSize);
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
            const equipped = this.player.isEquipped(item);
            const name = item instanceof rl.LightSource ? `${equipped ? "* " : ""}${item.name} (${item.duration})` : `${equipped ? "* " : ""}${item.name}`;
            itemIndexTd.textContent = (i + 1).toString();
            itemNameTd.textContent = name;
            if (!(item instanceof rl.Usable)) {
                useButton.remove();
            }
            if (!rl.isEquippable(item) || equipped) {
                equipButton.remove();
            }
            if (!equipped) {
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
        const item = this.player.inventory[i];
        if (!(item instanceof rl.Usable)) {
            return;
        }
        useItem(this.player, item);
        this.refresh();
    }
    drop(index) {
        const i = this.pageIndex * this.pageSize + index;
        const item = this.player.inventory[i];
        dropItem(this.player, item);
        this.refresh();
    }
    equip(index) {
        const i = this.pageIndex * this.pageSize + index;
        const item = this.player.inventory[i];
        if (!rl.isEquippable(item)) {
            return;
        }
        equipItem(this.player, item);
        this.refresh();
    }
    remove(index) {
        const i = this.pageIndex * this.pageSize + index;
        const item = this.player.inventory[i];
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
        elem.addEventListener("keypress", ev => {
            const index = parseInt(ev.key);
            if (index && index > 0 && index <= 9) {
                this.take(index - 1);
            }
        });
        elem.addEventListener("keydown", ev => {
            const key = ev.key.toUpperCase();
            if (key === "ESCAPE") {
                this.hide();
            }
            if (key === "ENTER") {
                this.takeAll();
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
        if (this.map && this.container && this.container.items.length === 0) {
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
        const item = this.container.items[index];
        this.container.items.splice(index, 1);
        this.player.inventory.push(item);
        // hide if this was the last item
        if (this.container.items.length == 0) {
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
        this.player.inventory.push(...this.container.items);
        this.container.items.splice(0, this.container.items.length);
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
        window.location.reload();
    }
}
class LevelDialog extends Dialog {
    constructor(player, canvas) {
        super(dom.byId("levelDialog"), canvas);
        this.player = player;
        this.levelStrengthRow = dom.byId("levelStrengthRow");
        this.levelIntelligenceRow = dom.byId("levelIntelligenceRow");
        this.levelAgilityRow = dom.byId("levelAgilityRow");
        this.levelStrengthRow.addEventListener("click", () => this.levelStrenth());
        this.levelIntelligenceRow.addEventListener("click", () => this.levelIntelligence());
        this.levelAgilityRow.addEventListener("click", () => this.levelAgility());
        this.elem.addEventListener("keydown", (ev) => {
            const key = ev.key.toUpperCase();
            const index = parseInt(ev.key);
            if (index == 1 || key == "S") {
                this.levelStrenth();
            }
            if (index == 2 || key == "I") {
                this.levelIntelligence();
            }
            if (index == 3 || key == "A") {
                this.levelAgility();
            }
        });
    }
    levelStrenth() {
        this.player.baseStrength++;
        this.levelUp();
    }
    levelIntelligence() {
        this.player.baseIntelligence++;
        this.levelUp();
    }
    levelAgility() {
        this.player.baseAgility++;
        this.levelUp();
    }
    levelUp() {
        this.hide();
        this.player.baseMaxHealth += 3 + this.player.strength;
    }
}
var ShopDialogMode;
(function (ShopDialogMode) {
    ShopDialogMode[ShopDialogMode["Buy"] = 0] = "Buy";
    ShopDialogMode[ShopDialogMode["Sell"] = 1] = "Sell";
})(ShopDialogMode || (ShopDialogMode = {}));
class ShopDialog {
    constructor(player, canvas) {
        this.player = player;
        this.goldSpan = dom.byId("shopGoldSpan");
        this.closeButton = dom.byId("shopExitButton");
        this.buyButton = dom.byId("shopBuyButton");
        this.sellButton = dom.byId("shopSellButton");
        this.nextPageButton = dom.byId("shopNextPageButton");
        this.prevPageButton = dom.byId("shopPrevPageButton");
        this.shopTable = dom.byId("shopTable");
        this.shopBuyItemTemplate = dom.byId("shopBuyItemTemplate");
        this.shopSellItemTemplate = dom.byId("shopSellItemTemplate");
        this.mode = ShopDialogMode.Buy;
        this.items = [];
        this.pageSize = 9;
        this.pageIndex = 0;
        this.selectedIndex = -1;
        this.dialog = new Dialog(dom.byId("shopDialog"), canvas);
        this.player = player;
        this.buyButton.addEventListener("click", () => this.setMode(ShopDialogMode.Buy));
        this.sellButton.addEventListener("click", () => this.setMode(ShopDialogMode.Sell));
        this.nextPageButton.addEventListener("click", () => this.nextPage());
        this.prevPageButton.addEventListener("click", () => this.prevPage());
        this.closeButton.addEventListener("click", () => this.hide());
        const elem = this.dialog.elem;
        dom.delegate(elem, "click", ".item-row", (ev) => {
            const btn = ev.target;
            const row = btn.closest(".item-row");
            const idx = dom.getElementIndex(row);
            this.choose(idx);
        });
        elem.addEventListener("keydown", (ev) => {
            const key = ev.key.toUpperCase();
            if (key === "X") {
                this.hide();
            }
            if (key === "B") {
                this.setMode(ShopDialogMode.Buy);
            }
            if (key === "S") {
                this.setMode(ShopDialogMode.Sell);
            }
            if (key === "ARROWDOWN" || key === "S") {
                this.nextItem();
            }
            if (key === "ARROWUP" || key === "W") {
                this.prevItem();
            }
            if (key === "PAGEDOWN" || key === "N") {
                this.nextPage();
            }
            if (key === "PAGEUP" || key === "P") {
                this.prevPage();
            }
            if (key === "ESCAPE") {
                this.hide();
            }
            if (key === "ENTER") {
                this.choose(this.selectedIndex);
            }
            const index = parseInt(ev.key);
            if (index && index > 0 && index <= 9) {
                this.choose(index - 1);
            }
        });
    }
    show() {
        this.refresh();
        this.dialog.show();
    }
    hide() {
        this.dialog.hide();
    }
    choose(idx) {
        idx = this.pageIndex * this.pageSize + idx;
        switch (this.mode) {
            case ShopDialogMode.Buy:
                this.buy(idx);
                break;
            case ShopDialogMode.Sell:
                this.sell(idx);
                break;
        }
    }
    setMode(mode) {
        this.mode = mode;
        this.pageIndex = 0;
        this.selectedIndex = -1;
        this.refresh();
    }
    buy(idx) {
        const item = this.items[idx];
        if (item.value > this.player.gold) {
            output.error(`You do not have enough gold for ${item.name}!`);
            return;
        }
        output.info(`You bought ${item.name}.`);
        this.player.gold -= item.value;
        this.player.inventory.push(item.clone());
        this.refresh();
    }
    sell(idx) {
        const item = this.items[idx];
        const invIdx = this.player.inventory.indexOf(item);
        if (invIdx == -1) {
            return;
        }
        this.player.remove(item);
        this.player.inventory.splice(invIdx, 1);
        const sellValue = Math.floor(item.value / 2);
        this.player.gold += sellValue;
        output.info(`You sold ${item.name} for ${sellValue} gold.`);
        this.refresh();
    }
    get hidden() {
        return this.dialog.hidden;
    }
    nextPage() {
        this.pageIndex++;
        this.pageIndex = Math.min(this.pageIndex, Math.ceil(this.items.length / this.pageSize) - 1);
        this.refresh();
    }
    prevPage() {
        this.pageIndex--;
        this.pageIndex = Math.max(this.pageIndex, 0);
        this.refresh();
    }
    nextItem() {
        ++this.selectedIndex;
        this.selectedIndex = Math.min(this.selectedIndex, 8);
        this.refresh();
    }
    prevItem() {
        --this.selectedIndex;
        this.selectedIndex = Math.max(this.selectedIndex, -1);
        this.refresh();
    }
    refresh() {
        switch (this.mode) {
            case ShopDialogMode.Buy:
                this.refreshBuy();
                break;
            case ShopDialogMode.Sell:
                this.refreshSell();
                break;
        }
        this.goldSpan.textContent = `Gold: ${this.player.gold}`;
    }
    refreshBuy() {
        const tbody = this.shopTable.tBodies[0];
        dom.removeAllChildren(tbody);
        // assemble item list
        const player = this.player;
        this.items = [...things.db].filter(t => t instanceof rl.Item && t.value > 0 && t.level <= player.level);
        const pageOffset = this.pageIndex * this.pageSize;
        const pageSize = Math.min(this.pageSize, this.items.length - pageOffset);
        this.selectedIndex = Math.min(this.selectedIndex, pageSize - 1);
        for (let i = 0; i < pageSize; ++i) {
            const item = this.items[pageOffset + i];
            const fragment = this.shopBuyItemTemplate.content.cloneNode(true);
            const tr = dom.bySelector(fragment, ".item-row");
            const itemIndexTd = dom.bySelector(tr, ".item-index");
            const itemNameTd = dom.bySelector(tr, ".item-name");
            const itemCostTd = dom.bySelector(tr, ".item-cost");
            itemIndexTd.textContent = `${i + 1}`;
            itemNameTd.textContent = item.name;
            itemCostTd.textContent = `${item.value}`;
            if (i === this.selectedIndex) {
                tr.classList.add("selected");
            }
            if (item.value > player.gold) {
                tr.classList.add("disabled");
            }
            tbody.appendChild(fragment);
        }
        this.buyButton.disabled = true;
        this.sellButton.disabled = false;
    }
    refreshSell() {
        const tbody = this.shopTable.tBodies[0];
        dom.removeAllChildren(tbody);
        // assemble item list
        const player = this.player;
        this.items = [...player.inventory].filter(t => t.value > 0);
        const pageOffset = this.pageIndex * this.pageSize;
        const pageSize = Math.min(this.pageSize, this.items.length - pageOffset);
        this.selectedIndex = Math.min(this.selectedIndex, pageSize - 1);
        for (let i = 0; i < pageSize; ++i) {
            const item = this.items[pageOffset + i];
            const equipped = this.player.isEquipped(item);
            const fragment = this.shopSellItemTemplate.content.cloneNode(true);
            const tr = dom.bySelector(fragment, ".item-row");
            const itemIndexTd = dom.bySelector(tr, ".item-index");
            const itemNameTd = dom.bySelector(tr, ".item-name");
            const itemCostTd = dom.bySelector(tr, ".item-cost");
            itemIndexTd.textContent = `${i + 1}`;
            itemNameTd.textContent = `${equipped ? "* " : ""}${item.name}`;
            itemCostTd.textContent = `${Math.floor(item.value / 2)}`;
            if (i === this.selectedIndex) {
                tr.classList.add("selected");
            }
            tbody.appendChild(fragment);
        }
        this.buyButton.disabled = false;
        this.sellButton.disabled = true;
    }
}
function getSortedItems(items) {
    const sortedItems = iter.orderBy(items, i => i.name);
    return sortedItems;
}
function hasLineOfSight(map, eye, target) {
    for (const pt of march(eye, target)) {
        // ignore start point
        if (pt.equal(eye)) {
            continue;
        }
        for (const th of map.at(pt)) {
            if (!th.transparent) {
                return pt.equal(target);
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
    constructor(rng, renderer, floor, map, texture, imageMap) {
        this.rng = rng;
        this.renderer = renderer;
        this.floor = floor;
        this.map = map;
        this.texture = texture;
        this.imageMap = imageMap;
        this.canvas = dom.byId("canvas");
        this.attackButton = dom.byId("attackButton");
        this.shootButton = dom.byId("shootButton");
        this.lookButton = dom.byId("lookButton");
        this.resetButton = dom.byId("resetButton");
        this.inp = new input.Input(this.canvas);
        this.defeatDialog = new DefeatDialog(this.canvas);
        this.animations = new Animations();
        this.zoom = 1;
        this.targetCommand = TargetCommand.None;
        this.time = 0;
        const player = map.player.thing;
        this.statsDialog = new StatsDialog(player, this.canvas);
        this.inventoryDialog = new InventoryDialog(player, this.canvas);
        this.containerDialog = new ContainerDialog(player, this.canvas);
        this.levelDialog = new LevelDialog(player, this.canvas);
        this.shopDialog = new ShopDialog(player, this.canvas);
    }
    static async create() {
        const canvas = dom.byId("canvas");
        const renderer = new gfx.Renderer(canvas);
        // check for any saved state
        try {
            const app = await App.load(renderer);
            if (app) {
                return app;
            }
        }
        catch (e) {
            console.log("Failed to load state.", e);
            clearState();
        }
        // no valid save state, create app and generate dungeon
        const seed = rand.xmur3(new Date().toString());
        const rng = new rand.SFC32RNG(seed(), seed(), seed(), seed());
        const player = things.player.clone();
        const map = gen.generateDungeonLevel(rng, things.db, 1);
        placePlayerAtExit(map, player, rl.ExitDirection.Up);
        const [texture, imageMap] = await loadImages(renderer, map);
        const app = new App(rng, renderer, 1, map, texture, imageMap);
        return app;
    }
    exec() {
        this.canvas.focus();
        output.write("Your adventure begins");
        this.handleResize();
        requestAnimationFrame(time => this.tick(time));
        document.addEventListener("keydown", (ev) => this.handleKeyDown(ev));
        this.attackButton.addEventListener("click", () => {
            this.targetCommand = TargetCommand.Attack;
        });
        this.shootButton.addEventListener("click", () => {
            this.targetCommand = TargetCommand.Shoot;
        });
        this.lookButton.addEventListener("click", () => {
            this.targetCommand = TargetCommand.Look;
        });
        this.resetButton.addEventListener("click", () => {
            clearState();
            window.location.reload();
        });
    }
    tick(time) {
        var _a, _b;
        this.time = time;
        this.handleResize();
        this.animations.update(time);
        (_a = this.cursorAnimation) === null || _a === void 0 ? void 0 : _a.update(time);
        for (const [th, anim] of this.animations.processDone()) {
            if (th instanceof rl.Player) {
                this.map.players.set(anim.position, th);
                th.action -= 1;
            }
            if (th instanceof rl.Monster) {
                this.map.monsters.set(anim.position, th);
                th.action -= 1;
            }
        }
        if ((_b = this.cursorAnimation) === null || _b === void 0 ? void 0 : _b.done) {
            this.cursorPosition = this.cursorAnimation.position;
            this.cursorAnimation = undefined;
        }
        if (this.animations.size === 0 && !this.cursorAnimation) {
            const nextCreature = this.getNextCreature();
            if ((nextCreature === null || nextCreature === void 0 ? void 0 : nextCreature.thing) instanceof rl.Player) {
                this.handleInput();
            }
            else if ((nextCreature === null || nextCreature === void 0 ? void 0 : nextCreature.thing) instanceof rl.Monster) {
                this.tickMonster(nextCreature.position, nextCreature.thing);
            }
            else {
                this.tickRound();
            }
            this.updateVisibility();
        }
        this.drawFrame();
        requestAnimationFrame(time => this.tick(time));
    }
    getNextMonster() {
        // determine whose turn it is
        let nextMonster = null;
        for (const monster of this.map.monsters) {
            if (monster.thing.state !== rl.MonsterState.aggro) {
                continue;
            }
            if (monster.thing.action <= 0) {
                continue;
            }
            if (!nextMonster || monster.thing.action > nextMonster.thing.action) {
                nextMonster = monster;
            }
        }
        return nextMonster;
    }
    getNextCreature() {
        var _a, _b;
        const monster = this.getNextMonster();
        const player = this.map.player.thing;
        if (player.action > 0 && player.action > ((_b = (_a = monster === null || monster === void 0 ? void 0 : monster.thing) === null || _a === void 0 ? void 0 : _a.action) !== null && _b !== void 0 ? _b : 0)) {
            return this.map.player;
        }
        return monster;
    }
    tickRound() {
        // accumulate action points
        for (const monster of iter.filter(this.map.monsters.things(), m => m.state === rl.MonsterState.aggro)) {
            const reserve = Math.min(monster.actionReserve, monster.agility);
            monster.action = 1 + monster.agility + reserve;
            monster.actionReserve = 0;
        }
        // cap action reserve 
        const player = this.map.player.thing;
        const reserve = Math.min(player.actionReserve, player.agility);
        player.action = 1 + player.agility + reserve;
        player.actionReserve = 0;
        this.updateMonsterStates();
        // advance duration of items
        if (player.lightSource && player.lightSource.duration > 0) {
            player.lightSource.duration -= 1;
            if (player.lightSource.duration === 0) {
                output.warning(`Your ${player.lightSource.name} has been extinguished!`);
                player.delete(player.lightSource);
            }
        }
        const experienceRequired = rl.getExperienceRequirement(player.level + 1);
        if (player.experience >= experienceRequired) {
            this.levelDialog.show();
            ++player.level;
            player.experience -= experienceRequired;
        }
        // save current state
        this.saveState();
        if (player.health <= 0) {
            clearState();
            this.defeatDialog.show();
        }
    }
    getScrollOffset() {
        // convert map point to canvas point, noting that canvas is centered on player
        const playerPosition = this.map.player.position;
        const canvasCenter = new geo.Point(this.canvas.width / 2, this.canvas.height / 2);
        const offset = canvasCenter.subPoint(playerPosition.addScalar(.5).mulScalar(this.tileSize));
        return offset.floor();
    }
    canvasToMapPoint(cxy) {
        const scrollOffset = this.getScrollOffset();
        const mxy = cxy.subPoint(scrollOffset).divScalar(this.tileSize).floor();
        return mxy;
    }
    mapToCanvasPoint(mxy) {
        const scrollOffset = this.getScrollOffset();
        const cxy = mxy.mulScalar(this.tileSize).addPoint(scrollOffset);
        return cxy;
    }
    processPlayerMeleeAttack(defender) {
        var _a;
        // base 60% chance to hit
        // 10% bonus / penalty for every point difference between attack and defense
        // bottoms out at 5% - always SOME chance to hit
        const attacker = this.map.player.thing;
        const bonus = (attacker.meleeAttack - defender.defense) * .1;
        const hitChance = Math.min(Math.max(.6 + bonus, .05), .95);
        const hit = rand.chance(this.rng, hitChance);
        const weapon = (_a = attacker.meleeWeapon) !== null && _a !== void 0 ? _a : things.fists;
        const attackVerb = weapon.verb ? weapon.verb : "attacks";
        attacker.action -= weapon.action;
        if (!hit) {
            output.warning(`${attacker.name} ${attackVerb} ${defender.name} but misses!`);
            return;
        }
        // hit - calculate damage
        const damage = attacker.meleeDamage.roll(this.rng);
        output.warning(`${attacker.name} ${attackVerb} ${defender.name} and hits for ${damage} damage!`);
        defender.health -= damage;
        if (defender.health < 0) {
            output.warning(`${defender.name} has been defeated and ${attacker.name} receives ${defender.experience} experience and ${defender.gold} gold`);
            attacker.experience += defender.experience;
            attacker.gold += defender.gold;
            this.map.monsters.delete(defender);
        }
    }
    processPlayerRangedAttack(defender) {
        var _a, _b;
        // base 40% chance to hit
        // 10% bonus / penalty for every point difference between attack and defense
        // bottoms out at 5% - always SOME chance to hit
        const attacker = this.map.player.thing;
        if (!attacker.rangedWeapon) {
            throw new Error("Player has no ranged weapon equipped");
        }
        const bonus = (attacker.rangedAttack - defender.defense) * .1;
        const hitChance = Math.min(Math.max(.6 + bonus, .05), .95);
        const hit = rand.chance(this.rng, hitChance);
        const weapon = attacker.rangedWeapon;
        const attackVerb = weapon.verb ? weapon.verb : "attacks";
        attacker.action -= weapon.action;
        if (!hit) {
            output.warning(`${attacker.name} ${attackVerb} ${defender.name} but misses!`);
            return;
        }
        // hit - calculate damage
        const damage = (_b = (_a = attacker.rangedDamage) === null || _a === void 0 ? void 0 : _a.roll(this.rng)) !== null && _b !== void 0 ? _b : 0;
        output.warning(`${attacker.name} ${attackVerb} ${defender.name} and hits for ${damage} damage!`);
        defender.health -= damage;
        if (defender.health < 0) {
            output.warning(`${defender.name} has been defeated and ${attacker.name} receives ${defender.experience} experience`);
            attacker.experience += defender.experience;
            this.map.monsters.delete(defender);
        }
    }
    processMonsterAttack(attacker, attack) {
        // base 60% chance to hit
        // 10% bonus / penalty for every point difference between attack and defense
        // clamps to out at [5, 95] - always SOME chance to hit or miss
        // choose an attack from repertoire of monster
        const defender = this.map.player.thing;
        const bonus = (attack.attack - defender.defense) * .1;
        const hitChance = Math.max(.6 + bonus, .05);
        const hit = rand.chance(this.rng, hitChance);
        const attackVerb = attack.verb ? attack.verb : "attacks";
        attacker.action -= attack.action;
        if (!hit) {
            output.warning(`${attacker.name} ${attackVerb} ${defender.name} but misses!`);
            return;
        }
        // hit - calculate damage
        const damage = attack.damage.roll(this.rng);
        output.warning(`${attacker.name} ${attackVerb} ${defender.name} and hits for ${damage} damage!`);
        defender.health -= damage;
        if (defender.health <= 0) {
            output.warning(`${defender.name} has been defeated!`);
            clearState();
            this.defeatDialog.show();
        }
    }
    updateMonsterStates() {
        for (const monster of this.map.monsters) {
            this.updateMonsterState(monster);
        }
    }
    updateMonsterState(placedMonster) {
        // aggro state
        const map = this.map;
        let { position, thing: monster } = placedMonster;
        const los = hasLineOfSight(map, position, map.player.position);
        if (monster.state !== rl.MonsterState.aggro && los) {
            monster.action = 0;
            monster.state = rl.MonsterState.aggro;
        }
        if (monster.state === rl.MonsterState.aggro && !los) {
            monster.action = 0;
            monster.state = rl.MonsterState.idle;
        }
    }
    tickMonster(monsterPosition, monster) {
        // if player is within reach (and alive), attack
        let { position: playerPosition, thing: player } = this.map.player;
        // first attempt to attack
        if (player.health > 0) {
            const distanceToPlayer = geo.calcManhattenDist(playerPosition, monsterPosition);
            const attacks = monster.attacks.filter(a => a.range >= distanceToPlayer);
            if (attacks.length > 0) {
                const attack = rand.choose(this.rng, attacks);
                this.processMonsterAttack(monster, attack);
                return;
            }
        }
        // determine whether monster can see player
        // seek and destroy
        const map = this.map;
        const path = maps.findPath(map, monsterPosition, playerPosition);
        if (path.length === 0) {
            // pass
            monster.action = 0;
            return;
        }
        const position = path[0];
        if (map.isPassable(position)) {
            this.animations.insert(monster, monsterPosition, position, App.moveAnimationDuration);
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
        const inp = this.inp;
        // target
        if (this.cursorPosition && (inp.pressed("Enter" /* Enter */) || inp.pressed(" "))) {
            this.handleCursorTarget();
            inp.flush();
            return;
        }
        // ctrl-key cursor movement
        if (this.handleCursorKeyboardMovement()) {
            inp.flush();
            return;
        }
        if (this.handlePlayerKeyboardMovement()) {
            inp.flush();
            return;
        }
        // click on object
        if (this.handleClick()) {
            inp.flush();
            return;
        }
        // mouse/touch movement
        if (this.handlePlayerMouseMovement()) {
            inp.flush();
            return;
        }
        inp.flush();
    }
    handleCursorKeyboardMovement() {
        const inp = this.inp;
        if (!inp.held("Control" /* Control */)) {
            return false;
        }
        const { position: playerPosition, thing: player } = this.map.player;
        if (!this.cursorPosition) {
            this.cursorPosition = playerPosition.clone();
        }
        if (inp.held("w") || inp.held("W") || inp.held("ArrowUp")) {
            this.handleCursorMove(0 /* North */);
            return true;
        }
        if (inp.held("s") || inp.held("S") || inp.held("ArrowDown")) {
            this.handleCursorMove(1 /* South */);
            return true;
        }
        if (inp.held("a") || inp.held("A") || inp.held("ArrowLeft")) {
            this.handleCursorMove(3 /* West */);
            return true;
        }
        if (inp.held("d") || inp.held("D") || inp.held("ArrowRight")) {
            this.handleCursorMove(2 /* East */);
            return true;
        }
        return true;
    }
    handleClick() {
        var _a, _b;
        // determine the map coordinates the user clicked on
        const inp = this.inp;
        if (!inp.mouseLeftReleased) {
            return false;
        }
        if (this.handleTargetCommandClick()) {
            return true;
        }
        const mxy = this.canvasToMapPoint(new geo.Point(inp.mouseX, inp.mouseY));
        const map = this.map;
        const { position: playerPosition, thing: player } = this.map.player;
        const clickFixture = map.fixtureAt(mxy);
        if (clickFixture && clickFixture instanceof rl.Door) {
            this.handleOpen(clickFixture);
            return true;
        }
        else if (clickFixture) {
            output.info(`You see ${clickFixture.name}`);
            return true;
        }
        const clickMonster = map.monsterAt(mxy);
        // first, try melee
        if (clickMonster) {
            const dist = geo.calcManhattenDist(playerPosition, mxy);
            const meleeWeapon = (_a = player.meleeWeapon) !== null && _a !== void 0 ? _a : things.fists;
            const rangedWeapon = (_b = player.rangedWeapon) !== null && _b !== void 0 ? _b : things.fists;
            if (dist <= meleeWeapon.range) {
                this.processPlayerMeleeAttack(clickMonster);
                return true;
            }
            if (dist <= rangedWeapon.range) {
                this.processPlayerRangedAttack(clickMonster);
                return true;
            }
            output.info(`You see ${clickMonster.name}`);
            return true;
        }
        return false;
    }
    handlePlayerKeyboardMovement() {
        let inp = this.inp;
        if (this.handlePlayerKeyboardRunInto()) {
            return true;
        }
        if (inp.held("w") || inp.held("W") || inp.held("ArrowUp")) {
            this.handleMove(0 /* North */);
            return true;
        }
        if (inp.held("s") || inp.held("S") || inp.held("ArrowDown")) {
            this.handleMove(1 /* South */);
            return true;
        }
        if (inp.held("a") || inp.held("A") || inp.held("ArrowLeft")) {
            this.handleMove(3 /* West */);
            return true;
        }
        if (inp.held("d") || inp.held("D") || inp.held("ArrowRight")) {
            this.handleMove(2 /* East */);
            return true;
        }
        return false;
    }
    handlePlayerKeyboardRunInto() {
        let inp = this.inp;
        if (inp.pressed("w") || inp.pressed("W") || inp.pressed("ArrowUp")) {
            this.handleRunInto(0 /* North */);
            return true;
        }
        if (inp.pressed("s") || inp.pressed("S") || inp.pressed("ArrowDown")) {
            this.handleRunInto(1 /* South */);
            return true;
        }
        if (inp.pressed("a") || inp.pressed("A") || inp.pressed("ArrowLeft")) {
            this.handleRunInto(3 /* West */);
            return true;
        }
        if (inp.pressed("d") || inp.pressed("D") || inp.pressed("ArrowRight")) {
            this.handleRunInto(2 /* East */);
            return true;
        }
        if (inp.pressed(" ")) {
            output.info("Pass");
            const player = this.map.player.thing;
            player.actionReserve += player.action;
            player.action = 0;
            return true;
        }
        return false;
    }
    handlePlayerMouseMovement() {
        const inp = this.inp;
        if (!inp.mouseLeftHeld) {
            return false;
        }
        const playerPosition = this.map.player.position;
        const mxy = this.canvasToMapPoint(new geo.Point(inp.mouseX, inp.mouseY));
        const dxy = mxy.subPoint(playerPosition);
        const sgn = dxy.sign();
        const abs = dxy.abs();
        if (abs.x > 0 && abs.x >= abs.y) {
            this.handleMove(sgn.x > 0 ? 2 /* East */ : 3 /* West */);
            return true;
        }
        if (abs.y > 0 && abs.y > abs.x) {
            this.handleMove(sgn.y > 0 ? 1 /* South */ : 0 /* North */);
            return true;
        }
        return false;
    }
    handleOpen(door) {
        output.info(`${door.name} opened`);
        this.map.fixtures.delete(door);
        this.map.player.thing.action -= 1;
    }
    handleMove(dir) {
        // clear cursor on movement
        this.cursorPosition = undefined;
        const { position: playerPosition, thing: player } = this.map.player;
        let newPosition = playerPosition.addPoint(directionVector(dir));
        if (!this.map.inBounds(newPosition)) {
            return;
        }
        if (!this.map.isPassable(newPosition)) {
            return;
        }
        this.animations.insert(player, playerPosition, newPosition, App.moveAnimationDuration);
    }
    handleRunInto(dir) {
        // clear cursor on movement
        this.cursorPosition = undefined;
        const { position: playerPosition, thing: player } = this.map.player;
        let targetPosition = playerPosition.addPoint(directionVector(dir));
        if (!this.map.inBounds(targetPosition)) {
            return;
        }
        const map = this.map;
        const monster = map.monsterAt(targetPosition);
        if (monster) {
            this.processPlayerMeleeAttack(monster);
            return;
        }
        const container = map.containerAt(targetPosition);
        if (container) {
            this.containerDialog.show(map, container);
            return;
        }
        const fixture = map.fixtureAt(targetPosition);
        if (fixture instanceof rl.Door) {
            this.handleOpen(fixture);
            return;
        }
        else if (fixture && !fixture.passable) {
            output.info(`Can't move that way, blocked by ${fixture.name}`);
            return;
        }
        const exit = map.exitAt(targetPosition);
        if (exit) {
            player.action -= 1;
            map.player.position = targetPosition;
            this.handleExit(exit.direction);
            return;
        }
    }
    handleCursorMove(dir) {
        if (!this.cursorPosition) {
            return;
        }
        // clear cursor on movement
        let newPosition = this.cursorPosition.addPoint(directionVector(dir));
        if (!this.map.inBounds(newPosition)) {
            return;
        }
        this.cursorAnimation = new Animation(this.cursorPosition, newPosition, this.time, App.cursorAnimationDuration);
        return;
    }
    handleCursorTarget() {
        const cursorPosition = this.cursorPosition;
        if (!cursorPosition) {
            return;
        }
        const map = this.map;
        const tile = map.tileAt(cursorPosition);
        if (!tile) {
            output.info('Nothing here');
            return;
        }
        if (map.visibilityAt(cursorPosition) !== maps.Visibility.Visible) {
            output.info(`Target not visible`);
            return;
        }
        const { position: playerPosition, thing: player } = this.map.player;
        const distToTarget = geo.calcManhattenDist(playerPosition, cursorPosition);
        const monster = map.monsterAt(cursorPosition);
        if (monster && distToTarget <= 1) {
            this.processPlayerMeleeAttack(monster);
            return;
        }
        if (monster && distToTarget > 1 && player.rangedWeapon) {
            this.processPlayerRangedAttack(monster);
            return;
        }
        const container = map.containerAt(cursorPosition);
        if (container && distToTarget <= 1) {
            this.containerDialog.show(map, container);
            return;
        }
        const fixture = map.fixtureAt(cursorPosition);
        if (fixture instanceof rl.Door && distToTarget <= 1) {
            output.info(`${fixture.name} opened`);
            this.map.fixtures.delete(fixture);
            player.action -= 1;
            return;
        }
        // lastly - perform a look
        for (const th of this.map.at(cursorPosition)) {
            output.info(`You see ${th.name}`);
        }
    }
    handleTargetCommandClick() {
        if (!this.inp.mouseLeftReleased) {
            return false;
        }
        if (this.targetCommand === TargetCommand.None) {
            return false;
        }
        const cxy = new geo.Point(this.inp.mouseX, this.inp.mouseY);
        const mxy = this.canvasToMapPoint(cxy);
        if (!hasLineOfSight(this.map, this.map.player.position, mxy)) {
            output.error(`Can't see!`);
            return true;
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
                    else {
                        output.info("Nothing to attack here.");
                    }
                }
                break;
            case TargetCommand.Shoot:
                {
                    const monster = this.map.monsterAt(mxy);
                    if (monster) {
                        this.processPlayerRangedAttack(monster);
                    }
                    else {
                        output.info("Nothing to shoot here.");
                    }
                }
                break;
        }
        this.targetCommand = TargetCommand.None;
        return true;
    }
    updateVisibility() {
        // update visibility around player
        // limit radius to visible viewport area
        const viewportLightRadius = Math.max(Math.ceil(this.canvas.width / this.tileSize), Math.ceil(this.canvas.height / this.tileSize));
        this.map.updateVisible(viewportLightRadius);
    }
    calcMapViewport() {
        const aabb = new geo.AABB(this.canvasToMapPoint(new geo.Point(0, 0)), this.canvasToMapPoint(new geo.Point(this.canvas.width + this.tileSize, this.canvas.height + this.tileSize)))
            .intersection(new geo.AABB(new geo.Point(0, 0), new geo.Point(this.map.width, this.map.height)));
        return aabb;
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
        this.shootButton.disabled = !this.map.player.thing.rangedWeapon;
        const map = this.map;
        const tiles = map.tiles.within(viewportAABB);
        const fixtures = map.fixtures.within(viewportAABB);
        const exits = map.exits.within(viewportAABB);
        const containers = map.containers.within(viewportAABB);
        const monsters = map.monsters.within(viewportAABB);
        for (const tile of tiles) {
            this.drawThing(offset, tile);
        }
        for (const fixture of fixtures) {
            this.drawThing(offset, fixture);
        }
        for (const exit of exits) {
            this.drawThing(offset, exit);
        }
        for (const container of containers) {
            this.drawThing(offset, container);
        }
        for (const creature of monsters) {
            this.drawThing(offset, creature);
        }
        this.drawThing(offset, this.map.player);
        this.drawHealthBar(offset, this.map.player);
        this.drawCursor(offset);
        this.renderer.flush();
    }
    drawThing(offset, placedThing) {
        var _a;
        const { position, thing } = placedThing;
        const visible = this.map.visibilityAt(position);
        const seen = this.map.seenAt(position);
        const fog = (visible === maps.Visibility.None || visible === maps.Visibility.Dark)
            && seen
            && (thing instanceof rl.Tile || thing instanceof rl.Fixture);
        if ((visible === maps.Visibility.None || visible == maps.Visibility.Dark) && !fog) {
            return;
        }
        const color = thing.color.clone();
        if (fog) {
            color.a = .25;
        }
        this.drawImage(offset, (_a = this.animations.position(thing)) !== null && _a !== void 0 ? _a : position, thing.image, color);
    }
    drawCursor(offset) {
        var _a, _b;
        if (!this.cursorPosition) {
            return;
        }
        const position = (_b = (_a = this.cursorAnimation) === null || _a === void 0 ? void 0 : _a.position) !== null && _b !== void 0 ? _b : this.cursorPosition;
        this.drawImage(offset, position, "./assets/cursor.png", gfx.Color.red);
    }
    drawImage(offset, position, image, color = gfx.Color.white) {
        const spritePosition = position.mulScalar(this.tileSize).addPoint(offset);
        const layer = this.imageMap.get(image);
        if (layer === undefined) {
            throw new Error(`Missing image mapping: ${image}`);
        }
        const sprite = new gfx.Sprite({
            position: spritePosition,
            color,
            width: this.tileSize,
            height: this.tileSize,
            texture: this.texture,
            layer: layer,
            flags: gfx.SpriteFlags.ArrayTexture
        });
        this.renderer.drawSprite(sprite);
    }
    drawHealthBar(offset, placedCreature) {
        const { position, thing: creature } = placedCreature;
        const health = Math.max(creature.health, 0);
        const borderWidth = health * 4 + 2;
        const interiorWidth = health * 4;
        const spritePosition = position.mulScalar(this.tileSize).addPoint(offset).subPoint(new geo.Point(0, this.tileSize / 2));
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
    get tileSize() {
        return rl.tileSize * this.zoom;
    }
    handleKeyDown(ev) {
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
            // case "L": {
            //     this.levelDialog.show()
            // }
            //     break
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
                this.cursorPosition = undefined;
                break;
            case "ENTER":
                if (ev.ctrlKey && this.map.player.thing.rangedWeapon) {
                    this.targetCommand = TargetCommand.Shoot;
                }
                else {
                    this.targetCommand = TargetCommand.Attack;
                }
                break;
            case "ESCAPE":
                this.targetCommand = TargetCommand.None;
                this.cursorPosition = undefined;
                break;
            case "=":
                this.zoom = Math.min(this.zoom * 2, 16);
                this.updateVisibility();
                break;
            case "-":
                this.zoom = Math.max(this.zoom / 2, .125);
                this.updateVisibility();
                break;
        }
    }
    saveState() {
        // save the current game state
        var state = {
            rng: this.rng.save(),
            floor: this.floor,
        };
        const jsonState = JSON.stringify(state);
        localStorage.setItem(STORAGE_KEY, jsonState);
        this.saveMap();
    }
    saveMap() {
        const state = this.map.save();
        const jsonState = JSON.stringify(state);
        localStorage.setItem(`${STORAGE_KEY}_MAP_${this.floor}`, jsonState);
    }
    async handleExit(dir) {
        var _a;
        if (dir == rl.ExitDirection.Up && this.floor == 1) {
            this.shopDialog.show();
            return;
        }
        // remove player from floor, save floor
        const player = this.map.player.thing;
        this.map.players.delete(player);
        this.saveMap();
        switch (dir) {
            case rl.ExitDirection.Up:
                this.floor -= 1;
                break;
            case rl.ExitDirection.Down:
                this.floor += 1;
                break;
        }
        this.map = (_a = loadMap(this.floor)) !== null && _a !== void 0 ? _a : gen.generateDungeonLevel(this.rng, things.db, this.floor);
        const placeDir = dir === rl.ExitDirection.Up ? rl.ExitDirection.Down : rl.ExitDirection.Up;
        placePlayerAtExit(this.map, player, placeDir);
        const [texture, imageMap] = await loadImages(this.renderer, this.map);
        this.texture = texture;
        this.imageMap = imageMap;
        this.updateVisibility();
    }
    static async load(renderer) {
        const json = localStorage.getItem(STORAGE_KEY);
        if (!json) {
            return null;
        }
        const state = JSON.parse(json);
        const rng = new rand.SFC32RNG(...state.rng);
        const map = loadMap(state.floor);
        if (!map) {
            throw new Error("Failed to load map!");
        }
        const [texture, imageMap] = await loadImages(renderer, map);
        const app = new App(rng, renderer, state.floor, map, texture, imageMap);
        return app;
    }
}
App.cursorAnimationDuration = 125;
App.moveAnimationDuration = 250;
async function loadImages(renderer, map) {
    // bake all 24x24 tile images to a single array texture
    // store mapping from image url to index
    const imageUrls = iter.wrap(map.things()).map(th => th.image).filter().distinct().toArray();
    imageUrls.push("./assets/cursor.png");
    const imageMap = new Map(imageUrls.map((url, i) => [url, i]));
    const images = await Promise.all(imageUrls.map(url => dom.loadImage(url)));
    const texture = renderer.bakeTextureArray(rl.tileSize, rl.tileSize, images);
    return [texture, imageMap];
}
function loadMap(floor) {
    const json = localStorage.getItem(`${STORAGE_KEY}_MAP_${floor}`);
    if (!json) {
        return null;
    }
    const state = JSON.parse(json);
    const map = maps.Map.load(things.db, state);
    return map;
}
function clearState() {
    const keys = new Array();
    for (let i = 0; i < localStorage.length; ++i) {
        const key = localStorage.key(i);
        if (key === null || key === void 0 ? void 0 : key.startsWith(STORAGE_KEY)) {
            keys.push(key);
        }
    }
    for (const k of keys) {
        localStorage.removeItem(k);
    }
}
function placePlayerAtExit(map, player, dir) {
    const exit = iter.find(map.exits, x => x.thing.direction == dir);
    if (!exit) {
        throw new Error("Failed to place player, no suitable exit was found");
    }
    // // find an empty cell near the exit
    // const playerPosition = iter.find(maps.visitNeighbors(exit.position, map.width, map.height), x => map.isPassable(x))
    // if (!playerPosition) {
    //     throw new Error("Failed to place player, no passable tile near exit")
    // }
    map.players.set(exit.position, player);
}
async function init() {
    const app = await App.create();
    app.exec();
}
init();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBQ2pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUV6QyxNQUFNLFdBQVcsR0FBRyxlQUFlLENBQUE7QUFTbkMsTUFBTSxTQUFTO0lBSVgsWUFDcUIsYUFBd0IsRUFDeEIsV0FBc0IsRUFDdEIsU0FBOEIsRUFDOUIsUUFBNkI7UUFIN0Isa0JBQWEsR0FBYixhQUFhLENBQVc7UUFDeEIsZ0JBQVcsR0FBWCxXQUFXLENBQVc7UUFDdEIsY0FBUyxHQUFULFNBQVMsQ0FBcUI7UUFDOUIsYUFBUSxHQUFSLFFBQVEsQ0FBcUI7UUFDOUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxhQUFhLENBQUE7UUFDOUIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7SUFDdEIsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUF5QjtRQUM1QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxN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Li9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgaXRlciBmcm9tIFwiLi4vc2hhcmVkL2l0ZXIuanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuaW1wb3J0ICogYXMgZ2VuIGZyb20gXCIuL2dlbi5qc1wiXHJcbmltcG9ydCAqIGFzIGlucHV0IGZyb20gXCIuLi9zaGFyZWQvaW5wdXQuanNcIlxyXG5pbXBvcnQgKiBhcyBybCBmcm9tIFwiLi9ybC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgb3V0cHV0IGZyb20gXCIuL291dHB1dC5qc1wiXHJcbmltcG9ydCAqIGFzIHRoaW5ncyBmcm9tIFwiLi90aGluZ3MuanNcIlxyXG5pbXBvcnQgKiBhcyBtYXBzIGZyb20gXCIuL21hcHMuanNcIlxyXG5pbXBvcnQgKiBhcyByYW5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiXHJcbmltcG9ydCAqIGFzIG1hdGggZnJvbSBcIi4uL3NoYXJlZC9tYXRoLmpzXCJcclxuXHJcbmNvbnN0IFNUT1JBR0VfS0VZID0gXCJjcmF3bF9zdG9yYWdlXCJcclxuXHJcbmNvbnN0IGVudW0gRGlyZWN0aW9uIHtcclxuICAgIE5vcnRoLFxyXG4gICAgU291dGgsXHJcbiAgICBFYXN0LFxyXG4gICAgV2VzdFxyXG59XHJcblxyXG5jbGFzcyBBbmltYXRpb24ge1xyXG4gICAgcHJpdmF0ZSBfcG9zaXRpb246IGdlby5Qb2ludFxyXG4gICAgcHJpdmF0ZSBfZG9uZTogYm9vbGVhblxyXG5cclxuICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgc3RhcnRQb3NpdGlvbjogZ2VvLlBvaW50LFxyXG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgZW5kUG9zaXRpb246IGdlby5Qb2ludCxcclxuICAgICAgICBwcml2YXRlIHJlYWRvbmx5IHN0YXJ0VGltZTogRE9NSGlnaFJlc1RpbWVTdGFtcCxcclxuICAgICAgICBwcml2YXRlIHJlYWRvbmx5IGR1cmF0aW9uOiBET01IaWdoUmVzVGltZVN0YW1wKSB7XHJcbiAgICAgICAgdGhpcy5fcG9zaXRpb24gPSBzdGFydFBvc2l0aW9uXHJcbiAgICAgICAgdGhpcy5fZG9uZSA9IGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlKHRpbWU6IERPTUhpZ2hSZXNUaW1lU3RhbXApIHtcclxuICAgICAgICBjb25zdCB0ID0gbWF0aC5jbGFtcChtYXRoLnVubGVycCh0aGlzLnN0YXJ0VGltZSwgdGhpcy5zdGFydFRpbWUgKyB0aGlzLmR1cmF0aW9uLCB0aW1lKSwgMCwgMSlcclxuICAgICAgICB0aGlzLl9wb3NpdGlvbiA9IGdlby5sZXJwKHRoaXMuc3RhcnRQb3NpdGlvbiwgdGhpcy5lbmRQb3NpdGlvbiwgdClcclxuICAgICAgICB0aGlzLl9kb25lID0gdCA+PSAxXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHBvc2l0aW9uKCk6IGdlby5Qb2ludCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Bvc2l0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGRvbmUoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RvbmVcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQW5pbWF0aW9ucyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFuaW1hdGlvbnMgPSBuZXcgTWFwPHJsLlRoaW5nLCBBbmltYXRpb24+KClcclxuICAgIHByaXZhdGUgdGltZTogRE9NSGlnaFJlc1RpbWVTdGFtcCA9IDBcclxuXHJcbiAgICBpbnNlcnQodGg6IHJsLlRoaW5nLCBzdGFydFBvc2l0aW9uOiBnZW8uUG9pbnQsIGVuZFBvc2l0aW9uOiBnZW8uUG9pbnQsIGR1cmF0aW9uOiBET01IaWdoUmVzVGltZVN0YW1wKSB7XHJcbiAgICAgICAgdGhpcy5hbmltYXRpb25zLnNldCh0aCwgbmV3IEFuaW1hdGlvbihzdGFydFBvc2l0aW9uLCBlbmRQb3NpdGlvbiwgdGhpcy50aW1lLCBkdXJhdGlvbikpXHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlKHRpbWU6IERPTUhpZ2hSZXNUaW1lU3RhbXApIHtcclxuICAgICAgICBmb3IgKGNvbnN0IGFuaW0gb2YgdGhpcy5hbmltYXRpb25zLnZhbHVlcygpKSB7XHJcbiAgICAgICAgICAgIGFuaW0udXBkYXRlKHRpbWUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRpbWUgPSB0aW1lXHJcbiAgICB9XHJcblxyXG4gICAgcG9zaXRpb24odGg6IHJsLlRoaW5nKTogZ2VvLlBvaW50IHwgdW5kZWZpbmVkIHtcclxuICAgICAgICBjb25zdCBhbmltID0gdGhpcy5hbmltYXRpb25zLmdldCh0aClcclxuICAgICAgICByZXR1cm4gYW5pbT8ucG9zaXRpb25cclxuICAgIH1cclxuXHJcbiAgICAqcHJvY2Vzc0RvbmUoKTogR2VuZXJhdG9yPFtybC5UaGluZywgQW5pbWF0aW9uXT4ge1xyXG4gICAgICAgIGZvciAoY29uc3QgW3RoLCBhbmltXSBvZiB0aGlzLmFuaW1hdGlvbnMpIHtcclxuICAgICAgICAgICAgeWllbGQgW3RoLCBhbmltXVxyXG4gICAgICAgICAgICBpZiAoYW5pbS5kb25lKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFuaW1hdGlvbnMuZGVsZXRlKHRoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBzaXplKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5pbWF0aW9ucy5zaXplXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpcmVjdGlvblZlY3RvcihkaXI6IERpcmVjdGlvbik6IGdlby5Qb2ludCB7XHJcbiAgICBzd2l0Y2ggKGRpcikge1xyXG4gICAgICAgIGNhc2UgRGlyZWN0aW9uLk5vcnRoOlxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgwLCAtMSlcclxuICAgICAgICBjYXNlIERpcmVjdGlvbi5Tb3V0aDpcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMCwgMSlcclxuICAgICAgICBjYXNlIERpcmVjdGlvbi5FYXN0OlxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgxLCAwKVxyXG4gICAgICAgIGNhc2UgRGlyZWN0aW9uLldlc3Q6XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KC0xLCAwKVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtb2RhbEJhY2tncm91bmQgPSBkb20uYnlJZChcIm1vZGFsQmFja2dyb3VuZFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGVsZW06IEhUTUxFbGVtZW50LCBwcml2YXRlIHJlYWRvbmx5IGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHsgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5tb2RhbEJhY2tncm91bmQuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmVsZW0uaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmVsZW0uZm9jdXMoKVxyXG4gICAgfVxyXG5cclxuICAgIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5tb2RhbEJhY2tncm91bmQuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuZWxlbS5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgdGhpcy5jYW52YXMuZm9jdXMoKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBoaWRkZW4oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZWxlbS5oaWRkZW5cclxuICAgIH1cclxuXHJcbiAgICB0b2dnbGUoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZWxlbS5oaWRkZW4pIHtcclxuICAgICAgICAgICAgdGhpcy5zaG93KClcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU3RhdHNEaWFsb2cgZXh0ZW5kcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBvcGVuQnV0dG9uID0gZG9tLmJ5SWQoXCJzdGF0c0J1dHRvblwiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwic3RhdHNDbG9zZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXIsIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICBzdXBlcihkb20uYnlJZChcInN0YXRzRGlhbG9nXCIpLCBjYW52YXMpXHJcblxyXG4gICAgICAgIHRoaXMub3BlbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy50b2dnbGUoKSlcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgZXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkVTQ0FQRVwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgY29uc3QgaGVhbHRoU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNIZWFsdGhcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3Qgc3RyZW5ndGhTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c1N0cmVuZ3RoXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGFnaWxpdHlTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0FnaWxpdHlcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgaW50ZWxsaWdlbmNlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNJbnRlbGxpZ2VuY2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgYXR0YWNrU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNBdHRhY2tcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZGFtYWdlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNEYW1hZ2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZGVmZW5zZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRGVmZW5zZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBsZXZlbFNwYW4gPSBkb20uYnlJZChcInN0YXRzTGV2ZWxcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZXhwZXJpZW5jZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRXhwZXJpZW5jZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBnb2xkU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNHb2xkXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGV4cGVyaWVuY2VSZXF1aXJlbWVudCA9IHJsLmdldEV4cGVyaWVuY2VSZXF1aXJlbWVudChwbGF5ZXIubGV2ZWwgKyAxKVxyXG5cclxuICAgICAgICBoZWFsdGhTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmhlYWx0aH0gLyAke3BsYXllci5tYXhIZWFsdGh9YFxyXG4gICAgICAgIHN0cmVuZ3RoU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5zdHJlbmd0aH1gXHJcbiAgICAgICAgYWdpbGl0eVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuYWdpbGl0eX1gXHJcbiAgICAgICAgaW50ZWxsaWdlbmNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5pbnRlbGxpZ2VuY2V9YFxyXG4gICAgICAgIGF0dGFja1NwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIubWVsZWVBdHRhY2t9IC8gJHtwbGF5ZXIucmFuZ2VkV2VhcG9uID8gcGxheWVyLnJhbmdlZEF0dGFjayA6IFwiTkFcIn1gXHJcbiAgICAgICAgZGFtYWdlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5tZWxlZURhbWFnZX0gLyAke3BsYXllci5yYW5nZWREYW1hZ2UgPyBwbGF5ZXIucmFuZ2VkRGFtYWdlIDogXCJOQVwifWBcclxuICAgICAgICBkZWZlbnNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5kZWZlbnNlfWBcclxuICAgICAgICBhZ2lsaXR5U3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5hZ2lsaXR5fWBcclxuICAgICAgICBsZXZlbFNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIubGV2ZWx9YFxyXG4gICAgICAgIGV4cGVyaWVuY2VTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmV4cGVyaWVuY2V9IC8gJHtleHBlcmllbmNlUmVxdWlyZW1lbnR9YFxyXG4gICAgICAgIGdvbGRTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmdvbGR9YFxyXG5cclxuICAgICAgICBzdXBlci5zaG93KClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgSW52ZW50b3J5RGlhbG9nIGV4dGVuZHMgRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgb3BlbkJ1dHRvbiA9IGRvbS5ieUlkKFwiaW52ZW50b3J5QnV0dG9uXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGluZm9EaXYgPSBkb20uYnlJZChcImludmVudG9yeUluZm9cIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZW1wdHlEaXYgPSBkb20uYnlJZChcImludmVudG9yeUVtcHR5XCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRhYmxlID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlUYWJsZVwiKSBhcyBIVE1MVGFibGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwiaW52ZW50b3J5SXRlbVRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbmV4dFBhZ2VCdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeU5leHRQYWdlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHByZXZQYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlQcmV2UGFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwiaW52ZW50b3J5Q2xvc2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFnZVNpemU6IG51bWJlciA9IDlcclxuICAgIHByaXZhdGUgcGFnZUluZGV4OiBudW1iZXIgPSAwXHJcbiAgICBwcml2YXRlIHNlbGVjdGVkSW5kZXg6IG51bWJlciA9IC0xXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHN1cGVyKGRvbS5ieUlkKFwiaW52ZW50b3J5RGlhbG9nXCIpLCBjYW52YXMpXHJcbiAgICAgICAgdGhpcy5vcGVuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnRvZ2dsZSgpKVxyXG4gICAgICAgIHRoaXMuY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuaGlkZSgpKVxyXG5cclxuICAgICAgICB0aGlzLm5leHRQYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMubmV4dFBhZ2UoKVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMucHJldlBhZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5wcmV2UGFnZSgpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5lbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGV2ID0+IHtcclxuICAgICAgICAgICAgY29uc3Qga2V5ID0gZXYua2V5LnRvVXBwZXJDYXNlKClcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBwYXJzZUludChldi5rZXkpXHJcblxyXG4gICAgICAgICAgICBpZiAoaW5kZXggJiYgaW5kZXggPiAwICYmIGluZGV4IDw9IDkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IGluZGV4IC0gMVxyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJVXCIgJiYgdGhpcy5zZWxlY3RlZEluZGV4ID49IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudXNlKHRoaXMuc2VsZWN0ZWRJbmRleClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFXCIgJiYgdGhpcy5zZWxlY3RlZEluZGV4ID49IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXF1aXAodGhpcy5zZWxlY3RlZEluZGV4KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlJcIiAmJiB0aGlzLnNlbGVjdGVkSW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUodGhpcy5zZWxlY3RlZEluZGV4KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkRcIiAmJiB0aGlzLnNlbGVjdGVkSW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kcm9wKHRoaXMuc2VsZWN0ZWRJbmRleClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJBUlJPV0RPV05cIiB8fCBrZXkgPT09IFwiU1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRJdGVtKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJBUlJPV1VQXCIgfHwga2V5ID09PSBcIldcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2SXRlbSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiUEFHRURPV05cIiB8fCBrZXkgPT09IFwiTlwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRQYWdlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJQQUdFVVBcIiB8fCBrZXkgPT09IFwiUFwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByZXZQYWdlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFU0NBUEVcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LXVzZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGV2LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5nZXRSb3dJbmRleChldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpXHJcbiAgICAgICAgICAgIHRoaXMudXNlKGluZGV4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LWRyb3AtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZ2V0Um93SW5kZXgoZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50KVxyXG4gICAgICAgICAgICB0aGlzLmRyb3AoaW5kZXgpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKHRoaXMuZWxlbSwgXCJjbGlja1wiLCBcIi5pbnZlbnRvcnktZXF1aXAtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZ2V0Um93SW5kZXgoZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50KVxyXG4gICAgICAgICAgICB0aGlzLmVxdWlwKGluZGV4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LXJlbW92ZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGV2LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5nZXRSb3dJbmRleChldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpXHJcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKGluZGV4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaXRlbS1yb3dcIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IChldi50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgaWYgKHJvdykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Qocm93IGFzIEhUTUxUYWJsZVJvd0VsZW1lbnQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIG5leHRQYWdlKCkge1xyXG4gICAgICAgIHRoaXMucGFnZUluZGV4KytcclxuICAgICAgICB0aGlzLnBhZ2VJbmRleCA9IE1hdGgubWluKHRoaXMucGFnZUluZGV4LCBNYXRoLmNlaWwodGhpcy5wbGF5ZXIuaW52ZW50b3J5Lmxlbmd0aCAvIHRoaXMucGFnZVNpemUpIC0gMSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByZXZQYWdlKCkge1xyXG4gICAgICAgIHRoaXMucGFnZUluZGV4LS1cclxuICAgICAgICB0aGlzLnBhZ2VJbmRleCA9IE1hdGgubWF4KHRoaXMucGFnZUluZGV4LCAwKVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgbmV4dEl0ZW0oKSB7XHJcbiAgICAgICAgKyt0aGlzLnNlbGVjdGVkSW5kZXhcclxuICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSBNYXRoLm1pbih0aGlzLnNlbGVjdGVkSW5kZXgsIHRoaXMucGFnZVNpemUpXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcmV2SXRlbSgpIHtcclxuICAgICAgICAtLXRoaXMuc2VsZWN0ZWRJbmRleFxyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWF4KHRoaXMuc2VsZWN0ZWRJbmRleCwgLTEpXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIC8vIHNvcnQgaW52ZW50b3J5XHJcbiAgICAgICAgdGhpcy5wbGF5ZXIuaW52ZW50b3J5LnNvcnQoKGEsIGIpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgYWVxID0gdGhpcy5wbGF5ZXIuaXNFcXVpcHBlZChhKVxyXG4gICAgICAgICAgICBjb25zdCBiZXEgPSB0aGlzLnBsYXllci5pc0VxdWlwcGVkKGIpXHJcblxyXG4gICAgICAgICAgICBpZiAoYWVxID09PSBiZXEpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhLm5hbWUgPD0gYi5uYW1lID8gLTEgOiAxXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiAoYWVxID8gMSA6IDIpIC0gKGJlcSA/IDEgOiAyKVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgc3VwZXIuc2hvdygpXHJcbiAgICB9XHJcblxyXG4gICAgcmVmcmVzaCgpIHtcclxuICAgICAgICBjb25zdCB0Ym9keSA9IHRoaXMudGFibGUudEJvZGllc1swXVxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0Ym9keSlcclxuXHJcbiAgICAgICAgaWYgKHRoaXMucGxheWVyLmludmVudG9yeS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lbXB0eURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgICAgICB0aGlzLmluZm9EaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW1wdHlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgICAgICB0aGlzLmluZm9EaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBhZ2VDb3VudCA9IE1hdGguY2VpbCh0aGlzLnBsYXllci5pbnZlbnRvcnkubGVuZ3RoIC8gdGhpcy5wYWdlU2l6ZSlcclxuICAgICAgICB0aGlzLnBhZ2VJbmRleCA9IE1hdGgubWluKE1hdGgubWF4KDAsIHRoaXMucGFnZUluZGV4KSwgcGFnZUNvdW50IC0gMSlcclxuICAgICAgICB0aGlzLnByZXZQYWdlQnV0dG9uLmRpc2FibGVkID0gdGhpcy5wYWdlSW5kZXggPD0gMFxyXG4gICAgICAgIHRoaXMubmV4dFBhZ2VCdXR0b24uZGlzYWJsZWQgPSB0aGlzLnBhZ2VJbmRleCA+PSBwYWdlQ291bnQgLSAxXHJcblxyXG4gICAgICAgIHRoaXMuaW5mb0Rpdi50ZXh0Q29udGVudCA9IGBQYWdlICR7dGhpcy5wYWdlSW5kZXggKyAxfSBvZiAke3BhZ2VDb3VudH1gXHJcblxyXG4gICAgICAgIGNvbnN0IGl0ZW1zID0gaXRlci5wYWdlKHRoaXMucGxheWVyLmludmVudG9yeSwgdGhpcy5wYWdlSW5kZXgsIHRoaXMucGFnZVNpemUpXHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5taW4odGhpcy5zZWxlY3RlZEluZGV4LCBpdGVtcy5sZW5ndGggLSAxKVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBpdGVtc1tpXVxyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMuaXRlbVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgdHIgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbUluZGV4VGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1pbmRleFwiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtTmFtZVRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0tbmFtZVwiKVxyXG4gICAgICAgICAgICBjb25zdCBlcXVpcEJ1dHRvbiA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pbnZlbnRvcnktZXF1aXAtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHJlbW92ZUJ1dHRvbiA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pbnZlbnRvcnktcmVtb3ZlLWJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCB1c2VCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LXVzZS1idXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3QgZXF1aXBwZWQgPSB0aGlzLnBsYXllci5pc0VxdWlwcGVkKGl0ZW0pXHJcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBpdGVtIGluc3RhbmNlb2YgcmwuTGlnaHRTb3VyY2UgPyBgJHtlcXVpcHBlZCA/IFwiKiBcIiA6IFwiXCJ9JHtpdGVtLm5hbWV9ICgke2l0ZW0uZHVyYXRpb259KWAgOiBgJHtlcXVpcHBlZCA/IFwiKiBcIiA6IFwiXCJ9JHtpdGVtLm5hbWV9YFxyXG5cclxuICAgICAgICAgICAgaXRlbUluZGV4VGQudGV4dENvbnRlbnQgPSAoaSArIDEpLnRvU3RyaW5nKClcclxuICAgICAgICAgICAgaXRlbU5hbWVUZC50ZXh0Q29udGVudCA9IG5hbWVcclxuXHJcbiAgICAgICAgICAgIGlmICghKGl0ZW0gaW5zdGFuY2VvZiBybC5Vc2FibGUpKSB7XHJcbiAgICAgICAgICAgICAgICB1c2VCdXR0b24ucmVtb3ZlKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXJsLmlzRXF1aXBwYWJsZShpdGVtKSB8fCBlcXVpcHBlZCkge1xyXG4gICAgICAgICAgICAgICAgZXF1aXBCdXR0b24ucmVtb3ZlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFlcXVpcHBlZCkge1xyXG4gICAgICAgICAgICAgICAgcmVtb3ZlQnV0dG9uLnJlbW92ZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChpID09PSB0aGlzLnNlbGVjdGVkSW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIHRyLmNsYXNzTGlzdC5hZGQoXCJzZWxlY3RlZFwiKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0Ym9keS5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzZWxlY3Qoc2VsZWN0ZWRSb3c6IEhUTUxUYWJsZVJvd0VsZW1lbnQpIHtcclxuICAgICAgICBjb25zdCByb3dzID0gQXJyYXkuZnJvbSh0aGlzLmVsZW0ucXVlcnlTZWxlY3RvckFsbChcIi5pdGVtLXJvd1wiKSlcclxuICAgICAgICBmb3IgKGNvbnN0IHJvdyBvZiByb3dzKSB7XHJcbiAgICAgICAgICAgIHJvdy5jbGFzc0xpc3QucmVtb3ZlKFwic2VsZWN0ZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNlbGVjdGVkUm93LmNsYXNzTGlzdC5hZGQoXCJzZWxlY3RlZFwiKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0Um93SW5kZXgoZWxlbTogSFRNTEJ1dHRvbkVsZW1lbnQpIHtcclxuICAgICAgICBjb25zdCBpbmRleCA9IGRvbS5nZXRFbGVtZW50SW5kZXgoZWxlbS5jbG9zZXN0KFwiLml0ZW0tcm93XCIpIGFzIEhUTUxUYWJsZVJvd0VsZW1lbnQpXHJcbiAgICAgICAgcmV0dXJuIGluZGV4XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1c2UoaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGkgPSB0aGlzLnBhZ2VJbmRleCAqIHRoaXMucGFnZVNpemUgKyBpbmRleFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLnBsYXllci5pbnZlbnRvcnlbaV1cclxuICAgICAgICBpZiAoIShpdGVtIGluc3RhbmNlb2YgcmwuVXNhYmxlKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVzZUl0ZW0odGhpcy5wbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyb3AoaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGkgPSB0aGlzLnBhZ2VJbmRleCAqIHRoaXMucGFnZVNpemUgKyBpbmRleFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLnBsYXllci5pbnZlbnRvcnlbaV1cclxuICAgICAgICBkcm9wSXRlbSh0aGlzLnBsYXllciwgaXRlbSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZXF1aXAoaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGkgPSB0aGlzLnBhZ2VJbmRleCAqIHRoaXMucGFnZVNpemUgKyBpbmRleFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLnBsYXllci5pbnZlbnRvcnlbaV1cclxuICAgICAgICBpZiAoIXJsLmlzRXF1aXBwYWJsZShpdGVtKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGVxdWlwSXRlbSh0aGlzLnBsYXllciwgaXRlbSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVtb3ZlKGluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBpID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplICsgaW5kZXhcclxuICAgICAgICBjb25zdCBpdGVtID0gdGhpcy5wbGF5ZXIuaW52ZW50b3J5W2ldXHJcbiAgICAgICAgaWYgKCFybC5pc0VxdWlwcGFibGUoaXRlbSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZW1vdmVJdGVtKHRoaXMucGxheWVyLCBpdGVtKVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIENvbnRhaW5lckRpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpYWxvZzogRGlhbG9nXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG5hbWVTcGFuID0gZG9tLmJ5SWQoXCJjb250YWluZXJOYW1lXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwiY29udGFpbmVyQ2xvc2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdGFrZUFsbEJ1dHRvbiA9IGRvbS5ieUlkKFwiY29udGFpbmVyVGFrZUFsbEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXJUYWJsZSA9IGRvbS5ieUlkKFwiY29udGFpbmVyVGFibGVcIikgYXMgSFRNTFRhYmxlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXJJdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcImNvbnRhaW5lckl0ZW1UZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwcml2YXRlIG1hcDogbWFwcy5NYXAgfCBudWxsID0gbnVsbFxyXG4gICAgcHJpdmF0ZSBjb250YWluZXI6IHJsLkNvbnRhaW5lciB8IG51bGwgPSBudWxsXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IERpYWxvZyhkb20uYnlJZChcImNvbnRhaW5lckRpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgICAgIHRoaXMucGxheWVyID0gcGxheWVyXHJcbiAgICAgICAgdGhpcy5jbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5oaWRlKCkpXHJcbiAgICAgICAgdGhpcy50YWtlQWxsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnRha2VBbGwoKSlcclxuICAgICAgICBjb25zdCBlbGVtID0gdGhpcy5kaWFsb2cuZWxlbVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUoZWxlbSwgXCJjbGlja1wiLCBcIi5jb250YWluZXItdGFrZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBidG4gPSBldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KHJvdylcclxuICAgICAgICAgICAgdGhpcy50YWtlKGlkeClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCBldiA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoZXYua2V5KVxyXG4gICAgICAgICAgICBpZiAoaW5kZXggJiYgaW5kZXggPiAwICYmIGluZGV4IDw9IDkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFrZShpbmRleCAtIDEpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGV2ID0+IHtcclxuICAgICAgICAgICAgY29uc3Qga2V5ID0gZXYua2V5LnRvVXBwZXJDYXNlKClcclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFU0NBUEVcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFTlRFUlwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRha2VBbGwoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2hvdyhtYXA6IG1hcHMuTWFwLCBjb250YWluZXI6IHJsLkNvbnRhaW5lcikge1xyXG4gICAgICAgIHRoaXMubWFwID0gbWFwXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIgPSBjb250YWluZXJcclxuICAgICAgICB0aGlzLm5hbWVTcGFuLnRleHRDb250ZW50ID0gdGhpcy5jb250YWluZXIubmFtZVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgdGhpcy5kaWFsb2cuc2hvdygpXHJcbiAgICB9XHJcblxyXG4gICAgaGlkZSgpIHtcclxuICAgICAgICBpZiAodGhpcy5tYXAgJiYgdGhpcy5jb250YWluZXIgJiYgdGhpcy5jb250YWluZXIuaXRlbXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmNvbnRhaW5lcnMuZGVsZXRlKHRoaXMuY29udGFpbmVyKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIgPSBudWxsXHJcbiAgICAgICAgdGhpcy5kaWFsb2cuaGlkZSgpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGhpZGRlbigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kaWFsb2cuaGlkZGVuXHJcbiAgICB9XHJcblxyXG4gICAgcmVmcmVzaCgpIHtcclxuICAgICAgICBjb25zdCB0Ym9keSA9IHRoaXMuY29udGFpbmVyVGFibGUudEJvZGllc1swXVxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0Ym9keSlcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGl0ZW1zID0gZ2V0U29ydGVkSXRlbXModGhpcy5jb250YWluZXIuaXRlbXMpXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gaXRlbXNbaV1cclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0aGlzLmNvbnRhaW5lckl0ZW1UZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHRyID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLml0ZW0tcm93XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1JbmRleFRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0taW5kZXhcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLW5hbWVcIilcclxuICAgICAgICAgICAgaXRlbUluZGV4VGQudGV4dENvbnRlbnQgPSBgJHtpICsgMX1gXHJcbiAgICAgICAgICAgIGl0ZW1OYW1lVGQudGV4dENvbnRlbnQgPSBpdGVtLm5hbWVcclxuICAgICAgICAgICAgdGJvZHkuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRha2UoaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGlmICghdGhpcy5jb250YWluZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBpdGVtID0gdGhpcy5jb250YWluZXIuaXRlbXNbaW5kZXhdXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuaXRlbXMuc3BsaWNlKGluZGV4LCAxKVxyXG4gICAgICAgIHRoaXMucGxheWVyLmludmVudG9yeS5wdXNoKGl0ZW0pXHJcblxyXG4gICAgICAgIC8vIGhpZGUgaWYgdGhpcyB3YXMgdGhlIGxhc3QgaXRlbVxyXG4gICAgICAgIGlmICh0aGlzLmNvbnRhaW5lci5pdGVtcy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRha2VBbGwoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucGxheWVyLmludmVudG9yeS5wdXNoKC4uLnRoaXMuY29udGFpbmVyLml0ZW1zKVxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyLml0ZW1zLnNwbGljZSgwLCB0aGlzLmNvbnRhaW5lci5pdGVtcy5sZW5ndGgpXHJcbiAgICAgICAgdGhpcy5oaWRlKClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgRGVmZWF0RGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdHJ5QWdhaW5CdXR0b24gPSBkb20uYnlJZChcInRyeUFnYWluQnV0dG9uXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpYWxvZzogRGlhbG9nXHJcblxyXG4gICAgY29uc3RydWN0b3IoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IERpYWxvZyhkb20uYnlJZChcImRlZmVhdERpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgICAgIHRoaXMudHJ5QWdhaW5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMudHJ5QWdhaW4oKSlcclxuICAgICAgICB0aGlzLmRpYWxvZy5lbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qga2V5ID0gZXYua2V5LnRvVXBwZXJDYXNlKClcclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJUXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudHJ5QWdhaW4oKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkVOVEVSXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudHJ5QWdhaW4oKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdHJ5QWdhaW4oKSB7XHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIExldmVsRGlhbG9nIGV4dGVuZHMgRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWxTdHJlbmd0aFJvdyA9IGRvbS5ieUlkKFwibGV2ZWxTdHJlbmd0aFJvd1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsZXZlbEludGVsbGlnZW5jZVJvdyA9IGRvbS5ieUlkKFwibGV2ZWxJbnRlbGxpZ2VuY2VSb3dcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWxBZ2lsaXR5Um93ID0gZG9tLmJ5SWQoXCJsZXZlbEFnaWxpdHlSb3dcIilcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyLCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgc3VwZXIoZG9tLmJ5SWQoXCJsZXZlbERpYWxvZ1wiKSwgY2FudmFzKVxyXG5cclxuICAgICAgICB0aGlzLmxldmVsU3RyZW5ndGhSb3cuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMubGV2ZWxTdHJlbnRoKCkpXHJcbiAgICAgICAgdGhpcy5sZXZlbEludGVsbGlnZW5jZVJvdy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5sZXZlbEludGVsbGlnZW5jZSgpKVxyXG4gICAgICAgIHRoaXMubGV2ZWxBZ2lsaXR5Um93LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmxldmVsQWdpbGl0eSgpKVxyXG5cclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGV2LmtleS50b1VwcGVyQ2FzZSgpXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoZXYua2V5KVxyXG5cclxuICAgICAgICAgICAgaWYgKGluZGV4ID09IDEgfHwga2V5ID09IFwiU1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxldmVsU3RyZW50aCgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChpbmRleCA9PSAyIHx8IGtleSA9PSBcIklcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sZXZlbEludGVsbGlnZW5jZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChpbmRleCA9PSAzIHx8IGtleSA9PSBcIkFcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sZXZlbEFnaWxpdHkoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGxldmVsU3RyZW50aCgpIHtcclxuICAgICAgICB0aGlzLnBsYXllci5iYXNlU3RyZW5ndGgrK1xyXG4gICAgICAgIHRoaXMubGV2ZWxVcCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBsZXZlbEludGVsbGlnZW5jZSgpIHtcclxuICAgICAgICB0aGlzLnBsYXllci5iYXNlSW50ZWxsaWdlbmNlKytcclxuICAgICAgICB0aGlzLmxldmVsVXAoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbGV2ZWxBZ2lsaXR5KCkge1xyXG4gICAgICAgIHRoaXMucGxheWVyLmJhc2VBZ2lsaXR5KytcclxuICAgICAgICB0aGlzLmxldmVsVXAoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbGV2ZWxVcCgpIHtcclxuICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgIHRoaXMucGxheWVyLmJhc2VNYXhIZWFsdGggKz0gMyArIHRoaXMucGxheWVyLnN0cmVuZ3RoXHJcbiAgICB9XHJcbn1cclxuXHJcbmVudW0gU2hvcERpYWxvZ01vZGUge1xyXG4gICAgQnV5LFxyXG4gICAgU2VsbFxyXG59XHJcblxyXG5jbGFzcyBTaG9wRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGlhbG9nOiBEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZ29sZFNwYW4gPSBkb20uYnlJZChcInNob3BHb2xkU3BhblwiKSBhcyBIVE1MU3BhbkVsZW1lbnQ7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNsb3NlQnV0dG9uID0gZG9tLmJ5SWQoXCJzaG9wRXhpdEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBidXlCdXR0b24gPSBkb20uYnlJZChcInNob3BCdXlCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2VsbEJ1dHRvbiA9IGRvbS5ieUlkKFwic2hvcFNlbGxCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbmV4dFBhZ2VCdXR0b24gPSBkb20uYnlJZChcInNob3BOZXh0UGFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwcmV2UGFnZUJ1dHRvbiA9IGRvbS5ieUlkKFwic2hvcFByZXZQYWdlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNob3BUYWJsZSA9IGRvbS5ieUlkKFwic2hvcFRhYmxlXCIpIGFzIEhUTUxUYWJsZUVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2hvcEJ1eUl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwic2hvcEJ1eUl0ZW1UZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNob3BTZWxsSXRlbVRlbXBsYXRlID0gZG9tLmJ5SWQoXCJzaG9wU2VsbEl0ZW1UZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwcml2YXRlIG1vZGU6IFNob3BEaWFsb2dNb2RlID0gU2hvcERpYWxvZ01vZGUuQnV5XHJcbiAgICBwcml2YXRlIGl0ZW1zOiBybC5JdGVtW10gPSBbXVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWdlU2l6ZTogbnVtYmVyID0gOVxyXG4gICAgcHJpdmF0ZSBwYWdlSW5kZXg6IG51bWJlciA9IDBcclxuICAgIHByaXZhdGUgc2VsZWN0ZWRJbmRleDogbnVtYmVyID0gLTFcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyLCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cgPSBuZXcgRGlhbG9nKGRvbS5ieUlkKFwic2hvcERpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgICAgIHRoaXMucGxheWVyID0gcGxheWVyXHJcbiAgICAgICAgdGhpcy5idXlCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuc2V0TW9kZShTaG9wRGlhbG9nTW9kZS5CdXkpKVxyXG4gICAgICAgIHRoaXMuc2VsbEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5zZXRNb2RlKFNob3BEaWFsb2dNb2RlLlNlbGwpKVxyXG4gICAgICAgIHRoaXMubmV4dFBhZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMubmV4dFBhZ2UoKSlcclxuICAgICAgICB0aGlzLnByZXZQYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnByZXZQYWdlKCkpXHJcbiAgICAgICAgdGhpcy5jbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5oaWRlKCkpXHJcblxyXG4gICAgICAgIGNvbnN0IGVsZW0gPSB0aGlzLmRpYWxvZy5lbGVtXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZShlbGVtLCBcImNsaWNrXCIsIFwiLml0ZW0tcm93XCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBidG4gPSBldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KHJvdylcclxuICAgICAgICAgICAgdGhpcy5jaG9vc2UoaWR4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGV2LmtleS50b1VwcGVyQ2FzZSgpXHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlhcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJCXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0TW9kZShTaG9wRGlhbG9nTW9kZS5CdXkpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiU1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldE1vZGUoU2hvcERpYWxvZ01vZGUuU2VsbClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJBUlJPV0RPV05cIiB8fCBrZXkgPT09IFwiU1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRJdGVtKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJBUlJPV1VQXCIgfHwga2V5ID09PSBcIldcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2SXRlbSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiUEFHRURPV05cIiB8fCBrZXkgPT09IFwiTlwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRQYWdlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJQQUdFVVBcIiB8fCBrZXkgPT09IFwiUFwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByZXZQYWdlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFU0NBUEVcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFTlRFUlwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNob29zZSh0aGlzLnNlbGVjdGVkSW5kZXgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoZXYua2V5KVxyXG4gICAgICAgICAgICBpZiAoaW5kZXggJiYgaW5kZXggPiAwICYmIGluZGV4IDw9IDkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hvb3NlKGluZGV4IC0gMSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIHRoaXMuZGlhbG9nLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cuaGlkZSgpXHJcbiAgICB9XHJcblxyXG4gICAgY2hvb3NlKGlkeDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWR4ID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplICsgaWR4XHJcbiAgICAgICAgc3dpdGNoICh0aGlzLm1vZGUpIHtcclxuICAgICAgICAgICAgY2FzZSBTaG9wRGlhbG9nTW9kZS5CdXk6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1eShpZHgpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICBjYXNlIFNob3BEaWFsb2dNb2RlLlNlbGw6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGwoaWR4KVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2V0TW9kZShtb2RlOiBTaG9wRGlhbG9nTW9kZSkge1xyXG4gICAgICAgIHRoaXMubW9kZSA9IG1vZGVcclxuICAgICAgICB0aGlzLnBhZ2VJbmRleCA9IDBcclxuICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSAtMVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgYnV5KGlkeDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbaWR4XVxyXG5cclxuICAgICAgICBpZiAoaXRlbS52YWx1ZSA+IHRoaXMucGxheWVyLmdvbGQpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKGBZb3UgZG8gbm90IGhhdmUgZW5vdWdoIGdvbGQgZm9yICR7aXRlbS5uYW1lfSFgKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG91dHB1dC5pbmZvKGBZb3UgYm91Z2h0ICR7aXRlbS5uYW1lfS5gKVxyXG4gICAgICAgIHRoaXMucGxheWVyLmdvbGQgLT0gaXRlbS52YWx1ZVxyXG4gICAgICAgIHRoaXMucGxheWVyLmludmVudG9yeS5wdXNoKGl0ZW0uY2xvbmUoKSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHNlbGwoaWR4OiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBpdGVtID0gdGhpcy5pdGVtc1tpZHhdXHJcbiAgICAgICAgY29uc3QgaW52SWR4ID0gdGhpcy5wbGF5ZXIuaW52ZW50b3J5LmluZGV4T2YoaXRlbSlcclxuICAgICAgICBpZiAoaW52SWR4ID09IC0xKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIucmVtb3ZlKGl0ZW0pXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIuaW52ZW50b3J5LnNwbGljZShpbnZJZHgsIDEpXHJcbiAgICAgICAgY29uc3Qgc2VsbFZhbHVlID0gTWF0aC5mbG9vcihpdGVtLnZhbHVlIC8gMilcclxuICAgICAgICB0aGlzLnBsYXllci5nb2xkICs9IHNlbGxWYWx1ZVxyXG4gICAgICAgIG91dHB1dC5pbmZvKGBZb3Ugc29sZCAke2l0ZW0ubmFtZX0gZm9yICR7c2VsbFZhbHVlfSBnb2xkLmApXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgaGlkZGVuKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRpYWxvZy5oaWRkZW5cclxuICAgIH1cclxuXHJcbiAgICBuZXh0UGFnZSgpIHtcclxuICAgICAgICB0aGlzLnBhZ2VJbmRleCsrXHJcbiAgICAgICAgdGhpcy5wYWdlSW5kZXggPSBNYXRoLm1pbih0aGlzLnBhZ2VJbmRleCwgTWF0aC5jZWlsKHRoaXMuaXRlbXMubGVuZ3RoIC8gdGhpcy5wYWdlU2l6ZSkgLSAxKVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJldlBhZ2UoKSB7XHJcbiAgICAgICAgdGhpcy5wYWdlSW5kZXgtLVxyXG4gICAgICAgIHRoaXMucGFnZUluZGV4ID0gTWF0aC5tYXgodGhpcy5wYWdlSW5kZXgsIDApXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBuZXh0SXRlbSgpIHtcclxuICAgICAgICArK3RoaXMuc2VsZWN0ZWRJbmRleFxyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWluKHRoaXMuc2VsZWN0ZWRJbmRleCwgOClcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByZXZJdGVtKCkge1xyXG4gICAgICAgIC0tdGhpcy5zZWxlY3RlZEluZGV4XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5tYXgodGhpcy5zZWxlY3RlZEluZGV4LCAtMSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHJlZnJlc2goKSB7XHJcbiAgICAgICAgc3dpdGNoICh0aGlzLm1vZGUpIHtcclxuICAgICAgICAgICAgY2FzZSBTaG9wRGlhbG9nTW9kZS5CdXk6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2hCdXkoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgU2hvcERpYWxvZ01vZGUuU2VsbDpcclxuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaFNlbGwoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZ29sZFNwYW4udGV4dENvbnRlbnQgPSBgR29sZDogJHt0aGlzLnBsYXllci5nb2xkfWBcclxuICAgIH1cclxuXHJcbiAgICByZWZyZXNoQnV5KCkge1xyXG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy5zaG9wVGFibGUudEJvZGllc1swXVxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0Ym9keSlcclxuXHJcbiAgICAgICAgLy8gYXNzZW1ibGUgaXRlbSBsaXN0XHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5wbGF5ZXJcclxuICAgICAgICB0aGlzLml0ZW1zID0gWy4uLnRoaW5ncy5kYl0uZmlsdGVyKHQgPT4gdCBpbnN0YW5jZW9mIHJsLkl0ZW0gJiYgdC52YWx1ZSA+IDAgJiYgdC5sZXZlbCA8PSBwbGF5ZXIubGV2ZWwpIGFzIHJsLkl0ZW1bXVxyXG5cclxuICAgICAgICBjb25zdCBwYWdlT2Zmc2V0ID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplXHJcbiAgICAgICAgY29uc3QgcGFnZVNpemUgPSBNYXRoLm1pbih0aGlzLnBhZ2VTaXplLCB0aGlzLml0ZW1zLmxlbmd0aCAtIHBhZ2VPZmZzZXQpXHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5taW4odGhpcy5zZWxlY3RlZEluZGV4LCBwYWdlU2l6ZSAtIDEpXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFnZVNpemU7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gdGhpcy5pdGVtc1twYWdlT2Zmc2V0ICsgaV1cclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0aGlzLnNob3BCdXlJdGVtVGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCB0ciA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5pdGVtLXJvd1wiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtSW5kZXhUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLWluZGV4XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1OYW1lVGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1uYW1lXCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1Db3N0VGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1jb3N0XCIpXHJcbiAgICAgICAgICAgIGl0ZW1JbmRleFRkLnRleHRDb250ZW50ID0gYCR7aSArIDF9YFxyXG4gICAgICAgICAgICBpdGVtTmFtZVRkLnRleHRDb250ZW50ID0gaXRlbS5uYW1lXHJcbiAgICAgICAgICAgIGl0ZW1Db3N0VGQudGV4dENvbnRlbnQgPSBgJHtpdGVtLnZhbHVlfWBcclxuXHJcbiAgICAgICAgICAgIGlmIChpID09PSB0aGlzLnNlbGVjdGVkSW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIHRyLmNsYXNzTGlzdC5hZGQoXCJzZWxlY3RlZFwiKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoaXRlbS52YWx1ZSA+IHBsYXllci5nb2xkKSB7XHJcbiAgICAgICAgICAgICAgICB0ci5jbGFzc0xpc3QuYWRkKFwiZGlzYWJsZWRcIilcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGJvZHkuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmJ1eUJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcclxuICAgICAgICB0aGlzLnNlbGxCdXR0b24uZGlzYWJsZWQgPSBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHJlZnJlc2hTZWxsKCkge1xyXG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy5zaG9wVGFibGUudEJvZGllc1swXVxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0Ym9keSlcclxuXHJcbiAgICAgICAgLy8gYXNzZW1ibGUgaXRlbSBsaXN0XHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5wbGF5ZXJcclxuICAgICAgICB0aGlzLml0ZW1zID0gWy4uLnBsYXllci5pbnZlbnRvcnldLmZpbHRlcih0ID0+IHQudmFsdWUgPiAwKSBhcyBybC5JdGVtW11cclxuICAgICAgICBjb25zdCBwYWdlT2Zmc2V0ID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplXHJcbiAgICAgICAgY29uc3QgcGFnZVNpemUgPSBNYXRoLm1pbih0aGlzLnBhZ2VTaXplLCB0aGlzLml0ZW1zLmxlbmd0aCAtIHBhZ2VPZmZzZXQpXHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5taW4odGhpcy5zZWxlY3RlZEluZGV4LCBwYWdlU2l6ZSAtIDEpXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFnZVNpemU7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gdGhpcy5pdGVtc1twYWdlT2Zmc2V0ICsgaV1cclxuICAgICAgICAgICAgY29uc3QgZXF1aXBwZWQgPSB0aGlzLnBsYXllci5pc0VxdWlwcGVkKGl0ZW0pXHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy5zaG9wU2VsbEl0ZW1UZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHRyID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLml0ZW0tcm93XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1JbmRleFRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0taW5kZXhcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLW5hbWVcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbUNvc3RUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLWNvc3RcIilcclxuICAgICAgICAgICAgaXRlbUluZGV4VGQudGV4dENvbnRlbnQgPSBgJHtpICsgMX1gXHJcbiAgICAgICAgICAgIGl0ZW1OYW1lVGQudGV4dENvbnRlbnQgPSBgJHtlcXVpcHBlZCA/IFwiKiBcIiA6IFwiXCJ9JHtpdGVtLm5hbWV9YFxyXG4gICAgICAgICAgICBpdGVtQ29zdFRkLnRleHRDb250ZW50ID0gYCR7TWF0aC5mbG9vcihpdGVtLnZhbHVlIC8gMil9YFxyXG5cclxuICAgICAgICAgICAgaWYgKGkgPT09IHRoaXMuc2VsZWN0ZWRJbmRleCkge1xyXG4gICAgICAgICAgICAgICAgdHIuY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5idXlCdXR0b24uZGlzYWJsZWQgPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuc2VsbEJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U29ydGVkSXRlbXMoaXRlbXM6IEl0ZXJhYmxlPHJsLkl0ZW0+KTogcmwuSXRlbVtdIHtcclxuICAgIGNvbnN0IHNvcnRlZEl0ZW1zID0gaXRlci5vcmRlckJ5KGl0ZW1zLCBpID0+IGkubmFtZSlcclxuICAgIHJldHVybiBzb3J0ZWRJdGVtc1xyXG59XHJcblxyXG5mdW5jdGlvbiBoYXNMaW5lT2ZTaWdodChtYXA6IG1hcHMuTWFwLCBleWU6IGdlby5Qb2ludCwgdGFyZ2V0OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgIGZvciAoY29uc3QgcHQgb2YgbWFyY2goZXllLCB0YXJnZXQpKSB7XHJcbiAgICAgICAgLy8gaWdub3JlIHN0YXJ0IHBvaW50XHJcbiAgICAgICAgaWYgKHB0LmVxdWFsKGV5ZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgdGggb2YgbWFwLmF0KHB0KSkge1xyXG4gICAgICAgICAgICBpZiAoIXRoLnRyYW5zcGFyZW50KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHQuZXF1YWwodGFyZ2V0KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uKiBtYXJjaChzdGFydDogZ2VvLlBvaW50LCBlbmQ6IGdlby5Qb2ludCk6IEdlbmVyYXRvcjxnZW8uUG9pbnQ+IHtcclxuICAgIGNvbnN0IGN1ciA9IHN0YXJ0LmNsb25lKClcclxuICAgIGNvbnN0IGR5ID0gTWF0aC5hYnMoZW5kLnkgLSBzdGFydC55KVxyXG4gICAgY29uc3Qgc3kgPSBzdGFydC55IDwgZW5kLnkgPyAxIDogLTFcclxuICAgIGNvbnN0IGR4ID0gLU1hdGguYWJzKGVuZC54IC0gc3RhcnQueClcclxuICAgIGNvbnN0IHN4ID0gc3RhcnQueCA8IGVuZC54ID8gMSA6IC0xXHJcbiAgICBsZXQgZXJyID0gZHkgKyBkeFxyXG5cclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgeWllbGQgY3VyXHJcblxyXG4gICAgICAgIGlmIChjdXIuZXF1YWwoZW5kKSkge1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZTIgPSAyICogZXJyXHJcbiAgICAgICAgaWYgKGUyID49IGR4KSB7XHJcbiAgICAgICAgICAgIGVyciArPSBkeFxyXG4gICAgICAgICAgICBjdXIueSArPSBzeVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUyIDw9IGR5KSB7XHJcbiAgICAgICAgICAgIGVyciArPSBkeVxyXG4gICAgICAgICAgICBjdXIueCArPSBzeFxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZHJvcEl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkl0ZW0pOiB2b2lkIHtcclxuICAgIHBsYXllci5kZWxldGUoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gd2FzIGRyb3BwZWRgKVxyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5Vc2FibGUpOiB2b2lkIHtcclxuICAgIGNvbnN0IGFtb3VudCA9IE1hdGgubWluKGl0ZW0uaGVhbHRoLCBwbGF5ZXIubWF4SGVhbHRoIC0gcGxheWVyLmhlYWx0aClcclxuICAgIHBsYXllci5oZWFsdGggKz0gYW1vdW50XHJcbiAgICBwbGF5ZXIuZGVsZXRlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHJlc3RvcmVkICR7YW1vdW50fSBoZWFsdGhgKVxyXG59XHJcblxyXG5mdW5jdGlvbiBlcXVpcEl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkl0ZW0pOiB2b2lkIHtcclxuICAgIHBsYXllci5lcXVpcChpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSB3YXMgZXF1aXBwZWRgKVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5JdGVtKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIucmVtb3ZlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHdhcyByZW1vdmVkYClcclxufVxyXG5cclxuZW51bSBUYXJnZXRDb21tYW5kIHtcclxuICAgIE5vbmUsXHJcbiAgICBBdHRhY2ssXHJcbiAgICBTaG9vdCxcclxuICAgIExvb2tcclxufVxyXG5cclxuY2xhc3MgQXBwIHtcclxuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IGN1cnNvckFuaW1hdGlvbkR1cmF0aW9uID0gMTI1XHJcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBtb3ZlQW5pbWF0aW9uRHVyYXRpb24gPSAyNTBcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FudmFzID0gZG9tLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYXR0YWNrQnV0dG9uID0gZG9tLmJ5SWQoXCJhdHRhY2tCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2hvb3RCdXR0b24gPSBkb20uYnlJZChcInNob290QnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxvb2tCdXR0b24gPSBkb20uYnlJZChcImxvb2tCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmVzZXRCdXR0b24gPSBkb20uYnlJZChcInJlc2V0QnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGlucDogaW5wdXQuSW5wdXQgPSBuZXcgaW5wdXQuSW5wdXQodGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN0YXRzRGlhbG9nOiBTdGF0c0RpYWxvZ1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbnZlbnRvcnlEaWFsb2c6IEludmVudG9yeURpYWxvZ1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXJEaWFsb2c6IENvbnRhaW5lckRpYWxvZ1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBkZWZlYXREaWFsb2cgPSBuZXcgRGVmZWF0RGlhbG9nKHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsZXZlbERpYWxvZzogTGV2ZWxEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2hvcERpYWxvZzogU2hvcERpYWxvZ1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBhbmltYXRpb25zID0gbmV3IEFuaW1hdGlvbnMoKVxyXG4gICAgcHJpdmF0ZSBjdXJzb3JBbmltYXRpb24/OiBBbmltYXRpb25cclxuICAgIHByaXZhdGUgem9vbSA9IDFcclxuICAgIHByaXZhdGUgdGFyZ2V0Q29tbWFuZDogVGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuTm9uZVxyXG4gICAgcHJpdmF0ZSBjdXJzb3JQb3NpdGlvbj86IGdlby5Qb2ludFxyXG4gICAgcHJpdmF0ZSB0aW1lOiBET01IaWdoUmVzVGltZVN0YW1wID0gMFxyXG5cclxuICAgIHByaXZhdGUgY29uc3RydWN0b3IoXHJcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBybmc6IHJhbmQuU0ZDMzJSTkcsXHJcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSByZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLFxyXG4gICAgICAgIHByaXZhdGUgZmxvb3I6IG51bWJlcixcclxuICAgICAgICBwcml2YXRlIG1hcDogbWFwcy5NYXAsXHJcbiAgICAgICAgcHJpdmF0ZSB0ZXh0dXJlOiBnZnguVGV4dHVyZSxcclxuICAgICAgICBwcml2YXRlIGltYWdlTWFwOiBNYXA8c3RyaW5nLCBudW1iZXI+KSB7XHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gbWFwLnBsYXllci50aGluZ1xyXG4gICAgICAgIHRoaXMuc3RhdHNEaWFsb2cgPSBuZXcgU3RhdHNEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgICAgICB0aGlzLmludmVudG9yeURpYWxvZyA9IG5ldyBJbnZlbnRvcnlEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgICAgICB0aGlzLmNvbnRhaW5lckRpYWxvZyA9IG5ldyBDb250YWluZXJEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgICAgICB0aGlzLmxldmVsRGlhbG9nID0gbmV3IExldmVsRGlhbG9nKHBsYXllciwgdGhpcy5jYW52YXMpXHJcbiAgICAgICAgdGhpcy5zaG9wRGlhbG9nID0gbmV3IFNob3BEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc3RhdGljIGFzeW5jIGNyZWF0ZSgpOiBQcm9taXNlPEFwcD4ge1xyXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICAgICAgY29uc3QgcmVuZGVyZXIgPSBuZXcgZ2Z4LlJlbmRlcmVyKGNhbnZhcylcclxuXHJcbiAgICAgICAgLy8gY2hlY2sgZm9yIGFueSBzYXZlZCBzdGF0ZVxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFwcCA9IGF3YWl0IEFwcC5sb2FkKHJlbmRlcmVyKVxyXG4gICAgICAgICAgICBpZiAoYXBwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXBwXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRmFpbGVkIHRvIGxvYWQgc3RhdGUuXCIsIGUpXHJcbiAgICAgICAgICAgIGNsZWFyU3RhdGUoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbm8gdmFsaWQgc2F2ZSBzdGF0ZSwgY3JlYXRlIGFwcCBhbmQgZ2VuZXJhdGUgZHVuZ2VvblxyXG4gICAgICAgIGNvbnN0IHNlZWQgPSByYW5kLnhtdXIzKG5ldyBEYXRlKCkudG9TdHJpbmcoKSlcclxuICAgICAgICBjb25zdCBybmcgPSBuZXcgcmFuZC5TRkMzMlJORyhzZWVkKCksIHNlZWQoKSwgc2VlZCgpLCBzZWVkKCkpXHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpbmdzLnBsYXllci5jbG9uZSgpXHJcblxyXG4gICAgICAgIGNvbnN0IG1hcCA9IGdlbi5nZW5lcmF0ZUR1bmdlb25MZXZlbChybmcsIHRoaW5ncy5kYiwgMSlcclxuICAgICAgICBwbGFjZVBsYXllckF0RXhpdChtYXAsIHBsYXllciwgcmwuRXhpdERpcmVjdGlvbi5VcClcclxuXHJcbiAgICAgICAgY29uc3QgW3RleHR1cmUsIGltYWdlTWFwXSA9IGF3YWl0IGxvYWRJbWFnZXMocmVuZGVyZXIsIG1hcClcclxuICAgICAgICBjb25zdCBhcHAgPSBuZXcgQXBwKHJuZywgcmVuZGVyZXIsIDEsIG1hcCwgdGV4dHVyZSwgaW1hZ2VNYXApXHJcbiAgICAgICAgcmV0dXJuIGFwcFxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBleGVjKCkge1xyXG4gICAgICAgIHRoaXMuY2FudmFzLmZvY3VzKClcclxuXHJcbiAgICAgICAgb3V0cHV0LndyaXRlKFwiWW91ciBhZHZlbnR1cmUgYmVnaW5zXCIpXHJcbiAgICAgICAgdGhpcy5oYW5kbGVSZXNpemUoKVxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aW1lID0+IHRoaXMudGljayh0aW1lKSlcclxuXHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2KSA9PiB0aGlzLmhhbmRsZUtleURvd24oZXYpKVxyXG5cclxuICAgICAgICB0aGlzLmF0dGFja0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLkF0dGFja1xyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuc2hvb3RCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5TaG9vdFxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMubG9va0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLkxvb2tcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLnJlc2V0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNsZWFyU3RhdGUoKVxyXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKClcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdGljayh0aW1lOiBET01IaWdoUmVzVGltZVN0YW1wKSB7XHJcbiAgICAgICAgdGhpcy50aW1lID0gdGltZVxyXG4gICAgICAgIHRoaXMuaGFuZGxlUmVzaXplKClcclxuICAgICAgICB0aGlzLmFuaW1hdGlvbnMudXBkYXRlKHRpbWUpXHJcbiAgICAgICAgdGhpcy5jdXJzb3JBbmltYXRpb24/LnVwZGF0ZSh0aW1lKVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IFt0aCwgYW5pbV0gb2YgdGhpcy5hbmltYXRpb25zLnByb2Nlc3NEb25lKCkpIHtcclxuICAgICAgICAgICAgaWYgKHRoIGluc3RhbmNlb2YgcmwuUGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1hcC5wbGF5ZXJzLnNldChhbmltLnBvc2l0aW9uLCB0aClcclxuICAgICAgICAgICAgICAgIHRoLmFjdGlvbiAtPSAxXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aCBpbnN0YW5jZW9mIHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFwLm1vbnN0ZXJzLnNldChhbmltLnBvc2l0aW9uLCB0aClcclxuICAgICAgICAgICAgICAgIHRoLmFjdGlvbiAtPSAxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmN1cnNvckFuaW1hdGlvbj8uZG9uZSkge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnNvclBvc2l0aW9uID0gdGhpcy5jdXJzb3JBbmltYXRpb24ucG9zaXRpb25cclxuICAgICAgICAgICAgdGhpcy5jdXJzb3JBbmltYXRpb24gPSB1bmRlZmluZWRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmFuaW1hdGlvbnMuc2l6ZSA9PT0gMCAmJiAhdGhpcy5jdXJzb3JBbmltYXRpb24pIHtcclxuICAgICAgICAgICAgY29uc3QgbmV4dENyZWF0dXJlID0gdGhpcy5nZXROZXh0Q3JlYXR1cmUoKVxyXG4gICAgICAgICAgICBpZiAobmV4dENyZWF0dXJlPy50aGluZyBpbnN0YW5jZW9mIHJsLlBsYXllcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dCgpXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobmV4dENyZWF0dXJlPy50aGluZyBpbnN0YW5jZW9mIHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGlja01vbnN0ZXIobmV4dENyZWF0dXJlLnBvc2l0aW9uLCBuZXh0Q3JlYXR1cmUudGhpbmcpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpY2tSb3VuZCgpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5KClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZHJhd0ZyYW1lKClcclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGltZSA9PiB0aGlzLnRpY2sodGltZSkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXROZXh0TW9uc3RlcigpOiBtYXBzLlBsYWNlZDxybC5Nb25zdGVyPiB8IG51bGwge1xyXG4gICAgICAgIC8vIGRldGVybWluZSB3aG9zZSB0dXJuIGl0IGlzXHJcbiAgICAgICAgbGV0IG5leHRNb25zdGVyID0gbnVsbFxyXG4gICAgICAgIGZvciAoY29uc3QgbW9uc3RlciBvZiB0aGlzLm1hcC5tb25zdGVycykge1xyXG4gICAgICAgICAgICBpZiAobW9uc3Rlci50aGluZy5zdGF0ZSAhPT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobW9uc3Rlci50aGluZy5hY3Rpb24gPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFuZXh0TW9uc3RlciB8fCBtb25zdGVyLnRoaW5nLmFjdGlvbiA+IG5leHRNb25zdGVyLnRoaW5nLmFjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgbmV4dE1vbnN0ZXIgPSBtb25zdGVyXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBuZXh0TW9uc3RlclxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0TmV4dENyZWF0dXJlKCk6IG1hcHMuUGxhY2VkPHJsLk1vbnN0ZXI+IHwgbWFwcy5QbGFjZWQ8cmwuUGxheWVyPiB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IG1vbnN0ZXIgPSB0aGlzLmdldE5leHRNb25zdGVyKClcclxuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLm1hcC5wbGF5ZXIudGhpbmdcclxuXHJcbiAgICAgICAgaWYgKHBsYXllci5hY3Rpb24gPiAwICYmIHBsYXllci5hY3Rpb24gPiAobW9uc3Rlcj8udGhpbmc/LmFjdGlvbiA/PyAwKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tYXAucGxheWVyXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbW9uc3RlclxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdGlja1JvdW5kKCkge1xyXG4gICAgICAgIC8vIGFjY3VtdWxhdGUgYWN0aW9uIHBvaW50c1xyXG4gICAgICAgIGZvciAoY29uc3QgbW9uc3RlciBvZiBpdGVyLmZpbHRlcih0aGlzLm1hcC5tb25zdGVycy50aGluZ3MoKSwgbSA9PiBtLnN0YXRlID09PSBybC5Nb25zdGVyU3RhdGUuYWdncm8pKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc2VydmUgPSBNYXRoLm1pbihtb25zdGVyLmFjdGlvblJlc2VydmUsIG1vbnN0ZXIuYWdpbGl0eSlcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gPSAxICsgbW9uc3Rlci5hZ2lsaXR5ICsgcmVzZXJ2ZVxyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvblJlc2VydmUgPSAwXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjYXAgYWN0aW9uIHJlc2VydmUgXHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5tYXAucGxheWVyLnRoaW5nXHJcbiAgICAgICAgY29uc3QgcmVzZXJ2ZSA9IE1hdGgubWluKHBsYXllci5hY3Rpb25SZXNlcnZlLCBwbGF5ZXIuYWdpbGl0eSlcclxuICAgICAgICBwbGF5ZXIuYWN0aW9uID0gMSArIHBsYXllci5hZ2lsaXR5ICsgcmVzZXJ2ZVxyXG4gICAgICAgIHBsYXllci5hY3Rpb25SZXNlcnZlID0gMFxyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZU1vbnN0ZXJTdGF0ZXMoKVxyXG5cclxuICAgICAgICAvLyBhZHZhbmNlIGR1cmF0aW9uIG9mIGl0ZW1zXHJcbiAgICAgICAgaWYgKHBsYXllci5saWdodFNvdXJjZSAmJiBwbGF5ZXIubGlnaHRTb3VyY2UuZHVyYXRpb24gPiAwKSB7XHJcbiAgICAgICAgICAgIHBsYXllci5saWdodFNvdXJjZS5kdXJhdGlvbiAtPSAxXHJcbiAgICAgICAgICAgIGlmIChwbGF5ZXIubGlnaHRTb3VyY2UuZHVyYXRpb24gPT09IDApIHtcclxuICAgICAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGBZb3VyICR7cGxheWVyLmxpZ2h0U291cmNlLm5hbWV9IGhhcyBiZWVuIGV4dGluZ3Vpc2hlZCFgKVxyXG4gICAgICAgICAgICAgICAgcGxheWVyLmRlbGV0ZShwbGF5ZXIubGlnaHRTb3VyY2UpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGV4cGVyaWVuY2VSZXF1aXJlZCA9IHJsLmdldEV4cGVyaWVuY2VSZXF1aXJlbWVudChwbGF5ZXIubGV2ZWwgKyAxKVxyXG4gICAgICAgIGlmIChwbGF5ZXIuZXhwZXJpZW5jZSA+PSBleHBlcmllbmNlUmVxdWlyZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5sZXZlbERpYWxvZy5zaG93KClcclxuICAgICAgICAgICAgKytwbGF5ZXIubGV2ZWxcclxuICAgICAgICAgICAgcGxheWVyLmV4cGVyaWVuY2UgLT0gZXhwZXJpZW5jZVJlcXVpcmVkXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzYXZlIGN1cnJlbnQgc3RhdGVcclxuICAgICAgICB0aGlzLnNhdmVTdGF0ZSgpXHJcblxyXG4gICAgICAgIGlmIChwbGF5ZXIuaGVhbHRoIDw9IDApIHtcclxuICAgICAgICAgICAgY2xlYXJTdGF0ZSgpXHJcbiAgICAgICAgICAgIHRoaXMuZGVmZWF0RGlhbG9nLnNob3coKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFNjcm9sbE9mZnNldCgpOiBnZW8uUG9pbnQge1xyXG4gICAgICAgIC8vIGNvbnZlcnQgbWFwIHBvaW50IHRvIGNhbnZhcyBwb2ludCwgbm90aW5nIHRoYXQgY2FudmFzIGlzIGNlbnRlcmVkIG9uIHBsYXllclxyXG4gICAgICAgIGNvbnN0IHBsYXllclBvc2l0aW9uID0gdGhpcy5tYXAucGxheWVyLnBvc2l0aW9uXHJcbiAgICAgICAgY29uc3QgY2FudmFzQ2VudGVyID0gbmV3IGdlby5Qb2ludCh0aGlzLmNhbnZhcy53aWR0aCAvIDIsIHRoaXMuY2FudmFzLmhlaWdodCAvIDIpXHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gY2FudmFzQ2VudGVyLnN1YlBvaW50KHBsYXllclBvc2l0aW9uLmFkZFNjYWxhciguNSkubXVsU2NhbGFyKHRoaXMudGlsZVNpemUpKVxyXG4gICAgICAgIHJldHVybiBvZmZzZXQuZmxvb3IoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FudmFzVG9NYXBQb2ludChjeHk6IGdlby5Qb2ludCkge1xyXG4gICAgICAgIGNvbnN0IHNjcm9sbE9mZnNldCA9IHRoaXMuZ2V0U2Nyb2xsT2Zmc2V0KClcclxuICAgICAgICBjb25zdCBteHkgPSBjeHkuc3ViUG9pbnQoc2Nyb2xsT2Zmc2V0KS5kaXZTY2FsYXIodGhpcy50aWxlU2l6ZSkuZmxvb3IoKVxyXG4gICAgICAgIHJldHVybiBteHlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG1hcFRvQ2FudmFzUG9pbnQobXh5OiBnZW8uUG9pbnQpIHtcclxuICAgICAgICBjb25zdCBzY3JvbGxPZmZzZXQgPSB0aGlzLmdldFNjcm9sbE9mZnNldCgpXHJcbiAgICAgICAgY29uc3QgY3h5ID0gbXh5Lm11bFNjYWxhcih0aGlzLnRpbGVTaXplKS5hZGRQb2ludChzY3JvbGxPZmZzZXQpXHJcbiAgICAgICAgcmV0dXJuIGN4eVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHJvY2Vzc1BsYXllck1lbGVlQXR0YWNrKGRlZmVuZGVyOiBybC5Nb25zdGVyKSB7XHJcbiAgICAgICAgLy8gYmFzZSA2MCUgY2hhbmNlIHRvIGhpdFxyXG4gICAgICAgIC8vIDEwJSBib251cyAvIHBlbmFsdHkgZm9yIGV2ZXJ5IHBvaW50IGRpZmZlcmVuY2UgYmV0d2VlbiBhdHRhY2sgYW5kIGRlZmVuc2VcclxuICAgICAgICAvLyBib3R0b21zIG91dCBhdCA1JSAtIGFsd2F5cyBTT01FIGNoYW5jZSB0byBoaXRcclxuICAgICAgICBjb25zdCBhdHRhY2tlciA9IHRoaXMubWFwLnBsYXllci50aGluZ1xyXG4gICAgICAgIGNvbnN0IGJvbnVzID0gKGF0dGFja2VyLm1lbGVlQXR0YWNrIC0gZGVmZW5kZXIuZGVmZW5zZSkgKiAuMVxyXG4gICAgICAgIGNvbnN0IGhpdENoYW5jZSA9IE1hdGgubWluKE1hdGgubWF4KC42ICsgYm9udXMsIC4wNSksIC45NSlcclxuICAgICAgICBjb25zdCBoaXQgPSByYW5kLmNoYW5jZSh0aGlzLnJuZywgaGl0Q2hhbmNlKVxyXG4gICAgICAgIGNvbnN0IHdlYXBvbiA9IGF0dGFja2VyLm1lbGVlV2VhcG9uID8/IHRoaW5ncy5maXN0c1xyXG4gICAgICAgIGNvbnN0IGF0dGFja1ZlcmIgPSB3ZWFwb24udmVyYiA/IHdlYXBvbi52ZXJiIDogXCJhdHRhY2tzXCJcclxuICAgICAgICBhdHRhY2tlci5hY3Rpb24gLT0gd2VhcG9uLmFjdGlvblxyXG5cclxuICAgICAgICBpZiAoIWhpdCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYnV0IG1pc3NlcyFgKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhpdCAtIGNhbGN1bGF0ZSBkYW1hZ2VcclxuICAgICAgICBjb25zdCBkYW1hZ2UgPSBhdHRhY2tlci5tZWxlZURhbWFnZS5yb2xsKHRoaXMucm5nKVxyXG4gICAgICAgIG91dHB1dC53YXJuaW5nKGAke2F0dGFja2VyLm5hbWV9ICR7YXR0YWNrVmVyYn0gJHtkZWZlbmRlci5uYW1lfSBhbmQgaGl0cyBmb3IgJHtkYW1hZ2V9IGRhbWFnZSFgKVxyXG4gICAgICAgIGRlZmVuZGVyLmhlYWx0aCAtPSBkYW1hZ2VcclxuXHJcbiAgICAgICAgaWYgKGRlZmVuZGVyLmhlYWx0aCA8IDApIHtcclxuICAgICAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7ZGVmZW5kZXIubmFtZX0gaGFzIGJlZW4gZGVmZWF0ZWQgYW5kICR7YXR0YWNrZXIubmFtZX0gcmVjZWl2ZXMgJHtkZWZlbmRlci5leHBlcmllbmNlfSBleHBlcmllbmNlIGFuZCAke2RlZmVuZGVyLmdvbGR9IGdvbGRgKVxyXG4gICAgICAgICAgICBhdHRhY2tlci5leHBlcmllbmNlICs9IGRlZmVuZGVyLmV4cGVyaWVuY2VcclxuICAgICAgICAgICAgYXR0YWNrZXIuZ29sZCArPSBkZWZlbmRlci5nb2xkXHJcbiAgICAgICAgICAgIHRoaXMubWFwLm1vbnN0ZXJzLmRlbGV0ZShkZWZlbmRlcilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwcm9jZXNzUGxheWVyUmFuZ2VkQXR0YWNrKGRlZmVuZGVyOiBybC5Nb25zdGVyKSB7XHJcbiAgICAgICAgLy8gYmFzZSA0MCUgY2hhbmNlIHRvIGhpdFxyXG4gICAgICAgIC8vIDEwJSBib251cyAvIHBlbmFsdHkgZm9yIGV2ZXJ5IHBvaW50IGRpZmZlcmVuY2UgYmV0d2VlbiBhdHRhY2sgYW5kIGRlZmVuc2VcclxuICAgICAgICAvLyBib3R0b21zIG91dCBhdCA1JSAtIGFsd2F5cyBTT01FIGNoYW5jZSB0byBoaXRcclxuICAgICAgICBjb25zdCBhdHRhY2tlciA9IHRoaXMubWFwLnBsYXllci50aGluZ1xyXG4gICAgICAgIGlmICghYXR0YWNrZXIucmFuZ2VkV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBsYXllciBoYXMgbm8gcmFuZ2VkIHdlYXBvbiBlcXVpcHBlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgYm9udXMgPSAoYXR0YWNrZXIucmFuZ2VkQXR0YWNrIC0gZGVmZW5kZXIuZGVmZW5zZSkgKiAuMVxyXG4gICAgICAgIGNvbnN0IGhpdENoYW5jZSA9IE1hdGgubWluKE1hdGgubWF4KC42ICsgYm9udXMsIC4wNSksIC45NSlcclxuICAgICAgICBjb25zdCBoaXQgPSByYW5kLmNoYW5jZSh0aGlzLnJuZywgaGl0Q2hhbmNlKVxyXG4gICAgICAgIGNvbnN0IHdlYXBvbiA9IGF0dGFja2VyLnJhbmdlZFdlYXBvblxyXG4gICAgICAgIGNvbnN0IGF0dGFja1ZlcmIgPSB3ZWFwb24udmVyYiA/IHdlYXBvbi52ZXJiIDogXCJhdHRhY2tzXCJcclxuICAgICAgICBhdHRhY2tlci5hY3Rpb24gLT0gd2VhcG9uLmFjdGlvblxyXG5cclxuICAgICAgICBpZiAoIWhpdCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYnV0IG1pc3NlcyFgKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhpdCAtIGNhbGN1bGF0ZSBkYW1hZ2VcclxuICAgICAgICBjb25zdCBkYW1hZ2UgPSBhdHRhY2tlci5yYW5nZWREYW1hZ2U/LnJvbGwodGhpcy5ybmcpID8/IDBcclxuICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYW5kIGhpdHMgZm9yICR7ZGFtYWdlfSBkYW1hZ2UhYClcclxuICAgICAgICBkZWZlbmRlci5oZWFsdGggLT0gZGFtYWdlXHJcblxyXG4gICAgICAgIGlmIChkZWZlbmRlci5oZWFsdGggPCAwKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke2RlZmVuZGVyLm5hbWV9IGhhcyBiZWVuIGRlZmVhdGVkIGFuZCAke2F0dGFja2VyLm5hbWV9IHJlY2VpdmVzICR7ZGVmZW5kZXIuZXhwZXJpZW5jZX0gZXhwZXJpZW5jZWApXHJcbiAgICAgICAgICAgIGF0dGFja2VyLmV4cGVyaWVuY2UgKz0gZGVmZW5kZXIuZXhwZXJpZW5jZVxyXG4gICAgICAgICAgICB0aGlzLm1hcC5tb25zdGVycy5kZWxldGUoZGVmZW5kZXIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHJvY2Vzc01vbnN0ZXJBdHRhY2soYXR0YWNrZXI6IHJsLk1vbnN0ZXIsIGF0dGFjazogcmwuQXR0YWNrKSB7XHJcbiAgICAgICAgLy8gYmFzZSA2MCUgY2hhbmNlIHRvIGhpdFxyXG4gICAgICAgIC8vIDEwJSBib251cyAvIHBlbmFsdHkgZm9yIGV2ZXJ5IHBvaW50IGRpZmZlcmVuY2UgYmV0d2VlbiBhdHRhY2sgYW5kIGRlZmVuc2VcclxuICAgICAgICAvLyBjbGFtcHMgdG8gb3V0IGF0IFs1LCA5NV0gLSBhbHdheXMgU09NRSBjaGFuY2UgdG8gaGl0IG9yIG1pc3NcclxuICAgICAgICAvLyBjaG9vc2UgYW4gYXR0YWNrIGZyb20gcmVwZXJ0b2lyZSBvZiBtb25zdGVyXHJcbiAgICAgICAgY29uc3QgZGVmZW5kZXIgPSB0aGlzLm1hcC5wbGF5ZXIudGhpbmdcclxuICAgICAgICBjb25zdCBib251cyA9IChhdHRhY2suYXR0YWNrIC0gZGVmZW5kZXIuZGVmZW5zZSkgKiAuMVxyXG4gICAgICAgIGNvbnN0IGhpdENoYW5jZSA9IE1hdGgubWF4KC42ICsgYm9udXMsIC4wNSlcclxuICAgICAgICBjb25zdCBoaXQgPSByYW5kLmNoYW5jZSh0aGlzLnJuZywgaGl0Q2hhbmNlKVxyXG4gICAgICAgIGNvbnN0IGF0dGFja1ZlcmIgPSBhdHRhY2sudmVyYiA/IGF0dGFjay52ZXJiIDogXCJhdHRhY2tzXCJcclxuICAgICAgICBhdHRhY2tlci5hY3Rpb24gLT0gYXR0YWNrLmFjdGlvblxyXG5cclxuICAgICAgICBpZiAoIWhpdCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYnV0IG1pc3NlcyFgKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhpdCAtIGNhbGN1bGF0ZSBkYW1hZ2VcclxuICAgICAgICBjb25zdCBkYW1hZ2UgPSBhdHRhY2suZGFtYWdlLnJvbGwodGhpcy5ybmcpXHJcbiAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7YXR0YWNrZXIubmFtZX0gJHthdHRhY2tWZXJifSAke2RlZmVuZGVyLm5hbWV9IGFuZCBoaXRzIGZvciAke2RhbWFnZX0gZGFtYWdlIWApXHJcbiAgICAgICAgZGVmZW5kZXIuaGVhbHRoIC09IGRhbWFnZVxyXG5cclxuICAgICAgICBpZiAoZGVmZW5kZXIuaGVhbHRoIDw9IDApIHtcclxuICAgICAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7ZGVmZW5kZXIubmFtZX0gaGFzIGJlZW4gZGVmZWF0ZWQhYClcclxuICAgICAgICAgICAgY2xlYXJTdGF0ZSgpXHJcbiAgICAgICAgICAgIHRoaXMuZGVmZWF0RGlhbG9nLnNob3coKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZU1vbnN0ZXJTdGF0ZXMoKSB7XHJcbiAgICAgICAgZm9yIChjb25zdCBtb25zdGVyIG9mIHRoaXMubWFwLm1vbnN0ZXJzKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlTW9uc3RlclN0YXRlKG1vbnN0ZXIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlTW9uc3RlclN0YXRlKHBsYWNlZE1vbnN0ZXI6IG1hcHMuUGxhY2VkPHJsLk1vbnN0ZXI+KSB7XHJcbiAgICAgICAgLy8gYWdncm8gc3RhdGVcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGxldCB7IHBvc2l0aW9uLCB0aGluZzogbW9uc3RlciB9ID0gcGxhY2VkTW9uc3RlclxyXG4gICAgICAgIGNvbnN0IGxvcyA9IGhhc0xpbmVPZlNpZ2h0KG1hcCwgcG9zaXRpb24sIG1hcC5wbGF5ZXIucG9zaXRpb24pXHJcblxyXG4gICAgICAgIGlmIChtb25zdGVyLnN0YXRlICE9PSBybC5Nb25zdGVyU3RhdGUuYWdncm8gJiYgbG9zKSB7XHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgICAgICBtb25zdGVyLnN0YXRlID0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobW9uc3Rlci5zdGF0ZSA9PT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvICYmICFsb3MpIHtcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gPSAwXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuc3RhdGUgPSBybC5Nb25zdGVyU3RhdGUuaWRsZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHRpY2tNb25zdGVyKG1vbnN0ZXJQb3NpdGlvbjogZ2VvLlBvaW50LCBtb25zdGVyOiBybC5Nb25zdGVyKSB7XHJcbiAgICAgICAgLy8gaWYgcGxheWVyIGlzIHdpdGhpbiByZWFjaCAoYW5kIGFsaXZlKSwgYXR0YWNrXHJcbiAgICAgICAgbGV0IHsgcG9zaXRpb246IHBsYXllclBvc2l0aW9uLCB0aGluZzogcGxheWVyIH0gPSB0aGlzLm1hcC5wbGF5ZXJcclxuXHJcbiAgICAgICAgLy8gZmlyc3QgYXR0ZW1wdCB0byBhdHRhY2tcclxuICAgICAgICBpZiAocGxheWVyLmhlYWx0aCA+IDApIHtcclxuICAgICAgICAgICAgY29uc3QgZGlzdGFuY2VUb1BsYXllciA9IGdlby5jYWxjTWFuaGF0dGVuRGlzdChwbGF5ZXJQb3NpdGlvbiwgbW9uc3RlclBvc2l0aW9uKVxyXG4gICAgICAgICAgICBjb25zdCBhdHRhY2tzID0gbW9uc3Rlci5hdHRhY2tzLmZpbHRlcihhID0+IGEucmFuZ2UgPj0gZGlzdGFuY2VUb1BsYXllcilcclxuICAgICAgICAgICAgaWYgKGF0dGFja3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYXR0YWNrID0gcmFuZC5jaG9vc2UodGhpcy5ybmcsIGF0dGFja3MpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NNb25zdGVyQXR0YWNrKG1vbnN0ZXIsIGF0dGFjaylcclxuICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBkZXRlcm1pbmUgd2hldGhlciBtb25zdGVyIGNhbiBzZWUgcGxheWVyXHJcbiAgICAgICAgLy8gc2VlayBhbmQgZGVzdHJveVxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgY29uc3QgcGF0aCA9IG1hcHMuZmluZFBhdGgobWFwLCBtb25zdGVyUG9zaXRpb24sIHBsYXllclBvc2l0aW9uKVxyXG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAvLyBwYXNzXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gcGF0aFswXVxyXG4gICAgICAgIGlmIChtYXAuaXNQYXNzYWJsZShwb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25zLmluc2VydChtb25zdGVyLCBtb25zdGVyUG9zaXRpb24sIHBvc2l0aW9uLCBBcHAubW92ZUFuaW1hdGlvbkR1cmF0aW9uKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZVJlc2l6ZSgpIHtcclxuICAgICAgICBjb25zdCBjYW52YXMgPSB0aGlzLmNhbnZhc1xyXG4gICAgICAgIGlmIChjYW52YXMud2lkdGggPT09IGNhbnZhcy5jbGllbnRXaWR0aCAmJiBjYW52YXMuaGVpZ2h0ID09PSBjYW52YXMuY2xpZW50SGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IGNhbnZhcy5jbGllbnRIZWlnaHRcclxuICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHkoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlSW5wdXQoKSB7XHJcbiAgICAgICAgY29uc3QgaW5wID0gdGhpcy5pbnBcclxuXHJcbiAgICAgICAgLy8gdGFyZ2V0XHJcbiAgICAgICAgaWYgKHRoaXMuY3Vyc29yUG9zaXRpb24gJiYgKGlucC5wcmVzc2VkKGlucHV0LktleS5FbnRlcikgfHwgaW5wLnByZXNzZWQoXCIgXCIpKSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZUN1cnNvclRhcmdldCgpXHJcbiAgICAgICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY3RybC1rZXkgY3Vyc29yIG1vdmVtZW50XHJcbiAgICAgICAgaWYgKHRoaXMuaGFuZGxlQ3Vyc29yS2V5Ym9hcmRNb3ZlbWVudCgpKSB7XHJcbiAgICAgICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaGFuZGxlUGxheWVyS2V5Ym9hcmRNb3ZlbWVudCgpKSB7XHJcbiAgICAgICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY2xpY2sgb24gb2JqZWN0XHJcbiAgICAgICAgaWYgKHRoaXMuaGFuZGxlQ2xpY2soKSkge1xyXG4gICAgICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIG1vdXNlL3RvdWNoIG1vdmVtZW50XHJcbiAgICAgICAgaWYgKHRoaXMuaGFuZGxlUGxheWVyTW91c2VNb3ZlbWVudCgpKSB7XHJcbiAgICAgICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaW5wLmZsdXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUN1cnNvcktleWJvYXJkTW92ZW1lbnQoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgY29uc3QgaW5wID0gdGhpcy5pbnBcclxuICAgICAgICBpZiAoIWlucC5oZWxkKGlucHV0LktleS5Db250cm9sKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHsgcG9zaXRpb246IHBsYXllclBvc2l0aW9uLCB0aGluZzogcGxheWVyIH0gPSB0aGlzLm1hcC5wbGF5ZXJcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmN1cnNvclBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3Vyc29yUG9zaXRpb24gPSBwbGF5ZXJQb3NpdGlvbi5jbG9uZSgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLmhlbGQoXCJ3XCIpIHx8IGlucC5oZWxkKFwiV1wiKSB8fCBpbnAuaGVsZChcIkFycm93VXBcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVDdXJzb3JNb3ZlKERpcmVjdGlvbi5Ob3J0aClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAuaGVsZChcInNcIikgfHwgaW5wLmhlbGQoXCJTXCIpIHx8IGlucC5oZWxkKFwiQXJyb3dEb3duXCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlQ3Vyc29yTW92ZShEaXJlY3Rpb24uU291dGgpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLmhlbGQoXCJhXCIpIHx8IGlucC5oZWxkKFwiQVwiKSB8fCBpbnAuaGVsZChcIkFycm93TGVmdFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZUN1cnNvck1vdmUoRGlyZWN0aW9uLldlc3QpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLmhlbGQoXCJkXCIpIHx8IGlucC5oZWxkKFwiRFwiKSB8fCBpbnAuaGVsZChcIkFycm93UmlnaHRcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVDdXJzb3JNb3ZlKERpcmVjdGlvbi5FYXN0KVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUNsaWNrKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIC8vIGRldGVybWluZSB0aGUgbWFwIGNvb3JkaW5hdGVzIHRoZSB1c2VyIGNsaWNrZWQgb25cclxuICAgICAgICBjb25zdCBpbnAgPSB0aGlzLmlucFxyXG5cclxuICAgICAgICBpZiAoIWlucC5tb3VzZUxlZnRSZWxlYXNlZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhhbmRsZVRhcmdldENvbW1hbmRDbGljaygpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBteHkgPSB0aGlzLmNhbnZhc1RvTWFwUG9pbnQobmV3IGdlby5Qb2ludChpbnAubW91c2VYLCBpbnAubW91c2VZKSlcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGNvbnN0IHsgcG9zaXRpb246IHBsYXllclBvc2l0aW9uLCB0aGluZzogcGxheWVyIH0gPSB0aGlzLm1hcC5wbGF5ZXJcclxuXHJcbiAgICAgICAgY29uc3QgY2xpY2tGaXh0dXJlID0gbWFwLmZpeHR1cmVBdChteHkpXHJcbiAgICAgICAgaWYgKGNsaWNrRml4dHVyZSAmJiBjbGlja0ZpeHR1cmUgaW5zdGFuY2VvZiBybC5Eb29yKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlT3BlbihjbGlja0ZpeHR1cmUpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfSBlbHNlIGlmIChjbGlja0ZpeHR1cmUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYFlvdSBzZWUgJHtjbGlja0ZpeHR1cmUubmFtZX1gKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY2xpY2tNb25zdGVyID0gbWFwLm1vbnN0ZXJBdChteHkpXHJcbiAgICAgICAgLy8gZmlyc3QsIHRyeSBtZWxlZVxyXG4gICAgICAgIGlmIChjbGlja01vbnN0ZXIpIHtcclxuICAgICAgICAgICAgY29uc3QgZGlzdCA9IGdlby5jYWxjTWFuaGF0dGVuRGlzdChwbGF5ZXJQb3NpdGlvbiwgbXh5KVxyXG4gICAgICAgICAgICBjb25zdCBtZWxlZVdlYXBvbiA9IHBsYXllci5tZWxlZVdlYXBvbiA/PyB0aGluZ3MuZmlzdHNcclxuICAgICAgICAgICAgY29uc3QgcmFuZ2VkV2VhcG9uID0gcGxheWVyLnJhbmdlZFdlYXBvbiA/PyB0aGluZ3MuZmlzdHNcclxuXHJcbiAgICAgICAgICAgIGlmIChkaXN0IDw9IG1lbGVlV2VhcG9uLnJhbmdlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NQbGF5ZXJNZWxlZUF0dGFjayhjbGlja01vbnN0ZXIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZGlzdCA8PSByYW5nZWRXZWFwb24ucmFuZ2UpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1BsYXllclJhbmdlZEF0dGFjayhjbGlja01vbnN0ZXIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke2NsaWNrTW9uc3Rlci5uYW1lfWApXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZVBsYXllcktleWJvYXJkTW92ZW1lbnQoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgbGV0IGlucCA9IHRoaXMuaW5wXHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhhbmRsZVBsYXllcktleWJvYXJkUnVuSW50bygpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLmhlbGQoXCJ3XCIpIHx8IGlucC5oZWxkKFwiV1wiKSB8fCBpbnAuaGVsZChcIkFycm93VXBcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVNb3ZlKERpcmVjdGlvbi5Ob3J0aClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAuaGVsZChcInNcIikgfHwgaW5wLmhlbGQoXCJTXCIpIHx8IGlucC5oZWxkKFwiQXJyb3dEb3duXCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlTW92ZShEaXJlY3Rpb24uU291dGgpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLmhlbGQoXCJhXCIpIHx8IGlucC5oZWxkKFwiQVwiKSB8fCBpbnAuaGVsZChcIkFycm93TGVmdFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1vdmUoRGlyZWN0aW9uLldlc3QpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLmhlbGQoXCJkXCIpIHx8IGlucC5oZWxkKFwiRFwiKSB8fCBpbnAuaGVsZChcIkFycm93UmlnaHRcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVNb3ZlKERpcmVjdGlvbi5FYXN0KVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVQbGF5ZXJLZXlib2FyZFJ1bkludG8oKTogYm9vbGVhbiB7XHJcbiAgICAgICAgbGV0IGlucCA9IHRoaXMuaW5wXHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcIndcIikgfHwgaW5wLnByZXNzZWQoXCJXXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dVcFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZVJ1bkludG8oRGlyZWN0aW9uLk5vcnRoKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGlucC5wcmVzc2VkKFwic1wiKSB8fCBpbnAucHJlc3NlZChcIlNcIikgfHwgaW5wLnByZXNzZWQoXCJBcnJvd0Rvd25cIikpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVSdW5JbnRvKERpcmVjdGlvbi5Tb3V0aClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcImFcIikgfHwgaW5wLnByZXNzZWQoXCJBXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dMZWZ0XCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlUnVuSW50byhEaXJlY3Rpb24uV2VzdClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcImRcIikgfHwgaW5wLnByZXNzZWQoXCJEXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dSaWdodFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZVJ1bkludG8oRGlyZWN0aW9uLkVhc3QpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLnByZXNzZWQoXCIgXCIpKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKFwiUGFzc1wiKVxyXG4gICAgICAgICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLm1hcC5wbGF5ZXIudGhpbmdcclxuICAgICAgICAgICAgcGxheWVyLmFjdGlvblJlc2VydmUgKz0gcGxheWVyLmFjdGlvblxyXG4gICAgICAgICAgICBwbGF5ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVQbGF5ZXJNb3VzZU1vdmVtZW50KCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGNvbnN0IGlucCA9IHRoaXMuaW5wXHJcbiAgICAgICAgaWYgKCFpbnAubW91c2VMZWZ0SGVsZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBsYXllclBvc2l0aW9uID0gdGhpcy5tYXAucGxheWVyLnBvc2l0aW9uXHJcbiAgICAgICAgY29uc3QgbXh5ID0gdGhpcy5jYW52YXNUb01hcFBvaW50KG5ldyBnZW8uUG9pbnQoaW5wLm1vdXNlWCwgaW5wLm1vdXNlWSkpXHJcbiAgICAgICAgY29uc3QgZHh5ID0gbXh5LnN1YlBvaW50KHBsYXllclBvc2l0aW9uKVxyXG4gICAgICAgIGNvbnN0IHNnbiA9IGR4eS5zaWduKClcclxuICAgICAgICBjb25zdCBhYnMgPSBkeHkuYWJzKClcclxuXHJcbiAgICAgICAgaWYgKGFicy54ID4gMCAmJiBhYnMueCA+PSBhYnMueSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1vdmUoc2duLnggPiAwID8gRGlyZWN0aW9uLkVhc3QgOiBEaXJlY3Rpb24uV2VzdClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChhYnMueSA+IDAgJiYgYWJzLnkgPiBhYnMueCkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1vdmUoc2duLnkgPiAwID8gRGlyZWN0aW9uLlNvdXRoIDogRGlyZWN0aW9uLk5vcnRoKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVPcGVuKGRvb3I6IHJsLkZpeHR1cmUpIHtcclxuICAgICAgICBvdXRwdXQuaW5mbyhgJHtkb29yLm5hbWV9IG9wZW5lZGApXHJcbiAgICAgICAgdGhpcy5tYXAuZml4dHVyZXMuZGVsZXRlKGRvb3IpXHJcbiAgICAgICAgdGhpcy5tYXAucGxheWVyLnRoaW5nLmFjdGlvbiAtPSAxXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVNb3ZlKGRpcjogRGlyZWN0aW9uKSB7XHJcbiAgICAgICAgLy8gY2xlYXIgY3Vyc29yIG9uIG1vdmVtZW50XHJcbiAgICAgICAgdGhpcy5jdXJzb3JQb3NpdGlvbiA9IHVuZGVmaW5lZFxyXG4gICAgICAgIGNvbnN0IHsgcG9zaXRpb246IHBsYXllclBvc2l0aW9uLCB0aGluZzogcGxheWVyIH0gPSB0aGlzLm1hcC5wbGF5ZXJcclxuXHJcbiAgICAgICAgbGV0IG5ld1Bvc2l0aW9uID0gcGxheWVyUG9zaXRpb24uYWRkUG9pbnQoZGlyZWN0aW9uVmVjdG9yKGRpcikpXHJcbiAgICAgICAgaWYgKCF0aGlzLm1hcC5pbkJvdW5kcyhuZXdQb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXRoaXMubWFwLmlzUGFzc2FibGUobmV3UG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5hbmltYXRpb25zLmluc2VydChwbGF5ZXIsIHBsYXllclBvc2l0aW9uLCBuZXdQb3NpdGlvbiwgQXBwLm1vdmVBbmltYXRpb25EdXJhdGlvbilcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZVJ1bkludG8oZGlyOiBEaXJlY3Rpb24pIHtcclxuICAgICAgICAvLyBjbGVhciBjdXJzb3Igb24gbW92ZW1lbnRcclxuICAgICAgICB0aGlzLmN1cnNvclBvc2l0aW9uID0gdW5kZWZpbmVkXHJcbiAgICAgICAgY29uc3QgeyBwb3NpdGlvbjogcGxheWVyUG9zaXRpb24sIHRoaW5nOiBwbGF5ZXIgfSA9IHRoaXMubWFwLnBsYXllclxyXG5cclxuICAgICAgICBsZXQgdGFyZ2V0UG9zaXRpb24gPSBwbGF5ZXJQb3NpdGlvbi5hZGRQb2ludChkaXJlY3Rpb25WZWN0b3IoZGlyKSlcclxuICAgICAgICBpZiAoIXRoaXMubWFwLmluQm91bmRzKHRhcmdldFBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgY29uc3QgbW9uc3RlciA9IG1hcC5tb25zdGVyQXQodGFyZ2V0UG9zaXRpb24pXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5wcm9jZXNzUGxheWVyTWVsZWVBdHRhY2sobW9uc3RlcilcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb250YWluZXIgPSBtYXAuY29udGFpbmVyQXQodGFyZ2V0UG9zaXRpb24pXHJcbiAgICAgICAgaWYgKGNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lckRpYWxvZy5zaG93KG1hcCwgY29udGFpbmVyKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGZpeHR1cmUgPSBtYXAuZml4dHVyZUF0KHRhcmdldFBvc2l0aW9uKVxyXG4gICAgICAgIGlmIChmaXh0dXJlIGluc3RhbmNlb2YgcmwuRG9vcikge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU9wZW4oZml4dHVyZSlcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfSBlbHNlIGlmIChmaXh0dXJlICYmICFmaXh0dXJlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBDYW4ndCBtb3ZlIHRoYXQgd2F5LCBibG9ja2VkIGJ5ICR7Zml4dHVyZS5uYW1lfWApXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZXhpdCA9IG1hcC5leGl0QXQodGFyZ2V0UG9zaXRpb24pXHJcbiAgICAgICAgaWYgKGV4aXQpIHtcclxuICAgICAgICAgICAgcGxheWVyLmFjdGlvbiAtPSAxXHJcbiAgICAgICAgICAgIG1hcC5wbGF5ZXIucG9zaXRpb24gPSB0YXJnZXRQb3NpdGlvblxyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZUV4aXQoZXhpdC5kaXJlY3Rpb24pXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUN1cnNvck1vdmUoZGlyOiBEaXJlY3Rpb24pIHtcclxuICAgICAgICBpZiAoIXRoaXMuY3Vyc29yUG9zaXRpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjbGVhciBjdXJzb3Igb24gbW92ZW1lbnRcclxuICAgICAgICBsZXQgbmV3UG9zaXRpb24gPSB0aGlzLmN1cnNvclBvc2l0aW9uLmFkZFBvaW50KGRpcmVjdGlvblZlY3RvcihkaXIpKVxyXG4gICAgICAgIGlmICghdGhpcy5tYXAuaW5Cb3VuZHMobmV3UG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jdXJzb3JBbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uKHRoaXMuY3Vyc29yUG9zaXRpb24sIG5ld1Bvc2l0aW9uLCB0aGlzLnRpbWUsIEFwcC5jdXJzb3JBbmltYXRpb25EdXJhdGlvbilcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUN1cnNvclRhcmdldCgpIHtcclxuICAgICAgICBjb25zdCBjdXJzb3JQb3NpdGlvbiA9IHRoaXMuY3Vyc29yUG9zaXRpb25cclxuICAgICAgICBpZiAoIWN1cnNvclBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBjb25zdCB0aWxlID0gbWFwLnRpbGVBdChjdXJzb3JQb3NpdGlvbilcclxuXHJcbiAgICAgICAgaWYgKCF0aWxlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKCdOb3RoaW5nIGhlcmUnKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChtYXAudmlzaWJpbGl0eUF0KGN1cnNvclBvc2l0aW9uKSAhPT0gbWFwcy5WaXNpYmlsaXR5LlZpc2libGUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYFRhcmdldCBub3QgdmlzaWJsZWApXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgeyBwb3NpdGlvbjogcGxheWVyUG9zaXRpb24sIHRoaW5nOiBwbGF5ZXIgfSA9IHRoaXMubWFwLnBsYXllclxyXG4gICAgICAgIGNvbnN0IGRpc3RUb1RhcmdldCA9IGdlby5jYWxjTWFuaGF0dGVuRGlzdChwbGF5ZXJQb3NpdGlvbiwgY3Vyc29yUG9zaXRpb24pXHJcbiAgICAgICAgY29uc3QgbW9uc3RlciA9IG1hcC5tb25zdGVyQXQoY3Vyc29yUG9zaXRpb24pXHJcblxyXG4gICAgICAgIGlmIChtb25zdGVyICYmIGRpc3RUb1RhcmdldCA8PSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc1BsYXllck1lbGVlQXR0YWNrKG1vbnN0ZXIpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIgJiYgZGlzdFRvVGFyZ2V0ID4gMSAmJiBwbGF5ZXIucmFuZ2VkV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc1BsYXllclJhbmdlZEF0dGFjayhtb25zdGVyKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IG1hcC5jb250YWluZXJBdChjdXJzb3JQb3NpdGlvbilcclxuICAgICAgICBpZiAoY29udGFpbmVyICYmIGRpc3RUb1RhcmdldCA8PSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyRGlhbG9nLnNob3cobWFwLCBjb250YWluZXIpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZml4dHVyZSA9IG1hcC5maXh0dXJlQXQoY3Vyc29yUG9zaXRpb24pXHJcbiAgICAgICAgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5Eb29yICYmIGRpc3RUb1RhcmdldCA8PSAxKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGAke2ZpeHR1cmUubmFtZX0gb3BlbmVkYClcclxuICAgICAgICAgICAgdGhpcy5tYXAuZml4dHVyZXMuZGVsZXRlKGZpeHR1cmUpXHJcbiAgICAgICAgICAgIHBsYXllci5hY3Rpb24gLT0gMVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGxhc3RseSAtIHBlcmZvcm0gYSBsb29rXHJcbiAgICAgICAgZm9yIChjb25zdCB0aCBvZiB0aGlzLm1hcC5hdChjdXJzb3JQb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYFlvdSBzZWUgJHt0aC5uYW1lfWApXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlVGFyZ2V0Q29tbWFuZENsaWNrKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5pbnAubW91c2VMZWZ0UmVsZWFzZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy50YXJnZXRDb21tYW5kID09PSBUYXJnZXRDb21tYW5kLk5vbmUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjeHkgPSBuZXcgZ2VvLlBvaW50KHRoaXMuaW5wLm1vdXNlWCwgdGhpcy5pbnAubW91c2VZKVxyXG4gICAgICAgIGNvbnN0IG14eSA9IHRoaXMuY2FudmFzVG9NYXBQb2ludChjeHkpXHJcblxyXG4gICAgICAgIGlmICghaGFzTGluZU9mU2lnaHQodGhpcy5tYXAsIHRoaXMubWFwLnBsYXllci5wb3NpdGlvbiwgbXh5KSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuZXJyb3IoYENhbid0IHNlZSFgKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3dpdGNoICh0aGlzLnRhcmdldENvbW1hbmQpIHtcclxuICAgICAgICAgICAgY2FzZSBUYXJnZXRDb21tYW5kLkxvb2s6IHtcclxuICAgICAgICAgICAgICAgIC8vIHNob3cgd2hhdCB1c2VyIGNsaWNrZWQgb25cclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdGggb2YgdGhpcy5tYXAuYXQobXh5KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5pbmZvKGBZb3Ugc2VlICR7dGgubmFtZX1gKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUYXJnZXRDb21tYW5kLkF0dGFjazoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbW9uc3RlciA9IHRoaXMubWFwLm1vbnN0ZXJBdChteHkpXHJcbiAgICAgICAgICAgICAgICBpZiAobW9uc3Rlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1BsYXllck1lbGVlQXR0YWNrKG1vbnN0ZXIpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5pbmZvKFwiTm90aGluZyB0byBhdHRhY2sgaGVyZS5cIilcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVGFyZ2V0Q29tbWFuZC5TaG9vdDoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbW9uc3RlciA9IHRoaXMubWFwLm1vbnN0ZXJBdChteHkpXHJcbiAgICAgICAgICAgICAgICBpZiAobW9uc3Rlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1BsYXllclJhbmdlZEF0dGFjayhtb25zdGVyKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuaW5mbyhcIk5vdGhpbmcgdG8gc2hvb3QgaGVyZS5cIilcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuTm9uZVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVWaXNpYmlsaXR5KCkge1xyXG4gICAgICAgIC8vIHVwZGF0ZSB2aXNpYmlsaXR5IGFyb3VuZCBwbGF5ZXJcclxuICAgICAgICAvLyBsaW1pdCByYWRpdXMgdG8gdmlzaWJsZSB2aWV3cG9ydCBhcmVhXHJcbiAgICAgICAgY29uc3Qgdmlld3BvcnRMaWdodFJhZGl1cyA9IE1hdGgubWF4KE1hdGguY2VpbCh0aGlzLmNhbnZhcy53aWR0aCAvIHRoaXMudGlsZVNpemUpLCBNYXRoLmNlaWwodGhpcy5jYW52YXMuaGVpZ2h0IC8gdGhpcy50aWxlU2l6ZSkpXHJcbiAgICAgICAgdGhpcy5tYXAudXBkYXRlVmlzaWJsZSh2aWV3cG9ydExpZ2h0UmFkaXVzKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FsY01hcFZpZXdwb3J0KCk6IGdlby5BQUJCIHtcclxuICAgICAgICBjb25zdCBhYWJiID0gbmV3IGdlby5BQUJCKFxyXG4gICAgICAgICAgICB0aGlzLmNhbnZhc1RvTWFwUG9pbnQobmV3IGdlby5Qb2ludCgwLCAwKSksXHJcbiAgICAgICAgICAgIHRoaXMuY2FudmFzVG9NYXBQb2ludChuZXcgZ2VvLlBvaW50KHRoaXMuY2FudmFzLndpZHRoICsgdGhpcy50aWxlU2l6ZSwgdGhpcy5jYW52YXMuaGVpZ2h0ICsgdGhpcy50aWxlU2l6ZSkpKVxyXG4gICAgICAgICAgICAuaW50ZXJzZWN0aW9uKG5ldyBnZW8uQUFCQihuZXcgZ2VvLlBvaW50KDAsIDApLCBuZXcgZ2VvLlBvaW50KHRoaXMubWFwLndpZHRoLCB0aGlzLm1hcC5oZWlnaHQpKSlcclxuXHJcbiAgICAgICAgcmV0dXJuIGFhYmJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyYXdGcmFtZSgpIHtcclxuICAgICAgICAvLyBjZW50ZXIgdGhlIGdyaWQgYXJvdW5kIHRoZSBwbGF5ZXJkXHJcbiAgICAgICAgY29uc3Qgdmlld3BvcnRBQUJCID0gdGhpcy5jYWxjTWFwVmlld3BvcnQoKVxyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHRoaXMuZ2V0U2Nyb2xsT2Zmc2V0KClcclxuXHJcbiAgICAgICAgLy8gbm90ZSAtIGRyYXdpbmcgb3JkZXIgbWF0dGVycyAtIGRyYXcgZnJvbSBib3R0b20gdG8gdG9wXHJcbiAgICAgICAgaWYgKHRoaXMudGFyZ2V0Q29tbWFuZCAhPT0gVGFyZ2V0Q29tbWFuZC5Ob25lKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2FudmFzLnN0eWxlLmN1cnNvciA9IFwiY3Jvc3NoYWlyXCJcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmNhbnZhcy5zdHlsZS5jdXJzb3IgPSBcIlwiXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNob290QnV0dG9uLmRpc2FibGVkID0gIXRoaXMubWFwLnBsYXllci50aGluZy5yYW5nZWRXZWFwb25cclxuXHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBjb25zdCB0aWxlcyA9IG1hcC50aWxlcy53aXRoaW4odmlld3BvcnRBQUJCKVxyXG4gICAgICAgIGNvbnN0IGZpeHR1cmVzID0gbWFwLmZpeHR1cmVzLndpdGhpbih2aWV3cG9ydEFBQkIpXHJcbiAgICAgICAgY29uc3QgZXhpdHMgPSBtYXAuZXhpdHMud2l0aGluKHZpZXdwb3J0QUFCQilcclxuICAgICAgICBjb25zdCBjb250YWluZXJzID0gbWFwLmNvbnRhaW5lcnMud2l0aGluKHZpZXdwb3J0QUFCQilcclxuICAgICAgICBjb25zdCBtb25zdGVycyA9IG1hcC5tb25zdGVycy53aXRoaW4odmlld3BvcnRBQUJCKVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHRpbGUgb2YgdGlsZXMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCB0aWxlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBmaXh0dXJlIG9mIGZpeHR1cmVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgZml4dHVyZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgZXhpdCBvZiBleGl0cykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIGV4aXQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGNvbnRhaW5lciBvZiBjb250YWluZXJzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgY29udGFpbmVyKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBjcmVhdHVyZSBvZiBtb25zdGVycykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIGNyZWF0dXJlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCB0aGlzLm1hcC5wbGF5ZXIpXHJcbiAgICAgICAgdGhpcy5kcmF3SGVhbHRoQmFyKG9mZnNldCwgdGhpcy5tYXAucGxheWVyKVxyXG4gICAgICAgIHRoaXMuZHJhd0N1cnNvcihvZmZzZXQpXHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZmx1c2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd1RoaW5nKG9mZnNldDogZ2VvLlBvaW50LCBwbGFjZWRUaGluZzogbWFwcy5QbGFjZWQ8cmwuVGhpbmc+KSB7XHJcbiAgICAgICAgY29uc3QgeyBwb3NpdGlvbiwgdGhpbmcgfSA9IHBsYWNlZFRoaW5nXHJcbiAgICAgICAgY29uc3QgdmlzaWJsZSA9IHRoaXMubWFwLnZpc2liaWxpdHlBdChwb3NpdGlvbilcclxuICAgICAgICBjb25zdCBzZWVuID0gdGhpcy5tYXAuc2VlbkF0KHBvc2l0aW9uKVxyXG4gICAgICAgIGNvbnN0IGZvZyA9ICh2aXNpYmxlID09PSBtYXBzLlZpc2liaWxpdHkuTm9uZSB8fCB2aXNpYmxlID09PSBtYXBzLlZpc2liaWxpdHkuRGFyaylcclxuICAgICAgICAgICAgJiYgc2VlblxyXG4gICAgICAgICAgICAmJiAodGhpbmcgaW5zdGFuY2VvZiBybC5UaWxlIHx8IHRoaW5nIGluc3RhbmNlb2YgcmwuRml4dHVyZSlcclxuXHJcbiAgICAgICAgaWYgKCh2aXNpYmxlID09PSBtYXBzLlZpc2liaWxpdHkuTm9uZSB8fCB2aXNpYmxlID09IG1hcHMuVmlzaWJpbGl0eS5EYXJrKSAmJiAhZm9nKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29sb3IgPSB0aGluZy5jb2xvci5jbG9uZSgpXHJcbiAgICAgICAgaWYgKGZvZykge1xyXG4gICAgICAgICAgICBjb2xvci5hID0gLjI1XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRyYXdJbWFnZShvZmZzZXQsIHRoaXMuYW5pbWF0aW9ucy5wb3NpdGlvbih0aGluZykgPz8gcG9zaXRpb24sIHRoaW5nLmltYWdlLCBjb2xvcilcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyYXdDdXJzb3Iob2Zmc2V0OiBnZW8uUG9pbnQpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY3Vyc29yUG9zaXRpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMuY3Vyc29yQW5pbWF0aW9uPy5wb3NpdGlvbiA/PyB0aGlzLmN1cnNvclBvc2l0aW9uXHJcbiAgICAgICAgdGhpcy5kcmF3SW1hZ2Uob2Zmc2V0LCBwb3NpdGlvbiwgXCIuL2Fzc2V0cy9jdXJzb3IucG5nXCIsIGdmeC5Db2xvci5yZWQpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkcmF3SW1hZ2Uob2Zmc2V0OiBnZW8uUG9pbnQsIHBvc2l0aW9uOiBnZW8uUG9pbnQsIGltYWdlOiBzdHJpbmcsIGNvbG9yOiBnZnguQ29sb3IgPSBnZnguQ29sb3Iud2hpdGUpIHtcclxuICAgICAgICBjb25zdCBzcHJpdGVQb3NpdGlvbiA9IHBvc2l0aW9uLm11bFNjYWxhcih0aGlzLnRpbGVTaXplKS5hZGRQb2ludChvZmZzZXQpXHJcbiAgICAgICAgY29uc3QgbGF5ZXIgPSB0aGlzLmltYWdlTWFwLmdldChpbWFnZSlcclxuXHJcbiAgICAgICAgaWYgKGxheWVyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGltYWdlIG1hcHBpbmc6ICR7aW1hZ2V9YClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHNwcml0ZSA9IG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLFxyXG4gICAgICAgICAgICBjb2xvcixcclxuICAgICAgICAgICAgd2lkdGg6IHRoaXMudGlsZVNpemUsXHJcbiAgICAgICAgICAgIGhlaWdodDogdGhpcy50aWxlU2l6ZSxcclxuICAgICAgICAgICAgdGV4dHVyZTogdGhpcy50ZXh0dXJlLFxyXG4gICAgICAgICAgICBsYXllcjogbGF5ZXIsXHJcbiAgICAgICAgICAgIGZsYWdzOiBnZnguU3ByaXRlRmxhZ3MuQXJyYXlUZXh0dXJlXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3U3ByaXRlKHNwcml0ZSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyYXdIZWFsdGhCYXIob2Zmc2V0OiBnZW8uUG9pbnQsIHBsYWNlZENyZWF0dXJlOiBtYXBzLlBsYWNlZDxybC5DcmVhdHVyZT4pIHtcclxuICAgICAgICBjb25zdCB7IHBvc2l0aW9uLCB0aGluZzogY3JlYXR1cmUgfSA9IHBsYWNlZENyZWF0dXJlXHJcbiAgICAgICAgY29uc3QgaGVhbHRoID0gTWF0aC5tYXgoY3JlYXR1cmUuaGVhbHRoLCAwKVxyXG4gICAgICAgIGNvbnN0IGJvcmRlcldpZHRoID0gaGVhbHRoICogNCArIDJcclxuICAgICAgICBjb25zdCBpbnRlcmlvcldpZHRoID0gaGVhbHRoICogNFxyXG4gICAgICAgIGNvbnN0IHNwcml0ZVBvc2l0aW9uID0gcG9zaXRpb24ubXVsU2NhbGFyKHRoaXMudGlsZVNpemUpLmFkZFBvaW50KG9mZnNldCkuc3ViUG9pbnQobmV3IGdlby5Qb2ludCgwLCB0aGlzLnRpbGVTaXplIC8gMikpXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3U3ByaXRlKG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLFxyXG4gICAgICAgICAgICBjb2xvcjogZ2Z4LkNvbG9yLndoaXRlLFxyXG4gICAgICAgICAgICB3aWR0aDogYm9yZGVyV2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodDogOFxyXG4gICAgICAgIH0pKVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdTcHJpdGUobmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24uYWRkUG9pbnQobmV3IGdlby5Qb2ludCgxLCAxKSksXHJcbiAgICAgICAgICAgIGNvbG9yOiBnZnguQ29sb3IucmVkLFxyXG4gICAgICAgICAgICB3aWR0aDogaW50ZXJpb3JXaWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0OiA2XHJcbiAgICAgICAgfSkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoaWRlRGlhbG9ncygpIHtcclxuICAgICAgICB0aGlzLmludmVudG9yeURpYWxvZy5oaWRlKClcclxuICAgICAgICB0aGlzLnN0YXRzRGlhbG9nLmhpZGUoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IHRpbGVTaXplKCkge1xyXG4gICAgICAgIHJldHVybiBybC50aWxlU2l6ZSAqIHRoaXMuem9vbVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlS2V5RG93bihldjogS2V5Ym9hcmRFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IGtleSA9IGV2LmtleS50b1VwcGVyQ2FzZSgpXHJcblxyXG4gICAgICAgIHN3aXRjaCAoa2V5KSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJJXCI6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHdhc0hpZGRlbiA9IHRoaXMuaW52ZW50b3J5RGlhbG9nLmhpZGRlblxyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlRGlhbG9ncygpXHJcbiAgICAgICAgICAgICAgICBpZiAod2FzSGlkZGVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnZlbnRvcnlEaWFsb2cuc2hvdygpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICAvLyBjYXNlIFwiTFwiOiB7XHJcbiAgICAgICAgICAgIC8vICAgICB0aGlzLmxldmVsRGlhbG9nLnNob3coKVxyXG4gICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgIC8vICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIlpcIjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgd2FzSGlkZGVuID0gdGhpcy5zdGF0c0RpYWxvZy5oaWRkZW5cclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZURpYWxvZ3MoKVxyXG4gICAgICAgICAgICAgICAgaWYgKHdhc0hpZGRlbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdHNEaWFsb2cuc2hvdygpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIFwiTFwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5Mb29rXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnNvclBvc2l0aW9uID0gdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIkVOVEVSXCI6XHJcbiAgICAgICAgICAgICAgICBpZiAoZXYuY3RybEtleSAmJiB0aGlzLm1hcC5wbGF5ZXIudGhpbmcucmFuZ2VkV2VhcG9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5TaG9vdFxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLkF0dGFja1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCJFU0NBUEVcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuTm9uZVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJzb3JQb3NpdGlvbiA9IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCI9XCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnpvb20gPSBNYXRoLm1pbih0aGlzLnpvb20gKiAyLCAxNilcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eSgpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIi1cIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuem9vbSA9IE1hdGgubWF4KHRoaXMuem9vbSAvIDIsIC4xMjUpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHkoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzYXZlU3RhdGUoKSB7XHJcbiAgICAgICAgLy8gc2F2ZSB0aGUgY3VycmVudCBnYW1lIHN0YXRlXHJcbiAgICAgICAgdmFyIHN0YXRlOiBBcHBTYXZlU3RhdGUgPSB7XHJcbiAgICAgICAgICAgIHJuZzogdGhpcy5ybmcuc2F2ZSgpLFxyXG4gICAgICAgICAgICBmbG9vcjogdGhpcy5mbG9vcixcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGpzb25TdGF0ZSA9IEpTT04uc3RyaW5naWZ5KHN0YXRlKVxyXG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFNUT1JBR0VfS0VZLCBqc29uU3RhdGUpXHJcblxyXG4gICAgICAgIHRoaXMuc2F2ZU1hcCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzYXZlTWFwKCkge1xyXG4gICAgICAgIGNvbnN0IHN0YXRlID0gdGhpcy5tYXAuc2F2ZSgpXHJcbiAgICAgICAgY29uc3QganNvblN0YXRlID0gSlNPTi5zdHJpbmdpZnkoc3RhdGUpXHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oYCR7U1RPUkFHRV9LRVl9X01BUF8ke3RoaXMuZmxvb3J9YCwganNvblN0YXRlKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlRXhpdChkaXI6IHJsLkV4aXREaXJlY3Rpb24pIHtcclxuICAgICAgICBpZiAoZGlyID09IHJsLkV4aXREaXJlY3Rpb24uVXAgJiYgdGhpcy5mbG9vciA9PSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvcERpYWxvZy5zaG93KClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyByZW1vdmUgcGxheWVyIGZyb20gZmxvb3IsIHNhdmUgZmxvb3JcclxuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLm1hcC5wbGF5ZXIudGhpbmdcclxuICAgICAgICB0aGlzLm1hcC5wbGF5ZXJzLmRlbGV0ZShwbGF5ZXIpXHJcbiAgICAgICAgdGhpcy5zYXZlTWFwKClcclxuXHJcbiAgICAgICAgc3dpdGNoIChkaXIpIHtcclxuICAgICAgICAgICAgY2FzZSBybC5FeGl0RGlyZWN0aW9uLlVwOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5mbG9vciAtPSAxXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICBjYXNlIHJsLkV4aXREaXJlY3Rpb24uRG93bjpcclxuICAgICAgICAgICAgICAgIHRoaXMuZmxvb3IgKz0gMVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubWFwID0gbG9hZE1hcCh0aGlzLmZsb29yKSA/PyBnZW4uZ2VuZXJhdGVEdW5nZW9uTGV2ZWwodGhpcy5ybmcsIHRoaW5ncy5kYiwgdGhpcy5mbG9vcilcclxuICAgICAgICBjb25zdCBwbGFjZURpciA9IGRpciA9PT0gcmwuRXhpdERpcmVjdGlvbi5VcCA/IHJsLkV4aXREaXJlY3Rpb24uRG93biA6IHJsLkV4aXREaXJlY3Rpb24uVXBcclxuICAgICAgICBwbGFjZVBsYXllckF0RXhpdCh0aGlzLm1hcCwgcGxheWVyLCBwbGFjZURpcilcclxuICAgICAgICBjb25zdCBbdGV4dHVyZSwgaW1hZ2VNYXBdID0gYXdhaXQgbG9hZEltYWdlcyh0aGlzLnJlbmRlcmVyLCB0aGlzLm1hcClcclxuICAgICAgICB0aGlzLnRleHR1cmUgPSB0ZXh0dXJlXHJcbiAgICAgICAgdGhpcy5pbWFnZU1hcCA9IGltYWdlTWFwXHJcbiAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5KClcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgYXN5bmMgbG9hZChyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyKTogUHJvbWlzZTxBcHAgfCBudWxsPiB7XHJcbiAgICAgICAgY29uc3QganNvbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFNUT1JBR0VfS0VZKVxyXG4gICAgICAgIGlmICghanNvbikge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBKU09OLnBhcnNlKGpzb24pIGFzIEFwcFNhdmVTdGF0ZVxyXG4gICAgICAgIGNvbnN0IHJuZyA9IG5ldyByYW5kLlNGQzMyUk5HKC4uLnN0YXRlLnJuZylcclxuXHJcbiAgICAgICAgY29uc3QgbWFwID0gbG9hZE1hcChzdGF0ZS5mbG9vcilcclxuICAgICAgICBpZiAoIW1hcCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gbG9hZCBtYXAhXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBbdGV4dHVyZSwgaW1hZ2VNYXBdID0gYXdhaXQgbG9hZEltYWdlcyhyZW5kZXJlciwgbWFwKVxyXG4gICAgICAgIGNvbnN0IGFwcCA9IG5ldyBBcHAocm5nLCByZW5kZXJlciwgc3RhdGUuZmxvb3IsIG1hcCwgdGV4dHVyZSwgaW1hZ2VNYXApXHJcbiAgICAgICAgcmV0dXJuIGFwcFxyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgQXBwU2F2ZVN0YXRlIHtcclxuICAgIHJlYWRvbmx5IHJuZzogW251bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl1cclxuICAgIHJlYWRvbmx5IGZsb29yOiBudW1iZXJcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gbG9hZEltYWdlcyhyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBtYXA6IG1hcHMuTWFwKTogUHJvbWlzZTxbZ2Z4LlRleHR1cmUsIE1hcDxzdHJpbmcsIG51bWJlcj5dPiB7XHJcbiAgICAvLyBiYWtlIGFsbCAyNHgyNCB0aWxlIGltYWdlcyB0byBhIHNpbmdsZSBhcnJheSB0ZXh0dXJlXHJcbiAgICAvLyBzdG9yZSBtYXBwaW5nIGZyb20gaW1hZ2UgdXJsIHRvIGluZGV4XHJcbiAgICBjb25zdCBpbWFnZVVybHMgPSBpdGVyLndyYXAobWFwLnRoaW5ncygpKS5tYXAodGggPT4gdGguaW1hZ2UpLmZpbHRlcigpLmRpc3RpbmN0KCkudG9BcnJheSgpXHJcbiAgICBpbWFnZVVybHMucHVzaChcIi4vYXNzZXRzL2N1cnNvci5wbmdcIilcclxuXHJcbiAgICBjb25zdCBpbWFnZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KGltYWdlVXJscy5tYXAoKHVybCwgaSkgPT4gW3VybCwgaV0pKVxyXG4gICAgY29uc3QgaW1hZ2VzID0gYXdhaXQgUHJvbWlzZS5hbGwoaW1hZ2VVcmxzLm1hcCh1cmwgPT4gZG9tLmxvYWRJbWFnZSh1cmwpKSlcclxuICAgIGNvbnN0IHRleHR1cmUgPSByZW5kZXJlci5iYWtlVGV4dHVyZUFycmF5KHJsLnRpbGVTaXplLCBybC50aWxlU2l6ZSwgaW1hZ2VzKVxyXG5cclxuICAgIHJldHVybiBbdGV4dHVyZSwgaW1hZ2VNYXBdXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRNYXAoZmxvb3I6IG51bWJlcik6IG1hcHMuTWFwIHwgbnVsbCB7XHJcbiAgICBjb25zdCBqc29uID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oYCR7U1RPUkFHRV9LRVl9X01BUF8ke2Zsb29yfWApXHJcbiAgICBpZiAoIWpzb24pIHtcclxuICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHN0YXRlID0gSlNPTi5wYXJzZShqc29uKSBhcyBtYXBzLk1hcFNhdmVTdGF0ZVxyXG4gICAgY29uc3QgbWFwID0gbWFwcy5NYXAubG9hZCh0aGluZ3MuZGIsIHN0YXRlKVxyXG4gICAgcmV0dXJuIG1hcFxyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhclN0YXRlKCk6IHZvaWQge1xyXG4gICAgY29uc3Qga2V5cyA9IG5ldyBBcnJheTxzdHJpbmc+KClcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbG9jYWxTdG9yYWdlLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3Qga2V5ID0gbG9jYWxTdG9yYWdlLmtleShpKVxyXG4gICAgICAgIGlmIChrZXk/LnN0YXJ0c1dpdGgoU1RPUkFHRV9LRVkpKSB7XHJcbiAgICAgICAgICAgIGtleXMucHVzaChrZXkpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgayBvZiBrZXlzKSB7XHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oaylcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VQbGF5ZXJBdEV4aXQobWFwOiBtYXBzLk1hcCwgcGxheWVyOiBybC5QbGF5ZXIsIGRpcjogcmwuRXhpdERpcmVjdGlvbikge1xyXG4gICAgY29uc3QgZXhpdCA9IGl0ZXIuZmluZChtYXAuZXhpdHMsIHggPT4geC50aGluZy5kaXJlY3Rpb24gPT0gZGlyKVxyXG4gICAgaWYgKCFleGl0KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIHBsYWNlIHBsYXllciwgbm8gc3VpdGFibGUgZXhpdCB3YXMgZm91bmRcIilcclxuICAgIH1cclxuXHJcbiAgICAvLyAvLyBmaW5kIGFuIGVtcHR5IGNlbGwgbmVhciB0aGUgZXhpdFxyXG4gICAgLy8gY29uc3QgcGxheWVyUG9zaXRpb24gPSBpdGVyLmZpbmQobWFwcy52aXNpdE5laWdoYm9ycyhleGl0LnBvc2l0aW9uLCBtYXAud2lkdGgsIG1hcC5oZWlnaHQpLCB4ID0+IG1hcC5pc1Bhc3NhYmxlKHgpKVxyXG4gICAgLy8gaWYgKCFwbGF5ZXJQb3NpdGlvbikge1xyXG4gICAgLy8gICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBwbGFjZSBwbGF5ZXIsIG5vIHBhc3NhYmxlIHRpbGUgbmVhciBleGl0XCIpXHJcbiAgICAvLyB9XHJcblxyXG4gICAgbWFwLnBsYXllcnMuc2V0KGV4aXQucG9zaXRpb24sIHBsYXllcilcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgIGNvbnN0IGFwcCA9IGF3YWl0IEFwcC5jcmVhdGUoKVxyXG4gICAgYXBwLmV4ZWMoKVxyXG59XHJcblxyXG5pbml0KCkiXX0=