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
            const name = item instanceof rl.LightSource ? `${item.name} (${item.duration})` : item.name;
            itemIndexTd.textContent = (i + 1).toString();
            itemNameTd.textContent = name;
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
        // advance duration of items
        if (player.lightSource && player.lightSource.duration > 0) {
            player.lightSource.duration -= 1;
            if (player.lightSource.duration === 0) {
                output.warning(`Your ${player.lightSource.name} has been extinguished!`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBQ2pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFFekMsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFBO0FBU25DLFNBQVMsZUFBZSxDQUFDLEdBQWM7SUFDbkMsUUFBUSxHQUFHLEVBQUU7UUFDVDtZQUNJLE9BQU8sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9CO1lBQ0ksT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlCO1lBQ0ksT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlCO1lBQ0ksT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7S0FDbEM7QUFDTCxDQUFDO0FBRUQsTUFBTSxNQUFNO0lBRVIsWUFBNEIsSUFBaUIsRUFB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LE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzFFLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFFM0UsT0FBTyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQTtBQUM5QixDQUFDO0FBRUQsU0FBUyxTQUFTO0lBQ2QsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUM5QyxJQUFJLENBQUMsSUFBSSxFQUFFO1FBQ1AsT0FBTyxJQUFJLENBQUE7S0FDZDtJQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFpQixDQUFBO0lBQzlDLE9BQU8sS0FBSyxDQUFBO0FBQ2hCLENBQUM7QUFFRCxLQUFLLFVBQVUsSUFBSTtJQUNmLE1BQU0sR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQzlCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtBQUNkLENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGl0ZXIgZnJvbSBcIi4uL3NoYXJlZC9pdGVyLmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbiBmcm9tIFwiLi9nZW4uanNcIlxyXG5pbXBvcnQgKiBhcyBpbnB1dCBmcm9tIFwiLi4vc2hhcmVkL2lucHV0LmpzXCJcclxuaW1wb3J0ICogYXMgcmwgZnJvbSBcIi4vcmwuanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcbmltcG9ydCAqIGFzIG91dHB1dCBmcm9tIFwiLi9vdXRwdXQuanNcIlxyXG5pbXBvcnQgKiBhcyB0aGluZ3MgZnJvbSBcIi4vdGhpbmdzLmpzXCJcclxuaW1wb3J0ICogYXMgbWFwcyBmcm9tIFwiLi9tYXBzLmpzXCJcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIlxyXG5cclxuY29uc3QgU1RPUkFHRV9LRVkgPSBcImNyYXdsX3N0b3JhZ2VcIlxyXG5cclxuY29uc3QgZW51bSBEaXJlY3Rpb24ge1xyXG4gICAgTm9ydGgsXHJcbiAgICBTb3V0aCxcclxuICAgIEVhc3QsXHJcbiAgICBXZXN0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpcmVjdGlvblZlY3RvcihkaXI6IERpcmVjdGlvbik6IGdlby5Qb2ludCB7XHJcbiAgICBzd2l0Y2ggKGRpcikge1xyXG4gICAgICAgIGNhc2UgRGlyZWN0aW9uLk5vcnRoOlxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgwLCAtMSlcclxuICAgICAgICBjYXNlIERpcmVjdGlvbi5Tb3V0aDpcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMCwgMSlcclxuICAgICAgICBjYXNlIERpcmVjdGlvbi5FYXN0OlxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgxLCAwKVxyXG4gICAgICAgIGNhc2UgRGlyZWN0aW9uLldlc3Q6XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KC0xLCAwKVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtb2RhbEJhY2tncm91bmQgPSBkb20uYnlJZChcIm1vZGFsQmFja2dyb3VuZFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGVsZW06IEhUTUxFbGVtZW50LCBwcml2YXRlIHJlYWRvbmx5IGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHsgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5tb2RhbEJhY2tncm91bmQuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmVsZW0uaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmVsZW0uZm9jdXMoKVxyXG4gICAgfVxyXG5cclxuICAgIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5tb2RhbEJhY2tncm91bmQuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuZWxlbS5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgdGhpcy5jYW52YXMuZm9jdXMoKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBoaWRkZW4oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZWxlbS5oaWRkZW5cclxuICAgIH1cclxuXHJcbiAgICB0b2dnbGUoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZWxlbS5oaWRkZW4pIHtcclxuICAgICAgICAgICAgdGhpcy5zaG93KClcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU3RhdHNEaWFsb2cgZXh0ZW5kcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBvcGVuQnV0dG9uID0gZG9tLmJ5SWQoXCJzdGF0c0J1dHRvblwiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwic3RhdHNDbG9zZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXIsIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICBzdXBlcihkb20uYnlJZChcInN0YXRzRGlhbG9nXCIpLCBjYW52YXMpXHJcblxyXG4gICAgICAgIHRoaXMub3BlbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy50b2dnbGUoKSlcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgZXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkVTQ0FQRVwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgY29uc3QgaGVhbHRoU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNIZWFsdGhcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3Qgc3RyZW5ndGhTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c1N0cmVuZ3RoXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGFnaWxpdHlTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0FnaWxpdHlcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgaW50ZWxsaWdlbmNlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNJbnRlbGxpZ2VuY2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgYXR0YWNrU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNBdHRhY2tcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZGFtYWdlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNEYW1hZ2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZGVmZW5zZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRGVmZW5zZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBsZXZlbFNwYW4gPSBkb20uYnlJZChcInN0YXRzTGV2ZWxcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZXhwZXJpZW5jZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRXhwZXJpZW5jZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBnb2xkU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNHb2xkXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGV4cGVyaWVuY2VSZXF1aXJlbWVudCA9IHJsLmdldEV4cGVyaWVuY2VSZXF1aXJlbWVudChwbGF5ZXIubGV2ZWwgKyAxKVxyXG5cclxuICAgICAgICBoZWFsdGhTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmhlYWx0aH0gLyAke3BsYXllci5tYXhIZWFsdGh9YFxyXG4gICAgICAgIHN0cmVuZ3RoU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5zdHJlbmd0aH1gXHJcbiAgICAgICAgYWdpbGl0eVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuYWdpbGl0eX1gXHJcbiAgICAgICAgaW50ZWxsaWdlbmNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5pbnRlbGxpZ2VuY2V9YFxyXG4gICAgICAgIGF0dGFja1NwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIubWVsZWVBdHRhY2t9IC8gJHtwbGF5ZXIucmFuZ2VkV2VhcG9uID8gcGxheWVyLnJhbmdlZEF0dGFjayA6IFwiTkFcIn1gXHJcbiAgICAgICAgZGFtYWdlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5tZWxlZURhbWFnZX0gLyAke3BsYXllci5yYW5nZWREYW1hZ2UgPyBwbGF5ZXIucmFuZ2VkRGFtYWdlIDogXCJOQVwifWBcclxuICAgICAgICBkZWZlbnNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5kZWZlbnNlfWBcclxuICAgICAgICBhZ2lsaXR5U3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5hZ2lsaXR5fWBcclxuICAgICAgICBsZXZlbFNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIubGV2ZWx9YFxyXG4gICAgICAgIGV4cGVyaWVuY2VTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmV4cGVyaWVuY2V9IC8gJHtleHBlcmllbmNlUmVxdWlyZW1lbnR9YFxyXG4gICAgICAgIGdvbGRTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmdvbGR9YFxyXG5cclxuICAgICAgICBzdXBlci5zaG93KClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgSW52ZW50b3J5RGlhbG9nIGV4dGVuZHMgRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgb3BlbkJ1dHRvbiA9IGRvbS5ieUlkKFwiaW52ZW50b3J5QnV0dG9uXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGluZm9EaXYgPSBkb20uYnlJZChcImludmVudG9yeUluZm9cIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZW1wdHlEaXYgPSBkb20uYnlJZChcImludmVudG9yeUVtcHR5XCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRhYmxlID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlUYWJsZVwiKSBhcyBIVE1MVGFibGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwiaW52ZW50b3J5SXRlbVRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbmV4dFBhZ2VCdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeU5leHRQYWdlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHByZXZQYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlQcmV2UGFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwiaW52ZW50b3J5Q2xvc2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFnZVNpemU6IG51bWJlciA9IDlcclxuICAgIHByaXZhdGUgcGFnZUluZGV4OiBudW1iZXIgPSAwXHJcbiAgICBwcml2YXRlIHNlbGVjdGVkSW5kZXg6IG51bWJlciA9IC0xXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHN1cGVyKGRvbS5ieUlkKFwiaW52ZW50b3J5RGlhbG9nXCIpLCBjYW52YXMpXHJcbiAgICAgICAgdGhpcy5vcGVuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnRvZ2dsZSgpKVxyXG4gICAgICAgIHRoaXMuY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuaGlkZSgpKVxyXG5cclxuICAgICAgICB0aGlzLm5leHRQYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucGFnZUluZGV4KytcclxuICAgICAgICAgICAgdGhpcy5wYWdlSW5kZXggPSBNYXRoLm1pbih0aGlzLnBhZ2VJbmRleCwgTWF0aC5jZWlsKHRoaXMucGxheWVyLmludmVudG9yeS5sZW5ndGggLyB0aGlzLnBhZ2VTaXplKSlcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLnByZXZQYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucGFnZUluZGV4LS1cclxuICAgICAgICAgICAgdGhpcy5wYWdlSW5kZXggPSBNYXRoLm1heCh0aGlzLnBhZ2VJbmRleCwgMClcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgZXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHBhcnNlSW50KGV2LmtleSlcclxuXHJcbiAgICAgICAgICAgIGlmIChpbmRleCAmJiBpbmRleCA+IDAgJiYgaW5kZXggPD0gOSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gaW5kZXggLSAxXHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlVcIiAmJiB0aGlzLnNlbGVjdGVkSW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy51c2UodGhpcy5zZWxlY3RlZEluZGV4KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkVcIiAmJiB0aGlzLnNlbGVjdGVkSW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5lcXVpcCh0aGlzLnNlbGVjdGVkSW5kZXgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiUlwiICYmIHRoaXMuc2VsZWN0ZWRJbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZSh0aGlzLnNlbGVjdGVkSW5kZXgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiRFwiICYmIHRoaXMuc2VsZWN0ZWRJbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRyb3AodGhpcy5zZWxlY3RlZEluZGV4KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkFSUk9XRE9XTlwiIHx8IGtleSA9PT0gXCJTXCIpIHtcclxuICAgICAgICAgICAgICAgICsrdGhpcy5zZWxlY3RlZEluZGV4XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSBNYXRoLm1pbih0aGlzLnNlbGVjdGVkSW5kZXgsIDgpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkFSUk9XVVBcIiB8fCBrZXkgPT09IFwiV1wiKSB7XHJcbiAgICAgICAgICAgICAgICAtLXRoaXMuc2VsZWN0ZWRJbmRleFxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5tYXgodGhpcy5zZWxlY3RlZEluZGV4LCAtMSlcclxuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiRVNDQVBFXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5lbGVtLCBcImNsaWNrXCIsIFwiLmludmVudG9yeS11c2UtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZ2V0Um93SW5kZXgoZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50KVxyXG4gICAgICAgICAgICB0aGlzLnVzZShpbmRleClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5lbGVtLCBcImNsaWNrXCIsIFwiLmludmVudG9yeS1kcm9wLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgZXYuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmdldFJvd0luZGV4KGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudClcclxuICAgICAgICAgICAgdGhpcy5kcm9wKGluZGV4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LWVxdWlwLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgZXYuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmdldFJvd0luZGV4KGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudClcclxuICAgICAgICAgICAgdGhpcy5lcXVpcChpbmRleClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5lbGVtLCBcImNsaWNrXCIsIFwiLmludmVudG9yeS1yZW1vdmUtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZ2V0Um93SW5kZXgoZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50KVxyXG4gICAgICAgICAgICB0aGlzLnJlbW92ZShpbmRleClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5lbGVtLCBcImNsaWNrXCIsIFwiLml0ZW0tcm93XCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCByb3cgPSAoZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KFwiLml0ZW0tcm93XCIpXHJcbiAgICAgICAgICAgIGlmIChyb3cpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0KHJvdyBhcyBIVE1MVGFibGVSb3dFbGVtZW50KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgc3VwZXIuc2hvdygpXHJcbiAgICB9XHJcblxyXG4gICAgcmVmcmVzaCgpIHtcclxuICAgICAgICBjb25zdCB0Ym9keSA9IHRoaXMudGFibGUudEJvZGllc1swXVxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0Ym9keSlcclxuXHJcbiAgICAgICAgaWYgKHRoaXMucGxheWVyLmludmVudG9yeS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lbXB0eURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgICAgICB0aGlzLmluZm9EaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW1wdHlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgICAgICB0aGlzLmluZm9EaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBhZ2VDb3VudCA9IE1hdGguY2VpbCh0aGlzLnBsYXllci5pbnZlbnRvcnkubGVuZ3RoIC8gdGhpcy5wYWdlU2l6ZSlcclxuICAgICAgICB0aGlzLnBhZ2VJbmRleCA9IE1hdGgubWluKE1hdGgubWF4KDAsIHRoaXMucGFnZUluZGV4KSwgcGFnZUNvdW50IC0gMSlcclxuICAgICAgICB0aGlzLnByZXZQYWdlQnV0dG9uLmRpc2FibGVkID0gdGhpcy5wYWdlSW5kZXggPD0gMFxyXG4gICAgICAgIHRoaXMubmV4dFBhZ2VCdXR0b24uZGlzYWJsZWQgPSB0aGlzLnBhZ2VJbmRleCA+PSBwYWdlQ291bnQgLSAxXHJcblxyXG4gICAgICAgIHRoaXMuaW5mb0Rpdi50ZXh0Q29udGVudCA9IGBQYWdlICR7dGhpcy5wYWdlSW5kZXggKyAxfSBvZiAke3BhZ2VDb3VudH1gXHJcblxyXG4gICAgICAgIGNvbnN0IGl0ZW1zID0gZ2V0U29ydGVkSXRlbXNQYWdlKHRoaXMucGxheWVyLmludmVudG9yeSwgdGhpcy5wYWdlSW5kZXgsIHRoaXMucGFnZVNpemUpXHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5taW4odGhpcy5zZWxlY3RlZEluZGV4LCBpdGVtcy5sZW5ndGggLSAxKVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBpdGVtc1tpXVxyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMuaXRlbVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgdHIgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbUluZGV4VGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1pbmRleFwiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtTmFtZVRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0tbmFtZVwiKVxyXG4gICAgICAgICAgICBjb25zdCBlcXVpcEJ1dHRvbiA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pbnZlbnRvcnktZXF1aXAtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHJlbW92ZUJ1dHRvbiA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pbnZlbnRvcnktcmVtb3ZlLWJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCB1c2VCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LXVzZS1idXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGl0ZW0gaW5zdGFuY2VvZiBybC5MaWdodFNvdXJjZSA/IGAke2l0ZW0ubmFtZX0gKCR7aXRlbS5kdXJhdGlvbn0pYCA6IGl0ZW0ubmFtZVxyXG5cclxuICAgICAgICAgICAgaXRlbUluZGV4VGQudGV4dENvbnRlbnQgPSAoaSArIDEpLnRvU3RyaW5nKClcclxuICAgICAgICAgICAgaXRlbU5hbWVUZC50ZXh0Q29udGVudCA9IG5hbWVcclxuXHJcbiAgICAgICAgICAgIGlmICghKGl0ZW0gaW5zdGFuY2VvZiBybC5Vc2FibGUpKSB7XHJcbiAgICAgICAgICAgICAgICB1c2VCdXR0b24ucmVtb3ZlKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXJsLmlzRXF1aXBwYWJsZShpdGVtKSB8fCB0aGlzLnBsYXllci5pc0VxdWlwcGVkKGl0ZW0pKSB7XHJcbiAgICAgICAgICAgICAgICBlcXVpcEJ1dHRvbi5yZW1vdmUoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMucGxheWVyLmlzRXF1aXBwZWQoaXRlbSkpIHtcclxuICAgICAgICAgICAgICAgIHJlbW92ZUJ1dHRvbi5yZW1vdmUoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoaSA9PT0gdGhpcy5zZWxlY3RlZEluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICB0ci5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIilcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGJvZHkuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2VsZWN0KHNlbGVjdGVkUm93OiBIVE1MVGFibGVSb3dFbGVtZW50KSB7XHJcbiAgICAgICAgY29uc3Qgcm93cyA9IEFycmF5LmZyb20odGhpcy5lbGVtLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuaXRlbS1yb3dcIikpXHJcbiAgICAgICAgZm9yIChjb25zdCByb3cgb2Ygcm93cykge1xyXG4gICAgICAgICAgICByb3cuY2xhc3NMaXN0LnJlbW92ZShcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZWxlY3RlZFJvdy5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIilcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFJvd0luZGV4KGVsZW06IEhUTUxCdXR0b25FbGVtZW50KSB7XHJcbiAgICAgICAgY29uc3QgaW5kZXggPSBkb20uZ2V0RWxlbWVudEluZGV4KGVsZW0uY2xvc2VzdChcIi5pdGVtLXJvd1wiKSBhcyBIVE1MVGFibGVSb3dFbGVtZW50KVxyXG4gICAgICAgIHJldHVybiBpbmRleFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXNlKGluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBpID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplICsgaW5kZXhcclxuICAgICAgICBjb25zdCBpdGVtID0gZ2V0U29ydGVkSXRlbXModGhpcy5wbGF5ZXIuaW52ZW50b3J5KVtpXVxyXG4gICAgICAgIGlmICghKGl0ZW0gaW5zdGFuY2VvZiBybC5Vc2FibGUpKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXNlSXRlbSh0aGlzLnBsYXllciwgaXRlbSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJvcChpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaSA9IHRoaXMucGFnZUluZGV4ICogdGhpcy5wYWdlU2l6ZSArIGluZGV4XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEl0ZW1zKHRoaXMucGxheWVyLmludmVudG9yeSlbaV1cclxuICAgICAgICBkcm9wSXRlbSh0aGlzLnBsYXllciwgaXRlbSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZXF1aXAoaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGkgPSB0aGlzLnBhZ2VJbmRleCAqIHRoaXMucGFnZVNpemUgKyBpbmRleFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLnBsYXllci5pbnZlbnRvcnkpW2ldXHJcbiAgICAgICAgaWYgKCFybC5pc0VxdWlwcGFibGUoaXRlbSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBlcXVpcEl0ZW0odGhpcy5wbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlbW92ZShpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaSA9IHRoaXMucGFnZUluZGV4ICogdGhpcy5wYWdlU2l6ZSArIGluZGV4XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEl0ZW1zKHRoaXMucGxheWVyLmludmVudG9yeSlbaV1cclxuICAgICAgICBpZiAoIXJsLmlzRXF1aXBwYWJsZShpdGVtKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlbW92ZUl0ZW0odGhpcy5wbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQ29udGFpbmVyRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGlhbG9nOiBEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbmFtZVNwYW4gPSBkb20uYnlJZChcImNvbnRhaW5lck5hbWVcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNsb3NlQnV0dG9uID0gZG9tLmJ5SWQoXCJjb250YWluZXJDbG9zZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0YWtlQWxsQnV0dG9uID0gZG9tLmJ5SWQoXCJjb250YWluZXJUYWtlQWxsQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lclRhYmxlID0gZG9tLmJ5SWQoXCJjb250YWluZXJUYWJsZVwiKSBhcyBIVE1MVGFibGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lckl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwiY29udGFpbmVySXRlbVRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHByaXZhdGUgbWFwOiBtYXBzLk1hcCB8IG51bGwgPSBudWxsXHJcbiAgICBwcml2YXRlIGNvbnRhaW5lcjogcmwuQ29udGFpbmVyIHwgbnVsbCA9IG51bGxcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyLCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cgPSBuZXcgRGlhbG9nKGRvbS5ieUlkKFwiY29udGFpbmVyRGlhbG9nXCIpLCBjYW52YXMpXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIgPSBwbGF5ZXJcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuICAgICAgICB0aGlzLnRha2VBbGxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMudGFrZUFsbCgpKVxyXG4gICAgICAgIGNvbnN0IGVsZW0gPSB0aGlzLmRpYWxvZy5lbGVtXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZShlbGVtLCBcImNsaWNrXCIsIFwiLmNvbnRhaW5lci10YWtlLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGJ0biA9IGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCByb3cgPSBidG4uY2xvc2VzdChcIi5pdGVtLXJvd1wiKSBhcyBIVE1MVGFibGVSb3dFbGVtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgocm93KVxyXG4gICAgICAgICAgICB0aGlzLnRha2UoaWR4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkNcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJBXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFrZUFsbCgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoZXYua2V5KVxyXG4gICAgICAgICAgICBpZiAoaW5kZXggJiYgaW5kZXggPiAwICYmIGluZGV4IDw9IDkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFrZShpbmRleCAtIDEpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHNob3cobWFwOiBtYXBzLk1hcCwgY29udGFpbmVyOiBybC5Db250YWluZXIpIHtcclxuICAgICAgICB0aGlzLm1hcCA9IG1hcFxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyXHJcbiAgICAgICAgdGhpcy5uYW1lU3Bhbi50ZXh0Q29udGVudCA9IHRoaXMuY29udGFpbmVyLm5hbWVcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIHRoaXMuZGlhbG9nLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIGhpZGUoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMubWFwICYmIHRoaXMuY29udGFpbmVyICYmIHRoaXMuY29udGFpbmVyLml0ZW1zLnNpemUgPT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5jb250YWluZXJzLmRlbGV0ZSh0aGlzLmNvbnRhaW5lcilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gbnVsbFxyXG4gICAgICAgIHRoaXMuZGlhbG9nLmhpZGUoKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBoaWRkZW4oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZGlhbG9nLmhpZGRlblxyXG4gICAgfVxyXG5cclxuICAgIHJlZnJlc2goKSB7XHJcbiAgICAgICAgY29uc3QgdGJvZHkgPSB0aGlzLmNvbnRhaW5lclRhYmxlLnRCb2RpZXNbMF1cclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGJvZHkpXHJcblxyXG4gICAgICAgIGlmICghdGhpcy5jb250YWluZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBpdGVtcyA9IGdldFNvcnRlZEl0ZW1zKHRoaXMuY29udGFpbmVyLml0ZW1zKVxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IGl0ZW1zW2ldXHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy5jb250YWluZXJJdGVtVGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCB0ciA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5pdGVtLXJvd1wiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtSW5kZXhUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLWluZGV4XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1OYW1lVGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1uYW1lXCIpXHJcbiAgICAgICAgICAgIGl0ZW1JbmRleFRkLnRleHRDb250ZW50ID0gYCR7aSArIDF9YFxyXG4gICAgICAgICAgICBpdGVtTmFtZVRkLnRleHRDb250ZW50ID0gaXRlbS5uYW1lXHJcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0YWtlKGluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEl0ZW1zKHRoaXMuY29udGFpbmVyLml0ZW1zKVtpbmRleF1cclxuICAgICAgICBpZiAoIWl0ZW0pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5pdGVtcy5kZWxldGUoaXRlbSlcclxuICAgICAgICB0aGlzLnBsYXllci5pbnZlbnRvcnkucHVzaChpdGVtKVxyXG5cclxuICAgICAgICAvLyBoaWRlIGlmIHRoaXMgd2FzIHRoZSBsYXN0IGl0ZW1cclxuICAgICAgICBpZiAodGhpcy5jb250YWluZXIuaXRlbXMuc2l6ZSA9PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGFrZUFsbCgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuY29udGFpbmVyLml0ZW1zKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLml0ZW1zLmRlbGV0ZShpdGVtKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXllci5pbnZlbnRvcnkucHVzaChpdGVtKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5oaWRlKClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgRGVmZWF0RGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdHJ5QWdhaW5CdXR0b24gPSBkb20uYnlJZChcInRyeUFnYWluQnV0dG9uXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpYWxvZzogRGlhbG9nXHJcblxyXG4gICAgY29uc3RydWN0b3IoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IERpYWxvZyhkb20uYnlJZChcImRlZmVhdERpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgICAgIHRoaXMudHJ5QWdhaW5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMudHJ5QWdhaW4oKSlcclxuICAgICAgICB0aGlzLmRpYWxvZy5lbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qga2V5ID0gZXYua2V5LnRvVXBwZXJDYXNlKClcclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJUXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudHJ5QWdhaW4oKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkVOVEVSXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudHJ5QWdhaW4oKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdHJ5QWdhaW4oKSB7XHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIExldmVsRGlhbG9nIGV4dGVuZHMgRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWxTdHJlbmd0aFJvdyA9IGRvbS5ieUlkKFwibGV2ZWxTdHJlbmd0aFJvd1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsZXZlbEludGVsbGlnZW5jZVJvdyA9IGRvbS5ieUlkKFwibGV2ZWxJbnRlbGxpZ2VuY2VSb3dcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWxBZ2lsaXR5Um93ID0gZG9tLmJ5SWQoXCJsZXZlbEFnaWxpdHlSb3dcIilcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyLCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgc3VwZXIoZG9tLmJ5SWQoXCJsZXZlbERpYWxvZ1wiKSwgY2FudmFzKVxyXG5cclxuICAgICAgICB0aGlzLmxldmVsU3RyZW5ndGhSb3cuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMubGV2ZWxTdHJlbnRoKCkpXHJcbiAgICAgICAgdGhpcy5sZXZlbEludGVsbGlnZW5jZVJvdy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5sZXZlbEludGVsbGlnZW5jZSgpKVxyXG4gICAgICAgIHRoaXMubGV2ZWxBZ2lsaXR5Um93LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmxldmVsQWdpbGl0eSgpKVxyXG5cclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGV2LmtleS50b1VwcGVyQ2FzZSgpXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoZXYua2V5KVxyXG5cclxuICAgICAgICAgICAgaWYgKGluZGV4ID09IDEgfHwga2V5ID09IFwiU1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxldmVsU3RyZW50aCgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChpbmRleCA9PSAyIHx8IGtleSA9PSBcIklcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sZXZlbEludGVsbGlnZW5jZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChpbmRleCA9PSAzIHx8IGtleSA9PSBcIkFcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sZXZlbEFnaWxpdHkoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGxldmVsU3RyZW50aCgpIHtcclxuICAgICAgICB0aGlzLnBsYXllci5iYXNlU3RyZW5ndGgrK1xyXG4gICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBsZXZlbEludGVsbGlnZW5jZSgpIHtcclxuICAgICAgICB0aGlzLnBsYXllci5iYXNlSW50ZWxsaWdlbmNlKytcclxuICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbGV2ZWxBZ2lsaXR5KCkge1xyXG4gICAgICAgIHRoaXMucGxheWVyLmJhc2VBZ2lsaXR5KytcclxuICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgfVxyXG59XHJcblxyXG5lbnVtIFNob3BEaWFsb2dNb2RlIHtcclxuICAgIEJ1eSxcclxuICAgIFNlbGxcclxufVxyXG5cclxuY2xhc3MgU2hvcERpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpYWxvZzogRGlhbG9nXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGdvbGRTcGFuID0gZG9tLmJ5SWQoXCJzaG9wR29sZFNwYW5cIikgYXMgSFRNTFNwYW5FbGVtZW50O1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwic2hvcEV4aXRCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYnV5QnV0dG9uID0gZG9tLmJ5SWQoXCJzaG9wQnV5QnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNlbGxCdXR0b24gPSBkb20uYnlJZChcInNob3BTZWxsQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG5leHRQYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJzaG9wTmV4dFBhZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcHJldlBhZ2VCdXR0b24gPSBkb20uYnlJZChcInNob3BQcmV2UGFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzaG9wVGFibGUgPSBkb20uYnlJZChcInNob3BUYWJsZVwiKSBhcyBIVE1MVGFibGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNob3BCdXlJdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcInNob3BCdXlJdGVtVGVtcGxhdGVcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzaG9wU2VsbEl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwic2hvcFNlbGxJdGVtVGVtcGxhdGVcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSBtb2RlOiBTaG9wRGlhbG9nTW9kZSA9IFNob3BEaWFsb2dNb2RlLkJ1eVxyXG4gICAgcHJpdmF0ZSBpdGVtczogcmwuSXRlbVtdID0gW11cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFnZVNpemU6IG51bWJlciA9IDlcclxuICAgIHByaXZhdGUgcGFnZUluZGV4OiBudW1iZXIgPSAwXHJcbiAgICBwcml2YXRlIHNlbGVjdGVkSW5kZXg6IG51bWJlciA9IC0xXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IERpYWxvZyhkb20uYnlJZChcInNob3BEaWFsb2dcIiksIGNhbnZhcylcclxuICAgICAgICB0aGlzLnBsYXllciA9IHBsYXllclxyXG4gICAgICAgIHRoaXMuYnV5QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnNldE1vZGUoU2hvcERpYWxvZ01vZGUuQnV5KSlcclxuICAgICAgICB0aGlzLnNlbGxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuc2V0TW9kZShTaG9wRGlhbG9nTW9kZS5TZWxsKSlcclxuICAgICAgICB0aGlzLm5leHRQYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm5leHRQYWdlKCkpXHJcbiAgICAgICAgdGhpcy5wcmV2UGFnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5wcmV2UGFnZSgpKVxyXG4gICAgICAgIHRoaXMuY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuaGlkZSgpKVxyXG5cclxuICAgICAgICBjb25zdCBlbGVtID0gdGhpcy5kaWFsb2cuZWxlbVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUoZWxlbSwgXCJjbGlja1wiLCBcIi5zaG9wLWl0ZW0tcm93XCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBidG4gPSBldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KHJvdylcclxuICAgICAgICAgICAgdGhpcy5jaG9vc2UoaWR4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGV2LmtleS50b1VwcGVyQ2FzZSgpXHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlhcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJCXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0TW9kZShTaG9wRGlhbG9nTW9kZS5CdXkpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiU1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldE1vZGUoU2hvcERpYWxvZ01vZGUuU2VsbClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJBUlJPV0RPV05cIiB8fCBrZXkgPT09IFwiU1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRJdGVtKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJBUlJPV1VQXCIgfHwga2V5ID09PSBcIldcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2SXRlbSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiUEFHRURPV05cIiB8fCBrZXkgPT09IFwiTlwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRQYWdlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJQQUdFVVBcIiB8fCBrZXkgPT09IFwiUFwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByZXZQYWdlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFU0NBUEVcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFTlRFUlwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNob29zZSh0aGlzLnNlbGVjdGVkSW5kZXgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoZXYua2V5KVxyXG4gICAgICAgICAgICBpZiAoaW5kZXggJiYgaW5kZXggPiAwICYmIGluZGV4IDw9IDkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hvb3NlKGluZGV4IC0gMSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIHRoaXMuZGlhbG9nLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cuaGlkZSgpXHJcbiAgICB9XHJcblxyXG4gICAgY2hvb3NlKGlkeDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWR4ID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplICsgaWR4XHJcbiAgICAgICAgc3dpdGNoICh0aGlzLm1vZGUpIHtcclxuICAgICAgICAgICAgY2FzZSBTaG9wRGlhbG9nTW9kZS5CdXk6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1eShpZHgpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICBjYXNlIFNob3BEaWFsb2dNb2RlLlNlbGw6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGwoaWR4KVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2V0TW9kZShtb2RlOiBTaG9wRGlhbG9nTW9kZSkge1xyXG4gICAgICAgIHRoaXMubW9kZSA9IG1vZGVcclxuICAgICAgICB0aGlzLnBhZ2VJbmRleCA9IDBcclxuICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSAtMVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgYnV5KGlkeDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbaWR4XVxyXG5cclxuICAgICAgICBpZiAoaXRlbS52YWx1ZSA+IHRoaXMucGxheWVyLmdvbGQpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKGBZb3UgZG8gbm90IGhhdmUgZW5vdWdoIGdvbGQgZm9yICR7aXRlbS5uYW1lfSFgKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG91dHB1dC5pbmZvKGBZb3UgYm91Z2h0ICR7aXRlbS5uYW1lfS5gKVxyXG4gICAgICAgIHRoaXMucGxheWVyLmdvbGQgLT0gaXRlbS52YWx1ZVxyXG4gICAgICAgIHRoaXMucGxheWVyLmludmVudG9yeS5wdXNoKGl0ZW0uY2xvbmUoKSlcclxuICAgIH1cclxuXHJcbiAgICBzZWxsKGlkeDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbaWR4XVxyXG4gICAgICAgIGNvbnN0IGludklkeCA9IHRoaXMucGxheWVyLmludmVudG9yeS5pbmRleE9mKGl0ZW0pXHJcbiAgICAgICAgaWYgKGludklkeCA9PSAtMSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucGxheWVyLnJlbW92ZShpdGVtKVxyXG4gICAgICAgIHRoaXMucGxheWVyLmludmVudG9yeS5zcGxpY2UoaW52SWR4LCAxKVxyXG4gICAgICAgIHRoaXMucGxheWVyLmdvbGQgKz0gTWF0aC5mbG9vcihpdGVtLnZhbHVlIC8gMilcclxuICAgICAgICBjb25zb2xlLmxvZyhgWW91IHNvbGQgJHtpdGVtLm5hbWV9LmApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGhpZGRlbigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kaWFsb2cuaGlkZGVuXHJcbiAgICB9XHJcblxyXG4gICAgbmV4dFBhZ2UoKSB7XHJcbiAgICAgICAgdGhpcy5wYWdlSW5kZXgrK1xyXG4gICAgICAgIHRoaXMucGFnZUluZGV4ID0gTWF0aC5taW4odGhpcy5wYWdlSW5kZXgsIE1hdGguY2VpbCh0aGlzLml0ZW1zLmxlbmd0aCAvIHRoaXMucGFnZVNpemUpIC0gMSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByZXZQYWdlKCkge1xyXG4gICAgICAgIHRoaXMucGFnZUluZGV4LS1cclxuICAgICAgICB0aGlzLnBhZ2VJbmRleCA9IE1hdGgubWF4KHRoaXMucGFnZUluZGV4LCAwKVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgbmV4dEl0ZW0oKSB7XHJcbiAgICAgICAgKyt0aGlzLnNlbGVjdGVkSW5kZXhcclxuICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSBNYXRoLm1pbih0aGlzLnNlbGVjdGVkSW5kZXgsIDgpXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcmV2SXRlbSgpIHtcclxuICAgICAgICAtLXRoaXMuc2VsZWN0ZWRJbmRleFxyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWF4KHRoaXMuc2VsZWN0ZWRJbmRleCwgLTEpXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICByZWZyZXNoKCkge1xyXG4gICAgICAgIHN3aXRjaCAodGhpcy5tb2RlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgU2hvcERpYWxvZ01vZGUuQnV5OlxyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoQnV5KClcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIFNob3BEaWFsb2dNb2RlLlNlbGw6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2hTZWxsKClcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmdvbGRTcGFuLnRleHRDb250ZW50ID0gYEdvbGQ6ICR7dGhpcy5wbGF5ZXIuZ29sZH1gXHJcbiAgICB9XHJcblxyXG4gICAgcmVmcmVzaEJ1eSgpIHtcclxuICAgICAgICBjb25zdCB0Ym9keSA9IHRoaXMuc2hvcFRhYmxlLnRCb2RpZXNbMF1cclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGJvZHkpXHJcblxyXG4gICAgICAgIC8vIGFzc2VtYmxlIGl0ZW0gbGlzdFxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgdGhpcy5pdGVtcyA9IFsuLi50aGluZ3MuZGJdLmZpbHRlcih0ID0+IHQgaW5zdGFuY2VvZiBybC5JdGVtICYmIHQudmFsdWUgPiAwICYmIHQubGV2ZWwgPD0gcGxheWVyLmxldmVsKSBhcyBybC5JdGVtW11cclxuXHJcbiAgICAgICAgY29uc3QgcGFnZU9mZnNldCA9IHRoaXMucGFnZUluZGV4ICogdGhpcy5wYWdlU2l6ZVxyXG4gICAgICAgIGNvbnN0IHBhZ2VTaXplID0gTWF0aC5taW4odGhpcy5wYWdlU2l6ZSwgdGhpcy5pdGVtcy5sZW5ndGggLSBwYWdlT2Zmc2V0KVxyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWluKHRoaXMuc2VsZWN0ZWRJbmRleCwgcGFnZVNpemUgLSAxKVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhZ2VTaXplOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbcGFnZU9mZnNldCArIGldXHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy5zaG9wQnV5SXRlbVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgdHIgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbUluZGV4VGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1pbmRleFwiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtTmFtZVRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0tbmFtZVwiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtQ29zdFRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0tY29zdFwiKVxyXG4gICAgICAgICAgICBpdGVtSW5kZXhUZC50ZXh0Q29udGVudCA9IGAke2kgKyAxfWBcclxuICAgICAgICAgICAgaXRlbU5hbWVUZC50ZXh0Q29udGVudCA9IGl0ZW0ubmFtZVxyXG4gICAgICAgICAgICBpdGVtQ29zdFRkLnRleHRDb250ZW50ID0gYCR7aXRlbS52YWx1ZX1gXHJcblxyXG4gICAgICAgICAgICBpZiAoaSA9PT0gdGhpcy5zZWxlY3RlZEluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICB0ci5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIilcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGl0ZW0udmFsdWUgPiBwbGF5ZXIuZ29sZCkge1xyXG4gICAgICAgICAgICAgICAgdHIuY2xhc3NMaXN0LmFkZChcImRpc2FibGVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5idXlCdXR0b24uZGlzYWJsZWQgPSB0cnVlXHJcbiAgICAgICAgdGhpcy5zZWxsQnV0dG9uLmRpc2FibGVkID0gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICByZWZyZXNoU2VsbCgpIHtcclxuICAgICAgICBjb25zdCB0Ym9keSA9IHRoaXMuc2hvcFRhYmxlLnRCb2RpZXNbMF1cclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGJvZHkpXHJcblxyXG4gICAgICAgIC8vIGFzc2VtYmxlIGl0ZW0gbGlzdFxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgdGhpcy5pdGVtcyA9IFsuLi5wbGF5ZXIuaW52ZW50b3J5XS5maWx0ZXIodCA9PiB0LnZhbHVlID4gMCkgYXMgcmwuSXRlbVtdXHJcbiAgICAgICAgY29uc3QgcGFnZU9mZnNldCA9IHRoaXMucGFnZUluZGV4ICogdGhpcy5wYWdlU2l6ZVxyXG4gICAgICAgIGNvbnN0IHBhZ2VTaXplID0gTWF0aC5taW4odGhpcy5wYWdlU2l6ZSwgdGhpcy5pdGVtcy5sZW5ndGggLSBwYWdlT2Zmc2V0KVxyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWluKHRoaXMuc2VsZWN0ZWRJbmRleCwgcGFnZVNpemUgLSAxKVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhZ2VTaXplOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbcGFnZU9mZnNldCArIGldXHJcbiAgICAgICAgICAgIGNvbnN0IGVxdWlwcGVkID0gdGhpcy5wbGF5ZXIuaXNFcXVpcHBlZChpdGVtKVxyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMuc2hvcFNlbGxJdGVtVGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCB0ciA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5pdGVtLXJvd1wiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtSW5kZXhUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLWluZGV4XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1OYW1lVGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1uYW1lXCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1Db3N0VGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1jb3N0XCIpXHJcbiAgICAgICAgICAgIGl0ZW1JbmRleFRkLnRleHRDb250ZW50ID0gYCR7aSArIDF9YFxyXG4gICAgICAgICAgICBpdGVtTmFtZVRkLnRleHRDb250ZW50ID0gYCR7ZXF1aXBwZWQgPyBcIiogXCIgOiBcIlwifSR7aXRlbS5uYW1lfWBcclxuICAgICAgICAgICAgaXRlbUNvc3RUZC50ZXh0Q29udGVudCA9IGAke01hdGguZmxvb3IoaXRlbS52YWx1ZSAvIDIpfWBcclxuXHJcbiAgICAgICAgICAgIGlmIChpID09PSB0aGlzLnNlbGVjdGVkSW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIHRyLmNsYXNzTGlzdC5hZGQoXCJzZWxlY3RlZFwiKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0Ym9keS5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuYnV5QnV0dG9uLmRpc2FibGVkID0gZmFsc2VcclxuICAgICAgICB0aGlzLnNlbGxCdXR0b24uZGlzYWJsZWQgPSB0cnVlXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFNvcnRlZEl0ZW1zKGl0ZW1zOiBJdGVyYWJsZTxybC5JdGVtPik6IHJsLkl0ZW1bXSB7XHJcbiAgICBjb25zdCBzb3J0ZWRJdGVtcyA9IGl0ZXIub3JkZXJCeShpdGVtcywgaSA9PiBpLm5hbWUpXHJcbiAgICByZXR1cm4gc29ydGVkSXRlbXNcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U29ydGVkSXRlbXNQYWdlKGl0ZW1zOiBJdGVyYWJsZTxybC5JdGVtPiwgcGFnZUluZGV4OiBudW1iZXIsIHBhZ2VTaXplOiBudW1iZXIpOiBybC5JdGVtW10ge1xyXG4gICAgY29uc3Qgc3RhcnRJbmRleCA9IHBhZ2VJbmRleCAqIHBhZ2VTaXplXHJcbiAgICBjb25zdCBlbmRJbmRleCA9IHN0YXJ0SW5kZXggKyBwYWdlU2l6ZVxyXG4gICAgY29uc3Qgc29ydGVkSXRlbXMgPSBnZXRTb3J0ZWRJdGVtcyhpdGVtcylcclxuICAgIGNvbnN0IHBhZ2UgPSBzb3J0ZWRJdGVtcy5zbGljZShzdGFydEluZGV4LCBlbmRJbmRleClcclxuICAgIHJldHVybiBwYWdlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhblNlZShtYXA6IG1hcHMuTWFwLCBleWU6IGdlby5Qb2ludCwgdGFyZ2V0OiBnZW8uUG9pbnQsIGxpZ2h0UmFkaXVzOiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgIGlmIChnZW8uY2FsY01hbmhhdHRlbkRpc3QoZXllLCB0YXJnZXQpID4gbGlnaHRSYWRpdXMpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IHB0IG9mIG1hcmNoKGV5ZSwgdGFyZ2V0KSkge1xyXG4gICAgICAgIC8vIGlnbm9yZSBzdGFydCBwb2ludFxyXG4gICAgICAgIGlmIChwdC5lcXVhbChleWUpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHRoIG9mIG1hcC5hdChwdCkpIHtcclxuICAgICAgICAgICAgaWYgKCF0aC50cmFuc3BhcmVudCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHB0LmVxdWFsKHRhcmdldClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiogbWFyY2goc3RhcnQ6IGdlby5Qb2ludCwgZW5kOiBnZW8uUG9pbnQpOiBHZW5lcmF0b3I8Z2VvLlBvaW50PiB7XHJcbiAgICBjb25zdCBjdXIgPSBzdGFydC5jbG9uZSgpXHJcbiAgICBjb25zdCBkeSA9IE1hdGguYWJzKGVuZC55IC0gc3RhcnQueSlcclxuICAgIGNvbnN0IHN5ID0gc3RhcnQueSA8IGVuZC55ID8gMSA6IC0xXHJcbiAgICBjb25zdCBkeCA9IC1NYXRoLmFicyhlbmQueCAtIHN0YXJ0LngpXHJcbiAgICBjb25zdCBzeCA9IHN0YXJ0LnggPCBlbmQueCA/IDEgOiAtMVxyXG4gICAgbGV0IGVyciA9IGR5ICsgZHhcclxuXHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgIHlpZWxkIGN1clxyXG5cclxuICAgICAgICBpZiAoY3VyLmVxdWFsKGVuZCkpIHtcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGUyID0gMiAqIGVyclxyXG4gICAgICAgIGlmIChlMiA+PSBkeCkge1xyXG4gICAgICAgICAgICBlcnIgKz0gZHhcclxuICAgICAgICAgICAgY3VyLnkgKz0gc3lcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlMiA8PSBkeSkge1xyXG4gICAgICAgICAgICBlcnIgKz0gZHlcclxuICAgICAgICAgICAgY3VyLnggKz0gc3hcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyb3BJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5JdGVtKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIuZGVsZXRlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHdhcyBkcm9wcGVkYClcclxufVxyXG5cclxuZnVuY3Rpb24gdXNlSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuVXNhYmxlKTogdm9pZCB7XHJcbiAgICBjb25zdCBhbW91bnQgPSBNYXRoLm1pbihpdGVtLmhlYWx0aCwgcGxheWVyLm1heEhlYWx0aCAtIHBsYXllci5oZWFsdGgpXHJcbiAgICBwbGF5ZXIuaGVhbHRoICs9IGFtb3VudFxyXG4gICAgcGxheWVyLmRlbGV0ZShpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSByZXN0b3JlZCAke2Ftb3VudH0gaGVhbHRoYClcclxufVxyXG5cclxuZnVuY3Rpb24gZXF1aXBJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5FcXVpcHBhYmxlKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIuZXF1aXAoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gd2FzIGVxdWlwcGVkYClcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuRXF1aXBwYWJsZSk6IHZvaWQge1xyXG4gICAgcGxheWVyLnJlbW92ZShpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSB3YXMgcmVtb3ZlZGApXHJcbn1cclxuXHJcbmVudW0gVGFyZ2V0Q29tbWFuZCB7XHJcbiAgICBOb25lLFxyXG4gICAgQXR0YWNrLFxyXG4gICAgU2hvb3QsXHJcbiAgICBMb29rXHJcbn1cclxuXHJcbmNsYXNzIEFwcCB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGF0dGFja0J1dHRvbiA9IGRvbS5ieUlkKFwiYXR0YWNrQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNob290QnV0dG9uID0gZG9tLmJ5SWQoXCJzaG9vdEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsb29rQnV0dG9uID0gZG9tLmJ5SWQoXCJsb29rQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJlc2V0QnV0dG9uID0gZG9tLmJ5SWQoXCJyZXNldEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbnA6IGlucHV0LklucHV0ID0gbmV3IGlucHV0LklucHV0KHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdGF0c0RpYWxvZzogU3RhdHNEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW52ZW50b3J5RGlhbG9nOiBJbnZlbnRvcnlEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29udGFpbmVyRGlhbG9nOiBDb250YWluZXJEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGVmZWF0RGlhbG9nID0gbmV3IERlZmVhdERpYWxvZyh0aGlzLmNhbnZhcylcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWxEaWFsb2c6IExldmVsRGlhbG9nXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNob3BEaWFsb2c6IFNob3BEaWFsb2dcclxuICAgIHByaXZhdGUgem9vbSA9IDFcclxuICAgIHByaXZhdGUgdGFyZ2V0Q29tbWFuZDogVGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuTm9uZVxyXG4gICAgcHJpdmF0ZSBjdXJzb3JQb3NpdGlvbj86IGdlby5Qb2ludFxyXG5cclxuICAgIHByaXZhdGUgY29uc3RydWN0b3IoXHJcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBybmc6IHJhbmQuU0ZDMzJSTkcsXHJcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSByZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLFxyXG4gICAgICAgIHByaXZhdGUgZmxvb3I6IG51bWJlcixcclxuICAgICAgICBwcml2YXRlIG1hcDogbWFwcy5NYXAsXHJcbiAgICAgICAgcHJpdmF0ZSB0ZXh0dXJlOiBnZnguVGV4dHVyZSxcclxuICAgICAgICBwcml2YXRlIGltYWdlTWFwOiBNYXA8c3RyaW5nLCBudW1iZXI+KSB7XHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gbWFwLnBsYXllci50aGluZ1xyXG4gICAgICAgIHRoaXMuc3RhdHNEaWFsb2cgPSBuZXcgU3RhdHNEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgICAgICB0aGlzLmludmVudG9yeURpYWxvZyA9IG5ldyBJbnZlbnRvcnlEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgICAgICB0aGlzLmNvbnRhaW5lckRpYWxvZyA9IG5ldyBDb250YWluZXJEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgICAgICB0aGlzLmxldmVsRGlhbG9nID0gbmV3IExldmVsRGlhbG9nKHBsYXllciwgdGhpcy5jYW52YXMpXHJcbiAgICAgICAgdGhpcy5zaG9wRGlhbG9nID0gbmV3IFNob3BEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc3RhdGljIGFzeW5jIGNyZWF0ZSgpOiBQcm9taXNlPEFwcD4ge1xyXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICAgICAgY29uc3QgcmVuZGVyZXIgPSBuZXcgZ2Z4LlJlbmRlcmVyKGNhbnZhcylcclxuXHJcbiAgICAgICAgLy8gY2hlY2sgZm9yIGFueSBzYXZlZCBzdGF0ZVxyXG4gICAgICAgIGNvbnN0IHN0YXRlID0gbG9hZFN0YXRlKClcclxuICAgICAgICAvLyBjb25zdCBzdGF0ZSA9IG51bGwgYXMgQXBwU2F2ZVN0YXRlIHwgbnVsbFxyXG4gICAgICAgIGNvbnN0IHNlZWQgPSByYW5kLnhtdXIzKG5ldyBEYXRlKCkudG9TdHJpbmcoKSlcclxuICAgICAgICBjb25zdCBybmdTdGF0ZSA9IHN0YXRlID8gc3RhdGUucm5nIDogW3NlZWQoKSwgc2VlZCgpLCBzZWVkKCksIHNlZWQoKV0gYXMgW251bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl1cclxuICAgICAgICBjb25zdCBybmcgPSBuZXcgcmFuZC5TRkMzMlJORyguLi5ybmdTdGF0ZSlcclxuICAgICAgICBjb25zdCBmbG9vciA9IHN0YXRlPy5mbG9vciA/PyAxXHJcblxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaW5ncy5wbGF5ZXIuY2xvbmUoKVxyXG4gICAgICAgIGlmIChzdGF0ZSkge1xyXG4gICAgICAgICAgICBwbGF5ZXIubG9hZCh0aGluZ3MuZGIsIHN0YXRlLnBsYXllcilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG1hcCA9IGF3YWl0IGdlbi5nZW5lcmF0ZUR1bmdlb25MZXZlbChybmcsIHRoaW5ncy5kYiwgcGxheWVyLCBmbG9vciwgcmwuRXhpdERpcmVjdGlvbi5Eb3duKVxyXG4gICAgICAgIGNvbnN0IFt0ZXh0dXJlLCBpbWFnZU1hcF0gPSBhd2FpdCBsb2FkSW1hZ2VzKHJlbmRlcmVyLCBtYXApXHJcbiAgICAgICAgY29uc3QgYXBwID0gbmV3IEFwcChybmcsIHJlbmRlcmVyLCBmbG9vciwgbWFwLCB0ZXh0dXJlLCBpbWFnZU1hcClcclxuICAgICAgICByZXR1cm4gYXBwXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGV4ZWMoKSB7XHJcbiAgICAgICAgdGhpcy5jYW52YXMuZm9jdXMoKVxyXG5cclxuICAgICAgICBvdXRwdXQud3JpdGUoXCJZb3VyIGFkdmVudHVyZSBiZWdpbnNcIilcclxuICAgICAgICB0aGlzLmhhbmRsZVJlc2l6ZSgpXHJcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMudGljaygpKVxyXG5cclxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5cHJlc3NcIiwgKGV2KSA9PiB0aGlzLmhhbmRsZUtleVByZXNzKGV2KSlcclxuXHJcbiAgICAgICAgdGhpcy5hdHRhY2tCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5BdHRhY2tcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLnNob290QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuU2hvb3RcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmxvb2tCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5Mb29rXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5yZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmNsZWFyU3RhdGUoKVxyXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKClcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBwcml2YXRlIHRpY2soKSB7XHJcbiAgICAgICAgdGhpcy5oYW5kbGVSZXNpemUoKVxyXG5cclxuICAgICAgICBjb25zdCBuZXh0Q3JlYXR1cmUgPSB0aGlzLmdldE5leHRDcmVhdHVyZSgpXHJcbiAgICAgICAgaWYgKG5leHRDcmVhdHVyZT8udGhpbmcgaW5zdGFuY2VvZiBybC5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dCgpXHJcbiAgICAgICAgfSBlbHNlIGlmIChuZXh0Q3JlYXR1cmU/LnRoaW5nIGluc3RhbmNlb2YgcmwuTW9uc3Rlcikge1xyXG4gICAgICAgICAgICB0aGlzLnRpY2tNb25zdGVyKG5leHRDcmVhdHVyZS5wb3NpdGlvbiwgbmV4dENyZWF0dXJlLnRoaW5nKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMudGlja1JvdW5kKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZHJhd0ZyYW1lKClcclxuXHJcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMudGljaygpKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0TmV4dE1vbnN0ZXIoKTogbWFwcy5QbGFjZWQ8cmwuTW9uc3Rlcj4gfCBudWxsIHtcclxuICAgICAgICAvLyBkZXRlcm1pbmUgd2hvc2UgdHVybiBpdCBpc1xyXG4gICAgICAgIGxldCBuZXh0TW9uc3RlciA9IG51bGxcclxuICAgICAgICBmb3IgKGNvbnN0IG1vbnN0ZXIgb2YgdGhpcy5tYXAubW9uc3RlcnMpIHtcclxuICAgICAgICAgICAgaWYgKG1vbnN0ZXIudGhpbmcuc3RhdGUgIT09IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dybykge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG1vbnN0ZXIudGhpbmcuYWN0aW9uIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghbmV4dE1vbnN0ZXIgfHwgbW9uc3Rlci50aGluZy5hY3Rpb24gPiBuZXh0TW9uc3Rlci50aGluZy5hY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgIG5leHRNb25zdGVyID0gbW9uc3RlclxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmV4dE1vbnN0ZXJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldE5leHRDcmVhdHVyZSgpOiBtYXBzLlBsYWNlZDxybC5Nb25zdGVyPiB8IG1hcHMuUGxhY2VkPHJsLlBsYXllcj4gfCBudWxsIHtcclxuICAgICAgICBjb25zdCBtb25zdGVyID0gdGhpcy5nZXROZXh0TW9uc3RlcigpXHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5tYXAucGxheWVyLnRoaW5nXHJcblxyXG4gICAgICAgIGlmIChwbGF5ZXIuYWN0aW9uID4gMCAmJiBwbGF5ZXIuYWN0aW9uID4gKG1vbnN0ZXI/LnRoaW5nPy5hY3Rpb24gPz8gMCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubWFwLnBsYXllclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1vbnN0ZXJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHRpY2tSb3VuZCgpIHtcclxuICAgICAgICAvLyBhY2N1bXVsYXRlIGFjdGlvbiBwb2ludHNcclxuICAgICAgICBmb3IgKGNvbnN0IG1vbnN0ZXIgb2YgaXRlci5maWx0ZXIodGhpcy5tYXAubW9uc3RlcnMudGhpbmdzKCksIG0gPT4gbS5zdGF0ZSA9PT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvKSkge1xyXG4gICAgICAgICAgICBjb25zdCByZXNlcnZlID0gTWF0aC5taW4obW9uc3Rlci5hY3Rpb25SZXNlcnZlLCBtb25zdGVyLmFnaWxpdHkpXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMSArIG1vbnN0ZXIuYWdpbGl0eSArIHJlc2VydmVcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb25SZXNlcnZlID0gMFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY2FwIGFjdGlvbiByZXNlcnZlIFxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMubWFwLnBsYXllci50aGluZ1xyXG4gICAgICAgIGNvbnN0IHJlc2VydmUgPSBNYXRoLm1pbihwbGF5ZXIuYWN0aW9uUmVzZXJ2ZSwgcGxheWVyLmFnaWxpdHkpXHJcbiAgICAgICAgcGxheWVyLmFjdGlvbiA9IDEgKyBwbGF5ZXIuYWdpbGl0eSArIHJlc2VydmVcclxuICAgICAgICBwbGF5ZXIuYWN0aW9uUmVzZXJ2ZSA9IDBcclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGVNb25zdGVyU3RhdGVzKClcclxuXHJcbiAgICAgICAgLy8gYWR2YW5jZSBkdXJhdGlvbiBvZiBpdGVtc1xyXG4gICAgICAgIGlmIChwbGF5ZXIubGlnaHRTb3VyY2UgJiYgcGxheWVyLmxpZ2h0U291cmNlLmR1cmF0aW9uID4gMCkge1xyXG4gICAgICAgICAgICBwbGF5ZXIubGlnaHRTb3VyY2UuZHVyYXRpb24gLT0gMVxyXG4gICAgICAgICAgICBpZiAocGxheWVyLmxpZ2h0U291cmNlLmR1cmF0aW9uID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQud2FybmluZyhgWW91ciAke3BsYXllci5saWdodFNvdXJjZS5uYW1lfSBoYXMgYmVlbiBleHRpbmd1aXNoZWQhYClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZXhwZXJpZW5jZVJlcXVpcmVkID0gcmwuZ2V0RXhwZXJpZW5jZVJlcXVpcmVtZW50KHBsYXllci5sZXZlbCArIDEpXHJcbiAgICAgICAgaWYgKHBsYXllci5leHBlcmllbmNlID49IGV4cGVyaWVuY2VSZXF1aXJlZCkge1xyXG4gICAgICAgICAgICB0aGlzLmxldmVsRGlhbG9nLnNob3coKVxyXG4gICAgICAgICAgICArK3BsYXllci5sZXZlbFxyXG4gICAgICAgICAgICBwbGF5ZXIuZXhwZXJpZW5jZSAtPSBleHBlcmllbmNlUmVxdWlyZWRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHNhdmUgY3VycmVudCBzdGF0ZVxyXG4gICAgICAgIHRoaXMuc2F2ZVN0YXRlKClcclxuXHJcbiAgICAgICAgaWYgKHBsYXllci5oZWFsdGggPD0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmNsZWFyU3RhdGUoKVxyXG4gICAgICAgICAgICB0aGlzLmRlZmVhdERpYWxvZy5zaG93KClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRTY3JvbGxPZmZzZXQoKTogZ2VvLlBvaW50IHtcclxuICAgICAgICAvLyBjb252ZXJ0IG1hcCBwb2ludCB0byBjYW52YXMgcG9pbnQsIG5vdGluZyB0aGF0IGNhbnZhcyBpcyBjZW50ZXJlZCBvbiBwbGF5ZXJcclxuICAgICAgICBjb25zdCBwbGF5ZXJQb3NpdGlvbiA9IHRoaXMubWFwLnBsYXllci5wb3NpdGlvblxyXG4gICAgICAgIGNvbnN0IGNhbnZhc0NlbnRlciA9IG5ldyBnZW8uUG9pbnQodGhpcy5jYW52YXMud2lkdGggLyAyLCB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyKVxyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IGNhbnZhc0NlbnRlci5zdWJQb2ludChwbGF5ZXJQb3NpdGlvbi5hZGRTY2FsYXIoLjUpLm11bFNjYWxhcih0aGlzLnRpbGVTaXplKSlcclxuICAgICAgICByZXR1cm4gb2Zmc2V0LmZsb29yKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNhbnZhc1RvTWFwUG9pbnQoY3h5OiBnZW8uUG9pbnQpIHtcclxuICAgICAgICBjb25zdCBzY3JvbGxPZmZzZXQgPSB0aGlzLmdldFNjcm9sbE9mZnNldCgpXHJcbiAgICAgICAgY29uc3QgbXh5ID0gY3h5LnN1YlBvaW50KHNjcm9sbE9mZnNldCkuZGl2U2NhbGFyKHRoaXMudGlsZVNpemUpLmZsb29yKClcclxuICAgICAgICByZXR1cm4gbXh5XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBtYXBUb0NhbnZhc1BvaW50KG14eTogZ2VvLlBvaW50KSB7XHJcbiAgICAgICAgY29uc3Qgc2Nyb2xsT2Zmc2V0ID0gdGhpcy5nZXRTY3JvbGxPZmZzZXQoKVxyXG4gICAgICAgIGNvbnN0IGN4eSA9IG14eS5tdWxTY2FsYXIodGhpcy50aWxlU2l6ZSkuYWRkUG9pbnQoc2Nyb2xsT2Zmc2V0KVxyXG4gICAgICAgIHJldHVybiBjeHlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHByb2Nlc3NQbGF5ZXJNZWxlZUF0dGFjayhkZWZlbmRlcjogcmwuTW9uc3Rlcikge1xyXG4gICAgICAgIC8vIGJhc2UgNjAlIGNoYW5jZSB0byBoaXRcclxuICAgICAgICAvLyAxMCUgYm9udXMgLyBwZW5hbHR5IGZvciBldmVyeSBwb2ludCBkaWZmZXJlbmNlIGJldHdlZW4gYXR0YWNrIGFuZCBkZWZlbnNlXHJcbiAgICAgICAgLy8gYm90dG9tcyBvdXQgYXQgNSUgLSBhbHdheXMgU09NRSBjaGFuY2UgdG8gaGl0XHJcbiAgICAgICAgY29uc3QgYXR0YWNrZXIgPSB0aGlzLm1hcC5wbGF5ZXIudGhpbmdcclxuICAgICAgICBjb25zdCBib251cyA9IChhdHRhY2tlci5tZWxlZUF0dGFjayAtIGRlZmVuZGVyLmRlZmVuc2UpICogLjFcclxuICAgICAgICBjb25zdCBoaXRDaGFuY2UgPSBNYXRoLm1pbihNYXRoLm1heCguNiArIGJvbnVzLCAuMDUpLCAuOTUpXHJcbiAgICAgICAgY29uc3QgaGl0ID0gcmFuZC5jaGFuY2UodGhpcy5ybmcsIGhpdENoYW5jZSlcclxuICAgICAgICBjb25zdCB3ZWFwb24gPSBhdHRhY2tlci5tZWxlZVdlYXBvbiA/PyB0aGluZ3MuZmlzdHNcclxuICAgICAgICBjb25zdCBhdHRhY2tWZXJiID0gd2VhcG9uLnZlcmIgPyB3ZWFwb24udmVyYiA6IFwiYXR0YWNrc1wiXHJcbiAgICAgICAgYXR0YWNrZXIuYWN0aW9uIC09IHdlYXBvbi5hY3Rpb25cclxuXHJcbiAgICAgICAgaWYgKCFoaXQpIHtcclxuICAgICAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7YXR0YWNrZXIubmFtZX0gJHthdHRhY2tWZXJifSAke2RlZmVuZGVyLm5hbWV9IGJ1dCBtaXNzZXMhYClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoaXQgLSBjYWxjdWxhdGUgZGFtYWdlXHJcbiAgICAgICAgY29uc3QgZGFtYWdlID0gYXR0YWNrZXIubWVsZWVEYW1hZ2Uucm9sbCh0aGlzLnJuZylcclxuICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYW5kIGhpdHMgZm9yICR7ZGFtYWdlfSBkYW1hZ2UhYClcclxuICAgICAgICBkZWZlbmRlci5oZWFsdGggLT0gZGFtYWdlXHJcblxyXG4gICAgICAgIGlmIChkZWZlbmRlci5oZWFsdGggPCAwKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke2RlZmVuZGVyLm5hbWV9IGhhcyBiZWVuIGRlZmVhdGVkIGFuZCAke2F0dGFja2VyLm5hbWV9IHJlY2VpdmVzICR7ZGVmZW5kZXIuZXhwZXJpZW5jZX0gZXhwZXJpZW5jZWApXHJcbiAgICAgICAgICAgIGF0dGFja2VyLmV4cGVyaWVuY2UgKz0gZGVmZW5kZXIuZXhwZXJpZW5jZVxyXG4gICAgICAgICAgICB0aGlzLm1hcC5tb25zdGVycy5kZWxldGUoZGVmZW5kZXIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHJvY2Vzc1BsYXllclJhbmdlZEF0dGFjayhkZWZlbmRlcjogcmwuTW9uc3Rlcikge1xyXG4gICAgICAgIC8vIGJhc2UgNDAlIGNoYW5jZSB0byBoaXRcclxuICAgICAgICAvLyAxMCUgYm9udXMgLyBwZW5hbHR5IGZvciBldmVyeSBwb2ludCBkaWZmZXJlbmNlIGJldHdlZW4gYXR0YWNrIGFuZCBkZWZlbnNlXHJcbiAgICAgICAgLy8gYm90dG9tcyBvdXQgYXQgNSUgLSBhbHdheXMgU09NRSBjaGFuY2UgdG8gaGl0XHJcbiAgICAgICAgY29uc3QgYXR0YWNrZXIgPSB0aGlzLm1hcC5wbGF5ZXIudGhpbmdcclxuICAgICAgICBpZiAoIWF0dGFja2VyLnJhbmdlZFdlYXBvbikge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQbGF5ZXIgaGFzIG5vIHJhbmdlZCB3ZWFwb24gZXF1aXBwZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGJvbnVzID0gKGF0dGFja2VyLnJhbmdlZEF0dGFjayAtIGRlZmVuZGVyLmRlZmVuc2UpICogLjFcclxuICAgICAgICBjb25zdCBoaXRDaGFuY2UgPSBNYXRoLm1pbihNYXRoLm1heCguNiArIGJvbnVzLCAuMDUpLCAuOTUpXHJcbiAgICAgICAgY29uc3QgaGl0ID0gcmFuZC5jaGFuY2UodGhpcy5ybmcsIGhpdENoYW5jZSlcclxuICAgICAgICBjb25zdCB3ZWFwb24gPSBhdHRhY2tlci5yYW5nZWRXZWFwb25cclxuICAgICAgICBjb25zdCBhdHRhY2tWZXJiID0gd2VhcG9uLnZlcmIgPyB3ZWFwb24udmVyYiA6IFwiYXR0YWNrc1wiXHJcbiAgICAgICAgYXR0YWNrZXIuYWN0aW9uIC09IHdlYXBvbi5hY3Rpb25cclxuXHJcbiAgICAgICAgaWYgKCFoaXQpIHtcclxuICAgICAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7YXR0YWNrZXIubmFtZX0gJHthdHRhY2tWZXJifSAke2RlZmVuZGVyLm5hbWV9IGJ1dCBtaXNzZXMhYClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoaXQgLSBjYWxjdWxhdGUgZGFtYWdlXHJcbiAgICAgICAgY29uc3QgZGFtYWdlID0gYXR0YWNrZXIucmFuZ2VkRGFtYWdlPy5yb2xsKHRoaXMucm5nKSA/PyAwXHJcbiAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7YXR0YWNrZXIubmFtZX0gJHthdHRhY2tWZXJifSAke2RlZmVuZGVyLm5hbWV9IGFuZCBoaXRzIGZvciAke2RhbWFnZX0gZGFtYWdlIWApXHJcbiAgICAgICAgZGVmZW5kZXIuaGVhbHRoIC09IGRhbWFnZVxyXG5cclxuICAgICAgICBpZiAoZGVmZW5kZXIuaGVhbHRoIDwgMCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHtkZWZlbmRlci5uYW1lfSBoYXMgYmVlbiBkZWZlYXRlZCBhbmQgJHthdHRhY2tlci5uYW1lfSByZWNlaXZlcyAke2RlZmVuZGVyLmV4cGVyaWVuY2V9IGV4cGVyaWVuY2VgKVxyXG4gICAgICAgICAgICBhdHRhY2tlci5leHBlcmllbmNlICs9IGRlZmVuZGVyLmV4cGVyaWVuY2VcclxuICAgICAgICAgICAgdGhpcy5tYXAubW9uc3RlcnMuZGVsZXRlKGRlZmVuZGVyKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHByb2Nlc3NNb25zdGVyQXR0YWNrKGF0dGFja2VyOiBybC5Nb25zdGVyLCBhdHRhY2s6IHJsLkF0dGFjaykge1xyXG4gICAgICAgIC8vIGJhc2UgNjAlIGNoYW5jZSB0byBoaXRcclxuICAgICAgICAvLyAxMCUgYm9udXMgLyBwZW5hbHR5IGZvciBldmVyeSBwb2ludCBkaWZmZXJlbmNlIGJldHdlZW4gYXR0YWNrIGFuZCBkZWZlbnNlXHJcbiAgICAgICAgLy8gY2xhbXBzIHRvIG91dCBhdCBbNSwgOTVdIC0gYWx3YXlzIFNPTUUgY2hhbmNlIHRvIGhpdCBvciBtaXNzXHJcbiAgICAgICAgLy8gY2hvb3NlIGFuIGF0dGFjayBmcm9tIHJlcGVydG9pcmUgb2YgbW9uc3RlclxyXG4gICAgICAgIGNvbnN0IGRlZmVuZGVyID0gdGhpcy5tYXAucGxheWVyLnRoaW5nXHJcbiAgICAgICAgY29uc3QgYm9udXMgPSAoYXR0YWNrLmF0dGFjayAtIGRlZmVuZGVyLmRlZmVuc2UpICogLjFcclxuICAgICAgICBjb25zdCBoaXRDaGFuY2UgPSBNYXRoLm1heCguNiArIGJvbnVzLCAuMDUpXHJcbiAgICAgICAgY29uc3QgaGl0ID0gcmFuZC5jaGFuY2UodGhpcy5ybmcsIGhpdENoYW5jZSlcclxuICAgICAgICBjb25zdCBhdHRhY2tWZXJiID0gYXR0YWNrLnZlcmIgPyBhdHRhY2sudmVyYiA6IFwiYXR0YWNrc1wiXHJcbiAgICAgICAgYXR0YWNrZXIuYWN0aW9uIC09IGF0dGFjay5hY3Rpb25cclxuXHJcbiAgICAgICAgaWYgKCFoaXQpIHtcclxuICAgICAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7YXR0YWNrZXIubmFtZX0gJHthdHRhY2tWZXJifSAke2RlZmVuZGVyLm5hbWV9IGJ1dCBtaXNzZXMhYClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoaXQgLSBjYWxjdWxhdGUgZGFtYWdlXHJcbiAgICAgICAgY29uc3QgZGFtYWdlID0gYXR0YWNrLmRhbWFnZS5yb2xsKHRoaXMucm5nKVxyXG4gICAgICAgIG91dHB1dC53YXJuaW5nKGAke2F0dGFja2VyLm5hbWV9ICR7YXR0YWNrVmVyYn0gJHtkZWZlbmRlci5uYW1lfSBhbmQgaGl0cyBmb3IgJHtkYW1hZ2V9IGRhbWFnZSFgKVxyXG4gICAgICAgIGRlZmVuZGVyLmhlYWx0aCAtPSBkYW1hZ2VcclxuXHJcbiAgICAgICAgaWYgKGRlZmVuZGVyLmhlYWx0aCA8PSAwKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke2RlZmVuZGVyLm5hbWV9IGhhcyBiZWVuIGRlZmVhdGVkIWApXHJcbiAgICAgICAgICAgIHRoaXMuY2xlYXJTdGF0ZSgpXHJcbiAgICAgICAgICAgIHRoaXMuZGVmZWF0RGlhbG9nLnNob3coKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZU1vbnN0ZXJTdGF0ZXMoKSB7XHJcbiAgICAgICAgZm9yIChjb25zdCBtb25zdGVyIG9mIHRoaXMubWFwLm1vbnN0ZXJzKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlTW9uc3RlclN0YXRlKG1vbnN0ZXIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlTW9uc3RlclN0YXRlKHBsYWNlZE1vbnN0ZXI6IG1hcHMuUGxhY2VkPHJsLk1vbnN0ZXI+KSB7XHJcbiAgICAgICAgLy8gYWdncm8gc3RhdGVcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGxldCB7IHBvc2l0aW9uLCB0aGluZzogbW9uc3RlciB9ID0gcGxhY2VkTW9uc3RlclxyXG5cclxuICAgICAgICBjb25zdCBsaWdodFJhZGl1cyA9IHRoaXMuY2FsY0xpZ2h0UmFkaXVzKClcclxuICAgICAgICBpZiAobW9uc3Rlci5zdGF0ZSAhPT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvICYmIGNhblNlZShtYXAsIHBvc2l0aW9uLCBtYXAucGxheWVyLnBvc2l0aW9uLCBsaWdodFJhZGl1cykpIHtcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gPSAwXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuc3RhdGUgPSBybC5Nb25zdGVyU3RhdGUuYWdncm9cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChtb25zdGVyLnN0YXRlID09PSBybC5Nb25zdGVyU3RhdGUuYWdncm8gJiYgIWNhblNlZShtYXAsIHBvc2l0aW9uLCBtYXAucGxheWVyLnBvc2l0aW9uLCBsaWdodFJhZGl1cykpIHtcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gPSAwXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuc3RhdGUgPSBybC5Nb25zdGVyU3RhdGUuaWRsZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHRpY2tNb25zdGVyKG1vbnN0ZXJQb3NpdGlvbjogZ2VvLlBvaW50LCBtb25zdGVyOiBybC5Nb25zdGVyKSB7XHJcbiAgICAgICAgLy8gaWYgcGxheWVyIGlzIHdpdGhpbiByZWFjaCAoYW5kIGFsaXZlKSwgYXR0YWNrXHJcbiAgICAgICAgbGV0IHsgcG9zaXRpb246IHBsYXllclBvc2l0aW9uLCB0aGluZzogcGxheWVyIH0gPSB0aGlzLm1hcC5wbGF5ZXJcclxuXHJcbiAgICAgICAgLy8gZmlyc3QgYXR0ZW1wdCB0byBhdHRhY2tcclxuICAgICAgICBpZiAocGxheWVyLmhlYWx0aCA+IDApIHtcclxuICAgICAgICAgICAgY29uc3QgZGlzdGFuY2VUb1BsYXllciA9IGdlby5jYWxjTWFuaGF0dGVuRGlzdChwbGF5ZXJQb3NpdGlvbiwgbW9uc3RlclBvc2l0aW9uKVxyXG4gICAgICAgICAgICBjb25zdCBhdHRhY2tzID0gbW9uc3Rlci5hdHRhY2tzLmZpbHRlcihhID0+IGEucmFuZ2UgPj0gZGlzdGFuY2VUb1BsYXllcilcclxuICAgICAgICAgICAgaWYgKGF0dGFja3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYXR0YWNrID0gcmFuZC5jaG9vc2UodGhpcy5ybmcsIGF0dGFja3MpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NNb25zdGVyQXR0YWNrKG1vbnN0ZXIsIGF0dGFjaylcclxuICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBkZXRlcm1pbmUgd2hldGhlciBtb25zdGVyIGNhbiBzZWUgcGxheWVyXHJcbiAgICAgICAgLy8gc2VlayBhbmQgZGVzdHJveVxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgY29uc3QgcGF0aCA9IG1hcHMuZmluZFBhdGgobWFwLCBtb25zdGVyUG9zaXRpb24sIHBsYXllclBvc2l0aW9uKVxyXG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAvLyBwYXNzXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gcGF0aFswXVxyXG4gICAgICAgIGlmIChtYXAuaXNQYXNzYWJsZShwb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gLT0gMVxyXG4gICAgICAgICAgICB0aGlzLm1hcC5tb25zdGVycy5zZXQocG9zaXRpb24sIG1vbnN0ZXIpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gPSAwXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlUmVzaXplKCkge1xyXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IHRoaXMuY2FudmFzXHJcbiAgICAgICAgaWYgKGNhbnZhcy53aWR0aCA9PT0gY2FudmFzLmNsaWVudFdpZHRoICYmIGNhbnZhcy5oZWlnaHQgPT09IGNhbnZhcy5jbGllbnRIZWlnaHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYW52YXMud2lkdGggPSBjYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVJbnB1dCgpIHtcclxuICAgICAgICBjb25zdCBpbnAgPSB0aGlzLmlucFxyXG5cclxuICAgICAgICAvLyB0YXJnZXRcclxuICAgICAgICBpZiAodGhpcy5jdXJzb3JQb3NpdGlvbiAmJiAoaW5wLnByZXNzZWQoaW5wdXQuS2V5LkVudGVyKSB8fCBpbnAucHJlc3NlZChcIiBcIikpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlQ3Vyc29yVGFyZ2V0KClcclxuICAgICAgICAgICAgaW5wLmZsdXNoKClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjdHJsLWtleSBjdXJzb3IgbW92ZW1lbnRcclxuICAgICAgICBpZiAodGhpcy5oYW5kbGVDdXJzb3JLZXlib2FyZE1vdmVtZW50KCkpIHtcclxuICAgICAgICAgICAgaW5wLmZsdXNoKClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5oYW5kbGVQbGF5ZXJLZXlib2FyZE1vdmVtZW50KCkpIHtcclxuICAgICAgICAgICAgaW5wLmZsdXNoKClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjbGljayBvbiBvYmplY3RcclxuICAgICAgICBpZiAodGhpcy5oYW5kbGVDbGljaygpKSB7XHJcbiAgICAgICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaW5wLmZsdXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUN1cnNvcktleWJvYXJkTW92ZW1lbnQoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgY29uc3QgaW5wID0gdGhpcy5pbnBcclxuICAgICAgICBpZiAoIWlucC5oZWxkKGlucHV0LktleS5Db250cm9sKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHsgcG9zaXRpb246IHBsYXllclBvc2l0aW9uLCB0aGluZzogcGxheWVyIH0gPSB0aGlzLm1hcC5wbGF5ZXJcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmN1cnNvclBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3Vyc29yUG9zaXRpb24gPSBwbGF5ZXJQb3NpdGlvbi5jbG9uZSgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLnByZXNzZWQoXCJ3XCIpIHx8IGlucC5wcmVzc2VkKFwiV1wiKSB8fCBpbnAucHJlc3NlZChcIkFycm93VXBcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJzb3JQb3NpdGlvbi55IC09IDFcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcInNcIikgfHwgaW5wLnByZXNzZWQoXCJTXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dEb3duXCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3Vyc29yUG9zaXRpb24ueSArPSAxXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLnByZXNzZWQoXCJhXCIpIHx8IGlucC5wcmVzc2VkKFwiQVwiKSB8fCBpbnAucHJlc3NlZChcIkFycm93TGVmdFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnNvclBvc2l0aW9uLnggLT0gMVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGlucC5wcmVzc2VkKFwiZFwiKSB8fCBpbnAucHJlc3NlZChcIkRcIikgfHwgaW5wLnByZXNzZWQoXCJBcnJvd1JpZ2h0XCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3Vyc29yUG9zaXRpb24ueCArPSAxXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLnByZXNzZWQoXCIgXCIpKSB7XHJcbiAgICAgICAgICAgIHBsYXllci5hY3Rpb25SZXNlcnZlICs9IHBsYXllci5hY3Rpb25cclxuICAgICAgICAgICAgcGxheWVyLmFjdGlvbiA9IDBcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlQ2xpY2soKTogYm9vbGVhbiB7XHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHRoZSBtYXAgY29vcmRpbmF0ZXMgdGhlIHVzZXIgY2xpY2tlZCBvblxyXG4gICAgICAgIGNvbnN0IGlucCA9IHRoaXMuaW5wXHJcblxyXG4gICAgICAgIGlmICghaW5wLm1vdXNlTGVmdFJlbGVhc2VkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaGFuZGxlVGFyZ2V0Q29tbWFuZENsaWNrKCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG14eSA9IHRoaXMuY2FudmFzVG9NYXBQb2ludChuZXcgZ2VvLlBvaW50KGlucC5tb3VzZVgsIGlucC5tb3VzZVkpKVxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgY29uc3QgeyBwb3NpdGlvbjogcGxheWVyUG9zaXRpb24sIHRoaW5nOiBwbGF5ZXIgfSA9IHRoaXMubWFwLnBsYXllclxyXG5cclxuICAgICAgICBjb25zdCBjbGlja0ZpeHR1cmUgPSBtYXAuZml4dHVyZUF0KG14eSlcclxuICAgICAgICBpZiAoY2xpY2tGaXh0dXJlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBZb3Ugc2VlICR7Y2xpY2tGaXh0dXJlLm5hbWV9YClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNsaWNrTW9uc3RlciA9IG1hcC5tb25zdGVyQXQobXh5KVxyXG4gICAgICAgIC8vIGZpcnN0LCB0cnkgbWVsZWVcclxuICAgICAgICBpZiAoY2xpY2tNb25zdGVyKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRpc3QgPSBnZW8uY2FsY01hbmhhdHRlbkRpc3QocGxheWVyUG9zaXRpb24sIG14eSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJkaXN0OlwiLCBkaXN0KVxyXG4gICAgICAgICAgICBpZiAoZGlzdCA8PSAocGxheWVyLm1lbGVlV2VhcG9uPy5yYW5nZSA/PyAwKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzUGxheWVyTWVsZWVBdHRhY2soY2xpY2tNb25zdGVyKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3QgPD0gKHBsYXllci5yYW5nZWRXZWFwb24/LnJhbmdlID8/IDApKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NQbGF5ZXJSYW5nZWRBdHRhY2soY2xpY2tNb25zdGVyKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYFlvdSBzZWUgJHtjbGlja01vbnN0ZXIubmFtZX1gKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZHh5ID0gbXh5LnN1YlBvaW50KHBsYXllclBvc2l0aW9uKVxyXG4gICAgICAgIGNvbnN0IHNnbiA9IGR4eS5zaWduKClcclxuICAgICAgICBjb25zdCBhYnMgPSBkeHkuYWJzKClcclxuXHJcbiAgICAgICAgaWYgKGFicy54ID4gMCAmJiBhYnMueCA+PSBhYnMueSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1vdmUoc2duLnggPiAwID8gRGlyZWN0aW9uLkVhc3QgOiBEaXJlY3Rpb24uV2VzdClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChhYnMueSA+IDAgJiYgYWJzLnkgPiBhYnMueCkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1vdmUoc2duLnkgPiAwID8gRGlyZWN0aW9uLlNvdXRoIDogRGlyZWN0aW9uLk5vcnRoKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVQbGF5ZXJLZXlib2FyZE1vdmVtZW50KCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCBpbnAgPSB0aGlzLmlucFxyXG5cclxuICAgICAgICBpZiAoaW5wLnByZXNzZWQoXCJ3XCIpIHx8IGlucC5wcmVzc2VkKFwiV1wiKSB8fCBpbnAucHJlc3NlZChcIkFycm93VXBcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVNb3ZlKERpcmVjdGlvbi5Ob3J0aClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcInNcIikgfHwgaW5wLnByZXNzZWQoXCJTXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dEb3duXCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlTW92ZShEaXJlY3Rpb24uU291dGgpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLnByZXNzZWQoXCJhXCIpIHx8IGlucC5wcmVzc2VkKFwiQVwiKSB8fCBpbnAucHJlc3NlZChcIkFycm93TGVmdFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1vdmUoRGlyZWN0aW9uLldlc3QpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLnByZXNzZWQoXCJkXCIpIHx8IGlucC5wcmVzc2VkKFwiRFwiKSB8fCBpbnAucHJlc3NlZChcIkFycm93UmlnaHRcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVNb3ZlKERpcmVjdGlvbi5FYXN0KVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVNb3ZlKGRpcjogRGlyZWN0aW9uKSB7XHJcbiAgICAgICAgLy8gY2xlYXIgY3Vyc29yIG9uIG1vdmVtZW50XHJcbiAgICAgICAgdGhpcy5jdXJzb3JQb3NpdGlvbiA9IHVuZGVmaW5lZFxyXG4gICAgICAgIGNvbnN0IHsgcG9zaXRpb246IHBsYXllclBvc2l0aW9uLCB0aGluZzogcGxheWVyIH0gPSB0aGlzLm1hcC5wbGF5ZXJcclxuXHJcbiAgICAgICAgbGV0IG5ld1Bvc2l0aW9uID0gcGxheWVyUG9zaXRpb24uYWRkUG9pbnQoZGlyZWN0aW9uVmVjdG9yKGRpcikpXHJcbiAgICAgICAgaWYgKCF0aGlzLm1hcC5pbkJvdW5kcyhuZXdQb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGNvbnN0IHRpbGUgPSBtYXAudGlsZUF0KG5ld1Bvc2l0aW9uKVxyXG4gICAgICAgIGlmICh0aWxlICYmICF0aWxlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBCbG9ja2VkIGJ5ICR7dGlsZS5uYW1lfWApXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbW9uc3RlciA9IG1hcC5tb25zdGVyQXQobmV3UG9zaXRpb24pXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5wcm9jZXNzUGxheWVyTWVsZWVBdHRhY2sobW9uc3RlcilcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb250YWluZXIgPSBtYXAuY29udGFpbmVyQXQobmV3UG9zaXRpb24pXHJcbiAgICAgICAgaWYgKGNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lckRpYWxvZy5zaG93KG1hcCwgY29udGFpbmVyKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGZpeHR1cmUgPSBtYXAuZml4dHVyZUF0KG5ld1Bvc2l0aW9uKVxyXG4gICAgICAgIGlmIChmaXh0dXJlIGluc3RhbmNlb2YgcmwuRG9vcikge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgJHtmaXh0dXJlLm5hbWV9IG9wZW5lZGApXHJcbiAgICAgICAgICAgIHRoaXMubWFwLmZpeHR1cmVzLmRlbGV0ZShmaXh0dXJlKVxyXG4gICAgICAgICAgICBwbGF5ZXIuYWN0aW9uIC09IDFcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfSBlbHNlIGlmIChmaXh0dXJlIGluc3RhbmNlb2YgcmwuRXhpdCkge1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZUV4aXQoZml4dHVyZS5kaXJlY3Rpb24pXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH0gZWxzZSBpZiAoZml4dHVyZSAmJiAhZml4dHVyZS5wYXNzYWJsZSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgQ2FuJ3QgbW92ZSB0aGF0IHdheSwgYmxvY2tlZCBieSAke2ZpeHR1cmUubmFtZX1gKVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1hcC5wbGF5ZXIucG9zaXRpb24gPSBuZXdQb3NpdGlvblxyXG4gICAgICAgIHBsYXllci5hY3Rpb24gLT0gMVxyXG4gICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eSgpXHJcblxyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlQ3Vyc29yVGFyZ2V0KCkge1xyXG4gICAgICAgIGNvbnN0IGN1cnNvclBvc2l0aW9uID0gdGhpcy5jdXJzb3JQb3NpdGlvblxyXG4gICAgICAgIGlmICghY3Vyc29yUG9zaXRpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGNvbnN0IHRpbGUgPSBtYXAudGlsZUF0KGN1cnNvclBvc2l0aW9uKVxyXG5cclxuICAgICAgICBpZiAoIXRpbGUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oJ05vdGhpbmcgaGVyZScpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG1hcC52aXNpYmlsaXR5QXQoY3Vyc29yUG9zaXRpb24pICE9PSBtYXBzLlZpc2liaWxpdHkuVmlzaWJsZSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgVGFyZ2V0IG5vdCB2aXNpYmxlYClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB7IHBvc2l0aW9uOiBwbGF5ZXJQb3NpdGlvbiwgdGhpbmc6IHBsYXllciB9ID0gdGhpcy5tYXAucGxheWVyXHJcbiAgICAgICAgY29uc3QgZGlzdFRvVGFyZ2V0ID0gZ2VvLmNhbGNNYW5oYXR0ZW5EaXN0KHBsYXllclBvc2l0aW9uLCBjdXJzb3JQb3NpdGlvbilcclxuICAgICAgICBjb25zdCBtb25zdGVyID0gbWFwLm1vbnN0ZXJBdChjdXJzb3JQb3NpdGlvbilcclxuXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIgJiYgZGlzdFRvVGFyZ2V0IDw9IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5wcm9jZXNzUGxheWVyTWVsZWVBdHRhY2sobW9uc3RlcilcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobW9uc3RlciAmJiBkaXN0VG9UYXJnZXQgPiAxICYmIHBsYXllci5yYW5nZWRXZWFwb24pIHtcclxuICAgICAgICAgICAgdGhpcy5wcm9jZXNzUGxheWVyUmFuZ2VkQXR0YWNrKG1vbnN0ZXIpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29udGFpbmVyID0gbWFwLmNvbnRhaW5lckF0KGN1cnNvclBvc2l0aW9uKVxyXG4gICAgICAgIGlmIChjb250YWluZXIgJiYgZGlzdFRvVGFyZ2V0IDw9IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5jb250YWluZXJEaWFsb2cuc2hvdyhtYXAsIGNvbnRhaW5lcilcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmaXh0dXJlID0gbWFwLmZpeHR1cmVBdChjdXJzb3JQb3NpdGlvbilcclxuICAgICAgICBpZiAoZml4dHVyZSBpbnN0YW5jZW9mIHJsLkRvb3IgJiYgZGlzdFRvVGFyZ2V0IDw9IDEpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYCR7Zml4dHVyZS5uYW1lfSBvcGVuZWRgKVxyXG4gICAgICAgICAgICB0aGlzLm1hcC5maXh0dXJlcy5kZWxldGUoZml4dHVyZSlcclxuICAgICAgICAgICAgcGxheWVyLmFjdGlvbiAtPSAxXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbGFzdGx5IC0gcGVyZm9ybSBhIGxvb2tcclxuICAgICAgICBmb3IgKGNvbnN0IHRoIG9mIHRoaXMubWFwLmF0KGN1cnNvclBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke3RoLm5hbWV9YClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVUYXJnZXRDb21tYW5kQ2xpY2soKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmlucC5tb3VzZUxlZnRSZWxlYXNlZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnRhcmdldENvbW1hbmQgPT09IFRhcmdldENvbW1hbmQuTm9uZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGN4eSA9IG5ldyBnZW8uUG9pbnQodGhpcy5pbnAubW91c2VYLCB0aGlzLmlucC5tb3VzZVkpXHJcbiAgICAgICAgY29uc3QgbXh5ID0gdGhpcy5jYW52YXNUb01hcFBvaW50KGN4eSlcclxuXHJcbiAgICAgICAgY29uc3QgbGlnaHRSYWRpdXMgPSB0aGlzLmNhbGNMaWdodFJhZGl1cygpXHJcbiAgICAgICAgaWYgKCFjYW5TZWUodGhpcy5tYXAsIHRoaXMubWFwLnBsYXllci5wb3NpdGlvbiwgbXh5LCBsaWdodFJhZGl1cykpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKGBDYW4ndCBzZWUhYClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN3aXRjaCAodGhpcy50YXJnZXRDb21tYW5kKSB7XHJcbiAgICAgICAgICAgIGNhc2UgVGFyZ2V0Q29tbWFuZC5Mb29rOiB7XHJcbiAgICAgICAgICAgICAgICAvLyBzaG93IHdoYXQgdXNlciBjbGlja2VkIG9uXHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHRoIG9mIHRoaXMubWFwLmF0KG14eSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke3RoLm5hbWV9YClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVGFyZ2V0Q29tbWFuZC5BdHRhY2s6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG1vbnN0ZXIgPSB0aGlzLm1hcC5tb25zdGVyQXQobXh5KVxyXG4gICAgICAgICAgICAgICAgaWYgKG1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NQbGF5ZXJNZWxlZUF0dGFjayhtb25zdGVyKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuaW5mbyhcIk5vdGhpbmcgdG8gYXR0YWNrIGhlcmUuXCIpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIFRhcmdldENvbW1hbmQuU2hvb3Q6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG1vbnN0ZXIgPSB0aGlzLm1hcC5tb25zdGVyQXQobXh5KVxyXG4gICAgICAgICAgICAgICAgaWYgKG1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NQbGF5ZXJSYW5nZWRBdHRhY2sobW9uc3RlcilcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LmluZm8oXCJOb3RoaW5nIHRvIHNob290IGhlcmUuXCIpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLk5vbmVcclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlVmlzaWJpbGl0eSgpIHtcclxuICAgICAgICAvLyB1cGRhdGUgdmlzaWJpbGl0eSBhcm91bmQgcGxheWVyXHJcbiAgICAgICAgLy8gbGltaXQgcmFkaXVzIHRvIHZpc2libGUgdmlld3BvcnQgYXJlYVxyXG4gICAgICAgIGNvbnN0IHZpZXdwb3J0TGlnaHRSYWRpdXMgPSBNYXRoLm1heChNYXRoLmNlaWwodGhpcy5jYW52YXMud2lkdGggLyB0aGlzLnRpbGVTaXplKSwgTWF0aC5jZWlsKHRoaXMuY2FudmFzLmhlaWdodCAvIHRoaXMudGlsZVNpemUpKVxyXG4gICAgICAgIHRoaXMubWFwLnVwZGF0ZVZpc2libGUodmlld3BvcnRMaWdodFJhZGl1cylcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNhbGNNYXBWaWV3cG9ydCgpOiBnZW8uQUFCQiB7XHJcbiAgICAgICAgY29uc3QgYWFiYiA9IG5ldyBnZW8uQUFCQihcclxuICAgICAgICAgICAgdGhpcy5jYW52YXNUb01hcFBvaW50KG5ldyBnZW8uUG9pbnQoMCwgMCkpLFxyXG4gICAgICAgICAgICB0aGlzLmNhbnZhc1RvTWFwUG9pbnQobmV3IGdlby5Qb2ludCh0aGlzLmNhbnZhcy53aWR0aCArIHRoaXMudGlsZVNpemUsIHRoaXMuY2FudmFzLmhlaWdodCArIHRoaXMudGlsZVNpemUpKSlcclxuICAgICAgICAgICAgLmludGVyc2VjdGlvbihuZXcgZ2VvLkFBQkIobmV3IGdlby5Qb2ludCgwLCAwKSwgbmV3IGdlby5Qb2ludCh0aGlzLm1hcC53aWR0aCwgdGhpcy5tYXAuaGVpZ2h0KSkpXHJcblxyXG4gICAgICAgIHJldHVybiBhYWJiXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYWxjTGlnaHRSYWRpdXMoKTogbnVtYmVyIHtcclxuICAgICAgICBjb25zdCB2aWV3cG9ydExpZ2h0UmFkaXVzID0gTWF0aC5tYXgoTWF0aC5jZWlsKHRoaXMuY2FudmFzLndpZHRoIC8gdGhpcy50aWxlU2l6ZSksIE1hdGguY2VpbCh0aGlzLmNhbnZhcy5oZWlnaHQgLyB0aGlzLnRpbGVTaXplKSlcclxuICAgICAgICBpZiAodGhpcy5tYXAubGlnaHRpbmcgPT09IG1hcHMuTGlnaHRpbmcuQW1iaWVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdmlld3BvcnRMaWdodFJhZGl1c1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIE1hdGgubWluKHZpZXdwb3J0TGlnaHRSYWRpdXMsIHRoaXMubWFwLnBsYXllci50aGluZy5saWdodFJhZGl1cylcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyYXdGcmFtZSgpIHtcclxuICAgICAgICAvLyBjZW50ZXIgdGhlIGdyaWQgYXJvdW5kIHRoZSBwbGF5ZXJkXHJcbiAgICAgICAgY29uc3Qgdmlld3BvcnRBQUJCID0gdGhpcy5jYWxjTWFwVmlld3BvcnQoKVxyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHRoaXMuZ2V0U2Nyb2xsT2Zmc2V0KClcclxuXHJcbiAgICAgICAgLy8gbm90ZSAtIGRyYXdpbmcgb3JkZXIgbWF0dGVycyAtIGRyYXcgZnJvbSBib3R0b20gdG8gdG9wXHJcbiAgICAgICAgaWYgKHRoaXMudGFyZ2V0Q29tbWFuZCAhPT0gVGFyZ2V0Q29tbWFuZC5Ob25lKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2FudmFzLnN0eWxlLmN1cnNvciA9IFwiY3Jvc3NoYWlyXCJcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmNhbnZhcy5zdHlsZS5jdXJzb3IgPSBcIlwiXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNob290QnV0dG9uLmRpc2FibGVkID0gIXRoaXMubWFwLnBsYXllci50aGluZy5yYW5nZWRXZWFwb25cclxuXHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBjb25zdCB0aWxlcyA9IG1hcC50aWxlcy53aXRoaW4odmlld3BvcnRBQUJCKVxyXG4gICAgICAgIGNvbnN0IGZpeHR1cmVzID0gbWFwLmZpeHR1cmVzLndpdGhpbih2aWV3cG9ydEFBQkIpXHJcbiAgICAgICAgY29uc3QgY29udGFpbmVycyA9IG1hcC5jb250YWluZXJzLndpdGhpbih2aWV3cG9ydEFBQkIpXHJcbiAgICAgICAgY29uc3QgbW9uc3RlcnMgPSBtYXAubW9uc3RlcnMud2l0aGluKHZpZXdwb3J0QUFCQilcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCB0aWxlIG9mIHRpbGVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgdGlsZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgZml4dHVyZSBvZiBmaXh0dXJlcykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIGZpeHR1cmUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGNvbnRhaW5lciBvZiBjb250YWluZXJzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgY29udGFpbmVyKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBjcmVhdHVyZSBvZiBtb25zdGVycykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIGNyZWF0dXJlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCB0aGlzLm1hcC5wbGF5ZXIpXHJcbiAgICAgICAgdGhpcy5kcmF3SGVhbHRoQmFyKG9mZnNldCwgdGhpcy5tYXAucGxheWVyKVxyXG4gICAgICAgIHRoaXMuZHJhd0N1cnNvcihvZmZzZXQpXHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZmx1c2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd1RoaW5nKG9mZnNldDogZ2VvLlBvaW50LCBwbGFjZWRUaGluZzogbWFwcy5QbGFjZWQ8cmwuVGhpbmc+KSB7XHJcbiAgICAgICAgY29uc3QgeyBwb3NpdGlvbiwgdGhpbmcgfSA9IHBsYWNlZFRoaW5nXHJcbiAgICAgICAgY29uc3QgdmlzaWJsZSA9IHRoaXMubWFwLnZpc2liaWxpdHlBdChwb3NpdGlvbilcclxuICAgICAgICBjb25zdCBzZWVuID0gdGhpcy5tYXAuc2VlbkF0KHBvc2l0aW9uKVxyXG4gICAgICAgIGNvbnN0IGZvZyA9ICh2aXNpYmxlID09PSBtYXBzLlZpc2liaWxpdHkuTm9uZSB8fCB2aXNpYmxlID09PSBtYXBzLlZpc2liaWxpdHkuRGFyaylcclxuICAgICAgICAgICAgJiYgc2VlblxyXG4gICAgICAgICAgICAmJiAodGhpbmcgaW5zdGFuY2VvZiBybC5UaWxlIHx8IHRoaW5nIGluc3RhbmNlb2YgcmwuRml4dHVyZSlcclxuXHJcbiAgICAgICAgaWYgKCh2aXNpYmxlID09PSBtYXBzLlZpc2liaWxpdHkuTm9uZSB8fCB2aXNpYmxlID09IG1hcHMuVmlzaWJpbGl0eS5EYXJrKSAmJiAhZm9nKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29sb3IgPSB0aGluZy5jb2xvci5jbG9uZSgpXHJcbiAgICAgICAgaWYgKGZvZykge1xyXG4gICAgICAgICAgICBjb2xvci5hID0gLjI1XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRyYXdJbWFnZShvZmZzZXQsIHBvc2l0aW9uLCB0aGluZy5pbWFnZSwgY29sb3IpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkcmF3Q3Vyc29yKG9mZnNldDogZ2VvLlBvaW50KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmN1cnNvclBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmF3SW1hZ2Uob2Zmc2V0LCB0aGlzLmN1cnNvclBvc2l0aW9uLCBcIi4vYXNzZXRzL2N1cnNvci5wbmdcIiwgZ2Z4LkNvbG9yLnJlZClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyYXdJbWFnZShvZmZzZXQ6IGdlby5Qb2ludCwgcG9zaXRpb246IGdlby5Qb2ludCwgaW1hZ2U6IHN0cmluZywgY29sb3I6IGdmeC5Db2xvciA9IGdmeC5Db2xvci53aGl0ZSkge1xyXG4gICAgICAgIGNvbnN0IHNwcml0ZVBvc2l0aW9uID0gcG9zaXRpb24ubXVsU2NhbGFyKHRoaXMudGlsZVNpemUpLmFkZFBvaW50KG9mZnNldClcclxuICAgICAgICBjb25zdCBsYXllciA9IHRoaXMuaW1hZ2VNYXAuZ2V0KGltYWdlKVxyXG5cclxuICAgICAgICBpZiAobGF5ZXIgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgaW1hZ2UgbWFwcGluZzogJHtpbWFnZX1gKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc3ByaXRlID0gbmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24sXHJcbiAgICAgICAgICAgIGNvbG9yLFxyXG4gICAgICAgICAgICB3aWR0aDogdGhpcy50aWxlU2l6ZSxcclxuICAgICAgICAgICAgaGVpZ2h0OiB0aGlzLnRpbGVTaXplLFxyXG4gICAgICAgICAgICB0ZXh0dXJlOiB0aGlzLnRleHR1cmUsXHJcbiAgICAgICAgICAgIGxheWVyOiBsYXllcixcclxuICAgICAgICAgICAgZmxhZ3M6IGdmeC5TcHJpdGVGbGFncy5BcnJheVRleHR1cmVcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdTcHJpdGUoc3ByaXRlKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd0hlYWx0aEJhcihvZmZzZXQ6IGdlby5Qb2ludCwgcGxhY2VkQ3JlYXR1cmU6IG1hcHMuUGxhY2VkPHJsLkNyZWF0dXJlPikge1xyXG4gICAgICAgIGNvbnN0IHsgcG9zaXRpb24sIHRoaW5nOiBjcmVhdHVyZSB9ID0gcGxhY2VkQ3JlYXR1cmVcclxuICAgICAgICBjb25zdCBoZWFsdGggPSBNYXRoLm1heChjcmVhdHVyZS5oZWFsdGgsIDApXHJcbiAgICAgICAgY29uc3QgYm9yZGVyV2lkdGggPSBoZWFsdGggKiA0ICsgMlxyXG4gICAgICAgIGNvbnN0IGludGVyaW9yV2lkdGggPSBoZWFsdGggKiA0XHJcbiAgICAgICAgY29uc3Qgc3ByaXRlUG9zaXRpb24gPSBwb3NpdGlvbi5tdWxTY2FsYXIodGhpcy50aWxlU2l6ZSkuYWRkUG9pbnQob2Zmc2V0KS5zdWJQb2ludChuZXcgZ2VvLlBvaW50KDAsIHRoaXMudGlsZVNpemUgLyAyKSlcclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdTcHJpdGUobmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24sXHJcbiAgICAgICAgICAgIGNvbG9yOiBnZnguQ29sb3Iud2hpdGUsXHJcbiAgICAgICAgICAgIHdpZHRoOiBib3JkZXJXaWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0OiA4XHJcbiAgICAgICAgfSkpXHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd1Nwcml0ZShuZXcgZ2Z4LlNwcml0ZSh7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBzcHJpdGVQb3NpdGlvbi5hZGRQb2ludChuZXcgZ2VvLlBvaW50KDEsIDEpKSxcclxuICAgICAgICAgICAgY29sb3I6IGdmeC5Db2xvci5yZWQsXHJcbiAgICAgICAgICAgIHdpZHRoOiBpbnRlcmlvcldpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IDZcclxuICAgICAgICB9KSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhpZGVEaWFsb2dzKCkge1xyXG4gICAgICAgIHRoaXMuaW52ZW50b3J5RGlhbG9nLmhpZGUoKVxyXG4gICAgICAgIHRoaXMuc3RhdHNEaWFsb2cuaGlkZSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgdGlsZVNpemUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHJsLnRpbGVTaXplICogdGhpcy56b29tXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVLZXlQcmVzcyhldjogS2V5Ym9hcmRFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IGtleSA9IGV2LmtleS50b1VwcGVyQ2FzZSgpXHJcblxyXG4gICAgICAgIHN3aXRjaCAoa2V5KSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJJXCI6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHdhc0hpZGRlbiA9IHRoaXMuaW52ZW50b3J5RGlhbG9nLmhpZGRlblxyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlRGlhbG9ncygpXHJcbiAgICAgICAgICAgICAgICBpZiAod2FzSGlkZGVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnZlbnRvcnlEaWFsb2cuc2hvdygpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIFwiWlwiOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB3YXNIaWRkZW4gPSB0aGlzLnN0YXRzRGlhbG9nLmhpZGRlblxyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlRGlhbG9ncygpXHJcbiAgICAgICAgICAgICAgICBpZiAod2FzSGlkZGVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0c0RpYWxvZy5zaG93KClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCJMXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLkxvb2tcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIFwiRU5URVJcIjpcclxuICAgICAgICAgICAgICAgIGlmIChldi5jdHJsS2V5ICYmIHRoaXMubWFwLnBsYXllci50aGluZy5yYW5nZWRXZWFwb24pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLlNob290XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuQXR0YWNrXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIkxcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuTG9va1xyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCI9XCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnpvb20gPSBNYXRoLm1pbih0aGlzLnpvb20gKiAyLCAxNilcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eSgpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIi1cIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuem9vbSA9IE1hdGgubWF4KHRoaXMuem9vbSAvIDIsIC4xMjUpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHkoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjbGVhclN0YXRlKCkge1xyXG4gICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKFNUT1JBR0VfS0VZKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2F2ZVN0YXRlKCkge1xyXG4gICAgICAgIC8vIHNhdmUgdGhlIGN1cnJlbnQgZ2FtZSBzdGF0ZVxyXG4gICAgICAgIHZhciBzdGF0ZTogQXBwU2F2ZVN0YXRlID0ge1xyXG4gICAgICAgICAgICBybmc6IHRoaXMucm5nLnNhdmUoKSxcclxuICAgICAgICAgICAgZmxvb3I6IHRoaXMuZmxvb3IsXHJcbiAgICAgICAgICAgIHBsYXllcjogdGhpcy5tYXAucGxheWVyLnRoaW5nLnNhdmUoKSxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGpzb25TdGF0ZSA9IEpTT04uc3RyaW5naWZ5KHN0YXRlKVxyXG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFNUT1JBR0VfS0VZLCBqc29uU3RhdGUpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVFeGl0KGRpcjogcmwuRXhpdERpcmVjdGlvbikge1xyXG4gICAgICAgIGlmIChkaXIgPT0gcmwuRXhpdERpcmVjdGlvbi5VcCAmJiB0aGlzLmZsb29yID09IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5zaG9wRGlhbG9nLnNob3coKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN3aXRjaCAoZGlyKSB7XHJcbiAgICAgICAgICAgIGNhc2UgcmwuRXhpdERpcmVjdGlvbi5VcDpcclxuICAgICAgICAgICAgICAgIHRoaXMuZmxvb3IgLT0gMVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgICAgY2FzZSBybC5FeGl0RGlyZWN0aW9uLkRvd246XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZsb29yICs9IDFcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5nZW5lcmF0ZU1hcChkaXIpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZU1hcChkaXI6IHJsLkV4aXREaXJlY3Rpb24pIHtcclxuICAgICAgICB0aGlzLm1hcCA9IGF3YWl0IGdlbi5nZW5lcmF0ZUR1bmdlb25MZXZlbCh0aGlzLnJuZywgdGhpbmdzLmRiLCB0aGlzLm1hcC5wbGF5ZXIudGhpbmcsIHRoaXMuZmxvb3IsIGRpcilcclxuICAgICAgICBjb25zdCBbdGV4dHVyZSwgaW1hZ2VNYXBdID0gYXdhaXQgbG9hZEltYWdlcyh0aGlzLnJlbmRlcmVyLCB0aGlzLm1hcClcclxuICAgICAgICB0aGlzLnRleHR1cmUgPSB0ZXh0dXJlXHJcbiAgICAgICAgdGhpcy5pbWFnZU1hcCA9IGltYWdlTWFwXHJcbiAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5KClcclxuICAgIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIEFwcFNhdmVTdGF0ZSB7XHJcbiAgICByZWFkb25seSBybmc6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdXHJcbiAgICByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllclNhdmVTdGF0ZVxyXG4gICAgcmVhZG9ubHkgZmxvb3I6IG51bWJlclxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBsb2FkSW1hZ2VzKHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIG1hcDogbWFwcy5NYXApOiBQcm9taXNlPFtnZnguVGV4dHVyZSwgTWFwPHN0cmluZywgbnVtYmVyPl0+IHtcclxuICAgIC8vIGJha2UgYWxsIDI0eDI0IHRpbGUgaW1hZ2VzIHRvIGEgc2luZ2xlIGFycmF5IHRleHR1cmVcclxuICAgIC8vIHN0b3JlIG1hcHBpbmcgZnJvbSBpbWFnZSB1cmwgdG8gaW5kZXhcclxuICAgIGNvbnN0IGltYWdlVXJscyA9IGl0ZXIud3JhcChtYXAudGhpbmdzKCkpLm1hcCh0aCA9PiB0aC5pbWFnZSkuZmlsdGVyKCkuZGlzdGluY3QoKS50b0FycmF5KClcclxuICAgIGltYWdlVXJscy5wdXNoKFwiLi9hc3NldHMvY3Vyc29yLnBuZ1wiKVxyXG5cclxuICAgIGNvbnN0IGltYWdlTWFwID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oaW1hZ2VVcmxzLm1hcCgodXJsLCBpKSA9PiBbdXJsLCBpXSkpXHJcbiAgICBjb25zdCBpbWFnZXMgPSBhd2FpdCBQcm9taXNlLmFsbChpbWFnZVVybHMubWFwKHVybCA9PiBkb20ubG9hZEltYWdlKHVybCkpKVxyXG4gICAgY29uc3QgdGV4dHVyZSA9IHJlbmRlcmVyLmJha2VUZXh0dXJlQXJyYXkocmwudGlsZVNpemUsIHJsLnRpbGVTaXplLCBpbWFnZXMpXHJcblxyXG4gICAgcmV0dXJuIFt0ZXh0dXJlLCBpbWFnZU1hcF1cclxufVxyXG5cclxuZnVuY3Rpb24gbG9hZFN0YXRlKCk6IEFwcFNhdmVTdGF0ZSB8IG51bGwge1xyXG4gICAgY29uc3QganNvbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFNUT1JBR0VfS0VZKVxyXG4gICAgaWYgKCFqc29uKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGxcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzdGF0ZSA9IEpTT04ucGFyc2UoanNvbikgYXMgQXBwU2F2ZVN0YXRlXHJcbiAgICByZXR1cm4gc3RhdGVcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgIGNvbnN0IGFwcCA9IGF3YWl0IEFwcC5jcmVhdGUoKVxyXG4gICAgYXBwLmV4ZWMoKVxyXG59XHJcblxyXG5pbml0KCkiXX0=