import * as dom from "../shared/dom.js"
import * as array from "../shared/array.js"
import * as gfx from "./gfx.js"
import * as gen from "./gen.js"
import * as input from "../shared/input.js"
import * as rl from "./rl.js"

const tileSize = 24

async function generateMap(player: rl.Player, renderer: gfx.Renderer, width: number, height: number): Promise<gen.MapData> {
    const data = gen.generateMap(player, width, height)

    // bake all 24x24 tile images to a single array texture
    // store mapping from image url to index
    let imageUrls: string[] = []
    imageUrls.push(...data.tiles.map(t => t.image))
    imageUrls.push(...data.fixtures.map(t => t.image))
    imageUrls.push(data.stairsUp.image)
    imageUrls.push(data.stairsDown.image)
    imageUrls.push(data.player.image)
    imageUrls = imageUrls.filter(url => url)
    imageUrls = array.distinct(imageUrls)

    const layerMap = new Map<string, number>(imageUrls.map((url, i) => [url, i]))
    const images = await Promise.all(imageUrls.map(url => dom.loadImage(url)))
    const texture = renderer.bakeTextureArray(tileSize, tileSize, images)

    const assignTexture = (th: rl.Thing) => {
        const layer = layerMap.get(th.image)
        if (layer === undefined) {
            throw new Error(`texture index not found for ${th.image}`)
        }

        th.texture = texture
        th.textureLayer = layer
    }

    data.tiles.forEach(assignTexture)
    data.fixtures.forEach(assignTexture)
    assignTexture(data.stairsUp)
    assignTexture(data.stairsDown)
    assignTexture(data.player)

    return data
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

function tick(renderer: gfx.Renderer, keys: input.Keys, map: gen.MapData) {
    handleInput(map, keys)
    drawFrame(renderer, map)
    requestAnimationFrame(() => tick(renderer, keys, map))
}

function handleInput(map: gen.MapData, keys: input.Keys) {
    const player = map.player
    const position: rl.Coords = [player.position[0], player.position[1]]

    if (keys.pressed("w")) {
        position[1] -= 1
    }

    if (keys.pressed("s")) {
        position[1] += 1
    }

    if (keys.pressed("a")) {
        position[0] -= 1
    }

    if (keys.pressed("d")) {
        position[0] += 1
    }

    if (isPassable(map, position)) {
        player.position = position
    }

    keys.update()
}

function isPassable(map: gen.MapData, xy: rl.Coords): boolean {
    const [x, y] = xy

    const tiles = array.filter(map.tiles, t => t.position[0] === x && t.position[1] === y)
    for (const tile of tiles) {
        if (!tile.passable) {
            return false
        }
    }

    const fixtures = array.filter(map.fixtures, t => t.position[0] === x && t.position[1] === y)
    for (const fixture of fixtures) {
        if (!fixture.passable) {
            return false
        }
    }

    return true
}

function drawFrame(renderer: gfx.Renderer, map: gen.MapData) {
    // center the grid around the player
    const playerCoords = map.player.position
    const centerX = Math.floor((renderer.canvas.width - tileSize) / 2)
    const centerY = Math.floor((renderer.canvas.height - tileSize) / 2)
    const offset: rl.Coords = [centerX - playerCoords[0] * tileSize, centerY - playerCoords[1] * tileSize]

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
    drawThing(renderer, offset, map.player)

    renderer.flush()
}

function drawThing(renderer: gfx.Renderer, offset: rl.Coords, th: rl.Thing) {
    if (!th.texture) {
        console.log(th)
        throw new Error(`texture is not set for ${th.name} - image: ${th.image}`);
    }

    if (th.textureLayer === null) {
        console.log(th)
        throw new Error(`textureLayer is not set for ${th.name} - image ${th.image}`)
    }

    const [x, y] = th.position
    const [ox, oy] = offset

    const sprite: gfx.Sprite = {
        position: [x * tileSize + ox, y * tileSize + oy],
        color: [1, 1, 1, 1],
        width: tileSize,
        height: tileSize,
        texture: th.texture,
        layer: th.textureLayer
    }

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

    const player: rl.Player = {
        name: "Player",
        position: [0, 0],
        passable: false,
        transparent: true,
        image: "./assets/char.png",
        texture: null,
        textureLayer: null
    }

    const map = await generateMap(player, renderer, 32, 32)
    const keys = new input.Keys()
    requestAnimationFrame(() => tick(renderer, keys, map))
}

main()