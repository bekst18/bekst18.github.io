import * as geo from "../shared/geo2d.js";
import * as iter from "../shared/iter.js";
import * as grid from "../shared/grid.js";
export var Visibility;
(function (Visibility) {
    Visibility[Visibility["None"] = 0] = "None";
    Visibility[Visibility["Fog"] = 1] = "Fog";
    Visibility[Visibility["Dark"] = 2] = "Dark";
    Visibility[Visibility["Visible"] = 3] = "Visible";
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
        // process each light source, lighting any tile that is marked as dark
        const sources = iter.filter(this.fixtures, f => f.thing.lightRadius > 0);
        for (const source of sources) {
            this.processLightSource(source);
        }
    }
    clearVisible() {
        for (let i = 0; i < this.visible.size; ++i) {
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
                    this.visible.set(mapPoint.x, mapPoint.y, Visibility.Dark);
                    continue;
                }
                this.visible.set(mapPoint.x, mapPoint.y, Visibility.Visible);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hcHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBRXpDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFFekMsTUFBTSxDQUFOLElBQVksVUFLWDtBQUxELFdBQVksVUFBVTtJQUNsQiwyQ0FBSSxDQUFBO0lBQ0oseUNBQUcsQ0FBQTtJQUNILDJDQUFJLENBQUE7SUFDSixpREFBTyxDQUFBO0FBQ1gsQ0FBQyxFQUxXLFVBQVUsS0FBVixVQUFVLFFBS3JCO0FBdUJEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxRQUFRO0lBQXJCO1FBQ3FCLFFBQUcsR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLEVBQWdCLENBQUE7SUFrRXpELENBQUM7SUFoRUcsMEJBQTBCO0lBQzFCLHlEQUF5RDtJQUN6RCxHQUFHLENBQUMsUUFBbUIsRUFBRSxLQUFRO1FBQzdCLFFBQVEsR0FBRyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFM0IsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUMvRSxJQUFJLEVBQUUsRUFBRTtZQUNKLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtTQUM1QjtRQUVELElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFRCxNQUFNLENBQUMsS0FB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RUEyRUU7QUFFRixTQUFTLGVBQWUsQ0FBQyxNQUFpQixFQUFFLE1BQWM7SUFDdEQsUUFBUSxNQUFNLEVBQUU7UUFDWixLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakQsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pELEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEQsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakQsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pELEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xELEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMs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QUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsQ0FBQTtLQUNWO0lBRUQsSUFBSTtJQUNKLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDVixNQUFNLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxDQUFBO0tBQ1Y7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvMmQuanNcIlxyXG5pbXBvcnQgKiBhcyBpdGVyIGZyb20gXCIuLi9zaGFyZWQvaXRlci5qc1wiXHJcbmltcG9ydCAqIGFzIHJsIGZyb20gXCIuL3JsLmpzXCJcclxuaW1wb3J0ICogYXMgZ3JpZCBmcm9tIFwiLi4vc2hhcmVkL2dyaWQuanNcIlxyXG5cclxuZXhwb3J0IGVudW0gVmlzaWJpbGl0eSB7XHJcbiAgICBOb25lLFxyXG4gICAgRm9nLFxyXG4gICAgRGFyayxcclxuICAgIFZpc2libGVcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQbGFjZWQ8VCBleHRlbmRzIHJsLlRoaW5nPiB7XHJcbiAgICB0aGluZzogVCxcclxuICAgIHBvc2l0aW9uOiBnZW8uUG9pbnQsXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBhIGxheWVyIG9mIHRoaW5ncyBvbiBhIG1hcFxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBMYXllcjxUIGV4dGVuZHMgcmwuVGhpbmc+IHtcclxuICAgIHNldChwb3NpdGlvbjogZ2VvLlBvaW50LCB0aGluZzogVCk6IHZvaWRcclxuICAgIGRlbGV0ZSh0aGluZzogVCk6IHZvaWRcclxuICAgIGhhcyh0aGluZzogVCk6IGJvb2xlYW5cclxuICAgIGF0KHBvc2l0aW9uOiBnZW8uUG9pbnQpOiBUIHwgdW5kZWZpbmVkXHJcbiAgICB3aXRoaW4oYWFiYjogZ2VvLkFBQkIpOiBHZW5lcmF0b3I8UGxhY2VkPFQ+PixcclxuICAgIHRoaW5nc1dpdGhpbihhYWJiOiBnZW8uQUFCQik6IEdlbmVyYXRvcjxUPixcclxuICAgIHdoZXJlKHRoaW5nOiBUKTogZ2VvLlBvaW50IHwgdW5kZWZpbmVkLFxyXG4gICAgc2l6ZTogbnVtYmVyXHJcbiAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBHZW5lcmF0b3I8UGxhY2VkPFQ+PlxyXG4gICAgdGhpbmdzKCk6IEdlbmVyYXRvcjxUPlxyXG59XHJcblxyXG4vKipcclxuICogYSBsYXllciB0aGF0IGlzIGJhc2VkIG9uIGEgbWFwXHJcbiAqIHdvcmtzIHdlbGwgZm9yIHNwYXJzZSBsYXllcnNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBNYXBMYXllcjxUIGV4dGVuZHMgcmwuVGhpbmc+IGltcGxlbWVudHMgTGF5ZXI8VD4ge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtYXAgPSBuZXcgd2luZG93Lk1hcDxULCBQbGFjZWQ8VD4+KClcclxuXHJcbiAgICAvLyB0aGlzIGlzbid0IHF1aXRlIHJpZ2h0IVxyXG4gICAgLy8gbmVlZCB0byByZW1vdmUgYW55IG9sZCBpdGVtIGF0IHRoZSBzcGVjaWZpZWQgcG9zaXRpb24hXHJcbiAgICBzZXQocG9zaXRpb246IGdlby5Qb2ludCwgdGhpbmc6IFQpOiB2b2lkIHtcclxuICAgICAgICBwb3NpdGlvbiA9IHBvc2l0aW9uLmNsb25lKClcclxuXHJcbiAgICAgICAgbGV0IHRoID0gaXRlci53cmFwKHRoaXMubWFwLnZhbHVlcygpKS5maW5kKHB0aCA9PiBwdGgucG9zaXRpb24uZXF1YWwocG9zaXRpb24pKVxyXG4gICAgICAgIGlmICh0aCkge1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5kZWxldGUodGgudGhpbmcpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1hcC5zZXQodGhpbmcsIHsgdGhpbmcsIHBvc2l0aW9uIH0pXHJcbiAgICB9XHJcblxyXG4gICAgZGVsZXRlKHRoaW5nOiBUKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5tYXAuZGVsZXRlKHRoaW5nKVxyXG4gICAgfVxyXG5cclxuICAgIGhhcyh0aGluZzogVCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1hcC5oYXModGhpbmcpXHJcbiAgICB9XHJcblxyXG4gICAgYXQocG9zaXRpb246IGdlby5Qb2ludCk6IFQgfCB1bmRlZmluZWQge1xyXG4gICAgICAgIGZvciAoY29uc3QgcHRoIG9mIHRoaXMubWFwLnZhbHVlcygpKSB7XHJcbiAgICAgICAgICAgIGlmIChwdGgucG9zaXRpb24uZXF1YWwocG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHRoLnRoaW5nXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB1bmRlZmluZWRcclxuICAgIH1cclxuXHJcbiAgICB3aGVyZSh0aGluZzogVCk6IGdlby5Qb2ludCB8IHVuZGVmaW5lZCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwLmdldCh0aGluZyk/LnBvc2l0aW9uPy5jbG9uZSgpXHJcbiAgICB9XHJcblxyXG4gICAgKndpdGhpbihhYWJiOiBnZW8uQUFCQik6IEdlbmVyYXRvcjxQbGFjZWQ8VD4+IHtcclxuICAgICAgICBmb3IgKGNvbnN0IHB0aCBvZiB0aGlzLm1hcC52YWx1ZXMoKSkge1xyXG4gICAgICAgICAgICBpZiAoYWFiYi5jb250YWlucyhwdGgucG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgICAgICB5aWVsZCBwdGhcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBnZXQgc2l6ZSgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAuc2l6ZVxyXG4gICAgfVxyXG5cclxuICAgICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBHZW5lcmF0b3I8UGxhY2VkPFQ+PiB7XHJcbiAgICAgICAgZm9yIChjb25zdCB2YWx1ZSBvZiB0aGlzLm1hcC52YWx1ZXMoKSkge1xyXG4gICAgICAgICAgICB5aWVsZCB2YWx1ZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAqdGhpbmdzKCk6IEdlbmVyYXRvcjxUPiB7XHJcbiAgICAgICAgZm9yIChjb25zdCB0aCBvZiB0aGlzLm1hcC5rZXlzKCkpIHtcclxuICAgICAgICAgICAgeWllbGQgdGhcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgKnRoaW5nc1dpdGhpbihhYWJiOiBnZW8uQUFCQik6IEdlbmVyYXRvcjxUPiB7XHJcbiAgICAgICAgZm9yIChjb25zdCBwdGggb2YgdGhpcy53aXRoaW4oYWFiYikpIHtcclxuICAgICAgICAgICAgeWllbGQgcHRoLnRoaW5nXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogYSBsYXllciB0aGF0IGlzIGJhc2VkIG9uIGEgZ3JpZFxyXG4gKiB3b3JrcyB3ZWxsIGZvciBkZW5zZSBsYXllcnNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBHcmlkTGF5ZXI8VCBleHRlbmRzIHJsLlRoaW5nPiBpbXBsZW1lbnRzIExheWVyPFQ+IHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbWFwID0gbmV3IE1hcExheWVyPFQ+KClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZ3JkOiBncmlkLkdyaWQ8VCB8IHVuZGVmaW5lZD5cclxuXHJcbiAgICBjb25zdHJ1Y3Rvcih3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMuZ3JkID0gZ3JpZC5nZW5lcmF0ZSh3aWR0aCwgaGVpZ2h0LCAoKSA9PiB1bmRlZmluZWQpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHdpZHRoKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmdyZC53aWR0aFxyXG4gICAgfVxyXG5cclxuICAgIGdldCBoZWlnaHQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZ3JkLmhlaWdodFxyXG4gICAgfVxyXG5cclxuICAgIHNldChwb3NpdGlvbjogZ2VvLlBvaW50LCB0aGluZzogVCk6IHZvaWQge1xyXG4gICAgICAgIC8vIHJlbW92ZSBmcm9tIGdyaWQgaWYgYWxyZWFkeSBwcmVzZW50XHJcbiAgICAgICAgY29uc3Qgb2xkUG9zaXRpb24gPSB0aGlzLm1hcC53aGVyZSh0aGluZylcclxuICAgICAgICBpZiAob2xkUG9zaXRpb24pIHtcclxuICAgICAgICAgICAgdGhpcy5ncmQuc2V0UG9pbnQob2xkUG9zaXRpb24sIHVuZGVmaW5lZClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZ3JkLnNldFBvaW50KHBvc2l0aW9uLCB0aGluZylcclxuICAgICAgICB0aGlzLm1hcC5zZXQocG9zaXRpb24sIHRoaW5nKVxyXG4gICAgfVxyXG5cclxuICAgIGRlbGV0ZSh0aGluZzogVCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHBvcyA9IHRoaXMubWFwLndoZXJlKHRoaW5nKVxyXG4gICAgICAgIGlmICghcG9zKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5ncmQuc2V0UG9pbnQocG9zLCB1bmRlZmluZWQpXHJcbiAgICAgICAgdGhpcy5tYXAuZGVsZXRlKHRoaW5nKVxyXG4gICAgfVxyXG5cclxuICAgIGhhcyhpdGVtOiBUKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwLmhhcyhpdGVtKVxyXG4gICAgfVxyXG5cclxuICAgIGF0KHBvc2l0aW9uOiBnZW8uUG9pbnQpOiBUIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5ncmQuYXRQb2ludChwb3NpdGlvbilcclxuICAgIH1cclxuXHJcbiAgICB3aGVyZSh0aGluZzogVCk6IGdlby5Qb2ludCB8IHVuZGVmaW5lZCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwLndoZXJlKHRoaW5nKVxyXG4gICAgfVxyXG5cclxuICAgICp3aXRoaW4oYWFiYjogZ2VvLkFBQkIpOiBHZW5lcmF0b3I8UGxhY2VkPFQ+PiB7XHJcbiAgICAgICAgZm9yIChjb25zdCBbdGhpbmcsIHgsIHldIG9mIHRoaXMuZ3JkLnNjYW5BQUJCKGFhYmIpKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpbmcpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHlpZWxkIHtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBuZXcgZ2VvLlBvaW50KHgsIHkpLFxyXG4gICAgICAgICAgICAgICAgdGhpbmcsXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgKnRoaW5nc1dpdGhpbihhYWJiOiBnZW8uQUFCQik6IEdlbmVyYXRvcjxUPiB7XHJcbiAgICAgICAgZm9yIChjb25zdCBwdGggb2YgdGhpcy53aXRoaW4oYWFiYikpIHtcclxuICAgICAgICAgICAgeWllbGQgcHRoLnRoaW5nXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBzaXplKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1hcC5zaXplXHJcbiAgICB9XHJcblxyXG4gICAgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEdlbmVyYXRvcjxQbGFjZWQ8VD4+IHtcclxuICAgICAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIHRoaXMubWFwKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHZhbHVlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaW5ncygpOiBHZW5lcmF0b3I8VD4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1hcC50aGluZ3MoKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZW51bSBMaWdodGluZyB7XHJcbiAgICBOb25lLFxyXG4gICAgQW1iaWVudCxcclxufVxyXG5cclxuLyoqXHJcbiAqIGNvbXBvbmVudHMgb2YgYSBnZW5lcmF0ZWQgbWFwIGFyZWFcclxuICovXHJcbmV4cG9ydCBjbGFzcyBNYXAge1xyXG4gICAgdGlsZXM6IExheWVyPHJsLlRpbGU+XHJcbiAgICB2aXNpYmxlOiBncmlkLkdyaWQ8VmlzaWJpbGl0eT5cclxuICAgIGZpeHR1cmVzOiBMYXllcjxybC5GaXh0dXJlPlxyXG4gICAgZXhpdHM6IExheWVyPHJsLkV4aXQ+XHJcbiAgICBtb25zdGVyczogTGF5ZXI8cmwuTW9uc3Rlcj5cclxuICAgIGNvbnRhaW5lcnM6IExheWVyPHJsLkNvbnRhaW5lcj5cclxuICAgIGxpZ2h0aW5nOiBMaWdodGluZyA9IExpZ2h0aW5nLk5vbmVcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihyZWFkb25seSB3aWR0aDogbnVtYmVyLCByZWFkb25seSBoZWlnaHQ6IG51bWJlciwgcmVhZG9ubHkgZGVwdGg6IG51bWJlciwgcmVhZG9ubHkgcGxheWVyOiBQbGFjZWQ8cmwuUGxheWVyPikge1xyXG4gICAgICAgIHRoaXMudGlsZXMgPSBuZXcgR3JpZExheWVyKHdpZHRoLCBoZWlnaHQpXHJcbiAgICAgICAgdGhpcy52aXNpYmxlID0gZ3JpZC5nZW5lcmF0ZSh3aWR0aCwgaGVpZ2h0LCBfID0+IFZpc2liaWxpdHkuTm9uZSlcclxuICAgICAgICB0aGlzLmZpeHR1cmVzID0gbmV3IE1hcExheWVyKClcclxuICAgICAgICB0aGlzLmV4aXRzID0gbmV3IE1hcExheWVyKClcclxuICAgICAgICB0aGlzLm1vbnN0ZXJzID0gbmV3IE1hcExheWVyKClcclxuICAgICAgICB0aGlzLmNvbnRhaW5lcnMgPSBuZXcgTWFwTGF5ZXIoKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICAqIGl0ZXJhdGUgb3ZlciBhbGwgdGhpbmdzIGluIG1hcFxyXG4gICAgKi9cclxuICAgIHB1YmxpYyAqW1N5bWJvbC5pdGVyYXRvcl0oKTogR2VuZXJhdG9yPFBsYWNlZDxybC5UaGluZz4+IHtcclxuICAgICAgICBmb3IgKGNvbnN0IHRpbGUgb2YgdGhpcy50aWxlcykge1xyXG4gICAgICAgICAgICB5aWVsZCB0aWxlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGZpeHR1cmUgb2YgdGhpcy5maXh0dXJlcykge1xyXG4gICAgICAgICAgICB5aWVsZCBmaXh0dXJlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgdGhpcy5leGl0cykge1xyXG4gICAgICAgICAgICB5aWVsZCBleGl0XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGNvbnRhaW5lciBvZiB0aGlzLmNvbnRhaW5lcnMpIHtcclxuICAgICAgICAgICAgeWllbGQgY29udGFpbmVyXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IG1vbnN0ZXIgb2YgdGhpcy5tb25zdGVycykge1xyXG4gICAgICAgICAgICB5aWVsZCBtb25zdGVyXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB5aWVsZCB0aGlzLnBsYXllclxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogaXRlcmF0ZSBvdmVyIGFsbCB0aGluZ3MgaW4gbWFwXHJcbiAgICovXHJcbiAgICBwdWJsaWMgKnRoaW5ncygpOiBHZW5lcmF0b3I8cmwuVGhpbmc+IHtcclxuICAgICAgICBmb3IgKGNvbnN0IHB0aCBvZiB0aGlzKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHB0aC50aGluZ1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aWxlQXQoeHk6IGdlby5Qb2ludCk6IHJsLlRpbGUgfCB1bmRlZmluZWQge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnRpbGVzLmF0KHh5KVxyXG4gICAgfVxyXG5cclxuICAgIGZpeHR1cmVBdCh4eTogZ2VvLlBvaW50KTogcmwuRml4dHVyZSB8IHVuZGVmaW5lZCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZml4dHVyZXMuYXQoeHkpXHJcbiAgICB9XHJcblxyXG4gICAgY29udGFpbmVyQXQoeHk6IGdlby5Qb2ludCk6IHJsLkNvbnRhaW5lciB8IHVuZGVmaW5lZCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29udGFpbmVycy5hdCh4eSlcclxuICAgIH1cclxuXHJcbiAgICBtb25zdGVyQXQoeHk6IGdlby5Qb2ludCk6IHJsLk1vbnN0ZXIgfCB1bmRlZmluZWQge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1vbnN0ZXJzLmF0KHh5KVxyXG4gICAgfVxyXG5cclxuICAgIHZpc2liaWxpdHlBdCh4eTogZ2VvLlBvaW50KTogVmlzaWJpbGl0eSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMudmlzaWJsZS5hdFBvaW50KHh5KVxyXG4gICAgfVxyXG5cclxuICAgICphdCh4eTogZ2VvLlBvaW50KTogR2VuZXJhdG9yPHJsLk1vbnN0ZXIgfCBybC5GaXh0dXJlIHwgcmwuVGlsZT4ge1xyXG4gICAgICAgIGNvbnN0IGZpeHR1cmUgPSB0aGlzLmZpeHR1cmVBdCh4eSlcclxuICAgICAgICBpZiAoZml4dHVyZSkge1xyXG4gICAgICAgICAgICB5aWVsZCBmaXh0dXJlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB0aWxlID0gdGhpcy50aWxlQXQoeHkpXHJcbiAgICAgICAgaWYgKHRpbGUpIHtcclxuICAgICAgICAgICAgeWllbGQgdGlsZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5jb250YWluZXJBdCh4eSlcclxuICAgICAgICBpZiAoY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIGNvbnRhaW5lclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbW9uc3RlciA9IHRoaXMubW9uc3RlckF0KHh5KVxyXG4gICAgICAgIGlmIChtb25zdGVyKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIG1vbnN0ZXJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnBsYXllci5wb3NpdGlvbi5lcXVhbCh4eSkpIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpcy5wbGF5ZXIudGhpbmdcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaW5Cb3VuZHMoeHk6IGdlby5Qb2ludCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB4eS54ID49IDAgJiYgeHkueCA8IHRoaXMud2lkdGggJiYgeHkueSA+PSAwICYmIHh5LnkgPCB0aGlzLmhlaWdodFxyXG4gICAgfVxyXG5cclxuICAgIGlzUGFzc2FibGUocG9zaXRpb246IGdlby5Qb2ludCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmluQm91bmRzKHBvc2l0aW9uKSAmJiBpdGVyLmFsbCh0aGlzLmF0KHBvc2l0aW9uKSwgdGggPT4gdGgucGFzc2FibGUpXHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlVmlzaWJsZSh2aWV3cG9ydFJhZGl1czogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhclZpc2libGUoKVxyXG4gICAgICAgIGNvbnN0IGV5ZSA9IHRoaXMucGxheWVyLnBvc2l0aW9uXHJcbiAgICAgICAgY29uc3QgbGlnaHRSYWRpdXMgPSB0aGlzLnBsYXllci50aGluZy5saWdodFJhZGl1c1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDg7ICsraSkge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2libGVPY3RhbnQoZXllLCB2aWV3cG9ydFJhZGl1cywgbGlnaHRSYWRpdXMsIGkpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnZpc2libGUuc2V0UG9pbnQoZXllLCBWaXNpYmlsaXR5LlZpc2libGUpXHJcblxyXG4gICAgICAgIC8vIHByb2Nlc3MgZWFjaCBsaWdodCBzb3VyY2UsIGxpZ2h0aW5nIGFueSB0aWxlIHRoYXQgaXMgbWFya2VkIGFzIGRhcmtcclxuICAgICAgICBjb25zdCBzb3VyY2VzID0gaXRlci5maWx0ZXIodGhpcy5maXh0dXJlcywgZiA9PiBmLnRoaW5nLmxpZ2h0UmFkaXVzID4gMClcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBzb3VyY2Ugb2Ygc291cmNlcykge1xyXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NMaWdodFNvdXJjZShzb3VyY2UpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2xlYXJWaXNpYmxlKCkge1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy52aXNpYmxlLnNpemU7ICsraSkge1xyXG4gICAgICAgICAgICB0aGlzLnZpc2libGUuc2V0ZihpLCBWaXNpYmlsaXR5Lk5vbmUpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlVmlzaWJsZU9jdGFudChleWU6IGdlby5Qb2ludCwgdmlld3BvcnRSYWRpdXM6IG51bWJlciwgbGlnaHRSYWRpdXM6IG51bWJlciwgb2N0YW50OiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBzaGFkb3dzOiBnZW8uUG9pbnRbXSA9IFtdXHJcblxyXG4gICAgICAgIGZvciAobGV0IHkgPSAxOyB5IDw9IHZpZXdwb3J0UmFkaXVzOyArK3kpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPD0geTsgKyt4KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBvY3RhbnRQb2ludCA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBtYXBQb2ludCA9IHRyYW5zZm9ybU9jdGFudChvY3RhbnRQb2ludCwgb2N0YW50KS5hZGRQb2ludChleWUpXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaW5Cb3VuZHMobWFwUG9pbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaXNTaGFkb3dlZChzaGFkb3dzLCBvY3RhbnRQb2ludCkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpc2libGUuc2V0KG1hcFBvaW50LngsIG1hcFBvaW50LnksIFZpc2liaWxpdHkuTm9uZSlcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IG9wYXF1ZSA9IGl0ZXIuYW55KHRoaXMuYXQobWFwUG9pbnQpLCB0aCA9PiAhdGgudHJhbnNwYXJlbnQpXHJcbiAgICAgICAgICAgICAgICBpZiAob3BhcXVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2hhZG93cy5wdXNoKG9jdGFudFBvaW50KVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChnZW8uY2FsY01hbmhhdHRlbkRpc3QobWFwUG9pbnQsIGV5ZSkgPiBsaWdodFJhZGl1cykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlzaWJsZS5zZXQobWFwUG9pbnQueCwgbWFwUG9pbnQueSwgVmlzaWJpbGl0eS5EYXJrKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy52aXNpYmxlLnNldChtYXBQb2ludC54LCBtYXBQb2ludC55LCBWaXNpYmlsaXR5LlZpc2libGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwcm9jZXNzTGlnaHRTb3VyY2UocG9zaXRpb25lZFNvdXJjZTogUGxhY2VkPHJsLkZpeHR1cmU+KSB7XHJcbiAgICAgICAgY29uc3QgeyBwb3NpdGlvbiwgdGhpbmc6IHNvdXJjZSB9ID0gcG9zaXRpb25lZFNvdXJjZVxyXG4gICAgICAgIGlmIChzb3VyY2UubGlnaHRSYWRpdXMgPD0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgODsgKytpKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJsZU9jdGFudExpZ2h0U291cmNlKHBvc2l0aW9uLCBzb3VyY2UubGlnaHRSYWRpdXMsIGkpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy52aXNpYmlsaXR5QXQocG9zaXRpb24pID09IFZpc2liaWxpdHkuRGFyaykge1xyXG4gICAgICAgICAgICB0aGlzLnZpc2libGUuc2V0UG9pbnQocG9zaXRpb24sIFZpc2liaWxpdHkuVmlzaWJsZSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVWaXNpYmxlT2N0YW50TGlnaHRTb3VyY2UoZXllOiBnZW8uUG9pbnQsIHJhZGl1czogbnVtYmVyLCBvY3RhbnQ6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IHNoYWRvd3M6IGdlby5Qb2ludFtdID0gW11cclxuXHJcbiAgICAgICAgLy8gZm9yIGxpZ2h0IHNvdXJjZSwgc2hvdWxkIG9ubHkgbGlnaHQgZGFya2VuZWQgc3F1YXJlc1xyXG4gICAgICAgIGZvciAobGV0IHkgPSAxOyB5IDw9IHJhZGl1czsgKyt5KSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHggPSAwOyB4IDw9IHk7ICsreCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgb2N0YW50UG9pbnQgPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgbWFwUG9pbnQgPSB0cmFuc2Zvcm1PY3RhbnQob2N0YW50UG9pbnQsIG9jdGFudCkuYWRkUG9pbnQoZXllKVxyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmluQm91bmRzKG1hcFBvaW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGlzU2hhZG93ZWQoc2hhZG93cywgb2N0YW50UG9pbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBvcGFxdWUgPSBpdGVyLmFueSh0aGlzLmF0KG1hcFBvaW50KSwgdGggPT4gIXRoLnRyYW5zcGFyZW50KVxyXG4gICAgICAgICAgICAgICAgaWYgKG9wYXF1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNoYWRvd3MucHVzaChvY3RhbnRQb2ludClcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZ2VvLmNhbGNNYW5oYXR0ZW5EaXN0KG1hcFBvaW50LCBleWUpID4gcmFkaXVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy52aXNpYmlsaXR5QXQobWFwUG9pbnQpID09PSBWaXNpYmlsaXR5LkRhcmspIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpc2libGUuc2V0KG1hcFBvaW50LngsIG1hcFBvaW50LnksIFZpc2liaWxpdHkuVmlzaWJsZSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLypcclxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVZpc2liaWxpdHkobWFwOiBNYXAsIHJhZGl1czogbnVtYmVyKSB7XHJcbiAgICByZXNldFZpc2liaWxpdHkobWFwKVxyXG5cclxuICAgIGNvbnN0IGV5ZSA9IG1hcC5wbGF5ZXIucG9zaXRpb25cclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDg7ICsraSkge1xyXG4gICAgICAgIHVwZGF0ZVZpc2liaWxpdHlPY3RhbnQobWFwLCBleWUsIHJhZGl1cywgaSlcclxuICAgIH1cclxuXHJcbiAgICAvLyBleWUgcG9pbnQgYWx3YXlzIHZpc2libGVcclxuICAgIGl0ZXIuZWFjaChtYXAuYXQoZXllKSwgdGggPT4gdGgudmlzaWJsZSA9IHJsLlZpc2liaWxpdHkuVmlzaWJsZSlcclxuXHJcbiAgICAvLyBwcm9jZXNzIG90aGVyIGxpZ2h0IHNvdXJjZXNcclxuICAgIHByb2Nlc3NMaWdodFNvdXJjZXMobWFwKVxyXG59XHJcblxyXG5mdW5jdGlvbiBwcm9jZXNzTGlnaHRTb3VyY2VzKG1hcDogTWFwKSB7XHJcbiAgICAvLyBoYXZlIHdlIHVuY292ZXJlZCBvdGhlciBsaWdodCBzb3VyY2VzP1xyXG4gICAgLy8gbmVlZCBhIHdheSB0byBldmFsdWF0ZSBMT1MgLSBub3QgSlVTVCB2aXNpYmxlIVxyXG4gICAgY29uc3QgbGlnaHRzID0gbmV3IFNldChpdGVyLmZpbHRlcihtYXAuZml4dHVyZXMsIHggPT4geC50aGluZy5saWdodFJhZGl1cyA+IDAgJiYgKSlcclxuXHJcbiAgICB3aGlsZSAobGlnaHRzLnNpemUgPiAwKSB7XHJcbiAgICAgICAgY29uc3QgbGlnaHQgPSBpdGVyLmZpbmQobGlnaHRzLCBsID0+IGwudGhpbmcudmlzaWJsZSA9PSBybC5WaXNpYmlsaXR5LlZpc2libGUpXHJcbiAgICAgICAgaWYgKCFsaWdodCkge1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGlnaHRzLmRlbGV0ZShsaWdodClcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA4OyArK2kpIHtcclxuICAgICAgICAgICAgdXBkYXRlVmlzaWJpbGl0eU9jdGFudChtYXAsIGxpZ2h0LnBvc2l0aW9uLCBsaWdodC50aGluZy5saWdodFJhZGl1cywgaSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByb2Nlc3NMaWdodFNvdXJjZShzb3VyY2U6IHJsLkZpeHR1cmUpIHtcclxuICAgIGlmIChzb3VyY2UubGlnaHRSYWRpdXMgPD0gMCkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVZpc2liaWxpdHlPY3RhbnQobWFwOiBNYXAsIGV5ZTogZ2VvLlBvaW50LCByYWRpdXM6IG51bWJlciwgb2N0YW50OiBudW1iZXIpIHtcclxuICAgIGNvbnN0IHNoYWRvd3M6IGdlby5Qb2ludFtdID0gW11cclxuXHJcbiAgICBmb3IgKGxldCB5ID0gMTsgeSA8PSByYWRpdXM7ICsreSkge1xyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDw9IHk7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCBvY3RhbnRQb2ludCA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG1hcFBvaW50ID0gdHJhbnNmb3JtT2N0YW50KG9jdGFudFBvaW50LCBvY3RhbnQpLmFkZFBvaW50KGV5ZSlcclxuICAgICAgICAgICAgaWYgKCFtYXAuaW5Cb3VuZHMobWFwUG9pbnQpKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoaXNTaGFkb3dlZChzaGFkb3dzLCBvY3RhbnRQb2ludCkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG9wYXF1ZSA9IGl0ZXIuYW55KG1hcC5hdChtYXBQb2ludCksIHRoID0+ICF0aC50cmFuc3BhcmVudClcclxuICAgICAgICAgICAgaWYgKG9wYXF1ZSkge1xyXG4gICAgICAgICAgICAgICAgc2hhZG93cy5wdXNoKG9jdGFudFBvaW50KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZ2VvLmNhbGNNYW5oYXR0ZW5EaXN0KG1hcFBvaW50LCBleWUpID4gcmFkaXVzKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHRoIG9mIG1hcC5hdChtYXBQb2ludCkpIHtcclxuICAgICAgICAgICAgICAgIHRoLnZpc2libGUgPSBWaXNpYmlsaXR5LlZpc2libGVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4qL1xyXG5cclxuZnVuY3Rpb24gdHJhbnNmb3JtT2N0YW50KGNvb3JkczogZ2VvLlBvaW50LCBvY3RhbnQ6IG51bWJlcik6IGdlby5Qb2ludCB7XHJcbiAgICBzd2l0Y2ggKG9jdGFudCkge1xyXG4gICAgICAgIGNhc2UgMDogcmV0dXJuIG5ldyBnZW8uUG9pbnQoLWNvb3Jkcy54LCBjb29yZHMueSlcclxuICAgICAgICBjYXNlIDE6IHJldHVybiBuZXcgZ2VvLlBvaW50KC1jb29yZHMueSwgY29vcmRzLngpXHJcbiAgICAgICAgY2FzZSAyOiByZXR1cm4gbmV3IGdlby5Qb2ludChjb29yZHMueSwgY29vcmRzLngpXHJcbiAgICAgICAgY2FzZSAzOiByZXR1cm4gbmV3IGdlby5Qb2ludChjb29yZHMueCwgY29vcmRzLnkpXHJcbiAgICAgICAgY2FzZSA0OiByZXR1cm4gbmV3IGdlby5Qb2ludChjb29yZHMueCwgLWNvb3Jkcy55KVxyXG4gICAgICAgIGNhc2UgNTogcmV0dXJuIG5ldyBnZW8uUG9pbnQoY29vcmRzLnksIC1jb29yZHMueClcclxuICAgICAgICBjYXNlIDY6IHJldHVybiBuZXcgZ2VvLlBvaW50KC1jb29yZHMueSwgLWNvb3Jkcy54KVxyXG4gICAgICAgIGNhc2UgNzogcmV0dXJuIG5ldyBnZW8uUG9pbnQoLWNvb3Jkcy54LCAtY29vcmRzLnkpXHJcbiAgICB9XHJcblxyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBvY3RhbnQgLSBtdXN0IGJlIGluIGludGVydmFsIFswLCA4KVwiKVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc1NoYWRvd2VkKHNoYWRvd3M6IGdlby5Qb2ludFtdLCBjb29yZHM6IGdlby5Qb2ludCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIGl0ZXIuYW55KHNoYWRvd3MsIHggPT4gc2hhZG93Q292ZXJzUG9pbnQoeCwgY29vcmRzKSlcclxufVxyXG5cclxuZnVuY3Rpb24gc2hhZG93Q292ZXJzUG9pbnQoc2hhZG93OiBnZW8uUG9pbnQsIGNvb3JkczogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICBpZiAoc2hhZG93LnggPT0gMCkge1xyXG4gICAgICAgIHJldHVybiBjb29yZHMueSA+IHNoYWRvdy55XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc3RhcnRYID0gc2hhZG93LnggLyAoc2hhZG93LnkgKyAxKSAqIGNvb3Jkcy55XHJcbiAgICBjb25zdCBlbmRYID0gKHNoYWRvdy54ICsgMSkgLyBzaGFkb3cueSAqIGNvb3Jkcy55XHJcblxyXG4gICAgcmV0dXJuIGNvb3Jkcy55ID4gc2hhZG93LnkgJiYgY29vcmRzLnggPiBzdGFydFggJiYgY29vcmRzLnggPCBlbmRYXHJcbn1cclxuXHJcblxyXG4vKipcclxuICogRmluZCBhIHBhdGggZnJvbSBzdGFydCB0byBnb2FsXHJcbiAqIEBwYXJhbSBtYXAgbWFwXHJcbiAqIEBwYXJhbSBzdGFydCBzdGFydCBjb29yZHNcclxuICogQHBhcmFtIGdvYWwgZ29hbCBjb29yZHNcclxuICogQHJldHVybnMgcGF0aCBmcm9tIHN0YXJ0IHRvIGdvYWwsIGluY2x1ZGluZyBnb2FsLCBidXQgbm90IHN0YXJ0aW5nIHBvc2l0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmluZFBhdGgobWFwOiBNYXAsIHN0YXJ0OiBnZW8uUG9pbnQsIGdvYWw6IGdlby5Qb2ludCk6IEFycmF5PGdlby5Qb2ludD4ge1xyXG4gICAgaW50ZXJmYWNlIE5vZGUge1xyXG4gICAgICAgIGY6IG51bWJlclxyXG4gICAgICAgIGc6IG51bWJlclxyXG4gICAgICAgIGg6IG51bWJlclxyXG4gICAgICAgIHBhcmVudDogTm9kZSB8IG51bGxcclxuICAgICAgICBjb29yZHM6IGdlby5Qb2ludFxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG9wZW4gPSBuZXcgQXJyYXk8Tm9kZT4oKVxyXG4gICAgY29uc3QgY2xvc2VkID0gbmV3IEFycmF5PE5vZGU+KClcclxuXHJcbiAgICBvcGVuLnB1c2goeyBmOiAwLCBnOiAwLCBoOiAwLCBwYXJlbnQ6IG51bGwsIGNvb3Jkczogc3RhcnQgfSlcclxuXHJcbiAgICBjb25zdCBwb3BPcGVuID0gKCkgPT4ge1xyXG4gICAgICAgIC8vIHdhcm5pbmc6IGFzc3VtZXMgbm9uLWVtcHR5IVxyXG4gICAgICAgIGxldCBuID0gMFxyXG4gICAgICAgIG9wZW4uZm9yRWFjaCgoeCwgaSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoeC5mIDwgb3BlbltuXS5mKSB7XHJcbiAgICAgICAgICAgICAgICBuID0gaVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgLy8gc3dhcCAmIHBvcFxyXG4gICAgICAgIGNvbnN0IHIgPSBvcGVuW25dXHJcblxyXG4gICAgICAgIGlmIChuIDwgb3Blbi5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgIG9wZW5bbl0gPSBvcGVuW29wZW4ubGVuZ3RoIC0gMV1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG9wZW4ucG9wKClcclxuXHJcbiAgICAgICAgcmV0dXJuIHJcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBhc3NlbWJsZVBhdGggPSAobm9kZTogTm9kZSB8IG51bGwpOiBBcnJheTxnZW8uUG9pbnQ+ID0+IHtcclxuICAgICAgICAvLyBwYXRoIGZvdW5kISBiYWNrdHJhY2sgYW5kIGFzc2VtYmxlIHBhdGhcclxuICAgICAgICBjb25zdCBwYXRoID0gbmV3IEFycmF5PGdlby5Qb2ludD4oKVxyXG5cclxuICAgICAgICB3aGlsZSAobm9kZSAmJiAhbm9kZS5jb29yZHMuZXF1YWwoc3RhcnQpKSB7XHJcbiAgICAgICAgICAgIHBhdGgucHVzaChub2RlLmNvb3JkcylcclxuICAgICAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcGF0aC5yZXZlcnNlKClcclxuICAgIH1cclxuXHJcbiAgICB3aGlsZSAob3Blbi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc3QgY3VyID0gcG9wT3BlbigpXHJcbiAgICAgICAgY2xvc2VkLnB1c2goY3VyKVxyXG5cclxuICAgICAgICBpZiAoY3VyLmNvb3Jkcy5lcXVhbChnb2FsKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYXNzZW1ibGVQYXRoKGN1cilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgY29vcmRzIG9mIHZpc2l0TmVpZ2hib3JzKGN1ci5jb29yZHMsIG1hcC53aWR0aCwgbWFwLmhlaWdodCkpIHtcclxuICAgICAgICAgICAgaWYgKCFtYXAuaXNQYXNzYWJsZShjb29yZHMpICYmICFjb29yZHMuZXF1YWwoZ29hbCkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChjbG9zZWQuZmluZCh4ID0+IGNvb3Jkcy5lcXVhbCh4LmNvb3JkcykpKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBnID0gY3VyLmcgKyAxXHJcbiAgICAgICAgICAgIGNvbnN0IGggPSBnZW8uY2FsY01hbmhhdHRlbkRpc3QoZ29hbCwgY29vcmRzKVxyXG4gICAgICAgICAgICBjb25zdCBmID0gZyArIGhcclxuXHJcbiAgICAgICAgICAgIC8vIGRvZXMgdGhpcyBub2RlIGFscmVhZHkgZXhpc3QgaW4gb3BlbiBsaXN0P1xyXG4gICAgICAgICAgICBjb25zdCBvcGVuTm9kZSA9IG9wZW4uZmluZCh4ID0+IGNvb3Jkcy5lcXVhbCh4LmNvb3JkcykpXHJcbiAgICAgICAgICAgIGlmIChvcGVuTm9kZSAhPSBudWxsICYmIG9wZW5Ob2RlLmcgPD0gZykge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gcGxhY2UgaW4gb3BlbiBsaXN0XHJcbiAgICAgICAgICAgIG9wZW4ucHVzaCh7IGc6IGcsIGg6IGgsIGY6IGYsIHBhcmVudDogY3VyLCBjb29yZHM6IGNvb3JkcyB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV3IEFycmF5PGdlby5Qb2ludD4oKTtcclxufVxyXG5cclxuZnVuY3Rpb24qIHZpc2l0TmVpZ2hib3JzKHB0OiBnZW8uUG9pbnQsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogSXRlcmFibGU8Z2VvLlBvaW50PiB7XHJcbiAgICBpZiAocHQueCA8IDAgfHwgcHQueSA8IDAgfHwgcHQueCA+PSB3aWR0aCB8fCBwdC55ID49IGhlaWdodCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInB0IGlzIG91dCBvZiBib3VuZHNcIilcclxuICAgIH1cclxuXHJcbiAgICAvLyB3XHJcbiAgICBpZiAocHQueCA+IDApIHtcclxuICAgICAgICBjb25zdCB3ID0gbmV3IGdlby5Qb2ludChwdC54IC0gMSwgcHQueSlcclxuICAgICAgICB5aWVsZCB3XHJcbiAgICB9XHJcblxyXG4gICAgLy8gc1xyXG4gICAgaWYgKHB0LnkgPCBoZWlnaHQgLSAxKSB7XHJcbiAgICAgICAgY29uc3QgcyA9IG5ldyBnZW8uUG9pbnQocHQueCwgcHQueSArIDEpXHJcbiAgICAgICAgeWllbGQgc1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGVcclxuICAgIGlmIChwdC54IDwgd2lkdGggLSAxKSB7XHJcbiAgICAgICAgY29uc3QgZSA9IG5ldyBnZW8uUG9pbnQocHQueCArIDEsIHB0LnkpXHJcbiAgICAgICAgeWllbGQgZVxyXG4gICAgfVxyXG5cclxuICAgIC8vIG5cclxuICAgIGlmIChwdC55ID4gMCkge1xyXG4gICAgICAgIGNvbnN0IG4gPSBuZXcgZ2VvLlBvaW50KHB0LngsIHB0LnkgLSAxKVxyXG4gICAgICAgIHlpZWxkIG5cclxuICAgIH1cclxufVxyXG4iXX0=