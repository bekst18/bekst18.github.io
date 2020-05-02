import * as dom from "../shared/dom.js"
import * as array from "../shared/array.js"
import * as gfx from "./gfx.js"
import * as gen from "./gen.js"
import * as grid from "../shared/grid.js"

const tileSize = 24

interface Thing {
    name: string
    texture: WebGLTexture
    textureLayer: number
}

interface Tile {
    things: Thing[]
}

type MapGrid = grid.Grid<Tile>

async function generateMap(renderer: gfx.Renderer, width: number, height: number) {
    const gmap = gen.generateMap(width, height)

    // bake all 24x24 tile images to a single texture
    // store mapping from image url to index
    const imageUrls = array.mapDistinct(gen.iterThings(gmap), th => th.image)
    const layerMap = new Map<string, number>(imageUrls.map((url, i) => [url, i]))
    const images = await Promise.all(imageUrls.map(url => dom.loadImage(url)))
    const texture = renderer.bakeTextureArray(tileSize, tileSize, images)

    const map: MapGrid = new grid.Grid<Tile>(gmap.width, gmap.height, (x, y) => {
        const gtile = gmap.at(x, y)
        const tile: Tile = {
            things: []
        }

        for (const gthing of gtile.things) {
            const layer = layerMap.get(gthing.image)
            if (typeof layer === "undefined") {
                throw new Error(`texture index not found for ${gthing.image}`)
            }

            const thing: Thing = {
                name: gthing.name,
                texture: texture,
                textureLayer: layer
            }

            tile.things.push(thing)
        }

        return tile
    })

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

function tick(renderer: gfx.Renderer, map: TileMap) {
    for (let ty = 0; ty < map.height; ++ty) {
        for (let tx = 0; tx < map.width; ++tx) {
            const tile = map.at(tx, ty)
            const x = tx * tileSize
            const y = ty * tileSize
            for (const thing of tile.things) {
                const sprite: gfx.Sprite = {
                    position: [x, y],
                    color: [1, 1, 1, 1],
                    width: tileSize,
                    height: tileSize,
                    texture: thing.texture,
                    layer: thing.textureLayer
                }

                renderer.drawSprite(sprite)
            }
        }
    }

    renderer.flush()
}


async function main() {
    const canvas = dom.byId("canvas") as HTMLCanvasElement
    const renderer = new gfx.Renderer(canvas)
    const map = await generateMap(renderer, 32, 32)
    requestAnimationFrame(() => tick(renderer, map))
}

main()