/**
 * map generation library
 */
import * as rl from "./rl.js"
import * as geo from "../shared/geo2d.js"
import * as grid from "../shared/grid.js"
import * as array from "../shared/array.js"
import * as iter from "../shared/iter.js"
import * as rand from "../shared/rand.js"
import * as things from "./things.js"
import * as maps from "./maps.js"
import * as noise from "../shared/noise.js"
import * as imaging from "../shared/imaging.js"

interface DungeonTileset {
    wall: rl.Tile,
    floor: rl.Tile,
    door: rl.Door,
    stairsUp: rl.Exit
    stairsDown: rl.Exit
}

const tileset: DungeonTileset = {
    wall: things.brickWall.clone(),
    floor: things.floor.clone(),
    door: things.door.clone(),
    stairsUp: things.stairsUp.clone(),
    stairsDown: things.stairsDown.clone()
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
    tunnelPts: geo.Point[]
}

interface Room {
    interiorPt: geo.Point
    tunnelPts: geo.Point[]
    depth: number,
}

export function generateDungeonLevel(rng: rand.SFC32RNG, db: rl.ThingDB, floor: number): maps.Map {
    let minDim = 24;
    let maxDim = 32 + floor * 4;
    let dimDice = new rl.Dice(minDim, maxDim)
    let width = dimDice.roll(rng)
    let height = dimDice.roll(rng)

    const monsters = createMonsterList(db, floor)
    const items = createItemList(db, floor)
    const map = generateMapRooms(rng, monsters, items, width, height)

    map.lighting = maps.Lighting.None
    return map
}

function generateMapRooms(
    rng: rand.SFC32RNG,
    monsters: rl.WeightedList<rl.Monster>,
    items: rl.WeightedList<rl.Item>,
    width: number,
    height: number): maps.Map {
    const map = new maps.Map(width, height)
    const minRooms = 4

    const [cells, rooms] = (() => {
        while (true) {
            const [cells, rooms] = generateCellGrid(rng, width, height)
            if (rooms.length > minRooms) {
                return [cells, rooms]
            }
        }
    })() as [CellGrid, Room[]]

    const firstRoom = rooms.reduce((x, y) => x.depth < y.depth ? x : y)
    const stairsUp = tileset.stairsUp.clone()
    const stairsUpPosition = iter.find(visitInteriorCoords(cells, firstRoom.interiorPt), pt => iter.any(grid.visitNeighbors(cells, pt), a => a[0] === CellType.Wall))
    if (!stairsUpPosition) {
        throw new Error("Failed to place stairs up")
    }

    map.exits.set(stairsUpPosition, stairsUp)

    const lastRoom = rooms.reduce((x, y) => x.depth > y.depth ? x : y)
    const stairsDown = tileset.stairsDown.clone()
    const stairsDownPosition = iter.find(
        visitInteriorCoords(cells, lastRoom.interiorPt),
        pt => iter.any(grid.visitNeighbors(cells, pt), a => a[0] === CellType.Wall))
    if (!stairsDownPosition) {
        throw new Error("Failed to place stairs down")
    }

    map.exits.set(stairsDownPosition, stairsDown)

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
                const position = new geo.Point(x, y)
                map.tiles.set(position, tile)
            }
                break

            case CellType.Wall: {
                const tile = tileset.wall.clone()
                const position = new geo.Point(x, y)
                map.tiles.set(position, tile)
            }
                break

            case CellType.Door: {
                const fixture = tileset.door.clone()
                const position = new geo.Point(x, y)
                map.fixtures.set(position, fixture)

                const tile = tileset.floor.clone()
                const tilePosition = new geo.Point(x, y)
                map.tiles.set(tilePosition, tile)
            }
                break
        }
    }

    placeMonsters(rng, monsters, cells, rooms, map)
    placeItems(rng, items, cells, rooms, map)

    const sconcePosition = iter.find(grid.visitNeighbors(cells, stairsUpPosition), ([cell, _]) => cell === CellType.Wall)
    if (sconcePosition) {
        map.fixtures.set(sconcePosition[1], things.sconce.clone())
    }

    return map
}

function placeMonsters(rng: rand.RNG, monsters: rl.WeightedList<rl.Monster>, cells: CellGrid, rooms: Room[], map: maps.Map) {
    // iterate over rooms, decide whether to place a monster in each room
    const encounterChance = .5
    const secondEncounterChance = .2
    const thirdEncounterChance = .1

    for (const room of rooms) {
        if (room.depth <= 0) {
            continue
        }

        if (!rand.chance(rng, encounterChance)) {
            continue
        }

        tryPlaceMonster(rng, monsters, cells, room, map)

        if (!rand.chance(rng, secondEncounterChance)) {
            continue
        }

        tryPlaceMonster(rng, monsters, cells, room, map)

        if (!rand.chance(rng, thirdEncounterChance)) {
            continue
        }

        tryPlaceMonster(rng, monsters, cells, room, map)
    }
}

function tryPlaceMonster(rng: rand.RNG, monsters: rl.WeightedList<rl.Monster>, cells: CellGrid, room: Room, map: maps.Map): boolean {
    // attempt to place monster
    for (const [t, pt] of visitInterior(cells, room.interiorPt)) {
        if (t !== CellType.Interior) {
            continue
        }

        if (iter.any(map, th => (th.position?.equal(pt) ?? false) && !th.thing.passable)) {
            continue
        }

        const monster = monsters.select(rng)
        map.monsters.set(pt, monster.clone())

        return true
    }

    return false
}

function placeItems(rng: rand.RNG, items: rl.WeightedList<rl.Item>, cells: CellGrid, rooms: Room[], map: maps.Map) {
    // iterate over rooms, decide whether to place a monster in each room
    const treasureChance = .2

    for (const room of rooms) {
        if (room.depth <= 0) {
            continue
        }

        if (!rand.chance(rng, treasureChance)) {
            continue
        }

        tryPlaceTreasure(rng, items, cells, room, map)
    }
}


function tryPlaceTreasure(rng: rand.RNG, items: rl.WeightedList<rl.Item>, cells: CellGrid, room: Room, map: maps.Map): boolean {
    // attempt to place treasure
    for (const [t, pt] of visitInterior(cells, room.interiorPt)) {
        if (t !== CellType.Interior) {
            continue
        }

        if (iter.any(map, th => (th.position?.equal(pt) ?? false) && !th.thing.passable)) {
            continue
        }

        const chest = things.chest.clone()

        // choose loot
        const item = items.select(rng)
        chest.items.add(item.clone())

        // extra loot
        let extraLootChance = .5
        while (rand.chance(rng, extraLootChance)) {
            extraLootChance *= .5
            const item = items.select(rng)
            chest.items.add(item.clone())
        }

        console.log(chest)
        if (chest.items.size === 0) {
            alert("EMPTY CHEST!")
        }

        map.containers.set(pt, chest)
        return true
    }

    return false
}

function generateCellGrid(rng: rand.RNG, width: number, height: number): [CellGrid, Room[]] {
    const cells = grid.generate(width, height, () => CellType.Exterior)

    // generate room templates
    const templates = generateRoomTemplates()
    const stack: Room[] = []
    const rooms: Room[] = []

    // place initial room
    {
        rand.shuffle(rng, templates)
        const template = templates[0]

        const pt = new geo.Point(
            rand.int(rng, 0, width - template.cells.width + 1),
            rand.int(rng, 0, height - template.cells.height + 1))

        const room = placeTemplate(rng, cells, template, pt)
        stack.push(room)
        rooms.push(room)
    }

    while (stack.length > 0) {
        const room = array.pop(stack)
        const nextRoom = tryTunnelFrom(rng, cells, templates, room)

        if (nextRoom) {
            stack.push(room)
            stack.push(nextRoom)
            rooms.push(nextRoom)
        }
    }

    return [cells, rooms]
}

function tryTunnelFrom(rng: rand.RNG, cells: CellGrid, templates: RoomTemplate[], room: Room): Room | null {
    rand.shuffle(rng, templates)

    while (room.tunnelPts.length > 0) {
        const tpt = array.pop(room.tunnelPts)
        for (const template of templates) {
            const nextRoom = tryTunnelTo(rng, cells, tpt, template)
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

function tryTunnelTo(rng: rand.RNG, cells: CellGrid, tpt1: geo.Point, template: RoomTemplate): Room | null {
    // find tunnel points of template
    for (const tpt2 of template.tunnelPts) {
        const offset = tpt1.subPoint(tpt2)
        if (isValidPlacement(template.cells, cells, offset)) {
            return placeTemplate(rng, cells, template, offset)
        }
    }

    return null
}

function placeTemplate(rng: rand.RNG, cells: CellGrid, template: RoomTemplate, offset: geo.Point): Room {
    grid.copy(template.cells, cells, offset.x, offset.y)

    // find tunnelable points
    const interiorPt = template.interiorPt.addPoint(offset)
    const tunnelPts = template.tunnelPts.map(pt => pt.addPoint(offset)).filter(pt => findExteriorNeighbor(cells, pt) !== null)
    rand.shuffle(rng, tunnelPts)

    return {
        interiorPt,
        tunnelPts,
        depth: 0
    }
}

function generateRoomTemplates(): RoomTemplate[] {
    const lengths = [4, 5, 6, 7, 8, 9, 10, 11]
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

function findExteriorNeighbor(cells: CellGrid, pt: geo.Point): geo.Point | null {
    for (const [t, npt] of grid.visitNeighbors(cells, pt)) {
        if (t === CellType.Exterior) {
            return npt
        }
    }

    return null
}

function visitInteriorCoords(cells: CellGrid, pt0: geo.Point): Iterable<geo.Point> {
    return iter.map(visitInterior(cells, pt0), x => x[1])
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
        for (const [t, npt] of grid.visitNeighbors(cells, pt)) {
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

export async function generateOutdoorMap(player: rl.Player, width: number, height: number): Promise<maps.Map> {
    const map = new maps.Map(width, height)
    map.lighting = maps.Lighting.Ambient
    generateOutdoorTerrain(map)
    return map
}

enum OutdoorTileType {
    water,
    grass,
    dirt,
    sand
}

enum OutdoorFixtureType {
    none,
    hills,
    mountains,
    trees,
    snow
}

function generateOutdoorTerrain(map: maps.Map) {
    const tiles = grid.generate(map.width, map.height, () => OutdoorTileType.water)
    const fixtures = grid.generate(map.width, map.height, () => OutdoorFixtureType.none)

    // TODO - randomly bias perlin noise instead
    // const bias= rand.int(0, 256)
    const bias = 0

    const heightMap = fbm(map.width, map.height, bias, 8 / map.width, 2, .5, 8)

    imaging.scan(map.width, map.height, (x, y, offset) => {
        const h = heightMap[offset]
        if (h > 0) {
            tiles.set(x, y, OutdoorTileType.dirt)
        }
    })

    map.player.position = tiles.findPoint(t => t !== OutdoorTileType.water) ?? new geo.Point(0, 0)

    for (const [t, x, y] of tiles.scan()) {
        switch (t) {
            case (OutdoorTileType.water): {
                const tile = things.water.clone()
                map.tiles.set(new geo.Point(x, y), tile)
            }
                break

            case (OutdoorTileType.dirt): {
                const tile = things.dirt.clone()
                map.tiles.set(new geo.Point(x, y), tile)
            }
                break

            case (OutdoorTileType.grass): {
                const tile = things.grass.clone()
                map.tiles.set(new geo.Point(x, y), tile)
            }
                break

            case (OutdoorTileType.sand): {
                const tile = things.sand.clone()
                map.tiles.set(new geo.Point(x, y), tile)
            }
                break
        }
    }

    for (const [f, x, y] of fixtures.scan()) {
        switch (f) {
            case (OutdoorFixtureType.hills): {
                const fixture = things.hills.clone()
                map.fixtures.set(new geo.Point(x, y), fixture)
            }
                break

            case (OutdoorFixtureType.mountains): {
                const fixture = things.mountains.clone()
                map.fixtures.set(new geo.Point(x, y), fixture)
            }
                break

            case (OutdoorFixtureType.trees): {
                const fixture = things.trees.clone()
                map.fixtures.set(new geo.Point(x, y), fixture)
            }
                break

            case (OutdoorFixtureType.snow): {
                const fixture = things.snow.clone()
                map.fixtures.set(new geo.Point(x, y), fixture)
            }
                break
        }
    }
}

function placeLandmasses(rng: rand.RNG, tiles: grid.Grid<OutdoorTileType>) {
    const maxTiles = Math.ceil(tiles.size * rand.float(rng, .3, .5))
    growLand(rng, tiles, maxTiles)

    // find maximal water rect - if large enough, plant island
    while (true) {
        const aabb = grid.findMaximalRect(tiles, t => t === OutdoorTileType.water).shrink(1)
        if (aabb.area < 12) {
            break
        }

        const view = tiles.viewAABB(aabb)
        const islandTiles = aabb.area * rand.float(rng, .25, 1)
        growLand(rng, view, islandTiles)
    }

    // place some islands
    placeBeaches(tiles)
}

function growLand(rng: rand.RNG, tiles: grid.Grid<OutdoorTileType>, maxTiles: number) {
    // "plant" a continent
    const stack = new Array<geo.Point>()
    const seed = new geo.Point(tiles.width / 2, tiles.height / 2).floor()
    stack.push(seed)
    let placed = 0

    while (stack.length > 0 && placed < maxTiles) {
        const pt = array.pop(stack)
        tiles.setPoint(pt, OutdoorTileType.grass)
        ++placed

        for (const [t, xy] of grid.visitNeighbors(tiles, pt)) {
            if (t === OutdoorTileType.water) {
                stack.push(xy)
            }
        }

        rand.shuffle(rng, stack)
    }
}

function placeBeaches(tiles: grid.Grid<OutdoorTileType>) {
    for (const pt of grid.scan(0, 0, tiles.width, tiles.height)) {
        if (tiles.atPoint(pt) === OutdoorTileType.water) {
            continue
        }

        if (pt.x > 0 && tiles.at(pt.x - 1, pt.y) === OutdoorTileType.water) {
            tiles.setPoint(pt, OutdoorTileType.sand)
        }

        if (pt.x < tiles.width - 1 && tiles.at(pt.x + 1, pt.y) === OutdoorTileType.water) {
            tiles.setPoint(pt, OutdoorTileType.sand)
        }

        if (pt.y > 0 && tiles.at(pt.x, pt.y - 1) === OutdoorTileType.water) {
            tiles.setPoint(pt, OutdoorTileType.sand)
        }

        if (pt.y < tiles.height - 1 && tiles.at(pt.x, pt.y + 1) === OutdoorTileType.water) {
            tiles.setPoint(pt, OutdoorTileType.sand)
        }
    }
}

function placeSnow(tiles: grid.Grid<OutdoorTileType>, fixtures: grid.Grid<OutdoorFixtureType>) {
    const { width, height } = tiles
    const snowHeight = Math.ceil(height / 3)
    for (let y = 0; y < snowHeight; ++y) {
        for (let x = 0; x < width; ++x) {
            const t = tiles.at(x, y)
            if (t !== OutdoorTileType.water) {
                fixtures.set(x, y, OutdoorFixtureType.snow)
            }
        }
    }
}

function placeMountains(rng: rand.RNG, tiles: grid.Grid<OutdoorTileType>, fixtures: grid.Grid<OutdoorFixtureType>, maxTiles: number) {
    // find a suitable start point for mountain range
    const seed = rand.choose(rng, [...tiles.findPoints(x => x !== OutdoorTileType.water && x !== OutdoorTileType.sand)])
    const stack = new Array<geo.Point>()
    stack.push(seed)
    let placed = 0

    while (stack.length > 0 && placed < maxTiles) {
        const pt = array.pop(stack)
        fixtures.setPoint(pt, OutdoorFixtureType.mountains)
        ++placed

        for (const [t, xy] of grid.visitNeighbors(tiles, pt)) {
            if (t !== OutdoorTileType.water && t !== OutdoorTileType.sand) {
                stack.push(xy)
            }
        }

        rand.shuffle(rng, stack)
    }
}

function fbm(width: number, height: number, bias: number, freq: number, lacunarity: number, gain: number, octaves: number): number[] {
    return imaging.generate(width, height, (x, y) => {
        return noise.fbmPerlin2(x * freq + bias, y * freq + bias, lacunarity, gain, octaves)
    })
}

function createMonsterList(db: rl.ThingDB, floor: number): rl.WeightedList<rl.Monster> {
    // create weighted list of monsters/items appropriate for level
    const list: [rl.Monster, number][] = []
    for (const monster of db) {
        if (!(monster instanceof rl.Monster)) {
            continue
        }

        if (monster.level > floor) {
            continue
        }

        if (monster.level <= 0) {
            continue
        }

        let w = monster.freq
        let dl = Math.abs(monster.level - floor)
        if (dl > 0) {
            w /= (dl + 1)
        }

        list.push([monster, w])
    }

    return new rl.WeightedList(list)
}

function createItemList(db: rl.ThingDB, floor: number) {
    // create weighted list of monsters/items appropriate for level
    const list: [rl.Item, number][] = []
    for (const item of db) {
        if (!(item instanceof rl.Item)) {
            continue
        }

        if (item.level > floor + 1) {
            continue
        }

        if (item.level <= 0 || item.level < floor - 2) {
            continue
        }

        let w = item.freq
        let dl = Math.abs(item.level - floor)
        if (dl > 0) {
            w /= (dl + 1)
        }

        list.push([item, w])
    }

    return new rl.WeightedList(list)
}