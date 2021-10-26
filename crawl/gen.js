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
const monsters = [
    things.bat.clone(),
    things.skeleton.clone(),
    things.greenSlime.clone(),
    things.redSlime.clone(),
    things.spider.clone(),
    things.rat.clone(),
    things.redy.clone(),
    things.fider.clone(),
];
const loot = [
    things.clothArmor.clone(),
    things.sharpStick.clone(),
    things.dagger.clone(),
    things.leatherArmor.clone(),
    things.woodenBow.clone(),
    things.slingShot.clone(),
    things.weakHealthPotion.clone(),
    things.healthPotion.clone()
];
var CellType;
(function (CellType) {
    CellType[CellType["Exterior"] = 0] = "Exterior";
    CellType[CellType["Interior"] = 1] = "Interior";
    CellType[CellType["Wall"] = 2] = "Wall";
    CellType[CellType["Door"] = 3] = "Door";
})(CellType || (CellType = {}));
export async function generateDungeonLevel(rng, player, floor) {
    let minDim = 24;
    let maxDim = 32 + floor * 4;
    let dimDice = new rl.Dice(minDim, maxDim);
    const map = generateMapRooms(rng, dimDice.roll(rng), dimDice.roll(rng), player);
    map.lighting = maps.Lighting.None;
    return map;
}
function generateMapRooms(rng, width, height, player) {
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
    map.fixtures.set(stairsUpPosition.clone(), stairsUp);
    const lastRoom = rooms.reduce((x, y) => x.depth > y.depth ? x : y);
    const stairsDown = tileset.stairsDown.clone();
    const stairsDownPosition = iter.find(visitInteriorCoords(cells, lastRoom.interiorPt), pt => iter.any(grid.visitNeighbors(cells, pt), a => a[0] === CellType.Wall));
    if (!stairsDownPosition) {
        throw new Error("Failed to place stairs down");
    }
    map.fixtures.set(stairsDownPosition.clone(), stairsDown);
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
    placeMonsters(rng, cells, rooms, map);
    placeTreasures(rng, cells, rooms, map);
    return map;
}
function placeMonsters(rng, cells, rooms, map) {
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
        tryPlaceMonster(rng, cells, room, map);
        if (!rand.chance(rng, secondEncounterChance)) {
            continue;
        }
        tryPlaceMonster(rng, cells, room, map);
        if (!rand.chance(rng, thirdEncounterChance)) {
            continue;
        }
        tryPlaceMonster(rng, cells, room, map);
    }
}
function tryPlaceMonster(rng, cells, room, map) {
    // attempt to place monster
    for (const [t, pt] of visitInterior(cells, room.interiorPt)) {
        if (t !== CellType.Interior) {
            continue;
        }
        if (iter.any(map, th => { var _a, _b; return ((_b = (_a = th.position) === null || _a === void 0 ? void 0 : _a.equal(pt)) !== null && _b !== void 0 ? _b : false) && !th.thing.passable; })) {
            continue;
        }
        const monster = rand.choose(rng, monsters).clone();
        map.monsters.set(pt, monster);
        return true;
    }
    return false;
}
function placeTreasures(rng, cells, rooms, map) {
    // iterate over rooms, decide whether to place a monster in each room
    const treasureChance = .2;
    for (const room of rooms) {
        if (room.depth <= 0) {
            continue;
        }
        if (!rand.chance(rng, treasureChance)) {
            continue;
        }
        tryPlaceTreasure(rng, cells, room, map);
    }
}
function tryPlaceTreasure(rng, cells, room, map) {
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
        const item = rand.choose(rng, loot);
        chest.items.add(item);
        // extra loot
        let extraLootChance = .5;
        while (rand.chance(rng, extraLootChance)) {
            extraLootChance *= .5;
            const item = rand.choose(rng, loot);
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
    const lengths = [5, 7, 9, 11, 13, 15];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0gsT0FBTyxLQUFLLEVBQUUsTUFBTSxTQUFTLENBQUE7QUFDN0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBQ2pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQVUvQyxNQUFNLE9BQU8sR0FBbUI7SUFDNUIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFO0lBQzlCLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRTtJQUMzQixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7SUFDekIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO0lBQ2pDLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRTtDQUN4QyxDQUFBO0FBRUQsTUFBTSxRQUFRLEdBQUc7SUFDYixNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRTtJQUNsQixNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtJQUN2QixNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRTtJQUN6QixNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtJ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LENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzNCLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ25ELEVBQUUsTUFBTSxDQUFBO1FBRVIsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQ2xELElBQUksQ0FBQyxLQUFLLGVBQWUsQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLGVBQWUsQ0FBQyxJQUFJLEVBQUU7Z0JBQzNELEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7YUFDakI7U0FDSjtRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO0tBQzNCO0FBQ0wsQ0FBQztBQUVELFNBQVMsR0FBRyxDQUFDLEtBQWEsRUFBRSxNQUFjLEVBQUUsSUFBWSxFQUFFLElBQVksRUFBRSxVQUFrQixFQUFFLElBQVksRUFBRSxPQUFlO0lBQ3JILE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzVDLE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3hGLENBQUMsQ0FBQyxDQUFBO0FBQ04sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBtYXAgZ2VuZXJhdGlvbiBsaWJyYXJ5XHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBybCBmcm9tIFwiLi9ybC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgZ3JpZCBmcm9tIFwiLi4vc2hhcmVkL2dyaWQuanNcIlxyXG5pbXBvcnQgKiBhcyBhcnJheSBmcm9tIFwiLi4vc2hhcmVkL2FycmF5LmpzXCJcclxuaW1wb3J0ICogYXMgaXRlciBmcm9tIFwiLi4vc2hhcmVkL2l0ZXIuanNcIlxyXG5pbXBvcnQgKiBhcyByYW5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiXHJcbmltcG9ydCAqIGFzIHRoaW5ncyBmcm9tIFwiLi90aGluZ3MuanNcIlxyXG5pbXBvcnQgKiBhcyBtYXBzIGZyb20gXCIuL21hcHMuanNcIlxyXG5pbXBvcnQgKiBhcyBub2lzZSBmcm9tIFwiLi4vc2hhcmVkL25vaXNlLmpzXCJcclxuaW1wb3J0ICogYXMgaW1hZ2luZyBmcm9tIFwiLi4vc2hhcmVkL2ltYWdpbmcuanNcIlxyXG5cclxuaW50ZXJmYWNlIER1bmdlb25UaWxlc2V0IHtcclxuICAgIHdhbGw6IHJsLlRpbGUsXHJcbiAgICBmbG9vcjogcmwuVGlsZSxcclxuICAgIGRvb3I6IHJsLkRvb3IsXHJcbiAgICBzdGFpcnNVcDogcmwuRXhpdFxyXG4gICAgc3RhaXJzRG93bjogcmwuRXhpdFxyXG59XHJcblxyXG5jb25zdCB0aWxlc2V0OiBEdW5nZW9uVGlsZXNldCA9IHtcclxuICAgIHdhbGw6IHRoaW5ncy5icmlja1dhbGwuY2xvbmUoKSxcclxuICAgIGZsb29yOiB0aGluZ3MuZmxvb3IuY2xvbmUoKSxcclxuICAgIGRvb3I6IHRoaW5ncy5kb29yLmNsb25lKCksXHJcbiAgICBzdGFpcnNVcDogdGhpbmdzLnN0YWlyc1VwLmNsb25lKCksXHJcbiAgICBzdGFpcnNEb3duOiB0aGluZ3Muc3RhaXJzRG93bi5jbG9uZSgpXHJcbn1cclxuXHJcbmNvbnN0IG1vbnN0ZXJzID0gW1xyXG4gICAgdGhpbmdzLmJhdC5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLnNrZWxldG9uLmNsb25lKCksXHJcbiAgICB0aGluZ3MuZ3JlZW5TbGltZS5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLnJlZFNsaW1lLmNsb25lKCksXHJcbiAgICB0aGluZ3Muc3BpZGVyLmNsb25lKCksXHJcbiAgICB0aGluZ3MucmF0LmNsb25lKCksXHJcbiAgICB0aGluZ3MucmVkeS5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLmZpZGVyLmNsb25lKCksXHJcbl1cclxuXHJcbmNvbnN0IGxvb3QgPSBbXHJcbiAgICB0aGluZ3MuY2xvdGhBcm1vci5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLnNoYXJwU3RpY2suY2xvbmUoKSxcclxuICAgIHRoaW5ncy5kYWdnZXIuY2xvbmUoKSxcclxuICAgIHRoaW5ncy5sZWF0aGVyQXJtb3IuY2xvbmUoKSxcclxuICAgIHRoaW5ncy53b29kZW5Cb3cuY2xvbmUoKSxcclxuICAgIHRoaW5ncy5zbGluZ1Nob3QuY2xvbmUoKSxcclxuICAgIHRoaW5ncy53ZWFrSGVhbHRoUG90aW9uLmNsb25lKCksXHJcbiAgICB0aGluZ3MuaGVhbHRoUG90aW9uLmNsb25lKClcclxuXVxyXG5cclxuZW51bSBDZWxsVHlwZSB7XHJcbiAgICBFeHRlcmlvcixcclxuICAgIEludGVyaW9yLFxyXG4gICAgV2FsbCxcclxuICAgIERvb3JcclxufVxyXG5cclxudHlwZSBDZWxsR3JpZCA9IGdyaWQuR3JpZDxDZWxsVHlwZT5cclxuXHJcbmludGVyZmFjZSBSb29tVGVtcGxhdGUge1xyXG4gICAgY2VsbHM6IENlbGxHcmlkXHJcbiAgICBpbnRlcmlvclB0OiBnZW8uUG9pbnRcclxuICAgIHR1bm5lbFB0czogZ2VvLlBvaW50W11cclxufVxyXG5cclxuaW50ZXJmYWNlIFJvb20ge1xyXG4gICAgaW50ZXJpb3JQdDogZ2VvLlBvaW50XHJcbiAgICB0dW5uZWxQdHM6IGdlby5Qb2ludFtdXHJcbiAgICBkZXB0aDogbnVtYmVyLFxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVEdW5nZW9uTGV2ZWwocm5nOiByYW5kLlNGQzMyUk5HLCBwbGF5ZXI6IHJsLlBsYXllciwgZmxvb3I6IG51bWJlcik6IFByb21pc2U8bWFwcy5NYXA+IHtcclxuICAgIGxldCBtaW5EaW0gPSAyNDtcclxuICAgIGxldCBtYXhEaW0gPSAzMiArIGZsb29yICogNDtcclxuICAgIGxldCBkaW1EaWNlID0gbmV3IHJsLkRpY2UobWluRGltLCBtYXhEaW0pXHJcbiAgICBjb25zdCBtYXAgPSBnZW5lcmF0ZU1hcFJvb21zKHJuZywgZGltRGljZS5yb2xsKHJuZyksIGRpbURpY2Uucm9sbChybmcpLCBwbGF5ZXIpXHJcbiAgICBtYXAubGlnaHRpbmcgPSBtYXBzLkxpZ2h0aW5nLk5vbmVcclxuICAgIHJldHVybiBtYXBcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVNYXBSb29tcyhybmc6IHJhbmQuU0ZDMzJSTkcsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBwbGF5ZXI6IHJsLlBsYXllcik6IG1hcHMuTWFwIHtcclxuICAgIGNvbnN0IG1hcCA9IG5ldyBtYXBzLk1hcCh3aWR0aCwgaGVpZ2h0LCAxLCB7IHBvc2l0aW9uOiBuZXcgZ2VvLlBvaW50KDAsIDApLCB0aGluZzogcGxheWVyIH0pXHJcbiAgICBjb25zdCBtaW5Sb29tcyA9IDRcclxuXHJcbiAgICBjb25zdCBbY2VsbHMsIHJvb21zXSA9ICgoKSA9PiB7XHJcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgY29uc3QgW2NlbGxzLCByb29tc10gPSBnZW5lcmF0ZUNlbGxHcmlkKHJuZywgd2lkdGgsIGhlaWdodClcclxuICAgICAgICAgICAgaWYgKHJvb21zLmxlbmd0aCA+IG1pblJvb21zKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW2NlbGxzLCByb29tc11cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pKCkgYXMgW0NlbGxHcmlkLCBSb29tW11dXHJcblxyXG4gICAgY29uc3QgZmlyc3RSb29tID0gcm9vbXMucmVkdWNlKCh4LCB5KSA9PiB4LmRlcHRoIDwgeS5kZXB0aCA/IHggOiB5KVxyXG4gICAgbWFwLnBsYXllci5wb3NpdGlvbiA9IGZpcnN0Um9vbS5pbnRlcmlvclB0LmNsb25lKClcclxuXHJcbiAgICBjb25zdCBzdGFpcnNVcCA9IHRpbGVzZXQuc3RhaXJzVXAuY2xvbmUoKVxyXG4gICAgY29uc3Qgc3RhaXJzVXBQb3NpdGlvbiA9IGl0ZXIuZmluZCh2aXNpdEludGVyaW9yQ29vcmRzKGNlbGxzLCBmaXJzdFJvb20uaW50ZXJpb3JQdCksIHB0ID0+IGl0ZXIuYW55KGdyaWQudmlzaXROZWlnaGJvcnMoY2VsbHMsIHB0KSwgYSA9PiBhWzBdID09PSBDZWxsVHlwZS5XYWxsKSlcclxuICAgIGlmICghc3RhaXJzVXBQb3NpdGlvbikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBwbGFjZSBzdGFpcnMgdXBcIilcclxuICAgIH1cclxuXHJcbiAgICBtYXAuZml4dHVyZXMuc2V0KHN0YWlyc1VwUG9zaXRpb24uY2xvbmUoKSwgc3RhaXJzVXApXHJcblxyXG4gICAgY29uc3QgbGFzdFJvb20gPSByb29tcy5yZWR1Y2UoKHgsIHkpID0+IHguZGVwdGggPiB5LmRlcHRoID8geCA6IHkpXHJcbiAgICBjb25zdCBzdGFpcnNEb3duID0gdGlsZXNldC5zdGFpcnNEb3duLmNsb25lKClcclxuICAgIGNvbnN0IHN0YWlyc0Rvd25Qb3NpdGlvbiA9IGl0ZXIuZmluZCh2aXNpdEludGVyaW9yQ29vcmRzKGNlbGxzLCBsYXN0Um9vbS5pbnRlcmlvclB0KSwgcHQgPT4gaXRlci5hbnkoZ3JpZC52aXNpdE5laWdoYm9ycyhjZWxscywgcHQpLCBhID0+IGFbMF0gPT09IENlbGxUeXBlLldhbGwpKVxyXG4gICAgaWYgKCFzdGFpcnNEb3duUG9zaXRpb24pIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gcGxhY2Ugc3RhaXJzIGRvd25cIilcclxuICAgIH1cclxuXHJcbiAgICBtYXAuZml4dHVyZXMuc2V0KHN0YWlyc0Rvd25Qb3NpdGlvbi5jbG9uZSgpLCBzdGFpcnNEb3duKVxyXG5cclxuICAgIC8vIGdlbmVyYXRlIHRpbGVzIGFuZCBmaXh0dXJlcyBmcm9tIGNlbGxzXHJcbiAgICBmb3IgKGNvbnN0IFt2LCB4LCB5XSBvZiBjZWxscy5zY2FuKCkpIHtcclxuICAgICAgICBpZiAodiA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3dpdGNoICh2KSB7XHJcbiAgICAgICAgICAgIGNhc2UgQ2VsbFR5cGUuRXh0ZXJpb3I6XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBDZWxsVHlwZS5JbnRlcmlvcjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRpbGVzZXQuZmxvb3IuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuc2V0KHBvc2l0aW9uLCB0aWxlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBDZWxsVHlwZS5XYWxsOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gdGlsZXNldC53YWxsLmNsb25lKClcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLnRpbGVzLnNldChwb3NpdGlvbiwgdGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ2VsbFR5cGUuRG9vcjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZml4dHVyZSA9IHRpbGVzZXQuZG9vci5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC5maXh0dXJlcy5zZXQocG9zaXRpb24sIGZpeHR1cmUpXHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRpbGVzZXQuZmxvb3IuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZVBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLnRpbGVzLnNldCh0aWxlUG9zaXRpb24sIHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHBsYWNlTW9uc3RlcnMocm5nLCBjZWxscywgcm9vbXMsIG1hcClcclxuICAgIHBsYWNlVHJlYXN1cmVzKHJuZywgY2VsbHMsIHJvb21zLCBtYXApXHJcblxyXG4gICAgcmV0dXJuIG1hcFxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZU1vbnN0ZXJzKHJuZzogcmFuZC5STkcsIGNlbGxzOiBDZWxsR3JpZCwgcm9vbXM6IFJvb21bXSwgbWFwOiBtYXBzLk1hcCkge1xyXG4gICAgLy8gaXRlcmF0ZSBvdmVyIHJvb21zLCBkZWNpZGUgd2hldGhlciB0byBwbGFjZSBhIG1vbnN0ZXIgaW4gZWFjaCByb29tXHJcbiAgICBjb25zdCBlbmNvdW50ZXJDaGFuY2UgPSAuMzVcclxuICAgIGNvbnN0IHNlY29uZEVuY291bnRlckNoYW5jZSA9IC4yXHJcbiAgICBjb25zdCB0aGlyZEVuY291bnRlckNoYW5jZSA9IC4xXHJcblxyXG4gICAgZm9yIChjb25zdCByb29tIG9mIHJvb21zKSB7XHJcbiAgICAgICAgaWYgKHJvb20uZGVwdGggPD0gMCkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFyYW5kLmNoYW5jZShybmcsIGVuY291bnRlckNoYW5jZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeVBsYWNlTW9uc3RlcihybmcsIGNlbGxzLCByb29tLCBtYXApXHJcblxyXG4gICAgICAgIGlmICghcmFuZC5jaGFuY2Uocm5nLCBzZWNvbmRFbmNvdW50ZXJDaGFuY2UpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cnlQbGFjZU1vbnN0ZXIocm5nLCBjZWxscywgcm9vbSwgbWFwKVxyXG5cclxuICAgICAgICBpZiAoIXJhbmQuY2hhbmNlKHJuZywgdGhpcmRFbmNvdW50ZXJDaGFuY2UpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cnlQbGFjZU1vbnN0ZXIocm5nLCBjZWxscywgcm9vbSwgbWFwKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0cnlQbGFjZU1vbnN0ZXIocm5nOiByYW5kLlJORywgY2VsbHM6IENlbGxHcmlkLCByb29tOiBSb29tLCBtYXA6IG1hcHMuTWFwKTogYm9vbGVhbiB7XHJcbiAgICAvLyBhdHRlbXB0IHRvIHBsYWNlIG1vbnN0ZXJcclxuICAgIGZvciAoY29uc3QgW3QsIHB0XSBvZiB2aXNpdEludGVyaW9yKGNlbGxzLCByb29tLmludGVyaW9yUHQpKSB7XHJcbiAgICAgICAgaWYgKHQgIT09IENlbGxUeXBlLkludGVyaW9yKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXRlci5hbnkobWFwLCB0aCA9PiAodGgucG9zaXRpb24/LmVxdWFsKHB0KSA/PyBmYWxzZSkgJiYgIXRoLnRoaW5nLnBhc3NhYmxlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbW9uc3RlciA9IHJhbmQuY2hvb3NlKHJuZywgbW9uc3RlcnMpLmNsb25lKClcclxuICAgICAgICBtYXAubW9uc3RlcnMuc2V0KHB0LCBtb25zdGVyKVxyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZVRyZWFzdXJlcyhybmc6IHJhbmQuUk5HLCBjZWxsczogQ2VsbEdyaWQsIHJvb21zOiBSb29tW10sIG1hcDogbWFwcy5NYXApIHtcclxuICAgIC8vIGl0ZXJhdGUgb3ZlciByb29tcywgZGVjaWRlIHdoZXRoZXIgdG8gcGxhY2UgYSBtb25zdGVyIGluIGVhY2ggcm9vbVxyXG4gICAgY29uc3QgdHJlYXN1cmVDaGFuY2UgPSAuMlxyXG5cclxuICAgIGZvciAoY29uc3Qgcm9vbSBvZiByb29tcykge1xyXG4gICAgICAgIGlmIChyb29tLmRlcHRoIDw9IDApIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghcmFuZC5jaGFuY2Uocm5nLCB0cmVhc3VyZUNoYW5jZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeVBsYWNlVHJlYXN1cmUocm5nLCBjZWxscywgcm9vbSwgbWFwKVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gdHJ5UGxhY2VUcmVhc3VyZShybmc6IHJhbmQuUk5HLCBjZWxsczogQ2VsbEdyaWQsIHJvb206IFJvb20sIG1hcDogbWFwcy5NYXApOiBib29sZWFuIHtcclxuICAgIC8vIGF0dGVtcHQgdG8gcGxhY2UgdHJlYXN1cmVcclxuICAgIGZvciAoY29uc3QgW3QsIHB0XSBvZiB2aXNpdEludGVyaW9yKGNlbGxzLCByb29tLmludGVyaW9yUHQpKSB7XHJcbiAgICAgICAgaWYgKHQgIT09IENlbGxUeXBlLkludGVyaW9yKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXRlci5hbnkobWFwLCB0aCA9PiAodGgucG9zaXRpb24/LmVxdWFsKHB0KSA/PyBmYWxzZSkgJiYgIXRoLnRoaW5nLnBhc3NhYmxlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY2hlc3QgPSB0aGluZ3MuY2hlc3QuY2xvbmUoKVxyXG5cclxuICAgICAgICAvLyBjaG9vc2UgbG9vdFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSByYW5kLmNob29zZShybmcsIGxvb3QpXHJcbiAgICAgICAgY2hlc3QuaXRlbXMuYWRkKGl0ZW0pXHJcblxyXG4gICAgICAgIC8vIGV4dHJhIGxvb3RcclxuICAgICAgICBsZXQgZXh0cmFMb290Q2hhbmNlID0gLjVcclxuICAgICAgICB3aGlsZSAocmFuZC5jaGFuY2Uocm5nLCBleHRyYUxvb3RDaGFuY2UpKSB7XHJcbiAgICAgICAgICAgIGV4dHJhTG9vdENoYW5jZSAqPSAuNVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gcmFuZC5jaG9vc2Uocm5nLCBsb290KVxyXG4gICAgICAgICAgICBjaGVzdC5pdGVtcy5hZGQoaXRlbSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1hcC5jb250YWluZXJzLnNldChwdCwgY2hlc3QpXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2VcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVDZWxsR3JpZChybmc6IHJhbmQuUk5HLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFtDZWxsR3JpZCwgUm9vbVtdXSB7XHJcbiAgICBjb25zdCBjZWxscyA9IGdyaWQuZ2VuZXJhdGUod2lkdGgsIGhlaWdodCwgKCkgPT4gQ2VsbFR5cGUuRXh0ZXJpb3IpXHJcblxyXG4gICAgLy8gZ2VuZXJhdGUgcm9vbSB0ZW1wbGF0ZXNcclxuICAgIGNvbnN0IHRlbXBsYXRlcyA9IGdlbmVyYXRlUm9vbVRlbXBsYXRlcygpXHJcbiAgICBjb25zdCBzdGFjazogUm9vbVtdID0gW11cclxuICAgIGNvbnN0IHJvb21zOiBSb29tW10gPSBbXVxyXG5cclxuICAgIC8vIHBsYWNlIGluaXRpYWwgcm9vbVxyXG4gICAge1xyXG4gICAgICAgIHJhbmQuc2h1ZmZsZShybmcsIHRlbXBsYXRlcylcclxuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRlbXBsYXRlc1swXVxyXG5cclxuICAgICAgICBjb25zdCBwdCA9IG5ldyBnZW8uUG9pbnQoXHJcbiAgICAgICAgICAgIHJhbmQuaW50KHJuZywgMCwgd2lkdGggLSB0ZW1wbGF0ZS5jZWxscy53aWR0aCArIDEpLFxyXG4gICAgICAgICAgICByYW5kLmludChybmcsIDAsIGhlaWdodCAtIHRlbXBsYXRlLmNlbGxzLmhlaWdodCArIDEpKVxyXG5cclxuICAgICAgICBjb25zdCByb29tID0gcGxhY2VUZW1wbGF0ZShybmcsIGNlbGxzLCB0ZW1wbGF0ZSwgcHQpXHJcbiAgICAgICAgc3RhY2sucHVzaChyb29tKVxyXG4gICAgICAgIHJvb21zLnB1c2gocm9vbSlcclxuICAgIH1cclxuXHJcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnN0IHJvb20gPSBhcnJheS5wb3Aoc3RhY2spXHJcbiAgICAgICAgY29uc3QgbmV4dFJvb20gPSB0cnlUdW5uZWxGcm9tKHJuZywgY2VsbHMsIHRlbXBsYXRlcywgcm9vbSlcclxuXHJcbiAgICAgICAgaWYgKG5leHRSb29tKSB7XHJcbiAgICAgICAgICAgIHN0YWNrLnB1c2gocm9vbSlcclxuICAgICAgICAgICAgc3RhY2sucHVzaChuZXh0Um9vbSlcclxuICAgICAgICAgICAgcm9vbXMucHVzaChuZXh0Um9vbSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFtjZWxscywgcm9vbXNdXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeVR1bm5lbEZyb20ocm5nOiByYW5kLlJORywgY2VsbHM6IENlbGxHcmlkLCB0ZW1wbGF0ZXM6IFJvb21UZW1wbGF0ZVtdLCByb29tOiBSb29tKTogUm9vbSB8IG51bGwge1xyXG4gICAgcmFuZC5zaHVmZmxlKHJuZywgdGVtcGxhdGVzKVxyXG5cclxuICAgIHdoaWxlIChyb29tLnR1bm5lbFB0cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc3QgdHB0ID0gYXJyYXkucG9wKHJvb20udHVubmVsUHRzKVxyXG4gICAgICAgIGZvciAoY29uc3QgdGVtcGxhdGUgb2YgdGVtcGxhdGVzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5leHRSb29tID0gdHJ5VHVubmVsVG8ocm5nLCBjZWxscywgdHB0LCB0ZW1wbGF0ZSlcclxuICAgICAgICAgICAgaWYgKG5leHRSb29tKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBwbGFjZSBkb29yIGF0IHR1bm5lbCBwb2ludFxyXG4gICAgICAgICAgICAgICAgcm9vbS50dW5uZWxQdHMgPSByb29tLnR1bm5lbFB0cy5maWx0ZXIocHQgPT4gIXB0LmVxdWFsKHRwdCkpXHJcbiAgICAgICAgICAgICAgICBjZWxscy5zZXRQb2ludCh0cHQsIENlbGxUeXBlLkRvb3IpXHJcbiAgICAgICAgICAgICAgICBuZXh0Um9vbS5kZXB0aCA9IHJvb20uZGVwdGggKyAxXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV4dFJvb21cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51bGxcclxufVxyXG5cclxuZnVuY3Rpb24gdHJ5VHVubmVsVG8ocm5nOiByYW5kLlJORywgY2VsbHM6IENlbGxHcmlkLCB0cHQxOiBnZW8uUG9pbnQsIHRlbXBsYXRlOiBSb29tVGVtcGxhdGUpOiBSb29tIHwgbnVsbCB7XHJcbiAgICAvLyBmaW5kIHR1bm5lbCBwb2ludHMgb2YgdGVtcGxhdGVcclxuICAgIGZvciAoY29uc3QgdHB0MiBvZiB0ZW1wbGF0ZS50dW5uZWxQdHMpIHtcclxuICAgICAgICBjb25zdCBvZmZzZXQgPSB0cHQxLnN1YlBvaW50KHRwdDIpXHJcbiAgICAgICAgaWYgKGlzVmFsaWRQbGFjZW1lbnQodGVtcGxhdGUuY2VsbHMsIGNlbGxzLCBvZmZzZXQpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwbGFjZVRlbXBsYXRlKHJuZywgY2VsbHMsIHRlbXBsYXRlLCBvZmZzZXQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlVGVtcGxhdGUocm5nOiByYW5kLlJORywgY2VsbHM6IENlbGxHcmlkLCB0ZW1wbGF0ZTogUm9vbVRlbXBsYXRlLCBvZmZzZXQ6IGdlby5Qb2ludCk6IFJvb20ge1xyXG4gICAgZ3JpZC5jb3B5KHRlbXBsYXRlLmNlbGxzLCBjZWxscywgb2Zmc2V0LngsIG9mZnNldC55KVxyXG5cclxuICAgIC8vIGZpbmQgdHVubmVsYWJsZSBwb2ludHNcclxuICAgIGNvbnN0IGludGVyaW9yUHQgPSB0ZW1wbGF0ZS5pbnRlcmlvclB0LmFkZFBvaW50KG9mZnNldClcclxuICAgIGNvbnN0IHR1bm5lbFB0cyA9IHRlbXBsYXRlLnR1bm5lbFB0cy5tYXAocHQgPT4gcHQuYWRkUG9pbnQob2Zmc2V0KSkuZmlsdGVyKHB0ID0+IGZpbmRFeHRlcmlvck5laWdoYm9yKGNlbGxzLCBwdCkgIT09IG51bGwpXHJcbiAgICByYW5kLnNodWZmbGUocm5nLCB0dW5uZWxQdHMpXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBpbnRlcmlvclB0LFxyXG4gICAgICAgIHR1bm5lbFB0cyxcclxuICAgICAgICBkZXB0aDogMFxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVJvb21UZW1wbGF0ZXMoKTogUm9vbVRlbXBsYXRlW10ge1xyXG4gICAgY29uc3QgbGVuZ3RocyA9IFs1LCA3LCA5LCAxMSwgMTMsIDE1XVxyXG4gICAgY29uc3QgcGFpcnMgPSBsZW5ndGhzLm1hcCh4ID0+IGxlbmd0aHMubWFwKHkgPT4gW3gsIHldKSkuZmxhdCgpLmZpbHRlcihhID0+IGFbMF0gPiAzIHx8IGFbMV0gPiAzKVxyXG4gICAgY29uc3QgdGVtcGxhdGVzID0gcGFpcnMubWFwKGEgPT4gZ2VuZXJhdGVSb29tVGVtcGxhdGUoYVswXSwgYVsxXSkpXHJcbiAgICByZXR1cm4gdGVtcGxhdGVzXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlUm9vbVRlbXBsYXRlKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogUm9vbVRlbXBsYXRlIHtcclxuICAgIGNvbnN0IGludGVyaW9yUHQgPSBuZXcgZ2VvLlBvaW50KHdpZHRoIC8gMiwgaGVpZ2h0IC8gMikuZmxvb3IoKVxyXG4gICAgY29uc3QgY2VsbHMgPSBncmlkLmdlbmVyYXRlKFxyXG4gICAgICAgIHdpZHRoLFxyXG4gICAgICAgIGhlaWdodCxcclxuICAgICAgICAoeCwgeSkgPT4geCA9PT0gMCB8fCB4ID09PSB3aWR0aCAtIDEgfHwgeSA9PT0gMCB8fCB5ID09PSBoZWlnaHQgLSAxID8gQ2VsbFR5cGUuV2FsbCA6IENlbGxUeXBlLkludGVyaW9yKVxyXG5cclxuICAgIGNvbnN0IHR1bm5lbFB0czogZ2VvLlBvaW50W10gPSBbXVxyXG4gICAgdHVubmVsUHRzLnB1c2goLi4uZ3JpZC5zY2FuKDEsIDAsIHdpZHRoIC0gMiwgMSkpXHJcbiAgICB0dW5uZWxQdHMucHVzaCguLi5ncmlkLnNjYW4oMCwgMSwgMSwgaGVpZ2h0IC0gMikpXHJcbiAgICB0dW5uZWxQdHMucHVzaCguLi5ncmlkLnNjYW4oMSwgaGVpZ2h0IC0gMSwgd2lkdGggLSAyLCAxKSlcclxuICAgIHR1bm5lbFB0cy5wdXNoKC4uLmdyaWQuc2Nhbih3aWR0aCAtIDEsIDEsIDEsIGhlaWdodCAtIDIpKVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgaW50ZXJpb3JQdCxcclxuICAgICAgICBjZWxscyxcclxuICAgICAgICB0dW5uZWxQdHNcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZmluZEV4dGVyaW9yTmVpZ2hib3IoY2VsbHM6IENlbGxHcmlkLCBwdDogZ2VvLlBvaW50KTogZ2VvLlBvaW50IHwgbnVsbCB7XHJcbiAgICBmb3IgKGNvbnN0IFt0LCBucHRdIG9mIGdyaWQudmlzaXROZWlnaGJvcnMoY2VsbHMsIHB0KSkge1xyXG4gICAgICAgIGlmICh0ID09PSBDZWxsVHlwZS5FeHRlcmlvcikge1xyXG4gICAgICAgICAgICByZXR1cm4gbnB0XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHZpc2l0SW50ZXJpb3JDb29yZHMoY2VsbHM6IENlbGxHcmlkLCBwdDA6IGdlby5Qb2ludCk6IEl0ZXJhYmxlPGdlby5Qb2ludD4ge1xyXG4gICAgcmV0dXJuIGl0ZXIubWFwKHZpc2l0SW50ZXJpb3IoY2VsbHMsIHB0MCksIHggPT4geFsxXSlcclxufVxyXG5cclxuZnVuY3Rpb24qIHZpc2l0SW50ZXJpb3IoY2VsbHM6IENlbGxHcmlkLCBwdDA6IGdlby5Qb2ludCk6IEl0ZXJhYmxlPFtDZWxsVHlwZSwgZ2VvLlBvaW50XT4ge1xyXG4gICAgY29uc3QgZXhwbG9yZWQgPSBjZWxscy5tYXAyKCgpID0+IGZhbHNlKVxyXG4gICAgY29uc3Qgc3RhY2sgPSBbcHQwXVxyXG5cclxuICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc3QgcHQgPSBhcnJheS5wb3Aoc3RhY2spXHJcbiAgICAgICAgZXhwbG9yZWQuc2V0UG9pbnQocHQsIHRydWUpXHJcbiAgICAgICAgY29uc3QgdCA9IGNlbGxzLmF0UG9pbnQocHQpXHJcbiAgICAgICAgeWllbGQgW3QsIHB0XVxyXG5cclxuICAgICAgICAvLyBpZiB0aGlzIGlzIGEgd2FsbCwgZG8gbm90IGV4cGxvcmUgbmVpZ2hib3JzXHJcbiAgICAgICAgaWYgKHQgPT09IENlbGxUeXBlLldhbGwpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIG90aGVyd2lzZSwgZXhwbG9yZSBuZWlnaGJvcnMsIHB1c2hpbmcgb250byBzdGFjayB0aG9zZSB0aGF0IGFyZSB1bmV4cGxvcmVkXHJcbiAgICAgICAgZm9yIChjb25zdCBbdCwgbnB0XSBvZiBncmlkLnZpc2l0TmVpZ2hib3JzKGNlbGxzLCBwdCkpIHtcclxuICAgICAgICAgICAgaWYgKGV4cGxvcmVkLmF0UG9pbnQobnB0KSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHQgIT09IENlbGxUeXBlLkludGVyaW9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBzdGFjay5wdXNoKG5wdClcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmFsaWRQbGFjZW1lbnQoc3JjOiBDZWxsR3JpZCwgZHN0OiBDZWxsR3JpZCwgb2Zmc2V0OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgIGlmICghZHN0LnJlZ2lvbkluQm91bmRzKG9mZnNldC54LCBvZmZzZXQueSwgc3JjLndpZHRoLCBzcmMuaGVpZ2h0KSkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgW3N0LCB4LCB5XSBvZiBzcmMuc2NhbigpKSB7XHJcbiAgICAgICAgLy8gcnVsZXM6XHJcbiAgICAgICAgLy8gY2FuIHBsYWNlIHdhbGwgb3ZlciB3YWxsXHJcbiAgICAgICAgLy8gY2FuIHBsYWNlIGFueXRoaW5nIG92ZXIgZXh0ZXJpb3JcclxuICAgICAgICBjb25zdCBkdCA9IGRzdC5hdCh4ICsgb2Zmc2V0LngsIHkgKyBvZmZzZXQueSlcclxuICAgICAgICBpZiAoZHQgPT09IENlbGxUeXBlLkV4dGVyaW9yKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZHQgPT09IENlbGxUeXBlLldhbGwgJiYgc3QgPT09IENlbGxUeXBlLldhbGwpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlXHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5lcmF0ZU91dGRvb3JNYXAocGxheWVyOiBybC5QbGF5ZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogUHJvbWlzZTxtYXBzLk1hcD4ge1xyXG4gICAgY29uc3QgbWFwID0gbmV3IG1hcHMuTWFwKHdpZHRoLCBoZWlnaHQsIDAsIHsgcG9zaXRpb246IG5ldyBnZW8uUG9pbnQoMCwgMCksIHRoaW5nOiBwbGF5ZXIgfSlcclxuICAgIG1hcC5saWdodGluZyA9IG1hcHMuTGlnaHRpbmcuQW1iaWVudFxyXG4gICAgZ2VuZXJhdGVPdXRkb29yVGVycmFpbihtYXApXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmVudW0gT3V0ZG9vclRpbGVUeXBlIHtcclxuICAgIHdhdGVyLFxyXG4gICAgZ3Jhc3MsXHJcbiAgICBkaXJ0LFxyXG4gICAgc2FuZFxyXG59XHJcblxyXG5lbnVtIE91dGRvb3JGaXh0dXJlVHlwZSB7XHJcbiAgICBub25lLFxyXG4gICAgaGlsbHMsXHJcbiAgICBtb3VudGFpbnMsXHJcbiAgICB0cmVlcyxcclxuICAgIHNub3dcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVPdXRkb29yVGVycmFpbihtYXA6IG1hcHMuTWFwKSB7XHJcbiAgICBjb25zdCB0aWxlcyA9IGdyaWQuZ2VuZXJhdGUobWFwLndpZHRoLCBtYXAuaGVpZ2h0LCAoKSA9PiBPdXRkb29yVGlsZVR5cGUud2F0ZXIpXHJcbiAgICBjb25zdCBmaXh0dXJlcyA9IGdyaWQuZ2VuZXJhdGUobWFwLndpZHRoLCBtYXAuaGVpZ2h0LCAoKSA9PiBPdXRkb29yRml4dHVyZVR5cGUubm9uZSlcclxuXHJcbiAgICAvLyBUT0RPIC0gcmFuZG9tbHkgYmlhcyBwZXJsaW4gbm9pc2UgaW5zdGVhZFxyXG4gICAgLy8gY29uc3QgYmlhcz0gcmFuZC5pbnQoMCwgMjU2KVxyXG4gICAgY29uc3QgYmlhcyA9IDBcclxuXHJcbiAgICBjb25zdCBoZWlnaHRNYXAgPSBmYm0obWFwLndpZHRoLCBtYXAuaGVpZ2h0LCBiaWFzLCA4IC8gbWFwLndpZHRoLCAyLCAuNSwgOClcclxuXHJcbiAgICBpbWFnaW5nLnNjYW4obWFwLndpZHRoLCBtYXAuaGVpZ2h0LCAoeCwgeSwgb2Zmc2V0KSA9PiB7XHJcbiAgICAgICAgY29uc3QgaCA9IGhlaWdodE1hcFtvZmZzZXRdXHJcbiAgICAgICAgaWYgKGggPiAwKSB7XHJcbiAgICAgICAgICAgIHRpbGVzLnNldCh4LCB5LCBPdXRkb29yVGlsZVR5cGUuZGlydClcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG5cclxuICAgIG1hcC5wbGF5ZXIucG9zaXRpb24gPSB0aWxlcy5maW5kUG9pbnQodCA9PiB0ICE9PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpID8/IG5ldyBnZW8uUG9pbnQoMCwgMClcclxuXHJcbiAgICBmb3IgKGNvbnN0IFt0LCB4LCB5XSBvZiB0aWxlcy5zY2FuKCkpIHtcclxuICAgICAgICBzd2l0Y2ggKHQpIHtcclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vclRpbGVUeXBlLndhdGVyKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRoaW5ncy53YXRlci5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuc2V0KG5ldyBnZW8uUG9pbnQoeCwgeSksIHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yVGlsZVR5cGUuZGlydCk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aGluZ3MuZGlydC5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuc2V0KG5ldyBnZW8uUG9pbnQoeCwgeSksIHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yVGlsZVR5cGUuZ3Jhc3MpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gdGhpbmdzLmdyYXNzLmNsb25lKClcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5zZXQobmV3IGdlby5Qb2ludCh4LCB5KSwgdGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JUaWxlVHlwZS5zYW5kKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRoaW5ncy5zYW5kLmNsb25lKClcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5zZXQobmV3IGdlby5Qb2ludCh4LCB5KSwgdGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCBbZiwgeCwgeV0gb2YgZml4dHVyZXMuc2NhbigpKSB7XHJcbiAgICAgICAgc3dpdGNoIChmKSB7XHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JGaXh0dXJlVHlwZS5oaWxscyk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeHR1cmUgPSB0aGluZ3MuaGlsbHMuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgbWFwLmZpeHR1cmVzLnNldChuZXcgZ2VvLlBvaW50KHgsIHkpLCBmaXh0dXJlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vckZpeHR1cmVUeXBlLm1vdW50YWlucyk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeHR1cmUgPSB0aGluZ3MubW91bnRhaW5zLmNsb25lKClcclxuICAgICAgICAgICAgICAgIG1hcC5maXh0dXJlcy5zZXQobmV3IGdlby5Qb2ludCh4LCB5KSwgZml4dHVyZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JGaXh0dXJlVHlwZS50cmVlcyk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeHR1cmUgPSB0aGluZ3MudHJlZXMuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgbWFwLmZpeHR1cmVzLnNldChuZXcgZ2VvLlBvaW50KHgsIHkpLCBmaXh0dXJlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vckZpeHR1cmVUeXBlLnNub3cpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaXh0dXJlID0gdGhpbmdzLnNub3cuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgbWFwLmZpeHR1cmVzLnNldChuZXcgZ2VvLlBvaW50KHgsIHkpLCBmaXh0dXJlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VMYW5kbWFzc2VzKHJuZzogcmFuZC5STkcsIHRpbGVzOiBncmlkLkdyaWQ8T3V0ZG9vclRpbGVUeXBlPikge1xyXG4gICAgY29uc3QgbWF4VGlsZXMgPSBNYXRoLmNlaWwodGlsZXMuc2l6ZSAqIHJhbmQuZmxvYXQocm5nLCAuMywgLjUpKVxyXG4gICAgZ3Jvd0xhbmQocm5nLCB0aWxlcywgbWF4VGlsZXMpXHJcblxyXG4gICAgLy8gZmluZCBtYXhpbWFsIHdhdGVyIHJlY3QgLSBpZiBsYXJnZSBlbm91Z2gsIHBsYW50IGlzbGFuZFxyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICBjb25zdCBhYWJiID0gZ3JpZC5maW5kTWF4aW1hbFJlY3QodGlsZXMsIHQgPT4gdCA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKS5zaHJpbmsoMSlcclxuICAgICAgICBpZiAoYWFiYi5hcmVhIDwgMTIpIHtcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHZpZXcgPSB0aWxlcy52aWV3QUFCQihhYWJiKVxyXG4gICAgICAgIGNvbnN0IGlzbGFuZFRpbGVzID0gYWFiYi5hcmVhICogcmFuZC5mbG9hdChybmcsIC4yNSwgMSlcclxuICAgICAgICBncm93TGFuZChybmcsIHZpZXcsIGlzbGFuZFRpbGVzKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIHBsYWNlIHNvbWUgaXNsYW5kc1xyXG4gICAgcGxhY2VCZWFjaGVzKHRpbGVzKVxyXG59XHJcblxyXG5mdW5jdGlvbiBncm93TGFuZChybmc6IHJhbmQuUk5HLCB0aWxlczogZ3JpZC5HcmlkPE91dGRvb3JUaWxlVHlwZT4sIG1heFRpbGVzOiBudW1iZXIpIHtcclxuICAgIC8vIFwicGxhbnRcIiBhIGNvbnRpbmVudFxyXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgQXJyYXk8Z2VvLlBvaW50PigpXHJcbiAgICBjb25zdCBzZWVkID0gbmV3IGdlby5Qb2ludCh0aWxlcy53aWR0aCAvIDIsIHRpbGVzLmhlaWdodCAvIDIpLmZsb29yKClcclxuICAgIHN0YWNrLnB1c2goc2VlZClcclxuICAgIGxldCBwbGFjZWQgPSAwXHJcblxyXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDAgJiYgcGxhY2VkIDwgbWF4VGlsZXMpIHtcclxuICAgICAgICBjb25zdCBwdCA9IGFycmF5LnBvcChzdGFjaylcclxuICAgICAgICB0aWxlcy5zZXRQb2ludChwdCwgT3V0ZG9vclRpbGVUeXBlLmdyYXNzKVxyXG4gICAgICAgICsrcGxhY2VkXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgW3QsIHh5XSBvZiBncmlkLnZpc2l0TmVpZ2hib3JzKHRpbGVzLCBwdCkpIHtcclxuICAgICAgICAgICAgaWYgKHQgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh4eSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmFuZC5zaHVmZmxlKHJuZywgc3RhY2spXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlQmVhY2hlcyh0aWxlczogZ3JpZC5HcmlkPE91dGRvb3JUaWxlVHlwZT4pIHtcclxuICAgIGZvciAoY29uc3QgcHQgb2YgZ3JpZC5zY2FuKDAsIDAsIHRpbGVzLndpZHRoLCB0aWxlcy5oZWlnaHQpKSB7XHJcbiAgICAgICAgaWYgKHRpbGVzLmF0UG9pbnQocHQpID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwdC54ID4gMCAmJiB0aWxlcy5hdChwdC54IC0gMSwgcHQueSkgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICB0aWxlcy5zZXRQb2ludChwdCwgT3V0ZG9vclRpbGVUeXBlLnNhbmQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocHQueCA8IHRpbGVzLndpZHRoIC0gMSAmJiB0aWxlcy5hdChwdC54ICsgMSwgcHQueSkgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICB0aWxlcy5zZXRQb2ludChwdCwgT3V0ZG9vclRpbGVUeXBlLnNhbmQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocHQueSA+IDAgJiYgdGlsZXMuYXQocHQueCwgcHQueSAtIDEpID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgdGlsZXMuc2V0UG9pbnQocHQsIE91dGRvb3JUaWxlVHlwZS5zYW5kKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHB0LnkgPCB0aWxlcy5oZWlnaHQgLSAxICYmIHRpbGVzLmF0KHB0LngsIHB0LnkgKyAxKSA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgIHRpbGVzLnNldFBvaW50KHB0LCBPdXRkb29yVGlsZVR5cGUuc2FuZClcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlU25vdyh0aWxlczogZ3JpZC5HcmlkPE91dGRvb3JUaWxlVHlwZT4sIGZpeHR1cmVzOiBncmlkLkdyaWQ8T3V0ZG9vckZpeHR1cmVUeXBlPikge1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSB0aWxlc1xyXG4gICAgY29uc3Qgc25vd0hlaWdodCA9IE1hdGguY2VpbChoZWlnaHQgLyAzKVxyXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBzbm93SGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyArK3gpIHtcclxuICAgICAgICAgICAgY29uc3QgdCA9IHRpbGVzLmF0KHgsIHkpXHJcbiAgICAgICAgICAgIGlmICh0ICE9PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgICAgIGZpeHR1cmVzLnNldCh4LCB5LCBPdXRkb29yRml4dHVyZVR5cGUuc25vdylcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VNb3VudGFpbnMocm5nOiByYW5kLlJORywgdGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+LCBmaXh0dXJlczogZ3JpZC5HcmlkPE91dGRvb3JGaXh0dXJlVHlwZT4sIG1heFRpbGVzOiBudW1iZXIpIHtcclxuICAgIC8vIGZpbmQgYSBzdWl0YWJsZSBzdGFydCBwb2ludCBmb3IgbW91bnRhaW4gcmFuZ2VcclxuICAgIGNvbnN0IHNlZWQgPSByYW5kLmNob29zZShybmcsIFsuLi50aWxlcy5maW5kUG9pbnRzKHggPT4geCAhPT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyICYmIHggIT09IE91dGRvb3JUaWxlVHlwZS5zYW5kKV0pXHJcbiAgICBjb25zdCBzdGFjayA9IG5ldyBBcnJheTxnZW8uUG9pbnQ+KClcclxuICAgIHN0YWNrLnB1c2goc2VlZClcclxuICAgIGxldCBwbGFjZWQgPSAwXHJcblxyXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDAgJiYgcGxhY2VkIDwgbWF4VGlsZXMpIHtcclxuICAgICAgICBjb25zdCBwdCA9IGFycmF5LnBvcChzdGFjaylcclxuICAgICAgICBmaXh0dXJlcy5zZXRQb2ludChwdCwgT3V0ZG9vckZpeHR1cmVUeXBlLm1vdW50YWlucylcclxuICAgICAgICArK3BsYWNlZFxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IFt0LCB4eV0gb2YgZ3JpZC52aXNpdE5laWdoYm9ycyh0aWxlcywgcHQpKSB7XHJcbiAgICAgICAgICAgIGlmICh0ICE9PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIgJiYgdCAhPT0gT3V0ZG9vclRpbGVUeXBlLnNhbmQpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeHkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJhbmQuc2h1ZmZsZShybmcsIHN0YWNrKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmYm0od2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIGJpYXM6IG51bWJlciwgZnJlcTogbnVtYmVyLCBsYWN1bmFyaXR5OiBudW1iZXIsIGdhaW46IG51bWJlciwgb2N0YXZlczogbnVtYmVyKTogbnVtYmVyW10ge1xyXG4gICAgcmV0dXJuIGltYWdpbmcuZ2VuZXJhdGUod2lkdGgsIGhlaWdodCwgKHgsIHkpID0+IHtcclxuICAgICAgICByZXR1cm4gbm9pc2UuZmJtUGVybGluMih4ICogZnJlcSArIGJpYXMsIHkgKiBmcmVxICsgYmlhcywgbGFjdW5hcml0eSwgZ2Fpbiwgb2N0YXZlcylcclxuICAgIH0pXHJcbn0iXX0=