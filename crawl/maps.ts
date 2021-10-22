import * as geo from "../shared/geo2d.js"
import * as iter from "../shared/iter.js"
import * as rl from "./rl.js"
import * as grid from "../shared/grid.js"

export interface Placed<T extends rl.Thing> {
    thing: T,
    position: geo.Point,
}

/**
 * a layer of things on a map
 */
export interface Layer<T extends rl.Thing> {
    set(position: geo.Point, thing: T): void
    delete(thing: T): void
    has(thing: T): boolean
    at(position: geo.Point): T | undefined
    within(aabb: geo.AABB): Generator<Placed<T>>,
    thingsWithin(aabb: geo.AABB): Generator<T>,
    where(thing: T): geo.Point | undefined,
    size: number
    [Symbol.iterator](): Generator<Placed<T>>
    things(): Generator<T>
}

interface LayerSaveState  {
    
}

/**
 * a layer that is based on a set
 * works well for sparse layers
 */
export class MapLayer<T extends rl.Thing> implements Layer<T> {
    private readonly map = new window.Map<T, Placed<T>>()

    set(position: geo.Point, thing: T): void {
        position = position.clone()
        this.map.set(thing, { thing, position })
    }

    delete(thing: T): void {
        this.map.delete(thing)
    }

    has(thing: T): boolean {
        return this.map.has(thing)
    }

    at(position: geo.Point): T | undefined {
        for (const pth of this.map.values()) {
            if (pth.position.equal(position)) {
                return pth.thing
            }
        }

        return undefined
    }

    where(thing: T): geo.Point | undefined {
        return this.map.get(thing)?.position?.clone()
    }

    *within(aabb: geo.AABB): Generator<Placed<T>> {
        for (const pth of this.map.values()) {
            if (aabb.contains(pth.position)) {
                yield pth
            }
        }
    }

    get size() {
        return this.map.size
    }

    *[Symbol.iterator](): Generator<Placed<T>> {
        for (const value of this.map.values()) {
            yield value
        }
    }

    *things(): Generator<T> {
        for (const th of this.map.keys()) {
            yield th
        }
    }

    *thingsWithin(aabb: geo.AABB): Generator<T> {
        for (const pth of this.within(aabb)) {
            yield pth.thing
        }
    }
}


/**
 * a layer that is based on a grid
 * works well for dense layers
 */
export class GridLayer<T extends rl.Thing> implements Layer<T> {
    private readonly map = new MapLayer<T>()
    private readonly grd: grid.Grid<T | undefined>

    constructor(width: number, height: number) {
        this.grd = grid.generate(width, height, () => undefined)
    }

    get width() {
        return this.grd.width
    }

    get height() {
        return this.grd.height
    }

    set(position: geo.Point, thing: T): void {
        // remove from grid if already present
        const oldPosition = this.map.where(thing)
        if (oldPosition) {
            this.grd.setPoint(oldPosition, undefined)
        }

        this.grd.setPoint(position, thing)
        this.map.set(position, thing)
    }

    delete(thing: T): void {
        const pos = this.map.where(thing)
        if (!pos) {
            return
        }

        this.grd.setPoint(pos, undefined)
        this.map.delete(thing)
    }

    has(item: T): boolean {
        return this.map.has(item)
    }

    at(position: geo.Point): T | undefined {
        return this.grd.atPoint(position)
    }

    where(thing: T): geo.Point | undefined {
        return this.map.where(thing)
    }

    *within(aabb: geo.AABB): Generator<Placed<T>> {
        for (const [thing, x, y] of this.grd.scanAABB(aabb)) {
            if (!thing) {
                continue
            }

            yield {
                position: new geo.Point(x, y),
                thing,
            }
        }
    }

    *thingsWithin(aabb: geo.AABB): Generator<T> {
        for (const pth of this.within(aabb)) {
            yield pth.thing
        }
    }

    get size() {
        return this.map.size
    }

    *[Symbol.iterator](): Generator<Placed<T>> {
        for (const value of this.map) {
            yield value
        }
    }

    things(): Generator<T> {
        return this.map.things()
    }
}

export enum Lighting {
    None,
    Ambient,
}

/**
 * components of a generated map area
 */
export class Map {
    tiles: Layer<rl.Tile>
    fixtures: Layer<rl.Fixture>
    monsters: Layer<rl.Monster>
    containers: Layer<rl.Container>
    lighting: Lighting = Lighting.None

    constructor(readonly width: number, readonly height: number, readonly depth: number, readonly player: Placed<rl.Player>) {
        this.tiles = new GridLayer(width, height)
        this.fixtures = new MapLayer()
        this.monsters = new MapLayer()
        this.containers = new MapLayer()
    }

    /**
      * iterate over all things in map
    */
    public *[Symbol.iterator](): Generator<Placed<rl.Thing>> {
        for (const tile of this.tiles) {
            yield tile
        }

        for (const fixture of this.fixtures) {
            yield fixture
        }

        for (const container of this.containers) {
            yield container
        }

        for (const monster of this.monsters) {
            yield monster
        }

        yield this.player
    }

    /**
     * iterate over all things in map
   */
    public *things(): Generator<rl.Thing> {
        for (const pth of this) {
            yield pth.thing
        }
    }

    tileAt(xy: geo.Point): rl.Tile | undefined {
        return this.tiles.at(xy)
    }

    fixtureAt(xy: geo.Point): rl.Fixture | undefined {
        return this.fixtures.at(xy)
    }

    containerAt(xy: geo.Point): rl.Container | undefined {
        return this.containers.at(xy)
    }

    monsterAt(xy: geo.Point): rl.Monster | undefined {
        return this.monsters.at(xy)
    }

    *at(xy: geo.Point): Generator<rl.Monster | rl.Fixture | rl.Tile> {
        const fixture = this.fixtureAt(xy)
        if (fixture) {
            yield fixture
        }

        const tile = this.tileAt(xy)
        if (tile) {
            yield tile
        }

        const container = this.containerAt(xy)
        if (container) {
            yield container
        }

        const monster = this.monsterAt(xy)
        if (monster) {
            yield monster
        }

        if (this.player.position.equal(xy)) {
            yield this.player.thing
        }
    }

    inBounds(xy: geo.Point): boolean {
        return xy.x >= 0 && xy.x < this.width && xy.y >= 0 && xy.y < this.height
    }

    isPassable(position: geo.Point): boolean {
        return this.inBounds(position) && iter.all(this.at(position), th => th.passable)
    }
}

function resetVisibility(map: Map) {
    for (const th of map) {
        if (th.thing.visible === rl.Visibility.Visible) {
            th.thing.visible = rl.Visibility.Fog
        }
    }

    for (const monster of map.monsters) {
        monster.thing.visible = rl.Visibility.None
    }

    map.player.thing.visible = rl.Visibility.Visible
}

export function updateVisibility(map: Map, radius: number) {
    resetVisibility(map)

    const eye = map.player.position
    for (let i = 0; i < 8; ++i) {
        updateVisibilityOctant(map, eye, radius, i)
    }

    // eye point always visible
    iter.each(map.at(eye), th => th.visible = rl.Visibility.Visible)
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
                th.visible = rl.Visibility.Visible
            }
        }
    }
}

function transformOctant(coords: geo.Point, octant: number): geo.Point {
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

    throw new Error("Invalid octant - must be in interval [0, 8)")
}

function isShadowed(shadows: geo.Point[], coords: geo.Point): boolean {
    return iter.any(shadows, x => shadowCoversPoint(x, coords))
}

function shadowCoversPoint(shadow: geo.Point, coords: geo.Point): boolean {
    if (shadow.x == 0) {
        return coords.y > shadow.y
    }

    const startX = shadow.x / (shadow.y + 1) * coords.y
    const endX = (shadow.x + 1) / shadow.y * coords.y

    return coords.y > shadow.y && coords.x > startX && coords.x < endX
}


/**
 * Find a path from start to goal
 * @param map map
 * @param start start coords
 * @param goal goal coords
 * @returns path from start to goal, including goal, but not starting position
 */
export function findPath(map: Map, start: geo.Point, goal: geo.Point): Array<geo.Point> {
    interface Node {
        f: number
        g: number
        h: number
        parent: Node | null
        coords: geo.Point
    }

    const open = new Array<Node>()
    const closed = new Array<Node>()

    open.push({ f: 0, g: 0, h: 0, parent: null, coords: start })

    const popOpen = () => {
        // warning: assumes non-empty!
        let n = 0
        open.forEach((x, i) => {
            if (x.f < open[n].f) {
                n = i
            }
        })

        // swap & pop
        const r = open[n]

        if (n < open.length - 1) {
            open[n] = open[open.length - 1]
        }

        open.pop()

        return r
    }

    const assemblePath = (node: Node | null): Array<geo.Point> => {
        // path found! backtrack and assemble path
        const path = new Array<geo.Point>()

        while (node && !node.coords.equal(start)) {
            path.push(node.coords)
            node = node.parent
        }

        return path.reverse()
    }

    while (open.length > 0) {
        const cur = popOpen()
        closed.push(cur)

        if (cur.coords.equal(goal)) {
            return assemblePath(cur)
        }

        for (const coords of visitNeighbors(cur.coords, map.width, map.height)) {
            if (!map.isPassable(coords) && !coords.equal(goal)) {
                continue
            }

            if (closed.find(x => coords.equal(x.coords))) {
                continue
            }

            const g = cur.g + 1
            const h = geo.calcManhattenDist(goal, coords)
            const f = g + h

            // does this node already exist in open list?
            const openNode = open.find(x => coords.equal(x.coords))
            if (openNode != null && openNode.g <= g) {
                continue
            }

            // place in open list
            open.push({ g: g, h: h, f: f, parent: cur, coords: coords })
        }
    }

    return new Array<geo.Point>();
}

function* visitNeighbors(pt: geo.Point, width: number, height: number): Iterable<geo.Point> {
    if (pt.x < 0 || pt.y < 0 || pt.x >= width || pt.y >= height) {
        throw new Error("pt is out of bounds")
    }

    // w
    if (pt.x > 0) {
        const w = new geo.Point(pt.x - 1, pt.y)
        yield w
    }

    // s
    if (pt.y < height - 1) {
        const s = new geo.Point(pt.x, pt.y + 1)
        yield s
    }

    // e
    if (pt.x < width - 1) {
        const e = new geo.Point(pt.x + 1, pt.y)
        yield e
    }

    // n
    if (pt.y > 0) {
        const n = new geo.Point(pt.x, pt.y - 1)
        yield n
    }
}
