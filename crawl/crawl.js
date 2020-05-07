import * as dom from "../shared/dom.js";
import * as array from "../shared/array.js";
import * as gfx from "./gfx.js";
import * as gen from "./gen.js";
import * as input from "../shared/input.js";
import * as rl from "./rl.js";
import * as geo from "../shared/geo2d.js";
const tileSize = 24;
async function generateMap(player, renderer, width, height) {
    const map = gen.generateMap(width, height);
    // bake all 24x24 tile images to a single array texture
    // store mapping from image url to index
    let imageUrls = [];
    imageUrls.push(...map.tiles.map(t => t.image));
    imageUrls.push(...map.fixtures.map(t => t.image));
    imageUrls.push(map.stairsUp.image);
    imageUrls.push(map.stairsDown.image);
    imageUrls.push(player.image);
    imageUrls = imageUrls.filter(url => url);
    imageUrls = array.distinct(imageUrls);
    const layerMap = new Map(imageUrls.map((url, i) => [url, i]));
    const images = await Promise.all(imageUrls.map(url => dom.loadImage(url)));
    const texture = renderer.bakeTextureArray(tileSize, tileSize, images);
    const initRenderData = (th) => {
        const layer = layerMap.get(th.image);
        if (layer === undefined) {
            throw new Error(`texture index not found for ${th.image}`);
        }
        th.renderData = {
            texture: texture,
            textureLayer: layer
        };
    };
    map.tiles.forEach(initRenderData);
    map.fixtures.forEach(initRenderData);
    initRenderData(map.stairsUp);
    initRenderData(map.stairsDown);
    initRenderData(player);
    return map;
}
const errorsDiv = dom.byId("errors");
function clearErrorMessages() {
    dom.removeAllChildren(errorsDiv);
}
function appendErrorMessage(error) {
    console.log(error);
    const div = document.createElement("div");
    div.classList.add("error-message");
    div.textContent = error;
    errorsDiv.appendChild(div);
}
function tick(renderer, keys, player, map) {
    handleInput(player, map, keys);
    drawFrame(renderer, player, map);
    requestAnimationFrame(() => tick(renderer, keys, player, map));
}
function handleInput(player, map, keys) {
    const position = player.position.clone();
    if (keys.pressed("w")) {
        position.y -= 1;
    }
    if (keys.pressed("s")) {
        position.y += 1;
    }
    if (keys.pressed("a")) {
        position.x -= 1;
    }
    if (keys.pressed("d")) {
        position.x += 1;
    }
    if (isPassable(map, position)) {
        player.position = position;
    }
    keys.update();
}
function isPassable(map, xy) {
    const tiles = array.filter(map.tiles, t => t.position.equal(xy));
    for (const tile of tiles) {
        if (!tile.passable) {
            return false;
        }
    }
    const fixtures = array.filter(map.fixtures, t => t.position.equal(xy));
    for (const fixture of fixtures) {
        if (!fixture.passable) {
            return false;
        }
    }
    return true;
}
function drawFrame(renderer, player, map) {
    // center the grid around the player
    const playerCoords = player.position;
    const center = new geo.Point(Math.floor((renderer.canvas.width - tileSize) / 2), Math.floor((renderer.canvas.height - tileSize) / 2));
    const offset = center.subPoint(playerCoords.mulScalar(rl.tileSize));
    handleResize(renderer.canvas);
    // draw various layers of sprites
    for (const tile of map.tiles) {
        drawThing(renderer, offset, tile);
    }
    for (const fixture of map.fixtures) {
        drawThing(renderer, offset, fixture);
    }
    drawThing(renderer, offset, map.stairsUp);
    drawThing(renderer, offset, map.stairsDown);
    drawThing(renderer, offset, player);
    renderer.flush();
}
function drawThing(renderer, offset, th) {
    if (!th.renderData) {
        throw new Error(`renderData is not set for ${th.name} with image: ${th.image}`);
    }
    const { x, y } = th.position;
    const { x: ox, y: oy } = offset;
    const sprite = {
        position: [x * tileSize + ox, y * tileSize + oy],
        color: [1, 1, 1, 1],
        width: tileSize,
        height: tileSize,
        texture: th.renderData.texture,
        layer: th.renderData.textureLayer
    };
    renderer.drawSprite(sprite);
}
function handleResize(canvas) {
    if (canvas.width === canvas.clientWidth && canvas.height === canvas.clientHeight) {
        return;
    }
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
async function main() {
    const canvas = dom.byId("canvas");
    const renderer = new gfx.Renderer(canvas);
    const player = new rl.Player({
        name: "Player",
        position: new geo.Point(0, 0),
        passable: false,
        transparent: true,
        image: "./assets/char.png"
    });
    const map = await generateMap(player, renderer, 32, 32);
    player.position = map.entry.clone();
    const keys = new input.Keys();
    requestAnimationFrame(() => tick(renderer, keys, player, map));
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQTtBQUVuQixLQUFLLFVBQVUsV0FBVyxDQUFDLE1BQWlCLEVBQUUsUUFBc0IsRUFBRSxLQUFhLEVBQUUsTUFBYztJQUMvRixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUUxQyx1REFBdUQ7SUFDdkQsd0NBQXdDO0lBQ3hDLElBQUksU0FBUyxHQUFhLEVBQUUsQ0FBQTtJQUM1QixTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUM5QyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUNqRCxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDbEMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtB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OUUsT0FBTTtLQUNUO0lBRUQsTUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFBO0lBQ2pDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQTtBQUN2QyxDQUFDO0FBRUQsS0FBSyxVQUFVLElBQUk7SUFDZixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBc0IsQ0FBQTtJQUN0RCxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7SUFFekMsTUFBTSxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO1FBQ3pCLElBQUksRUFBRSxRQUFRO1FBQ2QsUUFBUSxFQUFFLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzdCLFFBQVEsRUFBRSxLQUFLO1FBQ2YsV0FBVyxFQUFFLElBQUk7UUFDakIsS0FBSyxFQUFFLG1CQUFtQjtLQUM3QixDQUFDLENBQUE7SUFFRixNQUFNLEdBQUcsR0FBRyxNQUFNLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUN2RCxNQUFNLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDbkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDN0IscUJBQXFCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFDbEUsQ0FBQztBQUVELElBQUksRUFBRSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiXHJcbmltcG9ydCAqIGFzIGdmeCBmcm9tIFwiLi9nZnguanNcIlxyXG5pbXBvcnQgKiBhcyBnZW4gZnJvbSBcIi4vZ2VuLmpzXCJcclxuaW1wb3J0ICogYXMgaW5wdXQgZnJvbSBcIi4uL3NoYXJlZC9pbnB1dC5qc1wiXHJcbmltcG9ydCAqIGFzIHJsIGZyb20gXCIuL3JsLmpzXCJcclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvMmQuanNcIlxyXG5cclxuY29uc3QgdGlsZVNpemUgPSAyNFxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVNYXAocGxheWVyOiBybC5QbGF5ZXIsIHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogUHJvbWlzZTxnZW4uTWFwRGF0YT4ge1xyXG4gICAgY29uc3QgbWFwID0gZ2VuLmdlbmVyYXRlTWFwKHdpZHRoLCBoZWlnaHQpXHJcblxyXG4gICAgLy8gYmFrZSBhbGwgMjR4MjQgdGlsZSBpbWFnZXMgdG8gYSBzaW5nbGUgYXJyYXkgdGV4dHVyZVxyXG4gICAgLy8gc3RvcmUgbWFwcGluZyBmcm9tIGltYWdlIHVybCB0byBpbmRleFxyXG4gICAgbGV0IGltYWdlVXJsczogc3RyaW5nW10gPSBbXVxyXG4gICAgaW1hZ2VVcmxzLnB1c2goLi4ubWFwLnRpbGVzLm1hcCh0ID0+IHQuaW1hZ2UpKVxyXG4gICAgaW1hZ2VVcmxzLnB1c2goLi4ubWFwLmZpeHR1cmVzLm1hcCh0ID0+IHQuaW1hZ2UpKVxyXG4gICAgaW1hZ2VVcmxzLnB1c2gobWFwLnN0YWlyc1VwLmltYWdlKVxyXG4gICAgaW1hZ2VVcmxzLnB1c2gobWFwLnN0YWlyc0Rvd24uaW1hZ2UpXHJcbiAgICBpbWFnZVVybHMucHVzaChwbGF5ZXIuaW1hZ2UpXHJcbiAgICBpbWFnZVVybHMgPSBpbWFnZVVybHMuZmlsdGVyKHVybCA9PiB1cmwpXHJcbiAgICBpbWFnZVVybHMgPSBhcnJheS5kaXN0aW5jdChpbWFnZVVybHMpXHJcblxyXG4gICAgY29uc3QgbGF5ZXJNYXAgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPihpbWFnZVVybHMubWFwKCh1cmwsIGkpID0+IFt1cmwsIGldKSlcclxuICAgIGNvbnN0IGltYWdlcyA9IGF3YWl0IFByb21pc2UuYWxsKGltYWdlVXJscy5tYXAodXJsID0+IGRvbS5sb2FkSW1hZ2UodXJsKSkpXHJcbiAgICBjb25zdCB0ZXh0dXJlID0gcmVuZGVyZXIuYmFrZVRleHR1cmVBcnJheSh0aWxlU2l6ZSwgdGlsZVNpemUsIGltYWdlcylcclxuXHJcbiAgICBjb25zdCBpbml0UmVuZGVyRGF0YSA9ICh0aDogcmwuVGhpbmcpID0+IHtcclxuICAgICAgICBjb25zdCBsYXllciA9IGxheWVyTWFwLmdldCh0aC5pbWFnZSlcclxuICAgICAgICBpZiAobGF5ZXIgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHRleHR1cmUgaW5kZXggbm90IGZvdW5kIGZvciAke3RoLmltYWdlfWApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aC5yZW5kZXJEYXRhID0ge1xyXG4gICAgICAgICAgICB0ZXh0dXJlOiB0ZXh0dXJlLFxyXG4gICAgICAgICAgICB0ZXh0dXJlTGF5ZXI6IGxheWVyXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG1hcC50aWxlcy5mb3JFYWNoKGluaXRSZW5kZXJEYXRhKVxyXG4gICAgbWFwLmZpeHR1cmVzLmZvckVhY2goaW5pdFJlbmRlckRhdGEpXHJcbiAgICBpbml0UmVuZGVyRGF0YShtYXAuc3RhaXJzVXApXHJcbiAgICBpbml0UmVuZGVyRGF0YShtYXAuc3RhaXJzRG93bilcclxuICAgIGluaXRSZW5kZXJEYXRhKHBsYXllcilcclxuXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmNvbnN0IGVycm9yc0RpdiA9IGRvbS5ieUlkKFwiZXJyb3JzXCIpO1xyXG5cclxuZnVuY3Rpb24gY2xlYXJFcnJvck1lc3NhZ2VzKCkge1xyXG4gICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKGVycm9yc0RpdilcclxufVxyXG5cclxuZnVuY3Rpb24gYXBwZW5kRXJyb3JNZXNzYWdlKGVycm9yOiBzdHJpbmcpIHtcclxuICAgIGNvbnNvbGUubG9nKGVycm9yKVxyXG4gICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgIGRpdi5jbGFzc0xpc3QuYWRkKFwiZXJyb3ItbWVzc2FnZVwiKVxyXG4gICAgZGl2LnRleHRDb250ZW50ID0gZXJyb3JcclxuICAgIGVycm9yc0Rpdi5hcHBlbmRDaGlsZChkaXYpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRpY2socmVuZGVyZXI6IGdmeC5SZW5kZXJlciwga2V5czogaW5wdXQuS2V5cywgcGxheWVyOiBybC5QbGF5ZXIsIG1hcDogZ2VuLk1hcERhdGEpIHtcclxuICAgIGhhbmRsZUlucHV0KHBsYXllciwgbWFwLCBrZXlzKVxyXG4gICAgZHJhd0ZyYW1lKHJlbmRlcmVyLCBwbGF5ZXIsIG1hcClcclxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aWNrKHJlbmRlcmVyLCBrZXlzLCBwbGF5ZXIsIG1hcCkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZUlucHV0KHBsYXllcjogcmwuUGxheWVyLCBtYXA6IGdlbi5NYXBEYXRhLCBrZXlzOiBpbnB1dC5LZXlzKSB7XHJcbiAgICBjb25zdCBwb3NpdGlvbiA9IHBsYXllci5wb3NpdGlvbi5jbG9uZSgpXHJcblxyXG4gICAgaWYgKGtleXMucHJlc3NlZChcIndcIikpIHtcclxuICAgICAgICBwb3NpdGlvbi55IC09IDFcclxuICAgIH1cclxuXHJcbiAgICBpZiAoa2V5cy5wcmVzc2VkKFwic1wiKSkge1xyXG4gICAgICAgIHBvc2l0aW9uLnkgKz0gMVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChrZXlzLnByZXNzZWQoXCJhXCIpKSB7XHJcbiAgICAgICAgcG9zaXRpb24ueCAtPSAxXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGtleXMucHJlc3NlZChcImRcIikpIHtcclxuICAgICAgICBwb3NpdGlvbi54ICs9IDFcclxuICAgIH1cclxuXHJcbiAgICBpZiAoaXNQYXNzYWJsZShtYXAsIHBvc2l0aW9uKSkge1xyXG4gICAgICAgIHBsYXllci5wb3NpdGlvbiA9IHBvc2l0aW9uXHJcbiAgICB9XHJcblxyXG4gICAga2V5cy51cGRhdGUoKVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc1Bhc3NhYmxlKG1hcDogZ2VuLk1hcERhdGEsIHh5OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IHRpbGVzID0gYXJyYXkuZmlsdGVyKG1hcC50aWxlcywgdCA9PiB0LnBvc2l0aW9uLmVxdWFsKHh5KSlcclxuICAgIGZvciAoY29uc3QgdGlsZSBvZiB0aWxlcykge1xyXG4gICAgICAgIGlmICghdGlsZS5wYXNzYWJsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZml4dHVyZXMgPSBhcnJheS5maWx0ZXIobWFwLmZpeHR1cmVzLCB0ID0+IHQucG9zaXRpb24uZXF1YWwoeHkpKVxyXG4gICAgZm9yIChjb25zdCBmaXh0dXJlIG9mIGZpeHR1cmVzKSB7XHJcbiAgICAgICAgaWYgKCFmaXh0dXJlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3RnJhbWUocmVuZGVyZXI6IGdmeC5SZW5kZXJlciwgcGxheWVyOiBybC5QbGF5ZXIsIG1hcDogZ2VuLk1hcERhdGEpIHtcclxuICAgIC8vIGNlbnRlciB0aGUgZ3JpZCBhcm91bmQgdGhlIHBsYXllclxyXG4gICAgY29uc3QgcGxheWVyQ29vcmRzID0gcGxheWVyLnBvc2l0aW9uXHJcbiAgICBjb25zdCBjZW50ZXIgPSBuZXcgZ2VvLlBvaW50KE1hdGguZmxvb3IoKHJlbmRlcmVyLmNhbnZhcy53aWR0aCAtIHRpbGVTaXplKSAvIDIpLCBNYXRoLmZsb29yKChyZW5kZXJlci5jYW52YXMuaGVpZ2h0IC0gdGlsZVNpemUpIC8gMikpXHJcbiAgICBjb25zdCBvZmZzZXQgPSBjZW50ZXIuc3ViUG9pbnQocGxheWVyQ29vcmRzLm11bFNjYWxhcihybC50aWxlU2l6ZSkpXHJcblxyXG4gICAgaGFuZGxlUmVzaXplKHJlbmRlcmVyLmNhbnZhcylcclxuXHJcbiAgICAvLyBkcmF3IHZhcmlvdXMgbGF5ZXJzIG9mIHNwcml0ZXNcclxuICAgIGZvciAoY29uc3QgdGlsZSBvZiBtYXAudGlsZXMpIHtcclxuICAgICAgICBkcmF3VGhpbmcocmVuZGVyZXIsIG9mZnNldCwgdGlsZSlcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IGZpeHR1cmUgb2YgbWFwLmZpeHR1cmVzKSB7XHJcbiAgICAgICAgZHJhd1RoaW5nKHJlbmRlcmVyLCBvZmZzZXQsIGZpeHR1cmUpXHJcbiAgICB9XHJcblxyXG4gICAgZHJhd1RoaW5nKHJlbmRlcmVyLCBvZmZzZXQsIG1hcC5zdGFpcnNVcClcclxuICAgIGRyYXdUaGluZyhyZW5kZXJlciwgb2Zmc2V0LCBtYXAuc3RhaXJzRG93bilcclxuICAgIGRyYXdUaGluZyhyZW5kZXJlciwgb2Zmc2V0LCBwbGF5ZXIpXHJcblxyXG4gICAgcmVuZGVyZXIuZmx1c2goKVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3VGhpbmcocmVuZGVyZXI6IGdmeC5SZW5kZXJlciwgb2Zmc2V0OiBnZW8uUG9pbnQsIHRoOiBybC5UaGluZykge1xyXG4gICAgaWYgKCF0aC5yZW5kZXJEYXRhKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGByZW5kZXJEYXRhIGlzIG5vdCBzZXQgZm9yICR7dGgubmFtZX0gd2l0aCBpbWFnZTogJHt0aC5pbWFnZX1gKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHsgeCwgeSB9ID0gdGgucG9zaXRpb25cclxuICAgIGNvbnN0IHsgeDogb3gsIHk6IG95IH0gPSBvZmZzZXRcclxuXHJcbiAgICBjb25zdCBzcHJpdGU6IGdmeC5TcHJpdGUgPSB7XHJcbiAgICAgICAgcG9zaXRpb246IFt4ICogdGlsZVNpemUgKyBveCwgeSAqIHRpbGVTaXplICsgb3ldLFxyXG4gICAgICAgIGNvbG9yOiBbMSwgMSwgMSwgMV0sXHJcbiAgICAgICAgd2lkdGg6IHRpbGVTaXplLFxyXG4gICAgICAgIGhlaWdodDogdGlsZVNpemUsXHJcbiAgICAgICAgdGV4dHVyZTogdGgucmVuZGVyRGF0YS50ZXh0dXJlLFxyXG4gICAgICAgIGxheWVyOiB0aC5yZW5kZXJEYXRhLnRleHR1cmVMYXllclxyXG4gICAgfVxyXG5cclxuICAgIHJlbmRlcmVyLmRyYXdTcHJpdGUoc3ByaXRlKVxyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVSZXNpemUoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgaWYgKGNhbnZhcy53aWR0aCA9PT0gY2FudmFzLmNsaWVudFdpZHRoICYmIGNhbnZhcy5oZWlnaHQgPT09IGNhbnZhcy5jbGllbnRIZWlnaHQpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjYW52YXMud2lkdGggPSBjYW52YXMuY2xpZW50V2lkdGhcclxuICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMuY2xpZW50SGVpZ2h0XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XHJcbiAgICBjb25zdCBjYW52YXMgPSBkb20uYnlJZChcImNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG4gICAgY29uc3QgcmVuZGVyZXIgPSBuZXcgZ2Z4LlJlbmRlcmVyKGNhbnZhcylcclxuXHJcbiAgICBjb25zdCBwbGF5ZXIgPSBuZXcgcmwuUGxheWVyKHtcclxuICAgICAgICBuYW1lOiBcIlBsYXllclwiLFxyXG4gICAgICAgIHBvc2l0aW9uOiBuZXcgZ2VvLlBvaW50KDAsIDApLFxyXG4gICAgICAgIHBhc3NhYmxlOiBmYWxzZSxcclxuICAgICAgICB0cmFuc3BhcmVudDogdHJ1ZSxcclxuICAgICAgICBpbWFnZTogXCIuL2Fzc2V0cy9jaGFyLnBuZ1wiXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IG1hcCA9IGF3YWl0IGdlbmVyYXRlTWFwKHBsYXllciwgcmVuZGVyZXIsIDMyLCAzMilcclxuICAgIHBsYXllci5wb3NpdGlvbiA9IG1hcC5lbnRyeS5jbG9uZSgpXHJcbiAgICBjb25zdCBrZXlzID0gbmV3IGlucHV0LktleXMoKVxyXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRpY2socmVuZGVyZXIsIGtleXMsIHBsYXllciwgbWFwKSlcclxufVxyXG5cclxubWFpbigpIl19