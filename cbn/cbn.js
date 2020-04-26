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
        showPlayUi(img, img.width, img.height);
    });
    img.src = url;
}
function clearErrorMessages() {
    const errorsDiv = util.byId("errors");
    util.removeAllChildren(errorsDiv);
}
function appendErrorMessage(error) {
    console.log(error);
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
    console.log(camera.clientWidth, camera.clientHeight, camera.width, camera.height, camera.videoWidth, camera.videoHeight);
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
    processImage();
}
function showLoadUi() {
    loadUi.hidden = false;
    playUi.hidden = true;
}
function processImage() {
    // get (flat) image data from canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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
            }
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
    const minRegionWidth = 6;
    const minRegionHeight = 6;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQUUvQyxJQUFLLFVBSUo7QUFKRCxXQUFLLFVBQVU7SUFDWCwyQ0FBSSxDQUFBO0lBQ0osMkNBQUksQ0FBQTtJQUNKLHlEQUFXLENBQUE7QUFDZixDQUFDLEVBSkksVUFBVSxLQUFWLFVBQVUsUUFJZDtBQVNELFNBQVMsU0FBUyxDQUFDLE1BQWM7SUFDN0IsT0FBTyxNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO0FBQ3hDLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxNQUFjO0lBQzlCLE9BQU8sTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtBQUN4QyxDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsTUFBYztJQUM1QixPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDakQsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLE1BQWM7SUFDOUIsT0FBTztRQUNILE1BQU0sQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDbkMsTUFBTSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztLQUN2QyxDQUFBO0FBQ0wsQ0FBQztBQVdELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFxQixDQUFBO0FBQ3RELElBQUksVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUE7QUFDaEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQXNCLENBQUE7QUFDdkQsTUFB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SUFBSSxDQUFBO0FBQ25CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyB1dGlsIGZyb20gXCIuLi9zaGFyZWQvdXRpbC5qc1wiXHJcbmltcG9ydCAqIGFzIGltYWdpbmcgZnJvbSBcIi4uL3NoYXJlZC9pbWFnaW5nLmpzXCJcclxuXHJcbmVudW0gQ2FtZXJhTW9kZSB7XHJcbiAgICBOb25lLFxyXG4gICAgVXNlcixcclxuICAgIEVudmlyb25tZW50LFxyXG59XHJcblxyXG5pbnRlcmZhY2UgQm91bmRzIHtcclxuICAgIG1pblg6IG51bWJlclxyXG4gICAgbWF4WDogbnVtYmVyXHJcbiAgICBtaW5ZOiBudW1iZXJcclxuICAgIG1heFk6IG51bWJlclxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjV2lkdGgoYm91bmRzOiBCb3VuZHMpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIGJvdW5kcy5tYXhYIC0gYm91bmRzLm1pblggKyAxXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGNIZWlnaHQoYm91bmRzOiBCb3VuZHMpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIGJvdW5kcy5tYXhZIC0gYm91bmRzLm1pblkgKyAxXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGNBcmVhKGJvdW5kczogQm91bmRzKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBjYWxjV2lkdGgoYm91bmRzKSAqIGNhbGNIZWlnaHQoYm91bmRzKVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjQ2VudGVyKGJvdW5kczogQm91bmRzKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICByZXR1cm4gW1xyXG4gICAgICAgIGJvdW5kcy5taW5YICsgY2FsY1dpZHRoKGJvdW5kcykgLyAyLFxyXG4gICAgICAgIGJvdW5kcy5taW5ZICsgY2FsY0hlaWdodChib3VuZHMpIC8gMlxyXG4gICAgXVxyXG59XHJcblxyXG5pbnRlcmZhY2UgUmVnaW9uIHtcclxuICAgIGNvbG9yOiBudW1iZXJcclxuICAgIHBpeGVsczogbnVtYmVyXHJcbiAgICBib3VuZHM6IEJvdW5kc1xyXG4gICAgbWF4UmVjdDogQm91bmRzXHJcbn1cclxuXHJcbnR5cGUgUmVnaW9uT3ZlcmxheSA9IChSZWdpb24gfCBudWxsKVtdXHJcblxyXG5jb25zdCBjYW1lcmEgPSB1dGlsLmJ5SWQoXCJjYW1lcmFcIikgYXMgSFRNTFZpZGVvRWxlbWVudFxyXG5sZXQgY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuTm9uZVxyXG5jb25zdCBjYW52YXMgPSB1dGlsLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuY29uc3QgYWNxdWlyZUltYWdlRGl2ID0gdXRpbC5ieUlkKFwiYWNxdWlyZUltYWdlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbmNvbnN0IHBhbGV0dGVEaXYgPSB1dGlsLmJ5SWQoXCJwYWxldHRlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbmNvbnN0IHBhbGV0dGVFbnRyeVRlbXBsYXRlID0gdXRpbC5ieUlkKFwicGFsZXR0ZUVudHJ5XCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuXHJcbmNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikgYXMgQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEXHJcbmlmICghY3R4KSB7XHJcbiAgICB0aHJvd0Vycm9yTWVzc2FnZShcIkNhbnZhcyBlbGVtZW50IG5vdCBzdXBwb3J0ZWRcIilcclxufVxyXG5cclxuY29uc3QgY2FwdHVyZUltYWdlQnV0dG9uID0gdXRpbC5ieUlkKFwiY2FwdHVyZUltYWdlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbmNvbnN0IGxvYWRVaSA9IHV0aWwuYnlJZChcImxvYWRVaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5jb25zdCBwbGF5VWkgPSB1dGlsLmJ5SWQoXCJwbGF5VWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuXHJcbmluaXQoKVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgIGNvbnN0IGZpbGVEcm9wQm94ID0gdXRpbC5ieUlkKFwiZmlsZURyb3BCb3hcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIGNvbnN0IGZpbGVJbnB1dCA9IHV0aWwuYnlJZChcImZpbGVJbnB1dFwiKSBhcyBIVE1MSW5wdXRFbGVtZW50XHJcbiAgICBjb25zdCBmaWxlQnV0dG9uID0gdXRpbC5ieUlkKFwiZmlsZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgY29uc3QgdXNlQ2FtZXJhQnV0dG9uID0gdXRpbC5ieUlkKFwidXNlQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBjb25zdCBmbGlwQ2FtZXJhQnV0dG9uID0gdXRpbC5ieUlkKFwiZmxpcENhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgY29uc3Qgc3RvcENhbWVyYUJ1dHRvbiA9IHV0aWwuYnlJZChcInN0b3BDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIGNvbnN0IHJldHVybkJ1dHRvbiA9IHV0aWwuYnlJZChcInJldHVybkJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5cclxuICAgIGZpbGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICBmaWxlSW5wdXQuY2xpY2soKVxyXG4gICAgfSlcclxuXHJcbiAgICBmaWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2VudGVyXCIsIG9uRHJhZ0VudGVyT3ZlcilcclxuICAgIGZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnb3ZlclwiLCBvbkRyYWdFbnRlck92ZXIpXHJcbiAgICBmaWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJvcFwiLCBvbkZpbGVEcm9wKVxyXG5cclxuICAgIGZpbGVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHtcclxuICAgICAgICBpZiAoIWZpbGVJbnB1dC5maWxlcz8ubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZmlsZSA9IGZpbGVJbnB1dC5maWxlc1swXVxyXG4gICAgICAgIHByb2Nlc3NGaWxlKGZpbGUpXHJcbiAgICB9KVxyXG5cclxuICAgIHVzZUNhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgdXNlQ2FtZXJhKVxyXG4gICAgZmxpcENhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZmxpcENhbWVyYSlcclxuICAgIHN0b3BDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHN0b3BDYW1lcmEpXHJcbiAgICBjYXB0dXJlSW1hZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNhcHR1cmVJbWFnZSlcclxuICAgIHJldHVybkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgc2hvd0xvYWRVaSlcclxufVxyXG5cclxuZnVuY3Rpb24gb25EcmFnRW50ZXJPdmVyKGV2OiBEcmFnRXZlbnQpIHtcclxuICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICBldi5wcmV2ZW50RGVmYXVsdCgpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9uRmlsZURyb3AoZXY6IERyYWdFdmVudCkge1xyXG4gICAgZXYuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxuXHJcbiAgICBpZiAoIWV2Py5kYXRhVHJhbnNmZXI/LmZpbGVzPy5sZW5ndGgpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmaWxlID0gZXYuZGF0YVRyYW5zZmVyLmZpbGVzWzBdXHJcbiAgICBwcm9jZXNzRmlsZShmaWxlKVxyXG59XHJcblxyXG5mdW5jdGlvbiBwcm9jZXNzRmlsZShmaWxlOiBGaWxlKSB7XHJcbiAgICBjbGVhckVycm9yTWVzc2FnZXMoKVxyXG4gICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKVxyXG4gICAgbG9hZEZyb21VcmwodXJsKVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkRnJvbVVybCh1cmw6IHN0cmluZykge1xyXG4gICAgY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuICAgIGNvbnN0IGltZyA9IG5ldyBJbWFnZSgpXHJcbiAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgKCkgPT4ge1xyXG4gICAgICAgIHNob3dQbGF5VWkoaW1nLCBpbWcud2lkdGgsIGltZy5oZWlnaHQpXHJcbiAgICB9KVxyXG5cclxuICAgIGltZy5zcmMgPSB1cmxcclxufVxyXG5cclxuZnVuY3Rpb24gY2xlYXJFcnJvck1lc3NhZ2VzKCkge1xyXG4gICAgY29uc3QgZXJyb3JzRGl2ID0gdXRpbC5ieUlkKFwiZXJyb3JzXCIpXHJcbiAgICB1dGlsLnJlbW92ZUFsbENoaWxkcmVuKGVycm9yc0RpdilcclxufVxyXG5cclxuZnVuY3Rpb24gYXBwZW5kRXJyb3JNZXNzYWdlKGVycm9yOiBzdHJpbmcpIHtcclxuICAgIGNvbnNvbGUubG9nKGVycm9yKVxyXG4gICAgY29uc3QgZXJyb3JzRGl2ID0gdXRpbC5ieUlkKFwiZXJyb3JzXCIpO1xyXG4gICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgIGRpdi5jbGFzc0xpc3QuYWRkKFwiZXJyb3ItbWVzc2FnZVwiKVxyXG4gICAgZGl2LnRleHRDb250ZW50ID0gZXJyb3JcclxuICAgIGVycm9yc0Rpdi5hcHBlbmRDaGlsZChkaXYpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRocm93RXJyb3JNZXNzYWdlKGVycm9yOiBzdHJpbmcpIHtcclxuICAgIGFwcGVuZEVycm9yTWVzc2FnZShlcnJvcilcclxuICAgIHRocm93IG5ldyBFcnJvcihlcnJvcilcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gdXNlQ2FtZXJhKCkge1xyXG4gICAgYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICBjb25zdCBkaWFsb2dXaWR0aCA9IGFjcXVpcmVJbWFnZURpdi5jbGllbnRXaWR0aFxyXG4gICAgY29uc3QgZGlhbG9nSGVpZ2h0ID0gYWNxdWlyZUltYWdlRGl2LmNsaWVudEhlaWdodFxyXG4gICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xyXG4gICAgICAgIHZpZGVvOiB7IHdpZHRoOiB7IG1heDogZGlhbG9nV2lkdGggfSwgaGVpZ2h0OiB7IG1heDogZGlhbG9nSGVpZ2h0IH0sIGZhY2luZ01vZGU6IFwidXNlclwiIH0sXHJcbiAgICAgICAgYXVkaW86IGZhbHNlXHJcbiAgICB9KVxyXG5cclxuICAgIGNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLlVzZXJcclxuICAgIGNhbWVyYS5zcmNPYmplY3QgPSBzdHJlYW1cclxuICAgIGNhbWVyYS5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkbWV0YWRhdGFcIiwgb25DYW1lcmFMb2FkKVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBmbGlwQ2FtZXJhKCkge1xyXG4gICAgaWYgKCFjYW1lcmEuc3JjT2JqZWN0KSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc3JjID0gY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgY29uc3QgdHJhY2tzID0gc3JjLmdldFRyYWNrcygpXHJcbiAgICBmb3IgKGNvbnN0IHRyYWNrIG9mIHRyYWNrcykge1xyXG4gICAgICAgIHRyYWNrLnN0b3AoKVxyXG4gICAgfVxyXG5cclxuICAgIGNhbWVyYU1vZGUgPSBjYW1lcmFNb2RlID09IENhbWVyYU1vZGUuVXNlciA/IENhbWVyYU1vZGUuRW52aXJvbm1lbnQgOiBDYW1lcmFNb2RlLlVzZXJcclxuICAgIGNvbnN0IGZhY2luZ01vZGUgPSBjYW1lcmFNb2RlID09IENhbWVyYU1vZGUuVXNlciA/IFwidXNlclwiIDogXCJlbnZpcm9ubWVudFwiXHJcblxyXG4gICAgLy8gZ2V0IGN1cnJlbnQgZmFjaW5nIG1vZGVcclxuICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcclxuICAgICAgICB2aWRlbzogeyB3aWR0aDogY2FtZXJhLmNsaWVudFdpZHRoLCBoZWlnaHQ6IGNhbWVyYS5jbGllbnRIZWlnaHQsIGZhY2luZ01vZGU6IGZhY2luZ01vZGUgfSxcclxuICAgICAgICBhdWRpbzogZmFsc2VcclxuICAgIH0pXHJcblxyXG4gICAgY2FtZXJhLnNyY09iamVjdCA9IHN0cmVhbVxyXG4gICAgY2FtZXJhLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRtZXRhZGF0YVwiLCBvbkNhbWVyYUxvYWQpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9uQ2FtZXJhTG9hZCgpIHtcclxuICAgIGNvbnNvbGUubG9nKGNhbWVyYS5jbGllbnRXaWR0aCwgY2FtZXJhLmNsaWVudEhlaWdodCwgY2FtZXJhLndpZHRoLCBjYW1lcmEuaGVpZ2h0LCBjYW1lcmEudmlkZW9XaWR0aCwgY2FtZXJhLnZpZGVvSGVpZ2h0KVxyXG4gICAgYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICBjYW1lcmEucGxheSgpXHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiBzdG9wQ2FtZXJhKCkge1xyXG4gICAgY29uc3Qgc3JjID0gY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgaWYgKCFzcmMpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0cmFja3MgPSBzcmMuZ2V0VHJhY2tzKClcclxuICAgIGZvciAoY29uc3QgdHJhY2sgb2YgdHJhY2tzKSB7XHJcbiAgICAgICAgdHJhY2suc3RvcCgpXHJcbiAgICB9XHJcblxyXG4gICAgY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuTm9uZVxyXG4gICAgYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IHRydWVcclxufVxyXG5cclxuZnVuY3Rpb24gY2FwdHVyZUltYWdlKCkge1xyXG4gICAgY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuXHJcbiAgICBjb25zdCBzcmMgPSBjYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICBpZiAoIXNyYykge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHRyYWNrID0gc3JjLmdldFZpZGVvVHJhY2tzKClbMF1cclxuICAgIGlmICghdHJhY2spIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBzaG93UGxheVVpKGNhbWVyYSwgY2FtZXJhLnZpZGVvV2lkdGgsIGNhbWVyYS52aWRlb0hlaWdodCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3dQbGF5VWkoaW1nOiBDYW52YXNJbWFnZVNvdXJjZSwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpIHtcclxuICAgIC8vIG1haW50YWluIGFzcGVjdCByYXRpbyFcclxuICAgIGNvbnN0IHZ3ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoXHJcbiAgICBjb25zdCB2aCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHRcclxuXHJcbiAgICBpZiAodncgPCB2aCkge1xyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHZ3XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IHZ3ICogaGVpZ2h0IC8gd2lkdGhcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IHZoXHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gdmggKiB3aWR0aCAvIGhlaWdodFxyXG4gICAgfVxyXG5cclxuICAgIGxvYWRVaS5oaWRkZW4gPSB0cnVlXHJcbiAgICBwbGF5VWkuaGlkZGVuID0gZmFsc2VcclxuXHJcbiAgICBjdHguZHJhd0ltYWdlKGltZywgMCwgMCwgY2FudmFzLmNsaWVudFdpZHRoLCBjYW52YXMuY2xpZW50SGVpZ2h0KVxyXG4gICAgcHJvY2Vzc0ltYWdlKClcclxufVxyXG5cclxuZnVuY3Rpb24gc2hvd0xvYWRVaSgpIHtcclxuICAgIGxvYWRVaS5oaWRkZW4gPSBmYWxzZVxyXG4gICAgcGxheVVpLmhpZGRlbiA9IHRydWVcclxufVxyXG5cclxuZnVuY3Rpb24gcHJvY2Vzc0ltYWdlKCkge1xyXG4gICAgLy8gZ2V0IChmbGF0KSBpbWFnZSBkYXRhIGZyb20gY2FudmFzXHJcbiAgICBjb25zdCBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodClcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gaW1hZ2VEYXRhXHJcblxyXG4gICAgLy8gY29udmVydCB0byB4eXogY29sb3JzIGFuZCBwYWxldHRpemUgZGF0YVxyXG4gICAgbGV0IFtwYWxldHRlLCBwYWxldHRlT3ZlcmxheV0gPSBwYWxldHRpemUoaW1hZ2VEYXRhLCAzLCA4KVxyXG4gICAgaW1hZ2luZy5hcHBseVBhbGV0dGUocGFsZXR0ZSwgcGFsZXR0ZU92ZXJsYXksIGltYWdlRGF0YSlcclxuXHJcbiAgICBjdHgucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMClcclxuICAgIGxldCBbcmVnaW9ucywgcmVnaW9uT3ZlcmxheV0gPSBjcmVhdGVSZWdpb25PdmVybGF5KHdpZHRoLCBoZWlnaHQsIHBhbGV0dGVPdmVybGF5KVxyXG4gICAgcmVnaW9ucyA9IHBydW5lUmVnaW9ucyh3aWR0aCwgaGVpZ2h0LCByZWdpb25zLCByZWdpb25PdmVybGF5KVxyXG5cclxuICAgIC8vIHNvbWUgcGFsbGV0dGUgZW50cmllcyB3aWxsIG5vdyBiZSB1bnVzZWQgYnkgcmVnaW9ucywgcmVtb3ZlIHRoZXNlXHJcbiAgICBwYWxldHRlID0gcmVtb3ZlVW51c2VkUGFsZXR0ZUVudHJpZXMocGFsZXR0ZSwgcmVnaW9ucylcclxuXHJcbiAgICBkcmF3Qm9yZGVycyhyZWdpb25PdmVybGF5LCBpbWFnZURhdGEpXHJcbiAgICBmaWxsSW50ZXJpb3IoaW1hZ2VEYXRhLmRhdGEsIHJlZ2lvbk92ZXJsYXkpXHJcbiAgICBjdHgucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMClcclxuICAgIGNyZWF0ZVBhbGV0dGVVaShwYWxldHRlKVxyXG4gICAgZHJhd1JlZ2lvbkxhYmVscyhjdHgsIHJlZ2lvbnMpXHJcbn1cclxuXHJcbi8vIHNwZWNpYWxpemVkIHRvIGlnbm9yZSB3aGl0ZVxyXG5mdW5jdGlvbiBwYWxldHRpemUoaW1hZ2VEYXRhOiBJbWFnZURhdGEsIGJ1Y2tldHNQZXJDb21wb25lbnQ6IG51bWJlciwgbWF4Q29sb3JzOiBudW1iZXIpOiBbaW1hZ2luZy5Db2xvcltdLCBudW1iZXJbXV0ge1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBkYXRhIH0gPSBpbWFnZURhdGFcclxuICAgIGNvbnN0IHBpeGVscyA9IHdpZHRoICogaGVpZ2h0XHJcbiAgICBjb25zdCBidWNrZXRQaXRjaCA9IGJ1Y2tldHNQZXJDb21wb25lbnQgKiBidWNrZXRzUGVyQ29tcG9uZW50XHJcbiAgICBjb25zdCBudW1CdWNrZXRzID0gYnVja2V0UGl0Y2ggKiBidWNrZXRzUGVyQ29tcG9uZW50XHJcblxyXG4gICAgLy8gY3JlYXQgaW50aWFsIGJ1Y2tldHNcclxuICAgIGxldCBidWNrZXRzID0gdXRpbC5nZW5lcmF0ZShudW1CdWNrZXRzLCAoKSA9PiAoeyBjb2xvcjogWzAsIDAsIDBdIGFzIFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSwgcGl4ZWxzOiAwIH0pKVxyXG5cclxuICAgIC8vIGFzc2lnbiBhbmQgdXBkYXRlIGJ1Y2tldCBmb3IgZWFjaCBwaXhlbFxyXG4gICAgY29uc3QgYnVja2V0T3ZlcmxheSA9IHV0aWwuZ2VuZXJhdGUocGl4ZWxzLCBpID0+IHtcclxuICAgICAgICBjb25zdCByID0gZGF0YVtpICogNF0gLyAyNTVcclxuICAgICAgICBjb25zdCBnID0gZGF0YVtpICogNCArIDFdIC8gMjU1XHJcbiAgICAgICAgY29uc3QgYiA9IGRhdGFbaSAqIDQgKyAyXSAvIDI1NVxyXG5cclxuICAgICAgICAvLyBpZ25vcmUgd2hpdGVcclxuICAgICAgICBpZiAociA+PSAuOTUgJiYgZyA+PSAuOTUgJiYgYiA+PSAuOTUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHJiID0gTWF0aC5taW4oTWF0aC5mbG9vcihyICogYnVja2V0c1BlckNvbXBvbmVudCksIGJ1Y2tldHNQZXJDb21wb25lbnQgLSAxKVxyXG4gICAgICAgIGNvbnN0IGdiID0gTWF0aC5taW4oTWF0aC5mbG9vcihnICogYnVja2V0c1BlckNvbXBvbmVudCksIGJ1Y2tldHNQZXJDb21wb25lbnQgLSAxKVxyXG4gICAgICAgIGNvbnN0IGJiID0gTWF0aC5taW4oTWF0aC5mbG9vcihiICogYnVja2V0c1BlckNvbXBvbmVudCksIGJ1Y2tldHNQZXJDb21wb25lbnQgLSAxKVxyXG5cclxuICAgICAgICBjb25zdCBidWNrZXRJZHggPSByYiAqIGJ1Y2tldFBpdGNoICsgZ2IgKiBidWNrZXRzUGVyQ29tcG9uZW50ICsgYmJcclxuICAgICAgICBjb25zdCBidWNrZXQgPSBidWNrZXRzW2J1Y2tldElkeF1cclxuICAgICAgICBidWNrZXQuY29sb3IgPSBpbWFnaW5nLmFkZFhZWihbciwgZywgYl0sIGJ1Y2tldC5jb2xvcilcclxuICAgICAgICBidWNrZXQucGl4ZWxzKytcclxuICAgICAgICByZXR1cm4gYnVja2V0XHJcbiAgICB9KVxyXG5cclxuICAgIC8vIHBydW5lIGVtcHR5IGJ1Y2tldHNcclxuICAgIGJ1Y2tldHMgPSBidWNrZXRzLmZpbHRlcihiID0+IGIucGl4ZWxzID4gMClcclxuXHJcbiAgICAvLyBjYWxjdWxhdGUgYnVja2V0IGNvbG9yc1xyXG4gICAgZm9yIChjb25zdCBidWNrZXQgb2YgYnVja2V0cykge1xyXG4gICAgICAgIGJ1Y2tldC5jb2xvciA9IGltYWdpbmcuZGl2WFlaKGJ1Y2tldC5jb2xvciwgYnVja2V0LnBpeGVscylcclxuICAgIH1cclxuXHJcbiAgICAvLyBjb21iaW5lIGJ1Y2tldHMgdGhhdCBhcmUgdmVyeSBjbG9zZSBpbiBjb2xvciBhZnRlciBjb2xvciBhdmVyYWdpbmdcclxuICAgIGxldCBidWNrZXRTZXQgPSBuZXcgU2V0KGJ1Y2tldHMpXHJcbiAgICB3aGlsZSAoYnVja2V0U2V0LnNpemUgPiAxKSB7XHJcbiAgICAgICAgLy8gcHJvY2VlZCBmb3IgYXMgbG9uZyBhcyBidWNrZXRzIGNhbiBiZSBjb21iaW5lZFxyXG4gICAgICAgIGxldCBtZXJnZSA9IGZhbHNlXHJcbiAgICAgICAgZm9yIChjb25zdCBidWNrZXQgb2YgYnVja2V0U2V0KSB7XHJcbiAgICAgICAgICAgIC8vIGZpbmQgXCJuZWFyZXN0XCIgY29sb3JcclxuICAgICAgICAgICAgY29uc3QgbmVhcmVzdCA9IFsuLi5idWNrZXRTZXRdXHJcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGIgPT4gYiAhPSBidWNrZXQpXHJcbiAgICAgICAgICAgICAgICAucmVkdWNlKChiMSwgYjIpID0+IGltYWdpbmcuY2FsY0Rpc3RTcShidWNrZXQuY29sb3IsIGIxLmNvbG9yKSA8IGltYWdpbmcuY2FsY0Rpc3RTcShidWNrZXQuY29sb3IsIGIyLmNvbG9yKSA/IGIxIDogYjIpXHJcblxyXG4gICAgICAgICAgICBjb25zdCBkaXN0U3EgPSBpbWFnaW5nLmNhbGNEaXN0U3EoYnVja2V0LmNvbG9yLCBuZWFyZXN0LmNvbG9yKVxyXG4gICAgICAgICAgICBpZiAoZGlzdFNxID4gLjEpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIG1lcmdlIHRoZSBidWNrZXRzXHJcbiAgICAgICAgICAgIGJ1Y2tldC5jb2xvciA9IGltYWdpbmcuZGl2WFlaKFxyXG4gICAgICAgICAgICAgICAgaW1hZ2luZy5hZGRYWVooaW1hZ2luZy5tdWxYWVooYnVja2V0LmNvbG9yLCBidWNrZXQucGl4ZWxzKSwgaW1hZ2luZy5tdWxYWVoobmVhcmVzdC5jb2xvciwgbmVhcmVzdC5waXhlbHMpKSxcclxuICAgICAgICAgICAgICAgIGJ1Y2tldC5waXhlbHMgKyBuZWFyZXN0LnBpeGVscylcclxuXHJcbiAgICAgICAgICAgIGJ1Y2tldFNldC5kZWxldGUobmVhcmVzdClcclxuICAgICAgICAgICAgbWVyZ2UgPSB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIW1lcmdlKSB7XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGJ1Y2tldHMgPSBbLi4uYnVja2V0U2V0XVxyXG4gICAgICAgIC5zb3J0KChiMSwgYjIpID0+IGIyLnBpeGVscyAtIGIxLnBpeGVscylcclxuICAgICAgICAuc2xpY2UoMCwgbWF4Q29sb3JzKVxyXG5cclxuICAgIC8vIG1hcCBhbGwgY29sb3JzIHRvIHRvcCBOIGJ1Y2tldHNcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVja2V0T3ZlcmxheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIC8vIG90aGVyd2lzZSwgbWFwIHRvIG5ldyBidWNrZXRcclxuICAgICAgICBjb25zdCByID0gZGF0YVtpICogNF0gLyAyNTVcclxuICAgICAgICBjb25zdCBnID0gZGF0YVtpICogNCArIDFdIC8gMjU1XHJcbiAgICAgICAgY29uc3QgYiA9IGRhdGFbaSAqIDQgKyAyXSAvIDI1NVxyXG5cclxuICAgICAgICBpZiAociA+PSAuOTUgJiYgZyA+PSAuOTUgJiYgYiA+PSAuOTUpIHtcclxuICAgICAgICAgICAgYnVja2V0T3ZlcmxheVtpXSA9IG51bGxcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbG9yOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0gPSBbciwgZywgYl1cclxuICAgICAgICBjb25zdCBidWNrZXQgPSBidWNrZXRzLnJlZHVjZSgoYjEsIGIyKSA9PiBpbWFnaW5nLmNhbGNEaXN0U3EoYjEuY29sb3IsIGNvbG9yKSA8IGltYWdpbmcuY2FsY0Rpc3RTcShiMi5jb2xvciwgY29sb3IpID8gYjEgOiBiMilcclxuICAgICAgICBidWNrZXRPdmVybGF5W2ldID0gYnVja2V0XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZGV0ZXJtaW5lIHBhbGV0dGUgY29sb3JzXHJcbiAgICBjb25zdCBwYWxldHRlID0gYnVja2V0cy5tYXAoYiA9PiBpbWFnaW5nLm11bFhZWihiLmNvbG9yLCAyNTUpKVxyXG4gICAgY29uc3QgcGFsZXR0ZU92ZXJsYXkgPSBidWNrZXRPdmVybGF5Lm1hcChiID0+IGIgPyBidWNrZXRzLmluZGV4T2YoYikgOiAtMSlcclxuICAgIHJldHVybiBbcGFsZXR0ZSwgcGFsZXR0ZU92ZXJsYXldXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVJlZ2lvbk92ZXJsYXkod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSk6IFtSZWdpb25bXSwgUmVnaW9uT3ZlcmxheV0ge1xyXG4gICAgY29uc3QgcmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSA9IHV0aWwuZmlsbChudWxsLCB3aWR0aCAqIGhlaWdodClcclxuICAgIGNvbnN0IHJlZ2lvbnM6IFJlZ2lvbltdID0gW11cclxuXHJcbiAgICBpbWFnaW5nLnNjYW4od2lkdGgsIGhlaWdodCwgKHgsIHksIG9mZnNldCkgPT4ge1xyXG4gICAgICAgIGlmIChyZWdpb25PdmVybGF5W29mZnNldF0pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCByZWdpb246IFJlZ2lvbiA9IHtcclxuICAgICAgICAgICAgY29sb3I6IHBhbGV0dGVPdmVybGF5W29mZnNldF0sXHJcbiAgICAgICAgICAgIHBpeGVsczogMCxcclxuICAgICAgICAgICAgYm91bmRzOiB7XHJcbiAgICAgICAgICAgICAgICBtaW5YOiBJbmZpbml0eSxcclxuICAgICAgICAgICAgICAgIG1heFg6IC0xLFxyXG4gICAgICAgICAgICAgICAgbWluWTogSW5maW5pdHksXHJcbiAgICAgICAgICAgICAgICBtYXhZOiAtMVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBtYXhSZWN0OiB7XHJcbiAgICAgICAgICAgICAgICBtaW5YOiBJbmZpbml0eSxcclxuICAgICAgICAgICAgICAgIG1heFg6IC0xLFxyXG4gICAgICAgICAgICAgICAgbWluWTogSW5maW5pdHksXHJcbiAgICAgICAgICAgICAgICBtYXhZOiAtMVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSByZWdpb25cclxuICAgICAgICByZWdpb25zLnB1c2gocmVnaW9uKVxyXG4gICAgICAgIGV4cGxvcmVSZWdpb24od2lkdGgsIGhlaWdodCwgcGFsZXR0ZU92ZXJsYXksIHgsIHksIHJlZ2lvbk92ZXJsYXkpXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIHBydW5lIHNvbWUgcmVnaW9uc1xyXG4gICAgcmV0dXJuIFtyZWdpb25zLCByZWdpb25PdmVybGF5XVxyXG59XHJcblxyXG5mdW5jdGlvbiBwcnVuZVJlZ2lvbnMod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHJlZ2lvbnM6IFJlZ2lvbltdLCByZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5KTogUmVnaW9uW10ge1xyXG4gICAgY29uc3QgcmVnaW9uU2V0ID0gbmV3IFNldChyZWdpb25zKVxyXG4gICAgY29uc3QgbWluUmVnaW9uV2lkdGggPSA2XHJcbiAgICBjb25zdCBtaW5SZWdpb25IZWlnaHQgPSA2XHJcbiAgICBjb25zdCBtaW5SZWdpb25QaXhlbHMgPSBtaW5SZWdpb25XaWR0aCAqIG1pblJlZ2lvbkhlaWdodFxyXG5cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvbnMpIHtcclxuICAgICAgICBpZiAocmVnaW9uLnBpeGVscyA8PSBtaW5SZWdpb25QaXhlbHMpIHtcclxuICAgICAgICAgICAgcmVnaW9uU2V0LmRlbGV0ZShyZWdpb24pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNhbGNSZWdpb25Cb3VuZHMod2lkdGgsIGhlaWdodCwgcmVnaW9uT3ZlcmxheSlcclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvblNldCkge1xyXG4gICAgICAgIGlmIChjYWxjV2lkdGgocmVnaW9uLmJvdW5kcykgPD0gbWluUmVnaW9uV2lkdGgpIHtcclxuICAgICAgICAgICAgcmVnaW9uU2V0LmRlbGV0ZShyZWdpb24pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoY2FsY0hlaWdodChyZWdpb24uYm91bmRzKSA8PSBtaW5SZWdpb25IZWlnaHQpIHtcclxuICAgICAgICAgICAgcmVnaW9uU2V0LmRlbGV0ZShyZWdpb24pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGNhbGN1bGF0ZSBtYXhpbWFsIHJlYyBmb3IgZWFjaCByZWdpb25cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvblNldCkge1xyXG4gICAgICAgIHJlZ2lvbi5tYXhSZWN0ID0gY2FsY01heFJlZ2lvblJlY3Qod2lkdGgsIHJlZ2lvbiwgcmVnaW9uT3ZlcmxheSlcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IHJlZ2lvbiBvZiByZWdpb25TZXQpIHtcclxuICAgICAgICBpZiAoY2FsY1dpZHRoKHJlZ2lvbi5tYXhSZWN0KSA8IG1pblJlZ2lvbldpZHRoKSB7XHJcbiAgICAgICAgICAgIHJlZ2lvblNldC5kZWxldGUocmVnaW9uKVxyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGNhbGNIZWlnaHQocmVnaW9uLm1heFJlY3QpIDwgbWluUmVnaW9uSGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHJlZ2lvblNldC5kZWxldGUocmVnaW9uKVxyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyB1cGRhdGUgdGhlIG92ZXJsYXlcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVnaW9uT3ZlcmxheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IHJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbaV1cclxuICAgICAgICBpZiAoIXJlZ2lvbikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFyZWdpb25TZXQuaGFzKHJlZ2lvbikpIHtcclxuICAgICAgICAgICAgcmVnaW9uT3ZlcmxheVtpXSA9IG51bGxcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFsuLi5yZWdpb25TZXRdXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZVVudXNlZFBhbGV0dGVFbnRyaWVzKHBhbGV0dGU6IGltYWdpbmcuQ29sb3JbXSwgcmVnaW9uczogUmVnaW9uW10pOiBpbWFnaW5nLkNvbG9yW10ge1xyXG4gICAgLy8gY3JlYXRlIGEgbWFwIGZyb20gY3VycmVudCBjb2xvciBpbmRleCB0byBuZXcgY29sb3IgaW5kZXhcclxuICAgIGNvbnN0IHVzZWRTZXQgPSBuZXcgU2V0KHJlZ2lvbnMubWFwKHIgPT4gci5jb2xvcikpXHJcbiAgICB1c2VkU2V0LmRlbGV0ZSgtMSlcclxuICAgIGNvbnN0IHVzZWQgPSBbLi4udXNlZFNldF1cclxuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KHVzZWQubWFwKCh1LCBpKSA9PiBbdSwgaV0pKVxyXG5cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvbnMpIHtcclxuICAgICAgICBpZiAocmVnaW9uLmNvbG9yID09PSAtMSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29sb3IgPSBtYXAuZ2V0KHJlZ2lvbi5jb2xvcilcclxuICAgICAgICBpZiAodHlwZW9mIGNvbG9yID09PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvbG9yIG5vdCBmb3VuZCBpbiBtYXBcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlZ2lvbi5jb2xvciA9IGNvbG9yXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHVzZWQubWFwKGkgPT4gcGFsZXR0ZVtpXSlcclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY1JlZ2lvbkJvdW5kcyh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSkge1xyXG4gICAgaW1hZ2luZy5zY2FuKHdpZHRoLCBoZWlnaHQsICh4LCB5LCBvZmZzZXQpID0+IHtcclxuICAgICAgICBjb25zdCByZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldF1cclxuICAgICAgICBpZiAoIXJlZ2lvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGJvdW5kcyA9IHJlZ2lvbi5ib3VuZHNcclxuICAgICAgICBib3VuZHMubWluWCA9IE1hdGgubWluKGJvdW5kcy5taW5YLCB4KVxyXG4gICAgICAgIGJvdW5kcy5tYXhYID0gTWF0aC5tYXgoYm91bmRzLm1heFgsIHgpXHJcbiAgICAgICAgYm91bmRzLm1pblkgPSBNYXRoLm1pbihib3VuZHMubWluWSwgeSlcclxuICAgICAgICBib3VuZHMubWF4WSA9IE1hdGgubWF4KGJvdW5kcy5tYXhZLCB5KVxyXG4gICAgfSlcclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY01heFJlZ2lvblJlY3Qocm93UGl0Y2g6IG51bWJlciwgcmVnaW9uOiBSZWdpb24sIHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkpOiBCb3VuZHMge1xyXG4gICAgLy8gZGVyaXZlZCBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzcyNDUvcHV6emxlLWZpbmQtbGFyZ2VzdC1yZWN0YW5nbGUtbWF4aW1hbC1yZWN0YW5nbGUtcHJvYmxlbVxyXG4gICAgLy8gYWxnb3JpdGhtIG5lZWRzIHRvIGtlZXAgdHJhY2sgb2YgcmVjdGFuZ2xlIHN0YXRlIGZvciBldmVyeSBjb2x1bW4gZm9yIGV2ZXJ5IHJlZ2lvblxyXG4gICAgY29uc3QgeyBtaW5YOiB4MCwgbWluWTogeTAsIG1heFg6IHgxLCBtYXhZOiB5MSB9ID0gcmVnaW9uLmJvdW5kc1xyXG4gICAgY29uc3Qgd2lkdGggPSB4MSAtIHgwICsgMVxyXG4gICAgY29uc3QgaGVpZ2h0ID0geTEgLSB5MCArIDFcclxuICAgIGNvbnN0IGxzID0gdXRpbC5maWxsKHgwLCB3aWR0aClcclxuICAgIGNvbnN0IHJzID0gdXRpbC5maWxsKHgwICsgd2lkdGgsIHdpZHRoKVxyXG4gICAgY29uc3QgaHMgPSB1dGlsLmZpbGwoMCwgd2lkdGgpXHJcblxyXG4gICAgbGV0IG1heEFyZWEgPSAwXHJcbiAgICBjb25zdCBib3VuZHM6IEJvdW5kcyA9IHtcclxuICAgICAgICBtaW5YOiBJbmZpbml0eSxcclxuICAgICAgICBtYXhYOiAtMSxcclxuICAgICAgICBtaW5ZOiBJbmZpbml0eSxcclxuICAgICAgICBtYXhZOiAtMSxcclxuICAgIH1cclxuXHJcbiAgICBpbWFnaW5nLnNjYW5Sb3dzUmVnaW9uKHkwLCBoZWlnaHQsIHJvd1BpdGNoLCAoeSwgeU9mZnNldCkgPT4ge1xyXG4gICAgICAgIGxldCBsID0geDBcclxuICAgICAgICBsZXQgciA9IHgwICsgd2lkdGhcclxuXHJcbiAgICAgICAgLy8gaGVpZ2h0IHNjYW5cclxuICAgICAgICBmb3IgKGxldCB4ID0geDA7IHggPCB4MTsgKyt4KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGkgPSB4IC0geDBcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgaXNSZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldF0gPT09IHJlZ2lvblxyXG5cclxuICAgICAgICAgICAgaWYgKGlzUmVnaW9uKSB7XHJcbiAgICAgICAgICAgICAgICBoc1tpXSArPSAxXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBoc1tpXSA9IDBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbCBzY2FuXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IHgwOyB4IDwgeDE7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCBpID0geCAtIHgwXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGNvbnN0IGlzUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXRdID09PSByZWdpb25cclxuXHJcbiAgICAgICAgICAgIGlmIChpc1JlZ2lvbikge1xyXG4gICAgICAgICAgICAgICAgbHNbaV0gPSBNYXRoLm1heChsc1tpXSwgbClcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxzW2ldID0gMFxyXG4gICAgICAgICAgICAgICAgbCA9IHggKyAxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHIgc2NhblxyXG4gICAgICAgIGZvciAobGV0IHggPSB4MSAtIDE7IHggPj0geDA7IC0teCkge1xyXG4gICAgICAgICAgICBjb25zdCBpID0geCAtIHgwXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGNvbnN0IGlzUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXRdID09PSByZWdpb25cclxuXHJcbiAgICAgICAgICAgIGlmIChpc1JlZ2lvbikge1xyXG4gICAgICAgICAgICAgICAgcnNbaV0gPSBNYXRoLm1pbihyc1tpXSwgcilcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJzW2ldID0geDFcclxuICAgICAgICAgICAgICAgIHIgPSB4XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFyZWEgc2NhblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd2lkdGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBhcmVhID0gaHNbaV0gKiAocnNbaV0gLSBsc1tpXSlcclxuICAgICAgICAgICAgaWYgKGFyZWEgPiBtYXhBcmVhKSB7XHJcbiAgICAgICAgICAgICAgICBtYXhBcmVhID0gYXJlYVxyXG4gICAgICAgICAgICAgICAgYm91bmRzLm1pblggPSBsc1tpXVxyXG4gICAgICAgICAgICAgICAgYm91bmRzLm1heFggPSByc1tpXVxyXG4gICAgICAgICAgICAgICAgYm91bmRzLm1pblkgPSB5IC0gaHNbaV1cclxuICAgICAgICAgICAgICAgIGJvdW5kcy5tYXhZID0geVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSlcclxuXHJcbiAgICByZXR1cm4gYm91bmRzXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4cGxvcmVSZWdpb24od2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSwgeDA6IG51bWJlciwgeTA6IG51bWJlciwgcmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSkge1xyXG4gICAgY29uc3Qgc3RhY2s6IG51bWJlcltdID0gW11cclxuICAgIGNvbnN0IG9mZnNldDAgPSB5MCAqIHdpZHRoICsgeDBcclxuICAgIGNvbnN0IHJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0MF1cclxuICAgIGlmICghcmVnaW9uKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY29sb3IgPSByZWdpb24uY29sb3JcclxuXHJcbiAgICBzdGFjay5wdXNoKHgwKVxyXG4gICAgc3RhY2sucHVzaCh5MClcclxuXHJcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnN0IHkgPSBzdGFjay5wb3AoKSBhcyBudW1iZXJcclxuICAgICAgICBjb25zdCB4ID0gc3RhY2sucG9wKCkgYXMgbnVtYmVyXHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0geSAqIHdpZHRoICsgeFxyXG4gICAgICAgIHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9IHJlZ2lvblxyXG4gICAgICAgIHJlZ2lvbi5waXhlbHMrK1xyXG5cclxuICAgICAgICAvLyBleHBsb3JlIG5laWdoYm9ycyAoaWYgc2FtZSBjb2xvcilcclxuICAgICAgICBjb25zdCBsID0geCAtIDFcclxuICAgICAgICBjb25zdCByID0geCArIDFcclxuICAgICAgICBjb25zdCB0ID0geSAtIDFcclxuICAgICAgICBjb25zdCBiID0geSArIDFcclxuXHJcbiAgICAgICAgaWYgKGwgPj0gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQxID0gb2Zmc2V0IC0gMVxyXG4gICAgICAgICAgICBjb25zdCByZWdpb24xID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBjb25zdCBjb2xvcjEgPSBwYWxldHRlT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBpZiAoIXJlZ2lvbjEgJiYgY29sb3IgPT09IGNvbG9yMSkge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaChsKVxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh5KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAociA8IHdpZHRoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldDEgPSBvZmZzZXQgKyAxXHJcbiAgICAgICAgICAgIGNvbnN0IHJlZ2lvbjEgPSByZWdpb25PdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbG9yMSA9IHBhbGV0dGVPdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGlmICghcmVnaW9uMSAmJiBjb2xvciA9PT0gY29sb3IxKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHIpXHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0ID49IDApIHtcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0MSA9IG9mZnNldCAtIHdpZHRoXHJcbiAgICAgICAgICAgIGNvbnN0IHJlZ2lvbjEgPSByZWdpb25PdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbG9yMSA9IHBhbGV0dGVPdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGlmICghcmVnaW9uMSAmJiBjb2xvciA9PT0gY29sb3IxKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHgpXHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChiIDwgaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldDEgPSBvZmZzZXQgKyB3aWR0aFxyXG4gICAgICAgICAgICBjb25zdCByZWdpb24xID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBjb25zdCBjb2xvcjEgPSBwYWxldHRlT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBpZiAoIXJlZ2lvbjEgJiYgY29sb3IgPT09IGNvbG9yMSkge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh4KVxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaChiKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3Qm9yZGVycyhyZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5LCBpbWFnZURhdGE6IEltYWdlRGF0YSkge1xyXG4gICAgLy8gY29sb3IgYm9yZGVyc1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBkYXRhIH0gPSBpbWFnZURhdGFcclxuICAgIGltYWdpbmcuc2NhbkltYWdlRGF0YShpbWFnZURhdGEsICh4LCB5LCBvZmZzZXQpID0+IHtcclxuICAgICAgICBjb25zdCByZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldF1cclxuICAgICAgICBpZiAoIXJlZ2lvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGwgPSB4IC0gMVxyXG4gICAgICAgIGNvbnN0IHIgPSB4ICsgMVxyXG4gICAgICAgIGNvbnN0IHQgPSB5IC0gMVxyXG4gICAgICAgIGNvbnN0IGIgPSB5ICsgMVxyXG5cclxuICAgICAgICAvLyBlZGdlIGNlbGxzIGFyZSBub3QgYm9yZGVyIChmb3Igbm93KVxyXG4gICAgICAgIGlmIChsIDwgMCB8fCByID49IHdpZHRoIHx8IHQgPCAwIHx8IGIgPj0gaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbFJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0IC0gMV1cclxuICAgICAgICBpZiAobFJlZ2lvbiAmJiBsUmVnaW9uICE9PSByZWdpb24pIHtcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0XSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMV0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDJdID0gMFxyXG4gICAgICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCByUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQgKyAxXVxyXG4gICAgICAgIGlmIChyUmVnaW9uICYmIHJSZWdpb24gIT09IHJlZ2lvbikge1xyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDRdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAxXSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMl0gPSAwXHJcbiAgICAgICAgICAgIHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRSZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldCAtIHdpZHRoXVxyXG4gICAgICAgIGlmICh0UmVnaW9uICYmIHRSZWdpb24gIT09IHJlZ2lvbikge1xyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDRdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAxXSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMl0gPSAwXHJcbiAgICAgICAgICAgIHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGJSZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldCArIHdpZHRoXVxyXG4gICAgICAgIGlmIChiUmVnaW9uICYmIGJSZWdpb24gIT09IHJlZ2lvbikge1xyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDRdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAxXSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMl0gPSAwXHJcbiAgICAgICAgICAgIHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9IG51bGxcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBmaWxsSW50ZXJpb3IoZGF0YTogVWludDhDbGFtcGVkQXJyYXksIHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkpIHtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVnaW9uT3ZlcmxheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IHJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbaV1cclxuICAgICAgICBpZiAoIXJlZ2lvbikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGF0YVtpICogNF0gPSAyNTVcclxuICAgICAgICBkYXRhW2kgKiA0ICsgMV0gPSAyNTVcclxuICAgICAgICBkYXRhW2kgKiA0ICsgMl0gPSAyNTVcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlUGFsZXR0ZVVpKHBhbGV0dGU6IGltYWdpbmcuQ29sb3JbXSkge1xyXG4gICAgdXRpbC5yZW1vdmVBbGxDaGlsZHJlbihwYWxldHRlRGl2KVxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYWxldHRlLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgY29sb3IgPSBwYWxldHRlW2ldXHJcbiAgICAgICAgY29uc3QgbHVtID0gaW1hZ2luZy5jYWxjTHVtaW5hbmNlKGNvbG9yKVxyXG4gICAgICAgIGNvbnN0IGZyYWdtZW50ID0gcGFsZXR0ZUVudHJ5VGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgIGNvbnN0IGVudHJ5RGl2ID0gdXRpbC5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5wYWxldHRlLWVudHJ5XCIpIGFzIEhUTUxFbGVtZW50XHJcbiAgICAgICAgZW50cnlEaXYudGV4dENvbnRlbnQgPSBgJHtpICsgMX1gXHJcbiAgICAgICAgZW50cnlEaXYuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gYHJnYigke2NvbG9yWzBdfSwgJHtjb2xvclsxXX0sICR7Y29sb3JbMl19KWBcclxuICAgICAgICBlbnRyeURpdi5zdHlsZS5jb2xvciA9IGx1bSA8IC41ID8gXCJ3aGl0ZVwiIDogXCJibGFja1wiXHJcbiAgICAgICAgcGFsZXR0ZURpdi5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd1JlZ2lvbkxhYmVscyhjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgcmVnaW9uczogUmVnaW9uW10pIHtcclxuICAgIGN0eC5mb250ID0gXCIxNnB4IGFyaWFsIGJvbGRcIlxyXG4gICAgY29uc3QgdGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGhcclxuICAgIGNvbnN0IGZvbnQgPSBjdHguZm9udFxyXG5cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvbnMpIHtcclxuICAgICAgICBpZiAocmVnaW9uLmNvbG9yID09PSAtMSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbGFiZWwgPSBgJHtyZWdpb24uY29sb3IgKyAxfWBcclxuICAgICAgICBjb25zdCBtZXRyaWNzID0gY3R4Lm1lYXN1cmVUZXh0KGxhYmVsKVxyXG4gICAgICAgIGNvbnN0IGNlbnRlciA9IGNhbGNDZW50ZXIocmVnaW9uLm1heFJlY3QpXHJcbiAgICAgICAgY29uc3QgeCA9IGNlbnRlclswXSAtIG1ldHJpY3Mud2lkdGggLyAyXHJcbiAgICAgICAgY29uc3QgeSA9IGNlbnRlclsxXSArIHRleHRIZWlnaHQgLyAyXHJcbiAgICAgICAgY3R4LmZpbGxUZXh0KGxhYmVsLCB4LCB5KVxyXG4gICAgfVxyXG5cclxuICAgIGN0eC5mb250ID0gZm9udFxyXG59Il19