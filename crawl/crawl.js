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
function tick(renderer, inp, player, map) {
    handleInput(renderer.canvas, player, map, inp);
    drawFrame(renderer, player, map);
    requestAnimationFrame(() => tick(renderer, inp, player, map));
}
function handleInput(canvas, player, map, inp) {
    const position = player.position.clone();
    if (inp.click) {
        const center = new geo.Point(canvas.width / 2, canvas.height / 2);
        const mousePosition = new geo.Point(inp.clickX, inp.clickY);
        const dxy = mousePosition.subPoint(center);
        const sgn = dxy.sign();
        const abs = dxy.abs();
        if (abs.x > tileSize / 2 && abs.x >= abs.y) {
            position.x += sgn.x;
        }
        if (abs.y > tileSize / 2 && abs.y > abs.x) {
            position.y += sgn.y;
        }
    }
    if (inp.pressed("w")) {
        position.y -= 1;
    }
    if (inp.pressed("s")) {
        position.y += 1;
    }
    if (inp.pressed("a")) {
        position.x -= 1;
    }
    if (inp.pressed("d")) {
        position.x += 1;
    }
    if (isPassable(map, position)) {
        player.position = position;
    }
    inp.flush();
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
    handleResize(renderer.canvas);
    const playerCoords = player.position;
    const center = new geo.Point(Math.floor((renderer.canvas.width - tileSize) / 2), Math.floor((renderer.canvas.height - tileSize) / 2));
    const offset = center.subPoint(playerCoords.mulScalar(rl.tileSize));
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
    renderer.flush(rl.lightRadius * tileSize);
}
function drawThing(renderer, offset, th) {
    if (!th.renderData) {
        throw new Error(`renderData is not set for ${th.name} with image: ${th.image}`);
    }
    const spritePosition = th.position.mulScalar(tileSize).addPoint(offset);
    const sprite = new gfx.Sprite({
        position: spritePosition,
        color: [1, 1, 1, 1],
        width: tileSize,
        height: tileSize,
        texture: th.renderData.texture,
        layer: th.renderData.textureLayer,
        flags: gfx.SpriteFlags.Lit | gfx.SpriteFlags.ArrayTexture | gfx.SpriteFlags.CastsShadows
    });
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
    const map = await generateMap(player, renderer, 16, 16);
    player.position = map.entry.clone();
    const inp = new input.Input(canvas);
    requestAnimationFrame(() => tick(renderer, inp, player, map));
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQTtBQUVuQixLQUFLLFVBQVUsV0FBVyxDQUFDLE1BQWlCLEVBQUUsUUFBc0IsRUFBRSxLQUFhLEVBQUUsTUFBYztJQUMvRixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUUxQyx1REFBdUQ7SUFDdkQsd0NBQXdDO0lBQ3hDLElBQUksU0FBUyxHQUFhLEVBQUUsQ0FBQTtJQUM1QixTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUM5QyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUNqRCxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDbEMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtB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QUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBc0IsQ0FBQTtJQUN0RCxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7SUFFekMsTUFBTSxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO1FBQ3pCLElBQUksRUFBRSxRQUFRO1FBQ2QsUUFBUSxFQUFFLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzdCLFFBQVEsRUFBRSxLQUFLO1FBQ2YsV0FBVyxFQUFFLElBQUk7UUFDakIsS0FBSyxFQUFFLG1CQUFtQjtLQUM3QixDQUFDLENBQUE7SUFFRixNQUFNLEdBQUcsR0FBRyxNQUFNLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUN2RCxNQUFNLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDbkMsTUFBTSxHQUFHLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBRW5DLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBQ2pFLENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuaW1wb3J0ICogYXMgZ2VuIGZyb20gXCIuL2dlbi5qc1wiXHJcbmltcG9ydCAqIGFzIGlucHV0IGZyb20gXCIuLi9zaGFyZWQvaW5wdXQuanNcIlxyXG5pbXBvcnQgKiBhcyBybCBmcm9tIFwiLi9ybC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuXHJcbmNvbnN0IHRpbGVTaXplID0gMjRcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlTWFwKHBsYXllcjogcmwuUGxheWVyLCByZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFByb21pc2U8Z2VuLk1hcERhdGE+IHtcclxuICAgIGNvbnN0IG1hcCA9IGdlbi5nZW5lcmF0ZU1hcCh3aWR0aCwgaGVpZ2h0KVxyXG5cclxuICAgIC8vIGJha2UgYWxsIDI0eDI0IHRpbGUgaW1hZ2VzIHRvIGEgc2luZ2xlIGFycmF5IHRleHR1cmVcclxuICAgIC8vIHN0b3JlIG1hcHBpbmcgZnJvbSBpbWFnZSB1cmwgdG8gaW5kZXhcclxuICAgIGxldCBpbWFnZVVybHM6IHN0cmluZ1tdID0gW11cclxuICAgIGltYWdlVXJscy5wdXNoKC4uLm1hcC50aWxlcy5tYXAodCA9PiB0LmltYWdlKSlcclxuICAgIGltYWdlVXJscy5wdXNoKC4uLm1hcC5maXh0dXJlcy5tYXAodCA9PiB0LmltYWdlKSlcclxuICAgIGltYWdlVXJscy5wdXNoKG1hcC5zdGFpcnNVcC5pbWFnZSlcclxuICAgIGltYWdlVXJscy5wdXNoKG1hcC5zdGFpcnNEb3duLmltYWdlKVxyXG4gICAgaW1hZ2VVcmxzLnB1c2gocGxheWVyLmltYWdlKVxyXG4gICAgaW1hZ2VVcmxzID0gaW1hZ2VVcmxzLmZpbHRlcih1cmwgPT4gdXJsKVxyXG4gICAgaW1hZ2VVcmxzID0gYXJyYXkuZGlzdGluY3QoaW1hZ2VVcmxzKVxyXG5cclxuICAgIGNvbnN0IGxheWVyTWFwID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oaW1hZ2VVcmxzLm1hcCgodXJsLCBpKSA9PiBbdXJsLCBpXSkpXHJcbiAgICBjb25zdCBpbWFnZXMgPSBhd2FpdCBQcm9taXNlLmFsbChpbWFnZVVybHMubWFwKHVybCA9PiBkb20ubG9hZEltYWdlKHVybCkpKVxyXG4gICAgY29uc3QgdGV4dHVyZSA9IHJlbmRlcmVyLmJha2VUZXh0dXJlQXJyYXkodGlsZVNpemUsIHRpbGVTaXplLCBpbWFnZXMpXHJcblxyXG4gICAgY29uc3QgaW5pdFJlbmRlckRhdGEgPSAodGg6IHJsLlRoaW5nKSA9PiB7XHJcbiAgICAgICAgY29uc3QgbGF5ZXIgPSBsYXllck1hcC5nZXQodGguaW1hZ2UpXHJcbiAgICAgICAgaWYgKGxheWVyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB0ZXh0dXJlIGluZGV4IG5vdCBmb3VuZCBmb3IgJHt0aC5pbWFnZX1gKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGgucmVuZGVyRGF0YSA9IHtcclxuICAgICAgICAgICAgdGV4dHVyZTogdGV4dHVyZSxcclxuICAgICAgICAgICAgdGV4dHVyZUxheWVyOiBsYXllclxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBtYXAudGlsZXMuZm9yRWFjaChpbml0UmVuZGVyRGF0YSlcclxuICAgIG1hcC5maXh0dXJlcy5mb3JFYWNoKGluaXRSZW5kZXJEYXRhKVxyXG4gICAgaW5pdFJlbmRlckRhdGEobWFwLnN0YWlyc1VwKVxyXG4gICAgaW5pdFJlbmRlckRhdGEobWFwLnN0YWlyc0Rvd24pXHJcbiAgICBpbml0UmVuZGVyRGF0YShwbGF5ZXIpXHJcblxyXG4gICAgcmV0dXJuIG1hcFxyXG59XHJcblxyXG5jb25zdCBlcnJvcnNEaXYgPSBkb20uYnlJZChcImVycm9yc1wiKTtcclxuXHJcbmZ1bmN0aW9uIGNsZWFyRXJyb3JNZXNzYWdlcygpIHtcclxuICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbihlcnJvcnNEaXYpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFwcGVuZEVycm9yTWVzc2FnZShlcnJvcjogc3RyaW5nKSB7XHJcbiAgICBjb25zb2xlLmxvZyhlcnJvcilcclxuICAgIGNvbnN0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICBkaXYuY2xhc3NMaXN0LmFkZChcImVycm9yLW1lc3NhZ2VcIilcclxuICAgIGRpdi50ZXh0Q29udGVudCA9IGVycm9yXHJcbiAgICBlcnJvcnNEaXYuYXBwZW5kQ2hpbGQoZGl2KVxyXG59XHJcblxyXG5mdW5jdGlvbiB0aWNrKHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIGlucDogaW5wdXQuSW5wdXQsIHBsYXllcjogcmwuUGxheWVyLCBtYXA6IGdlbi5NYXBEYXRhKSB7XHJcbiAgICBoYW5kbGVJbnB1dChyZW5kZXJlci5jYW52YXMsIHBsYXllciwgbWFwLCBpbnApXHJcbiAgICBkcmF3RnJhbWUocmVuZGVyZXIsIHBsYXllciwgbWFwKVxyXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRpY2socmVuZGVyZXIsIGlucCwgcGxheWVyLCBtYXApKVxyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVJbnB1dChjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50LCBwbGF5ZXI6IHJsLlBsYXllciwgbWFwOiBnZW4uTWFwRGF0YSwgaW5wOiBpbnB1dC5JbnB1dCkge1xyXG4gICAgY29uc3QgcG9zaXRpb24gPSBwbGF5ZXIucG9zaXRpb24uY2xvbmUoKVxyXG4gICAgXHJcbiAgICBpZiAoaW5wLmNsaWNrKSB7XHJcbiAgICAgICAgY29uc3QgY2VudGVyID0gbmV3IGdlby5Qb2ludChjYW52YXMud2lkdGggLyAyLCBjYW52YXMuaGVpZ2h0IC8gMilcclxuICAgICAgICBjb25zdCBtb3VzZVBvc2l0aW9uID0gbmV3IGdlby5Qb2ludChpbnAuY2xpY2tYLCBpbnAuY2xpY2tZKVxyXG4gICAgICAgIGNvbnN0IGR4eSA9IG1vdXNlUG9zaXRpb24uc3ViUG9pbnQoY2VudGVyKVxyXG4gICAgICAgIGNvbnN0IHNnbiA9IGR4eS5zaWduKClcclxuICAgICAgICBjb25zdCBhYnMgPSBkeHkuYWJzKClcclxuXHJcbiAgICAgICAgaWYgKGFicy54ID4gdGlsZVNpemUgLyAyICYmIGFicy54ID49IGFicy55KSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnggKz0gc2duLnhcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChhYnMueSA+IHRpbGVTaXplIC8gMiAmJiBhYnMueSA+IGFicy54KSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnkgKz0gc2duLnlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGlucC5wcmVzc2VkKFwid1wiKSkge1xyXG4gICAgICAgIHBvc2l0aW9uLnkgLT0gMVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChpbnAucHJlc3NlZChcInNcIikpIHtcclxuICAgICAgICBwb3NpdGlvbi55ICs9IDFcclxuICAgIH1cclxuXHJcbiAgICBpZiAoaW5wLnByZXNzZWQoXCJhXCIpKSB7XHJcbiAgICAgICAgcG9zaXRpb24ueCAtPSAxXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGlucC5wcmVzc2VkKFwiZFwiKSkge1xyXG4gICAgICAgIHBvc2l0aW9uLnggKz0gMVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChpc1Bhc3NhYmxlKG1hcCwgcG9zaXRpb24pKSB7XHJcbiAgICAgICAgcGxheWVyLnBvc2l0aW9uID0gcG9zaXRpb25cclxuICAgIH1cclxuXHJcbiAgICBpbnAuZmx1c2goKVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc1Bhc3NhYmxlKG1hcDogZ2VuLk1hcERhdGEsIHh5OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IHRpbGVzID0gYXJyYXkuZmlsdGVyKG1hcC50aWxlcywgdCA9PiB0LnBvc2l0aW9uLmVxdWFsKHh5KSlcclxuICAgIGZvciAoY29uc3QgdGlsZSBvZiB0aWxlcykge1xyXG4gICAgICAgIGlmICghdGlsZS5wYXNzYWJsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZml4dHVyZXMgPSBhcnJheS5maWx0ZXIobWFwLmZpeHR1cmVzLCB0ID0+IHQucG9zaXRpb24uZXF1YWwoeHkpKVxyXG4gICAgZm9yIChjb25zdCBmaXh0dXJlIG9mIGZpeHR1cmVzKSB7XHJcbiAgICAgICAgaWYgKCFmaXh0dXJlLnBhc3NhYmxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3RnJhbWUocmVuZGVyZXI6IGdmeC5SZW5kZXJlciwgcGxheWVyOiBybC5QbGF5ZXIsIG1hcDogZ2VuLk1hcERhdGEpIHtcclxuICAgIC8vIGNlbnRlciB0aGUgZ3JpZCBhcm91bmQgdGhlIHBsYXllclxyXG4gICAgaGFuZGxlUmVzaXplKHJlbmRlcmVyLmNhbnZhcylcclxuXHJcbiAgICBjb25zdCBwbGF5ZXJDb29yZHMgPSBwbGF5ZXIucG9zaXRpb25cclxuICAgIGNvbnN0IGNlbnRlciA9IG5ldyBnZW8uUG9pbnQoTWF0aC5mbG9vcigocmVuZGVyZXIuY2FudmFzLndpZHRoIC0gdGlsZVNpemUpIC8gMiksIE1hdGguZmxvb3IoKHJlbmRlcmVyLmNhbnZhcy5oZWlnaHQgLSB0aWxlU2l6ZSkgLyAyKSlcclxuICAgIGNvbnN0IG9mZnNldCA9IGNlbnRlci5zdWJQb2ludChwbGF5ZXJDb29yZHMubXVsU2NhbGFyKHJsLnRpbGVTaXplKSlcclxuXHJcbiAgICAvLyBkcmF3IHZhcmlvdXMgbGF5ZXJzIG9mIHNwcml0ZXNcclxuICAgIGZvciAoY29uc3QgdGlsZSBvZiBtYXAudGlsZXMpIHtcclxuICAgICAgICBkcmF3VGhpbmcocmVuZGVyZXIsIG9mZnNldCwgdGlsZSlcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IGZpeHR1cmUgb2YgbWFwLmZpeHR1cmVzKSB7XHJcbiAgICAgICAgZHJhd1RoaW5nKHJlbmRlcmVyLCBvZmZzZXQsIGZpeHR1cmUpXHJcbiAgICB9XHJcblxyXG4gICAgZHJhd1RoaW5nKHJlbmRlcmVyLCBvZmZzZXQsIG1hcC5zdGFpcnNVcClcclxuICAgIGRyYXdUaGluZyhyZW5kZXJlciwgb2Zmc2V0LCBtYXAuc3RhaXJzRG93bilcclxuICAgIGRyYXdUaGluZyhyZW5kZXJlciwgb2Zmc2V0LCBwbGF5ZXIpXHJcblxyXG4gICAgcmVuZGVyZXIuZmx1c2gocmwubGlnaHRSYWRpdXMgKiB0aWxlU2l6ZSlcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd1RoaW5nKHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIG9mZnNldDogZ2VvLlBvaW50LCB0aDogcmwuVGhpbmcpIHtcclxuICAgIGlmICghdGgucmVuZGVyRGF0YSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcmVuZGVyRGF0YSBpcyBub3Qgc2V0IGZvciAke3RoLm5hbWV9IHdpdGggaW1hZ2U6ICR7dGguaW1hZ2V9YClcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzcHJpdGVQb3NpdGlvbiA9IHRoLnBvc2l0aW9uLm11bFNjYWxhcih0aWxlU2l6ZSkuYWRkUG9pbnQob2Zmc2V0KVxyXG4gICAgY29uc3Qgc3ByaXRlID0gbmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgIHBvc2l0aW9uOiBzcHJpdGVQb3NpdGlvbixcclxuICAgICAgICBjb2xvcjogWzEsIDEsIDEsIDFdLFxyXG4gICAgICAgIHdpZHRoOiB0aWxlU2l6ZSxcclxuICAgICAgICBoZWlnaHQ6IHRpbGVTaXplLFxyXG4gICAgICAgIHRleHR1cmU6IHRoLnJlbmRlckRhdGEudGV4dHVyZSxcclxuICAgICAgICBsYXllcjogdGgucmVuZGVyRGF0YS50ZXh0dXJlTGF5ZXIsXHJcbiAgICAgICAgZmxhZ3M6IGdmeC5TcHJpdGVGbGFncy5MaXQgfCBnZnguU3ByaXRlRmxhZ3MuQXJyYXlUZXh0dXJlIHwgZ2Z4LlNwcml0ZUZsYWdzLkNhc3RzU2hhZG93c1xyXG4gICAgfSlcclxuXHJcbiAgICByZW5kZXJlci5kcmF3U3ByaXRlKHNwcml0ZSlcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlUmVzaXplKGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgIGlmIChjYW52YXMud2lkdGggPT09IGNhbnZhcy5jbGllbnRXaWR0aCAmJiBjYW52YXMuaGVpZ2h0ID09PSBjYW52YXMuY2xpZW50SGVpZ2h0KSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY2FudmFzLndpZHRoID0gY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzLmNsaWVudEhlaWdodFxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xyXG4gICAgY29uc3QgY2FudmFzID0gZG9tLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuICAgIGNvbnN0IHJlbmRlcmVyID0gbmV3IGdmeC5SZW5kZXJlcihjYW52YXMpXHJcblxyXG4gICAgY29uc3QgcGxheWVyID0gbmV3IHJsLlBsYXllcih7XHJcbiAgICAgICAgbmFtZTogXCJQbGF5ZXJcIixcclxuICAgICAgICBwb3NpdGlvbjogbmV3IGdlby5Qb2ludCgwLCAwKSxcclxuICAgICAgICBwYXNzYWJsZTogZmFsc2UsXHJcbiAgICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsXHJcbiAgICAgICAgaW1hZ2U6IFwiLi9hc3NldHMvY2hhci5wbmdcIlxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBtYXAgPSBhd2FpdCBnZW5lcmF0ZU1hcChwbGF5ZXIsIHJlbmRlcmVyLCAxNiwgMTYpXHJcbiAgICBwbGF5ZXIucG9zaXRpb24gPSBtYXAuZW50cnkuY2xvbmUoKVxyXG4gICAgY29uc3QgaW5wID0gbmV3IGlucHV0LklucHV0KGNhbnZhcylcclxuXHJcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGljayhyZW5kZXJlciwgaW5wLCBwbGF5ZXIsIG1hcCkpXHJcbn1cclxuXHJcbm1haW4oKSJdfQ==