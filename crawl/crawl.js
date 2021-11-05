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
        this.player.gold += Math.floor(item.value / 2);
        console.log(`You sold ${item.name}.`);
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
        // failed to load app - create a new one
        // const state = null as AppSaveState | null
        const seed = rand.xmur3(new Date().toString());
        const rng = new rand.SFC32RNG(seed(), seed(), seed(), seed());
        // load current dungeon map, or generate one
        const player = things.player.clone();
        const map = await gen.generateDungeonLevel(rng, things.db, player, 1, rl.ExitDirection.Down);
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
                console.log("ESCAPE");
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
async function init() {
    const app = await App.create();
    app.exec();
}
init();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBQ2pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFFekMsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFBO0FBU25DLFNBQVMsZUFBZSxDQUFDLEdBQWM7SUFDbkMsUUFBUSxHQUFHLEVBQUU7UUFDVDtZQUNJLE9BQU8sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9CO1lBQ0ksT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlCO1lBQ0ksT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlCO1lBQ0ksT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7S0FDbEM7QUFDTCxDQUFDO0FBRUQsTUFBTSxNQUFNO0lBRVIsWUFBNEIsSUFBaUIsRUFB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R0FBRyxDQUFDLENBQUE7U0FDakI7S0FDSjtJQUVELEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxFQUFFO1FBQ2xCLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FDN0I7QUFDTCxDQUFDO0FBRUQsS0FBSyxVQUFVLElBQUk7SUFDZixNQUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUM5QixHQUFHLENBQUMsSUFBSSxFQUFFLENBQUE7QUFDZCxDQUFDO0FBRUQsSUFBSSxFQUFFLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBkb20gZnJvbSBcIi4uL3NoYXJlZC9kb20uanNcIlxyXG5pbXBvcnQgKiBhcyBpdGVyIGZyb20gXCIuLi9zaGFyZWQvaXRlci5qc1wiXHJcbmltcG9ydCAqIGFzIGdmeCBmcm9tIFwiLi9nZnguanNcIlxyXG5pbXBvcnQgKiBhcyBnZW4gZnJvbSBcIi4vZ2VuLmpzXCJcclxuaW1wb3J0ICogYXMgaW5wdXQgZnJvbSBcIi4uL3NoYXJlZC9pbnB1dC5qc1wiXHJcbmltcG9ydCAqIGFzIHJsIGZyb20gXCIuL3JsLmpzXCJcclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvMmQuanNcIlxyXG5pbXBvcnQgKiBhcyBvdXRwdXQgZnJvbSBcIi4vb3V0cHV0LmpzXCJcclxuaW1wb3J0ICogYXMgdGhpbmdzIGZyb20gXCIuL3RoaW5ncy5qc1wiXHJcbmltcG9ydCAqIGFzIG1hcHMgZnJvbSBcIi4vbWFwcy5qc1wiXHJcbmltcG9ydCAqIGFzIHJhbmQgZnJvbSBcIi4uL3NoYXJlZC9yYW5kLmpzXCJcclxuXHJcbmNvbnN0IFNUT1JBR0VfS0VZID0gXCJjcmF3bF9zdG9yYWdlXCJcclxuXHJcbmNvbnN0IGVudW0gRGlyZWN0aW9uIHtcclxuICAgIE5vcnRoLFxyXG4gICAgU291dGgsXHJcbiAgICBFYXN0LFxyXG4gICAgV2VzdFxyXG59XHJcblxyXG5mdW5jdGlvbiBkaXJlY3Rpb25WZWN0b3IoZGlyOiBEaXJlY3Rpb24pOiBnZW8uUG9pbnQge1xyXG4gICAgc3dpdGNoIChkaXIpIHtcclxuICAgICAgICBjYXNlIERpcmVjdGlvbi5Ob3J0aDpcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMCwgLTEpXHJcbiAgICAgICAgY2FzZSBEaXJlY3Rpb24uU291dGg6XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KDAsIDEpXHJcbiAgICAgICAgY2FzZSBEaXJlY3Rpb24uRWFzdDpcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMSwgMClcclxuICAgICAgICBjYXNlIERpcmVjdGlvbi5XZXN0OlxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgtMSwgMClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbW9kYWxCYWNrZ3JvdW5kID0gZG9tLmJ5SWQoXCJtb2RhbEJhY2tncm91bmRcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBlbGVtOiBIVE1MRWxlbWVudCwgcHJpdmF0ZSByZWFkb25seSBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7IH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIHRoaXMubW9kYWxCYWNrZ3JvdW5kLmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5lbGVtLmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5lbGVtLmZvY3VzKClcclxuICAgIH1cclxuXHJcbiAgICBoaWRlKCkge1xyXG4gICAgICAgIHRoaXMubW9kYWxCYWNrZ3JvdW5kLmhpZGRlbiA9IHRydWVcclxuICAgICAgICB0aGlzLmVsZW0uaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuY2FudmFzLmZvY3VzKClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgaGlkZGVuKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmVsZW0uaGlkZGVuXHJcbiAgICB9XHJcblxyXG4gICAgdG9nZ2xlKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmVsZW0uaGlkZGVuKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvdygpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFN0YXRzRGlhbG9nIGV4dGVuZHMgRGlhbG9nIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgb3BlbkJ1dHRvbiA9IGRvbS5ieUlkKFwic3RhdHNCdXR0b25cIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2xvc2VCdXR0b24gPSBkb20uYnlJZChcInN0YXRzQ2xvc2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyLCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgc3VwZXIoZG9tLmJ5SWQoXCJzdGF0c0RpYWxvZ1wiKSwgY2FudmFzKVxyXG5cclxuICAgICAgICB0aGlzLm9wZW5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMudG9nZ2xlKCkpXHJcbiAgICAgICAgdGhpcy5jbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5oaWRlKCkpXHJcbiAgICAgICAgdGhpcy5lbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGV2ID0+IHtcclxuICAgICAgICAgICAgY29uc3Qga2V5ID0gZXYua2V5LnRvVXBwZXJDYXNlKClcclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFU0NBUEVcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLnBsYXllclxyXG4gICAgICAgIGNvbnN0IGhlYWx0aFNwYW4gPSBkb20uYnlJZChcInN0YXRzSGVhbHRoXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IHN0cmVuZ3RoU3BhbiA9IGRvbS5ieUlkKFwic3RhdHNTdHJlbmd0aFwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBhZ2lsaXR5U3BhbiA9IGRvbS5ieUlkKFwic3RhdHNBZ2lsaXR5XCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGludGVsbGlnZW5jZVNwYW4gPSBkb20uYnlJZChcInN0YXRzSW50ZWxsaWdlbmNlXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGF0dGFja1NwYW4gPSBkb20uYnlJZChcInN0YXRzQXR0YWNrXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGRhbWFnZVNwYW4gPSBkb20uYnlJZChcInN0YXRzRGFtYWdlXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGRlZmVuc2VTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0RlZmVuc2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgbGV2ZWxTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0xldmVsXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGV4cGVyaWVuY2VTcGFuID0gZG9tLmJ5SWQoXCJzdGF0c0V4cGVyaWVuY2VcIikgYXMgSFRNTFNwYW5FbGVtZW50XHJcbiAgICAgICAgY29uc3QgZ29sZFNwYW4gPSBkb20uYnlJZChcInN0YXRzR29sZFwiKSBhcyBIVE1MU3BhbkVsZW1lbnRcclxuICAgICAgICBjb25zdCBleHBlcmllbmNlUmVxdWlyZW1lbnQgPSBybC5nZXRFeHBlcmllbmNlUmVxdWlyZW1lbnQocGxheWVyLmxldmVsICsgMSlcclxuXHJcbiAgICAgICAgaGVhbHRoU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5oZWFsdGh9IC8gJHtwbGF5ZXIubWF4SGVhbHRofWBcclxuICAgICAgICBzdHJlbmd0aFNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuc3RyZW5ndGh9YFxyXG4gICAgICAgIGFnaWxpdHlTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmFnaWxpdHl9YFxyXG4gICAgICAgIGludGVsbGlnZW5jZVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuaW50ZWxsaWdlbmNlfWBcclxuICAgICAgICBhdHRhY2tTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLm1lbGVlQXR0YWNrfSAvICR7cGxheWVyLnJhbmdlZFdlYXBvbiA/IHBsYXllci5yYW5nZWRBdHRhY2sgOiBcIk5BXCJ9YFxyXG4gICAgICAgIGRhbWFnZVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIubWVsZWVEYW1hZ2V9IC8gJHtwbGF5ZXIucmFuZ2VkRGFtYWdlID8gcGxheWVyLnJhbmdlZERhbWFnZSA6IFwiTkFcIn1gXHJcbiAgICAgICAgZGVmZW5zZVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuZGVmZW5zZX1gXHJcbiAgICAgICAgYWdpbGl0eVNwYW4udGV4dENvbnRlbnQgPSBgJHtwbGF5ZXIuYWdpbGl0eX1gXHJcbiAgICAgICAgbGV2ZWxTcGFuLnRleHRDb250ZW50ID0gYCR7cGxheWVyLmxldmVsfWBcclxuICAgICAgICBleHBlcmllbmNlU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5leHBlcmllbmNlfSAvICR7ZXhwZXJpZW5jZVJlcXVpcmVtZW50fWBcclxuICAgICAgICBnb2xkU3Bhbi50ZXh0Q29udGVudCA9IGAke3BsYXllci5nb2xkfWBcclxuXHJcbiAgICAgICAgc3VwZXIuc2hvdygpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEludmVudG9yeURpYWxvZyBleHRlbmRzIERpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wZW5CdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeUJ1dHRvblwiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbmZvRGl2ID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlJbmZvXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVtcHR5RGl2ID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlFbXB0eVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0YWJsZSA9IGRvbS5ieUlkKFwiaW52ZW50b3J5VGFibGVcIikgYXMgSFRNTFRhYmxlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcImludmVudG9yeUl0ZW1UZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG5leHRQYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJpbnZlbnRvcnlOZXh0UGFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwcmV2UGFnZUJ1dHRvbiA9IGRvbS5ieUlkKFwiaW52ZW50b3J5UHJldlBhZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2xvc2VCdXR0b24gPSBkb20uYnlJZChcImludmVudG9yeUNsb3NlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhZ2VTaXplOiBudW1iZXIgPSA5XHJcbiAgICBwcml2YXRlIHBhZ2VJbmRleDogbnVtYmVyID0gMFxyXG4gICAgcHJpdmF0ZSBzZWxlY3RlZEluZGV4OiBudW1iZXIgPSAtMVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXIsIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICBzdXBlcihkb20uYnlJZChcImludmVudG9yeURpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgICAgIHRoaXMub3BlbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy50b2dnbGUoKSlcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuXHJcbiAgICAgICAgdGhpcy5uZXh0UGFnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnBhZ2VJbmRleCsrXHJcbiAgICAgICAgICAgIHRoaXMucGFnZUluZGV4ID0gTWF0aC5taW4odGhpcy5wYWdlSW5kZXgsIE1hdGguY2VpbCh0aGlzLnBsYXllci5pbnZlbnRvcnkubGVuZ3RoIC8gdGhpcy5wYWdlU2l6ZSkpXHJcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5wcmV2UGFnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnBhZ2VJbmRleC0tXHJcbiAgICAgICAgICAgIHRoaXMucGFnZUluZGV4ID0gTWF0aC5tYXgodGhpcy5wYWdlSW5kZXgsIDApXHJcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5lbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGV2ID0+IHtcclxuICAgICAgICAgICAgY29uc3Qga2V5ID0gZXYua2V5LnRvVXBwZXJDYXNlKClcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBwYXJzZUludChldi5rZXkpXHJcblxyXG4gICAgICAgICAgICBpZiAoaW5kZXggJiYgaW5kZXggPiAwICYmIGluZGV4IDw9IDkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IGluZGV4IC0gMVxyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJVXCIgJiYgdGhpcy5zZWxlY3RlZEluZGV4ID49IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudXNlKHRoaXMuc2VsZWN0ZWRJbmRleClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFXCIgJiYgdGhpcy5zZWxlY3RlZEluZGV4ID49IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXF1aXAodGhpcy5zZWxlY3RlZEluZGV4KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlJcIiAmJiB0aGlzLnNlbGVjdGVkSW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUodGhpcy5zZWxlY3RlZEluZGV4KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkRcIiAmJiB0aGlzLnNlbGVjdGVkSW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kcm9wKHRoaXMuc2VsZWN0ZWRJbmRleClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJBUlJPV0RPV05cIiB8fCBrZXkgPT09IFwiU1wiKSB7XHJcbiAgICAgICAgICAgICAgICArK3RoaXMuc2VsZWN0ZWRJbmRleFxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5taW4odGhpcy5zZWxlY3RlZEluZGV4LCA4KVxyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJBUlJPV1VQXCIgfHwga2V5ID09PSBcIldcIikge1xyXG4gICAgICAgICAgICAgICAgLS10aGlzLnNlbGVjdGVkSW5kZXhcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWF4KHRoaXMuc2VsZWN0ZWRJbmRleCwgLTEpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIkVTQ0FQRVwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKHRoaXMuZWxlbSwgXCJjbGlja1wiLCBcIi5pbnZlbnRvcnktdXNlLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgZXYuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmdldFJvd0luZGV4KGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudClcclxuICAgICAgICAgICAgdGhpcy51c2UoaW5kZXgpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKHRoaXMuZWxlbSwgXCJjbGlja1wiLCBcIi5pbnZlbnRvcnktZHJvcC1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGV2LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5nZXRSb3dJbmRleChldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpXHJcbiAgICAgICAgICAgIHRoaXMuZHJvcChpbmRleClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5lbGVtLCBcImNsaWNrXCIsIFwiLmludmVudG9yeS1lcXVpcC1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGV2LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5nZXRSb3dJbmRleChldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpXHJcbiAgICAgICAgICAgIHRoaXMuZXF1aXAoaW5kZXgpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKHRoaXMuZWxlbSwgXCJjbGlja1wiLCBcIi5pbnZlbnRvcnktcmVtb3ZlLWJ1dHRvblwiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgZXYuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmdldFJvd0luZGV4KGV2LnRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudClcclxuICAgICAgICAgICAgdGhpcy5yZW1vdmUoaW5kZXgpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKHRoaXMuZWxlbSwgXCJjbGlja1wiLCBcIi5pdGVtLXJvd1wiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qgcm93ID0gKGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdChcIi5pdGVtLXJvd1wiKVxyXG4gICAgICAgICAgICBpZiAocm93KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdChyb3cgYXMgSFRNTFRhYmxlUm93RWxlbWVudClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgICAgIHN1cGVyLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIHJlZnJlc2goKSB7XHJcbiAgICAgICAgY29uc3QgdGJvZHkgPSB0aGlzLnRhYmxlLnRCb2RpZXNbMF1cclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGJvZHkpXHJcblxyXG4gICAgICAgIGlmICh0aGlzLnBsYXllci5pbnZlbnRvcnkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW1wdHlEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICAgICAgdGhpcy5pbmZvRGl2LmhpZGRlbiA9IHRydWVcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmVtcHR5RGl2LmhpZGRlbiA9IHRydWVcclxuICAgICAgICAgICAgdGhpcy5pbmZvRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBwYWdlQ291bnQgPSBNYXRoLmNlaWwodGhpcy5wbGF5ZXIuaW52ZW50b3J5Lmxlbmd0aCAvIHRoaXMucGFnZVNpemUpXHJcbiAgICAgICAgdGhpcy5wYWdlSW5kZXggPSBNYXRoLm1pbihNYXRoLm1heCgwLCB0aGlzLnBhZ2VJbmRleCksIHBhZ2VDb3VudCAtIDEpXHJcbiAgICAgICAgdGhpcy5wcmV2UGFnZUJ1dHRvbi5kaXNhYmxlZCA9IHRoaXMucGFnZUluZGV4IDw9IDBcclxuICAgICAgICB0aGlzLm5leHRQYWdlQnV0dG9uLmRpc2FibGVkID0gdGhpcy5wYWdlSW5kZXggPj0gcGFnZUNvdW50IC0gMVxyXG5cclxuICAgICAgICB0aGlzLmluZm9EaXYudGV4dENvbnRlbnQgPSBgUGFnZSAke3RoaXMucGFnZUluZGV4ICsgMX0gb2YgJHtwYWdlQ291bnR9YFxyXG5cclxuICAgICAgICBjb25zdCBpdGVtcyA9IGdldFNvcnRlZEl0ZW1zUGFnZSh0aGlzLnBsYXllci5pbnZlbnRvcnksIHRoaXMucGFnZUluZGV4LCB0aGlzLnBhZ2VTaXplKVxyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWluKHRoaXMuc2VsZWN0ZWRJbmRleCwgaXRlbXMubGVuZ3RoIC0gMSlcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gaXRlbXNbaV1cclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0aGlzLml0ZW1UZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHRyID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLml0ZW0tcm93XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1JbmRleFRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0taW5kZXhcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLW5hbWVcIilcclxuICAgICAgICAgICAgY29uc3QgZXF1aXBCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LWVxdWlwLWJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCByZW1vdmVCdXR0b24gPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaW52ZW50b3J5LXJlbW92ZS1idXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3QgdXNlQnV0dG9uID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLmludmVudG9yeS11c2UtYnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBpdGVtIGluc3RhbmNlb2YgcmwuTGlnaHRTb3VyY2UgPyBgJHtpdGVtLm5hbWV9ICgke2l0ZW0uZHVyYXRpb259KWAgOiBpdGVtLm5hbWVcclxuXHJcbiAgICAgICAgICAgIGl0ZW1JbmRleFRkLnRleHRDb250ZW50ID0gKGkgKyAxKS50b1N0cmluZygpXHJcbiAgICAgICAgICAgIGl0ZW1OYW1lVGQudGV4dENvbnRlbnQgPSBuYW1lXHJcblxyXG4gICAgICAgICAgICBpZiAoIShpdGVtIGluc3RhbmNlb2YgcmwuVXNhYmxlKSkge1xyXG4gICAgICAgICAgICAgICAgdXNlQnV0dG9uLnJlbW92ZSgpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCFybC5pc0VxdWlwcGFibGUoaXRlbSkgfHwgdGhpcy5wbGF5ZXIuaXNFcXVpcHBlZChpdGVtKSkge1xyXG4gICAgICAgICAgICAgICAgZXF1aXBCdXR0b24ucmVtb3ZlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCF0aGlzLnBsYXllci5pc0VxdWlwcGVkKGl0ZW0pKSB7XHJcbiAgICAgICAgICAgICAgICByZW1vdmVCdXR0b24ucmVtb3ZlKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGkgPT09IHRoaXMuc2VsZWN0ZWRJbmRleCkge1xyXG4gICAgICAgICAgICAgICAgdHIuY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNlbGVjdChzZWxlY3RlZFJvdzogSFRNTFRhYmxlUm93RWxlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IHJvd3MgPSBBcnJheS5mcm9tKHRoaXMuZWxlbS5xdWVyeVNlbGVjdG9yQWxsKFwiLml0ZW0tcm93XCIpKVxyXG4gICAgICAgIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcclxuICAgICAgICAgICAgcm93LmNsYXNzTGlzdC5yZW1vdmUoXCJzZWxlY3RlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2VsZWN0ZWRSb3cuY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRSb3dJbmRleChlbGVtOiBIVE1MQnV0dG9uRWxlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IGluZGV4ID0gZG9tLmdldEVsZW1lbnRJbmRleChlbGVtLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudClcclxuICAgICAgICByZXR1cm4gaW5kZXhcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVzZShpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaSA9IHRoaXMucGFnZUluZGV4ICogdGhpcy5wYWdlU2l6ZSArIGluZGV4XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IGdldFNvcnRlZEl0ZW1zKHRoaXMucGxheWVyLmludmVudG9yeSlbaV1cclxuICAgICAgICBpZiAoIShpdGVtIGluc3RhbmNlb2YgcmwuVXNhYmxlKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVzZUl0ZW0odGhpcy5wbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyb3AoaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGkgPSB0aGlzLnBhZ2VJbmRleCAqIHRoaXMucGFnZVNpemUgKyBpbmRleFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLnBsYXllci5pbnZlbnRvcnkpW2ldXHJcbiAgICAgICAgZHJvcEl0ZW0odGhpcy5wbGF5ZXIsIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGVxdWlwKGluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBpID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplICsgaW5kZXhcclxuICAgICAgICBjb25zdCBpdGVtID0gZ2V0U29ydGVkSXRlbXModGhpcy5wbGF5ZXIuaW52ZW50b3J5KVtpXVxyXG4gICAgICAgIGlmICghcmwuaXNFcXVpcHBhYmxlKGl0ZW0pKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXF1aXBJdGVtKHRoaXMucGxheWVyLCBpdGVtKVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZW1vdmUoaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGkgPSB0aGlzLnBhZ2VJbmRleCAqIHRoaXMucGFnZVNpemUgKyBpbmRleFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLnBsYXllci5pbnZlbnRvcnkpW2ldXHJcbiAgICAgICAgaWYgKCFybC5pc0VxdWlwcGFibGUoaXRlbSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZW1vdmVJdGVtKHRoaXMucGxheWVyLCBpdGVtKVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIENvbnRhaW5lckRpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpYWxvZzogRGlhbG9nXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG5hbWVTcGFuID0gZG9tLmJ5SWQoXCJjb250YWluZXJOYW1lXCIpIGFzIEhUTUxTcGFuRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbG9zZUJ1dHRvbiA9IGRvbS5ieUlkKFwiY29udGFpbmVyQ2xvc2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdGFrZUFsbEJ1dHRvbiA9IGRvbS5ieUlkKFwiY29udGFpbmVyVGFrZUFsbEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXJUYWJsZSA9IGRvbS5ieUlkKFwiY29udGFpbmVyVGFibGVcIikgYXMgSFRNTFRhYmxlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXJJdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcImNvbnRhaW5lckl0ZW1UZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwcml2YXRlIG1hcDogbWFwcy5NYXAgfCBudWxsID0gbnVsbFxyXG4gICAgcHJpdmF0ZSBjb250YWluZXI6IHJsLkNvbnRhaW5lciB8IG51bGwgPSBudWxsXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IERpYWxvZyhkb20uYnlJZChcImNvbnRhaW5lckRpYWxvZ1wiKSwgY2FudmFzKVxyXG4gICAgICAgIHRoaXMucGxheWVyID0gcGxheWVyXHJcbiAgICAgICAgdGhpcy5jbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5oaWRlKCkpXHJcbiAgICAgICAgdGhpcy50YWtlQWxsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnRha2VBbGwoKSlcclxuICAgICAgICBjb25zdCBlbGVtID0gdGhpcy5kaWFsb2cuZWxlbVxyXG5cclxuICAgICAgICBkb20uZGVsZWdhdGUoZWxlbSwgXCJjbGlja1wiLCBcIi5jb250YWluZXItdGFrZS1idXR0b25cIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBidG4gPSBldi50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3Qgcm93ID0gYnRuLmNsb3Nlc3QoXCIuaXRlbS1yb3dcIikgYXMgSFRNTFRhYmxlUm93RWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KHJvdylcclxuICAgICAgICAgICAgdGhpcy50YWtlKGlkeClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qga2V5ID0gZXYua2V5LnRvVXBwZXJDYXNlKClcclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJDXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiQVwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRha2VBbGwoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHBhcnNlSW50KGV2LmtleSlcclxuICAgICAgICAgICAgaWYgKGluZGV4ICYmIGluZGV4ID4gMCAmJiBpbmRleCA8PSA5KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRha2UoaW5kZXggLSAxKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KG1hcDogbWFwcy5NYXAsIGNvbnRhaW5lcjogcmwuQ29udGFpbmVyKSB7XHJcbiAgICAgICAgdGhpcy5tYXAgPSBtYXBcclxuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IGNvbnRhaW5lclxyXG4gICAgICAgIHRoaXMubmFtZVNwYW4udGV4dENvbnRlbnQgPSB0aGlzLmNvbnRhaW5lci5uYW1lXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB0aGlzLmRpYWxvZy5zaG93KClcclxuICAgIH1cclxuXHJcbiAgICBoaWRlKCkge1xyXG4gICAgICAgIGlmICh0aGlzLm1hcCAmJiB0aGlzLmNvbnRhaW5lciAmJiB0aGlzLmNvbnRhaW5lci5pdGVtcy5zaXplID09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5tYXAuY29udGFpbmVycy5kZWxldGUodGhpcy5jb250YWluZXIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IG51bGxcclxuICAgICAgICB0aGlzLmRpYWxvZy5oaWRlKClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgaGlkZGVuKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRpYWxvZy5oaWRkZW5cclxuICAgIH1cclxuXHJcbiAgICByZWZyZXNoKCkge1xyXG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy5jb250YWluZXJUYWJsZS50Qm9kaWVzWzBdXHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRib2R5KVxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaXRlbXMgPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLmNvbnRhaW5lci5pdGVtcylcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBpdGVtc1tpXVxyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMuY29udGFpbmVySXRlbVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgdHIgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaXRlbS1yb3dcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbUluZGV4VGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1pbmRleFwiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtTmFtZVRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0tbmFtZVwiKVxyXG4gICAgICAgICAgICBpdGVtSW5kZXhUZC50ZXh0Q29udGVudCA9IGAke2kgKyAxfWBcclxuICAgICAgICAgICAgaXRlbU5hbWVUZC50ZXh0Q29udGVudCA9IGl0ZW0ubmFtZVxyXG4gICAgICAgICAgICB0Ym9keS5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGFrZShpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRTb3J0ZWRJdGVtcyh0aGlzLmNvbnRhaW5lci5pdGVtcylbaW5kZXhdXHJcbiAgICAgICAgaWYgKCFpdGVtKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuaXRlbXMuZGVsZXRlKGl0ZW0pXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIuaW52ZW50b3J5LnB1c2goaXRlbSlcclxuXHJcbiAgICAgICAgLy8gaGlkZSBpZiB0aGlzIHdhcyB0aGUgbGFzdCBpdGVtXHJcbiAgICAgICAgaWYgKHRoaXMuY29udGFpbmVyLml0ZW1zLnNpemUgPT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRha2VBbGwoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLmNvbnRhaW5lci5pdGVtcykge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5pdGVtcy5kZWxldGUoaXRlbSlcclxuICAgICAgICAgICAgdGhpcy5wbGF5ZXIuaW52ZW50b3J5LnB1c2goaXRlbSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIERlZmVhdERpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRyeUFnYWluQnV0dG9uID0gZG9tLmJ5SWQoXCJ0cnlBZ2FpbkJ1dHRvblwiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBkaWFsb2c6IERpYWxvZ1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICB0aGlzLmRpYWxvZyA9IG5ldyBEaWFsb2coZG9tLmJ5SWQoXCJkZWZlYXREaWFsb2dcIiksIGNhbnZhcylcclxuICAgICAgICB0aGlzLnRyeUFnYWluQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnRyeUFnYWluKCkpXHJcbiAgICAgICAgdGhpcy5kaWFsb2cuZWxlbS5hZGRFdmVudExpc3RlbmVyKFwia2V5cHJlc3NcIiwgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGV2LmtleS50b1VwcGVyQ2FzZSgpXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiVFwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRyeUFnYWluKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJFTlRFUlwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRyeUFnYWluKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICB0aGlzLmRpYWxvZy5zaG93KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHRyeUFnYWluKCkge1xyXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBMZXZlbERpYWxvZyBleHRlbmRzIERpYWxvZyB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxldmVsU3RyZW5ndGhSb3cgPSBkb20uYnlJZChcImxldmVsU3RyZW5ndGhSb3dcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWxJbnRlbGxpZ2VuY2VSb3cgPSBkb20uYnlJZChcImxldmVsSW50ZWxsaWdlbmNlUm93XCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxldmVsQWdpbGl0eVJvdyA9IGRvbS5ieUlkKFwibGV2ZWxBZ2lsaXR5Um93XCIpXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbGF5ZXI6IHJsLlBsYXllciwgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHN1cGVyKGRvbS5ieUlkKFwibGV2ZWxEaWFsb2dcIiksIGNhbnZhcylcclxuXHJcbiAgICAgICAgdGhpcy5sZXZlbFN0cmVuZ3RoUm93LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmxldmVsU3RyZW50aCgpKVxyXG4gICAgICAgIHRoaXMubGV2ZWxJbnRlbGxpZ2VuY2VSb3cuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMubGV2ZWxJbnRlbGxpZ2VuY2UoKSlcclxuICAgICAgICB0aGlzLmxldmVsQWdpbGl0eVJvdy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5sZXZlbEFnaWxpdHkoKSlcclxuXHJcbiAgICAgICAgdGhpcy5lbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHBhcnNlSW50KGV2LmtleSlcclxuXHJcbiAgICAgICAgICAgIGlmIChpbmRleCA9PSAxIHx8IGtleSA9PSBcIlNcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sZXZlbFN0cmVudGgoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoaW5kZXggPT0gMiB8fCBrZXkgPT0gXCJJXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGV2ZWxJbnRlbGxpZ2VuY2UoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoaW5kZXggPT0gMyB8fCBrZXkgPT0gXCJBXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGV2ZWxBZ2lsaXR5KClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBsZXZlbFN0cmVudGgoKSB7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXIuYmFzZVN0cmVuZ3RoKytcclxuICAgICAgICB0aGlzLmhpZGUoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbGV2ZWxJbnRlbGxpZ2VuY2UoKSB7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXIuYmFzZUludGVsbGlnZW5jZSsrXHJcbiAgICAgICAgdGhpcy5oaWRlKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGxldmVsQWdpbGl0eSgpIHtcclxuICAgICAgICB0aGlzLnBsYXllci5iYXNlQWdpbGl0eSsrXHJcbiAgICAgICAgdGhpcy5oaWRlKClcclxuICAgIH1cclxufVxyXG5cclxuZW51bSBTaG9wRGlhbG9nTW9kZSB7XHJcbiAgICBCdXksXHJcbiAgICBTZWxsXHJcbn1cclxuXHJcbmNsYXNzIFNob3BEaWFsb2cge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBkaWFsb2c6IERpYWxvZ1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBnb2xkU3BhbiA9IGRvbS5ieUlkKFwic2hvcEdvbGRTcGFuXCIpIGFzIEhUTUxTcGFuRWxlbWVudDtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2xvc2VCdXR0b24gPSBkb20uYnlJZChcInNob3BFeGl0QnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGJ1eUJ1dHRvbiA9IGRvbS5ieUlkKFwic2hvcEJ1eUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzZWxsQnV0dG9uID0gZG9tLmJ5SWQoXCJzaG9wU2VsbEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBuZXh0UGFnZUJ1dHRvbiA9IGRvbS5ieUlkKFwic2hvcE5leHRQYWdlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHByZXZQYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJzaG9wUHJldlBhZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2hvcFRhYmxlID0gZG9tLmJ5SWQoXCJzaG9wVGFibGVcIikgYXMgSFRNTFRhYmxlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzaG9wQnV5SXRlbVRlbXBsYXRlID0gZG9tLmJ5SWQoXCJzaG9wQnV5SXRlbVRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2hvcFNlbGxJdGVtVGVtcGxhdGUgPSBkb20uYnlJZChcInNob3BTZWxsSXRlbVRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHByaXZhdGUgbW9kZTogU2hvcERpYWxvZ01vZGUgPSBTaG9wRGlhbG9nTW9kZS5CdXlcclxuICAgIHByaXZhdGUgaXRlbXM6IHJsLkl0ZW1bXSA9IFtdXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhZ2VTaXplOiBudW1iZXIgPSA5XHJcbiAgICBwcml2YXRlIHBhZ2VJbmRleDogbnVtYmVyID0gMFxyXG4gICAgcHJpdmF0ZSBzZWxlY3RlZEluZGV4OiBudW1iZXIgPSAtMVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXIsIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICB0aGlzLmRpYWxvZyA9IG5ldyBEaWFsb2coZG9tLmJ5SWQoXCJzaG9wRGlhbG9nXCIpLCBjYW52YXMpXHJcbiAgICAgICAgdGhpcy5wbGF5ZXIgPSBwbGF5ZXJcclxuICAgICAgICB0aGlzLmJ1eUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5zZXRNb2RlKFNob3BEaWFsb2dNb2RlLkJ1eSkpXHJcbiAgICAgICAgdGhpcy5zZWxsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnNldE1vZGUoU2hvcERpYWxvZ01vZGUuU2VsbCkpXHJcbiAgICAgICAgdGhpcy5uZXh0UGFnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5uZXh0UGFnZSgpKVxyXG4gICAgICAgIHRoaXMucHJldlBhZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMucHJldlBhZ2UoKSlcclxuICAgICAgICB0aGlzLmNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhpZGUoKSlcclxuXHJcbiAgICAgICAgY29uc3QgZWxlbSA9IHRoaXMuZGlhbG9nLmVsZW1cclxuXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKGVsZW0sIFwiY2xpY2tcIiwgXCIuc2hvcC1pdGVtLXJvd1wiLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgYnRuID0gZXYudGFyZ2V0IGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGJ0bi5jbG9zZXN0KFwiLml0ZW0tcm93XCIpIGFzIEhUTUxUYWJsZVJvd0VsZW1lbnRcclxuICAgICAgICAgICAgY29uc3QgaWR4ID0gZG9tLmdldEVsZW1lbnRJbmRleChyb3cpXHJcbiAgICAgICAgICAgIHRoaXMuY2hvb3NlKGlkeClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG5cclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJYXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiQlwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldE1vZGUoU2hvcERpYWxvZ01vZGUuQnV5KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlNcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRNb2RlKFNob3BEaWFsb2dNb2RlLlNlbGwpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiQVJST1dET1dOXCIgfHwga2V5ID09PSBcIlNcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0SXRlbSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiQVJST1dVUFwiIHx8IGtleSA9PT0gXCJXXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJldkl0ZW0oKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcIlBBR0VET1dOXCIgfHwga2V5ID09PSBcIk5cIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0UGFnZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiUEFHRVVQXCIgfHwga2V5ID09PSBcIlBcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2UGFnZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiRVNDQVBFXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZSgpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiRU5URVJcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jaG9vc2UodGhpcy5zZWxlY3RlZEluZGV4KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHBhcnNlSW50KGV2LmtleSlcclxuICAgICAgICAgICAgaWYgKGluZGV4ICYmIGluZGV4ID4gMCAmJiBpbmRleCA8PSA5KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNob29zZShpbmRleCAtIDEpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgICAgICB0aGlzLmRpYWxvZy5zaG93KClcclxuICAgIH1cclxuXHJcbiAgICBoaWRlKCkge1xyXG4gICAgICAgIHRoaXMuZGlhbG9nLmhpZGUoKVxyXG4gICAgfVxyXG5cclxuICAgIGNob29zZShpZHg6IG51bWJlcikge1xyXG4gICAgICAgIGlkeCA9IHRoaXMucGFnZUluZGV4ICogdGhpcy5wYWdlU2l6ZSArIGlkeFxyXG4gICAgICAgIHN3aXRjaCAodGhpcy5tb2RlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgU2hvcERpYWxvZ01vZGUuQnV5OlxyXG4gICAgICAgICAgICAgICAgdGhpcy5idXkoaWR4KVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgICAgY2FzZSBTaG9wRGlhbG9nTW9kZS5TZWxsOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxsKGlkeClcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldE1vZGUobW9kZTogU2hvcERpYWxvZ01vZGUpIHtcclxuICAgICAgICB0aGlzLm1vZGUgPSBtb2RlXHJcbiAgICAgICAgdGhpcy5wYWdlSW5kZXggPSAwXHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gLTFcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIGJ1eShpZHg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLml0ZW1zW2lkeF1cclxuXHJcbiAgICAgICAgaWYgKGl0ZW0udmFsdWUgPiB0aGlzLnBsYXllci5nb2xkKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5lcnJvcihgWW91IGRvIG5vdCBoYXZlIGVub3VnaCBnb2xkIGZvciAke2l0ZW0ubmFtZX0hYClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBvdXRwdXQuaW5mbyhgWW91IGJvdWdodCAke2l0ZW0ubmFtZX0uYClcclxuICAgICAgICB0aGlzLnBsYXllci5nb2xkIC09IGl0ZW0udmFsdWVcclxuICAgICAgICB0aGlzLnBsYXllci5pbnZlbnRvcnkucHVzaChpdGVtLmNsb25lKCkpXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBzZWxsKGlkeDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbaWR4XVxyXG4gICAgICAgIGNvbnN0IGludklkeCA9IHRoaXMucGxheWVyLmludmVudG9yeS5pbmRleE9mKGl0ZW0pXHJcbiAgICAgICAgaWYgKGludklkeCA9PSAtMSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucGxheWVyLnJlbW92ZShpdGVtKVxyXG4gICAgICAgIHRoaXMucGxheWVyLmludmVudG9yeS5zcGxpY2UoaW52SWR4LCAxKVxyXG4gICAgICAgIHRoaXMucGxheWVyLmdvbGQgKz0gTWF0aC5mbG9vcihpdGVtLnZhbHVlIC8gMilcclxuICAgICAgICBjb25zb2xlLmxvZyhgWW91IHNvbGQgJHtpdGVtLm5hbWV9LmApXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgaGlkZGVuKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRpYWxvZy5oaWRkZW5cclxuICAgIH1cclxuXHJcbiAgICBuZXh0UGFnZSgpIHtcclxuICAgICAgICB0aGlzLnBhZ2VJbmRleCsrXHJcbiAgICAgICAgdGhpcy5wYWdlSW5kZXggPSBNYXRoLm1pbih0aGlzLnBhZ2VJbmRleCwgTWF0aC5jZWlsKHRoaXMuaXRlbXMubGVuZ3RoIC8gdGhpcy5wYWdlU2l6ZSkgLSAxKVxyXG4gICAgICAgIHRoaXMucmVmcmVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJldlBhZ2UoKSB7XHJcbiAgICAgICAgdGhpcy5wYWdlSW5kZXgtLVxyXG4gICAgICAgIHRoaXMucGFnZUluZGV4ID0gTWF0aC5tYXgodGhpcy5wYWdlSW5kZXgsIDApXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoKClcclxuICAgIH1cclxuXHJcbiAgICBuZXh0SXRlbSgpIHtcclxuICAgICAgICArK3RoaXMuc2VsZWN0ZWRJbmRleFxyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWluKHRoaXMuc2VsZWN0ZWRJbmRleCwgOClcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByZXZJdGVtKCkge1xyXG4gICAgICAgIC0tdGhpcy5zZWxlY3RlZEluZGV4XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5tYXgodGhpcy5zZWxlY3RlZEluZGV4LCAtMSlcclxuICAgICAgICB0aGlzLnJlZnJlc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHJlZnJlc2goKSB7XHJcbiAgICAgICAgc3dpdGNoICh0aGlzLm1vZGUpIHtcclxuICAgICAgICAgICAgY2FzZSBTaG9wRGlhbG9nTW9kZS5CdXk6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2hCdXkoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgU2hvcERpYWxvZ01vZGUuU2VsbDpcclxuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaFNlbGwoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZ29sZFNwYW4udGV4dENvbnRlbnQgPSBgR29sZDogJHt0aGlzLnBsYXllci5nb2xkfWBcclxuICAgIH1cclxuXHJcbiAgICByZWZyZXNoQnV5KCkge1xyXG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy5zaG9wVGFibGUudEJvZGllc1swXVxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0Ym9keSlcclxuXHJcbiAgICAgICAgLy8gYXNzZW1ibGUgaXRlbSBsaXN0XHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5wbGF5ZXJcclxuICAgICAgICB0aGlzLml0ZW1zID0gWy4uLnRoaW5ncy5kYl0uZmlsdGVyKHQgPT4gdCBpbnN0YW5jZW9mIHJsLkl0ZW0gJiYgdC52YWx1ZSA+IDAgJiYgdC5sZXZlbCA8PSBwbGF5ZXIubGV2ZWwpIGFzIHJsLkl0ZW1bXVxyXG5cclxuICAgICAgICBjb25zdCBwYWdlT2Zmc2V0ID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplXHJcbiAgICAgICAgY29uc3QgcGFnZVNpemUgPSBNYXRoLm1pbih0aGlzLnBhZ2VTaXplLCB0aGlzLml0ZW1zLmxlbmd0aCAtIHBhZ2VPZmZzZXQpXHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5taW4odGhpcy5zZWxlY3RlZEluZGV4LCBwYWdlU2l6ZSAtIDEpXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFnZVNpemU7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gdGhpcy5pdGVtc1twYWdlT2Zmc2V0ICsgaV1cclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0aGlzLnNob3BCdXlJdGVtVGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCB0ciA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5pdGVtLXJvd1wiKVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtSW5kZXhUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLWluZGV4XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1OYW1lVGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1uYW1lXCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1Db3N0VGQgPSBkb20uYnlTZWxlY3Rvcih0ciwgXCIuaXRlbS1jb3N0XCIpXHJcbiAgICAgICAgICAgIGl0ZW1JbmRleFRkLnRleHRDb250ZW50ID0gYCR7aSArIDF9YFxyXG4gICAgICAgICAgICBpdGVtTmFtZVRkLnRleHRDb250ZW50ID0gaXRlbS5uYW1lXHJcbiAgICAgICAgICAgIGl0ZW1Db3N0VGQudGV4dENvbnRlbnQgPSBgJHtpdGVtLnZhbHVlfWBcclxuXHJcbiAgICAgICAgICAgIGlmIChpID09PSB0aGlzLnNlbGVjdGVkSW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIHRyLmNsYXNzTGlzdC5hZGQoXCJzZWxlY3RlZFwiKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoaXRlbS52YWx1ZSA+IHBsYXllci5nb2xkKSB7XHJcbiAgICAgICAgICAgICAgICB0ci5jbGFzc0xpc3QuYWRkKFwiZGlzYWJsZWRcIilcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGJvZHkuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmJ1eUJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcclxuICAgICAgICB0aGlzLnNlbGxCdXR0b24uZGlzYWJsZWQgPSBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHJlZnJlc2hTZWxsKCkge1xyXG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy5zaG9wVGFibGUudEJvZGllc1swXVxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0Ym9keSlcclxuXHJcbiAgICAgICAgLy8gYXNzZW1ibGUgaXRlbSBsaXN0XHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5wbGF5ZXJcclxuICAgICAgICB0aGlzLml0ZW1zID0gWy4uLnBsYXllci5pbnZlbnRvcnldLmZpbHRlcih0ID0+IHQudmFsdWUgPiAwKSBhcyBybC5JdGVtW11cclxuICAgICAgICBjb25zdCBwYWdlT2Zmc2V0ID0gdGhpcy5wYWdlSW5kZXggKiB0aGlzLnBhZ2VTaXplXHJcbiAgICAgICAgY29uc3QgcGFnZVNpemUgPSBNYXRoLm1pbih0aGlzLnBhZ2VTaXplLCB0aGlzLml0ZW1zLmxlbmd0aCAtIHBhZ2VPZmZzZXQpXHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5taW4odGhpcy5zZWxlY3RlZEluZGV4LCBwYWdlU2l6ZSAtIDEpXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFnZVNpemU7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gdGhpcy5pdGVtc1twYWdlT2Zmc2V0ICsgaV1cclxuICAgICAgICAgICAgY29uc3QgZXF1aXBwZWQgPSB0aGlzLnBsYXllci5pc0VxdWlwcGVkKGl0ZW0pXHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy5zaG9wU2VsbEl0ZW1UZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IHRyID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLml0ZW0tcm93XCIpXHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1JbmRleFRkID0gZG9tLmJ5U2VsZWN0b3IodHIsIFwiLml0ZW0taW5kZXhcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLW5hbWVcIilcclxuICAgICAgICAgICAgY29uc3QgaXRlbUNvc3RUZCA9IGRvbS5ieVNlbGVjdG9yKHRyLCBcIi5pdGVtLWNvc3RcIilcclxuICAgICAgICAgICAgaXRlbUluZGV4VGQudGV4dENvbnRlbnQgPSBgJHtpICsgMX1gXHJcbiAgICAgICAgICAgIGl0ZW1OYW1lVGQudGV4dENvbnRlbnQgPSBgJHtlcXVpcHBlZCA/IFwiKiBcIiA6IFwiXCJ9JHtpdGVtLm5hbWV9YFxyXG4gICAgICAgICAgICBpdGVtQ29zdFRkLnRleHRDb250ZW50ID0gYCR7TWF0aC5mbG9vcihpdGVtLnZhbHVlIC8gMil9YFxyXG5cclxuICAgICAgICAgICAgaWYgKGkgPT09IHRoaXMuc2VsZWN0ZWRJbmRleCkge1xyXG4gICAgICAgICAgICAgICAgdHIuY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5idXlCdXR0b24uZGlzYWJsZWQgPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuc2VsbEJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U29ydGVkSXRlbXMoaXRlbXM6IEl0ZXJhYmxlPHJsLkl0ZW0+KTogcmwuSXRlbVtdIHtcclxuICAgIGNvbnN0IHNvcnRlZEl0ZW1zID0gaXRlci5vcmRlckJ5KGl0ZW1zLCBpID0+IGkubmFtZSlcclxuICAgIHJldHVybiBzb3J0ZWRJdGVtc1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTb3J0ZWRJdGVtc1BhZ2UoaXRlbXM6IEl0ZXJhYmxlPHJsLkl0ZW0+LCBwYWdlSW5kZXg6IG51bWJlciwgcGFnZVNpemU6IG51bWJlcik6IHJsLkl0ZW1bXSB7XHJcbiAgICBjb25zdCBzdGFydEluZGV4ID0gcGFnZUluZGV4ICogcGFnZVNpemVcclxuICAgIGNvbnN0IGVuZEluZGV4ID0gc3RhcnRJbmRleCArIHBhZ2VTaXplXHJcbiAgICBjb25zdCBzb3J0ZWRJdGVtcyA9IGdldFNvcnRlZEl0ZW1zKGl0ZW1zKVxyXG4gICAgY29uc3QgcGFnZSA9IHNvcnRlZEl0ZW1zLnNsaWNlKHN0YXJ0SW5kZXgsIGVuZEluZGV4KVxyXG4gICAgcmV0dXJuIHBhZ2VcclxufVxyXG5cclxuZnVuY3Rpb24gY2FuU2VlKG1hcDogbWFwcy5NYXAsIGV5ZTogZ2VvLlBvaW50LCB0YXJnZXQ6IGdlby5Qb2ludCwgbGlnaHRSYWRpdXM6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgaWYgKGdlby5jYWxjTWFuaGF0dGVuRGlzdChleWUsIHRhcmdldCkgPiBsaWdodFJhZGl1cykge1xyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgcHQgb2YgbWFyY2goZXllLCB0YXJnZXQpKSB7XHJcbiAgICAgICAgLy8gaWdub3JlIHN0YXJ0IHBvaW50XHJcbiAgICAgICAgaWYgKHB0LmVxdWFsKGV5ZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgdGggb2YgbWFwLmF0KHB0KSkge1xyXG4gICAgICAgICAgICBpZiAoIXRoLnRyYW5zcGFyZW50KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHQuZXF1YWwodGFyZ2V0KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uKiBtYXJjaChzdGFydDogZ2VvLlBvaW50LCBlbmQ6IGdlby5Qb2ludCk6IEdlbmVyYXRvcjxnZW8uUG9pbnQ+IHtcclxuICAgIGNvbnN0IGN1ciA9IHN0YXJ0LmNsb25lKClcclxuICAgIGNvbnN0IGR5ID0gTWF0aC5hYnMoZW5kLnkgLSBzdGFydC55KVxyXG4gICAgY29uc3Qgc3kgPSBzdGFydC55IDwgZW5kLnkgPyAxIDogLTFcclxuICAgIGNvbnN0IGR4ID0gLU1hdGguYWJzKGVuZC54IC0gc3RhcnQueClcclxuICAgIGNvbnN0IHN4ID0gc3RhcnQueCA8IGVuZC54ID8gMSA6IC0xXHJcbiAgICBsZXQgZXJyID0gZHkgKyBkeFxyXG5cclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgeWllbGQgY3VyXHJcblxyXG4gICAgICAgIGlmIChjdXIuZXF1YWwoZW5kKSkge1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZTIgPSAyICogZXJyXHJcbiAgICAgICAgaWYgKGUyID49IGR4KSB7XHJcbiAgICAgICAgICAgIGVyciArPSBkeFxyXG4gICAgICAgICAgICBjdXIueSArPSBzeVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUyIDw9IGR5KSB7XHJcbiAgICAgICAgICAgIGVyciArPSBkeVxyXG4gICAgICAgICAgICBjdXIueCArPSBzeFxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZHJvcEl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkl0ZW0pOiB2b2lkIHtcclxuICAgIHBsYXllci5kZWxldGUoaXRlbSlcclxuICAgIG91dHB1dC5pbmZvKGAke2l0ZW0ubmFtZX0gd2FzIGRyb3BwZWRgKVxyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5Vc2FibGUpOiB2b2lkIHtcclxuICAgIGNvbnN0IGFtb3VudCA9IE1hdGgubWluKGl0ZW0uaGVhbHRoLCBwbGF5ZXIubWF4SGVhbHRoIC0gcGxheWVyLmhlYWx0aClcclxuICAgIHBsYXllci5oZWFsdGggKz0gYW1vdW50XHJcbiAgICBwbGF5ZXIuZGVsZXRlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHJlc3RvcmVkICR7YW1vdW50fSBoZWFsdGhgKVxyXG59XHJcblxyXG5mdW5jdGlvbiBlcXVpcEl0ZW0ocGxheWVyOiBybC5QbGF5ZXIsIGl0ZW06IHJsLkl0ZW0pOiB2b2lkIHtcclxuICAgIHBsYXllci5lcXVpcChpdGVtKVxyXG4gICAgb3V0cHV0LmluZm8oYCR7aXRlbS5uYW1lfSB3YXMgZXF1aXBwZWRgKVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVJdGVtKHBsYXllcjogcmwuUGxheWVyLCBpdGVtOiBybC5JdGVtKTogdm9pZCB7XHJcbiAgICBwbGF5ZXIucmVtb3ZlKGl0ZW0pXHJcbiAgICBvdXRwdXQuaW5mbyhgJHtpdGVtLm5hbWV9IHdhcyByZW1vdmVkYClcclxufVxyXG5cclxuZW51bSBUYXJnZXRDb21tYW5kIHtcclxuICAgIE5vbmUsXHJcbiAgICBBdHRhY2ssXHJcbiAgICBTaG9vdCxcclxuICAgIExvb2tcclxufVxyXG5cclxuY2xhc3MgQXBwIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FudmFzID0gZG9tLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYXR0YWNrQnV0dG9uID0gZG9tLmJ5SWQoXCJhdHRhY2tCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2hvb3RCdXR0b24gPSBkb20uYnlJZChcInNob290QnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxvb2tCdXR0b24gPSBkb20uYnlJZChcImxvb2tCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmVzZXRCdXR0b24gPSBkb20uYnlJZChcInJlc2V0QnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGlucDogaW5wdXQuSW5wdXQgPSBuZXcgaW5wdXQuSW5wdXQodGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN0YXRzRGlhbG9nOiBTdGF0c0RpYWxvZ1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbnZlbnRvcnlEaWFsb2c6IEludmVudG9yeURpYWxvZ1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXJEaWFsb2c6IENvbnRhaW5lckRpYWxvZ1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBkZWZlYXREaWFsb2cgPSBuZXcgRGVmZWF0RGlhbG9nKHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsZXZlbERpYWxvZzogTGV2ZWxEaWFsb2dcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2hvcERpYWxvZzogU2hvcERpYWxvZ1xyXG4gICAgcHJpdmF0ZSB6b29tID0gMVxyXG4gICAgcHJpdmF0ZSB0YXJnZXRDb21tYW5kOiBUYXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5Ob25lXHJcbiAgICBwcml2YXRlIGN1cnNvclBvc2l0aW9uPzogZ2VvLlBvaW50XHJcblxyXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcclxuICAgICAgICBwcml2YXRlIHJlYWRvbmx5IHJuZzogcmFuZC5TRkMzMlJORyxcclxuICAgICAgICBwcml2YXRlIHJlYWRvbmx5IHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsXHJcbiAgICAgICAgcHJpdmF0ZSBmbG9vcjogbnVtYmVyLFxyXG4gICAgICAgIHByaXZhdGUgbWFwOiBtYXBzLk1hcCxcclxuICAgICAgICBwcml2YXRlIHRleHR1cmU6IGdmeC5UZXh0dXJlLFxyXG4gICAgICAgIHByaXZhdGUgaW1hZ2VNYXA6IE1hcDxzdHJpbmcsIG51bWJlcj4pIHtcclxuICAgICAgICBjb25zdCBwbGF5ZXIgPSBtYXAucGxheWVyLnRoaW5nXHJcbiAgICAgICAgdGhpcy5zdGF0c0RpYWxvZyA9IG5ldyBTdGF0c0RpYWxvZyhwbGF5ZXIsIHRoaXMuY2FudmFzKVxyXG4gICAgICAgIHRoaXMuaW52ZW50b3J5RGlhbG9nID0gbmV3IEludmVudG9yeURpYWxvZyhwbGF5ZXIsIHRoaXMuY2FudmFzKVxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyRGlhbG9nID0gbmV3IENvbnRhaW5lckRpYWxvZyhwbGF5ZXIsIHRoaXMuY2FudmFzKVxyXG4gICAgICAgIHRoaXMubGV2ZWxEaWFsb2cgPSBuZXcgTGV2ZWxEaWFsb2cocGxheWVyLCB0aGlzLmNhbnZhcylcclxuICAgICAgICB0aGlzLnNob3BEaWFsb2cgPSBuZXcgU2hvcERpYWxvZyhwbGF5ZXIsIHRoaXMuY2FudmFzKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzdGF0aWMgYXN5bmMgY3JlYXRlKCk6IFByb21pc2U8QXBwPiB7XHJcbiAgICAgICAgY29uc3QgY2FudmFzID0gZG9tLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuICAgICAgICBjb25zdCByZW5kZXJlciA9IG5ldyBnZnguUmVuZGVyZXIoY2FudmFzKVxyXG5cclxuICAgICAgICAvLyBjaGVjayBmb3IgYW55IHNhdmVkIHN0YXRlXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgYXBwID0gYXdhaXQgQXBwLmxvYWQocmVuZGVyZXIpXHJcbiAgICAgICAgICAgIGlmIChhcHApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhcHBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJGYWlsZWQgdG8gbG9hZCBzdGF0ZS5cIiwgZSlcclxuICAgICAgICAgICAgY2xlYXJTdGF0ZSgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBmYWlsZWQgdG8gbG9hZCBhcHAgLSBjcmVhdGUgYSBuZXcgb25lXHJcbiAgICAgICAgLy8gY29uc3Qgc3RhdGUgPSBudWxsIGFzIEFwcFNhdmVTdGF0ZSB8IG51bGxcclxuICAgICAgICBjb25zdCBzZWVkID0gcmFuZC54bXVyMyhuZXcgRGF0ZSgpLnRvU3RyaW5nKCkpXHJcbiAgICAgICAgY29uc3Qgcm5nID0gbmV3IHJhbmQuU0ZDMzJSTkcoc2VlZCgpLCBzZWVkKCksIHNlZWQoKSwgc2VlZCgpKVxyXG5cclxuICAgICAgICAvLyBsb2FkIGN1cnJlbnQgZHVuZ2VvbiBtYXAsIG9yIGdlbmVyYXRlIG9uZVxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaW5ncy5wbGF5ZXIuY2xvbmUoKVxyXG4gICAgICAgIGNvbnN0IG1hcCA9IGF3YWl0IGdlbi5nZW5lcmF0ZUR1bmdlb25MZXZlbChybmcsIHRoaW5ncy5kYiwgcGxheWVyLCAxLCBybC5FeGl0RGlyZWN0aW9uLkRvd24pXHJcbiAgICAgICAgY29uc3QgW3RleHR1cmUsIGltYWdlTWFwXSA9IGF3YWl0IGxvYWRJbWFnZXMocmVuZGVyZXIsIG1hcClcclxuICAgICAgICBjb25zdCBhcHAgPSBuZXcgQXBwKHJuZywgcmVuZGVyZXIsIDEsIG1hcCwgdGV4dHVyZSwgaW1hZ2VNYXApXHJcbiAgICAgICAgcmV0dXJuIGFwcFxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBleGVjKCkge1xyXG4gICAgICAgIHRoaXMuY2FudmFzLmZvY3VzKClcclxuXHJcbiAgICAgICAgb3V0cHV0LndyaXRlKFwiWW91ciBhZHZlbnR1cmUgYmVnaW5zXCIpXHJcbiAgICAgICAgdGhpcy5oYW5kbGVSZXNpemUoKVxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLnRpY2soKSlcclxuXHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2KSA9PiB0aGlzLmhhbmRsZUtleURvd24oZXYpKVxyXG5cclxuICAgICAgICB0aGlzLmF0dGFja0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLkF0dGFja1xyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuc2hvb3RCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5TaG9vdFxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMubG9va0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLkxvb2tcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLnJlc2V0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNsZWFyU3RhdGUoKVxyXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKClcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBwcml2YXRlIHRpY2soKSB7XHJcbiAgICAgICAgdGhpcy5oYW5kbGVSZXNpemUoKVxyXG5cclxuICAgICAgICBjb25zdCBuZXh0Q3JlYXR1cmUgPSB0aGlzLmdldE5leHRDcmVhdHVyZSgpXHJcbiAgICAgICAgaWYgKG5leHRDcmVhdHVyZT8udGhpbmcgaW5zdGFuY2VvZiBybC5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dCgpXHJcbiAgICAgICAgfSBlbHNlIGlmIChuZXh0Q3JlYXR1cmU/LnRoaW5nIGluc3RhbmNlb2YgcmwuTW9uc3Rlcikge1xyXG4gICAgICAgICAgICB0aGlzLnRpY2tNb25zdGVyKG5leHRDcmVhdHVyZS5wb3NpdGlvbiwgbmV4dENyZWF0dXJlLnRoaW5nKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMudGlja1JvdW5kKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZHJhd0ZyYW1lKClcclxuXHJcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMudGljaygpKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0TmV4dE1vbnN0ZXIoKTogbWFwcy5QbGFjZWQ8cmwuTW9uc3Rlcj4gfCBudWxsIHtcclxuICAgICAgICAvLyBkZXRlcm1pbmUgd2hvc2UgdHVybiBpdCBpc1xyXG4gICAgICAgIGxldCBuZXh0TW9uc3RlciA9IG51bGxcclxuICAgICAgICBmb3IgKGNvbnN0IG1vbnN0ZXIgb2YgdGhpcy5tYXAubW9uc3RlcnMpIHtcclxuICAgICAgICAgICAgaWYgKG1vbnN0ZXIudGhpbmcuc3RhdGUgIT09IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dybykge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG1vbnN0ZXIudGhpbmcuYWN0aW9uIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghbmV4dE1vbnN0ZXIgfHwgbW9uc3Rlci50aGluZy5hY3Rpb24gPiBuZXh0TW9uc3Rlci50aGluZy5hY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgIG5leHRNb25zdGVyID0gbW9uc3RlclxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmV4dE1vbnN0ZXJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldE5leHRDcmVhdHVyZSgpOiBtYXBzLlBsYWNlZDxybC5Nb25zdGVyPiB8IG1hcHMuUGxhY2VkPHJsLlBsYXllcj4gfCBudWxsIHtcclxuICAgICAgICBjb25zdCBtb25zdGVyID0gdGhpcy5nZXROZXh0TW9uc3RlcigpXHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5tYXAucGxheWVyLnRoaW5nXHJcblxyXG4gICAgICAgIGlmIChwbGF5ZXIuYWN0aW9uID4gMCAmJiBwbGF5ZXIuYWN0aW9uID4gKG1vbnN0ZXI/LnRoaW5nPy5hY3Rpb24gPz8gMCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubWFwLnBsYXllclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1vbnN0ZXJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHRpY2tSb3VuZCgpIHtcclxuICAgICAgICAvLyBhY2N1bXVsYXRlIGFjdGlvbiBwb2ludHNcclxuICAgICAgICBmb3IgKGNvbnN0IG1vbnN0ZXIgb2YgaXRlci5maWx0ZXIodGhpcy5tYXAubW9uc3RlcnMudGhpbmdzKCksIG0gPT4gbS5zdGF0ZSA9PT0gcmwuTW9uc3RlclN0YXRlLmFnZ3JvKSkge1xyXG4gICAgICAgICAgICBjb25zdCByZXNlcnZlID0gTWF0aC5taW4obW9uc3Rlci5hY3Rpb25SZXNlcnZlLCBtb25zdGVyLmFnaWxpdHkpXHJcbiAgICAgICAgICAgIG1vbnN0ZXIuYWN0aW9uID0gMSArIG1vbnN0ZXIuYWdpbGl0eSArIHJlc2VydmVcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb25SZXNlcnZlID0gMFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY2FwIGFjdGlvbiByZXNlcnZlIFxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMubWFwLnBsYXllci50aGluZ1xyXG4gICAgICAgIGNvbnN0IHJlc2VydmUgPSBNYXRoLm1pbihwbGF5ZXIuYWN0aW9uUmVzZXJ2ZSwgcGxheWVyLmFnaWxpdHkpXHJcbiAgICAgICAgcGxheWVyLmFjdGlvbiA9IDEgKyBwbGF5ZXIuYWdpbGl0eSArIHJlc2VydmVcclxuICAgICAgICBwbGF5ZXIuYWN0aW9uUmVzZXJ2ZSA9IDBcclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGVNb25zdGVyU3RhdGVzKClcclxuXHJcbiAgICAgICAgLy8gYWR2YW5jZSBkdXJhdGlvbiBvZiBpdGVtc1xyXG4gICAgICAgIGlmIChwbGF5ZXIubGlnaHRTb3VyY2UgJiYgcGxheWVyLmxpZ2h0U291cmNlLmR1cmF0aW9uID4gMCkge1xyXG4gICAgICAgICAgICBwbGF5ZXIubGlnaHRTb3VyY2UuZHVyYXRpb24gLT0gMVxyXG4gICAgICAgICAgICBpZiAocGxheWVyLmxpZ2h0U291cmNlLmR1cmF0aW9uID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBvdXRwdXQud2FybmluZyhgWW91ciAke3BsYXllci5saWdodFNvdXJjZS5uYW1lfSBoYXMgYmVlbiBleHRpbmd1aXNoZWQhYClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZXhwZXJpZW5jZVJlcXVpcmVkID0gcmwuZ2V0RXhwZXJpZW5jZVJlcXVpcmVtZW50KHBsYXllci5sZXZlbCArIDEpXHJcbiAgICAgICAgaWYgKHBsYXllci5leHBlcmllbmNlID49IGV4cGVyaWVuY2VSZXF1aXJlZCkge1xyXG4gICAgICAgICAgICB0aGlzLmxldmVsRGlhbG9nLnNob3coKVxyXG4gICAgICAgICAgICArK3BsYXllci5sZXZlbFxyXG4gICAgICAgICAgICBwbGF5ZXIuZXhwZXJpZW5jZSAtPSBleHBlcmllbmNlUmVxdWlyZWRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHNhdmUgY3VycmVudCBzdGF0ZVxyXG4gICAgICAgIHRoaXMuc2F2ZVN0YXRlKClcclxuXHJcbiAgICAgICAgaWYgKHBsYXllci5oZWFsdGggPD0gMCkge1xyXG4gICAgICAgICAgICBjbGVhclN0YXRlKClcclxuICAgICAgICAgICAgdGhpcy5kZWZlYXREaWFsb2cuc2hvdygpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0U2Nyb2xsT2Zmc2V0KCk6IGdlby5Qb2ludCB7XHJcbiAgICAgICAgLy8gY29udmVydCBtYXAgcG9pbnQgdG8gY2FudmFzIHBvaW50LCBub3RpbmcgdGhhdCBjYW52YXMgaXMgY2VudGVyZWQgb24gcGxheWVyXHJcbiAgICAgICAgY29uc3QgcGxheWVyUG9zaXRpb24gPSB0aGlzLm1hcC5wbGF5ZXIucG9zaXRpb25cclxuICAgICAgICBjb25zdCBjYW52YXNDZW50ZXIgPSBuZXcgZ2VvLlBvaW50KHRoaXMuY2FudmFzLndpZHRoIC8gMiwgdGhpcy5jYW52YXMuaGVpZ2h0IC8gMilcclxuICAgICAgICBjb25zdCBvZmZzZXQgPSBjYW52YXNDZW50ZXIuc3ViUG9pbnQocGxheWVyUG9zaXRpb24uYWRkU2NhbGFyKC41KS5tdWxTY2FsYXIodGhpcy50aWxlU2l6ZSkpXHJcbiAgICAgICAgcmV0dXJuIG9mZnNldC5mbG9vcigpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYW52YXNUb01hcFBvaW50KGN4eTogZ2VvLlBvaW50KSB7XHJcbiAgICAgICAgY29uc3Qgc2Nyb2xsT2Zmc2V0ID0gdGhpcy5nZXRTY3JvbGxPZmZzZXQoKVxyXG4gICAgICAgIGNvbnN0IG14eSA9IGN4eS5zdWJQb2ludChzY3JvbGxPZmZzZXQpLmRpdlNjYWxhcih0aGlzLnRpbGVTaXplKS5mbG9vcigpXHJcbiAgICAgICAgcmV0dXJuIG14eVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbWFwVG9DYW52YXNQb2ludChteHk6IGdlby5Qb2ludCkge1xyXG4gICAgICAgIGNvbnN0IHNjcm9sbE9mZnNldCA9IHRoaXMuZ2V0U2Nyb2xsT2Zmc2V0KClcclxuICAgICAgICBjb25zdCBjeHkgPSBteHkubXVsU2NhbGFyKHRoaXMudGlsZVNpemUpLmFkZFBvaW50KHNjcm9sbE9mZnNldClcclxuICAgICAgICByZXR1cm4gY3h5XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwcm9jZXNzUGxheWVyTWVsZWVBdHRhY2soZGVmZW5kZXI6IHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAvLyBiYXNlIDYwJSBjaGFuY2UgdG8gaGl0XHJcbiAgICAgICAgLy8gMTAlIGJvbnVzIC8gcGVuYWx0eSBmb3IgZXZlcnkgcG9pbnQgZGlmZmVyZW5jZSBiZXR3ZWVuIGF0dGFjayBhbmQgZGVmZW5zZVxyXG4gICAgICAgIC8vIGJvdHRvbXMgb3V0IGF0IDUlIC0gYWx3YXlzIFNPTUUgY2hhbmNlIHRvIGhpdFxyXG4gICAgICAgIGNvbnN0IGF0dGFja2VyID0gdGhpcy5tYXAucGxheWVyLnRoaW5nXHJcbiAgICAgICAgY29uc3QgYm9udXMgPSAoYXR0YWNrZXIubWVsZWVBdHRhY2sgLSBkZWZlbmRlci5kZWZlbnNlKSAqIC4xXHJcbiAgICAgICAgY29uc3QgaGl0Q2hhbmNlID0gTWF0aC5taW4oTWF0aC5tYXgoLjYgKyBib251cywgLjA1KSwgLjk1KVxyXG4gICAgICAgIGNvbnN0IGhpdCA9IHJhbmQuY2hhbmNlKHRoaXMucm5nLCBoaXRDaGFuY2UpXHJcbiAgICAgICAgY29uc3Qgd2VhcG9uID0gYXR0YWNrZXIubWVsZWVXZWFwb24gPz8gdGhpbmdzLmZpc3RzXHJcbiAgICAgICAgY29uc3QgYXR0YWNrVmVyYiA9IHdlYXBvbi52ZXJiID8gd2VhcG9uLnZlcmIgOiBcImF0dGFja3NcIlxyXG4gICAgICAgIGF0dGFja2VyLmFjdGlvbiAtPSB3ZWFwb24uYWN0aW9uXHJcblxyXG4gICAgICAgIGlmICghaGl0KSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke2F0dGFja2VyLm5hbWV9ICR7YXR0YWNrVmVyYn0gJHtkZWZlbmRlci5uYW1lfSBidXQgbWlzc2VzIWApXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGl0IC0gY2FsY3VsYXRlIGRhbWFnZVxyXG4gICAgICAgIGNvbnN0IGRhbWFnZSA9IGF0dGFja2VyLm1lbGVlRGFtYWdlLnJvbGwodGhpcy5ybmcpXHJcbiAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7YXR0YWNrZXIubmFtZX0gJHthdHRhY2tWZXJifSAke2RlZmVuZGVyLm5hbWV9IGFuZCBoaXRzIGZvciAke2RhbWFnZX0gZGFtYWdlIWApXHJcbiAgICAgICAgZGVmZW5kZXIuaGVhbHRoIC09IGRhbWFnZVxyXG5cclxuICAgICAgICBpZiAoZGVmZW5kZXIuaGVhbHRoIDwgMCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHtkZWZlbmRlci5uYW1lfSBoYXMgYmVlbiBkZWZlYXRlZCBhbmQgJHthdHRhY2tlci5uYW1lfSByZWNlaXZlcyAke2RlZmVuZGVyLmV4cGVyaWVuY2V9IGV4cGVyaWVuY2UgYW5kICR7ZGVmZW5kZXIuZ29sZH0gZ29sZGApXHJcbiAgICAgICAgICAgIGF0dGFja2VyLmV4cGVyaWVuY2UgKz0gZGVmZW5kZXIuZXhwZXJpZW5jZVxyXG4gICAgICAgICAgICBhdHRhY2tlci5nb2xkICs9IGRlZmVuZGVyLmdvbGRcclxuICAgICAgICAgICAgdGhpcy5tYXAubW9uc3RlcnMuZGVsZXRlKGRlZmVuZGVyKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHByb2Nlc3NQbGF5ZXJSYW5nZWRBdHRhY2soZGVmZW5kZXI6IHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAvLyBiYXNlIDQwJSBjaGFuY2UgdG8gaGl0XHJcbiAgICAgICAgLy8gMTAlIGJvbnVzIC8gcGVuYWx0eSBmb3IgZXZlcnkgcG9pbnQgZGlmZmVyZW5jZSBiZXR3ZWVuIGF0dGFjayBhbmQgZGVmZW5zZVxyXG4gICAgICAgIC8vIGJvdHRvbXMgb3V0IGF0IDUlIC0gYWx3YXlzIFNPTUUgY2hhbmNlIHRvIGhpdFxyXG4gICAgICAgIGNvbnN0IGF0dGFja2VyID0gdGhpcy5tYXAucGxheWVyLnRoaW5nXHJcbiAgICAgICAgaWYgKCFhdHRhY2tlci5yYW5nZWRXZWFwb24pIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUGxheWVyIGhhcyBubyByYW5nZWQgd2VhcG9uIGVxdWlwcGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBib251cyA9IChhdHRhY2tlci5yYW5nZWRBdHRhY2sgLSBkZWZlbmRlci5kZWZlbnNlKSAqIC4xXHJcbiAgICAgICAgY29uc3QgaGl0Q2hhbmNlID0gTWF0aC5taW4oTWF0aC5tYXgoLjYgKyBib251cywgLjA1KSwgLjk1KVxyXG4gICAgICAgIGNvbnN0IGhpdCA9IHJhbmQuY2hhbmNlKHRoaXMucm5nLCBoaXRDaGFuY2UpXHJcbiAgICAgICAgY29uc3Qgd2VhcG9uID0gYXR0YWNrZXIucmFuZ2VkV2VhcG9uXHJcbiAgICAgICAgY29uc3QgYXR0YWNrVmVyYiA9IHdlYXBvbi52ZXJiID8gd2VhcG9uLnZlcmIgOiBcImF0dGFja3NcIlxyXG4gICAgICAgIGF0dGFja2VyLmFjdGlvbiAtPSB3ZWFwb24uYWN0aW9uXHJcblxyXG4gICAgICAgIGlmICghaGl0KSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke2F0dGFja2VyLm5hbWV9ICR7YXR0YWNrVmVyYn0gJHtkZWZlbmRlci5uYW1lfSBidXQgbWlzc2VzIWApXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGl0IC0gY2FsY3VsYXRlIGRhbWFnZVxyXG4gICAgICAgIGNvbnN0IGRhbWFnZSA9IGF0dGFja2VyLnJhbmdlZERhbWFnZT8ucm9sbCh0aGlzLnJuZykgPz8gMFxyXG4gICAgICAgIG91dHB1dC53YXJuaW5nKGAke2F0dGFja2VyLm5hbWV9ICR7YXR0YWNrVmVyYn0gJHtkZWZlbmRlci5uYW1lfSBhbmQgaGl0cyBmb3IgJHtkYW1hZ2V9IGRhbWFnZSFgKVxyXG4gICAgICAgIGRlZmVuZGVyLmhlYWx0aCAtPSBkYW1hZ2VcclxuXHJcbiAgICAgICAgaWYgKGRlZmVuZGVyLmhlYWx0aCA8IDApIHtcclxuICAgICAgICAgICAgb3V0cHV0Lndhcm5pbmcoYCR7ZGVmZW5kZXIubmFtZX0gaGFzIGJlZW4gZGVmZWF0ZWQgYW5kICR7YXR0YWNrZXIubmFtZX0gcmVjZWl2ZXMgJHtkZWZlbmRlci5leHBlcmllbmNlfSBleHBlcmllbmNlYClcclxuICAgICAgICAgICAgYXR0YWNrZXIuZXhwZXJpZW5jZSArPSBkZWZlbmRlci5leHBlcmllbmNlXHJcbiAgICAgICAgICAgIHRoaXMubWFwLm1vbnN0ZXJzLmRlbGV0ZShkZWZlbmRlcilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwcm9jZXNzTW9uc3RlckF0dGFjayhhdHRhY2tlcjogcmwuTW9uc3RlciwgYXR0YWNrOiBybC5BdHRhY2spIHtcclxuICAgICAgICAvLyBiYXNlIDYwJSBjaGFuY2UgdG8gaGl0XHJcbiAgICAgICAgLy8gMTAlIGJvbnVzIC8gcGVuYWx0eSBmb3IgZXZlcnkgcG9pbnQgZGlmZmVyZW5jZSBiZXR3ZWVuIGF0dGFjayBhbmQgZGVmZW5zZVxyXG4gICAgICAgIC8vIGNsYW1wcyB0byBvdXQgYXQgWzUsIDk1XSAtIGFsd2F5cyBTT01FIGNoYW5jZSB0byBoaXQgb3IgbWlzc1xyXG4gICAgICAgIC8vIGNob29zZSBhbiBhdHRhY2sgZnJvbSByZXBlcnRvaXJlIG9mIG1vbnN0ZXJcclxuICAgICAgICBjb25zdCBkZWZlbmRlciA9IHRoaXMubWFwLnBsYXllci50aGluZ1xyXG4gICAgICAgIGNvbnN0IGJvbnVzID0gKGF0dGFjay5hdHRhY2sgLSBkZWZlbmRlci5kZWZlbnNlKSAqIC4xXHJcbiAgICAgICAgY29uc3QgaGl0Q2hhbmNlID0gTWF0aC5tYXgoLjYgKyBib251cywgLjA1KVxyXG4gICAgICAgIGNvbnN0IGhpdCA9IHJhbmQuY2hhbmNlKHRoaXMucm5nLCBoaXRDaGFuY2UpXHJcbiAgICAgICAgY29uc3QgYXR0YWNrVmVyYiA9IGF0dGFjay52ZXJiID8gYXR0YWNrLnZlcmIgOiBcImF0dGFja3NcIlxyXG4gICAgICAgIGF0dGFja2VyLmFjdGlvbiAtPSBhdHRhY2suYWN0aW9uXHJcblxyXG4gICAgICAgIGlmICghaGl0KSB7XHJcbiAgICAgICAgICAgIG91dHB1dC53YXJuaW5nKGAke2F0dGFja2VyLm5hbWV9ICR7YXR0YWNrVmVyYn0gJHtkZWZlbmRlci5uYW1lfSBidXQgbWlzc2VzIWApXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGl0IC0gY2FsY3VsYXRlIGRhbWFnZVxyXG4gICAgICAgIGNvbnN0IGRhbWFnZSA9IGF0dGFjay5kYW1hZ2Uucm9sbCh0aGlzLnJuZylcclxuICAgICAgICBvdXRwdXQud2FybmluZyhgJHthdHRhY2tlci5uYW1lfSAke2F0dGFja1ZlcmJ9ICR7ZGVmZW5kZXIubmFtZX0gYW5kIGhpdHMgZm9yICR7ZGFtYWdlfSBkYW1hZ2UhYClcclxuICAgICAgICBkZWZlbmRlci5oZWFsdGggLT0gZGFtYWdlXHJcblxyXG4gICAgICAgIGlmIChkZWZlbmRlci5oZWFsdGggPD0gMCkge1xyXG4gICAgICAgICAgICBvdXRwdXQud2FybmluZyhgJHtkZWZlbmRlci5uYW1lfSBoYXMgYmVlbiBkZWZlYXRlZCFgKVxyXG4gICAgICAgICAgICBjbGVhclN0YXRlKClcclxuICAgICAgICAgICAgdGhpcy5kZWZlYXREaWFsb2cuc2hvdygpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlTW9uc3RlclN0YXRlcygpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IG1vbnN0ZXIgb2YgdGhpcy5tYXAubW9uc3RlcnMpIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVNb25zdGVyU3RhdGUobW9uc3RlcilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVNb25zdGVyU3RhdGUocGxhY2VkTW9uc3RlcjogbWFwcy5QbGFjZWQ8cmwuTW9uc3Rlcj4pIHtcclxuICAgICAgICAvLyBhZ2dybyBzdGF0ZVxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgbGV0IHsgcG9zaXRpb24sIHRoaW5nOiBtb25zdGVyIH0gPSBwbGFjZWRNb25zdGVyXHJcblxyXG4gICAgICAgIGNvbnN0IGxpZ2h0UmFkaXVzID0gdGhpcy5jYWxjTGlnaHRSYWRpdXMoKVxyXG4gICAgICAgIGlmIChtb25zdGVyLnN0YXRlICE9PSBybC5Nb25zdGVyU3RhdGUuYWdncm8gJiYgY2FuU2VlKG1hcCwgcG9zaXRpb24sIG1hcC5wbGF5ZXIucG9zaXRpb24sIGxpZ2h0UmFkaXVzKSkge1xyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvbiA9IDBcclxuICAgICAgICAgICAgbW9uc3Rlci5zdGF0ZSA9IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dyb1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIuc3RhdGUgPT09IHJsLk1vbnN0ZXJTdGF0ZS5hZ2dybyAmJiAhY2FuU2VlKG1hcCwgcG9zaXRpb24sIG1hcC5wbGF5ZXIucG9zaXRpb24sIGxpZ2h0UmFkaXVzKSkge1xyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvbiA9IDBcclxuICAgICAgICAgICAgbW9uc3Rlci5zdGF0ZSA9IHJsLk1vbnN0ZXJTdGF0ZS5pZGxlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdGlja01vbnN0ZXIobW9uc3RlclBvc2l0aW9uOiBnZW8uUG9pbnQsIG1vbnN0ZXI6IHJsLk1vbnN0ZXIpIHtcclxuICAgICAgICAvLyBpZiBwbGF5ZXIgaXMgd2l0aGluIHJlYWNoIChhbmQgYWxpdmUpLCBhdHRhY2tcclxuICAgICAgICBsZXQgeyBwb3NpdGlvbjogcGxheWVyUG9zaXRpb24sIHRoaW5nOiBwbGF5ZXIgfSA9IHRoaXMubWFwLnBsYXllclxyXG5cclxuICAgICAgICAvLyBmaXJzdCBhdHRlbXB0IHRvIGF0dGFja1xyXG4gICAgICAgIGlmIChwbGF5ZXIuaGVhbHRoID4gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBkaXN0YW5jZVRvUGxheWVyID0gZ2VvLmNhbGNNYW5oYXR0ZW5EaXN0KHBsYXllclBvc2l0aW9uLCBtb25zdGVyUG9zaXRpb24pXHJcbiAgICAgICAgICAgIGNvbnN0IGF0dGFja3MgPSBtb25zdGVyLmF0dGFja3MuZmlsdGVyKGEgPT4gYS5yYW5nZSA+PSBkaXN0YW5jZVRvUGxheWVyKVxyXG4gICAgICAgICAgICBpZiAoYXR0YWNrcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhdHRhY2sgPSByYW5kLmNob29zZSh0aGlzLnJuZywgYXR0YWNrcylcclxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc01vbnN0ZXJBdHRhY2sobW9uc3RlciwgYXR0YWNrKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGRldGVybWluZSB3aGV0aGVyIG1vbnN0ZXIgY2FuIHNlZSBwbGF5ZXJcclxuICAgICAgICAvLyBzZWVrIGFuZCBkZXN0cm95XHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBjb25zdCBwYXRoID0gbWFwcy5maW5kUGF0aChtYXAsIG1vbnN0ZXJQb3NpdGlvbiwgcGxheWVyUG9zaXRpb24pXHJcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIC8vIHBhc3NcclxuICAgICAgICAgICAgbW9uc3Rlci5hY3Rpb24gPSAwXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBwYXRoWzBdXHJcbiAgICAgICAgaWYgKG1hcC5pc1Bhc3NhYmxlKHBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvbiAtPSAxXHJcbiAgICAgICAgICAgIHRoaXMubWFwLm1vbnN0ZXJzLnNldChwb3NpdGlvbiwgbW9uc3RlcilcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBtb25zdGVyLmFjdGlvbiA9IDBcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVSZXNpemUoKSB7XHJcbiAgICAgICAgY29uc3QgY2FudmFzID0gdGhpcy5jYW52YXNcclxuICAgICAgICBpZiAoY2FudmFzLndpZHRoID09PSBjYW52YXMuY2xpZW50V2lkdGggJiYgY2FudmFzLmhlaWdodCA9PT0gY2FudmFzLmNsaWVudEhlaWdodCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUlucHV0KCkge1xyXG4gICAgICAgIGNvbnN0IGlucCA9IHRoaXMuaW5wXHJcblxyXG4gICAgICAgIC8vIHRhcmdldFxyXG4gICAgICAgIGlmICh0aGlzLmN1cnNvclBvc2l0aW9uICYmIChpbnAucHJlc3NlZChpbnB1dC5LZXkuRW50ZXIpIHx8IGlucC5wcmVzc2VkKFwiIFwiKSkpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVDdXJzb3JUYXJnZXQoKVxyXG4gICAgICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGN0cmwta2V5IGN1cnNvciBtb3ZlbWVudFxyXG4gICAgICAgIGlmICh0aGlzLmhhbmRsZUN1cnNvcktleWJvYXJkTW92ZW1lbnQoKSkge1xyXG4gICAgICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhhbmRsZVBsYXllcktleWJvYXJkTW92ZW1lbnQoKSkge1xyXG4gICAgICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGNsaWNrIG9uIG9iamVjdFxyXG4gICAgICAgIGlmICh0aGlzLmhhbmRsZUNsaWNrKCkpIHtcclxuICAgICAgICAgICAgaW5wLmZsdXNoKClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpbnAuZmx1c2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlQ3Vyc29yS2V5Ym9hcmRNb3ZlbWVudCgpOiBib29sZWFuIHtcclxuICAgICAgICBjb25zdCBpbnAgPSB0aGlzLmlucFxyXG4gICAgICAgIGlmICghaW5wLmhlbGQoaW5wdXQuS2V5LkNvbnRyb2wpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgeyBwb3NpdGlvbjogcGxheWVyUG9zaXRpb24sIHRoaW5nOiBwbGF5ZXIgfSA9IHRoaXMubWFwLnBsYXllclxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuY3Vyc29yUG9zaXRpb24pIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJzb3JQb3NpdGlvbiA9IHBsYXllclBvc2l0aW9uLmNsb25lKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcIndcIikgfHwgaW5wLnByZXNzZWQoXCJXXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dVcFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnNvclBvc2l0aW9uLnkgLT0gMVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGlucC5wcmVzc2VkKFwic1wiKSB8fCBpbnAucHJlc3NlZChcIlNcIikgfHwgaW5wLnByZXNzZWQoXCJBcnJvd0Rvd25cIikpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJzb3JQb3NpdGlvbi55ICs9IDFcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcImFcIikgfHwgaW5wLnByZXNzZWQoXCJBXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dMZWZ0XCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3Vyc29yUG9zaXRpb24ueCAtPSAxXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaW5wLnByZXNzZWQoXCJkXCIpIHx8IGlucC5wcmVzc2VkKFwiRFwiKSB8fCBpbnAucHJlc3NlZChcIkFycm93UmlnaHRcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJzb3JQb3NpdGlvbi54ICs9IDFcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcIiBcIikpIHtcclxuICAgICAgICAgICAgcGxheWVyLmFjdGlvblJlc2VydmUgKz0gcGxheWVyLmFjdGlvblxyXG4gICAgICAgICAgICBwbGF5ZXIuYWN0aW9uID0gMFxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVDbGljaygpOiBib29sZWFuIHtcclxuICAgICAgICAvLyBkZXRlcm1pbmUgdGhlIG1hcCBjb29yZGluYXRlcyB0aGUgdXNlciBjbGlja2VkIG9uXHJcbiAgICAgICAgY29uc3QgaW5wID0gdGhpcy5pbnBcclxuXHJcbiAgICAgICAgaWYgKCFpbnAubW91c2VMZWZ0UmVsZWFzZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5oYW5kbGVUYXJnZXRDb21tYW5kQ2xpY2soKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbXh5ID0gdGhpcy5jYW52YXNUb01hcFBvaW50KG5ldyBnZW8uUG9pbnQoaW5wLm1vdXNlWCwgaW5wLm1vdXNlWSkpXHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5tYXBcclxuICAgICAgICBjb25zdCB7IHBvc2l0aW9uOiBwbGF5ZXJQb3NpdGlvbiwgdGhpbmc6IHBsYXllciB9ID0gdGhpcy5tYXAucGxheWVyXHJcblxyXG4gICAgICAgIGNvbnN0IGNsaWNrRml4dHVyZSA9IG1hcC5maXh0dXJlQXQobXh5KVxyXG4gICAgICAgIGlmIChjbGlja0ZpeHR1cmUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYFlvdSBzZWUgJHtjbGlja0ZpeHR1cmUubmFtZX1gKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY2xpY2tNb25zdGVyID0gbWFwLm1vbnN0ZXJBdChteHkpXHJcbiAgICAgICAgLy8gZmlyc3QsIHRyeSBtZWxlZVxyXG4gICAgICAgIGlmIChjbGlja01vbnN0ZXIpIHtcclxuICAgICAgICAgICAgY29uc3QgZGlzdCA9IGdlby5jYWxjTWFuaGF0dGVuRGlzdChwbGF5ZXJQb3NpdGlvbiwgbXh5KVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImRpc3Q6XCIsIGRpc3QpXHJcbiAgICAgICAgICAgIGlmIChkaXN0IDw9IChwbGF5ZXIubWVsZWVXZWFwb24/LnJhbmdlID8/IDApKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NQbGF5ZXJNZWxlZUF0dGFjayhjbGlja01vbnN0ZXIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZGlzdCA8PSAocGxheWVyLnJhbmdlZFdlYXBvbj8ucmFuZ2UgPz8gMCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1BsYXllclJhbmdlZEF0dGFjayhjbGlja01vbnN0ZXIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgWW91IHNlZSAke2NsaWNrTW9uc3Rlci5uYW1lfWApXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBkeHkgPSBteHkuc3ViUG9pbnQocGxheWVyUG9zaXRpb24pXHJcbiAgICAgICAgY29uc3Qgc2duID0gZHh5LnNpZ24oKVxyXG4gICAgICAgIGNvbnN0IGFicyA9IGR4eS5hYnMoKVxyXG5cclxuICAgICAgICBpZiAoYWJzLnggPiAwICYmIGFicy54ID49IGFicy55KSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlTW92ZShzZ24ueCA+IDAgPyBEaXJlY3Rpb24uRWFzdCA6IERpcmVjdGlvbi5XZXN0KVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGFicy55ID4gMCAmJiBhYnMueSA+IGFicy54KSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlTW92ZShzZ24ueSA+IDAgPyBEaXJlY3Rpb24uU291dGggOiBEaXJlY3Rpb24uTm9ydGgpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZVBsYXllcktleWJvYXJkTW92ZW1lbnQoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgbGV0IGlucCA9IHRoaXMuaW5wXHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcIndcIikgfHwgaW5wLnByZXNzZWQoXCJXXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dVcFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1vdmUoRGlyZWN0aW9uLk5vcnRoKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGlucC5wcmVzc2VkKFwic1wiKSB8fCBpbnAucHJlc3NlZChcIlNcIikgfHwgaW5wLnByZXNzZWQoXCJBcnJvd0Rvd25cIikpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVNb3ZlKERpcmVjdGlvbi5Tb3V0aClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcImFcIikgfHwgaW5wLnByZXNzZWQoXCJBXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dMZWZ0XCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlTW92ZShEaXJlY3Rpb24uV2VzdClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbnAucHJlc3NlZChcImRcIikgfHwgaW5wLnByZXNzZWQoXCJEXCIpIHx8IGlucC5wcmVzc2VkKFwiQXJyb3dSaWdodFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1vdmUoRGlyZWN0aW9uLkVhc3QpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZU1vdmUoZGlyOiBEaXJlY3Rpb24pIHtcclxuICAgICAgICAvLyBjbGVhciBjdXJzb3Igb24gbW92ZW1lbnRcclxuICAgICAgICB0aGlzLmN1cnNvclBvc2l0aW9uID0gdW5kZWZpbmVkXHJcbiAgICAgICAgY29uc3QgeyBwb3NpdGlvbjogcGxheWVyUG9zaXRpb24sIHRoaW5nOiBwbGF5ZXIgfSA9IHRoaXMubWFwLnBsYXllclxyXG5cclxuICAgICAgICBsZXQgbmV3UG9zaXRpb24gPSBwbGF5ZXJQb3NpdGlvbi5hZGRQb2ludChkaXJlY3Rpb25WZWN0b3IoZGlyKSlcclxuICAgICAgICBpZiAoIXRoaXMubWFwLmluQm91bmRzKG5ld1Bvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgY29uc3QgdGlsZSA9IG1hcC50aWxlQXQobmV3UG9zaXRpb24pXHJcbiAgICAgICAgaWYgKHRpbGUgJiYgIXRpbGUucGFzc2FibGUpIHtcclxuICAgICAgICAgICAgb3V0cHV0LmluZm8oYEJsb2NrZWQgYnkgJHt0aWxlLm5hbWV9YClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtb25zdGVyID0gbWFwLm1vbnN0ZXJBdChuZXdQb3NpdGlvbilcclxuICAgICAgICBpZiAobW9uc3Rlcikge1xyXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NQbGF5ZXJNZWxlZUF0dGFjayhtb25zdGVyKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IG1hcC5jb250YWluZXJBdChuZXdQb3NpdGlvbilcclxuICAgICAgICBpZiAoY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyRGlhbG9nLnNob3cobWFwLCBjb250YWluZXIpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZml4dHVyZSA9IG1hcC5maXh0dXJlQXQobmV3UG9zaXRpb24pXHJcbiAgICAgICAgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5Eb29yKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGAke2ZpeHR1cmUubmFtZX0gb3BlbmVkYClcclxuICAgICAgICAgICAgdGhpcy5tYXAuZml4dHVyZXMuZGVsZXRlKGZpeHR1cmUpXHJcbiAgICAgICAgICAgIHBsYXllci5hY3Rpb24gLT0gMVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9IGVsc2UgaWYgKGZpeHR1cmUgaW5zdGFuY2VvZiBybC5FeGl0KSB7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlRXhpdChmaXh0dXJlLmRpcmVjdGlvbilcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfSBlbHNlIGlmIChmaXh0dXJlICYmICFmaXh0dXJlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBDYW4ndCBtb3ZlIHRoYXQgd2F5LCBibG9ja2VkIGJ5ICR7Zml4dHVyZS5uYW1lfWApXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWFwLnBsYXllci5wb3NpdGlvbiA9IG5ld1Bvc2l0aW9uXHJcbiAgICAgICAgcGxheWVyLmFjdGlvbiAtPSAxXHJcbiAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5KClcclxuXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVDdXJzb3JUYXJnZXQoKSB7XHJcbiAgICAgICAgY29uc3QgY3Vyc29yUG9zaXRpb24gPSB0aGlzLmN1cnNvclBvc2l0aW9uXHJcbiAgICAgICAgaWYgKCFjdXJzb3JQb3NpdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubWFwXHJcbiAgICAgICAgY29uc3QgdGlsZSA9IG1hcC50aWxlQXQoY3Vyc29yUG9zaXRpb24pXHJcblxyXG4gICAgICAgIGlmICghdGlsZSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbygnTm90aGluZyBoZXJlJylcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobWFwLnZpc2liaWxpdHlBdChjdXJzb3JQb3NpdGlvbikgIT09IG1hcHMuVmlzaWJpbGl0eS5WaXNpYmxlKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBUYXJnZXQgbm90IHZpc2libGVgKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHsgcG9zaXRpb246IHBsYXllclBvc2l0aW9uLCB0aGluZzogcGxheWVyIH0gPSB0aGlzLm1hcC5wbGF5ZXJcclxuICAgICAgICBjb25zdCBkaXN0VG9UYXJnZXQgPSBnZW8uY2FsY01hbmhhdHRlbkRpc3QocGxheWVyUG9zaXRpb24sIGN1cnNvclBvc2l0aW9uKVxyXG4gICAgICAgIGNvbnN0IG1vbnN0ZXIgPSBtYXAubW9uc3RlckF0KGN1cnNvclBvc2l0aW9uKVxyXG5cclxuICAgICAgICBpZiAobW9uc3RlciAmJiBkaXN0VG9UYXJnZXQgPD0gMSkge1xyXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NQbGF5ZXJNZWxlZUF0dGFjayhtb25zdGVyKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChtb25zdGVyICYmIGRpc3RUb1RhcmdldCA+IDEgJiYgcGxheWVyLnJhbmdlZFdlYXBvbikge1xyXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NQbGF5ZXJSYW5nZWRBdHRhY2sobW9uc3RlcilcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb250YWluZXIgPSBtYXAuY29udGFpbmVyQXQoY3Vyc29yUG9zaXRpb24pXHJcbiAgICAgICAgaWYgKGNvbnRhaW5lciAmJiBkaXN0VG9UYXJnZXQgPD0gMSkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lckRpYWxvZy5zaG93KG1hcCwgY29udGFpbmVyKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGZpeHR1cmUgPSBtYXAuZml4dHVyZUF0KGN1cnNvclBvc2l0aW9uKVxyXG4gICAgICAgIGlmIChmaXh0dXJlIGluc3RhbmNlb2YgcmwuRG9vciAmJiBkaXN0VG9UYXJnZXQgPD0gMSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuaW5mbyhgJHtmaXh0dXJlLm5hbWV9IG9wZW5lZGApXHJcbiAgICAgICAgICAgIHRoaXMubWFwLmZpeHR1cmVzLmRlbGV0ZShmaXh0dXJlKVxyXG4gICAgICAgICAgICBwbGF5ZXIuYWN0aW9uIC09IDFcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBsYXN0bHkgLSBwZXJmb3JtIGEgbG9va1xyXG4gICAgICAgIGZvciAoY29uc3QgdGggb2YgdGhpcy5tYXAuYXQoY3Vyc29yUG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgIG91dHB1dC5pbmZvKGBZb3Ugc2VlICR7dGgubmFtZX1gKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZVRhcmdldENvbW1hbmRDbGljaygpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaW5wLm1vdXNlTGVmdFJlbGVhc2VkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMudGFyZ2V0Q29tbWFuZCA9PT0gVGFyZ2V0Q29tbWFuZC5Ob25lKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY3h5ID0gbmV3IGdlby5Qb2ludCh0aGlzLmlucC5tb3VzZVgsIHRoaXMuaW5wLm1vdXNlWSlcclxuICAgICAgICBjb25zdCBteHkgPSB0aGlzLmNhbnZhc1RvTWFwUG9pbnQoY3h5KVxyXG5cclxuICAgICAgICBjb25zdCBsaWdodFJhZGl1cyA9IHRoaXMuY2FsY0xpZ2h0UmFkaXVzKClcclxuICAgICAgICBpZiAoIWNhblNlZSh0aGlzLm1hcCwgdGhpcy5tYXAucGxheWVyLnBvc2l0aW9uLCBteHksIGxpZ2h0UmFkaXVzKSkge1xyXG4gICAgICAgICAgICBvdXRwdXQuZXJyb3IoYENhbid0IHNlZSFgKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3dpdGNoICh0aGlzLnRhcmdldENvbW1hbmQpIHtcclxuICAgICAgICAgICAgY2FzZSBUYXJnZXRDb21tYW5kLkxvb2s6IHtcclxuICAgICAgICAgICAgICAgIC8vIHNob3cgd2hhdCB1c2VyIGNsaWNrZWQgb25cclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdGggb2YgdGhpcy5tYXAuYXQobXh5KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5pbmZvKGBZb3Ugc2VlICR7dGgubmFtZX1gKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUYXJnZXRDb21tYW5kLkF0dGFjazoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbW9uc3RlciA9IHRoaXMubWFwLm1vbnN0ZXJBdChteHkpXHJcbiAgICAgICAgICAgICAgICBpZiAobW9uc3Rlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1BsYXllck1lbGVlQXR0YWNrKG1vbnN0ZXIpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5pbmZvKFwiTm90aGluZyB0byBhdHRhY2sgaGVyZS5cIilcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVGFyZ2V0Q29tbWFuZC5TaG9vdDoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbW9uc3RlciA9IHRoaXMubWFwLm1vbnN0ZXJBdChteHkpXHJcbiAgICAgICAgICAgICAgICBpZiAobW9uc3Rlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1BsYXllclJhbmdlZEF0dGFjayhtb25zdGVyKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuaW5mbyhcIk5vdGhpbmcgdG8gc2hvb3QgaGVyZS5cIilcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuTm9uZVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVWaXNpYmlsaXR5KCkge1xyXG4gICAgICAgIC8vIHVwZGF0ZSB2aXNpYmlsaXR5IGFyb3VuZCBwbGF5ZXJcclxuICAgICAgICAvLyBsaW1pdCByYWRpdXMgdG8gdmlzaWJsZSB2aWV3cG9ydCBhcmVhXHJcbiAgICAgICAgY29uc3Qgdmlld3BvcnRMaWdodFJhZGl1cyA9IE1hdGgubWF4KE1hdGguY2VpbCh0aGlzLmNhbnZhcy53aWR0aCAvIHRoaXMudGlsZVNpemUpLCBNYXRoLmNlaWwodGhpcy5jYW52YXMuaGVpZ2h0IC8gdGhpcy50aWxlU2l6ZSkpXHJcbiAgICAgICAgdGhpcy5tYXAudXBkYXRlVmlzaWJsZSh2aWV3cG9ydExpZ2h0UmFkaXVzKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FsY01hcFZpZXdwb3J0KCk6IGdlby5BQUJCIHtcclxuICAgICAgICBjb25zdCBhYWJiID0gbmV3IGdlby5BQUJCKFxyXG4gICAgICAgICAgICB0aGlzLmNhbnZhc1RvTWFwUG9pbnQobmV3IGdlby5Qb2ludCgwLCAwKSksXHJcbiAgICAgICAgICAgIHRoaXMuY2FudmFzVG9NYXBQb2ludChuZXcgZ2VvLlBvaW50KHRoaXMuY2FudmFzLndpZHRoICsgdGhpcy50aWxlU2l6ZSwgdGhpcy5jYW52YXMuaGVpZ2h0ICsgdGhpcy50aWxlU2l6ZSkpKVxyXG4gICAgICAgICAgICAuaW50ZXJzZWN0aW9uKG5ldyBnZW8uQUFCQihuZXcgZ2VvLlBvaW50KDAsIDApLCBuZXcgZ2VvLlBvaW50KHRoaXMubWFwLndpZHRoLCB0aGlzLm1hcC5oZWlnaHQpKSlcclxuXHJcbiAgICAgICAgcmV0dXJuIGFhYmJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNhbGNMaWdodFJhZGl1cygpOiBudW1iZXIge1xyXG4gICAgICAgIGNvbnN0IHZpZXdwb3J0TGlnaHRSYWRpdXMgPSBNYXRoLm1heChNYXRoLmNlaWwodGhpcy5jYW52YXMud2lkdGggLyB0aGlzLnRpbGVTaXplKSwgTWF0aC5jZWlsKHRoaXMuY2FudmFzLmhlaWdodCAvIHRoaXMudGlsZVNpemUpKVxyXG4gICAgICAgIGlmICh0aGlzLm1hcC5saWdodGluZyA9PT0gbWFwcy5MaWdodGluZy5BbWJpZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2aWV3cG9ydExpZ2h0UmFkaXVzXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gTWF0aC5taW4odmlld3BvcnRMaWdodFJhZGl1cywgdGhpcy5tYXAucGxheWVyLnRoaW5nLmxpZ2h0UmFkaXVzKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd0ZyYW1lKCkge1xyXG4gICAgICAgIC8vIGNlbnRlciB0aGUgZ3JpZCBhcm91bmQgdGhlIHBsYXllcmRcclxuICAgICAgICBjb25zdCB2aWV3cG9ydEFBQkIgPSB0aGlzLmNhbGNNYXBWaWV3cG9ydCgpXHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gdGhpcy5nZXRTY3JvbGxPZmZzZXQoKVxyXG5cclxuICAgICAgICAvLyBub3RlIC0gZHJhd2luZyBvcmRlciBtYXR0ZXJzIC0gZHJhdyBmcm9tIGJvdHRvbSB0byB0b3BcclxuICAgICAgICBpZiAodGhpcy50YXJnZXRDb21tYW5kICE9PSBUYXJnZXRDb21tYW5kLk5vbmUpIHtcclxuICAgICAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuY3Vyc29yID0gXCJjcm9zc2hhaXJcIlxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2FudmFzLnN0eWxlLmN1cnNvciA9IFwiXCJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2hvb3RCdXR0b24uZGlzYWJsZWQgPSAhdGhpcy5tYXAucGxheWVyLnRoaW5nLnJhbmdlZFdlYXBvblxyXG5cclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLm1hcFxyXG4gICAgICAgIGNvbnN0IHRpbGVzID0gbWFwLnRpbGVzLndpdGhpbih2aWV3cG9ydEFBQkIpXHJcbiAgICAgICAgY29uc3QgZml4dHVyZXMgPSBtYXAuZml4dHVyZXMud2l0aGluKHZpZXdwb3J0QUFCQilcclxuICAgICAgICBjb25zdCBjb250YWluZXJzID0gbWFwLmNvbnRhaW5lcnMud2l0aGluKHZpZXdwb3J0QUFCQilcclxuICAgICAgICBjb25zdCBtb25zdGVycyA9IG1hcC5tb25zdGVycy53aXRoaW4odmlld3BvcnRBQUJCKVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHRpbGUgb2YgdGlsZXMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCB0aWxlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBmaXh0dXJlIG9mIGZpeHR1cmVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgZml4dHVyZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgY29udGFpbmVyIG9mIGNvbnRhaW5lcnMpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmF3VGhpbmcob2Zmc2V0LCBjb250YWluZXIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGNyZWF0dXJlIG9mIG1vbnN0ZXJzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhd1RoaW5nKG9mZnNldCwgY3JlYXR1cmUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRyYXdUaGluZyhvZmZzZXQsIHRoaXMubWFwLnBsYXllcilcclxuICAgICAgICB0aGlzLmRyYXdIZWFsdGhCYXIob2Zmc2V0LCB0aGlzLm1hcC5wbGF5ZXIpXHJcbiAgICAgICAgdGhpcy5kcmF3Q3Vyc29yKG9mZnNldClcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5mbHVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkcmF3VGhpbmcob2Zmc2V0OiBnZW8uUG9pbnQsIHBsYWNlZFRoaW5nOiBtYXBzLlBsYWNlZDxybC5UaGluZz4pIHtcclxuICAgICAgICBjb25zdCB7IHBvc2l0aW9uLCB0aGluZyB9ID0gcGxhY2VkVGhpbmdcclxuICAgICAgICBjb25zdCB2aXNpYmxlID0gdGhpcy5tYXAudmlzaWJpbGl0eUF0KHBvc2l0aW9uKVxyXG4gICAgICAgIGNvbnN0IHNlZW4gPSB0aGlzLm1hcC5zZWVuQXQocG9zaXRpb24pXHJcbiAgICAgICAgY29uc3QgZm9nID0gKHZpc2libGUgPT09IG1hcHMuVmlzaWJpbGl0eS5Ob25lIHx8IHZpc2libGUgPT09IG1hcHMuVmlzaWJpbGl0eS5EYXJrKVxyXG4gICAgICAgICAgICAmJiBzZWVuXHJcbiAgICAgICAgICAgICYmICh0aGluZyBpbnN0YW5jZW9mIHJsLlRpbGUgfHwgdGhpbmcgaW5zdGFuY2VvZiBybC5GaXh0dXJlKVxyXG5cclxuICAgICAgICBpZiAoKHZpc2libGUgPT09IG1hcHMuVmlzaWJpbGl0eS5Ob25lIHx8IHZpc2libGUgPT0gbWFwcy5WaXNpYmlsaXR5LkRhcmspICYmICFmb2cpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb2xvciA9IHRoaW5nLmNvbG9yLmNsb25lKClcclxuICAgICAgICBpZiAoZm9nKSB7XHJcbiAgICAgICAgICAgIGNvbG9yLmEgPSAuMjVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZHJhd0ltYWdlKG9mZnNldCwgcG9zaXRpb24sIHRoaW5nLmltYWdlLCBjb2xvcilcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyYXdDdXJzb3Iob2Zmc2V0OiBnZW8uUG9pbnQpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY3Vyc29yUG9zaXRpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRyYXdJbWFnZShvZmZzZXQsIHRoaXMuY3Vyc29yUG9zaXRpb24sIFwiLi9hc3NldHMvY3Vyc29yLnBuZ1wiLCBnZnguQ29sb3IucmVkKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd0ltYWdlKG9mZnNldDogZ2VvLlBvaW50LCBwb3NpdGlvbjogZ2VvLlBvaW50LCBpbWFnZTogc3RyaW5nLCBjb2xvcjogZ2Z4LkNvbG9yID0gZ2Z4LkNvbG9yLndoaXRlKSB7XHJcbiAgICAgICAgY29uc3Qgc3ByaXRlUG9zaXRpb24gPSBwb3NpdGlvbi5tdWxTY2FsYXIodGhpcy50aWxlU2l6ZSkuYWRkUG9pbnQob2Zmc2V0KVxyXG4gICAgICAgIGNvbnN0IGxheWVyID0gdGhpcy5pbWFnZU1hcC5nZXQoaW1hZ2UpXHJcblxyXG4gICAgICAgIGlmIChsYXllciA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBpbWFnZSBtYXBwaW5nOiAke2ltYWdlfWApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzcHJpdGUgPSBuZXcgZ2Z4LlNwcml0ZSh7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBzcHJpdGVQb3NpdGlvbixcclxuICAgICAgICAgICAgY29sb3IsXHJcbiAgICAgICAgICAgIHdpZHRoOiB0aGlzLnRpbGVTaXplLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IHRoaXMudGlsZVNpemUsXHJcbiAgICAgICAgICAgIHRleHR1cmU6IHRoaXMudGV4dHVyZSxcclxuICAgICAgICAgICAgbGF5ZXI6IGxheWVyLFxyXG4gICAgICAgICAgICBmbGFnczogZ2Z4LlNwcml0ZUZsYWdzLkFycmF5VGV4dHVyZVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd1Nwcml0ZShzcHJpdGUpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkcmF3SGVhbHRoQmFyKG9mZnNldDogZ2VvLlBvaW50LCBwbGFjZWRDcmVhdHVyZTogbWFwcy5QbGFjZWQ8cmwuQ3JlYXR1cmU+KSB7XHJcbiAgICAgICAgY29uc3QgeyBwb3NpdGlvbiwgdGhpbmc6IGNyZWF0dXJlIH0gPSBwbGFjZWRDcmVhdHVyZVxyXG4gICAgICAgIGNvbnN0IGhlYWx0aCA9IE1hdGgubWF4KGNyZWF0dXJlLmhlYWx0aCwgMClcclxuICAgICAgICBjb25zdCBib3JkZXJXaWR0aCA9IGhlYWx0aCAqIDQgKyAyXHJcbiAgICAgICAgY29uc3QgaW50ZXJpb3JXaWR0aCA9IGhlYWx0aCAqIDRcclxuICAgICAgICBjb25zdCBzcHJpdGVQb3NpdGlvbiA9IHBvc2l0aW9uLm11bFNjYWxhcih0aGlzLnRpbGVTaXplKS5hZGRQb2ludChvZmZzZXQpLnN1YlBvaW50KG5ldyBnZW8uUG9pbnQoMCwgdGhpcy50aWxlU2l6ZSAvIDIpKVxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd1Nwcml0ZShuZXcgZ2Z4LlNwcml0ZSh7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBzcHJpdGVQb3NpdGlvbixcclxuICAgICAgICAgICAgY29sb3I6IGdmeC5Db2xvci53aGl0ZSxcclxuICAgICAgICAgICAgd2lkdGg6IGJvcmRlcldpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IDhcclxuICAgICAgICB9KSlcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3U3ByaXRlKG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHNwcml0ZVBvc2l0aW9uLmFkZFBvaW50KG5ldyBnZW8uUG9pbnQoMSwgMSkpLFxyXG4gICAgICAgICAgICBjb2xvcjogZ2Z4LkNvbG9yLnJlZCxcclxuICAgICAgICAgICAgd2lkdGg6IGludGVyaW9yV2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodDogNlxyXG4gICAgICAgIH0pKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGlkZURpYWxvZ3MoKSB7XHJcbiAgICAgICAgdGhpcy5pbnZlbnRvcnlEaWFsb2cuaGlkZSgpXHJcbiAgICAgICAgdGhpcy5zdGF0c0RpYWxvZy5oaWRlKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCB0aWxlU2l6ZSgpIHtcclxuICAgICAgICByZXR1cm4gcmwudGlsZVNpemUgKiB0aGlzLnpvb21cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUtleURvd24oZXY6IEtleWJvYXJkRXZlbnQpIHtcclxuICAgICAgICBjb25zdCBrZXkgPSBldi5rZXkudG9VcHBlckNhc2UoKVxyXG5cclxuICAgICAgICBzd2l0Y2ggKGtleSkge1xyXG4gICAgICAgICAgICBjYXNlIFwiSVwiOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB3YXNIaWRkZW4gPSB0aGlzLmludmVudG9yeURpYWxvZy5oaWRkZW5cclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZURpYWxvZ3MoKVxyXG4gICAgICAgICAgICAgICAgaWYgKHdhc0hpZGRlbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW52ZW50b3J5RGlhbG9nLnNob3coKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIlpcIjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgd2FzSGlkZGVuID0gdGhpcy5zdGF0c0RpYWxvZy5oaWRkZW5cclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZURpYWxvZ3MoKVxyXG4gICAgICAgICAgICAgICAgaWYgKHdhc0hpZGRlbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdHNEaWFsb2cuc2hvdygpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIFwiTFwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5Mb29rXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIkVOVEVSXCI6XHJcbiAgICAgICAgICAgICAgICBpZiAoZXYuY3RybEtleSAmJiB0aGlzLm1hcC5wbGF5ZXIudGhpbmcucmFuZ2VkV2VhcG9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5TaG9vdFxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhcmdldENvbW1hbmQgPSBUYXJnZXRDb21tYW5kLkF0dGFja1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgXCJFU0NBUEVcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0Q29tbWFuZCA9IFRhcmdldENvbW1hbmQuTm9uZVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJzb3JQb3NpdGlvbiA9IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFU0NBUEVcIilcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIFwiTFwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy50YXJnZXRDb21tYW5kID0gVGFyZ2V0Q29tbWFuZC5Mb29rXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIj1cIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuem9vbSA9IE1hdGgubWluKHRoaXMuem9vbSAqIDIsIDE2KVxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5KClcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIFwiLVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy56b29tID0gTWF0aC5tYXgodGhpcy56b29tIC8gMiwgLjEyNSlcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eSgpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNhdmVTdGF0ZSgpIHtcclxuICAgICAgICAvLyBzYXZlIHRoZSBjdXJyZW50IGdhbWUgc3RhdGVcclxuICAgICAgICB2YXIgc3RhdGU6IEFwcFNhdmVTdGF0ZSA9IHtcclxuICAgICAgICAgICAgcm5nOiB0aGlzLnJuZy5zYXZlKCksXHJcbiAgICAgICAgICAgIGZsb29yOiB0aGlzLmZsb29yLFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QganNvblN0YXRlID0gSlNPTi5zdHJpbmdpZnkoc3RhdGUpXHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oU1RPUkFHRV9LRVksIGpzb25TdGF0ZSlcclxuXHJcbiAgICAgICAgdGhpcy5zYXZlTWFwKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNhdmVNYXAoKSB7XHJcbiAgICAgICAgY29uc3Qgc3RhdGUgPSB0aGlzLm1hcC5zYXZlKClcclxuICAgICAgICBjb25zdCBqc29uU3RhdGUgPSBKU09OLnN0cmluZ2lmeShzdGF0ZSlcclxuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShgJHtTVE9SQUdFX0tFWX1fTUFQXyR7dGhpcy5mbG9vcn1gLCBqc29uU3RhdGUpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVFeGl0KGRpcjogcmwuRXhpdERpcmVjdGlvbikge1xyXG4gICAgICAgIGlmIChkaXIgPT0gcmwuRXhpdERpcmVjdGlvbi5VcCAmJiB0aGlzLmZsb29yID09IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5zaG9wRGlhbG9nLnNob3coKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN3aXRjaCAoZGlyKSB7XHJcbiAgICAgICAgICAgIGNhc2UgcmwuRXhpdERpcmVjdGlvbi5VcDpcclxuICAgICAgICAgICAgICAgIHRoaXMuZmxvb3IgLT0gMVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgICAgY2FzZSBybC5FeGl0RGlyZWN0aW9uLkRvd246XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZsb29yICs9IDFcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5nZW5lcmF0ZU1hcChkaXIpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZU1hcChkaXI6IHJsLkV4aXREaXJlY3Rpb24pIHtcclxuICAgICAgICB0aGlzLm1hcCA9IGF3YWl0IGdlbi5nZW5lcmF0ZUR1bmdlb25MZXZlbCh0aGlzLnJuZywgdGhpbmdzLmRiLCB0aGlzLm1hcC5wbGF5ZXIudGhpbmcsIHRoaXMuZmxvb3IsIGRpcilcclxuICAgICAgICBjb25zdCBbdGV4dHVyZSwgaW1hZ2VNYXBdID0gYXdhaXQgbG9hZEltYWdlcyh0aGlzLnJlbmRlcmVyLCB0aGlzLm1hcClcclxuICAgICAgICB0aGlzLnRleHR1cmUgPSB0ZXh0dXJlXHJcbiAgICAgICAgdGhpcy5pbWFnZU1hcCA9IGltYWdlTWFwXHJcbiAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5KClcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgYXN5bmMgbG9hZChyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyKTogUHJvbWlzZTxBcHAgfCBudWxsPiB7XHJcbiAgICAgICAgY29uc3QganNvbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFNUT1JBR0VfS0VZKVxyXG4gICAgICAgIGlmICghanNvbikge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBKU09OLnBhcnNlKGpzb24pIGFzIEFwcFNhdmVTdGF0ZVxyXG4gICAgICAgIGNvbnN0IHJuZyA9IG5ldyByYW5kLlNGQzMyUk5HKC4uLnN0YXRlLnJuZylcclxuXHJcbiAgICAgICAgY29uc3QgbWFwID0gbG9hZE1hcChzdGF0ZS5mbG9vcilcclxuICAgICAgICBpZiAoIW1hcCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gbG9hZCBtYXAhXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBbdGV4dHVyZSwgaW1hZ2VNYXBdID0gYXdhaXQgbG9hZEltYWdlcyhyZW5kZXJlciwgbWFwKVxyXG4gICAgICAgIGNvbnN0IGFwcCA9IG5ldyBBcHAocm5nLCByZW5kZXJlciwgc3RhdGUuZmxvb3IsIG1hcCwgdGV4dHVyZSwgaW1hZ2VNYXApXHJcbiAgICAgICAgcmV0dXJuIGFwcFxyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgQXBwU2F2ZVN0YXRlIHtcclxuICAgIHJlYWRvbmx5IHJuZzogW251bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl1cclxuICAgIHJlYWRvbmx5IGZsb29yOiBudW1iZXJcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gbG9hZEltYWdlcyhyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBtYXA6IG1hcHMuTWFwKTogUHJvbWlzZTxbZ2Z4LlRleHR1cmUsIE1hcDxzdHJpbmcsIG51bWJlcj5dPiB7XHJcbiAgICAvLyBiYWtlIGFsbCAyNHgyNCB0aWxlIGltYWdlcyB0byBhIHNpbmdsZSBhcnJheSB0ZXh0dXJlXHJcbiAgICAvLyBzdG9yZSBtYXBwaW5nIGZyb20gaW1hZ2UgdXJsIHRvIGluZGV4XHJcbiAgICBjb25zdCBpbWFnZVVybHMgPSBpdGVyLndyYXAobWFwLnRoaW5ncygpKS5tYXAodGggPT4gdGguaW1hZ2UpLmZpbHRlcigpLmRpc3RpbmN0KCkudG9BcnJheSgpXHJcbiAgICBpbWFnZVVybHMucHVzaChcIi4vYXNzZXRzL2N1cnNvci5wbmdcIilcclxuXHJcbiAgICBjb25zdCBpbWFnZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KGltYWdlVXJscy5tYXAoKHVybCwgaSkgPT4gW3VybCwgaV0pKVxyXG4gICAgY29uc3QgaW1hZ2VzID0gYXdhaXQgUHJvbWlzZS5hbGwoaW1hZ2VVcmxzLm1hcCh1cmwgPT4gZG9tLmxvYWRJbWFnZSh1cmwpKSlcclxuICAgIGNvbnN0IHRleHR1cmUgPSByZW5kZXJlci5iYWtlVGV4dHVyZUFycmF5KHJsLnRpbGVTaXplLCBybC50aWxlU2l6ZSwgaW1hZ2VzKVxyXG5cclxuICAgIHJldHVybiBbdGV4dHVyZSwgaW1hZ2VNYXBdXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRNYXAoZmxvb3I6IG51bWJlcik6IG1hcHMuTWFwIHwgbnVsbCB7XHJcbiAgICBjb25zdCBqc29uID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oYCR7U1RPUkFHRV9LRVl9X01BUF8ke2Zsb29yfWApXHJcbiAgICBpZiAoIWpzb24pIHtcclxuICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHN0YXRlID0gSlNPTi5wYXJzZShqc29uKSBhcyBtYXBzLk1hcFNhdmVTdGF0ZVxyXG4gICAgY29uc3QgbWFwID0gbWFwcy5NYXAubG9hZCh0aGluZ3MuZGIsIHN0YXRlKVxyXG4gICAgcmV0dXJuIG1hcFxyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhclN0YXRlKCk6IHZvaWQge1xyXG4gICAgY29uc3Qga2V5cyA9IG5ldyBBcnJheTxzdHJpbmc+KClcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbG9jYWxTdG9yYWdlLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3Qga2V5ID0gbG9jYWxTdG9yYWdlLmtleShpKVxyXG4gICAgICAgIGlmIChrZXk/LnN0YXJ0c1dpdGgoU1RPUkFHRV9LRVkpKSB7XHJcbiAgICAgICAgICAgIGtleXMucHVzaChrZXkpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgayBvZiBrZXlzKSB7XHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oaylcclxuICAgIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgIGNvbnN0IGFwcCA9IGF3YWl0IEFwcC5jcmVhdGUoKVxyXG4gICAgYXBwLmV4ZWMoKVxyXG59XHJcblxyXG5pbml0KCkiXX0=