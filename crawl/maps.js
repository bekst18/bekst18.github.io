import * as geo from "../shared/geo2d.js";
import * as iter from "../shared/iter.js";
import * as grid from "../shared/grid.js";
export var Visibility;
(function (Visibility) {
    // no visibility
    Visibility[Visibility["None"] = 0] = "None";
    // in line of sight, but outside of light radius
    Visibility[Visibility["Dark"] = 1] = "Dark";
    // visible and lit
    Visibility[Visibility["Visible"] = 2] = "Visible";
})(Visibility || (Visibility = {}));
/**
 * a layer that is based on a map
 * works well for sparse layers
 */
export class MapLayer {
    constructor() {
        this.map = new window.Map();
    }
    // this isn't quite right!
    // need to remove any old item at the specified position!
    set(position, thing) {
        position = position.clone();
        let th = iter.wrap(this.map.values()).find(pth => pth.position.equal(position));
        if (th) {
            this.map.delete(th.thing);
        }
        this.map.set(thing, { thing, position });
    }
    delete(thing) {
        this.map.delete(thing);
    }
    has(thing) {
        return this.map.has(thing);
    }
    at(position) {
        for (const pth of this.map.values()) {
            if (pth.position.equal(position)) {
                return pth.thing;
            }
        }
        return undefined;
    }
    where(thing) {
        var _a, _b;
        return (_b = (_a = this.map.get(thing)) === null || _a === void 0 ? void 0 : _a.position) === null || _b === void 0 ? void 0 : _b.clone();
    }
    *within(aabb) {
        for (const pth of this.map.values()) {
            if (aabb.contains(pth.position)) {
                yield pth;
            }
        }
    }
    get size() {
        return this.map.size;
    }
    *[Symbol.iterator]() {
        for (const value of this.map.values()) {
            yield value;
        }
    }
    *things() {
        for (const th of this.map.keys()) {
            yield th;
        }
    }
    *thingsWithin(aabb) {
        for (const pth of this.within(aabb)) {
            yield pth.thing;
        }
    }
}
/**
 * a layer that is based on a grid
 * works well for dense layers
 */
export class GridLayer {
    constructor(width, height) {
        this.map = new MapLayer();
        this.grd = grid.generate(width, height, () => undefined);
    }
    get width() {
        return this.grd.width;
    }
    get height() {
        return this.grd.height;
    }
    set(position, thing) {
        // remove from grid if already present
        const oldPosition = this.map.where(thing);
        if (oldPosition) {
            this.grd.setPoint(oldPosition, undefined);
        }
        this.grd.setPoint(position, thing);
        this.map.set(position, thing);
    }
    delete(thing) {
        const pos = this.map.where(thing);
        if (!pos) {
            return;
        }
        this.grd.setPoint(pos, undefined);
        this.map.delete(thing);
    }
    has(item) {
        return this.map.has(item);
    }
    at(position) {
        return this.grd.atPoint(position);
    }
    where(thing) {
        return this.map.where(thing);
    }
    *within(aabb) {
        for (const [thing, x, y] of this.grd.scanAABB(aabb)) {
            if (!thing) {
                continue;
            }
            yield {
                position: new geo.Point(x, y),
                thing,
            };
        }
    }
    *thingsWithin(aabb) {
        for (const pth of this.within(aabb)) {
            yield pth.thing;
        }
    }
    get size() {
        return this.map.size;
    }
    *[Symbol.iterator]() {
        for (const value of this.map) {
            yield value;
        }
    }
    things() {
        return this.map.things();
    }
}
export var Lighting;
(function (Lighting) {
    Lighting[Lighting["None"] = 0] = "None";
    Lighting[Lighting["Ambient"] = 1] = "Ambient";
})(Lighting || (Lighting = {}));
/**
 * components of a generated map area
 */
export class Map {
    constructor(width, height, depth, player) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.player = player;
        this.lighting = Lighting.None;
        this.tiles = new GridLayer(width, height);
        this.visible = grid.generate(width, height, _ => Visibility.None);
        this.seen = grid.generate(width, height, _ => false);
        this.fixtures = new MapLayer();
        this.exits = new MapLayer();
        this.monsters = new MapLayer();
        this.containers = new MapLayer();
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
        for (const exit of this.exits) {
            yield exit;
        }
        for (const container of this.containers) {
            yield container;
        }
        for (const monster of this.monsters) {
            yield monster;
        }
        yield this.player;
    }
    /**
     * iterate over all things in map
   */
    *things() {
        for (const pth of this) {
            yield pth.thing;
        }
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
    visibilityAt(xy) {
        return this.visible.atPoint(xy);
    }
    seenAt(xy) {
        return this.seen.atPoint(xy);
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
        if (this.player.position.equal(xy)) {
            yield this.player.thing;
        }
    }
    inBounds(xy) {
        return xy.x >= 0 && xy.x < this.width && xy.y >= 0 && xy.y < this.height;
    }
    isPassable(position) {
        return this.inBounds(position) && iter.all(this.at(position), th => th.passable);
    }
    updateVisible(viewportRadius) {
        this.clearVisible();
        const eye = this.player.position;
        const lightRadius = this.player.thing.lightRadius;
        for (let i = 0; i < 8; ++i) {
            this.updateVisibleOctant(eye, viewportRadius, lightRadius, i);
        }
        this.visible.setPoint(eye, Visibility.Visible);
        this.seen.setPoint(eye, true);
        // process each light source, lighting any tile that is marked as dark
        const sources = iter.filter(this.fixtures, f => f.thing.lightRadius > 0);
        for (const source of sources) {
            this.processLightSource(source);
        }
    }
    clearVisible() {
        for (let i = 0; i < this.visible.size; ++i) {
            const v = this.visible.atf(i);
            this.visible.setf(i, Visibility.None);
        }
    }
    updateVisibleOctant(eye, viewportRadius, lightRadius, octant) {
        const shadows = [];
        for (let y = 1; y <= viewportRadius; ++y) {
            for (let x = 0; x <= y; ++x) {
                const octantPoint = new geo.Point(x, y);
                const mapPoint = transformOctant(octantPoint, octant).addPoint(eye);
                if (!this.inBounds(mapPoint)) {
                    continue;
                }
                if (isShadowed(shadows, octantPoint)) {
                    this.visible.set(mapPoint.x, mapPoint.y, Visibility.None);
                    continue;
                }
                const opaque = iter.any(this.at(mapPoint), th => !th.transparent);
                if (opaque) {
                    shadows.push(octantPoint);
                }
                if (geo.calcManhattenDist(mapPoint, eye) > lightRadius) {
                    this.visible.setPoint(mapPoint, Visibility.Dark);
                    continue;
                }
                this.visible.setPoint(mapPoint, Visibility.Visible);
                this.seen.setPoint(mapPoint, true);
            }
        }
    }
    processLightSource(positionedSource) {
        const { position, thing: source } = positionedSource;
        if (source.lightRadius <= 0) {
            return;
        }
        for (let i = 0; i < 8; ++i) {
            this.updateVisibleOctantLightSource(position, source.lightRadius, i);
        }
        if (this.visibilityAt(position) == Visibility.Dark) {
            this.visible.setPoint(position, Visibility.Visible);
            this.seen.setPoint(position, true);
        }
    }
    updateVisibleOctantLightSource(eye, radius, octant) {
        const shadows = [];
        // for light source, should only light darkened squares
        for (let y = 1; y <= radius; ++y) {
            for (let x = 0; x <= y; ++x) {
                const octantPoint = new geo.Point(x, y);
                const mapPoint = transformOctant(octantPoint, octant).addPoint(eye);
                if (!this.inBounds(mapPoint)) {
                    continue;
                }
                if (isShadowed(shadows, octantPoint)) {
                    continue;
                }
                const opaque = iter.any(this.at(mapPoint), th => !th.transparent);
                if (opaque) {
                    shadows.push(octantPoint);
                }
                if (geo.calcManhattenDist(mapPoint, eye) > radius) {
                    continue;
                }
                if (this.visibilityAt(mapPoint) === Visibility.Dark) {
                    this.visible.set(mapPoint.x, mapPoint.y, Visibility.Visible);
                    this.seen.setPoint(mapPoint, true);
                }
            }
        }
    }
}
/*
export function updateVisibility(map: Map, radius: number) {
    resetVisibility(map)

    const eye = map.player.position

    for (let i = 0; i < 8; ++i) {
        updateVisibilityOctant(map, eye, radius, i)
    }

    // eye point always visible
    iter.each(map.at(eye), th => th.visible = rl.Visibility.Visible)

    // process other light sources
    processLightSources(map)
}

function processLightSources(map: Map) {
    // have we uncovered other light sources?
    // need a way to evaluate LOS - not JUST visible!
    const lights = new Set(iter.filter(map.fixtures, x => x.thing.lightRadius > 0 && ))

    while (lights.size > 0) {
        const light = iter.find(lights, l => l.thing.visible == rl.Visibility.Visible)
        if (!light) {
            break
        }

        lights.delete(light)

        for (let i = 0; i < 8; ++i) {
            updateVisibilityOctant(map, light.position, light.thing.lightRadius, i)
        }
    }
}

function processLightSource(source: rl.Fixture) {
    if (source.lightRadius <= 0) {
        return
    }


}

function updateVisibilityOctant(map: Map, eye: geo.Point, radius: number, octant: number) {
    const shadows: geo.Point[] = []

    for (let y = 1; y <= radius; ++y) {
        for (let x = 0; x <= y; ++x) {
            const octantPoint = new geo.Point(x, y)

            const mapPoint = transformOctant(octantPoint, octant).addPoint(eye)
            if (!map.inBounds(mapPoint)) {
                continue
            }

            if (isShadowed(shadows, octantPoint)) {
                continue
            }

            const opaque = iter.any(map.at(mapPoint), th => !th.transparent)
            if (opaque) {
                shadows.push(octantPoint)
            }

            if (geo.calcManhattenDist(mapPoint, eye) > radius) {
                continue
            }

            for (const th of map.at(mapPoint)) {
                th.visible = Visibility.Visible
            }
        }
    }
}
*/
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
    return iter.any(shadows, x => shadowCoversPoint(x, coords));
}
function shadowCoversPoint(shadow, coords) {
    if (shadow.x == 0) {
        return coords.y > shadow.y;
    }
    const startX = shadow.x / (shadow.y + 1) * coords.y;
    const endX = (shadow.x + 1) / shadow.y * coords.y;
    return coords.y > shadow.y && coords.x > startX && coords.x < endX;
}
/**
 * Find a path from start to goal
 * @param map map
 * @param start start coords
 * @param goal goal coords
 * @returns path from start to goal, including goal, but not starting position
 */
export function findPath(map, start, goal) {
    const open = new Array();
    const closed = new Array();
    open.push({ f: 0, g: 0, h: 0, parent: null, coords: start });
    const popOpen = () => {
        // warning: assumes non-empty!
        let n = 0;
        open.forEach((x, i) => {
            if (x.f < open[n].f) {
                n = i;
            }
        });
        // swap & pop
        const r = open[n];
        if (n < open.length - 1) {
            open[n] = open[open.length - 1];
        }
        open.pop();
        return r;
    };
    const assemblePath = (node) => {
        // path found! backtrack and assemble path
        const path = new Array();
        while (node && !node.coords.equal(start)) {
            path.push(node.coords);
            node = node.parent;
        }
        return path.reverse();
    };
    while (open.length > 0) {
        const cur = popOpen();
        closed.push(cur);
        if (cur.coords.equal(goal)) {
            return assemblePath(cur);
        }
        for (const coords of visitNeighbors(cur.coords, map.width, map.height)) {
            if (!map.isPassable(coords) && !coords.equal(goal)) {
                continue;
            }
            if (closed.find(x => coords.equal(x.coords))) {
                continue;
            }
            const g = cur.g + 1;
            const h = geo.calcManhattenDist(goal, coords);
            const f = g + h;
            // does this node already exist in open list?
            const openNode = open.find(x => coords.equal(x.coords));
            if (openNode != null && openNode.g <= g) {
                continue;
            }
            // place in open list
            open.push({ g: g, h: h, f: f, parent: cur, coords: coords });
        }
    }
    return new Array();
}
function* visitNeighbors(pt, width, height) {
    if (pt.x < 0 || pt.y < 0 || pt.x >= width || pt.y >= height) {
        throw new Error("pt is out of bounds");
    }
    // w
    if (pt.x > 0) {
        const w = new geo.Point(pt.x - 1, pt.y);
        yield w;
    }
    // s
    if (pt.y < height - 1) {
        const s = new geo.Point(pt.x, pt.y + 1);
        yield s;
    }
    // e
    if (pt.x < width - 1) {
        const e = new geo.Point(pt.x + 1, pt.y);
        yield e;
    }
    // n
    if (pt.y > 0) {
        const n = new geo.Point(pt.x, pt.y - 1);
        yield n;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hcHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBRXpDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFFekMsTUFBTSxDQUFOLElBQVksVUFPWDtBQVBELFdBQVksVUFBVTtJQUNsQixnQkFBZ0I7SUFDaEIsMkNBQUksQ0FBQTtJQUNKLGdEQUFnRDtJQUNoRCwyQ0FBSSxDQUFBO0lBQ0osa0JBQWtCO0lBQ2xCLGlEQUFPLENBQUE7QUFDWCxDQUFDLEVBUFcsVUFBVSxLQUFWLFVBQVUsUUFPckI7QUF1QkQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLFFBQVE7SUFBckI7UUFDcUIsUUFBRyxHQUFHLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBZ0IsQ0FBQTtJQWtFekQsQ0FBQztJQWhFRywwQkFBMEI7SUFDMUIseURBQXlEO0lBQ3pELEdBQUcsQ0FBQyxRQUFtQixFQUFFLEtBQVE7UUFDN0IsUUFBUSxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUUzQixJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQy9FLElBQUksRUFBRSxFQUFFO1lBQ0osSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1NBQzVCO1FBRUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDNUMs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QUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDVixNQUFNLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxDQUFBO0tBQ1Y7SUFFRCxJQUFJO0lBQ0osSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDbkIsTUFBTSxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsQ0FBQTtLQUNWO0lBRUQsSUFBSTtJQUNKLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxFQUFFO1FBQ2xCLE1BQU0sQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLENBQUE7S0FDVjtJQUVELElBQUk7SUFDSixJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ1YsTUFBTSxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsQ0FBQTtLQUNWO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgaXRlciBmcm9tIFwiLi4vc2hhcmVkL2l0ZXIuanNcIlxyXG5pbXBvcnQgKiBhcyBybCBmcm9tIFwiLi9ybC5qc1wiXHJcbmltcG9ydCAqIGFzIGdyaWQgZnJvbSBcIi4uL3NoYXJlZC9ncmlkLmpzXCJcclxuXHJcbmV4cG9ydCBlbnVtIFZpc2liaWxpdHkge1xyXG4gICAgLy8gbm8gdmlzaWJpbGl0eVxyXG4gICAgTm9uZSxcclxuICAgIC8vIGluIGxpbmUgb2Ygc2lnaHQsIGJ1dCBvdXRzaWRlIG9mIGxpZ2h0IHJhZGl1c1xyXG4gICAgRGFyayxcclxuICAgIC8vIHZpc2libGUgYW5kIGxpdFxyXG4gICAgVmlzaWJsZVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBsYWNlZDxUIGV4dGVuZHMgcmwuVGhpbmc+IHtcclxuICAgIHRoaW5nOiBULFxyXG4gICAgcG9zaXRpb246IGdlby5Qb2ludCxcclxufVxyXG5cclxuLyoqXHJcbiAqIGEgbGF5ZXIgb2YgdGhpbmdzIG9uIGEgbWFwXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIExheWVyPFQgZXh0ZW5kcyBybC5UaGluZz4ge1xyXG4gICAgc2V0KHBvc2l0aW9uOiBnZW8uUG9pbnQsIHRoaW5nOiBUKTogdm9pZFxyXG4gICAgZGVsZXRlKHRoaW5nOiBUKTogdm9pZFxyXG4gICAgaGFzKHRoaW5nOiBUKTogYm9vbGVhblxyXG4gICAgYXQocG9zaXRpb246IGdlby5Qb2ludCk6IFQgfCB1bmRlZmluZWRcclxuICAgIHdpdGhpbihhYWJiOiBnZW8uQUFCQik6IEdlbmVyYXRvcjxQbGFjZWQ8VD4+LFxyXG4gICAgdGhpbmdzV2l0aGluKGFhYmI6IGdlby5BQUJCKTogR2VuZXJhdG9yPFQ+LFxyXG4gICAgd2hlcmUodGhpbmc6IFQpOiBnZW8uUG9pbnQgfCB1bmRlZmluZWQsXHJcbiAgICBzaXplOiBudW1iZXJcclxuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEdlbmVyYXRvcjxQbGFjZWQ8VD4+XHJcbiAgICB0aGluZ3MoKTogR2VuZXJhdG9yPFQ+XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBhIGxheWVyIHRoYXQgaXMgYmFzZWQgb24gYSBtYXBcclxuICogd29ya3Mgd2VsbCBmb3Igc3BhcnNlIGxheWVyc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIE1hcExheWVyPFQgZXh0ZW5kcyBybC5UaGluZz4gaW1wbGVtZW50cyBMYXllcjxUPiB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1hcCA9IG5ldyB3aW5kb3cuTWFwPFQsIFBsYWNlZDxUPj4oKVxyXG5cclxuICAgIC8vIHRoaXMgaXNuJ3QgcXVpdGUgcmlnaHQhXHJcbiAgICAvLyBuZWVkIHRvIHJlbW92ZSBhbnkgb2xkIGl0ZW0gYXQgdGhlIHNwZWNpZmllZCBwb3NpdGlvbiFcclxuICAgIHNldChwb3NpdGlvbjogZ2VvLlBvaW50LCB0aGluZzogVCk6IHZvaWQge1xyXG4gICAgICAgIHBvc2l0aW9uID0gcG9zaXRpb24uY2xvbmUoKVxyXG5cclxuICAgICAgICBsZXQgdGggPSBpdGVyLndyYXAodGhpcy5tYXAudmFsdWVzKCkpLmZpbmQocHRoID0+IHB0aC5wb3NpdGlvbi5lcXVhbChwb3NpdGlvbikpXHJcbiAgICAgICAgaWYgKHRoKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmRlbGV0ZSh0aC50aGluZylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubWFwLnNldCh0aGluZywgeyB0aGluZywgcG9zaXRpb24gfSlcclxuICAgIH1cclxuXHJcbiAgICBkZWxldGUodGhpbmc6IFQpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLm1hcC5kZWxldGUodGhpbmcpXHJcbiAgICB9XHJcblxyXG4gICAgaGFzKHRoaW5nOiBUKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwLmhhcyh0aGluZylcclxuICAgIH1cclxuXHJcbiAgICBhdChwb3NpdGlvbjogZ2VvLlBvaW50KTogVCB8IHVuZGVmaW5lZCB7XHJcbiAgICAgICAgZm9yIChjb25zdCBwdGggb2YgdGhpcy5tYXAudmFsdWVzKCkpIHtcclxuICAgICAgICAgICAgaWYgKHB0aC5wb3NpdGlvbi5lcXVhbChwb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwdGgudGhpbmdcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gICAgfVxyXG5cclxuICAgIHdoZXJlKHRoaW5nOiBUKTogZ2VvLlBvaW50IHwgdW5kZWZpbmVkIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAuZ2V0KHRoaW5nKT8ucG9zaXRpb24/LmNsb25lKClcclxuICAgIH1cclxuXHJcbiAgICAqd2l0aGluKGFhYmI6IGdlby5BQUJCKTogR2VuZXJhdG9yPFBsYWNlZDxUPj4ge1xyXG4gICAgICAgIGZvciAoY29uc3QgcHRoIG9mIHRoaXMubWFwLnZhbHVlcygpKSB7XHJcbiAgICAgICAgICAgIGlmIChhYWJiLmNvbnRhaW5zKHB0aC5wb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgICAgIHlpZWxkIHB0aFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBzaXplKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1hcC5zaXplXHJcbiAgICB9XHJcblxyXG4gICAgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEdlbmVyYXRvcjxQbGFjZWQ8VD4+IHtcclxuICAgICAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIHRoaXMubWFwLnZhbHVlcygpKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHZhbHVlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgICp0aGluZ3MoKTogR2VuZXJhdG9yPFQ+IHtcclxuICAgICAgICBmb3IgKGNvbnN0IHRoIG9mIHRoaXMubWFwLmtleXMoKSkge1xyXG4gICAgICAgICAgICB5aWVsZCB0aFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAqdGhpbmdzV2l0aGluKGFhYmI6IGdlby5BQUJCKTogR2VuZXJhdG9yPFQ+IHtcclxuICAgICAgICBmb3IgKGNvbnN0IHB0aCBvZiB0aGlzLndpdGhpbihhYWJiKSkge1xyXG4gICAgICAgICAgICB5aWVsZCBwdGgudGhpbmdcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBhIGxheWVyIHRoYXQgaXMgYmFzZWQgb24gYSBncmlkXHJcbiAqIHdvcmtzIHdlbGwgZm9yIGRlbnNlIGxheWVyc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEdyaWRMYXllcjxUIGV4dGVuZHMgcmwuVGhpbmc+IGltcGxlbWVudHMgTGF5ZXI8VD4ge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtYXAgPSBuZXcgTWFwTGF5ZXI8VD4oKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBncmQ6IGdyaWQuR3JpZDxUIHwgdW5kZWZpbmVkPlxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5ncmQgPSBncmlkLmdlbmVyYXRlKHdpZHRoLCBoZWlnaHQsICgpID0+IHVuZGVmaW5lZClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgd2lkdGgoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZ3JkLndpZHRoXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGhlaWdodCgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5ncmQuaGVpZ2h0XHJcbiAgICB9XHJcblxyXG4gICAgc2V0KHBvc2l0aW9uOiBnZW8uUG9pbnQsIHRoaW5nOiBUKTogdm9pZCB7XHJcbiAgICAgICAgLy8gcmVtb3ZlIGZyb20gZ3JpZCBpZiBhbHJlYWR5IHByZXNlbnRcclxuICAgICAgICBjb25zdCBvbGRQb3NpdGlvbiA9IHRoaXMubWFwLndoZXJlKHRoaW5nKVxyXG4gICAgICAgIGlmIChvbGRQb3NpdGlvbikge1xyXG4gICAgICAgICAgICB0aGlzLmdyZC5zZXRQb2ludChvbGRQb3NpdGlvbiwgdW5kZWZpbmVkKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5ncmQuc2V0UG9pbnQocG9zaXRpb24sIHRoaW5nKVxyXG4gICAgICAgIHRoaXMubWFwLnNldChwb3NpdGlvbiwgdGhpbmcpXHJcbiAgICB9XHJcblxyXG4gICAgZGVsZXRlKHRoaW5nOiBUKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgcG9zID0gdGhpcy5tYXAud2hlcmUodGhpbmcpXHJcbiAgICAgICAgaWYgKCFwb3MpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmdyZC5zZXRQb2ludChwb3MsIHVuZGVmaW5lZClcclxuICAgICAgICB0aGlzLm1hcC5kZWxldGUodGhpbmcpXHJcbiAgICB9XHJcblxyXG4gICAgaGFzKGl0ZW06IFQpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAuaGFzKGl0ZW0pXHJcbiAgICB9XHJcblxyXG4gICAgYXQocG9zaXRpb246IGdlby5Qb2ludCk6IFQgfCB1bmRlZmluZWQge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmdyZC5hdFBvaW50KHBvc2l0aW9uKVxyXG4gICAgfVxyXG5cclxuICAgIHdoZXJlKHRoaW5nOiBUKTogZ2VvLlBvaW50IHwgdW5kZWZpbmVkIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAud2hlcmUodGhpbmcpXHJcbiAgICB9XHJcblxyXG4gICAgKndpdGhpbihhYWJiOiBnZW8uQUFCQik6IEdlbmVyYXRvcjxQbGFjZWQ8VD4+IHtcclxuICAgICAgICBmb3IgKGNvbnN0IFt0aGluZywgeCwgeV0gb2YgdGhpcy5ncmQuc2NhbkFBQkIoYWFiYikpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGluZykge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgeWllbGQge1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5ldyBnZW8uUG9pbnQoeCwgeSksXHJcbiAgICAgICAgICAgICAgICB0aGluZyxcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAqdGhpbmdzV2l0aGluKGFhYmI6IGdlby5BQUJCKTogR2VuZXJhdG9yPFQ+IHtcclxuICAgICAgICBmb3IgKGNvbnN0IHB0aCBvZiB0aGlzLndpdGhpbihhYWJiKSkge1xyXG4gICAgICAgICAgICB5aWVsZCBwdGgudGhpbmdcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHNpemUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwLnNpemVcclxuICAgIH1cclxuXHJcbiAgICAqW1N5bWJvbC5pdGVyYXRvcl0oKTogR2VuZXJhdG9yPFBsYWNlZDxUPj4ge1xyXG4gICAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgdGhpcy5tYXApIHtcclxuICAgICAgICAgICAgeWllbGQgdmFsdWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpbmdzKCk6IEdlbmVyYXRvcjxUPiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwLnRoaW5ncygpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBlbnVtIExpZ2h0aW5nIHtcclxuICAgIE5vbmUsXHJcbiAgICBBbWJpZW50LFxyXG59XHJcblxyXG4vKipcclxuICogY29tcG9uZW50cyBvZiBhIGdlbmVyYXRlZCBtYXAgYXJlYVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIE1hcCB7XHJcbiAgICB0aWxlczogTGF5ZXI8cmwuVGlsZT5cclxuICAgIHZpc2libGU6IGdyaWQuR3JpZDxWaXNpYmlsaXR5PlxyXG4gICAgc2VlbjogZ3JpZC5HcmlkPGJvb2xlYW4+XHJcbiAgICBmaXh0dXJlczogTGF5ZXI8cmwuRml4dHVyZT5cclxuICAgIGV4aXRzOiBMYXllcjxybC5FeGl0PlxyXG4gICAgbW9uc3RlcnM6IExheWVyPHJsLk1vbnN0ZXI+XHJcbiAgICBjb250YWluZXJzOiBMYXllcjxybC5Db250YWluZXI+XHJcbiAgICBsaWdodGluZzogTGlnaHRpbmcgPSBMaWdodGluZy5Ob25lXHJcblxyXG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgd2lkdGg6IG51bWJlciwgcmVhZG9ubHkgaGVpZ2h0OiBudW1iZXIsIHJlYWRvbmx5IGRlcHRoOiBudW1iZXIsIHJlYWRvbmx5IHBsYXllcjogUGxhY2VkPHJsLlBsYXllcj4pIHtcclxuICAgICAgICB0aGlzLnRpbGVzID0gbmV3IEdyaWRMYXllcih3aWR0aCwgaGVpZ2h0KVxyXG4gICAgICAgIHRoaXMudmlzaWJsZSA9IGdyaWQuZ2VuZXJhdGUod2lkdGgsIGhlaWdodCwgXyA9PiBWaXNpYmlsaXR5Lk5vbmUpXHJcbiAgICAgICAgdGhpcy5zZWVuID0gZ3JpZC5nZW5lcmF0ZSh3aWR0aCwgaGVpZ2h0LCBfID0+IGZhbHNlKVxyXG4gICAgICAgIHRoaXMuZml4dHVyZXMgPSBuZXcgTWFwTGF5ZXIoKVxyXG4gICAgICAgIHRoaXMuZXhpdHMgPSBuZXcgTWFwTGF5ZXIoKVxyXG4gICAgICAgIHRoaXMubW9uc3RlcnMgPSBuZXcgTWFwTGF5ZXIoKVxyXG4gICAgICAgIHRoaXMuY29udGFpbmVycyA9IG5ldyBNYXBMYXllcigpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgICogaXRlcmF0ZSBvdmVyIGFsbCB0aGluZ3MgaW4gbWFwXHJcbiAgICAqL1xyXG4gICAgcHVibGljICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBHZW5lcmF0b3I8UGxhY2VkPHJsLlRoaW5nPj4ge1xyXG4gICAgICAgIGZvciAoY29uc3QgdGlsZSBvZiB0aGlzLnRpbGVzKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRpbGVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgZml4dHVyZSBvZiB0aGlzLmZpeHR1cmVzKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIGZpeHR1cmVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRzKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIGV4aXRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgY29udGFpbmVyIG9mIHRoaXMuY29udGFpbmVycykge1xyXG4gICAgICAgICAgICB5aWVsZCBjb250YWluZXJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgbW9uc3RlciBvZiB0aGlzLm1vbnN0ZXJzKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIG1vbnN0ZXJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHlpZWxkIHRoaXMucGxheWVyXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBpdGVyYXRlIG92ZXIgYWxsIHRoaW5ncyBpbiBtYXBcclxuICAgKi9cclxuICAgIHB1YmxpYyAqdGhpbmdzKCk6IEdlbmVyYXRvcjxybC5UaGluZz4ge1xyXG4gICAgICAgIGZvciAoY29uc3QgcHRoIG9mIHRoaXMpIHtcclxuICAgICAgICAgICAgeWllbGQgcHRoLnRoaW5nXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRpbGVBdCh4eTogZ2VvLlBvaW50KTogcmwuVGlsZSB8IHVuZGVmaW5lZCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMudGlsZXMuYXQoeHkpXHJcbiAgICB9XHJcblxyXG4gICAgZml4dHVyZUF0KHh5OiBnZW8uUG9pbnQpOiBybC5GaXh0dXJlIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5maXh0dXJlcy5hdCh4eSlcclxuICAgIH1cclxuXHJcbiAgICBjb250YWluZXJBdCh4eTogZ2VvLlBvaW50KTogcmwuQ29udGFpbmVyIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jb250YWluZXJzLmF0KHh5KVxyXG4gICAgfVxyXG5cclxuICAgIG1vbnN0ZXJBdCh4eTogZ2VvLlBvaW50KTogcmwuTW9uc3RlciB8IHVuZGVmaW5lZCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW9uc3RlcnMuYXQoeHkpXHJcbiAgICB9XHJcblxyXG4gICAgdmlzaWJpbGl0eUF0KHh5OiBnZW8uUG9pbnQpOiBWaXNpYmlsaXR5IHtcclxuICAgICAgICByZXR1cm4gdGhpcy52aXNpYmxlLmF0UG9pbnQoeHkpXHJcbiAgICB9XHJcblxyXG4gICAgc2VlbkF0KHh5OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zZWVuLmF0UG9pbnQoeHkpXHJcbiAgICB9XHJcblxyXG4gICAgKmF0KHh5OiBnZW8uUG9pbnQpOiBHZW5lcmF0b3I8cmwuTW9uc3RlciB8IHJsLkZpeHR1cmUgfCBybC5UaWxlPiB7XHJcbiAgICAgICAgY29uc3QgZml4dHVyZSA9IHRoaXMuZml4dHVyZUF0KHh5KVxyXG4gICAgICAgIGlmIChmaXh0dXJlKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIGZpeHR1cmVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLnRpbGVBdCh4eSlcclxuICAgICAgICBpZiAodGlsZSkge1xyXG4gICAgICAgICAgICB5aWVsZCB0aWxlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckF0KHh5KVxyXG4gICAgICAgIGlmIChjb250YWluZXIpIHtcclxuICAgICAgICAgICAgeWllbGQgY29udGFpbmVyXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtb25zdGVyID0gdGhpcy5tb25zdGVyQXQoeHkpXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIpIHtcclxuICAgICAgICAgICAgeWllbGQgbW9uc3RlclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucGxheWVyLnBvc2l0aW9uLmVxdWFsKHh5KSkge1xyXG4gICAgICAgICAgICB5aWVsZCB0aGlzLnBsYXllci50aGluZ1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpbkJvdW5kcyh4eTogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHh5LnggPj0gMCAmJiB4eS54IDwgdGhpcy53aWR0aCAmJiB4eS55ID49IDAgJiYgeHkueSA8IHRoaXMuaGVpZ2h0XHJcbiAgICB9XHJcblxyXG4gICAgaXNQYXNzYWJsZShwb3NpdGlvbjogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5Cb3VuZHMocG9zaXRpb24pICYmIGl0ZXIuYWxsKHRoaXMuYXQocG9zaXRpb24pLCB0aCA9PiB0aC5wYXNzYWJsZSlcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVWaXNpYmxlKHZpZXdwb3J0UmFkaXVzOiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLmNsZWFyVmlzaWJsZSgpXHJcbiAgICAgICAgY29uc3QgZXllID0gdGhpcy5wbGF5ZXIucG9zaXRpb25cclxuICAgICAgICBjb25zdCBsaWdodFJhZGl1cyA9IHRoaXMucGxheWVyLnRoaW5nLmxpZ2h0UmFkaXVzXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgODsgKytpKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJsZU9jdGFudChleWUsIHZpZXdwb3J0UmFkaXVzLCBsaWdodFJhZGl1cywgaSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudmlzaWJsZS5zZXRQb2ludChleWUsIFZpc2liaWxpdHkuVmlzaWJsZSlcclxuICAgICAgICB0aGlzLnNlZW4uc2V0UG9pbnQoZXllLCB0cnVlKVxyXG5cclxuICAgICAgICAvLyBwcm9jZXNzIGVhY2ggbGlnaHQgc291cmNlLCBsaWdodGluZyBhbnkgdGlsZSB0aGF0IGlzIG1hcmtlZCBhcyBkYXJrXHJcbiAgICAgICAgY29uc3Qgc291cmNlcyA9IGl0ZXIuZmlsdGVyKHRoaXMuZml4dHVyZXMsIGYgPT4gZi50aGluZy5saWdodFJhZGl1cyA+IDApXHJcblxyXG4gICAgICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHNvdXJjZXMpIHtcclxuICAgICAgICAgICAgdGhpcy5wcm9jZXNzTGlnaHRTb3VyY2Uoc291cmNlKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNsZWFyVmlzaWJsZSgpIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudmlzaWJsZS5zaXplOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgdiA9IHRoaXMudmlzaWJsZS5hdGYoaSlcclxuICAgICAgICAgICAgdGhpcy52aXNpYmxlLnNldGYoaSwgVmlzaWJpbGl0eS5Ob25lKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZVZpc2libGVPY3RhbnQoZXllOiBnZW8uUG9pbnQsIHZpZXdwb3J0UmFkaXVzOiBudW1iZXIsIGxpZ2h0UmFkaXVzOiBudW1iZXIsIG9jdGFudDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3Qgc2hhZG93czogZ2VvLlBvaW50W10gPSBbXVxyXG5cclxuICAgICAgICBmb3IgKGxldCB5ID0gMTsgeSA8PSB2aWV3cG9ydFJhZGl1czsgKyt5KSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHggPSAwOyB4IDw9IHk7ICsreCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgb2N0YW50UG9pbnQgPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgbWFwUG9pbnQgPSB0cmFuc2Zvcm1PY3RhbnQob2N0YW50UG9pbnQsIG9jdGFudCkuYWRkUG9pbnQoZXllKVxyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmluQm91bmRzKG1hcFBvaW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGlzU2hhZG93ZWQoc2hhZG93cywgb2N0YW50UG9pbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52aXNpYmxlLnNldChtYXBQb2ludC54LCBtYXBQb2ludC55LCBWaXNpYmlsaXR5Lk5vbmUpXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBvcGFxdWUgPSBpdGVyLmFueSh0aGlzLmF0KG1hcFBvaW50KSwgdGggPT4gIXRoLnRyYW5zcGFyZW50KVxyXG4gICAgICAgICAgICAgICAgaWYgKG9wYXF1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNoYWRvd3MucHVzaChvY3RhbnRQb2ludClcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZ2VvLmNhbGNNYW5oYXR0ZW5EaXN0KG1hcFBvaW50LCBleWUpID4gbGlnaHRSYWRpdXMpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpc2libGUuc2V0UG9pbnQobWFwUG9pbnQsIFZpc2liaWxpdHkuRGFyaylcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMudmlzaWJsZS5zZXRQb2ludChtYXBQb2ludCwgVmlzaWJpbGl0eS5WaXNpYmxlKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWVuLnNldFBvaW50KG1hcFBvaW50LCB0cnVlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHJvY2Vzc0xpZ2h0U291cmNlKHBvc2l0aW9uZWRTb3VyY2U6IFBsYWNlZDxybC5GaXh0dXJlPikge1xyXG4gICAgICAgIGNvbnN0IHsgcG9zaXRpb24sIHRoaW5nOiBzb3VyY2UgfSA9IHBvc2l0aW9uZWRTb3VyY2VcclxuICAgICAgICBpZiAoc291cmNlLmxpZ2h0UmFkaXVzIDw9IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDg7ICsraSkge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2libGVPY3RhbnRMaWdodFNvdXJjZShwb3NpdGlvbiwgc291cmNlLmxpZ2h0UmFkaXVzLCBpKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMudmlzaWJpbGl0eUF0KHBvc2l0aW9uKSA9PSBWaXNpYmlsaXR5LkRhcmspIHtcclxuICAgICAgICAgICAgdGhpcy52aXNpYmxlLnNldFBvaW50KHBvc2l0aW9uLCBWaXNpYmlsaXR5LlZpc2libGUpXHJcbiAgICAgICAgICAgIHRoaXMuc2Vlbi5zZXRQb2ludChwb3NpdGlvbiwgdHJ1ZSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVWaXNpYmxlT2N0YW50TGlnaHRTb3VyY2UoZXllOiBnZW8uUG9pbnQsIHJhZGl1czogbnVtYmVyLCBvY3RhbnQ6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IHNoYWRvd3M6IGdlby5Qb2ludFtdID0gW11cclxuXHJcbiAgICAgICAgLy8gZm9yIGxpZ2h0IHNvdXJjZSwgc2hvdWxkIG9ubHkgbGlnaHQgZGFya2VuZWQgc3F1YXJlc1xyXG4gICAgICAgIGZvciAobGV0IHkgPSAxOyB5IDw9IHJhZGl1czsgKyt5KSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHggPSAwOyB4IDw9IHk7ICsreCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgb2N0YW50UG9pbnQgPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgbWFwUG9pbnQgPSB0cmFuc2Zvcm1PY3RhbnQob2N0YW50UG9pbnQsIG9jdGFudCkuYWRkUG9pbnQoZXllKVxyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmluQm91bmRzKG1hcFBvaW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGlzU2hhZG93ZWQoc2hhZG93cywgb2N0YW50UG9pbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBvcGFxdWUgPSBpdGVyLmFueSh0aGlzLmF0KG1hcFBvaW50KSwgdGggPT4gIXRoLnRyYW5zcGFyZW50KVxyXG4gICAgICAgICAgICAgICAgaWYgKG9wYXF1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNoYWRvd3MucHVzaChvY3RhbnRQb2ludClcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZ2VvLmNhbGNNYW5oYXR0ZW5EaXN0KG1hcFBvaW50LCBleWUpID4gcmFkaXVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy52aXNpYmlsaXR5QXQobWFwUG9pbnQpID09PSBWaXNpYmlsaXR5LkRhcmspIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpc2libGUuc2V0KG1hcFBvaW50LngsIG1hcFBvaW50LnksIFZpc2liaWxpdHkuVmlzaWJsZSlcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlZW4uc2V0UG9pbnQobWFwUG9pbnQsIHRydWUpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qXHJcbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVWaXNpYmlsaXR5KG1hcDogTWFwLCByYWRpdXM6IG51bWJlcikge1xyXG4gICAgcmVzZXRWaXNpYmlsaXR5KG1hcClcclxuXHJcbiAgICBjb25zdCBleWUgPSBtYXAucGxheWVyLnBvc2l0aW9uXHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCA4OyArK2kpIHtcclxuICAgICAgICB1cGRhdGVWaXNpYmlsaXR5T2N0YW50KG1hcCwgZXllLCByYWRpdXMsIGkpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gZXllIHBvaW50IGFsd2F5cyB2aXNpYmxlXHJcbiAgICBpdGVyLmVhY2gobWFwLmF0KGV5ZSksIHRoID0+IHRoLnZpc2libGUgPSBybC5WaXNpYmlsaXR5LlZpc2libGUpXHJcblxyXG4gICAgLy8gcHJvY2VzcyBvdGhlciBsaWdodCBzb3VyY2VzXHJcbiAgICBwcm9jZXNzTGlnaHRTb3VyY2VzKG1hcClcclxufVxyXG5cclxuZnVuY3Rpb24gcHJvY2Vzc0xpZ2h0U291cmNlcyhtYXA6IE1hcCkge1xyXG4gICAgLy8gaGF2ZSB3ZSB1bmNvdmVyZWQgb3RoZXIgbGlnaHQgc291cmNlcz9cclxuICAgIC8vIG5lZWQgYSB3YXkgdG8gZXZhbHVhdGUgTE9TIC0gbm90IEpVU1QgdmlzaWJsZSFcclxuICAgIGNvbnN0IGxpZ2h0cyA9IG5ldyBTZXQoaXRlci5maWx0ZXIobWFwLmZpeHR1cmVzLCB4ID0+IHgudGhpbmcubGlnaHRSYWRpdXMgPiAwICYmICkpXHJcblxyXG4gICAgd2hpbGUgKGxpZ2h0cy5zaXplID4gMCkge1xyXG4gICAgICAgIGNvbnN0IGxpZ2h0ID0gaXRlci5maW5kKGxpZ2h0cywgbCA9PiBsLnRoaW5nLnZpc2libGUgPT0gcmwuVmlzaWJpbGl0eS5WaXNpYmxlKVxyXG4gICAgICAgIGlmICghbGlnaHQpIHtcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxpZ2h0cy5kZWxldGUobGlnaHQpXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgODsgKytpKSB7XHJcbiAgICAgICAgICAgIHVwZGF0ZVZpc2liaWxpdHlPY3RhbnQobWFwLCBsaWdodC5wb3NpdGlvbiwgbGlnaHQudGhpbmcubGlnaHRSYWRpdXMsIGkpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwcm9jZXNzTGlnaHRTb3VyY2Uoc291cmNlOiBybC5GaXh0dXJlKSB7XHJcbiAgICBpZiAoc291cmNlLmxpZ2h0UmFkaXVzIDw9IDApIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVWaXNpYmlsaXR5T2N0YW50KG1hcDogTWFwLCBleWU6IGdlby5Qb2ludCwgcmFkaXVzOiBudW1iZXIsIG9jdGFudDogbnVtYmVyKSB7XHJcbiAgICBjb25zdCBzaGFkb3dzOiBnZW8uUG9pbnRbXSA9IFtdXHJcblxyXG4gICAgZm9yIChsZXQgeSA9IDE7IHkgPD0gcmFkaXVzOyArK3kpIHtcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8PSB5OyArK3gpIHtcclxuICAgICAgICAgICAgY29uc3Qgb2N0YW50UG9pbnQgPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcblxyXG4gICAgICAgICAgICBjb25zdCBtYXBQb2ludCA9IHRyYW5zZm9ybU9jdGFudChvY3RhbnRQb2ludCwgb2N0YW50KS5hZGRQb2ludChleWUpXHJcbiAgICAgICAgICAgIGlmICghbWFwLmluQm91bmRzKG1hcFBvaW50KSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGlzU2hhZG93ZWQoc2hhZG93cywgb2N0YW50UG9pbnQpKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBvcGFxdWUgPSBpdGVyLmFueShtYXAuYXQobWFwUG9pbnQpLCB0aCA9PiAhdGgudHJhbnNwYXJlbnQpXHJcbiAgICAgICAgICAgIGlmIChvcGFxdWUpIHtcclxuICAgICAgICAgICAgICAgIHNoYWRvd3MucHVzaChvY3RhbnRQb2ludClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGdlby5jYWxjTWFuaGF0dGVuRGlzdChtYXBQb2ludCwgZXllKSA+IHJhZGl1cykge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yIChjb25zdCB0aCBvZiBtYXAuYXQobWFwUG9pbnQpKSB7XHJcbiAgICAgICAgICAgICAgICB0aC52aXNpYmxlID0gVmlzaWJpbGl0eS5WaXNpYmxlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuKi9cclxuXHJcbmZ1bmN0aW9uIHRyYW5zZm9ybU9jdGFudChjb29yZHM6IGdlby5Qb2ludCwgb2N0YW50OiBudW1iZXIpOiBnZW8uUG9pbnQge1xyXG4gICAgc3dpdGNoIChvY3RhbnQpIHtcclxuICAgICAgICBjYXNlIDA6IHJldHVybiBuZXcgZ2VvLlBvaW50KC1jb29yZHMueCwgY29vcmRzLnkpXHJcbiAgICAgICAgY2FzZSAxOiByZXR1cm4gbmV3IGdlby5Qb2ludCgtY29vcmRzLnksIGNvb3Jkcy54KVxyXG4gICAgICAgIGNhc2UgMjogcmV0dXJuIG5ldyBnZW8uUG9pbnQoY29vcmRzLnksIGNvb3Jkcy54KVxyXG4gICAgICAgIGNhc2UgMzogcmV0dXJuIG5ldyBnZW8uUG9pbnQoY29vcmRzLngsIGNvb3Jkcy55KVxyXG4gICAgICAgIGNhc2UgNDogcmV0dXJuIG5ldyBnZW8uUG9pbnQoY29vcmRzLngsIC1jb29yZHMueSlcclxuICAgICAgICBjYXNlIDU6IHJldHVybiBuZXcgZ2VvLlBvaW50KGNvb3Jkcy55LCAtY29vcmRzLngpXHJcbiAgICAgICAgY2FzZSA2OiByZXR1cm4gbmV3IGdlby5Qb2ludCgtY29vcmRzLnksIC1jb29yZHMueClcclxuICAgICAgICBjYXNlIDc6IHJldHVybiBuZXcgZ2VvLlBvaW50KC1jb29yZHMueCwgLWNvb3Jkcy55KVxyXG4gICAgfVxyXG5cclxuICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgb2N0YW50IC0gbXVzdCBiZSBpbiBpbnRlcnZhbCBbMCwgOClcIilcclxufVxyXG5cclxuZnVuY3Rpb24gaXNTaGFkb3dlZChzaGFkb3dzOiBnZW8uUG9pbnRbXSwgY29vcmRzOiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBpdGVyLmFueShzaGFkb3dzLCB4ID0+IHNoYWRvd0NvdmVyc1BvaW50KHgsIGNvb3JkcykpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNoYWRvd0NvdmVyc1BvaW50KHNoYWRvdzogZ2VvLlBvaW50LCBjb29yZHM6IGdlby5Qb2ludCk6IGJvb2xlYW4ge1xyXG4gICAgaWYgKHNoYWRvdy54ID09IDApIHtcclxuICAgICAgICByZXR1cm4gY29vcmRzLnkgPiBzaGFkb3cueVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHN0YXJ0WCA9IHNoYWRvdy54IC8gKHNoYWRvdy55ICsgMSkgKiBjb29yZHMueVxyXG4gICAgY29uc3QgZW5kWCA9IChzaGFkb3cueCArIDEpIC8gc2hhZG93LnkgKiBjb29yZHMueVxyXG5cclxuICAgIHJldHVybiBjb29yZHMueSA+IHNoYWRvdy55ICYmIGNvb3Jkcy54ID4gc3RhcnRYICYmIGNvb3Jkcy54IDwgZW5kWFxyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIEZpbmQgYSBwYXRoIGZyb20gc3RhcnQgdG8gZ29hbFxyXG4gKiBAcGFyYW0gbWFwIG1hcFxyXG4gKiBAcGFyYW0gc3RhcnQgc3RhcnQgY29vcmRzXHJcbiAqIEBwYXJhbSBnb2FsIGdvYWwgY29vcmRzXHJcbiAqIEByZXR1cm5zIHBhdGggZnJvbSBzdGFydCB0byBnb2FsLCBpbmNsdWRpbmcgZ29hbCwgYnV0IG5vdCBzdGFydGluZyBwb3NpdGlvblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRQYXRoKG1hcDogTWFwLCBzdGFydDogZ2VvLlBvaW50LCBnb2FsOiBnZW8uUG9pbnQpOiBBcnJheTxnZW8uUG9pbnQ+IHtcclxuICAgIGludGVyZmFjZSBOb2RlIHtcclxuICAgICAgICBmOiBudW1iZXJcclxuICAgICAgICBnOiBudW1iZXJcclxuICAgICAgICBoOiBudW1iZXJcclxuICAgICAgICBwYXJlbnQ6IE5vZGUgfCBudWxsXHJcbiAgICAgICAgY29vcmRzOiBnZW8uUG9pbnRcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBvcGVuID0gbmV3IEFycmF5PE5vZGU+KClcclxuICAgIGNvbnN0IGNsb3NlZCA9IG5ldyBBcnJheTxOb2RlPigpXHJcblxyXG4gICAgb3Blbi5wdXNoKHsgZjogMCwgZzogMCwgaDogMCwgcGFyZW50OiBudWxsLCBjb29yZHM6IHN0YXJ0IH0pXHJcblxyXG4gICAgY29uc3QgcG9wT3BlbiA9ICgpID0+IHtcclxuICAgICAgICAvLyB3YXJuaW5nOiBhc3N1bWVzIG5vbi1lbXB0eSFcclxuICAgICAgICBsZXQgbiA9IDBcclxuICAgICAgICBvcGVuLmZvckVhY2goKHgsIGkpID0+IHtcclxuICAgICAgICAgICAgaWYgKHguZiA8IG9wZW5bbl0uZikge1xyXG4gICAgICAgICAgICAgICAgbiA9IGlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIC8vIHN3YXAgJiBwb3BcclxuICAgICAgICBjb25zdCByID0gb3BlbltuXVxyXG5cclxuICAgICAgICBpZiAobiA8IG9wZW4ubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICBvcGVuW25dID0gb3BlbltvcGVuLmxlbmd0aCAtIDFdXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBvcGVuLnBvcCgpXHJcblxyXG4gICAgICAgIHJldHVybiByXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYXNzZW1ibGVQYXRoID0gKG5vZGU6IE5vZGUgfCBudWxsKTogQXJyYXk8Z2VvLlBvaW50PiA9PiB7XHJcbiAgICAgICAgLy8gcGF0aCBmb3VuZCEgYmFja3RyYWNrIGFuZCBhc3NlbWJsZSBwYXRoXHJcbiAgICAgICAgY29uc3QgcGF0aCA9IG5ldyBBcnJheTxnZW8uUG9pbnQ+KClcclxuXHJcbiAgICAgICAgd2hpbGUgKG5vZGUgJiYgIW5vZGUuY29vcmRzLmVxdWFsKHN0YXJ0KSkge1xyXG4gICAgICAgICAgICBwYXRoLnB1c2gobm9kZS5jb29yZHMpXHJcbiAgICAgICAgICAgIG5vZGUgPSBub2RlLnBhcmVudFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHBhdGgucmV2ZXJzZSgpXHJcbiAgICB9XHJcblxyXG4gICAgd2hpbGUgKG9wZW4ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnN0IGN1ciA9IHBvcE9wZW4oKVxyXG4gICAgICAgIGNsb3NlZC5wdXNoKGN1cilcclxuXHJcbiAgICAgICAgaWYgKGN1ci5jb29yZHMuZXF1YWwoZ29hbCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFzc2VtYmxlUGF0aChjdXIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGNvb3JkcyBvZiB2aXNpdE5laWdoYm9ycyhjdXIuY29vcmRzLCBtYXAud2lkdGgsIG1hcC5oZWlnaHQpKSB7XHJcbiAgICAgICAgICAgIGlmICghbWFwLmlzUGFzc2FibGUoY29vcmRzKSAmJiAhY29vcmRzLmVxdWFsKGdvYWwpKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoY2xvc2VkLmZpbmQoeCA9PiBjb29yZHMuZXF1YWwoeC5jb29yZHMpKSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgZyA9IGN1ci5nICsgMVxyXG4gICAgICAgICAgICBjb25zdCBoID0gZ2VvLmNhbGNNYW5oYXR0ZW5EaXN0KGdvYWwsIGNvb3JkcylcclxuICAgICAgICAgICAgY29uc3QgZiA9IGcgKyBoXHJcblxyXG4gICAgICAgICAgICAvLyBkb2VzIHRoaXMgbm9kZSBhbHJlYWR5IGV4aXN0IGluIG9wZW4gbGlzdD9cclxuICAgICAgICAgICAgY29uc3Qgb3Blbk5vZGUgPSBvcGVuLmZpbmQoeCA9PiBjb29yZHMuZXF1YWwoeC5jb29yZHMpKVxyXG4gICAgICAgICAgICBpZiAob3Blbk5vZGUgIT0gbnVsbCAmJiBvcGVuTm9kZS5nIDw9IGcpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIHBsYWNlIGluIG9wZW4gbGlzdFxyXG4gICAgICAgICAgICBvcGVuLnB1c2goeyBnOiBnLCBoOiBoLCBmOiBmLCBwYXJlbnQ6IGN1ciwgY29vcmRzOiBjb29yZHMgfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5ldyBBcnJheTxnZW8uUG9pbnQ+KCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uKiB2aXNpdE5laWdoYm9ycyhwdDogZ2VvLlBvaW50LCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IEl0ZXJhYmxlPGdlby5Qb2ludD4ge1xyXG4gICAgaWYgKHB0LnggPCAwIHx8IHB0LnkgPCAwIHx8IHB0LnggPj0gd2lkdGggfHwgcHQueSA+PSBoZWlnaHQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwdCBpcyBvdXQgb2YgYm91bmRzXCIpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gd1xyXG4gICAgaWYgKHB0LnggPiAwKSB7XHJcbiAgICAgICAgY29uc3QgdyA9IG5ldyBnZW8uUG9pbnQocHQueCAtIDEsIHB0LnkpXHJcbiAgICAgICAgeWllbGQgd1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHNcclxuICAgIGlmIChwdC55IDwgaGVpZ2h0IC0gMSkge1xyXG4gICAgICAgIGNvbnN0IHMgPSBuZXcgZ2VvLlBvaW50KHB0LngsIHB0LnkgKyAxKVxyXG4gICAgICAgIHlpZWxkIHNcclxuICAgIH1cclxuXHJcbiAgICAvLyBlXHJcbiAgICBpZiAocHQueCA8IHdpZHRoIC0gMSkge1xyXG4gICAgICAgIGNvbnN0IGUgPSBuZXcgZ2VvLlBvaW50KHB0LnggKyAxLCBwdC55KVxyXG4gICAgICAgIHlpZWxkIGVcclxuICAgIH1cclxuXHJcbiAgICAvLyBuXHJcbiAgICBpZiAocHQueSA+IDApIHtcclxuICAgICAgICBjb25zdCBuID0gbmV3IGdlby5Qb2ludChwdC54LCBwdC55IC0gMSlcclxuICAgICAgICB5aWVsZCBuXHJcbiAgICB9XHJcbn1cclxuIl19