import * as rl from "./rl.js";
import * as geo from "../shared/geo2d.js";
import * as rand from "../shared/rand.js";
import * as array from "../shared/array.js";
var RoomType;
(function (RoomType) {
    RoomType[RoomType["Hallway"] = 0] = "Hallway";
    RoomType[RoomType["Room"] = 1] = "Room";
})(RoomType || (RoomType = {}));
class Room {
    constructor(type, tiles, aabb) {
        this.type = type;
        this.tiles = tiles;
        this.aabb = aabb;
        this.depth = 0;
    }
    clone() {
        const room = new Room(this.type, this.tiles.map(t => t.clone()), this.aabb.clone());
        return room;
    }
    // translate the room (in-place)
    translate(offset) {
        this.aabb = this.aabb.translate(offset);
        for (const tile of this.tiles) {
            tile.position = tile.position.addPoint(offset);
        }
    }
}
const wall = new rl.Tile({
    position: new geo.Point(0, 0),
    name: "Brick Wall",
    image: "./assets/wall.png",
    passable: false,
    transparent: false
});
const interior = new rl.Tile({
    position: new geo.Point(0, 0),
    name: "Floor",
    image: "./assets/floor.png",
    passable: true,
    transparent: true
});
const door = new rl.Fixture({
    position: new geo.Point(0, 0),
    name: "A Closed Wooden Door",
    image: "./assets/closed.png",
    passable: true,
    transparent: true
});
const stairsUp = new rl.Thing({
    position: new geo.Point(0, 0),
    name: "Stairs Up",
    image: "./assets/up.png",
    passable: false,
    transparent: false,
});
const stairsDown = new rl.Thing({
    position: new geo.Point(0, 0),
    name: "Stairs Down",
    image: "./assets/down.png",
    passable: false,
    transparent: false,
});
export function generateMap(player, width, height) {
    const map = {
        tiles: [],
        fixtures: [],
        stairsUp: stairsUp.clone(),
        stairsDown: stairsDown.clone(),
        player: player
    };
    // create some pre-sized rooms and hallways for placement
    const roomTemplates = [5, 7, 9, 11].map(size => createRoom(RoomType.Room, size, size));
    const hallTemplates = [];
    hallTemplates.push(...[5, 5, 7, 9, 11].map(length => createRoom(RoomType.Hallway, length, 3)));
    hallTemplates.push(...[5, 5, 7, 9, 11].map(length => createRoom(RoomType.Hallway, 3, length)));
    const roomStack = [];
    const roomMap = {
        rooms: [],
        width: width,
        height: height
    };
    // place initial room
    {
        const room = rand.choose(roomTemplates).clone();
        const offset = new geo.Point(rand.int(0, width - room.aabb.width), rand.int(0, height - room.aabb.height));
        room.translate(offset);
        roomStack.push(room);
        roomMap.rooms.push(room);
    }
    // attempt to tunnel from room to room for as long as we can
    while (roomStack.length !== 0) {
        const room = array.pop(roomStack);
        const templates = room.type === RoomType.Hallway ? roomTemplates : hallTemplates;
        const placement = tryTunnel(roomMap, templates, room);
        if (placement == null) {
            continue;
        }
        const [nextRoom, pt] = placement;
        // remove wall at join point
        room.tiles = room.tiles.filter(t => !t.position.equal(pt));
        nextRoom.tiles = nextRoom.tiles.filter(t => !t.position.equal(pt));
        // add shared door at join point
        const newDoor = door.clone();
        newDoor.position = pt.clone();
        map.fixtures.push(newDoor);
        nextRoom.depth = room.depth + 1;
        roomStack.push(room);
        roomStack.push(nextRoom);
        roomMap.rooms.push(nextRoom);
    }
    // place player and up stairs
    const firstRoom = roomMap.rooms.reduce((x, y) => x.depth < y.depth ? x : y);
    const stairsUpPosition = towardCenter(firstRoom.aabb, rand.choose([...scanEdge(firstRoom.aabb)].filter(pt => !map.fixtures.some(f => f.position.equal(pt)))));
    firstRoom.tiles = firstRoom.tiles.filter(t => !t.position.equal(stairsUpPosition));
    map.stairsUp.position = stairsUpPosition;
    map.player.position = towardCenter(firstRoom.aabb, stairsUpPosition);
    // place down stairs
    const lastRoom = roomMap.rooms.reduce((x, y) => x.depth > y.depth ? x : y);
    const stairsDownPosition = towardCenter(lastRoom.aabb, rand.choose([...scanEdge(lastRoom.aabb)].filter(pt => !map.fixtures.some(f => f.position.equal(pt)))));
    lastRoom.tiles = lastRoom.tiles.filter(t => !t.position.equal(stairsDownPosition));
    map.stairsDown.position = stairsDownPosition;
    for (const room of roomMap.rooms) {
        map.tiles.push(...room.tiles);
    }
    return map;
}
function tryTunnel(roomMap, templates, room) {
    const pts = [...scanEdge(room.aabb)];
    rand.shuffle(pts);
    rand.shuffle(templates);
    for (const pt of pts) {
        for (const template of templates) {
            const room = tryConnect(roomMap, template, pt);
            if (room) {
                return [room, pt];
            }
        }
    }
    return null;
}
function tryConnect(roomMap, template, pt0) {
    const pts = [...scanEdge(template.aabb)];
    const aabb = template.aabb.shrink(1);
    rand.shuffle(pts);
    for (const pt1 of pts) {
        const translation = pt0.subPoint(pt1);
        if (!canPlaceRoom(roomMap, aabb.translate(translation))) {
            continue;
        }
        // place room and return
        const room = template.clone();
        room.translate(translation);
        return room;
    }
    return null;
}
function canPlaceRoom(roomMap, aabb) {
    const { width: mapWidth, height: mapHeight } = roomMap;
    // note - exteriors can overlap, but not interiors
    return (aabb.min.x >= 0 && aabb.min.y >= 0 &&
        aabb.max.x < mapWidth && aabb.max.y < mapHeight &&
        roomMap.rooms.every(room => !room.aabb.shrink(1).overlaps(aabb)));
}
function createRoom(type, width, height) {
    const tiles = [];
    const aabb = new geo.AABB(new geo.Point(0, 0), new geo.Point(width, height));
    for (const { x, y } of scanInterior(aabb)) {
        const tile = interior.clone();
        tile.position = new geo.Point(x, y);
        tiles.push(tile);
    }
    for (const { x, y } of scanBorder(aabb)) {
        const tile = wall.clone();
        tile.position = new geo.Point(x, y);
        tiles.push(tile);
    }
    return new Room(type, tiles, new geo.AABB(new geo.Point(0, 0), new geo.Point(width, height)));
}
function* scan(width, height) {
    const pt = new geo.Point(0, 0);
    for (let y = 0; y < height; ++y) {
        pt.y = y;
        for (let x = 0; x < width; ++x) {
            pt.x = x;
            yield pt.clone();
        }
    }
}
function* scanRect(rect) {
    // scan all border positions of the rectangle
    for (let y = rect.min.y; y < rect.max.y; ++y) {
        for (let x = rect.min.x; x < rect.max.x; ++x) {
            const pt = new geo.Point(x, y);
            yield pt;
        }
    }
}
function scanInterior(rect) {
    // scan all interior positions of the rectangle
    return scanRect(rect.shrink(1));
}
function scanEdge(rect) {
    // scan non-corner border of rect
    return array.filter(scanBorder(rect), pt => !isCorner(rect, pt));
}
function isCorner(rect, pt) {
    const l = rect.min.x;
    const t = rect.min.y;
    const r = rect.max.x - 1;
    const b = rect.max.y - 1;
    return ((pt.x === l && pt.y === t) ||
        (pt.x === l && pt.y === b) ||
        (pt.x === r && pt.y === b) ||
        (pt.x === r && pt.y === t));
}
function* scanBorder(rect) {
    // left
    for (let y = rect.min.y; y < rect.max.y - 1; ++y) {
        const pt = new geo.Point(rect.min.x, y);
        yield pt;
    }
    // bottom
    for (let x = rect.min.x; x < rect.max.x - 1; ++x) {
        const pt = new geo.Point(x, rect.max.y - 1);
        yield pt;
    }
    // right
    for (let y = rect.max.y - 1; y > rect.min.y; --y) {
        const pt = new geo.Point(rect.max.x - 1, y);
        yield pt;
    }
    // top
    for (let x = rect.max.x - 1; x > rect.min.x; --x) {
        const pt = new geo.Point(x, rect.min.y);
        yield pt;
    }
}
function* scanLeft(rect) {
    for (let y = rect.min.y; y < rect.max.y; ++y) {
        const pt = new geo.Point(rect.min.x, y);
        yield pt;
    }
}
function* scanBottom(rect) {
    for (let x = rect.min.x; x < rect.max.x; ++x) {
        const pt = new geo.Point(x, rect.max.y - 1);
        yield pt;
    }
}
function* scanRight(rect) {
    for (let y = rect.min.y; y < rect.max.y; ++y) {
        const pt = new geo.Point(rect.max.x - 1, y);
        yield pt;
    }
}
function* scanTop(rect) {
    for (let x = rect.min.x; x < rect.max.x; ++x) {
        const pt = new geo.Point(x, rect.min.y);
        yield pt;
    }
}
function towardCenter(rect, pt) {
    return pt.addPoint(rect.center.subPoint(pt).sign());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxFQUFFLE1BQU0sU0FBUyxDQUFBO0FBQzdCLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssS0FBSyxNQUFNLG9CQUFvQixDQUFBO0FBYTNDLElBQUssUUFHSjtBQUhELFdBQUssUUFBUTtJQUNULDZDQUFPLENBQUE7SUFDUCx1Q0FBSSxDQUFBO0FBQ1IsQ0FBQyxFQUhJLFFBQVEsS0FBUixRQUFRLFFBR1o7QUFRRCxNQUFNLElBQUk7SUFHTixZQUFxQixJQUFjLEVBQVMsS0FBZ0IsRUFBUyxJQUFjO1FBQTlELFNBQUksR0FBSixJQUFJLENBQVU7UUFBUyxVQUFLLEdBQUwsS0FBSyxDQUFXO1FBQVMsU0FBSSxHQUFKLElBQUksQ0FBVTtRQUY1RSxVQUFLLEdBQVcsQ0FBQyxDQUFBO0lBRStELENBQUM7SUFFeEYsS0FBSztRQUNELE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUNqQixJQUFJLENBQUMsSUFBSSxFQUNULElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQzlCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQ3BCLENBQUE7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNmLENBQUM7SUFFRCxnQ0FBZ0M7SUFDaEMsU0FBUyxDQUFDLE1BQWlCO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkMsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFB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SSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM5QyxNQUFNLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxFQUFFLENBQUE7S0FDWDtJQUVELFNBQVM7SUFDVCxLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUU7UUFDOUMsTUFBTSxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUMzQyxNQUFNLEVBQUUsQ0FBQTtLQUNYO0lBRUQsUUFBUTtJQUNSLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM5QyxNQUFNLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sRUFBRSxDQUFBO0tBQ1g7SUFFRCxNQUFNO0lBQ04sS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQzlDLE1BQU0sRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLEVBQUUsQ0FBQTtLQUNYO0FBQ0wsQ0FBQztBQUVELFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFjO0lBQzdCLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQzFDLE1BQU0sRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLEVBQUUsQ0FBQTtLQUNYO0FBQ0wsQ0FBQztBQUVELFFBQVEsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFjO0lBQy9CLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQzFDLE1BQU0sRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDM0MsTUFBTSxFQUFFLENBQUE7S0FDWDtBQUNMLENBQUM7QUFFRCxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBYztJQUM5QixLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRTtRQUMxQyxNQUFNLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sRUFBRSxDQUFBO0tBQ1g7QUFDTCxDQUFDO0FBRUQsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQWM7SUFDNUIsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUU7UUFDMUMsTUFBTSxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sRUFBRSxDQUFBO0tBQ1g7QUFDTCxDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsSUFBYyxFQUFFLEVBQWE7SUFDL0MsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7QUFDdkQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHJsIGZyb20gXCIuL3JsLmpzXCJcclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvMmQuanNcIlxyXG5pbXBvcnQgKiBhcyByYW5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiXHJcbmltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIlxyXG5cclxuLyoqXHJcbiAqIGNvbXBvbmVudHMgb2YgYSBnZW5lcmF0ZWQgbWFwIGFyZWFcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgTWFwRGF0YSB7XHJcbiAgICB0aWxlczogcmwuVGlsZVtdXHJcbiAgICBmaXh0dXJlczogcmwuRml4dHVyZVtdXHJcbiAgICBzdGFpcnNVcDogcmwuRml4dHVyZVxyXG4gICAgc3RhaXJzRG93bjogcmwuRml4dHVyZVxyXG4gICAgcGxheWVyOiBybC5QbGF5ZXJcclxufVxyXG5cclxuZW51bSBSb29tVHlwZSB7XHJcbiAgICBIYWxsd2F5LFxyXG4gICAgUm9vbVxyXG59XHJcblxyXG5pbnRlcmZhY2UgUm9vbU1hcCB7XHJcbiAgICB3aWR0aDogbnVtYmVyLFxyXG4gICAgaGVpZ2h0OiBudW1iZXIsXHJcbiAgICByb29tczogUm9vbVtdXHJcbn1cclxuXHJcbmNsYXNzIFJvb20ge1xyXG4gICAgcHVibGljIGRlcHRoOiBudW1iZXIgPSAwXHJcblxyXG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgdHlwZTogUm9vbVR5cGUsIHB1YmxpYyB0aWxlczogcmwuVGlsZVtdLCBwdWJsaWMgYWFiYjogZ2VvLkFBQkIpIHsgfVxyXG5cclxuICAgIGNsb25lKCk6IFJvb20ge1xyXG4gICAgICAgIGNvbnN0IHJvb20gPSBuZXcgUm9vbShcclxuICAgICAgICAgICAgdGhpcy50eXBlLFxyXG4gICAgICAgICAgICB0aGlzLnRpbGVzLm1hcCh0ID0+IHQuY2xvbmUoKSksXHJcbiAgICAgICAgICAgIHRoaXMuYWFiYi5jbG9uZSgpXHJcbiAgICAgICAgKVxyXG5cclxuICAgICAgICByZXR1cm4gcm9vbVxyXG4gICAgfVxyXG5cclxuICAgIC8vIHRyYW5zbGF0ZSB0aGUgcm9vbSAoaW4tcGxhY2UpXHJcbiAgICB0cmFuc2xhdGUob2Zmc2V0OiBnZW8uUG9pbnQpIHtcclxuICAgICAgICB0aGlzLmFhYmIgPSB0aGlzLmFhYmIudHJhbnNsYXRlKG9mZnNldClcclxuICAgICAgICBmb3IgKGNvbnN0IHRpbGUgb2YgdGhpcy50aWxlcykge1xyXG4gICAgICAgICAgICB0aWxlLnBvc2l0aW9uID0gdGlsZS5wb3NpdGlvbi5hZGRQb2ludChvZmZzZXQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jb25zdCB3YWxsID0gbmV3IHJsLlRpbGUoe1xyXG4gICAgcG9zaXRpb246IG5ldyBnZW8uUG9pbnQoMCwgMCksXHJcbiAgICBuYW1lOiBcIkJyaWNrIFdhbGxcIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL3dhbGwucG5nXCIsXHJcbiAgICBwYXNzYWJsZTogZmFsc2UsXHJcbiAgICB0cmFuc3BhcmVudDogZmFsc2VcclxufSlcclxuXHJcbmNvbnN0IGludGVyaW9yID0gbmV3IHJsLlRpbGUoe1xyXG4gICAgcG9zaXRpb246IG5ldyBnZW8uUG9pbnQoMCwgMCksXHJcbiAgICBuYW1lOiBcIkZsb29yXCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9mbG9vci5wbmdcIixcclxuICAgIHBhc3NhYmxlOiB0cnVlLFxyXG4gICAgdHJhbnNwYXJlbnQ6IHRydWVcclxufSlcclxuXHJcbmNvbnN0IGRvb3IgPSBuZXcgcmwuRml4dHVyZSh7XHJcbiAgICBwb3NpdGlvbjogbmV3IGdlby5Qb2ludCgwLCAwKSxcclxuICAgIG5hbWU6IFwiQSBDbG9zZWQgV29vZGVuIERvb3JcIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL2Nsb3NlZC5wbmdcIixcclxuICAgIHBhc3NhYmxlOiB0cnVlLFxyXG4gICAgdHJhbnNwYXJlbnQ6IHRydWVcclxufSlcclxuXHJcbmNvbnN0IHN0YWlyc1VwID0gbmV3IHJsLlRoaW5nKHtcclxuICAgIHBvc2l0aW9uOiBuZXcgZ2VvLlBvaW50KDAsIDApLFxyXG4gICAgbmFtZTogXCJTdGFpcnMgVXBcIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL3VwLnBuZ1wiLFxyXG4gICAgcGFzc2FibGU6IGZhbHNlLFxyXG4gICAgdHJhbnNwYXJlbnQ6IGZhbHNlLFxyXG59KVxyXG5cclxuY29uc3Qgc3RhaXJzRG93biA9IG5ldyBybC5UaGluZyh7XHJcbiAgICBwb3NpdGlvbjogbmV3IGdlby5Qb2ludCgwLCAwKSxcclxuICAgIG5hbWU6IFwiU3RhaXJzIERvd25cIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL2Rvd24ucG5nXCIsXHJcbiAgICBwYXNzYWJsZTogZmFsc2UsXHJcbiAgICB0cmFuc3BhcmVudDogZmFsc2UsXHJcbn0pXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVNYXAocGxheWVyOiBybC5QbGF5ZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogTWFwRGF0YSB7XHJcbiAgICBjb25zdCBtYXA6IE1hcERhdGEgPSB7XHJcbiAgICAgICAgdGlsZXM6IFtdLFxyXG4gICAgICAgIGZpeHR1cmVzOiBbXSxcclxuICAgICAgICBzdGFpcnNVcDogc3RhaXJzVXAuY2xvbmUoKSxcclxuICAgICAgICBzdGFpcnNEb3duOiBzdGFpcnNEb3duLmNsb25lKCksXHJcbiAgICAgICAgcGxheWVyOiBwbGF5ZXJcclxuICAgIH1cclxuXHJcbiAgICAvLyBjcmVhdGUgc29tZSBwcmUtc2l6ZWQgcm9vbXMgYW5kIGhhbGx3YXlzIGZvciBwbGFjZW1lbnRcclxuICAgIGNvbnN0IHJvb21UZW1wbGF0ZXMgPSBbNSwgNywgOSwgMTFdLm1hcChzaXplID0+IGNyZWF0ZVJvb20oUm9vbVR5cGUuUm9vbSwgc2l6ZSwgc2l6ZSkpXHJcbiAgICBjb25zdCBoYWxsVGVtcGxhdGVzID0gW11cclxuICAgIGhhbGxUZW1wbGF0ZXMucHVzaCguLi5bNSwgNSwgNywgOSwgMTFdLm1hcChsZW5ndGggPT4gY3JlYXRlUm9vbShSb29tVHlwZS5IYWxsd2F5LCBsZW5ndGgsIDMpKSlcclxuICAgIGhhbGxUZW1wbGF0ZXMucHVzaCguLi5bNSwgNSwgNywgOSwgMTFdLm1hcChsZW5ndGggPT4gY3JlYXRlUm9vbShSb29tVHlwZS5IYWxsd2F5LCAzLCBsZW5ndGgpKSlcclxuXHJcbiAgICBjb25zdCByb29tU3RhY2s6IFJvb21bXSA9IFtdXHJcbiAgICBjb25zdCByb29tTWFwOiBSb29tTWFwID0ge1xyXG4gICAgICAgIHJvb21zOiBbXSxcclxuICAgICAgICB3aWR0aDogd2lkdGgsXHJcbiAgICAgICAgaGVpZ2h0OiBoZWlnaHRcclxuICAgIH1cclxuXHJcbiAgICAvLyBwbGFjZSBpbml0aWFsIHJvb21cclxuICAgIHtcclxuICAgICAgICBjb25zdCByb29tID0gcmFuZC5jaG9vc2Uocm9vbVRlbXBsYXRlcykuY2xvbmUoKVxyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IG5ldyBnZW8uUG9pbnQoXHJcbiAgICAgICAgICAgIHJhbmQuaW50KDAsIHdpZHRoIC0gcm9vbS5hYWJiLndpZHRoKSxcclxuICAgICAgICAgICAgcmFuZC5pbnQoMCwgaGVpZ2h0IC0gcm9vbS5hYWJiLmhlaWdodCksXHJcbiAgICAgICAgKVxyXG5cclxuICAgICAgICByb29tLnRyYW5zbGF0ZShvZmZzZXQpXHJcbiAgICAgICAgcm9vbVN0YWNrLnB1c2gocm9vbSlcclxuICAgICAgICByb29tTWFwLnJvb21zLnB1c2gocm9vbSlcclxuICAgIH1cclxuXHJcbiAgICAvLyBhdHRlbXB0IHRvIHR1bm5lbCBmcm9tIHJvb20gdG8gcm9vbSBmb3IgYXMgbG9uZyBhcyB3ZSBjYW5cclxuICAgIHdoaWxlIChyb29tU3RhY2subGVuZ3RoICE9PSAwKSB7XHJcbiAgICAgICAgY29uc3Qgcm9vbSA9IGFycmF5LnBvcChyb29tU3RhY2spXHJcbiAgICAgICAgY29uc3QgdGVtcGxhdGVzID0gcm9vbS50eXBlID09PSBSb29tVHlwZS5IYWxsd2F5ID8gcm9vbVRlbXBsYXRlcyA6IGhhbGxUZW1wbGF0ZXNcclxuICAgICAgICBjb25zdCBwbGFjZW1lbnQgPSB0cnlUdW5uZWwocm9vbU1hcCwgdGVtcGxhdGVzLCByb29tKVxyXG4gICAgICAgIGlmIChwbGFjZW1lbnQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgW25leHRSb29tLCBwdF0gPSBwbGFjZW1lbnRcclxuXHJcbiAgICAgICAgLy8gcmVtb3ZlIHdhbGwgYXQgam9pbiBwb2ludFxyXG4gICAgICAgIHJvb20udGlsZXMgPSByb29tLnRpbGVzLmZpbHRlcih0ID0+ICF0LnBvc2l0aW9uLmVxdWFsKHB0KSlcclxuICAgICAgICBuZXh0Um9vbS50aWxlcyA9IG5leHRSb29tLnRpbGVzLmZpbHRlcih0ID0+ICF0LnBvc2l0aW9uLmVxdWFsKHB0KSlcclxuXHJcbiAgICAgICAgLy8gYWRkIHNoYXJlZCBkb29yIGF0IGpvaW4gcG9pbnRcclxuICAgICAgICBjb25zdCBuZXdEb29yID0gZG9vci5jbG9uZSgpXHJcbiAgICAgICAgbmV3RG9vci5wb3NpdGlvbiA9IHB0LmNsb25lKClcclxuICAgICAgICBtYXAuZml4dHVyZXMucHVzaChuZXdEb29yKVxyXG5cclxuICAgICAgICBuZXh0Um9vbS5kZXB0aCA9IHJvb20uZGVwdGggKyAxXHJcbiAgICAgICAgcm9vbVN0YWNrLnB1c2gocm9vbSlcclxuICAgICAgICByb29tU3RhY2sucHVzaChuZXh0Um9vbSlcclxuICAgICAgICByb29tTWFwLnJvb21zLnB1c2gobmV4dFJvb20pXHJcbiAgICB9XHJcblxyXG4gICAgLy8gcGxhY2UgcGxheWVyIGFuZCB1cCBzdGFpcnNcclxuICAgIGNvbnN0IGZpcnN0Um9vbSA9IHJvb21NYXAucm9vbXMucmVkdWNlKCh4LCB5KSA9PiB4LmRlcHRoIDwgeS5kZXB0aCA/IHggOiB5KVxyXG4gICAgY29uc3Qgc3RhaXJzVXBQb3NpdGlvbiA9IHRvd2FyZENlbnRlcihmaXJzdFJvb20uYWFiYiwgcmFuZC5jaG9vc2UoWy4uLnNjYW5FZGdlKGZpcnN0Um9vbS5hYWJiKV0uZmlsdGVyKHB0ID0+ICFtYXAuZml4dHVyZXMuc29tZShmID0+IGYucG9zaXRpb24uZXF1YWwocHQpKSkpKVxyXG4gICAgZmlyc3RSb29tLnRpbGVzID0gZmlyc3RSb29tLnRpbGVzLmZpbHRlcih0ID0+ICF0LnBvc2l0aW9uLmVxdWFsKHN0YWlyc1VwUG9zaXRpb24pKVxyXG4gICAgbWFwLnN0YWlyc1VwLnBvc2l0aW9uID0gc3RhaXJzVXBQb3NpdGlvblxyXG4gICAgbWFwLnBsYXllci5wb3NpdGlvbiA9IHRvd2FyZENlbnRlcihmaXJzdFJvb20uYWFiYiwgc3RhaXJzVXBQb3NpdGlvbilcclxuXHJcbiAgICAvLyBwbGFjZSBkb3duIHN0YWlyc1xyXG4gICAgY29uc3QgbGFzdFJvb20gPSByb29tTWFwLnJvb21zLnJlZHVjZSgoeCwgeSkgPT4geC5kZXB0aCA+IHkuZGVwdGggPyB4IDogeSlcclxuICAgIGNvbnN0IHN0YWlyc0Rvd25Qb3NpdGlvbiA9IHRvd2FyZENlbnRlcihsYXN0Um9vbS5hYWJiLCByYW5kLmNob29zZShbLi4uc2NhbkVkZ2UobGFzdFJvb20uYWFiYildLmZpbHRlcihwdCA9PiAhbWFwLmZpeHR1cmVzLnNvbWUoZiA9PiBmLnBvc2l0aW9uLmVxdWFsKHB0KSkpKSlcclxuICAgIGxhc3RSb29tLnRpbGVzID0gbGFzdFJvb20udGlsZXMuZmlsdGVyKHQgPT4gIXQucG9zaXRpb24uZXF1YWwoc3RhaXJzRG93blBvc2l0aW9uKSlcclxuICAgIG1hcC5zdGFpcnNEb3duLnBvc2l0aW9uID0gc3RhaXJzRG93blBvc2l0aW9uXHJcblxyXG4gICAgZm9yIChjb25zdCByb29tIG9mIHJvb21NYXAucm9vbXMpIHtcclxuICAgICAgICBtYXAudGlsZXMucHVzaCguLi5yb29tLnRpbGVzKVxyXG4gICAgfVxyXG4gXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeVR1bm5lbChyb29tTWFwOiBSb29tTWFwLCB0ZW1wbGF0ZXM6IFJvb21bXSwgcm9vbTogUm9vbSk6IFtSb29tLCBnZW8uUG9pbnRdIHwgbnVsbCB7XHJcbiAgICBjb25zdCBwdHMgPSBbLi4uc2NhbkVkZ2Uocm9vbS5hYWJiKV1cclxuICAgIHJhbmQuc2h1ZmZsZShwdHMpXHJcbiAgICByYW5kLnNodWZmbGUodGVtcGxhdGVzKVxyXG5cclxuICAgIGZvciAoY29uc3QgcHQgb2YgcHRzKSB7XHJcbiAgICAgICAgZm9yIChjb25zdCB0ZW1wbGF0ZSBvZiB0ZW1wbGF0ZXMpIHtcclxuICAgICAgICAgICAgY29uc3Qgcm9vbSA9IHRyeUNvbm5lY3Qocm9vbU1hcCwgdGVtcGxhdGUsIHB0KVxyXG4gICAgICAgICAgICBpZiAocm9vbSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFtyb29tLCBwdF1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVsbFxyXG59XHJcblxyXG5mdW5jdGlvbiB0cnlDb25uZWN0KHJvb21NYXA6IFJvb21NYXAsIHRlbXBsYXRlOiBSb29tLCBwdDA6IGdlby5Qb2ludCk6IChSb29tIHwgbnVsbCkge1xyXG4gICAgY29uc3QgcHRzID0gWy4uLnNjYW5FZGdlKHRlbXBsYXRlLmFhYmIpXVxyXG4gICAgY29uc3QgYWFiYiA9IHRlbXBsYXRlLmFhYmIuc2hyaW5rKDEpXHJcbiAgICByYW5kLnNodWZmbGUocHRzKVxyXG5cclxuICAgIGZvciAoY29uc3QgcHQxIG9mIHB0cykge1xyXG4gICAgICAgIGNvbnN0IHRyYW5zbGF0aW9uID0gcHQwLnN1YlBvaW50KHB0MSlcclxuICAgICAgICBpZiAoIWNhblBsYWNlUm9vbShyb29tTWFwLCBhYWJiLnRyYW5zbGF0ZSh0cmFuc2xhdGlvbikpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBwbGFjZSByb29tIGFuZCByZXR1cm5cclxuICAgICAgICBjb25zdCByb29tID0gdGVtcGxhdGUuY2xvbmUoKVxyXG4gICAgICAgIHJvb20udHJhbnNsYXRlKHRyYW5zbGF0aW9uKVxyXG5cclxuICAgICAgICByZXR1cm4gcm9vbVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhblBsYWNlUm9vbShyb29tTWFwOiBSb29tTWFwLCBhYWJiOiBnZW8uQUFCQik6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgeyB3aWR0aDogbWFwV2lkdGgsIGhlaWdodDogbWFwSGVpZ2h0IH0gPSByb29tTWFwXHJcblxyXG4gICAgLy8gbm90ZSAtIGV4dGVyaW9ycyBjYW4gb3ZlcmxhcCwgYnV0IG5vdCBpbnRlcmlvcnNcclxuICAgIHJldHVybiAoXHJcbiAgICAgICAgYWFiYi5taW4ueCA+PSAwICYmIGFhYmIubWluLnkgPj0gMCAmJlxyXG4gICAgICAgIGFhYmIubWF4LnggPCBtYXBXaWR0aCAmJiBhYWJiLm1heC55IDwgbWFwSGVpZ2h0ICYmXHJcbiAgICAgICAgcm9vbU1hcC5yb29tcy5ldmVyeShyb29tID0+ICFyb29tLmFhYmIuc2hyaW5rKDEpLm92ZXJsYXBzKGFhYmIpKSlcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlUm9vbSh0eXBlOiBSb29tVHlwZSwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBSb29tIHtcclxuICAgIGNvbnN0IHRpbGVzOiBybC5UaWxlW10gPSBbXVxyXG4gICAgY29uc3QgYWFiYiA9IG5ldyBnZW8uQUFCQihuZXcgZ2VvLlBvaW50KDAsIDApLCBuZXcgZ2VvLlBvaW50KHdpZHRoLCBoZWlnaHQpKVxyXG5cclxuICAgIGZvciAoY29uc3QgeyB4LCB5IH0gb2Ygc2NhbkludGVyaW9yKGFhYmIpKSB7XHJcbiAgICAgICAgY29uc3QgdGlsZSA9IGludGVyaW9yLmNsb25lKClcclxuICAgICAgICB0aWxlLnBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgIHRpbGVzLnB1c2godGlsZSlcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IHsgeCwgeSB9IG9mIHNjYW5Cb3JkZXIoYWFiYikpIHtcclxuICAgICAgICBjb25zdCB0aWxlID0gd2FsbC5jbG9uZSgpXHJcbiAgICAgICAgdGlsZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICB0aWxlcy5wdXNoKHRpbGUpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5ldyBSb29tKHR5cGUsIHRpbGVzLCBuZXcgZ2VvLkFBQkIobmV3IGdlby5Qb2ludCgwLCAwKSwgbmV3IGdlby5Qb2ludCh3aWR0aCwgaGVpZ2h0KSkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uKiBzY2FuKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogSXRlcmFibGU8Z2VvLlBvaW50PiB7XHJcbiAgICBjb25zdCBwdCA9IG5ldyBnZW8uUG9pbnQoMCwgMClcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBwdC55ID0geVxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICBwdC54ID0geFxyXG4gICAgICAgICAgICB5aWVsZCBwdC5jbG9uZSgpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiogc2NhblJlY3QocmVjdDogZ2VvLkFBQkIpOiBJdGVyYWJsZTxnZW8uUG9pbnQ+IHtcclxuICAgIC8vIHNjYW4gYWxsIGJvcmRlciBwb3NpdGlvbnMgb2YgdGhlIHJlY3RhbmdsZVxyXG4gICAgZm9yIChsZXQgeSA9IHJlY3QubWluLnk7IHkgPCByZWN0Lm1heC55OyArK3kpIHtcclxuICAgICAgICBmb3IgKGxldCB4ID0gcmVjdC5taW4ueDsgeCA8IHJlY3QubWF4Lng7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCBwdCA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgeWllbGQgcHRcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNjYW5JbnRlcmlvcihyZWN0OiBnZW8uQUFCQik6IEl0ZXJhYmxlPGdlby5Qb2ludD4ge1xyXG4gICAgLy8gc2NhbiBhbGwgaW50ZXJpb3IgcG9zaXRpb25zIG9mIHRoZSByZWN0YW5nbGVcclxuICAgIHJldHVybiBzY2FuUmVjdChyZWN0LnNocmluaygxKSlcclxufVxyXG5cclxuZnVuY3Rpb24gc2NhbkVkZ2UocmVjdDogZ2VvLkFBQkIpOiBJdGVyYWJsZTxnZW8uUG9pbnQ+IHtcclxuICAgIC8vIHNjYW4gbm9uLWNvcm5lciBib3JkZXIgb2YgcmVjdFxyXG4gICAgcmV0dXJuIGFycmF5LmZpbHRlcihzY2FuQm9yZGVyKHJlY3QpLCBwdCA9PiAhaXNDb3JuZXIocmVjdCwgcHQpKVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc0Nvcm5lcihyZWN0OiBnZW8uQUFCQiwgcHQ6IGdlby5Qb2ludCkge1xyXG4gICAgY29uc3QgbCA9IHJlY3QubWluLnhcclxuICAgIGNvbnN0IHQgPSByZWN0Lm1pbi55XHJcbiAgICBjb25zdCByID0gcmVjdC5tYXgueCAtIDFcclxuICAgIGNvbnN0IGIgPSByZWN0Lm1heC55IC0gMVxyXG5cclxuICAgIHJldHVybiAoXHJcbiAgICAgICAgKHB0LnggPT09IGwgJiYgcHQueSA9PT0gdCkgfHxcclxuICAgICAgICAocHQueCA9PT0gbCAmJiBwdC55ID09PSBiKSB8fFxyXG4gICAgICAgIChwdC54ID09PSByICYmIHB0LnkgPT09IGIpIHx8XHJcbiAgICAgICAgKHB0LnggPT09IHIgJiYgcHQueSA9PT0gdCkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uKiBzY2FuQm9yZGVyKHJlY3Q6IGdlby5BQUJCKTogSXRlcmFibGU8Z2VvLlBvaW50PiB7XHJcbiAgICAvLyBsZWZ0XHJcbiAgICBmb3IgKGxldCB5ID0gcmVjdC5taW4ueTsgeSA8IHJlY3QubWF4LnkgLSAxOyArK3kpIHtcclxuICAgICAgICBjb25zdCBwdCA9IG5ldyBnZW8uUG9pbnQocmVjdC5taW4ueCwgeSlcclxuICAgICAgICB5aWVsZCBwdFxyXG4gICAgfVxyXG5cclxuICAgIC8vIGJvdHRvbVxyXG4gICAgZm9yIChsZXQgeCA9IHJlY3QubWluLng7IHggPCByZWN0Lm1heC54IC0gMTsgKyt4KSB7XHJcbiAgICAgICAgY29uc3QgcHQgPSBuZXcgZ2VvLlBvaW50KHgsIHJlY3QubWF4LnkgLSAxKVxyXG4gICAgICAgIHlpZWxkIHB0XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcmlnaHRcclxuICAgIGZvciAobGV0IHkgPSByZWN0Lm1heC55IC0gMTsgeSA+IHJlY3QubWluLnk7IC0teSkge1xyXG4gICAgICAgIGNvbnN0IHB0ID0gbmV3IGdlby5Qb2ludChyZWN0Lm1heC54IC0gMSwgeSlcclxuICAgICAgICB5aWVsZCBwdFxyXG4gICAgfVxyXG5cclxuICAgIC8vIHRvcFxyXG4gICAgZm9yIChsZXQgeCA9IHJlY3QubWF4LnggLSAxOyB4ID4gcmVjdC5taW4ueDsgLS14KSB7XHJcbiAgICAgICAgY29uc3QgcHQgPSBuZXcgZ2VvLlBvaW50KHgsIHJlY3QubWluLnkpXHJcbiAgICAgICAgeWllbGQgcHRcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24qIHNjYW5MZWZ0KHJlY3Q6IGdlby5BQUJCKTogSXRlcmFibGU8Z2VvLlBvaW50PiB7XHJcbiAgICBmb3IgKGxldCB5ID0gcmVjdC5taW4ueTsgeSA8IHJlY3QubWF4Lnk7ICsreSkge1xyXG4gICAgICAgIGNvbnN0IHB0ID0gbmV3IGdlby5Qb2ludChyZWN0Lm1pbi54LCB5KVxyXG4gICAgICAgIHlpZWxkIHB0XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uKiBzY2FuQm90dG9tKHJlY3Q6IGdlby5BQUJCKTogSXRlcmFibGU8Z2VvLlBvaW50PiB7XHJcbiAgICBmb3IgKGxldCB4ID0gcmVjdC5taW4ueDsgeCA8IHJlY3QubWF4Lng7ICsreCkge1xyXG4gICAgICAgIGNvbnN0IHB0ID0gbmV3IGdlby5Qb2ludCh4LCByZWN0Lm1heC55IC0gMSlcclxuICAgICAgICB5aWVsZCBwdFxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiogc2NhblJpZ2h0KHJlY3Q6IGdlby5BQUJCKTogSXRlcmFibGU8Z2VvLlBvaW50PiB7XHJcbiAgICBmb3IgKGxldCB5ID0gcmVjdC5taW4ueTsgeSA8IHJlY3QubWF4Lnk7ICsreSkge1xyXG4gICAgICAgIGNvbnN0IHB0ID0gbmV3IGdlby5Qb2ludChyZWN0Lm1heC54IC0gMSwgeSlcclxuICAgICAgICB5aWVsZCBwdFxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiogc2NhblRvcChyZWN0OiBnZW8uQUFCQik6IEl0ZXJhYmxlPGdlby5Qb2ludD4ge1xyXG4gICAgZm9yIChsZXQgeCA9IHJlY3QubWluLng7IHggPCByZWN0Lm1heC54OyArK3gpIHtcclxuICAgICAgICBjb25zdCBwdCA9IG5ldyBnZW8uUG9pbnQoeCwgcmVjdC5taW4ueSlcclxuICAgICAgICB5aWVsZCBwdFxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0b3dhcmRDZW50ZXIocmVjdDogZ2VvLkFBQkIsIHB0OiBnZW8uUG9pbnQpOiBnZW8uUG9pbnQge1xyXG4gICAgcmV0dXJuIHB0LmFkZFBvaW50KHJlY3QuY2VudGVyLnN1YlBvaW50KHB0KS5zaWduKCkpXHJcbn0iXX0=