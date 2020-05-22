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
    placeLandmasses(tiles);
    placeSnow(tiles, fixtures);
    map.player.position = (_a = tiles.findPoint(t => t === OutdoorTileType.grass)) !== null && _a !== void 0 ? _a : new geo.Point(0, 0);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0gsT0FBTyxLQUFLLEVBQUUsTUFBTSxTQUFTLENBQUE7QUFDN0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sV0FBVyxDQUFBO0FBRWpDLE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFXdkMsTUFBTSxPQUFPLEdBQW1CO0lBQzVCLElBQUksRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRTtJQUM5QixLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUU7SUFDM0IsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO0lBQ3pCLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtJQUNqQyxVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUU7Q0FDeEMsQ0FBQTtBQUVELE1BQU0sUUFBUSxHQUFHO0lBQ2IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUU7SUFDbEIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7SUFDdkIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUU7SUFDekIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7SUFDdkIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUU7SUFD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QyxDQUFBO0lBQzFFLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFFM0UsS0FBSyxNQUFNLEVBQUUsSUFBSSxHQUFHLEVBQUU7UUFDbEIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUU7WUFDWCxFQUFFLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3BCLEVBQUUsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO1lBQ2pCLFNBQVE7U0FDWDtRQUVELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BDLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTtZQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtTQUM3RDtRQUVELEVBQUUsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1FBQ3BCLEVBQUUsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFBO0tBQzFCO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBtYXAgZ2VuZXJhdGlvbiBsaWJyYXJ5XHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBybCBmcm9tIFwiLi9ybC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgZ3JpZCBmcm9tIFwiLi4vc2hhcmVkL2dyaWQuanNcIlxyXG5pbXBvcnQgKiBhcyBhcnJheSBmcm9tIFwiLi4vc2hhcmVkL2FycmF5LmpzXCJcclxuaW1wb3J0ICogYXMgaXRlciBmcm9tIFwiLi4vc2hhcmVkL2l0ZXIuanNcIlxyXG5pbXBvcnQgKiBhcyByYW5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiXHJcbmltcG9ydCAqIGFzIHRoaW5ncyBmcm9tIFwiLi90aGluZ3MuanNcIlxyXG5pbXBvcnQgKiBhcyBtYXBzIGZyb20gXCIuL21hcHMuanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0IHsgc2NhblJlZ2lvbiB9IGZyb20gXCIuLi9zaGFyZWQvaW1hZ2luZy5qc1wiXHJcblxyXG5pbnRlcmZhY2UgRHVuZ2VvblRpbGVzZXQge1xyXG4gICAgd2FsbDogcmwuVGlsZSxcclxuICAgIGZsb29yOiBybC5UaWxlLFxyXG4gICAgZG9vcjogcmwuRG9vcixcclxuICAgIHN0YWlyc1VwOiBybC5TdGFpcnNVcFxyXG4gICAgc3RhaXJzRG93bjogcmwuU3RhaXJzRG93blxyXG59XHJcblxyXG5jb25zdCB0aWxlc2V0OiBEdW5nZW9uVGlsZXNldCA9IHtcclxuICAgIHdhbGw6IHRoaW5ncy5icmlja1dhbGwuY2xvbmUoKSxcclxuICAgIGZsb29yOiB0aGluZ3MuZmxvb3IuY2xvbmUoKSxcclxuICAgIGRvb3I6IHRoaW5ncy5kb29yLmNsb25lKCksXHJcbiAgICBzdGFpcnNVcDogdGhpbmdzLnN0YWlyc1VwLmNsb25lKCksXHJcbiAgICBzdGFpcnNEb3duOiB0aGluZ3Muc3RhaXJzRG93bi5jbG9uZSgpXHJcbn1cclxuXHJcbmNvbnN0IG1vbnN0ZXJzID0gW1xyXG4gICAgdGhpbmdzLmJhdC5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLnNrZWxldG9uLmNsb25lKCksXHJcbiAgICB0aGluZ3MuZ3JlZW5TbGltZS5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLnJlZFNsaW1lLmNsb25lKCksXHJcbiAgICB0aGluZ3Muc3BpZGVyLmNsb25lKCksXHJcbiAgICB0aGluZ3MucmF0LmNsb25lKClcclxuXVxyXG5cclxuY29uc3QgbG9vdCA9IFtcclxuICAgIHRoaW5ncy5jbG90aEFybW9yLmNsb25lKCksXHJcbiAgICB0aGluZ3Muc2hhcnBTdGljay5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLmRhZ2dlci5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLmxlYXRoZXJBcm1vci5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLndvb2RlbkJvdy5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLnNsaW5nU2hvdC5jbG9uZSgpLFxyXG4gICAgdGhpbmdzLndlYWtIZWFsdGhQb3Rpb24uY2xvbmUoKSxcclxuICAgIHRoaW5ncy5oZWFsdGhQb3Rpb24uY2xvbmUoKVxyXG5dXHJcblxyXG5lbnVtIENlbGxUeXBlIHtcclxuICAgIEV4dGVyaW9yLFxyXG4gICAgSW50ZXJpb3IsXHJcbiAgICBXYWxsLFxyXG4gICAgRG9vclxyXG59XHJcblxyXG50eXBlIENlbGxHcmlkID0gZ3JpZC5HcmlkPENlbGxUeXBlPlxyXG5cclxuaW50ZXJmYWNlIFJvb21UZW1wbGF0ZSB7XHJcbiAgICBjZWxsczogQ2VsbEdyaWRcclxuICAgIGludGVyaW9yUHQ6IGdlby5Qb2ludFxyXG4gICAgdHVubmVsUHRzOiBnZW8uUG9pbnRbXVxyXG59XHJcblxyXG5pbnRlcmZhY2UgUm9vbSB7XHJcbiAgICBpbnRlcmlvclB0OiBnZW8uUG9pbnRcclxuICAgIHR1bm5lbFB0czogZ2VvLlBvaW50W11cclxuICAgIGRlcHRoOiBudW1iZXIsXHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5lcmF0ZUR1bmdlb25MZXZlbChyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBwbGF5ZXI6IHJsLlBsYXllciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBQcm9taXNlPG1hcHMuTWFwPiB7XHJcbiAgICBjb25zdCBtYXAgPSBnZW5lcmF0ZU1hcFJvb21zKHdpZHRoLCBoZWlnaHQsIHBsYXllcilcclxuICAgIG1hcC5saWdodGluZyA9IG1hcHMuTGlnaHRpbmcuTm9uZVxyXG4gICAgYXdhaXQgbG9hZFNwcml0ZVRleHR1cmVzKHJlbmRlcmVyLCBtYXApXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlTWFwUm9vbXMod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHBsYXllcjogcmwuUGxheWVyKTogbWFwcy5NYXAge1xyXG4gICAgY29uc3QgbWFwID0gbmV3IG1hcHMuTWFwKHdpZHRoLCBoZWlnaHQsIHBsYXllcilcclxuICAgIGNvbnN0IG1pblJvb21zID0gNFxyXG5cclxuICAgIGNvbnN0IFtjZWxscywgcm9vbXNdID0gKCgpID0+IHtcclxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICBjb25zdCBbY2VsbHMsIHJvb21zXSA9IGdlbmVyYXRlQ2VsbEdyaWQod2lkdGgsIGhlaWdodClcclxuICAgICAgICAgICAgaWYgKHJvb21zLmxlbmd0aCA+IG1pblJvb21zKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW2NlbGxzLCByb29tc11cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pKCkgYXMgW0NlbGxHcmlkLCBSb29tW11dXHJcblxyXG4gICAgY29uc3QgZmlyc3RSb29tID0gcm9vbXMucmVkdWNlKCh4LCB5KSA9PiB4LmRlcHRoIDwgeS5kZXB0aCA/IHggOiB5KVxyXG4gICAgbWFwLnBsYXllci5wb3NpdGlvbiA9IGZpcnN0Um9vbS5pbnRlcmlvclB0LmNsb25lKClcclxuXHJcbiAgICBjb25zdCBzdGFpcnNVcCA9IHRpbGVzZXQuc3RhaXJzVXAuY2xvbmUoKVxyXG4gICAgY29uc3Qgc3RhaXJzVXBQb3NpdGlvbiA9IGl0ZXIuZmluZCh2aXNpdEludGVyaW9yQ29vcmRzKGNlbGxzLCBmaXJzdFJvb20uaW50ZXJpb3JQdCksIHB0ID0+IGl0ZXIuYW55KGdyaWQudmlzaXROZWlnaGJvcnMoY2VsbHMsIHB0KSwgYSA9PiBhWzBdID09PSBDZWxsVHlwZS5XYWxsKSlcclxuICAgIGlmICghc3RhaXJzVXBQb3NpdGlvbikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBwbGFjZSBzdGFpcnMgdXBcIilcclxuICAgIH1cclxuICAgIHN0YWlyc1VwLnBvc2l0aW9uID0gc3RhaXJzVXBQb3NpdGlvbi5jbG9uZSgpXHJcbiAgICBtYXAuZml4dHVyZXMuYWRkKHN0YWlyc1VwKVxyXG5cclxuICAgIGNvbnN0IGxhc3RSb29tID0gcm9vbXMucmVkdWNlKCh4LCB5KSA9PiB4LmRlcHRoID4geS5kZXB0aCA/IHggOiB5KVxyXG4gICAgY29uc3Qgc3RhaXJzRG93biA9IHRpbGVzZXQuc3RhaXJzRG93bi5jbG9uZSgpXHJcbiAgICBjb25zdCBzdGFpcnNEb3duUG9zaXRpb24gPSBpdGVyLmZpbmQodmlzaXRJbnRlcmlvckNvb3JkcyhjZWxscywgbGFzdFJvb20uaW50ZXJpb3JQdCksIHB0ID0+IGl0ZXIuYW55KGdyaWQudmlzaXROZWlnaGJvcnMoY2VsbHMsIHB0KSwgYSA9PiBhWzBdID09PSBDZWxsVHlwZS5XYWxsKSlcclxuICAgIGlmICghc3RhaXJzRG93blBvc2l0aW9uKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIHBsYWNlIHN0YWlycyBkb3duXCIpXHJcbiAgICB9XHJcbiAgICBzdGFpcnNEb3duLnBvc2l0aW9uID0gc3RhaXJzRG93blBvc2l0aW9uLmNsb25lKClcclxuICAgIG1hcC5maXh0dXJlcy5hZGQoc3RhaXJzRG93bilcclxuXHJcbiAgICAvLyBnZW5lcmF0ZSB0aWxlcyBhbmQgZml4dHVyZXMgZnJvbSBjZWxsc1xyXG4gICAgZm9yIChjb25zdCBbdiwgeCwgeV0gb2YgY2VsbHMuc2NhbigpKSB7XHJcbiAgICAgICAgaWYgKHYgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN3aXRjaCAodikge1xyXG4gICAgICAgICAgICBjYXNlIENlbGxUeXBlLkV4dGVyaW9yOlxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ2VsbFR5cGUuSW50ZXJpb3I6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aWxlc2V0LmZsb29yLmNsb25lKClcclxuICAgICAgICAgICAgICAgIHRpbGUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuYWRkKHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIENlbGxUeXBlLldhbGw6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aWxlc2V0LndhbGwuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgdGlsZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5hZGQodGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgQ2VsbFR5cGUuRG9vcjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZml4dHVyZSA9IHRpbGVzZXQuZG9vci5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICBmaXh0dXJlLnBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLmZpeHR1cmVzLmFkZChmaXh0dXJlKVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aWxlc2V0LmZsb29yLmNsb25lKClcclxuICAgICAgICAgICAgICAgIHRpbGUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuYWRkKHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHBsYWNlTW9uc3RlcnMoY2VsbHMsIHJvb21zLCBtYXApXHJcbiAgICBwbGFjZVRyZWFzdXJlcyhjZWxscywgcm9vbXMsIG1hcClcclxuXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlTW9uc3RlcnMoY2VsbHM6IENlbGxHcmlkLCByb29tczogUm9vbVtdLCBtYXA6IG1hcHMuTWFwKSB7XHJcbiAgICAvLyBpdGVyYXRlIG92ZXIgcm9vbXMsIGRlY2lkZSB3aGV0aGVyIHRvIHBsYWNlIGEgbW9uc3RlciBpbiBlYWNoIHJvb21cclxuICAgIGNvbnN0IGVuY291bnRlckNoYW5jZSA9IC4yNVxyXG4gICAgY29uc3Qgc2Vjb25kRW5jb3VudGVyQ2hhbmNlID0gLjJcclxuICAgIGNvbnN0IHRoaXJkRW5jb3VudGVyQ2hhbmNlID0gLjFcclxuXHJcbiAgICBmb3IgKGNvbnN0IHJvb20gb2Ygcm9vbXMpIHtcclxuICAgICAgICBpZiAoIXJhbmQuY2hhbmNlKGVuY291bnRlckNoYW5jZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeVBsYWNlTW9uc3RlcihjZWxscywgcm9vbSwgbWFwKVxyXG5cclxuICAgICAgICBpZiAoIXJhbmQuY2hhbmNlKHNlY29uZEVuY291bnRlckNoYW5jZSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeVBsYWNlTW9uc3RlcihjZWxscywgcm9vbSwgbWFwKVxyXG5cclxuICAgICAgICBpZiAoIXJhbmQuY2hhbmNlKHRoaXJkRW5jb3VudGVyQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5UGxhY2VNb25zdGVyKGNlbGxzLCByb29tLCBtYXApXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeVBsYWNlTW9uc3RlcihjZWxsczogQ2VsbEdyaWQsIHJvb206IFJvb20sIG1hcDogbWFwcy5NYXApOiBib29sZWFuIHtcclxuICAgIC8vIGF0dGVtcHQgdG8gcGxhY2UgbW9uc3RlclxyXG4gICAgZm9yIChjb25zdCBbdCwgcHRdIG9mIHZpc2l0SW50ZXJpb3IoY2VsbHMsIHJvb20uaW50ZXJpb3JQdCkpIHtcclxuICAgICAgICBpZiAodCAhPT0gQ2VsbFR5cGUuSW50ZXJpb3IpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpdGVyLmFueShtYXAsIHRoID0+ICh0aC5wb3NpdGlvbj8uZXF1YWwocHQpID8/IGZhbHNlKSAmJiAhdGgucGFzc2FibGUpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtb25zdGVyID0gKHJhbmQuY2hvb3NlKG1vbnN0ZXJzKSkuY2xvbmUoKVxyXG4gICAgICAgIG1vbnN0ZXIucG9zaXRpb24gPSBwdC5jbG9uZSgpXHJcbiAgICAgICAgbWFwLm1vbnN0ZXJzLmFkZChtb25zdGVyKVxyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZVRyZWFzdXJlcyhjZWxsczogQ2VsbEdyaWQsIHJvb21zOiBSb29tW10sIG1hcDogbWFwcy5NYXApIHtcclxuICAgIC8vIGl0ZXJhdGUgb3ZlciByb29tcywgZGVjaWRlIHdoZXRoZXIgdG8gcGxhY2UgYSBtb25zdGVyIGluIGVhY2ggcm9vbVxyXG4gICAgY29uc3QgdHJlYXN1cmVDaGFuY2UgPSAuMlxyXG5cclxuICAgIGZvciAoY29uc3Qgcm9vbSBvZiByb29tcykge1xyXG4gICAgICAgIGlmICghcmFuZC5jaGFuY2UodHJlYXN1cmVDaGFuY2UpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cnlQbGFjZVRyZWFzdXJlKGNlbGxzLCByb29tLCBtYXApXHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiB0cnlQbGFjZVRyZWFzdXJlKGNlbGxzOiBDZWxsR3JpZCwgcm9vbTogUm9vbSwgbWFwOiBtYXBzLk1hcCk6IGJvb2xlYW4ge1xyXG4gICAgLy8gYXR0ZW1wdCB0byBwbGFjZSB0cmVhc3VyZVxyXG4gICAgZm9yIChjb25zdCBbdCwgcHRdIG9mIHZpc2l0SW50ZXJpb3IoY2VsbHMsIHJvb20uaW50ZXJpb3JQdCkpIHtcclxuICAgICAgICBpZiAodCAhPT0gQ2VsbFR5cGUuSW50ZXJpb3IpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpdGVyLmFueShtYXAsIHRoID0+ICh0aC5wb3NpdGlvbj8uZXF1YWwocHQpID8/IGZhbHNlKSAmJiAhdGgucGFzc2FibGUpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjaGVzdCA9IHRoaW5ncy5jaGVzdC5jbG9uZSgpXHJcbiAgICAgICAgY2hlc3QucG9zaXRpb24gPSBwdC5jbG9uZSgpXHJcblxyXG4gICAgICAgIC8vIGNob29zZSBsb290XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IHJhbmQuY2hvb3NlKGxvb3QpXHJcbiAgICAgICAgY2hlc3QuaXRlbXMuYWRkKGl0ZW0pXHJcblxyXG4gICAgICAgIC8vIGV4dHJhIGxvb3RcclxuICAgICAgICBsZXQgZXh0cmFMb290Q2hhbmNlID0gLjVcclxuICAgICAgICB3aGlsZSAocmFuZC5jaGFuY2UoZXh0cmFMb290Q2hhbmNlKSkge1xyXG4gICAgICAgICAgICBleHRyYUxvb3RDaGFuY2UgKj0gLjVcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHJhbmQuY2hvb3NlKGxvb3QpXHJcbiAgICAgICAgICAgIGNoZXN0Lml0ZW1zLmFkZChpdGVtKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWFwLmNvbnRhaW5lcnMuYWRkKGNoZXN0KVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlQ2VsbEdyaWQod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBbQ2VsbEdyaWQsIFJvb21bXV0ge1xyXG4gICAgY29uc3QgY2VsbHMgPSBncmlkLmdlbmVyYXRlKHdpZHRoLCBoZWlnaHQsICgpID0+IENlbGxUeXBlLkV4dGVyaW9yKVxyXG5cclxuICAgIC8vIGdlbmVyYXRlIHJvb20gdGVtcGxhdGVzXHJcbiAgICBjb25zdCB0ZW1wbGF0ZXMgPSBnZW5lcmF0ZVJvb21UZW1wbGF0ZXMoKVxyXG4gICAgY29uc3Qgc3RhY2s6IFJvb21bXSA9IFtdXHJcbiAgICBjb25zdCByb29tczogUm9vbVtdID0gW11cclxuXHJcbiAgICAvLyBwbGFjZSBpbml0aWFsIHJvb21cclxuICAgIHtcclxuICAgICAgICByYW5kLnNodWZmbGUodGVtcGxhdGVzKVxyXG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGVtcGxhdGVzWzBdXHJcblxyXG4gICAgICAgIGNvbnN0IHB0ID0gbmV3IGdlby5Qb2ludChcclxuICAgICAgICAgICAgcmFuZC5pbnQoMCwgd2lkdGggLSB0ZW1wbGF0ZS5jZWxscy53aWR0aCArIDEpLFxyXG4gICAgICAgICAgICByYW5kLmludCgwLCBoZWlnaHQgLSB0ZW1wbGF0ZS5jZWxscy5oZWlnaHQgKyAxKSlcclxuXHJcbiAgICAgICAgY29uc3Qgcm9vbSA9IHBsYWNlVGVtcGxhdGUoY2VsbHMsIHRlbXBsYXRlLCBwdClcclxuICAgICAgICBzdGFjay5wdXNoKHJvb20pXHJcbiAgICAgICAgcm9vbXMucHVzaChyb29tKVxyXG4gICAgfVxyXG5cclxuICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc3Qgcm9vbSA9IGFycmF5LnBvcChzdGFjaylcclxuICAgICAgICBjb25zdCBuZXh0Um9vbSA9IHRyeVR1bm5lbEZyb20oY2VsbHMsIHRlbXBsYXRlcywgcm9vbSlcclxuXHJcbiAgICAgICAgaWYgKG5leHRSb29tKSB7XHJcbiAgICAgICAgICAgIHN0YWNrLnB1c2gocm9vbSlcclxuICAgICAgICAgICAgc3RhY2sucHVzaChuZXh0Um9vbSlcclxuICAgICAgICAgICAgcm9vbXMucHVzaChuZXh0Um9vbSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFtjZWxscywgcm9vbXNdXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeVR1bm5lbEZyb20oY2VsbHM6IENlbGxHcmlkLCB0ZW1wbGF0ZXM6IFJvb21UZW1wbGF0ZVtdLCByb29tOiBSb29tKTogUm9vbSB8IG51bGwge1xyXG4gICAgcmFuZC5zaHVmZmxlKHRlbXBsYXRlcylcclxuXHJcbiAgICB3aGlsZSAocm9vbS50dW5uZWxQdHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnN0IHRwdCA9IGFycmF5LnBvcChyb29tLnR1bm5lbFB0cylcclxuICAgICAgICBmb3IgKGNvbnN0IHRlbXBsYXRlIG9mIHRlbXBsYXRlcykge1xyXG4gICAgICAgICAgICBjb25zdCBuZXh0Um9vbSA9IHRyeVR1bm5lbFRvKGNlbGxzLCB0cHQsIHRlbXBsYXRlKVxyXG4gICAgICAgICAgICBpZiAobmV4dFJvb20pIHtcclxuICAgICAgICAgICAgICAgIC8vIHBsYWNlIGRvb3IgYXQgdHVubmVsIHBvaW50XHJcbiAgICAgICAgICAgICAgICByb29tLnR1bm5lbFB0cyA9IHJvb20udHVubmVsUHRzLmZpbHRlcihwdCA9PiAhcHQuZXF1YWwodHB0KSlcclxuICAgICAgICAgICAgICAgIGNlbGxzLnNldFBvaW50KHRwdCwgQ2VsbFR5cGUuRG9vcilcclxuICAgICAgICAgICAgICAgIG5leHRSb29tLmRlcHRoID0gcm9vbS5kZXB0aCArIDFcclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXh0Um9vbVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVsbFxyXG59XHJcblxyXG5mdW5jdGlvbiB0cnlUdW5uZWxUbyhjZWxsczogQ2VsbEdyaWQsIHRwdDE6IGdlby5Qb2ludCwgdGVtcGxhdGU6IFJvb21UZW1wbGF0ZSk6IFJvb20gfCBudWxsIHtcclxuICAgIC8vIGZpbmQgdHVubmVsIHBvaW50cyBvZiB0ZW1wbGF0ZVxyXG4gICAgZm9yIChjb25zdCB0cHQyIG9mIHRlbXBsYXRlLnR1bm5lbFB0cykge1xyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHRwdDEuc3ViUG9pbnQodHB0MilcclxuICAgICAgICBpZiAoaXNWYWxpZFBsYWNlbWVudCh0ZW1wbGF0ZS5jZWxscywgY2VsbHMsIG9mZnNldCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHBsYWNlVGVtcGxhdGUoY2VsbHMsIHRlbXBsYXRlLCBvZmZzZXQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlVGVtcGxhdGUoY2VsbHM6IENlbGxHcmlkLCB0ZW1wbGF0ZTogUm9vbVRlbXBsYXRlLCBvZmZzZXQ6IGdlby5Qb2ludCk6IFJvb20ge1xyXG4gICAgZ3JpZC5jb3B5KHRlbXBsYXRlLmNlbGxzLCBjZWxscywgb2Zmc2V0LngsIG9mZnNldC55KVxyXG5cclxuICAgIC8vIGZpbmQgdHVubmVsYWJsZSBwb2ludHNcclxuICAgIGNvbnN0IGludGVyaW9yUHQgPSB0ZW1wbGF0ZS5pbnRlcmlvclB0LmFkZFBvaW50KG9mZnNldClcclxuICAgIGNvbnN0IHR1bm5lbFB0cyA9IHRlbXBsYXRlLnR1bm5lbFB0cy5tYXAocHQgPT4gcHQuYWRkUG9pbnQob2Zmc2V0KSkuZmlsdGVyKHB0ID0+IGZpbmRFeHRlcmlvck5laWdoYm9yKGNlbGxzLCBwdCkgIT09IG51bGwpXHJcbiAgICByYW5kLnNodWZmbGUodHVubmVsUHRzKVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgaW50ZXJpb3JQdCxcclxuICAgICAgICB0dW5uZWxQdHMsXHJcbiAgICAgICAgZGVwdGg6IDBcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVSb29tVGVtcGxhdGVzKCk6IFJvb21UZW1wbGF0ZVtdIHtcclxuICAgIGNvbnN0IGxlbmd0aHMgPSBbNSwgNywgOSwgMTEsIDEzLCAxNV1cclxuICAgIGNvbnN0IHBhaXJzID0gbGVuZ3Rocy5tYXAoeCA9PiBsZW5ndGhzLm1hcCh5ID0+IFt4LCB5XSkpLmZsYXQoKS5maWx0ZXIoYSA9PiBhWzBdID4gMyB8fCBhWzFdID4gMylcclxuICAgIGNvbnN0IHRlbXBsYXRlcyA9IHBhaXJzLm1hcChhID0+IGdlbmVyYXRlUm9vbVRlbXBsYXRlKGFbMF0sIGFbMV0pKVxyXG4gICAgcmV0dXJuIHRlbXBsYXRlc1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVJvb21UZW1wbGF0ZSh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFJvb21UZW1wbGF0ZSB7XHJcbiAgICBjb25zdCBpbnRlcmlvclB0ID0gbmV3IGdlby5Qb2ludCh3aWR0aCAvIDIsIGhlaWdodCAvIDIpLmZsb29yKClcclxuICAgIGNvbnN0IGNlbGxzID0gZ3JpZC5nZW5lcmF0ZShcclxuICAgICAgICB3aWR0aCxcclxuICAgICAgICBoZWlnaHQsXHJcbiAgICAgICAgKHgsIHkpID0+IHggPT09IDAgfHwgeCA9PT0gd2lkdGggLSAxIHx8IHkgPT09IDAgfHwgeSA9PT0gaGVpZ2h0IC0gMSA/IENlbGxUeXBlLldhbGwgOiBDZWxsVHlwZS5JbnRlcmlvcilcclxuXHJcbiAgICBjb25zdCB0dW5uZWxQdHM6IGdlby5Qb2ludFtdID0gW11cclxuICAgIHR1bm5lbFB0cy5wdXNoKC4uLmdyaWQuc2NhbigxLCAwLCB3aWR0aCAtIDIsIDEpKVxyXG4gICAgdHVubmVsUHRzLnB1c2goLi4uZ3JpZC5zY2FuKDAsIDEsIDEsIGhlaWdodCAtIDIpKVxyXG4gICAgdHVubmVsUHRzLnB1c2goLi4uZ3JpZC5zY2FuKDEsIGhlaWdodCAtIDEsIHdpZHRoIC0gMiwgMSkpXHJcbiAgICB0dW5uZWxQdHMucHVzaCguLi5ncmlkLnNjYW4od2lkdGggLSAxLCAxLCAxLCBoZWlnaHQgLSAyKSlcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGludGVyaW9yUHQsXHJcbiAgICAgICAgY2VsbHMsXHJcbiAgICAgICAgdHVubmVsUHRzXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbmRFeHRlcmlvck5laWdoYm9yKGNlbGxzOiBDZWxsR3JpZCwgcHQ6IGdlby5Qb2ludCk6IGdlby5Qb2ludCB8IG51bGwge1xyXG4gICAgZm9yIChjb25zdCBbdCwgbnB0XSBvZiBncmlkLnZpc2l0TmVpZ2hib3JzKGNlbGxzLCBwdCkpIHtcclxuICAgICAgICBpZiAodCA9PT0gQ2VsbFR5cGUuRXh0ZXJpb3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5wdFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVsbFxyXG59XHJcblxyXG5mdW5jdGlvbiB2aXNpdEludGVyaW9yQ29vcmRzKGNlbGxzOiBDZWxsR3JpZCwgcHQwOiBnZW8uUG9pbnQpOiBJdGVyYWJsZTxnZW8uUG9pbnQ+IHtcclxuICAgIHJldHVybiBpdGVyLm1hcCh2aXNpdEludGVyaW9yKGNlbGxzLCBwdDApLCB4ID0+IHhbMV0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uKiB2aXNpdEludGVyaW9yKGNlbGxzOiBDZWxsR3JpZCwgcHQwOiBnZW8uUG9pbnQpOiBJdGVyYWJsZTxbQ2VsbFR5cGUsIGdlby5Qb2ludF0+IHtcclxuICAgIGNvbnN0IGV4cGxvcmVkID0gY2VsbHMubWFwMigoKSA9PiBmYWxzZSlcclxuICAgIGNvbnN0IHN0YWNrID0gW3B0MF1cclxuXHJcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnN0IHB0ID0gYXJyYXkucG9wKHN0YWNrKVxyXG4gICAgICAgIGV4cGxvcmVkLnNldFBvaW50KHB0LCB0cnVlKVxyXG4gICAgICAgIGNvbnN0IHQgPSBjZWxscy5hdFBvaW50KHB0KVxyXG4gICAgICAgIHlpZWxkIFt0LCBwdF1cclxuXHJcbiAgICAgICAgLy8gaWYgdGhpcyBpcyBhIHdhbGwsIGRvIG5vdCBleHBsb3JlIG5laWdoYm9yc1xyXG4gICAgICAgIGlmICh0ID09PSBDZWxsVHlwZS5XYWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBvdGhlcndpc2UsIGV4cGxvcmUgbmVpZ2hib3JzLCBwdXNoaW5nIG9udG8gc3RhY2sgdGhvc2UgdGhhdCBhcmUgdW5leHBsb3JlZFxyXG4gICAgICAgIGZvciAoY29uc3QgW3QsIG5wdF0gb2YgZ3JpZC52aXNpdE5laWdoYm9ycyhjZWxscywgcHQpKSB7XHJcbiAgICAgICAgICAgIGlmIChleHBsb3JlZC5hdFBvaW50KG5wdCkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0ICE9PSBDZWxsVHlwZS5JbnRlcmlvcikge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgc3RhY2sucHVzaChucHQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkUGxhY2VtZW50KHNyYzogQ2VsbEdyaWQsIGRzdDogQ2VsbEdyaWQsIG9mZnNldDogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICBpZiAoIWRzdC5yZWdpb25JbkJvdW5kcyhvZmZzZXQueCwgb2Zmc2V0LnksIHNyYy53aWR0aCwgc3JjLmhlaWdodCkpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IFtzdCwgeCwgeV0gb2Ygc3JjLnNjYW4oKSkge1xyXG4gICAgICAgIC8vIHJ1bGVzOlxyXG4gICAgICAgIC8vIGNhbiBwbGFjZSB3YWxsIG92ZXIgd2FsbFxyXG4gICAgICAgIC8vIGNhbiBwbGFjZSBhbnl0aGluZyBvdmVyIGV4dGVyaW9yXHJcbiAgICAgICAgY29uc3QgZHQgPSBkc3QuYXQoeCArIG9mZnNldC54LCB5ICsgb2Zmc2V0LnkpXHJcbiAgICAgICAgaWYgKGR0ID09PSBDZWxsVHlwZS5FeHRlcmlvcikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGR0ID09PSBDZWxsVHlwZS5XYWxsICYmIHN0ID09PSBDZWxsVHlwZS5XYWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVPdXRkb29yTWFwKHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIHBsYXllcjogcmwuUGxheWVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFByb21pc2U8bWFwcy5NYXA+IHtcclxuICAgIGNvbnN0IG1hcCA9IG5ldyBtYXBzLk1hcCh3aWR0aCwgaGVpZ2h0LCBwbGF5ZXIpXHJcbiAgICBtYXAubGlnaHRpbmcgPSBtYXBzLkxpZ2h0aW5nLkFtYmllbnRcclxuXHJcbiAgICBwbGF5ZXIucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KDAsIDApXHJcbiAgICBnZW5lcmF0ZU91dGRvb3JUZXJyYWluKG1hcClcclxuICAgIGF3YWl0IGxvYWRTcHJpdGVUZXh0dXJlcyhyZW5kZXJlciwgbWFwKVxyXG4gICAgcmV0dXJuIG1hcFxyXG59XHJcblxyXG5lbnVtIE91dGRvb3JUaWxlVHlwZSB7XHJcbiAgICB3YXRlcixcclxuICAgIGdyYXNzLFxyXG4gICAgZGlydCxcclxuICAgIHNhbmRcclxufVxyXG5cclxuZW51bSBPdXRkb29yRml4dHVyZVR5cGUge1xyXG4gICAgbm9uZSxcclxuICAgIGhpbGxzLFxyXG4gICAgbW91bnRhaW5zLFxyXG4gICAgdHJlZXMsXHJcbiAgICBzbm93XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlT3V0ZG9vclRlcnJhaW4obWFwOiBtYXBzLk1hcCkge1xyXG4gICAgY29uc3QgdGlsZXMgPSBncmlkLmdlbmVyYXRlKG1hcC53aWR0aCwgbWFwLmhlaWdodCwgKCkgPT4gT3V0ZG9vclRpbGVUeXBlLndhdGVyKVxyXG4gICAgY29uc3QgZml4dHVyZXMgPSBncmlkLmdlbmVyYXRlKG1hcC53aWR0aCwgbWFwLmhlaWdodCwgKCkgPT4gT3V0ZG9vckZpeHR1cmVUeXBlLm5vbmUpXHJcbiAgICBwbGFjZUxhbmRtYXNzZXModGlsZXMpXHJcbiAgICBwbGFjZVNub3codGlsZXMsIGZpeHR1cmVzKVxyXG5cclxuICAgIG1hcC5wbGF5ZXIucG9zaXRpb24gPSB0aWxlcy5maW5kUG9pbnQodCA9PiB0ID09PSBPdXRkb29yVGlsZVR5cGUuZ3Jhc3MpID8/IG5ldyBnZW8uUG9pbnQoMCwgMClcclxuXHJcbiAgICBmb3IgKGNvbnN0IFt0LCB4LCB5XSBvZiB0aWxlcy5zY2FuKCkpIHtcclxuICAgICAgICBzd2l0Y2ggKHQpIHtcclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vclRpbGVUeXBlLndhdGVyKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRoaW5ncy53YXRlci5jbG9uZSgpXHJcbiAgICAgICAgICAgICAgICB0aWxlLnBvc2l0aW9uID0gbmV3IGdlby5Qb2ludCh4LCB5KVxyXG4gICAgICAgICAgICAgICAgbWFwLnRpbGVzLmFkZCh0aWxlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSAoT3V0ZG9vclRpbGVUeXBlLmRpcnQpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gdGhpbmdzLmRpcnQuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgdGlsZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5hZGQodGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JUaWxlVHlwZS5ncmFzcyk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSB0aGluZ3MuZ3Jhc3MuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgdGlsZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC50aWxlcy5hZGQodGlsZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JUaWxlVHlwZS5zYW5kKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZSA9IHRoaW5ncy5zYW5kLmNsb25lKClcclxuICAgICAgICAgICAgICAgIHRpbGUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAudGlsZXMuYWRkKHRpbGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgW2YsIHgsIHldIG9mIGZpeHR1cmVzLnNjYW4oKSkge1xyXG4gICAgICAgIHN3aXRjaCAoZikge1xyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yRml4dHVyZVR5cGUuaGlsbHMpOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaXh0dXJlID0gdGhpbmdzLmhpbGxzLmNsb25lKClcclxuICAgICAgICAgICAgICAgIGZpeHR1cmUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAuZml4dHVyZXMuYWRkKGZpeHR1cmUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIChPdXRkb29yRml4dHVyZVR5cGUubW91bnRhaW5zKToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZml4dHVyZSA9IHRoaW5ncy5tb3VudGFpbnMuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgZml4dHVyZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC5maXh0dXJlcy5hZGQoZml4dHVyZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JGaXh0dXJlVHlwZS50cmVlcyk6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeHR1cmUgPSB0aGluZ3MudHJlZXMuY2xvbmUoKVxyXG4gICAgICAgICAgICAgICAgZml4dHVyZS5wb3NpdGlvbiA9IG5ldyBnZW8uUG9pbnQoeCwgeSlcclxuICAgICAgICAgICAgICAgIG1hcC5maXh0dXJlcy5hZGQoZml4dHVyZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgKE91dGRvb3JGaXh0dXJlVHlwZS5zbm93KToge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZml4dHVyZSA9IHRoaW5ncy5zbm93LmNsb25lKClcclxuICAgICAgICAgICAgICAgIGZpeHR1cmUucG9zaXRpb24gPSBuZXcgZ2VvLlBvaW50KHgsIHkpXHJcbiAgICAgICAgICAgICAgICBtYXAuZml4dHVyZXMuYWRkKGZpeHR1cmUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZUxhbmRtYXNzZXModGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+KSB7XHJcbiAgICBjb25zdCBtYXhUaWxlcyA9IE1hdGguY2VpbCh0aWxlcy5zaXplICogcmFuZC5mbG9hdCguMywgLjUpKVxyXG4gICAgZ3Jvd0xhbmQodGlsZXMsIG1heFRpbGVzKVxyXG5cclxuICAgIC8vIGZpbmQgbWF4aW1hbCB3YXRlciByZWN0IC0gaWYgbGFyZ2UgZW5vdWdoLCBwbGFudCBpc2xhbmRcclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgY29uc3QgYWFiYiA9IGdyaWQuZmluZE1heGltYWxSZWN0KHRpbGVzLCB0ID0+IHQgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikuc2hyaW5rKDEpXHJcbiAgICAgICAgaWYgKGFhYmIuYXJlYSA8IDEyKSB7XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB2aWV3ID0gdGlsZXMudmlld0FBQkIoYWFiYilcclxuICAgICAgICBjb25zdCBpc2xhbmRUaWxlcyA9IGFhYmIuYXJlYSAqIHJhbmQuZmxvYXQoLjI1LCAxKVxyXG4gICAgICAgIGdyb3dMYW5kKHZpZXcsIGlzbGFuZFRpbGVzKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIHBsYWNlIHNvbWUgaXNsYW5kc1xyXG4gICAgcGxhY2VCZWFjaGVzKHRpbGVzKVxyXG59XHJcblxyXG5mdW5jdGlvbiBncm93TGFuZCh0aWxlczogZ3JpZC5HcmlkPE91dGRvb3JUaWxlVHlwZT4sIG1heFRpbGVzOiBudW1iZXIpIHtcclxuICAgIC8vIFwicGxhbnRcIiBhIGNvbnRpbmVudFxyXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgQXJyYXk8Z2VvLlBvaW50PigpXHJcbiAgICBjb25zdCBzZWVkID0gbmV3IGdlby5Qb2ludCh0aWxlcy53aWR0aCAvIDIsIHRpbGVzLmhlaWdodCAvIDIpLmZsb29yKClcclxuICAgIHN0YWNrLnB1c2goc2VlZClcclxuICAgIGxldCBwbGFjZWQgPSAwXHJcblxyXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDAgJiYgcGxhY2VkIDwgbWF4VGlsZXMpIHtcclxuICAgICAgICBjb25zdCBwdCA9IGFycmF5LnBvcChzdGFjaylcclxuICAgICAgICB0aWxlcy5zZXRQb2ludChwdCwgT3V0ZG9vclRpbGVUeXBlLmdyYXNzKVxyXG4gICAgICAgICsrcGxhY2VkXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgW3QsIHh5XSBvZiBncmlkLnZpc2l0TmVpZ2hib3JzKHRpbGVzLCBwdCkpIHtcclxuICAgICAgICAgICAgaWYgKHQgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh4eSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmFuZC5zaHVmZmxlKHN0YWNrKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZUJlYWNoZXModGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+KSB7XHJcbiAgICBmb3IgKGNvbnN0IHB0IG9mIGdyaWQuc2NhbigwLCAwLCB0aWxlcy53aWR0aCwgdGlsZXMuaGVpZ2h0KSkge1xyXG4gICAgICAgIGlmICh0aWxlcy5hdFBvaW50KHB0KSA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocHQueCA+IDAgJiYgdGlsZXMuYXQocHQueCAtIDEsIHB0LnkpID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgdGlsZXMuc2V0UG9pbnQocHQsIE91dGRvb3JUaWxlVHlwZS5zYW5kKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHB0LnggPCB0aWxlcy53aWR0aCAtIDEgJiYgdGlsZXMuYXQocHQueCArIDEsIHB0LnkpID09PSBPdXRkb29yVGlsZVR5cGUud2F0ZXIpIHtcclxuICAgICAgICAgICAgdGlsZXMuc2V0UG9pbnQocHQsIE91dGRvb3JUaWxlVHlwZS5zYW5kKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHB0LnkgPiAwICYmIHRpbGVzLmF0KHB0LngsIHB0LnkgLSAxKSA9PT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgIHRpbGVzLnNldFBvaW50KHB0LCBPdXRkb29yVGlsZVR5cGUuc2FuZClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwdC55IDwgdGlsZXMuaGVpZ2h0IC0gMSAmJiB0aWxlcy5hdChwdC54LCBwdC55ICsgMSkgPT09IE91dGRvb3JUaWxlVHlwZS53YXRlcikge1xyXG4gICAgICAgICAgICB0aWxlcy5zZXRQb2ludChwdCwgT3V0ZG9vclRpbGVUeXBlLnNhbmQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZVNub3codGlsZXM6IGdyaWQuR3JpZDxPdXRkb29yVGlsZVR5cGU+LCBmaXh0dXJlczogZ3JpZC5HcmlkPE91dGRvb3JGaXh0dXJlVHlwZT4pIHtcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gdGlsZXNcclxuICAgIGNvbnN0IHNub3dIZWlnaHQgPSBNYXRoLmNlaWwoaGVpZ2h0IC8gMylcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgc25vd0hlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHQgPSB0aWxlcy5hdCh4LCB5KVxyXG4gICAgICAgICAgICBpZiAodCAhPT0gT3V0ZG9vclRpbGVUeXBlLndhdGVyKSB7XHJcbiAgICAgICAgICAgICAgICBmaXh0dXJlcy5zZXQoeCwgeSwgT3V0ZG9vckZpeHR1cmVUeXBlLnNub3cpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkU3ByaXRlVGV4dHVyZXMocmVuZGVyZXI6IGdmeC5SZW5kZXJlciwgbWFwOiBtYXBzLk1hcCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgLy8gYmFrZSBhbGwgMjR4MjQgdGlsZSBpbWFnZXMgdG8gYSBzaW5nbGUgYXJyYXkgdGV4dHVyZVxyXG4gICAgLy8gc3RvcmUgbWFwcGluZyBmcm9tIGltYWdlIHVybCB0byBpbmRleFxyXG4gICAgY29uc3QgaW1hZ2VVcmxzID0gaXRlci53cmFwKG1hcCkubWFwKHRoID0+IHRoLmltYWdlKS5maWx0ZXIoKS5kaXN0aW5jdCgpLnRvQXJyYXkoKVxyXG4gICAgY29uc3QgbGF5ZXJNYXAgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPihpbWFnZVVybHMubWFwKCh1cmwsIGkpID0+IFt1cmwsIGldKSlcclxuICAgIGNvbnN0IGltYWdlcyA9IGF3YWl0IFByb21pc2UuYWxsKGltYWdlVXJscy5tYXAodXJsID0+IGRvbS5sb2FkSW1hZ2UodXJsKSkpXHJcbiAgICBjb25zdCB0ZXh0dXJlID0gcmVuZGVyZXIuYmFrZVRleHR1cmVBcnJheShybC50aWxlU2l6ZSwgcmwudGlsZVNpemUsIGltYWdlcylcclxuXHJcbiAgICBmb3IgKGNvbnN0IHRoIG9mIG1hcCkge1xyXG4gICAgICAgIGlmICghdGguaW1hZ2UpIHtcclxuICAgICAgICAgICAgdGgudGV4dHVyZUxheWVyID0gLTFcclxuICAgICAgICAgICAgdGgudGV4dHVyZSA9IG51bGxcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGxheWVyID0gbGF5ZXJNYXAuZ2V0KHRoLmltYWdlKVxyXG4gICAgICAgIGlmIChsYXllciA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdGV4dHVyZSBpbmRleCBub3QgZm91bmQgZm9yICR7dGguaW1hZ2V9YClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoLnRleHR1cmUgPSB0ZXh0dXJlXHJcbiAgICAgICAgdGgudGV4dHVyZUxheWVyID0gbGF5ZXJcclxuICAgIH1cclxufVxyXG4iXX0=