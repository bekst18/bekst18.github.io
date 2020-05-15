import * as rand from "../shared/rand.js";
import * as gfx from "./gfx.js";
export const tileSize = 24;
export const lightRadius = 8;
export class Thing {
    constructor(options) {
        var _a, _b, _c;
        this.color = new gfx.Color(1, 1, 1, 1);
        this.texture = null;
        this.textureLayer = -1;
        this.position = (_b = (_a = options.position) === null || _a === void 0 ? void 0 : _a.clone()) !== null && _b !== void 0 ? _b : null;
        this.passable = options.passable;
        this.transparent = options.transparent;
        this.name = options.name;
        this.image = (_c = options.image) !== null && _c !== void 0 ? _c : "";
        if (options.color) {
            this.color = options.color;
        }
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
}
export class Fixture extends Thing {
}
export class Door extends Fixture {
}
export class StairsUp extends Fixture {
}
export class StairsDown extends Fixture {
}
export class Item extends Thing {
}
export class Weapon extends Item {
    constructor(options) {
        super(Object.assign({ passable: false, transparent: false }, options));
        this.attack = options.attack;
        this.damage = options.damage.clone();
    }
}
export class Creature extends Thing {
    constructor(options) {
        var _a, _b, _c, _d;
        super(Object.assign({ passable: false, transparent: false }, options));
        this.maxHealth = options.maxHealth;
        this.health = (_a = options.health) !== null && _a !== void 0 ? _a : this.maxHealth;
        this.attack = (_b = options.attack) !== null && _b !== void 0 ? _b : 0;
        this.defense = (_c = options.defense) !== null && _c !== void 0 ? _c : 0;
        this.agility = (_d = options.agility) !== null && _d !== void 0 ? _d : 0;
    }
}
export class Player extends Creature {
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJybC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFJQSxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0sVUFBVSxDQUFBO0FBRS9CLE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFDMUIsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQTtBQVc1QixNQUFNLE9BQU8sS0FBSztJQVVkLFlBQVksT0FBcUI7O1FBSmpDLFVBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakMsWUFBTyxHQUF1QixJQUFJLENBQUE7UUFDbEMsaUJBQVksR0FBVyxDQUFDLENBQUMsQ0FBQTtRQUdyQixJQUFJLENBQUMsUUFBUSxlQUFHLE9BQU8sQ0FBQyxRQUFRLDBDQUFFLEtBQUsscUNBQU0sSUFBSSxDQUFBO1FBQ2pELElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQTtRQUNoQyxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUE7UUFDdEMsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxLQUFLLFNBQUcsT0FBTyxDQUFDLEtBQUssbUNBQUksRUFBRSxDQUFBO1FBRWhDLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRTtZQUNmLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQTtTQUM3QjtJQUNMLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxJQUFJO0lBQ2IsWUFBcUIsTUFBYyxDQUFDLEVBQVcsTUFBYyxDQUFDO1FBQXpDLFFBQUcsR0FBSCxHQUFHLENBQVk7UUFBVyxRQUFHLEdBQUgsR0FBRyxDQUFZO0lBQUksQ0FBQztJQUVuRSxJQUFJO1FBQ0EsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDdkMsQ0FBQztDQUNKO0FBRUQsTUFBTSxPQUFPLElBQUssU0FBUSxLQUFLO0NBQUk7QUFDbkMsTUFBTSxPQUFPLE9BQVEsU0FBUSxLQUFLO0NBQUk7QUFDdEMsTUFBTSxPQUFPLElBQUssU0FBUSxPQUFPO0NBQUk7QUFDckMsTUFBTSxPQUFPLFFBQVMsU0FBUSxPQUFPO0NBQUk7QUFDekMsTUFBTSxPQUFPLFVBQVcsU0FBUSxPQUFPO0NBQUk7QUFDM0MsTUFBTSxPQUFPLElBQUssU0FBUSxLQUFLO0NBQUk7QUFXbkMsTUFBTSxPQUFPLE1BQU8sU0FBUSxJQUFJO0lBSTVCLFlBQVksT0FBc0I7UUFDOUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQTtRQUM1QixJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDeEMsQ0FBQztDQUNKO0FBY0QsTUFBTSxPQUFPLFFBQVMsU0FBUSxLQUFLO0lBTy9CLFlBQVksT0FBd0I7O1FBQ2hDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUN0RSxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUE7UUFDbEMsSUFBSSxDQUFDLE1BQU0sU0FBRyxPQUFPLENBQUMsTUFBTSxtQ0FBSSxJQUFJLENBQUMsU0FBUyxDQUFBO1FBQzlDLElBQUksQ0FBQyxNQUFNLFNBQUcsT0FBTyxDQUFDLE1BQU0sbUNBQUksQ0FBQyxDQUFBO1FBQ2pDLElBQUksQ0FBQyxPQUFPLFNBQUcsT0FBTyxDQUFDLE9BQU8sbUNBQUksQ0FBQyxDQUFBO1FBQ25DLElBQUksQ0FBQyxPQUFPLFNBQUcsT0FBTyxDQUFDLE9BQU8sbUNBQUksQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxNQUFPLFNBQVEsUUFBUTtDQUNuQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiByb2d1ZS1saWtlIGxpYnJhcnlcclxuICovXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuXHJcbmV4cG9ydCBjb25zdCB0aWxlU2l6ZSA9IDI0XHJcbmV4cG9ydCBjb25zdCBsaWdodFJhZGl1cyA9IDhcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGhpbmdPcHRpb25zIHtcclxuICAgIHBvc2l0aW9uPzogZ2VvLlBvaW50IHwgbnVsbFxyXG4gICAgcGFzc2FibGU6IGJvb2xlYW5cclxuICAgIHRyYW5zcGFyZW50OiBib29sZWFuXHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlPzogc3RyaW5nXHJcbiAgICBjb2xvcj86IGdmeC5Db2xvclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGhpbmcge1xyXG4gICAgcG9zaXRpb246IGdlby5Qb2ludCB8IG51bGxcclxuICAgIHBhc3NhYmxlOiBib29sZWFuXHJcbiAgICB0cmFuc3BhcmVudDogYm9vbGVhblxyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZTogc3RyaW5nXHJcbiAgICBjb2xvciA9IG5ldyBnZnguQ29sb3IoMSwgMSwgMSwgMSlcclxuICAgIHRleHR1cmU6IGdmeC5UZXh0dXJlIHwgbnVsbCA9IG51bGxcclxuICAgIHRleHR1cmVMYXllcjogbnVtYmVyID0gLTFcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBUaGluZ09wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbj8uY2xvbmUoKSA/PyBudWxsXHJcbiAgICAgICAgdGhpcy5wYXNzYWJsZSA9IG9wdGlvbnMucGFzc2FibGVcclxuICAgICAgICB0aGlzLnRyYW5zcGFyZW50ID0gb3B0aW9ucy50cmFuc3BhcmVudFxyXG4gICAgICAgIHRoaXMubmFtZSA9IG9wdGlvbnMubmFtZVxyXG4gICAgICAgIHRoaXMuaW1hZ2UgPSBvcHRpb25zLmltYWdlID8/IFwiXCJcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuY29sb3IpIHtcclxuICAgICAgICAgICAgdGhpcy5jb2xvciA9IG9wdGlvbnMuY29sb3JcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBEaWNlIHtcclxuICAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IG1pbjogbnVtYmVyID0gMCwgcmVhZG9ubHkgbWF4OiBudW1iZXIgPSAwKSB7IH1cclxuXHJcbiAgICByb2xsKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHJhbmQuaW50KHRoaXMubWluLCB0aGlzLm1heCArIDEpXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogRGljZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBEaWNlKHRoaXMubWluLCB0aGlzLm1heClcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRpbGUgZXh0ZW5kcyBUaGluZyB7IH1cclxuZXhwb3J0IGNsYXNzIEZpeHR1cmUgZXh0ZW5kcyBUaGluZyB7IH1cclxuZXhwb3J0IGNsYXNzIERvb3IgZXh0ZW5kcyBGaXh0dXJlIHsgfVxyXG5leHBvcnQgY2xhc3MgU3RhaXJzVXAgZXh0ZW5kcyBGaXh0dXJlIHsgfVxyXG5leHBvcnQgY2xhc3MgU3RhaXJzRG93biBleHRlbmRzIEZpeHR1cmUgeyB9XHJcbmV4cG9ydCBjbGFzcyBJdGVtIGV4dGVuZHMgVGhpbmcgeyB9XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFdlYXBvbk9wdGlvbnMge1xyXG4gICAgcG9zaXRpb24/OiBnZW8uUG9pbnQgfCBudWxsXHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlPzogc3RyaW5nXHJcbiAgICBjb2xvcj86IGdmeC5Db2xvclxyXG4gICAgYXR0YWNrOiBudW1iZXJcclxuICAgIGRhbWFnZTogRGljZVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgV2VhcG9uIGV4dGVuZHMgSXRlbSB7XHJcbiAgICByZWFkb25seSBhdHRhY2s6IG51bWJlclxyXG4gICAgcmVhZG9ubHkgZGFtYWdlOiBEaWNlXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogV2VhcG9uT3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKE9iamVjdC5hc3NpZ24oeyBwYXNzYWJsZTogZmFsc2UsIHRyYW5zcGFyZW50OiBmYWxzZSB9LCBvcHRpb25zKSlcclxuICAgICAgICB0aGlzLmF0dGFjayA9IG9wdGlvbnMuYXR0YWNrXHJcbiAgICAgICAgdGhpcy5kYW1hZ2UgPSBvcHRpb25zLmRhbWFnZS5jbG9uZSgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXR1cmVPcHRpb25zIHtcclxuICAgIHBvc2l0aW9uPzogZ2VvLlBvaW50IHwgbnVsbFxyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZTogc3RyaW5nXHJcbiAgICBjb2xvcj86IGdmeC5Db2xvclxyXG4gICAgbWF4SGVhbHRoOiBudW1iZXJcclxuICAgIGhlYWx0aD86IG51bWJlclxyXG4gICAgYXR0YWNrPzogbnVtYmVyXHJcbiAgICBkZWZlbnNlPzogbnVtYmVyXHJcbiAgICBhZ2lsaXR5PzogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBDcmVhdHVyZSBleHRlbmRzIFRoaW5nIHtcclxuICAgIG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBoZWFsdGg6IG51bWJlclxyXG4gICAgYXR0YWNrOiBudW1iZXJcclxuICAgIGRlZmVuc2U6IG51bWJlclxyXG4gICAgYWdpbGl0eTogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQ3JlYXR1cmVPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IGZhbHNlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMubWF4SGVhbHRoID0gb3B0aW9ucy5tYXhIZWFsdGhcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IG9wdGlvbnMuaGVhbHRoID8/IHRoaXMubWF4SGVhbHRoXHJcbiAgICAgICAgdGhpcy5hdHRhY2sgPSBvcHRpb25zLmF0dGFjayA/PyAwXHJcbiAgICAgICAgdGhpcy5kZWZlbnNlID0gb3B0aW9ucy5kZWZlbnNlID8/IDBcclxuICAgICAgICB0aGlzLmFnaWxpdHkgPSBvcHRpb25zLmFnaWxpdHkgPz8gMFxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUGxheWVyIGV4dGVuZHMgQ3JlYXR1cmUge1xyXG59Il19