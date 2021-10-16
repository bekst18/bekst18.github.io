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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJybC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUNILE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQixNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFBO0FBRTFCLE1BQU0sQ0FBTixJQUFZLFVBSVg7QUFKRCxXQUFZLFVBQVU7SUFDbEIsMkNBQUksQ0FBQTtJQUNKLHlDQUFHLENBQUE7SUFDSCxpREFBTyxDQUFBO0FBQ1gsQ0FBQyxFQUpXLFVBQVUsS0FBVixVQUFVLFFBSXJCO0FBV0QsTUFBTSxPQUFPLEtBQUs7SUFTZCxZQUFZLE9BQXFCOztRQUhqQyxVQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLFlBQU8sR0FBZSxVQUFVLENBQUMsSUFBSSxDQUFBO1FBR2pDLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBQSxNQUFBLE9BQU8sQ0FBQyxRQUFRLDBDQUFFLEtBQUssRUFBRSxtQ0FBSSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsRSxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUE7UUFDaEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQTtRQUN4QixJQUFJLENBQUMsS0FBSyxHQUFHLE1BQUEsT0FBTyxDQUFDLEtBQUssbUNBQUksRUFBRSxDQUFBO1FBRWhDLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRTtZ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SUFBSSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNyRSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksR0FBRyxDQUFPLENBQUMsR0FBRyxNQUFBLE9BQU8sQ0FBQyxLQUFLLG1DQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDeEQsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzlCLENBQUM7Q0FDSjtBQUVELE1BQU0sTUFBTSxHQUFHO0lBQ1gsRUFBRTtJQUNGLEVBQUU7SUFDRixFQUFFO0lBQ0YsR0FBRztJQUNILEdBQUc7SUFDSCxHQUFHO0lBQ0gsSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osS0FBSztDQUFDLENBQUE7QUFFVixNQUFNLFVBQVUsd0JBQXdCLENBQUMsS0FBYTtJQUNsRCxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUU7UUFDWCxPQUFPLENBQUMsQ0FBQTtLQUNYO0lBRUQsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUU7UUFDNUIsT0FBTyxRQUFRLENBQUE7S0FDbEI7SUFFRCxPQUFPLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFDNUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiByb2d1ZS1saWtlIGxpYnJhcnlcclxuICovXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuXHJcbmV4cG9ydCBjb25zdCB0aWxlU2l6ZSA9IDI0XHJcblxyXG5leHBvcnQgZW51bSBWaXNpYmlsaXR5IHtcclxuICAgIE5vbmUsXHJcbiAgICBGb2csXHJcbiAgICBWaXNpYmxlXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGhpbmdPcHRpb25zIHtcclxuICAgIHBvc2l0aW9uPzogZ2VvLlBvaW50XHJcbiAgICBwYXNzYWJsZTogYm9vbGVhblxyXG4gICAgdHJhbnNwYXJlbnQ6IGJvb2xlYW5cclxuICAgIG5hbWU6IHN0cmluZ1xyXG4gICAgaW1hZ2U/OiBzdHJpbmdcclxuICAgIGNvbG9yPzogZ2Z4LkNvbG9yXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUaGluZyB7XHJcbiAgICBwb3NpdGlvbjogZ2VvLlBvaW50XHJcbiAgICBwYXNzYWJsZTogYm9vbGVhblxyXG4gICAgdHJhbnNwYXJlbnQ6IGJvb2xlYW5cclxuICAgIG5hbWU6IHN0cmluZ1xyXG4gICAgaW1hZ2U6IHN0cmluZ1xyXG4gICAgY29sb3IgPSBuZXcgZ2Z4LkNvbG9yKDEsIDEsIDEsIDEpXHJcbiAgICB2aXNpYmxlOiBWaXNpYmlsaXR5ID0gVmlzaWJpbGl0eS5Ob25lXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogVGhpbmdPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IG9wdGlvbnMucG9zaXRpb24/LmNsb25lKCkgPz8gbmV3IGdlby5Qb2ludCgtMSwgLTEpXHJcbiAgICAgICAgdGhpcy5wYXNzYWJsZSA9IG9wdGlvbnMucGFzc2FibGVcclxuICAgICAgICB0aGlzLnRyYW5zcGFyZW50ID0gb3B0aW9ucy50cmFuc3BhcmVudFxyXG4gICAgICAgIHRoaXMubmFtZSA9IG9wdGlvbnMubmFtZVxyXG4gICAgICAgIHRoaXMuaW1hZ2UgPSBvcHRpb25zLmltYWdlID8/IFwiXCJcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuY29sb3IpIHtcclxuICAgICAgICAgICAgdGhpcy5jb2xvciA9IG9wdGlvbnMuY29sb3JcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogVGhpbmcge1xyXG4gICAgICAgIHJldHVybiBuZXcgVGhpbmcodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIERpY2Uge1xyXG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgbWluOiBudW1iZXIgPSAwLCByZWFkb25seSBtYXg6IG51bWJlciA9IDApIHsgfVxyXG5cclxuICAgIHJvbGwocm5nOiByYW5kLlJORyk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHJhbmQuaW50KHJuZywgdGhpcy5taW4sIHRoaXMubWF4ICsgMSlcclxuICAgIH1cclxuXHJcbiAgICBhZGQoeDogbnVtYmVyKTogRGljZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBEaWNlKHRoaXMubWluICsgeCwgdGhpcy5tYXggKyB4KVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IERpY2Uge1xyXG4gICAgICAgIHJldHVybiBuZXcgRGljZSh0aGlzLm1pbiwgdGhpcy5tYXgpXHJcbiAgICB9XHJcblxyXG4gICAgdG9TdHJpbmcoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gYCR7dGhpcy5taW59IC0gJHt0aGlzLm1heH1gXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUaWxlIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgY2xvbmUoKTogVGlsZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBUaWxlKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaXh0dXJlIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgY2xvbmUoKTogRml4dHVyZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBGaXh0dXJlKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBEb29yIGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICBjbG9uZSgpOiBEb29yIHtcclxuICAgICAgICByZXR1cm4gbmV3IERvb3IodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFN0YWlyc1VwIGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICBjbG9uZSgpOiBTdGFpcnNVcCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTdGFpcnNVcCh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU3RhaXJzRG93biBleHRlbmRzIEZpeHR1cmUge1xyXG4gICAgY2xvbmUoKTogU3RhaXJzRG93biB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTdGFpcnNEb3duKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSXRlbU9wdGlvbnMge1xyXG4gICAgcG9zaXRpb24/OiBnZW8uUG9pbnRcclxuICAgIG5hbWU6IHN0cmluZ1xyXG4gICAgaW1hZ2U/OiBzdHJpbmdcclxuICAgIGNvbG9yPzogZ2Z4LkNvbG9yXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBJdGVtIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogSXRlbU9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihPYmplY3QuYXNzaWduKHsgcGFzc2FibGU6IGZhbHNlLCB0cmFuc3BhcmVudDogdHJ1ZSB9LCBvcHRpb25zKSlcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBXZWFwb25PcHRpb25zIGV4dGVuZHMgSXRlbU9wdGlvbnMge1xyXG4gICAgYXR0YWNrOiBudW1iZXJcclxuICAgIHJhbmdlPzogbnVtYmVyXHJcbiAgICB2ZXJiPzogc3RyaW5nXHJcbiAgICBhY3Rpb246IG51bWJlclxyXG4gICAgZGFtYWdlOiBEaWNlXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBXZWFwb24gZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGF0dGFjazogbnVtYmVyXHJcbiAgICByZWFkb25seSBkYW1hZ2U6IERpY2VcclxuICAgIHJlYWRvbmx5IHJhbmdlOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGFjdGlvbjogbnVtYmVyXHJcbiAgICByZWFkb25seSB2ZXJiOiBzdHJpbmdcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBXZWFwb25PcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLmF0dGFjayA9IG9wdGlvbnMuYXR0YWNrXHJcbiAgICAgICAgdGhpcy5kYW1hZ2UgPSBvcHRpb25zLmRhbWFnZS5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy5yYW5nZSA9IG9wdGlvbnMucmFuZ2UgPz8gMVxyXG4gICAgICAgIHRoaXMudmVyYiA9IG9wdGlvbnMudmVyYiA/PyBcIlwiXHJcbiAgICAgICAgdGhpcy5hY3Rpb24gPSBvcHRpb25zLmFjdGlvblxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFdlYXBvbiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBXZWFwb24odGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFJhbmdlZFdlYXBvbiBleHRlbmRzIFdlYXBvbiB7XHJcbiAgICBjbG9uZSgpOiBSYW5nZWRXZWFwb24ge1xyXG4gICAgICAgIHJldHVybiBuZXcgUmFuZ2VkV2VhcG9uKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNZWxlZVdlYXBvbiBleHRlbmRzIFdlYXBvbiB7XHJcbiAgICBjbG9uZSgpOiBXZWFwb24ge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWVsZWVXZWFwb24odGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBcm1vck9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEFybW9yIGV4dGVuZHMgSXRlbSB7XHJcbiAgICByZWFkb25seSBkZWZlbnNlOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBBcm1vck9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMuZGVmZW5zZSA9IG9wdGlvbnMuZGVmZW5zZVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEFybW9yIHtcclxuICAgICAgICByZXR1cm4gbmV3IEFybW9yKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSGVsbU9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEhlbG0gZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGRlZmVuc2U6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEhlbG1PcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLmRlZmVuc2UgPSBvcHRpb25zLmRlZmVuc2VcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBIZWxtIHtcclxuICAgICAgICByZXR1cm4gbmV3IEhlbG0odGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTaGllbGRPcHRpb25zIGV4dGVuZHMgSXRlbU9wdGlvbnMge1xyXG4gICAgZGVmZW5zZTogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTaGllbGQgZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGRlZmVuc2U6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFNoaWVsZE9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMuZGVmZW5zZSA9IG9wdGlvbnMuZGVmZW5zZVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFNoaWVsZCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTaGllbGQodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSaW5nT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIHN0cmVuZ3RoPzogbnVtYmVyXHJcbiAgICBhZ2lsaXR5PzogbnVtYmVyXHJcbiAgICBpbnRlbGxpZ2VuY2U/OiBudW1iZXJcclxuICAgIG1heEhlYWx0aD86IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUmluZyBleHRlbmRzIEl0ZW0ge1xyXG4gICAgc3RyZW5ndGg6IG51bWJlclxyXG4gICAgYWdpbGl0eTogbnVtYmVyXHJcbiAgICBpbnRlbGxpZ2VuY2U6IG51bWJlclxyXG4gICAgbWF4SGVhbHRoOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBSaW5nT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5zdHJlbmd0aCA9IG9wdGlvbnMuc3RyZW5ndGggPz8gMFxyXG4gICAgICAgIHRoaXMuYWdpbGl0eSA9IG9wdGlvbnMuYWdpbGl0eSA/PyAwXHJcbiAgICAgICAgdGhpcy5pbnRlbGxpZ2VuY2UgPSBvcHRpb25zLmludGVsbGlnZW5jZSA/PyAwXHJcbiAgICAgICAgdGhpcy5tYXhIZWFsdGggPSBvcHRpb25zLm1heEhlYWx0aCA/PyAwXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIEVxdWlwcGFibGUgPSBNZWxlZVdlYXBvbiB8IFJhbmdlZFdlYXBvbiB8IEFybW9yIHwgSGVsbSB8IFNoaWVsZCB8IFJpbmdcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpc0VxdWlwcGFibGUoaXRlbTogSXRlbSk6IGl0ZW0gaXMgRXF1aXBwYWJsZSB7XHJcbiAgICByZXR1cm4gaXRlbSBpbnN0YW5jZW9mIFdlYXBvbiB8fCBpdGVtIGluc3RhbmNlb2YgQXJtb3IgfHwgaXRlbSBpbnN0YW5jZW9mIFNoaWVsZFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFVzYWJsZU9wdGlvbnMge1xyXG4gICAgcG9zaXRpb24/OiBnZW8uUG9pbnRcclxuICAgIG5hbWU6IHN0cmluZ1xyXG4gICAgaW1hZ2U/OiBzdHJpbmdcclxuICAgIGNvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICBoZWFsdGg6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVXNhYmxlIGV4dGVuZHMgSXRlbSB7XHJcbiAgICByZWFkb25seSBoZWFsdGg6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFVzYWJsZU9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihPYmplY3QuYXNzaWduKHsgcGFzc2FibGU6IGZhbHNlLCB0cmFuc3BhcmVudDogZmFsc2UgfSwgb3B0aW9ucykpXHJcbiAgICAgICAgdGhpcy5oZWFsdGggPSBvcHRpb25zLmhlYWx0aFxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFVzYWJsZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBVc2FibGUodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDcmVhdHVyZU9wdGlvbnMge1xyXG4gICAgcG9zaXRpb24/OiBnZW8uUG9pbnRcclxuICAgIG5hbWU6IHN0cmluZ1xyXG4gICAgaW1hZ2U6IHN0cmluZ1xyXG4gICAgY29sb3I/OiBnZnguQ29sb3JcclxuICAgIG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBoZWFsdGg/OiBudW1iZXJcclxuICAgIGFnaWxpdHk/OiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDcmVhdHVyZSBleHRlbmRzIFRoaW5nIHtcclxuICAgIG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBoZWFsdGg6IG51bWJlclxyXG4gICAgZGVmZW5zZTogbnVtYmVyXHJcbiAgICBhZ2lsaXR5OiBudW1iZXJcclxuICAgIGFjdGlvbjogbnVtYmVyXHJcbiAgICBhY3Rpb25SZXNlcnZlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQbGF5ZXJPcHRpb25zIGV4dGVuZHMgQ3JlYXR1cmVPcHRpb25zIHtcclxuICAgIGxpZ2h0UmFkaXVzOiBudW1iZXJcclxuICAgIGxldmVsPzogbnVtYmVyXHJcbiAgICBleHBlcmllbmNlPzogbnVtYmVyXHJcbiAgICBzdHJlbmd0aD86IG51bWJlclxyXG4gICAgaW50ZWxsaWdlbmNlPzogbnVtYmVyXHJcbiAgICBtYXhIZWFsdGg6IG51bWJlclxyXG4gICAgbWVsZWVXZWFwb24/OiBNZWxlZVdlYXBvbiB8IG51bGxcclxuICAgIHJhbmdlZFdlYXBvbj86IFJhbmdlZFdlYXBvbiB8IG51bGxcclxuICAgIGFybW9yPzogQXJtb3IgfCBudWxsXHJcbiAgICBoZWxtPzogSGVsbSB8IG51bGxcclxuICAgIHNoaWVsZD86IFNoaWVsZCB8IG51bGxcclxuICAgIHJpbmc/OiBSaW5nIHwgbnVsbFxyXG4gICAgaW52ZW50b3J5PzogU2V0PEl0ZW0+XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBQbGF5ZXIgZXh0ZW5kcyBUaGluZyBpbXBsZW1lbnRzIENyZWF0dXJlIHtcclxuICAgIGJhc2VTdHJlbmd0aDogbnVtYmVyXHJcbiAgICBiYXNlSW50ZWxsaWdlbmNlOiBudW1iZXJcclxuICAgIGJhc2VBZ2lsaXR5OiBudW1iZXJcclxuICAgIGJhc2VNYXhIZWFsdGg6IG51bWJlclxyXG4gICAgbGV2ZWw6IG51bWJlclxyXG4gICAgZXhwZXJpZW5jZTogbnVtYmVyXHJcbiAgICBoZWFsdGg6IG51bWJlclxyXG4gICAgYWN0aW9uOiBudW1iZXIgPSAwXHJcbiAgICBhY3Rpb25SZXNlcnZlOiBudW1iZXIgPSAwXHJcbiAgICBtZWxlZVdlYXBvbjogTWVsZWVXZWFwb24gfCBudWxsXHJcbiAgICByYW5nZWRXZWFwb246IFJhbmdlZFdlYXBvbiB8IG51bGxcclxuICAgIGFybW9yOiBBcm1vciB8IG51bGxcclxuICAgIGhlbG06IEhlbG0gfCBudWxsXHJcbiAgICBzaGllbGQ6IFNoaWVsZCB8IG51bGxcclxuICAgIHJpbmc6IFJpbmcgfCBudWxsXHJcbiAgICBsaWdodFJhZGl1czogbnVtYmVyXHJcbiAgICBpbnZlbnRvcnk6IFNldDxJdGVtPlxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFBsYXllck9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihPYmplY3QuYXNzaWduKHsgcGFzc2FibGU6IGZhbHNlLCB0cmFuc3BhcmVudDogdHJ1ZSB9LCBvcHRpb25zKSlcclxuICAgICAgICB0aGlzLmJhc2VTdHJlbmd0aCA9IG9wdGlvbnMuc3RyZW5ndGggPz8gMFxyXG4gICAgICAgIHRoaXMuYmFzZUludGVsbGlnZW5jZSA9IG9wdGlvbnMuc3RyZW5ndGggPz8gMFxyXG4gICAgICAgIHRoaXMuYmFzZUFnaWxpdHkgPSBvcHRpb25zLmFnaWxpdHkgPz8gMFxyXG4gICAgICAgIHRoaXMuYmFzZU1heEhlYWx0aCA9IG9wdGlvbnMubWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5sZXZlbCA9IG9wdGlvbnMubGV2ZWwgPz8gMVxyXG4gICAgICAgIHRoaXMuZXhwZXJpZW5jZSA9IG9wdGlvbnMuZXhwZXJpZW5jZSA/PyAwXHJcbiAgICAgICAgdGhpcy5oZWFsdGggPSBvcHRpb25zLmhlYWx0aCA/PyB0aGlzLm1heEhlYWx0aFxyXG4gICAgICAgIHRoaXMubWVsZWVXZWFwb24gPSBvcHRpb25zLm1lbGVlV2VhcG9uID8/IG51bGxcclxuICAgICAgICB0aGlzLnJhbmdlZFdlYXBvbiA9IG9wdGlvbnMucmFuZ2VkV2VhcG9uID8/IG51bGxcclxuICAgICAgICB0aGlzLmhlbG0gPSBvcHRpb25zLmhlbG0gPz8gbnVsbFxyXG4gICAgICAgIHRoaXMuYXJtb3IgPSBvcHRpb25zLmFybW9yID8/IG51bGxcclxuICAgICAgICB0aGlzLnNoaWVsZCA9IG9wdGlvbnMuc2hpZWxkID8/IG51bGxcclxuICAgICAgICB0aGlzLnJpbmcgPSBvcHRpb25zLnJpbmcgPz8gbnVsbFxyXG4gICAgICAgIHRoaXMubGlnaHRSYWRpdXMgPSBvcHRpb25zLmxpZ2h0UmFkaXVzXHJcbiAgICAgICAgdGhpcy5pbnZlbnRvcnkgPSBvcHRpb25zLmludmVudG9yeSA/IG5ldyBTZXQ8SXRlbT4ob3B0aW9ucy5pbnZlbnRvcnkpIDogbmV3IFNldDxJdGVtPigpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHN0cmVuZ3RoKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYmFzZVN0cmVuZ3RoICsgKHRoaXMucmluZz8uc3RyZW5ndGggPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgYWdpbGl0eSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJhc2VBZ2lsaXR5ICsgKHRoaXMucmluZz8uYWdpbGl0eSA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBpbnRlbGxpZ2VuY2UoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5iYXNlSW50ZWxsaWdlbmNlICsgKHRoaXMucmluZz8uaW50ZWxsaWdlbmNlID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IG1heEhlYWx0aCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJhc2VNYXhIZWFsdGggKyAodGhpcy5yaW5nPy5tYXhIZWFsdGggPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgbWVsZWVBdHRhY2soKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zdHJlbmd0aCArICh0aGlzLm1lbGVlV2VhcG9uPy5hdHRhY2sgPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgbWVsZWVEYW1hZ2UoKTogRGljZSB7XHJcbiAgICAgICAgcmV0dXJuICh0aGlzLm1lbGVlV2VhcG9uPy5kYW1hZ2UgPz8gbmV3IERpY2UoMSwgMikpLmFkZCh0aGlzLnN0cmVuZ3RoKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCByYW5nZWRBdHRhY2soKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hZ2lsaXR5ICsgKHRoaXMucmFuZ2VkV2VhcG9uPy5hdHRhY2sgPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgcmFuZ2VkRGFtYWdlKCk6IERpY2UgfCBudWxsIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5yYW5nZWRXZWFwb24/LmRhbWFnZT8uYWRkKHRoaXMuYWdpbGl0eSkgPz8gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIGdldCBkZWZlbnNlKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYWdpbGl0eSArICh0aGlzLmFybW9yPy5kZWZlbnNlID8/IDApICsgKHRoaXMuaGVsbT8uZGVmZW5zZSA/PyAwKSArICh0aGlzLnNoaWVsZD8uZGVmZW5zZSA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGlzRXF1aXBwZWQoaXRlbTogSXRlbSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiBbLi4udGhpcy5lcXVpcG1lbnQoKV0uaW5jbHVkZXMoaXRlbSlcclxuICAgIH1cclxuXHJcbiAgICAqZXF1aXBtZW50KCk6IEl0ZXJhYmxlPEl0ZW0+IHtcclxuICAgICAgICBpZiAodGhpcy5tZWxlZVdlYXBvbikge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLm1lbGVlV2VhcG9uXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5yYW5nZWRXZWFwb24pIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5yYW5nZWRXZWFwb25cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmFybW9yKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMuYXJtb3JcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhlbG0pIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5oZWxtXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5zaGllbGQpIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5zaGllbGRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnJpbmcpIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5yaW5nXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFBsYXllciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQbGF5ZXIodGhpcylcclxuICAgIH1cclxuXHJcbiAgICBlcXVpcChpdGVtOiBJdGVtKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coaXRlbSlcclxuICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIE1lbGVlV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWVsZWVXZWFwb24gPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgUmFuZ2VkV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmFuZ2VkIHdlYXBvblwiKVxyXG4gICAgICAgICAgICB0aGlzLnJhbmdlZFdlYXBvbiA9IGl0ZW1cclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBBcm1vcikge1xyXG4gICAgICAgICAgICB0aGlzLmFybW9yID0gaXRlbVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIFNoaWVsZCkge1xyXG4gICAgICAgICAgICB0aGlzLnNoaWVsZCA9IGl0ZW1cclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBIZWxtKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGVsbSA9IGl0ZW1cclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBSaW5nKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmluZyA9IGl0ZW1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmVtb3ZlKGl0ZW06IEl0ZW0pIHtcclxuICAgICAgICBpZiAodGhpcy5tZWxlZVdlYXBvbiA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLm1lbGVlV2VhcG9uID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucmFuZ2VkV2VhcG9uID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmFuZ2VkV2VhcG9uID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYXJtb3IgPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5hcm1vciA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhlbG0gPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5oZWxtID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc2hpZWxkID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hpZWxkID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucmluZyA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLnJpbmcgPSBudWxsXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGRlbGV0ZShpdGVtOiBJdGVtKSB7XHJcblxyXG4gICAgICAgIGlmIChpc0VxdWlwcGFibGUoaXRlbSkpIHtcclxuICAgICAgICAgICAgdGhpcy5yZW1vdmUoaXRlbSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuaW52ZW50b3J5LmRlbGV0ZShpdGVtKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEF0dGFja09wdGlvbnMge1xyXG4gICAgYXR0YWNrOiBudW1iZXJcclxuICAgIGRhbWFnZTogRGljZVxyXG4gICAgYWN0aW9uOiBudW1iZXJcclxuICAgIHJhbmdlPzogbnVtYmVyXHJcbiAgICB2ZXJiPzogc3RyaW5nXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBBdHRhY2sge1xyXG4gICAgYXR0YWNrOiBudW1iZXJcclxuICAgIGRhbWFnZTogRGljZVxyXG4gICAgYWN0aW9uOiBudW1iZXJcclxuICAgIHJhbmdlOiBudW1iZXJcclxuICAgIHZlcmI6IHN0cmluZ1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEF0dGFja09wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLmF0dGFjayA9IG9wdGlvbnMuYXR0YWNrID8/IDBcclxuICAgICAgICB0aGlzLmRhbWFnZSA9IG9wdGlvbnMuZGFtYWdlLmNsb25lKClcclxuICAgICAgICB0aGlzLmFjdGlvbiA9IG9wdGlvbnMuYWN0aW9uXHJcbiAgICAgICAgdGhpcy5yYW5nZSA9IG9wdGlvbnMucmFuZ2UgPz8gMVxyXG4gICAgICAgIHRoaXMudmVyYiA9IG9wdGlvbnMudmVyYiA/PyBcIlwiXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogQXR0YWNrIHtcclxuICAgICAgICByZXR1cm4gbmV3IEF0dGFjayh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZW51bSBNb25zdGVyU3RhdGUge1xyXG4gICAgaWRsZSxcclxuICAgIGFnZ3JvXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTW9uc3Rlck9wdGlvbnMgZXh0ZW5kcyBDcmVhdHVyZU9wdGlvbnMge1xyXG4gICAgZGVmZW5zZTogbnVtYmVyXHJcbiAgICBleHBlcmllbmNlOiBudW1iZXIsXHJcbiAgICBhdHRhY2tzOiBBdHRhY2tbXVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTW9uc3RlciBleHRlbmRzIFRoaW5nIGltcGxlbWVudHMgQ3JlYXR1cmUge1xyXG4gICAgYWdpbGl0eTogbnVtYmVyXHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxuICAgIG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBoZWFsdGg6IG51bWJlclxyXG4gICAgZXhwZXJpZW5jZTogbnVtYmVyXHJcbiAgICByZWFkb25seSBhdHRhY2tzOiBBdHRhY2tbXSA9IFtdXHJcbiAgICBzdGF0ZTogTW9uc3RlclN0YXRlID0gTW9uc3RlclN0YXRlLmlkbGVcclxuICAgIGFjdGlvbjogbnVtYmVyID0gMFxyXG4gICAgYWN0aW9uUmVzZXJ2ZTogbnVtYmVyID0gMFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IE1vbnN0ZXJPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IHRydWUgfSwgb3B0aW9ucykpXHJcbiAgICAgICAgdGhpcy5hZ2lsaXR5ID0gb3B0aW9ucy5hZ2lsaXR5ID8/IDBcclxuICAgICAgICB0aGlzLmRlZmVuc2UgPSBvcHRpb25zLmRlZmVuc2UgPz8gMFxyXG4gICAgICAgIHRoaXMubWF4SGVhbHRoID0gb3B0aW9ucy5tYXhIZWFsdGhcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IG9wdGlvbnMuaGVhbHRoID8/IHRoaXMubWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5leHBlcmllbmNlID0gb3B0aW9ucy5leHBlcmllbmNlXHJcbiAgICAgICAgdGhpcy5hdHRhY2tzID0gWy4uLm9wdGlvbnMuYXR0YWNrc11cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYXR0YWNrcy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGF0dGFja3MgZGVmaW5lZCBmb3IgbW9uc3RlciAke3RoaXMubmFtZX1gKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBNb25zdGVyIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1vbnN0ZXIodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb250YWluZXJPcHRpb25zIHtcclxuICAgIHBvc2l0aW9uPzogZ2VvLlBvaW50XHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlOiBzdHJpbmdcclxuICAgIGNvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICBpdGVtcz86IFNldDxJdGVtPlxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ29udGFpbmVyIGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICByZWFkb25seSBpdGVtczogU2V0PEl0ZW0+XHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQ29udGFpbmVyT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuaXRlbXMgPSBuZXcgU2V0PEl0ZW0+KFsuLi5vcHRpb25zLml0ZW1zID8/IFtdXSlcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBDb250YWluZXIge1xyXG4gICAgICAgIHJldHVybiBuZXcgQ29udGFpbmVyKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNvbnN0IGxldmVscyA9IFtcclxuICAgIDEwLFxyXG4gICAgMjAsXHJcbiAgICA1MCxcclxuICAgIDEwMCxcclxuICAgIDIwMCxcclxuICAgIDUwMCxcclxuICAgIDEwMDAsXHJcbiAgICAyMDAwLFxyXG4gICAgNTAwMCxcclxuICAgIDEwMDAwXVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cGVyaWVuY2VSZXF1aXJlbWVudChsZXZlbDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGlmIChsZXZlbCA8IDIpIHtcclxuICAgICAgICByZXR1cm4gMFxyXG4gICAgfVxyXG5cclxuICAgIGlmIChsZXZlbCAtIDIgPj0gbGV2ZWxzLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiBJbmZpbml0eVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBsZXZlbHNbbGV2ZWwgLSAyXVxyXG59Il19