/**
 * rogue-like library
 */
import * as rand from "../shared/rand.js";
import * as gfx from "./gfx.js";
export const tileSize = 24;
export var Visibility;
(function (Visibility) {
    Visibility[Visibility["None"] = 0] = "None";
    Visibility[Visibility["Fog"] = 1] = "Fog";
    Visibility[Visibility["Visible"] = 2] = "Visible";
})(Visibility || (Visibility = {}));
export class Thing {
    constructor(options) {
        var _a;
        this.color = new gfx.Color(1, 1, 1, 1);
        this.visible = Visibility.None;
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
export function isEquippable(item) {
    return item instanceof Weapon || item instanceof Armor || item instanceof Shield;
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
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
        this.lightRadius = options.lightRadius;
        this.inventory = options.inventory ? [...options.inventory] : [];
        this.gold = (_o = options.gold) !== null && _o !== void 0 ? _o : 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJybC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUNILE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFFL0IsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQTtBQUUxQixNQUFNLENBQU4sSUFBWSxVQUlYO0FBSkQsV0FBWSxVQUFVO0lBQ2xCLDJDQUFJLENBQUE7SUFDSix5Q0FBRyxDQUFBO0lBQ0gsaURBQU8sQ0FBQTtBQUNYLENBQUMsRUFKVyxVQUFVLEtBQVYsVUFBVSxRQUlyQjtBQVdELE1BQU0sT0FBTyxLQUFLO0lBU2QsWUFBWSxPQUFxQjs7UUFIeEIsVUFBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxZQUFPLEdBQWUsVUFBVSxDQUFDLElBQUksQ0FBQTtRQUdqQyxJQUFJLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUE7UUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQTtRQUN0QyxJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUE7UUFDeEIsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFBLE9BQU8sQ0FBQyxLQUFLLG1DQUFJLEVBQUUsQ0FBQTtRQUVoQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUU7WUFDZixJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7U0FDN0I7SUFDTCxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDMUIsQ0FBQztDQUNK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SUFBSSxDQUFDLFlBQVksQ0FBQTtTQUMxQjtRQUVELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNaLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQTtTQUNuQjtRQUVELElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUNYLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQTtTQUNsQjtRQUVELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNiLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQTtTQUNwQjtRQUVELElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUNYLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQTtTQUNsQjtJQUNMLENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMzQixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQVU7UUFDWixJQUFJLElBQUksWUFBWSxXQUFXLEVBQUU7WUFDN0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7U0FDMUI7YUFBTSxJQUFJLElBQUksWUFBWSxZQUFZLEVBQUU7WUFDckMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7U0FDM0I7YUFBTSxJQUFJLElBQUksWUFBWSxLQUFLLEVBQUU7WUFDOUIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7U0FDcEI7YUFBTSxJQUFJLElBQUksWUFBWSxNQUFNLEVBQUU7WUFDL0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7U0FDckI7YUFBTSxJQUFJLElBQUksWUFBWSxJQUFJLEVBQUU7WUFDN0IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7U0FDbkI7YUFBTSxJQUFJLElBQUksWUFBWSxJQUFJLEVBQUU7WUFDN0IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7U0FDbkI7SUFDTCxDQUFDO0lBRUQsTUFBTSxDQUFDLElBQVU7UUFDYixJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssSUFBSSxFQUFFO1lBQzNCLElBQUksQ0FBQyxX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QUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtZQUNsQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFBO1NBQ3RCO0lBQ0wsQ0FBQztJQUVELE1BQU0sQ0FBQyxHQUFhO1FBQ2hCLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNyQixLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUM1QixJQUFJLElBQUksQ0FBQyxDQUFBO1lBQ1QsSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFFO2dCQUNYLE9BQU8sQ0FBQyxDQUFBO2FBQ1g7U0FDSjtRQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQTBDLENBQUMsQ0FBQTtJQUMvRCxDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogcm9ndWUtbGlrZSBsaWJyYXJ5XHJcbiAqL1xyXG5pbXBvcnQgKiBhcyByYW5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiXHJcbmltcG9ydCAqIGFzIGdmeCBmcm9tIFwiLi9nZnguanNcIlxyXG5cclxuZXhwb3J0IGNvbnN0IHRpbGVTaXplID0gMjRcclxuXHJcbmV4cG9ydCBlbnVtIFZpc2liaWxpdHkge1xyXG4gICAgTm9uZSxcclxuICAgIEZvZyxcclxuICAgIFZpc2libGVcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUaGluZ09wdGlvbnMge1xyXG4gICAgaWQ6IHN0cmluZ1xyXG4gICAgcGFzc2FibGU6IGJvb2xlYW5cclxuICAgIHRyYW5zcGFyZW50OiBib29sZWFuXHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlPzogc3RyaW5nXHJcbiAgICBjb2xvcj86IGdmeC5Db2xvclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGhpbmcge1xyXG4gICAgcmVhZG9ubHkgaWQ6IHN0cmluZ1xyXG4gICAgcGFzc2FibGU6IGJvb2xlYW5cclxuICAgIHRyYW5zcGFyZW50OiBib29sZWFuXHJcbiAgICByZWFkb25seSBuYW1lOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGltYWdlOiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGNvbG9yID0gbmV3IGdmeC5Db2xvcigxLCAxLCAxLCAxKVxyXG4gICAgdmlzaWJsZTogVmlzaWJpbGl0eSA9IFZpc2liaWxpdHkuTm9uZVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFRoaW5nT3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMuaWQgPSBvcHRpb25zLmlkXHJcbiAgICAgICAgdGhpcy5wYXNzYWJsZSA9IG9wdGlvbnMucGFzc2FibGVcclxuICAgICAgICB0aGlzLnRyYW5zcGFyZW50ID0gb3B0aW9ucy50cmFuc3BhcmVudFxyXG4gICAgICAgIHRoaXMubmFtZSA9IG9wdGlvbnMubmFtZVxyXG4gICAgICAgIHRoaXMuaW1hZ2UgPSBvcHRpb25zLmltYWdlID8/IFwiXCJcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuY29sb3IpIHtcclxuICAgICAgICAgICAgdGhpcy5jb2xvciA9IG9wdGlvbnMuY29sb3JcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogVGhpbmcge1xyXG4gICAgICAgIHJldHVybiBuZXcgVGhpbmcodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIERpY2Uge1xyXG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgbWluOiBudW1iZXIgPSAwLCByZWFkb25seSBtYXg6IG51bWJlciA9IDApIHsgfVxyXG5cclxuICAgIHJvbGwocm5nOiByYW5kLlJORyk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHJhbmQuaW50KHJuZywgdGhpcy5taW4sIHRoaXMubWF4ICsgMSlcclxuICAgIH1cclxuXHJcbiAgICBhZGQoeDogbnVtYmVyKTogRGljZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBEaWNlKHRoaXMubWluICsgeCwgdGhpcy5tYXggKyB4KVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IERpY2Uge1xyXG4gICAgICAgIHJldHVybiBuZXcgRGljZSh0aGlzLm1pbiwgdGhpcy5tYXgpXHJcbiAgICB9XHJcblxyXG4gICAgdG9TdHJpbmcoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gYCR7dGhpcy5taW59IC0gJHt0aGlzLm1heH1gXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUaWxlIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgY2xvbmUoKTogVGlsZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBUaWxlKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaXh0dXJlIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgY2xvbmUoKTogRml4dHVyZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBGaXh0dXJlKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBEb29yIGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICBjbG9uZSgpOiBEb29yIHtcclxuICAgICAgICByZXR1cm4gbmV3IERvb3IodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGVudW0gRXhpdERpcmVjdGlvbiB7XHJcbiAgICBVcCxcclxuICAgIERvd24sXHJcbn1cclxuXHJcbmludGVyZmFjZSBFeGl0T3B0aW9ucyB7XHJcbiAgICBpZDogc3RyaW5nXHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlPzogc3RyaW5nXHJcbiAgICBjb2xvcj86IGdmeC5Db2xvclxyXG4gICAgZGlyZWN0aW9uOiBFeGl0RGlyZWN0aW9uXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBFeGl0IGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICBkaXJlY3Rpb246IEV4aXREaXJlY3Rpb25cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBFeGl0T3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiBmYWxzZSB9LCBvcHRpb25zKSlcclxuICAgICAgICB0aGlzLmRpcmVjdGlvbiA9IG9wdGlvbnMuZGlyZWN0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogRXhpdCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBFeGl0KHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSXRlbU9wdGlvbnMge1xyXG4gICAgaWQ6IHN0cmluZ1xyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZT86IHN0cmluZ1xyXG4gICAgY29sb3I/OiBnZnguQ29sb3JcclxuICAgIGxldmVsOiBudW1iZXJcclxuICAgIGZyZXE/OiBudW1iZXJcclxuICAgIHZhbHVlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEl0ZW0gZXh0ZW5kcyBUaGluZyB7XHJcbiAgICByZWFkb25seSBsZXZlbDogbnVtYmVyXHJcbiAgICByZWFkb25seSBmcmVxOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHZhbHVlOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBJdGVtT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG5cclxuICAgICAgICB0aGlzLmxldmVsID0gb3B0aW9ucy5sZXZlbFxyXG4gICAgICAgIHRoaXMuZnJlcSA9IG9wdGlvbnMuZnJlcSA/PyAxXHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IG9wdGlvbnMudmFsdWUgPz8gMVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEl0ZW0ge1xyXG4gICAgICAgIHJldHVybiBuZXcgSXRlbSh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFdlYXBvbk9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICByZWFkb25seSBhdHRhY2s6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgcmFuZ2U/OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHZlcmI/OiBzdHJpbmdcclxuICAgIHJlYWRvbmx5IGFjdGlvbjogbnVtYmVyXHJcbiAgICByZWFkb25seSBkYW1hZ2U6IERpY2VcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFdlYXBvbiBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgYXR0YWNrOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGRhbWFnZTogRGljZVxyXG4gICAgcmVhZG9ubHkgcmFuZ2U6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYWN0aW9uOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHZlcmI6IHN0cmluZ1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFdlYXBvbk9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMuYXR0YWNrID0gb3B0aW9ucy5hdHRhY2tcclxuICAgICAgICB0aGlzLmRhbWFnZSA9IG9wdGlvbnMuZGFtYWdlLmNsb25lKClcclxuICAgICAgICB0aGlzLnJhbmdlID0gb3B0aW9ucy5yYW5nZSA/PyAxXHJcbiAgICAgICAgdGhpcy52ZXJiID0gb3B0aW9ucy52ZXJiID8/IFwiXCJcclxuICAgICAgICB0aGlzLmFjdGlvbiA9IG9wdGlvbnMuYWN0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogV2VhcG9uIHtcclxuICAgICAgICByZXR1cm4gbmV3IFdlYXBvbih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUmFuZ2VkV2VhcG9uIGV4dGVuZHMgV2VhcG9uIHtcclxuICAgIGNsb25lKCk6IFJhbmdlZFdlYXBvbiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBSYW5nZWRXZWFwb24odGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1lbGVlV2VhcG9uIGV4dGVuZHMgV2VhcG9uIHtcclxuICAgIGNsb25lKCk6IFdlYXBvbiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNZWxlZVdlYXBvbih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFybW9yT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIGRlZmVuc2U6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQXJtb3IgZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGRlZmVuc2U6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEFybW9yT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlID0gb3B0aW9ucy5kZWZlbnNlXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogQXJtb3Ige1xyXG4gICAgICAgIHJldHVybiBuZXcgQXJtb3IodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBIZWxtT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIGRlZmVuc2U6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgSGVsbSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgZGVmZW5zZTogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogSGVsbU9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMuZGVmZW5zZSA9IG9wdGlvbnMuZGVmZW5zZVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEhlbG0ge1xyXG4gICAgICAgIHJldHVybiBuZXcgSGVsbSh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNoaWVsZE9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNoaWVsZCBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgZGVmZW5zZTogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogU2hpZWxkT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlID0gb3B0aW9ucy5kZWZlbnNlXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogU2hpZWxkIHtcclxuICAgICAgICByZXR1cm4gbmV3IFNoaWVsZCh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJpbmdPcHRpb25zIGV4dGVuZHMgSXRlbU9wdGlvbnMge1xyXG4gICAgc3RyZW5ndGg/OiBudW1iZXJcclxuICAgIGFnaWxpdHk/OiBudW1iZXJcclxuICAgIGludGVsbGlnZW5jZT86IG51bWJlclxyXG4gICAgbWF4SGVhbHRoPzogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBSaW5nIGV4dGVuZHMgSXRlbSB7XHJcbiAgICBzdHJlbmd0aDogbnVtYmVyXHJcbiAgICBhZ2lsaXR5OiBudW1iZXJcclxuICAgIGludGVsbGlnZW5jZTogbnVtYmVyXHJcbiAgICBtYXhIZWFsdGg6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFJpbmdPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLnN0cmVuZ3RoID0gb3B0aW9ucy5zdHJlbmd0aCA/PyAwXHJcbiAgICAgICAgdGhpcy5hZ2lsaXR5ID0gb3B0aW9ucy5hZ2lsaXR5ID8/IDBcclxuICAgICAgICB0aGlzLmludGVsbGlnZW5jZSA9IG9wdGlvbnMuaW50ZWxsaWdlbmNlID8/IDBcclxuICAgICAgICB0aGlzLm1heEhlYWx0aCA9IG9wdGlvbnMubWF4SGVhbHRoID8/IDBcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IHR5cGUgRXF1aXBwYWJsZSA9IE1lbGVlV2VhcG9uIHwgUmFuZ2VkV2VhcG9uIHwgQXJtb3IgfCBIZWxtIHwgU2hpZWxkIHwgUmluZ1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGlzRXF1aXBwYWJsZShpdGVtOiBJdGVtKTogaXRlbSBpcyBFcXVpcHBhYmxlIHtcclxuICAgIHJldHVybiBpdGVtIGluc3RhbmNlb2YgV2VhcG9uIHx8IGl0ZW0gaW5zdGFuY2VvZiBBcm1vciB8fCBpdGVtIGluc3RhbmNlb2YgU2hpZWxkXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVXNhYmxlT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIGhlYWx0aDogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBVc2FibGUgZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGhlYWx0aDogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogVXNhYmxlT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiBmYWxzZSB9LCBvcHRpb25zKSlcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IG9wdGlvbnMuaGVhbHRoXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogVXNhYmxlIHtcclxuICAgICAgICByZXR1cm4gbmV3IFVzYWJsZSh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0dXJlT3B0aW9ucyB7XHJcbiAgICBpZDogc3RyaW5nXHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlOiBzdHJpbmdcclxuICAgIGNvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICBtYXhIZWFsdGg6IG51bWJlclxyXG4gICAgaGVhbHRoPzogbnVtYmVyXHJcbiAgICBhZ2lsaXR5PzogbnVtYmVyXHJcbiAgICBsZXZlbDogbnVtYmVyLFxyXG4gICAgZ29sZDogbnVtYmVyLFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0dXJlIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgbWF4SGVhbHRoOiBudW1iZXJcclxuICAgIGhlYWx0aDogbnVtYmVyXHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxuICAgIGFnaWxpdHk6IG51bWJlclxyXG4gICAgYWN0aW9uOiBudW1iZXJcclxuICAgIGFjdGlvblJlc2VydmU6IG51bWJlclxyXG4gICAgbGV2ZWw6IG51bWJlcixcclxuICAgIGdvbGQ6IG51bWJlcixcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQbGF5ZXJPcHRpb25zIGV4dGVuZHMgQ3JlYXR1cmVPcHRpb25zIHtcclxuICAgIGxpZ2h0UmFkaXVzOiBudW1iZXJcclxuICAgIGV4cGVyaWVuY2U/OiBudW1iZXJcclxuICAgIHN0cmVuZ3RoPzogbnVtYmVyXHJcbiAgICBpbnRlbGxpZ2VuY2U/OiBudW1iZXJcclxuICAgIG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBtZWxlZVdlYXBvbj86IE1lbGVlV2VhcG9uIHwgbnVsbFxyXG4gICAgcmFuZ2VkV2VhcG9uPzogUmFuZ2VkV2VhcG9uIHwgbnVsbFxyXG4gICAgYXJtb3I/OiBBcm1vciB8IG51bGxcclxuICAgIGhlbG0/OiBIZWxtIHwgbnVsbFxyXG4gICAgc2hpZWxkPzogU2hpZWxkIHwgbnVsbFxyXG4gICAgcmluZz86IFJpbmcgfCBudWxsXHJcbiAgICBpbnZlbnRvcnk/OiBJdGVtW10sXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBQbGF5ZXIgZXh0ZW5kcyBUaGluZyBpbXBsZW1lbnRzIENyZWF0dXJlIHtcclxuICAgIGJhc2VTdHJlbmd0aDogbnVtYmVyXHJcbiAgICBiYXNlSW50ZWxsaWdlbmNlOiBudW1iZXJcclxuICAgIGJhc2VBZ2lsaXR5OiBudW1iZXJcclxuICAgIGJhc2VNYXhIZWFsdGg6IG51bWJlclxyXG4gICAgbGV2ZWw6IG51bWJlclxyXG4gICAgZXhwZXJpZW5jZTogbnVtYmVyXHJcbiAgICBoZWFsdGg6IG51bWJlclxyXG4gICAgYWN0aW9uOiBudW1iZXIgPSAwXHJcbiAgICBhY3Rpb25SZXNlcnZlOiBudW1iZXIgPSAwXHJcbiAgICBtZWxlZVdlYXBvbjogTWVsZWVXZWFwb24gfCBudWxsXHJcbiAgICByYW5nZWRXZWFwb246IFJhbmdlZFdlYXBvbiB8IG51bGxcclxuICAgIGFybW9yOiBBcm1vciB8IG51bGxcclxuICAgIGhlbG06IEhlbG0gfCBudWxsXHJcbiAgICBzaGllbGQ6IFNoaWVsZCB8IG51bGxcclxuICAgIHJpbmc6IFJpbmcgfCBudWxsXHJcbiAgICBsaWdodFJhZGl1czogbnVtYmVyXHJcbiAgICBpbnZlbnRvcnk6IEl0ZW1bXVxyXG4gICAgZ29sZDogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogUGxheWVyT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuYmFzZVN0cmVuZ3RoID0gb3B0aW9ucy5zdHJlbmd0aCA/PyAwXHJcbiAgICAgICAgdGhpcy5iYXNlSW50ZWxsaWdlbmNlID0gb3B0aW9ucy5zdHJlbmd0aCA/PyAwXHJcbiAgICAgICAgdGhpcy5iYXNlQWdpbGl0eSA9IG9wdGlvbnMuYWdpbGl0eSA/PyAwXHJcbiAgICAgICAgdGhpcy5iYXNlTWF4SGVhbHRoID0gb3B0aW9ucy5tYXhIZWFsdGhcclxuICAgICAgICB0aGlzLmxldmVsID0gb3B0aW9ucy5sZXZlbCA/PyAxXHJcbiAgICAgICAgdGhpcy5leHBlcmllbmNlID0gb3B0aW9ucy5leHBlcmllbmNlID8/IDBcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IG9wdGlvbnMuaGVhbHRoID8/IHRoaXMubWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5tZWxlZVdlYXBvbiA9IG9wdGlvbnMubWVsZWVXZWFwb24gPz8gbnVsbFxyXG4gICAgICAgIHRoaXMucmFuZ2VkV2VhcG9uID0gb3B0aW9ucy5yYW5nZWRXZWFwb24gPz8gbnVsbFxyXG4gICAgICAgIHRoaXMuaGVsbSA9IG9wdGlvbnMuaGVsbSA/PyBudWxsXHJcbiAgICAgICAgdGhpcy5hcm1vciA9IG9wdGlvbnMuYXJtb3IgPz8gbnVsbFxyXG4gICAgICAgIHRoaXMuc2hpZWxkID0gb3B0aW9ucy5zaGllbGQgPz8gbnVsbFxyXG4gICAgICAgIHRoaXMucmluZyA9IG9wdGlvbnMucmluZyA/PyBudWxsXHJcbiAgICAgICAgdGhpcy5saWdodFJhZGl1cyA9IG9wdGlvbnMubGlnaHRSYWRpdXNcclxuICAgICAgICB0aGlzLmludmVudG9yeSA9IG9wdGlvbnMuaW52ZW50b3J5ID8gWy4uLm9wdGlvbnMuaW52ZW50b3J5XSA6IFtdXHJcbiAgICAgICAgdGhpcy5nb2xkID0gb3B0aW9ucy5nb2xkID8/IDBcclxuICAgIH1cclxuXHJcbiAgICBnZXQgc3RyZW5ndGgoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5iYXNlU3RyZW5ndGggKyAodGhpcy5yaW5nPy5zdHJlbmd0aCA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBhZ2lsaXR5KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYmFzZUFnaWxpdHkgKyAodGhpcy5yaW5nPy5hZ2lsaXR5ID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGludGVsbGlnZW5jZSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJhc2VJbnRlbGxpZ2VuY2UgKyAodGhpcy5yaW5nPy5pbnRlbGxpZ2VuY2UgPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgbWF4SGVhbHRoKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYmFzZU1heEhlYWx0aCArICh0aGlzLnJpbmc/Lm1heEhlYWx0aCA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBtZWxlZUF0dGFjaygpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnN0cmVuZ3RoICsgKHRoaXMubWVsZWVXZWFwb24/LmF0dGFjayA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBtZWxlZURhbWFnZSgpOiBEaWNlIHtcclxuICAgICAgICByZXR1cm4gKHRoaXMubWVsZWVXZWFwb24/LmRhbWFnZSA/PyBuZXcgRGljZSgxLCAyKSkuYWRkKHRoaXMuc3RyZW5ndGgpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHJhbmdlZEF0dGFjaygpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFnaWxpdHkgKyAodGhpcy5yYW5nZWRXZWFwb24/LmF0dGFjayA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCByYW5nZWREYW1hZ2UoKTogRGljZSB8IG51bGwge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnJhbmdlZFdlYXBvbj8uZGFtYWdlPy5hZGQodGhpcy5hZ2lsaXR5KSA/PyBudWxsXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGRlZmVuc2UoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hZ2lsaXR5ICsgKHRoaXMuYXJtb3I/LmRlZmVuc2UgPz8gMCkgKyAodGhpcy5oZWxtPy5kZWZlbnNlID8/IDApICsgKHRoaXMuc2hpZWxkPy5kZWZlbnNlID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgaXNFcXVpcHBlZChpdGVtOiBJdGVtKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLmVxdWlwbWVudCgpXS5pbmNsdWRlcyhpdGVtKVxyXG4gICAgfVxyXG5cclxuICAgICplcXVpcG1lbnQoKTogSXRlcmFibGU8SXRlbT4ge1xyXG4gICAgICAgIGlmICh0aGlzLm1lbGVlV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMubWVsZWVXZWFwb25cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnJhbmdlZFdlYXBvbikge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLnJhbmdlZFdlYXBvblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYXJtb3IpIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5hcm1vclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaGVsbSkge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLmhlbG1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnNoaWVsZCkge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLnNoaWVsZFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucmluZykge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLnJpbmdcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogUGxheWVyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFBsYXllcih0aGlzKVxyXG4gICAgfVxyXG5cclxuICAgIGVxdWlwKGl0ZW06IEl0ZW0pIHtcclxuICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIE1lbGVlV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWVsZWVXZWFwb24gPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgUmFuZ2VkV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmFuZ2VkV2VhcG9uID0gaXRlbVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIEFybW9yKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXJtb3IgPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgU2hpZWxkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hpZWxkID0gaXRlbVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIEhlbG0pIHtcclxuICAgICAgICAgICAgdGhpcy5oZWxtID0gaXRlbVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIFJpbmcpIHtcclxuICAgICAgICAgICAgdGhpcy5yaW5nID0gaXRlbVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZW1vdmUoaXRlbTogSXRlbSkge1xyXG4gICAgICAgIGlmICh0aGlzLm1lbGVlV2VhcG9uID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWVsZWVXZWFwb24gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5yYW5nZWRXZWFwb24gPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5yYW5nZWRXZWFwb24gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5hcm1vciA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLmFybW9yID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaGVsbSA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLmhlbG0gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5zaGllbGQgPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5zaGllbGQgPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5yaW5nID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmluZyA9IG51bGxcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZGVsZXRlKGl0ZW06IEl0ZW0pIHtcclxuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuaW52ZW50b3J5LmluZGV4T2YoaXRlbSk7XHJcbiAgICAgICAgaWYgKGluZGV4ID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5pbnZlbnRvcnkuc3BsaWNlKGluZGV4LCAxKVxyXG4gICAgICAgICAgICB0aGlzLnJlbW92ZShpdGVtKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzYXZlKCk6IFBsYXllclNhdmVTdGF0ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMuaWQsXHJcbiAgICAgICAgICAgIGJhc2VTdHJlbmd0aDogdGhpcy5iYXNlU3RyZW5ndGgsXHJcbiAgICAgICAgICAgIGJhc2VJbnRlbGxpZ2VuY2U6IHRoaXMuYmFzZUludGVsbGlnZW5jZSxcclxuICAgICAgICAgICAgYmFzZUFnaWxpdHk6IHRoaXMuYmFzZUFnaWxpdHksXHJcbiAgICAgICAgICAgIGJhc2VNYXhIZWFsdGg6IHRoaXMuYmFzZU1heEhlYWx0aCxcclxuICAgICAgICAgICAgbGV2ZWw6IHRoaXMubGV2ZWwsXHJcbiAgICAgICAgICAgIGV4cGVyaWVuY2U6IHRoaXMuZXhwZXJpZW5jZSxcclxuICAgICAgICAgICAgaGVhbHRoOiB0aGlzLmhlYWx0aCxcclxuICAgICAgICAgICAgbWVsZWVXZWFwb246IHRoaXMubWVsZWVXZWFwb24gPyB0aGlzLmludmVudG9yeS5pbmRleE9mKHRoaXMubWVsZWVXZWFwb24pIDogLTEsXHJcbiAgICAgICAgICAgIHJhbmdlZFdlYXBvbjogdGhpcy5yYW5nZWRXZWFwb24gPyB0aGlzLmludmVudG9yeS5pbmRleE9mKHRoaXMucmFuZ2VkV2VhcG9uKSA6IC0xLFxyXG4gICAgICAgICAgICBhcm1vcjogdGhpcy5hcm1vciA/IHRoaXMuaW52ZW50b3J5LmluZGV4T2YodGhpcy5hcm1vcikgOiAtMSxcclxuICAgICAgICAgICAgaGVsbTogdGhpcy5oZWxtID8gdGhpcy5pbnZlbnRvcnkuaW5kZXhPZih0aGlzLmhlbG0pIDogLTEsXHJcbiAgICAgICAgICAgIHNoaWVsZDogdGhpcy5zaGllbGQgPyB0aGlzLmludmVudG9yeS5pbmRleE9mKHRoaXMuc2hpZWxkKSA6IC0xLFxyXG4gICAgICAgICAgICByaW5nOiB0aGlzLnJpbmcgPyB0aGlzLmludmVudG9yeS5pbmRleE9mKHRoaXMucmluZykgOiAtMSxcclxuICAgICAgICAgICAgaW52ZW50b3J5OiB0aGlzLmludmVudG9yeS5tYXAoaSA9PiBpLmlkKSxcclxuICAgICAgICAgICAgZ29sZDogdGhpcy5nb2xkLFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBsb2FkKGRiOiBUaGluZ0RCLCBzdGF0ZTogUGxheWVyU2F2ZVN0YXRlKSB7XHJcbiAgICAgICAgdGhpcy5iYXNlU3RyZW5ndGggPSBzdGF0ZS5iYXNlU3RyZW5ndGhcclxuICAgICAgICB0aGlzLmJhc2VJbnRlbGxpZ2VuY2UgPSBzdGF0ZS5iYXNlSW50ZWxsaWdlbmNlXHJcbiAgICAgICAgdGhpcy5iYXNlQWdpbGl0eSA9IHN0YXRlLmJhc2VBZ2lsaXR5XHJcbiAgICAgICAgdGhpcy5iYXNlTWF4SGVhbHRoID0gc3RhdGUuYmFzZU1heEhlYWx0aFxyXG4gICAgICAgIHRoaXMubGV2ZWwgPSBzdGF0ZS5sZXZlbFxyXG4gICAgICAgIHRoaXMuZXhwZXJpZW5jZSA9IHN0YXRlLmV4cGVyaWVuY2VcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IHN0YXRlLmhlYWx0aFxyXG5cclxuICAgICAgICB0aGlzLmludmVudG9yeSA9IHN0YXRlLmludmVudG9yeS5tYXAoaWQgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gZGIuZ2V0KGlkKVxyXG4gICAgICAgICAgICBpZiAoIShpdGVtIGluc3RhbmNlb2YgSXRlbSkpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIm5vbi1pdGVtIGluIGludmVudG9yeSwgbG9hZCBmYWlsZWQuXCIpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBpdGVtLmNsb25lKClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBpZiAoc3RhdGUubWVsZWVXZWFwb24gPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmVxdWlwKHRoaXMuaW52ZW50b3J5W3N0YXRlLm1lbGVlV2VhcG9uXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLm1lbGVlV2VhcG9uID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHN0YXRlLnJhbmdlZFdlYXBvbiA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXF1aXAodGhpcy5pbnZlbnRvcnlbc3RhdGUucmFuZ2VkV2VhcG9uXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnJhbmdlZFdlYXBvbiA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzdGF0ZS5oZWxtID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lcXVpcCh0aGlzLmludmVudG9yeVtzdGF0ZS5oZWxtXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmhlbG0gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3RhdGUuYXJtb3IgPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmVxdWlwKHRoaXMuaW52ZW50b3J5W3N0YXRlLmFybW9yXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmFybW9yID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHN0YXRlLnNoaWVsZCA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXF1aXAodGhpcy5pbnZlbnRvcnlbc3RhdGUuc2hpZWxkXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnNoaWVsZCA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzdGF0ZS5yaW5nID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5lcXVpcCh0aGlzLmludmVudG9yeVtzdGF0ZS5yaW5nXSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnJpbmcgPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmdvbGQgPSBzdGF0ZS5nb2xkXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXR0YWNrT3B0aW9ucyB7XHJcbiAgICBhdHRhY2s6IG51bWJlclxyXG4gICAgZGFtYWdlOiBEaWNlXHJcbiAgICBhY3Rpb246IG51bWJlclxyXG4gICAgcmFuZ2U/OiBudW1iZXJcclxuICAgIHZlcmI/OiBzdHJpbmdcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEF0dGFjayB7XHJcbiAgICBhdHRhY2s6IG51bWJlclxyXG4gICAgZGFtYWdlOiBEaWNlXHJcbiAgICBhY3Rpb246IG51bWJlclxyXG4gICAgcmFuZ2U6IG51bWJlclxyXG4gICAgdmVyYjogc3RyaW5nXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQXR0YWNrT3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMuYXR0YWNrID0gb3B0aW9ucy5hdHRhY2sgPz8gMFxyXG4gICAgICAgIHRoaXMuZGFtYWdlID0gb3B0aW9ucy5kYW1hZ2UuY2xvbmUoKVxyXG4gICAgICAgIHRoaXMuYWN0aW9uID0gb3B0aW9ucy5hY3Rpb25cclxuICAgICAgICB0aGlzLnJhbmdlID0gb3B0aW9ucy5yYW5nZSA/PyAxXHJcbiAgICAgICAgdGhpcy52ZXJiID0gb3B0aW9ucy52ZXJiID8/IFwiXCJcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBBdHRhY2sge1xyXG4gICAgICAgIHJldHVybiBuZXcgQXR0YWNrKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBlbnVtIE1vbnN0ZXJTdGF0ZSB7XHJcbiAgICBpZGxlLFxyXG4gICAgYWdncm9cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNb25zdGVyT3B0aW9ucyBleHRlbmRzIENyZWF0dXJlT3B0aW9ucyB7XHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxuICAgIGV4cGVyaWVuY2U6IG51bWJlcixcclxuICAgIGF0dGFja3M6IEF0dGFja1tdXHJcbiAgICBmcmVxPzogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNb25zdGVyIGV4dGVuZHMgVGhpbmcgaW1wbGVtZW50cyBDcmVhdHVyZSB7XHJcbiAgICByZWFkb25seSBhZ2lsaXR5OiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGRlZmVuc2U6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgbWF4SGVhbHRoOiBudW1iZXJcclxuICAgIGhlYWx0aDogbnVtYmVyXHJcbiAgICByZWFkb25seSBleHBlcmllbmNlOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGF0dGFja3M6IEF0dGFja1tdID0gW11cclxuICAgIHN0YXRlOiBNb25zdGVyU3RhdGUgPSBNb25zdGVyU3RhdGUuaWRsZVxyXG4gICAgYWN0aW9uOiBudW1iZXIgPSAwXHJcbiAgICBhY3Rpb25SZXNlcnZlOiBudW1iZXIgPSAwXHJcbiAgICByZWFkb25seSBsZXZlbDogbnVtYmVyXHJcbiAgICByZWFkb25seSBmcmVxOiBudW1iZXIgPSAxXHJcbiAgICByZWFkb25seSBnb2xkOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBNb25zdGVyT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuYWdpbGl0eSA9IG9wdGlvbnMuYWdpbGl0eSA/PyAwXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlID0gb3B0aW9ucy5kZWZlbnNlID8/IDBcclxuICAgICAgICB0aGlzLm1heEhlYWx0aCA9IG9wdGlvbnMubWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5oZWFsdGggPSBvcHRpb25zLmhlYWx0aCA/PyB0aGlzLm1heEhlYWx0aFxyXG4gICAgICAgIHRoaXMuZXhwZXJpZW5jZSA9IG9wdGlvbnMuZXhwZXJpZW5jZVxyXG4gICAgICAgIHRoaXMuYXR0YWNrcyA9IFsuLi5vcHRpb25zLmF0dGFja3NdXHJcbiAgICAgICAgdGhpcy5sZXZlbCA9IG9wdGlvbnMubGV2ZWxcclxuICAgICAgICB0aGlzLmZyZXEgPSBvcHRpb25zLmZyZXEgPz8gMVxyXG4gICAgICAgIHRoaXMuZ29sZCA9IG9wdGlvbnMuZ29sZCA/PyAwXHJcblxyXG4gICAgICAgIGlmICh0aGlzLmF0dGFja3MubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBhdHRhY2tzIGRlZmluZWQgZm9yIG1vbnN0ZXIgJHt0aGlzLm5hbWV9YClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogTW9uc3RlciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNb25zdGVyKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29udGFpbmVyT3B0aW9ucyB7XHJcbiAgICBpZDogc3RyaW5nXHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlOiBzdHJpbmdcclxuICAgIGNvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICBpdGVtcz86IFNldDxJdGVtPlxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ29udGFpbmVyIGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICByZWFkb25seSBpdGVtczogU2V0PEl0ZW0+XHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQ29udGFpbmVyT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuaXRlbXMgPSBuZXcgU2V0PEl0ZW0+KFsuLi5vcHRpb25zLml0ZW1zID8/IFtdXSlcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBDb250YWluZXIge1xyXG4gICAgICAgIHJldHVybiBuZXcgQ29udGFpbmVyKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNvbnN0IGxldmVscyA9IFtcclxuICAgIDEwLFxyXG4gICAgMjAsXHJcbiAgICA1MCxcclxuICAgIDEwMCxcclxuICAgIDIwMCxcclxuICAgIDUwMCxcclxuICAgIDEwMDAsXHJcbiAgICAyMDAwLFxyXG4gICAgNTAwMCxcclxuICAgIDEwMDAwXVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cGVyaWVuY2VSZXF1aXJlbWVudChsZXZlbDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGlmIChsZXZlbCA8IDIpIHtcclxuICAgICAgICByZXR1cm4gMFxyXG4gICAgfVxyXG5cclxuICAgIGlmIChsZXZlbCAtIDIgPj0gbGV2ZWxzLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiBJbmZpbml0eVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBsZXZlbHNbbGV2ZWwgLSAyXVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGFibGU8VCBleHRlbmRzIFRoaW5nPiB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBUPigpO1xyXG5cclxuICAgIGluc2VydCh0aGluZzogVCk6IFQge1xyXG4gICAgICAgIGlmICh0aGlzLmhhcyh0aGluZy5pZCkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBdHRlbXB0IHRvIGluc2VydCBkdXBsaWNhdGUgaWQgb2YgJHt0aGluZy5pZH1gKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYXAuc2V0KHRoaW5nLmlkLCB0aGluZylcclxuICAgICAgICByZXR1cm4gdGhpbmdcclxuICAgIH1cclxuXHJcbiAgICBoYXMoaWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1hcC5oYXMoaWQpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0KGlkOiBzdHJpbmcpOiBUIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAuZ2V0KGlkKVxyXG4gICAgfVxyXG5cclxuICAgICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBHZW5lcmF0b3I8VD4ge1xyXG4gICAgICAgIGZvciAoY29uc3QgW18sIHZdIG9mIHRoaXMubWFwKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHZcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUaGluZ0RCIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbWFwID0gbmV3IE1hcDxzdHJpbmcsIFRoaW5nPigpXHJcblxyXG4gICAgaW5zZXJ0PFQgZXh0ZW5kcyBUaGluZz4odGhpbmc6IFQpOiBUIHtcclxuICAgICAgICBpZiAodGhpcy5oYXModGhpbmcuaWQpKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQXR0ZW1wdCB0byBpbnNlcnQgZHVwbGljYXRlIGlkIG9mICR7dGhpbmcuaWR9YClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubWFwLnNldCh0aGluZy5pZCwgdGhpbmcpXHJcbiAgICAgICAgcmV0dXJuIHRoaW5nXHJcbiAgICB9XHJcblxyXG4gICAgaGFzKGlkOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAuaGFzKGlkKVxyXG4gICAgfVxyXG5cclxuICAgIGdldChpZDogc3RyaW5nKTogVGhpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1hcC5nZXQoaWQpXHJcbiAgICB9XHJcblxyXG4gICAgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEdlbmVyYXRvcjxUaGluZz4ge1xyXG4gICAgICAgIGZvciAoY29uc3QgW18sIHZdIG9mIHRoaXMubWFwKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHZcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUGxheWVyU2F2ZVN0YXRlIHtcclxuICAgIGlkOiBzdHJpbmcsXHJcbiAgICBiYXNlU3RyZW5ndGg6IG51bWJlclxyXG4gICAgYmFzZUludGVsbGlnZW5jZTogbnVtYmVyXHJcbiAgICBiYXNlQWdpbGl0eTogbnVtYmVyXHJcbiAgICBiYXNlTWF4SGVhbHRoOiBudW1iZXJcclxuICAgIGxldmVsOiBudW1iZXJcclxuICAgIGV4cGVyaWVuY2U6IG51bWJlclxyXG4gICAgaGVhbHRoOiBudW1iZXJcclxuICAgIG1lbGVlV2VhcG9uOiBudW1iZXJcclxuICAgIHJhbmdlZFdlYXBvbjogbnVtYmVyXHJcbiAgICBhcm1vcjogbnVtYmVyXHJcbiAgICBoZWxtOiBudW1iZXJcclxuICAgIHNoaWVsZDogbnVtYmVyXHJcbiAgICByaW5nOiBudW1iZXJcclxuICAgIGludmVudG9yeTogc3RyaW5nW10sXHJcbiAgICBnb2xkOiBudW1iZXIsXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBhIHdlaWdodGVkIGxpc3QgZnJvbSB3aGljaCBhIHJhbmRvbSBzZWxlY3Rpb24gY2FuIGJlIGRyYXduLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFdlaWdodGVkTGlzdDxUPiB7XHJcbiAgICAvKipcclxuICAgICAqIGNvbnN0cnVjdG9yXHJcbiAgICAgKiBAcGFyYW0gZGF0YSBsaXN0IG9mIFtpdGVtLCByZWxhdGl2ZSB3ZWlnaHRdIGl0ZW1zXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgZGF0YTogW1QsIG51bWJlcl1bXSkge1xyXG4gICAgICAgIGNvbnN0IHRvdGFsID0gZGF0YS5tYXAoeCA9PiB4WzFdKS5yZWR1Y2UoKHgsIHkpID0+IHggKyB5LCAwKVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgZGF0YVtpXVsxXSAvPSB0b3RhbFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZWxlY3Qocm5nOiByYW5kLlJORyk6IFQge1xyXG4gICAgICAgIGxldCBkaXN0ID0gcm5nLm5leHQoKVxyXG4gICAgICAgIGZvciAoY29uc3QgW3gsIHddIG9mIHRoaXMuZGF0YSkge1xyXG4gICAgICAgICAgICBkaXN0IC09IHdcclxuICAgICAgICAgICAgaWYgKGRpc3QgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHhcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBvciBlbXB0eSBsaXN0LCBubyBzZWxlY3Rpb24gbWFkZVwiKVxyXG4gICAgfVxyXG59Il19