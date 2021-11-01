/**
 * rogue-like library
 */
import * as rand from "../shared/rand.js"
import * as gfx from "./gfx.js"

export const tileSize = 24

export interface ThingOptions {
    id: string
    passable: boolean
    transparent: boolean
    name: string
    image?: string
    color?: gfx.Color
}

export class Thing {
    readonly id: string
    passable: boolean
    transparent: boolean
    readonly name: string
    readonly image: string
    readonly color = new gfx.Color(1, 1, 1, 1)

    constructor(options: ThingOptions) {
        this.id = options.id
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

interface FixtureOptions extends ThingOptions {
    lightColor?: gfx.Color
    lightRadius?: number
}

export class Fixture extends Thing {
    lightColor: gfx.Color
    lightRadius: number

    constructor(options: FixtureOptions) {
        super(options)
        this.lightColor = options.lightColor ?? gfx.Color.white.clone()
        this.lightRadius = options.lightRadius ?? 0
    }

    clone(): Fixture {
        return new Fixture(this)
    }
}

export class Door extends Fixture {
    clone(): Door {
        return new Door(this)
    }
}

export enum ExitDirection {
    Up,
    Down,
}

interface ExitOptions {
    id: string
    name: string
    image?: string
    color?: gfx.Color
    direction: ExitDirection
}

export class Exit extends Fixture {
    direction: ExitDirection

    constructor(options: ExitOptions) {
        super(Object.assign({ passable: false, transparent: false }, options))
        this.direction = options.direction
    }

    clone(): Exit {
        return new Exit(this)
    }
}

export interface ItemOptions {
    id: string
    name: string
    image?: string
    color?: gfx.Color
    level: number
    freq?: number
    value: number
}

export class Item extends Thing {
    readonly level: number
    readonly freq: number
    readonly value: number

    constructor(options: ItemOptions) {
        super(Object.assign({ passable: false, transparent: true }, options))

        this.level = options.level
        this.freq = options.freq ?? 1
        this.value = options.value ?? 1
    }

    clone(): Item {
        return new Item(this)
    }
}

export interface WeaponOptions extends ItemOptions {
    readonly attack: number
    readonly range?: number
    readonly verb?: string
    readonly action: number
    readonly damage: Dice
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
    readonly strength: number
    readonly agility: number
    readonly intelligence: number
    readonly maxHealth: number

    constructor(options: RingOptions) {
        super(options)
        this.strength = options.strength ?? 0
        this.agility = options.agility ?? 0
        this.intelligence = options.intelligence ?? 0
        this.maxHealth = options.maxHealth ?? 0
    }
}

export interface LightSourceOptions extends ItemOptions {
    readonly lightRadius: number
    readonly lightColor?: gfx.Color
    readonly duration: number
}

export class LightSource extends Item {
    readonly lightRadius: number
    readonly lightColor: gfx.Color
    duration: number

    constructor(options: LightSourceOptions) {
        super(options)
        this.lightRadius = options.lightRadius
        this.lightColor = options.lightColor ?? gfx.Color.white
        this.duration = options.duration
    }

    clone(): LightSource {
        return new LightSource(this)
    }
}

export type Equippable = MeleeWeapon | RangedWeapon | Armor | Helm | Shield | Ring | LightSource

export function isEquippable(item: Item): item is Equippable {
    return item instanceof Weapon
        || item instanceof Armor
        || item instanceof Shield
        || item instanceof Ring
        || item instanceof LightSource
        || item instanceof Helm
}

export interface UsableOptions extends ItemOptions {
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
    id: string
    name: string
    image: string
    color?: gfx.Color
    maxHealth: number
    health?: number
    agility?: number
    level: number,
    gold: number,
}

export interface Creature extends Thing {
    maxHealth: number
    health: number
    defense: number
    agility: number
    action: number
    actionReserve: number
    level: number,
    gold: number,
}

export interface PlayerOptions extends CreatureOptions {
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
    lightSource?: LightSource | null,
    inventory?: Item[],
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
    lightSource: LightSource | null
    inventory: Item[]
    gold: number

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
        this.lightSource = options.lightSource ?? null
        this.inventory = options.inventory ? [...options.inventory] : []
        this.gold = options.gold ?? 0
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

    get lightRadius(): number {
        if (this.lightSource && this.lightSource.duration > 0) {
            return this.lightSource.lightRadius
        }

        return 1
    }

    get lightColor(): gfx.Color {
        return this.lightSource?.lightColor ?? gfx.Color.white
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

        if (this.lightSource) {
            yield this.lightSource
        }
    }

    clone(): Player {
        return new Player(this)
    }

    equip(item: Item) {
        if (item instanceof MeleeWeapon) {
            this.meleeWeapon = item
        } else if (item instanceof RangedWeapon) {
            this.rangedWeapon = item
        } else if (item instanceof Armor) {
            this.armor = item
        } else if (item instanceof Shield) {
            this.shield = item
        } else if (item instanceof Helm) {
            this.helm = item
        } else if (item instanceof Ring) {
            this.ring = item
        } else if (item instanceof LightSource) {
            this.lightSource = item
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

        if (this.lightSource === item) {
            this.lightSource = null
        }
    }

    delete(item: Item) {
        const index = this.inventory.indexOf(item);
        if (index >= 0) {
            this.inventory.splice(index, 1)
            this.remove(item)
        }
    }

    save(): PlayerSaveState {
        return {
            id: this.id,
            baseStrength: this.baseStrength,
            baseIntelligence: this.baseIntelligence,
            baseAgility: this.baseAgility,
            baseMaxHealth: this.baseMaxHealth,
            level: this.level,
            experience: this.experience,
            health: this.health,
            meleeWeapon: this.meleeWeapon ? this.inventory.indexOf(this.meleeWeapon) : -1,
            rangedWeapon: this.rangedWeapon ? this.inventory.indexOf(this.rangedWeapon) : -1,
            armor: this.armor ? this.inventory.indexOf(this.armor) : -1,
            helm: this.helm ? this.inventory.indexOf(this.helm) : -1,
            shield: this.shield ? this.inventory.indexOf(this.shield) : -1,
            ring: this.ring ? this.inventory.indexOf(this.ring) : -1,
            lightSource: this.lightSource ? this.inventory.indexOf(this.lightSource) : -1,
            inventory: this.inventory.map(i => i.id),
            gold: this.gold,
        }
    }

    load(db: ThingDB, state: PlayerSaveState) {
        this.baseStrength = state.baseStrength
        this.baseIntelligence = state.baseIntelligence
        this.baseAgility = state.baseAgility
        this.baseMaxHealth = state.baseMaxHealth
        this.level = state.level
        this.experience = state.experience
        this.health = state.health

        this.inventory = state.inventory.map(id => {
            const item = db.get(id)
            if (!(item instanceof Item)) {
                throw new Error("non-item in inventory, load failed.")
            }

            return item.clone()
        })

        if (state.meleeWeapon >= 0) {
            this.equip(this.inventory[state.meleeWeapon])
        } else {
            this.meleeWeapon = null
        }

        if (state.rangedWeapon >= 0) {
            this.equip(this.inventory[state.rangedWeapon])
        } else {
            this.rangedWeapon = null
        }

        if (state.helm >= 0) {
            this.equip(this.inventory[state.helm])
        } else {
            this.helm = null
        }

        if (state.armor >= 0) {
            this.equip(this.inventory[state.armor])
        } else {
            this.armor = null
        }

        if (state.shield >= 0) {
            this.equip(this.inventory[state.shield])
        } else {
            this.shield = null
        }

        if (state.ring >= 0) {
            this.equip(this.inventory[state.ring])
        } else {
            this.ring = null
        }

        this.gold = state.gold
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
    freq?: number
}

export class Monster extends Thing implements Creature {
    readonly agility: number
    readonly defense: number
    readonly maxHealth: number
    health: number
    readonly experience: number
    readonly attacks: Attack[] = []
    state: MonsterState = MonsterState.idle
    action: number = 0
    actionReserve: number = 0
    readonly level: number
    readonly freq: number = 1
    readonly gold: number

    constructor(options: MonsterOptions) {
        super(Object.assign({ passable: false, transparent: true }, options))
        this.agility = options.agility ?? 0
        this.defense = options.defense ?? 0
        this.maxHealth = options.maxHealth
        this.health = options.health ?? this.maxHealth
        this.experience = options.experience
        this.attacks = [...options.attacks]
        this.level = options.level
        this.freq = options.freq ?? 1
        this.gold = options.gold ?? 0

        if (this.attacks.length == 0) {
            throw new Error(`No attacks defined for monster ${this.name}`)
        }
    }

    clone(): Monster {
        return new Monster(this)
    }
}

export interface ContainerOptions {
    id: string
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

export class Table<T extends Thing> {
    private readonly map = new Map<string, T>();

    insert(thing: T): T {
        if (this.has(thing.id)) {
            throw new Error(`Attempt to insert duplicate id of ${thing.id}`)
        }

        this.map.set(thing.id, thing)
        return thing
    }

    has(id: string): boolean {
        return this.map.has(id)
    }

    get(id: string): T | undefined {
        return this.map.get(id)
    }

    *[Symbol.iterator](): Generator<T> {
        for (const [_, v] of this.map) {
            yield v
        }
    }
}

export class ThingDB {
    private readonly map = new Map<string, Thing>()

    insert<T extends Thing>(thing: T): T {
        if (this.has(thing.id)) {
            throw new Error(`Attempt to insert duplicate id of ${thing.id}`)
        }

        this.map.set(thing.id, thing)
        return thing
    }

    has(id: string): boolean {
        return this.map.has(id)
    }

    get(id: string): Thing | undefined {
        return this.map.get(id)
    }

    *[Symbol.iterator](): Generator<Thing> {
        for (const [_, v] of this.map) {
            yield v
        }
    }
}

export interface PlayerSaveState {
    id: string,
    baseStrength: number
    baseIntelligence: number
    baseAgility: number
    baseMaxHealth: number
    level: number
    experience: number
    health: number
    meleeWeapon: number
    rangedWeapon: number
    armor: number
    helm: number
    shield: number
    ring: number
    lightSource: number
    inventory: string[],
    gold: number,
}

/**
 * a weighted list from which a random selection can be drawn.
 */
export class WeightedList<T> {
    /**
     * constructor
     * @param data list of [item, relative weight] items
     */
    constructor(private readonly data: [T, number][]) {
        const total = data.map(x => x[1]).reduce((x, y) => x + y, 0)

        for (let i = 0; i < data.length; ++i) {
            data[i][1] /= total
        }
    }

    select(rng: rand.RNG): T {
        let dist = rng.next()
        for (const [x, w] of this.data) {
            dist -= w
            if (dist <= 0) {
                return x
            }
        }

        throw new Error("Invalid or empty list, no selection made")
    }
}