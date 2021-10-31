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
const STORAGE_KEY = "crawl_storage";
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
            this.pageIndex++;
            this.pageIndex = Math.min(this.pageIndex, Math.ceil(this.player.inventory.length / this.pageSize));
            this.refresh();
        });
        this.prevPageButton.addEventListener("click", () => {
            this.pageIndex--;
            this.pageIndex = Math.max(this.pageIndex, 0);
            this.refresh();
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
        this.player.inventory.push(item);
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
            this.player.inventory.push(item);
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
        this.hide();
    }
    levelIntelligence() {
        this.player.baseIntelligence++;
        this.hide();
    }
    levelAgility() {
        this.player.baseAgility++;
        this.hide();
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
        dom.delegate(elem, "click", ".shop-item-row", (ev) => {
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
    }
    sell(idx) {
        const item = this.items[idx];
        const invIdx = this.player.inventory.indexOf(item);
        if (invIdx == -1) {
            return;
        }
        this.player.remove(item);
        this.player.inventory.splice(invIdx, 1);
        this.player.gold += Math.floor(item.value / 2);
        console.log(`You sold ${item.name}.`);
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
        this.zoom = 1;
        this.targetCommand = TargetCommand.None;
        const player = map.player.thing;
        this.statsDialog = new StatsDialog(player, this.canvas);
        this.inventoryDialog = new InventoryDialog(player, this.canvas);
        this.containerDialog = new ContainerDialog(player, this.canvas);
        this.levelDialog = new LevelDialog(player, this.canvas);
        this.shopDialog = new ShopDialog(player, this.canvas);
    }
    static async create() {
        var _a;
        const canvas = dom.byId("canvas");
        const renderer = new gfx.Renderer(canvas);
        // check for any saved state
        const state = loadState();
        // const state = null as AppSaveState | null
        const seed = rand.xmur3(new Date().toString());
        const rngState = state ? state.rng : [seed(), seed(), seed(), seed()];
        const rng = new rand.SFC32RNG(...rngState);
        const floor = (_a = state === null || state === void 0 ? void 0 : state.floor) !== null && _a !== void 0 ? _a : 1;
        const player = things.player.clone();
        if (state) {
            player.load(things.db, state.player);
        }
        else {
            player.inventory.push(things.healthPotion.clone());
            player.inventory.push(things.slingShot.clone());
        }
        const map = await gen.generateDungeonLevel(rng, things.db, player, floor, rl.ExitDirection.Down);
        const [texture, imageMap] = await loadImages(renderer, map);
        const app = new App(rng, renderer, floor, map, texture, imageMap);
        return app;
    }
    exec() {
        this.canvas.focus();
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
        this.resetButton.addEventListener("click", () => {
            this.clearState();
            window.location.reload();
        });
    }
    tick() {
        this.handleResize();
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
        this.drawFrame();
        requestAnimationFrame(() => this.tick());
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
        const experienceRequired = rl.getExperienceRequirement(player.level + 1);
        if (player.experience >= experienceRequired) {
            this.levelDialog.show();
            ++player.level;
            player.experience -= experienceRequired;
        }
        // save current state
        this.saveState();
        if (player.health <= 0) {
            this.clearState();
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
            output.warning(`${defender.name} has been defeated and ${attacker.name} receives ${defender.experience} experience`);
            attacker.experience += defender.experience;
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
            this.clearState();
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
        const lightRadius = this.calcLightRadius();
        if (monster.state !== rl.MonsterState.aggro && canSee(map, position, map.player.position, lightRadius)) {
            monster.action = 0;
            monster.state = rl.MonsterState.aggro;
        }
        if (monster.state === rl.MonsterState.aggro && !canSee(map, position, map.player.position, lightRadius)) {
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
            monster.action -= 1;
            this.map.monsters.set(position, monster);
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
        if (inp.pressed("w") || inp.pressed("W") || inp.pressed("ArrowUp")) {
            this.cursorPosition.y -= 1;
            return true;
        }
        if (inp.pressed("s") || inp.pressed("S") || inp.pressed("ArrowDown")) {
            this.cursorPosition.y += 1;
            return true;
        }
        if (inp.pressed("a") || inp.pressed("A") || inp.pressed("ArrowLeft")) {
            this.cursorPosition.x -= 1;
            return true;
        }
        if (inp.pressed("d") || inp.pressed("D") || inp.pressed("ArrowRight")) {
            this.cursorPosition.x += 1;
            return true;
        }
        if (inp.pressed(" ")) {
            player.actionReserve += player.action;
            player.action = 0;
            return true;
        }
        return false;
    }
    handleClick() {
        var _a, _b, _c, _d;
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
        if (clickFixture) {
            output.info(`You see ${clickFixture.name}`);
            return true;
        }
        const clickMonster = map.monsterAt(mxy);
        // first, try melee
        if (clickMonster) {
            const dist = geo.calcManhattenDist(playerPosition, mxy);
            console.log("dist:", dist);
            if (dist <= ((_b = (_a = player.meleeWeapon) === null || _a === void 0 ? void 0 : _a.range) !== null && _b !== void 0 ? _b : 0)) {
                this.processPlayerMeleeAttack(clickMonster);
                return true;
            }
            if (dist <= ((_d = (_c = player.rangedWeapon) === null || _c === void 0 ? void 0 : _c.range) !== null && _d !== void 0 ? _d : 0)) {
                this.processPlayerRangedAttack(clickMonster);
                return true;
            }
            output.info(`You see ${clickMonster.name}`);
            return true;
        }
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
    handlePlayerKeyboardMovement() {
        let inp = this.inp;
        if (inp.pressed("w") || inp.pressed("W") || inp.pressed("ArrowUp")) {
            this.handleMove(0 /* North */);
            return true;
        }
        if (inp.pressed("s") || inp.pressed("S") || inp.pressed("ArrowDown")) {
            this.handleMove(1 /* South */);
            return true;
        }
        if (inp.pressed("a") || inp.pressed("A") || inp.pressed("ArrowLeft")) {
            this.handleMove(3 /* West */);
            return true;
        }
        if (inp.pressed("d") || inp.pressed("D") || inp.pressed("ArrowRight")) {
            this.handleMove(2 /* East */);
            return true;
        }
        return false;
    }
    async handleMove(dir) {
        // clear cursor on movement
        this.cursorPosition = undefined;
        const { position: playerPosition, thing: player } = this.map.player;
        let newPosition = playerPosition.addPoint(directionVector(dir));
        if (!this.map.inBounds(newPosition)) {
            return;
        }
        const map = this.map;
        const tile = map.tileAt(newPosition);
        if (tile && !tile.passable) {
            output.info(`Blocked by ${tile.name}`);
            return;
        }
        const monster = map.monsterAt(newPosition);
        if (monster) {
            this.processPlayerMeleeAttack(monster);
            return;
        }
        const container = map.containerAt(newPosition);
        if (container) {
            this.containerDialog.show(map, container);
            return;
        }
        const fixture = map.fixtureAt(newPosition);
        if (fixture instanceof rl.Door) {
            output.info(`${fixture.name} opened`);
            this.map.fixtures.delete(fixture);
            player.action -= 1;
            return;
        }
        else if (fixture instanceof rl.Exit) {
            await this.handleExit(fixture.direction);
            return;
        }
        else if (fixture && !fixture.passable) {
            output.info(`Can't move that way, blocked by ${fixture.name}`);
            return false;
        }
        map.player.position = newPosition;
        player.action -= 1;
        this.updateVisibility();
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
        const lightRadius = this.calcLightRadius();
        if (!canSee(this.map, this.map.player.position, mxy, lightRadius)) {
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
    calcLightRadius() {
        const viewportLightRadius = Math.max(Math.ceil(this.canvas.width / this.tileSize), Math.ceil(this.canvas.height / this.tileSize));
        if (this.map.lighting === maps.Lighting.Ambient) {
            return viewportLightRadius;
        }
        return Math.min(viewportLightRadius, this.map.player.thing.lightRadius);
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
        this.drawThing(offset, this.map.player);
        this.drawHealthBar(offset, this.map.player);
        this.drawCursor(offset);
        this.renderer.flush();
    }
    drawThing(offset, placedThing) {
        const { position, thing } = placedThing;
        const visible = this.map.visibilityAt(position);
        if (visible === maps.Visibility.None || visible == maps.Visibility.Dark) {
            return;
        }
        const color = thing.color.clone();
        if (visible === maps.Visibility.Fog) {
            color.a = .25;
        }
        this.drawImage(offset, position, thing.image, color);
    }
    drawCursor(offset) {
        if (!this.cursorPosition) {
            return;
        }
        this.drawImage(offset, this.cursorPosition, "./assets/cursor.png", gfx.Color.red);
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
                if (ev.ctrlKey && this.map.player.thing.rangedWeapon) {
                    this.targetCommand = TargetCommand.Shoot;
                }
                else {
                    this.targetCommand = TargetCommand.Attack;
                }
                break;
            case "L":
                this.targetCommand = TargetCommand.Look;
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
    clearState() {
        localStorage.removeItem(STORAGE_KEY);
    }
    saveState() {
        // save the current game state
        var state = {
            rng: this.rng.save(),
            floor: this.floor,
            player: this.map.player.thing.save(),
        };
        const jsonState = JSON.stringify(state);
        localStorage.setItem(STORAGE_KEY, jsonState);
    }
    handleExit(dir) {
        if (dir == rl.ExitDirection.Up && this.floor == 1) {
            this.shopDialog.show();
            return;
        }
        switch (dir) {
            case rl.ExitDirection.Up:
                this.floor -= 1;
                break;
            case rl.ExitDirection.Down:
                this.floor += 1;
                break;
        }
        this.generateMap(dir);
    }
    async generateMap(dir) {
        this.map = await gen.generateDungeonLevel(this.rng, things.db, this.map.player.thing, this.floor, dir);
        const [texture, imageMap] = await loadImages(this.renderer, this.map);
        this.texture = texture;
        this.imageMap = imageMap;
        this.updateVisibility();
    }
}
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
function loadState() {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) {
        return null;
    }
    const state = JSON.parse(json);
    return state;
}
async function init() {
    const app = await App.create();
    app.exec();
}
init();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBQ2pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFFekMsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFBO0FBU25DLFNBQVMsZUFBZSxDQUFDLEdBQWM7SUFDbkMsUUFBUSxHQUFHLEVBQUU7UUFDVDtZQUNJLE9BQU8sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9CO1lBQ0ksT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlCO1lBQ0ksT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlCO1lBQ0ksT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7S0FDbEM7QUFDTCxDQUFDO0FBRUQsTUFBTSxNQUFNO0lBRVIsWUFBNEIsSUFBaUIsRUFB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QUNmLE1BQU0sR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQzlCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtBQUNkLENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGl0ZXIgZnJvbSBcIi4uL3NoYXJlZC9pdGVyLmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbiBmcm9tIFwiLi9nZW4uanNcIlxyXG5pbXBvcnQgKiBhcyBpbnB1dCBmcm9tIFwiLi4vc2hhcmVkL2lucHV0LmpzXCJcclxuaW1wb3J0ICogYXMgcmwgZnJvbSBcIi4vcmwuanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcbmltcG9ydCAqIGFzIG91dHB1dCBmcm9tIFwiLi9vdXRwdXQuanNcIlxyXG5pbXBvcnQgKiBhcyB0aGluZ3MgZnJvbSBcIi4vdGhpbmdzLmpzXCJcclxuaW1wb3J0ICogYXMgbWFwcyBmcm9tIFwiLi9tYXBzLmpzXCJcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIlxyXG5cclxuY29uc3QgU1RPUkFHRV9LRVkgPSBcImNyYXdsX3N0b3JhZ2VcIlxyXG5cclxuY29uc3QgZW51bSBEaXJlY3Rpb24ge1xyXG4gICAgTm9ydGgsXHJcbiAgICBTb3V0aCxcclxuICAgIEVhc3QsXHJcbiAgICBXZXN0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpcmVjdGlvblZlY3RvcihkaXI6IERpcmVjdGlvbik6IGdlby5Qb2ludCB7XHJcbiAgICBzd2l0Y2ggKGRpcikge1xyXG4gICAgICAgIGNhc2UgRGlyZWN0aW9uLk5vcnRoOlxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgwLCAtMSlcclxuICAgICAgICBjYXNlIERpcmVjdGlvbi5Tb3V0aDpcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMCwgMSlcclxuICAgICAgICBjYXNlIERpcmVjdGlvbi5FYXN0OlxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgxLCAwKVxyXG4gICAgICAgIGNhc2UgRGlyZWN0aW9uLldlc3Q6XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KC0xLCAwKVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtb2RhbEJhY2tncm91bmQgPSBkb20uYnlJZChcIm1vZGFsQmFja2dyb3VuZFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGVsZW06IEhUTUxFbGVtZW50LCBwcml2YXRlIHJlYWRvbmx5IGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHsgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5tb2RhbEJhY2tncm91bmQuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmVsZW0uaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmVsZW0uZm9jdXMoKVxyXG4gICAgfVxyXG5cclxuICAgIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5tb2RhbEJhY2tncm91bmQuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuZWxlbS5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgdGhpcy5jYW52YXMuZm9jdXMoKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBoaWRkZW4oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZWxlbS5oaWRkZW5cclxuICAgIH1cclxuXHJcbiAgICB0b2dnbGUoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZWxlbS5oaWRkZW4pIHtcclxuICAgICAgICAgICAgdGhpcy5zaG93KClcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU3RhdHNEaWFsb2cgZXh0ZW5kcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBvcGVuQnV0dG9uID0gZG9tLmJ5SWQoXCJzdGF0c0J1dHRvblwiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwic3RhdHNDbG9zZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXIsIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICBzdXBlcihkb20uYnlJZChcInN0YXRzRGlhbG9nXCIpLCBjYW52YXMpXHJcblxyXG4gICAgICAgIHRoaXMub3BlbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy50b2dnbGUoKSlcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgZXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkVTQ0FQRVwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgY29uc3QgaGVhbHRoU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNIZWFsdGhcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3Qgc3RyZW5ndGhTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c1N0cmVuZ3RoXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGFnaWxpdHlTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0FnaWxpdHlcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgaW50ZWxsaWdlbmNlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNJbnRlbGxpZ2VuY2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgYXR0YWNrU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNBdHRhY2tcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZGFtYWdlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNEYW1hZ2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZGVmZW5zZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRGVmZW5zZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBsZXZlbFNwYW4gPSBkb20uYnlJZChcInN0YXRzTGV2ZWxcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZXhwZXJpZW5jZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRXhwZXJpZW5jZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBnb2xkU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNHb2xkXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGV4cGVyaWVuY2VSZXF1aXJlbWVudCA9IHJsLmdldEV4cGVyaWVuY2VSZXF1aXJlbWVudChwbGF5ZXIubGV2ZWwgKyAxKVxyXG5cclxuICAgICAgICBoZWFsdGhTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmhlYWx0aH0gLyAke3BsYXllci5tYXhIZWFsdGh9YFxyXG4gICAgICAgIHN0cmVuZ3RoU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5zdHJlbmd0aH1gXHJcbiAgICAgICAgYWdpbGl0eVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuYWdpbGl0eX1gXHJcbiAgICAgICAgaW50ZWxsaWdlbmNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5pbnRlbGxpZ2VuY2V9YFxyXG4gICAgICAgIGF0dGFja1NwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIubWVsZWVBdHRhY2t9IC8gJHtwbGF5ZXIucmFuZ2VkV2VhcG9uID8gcGxheWVyLnJhbmdlZEF0dGFjayA6IFwiTkFcIn1gXHJcbiAgICAgICAgZGFtYWdlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5tZWxlZURhbWFnZX0gLyAke3BsYXllci5yYW5nZWREYW1hZ2UgPyBwbGF5ZXIucmFuZ2VkRGFtYWdlIDogXCJOQVwifWBcclxuICAgICAgICBkZWZlbnNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5kZWZlbnNlfWBcclxuICAgICAgICBhZ2lsaXR5U3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5hZ2lsaXR5fWBcclxuICAgICAgICBsZXZlbFNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIubGV2ZWx9YFxyXG4gICAgICAgIGV4cGVyaWVuY2VTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmV4cGVyaWVuY2V9IC8gJHtleHBlcmllbmNlUmVxdWlyZW1lbnR9YFxyXG4gICAgICAgIGdvbGRTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmdvbGR9YFxyXG5cclxuICAgICAgICBzdXBlci5zaG93KClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgSW52ZW50b3J5RGlhbG9nIGV4dGVuZHMgRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgb3BlbkJ1dHRvbiA9IGRvbS5ieUlkKFwiaW52ZW50b3J5QnV0dG9uXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGluZm9EaXYgPSBkb20uYnlJZChcImludmVudG9yeUluZm9cIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZW1wdHlEaXYgPSBkb20uYnlJZChcImludmVudG9yeUVtcHR5XCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRhYmxlID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlUYWJsZVwiKSBhcyBIVE1MVGFibGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwiaW52ZW50b3J5SXRlbVRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbmV4dFBhZ2VCdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeU5leHRQYWdlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHByZXZQYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlQcmV2UGFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwiaW52ZW50b3J5Q2xvc2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFnZVNpemU6IG51bWJlciA9IDlcclxuICAgIHByaXZhdGUgcGFnZUluZGV4OiBudW1iZXIgPSAwXHJcbiAgICBwcml2YXRlIHNlbGVjdGVkSW5kZXg6IG51bWJlciA9IC0xXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHN1cGVyKGRvbS5ieUlkKFwiaW52ZW50b3J5RGlhbG9nXCIpLCBjYW52YXMpXHJcbiAgICAgICAgdGhpcy5vcGVuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnRvZ2dsZSgpKVxyXG4gICAgICAgIHRoaXMuY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuaGlkZSgpKVxyXG5cclxuICAgICAgICB0aGlzLm5leHRQYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucGFnZUluZGV4KytcclxuICAgICAgICAgICAgdGhpcy5wYWdlSW5kZXggPSBNYXRoLm1pbih0aGlzLnBhZ2VJbmRleCwgTWF0aC5jZWlsKHRoaXMucGxheWVyLmludmVudG9yeS5sZW5ndGggLyB0aGlzLnBhZ2VTaXplKSlcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLnByZXZQYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucGFnZUluZGV4LS1cclxuICAgICAgICAgICAgdGhpcy5wYWdlSW5kZXggPSBNYXRoLm1heCh0aGlzLnBhZ2VJbmRleCwgMClcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgZXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHBhcnNlSW50KGV2LmtleSlcclxuXHJcbiAgICAgICAgICAgIGlmIChpbmRleCAmJiBpbmRleCA+IDAgJiYgaW5kZXggPD0gOSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gaW5kZXggLSAxXHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlVcIiAmJiB0aGlzLnNlbGVjdGVkSW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy51c2UodGhpcy5zZWxlY3RlZEluZGV4KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkVcIiAmJiB0aGlzLnNlbGVjdGVkSW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5lcXVpcCh0aGlzLnNlbGVjdGVkSW5kZXgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiUlwiICYmIHRoaXMuc2VsZWN0ZWRJbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZSh0aGlzLnNlbGVjdGVkSW5kZXgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiRFwiICYmIHRoaXMuc2VsZWN0ZWRJbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRyb3AodGhpcy5zZWxlY3RlZEluZGV4KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkFSUk9XRE9XTlwiIHx8IGtleSA9PT0gXCJTXCIpIHtcclxuICAgICAgICAgICAgICAgICsrdGhpcy5zZWxlY3RlZEluZGV4XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSBNYXRoLm1pbih0aGlzLnNlbGVjdGVkSW5kZXgsIDgpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkFSUk9XVVBcIiB8fCBrZXkgPT09IFwiV1wiKSB7XHJcbiAgICAgICAgICAgICAgICAtLXRoaXMuc2VsZWN0ZWRJbmRleFxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5tYXgodGhpcy5zZWxlY3RlZEluZGV4LCAtMSlcclxuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiRVNDQVBFXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5lbGVtLCBcImNsaWNrXCIsIFwiLmludmVudG9yeS11c2UtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZ2V0Um93SW5kZXgoZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50KVxyXG4gICAgICAgICAgICB0aGlzLnVzZShpbmRleClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5lbGVtLCBcImNsaWNrXCIsIFwiLmludmVudG9yeS1kcm9wLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgZXYuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmdldFJvd0luZGV4KGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudClcclxuICAgICAgICAgICAgdGhpcy5kcm9wKGluZGV4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LWVxdWlwLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgZXYuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmdldFJvd0luZGV4KGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudClcclxuICAgICAgICAgICAgdGhpcy5lcXVpcChpbmRleClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5lbGVtLCBcImNsaWNrXCIsIFwiLmludmVudG9yeS1yZW1vdmUtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZ2V0Um93SW5kZXgoZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50KVxyXG4gICAgICAgICAgICB0aGlzLnJlbW92ZShpbmRleClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5lbGVtLCBcImNsaWNrXCIsIFwiLml0ZW0tcm93XCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCByb3cgPSAoZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KFwiLml0ZW0tcm93XCIpXHJcbiAgICAgICAgICAgIGlmIChyb3cpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0KHJvdyBhcyBIVE1MVGFibGVSb3dFbGVtZW50KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgc3VwZXIuc2hvdygpXHJcbiAgICB9XHJcblxyXG4gICAgcmVmcmVzaCgpIHtcclxuICAgICAgICBjb25zdCB0Ym9keSA9IHRoaXMudGFibGUudEJvZGllc1swXVxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0Ym9keSlcclxuXHJcbiAgICAgICAgaWYgKHRoaXMucGxheWVyLmludmVudG9yeS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lbXB0eURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgICAgICB0aGlzLmluZm9EaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW1wdHlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgICAgICB0aGlzLmluZm9EaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBhZ2VDb3VudCA9IE1hdGguY2VpbCh0aGlzLnBsYXllci5pbnZlbnRvcnkubGVuZ3RoIC8gdGhpcy5wYWdlU2l6ZSlcclxuICAgICAgICB0aGlzLnBhZ2VJbmRleCA9IE1hdGgubWluKE1hdGgubWF4KDAsIHRoaXMucGFnZUluZGV4KSwgcGFnZUNvdW50IC0gMSlcclxuICAgICAgICB0aGlzLnByZXZQYWdlQnV0dG9uLmRpc2FibGVkID0gdGhpcy5wYWdlSW5kZXggPD0gMFxyXG4gICAgICAgIHRoaXMubmV4dFBhZ2VCdXR0b24uZGlzYWJsZWQgPSB0aGlzLnBhZ2VJbmRleCA+PSBwYWdlQ291bnQgLSAxXHJcblxyXG4gICAgICAgIHRoaXMuaW5mb0Rpdi50ZXh0Q29udGVudCA9IGBQYWdlICR7dGhpcy5wYWdlSW5kZXggKyAxfSBvZiAke3BhZ2VDb3VudH1gXHJcblxyXG4gICAgICAgIGNvbnN0IGl0ZW1zID0gZ2V0U29ydGVkSXRlbXNQYWdlKHRoaXMucGxheWVyLmludmVudG9yeSwgdGhpcy5wYWdlSW5kZXgsIHRoaXMucGFnZVNpemUpXHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5taW4odGhpcy5zZWxlY3RlZEluZGV4LCBpdGVtcy5sZW5ndGggLSAxKVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBpdGVtc1tpXVxyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMuaXRlbVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgdHIgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbUluZGV4VGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1pbmRleFwiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtTmFtZVRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0tbmFtZVwiKVxyXG4gICAgICAgICAgICBjb25zdCBlcXVpcEJ1dHRvbiA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pbnZlbnRvcnktZXF1aXAtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHJlbW92ZUJ1dHRvbiA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pbnZlbnRvcnktcmVtb3ZlLWJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCB1c2VCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LXVzZS1idXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuXHJcbiAgICAgICAgICAgIGl0ZW1JbmRleFRkLnRleHRDb250ZW50ID0gKGkgKyAxKS50b1N0cmluZygpXHJcbiAgICAgICAgICAgIGl0ZW1OYW1lVGQudGV4dENvbnRlbnQgPSBpdGVtLm5hbWVcclxuXHJcbiAgICAgICAgICAgIGlmICghKGl0ZW0gaW5zdGFuY2VvZiBybC5Vc2FibGUpKSB7XHJcbiAgICAgICAgICAgICAgICB1c2VCdXR0b24ucmVtb3ZlKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXJsLmlzRXF1aXBwYWJsZShpdGVtKSB8fCB0aGlzLnBsYXllci5pc0VxdWlwcGVkKGl0ZW0pKSB7XHJcbiAgICAgICAgICAgICAgICBlcXVpcEJ1dHRvbi5yZW1vdmUoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMucGxheWVyLmlzRXF1aXBwZWQoaXRlbSkpIHtcclxuICAgICAgICAgICAgICAgIHJlbW92ZUJ1dHRvbi5yZW1vdmUoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoaSA9PT0gdGhpcy5zZWxlY3RlZEluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICB0ci5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIilcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGJvZHkuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2VsZWN0KHNlbGVjdGVkUm93OiBIVE1MVGFibGVSb3dFbGVtZW50KSB7XHJcbiAgICAgICAgY29uc3Qgcm93cyA9IEFycmF5LmZyb20odGhpcy5lbGVtLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuaXRlbS1yb3dcIikpXHJcbiAgICAgICAgZm9yIChjb25zdCByb3cgb2Ygcm93cykge1xyXG4gICAgICAgICAgICByb3cuY2xhc3NMaXN0LnJlbW92ZShcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZWxlY3RlZFJvdy5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIilcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFJvd0luZGV4KGVsZW06IEhUTUxCdXR0b25FbGVtZW50KSB7XHJcbiAgICAgICAgY29uc3QgaW5kZXggPSBkb20uZ2V0RWxlbWVudEluZGV4KGVsZW0uY2xvc2VzdChcIi5pdGVtLXJvd1wiKSBhcyBIVE1MVGFibGVSb3dFbGVtZW50KVxyXG4gICAgICAgIHJldHVybiBpbmRleFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXNlKGluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBpID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplICsgaW5kZXhcclxuICAgICAgICBjb25zdCBpdGVtID0gZ2V0U29ydGVkSXRlbXModGhpcy5wbGF5ZXIuaW52ZW50b3J5KVtpXVxyXG4gICAgICAgIGlmICghKGl0ZW0gaW5zdGFuY2VvZiBybC5Vc2FibGUpKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXNlSXRlbSh0aGlzLnBsYXllciwgaXRlbSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJvcChpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaSA9IHRoaXMucGFnZUluZGV4ICogdGhpcy5wYWdlU2l6ZSArIGluZGV4XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEl0ZW1zKHRoaXMucGxheWVyLmludmVudG9yeSlbaV1cclxuICAgICAgICBkcm9wSXRlbSh0aGlzLnBsYXllciwgaXRlbSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZXF1aXAoaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGkgPSB0aGlzLnBhZ2VJbmRleCAqIHRoaXMucGFnZVNpemUgKyBpbmRleFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLnBsYXllci5pbnZlbnRvcnkpW2ldXHJcbiAgICAgICAgaWYgKCFybC5pc0VxdWlwcGFibGUoaXRlbSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBlcXVpcEl0ZW0odGhpcy5wbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlbW92ZShpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaSA9IHRoaXMucGFnZUluZGV4ICogdGhpcy5wYWdlU2l6ZSArIGluZGV4XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEl0ZW1zKHRoaXMucGxheWVyLmludmVudG9yeSlbaV1cclxuICAgICAgICBpZiAoIXJsLmlzRXF1aXBwYWJsZShpdGVtKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlbW92ZUl0ZW0odGhpcy5wbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQ29udGFpbmVyRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGlhbG9nOiBEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbmFtZVNwYW4gPSBkb20uYnlJZChcImNvbnRhaW5lck5hbWVcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNsb3NlQnV0dG9uID0gZG9tLmJ5SWQoXCJjb250YWluZXJDbG9zZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0YWtlQWxsQnV0dG9uID0gZG9tLmJ5SWQoXCJjb250YWluZXJUYWtlQWxsQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lclRhYmxlID0gZG9tLmJ5SWQoXCJjb250YWluZXJUYWJsZVwiKSBhcyBIVE1MVGFibGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lckl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwiY29udGFpbmVySXRlbVRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHByaXZhdGUgbWFwOiBtYXBzLk1hcCB8IG51bGwgPSBudWxsXHJcbiAgICBwcml2YXRlIGNvbnRhaW5lcjogcmwuQ29udGFpbmVyIHwgbnVsbCA9IG51bGxcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyLCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cgPSBuZXcgRGlhbG9nKGRvbS5ieUlkKFwiY29udGFpbmVyRGlhbG9nXCIpLCBjYW52YXMpXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIgPSBwbGF5ZXJcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuICAgICAgICB0aGlzLnRha2VBbGxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMudGFrZUFsbCgpKVxyXG4gICAgICAgIGNvbnN0IGVsZW0gPSB0aGlzLmRpYWxvZy5lbGVtXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZShlbGVtLCBcImNsaWNrXCIsIFwiLmNvbnRhaW5lci10YWtlLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGJ0biA9IGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCByb3cgPSBidG4uY2xvc2VzdChcIi5pdGVtLXJvd1wiKSBhcyBIVE1MVGFibGVSb3dFbGVtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgocm93KVxyXG4gICAgICAgICAgICB0aGlzLnRha2UoaWR4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkNcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJBXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFrZUFsbCgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoZXYua2V5KVxyXG4gICAgICAgICAgICBpZiAoaW5kZXggJiYgaW5kZXggPiAwICYmIGluZGV4IDw9IDkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFrZShpbmRleCAtIDEpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHNob3cobWFwOiBtYXBzLk1hcCwgY29udGFpbmVyOiBybC5Db250YWluZXIpIHtcclxuICAgICAgICB0aGlzLm1hcCA9IG1hcFxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyXHJcbiAgICAgICAgdGhpcy5uYW1lU3Bhbi50ZXh0Q29udGVudCA9IHRoaXMuY29udGFpbmVyLm5hbWVcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIHRoaXMuZGlhbG9nLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIGhpZGUoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMubWFwICYmIHRoaXMuY29udGFpbmVyICYmIHRoaXMuY29udGFpbmVyLml0ZW1zLnNpemUgPT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5jb250YWluZXJzLmRlbGV0ZSh0aGlzLmNvbnRhaW5lcilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gbnVsbFxyXG4gICAgICAgIHRoaXMuZGlhbG9nLmhpZGUoKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBoaWRkZW4oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZGlhbG9nLmhpZGRlblxyXG4gICAgfVxyXG5cclxuICAgIHJlZnJlc2goKSB7XHJcbiAgICAgICAgY29uc3QgdGJvZHkgPSB0aGlzLmNvbnRhaW5lclRhYmxlLnRCb2RpZXNbMF1cclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGJvZHkpXHJcblxyXG4gICAgICAgIGlmICghdGhpcy5jb250YWluZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBpdGVtcyA9IGdldFNvcnRlZEl0ZW1zKHRoaXMuY29udGFpbmVyLml0ZW1zKVxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IGl0ZW1zW2ldXHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy5jb250YWluZXJJdGVtVGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCB0ciA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5pdGVtLXJvd1wiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtSW5kZXhUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLWluZGV4XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1OYW1lVGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1uYW1lXCIpXHJcbiAgICAgICAgICAgIGl0ZW1JbmRleFRkLnRleHRDb250ZW50ID0gYCR7aSArIDF9YFxyXG4gICAgICAgICAgICBpdGVtTmFtZVRkLnRleHRDb250ZW50ID0gaXRlbS5uYW1lXHJcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0YWtlKGluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEl0ZW1zKHRoaXMuY29udGFpbmVyLml0ZW1zKVtpbmRleF1cclxuICAgICAgICBpZiAoIWl0ZW0pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5pdGVtcy5kZWxldGUoaXRlbSlcclxuICAgICAgICB0aGlzLnBsYXllci5pbnZlbnRvcnkucHVzaChpdGVtKVxyXG5cclxuICAgICAgICAvLyBoaWRlIGlmIHRoaXMgd2FzIHRoZSBsYXN0IGl0ZW1cclxuICAgICAgICBpZiAodGhpcy5jb250YWluZXIuaXRlbXMuc2l6ZSA9PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGFrZUFsbCgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuY29udGFpbmVyLml0ZW1zKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLml0ZW1zLmRlbGV0ZShpdGVtKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXllci5pbnZlbnRvcnkucHVzaChpdGVtKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5oaWRlKClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgRGVmZWF0RGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdHJ5QWdhaW5CdXR0b24gPSBkb20uYnlJZChcInRyeUFnYWluQnV0dG9uXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpYWxvZzogRGlhbG9nXHJcblxyXG4gICAgY29uc3RydWN0b3IoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IERpYWxvZyhkb20uYnlJZChcImRlZmVhdERpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgICAgIHRoaXMudHJ5QWdhaW5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMudHJ5QWdhaW4oKSlcclxuICAgICAgICB0aGlzLmRpYWxvZy5lbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qga2V5ID0gZXYua2V5LnRvVXBwZXJDYXNlKClcclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJUXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudHJ5QWdhaW4oKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkVOVEVSXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudHJ5QWdhaW4oKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdHJ5QWdhaW4oKSB7XHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIExldmVsRGlhbG9nIGV4dGVuZHMgRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWxTdHJlbmd0aFJvdyA9IGRvbS5ieUlkKFwibGV2ZWxTdHJlbmd0aFJvd1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsZXZlbEludGVsbGlnZW5jZVJvdyA9IGRvbS5ieUlkKFwibGV2ZWxJbnRlbGxpZ2VuY2VSb3dcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWxBZ2lsaXR5Um93ID0gZG9tLmJ5SWQoXCJsZXZlbEFnaWxpdHlSb3dcIilcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyLCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgc3VwZXIoZG9tLmJ5SWQoXCJsZXZlbERpYWxvZ1wiKSwgY2FudmFzKVxyXG5cclxuICAgICAgICB0aGlzLmxldmVsU3RyZW5ndGhSb3cuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMubGV2ZWxTdHJlbnRoKCkpXHJcbiAgICAgICAgdGhpcy5sZXZlbEludGVsbGlnZW5jZVJvdy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5sZXZlbEludGVsbGlnZW5jZSgpKVxyXG4gICAgICAgIHRoaXMubGV2ZWxBZ2lsaXR5Um93LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmxldmVsQWdpbGl0eSgpKVxyXG5cclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGV2LmtleS50b1VwcGVyQ2FzZSgpXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoZXYua2V5KVxyXG5cclxuICAgICAgICAgICAgaWYgKGluZGV4ID09IDEgfHwga2V5ID09IFwiU1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxldmVsU3RyZW50aCgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChpbmRleCA9PSAyIHx8IGtleSA9PSBcIklcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sZXZlbEludGVsbGlnZW5jZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChpbmRleCA9PSAzIHx8IGtleSA9PSBcIkFcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sZXZlbEFnaWxpdHkoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGxldmVsU3RyZW50aCgpIHtcclxuICAgICAgICB0aGlzLnBsYXllci5iYXNlU3RyZW5ndGgrK1xyXG4gICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBsZXZlbEludGVsbGlnZW5jZSgpIHtcclxuICAgICAgICB0aGlzLnBsYXllci5iYXNlSW50ZWxsaWdlbmNlKytcclxuICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbGV2ZWxBZ2lsaXR5KCkge1xyXG4gICAgICAgIHRoaXMucGxheWVyLmJhc2VBZ2lsaXR5KytcclxuICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgfVxyXG59XHJcblxyXG5lbnVtIFNob3BEaWFsb2dNb2RlIHtcclxuICAgIEJ1eSxcclxuICAgIFNlbGxcclxufVxyXG5cclxuY2xhc3MgU2hvcERpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpYWxvZzogRGlhbG9nXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGdvbGRTcGFuID0gZG9tLmJ5SWQoXCJzaG9wR29sZFNwYW5cIikgYXMgSFRNTFNwYW5FbGVtZW50O1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwic2hvcEV4aXRCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYnV5QnV0dG9uID0gZG9tLmJ5SWQoXCJzaG9wQnV5QnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNlbGxCdXR0b24gPSBkb20uYnlJZChcInNob3BTZWxsQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG5leHRQYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJzaG9wTmV4dFBhZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcHJldlBhZ2VCdXR0b24gPSBkb20uYnlJZChcInNob3BQcmV2UGFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzaG9wVGFibGUgPSBkb20uYnlJZChcInNob3BUYWJsZVwiKSBhcyBIVE1MVGFibGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNob3BCdXlJdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcInNob3BCdXlJdGVtVGVtcGxhdGVcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzaG9wU2VsbEl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwic2hvcFNlbGxJdGVtVGVtcGxhdGVcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSBtb2RlOiBTaG9wRGlhbG9nTW9kZSA9IFNob3BEaWFsb2dNb2RlLkJ1eVxyXG4gICAgcHJpdmF0ZSBpdGVtczogcmwuSXRlbVtdID0gW11cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFnZVNpemU6IG51bWJlciA9IDlcclxuICAgIHByaXZhdGUgcGFnZUluZGV4OiBudW1iZXIgPSAwXHJcbiAgICBwcml2YXRlIHNlbGVjdGVkSW5kZXg6IG51bWJlciA9IC0xXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IERpYWxvZyhkb20uYnlJZChcInNob3BEaWFsb2dcIiksIGNhbnZhcylcclxuICAgICAgICB0aGlzLnBsYXllciA9IHBsYXllclxyXG4gICAgICAgIHRoaXMuYnV5QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnNldE1vZGUoU2hvcERpYWxvZ01vZGUuQnV5KSlcclxuICAgICAgICB0aGlzLnNlbGxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuc2V0TW9kZShTaG9wRGlhbG9nTW9kZS5TZWxsKSlcclxuICAgICAgICB0aGlzLm5leHRQYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm5leHRQYWdlKCkpXHJcbiAgICAgICAgdGhpcy5wcmV2UGFnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5wcmV2UGFnZSgpKVxyXG4gICAgICAgIHRoaXMuY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuaGlkZSgpKVxyXG5cclxuICAgICAgICBjb25zdCBlbGVtID0gdGhpcy5kaWFsb2cuZWxlbVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUoZWxlbSwgXCJjbGlja1wiLCBcIi5zaG9wLWl0ZW0tcm93XCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBidG4gPSBldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KHJvdylcclxuICAgICAgICAgICAgdGhpcy5jaG9vc2UoaWR4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGV2LmtleS50b1VwcGVyQ2FzZSgpXHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlhcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJCXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0TW9kZShTaG9wRGlhbG9nTW9kZS5CdXkpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiU1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldE1vZGUoU2hvcERpYWxvZ01vZGUuU2VsbClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJBUlJPV0RPV05cIiB8fCBrZXkgPT09IFwiU1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRJdGVtKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJBUlJPV1VQXCIgfHwga2V5ID09PSBcIldcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2SXRlbSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiUEFHRURPV05cIiB8fCBrZXkgPT09IFwiTlwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRQYWdlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJQQUdFVVBcIiB8fCBrZXkgPT09IFwiUFwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByZXZQYWdlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFU0NBUEVcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFTlRFUlwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNob29zZSh0aGlzLnNlbGVjdGVkSW5kZXgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoZXYua2V5KVxyXG4gICAgICAgICAgICBpZiAoaW5kZXggJiYgaW5kZXggPiAwICYmIGluZGV4IDw9IDkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hvb3NlKGluZGV4IC0gMSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIHRoaXMuZGlhbG9nLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cuaGlkZSgpXHJcbiAgICB9XHJcblxyXG4gICAgY2hvb3NlKGlkeDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWR4ID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplICsgaWR4XHJcbiAgICAgICAgc3dpdGNoICh0aGlzLm1vZGUpIHtcclxuICAgICAgICAgICAgY2FzZSBTaG9wRGlhbG9nTW9kZS5CdXk6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1eShpZHgpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICBjYXNlIFNob3BEaWFsb2dNb2RlLlNlbGw6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGwoaWR4KVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2V0TW9kZShtb2RlOiBTaG9wRGlhbG9nTW9kZSkge1xyXG4gICAgICAgIHRoaXMubW9kZSA9IG1vZGVcclxuICAgICAgICB0aGlzLnBhZ2VJbmRleCA9IDBcclxuICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSAtMVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgYnV5KGlkeDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbaWR4XVxyXG5cclxuICAgICAgICBpZiAoaXRlbS52YWx1ZSA+IHRoaXMucGxheWVyLmdvbGQpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKGBZb3UgZG8gbm90IGhhdmUgZW5vdWdoIGdvbGQgZm9yICR7aXRlbS5uYW1lfSFgKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG91dHB1dC5pbmZvKGBZb3UgYm91Z2h0ICR7aXRlbS5uYW1lfS5gKVxyXG4gICAgICAgIHRoaXMucGxheWVyLmdvbGQgLT0gaXRlbS52YWx1ZVxyXG4gICAgICAgIHRoaXMucGxheWVyLmludmVudG9yeS5wdXNoKGl0ZW0uY2xvbmUoKSlcclxuICAgIH1cclxuXHJcbiAgICBzZWxsKGlkeDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbaWR4XVxyXG4gICAgICAgIGNvbnN0IGludklkeCA9IHRoaXMucGxheWVyLmludmVudG9yeS5pbmRleE9mKGl0ZW0pXHJcbiAgICAgICAgaWYgKGludklkeCA9PSAtMSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucGxheWVyLnJlbW92ZShpdGVtKVxyXG4gICAgICAgIHRoaXMucGxheWVyLmludmVudG9yeS5zcGxpY2UoaW52SWR4LCAxKVxyXG4gICAgICAgIHRoaXMucGxheWVyLmdvbGQgKz0gTWF0aC5mbG9vcihpdGVtLnZhbHVlIC8gMilcclxuICAgICAgICBjb25zb2xlLmxvZyhgWW91IHNvbGQgJHtpdGVtLm5hbWV9LmApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGhpZGRlbigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kaWFsb2cuaGlkZGVuXHJcbiAgICB9XHJcblxyXG4gICAgbmV4dFBhZ2UoKSB7XHJcbiAgICAgICAgdGhpcy5wYWdlSW5kZXgrK1xyXG4gICAgICAgIHRoaXMucGFnZUluZGV4ID0gTWF0aC5taW4odGhpcy5wYWdlSW5kZXgsIE1hdGguY2VpbCh0aGlzLml0ZW1zLmxlbmd0aCAvIHRoaXMucGFnZVNpemUpIC0gMSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByZXZQYWdlKCkge1xyXG4gICAgICAgIHRoaXMucGFnZUluZGV4LS1cclxuICAgICAgICB0aGlzLnBhZ2VJbmRleCA9IE1hdGgubWF4KHRoaXMucGFnZUluZGV4LCAwKVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgbmV4dEl0ZW0oKSB7XHJcbiAgICAgICAgKyt0aGlzLnNlbGVjdGVkSW5kZXhcclxuICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSBNYXRoLm1pbih0aGlzLnNlbGVjdGVkSW5kZXgsIDgpXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcmV2SXRlbSgpIHtcclxuICAgICAgICAtLXRoaXMuc2VsZWN0ZWRJbmRleFxyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWF4KHRoaXMuc2VsZWN0ZWRJbmRleCwgLTEpXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICByZWZyZXNoKCkge1xyXG4gICAgICAgIHN3aXRjaCAodGhpcy5tb2RlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgU2hvcERpYWxvZ01vZGUuQnV5OlxyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoQnV5KClcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIFNob3BEaWFsb2dNb2RlLlNlbGw6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2hTZWxsKClcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmdvbGRTcGFuLnRleHRDb250ZW50ID0gYEdvbGQ6ICR7dGhpcy5wbGF5ZXIuZ29sZH1gXHJcbiAgICB9XHJcblxyXG4gICAgcmVmcmVzaEJ1eSgpIHtcclxuICAgICAgICBjb25zdCB0Ym9keSA9IHRoaXMuc2hvcFRhYmxlLnRCb2RpZXNbMF1cclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGJvZHkpXHJcblxyXG4gICAgICAgIC8vIGFzc2VtYmxlIGl0ZW0gbGlzdFxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgdGhpcy5pdGVtcyA9IFsuLi50aGluZ3MuZGJdLmZpbHRlcih0ID0+IHQgaW5zdGFuY2VvZiBybC5JdGVtICYmIHQudmFsdWUgPiAwICYmIHQubGV2ZWwgPD0gcGxheWVyLmxldmVsKSBhcyBybC5JdGVtW11cclxuXHJcbiAgICAgICAgY29uc3QgcGFnZU9mZnNldCA9IHRoaXMucGFnZUluZGV4ICogdGhpcy5wYWdlU2l6ZVxyXG4gICAgICAgIGNvbnN0IHBhZ2VTaXplID0gTWF0aC5taW4odGhpcy5wYWdlU2l6ZSwgdGhpcy5pdGVtcy5sZW5ndGggLSBwYWdlT2Zmc2V0KVxyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWluKHRoaXMuc2VsZWN0ZWRJbmRleCwgcGFnZVNpemUgLSAxKVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhZ2VTaXplOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbcGFnZU9mZnNldCArIGldXHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy5zaG9wQnV5SXRlbVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgdHIgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbUluZGV4VGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1pbmRleFwiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtTmFtZVRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0tbmFtZVwiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtQ29zdFRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0tY29zdFwiKVxyXG4gICAgICAgICAgICBpdGVtSW5kZXhUZC50ZXh0Q29udGVudCA9IGAke2kgKyAxfWBcclxuICAgICAgICAgICAgaXRlbU5hbWVUZC50ZXh0Q29udGVudCA9IGl0ZW0ubmFtZVxyXG4gICAgICAgICAgICBpdGVtQ29zdFRkLnRleHRDb250ZW50ID0gYCR7aXRlbS52YWx1ZX1gXHJcblxyXG4gICAgICAgICAgICBpZiAoaSA9PT0gdGhpcy5zZWxlY3RlZEluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICB0ci5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIilcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGl0ZW0udmFsdWUgPiBwbGF5ZXIuZ29sZCkge1xyXG4gICAgICAgICAgICAgICAgdHIuY2xhc3NMaXN0LmFkZChcImRpc2FibGVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5idXlCdXR0b24uZGlzYWJsZWQgPSB0cnVlXHJcbiAgICAgICAgdGhpcy5zZWxsQnV0dG9uLmRpc2FibGVkID0gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICByZWZyZXNoU2VsbCgpIHtcclxuICAgICAgICBjb25zdCB0Ym9keSA9IHRoaXMuc2hvcFRhYmxlLnRCb2RpZXNbMF1cclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGJvZHkpXHJcblxyXG4gICAgICAgIC8vIGFzc2VtYmxlIGl0ZW0gbGlzdFxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgdGhpcy5pdGVtcyA9IFsuLi5wbGF5ZXIuaW52ZW50b3J5XS5maWx0ZXIodCA9PiB0LnZhbHVlID4gMCkgYXMgcmwuSXRlbVtdXHJcbiAgICAgICAgY29uc3QgcGFnZU9mZnNldCA9IHRoaXMucGFnZUluZGV4ICogdGhpcy5wYWdlU2l6ZVxyXG4gICAgICAgIGNvbnN0IHBhZ2VTaXplID0gTWF0aC5taW4odGhpcy5wYWdlU2l6ZSwgdGhpcy5pdGVtcy5sZW5ndGggLSBwYWdlT2Zmc2V0KVxyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWluKHRoaXMuc2VsZWN0ZWRJbmRleCwgcGFnZVNpemUgLSAxKVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhZ2VTaXplOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbcGFnZU9mZnNldCArIGldXHJcbiAgICAgICAgICAgIGNvbnN0IGVxdWlwcGVkID0gdGhpcy5wbGF5ZXIuaXNFcXVpcHBlZChpdGVtKVxyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMuc2hvcFNlbGxJdGVtVGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCB0ciA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5pdGVtLXJvd1wiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtSW5kZXhUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLWluZGV4XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1OYW1lVGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1uYW1lXCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1Db3N0VGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1jb3N0XCIpXHJcbiAgICAgICAgICAgIGl0ZW1JbmRleFRkLnRleHRDb250ZW50ID0gYCR7aSArIDF9YFxyXG4gICAgICAgICAgICBpdGVtTmFtZVRkLnRleHRDb250ZW50ID0gYCR7ZXF1aXBwZWQgPyBcIiogXCIgOiBcIlwifSR7aXRlbS5uYW1lfWBcclxuICAgICAgICAgICAgaXRlbUNvc3RUZC50ZXh0Q29udGVudCA9IGAke01hdGguZmxvb3IoaXRlbS52YWx1ZSAvIDIpfWBcclxuXHJcbiAgICAgICAgICAgIGlmIChpID09PSB0aGlzLnNlbGVjdGVkSW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIHRyLmNsYXNzTGlzdC5hZGQoXCJzZWxlY3RlZFwiKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0Ym9keS5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuYnV5QnV0dG9uLmRpc2FibGVkID0gZmFsc2VcclxuICAgICAgICB0aGlzLnNlbGxCdXR0b24uZGlzYWJsZWQgPSB0cnVlXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFNvcnRlZEl0ZW1zKGl0ZW1zOiBJdGVyYWJsZTxybC5JdGVtPik6IHJsLkl0ZW1bXSB7XHJcbiAgICBjb25zdCBzb3J0ZWRJdGVtcyA9IGl0ZXIub3JkZXJCeShpdGVtcywgaSA9PiBpLm5hbWUpXHJcbiAgICByZXR1cm4gc29ydGVkSXRlbXNcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U29ydGVkSXRlbXNQYWdlKGl0ZW1zOiBJdGVyYWJsZTxybC5JdGVtPiwgcGFnZUluZGV4OiBudW1iZXIsIHBhZ2VTaXplOiBudW1iZXIpOiBybC5JdGVtW10ge1xyXG4gICAgY29uc3Qgc3RhcnRJbmRleCA9IHBhZ2VJbmRleCAqIHBhZ2VTaXplXHJcbiAgICBjb25zdCBlbmRJbmRleCA9IHN0YXJ0SW5kZXggKyBwYWdlU2l6ZVxyXG4gICAgY29uc3Qgc29ydGVkSXRlbXMgPSBnZXRTb3J0ZWRJdGVtcyhpdGVtcylcclxuICAgIGNvbnN0IHBhZ2UgPSBzb3J0ZWRJdGVtcy5zbGljZShzdGFydEluZGV4LCBlbmRJbmRleClcclxuICAgIHJldHVybiBwYWdlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhblNlZShtYXA6IG1hcHMuTWFwLCBleWU6IGdlby5Qb2ludCwgdGFyZ2V0OiBnZW8uUG9pbnQsIGxpZ2h0UmFkaXVzOiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgIGlmIChnZW8uY2FsY01hbmhhdHRlbkRpc3QoZXllLCB0YXJnZXQpID4gbGlnaHRSYWRpdXMpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IHB0IG9mIG1hcmNoKGV5ZSwgdGFyZ2V0KSkge1xyXG4gICAgICAgIC8vIGlnbm9yZSBzdGFydCBwb2ludFxyXG4gICAgICAgIGlmIChwdC5lcXVhbChleWUpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHRoIG9mIG1hcC5hdChwdCkpIHtcclxuICAgICAgICAgICAgaWYgKCF0aC50cmFuc3BhcmVudCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHB0LmVxdWFsKHRhcmdldClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiogbWFyY2goc3RhcnQ6IGdlby5Qb2ludCwgZW5kOiBnZW8uUG9pbnQpOiBHZW5lcmF0b3I8Z2VvLlBvaW50PiB7XHJcbiAgICBjb25zdCBjdXIgPSBzdGFydC5jbG9uZSgpXHJcbiAgICBjb25zdCBkeSA9IE1hdGguYWJzKGVuZC55IC0gc3RhcnQueSlcclxuICAgIGNvbnN0IHN5ID0gc3RhcnQueSA8IGVuZC55ID8gMSA6IC0xXHJcbiAgICBjb25zdCBkeCA9IC1NYXRoLmFicyhlbmQueCAtIHN0YXJ0LngpXHJcbiAgICBjb25zdCBzeCA9IHN0YXJ0LnggPCBlbmQueCA/IDEgOiAtMVxyXG4gICAgbGV0IGVyciA9IGR5ICsgZHhcclxuXHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgIHlpZWxkIGN1clxyXG5cclxuICAgICAgICBpZiAoY3VyLmVxdWFsKGVuZCkpIHtcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGUyID0gMiAqIGVyclxyXG4gICAgICAgIGlmIChlMiA+PSBkeCkge1xyXG4gICAgICAgICAgICBlcnIgKz0gZHhcclxuICAgICAgICAgICAgY3VyLnkgKz0gc3lcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlMiA8PSBkeSkge1xyXG4gICAgICAgICAgICBlcnIgKz0gZHlcclxuICAgICAgICAgICAgY3VyLnggKz0gc3hcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyb3BJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5JdGVtKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIuZGVsZXRlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHdhcyBkcm9wcGVkYClcclxufVxyXG5cclxuZnVuY3Rpb24gdXNlSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuVXNhYmxlKTogdm9pZCB7XHJcbiAgICBjb25zdCBhbW91bnQgPSBNYXRoLm1pbihpdGVtLmhlYWx0aCwgcGxheWVyLm1heEhlYWx0aCAtIHBsYXllci5oZWFsdGgpXHJcbiAgICBwbGF5ZXIuaGVhbHRoICs9IGFtb3VudFxyXG4gICAgcGxheWVyLmRlbGV0ZShpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSByZXN0b3JlZCAke2Ftb3VudH0gaGVhbHRoYClcclxufVxyXG5cclxuZnVuY3Rpb24gZXF1aXBJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5FcXVpcHBhYmxlKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIuZXF1aXAoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gd2FzIGVxdWlwcGVkYClcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuRXF1aXBwYWJsZSk6IHZvaWQge1xyXG4gICAgcGxheWVyLnJlbW92ZShpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSB3YXMgcmVtb3ZlZGApXHJcbn1cclxuXHJcbmVudW0gVGFyZ2V0Q29tbWFuZCB7XHJcbiAgICBOb25lLFxyXG4gICAgQXR0YWNrLFxyXG4gICAgU2hvb3QsXHJcbiAgICBMb29rXHJcbn1cclxuXHJcbmNsYXNzIEFwcCB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGF0dGFja0J1dHRvbiA9IGRvbS5ieUlkKFwiYXR0YWNrQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNob290QnV0dG9uID0gZG9tLmJ5SWQoXCJzaG9vdEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsb29rQnV0dG9uID0gZG9tLmJ5SWQoXCJsb29rQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJlc2V0QnV0dG9uID0gZG9tLmJ5SWQoXCJyZXNldEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbnA6IGlucHV0LklucHV0ID0gbmV3IGlucHV0LklucHV0KHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdGF0c0RpYWxvZzogU3RhdHNEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW52ZW50b3J5RGlhbG9nOiBJbnZlbnRvcnlEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29udGFpbmVyRGlhbG9nOiBDb250YWluZXJEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGVmZWF0RGlhbG9nID0gbmV3IERlZmVhdERpYWxvZyh0aGlzLmNhbnZhcylcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWxEaWFsb2c6IExldmVsRGlhbG9nXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNob3BEaWFsb2c6IFNob3BEaWFsb2dcclxuICAgIHByaXZhdGUgem9vbSA9IDFcclxuICAgIHByaXZhdGUgdGFyZ2V0Q29tbWFuZDogVGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuTm9uZVxyXG4gICAgcHJpdmF0ZSBjdXJzb3JQb3NpdGlvbj86IGdlby5Qb2ludFxyXG5cclxuICAgIHByaXZhdGUgY29uc3RydWN0b3IoXHJcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBybmc6IHJhbmQuU0ZDMzJSTkcsXHJcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSByZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLFxyXG4gICAgICAgIHByaXZhdGUgZmxvb3I6IG51bWJlcixcclxuICAgICAgICBwcml2YXRlIG1hcDogbWFwcy5NYXAsXHJcbiAgICAgICAgcHJpdmF0ZSB0ZXh0dXJlOiBnZnguVGV4dHVyZSxcclxuICAgICAgICBwcml2YXRlIGltYWdlTWFwOiBNYXA8c3RyaW5nLCBudW1iZXI+KSB7XHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gbWFwLnBsYXllci50aGluZ1xyXG4gICAgICAgIHRoaXMuc3RhdHNEaWFsb2cgPSBuZXcgU3RhdHNEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgICAgICB0aGlzLmludmVudG9yeURpYWxvZyA9IG5ldyBJbnZlbnRvcnlEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgICAgICB0aGlzLmNvbnRhaW5lckRpYWxvZyA9IG5ldyBDb250YWluZXJEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgICAgICB0aGlzLmxldmVsRGlhbG9nID0gbmV3IExldmVsRGlhbG9nKHBsYXllciwgdGhpcy5jYW52YXMpXHJcbiAgICAgICAgdGhpcy5zaG9wRGlhbG9nID0gbmV3IFNob3BEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc3RhdGljIGFzeW5jIGNyZWF0ZSgpOiBQcm9taXNlPEFwcD4ge1xyXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICAgICAgY29uc3QgcmVuZGVyZXIgPSBuZXcgZ2Z4LlJlbmRlcmVyKGNhbnZhcylcclxuXHJcbiAgICAgICAgLy8gY2hlY2sgZm9yIGFueSBzYXZlZCBzdGF0ZVxyXG4gICAgICAgIGNvbnN0IHN0YXRlID0gbG9hZFN0YXRlKClcclxuICAgICAgICAvLyBjb25zdCBzdGF0ZSA9IG51bGwgYXMgQXBwU2F2ZVN0YXRlIHwgbnVsbFxyXG4gICAgICAgIGNvbnN0IHNlZWQgPSByYW5kLnhtdXIzKG5ldyBEYXRlKCkudG9TdHJpbmcoKSlcclxuICAgICAgICBjb25zdCBybmdTdGF0ZSA9IHN0YXRlID8gc3RhdGUucm5nIDogW3NlZWQoKSwgc2VlZCgpLCBzZWVkKCksIHNlZWQoKV0gYXMgW251bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl1cclxuICAgICAgICBjb25zdCBybmcgPSBuZXcgcmFuZC5TRkMzMlJORyguLi5ybmdTdGF0ZSlcclxuICAgICAgICBjb25zdCBmbG9vciA9IHN0YXRlPy5mbG9vciA/PyAxXHJcblxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaW5ncy5wbGF5ZXIuY2xvbmUoKVxyXG4gICAgICAgIGlmIChzdGF0ZSkge1xyXG4gICAgICAgICAgICBwbGF5ZXIubG9hZCh0aGluZ3MuZGIsIHN0YXRlLnBsYXllcilcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBwbGF5ZXIuaW52ZW50b3J5LnB1c2godGhpbmdzLmhlYWx0aFBvdGlvbi5jbG9uZSgpKVxyXG4gICAgICAgICAgICBwbGF5ZXIuaW52ZW50b3J5LnB1c2godGhpbmdzLnNsaW5nU2hvdC5jbG9uZSgpKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbWFwID0gYXdhaXQgZ2VuLmdlbmVyYXRlRHVuZ2VvbkxldmVsKHJuZywgdGhpbmdzLmRiLCBwbGF5ZXIsIGZsb29yLCBybC5FeGl0RGlyZWN0aW9uLkRvd24pXHJcbiAgICAgICAgY29uc3QgW3RleHR1cmUsIGltYWdlTWFwXSA9IGF3YWl0IGxvYWRJbWFnZXMocmVuZGVyZXIsIG1hcClcclxuICAgICAgICBjb25zdCBhcHAgPSBuZXcgQXBwKHJuZywgcmVuZGVyZXIsIGZsb29yLCBtYXAsIHRleHR1cmUsIGltYWdlTWFwKVxyXG4gICAgICAgIHJldHVybiBhcHBcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZXhlYygpIHtcclxuICAgICAgICB0aGlzLmNhbnZhcy5mb2N1cygpXHJcblxyXG4gICAgICAgIG91dHB1dC53cml0ZShcIllvdXIgYWR2ZW50dXJlIGJlZ2luc1wiKVxyXG4gICAgICAgIHRoaXMuaGFuZGxlUmVzaXplKClcclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy50aWNrKCkpXHJcblxyXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCAoZXYpID0+IHRoaXMuaGFuZGxlS2V5UHJlc3MoZXYpKVxyXG5cclxuICAgICAgICB0aGlzLmF0dGFja0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLkF0dGFja1xyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuc2hvb3RCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5TaG9vdFxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMubG9va0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLkxvb2tcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLnJlc2V0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuY2xlYXJTdGF0ZSgpXHJcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHByaXZhdGUgdGljaygpIHtcclxuICAgICAgICB0aGlzLmhhbmRsZVJlc2l6ZSgpXHJcblxyXG4gICAgICAgIGNvbnN0IG5leHRDcmVhdHVyZSA9IHRoaXMuZ2V0TmV4dENyZWF0dXJlKClcclxuICAgICAgICBpZiAobmV4dENyZWF0dXJlPy50aGluZyBpbnN0YW5jZW9mIHJsLlBsYXllcikge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZUlucHV0KClcclxuICAgICAgICB9IGVsc2UgaWYgKG5leHRDcmVhdHVyZT8udGhpbmcgaW5zdGFuY2VvZiBybC5Nb25zdGVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGlja01vbnN0ZXIobmV4dENyZWF0dXJlLnBvc2l0aW9uLCBuZXh0Q3JlYXR1cmUudGhpbmcpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy50aWNrUm91bmQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmF3RnJhbWUoKVxyXG5cclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy50aWNrKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXROZXh0TW9uc3RlcigpOiBtYXBzLlBsYWNlZDxybC5Nb25zdGVyPiB8IG51bGwge1xyXG4gICAgICAgIC8vIGRldGVybWluZSB3aG9zZSB0dXJuIGl0IGlzXHJcbiAgICAgICAgbGV0IG5leHRNb25zdGVyID0gbnVsbFxyXG4gICAgICAgIGZvciAoY29uc3QgbW9uc3RlciBvZiB0aGlzLm1hcC5tb25zdGVycykge1xyXG4gICAgICAgICAgICBpZiAobW9uc3Rlci50aGluZy5zdGF0ZSAhPT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobW9uc3Rlci50aGluZy5hY3Rpb24gPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFuZXh0TW9uc3RlciB8fCBtb25zdGVyLnRoaW5nLmFjdGlvbiA+IG5leHRNb25zdGVyLnRoaW5nLmFjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgbmV4dE1vbnN0ZXIgPSBtb25zdGVyXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBuZXh0TW9uc3RlclxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0TmV4dENyZWF0dXJlKCk6IG1hcHMuUGxhY2VkPHJsLk1vbnN0ZXI+IHwgbWFwcy5QbGFjZWQ8cmwuUGxheWVyPiB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IG1vbnN0ZXIgPSB0aGlzLmdldE5leHRNb25zdGVyKClcclxuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLm1hcC5wbGF5ZXIudGhpbmdcclxuXHJcbiAgICAgICAgaWYgKHBsYXllci5hY3Rpb24gPiAwICYmIHBsYXllci5hY3Rpb24gPiAobW9uc3Rlcj8udGhpbmc/LmFjdGlvbiA/PyAwKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tYXAucGxheWVyXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbW9uc3RlclxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdGlja1JvdW5kKCkge1xyXG4gICAgICAgIC8vIGFjY3VtdWxhdGUgYWN0aW9uIHBvaW50c1xyXG4gICAgICAgIGZvciAoY29uc3QgbW9uc3RlciBvZiBpdGVyLmZpbHRlcih0aGlzLm1hcC5tb25zdGVycy50aGluZ3MoKSwgbSA9PiBtLnN0YXRlID09PSBybC5Nb25zdGVyU3RhdGUuYWdncm8pKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc2VydmUgPSBNYXRoLm1pbihtb25zdGVyLmFjdGlvblJlc2VydmUsIG1vbnN0ZXIuYWdpbGl0eSlcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gPSAxICsgbW9uc3Rlci5hZ2lsaXR5ICsgcmVzZXJ2ZVxyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvblJlc2VydmUgPSAwXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjYXAgYWN0aW9uIHJlc2VydmUgXHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5tYXAucGxheWVyLnRoaW5nXHJcbiAgICAgICAgY29uc3QgcmVzZXJ2ZSA9IE1hdGgubWluKHBsYXllci5hY3Rpb25SZXNlcnZlLCBwbGF5ZXIuYWdpbGl0eSlcclxuICAgICAgICBwbGF5ZXIuYWN0aW9uID0gMSArIHBsYXllci5hZ2lsaXR5ICsgcmVzZXJ2ZVxyXG4gICAgICAgIHBsYXllci5hY3Rpb25SZXNlcnZlID0gMFxyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZU1vbnN0ZXJTdGF0ZXMoKVxyXG5cclxuICAgICAgICBjb25zdCBleHBlcmllbmNlUmVxdWlyZWQgPSBybC5nZXRFeHBlcmllbmNlUmVxdWlyZW1lbnQocGxheWVyLmxldmVsICsgMSlcclxuICAgICAgICBpZiAocGxheWVyLmV4cGVyaWVuY2UgPj0gZXhwZXJpZW5jZVJlcXVpcmVkKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGV2ZWxEaWFsb2cuc2hvdygpXHJcbiAgICAgICAgICAgICsrcGxheWVyLmxldmVsXHJcbiAgICAgICAgICAgIHBsYXllci5leHBlcmllbmNlIC09IGV4cGVyaWVuY2VSZXF1aXJlZFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc2F2ZSBjdXJyZW50IHN0YXRlXHJcbiAgICAgICAgdGhpcy5zYXZlU3RhdGUoKVxyXG5cclxuICAgICAgICBpZiAocGxheWVyLmhlYWx0aCA8PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2xlYXJTdGF0ZSgpXHJcbiAgICAgICAgICAgIHRoaXMuZGVmZWF0RGlhbG9nLnNob3coKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFNjcm9sbE9mZnNldCgpOiBnZW8uUG9pbnQge1xyXG4gICAgICAgIC8vIGNvbnZlcnQgbWFwIHBvaW50IHRvIGNhbnZhcyBwb2ludCwgbm90aW5nIHRoYXQgY2FudmFzIGlzIGNlbnRlcmVkIG9uIHBsYXllclxyXG4gICAgICAgIGNvbnN0IHBsYXllclBvc2l0aW9uID0gdGhpcy5tYXAucGxheWVyLnBvc2l0aW9uXHJcbiAgICAgICAgY29uc3QgY2FudmFzQ2VudGVyID0gbmV3IGdlby5Qb2ludCh0aGlzLmNhbnZhcy53aWR0aCAvIDIsIHRoaXMuY2FudmFzLmhlaWdodCAvIDIpXHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gY2FudmFzQ2VudGVyLnN1YlBvaW50KHBsYXllclBvc2l0aW9uLmFkZFNjYWxhciguNSkubXVsU2NhbGFyKHRoaXMudGlsZVNpemUpKVxyXG4gICAgICAgIHJldHVybiBvZmZzZXQuZmxvb3IoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FudmFzVG9NYXBQb2ludChjeHk6IGdlby5Qb2ludCkge1xyXG4gICAgICAgIGNvbnN0IHNjcm9sbE9mZnNldCA9IHRoaXMuZ2V0U2Nyb2xsT2Zmc2V0KClcclxuICAgICAgICBjb25zdCBteHkgPSBjeHkuc3ViUG9pbnQoc2Nyb2xsT2Zmc2V0KS5kaXZTY2FsYXIodGhpcy50aWxlU2l6ZSkuZmxvb3IoKVxyXG4gICAgICAgIHJldHVybiBteHlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG1hcFRvQ2FudmFzUG9pbnQobXh5OiBnZW8uUG9pbnQpIHtcclxuICAgICAgICBjb25zdCBzY3JvbGxPZmZzZXQgPSB0aGlzLmdldFNjcm9sbE9mZnNldCgpXHJcbiAgICAgICAgY29uc3QgY3h5ID0gbXh5Lm11bFNjYWxhcih0aGlzLnRpbGVTaXplKS5hZGRQb2ludChzY3JvbGxPZmZzZXQpXHJcbiAgICAgICAgcmV0dXJuIGN4eVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHJvY2Vzc1BsYXllck1lbGVlQXR0YWNrKGRlZmVuZGVyOiBybC5Nb25zdGVyKSB7XHJcbiAgICAgICAgLy8gYmFzZSA2MCUgY2hhbmNlIHRvIGhpdFxyXG4gICAgICAgIC8vIDEwJSBib251cyAvIHBlbmFsdHkgZm9yIGV2ZXJ5IHBvaW50IGRpZmZlcmVuY2UgYmV0d2VlbiBhdHRhY2sgYW5kIGRlZmVuc2VcclxuICAgICAgICAvLyBib3R0b21zIG91dCBhdCA1JSAtIGFsd2F5cyBTT01FIGNoYW5jZSB0byBoaXRcclxuICAgICAgICBjb25zdCBhdHRhY2tlciA9IHRoaXMubWFwLnBsYXllci50aGluZ1xyXG4gICAgICAgIGNvbnN0IGJvbnVzID0gKGF0dGFja2VyLm1lbGVlQXR0YWNrIC0gZGVmZW5kZXIuZGVmZW5zZSkgKiAuMVxyXG4gICAgICAgIGNvbnN0IGhpdENoYW5jZSA9IE1hdGgubWluKE1hdGgubWF4KC42ICsgYm9udXMsIC4wNSksIC45NSlcclxuICAgICAgICBjb25zdCBoaXQgPSByYW5kLmNoYW5jZSh0aGlzLnJuZywgaGl0Q2hhbmNlKVxyXG4gICAgICAgIGNvbnN0IHdlYXBvbiA9IGF0dGFja2VyLm1lbGVlV2VhcG9uID8/IHRoaW5ncy5maXN0c1xyXG4gICAgICAgIGNvbnN0IGF0dGFja1ZlcmIgPSB3ZWFwb24udmVyYiA/IHdlYXBvbi52ZXJiIDogXCJhdHRhY2tzXCJcclxuICAgICAgICBhdHRhY2tlci5hY3Rpb24gLT0gd2VhcG9uLmFjdGlvblxyXG5cclxuICAgICAgICBpZiAoIWhpdCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYnV0IG1pc3NlcyFgKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhpdCAtIGNhbGN1bGF0ZSBkYW1hZ2VcclxuICAgICAgICBjb25zdCBkYW1hZ2UgPSBhdHRhY2tlci5tZWxlZURhbWFnZS5yb2xsKHRoaXMucm5nKVxyXG4gICAgICAgIG91dHB1dC53YXJuaW5nKGAke2F0dGFja2VyLm5hbWV9ICR7YXR0YWNrVmVyYn0gJHtkZWZlbmRlci5uYW1lfSBhbmQgaGl0cyBmb3IgJHtkYW1hZ2V9IGRhbWFnZSFgKVxyXG4gICAgICAgIGRlZmVuZGVyLmhlYWx0aCAtPSBkYW1hZ2VcclxuXHJcbiAgICAgICAgaWYgKGRlZmVuZGVyLmhlYWx0aCA8IDApIHtcclxuICAgICAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7ZGVmZW5kZXIubmFtZX0gaGFzIGJlZW4gZGVmZWF0ZWQgYW5kICR7YXR0YWNrZXIubmFtZX0gcmVjZWl2ZXMgJHtkZWZlbmRlci5leHBlcmllbmNlfSBleHBlcmllbmNlYClcclxuICAgICAgICAgICAgYXR0YWNrZXIuZXhwZXJpZW5jZSArPSBkZWZlbmRlci5leHBlcmllbmNlXHJcbiAgICAgICAgICAgIHRoaXMubWFwLm1vbnN0ZXJzLmRlbGV0ZShkZWZlbmRlcilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwcm9jZXNzUGxheWVyUmFuZ2VkQXR0YWNrKGRlZmVuZGVyOiBybC5Nb25zdGVyKSB7XHJcbiAgICAgICAgLy8gYmFzZSA0MCUgY2hhbmNlIHRvIGhpdFxyXG4gICAgICAgIC8vIDEwJSBib251cyAvIHBlbmFsdHkgZm9yIGV2ZXJ5IHBvaW50IGRpZmZlcmVuY2UgYmV0d2VlbiBhdHRhY2sgYW5kIGRlZmVuc2VcclxuICAgICAgICAvLyBib3R0b21zIG91dCBhdCA1JSAtIGFsd2F5cyBTT01FIGNoYW5jZSB0byBoaXRcclxuICAgICAgICBjb25zdCBhdHRhY2tlciA9IHRoaXMubWFwLnBsYXllci50aGluZ1xyXG4gICAgICAgIGlmICghYXR0YWNrZXIucmFuZ2VkV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBsYXllciBoYXMgbm8gcmFuZ2VkIHdlYXBvbiBlcXVpcHBlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgYm9udXMgPSAoYXR0YWNrZXIucmFuZ2VkQXR0YWNrIC0gZGVmZW5kZXIuZGVmZW5zZSkgKiAuMVxyXG4gICAgICAgIGNvbnN0IGhpdENoYW5jZSA9IE1hdGgubWluKE1hdGgubWF4KC42ICsgYm9udXMsIC4wNSksIC45NSlcclxuICAgICAgICBjb25zdCBoaXQgPSByYW5kLmNoYW5jZSh0aGlzLnJuZywgaGl0Q2hhbmNlKVxyXG4gICAgICAgIGNvbnN0IHdlYXBvbiA9IGF0dGFja2VyLnJhbmdlZFdlYXBvblxyXG4gICAgICAgIGNvbnN0IGF0dGFja1ZlcmIgPSB3ZWFwb24udmVyYiA/IHdlYXBvbi52ZXJiIDogXCJhdHRhY2tzXCJcclxuICAgICAgICBhdHRhY2tlci5hY3Rpb24gLT0gd2VhcG9uLmFjdGlvblxyXG5cclxuICAgICAgICBpZiAoIWhpdCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYnV0IG1pc3NlcyFgKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhpdCAtIGNhbGN1bGF0ZSBkYW1hZ2VcclxuICAgICAgICBjb25zdCBkYW1hZ2UgPSBhdHRhY2tlci5yYW5nZWREYW1hZ2U/LnJvbGwodGhpcy5ybmcpID8/IDBcclxuICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYW5kIGhpdHMgZm9yICR7ZGFtYWdlfSBkYW1hZ2UhYClcclxuICAgICAgICBkZWZlbmRlci5oZWFsdGggLT0gZGFtYWdlXHJcblxyXG4gICAgICAgIGlmIChkZWZlbmRlci5oZWFsdGggPCAwKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke2RlZmVuZGVyLm5hbWV9IGhhcyBiZWVuIGRlZmVhdGVkIGFuZCAke2F0dGFja2VyLm5hbWV9IHJlY2VpdmVzICR7ZGVmZW5kZXIuZXhwZXJpZW5jZX0gZXhwZXJpZW5jZWApXHJcbiAgICAgICAgICAgIGF0dGFja2VyLmV4cGVyaWVuY2UgKz0gZGVmZW5kZXIuZXhwZXJpZW5jZVxyXG4gICAgICAgICAgICB0aGlzLm1hcC5tb25zdGVycy5kZWxldGUoZGVmZW5kZXIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHJvY2Vzc01vbnN0ZXJBdHRhY2soYXR0YWNrZXI6IHJsLk1vbnN0ZXIsIGF0dGFjazogcmwuQXR0YWNrKSB7XHJcbiAgICAgICAgLy8gYmFzZSA2MCUgY2hhbmNlIHRvIGhpdFxyXG4gICAgICAgIC8vIDEwJSBib251cyAvIHBlbmFsdHkgZm9yIGV2ZXJ5IHBvaW50IGRpZmZlcmVuY2UgYmV0d2VlbiBhdHRhY2sgYW5kIGRlZmVuc2VcclxuICAgICAgICAvLyBjbGFtcHMgdG8gb3V0IGF0IFs1LCA5NV0gLSBhbHdheXMgU09NRSBjaGFuY2UgdG8gaGl0IG9yIG1pc3NcclxuICAgICAgICAvLyBjaG9vc2UgYW4gYXR0YWNrIGZyb20gcmVwZXJ0b2lyZSBvZiBtb25zdGVyXHJcbiAgICAgICAgY29uc3QgZGVmZW5kZXIgPSB0aGlzLm1hcC5wbGF5ZXIudGhpbmdcclxuICAgICAgICBjb25zdCBib251cyA9IChhdHRhY2suYXR0YWNrIC0gZGVmZW5kZXIuZGVmZW5zZSkgKiAuMVxyXG4gICAgICAgIGNvbnN0IGhpdENoYW5jZSA9IE1hdGgubWF4KC42ICsgYm9udXMsIC4wNSlcclxuICAgICAgICBjb25zdCBoaXQgPSByYW5kLmNoYW5jZSh0aGlzLnJuZywgaGl0Q2hhbmNlKVxyXG4gICAgICAgIGNvbnN0IGF0dGFja1ZlcmIgPSBhdHRhY2sudmVyYiA/IGF0dGFjay52ZXJiIDogXCJhdHRhY2tzXCJcclxuICAgICAgICBhdHRhY2tlci5hY3Rpb24gLT0gYXR0YWNrLmFjdGlvblxyXG5cclxuICAgICAgICBpZiAoIWhpdCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYnV0IG1pc3NlcyFgKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhpdCAtIGNhbGN1bGF0ZSBkYW1hZ2VcclxuICAgICAgICBjb25zdCBkYW1hZ2UgPSBhdHRhY2suZGFtYWdlLnJvbGwodGhpcy5ybmcpXHJcbiAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7YXR0YWNrZXIubmFtZX0gJHthdHRhY2tWZXJifSAke2RlZmVuZGVyLm5hbWV9IGFuZCBoaXRzIGZvciAke2RhbWFnZX0gZGFtYWdlIWApXHJcbiAgICAgICAgZGVmZW5kZXIuaGVhbHRoIC09IGRhbWFnZVxyXG5cclxuICAgICAgICBpZiAoZGVmZW5kZXIuaGVhbHRoIDw9IDApIHtcclxuICAgICAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7ZGVmZW5kZXIubmFtZX0gaGFzIGJlZW4gZGVmZWF0ZWQhYClcclxuICAgICAgICAgICAgdGhpcy5jbGVhclN0YXRlKClcclxuICAgICAgICAgICAgdGhpcy5kZWZlYXREaWFsb2cuc2hvdygpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlTW9uc3RlclN0YXRlcygpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IG1vbnN0ZXIgb2YgdGhpcy5tYXAubW9uc3RlcnMpIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVNb25zdGVyU3RhdGUobW9uc3RlcilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVNb25zdGVyU3RhdGUocGxhY2VkTW9uc3RlcjogbWFwcy5QbGFjZWQ8cmwuTW9uc3Rlcj4pIHtcclxuICAgICAgICAvLyBhZ2dybyBzdGF0ZVxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgbGV0IHsgcG9zaXRpb24sIHRoaW5nOiBtb25zdGVyIH0gPSBwbGFjZWRNb25zdGVyXHJcblxyXG4gICAgICAgIGNvbnN0IGxpZ2h0UmFkaXVzID0gdGhpcy5jYWxjTGlnaHRSYWRpdXMoKVxyXG4gICAgICAgIGlmIChtb25zdGVyLnN0YXRlICE9PSBybC5Nb25zdGVyU3RhdGUuYWdncm8gJiYgY2FuU2VlKG1hcCwgcG9zaXRpb24sIG1hcC5wbGF5ZXIucG9zaXRpb24sIGxpZ2h0UmFkaXVzKSkge1xyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvbiA9IDBcclxuICAgICAgICAgICAgbW9uc3Rlci5zdGF0ZSA9IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dyb1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIuc3RhdGUgPT09IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dybyAmJiAhY2FuU2VlKG1hcCwgcG9zaXRpb24sIG1hcC5wbGF5ZXIucG9zaXRpb24sIGxpZ2h0UmFkaXVzKSkge1xyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvbiA9IDBcclxuICAgICAgICAgICAgbW9uc3Rlci5zdGF0ZSA9IHJsLk1vbnN0ZXJTdGF0ZS5pZGxlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdGlja01vbnN0ZXIobW9uc3RlclBvc2l0aW9uOiBnZW8uUG9pbnQsIG1vbnN0ZXI6IHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAvLyBpZiBwbGF5ZXIgaXMgd2l0aGluIHJlYWNoIChhbmQgYWxpdmUpLCBhdHRhY2tcclxuICAgICAgICBsZXQgeyBwb3NpdGlvbjogcGxheWVyUG9zaXRpb24sIHRoaW5nOiBwbGF5ZXIgfSA9IHRoaXMubWFwLnBsYXllclxyXG5cclxuICAgICAgICAvLyBmaXJzdCBhdHRlbXB0IHRvIGF0dGFja1xyXG4gICAgICAgIGlmIChwbGF5ZXIuaGVhbHRoID4gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBkaXN0YW5jZVRvUGxheWVyID0gZ2VvLmNhbGNNYW5oYXR0ZW5EaXN0KHBsYXllclBvc2l0aW9uLCBtb25zdGVyUG9zaXRpb24pXHJcbiAgICAgICAgICAgIGNvbnN0IGF0dGFja3MgPSBtb25zdGVyLmF0dGFja3MuZmlsdGVyKGEgPT4gYS5yYW5nZSA+PSBkaXN0YW5jZVRvUGxheWVyKVxyXG4gICAgICAgICAgICBpZiAoYXR0YWNrcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhdHRhY2sgPSByYW5kLmNob29zZSh0aGlzLnJuZywgYXR0YWNrcylcclxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc01vbnN0ZXJBdHRhY2sobW9uc3RlciwgYXR0YWNrKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGRldGVybWluZSB3aGV0aGVyIG1vbnN0ZXIgY2FuIHNlZSBwbGF5ZXJcclxuICAgICAgICAvLyBzZWVrIGFuZCBkZXN0cm95XHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBjb25zdCBwYXRoID0gbWFwcy5maW5kUGF0aChtYXAsIG1vbnN0ZXJQb3NpdGlvbiwgcGxheWVyUG9zaXRpb24pXHJcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIC8vIHBhc3NcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gPSAwXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBwYXRoWzBdXHJcbiAgICAgICAgaWYgKG1hcC5pc1Bhc3NhYmxlKHBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvbiAtPSAxXHJcbiAgICAgICAgICAgIHRoaXMubWFwLm1vbnN0ZXJzLnNldChwb3NpdGlvbiwgbW9uc3RlcilcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvbiA9IDBcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVSZXNpemUoKSB7XHJcbiAgICAgICAgY29uc3QgY2FudmFzID0gdGhpcy5jYW52YXNcclxuICAgICAgICBpZiAoY2FudmFzLndpZHRoID09PSBjYW52YXMuY2xpZW50V2lkdGggJiYgY2FudmFzLmhlaWdodCA9PT0gY2FudmFzLmNsaWVudEhlaWdodCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUlucHV0KCkge1xyXG4gICAgICAgIGNvbnN0IGlucCA9IHRoaXMuaW5wXHJcblxyXG4gICAgICAgIC8vIHRhcmdldFxyXG4gICAgICAgIGlmICh0aGlzLmN1cnNvclBvc2l0aW9uICYmIChpbnAucHJlc3NlZChpbnB1dC5LZXkuRW50ZXIpIHx8IGlucC5wcmVzc2VkKFwiIFwiKSkpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVDdXJzb3JUYXJnZXQoKVxyXG4gICAgICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGN0cmwta2V5IGN1cnNvciBtb3ZlbWVudFxyXG4gICAgICAgIGlmICh0aGlzLmhhbmRsZUN1cnNvcktleWJvYXJkTW92ZW1lbnQoKSkge1xyXG4gICAgICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhhbmRsZVBsYXllcktleWJvYXJkTW92ZW1lbnQoKSkge1xyXG4gICAgICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGNsaWNrIG9uIG9iamVjdFxyXG4gICAgICAgIGlmICh0aGlzLmhhbmRsZUNsaWNrKCkpIHtcclxuICAgICAgICAgICAgaW5wLmZsdXNoKClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlQ3Vyc29yS2V5Ym9hcmRNb3ZlbWVudCgpOiBib29sZWFuIHtcclxuICAgICAgICBjb25zdCBpbnAgPSB0aGlzLmlucFxyXG4gICAgICAgIGlmICghaW5wLmhlbGQoaW5wdXQuS2V5LkNvbnRyb2wpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgeyBwb3NpdGlvbjogcGxheWVyUG9zaXRpb24sIHRoaW5nOiBwbGF5ZXIgfSA9IHRoaXMubWFwLnBsYXllclxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuY3Vyc29yUG9zaXRpb24pIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJzb3JQb3NpdGlvbiA9IHBsYXllclBvc2l0aW9uLmNsb25lKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcIndcIikgfHwgaW5wLnByZXNzZWQoXCJXXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dVcFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnNvclBvc2l0aW9uLnkgLT0gMVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGlucC5wcmVzc2VkKFwic1wiKSB8fCBpbnAucHJlc3NlZChcIlNcIikgfHwgaW5wLnByZXNzZWQoXCJBcnJvd0Rvd25cIikpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJzb3JQb3NpdGlvbi55ICs9IDFcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcImFcIikgfHwgaW5wLnByZXNzZWQoXCJBXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dMZWZ0XCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3Vyc29yUG9zaXRpb24ueCAtPSAxXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLnByZXNzZWQoXCJkXCIpIHx8IGlucC5wcmVzc2VkKFwiRFwiKSB8fCBpbnAucHJlc3NlZChcIkFycm93UmlnaHRcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJzb3JQb3NpdGlvbi54ICs9IDFcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcIiBcIikpIHtcclxuICAgICAgICAgICAgcGxheWVyLmFjdGlvblJlc2VydmUgKz0gcGxheWVyLmFjdGlvblxyXG4gICAgICAgICAgICBwbGF5ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVDbGljaygpOiBib29sZWFuIHtcclxuICAgICAgICAvLyBkZXRlcm1pbmUgdGhlIG1hcCBjb29yZGluYXRlcyB0aGUgdXNlciBjbGlja2VkIG9uXHJcbiAgICAgICAgY29uc3QgaW5wID0gdGhpcy5pbnBcclxuXHJcbiAgICAgICAgaWYgKCFpbnAubW91c2VMZWZ0UmVsZWFzZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5oYW5kbGVUYXJnZXRDb21tYW5kQ2xpY2soKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbXh5ID0gdGhpcy5jYW52YXNUb01hcFBvaW50KG5ldyBnZW8uUG9pbnQoaW5wLm1vdXNlWCwgaW5wLm1vdXNlWSkpXHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBjb25zdCB7IHBvc2l0aW9uOiBwbGF5ZXJQb3NpdGlvbiwgdGhpbmc6IHBsYXllciB9ID0gdGhpcy5tYXAucGxheWVyXHJcblxyXG4gICAgICAgIGNvbnN0IGNsaWNrRml4dHVyZSA9IG1hcC5maXh0dXJlQXQobXh5KVxyXG4gICAgICAgIGlmIChjbGlja0ZpeHR1cmUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYFlvdSBzZWUgJHtjbGlja0ZpeHR1cmUubmFtZX1gKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY2xpY2tNb25zdGVyID0gbWFwLm1vbnN0ZXJBdChteHkpXHJcbiAgICAgICAgLy8gZmlyc3QsIHRyeSBtZWxlZVxyXG4gICAgICAgIGlmIChjbGlja01vbnN0ZXIpIHtcclxuICAgICAgICAgICAgY29uc3QgZGlzdCA9IGdlby5jYWxjTWFuaGF0dGVuRGlzdChwbGF5ZXJQb3NpdGlvbiwgbXh5KVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImRpc3Q6XCIsIGRpc3QpXHJcbiAgICAgICAgICAgIGlmIChkaXN0IDw9IChwbGF5ZXIubWVsZWVXZWFwb24/LnJhbmdlID8/IDApKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NQbGF5ZXJNZWxlZUF0dGFjayhjbGlja01vbnN0ZXIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZGlzdCA8PSAocGxheWVyLnJhbmdlZFdlYXBvbj8ucmFuZ2UgPz8gMCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1BsYXllclJhbmdlZEF0dGFjayhjbGlja01vbnN0ZXIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke2NsaWNrTW9uc3Rlci5uYW1lfWApXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBkeHkgPSBteHkuc3ViUG9pbnQocGxheWVyUG9zaXRpb24pXHJcbiAgICAgICAgY29uc3Qgc2duID0gZHh5LnNpZ24oKVxyXG4gICAgICAgIGNvbnN0IGFicyA9IGR4eS5hYnMoKVxyXG5cclxuICAgICAgICBpZiAoYWJzLnggPiAwICYmIGFicy54ID49IGFicy55KSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlTW92ZShzZ24ueCA+IDAgPyBEaXJlY3Rpb24uRWFzdCA6IERpcmVjdGlvbi5XZXN0KVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGFicy55ID4gMCAmJiBhYnMueSA+IGFicy54KSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlTW92ZShzZ24ueSA+IDAgPyBEaXJlY3Rpb24uU291dGggOiBEaXJlY3Rpb24uTm9ydGgpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZVBsYXllcktleWJvYXJkTW92ZW1lbnQoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgbGV0IGlucCA9IHRoaXMuaW5wXHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcIndcIikgfHwgaW5wLnByZXNzZWQoXCJXXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dVcFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1vdmUoRGlyZWN0aW9uLk5vcnRoKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGlucC5wcmVzc2VkKFwic1wiKSB8fCBpbnAucHJlc3NlZChcIlNcIikgfHwgaW5wLnByZXNzZWQoXCJBcnJvd0Rvd25cIikpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVNb3ZlKERpcmVjdGlvbi5Tb3V0aClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcImFcIikgfHwgaW5wLnByZXNzZWQoXCJBXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dMZWZ0XCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlTW92ZShEaXJlY3Rpb24uV2VzdClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcImRcIikgfHwgaW5wLnByZXNzZWQoXCJEXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dSaWdodFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1vdmUoRGlyZWN0aW9uLkVhc3QpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZU1vdmUoZGlyOiBEaXJlY3Rpb24pIHtcclxuICAgICAgICAvLyBjbGVhciBjdXJzb3Igb24gbW92ZW1lbnRcclxuICAgICAgICB0aGlzLmN1cnNvclBvc2l0aW9uID0gdW5kZWZpbmVkXHJcbiAgICAgICAgY29uc3QgeyBwb3NpdGlvbjogcGxheWVyUG9zaXRpb24sIHRoaW5nOiBwbGF5ZXIgfSA9IHRoaXMubWFwLnBsYXllclxyXG5cclxuICAgICAgICBsZXQgbmV3UG9zaXRpb24gPSBwbGF5ZXJQb3NpdGlvbi5hZGRQb2ludChkaXJlY3Rpb25WZWN0b3IoZGlyKSlcclxuICAgICAgICBpZiAoIXRoaXMubWFwLmluQm91bmRzKG5ld1Bvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgY29uc3QgdGlsZSA9IG1hcC50aWxlQXQobmV3UG9zaXRpb24pXHJcbiAgICAgICAgaWYgKHRpbGUgJiYgIXRpbGUucGFzc2FibGUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYEJsb2NrZWQgYnkgJHt0aWxlLm5hbWV9YClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtb25zdGVyID0gbWFwLm1vbnN0ZXJBdChuZXdQb3NpdGlvbilcclxuICAgICAgICBpZiAobW9uc3Rlcikge1xyXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NQbGF5ZXJNZWxlZUF0dGFjayhtb25zdGVyKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IG1hcC5jb250YWluZXJBdChuZXdQb3NpdGlvbilcclxuICAgICAgICBpZiAoY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyRGlhbG9nLnNob3cobWFwLCBjb250YWluZXIpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZml4dHVyZSA9IG1hcC5maXh0dXJlQXQobmV3UG9zaXRpb24pXHJcbiAgICAgICAgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5Eb29yKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGAke2ZpeHR1cmUubmFtZX0gb3BlbmVkYClcclxuICAgICAgICAgICAgdGhpcy5tYXAuZml4dHVyZXMuZGVsZXRlKGZpeHR1cmUpXHJcbiAgICAgICAgICAgIHBsYXllci5hY3Rpb24gLT0gMVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9IGVsc2UgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5FeGl0KSB7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlRXhpdChmaXh0dXJlLmRpcmVjdGlvbilcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfSBlbHNlIGlmIChmaXh0dXJlICYmICFmaXh0dXJlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBDYW4ndCBtb3ZlIHRoYXQgd2F5LCBibG9ja2VkIGJ5ICR7Zml4dHVyZS5uYW1lfWApXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWFwLnBsYXllci5wb3NpdGlvbiA9IG5ld1Bvc2l0aW9uXHJcbiAgICAgICAgcGxheWVyLmFjdGlvbiAtPSAxXHJcbiAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5KClcclxuXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVDdXJzb3JUYXJnZXQoKSB7XHJcbiAgICAgICAgY29uc3QgY3Vyc29yUG9zaXRpb24gPSB0aGlzLmN1cnNvclBvc2l0aW9uXHJcbiAgICAgICAgaWYgKCFjdXJzb3JQb3NpdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgY29uc3QgdGlsZSA9IG1hcC50aWxlQXQoY3Vyc29yUG9zaXRpb24pXHJcblxyXG4gICAgICAgIGlmICghdGlsZSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbygnTm90aGluZyBoZXJlJylcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobWFwLnZpc2liaWxpdHlBdChjdXJzb3JQb3NpdGlvbikgIT09IG1hcHMuVmlzaWJpbGl0eS5WaXNpYmxlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBUYXJnZXQgbm90IHZpc2libGVgKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHsgcG9zaXRpb246IHBsYXllclBvc2l0aW9uLCB0aGluZzogcGxheWVyIH0gPSB0aGlzLm1hcC5wbGF5ZXJcclxuICAgICAgICBjb25zdCBkaXN0VG9UYXJnZXQgPSBnZW8uY2FsY01hbmhhdHRlbkRpc3QocGxheWVyUG9zaXRpb24sIGN1cnNvclBvc2l0aW9uKVxyXG4gICAgICAgIGNvbnN0IG1vbnN0ZXIgPSBtYXAubW9uc3RlckF0KGN1cnNvclBvc2l0aW9uKVxyXG5cclxuICAgICAgICBpZiAobW9uc3RlciAmJiBkaXN0VG9UYXJnZXQgPD0gMSkge1xyXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NQbGF5ZXJNZWxlZUF0dGFjayhtb25zdGVyKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChtb25zdGVyICYmIGRpc3RUb1RhcmdldCA+IDEgJiYgcGxheWVyLnJhbmdlZFdlYXBvbikge1xyXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NQbGF5ZXJSYW5nZWRBdHRhY2sobW9uc3RlcilcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb250YWluZXIgPSBtYXAuY29udGFpbmVyQXQoY3Vyc29yUG9zaXRpb24pXHJcbiAgICAgICAgaWYgKGNvbnRhaW5lciAmJiBkaXN0VG9UYXJnZXQgPD0gMSkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lckRpYWxvZy5zaG93KG1hcCwgY29udGFpbmVyKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGZpeHR1cmUgPSBtYXAuZml4dHVyZUF0KGN1cnNvclBvc2l0aW9uKVxyXG4gICAgICAgIGlmIChmaXh0dXJlIGluc3RhbmNlb2YgcmwuRG9vciAmJiBkaXN0VG9UYXJnZXQgPD0gMSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgJHtmaXh0dXJlLm5hbWV9IG9wZW5lZGApXHJcbiAgICAgICAgICAgIHRoaXMubWFwLmZpeHR1cmVzLmRlbGV0ZShmaXh0dXJlKVxyXG4gICAgICAgICAgICBwbGF5ZXIuYWN0aW9uIC09IDFcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBsYXN0bHkgLSBwZXJmb3JtIGEgbG9va1xyXG4gICAgICAgIGZvciAoY29uc3QgdGggb2YgdGhpcy5tYXAuYXQoY3Vyc29yUG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBZb3Ugc2VlICR7dGgubmFtZX1gKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZVRhcmdldENvbW1hbmRDbGljaygpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaW5wLm1vdXNlTGVmdFJlbGVhc2VkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMudGFyZ2V0Q29tbWFuZCA9PT0gVGFyZ2V0Q29tbWFuZC5Ob25lKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY3h5ID0gbmV3IGdlby5Qb2ludCh0aGlzLmlucC5tb3VzZVgsIHRoaXMuaW5wLm1vdXNlWSlcclxuICAgICAgICBjb25zdCBteHkgPSB0aGlzLmNhbnZhc1RvTWFwUG9pbnQoY3h5KVxyXG5cclxuICAgICAgICBjb25zdCBsaWdodFJhZGl1cyA9IHRoaXMuY2FsY0xpZ2h0UmFkaXVzKClcclxuICAgICAgICBpZiAoIWNhblNlZSh0aGlzLm1hcCwgdGhpcy5tYXAucGxheWVyLnBvc2l0aW9uLCBteHksIGxpZ2h0UmFkaXVzKSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuZXJyb3IoYENhbid0IHNlZSFgKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3dpdGNoICh0aGlzLnRhcmdldENvbW1hbmQpIHtcclxuICAgICAgICAgICAgY2FzZSBUYXJnZXRDb21tYW5kLkxvb2s6IHtcclxuICAgICAgICAgICAgICAgIC8vIHNob3cgd2hhdCB1c2VyIGNsaWNrZWQgb25cclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdGggb2YgdGhpcy5tYXAuYXQobXh5KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5pbmZvKGBZb3Ugc2VlICR7dGgubmFtZX1gKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUYXJnZXRDb21tYW5kLkF0dGFjazoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbW9uc3RlciA9IHRoaXMubWFwLm1vbnN0ZXJBdChteHkpXHJcbiAgICAgICAgICAgICAgICBpZiAobW9uc3Rlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1BsYXllck1lbGVlQXR0YWNrKG1vbnN0ZXIpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5pbmZvKFwiTm90aGluZyB0byBhdHRhY2sgaGVyZS5cIilcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVGFyZ2V0Q29tbWFuZC5TaG9vdDoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbW9uc3RlciA9IHRoaXMubWFwLm1vbnN0ZXJBdChteHkpXHJcbiAgICAgICAgICAgICAgICBpZiAobW9uc3Rlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1BsYXllclJhbmdlZEF0dGFjayhtb25zdGVyKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuaW5mbyhcIk5vdGhpbmcgdG8gc2hvb3QgaGVyZS5cIilcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuTm9uZVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVWaXNpYmlsaXR5KCkge1xyXG4gICAgICAgIC8vIHVwZGF0ZSB2aXNpYmlsaXR5IGFyb3VuZCBwbGF5ZXJcclxuICAgICAgICAvLyBsaW1pdCByYWRpdXMgdG8gdmlzaWJsZSB2aWV3cG9ydCBhcmVhXHJcbiAgICAgICAgY29uc3Qgdmlld3BvcnRMaWdodFJhZGl1cyA9IE1hdGgubWF4KE1hdGguY2VpbCh0aGlzLmNhbnZhcy53aWR0aCAvIHRoaXMudGlsZVNpemUpLCBNYXRoLmNlaWwodGhpcy5jYW52YXMuaGVpZ2h0IC8gdGhpcy50aWxlU2l6ZSkpXHJcbiAgICAgICAgdGhpcy5tYXAudXBkYXRlVmlzaWJsZSh2aWV3cG9ydExpZ2h0UmFkaXVzKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FsY01hcFZpZXdwb3J0KCk6IGdlby5BQUJCIHtcclxuICAgICAgICBjb25zdCBhYWJiID0gbmV3IGdlby5BQUJCKFxyXG4gICAgICAgICAgICB0aGlzLmNhbnZhc1RvTWFwUG9pbnQobmV3IGdlby5Qb2ludCgwLCAwKSksXHJcbiAgICAgICAgICAgIHRoaXMuY2FudmFzVG9NYXBQb2ludChuZXcgZ2VvLlBvaW50KHRoaXMuY2FudmFzLndpZHRoICsgdGhpcy50aWxlU2l6ZSwgdGhpcy5jYW52YXMuaGVpZ2h0ICsgdGhpcy50aWxlU2l6ZSkpKVxyXG4gICAgICAgICAgICAuaW50ZXJzZWN0aW9uKG5ldyBnZW8uQUFCQihuZXcgZ2VvLlBvaW50KDAsIDApLCBuZXcgZ2VvLlBvaW50KHRoaXMubWFwLndpZHRoLCB0aGlzLm1hcC5oZWlnaHQpKSlcclxuXHJcbiAgICAgICAgcmV0dXJuIGFhYmJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNhbGNMaWdodFJhZGl1cygpOiBudW1iZXIge1xyXG4gICAgICAgIGNvbnN0IHZpZXdwb3J0TGlnaHRSYWRpdXMgPSBNYXRoLm1heChNYXRoLmNlaWwodGhpcy5jYW52YXMud2lkdGggLyB0aGlzLnRpbGVTaXplKSwgTWF0aC5jZWlsKHRoaXMuY2FudmFzLmhlaWdodCAvIHRoaXMudGlsZVNpemUpKVxyXG4gICAgICAgIGlmICh0aGlzLm1hcC5saWdodGluZyA9PT0gbWFwcy5MaWdodGluZy5BbWJpZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2aWV3cG9ydExpZ2h0UmFkaXVzXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gTWF0aC5taW4odmlld3BvcnRMaWdodFJhZGl1cywgdGhpcy5tYXAucGxheWVyLnRoaW5nLmxpZ2h0UmFkaXVzKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd0ZyYW1lKCkge1xyXG4gICAgICAgIC8vIGNlbnRlciB0aGUgZ3JpZCBhcm91bmQgdGhlIHBsYXllcmRcclxuICAgICAgICBjb25zdCB2aWV3cG9ydEFBQkIgPSB0aGlzLmNhbGNNYXBWaWV3cG9ydCgpXHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gdGhpcy5nZXRTY3JvbGxPZmZzZXQoKVxyXG5cclxuICAgICAgICAvLyBub3RlIC0gZHJhd2luZyBvcmRlciBtYXR0ZXJzIC0gZHJhdyBmcm9tIGJvdHRvbSB0byB0b3BcclxuICAgICAgICBpZiAodGhpcy50YXJnZXRDb21tYW5kICE9PSBUYXJnZXRDb21tYW5kLk5vbmUpIHtcclxuICAgICAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuY3Vyc29yID0gXCJjcm9zc2hhaXJcIlxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2FudmFzLnN0eWxlLmN1cnNvciA9IFwiXCJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2hvb3RCdXR0b24uZGlzYWJsZWQgPSAhdGhpcy5tYXAucGxheWVyLnRoaW5nLnJhbmdlZFdlYXBvblxyXG5cclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGNvbnN0IHRpbGVzID0gbWFwLnRpbGVzLndpdGhpbih2aWV3cG9ydEFBQkIpXHJcbiAgICAgICAgY29uc3QgZml4dHVyZXMgPSBtYXAuZml4dHVyZXMud2l0aGluKHZpZXdwb3J0QUFCQilcclxuICAgICAgICBjb25zdCBjb250YWluZXJzID0gbWFwLmNvbnRhaW5lcnMud2l0aGluKHZpZXdwb3J0QUFCQilcclxuICAgICAgICBjb25zdCBtb25zdGVycyA9IG1hcC5tb25zdGVycy53aXRoaW4odmlld3BvcnRBQUJCKVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHRpbGUgb2YgdGlsZXMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCB0aWxlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBmaXh0dXJlIG9mIGZpeHR1cmVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgZml4dHVyZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgY29udGFpbmVyIG9mIGNvbnRhaW5lcnMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCBjb250YWluZXIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGNyZWF0dXJlIG9mIG1vbnN0ZXJzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgY3JlYXR1cmUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIHRoaXMubWFwLnBsYXllcilcclxuICAgICAgICB0aGlzLmRyYXdIZWFsdGhCYXIob2Zmc2V0LCB0aGlzLm1hcC5wbGF5ZXIpXHJcbiAgICAgICAgdGhpcy5kcmF3Q3Vyc29yKG9mZnNldClcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5mbHVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkcmF3VGhpbmcob2Zmc2V0OiBnZW8uUG9pbnQsIHBsYWNlZFRoaW5nOiBtYXBzLlBsYWNlZDxybC5UaGluZz4pIHtcclxuICAgICAgICBjb25zdCB7IHBvc2l0aW9uLCB0aGluZyB9ID0gcGxhY2VkVGhpbmdcclxuICAgICAgICBjb25zdCB2aXNpYmxlID0gdGhpcy5tYXAudmlzaWJpbGl0eUF0KHBvc2l0aW9uKVxyXG4gICAgICAgIGlmICh2aXNpYmxlID09PSBtYXBzLlZpc2liaWxpdHkuTm9uZSB8fCB2aXNpYmxlID09IG1hcHMuVmlzaWJpbGl0eS5EYXJrKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29sb3IgPSB0aGluZy5jb2xvci5jbG9uZSgpXHJcbiAgICAgICAgaWYgKHZpc2libGUgPT09IG1hcHMuVmlzaWJpbGl0eS5Gb2cpIHtcclxuICAgICAgICAgICAgY29sb3IuYSA9IC4yNVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmF3SW1hZ2Uob2Zmc2V0LCBwb3NpdGlvbiwgdGhpbmcuaW1hZ2UsIGNvbG9yKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd0N1cnNvcihvZmZzZXQ6IGdlby5Qb2ludCkge1xyXG4gICAgICAgIGlmICghdGhpcy5jdXJzb3JQb3NpdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZHJhd0ltYWdlKG9mZnNldCwgdGhpcy5jdXJzb3JQb3NpdGlvbiwgXCIuL2Fzc2V0cy9jdXJzb3IucG5nXCIsIGdmeC5Db2xvci5yZWQpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkcmF3SW1hZ2Uob2Zmc2V0OiBnZW8uUG9pbnQsIHBvc2l0aW9uOiBnZW8uUG9pbnQsIGltYWdlOiBzdHJpbmcsIGNvbG9yOiBnZnguQ29sb3IgPSBnZnguQ29sb3Iud2hpdGUpIHtcclxuICAgICAgICBjb25zdCBzcHJpdGVQb3NpdGlvbiA9IHBvc2l0aW9uLm11bFNjYWxhcih0aGlzLnRpbGVTaXplKS5hZGRQb2ludChvZmZzZXQpXHJcbiAgICAgICAgY29uc3QgbGF5ZXIgPSB0aGlzLmltYWdlTWFwLmdldChpbWFnZSlcclxuXHJcbiAgICAgICAgaWYgKGxheWVyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGltYWdlIG1hcHBpbmc6ICR7aW1hZ2V9YClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHNwcml0ZSA9IG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLFxyXG4gICAgICAgICAgICBjb2xvcixcclxuICAgICAgICAgICAgd2lkdGg6IHRoaXMudGlsZVNpemUsXHJcbiAgICAgICAgICAgIGhlaWdodDogdGhpcy50aWxlU2l6ZSxcclxuICAgICAgICAgICAgdGV4dHVyZTogdGhpcy50ZXh0dXJlLFxyXG4gICAgICAgICAgICBsYXllcjogbGF5ZXIsXHJcbiAgICAgICAgICAgIGZsYWdzOiBnZnguU3ByaXRlRmxhZ3MuQXJyYXlUZXh0dXJlXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3U3ByaXRlKHNwcml0ZSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyYXdIZWFsdGhCYXIob2Zmc2V0OiBnZW8uUG9pbnQsIHBsYWNlZENyZWF0dXJlOiBtYXBzLlBsYWNlZDxybC5DcmVhdHVyZT4pIHtcclxuICAgICAgICBjb25zdCB7IHBvc2l0aW9uLCB0aGluZzogY3JlYXR1cmUgfSA9IHBsYWNlZENyZWF0dXJlXHJcbiAgICAgICAgY29uc3QgaGVhbHRoID0gTWF0aC5tYXgoY3JlYXR1cmUuaGVhbHRoLCAwKVxyXG4gICAgICAgIGNvbnN0IGJvcmRlcldpZHRoID0gaGVhbHRoICogNCArIDJcclxuICAgICAgICBjb25zdCBpbnRlcmlvcldpZHRoID0gaGVhbHRoICogNFxyXG4gICAgICAgIGNvbnN0IHNwcml0ZVBvc2l0aW9uID0gcG9zaXRpb24ubXVsU2NhbGFyKHRoaXMudGlsZVNpemUpLmFkZFBvaW50KG9mZnNldCkuc3ViUG9pbnQobmV3IGdlby5Qb2ludCgwLCB0aGlzLnRpbGVTaXplIC8gMikpXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3U3ByaXRlKG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLFxyXG4gICAgICAgICAgICBjb2xvcjogZ2Z4LkNvbG9yLndoaXRlLFxyXG4gICAgICAgICAgICB3aWR0aDogYm9yZGVyV2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodDogOFxyXG4gICAgICAgIH0pKVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdTcHJpdGUobmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24uYWRkUG9pbnQobmV3IGdlby5Qb2ludCgxLCAxKSksXHJcbiAgICAgICAgICAgIGNvbG9yOiBnZnguQ29sb3IucmVkLFxyXG4gICAgICAgICAgICB3aWR0aDogaW50ZXJpb3JXaWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0OiA2XHJcbiAgICAgICAgfSkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoaWRlRGlhbG9ncygpIHtcclxuICAgICAgICB0aGlzLmludmVudG9yeURpYWxvZy5oaWRlKClcclxuICAgICAgICB0aGlzLnN0YXRzRGlhbG9nLmhpZGUoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IHRpbGVTaXplKCkge1xyXG4gICAgICAgIHJldHVybiBybC50aWxlU2l6ZSAqIHRoaXMuem9vbVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlS2V5UHJlc3MoZXY6IEtleWJvYXJkRXZlbnQpIHtcclxuICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG5cclxuICAgICAgICBzd2l0Y2ggKGtleSkge1xyXG4gICAgICAgICAgICBjYXNlIFwiSVwiOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB3YXNIaWRkZW4gPSB0aGlzLmludmVudG9yeURpYWxvZy5oaWRkZW5cclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZURpYWxvZ3MoKVxyXG4gICAgICAgICAgICAgICAgaWYgKHdhc0hpZGRlbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW52ZW50b3J5RGlhbG9nLnNob3coKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIlpcIjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgd2FzSGlkZGVuID0gdGhpcy5zdGF0c0RpYWxvZy5oaWRkZW5cclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZURpYWxvZ3MoKVxyXG4gICAgICAgICAgICAgICAgaWYgKHdhc0hpZGRlbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdHNEaWFsb2cuc2hvdygpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIFwiTFwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5Mb29rXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIkVOVEVSXCI6XHJcbiAgICAgICAgICAgICAgICBpZiAoZXYuY3RybEtleSAmJiB0aGlzLm1hcC5wbGF5ZXIudGhpbmcucmFuZ2VkV2VhcG9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5TaG9vdFxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLkF0dGFja1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCJMXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLkxvb2tcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIFwiPVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy56b29tID0gTWF0aC5taW4odGhpcy56b29tICogMiwgMTYpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHkoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCItXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnpvb20gPSBNYXRoLm1heCh0aGlzLnpvb20gLyAyLCAuMTI1KVxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5KClcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2xlYXJTdGF0ZSgpIHtcclxuICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShTVE9SQUdFX0tFWSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNhdmVTdGF0ZSgpIHtcclxuICAgICAgICAvLyBzYXZlIHRoZSBjdXJyZW50IGdhbWUgc3RhdGVcclxuICAgICAgICB2YXIgc3RhdGU6IEFwcFNhdmVTdGF0ZSA9IHtcclxuICAgICAgICAgICAgcm5nOiB0aGlzLnJuZy5zYXZlKCksXHJcbiAgICAgICAgICAgIGZsb29yOiB0aGlzLmZsb29yLFxyXG4gICAgICAgICAgICBwbGF5ZXI6IHRoaXMubWFwLnBsYXllci50aGluZy5zYXZlKCksXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBqc29uU3RhdGUgPSBKU09OLnN0cmluZ2lmeShzdGF0ZSlcclxuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShTVE9SQUdFX0tFWSwganNvblN0YXRlKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlRXhpdChkaXI6IHJsLkV4aXREaXJlY3Rpb24pIHtcclxuICAgICAgICBpZiAoZGlyID09IHJsLkV4aXREaXJlY3Rpb24uVXAgJiYgdGhpcy5mbG9vciA9PSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvcERpYWxvZy5zaG93KClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzd2l0Y2ggKGRpcikge1xyXG4gICAgICAgICAgICBjYXNlIHJsLkV4aXREaXJlY3Rpb24uVXA6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZsb29yIC09IDFcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgIGNhc2UgcmwuRXhpdERpcmVjdGlvbi5Eb3duOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5mbG9vciArPSAxXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZ2VuZXJhdGVNYXAoZGlyKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVNYXAoZGlyOiBybC5FeGl0RGlyZWN0aW9uKSB7XHJcbiAgICAgICAgdGhpcy5tYXAgPSBhd2FpdCBnZW4uZ2VuZXJhdGVEdW5nZW9uTGV2ZWwodGhpcy5ybmcsIHRoaW5ncy5kYiwgdGhpcy5tYXAucGxheWVyLnRoaW5nLCB0aGlzLmZsb29yLCBkaXIpXHJcbiAgICAgICAgY29uc3QgW3RleHR1cmUsIGltYWdlTWFwXSA9IGF3YWl0IGxvYWRJbWFnZXModGhpcy5yZW5kZXJlciwgdGhpcy5tYXApXHJcbiAgICAgICAgdGhpcy50ZXh0dXJlID0gdGV4dHVyZVxyXG4gICAgICAgIHRoaXMuaW1hZ2VNYXAgPSBpbWFnZU1hcFxyXG4gICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eSgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSBBcHBTYXZlU3RhdGUge1xyXG4gICAgcmVhZG9ubHkgcm5nOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXVxyXG4gICAgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXJTYXZlU3RhdGVcclxuICAgIHJlYWRvbmx5IGZsb29yOiBudW1iZXJcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gbG9hZEltYWdlcyhyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBtYXA6IG1hcHMuTWFwKTogUHJvbWlzZTxbZ2Z4LlRleHR1cmUsIE1hcDxzdHJpbmcsIG51bWJlcj5dPiB7XHJcbiAgICAvLyBiYWtlIGFsbCAyNHgyNCB0aWxlIGltYWdlcyB0byBhIHNpbmdsZSBhcnJheSB0ZXh0dXJlXHJcbiAgICAvLyBzdG9yZSBtYXBwaW5nIGZyb20gaW1hZ2UgdXJsIHRvIGluZGV4XHJcbiAgICBjb25zdCBpbWFnZVVybHMgPSBpdGVyLndyYXAobWFwLnRoaW5ncygpKS5tYXAodGggPT4gdGguaW1hZ2UpLmZpbHRlcigpLmRpc3RpbmN0KCkudG9BcnJheSgpXHJcbiAgICBpbWFnZVVybHMucHVzaChcIi4vYXNzZXRzL2N1cnNvci5wbmdcIilcclxuXHJcbiAgICBjb25zdCBpbWFnZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KGltYWdlVXJscy5tYXAoKHVybCwgaSkgPT4gW3VybCwgaV0pKVxyXG4gICAgY29uc3QgaW1hZ2VzID0gYXdhaXQgUHJvbWlzZS5hbGwoaW1hZ2VVcmxzLm1hcCh1cmwgPT4gZG9tLmxvYWRJbWFnZSh1cmwpKSlcclxuICAgIGNvbnN0IHRleHR1cmUgPSByZW5kZXJlci5iYWtlVGV4dHVyZUFycmF5KHJsLnRpbGVTaXplLCBybC50aWxlU2l6ZSwgaW1hZ2VzKVxyXG5cclxuICAgIHJldHVybiBbdGV4dHVyZSwgaW1hZ2VNYXBdXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRTdGF0ZSgpOiBBcHBTYXZlU3RhdGUgfCBudWxsIHtcclxuICAgIGNvbnN0IGpzb24gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShTVE9SQUdFX0tFWSlcclxuICAgIGlmICghanNvbikge1xyXG4gICAgICAgIHJldHVybiBudWxsXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc3RhdGUgPSBKU09OLnBhcnNlKGpzb24pIGFzIEFwcFNhdmVTdGF0ZVxyXG4gICAgcmV0dXJuIHN0YXRlXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICBjb25zdCBhcHAgPSBhd2FpdCBBcHAuY3JlYXRlKClcclxuICAgIGFwcC5leGVjKClcclxufVxyXG5cclxuaW5pdCgpIl19