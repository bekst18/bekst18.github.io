import * as dom from "../shared/dom.js";
import * as array from "../shared/array.js";
import * as gfx from "./gfx.js";
import * as gen from "./gen.js";
import * as input from "../shared/input.js";
const tileSize = 24;
async function generateMap(player, renderer, width, height) {
    const data = gen.generateMap(player, width, height);
    // bake all 24x24 tile images to a single array texture
    // store mapping from image url to index
    let imageUrls = [];
    imageUrls.push(...data.tiles.map(t => t.image));
    imageUrls.push(...data.fixtures.map(t => t.image));
    imageUrls.push(data.stairsUp.image);
    imageUrls.push(data.stairsDown.image);
    imageUrls.push(data.player.image);
    imageUrls = imageUrls.filter(url => url);
    imageUrls = array.distinct(imageUrls);
    const layerMap = new Map(imageUrls.map((url, i) => [url, i]));
    const images = await Promise.all(imageUrls.map(url => dom.loadImage(url)));
    const texture = renderer.bakeTextureArray(tileSize, tileSize, images);
    const assignTexture = (th) => {
        const layer = layerMap.get(th.image);
        if (layer === undefined) {
            throw new Error(`texture index not found for ${th.image}`);
        }
        th.texture = texture;
        th.textureLayer = layer;
    };
    data.tiles.forEach(assignTexture);
    data.fixtures.forEach(assignTexture);
    assignTexture(data.stairsUp);
    assignTexture(data.stairsDown);
    assignTexture(data.player);
    return data;
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
function tick(renderer, keys, map) {
    handleInput(map, keys);
    drawFrame(renderer, map);
    requestAnimationFrame(() => tick(renderer, keys, map));
}
function handleInput(map, keys) {
    const player = map.player;
    const position = [player.position[0], player.position[1]];
    if (keys.pressed("w")) {
        position[1] -= 1;
    }
    if (keys.pressed("s")) {
        position[1] += 1;
    }
    if (keys.pressed("a")) {
        position[0] -= 1;
    }
    if (keys.pressed("d")) {
        position[0] += 1;
    }
    if (isPassable(map, position)) {
        player.position = position;
    }
    keys.update();
}
function isPassable(map, xy) {
    const [x, y] = xy;
    const tiles = array.filter(map.tiles, t => t.position[0] === x && t.position[1] === y);
    for (const tile of tiles) {
        if (!tile.passable) {
            return false;
        }
    }
    const fixtures = array.filter(map.fixtures, t => t.position[0] === x && t.position[1] === y);
    for (const fixture of fixtures) {
        if (!fixture.passable) {
            return false;
        }
    }
    return true;
}
function drawFrame(renderer, map) {
    // center the grid around the player
    const playerCoords = map.player.position;
    const centerX = Math.floor((renderer.canvas.width - tileSize) / 2);
    const centerY = Math.floor((renderer.canvas.height - tileSize) / 2);
    const offset = [centerX - playerCoords[0] * tileSize, centerY - playerCoords[1] * tileSize];
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
    drawThing(renderer, offset, map.player);
    renderer.flush();
}
function drawThing(renderer, offset, th) {
    if (!th.texture) {
        console.log(th);
        throw new Error(`texture is not set for ${th.name} - image: ${th.image}`);
    }
    if (th.textureLayer === null) {
        console.log(th);
        throw new Error(`textureLayer is not set for ${th.name} - image ${th.image}`);
    }
    const [x, y] = th.position;
    const [ox, oy] = offset;
    const sprite = {
        position: [x * tileSize + ox, y * tileSize + oy],
        color: [1, 1, 1, 1],
        width: tileSize,
        height: tileSize,
        texture: th.texture,
        layer: th.textureLayer
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
    const player = {
        name: "Player",
        position: [0, 0],
        passable: false,
        transparent: true,
        image: "./assets/char.png",
        texture: null,
        textureLayer: null
    };
    const map = await generateMap(player, renderer, 32, 32);
    const keys = new input.Keys();
    requestAnimationFrame(() => tick(renderer, keys, map));
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUczQyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFFbkIsS0FBSyxVQUFVLFdBQVcsQ0FBQyxNQUFpQixFQUFFLFFBQXNCLEVBQUUsS0FBYSxFQUFFLE1BQWM7SUFDL0YsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBRW5ELHVEQUF1RDtJQUN2RCx3Q0FBd0M7SUFDeEMsSUFBSSxTQUFTLEdBQWEsRUFBRSxDQUFBO0lBQzVCLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBQy9DLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBQ2xELFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDckMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUss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QUssQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUM3QixxQkFBcUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBQzFELENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuaW1wb3J0ICogYXMgZ2VuIGZyb20gXCIuL2dlbi5qc1wiXHJcbmltcG9ydCAqIGFzIGlucHV0IGZyb20gXCIuLi9zaGFyZWQvaW5wdXQuanNcIlxyXG5pbXBvcnQgKiBhcyBybCBmcm9tIFwiLi9ybC5qc1wiXHJcblxyXG5jb25zdCB0aWxlU2l6ZSA9IDI0XHJcblxyXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZU1hcChwbGF5ZXI6IHJsLlBsYXllciwgcmVuZGVyZXI6IGdmeC5SZW5kZXJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBQcm9taXNlPGdlbi5NYXBEYXRhPiB7XHJcbiAgICBjb25zdCBkYXRhID0gZ2VuLmdlbmVyYXRlTWFwKHBsYXllciwgd2lkdGgsIGhlaWdodClcclxuXHJcbiAgICAvLyBiYWtlIGFsbCAyNHgyNCB0aWxlIGltYWdlcyB0byBhIHNpbmdsZSBhcnJheSB0ZXh0dXJlXHJcbiAgICAvLyBzdG9yZSBtYXBwaW5nIGZyb20gaW1hZ2UgdXJsIHRvIGluZGV4XHJcbiAgICBsZXQgaW1hZ2VVcmxzOiBzdHJpbmdbXSA9IFtdXHJcbiAgICBpbWFnZVVybHMucHVzaCguLi5kYXRhLnRpbGVzLm1hcCh0ID0+IHQuaW1hZ2UpKVxyXG4gICAgaW1hZ2VVcmxzLnB1c2goLi4uZGF0YS5maXh0dXJlcy5tYXAodCA9PiB0LmltYWdlKSlcclxuICAgIGltYWdlVXJscy5wdXNoKGRhdGEuc3RhaXJzVXAuaW1hZ2UpXHJcbiAgICBpbWFnZVVybHMucHVzaChkYXRhLnN0YWlyc0Rvd24uaW1hZ2UpXHJcbiAgICBpbWFnZVVybHMucHVzaChkYXRhLnBsYXllci5pbWFnZSlcclxuICAgIGltYWdlVXJscyA9IGltYWdlVXJscy5maWx0ZXIodXJsID0+IHVybClcclxuICAgIGltYWdlVXJscyA9IGFycmF5LmRpc3RpbmN0KGltYWdlVXJscylcclxuXHJcbiAgICBjb25zdCBsYXllck1hcCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KGltYWdlVXJscy5tYXAoKHVybCwgaSkgPT4gW3VybCwgaV0pKVxyXG4gICAgY29uc3QgaW1hZ2VzID0gYXdhaXQgUHJvbWlzZS5hbGwoaW1hZ2VVcmxzLm1hcCh1cmwgPT4gZG9tLmxvYWRJbWFnZSh1cmwpKSlcclxuICAgIGNvbnN0IHRleHR1cmUgPSByZW5kZXJlci5iYWtlVGV4dHVyZUFycmF5KHRpbGVTaXplLCB0aWxlU2l6ZSwgaW1hZ2VzKVxyXG5cclxuICAgIGNvbnN0IGFzc2lnblRleHR1cmUgPSAodGg6IHJsLlRoaW5nKSA9PiB7XHJcbiAgICAgICAgY29uc3QgbGF5ZXIgPSBsYXllck1hcC5nZXQodGguaW1hZ2UpXHJcbiAgICAgICAgaWYgKGxheWVyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB0ZXh0dXJlIGluZGV4IG5vdCBmb3VuZCBmb3IgJHt0aC5pbWFnZX1gKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGgudGV4dHVyZSA9IHRleHR1cmVcclxuICAgICAgICB0aC50ZXh0dXJlTGF5ZXIgPSBsYXllclxyXG4gICAgfVxyXG5cclxuICAgIGRhdGEudGlsZXMuZm9yRWFjaChhc3NpZ25UZXh0dXJlKVxyXG4gICAgZGF0YS5maXh0dXJlcy5mb3JFYWNoKGFzc2lnblRleHR1cmUpXHJcbiAgICBhc3NpZ25UZXh0dXJlKGRhdGEuc3RhaXJzVXApXHJcbiAgICBhc3NpZ25UZXh0dXJlKGRhdGEuc3RhaXJzRG93bilcclxuICAgIGFzc2lnblRleHR1cmUoZGF0YS5wbGF5ZXIpXHJcblxyXG4gICAgcmV0dXJuIGRhdGFcclxufVxyXG5cclxuY29uc3QgZXJyb3JzRGl2ID0gZG9tLmJ5SWQoXCJlcnJvcnNcIik7XHJcblxyXG5mdW5jdGlvbiBjbGVhckVycm9yTWVzc2FnZXMoKSB7XHJcbiAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4oZXJyb3JzRGl2KVxyXG59XHJcblxyXG5mdW5jdGlvbiBhcHBlbmRFcnJvck1lc3NhZ2UoZXJyb3I6IHN0cmluZykge1xyXG4gICAgY29uc29sZS5sb2coZXJyb3IpXHJcbiAgICBjb25zdCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgZGl2LmNsYXNzTGlzdC5hZGQoXCJlcnJvci1tZXNzYWdlXCIpXHJcbiAgICBkaXYudGV4dENvbnRlbnQgPSBlcnJvclxyXG4gICAgZXJyb3JzRGl2LmFwcGVuZENoaWxkKGRpdilcclxufVxyXG5cclxuZnVuY3Rpb24gdGljayhyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBrZXlzOiBpbnB1dC5LZXlzLCBtYXA6IGdlbi5NYXBEYXRhKSB7XHJcbiAgICBoYW5kbGVJbnB1dChtYXAsIGtleXMpXHJcbiAgICBkcmF3RnJhbWUocmVuZGVyZXIsIG1hcClcclxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aWNrKHJlbmRlcmVyLCBrZXlzLCBtYXApKVxyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVJbnB1dChtYXA6IGdlbi5NYXBEYXRhLCBrZXlzOiBpbnB1dC5LZXlzKSB7XHJcbiAgICBjb25zdCBwbGF5ZXIgPSBtYXAucGxheWVyXHJcbiAgICBjb25zdCBwb3NpdGlvbjogcmwuQ29vcmRzID0gW3BsYXllci5wb3NpdGlvblswXSwgcGxheWVyLnBvc2l0aW9uWzFdXVxyXG5cclxuICAgIGlmIChrZXlzLnByZXNzZWQoXCJ3XCIpKSB7XHJcbiAgICAgICAgcG9zaXRpb25bMV0gLT0gMVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChrZXlzLnByZXNzZWQoXCJzXCIpKSB7XHJcbiAgICAgICAgcG9zaXRpb25bMV0gKz0gMVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChrZXlzLnByZXNzZWQoXCJhXCIpKSB7XHJcbiAgICAgICAgcG9zaXRpb25bMF0gLT0gMVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChrZXlzLnByZXNzZWQoXCJkXCIpKSB7XHJcbiAgICAgICAgcG9zaXRpb25bMF0gKz0gMVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChpc1Bhc3NhYmxlKG1hcCwgcG9zaXRpb24pKSB7XHJcbiAgICAgICAgcGxheWVyLnBvc2l0aW9uID0gcG9zaXRpb25cclxuICAgIH1cclxuXHJcbiAgICBrZXlzLnVwZGF0ZSgpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzUGFzc2FibGUobWFwOiBnZW4uTWFwRGF0YSwgeHk6IHJsLkNvb3Jkcyk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgW3gsIHldID0geHlcclxuXHJcbiAgICBjb25zdCB0aWxlcyA9IGFycmF5LmZpbHRlcihtYXAudGlsZXMsIHQgPT4gdC5wb3NpdGlvblswXSA9PT0geCAmJiB0LnBvc2l0aW9uWzFdID09PSB5KVxyXG4gICAgZm9yIChjb25zdCB0aWxlIG9mIHRpbGVzKSB7XHJcbiAgICAgICAgaWYgKCF0aWxlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmaXh0dXJlcyA9IGFycmF5LmZpbHRlcihtYXAuZml4dHVyZXMsIHQgPT4gdC5wb3NpdGlvblswXSA9PT0geCAmJiB0LnBvc2l0aW9uWzFdID09PSB5KVxyXG4gICAgZm9yIChjb25zdCBmaXh0dXJlIG9mIGZpeHR1cmVzKSB7XHJcbiAgICAgICAgaWYgKCFmaXh0dXJlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3RnJhbWUocmVuZGVyZXI6IGdmeC5SZW5kZXJlciwgbWFwOiBnZW4uTWFwRGF0YSkge1xyXG4gICAgLy8gY2VudGVyIHRoZSBncmlkIGFyb3VuZCB0aGUgcGxheWVyXHJcbiAgICBjb25zdCBwbGF5ZXJDb29yZHMgPSBtYXAucGxheWVyLnBvc2l0aW9uXHJcbiAgICBjb25zdCBjZW50ZXJYID0gTWF0aC5mbG9vcigocmVuZGVyZXIuY2FudmFzLndpZHRoIC0gdGlsZVNpemUpIC8gMilcclxuICAgIGNvbnN0IGNlbnRlclkgPSBNYXRoLmZsb29yKChyZW5kZXJlci5jYW52YXMuaGVpZ2h0IC0gdGlsZVNpemUpIC8gMilcclxuICAgIGNvbnN0IG9mZnNldDogcmwuQ29vcmRzID0gW2NlbnRlclggLSBwbGF5ZXJDb29yZHNbMF0gKiB0aWxlU2l6ZSwgY2VudGVyWSAtIHBsYXllckNvb3Jkc1sxXSAqIHRpbGVTaXplXVxyXG5cclxuICAgIGhhbmRsZVJlc2l6ZShyZW5kZXJlci5jYW52YXMpXHJcblxyXG4gICAgLy8gZHJhdyB2YXJpb3VzIGxheWVycyBvZiBzcHJpdGVzXHJcbiAgICBmb3IgKGNvbnN0IHRpbGUgb2YgbWFwLnRpbGVzKSB7XHJcbiAgICAgICAgZHJhd1RoaW5nKHJlbmRlcmVyLCBvZmZzZXQsIHRpbGUpXHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCBmaXh0dXJlIG9mIG1hcC5maXh0dXJlcykge1xyXG4gICAgICAgIGRyYXdUaGluZyhyZW5kZXJlciwgb2Zmc2V0LCBmaXh0dXJlKVxyXG4gICAgfVxyXG5cclxuICAgIGRyYXdUaGluZyhyZW5kZXJlciwgb2Zmc2V0LCBtYXAuc3RhaXJzVXApXHJcbiAgICBkcmF3VGhpbmcocmVuZGVyZXIsIG9mZnNldCwgbWFwLnN0YWlyc0Rvd24pXHJcbiAgICBkcmF3VGhpbmcocmVuZGVyZXIsIG9mZnNldCwgbWFwLnBsYXllcilcclxuXHJcbiAgICByZW5kZXJlci5mbHVzaCgpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdUaGluZyhyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBvZmZzZXQ6IHJsLkNvb3JkcywgdGg6IHJsLlRoaW5nKSB7XHJcbiAgICBpZiAoIXRoLnRleHR1cmUpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyh0aClcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHRleHR1cmUgaXMgbm90IHNldCBmb3IgJHt0aC5uYW1lfSAtIGltYWdlOiAke3RoLmltYWdlfWApO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aC50ZXh0dXJlTGF5ZXIgPT09IG51bGwpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyh0aClcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHRleHR1cmVMYXllciBpcyBub3Qgc2V0IGZvciAke3RoLm5hbWV9IC0gaW1hZ2UgJHt0aC5pbWFnZX1gKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IFt4LCB5XSA9IHRoLnBvc2l0aW9uXHJcbiAgICBjb25zdCBbb3gsIG95XSA9IG9mZnNldFxyXG5cclxuICAgIGNvbnN0IHNwcml0ZTogZ2Z4LlNwcml0ZSA9IHtcclxuICAgICAgICBwb3NpdGlvbjogW3ggKiB0aWxlU2l6ZSArIG94LCB5ICogdGlsZVNpemUgKyBveV0sXHJcbiAgICAgICAgY29sb3I6IFsxLCAxLCAxLCAxXSxcclxuICAgICAgICB3aWR0aDogdGlsZVNpemUsXHJcbiAgICAgICAgaGVpZ2h0OiB0aWxlU2l6ZSxcclxuICAgICAgICB0ZXh0dXJlOiB0aC50ZXh0dXJlLFxyXG4gICAgICAgIGxheWVyOiB0aC50ZXh0dXJlTGF5ZXJcclxuICAgIH1cclxuXHJcbiAgICByZW5kZXJlci5kcmF3U3ByaXRlKHNwcml0ZSlcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlUmVzaXplKGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgIGlmIChjYW52YXMud2lkdGggPT09IGNhbnZhcy5jbGllbnRXaWR0aCAmJiBjYW52YXMuaGVpZ2h0ID09PSBjYW52YXMuY2xpZW50SGVpZ2h0KSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY2FudmFzLndpZHRoID0gY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzLmNsaWVudEhlaWdodFxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xyXG4gICAgY29uc3QgY2FudmFzID0gZG9tLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuICAgIGNvbnN0IHJlbmRlcmVyID0gbmV3IGdmeC5SZW5kZXJlcihjYW52YXMpXHJcblxyXG4gICAgY29uc3QgcGxheWVyOiBybC5QbGF5ZXIgPSB7XHJcbiAgICAgICAgbmFtZTogXCJQbGF5ZXJcIixcclxuICAgICAgICBwb3NpdGlvbjogWzAsIDBdLFxyXG4gICAgICAgIHBhc3NhYmxlOiBmYWxzZSxcclxuICAgICAgICB0cmFuc3BhcmVudDogdHJ1ZSxcclxuICAgICAgICBpbWFnZTogXCIuL2Fzc2V0cy9jaGFyLnBuZ1wiLFxyXG4gICAgICAgIHRleHR1cmU6IG51bGwsXHJcbiAgICAgICAgdGV4dHVyZUxheWVyOiBudWxsXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbWFwID0gYXdhaXQgZ2VuZXJhdGVNYXAocGxheWVyLCByZW5kZXJlciwgMzIsIDMyKVxyXG4gICAgY29uc3Qga2V5cyA9IG5ldyBpbnB1dC5LZXlzKClcclxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aWNrKHJlbmRlcmVyLCBrZXlzLCBtYXApKVxyXG59XHJcblxyXG5tYWluKCkiXX0=