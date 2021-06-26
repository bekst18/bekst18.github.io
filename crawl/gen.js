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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0gsT0FBTyxLQUFLLEVBQUUsTUFBTSxTQUFTLENBQUE7QUFDN0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBRWpDLE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssT0FBTyxNQUFNLHNCQUFzQixDQUFBO0FBVS9DLE1BQU0sT0FBTyxHQUFtQjtJQUM1QixJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUU7SUFDOUIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFO0lBQzNCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTtJQUN6QixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7SUFDakMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFO0NBQ3hDLENBQUE7QUFFRCxNQUFNLFFBQVEsR0FBRztJQUNiLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFO0lBQ2xCLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO0lBQ3ZCLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFF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Q3BCLEVBQUUsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFBO0tBQzFCO0FBQ0wsQ0FBQztBQUVELFNBQVMsR0FBRyxDQUFDLEtBQWEsRUFBRSxNQUFjLEVBQUUsSUFBWSxFQUFFLElBQVksRUFBRSxVQUFrQixFQUFFLElBQVksRUFBRSxPQUFlO0lBQ3JILE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzVDLE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3hGLENBQUMsQ0FBQyxDQUFBO0FBQ04sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBtYXAgZ2VuZXJhdGlvbiBsaWJyYXJ5XHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBybCBmcm9tIFwiLi9ybC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgZ3JpZCBmcm9tIFwiLi4vc2hhcmVkL2dyaWQuanNcIlxyXG5pbXBvcnQgKiBhcyBhcnJheSBmcm9tIFwiLi4vc2hhcmVkL2FycmF5LmpzXCJcclxuaW1wb3J0ICogYXMgaXRlciBmcm9tIFwiLi4vc2hhcmVkL2l0ZXIuanNcIlxyXG5pbXBvcnQgKiBhcyByYW5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiXHJcbmltcG9ydCAqIGFzIHRoaW5ncyBmcm9tIFwiLi90aGluZ3MuanNcIlxyXG5pbXBvcnQgKiBhcyBtYXBzIGZyb20gXCIuL21hcHMuanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgbm9pc2UgZnJvbSBcIi4uL3NoYXJlZC9ub2lzZS5qc1wiXHJcbmltcG9ydCAqIGFzIGltYWdpbmcgZnJvbSBcIi4uL3NoYXJlZC9pbWFnaW5nLmpzXCJcclxuXHJcbmludGVyZmFjZSBEdW5nZW9uVGlsZXNldCB7XHJcbiAgICB3YWxsOiBybC5UaWxlLFxyXG4gICAgZmxvb3I6IHJsLlRpbGUsXHJcbiAgICBkb29yOiBybC5Eb29yLFxyXG4gICAgc3RhaXJzVXA6IHJsLlN0YWlyc1VwXHJcbiAgICBzdGFpcnNEb3duOiBybC5TdGFpcnNEb3duXHJcbn1cclxuXHJcbmNvbnN0IHRpbGVzZXQ6IER1bmdlb25UaWxlc2V0ID0ge1xyXG4gICAgd2FsbDogdGhpbmdzLmJyaWNrV2FsbC5jbG9uZSgpLFxyXG4gICAgZmxvb3I6IHRoaW5ncy5mbG9vci5jbG9uZSgpLFxyXG4gICAgZG9vcjogdGhpbmdzLmRvb3IuY2xvbmUoKSxcclxuICAgIHN0YWlyc1VwOiB0aGluZ3Muc3RhaXJzVXAuY2xvbmUoKSxcclxuICAgIHN0YWlyc0Rvd246IHRoaW5ncy5zdGFpcnNEb3duLmNsb25lKClcclxufVxyXG5cclxuY29uc3QgbW9uc3RlcnMgPSBbXHJcbiAgICB0aGluZ3MuYmF0LmNsb25lKCksXHJcbiAgICB0aGluZ3Muc2tlbGV0b24uY2xvbmUoKSxcclxuICAgIHRoaW5ncy5ncmVlblNsaW1lLmNsb25lKCksXHJcbiAgICB0aGluZ3MucmVkU2xpbWUuY2xvbmUoKSxcclxuICAgIHRoaW5ncy5zcGlkZXIuY2xvbmUoKSxcclxuICAgIHRoaW5ncy5yYXQuY2xvbmUoKVxyXG5dXHJcblxyXG5jb25zdCBsb290ID0gW1xyXG4gICAgdGhpbmdzLmNsb3RoQXJtb3IuY2xvbmUoKSxcclxuICAgIHRoaW5ncy5zaGFycFN0aWNrLmNsb25lKCksXHJcbiAgICB0aGluZ3MuZGFnZ2VyLmNsb25lKCksXHJcbiAgICB0aGluZ3MubGVhdGhlckFybW9yLmNsb25lKCksXHJcbiAgICB0aGluZ3Mud29vZGVuQm93LmNsb25lKCksXHJcbiAgICB0aGluZ3Muc2xpbmdTaG90LmNsb25lKCksXHJcbiAgICB0aGluZ3Mud2Vha0hlYWx0aFBvdGlvbi5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLmhlYWx0aFBvdGlvbi5jbG9uZSgpXHJcbl1cclxuXHJcbmVudW0gQ2VsbFR5cGUge1xyXG4gICAgRXh0ZXJpb3IsXHJcbiAgICBJbnRlcmlvcixcclxuICAgIFdhbGwsXHJcbiAgICBEb29yXHJcbn1cclxuXHJcbnR5cGUgQ2VsbEdyaWQgPSBncmlkLkdyaWQ8Q2VsbFR5cGU+XHJcblxyXG5pbnRlcmZhY2UgUm9vbVRlbXBsYXRlIHtcclxuICAgIGNlbGxzOiBDZWxsR3JpZFxyXG4gICAgaW50ZXJpb3JQdDogZ2VvLlBvaW50XHJcbiAgICB0dW5uZWxQdHM6IGdlby5Qb2ludFtdXHJcbn1cclxuXHJcbmludGVyZmFjZSBSb29tIHtcclxuICAgIGludGVyaW9yUHQ6IGdlby5Qb2ludFxyXG4gICAgdHVubmVsUHRzOiBnZW8uUG9pbnRbXVxyXG4gICAgZGVwdGg6IG51bWJlcixcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlRHVuZ2VvbkxldmVsKHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIHBsYXllcjogcmwuUGxheWVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFByb21pc2U8bWFwcy5NYXA+IHtcclxuICAgIGNvbnN0IG1hcCA9IGdlbmVyYXRlTWFwUm9vbXMod2lkdGgsIGhlaWdodCwgcGxheWVyKVxyXG4gICAgbWFwLmxpZ2h0aW5nID0gbWFwcy5MaWdodGluZy5Ob25lXHJcbiAgICBhd2FpdCBsb2FkU3ByaXRlVGV4dHVyZXMocmVuZGVyZXIsIG1hcClcclxuICAgIHJldHVybiBtYXBcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVNYXBSb29tcyh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcGxheWVyOiBybC5QbGF5ZXIpOiBtYXBzLk1hcCB7XHJcbiAgICBjb25zdCBtYXAgPSBuZXcgbWFwcy5NYXAod2lkdGgsIGhlaWdodCwgcGxheWVyKVxyXG4gICAgY29uc3QgbWluUm9vbXMgPSA0XHJcblxyXG4gICAgY29uc3QgW2NlbGxzLCByb29tc10gPSAoKCkgPT4ge1xyXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFtjZWxscywgcm9vbXNdID0gZ2VuZXJhdGVDZWxsR3JpZCh3aWR0aCwgaGVpZ2h0KVxyXG4gICAgICAgICAgICBpZiAocm9vbXMubGVuZ3RoID4gbWluUm9vbXMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBbY2VsbHMsIHJvb21zXVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSkoKSBhcyBbQ2VsbEdyaWQsIFJvb21bXV1cclxuXHJcbiAgICBjb25zdCBmaXJzdFJvb20gPSByb29tcy5yZWR1Y2UoKHgsIHkpID0+IHguZGVwdGggPCB5LmRlcHRoID8geCA6IHkpXHJcbiAgICBtYXAucGxheWVyLnBvc2l0aW9uID0gZmlyc3RSb29tLmludGVyaW9yUHQuY2xvbmUoKVxyXG5cclxuICAgIGNvbnN0IHN0YWlyc1VwID0gdGlsZXNldC5zdGFpcnNVcC5jbG9uZSgpXHJcbiAgICBjb25zdCBzdGFpcnNVcFBvc2l0aW9uID0gaXRlci5maW5kKHZpc2l0SW50ZXJpb3JDb29yZHMoY2VsbHMsIGZpcnN0Um9vbS5pbnRlcmlvclB0KSwgcHQgPT4gaXRlci5hbnkoZ3JpZC52aXNpdE5laWdoYm9ycyhjZWxscywgcHQpLCBhID0+IGFbMF0gPT09IENlbGxUeXBlLldhbGwpKVxyXG4gICAgaWYgKCFzdGFpcnNVcFBvc2l0aW9uKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIHBsYWNlIHN0YWlycyB1cFwiKVxyXG4gICAgfVxyXG4gICAgc3RhaXJzVXAucG9zaXRpb24gPSBzdGFpcnNVcFBvc2l0aW9uLmNsb25lKClcclxuICAgIG1hcC5maXh0dXJlcy5hZGQoc3RhaXJzVXApXHJcblxyXG4gICAgY29uc3QgbGFzdFJvb20gPSByb29tcy5yZWR1Y2UoKHgsIHkpID0+IHguZGVwdGggPiB5LmRlcHRoID8geCA6IHkpXHJcbiAgICBjb25zdCBzdGFpcnNEb3duID0gdGlsZXNldC5zdGFpcnNEb3duLmNsb25lKClcclxuICAgIGNvbnN0IHN0YWlyc0Rvd25Qb3NpdGlvbiA9IGl0ZXIuZmluZCh2aXNpdEludGVyaW9yQ29vcmRzKGNlbGxzLCBsYXN0Um9vbS5pbnRlcmlvclB0KSwgcHQgPT4gaXRlci5hbnkoZ3JpZC52aXNpdE5laWdoYm9ycyhjZWxscywgcHQpLCBhID0+IGFbMF0gPT09IENlbGxUeXBlLldhbGwpKVxyXG4gICAgaWYgKCFzdGFpcnNEb3duUG9zaXRpb24pIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gcGxhY2Ugc3RhaXJzIGRvd25cIilcclxuICAgIH1cclxuICAgIHN0YWlyc0Rvd24ucG9zaXRpb24gPSBzdGFpcnNEb3duUG9zaXRpb24uY2xvbmUoKVxyXG4gICAgbWFwLmZpeHR1cmVzLmFkZChzdGFpcnNEb3duKVxyXG5cclxuICAgIC8vIGdlbmVyYXRlIHRpbGVzIGFuZCBmaXh0dXJlcyBmcm9tIGNlbGxzXHJcbiAgICBmb3IgKGNvbnN0IFt2LCB4LCB5XSBvZiBjZWxscy5zY2FuKCkpIHtcclxuICAgICAgICBpZiAodiA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3dpdGNoICh2KSB7XHJcbiAgICAgICAgICAgIGNhc2UgQ2VsbFR5cGUuRXh0ZXJpb3I6XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBDZWxsVHlwZS5JbnRlcmlvcjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRpbGVzZXQuZmxvb3IuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgdGlsZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5hZGQodGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ2VsbFR5cGUuV2FsbDoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRpbGVzZXQud2FsbC5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICB0aWxlLnBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLnRpbGVzLmFkZCh0aWxlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBDZWxsVHlwZS5Eb29yOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaXh0dXJlID0gdGlsZXNldC5kb29yLmNsb25lKClcclxuICAgICAgICAgICAgICAgIGZpeHR1cmUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAuZml4dHVyZXMuYWRkKGZpeHR1cmUpXHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRpbGVzZXQuZmxvb3IuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgdGlsZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5hZGQodGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcGxhY2VNb25zdGVycyhjZWxscywgcm9vbXMsIG1hcClcclxuICAgIHBsYWNlVHJlYXN1cmVzKGNlbGxzLCByb29tcywgbWFwKVxyXG5cclxuICAgIHJldHVybiBtYXBcclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VNb25zdGVycyhjZWxsczogQ2VsbEdyaWQsIHJvb21zOiBSb29tW10sIG1hcDogbWFwcy5NYXApIHtcclxuICAgIC8vIGl0ZXJhdGUgb3ZlciByb29tcywgZGVjaWRlIHdoZXRoZXIgdG8gcGxhY2UgYSBtb25zdGVyIGluIGVhY2ggcm9vbVxyXG4gICAgY29uc3QgZW5jb3VudGVyQ2hhbmNlID0gLjI1XHJcbiAgICBjb25zdCBzZWNvbmRFbmNvdW50ZXJDaGFuY2UgPSAuMlxyXG4gICAgY29uc3QgdGhpcmRFbmNvdW50ZXJDaGFuY2UgPSAuMVxyXG5cclxuICAgIGZvciAoY29uc3Qgcm9vbSBvZiByb29tcykge1xyXG4gICAgICAgIGlmICghcmFuZC5jaGFuY2UoZW5jb3VudGVyQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5UGxhY2VNb25zdGVyKGNlbGxzLCByb29tLCBtYXApXHJcblxyXG4gICAgICAgIGlmICghcmFuZC5jaGFuY2Uoc2Vjb25kRW5jb3VudGVyQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5UGxhY2VNb25zdGVyKGNlbGxzLCByb29tLCBtYXApXHJcblxyXG4gICAgICAgIGlmICghcmFuZC5jaGFuY2UodGhpcmRFbmNvdW50ZXJDaGFuY2UpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cnlQbGFjZU1vbnN0ZXIoY2VsbHMsIHJvb20sIG1hcClcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdHJ5UGxhY2VNb25zdGVyKGNlbGxzOiBDZWxsR3JpZCwgcm9vbTogUm9vbSwgbWFwOiBtYXBzLk1hcCk6IGJvb2xlYW4ge1xyXG4gICAgLy8gYXR0ZW1wdCB0byBwbGFjZSBtb25zdGVyXHJcbiAgICBmb3IgKGNvbnN0IFt0LCBwdF0gb2YgdmlzaXRJbnRlcmlvcihjZWxscywgcm9vbS5pbnRlcmlvclB0KSkge1xyXG4gICAgICAgIGlmICh0ICE9PSBDZWxsVHlwZS5JbnRlcmlvcikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGl0ZXIuYW55KG1hcCwgdGggPT4gKHRoLnBvc2l0aW9uPy5lcXVhbChwdCkgPz8gZmFsc2UpICYmICF0aC5wYXNzYWJsZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG1vbnN0ZXIgPSAocmFuZC5jaG9vc2UobW9uc3RlcnMpKS5jbG9uZSgpXHJcbiAgICAgICAgbW9uc3Rlci5wb3NpdGlvbiA9IHB0LmNsb25lKClcclxuICAgICAgICBtYXAubW9uc3RlcnMuYWRkKG1vbnN0ZXIpXHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlVHJlYXN1cmVzKGNlbGxzOiBDZWxsR3JpZCwgcm9vbXM6IFJvb21bXSwgbWFwOiBtYXBzLk1hcCkge1xyXG4gICAgLy8gaXRlcmF0ZSBvdmVyIHJvb21zLCBkZWNpZGUgd2hldGhlciB0byBwbGFjZSBhIG1vbnN0ZXIgaW4gZWFjaCByb29tXHJcbiAgICBjb25zdCB0cmVhc3VyZUNoYW5jZSA9IC4yXHJcblxyXG4gICAgZm9yIChjb25zdCByb29tIG9mIHJvb21zKSB7XHJcbiAgICAgICAgaWYgKCFyYW5kLmNoYW5jZSh0cmVhc3VyZUNoYW5jZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeVBsYWNlVHJlYXN1cmUoY2VsbHMsIHJvb20sIG1hcClcclxuICAgIH1cclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIHRyeVBsYWNlVHJlYXN1cmUoY2VsbHM6IENlbGxHcmlkLCByb29tOiBSb29tLCBtYXA6IG1hcHMuTWFwKTogYm9vbGVhbiB7XHJcbiAgICAvLyBhdHRlbXB0IHRvIHBsYWNlIHRyZWFzdXJlXHJcbiAgICBmb3IgKGNvbnN0IFt0LCBwdF0gb2YgdmlzaXRJbnRlcmlvcihjZWxscywgcm9vbS5pbnRlcmlvclB0KSkge1xyXG4gICAgICAgIGlmICh0ICE9PSBDZWxsVHlwZS5JbnRlcmlvcikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGl0ZXIuYW55KG1hcCwgdGggPT4gKHRoLnBvc2l0aW9uPy5lcXVhbChwdCkgPz8gZmFsc2UpICYmICF0aC5wYXNzYWJsZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNoZXN0ID0gdGhpbmdzLmNoZXN0LmNsb25lKClcclxuICAgICAgICBjaGVzdC5wb3NpdGlvbiA9IHB0LmNsb25lKClcclxuXHJcbiAgICAgICAgLy8gY2hvb3NlIGxvb3RcclxuICAgICAgICBjb25zdCBpdGVtID0gcmFuZC5jaG9vc2UobG9vdClcclxuICAgICAgICBjaGVzdC5pdGVtcy5hZGQoaXRlbSlcclxuXHJcbiAgICAgICAgLy8gZXh0cmEgbG9vdFxyXG4gICAgICAgIGxldCBleHRyYUxvb3RDaGFuY2UgPSAuNVxyXG4gICAgICAgIHdoaWxlIChyYW5kLmNoYW5jZShleHRyYUxvb3RDaGFuY2UpKSB7XHJcbiAgICAgICAgICAgIGV4dHJhTG9vdENoYW5jZSAqPSAuNVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gcmFuZC5jaG9vc2UobG9vdClcclxuICAgICAgICAgICAgY2hlc3QuaXRlbXMuYWRkKGl0ZW0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtYXAuY29udGFpbmVycy5hZGQoY2hlc3QpXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2VcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVDZWxsR3JpZCh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFtDZWxsR3JpZCwgUm9vbVtdXSB7XHJcbiAgICBjb25zdCBjZWxscyA9IGdyaWQuZ2VuZXJhdGUod2lkdGgsIGhlaWdodCwgKCkgPT4gQ2VsbFR5cGUuRXh0ZXJpb3IpXHJcblxyXG4gICAgLy8gZ2VuZXJhdGUgcm9vbSB0ZW1wbGF0ZXNcclxuICAgIGNvbnN0IHRlbXBsYXRlcyA9IGdlbmVyYXRlUm9vbVRlbXBsYXRlcygpXHJcbiAgICBjb25zdCBzdGFjazogUm9vbVtdID0gW11cclxuICAgIGNvbnN0IHJvb21zOiBSb29tW10gPSBbXVxyXG5cclxuICAgIC8vIHBsYWNlIGluaXRpYWwgcm9vbVxyXG4gICAge1xyXG4gICAgICAgIHJhbmQuc2h1ZmZsZSh0ZW1wbGF0ZXMpXHJcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSB0ZW1wbGF0ZXNbMF1cclxuXHJcbiAgICAgICAgY29uc3QgcHQgPSBuZXcgZ2VvLlBvaW50KFxyXG4gICAgICAgICAgICByYW5kLmludCgwLCB3aWR0aCAtIHRlbXBsYXRlLmNlbGxzLndpZHRoICsgMSksXHJcbiAgICAgICAgICAgIHJhbmQuaW50KDAsIGhlaWdodCAtIHRlbXBsYXRlLmNlbGxzLmhlaWdodCArIDEpKVxyXG5cclxuICAgICAgICBjb25zdCByb29tID0gcGxhY2VUZW1wbGF0ZShjZWxscywgdGVtcGxhdGUsIHB0KVxyXG4gICAgICAgIHN0YWNrLnB1c2gocm9vbSlcclxuICAgICAgICByb29tcy5wdXNoKHJvb20pXHJcbiAgICB9XHJcblxyXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjb25zdCByb29tID0gYXJyYXkucG9wKHN0YWNrKVxyXG4gICAgICAgIGNvbnN0IG5leHRSb29tID0gdHJ5VHVubmVsRnJvbShjZWxscywgdGVtcGxhdGVzLCByb29tKVxyXG5cclxuICAgICAgICBpZiAobmV4dFJvb20pIHtcclxuICAgICAgICAgICAgc3RhY2sucHVzaChyb29tKVxyXG4gICAgICAgICAgICBzdGFjay5wdXNoKG5leHRSb29tKVxyXG4gICAgICAgICAgICByb29tcy5wdXNoKG5leHRSb29tKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gW2NlbGxzLCByb29tc11cclxufVxyXG5cclxuZnVuY3Rpb24gdHJ5VHVubmVsRnJvbShjZWxsczogQ2VsbEdyaWQsIHRlbXBsYXRlczogUm9vbVRlbXBsYXRlW10sIHJvb206IFJvb20pOiBSb29tIHwgbnVsbCB7XHJcbiAgICByYW5kLnNodWZmbGUodGVtcGxhdGVzKVxyXG5cclxuICAgIHdoaWxlIChyb29tLnR1bm5lbFB0cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc3QgdHB0ID0gYXJyYXkucG9wKHJvb20udHVubmVsUHRzKVxyXG4gICAgICAgIGZvciAoY29uc3QgdGVtcGxhdGUgb2YgdGVtcGxhdGVzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5leHRSb29tID0gdHJ5VHVubmVsVG8oY2VsbHMsIHRwdCwgdGVtcGxhdGUpXHJcbiAgICAgICAgICAgIGlmIChuZXh0Um9vbSkge1xyXG4gICAgICAgICAgICAgICAgLy8gcGxhY2UgZG9vciBhdCB0dW5uZWwgcG9pbnRcclxuICAgICAgICAgICAgICAgIHJvb20udHVubmVsUHRzID0gcm9vbS50dW5uZWxQdHMuZmlsdGVyKHB0ID0+ICFwdC5lcXVhbCh0cHQpKVxyXG4gICAgICAgICAgICAgICAgY2VsbHMuc2V0UG9pbnQodHB0LCBDZWxsVHlwZS5Eb29yKVxyXG4gICAgICAgICAgICAgICAgbmV4dFJvb20uZGVwdGggPSByb29tLmRlcHRoICsgMVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5leHRSb29tXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeVR1bm5lbFRvKGNlbGxzOiBDZWxsR3JpZCwgdHB0MTogZ2VvLlBvaW50LCB0ZW1wbGF0ZTogUm9vbVRlbXBsYXRlKTogUm9vbSB8IG51bGwge1xyXG4gICAgLy8gZmluZCB0dW5uZWwgcG9pbnRzIG9mIHRlbXBsYXRlXHJcbiAgICBmb3IgKGNvbnN0IHRwdDIgb2YgdGVtcGxhdGUudHVubmVsUHRzKSB7XHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gdHB0MS5zdWJQb2ludCh0cHQyKVxyXG4gICAgICAgIGlmIChpc1ZhbGlkUGxhY2VtZW50KHRlbXBsYXRlLmNlbGxzLCBjZWxscywgb2Zmc2V0KSkge1xyXG4gICAgICAgICAgICByZXR1cm4gcGxhY2VUZW1wbGF0ZShjZWxscywgdGVtcGxhdGUsIG9mZnNldClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51bGxcclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VUZW1wbGF0ZShjZWxsczogQ2VsbEdyaWQsIHRlbXBsYXRlOiBSb29tVGVtcGxhdGUsIG9mZnNldDogZ2VvLlBvaW50KTogUm9vbSB7XHJcbiAgICBncmlkLmNvcHkodGVtcGxhdGUuY2VsbHMsIGNlbGxzLCBvZmZzZXQueCwgb2Zmc2V0LnkpXHJcblxyXG4gICAgLy8gZmluZCB0dW5uZWxhYmxlIHBvaW50c1xyXG4gICAgY29uc3QgaW50ZXJpb3JQdCA9IHRlbXBsYXRlLmludGVyaW9yUHQuYWRkUG9pbnQob2Zmc2V0KVxyXG4gICAgY29uc3QgdHVubmVsUHRzID0gdGVtcGxhdGUudHVubmVsUHRzLm1hcChwdCA9PiBwdC5hZGRQb2ludChvZmZzZXQpKS5maWx0ZXIocHQgPT4gZmluZEV4dGVyaW9yTmVpZ2hib3IoY2VsbHMsIHB0KSAhPT0gbnVsbClcclxuICAgIHJhbmQuc2h1ZmZsZSh0dW5uZWxQdHMpXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBpbnRlcmlvclB0LFxyXG4gICAgICAgIHR1bm5lbFB0cyxcclxuICAgICAgICBkZXB0aDogMFxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVJvb21UZW1wbGF0ZXMoKTogUm9vbVRlbXBsYXRlW10ge1xyXG4gICAgY29uc3QgbGVuZ3RocyA9IFs1LCA3LCA5LCAxMSwgMTMsIDE1XVxyXG4gICAgY29uc3QgcGFpcnMgPSBsZW5ndGhzLm1hcCh4ID0+IGxlbmd0aHMubWFwKHkgPT4gW3gsIHldKSkuZmxhdCgpLmZpbHRlcihhID0+IGFbMF0gPiAzIHx8IGFbMV0gPiAzKVxyXG4gICAgY29uc3QgdGVtcGxhdGVzID0gcGFpcnMubWFwKGEgPT4gZ2VuZXJhdGVSb29tVGVtcGxhdGUoYVswXSwgYVsxXSkpXHJcbiAgICByZXR1cm4gdGVtcGxhdGVzXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlUm9vbVRlbXBsYXRlKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogUm9vbVRlbXBsYXRlIHtcclxuICAgIGNvbnN0IGludGVyaW9yUHQgPSBuZXcgZ2VvLlBvaW50KHdpZHRoIC8gMiwgaGVpZ2h0IC8gMikuZmxvb3IoKVxyXG4gICAgY29uc3QgY2VsbHMgPSBncmlkLmdlbmVyYXRlKFxyXG4gICAgICAgIHdpZHRoLFxyXG4gICAgICAgIGhlaWdodCxcclxuICAgICAgICAoeCwgeSkgPT4geCA9PT0gMCB8fCB4ID09PSB3aWR0aCAtIDEgfHwgeSA9PT0gMCB8fCB5ID09PSBoZWlnaHQgLSAxID8gQ2VsbFR5cGUuV2FsbCA6IENlbGxUeXBlLkludGVyaW9yKVxyXG5cclxuICAgIGNvbnN0IHR1bm5lbFB0czogZ2VvLlBvaW50W10gPSBbXVxyXG4gICAgdHVubmVsUHRzLnB1c2goLi4uZ3JpZC5zY2FuKDEsIDAsIHdpZHRoIC0gMiwgMSkpXHJcbiAgICB0dW5uZWxQdHMucHVzaCguLi5ncmlkLnNjYW4oMCwgMSwgMSwgaGVpZ2h0IC0gMikpXHJcbiAgICB0dW5uZWxQdHMucHVzaCguLi5ncmlkLnNjYW4oMSwgaGVpZ2h0IC0gMSwgd2lkdGggLSAyLCAxKSlcclxuICAgIHR1bm5lbFB0cy5wdXNoKC4uLmdyaWQuc2Nhbih3aWR0aCAtIDEsIDEsIDEsIGhlaWdodCAtIDIpKVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgaW50ZXJpb3JQdCxcclxuICAgICAgICBjZWxscyxcclxuICAgICAgICB0dW5uZWxQdHNcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZmluZEV4dGVyaW9yTmVpZ2hib3IoY2VsbHM6IENlbGxHcmlkLCBwdDogZ2VvLlBvaW50KTogZ2VvLlBvaW50IHwgbnVsbCB7XHJcbiAgICBmb3IgKGNvbnN0IFt0LCBucHRdIG9mIGdyaWQudmlzaXROZWlnaGJvcnMoY2VsbHMsIHB0KSkge1xyXG4gICAgICAgIGlmICh0ID09PSBDZWxsVHlwZS5FeHRlcmlvcikge1xyXG4gICAgICAgICAgICByZXR1cm4gbnB0XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHZpc2l0SW50ZXJpb3JDb29yZHMoY2VsbHM6IENlbGxHcmlkLCBwdDA6IGdlby5Qb2ludCk6IEl0ZXJhYmxlPGdlby5Qb2ludD4ge1xyXG4gICAgcmV0dXJuIGl0ZXIubWFwKHZpc2l0SW50ZXJpb3IoY2VsbHMsIHB0MCksIHggPT4geFsxXSlcclxufVxyXG5cclxuZnVuY3Rpb24qIHZpc2l0SW50ZXJpb3IoY2VsbHM6IENlbGxHcmlkLCBwdDA6IGdlby5Qb2ludCk6IEl0ZXJhYmxlPFtDZWxsVHlwZSwgZ2VvLlBvaW50XT4ge1xyXG4gICAgY29uc3QgZXhwbG9yZWQgPSBjZWxscy5tYXAyKCgpID0+IGZhbHNlKVxyXG4gICAgY29uc3Qgc3RhY2sgPSBbcHQwXVxyXG5cclxuICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc3QgcHQgPSBhcnJheS5wb3Aoc3RhY2spXHJcbiAgICAgICAgZXhwbG9yZWQuc2V0UG9pbnQocHQsIHRydWUpXHJcbiAgICAgICAgY29uc3QgdCA9IGNlbGxzLmF0UG9pbnQocHQpXHJcbiAgICAgICAgeWllbGQgW3QsIHB0XVxyXG5cclxuICAgICAgICAvLyBpZiB0aGlzIGlzIGEgd2FsbCwgZG8gbm90IGV4cGxvcmUgbmVpZ2hib3JzXHJcbiAgICAgICAgaWYgKHQgPT09IENlbGxUeXBlLldhbGwpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIG90aGVyd2lzZSwgZXhwbG9yZSBuZWlnaGJvcnMsIHB1c2hpbmcgb250byBzdGFjayB0aG9zZSB0aGF0IGFyZSB1bmV4cGxvcmVkXHJcbiAgICAgICAgZm9yIChjb25zdCBbdCwgbnB0XSBvZiBncmlkLnZpc2l0TmVpZ2hib3JzKGNlbGxzLCBwdCkpIHtcclxuICAgICAgICAgICAgaWYgKGV4cGxvcmVkLmF0UG9pbnQobnB0KSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHQgIT09IENlbGxUeXBlLkludGVyaW9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBzdGFjay5wdXNoKG5wdClcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmFsaWRQbGFjZW1lbnQoc3JjOiBDZWxsR3JpZCwgZHN0OiBDZWxsR3JpZCwgb2Zmc2V0OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgIGlmICghZHN0LnJlZ2lvbkluQm91bmRzKG9mZnNldC54LCBvZmZzZXQueSwgc3JjLndpZHRoLCBzcmMuaGVpZ2h0KSkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgW3N0LCB4LCB5XSBvZiBzcmMuc2NhbigpKSB7XHJcbiAgICAgICAgLy8gcnVsZXM6XHJcbiAgICAgICAgLy8gY2FuIHBsYWNlIHdhbGwgb3ZlciB3YWxsXHJcbiAgICAgICAgLy8gY2FuIHBsYWNlIGFueXRoaW5nIG92ZXIgZXh0ZXJpb3JcclxuICAgICAgICBjb25zdCBkdCA9IGRzdC5hdCh4ICsgb2Zmc2V0LngsIHkgKyBvZmZzZXQueSlcclxuICAgICAgICBpZiAoZHQgPT09IENlbGxUeXBlLkV4dGVyaW9yKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZHQgPT09IENlbGxUeXBlLldhbGwgJiYgc3QgPT09IENlbGxUeXBlLldhbGwpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlXHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5lcmF0ZU91dGRvb3JNYXAocmVuZGVyZXI6IGdmeC5SZW5kZXJlciwgcGxheWVyOiBybC5QbGF5ZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogUHJvbWlzZTxtYXBzLk1hcD4ge1xyXG4gICAgY29uc3QgbWFwID0gbmV3IG1hcHMuTWFwKHdpZHRoLCBoZWlnaHQsIHBsYXllcilcclxuICAgIG1hcC5saWdodGluZyA9IG1hcHMuTGlnaHRpbmcuQW1iaWVudFxyXG5cclxuICAgIHBsYXllci5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoMCwgMClcclxuICAgIGdlbmVyYXRlT3V0ZG9vclRlcnJhaW4obWFwKVxyXG4gICAgYXdhaXQgbG9hZFNwcml0ZVRleHR1cmVzKHJlbmRlcmVyLCBtYXApXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmVudW0gT3V0ZG9vclRpbGVUeXBlIHtcclxuICAgIHdhdGVyLFxyXG4gICAgZ3Jhc3MsXHJcbiAgICBkaXJ0LFxyXG4gICAgc2FuZFxyXG59XHJcblxyXG5lbnVtIE91dGRvb3JGaXh0dXJlVHlwZSB7XHJcbiAgICBub25lLFxyXG4gICAgaGlsbHMsXHJcbiAgICBtb3VudGFpbnMsXHJcbiAgICB0cmVlcyxcclxuICAgIHNub3dcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVPdXRkb29yVGVycmFpbihtYXA6IG1hcHMuTWFwKSB7XHJcbiAgICBjb25zdCB0aWxlcyA9IGdyaWQuZ2VuZXJhdGUobWFwLndpZHRoLCBtYXAuaGVpZ2h0LCAoKSA9PiBPdXRkb29yVGlsZVR5cGUud2F0ZXIpXHJcbiAgICBjb25zdCBmaXh0dXJlcyA9IGdyaWQuZ2VuZXJhdGUobWFwLndpZHRoLCBtYXAuaGVpZ2h0LCAoKSA9PiBPdXRkb29yRml4dHVyZVR5cGUubm9uZSlcclxuXHJcbiAgICAvLyBUT0RPIC0gcmFuZG9tbHkgYmlhcyBwZXJsaW4gbm9pc2UgaW5zdGVhZFxyXG4gICAgLy8gY29uc3QgYmlhcz0gcmFuZC5pbnQoMCwgMjU2KVxyXG4gICAgY29uc3QgYmlhcyA9IDBcclxuXHJcbiAgICBjb25zdCBoZWlnaHRNYXAgPSBmYm0obWFwLndpZHRoLCBtYXAuaGVpZ2h0LCBiaWFzLCA4IC8gbWFwLndpZHRoLCAyLCAuNSwgOClcclxuXHJcbiAgICBpbWFnaW5nLnNjYW4obWFwLndpZHRoLCBtYXAuaGVpZ2h0LCAoeCwgeSwgb2Zmc2V0KSA9PiB7XHJcbiAgICAgICAgY29uc3QgaCA9IGhlaWdodE1hcFtvZmZzZXRdXHJcbiAgICAgICAgaWYgKGggPiAwKSB7XHJcbiAgICAgICAgICAgIHRpbGVzLnNldCh4LCB5LCBPdXRkb29yVGlsZVR5cGUuZGlydClcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG5cclxuICAgIG1hcC5wbGF5ZXIucG9zaXRpb24gPSB0aWxlcy5maW5kUG9pbnQodCA9PiB0ICE9PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpID8/IG5ldyBnZW8uUG9pbnQoMCwgMClcclxuXHJcbiAgICBmb3IgKGNvbnN0IFt0LCB4LCB5XSBvZiB0aWxlcy5zY2FuKCkpIHtcclxuICAgICAgICBzd2l0Y2ggKHQpIHtcclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vclRpbGVUeXBlLndhdGVyKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRoaW5ncy53YXRlci5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICB0aWxlLnBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLnRpbGVzLmFkZCh0aWxlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vclRpbGVUeXBlLmRpcnQpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gdGhpbmdzLmRpcnQuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgdGlsZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5hZGQodGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JUaWxlVHlwZS5ncmFzcyk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aGluZ3MuZ3Jhc3MuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgdGlsZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5hZGQodGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JUaWxlVHlwZS5zYW5kKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRoaW5ncy5zYW5kLmNsb25lKClcclxuICAgICAgICAgICAgICAgIHRpbGUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuYWRkKHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgW2YsIHgsIHldIG9mIGZpeHR1cmVzLnNjYW4oKSkge1xyXG4gICAgICAgIHN3aXRjaCAoZikge1xyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yRml4dHVyZVR5cGUuaGlsbHMpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaXh0dXJlID0gdGhpbmdzLmhpbGxzLmNsb25lKClcclxuICAgICAgICAgICAgICAgIGZpeHR1cmUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAuZml4dHVyZXMuYWRkKGZpeHR1cmUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yRml4dHVyZVR5cGUubW91bnRhaW5zKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZml4dHVyZSA9IHRoaW5ncy5tb3VudGFpbnMuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgZml4dHVyZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC5maXh0dXJlcy5hZGQoZml4dHVyZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JGaXh0dXJlVHlwZS50cmVlcyk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeHR1cmUgPSB0aGluZ3MudHJlZXMuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgZml4dHVyZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC5maXh0dXJlcy5hZGQoZml4dHVyZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JGaXh0dXJlVHlwZS5zbm93KToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZml4dHVyZSA9IHRoaW5ncy5zbm93LmNsb25lKClcclxuICAgICAgICAgICAgICAgIGZpeHR1cmUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAuZml4dHVyZXMuYWRkKGZpeHR1cmUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZUxhbmRtYXNzZXModGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+KSB7XHJcbiAgICBjb25zdCBtYXhUaWxlcyA9IE1hdGguY2VpbCh0aWxlcy5zaXplICogcmFuZC5mbG9hdCguMywgLjUpKVxyXG4gICAgZ3Jvd0xhbmQodGlsZXMsIG1heFRpbGVzKVxyXG5cclxuICAgIC8vIGZpbmQgbWF4aW1hbCB3YXRlciByZWN0IC0gaWYgbGFyZ2UgZW5vdWdoLCBwbGFudCBpc2xhbmRcclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgY29uc3QgYWFiYiA9IGdyaWQuZmluZE1heGltYWxSZWN0KHRpbGVzLCB0ID0+IHQgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikuc2hyaW5rKDEpXHJcbiAgICAgICAgaWYgKGFhYmIuYXJlYSA8IDEyKSB7XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB2aWV3ID0gdGlsZXMudmlld0FBQkIoYWFiYilcclxuICAgICAgICBjb25zdCBpc2xhbmRUaWxlcyA9IGFhYmIuYXJlYSAqIHJhbmQuZmxvYXQoLjI1LCAxKVxyXG4gICAgICAgIGdyb3dMYW5kKHZpZXcsIGlzbGFuZFRpbGVzKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIHBsYWNlIHNvbWUgaXNsYW5kc1xyXG4gICAgcGxhY2VCZWFjaGVzKHRpbGVzKVxyXG59XHJcblxyXG5mdW5jdGlvbiBncm93TGFuZCh0aWxlczogZ3JpZC5HcmlkPE91dGRvb3JUaWxlVHlwZT4sIG1heFRpbGVzOiBudW1iZXIpIHtcclxuICAgIC8vIFwicGxhbnRcIiBhIGNvbnRpbmVudFxyXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgQXJyYXk8Z2VvLlBvaW50PigpXHJcbiAgICBjb25zdCBzZWVkID0gbmV3IGdlby5Qb2ludCh0aWxlcy53aWR0aCAvIDIsIHRpbGVzLmhlaWdodCAvIDIpLmZsb29yKClcclxuICAgIHN0YWNrLnB1c2goc2VlZClcclxuICAgIGxldCBwbGFjZWQgPSAwXHJcblxyXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDAgJiYgcGxhY2VkIDwgbWF4VGlsZXMpIHtcclxuICAgICAgICBjb25zdCBwdCA9IGFycmF5LnBvcChzdGFjaylcclxuICAgICAgICB0aWxlcy5zZXRQb2ludChwdCwgT3V0ZG9vclRpbGVUeXBlLmdyYXNzKVxyXG4gICAgICAgICsrcGxhY2VkXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgW3QsIHh5XSBvZiBncmlkLnZpc2l0TmVpZ2hib3JzKHRpbGVzLCBwdCkpIHtcclxuICAgICAgICAgICAgaWYgKHQgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh4eSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmFuZC5zaHVmZmxlKHN0YWNrKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZUJlYWNoZXModGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+KSB7XHJcbiAgICBmb3IgKGNvbnN0IHB0IG9mIGdyaWQuc2NhbigwLCAwLCB0aWxlcy53aWR0aCwgdGlsZXMuaGVpZ2h0KSkge1xyXG4gICAgICAgIGlmICh0aWxlcy5hdFBvaW50KHB0KSA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocHQueCA+IDAgJiYgdGlsZXMuYXQocHQueCAtIDEsIHB0LnkpID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgdGlsZXMuc2V0UG9pbnQocHQsIE91dGRvb3JUaWxlVHlwZS5zYW5kKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHB0LnggPCB0aWxlcy53aWR0aCAtIDEgJiYgdGlsZXMuYXQocHQueCArIDEsIHB0LnkpID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgdGlsZXMuc2V0UG9pbnQocHQsIE91dGRvb3JUaWxlVHlwZS5zYW5kKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHB0LnkgPiAwICYmIHRpbGVzLmF0KHB0LngsIHB0LnkgLSAxKSA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgIHRpbGVzLnNldFBvaW50KHB0LCBPdXRkb29yVGlsZVR5cGUuc2FuZClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwdC55IDwgdGlsZXMuaGVpZ2h0IC0gMSAmJiB0aWxlcy5hdChwdC54LCBwdC55ICsgMSkgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICB0aWxlcy5zZXRQb2ludChwdCwgT3V0ZG9vclRpbGVUeXBlLnNhbmQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZVNub3codGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+LCBmaXh0dXJlczogZ3JpZC5HcmlkPE91dGRvb3JGaXh0dXJlVHlwZT4pIHtcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gdGlsZXNcclxuICAgIGNvbnN0IHNub3dIZWlnaHQgPSBNYXRoLmNlaWwoaGVpZ2h0IC8gMylcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgc25vd0hlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHQgPSB0aWxlcy5hdCh4LCB5KVxyXG4gICAgICAgICAgICBpZiAodCAhPT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgICAgICBmaXh0dXJlcy5zZXQoeCwgeSwgT3V0ZG9vckZpeHR1cmVUeXBlLnNub3cpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlTW91bnRhaW5zKHRpbGVzOiBncmlkLkdyaWQ8T3V0ZG9vclRpbGVUeXBlPiwgZml4dHVyZXM6IGdyaWQuR3JpZDxPdXRkb29yRml4dHVyZVR5cGU+LCBtYXhUaWxlczogbnVtYmVyKSB7XHJcbiAgICAvLyBmaW5kIGEgc3VpdGFibGUgc3RhcnQgcG9pbnQgZm9yIG1vdW50YWluIHJhbmdlXHJcbiAgICBjb25zdCBzZWVkID0gcmFuZC5jaG9vc2UoWy4uLnRpbGVzLmZpbmRQb2ludHMoeCA9PiB4ICE9PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIgJiYgeCAhPT0gT3V0ZG9vclRpbGVUeXBlLnNhbmQpXSlcclxuICAgIGNvbnN0IHN0YWNrID0gbmV3IEFycmF5PGdlby5Qb2ludD4oKVxyXG4gICAgc3RhY2sucHVzaChzZWVkKVxyXG4gICAgbGV0IHBsYWNlZCA9IDBcclxuXHJcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCAmJiBwbGFjZWQgPCBtYXhUaWxlcykge1xyXG4gICAgICAgIGNvbnN0IHB0ID0gYXJyYXkucG9wKHN0YWNrKVxyXG4gICAgICAgIGZpeHR1cmVzLnNldFBvaW50KHB0LCBPdXRkb29yRml4dHVyZVR5cGUubW91bnRhaW5zKVxyXG4gICAgICAgICsrcGxhY2VkXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgW3QsIHh5XSBvZiBncmlkLnZpc2l0TmVpZ2hib3JzKHRpbGVzLCBwdCkpIHtcclxuICAgICAgICAgICAgaWYgKHQgIT09IE91dGRvb3JUaWxlVHlwZS53YXRlciAmJiB0ICE9PSBPdXRkb29yVGlsZVR5cGUuc2FuZCkge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh4eSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmFuZC5zaHVmZmxlKHN0YWNrKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZFNwcml0ZVRleHR1cmVzKHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIG1hcDogbWFwcy5NYXApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIC8vIGJha2UgYWxsIDI0eDI0IHRpbGUgaW1hZ2VzIHRvIGEgc2luZ2xlIGFycmF5IHRleHR1cmVcclxuICAgIC8vIHN0b3JlIG1hcHBpbmcgZnJvbSBpbWFnZSB1cmwgdG8gaW5kZXhcclxuICAgIGNvbnN0IGltYWdlVXJscyA9IGl0ZXIud3JhcChtYXApLm1hcCh0aCA9PiB0aC5pbWFnZSkuZmlsdGVyKCkuZGlzdGluY3QoKS50b0FycmF5KClcclxuICAgIGNvbnN0IGxheWVyTWFwID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oaW1hZ2VVcmxzLm1hcCgodXJsLCBpKSA9PiBbdXJsLCBpXSkpXHJcbiAgICBjb25zdCBpbWFnZXMgPSBhd2FpdCBQcm9taXNlLmFsbChpbWFnZVVybHMubWFwKHVybCA9PiBkb20ubG9hZEltYWdlKHVybCkpKVxyXG4gICAgY29uc3QgdGV4dHVyZSA9IHJlbmRlcmVyLmJha2VUZXh0dXJlQXJyYXkocmwudGlsZVNpemUsIHJsLnRpbGVTaXplLCBpbWFnZXMpXHJcblxyXG4gICAgZm9yIChjb25zdCB0aCBvZiBtYXApIHtcclxuICAgICAgICBpZiAoIXRoLmltYWdlKSB7XHJcbiAgICAgICAgICAgIHRoLnRleHR1cmVMYXllciA9IC0xXHJcbiAgICAgICAgICAgIHRoLnRleHR1cmUgPSBudWxsXHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBsYXllciA9IGxheWVyTWFwLmdldCh0aC5pbWFnZSlcclxuICAgICAgICBpZiAobGF5ZXIgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHRleHR1cmUgaW5kZXggbm90IGZvdW5kIGZvciAke3RoLmltYWdlfWApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aC50ZXh0dXJlID0gdGV4dHVyZVxyXG4gICAgICAgIHRoLnRleHR1cmVMYXllciA9IGxheWVyXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZibSh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgYmlhczogbnVtYmVyLCBmcmVxOiBudW1iZXIsIGxhY3VuYXJpdHk6IG51bWJlciwgZ2FpbjogbnVtYmVyLCBvY3RhdmVzOiBudW1iZXIpOiBudW1iZXJbXSB7XHJcbiAgICByZXR1cm4gaW1hZ2luZy5nZW5lcmF0ZSh3aWR0aCwgaGVpZ2h0LCAoeCwgeSkgPT4ge1xyXG4gICAgICAgIHJldHVybiBub2lzZS5mYm1QZXJsaW4yKHggKiBmcmVxICsgYmlhcywgeSAqIGZyZXEgKyBiaWFzLCBsYWN1bmFyaXR5LCBnYWluLCBvY3RhdmVzKVxyXG4gICAgfSlcclxufSJdfQ==