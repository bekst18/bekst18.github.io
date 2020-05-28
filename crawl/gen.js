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
import * as dom from "../shared/dom.js";
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
    things.rat.clone()
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
export async function generateDungeonLevel(renderer, player, width, height) {
    const map = generateMapRooms(width, height, player);
    map.lighting = maps.Lighting.None;
    await loadSpriteTextures(renderer, map);
    return map;
}
function generateMapRooms(width, height, player) {
    const map = new maps.Map(width, height, player);
    const minRooms = 4;
    const [cells, rooms] = (() => {
        while (true) {
            const [cells, rooms] = generateCellGrid(width, height);
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
    stairsUp.position = stairsUpPosition.clone();
    map.fixtures.add(stairsUp);
    const lastRoom = rooms.reduce((x, y) => x.depth > y.depth ? x : y);
    const stairsDown = tileset.stairsDown.clone();
    const stairsDownPosition = iter.find(visitInteriorCoords(cells, lastRoom.interiorPt), pt => iter.any(grid.visitNeighbors(cells, pt), a => a[0] === CellType.Wall));
    if (!stairsDownPosition) {
        throw new Error("Failed to place stairs down");
    }
    stairsDown.position = stairsDownPosition.clone();
    map.fixtures.add(stairsDown);
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
                    tile.position = new geo.Point(x, y);
                    map.tiles.add(tile);
                }
                break;
            case CellType.Wall:
                {
                    const tile = tileset.wall.clone();
                    tile.position = new geo.Point(x, y);
                    map.tiles.add(tile);
                }
                break;
            case CellType.Door:
                {
                    const fixture = tileset.door.clone();
                    fixture.position = new geo.Point(x, y);
                    map.fixtures.add(fixture);
                    const tile = tileset.floor.clone();
                    tile.position = new geo.Point(x, y);
                    map.tiles.add(tile);
                }
                break;
        }
    }
    placeMonsters(cells, rooms, map);
    placeTreasures(cells, rooms, map);
    return map;
}
function placeMonsters(cells, rooms, map) {
    // iterate over rooms, decide whether to place a monster in each room
    const encounterChance = .25;
    const secondEncounterChance = .2;
    const thirdEncounterChance = .1;
    for (const room of rooms) {
        if (!rand.chance(encounterChance)) {
            continue;
        }
        tryPlaceMonster(cells, room, map);
        if (!rand.chance(secondEncounterChance)) {
            continue;
        }
        tryPlaceMonster(cells, room, map);
        if (!rand.chance(thirdEncounterChance)) {
            continue;
        }
        tryPlaceMonster(cells, room, map);
    }
}
function tryPlaceMonster(cells, room, map) {
    // attempt to place monster
    for (const [t, pt] of visitInterior(cells, room.interiorPt)) {
        if (t !== CellType.Interior) {
            continue;
        }
        if (iter.any(map, th => { var _a, _b; return ((_b = (_a = th.position) === null || _a === void 0 ? void 0 : _a.equal(pt)) !== null && _b !== void 0 ? _b : false) && !th.passable; })) {
            continue;
        }
        const monster = (rand.choose(monsters)).clone();
        monster.position = pt.clone();
        map.monsters.add(monster);
        return true;
    }
    return false;
}
function placeTreasures(cells, rooms, map) {
    // iterate over rooms, decide whether to place a monster in each room
    const treasureChance = .2;
    for (const room of rooms) {
        if (!rand.chance(treasureChance)) {
            continue;
        }
        tryPlaceTreasure(cells, room, map);
    }
}
function tryPlaceTreasure(cells, room, map) {
    // attempt to place treasure
    for (const [t, pt] of visitInterior(cells, room.interiorPt)) {
        if (t !== CellType.Interior) {
            continue;
        }
        if (iter.any(map, th => { var _a, _b; return ((_b = (_a = th.position) === null || _a === void 0 ? void 0 : _a.equal(pt)) !== null && _b !== void 0 ? _b : false) && !th.passable; })) {
            continue;
        }
        const chest = things.chest.clone();
        chest.position = pt.clone();
        // choose loot
        const item = rand.choose(loot);
        chest.items.add(item);
        // extra loot
        let extraLootChance = .5;
        while (rand.chance(extraLootChance)) {
            extraLootChance *= .5;
            const item = rand.choose(loot);
            chest.items.add(item);
        }
        map.containers.add(chest);
        return true;
    }
    return false;
}
function generateCellGrid(width, height) {
    const cells = grid.generate(width, height, () => CellType.Exterior);
    // generate room templates
    const templates = generateRoomTemplates();
    const stack = [];
    const rooms = [];
    // place initial room
    {
        rand.shuffle(templates);
        const template = templates[0];
        const pt = new geo.Point(rand.int(0, width - template.cells.width + 1), rand.int(0, height - template.cells.height + 1));
        const room = placeTemplate(cells, template, pt);
        stack.push(room);
        rooms.push(room);
    }
    while (stack.length > 0) {
        const room = array.pop(stack);
        const nextRoom = tryTunnelFrom(cells, templates, room);
        if (nextRoom) {
            stack.push(room);
            stack.push(nextRoom);
            rooms.push(nextRoom);
        }
    }
    return [cells, rooms];
}
function tryTunnelFrom(cells, templates, room) {
    rand.shuffle(templates);
    while (room.tunnelPts.length > 0) {
        const tpt = array.pop(room.tunnelPts);
        for (const template of templates) {
            const nextRoom = tryTunnelTo(cells, tpt, template);
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
function tryTunnelTo(cells, tpt1, template) {
    // find tunnel points of template
    for (const tpt2 of template.tunnelPts) {
        const offset = tpt1.subPoint(tpt2);
        if (isValidPlacement(template.cells, cells, offset)) {
            return placeTemplate(cells, template, offset);
        }
    }
    return null;
}
function placeTemplate(cells, template, offset) {
    grid.copy(template.cells, cells, offset.x, offset.y);
    // find tunnelable points
    const interiorPt = template.interiorPt.addPoint(offset);
    const tunnelPts = template.tunnelPts.map(pt => pt.addPoint(offset)).filter(pt => findExteriorNeighbor(cells, pt) !== null);
    rand.shuffle(tunnelPts);
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
export async function generateOutdoorMap(renderer, player, width, height) {
    const map = new maps.Map(width, height, player);
    map.lighting = maps.Lighting.Ambient;
    player.position = new geo.Point(0, 0);
    generateOutdoorTerrain(map);
    await loadSpriteTextures(renderer, map);
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
                    tile.position = new geo.Point(x, y);
                    map.tiles.add(tile);
                }
                break;
            case (OutdoorTileType.dirt):
                {
                    const tile = things.dirt.clone();
                    tile.position = new geo.Point(x, y);
                    map.tiles.add(tile);
                }
                break;
            case (OutdoorTileType.grass):
                {
                    const tile = things.grass.clone();
                    tile.position = new geo.Point(x, y);
                    map.tiles.add(tile);
                }
                break;
            case (OutdoorTileType.sand):
                {
                    const tile = things.sand.clone();
                    tile.position = new geo.Point(x, y);
                    map.tiles.add(tile);
                }
                break;
        }
    }
    for (const [f, x, y] of fixtures.scan()) {
        switch (f) {
            case (OutdoorFixtureType.hills):
                {
                    const fixture = things.hills.clone();
                    fixture.position = new geo.Point(x, y);
                    map.fixtures.add(fixture);
                }
                break;
            case (OutdoorFixtureType.mountains):
                {
                    const fixture = things.mountains.clone();
                    fixture.position = new geo.Point(x, y);
                    map.fixtures.add(fixture);
                }
                break;
            case (OutdoorFixtureType.trees):
                {
                    const fixture = things.trees.clone();
                    fixture.position = new geo.Point(x, y);
                    map.fixtures.add(fixture);
                }
                break;
            case (OutdoorFixtureType.snow):
                {
                    const fixture = things.snow.clone();
                    fixture.position = new geo.Point(x, y);
                    map.fixtures.add(fixture);
                }
                break;
        }
    }
}
function placeLandmasses(tiles) {
    const maxTiles = Math.ceil(tiles.size * rand.float(.3, .5));
    growLand(tiles, maxTiles);
    // find maximal water rect - if large enough, plant island
    while (true) {
        const aabb = grid.findMaximalRect(tiles, t => t === OutdoorTileType.water).shrink(1);
        if (aabb.area < 12) {
            break;
        }
        const view = tiles.viewAABB(aabb);
        const islandTiles = aabb.area * rand.float(.25, 1);
        growLand(view, islandTiles);
    }
    // place some islands
    placeBeaches(tiles);
}
function growLand(tiles, maxTiles) {
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
        rand.shuffle(stack);
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
function placeMountains(tiles, fixtures, maxTiles) {
    // find a suitable start point for mountain range
    const seed = rand.choose([...tiles.findPoints(x => x !== OutdoorTileType.water && x !== OutdoorTileType.sand)]);
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
        rand.shuffle(stack);
    }
}
export async function loadSpriteTextures(renderer, map) {
    // bake all 24x24 tile images to a single array texture
    // store mapping from image url to index
    const imageUrls = iter.wrap(map).map(th => th.image).filter().distinct().toArray();
    const layerMap = new Map(imageUrls.map((url, i) => [url, i]));
    const images = await Promise.all(imageUrls.map(url => dom.loadImage(url)));
    const texture = renderer.bakeTextureArray(rl.tileSize, rl.tileSize, images);
    for (const th of map) {
        if (!th.image) {
            th.textureLayer = -1;
            th.texture = null;
            continue;
        }
        const layer = layerMap.get(th.image);
        if (layer === undefined) {
            throw new Error(`texture index not found for ${th.image}`);
        }
        th.texture = texture;
        th.textureLayer = layer;
    }
}
function fbm(width, height, bias, freq, lacunarity, gain, octaves) {
    return imaging.generate(width, height, (x, y) => {
        return noise.fbmPerlin2(x * freq + bias, y * freq + bias, lacunarity, gain, octaves);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0gsT0FBTyxLQUFLLEVBQUUsTUFBTSxTQUFTLENBQUE7QUFDN0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBRWpDLE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssT0FBTyxNQUFNLHNCQUFzQixDQUFBO0FBVS9DLE1BQU0sT0FBTyxHQUFtQjtJQUM1QixJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUU7SUFDOUIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFO0lBQzNCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTtJQUN6QixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7SUFDakMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFO0NBQ3hDLENBQUE7QUFFRCxNQUFNLFFBQVEsR0FBRztJQUNiLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFO0lBQ2xCLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO0lBQ3ZCLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFF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QUMxQjtBQUNMLENBQUM7QUFFRCxTQUFTLEdBQUcsQ0FBQyxLQUFhLEVBQUUsTUFBYyxFQUFFLElBQVksRUFBRSxJQUFZLEVBQUUsVUFBa0IsRUFBRSxJQUFZLEVBQUUsT0FBZTtJQUNySCxPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM1QyxPQUFPLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUN4RixDQUFDLENBQUMsQ0FBQTtBQUNOLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogbWFwIGdlbmVyYXRpb24gbGlicmFyeVxyXG4gKi9cclxuaW1wb3J0ICogYXMgcmwgZnJvbSBcIi4vcmwuanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcbmltcG9ydCAqIGFzIGdyaWQgZnJvbSBcIi4uL3NoYXJlZC9ncmlkLmpzXCJcclxuaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiXHJcbmltcG9ydCAqIGFzIGl0ZXIgZnJvbSBcIi4uL3NoYXJlZC9pdGVyLmpzXCJcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIlxyXG5pbXBvcnQgKiBhcyB0aGluZ3MgZnJvbSBcIi4vdGhpbmdzLmpzXCJcclxuaW1wb3J0ICogYXMgbWFwcyBmcm9tIFwiLi9tYXBzLmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcbmltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIG5vaXNlIGZyb20gXCIuLi9zaGFyZWQvbm9pc2UuanNcIlxyXG5pbXBvcnQgKiBhcyBpbWFnaW5nIGZyb20gXCIuLi9zaGFyZWQvaW1hZ2luZy5qc1wiXHJcblxyXG5pbnRlcmZhY2UgRHVuZ2VvblRpbGVzZXQge1xyXG4gICAgd2FsbDogcmwuVGlsZSxcclxuICAgIGZsb29yOiBybC5UaWxlLFxyXG4gICAgZG9vcjogcmwuRG9vcixcclxuICAgIHN0YWlyc1VwOiBybC5TdGFpcnNVcFxyXG4gICAgc3RhaXJzRG93bjogcmwuU3RhaXJzRG93blxyXG59XHJcblxyXG5jb25zdCB0aWxlc2V0OiBEdW5nZW9uVGlsZXNldCA9IHtcclxuICAgIHdhbGw6IHRoaW5ncy5icmlja1dhbGwuY2xvbmUoKSxcclxuICAgIGZsb29yOiB0aGluZ3MuZmxvb3IuY2xvbmUoKSxcclxuICAgIGRvb3I6IHRoaW5ncy5kb29yLmNsb25lKCksXHJcbiAgICBzdGFpcnNVcDogdGhpbmdzLnN0YWlyc1VwLmNsb25lKCksXHJcbiAgICBzdGFpcnNEb3duOiB0aGluZ3Muc3RhaXJzRG93bi5jbG9uZSgpXHJcbn1cclxuXHJcbmNvbnN0IG1vbnN0ZXJzID0gW1xyXG4gICAgdGhpbmdzLmJhdC5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLnNrZWxldG9uLmNsb25lKCksXHJcbiAgICB0aGluZ3MuZ3JlZW5TbGltZS5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLnJlZFNsaW1lLmNsb25lKCksXHJcbiAgICB0aGluZ3Muc3BpZGVyLmNsb25lKCksXHJcbiAgICB0aGluZ3MucmF0LmNsb25lKClcclxuXVxyXG5cclxuY29uc3QgbG9vdCA9IFtcclxuICAgIHRoaW5ncy5jbG90aEFybW9yLmNsb25lKCksXHJcbiAgICB0aGluZ3Muc2hhcnBTdGljay5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLmRhZ2dlci5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLmxlYXRoZXJBcm1vci5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLndvb2RlbkJvdy5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLnNsaW5nU2hvdC5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLndlYWtIZWFsdGhQb3Rpb24uY2xvbmUoKSxcclxuICAgIHRoaW5ncy5oZWFsdGhQb3Rpb24uY2xvbmUoKVxyXG5dXHJcblxyXG5lbnVtIENlbGxUeXBlIHtcclxuICAgIEV4dGVyaW9yLFxyXG4gICAgSW50ZXJpb3IsXHJcbiAgICBXYWxsLFxyXG4gICAgRG9vclxyXG59XHJcblxyXG50eXBlIENlbGxHcmlkID0gZ3JpZC5HcmlkPENlbGxUeXBlPlxyXG5cclxuaW50ZXJmYWNlIFJvb21UZW1wbGF0ZSB7XHJcbiAgICBjZWxsczogQ2VsbEdyaWRcclxuICAgIGludGVyaW9yUHQ6IGdlby5Qb2ludFxyXG4gICAgdHVubmVsUHRzOiBnZW8uUG9pbnRbXVxyXG59XHJcblxyXG5pbnRlcmZhY2UgUm9vbSB7XHJcbiAgICBpbnRlcmlvclB0OiBnZW8uUG9pbnRcclxuICAgIHR1bm5lbFB0czogZ2VvLlBvaW50W11cclxuICAgIGRlcHRoOiBudW1iZXIsXHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5lcmF0ZUR1bmdlb25MZXZlbChyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBwbGF5ZXI6IHJsLlBsYXllciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBQcm9taXNlPG1hcHMuTWFwPiB7XHJcbiAgICBjb25zdCBtYXAgPSBnZW5lcmF0ZU1hcFJvb21zKHdpZHRoLCBoZWlnaHQsIHBsYXllcilcclxuICAgIG1hcC5saWdodGluZyA9IG1hcHMuTGlnaHRpbmcuTm9uZVxyXG4gICAgYXdhaXQgbG9hZFNwcml0ZVRleHR1cmVzKHJlbmRlcmVyLCBtYXApXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlTWFwUm9vbXMod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHBsYXllcjogcmwuUGxheWVyKTogbWFwcy5NYXAge1xyXG4gICAgY29uc3QgbWFwID0gbmV3IG1hcHMuTWFwKHdpZHRoLCBoZWlnaHQsIHBsYXllcilcclxuICAgIGNvbnN0IG1pblJvb21zID0gNFxyXG5cclxuICAgIGNvbnN0IFtjZWxscywgcm9vbXNdID0gKCgpID0+IHtcclxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICBjb25zdCBbY2VsbHMsIHJvb21zXSA9IGdlbmVyYXRlQ2VsbEdyaWQod2lkdGgsIGhlaWdodClcclxuICAgICAgICAgICAgaWYgKHJvb21zLmxlbmd0aCA+IG1pblJvb21zKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW2NlbGxzLCByb29tc11cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pKCkgYXMgW0NlbGxHcmlkLCBSb29tW11dXHJcblxyXG4gICAgY29uc3QgZmlyc3RSb29tID0gcm9vbXMucmVkdWNlKCh4LCB5KSA9PiB4LmRlcHRoIDwgeS5kZXB0aCA/IHggOiB5KVxyXG4gICAgbWFwLnBsYXllci5wb3NpdGlvbiA9IGZpcnN0Um9vbS5pbnRlcmlvclB0LmNsb25lKClcclxuXHJcbiAgICBjb25zdCBzdGFpcnNVcCA9IHRpbGVzZXQuc3RhaXJzVXAuY2xvbmUoKVxyXG4gICAgY29uc3Qgc3RhaXJzVXBQb3NpdGlvbiA9IGl0ZXIuZmluZCh2aXNpdEludGVyaW9yQ29vcmRzKGNlbGxzLCBmaXJzdFJvb20uaW50ZXJpb3JQdCksIHB0ID0+IGl0ZXIuYW55KGdyaWQudmlzaXROZWlnaGJvcnMoY2VsbHMsIHB0KSwgYSA9PiBhWzBdID09PSBDZWxsVHlwZS5XYWxsKSlcclxuICAgIGlmICghc3RhaXJzVXBQb3NpdGlvbikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBwbGFjZSBzdGFpcnMgdXBcIilcclxuICAgIH1cclxuICAgIHN0YWlyc1VwLnBvc2l0aW9uID0gc3RhaXJzVXBQb3NpdGlvbi5jbG9uZSgpXHJcbiAgICBtYXAuZml4dHVyZXMuYWRkKHN0YWlyc1VwKVxyXG5cclxuICAgIGNvbnN0IGxhc3RSb29tID0gcm9vbXMucmVkdWNlKCh4LCB5KSA9PiB4LmRlcHRoID4geS5kZXB0aCA/IHggOiB5KVxyXG4gICAgY29uc3Qgc3RhaXJzRG93biA9IHRpbGVzZXQuc3RhaXJzRG93bi5jbG9uZSgpXHJcbiAgICBjb25zdCBzdGFpcnNEb3duUG9zaXRpb24gPSBpdGVyLmZpbmQodmlzaXRJbnRlcmlvckNvb3JkcyhjZWxscywgbGFzdFJvb20uaW50ZXJpb3JQdCksIHB0ID0+IGl0ZXIuYW55KGdyaWQudmlzaXROZWlnaGJvcnMoY2VsbHMsIHB0KSwgYSA9PiBhWzBdID09PSBDZWxsVHlwZS5XYWxsKSlcclxuICAgIGlmICghc3RhaXJzRG93blBvc2l0aW9uKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIHBsYWNlIHN0YWlycyBkb3duXCIpXHJcbiAgICB9XHJcbiAgICBzdGFpcnNEb3duLnBvc2l0aW9uID0gc3RhaXJzRG93blBvc2l0aW9uLmNsb25lKClcclxuICAgIG1hcC5maXh0dXJlcy5hZGQoc3RhaXJzRG93bilcclxuXHJcbiAgICAvLyBnZW5lcmF0ZSB0aWxlcyBhbmQgZml4dHVyZXMgZnJvbSBjZWxsc1xyXG4gICAgZm9yIChjb25zdCBbdiwgeCwgeV0gb2YgY2VsbHMuc2NhbigpKSB7XHJcbiAgICAgICAgaWYgKHYgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN3aXRjaCAodikge1xyXG4gICAgICAgICAgICBjYXNlIENlbGxUeXBlLkV4dGVyaW9yOlxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ2VsbFR5cGUuSW50ZXJpb3I6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aWxlc2V0LmZsb29yLmNsb25lKClcclxuICAgICAgICAgICAgICAgIHRpbGUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuYWRkKHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIENlbGxUeXBlLldhbGw6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aWxlc2V0LndhbGwuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgdGlsZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5hZGQodGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ2VsbFR5cGUuRG9vcjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZml4dHVyZSA9IHRpbGVzZXQuZG9vci5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBmaXh0dXJlLnBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLmZpeHR1cmVzLmFkZChmaXh0dXJlKVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aWxlc2V0LmZsb29yLmNsb25lKClcclxuICAgICAgICAgICAgICAgIHRpbGUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuYWRkKHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHBsYWNlTW9uc3RlcnMoY2VsbHMsIHJvb21zLCBtYXApXHJcbiAgICBwbGFjZVRyZWFzdXJlcyhjZWxscywgcm9vbXMsIG1hcClcclxuXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlTW9uc3RlcnMoY2VsbHM6IENlbGxHcmlkLCByb29tczogUm9vbVtdLCBtYXA6IG1hcHMuTWFwKSB7XHJcbiAgICAvLyBpdGVyYXRlIG92ZXIgcm9vbXMsIGRlY2lkZSB3aGV0aGVyIHRvIHBsYWNlIGEgbW9uc3RlciBpbiBlYWNoIHJvb21cclxuICAgIGNvbnN0IGVuY291bnRlckNoYW5jZSA9IC4yNVxyXG4gICAgY29uc3Qgc2Vjb25kRW5jb3VudGVyQ2hhbmNlID0gLjJcclxuICAgIGNvbnN0IHRoaXJkRW5jb3VudGVyQ2hhbmNlID0gLjFcclxuXHJcbiAgICBmb3IgKGNvbnN0IHJvb20gb2Ygcm9vbXMpIHtcclxuICAgICAgICBpZiAoIXJhbmQuY2hhbmNlKGVuY291bnRlckNoYW5jZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeVBsYWNlTW9uc3RlcihjZWxscywgcm9vbSwgbWFwKVxyXG5cclxuICAgICAgICBpZiAoIXJhbmQuY2hhbmNlKHNlY29uZEVuY291bnRlckNoYW5jZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeVBsYWNlTW9uc3RlcihjZWxscywgcm9vbSwgbWFwKVxyXG5cclxuICAgICAgICBpZiAoIXJhbmQuY2hhbmNlKHRoaXJkRW5jb3VudGVyQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5UGxhY2VNb25zdGVyKGNlbGxzLCByb29tLCBtYXApXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeVBsYWNlTW9uc3RlcihjZWxsczogQ2VsbEdyaWQsIHJvb206IFJvb20sIG1hcDogbWFwcy5NYXApOiBib29sZWFuIHtcclxuICAgIC8vIGF0dGVtcHQgdG8gcGxhY2UgbW9uc3RlclxyXG4gICAgZm9yIChjb25zdCBbdCwgcHRdIG9mIHZpc2l0SW50ZXJpb3IoY2VsbHMsIHJvb20uaW50ZXJpb3JQdCkpIHtcclxuICAgICAgICBpZiAodCAhPT0gQ2VsbFR5cGUuSW50ZXJpb3IpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpdGVyLmFueShtYXAsIHRoID0+ICh0aC5wb3NpdGlvbj8uZXF1YWwocHQpID8/IGZhbHNlKSAmJiAhdGgucGFzc2FibGUpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtb25zdGVyID0gKHJhbmQuY2hvb3NlKG1vbnN0ZXJzKSkuY2xvbmUoKVxyXG4gICAgICAgIG1vbnN0ZXIucG9zaXRpb24gPSBwdC5jbG9uZSgpXHJcbiAgICAgICAgbWFwLm1vbnN0ZXJzLmFkZChtb25zdGVyKVxyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZVRyZWFzdXJlcyhjZWxsczogQ2VsbEdyaWQsIHJvb21zOiBSb29tW10sIG1hcDogbWFwcy5NYXApIHtcclxuICAgIC8vIGl0ZXJhdGUgb3ZlciByb29tcywgZGVjaWRlIHdoZXRoZXIgdG8gcGxhY2UgYSBtb25zdGVyIGluIGVhY2ggcm9vbVxyXG4gICAgY29uc3QgdHJlYXN1cmVDaGFuY2UgPSAuMlxyXG5cclxuICAgIGZvciAoY29uc3Qgcm9vbSBvZiByb29tcykge1xyXG4gICAgICAgIGlmICghcmFuZC5jaGFuY2UodHJlYXN1cmVDaGFuY2UpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cnlQbGFjZVRyZWFzdXJlKGNlbGxzLCByb29tLCBtYXApXHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiB0cnlQbGFjZVRyZWFzdXJlKGNlbGxzOiBDZWxsR3JpZCwgcm9vbTogUm9vbSwgbWFwOiBtYXBzLk1hcCk6IGJvb2xlYW4ge1xyXG4gICAgLy8gYXR0ZW1wdCB0byBwbGFjZSB0cmVhc3VyZVxyXG4gICAgZm9yIChjb25zdCBbdCwgcHRdIG9mIHZpc2l0SW50ZXJpb3IoY2VsbHMsIHJvb20uaW50ZXJpb3JQdCkpIHtcclxuICAgICAgICBpZiAodCAhPT0gQ2VsbFR5cGUuSW50ZXJpb3IpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpdGVyLmFueShtYXAsIHRoID0+ICh0aC5wb3NpdGlvbj8uZXF1YWwocHQpID8/IGZhbHNlKSAmJiAhdGgucGFzc2FibGUpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjaGVzdCA9IHRoaW5ncy5jaGVzdC5jbG9uZSgpXHJcbiAgICAgICAgY2hlc3QucG9zaXRpb24gPSBwdC5jbG9uZSgpXHJcblxyXG4gICAgICAgIC8vIGNob29zZSBsb290XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IHJhbmQuY2hvb3NlKGxvb3QpXHJcbiAgICAgICAgY2hlc3QuaXRlbXMuYWRkKGl0ZW0pXHJcblxyXG4gICAgICAgIC8vIGV4dHJhIGxvb3RcclxuICAgICAgICBsZXQgZXh0cmFMb290Q2hhbmNlID0gLjVcclxuICAgICAgICB3aGlsZSAocmFuZC5jaGFuY2UoZXh0cmFMb290Q2hhbmNlKSkge1xyXG4gICAgICAgICAgICBleHRyYUxvb3RDaGFuY2UgKj0gLjVcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHJhbmQuY2hvb3NlKGxvb3QpXHJcbiAgICAgICAgICAgIGNoZXN0Lml0ZW1zLmFkZChpdGVtKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWFwLmNvbnRhaW5lcnMuYWRkKGNoZXN0KVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlQ2VsbEdyaWQod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBbQ2VsbEdyaWQsIFJvb21bXV0ge1xyXG4gICAgY29uc3QgY2VsbHMgPSBncmlkLmdlbmVyYXRlKHdpZHRoLCBoZWlnaHQsICgpID0+IENlbGxUeXBlLkV4dGVyaW9yKVxyXG5cclxuICAgIC8vIGdlbmVyYXRlIHJvb20gdGVtcGxhdGVzXHJcbiAgICBjb25zdCB0ZW1wbGF0ZXMgPSBnZW5lcmF0ZVJvb21UZW1wbGF0ZXMoKVxyXG4gICAgY29uc3Qgc3RhY2s6IFJvb21bXSA9IFtdXHJcbiAgICBjb25zdCByb29tczogUm9vbVtdID0gW11cclxuXHJcbiAgICAvLyBwbGFjZSBpbml0aWFsIHJvb21cclxuICAgIHtcclxuICAgICAgICByYW5kLnNodWZmbGUodGVtcGxhdGVzKVxyXG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGVtcGxhdGVzWzBdXHJcblxyXG4gICAgICAgIGNvbnN0IHB0ID0gbmV3IGdlby5Qb2ludChcclxuICAgICAgICAgICAgcmFuZC5pbnQoMCwgd2lkdGggLSB0ZW1wbGF0ZS5jZWxscy53aWR0aCArIDEpLFxyXG4gICAgICAgICAgICByYW5kLmludCgwLCBoZWlnaHQgLSB0ZW1wbGF0ZS5jZWxscy5oZWlnaHQgKyAxKSlcclxuXHJcbiAgICAgICAgY29uc3Qgcm9vbSA9IHBsYWNlVGVtcGxhdGUoY2VsbHMsIHRlbXBsYXRlLCBwdClcclxuICAgICAgICBzdGFjay5wdXNoKHJvb20pXHJcbiAgICAgICAgcm9vbXMucHVzaChyb29tKVxyXG4gICAgfVxyXG5cclxuICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc3Qgcm9vbSA9IGFycmF5LnBvcChzdGFjaylcclxuICAgICAgICBjb25zdCBuZXh0Um9vbSA9IHRyeVR1bm5lbEZyb20oY2VsbHMsIHRlbXBsYXRlcywgcm9vbSlcclxuXHJcbiAgICAgICAgaWYgKG5leHRSb29tKSB7XHJcbiAgICAgICAgICAgIHN0YWNrLnB1c2gocm9vbSlcclxuICAgICAgICAgICAgc3RhY2sucHVzaChuZXh0Um9vbSlcclxuICAgICAgICAgICAgcm9vbXMucHVzaChuZXh0Um9vbSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFtjZWxscywgcm9vbXNdXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeVR1bm5lbEZyb20oY2VsbHM6IENlbGxHcmlkLCB0ZW1wbGF0ZXM6IFJvb21UZW1wbGF0ZVtdLCByb29tOiBSb29tKTogUm9vbSB8IG51bGwge1xyXG4gICAgcmFuZC5zaHVmZmxlKHRlbXBsYXRlcylcclxuXHJcbiAgICB3aGlsZSAocm9vbS50dW5uZWxQdHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnN0IHRwdCA9IGFycmF5LnBvcChyb29tLnR1bm5lbFB0cylcclxuICAgICAgICBmb3IgKGNvbnN0IHRlbXBsYXRlIG9mIHRlbXBsYXRlcykge1xyXG4gICAgICAgICAgICBjb25zdCBuZXh0Um9vbSA9IHRyeVR1bm5lbFRvKGNlbGxzLCB0cHQsIHRlbXBsYXRlKVxyXG4gICAgICAgICAgICBpZiAobmV4dFJvb20pIHtcclxuICAgICAgICAgICAgICAgIC8vIHBsYWNlIGRvb3IgYXQgdHVubmVsIHBvaW50XHJcbiAgICAgICAgICAgICAgICByb29tLnR1bm5lbFB0cyA9IHJvb20udHVubmVsUHRzLmZpbHRlcihwdCA9PiAhcHQuZXF1YWwodHB0KSlcclxuICAgICAgICAgICAgICAgIGNlbGxzLnNldFBvaW50KHRwdCwgQ2VsbFR5cGUuRG9vcilcclxuICAgICAgICAgICAgICAgIG5leHRSb29tLmRlcHRoID0gcm9vbS5kZXB0aCArIDFcclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXh0Um9vbVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVsbFxyXG59XHJcblxyXG5mdW5jdGlvbiB0cnlUdW5uZWxUbyhjZWxsczogQ2VsbEdyaWQsIHRwdDE6IGdlby5Qb2ludCwgdGVtcGxhdGU6IFJvb21UZW1wbGF0ZSk6IFJvb20gfCBudWxsIHtcclxuICAgIC8vIGZpbmQgdHVubmVsIHBvaW50cyBvZiB0ZW1wbGF0ZVxyXG4gICAgZm9yIChjb25zdCB0cHQyIG9mIHRlbXBsYXRlLnR1bm5lbFB0cykge1xyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHRwdDEuc3ViUG9pbnQodHB0MilcclxuICAgICAgICBpZiAoaXNWYWxpZFBsYWNlbWVudCh0ZW1wbGF0ZS5jZWxscywgY2VsbHMsIG9mZnNldCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHBsYWNlVGVtcGxhdGUoY2VsbHMsIHRlbXBsYXRlLCBvZmZzZXQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlVGVtcGxhdGUoY2VsbHM6IENlbGxHcmlkLCB0ZW1wbGF0ZTogUm9vbVRlbXBsYXRlLCBvZmZzZXQ6IGdlby5Qb2ludCk6IFJvb20ge1xyXG4gICAgZ3JpZC5jb3B5KHRlbXBsYXRlLmNlbGxzLCBjZWxscywgb2Zmc2V0LngsIG9mZnNldC55KVxyXG5cclxuICAgIC8vIGZpbmQgdHVubmVsYWJsZSBwb2ludHNcclxuICAgIGNvbnN0IGludGVyaW9yUHQgPSB0ZW1wbGF0ZS5pbnRlcmlvclB0LmFkZFBvaW50KG9mZnNldClcclxuICAgIGNvbnN0IHR1bm5lbFB0cyA9IHRlbXBsYXRlLnR1bm5lbFB0cy5tYXAocHQgPT4gcHQuYWRkUG9pbnQob2Zmc2V0KSkuZmlsdGVyKHB0ID0+IGZpbmRFeHRlcmlvck5laWdoYm9yKGNlbGxzLCBwdCkgIT09IG51bGwpXHJcbiAgICByYW5kLnNodWZmbGUodHVubmVsUHRzKVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgaW50ZXJpb3JQdCxcclxuICAgICAgICB0dW5uZWxQdHMsXHJcbiAgICAgICAgZGVwdGg6IDBcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVSb29tVGVtcGxhdGVzKCk6IFJvb21UZW1wbGF0ZVtdIHtcclxuICAgIGNvbnN0IGxlbmd0aHMgPSBbNSwgNywgOSwgMTEsIDEzLCAxNV1cclxuICAgIGNvbnN0IHBhaXJzID0gbGVuZ3Rocy5tYXAoeCA9PiBsZW5ndGhzLm1hcCh5ID0+IFt4LCB5XSkpLmZsYXQoKS5maWx0ZXIoYSA9PiBhWzBdID4gMyB8fCBhWzFdID4gMylcclxuICAgIGNvbnN0IHRlbXBsYXRlcyA9IHBhaXJzLm1hcChhID0+IGdlbmVyYXRlUm9vbVRlbXBsYXRlKGFbMF0sIGFbMV0pKVxyXG4gICAgcmV0dXJuIHRlbXBsYXRlc1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVJvb21UZW1wbGF0ZSh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFJvb21UZW1wbGF0ZSB7XHJcbiAgICBjb25zdCBpbnRlcmlvclB0ID0gbmV3IGdlby5Qb2ludCh3aWR0aCAvIDIsIGhlaWdodCAvIDIpLmZsb29yKClcclxuICAgIGNvbnN0IGNlbGxzID0gZ3JpZC5nZW5lcmF0ZShcclxuICAgICAgICB3aWR0aCxcclxuICAgICAgICBoZWlnaHQsXHJcbiAgICAgICAgKHgsIHkpID0+IHggPT09IDAgfHwgeCA9PT0gd2lkdGggLSAxIHx8IHkgPT09IDAgfHwgeSA9PT0gaGVpZ2h0IC0gMSA/IENlbGxUeXBlLldhbGwgOiBDZWxsVHlwZS5JbnRlcmlvcilcclxuXHJcbiAgICBjb25zdCB0dW5uZWxQdHM6IGdlby5Qb2ludFtdID0gW11cclxuICAgIHR1bm5lbFB0cy5wdXNoKC4uLmdyaWQuc2NhbigxLCAwLCB3aWR0aCAtIDIsIDEpKVxyXG4gICAgdHVubmVsUHRzLnB1c2goLi4uZ3JpZC5zY2FuKDAsIDEsIDEsIGhlaWdodCAtIDIpKVxyXG4gICAgdHVubmVsUHRzLnB1c2goLi4uZ3JpZC5zY2FuKDEsIGhlaWdodCAtIDEsIHdpZHRoIC0gMiwgMSkpXHJcbiAgICB0dW5uZWxQdHMucHVzaCguLi5ncmlkLnNjYW4od2lkdGggLSAxLCAxLCAxLCBoZWlnaHQgLSAyKSlcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGludGVyaW9yUHQsXHJcbiAgICAgICAgY2VsbHMsXHJcbiAgICAgICAgdHVubmVsUHRzXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbmRFeHRlcmlvck5laWdoYm9yKGNlbGxzOiBDZWxsR3JpZCwgcHQ6IGdlby5Qb2ludCk6IGdlby5Qb2ludCB8IG51bGwge1xyXG4gICAgZm9yIChjb25zdCBbdCwgbnB0XSBvZiBncmlkLnZpc2l0TmVpZ2hib3JzKGNlbGxzLCBwdCkpIHtcclxuICAgICAgICBpZiAodCA9PT0gQ2VsbFR5cGUuRXh0ZXJpb3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5wdFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVsbFxyXG59XHJcblxyXG5mdW5jdGlvbiB2aXNpdEludGVyaW9yQ29vcmRzKGNlbGxzOiBDZWxsR3JpZCwgcHQwOiBnZW8uUG9pbnQpOiBJdGVyYWJsZTxnZW8uUG9pbnQ+IHtcclxuICAgIHJldHVybiBpdGVyLm1hcCh2aXNpdEludGVyaW9yKGNlbGxzLCBwdDApLCB4ID0+IHhbMV0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uKiB2aXNpdEludGVyaW9yKGNlbGxzOiBDZWxsR3JpZCwgcHQwOiBnZW8uUG9pbnQpOiBJdGVyYWJsZTxbQ2VsbFR5cGUsIGdlby5Qb2ludF0+IHtcclxuICAgIGNvbnN0IGV4cGxvcmVkID0gY2VsbHMubWFwMigoKSA9PiBmYWxzZSlcclxuICAgIGNvbnN0IHN0YWNrID0gW3B0MF1cclxuXHJcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnN0IHB0ID0gYXJyYXkucG9wKHN0YWNrKVxyXG4gICAgICAgIGV4cGxvcmVkLnNldFBvaW50KHB0LCB0cnVlKVxyXG4gICAgICAgIGNvbnN0IHQgPSBjZWxscy5hdFBvaW50KHB0KVxyXG4gICAgICAgIHlpZWxkIFt0LCBwdF1cclxuXHJcbiAgICAgICAgLy8gaWYgdGhpcyBpcyBhIHdhbGwsIGRvIG5vdCBleHBsb3JlIG5laWdoYm9yc1xyXG4gICAgICAgIGlmICh0ID09PSBDZWxsVHlwZS5XYWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBvdGhlcndpc2UsIGV4cGxvcmUgbmVpZ2hib3JzLCBwdXNoaW5nIG9udG8gc3RhY2sgdGhvc2UgdGhhdCBhcmUgdW5leHBsb3JlZFxyXG4gICAgICAgIGZvciAoY29uc3QgW3QsIG5wdF0gb2YgZ3JpZC52aXNpdE5laWdoYm9ycyhjZWxscywgcHQpKSB7XHJcbiAgICAgICAgICAgIGlmIChleHBsb3JlZC5hdFBvaW50KG5wdCkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0ICE9PSBDZWxsVHlwZS5JbnRlcmlvcikge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgc3RhY2sucHVzaChucHQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkUGxhY2VtZW50KHNyYzogQ2VsbEdyaWQsIGRzdDogQ2VsbEdyaWQsIG9mZnNldDogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICBpZiAoIWRzdC5yZWdpb25JbkJvdW5kcyhvZmZzZXQueCwgb2Zmc2V0LnksIHNyYy53aWR0aCwgc3JjLmhlaWdodCkpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IFtzdCwgeCwgeV0gb2Ygc3JjLnNjYW4oKSkge1xyXG4gICAgICAgIC8vIHJ1bGVzOlxyXG4gICAgICAgIC8vIGNhbiBwbGFjZSB3YWxsIG92ZXIgd2FsbFxyXG4gICAgICAgIC8vIGNhbiBwbGFjZSBhbnl0aGluZyBvdmVyIGV4dGVyaW9yXHJcbiAgICAgICAgY29uc3QgZHQgPSBkc3QuYXQoeCArIG9mZnNldC54LCB5ICsgb2Zmc2V0LnkpXHJcbiAgICAgICAgaWYgKGR0ID09PSBDZWxsVHlwZS5FeHRlcmlvcikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGR0ID09PSBDZWxsVHlwZS5XYWxsICYmIHN0ID09PSBDZWxsVHlwZS5XYWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVPdXRkb29yTWFwKHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIHBsYXllcjogcmwuUGxheWVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFByb21pc2U8bWFwcy5NYXA+IHtcclxuICAgIGNvbnN0IG1hcCA9IG5ldyBtYXBzLk1hcCh3aWR0aCwgaGVpZ2h0LCBwbGF5ZXIpXHJcbiAgICBtYXAubGlnaHRpbmcgPSBtYXBzLkxpZ2h0aW5nLkFtYmllbnRcclxuXHJcbiAgICBwbGF5ZXIucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KDAsIDApXHJcbiAgICBnZW5lcmF0ZU91dGRvb3JUZXJyYWluKG1hcClcclxuICAgIGF3YWl0IGxvYWRTcHJpdGVUZXh0dXJlcyhyZW5kZXJlciwgbWFwKVxyXG4gICAgcmV0dXJuIG1hcFxyXG59XHJcblxyXG5lbnVtIE91dGRvb3JUaWxlVHlwZSB7XHJcbiAgICB3YXRlcixcclxuICAgIGdyYXNzLFxyXG4gICAgZGlydCxcclxuICAgIHNhbmRcclxufVxyXG5cclxuZW51bSBPdXRkb29yRml4dHVyZVR5cGUge1xyXG4gICAgbm9uZSxcclxuICAgIGhpbGxzLFxyXG4gICAgbW91bnRhaW5zLFxyXG4gICAgdHJlZXMsXHJcbiAgICBzbm93XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlT3V0ZG9vclRlcnJhaW4obWFwOiBtYXBzLk1hcCkge1xyXG4gICAgY29uc3QgdGlsZXMgPSBncmlkLmdlbmVyYXRlKG1hcC53aWR0aCwgbWFwLmhlaWdodCwgKCkgPT4gT3V0ZG9vclRpbGVUeXBlLndhdGVyKVxyXG4gICAgY29uc3QgZml4dHVyZXMgPSBncmlkLmdlbmVyYXRlKG1hcC53aWR0aCwgbWFwLmhlaWdodCwgKCkgPT4gT3V0ZG9vckZpeHR1cmVUeXBlLm5vbmUpXHJcblxyXG4gICAgLy8gVE9ETyAtIHJhbmRvbWx5IGJpYXMgcGVybGluIG5vaXNlIGluc3RlYWRcclxuICAgIC8vIGNvbnN0IGJpYXM9IHJhbmQuaW50KDAsIDI1NilcclxuICAgIGNvbnN0IGJpYXMgPSAwXHJcblxyXG4gICAgY29uc3QgaGVpZ2h0TWFwID0gZmJtKG1hcC53aWR0aCwgbWFwLmhlaWdodCwgYmlhcywgOCAvIG1hcC53aWR0aCwgMiwgLjUsIDgpXHJcblxyXG4gICAgaW1hZ2luZy5zY2FuKG1hcC53aWR0aCwgbWFwLmhlaWdodCwgKHgsIHksIG9mZnNldCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGggPSBoZWlnaHRNYXBbb2Zmc2V0XVxyXG4gICAgICAgIGlmIChoID4gMCkge1xyXG4gICAgICAgICAgICB0aWxlcy5zZXQoeCwgeSwgT3V0ZG9vclRpbGVUeXBlLmRpcnQpXHJcbiAgICAgICAgfVxyXG4gICAgfSlcclxuXHJcbiAgICBtYXAucGxheWVyLnBvc2l0aW9uID0gdGlsZXMuZmluZFBvaW50KHQgPT4gdCAhPT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSA/PyBuZXcgZ2VvLlBvaW50KDAsIDApXHJcblxyXG4gICAgZm9yIChjb25zdCBbdCwgeCwgeV0gb2YgdGlsZXMuc2NhbigpKSB7XHJcbiAgICAgICAgc3dpdGNoICh0KSB7XHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JUaWxlVHlwZS53YXRlcik6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aGluZ3Mud2F0ZXIuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgdGlsZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5hZGQodGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JUaWxlVHlwZS5kaXJ0KToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRoaW5ncy5kaXJ0LmNsb25lKClcclxuICAgICAgICAgICAgICAgIHRpbGUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuYWRkKHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yVGlsZVR5cGUuZ3Jhc3MpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gdGhpbmdzLmdyYXNzLmNsb25lKClcclxuICAgICAgICAgICAgICAgIHRpbGUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuYWRkKHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yVGlsZVR5cGUuc2FuZCk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aGluZ3Muc2FuZC5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICB0aWxlLnBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLnRpbGVzLmFkZCh0aWxlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IFtmLCB4LCB5XSBvZiBmaXh0dXJlcy5zY2FuKCkpIHtcclxuICAgICAgICBzd2l0Y2ggKGYpIHtcclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vckZpeHR1cmVUeXBlLmhpbGxzKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZml4dHVyZSA9IHRoaW5ncy5oaWxscy5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBmaXh0dXJlLnBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLmZpeHR1cmVzLmFkZChmaXh0dXJlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vckZpeHR1cmVUeXBlLm1vdW50YWlucyk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeHR1cmUgPSB0aGluZ3MubW91bnRhaW5zLmNsb25lKClcclxuICAgICAgICAgICAgICAgIGZpeHR1cmUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAuZml4dHVyZXMuYWRkKGZpeHR1cmUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yRml4dHVyZVR5cGUudHJlZXMpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaXh0dXJlID0gdGhpbmdzLnRyZWVzLmNsb25lKClcclxuICAgICAgICAgICAgICAgIGZpeHR1cmUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAuZml4dHVyZXMuYWRkKGZpeHR1cmUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yRml4dHVyZVR5cGUuc25vdyk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeHR1cmUgPSB0aGluZ3Muc25vdy5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBmaXh0dXJlLnBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLmZpeHR1cmVzLmFkZChmaXh0dXJlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VMYW5kbWFzc2VzKHRpbGVzOiBncmlkLkdyaWQ8T3V0ZG9vclRpbGVUeXBlPikge1xyXG4gICAgY29uc3QgbWF4VGlsZXMgPSBNYXRoLmNlaWwodGlsZXMuc2l6ZSAqIHJhbmQuZmxvYXQoLjMsIC41KSlcclxuICAgIGdyb3dMYW5kKHRpbGVzLCBtYXhUaWxlcylcclxuXHJcbiAgICAvLyBmaW5kIG1heGltYWwgd2F0ZXIgcmVjdCAtIGlmIGxhcmdlIGVub3VnaCwgcGxhbnQgaXNsYW5kXHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgIGNvbnN0IGFhYmIgPSBncmlkLmZpbmRNYXhpbWFsUmVjdCh0aWxlcywgdCA9PiB0ID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpLnNocmluaygxKVxyXG4gICAgICAgIGlmIChhYWJiLmFyZWEgPCAxMikge1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdmlldyA9IHRpbGVzLnZpZXdBQUJCKGFhYmIpXHJcbiAgICAgICAgY29uc3QgaXNsYW5kVGlsZXMgPSBhYWJiLmFyZWEgKiByYW5kLmZsb2F0KC4yNSwgMSlcclxuICAgICAgICBncm93TGFuZCh2aWV3LCBpc2xhbmRUaWxlcylcclxuICAgIH1cclxuXHJcbiAgICAvLyBwbGFjZSBzb21lIGlzbGFuZHNcclxuICAgIHBsYWNlQmVhY2hlcyh0aWxlcylcclxufVxyXG5cclxuZnVuY3Rpb24gZ3Jvd0xhbmQodGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+LCBtYXhUaWxlczogbnVtYmVyKSB7XHJcbiAgICAvLyBcInBsYW50XCIgYSBjb250aW5lbnRcclxuICAgIGNvbnN0IHN0YWNrID0gbmV3IEFycmF5PGdlby5Qb2ludD4oKVxyXG4gICAgY29uc3Qgc2VlZCA9IG5ldyBnZW8uUG9pbnQodGlsZXMud2lkdGggLyAyLCB0aWxlcy5oZWlnaHQgLyAyKS5mbG9vcigpXHJcbiAgICBzdGFjay5wdXNoKHNlZWQpXHJcbiAgICBsZXQgcGxhY2VkID0gMFxyXG5cclxuICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwICYmIHBsYWNlZCA8IG1heFRpbGVzKSB7XHJcbiAgICAgICAgY29uc3QgcHQgPSBhcnJheS5wb3Aoc3RhY2spXHJcbiAgICAgICAgdGlsZXMuc2V0UG9pbnQocHQsIE91dGRvb3JUaWxlVHlwZS5ncmFzcylcclxuICAgICAgICArK3BsYWNlZFxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IFt0LCB4eV0gb2YgZ3JpZC52aXNpdE5laWdoYm9ycyh0aWxlcywgcHQpKSB7XHJcbiAgICAgICAgICAgIGlmICh0ID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeHkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJhbmQuc2h1ZmZsZShzdGFjaylcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VCZWFjaGVzKHRpbGVzOiBncmlkLkdyaWQ8T3V0ZG9vclRpbGVUeXBlPikge1xyXG4gICAgZm9yIChjb25zdCBwdCBvZiBncmlkLnNjYW4oMCwgMCwgdGlsZXMud2lkdGgsIHRpbGVzLmhlaWdodCkpIHtcclxuICAgICAgICBpZiAodGlsZXMuYXRQb2ludChwdCkgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHB0LnggPiAwICYmIHRpbGVzLmF0KHB0LnggLSAxLCBwdC55KSA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgIHRpbGVzLnNldFBvaW50KHB0LCBPdXRkb29yVGlsZVR5cGUuc2FuZClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwdC54IDwgdGlsZXMud2lkdGggLSAxICYmIHRpbGVzLmF0KHB0LnggKyAxLCBwdC55KSA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgIHRpbGVzLnNldFBvaW50KHB0LCBPdXRkb29yVGlsZVR5cGUuc2FuZClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwdC55ID4gMCAmJiB0aWxlcy5hdChwdC54LCBwdC55IC0gMSkgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICB0aWxlcy5zZXRQb2ludChwdCwgT3V0ZG9vclRpbGVUeXBlLnNhbmQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocHQueSA8IHRpbGVzLmhlaWdodCAtIDEgJiYgdGlsZXMuYXQocHQueCwgcHQueSArIDEpID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgdGlsZXMuc2V0UG9pbnQocHQsIE91dGRvb3JUaWxlVHlwZS5zYW5kKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VTbm93KHRpbGVzOiBncmlkLkdyaWQ8T3V0ZG9vclRpbGVUeXBlPiwgZml4dHVyZXM6IGdyaWQuR3JpZDxPdXRkb29yRml4dHVyZVR5cGU+KSB7XHJcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQgfSA9IHRpbGVzXHJcbiAgICBjb25zdCBzbm93SGVpZ2h0ID0gTWF0aC5jZWlsKGhlaWdodCAvIDMpXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHNub3dIZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCB0ID0gdGlsZXMuYXQoeCwgeSlcclxuICAgICAgICAgICAgaWYgKHQgIT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICAgICAgZml4dHVyZXMuc2V0KHgsIHksIE91dGRvb3JGaXh0dXJlVHlwZS5zbm93KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZU1vdW50YWlucyh0aWxlczogZ3JpZC5HcmlkPE91dGRvb3JUaWxlVHlwZT4sIGZpeHR1cmVzOiBncmlkLkdyaWQ8T3V0ZG9vckZpeHR1cmVUeXBlPiwgbWF4VGlsZXM6IG51bWJlcikge1xyXG4gICAgLy8gZmluZCBhIHN1aXRhYmxlIHN0YXJ0IHBvaW50IGZvciBtb3VudGFpbiByYW5nZVxyXG4gICAgY29uc3Qgc2VlZCA9IHJhbmQuY2hvb3NlKFsuLi50aWxlcy5maW5kUG9pbnRzKHggPT4geCAhPT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyICYmIHggIT09IE91dGRvb3JUaWxlVHlwZS5zYW5kKV0pXHJcbiAgICBjb25zdCBzdGFjayA9IG5ldyBBcnJheTxnZW8uUG9pbnQ+KClcclxuICAgIHN0YWNrLnB1c2goc2VlZClcclxuICAgIGxldCBwbGFjZWQgPSAwXHJcblxyXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDAgJiYgcGxhY2VkIDwgbWF4VGlsZXMpIHtcclxuICAgICAgICBjb25zdCBwdCA9IGFycmF5LnBvcChzdGFjaylcclxuICAgICAgICBmaXh0dXJlcy5zZXRQb2ludChwdCwgT3V0ZG9vckZpeHR1cmVUeXBlLm1vdW50YWlucylcclxuICAgICAgICArK3BsYWNlZFxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IFt0LCB4eV0gb2YgZ3JpZC52aXNpdE5laWdoYm9ycyh0aWxlcywgcHQpKSB7XHJcbiAgICAgICAgICAgIGlmICh0ICE9PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIgJiYgdCAhPT0gT3V0ZG9vclRpbGVUeXBlLnNhbmQpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeHkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJhbmQuc2h1ZmZsZShzdGFjaylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRTcHJpdGVUZXh0dXJlcyhyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBtYXA6IG1hcHMuTWFwKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAvLyBiYWtlIGFsbCAyNHgyNCB0aWxlIGltYWdlcyB0byBhIHNpbmdsZSBhcnJheSB0ZXh0dXJlXHJcbiAgICAvLyBzdG9yZSBtYXBwaW5nIGZyb20gaW1hZ2UgdXJsIHRvIGluZGV4XHJcbiAgICBjb25zdCBpbWFnZVVybHMgPSBpdGVyLndyYXAobWFwKS5tYXAodGggPT4gdGguaW1hZ2UpLmZpbHRlcigpLmRpc3RpbmN0KCkudG9BcnJheSgpXHJcbiAgICBjb25zdCBsYXllck1hcCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KGltYWdlVXJscy5tYXAoKHVybCwgaSkgPT4gW3VybCwgaV0pKVxyXG4gICAgY29uc3QgaW1hZ2VzID0gYXdhaXQgUHJvbWlzZS5hbGwoaW1hZ2VVcmxzLm1hcCh1cmwgPT4gZG9tLmxvYWRJbWFnZSh1cmwpKSlcclxuICAgIGNvbnN0IHRleHR1cmUgPSByZW5kZXJlci5iYWtlVGV4dHVyZUFycmF5KHJsLnRpbGVTaXplLCBybC50aWxlU2l6ZSwgaW1hZ2VzKVxyXG5cclxuICAgIGZvciAoY29uc3QgdGggb2YgbWFwKSB7XHJcbiAgICAgICAgaWYgKCF0aC5pbWFnZSkge1xyXG4gICAgICAgICAgICB0aC50ZXh0dXJlTGF5ZXIgPSAtMVxyXG4gICAgICAgICAgICB0aC50ZXh0dXJlID0gbnVsbFxyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbGF5ZXIgPSBsYXllck1hcC5nZXQodGguaW1hZ2UpXHJcbiAgICAgICAgaWYgKGxheWVyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB0ZXh0dXJlIGluZGV4IG5vdCBmb3VuZCBmb3IgJHt0aC5pbWFnZX1gKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGgudGV4dHVyZSA9IHRleHR1cmVcclxuICAgICAgICB0aC50ZXh0dXJlTGF5ZXIgPSBsYXllclxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmYm0od2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIGJpYXM6IG51bWJlciwgZnJlcTogbnVtYmVyLCBsYWN1bmFyaXR5OiBudW1iZXIsIGdhaW46IG51bWJlciwgb2N0YXZlczogbnVtYmVyKTogbnVtYmVyW10ge1xyXG4gICAgcmV0dXJuIGltYWdpbmcuZ2VuZXJhdGUod2lkdGgsIGhlaWdodCwgKHgsIHkpID0+IHtcclxuICAgICAgICByZXR1cm4gbm9pc2UuZmJtUGVybGluMih4ICogZnJlcSArIGJpYXMsIHkgKiBmcmVxICsgYmlhcywgbGFjdW5hcml0eSwgZ2Fpbiwgb2N0YXZlcylcclxuICAgIH0pXHJcbn0iXX0=