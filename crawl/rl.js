import * as rand from "../shared/rand.js";
import * as gfx from "./gfx.js";
export const tileSize = 24;
export const lightRadius = 9;
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
        this.position = (_b = (_a = options.position) === null || _a === void 0 ? void 0 : _a.clone()) !== null && _b !== void 0 ? _b : null;
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
    clone() {
        return new Dice(this.min, this.max);
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
}
export class Weapon extends Item {
    constructor(options) {
        var _a;
        super(Object.assign({ passable: false, transparent: false }, options));
        this.attack = options.attack;
        this.damage = options.damage.clone();
        this.range = (_a = options.range) !== null && _a !== void 0 ? _a : 1;
    }
    clone() {
        return new Weapon(this);
    }
}
export class Armor extends Item {
    constructor(options) {
        super(Object.assign({ passable: false, transparent: false }, options));
        this.defense = options.defense;
    }
    clone() {
        return new Armor(this);
    }
}
export class Shield extends Item {
    constructor(options) {
        super(Object.assign({ passable: false, transparent: false }, options));
        this.defense = options.defense;
    }
    clone() {
        return new Shield(this);
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
export class Creature extends Thing {
    constructor(options) {
        var _a;
        super(Object.assign({ passable: false, transparent: true }, options));
        this.action = 0;
        this.maxHealth = options.maxHealth;
        this.health = (_a = options.health) !== null && _a !== void 0 ? _a : this.maxHealth;
        this.attack = options.attack;
        this.defense = options.defense;
        this.agility = options.agility;
    }
    clone() {
        return new Creature(this);
    }
}
export class Player extends Creature {
    constructor(options) {
        var _a, _b, _c, _d, _e;
        super(options);
        this.level = 1;
        this.experience = 0;
        this.level = (_a = options.level) !== null && _a !== void 0 ? _a : 1;
        if (this.level < 1) {
            this.level = 1;
        }
        this.experience = (_b = options.experience) !== null && _b !== void 0 ? _b : 0;
        this.weapon = (_c = options.weapon) !== null && _c !== void 0 ? _c : null;
        this.armor = (_d = options.armor) !== null && _d !== void 0 ? _d : null;
        this.shield = (_e = options.shield) !== null && _e !== void 0 ? _e : null;
        this.inventory = options.inventory ? new Set(options.inventory) : new Set();
    }
    clone() {
        return new Player(this);
    }
    equip(item) {
        if (!this.inventory.has(item)) {
            return;
        }
        else if (item instanceof Weapon) {
            this.equipWeapon(item);
        }
        else if (item instanceof Armor) {
            this.equipArmor(item);
        }
        else if (item instanceof Shield) {
            this.equipShield(item);
        }
    }
    remove(item) {
        if (item === this.weapon) {
            this.removeWeapon();
        }
        else if (item === this.armor) {
            this.removeArmor();
        }
        else if (item === this.shield) {
            this.removeShield();
        }
    }
    equipWeapon(weapon) {
        this.removeWeapon();
        this.weapon = weapon;
        this.attack += weapon.attack;
    }
    equipArmor(armor) {
        this.removeArmor();
        this.armor = armor;
        this.defense += armor.defense;
    }
    equipShield(shield) {
        this.removeShield();
        this.shield = shield;
        this.defense += shield.defense;
    }
    removeWeapon() {
        if (!this.weapon) {
            return;
        }
        this.attack -= this.weapon.attack;
        this.weapon = null;
    }
    removeArmor() {
        if (!this.armor) {
            return;
        }
        this.defense -= this.armor.defense;
        this.armor = null;
    }
    removeShield() {
        if (!this.shield) {
            return;
        }
        this.defense -= this.shield.defense;
        this.shield = null;
    }
    isEquipped(item) {
        return this.weapon === item || this.armor === item || this.shield === item;
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
        var _a, _b;
        this.attack = (_a = options.attack) !== null && _a !== void 0 ? _a : 0;
        this.damage = options.damage.clone();
        this.verb = (_b = options.verb) !== null && _b !== void 0 ? _b : "";
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
export class Monster extends Creature {
    constructor(options) {
        var _a;
        super(options);
        this.attacks = [];
        this.experience = options.experience;
        this.attacks = [...options.attacks];
        this.state = (_a = options.state) !== null && _a !== void 0 ? _a : MonsterState.idle;
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
        this.position = (_a = options.position) !== null && _a !== void 0 ? _a : null;
        this.items = new Set(options.items);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJybC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFJQSxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0sVUFBVSxDQUFBO0FBRS9CLE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFDMUIsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQTtBQUU1QixNQUFNLENBQU4sSUFBWSxVQUlYO0FBSkQsV0FBWSxVQUFVO0lBQ2xCLDJDQUFJLENBQUE7SUFDSix5Q0FBRyxDQUFBO0lBQ0gsaURBQU8sQ0FBQTtBQUNYLENBQUMsRUFKVyxVQUFVLEtBQVYsVUFBVSxRQUlyQjtBQVdELE1BQU0sT0FBTyxLQUFLO0lBV2QsWUFBWSxPQUFxQjs7UUFMakMsVUFBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxZQUFPLEdBQXVCLElBQUksQ0FBQTtRQUNsQyxpQkFBWSxHQUFXLENBQUMsQ0FBQyxDQUFBO1FBQ3pCLFlBQU8sR0FBZSxVQUFVLENBQUMsSUFBSSxDQUFBO1FBR2pDLElBQUksQ0FBQyxRQUFRLGVBQUcsT0FBTyxDQUFDLFFBQVEsMENBQUUsS0FBSyxxQ0FBTSxJQUFJLENBQUE7UUFDakQsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQTtRQUN0QyxJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUE7UUFDeEIsSUFBSSxDQUFDLEtBQUssU0FBRyxPQUFPLENBQUMsS0FBSyxtQ0FBSSxFQUFFLENBQUE7UUFFaEMsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFO1lBQ2YsSUFBSSxDQUFDLEtBQUss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SSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNyRSxJQUFJLENBQUMsUUFBUSxTQUFHLE9BQU8sQ0FBQyxRQUFRLG1DQUFJLElBQUksQ0FBQTtRQUN4QyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksR0FBRyxDQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0NBQ0o7QUFFRCxNQUFNLE1BQU0sR0FBRztJQUNYLEVBQUU7SUFDRixFQUFFO0lBQ0YsRUFBRTtJQUNGLEdBQUc7SUFDSCxHQUFHO0lBQ0gsR0FBRztJQUNILElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLEtBQUs7Q0FBQyxDQUFBO0FBRVYsTUFBTSxVQUFVLHdCQUF3QixDQUFDLEtBQWE7SUFDbEQsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFO1FBQ1gsT0FBTyxDQUFDLENBQUE7S0FDWDtJQUVELElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFO1FBQzVCLE9BQU8sUUFBUSxDQUFBO0tBQ2xCO0lBRUQsT0FBTyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBQzVCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogcm9ndWUtbGlrZSBsaWJyYXJ5XHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcbmltcG9ydCAqIGFzIHJhbmQgZnJvbSBcIi4uL3NoYXJlZC9yYW5kLmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcblxyXG5leHBvcnQgY29uc3QgdGlsZVNpemUgPSAyNFxyXG5leHBvcnQgY29uc3QgbGlnaHRSYWRpdXMgPSA5XHJcblxyXG5leHBvcnQgZW51bSBWaXNpYmlsaXR5IHtcclxuICAgIE5vbmUsXHJcbiAgICBGb2csXHJcbiAgICBWaXNpYmxlXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGhpbmdPcHRpb25zIHtcclxuICAgIHBvc2l0aW9uPzogZ2VvLlBvaW50IHwgbnVsbFxyXG4gICAgcGFzc2FibGU6IGJvb2xlYW5cclxuICAgIHRyYW5zcGFyZW50OiBib29sZWFuXHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlPzogc3RyaW5nXHJcbiAgICBjb2xvcj86IGdmeC5Db2xvclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGhpbmcge1xyXG4gICAgcG9zaXRpb246IGdlby5Qb2ludCB8IG51bGxcclxuICAgIHBhc3NhYmxlOiBib29sZWFuXHJcbiAgICB0cmFuc3BhcmVudDogYm9vbGVhblxyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZTogc3RyaW5nXHJcbiAgICBjb2xvciA9IG5ldyBnZnguQ29sb3IoMSwgMSwgMSwgMSlcclxuICAgIHRleHR1cmU6IGdmeC5UZXh0dXJlIHwgbnVsbCA9IG51bGxcclxuICAgIHRleHR1cmVMYXllcjogbnVtYmVyID0gLTFcclxuICAgIHZpc2libGU6IFZpc2liaWxpdHkgPSBWaXNpYmlsaXR5Lk5vbmVcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBUaGluZ09wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbj8uY2xvbmUoKSA/PyBudWxsXHJcbiAgICAgICAgdGhpcy5wYXNzYWJsZSA9IG9wdGlvbnMucGFzc2FibGVcclxuICAgICAgICB0aGlzLnRyYW5zcGFyZW50ID0gb3B0aW9ucy50cmFuc3BhcmVudFxyXG4gICAgICAgIHRoaXMubmFtZSA9IG9wdGlvbnMubmFtZVxyXG4gICAgICAgIHRoaXMuaW1hZ2UgPSBvcHRpb25zLmltYWdlID8/IFwiXCJcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuY29sb3IpIHtcclxuICAgICAgICAgICAgdGhpcy5jb2xvciA9IG9wdGlvbnMuY29sb3JcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogVGhpbmcge1xyXG4gICAgICAgIHJldHVybiBuZXcgVGhpbmcodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIERpY2Uge1xyXG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgbWluOiBudW1iZXIgPSAwLCByZWFkb25seSBtYXg6IG51bWJlciA9IDApIHsgfVxyXG5cclxuICAgIHJvbGwoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gcmFuZC5pbnQodGhpcy5taW4sIHRoaXMubWF4ICsgMSlcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBEaWNlIHtcclxuICAgICAgICByZXR1cm4gbmV3IERpY2UodGhpcy5taW4sIHRoaXMubWF4KVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGlsZSBleHRlbmRzIFRoaW5nIHtcclxuICAgIGNsb25lKCk6IFRpbGUge1xyXG4gICAgICAgIHJldHVybiBuZXcgVGlsZSh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRml4dHVyZSBleHRlbmRzIFRoaW5nIHtcclxuICAgIGNsb25lKCk6IEZpeHR1cmUge1xyXG4gICAgICAgIHJldHVybiBuZXcgRml4dHVyZSh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRG9vciBleHRlbmRzIEZpeHR1cmUge1xyXG4gICAgY2xvbmUoKTogRG9vciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBEb29yKHRoaXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTdGFpcnNVcCBleHRlbmRzIEZpeHR1cmUge1xyXG4gICAgY2xvbmUoKTogU3RhaXJzVXAge1xyXG4gICAgICAgIHJldHVybiBuZXcgU3RhaXJzVXAodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFN0YWlyc0Rvd24gZXh0ZW5kcyBGaXh0dXJlIHtcclxuICAgIGNsb25lKCk6IFN0YWlyc0Rvd24ge1xyXG4gICAgICAgIHJldHVybiBuZXcgU3RhaXJzRG93bih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgSXRlbSBleHRlbmRzIFRoaW5nIHsgfVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBXZWFwb25PcHRpb25zIHtcclxuICAgIHBvc2l0aW9uPzogZ2VvLlBvaW50IHwgbnVsbFxyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZT86IHN0cmluZ1xyXG4gICAgY29sb3I/OiBnZnguQ29sb3JcclxuICAgIGF0dGFjazogbnVtYmVyXHJcbiAgICByYW5nZT86IG51bWJlclxyXG4gICAgZGFtYWdlOiBEaWNlXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBXZWFwb24gZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGF0dGFjazogbnVtYmVyXHJcbiAgICByZWFkb25seSBkYW1hZ2U6IERpY2VcclxuICAgIHJlYWRvbmx5IHJhbmdlOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBXZWFwb25PcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IGZhbHNlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuYXR0YWNrID0gb3B0aW9ucy5hdHRhY2tcclxuICAgICAgICB0aGlzLmRhbWFnZSA9IG9wdGlvbnMuZGFtYWdlLmNsb25lKClcclxuICAgICAgICB0aGlzLnJhbmdlID0gb3B0aW9ucy5yYW5nZSA/PyAxXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogV2VhcG9uIHtcclxuICAgICAgICByZXR1cm4gbmV3IFdlYXBvbih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFybW9yT3B0aW9ucyB7XHJcbiAgICBwb3NpdGlvbj86IGdlby5Qb2ludCB8IG51bGxcclxuICAgIG5hbWU6IHN0cmluZ1xyXG4gICAgaW1hZ2U/OiBzdHJpbmdcclxuICAgIGNvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEFybW9yIGV4dGVuZHMgSXRlbSB7XHJcbiAgICByZWFkb25seSBkZWZlbnNlOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBBcm1vck9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihPYmplY3QuYXNzaWduKHsgcGFzc2FibGU6IGZhbHNlLCB0cmFuc3BhcmVudDogZmFsc2UgfSwgb3B0aW9ucykpXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlID0gb3B0aW9ucy5kZWZlbnNlXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogQXJtb3Ige1xyXG4gICAgICAgIHJldHVybiBuZXcgQXJtb3IodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTaGllbGRPcHRpb25zIHtcclxuICAgIHBvc2l0aW9uPzogZ2VvLlBvaW50IHwgbnVsbFxyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZT86IHN0cmluZ1xyXG4gICAgY29sb3I/OiBnZnguQ29sb3JcclxuICAgIGRlZmVuc2U6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU2hpZWxkIGV4dGVuZHMgSXRlbSB7XHJcbiAgICByZWFkb25seSBkZWZlbnNlOiBudW1iZXJcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBTaGllbGRPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IGZhbHNlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMuZGVmZW5zZSA9IG9wdGlvbnMuZGVmZW5zZVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFNoaWVsZCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTaGllbGQodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IHR5cGUgRXF1aXBwYWJsZSA9IFdlYXBvbiB8IEFybW9yIHwgU2hpZWxkXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaXNFcXVpcHBhYmxlKGl0ZW06IEl0ZW0pOiBpdGVtIGlzIEVxdWlwcGFibGUge1xyXG4gICAgcmV0dXJuIGl0ZW0gaW5zdGFuY2VvZiBXZWFwb24gfHwgaXRlbSBpbnN0YW5jZW9mIEFybW9yIHx8IGl0ZW0gaW5zdGFuY2VvZiBTaGllbGRcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBVc2FibGVPcHRpb25zIHtcclxuICAgIHBvc2l0aW9uPzogZ2VvLlBvaW50IHwgbnVsbFxyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZT86IHN0cmluZ1xyXG4gICAgY29sb3I/OiBnZnguQ29sb3JcclxuICAgIGhlYWx0aDogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBVc2FibGUgZXh0ZW5kcyBJdGVtIHtcclxuICAgIHJlYWRvbmx5IGhlYWx0aDogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogVXNhYmxlT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiBmYWxzZSB9LCBvcHRpb25zKSlcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IG9wdGlvbnMuaGVhbHRoXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogVXNhYmxlIHtcclxuICAgICAgICByZXR1cm4gbmV3IFVzYWJsZSh0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0dXJlT3B0aW9ucyB7XHJcbiAgICBwb3NpdGlvbj86IGdlby5Qb2ludCB8IG51bGxcclxuICAgIG5hbWU6IHN0cmluZ1xyXG4gICAgaW1hZ2U6IHN0cmluZ1xyXG4gICAgY29sb3I/OiBnZnguQ29sb3JcclxuICAgIG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBoZWFsdGg/OiBudW1iZXJcclxuICAgIGF0dGFjazogbnVtYmVyXHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxuICAgIGFnaWxpdHk6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ3JlYXR1cmUgZXh0ZW5kcyBUaGluZyB7XHJcbiAgICBtYXhIZWFsdGg6IG51bWJlclxyXG4gICAgaGVhbHRoOiBudW1iZXJcclxuICAgIGF0dGFjazogbnVtYmVyXHJcbiAgICBkZWZlbnNlOiBudW1iZXJcclxuICAgIGFnaWxpdHk6IG51bWJlclxyXG4gICAgYWN0aW9uOiBudW1iZXIgPSAwXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQ3JlYXR1cmVPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IHRydWUgfSwgb3B0aW9ucykpXHJcbiAgICAgICAgdGhpcy5tYXhIZWFsdGggPSBvcHRpb25zLm1heEhlYWx0aFxyXG4gICAgICAgIHRoaXMuaGVhbHRoID0gb3B0aW9ucy5oZWFsdGggPz8gdGhpcy5tYXhIZWFsdGhcclxuICAgICAgICB0aGlzLmF0dGFjayA9IG9wdGlvbnMuYXR0YWNrXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlID0gb3B0aW9ucy5kZWZlbnNlXHJcbiAgICAgICAgdGhpcy5hZ2lsaXR5ID0gb3B0aW9ucy5hZ2lsaXR5XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogQ3JlYXR1cmUge1xyXG4gICAgICAgIHJldHVybiBuZXcgQ3JlYXR1cmUodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQbGF5ZXJPcHRpb25zIGV4dGVuZHMgQ3JlYXR1cmVPcHRpb25zIHtcclxuICAgIGxldmVsPzogbnVtYmVyXHJcbiAgICBleHBlcmllbmNlPzogbnVtYmVyXHJcbiAgICB3ZWFwb24/OiBXZWFwb24gfCBudWxsXHJcbiAgICBhcm1vcj86IEFybW9yIHwgbnVsbFxyXG4gICAgc2hpZWxkPzogU2hpZWxkIHwgbnVsbFxyXG4gICAgaW52ZW50b3J5PzogU2V0PEl0ZW0+XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBQbGF5ZXIgZXh0ZW5kcyBDcmVhdHVyZSB7XHJcbiAgICBsZXZlbDogbnVtYmVyID0gMVxyXG4gICAgZXhwZXJpZW5jZTogbnVtYmVyID0gMFxyXG4gICAgd2VhcG9uOiBXZWFwb24gfCBudWxsXHJcbiAgICBhcm1vcjogQXJtb3IgfCBudWxsXHJcbiAgICBzaGllbGQ6IFNoaWVsZCB8IG51bGxcclxuICAgIGludmVudG9yeTogU2V0PEl0ZW0+XHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogUGxheWVyT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcblxyXG4gICAgICAgIHRoaXMubGV2ZWwgPSBvcHRpb25zLmxldmVsID8/IDFcclxuICAgICAgICBpZiAodGhpcy5sZXZlbCA8IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5sZXZlbCA9IDFcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZXhwZXJpZW5jZSA9IG9wdGlvbnMuZXhwZXJpZW5jZSA/PyAwXHJcbiAgICAgICAgdGhpcy53ZWFwb24gPSBvcHRpb25zLndlYXBvbiA/PyBudWxsXHJcbiAgICAgICAgdGhpcy5hcm1vciA9IG9wdGlvbnMuYXJtb3IgPz8gbnVsbFxyXG4gICAgICAgIHRoaXMuc2hpZWxkID0gb3B0aW9ucy5zaGllbGQgPz8gbnVsbFxyXG4gICAgICAgIHRoaXMuaW52ZW50b3J5ID0gb3B0aW9ucy5pbnZlbnRvcnkgPyBuZXcgU2V0PEl0ZW0+KG9wdGlvbnMuaW52ZW50b3J5KSA6IG5ldyBTZXQ8SXRlbT4oKVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFBsYXllciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQbGF5ZXIodGhpcylcclxuICAgIH1cclxuXHJcbiAgICBlcXVpcChpdGVtOiBFcXVpcHBhYmxlKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmludmVudG9yeS5oYXMoaXRlbSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgV2VhcG9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXF1aXBXZWFwb24oaXRlbSlcclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBBcm1vcikge1xyXG4gICAgICAgICAgICB0aGlzLmVxdWlwQXJtb3IoaXRlbSlcclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBTaGllbGQpIHtcclxuICAgICAgICAgICAgdGhpcy5lcXVpcFNoaWVsZChpdGVtKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZW1vdmUoaXRlbTogRXF1aXBwYWJsZSkge1xyXG4gICAgICAgIGlmIChpdGVtID09PSB0aGlzLndlYXBvbikge1xyXG4gICAgICAgICAgICB0aGlzLnJlbW92ZVdlYXBvbigpXHJcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtID09PSB0aGlzLmFybW9yKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQXJtb3IoKVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSA9PT0gdGhpcy5zaGllbGQpIHtcclxuICAgICAgICAgICAgdGhpcy5yZW1vdmVTaGllbGQoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBlcXVpcFdlYXBvbih3ZWFwb246IFdlYXBvbikge1xyXG4gICAgICAgIHRoaXMucmVtb3ZlV2VhcG9uKClcclxuICAgICAgICB0aGlzLndlYXBvbiA9IHdlYXBvblxyXG4gICAgICAgIHRoaXMuYXR0YWNrICs9IHdlYXBvbi5hdHRhY2tcclxuICAgIH1cclxuXHJcbiAgICBlcXVpcEFybW9yKGFybW9yOiBBcm1vcikge1xyXG4gICAgICAgIHRoaXMucmVtb3ZlQXJtb3IoKVxyXG4gICAgICAgIHRoaXMuYXJtb3IgPSBhcm1vclxyXG4gICAgICAgIHRoaXMuZGVmZW5zZSArPSBhcm1vci5kZWZlbnNlXHJcbiAgICB9XHJcblxyXG4gICAgZXF1aXBTaGllbGQoc2hpZWxkOiBTaGllbGQpIHtcclxuICAgICAgICB0aGlzLnJlbW92ZVNoaWVsZCgpXHJcbiAgICAgICAgdGhpcy5zaGllbGQgPSBzaGllbGRcclxuICAgICAgICB0aGlzLmRlZmVuc2UgKz0gc2hpZWxkLmRlZmVuc2VcclxuICAgIH1cclxuXHJcbiAgICByZW1vdmVXZWFwb24oKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLndlYXBvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuYXR0YWNrIC09IHRoaXMud2VhcG9uLmF0dGFja1xyXG4gICAgICAgIHRoaXMud2VhcG9uID0gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIHJlbW92ZUFybW9yKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5hcm1vcikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZGVmZW5zZSAtPSB0aGlzLmFybW9yLmRlZmVuc2VcclxuICAgICAgICB0aGlzLmFybW9yID0gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIHJlbW92ZVNoaWVsZCgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuc2hpZWxkKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlIC09IHRoaXMuc2hpZWxkLmRlZmVuc2VcclxuICAgICAgICB0aGlzLnNoaWVsZCA9IG51bGxcclxuICAgIH1cclxuXHJcbiAgICBpc0VxdWlwcGVkKGl0ZW06IEl0ZW0pOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy53ZWFwb24gPT09IGl0ZW0gfHwgdGhpcy5hcm1vciA9PT0gaXRlbSB8fCB0aGlzLnNoaWVsZCA9PT0gaXRlbVxyXG4gICAgfVxyXG5cclxuICAgIGRlbGV0ZShpdGVtOiBJdGVtKSB7XHJcbiAgICAgICAgaWYgKGlzRXF1aXBwYWJsZShpdGVtKSkge1xyXG4gICAgICAgICAgICB0aGlzLnJlbW92ZShpdGVtKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5pbnZlbnRvcnkuZGVsZXRlKGl0ZW0pXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXR0YWNrT3B0aW9ucyB7XHJcbiAgICBhdHRhY2s/OiBudW1iZXJcclxuICAgIGRhbWFnZTogRGljZVxyXG4gICAgdmVyYj86IHN0cmluZ1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQXR0YWNrIHtcclxuICAgIGF0dGFjazogbnVtYmVyXHJcbiAgICBkYW1hZ2U6IERpY2VcclxuICAgIHZlcmI6IHN0cmluZ1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEF0dGFja09wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLmF0dGFjayA9IG9wdGlvbnMuYXR0YWNrID8/IDBcclxuICAgICAgICB0aGlzLmRhbWFnZSA9IG9wdGlvbnMuZGFtYWdlLmNsb25lKClcclxuICAgICAgICB0aGlzLnZlcmIgPSBvcHRpb25zLnZlcmIgPz8gXCJcIlxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEF0dGFjayB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBdHRhY2sodGhpcylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGVudW0gTW9uc3RlclN0YXRlIHtcclxuICAgIGlkbGUsXHJcbiAgICBhZ2dyb1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1vbnN0ZXJPcHRpb25zIGV4dGVuZHMgQ3JlYXR1cmVPcHRpb25zIHtcclxuICAgIGV4cGVyaWVuY2U6IG51bWJlcixcclxuICAgIGF0dGFja3M6IEF0dGFja1tdLFxyXG4gICAgc3RhdGU/OiBNb25zdGVyU3RhdGVcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1vbnN0ZXIgZXh0ZW5kcyBDcmVhdHVyZSB7XHJcbiAgICBleHBlcmllbmNlOiBudW1iZXJcclxuICAgIHJlYWRvbmx5IGF0dGFja3M6IEF0dGFja1tdID0gW11cclxuICAgIHN0YXRlOiBNb25zdGVyU3RhdGVcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBNb25zdGVyT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5leHBlcmllbmNlID0gb3B0aW9ucy5leHBlcmllbmNlXHJcbiAgICAgICAgdGhpcy5hdHRhY2tzID0gWy4uLm9wdGlvbnMuYXR0YWNrc11cclxuICAgICAgICB0aGlzLnN0YXRlID0gb3B0aW9ucy5zdGF0ZSA/PyBNb25zdGVyU3RhdGUuaWRsZVxyXG5cclxuICAgICAgICBpZiAodGhpcy5hdHRhY2tzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gYXR0YWNrcyBkZWZpbmVkIGZvciBtb25zdGVyICR7dGhpcy5uYW1lfWApXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IE1vbnN0ZXIge1xyXG4gICAgICAgIHJldHVybiBuZXcgTW9uc3Rlcih0aGlzKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENvbnRhaW5lck9wdGlvbnMge1xyXG4gICAgcG9zaXRpb24/OiBnZW8uUG9pbnQgfCBudWxsXHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlOiBzdHJpbmdcclxuICAgIGNvbG9yPzogZ2Z4LkNvbG9yXHJcbiAgICBpdGVtczogU2V0PEl0ZW0+XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBDb250YWluZXIgZXh0ZW5kcyBGaXh0dXJlIHtcclxuICAgIHJlYWRvbmx5IGl0ZW1zOiBTZXQ8SXRlbT5cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBDb250YWluZXJPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IHRydWUgfSwgb3B0aW9ucykpXHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IG9wdGlvbnMucG9zaXRpb24gPz8gbnVsbFxyXG4gICAgICAgIHRoaXMuaXRlbXMgPSBuZXcgU2V0PEl0ZW0+KG9wdGlvbnMuaXRlbXMpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNvbnN0IGxldmVscyA9IFtcclxuICAgIDEwLFxyXG4gICAgMjAsXHJcbiAgICA1MCxcclxuICAgIDEwMCxcclxuICAgIDIwMCxcclxuICAgIDUwMCxcclxuICAgIDEwMDAsXHJcbiAgICAyMDAwLFxyXG4gICAgNTAwMCxcclxuICAgIDEwMDAwXVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cGVyaWVuY2VSZXF1aXJlbWVudChsZXZlbDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGlmIChsZXZlbCA8IDIpIHtcclxuICAgICAgICByZXR1cm4gMFxyXG4gICAgfVxyXG5cclxuICAgIGlmIChsZXZlbCAtIDIgPj0gbGV2ZWxzLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiBJbmZpbml0eVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBsZXZlbHNbbGV2ZWwgLSAyXVxyXG59Il19