/**
 * rogue-like library
 */
import * as geo from "../shared/geo2d.js"
import * as gfx from "./gfx.js"

export const tileSize = 24
export const lightRadius = 8

export interface ThingOptions {
    position?: geo.Point
    passable: boolean
    transparent: boolean
    name: string
    image?: string
    color?: gfx.Color
}

export class Thing {
    position: geo.Point
    passable: boolean
    transparent: boolean
    name: string
    image: string
    color = new gfx.Color(1, 1, 1, 1)
    texture: gfx.Texture | null = null
    textureLayer: number = -1

    constructor(options: ThingOptions) {
        this.position = options.position?.clone() ?? new geo.Point(0, 0)
        this.passable = options.passable
        this.transparent = options.transparent
        this.name = options.name
        this.image = options.image ?? ""

        if (options.color) {
            this.color = options.color
        }
    }
}

export class Tile extends Thing { }
export class Fixture extends Thing { }

export interface CreatureOptions {
    position?: geo.Point
    name: string
    image: string
    color?: gfx.Color
    maxHealth: number
    health?: number
}

export class Creature extends Thing {
    maxHealth: number
    health: number

    constructor(options: CreatureOptions) {
        super(Object.assign({ passable: false, transparent: false }, options))
        this.maxHealth = options.maxHealth
        this.health = options.health ?? this.maxHealth
    }
}

export class Player extends Creature {
}