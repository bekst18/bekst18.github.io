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
export async function generateDungeonLevel(rng, db, player, floor) {
    let minDim = 24;
    let maxDim = 32 + floor * 4;
    let dimDice = new rl.Dice(minDim, maxDim);
    let width = dimDice.roll(rng);
    let height = dimDice.roll(rng);
    const monsters = createMonsterList(db, floor);
    const items = createItemList(db, floor);
    const map = generateMapRooms(rng, monsters, items, width, height, player);
    map.lighting = maps.Lighting.None;
    return map;
}
function generateMapRooms(rng, monsters, items, width, height, player) {
    const map = new maps.Map(width, height, 1, { position: new geo.Point(0, 0), thing: player });
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
    map.player.position = firstRoom.interiorPt.clone();
    const stairsUp = tileset.stairsUp.clone();
    const stairsUpPosition = iter.find(visitInteriorCoords(cells, firstRoom.interiorPt), pt => iter.any(grid.visitNeighbors(cells, pt), a => a[0] === CellType.Wall));
    if (!stairsUpPosition) {
        throw new Error("Failed to place stairs up");
    }
    map.fixtures.set(stairsUpPosition, stairsUp);
    const lastRoom = rooms.reduce((x, y) => x.depth > y.depth ? x : y);
    const stairsDown = tileset.stairsDown.clone();
    const stairsDownPosition = iter.find(visitInteriorCoords(cells, lastRoom.interiorPt), pt => iter.any(grid.visitNeighbors(cells, pt), a => a[0] === CellType.Wall));
    if (!stairsDownPosition) {
        throw new Error("Failed to place stairs down");
    }
    map.fixtures.set(stairsDownPosition, stairsDown);
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
    return map;
}
function placeMonsters(rng, monsters, cells, rooms, map) {
    // iterate over rooms, decide whether to place a monster in each room
    const encounterChance = .35;
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
        map.monsters.set(pt, monster);
        return true;
    }
    return false;
}
function placeItems(rng, items, cells, rooms, map) {
    // iterate over rooms, decide whether to place a monster in each room
    const treasureChance = .2;
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
        chest.items.add(item);
        // extra loot
        let extraLootChance = .5;
        while (rand.chance(rng, extraLootChance)) {
            extraLootChance *= .5;
            const item = items.select(rng);
            chest.items.add(item);
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
    const map = new maps.Map(width, height, 0, { position: new geo.Point(0, 0), thing: player });
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
        if (monster.level > floor + 1) {
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
    console.log(list);
    return new rl.WeightedList(list);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0gsT0FBTyxLQUFLLEVBQUUsTUFBTSxTQUFTLENBQUE7QUFDN0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBQ2pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQVUvQyxNQUFNLE9BQU8sR0FBbUI7SUFDNUIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFO0lBQzlCLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRTtJQUMzQixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7SUFDekIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO0lBQ2pDLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRTtDQUN4QyxDQUFBO0FBRUQsSUFBSyxRQUtKO0FBTEQsV0FBSyxRQUFRO0lBQ1QsK0NBQVEsQ0FBQTtJQUNSLCtDQUFRLENBQUE7SUFDUix1Q0FBSSxDQUFBO0lBQ0osdUNBQUksQ0FBQTtBQUNSLENBQUMsRUFMSSxRQUFRLEtBQVIsUUFBUSxRQUtaO0FBZ0JELE1BQU0sQ0FBQyxLQUFLLFVBQVUsb0JBQW9CLENB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QUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQzFCO0lBRUQsT0FBTyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDcEMsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLEVBQWMsRUFBRSxLQUFhO0lBQ2pELCtEQUErRDtJQUMvRCxNQUFNLElBQUksR0FBd0IsRUFBRSxDQUFBO0lBQ3BDLEtBQUssTUFBTSxJQUFJLElBQUksRUFBRSxFQUFFO1FBQ25CLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDNUIsU0FBUTtTQUNYO1FBRUQsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssR0FBRyxDQUFDLEVBQUU7WUFDeEIsU0FBUTtTQUNYO1FBRUQsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssR0FBRyxDQUFDLEVBQUU7WUFDM0MsU0FBUTtTQUNYO1FBRUQsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQTtRQUNqQixJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUE7UUFDckMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ1IsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1NBQ2hCO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQ3ZCO0lBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNqQixPQUFPLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUNwQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIG1hcCBnZW5lcmF0aW9uIGxpYnJhcnlcclxuICovXHJcbmltcG9ydCAqIGFzIHJsIGZyb20gXCIuL3JsLmpzXCJcclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvMmQuanNcIlxyXG5pbXBvcnQgKiBhcyBncmlkIGZyb20gXCIuLi9zaGFyZWQvZ3JpZC5qc1wiXHJcbmltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIlxyXG5pbXBvcnQgKiBhcyBpdGVyIGZyb20gXCIuLi9zaGFyZWQvaXRlci5qc1wiXHJcbmltcG9ydCAqIGFzIHJhbmQgZnJvbSBcIi4uL3NoYXJlZC9yYW5kLmpzXCJcclxuaW1wb3J0ICogYXMgdGhpbmdzIGZyb20gXCIuL3RoaW5ncy5qc1wiXHJcbmltcG9ydCAqIGFzIG1hcHMgZnJvbSBcIi4vbWFwcy5qc1wiXHJcbmltcG9ydCAqIGFzIG5vaXNlIGZyb20gXCIuLi9zaGFyZWQvbm9pc2UuanNcIlxyXG5pbXBvcnQgKiBhcyBpbWFnaW5nIGZyb20gXCIuLi9zaGFyZWQvaW1hZ2luZy5qc1wiXHJcblxyXG5pbnRlcmZhY2UgRHVuZ2VvblRpbGVzZXQge1xyXG4gICAgd2FsbDogcmwuVGlsZSxcclxuICAgIGZsb29yOiBybC5UaWxlLFxyXG4gICAgZG9vcjogcmwuRG9vcixcclxuICAgIHN0YWlyc1VwOiBybC5FeGl0XHJcbiAgICBzdGFpcnNEb3duOiBybC5FeGl0XHJcbn1cclxuXHJcbmNvbnN0IHRpbGVzZXQ6IER1bmdlb25UaWxlc2V0ID0ge1xyXG4gICAgd2FsbDogdGhpbmdzLmJyaWNrV2FsbC5jbG9uZSgpLFxyXG4gICAgZmxvb3I6IHRoaW5ncy5mbG9vci5jbG9uZSgpLFxyXG4gICAgZG9vcjogdGhpbmdzLmRvb3IuY2xvbmUoKSxcclxuICAgIHN0YWlyc1VwOiB0aGluZ3Muc3RhaXJzVXAuY2xvbmUoKSxcclxuICAgIHN0YWlyc0Rvd246IHRoaW5ncy5zdGFpcnNEb3duLmNsb25lKClcclxufVxyXG5cclxuZW51bSBDZWxsVHlwZSB7XHJcbiAgICBFeHRlcmlvcixcclxuICAgIEludGVyaW9yLFxyXG4gICAgV2FsbCxcclxuICAgIERvb3JcclxufVxyXG5cclxudHlwZSBDZWxsR3JpZCA9IGdyaWQuR3JpZDxDZWxsVHlwZT5cclxuXHJcbmludGVyZmFjZSBSb29tVGVtcGxhdGUge1xyXG4gICAgY2VsbHM6IENlbGxHcmlkXHJcbiAgICBpbnRlcmlvclB0OiBnZW8uUG9pbnRcclxuICAgIHR1bm5lbFB0czogZ2VvLlBvaW50W11cclxufVxyXG5cclxuaW50ZXJmYWNlIFJvb20ge1xyXG4gICAgaW50ZXJpb3JQdDogZ2VvLlBvaW50XHJcbiAgICB0dW5uZWxQdHM6IGdlby5Qb2ludFtdXHJcbiAgICBkZXB0aDogbnVtYmVyLFxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVEdW5nZW9uTGV2ZWwocm5nOiByYW5kLlNGQzMyUk5HLCBkYjogcmwuVGhpbmdEQiwgcGxheWVyOiBybC5QbGF5ZXIsIGZsb29yOiBudW1iZXIpOiBQcm9taXNlPG1hcHMuTWFwPiB7XHJcbiAgICBsZXQgbWluRGltID0gMjQ7XHJcbiAgICBsZXQgbWF4RGltID0gMzIgKyBmbG9vciAqIDQ7XHJcbiAgICBsZXQgZGltRGljZSA9IG5ldyBybC5EaWNlKG1pbkRpbSwgbWF4RGltKVxyXG4gICAgbGV0IHdpZHRoID0gZGltRGljZS5yb2xsKHJuZylcclxuICAgIGxldCBoZWlnaHQgPSBkaW1EaWNlLnJvbGwocm5nKVxyXG5cclxuICAgIGNvbnN0IG1vbnN0ZXJzID0gY3JlYXRlTW9uc3Rlckxpc3QoZGIsIGZsb29yKVxyXG4gICAgY29uc3QgaXRlbXMgPSBjcmVhdGVJdGVtTGlzdChkYiwgZmxvb3IpXHJcbiAgICBjb25zdCBtYXAgPSBnZW5lcmF0ZU1hcFJvb21zKHJuZywgbW9uc3RlcnMsIGl0ZW1zLCB3aWR0aCwgaGVpZ2h0LCBwbGF5ZXIpXHJcblxyXG4gICAgbWFwLmxpZ2h0aW5nID0gbWFwcy5MaWdodGluZy5Ob25lXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlTWFwUm9vbXMoXHJcbiAgICBybmc6IHJhbmQuU0ZDMzJSTkcsXHJcbiAgICBtb25zdGVyczogcmwuV2VpZ2h0ZWRMaXN0PHJsLk1vbnN0ZXI+LFxyXG4gICAgaXRlbXM6IHJsLldlaWdodGVkTGlzdDxybC5JdGVtPixcclxuICAgIHdpZHRoOiBudW1iZXIsXHJcbiAgICBoZWlnaHQ6IG51bWJlcixcclxuICAgIHBsYXllcjogcmwuUGxheWVyKTogbWFwcy5NYXAge1xyXG4gICAgY29uc3QgbWFwID0gbmV3IG1hcHMuTWFwKHdpZHRoLCBoZWlnaHQsIDEsIHsgcG9zaXRpb246IG5ldyBnZW8uUG9pbnQoMCwgMCksIHRoaW5nOiBwbGF5ZXIgfSlcclxuICAgIGNvbnN0IG1pblJvb21zID0gNFxyXG5cclxuICAgIGNvbnN0IFtjZWxscywgcm9vbXNdID0gKCgpID0+IHtcclxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICBjb25zdCBbY2VsbHMsIHJvb21zXSA9IGdlbmVyYXRlQ2VsbEdyaWQocm5nLCB3aWR0aCwgaGVpZ2h0KVxyXG4gICAgICAgICAgICBpZiAocm9vbXMubGVuZ3RoID4gbWluUm9vbXMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBbY2VsbHMsIHJvb21zXVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSkoKSBhcyBbQ2VsbEdyaWQsIFJvb21bXV1cclxuXHJcbiAgICBjb25zdCBmaXJzdFJvb20gPSByb29tcy5yZWR1Y2UoKHgsIHkpID0+IHguZGVwdGggPCB5LmRlcHRoID8geCA6IHkpXHJcbiAgICBtYXAucGxheWVyLnBvc2l0aW9uID0gZmlyc3RSb29tLmludGVyaW9yUHQuY2xvbmUoKVxyXG5cclxuICAgIGNvbnN0IHN0YWlyc1VwID0gdGlsZXNldC5zdGFpcnNVcC5jbG9uZSgpXHJcbiAgICBjb25zdCBzdGFpcnNVcFBvc2l0aW9uID0gaXRlci5maW5kKHZpc2l0SW50ZXJpb3JDb29yZHMoY2VsbHMsIGZpcnN0Um9vbS5pbnRlcmlvclB0KSwgcHQgPT4gaXRlci5hbnkoZ3JpZC52aXNpdE5laWdoYm9ycyhjZWxscywgcHQpLCBhID0+IGFbMF0gPT09IENlbGxUeXBlLldhbGwpKVxyXG4gICAgaWYgKCFzdGFpcnNVcFBvc2l0aW9uKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIHBsYWNlIHN0YWlycyB1cFwiKVxyXG4gICAgfVxyXG5cclxuICAgIG1hcC5maXh0dXJlcy5zZXQoc3RhaXJzVXBQb3NpdGlvbiwgc3RhaXJzVXApXHJcblxyXG4gICAgY29uc3QgbGFzdFJvb20gPSByb29tcy5yZWR1Y2UoKHgsIHkpID0+IHguZGVwdGggPiB5LmRlcHRoID8geCA6IHkpXHJcbiAgICBjb25zdCBzdGFpcnNEb3duID0gdGlsZXNldC5zdGFpcnNEb3duLmNsb25lKClcclxuICAgIGNvbnN0IHN0YWlyc0Rvd25Qb3NpdGlvbiA9IGl0ZXIuZmluZChcclxuICAgICAgICB2aXNpdEludGVyaW9yQ29vcmRzKGNlbGxzLCBsYXN0Um9vbS5pbnRlcmlvclB0KSwgXHJcbiAgICAgICAgcHQgPT4gaXRlci5hbnkoZ3JpZC52aXNpdE5laWdoYm9ycyhjZWxscywgcHQpLCBhID0+IGFbMF0gPT09IENlbGxUeXBlLldhbGwpKVxyXG4gICAgaWYgKCFzdGFpcnNEb3duUG9zaXRpb24pIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gcGxhY2Ugc3RhaXJzIGRvd25cIilcclxuICAgIH1cclxuXHJcbiAgICBtYXAuZml4dHVyZXMuc2V0KHN0YWlyc0Rvd25Qb3NpdGlvbiwgc3RhaXJzRG93bilcclxuXHJcbiAgICAvLyBnZW5lcmF0ZSB0aWxlcyBhbmQgZml4dHVyZXMgZnJvbSBjZWxsc1xyXG4gICAgZm9yIChjb25zdCBbdiwgeCwgeV0gb2YgY2VsbHMuc2NhbigpKSB7XHJcbiAgICAgICAgaWYgKHYgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN3aXRjaCAodikge1xyXG4gICAgICAgICAgICBjYXNlIENlbGxUeXBlLkV4dGVyaW9yOlxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ2VsbFR5cGUuSW50ZXJpb3I6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aWxlc2V0LmZsb29yLmNsb25lKClcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLnRpbGVzLnNldChwb3NpdGlvbiwgdGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ2VsbFR5cGUuV2FsbDoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRpbGVzZXQud2FsbC5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5zZXQocG9zaXRpb24sIHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIENlbGxUeXBlLkRvb3I6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeHR1cmUgPSB0aWxlc2V0LmRvb3IuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAuZml4dHVyZXMuc2V0KHBvc2l0aW9uLCBmaXh0dXJlKVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aWxlc2V0LmZsb29yLmNsb25lKClcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGVQb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5zZXQodGlsZVBvc2l0aW9uLCB0aWxlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwbGFjZU1vbnN0ZXJzKHJuZywgbW9uc3RlcnMsIGNlbGxzLCByb29tcywgbWFwKVxyXG4gICAgcGxhY2VJdGVtcyhybmcsIGl0ZW1zLCBjZWxscywgcm9vbXMsIG1hcClcclxuXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlTW9uc3RlcnMocm5nOiByYW5kLlJORywgbW9uc3RlcnM6IHJsLldlaWdodGVkTGlzdDxybC5Nb25zdGVyPiwgY2VsbHM6IENlbGxHcmlkLCByb29tczogUm9vbVtdLCBtYXA6IG1hcHMuTWFwKSB7XHJcbiAgICAvLyBpdGVyYXRlIG92ZXIgcm9vbXMsIGRlY2lkZSB3aGV0aGVyIHRvIHBsYWNlIGEgbW9uc3RlciBpbiBlYWNoIHJvb21cclxuICAgIGNvbnN0IGVuY291bnRlckNoYW5jZSA9IC4zNVxyXG4gICAgY29uc3Qgc2Vjb25kRW5jb3VudGVyQ2hhbmNlID0gLjJcclxuICAgIGNvbnN0IHRoaXJkRW5jb3VudGVyQ2hhbmNlID0gLjFcclxuXHJcbiAgICBmb3IgKGNvbnN0IHJvb20gb2Ygcm9vbXMpIHtcclxuICAgICAgICBpZiAocm9vbS5kZXB0aCA8PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJhbmQuY2hhbmNlKHJuZywgZW5jb3VudGVyQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5UGxhY2VNb25zdGVyKHJuZywgbW9uc3RlcnMsIGNlbGxzLCByb29tLCBtYXApXHJcblxyXG4gICAgICAgIGlmICghcmFuZC5jaGFuY2Uocm5nLCBzZWNvbmRFbmNvdW50ZXJDaGFuY2UpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cnlQbGFjZU1vbnN0ZXIocm5nLCBtb25zdGVycywgY2VsbHMsIHJvb20sIG1hcClcclxuXHJcbiAgICAgICAgaWYgKCFyYW5kLmNoYW5jZShybmcsIHRoaXJkRW5jb3VudGVyQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5UGxhY2VNb25zdGVyKHJuZywgbW9uc3RlcnMsIGNlbGxzLCByb29tLCBtYXApXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeVBsYWNlTW9uc3Rlcihybmc6IHJhbmQuUk5HLCBtb25zdGVyczogcmwuV2VpZ2h0ZWRMaXN0PHJsLk1vbnN0ZXI+LCBjZWxsczogQ2VsbEdyaWQsIHJvb206IFJvb20sIG1hcDogbWFwcy5NYXApOiBib29sZWFuIHtcclxuICAgIC8vIGF0dGVtcHQgdG8gcGxhY2UgbW9uc3RlclxyXG4gICAgZm9yIChjb25zdCBbdCwgcHRdIG9mIHZpc2l0SW50ZXJpb3IoY2VsbHMsIHJvb20uaW50ZXJpb3JQdCkpIHtcclxuICAgICAgICBpZiAodCAhPT0gQ2VsbFR5cGUuSW50ZXJpb3IpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpdGVyLmFueShtYXAsIHRoID0+ICh0aC5wb3NpdGlvbj8uZXF1YWwocHQpID8/IGZhbHNlKSAmJiAhdGgudGhpbmcucGFzc2FibGUpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtb25zdGVyID0gbW9uc3RlcnMuc2VsZWN0KHJuZylcclxuICAgICAgICBtYXAubW9uc3RlcnMuc2V0KHB0LCBtb25zdGVyKVxyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZUl0ZW1zKHJuZzogcmFuZC5STkcsIGl0ZW1zOiBybC5XZWlnaHRlZExpc3Q8cmwuSXRlbT4sIGNlbGxzOiBDZWxsR3JpZCwgcm9vbXM6IFJvb21bXSwgbWFwOiBtYXBzLk1hcCkge1xyXG4gICAgLy8gaXRlcmF0ZSBvdmVyIHJvb21zLCBkZWNpZGUgd2hldGhlciB0byBwbGFjZSBhIG1vbnN0ZXIgaW4gZWFjaCByb29tXHJcbiAgICBjb25zdCB0cmVhc3VyZUNoYW5jZSA9IC4yXHJcblxyXG4gICAgZm9yIChjb25zdCByb29tIG9mIHJvb21zKSB7XHJcbiAgICAgICAgaWYgKHJvb20uZGVwdGggPD0gMCkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFyYW5kLmNoYW5jZShybmcsIHRyZWFzdXJlQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5UGxhY2VUcmVhc3VyZShybmcsIGl0ZW1zLCBjZWxscywgcm9vbSwgbWFwKVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gdHJ5UGxhY2VUcmVhc3VyZShybmc6IHJhbmQuUk5HLCBpdGVtczogcmwuV2VpZ2h0ZWRMaXN0PHJsLkl0ZW0+LCBjZWxsczogQ2VsbEdyaWQsIHJvb206IFJvb20sIG1hcDogbWFwcy5NYXApOiBib29sZWFuIHtcclxuICAgIC8vIGF0dGVtcHQgdG8gcGxhY2UgdHJlYXN1cmVcclxuICAgIGZvciAoY29uc3QgW3QsIHB0XSBvZiB2aXNpdEludGVyaW9yKGNlbGxzLCByb29tLmludGVyaW9yUHQpKSB7XHJcbiAgICAgICAgaWYgKHQgIT09IENlbGxUeXBlLkludGVyaW9yKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXRlci5hbnkobWFwLCB0aCA9PiAodGgucG9zaXRpb24/LmVxdWFsKHB0KSA/PyBmYWxzZSkgJiYgIXRoLnRoaW5nLnBhc3NhYmxlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY2hlc3QgPSB0aGluZ3MuY2hlc3QuY2xvbmUoKVxyXG5cclxuICAgICAgICAvLyBjaG9vc2UgbG9vdFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBpdGVtcy5zZWxlY3Qocm5nKVxyXG4gICAgICAgIGNoZXN0Lml0ZW1zLmFkZChpdGVtKVxyXG5cclxuICAgICAgICAvLyBleHRyYSBsb290XHJcbiAgICAgICAgbGV0IGV4dHJhTG9vdENoYW5jZSA9IC41XHJcbiAgICAgICAgd2hpbGUgKHJhbmQuY2hhbmNlKHJuZywgZXh0cmFMb290Q2hhbmNlKSkge1xyXG4gICAgICAgICAgICBleHRyYUxvb3RDaGFuY2UgKj0gLjVcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IGl0ZW1zLnNlbGVjdChybmcpXHJcbiAgICAgICAgICAgIGNoZXN0Lml0ZW1zLmFkZChpdGVtKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWFwLmNvbnRhaW5lcnMuc2V0KHB0LCBjaGVzdClcclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZUNlbGxHcmlkKHJuZzogcmFuZC5STkcsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogW0NlbGxHcmlkLCBSb29tW11dIHtcclxuICAgIGNvbnN0IGNlbGxzID0gZ3JpZC5nZW5lcmF0ZSh3aWR0aCwgaGVpZ2h0LCAoKSA9PiBDZWxsVHlwZS5FeHRlcmlvcilcclxuXHJcbiAgICAvLyBnZW5lcmF0ZSByb29tIHRlbXBsYXRlc1xyXG4gICAgY29uc3QgdGVtcGxhdGVzID0gZ2VuZXJhdGVSb29tVGVtcGxhdGVzKClcclxuICAgIGNvbnN0IHN0YWNrOiBSb29tW10gPSBbXVxyXG4gICAgY29uc3Qgcm9vbXM6IFJvb21bXSA9IFtdXHJcblxyXG4gICAgLy8gcGxhY2UgaW5pdGlhbCByb29tXHJcbiAgICB7XHJcbiAgICAgICAgcmFuZC5zaHVmZmxlKHJuZywgdGVtcGxhdGVzKVxyXG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGVtcGxhdGVzWzBdXHJcblxyXG4gICAgICAgIGNvbnN0IHB0ID0gbmV3IGdlby5Qb2ludChcclxuICAgICAgICAgICAgcmFuZC5pbnQocm5nLCAwLCB3aWR0aCAtIHRlbXBsYXRlLmNlbGxzLndpZHRoICsgMSksXHJcbiAgICAgICAgICAgIHJhbmQuaW50KHJuZywgMCwgaGVpZ2h0IC0gdGVtcGxhdGUuY2VsbHMuaGVpZ2h0ICsgMSkpXHJcblxyXG4gICAgICAgIGNvbnN0IHJvb20gPSBwbGFjZVRlbXBsYXRlKHJuZywgY2VsbHMsIHRlbXBsYXRlLCBwdClcclxuICAgICAgICBzdGFjay5wdXNoKHJvb20pXHJcbiAgICAgICAgcm9vbXMucHVzaChyb29tKVxyXG4gICAgfVxyXG5cclxuICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc3Qgcm9vbSA9IGFycmF5LnBvcChzdGFjaylcclxuICAgICAgICBjb25zdCBuZXh0Um9vbSA9IHRyeVR1bm5lbEZyb20ocm5nLCBjZWxscywgdGVtcGxhdGVzLCByb29tKVxyXG5cclxuICAgICAgICBpZiAobmV4dFJvb20pIHtcclxuICAgICAgICAgICAgc3RhY2sucHVzaChyb29tKVxyXG4gICAgICAgICAgICBzdGFjay5wdXNoKG5leHRSb29tKVxyXG4gICAgICAgICAgICByb29tcy5wdXNoKG5leHRSb29tKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gW2NlbGxzLCByb29tc11cclxufVxyXG5cclxuZnVuY3Rpb24gdHJ5VHVubmVsRnJvbShybmc6IHJhbmQuUk5HLCBjZWxsczogQ2VsbEdyaWQsIHRlbXBsYXRlczogUm9vbVRlbXBsYXRlW10sIHJvb206IFJvb20pOiBSb29tIHwgbnVsbCB7XHJcbiAgICByYW5kLnNodWZmbGUocm5nLCB0ZW1wbGF0ZXMpXHJcblxyXG4gICAgd2hpbGUgKHJvb20udHVubmVsUHRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjb25zdCB0cHQgPSBhcnJheS5wb3Aocm9vbS50dW5uZWxQdHMpXHJcbiAgICAgICAgZm9yIChjb25zdCB0ZW1wbGF0ZSBvZiB0ZW1wbGF0ZXMpIHtcclxuICAgICAgICAgICAgY29uc3QgbmV4dFJvb20gPSB0cnlUdW5uZWxUbyhybmcsIGNlbGxzLCB0cHQsIHRlbXBsYXRlKVxyXG4gICAgICAgICAgICBpZiAobmV4dFJvb20pIHtcclxuICAgICAgICAgICAgICAgIC8vIHBsYWNlIGRvb3IgYXQgdHVubmVsIHBvaW50XHJcbiAgICAgICAgICAgICAgICByb29tLnR1bm5lbFB0cyA9IHJvb20udHVubmVsUHRzLmZpbHRlcihwdCA9PiAhcHQuZXF1YWwodHB0KSlcclxuICAgICAgICAgICAgICAgIGNlbGxzLnNldFBvaW50KHRwdCwgQ2VsbFR5cGUuRG9vcilcclxuICAgICAgICAgICAgICAgIG5leHRSb29tLmRlcHRoID0gcm9vbS5kZXB0aCArIDFcclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXh0Um9vbVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVsbFxyXG59XHJcblxyXG5mdW5jdGlvbiB0cnlUdW5uZWxUbyhybmc6IHJhbmQuUk5HLCBjZWxsczogQ2VsbEdyaWQsIHRwdDE6IGdlby5Qb2ludCwgdGVtcGxhdGU6IFJvb21UZW1wbGF0ZSk6IFJvb20gfCBudWxsIHtcclxuICAgIC8vIGZpbmQgdHVubmVsIHBvaW50cyBvZiB0ZW1wbGF0ZVxyXG4gICAgZm9yIChjb25zdCB0cHQyIG9mIHRlbXBsYXRlLnR1bm5lbFB0cykge1xyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHRwdDEuc3ViUG9pbnQodHB0MilcclxuICAgICAgICBpZiAoaXNWYWxpZFBsYWNlbWVudCh0ZW1wbGF0ZS5jZWxscywgY2VsbHMsIG9mZnNldCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHBsYWNlVGVtcGxhdGUocm5nLCBjZWxscywgdGVtcGxhdGUsIG9mZnNldClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51bGxcclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VUZW1wbGF0ZShybmc6IHJhbmQuUk5HLCBjZWxsczogQ2VsbEdyaWQsIHRlbXBsYXRlOiBSb29tVGVtcGxhdGUsIG9mZnNldDogZ2VvLlBvaW50KTogUm9vbSB7XHJcbiAgICBncmlkLmNvcHkodGVtcGxhdGUuY2VsbHMsIGNlbGxzLCBvZmZzZXQueCwgb2Zmc2V0LnkpXHJcblxyXG4gICAgLy8gZmluZCB0dW5uZWxhYmxlIHBvaW50c1xyXG4gICAgY29uc3QgaW50ZXJpb3JQdCA9IHRlbXBsYXRlLmludGVyaW9yUHQuYWRkUG9pbnQob2Zmc2V0KVxyXG4gICAgY29uc3QgdHVubmVsUHRzID0gdGVtcGxhdGUudHVubmVsUHRzLm1hcChwdCA9PiBwdC5hZGRQb2ludChvZmZzZXQpKS5maWx0ZXIocHQgPT4gZmluZEV4dGVyaW9yTmVpZ2hib3IoY2VsbHMsIHB0KSAhPT0gbnVsbClcclxuICAgIHJhbmQuc2h1ZmZsZShybmcsIHR1bm5lbFB0cylcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGludGVyaW9yUHQsXHJcbiAgICAgICAgdHVubmVsUHRzLFxyXG4gICAgICAgIGRlcHRoOiAwXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlUm9vbVRlbXBsYXRlcygpOiBSb29tVGVtcGxhdGVbXSB7XHJcbiAgICBjb25zdCBsZW5ndGhzID0gWzQsIDUsIDYsIDcsIDgsIDksIDEwLCAxMV1cclxuICAgIGNvbnN0IHBhaXJzID0gbGVuZ3Rocy5tYXAoeCA9PiBsZW5ndGhzLm1hcCh5ID0+IFt4LCB5XSkpLmZsYXQoKS5maWx0ZXIoYSA9PiBhWzBdID4gMyB8fCBhWzFdID4gMylcclxuICAgIGNvbnN0IHRlbXBsYXRlcyA9IHBhaXJzLm1hcChhID0+IGdlbmVyYXRlUm9vbVRlbXBsYXRlKGFbMF0sIGFbMV0pKVxyXG4gICAgcmV0dXJuIHRlbXBsYXRlc1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVJvb21UZW1wbGF0ZSh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFJvb21UZW1wbGF0ZSB7XHJcbiAgICBjb25zdCBpbnRlcmlvclB0ID0gbmV3IGdlby5Qb2ludCh3aWR0aCAvIDIsIGhlaWdodCAvIDIpLmZsb29yKClcclxuICAgIGNvbnN0IGNlbGxzID0gZ3JpZC5nZW5lcmF0ZShcclxuICAgICAgICB3aWR0aCxcclxuICAgICAgICBoZWlnaHQsXHJcbiAgICAgICAgKHgsIHkpID0+IHggPT09IDAgfHwgeCA9PT0gd2lkdGggLSAxIHx8IHkgPT09IDAgfHwgeSA9PT0gaGVpZ2h0IC0gMSA/IENlbGxUeXBlLldhbGwgOiBDZWxsVHlwZS5JbnRlcmlvcilcclxuXHJcbiAgICBjb25zdCB0dW5uZWxQdHM6IGdlby5Qb2ludFtdID0gW11cclxuICAgIHR1bm5lbFB0cy5wdXNoKC4uLmdyaWQuc2NhbigxLCAwLCB3aWR0aCAtIDIsIDEpKVxyXG4gICAgdHVubmVsUHRzLnB1c2goLi4uZ3JpZC5zY2FuKDAsIDEsIDEsIGhlaWdodCAtIDIpKVxyXG4gICAgdHVubmVsUHRzLnB1c2goLi4uZ3JpZC5zY2FuKDEsIGhlaWdodCAtIDEsIHdpZHRoIC0gMiwgMSkpXHJcbiAgICB0dW5uZWxQdHMucHVzaCguLi5ncmlkLnNjYW4od2lkdGggLSAxLCAxLCAxLCBoZWlnaHQgLSAyKSlcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGludGVyaW9yUHQsXHJcbiAgICAgICAgY2VsbHMsXHJcbiAgICAgICAgdHVubmVsUHRzXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbmRFeHRlcmlvck5laWdoYm9yKGNlbGxzOiBDZWxsR3JpZCwgcHQ6IGdlby5Qb2ludCk6IGdlby5Qb2ludCB8IG51bGwge1xyXG4gICAgZm9yIChjb25zdCBbdCwgbnB0XSBvZiBncmlkLnZpc2l0TmVpZ2hib3JzKGNlbGxzLCBwdCkpIHtcclxuICAgICAgICBpZiAodCA9PT0gQ2VsbFR5cGUuRXh0ZXJpb3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5wdFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVsbFxyXG59XHJcblxyXG5mdW5jdGlvbiB2aXNpdEludGVyaW9yQ29vcmRzKGNlbGxzOiBDZWxsR3JpZCwgcHQwOiBnZW8uUG9pbnQpOiBJdGVyYWJsZTxnZW8uUG9pbnQ+IHtcclxuICAgIHJldHVybiBpdGVyLm1hcCh2aXNpdEludGVyaW9yKGNlbGxzLCBwdDApLCB4ID0+IHhbMV0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uKiB2aXNpdEludGVyaW9yKGNlbGxzOiBDZWxsR3JpZCwgcHQwOiBnZW8uUG9pbnQpOiBJdGVyYWJsZTxbQ2VsbFR5cGUsIGdlby5Qb2ludF0+IHtcclxuICAgIGNvbnN0IGV4cGxvcmVkID0gY2VsbHMubWFwMigoKSA9PiBmYWxzZSlcclxuICAgIGNvbnN0IHN0YWNrID0gW3B0MF1cclxuXHJcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnN0IHB0ID0gYXJyYXkucG9wKHN0YWNrKVxyXG4gICAgICAgIGV4cGxvcmVkLnNldFBvaW50KHB0LCB0cnVlKVxyXG4gICAgICAgIGNvbnN0IHQgPSBjZWxscy5hdFBvaW50KHB0KVxyXG4gICAgICAgIHlpZWxkIFt0LCBwdF1cclxuXHJcbiAgICAgICAgLy8gaWYgdGhpcyBpcyBhIHdhbGwsIGRvIG5vdCBleHBsb3JlIG5laWdoYm9yc1xyXG4gICAgICAgIGlmICh0ID09PSBDZWxsVHlwZS5XYWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBvdGhlcndpc2UsIGV4cGxvcmUgbmVpZ2hib3JzLCBwdXNoaW5nIG9udG8gc3RhY2sgdGhvc2UgdGhhdCBhcmUgdW5leHBsb3JlZFxyXG4gICAgICAgIGZvciAoY29uc3QgW3QsIG5wdF0gb2YgZ3JpZC52aXNpdE5laWdoYm9ycyhjZWxscywgcHQpKSB7XHJcbiAgICAgICAgICAgIGlmIChleHBsb3JlZC5hdFBvaW50KG5wdCkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0ICE9PSBDZWxsVHlwZS5JbnRlcmlvcikge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgc3RhY2sucHVzaChucHQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkUGxhY2VtZW50KHNyYzogQ2VsbEdyaWQsIGRzdDogQ2VsbEdyaWQsIG9mZnNldDogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICBpZiAoIWRzdC5yZWdpb25JbkJvdW5kcyhvZmZzZXQueCwgb2Zmc2V0LnksIHNyYy53aWR0aCwgc3JjLmhlaWdodCkpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IFtzdCwgeCwgeV0gb2Ygc3JjLnNjYW4oKSkge1xyXG4gICAgICAgIC8vIHJ1bGVzOlxyXG4gICAgICAgIC8vIGNhbiBwbGFjZSB3YWxsIG92ZXIgd2FsbFxyXG4gICAgICAgIC8vIGNhbiBwbGFjZSBhbnl0aGluZyBvdmVyIGV4dGVyaW9yXHJcbiAgICAgICAgY29uc3QgZHQgPSBkc3QuYXQoeCArIG9mZnNldC54LCB5ICsgb2Zmc2V0LnkpXHJcbiAgICAgICAgaWYgKGR0ID09PSBDZWxsVHlwZS5FeHRlcmlvcikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGR0ID09PSBDZWxsVHlwZS5XYWxsICYmIHN0ID09PSBDZWxsVHlwZS5XYWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVPdXRkb29yTWFwKHBsYXllcjogcmwuUGxheWVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFByb21pc2U8bWFwcy5NYXA+IHtcclxuICAgIGNvbnN0IG1hcCA9IG5ldyBtYXBzLk1hcCh3aWR0aCwgaGVpZ2h0LCAwLCB7IHBvc2l0aW9uOiBuZXcgZ2VvLlBvaW50KDAsIDApLCB0aGluZzogcGxheWVyIH0pXHJcbiAgICBtYXAubGlnaHRpbmcgPSBtYXBzLkxpZ2h0aW5nLkFtYmllbnRcclxuICAgIGdlbmVyYXRlT3V0ZG9vclRlcnJhaW4obWFwKVxyXG4gICAgcmV0dXJuIG1hcFxyXG59XHJcblxyXG5lbnVtIE91dGRvb3JUaWxlVHlwZSB7XHJcbiAgICB3YXRlcixcclxuICAgIGdyYXNzLFxyXG4gICAgZGlydCxcclxuICAgIHNhbmRcclxufVxyXG5cclxuZW51bSBPdXRkb29yRml4dHVyZVR5cGUge1xyXG4gICAgbm9uZSxcclxuICAgIGhpbGxzLFxyXG4gICAgbW91bnRhaW5zLFxyXG4gICAgdHJlZXMsXHJcbiAgICBzbm93XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlT3V0ZG9vclRlcnJhaW4obWFwOiBtYXBzLk1hcCkge1xyXG4gICAgY29uc3QgdGlsZXMgPSBncmlkLmdlbmVyYXRlKG1hcC53aWR0aCwgbWFwLmhlaWdodCwgKCkgPT4gT3V0ZG9vclRpbGVUeXBlLndhdGVyKVxyXG4gICAgY29uc3QgZml4dHVyZXMgPSBncmlkLmdlbmVyYXRlKG1hcC53aWR0aCwgbWFwLmhlaWdodCwgKCkgPT4gT3V0ZG9vckZpeHR1cmVUeXBlLm5vbmUpXHJcblxyXG4gICAgLy8gVE9ETyAtIHJhbmRvbWx5IGJpYXMgcGVybGluIG5vaXNlIGluc3RlYWRcclxuICAgIC8vIGNvbnN0IGJpYXM9IHJhbmQuaW50KDAsIDI1NilcclxuICAgIGNvbnN0IGJpYXMgPSAwXHJcblxyXG4gICAgY29uc3QgaGVpZ2h0TWFwID0gZmJtKG1hcC53aWR0aCwgbWFwLmhlaWdodCwgYmlhcywgOCAvIG1hcC53aWR0aCwgMiwgLjUsIDgpXHJcblxyXG4gICAgaW1hZ2luZy5zY2FuKG1hcC53aWR0aCwgbWFwLmhlaWdodCwgKHgsIHksIG9mZnNldCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGggPSBoZWlnaHRNYXBbb2Zmc2V0XVxyXG4gICAgICAgIGlmIChoID4gMCkge1xyXG4gICAgICAgICAgICB0aWxlcy5zZXQoeCwgeSwgT3V0ZG9vclRpbGVUeXBlLmRpcnQpXHJcbiAgICAgICAgfVxyXG4gICAgfSlcclxuXHJcbiAgICBtYXAucGxheWVyLnBvc2l0aW9uID0gdGlsZXMuZmluZFBvaW50KHQgPT4gdCAhPT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSA/PyBuZXcgZ2VvLlBvaW50KDAsIDApXHJcblxyXG4gICAgZm9yIChjb25zdCBbdCwgeCwgeV0gb2YgdGlsZXMuc2NhbigpKSB7XHJcbiAgICAgICAgc3dpdGNoICh0KSB7XHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JUaWxlVHlwZS53YXRlcik6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aGluZ3Mud2F0ZXIuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgbWFwLnRpbGVzLnNldChuZXcgZ2VvLlBvaW50KHgsIHkpLCB0aWxlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vclRpbGVUeXBlLmRpcnQpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gdGhpbmdzLmRpcnQuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgbWFwLnRpbGVzLnNldChuZXcgZ2VvLlBvaW50KHgsIHkpLCB0aWxlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vclRpbGVUeXBlLmdyYXNzKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRoaW5ncy5ncmFzcy5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuc2V0KG5ldyBnZW8uUG9pbnQoeCwgeSksIHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yVGlsZVR5cGUuc2FuZCk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aGluZ3Muc2FuZC5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuc2V0KG5ldyBnZW8uUG9pbnQoeCwgeSksIHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgW2YsIHgsIHldIG9mIGZpeHR1cmVzLnNjYW4oKSkge1xyXG4gICAgICAgIHN3aXRjaCAoZikge1xyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yRml4dHVyZVR5cGUuaGlsbHMpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaXh0dXJlID0gdGhpbmdzLmhpbGxzLmNsb25lKClcclxuICAgICAgICAgICAgICAgIG1hcC5maXh0dXJlcy5zZXQobmV3IGdlby5Qb2ludCh4LCB5KSwgZml4dHVyZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JGaXh0dXJlVHlwZS5tb3VudGFpbnMpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaXh0dXJlID0gdGhpbmdzLm1vdW50YWlucy5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBtYXAuZml4dHVyZXMuc2V0KG5ldyBnZW8uUG9pbnQoeCwgeSksIGZpeHR1cmUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yRml4dHVyZVR5cGUudHJlZXMpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaXh0dXJlID0gdGhpbmdzLnRyZWVzLmNsb25lKClcclxuICAgICAgICAgICAgICAgIG1hcC5maXh0dXJlcy5zZXQobmV3IGdlby5Qb2ludCh4LCB5KSwgZml4dHVyZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JGaXh0dXJlVHlwZS5zbm93KToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZml4dHVyZSA9IHRoaW5ncy5zbm93LmNsb25lKClcclxuICAgICAgICAgICAgICAgIG1hcC5maXh0dXJlcy5zZXQobmV3IGdlby5Qb2ludCh4LCB5KSwgZml4dHVyZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlTGFuZG1hc3Nlcyhybmc6IHJhbmQuUk5HLCB0aWxlczogZ3JpZC5HcmlkPE91dGRvb3JUaWxlVHlwZT4pIHtcclxuICAgIGNvbnN0IG1heFRpbGVzID0gTWF0aC5jZWlsKHRpbGVzLnNpemUgKiByYW5kLmZsb2F0KHJuZywgLjMsIC41KSlcclxuICAgIGdyb3dMYW5kKHJuZywgdGlsZXMsIG1heFRpbGVzKVxyXG5cclxuICAgIC8vIGZpbmQgbWF4aW1hbCB3YXRlciByZWN0IC0gaWYgbGFyZ2UgZW5vdWdoLCBwbGFudCBpc2xhbmRcclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgY29uc3QgYWFiYiA9IGdyaWQuZmluZE1heGltYWxSZWN0KHRpbGVzLCB0ID0+IHQgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikuc2hyaW5rKDEpXHJcbiAgICAgICAgaWYgKGFhYmIuYXJlYSA8IDEyKSB7XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB2aWV3ID0gdGlsZXMudmlld0FBQkIoYWFiYilcclxuICAgICAgICBjb25zdCBpc2xhbmRUaWxlcyA9IGFhYmIuYXJlYSAqIHJhbmQuZmxvYXQocm5nLCAuMjUsIDEpXHJcbiAgICAgICAgZ3Jvd0xhbmQocm5nLCB2aWV3LCBpc2xhbmRUaWxlcylcclxuICAgIH1cclxuXHJcbiAgICAvLyBwbGFjZSBzb21lIGlzbGFuZHNcclxuICAgIHBsYWNlQmVhY2hlcyh0aWxlcylcclxufVxyXG5cclxuZnVuY3Rpb24gZ3Jvd0xhbmQocm5nOiByYW5kLlJORywgdGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+LCBtYXhUaWxlczogbnVtYmVyKSB7XHJcbiAgICAvLyBcInBsYW50XCIgYSBjb250aW5lbnRcclxuICAgIGNvbnN0IHN0YWNrID0gbmV3IEFycmF5PGdlby5Qb2ludD4oKVxyXG4gICAgY29uc3Qgc2VlZCA9IG5ldyBnZW8uUG9pbnQodGlsZXMud2lkdGggLyAyLCB0aWxlcy5oZWlnaHQgLyAyKS5mbG9vcigpXHJcbiAgICBzdGFjay5wdXNoKHNlZWQpXHJcbiAgICBsZXQgcGxhY2VkID0gMFxyXG5cclxuICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwICYmIHBsYWNlZCA8IG1heFRpbGVzKSB7XHJcbiAgICAgICAgY29uc3QgcHQgPSBhcnJheS5wb3Aoc3RhY2spXHJcbiAgICAgICAgdGlsZXMuc2V0UG9pbnQocHQsIE91dGRvb3JUaWxlVHlwZS5ncmFzcylcclxuICAgICAgICArK3BsYWNlZFxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IFt0LCB4eV0gb2YgZ3JpZC52aXNpdE5laWdoYm9ycyh0aWxlcywgcHQpKSB7XHJcbiAgICAgICAgICAgIGlmICh0ID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeHkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJhbmQuc2h1ZmZsZShybmcsIHN0YWNrKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZUJlYWNoZXModGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+KSB7XHJcbiAgICBmb3IgKGNvbnN0IHB0IG9mIGdyaWQuc2NhbigwLCAwLCB0aWxlcy53aWR0aCwgdGlsZXMuaGVpZ2h0KSkge1xyXG4gICAgICAgIGlmICh0aWxlcy5hdFBvaW50KHB0KSA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocHQueCA+IDAgJiYgdGlsZXMuYXQocHQueCAtIDEsIHB0LnkpID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgdGlsZXMuc2V0UG9pbnQocHQsIE91dGRvb3JUaWxlVHlwZS5zYW5kKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHB0LnggPCB0aWxlcy53aWR0aCAtIDEgJiYgdGlsZXMuYXQocHQueCArIDEsIHB0LnkpID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgdGlsZXMuc2V0UG9pbnQocHQsIE91dGRvb3JUaWxlVHlwZS5zYW5kKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHB0LnkgPiAwICYmIHRpbGVzLmF0KHB0LngsIHB0LnkgLSAxKSA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgIHRpbGVzLnNldFBvaW50KHB0LCBPdXRkb29yVGlsZVR5cGUuc2FuZClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwdC55IDwgdGlsZXMuaGVpZ2h0IC0gMSAmJiB0aWxlcy5hdChwdC54LCBwdC55ICsgMSkgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICB0aWxlcy5zZXRQb2ludChwdCwgT3V0ZG9vclRpbGVUeXBlLnNhbmQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZVNub3codGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+LCBmaXh0dXJlczogZ3JpZC5HcmlkPE91dGRvb3JGaXh0dXJlVHlwZT4pIHtcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gdGlsZXNcclxuICAgIGNvbnN0IHNub3dIZWlnaHQgPSBNYXRoLmNlaWwoaGVpZ2h0IC8gMylcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgc25vd0hlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHQgPSB0aWxlcy5hdCh4LCB5KVxyXG4gICAgICAgICAgICBpZiAodCAhPT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgICAgICBmaXh0dXJlcy5zZXQoeCwgeSwgT3V0ZG9vckZpeHR1cmVUeXBlLnNub3cpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlTW91bnRhaW5zKHJuZzogcmFuZC5STkcsIHRpbGVzOiBncmlkLkdyaWQ8T3V0ZG9vclRpbGVUeXBlPiwgZml4dHVyZXM6IGdyaWQuR3JpZDxPdXRkb29yRml4dHVyZVR5cGU+LCBtYXhUaWxlczogbnVtYmVyKSB7XHJcbiAgICAvLyBmaW5kIGEgc3VpdGFibGUgc3RhcnQgcG9pbnQgZm9yIG1vdW50YWluIHJhbmdlXHJcbiAgICBjb25zdCBzZWVkID0gcmFuZC5jaG9vc2Uocm5nLCBbLi4udGlsZXMuZmluZFBvaW50cyh4ID0+IHggIT09IE91dGRvb3JUaWxlVHlwZS53YXRlciAmJiB4ICE9PSBPdXRkb29yVGlsZVR5cGUuc2FuZCldKVxyXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgQXJyYXk8Z2VvLlBvaW50PigpXHJcbiAgICBzdGFjay5wdXNoKHNlZWQpXHJcbiAgICBsZXQgcGxhY2VkID0gMFxyXG5cclxuICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwICYmIHBsYWNlZCA8IG1heFRpbGVzKSB7XHJcbiAgICAgICAgY29uc3QgcHQgPSBhcnJheS5wb3Aoc3RhY2spXHJcbiAgICAgICAgZml4dHVyZXMuc2V0UG9pbnQocHQsIE91dGRvb3JGaXh0dXJlVHlwZS5tb3VudGFpbnMpXHJcbiAgICAgICAgKytwbGFjZWRcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBbdCwgeHldIG9mIGdyaWQudmlzaXROZWlnaGJvcnModGlsZXMsIHB0KSkge1xyXG4gICAgICAgICAgICBpZiAodCAhPT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyICYmIHQgIT09IE91dGRvb3JUaWxlVHlwZS5zYW5kKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHh5KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByYW5kLnNodWZmbGUocm5nLCBzdGFjaylcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZmJtKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBiaWFzOiBudW1iZXIsIGZyZXE6IG51bWJlciwgbGFjdW5hcml0eTogbnVtYmVyLCBnYWluOiBudW1iZXIsIG9jdGF2ZXM6IG51bWJlcik6IG51bWJlcltdIHtcclxuICAgIHJldHVybiBpbWFnaW5nLmdlbmVyYXRlKHdpZHRoLCBoZWlnaHQsICh4LCB5KSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIG5vaXNlLmZibVBlcmxpbjIoeCAqIGZyZXEgKyBiaWFzLCB5ICogZnJlcSArIGJpYXMsIGxhY3VuYXJpdHksIGdhaW4sIG9jdGF2ZXMpXHJcbiAgICB9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVNb25zdGVyTGlzdChkYjogcmwuVGhpbmdEQiwgZmxvb3I6IG51bWJlcik6IHJsLldlaWdodGVkTGlzdDxybC5Nb25zdGVyPiB7XHJcbiAgICAvLyBjcmVhdGUgd2VpZ2h0ZWQgbGlzdCBvZiBtb25zdGVycy9pdGVtcyBhcHByb3ByaWF0ZSBmb3IgbGV2ZWxcclxuICAgIGNvbnN0IGxpc3Q6IFtybC5Nb25zdGVyLCBudW1iZXJdW10gPSBbXVxyXG4gICAgZm9yIChjb25zdCBtb25zdGVyIG9mIGRiKSB7XHJcbiAgICAgICAgaWYgKCEobW9uc3RlciBpbnN0YW5jZW9mIHJsLk1vbnN0ZXIpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobW9uc3Rlci5sZXZlbCA+IGZsb29yICsgMSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIubGV2ZWwgPD0gMCkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHcgPSBtb25zdGVyLmZyZXFcclxuICAgICAgICBsZXQgZGwgPSBNYXRoLmFicyhtb25zdGVyLmxldmVsIC0gZmxvb3IpXHJcbiAgICAgICAgaWYgKGRsID4gMCkge1xyXG4gICAgICAgICAgICB3IC89IChkbCArIDEpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsaXN0LnB1c2goW21vbnN0ZXIsIHddKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBuZXcgcmwuV2VpZ2h0ZWRMaXN0KGxpc3QpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUl0ZW1MaXN0KGRiOiBybC5UaGluZ0RCLCBmbG9vcjogbnVtYmVyKSB7XHJcbiAgICAvLyBjcmVhdGUgd2VpZ2h0ZWQgbGlzdCBvZiBtb25zdGVycy9pdGVtcyBhcHByb3ByaWF0ZSBmb3IgbGV2ZWxcclxuICAgIGNvbnN0IGxpc3Q6IFtybC5JdGVtLCBudW1iZXJdW10gPSBbXVxyXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGRiKSB7XHJcbiAgICAgICAgaWYgKCEoaXRlbSBpbnN0YW5jZW9mIHJsLkl0ZW0pKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXRlbS5sZXZlbCA+IGZsb29yICsgMSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGl0ZW0ubGV2ZWwgPD0gMCB8fCBpdGVtLmxldmVsIDwgZmxvb3IgLSAyKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdyA9IGl0ZW0uZnJlcVxyXG4gICAgICAgIGxldCBkbCA9IE1hdGguYWJzKGl0ZW0ubGV2ZWwgLSBmbG9vcilcclxuICAgICAgICBpZiAoZGwgPiAwKSB7XHJcbiAgICAgICAgICAgIHcgLz0gKGRsICsgMSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxpc3QucHVzaChbaXRlbSwgd10pXHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2cobGlzdClcclxuICAgIHJldHVybiBuZXcgcmwuV2VpZ2h0ZWRMaXN0KGxpc3QpXHJcbn0iXX0=