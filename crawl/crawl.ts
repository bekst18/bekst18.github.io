import * as dom from "../shared/dom.js"
import * as array from "../shared/array.js"
import * as gfx from "./gfx.js"
import * as gen from "./gen.js"
import * as input from "../shared/input.js"
import * as rl from "./rl.js"
import * as geo from "../shared/geo2d.js"
import * as output from "./output.js"

const canvas = dom.byId("canvas") as HTMLCanvasElement
const modalBackground = dom.byId("modalBackground") as HTMLDivElement
const statsDialog = dom.byId("statsDialog") as HTMLDivElement
const statsCloseButton = dom.byId("statsCloseButton") as HTMLDivElement

async function generateMap(player: rl.Player, renderer: gfx.Renderer, width: number, height: number): Promise<gen.MapData> {
    const map = gen.generateMap(width, height, player)

    // bake all 24x24 tile images to a single array texture
    // store mapping from image url to index
    let imageUrls: string[] = []
    imageUrls.push(...array.map(map.tiles, t => t.image))
    imageUrls.push(...array.map(map.fixtures, t => t.image))
    imageUrls.push(...array.map(map.creatures, c => c.image))
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

function tick(renderer: gfx.Renderer, inp: input.Input, player: rl.Player, map: gen.MapData) {
    handleInput(renderer.canvas, player, map, inp)
    drawFrame(renderer, player, map)
    requestAnimationFrame(() => tick(renderer, inp, player, map))
}

function handleInput(canvas: HTMLCanvasElement, player: rl.Player, map: gen.MapData, inp: input.Input) {
    if (!player.position) {
        return
    }

    const position = player.position.clone()

    if (inp.mouseLeftPressed) {
        const center = new geo.Point(canvas.width / 2, canvas.height / 2)
        const mousePosition = new geo.Point(inp.mouseX, inp.mouseY)
        const dxy = mousePosition.subPoint(center)
        const sgn = dxy.sign()
        const abs = dxy.abs()

        if (abs.x > rl.tileSize / 2 && abs.x >= abs.y) {
            position.x += sgn.x
        }

        if (abs.y > rl.tileSize / 2 && abs.y > abs.x) {
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
    }

    inp.flush()

    // no move - flush & exit
    if (position.equal(player.position)) {
        return
    }

    const tile = map.tileAt(position)
    if (tile && !tile.passable) {
        return
    }

    const fixture = map.fixtureAt(position)
    if (fixture instanceof rl.Door) {
        output.info("Door opened")
        map.fixtures.delete(fixture)
    } else if (fixture && !fixture.passable) {
        return
    }

    const creature = map.creatureAt(position)
    if (creature && !creature.passable) {
        return
    }

    player.position = position
}

function drawFrame(renderer: gfx.Renderer, player: rl.Player, map: gen.MapData) {
    if (!player.position) {
        return
    }

    // center the grid around the player
    handleResize(renderer.canvas)

    const center = new geo.Point(
        Math.floor((renderer.canvas.width - rl.tileSize) / 2),
        Math.floor((renderer.canvas.height - rl.tileSize) / 2))

    const offset = center.subPoint(player.position.mulScalar(rl.tileSize))

    // note - drawing order matters - draw from bottom to top

    // draw various layers of sprites
    for (const tile of map.tiles) {
        drawThing(renderer, offset, tile)
    }

    for (const fixture of map.fixtures) {
        drawThing(renderer, offset, fixture)
    }

    for (const creature of map.creatures) {
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

    healthSpan.textContent = `${player.health} / ${player.maxHealth}`
    attackSpan.textContent = `${player.attack}`
    defenseSpan.textContent = `${player.defense}`
    agilitySpan.textContent = `${player.agility}`

    showDialog(statsDialog)
}

function toggleStats(player: rl.Player) {
    if (statsDialog.hidden) {
        showStats(player)
    } else {
        hideDialog(statsDialog)
    }
}

async function main() {
    const statsButton = dom.byId("statsButton") as HTMLButtonElement

    const renderer = new gfx.Renderer(canvas)

    const player = new rl.Player({
        name: "Player",
        position: new geo.Point(0, 0),
        image: "./assets/char.png",
        maxHealth: 6
    })

    const map = await generateMap(player, renderer, 128, 128)
    const inp = new input.Input(canvas)

    output.write("Your adventure begins")
    requestAnimationFrame(() => tick(renderer, inp, player, map))

    statsButton.addEventListener("click", () => toggleStats(player))
    statsCloseButton.addEventListener("click", () => hideDialog(statsDialog))

    statsDialog.addEventListener("keypress", (ev)=> {
        if (ev.key.toUpperCase() === "Z") {
            hideDialog(statsDialog)
        }
    })
}

main()