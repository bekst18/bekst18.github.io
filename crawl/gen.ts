/**
 * map generation library
 */
import * as rl from "./rl.js"
import * as geo from "../shared/geo2d.js"
import * as grid from "../shared/grid.js"
import * as array from "../shared/array.js"
import * as rand from "../shared/rand.js"
import * as things from "./things.js"
import * as maps from "./maps.js"

interface DungeonTileset {
    wall: rl.Tile,
    floor: rl.Tile,
    door: rl.Door,
    stairsUp: rl.StairsUp
    stairsDown: rl.StairsDown
}

const tileset: DungeonTileset = {
    wall: things.brickWall.clone(),
    floor: things.floor.clone(),
    door: things.door.clone(),
    stairsUp: things.stairsUp.clone(),
    stairsDown: things.stairsDown.clone()
}

const monsters = [
    things.bat.clone(),
    things.skeleton.clone(),
    things.greenSlime.clone(),
    things.redSlime.clone(),
    things.spider.clone(),
    things.rat.clone()
]

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
    tunnelPts: geo.Point[]
}

interface Room {
    interiorPt: geo.Point
    tunnelPts: geo.Point[]
    depth: number,
}

export function generateMap(width: number, height: number, player: rl.Player): maps.Map {
    const map = new maps.Map(width, height, player)
    const [cells, rooms] = generateCellGrid(width, height)

    const firstRoom = rooms.reduce((x, y) => x.depth < y.depth ? x : y)
    map.player.position = firstRoom.interiorPt.clone()

    const stairsUp = tileset.stairsUp.clone()
    const stairsUpPosition = array.find(visitInteriorCoords(cells, firstRoom.interiorPt), pt => array.any(visitNeighbors(cells, pt), a => a[0] === CellType.Wall))
    if (!stairsUpPosition) {
        throw new Error("Failed to place stairs up")
    }
    stairsUp.position = stairsUpPosition.clone()
    map.fixtures.add(stairsUp)

    const lastRoom = rooms.reduce((x, y) => x.depth > y.depth ? x : y)
    const stairsDown = tileset.stairsDown.clone()
    const stairsDownPosition = array.find(visitInteriorCoords(cells, lastRoom.interiorPt), pt => array.any(visitNeighbors(cells, pt), a => a[0] === CellType.Wall))
    if (!stairsDownPosition) {
        throw new Error("Failed to place stairs down")
    }
    stairsDown.position = stairsDownPosition.clone()
    map.fixtures.add(stairsDown)

    // generate tiles and fixtures from cells
    for (const [v, x, y] of cells.scan()) {
        if (v === null) {
            continue
        }

        switch (v) {
            case CellType.Exterior:
                break

            case CellType.Interior: {
                const tile = tileset.floor.clone()
                tile.position = new geo.Point(x, y)
                map.tiles.add(tile)
            }
                break

            case CellType.Wall: {
                const tile = tileset.wall.clone()
                tile.position = new geo.Point(x, y)
                map.tiles.add(tile)
            }
                break

            case CellType.Door: {
                const fixture = tileset.door.clone()
                fixture.position = new geo.Point(x, y)
                map.fixtures.add(fixture)

                const tile = tileset.floor.clone()
                tile.position = new geo.Point(x, y)
                map.tiles.add(tile)
            }
                break
        }
    }

    placeMonsters(cells, rooms, map)
    placeTreasures(cells, rooms, map)

    return map
}

function placeMonsters(cells: CellGrid, rooms: Room[], map: maps.Map) {
    // iterate over rooms, decide whether to place a monster in each room
    const encounterChance = 1
    const secondEncounterChance = .3
    const thirdEncounterChance = .2

    for (const room of rooms) {
        if (!rand.chance(encounterChance)) {
            continue
        }

        tryPlaceMonster(cells, room, map)

        if (!rand.chance(secondEncounterChance)) {
            continue
        }

        tryPlaceMonster(cells, room, map)

        if (!rand.chance(thirdEncounterChance)) {
            continue
        }

        tryPlaceMonster(cells, room, map)
    }
}

function tryPlaceMonster(cells: CellGrid, room: Room, map: maps.Map): boolean {
    // attempt to place monster
    for (const [t, pt] of visitInterior(cells, room.interiorPt)) {
        if (t !== CellType.Interior) {
            continue
        }

        if (array.any(map, th => (th.position?.equal(pt) ?? false) && !th.passable)) {
            continue
        }

        const monster = (rand.choose(monsters)).clone()
        monster.position = pt.clone()
        map.monsters.add(monster)

        return true
    }

    return false
}

function placeTreasures(cells: CellGrid, rooms: Room[], map: maps.Map) {
    // iterate over rooms, decide whether to place a monster in each room
    const treasureChance = .5

    for (const room of rooms) {
        if (!rand.chance(treasureChance)) {
            continue
        }

        tryPlaceTreasure(cells, room, map)
    }
}


function tryPlaceTreasure(cells: CellGrid, room: Room, map: maps.Map): boolean {
    // attempt to place monster
    for (const [t, pt] of visitInterior(cells, room.interiorPt)) {
        if (t !== CellType.Interior) {
            continue
        }

        if (array.any(map, th => (th.position?.equal(pt) ?? false) && !th.passable)) {
            continue
        }

        const chest = things.chest.clone()
        chest.position = pt.clone()
        map.fixtures.add(chest)

        return true
    }

    return false
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

        const room = placeTemplate(cells, template, pt)
        stack.push(room)
        rooms.push(room)
    }

    while (stack.length > 0) {
        const room = array.pop(stack)
        const nextRoom = tryTunnelFrom(cells, templates, room)

        if (nextRoom) {
            stack.push(room)
            stack.push(nextRoom)
            rooms.push(nextRoom)
        }
    }

    return [cells, rooms]
}

function tryTunnelFrom(cells: CellGrid, templates: RoomTemplate[], room: Room): Room | null {
    rand.shuffle(templates)

    while (room.tunnelPts.length > 0) {
        const tpt = array.pop(room.tunnelPts)
        for (const template of templates) {
            const nextRoom = tryTunnelTo(cells, tpt, template)
            if (nextRoom) {
                // place door at tunnel point
                room.tunnelPts = room.tunnelPts.filter(pt => !pt.equal(tpt))
                cells.setPoint(tpt, CellType.Door)
                nextRoom.depth = room.depth + 1
                return nextRoom
            }
        }

    }

    return null
}

function tryTunnelTo(cells: CellGrid, tpt1: geo.Point, template: RoomTemplate): Room | null {
    // find tunnel points of template
    for (const tpt2 of template.tunnelPts) {
        const offset = tpt1.subPoint(tpt2)
        if (isValidPlacement(template.cells, cells, offset)) {
            return placeTemplate(cells, template, offset)
        }
    }

    return null
}

function placeTemplate(cells: CellGrid, template: RoomTemplate, offset: geo.Point): Room {
    grid.copy(template.cells, cells, offset.x, offset.y)

    // find tunnelable points
    const interiorPt = template.interiorPt.addPoint(offset)
    const tunnelPts = template.tunnelPts.map(pt => pt.addPoint(offset)).filter(pt => findExteriorNeighbor(cells, pt) !== null)
    rand.shuffle(tunnelPts)

    return {
        interiorPt,
        tunnelPts,
        depth: 0
    }
}

function generateRoomTemplates(): RoomTemplate[] {
    const lengths = [5, 7, 9, 11, 13, 15]
    const pairs = lengths.map(x => lengths.map(y => [x, y])).flat().filter(a => a[0] > 3 || a[1] > 3)
    const templates = pairs.map(a => generateRoomTemplate(a[0], a[1]))
    return templates
}

function generateRoomTemplate(width: number, height: number): RoomTemplate {
    const interiorPt = new geo.Point(width / 2, height / 2).floor()
    const cells = grid.generate(
        width,
        height,
        (x, y) => x === 0 || x === width - 1 || y === 0 || y === height - 1 ? CellType.Wall : CellType.Interior)

    const tunnelPts: geo.Point[] = []
    tunnelPts.push(...grid.scan(1, 0, width - 2, 1))
    tunnelPts.push(...grid.scan(0, 1, 1, height - 2))
    tunnelPts.push(...grid.scan(1, height - 1, width - 2, 1))
    tunnelPts.push(...grid.scan(width - 1, 1, 1, height - 2))

    return {
        interiorPt,
        cells,
        tunnelPts
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