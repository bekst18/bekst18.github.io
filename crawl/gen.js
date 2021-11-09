/**
 * map generation library
 */
import * as rl from "./rl.js";
import * as geo from "../shared/geo2d.js";
import * as grid from "../shared/grid.js";
import * as array from "../shared/array.js";
import * as iter from "../shared/iter.js";
import * as rand from "../shared/rand.js";
import * as things from "./things.js";
import * as maps from "./maps.js";
import * as noise from "../shared/noise.js";
import * as imaging from "../shared/imaging.js";
const tileset = {
    wall: things.brickWall.clone(),
    floor: things.floor.clone(),
    door: things.door.clone(),
    stairsUp: things.stairsUp.clone(),
    stairsDown: things.stairsDown.clone()
};
var CellType;
(function (CellType) {
    CellType[CellType["Exterior"] = 0] = "Exterior";
    CellType[CellType["Interior"] = 1] = "Interior";
    CellType[CellType["Wall"] = 2] = "Wall";
    CellType[CellType["Door"] = 3] = "Door";
})(CellType || (CellType = {}));
export function generateDungeonLevel(rng, db, floor) {
    let minDim = 32;
    let maxDim = 32 + floor * 4;
    let dimDice = new rl.Dice(minDim, maxDim);
    let width = dimDice.roll(rng);
    let height = dimDice.roll(rng);
    const monsters = createMonsterList(db, floor);
    const items = createItemList(db, floor);
    const map = generateMapRooms(rng, monsters, items, width, height);
    map.lighting = maps.Lighting.None;
    return map;
}
function generateMapRooms(rng, monsters, items, width, height) {
    const map = new maps.Map(width, height);
    const minRooms = 4;
    const [cells, rooms] = (() => {
        while (true) {
            const [cells, rooms] = generateCellGrid(rng, width, height);
            if (rooms.length > minRooms) {
                return [cells, rooms];
            }
        }
    })();
    const firstRoom = rooms.reduce((x, y) => x.depth < y.depth ? x : y);
    const stairsUp = tileset.stairsUp.clone();
    const stairsUpPosition = iter.find(visitInteriorCoords(cells, firstRoom.interiorPt), pt => iter.any(grid.visitNeighbors(cells, pt), a => a[0] === CellType.Wall));
    if (!stairsUpPosition) {
        throw new Error("Failed to place stairs up");
    }
    map.exits.set(stairsUpPosition, stairsUp);
    const lastRoom = rooms.reduce((x, y) => x.depth > y.depth ? x : y);
    const stairsDown = tileset.stairsDown.clone();
    const stairsDownPosition = iter.find(visitInteriorCoords(cells, lastRoom.interiorPt), pt => iter.any(grid.visitNeighbors(cells, pt), a => a[0] === CellType.Wall));
    if (!stairsDownPosition) {
        throw new Error("Failed to place stairs down");
    }
    map.exits.set(stairsDownPosition, stairsDown);
    // generate tiles and fixtures from cells
    for (const [v, x, y] of cells.scan()) {
        if (v === null) {
            continue;
        }
        switch (v) {
            case CellType.Exterior:
                break;
            case CellType.Interior:
                {
                    const tile = tileset.floor.clone();
                    const position = new geo.Point(x, y);
                    map.tiles.set(position, tile);
                }
                break;
            case CellType.Wall:
                {
                    const tile = tileset.wall.clone();
                    const position = new geo.Point(x, y);
                    map.tiles.set(position, tile);
                }
                break;
            case CellType.Door:
                {
                    const fixture = tileset.door.clone();
                    const position = new geo.Point(x, y);
                    map.fixtures.set(position, fixture);
                    const tile = tileset.floor.clone();
                    const tilePosition = new geo.Point(x, y);
                    map.tiles.set(tilePosition, tile);
                }
                break;
        }
    }
    placeMonsters(rng, monsters, cells, rooms, map);
    placeItems(rng, items, cells, rooms, map);
    const sconcePosition = iter.find(grid.visitNeighbors(cells, stairsUpPosition), ([cell, _]) => cell === CellType.Wall);
    if (sconcePosition) {
        map.fixtures.set(sconcePosition[1], things.sconce.clone());
    }
    return map;
}
function placeMonsters(rng, monsters, cells, rooms, map) {
    // iterate over rooms, decide whether to place a monster in each room
    const encounterChance = .5;
    const secondEncounterChance = .2;
    const thirdEncounterChance = .1;
    for (const room of rooms) {
        if (room.depth <= 0) {
            continue;
        }
        if (!rand.chance(rng, encounterChance)) {
            continue;
        }
        tryPlaceMonster(rng, monsters, cells, room, map);
        if (!rand.chance(rng, secondEncounterChance)) {
            continue;
        }
        tryPlaceMonster(rng, monsters, cells, room, map);
        if (!rand.chance(rng, thirdEncounterChance)) {
            continue;
        }
        tryPlaceMonster(rng, monsters, cells, room, map);
    }
}
function tryPlaceMonster(rng, monsters, cells, room, map) {
    // attempt to place monster
    for (const [t, pt] of visitInterior(cells, room.interiorPt)) {
        if (t !== CellType.Interior) {
            continue;
        }
        if (iter.any(map, th => { var _a, _b; return ((_b = (_a = th.position) === null || _a === void 0 ? void 0 : _a.equal(pt)) !== null && _b !== void 0 ? _b : false) && !th.thing.passable; })) {
            continue;
        }
        const monster = monsters.select(rng);
        map.monsters.set(pt, monster.clone());
        return true;
    }
    return false;
}
function placeItems(rng, items, cells, rooms, map) {
    // iterate over rooms, decide whether to place a monster in each room
    const treasureChance = .25;
    for (const room of rooms) {
        if (room.depth <= 0) {
            continue;
        }
        if (!rand.chance(rng, treasureChance)) {
            continue;
        }
        tryPlaceTreasure(rng, items, cells, room, map);
    }
}
function tryPlaceTreasure(rng, items, cells, room, map) {
    // attempt to place treasure
    for (const [t, pt] of visitInterior(cells, room.interiorPt)) {
        if (t !== CellType.Interior) {
            continue;
        }
        if (iter.any(map, th => { var _a, _b; return ((_b = (_a = th.position) === null || _a === void 0 ? void 0 : _a.equal(pt)) !== null && _b !== void 0 ? _b : false) && !th.thing.passable; })) {
            continue;
        }
        const chest = things.chest.clone();
        // choose loot
        const item = items.select(rng);
        chest.items.push(item.clone());
        // extra loot
        let extraLootChance = .5;
        while (rand.chance(rng, extraLootChance)) {
            extraLootChance *= .5;
            const item = items.select(rng);
            chest.items.push(item.clone());
        }
        map.containers.set(pt, chest);
        return true;
    }
    return false;
}
function generateCellGrid(rng, width, height) {
    const cells = grid.generate(width, height, () => CellType.Exterior);
    // generate room templates
    const templates = generateRoomTemplates();
    const stack = [];
    const rooms = [];
    // place initial room
    {
        rand.shuffle(rng, templates);
        const template = templates[0];
        const pt = new geo.Point(rand.int(rng, 0, width - template.cells.width + 1), rand.int(rng, 0, height - template.cells.height + 1));
        const room = placeTemplate(rng, cells, template, pt);
        stack.push(room);
        rooms.push(room);
    }
    while (stack.length > 0) {
        const room = array.pop(stack);
        const nextRoom = tryTunnelFrom(rng, cells, templates, room);
        if (nextRoom) {
            stack.push(room);
            stack.push(nextRoom);
            rooms.push(nextRoom);
        }
    }
    return [cells, rooms];
}
function tryTunnelFrom(rng, cells, templates, room) {
    rand.shuffle(rng, templates);
    while (room.tunnelPts.length > 0) {
        const tpt = array.pop(room.tunnelPts);
        for (const template of templates) {
            const nextRoom = tryTunnelTo(rng, cells, tpt, template);
            if (nextRoom) {
                // place door at tunnel point
                room.tunnelPts = room.tunnelPts.filter(pt => !pt.equal(tpt));
                cells.setPoint(tpt, CellType.Door);
                nextRoom.depth = room.depth + 1;
                return nextRoom;
            }
        }
    }
    return null;
}
function tryTunnelTo(rng, cells, tpt1, template) {
    // find tunnel points of template
    for (const tpt2 of template.tunnelPts) {
        const offset = tpt1.subPoint(tpt2);
        if (isValidPlacement(template.cells, cells, offset)) {
            return placeTemplate(rng, cells, template, offset);
        }
    }
    return null;
}
function placeTemplate(rng, cells, template, offset) {
    grid.copy(template.cells, cells, offset.x, offset.y);
    // find tunnelable points
    const interiorPt = template.interiorPt.addPoint(offset);
    const tunnelPts = template.tunnelPts.map(pt => pt.addPoint(offset)).filter(pt => findExteriorNeighbor(cells, pt) !== null);
    rand.shuffle(rng, tunnelPts);
    return {
        interiorPt,
        tunnelPts,
        depth: 0
    };
}
function generateRoomTemplates() {
    const lengths = [4, 5, 6, 7, 8, 9, 10, 11];
    const pairs = lengths.map(x => lengths.map(y => [x, y])).flat().filter(a => a[0] > 3 || a[1] > 3);
    const templates = pairs.map(a => generateRoomTemplate(a[0], a[1]));
    return templates;
}
function generateRoomTemplate(width, height) {
    const interiorPt = new geo.Point(width / 2, height / 2).floor();
    const cells = grid.generate(width, height, (x, y) => x === 0 || x === width - 1 || y === 0 || y === height - 1 ? CellType.Wall : CellType.Interior);
    const tunnelPts = [];
    tunnelPts.push(...grid.scan(1, 0, width - 2, 1));
    tunnelPts.push(...grid.scan(0, 1, 1, height - 2));
    tunnelPts.push(...grid.scan(1, height - 1, width - 2, 1));
    tunnelPts.push(...grid.scan(width - 1, 1, 1, height - 2));
    return {
        interiorPt,
        cells,
        tunnelPts
    };
}
function findExteriorNeighbor(cells, pt) {
    for (const [t, npt] of grid.visitNeighbors(cells, pt)) {
        if (t === CellType.Exterior) {
            return npt;
        }
    }
    return null;
}
function visitInteriorCoords(cells, pt0) {
    return iter.map(visitInterior(cells, pt0), x => x[1]);
}
function* visitInterior(cells, pt0) {
    const explored = cells.map2(() => false);
    const stack = [pt0];
    while (stack.length > 0) {
        const pt = array.pop(stack);
        explored.setPoint(pt, true);
        const t = cells.atPoint(pt);
        yield [t, pt];
        // if this is a wall, do not explore neighbors
        if (t === CellType.Wall) {
            continue;
        }
        // otherwise, explore neighbors, pushing onto stack those that are unexplored
        for (const [t, npt] of grid.visitNeighbors(cells, pt)) {
            if (explored.atPoint(npt)) {
                continue;
            }
            if (t !== CellType.Interior) {
                continue;
            }
            stack.push(npt);
        }
    }
}
function isValidPlacement(src, dst, offset) {
    if (!dst.regionInBounds(offset.x, offset.y, src.width, src.height)) {
        return false;
    }
    for (const [st, x, y] of src.scan()) {
        // rules:
        // can place wall over wall
        // can place anything over exterior
        const dt = dst.at(x + offset.x, y + offset.y);
        if (dt === CellType.Exterior) {
            continue;
        }
        if (dt === CellType.Wall && st === CellType.Wall) {
            continue;
        }
        return false;
    }
    return true;
}
export async function generateOutdoorMap(player, width, height) {
    const map = new maps.Map(width, height);
    map.lighting = maps.Lighting.Ambient;
    generateOutdoorTerrain(map);
    return map;
}
var OutdoorTileType;
(function (OutdoorTileType) {
    OutdoorTileType[OutdoorTileType["water"] = 0] = "water";
    OutdoorTileType[OutdoorTileType["grass"] = 1] = "grass";
    OutdoorTileType[OutdoorTileType["dirt"] = 2] = "dirt";
    OutdoorTileType[OutdoorTileType["sand"] = 3] = "sand";
})(OutdoorTileType || (OutdoorTileType = {}));
var OutdoorFixtureType;
(function (OutdoorFixtureType) {
    OutdoorFixtureType[OutdoorFixtureType["none"] = 0] = "none";
    OutdoorFixtureType[OutdoorFixtureType["hills"] = 1] = "hills";
    OutdoorFixtureType[OutdoorFixtureType["mountains"] = 2] = "mountains";
    OutdoorFixtureType[OutdoorFixtureType["trees"] = 3] = "trees";
    OutdoorFixtureType[OutdoorFixtureType["snow"] = 4] = "snow";
})(OutdoorFixtureType || (OutdoorFixtureType = {}));
function generateOutdoorTerrain(map) {
    var _a;
    const tiles = grid.generate(map.width, map.height, () => OutdoorTileType.water);
    const fixtures = grid.generate(map.width, map.height, () => OutdoorFixtureType.none);
    // TODO - randomly bias perlin noise instead
    // const bias= rand.int(0, 256)
    const bias = 0;
    const heightMap = fbm(map.width, map.height, bias, 8 / map.width, 2, .5, 8);
    imaging.scan(map.width, map.height, (x, y, offset) => {
        const h = heightMap[offset];
        if (h > 0) {
            tiles.set(x, y, OutdoorTileType.dirt);
        }
    });
    map.player.position = (_a = tiles.findPoint(t => t !== OutdoorTileType.water)) !== null && _a !== void 0 ? _a : new geo.Point(0, 0);
    for (const [t, x, y] of tiles.scan()) {
        switch (t) {
            case (OutdoorTileType.water):
                {
                    const tile = things.water.clone();
                    map.tiles.set(new geo.Point(x, y), tile);
                }
                break;
            case (OutdoorTileType.dirt):
                {
                    const tile = things.dirt.clone();
                    map.tiles.set(new geo.Point(x, y), tile);
                }
                break;
            case (OutdoorTileType.grass):
                {
                    const tile = things.grass.clone();
                    map.tiles.set(new geo.Point(x, y), tile);
                }
                break;
            case (OutdoorTileType.sand):
                {
                    const tile = things.sand.clone();
                    map.tiles.set(new geo.Point(x, y), tile);
                }
                break;
        }
    }
    for (const [f, x, y] of fixtures.scan()) {
        switch (f) {
            case (OutdoorFixtureType.hills):
                {
                    const fixture = things.hills.clone();
                    map.fixtures.set(new geo.Point(x, y), fixture);
                }
                break;
            case (OutdoorFixtureType.mountains):
                {
                    const fixture = things.mountains.clone();
                    map.fixtures.set(new geo.Point(x, y), fixture);
                }
                break;
            case (OutdoorFixtureType.trees):
                {
                    const fixture = things.trees.clone();
                    map.fixtures.set(new geo.Point(x, y), fixture);
                }
                break;
            case (OutdoorFixtureType.snow):
                {
                    const fixture = things.snow.clone();
                    map.fixtures.set(new geo.Point(x, y), fixture);
                }
                break;
        }
    }
}
function placeLandmasses(rng, tiles) {
    const maxTiles = Math.ceil(tiles.size * rand.float(rng, .3, .5));
    growLand(rng, tiles, maxTiles);
    // find maximal water rect - if large enough, plant island
    while (true) {
        const aabb = grid.findMaximalRect(tiles, t => t === OutdoorTileType.water).shrink(1);
        if (aabb.area < 12) {
            break;
        }
        const view = tiles.viewAABB(aabb);
        const islandTiles = aabb.area * rand.float(rng, .25, 1);
        growLand(rng, view, islandTiles);
    }
    // place some islands
    placeBeaches(tiles);
}
function growLand(rng, tiles, maxTiles) {
    // "plant" a continent
    const stack = new Array();
    const seed = new geo.Point(tiles.width / 2, tiles.height / 2).floor();
    stack.push(seed);
    let placed = 0;
    while (stack.length > 0 && placed < maxTiles) {
        const pt = array.pop(stack);
        tiles.setPoint(pt, OutdoorTileType.grass);
        ++placed;
        for (const [t, xy] of grid.visitNeighbors(tiles, pt)) {
            if (t === OutdoorTileType.water) {
                stack.push(xy);
            }
        }
        rand.shuffle(rng, stack);
    }
}
function placeBeaches(tiles) {
    for (const pt of grid.scan(0, 0, tiles.width, tiles.height)) {
        if (tiles.atPoint(pt) === OutdoorTileType.water) {
            continue;
        }
        if (pt.x > 0 && tiles.at(pt.x - 1, pt.y) === OutdoorTileType.water) {
            tiles.setPoint(pt, OutdoorTileType.sand);
        }
        if (pt.x < tiles.width - 1 && tiles.at(pt.x + 1, pt.y) === OutdoorTileType.water) {
            tiles.setPoint(pt, OutdoorTileType.sand);
        }
        if (pt.y > 0 && tiles.at(pt.x, pt.y - 1) === OutdoorTileType.water) {
            tiles.setPoint(pt, OutdoorTileType.sand);
        }
        if (pt.y < tiles.height - 1 && tiles.at(pt.x, pt.y + 1) === OutdoorTileType.water) {
            tiles.setPoint(pt, OutdoorTileType.sand);
        }
    }
}
function placeSnow(tiles, fixtures) {
    const { width, height } = tiles;
    const snowHeight = Math.ceil(height / 3);
    for (let y = 0; y < snowHeight; ++y) {
        for (let x = 0; x < width; ++x) {
            const t = tiles.at(x, y);
            if (t !== OutdoorTileType.water) {
                fixtures.set(x, y, OutdoorFixtureType.snow);
            }
        }
    }
}
function placeMountains(rng, tiles, fixtures, maxTiles) {
    // find a suitable start point for mountain range
    const seed = rand.choose(rng, [...tiles.findPoints(x => x !== OutdoorTileType.water && x !== OutdoorTileType.sand)]);
    const stack = new Array();
    stack.push(seed);
    let placed = 0;
    while (stack.length > 0 && placed < maxTiles) {
        const pt = array.pop(stack);
        fixtures.setPoint(pt, OutdoorFixtureType.mountains);
        ++placed;
        for (const [t, xy] of grid.visitNeighbors(tiles, pt)) {
            if (t !== OutdoorTileType.water && t !== OutdoorTileType.sand) {
                stack.push(xy);
            }
        }
        rand.shuffle(rng, stack);
    }
}
function fbm(width, height, bias, freq, lacunarity, gain, octaves) {
    return imaging.generate(width, height, (x, y) => {
        return noise.fbmPerlin2(x * freq + bias, y * freq + bias, lacunarity, gain, octaves);
    });
}
function createMonsterList(db, floor) {
    // create weighted list of monsters/items appropriate for level
    const list = [];
    for (const monster of db) {
        if (!(monster instanceof rl.Monster)) {
            continue;
        }
        if (monster.level > floor) {
            continue;
        }
        if (monster.level <= 0) {
            continue;
        }
        let w = monster.freq;
        let dl = Math.abs(monster.level - floor);
        if (dl > 0) {
            w /= (dl + 1);
        }
        list.push([monster, w]);
    }
    return new rl.WeightedList(list);
}
function createItemList(db, floor) {
    // create weighted list of monsters/items appropriate for level
    const list = [];
    for (const item of db) {
        if (!(item instanceof rl.Item)) {
            continue;
        }
        if (item.level > floor + 1) {
            continue;
        }
        if (item.level <= 0 || item.level < floor - 2) {
            continue;
        }
        let w = item.freq;
        let dl = Math.abs(item.level - floor);
        if (dl > 0) {
            w /= (dl + 1);
        }
        list.push([item, w]);
    }
    return new rl.WeightedList(list);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0gsT0FBTyxLQUFLLEVBQUUsTUFBTSxTQUFTLENBQUE7QUFDN0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBQ2pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQVUvQyxNQUFNLE9BQU8sR0FBbUI7SUFDNUIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFO0lBQzlCLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRTtJQUMzQixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7SUFDekIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO0lBQ2pDLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRTtDQUN4QyxDQUFBO0FBRUQsSUFBSyxRQUtKO0FBTEQsV0FBSyxRQUFRO0lBQ1QsK0NBQVEsQ0FBQTtJQUNSLCtDQUFRLENBQUE7SUFDUix1Q0FBSSxDQUFBO0lBQ0osdUNBQUksQ0FBQTtBQUNSLENBQUMsRUFMSSxRQUFRLEtBQVIsUUFBUSxRQUtaO0FBZ0JELE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxHQUFrQixF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Q0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUMxQjtJQUVELE9BQU8sSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3BDLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxFQUFjLEVBQUUsS0FBYTtJQUNqRCwrREFBK0Q7SUFDL0QsTUFBTSxJQUFJLEdBQXdCLEVBQUUsQ0FBQTtJQUNwQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEVBQUUsRUFBRTtRQUNuQixJQUFJLENBQUMsQ0FBQyxJQUFJLFlBQVksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzVCLFNBQVE7U0FDWDtRQUVELElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBQyxFQUFFO1lBQ3hCLFNBQVE7U0FDWDtRQUVELElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBQyxFQUFFO1lBQzNDLFNBQVE7U0FDWDtRQUVELElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUE7UUFDakIsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFBO1FBQ3JDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRTtZQUNSLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtTQUNoQjtRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUN2QjtJQUVELE9BQU8sSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3BDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogbWFwIGdlbmVyYXRpb24gbGlicmFyeVxyXG4gKi9cclxuaW1wb3J0ICogYXMgcmwgZnJvbSBcIi4vcmwuanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcbmltcG9ydCAqIGFzIGdyaWQgZnJvbSBcIi4uL3NoYXJlZC9ncmlkLmpzXCJcclxuaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiXHJcbmltcG9ydCAqIGFzIGl0ZXIgZnJvbSBcIi4uL3NoYXJlZC9pdGVyLmpzXCJcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIlxyXG5pbXBvcnQgKiBhcyB0aGluZ3MgZnJvbSBcIi4vdGhpbmdzLmpzXCJcclxuaW1wb3J0ICogYXMgbWFwcyBmcm9tIFwiLi9tYXBzLmpzXCJcclxuaW1wb3J0ICogYXMgbm9pc2UgZnJvbSBcIi4uL3NoYXJlZC9ub2lzZS5qc1wiXHJcbmltcG9ydCAqIGFzIGltYWdpbmcgZnJvbSBcIi4uL3NoYXJlZC9pbWFnaW5nLmpzXCJcclxuXHJcbmludGVyZmFjZSBEdW5nZW9uVGlsZXNldCB7XHJcbiAgICB3YWxsOiBybC5UaWxlLFxyXG4gICAgZmxvb3I6IHJsLlRpbGUsXHJcbiAgICBkb29yOiBybC5Eb29yLFxyXG4gICAgc3RhaXJzVXA6IHJsLkV4aXRcclxuICAgIHN0YWlyc0Rvd246IHJsLkV4aXRcclxufVxyXG5cclxuY29uc3QgdGlsZXNldDogRHVuZ2VvblRpbGVzZXQgPSB7XHJcbiAgICB3YWxsOiB0aGluZ3MuYnJpY2tXYWxsLmNsb25lKCksXHJcbiAgICBmbG9vcjogdGhpbmdzLmZsb29yLmNsb25lKCksXHJcbiAgICBkb29yOiB0aGluZ3MuZG9vci5jbG9uZSgpLFxyXG4gICAgc3RhaXJzVXA6IHRoaW5ncy5zdGFpcnNVcC5jbG9uZSgpLFxyXG4gICAgc3RhaXJzRG93bjogdGhpbmdzLnN0YWlyc0Rvd24uY2xvbmUoKVxyXG59XHJcblxyXG5lbnVtIENlbGxUeXBlIHtcclxuICAgIEV4dGVyaW9yLFxyXG4gICAgSW50ZXJpb3IsXHJcbiAgICBXYWxsLFxyXG4gICAgRG9vclxyXG59XHJcblxyXG50eXBlIENlbGxHcmlkID0gZ3JpZC5HcmlkPENlbGxUeXBlPlxyXG5cclxuaW50ZXJmYWNlIFJvb21UZW1wbGF0ZSB7XHJcbiAgICBjZWxsczogQ2VsbEdyaWRcclxuICAgIGludGVyaW9yUHQ6IGdlby5Qb2ludFxyXG4gICAgdHVubmVsUHRzOiBnZW8uUG9pbnRbXVxyXG59XHJcblxyXG5pbnRlcmZhY2UgUm9vbSB7XHJcbiAgICBpbnRlcmlvclB0OiBnZW8uUG9pbnRcclxuICAgIHR1bm5lbFB0czogZ2VvLlBvaW50W11cclxuICAgIGRlcHRoOiBudW1iZXIsXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUR1bmdlb25MZXZlbChybmc6IHJhbmQuU0ZDMzJSTkcsIGRiOiBybC5UaGluZ0RCLCBmbG9vcjogbnVtYmVyKTogbWFwcy5NYXAge1xyXG4gICAgbGV0IG1pbkRpbSA9IDMyO1xyXG4gICAgbGV0IG1heERpbSA9IDMyICsgZmxvb3IgKiA0O1xyXG4gICAgbGV0IGRpbURpY2UgPSBuZXcgcmwuRGljZShtaW5EaW0sIG1heERpbSlcclxuICAgIGxldCB3aWR0aCA9IGRpbURpY2Uucm9sbChybmcpXHJcbiAgICBsZXQgaGVpZ2h0ID0gZGltRGljZS5yb2xsKHJuZylcclxuXHJcbiAgICBjb25zdCBtb25zdGVycyA9IGNyZWF0ZU1vbnN0ZXJMaXN0KGRiLCBmbG9vcilcclxuICAgIGNvbnN0IGl0ZW1zID0gY3JlYXRlSXRlbUxpc3QoZGIsIGZsb29yKVxyXG4gICAgY29uc3QgbWFwID0gZ2VuZXJhdGVNYXBSb29tcyhybmcsIG1vbnN0ZXJzLCBpdGVtcywgd2lkdGgsIGhlaWdodClcclxuXHJcbiAgICBtYXAubGlnaHRpbmcgPSBtYXBzLkxpZ2h0aW5nLk5vbmVcclxuICAgIHJldHVybiBtYXBcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVNYXBSb29tcyhcclxuICAgIHJuZzogcmFuZC5TRkMzMlJORyxcclxuICAgIG1vbnN0ZXJzOiBybC5XZWlnaHRlZExpc3Q8cmwuTW9uc3Rlcj4sXHJcbiAgICBpdGVtczogcmwuV2VpZ2h0ZWRMaXN0PHJsLkl0ZW0+LFxyXG4gICAgd2lkdGg6IG51bWJlcixcclxuICAgIGhlaWdodDogbnVtYmVyKTogbWFwcy5NYXAge1xyXG4gICAgY29uc3QgbWFwID0gbmV3IG1hcHMuTWFwKHdpZHRoLCBoZWlnaHQpXHJcbiAgICBjb25zdCBtaW5Sb29tcyA9IDRcclxuXHJcbiAgICBjb25zdCBbY2VsbHMsIHJvb21zXSA9ICgoKSA9PiB7XHJcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgY29uc3QgW2NlbGxzLCByb29tc10gPSBnZW5lcmF0ZUNlbGxHcmlkKHJuZywgd2lkdGgsIGhlaWdodClcclxuICAgICAgICAgICAgaWYgKHJvb21zLmxlbmd0aCA+IG1pblJvb21zKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW2NlbGxzLCByb29tc11cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pKCkgYXMgW0NlbGxHcmlkLCBSb29tW11dXHJcblxyXG4gICAgY29uc3QgZmlyc3RSb29tID0gcm9vbXMucmVkdWNlKCh4LCB5KSA9PiB4LmRlcHRoIDwgeS5kZXB0aCA/IHggOiB5KVxyXG4gICAgY29uc3Qgc3RhaXJzVXAgPSB0aWxlc2V0LnN0YWlyc1VwLmNsb25lKClcclxuICAgIGNvbnN0IHN0YWlyc1VwUG9zaXRpb24gPSBpdGVyLmZpbmQodmlzaXRJbnRlcmlvckNvb3JkcyhjZWxscywgZmlyc3RSb29tLmludGVyaW9yUHQpLCBwdCA9PiBpdGVyLmFueShncmlkLnZpc2l0TmVpZ2hib3JzKGNlbGxzLCBwdCksIGEgPT4gYVswXSA9PT0gQ2VsbFR5cGUuV2FsbCkpXHJcbiAgICBpZiAoIXN0YWlyc1VwUG9zaXRpb24pIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gcGxhY2Ugc3RhaXJzIHVwXCIpXHJcbiAgICB9XHJcblxyXG4gICAgbWFwLmV4aXRzLnNldChzdGFpcnNVcFBvc2l0aW9uLCBzdGFpcnNVcClcclxuXHJcbiAgICBjb25zdCBsYXN0Um9vbSA9IHJvb21zLnJlZHVjZSgoeCwgeSkgPT4geC5kZXB0aCA+IHkuZGVwdGggPyB4IDogeSlcclxuICAgIGNvbnN0IHN0YWlyc0Rvd24gPSB0aWxlc2V0LnN0YWlyc0Rvd24uY2xvbmUoKVxyXG4gICAgY29uc3Qgc3RhaXJzRG93blBvc2l0aW9uID0gaXRlci5maW5kKFxyXG4gICAgICAgIHZpc2l0SW50ZXJpb3JDb29yZHMoY2VsbHMsIGxhc3RSb29tLmludGVyaW9yUHQpLFxyXG4gICAgICAgIHB0ID0+IGl0ZXIuYW55KGdyaWQudmlzaXROZWlnaGJvcnMoY2VsbHMsIHB0KSwgYSA9PiBhWzBdID09PSBDZWxsVHlwZS5XYWxsKSlcclxuICAgIGlmICghc3RhaXJzRG93blBvc2l0aW9uKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIHBsYWNlIHN0YWlycyBkb3duXCIpXHJcbiAgICB9XHJcblxyXG4gICAgbWFwLmV4aXRzLnNldChzdGFpcnNEb3duUG9zaXRpb24sIHN0YWlyc0Rvd24pXHJcblxyXG4gICAgLy8gZ2VuZXJhdGUgdGlsZXMgYW5kIGZpeHR1cmVzIGZyb20gY2VsbHNcclxuICAgIGZvciAoY29uc3QgW3YsIHgsIHldIG9mIGNlbGxzLnNjYW4oKSkge1xyXG4gICAgICAgIGlmICh2ID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzd2l0Y2ggKHYpIHtcclxuICAgICAgICAgICAgY2FzZSBDZWxsVHlwZS5FeHRlcmlvcjpcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIENlbGxUeXBlLkludGVyaW9yOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gdGlsZXNldC5mbG9vci5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5zZXQocG9zaXRpb24sIHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIENlbGxUeXBlLldhbGw6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aWxlc2V0LndhbGwuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuc2V0KHBvc2l0aW9uLCB0aWxlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBDZWxsVHlwZS5Eb29yOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaXh0dXJlID0gdGlsZXNldC5kb29yLmNsb25lKClcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLmZpeHR1cmVzLnNldChwb3NpdGlvbiwgZml4dHVyZSlcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gdGlsZXNldC5mbG9vci5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlUG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuc2V0KHRpbGVQb3NpdGlvbiwgdGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcGxhY2VNb25zdGVycyhybmcsIG1vbnN0ZXJzLCBjZWxscywgcm9vbXMsIG1hcClcclxuICAgIHBsYWNlSXRlbXMocm5nLCBpdGVtcywgY2VsbHMsIHJvb21zLCBtYXApXHJcblxyXG4gICAgY29uc3Qgc2NvbmNlUG9zaXRpb24gPSBpdGVyLmZpbmQoZ3JpZC52aXNpdE5laWdoYm9ycyhjZWxscywgc3RhaXJzVXBQb3NpdGlvbiksIChbY2VsbCwgX10pID0+IGNlbGwgPT09IENlbGxUeXBlLldhbGwpXHJcbiAgICBpZiAoc2NvbmNlUG9zaXRpb24pIHtcclxuICAgICAgICBtYXAuZml4dHVyZXMuc2V0KHNjb25jZVBvc2l0aW9uWzFdLCB0aGluZ3Muc2NvbmNlLmNsb25lKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG1hcFxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZU1vbnN0ZXJzKHJuZzogcmFuZC5STkcsIG1vbnN0ZXJzOiBybC5XZWlnaHRlZExpc3Q8cmwuTW9uc3Rlcj4sIGNlbGxzOiBDZWxsR3JpZCwgcm9vbXM6IFJvb21bXSwgbWFwOiBtYXBzLk1hcCkge1xyXG4gICAgLy8gaXRlcmF0ZSBvdmVyIHJvb21zLCBkZWNpZGUgd2hldGhlciB0byBwbGFjZSBhIG1vbnN0ZXIgaW4gZWFjaCByb29tXHJcbiAgICBjb25zdCBlbmNvdW50ZXJDaGFuY2UgPSAuNVxyXG4gICAgY29uc3Qgc2Vjb25kRW5jb3VudGVyQ2hhbmNlID0gLjJcclxuICAgIGNvbnN0IHRoaXJkRW5jb3VudGVyQ2hhbmNlID0gLjFcclxuXHJcbiAgICBmb3IgKGNvbnN0IHJvb20gb2Ygcm9vbXMpIHtcclxuICAgICAgICBpZiAocm9vbS5kZXB0aCA8PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJhbmQuY2hhbmNlKHJuZywgZW5jb3VudGVyQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5UGxhY2VNb25zdGVyKHJuZywgbW9uc3RlcnMsIGNlbGxzLCByb29tLCBtYXApXHJcblxyXG4gICAgICAgIGlmICghcmFuZC5jaGFuY2Uocm5nLCBzZWNvbmRFbmNvdW50ZXJDaGFuY2UpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cnlQbGFjZU1vbnN0ZXIocm5nLCBtb25zdGVycywgY2VsbHMsIHJvb20sIG1hcClcclxuXHJcbiAgICAgICAgaWYgKCFyYW5kLmNoYW5jZShybmcsIHRoaXJkRW5jb3VudGVyQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5UGxhY2VNb25zdGVyKHJuZywgbW9uc3RlcnMsIGNlbGxzLCByb29tLCBtYXApXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeVBsYWNlTW9uc3Rlcihybmc6IHJhbmQuUk5HLCBtb25zdGVyczogcmwuV2VpZ2h0ZWRMaXN0PHJsLk1vbnN0ZXI+LCBjZWxsczogQ2VsbEdyaWQsIHJvb206IFJvb20sIG1hcDogbWFwcy5NYXApOiBib29sZWFuIHtcclxuICAgIC8vIGF0dGVtcHQgdG8gcGxhY2UgbW9uc3RlclxyXG4gICAgZm9yIChjb25zdCBbdCwgcHRdIG9mIHZpc2l0SW50ZXJpb3IoY2VsbHMsIHJvb20uaW50ZXJpb3JQdCkpIHtcclxuICAgICAgICBpZiAodCAhPT0gQ2VsbFR5cGUuSW50ZXJpb3IpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpdGVyLmFueShtYXAsIHRoID0+ICh0aC5wb3NpdGlvbj8uZXF1YWwocHQpID8/IGZhbHNlKSAmJiAhdGgudGhpbmcucGFzc2FibGUpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtb25zdGVyID0gbW9uc3RlcnMuc2VsZWN0KHJuZylcclxuICAgICAgICBtYXAubW9uc3RlcnMuc2V0KHB0LCBtb25zdGVyLmNsb25lKCkpXHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlSXRlbXMocm5nOiByYW5kLlJORywgaXRlbXM6IHJsLldlaWdodGVkTGlzdDxybC5JdGVtPiwgY2VsbHM6IENlbGxHcmlkLCByb29tczogUm9vbVtdLCBtYXA6IG1hcHMuTWFwKSB7XHJcbiAgICAvLyBpdGVyYXRlIG92ZXIgcm9vbXMsIGRlY2lkZSB3aGV0aGVyIHRvIHBsYWNlIGEgbW9uc3RlciBpbiBlYWNoIHJvb21cclxuICAgIGNvbnN0IHRyZWFzdXJlQ2hhbmNlID0gLjI1XHJcbiAgICBmb3IgKGNvbnN0IHJvb20gb2Ygcm9vbXMpIHtcclxuICAgICAgICBpZiAocm9vbS5kZXB0aCA8PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJhbmQuY2hhbmNlKHJuZywgdHJlYXN1cmVDaGFuY2UpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cnlQbGFjZVRyZWFzdXJlKHJuZywgaXRlbXMsIGNlbGxzLCByb29tLCBtYXApXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeVBsYWNlVHJlYXN1cmUocm5nOiByYW5kLlJORywgaXRlbXM6IHJsLldlaWdodGVkTGlzdDxybC5JdGVtPiwgY2VsbHM6IENlbGxHcmlkLCByb29tOiBSb29tLCBtYXA6IG1hcHMuTWFwKTogYm9vbGVhbiB7XHJcbiAgICAvLyBhdHRlbXB0IHRvIHBsYWNlIHRyZWFzdXJlXHJcbiAgICBmb3IgKGNvbnN0IFt0LCBwdF0gb2YgdmlzaXRJbnRlcmlvcihjZWxscywgcm9vbS5pbnRlcmlvclB0KSkge1xyXG4gICAgICAgIGlmICh0ICE9PSBDZWxsVHlwZS5JbnRlcmlvcikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGl0ZXIuYW55KG1hcCwgdGggPT4gKHRoLnBvc2l0aW9uPy5lcXVhbChwdCkgPz8gZmFsc2UpICYmICF0aC50aGluZy5wYXNzYWJsZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNoZXN0ID0gdGhpbmdzLmNoZXN0LmNsb25lKClcclxuXHJcbiAgICAgICAgLy8gY2hvb3NlIGxvb3RcclxuICAgICAgICBjb25zdCBpdGVtID0gaXRlbXMuc2VsZWN0KHJuZylcclxuICAgICAgICBjaGVzdC5pdGVtcy5wdXNoKGl0ZW0uY2xvbmUoKSlcclxuXHJcbiAgICAgICAgLy8gZXh0cmEgbG9vdFxyXG4gICAgICAgIGxldCBleHRyYUxvb3RDaGFuY2UgPSAuNVxyXG4gICAgICAgIHdoaWxlIChyYW5kLmNoYW5jZShybmcsIGV4dHJhTG9vdENoYW5jZSkpIHtcclxuICAgICAgICAgICAgZXh0cmFMb290Q2hhbmNlICo9IC41XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBpdGVtcy5zZWxlY3Qocm5nKVxyXG4gICAgICAgICAgICBjaGVzdC5pdGVtcy5wdXNoKGl0ZW0uY2xvbmUoKSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1hcC5jb250YWluZXJzLnNldChwdCwgY2hlc3QpXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2VcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVDZWxsR3JpZChybmc6IHJhbmQuUk5HLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFtDZWxsR3JpZCwgUm9vbVtdXSB7XHJcbiAgICBjb25zdCBjZWxscyA9IGdyaWQuZ2VuZXJhdGUod2lkdGgsIGhlaWdodCwgKCkgPT4gQ2VsbFR5cGUuRXh0ZXJpb3IpXHJcblxyXG4gICAgLy8gZ2VuZXJhdGUgcm9vbSB0ZW1wbGF0ZXNcclxuICAgIGNvbnN0IHRlbXBsYXRlcyA9IGdlbmVyYXRlUm9vbVRlbXBsYXRlcygpXHJcbiAgICBjb25zdCBzdGFjazogUm9vbVtdID0gW11cclxuICAgIGNvbnN0IHJvb21zOiBSb29tW10gPSBbXVxyXG5cclxuICAgIC8vIHBsYWNlIGluaXRpYWwgcm9vbVxyXG4gICAge1xyXG4gICAgICAgIHJhbmQuc2h1ZmZsZShybmcsIHRlbXBsYXRlcylcclxuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRlbXBsYXRlc1swXVxyXG5cclxuICAgICAgICBjb25zdCBwdCA9IG5ldyBnZW8uUG9pbnQoXHJcbiAgICAgICAgICAgIHJhbmQuaW50KHJuZywgMCwgd2lkdGggLSB0ZW1wbGF0ZS5jZWxscy53aWR0aCArIDEpLFxyXG4gICAgICAgICAgICByYW5kLmludChybmcsIDAsIGhlaWdodCAtIHRlbXBsYXRlLmNlbGxzLmhlaWdodCArIDEpKVxyXG5cclxuICAgICAgICBjb25zdCByb29tID0gcGxhY2VUZW1wbGF0ZShybmcsIGNlbGxzLCB0ZW1wbGF0ZSwgcHQpXHJcbiAgICAgICAgc3RhY2sucHVzaChyb29tKVxyXG4gICAgICAgIHJvb21zLnB1c2gocm9vbSlcclxuICAgIH1cclxuXHJcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnN0IHJvb20gPSBhcnJheS5wb3Aoc3RhY2spXHJcbiAgICAgICAgY29uc3QgbmV4dFJvb20gPSB0cnlUdW5uZWxGcm9tKHJuZywgY2VsbHMsIHRlbXBsYXRlcywgcm9vbSlcclxuXHJcbiAgICAgICAgaWYgKG5leHRSb29tKSB7XHJcbiAgICAgICAgICAgIHN0YWNrLnB1c2gocm9vbSlcclxuICAgICAgICAgICAgc3RhY2sucHVzaChuZXh0Um9vbSlcclxuICAgICAgICAgICAgcm9vbXMucHVzaChuZXh0Um9vbSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFtjZWxscywgcm9vbXNdXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeVR1bm5lbEZyb20ocm5nOiByYW5kLlJORywgY2VsbHM6IENlbGxHcmlkLCB0ZW1wbGF0ZXM6IFJvb21UZW1wbGF0ZVtdLCByb29tOiBSb29tKTogUm9vbSB8IG51bGwge1xyXG4gICAgcmFuZC5zaHVmZmxlKHJuZywgdGVtcGxhdGVzKVxyXG5cclxuICAgIHdoaWxlIChyb29tLnR1bm5lbFB0cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc3QgdHB0ID0gYXJyYXkucG9wKHJvb20udHVubmVsUHRzKVxyXG4gICAgICAgIGZvciAoY29uc3QgdGVtcGxhdGUgb2YgdGVtcGxhdGVzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5leHRSb29tID0gdHJ5VHVubmVsVG8ocm5nLCBjZWxscywgdHB0LCB0ZW1wbGF0ZSlcclxuICAgICAgICAgICAgaWYgKG5leHRSb29tKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBwbGFjZSBkb29yIGF0IHR1bm5lbCBwb2ludFxyXG4gICAgICAgICAgICAgICAgcm9vbS50dW5uZWxQdHMgPSByb29tLnR1bm5lbFB0cy5maWx0ZXIocHQgPT4gIXB0LmVxdWFsKHRwdCkpXHJcbiAgICAgICAgICAgICAgICBjZWxscy5zZXRQb2ludCh0cHQsIENlbGxUeXBlLkRvb3IpXHJcbiAgICAgICAgICAgICAgICBuZXh0Um9vbS5kZXB0aCA9IHJvb20uZGVwdGggKyAxXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV4dFJvb21cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51bGxcclxufVxyXG5cclxuZnVuY3Rpb24gdHJ5VHVubmVsVG8ocm5nOiByYW5kLlJORywgY2VsbHM6IENlbGxHcmlkLCB0cHQxOiBnZW8uUG9pbnQsIHRlbXBsYXRlOiBSb29tVGVtcGxhdGUpOiBSb29tIHwgbnVsbCB7XHJcbiAgICAvLyBmaW5kIHR1bm5lbCBwb2ludHMgb2YgdGVtcGxhdGVcclxuICAgIGZvciAoY29uc3QgdHB0MiBvZiB0ZW1wbGF0ZS50dW5uZWxQdHMpIHtcclxuICAgICAgICBjb25zdCBvZmZzZXQgPSB0cHQxLnN1YlBvaW50KHRwdDIpXHJcbiAgICAgICAgaWYgKGlzVmFsaWRQbGFjZW1lbnQodGVtcGxhdGUuY2VsbHMsIGNlbGxzLCBvZmZzZXQpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwbGFjZVRlbXBsYXRlKHJuZywgY2VsbHMsIHRlbXBsYXRlLCBvZmZzZXQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlVGVtcGxhdGUocm5nOiByYW5kLlJORywgY2VsbHM6IENlbGxHcmlkLCB0ZW1wbGF0ZTogUm9vbVRlbXBsYXRlLCBvZmZzZXQ6IGdlby5Qb2ludCk6IFJvb20ge1xyXG4gICAgZ3JpZC5jb3B5KHRlbXBsYXRlLmNlbGxzLCBjZWxscywgb2Zmc2V0LngsIG9mZnNldC55KVxyXG5cclxuICAgIC8vIGZpbmQgdHVubmVsYWJsZSBwb2ludHNcclxuICAgIGNvbnN0IGludGVyaW9yUHQgPSB0ZW1wbGF0ZS5pbnRlcmlvclB0LmFkZFBvaW50KG9mZnNldClcclxuICAgIGNvbnN0IHR1bm5lbFB0cyA9IHRlbXBsYXRlLnR1bm5lbFB0cy5tYXAocHQgPT4gcHQuYWRkUG9pbnQob2Zmc2V0KSkuZmlsdGVyKHB0ID0+IGZpbmRFeHRlcmlvck5laWdoYm9yKGNlbGxzLCBwdCkgIT09IG51bGwpXHJcbiAgICByYW5kLnNodWZmbGUocm5nLCB0dW5uZWxQdHMpXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBpbnRlcmlvclB0LFxyXG4gICAgICAgIHR1bm5lbFB0cyxcclxuICAgICAgICBkZXB0aDogMFxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVJvb21UZW1wbGF0ZXMoKTogUm9vbVRlbXBsYXRlW10ge1xyXG4gICAgY29uc3QgbGVuZ3RocyA9IFs0LCA1LCA2LCA3LCA4LCA5LCAxMCwgMTFdXHJcbiAgICBjb25zdCBwYWlycyA9IGxlbmd0aHMubWFwKHggPT4gbGVuZ3Rocy5tYXAoeSA9PiBbeCwgeV0pKS5mbGF0KCkuZmlsdGVyKGEgPT4gYVswXSA+IDMgfHwgYVsxXSA+IDMpXHJcbiAgICBjb25zdCB0ZW1wbGF0ZXMgPSBwYWlycy5tYXAoYSA9PiBnZW5lcmF0ZVJvb21UZW1wbGF0ZShhWzBdLCBhWzFdKSlcclxuICAgIHJldHVybiB0ZW1wbGF0ZXNcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVSb29tVGVtcGxhdGUod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBSb29tVGVtcGxhdGUge1xyXG4gICAgY29uc3QgaW50ZXJpb3JQdCA9IG5ldyBnZW8uUG9pbnQod2lkdGggLyAyLCBoZWlnaHQgLyAyKS5mbG9vcigpXHJcbiAgICBjb25zdCBjZWxscyA9IGdyaWQuZ2VuZXJhdGUoXHJcbiAgICAgICAgd2lkdGgsXHJcbiAgICAgICAgaGVpZ2h0LFxyXG4gICAgICAgICh4LCB5KSA9PiB4ID09PSAwIHx8IHggPT09IHdpZHRoIC0gMSB8fCB5ID09PSAwIHx8IHkgPT09IGhlaWdodCAtIDEgPyBDZWxsVHlwZS5XYWxsIDogQ2VsbFR5cGUuSW50ZXJpb3IpXHJcblxyXG4gICAgY29uc3QgdHVubmVsUHRzOiBnZW8uUG9pbnRbXSA9IFtdXHJcbiAgICB0dW5uZWxQdHMucHVzaCguLi5ncmlkLnNjYW4oMSwgMCwgd2lkdGggLSAyLCAxKSlcclxuICAgIHR1bm5lbFB0cy5wdXNoKC4uLmdyaWQuc2NhbigwLCAxLCAxLCBoZWlnaHQgLSAyKSlcclxuICAgIHR1bm5lbFB0cy5wdXNoKC4uLmdyaWQuc2NhbigxLCBoZWlnaHQgLSAxLCB3aWR0aCAtIDIsIDEpKVxyXG4gICAgdHVubmVsUHRzLnB1c2goLi4uZ3JpZC5zY2FuKHdpZHRoIC0gMSwgMSwgMSwgaGVpZ2h0IC0gMikpXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBpbnRlcmlvclB0LFxyXG4gICAgICAgIGNlbGxzLFxyXG4gICAgICAgIHR1bm5lbFB0c1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kRXh0ZXJpb3JOZWlnaGJvcihjZWxsczogQ2VsbEdyaWQsIHB0OiBnZW8uUG9pbnQpOiBnZW8uUG9pbnQgfCBudWxsIHtcclxuICAgIGZvciAoY29uc3QgW3QsIG5wdF0gb2YgZ3JpZC52aXNpdE5laWdoYm9ycyhjZWxscywgcHQpKSB7XHJcbiAgICAgICAgaWYgKHQgPT09IENlbGxUeXBlLkV4dGVyaW9yKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBucHRcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51bGxcclxufVxyXG5cclxuZnVuY3Rpb24gdmlzaXRJbnRlcmlvckNvb3JkcyhjZWxsczogQ2VsbEdyaWQsIHB0MDogZ2VvLlBvaW50KTogSXRlcmFibGU8Z2VvLlBvaW50PiB7XHJcbiAgICByZXR1cm4gaXRlci5tYXAodmlzaXRJbnRlcmlvcihjZWxscywgcHQwKSwgeCA9PiB4WzFdKVxyXG59XHJcblxyXG5mdW5jdGlvbiogdmlzaXRJbnRlcmlvcihjZWxsczogQ2VsbEdyaWQsIHB0MDogZ2VvLlBvaW50KTogSXRlcmFibGU8W0NlbGxUeXBlLCBnZW8uUG9pbnRdPiB7XHJcbiAgICBjb25zdCBleHBsb3JlZCA9IGNlbGxzLm1hcDIoKCkgPT4gZmFsc2UpXHJcbiAgICBjb25zdCBzdGFjayA9IFtwdDBdXHJcblxyXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjb25zdCBwdCA9IGFycmF5LnBvcChzdGFjaylcclxuICAgICAgICBleHBsb3JlZC5zZXRQb2ludChwdCwgdHJ1ZSlcclxuICAgICAgICBjb25zdCB0ID0gY2VsbHMuYXRQb2ludChwdClcclxuICAgICAgICB5aWVsZCBbdCwgcHRdXHJcblxyXG4gICAgICAgIC8vIGlmIHRoaXMgaXMgYSB3YWxsLCBkbyBub3QgZXhwbG9yZSBuZWlnaGJvcnNcclxuICAgICAgICBpZiAodCA9PT0gQ2VsbFR5cGUuV2FsbCkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gb3RoZXJ3aXNlLCBleHBsb3JlIG5laWdoYm9ycywgcHVzaGluZyBvbnRvIHN0YWNrIHRob3NlIHRoYXQgYXJlIHVuZXhwbG9yZWRcclxuICAgICAgICBmb3IgKGNvbnN0IFt0LCBucHRdIG9mIGdyaWQudmlzaXROZWlnaGJvcnMoY2VsbHMsIHB0KSkge1xyXG4gICAgICAgICAgICBpZiAoZXhwbG9yZWQuYXRQb2ludChucHQpKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodCAhPT0gQ2VsbFR5cGUuSW50ZXJpb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobnB0KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFBsYWNlbWVudChzcmM6IENlbGxHcmlkLCBkc3Q6IENlbGxHcmlkLCBvZmZzZXQ6IGdlby5Qb2ludCk6IGJvb2xlYW4ge1xyXG4gICAgaWYgKCFkc3QucmVnaW9uSW5Cb3VuZHMob2Zmc2V0LngsIG9mZnNldC55LCBzcmMud2lkdGgsIHNyYy5oZWlnaHQpKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCBbc3QsIHgsIHldIG9mIHNyYy5zY2FuKCkpIHtcclxuICAgICAgICAvLyBydWxlczpcclxuICAgICAgICAvLyBjYW4gcGxhY2Ugd2FsbCBvdmVyIHdhbGxcclxuICAgICAgICAvLyBjYW4gcGxhY2UgYW55dGhpbmcgb3ZlciBleHRlcmlvclxyXG4gICAgICAgIGNvbnN0IGR0ID0gZHN0LmF0KHggKyBvZmZzZXQueCwgeSArIG9mZnNldC55KVxyXG4gICAgICAgIGlmIChkdCA9PT0gQ2VsbFR5cGUuRXh0ZXJpb3IpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChkdCA9PT0gQ2VsbFR5cGUuV2FsbCAmJiBzdCA9PT0gQ2VsbFR5cGUuV2FsbCkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWVcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlT3V0ZG9vck1hcChwbGF5ZXI6IHJsLlBsYXllciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBQcm9taXNlPG1hcHMuTWFwPiB7XHJcbiAgICBjb25zdCBtYXAgPSBuZXcgbWFwcy5NYXAod2lkdGgsIGhlaWdodClcclxuICAgIG1hcC5saWdodGluZyA9IG1hcHMuTGlnaHRpbmcuQW1iaWVudFxyXG4gICAgZ2VuZXJhdGVPdXRkb29yVGVycmFpbihtYXApXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmVudW0gT3V0ZG9vclRpbGVUeXBlIHtcclxuICAgIHdhdGVyLFxyXG4gICAgZ3Jhc3MsXHJcbiAgICBkaXJ0LFxyXG4gICAgc2FuZFxyXG59XHJcblxyXG5lbnVtIE91dGRvb3JGaXh0dXJlVHlwZSB7XHJcbiAgICBub25lLFxyXG4gICAgaGlsbHMsXHJcbiAgICBtb3VudGFpbnMsXHJcbiAgICB0cmVlcyxcclxuICAgIHNub3dcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVPdXRkb29yVGVycmFpbihtYXA6IG1hcHMuTWFwKSB7XHJcbiAgICBjb25zdCB0aWxlcyA9IGdyaWQuZ2VuZXJhdGUobWFwLndpZHRoLCBtYXAuaGVpZ2h0LCAoKSA9PiBPdXRkb29yVGlsZVR5cGUud2F0ZXIpXHJcbiAgICBjb25zdCBmaXh0dXJlcyA9IGdyaWQuZ2VuZXJhdGUobWFwLndpZHRoLCBtYXAuaGVpZ2h0LCAoKSA9PiBPdXRkb29yRml4dHVyZVR5cGUubm9uZSlcclxuXHJcbiAgICAvLyBUT0RPIC0gcmFuZG9tbHkgYmlhcyBwZXJsaW4gbm9pc2UgaW5zdGVhZFxyXG4gICAgLy8gY29uc3QgYmlhcz0gcmFuZC5pbnQoMCwgMjU2KVxyXG4gICAgY29uc3QgYmlhcyA9IDBcclxuXHJcbiAgICBjb25zdCBoZWlnaHRNYXAgPSBmYm0obWFwLndpZHRoLCBtYXAuaGVpZ2h0LCBiaWFzLCA4IC8gbWFwLndpZHRoLCAyLCAuNSwgOClcclxuXHJcbiAgICBpbWFnaW5nLnNjYW4obWFwLndpZHRoLCBtYXAuaGVpZ2h0LCAoeCwgeSwgb2Zmc2V0KSA9PiB7XHJcbiAgICAgICAgY29uc3QgaCA9IGhlaWdodE1hcFtvZmZzZXRdXHJcbiAgICAgICAgaWYgKGggPiAwKSB7XHJcbiAgICAgICAgICAgIHRpbGVzLnNldCh4LCB5LCBPdXRkb29yVGlsZVR5cGUuZGlydClcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG5cclxuICAgIG1hcC5wbGF5ZXIucG9zaXRpb24gPSB0aWxlcy5maW5kUG9pbnQodCA9PiB0ICE9PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpID8/IG5ldyBnZW8uUG9pbnQoMCwgMClcclxuXHJcbiAgICBmb3IgKGNvbnN0IFt0LCB4LCB5XSBvZiB0aWxlcy5zY2FuKCkpIHtcclxuICAgICAgICBzd2l0Y2ggKHQpIHtcclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vclRpbGVUeXBlLndhdGVyKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRoaW5ncy53YXRlci5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuc2V0KG5ldyBnZW8uUG9pbnQoeCwgeSksIHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yVGlsZVR5cGUuZGlydCk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aGluZ3MuZGlydC5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuc2V0KG5ldyBnZW8uUG9pbnQoeCwgeSksIHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yVGlsZVR5cGUuZ3Jhc3MpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gdGhpbmdzLmdyYXNzLmNsb25lKClcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5zZXQobmV3IGdlby5Qb2ludCh4LCB5KSwgdGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JUaWxlVHlwZS5zYW5kKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRoaW5ncy5zYW5kLmNsb25lKClcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5zZXQobmV3IGdlby5Qb2ludCh4LCB5KSwgdGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCBbZiwgeCwgeV0gb2YgZml4dHVyZXMuc2NhbigpKSB7XHJcbiAgICAgICAgc3dpdGNoIChmKSB7XHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JGaXh0dXJlVHlwZS5oaWxscyk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeHR1cmUgPSB0aGluZ3MuaGlsbHMuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgbWFwLmZpeHR1cmVzLnNldChuZXcgZ2VvLlBvaW50KHgsIHkpLCBmaXh0dXJlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vckZpeHR1cmVUeXBlLm1vdW50YWlucyk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeHR1cmUgPSB0aGluZ3MubW91bnRhaW5zLmNsb25lKClcclxuICAgICAgICAgICAgICAgIG1hcC5maXh0dXJlcy5zZXQobmV3IGdlby5Qb2ludCh4LCB5KSwgZml4dHVyZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JGaXh0dXJlVHlwZS50cmVlcyk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeHR1cmUgPSB0aGluZ3MudHJlZXMuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgbWFwLmZpeHR1cmVzLnNldChuZXcgZ2VvLlBvaW50KHgsIHkpLCBmaXh0dXJlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vckZpeHR1cmVUeXBlLnNub3cpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaXh0dXJlID0gdGhpbmdzLnNub3cuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgbWFwLmZpeHR1cmVzLnNldChuZXcgZ2VvLlBvaW50KHgsIHkpLCBmaXh0dXJlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VMYW5kbWFzc2VzKHJuZzogcmFuZC5STkcsIHRpbGVzOiBncmlkLkdyaWQ8T3V0ZG9vclRpbGVUeXBlPikge1xyXG4gICAgY29uc3QgbWF4VGlsZXMgPSBNYXRoLmNlaWwodGlsZXMuc2l6ZSAqIHJhbmQuZmxvYXQocm5nLCAuMywgLjUpKVxyXG4gICAgZ3Jvd0xhbmQocm5nLCB0aWxlcywgbWF4VGlsZXMpXHJcblxyXG4gICAgLy8gZmluZCBtYXhpbWFsIHdhdGVyIHJlY3QgLSBpZiBsYXJnZSBlbm91Z2gsIHBsYW50IGlzbGFuZFxyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICBjb25zdCBhYWJiID0gZ3JpZC5maW5kTWF4aW1hbFJlY3QodGlsZXMsIHQgPT4gdCA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKS5zaHJpbmsoMSlcclxuICAgICAgICBpZiAoYWFiYi5hcmVhIDwgMTIpIHtcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHZpZXcgPSB0aWxlcy52aWV3QUFCQihhYWJiKVxyXG4gICAgICAgIGNvbnN0IGlzbGFuZFRpbGVzID0gYWFiYi5hcmVhICogcmFuZC5mbG9hdChybmcsIC4yNSwgMSlcclxuICAgICAgICBncm93TGFuZChybmcsIHZpZXcsIGlzbGFuZFRpbGVzKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIHBsYWNlIHNvbWUgaXNsYW5kc1xyXG4gICAgcGxhY2VCZWFjaGVzKHRpbGVzKVxyXG59XHJcblxyXG5mdW5jdGlvbiBncm93TGFuZChybmc6IHJhbmQuUk5HLCB0aWxlczogZ3JpZC5HcmlkPE91dGRvb3JUaWxlVHlwZT4sIG1heFRpbGVzOiBudW1iZXIpIHtcclxuICAgIC8vIFwicGxhbnRcIiBhIGNvbnRpbmVudFxyXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgQXJyYXk8Z2VvLlBvaW50PigpXHJcbiAgICBjb25zdCBzZWVkID0gbmV3IGdlby5Qb2ludCh0aWxlcy53aWR0aCAvIDIsIHRpbGVzLmhlaWdodCAvIDIpLmZsb29yKClcclxuICAgIHN0YWNrLnB1c2goc2VlZClcclxuICAgIGxldCBwbGFjZWQgPSAwXHJcblxyXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDAgJiYgcGxhY2VkIDwgbWF4VGlsZXMpIHtcclxuICAgICAgICBjb25zdCBwdCA9IGFycmF5LnBvcChzdGFjaylcclxuICAgICAgICB0aWxlcy5zZXRQb2ludChwdCwgT3V0ZG9vclRpbGVUeXBlLmdyYXNzKVxyXG4gICAgICAgICsrcGxhY2VkXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgW3QsIHh5XSBvZiBncmlkLnZpc2l0TmVpZ2hib3JzKHRpbGVzLCBwdCkpIHtcclxuICAgICAgICAgICAgaWYgKHQgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh4eSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmFuZC5zaHVmZmxlKHJuZywgc3RhY2spXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlQmVhY2hlcyh0aWxlczogZ3JpZC5HcmlkPE91dGRvb3JUaWxlVHlwZT4pIHtcclxuICAgIGZvciAoY29uc3QgcHQgb2YgZ3JpZC5zY2FuKDAsIDAsIHRpbGVzLndpZHRoLCB0aWxlcy5oZWlnaHQpKSB7XHJcbiAgICAgICAgaWYgKHRpbGVzLmF0UG9pbnQocHQpID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwdC54ID4gMCAmJiB0aWxlcy5hdChwdC54IC0gMSwgcHQueSkgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICB0aWxlcy5zZXRQb2ludChwdCwgT3V0ZG9vclRpbGVUeXBlLnNhbmQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocHQueCA8IHRpbGVzLndpZHRoIC0gMSAmJiB0aWxlcy5hdChwdC54ICsgMSwgcHQueSkgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICB0aWxlcy5zZXRQb2ludChwdCwgT3V0ZG9vclRpbGVUeXBlLnNhbmQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocHQueSA+IDAgJiYgdGlsZXMuYXQocHQueCwgcHQueSAtIDEpID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgdGlsZXMuc2V0UG9pbnQocHQsIE91dGRvb3JUaWxlVHlwZS5zYW5kKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHB0LnkgPCB0aWxlcy5oZWlnaHQgLSAxICYmIHRpbGVzLmF0KHB0LngsIHB0LnkgKyAxKSA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgIHRpbGVzLnNldFBvaW50KHB0LCBPdXRkb29yVGlsZVR5cGUuc2FuZClcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlU25vdyh0aWxlczogZ3JpZC5HcmlkPE91dGRvb3JUaWxlVHlwZT4sIGZpeHR1cmVzOiBncmlkLkdyaWQ8T3V0ZG9vckZpeHR1cmVUeXBlPikge1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSB0aWxlc1xyXG4gICAgY29uc3Qgc25vd0hlaWdodCA9IE1hdGguY2VpbChoZWlnaHQgLyAzKVxyXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBzbm93SGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyArK3gpIHtcclxuICAgICAgICAgICAgY29uc3QgdCA9IHRpbGVzLmF0KHgsIHkpXHJcbiAgICAgICAgICAgIGlmICh0ICE9PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgICAgIGZpeHR1cmVzLnNldCh4LCB5LCBPdXRkb29yRml4dHVyZVR5cGUuc25vdylcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VNb3VudGFpbnMocm5nOiByYW5kLlJORywgdGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+LCBmaXh0dXJlczogZ3JpZC5HcmlkPE91dGRvb3JGaXh0dXJlVHlwZT4sIG1heFRpbGVzOiBudW1iZXIpIHtcclxuICAgIC8vIGZpbmQgYSBzdWl0YWJsZSBzdGFydCBwb2ludCBmb3IgbW91bnRhaW4gcmFuZ2VcclxuICAgIGNvbnN0IHNlZWQgPSByYW5kLmNob29zZShybmcsIFsuLi50aWxlcy5maW5kUG9pbnRzKHggPT4geCAhPT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyICYmIHggIT09IE91dGRvb3JUaWxlVHlwZS5zYW5kKV0pXHJcbiAgICBjb25zdCBzdGFjayA9IG5ldyBBcnJheTxnZW8uUG9pbnQ+KClcclxuICAgIHN0YWNrLnB1c2goc2VlZClcclxuICAgIGxldCBwbGFjZWQgPSAwXHJcblxyXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDAgJiYgcGxhY2VkIDwgbWF4VGlsZXMpIHtcclxuICAgICAgICBjb25zdCBwdCA9IGFycmF5LnBvcChzdGFjaylcclxuICAgICAgICBmaXh0dXJlcy5zZXRQb2ludChwdCwgT3V0ZG9vckZpeHR1cmVUeXBlLm1vdW50YWlucylcclxuICAgICAgICArK3BsYWNlZFxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IFt0LCB4eV0gb2YgZ3JpZC52aXNpdE5laWdoYm9ycyh0aWxlcywgcHQpKSB7XHJcbiAgICAgICAgICAgIGlmICh0ICE9PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIgJiYgdCAhPT0gT3V0ZG9vclRpbGVUeXBlLnNhbmQpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeHkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJhbmQuc2h1ZmZsZShybmcsIHN0YWNrKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmYm0od2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIGJpYXM6IG51bWJlciwgZnJlcTogbnVtYmVyLCBsYWN1bmFyaXR5OiBudW1iZXIsIGdhaW46IG51bWJlciwgb2N0YXZlczogbnVtYmVyKTogbnVtYmVyW10ge1xyXG4gICAgcmV0dXJuIGltYWdpbmcuZ2VuZXJhdGUod2lkdGgsIGhlaWdodCwgKHgsIHkpID0+IHtcclxuICAgICAgICByZXR1cm4gbm9pc2UuZmJtUGVybGluMih4ICogZnJlcSArIGJpYXMsIHkgKiBmcmVxICsgYmlhcywgbGFjdW5hcml0eSwgZ2Fpbiwgb2N0YXZlcylcclxuICAgIH0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU1vbnN0ZXJMaXN0KGRiOiBybC5UaGluZ0RCLCBmbG9vcjogbnVtYmVyKTogcmwuV2VpZ2h0ZWRMaXN0PHJsLk1vbnN0ZXI+IHtcclxuICAgIC8vIGNyZWF0ZSB3ZWlnaHRlZCBsaXN0IG9mIG1vbnN0ZXJzL2l0ZW1zIGFwcHJvcHJpYXRlIGZvciBsZXZlbFxyXG4gICAgY29uc3QgbGlzdDogW3JsLk1vbnN0ZXIsIG51bWJlcl1bXSA9IFtdXHJcbiAgICBmb3IgKGNvbnN0IG1vbnN0ZXIgb2YgZGIpIHtcclxuICAgICAgICBpZiAoIShtb25zdGVyIGluc3RhbmNlb2YgcmwuTW9uc3RlcikpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChtb25zdGVyLmxldmVsID4gZmxvb3IpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChtb25zdGVyLmxldmVsIDw9IDApIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB3ID0gbW9uc3Rlci5mcmVxXHJcbiAgICAgICAgbGV0IGRsID0gTWF0aC5hYnMobW9uc3Rlci5sZXZlbCAtIGZsb29yKVxyXG4gICAgICAgIGlmIChkbCA+IDApIHtcclxuICAgICAgICAgICAgdyAvPSAoZGwgKyAxKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGlzdC5wdXNoKFttb25zdGVyLCB3XSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV3IHJsLldlaWdodGVkTGlzdChsaXN0KVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVJdGVtTGlzdChkYjogcmwuVGhpbmdEQiwgZmxvb3I6IG51bWJlcikge1xyXG4gICAgLy8gY3JlYXRlIHdlaWdodGVkIGxpc3Qgb2YgbW9uc3RlcnMvaXRlbXMgYXBwcm9wcmlhdGUgZm9yIGxldmVsXHJcbiAgICBjb25zdCBsaXN0OiBbcmwuSXRlbSwgbnVtYmVyXVtdID0gW11cclxuICAgIGZvciAoY29uc3QgaXRlbSBvZiBkYikge1xyXG4gICAgICAgIGlmICghKGl0ZW0gaW5zdGFuY2VvZiBybC5JdGVtKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGl0ZW0ubGV2ZWwgPiBmbG9vciArIDEpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpdGVtLmxldmVsIDw9IDAgfHwgaXRlbS5sZXZlbCA8IGZsb29yIC0gMikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHcgPSBpdGVtLmZyZXFcclxuICAgICAgICBsZXQgZGwgPSBNYXRoLmFicyhpdGVtLmxldmVsIC0gZmxvb3IpXHJcbiAgICAgICAgaWYgKGRsID4gMCkge1xyXG4gICAgICAgICAgICB3IC89IChkbCArIDEpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsaXN0LnB1c2goW2l0ZW0sIHddKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBuZXcgcmwuV2VpZ2h0ZWRMaXN0KGxpc3QpXHJcbn0iXX0=