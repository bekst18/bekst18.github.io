/**
 * rogue-like library
 */
import * as geo from "../shared/geo2d.js"
import * as rand from "../shared/rand.js"
import * as gfx from "./gfx.js"

export const tileSize = 24
export const lightRadius = 5

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

    clone(): Thing {
        return new Thing(this)
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

export class Tile extends Thing {
    clone(): Tile {
        return new Tile(this)
    }
}

export class Fixture extends Thing {
    clone(): Fixture {
        return new Fixture(this)
    }
}

export class Door extends Fixture {
    clone(): Door {
        return new Door(this)
    }
}

export class StairsUp extends Fixture {
    clone(): StairsUp {
        return new StairsUp(this)
    }
}

export class StairsDown extends Fixture {
    clone(): StairsDown {
        return new StairsDown(this)
    }
}

export class Item extends Thing { }

export interface WeaponOptions {
    position?: geo.Point | null
    name: string
    image?: string
    color?: gfx.Color
    attack: number
    range?: number
    damage: Dice
}

export class Weapon extends Item {
    readonly attack: number
    readonly damage: Dice
    readonly range: number

    constructor(options: WeaponOptions) {
        super(Object.assign({ passable: false, transparent: false }, options))
        this.attack = options.attack
        this.damage = options.damage.clone()
        this.range = options.range ?? 1
    }

    clone(): Weapon {
        return new Weapon(this)
    }
}

export interface ArmorOptions {
    position?: geo.Point | null
    name: string
    image?: string
    color?: gfx.Color
    defense: number
}

export class Armor extends Item {
    readonly defense: number

    constructor(options: ArmorOptions) {
        super(Object.assign({ passable: false, transparent: false }, options))
        this.defense = options.defense
    }

    clone(): Armor {
        return new Armor(this)
    }
}

export interface ShieldOptions {
    position?: geo.Point | null
    name: string
    image?: string
    color?: gfx.Color
    defense: number
}

export class Shield extends Item {
    readonly defense: number

    constructor(options: ShieldOptions) {
        super(Object.assign({ passable: false, transparent: false }, options))
        this.defense = options.defense
    }

    clone(): Shield {
        return new Shield(this)
    }
}

export interface UsableOptions {
    position?: geo.Point | null
    name: string
    image?: string
    color?: gfx.Color
    health: number
}

export class Usable extends Item {
    readonly health: number

    constructor(options: UsableOptions) {
        super(Object.assign({ passable: false, transparent: false }, options))
        this.health = options.health
    }

    clone(): Usable {
        return new Usable(this)
    }
}

export interface CreatureOptions {
    position?: geo.Point | null
    name: string
    image: string
    color?: gfx.Color
    maxHealth: number
    health?: number
    attack: number
    defense: number
    agility: number
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
        this.attack = options.attack
        this.defense = options.defense
        this.agility = options.agility
    }

    clone(): Creature {
        return new Creature(this)
    }
}

export interface PlayerOptions extends CreatureOptions {
    level?: number
    experience?: number
    weapon?: Weapon | null
    armor?: Armor | null
    shield?: Shield | null
}

export class Player extends Creature {
    level: number = 1
    experience: number = 0
    weapon: Weapon | null
    armor: Armor | null
    shield: Shield | null

    constructor(options: PlayerOptions) {
        super(options)

        this.level = options.level ?? 1
        if (this.level < 1) {
            this.level = 1
        }

        this.experience = options.experience ?? 0
        this.weapon = options.weapon ?? null
        this.armor = options.armor ?? null
        this.shield = options.shield ?? null
    }

    clone(): Player {
        return new Player(this)
    }
}

export interface AttackOptions {
    attack?: number
    damage: Dice
    verb?: string
}

export class Attack {
    attack: number
    damage: Dice
    verb: string

    constructor(options: AttackOptions) {
        this.attack = options.attack ?? 0
        this.damage = options.damage.clone()
        this.verb = options.verb ?? ""
    }

    clone(): Attack {
        return new Attack(this)
    }
}

export enum MonsterState {
    idle,
    aggro
}

export interface MonsterOptions extends CreatureOptions {
    experience: number,
    attacks: Attack[],
    state?: MonsterState
}

export class Monster extends Creature {
    experience: number
    readonly attacks: Attack[] = []
    state: MonsterState

    constructor(options: MonsterOptions) {
        super(options)
        this.experience = options.experience
        this.attacks = [...options.attacks]
        this.state = options.state ?? MonsterState.idle

        if (this.attacks.length == 0) {
            throw new Error(`No attacks defined for monster ${this.name}`)
        }
    }

    clone(): Monster {
        return new Monster(this)
    }
}

const levels = [
    10,
    20,
    50,
    100,
    200,
    500,
    1000,
    2000,
    5000,
    10000]

export function getExperienceRequirement(level: number): number {
    if (level < 2) {
        return 0
    }

    if (level - 2 >= levels.length) {
        return Infinity
    }

    return levels[level - 2]
}