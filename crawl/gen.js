/**
 * map generation library
 */
import * as array from "../shared/array.js";
import * as grid from "../shared/grid.js";
import * as rnd from "../shared/rand.js";
const roomSizes = [5, 7, 9, 11];
const hallLengths = [5, 7, 9, 11];
var TileType;
(function (TileType) {
    TileType[TileType["Door"] = 0] = "Door";
    TileType[TileType["Wall"] = 1] = "Wall";
    TileType[TileType["Interior"] = 2] = "Interior";
    TileType[TileType["Exterior"] = 3] = "Exterior";
})(TileType || (TileType = {}));
var RegionType;
(function (RegionType) {
    RegionType[RegionType["Hallway"] = 0] = "Hallway";
    RegionType[RegionType["Room"] = 1] = "Room";
})(RegionType || (RegionType = {}));
export function generateMap(width, height) {
    const rooms = generateRooms(width, height);
    const map = new grid.Grid(width, height, () => ({ things: [] }));
    rooms.scan((x, y, type) => {
        switch (type) {
            case TileType.Door:
                map.at(x, y).things.push({
                    name: "Door",
                    image: "./assets/closed.png"
                });
                break;
            case TileType.Wall:
                map.at(x, y).things.push({
                    name: "Door",
                    image: "./assets/wall.png"
                });
                break;
            case TileType.Interior:
                map.at(x, y).things.push({
                    name: "Door",
                    image: "./assets/floor.png"
                });
                break;
        }
    });
    return map;
}
export function* iterThings(grd) {
    for (const tile of grd) {
        for (const thing of tile.things) {
            yield thing;
        }
    }
}
function generateRooms(width, height) {
    const grd = new grid.Grid(width, height, () => TileType.Exterior);
    const regions = [];
    const maxRooms = 32;
    // place initial room
    {
        const minRoomSize = roomSizes.reduce((x, y) => x < y ? x : y);
        const maxRoomSize = roomSizes.reduce((x, y) => x > y ? x : y);
        const x = rnd.int(0, grd.width - minRoomSize);
        const y = rnd.int(0, grd.height - minRoomSize);
        const size = rnd.int(minRoomSize, Math.min(maxRoomSize, grd.width - x, grd.height - y));
        placeRoom(RegionType.Room, x, y, size, size, grd, connect);
    }
    let numRooms = 1;
    while (true) {
        if (connect.length == 0) {
            break;
        }
        if (numRooms >= maxRooms) {
            break;
        }
        // find a place to begin tunneling to next room
        const { type, coords: [cx, cy] } = array.pop(connect);
        const nxy = findTunnelableNeighbor(grd, cx, cy);
        if (!nxy) {
            continue;
        }
        const [nx, ny] = nxy;
        if (type == RegionType.Hallway) {
            // try placing a room here
            if (tryRoom(grd, connect, cx, cy, nx, ny)) {
                numRooms++;
            }
        }
        else {
            tryHallway(grd, connect, cx, cy, nx, ny);
        }
    }
    console.log(`Placed ${numRooms} rooms`);
    return grd;
}
function tryHallway(grd, connect, cx, cy, nx, ny) {
    rnd.shuffle(hallLengths);
    for (const length of hallLengths) {
        if (tryPlaceHallway(grd, connect, cx, cy, nx, ny, length)) {
            return true;
        }
    }
    return false;
}
function tryRoom(grd, connect, cx, cy, nx, ny) {
    // try placing a room here
    rnd.shuffle(roomSizes);
    for (const size of roomSizes) {
        if (tryPlaceRegion(grd, RegionType.Room, connect, cx, cy, nx, ny, size, size)) {
            return true;
        }
    }
    return false;
}
function tryPlaceHallway(grd, connect, cx, cy, nx, ny, length) {
    // for nx / ny
    // nx === cx = vertical hallway
    // ny === cy = horizontal hallway
    const width = ny === cy ? length : 3;
    const height = nx === cx ? length : 3;
    return tryPlaceRegion(grd, RegionType.Hallway, connect, cx, cy, nx, ny, width, height);
}
function tryPlaceRegion(grd, type, connect, cx, cy, nx, ny, width, height) {
    // for nx / ny
    // nx < cx - horizontal - right to left
    // nx > cx - horizontal - left to right
    // ny < cy - vertical - bottom to top
    // ny > cy - vertical - top to bottom
    // for each case - find hallway rect, find check overlap rect
    if (nx < cx) {
        // right to left
        const x = cx - width + 1;
        const y = cy - Math.floor(height / 2);
        if (!grd.regionInBounds(x, y, width, height)) {
            return false;
        }
        if (!regionIsExterior(grd, x, y, width - 1, height)) {
            return false;
        }
        placeRoom(type, x, y, width, height, grd, connect);
    }
    else if (nx > cx) {
        // left to right
        const x = cx;
        const y = cy - Math.floor(height / 2);
        if (!grd.regionInBounds(x, y, width, height)) {
            return false;
        }
        if (!regionIsExterior(grd, x + 1, y, width - 1, height)) {
            return false;
        }
        placeRoom(type, x, y, width, height, grd, connect);
    }
    else if (ny < cy) {
        // bottom to top
        const x = cx - Math.floor(width / 2);
        const y = cy - height + 1;
        if (!grd.regionInBounds(x, y, width, height)) {
            return false;
        }
        if (!regionIsExterior(grd, x, y, width, height - 1)) {
            return false;
        }
        placeRoom(type, x, y, width, height, grd, connect);
    }
    else if (ny > cy) {
        // top to bottom
        const x = cx - Math.floor(width / 2);
        const y = cy;
        if (!grd.regionInBounds(x, y, width, height)) {
            return false;
        }
        if (!regionIsExterior(grd, x, y + 1, width, height - 1)) {
            return false;
        }
        placeRoom(type, x, y, width, height, grd, connect);
    }
    else {
        throw new Error("invalid tunnel position");
    }
    grd.set(cx, cy, TileType.Door);
    return true;
}
function placeRoom(type, x, y, width, height, grid, connect) {
    // place the room, find potential connection points
    encloseRoom(x, y, width, height, grid);
    const roomConnect = [];
    grid.scanRegion(x, y, width, height, (x, y) => {
        if (isTunnelable(grid, x, y)) {
            roomConnect.push({
                type: type,
                coords: [x, y]
            });
        }
    });
    rnd.shuffle(roomConnect);
    connect.push(...roomConnect);
}
function isTunnelable(grid, x, y) {
    return findTunnelableNeighbor(grid, x, y) != null;
}
function findTunnelableNeighbor(grid, x, y) {
    if (x === 0 || y === 0 || x === grid.width - 1 || y === grid.height - 1) {
        return null;
    }
    if (grid.at(x - 1, y) === TileType.Exterior && grid.at(x + 1, y) === TileType.Interior) {
        return [x - 1, y];
    }
    if (grid.at(x, y + 1) === TileType.Exterior && grid.at(x, y - 1) === TileType.Interior) {
        return [x, y + 1];
    }
    if (grid.at(x + 1, y) === TileType.Exterior && grid.at(x - 1, y) === TileType.Interior) {
        return [x + 1, y];
    }
    if (grid.at(x, y - 1) === TileType.Exterior && grid.at(x, y + 1) === TileType.Interior) {
        return [x, y - 1];
    }
    return null;
}
function encloseRoom(x0, y0, width, height, grid) {
    const r = x0 + width - 1;
    const b = y0 + height - 1;
    grid.scanRegion(x0, y0, width, height, (x, y) => {
        if (x === x0 || y == y0 || x === r || y === b) {
            grid.set(x, y, TileType.Wall);
            return;
        }
        grid.set(x, y, TileType.Interior);
    });
}
function regionIsExterior(grid, x0, y0, width, height) {
    const exterior = array.all(grid.iterRegion(x0, y0, width, height), x => x == TileType.Exterior);
    return exterior;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0gsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0sbUJBQW1CLENBQUE7QUFFeEMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtBQUMvQixNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0FBRWpDLElBQUssUUFLSjtBQUxELFdBQUssUUFBUTtJQUNULHVDQUFJLENBQUE7SUFDSix1Q0FBSSxDQUFBO0lBQ0osK0NBQVEsQ0FBQTtJQUNSLCtDQUFRLENBQUE7QUFDWixDQUFDLEVBTEksUUFBUSxLQUFSLFFBQVEsUUFLWjtBQUVELElBQUssVUFHSjtBQUhELFdBQUssVUFBVTtJQUNYLGlEQUFPLENBQUE7SUFDUCwyQ0FBSSxDQUFBO0FBQ1IsQ0FBQyxFQUhJLFVBQVUsS0FBVixVQUFVLFFBR2Q7QUFnQ0QsTUFBTSxVQUFVLFdBQVcsQ0FBQyxLQUFhLEVBQUUsTUFBYztJQUNyRCxNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzFDLE1BQU0sR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBTyxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBRXRFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ3RCLFFBQVEsSUFBSSxFQUFFO1lBQ1YsS0FBSyxRQUFRLENBQUMsSUFBSTtnQkFDZCxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNyQixJQUFJLEVBQUUsTUFBTTtvQkFDWixLQUFLLEVBQUUscUJBQXFCO2lCQUMvQixDQUFDLENBQUE7Z0JBQ0YsTUFBTTtZQUVWLEtBQUssUUFBUSxDQUFDLElBQUk7Z0JBQ2QsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDckIsSUFBSSxFQUFFLE1BQU07b0JBQ1osS0FBSyxFQUFFLG1CQUFtQjtpQkFDN0IsQ0FBQyxDQUFBO2dCQUNGLE1BQU07WUFFVixLQUFLLFFBQVEsQ0FBQyxRQUFRO2dCQUNsQixHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNyQixJQUFJLEVBQUUsTUFBTTtvQkFDWixLQUFLLEVBQUUsb0JBQW9CO2lCQUM5QixDQUFDLENBQUE7Z0JBQ0YsTUFBTTtTQUNiO0lBQ0wsQ0FBQyxDQUFDLENBQUE7SUFFRixPQUFPLEdBQUcsQ0FBQTtBQUNkLENBQUM7QUFFRCxNQUFNLFNBQVMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFvQjtJQUM1QyxLQUFLLE1BQU0sSUFBSSxJQUFJLEdBQUcsRUFBRTtRQUNwQixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDN0IsTUFBTSxLQUFLLENBQUE7U0FDZDtLQUNKO0FBQ0wsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEtBQWEsRUFBRSxNQUFjO0lBQ2hELE1BQU0sR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBVyxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMzRSxNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUE7SUFDNUIsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFBO0lBRW5CLHFCQUFxQjtJQUNyQjtRQUNJLE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdELE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQTtRQUM5QyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkYsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQTtLQUM3RDtJQUVELElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQTtJQUNoQixPQUFPLElBQUksRUFBRTtRQUNULElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7WUFDckIsTUFBSztTQUNSO1FBRUQsSUFBSSxRQUFRLElBQUksUUFBUSxFQUFFO1lBQ3RCLE1BQUs7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QUFDLEtBQUssUUFBUSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssUUFBUSxDQUFDLFFBQVEsRUFBRTtRQUNwRixPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtLQUNwQjtJQUVELElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxRQUFRLEVBQUU7UUFDcEYsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7S0FDcEI7SUFFRCxPQUFPLElBQUksQ0FBQTtBQUNmLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxFQUFVLEVBQUUsRUFBVSxFQUFFLEtBQWEsRUFBRSxNQUFjLEVBQUUsSUFBeUI7SUFDakcsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUE7SUFDeEIsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFFekIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDNUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQzNDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0IsT0FBTTtTQUNUO1FBRUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNyQyxDQUFDLENBQUMsQ0FBQTtBQUNOLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQXlCLEVBQUUsRUFBVSxFQUFFLEVBQVUsRUFBRSxLQUFhLEVBQUUsTUFBYztJQUN0RyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQy9GLE9BQU8sUUFBUSxDQUFBO0FBQ25CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogbWFwIGdlbmVyYXRpb24gbGlicmFyeVxyXG4gKi9cclxuaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiXHJcbmltcG9ydCAqIGFzIGdyaWQgZnJvbSBcIi4uL3NoYXJlZC9ncmlkLmpzXCJcclxuaW1wb3J0ICogYXMgcm5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiXHJcblxyXG5jb25zdCByb29tU2l6ZXMgPSBbNSwgNywgOSwgMTFdXHJcbmNvbnN0IGhhbGxMZW5ndGhzID0gWzUsIDcsIDksIDExXVxyXG5cclxuZW51bSBUaWxlVHlwZSB7XHJcbiAgICBEb29yLFxyXG4gICAgV2FsbCxcclxuICAgIEludGVyaW9yLFxyXG4gICAgRXh0ZXJpb3JcclxufVxyXG5cclxuZW51bSBSZWdpb25UeXBlIHtcclxuICAgIEhhbGx3YXksXHJcbiAgICBSb29tXHJcbn1cclxuXHJcbmludGVyZmFjZSBSZWN0IHtcclxuICAgIHg6IG51bWJlcixcclxuICAgIHk6IG51bWJlcixcclxuICAgIHdpZHRoOiBudW1iZXIsXHJcbiAgICBoZWlnaHQ6IG51bWJlclxyXG59XHJcblxyXG5pbnRlcmZhY2UgUmVnaW9uIHtcclxuICAgIHJlZ2lvbjogUmVjdCxcclxuICAgIG5vbk92ZXJsYXBwaW5nUmVnaW9uOiBSZWN0LFxyXG4gICAgZGVwdGg6IG51bWJlcixcclxuICAgIHR5cGU6IFJlZ2lvblR5cGVcclxufVxyXG5cclxudHlwZSBDb29yZHMgPSBbbnVtYmVyLCBudW1iZXJdXHJcblxyXG5pbnRlcmZhY2UgVHVubmVsIHtcclxuICAgIHR5cGU6IFJlZ2lvblR5cGVcclxuICAgIGNvb3JkczogQ29vcmRzXHJcbn1cclxuXHJcbmludGVyZmFjZSBUaGluZyB7XHJcbiAgICBuYW1lOiBzdHJpbmdcclxuICAgIGltYWdlOiBzdHJpbmdcclxufVxyXG5cclxuaW50ZXJmYWNlIFRpbGUge1xyXG4gICAgdGhpbmdzOiBUaGluZ1tdXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZU1hcCh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IGdyaWQuR3JpZDxUaWxlPiB7XHJcbiAgICBjb25zdCByb29tcyA9IGdlbmVyYXRlUm9vbXMod2lkdGgsIGhlaWdodClcclxuICAgIGNvbnN0IG1hcCA9IG5ldyBncmlkLkdyaWQ8VGlsZT4od2lkdGgsIGhlaWdodCwgKCkgPT4gKHsgdGhpbmdzOiBbXSB9KSlcclxuXHJcbiAgICByb29tcy5zY2FuKCh4LCB5LCB0eXBlKSA9PiB7XHJcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgVGlsZVR5cGUuRG9vcjpcclxuICAgICAgICAgICAgICAgIG1hcC5hdCh4LCB5KS50aGluZ3MucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJEb29yXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2U6IFwiLi9hc3NldHMvY2xvc2VkLnBuZ1wiXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRpbGVUeXBlLldhbGw6XHJcbiAgICAgICAgICAgICAgICBtYXAuYXQoeCwgeSkudGhpbmdzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiRG9vclwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGltYWdlOiBcIi4vYXNzZXRzL3dhbGwucG5nXCJcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVGlsZVR5cGUuSW50ZXJpb3I6XHJcbiAgICAgICAgICAgICAgICBtYXAuYXQoeCwgeSkudGhpbmdzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiRG9vclwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGltYWdlOiBcIi4vYXNzZXRzL2Zsb29yLnBuZ1wiXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfSlcclxuXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiogaXRlclRoaW5ncyhncmQ6IGdyaWQuR3JpZDxUaWxlPikge1xyXG4gICAgZm9yIChjb25zdCB0aWxlIG9mIGdyZCkge1xyXG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGlsZS50aGluZ3MpIHtcclxuICAgICAgICAgICAgeWllbGQgdGhpbmdcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlUm9vbXMod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBncmlkLkdyaWQ8VGlsZVR5cGU+IHtcclxuICAgIGNvbnN0IGdyZCA9IG5ldyBncmlkLkdyaWQ8VGlsZVR5cGU+KHdpZHRoLCBoZWlnaHQsICgpID0+IFRpbGVUeXBlLkV4dGVyaW9yKVxyXG4gICAgY29uc3QgcmVnaW9uczogUmVnaW9uW10gPSBbXVxyXG4gICAgY29uc3QgbWF4Um9vbXMgPSAzMlxyXG5cclxuICAgIC8vIHBsYWNlIGluaXRpYWwgcm9vbVxyXG4gICAge1xyXG4gICAgICAgIGNvbnN0IG1pblJvb21TaXplID0gcm9vbVNpemVzLnJlZHVjZSgoeCwgeSkgPT4geCA8IHkgPyB4IDogeSlcclxuICAgICAgICBjb25zdCBtYXhSb29tU2l6ZSA9IHJvb21TaXplcy5yZWR1Y2UoKHgsIHkpID0+IHggPiB5ID8geCA6IHkpXHJcbiAgICAgICAgY29uc3QgeCA9IHJuZC5pbnQoMCwgZ3JkLndpZHRoIC0gbWluUm9vbVNpemUpXHJcbiAgICAgICAgY29uc3QgeSA9IHJuZC5pbnQoMCwgZ3JkLmhlaWdodCAtIG1pblJvb21TaXplKVxyXG4gICAgICAgIGNvbnN0IHNpemUgPSBybmQuaW50KG1pblJvb21TaXplLCBNYXRoLm1pbihtYXhSb29tU2l6ZSwgZ3JkLndpZHRoIC0geCwgZ3JkLmhlaWdodCAtIHkpKVxyXG4gICAgICAgIHBsYWNlUm9vbShSZWdpb25UeXBlLlJvb20sIHgsIHksIHNpemUsIHNpemUsIGdyZCwgY29ubmVjdClcclxuICAgIH1cclxuXHJcbiAgICBsZXQgbnVtUm9vbXMgPSAxXHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgIGlmIChjb25uZWN0Lmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobnVtUm9vbXMgPj0gbWF4Um9vbXMpIHtcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGZpbmQgYSBwbGFjZSB0byBiZWdpbiB0dW5uZWxpbmcgdG8gbmV4dCByb29tXHJcbiAgICAgICAgY29uc3QgeyB0eXBlLCBjb29yZHM6IFtjeCwgY3ldIH0gPSBhcnJheS5wb3AoY29ubmVjdClcclxuICAgICAgICBjb25zdCBueHkgPSBmaW5kVHVubmVsYWJsZU5laWdoYm9yKGdyZCwgY3gsIGN5KVxyXG4gICAgICAgIGlmICghbnh5KSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBbbngsIG55XSA9IG54eVxyXG5cclxuICAgICAgICBpZiAodHlwZSA9PSBSZWdpb25UeXBlLkhhbGx3YXkpIHtcclxuICAgICAgICAgICAgLy8gdHJ5IHBsYWNpbmcgYSByb29tIGhlcmVcclxuICAgICAgICAgICAgaWYgKHRyeVJvb20oZ3JkLCBjb25uZWN0LCBjeCwgY3ksIG54LCBueSkpIHtcclxuICAgICAgICAgICAgICAgIG51bVJvb21zKytcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRyeUhhbGx3YXkoZ3JkLCBjb25uZWN0LCBjeCwgY3ksIG54LCBueSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coYFBsYWNlZCAke251bVJvb21zfSByb29tc2ApXHJcblxyXG4gICAgcmV0dXJuIGdyZFxyXG59XHJcblxyXG5mdW5jdGlvbiB0cnlIYWxsd2F5KGdyZDogZ3JpZC5HcmlkPFRpbGVUeXBlPiwgY29ubmVjdDogVHVubmVsW10sIGN4OiBudW1iZXIsIGN5OiBudW1iZXIsIG54OiBudW1iZXIsIG55OiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgIHJuZC5zaHVmZmxlKGhhbGxMZW5ndGhzKVxyXG4gICAgZm9yIChjb25zdCBsZW5ndGggb2YgaGFsbExlbmd0aHMpIHtcclxuICAgICAgICBpZiAodHJ5UGxhY2VIYWxsd2F5KGdyZCwgY29ubmVjdCwgY3gsIGN5LCBueCwgbnksIGxlbmd0aCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeVJvb20oZ3JkOiBncmlkLkdyaWQ8VGlsZVR5cGU+LCBjb25uZWN0OiBUdW5uZWxbXSwgY3g6IG51bWJlciwgY3k6IG51bWJlciwgbng6IG51bWJlciwgbnk6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgLy8gdHJ5IHBsYWNpbmcgYSByb29tIGhlcmVcclxuICAgIHJuZC5zaHVmZmxlKHJvb21TaXplcylcclxuICAgIGZvciAoY29uc3Qgc2l6ZSBvZiByb29tU2l6ZXMpIHtcclxuICAgICAgICBpZiAodHJ5UGxhY2VSZWdpb24oZ3JkLCBSZWdpb25UeXBlLlJvb20sIGNvbm5lY3QsIGN4LCBjeSwgbngsIG55LCBzaXplLCBzaXplKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2VcclxufVxyXG5cclxuZnVuY3Rpb24gdHJ5UGxhY2VIYWxsd2F5KGdyZDogZ3JpZC5HcmlkPFRpbGVUeXBlPiwgY29ubmVjdDogVHVubmVsW10sIGN4OiBudW1iZXIsIGN5OiBudW1iZXIsIG54OiBudW1iZXIsIG55OiBudW1iZXIsIGxlbmd0aDogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICAvLyBmb3IgbnggLyBueVxyXG4gICAgLy8gbnggPT09IGN4ID0gdmVydGljYWwgaGFsbHdheVxyXG4gICAgLy8gbnkgPT09IGN5ID0gaG9yaXpvbnRhbCBoYWxsd2F5XHJcbiAgICBjb25zdCB3aWR0aCA9IG55ID09PSBjeSA/IGxlbmd0aCA6IDNcclxuICAgIGNvbnN0IGhlaWdodCA9IG54ID09PSBjeCA/IGxlbmd0aCA6IDNcclxuICAgIHJldHVybiB0cnlQbGFjZVJlZ2lvbihncmQsIFJlZ2lvblR5cGUuSGFsbHdheSwgY29ubmVjdCwgY3gsIGN5LCBueCwgbnksIHdpZHRoLCBoZWlnaHQpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeVBsYWNlUmVnaW9uKGdyZDogZ3JpZC5HcmlkPFRpbGVUeXBlPiwgdHlwZTogUmVnaW9uVHlwZSwgY29ubmVjdDogVHVubmVsW10sIGN4OiBudW1iZXIsIGN5OiBudW1iZXIsIG54OiBudW1iZXIsIG55OiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICAvLyBmb3IgbnggLyBueVxyXG4gICAgLy8gbnggPCBjeCAtIGhvcml6b250YWwgLSByaWdodCB0byBsZWZ0XHJcbiAgICAvLyBueCA+IGN4IC0gaG9yaXpvbnRhbCAtIGxlZnQgdG8gcmlnaHRcclxuICAgIC8vIG55IDwgY3kgLSB2ZXJ0aWNhbCAtIGJvdHRvbSB0byB0b3BcclxuICAgIC8vIG55ID4gY3kgLSB2ZXJ0aWNhbCAtIHRvcCB0byBib3R0b21cclxuICAgIC8vIGZvciBlYWNoIGNhc2UgLSBmaW5kIGhhbGx3YXkgcmVjdCwgZmluZCBjaGVjayBvdmVybGFwIHJlY3RcclxuICAgIGlmIChueCA8IGN4KSB7XHJcbiAgICAgICAgLy8gcmlnaHQgdG8gbGVmdFxyXG4gICAgICAgIGNvbnN0IHggPSBjeCAtIHdpZHRoICsgMVxyXG4gICAgICAgIGNvbnN0IHkgPSBjeSAtIE1hdGguZmxvb3IoaGVpZ2h0IC8gMilcclxuXHJcbiAgICAgICAgaWYgKCFncmQucmVnaW9uSW5Cb3VuZHMoeCwgeSwgd2lkdGgsIGhlaWdodCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJlZ2lvbklzRXh0ZXJpb3IoZ3JkLCB4LCB5LCB3aWR0aCAtIDEsIGhlaWdodCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwbGFjZVJvb20odHlwZSwgeCwgeSwgd2lkdGgsIGhlaWdodCwgZ3JkLCBjb25uZWN0KVxyXG4gICAgfSBlbHNlIGlmIChueCA+IGN4KSB7XHJcbiAgICAgICAgLy8gbGVmdCB0byByaWdodFxyXG4gICAgICAgIGNvbnN0IHggPSBjeFxyXG4gICAgICAgIGNvbnN0IHkgPSBjeSAtIE1hdGguZmxvb3IoaGVpZ2h0IC8gMilcclxuXHJcbiAgICAgICAgaWYgKCFncmQucmVnaW9uSW5Cb3VuZHMoeCwgeSwgd2lkdGgsIGhlaWdodCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJlZ2lvbklzRXh0ZXJpb3IoZ3JkLCB4ICsgMSwgeSwgd2lkdGggLSAxLCBoZWlnaHQpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGxhY2VSb29tKHR5cGUsIHgsIHksIHdpZHRoLCBoZWlnaHQsIGdyZCwgY29ubmVjdClcclxuICAgIH0gZWxzZSBpZiAobnkgPCBjeSkge1xyXG4gICAgICAgIC8vIGJvdHRvbSB0byB0b3BcclxuICAgICAgICBjb25zdCB4ID0gY3ggLSBNYXRoLmZsb29yKHdpZHRoIC8gMilcclxuICAgICAgICBjb25zdCB5ID0gY3kgLSBoZWlnaHQgKyAxXHJcblxyXG4gICAgICAgIGlmICghZ3JkLnJlZ2lvbkluQm91bmRzKHgsIHksIHdpZHRoLCBoZWlnaHQpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFyZWdpb25Jc0V4dGVyaW9yKGdyZCwgeCwgeSwgd2lkdGgsIGhlaWdodCAtIDEpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGxhY2VSb29tKHR5cGUsIHgsIHksIHdpZHRoLCBoZWlnaHQsIGdyZCwgY29ubmVjdClcclxuICAgIH0gZWxzZSBpZiAobnkgPiBjeSkge1xyXG4gICAgICAgIC8vIHRvcCB0byBib3R0b21cclxuICAgICAgICBjb25zdCB4ID0gY3ggLSBNYXRoLmZsb29yKHdpZHRoIC8gMilcclxuICAgICAgICBjb25zdCB5ID0gY3lcclxuXHJcbiAgICAgICAgaWYgKCFncmQucmVnaW9uSW5Cb3VuZHMoeCwgeSwgd2lkdGgsIGhlaWdodCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJlZ2lvbklzRXh0ZXJpb3IoZ3JkLCB4LCB5ICsgMSwgd2lkdGgsIGhlaWdodCAtIDEpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGxhY2VSb29tKHR5cGUsIHgsIHksIHdpZHRoLCBoZWlnaHQsIGdyZCwgY29ubmVjdClcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCB0dW5uZWwgcG9zaXRpb25cIilcclxuICAgIH1cclxuXHJcbiAgICBncmQuc2V0KGN4LCBjeSwgVGlsZVR5cGUuRG9vcilcclxuICAgIHJldHVybiB0cnVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlUm9vbSh0eXBlOiBSZWdpb25UeXBlLCB4OiBudW1iZXIsIHk6IG51bWJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIGdyaWQ6IGdyaWQuR3JpZDxUaWxlVHlwZT4sIGNvbm5lY3Q6IFR1bm5lbFtdKSB7XHJcbiAgICAvLyBwbGFjZSB0aGUgcm9vbSwgZmluZCBwb3RlbnRpYWwgY29ubmVjdGlvbiBwb2ludHNcclxuICAgIGVuY2xvc2VSb29tKHgsIHksIHdpZHRoLCBoZWlnaHQsIGdyaWQpXHJcblxyXG4gICAgY29uc3Qgcm9vbUNvbm5lY3Q6IFR1bm5lbFtdID0gW11cclxuICAgIGdyaWQuc2NhblJlZ2lvbih4LCB5LCB3aWR0aCwgaGVpZ2h0LCAoeCwgeSkgPT4ge1xyXG4gICAgICAgIGlmIChpc1R1bm5lbGFibGUoZ3JpZCwgeCwgeSkpIHtcclxuICAgICAgICAgICAgcm9vbUNvbm5lY3QucHVzaCh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICAgICAgICAgICAgY29vcmRzOiBbeCwgeV1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG5cclxuICAgIHJuZC5zaHVmZmxlKHJvb21Db25uZWN0KVxyXG4gICAgY29ubmVjdC5wdXNoKC4uLnJvb21Db25uZWN0KVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc1R1bm5lbGFibGUoZ3JpZDogZ3JpZC5HcmlkPFRpbGVUeXBlPiwgeDogbnVtYmVyLCB5OiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBmaW5kVHVubmVsYWJsZU5laWdoYm9yKGdyaWQsIHgsIHkpICE9IG51bGxcclxufVxyXG5cclxuZnVuY3Rpb24gZmluZFR1bm5lbGFibGVOZWlnaGJvcihncmlkOiBncmlkLkdyaWQ8VGlsZVR5cGU+LCB4OiBudW1iZXIsIHk6IG51bWJlcik6IChDb29yZHMgfCBudWxsKSB7XHJcbiAgICBpZiAoeCA9PT0gMCB8fCB5ID09PSAwIHx8IHggPT09IGdyaWQud2lkdGggLSAxIHx8IHkgPT09IGdyaWQuaGVpZ2h0IC0gMSkge1xyXG4gICAgICAgIHJldHVybiBudWxsXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGdyaWQuYXQoeCAtIDEsIHkpID09PSBUaWxlVHlwZS5FeHRlcmlvciAmJiBncmlkLmF0KHggKyAxLCB5KSA9PT0gVGlsZVR5cGUuSW50ZXJpb3IpIHtcclxuICAgICAgICByZXR1cm4gW3ggLSAxLCB5XVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChncmlkLmF0KHgsIHkgKyAxKSA9PT0gVGlsZVR5cGUuRXh0ZXJpb3IgJiYgZ3JpZC5hdCh4LCB5IC0gMSkgPT09IFRpbGVUeXBlLkludGVyaW9yKSB7XHJcbiAgICAgICAgcmV0dXJuIFt4LCB5ICsgMV1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoZ3JpZC5hdCh4ICsgMSwgeSkgPT09IFRpbGVUeXBlLkV4dGVyaW9yICYmIGdyaWQuYXQoeCAtIDEsIHkpID09PSBUaWxlVHlwZS5JbnRlcmlvcikge1xyXG4gICAgICAgIHJldHVybiBbeCArIDEsIHldXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGdyaWQuYXQoeCwgeSAtIDEpID09PSBUaWxlVHlwZS5FeHRlcmlvciAmJiBncmlkLmF0KHgsIHkgKyAxKSA9PT0gVGlsZVR5cGUuSW50ZXJpb3IpIHtcclxuICAgICAgICByZXR1cm4gW3gsIHkgLSAxXVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVuY2xvc2VSb29tKHgwOiBudW1iZXIsIHkwOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBncmlkOiBncmlkLkdyaWQ8VGlsZVR5cGU+KSB7XHJcbiAgICBjb25zdCByID0geDAgKyB3aWR0aCAtIDFcclxuICAgIGNvbnN0IGIgPSB5MCArIGhlaWdodCAtIDFcclxuXHJcbiAgICBncmlkLnNjYW5SZWdpb24oeDAsIHkwLCB3aWR0aCwgaGVpZ2h0LCAoeCwgeSkgPT4ge1xyXG4gICAgICAgIGlmICh4ID09PSB4MCB8fCB5ID09IHkwIHx8IHggPT09IHIgfHwgeSA9PT0gYikge1xyXG4gICAgICAgICAgICBncmlkLnNldCh4LCB5LCBUaWxlVHlwZS5XYWxsKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdyaWQuc2V0KHgsIHksIFRpbGVUeXBlLkludGVyaW9yKVxyXG4gICAgfSlcclxufVxyXG5cclxuZnVuY3Rpb24gcmVnaW9uSXNFeHRlcmlvcihncmlkOiBncmlkLkdyaWQ8VGlsZVR5cGU+LCB4MDogbnVtYmVyLCB5MDogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgZXh0ZXJpb3IgPSBhcnJheS5hbGwoZ3JpZC5pdGVyUmVnaW9uKHgwLCB5MCwgd2lkdGgsIGhlaWdodCksIHggPT4geCA9PSBUaWxlVHlwZS5FeHRlcmlvcilcclxuICAgIHJldHVybiBleHRlcmlvclxyXG59Il19