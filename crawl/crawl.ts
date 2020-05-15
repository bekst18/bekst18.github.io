import * as dom from "../shared/dom.js"
import * as array from "../shared/array.js"
import * as gfx from "./gfx.js"
import * as gen from "./gen.js"
import * as input from "../shared/input.js"
import * as rl from "./rl.js"
import * as geo from "../shared/geo2d.js"

const tileSize = 24
const moveSpeed = 1

async function generateMap(player: rl.Player, renderer: gfx.Renderer, width: number, height: number): Promise<gen.MapData> {
    const map = gen.generateMap(width, height, player)

    // bake all 24x24 tile images to a single array texture
    // store mapping from image url to index
    let imageUrls: string[] = []
    imageUrls.push(...map.tiles.map(t => t.image))
    imageUrls.push(...map.fixtures.map(t => t.image))

    if (map.stairsUp) {
        imageUrls.push(map.stairsUp.image)
    }

    if (map.stairsDown) {
        imageUrls.push(map.stairsDown.image)
    }

    imageUrls.push(...map.creatures.map(c => c.image))
    imageUrls.push(player.image)
    imageUrls = imageUrls.filter(url => url)
    imageUrls = array.distinct(imageUrls)

    const layerMap = new Map<string, number>(imageUrls.map((url, i) => [url, i]))
    const images = await Promise.all(imageUrls.map(url => dom.loadImage(url)))
    const texture = renderer.bakeTextureArray(tileSize, tileSize, images)

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

const errorsDiv = dom.byId("errors");

function clearErrorMessages() {
    dom.removeAllChildren(errorsDiv)
}

function appendErrorMessage(error: string) {
    console.log(error)
    const div = document.createElement("div");
    div.classList.add("error-message")
    div.textContent = error
    errorsDiv.appendChild(div)
}

function tick(renderer: gfx.Renderer, inp: input.Input, player: rl.Player, map: gen.MapData) {
    handleInput(renderer.canvas, player, map, inp)
    drawFrame(renderer, player, map)
    requestAnimationFrame(() => tick(renderer, inp, player, map))
}

function handleInput(canvas: HTMLCanvasElement, player: rl.Player, map: gen.MapData, inp: input.Input) {
    const position = player.position.clone()

    if (inp.mouseLeftHeld) {
        const center = new geo.Point(canvas.width / 2, canvas.height / 2)
        const mousePosition = new geo.Point(inp.mouseX, inp.mouseY)
        const dxy = mousePosition.subPoint(center)
        const sgn = dxy.sign()
        const abs = dxy.abs()

        if (abs.x > tileSize / 2 && abs.x >= abs.y) {
            position.x += sgn.x
        }

        if (abs.y > tileSize / 2 && abs.y > abs.x) {
            position.y += sgn.y
        }
    }

    if (inp.pressed("w")) {
        position.y -= 1
    }

    if (inp.pressed("s")) {
        position.y += 1
    }

    if (inp.pressed("a")) {
        position.x -= 1
    }

    if (inp.pressed("d")) {
        position.x += 1
    }

    if (isPassable(map, position)) {
        player.position = position
    }

    inp.flush()
}

function isPassable(map: gen.MapData, xy: geo.Point): boolean {
    const tiles = array.filter(map.tiles, t => t.position.equal(xy))
    for (const tile of tiles) {
        if (!tile.passable) {
            return false
        }
    }

    const fixtures = array.filter(map.fixtures, t => t.position.equal(xy))
    for (const fixture of fixtures) {
        if (!fixture.passable) {
            return false
        }
    }

    return true
}

function drawFrame(renderer: gfx.Renderer, player: rl.Player, map: gen.MapData) {
    // center the grid around the player
    handleResize(renderer.canvas)

    const playerCoords = player.position
    const center = new geo.Point(Math.floor((renderer.canvas.width - tileSize) / 2), Math.floor((renderer.canvas.height - tileSize) / 2))
    const offset = center.subPoint(playerCoords.mulScalar(rl.tileSize))

    // note - drawing order matters - draw from bottom to top

    // draw various layers of sprites
    for (const tile of map.tiles) {
        drawThing(renderer, offset, tile)
    }

    for (const fixture of map.fixtures) {
        drawThing(renderer, offset, fixture)
    }

    if (map.stairsUp) {
        drawThing(renderer, offset, map.stairsUp)
    }

    if (map.stairsDown) {
        drawThing(renderer, offset, map.stairsDown)
    }

    for (const creature of map.creatures) {
        drawThing(renderer, offset, creature)
    }

    drawThing(renderer, offset, player)
    drawHealthBar(renderer, player, offset)

    renderer.flush(rl.lightRadius * tileSize)
}

function drawThing(renderer: gfx.Renderer, offset: geo.Point, th: rl.Thing) {
    const spritePosition = th.position.mulScalar(tileSize).addPoint(offset)
    const sprite = new gfx.Sprite({
        position: spritePosition,
        color: th.color,
        width: tileSize,
        height: tileSize,
        texture: th.texture,
        layer: th.textureLayer,
        flags: gfx.SpriteFlags.Lit | gfx.SpriteFlags.ArrayTexture | gfx.SpriteFlags.CastsShadows
    })

    renderer.drawSprite(sprite)
}

function drawHealthBar(renderer: gfx.Renderer, creature: rl.Creature, offset: geo.Point) {
    const width = creature.maxHealth * 4 + 2
    const spritePosition = creature.position.mulScalar(tileSize).addPoint(offset).subPoint(new geo.Point(0, tileSize / 2))
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

async function main() {
    const canvas = dom.byId("canvas") as HTMLCanvasElement
    const renderer = new gfx.Renderer(canvas)

    const player = new rl.Player({
        name: "Player",
        position: new geo.Point(0, 0),
        image: "./assets/char.png",
        maxHealth: 6
    })

    const map = await generateMap(player, renderer, 32, 32)
    const inp = new input.Input(canvas)

    requestAnimationFrame(() => tick(renderer, inp, player, map))
}

main()