import * as dom from "../shared/dom.js"
import * as iter from "../shared/iter.js"
import * as gfx from "./gfx.js"
import * as gen from "./gen.js"
import * as input from "../shared/input.js"
import * as rl from "./rl.js"
import * as geo from "../shared/geo2d.js"
import * as output from "./output.js"
import * as things from "./things.js"
import * as maps from "./maps.js"
import * as rand from "../shared/rand.js"
import * as math from "../shared/math.js"

const STORAGE_KEY = "crawl_storage"

const enum Direction {
    North,
    South,
    East,
    West
}

class Animation {
    private _position: geo.Point
    private _done: boolean

    constructor(
        private readonly startPosition: geo.Point,
        private readonly endPosition: geo.Point,
        private readonly startTime: DOMHighResTimeStamp,
        private readonly duration: DOMHighResTimeStamp) {
        this._position = startPosition
        this._done = false
    }

    update(time: DOMHighResTimeStamp) {
        const t = math.clamp(math.unlerp(this.startTime, this.startTime + this.duration, time), 0, 1)
        this._position = geo.lerp(this.startPosition, this.endPosition, t)
        this._done = t >= 1
    }

    get position(): geo.Point {
        return this._position
    }

    get done(): boolean {
        return this._done
    }
}

class Animations {
    private readonly animations = new Map<rl.Thing, Animation>()
    private readonly time: DOMHighResTimeStamp = 0

    insert(th: rl.Thing, startPosition: geo.Point, endPosition: geo.Point, duration: DOMHighResTimeStamp) {
        this.animations.set(th, new Animation(startPosition, endPosition, this.time, duration))
    }

    update(time: DOMHighResTimeStamp) {
        for (const anim of this.animations.values()) {
            anim.update(time)
        }

        this.time = time
    }

    position(th: rl.Thing): geo.Point | undefined {
        const anim = this.animations.get(th)
        return anim?.position
    }

    *processDone(): Generator<[rl.Thing, Animation]> {
        for (const [th, anim] of this.animations) {
            yield [th, anim]
            if (anim.done) {
                this.animations.delete(th)
            }
        }
    }

    get size(): number {
        return this.animations.size
    }
}

function directionVector(dir: Direction): geo.Point {
    switch (dir) {
        case Direction.North:
            return new geo.Point(0, -1)
        case Direction.South:
            return new geo.Point(0, 1)
        case Direction.East:
            return new geo.Point(1, 0)
        case Direction.West:
            return new geo.Point(-1, 0)
    }
}

class Dialog {
    private readonly modalBackground = dom.byId("modalBackground") as HTMLDivElement
    constructor(public readonly elem: HTMLElement, private readonly canvas: HTMLCanvasElement) { }

    show() {
        this.modalBackground.hidden = false
        this.elem.hidden = false
        this.elem.focus()
    }

    hide() {
        this.modalBackground.hidden = true
        this.elem.hidden = true
        this.canvas.focus()
    }

    get hidden() {
        return this.elem.hidden
    }

    toggle() {
        if (this.elem.hidden) {
            this.show()
        } else {
            this.hide()
        }
    }
}

class StatsDialog extends Dialog {
    private readonly openButton = dom.byId("statsButton")
    private readonly closeButton = dom.byId("statsCloseButton") as HTMLButtonElement

    constructor(private readonly player: rl.Player, canvas: HTMLCanvasElement) {
        super(dom.byId("statsDialog"), canvas)

        this.openButton.addEventListener("click", () => this.toggle())
        this.closeButton.addEventListener("click", () => this.hide())
        this.elem.addEventListener("keydown", ev => {
            const key = ev.key.toUpperCase()
            if (key === "ESCAPE") {
                this.hide()
            }
        })
    }

    show() {
        const player = this.player
        const healthSpan = dom.byId("statsHealth") as HTMLSpanElement
        const strengthSpan = dom.byId("statsStrength") as HTMLSpanElement
        const agilitySpan = dom.byId("statsAgility") as HTMLSpanElement
        const intelligenceSpan = dom.byId("statsIntelligence") as HTMLSpanElement
        const attackSpan = dom.byId("statsAttack") as HTMLSpanElement
        const damageSpan = dom.byId("statsDamage") as HTMLSpanElement
        const defenseSpan = dom.byId("statsDefense") as HTMLSpanElement
        const levelSpan = dom.byId("statsLevel") as HTMLSpanElement
        const experienceSpan = dom.byId("statsExperience") as HTMLSpanElement
        const goldSpan = dom.byId("statsGold") as HTMLSpanElement
        const experienceRequirement = rl.getExperienceRequirement(player.level + 1)

        healthSpan.textContent = `${player.health} / ${player.maxHealth}`
        strengthSpan.textContent = `${player.strength}`
        agilitySpan.textContent = `${player.agility}`
        intelligenceSpan.textContent = `${player.intelligence}`
        attackSpan.textContent = `${player.meleeAttack} / ${player.rangedWeapon ? player.rangedAttack : "NA"}`
        damageSpan.textContent = `${player.meleeDamage} / ${player.rangedDamage ? player.rangedDamage : "NA"}`
        defenseSpan.textContent = `${player.defense}`
        agilitySpan.textContent = `${player.agility}`
        levelSpan.textContent = `${player.level}`
        experienceSpan.textContent = `${player.experience} / ${experienceRequirement}`
        goldSpan.textContent = `${player.gold}`

        super.show()
    }
}

class InventoryDialog extends Dialog {
    private readonly openButton = dom.byId("inventoryButton")
    private readonly infoDiv = dom.byId("inventoryInfo") as HTMLDivElement
    private readonly emptyDiv = dom.byId("inventoryEmpty") as HTMLDivElement
    private readonly table = dom.byId("inventoryTable") as HTMLTableElement
    private readonly itemTemplate = dom.byId("inventoryItemTemplate") as HTMLTemplateElement
    private readonly nextPageButton = dom.byId("inventoryNextPageButton") as HTMLButtonElement
    private readonly prevPageButton = dom.byId("inventoryPrevPageButton") as HTMLButtonElement
    private readonly closeButton = dom.byId("inventoryCloseButton") as HTMLButtonElement
    private readonly pageSize: number = 9
    private pageIndex: number = 0
    private selectedIndex: number = -1

    constructor(private readonly player: rl.Player, canvas: HTMLCanvasElement) {
        super(dom.byId("inventoryDialog"), canvas)
        this.openButton.addEventListener("click", () => this.toggle())
        this.closeButton.addEventListener("click", () => this.hide())

        this.nextPageButton.addEventListener("click", () => {
            this.nextPage()
        })

        this.prevPageButton.addEventListener("click", () => {
            this.prevPage()
        })

        this.elem.addEventListener("keydown", ev => {
            const key = ev.key.toUpperCase()
            const index = parseInt(ev.key)

            if (index && index > 0 && index <= 9) {
                this.selectedIndex = index - 1
                this.refresh()
            }

            if (key === "U" && this.selectedIndex >= 0) {
                this.use(this.selectedIndex)
            }

            if (key === "E" && this.selectedIndex >= 0) {
                this.equip(this.selectedIndex)
            }

            if (key === "R" && this.selectedIndex >= 0) {
                this.remove(this.selectedIndex)
            }

            if (key === "D" && this.selectedIndex >= 0) {
                this.drop(this.selectedIndex)
            }

            if (key === "ARROWDOWN" || key === "S") {
                this.nextItem()
            }

            if (key === "ARROWUP" || key === "W") {
                this.prevItem()
            }

            if (key === "PAGEDOWN" || key === "N") {
                this.nextPage()
            }

            if (key === "PAGEUP" || key === "P") {
                this.prevPage()
            }

            if (key === "ESCAPE") {
                this.hide()
            }
        })

        dom.delegate(this.elem, "click", ".inventory-use-button", (ev) => {
            ev.stopImmediatePropagation()
            const index = this.getRowIndex(ev.target as HTMLButtonElement)
            this.use(index)
        })

        dom.delegate(this.elem, "click", ".inventory-drop-button", (ev) => {
            ev.stopImmediatePropagation()
            const index = this.getRowIndex(ev.target as HTMLButtonElement)
            this.drop(index)
        })

        dom.delegate(this.elem, "click", ".inventory-equip-button", (ev) => {
            ev.stopImmediatePropagation()
            const index = this.getRowIndex(ev.target as HTMLButtonElement)
            this.equip(index)
        })

        dom.delegate(this.elem, "click", ".inventory-remove-button", (ev) => {
            ev.stopImmediatePropagation()
            const index = this.getRowIndex(ev.target as HTMLButtonElement)
            this.remove(index)
        })

        dom.delegate(this.elem, "click", ".item-row", (ev) => {
            const row = (ev.target as HTMLElement).closest(".item-row")
            if (row) {
                this.select(row as HTMLTableRowElement)
            }
        })
    }

    nextPage() {
        this.pageIndex++
        this.pageIndex = Math.min(this.pageIndex, Math.ceil(this.player.inventory.length / this.pageSize) - 1)
        this.refresh()
    }

    prevPage() {
        this.pageIndex--
        this.pageIndex = Math.max(this.pageIndex, 0)
        this.refresh()
    }

    nextItem() {
        ++this.selectedIndex
        this.selectedIndex = Math.min(this.selectedIndex, this.pageSize)
        this.refresh()
    }

    prevItem() {
        --this.selectedIndex
        this.selectedIndex = Math.max(this.selectedIndex, -1)
        this.refresh()
    }

    show() {
        this.refresh()
        super.show()
    }

    refresh() {
        const tbody = this.table.tBodies[0]
        dom.removeAllChildren(tbody)

        if (this.player.inventory.length === 0) {
            this.emptyDiv.hidden = false
            this.infoDiv.hidden = true
        } else {
            this.emptyDiv.hidden = true
            this.infoDiv.hidden = false
        }

        const pageCount = Math.ceil(this.player.inventory.length / this.pageSize)
        this.pageIndex = Math.min(Math.max(0, this.pageIndex), pageCount - 1)
        this.prevPageButton.disabled = this.pageIndex <= 0
        this.nextPageButton.disabled = this.pageIndex >= pageCount - 1

        this.infoDiv.textContent = `Page ${this.pageIndex + 1} of ${pageCount}`

        const items = getSortedItemsPage(this.player.inventory, this.pageIndex, this.pageSize)
        this.selectedIndex = Math.min(this.selectedIndex, items.length - 1)

        for (let i = 0; i < items.length; ++i) {
            const item = items[i]
            const fragment = this.itemTemplate.content.cloneNode(true) as DocumentFragment
            const tr = dom.bySelector(fragment, ".item-row")
            const itemIndexTd = dom.bySelector(tr, ".item-index")
            const itemNameTd = dom.bySelector(tr, ".item-name")
            const equipButton = dom.bySelector(tr, ".inventory-equip-button") as HTMLButtonElement
            const removeButton = dom.bySelector(tr, ".inventory-remove-button") as HTMLButtonElement
            const useButton = dom.bySelector(tr, ".inventory-use-button") as HTMLButtonElement
            const name = item instanceof rl.LightSource ? `${item.name} (${item.duration})` : item.name

            itemIndexTd.textContent = (i + 1).toString()
            itemNameTd.textContent = name

            if (!(item instanceof rl.Usable)) {
                useButton.remove()
            }
            if (!rl.isEquippable(item) || this.player.isEquipped(item)) {
                equipButton.remove()
            }

            if (!this.player.isEquipped(item)) {
                removeButton.remove()
            }

            if (i === this.selectedIndex) {
                tr.classList.add("selected")
            }

            tbody.appendChild(fragment)
        }
    }

    private select(selectedRow: HTMLTableRowElement) {
        const rows = Array.from(this.elem.querySelectorAll(".item-row"))
        for (const row of rows) {
            row.classList.remove("selected")
        }

        selectedRow.classList.add("selected")
    }

    private getRowIndex(elem: HTMLButtonElement) {
        const index = dom.getElementIndex(elem.closest(".item-row") as HTMLTableRowElement)
        return index
    }

    private use(index: number) {
        const i = this.pageIndex * this.pageSize + index
        const item = getSortedItems(this.player.inventory)[i]
        if (!(item instanceof rl.Usable)) {
            return
        }

        useItem(this.player, item)
        this.refresh()
    }

    private drop(index: number) {
        const i = this.pageIndex * this.pageSize + index
        const item = getSortedItems(this.player.inventory)[i]
        dropItem(this.player, item)
        this.refresh()
    }

    private equip(index: number) {
        const i = this.pageIndex * this.pageSize + index
        const item = getSortedItems(this.player.inventory)[i]
        if (!rl.isEquippable(item)) {
            return
        }

        equipItem(this.player, item)
        this.refresh()
    }

    private remove(index: number) {
        const i = this.pageIndex * this.pageSize + index
        const item = getSortedItems(this.player.inventory)[i]
        if (!rl.isEquippable(item)) {
            return
        }

        removeItem(this.player, item)
        this.refresh()
    }
}

class ContainerDialog {
    private readonly dialog: Dialog
    private readonly nameSpan = dom.byId("containerName") as HTMLSpanElement
    private readonly closeButton = dom.byId("containerCloseButton") as HTMLButtonElement
    private readonly takeAllButton = dom.byId("containerTakeAllButton") as HTMLButtonElement
    private readonly containerTable = dom.byId("containerTable") as HTMLTableElement
    private readonly containerItemTemplate = dom.byId("containerItemTemplate") as HTMLTemplateElement
    private map: maps.Map | null = null
    private container: rl.Container | null = null

    constructor(private readonly player: rl.Player, canvas: HTMLCanvasElement) {
        this.dialog = new Dialog(dom.byId("containerDialog"), canvas)
        this.player = player
        this.closeButton.addEventListener("click", () => this.hide())
        this.takeAllButton.addEventListener("click", () => this.takeAll())
        const elem = this.dialog.elem

        dom.delegate(elem, "click", ".container-take-button", (ev) => {
            if (!this.container) {
                return
            }

            const btn = ev.target as HTMLButtonElement
            const row = btn.closest(".item-row") as HTMLTableRowElement
            const idx = dom.getElementIndex(row)
            this.take(idx)
        })

        elem.addEventListener("keypress", ev => {
            const key = ev.key.toUpperCase()
            if (key === "C") {
                this.hide()
            }

            if (key === "A") {
                this.takeAll()
            }

            const index = parseInt(ev.key)
            if (index && index > 0 && index <= 9) {
                this.take(index - 1)
            }
        })

        elem.addEventListener("keydown", ev => {
            const key = ev.key.toUpperCase()
            if (key === "ESCAPE") {
                this.hide()
            }

            if (key === "ENTER") {
                this.takeAll()
            }
        });
    }

    show(map: maps.Map, container: rl.Container) {
        this.map = map
        this.container = container
        this.nameSpan.textContent = this.container.name
        this.refresh()
        this.dialog.show()
    }

    hide() {
        if (this.map && this.container && this.container.items.length === 0) {
            this.map.containers.delete(this.container)
        }

        this.container = null
        this.dialog.hide()
    }

    get hidden() {
        return this.dialog.hidden
    }

    refresh() {
        const tbody = this.containerTable.tBodies[0]
        dom.removeAllChildren(tbody)

        if (!this.container) {
            return
        }

        const items = getSortedItems(this.container.items)
        for (let i = 0; i < items.length; ++i) {
            const item = items[i]
            const fragment = this.containerItemTemplate.content.cloneNode(true) as DocumentFragment
            const tr = dom.bySelector(fragment, ".item-row")
            const itemIndexTd = dom.bySelector(tr, ".item-index")
            const itemNameTd = dom.bySelector(tr, ".item-name")
            itemIndexTd.textContent = `${i + 1}`
            itemNameTd.textContent = item.name
            tbody.appendChild(fragment)
        }
    }

    take(index: number) {
        if (!this.container) {
            return
        }

        const item = this.container.items[index]
        this.container.items.splice(index, 1)
        this.player.inventory.push(item)

        // hide if this was the last item
        if (this.container.items.length == 0) {
            this.hide()
        } else {
            this.refresh()
        }
    }

    takeAll() {
        if (!this.container) {
            return
        }

        this.player.inventory.push(...this.container.items)
        this.container.items.splice(0, this.container.items.length)
        this.hide()
    }
}

class DefeatDialog {
    private readonly tryAgainButton = dom.byId("tryAgainButton")
    private readonly dialog: Dialog

    constructor(canvas: HTMLCanvasElement) {
        this.dialog = new Dialog(dom.byId("defeatDialog"), canvas)
        this.tryAgainButton.addEventListener("click", () => this.tryAgain())
        this.dialog.elem.addEventListener("keypress", (ev) => {
            const key = ev.key.toUpperCase()
            if (key === "T") {
                this.tryAgain()
            }

            if (key === "ENTER") {
                this.tryAgain()
            }
        })
    }

    show() {
        this.dialog.show()
    }

    private tryAgain() {
        window.location.reload()
    }
}

class LevelDialog extends Dialog {
    private readonly levelStrengthRow = dom.byId("levelStrengthRow")
    private readonly levelIntelligenceRow = dom.byId("levelIntelligenceRow")
    private readonly levelAgilityRow = dom.byId("levelAgilityRow")

    constructor(private readonly player: rl.Player, canvas: HTMLCanvasElement) {
        super(dom.byId("levelDialog"), canvas)

        this.levelStrengthRow.addEventListener("click", () => this.levelStrenth())
        this.levelIntelligenceRow.addEventListener("click", () => this.levelIntelligence())
        this.levelAgilityRow.addEventListener("click", () => this.levelAgility())

        this.elem.addEventListener("keydown", (ev) => {
            const key = ev.key.toUpperCase()
            const index = parseInt(ev.key)

            if (index == 1 || key == "S") {
                this.levelStrenth()
            }

            if (index == 2 || key == "I") {
                this.levelIntelligence()
            }

            if (index == 3 || key == "A") {
                this.levelAgility()
            }
        })
    }

    private levelStrenth() {
        this.player.baseStrength++
        this.levelUp()
    }

    private levelIntelligence() {
        this.player.baseIntelligence++
        this.levelUp()
    }

    private levelAgility() {
        this.player.baseAgility++
        this.levelUp()
    }

    private levelUp() {
        this.hide()
        this.player.baseMaxHealth += 3 + this.player.strength
    }
}

enum ShopDialogMode {
    Buy,
    Sell
}

class ShopDialog {
    private readonly dialog: Dialog
    private readonly goldSpan = dom.byId("shopGoldSpan") as HTMLSpanElement;
    private readonly closeButton = dom.byId("shopExitButton") as HTMLButtonElement
    private readonly buyButton = dom.byId("shopBuyButton") as HTMLButtonElement
    private readonly sellButton = dom.byId("shopSellButton") as HTMLButtonElement
    private readonly nextPageButton = dom.byId("shopNextPageButton") as HTMLButtonElement
    private readonly prevPageButton = dom.byId("shopPrevPageButton") as HTMLButtonElement
    private readonly shopTable = dom.byId("shopTable") as HTMLTableElement
    private readonly shopBuyItemTemplate = dom.byId("shopBuyItemTemplate") as HTMLTemplateElement
    private readonly shopSellItemTemplate = dom.byId("shopSellItemTemplate") as HTMLTemplateElement
    private mode: ShopDialogMode = ShopDialogMode.Buy
    private items: rl.Item[] = []
    private readonly pageSize: number = 9
    private pageIndex: number = 0
    private selectedIndex: number = -1

    constructor(private readonly player: rl.Player, canvas: HTMLCanvasElement) {
        this.dialog = new Dialog(dom.byId("shopDialog"), canvas)
        this.player = player
        this.buyButton.addEventListener("click", () => this.setMode(ShopDialogMode.Buy))
        this.sellButton.addEventListener("click", () => this.setMode(ShopDialogMode.Sell))
        this.nextPageButton.addEventListener("click", () => this.nextPage())
        this.prevPageButton.addEventListener("click", () => this.prevPage())
        this.closeButton.addEventListener("click", () => this.hide())

        const elem = this.dialog.elem

        dom.delegate(elem, "click", ".item-row", (ev) => {
            const btn = ev.target as HTMLButtonElement
            const row = btn.closest(".item-row") as HTMLTableRowElement
            const idx = dom.getElementIndex(row)
            this.choose(idx)
        })

        elem.addEventListener("keydown", (ev) => {
            const key = ev.key.toUpperCase()

            if (key === "X") {
                this.hide()
            }

            if (key === "B") {
                this.setMode(ShopDialogMode.Buy)
            }

            if (key === "S") {
                this.setMode(ShopDialogMode.Sell)
            }

            if (key === "ARROWDOWN" || key === "S") {
                this.nextItem()
            }

            if (key === "ARROWUP" || key === "W") {
                this.prevItem()
            }

            if (key === "PAGEDOWN" || key === "N") {
                this.nextPage()
            }

            if (key === "PAGEUP" || key === "P") {
                this.prevPage()
            }

            if (key === "ESCAPE") {
                this.hide()
            }

            if (key === "ENTER") {
                this.choose(this.selectedIndex)
            }

            const index = parseInt(ev.key)
            if (index && index > 0 && index <= 9) {
                this.choose(index - 1)
            }
        })
    }

    show() {
        this.refresh()
        this.dialog.show()
    }

    hide() {
        this.dialog.hide()
    }

    choose(idx: number) {
        idx = this.pageIndex * this.pageSize + idx
        switch (this.mode) {
            case ShopDialogMode.Buy:
                this.buy(idx)
                break
            case ShopDialogMode.Sell:
                this.sell(idx)
                break
        }
    }

    setMode(mode: ShopDialogMode) {
        this.mode = mode
        this.pageIndex = 0
        this.selectedIndex = -1
        this.refresh()
    }

    buy(idx: number) {
        const item = this.items[idx]

        if (item.value > this.player.gold) {
            output.error(`You do not have enough gold for ${item.name}!`)
            return
        }

        output.info(`You bought ${item.name}.`)
        this.player.gold -= item.value
        this.player.inventory.push(item.clone())
        this.refresh()
    }

    sell(idx: number) {
        const item = this.items[idx]
        const invIdx = this.player.inventory.indexOf(item)
        if (invIdx == -1) {
            return
        }

        this.player.remove(item)
        this.player.inventory.splice(invIdx, 1)
        const sellValue = Math.floor(item.value / 2)
        this.player.gold += sellValue
        output.info(`You sold ${item.name} for ${sellValue} gold.`)
        this.refresh()
    }

    get hidden() {
        return this.dialog.hidden
    }

    nextPage() {
        this.pageIndex++
        this.pageIndex = Math.min(this.pageIndex, Math.ceil(this.items.length / this.pageSize) - 1)
        this.refresh()
    }

    prevPage() {
        this.pageIndex--
        this.pageIndex = Math.max(this.pageIndex, 0)
        this.refresh()
    }

    nextItem() {
        ++this.selectedIndex
        this.selectedIndex = Math.min(this.selectedIndex, 8)
        this.refresh()
    }

    prevItem() {
        --this.selectedIndex
        this.selectedIndex = Math.max(this.selectedIndex, -1)
        this.refresh()
    }

    refresh() {
        switch (this.mode) {
            case ShopDialogMode.Buy:
                this.refreshBuy()
                break

            case ShopDialogMode.Sell:
                this.refreshSell()
                break
        }

        this.goldSpan.textContent = `Gold: ${this.player.gold}`
    }

    refreshBuy() {
        const tbody = this.shopTable.tBodies[0]
        dom.removeAllChildren(tbody)

        // assemble item list
        const player = this.player
        this.items = [...things.db].filter(t => t instanceof rl.Item && t.value > 0 && t.level <= player.level) as rl.Item[]

        const pageOffset = this.pageIndex * this.pageSize
        const pageSize = Math.min(this.pageSize, this.items.length - pageOffset)
        this.selectedIndex = Math.min(this.selectedIndex, pageSize - 1)

        for (let i = 0; i < pageSize; ++i) {
            const item = this.items[pageOffset + i]
            const fragment = this.shopBuyItemTemplate.content.cloneNode(true) as DocumentFragment
            const tr = dom.bySelector(fragment, ".item-row")
            const itemIndexTd = dom.bySelector(tr, ".item-index")
            const itemNameTd = dom.bySelector(tr, ".item-name")
            const itemCostTd = dom.bySelector(tr, ".item-cost")
            itemIndexTd.textContent = `${i + 1}`
            itemNameTd.textContent = item.name
            itemCostTd.textContent = `${item.value}`

            if (i === this.selectedIndex) {
                tr.classList.add("selected")
            }

            if (item.value > player.gold) {
                tr.classList.add("disabled")
            }

            tbody.appendChild(fragment)
        }

        this.buyButton.disabled = true
        this.sellButton.disabled = false
    }

    refreshSell() {
        const tbody = this.shopTable.tBodies[0]
        dom.removeAllChildren(tbody)

        // assemble item list
        const player = this.player
        this.items = [...player.inventory].filter(t => t.value > 0) as rl.Item[]
        const pageOffset = this.pageIndex * this.pageSize
        const pageSize = Math.min(this.pageSize, this.items.length - pageOffset)
        this.selectedIndex = Math.min(this.selectedIndex, pageSize - 1)

        for (let i = 0; i < pageSize; ++i) {
            const item = this.items[pageOffset + i]
            const equipped = this.player.isEquipped(item)
            const fragment = this.shopSellItemTemplate.content.cloneNode(true) as DocumentFragment
            const tr = dom.bySelector(fragment, ".item-row")
            const itemIndexTd = dom.bySelector(tr, ".item-index")
            const itemNameTd = dom.bySelector(tr, ".item-name")
            const itemCostTd = dom.bySelector(tr, ".item-cost")
            itemIndexTd.textContent = `${i + 1}`
            itemNameTd.textContent = `${equipped ? "* " : ""}${item.name}`
            itemCostTd.textContent = `${Math.floor(item.value / 2)}`

            if (i === this.selectedIndex) {
                tr.classList.add("selected")
            }

            tbody.appendChild(fragment)
        }

        this.buyButton.disabled = false
        this.sellButton.disabled = true
    }
}

function getSortedItems(items: Iterable<rl.Item>): rl.Item[] {
    const sortedItems = iter.orderBy(items, i => i.name)
    return sortedItems
}

function getSortedItemsPage(items: Iterable<rl.Item>, pageIndex: number, pageSize: number): rl.Item[] {
    const startIndex = pageIndex * pageSize
    const endIndex = startIndex + pageSize
    const sortedItems = getSortedItems(items)
    const page = sortedItems.slice(startIndex, endIndex)
    return page
}

function hasLineOfSight(map: maps.Map, eye: geo.Point, target: geo.Point): boolean {
    for (const pt of march(eye, target)) {
        // ignore start point
        if (pt.equal(eye)) {
            continue
        }

        for (const th of map.at(pt)) {
            if (!th.transparent) {
                return pt.equal(target)
            }
        }
    }

    return true
}

function* march(start: geo.Point, end: geo.Point): Generator<geo.Point> {
    const cur = start.clone()
    const dy = Math.abs(end.y - start.y)
    const sy = start.y < end.y ? 1 : -1
    const dx = -Math.abs(end.x - start.x)
    const sx = start.x < end.x ? 1 : -1
    let err = dy + dx

    while (true) {
        yield cur

        if (cur.equal(end)) {
            break
        }

        const e2 = 2 * err
        if (e2 >= dx) {
            err += dx
            cur.y += sy
        }

        if (e2 <= dy) {
            err += dy
            cur.x += sx
        }
    }
}

function dropItem(player: rl.Player, item: rl.Item): void {
    player.delete(item)
    output.info(`${item.name} was dropped`)
}

function useItem(player: rl.Player, item: rl.Usable): void {
    const amount = Math.min(item.health, player.maxHealth - player.health)
    player.health += amount
    player.delete(item)
    output.info(`${item.name} restored ${amount} health`)
}

function equipItem(player: rl.Player, item: rl.Item): void {
    player.equip(item)
    output.info(`${item.name} was equipped`)
}

function removeItem(player: rl.Player, item: rl.Item): void {
    player.remove(item)
    output.info(`${item.name} was removed`)
}

enum TargetCommand {
    None,
    Attack,
    Shoot,
    Look
}

class App {
    private readonly canvas = dom.byId("canvas") as HTMLCanvasElement
    private readonly attackButton = dom.byId("attackButton") as HTMLButtonElement
    private readonly shootButton = dom.byId("shootButton") as HTMLButtonElement
    private readonly lookButton = dom.byId("lookButton") as HTMLButtonElement
    private readonly resetButton = dom.byId("resetButton") as HTMLButtonElement
    private readonly inp: input.Input = new input.Input(this.canvas)
    private readonly statsDialog: StatsDialog
    private readonly inventoryDialog: InventoryDialog
    private readonly containerDialog: ContainerDialog
    private readonly defeatDialog = new DefeatDialog(this.canvas)
    private readonly levelDialog: LevelDialog
    private readonly shopDialog: ShopDialog
    private readonly animations = new Animations()
    private zoom = 1
    private targetCommand: TargetCommand = TargetCommand.None
    private cursorPosition?: geo.Point

    private constructor(
        private readonly rng: rand.SFC32RNG,
        private readonly renderer: gfx.Renderer,
        private floor: number,
        private map: maps.Map,
        private texture: gfx.Texture,
        private imageMap: Map<string, number>) {
        const player = map.player.thing
        this.statsDialog = new StatsDialog(player, this.canvas)
        this.inventoryDialog = new InventoryDialog(player, this.canvas)
        this.containerDialog = new ContainerDialog(player, this.canvas)
        this.levelDialog = new LevelDialog(player, this.canvas)
        this.shopDialog = new ShopDialog(player, this.canvas)
    }

    public static async create(): Promise<App> {
        const canvas = dom.byId("canvas") as HTMLCanvasElement
        const renderer = new gfx.Renderer(canvas)

        // check for any saved state
        try {
            const app = await App.load(renderer)
            if (app) {
                return app
            }
        } catch (e) {
            console.log("Failed to load state.", e)
            clearState()
        }

        // no valid save state, create app and generate dungeon
        const seed = rand.xmur3(new Date().toString())
        const rng = new rand.SFC32RNG(seed(), seed(), seed(), seed())
        const player = things.player.clone()

        const map = gen.generateDungeonLevel(rng, things.db, 1)
        placePlayerAtExit(map, player, rl.ExitDirection.Up)

        const [texture, imageMap] = await loadImages(renderer, map)
        const app = new App(rng, renderer, 1, map, texture, imageMap)
        return app
    }

    public exec() {
        this.canvas.focus()

        output.write("Your adventure begins")
        this.handleResize()
        requestAnimationFrame(time => this.tick(time))

        document.addEventListener("keydown", (ev) => this.handleKeyDown(ev))

        this.attackButton.addEventListener("click", () => {
            this.targetCommand = TargetCommand.Attack
        })

        this.shootButton.addEventListener("click", () => {
            this.targetCommand = TargetCommand.Shoot
        })

        this.lookButton.addEventListener("click", () => {
            this.targetCommand = TargetCommand.Look
        })

        this.resetButton.addEventListener("click", () => {
            clearState()
            window.location.reload()
        })
    }

    private tick(time: DOMHighResTimeStamp) {
        this.handleResize()
        this.animations.update(time)

        for (const [th, anim] of this.animations.processDone()) {
            if (th instanceof rl.Player) {
                this.map.players.set(anim.position, th)
                th.action -= 1
            }

            if (th instanceof rl.Monster) {
                this.map.monsters.set(anim.position, th)
                th.action -= 1
            }
        }

        if (this.animations.size === 0) {
            const nextCreature = this.getNextCreature()
            if (nextCreature?.thing instanceof rl.Player) {
                this.handleInput()
            } else if (nextCreature?.thing instanceof rl.Monster) {
                this.tickMonster(nextCreature.position, nextCreature.thing)
            } else {
                this.tickRound()
            }
            this.updateVisibility()
        }

        this.drawFrame()
        requestAnimationFrame(time => this.tick(time))
    }

    private getNextMonster(): maps.Placed<rl.Monster> | null {
        // determine whose turn it is
        let nextMonster = null
        for (const monster of this.map.monsters) {
            if (monster.thing.state !== rl.MonsterState.aggro) {
                continue
            }

            if (monster.thing.action <= 0) {
                continue
            }

            if (!nextMonster || monster.thing.action > nextMonster.thing.action) {
                nextMonster = monster
            }
        }

        return nextMonster
    }

    private getNextCreature(): maps.Placed<rl.Monster> | maps.Placed<rl.Player> | null {
        const monster = this.getNextMonster()
        const player = this.map.player.thing

        if (player.action > 0 && player.action > (monster?.thing?.action ?? 0)) {
            return this.map.player
        }

        return monster
    }

    private tickRound() {
        // accumulate action points
        for (const monster of iter.filter(this.map.monsters.things(), m => m.state === rl.MonsterState.aggro)) {
            const reserve = Math.min(monster.actionReserve, monster.agility)
            monster.action = 1 + monster.agility + reserve
            monster.actionReserve = 0
        }

        // cap action reserve 
        const player = this.map.player.thing
        const reserve = Math.min(player.actionReserve, player.agility)
        player.action = 1 + player.agility + reserve
        player.actionReserve = 0

        this.updateMonsterStates()

        // advance duration of items
        if (player.lightSource && player.lightSource.duration > 0) {
            player.lightSource.duration -= 1
            if (player.lightSource.duration === 0) {
                output.warning(`Your ${player.lightSource.name} has been extinguished!`)
                player.delete(player.lightSource)
            }
        }

        const experienceRequired = rl.getExperienceRequirement(player.level + 1)
        if (player.experience >= experienceRequired) {
            this.levelDialog.show()
            ++player.level
            player.experience -= experienceRequired
        }

        // save current state
        this.saveState()

        if (player.health <= 0) {
            clearState()
            this.defeatDialog.show()
        }
    }

    private getScrollOffset(): geo.Point {
        // convert map point to canvas point, noting that canvas is centered on player
        const playerPosition = this.map.player.position
        const canvasCenter = new geo.Point(this.canvas.width / 2, this.canvas.height / 2)
        const offset = canvasCenter.subPoint(playerPosition.addScalar(.5).mulScalar(this.tileSize))
        return offset.floor()
    }

    private canvasToMapPoint(cxy: geo.Point) {
        const scrollOffset = this.getScrollOffset()
        const mxy = cxy.subPoint(scrollOffset).divScalar(this.tileSize).floor()
        return mxy
    }

    private mapToCanvasPoint(mxy: geo.Point) {
        const scrollOffset = this.getScrollOffset()
        const cxy = mxy.mulScalar(this.tileSize).addPoint(scrollOffset)
        return cxy
    }

    private processPlayerMeleeAttack(defender: rl.Monster) {
        // base 60% chance to hit
        // 10% bonus / penalty for every point difference between attack and defense
        // bottoms out at 5% - always SOME chance to hit
        const attacker = this.map.player.thing
        const bonus = (attacker.meleeAttack - defender.defense) * .1
        const hitChance = Math.min(Math.max(.6 + bonus, .05), .95)
        const hit = rand.chance(this.rng, hitChance)
        const weapon = attacker.meleeWeapon ?? things.fists
        const attackVerb = weapon.verb ? weapon.verb : "attacks"
        attacker.action -= weapon.action

        if (!hit) {
            output.warning(`${attacker.name} ${attackVerb} ${defender.name} but misses!`)
            return
        }

        // hit - calculate damage
        const damage = attacker.meleeDamage.roll(this.rng)
        output.warning(`${attacker.name} ${attackVerb} ${defender.name} and hits for ${damage} damage!`)
        defender.health -= damage

        if (defender.health < 0) {
            output.warning(`${defender.name} has been defeated and ${attacker.name} receives ${defender.experience} experience and ${defender.gold} gold`)
            attacker.experience += defender.experience
            attacker.gold += defender.gold
            this.map.monsters.delete(defender)
        }
    }

    private processPlayerRangedAttack(defender: rl.Monster) {
        // base 40% chance to hit
        // 10% bonus / penalty for every point difference between attack and defense
        // bottoms out at 5% - always SOME chance to hit
        const attacker = this.map.player.thing
        if (!attacker.rangedWeapon) {
            throw new Error("Player has no ranged weapon equipped")
        }

        const bonus = (attacker.rangedAttack - defender.defense) * .1
        const hitChance = Math.min(Math.max(.6 + bonus, .05), .95)
        const hit = rand.chance(this.rng, hitChance)
        const weapon = attacker.rangedWeapon
        const attackVerb = weapon.verb ? weapon.verb : "attacks"
        attacker.action -= weapon.action

        if (!hit) {
            output.warning(`${attacker.name} ${attackVerb} ${defender.name} but misses!`)
            return
        }

        // hit - calculate damage
        const damage = attacker.rangedDamage?.roll(this.rng) ?? 0
        output.warning(`${attacker.name} ${attackVerb} ${defender.name} and hits for ${damage} damage!`)
        defender.health -= damage

        if (defender.health < 0) {
            output.warning(`${defender.name} has been defeated and ${attacker.name} receives ${defender.experience} experience`)
            attacker.experience += defender.experience
            this.map.monsters.delete(defender)
        }
    }

    private processMonsterAttack(attacker: rl.Monster, attack: rl.Attack) {
        // base 60% chance to hit
        // 10% bonus / penalty for every point difference between attack and defense
        // clamps to out at [5, 95] - always SOME chance to hit or miss
        // choose an attack from repertoire of monster
        const defender = this.map.player.thing
        const bonus = (attack.attack - defender.defense) * .1
        const hitChance = Math.max(.6 + bonus, .05)
        const hit = rand.chance(this.rng, hitChance)
        const attackVerb = attack.verb ? attack.verb : "attacks"
        attacker.action -= attack.action

        if (!hit) {
            output.warning(`${attacker.name} ${attackVerb} ${defender.name} but misses!`)
            return
        }

        // hit - calculate damage
        const damage = attack.damage.roll(this.rng)
        output.warning(`${attacker.name} ${attackVerb} ${defender.name} and hits for ${damage} damage!`)
        defender.health -= damage

        if (defender.health <= 0) {
            output.warning(`${defender.name} has been defeated!`)
            clearState()
            this.defeatDialog.show()
        }
    }

    private updateMonsterStates() {
        for (const monster of this.map.monsters) {
            this.updateMonsterState(monster)
        }
    }

    private updateMonsterState(placedMonster: maps.Placed<rl.Monster>) {
        // aggro state
        const map = this.map
        let { position, thing: monster } = placedMonster
        const los = hasLineOfSight(map, position, map.player.position)

        if (monster.state !== rl.MonsterState.aggro && los) {
            monster.action = 0
            monster.state = rl.MonsterState.aggro
        }

        if (monster.state === rl.MonsterState.aggro && !los) {
            monster.action = 0
            monster.state = rl.MonsterState.idle
        }
    }

    private tickMonster(monsterPosition: geo.Point, monster: rl.Monster) {
        // if player is within reach (and alive), attack
        let { position: playerPosition, thing: player } = this.map.player

        // first attempt to attack
        if (player.health > 0) {
            const distanceToPlayer = geo.calcManhattenDist(playerPosition, monsterPosition)
            const attacks = monster.attacks.filter(a => a.range >= distanceToPlayer)
            if (attacks.length > 0) {
                const attack = rand.choose(this.rng, attacks)
                this.processMonsterAttack(monster, attack)
                return
            }
        }

        // determine whether monster can see player
        // seek and destroy
        const map = this.map
        const path = maps.findPath(map, monsterPosition, playerPosition)
        if (path.length === 0) {
            // pass
            monster.action = 0
            return
        }

        const position = path[0]
        if (map.isPassable(position)) {
            this.animations.insert(monster, monsterPosition, position, 125)
        } else {
            monster.action = 0
        }
    }

    private handleResize() {
        const canvas = this.canvas
        if (canvas.width === canvas.clientWidth && canvas.height === canvas.clientHeight) {
            return
        }

        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
        this.updateVisibility()
    }

    private handleInput() {
        const inp = this.inp

        // target
        if (this.cursorPosition && (inp.pressed(input.Key.Enter) || inp.pressed(" "))) {
            this.handleCursorTarget()
            inp.flush()
            return
        }

        // ctrl-key cursor movement
        if (this.handleCursorKeyboardMovement()) {
            inp.flush()
            return
        }

        if (this.handlePlayerKeyboardMovement()) {
            inp.flush()
            return
        }

        // click on object
        if (this.handleClick()) {
            inp.flush()
            return
        }

        inp.flush()
    }

    private handleCursorKeyboardMovement(): boolean {
        const inp = this.inp
        if (!inp.held(input.Key.Control)) {
            return false
        }

        const { position: playerPosition, thing: player } = this.map.player

        if (!this.cursorPosition) {
            this.cursorPosition = playerPosition.clone()
        }

        if (inp.pressed("w") || inp.pressed("W") || inp.pressed("ArrowUp")) {
            this.cursorPosition.y -= 1
            return true
        }

        if (inp.pressed("s") || inp.pressed("S") || inp.pressed("ArrowDown")) {
            this.cursorPosition.y += 1
            return true
        }

        if (inp.pressed("a") || inp.pressed("A") || inp.pressed("ArrowLeft")) {
            this.cursorPosition.x -= 1
            return true
        }

        if (inp.pressed("d") || inp.pressed("D") || inp.pressed("ArrowRight")) {
            this.cursorPosition.x += 1
            return true
        }

        return false
    }

    private handleClick(): boolean {
        // determine the map coordinates the user clicked on
        const inp = this.inp

        if (!inp.mouseLeftReleased) {
            return false
        }

        if (this.handleTargetCommandClick()) {
            return true
        }

        const mxy = this.canvasToMapPoint(new geo.Point(inp.mouseX, inp.mouseY))
        const map = this.map
        const { position: playerPosition, thing: player } = this.map.player

        const clickFixture = map.fixtureAt(mxy)
        if (clickFixture && clickFixture instanceof rl.Door) {
            this.handleOpen(clickFixture)
            return true
        } else if (clickFixture) {
            output.info(`You see ${clickFixture.name}`)
            return true
        }

        const clickMonster = map.monsterAt(mxy)
        // first, try melee
        if (clickMonster) {
            const dist = geo.calcManhattenDist(playerPosition, mxy)
            const meleeWeapon = player.meleeWeapon ?? things.fists
            const rangedWeapon = player.rangedWeapon ?? things.fists

            if (dist <= meleeWeapon.range) {
                this.processPlayerMeleeAttack(clickMonster)
                return true
            }

            if (dist <= rangedWeapon.range) {
                this.processPlayerRangedAttack(clickMonster)
                return true
            }

            output.info(`You see ${clickMonster.name}`)
            return true
        }

        const dxy = mxy.subPoint(playerPosition)
        const sgn = dxy.sign()
        const abs = dxy.abs()

        if (abs.x > 0 && abs.x >= abs.y) {
            this.handleMove(sgn.x > 0 ? Direction.East : Direction.West)
            return true
        }

        if (abs.y > 0 && abs.y > abs.x) {
            this.handleMove(sgn.y > 0 ? Direction.South : Direction.North)
            return true
        }

        return false
    }

    private handlePlayerKeyboardMovement(): boolean {
        let inp = this.inp

        if (inp.held("w") || inp.held("W") || inp.held("ArrowUp")) {
            this.handleMove(Direction.North)
            return true
        }

        if (inp.held("s") || inp.held("S") || inp.held("ArrowDown")) {
            this.handleMove(Direction.South)
            return true
        }

        if (inp.held("a") || inp.held("A") || inp.held("ArrowLeft")) {
            this.handleMove(Direction.West)
            return true
        }

        if (inp.held("d") || inp.held("D") || inp.held("ArrowRight")) {
            this.handleMove(Direction.East)
            return true
        }

        if (inp.pressed(" ")) {
            output.info("Pass")
            const player = this.map.player.thing
            player.actionReserve += player.action
            player.action = 0
            return true
        }

        return false
    }

    private handleOpen(door: rl.Fixture) {
        output.info(`${door.name} opened`)
        this.map.fixtures.delete(door)
        this.map.player.thing.action -= 1
    }

    private async handleMove(dir: Direction) {
        // clear cursor on movement
        this.cursorPosition = undefined
        const { position: playerPosition, thing: player } = this.map.player

        let newPosition = playerPosition.addPoint(directionVector(dir))
        if (!this.map.inBounds(newPosition)) {
            return
        }

        const map = this.map
        const tile = map.tileAt(newPosition)
        if (tile && !tile.passable) {
            output.info(`Blocked by ${tile.name}`)
            return
        }

        const monster = map.monsterAt(newPosition)
        if (monster) {
            this.processPlayerMeleeAttack(monster)
            return
        }

        const container = map.containerAt(newPosition)
        if (container) {
            this.containerDialog.show(map, container)
            return
        }

        const fixture = map.fixtureAt(newPosition)
        if (fixture instanceof rl.Door) {
            this.handleOpen(fixture)
            return true
        } else if (fixture && !fixture.passable) {
            output.info(`Can't move that way, blocked by ${fixture.name}`)
            return false
        }

        const exit = map.exitAt(newPosition)
        if (exit) {
            player.action -= 1
            map.player.position = newPosition
            await this.handleExit(exit.direction)
            return
        }

        this.animations.insert(player, playerPosition, newPosition, 125)

        // TODO: not yet! animation must complete!
        // map.player.position = newPosition
        // player.action -= 1

        return
    }

    private handleCursorTarget() {
        const cursorPosition = this.cursorPosition
        if (!cursorPosition) {
            return
        }

        const map = this.map
        const tile = map.tileAt(cursorPosition)

        if (!tile) {
            output.info('Nothing here')
            return
        }

        if (map.visibilityAt(cursorPosition) !== maps.Visibility.Visible) {
            output.info(`Target not visible`)
            return
        }

        const { position: playerPosition, thing: player } = this.map.player
        const distToTarget = geo.calcManhattenDist(playerPosition, cursorPosition)
        const monster = map.monsterAt(cursorPosition)

        if (monster && distToTarget <= 1) {
            this.processPlayerMeleeAttack(monster)
            return
        }

        if (monster && distToTarget > 1 && player.rangedWeapon) {
            this.processPlayerRangedAttack(monster)
            return
        }

        const container = map.containerAt(cursorPosition)
        if (container && distToTarget <= 1) {
            this.containerDialog.show(map, container)
            return
        }

        const fixture = map.fixtureAt(cursorPosition)
        if (fixture instanceof rl.Door && distToTarget <= 1) {
            output.info(`${fixture.name} opened`)
            this.map.fixtures.delete(fixture)
            player.action -= 1
            return
        }

        // lastly - perform a look
        for (const th of this.map.at(cursorPosition)) {
            output.info(`You see ${th.name}`)
        }
    }

    private handleTargetCommandClick() {
        if (!this.inp.mouseLeftReleased) {
            return false
        }

        if (this.targetCommand === TargetCommand.None) {
            return false
        }

        const cxy = new geo.Point(this.inp.mouseX, this.inp.mouseY)
        const mxy = this.canvasToMapPoint(cxy)

        if (!hasLineOfSight(this.map, this.map.player.position, mxy)) {
            output.error(`Can't see!`)
            return true
        }

        switch (this.targetCommand) {
            case TargetCommand.Look: {
                // show what user clicked on
                for (const th of this.map.at(mxy)) {
                    output.info(`You see ${th.name}`)
                }
            }
                break

            case TargetCommand.Attack: {
                const monster = this.map.monsterAt(mxy)
                if (monster) {
                    this.processPlayerMeleeAttack(monster)
                } else {
                    output.info("Nothing to attack here.")
                }
            }
                break

            case TargetCommand.Shoot: {
                const monster = this.map.monsterAt(mxy)
                if (monster) {
                    this.processPlayerRangedAttack(monster)
                } else {
                    output.info("Nothing to shoot here.")
                }
            }
                break
        }

        this.targetCommand = TargetCommand.None
        return true
    }

    private updateVisibility() {
        // update visibility around player
        // limit radius to visible viewport area
        const viewportLightRadius = Math.max(Math.ceil(this.canvas.width / this.tileSize), Math.ceil(this.canvas.height / this.tileSize))
        this.map.updateVisible(viewportLightRadius)
    }

    private calcMapViewport(): geo.AABB {
        const aabb = new geo.AABB(
            this.canvasToMapPoint(new geo.Point(0, 0)),
            this.canvasToMapPoint(new geo.Point(this.canvas.width + this.tileSize, this.canvas.height + this.tileSize)))
            .intersection(new geo.AABB(new geo.Point(0, 0), new geo.Point(this.map.width, this.map.height)))

        return aabb
    }

    private drawFrame() {
        // center the grid around the playerd
        const viewportAABB = this.calcMapViewport()
        const offset = this.getScrollOffset()

        // note - drawing order matters - draw from bottom to top
        if (this.targetCommand !== TargetCommand.None) {
            this.canvas.style.cursor = "crosshair"
        } else {
            this.canvas.style.cursor = ""
        }

        this.shootButton.disabled = !this.map.player.thing.rangedWeapon

        const map = this.map
        const tiles = map.tiles.within(viewportAABB)
        const fixtures = map.fixtures.within(viewportAABB)
        const exits = map.exits.within(viewportAABB)
        const containers = map.containers.within(viewportAABB)
        const monsters = map.monsters.within(viewportAABB)

        for (const tile of tiles) {
            this.drawThing(offset, tile)
        }

        for (const fixture of fixtures) {
            this.drawThing(offset, fixture)
        }

        for (const exit of exits) {
            this.drawThing(offset, exit)
        }

        for (const container of containers) {
            this.drawThing(offset, container)
        }

        for (const creature of monsters) {
            this.drawThing(offset, creature)
        }

        this.drawThing(offset, this.map.player)
        this.drawHealthBar(offset, this.map.player)
        this.drawCursor(offset)

        this.renderer.flush()
    }

    private drawThing(offset: geo.Point, placedThing: maps.Placed<rl.Thing>) {
        const { position, thing } = placedThing
        const visible = this.map.visibilityAt(position)
        const seen = this.map.seenAt(position)
        const fog = (visible === maps.Visibility.None || visible === maps.Visibility.Dark)
            && seen
            && (thing instanceof rl.Tile || thing instanceof rl.Fixture)

        if ((visible === maps.Visibility.None || visible == maps.Visibility.Dark) && !fog) {
            return
        }

        const color = thing.color.clone()
        if (fog) {
            color.a = .25
        }

        this.drawImage(offset, this.animations.position(thing) ?? position, thing.image, color)
    }

    private drawCursor(offset: geo.Point) {
        if (!this.cursorPosition) {
            return
        }

        this.drawImage(offset, this.cursorPosition, "./assets/cursor.png", gfx.Color.red)
    }

    private drawImage(offset: geo.Point, position: geo.Point, image: string, color: gfx.Color = gfx.Color.white) {
        const spritePosition = position.mulScalar(this.tileSize).addPoint(offset)
        const layer = this.imageMap.get(image)

        if (layer === undefined) {
            throw new Error(`Missing image mapping: ${image}`)
        }

        const sprite = new gfx.Sprite({
            position: spritePosition,
            color,
            width: this.tileSize,
            height: this.tileSize,
            texture: this.texture,
            layer: layer,
            flags: gfx.SpriteFlags.ArrayTexture
        })

        this.renderer.drawSprite(sprite)
    }

    private drawHealthBar(offset: geo.Point, placedCreature: maps.Placed<rl.Creature>) {
        const { position, thing: creature } = placedCreature
        const health = Math.max(creature.health, 0)
        const borderWidth = health * 4 + 2
        const interiorWidth = health * 4
        const spritePosition = position.mulScalar(this.tileSize).addPoint(offset).subPoint(new geo.Point(0, this.tileSize / 2))
        this.renderer.drawSprite(new gfx.Sprite({
            position: spritePosition,
            color: gfx.Color.white,
            width: borderWidth,
            height: 8
        }))

        this.renderer.drawSprite(new gfx.Sprite({
            position: spritePosition.addPoint(new geo.Point(1, 1)),
            color: gfx.Color.red,
            width: interiorWidth,
            height: 6
        }))
    }

    private hideDialogs() {
        this.inventoryDialog.hide()
        this.statsDialog.hide()
    }

    private get tileSize() {
        return rl.tileSize * this.zoom
    }

    private handleKeyDown(ev: KeyboardEvent) {
        const key = ev.key.toUpperCase()

        switch (key) {
            case "I": {
                const wasHidden = this.inventoryDialog.hidden
                this.hideDialogs()
                if (wasHidden) {
                    this.inventoryDialog.show()
                }
            }
                break

            case "L": {
                this.levelDialog.show()
            }
                break

            case "Z": {
                const wasHidden = this.statsDialog.hidden
                this.hideDialogs()
                if (wasHidden) {
                    this.statsDialog.show()
                }
            }
                break

            case "L":
                this.targetCommand = TargetCommand.Look
                break

            case "ENTER":
                if (ev.ctrlKey && this.map.player.thing.rangedWeapon) {
                    this.targetCommand = TargetCommand.Shoot
                } else {
                    this.targetCommand = TargetCommand.Attack
                }
                break

            case "ESCAPE":
                this.targetCommand = TargetCommand.None
                this.cursorPosition = undefined
                break

            case "L":
                this.targetCommand = TargetCommand.Look
                break

            case "=":
                this.zoom = Math.min(this.zoom * 2, 16)
                this.updateVisibility()
                break

            case "-":
                this.zoom = Math.max(this.zoom / 2, .125)
                this.updateVisibility()
                break
        }
    }

    private saveState() {
        // save the current game state
        var state: AppSaveState = {
            rng: this.rng.save(),
            floor: this.floor,
        }

        const jsonState = JSON.stringify(state)
        localStorage.setItem(STORAGE_KEY, jsonState)

        this.saveMap()
    }

    private saveMap() {
        const state = this.map.save()
        const jsonState = JSON.stringify(state)
        localStorage.setItem(`${STORAGE_KEY}_MAP_${this.floor}`, jsonState)
    }

    private async handleExit(dir: rl.ExitDirection) {
        if (dir == rl.ExitDirection.Up && this.floor == 1) {
            this.shopDialog.show()
            return
        }

        // remove player from floor, save floor
        const player = this.map.player.thing
        this.map.players.delete(player)
        this.saveMap()

        switch (dir) {
            case rl.ExitDirection.Up:
                this.floor -= 1
                break
            case rl.ExitDirection.Down:
                this.floor += 1
                break
        }

        this.map = loadMap(this.floor) ?? gen.generateDungeonLevel(this.rng, things.db, this.floor)
        const placeDir = dir === rl.ExitDirection.Up ? rl.ExitDirection.Down : rl.ExitDirection.Up
        placePlayerAtExit(this.map, player, placeDir)
        const [texture, imageMap] = await loadImages(this.renderer, this.map)
        this.texture = texture
        this.imageMap = imageMap
        this.updateVisibility()
    }

    static async load(renderer: gfx.Renderer): Promise<App | null> {
        const json = localStorage.getItem(STORAGE_KEY)
        if (!json) {
            return null
        }

        const state = JSON.parse(json) as AppSaveState
        const rng = new rand.SFC32RNG(...state.rng)

        const map = loadMap(state.floor)
        if (!map) {
            throw new Error("Failed to load map!")
        }

        const [texture, imageMap] = await loadImages(renderer, map)
        const app = new App(rng, renderer, state.floor, map, texture, imageMap)
        return app
    }
}

interface AppSaveState {
    readonly rng: [number, number, number, number]
    readonly floor: number
}

async function loadImages(renderer: gfx.Renderer, map: maps.Map): Promise<[gfx.Texture, Map<string, number>]> {
    // bake all 24x24 tile images to a single array texture
    // store mapping from image url to index
    const imageUrls = iter.wrap(map.things()).map(th => th.image).filter().distinct().toArray()
    imageUrls.push("./assets/cursor.png")

    const imageMap = new Map<string, number>(imageUrls.map((url, i) => [url, i]))
    const images = await Promise.all(imageUrls.map(url => dom.loadImage(url)))
    const texture = renderer.bakeTextureArray(rl.tileSize, rl.tileSize, images)

    return [texture, imageMap]
}

function loadMap(floor: number): maps.Map | null {
    const json = localStorage.getItem(`${STORAGE_KEY}_MAP_${floor}`)
    if (!json) {
        return null
    }

    const state = JSON.parse(json) as maps.MapSaveState
    const map = maps.Map.load(things.db, state)
    return map
}

function clearState(): void {
    const keys = new Array<string>()
    for (let i = 0; i < localStorage.length; ++i) {
        const key = localStorage.key(i)
        if (key?.startsWith(STORAGE_KEY)) {
            keys.push(key)
        }
    }

    for (const k of keys) {
        localStorage.removeItem(k)
    }
}

function placePlayerAtExit(map: maps.Map, player: rl.Player, dir: rl.ExitDirection) {
    const exit = iter.find(map.exits, x => x.thing.direction == dir)
    if (!exit) {
        throw new Error("Failed to place player, no suitable exit was found")
    }

    // // find an empty cell near the exit
    // const playerPosition = iter.find(maps.visitNeighbors(exit.position, map.width, map.height), x => map.isPassable(x))
    // if (!playerPosition) {
    //     throw new Error("Failed to place player, no passable tile near exit")
    // }

    map.players.set(exit.position, player)
}

async function init() {
    const app = await App.create()
    app.exec()
}

init()