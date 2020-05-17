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

const canvas = dom.byId("canvas") as HTMLCanvasElement
const modalBackground = dom.byId("modalBackground") as HTMLDivElement
const statsDialog = dom.byId("statsDialog") as HTMLDivElement
const inventoryDialog = dom.byId("inventoryDialog") as HTMLDivElement
const containerDialog = dom.byId("containerDialog") as HTMLDivElement
const inventoryTable = dom.byId("inventoryTable") as HTMLTableElement
const containerTable = dom.byId("containerTable") as HTMLTableElement
const inventoryItemTemplate = dom.byId("inventoryItemTemplate") as HTMLTemplateElement
const containerItemTemplate = dom.byId("containerItemTemplate") as HTMLTemplateElement

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

async function generateMap(player: rl.Player, renderer: gfx.Renderer, width: number, height: number): Promise<maps.Map> {
    const map = gen.generateMap(width, height, player)

    // bake all 24x24 tile images to a single array texture
    // store mapping from image url to index
    let imageUrls: string[] = []
    imageUrls.push(...array.map(map.tiles, t => t.image))
    imageUrls.push(...array.map(map.fixtures, t => t.image))
    imageUrls.push(...array.map(map.monsters, c => c.image))
    imageUrls.push(player.image)
    imageUrls = imageUrls.filter(url => url)
    imageUrls = array.distinct(imageUrls)

    const layerMap = new Map<string, number>(imageUrls.map((url, i) => [url, i]))
    const images = await Promise.all(imageUrls.map(url => dom.loadImage(url)))
    const texture = renderer.bakeTextureArray(rl.tileSize, rl.tileSize, images)

    for (const th of map) {
        if (!th.image) {
            th.textureLayer = -1
            th.texture = null
            continue
        }

        const layer = layerMap.get(th.image)
        if (layer === undefined) {
            throw new Error(`texture index not found for ${th.image}`)
        }

        th.texture = texture
        th.textureLayer = layer
    }

    return map
}

function tick(renderer: gfx.Renderer, inp: input.Input, map: maps.Map) {
    const cmd = handleInput(map, inp)
    if (cmd) {
        processTurn(map, cmd)
    }

    drawFrame(renderer, map)
    requestAnimationFrame(() => tick(renderer, inp, map))
}

function processTurn(map: maps.Map, cmd: Command) {
    // find creature with max agility
    // everyone moves relative to this rate
    // everyone gets one action point per round
    // fastest creature(s) require 1 action point to move
    // the rest require an amount of action points according to their ratio with the fastest
    // this all should be repeated until player's turn is processed at which point we should wait for next player move
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
                tickPlayer(map, creature, cmd)
                playerMoved = true
            }

            if (creature instanceof rl.Monster) {
                tickMonster(map, creature)
            }
        }

        if (map.player.position) {
            maps.updateVisibility(map, map.player.position, rl.lightRadius)
        }
    }
}

function getScrollOffset(playerPosition: geo.Point): geo.Point {
    // convert map point to canvas point, noting that canvas is centered on player
    const canvasCenter = new geo.Point(canvas.width / 2, canvas.height / 2)
    const offset = canvasCenter.subPoint(playerPosition.addScalar(.5).mulScalar(rl.tileSize))
    return offset.floor()
}

function canvasToMapPoint(playerPosition: geo.Point, cxy: geo.Point) {
    const scrollOffset = getScrollOffset(playerPosition)
    const mxy = cxy.subPoint(scrollOffset).divScalar(rl.tileSize)
    return mxy
}

function mapToCanvasPoint(playerPosition: geo.Point, mxy: geo.Point) {
    const scrollOffset = getScrollOffset(playerPosition)
    const cxy = mxy.mulScalar(rl.tileSize).addPoint(scrollOffset)
    return cxy
}

function handleInput(map: maps.Map, inp: input.Input): Command | null {
    const player = map.player
    if (!player.position) {
        return null
    }

    const position = player.position.clone()

    if (inp.mouseLeftPressed) {
        // determine the map coordinates the user clicked on
        const mxy = canvasToMapPoint(player.position, new geo.Point(inp.mouseX, inp.mouseY)).floor()

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
        showStats(player)
    } else if (inp.pressed("i")) {
        showInventory(player)
    }

    inp.flush()

    if (position.equal(player.position)) {
        return null
    }

    const tile = map.tileAt(position)
    if (tile && !tile.passable) {
        output.info(`Can't move that way, blocked by ${tile.name}`)
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
    }
    else if (fixture && !fixture.passable) {
        output.info(`Can't move that way, blocked by ${fixture.name}`)
        return null
    }

    const container = map.containerAt(position)
    if (container) {

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

function drawFrame(renderer: gfx.Renderer, map: maps.Map) {
    const player = map.player
    if (!player.position) {
        return
    }

    handleResize(renderer.canvas)

    // center the grid around the playerd
    const offset = getScrollOffset(player.position)

    // note - drawing order matters - draw from bottom to top

    // draw various layers of sprites
    for (const tile of map.tiles) {
        drawThing(renderer, offset, tile)
    }

    for (const fixture of map.fixtures) {
        drawThing(renderer, offset, fixture)
    }

    for (const creature of map.monsters) {
        drawThing(renderer, offset, creature)
    }

    drawThing(renderer, offset, player)
    drawHealthBar(renderer, player, offset)

    renderer.flush(rl.lightRadius * rl.tileSize)
}

function drawThing(renderer: gfx.Renderer, offset: geo.Point, th: rl.Thing) {
    // don't draw things that aren't positioned
    if (!th.position) {
        return
    }

    if (th.visible !== rl.Visible.Visible) {
        return
    }

    const spritePosition = th.position.mulScalar(rl.tileSize).addPoint(offset)
    const sprite = new gfx.Sprite({
        position: spritePosition,
        color: th.color,
        width: rl.tileSize,
        height: rl.tileSize,
        texture: th.texture,
        layer: th.textureLayer,
        flags: gfx.SpriteFlags.Lit | gfx.SpriteFlags.ArrayTexture | gfx.SpriteFlags.CastsShadows
    })

    renderer.drawSprite(sprite)
}

function drawHealthBar(renderer: gfx.Renderer, creature: rl.Creature, offset: geo.Point) {
    if (!creature.position) {
        return
    }

    const width = creature.maxHealth * 4 + 2
    const spritePosition = creature.position.mulScalar(rl.tileSize).addPoint(offset).subPoint(new geo.Point(0, rl.tileSize / 2))
    renderer.drawSprite(new gfx.Sprite({
        position: spritePosition,
        color: gfx.Color.white,
        width: width,
        height: 8
    }))

    renderer.drawSprite(new gfx.Sprite({
        position: spritePosition.addPoint(new geo.Point(1, 1)),
        color: gfx.Color.red,
        width: width - 2,
        height: 6
    }))
}

function handleResize(canvas: HTMLCanvasElement) {
    if (canvas.width === canvas.clientWidth && canvas.height === canvas.clientHeight) {
        return
    }

    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
}

function showDialog(dialog: HTMLDivElement) {
    modalBackground.hidden = false
    dialog.hidden = false
    dialog.focus()
}

function hideDialog(dialog: HTMLDivElement) {
    modalBackground.hidden = true
    dialog.hidden = true
    canvas.focus()
}

function showStats(player: rl.Player) {
    const healthSpan = dom.byId("statsHealth") as HTMLSpanElement
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

    showDialog(statsDialog)
}

function toggleStats(player: rl.Player) {
    if (statsDialog.hidden) {
        showStats(player)
    } else {
        hideDialog(statsDialog)
    }
}

function showInventory(player: rl.Player) {
    const tbody = inventoryTable.tBodies[0]
    dom.removeAllChildren(tbody)

    const items = getSortedInventoryItems(player)
    for (const item of items) {
        const fragment = inventoryItemTemplate.content.cloneNode(true) as DocumentFragment
        const tr = dom.bySelector(fragment, ".item-row")
        const itemNameTd = dom.bySelector(tr, ".item-name")
        const equipButton = dom.bySelector(tr, ".inventory-equip-button") as HTMLButtonElement
        const removeButton = dom.bySelector(tr, ".inventory-remove-button") as HTMLButtonElement
        const useButton = dom.bySelector(tr, ".inventory-use-button") as HTMLButtonElement

        itemNameTd.textContent = item.name
        useButton.hidden = !(item instanceof rl.Usable)
        equipButton.hidden = !rl.isEquippable(item) || player.isEquipped(item)
        removeButton.hidden = !player.isEquipped(item)

        tbody.appendChild(fragment)
    }

    showDialog(inventoryDialog)
}

function getSortedInventoryItems(player: rl.Player): rl.Item[] {
    const items = array.orderBy(player.inventory, i => i.name)
    return items
}

function toggleInventory(player: rl.Player) {
    if (inventoryDialog.hidden) {
        showInventory(player)
    } else {
        hideDialog(inventoryDialog)
    }
}

function tickPlayer(map: maps.Map, player: rl.Player, cmd: Command) {
    switch (cmd.type) {
        case CommandType.Open: {
            output.info("Door opened")
            map.fixtures.delete(cmd.fixture)
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

function tickMonster(map: maps.Map, monster: rl.Monster) {
    // determine whether monster can see player
    if (!monster.position) {
        return
    }

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

async function main() {
    const renderer = new gfx.Renderer(canvas)

    const player = things.player.clone()
    player.inventory.add(things.steelShield.clone())
    player.inventory.add(things.steelSword.clone())
    player.inventory.add(things.steelPlateArmor.clone())
    player.inventory.add(things.weakHealthPotion.clone())
    player.inventory.add(things.healthPotion.clone())

    const map = await generateMap(player, renderer, 64, 64)
    const inp = new input.Input(canvas)

    initStatsDialog(player)
    initInventoryDialog(player)
    initContainerDialog(player)

    if (!player.position) {
        throw new Error("Player is not positioned")
    }
    
    maps.updateVisibility(map, player.position, rl.lightRadius)

    output.write("Your adventure begins")
    requestAnimationFrame(() => tick(renderer, inp, map))
}

function initStatsDialog(player: rl.Player) {
    const statsButton = dom.byId("statsButton") as HTMLButtonElement
    const closeButton = dom.byId("statsCloseButton") as HTMLDivElement
    statsButton.addEventListener("click", () => toggleStats(player))
    closeButton.addEventListener("click", () => hideDialog(statsDialog))

    statsDialog.addEventListener("keypress", (ev) => {
        if (ev.key.toUpperCase() === "Z") {
            hideDialog(statsDialog)
        }
    })
}

function initInventoryDialog(player: rl.Player) {
    const inventoryButton = dom.byId("inventoryButton") as HTMLButtonElement
    const closeButton = dom.byId("inventoryCloseButton") as HTMLButtonElement
    inventoryButton.addEventListener("click", () => toggleInventory(player))
    closeButton.addEventListener("click", () => hideDialog(inventoryDialog))

    inventoryDialog.addEventListener("keypress", (ev) => {
        if (ev.key.toUpperCase() === "I") {
            hideDialog(inventoryDialog)
        }
    })

    dom.delegate(inventoryDialog, "click", ".inventory-equip-button", (ev) => {
        const btn = ev.target as HTMLButtonElement
        const row = btn.closest(".item-row") as HTMLTableRowElement
        const idx = dom.getElementIndex(row)
        const item = getSortedInventoryItems(player)[idx]
        if (!item) {
            return
        }

        if (!rl.isEquippable(item)) {
            return
        }

        equipItem(player, item)
        showInventory(player)
    })

    dom.delegate(inventoryDialog, "click", ".inventory-remove-button", (ev) => {
        const btn = ev.target as HTMLButtonElement
        const row = btn.closest(".item-row") as HTMLTableRowElement
        const idx = dom.getElementIndex(row)
        const item = getSortedInventoryItems(player)[idx]
        if (!item) {
            return
        }

        if (!rl.isEquippable(item)) {
            return
        }

        if (!player.isEquipped(item)) {
            return
        }

        removeItem(player, item)
        showInventory(player)
    })

    dom.delegate(inventoryDialog, "click", ".inventory-use-button", (ev) => {
        const btn = ev.target as HTMLButtonElement
        const row = btn.closest(".item-row") as HTMLTableRowElement
        const idx = dom.getElementIndex(row)
        const item = getSortedInventoryItems(player)[idx]
        if (!item) {
            return
        }

        if (!(item instanceof rl.Usable)) {
            return
        }

        useItem(player, item)
        showInventory(player)
    })

    dom.delegate(inventoryDialog, "click", ".inventory-drop-button", (ev) => {
        const btn = ev.target as HTMLButtonElement
        const row = btn.closest(".item-row") as HTMLTableRowElement
        const idx = dom.getElementIndex(row)
        const item = getSortedInventoryItems(player)[idx]
        if (!item) {
            return
        }

        dropItem(player, item)
        showInventory(player)
    })
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

function initContainerDialog(player: rl.Player) {
    const closeButton = dom.byId("containerCloseButton") as HTMLDivElement
    closeButton.addEventListener("click", () => hideDialog(containerDialog))
    const takeAllButton = dom.byId("containerTakeAllButton") as HTMLDivElement
    takeAllButton.addEventListener("click", () => takeAll(player))
}

function takeAll(player: rl.Player) {
    hideDialog(containerDialog)
}

main()