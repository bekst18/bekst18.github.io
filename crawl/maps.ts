import * as geo from "../shared/geo2d.js"
import * as array from "../shared/array.js"
import * as rl from "./rl.js"
import * as grid from "../shared/grid.js"
import * as gfx from "./gfx.js"

/**
 * a layer of things on a map
 */
export interface Layer<T extends rl.Thing> {
    add(item: T): void
    delete(item: T): void
    has(item: T): boolean
    at(position: geo.Point): T | null
    [Symbol.iterator](): Generator<T>
}

/**
 * a layer that is based on a set
 * works well for sparse layers
 */
export class SetLayer<T extends rl.Thing> implements Layer<T> {
    private readonly set = new Set<T>()

    add(item: T): void {
        if (!item.position) {
            throw new Error("Item cannot be placed in layer without a position")
        }

        this.set.add(item)
    }

    delete(item: T): void {
        this.set.delete(item)
    }

    has(item: T): boolean {
        return this.set.has(item)
    }

    at(position: geo.Point): T | null {
        for (const value of this.set) {
            if (value.position?.equal(position)) {
                return value
            }
        }

        return null
    }

    *[Symbol.iterator](): Generator<T> {
        for (const value of this.set) {
            yield value
        }
    }
}


/**
 * a layer that is based on a grid
 * works well for dense layers
 */
export class GridLayer<T extends rl.Thing> implements Layer<T> {
    private readonly set = new Set<T>()
    private readonly grd: grid.Grid<T | null>

    constructor(width: number, height: number) {
        this.grd = grid.generate(width, height, () => null)
    }

    get width() {
        return this.grd.width
    }

    get height() {
        return this.grd.height
    }

    add(item: T): void {
        if (!item.position) {
            throw new Error("Item cannot be placed in layer without a position")
        }

        this.grd.setPoint(item.position, item)
        this.set.add(item)
    }

    delete(item: T): void {
        if (!item.position) {
            throw new Error("Item cannot be deleted from layer without a position")
        }

        this.grd.setPoint(item.position, null)
        this.set.delete(item)
    }

    has(item: T): boolean {
        return this.set.has(item)
    }

    at(position: geo.Point): T | null {
        return this.grd.atPoint(position)
    }

    *[Symbol.iterator](): Generator<T> {
        for (const value of this.set) {
            yield value
        }
    }
}

/**
 * components of a generated map area
 */
export class Map {
    tiles: Layer<rl.Tile>
    fixtures: Layer<rl.Fixture>
    monsters: Layer<rl.Monster>
    containers: Layer<rl.Container>

    constructor(readonly width: number, readonly height: number, readonly player: rl.Player) {
        this.tiles = new GridLayer(width, height)
        this.fixtures = new SetLayer()
        this.monsters = new SetLayer()
        this.containers = new SetLayer()
    }

    /**
      * iterate over all things in map
    */
    public *[Symbol.iterator](): Generator<rl.Thing> {
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

    tileAt(xy: geo.Point): rl.Tile | null {
        return this.tiles.at(xy)
    }

    fixtureAt(xy: geo.Point): rl.Fixture | null {
        return this.fixtures.at(xy)
    }

    containerAt(xy: geo.Point): rl.Container | null {
        return this.containers.at(xy)
    }

    monsterAt(xy: geo.Point): rl.Monster | null {
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
    }

    inBounds(xy: geo.Point): boolean {
        return xy.x >= 0 && xy.x < this.width && xy.y >= 0 && xy.y < this.height
    }
}

function resetVisibility(map: Map) {
    for (const th of map) {
        if (th.visible === rl.Visibility.Visible) {
            th.visible = rl.Visibility.Fog
        }
    }

    for (const monster of map.monsters) {
        monster.visible = rl.Visibility.None
    }

    map.player.visible = rl.Visibility.Visible
}

export function updateVisibility(map: Map, eye: geo.Point, radius: number) {
    resetVisibility(map)
    for (let i = 0; i < 8; ++i) {
        updateVisibilityOctant(map, eye, radius, i)
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

            const opaque = array.any(map.at(mapPoint), th => !th.transparent)
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
    return array.any(shadows, x => shadowCoversPoint(x, coords))
}

function shadowCoversPoint(shadow: geo.Point, coords: geo.Point): boolean {
    if (shadow.x == 0) {
        return coords.y > shadow.y
    }

    const startX = shadow.x / (shadow.y + 1) * coords.y
    const endX = (shadow.x + 1) / shadow.y * coords.y

    return coords.y > shadow.y && coords.x > startX && coords.x < endX
}