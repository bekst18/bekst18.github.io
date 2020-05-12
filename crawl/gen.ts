/**
 * map generation library
 */
import * as rl from "./rl.js"
import * as geo from "../shared/geo2d.js"
import * as grid from "../shared/grid.js"
import * as array from "../shared/array.js"
import * as rand from "../shared/rand.js"

/**
 * components of a generated map area
 */
export interface MapData {
    tiles: rl.Tile[]
    fixtures: rl.Fixture[]
    stairsUp: rl.Fixture
    stairsDown: rl.Fixture
    entry: geo.Point
}

interface DungeonTileset {
    wall: rl.Tile,
    floor: rl.Tile,
    door: rl.Fixture,
    stairsUp: rl.Fixture
    stairsDown: rl.Fixture
}

const tileset: DungeonTileset = {
    wall: new rl.Tile({
        position: new geo.Point(0, 0),
        name: "Brick Wall",
        image: "./assets/wall.png",
        passable: false,
        transparent: false
    }),
    floor: new rl.Tile({
        position: new geo.Point(0, 0),
        name: "Floor",
        image: "./assets/floor.png",
        passable: true,
        transparent: true
    }),
    door: new rl.Fixture({
        position: new geo.Point(0, 0),
        name: "A Closed Wooden Door",
        image: "./assets/closed.png",
        passable: true,
        transparent: true
    }),
    stairsUp: new rl.Thing({
        position: new geo.Point(0, 0),
        name: "Stairs Up",
        image: "./assets/up.png",
        passable: false,
        transparent: false,
    }),
    stairsDown: new rl.Thing({
        position: new geo.Point(0, 0),
        name: "Stairs Down",
        image: "./assets/down.png",
        passable: false,
        transparent: false,
    }),
}

enum CellType {
    Exterior,
    Interior,
    Wall,
    Door
}

type CellGrid = grid.Grid<CellType>

interface RoomTemplate {
    cells: CellGrid
    interiorPt: geo.Point
}

interface Room {
    interiorPt: geo.Point
    depth: number,
}

export function generateMap(width: number, height: number): MapData {
    const [cells, rooms] = generateCellGrid(width, height)

    const firstRoom = rooms.reduce((x, y) => x.depth < y.depth ? x : y)
    const stairsUp = tileset.stairsUp.clone()
    const stairsUpPosition = array.find(visitInteriorCoords(cells, firstRoom.interiorPt), pt => array.any(visitNeighbors(cells, pt), a => a[0] === CellType.Wall))
    if (!stairsUpPosition) {
        throw new Error("Failed to place stairs up")
    }
    stairsUp.position = stairsUpPosition

    const lastRoom = rooms.reduce((x, y) => x.depth > y.depth ? x : y)
    const stairsDown = tileset.stairsDown.clone()
    const stairsDownPosition = array.find(visitInteriorCoords(cells, lastRoom.interiorPt), pt => array.any(visitNeighbors(cells, pt), a => a[0] === CellType.Wall))
    if (!stairsDownPosition) {
        throw new Error("Failed to place stairs down")
    }
    stairsDown.position = stairsDownPosition

    // generate tiles and fixtures from cells
    const tiles: rl.Tile[] = []
    const fixtures: rl.Fixture[] = []

    for (const [v, x, y] of cells.scan()) {
        if (v === null) {
            continue
        }

        switch (v) {
            case CellType.Exterior:
                break

            case CellType.Interior: {
                const tile = tileset.floor.clone()
                tile.position.x = x
                tile.position.y = y
                tiles.push(tile)
            }
                break

            case CellType.Wall: {
                const tile = tileset.wall.clone()
                tile.position.x = x
                tile.position.y = y
                tiles.push(tile)
            }
                break

            case CellType.Door: {
                const tile = tileset.door.clone()
                tile.position.x = x
                tile.position.y = y
                fixtures.push(tile)
            }
                break
        }
    }

    return {
        tiles: tiles,
        fixtures: fixtures,
        stairsUp: stairsUp,
        stairsDown: stairsDown,
        entry: firstRoom.interiorPt
    }
}

function generateCellGrid(width: number, height: number): [CellGrid, Room[]] {
    const cells = grid.generate(width, height, () => CellType.Exterior)

    // generate room templates
    const templates = generateRoomTemplates()
    const stack: Room[] = []
    const rooms: Room[] = []

    // place initial room
    {
        rand.shuffle(templates)
        const template = templates[0]

        const pt = new geo.Point(
            rand.int(0, width - template.cells.width + 1),
            rand.int(0, height - template.cells.height + 1))

        const interiorPt = placeTemplate(cells, template, pt)
        const room = {
            interiorPt,
            depth: 0
        }

        stack.push(room)
        rooms.push(room)
    }

    while (stack.length > 0) {
        const room = array.pop(stack)
        const nextInteriorPt = tryTunnelFrom(cells, templates, room.interiorPt)

        if (nextInteriorPt) {
            const nextRoom = {
                interiorPt: nextInteriorPt,
                depth: room.depth + 1
            }

            stack.push(room)
            stack.push(nextRoom)
            rooms.push(nextRoom)
        }
    }

    return [cells, rooms]
}

function tryTunnelFrom(cells: CellGrid, templates: RoomTemplate[], interiorPt: geo.Point): geo.Point | null {
    const tunnelablePts = [...array.filter(visitRoomCoords(cells, interiorPt), pt => findExteriorNeighbor(cells, pt) !== null)]
    rand.shuffle(tunnelablePts)
    rand.shuffle(templates)

    for (const tpt of tunnelablePts) {
        for (const template of templates) {
            const interiorPt = tryTunnelTo(cells, tpt, template)
            if (interiorPt) {
                // place door at tunnel point
                cells.setPoint(tpt, CellType.Door)
                return interiorPt
            }
        }
    }

    return null
}

function tryTunnelTo(cells: CellGrid, tpt1: geo.Point, template: RoomTemplate): geo.Point | null {
    // find tunnel points of template
    const tunnelablePts = [...array.filter(visitRoomCoords(template.cells, template.interiorPt), pt => findExteriorNeighbor(cells, pt) !== null)]
    rand.shuffle(tunnelablePts)

    for (const tpt2 of tunnelablePts) {
        const offset = tpt1.subPoint(tpt2)
        if (isValidPlacement(template.cells, cells, offset)) {
            return placeTemplate(cells, template, offset)
        }
    }

    return null
}

function placeTemplate(cells: CellGrid, template: RoomTemplate, offset: geo.Point): geo.Point {
    grid.copy(template.cells, cells, offset.x, offset.y)
    return template.interiorPt.addPoint(offset)
}

function generateRoomTemplates(): RoomTemplate[] {
    const lengths = [3, 5, 7, 9, 11, 13]
    const pairs = lengths.map(x => lengths.map(y => [x, y])).flat().filter(a => a[0] > 3 || a[1] > 3)
    const templates = pairs.map(a => generateRoomTemplate(a[0], a[1]))
    return templates
}

function generateRoomTemplate(width: number, height: number): RoomTemplate {
    const interiorPoint = new geo.Point(width / 2, height / 2).floor()
    const cells = grid.generate(
        width,
        height,
        (x, y) => x === 0 || x === width - 1 || y === 0 || y === height - 1 ? CellType.Wall : CellType.Interior)

    return {
        interiorPt: interiorPoint,
        cells: cells
    }
}

function findInteriorNeighbor(cells: CellGrid, pt: geo.Point): geo.Point | null {
    for (const [t, npt] of visitNeighbors(cells, pt)) {
        if (t === CellType.Interior) {
            return npt
        }
    }

    return null
}

function findExteriorNeighbor(cells: CellGrid, pt: geo.Point): geo.Point | null {
    for (const [t, npt] of visitNeighbors(cells, pt)) {
        if (t === CellType.Exterior) {
            return npt
        }
    }

    return null
}

function* visitNeighbors(cells: CellGrid, pt: geo.Point): Iterable<[CellType, geo.Point]> {
    cells.assertBounds(pt.x, pt.y)

    // w
    if (pt.x > 0) {
        const w = new geo.Point(pt.x - 1, pt.y)
        yield [cells.atPoint(w), w]
    }

    // s
    if (pt.y < cells.height - 1) {
        const s = new geo.Point(pt.x, pt.y + 1)
        yield [cells.atPoint(s), s]
    }

    // e
    if (pt.x < cells.width - 1) {
        const e = new geo.Point(pt.x + 1, pt.y)
        yield [cells.atPoint(e), e]
    }

    // n
    if (pt.y > 0) {
        const n = new geo.Point(pt.x, pt.y - 1)
        yield [cells.atPoint(n), n]
    }
}

function* visitRoom(cells: CellGrid, pt0: geo.Point): Iterable<[CellType, geo.Point]> {
    const explored = cells.map2(() => false)
    const stack = [pt0]

    while (stack.length > 0) {
        const pt = array.pop(stack)
        explored.setPoint(pt, true)
        const t = cells.atPoint(pt)
        yield [t, pt]

        // if this is a wall, do not explore neighbors
        if (t === CellType.Wall) {
            continue
        }

        // otherwise, explore neighbors, pushing onto stack those that are unexplored
        for (const [_, npt] of visitNeighbors(cells, pt)) {
            if (explored.atPoint(npt)) {
                continue
            }

            stack.push(npt)
        }
    }
}

function visitRoomCoords(cells: CellGrid, pt0: geo.Point): Iterable<geo.Point> {
    return array.map(visitRoom(cells, pt0), x => x[1])
}

function visitInteriorCoords(cells: CellGrid, pt0: geo.Point): Iterable<geo.Point> {
    return array.map(visitInterior(cells, pt0), x => x[1])
}

function* visitInterior(cells: CellGrid, pt0: geo.Point): Iterable<[CellType, geo.Point]> {
    const explored = cells.map2(() => false)
    const stack = [pt0]

    while (stack.length > 0) {
        const pt = array.pop(stack)
        explored.setPoint(pt, true)
        const t = cells.atPoint(pt)
        yield [t, pt]

        // if this is a wall, do not explore neighbors
        if (t === CellType.Wall) {
            continue
        }

        // otherwise, explore neighbors, pushing onto stack those that are unexplored
        for (const [t, npt] of visitNeighbors(cells, pt)) {
            if (explored.atPoint(npt)) {
                continue
            }

            if (t !== CellType.Interior) {
                continue
            }

            stack.push(npt)
        }
    }
}

function isValidPlacement(src: CellGrid, dst: CellGrid, offset: geo.Point): boolean {
    if (!dst.regionInBounds(offset.x, offset.y, src.width, src.height)) {
        return false
    }

    for (const [st, x, y] of src.scan()) {
        // rules:
        // can place wall over wall
        // can place anything over exterior
        const dt = dst.at(x + offset.x, y + offset.y)
        if (dt === CellType.Exterior) {
            continue
        }

        if (dt === CellType.Wall && st === CellType.Wall) {
            continue
        }

        return false
    }

    return true
}