/**
 * rogue-like library
 */
import * as iter from "../shared/iter.js";
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
        if (state.lightSource >= 0) {
            this.equip(this.inventory[state.lightSource]);
        }
        else {
            this.lightSource = null;
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
        return new Container(Object.assign({
            items: new Set(iter.map(this.items, x => x.clone()))
        }, super.clone()));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJybC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUNILE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQixNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFBO0FBVzFCLE1BQU0sT0FBTyxLQUFLO0lBUWQsWUFBWSxPQUFxQjs7UUFGeEIsVUFBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUd0QyxJQUFJLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUE7UUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQTtRQUN0QyxJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUE7UUFDeEIsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFBLE9BQU8sQ0FBQyxLQUFLLG1DQUFJLEVBQUUsQ0FBQTtRQUVoQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUU7WUFDZixJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7U0FDN0I7SUFDTCxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDMUIsQ0FBQztJQUVELElBQUk7UUFDQSxPQUFPO1lBQ0gsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ1gsSUFBSSxFQUFFLElBQUk7U0FDYixDQUFBO0lBQ0wsQ0FBQztDQUNKO0FBa0NELE1BQU0sT0FBTyxJQUFJO0lBQ2IsWUFBcUIs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QyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDM0IsTUFBTSxDQUFDLENBQUE7U0FDVjtJQUNMLENBQUM7Q0FDSjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFlBQVk7SUFDckI7OztPQUdHO0lBQ0gsWUFBNkIsSUFBbUI7UUFBbkIsU0FBSSxHQUFKLElBQUksQ0FBZTtRQUM1QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtZQUNsQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFBO1NBQ3RCO0lBQ0wsQ0FBQztJQUVELE1BQU0sQ0FBQyxHQUFhO1FBQ2hCLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNyQixLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUM1QixJQUFJLElBQUksQ0FBQyxDQUFBO1lBQ1QsSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFFO2dCQUNYLE9BQU8sQ0FBQyxDQUFBO2FBQ1g7U0FDSjtRQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQTBDLENBQUMsQ0FBQTtJQUMvRCxDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogcm9ndWUtbGlrZSBsaWJyYXJ5XHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBpdGVyIGZyb20gXCIuLi9zaGFyZWQvaXRlci5qc1wiXHJcbmltcG9ydCAqIGFzIHJhbmQgZnJvbSBcIi4uL3NoYXJlZC9yYW5kLmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcblxyXG5leHBvcnQgY29uc3QgdGlsZVNpemUgPSAyNFxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUaGluZ09wdGlvbnMge1xyXG4gICAgcmVhZG9ubHkgaWQ6IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgcGFzc2FibGU6IGJvb2xlYW5cclxuICAgIHJlYWRvbmx5IHRyYW5zcGFyZW50OiBib29sZWFuXHJcbiAgICByZWFkb25seSBuYW1lOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGltYWdlPzogc3RyaW5nXHJcbiAgICByZWFkb25seSBjb2xvcj86IGdmeC5Db2xvclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGhpbmcge1xyXG4gICAgcmVhZG9ubHkgaWQ6IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgcGFzc2FibGU6IGJvb2xlYW5cclxuICAgIHJlYWRvbmx5IHRyYW5zcGFyZW50OiBib29sZWFuXHJcbiAgICByZWFkb25seSBuYW1lOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGltYWdlOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGNvbG9yID0gbmV3IGdmeC5Db2xvcigxLCAxLCAxLCAxKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFRoaW5nT3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMuaWQgPSBvcHRpb25zLmlkXHJcbiAgICAgICAgdGhpcy5wYXNzYWJsZSA9IG9wdGlvbnMucGFzc2FibGVcclxuICAgICAgICB0aGlzLnRyYW5zcGFyZW50ID0gb3B0aW9ucy50cmFuc3BhcmVudFxyXG4gICAgICAgIHRoaXMubmFtZSA9IG9wdGlvbnMubmFtZVxyXG4gICAgICAgIHRoaXMuaW1hZ2UgPSBvcHRpb25zLmltYWdlID8/IFwiXCJcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuY29sb3IpIHtcclxuICAgICAgICAgICAgdGhpcy5jb2xvciA9IG9wdGlvbnMuY29sb3JcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogVGhpbmcge1xyXG4gICAgICAgIHJldHVybiBuZXcgVGhpbmcodGhpcylcclxuICAgIH1cclxuXHJcbiAgICBzYXZlKCk6IFRoaW5nU2F2ZVN0YXRlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBpZDogdGhpcy5pZCxcclxuICAgICAgICAgICAgZGF0YTogbnVsbCxcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGhpbmdTYXZlU3RhdGUge1xyXG4gICAgcmVhZG9ubHkgaWQ6IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgZGF0YTogRGF0YVNhdmVTdGF0ZVxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBEYXRhU2F2ZVN0YXRlID0gbnVsbCB8IFBsYXllclNhdmVTdGF0ZSB8IExpZ2h0U291cmNlU2F2ZVN0YXRlIHwgTW9uc3RlclNhdmVTdGF0ZVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQbGF5ZXJTYXZlU3RhdGUge1xyXG4gICAgcmVhZG9ubHkga2luZDogXCJQbGF5ZXJcIlxyXG4gICAgcmVhZG9ubHkgYmFzZVN0cmVuZ3RoOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGJhc2VJbnRlbGxpZ2VuY2U6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYmFzZUFnaWxpdHk6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYmFzZU1heEhlYWx0aDogbnVtYmVyXHJcbiAgICByZWFkb25seSBsZXZlbDogbnVtYmVyXHJcbiAgICByZWFkb25seSBleHBlcmllbmNlOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGhlYWx0aDogbnVtYmVyXHJcbiAgICByZWFkb25seSBtZWxlZVdlYXBvbjogbnVtYmVyXHJcbiAgICByZWFkb25seSByYW5nZWRXZWFwb246IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYXJtb3I6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgaGVsbTogbnVtYmVyXHJcbiAgICByZWFkb25seSBzaGllbGQ6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgcmluZzogbnVtYmVyXHJcbiAgICByZWFkb25seSBsaWdodFNvdXJjZTogbnVtYmVyXHJcbiAgICByZWFkb25seSBpbnZlbnRvcnk6IFRoaW5nU2F2ZVN0YXRlW10sXHJcbiAgICByZWFkb25seSBnb2xkOiBudW1iZXIsXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTGlnaHRTb3VyY2VTYXZlU3RhdGUge1xyXG4gICAgcmVhZG9ubHkga2luZDogXCJMaWdodFNvdXJjZVwiXHJcbiAgICByZWFkb25seSBkdXJhdGlvbjogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBEaWNlIHtcclxuICAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IG1pbjogbnVtYmVyID0gMCwgcmVhZG9ubHkgbWF4OiBudW1iZXIgPSAwKSB7IH1cclxuXHJcbiAgICByb2xsKHJuZzogcmFuZC5STkcpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiByYW5kLmludChybmcsIHRoaXMubWluLCB0aGlzLm1heCArIDEpXHJcbiAgICB9XHJcblxyXG4gICAgYWRkKHg6IG51bWJlcik6IERpY2Uge1xyXG4gICAgICAgIHJldHVybiBuZXcgRGljZSh0aGlzLm1pbiArIHgsIHRoaXMubWF4ICsgeClcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBEaWNlIHtcclxuICAgICAgICByZXR1cm4gbmV3IERpY2UodGhpcy5taW4sIHRoaXMubWF4KVxyXG4gICAgfVxyXG5cclxuICAgIHRvU3RyaW5nKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGAke3RoaXMubWlufSAtICR7dGhpcy5tYXh9YFxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGlsZSBleHRlbmRzIFRoaW5nIHtcclxuICAgIGNsb25lKCk6IFRpbGUge1xyXG4gICAgICAgIHJldHVybiBuZXcgVGlsZSh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgRml4dHVyZU9wdGlvbnMgZXh0ZW5kcyBUaGluZ09wdGlvbnMge1xyXG4gICAgcmVhZG9ubHkgbGlnaHRDb2xvcj86IGdmeC5Db2xvclxyXG4gICAgcmVhZG9ubHkgbGlnaHRSYWRpdXM/OiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEZpeHR1cmUgZXh0ZW5kcyBUaGluZyB7XHJcbiAgICByZWFkb25seSBsaWdodENvbG9yOiBnZnguQ29sb3JcclxuICAgIHJlYWRvbmx5IGxpZ2h0UmFkaXVzOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBGaXh0dXJlT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5saWdodENvbG9yID0gb3B0aW9ucy5saWdodENvbG9yID8/IGdmeC5Db2xvci53aGl0ZS5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy5saWdodFJhZGl1cyA9IG9wdGlvbnMubGlnaHRSYWRpdXMgPz8gMFxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEZpeHR1cmUge1xyXG4gICAgICAgIHJldHVybiBuZXcgRml4dHVyZSh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRG9vciBleHRlbmRzIEZpeHR1cmUge1xyXG4gICAgY2xvbmUoKTogRG9vciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBEb29yKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBlbnVtIEV4aXREaXJlY3Rpb24ge1xyXG4gICAgVXAsXHJcbiAgICBEb3duLFxyXG59XHJcblxyXG5pbnRlcmZhY2UgRXhpdE9wdGlvbnMge1xyXG4gICAgcmVhZG9ubHkgaWQ6IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgbmFtZTogc3RyaW5nXHJcbiAgICByZWFkb25seSBpbWFnZT86IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgY29sb3I/OiBnZnguQ29sb3JcclxuICAgIHJlYWRvbmx5IGRpcmVjdGlvbjogRXhpdERpcmVjdGlvblxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRXhpdCBleHRlbmRzIEZpeHR1cmUge1xyXG4gICAgcmVhZG9ubHkgZGlyZWN0aW9uOiBFeGl0RGlyZWN0aW9uXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogRXhpdE9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihPYmplY3QuYXNzaWduKHsgcGFzc2FibGU6IGZhbHNlLCB0cmFuc3BhcmVudDogZmFsc2UgfSwgb3B0aW9ucykpXHJcbiAgICAgICAgdGhpcy5kaXJlY3Rpb24gPSBvcHRpb25zLmRpcmVjdGlvblxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEV4aXQge1xyXG4gICAgICAgIHJldHVybiBuZXcgRXhpdCh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEl0ZW1PcHRpb25zIHtcclxuICAgIHJlYWRvbmx5IGlkOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IG5hbWU6IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgaW1hZ2U/OiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGNvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICByZWFkb25seSBsZXZlbDogbnVtYmVyXHJcbiAgICByZWFkb25seSBmcmVxPzogbnVtYmVyXHJcbiAgICByZWFkb25seSB2YWx1ZTogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBJdGVtIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgcmVhZG9ubHkgbGV2ZWw6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgZnJlcTogbnVtYmVyXHJcbiAgICByZWFkb25seSB2YWx1ZTogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogSXRlbU9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihPYmplY3QuYXNzaWduKHsgcGFzc2FibGU6IGZhbHNlLCB0cmFuc3BhcmVudDogdHJ1ZSB9LCBvcHRpb25zKSlcclxuXHJcbiAgICAgICAgdGhpcy5sZXZlbCA9IG9wdGlvbnMubGV2ZWxcclxuICAgICAgICB0aGlzLmZyZXEgPSBvcHRpb25zLmZyZXEgPz8gMVxyXG4gICAgICAgIHRoaXMudmFsdWUgPSBvcHRpb25zLnZhbHVlID8/IDFcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBJdGVtIHtcclxuICAgICAgICByZXR1cm4gbmV3IEl0ZW0odGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBXZWFwb25PcHRpb25zIGV4dGVuZHMgSXRlbU9wdGlvbnMge1xyXG4gICAgcmVhZG9ubHkgYXR0YWNrOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHJhbmdlPzogbnVtYmVyXHJcbiAgICByZWFkb25seSB2ZXJiPzogc3RyaW5nXHJcbiAgICByZWFkb25seSBhY3Rpb246IG51bWJlclxyXG4gICAgcmVhZG9ubHkgZGFtYWdlOiBEaWNlXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBXZWFwb24gZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGF0dGFjazogbnVtYmVyXHJcbiAgICByZWFkb25seSBkYW1hZ2U6IERpY2VcclxuICAgIHJlYWRvbmx5IHJhbmdlOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGFjdGlvbjogbnVtYmVyXHJcbiAgICByZWFkb25seSB2ZXJiOiBzdHJpbmdcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBXZWFwb25PcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLmF0dGFjayA9IG9wdGlvbnMuYXR0YWNrXHJcbiAgICAgICAgdGhpcy5kYW1hZ2UgPSBvcHRpb25zLmRhbWFnZS5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy5yYW5nZSA9IG9wdGlvbnMucmFuZ2UgPz8gMVxyXG4gICAgICAgIHRoaXMudmVyYiA9IG9wdGlvbnMudmVyYiA/PyBcIlwiXHJcbiAgICAgICAgdGhpcy5hY3Rpb24gPSBvcHRpb25zLmFjdGlvblxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFdlYXBvbiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBXZWFwb24odGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFJhbmdlZFdlYXBvbiBleHRlbmRzIFdlYXBvbiB7XHJcbiAgICBjbG9uZSgpOiBSYW5nZWRXZWFwb24ge1xyXG4gICAgICAgIHJldHVybiBuZXcgUmFuZ2VkV2VhcG9uKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNZWxlZVdlYXBvbiBleHRlbmRzIFdlYXBvbiB7XHJcbiAgICBjbG9uZSgpOiBXZWFwb24ge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWVsZWVXZWFwb24odGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBcm1vck9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEFybW9yIGV4dGVuZHMgSXRlbSB7XHJcbiAgICByZWFkb25seSBkZWZlbnNlOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBBcm1vck9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMuZGVmZW5zZSA9IG9wdGlvbnMuZGVmZW5zZVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEFybW9yIHtcclxuICAgICAgICByZXR1cm4gbmV3IEFybW9yKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSGVsbU9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEhlbG0gZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGRlZmVuc2U6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEhlbG1PcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLmRlZmVuc2UgPSBvcHRpb25zLmRlZmVuc2VcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBIZWxtIHtcclxuICAgICAgICByZXR1cm4gbmV3IEhlbG0odGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTaGllbGRPcHRpb25zIGV4dGVuZHMgSXRlbU9wdGlvbnMge1xyXG4gICAgZGVmZW5zZTogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTaGllbGQgZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGRlZmVuc2U6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFNoaWVsZE9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMuZGVmZW5zZSA9IG9wdGlvbnMuZGVmZW5zZVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFNoaWVsZCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTaGllbGQodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSaW5nT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIHJlYWRvbmx5IHN0cmVuZ3RoPzogbnVtYmVyXHJcbiAgICByZWFkb25seSBhZ2lsaXR5PzogbnVtYmVyXHJcbiAgICByZWFkb25seSBpbnRlbGxpZ2VuY2U/OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IG1heEhlYWx0aD86IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUmluZyBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgc3RyZW5ndGg6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYWdpbGl0eTogbnVtYmVyXHJcbiAgICByZWFkb25seSBpbnRlbGxpZ2VuY2U6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgbWF4SGVhbHRoOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBSaW5nT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5zdHJlbmd0aCA9IG9wdGlvbnMuc3RyZW5ndGggPz8gMFxyXG4gICAgICAgIHRoaXMuYWdpbGl0eSA9IG9wdGlvbnMuYWdpbGl0eSA/PyAwXHJcbiAgICAgICAgdGhpcy5pbnRlbGxpZ2VuY2UgPSBvcHRpb25zLmludGVsbGlnZW5jZSA/PyAwXHJcbiAgICAgICAgdGhpcy5tYXhIZWFsdGggPSBvcHRpb25zLm1heEhlYWx0aCA/PyAwXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTGlnaHRTb3VyY2VPcHRpb25zIGV4dGVuZHMgSXRlbU9wdGlvbnMge1xyXG4gICAgcmVhZG9ubHkgbGlnaHRSYWRpdXM6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgbGlnaHRDb2xvcj86IGdmeC5Db2xvclxyXG4gICAgcmVhZG9ubHkgZHVyYXRpb246IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTGlnaHRTb3VyY2UgZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGxpZ2h0UmFkaXVzOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGxpZ2h0Q29sb3I6IGdmeC5Db2xvclxyXG4gICAgZHVyYXRpb246IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IExpZ2h0U291cmNlT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5saWdodFJhZGl1cyA9IG9wdGlvbnMubGlnaHRSYWRpdXNcclxuICAgICAgICB0aGlzLmxpZ2h0Q29sb3IgPSBvcHRpb25zLmxpZ2h0Q29sb3IgPz8gZ2Z4LkNvbG9yLndoaXRlXHJcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IG9wdGlvbnMuZHVyYXRpb25cclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBMaWdodFNvdXJjZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBMaWdodFNvdXJjZSh0aGlzKVxyXG4gICAgfVxyXG5cclxuICAgIHNhdmUoKTogVGhpbmdTYXZlU3RhdGUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLmlkLFxyXG4gICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICBraW5kOiBcIkxpZ2h0U291cmNlXCIsXHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogdGhpcy5kdXJhdGlvbixcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBsb2FkKHN0YXRlOiBMaWdodFNvdXJjZVNhdmVTdGF0ZSkge1xyXG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBzdGF0ZS5kdXJhdGlvblxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBFcXVpcHBhYmxlID0gTWVsZWVXZWFwb24gfCBSYW5nZWRXZWFwb24gfCBBcm1vciB8IEhlbG0gfCBTaGllbGQgfCBSaW5nIHwgTGlnaHRTb3VyY2VcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpc0VxdWlwcGFibGUoaXRlbTogSXRlbSk6IGl0ZW0gaXMgRXF1aXBwYWJsZSB7XHJcbiAgICByZXR1cm4gaXRlbSBpbnN0YW5jZW9mIFdlYXBvblxyXG4gICAgICAgIHx8IGl0ZW0gaW5zdGFuY2VvZiBBcm1vclxyXG4gICAgICAgIHx8IGl0ZW0gaW5zdGFuY2VvZiBTaGllbGRcclxuICAgICAgICB8fCBpdGVtIGluc3RhbmNlb2YgUmluZ1xyXG4gICAgICAgIHx8IGl0ZW0gaW5zdGFuY2VvZiBMaWdodFNvdXJjZVxyXG4gICAgICAgIHx8IGl0ZW0gaW5zdGFuY2VvZiBIZWxtXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVXNhYmxlT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIHJlYWRvbmx5IGhlYWx0aDogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBVc2FibGUgZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGhlYWx0aDogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogVXNhYmxlT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiBmYWxzZSB9LCBvcHRpb25zKSlcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IG9wdGlvbnMuaGVhbHRoXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogVXNhYmxlIHtcclxuICAgICAgICByZXR1cm4gbmV3IFVzYWJsZSh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0dXJlT3B0aW9ucyB7XHJcbiAgICByZWFkb25seSBpZDogc3RyaW5nXHJcbiAgICByZWFkb25seSBuYW1lOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGltYWdlOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGNvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICByZWFkb25seSBtYXhIZWFsdGg6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgaGVhbHRoPzogbnVtYmVyXHJcbiAgICByZWFkb25seSBhZ2lsaXR5PzogbnVtYmVyXHJcbiAgICByZWFkb25seSBsZXZlbDogbnVtYmVyLFxyXG4gICAgcmVhZG9ubHkgZ29sZDogbnVtYmVyLFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0dXJlIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgcmVhZG9ubHkgbWF4SGVhbHRoOiBudW1iZXJcclxuICAgIGhlYWx0aDogbnVtYmVyXHJcbiAgICByZWFkb25seSBkZWZlbnNlOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGFnaWxpdHk6IG51bWJlclxyXG4gICAgYWN0aW9uOiBudW1iZXJcclxuICAgIGFjdGlvblJlc2VydmU6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgbGV2ZWw6IG51bWJlcixcclxuICAgIHJlYWRvbmx5IGdvbGQ6IG51bWJlcixcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQbGF5ZXJPcHRpb25zIGV4dGVuZHMgQ3JlYXR1cmVPcHRpb25zIHtcclxuICAgIHJlYWRvbmx5IGV4cGVyaWVuY2U/OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHN0cmVuZ3RoPzogbnVtYmVyXHJcbiAgICByZWFkb25seSBpbnRlbGxpZ2VuY2U/OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICByZWFkb25seSBtZWxlZVdlYXBvbj86IE1lbGVlV2VhcG9uIHwgbnVsbFxyXG4gICAgcmVhZG9ubHkgcmFuZ2VkV2VhcG9uPzogUmFuZ2VkV2VhcG9uIHwgbnVsbFxyXG4gICAgcmVhZG9ubHkgYXJtb3I/OiBBcm1vciB8IG51bGxcclxuICAgIHJlYWRvbmx5IGhlbG0/OiBIZWxtIHwgbnVsbFxyXG4gICAgcmVhZG9ubHkgc2hpZWxkPzogU2hpZWxkIHwgbnVsbFxyXG4gICAgcmVhZG9ubHkgcmluZz86IFJpbmcgfCBudWxsXHJcbiAgICByZWFkb25seSBsaWdodFNvdXJjZT86IExpZ2h0U291cmNlIHwgbnVsbCxcclxuICAgIHJlYWRvbmx5IGludmVudG9yeT86IEl0ZW1bXSxcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFBsYXllciBleHRlbmRzIFRoaW5nIGltcGxlbWVudHMgQ3JlYXR1cmUge1xyXG4gICAgYmFzZVN0cmVuZ3RoOiBudW1iZXJcclxuICAgIGJhc2VJbnRlbGxpZ2VuY2U6IG51bWJlclxyXG4gICAgYmFzZUFnaWxpdHk6IG51bWJlclxyXG4gICAgYmFzZU1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBsZXZlbDogbnVtYmVyXHJcbiAgICBleHBlcmllbmNlOiBudW1iZXJcclxuICAgIGhlYWx0aDogbnVtYmVyXHJcbiAgICBhY3Rpb246IG51bWJlciA9IDBcclxuICAgIGFjdGlvblJlc2VydmU6IG51bWJlciA9IDBcclxuICAgIG1lbGVlV2VhcG9uOiBNZWxlZVdlYXBvbiB8IG51bGxcclxuICAgIHJhbmdlZFdlYXBvbjogUmFuZ2VkV2VhcG9uIHwgbnVsbFxyXG4gICAgYXJtb3I6IEFybW9yIHwgbnVsbFxyXG4gICAgaGVsbTogSGVsbSB8IG51bGxcclxuICAgIHNoaWVsZDogU2hpZWxkIHwgbnVsbFxyXG4gICAgcmluZzogUmluZyB8IG51bGxcclxuICAgIGxpZ2h0U291cmNlOiBMaWdodFNvdXJjZSB8IG51bGxcclxuICAgIGludmVudG9yeTogSXRlbVtdXHJcbiAgICBnb2xkOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBQbGF5ZXJPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IHRydWUgfSwgb3B0aW9ucykpXHJcbiAgICAgICAgdGhpcy5iYXNlU3RyZW5ndGggPSBvcHRpb25zLnN0cmVuZ3RoID8/IDBcclxuICAgICAgICB0aGlzLmJhc2VJbnRlbGxpZ2VuY2UgPSBvcHRpb25zLnN0cmVuZ3RoID8/IDBcclxuICAgICAgICB0aGlzLmJhc2VBZ2lsaXR5ID0gb3B0aW9ucy5hZ2lsaXR5ID8/IDBcclxuICAgICAgICB0aGlzLmJhc2VNYXhIZWFsdGggPSBvcHRpb25zLm1heEhlYWx0aFxyXG4gICAgICAgIHRoaXMubGV2ZWwgPSBvcHRpb25zLmxldmVsID8/IDFcclxuICAgICAgICB0aGlzLmV4cGVyaWVuY2UgPSBvcHRpb25zLmV4cGVyaWVuY2UgPz8gMFxyXG4gICAgICAgIHRoaXMuaGVhbHRoID0gb3B0aW9ucy5oZWFsdGggPz8gdGhpcy5tYXhIZWFsdGhcclxuICAgICAgICB0aGlzLm1lbGVlV2VhcG9uID0gb3B0aW9ucy5tZWxlZVdlYXBvbiA/PyBudWxsXHJcbiAgICAgICAgdGhpcy5yYW5nZWRXZWFwb24gPSBvcHRpb25zLnJhbmdlZFdlYXBvbiA/PyBudWxsXHJcbiAgICAgICAgdGhpcy5oZWxtID0gb3B0aW9ucy5oZWxtID8/IG51bGxcclxuICAgICAgICB0aGlzLmFybW9yID0gb3B0aW9ucy5hcm1vciA/PyBudWxsXHJcbiAgICAgICAgdGhpcy5zaGllbGQgPSBvcHRpb25zLnNoaWVsZCA/PyBudWxsXHJcbiAgICAgICAgdGhpcy5yaW5nID0gb3B0aW9ucy5yaW5nID8/IG51bGxcclxuICAgICAgICB0aGlzLmxpZ2h0U291cmNlID0gb3B0aW9ucy5saWdodFNvdXJjZSA/PyBudWxsXHJcbiAgICAgICAgdGhpcy5pbnZlbnRvcnkgPSBvcHRpb25zLmludmVudG9yeSA/IFsuLi5vcHRpb25zLmludmVudG9yeV0gOiBbXVxyXG4gICAgICAgIHRoaXMuZ29sZCA9IG9wdGlvbnMuZ29sZCA/PyAwXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHN0cmVuZ3RoKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYmFzZVN0cmVuZ3RoICsgKHRoaXMucmluZz8uc3RyZW5ndGggPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgYWdpbGl0eSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJhc2VBZ2lsaXR5ICsgKHRoaXMucmluZz8uYWdpbGl0eSA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBpbnRlbGxpZ2VuY2UoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5iYXNlSW50ZWxsaWdlbmNlICsgKHRoaXMucmluZz8uaW50ZWxsaWdlbmNlID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IG1heEhlYWx0aCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJhc2VNYXhIZWFsdGggKyAodGhpcy5yaW5nPy5tYXhIZWFsdGggPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgbWVsZWVBdHRhY2soKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zdHJlbmd0aCArICh0aGlzLm1lbGVlV2VhcG9uPy5hdHRhY2sgPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgbWVsZWVEYW1hZ2UoKTogRGljZSB7XHJcbiAgICAgICAgcmV0dXJuICh0aGlzLm1lbGVlV2VhcG9uPy5kYW1hZ2UgPz8gbmV3IERpY2UoMSwgMikpLmFkZCh0aGlzLnN0cmVuZ3RoKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCByYW5nZWRBdHRhY2soKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hZ2lsaXR5ICsgKHRoaXMucmFuZ2VkV2VhcG9uPy5hdHRhY2sgPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgcmFuZ2VkRGFtYWdlKCk6IERpY2UgfCBudWxsIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5yYW5nZWRXZWFwb24/LmRhbWFnZT8uYWRkKHRoaXMuYWdpbGl0eSkgPz8gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIGdldCBkZWZlbnNlKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYWdpbGl0eSArICh0aGlzLmFybW9yPy5kZWZlbnNlID8/IDApICsgKHRoaXMuaGVsbT8uZGVmZW5zZSA/PyAwKSArICh0aGlzLnNoaWVsZD8uZGVmZW5zZSA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBsaWdodFJhZGl1cygpOiBudW1iZXIge1xyXG4gICAgICAgIGlmICh0aGlzLmxpZ2h0U291cmNlICYmIHRoaXMubGlnaHRTb3VyY2UuZHVyYXRpb24gPiAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxpZ2h0U291cmNlLmxpZ2h0UmFkaXVzXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gMVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBsaWdodENvbG9yKCk6IGdmeC5Db2xvciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubGlnaHRTb3VyY2U/LmxpZ2h0Q29sb3IgPz8gZ2Z4LkNvbG9yLndoaXRlXHJcbiAgICB9XHJcblxyXG4gICAgaXNFcXVpcHBlZChpdGVtOiBJdGVtKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLmVxdWlwbWVudCgpXS5pbmNsdWRlcyhpdGVtKVxyXG4gICAgfVxyXG5cclxuICAgICplcXVpcG1lbnQoKTogSXRlcmFibGU8SXRlbT4ge1xyXG4gICAgICAgIGlmICh0aGlzLm1lbGVlV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMubWVsZWVXZWFwb25cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnJhbmdlZFdlYXBvbikge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLnJhbmdlZFdlYXBvblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYXJtb3IpIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5hcm1vclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaGVsbSkge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLmhlbG1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnNoaWVsZCkge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLnNoaWVsZFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucmluZykge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLnJpbmdcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmxpZ2h0U291cmNlKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMubGlnaHRTb3VyY2VcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogUGxheWVyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFBsYXllcih0aGlzKVxyXG4gICAgfVxyXG5cclxuICAgIGVxdWlwKGl0ZW06IEl0ZW0pIHtcclxuICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIE1lbGVlV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWVsZWVXZWFwb24gPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgUmFuZ2VkV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmFuZ2VkV2VhcG9uID0gaXRlbVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIEFybW9yKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXJtb3IgPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgU2hpZWxkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hpZWxkID0gaXRlbVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIEhlbG0pIHtcclxuICAgICAgICAgICAgdGhpcy5oZWxtID0gaXRlbVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIFJpbmcpIHtcclxuICAgICAgICAgICAgdGhpcy5yaW5nID0gaXRlbVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIExpZ2h0U291cmNlKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGlnaHRTb3VyY2UgPSBpdGVtXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJlbW92ZShpdGVtOiBJdGVtKSB7XHJcbiAgICAgICAgaWYgKHRoaXMubWVsZWVXZWFwb24gPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5tZWxlZVdlYXBvbiA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnJhbmdlZFdlYXBvbiA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLnJhbmdlZFdlYXBvbiA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmFybW9yID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXJtb3IgPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5oZWxtID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGVsbSA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnNoaWVsZCA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLnNoaWVsZCA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnJpbmcgPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5yaW5nID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMubGlnaHRTb3VyY2UgPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5saWdodFNvdXJjZSA9IG51bGxcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZGVsZXRlKGl0ZW06IEl0ZW0pIHtcclxuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuaW52ZW50b3J5LmluZGV4T2YoaXRlbSk7XHJcbiAgICAgICAgaWYgKGluZGV4ID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5pbnZlbnRvcnkuc3BsaWNlKGluZGV4LCAxKVxyXG4gICAgICAgICAgICB0aGlzLnJlbW92ZShpdGVtKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzYXZlKCk6IFRoaW5nU2F2ZVN0YXRlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBpZDogdGhpcy5pZCxcclxuICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAga2luZDogXCJQbGF5ZXJcIixcclxuICAgICAgICAgICAgICAgIGJhc2VTdHJlbmd0aDogdGhpcy5iYXNlU3RyZW5ndGgsXHJcbiAgICAgICAgICAgICAgICBiYXNlSW50ZWxsaWdlbmNlOiB0aGlzLmJhc2VJbnRlbGxpZ2VuY2UsXHJcbiAgICAgICAgICAgICAgICBiYXNlQWdpbGl0eTogdGhpcy5iYXNlQWdpbGl0eSxcclxuICAgICAgICAgICAgICAgIGJhc2VNYXhIZWFsdGg6IHRoaXMuYmFzZU1heEhlYWx0aCxcclxuICAgICAgICAgICAgICAgIGxldmVsOiB0aGlzLmxldmVsLFxyXG4gICAgICAgICAgICAgICAgZXhwZXJpZW5jZTogdGhpcy5leHBlcmllbmNlLFxyXG4gICAgICAgICAgICAgICAgaGVhbHRoOiB0aGlzLmhlYWx0aCxcclxuICAgICAgICAgICAgICAgIG1lbGVlV2VhcG9uOiB0aGlzLm1lbGVlV2VhcG9uID8gdGhpcy5pbnZlbnRvcnkuaW5kZXhPZih0aGlzLm1lbGVlV2VhcG9uKSA6IC0xLFxyXG4gICAgICAgICAgICAgICAgcmFuZ2VkV2VhcG9uOiB0aGlzLnJhbmdlZFdlYXBvbiA/IHRoaXMuaW52ZW50b3J5LmluZGV4T2YodGhpcy5yYW5nZWRXZWFwb24pIDogLTEsXHJcbiAgICAgICAgICAgICAgICBhcm1vcjogdGhpcy5hcm1vciA/IHRoaXMuaW52ZW50b3J5LmluZGV4T2YodGhpcy5hcm1vcikgOiAtMSxcclxuICAgICAgICAgICAgICAgIGhlbG06IHRoaXMuaGVsbSA/IHRoaXMuaW52ZW50b3J5LmluZGV4T2YodGhpcy5oZWxtKSA6IC0xLFxyXG4gICAgICAgICAgICAgICAgc2hpZWxkOiB0aGlzLnNoaWVsZCA/IHRoaXMuaW52ZW50b3J5LmluZGV4T2YodGhpcy5zaGllbGQpIDogLTEsXHJcbiAgICAgICAgICAgICAgICByaW5nOiB0aGlzLnJpbmcgPyB0aGlzLmludmVudG9yeS5pbmRleE9mKHRoaXMucmluZykgOiAtMSxcclxuICAgICAgICAgICAgICAgIGxpZ2h0U291cmNlOiB0aGlzLmxpZ2h0U291cmNlID8gdGhpcy5pbnZlbnRvcnkuaW5kZXhPZih0aGlzLmxpZ2h0U291cmNlKSA6IC0xLFxyXG4gICAgICAgICAgICAgICAgaW52ZW50b3J5OiB0aGlzLmludmVudG9yeS5tYXAoaSA9PiBpLnNhdmUoKSksXHJcbiAgICAgICAgICAgICAgICBnb2xkOiB0aGlzLmdvbGQsXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZChkYjogVGhpbmdEQiwgc3RhdGU6IFBsYXllclNhdmVTdGF0ZSkge1xyXG4gICAgICAgIHRoaXMuYmFzZVN0cmVuZ3RoID0gc3RhdGUuYmFzZVN0cmVuZ3RoXHJcbiAgICAgICAgdGhpcy5iYXNlSW50ZWxsaWdlbmNlID0gc3RhdGUuYmFzZUludGVsbGlnZW5jZVxyXG4gICAgICAgIHRoaXMuYmFzZUFnaWxpdHkgPSBzdGF0ZS5iYXNlQWdpbGl0eVxyXG4gICAgICAgIHRoaXMuYmFzZU1heEhlYWx0aCA9IHN0YXRlLmJhc2VNYXhIZWFsdGhcclxuICAgICAgICB0aGlzLmxldmVsID0gc3RhdGUubGV2ZWxcclxuICAgICAgICB0aGlzLmV4cGVyaWVuY2UgPSBzdGF0ZS5leHBlcmllbmNlXHJcbiAgICAgICAgdGhpcy5oZWFsdGggPSBzdGF0ZS5oZWFsdGhcclxuXHJcbiAgICAgICAgdGhpcy5pbnZlbnRvcnkgPSBzdGF0ZS5pbnZlbnRvcnkubWFwKGludlN0YXRlID0+IHtcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IGRiLmxvYWQoaW52U3RhdGUpXHJcblxyXG4gICAgICAgICAgICBpZiAoIShpdGVtIGluc3RhbmNlb2YgSXRlbSkpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIm5vbi1pdGVtIGluIGludmVudG9yeSwgbG9hZCBmYWlsZWQuXCIpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBpdGVtXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgaWYgKHN0YXRlLm1lbGVlV2VhcG9uID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lcXVpcCh0aGlzLmludmVudG9yeVtzdGF0ZS5tZWxlZVdlYXBvbl0pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5tZWxlZVdlYXBvbiA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzdGF0ZS5yYW5nZWRXZWFwb24gPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmVxdWlwKHRoaXMuaW52ZW50b3J5W3N0YXRlLnJhbmdlZFdlYXBvbl0pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5yYW5nZWRXZWFwb24gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3RhdGUuaGVsbSA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXF1aXAodGhpcy5pbnZlbnRvcnlbc3RhdGUuaGVsbV0pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5oZWxtID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHN0YXRlLmFybW9yID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lcXVpcCh0aGlzLmludmVudG9yeVtzdGF0ZS5hcm1vcl0pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5hcm1vciA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzdGF0ZS5zaGllbGQgPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmVxdWlwKHRoaXMuaW52ZW50b3J5W3N0YXRlLnNoaWVsZF0pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5zaGllbGQgPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3RhdGUucmluZyA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXF1aXAodGhpcy5pbnZlbnRvcnlbc3RhdGUucmluZ10pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5yaW5nID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHN0YXRlLmxpZ2h0U291cmNlID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lcXVpcCh0aGlzLmludmVudG9yeVtzdGF0ZS5saWdodFNvdXJjZV0pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5saWdodFNvdXJjZSA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZ29sZCA9IHN0YXRlLmdvbGRcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBdHRhY2tPcHRpb25zIHtcclxuICAgIGF0dGFjazogbnVtYmVyXHJcbiAgICBkYW1hZ2U6IERpY2VcclxuICAgIGFjdGlvbjogbnVtYmVyXHJcbiAgICByYW5nZT86IG51bWJlclxyXG4gICAgdmVyYj86IHN0cmluZ1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQXR0YWNrIHtcclxuICAgIGF0dGFjazogbnVtYmVyXHJcbiAgICBkYW1hZ2U6IERpY2VcclxuICAgIGFjdGlvbjogbnVtYmVyXHJcbiAgICByYW5nZTogbnVtYmVyXHJcbiAgICB2ZXJiOiBzdHJpbmdcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBBdHRhY2tPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5hdHRhY2sgPSBvcHRpb25zLmF0dGFjayA/PyAwXHJcbiAgICAgICAgdGhpcy5kYW1hZ2UgPSBvcHRpb25zLmRhbWFnZS5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy5hY3Rpb24gPSBvcHRpb25zLmFjdGlvblxyXG4gICAgICAgIHRoaXMucmFuZ2UgPSBvcHRpb25zLnJhbmdlID8/IDFcclxuICAgICAgICB0aGlzLnZlcmIgPSBvcHRpb25zLnZlcmIgPz8gXCJcIlxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEF0dGFjayB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBdHRhY2sodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGVudW0gTW9uc3RlclN0YXRlIHtcclxuICAgIGlkbGUsXHJcbiAgICBhZ2dyb1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1vbnN0ZXJPcHRpb25zIGV4dGVuZHMgQ3JlYXR1cmVPcHRpb25zIHtcclxuICAgIGRlZmVuc2U6IG51bWJlclxyXG4gICAgZXhwZXJpZW5jZTogbnVtYmVyLFxyXG4gICAgYXR0YWNrczogQXR0YWNrW11cclxuICAgIGZyZXE/OiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1vbnN0ZXIgZXh0ZW5kcyBUaGluZyBpbXBsZW1lbnRzIENyZWF0dXJlIHtcclxuICAgIHJlYWRvbmx5IGFnaWxpdHk6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgZGVmZW5zZTogbnVtYmVyXHJcbiAgICByZWFkb25seSBtYXhIZWFsdGg6IG51bWJlclxyXG4gICAgaGVhbHRoOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGV4cGVyaWVuY2U6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYXR0YWNrczogQXR0YWNrW10gPSBbXVxyXG4gICAgc3RhdGU6IE1vbnN0ZXJTdGF0ZSA9IE1vbnN0ZXJTdGF0ZS5pZGxlXHJcbiAgICBhY3Rpb246IG51bWJlciA9IDBcclxuICAgIGFjdGlvblJlc2VydmU6IG51bWJlciA9IDBcclxuICAgIHJlYWRvbmx5IGxldmVsOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGZyZXE6IG51bWJlciA9IDFcclxuICAgIHJlYWRvbmx5IGdvbGQ6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IE1vbnN0ZXJPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IHRydWUgfSwgb3B0aW9ucykpXHJcbiAgICAgICAgdGhpcy5hZ2lsaXR5ID0gb3B0aW9ucy5hZ2lsaXR5ID8/IDBcclxuICAgICAgICB0aGlzLmRlZmVuc2UgPSBvcHRpb25zLmRlZmVuc2UgPz8gMFxyXG4gICAgICAgIHRoaXMubWF4SGVhbHRoID0gb3B0aW9ucy5tYXhIZWFsdGhcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IG9wdGlvbnMuaGVhbHRoID8/IHRoaXMubWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5leHBlcmllbmNlID0gb3B0aW9ucy5leHBlcmllbmNlXHJcbiAgICAgICAgdGhpcy5hdHRhY2tzID0gWy4uLm9wdGlvbnMuYXR0YWNrc11cclxuICAgICAgICB0aGlzLmxldmVsID0gb3B0aW9ucy5sZXZlbFxyXG4gICAgICAgIHRoaXMuZnJlcSA9IG9wdGlvbnMuZnJlcSA/PyAxXHJcbiAgICAgICAgdGhpcy5nb2xkID0gb3B0aW9ucy5nb2xkID8/IDBcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYXR0YWNrcy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGF0dGFja3MgZGVmaW5lZCBmb3IgbW9uc3RlciAke3RoaXMubmFtZX1gKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBNb25zdGVyIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1vbnN0ZXIodGhpcylcclxuICAgIH1cclxuXHJcbiAgICBzYXZlKCk6IFRoaW5nU2F2ZVN0YXRlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBpZDogdGhpcy5pZCxcclxuICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAga2luZDogXCJNb25zdGVyXCIsXHJcbiAgICAgICAgICAgICAgICBoZWFsdGg6IHRoaXMuaGVhbHRoLFxyXG4gICAgICAgICAgICAgICAgYWN0aW9uOiB0aGlzLmFjdGlvbixcclxuICAgICAgICAgICAgICAgIGFjdGlvblJlc2VydmU6IHRoaXMuYWN0aW9uUmVzZXJ2ZSxcclxuICAgICAgICAgICAgICAgIHN0YXRlOiB0aGlzLnN0YXRlLFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxvYWQoc3RhdGU6IE1vbnN0ZXJTYXZlU3RhdGUpIHtcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IHN0YXRlLmhlYWx0aFxyXG4gICAgICAgIHRoaXMuYWN0aW9uID0gc3RhdGUuYWN0aW9uXHJcbiAgICAgICAgdGhpcy5hY3Rpb25SZXNlcnZlID0gc3RhdGUuYWN0aW9uUmVzZXJ2ZVxyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZS5zdGF0ZVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1vbnN0ZXJTYXZlU3RhdGUge1xyXG4gICAgcmVhZG9ubHkga2luZDogXCJNb25zdGVyXCJcclxuICAgIHJlYWRvbmx5IGhlYWx0aDogbnVtYmVyXHJcbiAgICByZWFkb25seSBhY3Rpb246IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYWN0aW9uUmVzZXJ2ZTogbnVtYmVyXHJcbiAgICByZWFkb25seSBzdGF0ZTogTW9uc3RlclN0YXRlXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29udGFpbmVyT3B0aW9ucyB7XHJcbiAgICBpZDogc3RyaW5nXHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlOiBzdHJpbmdcclxuICAgIGNvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICBpdGVtcz86IFNldDxJdGVtPlxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ29udGFpbmVyIGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICByZWFkb25seSBpdGVtczogU2V0PEl0ZW0+XHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQ29udGFpbmVyT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuaXRlbXMgPSBuZXcgU2V0PEl0ZW0+KFsuLi5vcHRpb25zLml0ZW1zID8/IFtdXSlcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBDb250YWluZXIge1xyXG4gICAgICAgIHJldHVybiBuZXcgQ29udGFpbmVyKE9iamVjdC5hc3NpZ24oe1xyXG4gICAgICAgICAgICBpdGVtczogbmV3IFNldChpdGVyLm1hcCh0aGlzLml0ZW1zLCB4ID0+IHguY2xvbmUoKSkpXHJcbiAgICAgICAgfSwgc3VwZXIuY2xvbmUoKSkpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNvbnN0IGxldmVscyA9IFtcclxuICAgIDEwLFxyXG4gICAgMjAsXHJcbiAgICA1MCxcclxuICAgIDEwMCxcclxuICAgIDIwMCxcclxuICAgIDUwMCxcclxuICAgIDEwMDAsXHJcbiAgICAyMDAwLFxyXG4gICAgNTAwMCxcclxuICAgIDEwMDAwXVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cGVyaWVuY2VSZXF1aXJlbWVudChsZXZlbDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGlmIChsZXZlbCA8IDIpIHtcclxuICAgICAgICByZXR1cm4gMFxyXG4gICAgfVxyXG5cclxuICAgIGlmIChsZXZlbCAtIDIgPj0gbGV2ZWxzLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiBJbmZpbml0eVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBsZXZlbHNbbGV2ZWwgLSAyXVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGFibGU8VCBleHRlbmRzIFRoaW5nPiB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBUPigpO1xyXG5cclxuICAgIGluc2VydCh0aGluZzogVCk6IFQge1xyXG4gICAgICAgIGlmICh0aGlzLmhhcyh0aGluZy5pZCkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBdHRlbXB0IHRvIGluc2VydCBkdXBsaWNhdGUgaWQgb2YgJHt0aGluZy5pZH1gKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYXAuc2V0KHRoaW5nLmlkLCB0aGluZylcclxuICAgICAgICByZXR1cm4gdGhpbmdcclxuICAgIH1cclxuXHJcbiAgICBoYXMoaWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1hcC5oYXMoaWQpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0KGlkOiBzdHJpbmcpOiBUIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAuZ2V0KGlkKVxyXG4gICAgfVxyXG5cclxuICAgICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBHZW5lcmF0b3I8VD4ge1xyXG4gICAgICAgIGZvciAoY29uc3QgW18sIHZdIG9mIHRoaXMubWFwKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHZcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUaGluZ0RCIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbWFwID0gbmV3IE1hcDxzdHJpbmcsIFRoaW5nPigpXHJcblxyXG4gICAgaW5zZXJ0PFQgZXh0ZW5kcyBUaGluZz4odGhpbmc6IFQpOiBUIHtcclxuICAgICAgICBpZiAodGhpcy5oYXModGhpbmcuaWQpKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQXR0ZW1wdCB0byBpbnNlcnQgZHVwbGljYXRlIGlkIG9mICR7dGhpbmcuaWR9YClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubWFwLnNldCh0aGluZy5pZCwgdGhpbmcpXHJcbiAgICAgICAgcmV0dXJuIHRoaW5nXHJcbiAgICB9XHJcblxyXG4gICAgaGFzKGlkOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAuaGFzKGlkKVxyXG4gICAgfVxyXG5cclxuICAgIGdldChpZDogc3RyaW5nKTogVGhpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1hcC5nZXQoaWQpXHJcbiAgICB9XHJcblxyXG4gICAgbG9hZChzdGF0ZTogVGhpbmdTYXZlU3RhdGUpOiBUaGluZyB7XHJcbiAgICAgICAgY29uc3QgdGhpbmcgPSB0aGlzLmdldChzdGF0ZS5pZCk/LmNsb25lKClcclxuICAgICAgICBpZiAoIXRoaW5nKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gdGhpbmcgd2l0aCBpZCAke3N0YXRlLmlkfSBmb3VuZCwgY2Fubm90IGxvYWQuYClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghc3RhdGUuZGF0YSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpbmdcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN3aXRjaCAoc3RhdGUuZGF0YS5raW5kKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJQbGF5ZXJcIjpcclxuICAgICAgICAgICAgICAgIGlmICghKHRoaW5nIGluc3RhbmNlb2YgUGxheWVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdGhpbmcgLSBleHBlY3RlZCBwbGF5ZXIuXCIpXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpbmcubG9hZCh0aGlzLCBzdGF0ZS5kYXRhKVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFwiTGlnaHRTb3VyY2VcIjpcclxuICAgICAgICAgICAgICAgIGlmICghKHRoaW5nIGluc3RhbmNlb2YgTGlnaHRTb3VyY2UpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB0aGluZyAtIGV4cGVjdGVkIGxpZ2h0IHNvdXJjZS5cIilcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGluZy5sb2FkKHN0YXRlLmRhdGEpXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGluZ1xyXG4gICAgfVxyXG5cclxuICAgICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBHZW5lcmF0b3I8VGhpbmc+IHtcclxuICAgICAgICBmb3IgKGNvbnN0IFtfLCB2XSBvZiB0aGlzLm1hcCkge1xyXG4gICAgICAgICAgICB5aWVsZCB2XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogYSB3ZWlnaHRlZCBsaXN0IGZyb20gd2hpY2ggYSByYW5kb20gc2VsZWN0aW9uIGNhbiBiZSBkcmF3bi5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBXZWlnaHRlZExpc3Q8VD4ge1xyXG4gICAgLyoqXHJcbiAgICAgKiBjb25zdHJ1Y3RvclxyXG4gICAgICogQHBhcmFtIGRhdGEgbGlzdCBvZiBbaXRlbSwgcmVsYXRpdmUgd2VpZ2h0XSBpdGVtc1xyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGRhdGE6IFtULCBudW1iZXJdW10pIHtcclxuICAgICAgICBjb25zdCB0b3RhbCA9IGRhdGEubWFwKHggPT4geFsxXSkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSwgMClcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGRhdGFbaV1bMV0gLz0gdG90YWxcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZWN0KHJuZzogcmFuZC5STkcpOiBUIHtcclxuICAgICAgICBsZXQgZGlzdCA9IHJuZy5uZXh0KClcclxuICAgICAgICBmb3IgKGNvbnN0IFt4LCB3XSBvZiB0aGlzLmRhdGEpIHtcclxuICAgICAgICAgICAgZGlzdCAtPSB3XHJcbiAgICAgICAgICAgIGlmIChkaXN0IDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB4XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgb3IgZW1wdHkgbGlzdCwgbm8gc2VsZWN0aW9uIG1hZGVcIilcclxuICAgIH1cclxufSJdfQ==