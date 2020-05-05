/**
 * map generation library
 */
import * as array from "../shared/array.js"
import * as grid from "../shared/grid.js"
import * as rnd from "../shared/rand.js"
import * as rl from "./rl.js"

const roomSizes = [5, 7, 9, 11]
const hallLengths = [5, 7, 9, 11]

enum TileType {
    Door,
    Wall,
    Interior,
    Exterior,
    Up,
    Down,
    Player,
}

enum RegionType {
    Hallway,
    Room
}

interface Region {
    rect: grid.Rect,
    nonOverlappingRect: grid.Rect,
    depth: number,
    type: RegionType
}

/**
 * components of a generated map area
 */
export interface MapData {
    tiles: rl.Tile[]
    fixtures: rl.Fixture[]
    stairsUp: rl.Fixture
    stairsDown: rl.Fixture
    player: rl.Player
}

export function generateMap(player: rl.Player, width: number, height: number): MapData {
    const rooms = generateRooms(width, height)

    const tiles: rl.Tile[] = []
    const fixtures: rl.Fixture[] = []
    let stairsUp: rl.Fixture | null = null
    let stairsDown: rl.Fixture | null = null
    let startPosition: rl.Coords | null = null

    for (const [x, y, t] of rooms.scan()) {
        switch (t) {
            case TileType.Door:
                fixtures.push({
                    position: [x, y],
                    passable: false,
                    transparent: false,
                    name: "Closed Door",
                    image: "./assets/closed.png",
                    texture: null,
                    textureLayer: null
                })
                break;

            case TileType.Wall:
                tiles.push({
                    position: [x, y],
                    passable: false,
                    transparent: false,
                    name: "Wall",
                    image: "./assets/wall.png",
                    texture: null,
                    textureLayer: null
                })
                break;

            case TileType.Interior:
                tiles.push({
                    position: [x, y],
                    passable: true,
                    transparent: true,
                    name: "Floor",
                    image: "./assets/floor.png",
                    texture: null,
                    textureLayer: null
                })
                break;

            case TileType.Up:
                stairsUp = {
                    position: [x, y],
                    passable: false,
                    transparent: false,
                    name: "Stairs Up",
                    image: "./assets/up.png",
                    texture: null,
                    textureLayer: null
                }
                break;

            case TileType.Down:
                stairsDown = {
                    position: [x, y],
                    passable: false,
                    transparent: false,
                    name: "Stairs Down",
                    image: "./assets/down.png",
                    texture: null,
                    textureLayer: null
                }
                break;

            case TileType.Player:
                startPosition = [x, y]
                break;

            case TileType.Exterior:
                break
        }
    }

    if (!stairsUp) {
        throw new Error("Stairs up were not placed")
    }

    if (!stairsDown) {
        throw new Error("Stairs down were not placed")
    }

    if (!startPosition) {
        throw new Error("Start position was not determined")
    }

    player.position = startPosition

    return {
        tiles: tiles,
        fixtures: fixtures,
        stairsUp: stairsUp,
        stairsDown: stairsDown,
        player: player
    }
}

function generateRooms(width: number, height: number): grid.Grid<TileType> {
    const grd = grid.generate(width, height, () => TileType.Exterior)
    const regionStack: Region[] = []
    const regions: Region[] = []
    const maxRooms = 128

    // place initial room
    {
        const minRoomSize = roomSizes.reduce((x, y) => x < y ? x : y)
        const maxRoomSize = roomSizes.reduce((x, y) => x > y ? x : y)
        const x = rnd.int(0, grd.width - minRoomSize)
        const y = rnd.int(0, grd.height - minRoomSize)
        const size = rnd.int(minRoomSize, Math.min(maxRoomSize, grd.width - x, grd.height - y))
        const region: Region = {
            rect: { x: x, y: y, width: size, height: size },
            nonOverlappingRect: { x: x, y: y, width: size, height: size },
            depth: 0,
            type: RegionType.Room
        }

        if (!tryPlaceRegion(grd, region)) {
            throw new Error("Failed to place initial region")
        }

        regionStack.push(region)
        regions.push(region)
    }

    let numRooms = 1
    while (true) {
        if (regionStack.length <= 0) {
            console.log("No more tunnel rooms")
            break
        }

        if (numRooms >= maxRooms) {
            console.log("Max rooms reached")
            break
        }

        // take region off of the stack
        const region = array.pop(regionStack)

        // try to tunnel from this region
        const nextRegion = tryTunnels(grd, region)
        if (!nextRegion) {
            continue
        }

        nextRegion.depth = region.depth + 1
        regionStack.push(region)
        regionStack.push(nextRegion)
        regions.push(nextRegion)

        if (nextRegion.type === RegionType.Room) {
            numRooms++
        }
    }

    // remove dead end hallways
    for (const region of regions) {
        if (region.type !== RegionType.Hallway) {
            continue
        }

        const numDoors = array.countIf(grd.iterRect(region.rect), t => t === TileType.Door)
        if (numDoors > 1) {
            continue
        }

        for (const [x, y] of grd.scanRect(region.nonOverlappingRect)) {
            grd.set(x, y, TileType.Exterior)
        }

        for (const [x, y, t] of grd.scanRect(region.rect)) {
            if (t === TileType.Door) {
                grd.set(x, y, TileType.Wall)
            }
        }
    }

    const firstRegion = regions.reduce((x, y) => x.depth < y.depth ? x : y)
    for (const [x, y, t] of grd.scanRect(firstRegion.rect)) {
        const interiorNeighbor = findInteriorNeighbor(grd, x, y)
        if (t === TileType.Wall && interiorNeighbor != null) {
            grd.set(x, y, TileType.Up)
            grd.set(interiorNeighbor[0], interiorNeighbor[1], TileType.Player)
            break
        }
    }

    const lastRegion = regions.reduce((x, y) => x.depth > y.depth ? x : y)
    for (const [x, y, t] of grd.scanRect(lastRegion.rect)) {
        if (t === TileType.Wall && hasInteriorNeighbor(grd, x, y)) {
            grd.set(x, y, TileType.Down)
            break
        }
    }

    console.log(`Placed ${numRooms} rooms`)

    return grd
}

function tryTunnels(grd: grid.Grid<TileType>, region: Region): (Region | null) {
    // try to tunnel from this room
    const tunnels: grid.Coords[] = []
    for (const [x, y] of grd.scanRect(region.rect)) {
        if (isTunnelable(grd, x, y)) {
            tunnels.push([x, y])
        }
    }

    rnd.shuffle(tunnels)

    // try each tunnelable location
    while (tunnels.length > 0) {
        // find a place to begin tunneling to next room
        const [tx, ty] = array.pop(tunnels)
        const nxy = findTunnelableNeighbor(grd, tx, ty)
        if (!nxy) {
            continue
        }

        const [nx, ny] = nxy
        const nextRegion = tryTunnel(grd, region, tx, ty, nx, ny)
        if (nextRegion) {
            return nextRegion
        }
    }

    return null
}

function tryTunnel(grd: grid.Grid<TileType>, region: Region, tx: number, ty: number, nx: number, ny: number): (Region | null) {
    switch (region.type) {
        case RegionType.Hallway:
            return tryRoom(grd, tx, ty, nx, ny)

        case RegionType.Room:
            return tryHallway(grd, tx, ty, nx, ny)
    }
}

function tryHallway(grd: grid.Grid<TileType>, tx: number, ty: number, nx: number, ny: number): (Region | null) {
    rnd.shuffle(hallLengths)
    for (const length of hallLengths) {
        // for nx / ny
        // nx === cx = vertical hallway
        // ny === cy = horizontal hallway
        const width = ny === ty ? length : 3
        const height = nx === tx ? length : 3
        const region = tryPlaceAdjacentRegion(grd, RegionType.Hallway, tx, ty, nx, ny, width, height)
        if (region) {
            return region
        }
    }

    return null
}

function tryRoom(grd: grid.Grid<TileType>, tx: number, ty: number, nx: number, ny: number): (Region | null) {
    // try placing a room here
    rnd.shuffle(roomSizes)
    for (const size of roomSizes) {
        const region = tryPlaceAdjacentRegion(grd, RegionType.Room, tx, ty, nx, ny, size, size)
        if (region) {
            return region
        }
    }

    return null
}

function tryPlaceAdjacentRegion(grd: grid.Grid<TileType>, type: RegionType, tx: number, ty: number, nx: number, ny: number, width: number, height: number): (Region | null) {
    // for nx / ny
    // nx < tx - horizontal - right to left
    // nx > tx - horizontal - left to right
    // ny < ty - vertical - bottom to top
    // ny > ty - vertical - top to bottom
    // for each case - find hallway rect, find check overlap rect
    const region: Region = {
        rect: { x: 0, y: 0, width: 0, height: 0 },
        nonOverlappingRect: { x: 0, y: 0, width: 0, height: 0 },
        depth: 0,
        type: type
    }

    if (nx < tx) {
        // right to left
        const x = tx - width + 1
        const y = ty - Math.floor(height / 2)
        region.rect = { x: x, y: y, width: width, height: height }
        region.nonOverlappingRect = { x: x, y: y, width: width - 1, height: height }
    } else if (nx > tx) {
        // left to right
        const x = tx
        const y = ty - Math.floor(height / 2)
        region.rect = { x: x, y: y, width: width, height: height }
        region.nonOverlappingRect = { x: x + 1, y: y, width: width - 1, height: height }
    } else if (ny < ty) {
        // bottom to top
        const x = tx - Math.floor(width / 2)
        const y = ty - height + 1
        region.rect = { x: x, y: y, width: width, height: height }
        region.nonOverlappingRect = { x: x, y: y, width: width, height: height - 1 }
    } else if (ny > ty) {
        // top to bottom
        const x = tx - Math.floor(width / 2)
        const y = ty
        region.rect = { x: x, y: y, width: width, height: height }
        region.nonOverlappingRect = { x: x, y: y + 1, width: width, height: height - 1 }
    } else {
        throw new Error("invalid tunnel position")
    }

    const success = tryPlaceRegion(grd, region)
    if (!success) {
        return null
    }

    grd.set(tx, ty, TileType.Door)
    return region
}

function tryPlaceRegion(grd: grid.Grid<TileType>, region: Region): boolean {
    const { x, y, width, height } = region.rect
    if (!grd.regionInBounds(x, y, width, height)) {
        return false
    }

    const { x: nx, y: ny, width: nwidth, height: nheight } = region.nonOverlappingRect
    if (!regionIsExterior(grd, nx, ny, nwidth, nheight)) {
        return false
    }

    encloseRoom(x, y, width, height, grd)
    return true
}

function isTunnelable(grid: grid.Grid<TileType>, x: number, y: number): boolean {
    return findTunnelableNeighbor(grid, x, y) != null
}

function findTunnelableNeighbor(grid: grid.Grid<TileType>, x: number, y: number): (grid.Coords | null) {
    if (x === 0 || y === 0 || x === grid.width - 1 || y === grid.height - 1) {
        return null
    }

    if (grid.at(x - 1, y) === TileType.Exterior && grid.at(x + 1, y) === TileType.Interior) {
        return [x - 1, y]
    }

    if (grid.at(x, y + 1) === TileType.Exterior && grid.at(x, y - 1) === TileType.Interior) {
        return [x, y + 1]
    }

    if (grid.at(x + 1, y) === TileType.Exterior && grid.at(x - 1, y) === TileType.Interior) {
        return [x + 1, y]
    }

    if (grid.at(x, y - 1) === TileType.Exterior && grid.at(x, y + 1) === TileType.Interior) {
        return [x, y - 1]
    }

    return null
}

function hasInteriorNeighbor(grd: grid.Grid<TileType>, x: number, y: number) {
    return findTunnelableNeighbor(grd, x, y) != null
}

function findInteriorNeighbor(grd: grid.Grid<TileType>, x: number, y: number): (grid.Coords | null) {
    if (x > 0 && grd.at(x - 1, y) === TileType.Interior) {
        return [x - 1, y]
    }

    if (y < grd.width && grd.at(x, y + 1) === TileType.Interior) {
        return [x, y + 1]
    }

    if (x < grd.width && grd.at(x + 1, y) === TileType.Interior) {
        return [x + 1, y]
    }

    if (y > 0 && grd.at(x, y - 1) === TileType.Interior) {
        return [x, y - 1]
    }

    return null
}

function encloseRoom(x0: number, y0: number, width: number, height: number, grid: grid.Grid<TileType>) {
    const r = x0 + width - 1
    const b = y0 + height - 1
    for (const [x, y] of grid.scanRegion(x0, y0, width, height)) {
        if (x === x0 || y == y0 || x === r || y === b) {
            grid.set(x, y, TileType.Wall)
            continue
        }

        grid.set(x, y, TileType.Interior)
    }
}

function regionIsExterior(grid: grid.Grid<TileType>, x0: number, y0: number, width: number, height: number): boolean {
    const exterior = array.all(grid.iterRegion(x0, y0, width, height), x => x == TileType.Exterior)
    return exterior
}