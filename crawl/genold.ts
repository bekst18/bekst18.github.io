/**
 * map generation library
 */
import * as array from "../shared/array.js"
import * as grid from "../shared/grid.js"
import * as rnd from "../shared/rand.js"

const roomSizes = [5, 7, 9, 11]
const hallLengths = [5, 7, 9, 11]

enum TileType {
    Door,
    Wall,
    Interior,
    Exterior
}

enum RegionType {
    Hallway,
    Room
}

interface Rect {
    x: number,
    y: number,
    width: number,
    height: number
}

interface Region {
    region: Rect,
    nonOverlappingRegion: Rect,
    depth: number,
    type: RegionType
}

type Coords = [number, number]

interface Tunnel {
    type: RegionType
    coords: Coords
}

interface Thing {
    name: string
    image: string
}

interface Tile {
    things: Thing[]
}

export function generateMap(width: number, height: number): grid.Grid<Tile> {
    const rooms = generateRooms(width, height)
    const map = new grid.Grid<Tile>(width, height, () => ({ things: [] }))

    rooms.scan((x, y, type) => {
        switch (type) {
            case TileType.Door:
                map.at(x, y).things.push({
                    name: "Door",
                    image: "./assets/closed.png"
                })
                break;

            case TileType.Wall:
                map.at(x, y).things.push({
                    name: "Door",
                    image: "./assets/wall.png"
                })
                break;

            case TileType.Interior:
                map.at(x, y).things.push({
                    name: "Door",
                    image: "./assets/floor.png"
                })
                break;
        }
    })

    return map
}

export function* iterThings(grd: grid.Grid<Tile>) {
    for (const tile of grd) {
        for (const thing of tile.things) {
            yield thing
        }
    }
}

function generateRooms(width: number, height: number): grid.Grid<TileType> {
    const grd = new grid.Grid<TileType>(width, height, () => TileType.Exterior)
    const connect: Tunnel[] = []
    const maxRooms = 32

    // place initial room
    {
        const minRoomSize = roomSizes.reduce((x, y) => x < y ? x : y)
        const maxRoomSize = roomSizes.reduce((x, y) => x > y ? x : y)
        const x = rnd.int(0, grd.width - minRoomSize)
        const y = rnd.int(0, grd.height - minRoomSize)
        const size = rnd.int(minRoomSize, Math.min(maxRoomSize, grd.width - x, grd.height - y))
        placeRoom(RegionType.Room, x, y, size, size, grd, connect)
    }

    let numRooms = 1
    while (true) {
        if (connect.length == 0) {
            break
        }

        if (numRooms >= maxRooms) {
            break
        }

        // find a place to begin tunneling to next room
        const { type, coords: [cx, cy] } = array.pop(connect)
        const nxy = findTunnelableNeighbor(grd, cx, cy)
        if (!nxy) {
            continue
        }

        const [nx, ny] = nxy

        if (type == RegionType.Hallway) {
            // try placing a room here
            if (tryRoom(grd, connect, cx, cy, nx, ny)) {
                numRooms++
            }
        } else {
            tryHallway(grd, connect, cx, cy, nx, ny)
        }
    }

    console.log(`Placed ${numRooms} rooms`)

    return grd
}

function tryHallway(grd: grid.Grid<TileType>, connect: Tunnel[], cx: number, cy: number, nx: number, ny: number): boolean {
    rnd.shuffle(hallLengths)
    for (const length of hallLengths) {
        if (tryPlaceHallway(grd, connect, cx, cy, nx, ny, length)) {
            return true
        }
    }

    return false
}

function tryRoom(grd: grid.Grid<TileType>, connect: Tunnel[], cx: number, cy: number, nx: number, ny: number): boolean {
    // try placing a room here
    rnd.shuffle(roomSizes)
    for (const size of roomSizes) {
        if (tryPlaceRegion(grd, RegionType.Room, connect, cx, cy, nx, ny, size, size)) {
            return true
        }
    }

    return false
}

function tryPlaceHallway(grd: grid.Grid<TileType>, connect: Tunnel[], cx: number, cy: number, nx: number, ny: number, length: number): boolean {
    // for nx / ny
    // nx === cx = vertical hallway
    // ny === cy = horizontal hallway
    const width = ny === cy ? length : 3
    const height = nx === cx ? length : 3
    return tryPlaceRegion(grd, RegionType.Hallway, connect, cx, cy, nx, ny, width, height)
}

function tryPlaceRegion(grd: grid.Grid<TileType>, type: RegionType, connect: Tunnel[], cx: number, cy: number, nx: number, ny: number, width: number, height: number): boolean {
    // for nx / ny
    // nx < cx - horizontal - right to left
    // nx > cx - horizontal - left to right
    // ny < cy - vertical - bottom to top
    // ny > cy - vertical - top to bottom
    // for each case - find hallway rect, find check overlap rect
    if (nx < cx) {
        // right to left
        const x = cx - width + 1
        const y = cy - Math.floor(height / 2)

        if (!grd.regionInBounds(x, y, width, height)) {
            return false
        }

        if (!regionIsExterior(grd, x, y, width - 1, height)) {
            return false
        }

        placeRoom(type, x, y, width, height, grd, connect)
    } else if (nx > cx) {
        // left to right
        const x = cx
        const y = cy - Math.floor(height / 2)

        if (!grd.regionInBounds(x, y, width, height)) {
            return false
        }

        if (!regionIsExterior(grd, x + 1, y, width - 1, height)) {
            return false
        }

        placeRoom(type, x, y, width, height, grd, connect)
    } else if (ny < cy) {
        // bottom to top
        const x = cx - Math.floor(width / 2)
        const y = cy - height + 1

        if (!grd.regionInBounds(x, y, width, height)) {
            return false
        }

        if (!regionIsExterior(grd, x, y, width, height - 1)) {
            return false
        }

        placeRoom(type, x, y, width, height, grd, connect)
    } else if (ny > cy) {
        // top to bottom
        const x = cx - Math.floor(width / 2)
        const y = cy

        if (!grd.regionInBounds(x, y, width, height)) {
            return false
        }

        if (!regionIsExterior(grd, x, y + 1, width, height - 1)) {
            return false
        }

        placeRoom(type, x, y, width, height, grd, connect)
    } else {
        throw new Error("invalid tunnel position")
    }

    grd.set(cx, cy, TileType.Door)
    return true
}

function placeRoom(type: RegionType, x: number, y: number, width: number, height: number, grid: grid.Grid<TileType>, connect: Tunnel[]) {
    // place the room, find potential connection points
    encloseRoom(x, y, width, height, grid)

    const roomConnect: Tunnel[] = []
    grid.scanRegion(x, y, width, height, (x, y) => {
        if (isTunnelable(grid, x, y)) {
            roomConnect.push({
                type: type,
                coords: [x, y]
            })
        }
    })

    rnd.shuffle(roomConnect)
    connect.push(...roomConnect)
}

function isTunnelable(grid: grid.Grid<TileType>, x: number, y: number): boolean {
    return findTunnelableNeighbor(grid, x, y) != null
}

function findTunnelableNeighbor(grid: grid.Grid<TileType>, x: number, y: number): (Coords | null) {
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

function encloseRoom(x0: number, y0: number, width: number, height: number, grid: grid.Grid<TileType>) {
    const r = x0 + width - 1
    const b = y0 + height - 1

    grid.scanRegion(x0, y0, width, height, (x, y) => {
        if (x === x0 || y == y0 || x === r || y === b) {
            grid.set(x, y, TileType.Wall)
            return
        }

        grid.set(x, y, TileType.Interior)
    })
}

function regionIsExterior(grid: grid.Grid<TileType>, x0: number, y0: number, width: number, height: number): boolean {
    const exterior = array.all(grid.iterRegion(x0, y0, width, height), x => x == TileType.Exterior)
    return exterior
}