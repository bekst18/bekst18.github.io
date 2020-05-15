/**
 * rogue-like library
 */
import * as geo from "../shared/geo2d.js";
import * as gfx from "./gfx.js";
export const tileSize = 24;
export const lightRadius = 8;
export class Thing {
    constructor(options) {
        var _a, _b, _c;
        this.color = new gfx.Color(1, 1, 1, 1);
        this.texture = null;
        this.textureLayer = -1;
        this.position = (_b = (_a = options.position) === null || _a === void 0 ? void 0 : _a.clone()) !== null && _b !== void 0 ? _b : new geo.Point(0, 0);
        this.passable = options.passable;
        this.transparent = options.transparent;
        this.name = options.name;
        this.image = (_c = options.image) !== null && _c !== void 0 ? _c : "";
        if (options.color) {
            this.color = options.color;
        }
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
export class Creature extends Thing {
    constructor(options) {
        var _a;
        super(Object.assign({ passable: false, transparent: false }, options));
        this.maxHealth = options.maxHealth;
        this.health = (_a = options.health) !== null && _a !== void 0 ? _a : this.maxHealth;
    }
}
export class Player extends Creature {
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJybC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUNILE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFFL0IsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQTtBQUMxQixNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFBO0FBVzVCLE1BQU0sT0FBTyxLQUFLO0lBVWQsWUFBWSxPQUFxQjs7UUFKakMsVUFBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxZQUFPLEdBQXVCLElBQUksQ0FBQTtRQUNsQyxpQkFBWSxHQUFXLENBQUMsQ0FBQyxDQUFBO1FBR3JCLElBQUksQ0FBQyxRQUFRLGVBQUcsT0FBTyxDQUFDLFFBQVEsMENBQUUsS0FBSyxxQ0FBTSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQTtRQUNoQyxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUE7UUFDdEMsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxLQUFLLFNBQUcsT0FBTyxDQUFDLEtBQUssbUNBQUksRUFBRSxDQUFBO1FBRWhDLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRTtZQUNmLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQTtTQUM3QjtJQUNMLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxJQUFLLFNBQVEsS0FBSztDQUFJO0FBQ25DLE1BQU0sT0FBTyxPQUFRLFNBQVEsS0FBSztDQUFJO0FBQ3RDLE1BQU0sT0FBTyxJQUFLLFNBQVEsT0FBTztDQUFJO0FBQ3JDLE1BQU0sT0FBTyxRQUFTLFNBQVEsT0FBTztDQUFJO0FBQ3pDLE1BQU0sT0FBTyxVQUFXLFNBQVEsT0FBTztDQUFJO0FBVzNDLE1BQU0sT0FBTyxRQUFTLFNBQVEsS0FBSztJQUkvQixZQUFZLE9BQXdCOztRQUNoQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDdEUsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxNQUFNLFNBQUcsT0FBTyxDQUFDLE1BQU0sbUNBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUNsRCxDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sTUFBTyxTQUFRLFFBQVE7Q0FDbkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogcm9ndWUtbGlrZSBsaWJyYXJ5XHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcbmltcG9ydCAqIGFzIGdmeCBmcm9tIFwiLi9nZnguanNcIlxyXG5cclxuZXhwb3J0IGNvbnN0IHRpbGVTaXplID0gMjRcclxuZXhwb3J0IGNvbnN0IGxpZ2h0UmFkaXVzID0gOFxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUaGluZ09wdGlvbnMge1xyXG4gICAgcG9zaXRpb24/OiBnZW8uUG9pbnRcclxuICAgIHBhc3NhYmxlOiBib29sZWFuXHJcbiAgICB0cmFuc3BhcmVudDogYm9vbGVhblxyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZT86IHN0cmluZ1xyXG4gICAgY29sb3I/OiBnZnguQ29sb3JcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRoaW5nIHtcclxuICAgIHBvc2l0aW9uOiBnZW8uUG9pbnRcclxuICAgIHBhc3NhYmxlOiBib29sZWFuXHJcbiAgICB0cmFuc3BhcmVudDogYm9vbGVhblxyXG4gICAgbmFtZTogc3RyaW5nXHJcbiAgICBpbWFnZTogc3RyaW5nXHJcbiAgICBjb2xvciA9IG5ldyBnZnguQ29sb3IoMSwgMSwgMSwgMSlcclxuICAgIHRleHR1cmU6IGdmeC5UZXh0dXJlIHwgbnVsbCA9IG51bGxcclxuICAgIHRleHR1cmVMYXllcjogbnVtYmVyID0gLTFcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBUaGluZ09wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbj8uY2xvbmUoKSA/PyBuZXcgZ2VvLlBvaW50KDAsIDApXHJcbiAgICAgICAgdGhpcy5wYXNzYWJsZSA9IG9wdGlvbnMucGFzc2FibGVcclxuICAgICAgICB0aGlzLnRyYW5zcGFyZW50ID0gb3B0aW9ucy50cmFuc3BhcmVudFxyXG4gICAgICAgIHRoaXMubmFtZSA9IG9wdGlvbnMubmFtZVxyXG4gICAgICAgIHRoaXMuaW1hZ2UgPSBvcHRpb25zLmltYWdlID8/IFwiXCJcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuY29sb3IpIHtcclxuICAgICAgICAgICAgdGhpcy5jb2xvciA9IG9wdGlvbnMuY29sb3JcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUaWxlIGV4dGVuZHMgVGhpbmcgeyB9XHJcbmV4cG9ydCBjbGFzcyBGaXh0dXJlIGV4dGVuZHMgVGhpbmcgeyB9XHJcbmV4cG9ydCBjbGFzcyBEb29yIGV4dGVuZHMgRml4dHVyZSB7IH1cclxuZXhwb3J0IGNsYXNzIFN0YWlyc1VwIGV4dGVuZHMgRml4dHVyZSB7IH1cclxuZXhwb3J0IGNsYXNzIFN0YWlyc0Rvd24gZXh0ZW5kcyBGaXh0dXJlIHsgfVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDcmVhdHVyZU9wdGlvbnMge1xyXG4gICAgcG9zaXRpb24/OiBnZW8uUG9pbnRcclxuICAgIG5hbWU6IHN0cmluZ1xyXG4gICAgaW1hZ2U6IHN0cmluZ1xyXG4gICAgY29sb3I/OiBnZnguQ29sb3JcclxuICAgIG1heEhlYWx0aDogbnVtYmVyXHJcbiAgICBoZWFsdGg/OiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIENyZWF0dXJlIGV4dGVuZHMgVGhpbmcge1xyXG4gICAgbWF4SGVhbHRoOiBudW1iZXJcclxuICAgIGhlYWx0aDogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQ3JlYXR1cmVPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoT2JqZWN0LmFzc2lnbih7IHBhc3NhYmxlOiBmYWxzZSwgdHJhbnNwYXJlbnQ6IGZhbHNlIH0sIG9wdGlvbnMpKVxyXG4gICAgICAgIHRoaXMubWF4SGVhbHRoID0gb3B0aW9ucy5tYXhIZWFsdGhcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IG9wdGlvbnMuaGVhbHRoID8/IHRoaXMubWF4SGVhbHRoXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBQbGF5ZXIgZXh0ZW5kcyBDcmVhdHVyZSB7XHJcbn0iXX0=