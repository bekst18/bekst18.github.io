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
function getSortedItemsPage(items, pageIndex, pageSize) {
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    const sortedItems = getSortedItems(items);
    const page = sortedItems.slice(startIndex, endIndex);
    return page;
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
        requestAnimationFrame(() => this.tick());
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
        this.updateVisibility();
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
        return false;
    }
    handleClick() {
        var _a, _b;
        // determine the map coordinates the user clicked on
        const inp = this.inp;
        if (!inp.mouseLeftReleased) {
            return false;
        }
        if (this.handleTargetCommandClick()) {
            console.log("TARGET COMMAND!");
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
        if (inp.pressed(" ")) {
            output.info("Pass");
            const player = this.map.player.thing;
            player.actionReserve += player.action;
            player.action = 0;
            return true;
        }
        return false;
    }
    handleOpen(door) {
        output.info(`${door.name} opened`);
        this.map.fixtures.delete(door);
        this.map.player.thing.action -= 1;
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
            this.handleOpen(fixture);
            return true;
        }
        else if (fixture && !fixture.passable) {
            output.info(`Can't move that way, blocked by ${fixture.name}`);
            return false;
        }
        const exit = map.exitAt(newPosition);
        if (exit) {
            player.action -= 1;
            map.player.position = newPosition;
            await this.handleExit(exit.direction);
            return;
        }
        map.player.position = newPosition;
        player.action -= 1;
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
            case "ESCAPE":
                this.targetCommand = TargetCommand.None;
                this.cursorPosition = undefined;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBQ2pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFFekMsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFBO0FBU25DLFNBQVMsZUFBZSxDQUFDLEdBQWM7SUFDbkMsUUFBUSxHQUFHLEVBQUU7UUFDVDtZQUNJLE9BQU8sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9CO1lBQ0ksT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlCO1lBQ0ksT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlCO1lBQ0ksT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7S0FDbEM7QUFDTCxDQUFDO0FBRUQsTUFBTSxNQUFNO0lBRVIsWUFBNEIsSUFBaUIsRUFB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QyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsSUFBSSxHQUFHLENBQUMsQ0FBQTtJQUNoRSxJQUFJLENBQUMsSUFBSSxFQUFFO1FBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyxvREFBb0QsQ0FBQyxDQUFBO0tBQ3hFO0lBRUQsc0NBQXNDO0lBQ3RDLHNIQUFzSDtJQUN0SCx5QkFBeUI7SUFDekIsNEVBQTRFO0lBQzVFLElBQUk7SUFFSixHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0FBQzFDLENBQUM7QUFFRCxLQUFLLFVBQVUsSUFBSTtJQUNmLE1BQU0sR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQzlCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtBQUNkLENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGl0ZXIgZnJvbSBcIi4uL3NoYXJlZC9pdGVyLmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbiBmcm9tIFwiLi9nZW4uanNcIlxyXG5pbXBvcnQgKiBhcyBpbnB1dCBmcm9tIFwiLi4vc2hhcmVkL2lucHV0LmpzXCJcclxuaW1wb3J0ICogYXMgcmwgZnJvbSBcIi4vcmwuanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcbmltcG9ydCAqIGFzIG91dHB1dCBmcm9tIFwiLi9vdXRwdXQuanNcIlxyXG5pbXBvcnQgKiBhcyB0aGluZ3MgZnJvbSBcIi4vdGhpbmdzLmpzXCJcclxuaW1wb3J0ICogYXMgbWFwcyBmcm9tIFwiLi9tYXBzLmpzXCJcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIlxyXG5cclxuY29uc3QgU1RPUkFHRV9LRVkgPSBcImNyYXdsX3N0b3JhZ2VcIlxyXG5cclxuY29uc3QgZW51bSBEaXJlY3Rpb24ge1xyXG4gICAgTm9ydGgsXHJcbiAgICBTb3V0aCxcclxuICAgIEVhc3QsXHJcbiAgICBXZXN0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpcmVjdGlvblZlY3RvcihkaXI6IERpcmVjdGlvbik6IGdlby5Qb2ludCB7XHJcbiAgICBzd2l0Y2ggKGRpcikge1xyXG4gICAgICAgIGNhc2UgRGlyZWN0aW9uLk5vcnRoOlxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgwLCAtMSlcclxuICAgICAgICBjYXNlIERpcmVjdGlvbi5Tb3V0aDpcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMCwgMSlcclxuICAgICAgICBjYXNlIERpcmVjdGlvbi5FYXN0OlxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgxLCAwKVxyXG4gICAgICAgIGNhc2UgRGlyZWN0aW9uLldlc3Q6XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KC0xLCAwKVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtb2RhbEJhY2tncm91bmQgPSBkb20uYnlJZChcIm1vZGFsQmFja2dyb3VuZFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGVsZW06IEhUTUxFbGVtZW50LCBwcml2YXRlIHJlYWRvbmx5IGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHsgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5tb2RhbEJhY2tncm91bmQuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmVsZW0uaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmVsZW0uZm9jdXMoKVxyXG4gICAgfVxyXG5cclxuICAgIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5tb2RhbEJhY2tncm91bmQuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuZWxlbS5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgdGhpcy5jYW52YXMuZm9jdXMoKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBoaWRkZW4oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZWxlbS5oaWRkZW5cclxuICAgIH1cclxuXHJcbiAgICB0b2dnbGUoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZWxlbS5oaWRkZW4pIHtcclxuICAgICAgICAgICAgdGhpcy5zaG93KClcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU3RhdHNEaWFsb2cgZXh0ZW5kcyBEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBvcGVuQnV0dG9uID0gZG9tLmJ5SWQoXCJzdGF0c0J1dHRvblwiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwic3RhdHNDbG9zZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXIsIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICBzdXBlcihkb20uYnlJZChcInN0YXRzRGlhbG9nXCIpLCBjYW52YXMpXHJcblxyXG4gICAgICAgIHRoaXMub3BlbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy50b2dnbGUoKSlcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgZXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkVTQ0FQRVwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyXHJcbiAgICAgICAgY29uc3QgaGVhbHRoU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNIZWFsdGhcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3Qgc3RyZW5ndGhTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c1N0cmVuZ3RoXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGFnaWxpdHlTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0FnaWxpdHlcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgaW50ZWxsaWdlbmNlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNJbnRlbGxpZ2VuY2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgYXR0YWNrU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNBdHRhY2tcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZGFtYWdlU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNEYW1hZ2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZGVmZW5zZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRGVmZW5zZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBsZXZlbFNwYW4gPSBkb20uYnlJZChcInN0YXRzTGV2ZWxcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZXhwZXJpZW5jZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRXhwZXJpZW5jZVwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBnb2xkU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNHb2xkXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGV4cGVyaWVuY2VSZXF1aXJlbWVudCA9IHJsLmdldEV4cGVyaWVuY2VSZXF1aXJlbWVudChwbGF5ZXIubGV2ZWwgKyAxKVxyXG5cclxuICAgICAgICBoZWFsdGhTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmhlYWx0aH0gLyAke3BsYXllci5tYXhIZWFsdGh9YFxyXG4gICAgICAgIHN0cmVuZ3RoU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5zdHJlbmd0aH1gXHJcbiAgICAgICAgYWdpbGl0eVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuYWdpbGl0eX1gXHJcbiAgICAgICAgaW50ZWxsaWdlbmNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5pbnRlbGxpZ2VuY2V9YFxyXG4gICAgICAgIGF0dGFja1NwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIubWVsZWVBdHRhY2t9IC8gJHtwbGF5ZXIucmFuZ2VkV2VhcG9uID8gcGxheWVyLnJhbmdlZEF0dGFjayA6IFwiTkFcIn1gXHJcbiAgICAgICAgZGFtYWdlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5tZWxlZURhbWFnZX0gLyAke3BsYXllci5yYW5nZWREYW1hZ2UgPyBwbGF5ZXIucmFuZ2VkRGFtYWdlIDogXCJOQVwifWBcclxuICAgICAgICBkZWZlbnNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5kZWZlbnNlfWBcclxuICAgICAgICBhZ2lsaXR5U3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5hZ2lsaXR5fWBcclxuICAgICAgICBsZXZlbFNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIubGV2ZWx9YFxyXG4gICAgICAgIGV4cGVyaWVuY2VTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmV4cGVyaWVuY2V9IC8gJHtleHBlcmllbmNlUmVxdWlyZW1lbnR9YFxyXG4gICAgICAgIGdvbGRTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmdvbGR9YFxyXG5cclxuICAgICAgICBzdXBlci5zaG93KClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgSW52ZW50b3J5RGlhbG9nIGV4dGVuZHMgRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgb3BlbkJ1dHRvbiA9IGRvbS5ieUlkKFwiaW52ZW50b3J5QnV0dG9uXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGluZm9EaXYgPSBkb20uYnlJZChcImludmVudG9yeUluZm9cIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZW1wdHlEaXYgPSBkb20uYnlJZChcImludmVudG9yeUVtcHR5XCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRhYmxlID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlUYWJsZVwiKSBhcyBIVE1MVGFibGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwiaW52ZW50b3J5SXRlbVRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbmV4dFBhZ2VCdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeU5leHRQYWdlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHByZXZQYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlQcmV2UGFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwiaW52ZW50b3J5Q2xvc2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFnZVNpemU6IG51bWJlciA9IDlcclxuICAgIHByaXZhdGUgcGFnZUluZGV4OiBudW1iZXIgPSAwXHJcbiAgICBwcml2YXRlIHNlbGVjdGVkSW5kZXg6IG51bWJlciA9IC0xXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHN1cGVyKGRvbS5ieUlkKFwiaW52ZW50b3J5RGlhbG9nXCIpLCBjYW52YXMpXHJcbiAgICAgICAgdGhpcy5vcGVuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnRvZ2dsZSgpKVxyXG4gICAgICAgIHRoaXMuY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuaGlkZSgpKVxyXG5cclxuICAgICAgICB0aGlzLm5leHRQYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucGFnZUluZGV4KytcclxuICAgICAgICAgICAgdGhpcy5wYWdlSW5kZXggPSBNYXRoLm1pbih0aGlzLnBhZ2VJbmRleCwgTWF0aC5jZWlsKHRoaXMucGxheWVyLmludmVudG9yeS5sZW5ndGggLyB0aGlzLnBhZ2VTaXplKSlcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLnByZXZQYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucGFnZUluZGV4LS1cclxuICAgICAgICAgICAgdGhpcy5wYWdlSW5kZXggPSBNYXRoLm1heCh0aGlzLnBhZ2VJbmRleCwgMClcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgZXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHBhcnNlSW50KGV2LmtleSlcclxuXHJcbiAgICAgICAgICAgIGlmIChpbmRleCAmJiBpbmRleCA+IDAgJiYgaW5kZXggPD0gOSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gaW5kZXggLSAxXHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlVcIiAmJiB0aGlzLnNlbGVjdGVkSW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy51c2UodGhpcy5zZWxlY3RlZEluZGV4KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkVcIiAmJiB0aGlzLnNlbGVjdGVkSW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5lcXVpcCh0aGlzLnNlbGVjdGVkSW5kZXgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiUlwiICYmIHRoaXMuc2VsZWN0ZWRJbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZSh0aGlzLnNlbGVjdGVkSW5kZXgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiRFwiICYmIHRoaXMuc2VsZWN0ZWRJbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRyb3AodGhpcy5zZWxlY3RlZEluZGV4KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkFSUk9XRE9XTlwiIHx8IGtleSA9PT0gXCJTXCIpIHtcclxuICAgICAgICAgICAgICAgICsrdGhpcy5zZWxlY3RlZEluZGV4XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSBNYXRoLm1pbih0aGlzLnNlbGVjdGVkSW5kZXgsIDgpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkFSUk9XVVBcIiB8fCBrZXkgPT09IFwiV1wiKSB7XHJcbiAgICAgICAgICAgICAgICAtLXRoaXMuc2VsZWN0ZWRJbmRleFxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5tYXgodGhpcy5zZWxlY3RlZEluZGV4LCAtMSlcclxuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiRVNDQVBFXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5lbGVtLCBcImNsaWNrXCIsIFwiLmludmVudG9yeS11c2UtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZ2V0Um93SW5kZXgoZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50KVxyXG4gICAgICAgICAgICB0aGlzLnVzZShpbmRleClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5lbGVtLCBcImNsaWNrXCIsIFwiLmludmVudG9yeS1kcm9wLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgZXYuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmdldFJvd0luZGV4KGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudClcclxuICAgICAgICAgICAgdGhpcy5kcm9wKGluZGV4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLmVsZW0sIFwiY2xpY2tcIiwgXCIuaW52ZW50b3J5LWVxdWlwLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgZXYuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmdldFJvd0luZGV4KGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudClcclxuICAgICAgICAgICAgdGhpcy5lcXVpcChpbmRleClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5lbGVtLCBcImNsaWNrXCIsIFwiLmludmVudG9yeS1yZW1vdmUtYnV0dG9uXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZ2V0Um93SW5kZXgoZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50KVxyXG4gICAgICAgICAgICB0aGlzLnJlbW92ZShpbmRleClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5lbGVtLCBcImNsaWNrXCIsIFwiLml0ZW0tcm93XCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCByb3cgPSAoZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KFwiLml0ZW0tcm93XCIpXHJcbiAgICAgICAgICAgIGlmIChyb3cpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0KHJvdyBhcyBIVE1MVGFibGVSb3dFbGVtZW50KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgc3VwZXIuc2hvdygpXHJcbiAgICB9XHJcblxyXG4gICAgcmVmcmVzaCgpIHtcclxuICAgICAgICBjb25zdCB0Ym9keSA9IHRoaXMudGFibGUudEJvZGllc1swXVxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0Ym9keSlcclxuXHJcbiAgICAgICAgaWYgKHRoaXMucGxheWVyLmludmVudG9yeS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lbXB0eURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgICAgICB0aGlzLmluZm9EaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW1wdHlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgICAgICB0aGlzLmluZm9EaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBhZ2VDb3VudCA9IE1hdGguY2VpbCh0aGlzLnBsYXllci5pbnZlbnRvcnkubGVuZ3RoIC8gdGhpcy5wYWdlU2l6ZSlcclxuICAgICAgICB0aGlzLnBhZ2VJbmRleCA9IE1hdGgubWluKE1hdGgubWF4KDAsIHRoaXMucGFnZUluZGV4KSwgcGFnZUNvdW50IC0gMSlcclxuICAgICAgICB0aGlzLnByZXZQYWdlQnV0dG9uLmRpc2FibGVkID0gdGhpcy5wYWdlSW5kZXggPD0gMFxyXG4gICAgICAgIHRoaXMubmV4dFBhZ2VCdXR0b24uZGlzYWJsZWQgPSB0aGlzLnBhZ2VJbmRleCA+PSBwYWdlQ291bnQgLSAxXHJcblxyXG4gICAgICAgIHRoaXMuaW5mb0Rpdi50ZXh0Q29udGVudCA9IGBQYWdlICR7dGhpcy5wYWdlSW5kZXggKyAxfSBvZiAke3BhZ2VDb3VudH1gXHJcblxyXG4gICAgICAgIGNvbnN0IGl0ZW1zID0gZ2V0U29ydGVkSXRlbXNQYWdlKHRoaXMucGxheWVyLmludmVudG9yeSwgdGhpcy5wYWdlSW5kZXgsIHRoaXMucGFnZVNpemUpXHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5taW4odGhpcy5zZWxlY3RlZEluZGV4LCBpdGVtcy5sZW5ndGggLSAxKVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBpdGVtc1tpXVxyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMuaXRlbVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgdHIgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbUluZGV4VGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1pbmRleFwiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtTmFtZVRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0tbmFtZVwiKVxyXG4gICAgICAgICAgICBjb25zdCBlcXVpcEJ1dHRvbiA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pbnZlbnRvcnktZXF1aXAtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHJlbW92ZUJ1dHRvbiA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pbnZlbnRvcnktcmVtb3ZlLWJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCB1c2VCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LXVzZS1idXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGl0ZW0gaW5zdGFuY2VvZiBybC5MaWdodFNvdXJjZSA/IGAke2l0ZW0ubmFtZX0gKCR7aXRlbS5kdXJhdGlvbn0pYCA6IGl0ZW0ubmFtZVxyXG5cclxuICAgICAgICAgICAgaXRlbUluZGV4VGQudGV4dENvbnRlbnQgPSAoaSArIDEpLnRvU3RyaW5nKClcclxuICAgICAgICAgICAgaXRlbU5hbWVUZC50ZXh0Q29udGVudCA9IG5hbWVcclxuXHJcbiAgICAgICAgICAgIGlmICghKGl0ZW0gaW5zdGFuY2VvZiBybC5Vc2FibGUpKSB7XHJcbiAgICAgICAgICAgICAgICB1c2VCdXR0b24ucmVtb3ZlKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXJsLmlzRXF1aXBwYWJsZShpdGVtKSB8fCB0aGlzLnBsYXllci5pc0VxdWlwcGVkKGl0ZW0pKSB7XHJcbiAgICAgICAgICAgICAgICBlcXVpcEJ1dHRvbi5yZW1vdmUoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMucGxheWVyLmlzRXF1aXBwZWQoaXRlbSkpIHtcclxuICAgICAgICAgICAgICAgIHJlbW92ZUJ1dHRvbi5yZW1vdmUoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoaSA9PT0gdGhpcy5zZWxlY3RlZEluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICB0ci5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIilcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGJvZHkuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2VsZWN0KHNlbGVjdGVkUm93OiBIVE1MVGFibGVSb3dFbGVtZW50KSB7XHJcbiAgICAgICAgY29uc3Qgcm93cyA9IEFycmF5LmZyb20odGhpcy5lbGVtLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuaXRlbS1yb3dcIikpXHJcbiAgICAgICAgZm9yIChjb25zdCByb3cgb2Ygcm93cykge1xyXG4gICAgICAgICAgICByb3cuY2xhc3NMaXN0LnJlbW92ZShcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZWxlY3RlZFJvdy5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIilcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFJvd0luZGV4KGVsZW06IEhUTUxCdXR0b25FbGVtZW50KSB7XHJcbiAgICAgICAgY29uc3QgaW5kZXggPSBkb20uZ2V0RWxlbWVudEluZGV4KGVsZW0uY2xvc2VzdChcIi5pdGVtLXJvd1wiKSBhcyBIVE1MVGFibGVSb3dFbGVtZW50KVxyXG4gICAgICAgIHJldHVybiBpbmRleFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXNlKGluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBpID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplICsgaW5kZXhcclxuICAgICAgICBjb25zdCBpdGVtID0gZ2V0U29ydGVkSXRlbXModGhpcy5wbGF5ZXIuaW52ZW50b3J5KVtpXVxyXG4gICAgICAgIGlmICghKGl0ZW0gaW5zdGFuY2VvZiBybC5Vc2FibGUpKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXNlSXRlbSh0aGlzLnBsYXllciwgaXRlbSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJvcChpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaSA9IHRoaXMucGFnZUluZGV4ICogdGhpcy5wYWdlU2l6ZSArIGluZGV4XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEl0ZW1zKHRoaXMucGxheWVyLmludmVudG9yeSlbaV1cclxuICAgICAgICBkcm9wSXRlbSh0aGlzLnBsYXllciwgaXRlbSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZXF1aXAoaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGkgPSB0aGlzLnBhZ2VJbmRleCAqIHRoaXMucGFnZVNpemUgKyBpbmRleFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLnBsYXllci5pbnZlbnRvcnkpW2ldXHJcbiAgICAgICAgaWYgKCFybC5pc0VxdWlwcGFibGUoaXRlbSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBlcXVpcEl0ZW0odGhpcy5wbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlbW92ZShpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaSA9IHRoaXMucGFnZUluZGV4ICogdGhpcy5wYWdlU2l6ZSArIGluZGV4XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEl0ZW1zKHRoaXMucGxheWVyLmludmVudG9yeSlbaV1cclxuICAgICAgICBpZiAoIXJsLmlzRXF1aXBwYWJsZShpdGVtKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlbW92ZUl0ZW0odGhpcy5wbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQ29udGFpbmVyRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGlhbG9nOiBEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbmFtZVNwYW4gPSBkb20uYnlJZChcImNvbnRhaW5lck5hbWVcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNsb3NlQnV0dG9uID0gZG9tLmJ5SWQoXCJjb250YWluZXJDbG9zZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0YWtlQWxsQnV0dG9uID0gZG9tLmJ5SWQoXCJjb250YWluZXJUYWtlQWxsQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lclRhYmxlID0gZG9tLmJ5SWQoXCJjb250YWluZXJUYWJsZVwiKSBhcyBIVE1MVGFibGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lckl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwiY29udGFpbmVySXRlbVRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHByaXZhdGUgbWFwOiBtYXBzLk1hcCB8IG51bGwgPSBudWxsXHJcbiAgICBwcml2YXRlIGNvbnRhaW5lcjogcmwuQ29udGFpbmVyIHwgbnVsbCA9IG51bGxcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyLCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cgPSBuZXcgRGlhbG9nKGRvbS5ieUlkKFwiY29udGFpbmVyRGlhbG9nXCIpLCBjYW52YXMpXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIgPSBwbGF5ZXJcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuICAgICAgICB0aGlzLnRha2VBbGxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMudGFrZUFsbCgpKVxyXG4gICAgICAgIGNvbnN0IGVsZW0gPSB0aGlzLmRpYWxvZy5lbGVtXHJcblxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZShlbGVtLCBcImNsaWNrXCIsIFwiLmNvbnRhaW5lci10YWtlLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGJ0biA9IGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCByb3cgPSBidG4uY2xvc2VzdChcIi5pdGVtLXJvd1wiKSBhcyBIVE1MVGFibGVSb3dFbGVtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgocm93KVxyXG4gICAgICAgICAgICB0aGlzLnRha2UoaWR4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkNcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJBXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFrZUFsbCgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoZXYua2V5KVxyXG4gICAgICAgICAgICBpZiAoaW5kZXggJiYgaW5kZXggPiAwICYmIGluZGV4IDw9IDkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFrZShpbmRleCAtIDEpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHNob3cobWFwOiBtYXBzLk1hcCwgY29udGFpbmVyOiBybC5Db250YWluZXIpIHtcclxuICAgICAgICB0aGlzLm1hcCA9IG1hcFxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyXHJcbiAgICAgICAgdGhpcy5uYW1lU3Bhbi50ZXh0Q29udGVudCA9IHRoaXMuY29udGFpbmVyLm5hbWVcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIHRoaXMuZGlhbG9nLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIGhpZGUoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMubWFwICYmIHRoaXMuY29udGFpbmVyICYmIHRoaXMuY29udGFpbmVyLml0ZW1zLnNpemUgPT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5jb250YWluZXJzLmRlbGV0ZSh0aGlzLmNvbnRhaW5lcilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gbnVsbFxyXG4gICAgICAgIHRoaXMuZGlhbG9nLmhpZGUoKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBoaWRkZW4oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZGlhbG9nLmhpZGRlblxyXG4gICAgfVxyXG5cclxuICAgIHJlZnJlc2goKSB7XHJcbiAgICAgICAgY29uc3QgdGJvZHkgPSB0aGlzLmNvbnRhaW5lclRhYmxlLnRCb2RpZXNbMF1cclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGJvZHkpXHJcblxyXG4gICAgICAgIGlmICghdGhpcy5jb250YWluZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBpdGVtcyA9IGdldFNvcnRlZEl0ZW1zKHRoaXMuY29udGFpbmVyLml0ZW1zKVxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IGl0ZW1zW2ldXHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy5jb250YWluZXJJdGVtVGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCB0ciA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5pdGVtLXJvd1wiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtSW5kZXhUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLWluZGV4XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1OYW1lVGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1uYW1lXCIpXHJcbiAgICAgICAgICAgIGl0ZW1JbmRleFRkLnRleHRDb250ZW50ID0gYCR7aSArIDF9YFxyXG4gICAgICAgICAgICBpdGVtTmFtZVRkLnRleHRDb250ZW50ID0gaXRlbS5uYW1lXHJcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0YWtlKGluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEl0ZW1zKHRoaXMuY29udGFpbmVyLml0ZW1zKVtpbmRleF1cclxuICAgICAgICBpZiAoIWl0ZW0pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5pdGVtcy5kZWxldGUoaXRlbSlcclxuICAgICAgICB0aGlzLnBsYXllci5pbnZlbnRvcnkucHVzaChpdGVtKVxyXG5cclxuICAgICAgICAvLyBoaWRlIGlmIHRoaXMgd2FzIHRoZSBsYXN0IGl0ZW1cclxuICAgICAgICBpZiAodGhpcy5jb250YWluZXIuaXRlbXMuc2l6ZSA9PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGFrZUFsbCgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuY29udGFpbmVyLml0ZW1zKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLml0ZW1zLmRlbGV0ZShpdGVtKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXllci5pbnZlbnRvcnkucHVzaChpdGVtKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5oaWRlKClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgRGVmZWF0RGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdHJ5QWdhaW5CdXR0b24gPSBkb20uYnlJZChcInRyeUFnYWluQnV0dG9uXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpYWxvZzogRGlhbG9nXHJcblxyXG4gICAgY29uc3RydWN0b3IoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IERpYWxvZyhkb20uYnlJZChcImRlZmVhdERpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgICAgIHRoaXMudHJ5QWdhaW5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMudHJ5QWdhaW4oKSlcclxuICAgICAgICB0aGlzLmRpYWxvZy5lbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qga2V5ID0gZXYua2V5LnRvVXBwZXJDYXNlKClcclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJUXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudHJ5QWdhaW4oKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkVOVEVSXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudHJ5QWdhaW4oKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdHJ5QWdhaW4oKSB7XHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIExldmVsRGlhbG9nIGV4dGVuZHMgRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWxTdHJlbmd0aFJvdyA9IGRvbS5ieUlkKFwibGV2ZWxTdHJlbmd0aFJvd1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsZXZlbEludGVsbGlnZW5jZVJvdyA9IGRvbS5ieUlkKFwibGV2ZWxJbnRlbGxpZ2VuY2VSb3dcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWxBZ2lsaXR5Um93ID0gZG9tLmJ5SWQoXCJsZXZlbEFnaWxpdHlSb3dcIilcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyLCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgc3VwZXIoZG9tLmJ5SWQoXCJsZXZlbERpYWxvZ1wiKSwgY2FudmFzKVxyXG5cclxuICAgICAgICB0aGlzLmxldmVsU3RyZW5ndGhSb3cuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMubGV2ZWxTdHJlbnRoKCkpXHJcbiAgICAgICAgdGhpcy5sZXZlbEludGVsbGlnZW5jZVJvdy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5sZXZlbEludGVsbGlnZW5jZSgpKVxyXG4gICAgICAgIHRoaXMubGV2ZWxBZ2lsaXR5Um93LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmxldmVsQWdpbGl0eSgpKVxyXG5cclxuICAgICAgICB0aGlzLmVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGV2LmtleS50b1VwcGVyQ2FzZSgpXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoZXYua2V5KVxyXG5cclxuICAgICAgICAgICAgaWYgKGluZGV4ID09IDEgfHwga2V5ID09IFwiU1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxldmVsU3RyZW50aCgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChpbmRleCA9PSAyIHx8IGtleSA9PSBcIklcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sZXZlbEludGVsbGlnZW5jZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChpbmRleCA9PSAzIHx8IGtleSA9PSBcIkFcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sZXZlbEFnaWxpdHkoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGxldmVsU3RyZW50aCgpIHtcclxuICAgICAgICB0aGlzLnBsYXllci5iYXNlU3RyZW5ndGgrK1xyXG4gICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBsZXZlbEludGVsbGlnZW5jZSgpIHtcclxuICAgICAgICB0aGlzLnBsYXllci5iYXNlSW50ZWxsaWdlbmNlKytcclxuICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbGV2ZWxBZ2lsaXR5KCkge1xyXG4gICAgICAgIHRoaXMucGxheWVyLmJhc2VBZ2lsaXR5KytcclxuICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgfVxyXG59XHJcblxyXG5lbnVtIFNob3BEaWFsb2dNb2RlIHtcclxuICAgIEJ1eSxcclxuICAgIFNlbGxcclxufVxyXG5cclxuY2xhc3MgU2hvcERpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpYWxvZzogRGlhbG9nXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGdvbGRTcGFuID0gZG9tLmJ5SWQoXCJzaG9wR29sZFNwYW5cIikgYXMgSFRNTFNwYW5FbGVtZW50O1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwic2hvcEV4aXRCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYnV5QnV0dG9uID0gZG9tLmJ5SWQoXCJzaG9wQnV5QnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNlbGxCdXR0b24gPSBkb20uYnlJZChcInNob3BTZWxsQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG5leHRQYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJzaG9wTmV4dFBhZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcHJldlBhZ2VCdXR0b24gPSBkb20uYnlJZChcInNob3BQcmV2UGFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzaG9wVGFibGUgPSBkb20uYnlJZChcInNob3BUYWJsZVwiKSBhcyBIVE1MVGFibGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNob3BCdXlJdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcInNob3BCdXlJdGVtVGVtcGxhdGVcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzaG9wU2VsbEl0ZW1UZW1wbGF0ZSA9IGRvbS5ieUlkKFwic2hvcFNlbGxJdGVtVGVtcGxhdGVcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSBtb2RlOiBTaG9wRGlhbG9nTW9kZSA9IFNob3BEaWFsb2dNb2RlLkJ1eVxyXG4gICAgcHJpdmF0ZSBpdGVtczogcmwuSXRlbVtdID0gW11cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFnZVNpemU6IG51bWJlciA9IDlcclxuICAgIHByaXZhdGUgcGFnZUluZGV4OiBudW1iZXIgPSAwXHJcbiAgICBwcml2YXRlIHNlbGVjdGVkSW5kZXg6IG51bWJlciA9IC0xXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IERpYWxvZyhkb20uYnlJZChcInNob3BEaWFsb2dcIiksIGNhbnZhcylcclxuICAgICAgICB0aGlzLnBsYXllciA9IHBsYXllclxyXG4gICAgICAgIHRoaXMuYnV5QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnNldE1vZGUoU2hvcERpYWxvZ01vZGUuQnV5KSlcclxuICAgICAgICB0aGlzLnNlbGxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuc2V0TW9kZShTaG9wRGlhbG9nTW9kZS5TZWxsKSlcclxuICAgICAgICB0aGlzLm5leHRQYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm5leHRQYWdlKCkpXHJcbiAgICAgICAgdGhpcy5wcmV2UGFnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5wcmV2UGFnZSgpKVxyXG4gICAgICAgIHRoaXMuY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuaGlkZSgpKVxyXG5cclxuICAgICAgICBjb25zdCBlbGVtID0gdGhpcy5kaWFsb2cuZWxlbVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUoZWxlbSwgXCJjbGlja1wiLCBcIi5zaG9wLWl0ZW0tcm93XCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBidG4gPSBldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KHJvdylcclxuICAgICAgICAgICAgdGhpcy5jaG9vc2UoaWR4KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGV2LmtleS50b1VwcGVyQ2FzZSgpXHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlhcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJCXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0TW9kZShTaG9wRGlhbG9nTW9kZS5CdXkpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiU1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldE1vZGUoU2hvcERpYWxvZ01vZGUuU2VsbClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJBUlJPV0RPV05cIiB8fCBrZXkgPT09IFwiU1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRJdGVtKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJBUlJPV1VQXCIgfHwga2V5ID09PSBcIldcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2SXRlbSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiUEFHRURPV05cIiB8fCBrZXkgPT09IFwiTlwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRQYWdlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJQQUdFVVBcIiB8fCBrZXkgPT09IFwiUFwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByZXZQYWdlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFU0NBUEVcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFTlRFUlwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNob29zZSh0aGlzLnNlbGVjdGVkSW5kZXgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoZXYua2V5KVxyXG4gICAgICAgICAgICBpZiAoaW5kZXggJiYgaW5kZXggPiAwICYmIGluZGV4IDw9IDkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hvb3NlKGluZGV4IC0gMSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIHRoaXMuZGlhbG9nLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cuaGlkZSgpXHJcbiAgICB9XHJcblxyXG4gICAgY2hvb3NlKGlkeDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWR4ID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplICsgaWR4XHJcbiAgICAgICAgc3dpdGNoICh0aGlzLm1vZGUpIHtcclxuICAgICAgICAgICAgY2FzZSBTaG9wRGlhbG9nTW9kZS5CdXk6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1eShpZHgpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICBjYXNlIFNob3BEaWFsb2dNb2RlLlNlbGw6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGwoaWR4KVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2V0TW9kZShtb2RlOiBTaG9wRGlhbG9nTW9kZSkge1xyXG4gICAgICAgIHRoaXMubW9kZSA9IG1vZGVcclxuICAgICAgICB0aGlzLnBhZ2VJbmRleCA9IDBcclxuICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSAtMVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgYnV5KGlkeDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbaWR4XVxyXG5cclxuICAgICAgICBpZiAoaXRlbS52YWx1ZSA+IHRoaXMucGxheWVyLmdvbGQpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmVycm9yKGBZb3UgZG8gbm90IGhhdmUgZW5vdWdoIGdvbGQgZm9yICR7aXRlbS5uYW1lfSFgKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG91dHB1dC5pbmZvKGBZb3UgYm91Z2h0ICR7aXRlbS5uYW1lfS5gKVxyXG4gICAgICAgIHRoaXMucGxheWVyLmdvbGQgLT0gaXRlbS52YWx1ZVxyXG4gICAgICAgIHRoaXMucGxheWVyLmludmVudG9yeS5wdXNoKGl0ZW0uY2xvbmUoKSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHNlbGwoaWR4OiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBpdGVtID0gdGhpcy5pdGVtc1tpZHhdXHJcbiAgICAgICAgY29uc3QgaW52SWR4ID0gdGhpcy5wbGF5ZXIuaW52ZW50b3J5LmluZGV4T2YoaXRlbSlcclxuICAgICAgICBpZiAoaW52SWR4ID09IC0xKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIucmVtb3ZlKGl0ZW0pXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIuaW52ZW50b3J5LnNwbGljZShpbnZJZHgsIDEpXHJcbiAgICAgICAgY29uc3Qgc2VsbFZhbHVlID0gTWF0aC5mbG9vcihpdGVtLnZhbHVlIC8gMilcclxuICAgICAgICB0aGlzLnBsYXllci5nb2xkICs9IHNlbGxWYWx1ZVxyXG4gICAgICAgIG91dHB1dC5pbmZvKGBZb3Ugc29sZCAke2l0ZW0ubmFtZX0gZm9yICR7c2VsbFZhbHVlfSBnb2xkLmApXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgaGlkZGVuKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRpYWxvZy5oaWRkZW5cclxuICAgIH1cclxuXHJcbiAgICBuZXh0UGFnZSgpIHtcclxuICAgICAgICB0aGlzLnBhZ2VJbmRleCsrXHJcbiAgICAgICAgdGhpcy5wYWdlSW5kZXggPSBNYXRoLm1pbih0aGlzLnBhZ2VJbmRleCwgTWF0aC5jZWlsKHRoaXMuaXRlbXMubGVuZ3RoIC8gdGhpcy5wYWdlU2l6ZSkgLSAxKVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJldlBhZ2UoKSB7XHJcbiAgICAgICAgdGhpcy5wYWdlSW5kZXgtLVxyXG4gICAgICAgIHRoaXMucGFnZUluZGV4ID0gTWF0aC5tYXgodGhpcy5wYWdlSW5kZXgsIDApXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBuZXh0SXRlbSgpIHtcclxuICAgICAgICArK3RoaXMuc2VsZWN0ZWRJbmRleFxyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWluKHRoaXMuc2VsZWN0ZWRJbmRleCwgOClcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByZXZJdGVtKCkge1xyXG4gICAgICAgIC0tdGhpcy5zZWxlY3RlZEluZGV4XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5tYXgodGhpcy5zZWxlY3RlZEluZGV4LCAtMSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHJlZnJlc2goKSB7XHJcbiAgICAgICAgc3dpdGNoICh0aGlzLm1vZGUpIHtcclxuICAgICAgICAgICAgY2FzZSBTaG9wRGlhbG9nTW9kZS5CdXk6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2hCdXkoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgU2hvcERpYWxvZ01vZGUuU2VsbDpcclxuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaFNlbGwoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZ29sZFNwYW4udGV4dENvbnRlbnQgPSBgR29sZDogJHt0aGlzLnBsYXllci5nb2xkfWBcclxuICAgIH1cclxuXHJcbiAgICByZWZyZXNoQnV5KCkge1xyXG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy5zaG9wVGFibGUudEJvZGllc1swXVxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0Ym9keSlcclxuXHJcbiAgICAgICAgLy8gYXNzZW1ibGUgaXRlbSBsaXN0XHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5wbGF5ZXJcclxuICAgICAgICB0aGlzLml0ZW1zID0gWy4uLnRoaW5ncy5kYl0uZmlsdGVyKHQgPT4gdCBpbnN0YW5jZW9mIHJsLkl0ZW0gJiYgdC52YWx1ZSA+IDAgJiYgdC5sZXZlbCA8PSBwbGF5ZXIubGV2ZWwpIGFzIHJsLkl0ZW1bXVxyXG5cclxuICAgICAgICBjb25zdCBwYWdlT2Zmc2V0ID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplXHJcbiAgICAgICAgY29uc3QgcGFnZVNpemUgPSBNYXRoLm1pbih0aGlzLnBhZ2VTaXplLCB0aGlzLml0ZW1zLmxlbmd0aCAtIHBhZ2VPZmZzZXQpXHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5taW4odGhpcy5zZWxlY3RlZEluZGV4LCBwYWdlU2l6ZSAtIDEpXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFnZVNpemU7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gdGhpcy5pdGVtc1twYWdlT2Zmc2V0ICsgaV1cclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0aGlzLnNob3BCdXlJdGVtVGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCB0ciA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5pdGVtLXJvd1wiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtSW5kZXhUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLWluZGV4XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1OYW1lVGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1uYW1lXCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1Db3N0VGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1jb3N0XCIpXHJcbiAgICAgICAgICAgIGl0ZW1JbmRleFRkLnRleHRDb250ZW50ID0gYCR7aSArIDF9YFxyXG4gICAgICAgICAgICBpdGVtTmFtZVRkLnRleHRDb250ZW50ID0gaXRlbS5uYW1lXHJcbiAgICAgICAgICAgIGl0ZW1Db3N0VGQudGV4dENvbnRlbnQgPSBgJHtpdGVtLnZhbHVlfWBcclxuXHJcbiAgICAgICAgICAgIGlmIChpID09PSB0aGlzLnNlbGVjdGVkSW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIHRyLmNsYXNzTGlzdC5hZGQoXCJzZWxlY3RlZFwiKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoaXRlbS52YWx1ZSA+IHBsYXllci5nb2xkKSB7XHJcbiAgICAgICAgICAgICAgICB0ci5jbGFzc0xpc3QuYWRkKFwiZGlzYWJsZWRcIilcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGJvZHkuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmJ1eUJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcclxuICAgICAgICB0aGlzLnNlbGxCdXR0b24uZGlzYWJsZWQgPSBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHJlZnJlc2hTZWxsKCkge1xyXG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy5zaG9wVGFibGUudEJvZGllc1swXVxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0Ym9keSlcclxuXHJcbiAgICAgICAgLy8gYXNzZW1ibGUgaXRlbSBsaXN0XHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5wbGF5ZXJcclxuICAgICAgICB0aGlzLml0ZW1zID0gWy4uLnBsYXllci5pbnZlbnRvcnldLmZpbHRlcih0ID0+IHQudmFsdWUgPiAwKSBhcyBybC5JdGVtW11cclxuICAgICAgICBjb25zdCBwYWdlT2Zmc2V0ID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplXHJcbiAgICAgICAgY29uc3QgcGFnZVNpemUgPSBNYXRoLm1pbih0aGlzLnBhZ2VTaXplLCB0aGlzLml0ZW1zLmxlbmd0aCAtIHBhZ2VPZmZzZXQpXHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5taW4odGhpcy5zZWxlY3RlZEluZGV4LCBwYWdlU2l6ZSAtIDEpXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFnZVNpemU7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gdGhpcy5pdGVtc1twYWdlT2Zmc2V0ICsgaV1cclxuICAgICAgICAgICAgY29uc3QgZXF1aXBwZWQgPSB0aGlzLnBsYXllci5pc0VxdWlwcGVkKGl0ZW0pXHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy5zaG9wU2VsbEl0ZW1UZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHRyID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLml0ZW0tcm93XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1JbmRleFRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0taW5kZXhcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLW5hbWVcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbUNvc3RUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLWNvc3RcIilcclxuICAgICAgICAgICAgaXRlbUluZGV4VGQudGV4dENvbnRlbnQgPSBgJHtpICsgMX1gXHJcbiAgICAgICAgICAgIGl0ZW1OYW1lVGQudGV4dENvbnRlbnQgPSBgJHtlcXVpcHBlZCA/IFwiKiBcIiA6IFwiXCJ9JHtpdGVtLm5hbWV9YFxyXG4gICAgICAgICAgICBpdGVtQ29zdFRkLnRleHRDb250ZW50ID0gYCR7TWF0aC5mbG9vcihpdGVtLnZhbHVlIC8gMil9YFxyXG5cclxuICAgICAgICAgICAgaWYgKGkgPT09IHRoaXMuc2VsZWN0ZWRJbmRleCkge1xyXG4gICAgICAgICAgICAgICAgdHIuY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5idXlCdXR0b24uZGlzYWJsZWQgPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuc2VsbEJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U29ydGVkSXRlbXMoaXRlbXM6IEl0ZXJhYmxlPHJsLkl0ZW0+KTogcmwuSXRlbVtdIHtcclxuICAgIGNvbnN0IHNvcnRlZEl0ZW1zID0gaXRlci5vcmRlckJ5KGl0ZW1zLCBpID0+IGkubmFtZSlcclxuICAgIHJldHVybiBzb3J0ZWRJdGVtc1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTb3J0ZWRJdGVtc1BhZ2UoaXRlbXM6IEl0ZXJhYmxlPHJsLkl0ZW0+LCBwYWdlSW5kZXg6IG51bWJlciwgcGFnZVNpemU6IG51bWJlcik6IHJsLkl0ZW1bXSB7XHJcbiAgICBjb25zdCBzdGFydEluZGV4ID0gcGFnZUluZGV4ICogcGFnZVNpemVcclxuICAgIGNvbnN0IGVuZEluZGV4ID0gc3RhcnRJbmRleCArIHBhZ2VTaXplXHJcbiAgICBjb25zdCBzb3J0ZWRJdGVtcyA9IGdldFNvcnRlZEl0ZW1zKGl0ZW1zKVxyXG4gICAgY29uc3QgcGFnZSA9IHNvcnRlZEl0ZW1zLnNsaWNlKHN0YXJ0SW5kZXgsIGVuZEluZGV4KVxyXG4gICAgcmV0dXJuIHBhZ2VcclxufVxyXG5cclxuZnVuY3Rpb24gaGFzTGluZU9mU2lnaHQobWFwOiBtYXBzLk1hcCwgZXllOiBnZW8uUG9pbnQsIHRhcmdldDogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICBmb3IgKGNvbnN0IHB0IG9mIG1hcmNoKGV5ZSwgdGFyZ2V0KSkge1xyXG4gICAgICAgIC8vIGlnbm9yZSBzdGFydCBwb2ludFxyXG4gICAgICAgIGlmIChwdC5lcXVhbChleWUpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHRoIG9mIG1hcC5hdChwdCkpIHtcclxuICAgICAgICAgICAgaWYgKCF0aC50cmFuc3BhcmVudCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHB0LmVxdWFsKHRhcmdldClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiogbWFyY2goc3RhcnQ6IGdlby5Qb2ludCwgZW5kOiBnZW8uUG9pbnQpOiBHZW5lcmF0b3I8Z2VvLlBvaW50PiB7XHJcbiAgICBjb25zdCBjdXIgPSBzdGFydC5jbG9uZSgpXHJcbiAgICBjb25zdCBkeSA9IE1hdGguYWJzKGVuZC55IC0gc3RhcnQueSlcclxuICAgIGNvbnN0IHN5ID0gc3RhcnQueSA8IGVuZC55ID8gMSA6IC0xXHJcbiAgICBjb25zdCBkeCA9IC1NYXRoLmFicyhlbmQueCAtIHN0YXJ0LngpXHJcbiAgICBjb25zdCBzeCA9IHN0YXJ0LnggPCBlbmQueCA/IDEgOiAtMVxyXG4gICAgbGV0IGVyciA9IGR5ICsgZHhcclxuXHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgIHlpZWxkIGN1clxyXG5cclxuICAgICAgICBpZiAoY3VyLmVxdWFsKGVuZCkpIHtcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGUyID0gMiAqIGVyclxyXG4gICAgICAgIGlmIChlMiA+PSBkeCkge1xyXG4gICAgICAgICAgICBlcnIgKz0gZHhcclxuICAgICAgICAgICAgY3VyLnkgKz0gc3lcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlMiA8PSBkeSkge1xyXG4gICAgICAgICAgICBlcnIgKz0gZHlcclxuICAgICAgICAgICAgY3VyLnggKz0gc3hcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyb3BJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5JdGVtKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIuZGVsZXRlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHdhcyBkcm9wcGVkYClcclxufVxyXG5cclxuZnVuY3Rpb24gdXNlSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuVXNhYmxlKTogdm9pZCB7XHJcbiAgICBjb25zdCBhbW91bnQgPSBNYXRoLm1pbihpdGVtLmhlYWx0aCwgcGxheWVyLm1heEhlYWx0aCAtIHBsYXllci5oZWFsdGgpXHJcbiAgICBwbGF5ZXIuaGVhbHRoICs9IGFtb3VudFxyXG4gICAgcGxheWVyLmRlbGV0ZShpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSByZXN0b3JlZCAke2Ftb3VudH0gaGVhbHRoYClcclxufVxyXG5cclxuZnVuY3Rpb24gZXF1aXBJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5JdGVtKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIuZXF1aXAoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gd2FzIGVxdWlwcGVkYClcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlSXRlbShwbGF5ZXI6IHJsLlBsYXllciwgaXRlbTogcmwuSXRlbSk6IHZvaWQge1xyXG4gICAgcGxheWVyLnJlbW92ZShpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSB3YXMgcmVtb3ZlZGApXHJcbn1cclxuXHJcbmVudW0gVGFyZ2V0Q29tbWFuZCB7XHJcbiAgICBOb25lLFxyXG4gICAgQXR0YWNrLFxyXG4gICAgU2hvb3QsXHJcbiAgICBMb29rXHJcbn1cclxuXHJcbmNsYXNzIEFwcCB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGF0dGFja0J1dHRvbiA9IGRvbS5ieUlkKFwiYXR0YWNrQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNob290QnV0dG9uID0gZG9tLmJ5SWQoXCJzaG9vdEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsb29rQnV0dG9uID0gZG9tLmJ5SWQoXCJsb29rQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJlc2V0QnV0dG9uID0gZG9tLmJ5SWQoXCJyZXNldEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbnA6IGlucHV0LklucHV0ID0gbmV3IGlucHV0LklucHV0KHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdGF0c0RpYWxvZzogU3RhdHNEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW52ZW50b3J5RGlhbG9nOiBJbnZlbnRvcnlEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29udGFpbmVyRGlhbG9nOiBDb250YWluZXJEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGVmZWF0RGlhbG9nID0gbmV3IERlZmVhdERpYWxvZyh0aGlzLmNhbnZhcylcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWxEaWFsb2c6IExldmVsRGlhbG9nXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNob3BEaWFsb2c6IFNob3BEaWFsb2dcclxuICAgIHByaXZhdGUgem9vbSA9IDFcclxuICAgIHByaXZhdGUgdGFyZ2V0Q29tbWFuZDogVGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuTm9uZVxyXG4gICAgcHJpdmF0ZSBjdXJzb3JQb3NpdGlvbj86IGdlby5Qb2ludFxyXG5cclxuICAgIHByaXZhdGUgY29uc3RydWN0b3IoXHJcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBybmc6IHJhbmQuU0ZDMzJSTkcsXHJcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSByZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLFxyXG4gICAgICAgIHByaXZhdGUgZmxvb3I6IG51bWJlcixcclxuICAgICAgICBwcml2YXRlIG1hcDogbWFwcy5NYXAsXHJcbiAgICAgICAgcHJpdmF0ZSB0ZXh0dXJlOiBnZnguVGV4dHVyZSxcclxuICAgICAgICBwcml2YXRlIGltYWdlTWFwOiBNYXA8c3RyaW5nLCBudW1iZXI+KSB7XHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gbWFwLnBsYXllci50aGluZ1xyXG4gICAgICAgIHRoaXMuc3RhdHNEaWFsb2cgPSBuZXcgU3RhdHNEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgICAgICB0aGlzLmludmVudG9yeURpYWxvZyA9IG5ldyBJbnZlbnRvcnlEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgICAgICB0aGlzLmNvbnRhaW5lckRpYWxvZyA9IG5ldyBDb250YWluZXJEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgICAgICB0aGlzLmxldmVsRGlhbG9nID0gbmV3IExldmVsRGlhbG9nKHBsYXllciwgdGhpcy5jYW52YXMpXHJcbiAgICAgICAgdGhpcy5zaG9wRGlhbG9nID0gbmV3IFNob3BEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc3RhdGljIGFzeW5jIGNyZWF0ZSgpOiBQcm9taXNlPEFwcD4ge1xyXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICAgICAgY29uc3QgcmVuZGVyZXIgPSBuZXcgZ2Z4LlJlbmRlcmVyKGNhbnZhcylcclxuXHJcbiAgICAgICAgLy8gY2hlY2sgZm9yIGFueSBzYXZlZCBzdGF0ZVxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFwcCA9IGF3YWl0IEFwcC5sb2FkKHJlbmRlcmVyKVxyXG4gICAgICAgICAgICBpZiAoYXBwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXBwXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRmFpbGVkIHRvIGxvYWQgc3RhdGUuXCIsIGUpXHJcbiAgICAgICAgICAgIGNsZWFyU3RhdGUoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbm8gdmFsaWQgc2F2ZSBzdGF0ZSwgY3JlYXRlIGFwcCBhbmQgZ2VuZXJhdGUgZHVuZ2VvblxyXG4gICAgICAgIGNvbnN0IHNlZWQgPSByYW5kLnhtdXIzKG5ldyBEYXRlKCkudG9TdHJpbmcoKSlcclxuICAgICAgICBjb25zdCBybmcgPSBuZXcgcmFuZC5TRkMzMlJORyhzZWVkKCksIHNlZWQoKSwgc2VlZCgpLCBzZWVkKCkpXHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpbmdzLnBsYXllci5jbG9uZSgpXHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgbWFwID0gZ2VuLmdlbmVyYXRlRHVuZ2VvbkxldmVsKHJuZywgdGhpbmdzLmRiLCAxKVxyXG4gICAgICAgIHBsYWNlUGxheWVyQXRFeGl0KG1hcCwgcGxheWVyLCBybC5FeGl0RGlyZWN0aW9uLlVwKVxyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IFt0ZXh0dXJlLCBpbWFnZU1hcF0gPSBhd2FpdCBsb2FkSW1hZ2VzKHJlbmRlcmVyLCBtYXApXHJcbiAgICAgICAgY29uc3QgYXBwID0gbmV3IEFwcChybmcsIHJlbmRlcmVyLCAxLCBtYXAsIHRleHR1cmUsIGltYWdlTWFwKVxyXG4gICAgICAgIHJldHVybiBhcHBcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZXhlYygpIHtcclxuICAgICAgICB0aGlzLmNhbnZhcy5mb2N1cygpXHJcblxyXG4gICAgICAgIG91dHB1dC53cml0ZShcIllvdXIgYWR2ZW50dXJlIGJlZ2luc1wiKVxyXG4gICAgICAgIHRoaXMuaGFuZGxlUmVzaXplKClcclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy50aWNrKCkpXHJcblxyXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChldikgPT4gdGhpcy5oYW5kbGVLZXlEb3duKGV2KSlcclxuXHJcbiAgICAgICAgdGhpcy5hdHRhY2tCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5BdHRhY2tcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLnNob290QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuU2hvb3RcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmxvb2tCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5Mb29rXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5yZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICBjbGVhclN0YXRlKClcclxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcblxyXG4gICAgcHJpdmF0ZSB0aWNrKCkge1xyXG4gICAgICAgIHRoaXMuaGFuZGxlUmVzaXplKClcclxuXHJcbiAgICAgICAgY29uc3QgbmV4dENyZWF0dXJlID0gdGhpcy5nZXROZXh0Q3JlYXR1cmUoKVxyXG4gICAgICAgIGlmIChuZXh0Q3JlYXR1cmU/LnRoaW5nIGluc3RhbmNlb2YgcmwuUGxheWVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlSW5wdXQoKVxyXG4gICAgICAgIH0gZWxzZSBpZiAobmV4dENyZWF0dXJlPy50aGluZyBpbnN0YW5jZW9mIHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgdGhpcy50aWNrTW9uc3RlcihuZXh0Q3JlYXR1cmUucG9zaXRpb24sIG5leHRDcmVhdHVyZS50aGluZylcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnRpY2tSb3VuZCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHkoKVxyXG4gICAgICAgIHRoaXMuZHJhd0ZyYW1lKClcclxuXHJcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMudGljaygpKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0TmV4dE1vbnN0ZXIoKTogbWFwcy5QbGFjZWQ8cmwuTW9uc3Rlcj4gfCBudWxsIHtcclxuICAgICAgICAvLyBkZXRlcm1pbmUgd2hvc2UgdHVybiBpdCBpc1xyXG4gICAgICAgIGxldCBuZXh0TW9uc3RlciA9IG51bGxcclxuICAgICAgICBmb3IgKGNvbnN0IG1vbnN0ZXIgb2YgdGhpcy5tYXAubW9uc3RlcnMpIHtcclxuICAgICAgICAgICAgaWYgKG1vbnN0ZXIudGhpbmcuc3RhdGUgIT09IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dybykge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG1vbnN0ZXIudGhpbmcuYWN0aW9uIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghbmV4dE1vbnN0ZXIgfHwgbW9uc3Rlci50aGluZy5hY3Rpb24gPiBuZXh0TW9uc3Rlci50aGluZy5hY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgIG5leHRNb25zdGVyID0gbW9uc3RlclxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmV4dE1vbnN0ZXJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldE5leHRDcmVhdHVyZSgpOiBtYXBzLlBsYWNlZDxybC5Nb25zdGVyPiB8IG1hcHMuUGxhY2VkPHJsLlBsYXllcj4gfCBudWxsIHtcclxuICAgICAgICBjb25zdCBtb25zdGVyID0gdGhpcy5nZXROZXh0TW9uc3RlcigpXHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5tYXAucGxheWVyLnRoaW5nXHJcblxyXG4gICAgICAgIGlmIChwbGF5ZXIuYWN0aW9uID4gMCAmJiBwbGF5ZXIuYWN0aW9uID4gKG1vbnN0ZXI/LnRoaW5nPy5hY3Rpb24gPz8gMCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubWFwLnBsYXllclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1vbnN0ZXJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHRpY2tSb3VuZCgpIHtcclxuICAgICAgICAvLyBhY2N1bXVsYXRlIGFjdGlvbiBwb2ludHNcclxuICAgICAgICBmb3IgKGNvbnN0IG1vbnN0ZXIgb2YgaXRlci5maWx0ZXIodGhpcy5tYXAubW9uc3RlcnMudGhpbmdzKCksIG0gPT4gbS5zdGF0ZSA9PT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvKSkge1xyXG4gICAgICAgICAgICBjb25zdCByZXNlcnZlID0gTWF0aC5taW4obW9uc3Rlci5hY3Rpb25SZXNlcnZlLCBtb25zdGVyLmFnaWxpdHkpXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMSArIG1vbnN0ZXIuYWdpbGl0eSArIHJlc2VydmVcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb25SZXNlcnZlID0gMFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY2FwIGFjdGlvbiByZXNlcnZlIFxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMubWFwLnBsYXllci50aGluZ1xyXG4gICAgICAgIGNvbnN0IHJlc2VydmUgPSBNYXRoLm1pbihwbGF5ZXIuYWN0aW9uUmVzZXJ2ZSwgcGxheWVyLmFnaWxpdHkpXHJcbiAgICAgICAgcGxheWVyLmFjdGlvbiA9IDEgKyBwbGF5ZXIuYWdpbGl0eSArIHJlc2VydmVcclxuICAgICAgICBwbGF5ZXIuYWN0aW9uUmVzZXJ2ZSA9IDBcclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGVNb25zdGVyU3RhdGVzKClcclxuXHJcbiAgICAgICAgLy8gYWR2YW5jZSBkdXJhdGlvbiBvZiBpdGVtc1xyXG4gICAgICAgIGlmIChwbGF5ZXIubGlnaHRTb3VyY2UgJiYgcGxheWVyLmxpZ2h0U291cmNlLmR1cmF0aW9uID4gMCkge1xyXG4gICAgICAgICAgICBwbGF5ZXIubGlnaHRTb3VyY2UuZHVyYXRpb24gLT0gMVxyXG4gICAgICAgICAgICBpZiAocGxheWVyLmxpZ2h0U291cmNlLmR1cmF0aW9uID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQud2FybmluZyhgWW91ciAke3BsYXllci5saWdodFNvdXJjZS5uYW1lfSBoYXMgYmVlbiBleHRpbmd1aXNoZWQhYClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZXhwZXJpZW5jZVJlcXVpcmVkID0gcmwuZ2V0RXhwZXJpZW5jZVJlcXVpcmVtZW50KHBsYXllci5sZXZlbCArIDEpXHJcbiAgICAgICAgaWYgKHBsYXllci5leHBlcmllbmNlID49IGV4cGVyaWVuY2VSZXF1aXJlZCkge1xyXG4gICAgICAgICAgICB0aGlzLmxldmVsRGlhbG9nLnNob3coKVxyXG4gICAgICAgICAgICArK3BsYXllci5sZXZlbFxyXG4gICAgICAgICAgICBwbGF5ZXIuZXhwZXJpZW5jZSAtPSBleHBlcmllbmNlUmVxdWlyZWRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHNhdmUgY3VycmVudCBzdGF0ZVxyXG4gICAgICAgIHRoaXMuc2F2ZVN0YXRlKClcclxuXHJcbiAgICAgICAgaWYgKHBsYXllci5oZWFsdGggPD0gMCkge1xyXG4gICAgICAgICAgICBjbGVhclN0YXRlKClcclxuICAgICAgICAgICAgdGhpcy5kZWZlYXREaWFsb2cuc2hvdygpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0U2Nyb2xsT2Zmc2V0KCk6IGdlby5Qb2ludCB7XHJcbiAgICAgICAgLy8gY29udmVydCBtYXAgcG9pbnQgdG8gY2FudmFzIHBvaW50LCBub3RpbmcgdGhhdCBjYW52YXMgaXMgY2VudGVyZWQgb24gcGxheWVyXHJcbiAgICAgICAgY29uc3QgcGxheWVyUG9zaXRpb24gPSB0aGlzLm1hcC5wbGF5ZXIucG9zaXRpb25cclxuICAgICAgICBjb25zdCBjYW52YXNDZW50ZXIgPSBuZXcgZ2VvLlBvaW50KHRoaXMuY2FudmFzLndpZHRoIC8gMiwgdGhpcy5jYW52YXMuaGVpZ2h0IC8gMilcclxuICAgICAgICBjb25zdCBvZmZzZXQgPSBjYW52YXNDZW50ZXIuc3ViUG9pbnQocGxheWVyUG9zaXRpb24uYWRkU2NhbGFyKC41KS5tdWxTY2FsYXIodGhpcy50aWxlU2l6ZSkpXHJcbiAgICAgICAgcmV0dXJuIG9mZnNldC5mbG9vcigpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYW52YXNUb01hcFBvaW50KGN4eTogZ2VvLlBvaW50KSB7XHJcbiAgICAgICAgY29uc3Qgc2Nyb2xsT2Zmc2V0ID0gdGhpcy5nZXRTY3JvbGxPZmZzZXQoKVxyXG4gICAgICAgIGNvbnN0IG14eSA9IGN4eS5zdWJQb2ludChzY3JvbGxPZmZzZXQpLmRpdlNjYWxhcih0aGlzLnRpbGVTaXplKS5mbG9vcigpXHJcbiAgICAgICAgcmV0dXJuIG14eVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbWFwVG9DYW52YXNQb2ludChteHk6IGdlby5Qb2ludCkge1xyXG4gICAgICAgIGNvbnN0IHNjcm9sbE9mZnNldCA9IHRoaXMuZ2V0U2Nyb2xsT2Zmc2V0KClcclxuICAgICAgICBjb25zdCBjeHkgPSBteHkubXVsU2NhbGFyKHRoaXMudGlsZVNpemUpLmFkZFBvaW50KHNjcm9sbE9mZnNldClcclxuICAgICAgICByZXR1cm4gY3h5XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwcm9jZXNzUGxheWVyTWVsZWVBdHRhY2soZGVmZW5kZXI6IHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAvLyBiYXNlIDYwJSBjaGFuY2UgdG8gaGl0XHJcbiAgICAgICAgLy8gMTAlIGJvbnVzIC8gcGVuYWx0eSBmb3IgZXZlcnkgcG9pbnQgZGlmZmVyZW5jZSBiZXR3ZWVuIGF0dGFjayBhbmQgZGVmZW5zZVxyXG4gICAgICAgIC8vIGJvdHRvbXMgb3V0IGF0IDUlIC0gYWx3YXlzIFNPTUUgY2hhbmNlIHRvIGhpdFxyXG4gICAgICAgIGNvbnN0IGF0dGFja2VyID0gdGhpcy5tYXAucGxheWVyLnRoaW5nXHJcbiAgICAgICAgY29uc3QgYm9udXMgPSAoYXR0YWNrZXIubWVsZWVBdHRhY2sgLSBkZWZlbmRlci5kZWZlbnNlKSAqIC4xXHJcbiAgICAgICAgY29uc3QgaGl0Q2hhbmNlID0gTWF0aC5taW4oTWF0aC5tYXgoLjYgKyBib251cywgLjA1KSwgLjk1KVxyXG4gICAgICAgIGNvbnN0IGhpdCA9IHJhbmQuY2hhbmNlKHRoaXMucm5nLCBoaXRDaGFuY2UpXHJcbiAgICAgICAgY29uc3Qgd2VhcG9uID0gYXR0YWNrZXIubWVsZWVXZWFwb24gPz8gdGhpbmdzLmZpc3RzXHJcbiAgICAgICAgY29uc3QgYXR0YWNrVmVyYiA9IHdlYXBvbi52ZXJiID8gd2VhcG9uLnZlcmIgOiBcImF0dGFja3NcIlxyXG4gICAgICAgIGF0dGFja2VyLmFjdGlvbiAtPSB3ZWFwb24uYWN0aW9uXHJcblxyXG4gICAgICAgIGlmICghaGl0KSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke2F0dGFja2VyLm5hbWV9ICR7YXR0YWNrVmVyYn0gJHtkZWZlbmRlci5uYW1lfSBidXQgbWlzc2VzIWApXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGl0IC0gY2FsY3VsYXRlIGRhbWFnZVxyXG4gICAgICAgIGNvbnN0IGRhbWFnZSA9IGF0dGFja2VyLm1lbGVlRGFtYWdlLnJvbGwodGhpcy5ybmcpXHJcbiAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7YXR0YWNrZXIubmFtZX0gJHthdHRhY2tWZXJifSAke2RlZmVuZGVyLm5hbWV9IGFuZCBoaXRzIGZvciAke2RhbWFnZX0gZGFtYWdlIWApXHJcbiAgICAgICAgZGVmZW5kZXIuaGVhbHRoIC09IGRhbWFnZVxyXG5cclxuICAgICAgICBpZiAoZGVmZW5kZXIuaGVhbHRoIDwgMCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHtkZWZlbmRlci5uYW1lfSBoYXMgYmVlbiBkZWZlYXRlZCBhbmQgJHthdHRhY2tlci5uYW1lfSByZWNlaXZlcyAke2RlZmVuZGVyLmV4cGVyaWVuY2V9IGV4cGVyaWVuY2UgYW5kICR7ZGVmZW5kZXIuZ29sZH0gZ29sZGApXHJcbiAgICAgICAgICAgIGF0dGFja2VyLmV4cGVyaWVuY2UgKz0gZGVmZW5kZXIuZXhwZXJpZW5jZVxyXG4gICAgICAgICAgICBhdHRhY2tlci5nb2xkICs9IGRlZmVuZGVyLmdvbGRcclxuICAgICAgICAgICAgdGhpcy5tYXAubW9uc3RlcnMuZGVsZXRlKGRlZmVuZGVyKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHByb2Nlc3NQbGF5ZXJSYW5nZWRBdHRhY2soZGVmZW5kZXI6IHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAvLyBiYXNlIDQwJSBjaGFuY2UgdG8gaGl0XHJcbiAgICAgICAgLy8gMTAlIGJvbnVzIC8gcGVuYWx0eSBmb3IgZXZlcnkgcG9pbnQgZGlmZmVyZW5jZSBiZXR3ZWVuIGF0dGFjayBhbmQgZGVmZW5zZVxyXG4gICAgICAgIC8vIGJvdHRvbXMgb3V0IGF0IDUlIC0gYWx3YXlzIFNPTUUgY2hhbmNlIHRvIGhpdFxyXG4gICAgICAgIGNvbnN0IGF0dGFja2VyID0gdGhpcy5tYXAucGxheWVyLnRoaW5nXHJcbiAgICAgICAgaWYgKCFhdHRhY2tlci5yYW5nZWRXZWFwb24pIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUGxheWVyIGhhcyBubyByYW5nZWQgd2VhcG9uIGVxdWlwcGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBib251cyA9IChhdHRhY2tlci5yYW5nZWRBdHRhY2sgLSBkZWZlbmRlci5kZWZlbnNlKSAqIC4xXHJcbiAgICAgICAgY29uc3QgaGl0Q2hhbmNlID0gTWF0aC5taW4oTWF0aC5tYXgoLjYgKyBib251cywgLjA1KSwgLjk1KVxyXG4gICAgICAgIGNvbnN0IGhpdCA9IHJhbmQuY2hhbmNlKHRoaXMucm5nLCBoaXRDaGFuY2UpXHJcbiAgICAgICAgY29uc3Qgd2VhcG9uID0gYXR0YWNrZXIucmFuZ2VkV2VhcG9uXHJcbiAgICAgICAgY29uc3QgYXR0YWNrVmVyYiA9IHdlYXBvbi52ZXJiID8gd2VhcG9uLnZlcmIgOiBcImF0dGFja3NcIlxyXG4gICAgICAgIGF0dGFja2VyLmFjdGlvbiAtPSB3ZWFwb24uYWN0aW9uXHJcblxyXG4gICAgICAgIGlmICghaGl0KSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke2F0dGFja2VyLm5hbWV9ICR7YXR0YWNrVmVyYn0gJHtkZWZlbmRlci5uYW1lfSBidXQgbWlzc2VzIWApXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGl0IC0gY2FsY3VsYXRlIGRhbWFnZVxyXG4gICAgICAgIGNvbnN0IGRhbWFnZSA9IGF0dGFja2VyLnJhbmdlZERhbWFnZT8ucm9sbCh0aGlzLnJuZykgPz8gMFxyXG4gICAgICAgIG91dHB1dC53YXJuaW5nKGAke2F0dGFja2VyLm5hbWV9ICR7YXR0YWNrVmVyYn0gJHtkZWZlbmRlci5uYW1lfSBhbmQgaGl0cyBmb3IgJHtkYW1hZ2V9IGRhbWFnZSFgKVxyXG4gICAgICAgIGRlZmVuZGVyLmhlYWx0aCAtPSBkYW1hZ2VcclxuXHJcbiAgICAgICAgaWYgKGRlZmVuZGVyLmhlYWx0aCA8IDApIHtcclxuICAgICAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7ZGVmZW5kZXIubmFtZX0gaGFzIGJlZW4gZGVmZWF0ZWQgYW5kICR7YXR0YWNrZXIubmFtZX0gcmVjZWl2ZXMgJHtkZWZlbmRlci5leHBlcmllbmNlfSBleHBlcmllbmNlYClcclxuICAgICAgICAgICAgYXR0YWNrZXIuZXhwZXJpZW5jZSArPSBkZWZlbmRlci5leHBlcmllbmNlXHJcbiAgICAgICAgICAgIHRoaXMubWFwLm1vbnN0ZXJzLmRlbGV0ZShkZWZlbmRlcilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwcm9jZXNzTW9uc3RlckF0dGFjayhhdHRhY2tlcjogcmwuTW9uc3RlciwgYXR0YWNrOiBybC5BdHRhY2spIHtcclxuICAgICAgICAvLyBiYXNlIDYwJSBjaGFuY2UgdG8gaGl0XHJcbiAgICAgICAgLy8gMTAlIGJvbnVzIC8gcGVuYWx0eSBmb3IgZXZlcnkgcG9pbnQgZGlmZmVyZW5jZSBiZXR3ZWVuIGF0dGFjayBhbmQgZGVmZW5zZVxyXG4gICAgICAgIC8vIGNsYW1wcyB0byBvdXQgYXQgWzUsIDk1XSAtIGFsd2F5cyBTT01FIGNoYW5jZSB0byBoaXQgb3IgbWlzc1xyXG4gICAgICAgIC8vIGNob29zZSBhbiBhdHRhY2sgZnJvbSByZXBlcnRvaXJlIG9mIG1vbnN0ZXJcclxuICAgICAgICBjb25zdCBkZWZlbmRlciA9IHRoaXMubWFwLnBsYXllci50aGluZ1xyXG4gICAgICAgIGNvbnN0IGJvbnVzID0gKGF0dGFjay5hdHRhY2sgLSBkZWZlbmRlci5kZWZlbnNlKSAqIC4xXHJcbiAgICAgICAgY29uc3QgaGl0Q2hhbmNlID0gTWF0aC5tYXgoLjYgKyBib251cywgLjA1KVxyXG4gICAgICAgIGNvbnN0IGhpdCA9IHJhbmQuY2hhbmNlKHRoaXMucm5nLCBoaXRDaGFuY2UpXHJcbiAgICAgICAgY29uc3QgYXR0YWNrVmVyYiA9IGF0dGFjay52ZXJiID8gYXR0YWNrLnZlcmIgOiBcImF0dGFja3NcIlxyXG4gICAgICAgIGF0dGFja2VyLmFjdGlvbiAtPSBhdHRhY2suYWN0aW9uXHJcblxyXG4gICAgICAgIGlmICghaGl0KSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke2F0dGFja2VyLm5hbWV9ICR7YXR0YWNrVmVyYn0gJHtkZWZlbmRlci5uYW1lfSBidXQgbWlzc2VzIWApXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGl0IC0gY2FsY3VsYXRlIGRhbWFnZVxyXG4gICAgICAgIGNvbnN0IGRhbWFnZSA9IGF0dGFjay5kYW1hZ2Uucm9sbCh0aGlzLnJuZylcclxuICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYW5kIGhpdHMgZm9yICR7ZGFtYWdlfSBkYW1hZ2UhYClcclxuICAgICAgICBkZWZlbmRlci5oZWFsdGggLT0gZGFtYWdlXHJcblxyXG4gICAgICAgIGlmIChkZWZlbmRlci5oZWFsdGggPD0gMCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHtkZWZlbmRlci5uYW1lfSBoYXMgYmVlbiBkZWZlYXRlZCFgKVxyXG4gICAgICAgICAgICBjbGVhclN0YXRlKClcclxuICAgICAgICAgICAgdGhpcy5kZWZlYXREaWFsb2cuc2hvdygpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlTW9uc3RlclN0YXRlcygpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IG1vbnN0ZXIgb2YgdGhpcy5tYXAubW9uc3RlcnMpIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVNb25zdGVyU3RhdGUobW9uc3RlcilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVNb25zdGVyU3RhdGUocGxhY2VkTW9uc3RlcjogbWFwcy5QbGFjZWQ8cmwuTW9uc3Rlcj4pIHtcclxuICAgICAgICAvLyBhZ2dybyBzdGF0ZVxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgbGV0IHsgcG9zaXRpb24sIHRoaW5nOiBtb25zdGVyIH0gPSBwbGFjZWRNb25zdGVyXHJcbiAgICAgICAgY29uc3QgbG9zID0gaGFzTGluZU9mU2lnaHQobWFwLCBwb3NpdGlvbiwgbWFwLnBsYXllci5wb3NpdGlvbilcclxuICAgICAgICBcclxuICAgICAgICBpZiAobW9uc3Rlci5zdGF0ZSAhPT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvICYmIGxvcykge1xyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvbiA9IDBcclxuICAgICAgICAgICAgbW9uc3Rlci5zdGF0ZSA9IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dyb1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIuc3RhdGUgPT09IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dybyAmJiAhbG9zKSB7XHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgICAgICBtb25zdGVyLnN0YXRlID0gcmwuTW9uc3RlclN0YXRlLmlkbGVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB0aWNrTW9uc3Rlcihtb25zdGVyUG9zaXRpb246IGdlby5Qb2ludCwgbW9uc3RlcjogcmwuTW9uc3Rlcikge1xyXG4gICAgICAgIC8vIGlmIHBsYXllciBpcyB3aXRoaW4gcmVhY2ggKGFuZCBhbGl2ZSksIGF0dGFja1xyXG4gICAgICAgIGxldCB7IHBvc2l0aW9uOiBwbGF5ZXJQb3NpdGlvbiwgdGhpbmc6IHBsYXllciB9ID0gdGhpcy5tYXAucGxheWVyXHJcblxyXG4gICAgICAgIC8vIGZpcnN0IGF0dGVtcHQgdG8gYXR0YWNrXHJcbiAgICAgICAgaWYgKHBsYXllci5oZWFsdGggPiAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlVG9QbGF5ZXIgPSBnZW8uY2FsY01hbmhhdHRlbkRpc3QocGxheWVyUG9zaXRpb24sIG1vbnN0ZXJQb3NpdGlvbilcclxuICAgICAgICAgICAgY29uc3QgYXR0YWNrcyA9IG1vbnN0ZXIuYXR0YWNrcy5maWx0ZXIoYSA9PiBhLnJhbmdlID49IGRpc3RhbmNlVG9QbGF5ZXIpXHJcbiAgICAgICAgICAgIGlmIChhdHRhY2tzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGF0dGFjayA9IHJhbmQuY2hvb3NlKHRoaXMucm5nLCBhdHRhY2tzKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzTW9uc3RlckF0dGFjayhtb25zdGVyLCBhdHRhY2spXHJcbiAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHdoZXRoZXIgbW9uc3RlciBjYW4gc2VlIHBsYXllclxyXG4gICAgICAgIC8vIHNlZWsgYW5kIGRlc3Ryb3lcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGNvbnN0IHBhdGggPSBtYXBzLmZpbmRQYXRoKG1hcCwgbW9uc3RlclBvc2l0aW9uLCBwbGF5ZXJQb3NpdGlvbilcclxuICAgICAgICBpZiAocGF0aC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgLy8gcGFzc1xyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvbiA9IDBcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IHBhdGhbMF1cclxuICAgICAgICBpZiAobWFwLmlzUGFzc2FibGUocG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uIC09IDFcclxuICAgICAgICAgICAgdGhpcy5tYXAubW9uc3RlcnMuc2V0KHBvc2l0aW9uLCBtb25zdGVyKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZVJlc2l6ZSgpIHtcclxuICAgICAgICBjb25zdCBjYW52YXMgPSB0aGlzLmNhbnZhc1xyXG4gICAgICAgIGlmIChjYW52YXMud2lkdGggPT09IGNhbnZhcy5jbGllbnRXaWR0aCAmJiBjYW52YXMuaGVpZ2h0ID09PSBjYW52YXMuY2xpZW50SGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IGNhbnZhcy5jbGllbnRIZWlnaHRcclxuICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHkoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlSW5wdXQoKSB7XHJcbiAgICAgICAgY29uc3QgaW5wID0gdGhpcy5pbnBcclxuXHJcbiAgICAgICAgLy8gdGFyZ2V0XHJcbiAgICAgICAgaWYgKHRoaXMuY3Vyc29yUG9zaXRpb24gJiYgKGlucC5wcmVzc2VkKGlucHV0LktleS5FbnRlcikgfHwgaW5wLnByZXNzZWQoXCIgXCIpKSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZUN1cnNvclRhcmdldCgpXHJcbiAgICAgICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY3RybC1rZXkgY3Vyc29yIG1vdmVtZW50XHJcbiAgICAgICAgaWYgKHRoaXMuaGFuZGxlQ3Vyc29yS2V5Ym9hcmRNb3ZlbWVudCgpKSB7XHJcbiAgICAgICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaGFuZGxlUGxheWVyS2V5Ym9hcmRNb3ZlbWVudCgpKSB7XHJcbiAgICAgICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY2xpY2sgb24gb2JqZWN0XHJcbiAgICAgICAgaWYgKHRoaXMuaGFuZGxlQ2xpY2soKSkge1xyXG4gICAgICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlucC5mbHVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVDdXJzb3JLZXlib2FyZE1vdmVtZW50KCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGNvbnN0IGlucCA9IHRoaXMuaW5wXHJcbiAgICAgICAgaWYgKCFpbnAuaGVsZChpbnB1dC5LZXkuQ29udHJvbCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB7IHBvc2l0aW9uOiBwbGF5ZXJQb3NpdGlvbiwgdGhpbmc6IHBsYXllciB9ID0gdGhpcy5tYXAucGxheWVyXHJcblxyXG4gICAgICAgIGlmICghdGhpcy5jdXJzb3JQb3NpdGlvbikge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnNvclBvc2l0aW9uID0gcGxheWVyUG9zaXRpb24uY2xvbmUoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGlucC5wcmVzc2VkKFwid1wiKSB8fCBpbnAucHJlc3NlZChcIldcIikgfHwgaW5wLnByZXNzZWQoXCJBcnJvd1VwXCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3Vyc29yUG9zaXRpb24ueSAtPSAxXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLnByZXNzZWQoXCJzXCIpIHx8IGlucC5wcmVzc2VkKFwiU1wiKSB8fCBpbnAucHJlc3NlZChcIkFycm93RG93blwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnNvclBvc2l0aW9uLnkgKz0gMVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGlucC5wcmVzc2VkKFwiYVwiKSB8fCBpbnAucHJlc3NlZChcIkFcIikgfHwgaW5wLnByZXNzZWQoXCJBcnJvd0xlZnRcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJzb3JQb3NpdGlvbi54IC09IDFcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcImRcIikgfHwgaW5wLnByZXNzZWQoXCJEXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dSaWdodFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnNvclBvc2l0aW9uLnggKz0gMVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVDbGljaygpOiBib29sZWFuIHtcclxuICAgICAgICAvLyBkZXRlcm1pbmUgdGhlIG1hcCBjb29yZGluYXRlcyB0aGUgdXNlciBjbGlja2VkIG9uXHJcbiAgICAgICAgY29uc3QgaW5wID0gdGhpcy5pbnBcclxuXHJcbiAgICAgICAgaWYgKCFpbnAubW91c2VMZWZ0UmVsZWFzZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5oYW5kbGVUYXJnZXRDb21tYW5kQ2xpY2soKSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlRBUkdFVCBDT01NQU5EIVwiKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbXh5ID0gdGhpcy5jYW52YXNUb01hcFBvaW50KG5ldyBnZW8uUG9pbnQoaW5wLm1vdXNlWCwgaW5wLm1vdXNlWSkpXHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBjb25zdCB7IHBvc2l0aW9uOiBwbGF5ZXJQb3NpdGlvbiwgdGhpbmc6IHBsYXllciB9ID0gdGhpcy5tYXAucGxheWVyXHJcblxyXG4gICAgICAgIGNvbnN0IGNsaWNrRml4dHVyZSA9IG1hcC5maXh0dXJlQXQobXh5KVxyXG4gICAgICAgIGlmIChjbGlja0ZpeHR1cmUgJiYgY2xpY2tGaXh0dXJlIGluc3RhbmNlb2YgcmwuRG9vcikge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU9wZW4oY2xpY2tGaXh0dXJlKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH0gZWxzZSBpZiAoY2xpY2tGaXh0dXJlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBZb3Ugc2VlICR7Y2xpY2tGaXh0dXJlLm5hbWV9YClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNsaWNrTW9uc3RlciA9IG1hcC5tb25zdGVyQXQobXh5KVxyXG4gICAgICAgIC8vIGZpcnN0LCB0cnkgbWVsZWVcclxuICAgICAgICBpZiAoY2xpY2tNb25zdGVyKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRpc3QgPSBnZW8uY2FsY01hbmhhdHRlbkRpc3QocGxheWVyUG9zaXRpb24sIG14eSlcclxuICAgICAgICAgICAgY29uc3QgbWVsZWVXZWFwb24gPSBwbGF5ZXIubWVsZWVXZWFwb24gPz8gdGhpbmdzLmZpc3RzXHJcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlZFdlYXBvbiA9IHBsYXllci5yYW5nZWRXZWFwb24gPz8gdGhpbmdzLmZpc3RzXHJcblxyXG4gICAgICAgICAgICBpZiAoZGlzdCA8PSBtZWxlZVdlYXBvbi5yYW5nZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzUGxheWVyTWVsZWVBdHRhY2soY2xpY2tNb25zdGVyKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3QgPD0gcmFuZ2VkV2VhcG9uLnJhbmdlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NQbGF5ZXJSYW5nZWRBdHRhY2soY2xpY2tNb25zdGVyKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYFlvdSBzZWUgJHtjbGlja01vbnN0ZXIubmFtZX1gKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZHh5ID0gbXh5LnN1YlBvaW50KHBsYXllclBvc2l0aW9uKVxyXG4gICAgICAgIGNvbnN0IHNnbiA9IGR4eS5zaWduKClcclxuICAgICAgICBjb25zdCBhYnMgPSBkeHkuYWJzKClcclxuXHJcbiAgICAgICAgaWYgKGFicy54ID4gMCAmJiBhYnMueCA+PSBhYnMueSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1vdmUoc2duLnggPiAwID8gRGlyZWN0aW9uLkVhc3QgOiBEaXJlY3Rpb24uV2VzdClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChhYnMueSA+IDAgJiYgYWJzLnkgPiBhYnMueCkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1vdmUoc2duLnkgPiAwID8gRGlyZWN0aW9uLlNvdXRoIDogRGlyZWN0aW9uLk5vcnRoKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVQbGF5ZXJLZXlib2FyZE1vdmVtZW50KCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCBpbnAgPSB0aGlzLmlucFxyXG5cclxuICAgICAgICBpZiAoaW5wLnByZXNzZWQoXCJ3XCIpIHx8IGlucC5wcmVzc2VkKFwiV1wiKSB8fCBpbnAucHJlc3NlZChcIkFycm93VXBcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVNb3ZlKERpcmVjdGlvbi5Ob3J0aClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcInNcIikgfHwgaW5wLnByZXNzZWQoXCJTXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dEb3duXCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlTW92ZShEaXJlY3Rpb24uU291dGgpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLnByZXNzZWQoXCJhXCIpIHx8IGlucC5wcmVzc2VkKFwiQVwiKSB8fCBpbnAucHJlc3NlZChcIkFycm93TGVmdFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1vdmUoRGlyZWN0aW9uLldlc3QpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLnByZXNzZWQoXCJkXCIpIHx8IGlucC5wcmVzc2VkKFwiRFwiKSB8fCBpbnAucHJlc3NlZChcIkFycm93UmlnaHRcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVNb3ZlKERpcmVjdGlvbi5FYXN0KVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGlucC5wcmVzc2VkKFwiIFwiKSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhcIlBhc3NcIilcclxuICAgICAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5tYXAucGxheWVyLnRoaW5nXHJcbiAgICAgICAgICAgIHBsYXllci5hY3Rpb25SZXNlcnZlICs9IHBsYXllci5hY3Rpb25cclxuICAgICAgICAgICAgcGxheWVyLmFjdGlvbiA9IDBcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlT3Blbihkb29yOiBybC5GaXh0dXJlKSB7XHJcbiAgICAgICAgb3V0cHV0LmluZm8oYCR7ZG9vci5uYW1lfSBvcGVuZWRgKVxyXG4gICAgICAgIHRoaXMubWFwLmZpeHR1cmVzLmRlbGV0ZShkb29yKVxyXG4gICAgICAgIHRoaXMubWFwLnBsYXllci50aGluZy5hY3Rpb24gLT0gMVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlTW92ZShkaXI6IERpcmVjdGlvbikge1xyXG4gICAgICAgIC8vIGNsZWFyIGN1cnNvciBvbiBtb3ZlbWVudFxyXG4gICAgICAgIHRoaXMuY3Vyc29yUG9zaXRpb24gPSB1bmRlZmluZWRcclxuICAgICAgICBjb25zdCB7IHBvc2l0aW9uOiBwbGF5ZXJQb3NpdGlvbiwgdGhpbmc6IHBsYXllciB9ID0gdGhpcy5tYXAucGxheWVyXHJcblxyXG4gICAgICAgIGxldCBuZXdQb3NpdGlvbiA9IHBsYXllclBvc2l0aW9uLmFkZFBvaW50KGRpcmVjdGlvblZlY3RvcihkaXIpKVxyXG4gICAgICAgIGlmICghdGhpcy5tYXAuaW5Cb3VuZHMobmV3UG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBjb25zdCB0aWxlID0gbWFwLnRpbGVBdChuZXdQb3NpdGlvbilcclxuICAgICAgICBpZiAodGlsZSAmJiAhdGlsZS5wYXNzYWJsZSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgQmxvY2tlZCBieSAke3RpbGUubmFtZX1gKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG1vbnN0ZXIgPSBtYXAubW9uc3RlckF0KG5ld1Bvc2l0aW9uKVxyXG4gICAgICAgIGlmIChtb25zdGVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc1BsYXllck1lbGVlQXR0YWNrKG1vbnN0ZXIpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29udGFpbmVyID0gbWFwLmNvbnRhaW5lckF0KG5ld1Bvc2l0aW9uKVxyXG4gICAgICAgIGlmIChjb250YWluZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5jb250YWluZXJEaWFsb2cuc2hvdyhtYXAsIGNvbnRhaW5lcilcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmaXh0dXJlID0gbWFwLmZpeHR1cmVBdChuZXdQb3NpdGlvbilcclxuICAgICAgICBpZiAoZml4dHVyZSBpbnN0YW5jZW9mIHJsLkRvb3IpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVPcGVuKGZpeHR1cmUpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfSBlbHNlIGlmIChmaXh0dXJlICYmICFmaXh0dXJlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBDYW4ndCBtb3ZlIHRoYXQgd2F5LCBibG9ja2VkIGJ5ICR7Zml4dHVyZS5uYW1lfWApXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZXhpdCA9IG1hcC5leGl0QXQobmV3UG9zaXRpb24pXHJcbiAgICAgICAgaWYgKGV4aXQpIHtcclxuICAgICAgICAgICAgcGxheWVyLmFjdGlvbiAtPSAxXHJcbiAgICAgICAgICAgIG1hcC5wbGF5ZXIucG9zaXRpb24gPSBuZXdQb3NpdGlvblxyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZUV4aXQoZXhpdC5kaXJlY3Rpb24pXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWFwLnBsYXllci5wb3NpdGlvbiA9IG5ld1Bvc2l0aW9uXHJcbiAgICAgICAgcGxheWVyLmFjdGlvbiAtPSAxXHJcblxyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlQ3Vyc29yVGFyZ2V0KCkge1xyXG4gICAgICAgIGNvbnN0IGN1cnNvclBvc2l0aW9uID0gdGhpcy5jdXJzb3JQb3NpdGlvblxyXG4gICAgICAgIGlmICghY3Vyc29yUG9zaXRpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGNvbnN0IHRpbGUgPSBtYXAudGlsZUF0KGN1cnNvclBvc2l0aW9uKVxyXG5cclxuICAgICAgICBpZiAoIXRpbGUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oJ05vdGhpbmcgaGVyZScpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG1hcC52aXNpYmlsaXR5QXQoY3Vyc29yUG9zaXRpb24pICE9PSBtYXBzLlZpc2liaWxpdHkuVmlzaWJsZSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgVGFyZ2V0IG5vdCB2aXNpYmxlYClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB7IHBvc2l0aW9uOiBwbGF5ZXJQb3NpdGlvbiwgdGhpbmc6IHBsYXllciB9ID0gdGhpcy5tYXAucGxheWVyXHJcbiAgICAgICAgY29uc3QgZGlzdFRvVGFyZ2V0ID0gZ2VvLmNhbGNNYW5oYXR0ZW5EaXN0KHBsYXllclBvc2l0aW9uLCBjdXJzb3JQb3NpdGlvbilcclxuICAgICAgICBjb25zdCBtb25zdGVyID0gbWFwLm1vbnN0ZXJBdChjdXJzb3JQb3NpdGlvbilcclxuXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIgJiYgZGlzdFRvVGFyZ2V0IDw9IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5wcm9jZXNzUGxheWVyTWVsZWVBdHRhY2sobW9uc3RlcilcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobW9uc3RlciAmJiBkaXN0VG9UYXJnZXQgPiAxICYmIHBsYXllci5yYW5nZWRXZWFwb24pIHtcclxuICAgICAgICAgICAgdGhpcy5wcm9jZXNzUGxheWVyUmFuZ2VkQXR0YWNrKG1vbnN0ZXIpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29udGFpbmVyID0gbWFwLmNvbnRhaW5lckF0KGN1cnNvclBvc2l0aW9uKVxyXG4gICAgICAgIGlmIChjb250YWluZXIgJiYgZGlzdFRvVGFyZ2V0IDw9IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5jb250YWluZXJEaWFsb2cuc2hvdyhtYXAsIGNvbnRhaW5lcilcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmaXh0dXJlID0gbWFwLmZpeHR1cmVBdChjdXJzb3JQb3NpdGlvbilcclxuICAgICAgICBpZiAoZml4dHVyZSBpbnN0YW5jZW9mIHJsLkRvb3IgJiYgZGlzdFRvVGFyZ2V0IDw9IDEpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYCR7Zml4dHVyZS5uYW1lfSBvcGVuZWRgKVxyXG4gICAgICAgICAgICB0aGlzLm1hcC5maXh0dXJlcy5kZWxldGUoZml4dHVyZSlcclxuICAgICAgICAgICAgcGxheWVyLmFjdGlvbiAtPSAxXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbGFzdGx5IC0gcGVyZm9ybSBhIGxvb2tcclxuICAgICAgICBmb3IgKGNvbnN0IHRoIG9mIHRoaXMubWFwLmF0KGN1cnNvclBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke3RoLm5hbWV9YClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVUYXJnZXRDb21tYW5kQ2xpY2soKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmlucC5tb3VzZUxlZnRSZWxlYXNlZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnRhcmdldENvbW1hbmQgPT09IFRhcmdldENvbW1hbmQuTm9uZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGN4eSA9IG5ldyBnZW8uUG9pbnQodGhpcy5pbnAubW91c2VYLCB0aGlzLmlucC5tb3VzZVkpXHJcbiAgICAgICAgY29uc3QgbXh5ID0gdGhpcy5jYW52YXNUb01hcFBvaW50KGN4eSlcclxuXHJcbiAgICAgICAgaWYgKCFoYXNMaW5lT2ZTaWdodCh0aGlzLm1hcCwgdGhpcy5tYXAucGxheWVyLnBvc2l0aW9uLCBteHkpKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5lcnJvcihgQ2FuJ3Qgc2VlIWApXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzd2l0Y2ggKHRoaXMudGFyZ2V0Q29tbWFuZCkge1xyXG4gICAgICAgICAgICBjYXNlIFRhcmdldENvbW1hbmQuTG9vazoge1xyXG4gICAgICAgICAgICAgICAgLy8gc2hvdyB3aGF0IHVzZXIgY2xpY2tlZCBvblxyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB0aCBvZiB0aGlzLm1hcC5hdChteHkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LmluZm8oYFlvdSBzZWUgJHt0aC5uYW1lfWApXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIFRhcmdldENvbW1hbmQuQXR0YWNrOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBtb25zdGVyID0gdGhpcy5tYXAubW9uc3RlckF0KG14eSlcclxuICAgICAgICAgICAgICAgIGlmIChtb25zdGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzUGxheWVyTWVsZWVBdHRhY2sobW9uc3RlcilcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LmluZm8oXCJOb3RoaW5nIHRvIGF0dGFjayBoZXJlLlwiKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUYXJnZXRDb21tYW5kLlNob290OiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBtb25zdGVyID0gdGhpcy5tYXAubW9uc3RlckF0KG14eSlcclxuICAgICAgICAgICAgICAgIGlmIChtb25zdGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzUGxheWVyUmFuZ2VkQXR0YWNrKG1vbnN0ZXIpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5pbmZvKFwiTm90aGluZyB0byBzaG9vdCBoZXJlLlwiKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5Ob25lXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZVZpc2liaWxpdHkoKSB7XHJcbiAgICAgICAgLy8gdXBkYXRlIHZpc2liaWxpdHkgYXJvdW5kIHBsYXllclxyXG4gICAgICAgIC8vIGxpbWl0IHJhZGl1cyB0byB2aXNpYmxlIHZpZXdwb3J0IGFyZWFcclxuICAgICAgICBjb25zdCB2aWV3cG9ydExpZ2h0UmFkaXVzID0gTWF0aC5tYXgoTWF0aC5jZWlsKHRoaXMuY2FudmFzLndpZHRoIC8gdGhpcy50aWxlU2l6ZSksIE1hdGguY2VpbCh0aGlzLmNhbnZhcy5oZWlnaHQgLyB0aGlzLnRpbGVTaXplKSlcclxuICAgICAgICB0aGlzLm1hcC51cGRhdGVWaXNpYmxlKHZpZXdwb3J0TGlnaHRSYWRpdXMpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYWxjTWFwVmlld3BvcnQoKTogZ2VvLkFBQkIge1xyXG4gICAgICAgIGNvbnN0IGFhYmIgPSBuZXcgZ2VvLkFBQkIoXHJcbiAgICAgICAgICAgIHRoaXMuY2FudmFzVG9NYXBQb2ludChuZXcgZ2VvLlBvaW50KDAsIDApKSxcclxuICAgICAgICAgICAgdGhpcy5jYW52YXNUb01hcFBvaW50KG5ldyBnZW8uUG9pbnQodGhpcy5jYW52YXMud2lkdGggKyB0aGlzLnRpbGVTaXplLCB0aGlzLmNhbnZhcy5oZWlnaHQgKyB0aGlzLnRpbGVTaXplKSkpXHJcbiAgICAgICAgICAgIC5pbnRlcnNlY3Rpb24obmV3IGdlby5BQUJCKG5ldyBnZW8uUG9pbnQoMCwgMCksIG5ldyBnZW8uUG9pbnQodGhpcy5tYXAud2lkdGgsIHRoaXMubWFwLmhlaWdodCkpKVxyXG5cclxuICAgICAgICByZXR1cm4gYWFiYlxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FsY0xpZ2h0UmFkaXVzKCk6IG51bWJlciB7XHJcbiAgICAgICAgY29uc3Qgdmlld3BvcnRMaWdodFJhZGl1cyA9IE1hdGgubWF4KE1hdGguY2VpbCh0aGlzLmNhbnZhcy53aWR0aCAvIHRoaXMudGlsZVNpemUpLCBNYXRoLmNlaWwodGhpcy5jYW52YXMuaGVpZ2h0IC8gdGhpcy50aWxlU2l6ZSkpXHJcbiAgICAgICAgaWYgKHRoaXMubWFwLmxpZ2h0aW5nID09PSBtYXBzLkxpZ2h0aW5nLkFtYmllbnQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHZpZXdwb3J0TGlnaHRSYWRpdXNcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBNYXRoLm1pbih2aWV3cG9ydExpZ2h0UmFkaXVzLCB0aGlzLm1hcC5wbGF5ZXIudGhpbmcubGlnaHRSYWRpdXMpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkcmF3RnJhbWUoKSB7XHJcbiAgICAgICAgLy8gY2VudGVyIHRoZSBncmlkIGFyb3VuZCB0aGUgcGxheWVyZFxyXG4gICAgICAgIGNvbnN0IHZpZXdwb3J0QUFCQiA9IHRoaXMuY2FsY01hcFZpZXdwb3J0KClcclxuICAgICAgICBjb25zdCBvZmZzZXQgPSB0aGlzLmdldFNjcm9sbE9mZnNldCgpXHJcblxyXG4gICAgICAgIC8vIG5vdGUgLSBkcmF3aW5nIG9yZGVyIG1hdHRlcnMgLSBkcmF3IGZyb20gYm90dG9tIHRvIHRvcFxyXG4gICAgICAgIGlmICh0aGlzLnRhcmdldENvbW1hbmQgIT09IFRhcmdldENvbW1hbmQuTm9uZSkge1xyXG4gICAgICAgICAgICB0aGlzLmNhbnZhcy5zdHlsZS5jdXJzb3IgPSBcImNyb3NzaGFpclwiXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuY3Vyc29yID0gXCJcIlxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zaG9vdEJ1dHRvbi5kaXNhYmxlZCA9ICF0aGlzLm1hcC5wbGF5ZXIudGhpbmcucmFuZ2VkV2VhcG9uXHJcblxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgY29uc3QgdGlsZXMgPSBtYXAudGlsZXMud2l0aGluKHZpZXdwb3J0QUFCQilcclxuICAgICAgICBjb25zdCBmaXh0dXJlcyA9IG1hcC5maXh0dXJlcy53aXRoaW4odmlld3BvcnRBQUJCKVxyXG4gICAgICAgIGNvbnN0IGV4aXRzID0gbWFwLmV4aXRzLndpdGhpbih2aWV3cG9ydEFBQkIpXHJcbiAgICAgICAgY29uc3QgY29udGFpbmVycyA9IG1hcC5jb250YWluZXJzLndpdGhpbih2aWV3cG9ydEFBQkIpXHJcbiAgICAgICAgY29uc3QgbW9uc3RlcnMgPSBtYXAubW9uc3RlcnMud2l0aGluKHZpZXdwb3J0QUFCQilcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCB0aWxlIG9mIHRpbGVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgdGlsZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgZml4dHVyZSBvZiBmaXh0dXJlcykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIGZpeHR1cmUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgZXhpdHMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCBleGl0KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBjb250YWluZXIgb2YgY29udGFpbmVycykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIGNvbnRhaW5lcilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgY3JlYXR1cmUgb2YgbW9uc3RlcnMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCBjcmVhdHVyZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgdGhpcy5tYXAucGxheWVyKVxyXG4gICAgICAgIHRoaXMuZHJhd0hlYWx0aEJhcihvZmZzZXQsIHRoaXMubWFwLnBsYXllcilcclxuICAgICAgICB0aGlzLmRyYXdDdXJzb3Iob2Zmc2V0KVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmZsdXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyYXdUaGluZyhvZmZzZXQ6IGdlby5Qb2ludCwgcGxhY2VkVGhpbmc6IG1hcHMuUGxhY2VkPHJsLlRoaW5nPikge1xyXG4gICAgICAgIGNvbnN0IHsgcG9zaXRpb24sIHRoaW5nIH0gPSBwbGFjZWRUaGluZ1xyXG4gICAgICAgIGNvbnN0IHZpc2libGUgPSB0aGlzLm1hcC52aXNpYmlsaXR5QXQocG9zaXRpb24pXHJcbiAgICAgICAgY29uc3Qgc2VlbiA9IHRoaXMubWFwLnNlZW5BdChwb3NpdGlvbilcclxuICAgICAgICBjb25zdCBmb2cgPSAodmlzaWJsZSA9PT0gbWFwcy5WaXNpYmlsaXR5Lk5vbmUgfHwgdmlzaWJsZSA9PT0gbWFwcy5WaXNpYmlsaXR5LkRhcmspXHJcbiAgICAgICAgICAgICYmIHNlZW5cclxuICAgICAgICAgICAgJiYgKHRoaW5nIGluc3RhbmNlb2YgcmwuVGlsZSB8fCB0aGluZyBpbnN0YW5jZW9mIHJsLkZpeHR1cmUpXHJcblxyXG4gICAgICAgIGlmICgodmlzaWJsZSA9PT0gbWFwcy5WaXNpYmlsaXR5Lk5vbmUgfHwgdmlzaWJsZSA9PSBtYXBzLlZpc2liaWxpdHkuRGFyaykgJiYgIWZvZykge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbG9yID0gdGhpbmcuY29sb3IuY2xvbmUoKVxyXG4gICAgICAgIGlmIChmb2cpIHtcclxuICAgICAgICAgICAgY29sb3IuYSA9IC4yNVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmF3SW1hZ2Uob2Zmc2V0LCBwb3NpdGlvbiwgdGhpbmcuaW1hZ2UsIGNvbG9yKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd0N1cnNvcihvZmZzZXQ6IGdlby5Qb2ludCkge1xyXG4gICAgICAgIGlmICghdGhpcy5jdXJzb3JQb3NpdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZHJhd0ltYWdlKG9mZnNldCwgdGhpcy5jdXJzb3JQb3NpdGlvbiwgXCIuL2Fzc2V0cy9jdXJzb3IucG5nXCIsIGdmeC5Db2xvci5yZWQpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkcmF3SW1hZ2Uob2Zmc2V0OiBnZW8uUG9pbnQsIHBvc2l0aW9uOiBnZW8uUG9pbnQsIGltYWdlOiBzdHJpbmcsIGNvbG9yOiBnZnguQ29sb3IgPSBnZnguQ29sb3Iud2hpdGUpIHtcclxuICAgICAgICBjb25zdCBzcHJpdGVQb3NpdGlvbiA9IHBvc2l0aW9uLm11bFNjYWxhcih0aGlzLnRpbGVTaXplKS5hZGRQb2ludChvZmZzZXQpXHJcbiAgICAgICAgY29uc3QgbGF5ZXIgPSB0aGlzLmltYWdlTWFwLmdldChpbWFnZSlcclxuXHJcbiAgICAgICAgaWYgKGxheWVyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGltYWdlIG1hcHBpbmc6ICR7aW1hZ2V9YClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHNwcml0ZSA9IG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLFxyXG4gICAgICAgICAgICBjb2xvcixcclxuICAgICAgICAgICAgd2lkdGg6IHRoaXMudGlsZVNpemUsXHJcbiAgICAgICAgICAgIGhlaWdodDogdGhpcy50aWxlU2l6ZSxcclxuICAgICAgICAgICAgdGV4dHVyZTogdGhpcy50ZXh0dXJlLFxyXG4gICAgICAgICAgICBsYXllcjogbGF5ZXIsXHJcbiAgICAgICAgICAgIGZsYWdzOiBnZnguU3ByaXRlRmxhZ3MuQXJyYXlUZXh0dXJlXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3U3ByaXRlKHNwcml0ZSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyYXdIZWFsdGhCYXIob2Zmc2V0OiBnZW8uUG9pbnQsIHBsYWNlZENyZWF0dXJlOiBtYXBzLlBsYWNlZDxybC5DcmVhdHVyZT4pIHtcclxuICAgICAgICBjb25zdCB7IHBvc2l0aW9uLCB0aGluZzogY3JlYXR1cmUgfSA9IHBsYWNlZENyZWF0dXJlXHJcbiAgICAgICAgY29uc3QgaGVhbHRoID0gTWF0aC5tYXgoY3JlYXR1cmUuaGVhbHRoLCAwKVxyXG4gICAgICAgIGNvbnN0IGJvcmRlcldpZHRoID0gaGVhbHRoICogNCArIDJcclxuICAgICAgICBjb25zdCBpbnRlcmlvcldpZHRoID0gaGVhbHRoICogNFxyXG4gICAgICAgIGNvbnN0IHNwcml0ZVBvc2l0aW9uID0gcG9zaXRpb24ubXVsU2NhbGFyKHRoaXMudGlsZVNpemUpLmFkZFBvaW50KG9mZnNldCkuc3ViUG9pbnQobmV3IGdlby5Qb2ludCgwLCB0aGlzLnRpbGVTaXplIC8gMikpXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3U3ByaXRlKG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLFxyXG4gICAgICAgICAgICBjb2xvcjogZ2Z4LkNvbG9yLndoaXRlLFxyXG4gICAgICAgICAgICB3aWR0aDogYm9yZGVyV2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodDogOFxyXG4gICAgICAgIH0pKVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdTcHJpdGUobmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24uYWRkUG9pbnQobmV3IGdlby5Qb2ludCgxLCAxKSksXHJcbiAgICAgICAgICAgIGNvbG9yOiBnZnguQ29sb3IucmVkLFxyXG4gICAgICAgICAgICB3aWR0aDogaW50ZXJpb3JXaWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0OiA2XHJcbiAgICAgICAgfSkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoaWRlRGlhbG9ncygpIHtcclxuICAgICAgICB0aGlzLmludmVudG9yeURpYWxvZy5oaWRlKClcclxuICAgICAgICB0aGlzLnN0YXRzRGlhbG9nLmhpZGUoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IHRpbGVTaXplKCkge1xyXG4gICAgICAgIHJldHVybiBybC50aWxlU2l6ZSAqIHRoaXMuem9vbVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlS2V5RG93bihldjogS2V5Ym9hcmRFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IGtleSA9IGV2LmtleS50b1VwcGVyQ2FzZSgpXHJcblxyXG4gICAgICAgIHN3aXRjaCAoa2V5KSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJJXCI6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHdhc0hpZGRlbiA9IHRoaXMuaW52ZW50b3J5RGlhbG9nLmhpZGRlblxyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlRGlhbG9ncygpXHJcbiAgICAgICAgICAgICAgICBpZiAod2FzSGlkZGVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnZlbnRvcnlEaWFsb2cuc2hvdygpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIFwiWlwiOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB3YXNIaWRkZW4gPSB0aGlzLnN0YXRzRGlhbG9nLmhpZGRlblxyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlRGlhbG9ncygpXHJcbiAgICAgICAgICAgICAgICBpZiAod2FzSGlkZGVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0c0RpYWxvZy5zaG93KClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCJMXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLkxvb2tcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIFwiRU5URVJcIjpcclxuICAgICAgICAgICAgICAgIGlmIChldi5jdHJsS2V5ICYmIHRoaXMubWFwLnBsYXllci50aGluZy5yYW5nZWRXZWFwb24pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLlNob290XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuQXR0YWNrXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIkVTQ0FQRVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5Ob25lXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnNvclBvc2l0aW9uID0gdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIkxcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuTG9va1xyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCI9XCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnpvb20gPSBNYXRoLm1pbih0aGlzLnpvb20gKiAyLCAxNilcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eSgpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIi1cIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuem9vbSA9IE1hdGgubWF4KHRoaXMuem9vbSAvIDIsIC4xMjUpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHkoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzYXZlU3RhdGUoKSB7XHJcbiAgICAgICAgLy8gc2F2ZSB0aGUgY3VycmVudCBnYW1lIHN0YXRlXHJcbiAgICAgICAgdmFyIHN0YXRlOiBBcHBTYXZlU3RhdGUgPSB7XHJcbiAgICAgICAgICAgIHJuZzogdGhpcy5ybmcuc2F2ZSgpLFxyXG4gICAgICAgICAgICBmbG9vcjogdGhpcy5mbG9vcixcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGpzb25TdGF0ZSA9IEpTT04uc3RyaW5naWZ5KHN0YXRlKVxyXG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFNUT1JBR0VfS0VZLCBqc29uU3RhdGUpXHJcblxyXG4gICAgICAgIHRoaXMuc2F2ZU1hcCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzYXZlTWFwKCkge1xyXG4gICAgICAgIGNvbnN0IHN0YXRlID0gdGhpcy5tYXAuc2F2ZSgpXHJcbiAgICAgICAgY29uc3QganNvblN0YXRlID0gSlNPTi5zdHJpbmdpZnkoc3RhdGUpXHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oYCR7U1RPUkFHRV9LRVl9X01BUF8ke3RoaXMuZmxvb3J9YCwganNvblN0YXRlKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlRXhpdChkaXI6IHJsLkV4aXREaXJlY3Rpb24pIHtcclxuICAgICAgICBpZiAoZGlyID09IHJsLkV4aXREaXJlY3Rpb24uVXAgJiYgdGhpcy5mbG9vciA9PSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvcERpYWxvZy5zaG93KClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyByZW1vdmUgcGxheWVyIGZyb20gZmxvb3IsIHNhdmUgZmxvb3JcclxuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLm1hcC5wbGF5ZXIudGhpbmdcclxuICAgICAgICB0aGlzLm1hcC5wbGF5ZXJzLmRlbGV0ZShwbGF5ZXIpXHJcbiAgICAgICAgdGhpcy5zYXZlTWFwKClcclxuXHJcbiAgICAgICAgc3dpdGNoIChkaXIpIHtcclxuICAgICAgICAgICAgY2FzZSBybC5FeGl0RGlyZWN0aW9uLlVwOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5mbG9vciAtPSAxXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICBjYXNlIHJsLkV4aXREaXJlY3Rpb24uRG93bjpcclxuICAgICAgICAgICAgICAgIHRoaXMuZmxvb3IgKz0gMVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubWFwID0gbG9hZE1hcCh0aGlzLmZsb29yKSA/PyBnZW4uZ2VuZXJhdGVEdW5nZW9uTGV2ZWwodGhpcy5ybmcsIHRoaW5ncy5kYiwgdGhpcy5mbG9vcilcclxuICAgICAgICBjb25zdCBwbGFjZURpciA9IGRpciA9PT0gcmwuRXhpdERpcmVjdGlvbi5VcCA/IHJsLkV4aXREaXJlY3Rpb24uRG93biA6IHJsLkV4aXREaXJlY3Rpb24uVXBcclxuICAgICAgICBwbGFjZVBsYXllckF0RXhpdCh0aGlzLm1hcCwgcGxheWVyLCBwbGFjZURpcilcclxuICAgICAgICBjb25zdCBbdGV4dHVyZSwgaW1hZ2VNYXBdID0gYXdhaXQgbG9hZEltYWdlcyh0aGlzLnJlbmRlcmVyLCB0aGlzLm1hcClcclxuICAgICAgICB0aGlzLnRleHR1cmUgPSB0ZXh0dXJlXHJcbiAgICAgICAgdGhpcy5pbWFnZU1hcCA9IGltYWdlTWFwXHJcbiAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5KClcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgYXN5bmMgbG9hZChyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyKTogUHJvbWlzZTxBcHAgfCBudWxsPiB7XHJcbiAgICAgICAgY29uc3QganNvbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFNUT1JBR0VfS0VZKVxyXG4gICAgICAgIGlmICghanNvbikge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBKU09OLnBhcnNlKGpzb24pIGFzIEFwcFNhdmVTdGF0ZVxyXG4gICAgICAgIGNvbnN0IHJuZyA9IG5ldyByYW5kLlNGQzMyUk5HKC4uLnN0YXRlLnJuZylcclxuXHJcbiAgICAgICAgY29uc3QgbWFwID0gbG9hZE1hcChzdGF0ZS5mbG9vcilcclxuICAgICAgICBpZiAoIW1hcCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gbG9hZCBtYXAhXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBbdGV4dHVyZSwgaW1hZ2VNYXBdID0gYXdhaXQgbG9hZEltYWdlcyhyZW5kZXJlciwgbWFwKVxyXG4gICAgICAgIGNvbnN0IGFwcCA9IG5ldyBBcHAocm5nLCByZW5kZXJlciwgc3RhdGUuZmxvb3IsIG1hcCwgdGV4dHVyZSwgaW1hZ2VNYXApXHJcbiAgICAgICAgcmV0dXJuIGFwcFxyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgQXBwU2F2ZVN0YXRlIHtcclxuICAgIHJlYWRvbmx5IHJuZzogW251bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl1cclxuICAgIHJlYWRvbmx5IGZsb29yOiBudW1iZXJcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gbG9hZEltYWdlcyhyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBtYXA6IG1hcHMuTWFwKTogUHJvbWlzZTxbZ2Z4LlRleHR1cmUsIE1hcDxzdHJpbmcsIG51bWJlcj5dPiB7XHJcbiAgICAvLyBiYWtlIGFsbCAyNHgyNCB0aWxlIGltYWdlcyB0byBhIHNpbmdsZSBhcnJheSB0ZXh0dXJlXHJcbiAgICAvLyBzdG9yZSBtYXBwaW5nIGZyb20gaW1hZ2UgdXJsIHRvIGluZGV4XHJcbiAgICBjb25zdCBpbWFnZVVybHMgPSBpdGVyLndyYXAobWFwLnRoaW5ncygpKS5tYXAodGggPT4gdGguaW1hZ2UpLmZpbHRlcigpLmRpc3RpbmN0KCkudG9BcnJheSgpXHJcbiAgICBpbWFnZVVybHMucHVzaChcIi4vYXNzZXRzL2N1cnNvci5wbmdcIilcclxuXHJcbiAgICBjb25zdCBpbWFnZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KGltYWdlVXJscy5tYXAoKHVybCwgaSkgPT4gW3VybCwgaV0pKVxyXG4gICAgY29uc3QgaW1hZ2VzID0gYXdhaXQgUHJvbWlzZS5hbGwoaW1hZ2VVcmxzLm1hcCh1cmwgPT4gZG9tLmxvYWRJbWFnZSh1cmwpKSlcclxuICAgIGNvbnN0IHRleHR1cmUgPSByZW5kZXJlci5iYWtlVGV4dHVyZUFycmF5KHJsLnRpbGVTaXplLCBybC50aWxlU2l6ZSwgaW1hZ2VzKVxyXG5cclxuICAgIHJldHVybiBbdGV4dHVyZSwgaW1hZ2VNYXBdXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRNYXAoZmxvb3I6IG51bWJlcik6IG1hcHMuTWFwIHwgbnVsbCB7XHJcbiAgICBjb25zdCBqc29uID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oYCR7U1RPUkFHRV9LRVl9X01BUF8ke2Zsb29yfWApXHJcbiAgICBpZiAoIWpzb24pIHtcclxuICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHN0YXRlID0gSlNPTi5wYXJzZShqc29uKSBhcyBtYXBzLk1hcFNhdmVTdGF0ZVxyXG4gICAgY29uc3QgbWFwID0gbWFwcy5NYXAubG9hZCh0aGluZ3MuZGIsIHN0YXRlKVxyXG4gICAgcmV0dXJuIG1hcFxyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhclN0YXRlKCk6IHZvaWQge1xyXG4gICAgY29uc3Qga2V5cyA9IG5ldyBBcnJheTxzdHJpbmc+KClcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbG9jYWxTdG9yYWdlLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3Qga2V5ID0gbG9jYWxTdG9yYWdlLmtleShpKVxyXG4gICAgICAgIGlmIChrZXk/LnN0YXJ0c1dpdGgoU1RPUkFHRV9LRVkpKSB7XHJcbiAgICAgICAgICAgIGtleXMucHVzaChrZXkpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgayBvZiBrZXlzKSB7XHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oaylcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VQbGF5ZXJBdEV4aXQobWFwOiBtYXBzLk1hcCwgcGxheWVyOiBybC5QbGF5ZXIsIGRpcjogcmwuRXhpdERpcmVjdGlvbikge1xyXG4gICAgY29uc3QgZXhpdCA9IGl0ZXIuZmluZChtYXAuZXhpdHMsIHggPT4geC50aGluZy5kaXJlY3Rpb24gPT0gZGlyKVxyXG4gICAgaWYgKCFleGl0KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIHBsYWNlIHBsYXllciwgbm8gc3VpdGFibGUgZXhpdCB3YXMgZm91bmRcIilcclxuICAgIH1cclxuXHJcbiAgICAvLyAvLyBmaW5kIGFuIGVtcHR5IGNlbGwgbmVhciB0aGUgZXhpdFxyXG4gICAgLy8gY29uc3QgcGxheWVyUG9zaXRpb24gPSBpdGVyLmZpbmQobWFwcy52aXNpdE5laWdoYm9ycyhleGl0LnBvc2l0aW9uLCBtYXAud2lkdGgsIG1hcC5oZWlnaHQpLCB4ID0+IG1hcC5pc1Bhc3NhYmxlKHgpKVxyXG4gICAgLy8gaWYgKCFwbGF5ZXJQb3NpdGlvbikge1xyXG4gICAgLy8gICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBwbGFjZSBwbGF5ZXIsIG5vIHBhc3NhYmxlIHRpbGUgbmVhciBleGl0XCIpXHJcbiAgICAvLyB9XHJcblxyXG4gICAgbWFwLnBsYXllcnMuc2V0KGV4aXQucG9zaXRpb24sIHBsYXllcilcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgIGNvbnN0IGFwcCA9IGF3YWl0IEFwcC5jcmVhdGUoKVxyXG4gICAgYXBwLmV4ZWMoKVxyXG59XHJcblxyXG5pbml0KCkiXX0=