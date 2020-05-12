import * as dom from "../shared/dom.js"
import * as array from "../shared/array.js"
import * as gfx from "./gfx.js"
import * as gen from "./gen.js"
import * as input from "../shared/input.js"
import * as rl from "./rl.js"
import * as geo from "../shared/geo2d.js"

const tileSize = 24

async function generateMap(player: rl.Player, renderer: gfx.Renderer, width: number, height: number): Promise<gen.MapData> {
    const map = gen.generateMap(width, height)

    // bake all 24x24 tile images to a single array texture
    // store mapping from image url to index
    let imageUrls: string[] = []
    imageUrls.push(...map.tiles.map(t => t.image))
    imageUrls.push(...map.fixtures.map(t => t.image))
    imageUrls.push(map.stairsUp.image)
    imageUrls.push(map.stairsDown.image)
    imageUrls.push(player.image)
    imageUrls = imageUrls.filter(url => url)
    imageUrls = array.distinct(imageUrls)

    const layerMap = new Map<string, number>(imageUrls.map((url, i) => [url, i]))
    const images = await Promise.all(imageUrls.map(url => dom.loadImage(url)))
    const texture = renderer.bakeTextureArray(tileSize, tileSize, images)

    const initRenderData = (th: rl.Thing) => {
        const layer = layerMap.get(th.image)
        if (layer === undefined) {
            throw new Error(`texture index not found for ${th.image}`)
        }

        th.renderData = {
            texture: texture,
            textureLayer: layer
        }
    }

    map.tiles.forEach(initRenderData)
    map.fixtures.forEach(initRenderData)
    initRenderData(map.stairsUp)
    initRenderData(map.stairsDown)
    initRenderData(player)

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

function tick(renderer: gfx.Renderer, keys: input.Keys, player: rl.Player, map: gen.MapData) {
    handleInput(player, map, keys)
    drawFrame(renderer, player, map)
    requestAnimationFrame(() => tick(renderer, keys, player, map))
}

function handleInput(player: rl.Player, map: gen.MapData, keys: input.Keys) {
    const position = player.position.clone()

    if (keys.pressed("w")) {
        position.y -= 1
    }

    if (keys.pressed("s")) {
        position.y += 1
    }

    if (keys.pressed("a")) {
        position.x -= 1
    }

    if (keys.pressed("d")) {
        position.x += 1
    }

    if (isPassable(map, position)) {
        player.position = position
    }

    keys.update()
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
    const playerCoords = player.position
    const center = new geo.Point(Math.floor((renderer.canvas.width - tileSize) / 2), Math.floor((renderer.canvas.height - tileSize) / 2))
    const offset = center.subPoint(playerCoords.mulScalar(rl.tileSize))

    handleResize(renderer.canvas)

    // draw various layers of sprites
    for (const tile of map.tiles) {
        drawThing(renderer, offset, tile)
    }

    for (const fixture of map.fixtures) {
        drawThing(renderer, offset, fixture)
    }

    drawThing(renderer, offset, map.stairsUp)
    drawThing(renderer, offset, map.stairsDown)
    drawThing(renderer, offset, player)

    renderer.flush(rl.lightRadius * tileSize)
}

function drawThing(renderer: gfx.Renderer, offset: geo.Point, th: rl.Thing) {
    if (!th.renderData) {
        throw new Error(`renderData is not set for ${th.name} with image: ${th.image}`)
    }

    const spritePosition = th.position.mulScalar(tileSize).addPoint(offset)
    const sprite = new gfx.Sprite({
        position: spritePosition,
        color: [1, 1, 1, 1],
        width: tileSize,
        height: tileSize,
        texture: th.renderData.texture,
        layer: th.renderData.textureLayer,
        flags: gfx.SpriteFlags.Lit | gfx.SpriteFlags.ArrayTexture
    })

    renderer.drawSprite(sprite)
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
        passable: false,
        transparent: true,
        image: "./assets/char.png"
    })

    const map = await generateMap(player, renderer, 16, 16)
    player.position = map.entry.clone()
    const keys = new input.Keys()
    requestAnimationFrame(() => tick(renderer, keys, player, map))
}

main()