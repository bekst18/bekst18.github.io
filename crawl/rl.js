/**
 * rogue-like library
 */
import * as geo from "../shared/geo2d.js";
import * as rand from "../shared/rand.js";
import * as gfx from "./gfx.js";
export const tileSize = 24;
export const lightRadius = 5;
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
        this.texture = null;
        this.textureLayer = -1;
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
    roll() {
        return rand.int(this.min, this.max + 1);
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
}
export class MeleeWeapon extends Weapon {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJybC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUNILE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQixNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFBO0FBQzFCLE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFFNUIsTUFBTSxDQUFOLElBQVksVUFJWDtBQUpELFdBQVksVUFBVTtJQUNsQiwyQ0FBSSxDQUFBO0lBQ0oseUNBQUcsQ0FBQTtJQUNILGlEQUFPLENBQUE7QUFDWCxDQUFDLEVBSlcsVUFBVSxLQUFWLFVBQVUsUUFJckI7QUFXRCxNQUFNLE9BQU8sS0FBSztJQVdkLFlBQVksT0FBcUI7O1FBTGpDLFVBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakMsWUFBTyxHQUF1QixJQUFJLENBQUE7UUFDbEMsaUJBQVksR0FBVyxDQUFDLENBQUMsQ0FBQTtRQUN6QixZQUFPLEdBQWUsVUFBVSxDQUFDLElBQUksQ0FBQTtRQUdqQyxJQUFJLENBQUMsUUFBUSxlQUFHLE9BQU8sQ0FBQyxRQUFRLDBDQUFFLEtBQUsscUNBQU0sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEUsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQTtRQUN0QyxJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUE7UUFDeEIsSUFB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QUksS0FBSyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFO1FBQzVCLE9BQU8sUUFBUSxDQUFBO0tBQ2xCO0lBRUQsT0FBTyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBQzVCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogcm9ndWUtbGlrZSBsaWJyYXJ5XHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcbmltcG9ydCAqIGFzIHJhbmQgZnJvbSBcIi4uL3NoYXJlZC9yYW5kLmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcblxyXG5leHBvcnQgY29uc3QgdGlsZVNpemUgPSAyNFxyXG5leHBvcnQgY29uc3QgbGlnaHRSYWRpdXMgPSA1XHJcblxyXG5leHBvcnQgZW51bSBWaXNpYmlsaXR5IHtcclxuICAgIE5vbmUsXHJcbiAgICBGb2csXHJcbiAgICBWaXNpYmxlXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGhpbmdPcHRpb25zIHtcclxuICAgIHBvc2l0aW9uPzogZ2VvLlBvaW50XHJcbiAgICBwYXNzYWJsZTogYm9vbGVhblxyXG4gICAgdHJhbnNwYXJlbnQ6IGJvb2xlYW5cclxuICAgIG5hbWU6IHN0cmluZ1xyXG4gICAgaW1hZ2U/OiBzdHJpbmdcclxuICAgIGNvbG9yPzogZ2Z4LkNvbG9yXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUaGluZyB7XHJcbiAgICBwb3NpdGlvbjogZ2VvLlBvaW50XHJcbiAgICBwYXNzYWJsZTogYm9vbGVhblxyXG4gICAgdHJhbnNwYXJlbnQ6IGJvb2xlYW5cclxuICAgIG5hbWU6IHN0cmluZ1xyXG4gICAgaW1hZ2U6IHN0cmluZ1xyXG4gICAgY29sb3IgPSBuZXcgZ2Z4LkNvbG9yKDEsIDEsIDEsIDEpXHJcbiAgICB0ZXh0dXJlOiBnZnguVGV4dHVyZSB8IG51bGwgPSBudWxsXHJcbiAgICB0ZXh0dXJlTGF5ZXI6IG51bWJlciA9IC0xXHJcbiAgICB2aXNpYmxlOiBWaXNpYmlsaXR5ID0gVmlzaWJpbGl0eS5Ob25lXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogVGhpbmdPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IG9wdGlvbnMucG9zaXRpb24/LmNsb25lKCkgPz8gbmV3IGdlby5Qb2ludCgtMSwgLTEpXHJcbiAgICAgICAgdGhpcy5wYXNzYWJsZSA9IG9wdGlvbnMucGFzc2FibGVcclxuICAgICAgICB0aGlzLnRyYW5zcGFyZW50ID0gb3B0aW9ucy50cmFuc3BhcmVudFxyXG4gICAgICAgIHRoaXMubmFtZSA9IG9wdGlvbnMubmFtZVxyXG4gICAgICAgIHRoaXMuaW1hZ2UgPSBvcHRpb25zLmltYWdlID8/IFwiXCJcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuY29sb3IpIHtcclxuICAgICAgICAgICAgdGhpcy5jb2xvciA9IG9wdGlvbnMuY29sb3JcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogVGhpbmcge1xyXG4gICAgICAgIHJldHVybiBuZXcgVGhpbmcodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIERpY2Uge1xyXG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgbWluOiBudW1iZXIgPSAwLCByZWFkb25seSBtYXg6IG51bWJlciA9IDApIHsgfVxyXG5cclxuICAgIHJvbGwoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gcmFuZC5pbnQodGhpcy5taW4sIHRoaXMubWF4ICsgMSlcclxuICAgIH1cclxuXHJcbiAgICBhZGQoeDogbnVtYmVyKTogRGljZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBEaWNlKHRoaXMubWluICsgeCwgdGhpcy5tYXggKyB4KVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IERpY2Uge1xyXG4gICAgICAgIHJldHVybiBuZXcgRGljZSh0aGlzLm1pbiwgdGhpcy5tYXgpXHJcbiAgICB9XHJcblxyXG4gICAgdG9TdHJpbmcoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gYCR7dGhpcy5taW59IC0gJHt0aGlzLm1heH1gXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUaWxlIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgY2xvbmUoKTogVGlsZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBUaWxlKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaXh0dXJlIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgY2xvbmUoKTogRml4dHVyZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBGaXh0dXJlKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBEb29yIGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICBjbG9uZSgpOiBEb29yIHtcclxuICAgICAgICByZXR1cm4gbmV3IERvb3IodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFN0YWlyc1VwIGV4dGVuZHMgRml4dHVyZSB7XHJcbiAgICBjbG9uZSgpOiBTdGFpcnNVcCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTdGFpcnNVcCh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU3RhaXJzRG93biBleHRlbmRzIEZpeHR1cmUge1xyXG4gICAgY2xvbmUoKTogU3RhaXJzRG93biB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTdGFpcnNEb3duKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSXRlbU9wdGlvbnMge1xyXG4gICAgcG9zaXRpb24/OiBnZW8uUG9pbnRcclxuICAgIG5hbWU6IHN0cmluZ1xyXG4gICAgaW1hZ2U/OiBzdHJpbmdcclxuICAgIGNvbG9yPzogZ2Z4LkNvbG9yXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBJdGVtIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogSXRlbU9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihPYmplY3QuYXNzaWduKHsgcGFzc2FibGU6IGZhbHNlLCB0cmFuc3BhcmVudDogdHJ1ZSB9LCBvcHRpb25zKSlcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBXZWFwb25PcHRpb25zIGV4dGVuZHMgSXRlbU9wdGlvbnMge1xyXG4gICAgYXR0YWNrOiBudW1iZXJcclxuICAgIHJhbmdlPzogbnVtYmVyXHJcbiAgICB2ZXJiPzogc3RyaW5nXHJcbiAgICBhY3Rpb246IG51bWJlclxyXG4gICAgZGFtYWdlOiBEaWNlXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBXZWFwb24gZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGF0dGFjazogbnVtYmVyXHJcbiAgICByZWFkb25seSBkYW1hZ2U6IERpY2VcclxuICAgIHJlYWRvbmx5IHJhbmdlOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGFjdGlvbjogbnVtYmVyXHJcbiAgICByZWFkb25seSB2ZXJiOiBzdHJpbmdcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBXZWFwb25PcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLmF0dGFjayA9IG9wdGlvbnMuYXR0YWNrXHJcbiAgICAgICAgdGhpcy5kYW1hZ2UgPSBvcHRpb25zLmRhbWFnZS5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy5yYW5nZSA9IG9wdGlvbnMucmFuZ2UgPz8gMVxyXG4gICAgICAgIHRoaXMudmVyYiA9IG9wdGlvbnMudmVyYiA/PyBcIlwiXHJcbiAgICAgICAgdGhpcy5hY3Rpb24gPSBvcHRpb25zLmFjdGlvblxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFdlYXBvbiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBXZWFwb24odGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFJhbmdlZFdlYXBvbiBleHRlbmRzIFdlYXBvbiB7IH1cclxuZXhwb3J0IGNsYXNzIE1lbGVlV2VhcG9uIGV4dGVuZHMgV2VhcG9uIHsgfVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBcm1vck9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEFybW9yIGV4dGVuZHMgSXRlbSB7XHJcbiAgICByZWFkb25seSBkZWZlbnNlOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBBcm1vck9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMuZGVmZW5zZSA9IG9wdGlvbnMuZGVmZW5zZVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEFybW9yIHtcclxuICAgICAgICByZXR1cm4gbmV3IEFybW9yKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSGVsbU9wdGlvbnMgZXh0ZW5kcyBJdGVtT3B0aW9ucyB7XHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEhlbG0gZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGRlZmVuc2U6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEhlbG1PcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIob3B0aW9ucylcclxuICAgICAgICB0aGlzLmRlZmVuc2UgPSBvcHRpb25zLmRlZmVuc2VcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBIZWxtIHtcclxuICAgICAgICByZXR1cm4gbmV3IEhlbG0odGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTaGllbGRPcHRpb25zIGV4dGVuZHMgSXRlbU9wdGlvbnMge1xyXG4gICAgZGVmZW5zZTogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTaGllbGQgZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGRlZmVuc2U6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFNoaWVsZE9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKVxyXG4gICAgICAgIHRoaXMuZGVmZW5zZSA9IG9wdGlvbnMuZGVmZW5zZVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFNoaWVsZCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTaGllbGQodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSaW5nT3B0aW9ucyBleHRlbmRzIEl0ZW1PcHRpb25zIHtcclxuICAgIHN0cmVuZ3RoPzogbnVtYmVyXHJcbiAgICBhZ2lsaXR5PzogbnVtYmVyXHJcbiAgICBpbnRlbGxpZ2VuY2U/OiBudW1iZXJcclxuICAgIG1heEhlYWx0aD86IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUmluZyBleHRlbmRzIEl0ZW0ge1xyXG4gICAgc3RyZW5ndGg6IG51bWJlclxyXG4gICAgYWdpbGl0eTogbnVtYmVyXHJcbiAgICBpbnRlbGxpZ2VuY2U6IG51bWJlclxyXG4gICAgbWF4SGVhbHRoOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBSaW5nT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5zdHJlbmd0aCA9IG9wdGlvbnMuc3RyZW5ndGggPz8gMFxyXG4gICAgICAgIHRoaXMuYWdpbGl0eSA9IG9wdGlvbnMuYWdpbGl0eSA/PyAwXHJcbiAgICAgICAgdGhpcy5pbnRlbGxpZ2VuY2UgPSBvcHRpb25zLmludGVsbGlnZW5jZSA/PyAwXHJcbiAgICAgICAgdGhpcy5tYXhIZWFsdGggPSBvcHRpb25zLm1heEhlYWx0aCA/PyAwXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIEVxdWlwcGFibGUgPSBNZWxlZVdlYXBvbiB8IFJhbmdlZFdlYXBvbiB8IEFybW9yIHwgSGVsbSB8IFNoaWVsZCB8IFJpbmdcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpc0VxdWlwcGFibGUoaXRlbTogSXRlbSk6IGl0ZW0gaXMgRXF1aXBwYWJsZSB7XHJcbiAgICByZXR1cm4gaXRlbSBpbnN0YW5jZW9mIFdlYXBvbiB8fCBpdGVtIGluc3RhbmNlb2YgQXJtb3IgfHwgaXRlbSBpbnN0YW5jZW9mIFNoaWVsZFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFVzYWJsZU9wdGlvbnMge1xyXG4gICAgcG9zaXRpb24/OiBnZW8uUG9pbnRcclxuICAgIG5hbWU6IHN0cmluZ1xyXG4gICAgaW1hZ2U/OiBzdHJpbmdcclxuICAgIGNvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICBoZWFsdGg6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVXNhYmxlIGV4dGVuZHMgSXRlbSB7XHJcbiAgICByZWFkb25seSBoZWFsdGg6IG51bWJlclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFVzYWJsZU9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihPYmplY3QuYXNzaWduKHsgcGFzc2FibGU6IGZhbHNlLCB0cmFuc3BhcmVudDogZmFsc2UgfSwgb3B0aW9ucykpXHJcbiAgICAgICAgdGhpcy5oZWFsdGggPSBvcHRpb25zLmhlYWx0aFxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFVzYWJsZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBVc2FibGUodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDcmVhdHVyZU9wdGlvbnMge1xyXG4gICAgcG9zaXRpb24/OiBnZW8uUG9pbnRcclxuICAgIG5hbWU6IHN0cmluZ1xyXG4gICAgaW1hZ2U6IHN0cmluZ1xyXG4gICAgY29sb3I/OiBnZnguQ29sb3JcclxuICAgIG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBoZWFsdGg/OiBudW1iZXJcclxuICAgIGFnaWxpdHk/OiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDcmVhdHVyZSBleHRlbmRzIFRoaW5nIHtcclxuICAgIG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBoZWFsdGg6IG51bWJlclxyXG4gICAgZGVmZW5zZTogbnVtYmVyXHJcbiAgICBhZ2lsaXR5OiBudW1iZXJcclxuICAgIGFjdGlvbjogbnVtYmVyXHJcbiAgICBhY3Rpb25SZXNlcnZlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQbGF5ZXJPcHRpb25zIGV4dGVuZHMgQ3JlYXR1cmVPcHRpb25zIHtcclxuICAgIGxldmVsPzogbnVtYmVyXHJcbiAgICBleHBlcmllbmNlPzogbnVtYmVyXHJcbiAgICBzdHJlbmd0aD86IG51bWJlclxyXG4gICAgaW50ZWxsaWdlbmNlPzogbnVtYmVyXHJcbiAgICBtYXhIZWFsdGg6IG51bWJlclxyXG4gICAgbWVsZWVXZWFwb24/OiBNZWxlZVdlYXBvbiB8IG51bGxcclxuICAgIHJhbmdlZFdlYXBvbj86IFJhbmdlZFdlYXBvbiB8IG51bGxcclxuICAgIGFybW9yPzogQXJtb3IgfCBudWxsXHJcbiAgICBoZWxtPzogSGVsbSB8IG51bGxcclxuICAgIHNoaWVsZD86IFNoaWVsZCB8IG51bGxcclxuICAgIHJpbmc/OiBSaW5nIHwgbnVsbFxyXG4gICAgaW52ZW50b3J5PzogU2V0PEl0ZW0+XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBQbGF5ZXIgZXh0ZW5kcyBUaGluZyBpbXBsZW1lbnRzIENyZWF0dXJlIHtcclxuICAgIGJhc2VTdHJlbmd0aDogbnVtYmVyXHJcbiAgICBiYXNlSW50ZWxsaWdlbmNlOiBudW1iZXJcclxuICAgIGJhc2VBZ2lsaXR5OiBudW1iZXJcclxuICAgIGJhc2VNYXhIZWFsdGg6IG51bWJlclxyXG4gICAgbGV2ZWw6IG51bWJlclxyXG4gICAgZXhwZXJpZW5jZTogbnVtYmVyXHJcbiAgICBoZWFsdGg6IG51bWJlclxyXG4gICAgYWN0aW9uOiBudW1iZXIgPSAwXHJcbiAgICBhY3Rpb25SZXNlcnZlOiBudW1iZXIgPSAwXHJcbiAgICBtZWxlZVdlYXBvbjogTWVsZWVXZWFwb24gfCBudWxsXHJcbiAgICByYW5nZWRXZWFwb246IFJhbmdlZFdlYXBvbiB8IG51bGxcclxuICAgIGFybW9yOiBBcm1vciB8IG51bGxcclxuICAgIGhlbG06IEhlbG0gfCBudWxsXHJcbiAgICBzaGllbGQ6IFNoaWVsZCB8IG51bGxcclxuICAgIHJpbmc6IFJpbmcgfCBudWxsXHJcbiAgICBpbnZlbnRvcnk6IFNldDxJdGVtPlxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFBsYXllck9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihPYmplY3QuYXNzaWduKHsgcGFzc2FibGU6IGZhbHNlLCB0cmFuc3BhcmVudDogdHJ1ZSB9LCBvcHRpb25zKSlcclxuICAgICAgICB0aGlzLmJhc2VTdHJlbmd0aCA9IG9wdGlvbnMuc3RyZW5ndGggPz8gMFxyXG4gICAgICAgIHRoaXMuYmFzZUludGVsbGlnZW5jZSA9IG9wdGlvbnMuc3RyZW5ndGggPz8gMFxyXG4gICAgICAgIHRoaXMuYmFzZUFnaWxpdHkgPSBvcHRpb25zLmFnaWxpdHkgPz8gMFxyXG4gICAgICAgIHRoaXMuYmFzZU1heEhlYWx0aCA9IG9wdGlvbnMubWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5sZXZlbCA9IG9wdGlvbnMubGV2ZWwgPz8gMVxyXG4gICAgICAgIHRoaXMuZXhwZXJpZW5jZSA9IG9wdGlvbnMuZXhwZXJpZW5jZSA/PyAwXHJcbiAgICAgICAgdGhpcy5oZWFsdGggPSBvcHRpb25zLmhlYWx0aCA/PyB0aGlzLm1heEhlYWx0aFxyXG4gICAgICAgIHRoaXMubWVsZWVXZWFwb24gPSBvcHRpb25zLm1lbGVlV2VhcG9uID8/IG51bGxcclxuICAgICAgICB0aGlzLnJhbmdlZFdlYXBvbiA9IG9wdGlvbnMucmFuZ2VkV2VhcG9uID8/IG51bGxcclxuICAgICAgICB0aGlzLmhlbG0gPSBvcHRpb25zLmhlbG0gPz8gbnVsbFxyXG4gICAgICAgIHRoaXMuYXJtb3IgPSBvcHRpb25zLmFybW9yID8/IG51bGxcclxuICAgICAgICB0aGlzLnNoaWVsZCA9IG9wdGlvbnMuc2hpZWxkID8/IG51bGxcclxuICAgICAgICB0aGlzLnJpbmcgPSBvcHRpb25zLnJpbmcgPz8gbnVsbFxyXG4gICAgICAgIHRoaXMuaW52ZW50b3J5ID0gb3B0aW9ucy5pbnZlbnRvcnkgPyBuZXcgU2V0PEl0ZW0+KG9wdGlvbnMuaW52ZW50b3J5KSA6IG5ldyBTZXQ8SXRlbT4oKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBzdHJlbmd0aCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJhc2VTdHJlbmd0aCArICh0aGlzLnJpbmc/LnN0cmVuZ3RoID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGFnaWxpdHkoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5iYXNlQWdpbGl0eSArICh0aGlzLnJpbmc/LmFnaWxpdHkgPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgaW50ZWxsaWdlbmNlKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYmFzZUludGVsbGlnZW5jZSArICh0aGlzLnJpbmc/LmludGVsbGlnZW5jZSA/PyAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBtYXhIZWFsdGgoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5iYXNlTWF4SGVhbHRoICsgKHRoaXMucmluZz8ubWF4SGVhbHRoID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IG1lbGVlQXR0YWNrKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RyZW5ndGggKyAodGhpcy5tZWxlZVdlYXBvbj8uYXR0YWNrID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IG1lbGVlRGFtYWdlKCk6IERpY2Uge1xyXG4gICAgICAgIHJldHVybiAodGhpcy5tZWxlZVdlYXBvbj8uZGFtYWdlID8/IG5ldyBEaWNlKDEsIDIpKS5hZGQodGhpcy5zdHJlbmd0aClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgcmFuZ2VkQXR0YWNrKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYWdpbGl0eSArICh0aGlzLnJhbmdlZFdlYXBvbj8uYXR0YWNrID8/IDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHJhbmdlZERhbWFnZSgpOiBEaWNlIHwgbnVsbCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucmFuZ2VkV2VhcG9uPy5kYW1hZ2U/LmFkZCh0aGlzLmFnaWxpdHkpID8/IG51bGxcclxuICAgIH1cclxuXHJcbiAgICBnZXQgZGVmZW5zZSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFnaWxpdHkgKyAodGhpcy5hcm1vcj8uZGVmZW5zZSA/PyAwKSArICh0aGlzLmhlbG0/LmRlZmVuc2UgPz8gMCkgKyAodGhpcy5zaGllbGQ/LmRlZmVuc2UgPz8gMClcclxuICAgIH1cclxuXHJcbiAgICBpc0VxdWlwcGVkKGl0ZW06IEl0ZW0pOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gWy4uLnRoaXMuZXF1aXBtZW50KCldLmluY2x1ZGVzKGl0ZW0pXHJcbiAgICB9XHJcblxyXG4gICAgKmVxdWlwbWVudCgpOiBJdGVyYWJsZTxJdGVtPiB7XHJcbiAgICAgICAgaWYgKHRoaXMubWVsZWVXZWFwb24pIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5tZWxlZVdlYXBvblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucmFuZ2VkV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMucmFuZ2VkV2VhcG9uXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5hcm1vcikge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLmFybW9yXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5oZWxtKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMuaGVsbVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc2hpZWxkKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMuc2hpZWxkXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5yaW5nKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRoaXMucmluZ1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBQbGF5ZXIge1xyXG4gICAgICAgIHJldHVybiBuZXcgUGxheWVyKHRoaXMpXHJcbiAgICB9XHJcblxyXG4gICAgZXF1aXAoaXRlbTogSXRlbSkge1xyXG4gICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgTWVsZWVXZWFwb24pIHtcclxuICAgICAgICAgICAgdGhpcy5tZWxlZVdlYXBvbiA9IGl0ZW1cclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBSYW5nZWRXZWFwb24pIHtcclxuICAgICAgICAgICAgdGhpcy5yYW5nZWRXZWFwb24gPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgQXJtb3IpIHtcclxuICAgICAgICAgICAgdGhpcy5hcm1vciA9IGl0ZW1cclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBTaGllbGQpIHtcclxuICAgICAgICAgICAgdGhpcy5zaGllbGQgPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgSGVsbSkge1xyXG4gICAgICAgICAgICB0aGlzLmhlbG0gPSBpdGVtXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgUmluZykge1xyXG4gICAgICAgICAgICB0aGlzLnJpbmcgPSBpdGVtXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJlbW92ZShpdGVtOiBJdGVtKSB7XHJcbiAgICAgICAgaWYgKHRoaXMubWVsZWVXZWFwb24gPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5tZWxlZVdlYXBvbiA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnJhbmdlZFdlYXBvbiA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLnJhbmdlZFdlYXBvbiA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmFybW9yID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXJtb3IgPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5oZWxtID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGVsbSA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnNoaWVsZCA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLnNoaWVsZCA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnJpbmcgPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5yaW5nID0gbnVsbFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBkZWxldGUoaXRlbTogSXRlbSkge1xyXG5cclxuICAgICAgICBpZiAoaXNFcXVpcHBhYmxlKGl0ZW0pKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKGl0ZW0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmludmVudG9yeS5kZWxldGUoaXRlbSlcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBdHRhY2tPcHRpb25zIHtcclxuICAgIGF0dGFjazogbnVtYmVyXHJcbiAgICBkYW1hZ2U6IERpY2VcclxuICAgIGFjdGlvbjogbnVtYmVyXHJcbiAgICByYW5nZT86IG51bWJlclxyXG4gICAgdmVyYj86IHN0cmluZ1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQXR0YWNrIHtcclxuICAgIGF0dGFjazogbnVtYmVyXHJcbiAgICBkYW1hZ2U6IERpY2VcclxuICAgIGFjdGlvbjogbnVtYmVyXHJcbiAgICByYW5nZTogbnVtYmVyXHJcbiAgICB2ZXJiOiBzdHJpbmdcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBBdHRhY2tPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5hdHRhY2sgPSBvcHRpb25zLmF0dGFjayA/PyAwXHJcbiAgICAgICAgdGhpcy5kYW1hZ2UgPSBvcHRpb25zLmRhbWFnZS5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy5hY3Rpb24gPSBvcHRpb25zLmFjdGlvblxyXG4gICAgICAgIHRoaXMucmFuZ2UgPSBvcHRpb25zLnJhbmdlID8/IDFcclxuICAgICAgICB0aGlzLnZlcmIgPSBvcHRpb25zLnZlcmIgPz8gXCJcIlxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEF0dGFjayB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBdHRhY2sodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGVudW0gTW9uc3RlclN0YXRlIHtcclxuICAgIGlkbGUsXHJcbiAgICBhZ2dyb1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1vbnN0ZXJPcHRpb25zIGV4dGVuZHMgQ3JlYXR1cmVPcHRpb25zIHtcclxuICAgIGRlZmVuc2U6IG51bWJlclxyXG4gICAgZXhwZXJpZW5jZTogbnVtYmVyLFxyXG4gICAgYXR0YWNrczogQXR0YWNrW11cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1vbnN0ZXIgZXh0ZW5kcyBUaGluZyBpbXBsZW1lbnRzIENyZWF0dXJlIHtcclxuICAgIGFnaWxpdHk6IG51bWJlclxyXG4gICAgZGVmZW5zZTogbnVtYmVyXHJcbiAgICBtYXhIZWFsdGg6IG51bWJlclxyXG4gICAgaGVhbHRoOiBudW1iZXJcclxuICAgIGV4cGVyaWVuY2U6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgYXR0YWNrczogQXR0YWNrW10gPSBbXVxyXG4gICAgc3RhdGU6IE1vbnN0ZXJTdGF0ZSA9IE1vbnN0ZXJTdGF0ZS5pZGxlXHJcbiAgICBhY3Rpb246IG51bWJlciA9IDBcclxuICAgIGFjdGlvblJlc2VydmU6IG51bWJlciA9IDBcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBNb25zdGVyT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuYWdpbGl0eSA9IG9wdGlvbnMuYWdpbGl0eSA/PyAwXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlID0gb3B0aW9ucy5kZWZlbnNlID8/IDBcclxuICAgICAgICB0aGlzLm1heEhlYWx0aCA9IG9wdGlvbnMubWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5oZWFsdGggPSBvcHRpb25zLmhlYWx0aCA/PyB0aGlzLm1heEhlYWx0aFxyXG4gICAgICAgIHRoaXMuZXhwZXJpZW5jZSA9IG9wdGlvbnMuZXhwZXJpZW5jZVxyXG4gICAgICAgIHRoaXMuYXR0YWNrcyA9IFsuLi5vcHRpb25zLmF0dGFja3NdXHJcblxyXG4gICAgICAgIGlmICh0aGlzLmF0dGFja3MubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBhdHRhY2tzIGRlZmluZWQgZm9yIG1vbnN0ZXIgJHt0aGlzLm5hbWV9YClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogTW9uc3RlciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNb25zdGVyKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29udGFpbmVyT3B0aW9ucyB7XHJcbiAgICBwb3NpdGlvbj86IGdlby5Qb2ludFxyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZTogc3RyaW5nXHJcbiAgICBjb2xvcj86IGdmeC5Db2xvclxyXG4gICAgaXRlbXM/OiBTZXQ8SXRlbT5cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIENvbnRhaW5lciBleHRlbmRzIEZpeHR1cmUge1xyXG4gICAgcmVhZG9ubHkgaXRlbXM6IFNldDxJdGVtPlxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IENvbnRhaW5lck9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihPYmplY3QuYXNzaWduKHsgcGFzc2FibGU6IGZhbHNlLCB0cmFuc3BhcmVudDogdHJ1ZSB9LCBvcHRpb25zKSlcclxuICAgICAgICB0aGlzLml0ZW1zID0gbmV3IFNldDxJdGVtPihbLi4ub3B0aW9ucy5pdGVtcyA/PyBbXV0pXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogQ29udGFpbmVyIHtcclxuICAgICAgICByZXR1cm4gbmV3IENvbnRhaW5lcih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5jb25zdCBsZXZlbHMgPSBbXHJcbiAgICAxMCxcclxuICAgIDIwLFxyXG4gICAgNTAsXHJcbiAgICAxMDAsXHJcbiAgICAyMDAsXHJcbiAgICA1MDAsXHJcbiAgICAxMDAwLFxyXG4gICAgMjAwMCxcclxuICAgIDUwMDAsXHJcbiAgICAxMDAwMF1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHBlcmllbmNlUmVxdWlyZW1lbnQobGV2ZWw6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICBpZiAobGV2ZWwgPCAyKSB7XHJcbiAgICAgICAgcmV0dXJuIDBcclxuICAgIH1cclxuXHJcbiAgICBpZiAobGV2ZWwgLSAyID49IGxldmVscy5sZW5ndGgpIHtcclxuICAgICAgICByZXR1cm4gSW5maW5pdHlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbGV2ZWxzW2xldmVsIC0gMl1cclxufSJdfQ==