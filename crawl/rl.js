/**
 * rogue-like library
 */
import * as rand from "../shared/rand.js";
import * as gfx from "./gfx.js";
export const tileSize = 24;
export class Thing {
    constructor(options) {
        var _a;
        this.color = new gfx.Color(1, 1, 1, 1);
        this.id = options.id;
        this.passable = options.passable;
        this.transparent = options.transparent;
        this.name = options.name;
        this.image = (_a = options.image) !== null && _a !== void 0 ? _a : "";
        if (options.color) {
            this.color = options.color;
        }
    }
    clone() {
        return new Thing(this);
    }
}
export class Dice {
    constructor(min = 0, max = 0) {
        this.min = min;
        this.max = max;
    }
    roll(rng) {
        return rand.int(rng, this.min, this.max + 1);
    }
    add(x) {
        return new Dice(this.min + x, this.max + x);
    }
    clone() {
        return new Dice(this.min, this.max);
    }
    toString() {
        return `${this.min} - ${this.max}`;
    }
}
export class Tile extends Thing {
    clone() {
        return new Tile(this);
    }
}
export class Fixture extends Thing {
    constructor(options) {
        var _a, _b;
        super(options);
        this.lightColor = (_a = options.lightColor) !== null && _a !== void 0 ? _a : gfx.Color.white.clone();
        this.lightRadius = (_b = options.lightRadius) !== null && _b !== void 0 ? _b : 0;
    }
    clone() {
        return new Fixture(this);
    }
}
export class Door extends Fixture {
    clone() {
        return new Door(this);
    }
}
export var ExitDirection;
(function (ExitDirection) {
    ExitDirection[ExitDirection["Up"] = 0] = "Up";
    ExitDirection[ExitDirection["Down"] = 1] = "Down";
})(ExitDirection || (ExitDirection = {}));
export class Exit extends Fixture {
    constructor(options) {
        super(Object.assign({ passable: false, transparent: false }, options));
        this.direction = options.direction;
    }
    clone() {
        return new Exit(this);
    }
}
export class Item extends Thing {
    constructor(options) {
        var _a, _b;
        super(Object.assign({ passable: false, transparent: true }, options));
        this.level = options.level;
        this.freq = (_a = options.freq) !== null && _a !== void 0 ? _a : 1;
        this.value = (_b = options.value) !== null && _b !== void 0 ? _b : 1;
    }
    clone() {
        return new Item(this);
    }
}
export class Weapon extends Item {
    constructor(options) {
        var _a, _b;
        super(options);
        this.attack = options.attack;
        this.damage = options.damage.clone();
        this.range = (_a = options.range) !== null && _a !== void 0 ? _a : 1;
        this.verb = (_b = options.verb) !== null && _b !== void 0 ? _b : "";
        this.action = options.action;
    }
    clone() {
        return new Weapon(this);
    }
}
export class RangedWeapon extends Weapon {
    clone() {
        return new RangedWeapon(this);
    }
}
export class MeleeWeapon extends Weapon {
    clone() {
        return new MeleeWeapon(this);
    }
}
export class Armor extends Item {
    constructor(options) {
        super(options);
        this.defense = options.defense;
    }
    clone() {
        return new Armor(this);
    }
}
export class Helm extends Item {
    constructor(options) {
        super(options);
        this.defense = options.defense;
    }
    clone() {
        return new Helm(this);
    }
}
export class Shield extends Item {
    constructor(options) {
        super(options);
        this.defense = options.defense;
    }
    clone() {
        return new Shield(this);
    }
}
export class Ring extends Item {
    constructor(options) {
        var _a, _b, _c, _d;
        super(options);
        this.strength = (_a = options.strength) !== null && _a !== void 0 ? _a : 0;
        this.agility = (_b = options.agility) !== null && _b !== void 0 ? _b : 0;
        this.intelligence = (_c = options.intelligence) !== null && _c !== void 0 ? _c : 0;
        this.maxHealth = (_d = options.maxHealth) !== null && _d !== void 0 ? _d : 0;
    }
}
export class LightSource extends Item {
    constructor(options) {
        var _a;
        super(options);
        this.lightRadius = options.lightRadius;
        this.lightColor = (_a = options.lightColor) !== null && _a !== void 0 ? _a : gfx.Color.white;
        this.duration = options.duration;
    }
    clone() {
        return new LightSource(this);
    }
}
export function isEquippable(item) {
    return item instanceof Weapon
        || item instanceof Armor
        || item instanceof Shield
        || item instanceof Ring
        || item instanceof LightSource
        || item instanceof Helm;
}
export class Usable extends Item {
    constructor(options) {
        super(Object.assign({ passable: false, transparent: false }, options));
        this.health = options.health;
    }
    clone() {
        return new Usable(this);
    }
}
export class Player extends Thing {
    constructor(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        super(Object.assign({ passable: false, transparent: true }, options));
        this.action = 0;
        this.actionReserve = 0;
        this.baseStrength = (_a = options.strength) !== null && _a !== void 0 ? _a : 0;
        this.baseIntelligence = (_b = options.strength) !== null && _b !== void 0 ? _b : 0;
        this.baseAgility = (_c = options.agility) !== null && _c !== void 0 ? _c : 0;
        this.baseMaxHealth = options.maxHealth;
        this.level = (_d = options.level) !== null && _d !== void 0 ? _d : 1;
        this.experience = (_e = options.experience) !== null && _e !== void 0 ? _e : 0;
        this.health = (_f = options.health) !== null && _f !== void 0 ? _f : this.maxHealth;
        this.meleeWeapon = (_g = options.meleeWeapon) !== null && _g !== void 0 ? _g : null;
        this.rangedWeapon = (_h = options.rangedWeapon) !== null && _h !== void 0 ? _h : null;
        this.helm = (_j = options.helm) !== null && _j !== void 0 ? _j : null;
        this.armor = (_k = options.armor) !== null && _k !== void 0 ? _k : null;
        this.shield = (_l = options.shield) !== null && _l !== void 0 ? _l : null;
        this.ring = (_m = options.ring) !== null && _m !== void 0 ? _m : null;
        this.lightSource = (_o = options.lightSource) !== null && _o !== void 0 ? _o : null;
        this.inventory = options.inventory ? [...options.inventory] : [];
        this.gold = (_p = options.gold) !== null && _p !== void 0 ? _p : 0;
    }
    get strength() {
        var _a, _b;
        return this.baseStrength + ((_b = (_a = this.ring) === null || _a === void 0 ? void 0 : _a.strength) !== null && _b !== void 0 ? _b : 0);
    }
    get agility() {
        var _a, _b;
        return this.baseAgility + ((_b = (_a = this.ring) === null || _a === void 0 ? void 0 : _a.agility) !== null && _b !== void 0 ? _b : 0);
    }
    get intelligence() {
        var _a, _b;
        return this.baseIntelligence + ((_b = (_a = this.ring) === null || _a === void 0 ? void 0 : _a.intelligence) !== null && _b !== void 0 ? _b : 0);
    }
    get maxHealth() {
        var _a, _b;
        return this.baseMaxHealth + ((_b = (_a = this.ring) === null || _a === void 0 ? void 0 : _a.maxHealth) !== null && _b !== void 0 ? _b : 0);
    }
    get meleeAttack() {
        var _a, _b;
        return this.strength + ((_b = (_a = this.meleeWeapon) === null || _a === void 0 ? void 0 : _a.attack) !== null && _b !== void 0 ? _b : 0);
    }
    get meleeDamage() {
        var _a, _b;
        return ((_b = (_a = this.meleeWeapon) === null || _a === void 0 ? void 0 : _a.damage) !== null && _b !== void 0 ? _b : new Dice(1, 2)).add(this.strength);
    }
    get rangedAttack() {
        var _a, _b;
        return this.agility + ((_b = (_a = this.rangedWeapon) === null || _a === void 0 ? void 0 : _a.attack) !== null && _b !== void 0 ? _b : 0);
    }
    get rangedDamage() {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.rangedWeapon) === null || _a === void 0 ? void 0 : _a.damage) === null || _b === void 0 ? void 0 : _b.add(this.agility)) !== null && _c !== void 0 ? _c : null;
    }
    get defense() {
        var _a, _b, _c, _d, _e, _f;
        return this.agility + ((_b = (_a = this.armor) === null || _a === void 0 ? void 0 : _a.defense) !== null && _b !== void 0 ? _b : 0) + ((_d = (_c = this.helm) === null || _c === void 0 ? void 0 : _c.defense) !== null && _d !== void 0 ? _d : 0) + ((_f = (_e = this.shield) === null || _e === void 0 ? void 0 : _e.defense) !== null && _f !== void 0 ? _f : 0);
    }
    get lightRadius() {
        if (this.lightSource && this.lightSource.duration > 0) {
            return this.lightSource.lightRadius;
        }
        return 1;
    }
    get lightColor() {
        var _a, _b;
        return (_b = (_a = this.lightSource) === null || _a === void 0 ? void 0 : _a.lightColor) !== null && _b !== void 0 ? _b : gfx.Color.white;
    }
    isEquipped(item) {
        return [...this.equipment()].includes(item);
    }
    *equipment() {
        if (this.meleeWeapon) {
            yield this.meleeWeapon;
        }
        if (this.rangedWeapon) {
            yield this.rangedWeapon;
        }
        if (this.armor) {
            yield this.armor;
        }
        if (this.helm) {
            yield this.helm;
        }
        if (this.shield) {
            yield this.shield;
        }
        if (this.ring) {
            yield this.ring;
        }
        if (this.lightSource) {
            yield this.lightSource;
        }
    }
    clone() {
        return new Player(this);
    }
    equip(item) {
        if (item instanceof MeleeWeapon) {
            this.meleeWeapon = item;
        }
        else if (item instanceof RangedWeapon) {
            this.rangedWeapon = item;
        }
        else if (item instanceof Armor) {
            this.armor = item;
        }
        else if (item instanceof Shield) {
            this.shield = item;
        }
        else if (item instanceof Helm) {
            this.helm = item;
        }
        else if (item instanceof Ring) {
            this.ring = item;
        }
        else if (item instanceof LightSource) {
            this.lightSource = item;
        }
    }
    remove(item) {
        if (this.meleeWeapon === item) {
            this.meleeWeapon = null;
        }
        if (this.rangedWeapon === item) {
            this.rangedWeapon = null;
        }
        if (this.armor === item) {
            this.armor = null;
        }
        if (this.helm === item) {
            this.helm = null;
        }
        if (this.shield === item) {
            this.shield = null;
        }
        if (this.ring === item) {
            this.ring = null;
        }
        if (this.lightSource === item) {
            this.lightSource = null;
        }
    }
    delete(item) {
        const index = this.inventory.indexOf(item);
        if (index >= 0) {
            this.inventory.splice(index, 1);
            this.remove(item);
        }
    }
    save() {
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
        };
    }
    load(db, state) {
        this.baseStrength = state.baseStrength;
        this.baseIntelligence = state.baseIntelligence;
        this.baseAgility = state.baseAgility;
        this.baseMaxHealth = state.baseMaxHealth;
        this.level = state.level;
        this.experience = state.experience;
        this.health = state.health;
        this.inventory = state.inventory.map(id => {
            const item = db.get(id);
            if (!(item instanceof Item)) {
                throw new Error("non-item in inventory, load failed.");
            }
            return item.clone();
        });
        if (state.meleeWeapon >= 0) {
            this.equip(this.inventory[state.meleeWeapon]);
        }
        else {
            this.meleeWeapon = null;
        }
        if (state.rangedWeapon >= 0) {
            this.equip(this.inventory[state.rangedWeapon]);
        }
        else {
            this.rangedWeapon = null;
        }
        if (state.helm >= 0) {
            this.equip(this.inventory[state.helm]);
        }
        else {
            this.helm = null;
        }
        if (state.armor >= 0) {
            this.equip(this.inventory[state.armor]);
        }
        else {
            this.armor = null;
        }
        if (state.shield >= 0) {
            this.equip(this.inventory[state.shield]);
        }
        else {
            this.shield = null;
        }
        if (state.ring >= 0) {
            this.equip(this.inventory[state.ring]);
        }
        else {
            this.ring = null;
        }
        this.gold = state.gold;
    }
}
export class Attack {
    constructor(options) {
        var _a, _b, _c;
        this.attack = (_a = options.attack) !== null && _a !== void 0 ? _a : 0;
        this.damage = options.damage.clone();
        this.action = options.action;
        this.range = (_b = options.range) !== null && _b !== void 0 ? _b : 1;
        this.verb = (_c = options.verb) !== null && _c !== void 0 ? _c : "";
    }
    clone() {
        return new Attack(this);
    }
}
export var MonsterState;
(function (MonsterState) {
    MonsterState[MonsterState["idle"] = 0] = "idle";
    MonsterState[MonsterState["aggro"] = 1] = "aggro";
})(MonsterState || (MonsterState = {}));
export class Monster extends Thing {
    constructor(options) {
        var _a, _b, _c, _d, _e;
        super(Object.assign({ passable: false, transparent: true }, options));
        this.attacks = [];
        this.state = MonsterState.idle;
        this.action = 0;
        this.actionReserve = 0;
        this.freq = 1;
        this.agility = (_a = options.agility) !== null && _a !== void 0 ? _a : 0;
        this.defense = (_b = options.defense) !== null && _b !== void 0 ? _b : 0;
        this.maxHealth = options.maxHealth;
        this.health = (_c = options.health) !== null && _c !== void 0 ? _c : this.maxHealth;
        this.experience = options.experience;
        this.attacks = [...options.attacks];
        this.level = options.level;
        this.freq = (_d = options.freq) !== null && _d !== void 0 ? _d : 1;
        this.gold = (_e = options.gold) !== null && _e !== void 0 ? _e : 0;
        if (this.attacks.length == 0) {
            throw new Error(`No attacks defined for monster ${this.name}`);
        }
    }
    clone() {
        return new Monster(this);
    }
}
export class Container extends Fixture {
    constructor(options) {
        var _a;
        super(Object.assign({ passable: false, transparent: true }, options));
        this.items = new Set([...(_a = options.items) !== null && _a !== void 0 ? _a : []]);
    }
    clone() {
        return new Container(this);
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
    10000
];
export function getExperienceRequirement(level) {
    if (level < 2) {
        return 0;
    }
    if (level - 2 >= levels.length) {
        return Infinity;
    }
    return levels[level - 2];
}
export class Table {
    constructor() {
        this.map = new Map();
    }
    insert(thing) {
        if (this.has(thing.id)) {
            throw new Error(`Attempt to insert duplicate id of ${thing.id}`);
        }
        this.map.set(thing.id, thing);
        return thing;
    }
    has(id) {
        return this.map.has(id);
    }
    get(id) {
        return this.map.get(id);
    }
    *[Symbol.iterator]() {
        for (const [_, v] of this.map) {
            yield v;
        }
    }
}
export class ThingDB {
    constructor() {
        this.map = new Map();
    }
    insert(thing) {
        if (this.has(thing.id)) {
            throw new Error(`Attempt to insert duplicate id of ${thing.id}`);
        }
        this.map.set(thing.id, thing);
        return thing;
    }
    has(id) {
        return this.map.has(id);
    }
    get(id) {
        return this.map.get(id);
    }
    *[Symbol.iterator]() {
        for (const [_, v] of this.map) {
            yield v;
        }
    }
}
/**
 * a weighted list from which a random selection can be drawn.
 */
export class WeightedList {
    /**
     * constructor
     * @param data list of [item, relative weight] items
     */
    constructor(data) {
        this.data = data;
        const total = data.map(x => x[1]).reduce((x, y) => x + y, 0);
        for (let i = 0; i < data.length; ++i) {
            data[i][1] /= total;
        }
    }
    select(rng) {
        let dist = rng.next();
        for (const [x, w] of this.data) {
            dist -= w;
            if (dist <= 0) {
                return x;
            }
        }
        throw new Error("Invalid or empty list, no selection made");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJybC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUNILE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFFL0IsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQTtBQVcxQixNQUFNLE9BQU8sS0FBSztJQVFkLFlBQVksT0FBcUI7O1FBRnhCLFVBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFHdEMsSUFBSSxDQUFDLEVBQUUsR0FBRyxPQUFPLENBQUMsRUFBRSxDQUFBO1FBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQTtRQUNoQyxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUE7UUFDdEMsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBQSxPQUFPLENBQUMsS0FBSyxtQ0FBSSxFQUFFLENBQUE7UUFFaEMsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFO1lBQ2YsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFBO1NBQzdCO0lBQ0wsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzFCLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxJQUFJO0lBQ2IsWUFBcUIsTUFBYyxDQUFDLEVBQVcsTUFBYyxDQUFDO1FBQXpDLFFBQUcsR0FBSCxHQUFHLENBQVk7UUFBVyxRQUFHLEdBQUgsR0FBRyxDQUFZO0lBQUksQ0FBQztJQUVuRSxJQUFJLENBQUMsR0FBYTtRQUNkLE9BQU8sSUFBSSxDQUFDLEdB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WUFBWTtJQUNyQjs7O09BR0c7SUFDSCxZQUE2QixJQUFtQjtRQUFuQixTQUFJLEdBQUosSUFBSSxDQUFlO1FBQzVDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQ2xDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUE7U0FDdEI7SUFDTCxDQUFDO0lBRUQsTUFBTSxDQUFDLEdBQWE7UUFDaEIsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3JCLEtBQUssTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQzVCLElBQUksSUFBSSxDQUFDLENBQUE7WUFDVCxJQUFJLElBQUksSUFBSSxDQUFDLEVBQUU7Z0JBQ1gsT0FBTyxDQUFDLENBQUE7YUFDWDtTQUNKO1FBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFBO0lBQy9ELENBQUM7Q0FDSiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiByb2d1ZS1saWtlIGxpYnJhcnlcclxuICovXHJcbmltcG9ydCAqIGFzIHJhbmQgZnJvbSBcIi4uL3NoYXJlZC9yYW5kLmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcblxyXG5leHBvcnQgY29uc3QgdGlsZVNpemUgPSAyNFxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUaGluZ09wdGlvbnMge1xyXG4gICAgaWQ6IHN0cmluZ1xyXG4gICAgcGFzc2FibGU6IGJvb2xlYW5cclxuICAgIHRyYW5zcGFyZW50OiBib29sZWFuXHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlPzogc3RyaW5nXHJcbiAgICBjb2xvcj86IGdmeC5Db2xvclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGhpbmcge1xyXG4gICAgcmVhZG9ubHkgaWQ6IHN0cmluZ1xyXG4gICAgcGFzc2FibGU6IGJvb2xlYW5cclxuICAgIHRyYW5zcGFyZW50OiBib29sZWFuXHJcbiAgICByZWFkb25seSBuYW1lOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGltYWdlOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGNvbG9yID0gbmV3IGdmeC5Db2xvcigxLCAxLCAxLCAxKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFRoaW5nT3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMuaWQgPSBvcHRpb25zLmlkXHJcbiAgICAgICAgdGhpcy5wYXNzYWJsZSA9IG9wdGlvbnMucGFzc2FibGVcclxuICAgICAgICB0aGlzLnRyYW5zcGFyZW50ID0gb3B0aW9ucy50cmFuc3BhcmVudFxyXG4gICAgICAgIHRoaXMubmFtZSA9IG9wdGlvbnMubmFtZVxyXG4gICAgICAgIHRoaXMuaW1hZ2UgPSBvcHRpb25zLmltYWdlID8/IFwiXCJcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuY29sb3IpIHtcclxuICAgICAgICAgICAgdGhpcy5jb2xvciA9IG9wdGlvbnMuY29sb3JcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogVGhpbmcge1xyXG4gICAgICAgIHJldHVybiBuZXcgVGhpbmcodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIERpY2Uge1xyXG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgbWluOiBudW1iZXIgPSAwLCByZWFkb25seSBtYXg6IG51bWJlciA9IDApIHsgfVxyXG5cclxuICAgIHJvbGwocm5nOiByYW5kLlJORyk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHJhbmQuaW50KHJuZywgdGhpcy5taW4sIHRoaXMubWF4ICsgMSlcclxuICAgIH1cclxuXHJcbiAgICBhZGQoeDogbnVtYmVyKTogRGljZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBEaWNlKHRoaXMubWluICsgeCwgdGhpcy5tYXggKyB4KVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IERpY2Uge1xyXG4gICAgICAgIHJldHVybiBuZXcgRGljZSh0aGlzLm1pbiwgdGhpcy5tYXgpXHJcbiAgICB9XHJcblxyXG4gICAgdG9TdHJpbmcoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gYCR7dGhpcy5taW59IC0gJHt0aGlzLm1heH1gXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUaWxlIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgY2xvbmUoKTogVGlsZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBUaWxlKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSBGaXh0dXJlT3B0aW9ucyBleHRlbmRzIFRoaW5nT3B0aW9ucyB7XHJcbiAgICBsaWdodENvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICBsaWdodFJhZGl1cz86IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRml4dHVyZSBleHRlbmRzIFRoaW5nIHtcclxuICAgIGxpZ2h0Q29sb3I6IGdmeC5Db2xvclxyXG4gICAgbGlnaHRSYWRpdXM6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEZpeHR1cmVPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLmxpZ2h0Q29sb3IgPSBvcHRpb25zLmxpZ2h0Q29sb3IgPz8gZ2Z4LkNvbG9yLndoaXRlLmNsb25lKClcclxuICAgICAgICB0aGlzLmxpZ2h0UmFkaXVzID0gb3B0aW9ucy5saWdodFJhZGl1cyA/PyAwXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogRml4dHVyZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBGaXh0dXJlKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBEb29yIGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICBjbG9uZSgpOiBEb29yIHtcclxuICAgICAgICByZXR1cm4gbmV3IERvb3IodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGVudW0gRXhpdERpcmVjdGlvbiB7XHJcbiAgICBVcCxcclxuICAgIERvd24sXHJcbn1cclxuXHJcbmludGVyZmFjZSBFeGl0T3B0aW9ucyB7XHJcbiAgICBpZDogc3RyaW5nXHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlPzogc3RyaW5nXHJcbiAgICBjb2xvcj86IGdmeC5Db2xvclxyXG4gICAgZGlyZWN0aW9uOiBFeGl0RGlyZWN0aW9uXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBFeGl0IGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICBkaXJlY3Rpb246IEV4aXREaXJlY3Rpb25cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBFeGl0T3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiBmYWxzZSB9LCBvcHRpb25zKSlcclxuICAgICAgICB0aGlzLmRpcmVjdGlvbiA9IG9wdGlvbnMuZGlyZWN0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogRXhpdCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBFeGl0KHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSXRlbU9wdGlvbnMge1xyXG4gICAgaWQ6IHN0cmluZ1xyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZT86IHN0cmluZ1xyXG4gICAgY29sb3I/OiBnZnguQ29sb3JcclxuICAgIGxldmVsOiBudW1iZXJcclxuICAgIGZyZXE/OiBudW1iZXJcclxuICAgIHZhbHVlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEl0ZW0gZXh0ZW5kcyBUaGluZyB7XHJcbiAgICByZWFkb25seSBsZXZlbDogbnVtYmVyXHJcbiAgICByZWFkb25seSBmcmVxOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHZhbHVlOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBJdGVtT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG5cclxuICAgICAgICB0aGlzLmxldmVsID0gb3B0aW9ucy5sZXZlbFxyXG4gICAgICAgIHRoaXMuZnJlcSA9IG9wdGlvbnMuZnJlcSA/PyAxXHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IG9wdGlvbnMudmFsdWUgPz8gMVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEl0ZW0ge1xyXG4gICAgICAgIHJldHVybiBuZXcgSXRlbSh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFdlYXBvbk9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICByZWFkb25seSBhdHRhY2s6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgcmFuZ2U/OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHZlcmI/OiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGFjdGlvbjogbnVtYmVyXHJcbiAgICByZWFkb25seSBkYW1hZ2U6IERpY2VcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFdlYXBvbiBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgYXR0YWNrOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGRhbWFnZTogRGljZVxyXG4gICAgcmVhZG9ubHkgcmFuZ2U6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYWN0aW9uOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHZlcmI6IHN0cmluZ1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFdlYXBvbk9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMuYXR0YWNrID0gb3B0aW9ucy5hdHRhY2tcclxuICAgICAgICB0aGlzLmRhbWFnZSA9IG9wdGlvbnMuZGFtYWdlLmNsb25lKClcclxuICAgICAgICB0aGlzLnJhbmdlID0gb3B0aW9ucy5yYW5nZSA/PyAxXHJcbiAgICAgICAgdGhpcy52ZXJiID0gb3B0aW9ucy52ZXJiID8/IFwiXCJcclxuICAgICAgICB0aGlzLmFjdGlvbiA9IG9wdGlvbnMuYWN0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogV2VhcG9uIHtcclxuICAgICAgICByZXR1cm4gbmV3IFdlYXBvbih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUmFuZ2VkV2VhcG9uIGV4dGVuZHMgV2VhcG9uIHtcclxuICAgIGNsb25lKCk6IFJhbmdlZFdlYXBvbiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBSYW5nZWRXZWFwb24odGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1lbGVlV2VhcG9uIGV4dGVuZHMgV2VhcG9uIHtcclxuICAgIGNsb25lKCk6IFdlYXBvbiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNZWxlZVdlYXBvbih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFybW9yT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIGRlZmVuc2U6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQXJtb3IgZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGRlZmVuc2U6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEFybW9yT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlID0gb3B0aW9ucy5kZWZlbnNlXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogQXJtb3Ige1xyXG4gICAgICAgIHJldHVybiBuZXcgQXJtb3IodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBIZWxtT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIGRlZmVuc2U6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgSGVsbSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgZGVmZW5zZTogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogSGVsbU9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMuZGVmZW5zZSA9IG9wdGlvbnMuZGVmZW5zZVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEhlbG0ge1xyXG4gICAgICAgIHJldHVybiBuZXcgSGVsbSh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNoaWVsZE9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNoaWVsZCBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgZGVmZW5zZTogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogU2hpZWxkT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlID0gb3B0aW9ucy5kZWZlbnNlXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogU2hpZWxkIHtcclxuICAgICAgICByZXR1cm4gbmV3IFNoaWVsZCh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJpbmdPcHRpb25zIGV4dGVuZHMgSXRlbU9wdGlvbnMge1xyXG4gICAgc3RyZW5ndGg/OiBudW1iZXJcclxuICAgIGFnaWxpdHk/OiBudW1iZXJcclxuICAgIGludGVsbGlnZW5jZT86IG51bWJlclxyXG4gICAgbWF4SGVhbHRoPzogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBSaW5nIGV4dGVuZHMgSXRlbSB7XHJcbiAgICByZWFkb25seSBzdHJlbmd0aDogbnVtYmVyXHJcbiAgICByZWFkb25seSBhZ2lsaXR5OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGludGVsbGlnZW5jZTogbnVtYmVyXHJcbiAgICByZWFkb25seSBtYXhIZWFsdGg6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFJpbmdPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLnN0cmVuZ3RoID0gb3B0aW9ucy5zdHJlbmd0aCA/PyAwXHJcbiAgICAgICAgdGhpcy5hZ2lsaXR5ID0gb3B0aW9ucy5hZ2lsaXR5ID8/IDBcclxuICAgICAgICB0aGlzLmludGVsbGlnZW5jZSA9IG9wdGlvbnMuaW50ZWxsaWdlbmNlID8/IDBcclxuICAgICAgICB0aGlzLm1heEhlYWx0aCA9IG9wdGlvbnMubWF4SGVhbHRoID8/IDBcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBMaWdodFNvdXJjZU9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICByZWFkb25seSBsaWdodFJhZGl1czogbnVtYmVyXHJcbiAgICByZWFkb25seSBsaWdodENvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICByZWFkb25seSBkdXJhdGlvbjogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBMaWdodFNvdXJjZSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgbGlnaHRSYWRpdXM6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgbGlnaHRDb2xvcjogZ2Z4LkNvbG9yXHJcbiAgICBkdXJhdGlvbjogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogTGlnaHRTb3VyY2VPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLmxpZ2h0UmFkaXVzID0gb3B0aW9ucy5saWdodFJhZGl1c1xyXG4gICAgICAgIHRoaXMubGlnaHRDb2xvciA9IG9wdGlvbnMubGlnaHRDb2xvciA/PyBnZnguQ29sb3Iud2hpdGVcclxuICAgICAgICB0aGlzLmR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvblxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IExpZ2h0U291cmNlIHtcclxuICAgICAgICByZXR1cm4gbmV3IExpZ2h0U291cmNlKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIEVxdWlwcGFibGUgPSBNZWxlZVdlYXBvbiB8IFJhbmdlZFdlYXBvbiB8IEFybW9yIHwgSGVsbSB8IFNoaWVsZCB8IFJpbmcgfCBMaWdodFNvdXJjZVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGlzRXF1aXBwYWJsZShpdGVtOiBJdGVtKTogaXRlbSBpcyBFcXVpcHBhYmxlIHtcclxuICAgIHJldHVybiBpdGVtIGluc3RhbmNlb2YgV2VhcG9uXHJcbiAgICAgICAgfHwgaXRlbSBpbnN0YW5jZW9mIEFybW9yXHJcbiAgICAgICAgfHwgaXRlbSBpbnN0YW5jZW9mIFNoaWVsZFxyXG4gICAgICAgIHx8IGl0ZW0gaW5zdGFuY2VvZiBSaW5nXHJcbiAgICAgICAgfHwgaXRlbSBpbnN0YW5jZW9mIExpZ2h0U291cmNlXHJcbiAgICAgICAgfHwgaXRlbSBpbnN0YW5jZW9mIEhlbG1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBVc2FibGVPcHRpb25zIGV4dGVuZHMgSXRlbU9wdGlvbnMge1xyXG4gICAgaGVhbHRoOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFVzYWJsZSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgaGVhbHRoOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBVc2FibGVPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IGZhbHNlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuaGVhbHRoID0gb3B0aW9ucy5oZWFsdGhcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBVc2FibGUge1xyXG4gICAgICAgIHJldHVybiBuZXcgVXNhYmxlKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXR1cmVPcHRpb25zIHtcclxuICAgIGlkOiBzdHJpbmdcclxuICAgIG5hbWU6IHN0cmluZ1xyXG4gICAgaW1hZ2U6IHN0cmluZ1xyXG4gICAgY29sb3I/OiBnZnguQ29sb3JcclxuICAgIG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBoZWFsdGg/OiBudW1iZXJcclxuICAgIGFnaWxpdHk/OiBudW1iZXJcclxuICAgIGxldmVsOiBudW1iZXIsXHJcbiAgICBnb2xkOiBudW1iZXIsXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXR1cmUgZXh0ZW5kcyBUaGluZyB7XHJcbiAgICBtYXhIZWFsdGg6IG51bWJlclxyXG4gICAgaGVhbHRoOiBudW1iZXJcclxuICAgIGRlZmVuc2U6IG51bWJlclxyXG4gICAgYWdpbGl0eTogbnVtYmVyXHJcbiAgICBhY3Rpb246IG51bWJlclxyXG4gICAgYWN0aW9uUmVzZXJ2ZTogbnVtYmVyXHJcbiAgICBsZXZlbDogbnVtYmVyLFxyXG4gICAgZ29sZDogbnVtYmVyLFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBsYXllck9wdGlvbnMgZXh0ZW5kcyBDcmVhdHVyZU9wdGlvbnMge1xyXG4gICAgZXhwZXJpZW5jZT86IG51bWJlclxyXG4gICAgc3RyZW5ndGg/OiBudW1iZXJcclxuICAgIGludGVsbGlnZW5jZT86IG51bWJlclxyXG4gICAgbWF4SGVhbHRoOiBudW1iZXJcclxuICAgIG1lbGVlV2VhcG9uPzogTWVsZWVXZWFwb24gfCBudWxsXHJcbiAgICByYW5nZWRXZWFwb24/OiBSYW5nZWRXZWFwb24gfCBudWxsXHJcbiAgICBhcm1vcj86IEFybW9yIHwgbnVsbFxyXG4gICAgaGVsbT86IEhlbG0gfCBudWxsXHJcbiAgICBzaGllbGQ/OiBTaGllbGQgfCBudWxsXHJcbiAgICByaW5nPzogUmluZyB8IG51bGxcclxuICAgIGxpZ2h0U291cmNlPzogTGlnaHRTb3VyY2UgfCBudWxsLFxyXG4gICAgaW52ZW50b3J5PzogSXRlbVtdLFxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUGxheWVyIGV4dGVuZHMgVGhpbmcgaW1wbGVtZW50cyBDcmVhdHVyZSB7XHJcbiAgICBiYXNlU3RyZW5ndGg6IG51bWJlclxyXG4gICAgYmFzZUludGVsbGlnZW5jZTogbnVtYmVyXHJcbiAgICBiYXNlQWdpbGl0eTogbnVtYmVyXHJcbiAgICBiYXNlTWF4SGVhbHRoOiBudW1iZXJcclxuICAgIGxldmVsOiBudW1iZXJcclxuICAgIGV4cGVyaWVuY2U6IG51bWJlclxyXG4gICAgaGVhbHRoOiBudW1iZXJcclxuICAgIGFjdGlvbjogbnVtYmVyID0gMFxyXG4gICAgYWN0aW9uUmVzZXJ2ZTogbnVtYmVyID0gMFxyXG4gICAgbWVsZWVXZWFwb246IE1lbGVlV2VhcG9uIHwgbnVsbFxyXG4gICAgcmFuZ2VkV2VhcG9uOiBSYW5nZWRXZWFwb24gfCBudWxsXHJcbiAgICBhcm1vcjogQXJtb3IgfCBudWxsXHJcbiAgICBoZWxtOiBIZWxtIHwgbnVsbFxyXG4gICAgc2hpZWxkOiBTaGllbGQgfCBudWxsXHJcbiAgICByaW5nOiBSaW5nIHwgbnVsbFxyXG4gICAgbGlnaHRTb3VyY2U6IExpZ2h0U291cmNlIHwgbnVsbFxyXG4gICAgaW52ZW50b3J5OiBJdGVtW11cclxuICAgIGdvbGQ6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFBsYXllck9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihPYmplY3QuYXNzaWduKHsgcGFzc2FibGU6IGZhbHNlLCB0cmFuc3BhcmVudDogdHJ1ZSB9LCBvcHRpb25zKSlcclxuICAgICAgICB0aGlzLmJhc2VTdHJlbmd0aCA9IG9wdGlvbnMuc3RyZW5ndGggPz8gMFxyXG4gICAgICAgIHRoaXMuYmFzZUludGVsbGlnZW5jZSA9IG9wdGlvbnMuc3RyZW5ndGggPz8gMFxyXG4gICAgICAgIHRoaXMuYmFzZUFnaWxpdHkgPSBvcHRpb25zLmFnaWxpdHkgPz8gMFxyXG4gICAgICAgIHRoaXMuYmFzZU1heEhlYWx0aCA9IG9wdGlvbnMubWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5sZXZlbCA9IG9wdGlvbnMubGV2ZWwgPz8gMVxyXG4gICAgICAgIHRoaXMuZXhwZXJpZW5jZSA9IG9wdGlvbnMuZXhwZXJpZW5jZSA/PyAwXHJcbiAgICAgICAgdGhpcy5oZWFsdGggPSBvcHRpb25zLmhlYWx0aCA/PyB0aGlzLm1heEhlYWx0aFxyXG4gICAgICAgIHRoaXMubWVsZWVXZWFwb24gPSBvcHRpb25zLm1lbGVlV2VhcG9uID8/IG51bGxcclxuICAgICAgICB0aGlzLnJhbmdlZFdlYXBvbiA9IG9wdGlvbnMucmFuZ2VkV2VhcG9uID8/IG51bGxcclxuICAgICAgICB0aGlzLmhlbG0gPSBvcHRpb25zLmhlbG0gPz8gbnVsbFxyXG4gICAgICAgIHRoaXMuYXJtb3IgPSBvcHRpb25zLmFybW9yID8/IG51bGxcclxuICAgICAgICB0aGlzLnNoaWVsZCA9IG9wdGlvbnMuc2hpZWxkID8/IG51bGxcclxuICAgICAgICB0aGlzLnJpbmcgPSBvcHRpb25zLnJpbmcgPz8gbnVsbFxyXG4gICAgICAgIHRoaXMubGlnaHRTb3VyY2UgPSBvcHRpb25zLmxpZ2h0U291cmNlID8/IG51bGxcclxuICAgICAgICB0aGlzLmludmVudG9yeSA9IG9wdGlvbnMuaW52ZW50b3J5ID8gWy4uLm9wdGlvbnMuaW52ZW50b3J5XSA6IFtdXHJcbiAgICAgICAgdGhpcy5nb2xkID0gb3B0aW9ucy5nb2xkID8/IDBcclxuICAgIH1cclxuXHJcbiAgICBnZXQgc3RyZW5ndGgoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5iYXNlU3RyZW5ndGggKyAodGhpcy5yaW5nPy5zdHJlbmd0aCA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBhZ2lsaXR5KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYmFzZUFnaWxpdHkgKyAodGhpcy5yaW5nPy5hZ2lsaXR5ID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGludGVsbGlnZW5jZSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJhc2VJbnRlbGxpZ2VuY2UgKyAodGhpcy5yaW5nPy5pbnRlbGxpZ2VuY2UgPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgbWF4SGVhbHRoKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYmFzZU1heEhlYWx0aCArICh0aGlzLnJpbmc/Lm1heEhlYWx0aCA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBtZWxlZUF0dGFjaygpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnN0cmVuZ3RoICsgKHRoaXMubWVsZWVXZWFwb24/LmF0dGFjayA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBtZWxlZURhbWFnZSgpOiBEaWNlIHtcclxuICAgICAgICByZXR1cm4gKHRoaXMubWVsZWVXZWFwb24/LmRhbWFnZSA/PyBuZXcgRGljZSgxLCAyKSkuYWRkKHRoaXMuc3RyZW5ndGgpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHJhbmdlZEF0dGFjaygpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFnaWxpdHkgKyAodGhpcy5yYW5nZWRXZWFwb24/LmF0dGFjayA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCByYW5nZWREYW1hZ2UoKTogRGljZSB8IG51bGwge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnJhbmdlZFdlYXBvbj8uZGFtYWdlPy5hZGQodGhpcy5hZ2lsaXR5KSA/PyBudWxsXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGRlZmVuc2UoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hZ2lsaXR5ICsgKHRoaXMuYXJtb3I/LmRlZmVuc2UgPz8gMCkgKyAodGhpcy5oZWxtPy5kZWZlbnNlID8/IDApICsgKHRoaXMuc2hpZWxkPy5kZWZlbnNlID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGxpZ2h0UmFkaXVzKCk6IG51bWJlciB7XHJcbiAgICAgICAgaWYgKHRoaXMubGlnaHRTb3VyY2UgJiYgdGhpcy5saWdodFNvdXJjZS5kdXJhdGlvbiA+IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGlnaHRTb3VyY2UubGlnaHRSYWRpdXNcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAxXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGxpZ2h0Q29sb3IoKTogZ2Z4LkNvbG9yIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5saWdodFNvdXJjZT8ubGlnaHRDb2xvciA/PyBnZnguQ29sb3Iud2hpdGVcclxuICAgIH1cclxuXHJcbiAgICBpc0VxdWlwcGVkKGl0ZW06IEl0ZW0pOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gWy4uLnRoaXMuZXF1aXBtZW50KCldLmluY2x1ZGVzKGl0ZW0pXHJcbiAgICB9XHJcblxyXG4gICAgKmVxdWlwbWVudCgpOiBJdGVyYWJsZTxJdGVtPiB7XHJcbiAgICAgICAgaWYgKHRoaXMubWVsZWVXZWFwb24pIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5tZWxlZVdlYXBvblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucmFuZ2VkV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMucmFuZ2VkV2VhcG9uXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5hcm1vcikge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLmFybW9yXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5oZWxtKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMuaGVsbVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc2hpZWxkKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMuc2hpZWxkXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5yaW5nKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMucmluZ1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMubGlnaHRTb3VyY2UpIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5saWdodFNvdXJjZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBQbGF5ZXIge1xyXG4gICAgICAgIHJldHVybiBuZXcgUGxheWVyKHRoaXMpXHJcbiAgICB9XHJcblxyXG4gICAgZXF1aXAoaXRlbTogSXRlbSkge1xyXG4gICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgTWVsZWVXZWFwb24pIHtcclxuICAgICAgICAgICAgdGhpcy5tZWxlZVdlYXBvbiA9IGl0ZW1cclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBSYW5nZWRXZWFwb24pIHtcclxuICAgICAgICAgICAgdGhpcy5yYW5nZWRXZWFwb24gPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgQXJtb3IpIHtcclxuICAgICAgICAgICAgdGhpcy5hcm1vciA9IGl0ZW1cclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBTaGllbGQpIHtcclxuICAgICAgICAgICAgdGhpcy5zaGllbGQgPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgSGVsbSkge1xyXG4gICAgICAgICAgICB0aGlzLmhlbG0gPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgUmluZykge1xyXG4gICAgICAgICAgICB0aGlzLnJpbmcgPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgTGlnaHRTb3VyY2UpIHtcclxuICAgICAgICAgICAgdGhpcy5saWdodFNvdXJjZSA9IGl0ZW1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmVtb3ZlKGl0ZW06IEl0ZW0pIHtcclxuICAgICAgICBpZiAodGhpcy5tZWxlZVdlYXBvbiA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLm1lbGVlV2VhcG9uID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucmFuZ2VkV2VhcG9uID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmFuZ2VkV2VhcG9uID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYXJtb3IgPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5hcm1vciA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhlbG0gPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5oZWxtID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc2hpZWxkID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hpZWxkID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucmluZyA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLnJpbmcgPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5saWdodFNvdXJjZSA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLmxpZ2h0U291cmNlID0gbnVsbFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBkZWxldGUoaXRlbTogSXRlbSkge1xyXG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5pbnZlbnRvcnkuaW5kZXhPZihpdGVtKTtcclxuICAgICAgICBpZiAoaW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmludmVudG9yeS5zcGxpY2UoaW5kZXgsIDEpXHJcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKGl0ZW0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNhdmUoKTogUGxheWVyU2F2ZVN0YXRlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBpZDogdGhpcy5pZCxcclxuICAgICAgICAgICAgYmFzZVN0cmVuZ3RoOiB0aGlzLmJhc2VTdHJlbmd0aCxcclxuICAgICAgICAgICAgYmFzZUludGVsbGlnZW5jZTogdGhpcy5iYXNlSW50ZWxsaWdlbmNlLFxyXG4gICAgICAgICAgICBiYXNlQWdpbGl0eTogdGhpcy5iYXNlQWdpbGl0eSxcclxuICAgICAgICAgICAgYmFzZU1heEhlYWx0aDogdGhpcy5iYXNlTWF4SGVhbHRoLFxyXG4gICAgICAgICAgICBsZXZlbDogdGhpcy5sZXZlbCxcclxuICAgICAgICAgICAgZXhwZXJpZW5jZTogdGhpcy5leHBlcmllbmNlLFxyXG4gICAgICAgICAgICBoZWFsdGg6IHRoaXMuaGVhbHRoLFxyXG4gICAgICAgICAgICBtZWxlZVdlYXBvbjogdGhpcy5tZWxlZVdlYXBvbiA/IHRoaXMuaW52ZW50b3J5LmluZGV4T2YodGhpcy5tZWxlZVdlYXBvbikgOiAtMSxcclxuICAgICAgICAgICAgcmFuZ2VkV2VhcG9uOiB0aGlzLnJhbmdlZFdlYXBvbiA/IHRoaXMuaW52ZW50b3J5LmluZGV4T2YodGhpcy5yYW5nZWRXZWFwb24pIDogLTEsXHJcbiAgICAgICAgICAgIGFybW9yOiB0aGlzLmFybW9yID8gdGhpcy5pbnZlbnRvcnkuaW5kZXhPZih0aGlzLmFybW9yKSA6IC0xLFxyXG4gICAgICAgICAgICBoZWxtOiB0aGlzLmhlbG0gPyB0aGlzLmludmVudG9yeS5pbmRleE9mKHRoaXMuaGVsbSkgOiAtMSxcclxuICAgICAgICAgICAgc2hpZWxkOiB0aGlzLnNoaWVsZCA/IHRoaXMuaW52ZW50b3J5LmluZGV4T2YodGhpcy5zaGllbGQpIDogLTEsXHJcbiAgICAgICAgICAgIHJpbmc6IHRoaXMucmluZyA/IHRoaXMuaW52ZW50b3J5LmluZGV4T2YodGhpcy5yaW5nKSA6IC0xLFxyXG4gICAgICAgICAgICBsaWdodFNvdXJjZTogdGhpcy5saWdodFNvdXJjZSA/IHRoaXMuaW52ZW50b3J5LmluZGV4T2YodGhpcy5saWdodFNvdXJjZSkgOiAtMSxcclxuICAgICAgICAgICAgaW52ZW50b3J5OiB0aGlzLmludmVudG9yeS5tYXAoaSA9PiBpLmlkKSxcclxuICAgICAgICAgICAgZ29sZDogdGhpcy5nb2xkLFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBsb2FkKGRiOiBUaGluZ0RCLCBzdGF0ZTogUGxheWVyU2F2ZVN0YXRlKSB7XHJcbiAgICAgICAgdGhpcy5iYXNlU3RyZW5ndGggPSBzdGF0ZS5iYXNlU3RyZW5ndGhcclxuICAgICAgICB0aGlzLmJhc2VJbnRlbGxpZ2VuY2UgPSBzdGF0ZS5iYXNlSW50ZWxsaWdlbmNlXHJcbiAgICAgICAgdGhpcy5iYXNlQWdpbGl0eSA9IHN0YXRlLmJhc2VBZ2lsaXR5XHJcbiAgICAgICAgdGhpcy5iYXNlTWF4SGVhbHRoID0gc3RhdGUuYmFzZU1heEhlYWx0aFxyXG4gICAgICAgIHRoaXMubGV2ZWwgPSBzdGF0ZS5sZXZlbFxyXG4gICAgICAgIHRoaXMuZXhwZXJpZW5jZSA9IHN0YXRlLmV4cGVyaWVuY2VcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IHN0YXRlLmhlYWx0aFxyXG5cclxuICAgICAgICB0aGlzLmludmVudG9yeSA9IHN0YXRlLmludmVudG9yeS5tYXAoaWQgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gZGIuZ2V0KGlkKVxyXG4gICAgICAgICAgICBpZiAoIShpdGVtIGluc3RhbmNlb2YgSXRlbSkpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIm5vbi1pdGVtIGluIGludmVudG9yeSwgbG9hZCBmYWlsZWQuXCIpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBpdGVtLmNsb25lKClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBpZiAoc3RhdGUubWVsZWVXZWFwb24gPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmVxdWlwKHRoaXMuaW52ZW50b3J5W3N0YXRlLm1lbGVlV2VhcG9uXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLm1lbGVlV2VhcG9uID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHN0YXRlLnJhbmdlZFdlYXBvbiA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXF1aXAodGhpcy5pbnZlbnRvcnlbc3RhdGUucmFuZ2VkV2VhcG9uXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnJhbmdlZFdlYXBvbiA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzdGF0ZS5oZWxtID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lcXVpcCh0aGlzLmludmVudG9yeVtzdGF0ZS5oZWxtXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmhlbG0gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3RhdGUuYXJtb3IgPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmVxdWlwKHRoaXMuaW52ZW50b3J5W3N0YXRlLmFybW9yXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmFybW9yID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHN0YXRlLnNoaWVsZCA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXF1aXAodGhpcy5pbnZlbnRvcnlbc3RhdGUuc2hpZWxkXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnNoaWVsZCA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzdGF0ZS5yaW5nID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lcXVpcCh0aGlzLmludmVudG9yeVtzdGF0ZS5yaW5nXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnJpbmcgPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmdvbGQgPSBzdGF0ZS5nb2xkXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXR0YWNrT3B0aW9ucyB7XHJcbiAgICBhdHRhY2s6IG51bWJlclxyXG4gICAgZGFtYWdlOiBEaWNlXHJcbiAgICBhY3Rpb246IG51bWJlclxyXG4gICAgcmFuZ2U/OiBudW1iZXJcclxuICAgIHZlcmI/OiBzdHJpbmdcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEF0dGFjayB7XHJcbiAgICBhdHRhY2s6IG51bWJlclxyXG4gICAgZGFtYWdlOiBEaWNlXHJcbiAgICBhY3Rpb246IG51bWJlclxyXG4gICAgcmFuZ2U6IG51bWJlclxyXG4gICAgdmVyYjogc3RyaW5nXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQXR0YWNrT3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMuYXR0YWNrID0gb3B0aW9ucy5hdHRhY2sgPz8gMFxyXG4gICAgICAgIHRoaXMuZGFtYWdlID0gb3B0aW9ucy5kYW1hZ2UuY2xvbmUoKVxyXG4gICAgICAgIHRoaXMuYWN0aW9uID0gb3B0aW9ucy5hY3Rpb25cclxuICAgICAgICB0aGlzLnJhbmdlID0gb3B0aW9ucy5yYW5nZSA/PyAxXHJcbiAgICAgICAgdGhpcy52ZXJiID0gb3B0aW9ucy52ZXJiID8/IFwiXCJcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBBdHRhY2sge1xyXG4gICAgICAgIHJldHVybiBuZXcgQXR0YWNrKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBlbnVtIE1vbnN0ZXJTdGF0ZSB7XHJcbiAgICBpZGxlLFxyXG4gICAgYWdncm9cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNb25zdGVyT3B0aW9ucyBleHRlbmRzIENyZWF0dXJlT3B0aW9ucyB7XHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxuICAgIGV4cGVyaWVuY2U6IG51bWJlcixcclxuICAgIGF0dGFja3M6IEF0dGFja1tdXHJcbiAgICBmcmVxPzogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNb25zdGVyIGV4dGVuZHMgVGhpbmcgaW1wbGVtZW50cyBDcmVhdHVyZSB7XHJcbiAgICByZWFkb25seSBhZ2lsaXR5OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGRlZmVuc2U6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgbWF4SGVhbHRoOiBudW1iZXJcclxuICAgIGhlYWx0aDogbnVtYmVyXHJcbiAgICByZWFkb25seSBleHBlcmllbmNlOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGF0dGFja3M6IEF0dGFja1tdID0gW11cclxuICAgIHN0YXRlOiBNb25zdGVyU3RhdGUgPSBNb25zdGVyU3RhdGUuaWRsZVxyXG4gICAgYWN0aW9uOiBudW1iZXIgPSAwXHJcbiAgICBhY3Rpb25SZXNlcnZlOiBudW1iZXIgPSAwXHJcbiAgICByZWFkb25seSBsZXZlbDogbnVtYmVyXHJcbiAgICByZWFkb25seSBmcmVxOiBudW1iZXIgPSAxXHJcbiAgICByZWFkb25seSBnb2xkOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBNb25zdGVyT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuYWdpbGl0eSA9IG9wdGlvbnMuYWdpbGl0eSA/PyAwXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlID0gb3B0aW9ucy5kZWZlbnNlID8/IDBcclxuICAgICAgICB0aGlzLm1heEhlYWx0aCA9IG9wdGlvbnMubWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5oZWFsdGggPSBvcHRpb25zLmhlYWx0aCA/PyB0aGlzLm1heEhlYWx0aFxyXG4gICAgICAgIHRoaXMuZXhwZXJpZW5jZSA9IG9wdGlvbnMuZXhwZXJpZW5jZVxyXG4gICAgICAgIHRoaXMuYXR0YWNrcyA9IFsuLi5vcHRpb25zLmF0dGFja3NdXHJcbiAgICAgICAgdGhpcy5sZXZlbCA9IG9wdGlvbnMubGV2ZWxcclxuICAgICAgICB0aGlzLmZyZXEgPSBvcHRpb25zLmZyZXEgPz8gMVxyXG4gICAgICAgIHRoaXMuZ29sZCA9IG9wdGlvbnMuZ29sZCA/PyAwXHJcblxyXG4gICAgICAgIGlmICh0aGlzLmF0dGFja3MubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBhdHRhY2tzIGRlZmluZWQgZm9yIG1vbnN0ZXIgJHt0aGlzLm5hbWV9YClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogTW9uc3RlciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNb25zdGVyKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29udGFpbmVyT3B0aW9ucyB7XHJcbiAgICBpZDogc3RyaW5nXHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlOiBzdHJpbmdcclxuICAgIGNvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICBpdGVtcz86IFNldDxJdGVtPlxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ29udGFpbmVyIGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICByZWFkb25seSBpdGVtczogU2V0PEl0ZW0+XHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQ29udGFpbmVyT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuaXRlbXMgPSBuZXcgU2V0PEl0ZW0+KFsuLi5vcHRpb25zLml0ZW1zID8/IFtdXSlcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBDb250YWluZXIge1xyXG4gICAgICAgIHJldHVybiBuZXcgQ29udGFpbmVyKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNvbnN0IGxldmVscyA9IFtcclxuICAgIDEwLFxyXG4gICAgMjAsXHJcbiAgICA1MCxcclxuICAgIDEwMCxcclxuICAgIDIwMCxcclxuICAgIDUwMCxcclxuICAgIDEwMDAsXHJcbiAgICAyMDAwLFxyXG4gICAgNTAwMCxcclxuICAgIDEwMDAwXVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cGVyaWVuY2VSZXF1aXJlbWVudChsZXZlbDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGlmIChsZXZlbCA8IDIpIHtcclxuICAgICAgICByZXR1cm4gMFxyXG4gICAgfVxyXG5cclxuICAgIGlmIChsZXZlbCAtIDIgPj0gbGV2ZWxzLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiBJbmZpbml0eVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBsZXZlbHNbbGV2ZWwgLSAyXVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGFibGU8VCBleHRlbmRzIFRoaW5nPiB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBUPigpO1xyXG5cclxuICAgIGluc2VydCh0aGluZzogVCk6IFQge1xyXG4gICAgICAgIGlmICh0aGlzLmhhcyh0aGluZy5pZCkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBdHRlbXB0IHRvIGluc2VydCBkdXBsaWNhdGUgaWQgb2YgJHt0aGluZy5pZH1gKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYXAuc2V0KHRoaW5nLmlkLCB0aGluZylcclxuICAgICAgICByZXR1cm4gdGhpbmdcclxuICAgIH1cclxuXHJcbiAgICBoYXMoaWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1hcC5oYXMoaWQpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0KGlkOiBzdHJpbmcpOiBUIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAuZ2V0KGlkKVxyXG4gICAgfVxyXG5cclxuICAgICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBHZW5lcmF0b3I8VD4ge1xyXG4gICAgICAgIGZvciAoY29uc3QgW18sIHZdIG9mIHRoaXMubWFwKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHZcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUaGluZ0RCIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbWFwID0gbmV3IE1hcDxzdHJpbmcsIFRoaW5nPigpXHJcblxyXG4gICAgaW5zZXJ0PFQgZXh0ZW5kcyBUaGluZz4odGhpbmc6IFQpOiBUIHtcclxuICAgICAgICBpZiAodGhpcy5oYXModGhpbmcuaWQpKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQXR0ZW1wdCB0byBpbnNlcnQgZHVwbGljYXRlIGlkIG9mICR7dGhpbmcuaWR9YClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubWFwLnNldCh0aGluZy5pZCwgdGhpbmcpXHJcbiAgICAgICAgcmV0dXJuIHRoaW5nXHJcbiAgICB9XHJcblxyXG4gICAgaGFzKGlkOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAuaGFzKGlkKVxyXG4gICAgfVxyXG5cclxuICAgIGdldChpZDogc3RyaW5nKTogVGhpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1hcC5nZXQoaWQpXHJcbiAgICB9XHJcblxyXG4gICAgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEdlbmVyYXRvcjxUaGluZz4ge1xyXG4gICAgICAgIGZvciAoY29uc3QgW18sIHZdIG9mIHRoaXMubWFwKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHZcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUGxheWVyU2F2ZVN0YXRlIHtcclxuICAgIGlkOiBzdHJpbmcsXHJcbiAgICBiYXNlU3RyZW5ndGg6IG51bWJlclxyXG4gICAgYmFzZUludGVsbGlnZW5jZTogbnVtYmVyXHJcbiAgICBiYXNlQWdpbGl0eTogbnVtYmVyXHJcbiAgICBiYXNlTWF4SGVhbHRoOiBudW1iZXJcclxuICAgIGxldmVsOiBudW1iZXJcclxuICAgIGV4cGVyaWVuY2U6IG51bWJlclxyXG4gICAgaGVhbHRoOiBudW1iZXJcclxuICAgIG1lbGVlV2VhcG9uOiBudW1iZXJcclxuICAgIHJhbmdlZFdlYXBvbjogbnVtYmVyXHJcbiAgICBhcm1vcjogbnVtYmVyXHJcbiAgICBoZWxtOiBudW1iZXJcclxuICAgIHNoaWVsZDogbnVtYmVyXHJcbiAgICByaW5nOiBudW1iZXJcclxuICAgIGxpZ2h0U291cmNlOiBudW1iZXJcclxuICAgIGludmVudG9yeTogc3RyaW5nW10sXHJcbiAgICBnb2xkOiBudW1iZXIsXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBhIHdlaWdodGVkIGxpc3QgZnJvbSB3aGljaCBhIHJhbmRvbSBzZWxlY3Rpb24gY2FuIGJlIGRyYXduLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFdlaWdodGVkTGlzdDxUPiB7XHJcbiAgICAvKipcclxuICAgICAqIGNvbnN0cnVjdG9yXHJcbiAgICAgKiBAcGFyYW0gZGF0YSBsaXN0IG9mIFtpdGVtLCByZWxhdGl2ZSB3ZWlnaHRdIGl0ZW1zXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgZGF0YTogW1QsIG51bWJlcl1bXSkge1xyXG4gICAgICAgIGNvbnN0IHRvdGFsID0gZGF0YS5tYXAoeCA9PiB4WzFdKS5yZWR1Y2UoKHgsIHkpID0+IHggKyB5LCAwKVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgZGF0YVtpXVsxXSAvPSB0b3RhbFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZWxlY3Qocm5nOiByYW5kLlJORyk6IFQge1xyXG4gICAgICAgIGxldCBkaXN0ID0gcm5nLm5leHQoKVxyXG4gICAgICAgIGZvciAoY29uc3QgW3gsIHddIG9mIHRoaXMuZGF0YSkge1xyXG4gICAgICAgICAgICBkaXN0IC09IHdcclxuICAgICAgICAgICAgaWYgKGRpc3QgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHhcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBvciBlbXB0eSBsaXN0LCBubyBzZWxlY3Rpb24gbWFkZVwiKVxyXG4gICAgfVxyXG59Il19