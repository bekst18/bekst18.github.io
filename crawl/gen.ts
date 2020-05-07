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

export function generateMap(width: number, height: number): MapData {
    const cells = generateCellGrid(width, height)

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

    const entry = cells.findPoint(t => t === CellType.Interior) || new geo.Point(0, 0)
    return {
        tiles: tiles,
        fixtures: fixtures,
        stairsUp: tileset.stairsUp.clone(),
        stairsDown: tileset.stairsDown.clone(),
        entry: entry
    }
}

function generateCellGrid(width: number, height: number): CellGrid {
    const cells = grid.generate(width, height, () => CellType.Exterior)

    // generate room templates
    const roomTemplates = generateRoomTemplates()
    const hallTemplates = generateHallTemplates()
    const stack: geo.Point[] = []

    // place initial room
    {
        rand.shuffle(roomTemplates)
        const template = roomTemplates[0]

        const pt = new geo.Point(
            rand.int(0, width - template.cells.width + 1),
            rand.int(0, height - template.cells.height + 1))

        const interiorPt = placeTemplate(cells, template, pt)
        stack.push(interiorPt)
    }

    while (stack.length > 0) {
        const interiorPt = array.pop(stack)
        const templates = stack.length % 2 == 0 ? roomTemplates : hallTemplates
        const nextInteriorPt = tryTunnelFrom(cells, templates, interiorPt)
        if (nextInteriorPt) {
            stack.push(interiorPt)
            stack.push(nextInteriorPt)
        }
    }

    return cells
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
    const templates = [5, 7, 9, 11, 13].map(x => generateRoomTemplate(x, x))
    return templates
}

function generateHallTemplates(): RoomTemplate[] {
    const templates: RoomTemplate[] = []
    templates.push(...[5, 7, 9, 11].map(x => generateRoomTemplate(x, 3)))
    templates.push(...[5, 7, 9, 11].map(x => generateRoomTemplate(3, x)))
    return templates
}

function generateNSHallTemplates(): RoomTemplate[] {
    const templates = [5, 7, 9, 11].map(x => generateRoomTemplate(3, x))
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

function isTunnelable(cells: CellGrid, pt: geo.Point): boolean {
    const interior = findInteriorNeighbor(cells, pt) !== null
    const exterior = findExteriorNeighbor(cells, pt) !== null
    return interior && exterior
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