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
export async function generateDungeonLevel(rng, db, player, floor, dir) {
    let minDim = 24;
    let maxDim = 32 + floor * 4;
    let dimDice = new rl.Dice(minDim, maxDim);
    let width = dimDice.roll(rng);
    let height = dimDice.roll(rng);
    const monsters = createMonsterList(db, floor);
    const items = createItemList(db, floor);
    const map = generateMapRooms(rng, monsters, items, width, height, player, dir);
    map.lighting = maps.Lighting.None;
    return map;
}
function generateMapRooms(rng, monsters, items, width, height, player, dir) {
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
    map.fixtures.set(stairsUpPosition, stairsUp);
    const lastRoom = rooms.reduce((x, y) => x.depth > y.depth ? x : y);
    const stairsDown = tileset.stairsDown.clone();
    const stairsDownPosition = iter.find(visitInteriorCoords(cells, lastRoom.interiorPt), pt => iter.any(grid.visitNeighbors(cells, pt), a => a[0] === CellType.Wall));
    if (!stairsDownPosition) {
        throw new Error("Failed to place stairs down");
    }
    map.fixtures.set(stairsDownPosition, stairsDown);
    {
        const stairsPosition = dir === rl.ExitDirection.Up ? stairsDownPosition : stairsUpPosition;
        const playerPosition = iter.find(grid.visitNeighbors(cells, stairsPosition), ([x, _]) => x === CellType.Interior);
        if (!playerPosition) {
            throw new Error("Nowhere to put player");
        }
        console.log(playerPosition, player);
        map.players.set(playerPosition[1], player);
    }
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
        console.log(sconcePosition[1], stairsUpPosition);
        map.fixtures.set(sconcePosition[1], things.sconce.clone());
    }
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
        map.monsters.set(pt, monster.clone());
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
        chest.items.add(item.clone());
        // extra loot
        let extraLootChance = .5;
        while (rand.chance(rng, extraLootChance)) {
            extraLootChance *= .5;
            const item = items.select(rng);
            chest.items.add(item.clone());
        }
        map.containers.set(pt, chest.clone());
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
    return new rl.WeightedList(list);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0gsT0FBTyxLQUFLLEVBQUUsTUFBTSxTQUFTLENBQUE7QUFDN0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBQ2pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQVUvQyxNQUFNLE9BQU8sR0FBbUI7SUFDNUIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFO0lBQzlCLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRTtJQUMzQixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7SUFDekIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO0lBQ2pDLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRTtDQUN4QyxDQUFBO0FBRUQsSUFBSyxRQUtKO0FBTEQsV0FBSyxRQUFRO0lBQ1QsK0NBQVEsQ0FBQTtJQUNSLCtDQUFRLENBQUE7SUFDUix1Q0FBSSxDQUFBO0lBQ0osdUNBQUksQ0FBQTtBQUNSLENBQUMsRUFMSSxRQUFRLEtBQVIsUUFBUSxRQUtaO0FBZ0JELE1BQU0sQ0FBQyxLQUFLLFVBQVUsb0JBQW9CLENB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Q0FBQyxJQUFJLFlBQVksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzVCLFNBQVE7U0FDWDtRQUVELElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBQyxFQUFFO1lBQ3hCLFNBQVE7U0FDWDtRQUVELElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBQyxFQUFFO1lBQzNDLFNBQVE7U0FDWDtRQUVELElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUE7UUFDakIsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFBO1FBQ3JDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRTtZQUNSLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtTQUNoQjtRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUN2QjtJQUVELE9BQU8sSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3BDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogbWFwIGdlbmVyYXRpb24gbGlicmFyeVxyXG4gKi9cclxuaW1wb3J0ICogYXMgcmwgZnJvbSBcIi4vcmwuanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcbmltcG9ydCAqIGFzIGdyaWQgZnJvbSBcIi4uL3NoYXJlZC9ncmlkLmpzXCJcclxuaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiXHJcbmltcG9ydCAqIGFzIGl0ZXIgZnJvbSBcIi4uL3NoYXJlZC9pdGVyLmpzXCJcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIlxyXG5pbXBvcnQgKiBhcyB0aGluZ3MgZnJvbSBcIi4vdGhpbmdzLmpzXCJcclxuaW1wb3J0ICogYXMgbWFwcyBmcm9tIFwiLi9tYXBzLmpzXCJcclxuaW1wb3J0ICogYXMgbm9pc2UgZnJvbSBcIi4uL3NoYXJlZC9ub2lzZS5qc1wiXHJcbmltcG9ydCAqIGFzIGltYWdpbmcgZnJvbSBcIi4uL3NoYXJlZC9pbWFnaW5nLmpzXCJcclxuXHJcbmludGVyZmFjZSBEdW5nZW9uVGlsZXNldCB7XHJcbiAgICB3YWxsOiBybC5UaWxlLFxyXG4gICAgZmxvb3I6IHJsLlRpbGUsXHJcbiAgICBkb29yOiBybC5Eb29yLFxyXG4gICAgc3RhaXJzVXA6IHJsLkV4aXRcclxuICAgIHN0YWlyc0Rvd246IHJsLkV4aXRcclxufVxyXG5cclxuY29uc3QgdGlsZXNldDogRHVuZ2VvblRpbGVzZXQgPSB7XHJcbiAgICB3YWxsOiB0aGluZ3MuYnJpY2tXYWxsLmNsb25lKCksXHJcbiAgICBmbG9vcjogdGhpbmdzLmZsb29yLmNsb25lKCksXHJcbiAgICBkb29yOiB0aGluZ3MuZG9vci5jbG9uZSgpLFxyXG4gICAgc3RhaXJzVXA6IHRoaW5ncy5zdGFpcnNVcC5jbG9uZSgpLFxyXG4gICAgc3RhaXJzRG93bjogdGhpbmdzLnN0YWlyc0Rvd24uY2xvbmUoKVxyXG59XHJcblxyXG5lbnVtIENlbGxUeXBlIHtcclxuICAgIEV4dGVyaW9yLFxyXG4gICAgSW50ZXJpb3IsXHJcbiAgICBXYWxsLFxyXG4gICAgRG9vclxyXG59XHJcblxyXG50eXBlIENlbGxHcmlkID0gZ3JpZC5HcmlkPENlbGxUeXBlPlxyXG5cclxuaW50ZXJmYWNlIFJvb21UZW1wbGF0ZSB7XHJcbiAgICBjZWxsczogQ2VsbEdyaWRcclxuICAgIGludGVyaW9yUHQ6IGdlby5Qb2ludFxyXG4gICAgdHVubmVsUHRzOiBnZW8uUG9pbnRbXVxyXG59XHJcblxyXG5pbnRlcmZhY2UgUm9vbSB7XHJcbiAgICBpbnRlcmlvclB0OiBnZW8uUG9pbnRcclxuICAgIHR1bm5lbFB0czogZ2VvLlBvaW50W11cclxuICAgIGRlcHRoOiBudW1iZXIsXHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5lcmF0ZUR1bmdlb25MZXZlbChybmc6IHJhbmQuU0ZDMzJSTkcsIGRiOiBybC5UaGluZ0RCLCBwbGF5ZXI6IHJsLlBsYXllciwgZmxvb3I6IG51bWJlciwgZGlyOiBybC5FeGl0RGlyZWN0aW9uKTogUHJvbWlzZTxtYXBzLk1hcD4ge1xyXG4gICAgbGV0IG1pbkRpbSA9IDI0O1xyXG4gICAgbGV0IG1heERpbSA9IDMyICsgZmxvb3IgKiA0O1xyXG4gICAgbGV0IGRpbURpY2UgPSBuZXcgcmwuRGljZShtaW5EaW0sIG1heERpbSlcclxuICAgIGxldCB3aWR0aCA9IGRpbURpY2Uucm9sbChybmcpXHJcbiAgICBsZXQgaGVpZ2h0ID0gZGltRGljZS5yb2xsKHJuZylcclxuXHJcbiAgICBjb25zdCBtb25zdGVycyA9IGNyZWF0ZU1vbnN0ZXJMaXN0KGRiLCBmbG9vcilcclxuICAgIGNvbnN0IGl0ZW1zID0gY3JlYXRlSXRlbUxpc3QoZGIsIGZsb29yKVxyXG4gICAgY29uc3QgbWFwID0gZ2VuZXJhdGVNYXBSb29tcyhybmcsIG1vbnN0ZXJzLCBpdGVtcywgd2lkdGgsIGhlaWdodCwgcGxheWVyLCBkaXIpXHJcblxyXG4gICAgbWFwLmxpZ2h0aW5nID0gbWFwcy5MaWdodGluZy5Ob25lXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlTWFwUm9vbXMoXHJcbiAgICBybmc6IHJhbmQuU0ZDMzJSTkcsXHJcbiAgICBtb25zdGVyczogcmwuV2VpZ2h0ZWRMaXN0PHJsLk1vbnN0ZXI+LFxyXG4gICAgaXRlbXM6IHJsLldlaWdodGVkTGlzdDxybC5JdGVtPixcclxuICAgIHdpZHRoOiBudW1iZXIsXHJcbiAgICBoZWlnaHQ6IG51bWJlcixcclxuICAgIHBsYXllcjogcmwuUGxheWVyLFxyXG4gICAgZGlyOiBybC5FeGl0RGlyZWN0aW9uKTogbWFwcy5NYXAge1xyXG4gICAgY29uc3QgbWFwID0gbmV3IG1hcHMuTWFwKHdpZHRoLCBoZWlnaHQpXHJcbiAgICBjb25zdCBtaW5Sb29tcyA9IDRcclxuXHJcbiAgICBjb25zdCBbY2VsbHMsIHJvb21zXSA9ICgoKSA9PiB7XHJcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgY29uc3QgW2NlbGxzLCByb29tc10gPSBnZW5lcmF0ZUNlbGxHcmlkKHJuZywgd2lkdGgsIGhlaWdodClcclxuICAgICAgICAgICAgaWYgKHJvb21zLmxlbmd0aCA+IG1pblJvb21zKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW2NlbGxzLCByb29tc11cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pKCkgYXMgW0NlbGxHcmlkLCBSb29tW11dXHJcblxyXG4gICAgY29uc3QgZmlyc3RSb29tID0gcm9vbXMucmVkdWNlKCh4LCB5KSA9PiB4LmRlcHRoIDwgeS5kZXB0aCA/IHggOiB5KVxyXG4gICAgY29uc3Qgc3RhaXJzVXAgPSB0aWxlc2V0LnN0YWlyc1VwLmNsb25lKClcclxuICAgIGNvbnN0IHN0YWlyc1VwUG9zaXRpb24gPSBpdGVyLmZpbmQodmlzaXRJbnRlcmlvckNvb3JkcyhjZWxscywgZmlyc3RSb29tLmludGVyaW9yUHQpLCBwdCA9PiBpdGVyLmFueShncmlkLnZpc2l0TmVpZ2hib3JzKGNlbGxzLCBwdCksIGEgPT4gYVswXSA9PT0gQ2VsbFR5cGUuV2FsbCkpXHJcbiAgICBpZiAoIXN0YWlyc1VwUG9zaXRpb24pIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gcGxhY2Ugc3RhaXJzIHVwXCIpXHJcbiAgICB9XHJcblxyXG4gICAgbWFwLmZpeHR1cmVzLnNldChzdGFpcnNVcFBvc2l0aW9uLCBzdGFpcnNVcClcclxuXHJcbiAgICBjb25zdCBsYXN0Um9vbSA9IHJvb21zLnJlZHVjZSgoeCwgeSkgPT4geC5kZXB0aCA+IHkuZGVwdGggPyB4IDogeSlcclxuICAgIGNvbnN0IHN0YWlyc0Rvd24gPSB0aWxlc2V0LnN0YWlyc0Rvd24uY2xvbmUoKVxyXG4gICAgY29uc3Qgc3RhaXJzRG93blBvc2l0aW9uID0gaXRlci5maW5kKFxyXG4gICAgICAgIHZpc2l0SW50ZXJpb3JDb29yZHMoY2VsbHMsIGxhc3RSb29tLmludGVyaW9yUHQpLFxyXG4gICAgICAgIHB0ID0+IGl0ZXIuYW55KGdyaWQudmlzaXROZWlnaGJvcnMoY2VsbHMsIHB0KSwgYSA9PiBhWzBdID09PSBDZWxsVHlwZS5XYWxsKSlcclxuICAgIGlmICghc3RhaXJzRG93blBvc2l0aW9uKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIHBsYWNlIHN0YWlycyBkb3duXCIpXHJcbiAgICB9XHJcblxyXG4gICAgbWFwLmZpeHR1cmVzLnNldChzdGFpcnNEb3duUG9zaXRpb24sIHN0YWlyc0Rvd24pXHJcblxyXG4gICAge1xyXG4gICAgICAgIGNvbnN0IHN0YWlyc1Bvc2l0aW9uID0gZGlyID09PSBybC5FeGl0RGlyZWN0aW9uLlVwID8gc3RhaXJzRG93blBvc2l0aW9uIDogc3RhaXJzVXBQb3NpdGlvblxyXG4gICAgICAgIGNvbnN0IHBsYXllclBvc2l0aW9uID0gaXRlci5maW5kKGdyaWQudmlzaXROZWlnaGJvcnMoY2VsbHMsIHN0YWlyc1Bvc2l0aW9uKSwgKFt4LCBfXSkgPT4geCA9PT0gQ2VsbFR5cGUuSW50ZXJpb3IpXHJcbiAgICAgICAgaWYgKCFwbGF5ZXJQb3NpdGlvbikge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3doZXJlIHRvIHB1dCBwbGF5ZXJcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnNvbGUubG9nKHBsYXllclBvc2l0aW9uLCBwbGF5ZXIpXHJcbiAgICAgICAgbWFwLnBsYXllcnMuc2V0KHBsYXllclBvc2l0aW9uWzFdLCBwbGF5ZXIpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gZ2VuZXJhdGUgdGlsZXMgYW5kIGZpeHR1cmVzIGZyb20gY2VsbHNcclxuICAgIGZvciAoY29uc3QgW3YsIHgsIHldIG9mIGNlbGxzLnNjYW4oKSkge1xyXG4gICAgICAgIGlmICh2ID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzd2l0Y2ggKHYpIHtcclxuICAgICAgICAgICAgY2FzZSBDZWxsVHlwZS5FeHRlcmlvcjpcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIENlbGxUeXBlLkludGVyaW9yOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gdGlsZXNldC5mbG9vci5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5zZXQocG9zaXRpb24sIHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIENlbGxUeXBlLldhbGw6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aWxlc2V0LndhbGwuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuc2V0KHBvc2l0aW9uLCB0aWxlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBDZWxsVHlwZS5Eb29yOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaXh0dXJlID0gdGlsZXNldC5kb29yLmNsb25lKClcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLmZpeHR1cmVzLnNldChwb3NpdGlvbiwgZml4dHVyZSlcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gdGlsZXNldC5mbG9vci5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlUG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuc2V0KHRpbGVQb3NpdGlvbiwgdGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcGxhY2VNb25zdGVycyhybmcsIG1vbnN0ZXJzLCBjZWxscywgcm9vbXMsIG1hcClcclxuICAgIHBsYWNlSXRlbXMocm5nLCBpdGVtcywgY2VsbHMsIHJvb21zLCBtYXApXHJcblxyXG4gICAgY29uc3Qgc2NvbmNlUG9zaXRpb24gPSBpdGVyLmZpbmQoZ3JpZC52aXNpdE5laWdoYm9ycyhjZWxscywgc3RhaXJzVXBQb3NpdGlvbiksIChbY2VsbCwgX10pID0+IGNlbGwgPT09IENlbGxUeXBlLldhbGwpXHJcbiAgICBpZiAoc2NvbmNlUG9zaXRpb24pIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhzY29uY2VQb3NpdGlvblsxXSwgc3RhaXJzVXBQb3NpdGlvbilcclxuICAgICAgICBtYXAuZml4dHVyZXMuc2V0KHNjb25jZVBvc2l0aW9uWzFdLCB0aGluZ3Muc2NvbmNlLmNsb25lKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG1hcFxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZU1vbnN0ZXJzKHJuZzogcmFuZC5STkcsIG1vbnN0ZXJzOiBybC5XZWlnaHRlZExpc3Q8cmwuTW9uc3Rlcj4sIGNlbGxzOiBDZWxsR3JpZCwgcm9vbXM6IFJvb21bXSwgbWFwOiBtYXBzLk1hcCkge1xyXG4gICAgLy8gaXRlcmF0ZSBvdmVyIHJvb21zLCBkZWNpZGUgd2hldGhlciB0byBwbGFjZSBhIG1vbnN0ZXIgaW4gZWFjaCByb29tXHJcbiAgICBjb25zdCBlbmNvdW50ZXJDaGFuY2UgPSAuMzVcclxuICAgIGNvbnN0IHNlY29uZEVuY291bnRlckNoYW5jZSA9IC4yXHJcbiAgICBjb25zdCB0aGlyZEVuY291bnRlckNoYW5jZSA9IC4xXHJcblxyXG4gICAgZm9yIChjb25zdCByb29tIG9mIHJvb21zKSB7XHJcbiAgICAgICAgaWYgKHJvb20uZGVwdGggPD0gMCkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFyYW5kLmNoYW5jZShybmcsIGVuY291bnRlckNoYW5jZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeVBsYWNlTW9uc3RlcihybmcsIG1vbnN0ZXJzLCBjZWxscywgcm9vbSwgbWFwKVxyXG5cclxuICAgICAgICBpZiAoIXJhbmQuY2hhbmNlKHJuZywgc2Vjb25kRW5jb3VudGVyQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5UGxhY2VNb25zdGVyKHJuZywgbW9uc3RlcnMsIGNlbGxzLCByb29tLCBtYXApXHJcblxyXG4gICAgICAgIGlmICghcmFuZC5jaGFuY2Uocm5nLCB0aGlyZEVuY291bnRlckNoYW5jZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeVBsYWNlTW9uc3RlcihybmcsIG1vbnN0ZXJzLCBjZWxscywgcm9vbSwgbWFwKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0cnlQbGFjZU1vbnN0ZXIocm5nOiByYW5kLlJORywgbW9uc3RlcnM6IHJsLldlaWdodGVkTGlzdDxybC5Nb25zdGVyPiwgY2VsbHM6IENlbGxHcmlkLCByb29tOiBSb29tLCBtYXA6IG1hcHMuTWFwKTogYm9vbGVhbiB7XHJcbiAgICAvLyBhdHRlbXB0IHRvIHBsYWNlIG1vbnN0ZXJcclxuICAgIGZvciAoY29uc3QgW3QsIHB0XSBvZiB2aXNpdEludGVyaW9yKGNlbGxzLCByb29tLmludGVyaW9yUHQpKSB7XHJcbiAgICAgICAgaWYgKHQgIT09IENlbGxUeXBlLkludGVyaW9yKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXRlci5hbnkobWFwLCB0aCA9PiAodGgucG9zaXRpb24/LmVxdWFsKHB0KSA/PyBmYWxzZSkgJiYgIXRoLnRoaW5nLnBhc3NhYmxlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbW9uc3RlciA9IG1vbnN0ZXJzLnNlbGVjdChybmcpXHJcbiAgICAgICAgbWFwLm1vbnN0ZXJzLnNldChwdCwgbW9uc3Rlci5jbG9uZSgpKVxyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZUl0ZW1zKHJuZzogcmFuZC5STkcsIGl0ZW1zOiBybC5XZWlnaHRlZExpc3Q8cmwuSXRlbT4sIGNlbGxzOiBDZWxsR3JpZCwgcm9vbXM6IFJvb21bXSwgbWFwOiBtYXBzLk1hcCkge1xyXG4gICAgLy8gaXRlcmF0ZSBvdmVyIHJvb21zLCBkZWNpZGUgd2hldGhlciB0byBwbGFjZSBhIG1vbnN0ZXIgaW4gZWFjaCByb29tXHJcbiAgICBjb25zdCB0cmVhc3VyZUNoYW5jZSA9IC4yXHJcblxyXG4gICAgZm9yIChjb25zdCByb29tIG9mIHJvb21zKSB7XHJcbiAgICAgICAgaWYgKHJvb20uZGVwdGggPD0gMCkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFyYW5kLmNoYW5jZShybmcsIHRyZWFzdXJlQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5UGxhY2VUcmVhc3VyZShybmcsIGl0ZW1zLCBjZWxscywgcm9vbSwgbWFwKVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gdHJ5UGxhY2VUcmVhc3VyZShybmc6IHJhbmQuUk5HLCBpdGVtczogcmwuV2VpZ2h0ZWRMaXN0PHJsLkl0ZW0+LCBjZWxsczogQ2VsbEdyaWQsIHJvb206IFJvb20sIG1hcDogbWFwcy5NYXApOiBib29sZWFuIHtcclxuICAgIC8vIGF0dGVtcHQgdG8gcGxhY2UgdHJlYXN1cmVcclxuICAgIGZvciAoY29uc3QgW3QsIHB0XSBvZiB2aXNpdEludGVyaW9yKGNlbGxzLCByb29tLmludGVyaW9yUHQpKSB7XHJcbiAgICAgICAgaWYgKHQgIT09IENlbGxUeXBlLkludGVyaW9yKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXRlci5hbnkobWFwLCB0aCA9PiAodGgucG9zaXRpb24/LmVxdWFsKHB0KSA/PyBmYWxzZSkgJiYgIXRoLnRoaW5nLnBhc3NhYmxlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY2hlc3QgPSB0aGluZ3MuY2hlc3QuY2xvbmUoKVxyXG5cclxuICAgICAgICAvLyBjaG9vc2UgbG9vdFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBpdGVtcy5zZWxlY3Qocm5nKVxyXG4gICAgICAgIGNoZXN0Lml0ZW1zLmFkZChpdGVtLmNsb25lKCkpXHJcblxyXG4gICAgICAgIC8vIGV4dHJhIGxvb3RcclxuICAgICAgICBsZXQgZXh0cmFMb290Q2hhbmNlID0gLjVcclxuICAgICAgICB3aGlsZSAocmFuZC5jaGFuY2Uocm5nLCBleHRyYUxvb3RDaGFuY2UpKSB7XHJcbiAgICAgICAgICAgIGV4dHJhTG9vdENoYW5jZSAqPSAuNVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gaXRlbXMuc2VsZWN0KHJuZylcclxuICAgICAgICAgICAgY2hlc3QuaXRlbXMuYWRkKGl0ZW0uY2xvbmUoKSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1hcC5jb250YWluZXJzLnNldChwdCwgY2hlc3QuY2xvbmUoKSlcclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZUNlbGxHcmlkKHJuZzogcmFuZC5STkcsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogW0NlbGxHcmlkLCBSb29tW11dIHtcclxuICAgIGNvbnN0IGNlbGxzID0gZ3JpZC5nZW5lcmF0ZSh3aWR0aCwgaGVpZ2h0LCAoKSA9PiBDZWxsVHlwZS5FeHRlcmlvcilcclxuXHJcbiAgICAvLyBnZW5lcmF0ZSByb29tIHRlbXBsYXRlc1xyXG4gICAgY29uc3QgdGVtcGxhdGVzID0gZ2VuZXJhdGVSb29tVGVtcGxhdGVzKClcclxuICAgIGNvbnN0IHN0YWNrOiBSb29tW10gPSBbXVxyXG4gICAgY29uc3Qgcm9vbXM6IFJvb21bXSA9IFtdXHJcblxyXG4gICAgLy8gcGxhY2UgaW5pdGlhbCByb29tXHJcbiAgICB7XHJcbiAgICAgICAgcmFuZC5zaHVmZmxlKHJuZywgdGVtcGxhdGVzKVxyXG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGVtcGxhdGVzWzBdXHJcblxyXG4gICAgICAgIGNvbnN0IHB0ID0gbmV3IGdlby5Qb2ludChcclxuICAgICAgICAgICAgcmFuZC5pbnQocm5nLCAwLCB3aWR0aCAtIHRlbXBsYXRlLmNlbGxzLndpZHRoICsgMSksXHJcbiAgICAgICAgICAgIHJhbmQuaW50KHJuZywgMCwgaGVpZ2h0IC0gdGVtcGxhdGUuY2VsbHMuaGVpZ2h0ICsgMSkpXHJcblxyXG4gICAgICAgIGNvbnN0IHJvb20gPSBwbGFjZVRlbXBsYXRlKHJuZywgY2VsbHMsIHRlbXBsYXRlLCBwdClcclxuICAgICAgICBzdGFjay5wdXNoKHJvb20pXHJcbiAgICAgICAgcm9vbXMucHVzaChyb29tKVxyXG4gICAgfVxyXG5cclxuICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc3Qgcm9vbSA9IGFycmF5LnBvcChzdGFjaylcclxuICAgICAgICBjb25zdCBuZXh0Um9vbSA9IHRyeVR1bm5lbEZyb20ocm5nLCBjZWxscywgdGVtcGxhdGVzLCByb29tKVxyXG5cclxuICAgICAgICBpZiAobmV4dFJvb20pIHtcclxuICAgICAgICAgICAgc3RhY2sucHVzaChyb29tKVxyXG4gICAgICAgICAgICBzdGFjay5wdXNoKG5leHRSb29tKVxyXG4gICAgICAgICAgICByb29tcy5wdXNoKG5leHRSb29tKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gW2NlbGxzLCByb29tc11cclxufVxyXG5cclxuZnVuY3Rpb24gdHJ5VHVubmVsRnJvbShybmc6IHJhbmQuUk5HLCBjZWxsczogQ2VsbEdyaWQsIHRlbXBsYXRlczogUm9vbVRlbXBsYXRlW10sIHJvb206IFJvb20pOiBSb29tIHwgbnVsbCB7XHJcbiAgICByYW5kLnNodWZmbGUocm5nLCB0ZW1wbGF0ZXMpXHJcblxyXG4gICAgd2hpbGUgKHJvb20udHVubmVsUHRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjb25zdCB0cHQgPSBhcnJheS5wb3Aocm9vbS50dW5uZWxQdHMpXHJcbiAgICAgICAgZm9yIChjb25zdCB0ZW1wbGF0ZSBvZiB0ZW1wbGF0ZXMpIHtcclxuICAgICAgICAgICAgY29uc3QgbmV4dFJvb20gPSB0cnlUdW5uZWxUbyhybmcsIGNlbGxzLCB0cHQsIHRlbXBsYXRlKVxyXG4gICAgICAgICAgICBpZiAobmV4dFJvb20pIHtcclxuICAgICAgICAgICAgICAgIC8vIHBsYWNlIGRvb3IgYXQgdHVubmVsIHBvaW50XHJcbiAgICAgICAgICAgICAgICByb29tLnR1bm5lbFB0cyA9IHJvb20udHVubmVsUHRzLmZpbHRlcihwdCA9PiAhcHQuZXF1YWwodHB0KSlcclxuICAgICAgICAgICAgICAgIGNlbGxzLnNldFBvaW50KHRwdCwgQ2VsbFR5cGUuRG9vcilcclxuICAgICAgICAgICAgICAgIG5leHRSb29tLmRlcHRoID0gcm9vbS5kZXB0aCArIDFcclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXh0Um9vbVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVsbFxyXG59XHJcblxyXG5mdW5jdGlvbiB0cnlUdW5uZWxUbyhybmc6IHJhbmQuUk5HLCBjZWxsczogQ2VsbEdyaWQsIHRwdDE6IGdlby5Qb2ludCwgdGVtcGxhdGU6IFJvb21UZW1wbGF0ZSk6IFJvb20gfCBudWxsIHtcclxuICAgIC8vIGZpbmQgdHVubmVsIHBvaW50cyBvZiB0ZW1wbGF0ZVxyXG4gICAgZm9yIChjb25zdCB0cHQyIG9mIHRlbXBsYXRlLnR1bm5lbFB0cykge1xyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHRwdDEuc3ViUG9pbnQodHB0MilcclxuICAgICAgICBpZiAoaXNWYWxpZFBsYWNlbWVudCh0ZW1wbGF0ZS5jZWxscywgY2VsbHMsIG9mZnNldCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHBsYWNlVGVtcGxhdGUocm5nLCBjZWxscywgdGVtcGxhdGUsIG9mZnNldClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51bGxcclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VUZW1wbGF0ZShybmc6IHJhbmQuUk5HLCBjZWxsczogQ2VsbEdyaWQsIHRlbXBsYXRlOiBSb29tVGVtcGxhdGUsIG9mZnNldDogZ2VvLlBvaW50KTogUm9vbSB7XHJcbiAgICBncmlkLmNvcHkodGVtcGxhdGUuY2VsbHMsIGNlbGxzLCBvZmZzZXQueCwgb2Zmc2V0LnkpXHJcblxyXG4gICAgLy8gZmluZCB0dW5uZWxhYmxlIHBvaW50c1xyXG4gICAgY29uc3QgaW50ZXJpb3JQdCA9IHRlbXBsYXRlLmludGVyaW9yUHQuYWRkUG9pbnQob2Zmc2V0KVxyXG4gICAgY29uc3QgdHVubmVsUHRzID0gdGVtcGxhdGUudHVubmVsUHRzLm1hcChwdCA9PiBwdC5hZGRQb2ludChvZmZzZXQpKS5maWx0ZXIocHQgPT4gZmluZEV4dGVyaW9yTmVpZ2hib3IoY2VsbHMsIHB0KSAhPT0gbnVsbClcclxuICAgIHJhbmQuc2h1ZmZsZShybmcsIHR1bm5lbFB0cylcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGludGVyaW9yUHQsXHJcbiAgICAgICAgdHVubmVsUHRzLFxyXG4gICAgICAgIGRlcHRoOiAwXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlUm9vbVRlbXBsYXRlcygpOiBSb29tVGVtcGxhdGVbXSB7XHJcbiAgICBjb25zdCBsZW5ndGhzID0gWzQsIDUsIDYsIDcsIDgsIDksIDEwLCAxMV1cclxuICAgIGNvbnN0IHBhaXJzID0gbGVuZ3Rocy5tYXAoeCA9PiBsZW5ndGhzLm1hcCh5ID0+IFt4LCB5XSkpLmZsYXQoKS5maWx0ZXIoYSA9PiBhWzBdID4gMyB8fCBhWzFdID4gMylcclxuICAgIGNvbnN0IHRlbXBsYXRlcyA9IHBhaXJzLm1hcChhID0+IGdlbmVyYXRlUm9vbVRlbXBsYXRlKGFbMF0sIGFbMV0pKVxyXG4gICAgcmV0dXJuIHRlbXBsYXRlc1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVJvb21UZW1wbGF0ZSh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFJvb21UZW1wbGF0ZSB7XHJcbiAgICBjb25zdCBpbnRlcmlvclB0ID0gbmV3IGdlby5Qb2ludCh3aWR0aCAvIDIsIGhlaWdodCAvIDIpLmZsb29yKClcclxuICAgIGNvbnN0IGNlbGxzID0gZ3JpZC5nZW5lcmF0ZShcclxuICAgICAgICB3aWR0aCxcclxuICAgICAgICBoZWlnaHQsXHJcbiAgICAgICAgKHgsIHkpID0+IHggPT09IDAgfHwgeCA9PT0gd2lkdGggLSAxIHx8IHkgPT09IDAgfHwgeSA9PT0gaGVpZ2h0IC0gMSA/IENlbGxUeXBlLldhbGwgOiBDZWxsVHlwZS5JbnRlcmlvcilcclxuXHJcbiAgICBjb25zdCB0dW5uZWxQdHM6IGdlby5Qb2ludFtdID0gW11cclxuICAgIHR1bm5lbFB0cy5wdXNoKC4uLmdyaWQuc2NhbigxLCAwLCB3aWR0aCAtIDIsIDEpKVxyXG4gICAgdHVubmVsUHRzLnB1c2goLi4uZ3JpZC5zY2FuKDAsIDEsIDEsIGhlaWdodCAtIDIpKVxyXG4gICAgdHVubmVsUHRzLnB1c2goLi4uZ3JpZC5zY2FuKDEsIGhlaWdodCAtIDEsIHdpZHRoIC0gMiwgMSkpXHJcbiAgICB0dW5uZWxQdHMucHVzaCguLi5ncmlkLnNjYW4od2lkdGggLSAxLCAxLCAxLCBoZWlnaHQgLSAyKSlcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGludGVyaW9yUHQsXHJcbiAgICAgICAgY2VsbHMsXHJcbiAgICAgICAgdHVubmVsUHRzXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbmRFeHRlcmlvck5laWdoYm9yKGNlbGxzOiBDZWxsR3JpZCwgcHQ6IGdlby5Qb2ludCk6IGdlby5Qb2ludCB8IG51bGwge1xyXG4gICAgZm9yIChjb25zdCBbdCwgbnB0XSBvZiBncmlkLnZpc2l0TmVpZ2hib3JzKGNlbGxzLCBwdCkpIHtcclxuICAgICAgICBpZiAodCA9PT0gQ2VsbFR5cGUuRXh0ZXJpb3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5wdFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVsbFxyXG59XHJcblxyXG5mdW5jdGlvbiB2aXNpdEludGVyaW9yQ29vcmRzKGNlbGxzOiBDZWxsR3JpZCwgcHQwOiBnZW8uUG9pbnQpOiBJdGVyYWJsZTxnZW8uUG9pbnQ+IHtcclxuICAgIHJldHVybiBpdGVyLm1hcCh2aXNpdEludGVyaW9yKGNlbGxzLCBwdDApLCB4ID0+IHhbMV0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uKiB2aXNpdEludGVyaW9yKGNlbGxzOiBDZWxsR3JpZCwgcHQwOiBnZW8uUG9pbnQpOiBJdGVyYWJsZTxbQ2VsbFR5cGUsIGdlby5Qb2ludF0+IHtcclxuICAgIGNvbnN0IGV4cGxvcmVkID0gY2VsbHMubWFwMigoKSA9PiBmYWxzZSlcclxuICAgIGNvbnN0IHN0YWNrID0gW3B0MF1cclxuXHJcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnN0IHB0ID0gYXJyYXkucG9wKHN0YWNrKVxyXG4gICAgICAgIGV4cGxvcmVkLnNldFBvaW50KHB0LCB0cnVlKVxyXG4gICAgICAgIGNvbnN0IHQgPSBjZWxscy5hdFBvaW50KHB0KVxyXG4gICAgICAgIHlpZWxkIFt0LCBwdF1cclxuXHJcbiAgICAgICAgLy8gaWYgdGhpcyBpcyBhIHdhbGwsIGRvIG5vdCBleHBsb3JlIG5laWdoYm9yc1xyXG4gICAgICAgIGlmICh0ID09PSBDZWxsVHlwZS5XYWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBvdGhlcndpc2UsIGV4cGxvcmUgbmVpZ2hib3JzLCBwdXNoaW5nIG9udG8gc3RhY2sgdGhvc2UgdGhhdCBhcmUgdW5leHBsb3JlZFxyXG4gICAgICAgIGZvciAoY29uc3QgW3QsIG5wdF0gb2YgZ3JpZC52aXNpdE5laWdoYm9ycyhjZWxscywgcHQpKSB7XHJcbiAgICAgICAgICAgIGlmIChleHBsb3JlZC5hdFBvaW50KG5wdCkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0ICE9PSBDZWxsVHlwZS5JbnRlcmlvcikge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgc3RhY2sucHVzaChucHQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkUGxhY2VtZW50KHNyYzogQ2VsbEdyaWQsIGRzdDogQ2VsbEdyaWQsIG9mZnNldDogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICBpZiAoIWRzdC5yZWdpb25JbkJvdW5kcyhvZmZzZXQueCwgb2Zmc2V0LnksIHNyYy53aWR0aCwgc3JjLmhlaWdodCkpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IFtzdCwgeCwgeV0gb2Ygc3JjLnNjYW4oKSkge1xyXG4gICAgICAgIC8vIHJ1bGVzOlxyXG4gICAgICAgIC8vIGNhbiBwbGFjZSB3YWxsIG92ZXIgd2FsbFxyXG4gICAgICAgIC8vIGNhbiBwbGFjZSBhbnl0aGluZyBvdmVyIGV4dGVyaW9yXHJcbiAgICAgICAgY29uc3QgZHQgPSBkc3QuYXQoeCArIG9mZnNldC54LCB5ICsgb2Zmc2V0LnkpXHJcbiAgICAgICAgaWYgKGR0ID09PSBDZWxsVHlwZS5FeHRlcmlvcikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGR0ID09PSBDZWxsVHlwZS5XYWxsICYmIHN0ID09PSBDZWxsVHlwZS5XYWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVPdXRkb29yTWFwKHBsYXllcjogcmwuUGxheWVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFByb21pc2U8bWFwcy5NYXA+IHtcclxuICAgIGNvbnN0IG1hcCA9IG5ldyBtYXBzLk1hcCh3aWR0aCwgaGVpZ2h0KVxyXG4gICAgbWFwLmxpZ2h0aW5nID0gbWFwcy5MaWdodGluZy5BbWJpZW50XHJcbiAgICBnZW5lcmF0ZU91dGRvb3JUZXJyYWluKG1hcClcclxuICAgIHJldHVybiBtYXBcclxufVxyXG5cclxuZW51bSBPdXRkb29yVGlsZVR5cGUge1xyXG4gICAgd2F0ZXIsXHJcbiAgICBncmFzcyxcclxuICAgIGRpcnQsXHJcbiAgICBzYW5kXHJcbn1cclxuXHJcbmVudW0gT3V0ZG9vckZpeHR1cmVUeXBlIHtcclxuICAgIG5vbmUsXHJcbiAgICBoaWxscyxcclxuICAgIG1vdW50YWlucyxcclxuICAgIHRyZWVzLFxyXG4gICAgc25vd1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZU91dGRvb3JUZXJyYWluKG1hcDogbWFwcy5NYXApIHtcclxuICAgIGNvbnN0IHRpbGVzID0gZ3JpZC5nZW5lcmF0ZShtYXAud2lkdGgsIG1hcC5oZWlnaHQsICgpID0+IE91dGRvb3JUaWxlVHlwZS53YXRlcilcclxuICAgIGNvbnN0IGZpeHR1cmVzID0gZ3JpZC5nZW5lcmF0ZShtYXAud2lkdGgsIG1hcC5oZWlnaHQsICgpID0+IE91dGRvb3JGaXh0dXJlVHlwZS5ub25lKVxyXG5cclxuICAgIC8vIFRPRE8gLSByYW5kb21seSBiaWFzIHBlcmxpbiBub2lzZSBpbnN0ZWFkXHJcbiAgICAvLyBjb25zdCBiaWFzPSByYW5kLmludCgwLCAyNTYpXHJcbiAgICBjb25zdCBiaWFzID0gMFxyXG5cclxuICAgIGNvbnN0IGhlaWdodE1hcCA9IGZibShtYXAud2lkdGgsIG1hcC5oZWlnaHQsIGJpYXMsIDggLyBtYXAud2lkdGgsIDIsIC41LCA4KVxyXG5cclxuICAgIGltYWdpbmcuc2NhbihtYXAud2lkdGgsIG1hcC5oZWlnaHQsICh4LCB5LCBvZmZzZXQpID0+IHtcclxuICAgICAgICBjb25zdCBoID0gaGVpZ2h0TWFwW29mZnNldF1cclxuICAgICAgICBpZiAoaCA+IDApIHtcclxuICAgICAgICAgICAgdGlsZXMuc2V0KHgsIHksIE91dGRvb3JUaWxlVHlwZS5kaXJ0KVxyXG4gICAgICAgIH1cclxuICAgIH0pXHJcblxyXG4gICAgbWFwLnBsYXllci5wb3NpdGlvbiA9IHRpbGVzLmZpbmRQb2ludCh0ID0+IHQgIT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikgPz8gbmV3IGdlby5Qb2ludCgwLCAwKVxyXG5cclxuICAgIGZvciAoY29uc3QgW3QsIHgsIHldIG9mIHRpbGVzLnNjYW4oKSkge1xyXG4gICAgICAgIHN3aXRjaCAodCkge1xyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yVGlsZVR5cGUud2F0ZXIpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gdGhpbmdzLndhdGVyLmNsb25lKClcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5zZXQobmV3IGdlby5Qb2ludCh4LCB5KSwgdGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JUaWxlVHlwZS5kaXJ0KToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRoaW5ncy5kaXJ0LmNsb25lKClcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5zZXQobmV3IGdlby5Qb2ludCh4LCB5KSwgdGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JUaWxlVHlwZS5ncmFzcyk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aGluZ3MuZ3Jhc3MuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgbWFwLnRpbGVzLnNldChuZXcgZ2VvLlBvaW50KHgsIHkpLCB0aWxlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vclRpbGVUeXBlLnNhbmQpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gdGhpbmdzLnNhbmQuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgbWFwLnRpbGVzLnNldChuZXcgZ2VvLlBvaW50KHgsIHkpLCB0aWxlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IFtmLCB4LCB5XSBvZiBmaXh0dXJlcy5zY2FuKCkpIHtcclxuICAgICAgICBzd2l0Y2ggKGYpIHtcclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vckZpeHR1cmVUeXBlLmhpbGxzKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZml4dHVyZSA9IHRoaW5ncy5oaWxscy5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBtYXAuZml4dHVyZXMuc2V0KG5ldyBnZW8uUG9pbnQoeCwgeSksIGZpeHR1cmUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yRml4dHVyZVR5cGUubW91bnRhaW5zKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZml4dHVyZSA9IHRoaW5ncy5tb3VudGFpbnMuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgbWFwLmZpeHR1cmVzLnNldChuZXcgZ2VvLlBvaW50KHgsIHkpLCBmaXh0dXJlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vckZpeHR1cmVUeXBlLnRyZWVzKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZml4dHVyZSA9IHRoaW5ncy50cmVlcy5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBtYXAuZml4dHVyZXMuc2V0KG5ldyBnZW8uUG9pbnQoeCwgeSksIGZpeHR1cmUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yRml4dHVyZVR5cGUuc25vdyk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeHR1cmUgPSB0aGluZ3Muc25vdy5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBtYXAuZml4dHVyZXMuc2V0KG5ldyBnZW8uUG9pbnQoeCwgeSksIGZpeHR1cmUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZUxhbmRtYXNzZXMocm5nOiByYW5kLlJORywgdGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+KSB7XHJcbiAgICBjb25zdCBtYXhUaWxlcyA9IE1hdGguY2VpbCh0aWxlcy5zaXplICogcmFuZC5mbG9hdChybmcsIC4zLCAuNSkpXHJcbiAgICBncm93TGFuZChybmcsIHRpbGVzLCBtYXhUaWxlcylcclxuXHJcbiAgICAvLyBmaW5kIG1heGltYWwgd2F0ZXIgcmVjdCAtIGlmIGxhcmdlIGVub3VnaCwgcGxhbnQgaXNsYW5kXHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgIGNvbnN0IGFhYmIgPSBncmlkLmZpbmRNYXhpbWFsUmVjdCh0aWxlcywgdCA9PiB0ID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpLnNocmluaygxKVxyXG4gICAgICAgIGlmIChhYWJiLmFyZWEgPCAxMikge1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdmlldyA9IHRpbGVzLnZpZXdBQUJCKGFhYmIpXHJcbiAgICAgICAgY29uc3QgaXNsYW5kVGlsZXMgPSBhYWJiLmFyZWEgKiByYW5kLmZsb2F0KHJuZywgLjI1LCAxKVxyXG4gICAgICAgIGdyb3dMYW5kKHJuZywgdmlldywgaXNsYW5kVGlsZXMpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gcGxhY2Ugc29tZSBpc2xhbmRzXHJcbiAgICBwbGFjZUJlYWNoZXModGlsZXMpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdyb3dMYW5kKHJuZzogcmFuZC5STkcsIHRpbGVzOiBncmlkLkdyaWQ8T3V0ZG9vclRpbGVUeXBlPiwgbWF4VGlsZXM6IG51bWJlcikge1xyXG4gICAgLy8gXCJwbGFudFwiIGEgY29udGluZW50XHJcbiAgICBjb25zdCBzdGFjayA9IG5ldyBBcnJheTxnZW8uUG9pbnQ+KClcclxuICAgIGNvbnN0IHNlZWQgPSBuZXcgZ2VvLlBvaW50KHRpbGVzLndpZHRoIC8gMiwgdGlsZXMuaGVpZ2h0IC8gMikuZmxvb3IoKVxyXG4gICAgc3RhY2sucHVzaChzZWVkKVxyXG4gICAgbGV0IHBsYWNlZCA9IDBcclxuXHJcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCAmJiBwbGFjZWQgPCBtYXhUaWxlcykge1xyXG4gICAgICAgIGNvbnN0IHB0ID0gYXJyYXkucG9wKHN0YWNrKVxyXG4gICAgICAgIHRpbGVzLnNldFBvaW50KHB0LCBPdXRkb29yVGlsZVR5cGUuZ3Jhc3MpXHJcbiAgICAgICAgKytwbGFjZWRcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBbdCwgeHldIG9mIGdyaWQudmlzaXROZWlnaGJvcnModGlsZXMsIHB0KSkge1xyXG4gICAgICAgICAgICBpZiAodCA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHh5KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByYW5kLnNodWZmbGUocm5nLCBzdGFjaylcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VCZWFjaGVzKHRpbGVzOiBncmlkLkdyaWQ8T3V0ZG9vclRpbGVUeXBlPikge1xyXG4gICAgZm9yIChjb25zdCBwdCBvZiBncmlkLnNjYW4oMCwgMCwgdGlsZXMud2lkdGgsIHRpbGVzLmhlaWdodCkpIHtcclxuICAgICAgICBpZiAodGlsZXMuYXRQb2ludChwdCkgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHB0LnggPiAwICYmIHRpbGVzLmF0KHB0LnggLSAxLCBwdC55KSA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgIHRpbGVzLnNldFBvaW50KHB0LCBPdXRkb29yVGlsZVR5cGUuc2FuZClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwdC54IDwgdGlsZXMud2lkdGggLSAxICYmIHRpbGVzLmF0KHB0LnggKyAxLCBwdC55KSA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgIHRpbGVzLnNldFBvaW50KHB0LCBPdXRkb29yVGlsZVR5cGUuc2FuZClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwdC55ID4gMCAmJiB0aWxlcy5hdChwdC54LCBwdC55IC0gMSkgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICB0aWxlcy5zZXRQb2ludChwdCwgT3V0ZG9vclRpbGVUeXBlLnNhbmQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocHQueSA8IHRpbGVzLmhlaWdodCAtIDEgJiYgdGlsZXMuYXQocHQueCwgcHQueSArIDEpID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgdGlsZXMuc2V0UG9pbnQocHQsIE91dGRvb3JUaWxlVHlwZS5zYW5kKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VTbm93KHRpbGVzOiBncmlkLkdyaWQ8T3V0ZG9vclRpbGVUeXBlPiwgZml4dHVyZXM6IGdyaWQuR3JpZDxPdXRkb29yRml4dHVyZVR5cGU+KSB7XHJcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQgfSA9IHRpbGVzXHJcbiAgICBjb25zdCBzbm93SGVpZ2h0ID0gTWF0aC5jZWlsKGhlaWdodCAvIDMpXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHNub3dIZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCB0ID0gdGlsZXMuYXQoeCwgeSlcclxuICAgICAgICAgICAgaWYgKHQgIT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICAgICAgZml4dHVyZXMuc2V0KHgsIHksIE91dGRvb3JGaXh0dXJlVHlwZS5zbm93KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZU1vdW50YWlucyhybmc6IHJhbmQuUk5HLCB0aWxlczogZ3JpZC5HcmlkPE91dGRvb3JUaWxlVHlwZT4sIGZpeHR1cmVzOiBncmlkLkdyaWQ8T3V0ZG9vckZpeHR1cmVUeXBlPiwgbWF4VGlsZXM6IG51bWJlcikge1xyXG4gICAgLy8gZmluZCBhIHN1aXRhYmxlIHN0YXJ0IHBvaW50IGZvciBtb3VudGFpbiByYW5nZVxyXG4gICAgY29uc3Qgc2VlZCA9IHJhbmQuY2hvb3NlKHJuZywgWy4uLnRpbGVzLmZpbmRQb2ludHMoeCA9PiB4ICE9PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIgJiYgeCAhPT0gT3V0ZG9vclRpbGVUeXBlLnNhbmQpXSlcclxuICAgIGNvbnN0IHN0YWNrID0gbmV3IEFycmF5PGdlby5Qb2ludD4oKVxyXG4gICAgc3RhY2sucHVzaChzZWVkKVxyXG4gICAgbGV0IHBsYWNlZCA9IDBcclxuXHJcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCAmJiBwbGFjZWQgPCBtYXhUaWxlcykge1xyXG4gICAgICAgIGNvbnN0IHB0ID0gYXJyYXkucG9wKHN0YWNrKVxyXG4gICAgICAgIGZpeHR1cmVzLnNldFBvaW50KHB0LCBPdXRkb29yRml4dHVyZVR5cGUubW91bnRhaW5zKVxyXG4gICAgICAgICsrcGxhY2VkXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgW3QsIHh5XSBvZiBncmlkLnZpc2l0TmVpZ2hib3JzKHRpbGVzLCBwdCkpIHtcclxuICAgICAgICAgICAgaWYgKHQgIT09IE91dGRvb3JUaWxlVHlwZS53YXRlciAmJiB0ICE9PSBPdXRkb29yVGlsZVR5cGUuc2FuZCkge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh4eSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmFuZC5zaHVmZmxlKHJuZywgc3RhY2spXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZibSh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgYmlhczogbnVtYmVyLCBmcmVxOiBudW1iZXIsIGxhY3VuYXJpdHk6IG51bWJlciwgZ2FpbjogbnVtYmVyLCBvY3RhdmVzOiBudW1iZXIpOiBudW1iZXJbXSB7XHJcbiAgICByZXR1cm4gaW1hZ2luZy5nZW5lcmF0ZSh3aWR0aCwgaGVpZ2h0LCAoeCwgeSkgPT4ge1xyXG4gICAgICAgIHJldHVybiBub2lzZS5mYm1QZXJsaW4yKHggKiBmcmVxICsgYmlhcywgeSAqIGZyZXEgKyBiaWFzLCBsYWN1bmFyaXR5LCBnYWluLCBvY3RhdmVzKVxyXG4gICAgfSlcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlTW9uc3Rlckxpc3QoZGI6IHJsLlRoaW5nREIsIGZsb29yOiBudW1iZXIpOiBybC5XZWlnaHRlZExpc3Q8cmwuTW9uc3Rlcj4ge1xyXG4gICAgLy8gY3JlYXRlIHdlaWdodGVkIGxpc3Qgb2YgbW9uc3RlcnMvaXRlbXMgYXBwcm9wcmlhdGUgZm9yIGxldmVsXHJcbiAgICBjb25zdCBsaXN0OiBbcmwuTW9uc3RlciwgbnVtYmVyXVtdID0gW11cclxuICAgIGZvciAoY29uc3QgbW9uc3RlciBvZiBkYikge1xyXG4gICAgICAgIGlmICghKG1vbnN0ZXIgaW5zdGFuY2VvZiBybC5Nb25zdGVyKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG1vbnN0ZXIubGV2ZWwgPiBmbG9vciArIDEpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChtb25zdGVyLmxldmVsIDw9IDApIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB3ID0gbW9uc3Rlci5mcmVxXHJcbiAgICAgICAgbGV0IGRsID0gTWF0aC5hYnMobW9uc3Rlci5sZXZlbCAtIGZsb29yKVxyXG4gICAgICAgIGlmIChkbCA+IDApIHtcclxuICAgICAgICAgICAgdyAvPSAoZGwgKyAxKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGlzdC5wdXNoKFttb25zdGVyLCB3XSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV3IHJsLldlaWdodGVkTGlzdChsaXN0KVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVJdGVtTGlzdChkYjogcmwuVGhpbmdEQiwgZmxvb3I6IG51bWJlcikge1xyXG4gICAgLy8gY3JlYXRlIHdlaWdodGVkIGxpc3Qgb2YgbW9uc3RlcnMvaXRlbXMgYXBwcm9wcmlhdGUgZm9yIGxldmVsXHJcbiAgICBjb25zdCBsaXN0OiBbcmwuSXRlbSwgbnVtYmVyXVtdID0gW11cclxuICAgIGZvciAoY29uc3QgaXRlbSBvZiBkYikge1xyXG4gICAgICAgIGlmICghKGl0ZW0gaW5zdGFuY2VvZiBybC5JdGVtKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGl0ZW0ubGV2ZWwgPiBmbG9vciArIDEpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpdGVtLmxldmVsIDw9IDAgfHwgaXRlbS5sZXZlbCA8IGZsb29yIC0gMikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHcgPSBpdGVtLmZyZXFcclxuICAgICAgICBsZXQgZGwgPSBNYXRoLmFicyhpdGVtLmxldmVsIC0gZmxvb3IpXHJcbiAgICAgICAgaWYgKGRsID4gMCkge1xyXG4gICAgICAgICAgICB3IC89IChkbCArIDEpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsaXN0LnB1c2goW2l0ZW0sIHddKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBuZXcgcmwuV2VpZ2h0ZWRMaXN0KGxpc3QpXHJcbn0iXX0=