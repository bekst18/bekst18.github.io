import * as array from "../shared/array.js";
import * as imaging from "../shared/imaging.js";
import * as dom from "../shared/dom.js";
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
const camera = dom.byId("camera");
let cameraMode = CameraMode.None;
const canvas = dom.byId("canvas");
const acquireImageDiv = dom.byId("acquireImage");
const paletteDiv = dom.byId("palette");
const paletteEntryTemplate = dom.byId("paletteEntry");
const ctx = canvas.getContext("2d");
if (!ctx) {
    throwErrorMessage("Canvas element not supported");
}
const captureImageButton = dom.byId("captureImageButton");
const loadUi = dom.byId("loadUi");
const playUi = dom.byId("playUi");
let playState = null;
init();
async function init() {
    const fileDropBox = dom.byId("fileDropBox");
    const fileInput = dom.byId("fileInput");
    const fileButton = dom.byId("fileButton");
    const useCameraButton = dom.byId("useCameraButton");
    const flipCameraButton = dom.byId("flipCameraButton");
    const stopCameraButton = dom.byId("stopCameraButton");
    const returnButton = dom.byId("returnButton");
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
    const errorsDiv = dom.byId("errors");
    dom.removeAllChildren(errorsDiv);
}
function appendErrorMessage(error) {
    const errorsDiv = dom.byId("errors");
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
    let buckets = array.generate(numBuckets, () => ({ color: [0, 0, 0], pixels: 0 }));
    // assign and update bucket for each pixel
    const bucketOverlay = array.generate(pixels, i => {
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
            const dist = imaging.calcDist(bucket.color, nearest.color);
            if (dist > .1) {
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
    const regionOverlay = array.uniform(null, width * height);
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
    const ls = array.uniform(x0, width);
    const rs = array.uniform(x0 + width, width);
    const hs = array.uniform(0, width);
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
    dom.removeAllChildren(paletteDiv);
    for (let i = 0; i < palette.length; ++i) {
        const color = palette[i];
        const lum = imaging.calcLuminance(color);
        const fragment = paletteEntryTemplate.content.cloneNode(true);
        const entryDiv = dom.bySelector(fragment, ".palette-entry");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQUMvQyxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBRXZDLElBQUssVUFJSjtBQUpELFdBQUssVUFBVTtJQUNYLDJDQUFJLENBQUE7SUFDSiwyQ0FBSSxDQUFBO0lBQ0oseURBQVcsQ0FBQTtBQUNmLENBQUMsRUFKSSxVQUFVLEtBQVYsVUFBVSxRQUlkO0FBU0QsU0FBUyxTQUFTLENBQUMsTUFBYztJQUM3QixPQUFPLE1BQU0sQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7QUFDeEMsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLE1BQWM7SUFDOUIsT0FBTyxNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO0FBQ3hDLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBQyxNQUFjO0lBQzVCLE9BQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUNqRCxDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsTUFBYztJQUM5QixPQUFPO1FBQ0gsTUFBTSxDQUFDLElBQUksR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUNuQyxNQUFNLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO0tBQ3ZDLENBQUE7QUFDTCxDQUFDO0FBbUJELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFxQixDQUFBO0FBQ3JELElBQUksVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUE7QUFDaEMsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQXNCLENBQUE7QUFDdEQsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQW1CLENBQUE7QUFDbEUsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQW1CLENBQUE7QUFDeEQsTUFBTSxvQkFBb0IsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBd0IsQ0FBQTtBQUU1RSxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBNkIsQ0FBQTtBQUMvRCxJQUFJLENBQUMsR0FBRyxFQUFFO0lBQ04saUJBQWlCLENBQUMsOEJBQThCLENBQUMsQ0FBQTtDQUNwRDtBQUVELE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBc0IsQ0FBQTtBQUM5RSxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBbUIsQ0FBQTtBQUNuRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBbUIsQ0FBQTtBQUVuRCxJQUFJLFNBQVMsR0FBcUIsSUFBSSxDQUFBO0FBRXRDLElBQUksRUFBRSxDQUFBO0FBRU4sS0FBSyxVQUFVLElBQUk7SUFDZixNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBbUIsQ0FBQTtJQUM3RCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBcUIsQ0FBQTtJQUMzRCxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBc0IsQ0FBQTtJQUM5RCxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFzQixDQUFBO0lBQ3hFLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBc0IsQ0FBQTtJQUMxRSxNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQXNCLENBQUE7SUFDMUUsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQXNCLENBQUE7SUFFbEUsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFDdEMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3JCLENBQUMsQ0FBQyxDQUFBO0lBRUYsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUMxRCxXQUFXLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFBO0lBQ3pELFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFFaEQsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7O1FBQ3RDLElBQUksUUFBQyxTQUFTLENBQUMsS0FBSywwQ0FBRSxNQUFNLENBQUEsRUFBRTtZQUMxQixPQUFNO1NBQ1Q7UUFFRCxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9CLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNyQixDQUFDLENBQUMsQ0FBQTtJQUVGLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDcEQsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ3RELGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUN0RCxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDMUQsWUFBWSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUNsRCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFBO0FBQ25ELENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxFQUFhO0lBQ2xDLEVBQUUsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtJQUNwQixFQUFFLENBQUMsY0FBYyxFQUFFLENBQUE7QUFDdkIsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLEVBQWE7O0lBQzdCLEVBQUUsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtJQUNwQixFQUFFLENBQUMsY0FBYyxFQUFFLENBQUE7SUFFbkIsSUFBSSxjQUFDLEVBQUUsYUFBRixFQUFFLHVCQUFGLEVBQUUsQ0FBRSxZQUFZLDBDQUFFLEtBQUssMENBQUUsTUFBTSxDQUFBLEVBQUU7UUFDbEMsT0FBTTtLQUNUO0lBRUQsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3JCLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxJQUFVO0lBQzNCLGtCQUFrQixFQUFFLENBQUE7SUFDcEIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNyQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDcEIsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLEdBQVc7SUFDNUIsa0JBQWtCLEVBQUUsQ0FBQTtJQUNwQixNQUFNLEdBQUcsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFBO0lBQ3ZCLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1FBQzlCLFNBQVMsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3RELENBQUMsQ0FBQyxDQUFBO0lBRUYsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUE7QUFDakIsQ0FBQztBQUVELFNBQVMsa0JBQWtCO0lBQ3ZCLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDcEMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFBO0FBQ3BDLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLEtBQWE7SUFDckMsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyQyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2xDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO0lBQ3ZCLFNBQVMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDOUIsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsS0FBYTtJQUNwQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQzFCLENBQUM7QUFFRCxLQUFLLFVBQVUsU0FBUztJQUNwQixlQUFlLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtJQUM5QixNQUFNLFdBQVcsR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFBO0lBQy9DLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxZQUFZLENBQUE7SUFDakQsTUFBTSxNQUFNLEdBQUcsTUFBTSxTQUFTLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQztRQUNyRCxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUU7UUFDekYsS0FBSyxFQUFFLEtBQUs7S0FDZixDQUFDLENBQUE7SUFFRixVQUFVLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQTtJQUM1QixNQUFNLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQTtJQUN6QixNQUFNLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLENBQUE7QUFDM0QsQ0FBQztBQUVELEtBQUssVUFBVSxVQUFVO0lBQ3JCLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFO1FBQ25CLE9BQU07S0FDVDtJQUVELE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUF3QixDQUFBO0lBQzNDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUM5QixLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRTtRQUN4QixLQUFLLENBQUMsSUFBSSxFQUFFLENBQUE7S0FDZjtJQUVELFVBQVUsR0FBRyxVQUFVLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQTtJQUNyRixNQUFNLFVBQVUsR0FBRyxVQUFVLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUE7SUFFekUsMEJBQTBCO0lBQzFCLE1BQU0sTUFBTSxHQUFHLE1BQU0sU0FBUyxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUM7UUFDckQsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRTtRQUN6RixLQUFLLEVBQUUsS0FBSztLQUNmLENBQUMsQ0FBQTtJQUVGLE1BQU0sQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFBO0lBQ3pCLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsQ0FBQTtBQUMzRCxDQUFDO0FBRUQsU0FBUyxZQUFZO0lBQ2pCLGVBQWUsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO0lBQzlCLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtBQUVqQixDQUFDO0FBRUQsU0FBUyxVQUFVO0lBQ2YsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQXdCLENBQUE7SUFDM0MsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNOLE9BQU07S0FDVDtJQUVELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUM5QixLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRTtRQUN4QixLQUFLLENBQUMsSUFBSSxFQUFFLENBQUE7S0FDZjtJQUVELFVBQVUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFBO0lBQzVCLGVBQWUsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO0FBQ2pDLENBQUM7QUFFRCxTQUFTLFlBQVk7SUFDakIsa0JBQWtCLEVBQUUsQ0FBQTtJQUVwQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBd0IsQ0FBQTtJQUMzQyxJQUFJLENBQUMsR0FBRyxFQUFFO1FBQ04sT0FBTTtLQUNUO0lBRUQsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JDLElBQUksQ0FBQyxLQUFLLEVBQUU7UUFDUixPQUFNO0tBQ1Q7SUFFRCxTQUFTLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUMxRSxDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsR0FBc0IsRUFBRSxLQUFhLEVBQUUsTUFBYztJQUNyRSx5QkFBeUI7SUFDekIsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUE7SUFDL0MsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUE7SUFFaEQsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ1QsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUE7UUFDakIsTUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFFLEdBQUcsTUFBTSxHQUFHLEtBQUssQ0FBQTtLQUN0QztTQUFNO1FBQ0gsTUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUE7UUFDbEIsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFFLEdBQUcsS0FBSyxHQUFHLE1BQU0sQ0FBQTtLQUNyQztJQUVELE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO0lBQ3BCLE1BQU0sQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO0lBRXJCLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDakUsTUFBTSxTQUFTLEdBQUcsWUFBWSxFQUFFLENBQUE7SUFDaEMsT0FBTyxTQUFTLENBQUE7QUFDcEIsQ0FBQztBQUVELFNBQVMsVUFBVTtJQUNmLFNBQVMsR0FBRyxJQUFJLENBQUE7SUFDaEIsTUFBTSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7SUFDckIsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7QUFDeEIsQ0FBQztBQUVELFNBQVMsWUFBWTtJQUNqQixvQ0FBb0M7SUFDcEMsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3JFLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUN6RCxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQTtJQUVuQywyQ0FBMkM7SUFDM0MsSUFBSSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsR0FBRyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMxRCxPQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFFeEQsR0FBRyxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2pDLElBQUksQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLEdBQUcsbUJBQW1CLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUNqRixPQUFPLEdBQUcsWUFBWSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBRTdELG9FQUFvRTtJQUNwRSxPQUFPLEdBQUcsMEJBQTBCLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBRXRELFdBQVcsQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDckMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUE7SUFDM0MsR0FBRyxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2pDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUN4QixnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFFOUIsT0FBTztRQUNILFNBQVMsRUFBRSxnQkFBZ0I7UUFDM0IsT0FBTyxFQUFFLE9BQU87UUFDaEIsT0FBTyxFQUFFLE9BQU87UUFDaEIsYUFBYSxFQUFFLGFBQWE7S0FDL0IsQ0FBQTtBQUNMLENBQUM7QUFFRCw4QkFBOEI7QUFDOUIsU0FBUyxTQUFTLENBQUMsU0FBb0IsRUFBRSxtQkFBMkIsRUFBRSxTQUFpQjtJQUNuRixNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxTQUFTLENBQUE7SUFDekMsTUFBTSxNQUFNLEdBQUcsS0FBSyxHQUFHLE1BQU0sQ0FBQTtJQUM3QixNQUFNLFdBQVcsR0FBRyxtQkFBbUIsR0FBRyxtQkFBbUIsQ0FBQTtJQUM3RCxNQUFNLFVBQVUsR0FBRyxXQUFXLEdBQUcsbUJBQW1CLENBQUE7SUFFcEQsdUJBQXVCO0lBQ3ZCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBNkIsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBRTdHLDBDQUEwQztJQUMxQyxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRTtRQUM3QyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQTtRQUMzQixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUE7UUFDL0IsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFBO1FBRS9CLGVBQWU7UUFDZixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFO1lBQ2xDLE9BQU8sSUFBSSxDQUFBO1NBQ2Q7UUFFRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLG1CQUFtQixDQUFDLEVBQUUsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxtQkFBbUIsQ0FBQyxFQUFFLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsbUJBQW1CLENBQUMsRUFBRSxtQkFBbUIsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUVqRixNQUFNLFNBQVMsR0FBRyxFQUFFLEdBQUcsV0FBVyxHQUFHLEVBQUUsR0FBRyxtQkFBbUIsR0FBRyxFQUFFLENBQUE7UUFDbEUsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNmLE9BQU8sTUFBTSxDQUFBO0lBQ2pCLENBQUMsQ0FBQyxDQUFBO0lBRUYsc0JBQXNCO0lBQ3RCLE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUUzQywwQkFBMEI7SUFDMUIsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUU7UUFDMUIsTUFBTSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0tBQzdEO0lBRUQscUVBQXFFO0lBQ3JFLElBQUksU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ2hDLE9BQU8sU0FBUyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUU7UUFDdkIsaURBQWlEO1FBQ2pELElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNqQixLQUFLLE1BQU0sTUFBTSxJQUFJLFNBQVMsRUFBRTtZQUM1Qix1QkFBdUI7WUFDdkIsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQztpQkFDekIsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQztpQkFDeEIsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBRTFILE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDMUQsSUFBSSxJQUFJLEdBQUcsRUFBRSxFQUFFO2dCQUNYLFNBQVE7YUFDWDtZQUVELG9CQUFvQjtZQUNwQixNQUFNLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQ3pCLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQzFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRW5DLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDekIsS0FBSyxHQUFHLElBQUksQ0FBQTtTQUNmO1FBRUQsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNSLE1BQUs7U0FDUjtLQUNKO0lBRUQsT0FBTyxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUM7U0FDbkIsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDO1NBQ3ZDLEtBQUssQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFFeEIsa0NBQWtDO0lBQ2xDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQzNDLCtCQUErQjtRQUMvQixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQTtRQUMzQixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUE7UUFDL0IsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFBO1FBRS9CLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUU7WUFDbEMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQTtZQUN2QixTQUFRO1NBQ1g7UUFFRCxNQUFNLEtBQUssR0FBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzlILGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUE7S0FDNUI7SUFFRCwyQkFBMkI7SUFDM0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzlELE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDMUUsT0FBTyxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQTtBQUNwQyxDQUFDO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxLQUFhLEVBQUUsTUFBYyxFQUFFLGNBQXdCO0lBQ2hGLE1BQU0sYUFBYSxHQUFrQixLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUE7SUFDeEUsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFBO0lBRTVCLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDekMsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDdkIsT0FBTTtTQUNUO1FBRUQsTUFBTSxNQUFNLEdBQVc7WUFDbkIsS0FBSyxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUM7WUFDN0IsTUFBTSxFQUFFLENBQUM7WUFDVCxNQUFNLEVBQUU7Z0JBQ0osSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDUixJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsQ0FBQyxDQUFDO2FBQ1g7WUFDRCxPQUFPLEVBQUU7Z0JBQ0wsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDUixJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsQ0FBQyxDQUFDO2FBQ1g7WUFDRCxNQUFNLEVBQUUsS0FBSztTQUNoQixDQUFBO1FBRUQsYUFBYSxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQTtRQUM5QixPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BCLGFBQWEsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBQ3JFLENBQUMsQ0FBQyxDQUFBO0lBRUYscUJBQXFCO0lBQ3JCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUE7QUFDbkMsQ0FBQztBQUVELFNBQVMsWUFBWSxDQUFDLEtBQWEsRUFBRSxNQUFjLEVBQUUsT0FBaUIsRUFBRSxhQUE0QjtJQUNoRyxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNsQyxNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUE7SUFDekIsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFBO0lBQzFCLE1BQU0sZUFBZSxHQUFHLGNBQWMsR0FBRyxlQUFlLENBQUE7SUFFeEQsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUU7UUFDMUIsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLGVBQWUsRUFBRTtZQUNsQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1NBQzNCO0tBQ0o7SUFFRCxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBQzlDLEtBQUssTUFBTSxNQUFNLElBQUksU0FBUyxFQUFFO1FBQzVCLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxjQUFjLEVBQUU7WUFDNUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtTQUMzQjtRQUVELElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxlQUFlLEVBQUU7WUFDOUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtTQUMzQjtLQUNKO0lBRUQsd0NBQXdDO0lBQ3hDLEtBQUssTUFBTSxNQUFNLElBQUksU0FBUyxFQUFFO1FBQzVCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQTtLQUNuRTtJQUVELEtBQUssTUFBTSxNQUFNLElBQUksU0FBUyxFQUFFO1FBQzVCLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxjQUFjLEVBQUU7WUFDNUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixTQUFRO1NBQ1g7UUFFRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsZUFBZSxFQUFFO1lBQzlDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDeEIsU0FBUTtTQUNYO0tBQ0o7SUFFRCxxQkFBcUI7SUFDckIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUU7UUFDM0MsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9CLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDVCxTQUFRO1NBQ1g7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN4QixhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFBO1NBQzFCO0tBQ0o7SUFFRCxPQUFPLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQTtBQUN6QixDQUFDO0FBRUQsU0FBUywwQkFBMEIsQ0FBQyxPQUF3QixFQUFFLE9BQWlCO0lBQzNFLDJEQUEyRDtJQUMzRCxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFDbEQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2xCLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQTtJQUN6QixNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBaUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUUvRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRTtRQUMxQixJQUFJLE1BQU0sQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDckIsU0FBUTtTQUNYO1FBRUQsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbkMsSUFBSSxPQUFPLEtBQUssS0FBSyxXQUFXLEVBQUU7WUFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1NBQzVDO1FBRUQsTUFBTSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7S0FDdkI7SUFFRCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNwQyxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxLQUFhLEVBQUUsTUFBYyxFQUFFLGFBQTRCO0lBQ2pGLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDekMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDVCxPQUFNO1NBQ1Q7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFBO1FBQzVCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzFDLENBQUMsQ0FBQyxDQUFBO0FBQ04sQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsUUFBZ0IsRUFBRSxNQUFjLEVBQUUsYUFBNEI7SUFDckYsZ0hBQWdIO0lBQ2hILHFGQUFxRjtJQUNyRixNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUE7SUFDaEUsTUFBTSxLQUFLLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDekIsTUFBTSxNQUFNLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDMUIsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDbkMsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzNDLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBRWxDLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQTtJQUNmLE1BQU0sTUFBTSxHQUFXO1FBQ25CLElBQUksRUFBRSxRQUFRO1FBQ2QsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNSLElBQUksRUFBRSxRQUFRO1FBQ2QsSUFBSSxFQUFFLENBQUMsQ0FBQztLQUNYLENBQUE7SUFFRCxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFO1FBQ3hELElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUNWLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUE7UUFFbEIsY0FBYztRQUNkLEtBQUssSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDMUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtZQUNoQixNQUFNLE1BQU0sR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFBO1lBQzFCLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsS0FBSyxNQUFNLENBQUE7WUFFakQsSUFBSSxRQUFRLEVBQUU7Z0JBQ1YsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTthQUNiO2lCQUFNO2dCQUNILEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7YUFDWjtTQUNKO1FBRUQsU0FBUztRQUNULEtBQUssSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDMUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtZQUNoQixNQUFNLE1BQU0sR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFBO1lBQzFCLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsS0FBSyxNQUFNLENBQUE7WUFFakQsSUFBSSxRQUFRLEVBQUU7Z0JBQ1YsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO2FBQzdCO2lCQUFNO2dCQUNILEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ1QsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7YUFDWjtTQUNKO1FBRUQsU0FBUztRQUNULEtBQUssSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQy9CLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDaEIsTUFBTSxNQUFNLEdBQUcsT0FBTyxHQUFHLENBQUMsQ0FBQTtZQUMxQixNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLEtBQUssTUFBTSxDQUFBO1lBRWpELElBQUksUUFBUSxFQUFFO2dCQUNWLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTthQUM3QjtpQkFBTTtnQkFDSCxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBO2dCQUNWLENBQUMsR0FBRyxDQUFDLENBQUE7YUFDUjtTQUNKO1FBRUQsWUFBWTtRQUNaLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDNUIsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3BDLElBQUksSUFBSSxHQUFHLE9BQU8sRUFBRTtnQkFDaEIsT0FBTyxHQUFHLElBQUksQ0FBQTtnQkFDZCxNQUFNLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDbkIsTUFBTSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ25CLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDdkIsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7YUFDbEI7U0FDSjtJQUNMLENBQUMsQ0FBQyxDQUFBO0lBRUYsT0FBTyxNQUFNLENBQUE7QUFDakIsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEtBQWEsRUFBRSxNQUFjLEVBQUUsY0FBd0IsRUFBRSxFQUFVLEVBQUUsRUFBVSxFQUFFLGFBQTRCO0lBQ2hJLE1BQU0sS0FBSyxHQUFhLEVBQUUsQ0FBQTtJQUMxQixNQUFNLE9BQU8sR0FBRyxFQUFFLEdBQUcsS0FBSyxHQUFHLEVBQUUsQ0FBQTtJQUMvQixNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDckMsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNULE9BQU07S0FDVDtJQUVELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUE7SUFFMUIsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNkLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7SUFFZCxPQUFPLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3JCLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQVksQ0FBQTtRQUMvQixNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFZLENBQUE7UUFDL0IsTUFBTSxNQUFNLEdBQUcsQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDNUIsYUFBYSxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQTtRQUM5QixNQUFNLENBQUMsTUFBTSxFQUFFLENBQUE7UUFFZixvQ0FBb0M7UUFDcEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNmLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDZixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUVmLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNSLE1BQU0sT0FBTyxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUE7WUFDMUIsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN0QyxJQUFJLENBQUMsT0FBTyxJQUFJLEtBQUssS0FBSyxNQUFNLEVBQUU7Z0JBQzlCLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ2IsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTthQUNoQjtTQUNKO1FBRUQsSUFBSSxDQUFDLEdBQUcsS0FBSyxFQUFFO1lBQ1gsTUFBTSxPQUFPLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUMxQixNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDdEMsTUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3RDLElBQUksQ0FBQyxPQUFPLElBQUksS0FBSyxLQUFLLE1BQU0sRUFBRTtnQkFDOUIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDYixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2FBQ2hCO1NBQ0o7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDUixNQUFNLE9BQU8sR0FBRyxNQUFNLEdBQUcsS0FBSyxDQUFBO1lBQzlCLE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN0QyxNQUFNLE1BQU0sR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDdEMsSUFBSSxDQUFDLE9BQU8sSUFBSSxLQUFLLEtBQUssTUFBTSxFQUFFO2dCQUM5QixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNiLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7YUFDaEI7U0FDSjtRQUVELElBQUksQ0FBQyxHQUFHLE1BQU0sRUFBRTtZQUNaLE1BQU0sT0FBTyxHQUFHLE1BQU0sR0FBRyxLQUFLLENBQUE7WUFDOUIsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN0QyxJQUFJLENBQUMsT0FBTyxJQUFJLEtBQUssS0FBSyxNQUFNLEVBQUU7Z0JBQzlCLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ2IsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTthQUNoQjtTQUNKO0tBQ0o7QUFDTCxDQUFDO0FBRUQsU0FBUyxXQUFXLENBQUMsYUFBNEIsRUFBRSxTQUFvQjtJQUNuRSxnQkFBZ0I7SUFDaEIsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsU0FBUyxDQUFBO0lBQ3pDLE9BQU8sQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUM5QyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNULE9BQU07U0FDVDtRQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDZixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNmLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFZixzQ0FBc0M7UUFDdEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksTUFBTSxFQUFFO1lBQzdDLE9BQU07U0FDVDtRQUVELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDekMsSUFBSSxPQUFPLElBQUksT0FBTyxLQUFLLE1BQU0sRUFBRTtZQUMvQixJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNwQixJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3hCLGFBQWEsQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUE7U0FDL0I7UUFFRCxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLElBQUksT0FBTyxJQUFJLE9BQU8sS0FBSyxNQUFNLEVBQUU7WUFDL0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDcEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3hCLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN4QixhQUFhLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFBO1NBQy9CO1FBRUQsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQTtRQUM3QyxJQUFJLE9BQU8sSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFO1lBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3BCLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN4QixJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDeEIsYUFBYSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQTtTQUMvQjtRQUVELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUE7UUFDN0MsSUFBSSxPQUFPLElBQUksT0FBTyxLQUFLLE1BQU0sRUFBRTtZQUMvQixJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNwQixJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3hCLGFBQWEsQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUE7U0FDL0I7SUFDTCxDQUFDLENBQUMsQ0FBQTtBQUNOLENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxJQUF1QixFQUFFLGFBQTRCO0lBQ3ZFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQzNDLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvQixJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1QsU0FBUTtTQUNYO1FBRUQsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUE7UUFDakIsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFBO1FBQ3JCLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQTtLQUN4QjtBQUNMLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxPQUF3QjtJQUM3QyxHQUFHLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDakMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUU7UUFDckMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDeEMsTUFBTSxRQUFRLEdBQUcsb0JBQW9CLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQXFCLENBQUE7UUFDakYsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQWdCLENBQUE7UUFDMUUsUUFBUSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQTtRQUNqQyxRQUFRLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUE7UUFDN0UsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7UUFDbkQsVUFBVSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtLQUNuQztBQUNMLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLEdBQTZCLEVBQUUsT0FBaUI7SUFDdEUsR0FBRyxDQUFDLElBQUksR0FBRyxpQkFBaUIsQ0FBQTtJQUM1QixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQTtJQUM3QyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFBO0lBRXJCLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFO1FBQzFCLElBQUksTUFBTSxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRTtZQUNyQixTQUFRO1NBQ1g7UUFFRCxNQUFNLEtBQUssR0FBRyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUE7UUFDbkMsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN0QyxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLENBQUMsQ0FBQTtRQUNwQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7S0FDNUI7SUFFRCxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtBQUNuQixDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsR0FBZTtJQUNsQyxJQUFJLENBQUMsU0FBUyxFQUFFO1FBQ1osT0FBTTtLQUNUO0lBRUQsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLEdBQUcsU0FBUyxDQUFBO0lBQ3JELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQTtJQUN4RCxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDakMsSUFBSSxDQUFDLE1BQU0sSUFBSSxNQUFNLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFO1FBQ2hDLE9BQU07S0FDVDtJQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUE7SUFDNUIsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3JDLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN2QyxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDdkYsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQTtJQUMzQixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBRW5DLE9BQU8sQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUM5QyxNQUFNLE1BQU0sR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQTtRQUM5QixNQUFNLE1BQU0sR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQTtRQUM5QixNQUFNLFdBQVcsR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFBO1FBQ3RELE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM5QyxJQUFJLFdBQVcsS0FBSyxNQUFNLEVBQUU7WUFDeEIsT0FBTTtTQUNUO1FBRUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDLENBQUMsQ0FBQTtJQUVGLEdBQUcsQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3JELE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO0lBRXBCLDhEQUE4RDtJQUM5RCxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNoRCxHQUFHLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0tBQzlDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIlxyXG5pbXBvcnQgKiBhcyBpbWFnaW5nIGZyb20gXCIuLi9zaGFyZWQvaW1hZ2luZy5qc1wiXHJcbmltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcblxyXG5lbnVtIENhbWVyYU1vZGUge1xyXG4gICAgTm9uZSxcclxuICAgIFVzZXIsXHJcbiAgICBFbnZpcm9ubWVudCxcclxufVxyXG5cclxuaW50ZXJmYWNlIEJvdW5kcyB7XHJcbiAgICBtaW5YOiBudW1iZXJcclxuICAgIG1heFg6IG51bWJlclxyXG4gICAgbWluWTogbnVtYmVyXHJcbiAgICBtYXhZOiBudW1iZXJcclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY1dpZHRoKGJvdW5kczogQm91bmRzKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBib3VuZHMubWF4WCAtIGJvdW5kcy5taW5YICsgMVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjSGVpZ2h0KGJvdW5kczogQm91bmRzKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBib3VuZHMubWF4WSAtIGJvdW5kcy5taW5ZICsgMVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjQXJlYShib3VuZHM6IEJvdW5kcyk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gY2FsY1dpZHRoKGJvdW5kcykgKiBjYWxjSGVpZ2h0KGJvdW5kcylcclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY0NlbnRlcihib3VuZHM6IEJvdW5kcyk6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgcmV0dXJuIFtcclxuICAgICAgICBib3VuZHMubWluWCArIGNhbGNXaWR0aChib3VuZHMpIC8gMixcclxuICAgICAgICBib3VuZHMubWluWSArIGNhbGNIZWlnaHQoYm91bmRzKSAvIDJcclxuICAgIF1cclxufVxyXG5cclxuaW50ZXJmYWNlIFJlZ2lvbiB7XHJcbiAgICBjb2xvcjogbnVtYmVyXHJcbiAgICBwaXhlbHM6IG51bWJlclxyXG4gICAgYm91bmRzOiBCb3VuZHNcclxuICAgIG1heFJlY3Q6IEJvdW5kc1xyXG4gICAgZmlsbGVkOiBib29sZWFuXHJcbn1cclxuXHJcbnR5cGUgUmVnaW9uT3ZlcmxheSA9IChSZWdpb24gfCBudWxsKVtdXHJcblxyXG5pbnRlcmZhY2UgUGxheVN0YXRlIHtcclxuICAgIGltYWdlRGF0YTogSW1hZ2VEYXRhXHJcbiAgICBwYWxldHRlOiBpbWFnaW5nLkNvbG9yW11cclxuICAgIHJlZ2lvbnM6IFJlZ2lvbltdXHJcbiAgICByZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5XHJcbn1cclxuXHJcbmNvbnN0IGNhbWVyYSA9IGRvbS5ieUlkKFwiY2FtZXJhXCIpIGFzIEhUTUxWaWRlb0VsZW1lbnRcclxubGV0IGNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLk5vbmVcclxuY29uc3QgY2FudmFzID0gZG9tLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuY29uc3QgYWNxdWlyZUltYWdlRGl2ID0gZG9tLmJ5SWQoXCJhY3F1aXJlSW1hZ2VcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuY29uc3QgcGFsZXR0ZURpdiA9IGRvbS5ieUlkKFwicGFsZXR0ZVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5jb25zdCBwYWxldHRlRW50cnlUZW1wbGF0ZSA9IGRvbS5ieUlkKFwicGFsZXR0ZUVudHJ5XCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuXHJcbmNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikgYXMgQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEXHJcbmlmICghY3R4KSB7XHJcbiAgICB0aHJvd0Vycm9yTWVzc2FnZShcIkNhbnZhcyBlbGVtZW50IG5vdCBzdXBwb3J0ZWRcIilcclxufVxyXG5cclxuY29uc3QgY2FwdHVyZUltYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJjYXB0dXJlSW1hZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuY29uc3QgbG9hZFVpID0gZG9tLmJ5SWQoXCJsb2FkVWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuY29uc3QgcGxheVVpID0gZG9tLmJ5SWQoXCJwbGF5VWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuXHJcbmxldCBwbGF5U3RhdGU6IFBsYXlTdGF0ZSB8IG51bGwgPSBudWxsXHJcblxyXG5pbml0KClcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICBjb25zdCBmaWxlRHJvcEJveCA9IGRvbS5ieUlkKFwiZmlsZURyb3BCb3hcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIGNvbnN0IGZpbGVJbnB1dCA9IGRvbS5ieUlkKFwiZmlsZUlucHV0XCIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcclxuICAgIGNvbnN0IGZpbGVCdXR0b24gPSBkb20uYnlJZChcImZpbGVCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIGNvbnN0IHVzZUNhbWVyYUJ1dHRvbiA9IGRvbS5ieUlkKFwidXNlQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBjb25zdCBmbGlwQ2FtZXJhQnV0dG9uID0gZG9tLmJ5SWQoXCJmbGlwQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBjb25zdCBzdG9wQ2FtZXJhQnV0dG9uID0gZG9tLmJ5SWQoXCJzdG9wQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBjb25zdCByZXR1cm5CdXR0b24gPSBkb20uYnlJZChcInJldHVybkJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5cclxuICAgIGZpbGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICBmaWxlSW5wdXQuY2xpY2soKVxyXG4gICAgfSlcclxuXHJcbiAgICBmaWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2VudGVyXCIsIG9uRHJhZ0VudGVyT3ZlcilcclxuICAgIGZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnb3ZlclwiLCBvbkRyYWdFbnRlck92ZXIpXHJcbiAgICBmaWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJvcFwiLCBvbkZpbGVEcm9wKVxyXG5cclxuICAgIGZpbGVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHtcclxuICAgICAgICBpZiAoIWZpbGVJbnB1dC5maWxlcz8ubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZmlsZSA9IGZpbGVJbnB1dC5maWxlc1swXVxyXG4gICAgICAgIHByb2Nlc3NGaWxlKGZpbGUpXHJcbiAgICB9KVxyXG5cclxuICAgIHVzZUNhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgdXNlQ2FtZXJhKVxyXG4gICAgZmxpcENhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZmxpcENhbWVyYSlcclxuICAgIHN0b3BDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHN0b3BDYW1lcmEpXHJcbiAgICBjYXB0dXJlSW1hZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNhcHR1cmVJbWFnZSlcclxuICAgIHJldHVybkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgc2hvd0xvYWRVaSlcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgb25DYW52YXNDbGljaylcclxufVxyXG5cclxuZnVuY3Rpb24gb25EcmFnRW50ZXJPdmVyKGV2OiBEcmFnRXZlbnQpIHtcclxuICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICBldi5wcmV2ZW50RGVmYXVsdCgpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9uRmlsZURyb3AoZXY6IERyYWdFdmVudCkge1xyXG4gICAgZXYuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxuXHJcbiAgICBpZiAoIWV2Py5kYXRhVHJhbnNmZXI/LmZpbGVzPy5sZW5ndGgpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmaWxlID0gZXYuZGF0YVRyYW5zZmVyLmZpbGVzWzBdXHJcbiAgICBwcm9jZXNzRmlsZShmaWxlKVxyXG59XHJcblxyXG5mdW5jdGlvbiBwcm9jZXNzRmlsZShmaWxlOiBGaWxlKSB7XHJcbiAgICBjbGVhckVycm9yTWVzc2FnZXMoKVxyXG4gICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKVxyXG4gICAgbG9hZEZyb21VcmwodXJsKVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkRnJvbVVybCh1cmw6IHN0cmluZykge1xyXG4gICAgY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuICAgIGNvbnN0IGltZyA9IG5ldyBJbWFnZSgpXHJcbiAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgKCkgPT4ge1xyXG4gICAgICAgIHBsYXlTdGF0ZSA9IHNob3dQbGF5VWkoaW1nLCBpbWcud2lkdGgsIGltZy5oZWlnaHQpXHJcbiAgICB9KVxyXG5cclxuICAgIGltZy5zcmMgPSB1cmxcclxufVxyXG5cclxuZnVuY3Rpb24gY2xlYXJFcnJvck1lc3NhZ2VzKCkge1xyXG4gICAgY29uc3QgZXJyb3JzRGl2ID0gZG9tLmJ5SWQoXCJlcnJvcnNcIilcclxuICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbihlcnJvcnNEaXYpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFwcGVuZEVycm9yTWVzc2FnZShlcnJvcjogc3RyaW5nKSB7XHJcbiAgICBjb25zdCBlcnJvcnNEaXYgPSBkb20uYnlJZChcImVycm9yc1wiKTtcclxuICAgIGNvbnN0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICBkaXYuY2xhc3NMaXN0LmFkZChcImVycm9yLW1lc3NhZ2VcIilcclxuICAgIGRpdi50ZXh0Q29udGVudCA9IGVycm9yXHJcbiAgICBlcnJvcnNEaXYuYXBwZW5kQ2hpbGQoZGl2KVxyXG59XHJcblxyXG5mdW5jdGlvbiB0aHJvd0Vycm9yTWVzc2FnZShlcnJvcjogc3RyaW5nKSB7XHJcbiAgICBhcHBlbmRFcnJvck1lc3NhZ2UoZXJyb3IpXHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3IpXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHVzZUNhbWVyYSgpIHtcclxuICAgIGFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgY29uc3QgZGlhbG9nV2lkdGggPSBhY3F1aXJlSW1hZ2VEaXYuY2xpZW50V2lkdGhcclxuICAgIGNvbnN0IGRpYWxvZ0hlaWdodCA9IGFjcXVpcmVJbWFnZURpdi5jbGllbnRIZWlnaHRcclxuICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcclxuICAgICAgICB2aWRlbzogeyB3aWR0aDogeyBtYXg6IGRpYWxvZ1dpZHRoIH0sIGhlaWdodDogeyBtYXg6IGRpYWxvZ0hlaWdodCB9LCBmYWNpbmdNb2RlOiBcInVzZXJcIiB9LFxyXG4gICAgICAgIGF1ZGlvOiBmYWxzZVxyXG4gICAgfSlcclxuXHJcbiAgICBjYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Vc2VyXHJcbiAgICBjYW1lcmEuc3JjT2JqZWN0ID0gc3RyZWFtXHJcbiAgICBjYW1lcmEuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZG1ldGFkYXRhXCIsIG9uQ2FtZXJhTG9hZClcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZmxpcENhbWVyYSgpIHtcclxuICAgIGlmICghY2FtZXJhLnNyY09iamVjdCkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHNyYyA9IGNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgIGNvbnN0IHRyYWNrcyA9IHNyYy5nZXRUcmFja3MoKVxyXG4gICAgZm9yIChjb25zdCB0cmFjayBvZiB0cmFja3MpIHtcclxuICAgICAgICB0cmFjay5zdG9wKClcclxuICAgIH1cclxuXHJcbiAgICBjYW1lcmFNb2RlID0gY2FtZXJhTW9kZSA9PSBDYW1lcmFNb2RlLlVzZXIgPyBDYW1lcmFNb2RlLkVudmlyb25tZW50IDogQ2FtZXJhTW9kZS5Vc2VyXHJcbiAgICBjb25zdCBmYWNpbmdNb2RlID0gY2FtZXJhTW9kZSA9PSBDYW1lcmFNb2RlLlVzZXIgPyBcInVzZXJcIiA6IFwiZW52aXJvbm1lbnRcIlxyXG5cclxuICAgIC8vIGdldCBjdXJyZW50IGZhY2luZyBtb2RlXHJcbiAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7XHJcbiAgICAgICAgdmlkZW86IHsgd2lkdGg6IGNhbWVyYS5jbGllbnRXaWR0aCwgaGVpZ2h0OiBjYW1lcmEuY2xpZW50SGVpZ2h0LCBmYWNpbmdNb2RlOiBmYWNpbmdNb2RlIH0sXHJcbiAgICAgICAgYXVkaW86IGZhbHNlXHJcbiAgICB9KVxyXG5cclxuICAgIGNhbWVyYS5zcmNPYmplY3QgPSBzdHJlYW1cclxuICAgIGNhbWVyYS5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkbWV0YWRhdGFcIiwgb25DYW1lcmFMb2FkKVxyXG59XHJcblxyXG5mdW5jdGlvbiBvbkNhbWVyYUxvYWQoKSB7XHJcbiAgICBhY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgIGNhbWVyYS5wbGF5KClcclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN0b3BDYW1lcmEoKSB7XHJcbiAgICBjb25zdCBzcmMgPSBjYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICBpZiAoIXNyYykge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHRyYWNrcyA9IHNyYy5nZXRUcmFja3MoKVxyXG4gICAgZm9yIChjb25zdCB0cmFjayBvZiB0cmFja3MpIHtcclxuICAgICAgICB0cmFjay5zdG9wKClcclxuICAgIH1cclxuXHJcbiAgICBjYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Ob25lXHJcbiAgICBhY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYXB0dXJlSW1hZ2UoKSB7XHJcbiAgICBjbGVhckVycm9yTWVzc2FnZXMoKVxyXG5cclxuICAgIGNvbnN0IHNyYyA9IGNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgIGlmICghc3JjKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdHJhY2sgPSBzcmMuZ2V0VmlkZW9UcmFja3MoKVswXVxyXG4gICAgaWYgKCF0cmFjaykge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIHBsYXlTdGF0ZSA9IHNob3dQbGF5VWkoY2FtZXJhLCBjYW1lcmEudmlkZW9XaWR0aCwgY2FtZXJhLnZpZGVvSGVpZ2h0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2hvd1BsYXlVaShpbWc6IENhbnZhc0ltYWdlU291cmNlLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFBsYXlTdGF0ZSB7XHJcbiAgICAvLyBtYWludGFpbiBhc3BlY3QgcmF0aW8hXHJcbiAgICBjb25zdCB2dyA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aFxyXG4gICAgY29uc3QgdmggPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0XHJcblxyXG4gICAgaWYgKHZ3IDwgdmgpIHtcclxuICAgICAgICBjYW52YXMud2lkdGggPSB2d1xyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSB2dyAqIGhlaWdodCAvIHdpZHRoXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSB2aFxyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHZoICogd2lkdGggLyBoZWlnaHRcclxuICAgIH1cclxuXHJcbiAgICBsb2FkVWkuaGlkZGVuID0gdHJ1ZVxyXG4gICAgcGxheVVpLmhpZGRlbiA9IGZhbHNlXHJcblxyXG4gICAgY3R4LmRyYXdJbWFnZShpbWcsIDAsIDAsIGNhbnZhcy5jbGllbnRXaWR0aCwgY2FudmFzLmNsaWVudEhlaWdodClcclxuICAgIGNvbnN0IHBsYXlTdGF0ZSA9IHByb2Nlc3NJbWFnZSgpXHJcbiAgICByZXR1cm4gcGxheVN0YXRlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3dMb2FkVWkoKSB7XHJcbiAgICBwbGF5U3RhdGUgPSBudWxsXHJcbiAgICBsb2FkVWkuaGlkZGVuID0gZmFsc2VcclxuICAgIHBsYXlVaS5oaWRkZW4gPSB0cnVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByb2Nlc3NJbWFnZSgpOiBQbGF5U3RhdGUge1xyXG4gICAgLy8gZ2V0IChmbGF0KSBpbWFnZSBkYXRhIGZyb20gY2FudmFzXHJcbiAgICBjb25zdCBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodClcclxuICAgIGNvbnN0IGluaXRpYWxJbWFnZURhdGEgPSBpbWFnaW5nLmNvcHlJbWFnZURhdGEoaW1hZ2VEYXRhKVxyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBpbWFnZURhdGFcclxuXHJcbiAgICAvLyBjb252ZXJ0IHRvIHh5eiBjb2xvcnMgYW5kIHBhbGV0dGl6ZSBkYXRhXHJcbiAgICBsZXQgW3BhbGV0dGUsIHBhbGV0dGVPdmVybGF5XSA9IHBhbGV0dGl6ZShpbWFnZURhdGEsIDMsIDgpXHJcbiAgICBpbWFnaW5nLmFwcGx5UGFsZXR0ZShwYWxldHRlLCBwYWxldHRlT3ZlcmxheSwgaW1hZ2VEYXRhKVxyXG5cclxuICAgIGN0eC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKVxyXG4gICAgbGV0IFtyZWdpb25zLCByZWdpb25PdmVybGF5XSA9IGNyZWF0ZVJlZ2lvbk92ZXJsYXkod2lkdGgsIGhlaWdodCwgcGFsZXR0ZU92ZXJsYXkpXHJcbiAgICByZWdpb25zID0gcHJ1bmVSZWdpb25zKHdpZHRoLCBoZWlnaHQsIHJlZ2lvbnMsIHJlZ2lvbk92ZXJsYXkpXHJcbiBcclxuICAgIC8vIHNvbWUgcGFsbGV0dGUgZW50cmllcyB3aWxsIG5vdyBiZSB1bnVzZWQgYnkgcmVnaW9ucywgcmVtb3ZlIHRoZXNlXHJcbiAgICBwYWxldHRlID0gcmVtb3ZlVW51c2VkUGFsZXR0ZUVudHJpZXMocGFsZXR0ZSwgcmVnaW9ucylcclxuXHJcbiAgICBkcmF3Qm9yZGVycyhyZWdpb25PdmVybGF5LCBpbWFnZURhdGEpXHJcbiAgICBmaWxsSW50ZXJpb3IoaW1hZ2VEYXRhLmRhdGEsIHJlZ2lvbk92ZXJsYXkpXHJcbiAgICBjdHgucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMClcclxuICAgIGNyZWF0ZVBhbGV0dGVVaShwYWxldHRlKVxyXG4gICAgZHJhd1JlZ2lvbkxhYmVscyhjdHgsIHJlZ2lvbnMpXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBpbWFnZURhdGE6IGluaXRpYWxJbWFnZURhdGEsXHJcbiAgICAgICAgcGFsZXR0ZTogcGFsZXR0ZSxcclxuICAgICAgICByZWdpb25zOiByZWdpb25zLFxyXG4gICAgICAgIHJlZ2lvbk92ZXJsYXk6IHJlZ2lvbk92ZXJsYXlcclxuICAgIH1cclxufVxyXG5cclxuLy8gc3BlY2lhbGl6ZWQgdG8gaWdub3JlIHdoaXRlXHJcbmZ1bmN0aW9uIHBhbGV0dGl6ZShpbWFnZURhdGE6IEltYWdlRGF0YSwgYnVja2V0c1BlckNvbXBvbmVudDogbnVtYmVyLCBtYXhDb2xvcnM6IG51bWJlcik6IFtpbWFnaW5nLkNvbG9yW10sIG51bWJlcltdXSB7XHJcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQsIGRhdGEgfSA9IGltYWdlRGF0YVxyXG4gICAgY29uc3QgcGl4ZWxzID0gd2lkdGggKiBoZWlnaHRcclxuICAgIGNvbnN0IGJ1Y2tldFBpdGNoID0gYnVja2V0c1BlckNvbXBvbmVudCAqIGJ1Y2tldHNQZXJDb21wb25lbnRcclxuICAgIGNvbnN0IG51bUJ1Y2tldHMgPSBidWNrZXRQaXRjaCAqIGJ1Y2tldHNQZXJDb21wb25lbnRcclxuXHJcbiAgICAvLyBjcmVhdCBpbnRpYWwgYnVja2V0c1xyXG4gICAgbGV0IGJ1Y2tldHMgPSBhcnJheS5nZW5lcmF0ZShudW1CdWNrZXRzLCAoKSA9PiAoeyBjb2xvcjogWzAsIDAsIDBdIGFzIFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSwgcGl4ZWxzOiAwIH0pKVxyXG5cclxuICAgIC8vIGFzc2lnbiBhbmQgdXBkYXRlIGJ1Y2tldCBmb3IgZWFjaCBwaXhlbFxyXG4gICAgY29uc3QgYnVja2V0T3ZlcmxheSA9IGFycmF5LmdlbmVyYXRlKHBpeGVscywgaSA9PiB7XHJcbiAgICAgICAgY29uc3QgciA9IGRhdGFbaSAqIDRdIC8gMjU1XHJcbiAgICAgICAgY29uc3QgZyA9IGRhdGFbaSAqIDQgKyAxXSAvIDI1NVxyXG4gICAgICAgIGNvbnN0IGIgPSBkYXRhW2kgKiA0ICsgMl0gLyAyNTVcclxuXHJcbiAgICAgICAgLy8gaWdub3JlIHdoaXRlXHJcbiAgICAgICAgaWYgKHIgPj0gLjk1ICYmIGcgPj0gLjk1ICYmIGIgPj0gLjk1KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCByYiA9IE1hdGgubWluKE1hdGguZmxvb3IociAqIGJ1Y2tldHNQZXJDb21wb25lbnQpLCBidWNrZXRzUGVyQ29tcG9uZW50IC0gMSlcclxuICAgICAgICBjb25zdCBnYiA9IE1hdGgubWluKE1hdGguZmxvb3IoZyAqIGJ1Y2tldHNQZXJDb21wb25lbnQpLCBidWNrZXRzUGVyQ29tcG9uZW50IC0gMSlcclxuICAgICAgICBjb25zdCBiYiA9IE1hdGgubWluKE1hdGguZmxvb3IoYiAqIGJ1Y2tldHNQZXJDb21wb25lbnQpLCBidWNrZXRzUGVyQ29tcG9uZW50IC0gMSlcclxuXHJcbiAgICAgICAgY29uc3QgYnVja2V0SWR4ID0gcmIgKiBidWNrZXRQaXRjaCArIGdiICogYnVja2V0c1BlckNvbXBvbmVudCArIGJiXHJcbiAgICAgICAgY29uc3QgYnVja2V0ID0gYnVja2V0c1tidWNrZXRJZHhdXHJcbiAgICAgICAgYnVja2V0LmNvbG9yID0gaW1hZ2luZy5hZGRYWVooW3IsIGcsIGJdLCBidWNrZXQuY29sb3IpXHJcbiAgICAgICAgYnVja2V0LnBpeGVscysrXHJcbiAgICAgICAgcmV0dXJuIGJ1Y2tldFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBwcnVuZSBlbXB0eSBidWNrZXRzXHJcbiAgICBidWNrZXRzID0gYnVja2V0cy5maWx0ZXIoYiA9PiBiLnBpeGVscyA+IDApXHJcblxyXG4gICAgLy8gY2FsY3VsYXRlIGJ1Y2tldCBjb2xvcnNcclxuICAgIGZvciAoY29uc3QgYnVja2V0IG9mIGJ1Y2tldHMpIHtcclxuICAgICAgICBidWNrZXQuY29sb3IgPSBpbWFnaW5nLmRpdlhZWihidWNrZXQuY29sb3IsIGJ1Y2tldC5waXhlbHMpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gY29tYmluZSBidWNrZXRzIHRoYXQgYXJlIHZlcnkgY2xvc2UgaW4gY29sb3IgYWZ0ZXIgY29sb3IgYXZlcmFnaW5nXHJcbiAgICBsZXQgYnVja2V0U2V0ID0gbmV3IFNldChidWNrZXRzKVxyXG4gICAgd2hpbGUgKGJ1Y2tldFNldC5zaXplID4gMSkge1xyXG4gICAgICAgIC8vIHByb2NlZWQgZm9yIGFzIGxvbmcgYXMgYnVja2V0cyBjYW4gYmUgY29tYmluZWRcclxuICAgICAgICBsZXQgbWVyZ2UgPSBmYWxzZVxyXG4gICAgICAgIGZvciAoY29uc3QgYnVja2V0IG9mIGJ1Y2tldFNldCkge1xyXG4gICAgICAgICAgICAvLyBmaW5kIFwibmVhcmVzdFwiIGNvbG9yXHJcbiAgICAgICAgICAgIGNvbnN0IG5lYXJlc3QgPSBbLi4uYnVja2V0U2V0XVxyXG4gICAgICAgICAgICAgICAgLmZpbHRlcihiID0+IGIgIT0gYnVja2V0KVxyXG4gICAgICAgICAgICAgICAgLnJlZHVjZSgoYjEsIGIyKSA9PiBpbWFnaW5nLmNhbGNEaXN0U3EoYnVja2V0LmNvbG9yLCBiMS5jb2xvcikgPCBpbWFnaW5nLmNhbGNEaXN0U3EoYnVja2V0LmNvbG9yLCBiMi5jb2xvcikgPyBiMSA6IGIyKVxyXG5cclxuICAgICAgICAgICAgY29uc3QgZGlzdCA9IGltYWdpbmcuY2FsY0Rpc3QoYnVja2V0LmNvbG9yLCBuZWFyZXN0LmNvbG9yKVxyXG4gICAgICAgICAgICBpZiAoZGlzdCA+IC4xKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBtZXJnZSB0aGUgYnVja2V0c1xyXG4gICAgICAgICAgICBidWNrZXQuY29sb3IgPSBpbWFnaW5nLmRpdlhZWihcclxuICAgICAgICAgICAgICAgIGltYWdpbmcuYWRkWFlaKGltYWdpbmcubXVsWFlaKGJ1Y2tldC5jb2xvciwgYnVja2V0LnBpeGVscyksIGltYWdpbmcubXVsWFlaKG5lYXJlc3QuY29sb3IsIG5lYXJlc3QucGl4ZWxzKSksXHJcbiAgICAgICAgICAgICAgICBidWNrZXQucGl4ZWxzICsgbmVhcmVzdC5waXhlbHMpXHJcblxyXG4gICAgICAgICAgICBidWNrZXRTZXQuZGVsZXRlKG5lYXJlc3QpXHJcbiAgICAgICAgICAgIG1lcmdlID0gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFtZXJnZSkge1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBidWNrZXRzID0gWy4uLmJ1Y2tldFNldF1cclxuICAgICAgICAuc29ydCgoYjEsIGIyKSA9PiBiMi5waXhlbHMgLSBiMS5waXhlbHMpXHJcbiAgICAgICAgLnNsaWNlKDAsIG1heENvbG9ycylcclxuXHJcbiAgICAvLyBtYXAgYWxsIGNvbG9ycyB0byB0b3AgTiBidWNrZXRzXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJ1Y2tldE92ZXJsYXkubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAvLyBvdGhlcndpc2UsIG1hcCB0byBuZXcgYnVja2V0XHJcbiAgICAgICAgY29uc3QgciA9IGRhdGFbaSAqIDRdIC8gMjU1XHJcbiAgICAgICAgY29uc3QgZyA9IGRhdGFbaSAqIDQgKyAxXSAvIDI1NVxyXG4gICAgICAgIGNvbnN0IGIgPSBkYXRhW2kgKiA0ICsgMl0gLyAyNTVcclxuXHJcbiAgICAgICAgaWYgKHIgPj0gLjk1ICYmIGcgPj0gLjk1ICYmIGIgPj0gLjk1KSB7XHJcbiAgICAgICAgICAgIGJ1Y2tldE92ZXJsYXlbaV0gPSBudWxsXHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb2xvcjogW251bWJlciwgbnVtYmVyLCBudW1iZXJdID0gW3IsIGcsIGJdXHJcbiAgICAgICAgY29uc3QgYnVja2V0ID0gYnVja2V0cy5yZWR1Y2UoKGIxLCBiMikgPT4gaW1hZ2luZy5jYWxjRGlzdFNxKGIxLmNvbG9yLCBjb2xvcikgPCBpbWFnaW5nLmNhbGNEaXN0U3EoYjIuY29sb3IsIGNvbG9yKSA/IGIxIDogYjIpXHJcbiAgICAgICAgYnVja2V0T3ZlcmxheVtpXSA9IGJ1Y2tldFxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRldGVybWluZSBwYWxldHRlIGNvbG9yc1xyXG4gICAgY29uc3QgcGFsZXR0ZSA9IGJ1Y2tldHMubWFwKGIgPT4gaW1hZ2luZy5tdWxYWVooYi5jb2xvciwgMjU1KSlcclxuICAgIGNvbnN0IHBhbGV0dGVPdmVybGF5ID0gYnVja2V0T3ZlcmxheS5tYXAoYiA9PiBiID8gYnVja2V0cy5pbmRleE9mKGIpIDogLTEpXHJcbiAgICByZXR1cm4gW3BhbGV0dGUsIHBhbGV0dGVPdmVybGF5XVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVSZWdpb25PdmVybGF5KHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBwYWxldHRlT3ZlcmxheTogbnVtYmVyW10pOiBbUmVnaW9uW10sIFJlZ2lvbk92ZXJsYXldIHtcclxuICAgIGNvbnN0IHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkgPSBhcnJheS51bmlmb3JtKG51bGwsIHdpZHRoICogaGVpZ2h0KVxyXG4gICAgY29uc3QgcmVnaW9uczogUmVnaW9uW10gPSBbXVxyXG5cclxuICAgIGltYWdpbmcuc2Nhbih3aWR0aCwgaGVpZ2h0LCAoeCwgeSwgb2Zmc2V0KSA9PiB7XHJcbiAgICAgICAgaWYgKHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHJlZ2lvbjogUmVnaW9uID0ge1xyXG4gICAgICAgICAgICBjb2xvcjogcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0XSxcclxuICAgICAgICAgICAgcGl4ZWxzOiAwLFxyXG4gICAgICAgICAgICBib3VuZHM6IHtcclxuICAgICAgICAgICAgICAgIG1pblg6IEluZmluaXR5LFxyXG4gICAgICAgICAgICAgICAgbWF4WDogLTEsXHJcbiAgICAgICAgICAgICAgICBtaW5ZOiBJbmZpbml0eSxcclxuICAgICAgICAgICAgICAgIG1heFk6IC0xXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG1heFJlY3Q6IHtcclxuICAgICAgICAgICAgICAgIG1pblg6IEluZmluaXR5LFxyXG4gICAgICAgICAgICAgICAgbWF4WDogLTEsXHJcbiAgICAgICAgICAgICAgICBtaW5ZOiBJbmZpbml0eSxcclxuICAgICAgICAgICAgICAgIG1heFk6IC0xXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGZpbGxlZDogZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9IHJlZ2lvblxyXG4gICAgICAgIHJlZ2lvbnMucHVzaChyZWdpb24pXHJcbiAgICAgICAgZXhwbG9yZVJlZ2lvbih3aWR0aCwgaGVpZ2h0LCBwYWxldHRlT3ZlcmxheSwgeCwgeSwgcmVnaW9uT3ZlcmxheSlcclxuICAgIH0pXHJcblxyXG4gICAgLy8gcHJ1bmUgc29tZSByZWdpb25zXHJcbiAgICByZXR1cm4gW3JlZ2lvbnMsIHJlZ2lvbk92ZXJsYXldXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBydW5lUmVnaW9ucyh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcmVnaW9uczogUmVnaW9uW10sIHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkpOiBSZWdpb25bXSB7XHJcbiAgICBjb25zdCByZWdpb25TZXQgPSBuZXcgU2V0KHJlZ2lvbnMpXHJcbiAgICBjb25zdCBtaW5SZWdpb25XaWR0aCA9IDEwXHJcbiAgICBjb25zdCBtaW5SZWdpb25IZWlnaHQgPSAxMFxyXG4gICAgY29uc3QgbWluUmVnaW9uUGl4ZWxzID0gbWluUmVnaW9uV2lkdGggKiBtaW5SZWdpb25IZWlnaHRcclxuXHJcbiAgICBmb3IgKGNvbnN0IHJlZ2lvbiBvZiByZWdpb25zKSB7XHJcbiAgICAgICAgaWYgKHJlZ2lvbi5waXhlbHMgPD0gbWluUmVnaW9uUGl4ZWxzKSB7XHJcbiAgICAgICAgICAgIHJlZ2lvblNldC5kZWxldGUocmVnaW9uKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjYWxjUmVnaW9uQm91bmRzKHdpZHRoLCBoZWlnaHQsIHJlZ2lvbk92ZXJsYXkpXHJcbiAgICBmb3IgKGNvbnN0IHJlZ2lvbiBvZiByZWdpb25TZXQpIHtcclxuICAgICAgICBpZiAoY2FsY1dpZHRoKHJlZ2lvbi5ib3VuZHMpIDw9IG1pblJlZ2lvbldpZHRoKSB7XHJcbiAgICAgICAgICAgIHJlZ2lvblNldC5kZWxldGUocmVnaW9uKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGNhbGNIZWlnaHQocmVnaW9uLmJvdW5kcykgPD0gbWluUmVnaW9uSGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHJlZ2lvblNldC5kZWxldGUocmVnaW9uKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBjYWxjdWxhdGUgbWF4aW1hbCByZWMgZm9yIGVhY2ggcmVnaW9uXHJcbiAgICBmb3IgKGNvbnN0IHJlZ2lvbiBvZiByZWdpb25TZXQpIHtcclxuICAgICAgICByZWdpb24ubWF4UmVjdCA9IGNhbGNNYXhSZWdpb25SZWN0KHdpZHRoLCByZWdpb24sIHJlZ2lvbk92ZXJsYXkpXHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCByZWdpb24gb2YgcmVnaW9uU2V0KSB7XHJcbiAgICAgICAgaWYgKGNhbGNXaWR0aChyZWdpb24ubWF4UmVjdCkgPCBtaW5SZWdpb25XaWR0aCkge1xyXG4gICAgICAgICAgICByZWdpb25TZXQuZGVsZXRlKHJlZ2lvbilcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChjYWxjSGVpZ2h0KHJlZ2lvbi5tYXhSZWN0KSA8IG1pblJlZ2lvbkhlaWdodCkge1xyXG4gICAgICAgICAgICByZWdpb25TZXQuZGVsZXRlKHJlZ2lvbilcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gdXBkYXRlIHRoZSBvdmVybGF5XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlZ2lvbk92ZXJsYXkubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCByZWdpb24gPSByZWdpb25PdmVybGF5W2ldXHJcbiAgICAgICAgaWYgKCFyZWdpb24pIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghcmVnaW9uU2V0LmhhcyhyZWdpb24pKSB7XHJcbiAgICAgICAgICAgIHJlZ2lvbk92ZXJsYXlbaV0gPSBudWxsXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBbLi4ucmVnaW9uU2V0XVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVVbnVzZWRQYWxldHRlRW50cmllcyhwYWxldHRlOiBpbWFnaW5nLkNvbG9yW10sIHJlZ2lvbnM6IFJlZ2lvbltdKTogaW1hZ2luZy5Db2xvcltdIHtcclxuICAgIC8vIGNyZWF0ZSBhIG1hcCBmcm9tIGN1cnJlbnQgY29sb3IgaW5kZXggdG8gbmV3IGNvbG9yIGluZGV4XHJcbiAgICBjb25zdCB1c2VkU2V0ID0gbmV3IFNldChyZWdpb25zLm1hcChyID0+IHIuY29sb3IpKVxyXG4gICAgdXNlZFNldC5kZWxldGUoLTEpXHJcbiAgICBjb25zdCB1c2VkID0gWy4uLnVzZWRTZXRdXHJcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPih1c2VkLm1hcCgodSwgaSkgPT4gW3UsIGldKSlcclxuXHJcbiAgICBmb3IgKGNvbnN0IHJlZ2lvbiBvZiByZWdpb25zKSB7XHJcbiAgICAgICAgaWYgKHJlZ2lvbi5jb2xvciA9PT0gLTEpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbG9yID0gbWFwLmdldChyZWdpb24uY29sb3IpXHJcbiAgICAgICAgaWYgKHR5cGVvZiBjb2xvciA9PT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb2xvciBub3QgZm91bmQgaW4gbWFwXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZWdpb24uY29sb3IgPSBjb2xvclxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB1c2VkLm1hcChpID0+IHBhbGV0dGVbaV0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGNSZWdpb25Cb3VuZHMod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkpIHtcclxuICAgIGltYWdpbmcuc2Nhbih3aWR0aCwgaGVpZ2h0LCAoeCwgeSwgb2Zmc2V0KSA9PiB7XHJcbiAgICAgICAgY29uc3QgcmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXRdXHJcbiAgICAgICAgaWYgKCFyZWdpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBib3VuZHMgPSByZWdpb24uYm91bmRzXHJcbiAgICAgICAgYm91bmRzLm1pblggPSBNYXRoLm1pbihib3VuZHMubWluWCwgeClcclxuICAgICAgICBib3VuZHMubWF4WCA9IE1hdGgubWF4KGJvdW5kcy5tYXhYLCB4KVxyXG4gICAgICAgIGJvdW5kcy5taW5ZID0gTWF0aC5taW4oYm91bmRzLm1pblksIHkpXHJcbiAgICAgICAgYm91bmRzLm1heFkgPSBNYXRoLm1heChib3VuZHMubWF4WSwgeSlcclxuICAgIH0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGNNYXhSZWdpb25SZWN0KHJvd1BpdGNoOiBudW1iZXIsIHJlZ2lvbjogUmVnaW9uLCByZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5KTogQm91bmRzIHtcclxuICAgIC8vIGRlcml2ZWQgZnJvbSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy83MjQ1L3B1enpsZS1maW5kLWxhcmdlc3QtcmVjdGFuZ2xlLW1heGltYWwtcmVjdGFuZ2xlLXByb2JsZW1cclxuICAgIC8vIGFsZ29yaXRobSBuZWVkcyB0byBrZWVwIHRyYWNrIG9mIHJlY3RhbmdsZSBzdGF0ZSBmb3IgZXZlcnkgY29sdW1uIGZvciBldmVyeSByZWdpb25cclxuICAgIGNvbnN0IHsgbWluWDogeDAsIG1pblk6IHkwLCBtYXhYOiB4MSwgbWF4WTogeTEgfSA9IHJlZ2lvbi5ib3VuZHNcclxuICAgIGNvbnN0IHdpZHRoID0geDEgLSB4MCArIDFcclxuICAgIGNvbnN0IGhlaWdodCA9IHkxIC0geTAgKyAxXHJcbiAgICBjb25zdCBscyA9IGFycmF5LnVuaWZvcm0oeDAsIHdpZHRoKVxyXG4gICAgY29uc3QgcnMgPSBhcnJheS51bmlmb3JtKHgwICsgd2lkdGgsIHdpZHRoKVxyXG4gICAgY29uc3QgaHMgPSBhcnJheS51bmlmb3JtKDAsIHdpZHRoKVxyXG5cclxuICAgIGxldCBtYXhBcmVhID0gMFxyXG4gICAgY29uc3QgYm91bmRzOiBCb3VuZHMgPSB7XHJcbiAgICAgICAgbWluWDogSW5maW5pdHksXHJcbiAgICAgICAgbWF4WDogLTEsXHJcbiAgICAgICAgbWluWTogSW5maW5pdHksXHJcbiAgICAgICAgbWF4WTogLTEsXHJcbiAgICB9XHJcblxyXG4gICAgaW1hZ2luZy5zY2FuUm93c1JlZ2lvbih5MCwgaGVpZ2h0LCByb3dQaXRjaCwgKHksIHlPZmZzZXQpID0+IHtcclxuICAgICAgICBsZXQgbCA9IHgwXHJcbiAgICAgICAgbGV0IHIgPSB4MCArIHdpZHRoXHJcblxyXG4gICAgICAgIC8vIGhlaWdodCBzY2FuXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IHgwOyB4IDwgeDE7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCBpID0geCAtIHgwXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGNvbnN0IGlzUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXRdID09PSByZWdpb25cclxuXHJcbiAgICAgICAgICAgIGlmIChpc1JlZ2lvbikge1xyXG4gICAgICAgICAgICAgICAgaHNbaV0gKz0gMVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaHNbaV0gPSAwXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGwgc2NhblxyXG4gICAgICAgIGZvciAobGV0IHggPSB4MDsgeCA8IHgxOyArK3gpIHtcclxuICAgICAgICAgICAgY29uc3QgaSA9IHggLSB4MFxyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgICAgICBjb25zdCBpc1JlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9PT0gcmVnaW9uXHJcblxyXG4gICAgICAgICAgICBpZiAoaXNSZWdpb24pIHtcclxuICAgICAgICAgICAgICAgIGxzW2ldID0gTWF0aC5tYXgobHNbaV0sIGwpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsc1tpXSA9IDBcclxuICAgICAgICAgICAgICAgIGwgPSB4ICsgMVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyByIHNjYW5cclxuICAgICAgICBmb3IgKGxldCB4ID0geDEgLSAxOyB4ID49IHgwOyAtLXgpIHtcclxuICAgICAgICAgICAgY29uc3QgaSA9IHggLSB4MFxyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgICAgICBjb25zdCBpc1JlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9PT0gcmVnaW9uXHJcblxyXG4gICAgICAgICAgICBpZiAoaXNSZWdpb24pIHtcclxuICAgICAgICAgICAgICAgIHJzW2ldID0gTWF0aC5taW4ocnNbaV0sIHIpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByc1tpXSA9IHgxXHJcbiAgICAgICAgICAgICAgICByID0geFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhcmVhIHNjYW5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHdpZHRoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgYXJlYSA9IGhzW2ldICogKHJzW2ldIC0gbHNbaV0pXHJcbiAgICAgICAgICAgIGlmIChhcmVhID4gbWF4QXJlYSkge1xyXG4gICAgICAgICAgICAgICAgbWF4QXJlYSA9IGFyZWFcclxuICAgICAgICAgICAgICAgIGJvdW5kcy5taW5YID0gbHNbaV1cclxuICAgICAgICAgICAgICAgIGJvdW5kcy5tYXhYID0gcnNbaV1cclxuICAgICAgICAgICAgICAgIGJvdW5kcy5taW5ZID0geSAtIGhzW2ldXHJcbiAgICAgICAgICAgICAgICBib3VuZHMubWF4WSA9IHlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pXHJcblxyXG4gICAgcmV0dXJuIGJvdW5kc1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHBsb3JlUmVnaW9uKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBwYWxldHRlT3ZlcmxheTogbnVtYmVyW10sIHgwOiBudW1iZXIsIHkwOiBudW1iZXIsIHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkpIHtcclxuICAgIGNvbnN0IHN0YWNrOiBudW1iZXJbXSA9IFtdXHJcbiAgICBjb25zdCBvZmZzZXQwID0geTAgKiB3aWR0aCArIHgwXHJcbiAgICBjb25zdCByZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldDBdXHJcbiAgICBpZiAoIXJlZ2lvbikge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNvbG9yID0gcmVnaW9uLmNvbG9yXHJcblxyXG4gICAgc3RhY2sucHVzaCh4MClcclxuICAgIHN0YWNrLnB1c2goeTApXHJcblxyXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjb25zdCB5ID0gc3RhY2sucG9wKCkgYXMgbnVtYmVyXHJcbiAgICAgICAgY29uc3QgeCA9IHN0YWNrLnBvcCgpIGFzIG51bWJlclxyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHkgKiB3aWR0aCArIHhcclxuICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSByZWdpb25cclxuICAgICAgICByZWdpb24ucGl4ZWxzKytcclxuXHJcbiAgICAgICAgLy8gZXhwbG9yZSBuZWlnaGJvcnMgKGlmIHNhbWUgY29sb3IpXHJcbiAgICAgICAgY29uc3QgbCA9IHggLSAxXHJcbiAgICAgICAgY29uc3QgciA9IHggKyAxXHJcbiAgICAgICAgY29uc3QgdCA9IHkgLSAxXHJcbiAgICAgICAgY29uc3QgYiA9IHkgKyAxXHJcblxyXG4gICAgICAgIGlmIChsID49IDApIHtcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0MSA9IG9mZnNldCAtIDFcclxuICAgICAgICAgICAgY29uc3QgcmVnaW9uMSA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgY29uc3QgY29sb3IxID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgaWYgKCFyZWdpb24xICYmIGNvbG9yID09PSBjb2xvcjEpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2gobClcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHIgPCB3aWR0aCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQxID0gb2Zmc2V0ICsgMVxyXG4gICAgICAgICAgICBjb25zdCByZWdpb24xID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBjb25zdCBjb2xvcjEgPSBwYWxldHRlT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBpZiAoIXJlZ2lvbjEgJiYgY29sb3IgPT09IGNvbG9yMSkge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaChyKVxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh5KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodCA+PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldDEgPSBvZmZzZXQgLSB3aWR0aFxyXG4gICAgICAgICAgICBjb25zdCByZWdpb24xID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBjb25zdCBjb2xvcjEgPSBwYWxldHRlT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBpZiAoIXJlZ2lvbjEgJiYgY29sb3IgPT09IGNvbG9yMSkge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh4KVxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh0KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYiA8IGhlaWdodCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQxID0gb2Zmc2V0ICsgd2lkdGhcclxuICAgICAgICAgICAgY29uc3QgcmVnaW9uMSA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgY29uc3QgY29sb3IxID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgaWYgKCFyZWdpb24xICYmIGNvbG9yID09PSBjb2xvcjEpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeClcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goYilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0JvcmRlcnMocmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSwgaW1hZ2VEYXRhOiBJbWFnZURhdGEpIHtcclxuICAgIC8vIGNvbG9yIGJvcmRlcnNcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgZGF0YSB9ID0gaW1hZ2VEYXRhXHJcbiAgICBpbWFnaW5nLnNjYW5JbWFnZURhdGEoaW1hZ2VEYXRhLCAoeCwgeSwgb2Zmc2V0KSA9PiB7XHJcbiAgICAgICAgY29uc3QgcmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXRdXHJcbiAgICAgICAgaWYgKCFyZWdpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBsID0geCAtIDFcclxuICAgICAgICBjb25zdCByID0geCArIDFcclxuICAgICAgICBjb25zdCB0ID0geSAtIDFcclxuICAgICAgICBjb25zdCBiID0geSArIDFcclxuXHJcbiAgICAgICAgLy8gZWRnZSBjZWxscyBhcmUgbm90IGJvcmRlciAoZm9yIG5vdylcclxuICAgICAgICBpZiAobCA8IDAgfHwgciA+PSB3aWR0aCB8fCB0IDwgMCB8fCBiID49IGhlaWdodCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGxSZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldCAtIDFdXHJcbiAgICAgICAgaWYgKGxSZWdpb24gJiYgbFJlZ2lvbiAhPT0gcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNF0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDFdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAyXSA9IDBcclxuICAgICAgICAgICAgcmVnaW9uT3ZlcmxheVtvZmZzZXRdID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgclJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0ICsgMV1cclxuICAgICAgICBpZiAoclJlZ2lvbiAmJiByUmVnaW9uICE9PSByZWdpb24pIHtcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0XSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMV0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDJdID0gMFxyXG4gICAgICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB0UmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQgLSB3aWR0aF1cclxuICAgICAgICBpZiAodFJlZ2lvbiAmJiB0UmVnaW9uICE9PSByZWdpb24pIHtcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0XSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMV0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDJdID0gMFxyXG4gICAgICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBiUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQgKyB3aWR0aF1cclxuICAgICAgICBpZiAoYlJlZ2lvbiAmJiBiUmVnaW9uICE9PSByZWdpb24pIHtcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0XSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMV0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDJdID0gMFxyXG4gICAgICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSBudWxsXHJcbiAgICAgICAgfVxyXG4gICAgfSlcclxufVxyXG5cclxuZnVuY3Rpb24gZmlsbEludGVyaW9yKGRhdGE6IFVpbnQ4Q2xhbXBlZEFycmF5LCByZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5KSB7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlZ2lvbk92ZXJsYXkubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCByZWdpb24gPSByZWdpb25PdmVybGF5W2ldXHJcbiAgICAgICAgaWYgKCFyZWdpb24pIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRhdGFbaSAqIDRdID0gMjU1XHJcbiAgICAgICAgZGF0YVtpICogNCArIDFdID0gMjU1XHJcbiAgICAgICAgZGF0YVtpICogNCArIDJdID0gMjU1XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVBhbGV0dGVVaShwYWxldHRlOiBpbWFnaW5nLkNvbG9yW10pIHtcclxuICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbihwYWxldHRlRGl2KVxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYWxldHRlLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgY29sb3IgPSBwYWxldHRlW2ldXHJcbiAgICAgICAgY29uc3QgbHVtID0gaW1hZ2luZy5jYWxjTHVtaW5hbmNlKGNvbG9yKVxyXG4gICAgICAgIGNvbnN0IGZyYWdtZW50ID0gcGFsZXR0ZUVudHJ5VGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgIGNvbnN0IGVudHJ5RGl2ID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLnBhbGV0dGUtZW50cnlcIikgYXMgSFRNTEVsZW1lbnRcclxuICAgICAgICBlbnRyeURpdi50ZXh0Q29udGVudCA9IGAke2kgKyAxfWBcclxuICAgICAgICBlbnRyeURpdi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBgcmdiKCR7Y29sb3JbMF19LCAke2NvbG9yWzFdfSwgJHtjb2xvclsyXX0pYFxyXG4gICAgICAgIGVudHJ5RGl2LnN0eWxlLmNvbG9yID0gbHVtIDwgLjUgPyBcIndoaXRlXCIgOiBcImJsYWNrXCJcclxuICAgICAgICBwYWxldHRlRGl2LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3UmVnaW9uTGFiZWxzKGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCByZWdpb25zOiBSZWdpb25bXSkge1xyXG4gICAgY3R4LmZvbnQgPSBcIjE2cHggYXJpYWwgYm9sZFwiXHJcbiAgICBjb25zdCB0ZXh0SGVpZ2h0ID0gY3R4Lm1lYXN1cmVUZXh0KFwiTVwiKS53aWR0aFxyXG4gICAgY29uc3QgZm9udCA9IGN0eC5mb250XHJcblxyXG4gICAgZm9yIChjb25zdCByZWdpb24gb2YgcmVnaW9ucykge1xyXG4gICAgICAgIGlmIChyZWdpb24uY29sb3IgPT09IC0xKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBsYWJlbCA9IGAke3JlZ2lvbi5jb2xvciArIDF9YFxyXG4gICAgICAgIGNvbnN0IG1ldHJpY3MgPSBjdHgubWVhc3VyZVRleHQobGFiZWwpXHJcbiAgICAgICAgY29uc3QgY2VudGVyID0gY2FsY0NlbnRlcihyZWdpb24ubWF4UmVjdClcclxuICAgICAgICBjb25zdCB4ID0gY2VudGVyWzBdIC0gbWV0cmljcy53aWR0aCAvIDJcclxuICAgICAgICBjb25zdCB5ID0gY2VudGVyWzFdICsgdGV4dEhlaWdodCAvIDJcclxuICAgICAgICBjdHguZmlsbFRleHQobGFiZWwsIHgsIHkpXHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmZvbnQgPSBmb250XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9uQ2FudmFzQ2xpY2soZXZ0OiBNb3VzZUV2ZW50KSB7XHJcbiAgICBpZiAoIXBsYXlTdGF0ZSkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHsgcGFsZXR0ZSwgcmVnaW9ucywgcmVnaW9uT3ZlcmxheSB9ID0gcGxheVN0YXRlXHJcbiAgICBjb25zdCBpZHggPSBldnQub2Zmc2V0WSAqIGN0eC5jYW52YXMud2lkdGggKyBldnQub2Zmc2V0WFxyXG4gICAgY29uc3QgcmVnaW9uID0gcmVnaW9uT3ZlcmxheVtpZHhdXHJcbiAgICBpZiAoIXJlZ2lvbiB8fCByZWdpb24uY29sb3IgPT09IC0xKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYm91bmRzID0gcmVnaW9uLmJvdW5kc1xyXG4gICAgY29uc3QgcmVnaW9uV2lkdGggPSBjYWxjV2lkdGgoYm91bmRzKVxyXG4gICAgY29uc3QgcmVnaW9uSGVpZ2h0ID0gY2FsY0hlaWdodChib3VuZHMpXHJcbiAgICBjb25zdCBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKGJvdW5kcy5taW5YLCBib3VuZHMubWluWSwgcmVnaW9uV2lkdGgsIHJlZ2lvbkhlaWdodClcclxuICAgIGNvbnN0IGRhdGEgPSBpbWFnZURhdGEuZGF0YVxyXG4gICAgY29uc3QgY29sb3IgPSBwYWxldHRlW3JlZ2lvbi5jb2xvcl1cclxuXHJcbiAgICBpbWFnaW5nLnNjYW5JbWFnZURhdGEoaW1hZ2VEYXRhLCAoeCwgeSwgb2Zmc2V0KSA9PiB7XHJcbiAgICAgICAgY29uc3QgaW1hZ2VYID0geCArIGJvdW5kcy5taW5YXHJcbiAgICAgICAgY29uc3QgaW1hZ2VZID0geSArIGJvdW5kcy5taW5ZXHJcbiAgICAgICAgY29uc3QgaW1hZ2VPZmZzZXQgPSBpbWFnZVkgKiBjdHguY2FudmFzLndpZHRoICsgaW1hZ2VYXHJcbiAgICAgICAgY29uc3QgaW1hZ2VSZWdpb24gPSByZWdpb25PdmVybGF5W2ltYWdlT2Zmc2V0XVxyXG4gICAgICAgIGlmIChpbWFnZVJlZ2lvbiAhPT0gcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGF0YVtvZmZzZXQgKiA0XSA9IGNvbG9yWzBdXHJcbiAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMV0gPSBjb2xvclsxXVxyXG4gICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDJdID0gY29sb3JbMl1cclxuICAgIH0pXHJcblxyXG4gICAgY3R4LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIGJvdW5kcy5taW5YLCBib3VuZHMubWluWSlcclxuICAgIHJlZ2lvbi5maWxsZWQgPSB0cnVlXHJcblxyXG4gICAgLy8gaWYgYWxsIHJlZ2lvbnMgYXJlIGZpbGxlZCwgcmVwbGFjZSB3aXRoIG9yaWdpbmFsIGltYWdlIGRhdGFcclxuICAgIGlmIChyZWdpb25zLmV2ZXJ5KHIgPT4gci5maWxsZWQgfHwgci5jb2xvciA9PT0gLTEpKSB7XHJcbiAgICAgICAgY3R4LnB1dEltYWdlRGF0YShwbGF5U3RhdGUuaW1hZ2VEYXRhLCAwLCAwKVxyXG4gICAgfVxyXG59Il19