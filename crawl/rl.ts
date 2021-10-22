/**
 * rogue-like library
 */
import * as geo from "../shared/geo2d.js"
import * as rand from "../shared/rand.js"
import * as gfx from "./gfx.js"

export const tileSize = 24

export enum Visibility {
    None,
    Fog,
    Visible
}

export interface ThingOptions {
    passable: boolean
    transparent: boolean
    name: string
    image?: string
    color?: gfx.Color
}

export class Thing {
    passable: boolean
    transparent: boolean
    name: string
    image: string
    color = new gfx.Color(1, 1, 1, 1)
    visible: Visibility = Visibility.None

    constructor(options: ThingOptions) {
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

    roll(rng: rand.RNG): number {
        return rand.int(rng, this.min, this.max + 1)
    }

    add(x: number): Dice {
        return new Dice(this.min + x, this.max + x)
    }

    clone(): Dice {
        return new Dice(this.min, this.max)
    }

    toString(): string {
        return `${this.min} - ${this.max}`
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

export interface ItemOptions {
    position?: geo.Point
    name: string
    image?: string
    color?: gfx.Color
}

export class Item extends Thing {
    constructor(options: ItemOptions) {
        super(Object.assign({ passable: false, transparent: true }, options))
    }
}

export interface WeaponOptions extends ItemOptions {
    attack: number
    range?: number
    verb?: string
    action: number
    damage: Dice
}

export class Weapon extends Item {
    readonly attack: number
    readonly damage: Dice
    readonly range: number
    readonly action: number
    readonly verb: string

    constructor(options: WeaponOptions) {
        super(options)
        this.attack = options.attack
        this.damage = options.damage.clone()
        this.range = options.range ?? 1
        this.verb = options.verb ?? ""
        this.action = options.action
    }

    clone(): Weapon {
        return new Weapon(this)
    }
}

export class RangedWeapon extends Weapon {
    clone(): RangedWeapon {
        return new RangedWeapon(this)
    }
}

export class MeleeWeapon extends Weapon {
    clone(): Weapon {
        return new MeleeWeapon(this)
    }
}

export interface ArmorOptions extends ItemOptions {
    defense: number
}

export class Armor extends Item {
    readonly defense: number

    constructor(options: ArmorOptions) {
        super(options)
        this.defense = options.defense
    }

    clone(): Armor {
        return new Armor(this)
    }
}

export interface HelmOptions extends ItemOptions {
    defense: number
}

export class Helm extends Item {
    readonly defense: number

    constructor(options: HelmOptions) {
        super(options)
        this.defense = options.defense
    }

    clone(): Helm {
        return new Helm(this)
    }
}

export interface ShieldOptions extends ItemOptions {
    defense: number
}

export class Shield extends Item {
    readonly defense: number

    constructor(options: ShieldOptions) {
        super(options)
        this.defense = options.defense
    }

    clone(): Shield {
        return new Shield(this)
    }
}

export interface RingOptions extends ItemOptions {
    strength?: number
    agility?: number
    intelligence?: number
    maxHealth?: number
}

export class Ring extends Item {
    strength: number
    agility: number
    intelligence: number
    maxHealth: number

    constructor(options: RingOptions) {
        super(options)
        this.strength = options.strength ?? 0
        this.agility = options.agility ?? 0
        this.intelligence = options.intelligence ?? 0
        this.maxHealth = options.maxHealth ?? 0
    }
}

export type Equippable = MeleeWeapon | RangedWeapon | Armor | Helm | Shield | Ring

export function isEquippable(item: Item): item is Equippable {
    return item instanceof Weapon || item instanceof Armor || item instanceof Shield
}

export interface UsableOptions {
    position?: geo.Point
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
    position?: geo.Point
    name: string
    image: string
    color?: gfx.Color
    maxHealth: number
    health?: number
    agility?: number
}

export interface Creature extends Thing {
    maxHealth: number
    health: number
    defense: number
    agility: number
    action: number
    actionReserve: number
}

export interface CreatureState {
    health: number,
    action: number,
    actionReserve: number,
}

export interface PlayerOptions extends CreatureOptions {
    lightRadius: number
    level?: number
    experience?: number
    strength?: number
    intelligence?: number
    maxHealth: number
    meleeWeapon?: MeleeWeapon | null
    rangedWeapon?: RangedWeapon | null
    armor?: Armor | null
    helm?: Helm | null
    shield?: Shield | null
    ring?: Ring | null
    inventory?: Set<Item>
}

export class Player extends Thing implements Creature {
    baseStrength: number
    baseIntelligence: number
    baseAgility: number
    baseMaxHealth: number
    level: number
    experience: number
    health: number
    action: number = 0
    actionReserve: number = 0
    meleeWeapon: MeleeWeapon | null
    rangedWeapon: RangedWeapon | null
    armor: Armor | null
    helm: Helm | null
    shield: Shield | null
    ring: Ring | null
    lightRadius: number
    inventory: Set<Item>

    constructor(options: PlayerOptions) {
        super(Object.assign({ passable: false, transparent: true }, options))
        this.baseStrength = options.strength ?? 0
        this.baseIntelligence = options.strength ?? 0
        this.baseAgility = options.agility ?? 0
        this.baseMaxHealth = options.maxHealth
        this.level = options.level ?? 1
        this.experience = options.experience ?? 0
        this.health = options.health ?? this.maxHealth
        this.meleeWeapon = options.meleeWeapon ?? null
        this.rangedWeapon = options.rangedWeapon ?? null
        this.helm = options.helm ?? null
        this.armor = options.armor ?? null
        this.shield = options.shield ?? null
        this.ring = options.ring ?? null
        this.lightRadius = options.lightRadius
        this.inventory = options.inventory ? new Set<Item>(options.inventory) : new Set<Item>()
    }

    get strength(): number {
        return this.baseStrength + (this.ring?.strength ?? 0)
    }

    get agility(): number {
        return this.baseAgility + (this.ring?.agility ?? 0)
    }

    get intelligence(): number {
        return this.baseIntelligence + (this.ring?.intelligence ?? 0)
    }

    get maxHealth(): number {
        return this.baseMaxHealth + (this.ring?.maxHealth ?? 0)
    }

    get meleeAttack(): number {
        return this.strength + (this.meleeWeapon?.attack ?? 0)
    }

    get meleeDamage(): Dice {
        return (this.meleeWeapon?.damage ?? new Dice(1, 2)).add(this.strength)
    }

    get rangedAttack(): number {
        return this.agility + (this.rangedWeapon?.attack ?? 0)
    }

    get rangedDamage(): Dice | null {
        return this.rangedWeapon?.damage?.add(this.agility) ?? null
    }

    get defense(): number {
        return this.agility + (this.armor?.defense ?? 0) + (this.helm?.defense ?? 0) + (this.shield?.defense ?? 0)
    }

    isEquipped(item: Item): boolean {
        return [...this.equipment()].includes(item)
    }

    *equipment(): Iterable<Item> {
        if (this.meleeWeapon) {
            yield this.meleeWeapon
        }

        if (this.rangedWeapon) {
            yield this.rangedWeapon
        }

        if (this.armor) {
            yield this.armor
        }

        if (this.helm) {
            yield this.helm
        }

        if (this.shield) {
            yield this.shield
        }

        if (this.ring) {
            yield this.ring
        }
    }

    clone(): Player {
        return new Player(this)
    }

    equip(item: Item) {
        console.log(item)
        if (item instanceof MeleeWeapon) {
            this.meleeWeapon = item
        } else if (item instanceof RangedWeapon) {
            console.log("ranged weapon")
            this.rangedWeapon = item
        } else if (item instanceof Armor) {
            this.armor = item
        } else if (item instanceof Shield) {
            this.shield = item
        } else if (item instanceof Helm) {
            this.helm = item
        } else if (item instanceof Ring) {
            this.ring = item
        }
    }

    remove(item: Item) {
        if (this.meleeWeapon === item) {
            this.meleeWeapon = null
        }

        if (this.rangedWeapon === item) {
            this.rangedWeapon = null
        }

        if (this.armor === item) {
            this.armor = null
        }

        if (this.helm === item) {
            this.helm = null
        }

        if (this.shield === item) {
            this.shield = null
        }

        if (this.ring === item) {
            this.ring = null
        }
    }

    delete(item: Item) {

        if (isEquippable(item)) {
            this.remove(item)
        }

        this.inventory.delete(item)
    }
}

export interface AttackOptions {
    attack: number
    damage: Dice
    action: number
    range?: number
    verb?: string
}

export class Attack {
    attack: number
    damage: Dice
    action: number
    range: number
    verb: string

    constructor(options: AttackOptions) {
        this.attack = options.attack ?? 0
        this.damage = options.damage.clone()
        this.action = options.action
        this.range = options.range ?? 1
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
    defense: number
    experience: number,
    attacks: Attack[]
}

export class Monster extends Thing implements Creature {
    agility: number
    defense: number
    maxHealth: number
    health: number
    experience: number
    readonly attacks: Attack[] = []
    state: MonsterState = MonsterState.idle
    action: number = 0
    actionReserve: number = 0

    constructor(options: MonsterOptions) {
        super(Object.assign({ passable: false, transparent: true }, options))
        this.agility = options.agility ?? 0
        this.defense = options.defense ?? 0
        this.maxHealth = options.maxHealth
        this.health = options.health ?? this.maxHealth
        this.experience = options.experience
        this.attacks = [...options.attacks]

        if (this.attacks.length == 0) {
            throw new Error(`No attacks defined for monster ${this.name}`)
        }
    }

    clone(): Monster {
        return new Monster(this)
    }
}

export interface ContainerOptions {
    position?: geo.Point
    name: string
    image: string
    color?: gfx.Color
    items?: Set<Item>
}

export class Container extends Fixture {
    readonly items: Set<Item>

    constructor(options: ContainerOptions) {
        super(Object.assign({ passable: false, transparent: true }, options))
        this.items = new Set<Item>([...options.items ?? []])
    }

    clone(): Container {
        return new Container(this)
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