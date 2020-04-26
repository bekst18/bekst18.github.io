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
    playState = showPlayUi(camera, camera.videoWidth, camera.videoHeight);
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
    playState = null;
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
        ctx.putImageData(playState.imageData, 0, 0);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQUUvQyxJQUFLLFVBSUo7QUFKRCxXQUFLLFVBQVU7SUFDWCwyQ0FBSSxDQUFBO0lBQ0osMkNBQUksQ0FBQTtJQUNKLHlEQUFXLENBQUE7QUFDZixDQUFDLEVBSkksVUFBVSxLQUFWLFVBQVUsUUFJZDtBQVNELFNBQVMsU0FBUyxDQUFDLE1BQWM7SUFDN0IsT0FBTyxNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO0FBQ3hDLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxNQUFjO0lBQzlCLE9BQU8sTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtBQUN4QyxDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsTUFBYztJQUM1QixPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDakQsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLE1BQWM7SUFDOUIsT0FBTztRQUNILE1BQU0sQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDbkMsTUFBTSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztLQUN2QyxDQUFBO0FBQ0wsQ0FBQztBQW1CRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBcUIsQ0FBQTtBQUN0RCxJQUFJLFVBQVUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFBO0FBQ2hDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFzQixDQUFBO0FBQ3ZELE1B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IGZyb20gXCIuLi9zaGFyZWQvdXRpbC5qc1wiXHJcbmltcG9ydCAqIGFzIGltYWdpbmcgZnJvbSBcIi4uL3NoYXJlZC9pbWFnaW5nLmpzXCJcclxuXHJcbmVudW0gQ2FtZXJhTW9kZSB7XHJcbiAgICBOb25lLFxyXG4gICAgVXNlcixcclxuICAgIEVudmlyb25tZW50LFxyXG59XHJcblxyXG5pbnRlcmZhY2UgQm91bmRzIHtcclxuICAgIG1pblg6IG51bWJlclxyXG4gICAgbWF4WDogbnVtYmVyXHJcbiAgICBtaW5ZOiBudW1iZXJcclxuICAgIG1heFk6IG51bWJlclxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjV2lkdGgoYm91bmRzOiBCb3VuZHMpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIGJvdW5kcy5tYXhYIC0gYm91bmRzLm1pblggKyAxXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGNIZWlnaHQoYm91bmRzOiBCb3VuZHMpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIGJvdW5kcy5tYXhZIC0gYm91bmRzLm1pblkgKyAxXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGNBcmVhKGJvdW5kczogQm91bmRzKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBjYWxjV2lkdGgoYm91bmRzKSAqIGNhbGNIZWlnaHQoYm91bmRzKVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjQ2VudGVyKGJvdW5kczogQm91bmRzKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICByZXR1cm4gW1xyXG4gICAgICAgIGJvdW5kcy5taW5YICsgY2FsY1dpZHRoKGJvdW5kcykgLyAyLFxyXG4gICAgICAgIGJvdW5kcy5taW5ZICsgY2FsY0hlaWdodChib3VuZHMpIC8gMlxyXG4gICAgXVxyXG59XHJcblxyXG5pbnRlcmZhY2UgUmVnaW9uIHtcclxuICAgIGNvbG9yOiBudW1iZXJcclxuICAgIHBpeGVsczogbnVtYmVyXHJcbiAgICBib3VuZHM6IEJvdW5kc1xyXG4gICAgbWF4UmVjdDogQm91bmRzXHJcbiAgICBmaWxsZWQ6IGJvb2xlYW5cclxufVxyXG5cclxudHlwZSBSZWdpb25PdmVybGF5ID0gKFJlZ2lvbiB8IG51bGwpW11cclxuXHJcbmludGVyZmFjZSBQbGF5U3RhdGUge1xyXG4gICAgaW1hZ2VEYXRhOiBJbWFnZURhdGFcclxuICAgIHBhbGV0dGU6IGltYWdpbmcuQ29sb3JbXVxyXG4gICAgcmVnaW9uczogUmVnaW9uW11cclxuICAgIHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXlcclxufVxyXG5cclxuY29uc3QgY2FtZXJhID0gdXRpbC5ieUlkKFwiY2FtZXJhXCIpIGFzIEhUTUxWaWRlb0VsZW1lbnRcclxubGV0IGNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLk5vbmVcclxuY29uc3QgY2FudmFzID0gdXRpbC5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbmNvbnN0IGFjcXVpcmVJbWFnZURpdiA9IHV0aWwuYnlJZChcImFjcXVpcmVJbWFnZVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5jb25zdCBwYWxldHRlRGl2ID0gdXRpbC5ieUlkKFwicGFsZXR0ZVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5jb25zdCBwYWxldHRlRW50cnlUZW1wbGF0ZSA9IHV0aWwuYnlJZChcInBhbGV0dGVFbnRyeVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcblxyXG5jb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIGFzIENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRFxyXG5pZiAoIWN0eCkge1xyXG4gICAgdGhyb3dFcnJvck1lc3NhZ2UoXCJDYW52YXMgZWxlbWVudCBub3Qgc3VwcG9ydGVkXCIpXHJcbn1cclxuXHJcbmNvbnN0IGNhcHR1cmVJbWFnZUJ1dHRvbiA9IHV0aWwuYnlJZChcImNhcHR1cmVJbWFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5jb25zdCBsb2FkVWkgPSB1dGlsLmJ5SWQoXCJsb2FkVWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuY29uc3QgcGxheVVpID0gdXRpbC5ieUlkKFwicGxheVVpXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcblxyXG5sZXQgcGxheVN0YXRlOiBQbGF5U3RhdGUgfCBudWxsID0gbnVsbFxyXG5cclxuaW5pdCgpXHJcblxyXG5hc3luYyBmdW5jdGlvbiBpbml0KCkge1xyXG4gICAgY29uc3QgZmlsZURyb3BCb3ggPSB1dGlsLmJ5SWQoXCJmaWxlRHJvcEJveFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgY29uc3QgZmlsZUlucHV0ID0gdXRpbC5ieUlkKFwiZmlsZUlucHV0XCIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcclxuICAgIGNvbnN0IGZpbGVCdXR0b24gPSB1dGlsLmJ5SWQoXCJmaWxlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBjb25zdCB1c2VDYW1lcmFCdXR0b24gPSB1dGlsLmJ5SWQoXCJ1c2VDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIGNvbnN0IGZsaXBDYW1lcmFCdXR0b24gPSB1dGlsLmJ5SWQoXCJmbGlwQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBjb25zdCBzdG9wQ2FtZXJhQnV0dG9uID0gdXRpbC5ieUlkKFwic3RvcENhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgY29uc3QgcmV0dXJuQnV0dG9uID0gdXRpbC5ieUlkKFwicmV0dXJuQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcblxyXG4gICAgZmlsZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgIGZpbGVJbnB1dC5jbGljaygpXHJcbiAgICB9KVxyXG5cclxuICAgIGZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnZW50ZXJcIiwgb25EcmFnRW50ZXJPdmVyKVxyXG4gICAgZmlsZURyb3BCb3guYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdvdmVyXCIsIG9uRHJhZ0VudGVyT3ZlcilcclxuICAgIGZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcm9wXCIsIG9uRmlsZURyb3ApXHJcblxyXG4gICAgZmlsZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4ge1xyXG4gICAgICAgIGlmICghZmlsZUlucHV0LmZpbGVzPy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmaWxlID0gZmlsZUlucHV0LmZpbGVzWzBdXHJcbiAgICAgICAgcHJvY2Vzc0ZpbGUoZmlsZSlcclxuICAgIH0pXHJcblxyXG4gICAgdXNlQ2FtZXJhQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB1c2VDYW1lcmEpXHJcbiAgICBmbGlwQ2FtZXJhQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmbGlwQ2FtZXJhKVxyXG4gICAgc3RvcENhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgc3RvcENhbWVyYSlcclxuICAgIGNhcHR1cmVJbWFnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY2FwdHVyZUltYWdlKVxyXG4gICAgcmV0dXJuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBzaG93TG9hZFVpKVxyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBvbkNhbnZhc0NsaWNrKVxyXG59XHJcblxyXG5mdW5jdGlvbiBvbkRyYWdFbnRlck92ZXIoZXY6IERyYWdFdmVudCkge1xyXG4gICAgZXYuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxufVxyXG5cclxuZnVuY3Rpb24gb25GaWxlRHJvcChldjogRHJhZ0V2ZW50KSB7XHJcbiAgICBldi5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgZXYucHJldmVudERlZmF1bHQoKVxyXG5cclxuICAgIGlmICghZXY/LmRhdGFUcmFuc2Zlcj8uZmlsZXM/Lmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGZpbGUgPSBldi5kYXRhVHJhbnNmZXIuZmlsZXNbMF1cclxuICAgIHByb2Nlc3NGaWxlKGZpbGUpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByb2Nlc3NGaWxlKGZpbGU6IEZpbGUpIHtcclxuICAgIGNsZWFyRXJyb3JNZXNzYWdlcygpXHJcbiAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpXHJcbiAgICBsb2FkRnJvbVVybCh1cmwpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRGcm9tVXJsKHVybDogc3RyaW5nKSB7XHJcbiAgICBjbGVhckVycm9yTWVzc2FnZXMoKVxyXG4gICAgY29uc3QgaW1nID0gbmV3IEltYWdlKClcclxuICAgIGltZy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgcGxheVN0YXRlID0gc2hvd1BsYXlVaShpbWcsIGltZy53aWR0aCwgaW1nLmhlaWdodClcclxuICAgIH0pXHJcblxyXG4gICAgaW1nLnNyYyA9IHVybFxyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhckVycm9yTWVzc2FnZXMoKSB7XHJcbiAgICBjb25zdCBlcnJvcnNEaXYgPSB1dGlsLmJ5SWQoXCJlcnJvcnNcIilcclxuICAgIHV0aWwucmVtb3ZlQWxsQ2hpbGRyZW4oZXJyb3JzRGl2KVxyXG59XHJcblxyXG5mdW5jdGlvbiBhcHBlbmRFcnJvck1lc3NhZ2UoZXJyb3I6IHN0cmluZykge1xyXG4gICAgY29uc3QgZXJyb3JzRGl2ID0gdXRpbC5ieUlkKFwiZXJyb3JzXCIpO1xyXG4gICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgIGRpdi5jbGFzc0xpc3QuYWRkKFwiZXJyb3ItbWVzc2FnZVwiKVxyXG4gICAgZGl2LnRleHRDb250ZW50ID0gZXJyb3JcclxuICAgIGVycm9yc0Rpdi5hcHBlbmRDaGlsZChkaXYpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRocm93RXJyb3JNZXNzYWdlKGVycm9yOiBzdHJpbmcpIHtcclxuICAgIGFwcGVuZEVycm9yTWVzc2FnZShlcnJvcilcclxuICAgIHRocm93IG5ldyBFcnJvcihlcnJvcilcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gdXNlQ2FtZXJhKCkge1xyXG4gICAgYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICBjb25zdCBkaWFsb2dXaWR0aCA9IGFjcXVpcmVJbWFnZURpdi5jbGllbnRXaWR0aFxyXG4gICAgY29uc3QgZGlhbG9nSGVpZ2h0ID0gYWNxdWlyZUltYWdlRGl2LmNsaWVudEhlaWdodFxyXG4gICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xyXG4gICAgICAgIHZpZGVvOiB7IHdpZHRoOiB7IG1heDogZGlhbG9nV2lkdGggfSwgaGVpZ2h0OiB7IG1heDogZGlhbG9nSGVpZ2h0IH0sIGZhY2luZ01vZGU6IFwidXNlclwiIH0sXHJcbiAgICAgICAgYXVkaW86IGZhbHNlXHJcbiAgICB9KVxyXG5cclxuICAgIGNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLlVzZXJcclxuICAgIGNhbWVyYS5zcmNPYmplY3QgPSBzdHJlYW1cclxuICAgIGNhbWVyYS5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkbWV0YWRhdGFcIiwgb25DYW1lcmFMb2FkKVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBmbGlwQ2FtZXJhKCkge1xyXG4gICAgaWYgKCFjYW1lcmEuc3JjT2JqZWN0KSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc3JjID0gY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgY29uc3QgdHJhY2tzID0gc3JjLmdldFRyYWNrcygpXHJcbiAgICBmb3IgKGNvbnN0IHRyYWNrIG9mIHRyYWNrcykge1xyXG4gICAgICAgIHRyYWNrLnN0b3AoKVxyXG4gICAgfVxyXG5cclxuICAgIGNhbWVyYU1vZGUgPSBjYW1lcmFNb2RlID09IENhbWVyYU1vZGUuVXNlciA/IENhbWVyYU1vZGUuRW52aXJvbm1lbnQgOiBDYW1lcmFNb2RlLlVzZXJcclxuICAgIGNvbnN0IGZhY2luZ01vZGUgPSBjYW1lcmFNb2RlID09IENhbWVyYU1vZGUuVXNlciA/IFwidXNlclwiIDogXCJlbnZpcm9ubWVudFwiXHJcblxyXG4gICAgLy8gZ2V0IGN1cnJlbnQgZmFjaW5nIG1vZGVcclxuICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcclxuICAgICAgICB2aWRlbzogeyB3aWR0aDogY2FtZXJhLmNsaWVudFdpZHRoLCBoZWlnaHQ6IGNhbWVyYS5jbGllbnRIZWlnaHQsIGZhY2luZ01vZGU6IGZhY2luZ01vZGUgfSxcclxuICAgICAgICBhdWRpbzogZmFsc2VcclxuICAgIH0pXHJcblxyXG4gICAgY2FtZXJhLnNyY09iamVjdCA9IHN0cmVhbVxyXG4gICAgY2FtZXJhLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRtZXRhZGF0YVwiLCBvbkNhbWVyYUxvYWQpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9uQ2FtZXJhTG9hZCgpIHtcclxuICAgIGFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgY2FtZXJhLnBsYXkoKVxyXG5cclxufVxyXG5cclxuZnVuY3Rpb24gc3RvcENhbWVyYSgpIHtcclxuICAgIGNvbnN0IHNyYyA9IGNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgIGlmICghc3JjKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdHJhY2tzID0gc3JjLmdldFRyYWNrcygpXHJcbiAgICBmb3IgKGNvbnN0IHRyYWNrIG9mIHRyYWNrcykge1xyXG4gICAgICAgIHRyYWNrLnN0b3AoKVxyXG4gICAgfVxyXG5cclxuICAgIGNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLk5vbmVcclxuICAgIGFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSB0cnVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhcHR1cmVJbWFnZSgpIHtcclxuICAgIGNsZWFyRXJyb3JNZXNzYWdlcygpXHJcblxyXG4gICAgY29uc3Qgc3JjID0gY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgaWYgKCFzcmMpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0cmFjayA9IHNyYy5nZXRWaWRlb1RyYWNrcygpWzBdXHJcbiAgICBpZiAoIXRyYWNrKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgcGxheVN0YXRlID0gc2hvd1BsYXlVaShjYW1lcmEsIGNhbWVyYS52aWRlb1dpZHRoLCBjYW1lcmEudmlkZW9IZWlnaHQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93UGxheVVpKGltZzogQ2FudmFzSW1hZ2VTb3VyY2UsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogUGxheVN0YXRlIHtcclxuICAgIC8vIG1haW50YWluIGFzcGVjdCByYXRpbyFcclxuICAgIGNvbnN0IHZ3ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoXHJcbiAgICBjb25zdCB2aCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHRcclxuXHJcbiAgICBpZiAodncgPCB2aCkge1xyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHZ3XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IHZ3ICogaGVpZ2h0IC8gd2lkdGhcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IHZoXHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gdmggKiB3aWR0aCAvIGhlaWdodFxyXG4gICAgfVxyXG5cclxuICAgIGxvYWRVaS5oaWRkZW4gPSB0cnVlXHJcbiAgICBwbGF5VWkuaGlkZGVuID0gZmFsc2VcclxuXHJcbiAgICBjdHguZHJhd0ltYWdlKGltZywgMCwgMCwgY2FudmFzLmNsaWVudFdpZHRoLCBjYW52YXMuY2xpZW50SGVpZ2h0KVxyXG4gICAgY29uc3QgcGxheVN0YXRlID0gcHJvY2Vzc0ltYWdlKClcclxuICAgIHJldHVybiBwbGF5U3RhdGVcclxufVxyXG5cclxuZnVuY3Rpb24gc2hvd0xvYWRVaSgpIHtcclxuICAgIHBsYXlTdGF0ZSA9IG51bGxcclxuICAgIGxvYWRVaS5oaWRkZW4gPSBmYWxzZVxyXG4gICAgcGxheVVpLmhpZGRlbiA9IHRydWVcclxufVxyXG5cclxuZnVuY3Rpb24gcHJvY2Vzc0ltYWdlKCk6IFBsYXlTdGF0ZSB7XHJcbiAgICAvLyBnZXQgKGZsYXQpIGltYWdlIGRhdGEgZnJvbSBjYW52YXNcclxuICAgIGNvbnN0IGltYWdlRGF0YSA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KVxyXG4gICAgY29uc3QgaW5pdGlhbEltYWdlRGF0YSA9IGltYWdpbmcuY29weUltYWdlRGF0YShpbWFnZURhdGEpXHJcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQgfSA9IGltYWdlRGF0YVxyXG5cclxuICAgIC8vIGNvbnZlcnQgdG8geHl6IGNvbG9ycyBhbmQgcGFsZXR0aXplIGRhdGFcclxuICAgIGxldCBbcGFsZXR0ZSwgcGFsZXR0ZU92ZXJsYXldID0gcGFsZXR0aXplKGltYWdlRGF0YSwgMywgOClcclxuICAgIGltYWdpbmcuYXBwbHlQYWxldHRlKHBhbGV0dGUsIHBhbGV0dGVPdmVybGF5LCBpbWFnZURhdGEpXHJcblxyXG4gICAgY3R4LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIDAsIDApXHJcbiAgICBsZXQgW3JlZ2lvbnMsIHJlZ2lvbk92ZXJsYXldID0gY3JlYXRlUmVnaW9uT3ZlcmxheSh3aWR0aCwgaGVpZ2h0LCBwYWxldHRlT3ZlcmxheSlcclxuICAgIHJlZ2lvbnMgPSBwcnVuZVJlZ2lvbnMod2lkdGgsIGhlaWdodCwgcmVnaW9ucywgcmVnaW9uT3ZlcmxheSlcclxuXHJcbiAgICAvLyBzb21lIHBhbGxldHRlIGVudHJpZXMgd2lsbCBub3cgYmUgdW51c2VkIGJ5IHJlZ2lvbnMsIHJlbW92ZSB0aGVzZVxyXG4gICAgcGFsZXR0ZSA9IHJlbW92ZVVudXNlZFBhbGV0dGVFbnRyaWVzKHBhbGV0dGUsIHJlZ2lvbnMpXHJcblxyXG4gICAgZHJhd0JvcmRlcnMocmVnaW9uT3ZlcmxheSwgaW1hZ2VEYXRhKVxyXG4gICAgZmlsbEludGVyaW9yKGltYWdlRGF0YS5kYXRhLCByZWdpb25PdmVybGF5KVxyXG4gICAgY3R4LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIDAsIDApXHJcbiAgICBjcmVhdGVQYWxldHRlVWkocGFsZXR0ZSlcclxuICAgIGRyYXdSZWdpb25MYWJlbHMoY3R4LCByZWdpb25zKVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgaW1hZ2VEYXRhOiBpbml0aWFsSW1hZ2VEYXRhLFxyXG4gICAgICAgIHBhbGV0dGU6IHBhbGV0dGUsXHJcbiAgICAgICAgcmVnaW9uczogcmVnaW9ucyxcclxuICAgICAgICByZWdpb25PdmVybGF5OiByZWdpb25PdmVybGF5XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIHNwZWNpYWxpemVkIHRvIGlnbm9yZSB3aGl0ZVxyXG5mdW5jdGlvbiBwYWxldHRpemUoaW1hZ2VEYXRhOiBJbWFnZURhdGEsIGJ1Y2tldHNQZXJDb21wb25lbnQ6IG51bWJlciwgbWF4Q29sb3JzOiBudW1iZXIpOiBbaW1hZ2luZy5Db2xvcltdLCBudW1iZXJbXV0ge1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBkYXRhIH0gPSBpbWFnZURhdGFcclxuICAgIGNvbnN0IHBpeGVscyA9IHdpZHRoICogaGVpZ2h0XHJcbiAgICBjb25zdCBidWNrZXRQaXRjaCA9IGJ1Y2tldHNQZXJDb21wb25lbnQgKiBidWNrZXRzUGVyQ29tcG9uZW50XHJcbiAgICBjb25zdCBudW1CdWNrZXRzID0gYnVja2V0UGl0Y2ggKiBidWNrZXRzUGVyQ29tcG9uZW50XHJcblxyXG4gICAgLy8gY3JlYXQgaW50aWFsIGJ1Y2tldHNcclxuICAgIGxldCBidWNrZXRzID0gdXRpbC5nZW5lcmF0ZShudW1CdWNrZXRzLCAoKSA9PiAoeyBjb2xvcjogWzAsIDAsIDBdIGFzIFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSwgcGl4ZWxzOiAwIH0pKVxyXG5cclxuICAgIC8vIGFzc2lnbiBhbmQgdXBkYXRlIGJ1Y2tldCBmb3IgZWFjaCBwaXhlbFxyXG4gICAgY29uc3QgYnVja2V0T3ZlcmxheSA9IHV0aWwuZ2VuZXJhdGUocGl4ZWxzLCBpID0+IHtcclxuICAgICAgICBjb25zdCByID0gZGF0YVtpICogNF0gLyAyNTVcclxuICAgICAgICBjb25zdCBnID0gZGF0YVtpICogNCArIDFdIC8gMjU1XHJcbiAgICAgICAgY29uc3QgYiA9IGRhdGFbaSAqIDQgKyAyXSAvIDI1NVxyXG5cclxuICAgICAgICAvLyBpZ25vcmUgd2hpdGVcclxuICAgICAgICBpZiAociA+PSAuOTUgJiYgZyA+PSAuOTUgJiYgYiA+PSAuOTUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHJiID0gTWF0aC5taW4oTWF0aC5mbG9vcihyICogYnVja2V0c1BlckNvbXBvbmVudCksIGJ1Y2tldHNQZXJDb21wb25lbnQgLSAxKVxyXG4gICAgICAgIGNvbnN0IGdiID0gTWF0aC5taW4oTWF0aC5mbG9vcihnICogYnVja2V0c1BlckNvbXBvbmVudCksIGJ1Y2tldHNQZXJDb21wb25lbnQgLSAxKVxyXG4gICAgICAgIGNvbnN0IGJiID0gTWF0aC5taW4oTWF0aC5mbG9vcihiICogYnVja2V0c1BlckNvbXBvbmVudCksIGJ1Y2tldHNQZXJDb21wb25lbnQgLSAxKVxyXG5cclxuICAgICAgICBjb25zdCBidWNrZXRJZHggPSByYiAqIGJ1Y2tldFBpdGNoICsgZ2IgKiBidWNrZXRzUGVyQ29tcG9uZW50ICsgYmJcclxuICAgICAgICBjb25zdCBidWNrZXQgPSBidWNrZXRzW2J1Y2tldElkeF1cclxuICAgICAgICBidWNrZXQuY29sb3IgPSBpbWFnaW5nLmFkZFhZWihbciwgZywgYl0sIGJ1Y2tldC5jb2xvcilcclxuICAgICAgICBidWNrZXQucGl4ZWxzKytcclxuICAgICAgICByZXR1cm4gYnVja2V0XHJcbiAgICB9KVxyXG5cclxuICAgIC8vIHBydW5lIGVtcHR5IGJ1Y2tldHNcclxuICAgIGJ1Y2tldHMgPSBidWNrZXRzLmZpbHRlcihiID0+IGIucGl4ZWxzID4gMClcclxuXHJcbiAgICAvLyBjYWxjdWxhdGUgYnVja2V0IGNvbG9yc1xyXG4gICAgZm9yIChjb25zdCBidWNrZXQgb2YgYnVja2V0cykge1xyXG4gICAgICAgIGJ1Y2tldC5jb2xvciA9IGltYWdpbmcuZGl2WFlaKGJ1Y2tldC5jb2xvciwgYnVja2V0LnBpeGVscylcclxuICAgIH1cclxuXHJcbiAgICAvLyBjb21iaW5lIGJ1Y2tldHMgdGhhdCBhcmUgdmVyeSBjbG9zZSBpbiBjb2xvciBhZnRlciBjb2xvciBhdmVyYWdpbmdcclxuICAgIGxldCBidWNrZXRTZXQgPSBuZXcgU2V0KGJ1Y2tldHMpXHJcbiAgICB3aGlsZSAoYnVja2V0U2V0LnNpemUgPiAxKSB7XHJcbiAgICAgICAgLy8gcHJvY2VlZCBmb3IgYXMgbG9uZyBhcyBidWNrZXRzIGNhbiBiZSBjb21iaW5lZFxyXG4gICAgICAgIGxldCBtZXJnZSA9IGZhbHNlXHJcbiAgICAgICAgZm9yIChjb25zdCBidWNrZXQgb2YgYnVja2V0U2V0KSB7XHJcbiAgICAgICAgICAgIC8vIGZpbmQgXCJuZWFyZXN0XCIgY29sb3JcclxuICAgICAgICAgICAgY29uc3QgbmVhcmVzdCA9IFsuLi5idWNrZXRTZXRdXHJcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGIgPT4gYiAhPSBidWNrZXQpXHJcbiAgICAgICAgICAgICAgICAucmVkdWNlKChiMSwgYjIpID0+IGltYWdpbmcuY2FsY0Rpc3RTcShidWNrZXQuY29sb3IsIGIxLmNvbG9yKSA8IGltYWdpbmcuY2FsY0Rpc3RTcShidWNrZXQuY29sb3IsIGIyLmNvbG9yKSA/IGIxIDogYjIpXHJcblxyXG4gICAgICAgICAgICBjb25zdCBkaXN0U3EgPSBpbWFnaW5nLmNhbGNEaXN0U3EoYnVja2V0LmNvbG9yLCBuZWFyZXN0LmNvbG9yKVxyXG4gICAgICAgICAgICBpZiAoZGlzdFNxID4gLjEpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIG1lcmdlIHRoZSBidWNrZXRzXHJcbiAgICAgICAgICAgIGJ1Y2tldC5jb2xvciA9IGltYWdpbmcuZGl2WFlaKFxyXG4gICAgICAgICAgICAgICAgaW1hZ2luZy5hZGRYWVooaW1hZ2luZy5tdWxYWVooYnVja2V0LmNvbG9yLCBidWNrZXQucGl4ZWxzKSwgaW1hZ2luZy5tdWxYWVoobmVhcmVzdC5jb2xvciwgbmVhcmVzdC5waXhlbHMpKSxcclxuICAgICAgICAgICAgICAgIGJ1Y2tldC5waXhlbHMgKyBuZWFyZXN0LnBpeGVscylcclxuXHJcbiAgICAgICAgICAgIGJ1Y2tldFNldC5kZWxldGUobmVhcmVzdClcclxuICAgICAgICAgICAgbWVyZ2UgPSB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIW1lcmdlKSB7XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGJ1Y2tldHMgPSBbLi4uYnVja2V0U2V0XVxyXG4gICAgICAgIC5zb3J0KChiMSwgYjIpID0+IGIyLnBpeGVscyAtIGIxLnBpeGVscylcclxuICAgICAgICAuc2xpY2UoMCwgbWF4Q29sb3JzKVxyXG5cclxuICAgIC8vIG1hcCBhbGwgY29sb3JzIHRvIHRvcCBOIGJ1Y2tldHNcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVja2V0T3ZlcmxheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIC8vIG90aGVyd2lzZSwgbWFwIHRvIG5ldyBidWNrZXRcclxuICAgICAgICBjb25zdCByID0gZGF0YVtpICogNF0gLyAyNTVcclxuICAgICAgICBjb25zdCBnID0gZGF0YVtpICogNCArIDFdIC8gMjU1XHJcbiAgICAgICAgY29uc3QgYiA9IGRhdGFbaSAqIDQgKyAyXSAvIDI1NVxyXG5cclxuICAgICAgICBpZiAociA+PSAuOTUgJiYgZyA+PSAuOTUgJiYgYiA+PSAuOTUpIHtcclxuICAgICAgICAgICAgYnVja2V0T3ZlcmxheVtpXSA9IG51bGxcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbG9yOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0gPSBbciwgZywgYl1cclxuICAgICAgICBjb25zdCBidWNrZXQgPSBidWNrZXRzLnJlZHVjZSgoYjEsIGIyKSA9PiBpbWFnaW5nLmNhbGNEaXN0U3EoYjEuY29sb3IsIGNvbG9yKSA8IGltYWdpbmcuY2FsY0Rpc3RTcShiMi5jb2xvciwgY29sb3IpID8gYjEgOiBiMilcclxuICAgICAgICBidWNrZXRPdmVybGF5W2ldID0gYnVja2V0XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZGV0ZXJtaW5lIHBhbGV0dGUgY29sb3JzXHJcbiAgICBjb25zdCBwYWxldHRlID0gYnVja2V0cy5tYXAoYiA9PiBpbWFnaW5nLm11bFhZWihiLmNvbG9yLCAyNTUpKVxyXG4gICAgY29uc3QgcGFsZXR0ZU92ZXJsYXkgPSBidWNrZXRPdmVybGF5Lm1hcChiID0+IGIgPyBidWNrZXRzLmluZGV4T2YoYikgOiAtMSlcclxuICAgIHJldHVybiBbcGFsZXR0ZSwgcGFsZXR0ZU92ZXJsYXldXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVJlZ2lvbk92ZXJsYXkod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSk6IFtSZWdpb25bXSwgUmVnaW9uT3ZlcmxheV0ge1xyXG4gICAgY29uc3QgcmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSA9IHV0aWwuZmlsbChudWxsLCB3aWR0aCAqIGhlaWdodClcclxuICAgIGNvbnN0IHJlZ2lvbnM6IFJlZ2lvbltdID0gW11cclxuXHJcbiAgICBpbWFnaW5nLnNjYW4od2lkdGgsIGhlaWdodCwgKHgsIHksIG9mZnNldCkgPT4ge1xyXG4gICAgICAgIGlmIChyZWdpb25PdmVybGF5W29mZnNldF0pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCByZWdpb246IFJlZ2lvbiA9IHtcclxuICAgICAgICAgICAgY29sb3I6IHBhbGV0dGVPdmVybGF5W29mZnNldF0sXHJcbiAgICAgICAgICAgIHBpeGVsczogMCxcclxuICAgICAgICAgICAgYm91bmRzOiB7XHJcbiAgICAgICAgICAgICAgICBtaW5YOiBJbmZpbml0eSxcclxuICAgICAgICAgICAgICAgIG1heFg6IC0xLFxyXG4gICAgICAgICAgICAgICAgbWluWTogSW5maW5pdHksXHJcbiAgICAgICAgICAgICAgICBtYXhZOiAtMVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBtYXhSZWN0OiB7XHJcbiAgICAgICAgICAgICAgICBtaW5YOiBJbmZpbml0eSxcclxuICAgICAgICAgICAgICAgIG1heFg6IC0xLFxyXG4gICAgICAgICAgICAgICAgbWluWTogSW5maW5pdHksXHJcbiAgICAgICAgICAgICAgICBtYXhZOiAtMVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmaWxsZWQ6IGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSByZWdpb25cclxuICAgICAgICByZWdpb25zLnB1c2gocmVnaW9uKVxyXG4gICAgICAgIGV4cGxvcmVSZWdpb24od2lkdGgsIGhlaWdodCwgcGFsZXR0ZU92ZXJsYXksIHgsIHksIHJlZ2lvbk92ZXJsYXkpXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIHBydW5lIHNvbWUgcmVnaW9uc1xyXG4gICAgcmV0dXJuIFtyZWdpb25zLCByZWdpb25PdmVybGF5XVxyXG59XHJcblxyXG5mdW5jdGlvbiBwcnVuZVJlZ2lvbnMod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHJlZ2lvbnM6IFJlZ2lvbltdLCByZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5KTogUmVnaW9uW10ge1xyXG4gICAgY29uc3QgcmVnaW9uU2V0ID0gbmV3IFNldChyZWdpb25zKVxyXG4gICAgY29uc3QgbWluUmVnaW9uV2lkdGggPSAxMFxyXG4gICAgY29uc3QgbWluUmVnaW9uSGVpZ2h0ID0gMTBcclxuICAgIGNvbnN0IG1pblJlZ2lvblBpeGVscyA9IG1pblJlZ2lvbldpZHRoICogbWluUmVnaW9uSGVpZ2h0XHJcblxyXG4gICAgZm9yIChjb25zdCByZWdpb24gb2YgcmVnaW9ucykge1xyXG4gICAgICAgIGlmIChyZWdpb24ucGl4ZWxzIDw9IG1pblJlZ2lvblBpeGVscykge1xyXG4gICAgICAgICAgICByZWdpb25TZXQuZGVsZXRlKHJlZ2lvbilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2FsY1JlZ2lvbkJvdW5kcyh3aWR0aCwgaGVpZ2h0LCByZWdpb25PdmVybGF5KVxyXG4gICAgZm9yIChjb25zdCByZWdpb24gb2YgcmVnaW9uU2V0KSB7XHJcbiAgICAgICAgaWYgKGNhbGNXaWR0aChyZWdpb24uYm91bmRzKSA8PSBtaW5SZWdpb25XaWR0aCkge1xyXG4gICAgICAgICAgICByZWdpb25TZXQuZGVsZXRlKHJlZ2lvbilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChjYWxjSGVpZ2h0KHJlZ2lvbi5ib3VuZHMpIDw9IG1pblJlZ2lvbkhlaWdodCkge1xyXG4gICAgICAgICAgICByZWdpb25TZXQuZGVsZXRlKHJlZ2lvbilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gY2FsY3VsYXRlIG1heGltYWwgcmVjIGZvciBlYWNoIHJlZ2lvblxyXG4gICAgZm9yIChjb25zdCByZWdpb24gb2YgcmVnaW9uU2V0KSB7XHJcbiAgICAgICAgcmVnaW9uLm1heFJlY3QgPSBjYWxjTWF4UmVnaW9uUmVjdCh3aWR0aCwgcmVnaW9uLCByZWdpb25PdmVybGF5KVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvblNldCkge1xyXG4gICAgICAgIGlmIChjYWxjV2lkdGgocmVnaW9uLm1heFJlY3QpIDwgbWluUmVnaW9uV2lkdGgpIHtcclxuICAgICAgICAgICAgcmVnaW9uU2V0LmRlbGV0ZShyZWdpb24pXHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoY2FsY0hlaWdodChyZWdpb24ubWF4UmVjdCkgPCBtaW5SZWdpb25IZWlnaHQpIHtcclxuICAgICAgICAgICAgcmVnaW9uU2V0LmRlbGV0ZShyZWdpb24pXHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIHVwZGF0ZSB0aGUgb3ZlcmxheVxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZWdpb25PdmVybGF5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgcmVnaW9uID0gcmVnaW9uT3ZlcmxheVtpXVxyXG4gICAgICAgIGlmICghcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJlZ2lvblNldC5oYXMocmVnaW9uKSkge1xyXG4gICAgICAgICAgICByZWdpb25PdmVybGF5W2ldID0gbnVsbFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gWy4uLnJlZ2lvblNldF1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlVW51c2VkUGFsZXR0ZUVudHJpZXMocGFsZXR0ZTogaW1hZ2luZy5Db2xvcltdLCByZWdpb25zOiBSZWdpb25bXSk6IGltYWdpbmcuQ29sb3JbXSB7XHJcbiAgICAvLyBjcmVhdGUgYSBtYXAgZnJvbSBjdXJyZW50IGNvbG9yIGluZGV4IHRvIG5ldyBjb2xvciBpbmRleFxyXG4gICAgY29uc3QgdXNlZFNldCA9IG5ldyBTZXQocmVnaW9ucy5tYXAociA9PiByLmNvbG9yKSlcclxuICAgIHVzZWRTZXQuZGVsZXRlKC0xKVxyXG4gICAgY29uc3QgdXNlZCA9IFsuLi51c2VkU2V0XVxyXG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4odXNlZC5tYXAoKHUsIGkpID0+IFt1LCBpXSkpXHJcblxyXG4gICAgZm9yIChjb25zdCByZWdpb24gb2YgcmVnaW9ucykge1xyXG4gICAgICAgIGlmIChyZWdpb24uY29sb3IgPT09IC0xKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb2xvciA9IG1hcC5nZXQocmVnaW9uLmNvbG9yKVxyXG4gICAgICAgIGlmICh0eXBlb2YgY29sb3IgPT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ29sb3Igbm90IGZvdW5kIGluIG1hcFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVnaW9uLmNvbG9yID0gY29sb3JcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdXNlZC5tYXAoaSA9PiBwYWxldHRlW2ldKVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjUmVnaW9uQm91bmRzKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCByZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5KSB7XHJcbiAgICBpbWFnaW5nLnNjYW4od2lkdGgsIGhlaWdodCwgKHgsIHksIG9mZnNldCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XVxyXG4gICAgICAgIGlmICghcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgYm91bmRzID0gcmVnaW9uLmJvdW5kc1xyXG4gICAgICAgIGJvdW5kcy5taW5YID0gTWF0aC5taW4oYm91bmRzLm1pblgsIHgpXHJcbiAgICAgICAgYm91bmRzLm1heFggPSBNYXRoLm1heChib3VuZHMubWF4WCwgeClcclxuICAgICAgICBib3VuZHMubWluWSA9IE1hdGgubWluKGJvdW5kcy5taW5ZLCB5KVxyXG4gICAgICAgIGJvdW5kcy5tYXhZID0gTWF0aC5tYXgoYm91bmRzLm1heFksIHkpXHJcbiAgICB9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjTWF4UmVnaW9uUmVjdChyb3dQaXRjaDogbnVtYmVyLCByZWdpb246IFJlZ2lvbiwgcmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSk6IEJvdW5kcyB7XHJcbiAgICAvLyBkZXJpdmVkIGZyb20gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNzI0NS9wdXp6bGUtZmluZC1sYXJnZXN0LXJlY3RhbmdsZS1tYXhpbWFsLXJlY3RhbmdsZS1wcm9ibGVtXHJcbiAgICAvLyBhbGdvcml0aG0gbmVlZHMgdG8ga2VlcCB0cmFjayBvZiByZWN0YW5nbGUgc3RhdGUgZm9yIGV2ZXJ5IGNvbHVtbiBmb3IgZXZlcnkgcmVnaW9uXHJcbiAgICBjb25zdCB7IG1pblg6IHgwLCBtaW5ZOiB5MCwgbWF4WDogeDEsIG1heFk6IHkxIH0gPSByZWdpb24uYm91bmRzXHJcbiAgICBjb25zdCB3aWR0aCA9IHgxIC0geDAgKyAxXHJcbiAgICBjb25zdCBoZWlnaHQgPSB5MSAtIHkwICsgMVxyXG4gICAgY29uc3QgbHMgPSB1dGlsLmZpbGwoeDAsIHdpZHRoKVxyXG4gICAgY29uc3QgcnMgPSB1dGlsLmZpbGwoeDAgKyB3aWR0aCwgd2lkdGgpXHJcbiAgICBjb25zdCBocyA9IHV0aWwuZmlsbCgwLCB3aWR0aClcclxuXHJcbiAgICBsZXQgbWF4QXJlYSA9IDBcclxuICAgIGNvbnN0IGJvdW5kczogQm91bmRzID0ge1xyXG4gICAgICAgIG1pblg6IEluZmluaXR5LFxyXG4gICAgICAgIG1heFg6IC0xLFxyXG4gICAgICAgIG1pblk6IEluZmluaXR5LFxyXG4gICAgICAgIG1heFk6IC0xLFxyXG4gICAgfVxyXG5cclxuICAgIGltYWdpbmcuc2NhblJvd3NSZWdpb24oeTAsIGhlaWdodCwgcm93UGl0Y2gsICh5LCB5T2Zmc2V0KSA9PiB7XHJcbiAgICAgICAgbGV0IGwgPSB4MFxyXG4gICAgICAgIGxldCByID0geDAgKyB3aWR0aFxyXG5cclxuICAgICAgICAvLyBoZWlnaHQgc2NhblxyXG4gICAgICAgIGZvciAobGV0IHggPSB4MDsgeCA8IHgxOyArK3gpIHtcclxuICAgICAgICAgICAgY29uc3QgaSA9IHggLSB4MFxyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgICAgICBjb25zdCBpc1JlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9PT0gcmVnaW9uXHJcblxyXG4gICAgICAgICAgICBpZiAoaXNSZWdpb24pIHtcclxuICAgICAgICAgICAgICAgIGhzW2ldICs9IDFcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGhzW2ldID0gMFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBsIHNjYW5cclxuICAgICAgICBmb3IgKGxldCB4ID0geDA7IHggPCB4MTsgKyt4KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGkgPSB4IC0geDBcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgaXNSZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldF0gPT09IHJlZ2lvblxyXG5cclxuICAgICAgICAgICAgaWYgKGlzUmVnaW9uKSB7XHJcbiAgICAgICAgICAgICAgICBsc1tpXSA9IE1hdGgubWF4KGxzW2ldLCBsKVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbHNbaV0gPSAwXHJcbiAgICAgICAgICAgICAgICBsID0geCArIDFcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gciBzY2FuXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IHgxIC0gMTsgeCA+PSB4MDsgLS14KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGkgPSB4IC0geDBcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgaXNSZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldF0gPT09IHJlZ2lvblxyXG5cclxuICAgICAgICAgICAgaWYgKGlzUmVnaW9uKSB7XHJcbiAgICAgICAgICAgICAgICByc1tpXSA9IE1hdGgubWluKHJzW2ldLCByKVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcnNbaV0gPSB4MVxyXG4gICAgICAgICAgICAgICAgciA9IHhcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYXJlYSBzY2FuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3aWR0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFyZWEgPSBoc1tpXSAqIChyc1tpXSAtIGxzW2ldKVxyXG4gICAgICAgICAgICBpZiAoYXJlYSA+IG1heEFyZWEpIHtcclxuICAgICAgICAgICAgICAgIG1heEFyZWEgPSBhcmVhXHJcbiAgICAgICAgICAgICAgICBib3VuZHMubWluWCA9IGxzW2ldXHJcbiAgICAgICAgICAgICAgICBib3VuZHMubWF4WCA9IHJzW2ldXHJcbiAgICAgICAgICAgICAgICBib3VuZHMubWluWSA9IHkgLSBoc1tpXVxyXG4gICAgICAgICAgICAgICAgYm91bmRzLm1heFkgPSB5XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KVxyXG5cclxuICAgIHJldHVybiBib3VuZHNcclxufVxyXG5cclxuZnVuY3Rpb24gZXhwbG9yZVJlZ2lvbih3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcGFsZXR0ZU92ZXJsYXk6IG51bWJlcltdLCB4MDogbnVtYmVyLCB5MDogbnVtYmVyLCByZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5KSB7XHJcbiAgICBjb25zdCBzdGFjazogbnVtYmVyW10gPSBbXVxyXG4gICAgY29uc3Qgb2Zmc2V0MCA9IHkwICogd2lkdGggKyB4MFxyXG4gICAgY29uc3QgcmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQwXVxyXG4gICAgaWYgKCFyZWdpb24pIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBjb2xvciA9IHJlZ2lvbi5jb2xvclxyXG5cclxuICAgIHN0YWNrLnB1c2goeDApXHJcbiAgICBzdGFjay5wdXNoKHkwKVxyXG5cclxuICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc3QgeSA9IHN0YWNrLnBvcCgpIGFzIG51bWJlclxyXG4gICAgICAgIGNvbnN0IHggPSBzdGFjay5wb3AoKSBhcyBudW1iZXJcclxuICAgICAgICBjb25zdCBvZmZzZXQgPSB5ICogd2lkdGggKyB4XHJcbiAgICAgICAgcmVnaW9uT3ZlcmxheVtvZmZzZXRdID0gcmVnaW9uXHJcbiAgICAgICAgcmVnaW9uLnBpeGVscysrXHJcblxyXG4gICAgICAgIC8vIGV4cGxvcmUgbmVpZ2hib3JzIChpZiBzYW1lIGNvbG9yKVxyXG4gICAgICAgIGNvbnN0IGwgPSB4IC0gMVxyXG4gICAgICAgIGNvbnN0IHIgPSB4ICsgMVxyXG4gICAgICAgIGNvbnN0IHQgPSB5IC0gMVxyXG4gICAgICAgIGNvbnN0IGIgPSB5ICsgMVxyXG5cclxuICAgICAgICBpZiAobCA+PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldDEgPSBvZmZzZXQgLSAxXHJcbiAgICAgICAgICAgIGNvbnN0IHJlZ2lvbjEgPSByZWdpb25PdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbG9yMSA9IHBhbGV0dGVPdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGlmICghcmVnaW9uMSAmJiBjb2xvciA9PT0gY29sb3IxKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKGwpXHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChyIDwgd2lkdGgpIHtcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0MSA9IG9mZnNldCArIDFcclxuICAgICAgICAgICAgY29uc3QgcmVnaW9uMSA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgY29uc3QgY29sb3IxID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgaWYgKCFyZWdpb24xICYmIGNvbG9yID09PSBjb2xvcjEpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2gocilcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHQgPj0gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQxID0gb2Zmc2V0IC0gd2lkdGhcclxuICAgICAgICAgICAgY29uc3QgcmVnaW9uMSA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgY29uc3QgY29sb3IxID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgaWYgKCFyZWdpb24xICYmIGNvbG9yID09PSBjb2xvcjEpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeClcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2godClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGIgPCBoZWlnaHQpIHtcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0MSA9IG9mZnNldCArIHdpZHRoXHJcbiAgICAgICAgICAgIGNvbnN0IHJlZ2lvbjEgPSByZWdpb25PdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbG9yMSA9IHBhbGV0dGVPdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGlmICghcmVnaW9uMSAmJiBjb2xvciA9PT0gY29sb3IxKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHgpXHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKGIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdCb3JkZXJzKHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXksIGltYWdlRGF0YTogSW1hZ2VEYXRhKSB7XHJcbiAgICAvLyBjb2xvciBib3JkZXJzXHJcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQsIGRhdGEgfSA9IGltYWdlRGF0YVxyXG4gICAgaW1hZ2luZy5zY2FuSW1hZ2VEYXRhKGltYWdlRGF0YSwgKHgsIHksIG9mZnNldCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XVxyXG4gICAgICAgIGlmICghcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbCA9IHggLSAxXHJcbiAgICAgICAgY29uc3QgciA9IHggKyAxXHJcbiAgICAgICAgY29uc3QgdCA9IHkgLSAxXHJcbiAgICAgICAgY29uc3QgYiA9IHkgKyAxXHJcblxyXG4gICAgICAgIC8vIGVkZ2UgY2VsbHMgYXJlIG5vdCBib3JkZXIgKGZvciBub3cpXHJcbiAgICAgICAgaWYgKGwgPCAwIHx8IHIgPj0gd2lkdGggfHwgdCA8IDAgfHwgYiA+PSBoZWlnaHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBsUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQgLSAxXVxyXG4gICAgICAgIGlmIChsUmVnaW9uICYmIGxSZWdpb24gIT09IHJlZ2lvbikge1xyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDRdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAxXSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMl0gPSAwXHJcbiAgICAgICAgICAgIHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHJSZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldCArIDFdXHJcbiAgICAgICAgaWYgKHJSZWdpb24gJiYgclJlZ2lvbiAhPT0gcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNF0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDFdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAyXSA9IDBcclxuICAgICAgICAgICAgcmVnaW9uT3ZlcmxheVtvZmZzZXRdID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdFJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0IC0gd2lkdGhdXHJcbiAgICAgICAgaWYgKHRSZWdpb24gJiYgdFJlZ2lvbiAhPT0gcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNF0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDFdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAyXSA9IDBcclxuICAgICAgICAgICAgcmVnaW9uT3ZlcmxheVtvZmZzZXRdID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgYlJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0ICsgd2lkdGhdXHJcbiAgICAgICAgaWYgKGJSZWdpb24gJiYgYlJlZ2lvbiAhPT0gcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNF0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDFdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAyXSA9IDBcclxuICAgICAgICAgICAgcmVnaW9uT3ZlcmxheVtvZmZzZXRdID0gbnVsbFxyXG4gICAgICAgIH1cclxuICAgIH0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbGxJbnRlcmlvcihkYXRhOiBVaW50OENsYW1wZWRBcnJheSwgcmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSkge1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZWdpb25PdmVybGF5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgcmVnaW9uID0gcmVnaW9uT3ZlcmxheVtpXVxyXG4gICAgICAgIGlmICghcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkYXRhW2kgKiA0XSA9IDI1NVxyXG4gICAgICAgIGRhdGFbaSAqIDQgKyAxXSA9IDI1NVxyXG4gICAgICAgIGRhdGFbaSAqIDQgKyAyXSA9IDI1NVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVQYWxldHRlVWkocGFsZXR0ZTogaW1hZ2luZy5Db2xvcltdKSB7XHJcbiAgICB1dGlsLnJlbW92ZUFsbENoaWxkcmVuKHBhbGV0dGVEaXYpXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhbGV0dGUubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCBjb2xvciA9IHBhbGV0dGVbaV1cclxuICAgICAgICBjb25zdCBsdW0gPSBpbWFnaW5nLmNhbGNMdW1pbmFuY2UoY29sb3IpXHJcbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBwYWxldHRlRW50cnlUZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgY29uc3QgZW50cnlEaXYgPSB1dGlsLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLnBhbGV0dGUtZW50cnlcIikgYXMgSFRNTEVsZW1lbnRcclxuICAgICAgICBlbnRyeURpdi50ZXh0Q29udGVudCA9IGAke2kgKyAxfWBcclxuICAgICAgICBlbnRyeURpdi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBgcmdiKCR7Y29sb3JbMF19LCAke2NvbG9yWzFdfSwgJHtjb2xvclsyXX0pYFxyXG4gICAgICAgIGVudHJ5RGl2LnN0eWxlLmNvbG9yID0gbHVtIDwgLjUgPyBcIndoaXRlXCIgOiBcImJsYWNrXCJcclxuICAgICAgICBwYWxldHRlRGl2LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3UmVnaW9uTGFiZWxzKGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCByZWdpb25zOiBSZWdpb25bXSkge1xyXG4gICAgY3R4LmZvbnQgPSBcIjE2cHggYXJpYWwgYm9sZFwiXHJcbiAgICBjb25zdCB0ZXh0SGVpZ2h0ID0gY3R4Lm1lYXN1cmVUZXh0KFwiTVwiKS53aWR0aFxyXG4gICAgY29uc3QgZm9udCA9IGN0eC5mb250XHJcblxyXG4gICAgZm9yIChjb25zdCByZWdpb24gb2YgcmVnaW9ucykge1xyXG4gICAgICAgIGlmIChyZWdpb24uY29sb3IgPT09IC0xKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBsYWJlbCA9IGAke3JlZ2lvbi5jb2xvciArIDF9YFxyXG4gICAgICAgIGNvbnN0IG1ldHJpY3MgPSBjdHgubWVhc3VyZVRleHQobGFiZWwpXHJcbiAgICAgICAgY29uc3QgY2VudGVyID0gY2FsY0NlbnRlcihyZWdpb24ubWF4UmVjdClcclxuICAgICAgICBjb25zdCB4ID0gY2VudGVyWzBdIC0gbWV0cmljcy53aWR0aCAvIDJcclxuICAgICAgICBjb25zdCB5ID0gY2VudGVyWzFdICsgdGV4dEhlaWdodCAvIDJcclxuICAgICAgICBjdHguZmlsbFRleHQobGFiZWwsIHgsIHkpXHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmZvbnQgPSBmb250XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9uQ2FudmFzQ2xpY2soZXZ0OiBNb3VzZUV2ZW50KSB7XHJcbiAgICBpZiAoIXBsYXlTdGF0ZSkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHsgcGFsZXR0ZSwgcmVnaW9ucywgcmVnaW9uT3ZlcmxheSB9ID0gcGxheVN0YXRlXHJcbiAgICBjb25zdCBpZHggPSBldnQub2Zmc2V0WSAqIGN0eC5jYW52YXMud2lkdGggKyBldnQub2Zmc2V0WFxyXG4gICAgY29uc3QgcmVnaW9uID0gcmVnaW9uT3ZlcmxheVtpZHhdXHJcbiAgICBpZiAoIXJlZ2lvbiB8fCByZWdpb24uY29sb3IgPT09IC0xKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYm91bmRzID0gcmVnaW9uLmJvdW5kc1xyXG4gICAgY29uc3QgcmVnaW9uV2lkdGggPSBjYWxjV2lkdGgoYm91bmRzKVxyXG4gICAgY29uc3QgcmVnaW9uSGVpZ2h0ID0gY2FsY0hlaWdodChib3VuZHMpXHJcbiAgICBjb25zdCBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKGJvdW5kcy5taW5YLCBib3VuZHMubWluWSwgcmVnaW9uV2lkdGgsIHJlZ2lvbkhlaWdodClcclxuICAgIGNvbnN0IGRhdGEgPSBpbWFnZURhdGEuZGF0YVxyXG4gICAgY29uc3QgY29sb3IgPSBwYWxldHRlW3JlZ2lvbi5jb2xvcl1cclxuXHJcbiAgICBpbWFnaW5nLnNjYW5JbWFnZURhdGEoaW1hZ2VEYXRhLCAoeCwgeSwgb2Zmc2V0KSA9PiB7XHJcbiAgICAgICAgY29uc3QgaW1hZ2VYID0geCArIGJvdW5kcy5taW5YXHJcbiAgICAgICAgY29uc3QgaW1hZ2VZID0geSArIGJvdW5kcy5taW5ZXHJcbiAgICAgICAgY29uc3QgaW1hZ2VPZmZzZXQgPSBpbWFnZVkgKiBjdHguY2FudmFzLndpZHRoICsgaW1hZ2VYXHJcbiAgICAgICAgY29uc3QgaW1hZ2VSZWdpb24gPSByZWdpb25PdmVybGF5W2ltYWdlT2Zmc2V0XVxyXG4gICAgICAgIGlmIChpbWFnZVJlZ2lvbiAhPT0gcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGF0YVtvZmZzZXQgKiA0XSA9IGNvbG9yWzBdXHJcbiAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMV0gPSBjb2xvclsxXVxyXG4gICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDJdID0gY29sb3JbMl1cclxuICAgIH0pXHJcblxyXG4gICAgY3R4LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIGJvdW5kcy5taW5YLCBib3VuZHMubWluWSlcclxuICAgIHJlZ2lvbi5maWxsZWQgPSB0cnVlXHJcblxyXG4gICAgLy8gaWYgYWxsIHJlZ2lvbnMgYXJlIGZpbGxlZCwgcmVwbGFjZSB3aXRoIG9yaWdpbmFsIGltYWdlIGRhdGFcclxuICAgIGlmIChyZWdpb25zLmV2ZXJ5KHIgPT4gci5maWxsZWQgfHwgci5jb2xvciA9PT0gLTEpKSB7XHJcbiAgICAgICAgY3R4LnB1dEltYWdlRGF0YShwbGF5U3RhdGUuaW1hZ2VEYXRhLCAwLCAwKVxyXG4gICAgfVxyXG59Il19