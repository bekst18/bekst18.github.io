import * as dom from "../shared/dom.js"
import * as array from "../shared/array.js"
import * as gfx from "./gfx.js"
import * as gen from "./gen.js"
import * as input from "../shared/input.js"
import * as rl from "./rl.js"
import * as geo from "../shared/geo2d.js"
import * as output from "./output.js"
import * as things from "./things.js"
import * as maps from "./maps.js"

enum CommandType {
    Move,
    Equip,
    Use,
    Pass,
    Open,
    Attack,
    ClimbUp,
    ClimbDown
}

interface MoveCommand {
    type: CommandType.Move
    position: geo.Point
}

interface EquipCommand {
    type: CommandType.Equip
    item: rl.Equippable
}

interface PassCommand {
    type: CommandType.Pass
}

interface UseCommand {
    type: CommandType.Use
    item: rl.Usable
}

interface OpenCommand {
    type: CommandType.Open
    fixture: rl.Door
}

interface AttackCommand {
    type: CommandType.Attack
    monster: rl.Monster
}

interface ClimbUpCommand {
    type: CommandType.ClimbUp
}

interface ClimbDownCommand {
    type: CommandType.ClimbDown
}

type Command = MoveCommand | EquipCommand | PassCommand | UseCommand | OpenCommand | AttackCommand | ClimbUpCommand | ClimbDownCommand

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

        this.elem.addEventListener("keypress", (ev) => {
            if (ev.key.toUpperCase() === "Z") {
                this.hide()
            }
        })
    }

    show() {
        const healthSpan = dom.byId("statsHealth") as HTMLSpanElement
        const player = this.player
        const attackSpan = dom.byId("statsAttack") as HTMLSpanElement
        const defenseSpan = dom.byId("statsDefense") as HTMLSpanElement
        const agilitySpan = dom.byId("statsAgility") as HTMLSpanElement
        const levelSpan = dom.byId("statsLevel") as HTMLSpanElement
        const experienceSpan = dom.byId("statsExperience") as HTMLSpanElement
        const experienceRequirement = rl.getExperienceRequirement(player.level + 1)

        healthSpan.textContent = `${player.health} / ${player.maxHealth}`
        attackSpan.textContent = `${player.attack}`
        defenseSpan.textContent = `${player.defense}`
        agilitySpan.textContent = `${player.agility}`
        levelSpan.textContent = `${player.level}`
        experienceSpan.textContent = `${player.experience} / ${experienceRequirement}`

        super.show()
    }
}

class InventoryDialog extends Dialog {
    private readonly openButton = dom.byId("inventoryButton")
    private readonly table = dom.byId("inventoryTable") as HTMLTableElement
    private readonly itemTemplate = dom.byId("inventoryItemTemplate") as HTMLTemplateElement
    private readonly closeButton = dom.byId("inventoryCloseButton") as HTMLButtonElement

    constructor(private readonly player: rl.Player, canvas: HTMLCanvasElement) {
        super(dom.byId("inventoryDialog"), canvas)
        this.openButton.addEventListener("click", () => this.toggle())
        this.closeButton.addEventListener("click", () => this.hide())

        this.elem.addEventListener("keypress", (ev) => {
            if (ev.key.toUpperCase() === "I") {
                this.hide()
            }
        })
    }

    show() {
        this.refresh()
        super.show()
    }

    refresh() {
        const tbody = this.table.tBodies[0]
        dom.removeAllChildren(tbody)

        const items = getSortedItems(this.player.inventory)
        for (const item of items) {
            const fragment = this.itemTemplate.content.cloneNode(true) as DocumentFragment
            const tr = dom.bySelector(fragment, ".item-row")
            const itemNameTd = dom.bySelector(tr, ".item-name")
            const equipButton = dom.bySelector(tr, ".inventory-equip-button") as HTMLButtonElement
            const removeButton = dom.bySelector(tr, ".inventory-remove-button") as HTMLButtonElement
            const useButton = dom.bySelector(tr, ".inventory-use-button") as HTMLButtonElement

            itemNameTd.textContent = item.name
            useButton.hidden = !(item instanceof rl.Usable)
            equipButton.hidden = !rl.isEquippable(item) || this.player.isEquipped(item)
            removeButton.hidden = !this.player.isEquipped(item)

            tbody.appendChild(fragment)
        }
    }
}

class ContainerDialog {
    private readonly dialog: Dialog
    private readonly nameSpan = dom.byId("containerName") as HTMLSpanElement
    private readonly closeButton = dom.byId("containerCloseButton") as HTMLDivElement
    private readonly takeAllButton = dom.byId("containerTakeAllButton") as HTMLDivElement
    private readonly containerTable = dom.byId("containerTable") as HTMLTableElement
    private readonly containerItemTemplate = dom.byId("containerItemTemplate") as HTMLTemplateElement
    private map: maps.Map | null = null
    private container: rl.Container | null = null

    constructor(private readonly player: rl.Player, canvas: HTMLCanvasElement) {
        this.dialog = new Dialog(dom.byId("containerDialog"), canvas)
        this.player = player
        this.closeButton.addEventListener("click", () => this.hide())
        this.takeAllButton.addEventListener("click", () => this.takeAll())

        dom.delegate(this.dialog.elem, "click", ".container-take-button", (ev) => {
            if (!this.container) {
                return
            }

            const btn = ev.target as HTMLButtonElement
            const row = btn.closest(".item-row") as HTMLTableRowElement
            const idx = dom.getElementIndex(row)
            const item = getSortedItems(this.container.items)[idx]
            if (!item) {
                return
            }

            this.container.items.delete(item)
            this.player.inventory.add(item)

            // hide if this was the last item
            if (this.container.items.size == 0) {
                this.hide()
            } else {
                this.refresh()
            }
        })
    }

    show(map: maps.Map, container: rl.Container) {
        this.map = map
        this.container = container
        this.nameSpan.textContent = this.container.name
        this.refresh()
        this.dialog.show()
    }

    hide() {
        if (this.map && this.container) {
            this.map.containers.delete(this.container)
        }

        this.container = null
        this.dialog.hide()
    }

    refresh() {
        const tbody = this.containerTable.tBodies[0]
        dom.removeAllChildren(tbody)

        if (!this.container) {
            return
        }

        const items = getSortedItems(this.container.items)
        for (const item of items) {
            const fragment = this.containerItemTemplate.content.cloneNode(true) as DocumentFragment
            const tr = dom.bySelector(fragment, ".item-row")
            const itemNameTd = dom.bySelector(tr, ".item-name")
            itemNameTd.textContent = item.name
            tbody.appendChild(fragment)
        }
    }

    takeAll() {
        if (!this.container) {
            return
        }

        for (const item of this.container.items) {
            this.container.items.delete(item)
            this.player.inventory.add(item)
        }

        this.hide()
    }
}

function getSortedItems(items: Iterable<rl.Item>): rl.Item[] {
    const sortedItems = array.orderBy(items, i => i.name)
    return sortedItems
}

function canSee(map: maps.Map, eye: geo.Point, target: geo.Point): boolean {
    for (const pt of march(eye, target)) {
        // ignore start point
        if (pt.equal(eye)) {
            continue
        }

        for (const th of map.at(pt)) {
            if (!th.transparent) {
                return false
            }
        }
    }

    return true
}

function* march(start: geo.Point, end: geo.Point): Generator<geo.Point> {
    const cur = start.clone()
    const dy = Math.abs(end.y - start.y);
    const sy = start.y < end.y ? 1 : -1;
    const dx = -Math.abs(end.x - start.x);
    const sx = start.x < end.x ? 1 : -1;
    let err = dy + dx;

    while (true) {
        yield cur

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

function equipItem(player: rl.Player, item: rl.Equippable): void {
    player.equip(item)
    output.info(`${item.name} was equipped`)
}

function removeItem(player: rl.Player, item: rl.Equippable): void {
    player.remove(item)
    output.info(`${item.name} was removed`)
}

class App {
    private readonly canvas = dom.byId("canvas") as HTMLCanvasElement
    private readonly renderer = new gfx.Renderer(this.canvas)
    private readonly player: rl.Player = things.player.clone()
    private readonly inp: input.Input = new input.Input(this.canvas)
    private readonly statsDialog = new StatsDialog(this.player, this.canvas)
    private readonly inventoryDialog = new InventoryDialog(this.player, this.canvas)
    private readonly containerDialog = new ContainerDialog(this.player, this.canvas)
    private map: maps.Map = new maps.Map(0, 0, this.player)

    constructor() {
        const player = this.player
        player.inventory.add(things.healthPotion.clone())
    }

    async exec() {
        this.map = await gen.generateMap(this.player, this.renderer, 64, 64)
        if (!this.player.position) {
            throw new Error("Player is not positioned")
        }

        output.write("Your adventure begins")
        maps.updateVisibility(this.map, this.map.player.position, rl.lightRadius)
        requestAnimationFrame(() => this.tick())
    }


    tick() {
        const cmd = this.handleInput()
        if (cmd) {
            this.processTurn(cmd)
        }

        this.drawFrame()
        requestAnimationFrame(() => this.tick())
    }

    processTurn(cmd: Command) {
        // find creature with max agility
        // everyone moves relative to this rate
        // everyone gets one action point per round
        // fastest creature(s) require 1 action point to move
        // the rest require an amount of action points according to their ratio with the fastest
        // this all should be repeated until player's turn is processed at which point we should wait for next player move
        const map = this.map
        const creatures = array.orderByDesc(array.append<rl.Creature>(map.monsters, map.player), m => m.agility)
        const maxAgility = creatures.reduce((x, y) => x.agility < y.agility ? x : y).agility
        const actionPerRound = 1 / maxAgility
        let playerMoved = false

        while (!playerMoved) {
            for (const creature of creatures) {
                if (creature.action < 1) {
                    creature.action += actionPerRound
                    continue
                }

                creature.action -= 1

                if (creature instanceof rl.Player) {
                    this.tickPlayer(cmd)
                    playerMoved = true
                }

                if (creature instanceof rl.Monster) {
                    this.tickMonster(creature)
                }
            }

            if (map.player.position) {
                maps.updateVisibility(map, map.player.position, rl.lightRadius)
            }
        }
    }

    getScrollOffset(): geo.Point {
        // convert map point to canvas point, noting that canvas is centered on player
        const playerPosition = this.player.position
        const canvasCenter = new geo.Point(this.canvas.width / 2, this.canvas.height / 2)
        const offset = canvasCenter.subPoint(playerPosition.addScalar(.5).mulScalar(rl.tileSize))
        return offset.floor()
    }

    canvasToMapPoint(cxy: geo.Point) {
        const scrollOffset = this.getScrollOffset()
        const mxy = cxy.subPoint(scrollOffset).divScalar(rl.tileSize)
        return mxy
    }

    mapToCanvasPoint(mxy: geo.Point) {
        const scrollOffset = this.getScrollOffset()
        const cxy = mxy.mulScalar(rl.tileSize).addPoint(scrollOffset)
        return cxy
    }

    tickPlayer(cmd: Command) {
        const player = this.player
        switch (cmd.type) {
            case CommandType.Open: {
                output.info("Door opened")
                this.map.fixtures.delete(cmd.fixture)
            }
                break

            case CommandType.Pass: {
                output.info("Pass")
            }
                break

            case CommandType.Move: {
                player.position = cmd.position
            }
                break

            case CommandType.Equip: {
                output.error("Equip not yet implemented")
            }
                break

            case CommandType.Use: {
                output.error("Use not yet implemented")
            }
                break

            case CommandType.Attack: {
                output.error("Attack not yet implemented")
            }
                break

            case CommandType.ClimbUp: {
                output.error("Climb up not yet implemented")
            }
                break

            case CommandType.ClimbDown: {
                output.error("Climb down yet implemented")
            }
                break
        }
    }

    tickMonster(monster: rl.Monster) {
        // determine whether monster can see player
        if (!monster.position) {
            return
        }

        const map = this.map
        if (!map.player.position) {
            return
        }

        if (canSee(map, monster.position, map.player.position) && monster.state !== rl.MonsterState.aggro) {
            output.warning(`${monster.name} has spotted you!`)
            monster.state = rl.MonsterState.aggro
        }

        if (!canSee(map, monster.position, map.player.position) && monster.state === rl.MonsterState.aggro) {
            output.warning(`${monster.name} has lost sight of you!`)
            monster.state = rl.MonsterState.idle
        }
    }

    handleResize() {
        const canvas = this.canvas
        if (canvas.width === canvas.clientWidth && canvas.height === canvas.clientHeight) {
            return
        }

        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
    }

    handleInput(): Command | null {
        const map = this.map
        const player = this.player
        const inp = this.inp

        if (!player.position) {
            return null
        }

        const position = player.position.clone()

        if (inp.mouseLeftPressed) {
            // determine the map coordinates the user clicked on
            const mxy = this.canvasToMapPoint(new geo.Point(inp.mouseX, inp.mouseY)).floor()

            const clickFixture = map.fixtureAt(mxy)
            if (clickFixture) {
                output.info(`You see ${clickFixture.name}`)
                inp.flush()
                return null
            }

            const clickCreature = map.monsterAt(mxy)
            if (clickCreature) {
                output.info(`You see ${clickCreature.name}`)
                inp.flush()
                return null
            }

            const dxy = mxy.subPoint(player.position)
            const sgn = dxy.sign()
            const abs = dxy.abs()

            if (abs.x > 0 && abs.x >= abs.y) {
                position.x += sgn.x
            }

            if (abs.y > 0 && abs.y > abs.x) {
                position.y += sgn.y
            }

        }
        else if (inp.pressed("w")) {
            position.y -= 1
        }
        else if (inp.pressed("s")) {
            position.y += 1
        }
        else if (inp.pressed("a")) {
            position.x -= 1
        }
        else if (inp.pressed("d")) {
            position.x += 1
        } else if (inp.pressed("z")) {
            this.statsDialog.show()
        } else if (inp.pressed("i")) {
            this.inventoryDialog.show()
        }

        inp.flush()

        if (position.equal(player.position)) {
            return null
        }

        const tile = map.tileAt(position)
        if (tile && !tile.passable) {
            output.info(`Blocked by ${tile.name}`)
            return null
        }

        const container = map.containerAt(position)
        if (container) {
            this.containerDialog.show(map, container)
            return null
        }

        const fixture = map.fixtureAt(position)
        if (fixture instanceof rl.Door) {
            return {
                type: CommandType.Open,
                fixture: fixture
            }
        } else if (fixture instanceof rl.StairsUp) {
            return { type: CommandType.ClimbUp }
        } else if (fixture instanceof rl.StairsDown) {
            return { type: CommandType.ClimbDown }
        } else if (fixture && !fixture.passable) {
            output.info(`Can't move that way, blocked by ${fixture.name}`)
            return null
        }

        const monster = map.monsterAt(position)
        if (monster && !monster.passable) {
            return {
                type: CommandType.Attack,
                monster: monster
            }
        }

        return {
            type: CommandType.Move,
            position: position
        }
    }

    drawFrame() {
        this.handleResize()

        // center the grid around the playerd
        const offset = this.getScrollOffset()

        // note - drawing order matters - draw from bottom to top

        // draw various layers of sprites
        const map = this.map
        for (const tile of map.tiles) {
            this.drawThing(offset, tile)
        }

        for (const fixture of map.fixtures) {
            this.drawThing(offset, fixture)
        }

        for (const container of map.containers) {
            this.drawThing(offset, container)
        }

        for (const creature of map.monsters) {
            this.drawThing(offset, creature)
        }

        this.drawThing(offset, this.player)
        this.drawHealthBar(offset, this.player)

        this.renderer.flush()
    }

    drawThing(offset: geo.Point, th: rl.Thing) {
        // don't draw things that aren't positioned
        if (!th.position) {
            return
        }

        if (th.visible === rl.Visibility.None) {
            return
        }

        const color = th.color.clone()
        if (th.visible === rl.Visibility.Fog) {
            color.a = .5
        }

        const spritePosition = th.position.mulScalar(rl.tileSize).addPoint(offset)
        const sprite = new gfx.Sprite({
            position: spritePosition,
            color: color,
            width: rl.tileSize,
            height: rl.tileSize,
            texture: th.texture,
            layer: th.textureLayer,
            flags: gfx.SpriteFlags.ArrayTexture
        })

        this.renderer.drawSprite(sprite)
    }

    drawHealthBar(offset: geo.Point, creature: rl.Creature) {
        if (!creature.position) {
            return
        }

        const width = creature.maxHealth * 4 + 2
        const spritePosition = creature.position.mulScalar(rl.tileSize).addPoint(offset).subPoint(new geo.Point(0, rl.tileSize / 2))
        this.renderer.drawSprite(new gfx.Sprite({
            position: spritePosition,
            color: gfx.Color.white,
            width: width,
            height: 8
        }))

        this.renderer.drawSprite(new gfx.Sprite({
            position: spritePosition.addPoint(new geo.Point(1, 1)),
            color: gfx.Color.red,
            width: width - 2,
            height: 6
        }))
    }
}

async function init() {
    const app = new App()
    await app.exec()
}

init()