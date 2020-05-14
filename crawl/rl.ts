/**
 * rogue-like library
 */
import * as geo from "../shared/geo2d"
import * as gfx from "./gfx.js"

export const tileSize = 24
export const lightRadius = 8

export interface ThingOptions {
    position: geo.Point
    passable: boolean
    transparent: boolean
    name: string
    image: string
    renderData?: RenderData
}

export interface RenderData {
    texture: gfx.Texture
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
            position: this.position.clone(),
            passable: this.passable,
            transparent: this.transparent,
            name: this.name,
            image: this.image,
            renderData: Object.assign({}, this.renderData)
        })
    }
}

export class Tile extends Thing { }
export class Fixture extends Thing { }

export interface PlayerOptions extends ThingOptions {
    maxHealth: number,
    health?: number
}

export class Player extends Thing {
    public maxHealth: number = 0
    public health: number = 0

    constructor(options: PlayerOptions) {
        super(options)
        this.maxHealth = options.maxHealth
        this.health = options.health ?? this.maxHealth
    }
}