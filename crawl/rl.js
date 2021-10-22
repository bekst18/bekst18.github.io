/**
 * rogue-like library
 */
import * as geo from "../shared/geo2d.js";
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
        var _a, _b, _c;
        this.color = new gfx.Color(1, 1, 1, 1);
        this.visible = Visibility.None;
        this.position = (_b = (_a = options.position) === null || _a === void 0 ? void 0 : _a.clone()) !== null && _b !== void 0 ? _b : new geo.Point(-1, -1);
        this.passable = options.passable;
        this.transparent = options.transparent;
        this.name = options.name;
        this.image = (_c = options.image) !== null && _c !== void 0 ? _c : "";
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
export class StairsUp extends Fixture {
    clone() {
        return new StairsUp(this);
    }
}
export class StairsDown extends Fixture {
    clone() {
        return new StairsDown(this);
    }
}
export class Item extends Thing {
    constructor(options) {
        super(Object.assign({ passable: false, transparent: true }, options));
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
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
        this.inventory = options.inventory ? new Set(options.inventory) : new Set();
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
        console.log(item);
        if (item instanceof MeleeWeapon) {
            this.meleeWeapon = item;
        }
        else if (item instanceof RangedWeapon) {
            console.log("ranged weapon");
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
        if (isEquippable(item)) {
            this.remove(item);
        }
        this.inventory.delete(item);
    }
    toJSON() {
        return {
            position: this.position.toJSON(),
            name: this.name,
            image: this.image,
            color: this.color,
            maxHealth: this.maxHealth,
            health: this.health,
            agility: this.agility,
            lightRadius: this.lightRadius,
            level: this.level,
            experience: this.experience,
            strength: this.strength,
            intelligence: this.intelligence,
            meleeWeapon: this.meleeWeapon,
            rangedWeapon: this.rangedWeapon,
            armor: this.armor,
            helm: this.helm,
            shield: this.shield,
            ring: this.ring,
            inventory: this.inventory,
        };
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
        var _a, _b, _c;
        super(Object.assign({ passable: false, transparent: true }, options));
        this.attacks = [];
        this.state = MonsterState.idle;
        this.action = 0;
        this.actionReserve = 0;
        this.agility = (_a = options.agility) !== null && _a !== void 0 ? _a : 0;
        this.defense = (_b = options.defense) !== null && _b !== void 0 ? _b : 0;
        this.maxHealth = options.maxHealth;
        this.health = (_c = options.health) !== null && _c !== void 0 ? _c : this.maxHealth;
        this.experience = options.experience;
        this.attacks = [...options.attacks];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJybC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUNILE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQixNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFBO0FBRTFCLE1BQU0sQ0FBTixJQUFZLFVBSVg7QUFKRCxXQUFZLFVBQVU7SUFDbEIsMkNBQUksQ0FBQTtJQUNKLHlDQUFHLENBQUE7SUFDSCxpREFBTyxDQUFBO0FBQ1gsQ0FBQyxFQUpXLFVBQVUsS0FBVixVQUFVLFFBSXJCO0FBV0QsTUFBTSxPQUFPLEtBQUs7SUFTZCxZQUFZLE9BQXFCOztRQUhqQyxVQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLFlBQU8sR0FBZSxVQUFVLENBQUMsSUFBSSxDQUFBO1FBR2pDLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBQSxNQUFBLE9BQU8sQ0FBQyxRQUFRLDBDQUFFLEtBQUssRUFBRSxtQ0FBSSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsRSxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUE7UUFDaEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQTtRQUN4QixJQUFJLENBQUMsS0FBSyxHQUFHLE1BQUEsT0FBTyxDQUFDLEtBQUssbUNBQUksRUFBRSxDQUFBO1FBRWhDLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRTtZQUNmLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQTtTQUM3QjtJQUNMLENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMxQixDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sSUFBSTtJQUNiLFlBQXFCLE1BQWMsQ0FBQyxFQUFXLE1BQWMsQ0FBQztRQUF6QyxRQUFHLEdBQUgsR0FBRyxDQUFZO1FBQVcsUUFBRyxHQUFILEdBQUcsQ0FBWTtJQUFJLENBQUM7SUFFbkUsSUFBSSxDQUFDLEdBQWE7UUFDZCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQVM7UUFDVCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFRCxRQUFRO1FBQ0osT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLE1BQU0sSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ3RDLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxJQUFLLFNBQVEsS0FBSztJQUMzQixLQUFLO1FBQ0QsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN6QixDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sT0FBUSxTQUFRLEtBQUs7SUFDOUIsS0FBSztRQUNELE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDNUIsQ0FBQztDQUNKO0FBRUQsTUFBTSxPQUFPLElBQUssU0FBUSxPQUFPO0lBQzdCLEtBQUs7UUFDRCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3pCLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxRQUFTLFNBQVEsT0FBTztJQUNqQyxLQUFLO1FBQ0QsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM3QixDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sVUFBVyxTQUFRLE9BQU87SUFDbkMsS0FBSztRQUNELE9BQU8sSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDL0IsQ0FBQztDQUNKO0FBU0QsTUFBTSxPQUFPLElBQUssU0FBUSxLQUFLO0lBQzNCLFlBQVksT0FBb0I7UUFDNUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7Q0FDSjtBQVVELE1BQU0sT0FBTyxNQUFPLFNBQVEsSUFBSTtJQU81QixZQUFZLE9BQXNCOztRQUM5QixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDZCxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7UUFDNUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3BDLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBQSxPQUFPLENBQUMsS0FBSyxtQ0FBSSxDQUFDLENBQUE7UUFDL0IsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFBLE9BQU8sQ0FBQyxJQUFJLG1DQUFJLEVBQUUsQ0FBQTtRQUM5QixJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7SUFDaEMsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzNCLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxZQUFhLFNBQVEsTUFBTTtJQUNwQyxLQUFLO1FBQ0QsT0FBTyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sV0FBWSxTQUFRLE1BQU07SUFDbkMsS0FBSztRQUNELE9BQU8sSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDaEMsQ0FBQztDQUNKO0FBTUQsTUFBTSxPQUFPLEtBQU0sU0FBUSxJQUFJO0lBRzNCLFlBQVksT0FBcUI7UUFDN0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2QsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMxQixDQUFDO0NBQ0o7QUFNRCxNQUFNLE9BQU8sSUFBSyxTQUFRLElBQUk7SUFHMUIsWUFBWSxPQUFvQjtRQUM1QixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDZCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUE7SUFDbEMsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3pCLENBQUM7Q0FDSjtBQU1ELE1BQU0sT0FBTyxNQUFPLFNBQVEsSUFBSTtJQUc1QixZQUFZLE9BQXNCO1FBQzlCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNkLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQTtJQUNsQyxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDM0IsQ0FBQztDQUNKO0FBU0QsTUFBTSxPQUFPLElBQUssU0FBUSxJQUFJO0lBTTFCLFlBQVksT0FBb0I7O1FBQzVCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNkLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBQSxPQUFPLENBQUMsUUFBUSxtQ0FBSSxDQUFDLENBQUE7UUFDckMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFBLE9BQU8sQ0FBQyxPQUFPLG1DQUFJLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsWUFBWSxHQUFHLE1BQUEsT0FBTyxDQUFDLFlBQVksbUNBQUksQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBQSxPQUFPLENBQUMsU0FBUyxtQ0FBSSxDQUFDLENBQUE7SUFDM0MsQ0FBQztDQUNKO0FBSUQsTUFBTSxVQUFVLFlBQVksQ0FBQyxJQUFVO0lBQ25DLE9BQU8sSUFBSSxZQUFZLE1BQU0sSUFBSSxJQUFJLFlBQVksS0FBSyxJQUFJLElBQUksWUFBWSxNQUFNLENBQUE7QUFDcEYsQ0FBQztBQVVELE1BQU0sT0FBTyxNQUFPLFNBQVEsSUFBSTtJQUc1QixZQUFZLE9BQXNCO1FBQzlCLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUN0RSxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7SUFDaEMsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzNCLENBQUM7Q0FDSjtBQXFDRCxNQUFNLE9BQU8sTUFBTyxTQUFRLEtBQUs7SUFtQjdCLFlBQVksT0FBc0I7O1FBQzlCLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQVp6RSxXQUFNLEdBQVcsQ0FBQyxDQUFBO1FBQ2xCLGtCQUFhLEdBQVcsQ0FBQyxDQUFBO1FBWXJCLElBQUksQ0FBQyxZQUFZLEdBQUcsTUFBQSxPQUFPLENBQUMsUUFBUSxtQ0FBSSxDQUFDLENBQUE7UUFDekMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE1BQUEsT0FBTyxDQUFDLFFBQVEsbUNBQUksQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBQSxPQUFPLENBQUMsT0FBTyxtQ0FBSSxDQUFDLENBQUE7UUFDdkMsSUFBSSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBQSxPQUFPLENBQUMsS0FBSyxtQ0FBSSxDQUFDLENBQUE7UUFDL0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFBLE9BQU8sQ0FBQyxVQUFVLG1DQUFJLENBQUMsQ0FBQTtRQUN6QyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQUEsT0FBTyxDQUFDLE1BQU0sbUNBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQTtRQUM5QyxJQUFJLENBQUMsV0FBVyxHQUFHLE1BQUEsT0FBTyxDQUFDLFdBQVcsbUNBQUksSUFBSSxDQUFBO1FBQzlDLElBQUksQ0FBQyxZQUFZLEdBQUcsTUFBQSxPQUFPLENBQUMsWUFBWSxtQ0FBSSxJQUFJLENBQUE7UUFDaEQsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFBLE9BQU8sQ0FBQyxJQUFJLG1DQUFJLElBQUksQ0FBQTtRQUNoQyxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQUEsT0FBTyxDQUFDLEtBQUssbUNBQUksSUFBSSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBQSxPQUFPLENBQUMsTUFBTSxtQ0FBSSxJQUFJLENBQUE7UUFDcEMsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFBLE9BQU8sQ0FBQyxJQUFJLG1DQUFJLElBQUksQ0FBQTtRQUNoQyxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUE7UUFDdEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBTyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFRLENBQUE7SUFDM0YsQ0FBQztJQUVELElBQUksUUFBUTs7UUFDUixPQUFPLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxNQUFBLE1BQUEsSUFBSSxDQUFDLElBQUksMENBQUUsUUFBUSxtQ0FBSSxDQUFDLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRUQsSUFBSSxPQUFPOztRQUNQLE9BQU8sSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLE1BQUEsTUFBQSxJQUFJLENBQUMsSUFBSSwwQ0FBRSxPQUFPLG1DQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxJQUFJLFlBQVk7O1FBQ1osT0FBTyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxNQUFBLE1BQUEsSUFBSSxDQUFDLElBQUksMENBQUUsWUFBWSxtQ0FBSSxDQUFDLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRUQsSUFBSSxTQUFTOztRQUNULE9BQU8sSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLE1BQUEsTUFBQSxJQUFJLENBQUMsSUFBSSwwQ0FBRSxTQUFTLG1DQUFJLENBQUMsQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFRCxJQUFJLFdBQVc7O1FBQ1gsT0FBTyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsTUFBQSxNQUFBLElBQUksQ0FBQyxXQUFXLDBDQUFFLE1BQU0sbUNBQUksQ0FBQyxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVELElBQUksV0FBVzs7UUFDWCxPQUFPLENBQUMsTUFBQSxNQUFBLElBQUksQ0FBQyxXQUFXLDBDQUFFLE1BQU0sbUNBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMxRSxDQUFDO0lBRUQsSUFBSSxZQUFZOztRQUNaLE9BQU8sSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLE1BQUEsTUFBQSxJQUFJLENBQUMsWUFBWSwwQ0FBRSxNQUFNLG1DQUFJLENBQUMsQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFRCxJQUFJLFlBQVk7O1FBQ1osT0FBTyxNQUFBLE1BQUEsTUFBQSxJQUFJLENBQUMsWUFBWSwwQ0FBRSxNQUFNLDBDQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLG1DQUFJLElBQUksQ0FBQTtJQUMvRCxDQUFDO0lBRUQsSUFBSSxPQUFPOztRQUNQLE9BQU8sSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLE1BQUEsTUFBQSxJQUFJLENBQUMsS0FBSywwQ0FBRSxPQUFPLG1DQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBQSxNQUFBLElBQUksQ0FBQyxJQUFJLDBDQUFFLE9BQU8sbUNBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFBLE1BQUEsSUFBSSxDQUFDLE1BQU0sMENBQUUsT0FBTyxtQ0FBSSxDQUFDLENBQUMsQ0FBQTtJQUM5RyxDQUFDO0lBRUQsVUFBVSxDQUFDLElBQVU7UUFDakIsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFRCxDQUFDLFNBQVM7UUFDTixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDbEIsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFBO1NBQ3pCO1FBRUQsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ25CLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQTtTQUMxQjtRQUVELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNaLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQTtTQUNuQjtRQUVELElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUNYLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQTtTQUNsQjtRQUVELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNiLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQTtTQUNwQjtRQUVELElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUNYLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQTtTQUNsQjtJQUNMLENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMzQixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQVU7UUFDWixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2pCLElBQUksSUFBSSxZQUFZLFdBQVcsRUFBRTtZQUM3QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtTQUMxQjthQUFNLElBQUksSUFBSSxZQUFZLFlBQVksRUFBRTtZQUNyQyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQzVCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO1NBQzNCO2FBQU0sSUFBSSxJQUFJLFlBQVksS0FBSyxFQUFFO1lBQzlCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1NBQ3BCO2FBQU0sSUFBSSxJQUFJLFlBQVksTUFBTSxFQUFFO1lBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO1NBQ3JCO2FBQU0sSUFBSSxJQUFJLFlBQVksSUFBSSxFQUFFO1lBQzdCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1NBQ25CO2FBQU0sSUFBSSxJQUFJLFlBQVksSUFBSSxFQUFFO1lBQzdCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1NBQ25CO0lBQ0wsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFVO1FBQ2IsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLElBQUksRUFBRTtZQUMzQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtTQUMxQjtRQUVELElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxJQUFJLEVBQUU7WUFDNUIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7U0FDM0I7UUFFRCxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxFQUFFO1lBQ3JCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1NBQ3BCO1FBRUQsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtZQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtTQUNuQjtRQUVELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxJQUFJLEVBQUU7WUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7U0FDckI7UUFFRCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO1lBQ3BCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1NBQ25CO0lBQ0wsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFVO1FBRWIsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtTQUNwQjtRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQy9CLENBQUM7SUFFRCxNQUFNO1FBQ0YsT0FBTztZQUNILFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtZQUNoQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtZQUMvQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztTQUM1QixDQUFBO0lBQ0wsQ0FBQztDQUNKO0FBVUQsTUFBTSxPQUFPLE1BQU07SUFPZixZQUFZLE9BQXNCOztRQUM5QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQUEsT0FBTyxDQUFDLE1BQU0sbUNBQUksQ0FBQyxDQUFBO1FBQ2pDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNwQyxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7UUFDNUIsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFBLE9BQU8sQ0FBQyxLQUFLLG1DQUFJLENBQUMsQ0FBQTtRQUMvQixJQUFJLENBQUMsSUFBSSxHQUFHLE1BQUEsT0FBTyxDQUFDLElBQUksbUNBQUksRUFBRSxDQUFBO0lBQ2xDLENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMzQixDQUFDO0NBQ0o7QUFFRCxNQUFNLENBQU4sSUFBWSxZQUdYO0FBSEQsV0FBWSxZQUFZO0lBQ3BCLCtDQUFJLENBQUE7SUFDSixpREFBSyxDQUFBO0FBQ1QsQ0FBQyxFQUhXLFlBQVksS0FBWixZQUFZLFFBR3ZCO0FBUUQsTUFBTSxPQUFPLE9BQVEsU0FBUSxLQUFLO0lBVzlCLFlBQVksT0FBdUI7O1FBQy9CLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQU5oRSxZQUFPLEdBQWEsRUFBRSxDQUFBO1FBQy9CLFVBQUssR0FBaUIsWUFBWSxDQUFDLElBQUksQ0FBQTtRQUN2QyxXQUFNLEdBQVcsQ0FBQyxDQUFBO1FBQ2xCLGtCQUFhLEdBQVcsQ0FBQyxDQUFBO1FBSXJCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBQSxPQUFPLENBQUMsT0FBTyxtQ0FBSSxDQUFDLENBQUE7UUFDbkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFBLE9BQU8sQ0FBQyxPQUFPLG1DQUFJLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUE7UUFDbEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFBLE9BQU8sQ0FBQyxNQUFNLG1DQUFJLElBQUksQ0FBQyxTQUFTLENBQUE7UUFDOUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFBO1FBQ3BDLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUVuQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtZQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLGtDQUFrQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtTQUNqRTtJQUNMLENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM1QixDQUFDO0NBQ0o7QUFVRCxNQUFNLE9BQU8sU0FBVSxTQUFRLE9BQU87SUFHbEMsWUFBWSxPQUF5Qjs7UUFDakMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3JFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQU8sQ0FBQyxHQUFHLE1BQUEsT0FBTyxDQUFDLEtBQUssbUNBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDOUIsQ0FBQztDQUNKO0FBRUQsTUFBTSxNQUFNLEdBQUc7SUFDWCxFQUFFO0lBQ0YsRUFBRTtJQUNGLEVBQUU7SUFDRixHQUFHO0lBQ0gsR0FBRztJQUNILEdBQUc7SUFDSCxJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixLQUFLO0NBQUMsQ0FBQTtBQUVWLE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxLQUFhO0lBQ2xELElBQUksS0FBSyxHQUFHLENBQUMsRUFBRTtRQUNYLE9BQU8sQ0FBQyxDQUFBO0tBQ1g7SUFFRCxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRTtRQUM1QixPQUFPLFFBQVEsQ0FBQTtLQUNsQjtJQUVELE9BQU8sTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUM1QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIHJvZ3VlLWxpa2UgbGlicmFyeVxyXG4gKi9cclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvMmQuanNcIlxyXG5pbXBvcnQgKiBhcyByYW5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiXHJcbmltcG9ydCAqIGFzIGdmeCBmcm9tIFwiLi9nZnguanNcIlxyXG5cclxuZXhwb3J0IGNvbnN0IHRpbGVTaXplID0gMjRcclxuXHJcbmV4cG9ydCBlbnVtIFZpc2liaWxpdHkge1xyXG4gICAgTm9uZSxcclxuICAgIEZvZyxcclxuICAgIFZpc2libGVcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUaGluZ09wdGlvbnMge1xyXG4gICAgcG9zaXRpb24/OiBnZW8uUG9pbnRcclxuICAgIHBhc3NhYmxlOiBib29sZWFuXHJcbiAgICB0cmFuc3BhcmVudDogYm9vbGVhblxyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZT86IHN0cmluZ1xyXG4gICAgY29sb3I/OiBnZnguQ29sb3JcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRoaW5nIHtcclxuICAgIHBvc2l0aW9uOiBnZW8uUG9pbnRcclxuICAgIHBhc3NhYmxlOiBib29sZWFuXHJcbiAgICB0cmFuc3BhcmVudDogYm9vbGVhblxyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZTogc3RyaW5nXHJcbiAgICBjb2xvciA9IG5ldyBnZnguQ29sb3IoMSwgMSwgMSwgMSlcclxuICAgIHZpc2libGU6IFZpc2liaWxpdHkgPSBWaXNpYmlsaXR5Lk5vbmVcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBUaGluZ09wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbj8uY2xvbmUoKSA/PyBuZXcgZ2VvLlBvaW50KC0xLCAtMSlcclxuICAgICAgICB0aGlzLnBhc3NhYmxlID0gb3B0aW9ucy5wYXNzYWJsZVxyXG4gICAgICAgIHRoaXMudHJhbnNwYXJlbnQgPSBvcHRpb25zLnRyYW5zcGFyZW50XHJcbiAgICAgICAgdGhpcy5uYW1lID0gb3B0aW9ucy5uYW1lXHJcbiAgICAgICAgdGhpcy5pbWFnZSA9IG9wdGlvbnMuaW1hZ2UgPz8gXCJcIlxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5jb2xvcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvbG9yID0gb3B0aW9ucy5jb2xvclxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBUaGluZyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBUaGluZyh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRGljZSB7XHJcbiAgICBjb25zdHJ1Y3RvcihyZWFkb25seSBtaW46IG51bWJlciA9IDAsIHJlYWRvbmx5IG1heDogbnVtYmVyID0gMCkgeyB9XHJcblxyXG4gICAgcm9sbChybmc6IHJhbmQuUk5HKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gcmFuZC5pbnQocm5nLCB0aGlzLm1pbiwgdGhpcy5tYXggKyAxKVxyXG4gICAgfVxyXG5cclxuICAgIGFkZCh4OiBudW1iZXIpOiBEaWNlIHtcclxuICAgICAgICByZXR1cm4gbmV3IERpY2UodGhpcy5taW4gKyB4LCB0aGlzLm1heCArIHgpXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogRGljZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBEaWNlKHRoaXMubWluLCB0aGlzLm1heClcclxuICAgIH1cclxuXHJcbiAgICB0b1N0cmluZygpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBgJHt0aGlzLm1pbn0gLSAke3RoaXMubWF4fWBcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRpbGUgZXh0ZW5kcyBUaGluZyB7XHJcbiAgICBjbG9uZSgpOiBUaWxlIHtcclxuICAgICAgICByZXR1cm4gbmV3IFRpbGUodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEZpeHR1cmUgZXh0ZW5kcyBUaGluZyB7XHJcbiAgICBjbG9uZSgpOiBGaXh0dXJlIHtcclxuICAgICAgICByZXR1cm4gbmV3IEZpeHR1cmUodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIERvb3IgZXh0ZW5kcyBGaXh0dXJlIHtcclxuICAgIGNsb25lKCk6IERvb3Ige1xyXG4gICAgICAgIHJldHVybiBuZXcgRG9vcih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU3RhaXJzVXAgZXh0ZW5kcyBGaXh0dXJlIHtcclxuICAgIGNsb25lKCk6IFN0YWlyc1VwIHtcclxuICAgICAgICByZXR1cm4gbmV3IFN0YWlyc1VwKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTdGFpcnNEb3duIGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICBjbG9uZSgpOiBTdGFpcnNEb3duIHtcclxuICAgICAgICByZXR1cm4gbmV3IFN0YWlyc0Rvd24odGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJdGVtT3B0aW9ucyB7XHJcbiAgICBwb3NpdGlvbj86IGdlby5Qb2ludFxyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZT86IHN0cmluZ1xyXG4gICAgY29sb3I/OiBnZnguQ29sb3JcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEl0ZW0gZXh0ZW5kcyBUaGluZyB7XHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBJdGVtT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFdlYXBvbk9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICBhdHRhY2s6IG51bWJlclxyXG4gICAgcmFuZ2U/OiBudW1iZXJcclxuICAgIHZlcmI/OiBzdHJpbmdcclxuICAgIGFjdGlvbjogbnVtYmVyXHJcbiAgICBkYW1hZ2U6IERpY2VcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFdlYXBvbiBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgYXR0YWNrOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGRhbWFnZTogRGljZVxyXG4gICAgcmVhZG9ubHkgcmFuZ2U6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYWN0aW9uOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IHZlcmI6IHN0cmluZ1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFdlYXBvbk9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMuYXR0YWNrID0gb3B0aW9ucy5hdHRhY2tcclxuICAgICAgICB0aGlzLmRhbWFnZSA9IG9wdGlvbnMuZGFtYWdlLmNsb25lKClcclxuICAgICAgICB0aGlzLnJhbmdlID0gb3B0aW9ucy5yYW5nZSA/PyAxXHJcbiAgICAgICAgdGhpcy52ZXJiID0gb3B0aW9ucy52ZXJiID8/IFwiXCJcclxuICAgICAgICB0aGlzLmFjdGlvbiA9IG9wdGlvbnMuYWN0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogV2VhcG9uIHtcclxuICAgICAgICByZXR1cm4gbmV3IFdlYXBvbih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUmFuZ2VkV2VhcG9uIGV4dGVuZHMgV2VhcG9uIHtcclxuICAgIGNsb25lKCk6IFJhbmdlZFdlYXBvbiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBSYW5nZWRXZWFwb24odGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1lbGVlV2VhcG9uIGV4dGVuZHMgV2VhcG9uIHtcclxuICAgIGNsb25lKCk6IFdlYXBvbiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNZWxlZVdlYXBvbih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFybW9yT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIGRlZmVuc2U6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQXJtb3IgZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGRlZmVuc2U6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEFybW9yT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlID0gb3B0aW9ucy5kZWZlbnNlXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogQXJtb3Ige1xyXG4gICAgICAgIHJldHVybiBuZXcgQXJtb3IodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBIZWxtT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIGRlZmVuc2U6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgSGVsbSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgZGVmZW5zZTogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogSGVsbU9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMuZGVmZW5zZSA9IG9wdGlvbnMuZGVmZW5zZVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEhlbG0ge1xyXG4gICAgICAgIHJldHVybiBuZXcgSGVsbSh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNoaWVsZE9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNoaWVsZCBleHRlbmRzIEl0ZW0ge1xyXG4gICAgcmVhZG9ubHkgZGVmZW5zZTogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogU2hpZWxkT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlID0gb3B0aW9ucy5kZWZlbnNlXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogU2hpZWxkIHtcclxuICAgICAgICByZXR1cm4gbmV3IFNoaWVsZCh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJpbmdPcHRpb25zIGV4dGVuZHMgSXRlbU9wdGlvbnMge1xyXG4gICAgc3RyZW5ndGg/OiBudW1iZXJcclxuICAgIGFnaWxpdHk/OiBudW1iZXJcclxuICAgIGludGVsbGlnZW5jZT86IG51bWJlclxyXG4gICAgbWF4SGVhbHRoPzogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBSaW5nIGV4dGVuZHMgSXRlbSB7XHJcbiAgICBzdHJlbmd0aDogbnVtYmVyXHJcbiAgICBhZ2lsaXR5OiBudW1iZXJcclxuICAgIGludGVsbGlnZW5jZTogbnVtYmVyXHJcbiAgICBtYXhIZWFsdGg6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFJpbmdPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLnN0cmVuZ3RoID0gb3B0aW9ucy5zdHJlbmd0aCA/PyAwXHJcbiAgICAgICAgdGhpcy5hZ2lsaXR5ID0gb3B0aW9ucy5hZ2lsaXR5ID8/IDBcclxuICAgICAgICB0aGlzLmludGVsbGlnZW5jZSA9IG9wdGlvbnMuaW50ZWxsaWdlbmNlID8/IDBcclxuICAgICAgICB0aGlzLm1heEhlYWx0aCA9IG9wdGlvbnMubWF4SGVhbHRoID8/IDBcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IHR5cGUgRXF1aXBwYWJsZSA9IE1lbGVlV2VhcG9uIHwgUmFuZ2VkV2VhcG9uIHwgQXJtb3IgfCBIZWxtIHwgU2hpZWxkIHwgUmluZ1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGlzRXF1aXBwYWJsZShpdGVtOiBJdGVtKTogaXRlbSBpcyBFcXVpcHBhYmxlIHtcclxuICAgIHJldHVybiBpdGVtIGluc3RhbmNlb2YgV2VhcG9uIHx8IGl0ZW0gaW5zdGFuY2VvZiBBcm1vciB8fCBpdGVtIGluc3RhbmNlb2YgU2hpZWxkXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVXNhYmxlT3B0aW9ucyB7XHJcbiAgICBwb3NpdGlvbj86IGdlby5Qb2ludFxyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZT86IHN0cmluZ1xyXG4gICAgY29sb3I/OiBnZnguQ29sb3JcclxuICAgIGhlYWx0aDogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBVc2FibGUgZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGhlYWx0aDogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogVXNhYmxlT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiBmYWxzZSB9LCBvcHRpb25zKSlcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IG9wdGlvbnMuaGVhbHRoXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogVXNhYmxlIHtcclxuICAgICAgICByZXR1cm4gbmV3IFVzYWJsZSh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0dXJlT3B0aW9ucyB7XHJcbiAgICBwb3NpdGlvbj86IGdlby5Qb2ludFxyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZTogc3RyaW5nXHJcbiAgICBjb2xvcj86IGdmeC5Db2xvclxyXG4gICAgbWF4SGVhbHRoOiBudW1iZXJcclxuICAgIGhlYWx0aD86IG51bWJlclxyXG4gICAgYWdpbGl0eT86IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0dXJlIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgbWF4SGVhbHRoOiBudW1iZXJcclxuICAgIGhlYWx0aDogbnVtYmVyXHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxuICAgIGFnaWxpdHk6IG51bWJlclxyXG4gICAgYWN0aW9uOiBudW1iZXJcclxuICAgIGFjdGlvblJlc2VydmU6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBsYXllck9wdGlvbnMgZXh0ZW5kcyBDcmVhdHVyZU9wdGlvbnMge1xyXG4gICAgbGlnaHRSYWRpdXM6IG51bWJlclxyXG4gICAgbGV2ZWw/OiBudW1iZXJcclxuICAgIGV4cGVyaWVuY2U/OiBudW1iZXJcclxuICAgIHN0cmVuZ3RoPzogbnVtYmVyXHJcbiAgICBpbnRlbGxpZ2VuY2U/OiBudW1iZXJcclxuICAgIG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBtZWxlZVdlYXBvbj86IE1lbGVlV2VhcG9uIHwgbnVsbFxyXG4gICAgcmFuZ2VkV2VhcG9uPzogUmFuZ2VkV2VhcG9uIHwgbnVsbFxyXG4gICAgYXJtb3I/OiBBcm1vciB8IG51bGxcclxuICAgIGhlbG0/OiBIZWxtIHwgbnVsbFxyXG4gICAgc2hpZWxkPzogU2hpZWxkIHwgbnVsbFxyXG4gICAgcmluZz86IFJpbmcgfCBudWxsXHJcbiAgICBpbnZlbnRvcnk/OiBTZXQ8SXRlbT5cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFBsYXllciBleHRlbmRzIFRoaW5nIGltcGxlbWVudHMgQ3JlYXR1cmUge1xyXG4gICAgYmFzZVN0cmVuZ3RoOiBudW1iZXJcclxuICAgIGJhc2VJbnRlbGxpZ2VuY2U6IG51bWJlclxyXG4gICAgYmFzZUFnaWxpdHk6IG51bWJlclxyXG4gICAgYmFzZU1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBsZXZlbDogbnVtYmVyXHJcbiAgICBleHBlcmllbmNlOiBudW1iZXJcclxuICAgIGhlYWx0aDogbnVtYmVyXHJcbiAgICBhY3Rpb246IG51bWJlciA9IDBcclxuICAgIGFjdGlvblJlc2VydmU6IG51bWJlciA9IDBcclxuICAgIG1lbGVlV2VhcG9uOiBNZWxlZVdlYXBvbiB8IG51bGxcclxuICAgIHJhbmdlZFdlYXBvbjogUmFuZ2VkV2VhcG9uIHwgbnVsbFxyXG4gICAgYXJtb3I6IEFybW9yIHwgbnVsbFxyXG4gICAgaGVsbTogSGVsbSB8IG51bGxcclxuICAgIHNoaWVsZDogU2hpZWxkIHwgbnVsbFxyXG4gICAgcmluZzogUmluZyB8IG51bGxcclxuICAgIGxpZ2h0UmFkaXVzOiBudW1iZXJcclxuICAgIGludmVudG9yeTogU2V0PEl0ZW0+XHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogUGxheWVyT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuYmFzZVN0cmVuZ3RoID0gb3B0aW9ucy5zdHJlbmd0aCA/PyAwXHJcbiAgICAgICAgdGhpcy5iYXNlSW50ZWxsaWdlbmNlID0gb3B0aW9ucy5zdHJlbmd0aCA/PyAwXHJcbiAgICAgICAgdGhpcy5iYXNlQWdpbGl0eSA9IG9wdGlvbnMuYWdpbGl0eSA/PyAwXHJcbiAgICAgICAgdGhpcy5iYXNlTWF4SGVhbHRoID0gb3B0aW9ucy5tYXhIZWFsdGhcclxuICAgICAgICB0aGlzLmxldmVsID0gb3B0aW9ucy5sZXZlbCA/PyAxXHJcbiAgICAgICAgdGhpcy5leHBlcmllbmNlID0gb3B0aW9ucy5leHBlcmllbmNlID8/IDBcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IG9wdGlvbnMuaGVhbHRoID8/IHRoaXMubWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5tZWxlZVdlYXBvbiA9IG9wdGlvbnMubWVsZWVXZWFwb24gPz8gbnVsbFxyXG4gICAgICAgIHRoaXMucmFuZ2VkV2VhcG9uID0gb3B0aW9ucy5yYW5nZWRXZWFwb24gPz8gbnVsbFxyXG4gICAgICAgIHRoaXMuaGVsbSA9IG9wdGlvbnMuaGVsbSA/PyBudWxsXHJcbiAgICAgICAgdGhpcy5hcm1vciA9IG9wdGlvbnMuYXJtb3IgPz8gbnVsbFxyXG4gICAgICAgIHRoaXMuc2hpZWxkID0gb3B0aW9ucy5zaGllbGQgPz8gbnVsbFxyXG4gICAgICAgIHRoaXMucmluZyA9IG9wdGlvbnMucmluZyA/PyBudWxsXHJcbiAgICAgICAgdGhpcy5saWdodFJhZGl1cyA9IG9wdGlvbnMubGlnaHRSYWRpdXNcclxuICAgICAgICB0aGlzLmludmVudG9yeSA9IG9wdGlvbnMuaW52ZW50b3J5ID8gbmV3IFNldDxJdGVtPihvcHRpb25zLmludmVudG9yeSkgOiBuZXcgU2V0PEl0ZW0+KClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgc3RyZW5ndGgoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5iYXNlU3RyZW5ndGggKyAodGhpcy5yaW5nPy5zdHJlbmd0aCA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBhZ2lsaXR5KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYmFzZUFnaWxpdHkgKyAodGhpcy5yaW5nPy5hZ2lsaXR5ID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGludGVsbGlnZW5jZSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJhc2VJbnRlbGxpZ2VuY2UgKyAodGhpcy5yaW5nPy5pbnRlbGxpZ2VuY2UgPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgbWF4SGVhbHRoKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYmFzZU1heEhlYWx0aCArICh0aGlzLnJpbmc/Lm1heEhlYWx0aCA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBtZWxlZUF0dGFjaygpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnN0cmVuZ3RoICsgKHRoaXMubWVsZWVXZWFwb24/LmF0dGFjayA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBtZWxlZURhbWFnZSgpOiBEaWNlIHtcclxuICAgICAgICByZXR1cm4gKHRoaXMubWVsZWVXZWFwb24/LmRhbWFnZSA/PyBuZXcgRGljZSgxLCAyKSkuYWRkKHRoaXMuc3RyZW5ndGgpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHJhbmdlZEF0dGFjaygpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFnaWxpdHkgKyAodGhpcy5yYW5nZWRXZWFwb24/LmF0dGFjayA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCByYW5nZWREYW1hZ2UoKTogRGljZSB8IG51bGwge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnJhbmdlZFdlYXBvbj8uZGFtYWdlPy5hZGQodGhpcy5hZ2lsaXR5KSA/PyBudWxsXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGRlZmVuc2UoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hZ2lsaXR5ICsgKHRoaXMuYXJtb3I/LmRlZmVuc2UgPz8gMCkgKyAodGhpcy5oZWxtPy5kZWZlbnNlID8/IDApICsgKHRoaXMuc2hpZWxkPy5kZWZlbnNlID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgaXNFcXVpcHBlZChpdGVtOiBJdGVtKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLmVxdWlwbWVudCgpXS5pbmNsdWRlcyhpdGVtKVxyXG4gICAgfVxyXG5cclxuICAgICplcXVpcG1lbnQoKTogSXRlcmFibGU8SXRlbT4ge1xyXG4gICAgICAgIGlmICh0aGlzLm1lbGVlV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMubWVsZWVXZWFwb25cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnJhbmdlZFdlYXBvbikge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLnJhbmdlZFdlYXBvblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYXJtb3IpIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5hcm1vclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaGVsbSkge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLmhlbG1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnNoaWVsZCkge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLnNoaWVsZFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucmluZykge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLnJpbmdcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogUGxheWVyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFBsYXllcih0aGlzKVxyXG4gICAgfVxyXG5cclxuICAgIGVxdWlwKGl0ZW06IEl0ZW0pIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhpdGVtKVxyXG4gICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgTWVsZWVXZWFwb24pIHtcclxuICAgICAgICAgICAgdGhpcy5tZWxlZVdlYXBvbiA9IGl0ZW1cclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBSYW5nZWRXZWFwb24pIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJyYW5nZWQgd2VhcG9uXCIpXHJcbiAgICAgICAgICAgIHRoaXMucmFuZ2VkV2VhcG9uID0gaXRlbVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIEFybW9yKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXJtb3IgPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgU2hpZWxkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hpZWxkID0gaXRlbVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIEhlbG0pIHtcclxuICAgICAgICAgICAgdGhpcy5oZWxtID0gaXRlbVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIFJpbmcpIHtcclxuICAgICAgICAgICAgdGhpcy5yaW5nID0gaXRlbVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZW1vdmUoaXRlbTogSXRlbSkge1xyXG4gICAgICAgIGlmICh0aGlzLm1lbGVlV2VhcG9uID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWVsZWVXZWFwb24gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5yYW5nZWRXZWFwb24gPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5yYW5nZWRXZWFwb24gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5hcm1vciA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLmFybW9yID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaGVsbSA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLmhlbG0gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5zaGllbGQgPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5zaGllbGQgPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5yaW5nID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmluZyA9IG51bGxcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZGVsZXRlKGl0ZW06IEl0ZW0pIHtcclxuXHJcbiAgICAgICAgaWYgKGlzRXF1aXBwYWJsZShpdGVtKSkge1xyXG4gICAgICAgICAgICB0aGlzLnJlbW92ZShpdGVtKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5pbnZlbnRvcnkuZGVsZXRlKGl0ZW0pXHJcbiAgICB9XHJcblxyXG4gICAgdG9KU09OKCk6IFBsYXllck9wdGlvbnMge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uLnRvSlNPTigpLFxyXG4gICAgICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXHJcbiAgICAgICAgICAgIGltYWdlOiB0aGlzLmltYWdlLFxyXG4gICAgICAgICAgICBjb2xvcjogdGhpcy5jb2xvcixcclxuICAgICAgICAgICAgbWF4SGVhbHRoOiB0aGlzLm1heEhlYWx0aCxcclxuICAgICAgICAgICAgaGVhbHRoOiB0aGlzLmhlYWx0aCxcclxuICAgICAgICAgICAgYWdpbGl0eTogdGhpcy5hZ2lsaXR5LFxyXG4gICAgICAgICAgICBsaWdodFJhZGl1czogdGhpcy5saWdodFJhZGl1cyxcclxuICAgICAgICAgICAgbGV2ZWw6IHRoaXMubGV2ZWwsXHJcbiAgICAgICAgICAgIGV4cGVyaWVuY2U6IHRoaXMuZXhwZXJpZW5jZSxcclxuICAgICAgICAgICAgc3RyZW5ndGg6IHRoaXMuc3RyZW5ndGgsXHJcbiAgICAgICAgICAgIGludGVsbGlnZW5jZTogdGhpcy5pbnRlbGxpZ2VuY2UsXHJcbiAgICAgICAgICAgIG1lbGVlV2VhcG9uOiB0aGlzLm1lbGVlV2VhcG9uLFxyXG4gICAgICAgICAgICByYW5nZWRXZWFwb246IHRoaXMucmFuZ2VkV2VhcG9uLFxyXG4gICAgICAgICAgICBhcm1vcjogdGhpcy5hcm1vcixcclxuICAgICAgICAgICAgaGVsbTogdGhpcy5oZWxtLFxyXG4gICAgICAgICAgICBzaGllbGQ6IHRoaXMuc2hpZWxkLFxyXG4gICAgICAgICAgICByaW5nOiB0aGlzLnJpbmcsXHJcbiAgICAgICAgICAgIGludmVudG9yeTogdGhpcy5pbnZlbnRvcnksXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEF0dGFja09wdGlvbnMge1xyXG4gICAgYXR0YWNrOiBudW1iZXJcclxuICAgIGRhbWFnZTogRGljZVxyXG4gICAgYWN0aW9uOiBudW1iZXJcclxuICAgIHJhbmdlPzogbnVtYmVyXHJcbiAgICB2ZXJiPzogc3RyaW5nXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBBdHRhY2sge1xyXG4gICAgYXR0YWNrOiBudW1iZXJcclxuICAgIGRhbWFnZTogRGljZVxyXG4gICAgYWN0aW9uOiBudW1iZXJcclxuICAgIHJhbmdlOiBudW1iZXJcclxuICAgIHZlcmI6IHN0cmluZ1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEF0dGFja09wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLmF0dGFjayA9IG9wdGlvbnMuYXR0YWNrID8/IDBcclxuICAgICAgICB0aGlzLmRhbWFnZSA9IG9wdGlvbnMuZGFtYWdlLmNsb25lKClcclxuICAgICAgICB0aGlzLmFjdGlvbiA9IG9wdGlvbnMuYWN0aW9uXHJcbiAgICAgICAgdGhpcy5yYW5nZSA9IG9wdGlvbnMucmFuZ2UgPz8gMVxyXG4gICAgICAgIHRoaXMudmVyYiA9IG9wdGlvbnMudmVyYiA/PyBcIlwiXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogQXR0YWNrIHtcclxuICAgICAgICByZXR1cm4gbmV3IEF0dGFjayh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZW51bSBNb25zdGVyU3RhdGUge1xyXG4gICAgaWRsZSxcclxuICAgIGFnZ3JvXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTW9uc3Rlck9wdGlvbnMgZXh0ZW5kcyBDcmVhdHVyZU9wdGlvbnMge1xyXG4gICAgZGVmZW5zZTogbnVtYmVyXHJcbiAgICBleHBlcmllbmNlOiBudW1iZXIsXHJcbiAgICBhdHRhY2tzOiBBdHRhY2tbXVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTW9uc3RlciBleHRlbmRzIFRoaW5nIGltcGxlbWVudHMgQ3JlYXR1cmUge1xyXG4gICAgYWdpbGl0eTogbnVtYmVyXHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxuICAgIG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBoZWFsdGg6IG51bWJlclxyXG4gICAgZXhwZXJpZW5jZTogbnVtYmVyXHJcbiAgICByZWFkb25seSBhdHRhY2tzOiBBdHRhY2tbXSA9IFtdXHJcbiAgICBzdGF0ZTogTW9uc3RlclN0YXRlID0gTW9uc3RlclN0YXRlLmlkbGVcclxuICAgIGFjdGlvbjogbnVtYmVyID0gMFxyXG4gICAgYWN0aW9uUmVzZXJ2ZTogbnVtYmVyID0gMFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IE1vbnN0ZXJPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IHRydWUgfSwgb3B0aW9ucykpXHJcbiAgICAgICAgdGhpcy5hZ2lsaXR5ID0gb3B0aW9ucy5hZ2lsaXR5ID8/IDBcclxuICAgICAgICB0aGlzLmRlZmVuc2UgPSBvcHRpb25zLmRlZmVuc2UgPz8gMFxyXG4gICAgICAgIHRoaXMubWF4SGVhbHRoID0gb3B0aW9ucy5tYXhIZWFsdGhcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IG9wdGlvbnMuaGVhbHRoID8/IHRoaXMubWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5leHBlcmllbmNlID0gb3B0aW9ucy5leHBlcmllbmNlXHJcbiAgICAgICAgdGhpcy5hdHRhY2tzID0gWy4uLm9wdGlvbnMuYXR0YWNrc11cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYXR0YWNrcy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGF0dGFja3MgZGVmaW5lZCBmb3IgbW9uc3RlciAke3RoaXMubmFtZX1gKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBNb25zdGVyIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1vbnN0ZXIodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb250YWluZXJPcHRpb25zIHtcclxuICAgIHBvc2l0aW9uPzogZ2VvLlBvaW50XHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlOiBzdHJpbmdcclxuICAgIGNvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICBpdGVtcz86IFNldDxJdGVtPlxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ29udGFpbmVyIGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICByZWFkb25seSBpdGVtczogU2V0PEl0ZW0+XHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQ29udGFpbmVyT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuaXRlbXMgPSBuZXcgU2V0PEl0ZW0+KFsuLi5vcHRpb25zLml0ZW1zID8/IFtdXSlcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBDb250YWluZXIge1xyXG4gICAgICAgIHJldHVybiBuZXcgQ29udGFpbmVyKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNvbnN0IGxldmVscyA9IFtcclxuICAgIDEwLFxyXG4gICAgMjAsXHJcbiAgICA1MCxcclxuICAgIDEwMCxcclxuICAgIDIwMCxcclxuICAgIDUwMCxcclxuICAgIDEwMDAsXHJcbiAgICAyMDAwLFxyXG4gICAgNTAwMCxcclxuICAgIDEwMDAwXVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cGVyaWVuY2VSZXF1aXJlbWVudChsZXZlbDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGlmIChsZXZlbCA8IDIpIHtcclxuICAgICAgICByZXR1cm4gMFxyXG4gICAgfVxyXG5cclxuICAgIGlmIChsZXZlbCAtIDIgPj0gbGV2ZWxzLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiBJbmZpbml0eVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBsZXZlbHNbbGV2ZWwgLSAyXVxyXG59Il19