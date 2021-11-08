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
        this.items = [...(_a = options.items) !== null && _a !== void 0 ? _a : []];
    }
    clone() {
        return new Container(Object.assign({
            items: [...iter.map(this.items, x => x.clone())]
        }, super.clone()));
    }
    save() {
        return {
            id: this.id,
            data: {
                kind: "Container",
                items: this.items.map(i => i.save()),
            }
        };
    }
    load(db, state) {
        this.items = state.items.map(itemState => {
            const item = db.load(itemState);
            if (!(item instanceof Item)) {
                throw new Error("non-item in container, load failed.");
            }
            return item;
        });
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
            case "Container":
                if (!(thing instanceof Container)) {
                    throw new Error("Invalid thing - expected container.");
                }
                thing.load(this, state.data);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJybC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUNILE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQixNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFBO0FBVzFCLE1BQU0sT0FBTyxLQUFLO0lBUWQsWUFBWSxPQUFxQjs7UUFGeEIsVUFBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUd0QyxJQUFJLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUE7UUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQTtRQUN0QyxJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUE7UUFDeEIsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFBLE9BQU8sQ0FBQyxLQUFLLG1DQUFJLEVBQUUsQ0FBQTtRQUVoQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUU7WUFDZixJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7U0FDN0I7SUFDTCxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDMUIsQ0FBQztJQUVELElBQUk7UUFDQSxPQUFPO1lBQ0gsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ1gsSUFBSSxFQUFFLElBQUk7U0FDYixDQUFBO0lBQ0wsQ0FBQztDQUNKO0FBdUNELE1BQU0sT0FBTyxJQUFJO0lBQ2IsWUFBcUIs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QUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQ2xDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUE7U0FDdEI7SUFDTCxDQUFDO0lBRUQsTUFBTSxDQUFDLEdBQWE7UUFDaEIsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3JCLEtBQUssTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQzVCLElBQUksSUFBSSxDQUFDLENBQUE7WUFDVCxJQUFJLElBQUksSUFBSSxDQUFDLEVBQUU7Z0JBQ1gsT0FBTyxDQUFDLENBQUE7YUFDWDtTQUNKO1FBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFBO0lBQy9ELENBQUM7Q0FDSiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiByb2d1ZS1saWtlIGxpYnJhcnlcclxuICovXHJcbmltcG9ydCAqIGFzIGl0ZXIgZnJvbSBcIi4uL3NoYXJlZC9pdGVyLmpzXCJcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuXHJcbmV4cG9ydCBjb25zdCB0aWxlU2l6ZSA9IDI0XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRoaW5nT3B0aW9ucyB7XHJcbiAgICByZWFkb25seSBpZDogc3RyaW5nXHJcbiAgICByZWFkb25seSBwYXNzYWJsZTogYm9vbGVhblxyXG4gICAgcmVhZG9ubHkgdHJhbnNwYXJlbnQ6IGJvb2xlYW5cclxuICAgIHJlYWRvbmx5IG5hbWU6IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgaW1hZ2U/OiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGNvbG9yPzogZ2Z4LkNvbG9yXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUaGluZyB7XHJcbiAgICByZWFkb25seSBpZDogc3RyaW5nXHJcbiAgICByZWFkb25seSBwYXNzYWJsZTogYm9vbGVhblxyXG4gICAgcmVhZG9ubHkgdHJhbnNwYXJlbnQ6IGJvb2xlYW5cclxuICAgIHJlYWRvbmx5IG5hbWU6IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgaW1hZ2U6IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgY29sb3IgPSBuZXcgZ2Z4LkNvbG9yKDEsIDEsIDEsIDEpXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogVGhpbmdPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5pZCA9IG9wdGlvbnMuaWRcclxuICAgICAgICB0aGlzLnBhc3NhYmxlID0gb3B0aW9ucy5wYXNzYWJsZVxyXG4gICAgICAgIHRoaXMudHJhbnNwYXJlbnQgPSBvcHRpb25zLnRyYW5zcGFyZW50XHJcbiAgICAgICAgdGhpcy5uYW1lID0gb3B0aW9ucy5uYW1lXHJcbiAgICAgICAgdGhpcy5pbWFnZSA9IG9wdGlvbnMuaW1hZ2UgPz8gXCJcIlxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5jb2xvcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvbG9yID0gb3B0aW9ucy5jb2xvclxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBUaGluZyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBUaGluZyh0aGlzKVxyXG4gICAgfVxyXG5cclxuICAgIHNhdmUoKTogVGhpbmdTYXZlU3RhdGUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLmlkLFxyXG4gICAgICAgICAgICBkYXRhOiBudWxsLFxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUaGluZ1NhdmVTdGF0ZSB7XHJcbiAgICByZWFkb25seSBpZDogc3RyaW5nXHJcbiAgICByZWFkb25seSBkYXRhOiBEYXRhU2F2ZVN0YXRlXHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIERhdGFTYXZlU3RhdGUgPSBudWxsIHwgUGxheWVyU2F2ZVN0YXRlIHwgTGlnaHRTb3VyY2VTYXZlU3RhdGUgfCBNb25zdGVyU2F2ZVN0YXRlIHwgQ29udGFpbmVyU2F2ZVN0YXRlXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBsYXllclNhdmVTdGF0ZSB7XHJcbiAgICByZWFkb25seSBraW5kOiBcIlBsYXllclwiXHJcbiAgICByZWFkb25seSBiYXNlU3RyZW5ndGg6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYmFzZUludGVsbGlnZW5jZTogbnVtYmVyXHJcbiAgICByZWFkb25seSBiYXNlQWdpbGl0eTogbnVtYmVyXHJcbiAgICByZWFkb25seSBiYXNlTWF4SGVhbHRoOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGxldmVsOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGV4cGVyaWVuY2U6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgaGVhbHRoOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IG1lbGVlV2VhcG9uOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHJhbmdlZFdlYXBvbjogbnVtYmVyXHJcbiAgICByZWFkb25seSBhcm1vcjogbnVtYmVyXHJcbiAgICByZWFkb25seSBoZWxtOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHNoaWVsZDogbnVtYmVyXHJcbiAgICByZWFkb25seSByaW5nOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGxpZ2h0U291cmNlOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGludmVudG9yeTogVGhpbmdTYXZlU3RhdGVbXSxcclxuICAgIHJlYWRvbmx5IGdvbGQ6IG51bWJlcixcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBMaWdodFNvdXJjZVNhdmVTdGF0ZSB7XHJcbiAgICByZWFkb25seSBraW5kOiBcIkxpZ2h0U291cmNlXCJcclxuICAgIHJlYWRvbmx5IGR1cmF0aW9uOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb250YWluZXJTYXZlU3RhdGUge1xyXG4gICAgcmVhZG9ubHkga2luZDogXCJDb250YWluZXJcIlxyXG4gICAgcmVhZG9ubHkgaXRlbXM6IFRoaW5nU2F2ZVN0YXRlW11cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIERpY2Uge1xyXG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgbWluOiBudW1iZXIgPSAwLCByZWFkb25seSBtYXg6IG51bWJlciA9IDApIHsgfVxyXG5cclxuICAgIHJvbGwocm5nOiByYW5kLlJORyk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHJhbmQuaW50KHJuZywgdGhpcy5taW4sIHRoaXMubWF4ICsgMSlcclxuICAgIH1cclxuXHJcbiAgICBhZGQoeDogbnVtYmVyKTogRGljZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBEaWNlKHRoaXMubWluICsgeCwgdGhpcy5tYXggKyB4KVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IERpY2Uge1xyXG4gICAgICAgIHJldHVybiBuZXcgRGljZSh0aGlzLm1pbiwgdGhpcy5tYXgpXHJcbiAgICB9XHJcblxyXG4gICAgdG9TdHJpbmcoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gYCR7dGhpcy5taW59IC0gJHt0aGlzLm1heH1gXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUaWxlIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgY2xvbmUoKTogVGlsZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBUaWxlKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSBGaXh0dXJlT3B0aW9ucyBleHRlbmRzIFRoaW5nT3B0aW9ucyB7XHJcbiAgICByZWFkb25seSBsaWdodENvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICByZWFkb25seSBsaWdodFJhZGl1cz86IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRml4dHVyZSBleHRlbmRzIFRoaW5nIHtcclxuICAgIHJlYWRvbmx5IGxpZ2h0Q29sb3I6IGdmeC5Db2xvclxyXG4gICAgcmVhZG9ubHkgbGlnaHRSYWRpdXM6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEZpeHR1cmVPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLmxpZ2h0Q29sb3IgPSBvcHRpb25zLmxpZ2h0Q29sb3IgPz8gZ2Z4LkNvbG9yLndoaXRlLmNsb25lKClcclxuICAgICAgICB0aGlzLmxpZ2h0UmFkaXVzID0gb3B0aW9ucy5saWdodFJhZGl1cyA/PyAwXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogRml4dHVyZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBGaXh0dXJlKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBEb29yIGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICBjbG9uZSgpOiBEb29yIHtcclxuICAgICAgICByZXR1cm4gbmV3IERvb3IodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGVudW0gRXhpdERpcmVjdGlvbiB7XHJcbiAgICBVcCxcclxuICAgIERvd24sXHJcbn1cclxuXHJcbmludGVyZmFjZSBFeGl0T3B0aW9ucyB7XHJcbiAgICByZWFkb25seSBpZDogc3RyaW5nXHJcbiAgICByZWFkb25seSBuYW1lOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGltYWdlPzogc3RyaW5nXHJcbiAgICByZWFkb25seSBjb2xvcj86IGdmeC5Db2xvclxyXG4gICAgcmVhZG9ubHkgZGlyZWN0aW9uOiBFeGl0RGlyZWN0aW9uXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBFeGl0IGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICByZWFkb25seSBkaXJlY3Rpb246IEV4aXREaXJlY3Rpb25cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBFeGl0T3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiBmYWxzZSB9LCBvcHRpb25zKSlcclxuICAgICAgICB0aGlzLmRpcmVjdGlvbiA9IG9wdGlvbnMuZGlyZWN0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogRXhpdCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBFeGl0KHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSXRlbU9wdGlvbnMge1xyXG4gICAgcmVhZG9ubHkgaWQ6IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgbmFtZTogc3RyaW5nXHJcbiAgICByZWFkb25seSBpbWFnZT86IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgY29sb3I/OiBnZnguQ29sb3JcclxuICAgIHJlYWRvbmx5IGxldmVsOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGZyZXE/OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHZhbHVlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEl0ZW0gZXh0ZW5kcyBUaGluZyB7XHJcbiAgICByZWFkb25seSBsZXZlbDogbnVtYmVyXHJcbiAgICByZWFkb25seSBmcmVxOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHZhbHVlOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBJdGVtT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG5cclxuICAgICAgICB0aGlzLmxldmVsID0gb3B0aW9ucy5sZXZlbFxyXG4gICAgICAgIHRoaXMuZnJlcSA9IG9wdGlvbnMuZnJlcSA/PyAxXHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IG9wdGlvbnMudmFsdWUgPz8gMVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEl0ZW0ge1xyXG4gICAgICAgIHJldHVybiBuZXcgSXRlbSh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFdlYXBvbk9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICByZWFkb25seSBhdHRhY2s6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgcmFuZ2U/OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHZlcmI/OiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGFjdGlvbjogbnVtYmVyXHJcbiAgICByZWFkb25seSBkYW1hZ2U6IERpY2VcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFdlYXBvbiBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgYXR0YWNrOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGRhbWFnZTogRGljZVxyXG4gICAgcmVhZG9ubHkgcmFuZ2U6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYWN0aW9uOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHZlcmI6IHN0cmluZ1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFdlYXBvbk9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMuYXR0YWNrID0gb3B0aW9ucy5hdHRhY2tcclxuICAgICAgICB0aGlzLmRhbWFnZSA9IG9wdGlvbnMuZGFtYWdlLmNsb25lKClcclxuICAgICAgICB0aGlzLnJhbmdlID0gb3B0aW9ucy5yYW5nZSA/PyAxXHJcbiAgICAgICAgdGhpcy52ZXJiID0gb3B0aW9ucy52ZXJiID8/IFwiXCJcclxuICAgICAgICB0aGlzLmFjdGlvbiA9IG9wdGlvbnMuYWN0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogV2VhcG9uIHtcclxuICAgICAgICByZXR1cm4gbmV3IFdlYXBvbih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUmFuZ2VkV2VhcG9uIGV4dGVuZHMgV2VhcG9uIHtcclxuICAgIGNsb25lKCk6IFJhbmdlZFdlYXBvbiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBSYW5nZWRXZWFwb24odGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1lbGVlV2VhcG9uIGV4dGVuZHMgV2VhcG9uIHtcclxuICAgIGNsb25lKCk6IFdlYXBvbiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNZWxlZVdlYXBvbih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFybW9yT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIGRlZmVuc2U6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQXJtb3IgZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGRlZmVuc2U6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEFybW9yT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlID0gb3B0aW9ucy5kZWZlbnNlXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogQXJtb3Ige1xyXG4gICAgICAgIHJldHVybiBuZXcgQXJtb3IodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBIZWxtT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIGRlZmVuc2U6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgSGVsbSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgZGVmZW5zZTogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogSGVsbU9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMuZGVmZW5zZSA9IG9wdGlvbnMuZGVmZW5zZVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEhlbG0ge1xyXG4gICAgICAgIHJldHVybiBuZXcgSGVsbSh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNoaWVsZE9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNoaWVsZCBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgZGVmZW5zZTogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogU2hpZWxkT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlID0gb3B0aW9ucy5kZWZlbnNlXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogU2hpZWxkIHtcclxuICAgICAgICByZXR1cm4gbmV3IFNoaWVsZCh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJpbmdPcHRpb25zIGV4dGVuZHMgSXRlbU9wdGlvbnMge1xyXG4gICAgcmVhZG9ubHkgc3RyZW5ndGg/OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGFnaWxpdHk/OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGludGVsbGlnZW5jZT86IG51bWJlclxyXG4gICAgcmVhZG9ubHkgbWF4SGVhbHRoPzogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBSaW5nIGV4dGVuZHMgSXRlbSB7XHJcbiAgICByZWFkb25seSBzdHJlbmd0aDogbnVtYmVyXHJcbiAgICByZWFkb25seSBhZ2lsaXR5OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGludGVsbGlnZW5jZTogbnVtYmVyXHJcbiAgICByZWFkb25seSBtYXhIZWFsdGg6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFJpbmdPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLnN0cmVuZ3RoID0gb3B0aW9ucy5zdHJlbmd0aCA/PyAwXHJcbiAgICAgICAgdGhpcy5hZ2lsaXR5ID0gb3B0aW9ucy5hZ2lsaXR5ID8/IDBcclxuICAgICAgICB0aGlzLmludGVsbGlnZW5jZSA9IG9wdGlvbnMuaW50ZWxsaWdlbmNlID8/IDBcclxuICAgICAgICB0aGlzLm1heEhlYWx0aCA9IG9wdGlvbnMubWF4SGVhbHRoID8/IDBcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBMaWdodFNvdXJjZU9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICByZWFkb25seSBsaWdodFJhZGl1czogbnVtYmVyXHJcbiAgICByZWFkb25seSBsaWdodENvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICByZWFkb25seSBkdXJhdGlvbjogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBMaWdodFNvdXJjZSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgbGlnaHRSYWRpdXM6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgbGlnaHRDb2xvcjogZ2Z4LkNvbG9yXHJcbiAgICBkdXJhdGlvbjogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogTGlnaHRTb3VyY2VPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLmxpZ2h0UmFkaXVzID0gb3B0aW9ucy5saWdodFJhZGl1c1xyXG4gICAgICAgIHRoaXMubGlnaHRDb2xvciA9IG9wdGlvbnMubGlnaHRDb2xvciA/PyBnZnguQ29sb3Iud2hpdGVcclxuICAgICAgICB0aGlzLmR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvblxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IExpZ2h0U291cmNlIHtcclxuICAgICAgICByZXR1cm4gbmV3IExpZ2h0U291cmNlKHRoaXMpXHJcbiAgICB9XHJcblxyXG4gICAgc2F2ZSgpOiBUaGluZ1NhdmVTdGF0ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMuaWQsXHJcbiAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgIGtpbmQ6IFwiTGlnaHRTb3VyY2VcIixcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiB0aGlzLmR1cmF0aW9uLFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxvYWQoc3RhdGU6IExpZ2h0U291cmNlU2F2ZVN0YXRlKSB7XHJcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IHN0YXRlLmR1cmF0aW9uXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIEVxdWlwcGFibGUgPSBNZWxlZVdlYXBvbiB8IFJhbmdlZFdlYXBvbiB8IEFybW9yIHwgSGVsbSB8IFNoaWVsZCB8IFJpbmcgfCBMaWdodFNvdXJjZVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGlzRXF1aXBwYWJsZShpdGVtOiBJdGVtKTogaXRlbSBpcyBFcXVpcHBhYmxlIHtcclxuICAgIHJldHVybiBpdGVtIGluc3RhbmNlb2YgV2VhcG9uXHJcbiAgICAgICAgfHwgaXRlbSBpbnN0YW5jZW9mIEFybW9yXHJcbiAgICAgICAgfHwgaXRlbSBpbnN0YW5jZW9mIFNoaWVsZFxyXG4gICAgICAgIHx8IGl0ZW0gaW5zdGFuY2VvZiBSaW5nXHJcbiAgICAgICAgfHwgaXRlbSBpbnN0YW5jZW9mIExpZ2h0U291cmNlXHJcbiAgICAgICAgfHwgaXRlbSBpbnN0YW5jZW9mIEhlbG1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBVc2FibGVPcHRpb25zIGV4dGVuZHMgSXRlbU9wdGlvbnMge1xyXG4gICAgcmVhZG9ubHkgaGVhbHRoOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFVzYWJsZSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgaGVhbHRoOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBVc2FibGVPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IGZhbHNlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuaGVhbHRoID0gb3B0aW9ucy5oZWFsdGhcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBVc2FibGUge1xyXG4gICAgICAgIHJldHVybiBuZXcgVXNhYmxlKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXR1cmVPcHRpb25zIHtcclxuICAgIHJlYWRvbmx5IGlkOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IG5hbWU6IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgaW1hZ2U6IHN0cmluZ1xyXG4gICAgcmVhZG9ubHkgY29sb3I/OiBnZnguQ29sb3JcclxuICAgIHJlYWRvbmx5IG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICByZWFkb25seSBoZWFsdGg/OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGFnaWxpdHk/OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGxldmVsOiBudW1iZXIsXHJcbiAgICByZWFkb25seSBnb2xkOiBudW1iZXIsXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXR1cmUgZXh0ZW5kcyBUaGluZyB7XHJcbiAgICByZWFkb25seSBtYXhIZWFsdGg6IG51bWJlclxyXG4gICAgaGVhbHRoOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGRlZmVuc2U6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYWdpbGl0eTogbnVtYmVyXHJcbiAgICBhY3Rpb246IG51bWJlclxyXG4gICAgYWN0aW9uUmVzZXJ2ZTogbnVtYmVyXHJcbiAgICByZWFkb25seSBsZXZlbDogbnVtYmVyLFxyXG4gICAgcmVhZG9ubHkgZ29sZDogbnVtYmVyLFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBsYXllck9wdGlvbnMgZXh0ZW5kcyBDcmVhdHVyZU9wdGlvbnMge1xyXG4gICAgcmVhZG9ubHkgZXhwZXJpZW5jZT86IG51bWJlclxyXG4gICAgcmVhZG9ubHkgc3RyZW5ndGg/OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGludGVsbGlnZW5jZT86IG51bWJlclxyXG4gICAgcmVhZG9ubHkgbWF4SGVhbHRoOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IG1lbGVlV2VhcG9uPzogTWVsZWVXZWFwb24gfCBudWxsXHJcbiAgICByZWFkb25seSByYW5nZWRXZWFwb24/OiBSYW5nZWRXZWFwb24gfCBudWxsXHJcbiAgICByZWFkb25seSBhcm1vcj86IEFybW9yIHwgbnVsbFxyXG4gICAgcmVhZG9ubHkgaGVsbT86IEhlbG0gfCBudWxsXHJcbiAgICByZWFkb25seSBzaGllbGQ/OiBTaGllbGQgfCBudWxsXHJcbiAgICByZWFkb25seSByaW5nPzogUmluZyB8IG51bGxcclxuICAgIHJlYWRvbmx5IGxpZ2h0U291cmNlPzogTGlnaHRTb3VyY2UgfCBudWxsLFxyXG4gICAgcmVhZG9ubHkgaW52ZW50b3J5PzogSXRlbVtdLFxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUGxheWVyIGV4dGVuZHMgVGhpbmcgaW1wbGVtZW50cyBDcmVhdHVyZSB7XHJcbiAgICBiYXNlU3RyZW5ndGg6IG51bWJlclxyXG4gICAgYmFzZUludGVsbGlnZW5jZTogbnVtYmVyXHJcbiAgICBiYXNlQWdpbGl0eTogbnVtYmVyXHJcbiAgICBiYXNlTWF4SGVhbHRoOiBudW1iZXJcclxuICAgIGxldmVsOiBudW1iZXJcclxuICAgIGV4cGVyaWVuY2U6IG51bWJlclxyXG4gICAgaGVhbHRoOiBudW1iZXJcclxuICAgIGFjdGlvbjogbnVtYmVyID0gMFxyXG4gICAgYWN0aW9uUmVzZXJ2ZTogbnVtYmVyID0gMFxyXG4gICAgbWVsZWVXZWFwb246IE1lbGVlV2VhcG9uIHwgbnVsbFxyXG4gICAgcmFuZ2VkV2VhcG9uOiBSYW5nZWRXZWFwb24gfCBudWxsXHJcbiAgICBhcm1vcjogQXJtb3IgfCBudWxsXHJcbiAgICBoZWxtOiBIZWxtIHwgbnVsbFxyXG4gICAgc2hpZWxkOiBTaGllbGQgfCBudWxsXHJcbiAgICByaW5nOiBSaW5nIHwgbnVsbFxyXG4gICAgbGlnaHRTb3VyY2U6IExpZ2h0U291cmNlIHwgbnVsbFxyXG4gICAgaW52ZW50b3J5OiBJdGVtW11cclxuICAgIGdvbGQ6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFBsYXllck9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihPYmplY3QuYXNzaWduKHsgcGFzc2FibGU6IGZhbHNlLCB0cmFuc3BhcmVudDogdHJ1ZSB9LCBvcHRpb25zKSlcclxuICAgICAgICB0aGlzLmJhc2VTdHJlbmd0aCA9IG9wdGlvbnMuc3RyZW5ndGggPz8gMFxyXG4gICAgICAgIHRoaXMuYmFzZUludGVsbGlnZW5jZSA9IG9wdGlvbnMuc3RyZW5ndGggPz8gMFxyXG4gICAgICAgIHRoaXMuYmFzZUFnaWxpdHkgPSBvcHRpb25zLmFnaWxpdHkgPz8gMFxyXG4gICAgICAgIHRoaXMuYmFzZU1heEhlYWx0aCA9IG9wdGlvbnMubWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5sZXZlbCA9IG9wdGlvbnMubGV2ZWwgPz8gMVxyXG4gICAgICAgIHRoaXMuZXhwZXJpZW5jZSA9IG9wdGlvbnMuZXhwZXJpZW5jZSA/PyAwXHJcbiAgICAgICAgdGhpcy5oZWFsdGggPSBvcHRpb25zLmhlYWx0aCA/PyB0aGlzLm1heEhlYWx0aFxyXG4gICAgICAgIHRoaXMubWVsZWVXZWFwb24gPSBvcHRpb25zLm1lbGVlV2VhcG9uID8/IG51bGxcclxuICAgICAgICB0aGlzLnJhbmdlZFdlYXBvbiA9IG9wdGlvbnMucmFuZ2VkV2VhcG9uID8/IG51bGxcclxuICAgICAgICB0aGlzLmhlbG0gPSBvcHRpb25zLmhlbG0gPz8gbnVsbFxyXG4gICAgICAgIHRoaXMuYXJtb3IgPSBvcHRpb25zLmFybW9yID8/IG51bGxcclxuICAgICAgICB0aGlzLnNoaWVsZCA9IG9wdGlvbnMuc2hpZWxkID8/IG51bGxcclxuICAgICAgICB0aGlzLnJpbmcgPSBvcHRpb25zLnJpbmcgPz8gbnVsbFxyXG4gICAgICAgIHRoaXMubGlnaHRTb3VyY2UgPSBvcHRpb25zLmxpZ2h0U291cmNlID8/IG51bGxcclxuICAgICAgICB0aGlzLmludmVudG9yeSA9IG9wdGlvbnMuaW52ZW50b3J5ID8gWy4uLm9wdGlvbnMuaW52ZW50b3J5XSA6IFtdXHJcbiAgICAgICAgdGhpcy5nb2xkID0gb3B0aW9ucy5nb2xkID8/IDBcclxuICAgIH1cclxuXHJcbiAgICBnZXQgc3RyZW5ndGgoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5iYXNlU3RyZW5ndGggKyAodGhpcy5yaW5nPy5zdHJlbmd0aCA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBhZ2lsaXR5KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYmFzZUFnaWxpdHkgKyAodGhpcy5yaW5nPy5hZ2lsaXR5ID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGludGVsbGlnZW5jZSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJhc2VJbnRlbGxpZ2VuY2UgKyAodGhpcy5yaW5nPy5pbnRlbGxpZ2VuY2UgPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgbWF4SGVhbHRoKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYmFzZU1heEhlYWx0aCArICh0aGlzLnJpbmc/Lm1heEhlYWx0aCA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBtZWxlZUF0dGFjaygpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnN0cmVuZ3RoICsgKHRoaXMubWVsZWVXZWFwb24/LmF0dGFjayA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBtZWxlZURhbWFnZSgpOiBEaWNlIHtcclxuICAgICAgICByZXR1cm4gKHRoaXMubWVsZWVXZWFwb24/LmRhbWFnZSA/PyBuZXcgRGljZSgxLCAyKSkuYWRkKHRoaXMuc3RyZW5ndGgpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHJhbmdlZEF0dGFjaygpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFnaWxpdHkgKyAodGhpcy5yYW5nZWRXZWFwb24/LmF0dGFjayA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCByYW5nZWREYW1hZ2UoKTogRGljZSB8IG51bGwge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnJhbmdlZFdlYXBvbj8uZGFtYWdlPy5hZGQodGhpcy5hZ2lsaXR5KSA/PyBudWxsXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGRlZmVuc2UoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hZ2lsaXR5ICsgKHRoaXMuYXJtb3I/LmRlZmVuc2UgPz8gMCkgKyAodGhpcy5oZWxtPy5kZWZlbnNlID8/IDApICsgKHRoaXMuc2hpZWxkPy5kZWZlbnNlID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGxpZ2h0UmFkaXVzKCk6IG51bWJlciB7XHJcbiAgICAgICAgaWYgKHRoaXMubGlnaHRTb3VyY2UgJiYgdGhpcy5saWdodFNvdXJjZS5kdXJhdGlvbiA+IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGlnaHRTb3VyY2UubGlnaHRSYWRpdXNcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAxXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGxpZ2h0Q29sb3IoKTogZ2Z4LkNvbG9yIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5saWdodFNvdXJjZT8ubGlnaHRDb2xvciA/PyBnZnguQ29sb3Iud2hpdGVcclxuICAgIH1cclxuXHJcbiAgICBpc0VxdWlwcGVkKGl0ZW06IEl0ZW0pOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gWy4uLnRoaXMuZXF1aXBtZW50KCldLmluY2x1ZGVzKGl0ZW0pXHJcbiAgICB9XHJcblxyXG4gICAgKmVxdWlwbWVudCgpOiBJdGVyYWJsZTxJdGVtPiB7XHJcbiAgICAgICAgaWYgKHRoaXMubWVsZWVXZWFwb24pIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5tZWxlZVdlYXBvblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucmFuZ2VkV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMucmFuZ2VkV2VhcG9uXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5hcm1vcikge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLmFybW9yXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5oZWxtKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMuaGVsbVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc2hpZWxkKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMuc2hpZWxkXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5yaW5nKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMucmluZ1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMubGlnaHRTb3VyY2UpIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5saWdodFNvdXJjZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBQbGF5ZXIge1xyXG4gICAgICAgIHJldHVybiBuZXcgUGxheWVyKHRoaXMpXHJcbiAgICB9XHJcblxyXG4gICAgZXF1aXAoaXRlbTogSXRlbSkge1xyXG4gICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgTWVsZWVXZWFwb24pIHtcclxuICAgICAgICAgICAgdGhpcy5tZWxlZVdlYXBvbiA9IGl0ZW1cclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBSYW5nZWRXZWFwb24pIHtcclxuICAgICAgICAgICAgdGhpcy5yYW5nZWRXZWFwb24gPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgQXJtb3IpIHtcclxuICAgICAgICAgICAgdGhpcy5hcm1vciA9IGl0ZW1cclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBTaGllbGQpIHtcclxuICAgICAgICAgICAgdGhpcy5zaGllbGQgPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgSGVsbSkge1xyXG4gICAgICAgICAgICB0aGlzLmhlbG0gPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgUmluZykge1xyXG4gICAgICAgICAgICB0aGlzLnJpbmcgPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgTGlnaHRTb3VyY2UpIHtcclxuICAgICAgICAgICAgdGhpcy5saWdodFNvdXJjZSA9IGl0ZW1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmVtb3ZlKGl0ZW06IEl0ZW0pIHtcclxuICAgICAgICBpZiAodGhpcy5tZWxlZVdlYXBvbiA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLm1lbGVlV2VhcG9uID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucmFuZ2VkV2VhcG9uID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmFuZ2VkV2VhcG9uID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYXJtb3IgPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5hcm1vciA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhlbG0gPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5oZWxtID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc2hpZWxkID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hpZWxkID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucmluZyA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLnJpbmcgPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5saWdodFNvdXJjZSA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLmxpZ2h0U291cmNlID0gbnVsbFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBkZWxldGUoaXRlbTogSXRlbSkge1xyXG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5pbnZlbnRvcnkuaW5kZXhPZihpdGVtKTtcclxuICAgICAgICBpZiAoaW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmludmVudG9yeS5zcGxpY2UoaW5kZXgsIDEpXHJcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKGl0ZW0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNhdmUoKTogVGhpbmdTYXZlU3RhdGUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLmlkLFxyXG4gICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICBraW5kOiBcIlBsYXllclwiLFxyXG4gICAgICAgICAgICAgICAgYmFzZVN0cmVuZ3RoOiB0aGlzLmJhc2VTdHJlbmd0aCxcclxuICAgICAgICAgICAgICAgIGJhc2VJbnRlbGxpZ2VuY2U6IHRoaXMuYmFzZUludGVsbGlnZW5jZSxcclxuICAgICAgICAgICAgICAgIGJhc2VBZ2lsaXR5OiB0aGlzLmJhc2VBZ2lsaXR5LFxyXG4gICAgICAgICAgICAgICAgYmFzZU1heEhlYWx0aDogdGhpcy5iYXNlTWF4SGVhbHRoLFxyXG4gICAgICAgICAgICAgICAgbGV2ZWw6IHRoaXMubGV2ZWwsXHJcbiAgICAgICAgICAgICAgICBleHBlcmllbmNlOiB0aGlzLmV4cGVyaWVuY2UsXHJcbiAgICAgICAgICAgICAgICBoZWFsdGg6IHRoaXMuaGVhbHRoLFxyXG4gICAgICAgICAgICAgICAgbWVsZWVXZWFwb246IHRoaXMubWVsZWVXZWFwb24gPyB0aGlzLmludmVudG9yeS5pbmRleE9mKHRoaXMubWVsZWVXZWFwb24pIDogLTEsXHJcbiAgICAgICAgICAgICAgICByYW5nZWRXZWFwb246IHRoaXMucmFuZ2VkV2VhcG9uID8gdGhpcy5pbnZlbnRvcnkuaW5kZXhPZih0aGlzLnJhbmdlZFdlYXBvbikgOiAtMSxcclxuICAgICAgICAgICAgICAgIGFybW9yOiB0aGlzLmFybW9yID8gdGhpcy5pbnZlbnRvcnkuaW5kZXhPZih0aGlzLmFybW9yKSA6IC0xLFxyXG4gICAgICAgICAgICAgICAgaGVsbTogdGhpcy5oZWxtID8gdGhpcy5pbnZlbnRvcnkuaW5kZXhPZih0aGlzLmhlbG0pIDogLTEsXHJcbiAgICAgICAgICAgICAgICBzaGllbGQ6IHRoaXMuc2hpZWxkID8gdGhpcy5pbnZlbnRvcnkuaW5kZXhPZih0aGlzLnNoaWVsZCkgOiAtMSxcclxuICAgICAgICAgICAgICAgIHJpbmc6IHRoaXMucmluZyA/IHRoaXMuaW52ZW50b3J5LmluZGV4T2YodGhpcy5yaW5nKSA6IC0xLFxyXG4gICAgICAgICAgICAgICAgbGlnaHRTb3VyY2U6IHRoaXMubGlnaHRTb3VyY2UgPyB0aGlzLmludmVudG9yeS5pbmRleE9mKHRoaXMubGlnaHRTb3VyY2UpIDogLTEsXHJcbiAgICAgICAgICAgICAgICBpbnZlbnRvcnk6IHRoaXMuaW52ZW50b3J5Lm1hcChpID0+IGkuc2F2ZSgpKSxcclxuICAgICAgICAgICAgICAgIGdvbGQ6IHRoaXMuZ29sZCxcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBsb2FkKGRiOiBUaGluZ0RCLCBzdGF0ZTogUGxheWVyU2F2ZVN0YXRlKSB7XHJcbiAgICAgICAgdGhpcy5iYXNlU3RyZW5ndGggPSBzdGF0ZS5iYXNlU3RyZW5ndGhcclxuICAgICAgICB0aGlzLmJhc2VJbnRlbGxpZ2VuY2UgPSBzdGF0ZS5iYXNlSW50ZWxsaWdlbmNlXHJcbiAgICAgICAgdGhpcy5iYXNlQWdpbGl0eSA9IHN0YXRlLmJhc2VBZ2lsaXR5XHJcbiAgICAgICAgdGhpcy5iYXNlTWF4SGVhbHRoID0gc3RhdGUuYmFzZU1heEhlYWx0aFxyXG4gICAgICAgIHRoaXMubGV2ZWwgPSBzdGF0ZS5sZXZlbFxyXG4gICAgICAgIHRoaXMuZXhwZXJpZW5jZSA9IHN0YXRlLmV4cGVyaWVuY2VcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IHN0YXRlLmhlYWx0aFxyXG5cclxuICAgICAgICB0aGlzLmludmVudG9yeSA9IHN0YXRlLmludmVudG9yeS5tYXAoaW52U3RhdGUgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gZGIubG9hZChpbnZTdGF0ZSlcclxuXHJcbiAgICAgICAgICAgIGlmICghKGl0ZW0gaW5zdGFuY2VvZiBJdGVtKSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm9uLWl0ZW0gaW4gaW52ZW50b3J5LCBsb2FkIGZhaWxlZC5cIilcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGl0ZW1cclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBpZiAoc3RhdGUubWVsZWVXZWFwb24gPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmVxdWlwKHRoaXMuaW52ZW50b3J5W3N0YXRlLm1lbGVlV2VhcG9uXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLm1lbGVlV2VhcG9uID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHN0YXRlLnJhbmdlZFdlYXBvbiA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXF1aXAodGhpcy5pbnZlbnRvcnlbc3RhdGUucmFuZ2VkV2VhcG9uXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnJhbmdlZFdlYXBvbiA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzdGF0ZS5oZWxtID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lcXVpcCh0aGlzLmludmVudG9yeVtzdGF0ZS5oZWxtXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmhlbG0gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3RhdGUuYXJtb3IgPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmVxdWlwKHRoaXMuaW52ZW50b3J5W3N0YXRlLmFybW9yXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmFybW9yID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHN0YXRlLnNoaWVsZCA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXF1aXAodGhpcy5pbnZlbnRvcnlbc3RhdGUuc2hpZWxkXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnNoaWVsZCA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzdGF0ZS5yaW5nID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lcXVpcCh0aGlzLmludmVudG9yeVtzdGF0ZS5yaW5nXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnJpbmcgPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3RhdGUubGlnaHRTb3VyY2UgPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmVxdWlwKHRoaXMuaW52ZW50b3J5W3N0YXRlLmxpZ2h0U291cmNlXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmxpZ2h0U291cmNlID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5nb2xkID0gc3RhdGUuZ29sZFxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEF0dGFja09wdGlvbnMge1xyXG4gICAgYXR0YWNrOiBudW1iZXJcclxuICAgIGRhbWFnZTogRGljZVxyXG4gICAgYWN0aW9uOiBudW1iZXJcclxuICAgIHJhbmdlPzogbnVtYmVyXHJcbiAgICB2ZXJiPzogc3RyaW5nXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBBdHRhY2sge1xyXG4gICAgYXR0YWNrOiBudW1iZXJcclxuICAgIGRhbWFnZTogRGljZVxyXG4gICAgYWN0aW9uOiBudW1iZXJcclxuICAgIHJhbmdlOiBudW1iZXJcclxuICAgIHZlcmI6IHN0cmluZ1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEF0dGFja09wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLmF0dGFjayA9IG9wdGlvbnMuYXR0YWNrID8/IDBcclxuICAgICAgICB0aGlzLmRhbWFnZSA9IG9wdGlvbnMuZGFtYWdlLmNsb25lKClcclxuICAgICAgICB0aGlzLmFjdGlvbiA9IG9wdGlvbnMuYWN0aW9uXHJcbiAgICAgICAgdGhpcy5yYW5nZSA9IG9wdGlvbnMucmFuZ2UgPz8gMVxyXG4gICAgICAgIHRoaXMudmVyYiA9IG9wdGlvbnMudmVyYiA/PyBcIlwiXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogQXR0YWNrIHtcclxuICAgICAgICByZXR1cm4gbmV3IEF0dGFjayh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZW51bSBNb25zdGVyU3RhdGUge1xyXG4gICAgaWRsZSxcclxuICAgIGFnZ3JvXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTW9uc3Rlck9wdGlvbnMgZXh0ZW5kcyBDcmVhdHVyZU9wdGlvbnMge1xyXG4gICAgZGVmZW5zZTogbnVtYmVyXHJcbiAgICBleHBlcmllbmNlOiBudW1iZXIsXHJcbiAgICBhdHRhY2tzOiBBdHRhY2tbXVxyXG4gICAgZnJlcT86IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTW9uc3RlciBleHRlbmRzIFRoaW5nIGltcGxlbWVudHMgQ3JlYXR1cmUge1xyXG4gICAgcmVhZG9ubHkgYWdpbGl0eTogbnVtYmVyXHJcbiAgICByZWFkb25seSBkZWZlbnNlOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBoZWFsdGg6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgZXhwZXJpZW5jZTogbnVtYmVyXHJcbiAgICByZWFkb25seSBhdHRhY2tzOiBBdHRhY2tbXSA9IFtdXHJcbiAgICBzdGF0ZTogTW9uc3RlclN0YXRlID0gTW9uc3RlclN0YXRlLmlkbGVcclxuICAgIGFjdGlvbjogbnVtYmVyID0gMFxyXG4gICAgYWN0aW9uUmVzZXJ2ZTogbnVtYmVyID0gMFxyXG4gICAgcmVhZG9ubHkgbGV2ZWw6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgZnJlcTogbnVtYmVyID0gMVxyXG4gICAgcmVhZG9ubHkgZ29sZDogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogTW9uc3Rlck9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihPYmplY3QuYXNzaWduKHsgcGFzc2FibGU6IGZhbHNlLCB0cmFuc3BhcmVudDogdHJ1ZSB9LCBvcHRpb25zKSlcclxuICAgICAgICB0aGlzLmFnaWxpdHkgPSBvcHRpb25zLmFnaWxpdHkgPz8gMFxyXG4gICAgICAgIHRoaXMuZGVmZW5zZSA9IG9wdGlvbnMuZGVmZW5zZSA/PyAwXHJcbiAgICAgICAgdGhpcy5tYXhIZWFsdGggPSBvcHRpb25zLm1heEhlYWx0aFxyXG4gICAgICAgIHRoaXMuaGVhbHRoID0gb3B0aW9ucy5oZWFsdGggPz8gdGhpcy5tYXhIZWFsdGhcclxuICAgICAgICB0aGlzLmV4cGVyaWVuY2UgPSBvcHRpb25zLmV4cGVyaWVuY2VcclxuICAgICAgICB0aGlzLmF0dGFja3MgPSBbLi4ub3B0aW9ucy5hdHRhY2tzXVxyXG4gICAgICAgIHRoaXMubGV2ZWwgPSBvcHRpb25zLmxldmVsXHJcbiAgICAgICAgdGhpcy5mcmVxID0gb3B0aW9ucy5mcmVxID8/IDFcclxuICAgICAgICB0aGlzLmdvbGQgPSBvcHRpb25zLmdvbGQgPz8gMFxyXG5cclxuICAgICAgICBpZiAodGhpcy5hdHRhY2tzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gYXR0YWNrcyBkZWZpbmVkIGZvciBtb25zdGVyICR7dGhpcy5uYW1lfWApXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IE1vbnN0ZXIge1xyXG4gICAgICAgIHJldHVybiBuZXcgTW9uc3Rlcih0aGlzKVxyXG4gICAgfVxyXG5cclxuICAgIHNhdmUoKTogVGhpbmdTYXZlU3RhdGUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLmlkLFxyXG4gICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICBraW5kOiBcIk1vbnN0ZXJcIixcclxuICAgICAgICAgICAgICAgIGhlYWx0aDogdGhpcy5oZWFsdGgsXHJcbiAgICAgICAgICAgICAgICBhY3Rpb246IHRoaXMuYWN0aW9uLFxyXG4gICAgICAgICAgICAgICAgYWN0aW9uUmVzZXJ2ZTogdGhpcy5hY3Rpb25SZXNlcnZlLFxyXG4gICAgICAgICAgICAgICAgc3RhdGU6IHRoaXMuc3RhdGUsXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZChzdGF0ZTogTW9uc3RlclNhdmVTdGF0ZSkge1xyXG4gICAgICAgIHRoaXMuaGVhbHRoID0gc3RhdGUuaGVhbHRoXHJcbiAgICAgICAgdGhpcy5hY3Rpb24gPSBzdGF0ZS5hY3Rpb25cclxuICAgICAgICB0aGlzLmFjdGlvblJlc2VydmUgPSBzdGF0ZS5hY3Rpb25SZXNlcnZlXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHN0YXRlLnN0YXRlXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTW9uc3RlclNhdmVTdGF0ZSB7XHJcbiAgICByZWFkb25seSBraW5kOiBcIk1vbnN0ZXJcIlxyXG4gICAgcmVhZG9ubHkgaGVhbHRoOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGFjdGlvbjogbnVtYmVyXHJcbiAgICByZWFkb25seSBhY3Rpb25SZXNlcnZlOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHN0YXRlOiBNb25zdGVyU3RhdGVcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb250YWluZXJPcHRpb25zIHtcclxuICAgIGlkOiBzdHJpbmdcclxuICAgIG5hbWU6IHN0cmluZ1xyXG4gICAgaW1hZ2U6IHN0cmluZ1xyXG4gICAgY29sb3I/OiBnZnguQ29sb3JcclxuICAgIGl0ZW1zPzogSXRlbVtdXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBDb250YWluZXIgZXh0ZW5kcyBGaXh0dXJlIHtcclxuICAgIGl0ZW1zOiBJdGVtW11cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBDb250YWluZXJPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IHRydWUgfSwgb3B0aW9ucykpXHJcbiAgICAgICAgdGhpcy5pdGVtcyA9IFsuLi5vcHRpb25zLml0ZW1zID8/IFtdXVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IENvbnRhaW5lciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBDb250YWluZXIoT2JqZWN0LmFzc2lnbih7XHJcbiAgICAgICAgICAgIGl0ZW1zOiBbLi4uaXRlci5tYXAodGhpcy5pdGVtcywgeCA9PiB4LmNsb25lKCkpXVxyXG4gICAgICAgIH0sIHN1cGVyLmNsb25lKCkpKVxyXG4gICAgfVxyXG5cclxuICAgIHNhdmUoKTogVGhpbmdTYXZlU3RhdGUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLmlkLFxyXG4gICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICBraW5kOiBcIkNvbnRhaW5lclwiLFxyXG4gICAgICAgICAgICAgICAgaXRlbXM6IHRoaXMuaXRlbXMubWFwKGkgPT4gaS5zYXZlKCkpLFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxvYWQoZGI6IFRoaW5nREIsIHN0YXRlOiBDb250YWluZXJTYXZlU3RhdGUpIHtcclxuICAgICAgICB0aGlzLml0ZW1zID0gc3RhdGUuaXRlbXMubWFwKGl0ZW1TdGF0ZSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBkYi5sb2FkKGl0ZW1TdGF0ZSlcclxuXHJcbiAgICAgICAgICAgIGlmICghKGl0ZW0gaW5zdGFuY2VvZiBJdGVtKSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm9uLWl0ZW0gaW4gY29udGFpbmVyLCBsb2FkIGZhaWxlZC5cIilcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGl0ZW1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG59XHJcblxyXG5jb25zdCBsZXZlbHMgPSBbXHJcbiAgICAxMCxcclxuICAgIDIwLFxyXG4gICAgNTAsXHJcbiAgICAxMDAsXHJcbiAgICAyMDAsXHJcbiAgICA1MDAsXHJcbiAgICAxMDAwLFxyXG4gICAgMjAwMCxcclxuICAgIDUwMDAsXHJcbiAgICAxMDAwMF1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHBlcmllbmNlUmVxdWlyZW1lbnQobGV2ZWw6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICBpZiAobGV2ZWwgPCAyKSB7XHJcbiAgICAgICAgcmV0dXJuIDBcclxuICAgIH1cclxuXHJcbiAgICBpZiAobGV2ZWwgLSAyID49IGxldmVscy5sZW5ndGgpIHtcclxuICAgICAgICByZXR1cm4gSW5maW5pdHlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbGV2ZWxzW2xldmVsIC0gMl1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRhYmxlPFQgZXh0ZW5kcyBUaGluZz4ge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtYXAgPSBuZXcgTWFwPHN0cmluZywgVD4oKTtcclxuXHJcbiAgICBpbnNlcnQodGhpbmc6IFQpOiBUIHtcclxuICAgICAgICBpZiAodGhpcy5oYXModGhpbmcuaWQpKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQXR0ZW1wdCB0byBpbnNlcnQgZHVwbGljYXRlIGlkIG9mICR7dGhpbmcuaWR9YClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubWFwLnNldCh0aGluZy5pZCwgdGhpbmcpXHJcbiAgICAgICAgcmV0dXJuIHRoaW5nXHJcbiAgICB9XHJcblxyXG4gICAgaGFzKGlkOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAuaGFzKGlkKVxyXG4gICAgfVxyXG5cclxuICAgIGdldChpZDogc3RyaW5nKTogVCB8IHVuZGVmaW5lZCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwLmdldChpZClcclxuICAgIH1cclxuXHJcbiAgICAqW1N5bWJvbC5pdGVyYXRvcl0oKTogR2VuZXJhdG9yPFQ+IHtcclxuICAgICAgICBmb3IgKGNvbnN0IFtfLCB2XSBvZiB0aGlzLm1hcCkge1xyXG4gICAgICAgICAgICB5aWVsZCB2XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGhpbmdEQiB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBUaGluZz4oKVxyXG5cclxuICAgIGluc2VydDxUIGV4dGVuZHMgVGhpbmc+KHRoaW5nOiBUKTogVCB7XHJcbiAgICAgICAgaWYgKHRoaXMuaGFzKHRoaW5nLmlkKSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEF0dGVtcHQgdG8gaW5zZXJ0IGR1cGxpY2F0ZSBpZCBvZiAke3RoaW5nLmlkfWApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1hcC5zZXQodGhpbmcuaWQsIHRoaW5nKVxyXG4gICAgICAgIHJldHVybiB0aGluZ1xyXG4gICAgfVxyXG5cclxuICAgIGhhcyhpZDogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwLmhhcyhpZClcclxuICAgIH1cclxuXHJcbiAgICBnZXQoaWQ6IHN0cmluZyk6IFRoaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAuZ2V0KGlkKVxyXG4gICAgfVxyXG5cclxuICAgIGxvYWQoc3RhdGU6IFRoaW5nU2F2ZVN0YXRlKTogVGhpbmcge1xyXG4gICAgICAgIGNvbnN0IHRoaW5nID0gdGhpcy5nZXQoc3RhdGUuaWQpPy5jbG9uZSgpXHJcbiAgICAgICAgaWYgKCF0aGluZykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHRoaW5nIHdpdGggaWQgJHtzdGF0ZS5pZH0gZm91bmQsIGNhbm5vdCBsb2FkLmApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXN0YXRlLmRhdGEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaW5nXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzd2l0Y2ggKHN0YXRlLmRhdGEua2luZCkge1xyXG4gICAgICAgICAgICBjYXNlIFwiUGxheWVyXCI6XHJcbiAgICAgICAgICAgICAgICBpZiAoISh0aGluZyBpbnN0YW5jZW9mIFBsYXllcikpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHRoaW5nIC0gZXhwZWN0ZWQgcGxheWVyLlwiKVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaW5nLmxvYWQodGhpcywgc3RhdGUuZGF0YSlcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIFwiTGlnaHRTb3VyY2VcIjpcclxuICAgICAgICAgICAgICAgIGlmICghKHRoaW5nIGluc3RhbmNlb2YgTGlnaHRTb3VyY2UpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB0aGluZyAtIGV4cGVjdGVkIGxpZ2h0IHNvdXJjZS5cIilcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGluZy5sb2FkKHN0YXRlLmRhdGEpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBcIkNvbnRhaW5lclwiOlxyXG4gICAgICAgICAgICAgICAgaWYgKCEodGhpbmcgaW5zdGFuY2VvZiBDb250YWluZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB0aGluZyAtIGV4cGVjdGVkIGNvbnRhaW5lci5cIilcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGluZy5sb2FkKHRoaXMsIHN0YXRlLmRhdGEpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaW5nXHJcbiAgICB9XHJcblxyXG4gICAgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEdlbmVyYXRvcjxUaGluZz4ge1xyXG4gICAgICAgIGZvciAoY29uc3QgW18sIHZdIG9mIHRoaXMubWFwKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHZcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBhIHdlaWdodGVkIGxpc3QgZnJvbSB3aGljaCBhIHJhbmRvbSBzZWxlY3Rpb24gY2FuIGJlIGRyYXduLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFdlaWdodGVkTGlzdDxUPiB7XHJcbiAgICAvKipcclxuICAgICAqIGNvbnN0cnVjdG9yXHJcbiAgICAgKiBAcGFyYW0gZGF0YSBsaXN0IG9mIFtpdGVtLCByZWxhdGl2ZSB3ZWlnaHRdIGl0ZW1zXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgZGF0YTogW1QsIG51bWJlcl1bXSkge1xyXG4gICAgICAgIGNvbnN0IHRvdGFsID0gZGF0YS5tYXAoeCA9PiB4WzFdKS5yZWR1Y2UoKHgsIHkpID0+IHggKyB5LCAwKVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgZGF0YVtpXVsxXSAvPSB0b3RhbFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZWxlY3Qocm5nOiByYW5kLlJORyk6IFQge1xyXG4gICAgICAgIGxldCBkaXN0ID0gcm5nLm5leHQoKVxyXG4gICAgICAgIGZvciAoY29uc3QgW3gsIHddIG9mIHRoaXMuZGF0YSkge1xyXG4gICAgICAgICAgICBkaXN0IC09IHdcclxuICAgICAgICAgICAgaWYgKGRpc3QgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHhcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBvciBlbXB0eSBsaXN0LCBubyBzZWxlY3Rpb24gbWFkZVwiKVxyXG4gICAgfVxyXG59Il19