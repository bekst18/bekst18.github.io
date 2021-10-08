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
    /*
    things.bat.clone(),
    things.skeleton.clone(),
    things.greenSlime.clone(),
    things.redSlime.clone(),
    things.spider.clone(),
    things.rat.clone(),
    */
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
export async function generateDungeonLevel(rng, renderer, player, width, height) {
    const map = generateMapRooms(rng, width, height, player);
    map.lighting = maps.Lighting.None;
    await loadSpriteTextures(renderer, map);
    return map;
}
function generateMapRooms(rng, width, height, player) {
    const map = new maps.Map(width, height, 1, player);
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
        if (iter.any(map, th => { var _a, _b; return ((_b = (_a = th.position) === null || _a === void 0 ? void 0 : _a.equal(pt)) !== null && _b !== void 0 ? _b : false) && !th.passable; })) {
            continue;
        }
        const monster = rand.choose(rng, monsters).clone();
        monster.position = pt.clone();
        map.monsters.add(monster);
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
        if (iter.any(map, th => { var _a, _b; return ((_b = (_a = th.position) === null || _a === void 0 ? void 0 : _a.equal(pt)) !== null && _b !== void 0 ? _b : false) && !th.passable; })) {
            continue;
        }
        const chest = things.chest.clone();
        chest.position = pt.clone();
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
        map.containers.add(chest);
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
export async function generateOutdoorMap(renderer, player, width, height) {
    const map = new maps.Map(width, height, 0, player);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0gsT0FBTyxLQUFLLEVBQUUsTUFBTSxTQUFTLENBQUE7QUFDN0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBRWpDLE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssT0FBTyxNQUFNLHNCQUFzQixDQUFBO0FBVS9DLE1BQU0sT0FBTyxHQUFtQjtJQUM1QixJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUU7SUFDOUIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFO0lBQzNCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTtJQUN6QixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7SUFDakMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFO0NBQ3hDLENBQUE7QUFFRCxNQUFNLFFBQVEsR0FBRztJQUNiOzs7Ozs7O01BT0U7SUFDRixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTtJQUNuQixNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRTtDQUN2QixDQUFBO0FBRUQsTUFB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LEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLGVBQWUsQ0FBQyxLQUFLLEVBQUU7WUFDaEUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO1NBQzNDO1FBRUQsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLGVBQWUsQ0FBQyxLQUFLLEVBQUU7WUFDOUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO1NBQzNDO1FBRUQsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxlQUFlLENBQUMsS0FBSyxFQUFFO1lBQ2hFLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtTQUMzQztRQUVELElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxlQUFlLENBQUMsS0FBSyxFQUFFO1lBQy9FLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtTQUMzQztLQUNKO0FBQ0wsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLEtBQWlDLEVBQUUsUUFBdUM7SUFDekYsTUFBTSxFQUFFLEtBQUssRUFB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LFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFFM0UsS0FBSyxNQUFNLEVBQUUsSUFBSSxHQUFHLEVBQUU7UUFDbEIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUU7WUFDWCxFQUFFLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3BCLEVBQUUsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO1lBQ2pCLFNBQVE7U0FDWDtRQUVELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BDLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTtZQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtTQUM3RDtRQUVELEVBQUUsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1FBQ3BCLEVBQUUsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFBO0tBQzFCO0FBQ0wsQ0FBQztBQUVELFNBQVMsR0FBRyxDQUFDLEtBQWEsRUFBRSxNQUFjLEVBQUUsSUFBWSxFQUFFLElBQVksRUFBRSxVQUFrQixFQUFFLElBQVksRUFBRSxPQUFlO0lBQ3JILE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzVDLE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3hGLENBQUMsQ0FBQyxDQUFBO0FBQ04sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBtYXAgZ2VuZXJhdGlvbiBsaWJyYXJ5XHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBybCBmcm9tIFwiLi9ybC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgZ3JpZCBmcm9tIFwiLi4vc2hhcmVkL2dyaWQuanNcIlxyXG5pbXBvcnQgKiBhcyBhcnJheSBmcm9tIFwiLi4vc2hhcmVkL2FycmF5LmpzXCJcclxuaW1wb3J0ICogYXMgaXRlciBmcm9tIFwiLi4vc2hhcmVkL2l0ZXIuanNcIlxyXG5pbXBvcnQgKiBhcyByYW5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiXHJcbmltcG9ydCAqIGFzIHRoaW5ncyBmcm9tIFwiLi90aGluZ3MuanNcIlxyXG5pbXBvcnQgKiBhcyBtYXBzIGZyb20gXCIuL21hcHMuanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgbm9pc2UgZnJvbSBcIi4uL3NoYXJlZC9ub2lzZS5qc1wiXHJcbmltcG9ydCAqIGFzIGltYWdpbmcgZnJvbSBcIi4uL3NoYXJlZC9pbWFnaW5nLmpzXCJcclxuXHJcbmludGVyZmFjZSBEdW5nZW9uVGlsZXNldCB7XHJcbiAgICB3YWxsOiBybC5UaWxlLFxyXG4gICAgZmxvb3I6IHJsLlRpbGUsXHJcbiAgICBkb29yOiBybC5Eb29yLFxyXG4gICAgc3RhaXJzVXA6IHJsLlN0YWlyc1VwXHJcbiAgICBzdGFpcnNEb3duOiBybC5TdGFpcnNEb3duXHJcbn1cclxuXHJcbmNvbnN0IHRpbGVzZXQ6IER1bmdlb25UaWxlc2V0ID0ge1xyXG4gICAgd2FsbDogdGhpbmdzLmJyaWNrV2FsbC5jbG9uZSgpLFxyXG4gICAgZmxvb3I6IHRoaW5ncy5mbG9vci5jbG9uZSgpLFxyXG4gICAgZG9vcjogdGhpbmdzLmRvb3IuY2xvbmUoKSxcclxuICAgIHN0YWlyc1VwOiB0aGluZ3Muc3RhaXJzVXAuY2xvbmUoKSxcclxuICAgIHN0YWlyc0Rvd246IHRoaW5ncy5zdGFpcnNEb3duLmNsb25lKClcclxufVxyXG5cclxuY29uc3QgbW9uc3RlcnMgPSBbXHJcbiAgICAvKlxyXG4gICAgdGhpbmdzLmJhdC5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLnNrZWxldG9uLmNsb25lKCksXHJcbiAgICB0aGluZ3MuZ3JlZW5TbGltZS5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLnJlZFNsaW1lLmNsb25lKCksXHJcbiAgICB0aGluZ3Muc3BpZGVyLmNsb25lKCksXHJcbiAgICB0aGluZ3MucmF0LmNsb25lKCksXHJcbiAgICAqL1xyXG4gICAgdGhpbmdzLnJlZHkuY2xvbmUoKSxcclxuICAgIHRoaW5ncy5maWRlci5jbG9uZSgpLFxyXG5dXHJcblxyXG5jb25zdCBsb290ID0gW1xyXG4gICAgdGhpbmdzLmNsb3RoQXJtb3IuY2xvbmUoKSxcclxuICAgIHRoaW5ncy5zaGFycFN0aWNrLmNsb25lKCksXHJcbiAgICB0aGluZ3MuZGFnZ2VyLmNsb25lKCksXHJcbiAgICB0aGluZ3MubGVhdGhlckFybW9yLmNsb25lKCksXHJcbiAgICB0aGluZ3Mud29vZGVuQm93LmNsb25lKCksXHJcbiAgICB0aGluZ3Muc2xpbmdTaG90LmNsb25lKCksXHJcbiAgICB0aGluZ3Mud2Vha0hlYWx0aFBvdGlvbi5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLmhlYWx0aFBvdGlvbi5jbG9uZSgpXHJcbl1cclxuXHJcbmVudW0gQ2VsbFR5cGUge1xyXG4gICAgRXh0ZXJpb3IsXHJcbiAgICBJbnRlcmlvcixcclxuICAgIFdhbGwsXHJcbiAgICBEb29yXHJcbn1cclxuXHJcbnR5cGUgQ2VsbEdyaWQgPSBncmlkLkdyaWQ8Q2VsbFR5cGU+XHJcblxyXG5pbnRlcmZhY2UgUm9vbVRlbXBsYXRlIHtcclxuICAgIGNlbGxzOiBDZWxsR3JpZFxyXG4gICAgaW50ZXJpb3JQdDogZ2VvLlBvaW50XHJcbiAgICB0dW5uZWxQdHM6IGdlby5Qb2ludFtdXHJcbn1cclxuXHJcbmludGVyZmFjZSBSb29tIHtcclxuICAgIGludGVyaW9yUHQ6IGdlby5Qb2ludFxyXG4gICAgdHVubmVsUHRzOiBnZW8uUG9pbnRbXVxyXG4gICAgZGVwdGg6IG51bWJlcixcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlRHVuZ2VvbkxldmVsKHJuZzogcmFuZC5STkcsIHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIHBsYXllcjogcmwuUGxheWVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFByb21pc2U8bWFwcy5NYXA+IHtcclxuICAgIGNvbnN0IG1hcCA9IGdlbmVyYXRlTWFwUm9vbXMocm5nLCB3aWR0aCwgaGVpZ2h0LCBwbGF5ZXIpXHJcbiAgICBtYXAubGlnaHRpbmcgPSBtYXBzLkxpZ2h0aW5nLk5vbmVcclxuICAgIGF3YWl0IGxvYWRTcHJpdGVUZXh0dXJlcyhyZW5kZXJlciwgbWFwKVxyXG4gICAgcmV0dXJuIG1hcFxyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZU1hcFJvb21zKHJuZzogcmFuZC5STkcsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBwbGF5ZXI6IHJsLlBsYXllcik6IG1hcHMuTWFwIHtcclxuICAgIGNvbnN0IG1hcCA9IG5ldyBtYXBzLk1hcCh3aWR0aCwgaGVpZ2h0LCAxLCBwbGF5ZXIpXHJcbiAgICBjb25zdCBtaW5Sb29tcyA9IDRcclxuXHJcbiAgICBjb25zdCBbY2VsbHMsIHJvb21zXSA9ICgoKSA9PiB7XHJcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgY29uc3QgW2NlbGxzLCByb29tc10gPSBnZW5lcmF0ZUNlbGxHcmlkKHJuZywgd2lkdGgsIGhlaWdodClcclxuICAgICAgICAgICAgaWYgKHJvb21zLmxlbmd0aCA+IG1pblJvb21zKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW2NlbGxzLCByb29tc11cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pKCkgYXMgW0NlbGxHcmlkLCBSb29tW11dXHJcblxyXG4gICAgY29uc3QgZmlyc3RSb29tID0gcm9vbXMucmVkdWNlKCh4LCB5KSA9PiB4LmRlcHRoIDwgeS5kZXB0aCA/IHggOiB5KVxyXG4gICAgbWFwLnBsYXllci5wb3NpdGlvbiA9IGZpcnN0Um9vbS5pbnRlcmlvclB0LmNsb25lKClcclxuXHJcbiAgICBjb25zdCBzdGFpcnNVcCA9IHRpbGVzZXQuc3RhaXJzVXAuY2xvbmUoKVxyXG4gICAgY29uc3Qgc3RhaXJzVXBQb3NpdGlvbiA9IGl0ZXIuZmluZCh2aXNpdEludGVyaW9yQ29vcmRzKGNlbGxzLCBmaXJzdFJvb20uaW50ZXJpb3JQdCksIHB0ID0+IGl0ZXIuYW55KGdyaWQudmlzaXROZWlnaGJvcnMoY2VsbHMsIHB0KSwgYSA9PiBhWzBdID09PSBDZWxsVHlwZS5XYWxsKSlcclxuICAgIGlmICghc3RhaXJzVXBQb3NpdGlvbikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBwbGFjZSBzdGFpcnMgdXBcIilcclxuICAgIH1cclxuXHJcbiAgICBzdGFpcnNVcC5wb3NpdGlvbiA9IHN0YWlyc1VwUG9zaXRpb24uY2xvbmUoKVxyXG4gICAgbWFwLmZpeHR1cmVzLmFkZChzdGFpcnNVcClcclxuXHJcbiAgICBjb25zdCBsYXN0Um9vbSA9IHJvb21zLnJlZHVjZSgoeCwgeSkgPT4geC5kZXB0aCA+IHkuZGVwdGggPyB4IDogeSlcclxuICAgIGNvbnN0IHN0YWlyc0Rvd24gPSB0aWxlc2V0LnN0YWlyc0Rvd24uY2xvbmUoKVxyXG4gICAgY29uc3Qgc3RhaXJzRG93blBvc2l0aW9uID0gaXRlci5maW5kKHZpc2l0SW50ZXJpb3JDb29yZHMoY2VsbHMsIGxhc3RSb29tLmludGVyaW9yUHQpLCBwdCA9PiBpdGVyLmFueShncmlkLnZpc2l0TmVpZ2hib3JzKGNlbGxzLCBwdCksIGEgPT4gYVswXSA9PT0gQ2VsbFR5cGUuV2FsbCkpXHJcbiAgICBpZiAoIXN0YWlyc0Rvd25Qb3NpdGlvbikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBwbGFjZSBzdGFpcnMgZG93blwiKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YWlyc0Rvd24ucG9zaXRpb24gPSBzdGFpcnNEb3duUG9zaXRpb24uY2xvbmUoKVxyXG4gICAgbWFwLmZpeHR1cmVzLmFkZChzdGFpcnNEb3duKVxyXG5cclxuICAgIC8vIGdlbmVyYXRlIHRpbGVzIGFuZCBmaXh0dXJlcyBmcm9tIGNlbGxzXHJcbiAgICBmb3IgKGNvbnN0IFt2LCB4LCB5XSBvZiBjZWxscy5zY2FuKCkpIHtcclxuICAgICAgICBpZiAodiA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3dpdGNoICh2KSB7XHJcbiAgICAgICAgICAgIGNhc2UgQ2VsbFR5cGUuRXh0ZXJpb3I6XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBDZWxsVHlwZS5JbnRlcmlvcjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRpbGVzZXQuZmxvb3IuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgdGlsZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5hZGQodGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ2VsbFR5cGUuV2FsbDoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRpbGVzZXQud2FsbC5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICB0aWxlLnBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLnRpbGVzLmFkZCh0aWxlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBDZWxsVHlwZS5Eb29yOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaXh0dXJlID0gdGlsZXNldC5kb29yLmNsb25lKClcclxuICAgICAgICAgICAgICAgIGZpeHR1cmUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAuZml4dHVyZXMuYWRkKGZpeHR1cmUpXHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRpbGVzZXQuZmxvb3IuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgdGlsZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5hZGQodGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcGxhY2VNb25zdGVycyhybmcsIGNlbGxzLCByb29tcywgbWFwKVxyXG4gICAgcGxhY2VUcmVhc3VyZXMocm5nLCBjZWxscywgcm9vbXMsIG1hcClcclxuXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlTW9uc3RlcnMocm5nOiByYW5kLlJORywgY2VsbHM6IENlbGxHcmlkLCByb29tczogUm9vbVtdLCBtYXA6IG1hcHMuTWFwKSB7XHJcbiAgICAvLyBpdGVyYXRlIG92ZXIgcm9vbXMsIGRlY2lkZSB3aGV0aGVyIHRvIHBsYWNlIGEgbW9uc3RlciBpbiBlYWNoIHJvb21cclxuICAgIGNvbnN0IGVuY291bnRlckNoYW5jZSA9IC4zNVxyXG4gICAgY29uc3Qgc2Vjb25kRW5jb3VudGVyQ2hhbmNlID0gLjJcclxuICAgIGNvbnN0IHRoaXJkRW5jb3VudGVyQ2hhbmNlID0gLjFcclxuXHJcbiAgICBmb3IgKGNvbnN0IHJvb20gb2Ygcm9vbXMpIHtcclxuICAgICAgICBpZiAocm9vbS5kZXB0aCA8PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJhbmQuY2hhbmNlKHJuZywgZW5jb3VudGVyQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5UGxhY2VNb25zdGVyKHJuZywgY2VsbHMsIHJvb20sIG1hcClcclxuXHJcbiAgICAgICAgaWYgKCFyYW5kLmNoYW5jZShybmcsIHNlY29uZEVuY291bnRlckNoYW5jZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeVBsYWNlTW9uc3RlcihybmcsIGNlbGxzLCByb29tLCBtYXApXHJcblxyXG4gICAgICAgIGlmICghcmFuZC5jaGFuY2Uocm5nLCB0aGlyZEVuY291bnRlckNoYW5jZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeVBsYWNlTW9uc3RlcihybmcsIGNlbGxzLCByb29tLCBtYXApXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeVBsYWNlTW9uc3Rlcihybmc6IHJhbmQuUk5HLCBjZWxsczogQ2VsbEdyaWQsIHJvb206IFJvb20sIG1hcDogbWFwcy5NYXApOiBib29sZWFuIHtcclxuICAgIC8vIGF0dGVtcHQgdG8gcGxhY2UgbW9uc3RlclxyXG4gICAgZm9yIChjb25zdCBbdCwgcHRdIG9mIHZpc2l0SW50ZXJpb3IoY2VsbHMsIHJvb20uaW50ZXJpb3JQdCkpIHtcclxuICAgICAgICBpZiAodCAhPT0gQ2VsbFR5cGUuSW50ZXJpb3IpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpdGVyLmFueShtYXAsIHRoID0+ICh0aC5wb3NpdGlvbj8uZXF1YWwocHQpID8/IGZhbHNlKSAmJiAhdGgucGFzc2FibGUpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtb25zdGVyID0gcmFuZC5jaG9vc2Uocm5nLCBtb25zdGVycykuY2xvbmUoKVxyXG4gICAgICAgIG1vbnN0ZXIucG9zaXRpb24gPSBwdC5jbG9uZSgpXHJcbiAgICAgICAgbWFwLm1vbnN0ZXJzLmFkZChtb25zdGVyKVxyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZVRyZWFzdXJlcyhybmc6IHJhbmQuUk5HLCBjZWxsczogQ2VsbEdyaWQsIHJvb21zOiBSb29tW10sIG1hcDogbWFwcy5NYXApIHtcclxuICAgIC8vIGl0ZXJhdGUgb3ZlciByb29tcywgZGVjaWRlIHdoZXRoZXIgdG8gcGxhY2UgYSBtb25zdGVyIGluIGVhY2ggcm9vbVxyXG4gICAgY29uc3QgdHJlYXN1cmVDaGFuY2UgPSAuMlxyXG5cclxuICAgIGZvciAoY29uc3Qgcm9vbSBvZiByb29tcykge1xyXG4gICAgICAgIGlmIChyb29tLmRlcHRoIDw9IDApIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghcmFuZC5jaGFuY2Uocm5nLCB0cmVhc3VyZUNoYW5jZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeVBsYWNlVHJlYXN1cmUocm5nLCBjZWxscywgcm9vbSwgbWFwKVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gdHJ5UGxhY2VUcmVhc3VyZShybmc6IHJhbmQuUk5HLCBjZWxsczogQ2VsbEdyaWQsIHJvb206IFJvb20sIG1hcDogbWFwcy5NYXApOiBib29sZWFuIHtcclxuICAgIC8vIGF0dGVtcHQgdG8gcGxhY2UgdHJlYXN1cmVcclxuICAgIGZvciAoY29uc3QgW3QsIHB0XSBvZiB2aXNpdEludGVyaW9yKGNlbGxzLCByb29tLmludGVyaW9yUHQpKSB7XHJcbiAgICAgICAgaWYgKHQgIT09IENlbGxUeXBlLkludGVyaW9yKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXRlci5hbnkobWFwLCB0aCA9PiAodGgucG9zaXRpb24/LmVxdWFsKHB0KSA/PyBmYWxzZSkgJiYgIXRoLnBhc3NhYmxlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY2hlc3QgPSB0aGluZ3MuY2hlc3QuY2xvbmUoKVxyXG4gICAgICAgIGNoZXN0LnBvc2l0aW9uID0gcHQuY2xvbmUoKVxyXG5cclxuICAgICAgICAvLyBjaG9vc2UgbG9vdFxyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSByYW5kLmNob29zZShybmcsIGxvb3QpXHJcbiAgICAgICAgY2hlc3QuaXRlbXMuYWRkKGl0ZW0pXHJcblxyXG4gICAgICAgIC8vIGV4dHJhIGxvb3RcclxuICAgICAgICBsZXQgZXh0cmFMb290Q2hhbmNlID0gLjVcclxuICAgICAgICB3aGlsZSAocmFuZC5jaGFuY2Uocm5nLCBleHRyYUxvb3RDaGFuY2UpKSB7XHJcbiAgICAgICAgICAgIGV4dHJhTG9vdENoYW5jZSAqPSAuNVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gcmFuZC5jaG9vc2Uocm5nLCBsb290KVxyXG4gICAgICAgICAgICBjaGVzdC5pdGVtcy5hZGQoaXRlbSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1hcC5jb250YWluZXJzLmFkZChjaGVzdClcclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZUNlbGxHcmlkKHJuZzogcmFuZC5STkcsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogW0NlbGxHcmlkLCBSb29tW11dIHtcclxuICAgIGNvbnN0IGNlbGxzID0gZ3JpZC5nZW5lcmF0ZSh3aWR0aCwgaGVpZ2h0LCAoKSA9PiBDZWxsVHlwZS5FeHRlcmlvcilcclxuXHJcbiAgICAvLyBnZW5lcmF0ZSByb29tIHRlbXBsYXRlc1xyXG4gICAgY29uc3QgdGVtcGxhdGVzID0gZ2VuZXJhdGVSb29tVGVtcGxhdGVzKClcclxuICAgIGNvbnN0IHN0YWNrOiBSb29tW10gPSBbXVxyXG4gICAgY29uc3Qgcm9vbXM6IFJvb21bXSA9IFtdXHJcblxyXG4gICAgLy8gcGxhY2UgaW5pdGlhbCByb29tXHJcbiAgICB7XHJcbiAgICAgICAgcmFuZC5zaHVmZmxlKHJuZywgdGVtcGxhdGVzKVxyXG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGVtcGxhdGVzWzBdXHJcblxyXG4gICAgICAgIGNvbnN0IHB0ID0gbmV3IGdlby5Qb2ludChcclxuICAgICAgICAgICAgcmFuZC5pbnQocm5nLCAwLCB3aWR0aCAtIHRlbXBsYXRlLmNlbGxzLndpZHRoICsgMSksXHJcbiAgICAgICAgICAgIHJhbmQuaW50KHJuZywgMCwgaGVpZ2h0IC0gdGVtcGxhdGUuY2VsbHMuaGVpZ2h0ICsgMSkpXHJcblxyXG4gICAgICAgIGNvbnN0IHJvb20gPSBwbGFjZVRlbXBsYXRlKHJuZywgY2VsbHMsIHRlbXBsYXRlLCBwdClcclxuICAgICAgICBzdGFjay5wdXNoKHJvb20pXHJcbiAgICAgICAgcm9vbXMucHVzaChyb29tKVxyXG4gICAgfVxyXG5cclxuICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc3Qgcm9vbSA9IGFycmF5LnBvcChzdGFjaylcclxuICAgICAgICBjb25zdCBuZXh0Um9vbSA9IHRyeVR1bm5lbEZyb20ocm5nLCBjZWxscywgdGVtcGxhdGVzLCByb29tKVxyXG5cclxuICAgICAgICBpZiAobmV4dFJvb20pIHtcclxuICAgICAgICAgICAgc3RhY2sucHVzaChyb29tKVxyXG4gICAgICAgICAgICBzdGFjay5wdXNoKG5leHRSb29tKVxyXG4gICAgICAgICAgICByb29tcy5wdXNoKG5leHRSb29tKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gW2NlbGxzLCByb29tc11cclxufVxyXG5cclxuZnVuY3Rpb24gdHJ5VHVubmVsRnJvbShybmc6IHJhbmQuUk5HLCBjZWxsczogQ2VsbEdyaWQsIHRlbXBsYXRlczogUm9vbVRlbXBsYXRlW10sIHJvb206IFJvb20pOiBSb29tIHwgbnVsbCB7XHJcbiAgICByYW5kLnNodWZmbGUocm5nLCB0ZW1wbGF0ZXMpXHJcblxyXG4gICAgd2hpbGUgKHJvb20udHVubmVsUHRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjb25zdCB0cHQgPSBhcnJheS5wb3Aocm9vbS50dW5uZWxQdHMpXHJcbiAgICAgICAgZm9yIChjb25zdCB0ZW1wbGF0ZSBvZiB0ZW1wbGF0ZXMpIHtcclxuICAgICAgICAgICAgY29uc3QgbmV4dFJvb20gPSB0cnlUdW5uZWxUbyhybmcsIGNlbGxzLCB0cHQsIHRlbXBsYXRlKVxyXG4gICAgICAgICAgICBpZiAobmV4dFJvb20pIHtcclxuICAgICAgICAgICAgICAgIC8vIHBsYWNlIGRvb3IgYXQgdHVubmVsIHBvaW50XHJcbiAgICAgICAgICAgICAgICByb29tLnR1bm5lbFB0cyA9IHJvb20udHVubmVsUHRzLmZpbHRlcihwdCA9PiAhcHQuZXF1YWwodHB0KSlcclxuICAgICAgICAgICAgICAgIGNlbGxzLnNldFBvaW50KHRwdCwgQ2VsbFR5cGUuRG9vcilcclxuICAgICAgICAgICAgICAgIG5leHRSb29tLmRlcHRoID0gcm9vbS5kZXB0aCArIDFcclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXh0Um9vbVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVsbFxyXG59XHJcblxyXG5mdW5jdGlvbiB0cnlUdW5uZWxUbyhybmc6IHJhbmQuUk5HLCBjZWxsczogQ2VsbEdyaWQsIHRwdDE6IGdlby5Qb2ludCwgdGVtcGxhdGU6IFJvb21UZW1wbGF0ZSk6IFJvb20gfCBudWxsIHtcclxuICAgIC8vIGZpbmQgdHVubmVsIHBvaW50cyBvZiB0ZW1wbGF0ZVxyXG4gICAgZm9yIChjb25zdCB0cHQyIG9mIHRlbXBsYXRlLnR1bm5lbFB0cykge1xyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHRwdDEuc3ViUG9pbnQodHB0MilcclxuICAgICAgICBpZiAoaXNWYWxpZFBsYWNlbWVudCh0ZW1wbGF0ZS5jZWxscywgY2VsbHMsIG9mZnNldCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHBsYWNlVGVtcGxhdGUocm5nLCBjZWxscywgdGVtcGxhdGUsIG9mZnNldClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51bGxcclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VUZW1wbGF0ZShybmc6IHJhbmQuUk5HLCBjZWxsczogQ2VsbEdyaWQsIHRlbXBsYXRlOiBSb29tVGVtcGxhdGUsIG9mZnNldDogZ2VvLlBvaW50KTogUm9vbSB7XHJcbiAgICBncmlkLmNvcHkodGVtcGxhdGUuY2VsbHMsIGNlbGxzLCBvZmZzZXQueCwgb2Zmc2V0LnkpXHJcblxyXG4gICAgLy8gZmluZCB0dW5uZWxhYmxlIHBvaW50c1xyXG4gICAgY29uc3QgaW50ZXJpb3JQdCA9IHRlbXBsYXRlLmludGVyaW9yUHQuYWRkUG9pbnQob2Zmc2V0KVxyXG4gICAgY29uc3QgdHVubmVsUHRzID0gdGVtcGxhdGUudHVubmVsUHRzLm1hcChwdCA9PiBwdC5hZGRQb2ludChvZmZzZXQpKS5maWx0ZXIocHQgPT4gZmluZEV4dGVyaW9yTmVpZ2hib3IoY2VsbHMsIHB0KSAhPT0gbnVsbClcclxuICAgIHJhbmQuc2h1ZmZsZShybmcsIHR1bm5lbFB0cylcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGludGVyaW9yUHQsXHJcbiAgICAgICAgdHVubmVsUHRzLFxyXG4gICAgICAgIGRlcHRoOiAwXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlUm9vbVRlbXBsYXRlcygpOiBSb29tVGVtcGxhdGVbXSB7XHJcbiAgICBjb25zdCBsZW5ndGhzID0gWzUsIDcsIDksIDExLCAxMywgMTVdXHJcbiAgICBjb25zdCBwYWlycyA9IGxlbmd0aHMubWFwKHggPT4gbGVuZ3Rocy5tYXAoeSA9PiBbeCwgeV0pKS5mbGF0KCkuZmlsdGVyKGEgPT4gYVswXSA+IDMgfHwgYVsxXSA+IDMpXHJcbiAgICBjb25zdCB0ZW1wbGF0ZXMgPSBwYWlycy5tYXAoYSA9PiBnZW5lcmF0ZVJvb21UZW1wbGF0ZShhWzBdLCBhWzFdKSlcclxuICAgIHJldHVybiB0ZW1wbGF0ZXNcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVSb29tVGVtcGxhdGUod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBSb29tVGVtcGxhdGUge1xyXG4gICAgY29uc3QgaW50ZXJpb3JQdCA9IG5ldyBnZW8uUG9pbnQod2lkdGggLyAyLCBoZWlnaHQgLyAyKS5mbG9vcigpXHJcbiAgICBjb25zdCBjZWxscyA9IGdyaWQuZ2VuZXJhdGUoXHJcbiAgICAgICAgd2lkdGgsXHJcbiAgICAgICAgaGVpZ2h0LFxyXG4gICAgICAgICh4LCB5KSA9PiB4ID09PSAwIHx8IHggPT09IHdpZHRoIC0gMSB8fCB5ID09PSAwIHx8IHkgPT09IGhlaWdodCAtIDEgPyBDZWxsVHlwZS5XYWxsIDogQ2VsbFR5cGUuSW50ZXJpb3IpXHJcblxyXG4gICAgY29uc3QgdHVubmVsUHRzOiBnZW8uUG9pbnRbXSA9IFtdXHJcbiAgICB0dW5uZWxQdHMucHVzaCguLi5ncmlkLnNjYW4oMSwgMCwgd2lkdGggLSAyLCAxKSlcclxuICAgIHR1bm5lbFB0cy5wdXNoKC4uLmdyaWQuc2NhbigwLCAxLCAxLCBoZWlnaHQgLSAyKSlcclxuICAgIHR1bm5lbFB0cy5wdXNoKC4uLmdyaWQuc2NhbigxLCBoZWlnaHQgLSAxLCB3aWR0aCAtIDIsIDEpKVxyXG4gICAgdHVubmVsUHRzLnB1c2goLi4uZ3JpZC5zY2FuKHdpZHRoIC0gMSwgMSwgMSwgaGVpZ2h0IC0gMikpXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBpbnRlcmlvclB0LFxyXG4gICAgICAgIGNlbGxzLFxyXG4gICAgICAgIHR1bm5lbFB0c1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kRXh0ZXJpb3JOZWlnaGJvcihjZWxsczogQ2VsbEdyaWQsIHB0OiBnZW8uUG9pbnQpOiBnZW8uUG9pbnQgfCBudWxsIHtcclxuICAgIGZvciAoY29uc3QgW3QsIG5wdF0gb2YgZ3JpZC52aXNpdE5laWdoYm9ycyhjZWxscywgcHQpKSB7XHJcbiAgICAgICAgaWYgKHQgPT09IENlbGxUeXBlLkV4dGVyaW9yKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBucHRcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51bGxcclxufVxyXG5cclxuZnVuY3Rpb24gdmlzaXRJbnRlcmlvckNvb3JkcyhjZWxsczogQ2VsbEdyaWQsIHB0MDogZ2VvLlBvaW50KTogSXRlcmFibGU8Z2VvLlBvaW50PiB7XHJcbiAgICByZXR1cm4gaXRlci5tYXAodmlzaXRJbnRlcmlvcihjZWxscywgcHQwKSwgeCA9PiB4WzFdKVxyXG59XHJcblxyXG5mdW5jdGlvbiogdmlzaXRJbnRlcmlvcihjZWxsczogQ2VsbEdyaWQsIHB0MDogZ2VvLlBvaW50KTogSXRlcmFibGU8W0NlbGxUeXBlLCBnZW8uUG9pbnRdPiB7XHJcbiAgICBjb25zdCBleHBsb3JlZCA9IGNlbGxzLm1hcDIoKCkgPT4gZmFsc2UpXHJcbiAgICBjb25zdCBzdGFjayA9IFtwdDBdXHJcblxyXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjb25zdCBwdCA9IGFycmF5LnBvcChzdGFjaylcclxuICAgICAgICBleHBsb3JlZC5zZXRQb2ludChwdCwgdHJ1ZSlcclxuICAgICAgICBjb25zdCB0ID0gY2VsbHMuYXRQb2ludChwdClcclxuICAgICAgICB5aWVsZCBbdCwgcHRdXHJcblxyXG4gICAgICAgIC8vIGlmIHRoaXMgaXMgYSB3YWxsLCBkbyBub3QgZXhwbG9yZSBuZWlnaGJvcnNcclxuICAgICAgICBpZiAodCA9PT0gQ2VsbFR5cGUuV2FsbCkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gb3RoZXJ3aXNlLCBleHBsb3JlIG5laWdoYm9ycywgcHVzaGluZyBvbnRvIHN0YWNrIHRob3NlIHRoYXQgYXJlIHVuZXhwbG9yZWRcclxuICAgICAgICBmb3IgKGNvbnN0IFt0LCBucHRdIG9mIGdyaWQudmlzaXROZWlnaGJvcnMoY2VsbHMsIHB0KSkge1xyXG4gICAgICAgICAgICBpZiAoZXhwbG9yZWQuYXRQb2ludChucHQpKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodCAhPT0gQ2VsbFR5cGUuSW50ZXJpb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobnB0KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFBsYWNlbWVudChzcmM6IENlbGxHcmlkLCBkc3Q6IENlbGxHcmlkLCBvZmZzZXQ6IGdlby5Qb2ludCk6IGJvb2xlYW4ge1xyXG4gICAgaWYgKCFkc3QucmVnaW9uSW5Cb3VuZHMob2Zmc2V0LngsIG9mZnNldC55LCBzcmMud2lkdGgsIHNyYy5oZWlnaHQpKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCBbc3QsIHgsIHldIG9mIHNyYy5zY2FuKCkpIHtcclxuICAgICAgICAvLyBydWxlczpcclxuICAgICAgICAvLyBjYW4gcGxhY2Ugd2FsbCBvdmVyIHdhbGxcclxuICAgICAgICAvLyBjYW4gcGxhY2UgYW55dGhpbmcgb3ZlciBleHRlcmlvclxyXG4gICAgICAgIGNvbnN0IGR0ID0gZHN0LmF0KHggKyBvZmZzZXQueCwgeSArIG9mZnNldC55KVxyXG4gICAgICAgIGlmIChkdCA9PT0gQ2VsbFR5cGUuRXh0ZXJpb3IpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChkdCA9PT0gQ2VsbFR5cGUuV2FsbCAmJiBzdCA9PT0gQ2VsbFR5cGUuV2FsbCkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWVcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlT3V0ZG9vck1hcChyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBwbGF5ZXI6IHJsLlBsYXllciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBQcm9taXNlPG1hcHMuTWFwPiB7XHJcbiAgICBjb25zdCBtYXAgPSBuZXcgbWFwcy5NYXAod2lkdGgsIGhlaWdodCwgMCwgcGxheWVyKVxyXG4gICAgbWFwLmxpZ2h0aW5nID0gbWFwcy5MaWdodGluZy5BbWJpZW50XHJcblxyXG4gICAgcGxheWVyLnBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCgwLCAwKVxyXG4gICAgZ2VuZXJhdGVPdXRkb29yVGVycmFpbihtYXApXHJcbiAgICBhd2FpdCBsb2FkU3ByaXRlVGV4dHVyZXMocmVuZGVyZXIsIG1hcClcclxuICAgIHJldHVybiBtYXBcclxufVxyXG5cclxuZW51bSBPdXRkb29yVGlsZVR5cGUge1xyXG4gICAgd2F0ZXIsXHJcbiAgICBncmFzcyxcclxuICAgIGRpcnQsXHJcbiAgICBzYW5kXHJcbn1cclxuXHJcbmVudW0gT3V0ZG9vckZpeHR1cmVUeXBlIHtcclxuICAgIG5vbmUsXHJcbiAgICBoaWxscyxcclxuICAgIG1vdW50YWlucyxcclxuICAgIHRyZWVzLFxyXG4gICAgc25vd1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZU91dGRvb3JUZXJyYWluKG1hcDogbWFwcy5NYXApIHtcclxuICAgIGNvbnN0IHRpbGVzID0gZ3JpZC5nZW5lcmF0ZShtYXAud2lkdGgsIG1hcC5oZWlnaHQsICgpID0+IE91dGRvb3JUaWxlVHlwZS53YXRlcilcclxuICAgIGNvbnN0IGZpeHR1cmVzID0gZ3JpZC5nZW5lcmF0ZShtYXAud2lkdGgsIG1hcC5oZWlnaHQsICgpID0+IE91dGRvb3JGaXh0dXJlVHlwZS5ub25lKVxyXG5cclxuICAgIC8vIFRPRE8gLSByYW5kb21seSBiaWFzIHBlcmxpbiBub2lzZSBpbnN0ZWFkXHJcbiAgICAvLyBjb25zdCBiaWFzPSByYW5kLmludCgwLCAyNTYpXHJcbiAgICBjb25zdCBiaWFzID0gMFxyXG5cclxuICAgIGNvbnN0IGhlaWdodE1hcCA9IGZibShtYXAud2lkdGgsIG1hcC5oZWlnaHQsIGJpYXMsIDggLyBtYXAud2lkdGgsIDIsIC41LCA4KVxyXG5cclxuICAgIGltYWdpbmcuc2NhbihtYXAud2lkdGgsIG1hcC5oZWlnaHQsICh4LCB5LCBvZmZzZXQpID0+IHtcclxuICAgICAgICBjb25zdCBoID0gaGVpZ2h0TWFwW29mZnNldF1cclxuICAgICAgICBpZiAoaCA+IDApIHtcclxuICAgICAgICAgICAgdGlsZXMuc2V0KHgsIHksIE91dGRvb3JUaWxlVHlwZS5kaXJ0KVxyXG4gICAgICAgIH1cclxuICAgIH0pXHJcblxyXG4gICAgbWFwLnBsYXllci5wb3NpdGlvbiA9IHRpbGVzLmZpbmRQb2ludCh0ID0+IHQgIT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikgPz8gbmV3IGdlby5Qb2ludCgwLCAwKVxyXG5cclxuICAgIGZvciAoY29uc3QgW3QsIHgsIHldIG9mIHRpbGVzLnNjYW4oKSkge1xyXG4gICAgICAgIHN3aXRjaCAodCkge1xyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yVGlsZVR5cGUud2F0ZXIpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gdGhpbmdzLndhdGVyLmNsb25lKClcclxuICAgICAgICAgICAgICAgIHRpbGUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuYWRkKHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yVGlsZVR5cGUuZGlydCk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aGluZ3MuZGlydC5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICB0aWxlLnBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLnRpbGVzLmFkZCh0aWxlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vclRpbGVUeXBlLmdyYXNzKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRoaW5ncy5ncmFzcy5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICB0aWxlLnBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLnRpbGVzLmFkZCh0aWxlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vclRpbGVUeXBlLnNhbmQpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gdGhpbmdzLnNhbmQuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgdGlsZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5hZGQodGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCBbZiwgeCwgeV0gb2YgZml4dHVyZXMuc2NhbigpKSB7XHJcbiAgICAgICAgc3dpdGNoIChmKSB7XHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JGaXh0dXJlVHlwZS5oaWxscyk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeHR1cmUgPSB0aGluZ3MuaGlsbHMuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgZml4dHVyZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC5maXh0dXJlcy5hZGQoZml4dHVyZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JGaXh0dXJlVHlwZS5tb3VudGFpbnMpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaXh0dXJlID0gdGhpbmdzLm1vdW50YWlucy5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBmaXh0dXJlLnBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLmZpeHR1cmVzLmFkZChmaXh0dXJlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vckZpeHR1cmVUeXBlLnRyZWVzKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZml4dHVyZSA9IHRoaW5ncy50cmVlcy5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBmaXh0dXJlLnBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLmZpeHR1cmVzLmFkZChmaXh0dXJlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vckZpeHR1cmVUeXBlLnNub3cpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaXh0dXJlID0gdGhpbmdzLnNub3cuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgZml4dHVyZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC5maXh0dXJlcy5hZGQoZml4dHVyZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlTGFuZG1hc3Nlcyhybmc6IHJhbmQuUk5HLCB0aWxlczogZ3JpZC5HcmlkPE91dGRvb3JUaWxlVHlwZT4pIHtcclxuICAgIGNvbnN0IG1heFRpbGVzID0gTWF0aC5jZWlsKHRpbGVzLnNpemUgKiByYW5kLmZsb2F0KHJuZywgLjMsIC41KSlcclxuICAgIGdyb3dMYW5kKHJuZywgdGlsZXMsIG1heFRpbGVzKVxyXG5cclxuICAgIC8vIGZpbmQgbWF4aW1hbCB3YXRlciByZWN0IC0gaWYgbGFyZ2UgZW5vdWdoLCBwbGFudCBpc2xhbmRcclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgY29uc3QgYWFiYiA9IGdyaWQuZmluZE1heGltYWxSZWN0KHRpbGVzLCB0ID0+IHQgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikuc2hyaW5rKDEpXHJcbiAgICAgICAgaWYgKGFhYmIuYXJlYSA8IDEyKSB7XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB2aWV3ID0gdGlsZXMudmlld0FBQkIoYWFiYilcclxuICAgICAgICBjb25zdCBpc2xhbmRUaWxlcyA9IGFhYmIuYXJlYSAqIHJhbmQuZmxvYXQocm5nLCAuMjUsIDEpXHJcbiAgICAgICAgZ3Jvd0xhbmQocm5nLCB2aWV3LCBpc2xhbmRUaWxlcylcclxuICAgIH1cclxuXHJcbiAgICAvLyBwbGFjZSBzb21lIGlzbGFuZHNcclxuICAgIHBsYWNlQmVhY2hlcyh0aWxlcylcclxufVxyXG5cclxuZnVuY3Rpb24gZ3Jvd0xhbmQocm5nOiByYW5kLlJORywgdGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+LCBtYXhUaWxlczogbnVtYmVyKSB7XHJcbiAgICAvLyBcInBsYW50XCIgYSBjb250aW5lbnRcclxuICAgIGNvbnN0IHN0YWNrID0gbmV3IEFycmF5PGdlby5Qb2ludD4oKVxyXG4gICAgY29uc3Qgc2VlZCA9IG5ldyBnZW8uUG9pbnQodGlsZXMud2lkdGggLyAyLCB0aWxlcy5oZWlnaHQgLyAyKS5mbG9vcigpXHJcbiAgICBzdGFjay5wdXNoKHNlZWQpXHJcbiAgICBsZXQgcGxhY2VkID0gMFxyXG5cclxuICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwICYmIHBsYWNlZCA8IG1heFRpbGVzKSB7XHJcbiAgICAgICAgY29uc3QgcHQgPSBhcnJheS5wb3Aoc3RhY2spXHJcbiAgICAgICAgdGlsZXMuc2V0UG9pbnQocHQsIE91dGRvb3JUaWxlVHlwZS5ncmFzcylcclxuICAgICAgICArK3BsYWNlZFxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IFt0LCB4eV0gb2YgZ3JpZC52aXNpdE5laWdoYm9ycyh0aWxlcywgcHQpKSB7XHJcbiAgICAgICAgICAgIGlmICh0ID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeHkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJhbmQuc2h1ZmZsZShybmcsIHN0YWNrKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZUJlYWNoZXModGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+KSB7XHJcbiAgICBmb3IgKGNvbnN0IHB0IG9mIGdyaWQuc2NhbigwLCAwLCB0aWxlcy53aWR0aCwgdGlsZXMuaGVpZ2h0KSkge1xyXG4gICAgICAgIGlmICh0aWxlcy5hdFBvaW50KHB0KSA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocHQueCA+IDAgJiYgdGlsZXMuYXQocHQueCAtIDEsIHB0LnkpID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgdGlsZXMuc2V0UG9pbnQocHQsIE91dGRvb3JUaWxlVHlwZS5zYW5kKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHB0LnggPCB0aWxlcy53aWR0aCAtIDEgJiYgdGlsZXMuYXQocHQueCArIDEsIHB0LnkpID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgdGlsZXMuc2V0UG9pbnQocHQsIE91dGRvb3JUaWxlVHlwZS5zYW5kKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHB0LnkgPiAwICYmIHRpbGVzLmF0KHB0LngsIHB0LnkgLSAxKSA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgIHRpbGVzLnNldFBvaW50KHB0LCBPdXRkb29yVGlsZVR5cGUuc2FuZClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwdC55IDwgdGlsZXMuaGVpZ2h0IC0gMSAmJiB0aWxlcy5hdChwdC54LCBwdC55ICsgMSkgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICB0aWxlcy5zZXRQb2ludChwdCwgT3V0ZG9vclRpbGVUeXBlLnNhbmQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZVNub3codGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+LCBmaXh0dXJlczogZ3JpZC5HcmlkPE91dGRvb3JGaXh0dXJlVHlwZT4pIHtcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gdGlsZXNcclxuICAgIGNvbnN0IHNub3dIZWlnaHQgPSBNYXRoLmNlaWwoaGVpZ2h0IC8gMylcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgc25vd0hlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHQgPSB0aWxlcy5hdCh4LCB5KVxyXG4gICAgICAgICAgICBpZiAodCAhPT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgICAgICBmaXh0dXJlcy5zZXQoeCwgeSwgT3V0ZG9vckZpeHR1cmVUeXBlLnNub3cpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlTW91bnRhaW5zKHJuZzogcmFuZC5STkcsIHRpbGVzOiBncmlkLkdyaWQ8T3V0ZG9vclRpbGVUeXBlPiwgZml4dHVyZXM6IGdyaWQuR3JpZDxPdXRkb29yRml4dHVyZVR5cGU+LCBtYXhUaWxlczogbnVtYmVyKSB7XHJcbiAgICAvLyBmaW5kIGEgc3VpdGFibGUgc3RhcnQgcG9pbnQgZm9yIG1vdW50YWluIHJhbmdlXHJcbiAgICBjb25zdCBzZWVkID0gcmFuZC5jaG9vc2Uocm5nLCBbLi4udGlsZXMuZmluZFBvaW50cyh4ID0+IHggIT09IE91dGRvb3JUaWxlVHlwZS53YXRlciAmJiB4ICE9PSBPdXRkb29yVGlsZVR5cGUuc2FuZCldKVxyXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgQXJyYXk8Z2VvLlBvaW50PigpXHJcbiAgICBzdGFjay5wdXNoKHNlZWQpXHJcbiAgICBsZXQgcGxhY2VkID0gMFxyXG5cclxuICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwICYmIHBsYWNlZCA8IG1heFRpbGVzKSB7XHJcbiAgICAgICAgY29uc3QgcHQgPSBhcnJheS5wb3Aoc3RhY2spXHJcbiAgICAgICAgZml4dHVyZXMuc2V0UG9pbnQocHQsIE91dGRvb3JGaXh0dXJlVHlwZS5tb3VudGFpbnMpXHJcbiAgICAgICAgKytwbGFjZWRcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBbdCwgeHldIG9mIGdyaWQudmlzaXROZWlnaGJvcnModGlsZXMsIHB0KSkge1xyXG4gICAgICAgICAgICBpZiAodCAhPT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyICYmIHQgIT09IE91dGRvb3JUaWxlVHlwZS5zYW5kKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHh5KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByYW5kLnNodWZmbGUocm5nLCBzdGFjaylcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRTcHJpdGVUZXh0dXJlcyhyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBtYXA6IG1hcHMuTWFwKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAvLyBiYWtlIGFsbCAyNHgyNCB0aWxlIGltYWdlcyB0byBhIHNpbmdsZSBhcnJheSB0ZXh0dXJlXHJcbiAgICAvLyBzdG9yZSBtYXBwaW5nIGZyb20gaW1hZ2UgdXJsIHRvIGluZGV4XHJcbiAgICBjb25zdCBpbWFnZVVybHMgPSBpdGVyLndyYXAobWFwKS5tYXAodGggPT4gdGguaW1hZ2UpLmZpbHRlcigpLmRpc3RpbmN0KCkudG9BcnJheSgpXHJcbiAgICBjb25zdCBsYXllck1hcCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KGltYWdlVXJscy5tYXAoKHVybCwgaSkgPT4gW3VybCwgaV0pKVxyXG4gICAgY29uc3QgaW1hZ2VzID0gYXdhaXQgUHJvbWlzZS5hbGwoaW1hZ2VVcmxzLm1hcCh1cmwgPT4gZG9tLmxvYWRJbWFnZSh1cmwpKSlcclxuICAgIGNvbnN0IHRleHR1cmUgPSByZW5kZXJlci5iYWtlVGV4dHVyZUFycmF5KHJsLnRpbGVTaXplLCBybC50aWxlU2l6ZSwgaW1hZ2VzKVxyXG5cclxuICAgIGZvciAoY29uc3QgdGggb2YgbWFwKSB7XHJcbiAgICAgICAgaWYgKCF0aC5pbWFnZSkge1xyXG4gICAgICAgICAgICB0aC50ZXh0dXJlTGF5ZXIgPSAtMVxyXG4gICAgICAgICAgICB0aC50ZXh0dXJlID0gbnVsbFxyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbGF5ZXIgPSBsYXllck1hcC5nZXQodGguaW1hZ2UpXHJcbiAgICAgICAgaWYgKGxheWVyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB0ZXh0dXJlIGluZGV4IG5vdCBmb3VuZCBmb3IgJHt0aC5pbWFnZX1gKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGgudGV4dHVyZSA9IHRleHR1cmVcclxuICAgICAgICB0aC50ZXh0dXJlTGF5ZXIgPSBsYXllclxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmYm0od2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIGJpYXM6IG51bWJlciwgZnJlcTogbnVtYmVyLCBsYWN1bmFyaXR5OiBudW1iZXIsIGdhaW46IG51bWJlciwgb2N0YXZlczogbnVtYmVyKTogbnVtYmVyW10ge1xyXG4gICAgcmV0dXJuIGltYWdpbmcuZ2VuZXJhdGUod2lkdGgsIGhlaWdodCwgKHgsIHkpID0+IHtcclxuICAgICAgICByZXR1cm4gbm9pc2UuZmJtUGVybGluMih4ICogZnJlcSArIGJpYXMsIHkgKiBmcmVxICsgYmlhcywgbGFjdW5hcml0eSwgZ2Fpbiwgb2N0YXZlcylcclxuICAgIH0pXHJcbn0iXX0=