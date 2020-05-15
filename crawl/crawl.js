import * as dom from "../shared/dom.js";
import * as array from "../shared/array.js";
import * as gfx from "./gfx.js";
import * as gen from "./gen.js";
import * as input from "../shared/input.js";
import * as rl from "./rl.js";
import * as geo from "../shared/geo2d.js";
import * as output from "./output.js";
async function generateMap(player, renderer, width, height) {
    const map = gen.generateMap(width, height, player);
    // bake all 24x24 tile images to a single array texture
    // store mapping from image url to index
    let imageUrls = [];
    imageUrls.push(...array.map(map.tiles, t => t.image));
    imageUrls.push(...array.map(map.fixtures, t => t.image));
    imageUrls.push(...array.map(map.creatures, c => c.image));
    imageUrls.push(player.image);
    imageUrls = imageUrls.filter(url => url);
    imageUrls = array.distinct(imageUrls);
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
    return map;
}
function tick(renderer, inp, player, map) {
    handleInput(renderer.canvas, player, map, inp);
    drawFrame(renderer, player, map);
    requestAnimationFrame(() => tick(renderer, inp, player, map));
}
function handleInput(canvas, player, map, inp) {
    const position = player.position.clone();
    if (inp.mouseLeftPressed) {
        const center = new geo.Point(canvas.width / 2, canvas.height / 2);
        const mousePosition = new geo.Point(inp.mouseX, inp.mouseY);
        const dxy = mousePosition.subPoint(center);
        const sgn = dxy.sign();
        const abs = dxy.abs();
        if (abs.x > rl.tileSize / 2 && abs.x >= abs.y) {
            position.x += sgn.x;
        }
        if (abs.y > rl.tileSize / 2 && abs.y > abs.x) {
            position.y += sgn.y;
        }
    }
    else if (inp.pressed("w")) {
        position.y -= 1;
    }
    else if (inp.pressed("s")) {
        position.y += 1;
    }
    else if (inp.pressed("a")) {
        position.x -= 1;
    }
    else if (inp.pressed("d")) {
        position.x += 1;
    }
    inp.flush();
    // no move - flush & exit
    if (position.equal(player.position)) {
        return;
    }
    const tile = map.tileAt(position);
    if (tile && !tile.passable) {
        return;
    }
    const fixture = map.fixtureAt(position);
    if (fixture instanceof rl.Door) {
        output.info("Door opened");
        map.fixtures.delete(fixture);
    }
    else if (fixture && !fixture.passable) {
        return;
    }
    const creature = map.creatureAt(position);
    if (creature && !creature.passable) {
        return;
    }
    player.position = position;
}
function drawFrame(renderer, player, map) {
    // center the grid around the player
    handleResize(renderer.canvas);
    const center = new geo.Point(Math.floor((renderer.canvas.width - rl.tileSize) / 2), Math.floor((renderer.canvas.height - rl.tileSize) / 2));
    const offset = center.subPoint(player.position.mulScalar(rl.tileSize));
    // note - drawing order matters - draw from bottom to top
    // draw various layers of sprites
    for (const tile of map.tiles) {
        drawThing(renderer, offset, tile);
    }
    for (const fixture of map.fixtures) {
        drawThing(renderer, offset, fixture);
    }
    for (const creature of map.creatures) {
        drawThing(renderer, offset, creature);
    }
    drawThing(renderer, offset, player);
    drawHealthBar(renderer, player, offset);
    renderer.flush(rl.lightRadius * rl.tileSize);
}
function drawThing(renderer, offset, th) {
    const spritePosition = th.position.mulScalar(rl.tileSize).addPoint(offset);
    const sprite = new gfx.Sprite({
        position: spritePosition,
        color: th.color,
        width: rl.tileSize,
        height: rl.tileSize,
        texture: th.texture,
        layer: th.textureLayer,
        flags: gfx.SpriteFlags.Lit | gfx.SpriteFlags.ArrayTexture | gfx.SpriteFlags.CastsShadows
    });
    renderer.drawSprite(sprite);
}
function drawHealthBar(renderer, creature, offset) {
    const width = creature.maxHealth * 4 + 2;
    const spritePosition = creature.position.mulScalar(rl.tileSize).addPoint(offset).subPoint(new geo.Point(0, rl.tileSize / 2));
    renderer.drawSprite(new gfx.Sprite({
        position: spritePosition,
        color: gfx.Color.white,
        width: width,
        height: 8
    }));
    renderer.drawSprite(new gfx.Sprite({
        position: spritePosition.addPoint(new geo.Point(1, 1)),
        color: gfx.Color.red,
        width: width - 2,
        height: 6
    }));
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
        image: "./assets/char.png",
        maxHealth: 6
    });
    const map = await generateMap(player, renderer, 128, 128);
    const inp = new input.Input(canvas);
    output.write("Your adventure begins");
    requestAnimationFrame(() => tick(renderer, inp, player, map));
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmF3bC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBRXJDLEtBQUssVUFBVSxXQUFXLENBQUMsTUFBaUIsRUFBRSxRQUFzQixFQUFFLEtBQWEsRUFBRSxNQUFjO0lBQy9GLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUVsRCx1REFBdUQ7SUFDdkQsd0NBQXdDO0lBQ3hDLElBQUksU0FBUyxHQUFhLEVBQUUsQ0FBQTtJQUM1QixTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFDckQsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBQ3hELFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FB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LFdBQVcsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxZQUFZLEVBQUU7UUFDOUUsT0FBTTtLQUNUO0lBRUQsTUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFBO0lBQ2pDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQTtBQUN2QyxDQUFDO0FBRUQsS0FBSyxVQUFVLElBQUk7SUFDZixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBc0IsQ0FBQTtJQUN0RCxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7SUFFekMsTUFBTSxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO1FBQ3pCLElBQUksRUFBRSxRQUFRO1FBQ2QsUUFBUSxFQUFFLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzdCLEtBQUssRUFBRSxtQkFBbUI7UUFDMUIsU0FBUyxFQUFFLENBQUM7S0FDZixDQUFDLENBQUE7SUFFRixNQUFNLEdBQUcsR0FBRyxNQUFNLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUN6RCxNQUFNLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7SUFFbkMsTUFBTSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO0lBQ3JDLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBQ2pFLENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuaW1wb3J0ICogYXMgZ2VuIGZyb20gXCIuL2dlbi5qc1wiXHJcbmltcG9ydCAqIGFzIGlucHV0IGZyb20gXCIuLi9zaGFyZWQvaW5wdXQuanNcIlxyXG5pbXBvcnQgKiBhcyBybCBmcm9tIFwiLi9ybC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgb3V0cHV0IGZyb20gXCIuL291dHB1dC5qc1wiXHJcblxyXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZU1hcChwbGF5ZXI6IHJsLlBsYXllciwgcmVuZGVyZXI6IGdmeC5SZW5kZXJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBQcm9taXNlPGdlbi5NYXBEYXRhPiB7XHJcbiAgICBjb25zdCBtYXAgPSBnZW4uZ2VuZXJhdGVNYXAod2lkdGgsIGhlaWdodCwgcGxheWVyKVxyXG5cclxuICAgIC8vIGJha2UgYWxsIDI0eDI0IHRpbGUgaW1hZ2VzIHRvIGEgc2luZ2xlIGFycmF5IHRleHR1cmVcclxuICAgIC8vIHN0b3JlIG1hcHBpbmcgZnJvbSBpbWFnZSB1cmwgdG8gaW5kZXhcclxuICAgIGxldCBpbWFnZVVybHM6IHN0cmluZ1tdID0gW11cclxuICAgIGltYWdlVXJscy5wdXNoKC4uLmFycmF5Lm1hcChtYXAudGlsZXMsIHQgPT4gdC5pbWFnZSkpXHJcbiAgICBpbWFnZVVybHMucHVzaCguLi5hcnJheS5tYXAobWFwLmZpeHR1cmVzLCB0ID0+IHQuaW1hZ2UpKVxyXG4gICAgaW1hZ2VVcmxzLnB1c2goLi4uYXJyYXkubWFwKG1hcC5jcmVhdHVyZXMsIGMgPT4gYy5pbWFnZSkpXHJcbiAgICBpbWFnZVVybHMucHVzaChwbGF5ZXIuaW1hZ2UpXHJcbiAgICBpbWFnZVVybHMgPSBpbWFnZVVybHMuZmlsdGVyKHVybCA9PiB1cmwpXHJcbiAgICBpbWFnZVVybHMgPSBhcnJheS5kaXN0aW5jdChpbWFnZVVybHMpXHJcblxyXG4gICAgY29uc3QgbGF5ZXJNYXAgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPihpbWFnZVVybHMubWFwKCh1cmwsIGkpID0+IFt1cmwsIGldKSlcclxuICAgIGNvbnN0IGltYWdlcyA9IGF3YWl0IFByb21pc2UuYWxsKGltYWdlVXJscy5tYXAodXJsID0+IGRvbS5sb2FkSW1hZ2UodXJsKSkpXHJcbiAgICBjb25zdCB0ZXh0dXJlID0gcmVuZGVyZXIuYmFrZVRleHR1cmVBcnJheShybC50aWxlU2l6ZSwgcmwudGlsZVNpemUsIGltYWdlcylcclxuXHJcbiAgICBmb3IgKGNvbnN0IHRoIG9mIG1hcCkge1xyXG4gICAgICAgIGlmICghdGguaW1hZ2UpIHtcclxuICAgICAgICAgICAgdGgudGV4dHVyZUxheWVyID0gLTFcclxuICAgICAgICAgICAgdGgudGV4dHVyZSA9IG51bGxcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGxheWVyID0gbGF5ZXJNYXAuZ2V0KHRoLmltYWdlKVxyXG4gICAgICAgIGlmIChsYXllciA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdGV4dHVyZSBpbmRleCBub3QgZm91bmQgZm9yICR7dGguaW1hZ2V9YClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoLnRleHR1cmUgPSB0ZXh0dXJlXHJcbiAgICAgICAgdGgudGV4dHVyZUxheWVyID0gbGF5ZXJcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbWFwXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRpY2socmVuZGVyZXI6IGdmeC5SZW5kZXJlciwgaW5wOiBpbnB1dC5JbnB1dCwgcGxheWVyOiBybC5QbGF5ZXIsIG1hcDogZ2VuLk1hcERhdGEpIHtcclxuICAgIGhhbmRsZUlucHV0KHJlbmRlcmVyLmNhbnZhcywgcGxheWVyLCBtYXAsIGlucClcclxuICAgIGRyYXdGcmFtZShyZW5kZXJlciwgcGxheWVyLCBtYXApXHJcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGljayhyZW5kZXJlciwgaW5wLCBwbGF5ZXIsIG1hcCkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZUlucHV0KGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQsIHBsYXllcjogcmwuUGxheWVyLCBtYXA6IGdlbi5NYXBEYXRhLCBpbnA6IGlucHV0LklucHV0KSB7XHJcbiAgICBjb25zdCBwb3NpdGlvbiA9IHBsYXllci5wb3NpdGlvbi5jbG9uZSgpXHJcblxyXG4gICAgaWYgKGlucC5tb3VzZUxlZnRQcmVzc2VkKSB7XHJcbiAgICAgICAgY29uc3QgY2VudGVyID0gbmV3IGdlby5Qb2ludChjYW52YXMud2lkdGggLyAyLCBjYW52YXMuaGVpZ2h0IC8gMilcclxuICAgICAgICBjb25zdCBtb3VzZVBvc2l0aW9uID0gbmV3IGdlby5Qb2ludChpbnAubW91c2VYLCBpbnAubW91c2VZKVxyXG4gICAgICAgIGNvbnN0IGR4eSA9IG1vdXNlUG9zaXRpb24uc3ViUG9pbnQoY2VudGVyKVxyXG4gICAgICAgIGNvbnN0IHNnbiA9IGR4eS5zaWduKClcclxuICAgICAgICBjb25zdCBhYnMgPSBkeHkuYWJzKClcclxuXHJcbiAgICAgICAgaWYgKGFicy54ID4gcmwudGlsZVNpemUgLyAyICYmIGFicy54ID49IGFicy55KSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnggKz0gc2duLnhcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChhYnMueSA+IHJsLnRpbGVTaXplIC8gMiAmJiBhYnMueSA+IGFicy54KSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnkgKz0gc2duLnlcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJ3XCIpKSB7XHJcbiAgICAgICAgcG9zaXRpb24ueSAtPSAxXHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChpbnAucHJlc3NlZChcInNcIikpIHtcclxuICAgICAgICBwb3NpdGlvbi55ICs9IDFcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGlucC5wcmVzc2VkKFwiYVwiKSkge1xyXG4gICAgICAgIHBvc2l0aW9uLnggLT0gMVxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoaW5wLnByZXNzZWQoXCJkXCIpKSB7XHJcbiAgICAgICAgcG9zaXRpb24ueCArPSAxXHJcbiAgICB9XHJcblxyXG4gICAgaW5wLmZsdXNoKClcclxuXHJcbiAgICAvLyBubyBtb3ZlIC0gZmx1c2ggJiBleGl0XHJcbiAgICBpZiAocG9zaXRpb24uZXF1YWwocGxheWVyLnBvc2l0aW9uKSkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHRpbGUgPSBtYXAudGlsZUF0KHBvc2l0aW9uKVxyXG4gICAgaWYgKHRpbGUgJiYgIXRpbGUucGFzc2FibGUpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmaXh0dXJlID0gbWFwLmZpeHR1cmVBdChwb3NpdGlvbilcclxuICAgIGlmIChmaXh0dXJlIGluc3RhbmNlb2YgcmwuRG9vcikge1xyXG4gICAgICAgIG91dHB1dC5pbmZvKFwiRG9vciBvcGVuZWRcIilcclxuICAgICAgICBtYXAuZml4dHVyZXMuZGVsZXRlKGZpeHR1cmUpXHJcbiAgICB9IGVsc2UgaWYgKGZpeHR1cmUgJiYgIWZpeHR1cmUucGFzc2FibGUpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBjcmVhdHVyZSA9IG1hcC5jcmVhdHVyZUF0KHBvc2l0aW9uKVxyXG4gICAgaWYgKGNyZWF0dXJlICYmICFjcmVhdHVyZS5wYXNzYWJsZSkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIHBsYXllci5wb3NpdGlvbiA9IHBvc2l0aW9uXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdGcmFtZShyZW5kZXJlcjogZ2Z4LlJlbmRlcmVyLCBwbGF5ZXI6IHJsLlBsYXllciwgbWFwOiBnZW4uTWFwRGF0YSkge1xyXG4gICAgLy8gY2VudGVyIHRoZSBncmlkIGFyb3VuZCB0aGUgcGxheWVyXHJcbiAgICBoYW5kbGVSZXNpemUocmVuZGVyZXIuY2FudmFzKVxyXG5cclxuICAgIGNvbnN0IGNlbnRlciA9IG5ldyBnZW8uUG9pbnQoXHJcbiAgICAgICAgTWF0aC5mbG9vcigocmVuZGVyZXIuY2FudmFzLndpZHRoIC0gcmwudGlsZVNpemUpIC8gMiksIFxyXG4gICAgICAgIE1hdGguZmxvb3IoKHJlbmRlcmVyLmNhbnZhcy5oZWlnaHQgLXJsLnRpbGVTaXplKSAvIDIpKVxyXG5cclxuICAgIGNvbnN0IG9mZnNldCA9IGNlbnRlci5zdWJQb2ludChwbGF5ZXIucG9zaXRpb24ubXVsU2NhbGFyKHJsLnRpbGVTaXplKSlcclxuXHJcbiAgICAvLyBub3RlIC0gZHJhd2luZyBvcmRlciBtYXR0ZXJzIC0gZHJhdyBmcm9tIGJvdHRvbSB0byB0b3BcclxuXHJcbiAgICAvLyBkcmF3IHZhcmlvdXMgbGF5ZXJzIG9mIHNwcml0ZXNcclxuICAgIGZvciAoY29uc3QgdGlsZSBvZiBtYXAudGlsZXMpIHtcclxuICAgICAgICBkcmF3VGhpbmcocmVuZGVyZXIsIG9mZnNldCwgdGlsZSlcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IGZpeHR1cmUgb2YgbWFwLmZpeHR1cmVzKSB7XHJcbiAgICAgICAgZHJhd1RoaW5nKHJlbmRlcmVyLCBvZmZzZXQsIGZpeHR1cmUpXHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCBjcmVhdHVyZSBvZiBtYXAuY3JlYXR1cmVzKSB7XHJcbiAgICAgICAgZHJhd1RoaW5nKHJlbmRlcmVyLCBvZmZzZXQsIGNyZWF0dXJlKVxyXG4gICAgfVxyXG5cclxuICAgIGRyYXdUaGluZyhyZW5kZXJlciwgb2Zmc2V0LCBwbGF5ZXIpXHJcbiAgICBkcmF3SGVhbHRoQmFyKHJlbmRlcmVyLCBwbGF5ZXIsIG9mZnNldClcclxuXHJcbiAgICByZW5kZXJlci5mbHVzaChybC5saWdodFJhZGl1cyAqIHJsLnRpbGVTaXplKVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3VGhpbmcocmVuZGVyZXI6IGdmeC5SZW5kZXJlciwgb2Zmc2V0OiBnZW8uUG9pbnQsIHRoOiBybC5UaGluZykge1xyXG4gICAgY29uc3Qgc3ByaXRlUG9zaXRpb24gPSB0aC5wb3NpdGlvbi5tdWxTY2FsYXIocmwudGlsZVNpemUpLmFkZFBvaW50KG9mZnNldClcclxuICAgIGNvbnN0IHNwcml0ZSA9IG5ldyBnZnguU3ByaXRlKHtcclxuICAgICAgICBwb3NpdGlvbjogc3ByaXRlUG9zaXRpb24sXHJcbiAgICAgICAgY29sb3I6IHRoLmNvbG9yLFxyXG4gICAgICAgIHdpZHRoOiBybC50aWxlU2l6ZSxcclxuICAgICAgICBoZWlnaHQ6IHJsLnRpbGVTaXplLFxyXG4gICAgICAgIHRleHR1cmU6IHRoLnRleHR1cmUsXHJcbiAgICAgICAgbGF5ZXI6IHRoLnRleHR1cmVMYXllcixcclxuICAgICAgICBmbGFnczogZ2Z4LlNwcml0ZUZsYWdzLkxpdCB8IGdmeC5TcHJpdGVGbGFncy5BcnJheVRleHR1cmUgfCBnZnguU3ByaXRlRmxhZ3MuQ2FzdHNTaGFkb3dzXHJcbiAgICB9KVxyXG5cclxuICAgIHJlbmRlcmVyLmRyYXdTcHJpdGUoc3ByaXRlKVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3SGVhbHRoQmFyKHJlbmRlcmVyOiBnZnguUmVuZGVyZXIsIGNyZWF0dXJlOiBybC5DcmVhdHVyZSwgb2Zmc2V0OiBnZW8uUG9pbnQpIHtcclxuICAgIGNvbnN0IHdpZHRoID0gY3JlYXR1cmUubWF4SGVhbHRoICogNCArIDJcclxuICAgIGNvbnN0IHNwcml0ZVBvc2l0aW9uID0gY3JlYXR1cmUucG9zaXRpb24ubXVsU2NhbGFyKHJsLnRpbGVTaXplKS5hZGRQb2ludChvZmZzZXQpLnN1YlBvaW50KG5ldyBnZW8uUG9pbnQoMCwgcmwudGlsZVNpemUgLyAyKSlcclxuICAgIHJlbmRlcmVyLmRyYXdTcHJpdGUobmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgIHBvc2l0aW9uOiBzcHJpdGVQb3NpdGlvbixcclxuICAgICAgICBjb2xvcjogZ2Z4LkNvbG9yLndoaXRlLFxyXG4gICAgICAgIHdpZHRoOiB3aWR0aCxcclxuICAgICAgICBoZWlnaHQ6IDhcclxuICAgIH0pKVxyXG5cclxuICAgIHJlbmRlcmVyLmRyYXdTcHJpdGUobmV3IGdmeC5TcHJpdGUoe1xyXG4gICAgICAgIHBvc2l0aW9uOiBzcHJpdGVQb3NpdGlvbi5hZGRQb2ludChuZXcgZ2VvLlBvaW50KDEsIDEpKSxcclxuICAgICAgICBjb2xvcjogZ2Z4LkNvbG9yLnJlZCxcclxuICAgICAgICB3aWR0aDogd2lkdGggLSAyLFxyXG4gICAgICAgIGhlaWdodDogNlxyXG4gICAgfSkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZVJlc2l6ZShjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICBpZiAoY2FudmFzLndpZHRoID09PSBjYW52YXMuY2xpZW50V2lkdGggJiYgY2FudmFzLmhlaWdodCA9PT0gY2FudmFzLmNsaWVudEhlaWdodCkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgY2FudmFzLmhlaWdodCA9IGNhbnZhcy5jbGllbnRIZWlnaHRcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gbWFpbigpIHtcclxuICAgIGNvbnN0IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICBjb25zdCByZW5kZXJlciA9IG5ldyBnZnguUmVuZGVyZXIoY2FudmFzKVxyXG5cclxuICAgIGNvbnN0IHBsYXllciA9IG5ldyBybC5QbGF5ZXIoe1xyXG4gICAgICAgIG5hbWU6IFwiUGxheWVyXCIsXHJcbiAgICAgICAgcG9zaXRpb246IG5ldyBnZW8uUG9pbnQoMCwgMCksXHJcbiAgICAgICAgaW1hZ2U6IFwiLi9hc3NldHMvY2hhci5wbmdcIixcclxuICAgICAgICBtYXhIZWFsdGg6IDZcclxuICAgIH0pXHJcblxyXG4gICAgY29uc3QgbWFwID0gYXdhaXQgZ2VuZXJhdGVNYXAocGxheWVyLCByZW5kZXJlciwgMTI4LCAxMjgpXHJcbiAgICBjb25zdCBpbnAgPSBuZXcgaW5wdXQuSW5wdXQoY2FudmFzKVxyXG5cclxuICAgIG91dHB1dC53cml0ZShcIllvdXIgYWR2ZW50dXJlIGJlZ2luc1wiKVxyXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRpY2socmVuZGVyZXIsIGlucCwgcGxheWVyLCBtYXApKVxyXG59XHJcblxyXG5tYWluKCkiXX0=