import * as util from "../shared/util.js";
import * as imaging from "../shared/imaging.js";
var CameraMode;
(function (CameraMode) {
    CameraMode[CameraMode["None"] = 0] = "None";
    CameraMode[CameraMode["User"] = 1] = "User";
    CameraMode[CameraMode["Environment"] = 2] = "Environment";
})(CameraMode || (CameraMode = {}));
function calcWidth(bounds) {
    return bounds.maxX - bounds.minX + 1;
}
function calcHeight(bounds) {
    return bounds.maxY - bounds.minY + 1;
}
function calcArea(bounds) {
    return calcWidth(bounds) * calcHeight(bounds);
}
function calcCenter(bounds) {
    return [
        bounds.minX + calcWidth(bounds) / 2,
        bounds.minY + calcHeight(bounds) / 2
    ];
}
const camera = util.byId("camera");
let cameraMode = CameraMode.None;
const canvas = util.byId("canvas");
const acquireImageDiv = util.byId("acquireImage");
const paletteDiv = util.byId("palette");
const paletteEntryTemplate = util.byId("paletteEntry");
const ctx = canvas.getContext("2d");
if (!ctx) {
    throwErrorMessage("Canvas element not supported");
}
const captureImageButton = util.byId("captureImageButton");
const loadUi = util.byId("loadUi");
const playUi = util.byId("playUi");
let playState = null;
init();
async function init() {
    const fileDropBox = util.byId("fileDropBox");
    const fileInput = util.byId("fileInput");
    const fileButton = util.byId("fileButton");
    const useCameraButton = util.byId("useCameraButton");
    const flipCameraButton = util.byId("flipCameraButton");
    const stopCameraButton = util.byId("stopCameraButton");
    const returnButton = util.byId("returnButton");
    fileButton.addEventListener("click", () => {
        fileInput.click();
    });
    fileDropBox.addEventListener("dragenter", onDragEnterOver);
    fileDropBox.addEventListener("dragover", onDragEnterOver);
    fileDropBox.addEventListener("drop", onFileDrop);
    fileInput.addEventListener("change", () => {
        var _a;
        if (!((_a = fileInput.files) === null || _a === void 0 ? void 0 : _a.length)) {
            return;
        }
        const file = fileInput.files[0];
        processFile(file);
    });
    useCameraButton.addEventListener("click", useCamera);
    flipCameraButton.addEventListener("click", flipCamera);
    stopCameraButton.addEventListener("click", stopCamera);
    captureImageButton.addEventListener("click", captureImage);
    returnButton.addEventListener("click", showLoadUi);
    canvas.addEventListener("click", onCanvasClick);
}
function onDragEnterOver(ev) {
    ev.stopPropagation();
    ev.preventDefault();
}
function onFileDrop(ev) {
    var _a, _b;
    ev.stopPropagation();
    ev.preventDefault();
    if (!((_b = (_a = ev === null || ev === void 0 ? void 0 : ev.dataTransfer) === null || _a === void 0 ? void 0 : _a.files) === null || _b === void 0 ? void 0 : _b.length)) {
        return;
    }
    const file = ev.dataTransfer.files[0];
    processFile(file);
}
function processFile(file) {
    clearErrorMessages();
    const url = URL.createObjectURL(file);
    loadFromUrl(url);
}
function loadFromUrl(url) {
    clearErrorMessages();
    const img = new Image();
    img.addEventListener("load", () => {
        playState = showPlayUi(img, img.width, img.height);
    });
    img.src = url;
}
function clearErrorMessages() {
    const errorsDiv = util.byId("errors");
    util.removeAllChildren(errorsDiv);
}
function appendErrorMessage(error) {
    const errorsDiv = util.byId("errors");
    const div = document.createElement("div");
    div.classList.add("error-message");
    div.textContent = error;
    errorsDiv.appendChild(div);
}
function throwErrorMessage(error) {
    appendErrorMessage(error);
    throw new Error(error);
}
async function useCamera() {
    acquireImageDiv.hidden = false;
    const dialogWidth = acquireImageDiv.clientWidth;
    const dialogHeight = acquireImageDiv.clientHeight;
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { max: dialogWidth }, height: { max: dialogHeight }, facingMode: "user" },
        audio: false
    });
    cameraMode = CameraMode.User;
    camera.srcObject = stream;
    camera.addEventListener("loadedmetadata", onCameraLoad);
}
async function flipCamera() {
    if (!camera.srcObject) {
        return;
    }
    const src = camera.srcObject;
    const tracks = src.getTracks();
    for (const track of tracks) {
        track.stop();
    }
    cameraMode = cameraMode == CameraMode.User ? CameraMode.Environment : CameraMode.User;
    const facingMode = cameraMode == CameraMode.User ? "user" : "environment";
    // get current facing mode
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: camera.clientWidth, height: camera.clientHeight, facingMode: facingMode },
        audio: false
    });
    camera.srcObject = stream;
    camera.addEventListener("loadedmetadata", onCameraLoad);
}
function onCameraLoad() {
    acquireImageDiv.hidden = false;
    camera.play();
}
function stopCamera() {
    const src = camera.srcObject;
    if (!src) {
        return;
    }
    const tracks = src.getTracks();
    for (const track of tracks) {
        track.stop();
    }
    cameraMode = CameraMode.None;
    acquireImageDiv.hidden = true;
}
function captureImage() {
    clearErrorMessages();
    const src = camera.srcObject;
    if (!src) {
        return;
    }
    const track = src.getVideoTracks()[0];
    if (!track) {
        return;
    }
    showPlayUi(camera, camera.videoWidth, camera.videoHeight);
}
function showPlayUi(img, width, height) {
    // maintain aspect ratio!
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    if (vw < vh) {
        canvas.width = vw;
        canvas.height = vw * height / width;
    }
    else {
        canvas.height = vh;
        canvas.width = vh * width / height;
    }
    loadUi.hidden = true;
    playUi.hidden = false;
    ctx.drawImage(img, 0, 0, canvas.clientWidth, canvas.clientHeight);
    const playState = processImage();
    return playState;
}
function showLoadUi() {
    loadUi.hidden = false;
    playUi.hidden = true;
}
function processImage() {
    // get (flat) image data from canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const initialImageData = imaging.copyImageData(imageData);
    const { width, height } = imageData;
    // convert to xyz colors and palettize data
    let [palette, paletteOverlay] = palettize(imageData, 3, 8);
    imaging.applyPalette(palette, paletteOverlay, imageData);
    ctx.putImageData(imageData, 0, 0);
    let [regions, regionOverlay] = createRegionOverlay(width, height, paletteOverlay);
    regions = pruneRegions(width, height, regions, regionOverlay);
    // some pallette entries will now be unused by regions, remove these
    palette = removeUnusedPaletteEntries(palette, regions);
    drawBorders(regionOverlay, imageData);
    fillInterior(imageData.data, regionOverlay);
    ctx.putImageData(imageData, 0, 0);
    createPaletteUi(palette);
    drawRegionLabels(ctx, regions);
    return {
        imageData: initialImageData,
        palette: palette,
        regions: regions,
        regionOverlay: regionOverlay
    };
}
// specialized to ignore white
function palettize(imageData, bucketsPerComponent, maxColors) {
    const { width, height, data } = imageData;
    const pixels = width * height;
    const bucketPitch = bucketsPerComponent * bucketsPerComponent;
    const numBuckets = bucketPitch * bucketsPerComponent;
    // creat intial buckets
    let buckets = util.generate(numBuckets, () => ({ color: [0, 0, 0], pixels: 0 }));
    // assign and update bucket for each pixel
    const bucketOverlay = util.generate(pixels, i => {
        const r = data[i * 4] / 255;
        const g = data[i * 4 + 1] / 255;
        const b = data[i * 4 + 2] / 255;
        // ignore white
        if (r >= .95 && g >= .95 && b >= .95) {
            return null;
        }
        const rb = Math.min(Math.floor(r * bucketsPerComponent), bucketsPerComponent - 1);
        const gb = Math.min(Math.floor(g * bucketsPerComponent), bucketsPerComponent - 1);
        const bb = Math.min(Math.floor(b * bucketsPerComponent), bucketsPerComponent - 1);
        const bucketIdx = rb * bucketPitch + gb * bucketsPerComponent + bb;
        const bucket = buckets[bucketIdx];
        bucket.color = imaging.addXYZ([r, g, b], bucket.color);
        bucket.pixels++;
        return bucket;
    });
    // prune empty buckets
    buckets = buckets.filter(b => b.pixels > 0);
    // calculate bucket colors
    for (const bucket of buckets) {
        bucket.color = imaging.divXYZ(bucket.color, bucket.pixels);
    }
    // combine buckets that are very close in color after color averaging
    let bucketSet = new Set(buckets);
    while (bucketSet.size > 1) {
        // proceed for as long as buckets can be combined
        let merge = false;
        for (const bucket of bucketSet) {
            // find "nearest" color
            const nearest = [...bucketSet]
                .filter(b => b != bucket)
                .reduce((b1, b2) => imaging.calcDistSq(bucket.color, b1.color) < imaging.calcDistSq(bucket.color, b2.color) ? b1 : b2);
            const distSq = imaging.calcDistSq(bucket.color, nearest.color);
            if (distSq > .1) {
                continue;
            }
            // merge the buckets
            bucket.color = imaging.divXYZ(imaging.addXYZ(imaging.mulXYZ(bucket.color, bucket.pixels), imaging.mulXYZ(nearest.color, nearest.pixels)), bucket.pixels + nearest.pixels);
            bucketSet.delete(nearest);
            merge = true;
        }
        if (!merge) {
            break;
        }
    }
    buckets = [...bucketSet]
        .sort((b1, b2) => b2.pixels - b1.pixels)
        .slice(0, maxColors);
    // map all colors to top N buckets
    for (let i = 0; i < bucketOverlay.length; ++i) {
        // otherwise, map to new bucket
        const r = data[i * 4] / 255;
        const g = data[i * 4 + 1] / 255;
        const b = data[i * 4 + 2] / 255;
        if (r >= .95 && g >= .95 && b >= .95) {
            bucketOverlay[i] = null;
            continue;
        }
        const color = [r, g, b];
        const bucket = buckets.reduce((b1, b2) => imaging.calcDistSq(b1.color, color) < imaging.calcDistSq(b2.color, color) ? b1 : b2);
        bucketOverlay[i] = bucket;
    }
    // determine palette colors
    const palette = buckets.map(b => imaging.mulXYZ(b.color, 255));
    const paletteOverlay = bucketOverlay.map(b => b ? buckets.indexOf(b) : -1);
    return [palette, paletteOverlay];
}
function createRegionOverlay(width, height, paletteOverlay) {
    const regionOverlay = util.fill(null, width * height);
    const regions = [];
    imaging.scan(width, height, (x, y, offset) => {
        if (regionOverlay[offset]) {
            return;
        }
        const region = {
            color: paletteOverlay[offset],
            pixels: 0,
            bounds: {
                minX: Infinity,
                maxX: -1,
                minY: Infinity,
                maxY: -1
            },
            maxRect: {
                minX: Infinity,
                maxX: -1,
                minY: Infinity,
                maxY: -1
            },
            filled: false
        };
        regionOverlay[offset] = region;
        regions.push(region);
        exploreRegion(width, height, paletteOverlay, x, y, regionOverlay);
    });
    // prune some regions
    return [regions, regionOverlay];
}
function pruneRegions(width, height, regions, regionOverlay) {
    const regionSet = new Set(regions);
    const minRegionWidth = 10;
    const minRegionHeight = 10;
    const minRegionPixels = minRegionWidth * minRegionHeight;
    for (const region of regions) {
        if (region.pixels <= minRegionPixels) {
            regionSet.delete(region);
        }
    }
    calcRegionBounds(width, height, regionOverlay);
    for (const region of regionSet) {
        if (calcWidth(region.bounds) <= minRegionWidth) {
            regionSet.delete(region);
        }
        if (calcHeight(region.bounds) <= minRegionHeight) {
            regionSet.delete(region);
        }
    }
    // calculate maximal rec for each region
    for (const region of regionSet) {
        region.maxRect = calcMaxRegionRect(width, region, regionOverlay);
    }
    for (const region of regionSet) {
        if (calcWidth(region.maxRect) < minRegionWidth) {
            regionSet.delete(region);
            continue;
        }
        if (calcHeight(region.maxRect) < minRegionHeight) {
            regionSet.delete(region);
            continue;
        }
    }
    // update the overlay
    for (let i = 0; i < regionOverlay.length; ++i) {
        const region = regionOverlay[i];
        if (!region) {
            continue;
        }
        if (!regionSet.has(region)) {
            regionOverlay[i] = null;
        }
    }
    return [...regionSet];
}
function removeUnusedPaletteEntries(palette, regions) {
    // create a map from current color index to new color index
    const usedSet = new Set(regions.map(r => r.color));
    usedSet.delete(-1);
    const used = [...usedSet];
    const map = new Map(used.map((u, i) => [u, i]));
    for (const region of regions) {
        if (region.color === -1) {
            continue;
        }
        const color = map.get(region.color);
        if (typeof color === "undefined") {
            throw new Error("Color not found in map");
        }
        region.color = color;
    }
    return used.map(i => palette[i]);
}
function calcRegionBounds(width, height, regionOverlay) {
    imaging.scan(width, height, (x, y, offset) => {
        const region = regionOverlay[offset];
        if (!region) {
            return;
        }
        const bounds = region.bounds;
        bounds.minX = Math.min(bounds.minX, x);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxY = Math.max(bounds.maxY, y);
    });
}
function calcMaxRegionRect(rowPitch, region, regionOverlay) {
    // derived from https://stackoverflow.com/questions/7245/puzzle-find-largest-rectangle-maximal-rectangle-problem
    // algorithm needs to keep track of rectangle state for every column for every region
    const { minX: x0, minY: y0, maxX: x1, maxY: y1 } = region.bounds;
    const width = x1 - x0 + 1;
    const height = y1 - y0 + 1;
    const ls = util.fill(x0, width);
    const rs = util.fill(x0 + width, width);
    const hs = util.fill(0, width);
    let maxArea = 0;
    const bounds = {
        minX: Infinity,
        maxX: -1,
        minY: Infinity,
        maxY: -1,
    };
    imaging.scanRowsRegion(y0, height, rowPitch, (y, yOffset) => {
        let l = x0;
        let r = x0 + width;
        // height scan
        for (let x = x0; x < x1; ++x) {
            const i = x - x0;
            const offset = yOffset + x;
            const isRegion = regionOverlay[offset] === region;
            if (isRegion) {
                hs[i] += 1;
            }
            else {
                hs[i] = 0;
            }
        }
        // l scan
        for (let x = x0; x < x1; ++x) {
            const i = x - x0;
            const offset = yOffset + x;
            const isRegion = regionOverlay[offset] === region;
            if (isRegion) {
                ls[i] = Math.max(ls[i], l);
            }
            else {
                ls[i] = 0;
                l = x + 1;
            }
        }
        // r scan
        for (let x = x1 - 1; x >= x0; --x) {
            const i = x - x0;
            const offset = yOffset + x;
            const isRegion = regionOverlay[offset] === region;
            if (isRegion) {
                rs[i] = Math.min(rs[i], r);
            }
            else {
                rs[i] = x1;
                r = x;
            }
        }
        // area scan
        for (let i = 0; i < width; ++i) {
            const area = hs[i] * (rs[i] - ls[i]);
            if (area > maxArea) {
                maxArea = area;
                bounds.minX = ls[i];
                bounds.maxX = rs[i];
                bounds.minY = y - hs[i];
                bounds.maxY = y;
            }
        }
    });
    return bounds;
}
function exploreRegion(width, height, paletteOverlay, x0, y0, regionOverlay) {
    const stack = [];
    const offset0 = y0 * width + x0;
    const region = regionOverlay[offset0];
    if (!region) {
        return;
    }
    const color = region.color;
    stack.push(x0);
    stack.push(y0);
    while (stack.length > 0) {
        const y = stack.pop();
        const x = stack.pop();
        const offset = y * width + x;
        regionOverlay[offset] = region;
        region.pixels++;
        // explore neighbors (if same color)
        const l = x - 1;
        const r = x + 1;
        const t = y - 1;
        const b = y + 1;
        if (l >= 0) {
            const offset1 = offset - 1;
            const region1 = regionOverlay[offset1];
            const color1 = paletteOverlay[offset1];
            if (!region1 && color === color1) {
                stack.push(l);
                stack.push(y);
            }
        }
        if (r < width) {
            const offset1 = offset + 1;
            const region1 = regionOverlay[offset1];
            const color1 = paletteOverlay[offset1];
            if (!region1 && color === color1) {
                stack.push(r);
                stack.push(y);
            }
        }
        if (t >= 0) {
            const offset1 = offset - width;
            const region1 = regionOverlay[offset1];
            const color1 = paletteOverlay[offset1];
            if (!region1 && color === color1) {
                stack.push(x);
                stack.push(t);
            }
        }
        if (b < height) {
            const offset1 = offset + width;
            const region1 = regionOverlay[offset1];
            const color1 = paletteOverlay[offset1];
            if (!region1 && color === color1) {
                stack.push(x);
                stack.push(b);
            }
        }
    }
}
function drawBorders(regionOverlay, imageData) {
    // color borders
    const { width, height, data } = imageData;
    imaging.scanImageData(imageData, (x, y, offset) => {
        const region = regionOverlay[offset];
        if (!region) {
            return;
        }
        const l = x - 1;
        const r = x + 1;
        const t = y - 1;
        const b = y + 1;
        // edge cells are not border (for now)
        if (l < 0 || r >= width || t < 0 || b >= height) {
            return;
        }
        const lRegion = regionOverlay[offset - 1];
        if (lRegion && lRegion !== region) {
            data[offset * 4] = 0;
            data[offset * 4 + 1] = 0;
            data[offset * 4 + 2] = 0;
            regionOverlay[offset] = null;
        }
        const rRegion = regionOverlay[offset + 1];
        if (rRegion && rRegion !== region) {
            data[offset * 4] = 0;
            data[offset * 4 + 1] = 0;
            data[offset * 4 + 2] = 0;
            regionOverlay[offset] = null;
        }
        const tRegion = regionOverlay[offset - width];
        if (tRegion && tRegion !== region) {
            data[offset * 4] = 0;
            data[offset * 4 + 1] = 0;
            data[offset * 4 + 2] = 0;
            regionOverlay[offset] = null;
        }
        const bRegion = regionOverlay[offset + width];
        if (bRegion && bRegion !== region) {
            data[offset * 4] = 0;
            data[offset * 4 + 1] = 0;
            data[offset * 4 + 2] = 0;
            regionOverlay[offset] = null;
        }
    });
}
function fillInterior(data, regionOverlay) {
    for (let i = 0; i < regionOverlay.length; ++i) {
        const region = regionOverlay[i];
        if (!region) {
            continue;
        }
        data[i * 4] = 255;
        data[i * 4 + 1] = 255;
        data[i * 4 + 2] = 255;
    }
}
function createPaletteUi(palette) {
    util.removeAllChildren(paletteDiv);
    for (let i = 0; i < palette.length; ++i) {
        const color = palette[i];
        const lum = imaging.calcLuminance(color);
        const fragment = paletteEntryTemplate.content.cloneNode(true);
        const entryDiv = util.bySelector(fragment, ".palette-entry");
        entryDiv.textContent = `${i + 1}`;
        entryDiv.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        entryDiv.style.color = lum < .5 ? "white" : "black";
        paletteDiv.appendChild(fragment);
    }
}
function drawRegionLabels(ctx, regions) {
    ctx.font = "16px arial bold";
    const textHeight = ctx.measureText("M").width;
    const font = ctx.font;
    for (const region of regions) {
        if (region.color === -1) {
            continue;
        }
        const label = `${region.color + 1}`;
        const metrics = ctx.measureText(label);
        const center = calcCenter(region.maxRect);
        const x = center[0] - metrics.width / 2;
        const y = center[1] + textHeight / 2;
        ctx.fillText(label, x, y);
    }
    ctx.font = font;
}
function onCanvasClick(evt) {
    if (!playState) {
        return;
    }
    const { palette, regions, regionOverlay } = playState;
    const idx = evt.offsetY * ctx.canvas.width + evt.offsetX;
    const region = regionOverlay[idx];
    if (!region || region.color === -1) {
        return;
    }
    const bounds = region.bounds;
    const regionWidth = calcWidth(bounds);
    const regionHeight = calcHeight(bounds);
    const imageData = ctx.getImageData(bounds.minX, bounds.minY, regionWidth, regionHeight);
    const data = imageData.data;
    const color = palette[region.color];
    imaging.scanImageData(imageData, (x, y, offset) => {
        const imageX = x + bounds.minX;
        const imageY = y + bounds.minY;
        const imageOffset = imageY * ctx.canvas.width + imageX;
        const imageRegion = regionOverlay[imageOffset];
        if (imageRegion !== region) {
            return;
        }
        data[offset * 4] = color[0];
        data[offset * 4 + 1] = color[1];
        data[offset * 4 + 2] = color[2];
    });
    ctx.putImageData(imageData, bounds.minX, bounds.minY);
    region.filled = true;
    // if all regions are filled, replace with original image data
    if (regions.every(r => r.filled || r.color === -1)) {
        console.log("Coloring complete!");
        ctx.putImageData(playState.imageData, 0, 0);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQUUvQyxJQUFLLFVBSUo7QUFKRCxXQUFLLFVBQVU7SUFDWCwyQ0FBSSxDQUFBO0lBQ0osMkNBQUksQ0FBQTtJQUNKLHlEQUFXLENBQUE7QUFDZixDQUFDLEVBSkksVUFBVSxLQUFWLFVBQVUsUUFJZDtBQVNELFNBQVMsU0FBUyxDQUFDLE1BQWM7SUFDN0IsT0FBTyxNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO0FBQ3hDLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxNQUFjO0lBQzlCLE9BQU8sTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtBQUN4QyxDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsTUFBYztJQUM1QixPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDakQsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLE1BQWM7SUFDOUIsT0FBTztRQUNILE1BQU0sQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDbkMsTUFBTSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztLQUN2QyxDQUFBO0FBQ0wsQ0FBQztBQW1CRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBcUIsQ0FBQTtBQUN0RCxJQUFJLFVBQVUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFBO0FBQ2hDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFzQixDQUFBO0FBQ3ZELE1B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YXMgdXRpbCBmcm9tIFwiLi4vc2hhcmVkL3V0aWwuanNcIlxyXG5pbXBvcnQgKiBhcyBpbWFnaW5nIGZyb20gXCIuLi9zaGFyZWQvaW1hZ2luZy5qc1wiXHJcblxyXG5lbnVtIENhbWVyYU1vZGUge1xyXG4gICAgTm9uZSxcclxuICAgIFVzZXIsXHJcbiAgICBFbnZpcm9ubWVudCxcclxufVxyXG5cclxuaW50ZXJmYWNlIEJvdW5kcyB7XHJcbiAgICBtaW5YOiBudW1iZXJcclxuICAgIG1heFg6IG51bWJlclxyXG4gICAgbWluWTogbnVtYmVyXHJcbiAgICBtYXhZOiBudW1iZXJcclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY1dpZHRoKGJvdW5kczogQm91bmRzKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBib3VuZHMubWF4WCAtIGJvdW5kcy5taW5YICsgMVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjSGVpZ2h0KGJvdW5kczogQm91bmRzKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBib3VuZHMubWF4WSAtIGJvdW5kcy5taW5ZICsgMVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjQXJlYShib3VuZHM6IEJvdW5kcyk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gY2FsY1dpZHRoKGJvdW5kcykgKiBjYWxjSGVpZ2h0KGJvdW5kcylcclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY0NlbnRlcihib3VuZHM6IEJvdW5kcyk6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgcmV0dXJuIFtcclxuICAgICAgICBib3VuZHMubWluWCArIGNhbGNXaWR0aChib3VuZHMpIC8gMixcclxuICAgICAgICBib3VuZHMubWluWSArIGNhbGNIZWlnaHQoYm91bmRzKSAvIDJcclxuICAgIF1cclxufVxyXG5cclxuaW50ZXJmYWNlIFJlZ2lvbiB7XHJcbiAgICBjb2xvcjogbnVtYmVyXHJcbiAgICBwaXhlbHM6IG51bWJlclxyXG4gICAgYm91bmRzOiBCb3VuZHNcclxuICAgIG1heFJlY3Q6IEJvdW5kc1xyXG4gICAgZmlsbGVkOiBib29sZWFuXHJcbn1cclxuXHJcbnR5cGUgUmVnaW9uT3ZlcmxheSA9IChSZWdpb24gfCBudWxsKVtdXHJcblxyXG5pbnRlcmZhY2UgUGxheVN0YXRlIHtcclxuICAgIGltYWdlRGF0YTogSW1hZ2VEYXRhXHJcbiAgICBwYWxldHRlOiBpbWFnaW5nLkNvbG9yW11cclxuICAgIHJlZ2lvbnM6IFJlZ2lvbltdXHJcbiAgICByZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5XHJcbn1cclxuXHJcbmNvbnN0IGNhbWVyYSA9IHV0aWwuYnlJZChcImNhbWVyYVwiKSBhcyBIVE1MVmlkZW9FbGVtZW50XHJcbmxldCBjYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Ob25lXHJcbmNvbnN0IGNhbnZhcyA9IHV0aWwuYnlJZChcImNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG5jb25zdCBhY3F1aXJlSW1hZ2VEaXYgPSB1dGlsLmJ5SWQoXCJhY3F1aXJlSW1hZ2VcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuY29uc3QgcGFsZXR0ZURpdiA9IHV0aWwuYnlJZChcInBhbGV0dGVcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuY29uc3QgcGFsZXR0ZUVudHJ5VGVtcGxhdGUgPSB1dGlsLmJ5SWQoXCJwYWxldHRlRW50cnlcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG5cclxuY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKSBhcyBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkRcclxuaWYgKCFjdHgpIHtcclxuICAgIHRocm93RXJyb3JNZXNzYWdlKFwiQ2FudmFzIGVsZW1lbnQgbm90IHN1cHBvcnRlZFwiKVxyXG59XHJcblxyXG5jb25zdCBjYXB0dXJlSW1hZ2VCdXR0b24gPSB1dGlsLmJ5SWQoXCJjYXB0dXJlSW1hZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuY29uc3QgbG9hZFVpID0gdXRpbC5ieUlkKFwibG9hZFVpXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbmNvbnN0IHBsYXlVaSA9IHV0aWwuYnlJZChcInBsYXlVaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5cclxubGV0IHBsYXlTdGF0ZTogUGxheVN0YXRlIHwgbnVsbCA9IG51bGxcclxuXHJcbmluaXQoKVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgIGNvbnN0IGZpbGVEcm9wQm94ID0gdXRpbC5ieUlkKFwiZmlsZURyb3BCb3hcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIGNvbnN0IGZpbGVJbnB1dCA9IHV0aWwuYnlJZChcImZpbGVJbnB1dFwiKSBhcyBIVE1MSW5wdXRFbGVtZW50XHJcbiAgICBjb25zdCBmaWxlQnV0dG9uID0gdXRpbC5ieUlkKFwiZmlsZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgY29uc3QgdXNlQ2FtZXJhQnV0dG9uID0gdXRpbC5ieUlkKFwidXNlQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBjb25zdCBmbGlwQ2FtZXJhQnV0dG9uID0gdXRpbC5ieUlkKFwiZmxpcENhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgY29uc3Qgc3RvcENhbWVyYUJ1dHRvbiA9IHV0aWwuYnlJZChcInN0b3BDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIGNvbnN0IHJldHVybkJ1dHRvbiA9IHV0aWwuYnlJZChcInJldHVybkJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5cclxuICAgIGZpbGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICBmaWxlSW5wdXQuY2xpY2soKVxyXG4gICAgfSlcclxuXHJcbiAgICBmaWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2VudGVyXCIsIG9uRHJhZ0VudGVyT3ZlcilcclxuICAgIGZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnb3ZlclwiLCBvbkRyYWdFbnRlck92ZXIpXHJcbiAgICBmaWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJvcFwiLCBvbkZpbGVEcm9wKVxyXG5cclxuICAgIGZpbGVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHtcclxuICAgICAgICBpZiAoIWZpbGVJbnB1dC5maWxlcz8ubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZmlsZSA9IGZpbGVJbnB1dC5maWxlc1swXVxyXG4gICAgICAgIHByb2Nlc3NGaWxlKGZpbGUpXHJcbiAgICB9KVxyXG5cclxuICAgIHVzZUNhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgdXNlQ2FtZXJhKVxyXG4gICAgZmxpcENhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZmxpcENhbWVyYSlcclxuICAgIHN0b3BDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHN0b3BDYW1lcmEpXHJcbiAgICBjYXB0dXJlSW1hZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNhcHR1cmVJbWFnZSlcclxuICAgIHJldHVybkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgc2hvd0xvYWRVaSlcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgb25DYW52YXNDbGljaylcclxufVxyXG5cclxuZnVuY3Rpb24gb25EcmFnRW50ZXJPdmVyKGV2OiBEcmFnRXZlbnQpIHtcclxuICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICBldi5wcmV2ZW50RGVmYXVsdCgpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9uRmlsZURyb3AoZXY6IERyYWdFdmVudCkge1xyXG4gICAgZXYuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxuXHJcbiAgICBpZiAoIWV2Py5kYXRhVHJhbnNmZXI/LmZpbGVzPy5sZW5ndGgpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmaWxlID0gZXYuZGF0YVRyYW5zZmVyLmZpbGVzWzBdXHJcbiAgICBwcm9jZXNzRmlsZShmaWxlKVxyXG59XHJcblxyXG5mdW5jdGlvbiBwcm9jZXNzRmlsZShmaWxlOiBGaWxlKSB7XHJcbiAgICBjbGVhckVycm9yTWVzc2FnZXMoKVxyXG4gICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKVxyXG4gICAgbG9hZEZyb21VcmwodXJsKVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkRnJvbVVybCh1cmw6IHN0cmluZykge1xyXG4gICAgY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuICAgIGNvbnN0IGltZyA9IG5ldyBJbWFnZSgpXHJcbiAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgKCkgPT4ge1xyXG4gICAgICAgIHBsYXlTdGF0ZSA9IHNob3dQbGF5VWkoaW1nLCBpbWcud2lkdGgsIGltZy5oZWlnaHQpXHJcbiAgICB9KVxyXG5cclxuICAgIGltZy5zcmMgPSB1cmxcclxufVxyXG5cclxuZnVuY3Rpb24gY2xlYXJFcnJvck1lc3NhZ2VzKCkge1xyXG4gICAgY29uc3QgZXJyb3JzRGl2ID0gdXRpbC5ieUlkKFwiZXJyb3JzXCIpXHJcbiAgICB1dGlsLnJlbW92ZUFsbENoaWxkcmVuKGVycm9yc0RpdilcclxufVxyXG5cclxuZnVuY3Rpb24gYXBwZW5kRXJyb3JNZXNzYWdlKGVycm9yOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IGVycm9yc0RpdiA9IHV0aWwuYnlJZChcImVycm9yc1wiKTtcclxuICAgIGNvbnN0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICBkaXYuY2xhc3NMaXN0LmFkZChcImVycm9yLW1lc3NhZ2VcIilcclxuICAgIGRpdi50ZXh0Q29udGVudCA9IGVycm9yXHJcbiAgICBlcnJvcnNEaXYuYXBwZW5kQ2hpbGQoZGl2KVxyXG59XHJcblxyXG5mdW5jdGlvbiB0aHJvd0Vycm9yTWVzc2FnZShlcnJvcjogc3RyaW5nKSB7XHJcbiAgICBhcHBlbmRFcnJvck1lc3NhZ2UoZXJyb3IpXHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3IpXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHVzZUNhbWVyYSgpIHtcclxuICAgIGFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgY29uc3QgZGlhbG9nV2lkdGggPSBhY3F1aXJlSW1hZ2VEaXYuY2xpZW50V2lkdGhcclxuICAgIGNvbnN0IGRpYWxvZ0hlaWdodCA9IGFjcXVpcmVJbWFnZURpdi5jbGllbnRIZWlnaHRcclxuICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcclxuICAgICAgICB2aWRlbzogeyB3aWR0aDogeyBtYXg6IGRpYWxvZ1dpZHRoIH0sIGhlaWdodDogeyBtYXg6IGRpYWxvZ0hlaWdodCB9LCBmYWNpbmdNb2RlOiBcInVzZXJcIiB9LFxyXG4gICAgICAgIGF1ZGlvOiBmYWxzZVxyXG4gICAgfSlcclxuXHJcbiAgICBjYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Vc2VyXHJcbiAgICBjYW1lcmEuc3JjT2JqZWN0ID0gc3RyZWFtXHJcbiAgICBjYW1lcmEuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZG1ldGFkYXRhXCIsIG9uQ2FtZXJhTG9hZClcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZmxpcENhbWVyYSgpIHtcclxuICAgIGlmICghY2FtZXJhLnNyY09iamVjdCkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHNyYyA9IGNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgIGNvbnN0IHRyYWNrcyA9IHNyYy5nZXRUcmFja3MoKVxyXG4gICAgZm9yIChjb25zdCB0cmFjayBvZiB0cmFja3MpIHtcclxuICAgICAgICB0cmFjay5zdG9wKClcclxuICAgIH1cclxuXHJcbiAgICBjYW1lcmFNb2RlID0gY2FtZXJhTW9kZSA9PSBDYW1lcmFNb2RlLlVzZXIgPyBDYW1lcmFNb2RlLkVudmlyb25tZW50IDogQ2FtZXJhTW9kZS5Vc2VyXHJcbiAgICBjb25zdCBmYWNpbmdNb2RlID0gY2FtZXJhTW9kZSA9PSBDYW1lcmFNb2RlLlVzZXIgPyBcInVzZXJcIiA6IFwiZW52aXJvbm1lbnRcIlxyXG5cclxuICAgIC8vIGdldCBjdXJyZW50IGZhY2luZyBtb2RlXHJcbiAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7XHJcbiAgICAgICAgdmlkZW86IHsgd2lkdGg6IGNhbWVyYS5jbGllbnRXaWR0aCwgaGVpZ2h0OiBjYW1lcmEuY2xpZW50SGVpZ2h0LCBmYWNpbmdNb2RlOiBmYWNpbmdNb2RlIH0sXHJcbiAgICAgICAgYXVkaW86IGZhbHNlXHJcbiAgICB9KVxyXG5cclxuICAgIGNhbWVyYS5zcmNPYmplY3QgPSBzdHJlYW1cclxuICAgIGNhbWVyYS5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkbWV0YWRhdGFcIiwgb25DYW1lcmFMb2FkKVxyXG59XHJcblxyXG5mdW5jdGlvbiBvbkNhbWVyYUxvYWQoKSB7XHJcbiAgICBhY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgIGNhbWVyYS5wbGF5KClcclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN0b3BDYW1lcmEoKSB7XHJcbiAgICBjb25zdCBzcmMgPSBjYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICBpZiAoIXNyYykge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHRyYWNrcyA9IHNyYy5nZXRUcmFja3MoKVxyXG4gICAgZm9yIChjb25zdCB0cmFjayBvZiB0cmFja3MpIHtcclxuICAgICAgICB0cmFjay5zdG9wKClcclxuICAgIH1cclxuXHJcbiAgICBjYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Ob25lXHJcbiAgICBhY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYXB0dXJlSW1hZ2UoKSB7XHJcbiAgICBjbGVhckVycm9yTWVzc2FnZXMoKVxyXG5cclxuICAgIGNvbnN0IHNyYyA9IGNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgIGlmICghc3JjKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdHJhY2sgPSBzcmMuZ2V0VmlkZW9UcmFja3MoKVswXVxyXG4gICAgaWYgKCF0cmFjaykge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIHNob3dQbGF5VWkoY2FtZXJhLCBjYW1lcmEudmlkZW9XaWR0aCwgY2FtZXJhLnZpZGVvSGVpZ2h0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2hvd1BsYXlVaShpbWc6IENhbnZhc0ltYWdlU291cmNlLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFBsYXlTdGF0ZSB7XHJcbiAgICAvLyBtYWludGFpbiBhc3BlY3QgcmF0aW8hXHJcbiAgICBjb25zdCB2dyA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aFxyXG4gICAgY29uc3QgdmggPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0XHJcblxyXG4gICAgaWYgKHZ3IDwgdmgpIHtcclxuICAgICAgICBjYW52YXMud2lkdGggPSB2d1xyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSB2dyAqIGhlaWdodCAvIHdpZHRoXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSB2aFxyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHZoICogd2lkdGggLyBoZWlnaHRcclxuICAgIH1cclxuXHJcbiAgICBsb2FkVWkuaGlkZGVuID0gdHJ1ZVxyXG4gICAgcGxheVVpLmhpZGRlbiA9IGZhbHNlXHJcblxyXG4gICAgY3R4LmRyYXdJbWFnZShpbWcsIDAsIDAsIGNhbnZhcy5jbGllbnRXaWR0aCwgY2FudmFzLmNsaWVudEhlaWdodClcclxuICAgIGNvbnN0IHBsYXlTdGF0ZSA9IHByb2Nlc3NJbWFnZSgpXHJcbiAgICByZXR1cm4gcGxheVN0YXRlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3dMb2FkVWkoKSB7XHJcbiAgICBsb2FkVWkuaGlkZGVuID0gZmFsc2VcclxuICAgIHBsYXlVaS5oaWRkZW4gPSB0cnVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByb2Nlc3NJbWFnZSgpOiBQbGF5U3RhdGUge1xyXG4gICAgLy8gZ2V0IChmbGF0KSBpbWFnZSBkYXRhIGZyb20gY2FudmFzXHJcbiAgICBjb25zdCBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodClcclxuICAgIGNvbnN0IGluaXRpYWxJbWFnZURhdGEgPSBpbWFnaW5nLmNvcHlJbWFnZURhdGEoaW1hZ2VEYXRhKVxyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBpbWFnZURhdGFcclxuXHJcbiAgICAvLyBjb252ZXJ0IHRvIHh5eiBjb2xvcnMgYW5kIHBhbGV0dGl6ZSBkYXRhXHJcbiAgICBsZXQgW3BhbGV0dGUsIHBhbGV0dGVPdmVybGF5XSA9IHBhbGV0dGl6ZShpbWFnZURhdGEsIDMsIDgpXHJcbiAgICBpbWFnaW5nLmFwcGx5UGFsZXR0ZShwYWxldHRlLCBwYWxldHRlT3ZlcmxheSwgaW1hZ2VEYXRhKVxyXG5cclxuICAgIGN0eC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKVxyXG4gICAgbGV0IFtyZWdpb25zLCByZWdpb25PdmVybGF5XSA9IGNyZWF0ZVJlZ2lvbk92ZXJsYXkod2lkdGgsIGhlaWdodCwgcGFsZXR0ZU92ZXJsYXkpXHJcbiAgICByZWdpb25zID0gcHJ1bmVSZWdpb25zKHdpZHRoLCBoZWlnaHQsIHJlZ2lvbnMsIHJlZ2lvbk92ZXJsYXkpXHJcblxyXG4gICAgLy8gc29tZSBwYWxsZXR0ZSBlbnRyaWVzIHdpbGwgbm93IGJlIHVudXNlZCBieSByZWdpb25zLCByZW1vdmUgdGhlc2VcclxuICAgIHBhbGV0dGUgPSByZW1vdmVVbnVzZWRQYWxldHRlRW50cmllcyhwYWxldHRlLCByZWdpb25zKVxyXG5cclxuICAgIGRyYXdCb3JkZXJzKHJlZ2lvbk92ZXJsYXksIGltYWdlRGF0YSlcclxuICAgIGZpbGxJbnRlcmlvcihpbWFnZURhdGEuZGF0YSwgcmVnaW9uT3ZlcmxheSlcclxuICAgIGN0eC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKVxyXG4gICAgY3JlYXRlUGFsZXR0ZVVpKHBhbGV0dGUpXHJcbiAgICBkcmF3UmVnaW9uTGFiZWxzKGN0eCwgcmVnaW9ucylcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGltYWdlRGF0YTogaW5pdGlhbEltYWdlRGF0YSxcclxuICAgICAgICBwYWxldHRlOiBwYWxldHRlLFxyXG4gICAgICAgIHJlZ2lvbnM6IHJlZ2lvbnMsXHJcbiAgICAgICAgcmVnaW9uT3ZlcmxheTogcmVnaW9uT3ZlcmxheVxyXG4gICAgfVxyXG59XHJcblxyXG4vLyBzcGVjaWFsaXplZCB0byBpZ25vcmUgd2hpdGVcclxuZnVuY3Rpb24gcGFsZXR0aXplKGltYWdlRGF0YTogSW1hZ2VEYXRhLCBidWNrZXRzUGVyQ29tcG9uZW50OiBudW1iZXIsIG1heENvbG9yczogbnVtYmVyKTogW2ltYWdpbmcuQ29sb3JbXSwgbnVtYmVyW11dIHtcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgZGF0YSB9ID0gaW1hZ2VEYXRhXHJcbiAgICBjb25zdCBwaXhlbHMgPSB3aWR0aCAqIGhlaWdodFxyXG4gICAgY29uc3QgYnVja2V0UGl0Y2ggPSBidWNrZXRzUGVyQ29tcG9uZW50ICogYnVja2V0c1BlckNvbXBvbmVudFxyXG4gICAgY29uc3QgbnVtQnVja2V0cyA9IGJ1Y2tldFBpdGNoICogYnVja2V0c1BlckNvbXBvbmVudFxyXG5cclxuICAgIC8vIGNyZWF0IGludGlhbCBidWNrZXRzXHJcbiAgICBsZXQgYnVja2V0cyA9IHV0aWwuZ2VuZXJhdGUobnVtQnVja2V0cywgKCkgPT4gKHsgY29sb3I6IFswLCAwLCAwXSBhcyBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0sIHBpeGVsczogMCB9KSlcclxuXHJcbiAgICAvLyBhc3NpZ24gYW5kIHVwZGF0ZSBidWNrZXQgZm9yIGVhY2ggcGl4ZWxcclxuICAgIGNvbnN0IGJ1Y2tldE92ZXJsYXkgPSB1dGlsLmdlbmVyYXRlKHBpeGVscywgaSA9PiB7XHJcbiAgICAgICAgY29uc3QgciA9IGRhdGFbaSAqIDRdIC8gMjU1XHJcbiAgICAgICAgY29uc3QgZyA9IGRhdGFbaSAqIDQgKyAxXSAvIDI1NVxyXG4gICAgICAgIGNvbnN0IGIgPSBkYXRhW2kgKiA0ICsgMl0gLyAyNTVcclxuXHJcbiAgICAgICAgLy8gaWdub3JlIHdoaXRlXHJcbiAgICAgICAgaWYgKHIgPj0gLjk1ICYmIGcgPj0gLjk1ICYmIGIgPj0gLjk1KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCByYiA9IE1hdGgubWluKE1hdGguZmxvb3IociAqIGJ1Y2tldHNQZXJDb21wb25lbnQpLCBidWNrZXRzUGVyQ29tcG9uZW50IC0gMSlcclxuICAgICAgICBjb25zdCBnYiA9IE1hdGgubWluKE1hdGguZmxvb3IoZyAqIGJ1Y2tldHNQZXJDb21wb25lbnQpLCBidWNrZXRzUGVyQ29tcG9uZW50IC0gMSlcclxuICAgICAgICBjb25zdCBiYiA9IE1hdGgubWluKE1hdGguZmxvb3IoYiAqIGJ1Y2tldHNQZXJDb21wb25lbnQpLCBidWNrZXRzUGVyQ29tcG9uZW50IC0gMSlcclxuXHJcbiAgICAgICAgY29uc3QgYnVja2V0SWR4ID0gcmIgKiBidWNrZXRQaXRjaCArIGdiICogYnVja2V0c1BlckNvbXBvbmVudCArIGJiXHJcbiAgICAgICAgY29uc3QgYnVja2V0ID0gYnVja2V0c1tidWNrZXRJZHhdXHJcbiAgICAgICAgYnVja2V0LmNvbG9yID0gaW1hZ2luZy5hZGRYWVooW3IsIGcsIGJdLCBidWNrZXQuY29sb3IpXHJcbiAgICAgICAgYnVja2V0LnBpeGVscysrXHJcbiAgICAgICAgcmV0dXJuIGJ1Y2tldFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBwcnVuZSBlbXB0eSBidWNrZXRzXHJcbiAgICBidWNrZXRzID0gYnVja2V0cy5maWx0ZXIoYiA9PiBiLnBpeGVscyA+IDApXHJcblxyXG4gICAgLy8gY2FsY3VsYXRlIGJ1Y2tldCBjb2xvcnNcclxuICAgIGZvciAoY29uc3QgYnVja2V0IG9mIGJ1Y2tldHMpIHtcclxuICAgICAgICBidWNrZXQuY29sb3IgPSBpbWFnaW5nLmRpdlhZWihidWNrZXQuY29sb3IsIGJ1Y2tldC5waXhlbHMpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gY29tYmluZSBidWNrZXRzIHRoYXQgYXJlIHZlcnkgY2xvc2UgaW4gY29sb3IgYWZ0ZXIgY29sb3IgYXZlcmFnaW5nXHJcbiAgICBsZXQgYnVja2V0U2V0ID0gbmV3IFNldChidWNrZXRzKVxyXG4gICAgd2hpbGUgKGJ1Y2tldFNldC5zaXplID4gMSkge1xyXG4gICAgICAgIC8vIHByb2NlZWQgZm9yIGFzIGxvbmcgYXMgYnVja2V0cyBjYW4gYmUgY29tYmluZWRcclxuICAgICAgICBsZXQgbWVyZ2UgPSBmYWxzZVxyXG4gICAgICAgIGZvciAoY29uc3QgYnVja2V0IG9mIGJ1Y2tldFNldCkge1xyXG4gICAgICAgICAgICAvLyBmaW5kIFwibmVhcmVzdFwiIGNvbG9yXHJcbiAgICAgICAgICAgIGNvbnN0IG5lYXJlc3QgPSBbLi4uYnVja2V0U2V0XVxyXG4gICAgICAgICAgICAgICAgLmZpbHRlcihiID0+IGIgIT0gYnVja2V0KVxyXG4gICAgICAgICAgICAgICAgLnJlZHVjZSgoYjEsIGIyKSA9PiBpbWFnaW5nLmNhbGNEaXN0U3EoYnVja2V0LmNvbG9yLCBiMS5jb2xvcikgPCBpbWFnaW5nLmNhbGNEaXN0U3EoYnVja2V0LmNvbG9yLCBiMi5jb2xvcikgPyBiMSA6IGIyKVxyXG5cclxuICAgICAgICAgICAgY29uc3QgZGlzdFNxID0gaW1hZ2luZy5jYWxjRGlzdFNxKGJ1Y2tldC5jb2xvciwgbmVhcmVzdC5jb2xvcilcclxuICAgICAgICAgICAgaWYgKGRpc3RTcSA+IC4xKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBtZXJnZSB0aGUgYnVja2V0c1xyXG4gICAgICAgICAgICBidWNrZXQuY29sb3IgPSBpbWFnaW5nLmRpdlhZWihcclxuICAgICAgICAgICAgICAgIGltYWdpbmcuYWRkWFlaKGltYWdpbmcubXVsWFlaKGJ1Y2tldC5jb2xvciwgYnVja2V0LnBpeGVscyksIGltYWdpbmcubXVsWFlaKG5lYXJlc3QuY29sb3IsIG5lYXJlc3QucGl4ZWxzKSksXHJcbiAgICAgICAgICAgICAgICBidWNrZXQucGl4ZWxzICsgbmVhcmVzdC5waXhlbHMpXHJcblxyXG4gICAgICAgICAgICBidWNrZXRTZXQuZGVsZXRlKG5lYXJlc3QpXHJcbiAgICAgICAgICAgIG1lcmdlID0gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFtZXJnZSkge1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBidWNrZXRzID0gWy4uLmJ1Y2tldFNldF1cclxuICAgICAgICAuc29ydCgoYjEsIGIyKSA9PiBiMi5waXhlbHMgLSBiMS5waXhlbHMpXHJcbiAgICAgICAgLnNsaWNlKDAsIG1heENvbG9ycylcclxuXHJcbiAgICAvLyBtYXAgYWxsIGNvbG9ycyB0byB0b3AgTiBidWNrZXRzXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJ1Y2tldE92ZXJsYXkubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAvLyBvdGhlcndpc2UsIG1hcCB0byBuZXcgYnVja2V0XHJcbiAgICAgICAgY29uc3QgciA9IGRhdGFbaSAqIDRdIC8gMjU1XHJcbiAgICAgICAgY29uc3QgZyA9IGRhdGFbaSAqIDQgKyAxXSAvIDI1NVxyXG4gICAgICAgIGNvbnN0IGIgPSBkYXRhW2kgKiA0ICsgMl0gLyAyNTVcclxuXHJcbiAgICAgICAgaWYgKHIgPj0gLjk1ICYmIGcgPj0gLjk1ICYmIGIgPj0gLjk1KSB7XHJcbiAgICAgICAgICAgIGJ1Y2tldE92ZXJsYXlbaV0gPSBudWxsXHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb2xvcjogW251bWJlciwgbnVtYmVyLCBudW1iZXJdID0gW3IsIGcsIGJdXHJcbiAgICAgICAgY29uc3QgYnVja2V0ID0gYnVja2V0cy5yZWR1Y2UoKGIxLCBiMikgPT4gaW1hZ2luZy5jYWxjRGlzdFNxKGIxLmNvbG9yLCBjb2xvcikgPCBpbWFnaW5nLmNhbGNEaXN0U3EoYjIuY29sb3IsIGNvbG9yKSA/IGIxIDogYjIpXHJcbiAgICAgICAgYnVja2V0T3ZlcmxheVtpXSA9IGJ1Y2tldFxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRldGVybWluZSBwYWxldHRlIGNvbG9yc1xyXG4gICAgY29uc3QgcGFsZXR0ZSA9IGJ1Y2tldHMubWFwKGIgPT4gaW1hZ2luZy5tdWxYWVooYi5jb2xvciwgMjU1KSlcclxuICAgIGNvbnN0IHBhbGV0dGVPdmVybGF5ID0gYnVja2V0T3ZlcmxheS5tYXAoYiA9PiBiID8gYnVja2V0cy5pbmRleE9mKGIpIDogLTEpXHJcbiAgICByZXR1cm4gW3BhbGV0dGUsIHBhbGV0dGVPdmVybGF5XVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVSZWdpb25PdmVybGF5KHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBwYWxldHRlT3ZlcmxheTogbnVtYmVyW10pOiBbUmVnaW9uW10sIFJlZ2lvbk92ZXJsYXldIHtcclxuICAgIGNvbnN0IHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkgPSB1dGlsLmZpbGwobnVsbCwgd2lkdGggKiBoZWlnaHQpXHJcbiAgICBjb25zdCByZWdpb25zOiBSZWdpb25bXSA9IFtdXHJcblxyXG4gICAgaW1hZ2luZy5zY2FuKHdpZHRoLCBoZWlnaHQsICh4LCB5LCBvZmZzZXQpID0+IHtcclxuICAgICAgICBpZiAocmVnaW9uT3ZlcmxheVtvZmZzZXRdKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcmVnaW9uOiBSZWdpb24gPSB7XHJcbiAgICAgICAgICAgIGNvbG9yOiBwYWxldHRlT3ZlcmxheVtvZmZzZXRdLFxyXG4gICAgICAgICAgICBwaXhlbHM6IDAsXHJcbiAgICAgICAgICAgIGJvdW5kczoge1xyXG4gICAgICAgICAgICAgICAgbWluWDogSW5maW5pdHksXHJcbiAgICAgICAgICAgICAgICBtYXhYOiAtMSxcclxuICAgICAgICAgICAgICAgIG1pblk6IEluZmluaXR5LFxyXG4gICAgICAgICAgICAgICAgbWF4WTogLTFcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbWF4UmVjdDoge1xyXG4gICAgICAgICAgICAgICAgbWluWDogSW5maW5pdHksXHJcbiAgICAgICAgICAgICAgICBtYXhYOiAtMSxcclxuICAgICAgICAgICAgICAgIG1pblk6IEluZmluaXR5LFxyXG4gICAgICAgICAgICAgICAgbWF4WTogLTFcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZmlsbGVkOiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVnaW9uT3ZlcmxheVtvZmZzZXRdID0gcmVnaW9uXHJcbiAgICAgICAgcmVnaW9ucy5wdXNoKHJlZ2lvbilcclxuICAgICAgICBleHBsb3JlUmVnaW9uKHdpZHRoLCBoZWlnaHQsIHBhbGV0dGVPdmVybGF5LCB4LCB5LCByZWdpb25PdmVybGF5KVxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBwcnVuZSBzb21lIHJlZ2lvbnNcclxuICAgIHJldHVybiBbcmVnaW9ucywgcmVnaW9uT3ZlcmxheV1cclxufVxyXG5cclxuZnVuY3Rpb24gcHJ1bmVSZWdpb25zKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCByZWdpb25zOiBSZWdpb25bXSwgcmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSk6IFJlZ2lvbltdIHtcclxuICAgIGNvbnN0IHJlZ2lvblNldCA9IG5ldyBTZXQocmVnaW9ucylcclxuICAgIGNvbnN0IG1pblJlZ2lvbldpZHRoID0gMTBcclxuICAgIGNvbnN0IG1pblJlZ2lvbkhlaWdodCA9IDEwXHJcbiAgICBjb25zdCBtaW5SZWdpb25QaXhlbHMgPSBtaW5SZWdpb25XaWR0aCAqIG1pblJlZ2lvbkhlaWdodFxyXG5cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvbnMpIHtcclxuICAgICAgICBpZiAocmVnaW9uLnBpeGVscyA8PSBtaW5SZWdpb25QaXhlbHMpIHtcclxuICAgICAgICAgICAgcmVnaW9uU2V0LmRlbGV0ZShyZWdpb24pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNhbGNSZWdpb25Cb3VuZHMod2lkdGgsIGhlaWdodCwgcmVnaW9uT3ZlcmxheSlcclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvblNldCkge1xyXG4gICAgICAgIGlmIChjYWxjV2lkdGgocmVnaW9uLmJvdW5kcykgPD0gbWluUmVnaW9uV2lkdGgpIHtcclxuICAgICAgICAgICAgcmVnaW9uU2V0LmRlbGV0ZShyZWdpb24pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoY2FsY0hlaWdodChyZWdpb24uYm91bmRzKSA8PSBtaW5SZWdpb25IZWlnaHQpIHtcclxuICAgICAgICAgICAgcmVnaW9uU2V0LmRlbGV0ZShyZWdpb24pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGNhbGN1bGF0ZSBtYXhpbWFsIHJlYyBmb3IgZWFjaCByZWdpb25cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvblNldCkge1xyXG4gICAgICAgIHJlZ2lvbi5tYXhSZWN0ID0gY2FsY01heFJlZ2lvblJlY3Qod2lkdGgsIHJlZ2lvbiwgcmVnaW9uT3ZlcmxheSlcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IHJlZ2lvbiBvZiByZWdpb25TZXQpIHtcclxuICAgICAgICBpZiAoY2FsY1dpZHRoKHJlZ2lvbi5tYXhSZWN0KSA8IG1pblJlZ2lvbldpZHRoKSB7XHJcbiAgICAgICAgICAgIHJlZ2lvblNldC5kZWxldGUocmVnaW9uKVxyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGNhbGNIZWlnaHQocmVnaW9uLm1heFJlY3QpIDwgbWluUmVnaW9uSGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHJlZ2lvblNldC5kZWxldGUocmVnaW9uKVxyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyB1cGRhdGUgdGhlIG92ZXJsYXlcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVnaW9uT3ZlcmxheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IHJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbaV1cclxuICAgICAgICBpZiAoIXJlZ2lvbikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFyZWdpb25TZXQuaGFzKHJlZ2lvbikpIHtcclxuICAgICAgICAgICAgcmVnaW9uT3ZlcmxheVtpXSA9IG51bGxcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFsuLi5yZWdpb25TZXRdXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZVVudXNlZFBhbGV0dGVFbnRyaWVzKHBhbGV0dGU6IGltYWdpbmcuQ29sb3JbXSwgcmVnaW9uczogUmVnaW9uW10pOiBpbWFnaW5nLkNvbG9yW10ge1xyXG4gICAgLy8gY3JlYXRlIGEgbWFwIGZyb20gY3VycmVudCBjb2xvciBpbmRleCB0byBuZXcgY29sb3IgaW5kZXhcclxuICAgIGNvbnN0IHVzZWRTZXQgPSBuZXcgU2V0KHJlZ2lvbnMubWFwKHIgPT4gci5jb2xvcikpXHJcbiAgICB1c2VkU2V0LmRlbGV0ZSgtMSlcclxuICAgIGNvbnN0IHVzZWQgPSBbLi4udXNlZFNldF1cclxuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KHVzZWQubWFwKCh1LCBpKSA9PiBbdSwgaV0pKVxyXG5cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvbnMpIHtcclxuICAgICAgICBpZiAocmVnaW9uLmNvbG9yID09PSAtMSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29sb3IgPSBtYXAuZ2V0KHJlZ2lvbi5jb2xvcilcclxuICAgICAgICBpZiAodHlwZW9mIGNvbG9yID09PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvbG9yIG5vdCBmb3VuZCBpbiBtYXBcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlZ2lvbi5jb2xvciA9IGNvbG9yXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHVzZWQubWFwKGkgPT4gcGFsZXR0ZVtpXSlcclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY1JlZ2lvbkJvdW5kcyh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSkge1xyXG4gICAgaW1hZ2luZy5zY2FuKHdpZHRoLCBoZWlnaHQsICh4LCB5LCBvZmZzZXQpID0+IHtcclxuICAgICAgICBjb25zdCByZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldF1cclxuICAgICAgICBpZiAoIXJlZ2lvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGJvdW5kcyA9IHJlZ2lvbi5ib3VuZHNcclxuICAgICAgICBib3VuZHMubWluWCA9IE1hdGgubWluKGJvdW5kcy5taW5YLCB4KVxyXG4gICAgICAgIGJvdW5kcy5tYXhYID0gTWF0aC5tYXgoYm91bmRzLm1heFgsIHgpXHJcbiAgICAgICAgYm91bmRzLm1pblkgPSBNYXRoLm1pbihib3VuZHMubWluWSwgeSlcclxuICAgICAgICBib3VuZHMubWF4WSA9IE1hdGgubWF4KGJvdW5kcy5tYXhZLCB5KVxyXG4gICAgfSlcclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY01heFJlZ2lvblJlY3Qocm93UGl0Y2g6IG51bWJlciwgcmVnaW9uOiBSZWdpb24sIHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkpOiBCb3VuZHMge1xyXG4gICAgLy8gZGVyaXZlZCBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzcyNDUvcHV6emxlLWZpbmQtbGFyZ2VzdC1yZWN0YW5nbGUtbWF4aW1hbC1yZWN0YW5nbGUtcHJvYmxlbVxyXG4gICAgLy8gYWxnb3JpdGhtIG5lZWRzIHRvIGtlZXAgdHJhY2sgb2YgcmVjdGFuZ2xlIHN0YXRlIGZvciBldmVyeSBjb2x1bW4gZm9yIGV2ZXJ5IHJlZ2lvblxyXG4gICAgY29uc3QgeyBtaW5YOiB4MCwgbWluWTogeTAsIG1heFg6IHgxLCBtYXhZOiB5MSB9ID0gcmVnaW9uLmJvdW5kc1xyXG4gICAgY29uc3Qgd2lkdGggPSB4MSAtIHgwICsgMVxyXG4gICAgY29uc3QgaGVpZ2h0ID0geTEgLSB5MCArIDFcclxuICAgIGNvbnN0IGxzID0gdXRpbC5maWxsKHgwLCB3aWR0aClcclxuICAgIGNvbnN0IHJzID0gdXRpbC5maWxsKHgwICsgd2lkdGgsIHdpZHRoKVxyXG4gICAgY29uc3QgaHMgPSB1dGlsLmZpbGwoMCwgd2lkdGgpXHJcblxyXG4gICAgbGV0IG1heEFyZWEgPSAwXHJcbiAgICBjb25zdCBib3VuZHM6IEJvdW5kcyA9IHtcclxuICAgICAgICBtaW5YOiBJbmZpbml0eSxcclxuICAgICAgICBtYXhYOiAtMSxcclxuICAgICAgICBtaW5ZOiBJbmZpbml0eSxcclxuICAgICAgICBtYXhZOiAtMSxcclxuICAgIH1cclxuXHJcbiAgICBpbWFnaW5nLnNjYW5Sb3dzUmVnaW9uKHkwLCBoZWlnaHQsIHJvd1BpdGNoLCAoeSwgeU9mZnNldCkgPT4ge1xyXG4gICAgICAgIGxldCBsID0geDBcclxuICAgICAgICBsZXQgciA9IHgwICsgd2lkdGhcclxuXHJcbiAgICAgICAgLy8gaGVpZ2h0IHNjYW5cclxuICAgICAgICBmb3IgKGxldCB4ID0geDA7IHggPCB4MTsgKyt4KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGkgPSB4IC0geDBcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgaXNSZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldF0gPT09IHJlZ2lvblxyXG5cclxuICAgICAgICAgICAgaWYgKGlzUmVnaW9uKSB7XHJcbiAgICAgICAgICAgICAgICBoc1tpXSArPSAxXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBoc1tpXSA9IDBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbCBzY2FuXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IHgwOyB4IDwgeDE7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCBpID0geCAtIHgwXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGNvbnN0IGlzUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXRdID09PSByZWdpb25cclxuXHJcbiAgICAgICAgICAgIGlmIChpc1JlZ2lvbikge1xyXG4gICAgICAgICAgICAgICAgbHNbaV0gPSBNYXRoLm1heChsc1tpXSwgbClcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxzW2ldID0gMFxyXG4gICAgICAgICAgICAgICAgbCA9IHggKyAxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHIgc2NhblxyXG4gICAgICAgIGZvciAobGV0IHggPSB4MSAtIDE7IHggPj0geDA7IC0teCkge1xyXG4gICAgICAgICAgICBjb25zdCBpID0geCAtIHgwXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGNvbnN0IGlzUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXRdID09PSByZWdpb25cclxuXHJcbiAgICAgICAgICAgIGlmIChpc1JlZ2lvbikge1xyXG4gICAgICAgICAgICAgICAgcnNbaV0gPSBNYXRoLm1pbihyc1tpXSwgcilcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJzW2ldID0geDFcclxuICAgICAgICAgICAgICAgIHIgPSB4XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFyZWEgc2NhblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd2lkdGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBhcmVhID0gaHNbaV0gKiAocnNbaV0gLSBsc1tpXSlcclxuICAgICAgICAgICAgaWYgKGFyZWEgPiBtYXhBcmVhKSB7XHJcbiAgICAgICAgICAgICAgICBtYXhBcmVhID0gYXJlYVxyXG4gICAgICAgICAgICAgICAgYm91bmRzLm1pblggPSBsc1tpXVxyXG4gICAgICAgICAgICAgICAgYm91bmRzLm1heFggPSByc1tpXVxyXG4gICAgICAgICAgICAgICAgYm91bmRzLm1pblkgPSB5IC0gaHNbaV1cclxuICAgICAgICAgICAgICAgIGJvdW5kcy5tYXhZID0geVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSlcclxuXHJcbiAgICByZXR1cm4gYm91bmRzXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4cGxvcmVSZWdpb24od2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSwgeDA6IG51bWJlciwgeTA6IG51bWJlciwgcmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSkge1xyXG4gICAgY29uc3Qgc3RhY2s6IG51bWJlcltdID0gW11cclxuICAgIGNvbnN0IG9mZnNldDAgPSB5MCAqIHdpZHRoICsgeDBcclxuICAgIGNvbnN0IHJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0MF1cclxuICAgIGlmICghcmVnaW9uKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY29sb3IgPSByZWdpb24uY29sb3JcclxuXHJcbiAgICBzdGFjay5wdXNoKHgwKVxyXG4gICAgc3RhY2sucHVzaCh5MClcclxuXHJcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnN0IHkgPSBzdGFjay5wb3AoKSBhcyBudW1iZXJcclxuICAgICAgICBjb25zdCB4ID0gc3RhY2sucG9wKCkgYXMgbnVtYmVyXHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0geSAqIHdpZHRoICsgeFxyXG4gICAgICAgIHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9IHJlZ2lvblxyXG4gICAgICAgIHJlZ2lvbi5waXhlbHMrK1xyXG5cclxuICAgICAgICAvLyBleHBsb3JlIG5laWdoYm9ycyAoaWYgc2FtZSBjb2xvcilcclxuICAgICAgICBjb25zdCBsID0geCAtIDFcclxuICAgICAgICBjb25zdCByID0geCArIDFcclxuICAgICAgICBjb25zdCB0ID0geSAtIDFcclxuICAgICAgICBjb25zdCBiID0geSArIDFcclxuXHJcbiAgICAgICAgaWYgKGwgPj0gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQxID0gb2Zmc2V0IC0gMVxyXG4gICAgICAgICAgICBjb25zdCByZWdpb24xID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBjb25zdCBjb2xvcjEgPSBwYWxldHRlT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBpZiAoIXJlZ2lvbjEgJiYgY29sb3IgPT09IGNvbG9yMSkge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaChsKVxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh5KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAociA8IHdpZHRoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldDEgPSBvZmZzZXQgKyAxXHJcbiAgICAgICAgICAgIGNvbnN0IHJlZ2lvbjEgPSByZWdpb25PdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbG9yMSA9IHBhbGV0dGVPdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGlmICghcmVnaW9uMSAmJiBjb2xvciA9PT0gY29sb3IxKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHIpXHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0ID49IDApIHtcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0MSA9IG9mZnNldCAtIHdpZHRoXHJcbiAgICAgICAgICAgIGNvbnN0IHJlZ2lvbjEgPSByZWdpb25PdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbG9yMSA9IHBhbGV0dGVPdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGlmICghcmVnaW9uMSAmJiBjb2xvciA9PT0gY29sb3IxKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHgpXHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChiIDwgaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldDEgPSBvZmZzZXQgKyB3aWR0aFxyXG4gICAgICAgICAgICBjb25zdCByZWdpb24xID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBjb25zdCBjb2xvcjEgPSBwYWxldHRlT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBpZiAoIXJlZ2lvbjEgJiYgY29sb3IgPT09IGNvbG9yMSkge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh4KVxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaChiKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3Qm9yZGVycyhyZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5LCBpbWFnZURhdGE6IEltYWdlRGF0YSkge1xyXG4gICAgLy8gY29sb3IgYm9yZGVyc1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBkYXRhIH0gPSBpbWFnZURhdGFcclxuICAgIGltYWdpbmcuc2NhbkltYWdlRGF0YShpbWFnZURhdGEsICh4LCB5LCBvZmZzZXQpID0+IHtcclxuICAgICAgICBjb25zdCByZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldF1cclxuICAgICAgICBpZiAoIXJlZ2lvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGwgPSB4IC0gMVxyXG4gICAgICAgIGNvbnN0IHIgPSB4ICsgMVxyXG4gICAgICAgIGNvbnN0IHQgPSB5IC0gMVxyXG4gICAgICAgIGNvbnN0IGIgPSB5ICsgMVxyXG5cclxuICAgICAgICAvLyBlZGdlIGNlbGxzIGFyZSBub3QgYm9yZGVyIChmb3Igbm93KVxyXG4gICAgICAgIGlmIChsIDwgMCB8fCByID49IHdpZHRoIHx8IHQgPCAwIHx8IGIgPj0gaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbFJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0IC0gMV1cclxuICAgICAgICBpZiAobFJlZ2lvbiAmJiBsUmVnaW9uICE9PSByZWdpb24pIHtcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0XSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMV0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDJdID0gMFxyXG4gICAgICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCByUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQgKyAxXVxyXG4gICAgICAgIGlmIChyUmVnaW9uICYmIHJSZWdpb24gIT09IHJlZ2lvbikge1xyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDRdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAxXSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMl0gPSAwXHJcbiAgICAgICAgICAgIHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRSZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldCAtIHdpZHRoXVxyXG4gICAgICAgIGlmICh0UmVnaW9uICYmIHRSZWdpb24gIT09IHJlZ2lvbikge1xyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDRdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAxXSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMl0gPSAwXHJcbiAgICAgICAgICAgIHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGJSZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldCArIHdpZHRoXVxyXG4gICAgICAgIGlmIChiUmVnaW9uICYmIGJSZWdpb24gIT09IHJlZ2lvbikge1xyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDRdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAxXSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMl0gPSAwXHJcbiAgICAgICAgICAgIHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9IG51bGxcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBmaWxsSW50ZXJpb3IoZGF0YTogVWludDhDbGFtcGVkQXJyYXksIHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkpIHtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVnaW9uT3ZlcmxheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IHJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbaV1cclxuICAgICAgICBpZiAoIXJlZ2lvbikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGF0YVtpICogNF0gPSAyNTVcclxuICAgICAgICBkYXRhW2kgKiA0ICsgMV0gPSAyNTVcclxuICAgICAgICBkYXRhW2kgKiA0ICsgMl0gPSAyNTVcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlUGFsZXR0ZVVpKHBhbGV0dGU6IGltYWdpbmcuQ29sb3JbXSkge1xyXG4gICAgdXRpbC5yZW1vdmVBbGxDaGlsZHJlbihwYWxldHRlRGl2KVxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYWxldHRlLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgY29sb3IgPSBwYWxldHRlW2ldXHJcbiAgICAgICAgY29uc3QgbHVtID0gaW1hZ2luZy5jYWxjTHVtaW5hbmNlKGNvbG9yKVxyXG4gICAgICAgIGNvbnN0IGZyYWdtZW50ID0gcGFsZXR0ZUVudHJ5VGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgIGNvbnN0IGVudHJ5RGl2ID0gdXRpbC5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5wYWxldHRlLWVudHJ5XCIpIGFzIEhUTUxFbGVtZW50XHJcbiAgICAgICAgZW50cnlEaXYudGV4dENvbnRlbnQgPSBgJHtpICsgMX1gXHJcbiAgICAgICAgZW50cnlEaXYuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gYHJnYigke2NvbG9yWzBdfSwgJHtjb2xvclsxXX0sICR7Y29sb3JbMl19KWBcclxuICAgICAgICBlbnRyeURpdi5zdHlsZS5jb2xvciA9IGx1bSA8IC41ID8gXCJ3aGl0ZVwiIDogXCJibGFja1wiXHJcbiAgICAgICAgcGFsZXR0ZURpdi5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd1JlZ2lvbkxhYmVscyhjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgcmVnaW9uczogUmVnaW9uW10pIHtcclxuICAgIGN0eC5mb250ID0gXCIxNnB4IGFyaWFsIGJvbGRcIlxyXG4gICAgY29uc3QgdGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGhcclxuICAgIGNvbnN0IGZvbnQgPSBjdHguZm9udFxyXG5cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvbnMpIHtcclxuICAgICAgICBpZiAocmVnaW9uLmNvbG9yID09PSAtMSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbGFiZWwgPSBgJHtyZWdpb24uY29sb3IgKyAxfWBcclxuICAgICAgICBjb25zdCBtZXRyaWNzID0gY3R4Lm1lYXN1cmVUZXh0KGxhYmVsKVxyXG4gICAgICAgIGNvbnN0IGNlbnRlciA9IGNhbGNDZW50ZXIocmVnaW9uLm1heFJlY3QpXHJcbiAgICAgICAgY29uc3QgeCA9IGNlbnRlclswXSAtIG1ldHJpY3Mud2lkdGggLyAyXHJcbiAgICAgICAgY29uc3QgeSA9IGNlbnRlclsxXSArIHRleHRIZWlnaHQgLyAyXHJcbiAgICAgICAgY3R4LmZpbGxUZXh0KGxhYmVsLCB4LCB5KVxyXG4gICAgfVxyXG5cclxuICAgIGN0eC5mb250ID0gZm9udFxyXG59XHJcblxyXG5mdW5jdGlvbiBvbkNhbnZhc0NsaWNrKGV2dDogTW91c2VFdmVudCkge1xyXG4gICAgaWYgKCFwbGF5U3RhdGUpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB7IHBhbGV0dGUsIHJlZ2lvbnMsIHJlZ2lvbk92ZXJsYXkgfSA9IHBsYXlTdGF0ZVxyXG4gICAgY29uc3QgaWR4ID0gZXZ0Lm9mZnNldFkgKiBjdHguY2FudmFzLndpZHRoICsgZXZ0Lm9mZnNldFhcclxuICAgIGNvbnN0IHJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbaWR4XVxyXG4gICAgaWYgKCFyZWdpb24gfHwgcmVnaW9uLmNvbG9yID09PSAtMSkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGJvdW5kcyA9IHJlZ2lvbi5ib3VuZHNcclxuICAgIGNvbnN0IHJlZ2lvbldpZHRoID0gY2FsY1dpZHRoKGJvdW5kcylcclxuICAgIGNvbnN0IHJlZ2lvbkhlaWdodCA9IGNhbGNIZWlnaHQoYm91bmRzKVxyXG4gICAgY29uc3QgaW1hZ2VEYXRhID0gY3R4LmdldEltYWdlRGF0YShib3VuZHMubWluWCwgYm91bmRzLm1pblksIHJlZ2lvbldpZHRoLCByZWdpb25IZWlnaHQpXHJcbiAgICBjb25zdCBkYXRhID0gaW1hZ2VEYXRhLmRhdGFcclxuICAgIGNvbnN0IGNvbG9yID0gcGFsZXR0ZVtyZWdpb24uY29sb3JdXHJcblxyXG4gICAgaW1hZ2luZy5zY2FuSW1hZ2VEYXRhKGltYWdlRGF0YSwgKHgsIHksIG9mZnNldCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGltYWdlWCA9IHggKyBib3VuZHMubWluWFxyXG4gICAgICAgIGNvbnN0IGltYWdlWSA9IHkgKyBib3VuZHMubWluWVxyXG4gICAgICAgIGNvbnN0IGltYWdlT2Zmc2V0ID0gaW1hZ2VZICogY3R4LmNhbnZhcy53aWR0aCArIGltYWdlWFxyXG4gICAgICAgIGNvbnN0IGltYWdlUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtpbWFnZU9mZnNldF1cclxuICAgICAgICBpZiAoaW1hZ2VSZWdpb24gIT09IHJlZ2lvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRhdGFbb2Zmc2V0ICogNF0gPSBjb2xvclswXVxyXG4gICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDFdID0gY29sb3JbMV1cclxuICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAyXSA9IGNvbG9yWzJdXHJcbiAgICB9KVxyXG5cclxuICAgIGN0eC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCBib3VuZHMubWluWCwgYm91bmRzLm1pblkpXHJcbiAgICByZWdpb24uZmlsbGVkID0gdHJ1ZVxyXG5cclxuICAgIC8vIGlmIGFsbCByZWdpb25zIGFyZSBmaWxsZWQsIHJlcGxhY2Ugd2l0aCBvcmlnaW5hbCBpbWFnZSBkYXRhXHJcbiAgICBpZiAocmVnaW9ucy5ldmVyeShyID0+IHIuZmlsbGVkIHx8IHIuY29sb3IgPT09IC0xKSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ29sb3JpbmcgY29tcGxldGUhXCIpXHJcbiAgICAgICAgY3R4LnB1dEltYWdlRGF0YShwbGF5U3RhdGUuaW1hZ2VEYXRhLCAwLCAwKVxyXG4gICAgfVxyXG59Il19