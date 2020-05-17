import * as geo from "../shared/geo2d.js";
import * as array from "../shared/array.js";
import * as rl from "./rl.js";
import * as grid from "../shared/grid.js";
/**
 * a layer that is based on a set
 * works well for sparse layers
 */
export class SetLayer {
    constructor() {
        this.set = new Set();
    }
    add(item) {
        if (!item.position) {
            throw new Error("Item cannot be placed in layer without a position");
        }
        this.set.add(item);
    }
    delete(item) {
        this.set.delete(item);
    }
    has(item) {
        return this.set.has(item);
    }
    at(position) {
        var _a;
        for (const value of this.set) {
            if ((_a = value.position) === null || _a === void 0 ? void 0 : _a.equal(position)) {
                return value;
            }
        }
        return null;
    }
    *[Symbol.iterator]() {
        for (const value of this.set) {
            yield value;
        }
    }
}
/**
 * a layer that is based on a grid
 * works well for dense layers
 */
export class GridLayer {
    constructor(width, height) {
        this.set = new Set();
        this.grd = grid.generate(width, height, () => null);
    }
    get width() {
        return this.grd.width;
    }
    get height() {
        return this.grd.height;
    }
    add(item) {
        if (!item.position) {
            throw new Error("Item cannot be placed in layer without a position");
        }
        this.grd.setPoint(item.position, item);
        this.set.add(item);
    }
    delete(item) {
        if (!item.position) {
            throw new Error("Item cannot be deleted from layer without a position");
        }
        this.grd.setPoint(item.position, null);
        this.set.delete(item);
    }
    has(item) {
        return this.set.has(item);
    }
    at(position) {
        return this.grd.atPoint(position);
    }
    *[Symbol.iterator]() {
        for (const value of this.set) {
            yield value;
        }
    }
}
/**
 * components of a generated map area
 */
export class Map {
    constructor(width, height, player) {
        this.width = width;
        this.height = height;
        this.player = player;
        this.tiles = new GridLayer(width, height);
        this.fixtures = new SetLayer();
        this.monsters = new SetLayer();
        this.containers = new SetLayer();
    }
    /**
      * iterate over all things in map
    */
    *[Symbol.iterator]() {
        for (const tile of this.tiles) {
            yield tile;
        }
        for (const fixture of this.fixtures) {
            yield fixture;
        }
        for (const container of this.containers) {
            yield container;
        }
        for (const monster of this.monsters) {
            yield monster;
        }
        yield this.player;
    }
    tileAt(xy) {
        return this.tiles.at(xy);
    }
    fixtureAt(xy) {
        return this.fixtures.at(xy);
    }
    containerAt(xy) {
        return this.containers.at(xy);
    }
    monsterAt(xy) {
        return this.monsters.at(xy);
    }
    *at(xy) {
        const fixture = this.fixtureAt(xy);
        if (fixture) {
            yield fixture;
        }
        const tile = this.tileAt(xy);
        if (tile) {
            yield tile;
        }
        const container = this.containerAt(xy);
        if (container) {
            yield container;
        }
        const monster = this.monsterAt(xy);
        if (monster) {
            yield monster;
        }
    }
    inBounds(xy) {
        return xy.x >= 0 && xy.x < this.width && xy.y >= 0 && xy.y < this.height;
    }
}
function resetVisibility(map) {
    for (const th of map) {
        if (th.visible) {
            th.visible = rl.Visible.Fog;
        }
    }
    map.player.visible = rl.Visible.Visible;
}
export function updateVisibility(map, eye, radius) {
    resetVisibility(map);
    for (let i = 0; i < 8; ++i) {
        updateVisibilityOctant(map, eye, radius, i);
    }
}
function updateVisibilityOctant(map, eye, radius, octant) {
    const shadows = [];
    for (let i = 1; i <= radius; ++i) {
        for (let j = 0; j <= i; ++j) {
            const octantPoint = new geo.Point(i, j);
            const mapPoint = transformOctant(octantPoint, octant).addPoint(eye);
            if (!map.inBounds(mapPoint)) {
                continue;
            }
            if (isShadowed(shadows, octantPoint)) {
                continue;
            }
            const tile = map.tileAt(mapPoint);
            if (!tile) {
                continue;
            }
            if (!(tile === null || tile === void 0 ? void 0 : tile.transparent)) {
                shadows.push(octantPoint);
            }
            if (geo.calcManhattenDist(mapPoint, eye) > radius) {
                continue;
            }
            tile.visible = rl.Visible.Visible;
        }
    }
}
function transformOctant(coords, octant) {
    switch (octant) {
        case 0: return new geo.Point(-coords.x, coords.y);
        case 1: return new geo.Point(-coords.y, coords.x);
        case 2: return new geo.Point(coords.y, coords.x);
        case 3: return new geo.Point(coords.x, coords.y);
        case 4: return new geo.Point(coords.x, -coords.y);
        case 5: return new geo.Point(coords.y, -coords.x);
        case 6: return new geo.Point(-coords.y, -coords.x);
        case 7: return new geo.Point(-coords.x, -coords.y);
    }
    throw new Error("Invalid octant - must be in interval [0, 8)");
}
function isShadowed(shadows, coords) {
    return array.any(shadows, x => shadowCoversPoint(x, coords));
}
function shadowCoversPoint(shadow, coords) {
    if (shadow.x == 0) {
        return coords.y > shadow.y;
    }
    const startX = shadow.x / (shadow.y + 1) * coords.y;
    const endX = (shadow.x + 1) / shadow.y * coords.y;
    return coords.y > shadow.y && coords.x > startX && coords.x < endX;
}
// export function updateVisibility(map: Map, eye: geo.Point, radius: number) {
//     updateVisibilityFlags(map, eye, radius, TileFlags.Visible | TileFlags.Seen, TileFlags.Visible)
// }
// function updateVisibilityFlags(map: Map, eye: geo.Point, radius: number, setFlags: TileFlags, clearFlags: TileFlags) {
//     for (const tile of map) {
//         tile.flags &= ~clearFlags
//     }
//     map.getTile(eye).flags |= setFlags
//     for (let i = 0; i < 8; ++i) {
//         updateVisibilityOctant(map, eye, radius, setFlags, i)
//     }
// }
// function updateVisibilityOctant(map: Map, eye: geo.Point, radius: number, setFlags: TileFlags, octant: number) {
//     const shadows: geo.Point[] = []
//     for (let i = 1; i <= radius; ++i) {
//         for (let j = 0; j <= i; ++j) {
//             const octantPoint = new geo.Point(i, j)
//             const mapPoint = transformOctant(octantPoint, octant).add(eye)
//             if (!map.inBounds(mapPoint)) {
//                 continue
//             }
//             if (isShadowed(shadows, octantPoint)) {
//                 continue
//             }
//             const tile = map.getTile(mapPoint)
//             if (tileBlocksView(tile)) {
//                 shadows.push(octantPoint)
//             }
//             if (geo.calcDist(mapPoint, eye) > radius) {
//                 continue
//             }
//             tile.flags |= setFlags
//         }
//     }
// }
// function transformOctant(coords: geo.Point, octant: number): geo.Point {
//     switch (octant) {
//         case 0: return new geo.Point(coords.i, -coords.j);
//         case 1: return new geo.Point(coords.j, -coords.i);
//         case 2: return new geo.Point(coords.j, coords.i);
//         case 3: return new geo.Point(coords.i, coords.j);
//         case 4: return new geo.Point(-coords.i, coords.j);
//         case 5: return new geo.Point(-coords.j, coords.i);
//         case 6: return new geo.Point(-coords.j, -coords.i);
//         case 7: return new geo.Point(-coords.i, -coords.j);
//     }
//     throw new Error("Invalid octant - must be in interval [0, 8)")
// }
// function isShadowed(shadows: geo.Point[], coords: geo.Point): boolean {
//     return iter.any(shadows, x => shadowCoversPoint(x, coords))
// }
// function shadowCoversPoint(shadow: geo.Point, coords: geo.Point): boolean {
//     if (shadow.j == 0) {
//         return coords.i > shadow.i
//     }
//     const startJ = shadow.j / (shadow.i + 1) * coords.i
//     const endJ = (shadow.j + 1) / shadow.i * coords.i
//     return coords.i > shadow.i && coords.j > startJ && coords.j < endJ
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hcHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssS0FBSyxNQUFNLG9CQUFvQixDQUFBO0FBQzNDLE9BQU8sS0FBSyxFQUFFLE1BQU0sU0FBUyxDQUFBO0FBQzdCLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFhekM7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLFFBQVE7SUFBckI7UUFDcUIsUUFBRyxHQUFHLElBQUksR0FBRyxFQUFLLENBQUE7SUFpQ3ZDLENBQUM7SUEvQkcsR0FBRyxDQUFDLElBQU87UUFDUCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLG1EQUFtRCxDQUFDLENBQUE7U0FDdkU7UUFFRCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN0QixDQUFDO0lBRUQsTUFBTSxDQUFDLElBQU87UUFDVixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN6QixDQUFDO0lBRUQsR0FBRyxDQUFDLElBQU87UUFDUCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzdCLENBQUM7SUFFRCxFQUFFLENBQUMsUUFBbUI7O1FBQ2xCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUMxQixVQUFJLEtBQUssQ0FBQyxRQUFRLDBDQUFFLEtBQUssQ0FBQyxRQUFRLEdBQUc7Z0JBQ2pDLE9BQU8sS0FBSyxDQUFBO2FBQ2Y7U0FDSjtRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ2YsQ0FBQztJQUVELENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2QsS0FBSyxNQUFNLEtBQUssSUFB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QTREO0FBQzVELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELDhEQUE4RDtBQUM5RCxRQUFRO0FBRVIscUVBQXFFO0FBQ3JFLElBQUk7QUFFSiwwRUFBMEU7QUFDMUUsa0VBQWtFO0FBQ2xFLElBQUk7QUFFSiw4RUFBOEU7QUFDOUUsMkJBQTJCO0FBQzNCLHFDQUFxQztBQUNyQyxRQUFRO0FBRVIsMERBQTBEO0FBQzFELHdEQUF3RDtBQUV4RCx5RUFBeUU7QUFDekUsSUFBSSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiXHJcbmltcG9ydCAqIGFzIHJsIGZyb20gXCIuL3JsLmpzXCJcclxuaW1wb3J0ICogYXMgZ3JpZCBmcm9tIFwiLi4vc2hhcmVkL2dyaWQuanNcIlxyXG5cclxuLyoqXHJcbiAqIGEgbGF5ZXIgb2YgdGhpbmdzIG9uIGEgbWFwXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIExheWVyPFQgZXh0ZW5kcyBybC5UaGluZz4ge1xyXG4gICAgYWRkKGl0ZW06IFQpOiB2b2lkXHJcbiAgICBkZWxldGUoaXRlbTogVCk6IHZvaWRcclxuICAgIGhhcyhpdGVtOiBUKTogYm9vbGVhblxyXG4gICAgYXQocG9zaXRpb246IGdlby5Qb2ludCk6IFQgfCBudWxsXHJcbiAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBHZW5lcmF0b3I8VD5cclxufVxyXG5cclxuLyoqXHJcbiAqIGEgbGF5ZXIgdGhhdCBpcyBiYXNlZCBvbiBhIHNldFxyXG4gKiB3b3JrcyB3ZWxsIGZvciBzcGFyc2UgbGF5ZXJzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgU2V0TGF5ZXI8VCBleHRlbmRzIHJsLlRoaW5nPiBpbXBsZW1lbnRzIExheWVyPFQ+IHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2V0ID0gbmV3IFNldDxUPigpXHJcblxyXG4gICAgYWRkKGl0ZW06IFQpOiB2b2lkIHtcclxuICAgICAgICBpZiAoIWl0ZW0ucG9zaXRpb24pIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSXRlbSBjYW5ub3QgYmUgcGxhY2VkIGluIGxheWVyIHdpdGhvdXQgYSBwb3NpdGlvblwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZXQuYWRkKGl0ZW0pXHJcbiAgICB9XHJcblxyXG4gICAgZGVsZXRlKGl0ZW06IFQpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnNldC5kZWxldGUoaXRlbSlcclxuICAgIH1cclxuXHJcbiAgICBoYXMoaXRlbTogVCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNldC5oYXMoaXRlbSlcclxuICAgIH1cclxuXHJcbiAgICBhdChwb3NpdGlvbjogZ2VvLlBvaW50KTogVCB8IG51bGwge1xyXG4gICAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgdGhpcy5zZXQpIHtcclxuICAgICAgICAgICAgaWYgKHZhbHVlLnBvc2l0aW9uPy5lcXVhbChwb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBHZW5lcmF0b3I8VD4ge1xyXG4gICAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgdGhpcy5zZXQpIHtcclxuICAgICAgICAgICAgeWllbGQgdmFsdWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogYSBsYXllciB0aGF0IGlzIGJhc2VkIG9uIGEgZ3JpZFxyXG4gKiB3b3JrcyB3ZWxsIGZvciBkZW5zZSBsYXllcnNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBHcmlkTGF5ZXI8VCBleHRlbmRzIHJsLlRoaW5nPiBpbXBsZW1lbnRzIExheWVyPFQ+IHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2V0ID0gbmV3IFNldDxUPigpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGdyZDogZ3JpZC5HcmlkPFQgfCBudWxsPlxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5ncmQgPSBncmlkLmdlbmVyYXRlKHdpZHRoLCBoZWlnaHQsICgpID0+IG51bGwpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHdpZHRoKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmdyZC53aWR0aFxyXG4gICAgfVxyXG5cclxuICAgIGdldCBoZWlnaHQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZ3JkLmhlaWdodFxyXG4gICAgfVxyXG5cclxuICAgIGFkZChpdGVtOiBUKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKCFpdGVtLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkl0ZW0gY2Fubm90IGJlIHBsYWNlZCBpbiBsYXllciB3aXRob3V0IGEgcG9zaXRpb25cIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZ3JkLnNldFBvaW50KGl0ZW0ucG9zaXRpb24sIGl0ZW0pXHJcbiAgICAgICAgdGhpcy5zZXQuYWRkKGl0ZW0pXHJcbiAgICB9XHJcblxyXG4gICAgZGVsZXRlKGl0ZW06IFQpOiB2b2lkIHtcclxuICAgICAgICBpZiAoIWl0ZW0ucG9zaXRpb24pIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSXRlbSBjYW5ub3QgYmUgZGVsZXRlZCBmcm9tIGxheWVyIHdpdGhvdXQgYSBwb3NpdGlvblwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5ncmQuc2V0UG9pbnQoaXRlbS5wb3NpdGlvbiwgbnVsbClcclxuICAgICAgICB0aGlzLnNldC5kZWxldGUoaXRlbSlcclxuICAgIH1cclxuXHJcbiAgICBoYXMoaXRlbTogVCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNldC5oYXMoaXRlbSlcclxuICAgIH1cclxuXHJcbiAgICBhdChwb3NpdGlvbjogZ2VvLlBvaW50KTogVCB8IG51bGwge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmdyZC5hdFBvaW50KHBvc2l0aW9uKVxyXG4gICAgfVxyXG5cclxuICAgICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBHZW5lcmF0b3I8VD4ge1xyXG4gICAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgdGhpcy5zZXQpIHtcclxuICAgICAgICAgICAgeWllbGQgdmFsdWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjb21wb25lbnRzIG9mIGEgZ2VuZXJhdGVkIG1hcCBhcmVhXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgTWFwIHtcclxuICAgIHRpbGVzOiBMYXllcjxybC5UaWxlPlxyXG4gICAgZml4dHVyZXM6IExheWVyPHJsLkZpeHR1cmU+XHJcbiAgICBtb25zdGVyczogTGF5ZXI8cmwuTW9uc3Rlcj5cclxuICAgIGNvbnRhaW5lcnM6IExheWVyPHJsLkNvbnRhaW5lcj5cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihyZWFkb25seSB3aWR0aDogbnVtYmVyLCByZWFkb25seSBoZWlnaHQ6IG51bWJlciwgcmVhZG9ubHkgcGxheWVyOiBybC5QbGF5ZXIpIHsgXHJcbiAgICAgICAgdGhpcy50aWxlcyA9IG5ldyBHcmlkTGF5ZXIod2lkdGgsIGhlaWdodClcclxuICAgICAgICB0aGlzLmZpeHR1cmVzID0gbmV3IFNldExheWVyKClcclxuICAgICAgICB0aGlzLm1vbnN0ZXJzID0gbmV3IFNldExheWVyKClcclxuICAgICAgICB0aGlzLmNvbnRhaW5lcnMgPSBuZXcgU2V0TGF5ZXIoKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICAqIGl0ZXJhdGUgb3ZlciBhbGwgdGhpbmdzIGluIG1hcFxyXG4gICAgKi9cclxuICAgIHB1YmxpYyAqW1N5bWJvbC5pdGVyYXRvcl0oKTogR2VuZXJhdG9yPHJsLlRoaW5nPiB7XHJcbiAgICAgICAgZm9yIChjb25zdCB0aWxlIG9mIHRoaXMudGlsZXMpIHtcclxuICAgICAgICAgICAgeWllbGQgdGlsZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBmaXh0dXJlIG9mIHRoaXMuZml4dHVyZXMpIHtcclxuICAgICAgICAgICAgeWllbGQgZml4dHVyZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBjb250YWluZXIgb2YgdGhpcy5jb250YWluZXJzKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIGNvbnRhaW5lclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBtb25zdGVyIG9mIHRoaXMubW9uc3RlcnMpIHtcclxuICAgICAgICAgICAgeWllbGQgbW9uc3RlclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgeWllbGQgdGhpcy5wbGF5ZXJcclxuICAgIH1cclxuXHJcbiAgICB0aWxlQXQoeHk6IGdlby5Qb2ludCk6IHJsLlRpbGUgfCBudWxsIHtcclxuICAgICAgICByZXR1cm4gdGhpcy50aWxlcy5hdCh4eSlcclxuICAgIH1cclxuXHJcbiAgICBmaXh0dXJlQXQoeHk6IGdlby5Qb2ludCk6IHJsLkZpeHR1cmUgfCBudWxsIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5maXh0dXJlcy5hdCh4eSlcclxuICAgIH1cclxuXHJcbiAgICBjb250YWluZXJBdCh4eTogZ2VvLlBvaW50KTogcmwuQ29udGFpbmVyIHwgbnVsbCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29udGFpbmVycy5hdCh4eSlcclxuICAgIH1cclxuXHJcbiAgICBtb25zdGVyQXQoeHk6IGdlby5Qb2ludCk6IHJsLk1vbnN0ZXIgfCBudWxsIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tb25zdGVycy5hdCh4eSlcclxuICAgIH1cclxuXHJcbiAgICAqYXQoeHk6IGdlby5Qb2ludCk6IEdlbmVyYXRvcjxybC5Nb25zdGVyIHwgcmwuRml4dHVyZSB8IHJsLlRpbGU+IHtcclxuICAgICAgICBjb25zdCBmaXh0dXJlID0gdGhpcy5maXh0dXJlQXQoeHkpXHJcbiAgICAgICAgaWYgKGZpeHR1cmUpIHtcclxuICAgICAgICAgICAgeWllbGQgZml4dHVyZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdGlsZSA9IHRoaXMudGlsZUF0KHh5KVxyXG4gICAgICAgIGlmICh0aWxlKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRpbGVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyQXQoeHkpXHJcbiAgICAgICAgaWYgKGNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICB5aWVsZCBjb250YWluZXJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG1vbnN0ZXIgPSB0aGlzLm1vbnN0ZXJBdCh4eSlcclxuICAgICAgICBpZiAobW9uc3Rlcikge1xyXG4gICAgICAgICAgICB5aWVsZCBtb25zdGVyXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGluQm91bmRzKHh5OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4geHkueCA+PSAwICYmIHh5LnggPCB0aGlzLndpZHRoICYmIHh5LnkgPj0gMCAmJiB4eS55IDwgdGhpcy5oZWlnaHRcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVzZXRWaXNpYmlsaXR5KG1hcDogTWFwKSB7XHJcbiAgICBmb3IgKGNvbnN0IHRoIG9mIG1hcCkge1xyXG4gICAgICAgIGlmICh0aC52aXNpYmxlKSB7XHJcbiAgICAgICAgICAgIHRoLnZpc2libGUgPSBybC5WaXNpYmxlLkZvZ1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBtYXAucGxheWVyLnZpc2libGUgPSBybC5WaXNpYmxlLlZpc2libGVcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVZpc2liaWxpdHkobWFwOiBNYXAsIGV5ZTogZ2VvLlBvaW50LCByYWRpdXM6IG51bWJlcikge1xyXG4gICAgcmVzZXRWaXNpYmlsaXR5KG1hcClcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgODsgKytpKSB7XHJcbiAgICAgICAgdXBkYXRlVmlzaWJpbGl0eU9jdGFudChtYXAsIGV5ZSwgcmFkaXVzLCBpKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVWaXNpYmlsaXR5T2N0YW50KG1hcDogTWFwLCBleWU6IGdlby5Qb2ludCwgcmFkaXVzOiBudW1iZXIsIG9jdGFudDogbnVtYmVyKSB7XHJcbiAgICBjb25zdCBzaGFkb3dzOiBnZW8uUG9pbnRbXSA9IFtdXHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gcmFkaXVzOyArK2kpIHtcclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8PSBpOyArK2opIHtcclxuICAgICAgICAgICAgY29uc3Qgb2N0YW50UG9pbnQgPSBuZXcgZ2VvLlBvaW50KGksIGopXHJcblxyXG4gICAgICAgICAgICBjb25zdCBtYXBQb2ludCA9IHRyYW5zZm9ybU9jdGFudChvY3RhbnRQb2ludCwgb2N0YW50KS5hZGRQb2ludChleWUpXHJcbiAgICAgICAgICAgIGlmICghbWFwLmluQm91bmRzKG1hcFBvaW50KSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGlzU2hhZG93ZWQoc2hhZG93cywgb2N0YW50UG9pbnQpKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCB0aWxlID0gbWFwLnRpbGVBdChtYXBQb2ludClcclxuICAgICAgICAgICAgaWYgKCF0aWxlKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRpbGU/LnRyYW5zcGFyZW50KSB7XHJcbiAgICAgICAgICAgICAgICBzaGFkb3dzLnB1c2gob2N0YW50UG9pbnQpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChnZW8uY2FsY01hbmhhdHRlbkRpc3QobWFwUG9pbnQsIGV5ZSkgPiByYWRpdXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRpbGUudmlzaWJsZSA9IHJsLlZpc2libGUuVmlzaWJsZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdHJhbnNmb3JtT2N0YW50KGNvb3JkczogZ2VvLlBvaW50LCBvY3RhbnQ6IG51bWJlcik6IGdlby5Qb2ludCB7XHJcbiAgICBzd2l0Y2ggKG9jdGFudCkge1xyXG4gICAgICAgIGNhc2UgMDogcmV0dXJuIG5ldyBnZW8uUG9pbnQoLWNvb3Jkcy54LCBjb29yZHMueSk7XHJcbiAgICAgICAgY2FzZSAxOiByZXR1cm4gbmV3IGdlby5Qb2ludCgtY29vcmRzLnksIGNvb3Jkcy54KTtcclxuICAgICAgICBjYXNlIDI6IHJldHVybiBuZXcgZ2VvLlBvaW50KGNvb3Jkcy55LCBjb29yZHMueCk7XHJcbiAgICAgICAgY2FzZSAzOiByZXR1cm4gbmV3IGdlby5Qb2ludChjb29yZHMueCwgY29vcmRzLnkpO1xyXG4gICAgICAgIGNhc2UgNDogcmV0dXJuIG5ldyBnZW8uUG9pbnQoY29vcmRzLngsIC1jb29yZHMueSk7XHJcbiAgICAgICAgY2FzZSA1OiByZXR1cm4gbmV3IGdlby5Qb2ludChjb29yZHMueSwgLWNvb3Jkcy54KTtcclxuICAgICAgICBjYXNlIDY6IHJldHVybiBuZXcgZ2VvLlBvaW50KC1jb29yZHMueSwgLWNvb3Jkcy54KTtcclxuICAgICAgICBjYXNlIDc6IHJldHVybiBuZXcgZ2VvLlBvaW50KC1jb29yZHMueCwgLWNvb3Jkcy55KTtcclxuICAgIH1cclxuXHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIG9jdGFudCAtIG11c3QgYmUgaW4gaW50ZXJ2YWwgWzAsIDgpXCIpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzU2hhZG93ZWQoc2hhZG93czogZ2VvLlBvaW50W10sIGNvb3JkczogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gYXJyYXkuYW55KHNoYWRvd3MsIHggPT4gc2hhZG93Q292ZXJzUG9pbnQoeCwgY29vcmRzKSlcclxufVxyXG5cclxuZnVuY3Rpb24gc2hhZG93Q292ZXJzUG9pbnQoc2hhZG93OiBnZW8uUG9pbnQsIGNvb3JkczogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICBpZiAoc2hhZG93LnggPT0gMCkge1xyXG4gICAgICAgIHJldHVybiBjb29yZHMueSA+IHNoYWRvdy55XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc3RhcnRYID0gc2hhZG93LnggLyAoc2hhZG93LnkgKyAxKSAqIGNvb3Jkcy55XHJcbiAgICBjb25zdCBlbmRYID0gKHNoYWRvdy54ICsgMSkgLyBzaGFkb3cueSAqIGNvb3Jkcy55XHJcblxyXG4gICAgcmV0dXJuIGNvb3Jkcy55ID4gc2hhZG93LnkgJiYgY29vcmRzLnggPiBzdGFydFggJiYgY29vcmRzLnggPCBlbmRYXHJcbn1cclxuXHJcbi8vIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVWaXNpYmlsaXR5KG1hcDogTWFwLCBleWU6IGdlby5Qb2ludCwgcmFkaXVzOiBudW1iZXIpIHtcclxuLy8gICAgIHVwZGF0ZVZpc2liaWxpdHlGbGFncyhtYXAsIGV5ZSwgcmFkaXVzLCBUaWxlRmxhZ3MuVmlzaWJsZSB8IFRpbGVGbGFncy5TZWVuLCBUaWxlRmxhZ3MuVmlzaWJsZSlcclxuLy8gfVxyXG5cclxuLy8gZnVuY3Rpb24gdXBkYXRlVmlzaWJpbGl0eUZsYWdzKG1hcDogTWFwLCBleWU6IGdlby5Qb2ludCwgcmFkaXVzOiBudW1iZXIsIHNldEZsYWdzOiBUaWxlRmxhZ3MsIGNsZWFyRmxhZ3M6IFRpbGVGbGFncykge1xyXG4vLyAgICAgZm9yIChjb25zdCB0aWxlIG9mIG1hcCkge1xyXG4vLyAgICAgICAgIHRpbGUuZmxhZ3MgJj0gfmNsZWFyRmxhZ3NcclxuLy8gICAgIH1cclxuXHJcbi8vICAgICBtYXAuZ2V0VGlsZShleWUpLmZsYWdzIHw9IHNldEZsYWdzXHJcblxyXG4vLyAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA4OyArK2kpIHtcclxuLy8gICAgICAgICB1cGRhdGVWaXNpYmlsaXR5T2N0YW50KG1hcCwgZXllLCByYWRpdXMsIHNldEZsYWdzLCBpKVxyXG4vLyAgICAgfVxyXG4vLyB9XHJcblxyXG4vLyBmdW5jdGlvbiB1cGRhdGVWaXNpYmlsaXR5T2N0YW50KG1hcDogTWFwLCBleWU6IGdlby5Qb2ludCwgcmFkaXVzOiBudW1iZXIsIHNldEZsYWdzOiBUaWxlRmxhZ3MsIG9jdGFudDogbnVtYmVyKSB7XHJcbi8vICAgICBjb25zdCBzaGFkb3dzOiBnZW8uUG9pbnRbXSA9IFtdXHJcblxyXG4vLyAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gcmFkaXVzOyArK2kpIHtcclxuLy8gICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8PSBpOyArK2opIHtcclxuLy8gICAgICAgICAgICAgY29uc3Qgb2N0YW50UG9pbnQgPSBuZXcgZ2VvLlBvaW50KGksIGopXHJcblxyXG4vLyAgICAgICAgICAgICBjb25zdCBtYXBQb2ludCA9IHRyYW5zZm9ybU9jdGFudChvY3RhbnRQb2ludCwgb2N0YW50KS5hZGQoZXllKVxyXG4vLyAgICAgICAgICAgICBpZiAoIW1hcC5pbkJvdW5kcyhtYXBQb2ludCkpIHtcclxuLy8gICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbi8vICAgICAgICAgICAgIH1cclxuXHJcbi8vICAgICAgICAgICAgIGlmIChpc1NoYWRvd2VkKHNoYWRvd3MsIG9jdGFudFBvaW50KSkge1xyXG4vLyAgICAgICAgICAgICAgICAgY29udGludWVcclxuLy8gICAgICAgICAgICAgfVxyXG5cclxuLy8gICAgICAgICAgICAgY29uc3QgdGlsZSA9IG1hcC5nZXRUaWxlKG1hcFBvaW50KVxyXG4vLyAgICAgICAgICAgICBpZiAodGlsZUJsb2Nrc1ZpZXcodGlsZSkpIHtcclxuLy8gICAgICAgICAgICAgICAgIHNoYWRvd3MucHVzaChvY3RhbnRQb2ludClcclxuLy8gICAgICAgICAgICAgfVxyXG5cclxuLy8gICAgICAgICAgICAgaWYgKGdlby5jYWxjRGlzdChtYXBQb2ludCwgZXllKSA+IHJhZGl1cykge1xyXG4vLyAgICAgICAgICAgICAgICAgY29udGludWVcclxuLy8gICAgICAgICAgICAgfVxyXG5cclxuLy8gICAgICAgICAgICAgdGlsZS5mbGFncyB8PSBzZXRGbGFnc1xyXG4vLyAgICAgICAgIH1cclxuLy8gICAgIH1cclxuLy8gfVxyXG5cclxuLy8gZnVuY3Rpb24gdHJhbnNmb3JtT2N0YW50KGNvb3JkczogZ2VvLlBvaW50LCBvY3RhbnQ6IG51bWJlcik6IGdlby5Qb2ludCB7XHJcbi8vICAgICBzd2l0Y2ggKG9jdGFudCkge1xyXG4vLyAgICAgICAgIGNhc2UgMDogcmV0dXJuIG5ldyBnZW8uUG9pbnQoY29vcmRzLmksIC1jb29yZHMuaik7XHJcbi8vICAgICAgICAgY2FzZSAxOiByZXR1cm4gbmV3IGdlby5Qb2ludChjb29yZHMuaiwgLWNvb3Jkcy5pKTtcclxuLy8gICAgICAgICBjYXNlIDI6IHJldHVybiBuZXcgZ2VvLlBvaW50KGNvb3Jkcy5qLCBjb29yZHMuaSk7XHJcbi8vICAgICAgICAgY2FzZSAzOiByZXR1cm4gbmV3IGdlby5Qb2ludChjb29yZHMuaSwgY29vcmRzLmopO1xyXG4vLyAgICAgICAgIGNhc2UgNDogcmV0dXJuIG5ldyBnZW8uUG9pbnQoLWNvb3Jkcy5pLCBjb29yZHMuaik7XHJcbi8vICAgICAgICAgY2FzZSA1OiByZXR1cm4gbmV3IGdlby5Qb2ludCgtY29vcmRzLmosIGNvb3Jkcy5pKTtcclxuLy8gICAgICAgICBjYXNlIDY6IHJldHVybiBuZXcgZ2VvLlBvaW50KC1jb29yZHMuaiwgLWNvb3Jkcy5pKTtcclxuLy8gICAgICAgICBjYXNlIDc6IHJldHVybiBuZXcgZ2VvLlBvaW50KC1jb29yZHMuaSwgLWNvb3Jkcy5qKTtcclxuLy8gICAgIH1cclxuXHJcbi8vICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIG9jdGFudCAtIG11c3QgYmUgaW4gaW50ZXJ2YWwgWzAsIDgpXCIpXHJcbi8vIH1cclxuXHJcbi8vIGZ1bmN0aW9uIGlzU2hhZG93ZWQoc2hhZG93czogZ2VvLlBvaW50W10sIGNvb3JkczogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbi8vICAgICByZXR1cm4gaXRlci5hbnkoc2hhZG93cywgeCA9PiBzaGFkb3dDb3ZlcnNQb2ludCh4LCBjb29yZHMpKVxyXG4vLyB9XHJcblxyXG4vLyBmdW5jdGlvbiBzaGFkb3dDb3ZlcnNQb2ludChzaGFkb3c6IGdlby5Qb2ludCwgY29vcmRzOiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuLy8gICAgIGlmIChzaGFkb3cuaiA9PSAwKSB7XHJcbi8vICAgICAgICAgcmV0dXJuIGNvb3Jkcy5pID4gc2hhZG93LmlcclxuLy8gICAgIH1cclxuXHJcbi8vICAgICBjb25zdCBzdGFydEogPSBzaGFkb3cuaiAvIChzaGFkb3cuaSArIDEpICogY29vcmRzLmlcclxuLy8gICAgIGNvbnN0IGVuZEogPSAoc2hhZG93LmogKyAxKSAvIHNoYWRvdy5pICogY29vcmRzLmlcclxuXHJcbi8vICAgICByZXR1cm4gY29vcmRzLmkgPiBzaGFkb3cuaSAmJiBjb29yZHMuaiA+IHN0YXJ0SiAmJiBjb29yZHMuaiA8IGVuZEpcclxuLy8gfSJdfQ==