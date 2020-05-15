/**
 * rogue-like library
 */
import * as geo from "../shared/geo2d.js"
import * as rand from "../shared/rand.js"
import * as gfx from "./gfx.js"

export const tileSize = 24
export const lightRadius = 8

export interface ThingOptions {
    position?: geo.Point | null
    passable: boolean
    transparent: boolean
    name: string
    image?: string
    color?: gfx.Color
}

export class Thing {
    position: geo.Point | null
    passable: boolean
    transparent: boolean
    name: string
    image: string
    color = new gfx.Color(1, 1, 1, 1)
    texture: gfx.Texture | null = null
    textureLayer: number = -1

    constructor(options: ThingOptions) {
        this.position = options.position?.clone() ?? null
        this.passable = options.passable
        this.transparent = options.transparent
        this.name = options.name
        this.image = options.image ?? ""

        if (options.color) {
            this.color = options.color
        }
    }
}

export class Dice {
    constructor(readonly min: number = 0, readonly max: number = 0) { }

    roll(): number {
        return rand.int(this.min, this.max + 1)
    }

    clone(): Dice {
        return new Dice(this.min, this.max)
    }
}

export class Tile extends Thing { }
export class Fixture extends Thing { }
export class Door extends Fixture { }
export class StairsUp extends Fixture { }
export class StairsDown extends Fixture { }
export class Item extends Thing { }

export interface WeaponOptions {
    position?: geo.Point | null
    name: string
    image?: string
    color?: gfx.Color
    attack: number
    damage: Dice
}

export class Weapon extends Item {
    readonly attack: number
    readonly damage: Dice

    constructor(options: WeaponOptions) {
        super(Object.assign({ passable: false, transparent: false }, options))
        this.attack = options.attack
        this.damage = options.damage.clone()
    }
}

export interface CreatureOptions {
    position?: geo.Point | null
    name: string
    image: string
    color?: gfx.Color
    maxHealth: number
    health?: number
    attack?: number
    defense?: number
    agility?: number
}

export class Creature extends Thing {
    maxHealth: number
    health: number
    attack: number
    defense: number
    agility: number

    constructor(options: CreatureOptions) {
        super(Object.assign({ passable: false, transparent: false }, options))
        this.maxHealth = options.maxHealth
        this.health = options.health ?? this.maxHealth
        this.attack = options.attack ?? 0
        this.defense = options.defense ?? 0
        this.agility = options.agility ?? 0
    }
}

export class Player extends Creature {
}