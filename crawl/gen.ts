import * as rl from "./rl.js"
import * as geo from "../shared/geo2d.js"
import * as rand from "../shared/rand.js"
import * as array from "../shared/array.js"

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

enum RoomType {
    Hallway,
    Room
}

interface RoomMap {
    width: number,
    height: number,
    rooms: Room[]
}

class Room {
    public depth: number = 0

    constructor(readonly type: RoomType, public tiles: rl.Tile[], public aabb: geo.AABB) { }

    clone(): Room {
        const room = new Room(
            this.type,
            this.tiles.map(t => t.clone()),
            this.aabb.clone()
        )

        return room
    }

    // translate the room (in-place)
    translate(offset: geo.Point) {
        this.aabb = this.aabb.translate(offset)
        for (const tile of this.tiles) {
            tile.position = tile.position.addPoint(offset)
        }
    }
}

const wall = new rl.Tile({
    position: new geo.Point(0, 0),
    name: "Brick Wall",
    image: "./assets/wall.png",
    passable: false,
    transparent: false
})

const interior = new rl.Tile({
    position: new geo.Point(0, 0),
    name: "Floor",
    image: "./assets/floor.png",
    passable: true,
    transparent: true
})

const door = new rl.Fixture({
    position: new geo.Point(0, 0),
    name: "A Closed Wooden Door",
    image: "./assets/closed.png",
    passable: true,
    transparent: true
})

const stairsUp = new rl.Thing({
    position: new geo.Point(0, 0),
    name: "Stairs Up",
    image: "./assets/up.png",
    passable: false,
    transparent: false,
})

const stairsDown = new rl.Thing({
    position: new geo.Point(0, 0),
    name: "Stairs Down",
    image: "./assets/down.png",
    passable: false,
    transparent: false,
})

export function generateMap(player: rl.Player, width: number, height: number): MapData {
    const map: MapData = {
        tiles: [],
        fixtures: [],
        stairsUp: stairsUp.clone(),
        stairsDown: stairsDown.clone(),
        player: player
    }

    // create some pre-sized rooms and hallways for placement
    const roomTemplates = [5, 7, 9, 11].map(size => createRoom(RoomType.Room, size, size))
    const hallTemplates = []
    hallTemplates.push(...[5, 5, 7, 9, 11].map(length => createRoom(RoomType.Hallway, length, 3)))
    hallTemplates.push(...[5, 5, 7, 9, 11].map(length => createRoom(RoomType.Hallway, 3, length)))

    const roomStack: Room[] = []
    const roomMap: RoomMap = {
        rooms: [],
        width: width,
        height: height
    }

    // place initial room
    {
        const room = rand.choose(roomTemplates).clone()
        const offset = new geo.Point(
            rand.int(0, width - room.aabb.width),
            rand.int(0, height - room.aabb.height),
        )

        room.translate(offset)
        roomStack.push(room)
        roomMap.rooms.push(room)
    }

    // attempt to tunnel from room to room for as long as we can
    while (roomStack.length !== 0) {
        const room = array.pop(roomStack)
        const templates = room.type === RoomType.Hallway ? roomTemplates : hallTemplates
        const placement = tryTunnel(roomMap, templates, room)
        if (placement == null) {
            continue
        }

        const [nextRoom, pt] = placement

        // remove wall at join point
        room.tiles = room.tiles.filter(t => !t.position.equal(pt))
        nextRoom.tiles = nextRoom.tiles.filter(t => !t.position.equal(pt))

        // add shared door at join point
        const newDoor = door.clone()
        newDoor.position = pt.clone()
        map.fixtures.push(newDoor)

        nextRoom.depth = room.depth + 1
        roomStack.push(room)
        roomStack.push(nextRoom)
        roomMap.rooms.push(nextRoom)
    }

    // place player and up stairs
    const firstRoom = roomMap.rooms.reduce((x, y) => x.depth < y.depth ? x : y)
    const stairsUpPosition = towardCenter(firstRoom.aabb, rand.choose([...scanEdge(firstRoom.aabb)].filter(pt => !map.fixtures.some(f => f.position.equal(pt)))))
    firstRoom.tiles = firstRoom.tiles.filter(t => !t.position.equal(stairsUpPosition))
    map.stairsUp.position = stairsUpPosition
    map.player.position = towardCenter(firstRoom.aabb, stairsUpPosition)

    // place down stairs
    const lastRoom = roomMap.rooms.reduce((x, y) => x.depth > y.depth ? x : y)
    const stairsDownPosition = towardCenter(lastRoom.aabb, rand.choose([...scanEdge(lastRoom.aabb)].filter(pt => !map.fixtures.some(f => f.position.equal(pt)))))
    lastRoom.tiles = lastRoom.tiles.filter(t => !t.position.equal(stairsDownPosition))
    map.stairsDown.position = stairsDownPosition

    for (const room of roomMap.rooms) {
        map.tiles.push(...room.tiles)
    }
 
    return map
}

function tryTunnel(roomMap: RoomMap, templates: Room[], room: Room): [Room, geo.Point] | null {
    const pts = [...scanEdge(room.aabb)]
    rand.shuffle(pts)
    rand.shuffle(templates)

    for (const pt of pts) {
        for (const template of templates) {
            const room = tryConnect(roomMap, template, pt)
            if (room) {
                return [room, pt]
            }
        }
    }

    return null
}

function tryConnect(roomMap: RoomMap, template: Room, pt0: geo.Point): (Room | null) {
    const pts = [...scanEdge(template.aabb)]
    const aabb = template.aabb.shrink(1)
    rand.shuffle(pts)

    for (const pt1 of pts) {
        const translation = pt0.subPoint(pt1)
        if (!canPlaceRoom(roomMap, aabb.translate(translation))) {
            continue
        }

        // place room and return
        const room = template.clone()
        room.translate(translation)

        return room
    }

    return null
}

function canPlaceRoom(roomMap: RoomMap, aabb: geo.AABB): boolean {
    const { width: mapWidth, height: mapHeight } = roomMap

    // note - exteriors can overlap, but not interiors
    return (
        aabb.min.x >= 0 && aabb.min.y >= 0 &&
        aabb.max.x < mapWidth && aabb.max.y < mapHeight &&
        roomMap.rooms.every(room => !room.aabb.shrink(1).overlaps(aabb)))
}

function createRoom(type: RoomType, width: number, height: number): Room {
    const tiles: rl.Tile[] = []
    const aabb = new geo.AABB(new geo.Point(0, 0), new geo.Point(width, height))

    for (const { x, y } of scanInterior(aabb)) {
        const tile = interior.clone()
        tile.position = new geo.Point(x, y)
        tiles.push(tile)
    }

    for (const { x, y } of scanBorder(aabb)) {
        const tile = wall.clone()
        tile.position = new geo.Point(x, y)
        tiles.push(tile)
    }

    return new Room(type, tiles, new geo.AABB(new geo.Point(0, 0), new geo.Point(width, height)))
}

function* scan(width: number, height: number): Iterable<geo.Point> {
    const pt = new geo.Point(0, 0)
    for (let y = 0; y < height; ++y) {
        pt.y = y
        for (let x = 0; x < width; ++x) {
            pt.x = x
            yield pt.clone()
        }
    }
}

function* scanRect(rect: geo.AABB): Iterable<geo.Point> {
    // scan all border positions of the rectangle
    for (let y = rect.min.y; y < rect.max.y; ++y) {
        for (let x = rect.min.x; x < rect.max.x; ++x) {
            const pt = new geo.Point(x, y)
            yield pt
        }
    }
}

function scanInterior(rect: geo.AABB): Iterable<geo.Point> {
    // scan all interior positions of the rectangle
    return scanRect(rect.shrink(1))
}

function scanEdge(rect: geo.AABB): Iterable<geo.Point> {
    // scan non-corner border of rect
    return array.filter(scanBorder(rect), pt => !isCorner(rect, pt))
}

function isCorner(rect: geo.AABB, pt: geo.Point) {
    const l = rect.min.x
    const t = rect.min.y
    const r = rect.max.x - 1
    const b = rect.max.y - 1

    return (
        (pt.x === l && pt.y === t) ||
        (pt.x === l && pt.y === b) ||
        (pt.x === r && pt.y === b) ||
        (pt.x === r && pt.y === t))
}

function* scanBorder(rect: geo.AABB): Iterable<geo.Point> {
    // left
    for (let y = rect.min.y; y < rect.max.y - 1; ++y) {
        const pt = new geo.Point(rect.min.x, y)
        yield pt
    }

    // bottom
    for (let x = rect.min.x; x < rect.max.x - 1; ++x) {
        const pt = new geo.Point(x, rect.max.y - 1)
        yield pt
    }

    // right
    for (let y = rect.max.y - 1; y > rect.min.y; --y) {
        const pt = new geo.Point(rect.max.x - 1, y)
        yield pt
    }

    // top
    for (let x = rect.max.x - 1; x > rect.min.x; --x) {
        const pt = new geo.Point(x, rect.min.y)
        yield pt
    }
}

function* scanLeft(rect: geo.AABB): Iterable<geo.Point> {
    for (let y = rect.min.y; y < rect.max.y; ++y) {
        const pt = new geo.Point(rect.min.x, y)
        yield pt
    }
}

function* scanBottom(rect: geo.AABB): Iterable<geo.Point> {
    for (let x = rect.min.x; x < rect.max.x; ++x) {
        const pt = new geo.Point(x, rect.max.y - 1)
        yield pt
    }
}

function* scanRight(rect: geo.AABB): Iterable<geo.Point> {
    for (let y = rect.min.y; y < rect.max.y; ++y) {
        const pt = new geo.Point(rect.max.x - 1, y)
        yield pt
    }
}

function* scanTop(rect: geo.AABB): Iterable<geo.Point> {
    for (let x = rect.min.x; x < rect.max.x; ++x) {
        const pt = new geo.Point(x, rect.min.y)
        yield pt
    }
}

function towardCenter(rect: geo.AABB, pt: geo.Point): geo.Point {
    return pt.addPoint(rect.center.subPoint(pt).sign())
}