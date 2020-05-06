/**
 * rogue-like library
 */
import * as geo from "../shared/geo2d"

export const tileSize = 24

export interface ThingOptions {
    position: geo.Point
    passable: boolean
    transparent: boolean
    name: string
    image: string
    renderData?: RenderData
}

export interface RenderData {
    texture: WebGLTexture
    textureLayer: number
}

export class Thing {
    position: geo.Point
    passable: boolean
    transparent: boolean
    name: string
    image: string
    renderData: RenderData | undefined

    constructor(options: ThingOptions) {
        this.position = options.position
        this.passable = options.passable
        this.transparent = options.transparent
        this.name = options.name
        this.image = options.image

        if (options.renderData) {
            this.renderData = options.renderData
        }
    }

    clone(): Thing {
        return new Thing({
            position: this.position,
            passable: this.passable,
            transparent: this.transparent,
            name: this.name,
            image: this.image,
            renderData: this.renderData
        })
    }
}

export class Tile extends Thing { }
export class Fixture extends Thing { }
export class Player extends Thing { }