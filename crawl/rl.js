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
    save() {
        return {
            id: this.id,
            data: null,
        };
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
    save() {
        return {
            id: this.id,
            data: {
                kind: "LightSource",
                duration: this.duration,
            }
        };
    }
    load(state) {
        this.duration = state.duration;
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
            data: {
                kind: "Player",
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
                inventory: this.inventory.map(i => i.save()),
                gold: this.gold,
            }
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
        this.inventory = state.inventory.map(invState => {
            const item = db.load(invState);
            if (!(item instanceof Item)) {
                throw new Error("non-item in inventory, load failed.");
            }
            return item;
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
    save() {
        return {
            id: this.id,
            data: {
                kind: "Monster",
                health: this.health,
                action: this.action,
                actionReserve: this.actionReserve,
                state: this.state,
            }
        };
    }
    load(state) {
        this.health = state.health;
        this.action = state.action;
        this.actionReserve = state.actionReserve;
        this.state = state.state;
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
    load(state) {
        var _a;
        const thing = (_a = this.get(state.id)) === null || _a === void 0 ? void 0 : _a.clone();
        if (!thing) {
            throw new Error(`No thing with id ${state.id} found, cannot load.`);
        }
        if (!state.data) {
            return thing;
        }
        switch (state.data.kind) {
            case "Player":
                if (!(thing instanceof Player)) {
                    throw new Error("Invalid thing - expected player.");
                }
                thing.load(this, state.data);
                break;
            case "LightSource":
                if (!(thing instanceof LightSource)) {
                    throw new Error("Invalid thing - expected light source.");
                }
                thing.load(state.data);
                break;
        }
        return thing;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJybC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUNILE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFFL0IsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQTtBQVcxQixNQUFNLE9BQU8sS0FBSztJQVFkLFlBQVksT0FBcUI7O1FBRnhCLFVBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFHdEMsSUFBSSxDQUFDLEVBQUUsR0FBRyxPQUFPLENBQUMsRUFBRSxDQUFBO1FBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQTtRQUNoQyxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUE7UUFDdEMsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBQSxPQUFPLENBQUMsS0FBSyxtQ0FBSSxFQUFFLENBQUE7UUFFaEMsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFO1lBQ2YsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFBO1NBQzdCO0lBQ0wsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzFCLENBQUM7SUFFRCxJQUFJO1FBQ0EsT0FBTztZQUNILEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRTtZQUNYLElBQUksRUFBRSxJQUFJO1NBQ2IsQ0FBQTtJQUNMLENBQUM7Q0FDSjtBQWtDRCxNQUFNLE9BQU8sSUFBSTtJQUNiLFlBQXFCLE1BQWMsQ0FBQyxFQUFXLE1BQWMsQ0FBQztRQUF6QyxRQUFHLEdBQUgsR0FBRyxDQUFZO1FBQVcsUUFBRyxHQUFILEdBQUcsQ0FBWTtJQUFJLENBQUM7SUFFbkUsSUFBSSxDQUFDLEdBQWE7UUFDZCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQVM7UUFDVCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFRCxRQUFRO1FBQ0osT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLE1BQU0sSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ3RDLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxJQUFLLFNBQVEsS0FBSztJQUMzQixLQUFLO1FBQ0QsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN6QixDQUFDO0NBQ0o7QUFPRCxNQUFNLE9BQU8sT0FBUSxTQUFRLEtBQUs7SUFJOUIsWUFBWSxPQUF1Qjs7UUFDL0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2QsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFBLE9BQU8sQ0FBQyxVQUFVLG1DQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQy9ELElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBQSxPQUFPLENBQUMsV0FBVyxtQ0FBSSxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzVCLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxJQUFLLFNBQVEsT0FBTztJQUM3QixLQUFLO1FBQ0QsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN6QixDQUFDO0NBQ0o7QUFFRCxNQUFNLENBQU4sSUFBWSxhQUdYO0FBSEQsV0FBWSxhQUFhO0lBQ3JCLDZDQUFFLENBQUE7SUFDRixpREFBSSxDQUFBO0FBQ1IsQ0FBQyxFQUhXLGFBQWEsS0FBYixhQUFhLFFBR3hCO0FBVUQsTUFBTSxPQUFPLElBQUssU0FBUSxPQUFPO0lBRzdCLFlBQVksT0FBb0I7UUFDNUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDekIsQ0FBQztDQUNKO0FBWUQsTUFBTSxPQUFPLElBQUssU0FBUSxLQUFLO0lBSzNCLFlBQVksT0FBb0I7O1FBQzVCLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUVyRSxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7UUFDMUIsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFBLE9BQU8sQ0FBQyxJQUFJLG1DQUFJLENBQUMsQ0FBQTtRQUM3QixJQUFJLENBQUMsS0FBSyxHQUFHLE1BQUEsT0FBTyxDQUFDLEtBQUssbUNBQUksQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN6QixDQUFDO0NBQ0o7QUFVRCxNQUFNLE9BQU8sTUFBTyxTQUFRLElBQUk7SUFPNUIsWUFBWSxPQUFzQjs7UUFDOUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2QsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFBO1FBQzVCLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNwQyxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQUEsT0FBTyxDQUFDLEtBQUssbUNBQUksQ0FBQyxDQUFBO1FBQy9CLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBQSxPQUFPLENBQUMsSUFBSSxtQ0FBSSxFQUFFLENBQUE7UUFDOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFBO0lBQ2hDLENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMzQixDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sWUFBYSxTQUFRLE1BQU07SUFDcEMsS0FBSztRQUNELE9BQU8sSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDakMsQ0FBQztDQUNKO0FBRUQsTUFBTSxPQUFPLFdBQVksU0FBUSxNQUFNO0lBQ25DLEtBQUs7UUFDRCxPQUFPLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2hDLENBQUM7Q0FDSjtBQU1ELE1BQU0sT0FBTyxLQUFNLFNBQVEsSUFBSTtJQUczQixZQUFZLE9BQXFCO1FBQzdCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNkLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQTtJQUNsQyxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDMUIsQ0FBQztDQUNKO0FBTUQsTUFBTSxPQUFPLElBQUssU0FBUSxJQUFJO0lBRzFCLFlBQVksT0FBb0I7UUFDNUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2QsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN6QixDQUFDO0NBQ0o7QUFNRCxNQUFNLE9BQU8sTUFBTyxTQUFRLElBQUk7SUFHNUIsWUFBWSxPQUFzQjtRQUM5QixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDZCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUE7SUFDbEMsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzNCLENBQUM7Q0FDSjtBQVNELE1BQU0sT0FBTyxJQUFLLFNBQVEsSUFBSTtJQU0xQixZQUFZLE9BQW9COztRQUM1QixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDZCxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQUEsT0FBTyxDQUFDLFFBQVEsbUNBQUksQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBQSxPQUFPLENBQUMsT0FBTyxtQ0FBSSxDQUFDLENBQUE7UUFDbkMsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFBLE9BQU8sQ0FBQyxZQUFZLG1DQUFJLENBQUMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsU0FBUyxHQUFHLE1BQUEsT0FBTyxDQUFDLFNBQVMsbUNBQUksQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDSjtBQVFELE1BQU0sT0FBTyxXQUFZLFNBQVEsSUFBSTtJQUtqQyxZQUFZLE9BQTJCOztRQUNuQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDZCxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUE7UUFDdEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFBLE9BQU8sQ0FBQyxVQUFVLG1DQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUVELElBQUk7UUFDQSxPQUFPO1lBQ0gsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ1gsSUFBSSxFQUFFO2dCQUNGLElBQUksRUFBRSxhQUFhO2dCQUNuQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7YUFDMUI7U0FDSixDQUFBO0lBQ0wsQ0FBQztJQUVELElBQUksQ0FBQyxLQUEyQjtRQUM1QixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUE7SUFDbEMsQ0FBQztDQUNKO0FBSUQsTUFBTSxVQUFVLFlBQVksQ0FBQyxJQUFVO0lBQ25DLE9BQU8sSUFBSSxZQUFZLE1BQU07V0FDdEIsSUFBSSxZQUFZLEtBQUs7V0FDckIsSUFBSSxZQUFZLE1BQU07V0FDdEIsSUFBSSxZQUFZLElBQUk7V0FDcEIsSUFBSSxZQUFZLFdBQVc7V0FDM0IsSUFBSSxZQUFZLElBQUksQ0FBQTtBQUMvQixDQUFDO0FBTUQsTUFBTSxPQUFPLE1BQU8sU0FBUSxJQUFJO0lBRzVCLFlBQVksT0FBc0I7UUFDOUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQTtJQUNoQyxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDM0IsQ0FBQztDQUNKO0FBd0NELE1BQU0sT0FBTyxNQUFPLFNBQVEsS0FBSztJQW9CN0IsWUFBWSxPQUFzQjs7UUFDOUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBYnpFLFdBQU0sR0FBVyxDQUFDLENBQUE7UUFDbEIsa0JBQWEsR0FBVyxDQUFDLENBQUE7UUFhckIsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFBLE9BQU8sQ0FBQyxRQUFRLG1DQUFJLENBQUMsQ0FBQTtRQUN6QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsTUFBQSxPQUFPLENBQUMsUUFBUSxtQ0FBSSxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFBLE9BQU8sQ0FBQyxPQUFPLG1DQUFJLENBQUMsQ0FBQTtRQUN2QyxJQUFJLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUE7UUFDdEMsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFBLE9BQU8sQ0FBQyxLQUFLLG1DQUFJLENBQUMsQ0FBQTtRQUMvQixJQUFJLENBQUMsVUFBVSxHQUFHLE1BQUEsT0FBTyxDQUFDLFVBQVUsbUNBQUksQ0FBQyxDQUFBO1FBQ3pDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBQSxPQUFPLENBQUMsTUFBTSxtQ0FBSSxJQUFJLENBQUMsU0FBUyxDQUFBO1FBQzlDLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBQSxPQUFPLENBQUMsV0FBVyxtQ0FBSSxJQUFJLENBQUE7UUFDOUMsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFBLE9BQU8sQ0FBQyxZQUFZLG1DQUFJLElBQUksQ0FBQTtRQUNoRCxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQUEsT0FBTyxDQUFDLElBQUksbUNBQUksSUFBSSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBQSxPQUFPLENBQUMsS0FBSyxtQ0FBSSxJQUFJLENBQUE7UUFDbEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFBLE9BQU8sQ0FBQyxNQUFNLG1DQUFJLElBQUksQ0FBQTtRQUNwQyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQUEsT0FBTyxDQUFDLElBQUksbUNBQUksSUFBSSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBQSxPQUFPLENBQUMsV0FBVyxtQ0FBSSxJQUFJLENBQUE7UUFDOUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDaEUsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFBLE9BQU8sQ0FBQyxJQUFJLG1DQUFJLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsSUFBSSxRQUFROztRQUNSLE9BQU8sSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLE1BQUEsTUFBQSxJQUFJLENBQUMsSUFBSSwwQ0FBRSxRQUFRLG1DQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFFRCxJQUFJLE9BQU87O1FBQ1AsT0FBTyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsTUFBQSxNQUFBLElBQUksQ0FBQyxJQUFJLDBDQUFFLE9BQU8sbUNBQUksQ0FBQyxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVELElBQUksWUFBWTs7UUFDWixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLE1BQUEsTUFBQSxJQUFJLENBQUMsSUFBSSwwQ0FBRSxZQUFZLG1DQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFRCxJQUFJLFNBQVM7O1FBQ1QsT0FBTyxJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsTUFBQSxNQUFBLElBQUksQ0FBQyxJQUFJLDBDQUFFLFNBQVMsbUNBQUksQ0FBQyxDQUFDLENBQUE7SUFDM0QsQ0FBQztJQUVELElBQUksV0FBVzs7UUFDWCxPQUFPLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxNQUFBLE1BQUEsSUFBSSxDQUFDLFdBQVcsMENBQUUsTUFBTSxtQ0FBSSxDQUFDLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRUQsSUFBSSxXQUFXOztRQUNYLE9BQU8sQ0FBQyxNQUFBLE1BQUEsSUFBSSxDQUFDLFdBQVcsMENBQUUsTUFBTSxtQ0FBSSxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzFFLENBQUM7SUFFRCxJQUFJLFlBQVk7O1FBQ1osT0FBTyxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsTUFBQSxNQUFBLElBQUksQ0FBQyxZQUFZLDBDQUFFLE1BQU0sbUNBQUksQ0FBQyxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVELElBQUksWUFBWTs7UUFDWixPQUFPLE1BQUEsTUFBQSxNQUFBLElBQUksQ0FBQyxZQUFZLDBDQUFFLE1BQU0sMENBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsbUNBQUksSUFBSSxDQUFBO0lBQy9ELENBQUM7SUFFRCxJQUFJLE9BQU87O1FBQ1AsT0FBTyxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsTUFBQSxNQUFBLElBQUksQ0FBQyxLQUFLLDBDQUFFLE9BQU8sbUNBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFBLE1BQUEsSUFBSSxDQUFDLElBQUksMENBQUUsT0FBTyxtQ0FBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQUEsTUFBQSxJQUFJLENBQUMsTUFBTSwwQ0FBRSxPQUFPLG1DQUFJLENBQUMsQ0FBQyxDQUFBO0lBQzlHLENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDWCxJQUFJLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxFQUFFO1lBQ25ELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUE7U0FDdEM7UUFFRCxPQUFPLENBQUMsQ0FBQTtJQUNaLENBQUM7SUFFRCxJQUFJLFVBQVU7O1FBQ1YsT0FBTyxNQUFBLE1BQUEsSUFBSSxDQUFDLFdBQVcsMENBQUUsVUFBVSxtQ0FBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQTtJQUMxRCxDQUFDO0lBRUQsVUFBVSxDQUFDLElBQVU7UUFDakIsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFRCxDQUFDLFNBQVM7UUFDTixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDbEIsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFBO1NBQ3pCO1FBRUQsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ25CLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQTtTQUMxQjtRQUVELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNaLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQTtTQUNuQjtRQUVELElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUNYLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQTtTQUNsQjtRQUVELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNiLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQTtTQUNwQjtRQUVELElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUNYLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQTtTQUNsQjtRQUVELElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNsQixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUE7U0FDekI7SUFDTCxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFVO1FBQ1osSUFBSSxJQUFJLFlBQVksV0FBVyxFQUFFO1lBQzdCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFBO1NBQzFCO2FBQU0sSUFBSSxJQUFJLFlBQVksWUFBWSxFQUFFO1lBQ3JDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO1NBQzNCO2FBQU0sSUFBSSxJQUFJLFlBQVksS0FBSyxFQUFFO1lBQzlCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1NBQ3BCO2FBQU0sSUFBSSxJQUFJLFlBQVksTUFBTSxFQUFFO1lBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO1NBQ3JCO2FBQU0sSUFBSSxJQUFJLFlBQVksSUFBSSxFQUFFO1lBQzdCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1NBQ25CO2FBQU0sSUFBSSxJQUFJLFlBQVksSUFBSSxFQUFFO1lBQzdCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1NBQ25CO2FBQU0sSUFBSSxJQUFJLFlBQVksV0FBVyxFQUFFO1lBQ3BDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFBO1NBQzFCO0lBQ0wsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFVO1FBQ2IsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLElBQUksRUFBRTtZQUMzQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtTQUMxQjtRQUVELElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxJQUFJLEVBQUU7WUFDNUIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7U0FDM0I7UUFFRCxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxFQUFFO1lBQ3JCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1NBQ3BCO1FBRUQsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtZQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtTQUNuQjtRQUVELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxJQUFJLEVBQUU7WUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7U0FDckI7UUFFRCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO1lBQ3BCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1NBQ25CO1FBRUQsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLElBQUksRUFBRTtZQUMzQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtTQUMxQjtJQUNMLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBVTtRQUNiLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLElBQUksS0FBSyxJQUFJLENBQUMsRUFBRTtZQUNaLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1NBQ3BCO0lBQ0wsQ0FBQztJQUVELElBQUk7UUFDQSxPQUFPO1lBQ0gsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ1gsSUFBSSxFQUFFO2dCQUNGLElBQUksRUFBRSxRQUFRO2dCQUNkLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtnQkFDL0IsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtnQkFDdkMsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO2dCQUM3QixhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7Z0JBQ2pDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztnQkFDakIsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO2dCQUMzQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDN0UsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoRixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNELElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEQsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5RCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hELFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDN0UsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUM1QyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7YUFDbEI7U0FDSixDQUFBO0lBQ0wsQ0FBQztJQUVELElBQUksQ0FBQyxFQUFXLEVBQUUsS0FBc0I7UUFDcEMsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUE7UUFDOUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQTtRQUN4QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUE7UUFDeEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQTtRQUUxQixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzVDLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7WUFFOUIsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLElBQUksQ0FBQyxFQUFFO2dCQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUE7YUFDekQ7WUFFRCxPQUFPLElBQUksQ0FBQTtRQUNmLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxLQUFLLENBQUMsV0FBVyxJQUFJLENBQUMsRUFBRTtZQUN4QixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7U0FDaEQ7YUFBTTtZQUNILElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFBO1NBQzFCO1FBRUQsSUFBSSxLQUFLLENBQUMsWUFBWSxJQUFJLENBQUMsRUFBRTtZQUN6QixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7U0FDakQ7YUFBTTtZQUNILElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO1NBQzNCO1FBRUQsSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRTtZQUNqQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7U0FDekM7YUFBTTtZQUNILElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1NBQ25CO1FBRUQsSUFBSSxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsRUFBRTtZQUNsQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7U0FDMUM7YUFBTTtZQUNILElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1NBQ3BCO1FBRUQsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtZQUNuQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7U0FDM0M7YUFBTTtZQUNILElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO1NBQ3JCO1FBRUQsSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRTtZQUNqQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7U0FDekM7YUFBTTtZQUNILElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1NBQ25CO1FBRUQsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO0lBQzFCLENBQUM7Q0FDSjtBQVVELE1BQU0sT0FBTyxNQUFNO0lBT2YsWUFBWSxPQUFzQjs7UUFDOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFBLE9BQU8sQ0FBQyxNQUFNLG1DQUFJLENBQUMsQ0FBQTtRQUNqQyxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDcEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFBO1FBQzVCLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBQSxPQUFPLENBQUMsS0FBSyxtQ0FBSSxDQUFDLENBQUE7UUFDL0IsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFBLE9BQU8sQ0FBQyxJQUFJLG1DQUFJLEVBQUUsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDM0IsQ0FBQztDQUNKO0FBRUQsTUFBTSxDQUFOLElBQVksWUFHWDtBQUhELFdBQVksWUFBWTtJQUNwQiwrQ0FBSSxDQUFBO0lBQ0osaURBQUssQ0FBQTtBQUNULENBQUMsRUFIVyxZQUFZLEtBQVosWUFBWSxRQUd2QjtBQVNELE1BQU0sT0FBTyxPQUFRLFNBQVEsS0FBSztJQWM5QixZQUFZLE9BQXVCOztRQUMvQixLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFUaEUsWUFBTyxHQUFhLEVBQUUsQ0FBQTtRQUMvQixVQUFLLEdBQWlCLFlBQVksQ0FBQyxJQUFJLENBQUE7UUFDdkMsV0FBTSxHQUFXLENBQUMsQ0FBQTtRQUNsQixrQkFBYSxHQUFXLENBQUMsQ0FBQTtRQUVoQixTQUFJLEdBQVcsQ0FBQyxDQUFBO1FBS3JCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBQSxPQUFPLENBQUMsT0FBTyxtQ0FBSSxDQUFDLENBQUE7UUFDbkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFBLE9BQU8sQ0FBQyxPQUFPLG1DQUFJLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUE7UUFDbEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFBLE9BQU8sQ0FBQyxNQUFNLG1DQUFJLElBQUksQ0FBQyxTQUFTLENBQUE7UUFDOUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFBO1FBQ3BDLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7UUFDMUIsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFBLE9BQU8sQ0FBQyxJQUFJLG1DQUFJLENBQUMsQ0FBQTtRQUM3QixJQUFJLENBQUMsSUFBSSxHQUFHLE1BQUEsT0FBTyxDQUFDLElBQUksbUNBQUksQ0FBQyxDQUFBO1FBRTdCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1lBQzFCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1NBQ2pFO0lBQ0wsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzVCLENBQUM7SUFFRCxJQUFJO1FBQ0EsT0FBTztZQUNILEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRTtZQUNYLElBQUksRUFBRTtnQkFDRixJQUFJLEVBQUUsU0FBUztnQkFDZixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtnQkFDbkIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO2dCQUNqQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7YUFDcEI7U0FDSixDQUFBO0lBQ0wsQ0FBQztJQUVELElBQUksQ0FBQyxLQUF1QjtRQUN4QixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUE7UUFDMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFBO1FBQzFCLElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQTtRQUN4QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUE7SUFDNUIsQ0FBQztDQUNKO0FBa0JELE1BQU0sT0FBTyxTQUFVLFNBQVEsT0FBTztJQUdsQyxZQUFZLE9BQXlCOztRQUNqQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDckUsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBTyxDQUFDLEdBQUcsTUFBQSxPQUFPLENBQUMsS0FBSyxtQ0FBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3hELENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM5QixDQUFDO0NBQ0o7QUFFRCxNQUFNLE1BQU0sR0FBRztJQUNYLEVBQUU7SUFDRixFQUFFO0lBQ0YsRUFBRTtJQUNGLEdBQUc7SUFDSCxHQUFHO0lBQ0gsR0FBRztJQUNILElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLEtBQUs7Q0FBQyxDQUFBO0FBRVYsTUFBTSxVQUFVLHdCQUF3QixDQUFDLEtBQWE7SUFDbEQsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFO1FBQ1gsT0FBTyxDQUFDLENBQUE7S0FDWDtJQUVELElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFO1FBQzVCLE9BQU8sUUFBUSxDQUFBO0tBQ2xCO0lBRUQsT0FBTyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBQzVCLENBQUM7QUFFRCxNQUFNLE9BQU8sS0FBSztJQUFsQjtRQUNxQixRQUFHLEdBQUcsSUFBSSxHQUFHLEVBQWEsQ0FBQztJQXdCaEQsQ0FBQztJQXRCRyxNQUFNLENBQUMsS0FBUTtRQUNYLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQ0FBcUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7U0FDbkU7UUFFRCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdCLE9BQU8sS0FBSyxDQUFBO0lBQ2hCLENBQUM7SUFFRCxHQUFHLENBQUMsRUFBVTtRQUNWLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVELEdBQUcsQ0FBQyxFQUFVO1FBQ1YsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUMzQixDQUFDO0lBRUQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDZCxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUMzQixNQUFNLENBQUMsQ0FBQTtTQUNWO0lBQ0wsQ0FBQztDQUNKO0FBRUQsTUFBTSxPQUFPLE9BQU87SUFBcEI7UUFDcUIsUUFBRyxHQUFHLElBQUksR0FBRyxFQUFpQixDQUFBO0lBdURuRCxDQUFDO0lBckRHLE1BQU0sQ0FBa0IsS0FBUTtRQUM1QixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1NBQ25FO1FBRUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3QixPQUFPLEtBQUssQ0FBQTtJQUNoQixDQUFDO0lBRUQsR0FBRyxDQUFDLEVBQVU7UUFDVixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFRCxHQUFHLENBQUMsRUFBVTtRQUNWLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVELElBQUksQ0FBQyxLQUFxQjs7UUFDdEIsTUFBTSxLQUFLLEdBQUcsTUFBQSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsMENBQUUsS0FBSyxFQUFFLENBQUE7UUFDekMsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNSLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLEtBQUssQ0FBQyxFQUFFLHNCQUFzQixDQUFDLENBQUE7U0FDdEU7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRTtZQUNiLE9BQU8sS0FBSyxDQUFBO1NBQ2Y7UUFFRCxRQUFRLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ3JCLEtBQUssUUFBUTtnQkFDVCxJQUFJLENBQUMsQ0FBQyxLQUFLLFlBQVksTUFBTSxDQUFDLEVBQUU7b0JBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQTtpQkFDdEQ7Z0JBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUM1QixNQUFNO1lBRVYsS0FBSyxhQUFhO2dCQUNkLElBQUksQ0FBQyxDQUFDLEtBQUssWUFBWSxXQUFXLENBQUMsRUFBRTtvQkFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFBO2lCQUM1RDtnQkFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDdEIsTUFBTTtTQUNiO1FBRUQsT0FBTyxLQUFLLENBQUE7SUFDaEIsQ0FBQztJQUVELENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2QsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDM0IsTUFBTSxDQUFDLENBQUE7U0FDVjtJQUNMLENBQUM7Q0FDSjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFlBQVk7SUFDckI7OztPQUdHO0lBQ0gsWUFBNkIsSUFBbUI7UUFBbkIsU0FBSSxHQUFKLElBQUksQ0FBZTtRQUM1QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtZQUNsQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFBO1NBQ3RCO0lBQ0wsQ0FBQztJQUVELE1BQU0sQ0FBQyxHQUFhO1FBQ2hCLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNyQixLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUM1QixJQUFJLElBQUksQ0FBQyxDQUFBO1lBQ1QsSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFFO2dCQUNYLE9BQU8sQ0FBQyxDQUFBO2FBQ1g7U0FDSjtRQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQTBDLENBQUMsQ0FBQTtJQUMvRCxDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogcm9ndWUtbGlrZSBsaWJyYXJ5XHJcbiAqL1xyXG5pbXBvcnQgKiBhcyByYW5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiXHJcbmltcG9ydCAqIGFzIGdmeCBmcm9tIFwiLi9nZnguanNcIlxyXG5cclxuZXhwb3J0IGNvbnN0IHRpbGVTaXplID0gMjRcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGhpbmdPcHRpb25zIHtcclxuICAgIHJlYWRvbmx5IGlkOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IHBhc3NhYmxlOiBib29sZWFuXHJcbiAgICByZWFkb25seSB0cmFuc3BhcmVudDogYm9vbGVhblxyXG4gICAgcmVhZG9ubHkgbmFtZTogc3RyaW5nXHJcbiAgICByZWFkb25seSBpbWFnZT86IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgY29sb3I/OiBnZnguQ29sb3JcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRoaW5nIHtcclxuICAgIHJlYWRvbmx5IGlkOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IHBhc3NhYmxlOiBib29sZWFuXHJcbiAgICByZWFkb25seSB0cmFuc3BhcmVudDogYm9vbGVhblxyXG4gICAgcmVhZG9ubHkgbmFtZTogc3RyaW5nXHJcbiAgICByZWFkb25seSBpbWFnZTogc3RyaW5nXHJcbiAgICByZWFkb25seSBjb2xvciA9IG5ldyBnZnguQ29sb3IoMSwgMSwgMSwgMSlcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBUaGluZ09wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLmlkID0gb3B0aW9ucy5pZFxyXG4gICAgICAgIHRoaXMucGFzc2FibGUgPSBvcHRpb25zLnBhc3NhYmxlXHJcbiAgICAgICAgdGhpcy50cmFuc3BhcmVudCA9IG9wdGlvbnMudHJhbnNwYXJlbnRcclxuICAgICAgICB0aGlzLm5hbWUgPSBvcHRpb25zLm5hbWVcclxuICAgICAgICB0aGlzLmltYWdlID0gb3B0aW9ucy5pbWFnZSA/PyBcIlwiXHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmNvbG9yKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sb3IgPSBvcHRpb25zLmNvbG9yXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFRoaW5nIHtcclxuICAgICAgICByZXR1cm4gbmV3IFRoaW5nKHRoaXMpXHJcbiAgICB9XHJcblxyXG4gICAgc2F2ZSgpOiBUaGluZ1NhdmVTdGF0ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMuaWQsXHJcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRoaW5nU2F2ZVN0YXRlIHtcclxuICAgIHJlYWRvbmx5IGlkOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGRhdGE6IERhdGFTYXZlU3RhdGVcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgRGF0YVNhdmVTdGF0ZSA9IG51bGwgfCBQbGF5ZXJTYXZlU3RhdGUgfCBMaWdodFNvdXJjZVNhdmVTdGF0ZSB8IE1vbnN0ZXJTYXZlU3RhdGVcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUGxheWVyU2F2ZVN0YXRlIHtcclxuICAgIHJlYWRvbmx5IGtpbmQ6IFwiUGxheWVyXCJcclxuICAgIHJlYWRvbmx5IGJhc2VTdHJlbmd0aDogbnVtYmVyXHJcbiAgICByZWFkb25seSBiYXNlSW50ZWxsaWdlbmNlOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGJhc2VBZ2lsaXR5OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGJhc2VNYXhIZWFsdGg6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgbGV2ZWw6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgZXhwZXJpZW5jZTogbnVtYmVyXHJcbiAgICByZWFkb25seSBoZWFsdGg6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgbWVsZWVXZWFwb246IG51bWJlclxyXG4gICAgcmVhZG9ubHkgcmFuZ2VkV2VhcG9uOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGFybW9yOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGhlbG06IG51bWJlclxyXG4gICAgcmVhZG9ubHkgc2hpZWxkOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHJpbmc6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgbGlnaHRTb3VyY2U6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgaW52ZW50b3J5OiBUaGluZ1NhdmVTdGF0ZVtdLFxyXG4gICAgcmVhZG9ubHkgZ29sZDogbnVtYmVyLFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIExpZ2h0U291cmNlU2F2ZVN0YXRlIHtcclxuICAgIHJlYWRvbmx5IGtpbmQ6IFwiTGlnaHRTb3VyY2VcIlxyXG4gICAgcmVhZG9ubHkgZHVyYXRpb246IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRGljZSB7XHJcbiAgICBjb25zdHJ1Y3RvcihyZWFkb25seSBtaW46IG51bWJlciA9IDAsIHJlYWRvbmx5IG1heDogbnVtYmVyID0gMCkgeyB9XHJcblxyXG4gICAgcm9sbChybmc6IHJhbmQuUk5HKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gcmFuZC5pbnQocm5nLCB0aGlzLm1pbiwgdGhpcy5tYXggKyAxKVxyXG4gICAgfVxyXG5cclxuICAgIGFkZCh4OiBudW1iZXIpOiBEaWNlIHtcclxuICAgICAgICByZXR1cm4gbmV3IERpY2UodGhpcy5taW4gKyB4LCB0aGlzLm1heCArIHgpXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogRGljZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBEaWNlKHRoaXMubWluLCB0aGlzLm1heClcclxuICAgIH1cclxuXHJcbiAgICB0b1N0cmluZygpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBgJHt0aGlzLm1pbn0gLSAke3RoaXMubWF4fWBcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRpbGUgZXh0ZW5kcyBUaGluZyB7XHJcbiAgICBjbG9uZSgpOiBUaWxlIHtcclxuICAgICAgICByZXR1cm4gbmV3IFRpbGUodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIEZpeHR1cmVPcHRpb25zIGV4dGVuZHMgVGhpbmdPcHRpb25zIHtcclxuICAgIHJlYWRvbmx5IGxpZ2h0Q29sb3I/OiBnZnguQ29sb3JcclxuICAgIHJlYWRvbmx5IGxpZ2h0UmFkaXVzPzogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaXh0dXJlIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgcmVhZG9ubHkgbGlnaHRDb2xvcjogZ2Z4LkNvbG9yXHJcbiAgICByZWFkb25seSBsaWdodFJhZGl1czogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogRml4dHVyZU9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMubGlnaHRDb2xvciA9IG9wdGlvbnMubGlnaHRDb2xvciA/PyBnZnguQ29sb3Iud2hpdGUuY2xvbmUoKVxyXG4gICAgICAgIHRoaXMubGlnaHRSYWRpdXMgPSBvcHRpb25zLmxpZ2h0UmFkaXVzID8/IDBcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBGaXh0dXJlIHtcclxuICAgICAgICByZXR1cm4gbmV3IEZpeHR1cmUodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIERvb3IgZXh0ZW5kcyBGaXh0dXJlIHtcclxuICAgIGNsb25lKCk6IERvb3Ige1xyXG4gICAgICAgIHJldHVybiBuZXcgRG9vcih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZW51bSBFeGl0RGlyZWN0aW9uIHtcclxuICAgIFVwLFxyXG4gICAgRG93bixcclxufVxyXG5cclxuaW50ZXJmYWNlIEV4aXRPcHRpb25zIHtcclxuICAgIHJlYWRvbmx5IGlkOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IG5hbWU6IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgaW1hZ2U/OiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGNvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICByZWFkb25seSBkaXJlY3Rpb246IEV4aXREaXJlY3Rpb25cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEV4aXQgZXh0ZW5kcyBGaXh0dXJlIHtcclxuICAgIHJlYWRvbmx5IGRpcmVjdGlvbjogRXhpdERpcmVjdGlvblxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEV4aXRPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IGZhbHNlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuZGlyZWN0aW9uID0gb3B0aW9ucy5kaXJlY3Rpb25cclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBFeGl0IHtcclxuICAgICAgICByZXR1cm4gbmV3IEV4aXQodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJdGVtT3B0aW9ucyB7XHJcbiAgICByZWFkb25seSBpZDogc3RyaW5nXHJcbiAgICByZWFkb25seSBuYW1lOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGltYWdlPzogc3RyaW5nXHJcbiAgICByZWFkb25seSBjb2xvcj86IGdmeC5Db2xvclxyXG4gICAgcmVhZG9ubHkgbGV2ZWw6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgZnJlcT86IG51bWJlclxyXG4gICAgcmVhZG9ubHkgdmFsdWU6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgSXRlbSBleHRlbmRzIFRoaW5nIHtcclxuICAgIHJlYWRvbmx5IGxldmVsOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGZyZXE6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgdmFsdWU6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEl0ZW1PcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IHRydWUgfSwgb3B0aW9ucykpXHJcblxyXG4gICAgICAgIHRoaXMubGV2ZWwgPSBvcHRpb25zLmxldmVsXHJcbiAgICAgICAgdGhpcy5mcmVxID0gb3B0aW9ucy5mcmVxID8/IDFcclxuICAgICAgICB0aGlzLnZhbHVlID0gb3B0aW9ucy52YWx1ZSA/PyAxXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogSXRlbSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJdGVtKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgV2VhcG9uT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIHJlYWRvbmx5IGF0dGFjazogbnVtYmVyXHJcbiAgICByZWFkb25seSByYW5nZT86IG51bWJlclxyXG4gICAgcmVhZG9ubHkgdmVyYj86IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgYWN0aW9uOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGRhbWFnZTogRGljZVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgV2VhcG9uIGV4dGVuZHMgSXRlbSB7XHJcbiAgICByZWFkb25seSBhdHRhY2s6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgZGFtYWdlOiBEaWNlXHJcbiAgICByZWFkb25seSByYW5nZTogbnVtYmVyXHJcbiAgICByZWFkb25seSBhY3Rpb246IG51bWJlclxyXG4gICAgcmVhZG9ubHkgdmVyYjogc3RyaW5nXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogV2VhcG9uT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5hdHRhY2sgPSBvcHRpb25zLmF0dGFja1xyXG4gICAgICAgIHRoaXMuZGFtYWdlID0gb3B0aW9ucy5kYW1hZ2UuY2xvbmUoKVxyXG4gICAgICAgIHRoaXMucmFuZ2UgPSBvcHRpb25zLnJhbmdlID8/IDFcclxuICAgICAgICB0aGlzLnZlcmIgPSBvcHRpb25zLnZlcmIgPz8gXCJcIlxyXG4gICAgICAgIHRoaXMuYWN0aW9uID0gb3B0aW9ucy5hY3Rpb25cclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBXZWFwb24ge1xyXG4gICAgICAgIHJldHVybiBuZXcgV2VhcG9uKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBSYW5nZWRXZWFwb24gZXh0ZW5kcyBXZWFwb24ge1xyXG4gICAgY2xvbmUoKTogUmFuZ2VkV2VhcG9uIHtcclxuICAgICAgICByZXR1cm4gbmV3IFJhbmdlZFdlYXBvbih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWVsZWVXZWFwb24gZXh0ZW5kcyBXZWFwb24ge1xyXG4gICAgY2xvbmUoKTogV2VhcG9uIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1lbGVlV2VhcG9uKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXJtb3JPcHRpb25zIGV4dGVuZHMgSXRlbU9wdGlvbnMge1xyXG4gICAgZGVmZW5zZTogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBBcm1vciBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgZGVmZW5zZTogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQXJtb3JPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLmRlZmVuc2UgPSBvcHRpb25zLmRlZmVuc2VcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBBcm1vciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBcm1vcih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEhlbG1PcHRpb25zIGV4dGVuZHMgSXRlbU9wdGlvbnMge1xyXG4gICAgZGVmZW5zZTogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBIZWxtIGV4dGVuZHMgSXRlbSB7XHJcbiAgICByZWFkb25seSBkZWZlbnNlOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBIZWxtT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlID0gb3B0aW9ucy5kZWZlbnNlXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogSGVsbSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBIZWxtKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU2hpZWxkT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIGRlZmVuc2U6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU2hpZWxkIGV4dGVuZHMgSXRlbSB7XHJcbiAgICByZWFkb25seSBkZWZlbnNlOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBTaGllbGRPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLmRlZmVuc2UgPSBvcHRpb25zLmRlZmVuc2VcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBTaGllbGQge1xyXG4gICAgICAgIHJldHVybiBuZXcgU2hpZWxkKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmluZ09wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICByZWFkb25seSBzdHJlbmd0aD86IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYWdpbGl0eT86IG51bWJlclxyXG4gICAgcmVhZG9ubHkgaW50ZWxsaWdlbmNlPzogbnVtYmVyXHJcbiAgICByZWFkb25seSBtYXhIZWFsdGg/OiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFJpbmcgZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IHN0cmVuZ3RoOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGFnaWxpdHk6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgaW50ZWxsaWdlbmNlOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IG1heEhlYWx0aDogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogUmluZ09wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMuc3RyZW5ndGggPSBvcHRpb25zLnN0cmVuZ3RoID8/IDBcclxuICAgICAgICB0aGlzLmFnaWxpdHkgPSBvcHRpb25zLmFnaWxpdHkgPz8gMFxyXG4gICAgICAgIHRoaXMuaW50ZWxsaWdlbmNlID0gb3B0aW9ucy5pbnRlbGxpZ2VuY2UgPz8gMFxyXG4gICAgICAgIHRoaXMubWF4SGVhbHRoID0gb3B0aW9ucy5tYXhIZWFsdGggPz8gMFxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIExpZ2h0U291cmNlT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIHJlYWRvbmx5IGxpZ2h0UmFkaXVzOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGxpZ2h0Q29sb3I/OiBnZnguQ29sb3JcclxuICAgIHJlYWRvbmx5IGR1cmF0aW9uOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIExpZ2h0U291cmNlIGV4dGVuZHMgSXRlbSB7XHJcbiAgICByZWFkb25seSBsaWdodFJhZGl1czogbnVtYmVyXHJcbiAgICByZWFkb25seSBsaWdodENvbG9yOiBnZnguQ29sb3JcclxuICAgIGR1cmF0aW9uOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBMaWdodFNvdXJjZU9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMubGlnaHRSYWRpdXMgPSBvcHRpb25zLmxpZ2h0UmFkaXVzXHJcbiAgICAgICAgdGhpcy5saWdodENvbG9yID0gb3B0aW9ucy5saWdodENvbG9yID8/IGdmeC5Db2xvci53aGl0ZVxyXG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBvcHRpb25zLmR1cmF0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogTGlnaHRTb3VyY2Uge1xyXG4gICAgICAgIHJldHVybiBuZXcgTGlnaHRTb3VyY2UodGhpcylcclxuICAgIH1cclxuXHJcbiAgICBzYXZlKCk6IFRoaW5nU2F2ZVN0YXRlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBpZDogdGhpcy5pZCxcclxuICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAga2luZDogXCJMaWdodFNvdXJjZVwiLFxyXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IHRoaXMuZHVyYXRpb24sXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZChzdGF0ZTogTGlnaHRTb3VyY2VTYXZlU3RhdGUpIHtcclxuICAgICAgICB0aGlzLmR1cmF0aW9uID0gc3RhdGUuZHVyYXRpb25cclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IHR5cGUgRXF1aXBwYWJsZSA9IE1lbGVlV2VhcG9uIHwgUmFuZ2VkV2VhcG9uIHwgQXJtb3IgfCBIZWxtIHwgU2hpZWxkIHwgUmluZyB8IExpZ2h0U291cmNlXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaXNFcXVpcHBhYmxlKGl0ZW06IEl0ZW0pOiBpdGVtIGlzIEVxdWlwcGFibGUge1xyXG4gICAgcmV0dXJuIGl0ZW0gaW5zdGFuY2VvZiBXZWFwb25cclxuICAgICAgICB8fCBpdGVtIGluc3RhbmNlb2YgQXJtb3JcclxuICAgICAgICB8fCBpdGVtIGluc3RhbmNlb2YgU2hpZWxkXHJcbiAgICAgICAgfHwgaXRlbSBpbnN0YW5jZW9mIFJpbmdcclxuICAgICAgICB8fCBpdGVtIGluc3RhbmNlb2YgTGlnaHRTb3VyY2VcclxuICAgICAgICB8fCBpdGVtIGluc3RhbmNlb2YgSGVsbVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFVzYWJsZU9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICByZWFkb25seSBoZWFsdGg6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVXNhYmxlIGV4dGVuZHMgSXRlbSB7XHJcbiAgICByZWFkb25seSBoZWFsdGg6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFVzYWJsZU9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihPYmplY3QuYXNzaWduKHsgcGFzc2FibGU6IGZhbHNlLCB0cmFuc3BhcmVudDogZmFsc2UgfSwgb3B0aW9ucykpXHJcbiAgICAgICAgdGhpcy5oZWFsdGggPSBvcHRpb25zLmhlYWx0aFxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFVzYWJsZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBVc2FibGUodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDcmVhdHVyZU9wdGlvbnMge1xyXG4gICAgcmVhZG9ubHkgaWQ6IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgbmFtZTogc3RyaW5nXHJcbiAgICByZWFkb25seSBpbWFnZTogc3RyaW5nXHJcbiAgICByZWFkb25seSBjb2xvcj86IGdmeC5Db2xvclxyXG4gICAgcmVhZG9ubHkgbWF4SGVhbHRoOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGhlYWx0aD86IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYWdpbGl0eT86IG51bWJlclxyXG4gICAgcmVhZG9ubHkgbGV2ZWw6IG51bWJlcixcclxuICAgIHJlYWRvbmx5IGdvbGQ6IG51bWJlcixcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDcmVhdHVyZSBleHRlbmRzIFRoaW5nIHtcclxuICAgIHJlYWRvbmx5IG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBoZWFsdGg6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgZGVmZW5zZTogbnVtYmVyXHJcbiAgICByZWFkb25seSBhZ2lsaXR5OiBudW1iZXJcclxuICAgIGFjdGlvbjogbnVtYmVyXHJcbiAgICBhY3Rpb25SZXNlcnZlOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGxldmVsOiBudW1iZXIsXHJcbiAgICByZWFkb25seSBnb2xkOiBudW1iZXIsXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUGxheWVyT3B0aW9ucyBleHRlbmRzIENyZWF0dXJlT3B0aW9ucyB7XHJcbiAgICByZWFkb25seSBleHBlcmllbmNlPzogbnVtYmVyXHJcbiAgICByZWFkb25seSBzdHJlbmd0aD86IG51bWJlclxyXG4gICAgcmVhZG9ubHkgaW50ZWxsaWdlbmNlPzogbnVtYmVyXHJcbiAgICByZWFkb25seSBtYXhIZWFsdGg6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgbWVsZWVXZWFwb24/OiBNZWxlZVdlYXBvbiB8IG51bGxcclxuICAgIHJlYWRvbmx5IHJhbmdlZFdlYXBvbj86IFJhbmdlZFdlYXBvbiB8IG51bGxcclxuICAgIHJlYWRvbmx5IGFybW9yPzogQXJtb3IgfCBudWxsXHJcbiAgICByZWFkb25seSBoZWxtPzogSGVsbSB8IG51bGxcclxuICAgIHJlYWRvbmx5IHNoaWVsZD86IFNoaWVsZCB8IG51bGxcclxuICAgIHJlYWRvbmx5IHJpbmc/OiBSaW5nIHwgbnVsbFxyXG4gICAgcmVhZG9ubHkgbGlnaHRTb3VyY2U/OiBMaWdodFNvdXJjZSB8IG51bGwsXHJcbiAgICByZWFkb25seSBpbnZlbnRvcnk/OiBJdGVtW10sXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBQbGF5ZXIgZXh0ZW5kcyBUaGluZyBpbXBsZW1lbnRzIENyZWF0dXJlIHtcclxuICAgIGJhc2VTdHJlbmd0aDogbnVtYmVyXHJcbiAgICBiYXNlSW50ZWxsaWdlbmNlOiBudW1iZXJcclxuICAgIGJhc2VBZ2lsaXR5OiBudW1iZXJcclxuICAgIGJhc2VNYXhIZWFsdGg6IG51bWJlclxyXG4gICAgbGV2ZWw6IG51bWJlclxyXG4gICAgZXhwZXJpZW5jZTogbnVtYmVyXHJcbiAgICBoZWFsdGg6IG51bWJlclxyXG4gICAgYWN0aW9uOiBudW1iZXIgPSAwXHJcbiAgICBhY3Rpb25SZXNlcnZlOiBudW1iZXIgPSAwXHJcbiAgICBtZWxlZVdlYXBvbjogTWVsZWVXZWFwb24gfCBudWxsXHJcbiAgICByYW5nZWRXZWFwb246IFJhbmdlZFdlYXBvbiB8IG51bGxcclxuICAgIGFybW9yOiBBcm1vciB8IG51bGxcclxuICAgIGhlbG06IEhlbG0gfCBudWxsXHJcbiAgICBzaGllbGQ6IFNoaWVsZCB8IG51bGxcclxuICAgIHJpbmc6IFJpbmcgfCBudWxsXHJcbiAgICBsaWdodFNvdXJjZTogTGlnaHRTb3VyY2UgfCBudWxsXHJcbiAgICBpbnZlbnRvcnk6IEl0ZW1bXVxyXG4gICAgZ29sZDogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogUGxheWVyT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuYmFzZVN0cmVuZ3RoID0gb3B0aW9ucy5zdHJlbmd0aCA/PyAwXHJcbiAgICAgICAgdGhpcy5iYXNlSW50ZWxsaWdlbmNlID0gb3B0aW9ucy5zdHJlbmd0aCA/PyAwXHJcbiAgICAgICAgdGhpcy5iYXNlQWdpbGl0eSA9IG9wdGlvbnMuYWdpbGl0eSA/PyAwXHJcbiAgICAgICAgdGhpcy5iYXNlTWF4SGVhbHRoID0gb3B0aW9ucy5tYXhIZWFsdGhcclxuICAgICAgICB0aGlzLmxldmVsID0gb3B0aW9ucy5sZXZlbCA/PyAxXHJcbiAgICAgICAgdGhpcy5leHBlcmllbmNlID0gb3B0aW9ucy5leHBlcmllbmNlID8/IDBcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IG9wdGlvbnMuaGVhbHRoID8/IHRoaXMubWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5tZWxlZVdlYXBvbiA9IG9wdGlvbnMubWVsZWVXZWFwb24gPz8gbnVsbFxyXG4gICAgICAgIHRoaXMucmFuZ2VkV2VhcG9uID0gb3B0aW9ucy5yYW5nZWRXZWFwb24gPz8gbnVsbFxyXG4gICAgICAgIHRoaXMuaGVsbSA9IG9wdGlvbnMuaGVsbSA/PyBudWxsXHJcbiAgICAgICAgdGhpcy5hcm1vciA9IG9wdGlvbnMuYXJtb3IgPz8gbnVsbFxyXG4gICAgICAgIHRoaXMuc2hpZWxkID0gb3B0aW9ucy5zaGllbGQgPz8gbnVsbFxyXG4gICAgICAgIHRoaXMucmluZyA9IG9wdGlvbnMucmluZyA/PyBudWxsXHJcbiAgICAgICAgdGhpcy5saWdodFNvdXJjZSA9IG9wdGlvbnMubGlnaHRTb3VyY2UgPz8gbnVsbFxyXG4gICAgICAgIHRoaXMuaW52ZW50b3J5ID0gb3B0aW9ucy5pbnZlbnRvcnkgPyBbLi4ub3B0aW9ucy5pbnZlbnRvcnldIDogW11cclxuICAgICAgICB0aGlzLmdvbGQgPSBvcHRpb25zLmdvbGQgPz8gMFxyXG4gICAgfVxyXG5cclxuICAgIGdldCBzdHJlbmd0aCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJhc2VTdHJlbmd0aCArICh0aGlzLnJpbmc/LnN0cmVuZ3RoID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGFnaWxpdHkoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5iYXNlQWdpbGl0eSArICh0aGlzLnJpbmc/LmFnaWxpdHkgPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgaW50ZWxsaWdlbmNlKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYmFzZUludGVsbGlnZW5jZSArICh0aGlzLnJpbmc/LmludGVsbGlnZW5jZSA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBtYXhIZWFsdGgoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5iYXNlTWF4SGVhbHRoICsgKHRoaXMucmluZz8ubWF4SGVhbHRoID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IG1lbGVlQXR0YWNrKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RyZW5ndGggKyAodGhpcy5tZWxlZVdlYXBvbj8uYXR0YWNrID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IG1lbGVlRGFtYWdlKCk6IERpY2Uge1xyXG4gICAgICAgIHJldHVybiAodGhpcy5tZWxlZVdlYXBvbj8uZGFtYWdlID8/IG5ldyBEaWNlKDEsIDIpKS5hZGQodGhpcy5zdHJlbmd0aClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgcmFuZ2VkQXR0YWNrKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYWdpbGl0eSArICh0aGlzLnJhbmdlZFdlYXBvbj8uYXR0YWNrID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHJhbmdlZERhbWFnZSgpOiBEaWNlIHwgbnVsbCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucmFuZ2VkV2VhcG9uPy5kYW1hZ2U/LmFkZCh0aGlzLmFnaWxpdHkpID8/IG51bGxcclxuICAgIH1cclxuXHJcbiAgICBnZXQgZGVmZW5zZSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFnaWxpdHkgKyAodGhpcy5hcm1vcj8uZGVmZW5zZSA/PyAwKSArICh0aGlzLmhlbG0/LmRlZmVuc2UgPz8gMCkgKyAodGhpcy5zaGllbGQ/LmRlZmVuc2UgPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgbGlnaHRSYWRpdXMoKTogbnVtYmVyIHtcclxuICAgICAgICBpZiAodGhpcy5saWdodFNvdXJjZSAmJiB0aGlzLmxpZ2h0U291cmNlLmR1cmF0aW9uID4gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5saWdodFNvdXJjZS5saWdodFJhZGl1c1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIDFcclxuICAgIH1cclxuXHJcbiAgICBnZXQgbGlnaHRDb2xvcigpOiBnZnguQ29sb3Ige1xyXG4gICAgICAgIHJldHVybiB0aGlzLmxpZ2h0U291cmNlPy5saWdodENvbG9yID8/IGdmeC5Db2xvci53aGl0ZVxyXG4gICAgfVxyXG5cclxuICAgIGlzRXF1aXBwZWQoaXRlbTogSXRlbSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiBbLi4udGhpcy5lcXVpcG1lbnQoKV0uaW5jbHVkZXMoaXRlbSlcclxuICAgIH1cclxuXHJcbiAgICAqZXF1aXBtZW50KCk6IEl0ZXJhYmxlPEl0ZW0+IHtcclxuICAgICAgICBpZiAodGhpcy5tZWxlZVdlYXBvbikge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLm1lbGVlV2VhcG9uXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5yYW5nZWRXZWFwb24pIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5yYW5nZWRXZWFwb25cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmFybW9yKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMuYXJtb3JcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhlbG0pIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5oZWxtXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5zaGllbGQpIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5zaGllbGRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnJpbmcpIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5yaW5nXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5saWdodFNvdXJjZSkge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLmxpZ2h0U291cmNlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFBsYXllciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQbGF5ZXIodGhpcylcclxuICAgIH1cclxuXHJcbiAgICBlcXVpcChpdGVtOiBJdGVtKSB7XHJcbiAgICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBNZWxlZVdlYXBvbikge1xyXG4gICAgICAgICAgICB0aGlzLm1lbGVlV2VhcG9uID0gaXRlbVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIFJhbmdlZFdlYXBvbikge1xyXG4gICAgICAgICAgICB0aGlzLnJhbmdlZFdlYXBvbiA9IGl0ZW1cclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBBcm1vcikge1xyXG4gICAgICAgICAgICB0aGlzLmFybW9yID0gaXRlbVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIFNoaWVsZCkge1xyXG4gICAgICAgICAgICB0aGlzLnNoaWVsZCA9IGl0ZW1cclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBIZWxtKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGVsbSA9IGl0ZW1cclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBSaW5nKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmluZyA9IGl0ZW1cclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBMaWdodFNvdXJjZSkge1xyXG4gICAgICAgICAgICB0aGlzLmxpZ2h0U291cmNlID0gaXRlbVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZW1vdmUoaXRlbTogSXRlbSkge1xyXG4gICAgICAgIGlmICh0aGlzLm1lbGVlV2VhcG9uID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWVsZWVXZWFwb24gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5yYW5nZWRXZWFwb24gPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5yYW5nZWRXZWFwb24gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5hcm1vciA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLmFybW9yID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaGVsbSA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLmhlbG0gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5zaGllbGQgPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5zaGllbGQgPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5yaW5nID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmluZyA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmxpZ2h0U291cmNlID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGlnaHRTb3VyY2UgPSBudWxsXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGRlbGV0ZShpdGVtOiBJdGVtKSB7XHJcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmludmVudG9yeS5pbmRleE9mKGl0ZW0pO1xyXG4gICAgICAgIGlmIChpbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW52ZW50b3J5LnNwbGljZShpbmRleCwgMSlcclxuICAgICAgICAgICAgdGhpcy5yZW1vdmUoaXRlbSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2F2ZSgpOiBUaGluZ1NhdmVTdGF0ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMuaWQsXHJcbiAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgIGtpbmQ6IFwiUGxheWVyXCIsXHJcbiAgICAgICAgICAgICAgICBiYXNlU3RyZW5ndGg6IHRoaXMuYmFzZVN0cmVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgYmFzZUludGVsbGlnZW5jZTogdGhpcy5iYXNlSW50ZWxsaWdlbmNlLFxyXG4gICAgICAgICAgICAgICAgYmFzZUFnaWxpdHk6IHRoaXMuYmFzZUFnaWxpdHksXHJcbiAgICAgICAgICAgICAgICBiYXNlTWF4SGVhbHRoOiB0aGlzLmJhc2VNYXhIZWFsdGgsXHJcbiAgICAgICAgICAgICAgICBsZXZlbDogdGhpcy5sZXZlbCxcclxuICAgICAgICAgICAgICAgIGV4cGVyaWVuY2U6IHRoaXMuZXhwZXJpZW5jZSxcclxuICAgICAgICAgICAgICAgIGhlYWx0aDogdGhpcy5oZWFsdGgsXHJcbiAgICAgICAgICAgICAgICBtZWxlZVdlYXBvbjogdGhpcy5tZWxlZVdlYXBvbiA/IHRoaXMuaW52ZW50b3J5LmluZGV4T2YodGhpcy5tZWxlZVdlYXBvbikgOiAtMSxcclxuICAgICAgICAgICAgICAgIHJhbmdlZFdlYXBvbjogdGhpcy5yYW5nZWRXZWFwb24gPyB0aGlzLmludmVudG9yeS5pbmRleE9mKHRoaXMucmFuZ2VkV2VhcG9uKSA6IC0xLFxyXG4gICAgICAgICAgICAgICAgYXJtb3I6IHRoaXMuYXJtb3IgPyB0aGlzLmludmVudG9yeS5pbmRleE9mKHRoaXMuYXJtb3IpIDogLTEsXHJcbiAgICAgICAgICAgICAgICBoZWxtOiB0aGlzLmhlbG0gPyB0aGlzLmludmVudG9yeS5pbmRleE9mKHRoaXMuaGVsbSkgOiAtMSxcclxuICAgICAgICAgICAgICAgIHNoaWVsZDogdGhpcy5zaGllbGQgPyB0aGlzLmludmVudG9yeS5pbmRleE9mKHRoaXMuc2hpZWxkKSA6IC0xLFxyXG4gICAgICAgICAgICAgICAgcmluZzogdGhpcy5yaW5nID8gdGhpcy5pbnZlbnRvcnkuaW5kZXhPZih0aGlzLnJpbmcpIDogLTEsXHJcbiAgICAgICAgICAgICAgICBsaWdodFNvdXJjZTogdGhpcy5saWdodFNvdXJjZSA/IHRoaXMuaW52ZW50b3J5LmluZGV4T2YodGhpcy5saWdodFNvdXJjZSkgOiAtMSxcclxuICAgICAgICAgICAgICAgIGludmVudG9yeTogdGhpcy5pbnZlbnRvcnkubWFwKGkgPT4gaS5zYXZlKCkpLFxyXG4gICAgICAgICAgICAgICAgZ29sZDogdGhpcy5nb2xkLFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxvYWQoZGI6IFRoaW5nREIsIHN0YXRlOiBQbGF5ZXJTYXZlU3RhdGUpIHtcclxuICAgICAgICB0aGlzLmJhc2VTdHJlbmd0aCA9IHN0YXRlLmJhc2VTdHJlbmd0aFxyXG4gICAgICAgIHRoaXMuYmFzZUludGVsbGlnZW5jZSA9IHN0YXRlLmJhc2VJbnRlbGxpZ2VuY2VcclxuICAgICAgICB0aGlzLmJhc2VBZ2lsaXR5ID0gc3RhdGUuYmFzZUFnaWxpdHlcclxuICAgICAgICB0aGlzLmJhc2VNYXhIZWFsdGggPSBzdGF0ZS5iYXNlTWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5sZXZlbCA9IHN0YXRlLmxldmVsXHJcbiAgICAgICAgdGhpcy5leHBlcmllbmNlID0gc3RhdGUuZXhwZXJpZW5jZVxyXG4gICAgICAgIHRoaXMuaGVhbHRoID0gc3RhdGUuaGVhbHRoXHJcblxyXG4gICAgICAgIHRoaXMuaW52ZW50b3J5ID0gc3RhdGUuaW52ZW50b3J5Lm1hcChpbnZTdGF0ZSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBkYi5sb2FkKGludlN0YXRlKVxyXG5cclxuICAgICAgICAgICAgaWYgKCEoaXRlbSBpbnN0YW5jZW9mIEl0ZW0pKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJub24taXRlbSBpbiBpbnZlbnRvcnksIGxvYWQgZmFpbGVkLlwiKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaXRlbVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGlmIChzdGF0ZS5tZWxlZVdlYXBvbiA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXF1aXAodGhpcy5pbnZlbnRvcnlbc3RhdGUubWVsZWVXZWFwb25dKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMubWVsZWVXZWFwb24gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3RhdGUucmFuZ2VkV2VhcG9uID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lcXVpcCh0aGlzLmludmVudG9yeVtzdGF0ZS5yYW5nZWRXZWFwb25dKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMucmFuZ2VkV2VhcG9uID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHN0YXRlLmhlbG0gPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmVxdWlwKHRoaXMuaW52ZW50b3J5W3N0YXRlLmhlbG1dKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGVsbSA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzdGF0ZS5hcm1vciA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXF1aXAodGhpcy5pbnZlbnRvcnlbc3RhdGUuYXJtb3JdKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXJtb3IgPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3RhdGUuc2hpZWxkID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lcXVpcCh0aGlzLmludmVudG9yeVtzdGF0ZS5zaGllbGRdKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hpZWxkID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHN0YXRlLnJpbmcgPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmVxdWlwKHRoaXMuaW52ZW50b3J5W3N0YXRlLnJpbmddKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMucmluZyA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZ29sZCA9IHN0YXRlLmdvbGRcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBdHRhY2tPcHRpb25zIHtcclxuICAgIGF0dGFjazogbnVtYmVyXHJcbiAgICBkYW1hZ2U6IERpY2VcclxuICAgIGFjdGlvbjogbnVtYmVyXHJcbiAgICByYW5nZT86IG51bWJlclxyXG4gICAgdmVyYj86IHN0cmluZ1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQXR0YWNrIHtcclxuICAgIGF0dGFjazogbnVtYmVyXHJcbiAgICBkYW1hZ2U6IERpY2VcclxuICAgIGFjdGlvbjogbnVtYmVyXHJcbiAgICByYW5nZTogbnVtYmVyXHJcbiAgICB2ZXJiOiBzdHJpbmdcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBBdHRhY2tPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5hdHRhY2sgPSBvcHRpb25zLmF0dGFjayA/PyAwXHJcbiAgICAgICAgdGhpcy5kYW1hZ2UgPSBvcHRpb25zLmRhbWFnZS5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy5hY3Rpb24gPSBvcHRpb25zLmFjdGlvblxyXG4gICAgICAgIHRoaXMucmFuZ2UgPSBvcHRpb25zLnJhbmdlID8/IDFcclxuICAgICAgICB0aGlzLnZlcmIgPSBvcHRpb25zLnZlcmIgPz8gXCJcIlxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEF0dGFjayB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBdHRhY2sodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGVudW0gTW9uc3RlclN0YXRlIHtcclxuICAgIGlkbGUsXHJcbiAgICBhZ2dyb1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1vbnN0ZXJPcHRpb25zIGV4dGVuZHMgQ3JlYXR1cmVPcHRpb25zIHtcclxuICAgIGRlZmVuc2U6IG51bWJlclxyXG4gICAgZXhwZXJpZW5jZTogbnVtYmVyLFxyXG4gICAgYXR0YWNrczogQXR0YWNrW11cclxuICAgIGZyZXE/OiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1vbnN0ZXIgZXh0ZW5kcyBUaGluZyBpbXBsZW1lbnRzIENyZWF0dXJlIHtcclxuICAgIHJlYWRvbmx5IGFnaWxpdHk6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgZGVmZW5zZTogbnVtYmVyXHJcbiAgICByZWFkb25seSBtYXhIZWFsdGg6IG51bWJlclxyXG4gICAgaGVhbHRoOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGV4cGVyaWVuY2U6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYXR0YWNrczogQXR0YWNrW10gPSBbXVxyXG4gICAgc3RhdGU6IE1vbnN0ZXJTdGF0ZSA9IE1vbnN0ZXJTdGF0ZS5pZGxlXHJcbiAgICBhY3Rpb246IG51bWJlciA9IDBcclxuICAgIGFjdGlvblJlc2VydmU6IG51bWJlciA9IDBcclxuICAgIHJlYWRvbmx5IGxldmVsOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGZyZXE6IG51bWJlciA9IDFcclxuICAgIHJlYWRvbmx5IGdvbGQ6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IE1vbnN0ZXJPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IHRydWUgfSwgb3B0aW9ucykpXHJcbiAgICAgICAgdGhpcy5hZ2lsaXR5ID0gb3B0aW9ucy5hZ2lsaXR5ID8/IDBcclxuICAgICAgICB0aGlzLmRlZmVuc2UgPSBvcHRpb25zLmRlZmVuc2UgPz8gMFxyXG4gICAgICAgIHRoaXMubWF4SGVhbHRoID0gb3B0aW9ucy5tYXhIZWFsdGhcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IG9wdGlvbnMuaGVhbHRoID8/IHRoaXMubWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5leHBlcmllbmNlID0gb3B0aW9ucy5leHBlcmllbmNlXHJcbiAgICAgICAgdGhpcy5hdHRhY2tzID0gWy4uLm9wdGlvbnMuYXR0YWNrc11cclxuICAgICAgICB0aGlzLmxldmVsID0gb3B0aW9ucy5sZXZlbFxyXG4gICAgICAgIHRoaXMuZnJlcSA9IG9wdGlvbnMuZnJlcSA/PyAxXHJcbiAgICAgICAgdGhpcy5nb2xkID0gb3B0aW9ucy5nb2xkID8/IDBcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYXR0YWNrcy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGF0dGFja3MgZGVmaW5lZCBmb3IgbW9uc3RlciAke3RoaXMubmFtZX1gKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBNb25zdGVyIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1vbnN0ZXIodGhpcylcclxuICAgIH1cclxuXHJcbiAgICBzYXZlKCk6IFRoaW5nU2F2ZVN0YXRlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBpZDogdGhpcy5pZCxcclxuICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAga2luZDogXCJNb25zdGVyXCIsXHJcbiAgICAgICAgICAgICAgICBoZWFsdGg6IHRoaXMuaGVhbHRoLFxyXG4gICAgICAgICAgICAgICAgYWN0aW9uOiB0aGlzLmFjdGlvbixcclxuICAgICAgICAgICAgICAgIGFjdGlvblJlc2VydmU6IHRoaXMuYWN0aW9uUmVzZXJ2ZSxcclxuICAgICAgICAgICAgICAgIHN0YXRlOiB0aGlzLnN0YXRlLFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxvYWQoc3RhdGU6IE1vbnN0ZXJTYXZlU3RhdGUpIHtcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IHN0YXRlLmhlYWx0aFxyXG4gICAgICAgIHRoaXMuYWN0aW9uID0gc3RhdGUuYWN0aW9uXHJcbiAgICAgICAgdGhpcy5hY3Rpb25SZXNlcnZlID0gc3RhdGUuYWN0aW9uUmVzZXJ2ZVxyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZS5zdGF0ZVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1vbnN0ZXJTYXZlU3RhdGUge1xyXG4gICAgcmVhZG9ubHkga2luZDogXCJNb25zdGVyXCJcclxuICAgIHJlYWRvbmx5IGhlYWx0aDogbnVtYmVyXHJcbiAgICByZWFkb25seSBhY3Rpb246IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYWN0aW9uUmVzZXJ2ZTogbnVtYmVyXHJcbiAgICByZWFkb25seSBzdGF0ZTogTW9uc3RlclN0YXRlXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29udGFpbmVyT3B0aW9ucyB7XHJcbiAgICBpZDogc3RyaW5nXHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlOiBzdHJpbmdcclxuICAgIGNvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICBpdGVtcz86IFNldDxJdGVtPlxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ29udGFpbmVyIGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICByZWFkb25seSBpdGVtczogU2V0PEl0ZW0+XHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQ29udGFpbmVyT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuaXRlbXMgPSBuZXcgU2V0PEl0ZW0+KFsuLi5vcHRpb25zLml0ZW1zID8/IFtdXSlcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBDb250YWluZXIge1xyXG4gICAgICAgIHJldHVybiBuZXcgQ29udGFpbmVyKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNvbnN0IGxldmVscyA9IFtcclxuICAgIDEwLFxyXG4gICAgMjAsXHJcbiAgICA1MCxcclxuICAgIDEwMCxcclxuICAgIDIwMCxcclxuICAgIDUwMCxcclxuICAgIDEwMDAsXHJcbiAgICAyMDAwLFxyXG4gICAgNTAwMCxcclxuICAgIDEwMDAwXVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cGVyaWVuY2VSZXF1aXJlbWVudChsZXZlbDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGlmIChsZXZlbCA8IDIpIHtcclxuICAgICAgICByZXR1cm4gMFxyXG4gICAgfVxyXG5cclxuICAgIGlmIChsZXZlbCAtIDIgPj0gbGV2ZWxzLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiBJbmZpbml0eVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBsZXZlbHNbbGV2ZWwgLSAyXVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGFibGU8VCBleHRlbmRzIFRoaW5nPiB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBUPigpO1xyXG5cclxuICAgIGluc2VydCh0aGluZzogVCk6IFQge1xyXG4gICAgICAgIGlmICh0aGlzLmhhcyh0aGluZy5pZCkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBdHRlbXB0IHRvIGluc2VydCBkdXBsaWNhdGUgaWQgb2YgJHt0aGluZy5pZH1gKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYXAuc2V0KHRoaW5nLmlkLCB0aGluZylcclxuICAgICAgICByZXR1cm4gdGhpbmdcclxuICAgIH1cclxuXHJcbiAgICBoYXMoaWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1hcC5oYXMoaWQpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0KGlkOiBzdHJpbmcpOiBUIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAuZ2V0KGlkKVxyXG4gICAgfVxyXG5cclxuICAgICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBHZW5lcmF0b3I8VD4ge1xyXG4gICAgICAgIGZvciAoY29uc3QgW18sIHZdIG9mIHRoaXMubWFwKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHZcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUaGluZ0RCIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbWFwID0gbmV3IE1hcDxzdHJpbmcsIFRoaW5nPigpXHJcblxyXG4gICAgaW5zZXJ0PFQgZXh0ZW5kcyBUaGluZz4odGhpbmc6IFQpOiBUIHtcclxuICAgICAgICBpZiAodGhpcy5oYXModGhpbmcuaWQpKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQXR0ZW1wdCB0byBpbnNlcnQgZHVwbGljYXRlIGlkIG9mICR7dGhpbmcuaWR9YClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubWFwLnNldCh0aGluZy5pZCwgdGhpbmcpXHJcbiAgICAgICAgcmV0dXJuIHRoaW5nXHJcbiAgICB9XHJcblxyXG4gICAgaGFzKGlkOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAuaGFzKGlkKVxyXG4gICAgfVxyXG5cclxuICAgIGdldChpZDogc3RyaW5nKTogVGhpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1hcC5nZXQoaWQpXHJcbiAgICB9XHJcblxyXG4gICAgbG9hZChzdGF0ZTogVGhpbmdTYXZlU3RhdGUpOiBUaGluZyB7XHJcbiAgICAgICAgY29uc3QgdGhpbmcgPSB0aGlzLmdldChzdGF0ZS5pZCk/LmNsb25lKClcclxuICAgICAgICBpZiAoIXRoaW5nKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gdGhpbmcgd2l0aCBpZCAke3N0YXRlLmlkfSBmb3VuZCwgY2Fubm90IGxvYWQuYClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghc3RhdGUuZGF0YSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpbmdcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN3aXRjaCAoc3RhdGUuZGF0YS5raW5kKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJQbGF5ZXJcIjpcclxuICAgICAgICAgICAgICAgIGlmICghKHRoaW5nIGluc3RhbmNlb2YgUGxheWVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdGhpbmcgLSBleHBlY3RlZCBwbGF5ZXIuXCIpXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpbmcubG9hZCh0aGlzLCBzdGF0ZS5kYXRhKVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFwiTGlnaHRTb3VyY2VcIjpcclxuICAgICAgICAgICAgICAgIGlmICghKHRoaW5nIGluc3RhbmNlb2YgTGlnaHRTb3VyY2UpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB0aGluZyAtIGV4cGVjdGVkIGxpZ2h0IHNvdXJjZS5cIilcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGluZy5sb2FkKHN0YXRlLmRhdGEpXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGluZ1xyXG4gICAgfVxyXG5cclxuICAgICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBHZW5lcmF0b3I8VGhpbmc+IHtcclxuICAgICAgICBmb3IgKGNvbnN0IFtfLCB2XSBvZiB0aGlzLm1hcCkge1xyXG4gICAgICAgICAgICB5aWVsZCB2XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogYSB3ZWlnaHRlZCBsaXN0IGZyb20gd2hpY2ggYSByYW5kb20gc2VsZWN0aW9uIGNhbiBiZSBkcmF3bi5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBXZWlnaHRlZExpc3Q8VD4ge1xyXG4gICAgLyoqXHJcbiAgICAgKiBjb25zdHJ1Y3RvclxyXG4gICAgICogQHBhcmFtIGRhdGEgbGlzdCBvZiBbaXRlbSwgcmVsYXRpdmUgd2VpZ2h0XSBpdGVtc1xyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGRhdGE6IFtULCBudW1iZXJdW10pIHtcclxuICAgICAgICBjb25zdCB0b3RhbCA9IGRhdGEubWFwKHggPT4geFsxXSkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSwgMClcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGRhdGFbaV1bMV0gLz0gdG90YWxcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZWN0KHJuZzogcmFuZC5STkcpOiBUIHtcclxuICAgICAgICBsZXQgZGlzdCA9IHJuZy5uZXh0KClcclxuICAgICAgICBmb3IgKGNvbnN0IFt4LCB3XSBvZiB0aGlzLmRhdGEpIHtcclxuICAgICAgICAgICAgZGlzdCAtPSB3XHJcbiAgICAgICAgICAgIGlmIChkaXN0IDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB4XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgb3IgZW1wdHkgbGlzdCwgbm8gc2VsZWN0aW9uIG1hZGVcIilcclxuICAgIH1cclxufSJdfQ==