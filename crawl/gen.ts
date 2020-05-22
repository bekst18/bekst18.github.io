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
import * as gfx from "./gfx.js"
import * as dom from "../shared/dom.js"
import { scanRegion } from "../shared/imaging.js"

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

const loot = [
    things.clothArmor.clone(),
    things.sharpStick.clone(),
    things.dagger.clone(),
    things.leatherArmor.clone(),
    things.woodenBow.clone(),
    things.slingShot.clone(),
    things.weakHealthPotion.clone(),
    things.healthPotion.clone()
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

export async function generateDungeonLevel(renderer: gfx.Renderer, player: rl.Player, width: number, height: number): Promise<maps.Map> {
    const map = generateMapRooms(width, height, player)
    map.lighting = maps.Lighting.None
    await loadSpriteTextures(renderer, map)
    return map
}

function generateMapRooms(width: number, height: number, player: rl.Player): maps.Map {
    const map = new maps.Map(width, height, player)
    const minRooms = 4

    const [cells, rooms] = (() => {
        while (true) {
            const [cells, rooms] = generateCellGrid(width, height)
            if (rooms.length > minRooms) {
                return [cells, rooms]
            }
        }
    })() as [CellGrid, Room[]]

    const firstRoom = rooms.reduce((x, y) => x.depth < y.depth ? x : y)
    map.player.position = firstRoom.interiorPt.clone()

    const stairsUp = tileset.stairsUp.clone()
    const stairsUpPosition = iter.find(visitInteriorCoords(cells, firstRoom.interiorPt), pt => iter.any(grid.visitNeighbors(cells, pt), a => a[0] === CellType.Wall))
    if (!stairsUpPosition) {
        throw new Error("Failed to place stairs up")
    }
    stairsUp.position = stairsUpPosition.clone()
    map.fixtures.add(stairsUp)

    const lastRoom = rooms.reduce((x, y) => x.depth > y.depth ? x : y)
    const stairsDown = tileset.stairsDown.clone()
    const stairsDownPosition = iter.find(visitInteriorCoords(cells, lastRoom.interiorPt), pt => iter.any(grid.visitNeighbors(cells, pt), a => a[0] === CellType.Wall))
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
    const encounterChance = .25
    const secondEncounterChance = .2
    const thirdEncounterChance = .1

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

        if (iter.any(map, th => (th.position?.equal(pt) ?? false) && !th.passable)) {
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
    const treasureChance = .2

    for (const room of rooms) {
        if (!rand.chance(treasureChance)) {
            continue
        }

        tryPlaceTreasure(cells, room, map)
    }
}


function tryPlaceTreasure(cells: CellGrid, room: Room, map: maps.Map): boolean {
    // attempt to place treasure
    for (const [t, pt] of visitInterior(cells, room.interiorPt)) {
        if (t !== CellType.Interior) {
            continue
        }

        if (iter.any(map, th => (th.position?.equal(pt) ?? false) && !th.passable)) {
            continue
        }

        const chest = things.chest.clone()
        chest.position = pt.clone()

        // choose loot
        const item = rand.choose(loot)
        chest.items.add(item)

        // extra loot
        let extraLootChance = .5
        while (rand.chance(extraLootChance)) {
            extraLootChance *= .5
            const item = rand.choose(loot)
            chest.items.add(item)
        }

        map.containers.add(chest)
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

export async function generateOutdoorMap(renderer: gfx.Renderer, player: rl.Player, width: number, height: number): Promise<maps.Map> {
    const map = new maps.Map(width, height, player)
    map.lighting = maps.Lighting.Ambient

    player.position = new geo.Point(0, 0)
    generateOutdoorTerrain(map)
    await loadSpriteTextures(renderer, map)
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
    placeLandmasses(tiles)
    placeSnow(tiles, fixtures)

    map.player.position = tiles.findPoint(t => t === OutdoorTileType.grass) ?? new geo.Point(0, 0)

    for (const [t, x, y] of tiles.scan()) {
        switch (t) {
            case (OutdoorTileType.water): {
                const tile = things.water.clone()
                tile.position = new geo.Point(x, y)
                map.tiles.add(tile)
            }
                break

            case (OutdoorTileType.dirt): {
                const tile = things.dirt.clone()
                tile.position = new geo.Point(x, y)
                map.tiles.add(tile)
            }
                break

            case (OutdoorTileType.grass): {
                const tile = things.grass.clone()
                tile.position = new geo.Point(x, y)
                map.tiles.add(tile)
            }
                break

            case (OutdoorTileType.sand): {
                const tile = things.sand.clone()
                tile.position = new geo.Point(x, y)
                map.tiles.add(tile)
            }
                break
        }
    }

    for (const [f, x, y] of fixtures.scan()) {
        switch (f) {
            case (OutdoorFixtureType.hills): {
                const fixture = things.hills.clone()
                fixture.position = new geo.Point(x, y)
                map.fixtures.add(fixture)
            }
                break

            case (OutdoorFixtureType.mountains): {
                const fixture = things.mountains.clone()
                fixture.position = new geo.Point(x, y)
                map.fixtures.add(fixture)
            }
                break

            case (OutdoorFixtureType.trees): {
                const fixture = things.trees.clone()
                fixture.position = new geo.Point(x, y)
                map.fixtures.add(fixture)
            }
                break

            case (OutdoorFixtureType.snow): {
                const fixture = things.snow.clone()
                fixture.position = new geo.Point(x, y)
                map.fixtures.add(fixture)
            }
                break
        }
    }
}

function placeLandmasses(tiles: grid.Grid<OutdoorTileType>) {
    const maxTiles = Math.ceil(tiles.size * rand.float(.3, .5))
    growLand(tiles, maxTiles)

    // find maximal water rect - if large enough, plant island
    while (true) {
        const aabb = grid.findMaximalRect(tiles, t => t === OutdoorTileType.water).shrink(1)
        if (aabb.area < 12) {
            break
        }

        const view = tiles.viewAABB(aabb)
        const islandTiles = aabb.area * rand.float(.25, 1)
        growLand(view, islandTiles)
    }

    // place some islands
    placeBeaches(tiles)
}

function growLand(tiles: grid.Grid<OutdoorTileType>, maxTiles: number) {
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

        rand.shuffle(stack)
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

export async function loadSpriteTextures(renderer: gfx.Renderer, map: maps.Map): Promise<void> {
    // bake all 24x24 tile images to a single array texture
    // store mapping from image url to index
    const imageUrls = iter.wrap(map).map(th => th.image).filter().distinct().toArray()
    const layerMap = new Map<string, number>(imageUrls.map((url, i) => [url, i]))
    const images = await Promise.all(imageUrls.map(url => dom.loadImage(url)))
    const texture = renderer.bakeTextureArray(rl.tileSize, rl.tileSize, images)

    for (const th of map) {
        if (!th.image) {
            th.textureLayer = -1
            th.texture = null
            continue
        }

        const layer = layerMap.get(th.image)
        if (layer === undefined) {
            throw new Error(`texture index not found for ${th.image}`)
        }

        th.texture = texture
        th.textureLayer = layer
    }
}
