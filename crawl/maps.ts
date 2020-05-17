import * as geo from "../shared/geo2d.js"
import * as grid from "../shared/grid.js"
import * as array from "../shared/array.js"
import * as rl from "./rl.js"

/**
 * components of a generated map area
 */
export class Map {
    tiles = new Set<rl.Tile>()
    fixtures = new Set<rl.Fixture>()
    monsters = new Set<rl.Monster>();
    containers = new Set<rl.Container>();

    constructor(readonly player: rl.Player) { }

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
        return array.find(this.tiles, t => (t.position?.equal(xy)) ?? false) || null
    }

    fixtureAt(xy: geo.Point): rl.Fixture | null {
        return array.find(this.fixtures, f => (f.position?.equal(xy)) ?? false) || null
    }

    containerAt(xy: geo.Point): rl.Container | null {
        return array.find(this.containers, c => (c.position?.equal(xy)) ?? false) || null
    }

    monsterAt(xy: geo.Point): rl.Monster | null {
        return array.find(this.monsters, c => (c.position?.equal(xy)) ?? false) || null
    }

    *thingsAt(xy: geo.Point): Generator<rl.Monster | rl.Fixture | rl.Tile> {
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