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
    const [palette, paletteOverlay] = palettize(imageData, 3, 8);
    imaging.applyPalette(palette, paletteOverlay, imageData);
    let [regions, regionOverlay] = createRegionOverlay(width, height, paletteOverlay);
    regions = pruneRegions(width, height, regions, regionOverlay);
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
    for (const region of regions) {
        if (region.pixels <= 32) {
            regionSet.delete(region);
        }
    }
    calcRegionBounds(width, height, regionOverlay);
    for (const region of regionSet) {
        if (calcWidth(region.bounds) <= 16) {
            regionSet.delete(region);
        }
        if (calcHeight(region.bounds) <= 16) {
            regionSet.delete(region);
        }
    }
    // calculate maximal rec for each region
    for (const region of regionSet) {
        region.maxRect = calcMaxRegionRect(width, region, regionOverlay);
    }
    for (const region of regionSet) {
        if (calcArea(region.maxRect) < 32) {
            regionSet.delete(region);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQUUvQyxJQUFLLFVBSUo7QUFKRCxXQUFLLFVBQVU7SUFDWCwyQ0FBSSxDQUFBO0lBQ0osMkNBQUksQ0FBQTtJQUNKLHlEQUFXLENBQUE7QUFDZixDQUFDLEVBSkksVUFBVSxLQUFWLFVBQVUsUUFJZDtBQVNELFNBQVMsU0FBUyxDQUFDLE1BQWM7SUFDN0IsT0FBTyxNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO0FBQ3hDLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxNQUFjO0lBQzlCLE9BQU8sTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtBQUN4QyxDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsTUFBYztJQUM1QixPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDakQsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLE1BQWM7SUFDOUIsT0FBTztRQUNILE1BQU0sQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDbkMsTUFBTSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztLQUN2QyxDQUFBO0FBQ0wsQ0FBQztBQVdELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFxQixDQUFBO0FBQ3RELElBQUksVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUE7QUFDaEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQXNCLENBQUE7QUFDdkQsTUFB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RUQsU0FBUyxnQkFBZ0IsQ0FBQyxHQUE2QixFQUFFLE9BQWlCO0lBQ3RFLEdBQUcsQ0FBQyxJQUFJLEdBQUcsaUJBQWlCLENBQUE7SUFDNUIsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUE7SUFDN0MsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQTtJQUVyQixLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRTtRQUMxQixJQUFJLE1BQU0sQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDckIsU0FBUTtTQUNYO1FBRUQsTUFBTSxLQUFLLEdBQUcsR0FBRyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFBO1FBQ25DLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdEMsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN6QyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxDQUFDLENBQUE7UUFDcEMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0tBQzVCO0lBRUQsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7QUFDbkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHV0aWwgZnJvbSBcIi4uL3NoYXJlZC91dGlsLmpzXCJcclxuaW1wb3J0ICogYXMgaW1hZ2luZyBmcm9tIFwiLi4vc2hhcmVkL2ltYWdpbmcuanNcIlxyXG5cclxuZW51bSBDYW1lcmFNb2RlIHtcclxuICAgIE5vbmUsXHJcbiAgICBVc2VyLFxyXG4gICAgRW52aXJvbm1lbnQsXHJcbn1cclxuXHJcbmludGVyZmFjZSBCb3VuZHMge1xyXG4gICAgbWluWDogbnVtYmVyXHJcbiAgICBtYXhYOiBudW1iZXJcclxuICAgIG1pblk6IG51bWJlclxyXG4gICAgbWF4WTogbnVtYmVyXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGNXaWR0aChib3VuZHM6IEJvdW5kcyk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gYm91bmRzLm1heFggLSBib3VuZHMubWluWCArIDFcclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY0hlaWdodChib3VuZHM6IEJvdW5kcyk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gYm91bmRzLm1heFkgLSBib3VuZHMubWluWSArIDFcclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY0FyZWEoYm91bmRzOiBCb3VuZHMpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIGNhbGNXaWR0aChib3VuZHMpICogY2FsY0hlaWdodChib3VuZHMpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGNDZW50ZXIoYm91bmRzOiBCb3VuZHMpOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIHJldHVybiBbXHJcbiAgICAgICAgYm91bmRzLm1pblggKyBjYWxjV2lkdGgoYm91bmRzKSAvIDIsXHJcbiAgICAgICAgYm91bmRzLm1pblkgKyBjYWxjSGVpZ2h0KGJvdW5kcykgLyAyXHJcbiAgICBdXHJcbn1cclxuXHJcbmludGVyZmFjZSBSZWdpb24ge1xyXG4gICAgY29sb3I6IG51bWJlclxyXG4gICAgcGl4ZWxzOiBudW1iZXJcclxuICAgIGJvdW5kczogQm91bmRzXHJcbiAgICBtYXhSZWN0OiBCb3VuZHNcclxufVxyXG5cclxudHlwZSBSZWdpb25PdmVybGF5ID0gKFJlZ2lvbiB8IG51bGwpW11cclxuXHJcbmNvbnN0IGNhbWVyYSA9IHV0aWwuYnlJZChcImNhbWVyYVwiKSBhcyBIVE1MVmlkZW9FbGVtZW50XHJcbmxldCBjYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Ob25lXHJcbmNvbnN0IGNhbnZhcyA9IHV0aWwuYnlJZChcImNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG5jb25zdCBhY3F1aXJlSW1hZ2VEaXYgPSB1dGlsLmJ5SWQoXCJhY3F1aXJlSW1hZ2VcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuY29uc3QgcGFsZXR0ZURpdiA9IHV0aWwuYnlJZChcInBhbGV0dGVcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuY29uc3QgcGFsZXR0ZUVudHJ5VGVtcGxhdGUgPSB1dGlsLmJ5SWQoXCJwYWxldHRlRW50cnlcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG5cclxuY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKSBhcyBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkRcclxuaWYgKCFjdHgpIHtcclxuICAgIHRocm93RXJyb3JNZXNzYWdlKFwiQ2FudmFzIGVsZW1lbnQgbm90IHN1cHBvcnRlZFwiKVxyXG59XHJcblxyXG5jb25zdCBjYXB0dXJlSW1hZ2VCdXR0b24gPSB1dGlsLmJ5SWQoXCJjYXB0dXJlSW1hZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuY29uc3QgbG9hZFVpID0gdXRpbC5ieUlkKFwibG9hZFVpXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbmNvbnN0IHBsYXlVaSA9IHV0aWwuYnlJZChcInBsYXlVaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5cclxuaW5pdCgpXHJcblxyXG5hc3luYyBmdW5jdGlvbiBpbml0KCkge1xyXG4gICAgY29uc3QgZmlsZURyb3BCb3ggPSB1dGlsLmJ5SWQoXCJmaWxlRHJvcEJveFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgY29uc3QgZmlsZUlucHV0ID0gdXRpbC5ieUlkKFwiZmlsZUlucHV0XCIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcclxuICAgIGNvbnN0IGZpbGVCdXR0b24gPSB1dGlsLmJ5SWQoXCJmaWxlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBjb25zdCB1c2VDYW1lcmFCdXR0b24gPSB1dGlsLmJ5SWQoXCJ1c2VDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIGNvbnN0IGZsaXBDYW1lcmFCdXR0b24gPSB1dGlsLmJ5SWQoXCJmbGlwQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBjb25zdCBzdG9wQ2FtZXJhQnV0dG9uID0gdXRpbC5ieUlkKFwic3RvcENhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgY29uc3QgcmV0dXJuQnV0dG9uID0gdXRpbC5ieUlkKFwicmV0dXJuQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcblxyXG4gICAgZmlsZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgIGZpbGVJbnB1dC5jbGljaygpXHJcbiAgICB9KVxyXG5cclxuICAgIGZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnZW50ZXJcIiwgb25EcmFnRW50ZXJPdmVyKVxyXG4gICAgZmlsZURyb3BCb3guYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdvdmVyXCIsIG9uRHJhZ0VudGVyT3ZlcilcclxuICAgIGZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcm9wXCIsIG9uRmlsZURyb3ApXHJcblxyXG4gICAgZmlsZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4ge1xyXG4gICAgICAgIGlmICghZmlsZUlucHV0LmZpbGVzPy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmaWxlID0gZmlsZUlucHV0LmZpbGVzWzBdXHJcbiAgICAgICAgcHJvY2Vzc0ZpbGUoZmlsZSlcclxuICAgIH0pXHJcblxyXG4gICAgdXNlQ2FtZXJhQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB1c2VDYW1lcmEpXHJcbiAgICBmbGlwQ2FtZXJhQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmbGlwQ2FtZXJhKVxyXG4gICAgc3RvcENhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgc3RvcENhbWVyYSlcclxuICAgIGNhcHR1cmVJbWFnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY2FwdHVyZUltYWdlKVxyXG4gICAgcmV0dXJuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBzaG93TG9hZFVpKVxyXG59XHJcblxyXG5mdW5jdGlvbiBvbkRyYWdFbnRlck92ZXIoZXY6IERyYWdFdmVudCkge1xyXG4gICAgZXYuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxufVxyXG5cclxuZnVuY3Rpb24gb25GaWxlRHJvcChldjogRHJhZ0V2ZW50KSB7XHJcbiAgICBldi5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgZXYucHJldmVudERlZmF1bHQoKVxyXG5cclxuICAgIGlmICghZXY/LmRhdGFUcmFuc2Zlcj8uZmlsZXM/Lmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGZpbGUgPSBldi5kYXRhVHJhbnNmZXIuZmlsZXNbMF1cclxuICAgIHByb2Nlc3NGaWxlKGZpbGUpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByb2Nlc3NGaWxlKGZpbGU6IEZpbGUpIHtcclxuICAgIGNsZWFyRXJyb3JNZXNzYWdlcygpXHJcbiAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpXHJcbiAgICBsb2FkRnJvbVVybCh1cmwpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRGcm9tVXJsKHVybDogc3RyaW5nKSB7XHJcbiAgICBjbGVhckVycm9yTWVzc2FnZXMoKVxyXG4gICAgY29uc3QgaW1nID0gbmV3IEltYWdlKClcclxuICAgIGltZy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgc2hvd1BsYXlVaShpbWcsIGltZy53aWR0aCwgaW1nLmhlaWdodClcclxuICAgIH0pXHJcblxyXG4gICAgaW1nLnNyYyA9IHVybFxyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhckVycm9yTWVzc2FnZXMoKSB7XHJcbiAgICBjb25zdCBlcnJvcnNEaXYgPSB1dGlsLmJ5SWQoXCJlcnJvcnNcIilcclxuICAgIHV0aWwucmVtb3ZlQWxsQ2hpbGRyZW4oZXJyb3JzRGl2KVxyXG59XHJcblxyXG5mdW5jdGlvbiBhcHBlbmRFcnJvck1lc3NhZ2UoZXJyb3I6IHN0cmluZykge1xyXG4gICAgY29uc29sZS5sb2coZXJyb3IpXHJcbiAgICBjb25zdCBlcnJvcnNEaXYgPSB1dGlsLmJ5SWQoXCJlcnJvcnNcIik7XHJcbiAgICBjb25zdCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgZGl2LmNsYXNzTGlzdC5hZGQoXCJlcnJvci1tZXNzYWdlXCIpXHJcbiAgICBkaXYudGV4dENvbnRlbnQgPSBlcnJvclxyXG4gICAgZXJyb3JzRGl2LmFwcGVuZENoaWxkKGRpdilcclxufVxyXG5cclxuZnVuY3Rpb24gdGhyb3dFcnJvck1lc3NhZ2UoZXJyb3I6IHN0cmluZykge1xyXG4gICAgYXBwZW5kRXJyb3JNZXNzYWdlKGVycm9yKVxyXG4gICAgdGhyb3cgbmV3IEVycm9yKGVycm9yKVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiB1c2VDYW1lcmEoKSB7XHJcbiAgICBhY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgIGNvbnN0IGRpYWxvZ1dpZHRoID0gYWNxdWlyZUltYWdlRGl2LmNsaWVudFdpZHRoXHJcbiAgICBjb25zdCBkaWFsb2dIZWlnaHQgPSBhY3F1aXJlSW1hZ2VEaXYuY2xpZW50SGVpZ2h0XHJcbiAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7XHJcbiAgICAgICAgdmlkZW86IHsgd2lkdGg6IHsgbWF4OiBkaWFsb2dXaWR0aCB9LCBoZWlnaHQ6IHsgbWF4OiBkaWFsb2dIZWlnaHQgfSwgZmFjaW5nTW9kZTogXCJ1c2VyXCIgfSxcclxuICAgICAgICBhdWRpbzogZmFsc2VcclxuICAgIH0pXHJcblxyXG4gICAgY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuVXNlclxyXG4gICAgY2FtZXJhLnNyY09iamVjdCA9IHN0cmVhbVxyXG4gICAgY2FtZXJhLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRtZXRhZGF0YVwiLCBvbkNhbWVyYUxvYWQpXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGZsaXBDYW1lcmEoKSB7XHJcbiAgICBpZiAoIWNhbWVyYS5zcmNPYmplY3QpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzcmMgPSBjYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICBjb25zdCB0cmFja3MgPSBzcmMuZ2V0VHJhY2tzKClcclxuICAgIGZvciAoY29uc3QgdHJhY2sgb2YgdHJhY2tzKSB7XHJcbiAgICAgICAgdHJhY2suc3RvcCgpXHJcbiAgICB9XHJcblxyXG4gICAgY2FtZXJhTW9kZSA9IGNhbWVyYU1vZGUgPT0gQ2FtZXJhTW9kZS5Vc2VyID8gQ2FtZXJhTW9kZS5FbnZpcm9ubWVudCA6IENhbWVyYU1vZGUuVXNlclxyXG4gICAgY29uc3QgZmFjaW5nTW9kZSA9IGNhbWVyYU1vZGUgPT0gQ2FtZXJhTW9kZS5Vc2VyID8gXCJ1c2VyXCIgOiBcImVudmlyb25tZW50XCJcclxuXHJcbiAgICAvLyBnZXQgY3VycmVudCBmYWNpbmcgbW9kZVxyXG4gICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xyXG4gICAgICAgIHZpZGVvOiB7IHdpZHRoOiBjYW1lcmEuY2xpZW50V2lkdGgsIGhlaWdodDogY2FtZXJhLmNsaWVudEhlaWdodCwgZmFjaW5nTW9kZTogZmFjaW5nTW9kZSB9LFxyXG4gICAgICAgIGF1ZGlvOiBmYWxzZVxyXG4gICAgfSlcclxuXHJcbiAgICBjYW1lcmEuc3JjT2JqZWN0ID0gc3RyZWFtXHJcbiAgICBjYW1lcmEuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZG1ldGFkYXRhXCIsIG9uQ2FtZXJhTG9hZClcclxufVxyXG5cclxuZnVuY3Rpb24gb25DYW1lcmFMb2FkKCkge1xyXG4gICAgY29uc29sZS5sb2coY2FtZXJhLmNsaWVudFdpZHRoLCBjYW1lcmEuY2xpZW50SGVpZ2h0LCBjYW1lcmEud2lkdGgsIGNhbWVyYS5oZWlnaHQsIGNhbWVyYS52aWRlb1dpZHRoLCBjYW1lcmEudmlkZW9IZWlnaHQpXHJcbiAgICBhY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgIGNhbWVyYS5wbGF5KClcclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN0b3BDYW1lcmEoKSB7XHJcbiAgICBjb25zdCBzcmMgPSBjYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICBpZiAoIXNyYykge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHRyYWNrcyA9IHNyYy5nZXRUcmFja3MoKVxyXG4gICAgZm9yIChjb25zdCB0cmFjayBvZiB0cmFja3MpIHtcclxuICAgICAgICB0cmFjay5zdG9wKClcclxuICAgIH1cclxuXHJcbiAgICBjYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Ob25lXHJcbiAgICBhY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYXB0dXJlSW1hZ2UoKSB7XHJcbiAgICBjbGVhckVycm9yTWVzc2FnZXMoKVxyXG5cclxuICAgIGNvbnN0IHNyYyA9IGNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgIGlmICghc3JjKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdHJhY2sgPSBzcmMuZ2V0VmlkZW9UcmFja3MoKVswXVxyXG4gICAgaWYgKCF0cmFjaykge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIHNob3dQbGF5VWkoY2FtZXJhLCBjYW1lcmEudmlkZW9XaWR0aCwgY2FtZXJhLnZpZGVvSGVpZ2h0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2hvd1BsYXlVaShpbWc6IENhbnZhc0ltYWdlU291cmNlLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcikge1xyXG4gICAgLy8gbWFpbnRhaW4gYXNwZWN0IHJhdGlvIVxyXG4gICAgY29uc3QgdncgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGhcclxuICAgIGNvbnN0IHZoID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodFxyXG5cclxuICAgIGlmICh2dyA8IHZoKSB7XHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gdndcclxuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gdncgKiBoZWlnaHQgLyB3aWR0aFxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gdmhcclxuICAgICAgICBjYW52YXMud2lkdGggPSB2aCAqIHdpZHRoIC8gaGVpZ2h0XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZFVpLmhpZGRlbiA9IHRydWVcclxuICAgIHBsYXlVaS5oaWRkZW4gPSBmYWxzZVxyXG5cclxuICAgIGN0eC5kcmF3SW1hZ2UoaW1nLCAwLCAwLCBjYW52YXMuY2xpZW50V2lkdGgsIGNhbnZhcy5jbGllbnRIZWlnaHQpXHJcbiAgICBwcm9jZXNzSW1hZ2UoKVxyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93TG9hZFVpKCkge1xyXG4gICAgbG9hZFVpLmhpZGRlbiA9IGZhbHNlXHJcbiAgICBwbGF5VWkuaGlkZGVuID0gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiBwcm9jZXNzSW1hZ2UoKSB7XHJcbiAgICAvLyBnZXQgKGZsYXQpIGltYWdlIGRhdGEgZnJvbSBjYW52YXNcclxuICAgIGNvbnN0IGltYWdlRGF0YSA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KVxyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBpbWFnZURhdGFcclxuXHJcbiAgICAvLyBjb252ZXJ0IHRvIHh5eiBjb2xvcnMgYW5kIHBhbGV0dGl6ZSBkYXRhXHJcbiAgICBjb25zdCBbcGFsZXR0ZSwgcGFsZXR0ZU92ZXJsYXldID0gcGFsZXR0aXplKGltYWdlRGF0YSwgMywgOClcclxuICAgIGltYWdpbmcuYXBwbHlQYWxldHRlKHBhbGV0dGUsIHBhbGV0dGVPdmVybGF5LCBpbWFnZURhdGEpXHJcblxyXG4gICAgbGV0IFtyZWdpb25zLCByZWdpb25PdmVybGF5XSA9IGNyZWF0ZVJlZ2lvbk92ZXJsYXkod2lkdGgsIGhlaWdodCwgcGFsZXR0ZU92ZXJsYXkpXHJcbiAgICByZWdpb25zID0gcHJ1bmVSZWdpb25zKHdpZHRoLCBoZWlnaHQsIHJlZ2lvbnMsIHJlZ2lvbk92ZXJsYXkpXHJcbiAgICBkcmF3Qm9yZGVycyhyZWdpb25PdmVybGF5LCBpbWFnZURhdGEpXHJcbiAgICBmaWxsSW50ZXJpb3IoaW1hZ2VEYXRhLmRhdGEsIHJlZ2lvbk92ZXJsYXkpXHJcbiAgICBjdHgucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMClcclxuICAgIGNyZWF0ZVBhbGV0dGVVaShwYWxldHRlKVxyXG4gICAgZHJhd1JlZ2lvbkxhYmVscyhjdHgsIHJlZ2lvbnMpXHJcbn1cclxuXHJcbi8vIHNwZWNpYWxpemVkIHRvIGlnbm9yZSB3aGl0ZVxyXG5mdW5jdGlvbiBwYWxldHRpemUoaW1hZ2VEYXRhOiBJbWFnZURhdGEsIGJ1Y2tldHNQZXJDb21wb25lbnQ6IG51bWJlciwgbWF4Q29sb3JzOiBudW1iZXIpOiBbaW1hZ2luZy5Db2xvcltdLCBudW1iZXJbXV0ge1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBkYXRhIH0gPSBpbWFnZURhdGFcclxuICAgIGNvbnN0IHBpeGVscyA9IHdpZHRoICogaGVpZ2h0XHJcbiAgICBjb25zdCBidWNrZXRQaXRjaCA9IGJ1Y2tldHNQZXJDb21wb25lbnQgKiBidWNrZXRzUGVyQ29tcG9uZW50XHJcbiAgICBjb25zdCBudW1CdWNrZXRzID0gYnVja2V0UGl0Y2ggKiBidWNrZXRzUGVyQ29tcG9uZW50XHJcblxyXG4gICAgLy8gY3JlYXQgaW50aWFsIGJ1Y2tldHNcclxuICAgIGxldCBidWNrZXRzID0gdXRpbC5nZW5lcmF0ZShudW1CdWNrZXRzLCAoKSA9PiAoeyBjb2xvcjogWzAsIDAsIDBdIGFzIFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSwgcGl4ZWxzOiAwIH0pKVxyXG5cclxuICAgIC8vIGFzc2lnbiBhbmQgdXBkYXRlIGJ1Y2tldCBmb3IgZWFjaCBwaXhlbFxyXG4gICAgY29uc3QgYnVja2V0T3ZlcmxheSA9IHV0aWwuZ2VuZXJhdGUocGl4ZWxzLCBpID0+IHtcclxuICAgICAgICBjb25zdCByID0gZGF0YVtpICogNF0gLyAyNTVcclxuICAgICAgICBjb25zdCBnID0gZGF0YVtpICogNCArIDFdIC8gMjU1XHJcbiAgICAgICAgY29uc3QgYiA9IGRhdGFbaSAqIDQgKyAyXSAvIDI1NVxyXG5cclxuICAgICAgICAvLyBpZ25vcmUgd2hpdGVcclxuICAgICAgICBpZiAociA+PSAuOTUgJiYgZyA+PSAuOTUgJiYgYiA+PSAuOTUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHJiID0gTWF0aC5taW4oTWF0aC5mbG9vcihyICogYnVja2V0c1BlckNvbXBvbmVudCksIGJ1Y2tldHNQZXJDb21wb25lbnQgLSAxKVxyXG4gICAgICAgIGNvbnN0IGdiID0gTWF0aC5taW4oTWF0aC5mbG9vcihnICogYnVja2V0c1BlckNvbXBvbmVudCksIGJ1Y2tldHNQZXJDb21wb25lbnQgLSAxKVxyXG4gICAgICAgIGNvbnN0IGJiID0gTWF0aC5taW4oTWF0aC5mbG9vcihiICogYnVja2V0c1BlckNvbXBvbmVudCksIGJ1Y2tldHNQZXJDb21wb25lbnQgLSAxKVxyXG5cclxuICAgICAgICBjb25zdCBidWNrZXRJZHggPSByYiAqIGJ1Y2tldFBpdGNoICsgZ2IgKiBidWNrZXRzUGVyQ29tcG9uZW50ICsgYmJcclxuICAgICAgICBjb25zdCBidWNrZXQgPSBidWNrZXRzW2J1Y2tldElkeF1cclxuICAgICAgICBidWNrZXQuY29sb3IgPSBpbWFnaW5nLmFkZFhZWihbciwgZywgYl0sIGJ1Y2tldC5jb2xvcilcclxuICAgICAgICBidWNrZXQucGl4ZWxzKytcclxuICAgICAgICByZXR1cm4gYnVja2V0XHJcbiAgICB9KVxyXG5cclxuICAgIC8vIHBydW5lIGVtcHR5IGJ1Y2tldHNcclxuICAgIGJ1Y2tldHMgPSBidWNrZXRzLmZpbHRlcihiID0+IGIucGl4ZWxzID4gMClcclxuXHJcbiAgICAvLyBjYWxjdWxhdGUgYnVja2V0IGNvbG9yc1xyXG4gICAgZm9yIChjb25zdCBidWNrZXQgb2YgYnVja2V0cykge1xyXG4gICAgICAgIGJ1Y2tldC5jb2xvciA9IGltYWdpbmcuZGl2WFlaKGJ1Y2tldC5jb2xvciwgYnVja2V0LnBpeGVscylcclxuICAgIH1cclxuXHJcbiAgICAvLyBjb21iaW5lIGJ1Y2tldHMgdGhhdCBhcmUgdmVyeSBjbG9zZSBpbiBjb2xvciBhZnRlciBjb2xvciBhdmVyYWdpbmdcclxuICAgIGxldCBidWNrZXRTZXQgPSBuZXcgU2V0KGJ1Y2tldHMpXHJcbiAgICB3aGlsZSAoYnVja2V0U2V0LnNpemUgPiAxKSB7XHJcbiAgICAgICAgLy8gcHJvY2VlZCBmb3IgYXMgbG9uZyBhcyBidWNrZXRzIGNhbiBiZSBjb21iaW5lZFxyXG4gICAgICAgIGxldCBtZXJnZSA9IGZhbHNlXHJcbiAgICAgICAgZm9yIChjb25zdCBidWNrZXQgb2YgYnVja2V0U2V0KSB7XHJcbiAgICAgICAgICAgIC8vIGZpbmQgXCJuZWFyZXN0XCIgY29sb3JcclxuICAgICAgICAgICAgY29uc3QgbmVhcmVzdCA9IFsuLi5idWNrZXRTZXRdXHJcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGIgPT4gYiAhPSBidWNrZXQpXHJcbiAgICAgICAgICAgICAgICAucmVkdWNlKChiMSwgYjIpID0+IGltYWdpbmcuY2FsY0Rpc3RTcShidWNrZXQuY29sb3IsIGIxLmNvbG9yKSA8IGltYWdpbmcuY2FsY0Rpc3RTcShidWNrZXQuY29sb3IsIGIyLmNvbG9yKSA/IGIxIDogYjIpXHJcblxyXG4gICAgICAgICAgICBjb25zdCBkaXN0U3EgPSBpbWFnaW5nLmNhbGNEaXN0U3EoYnVja2V0LmNvbG9yLCBuZWFyZXN0LmNvbG9yKVxyXG4gICAgICAgICAgICBpZiAoZGlzdFNxID4gLjEpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIG1lcmdlIHRoZSBidWNrZXRzXHJcbiAgICAgICAgICAgIGJ1Y2tldC5jb2xvciA9IGltYWdpbmcuZGl2WFlaKFxyXG4gICAgICAgICAgICAgICAgaW1hZ2luZy5hZGRYWVooaW1hZ2luZy5tdWxYWVooYnVja2V0LmNvbG9yLCBidWNrZXQucGl4ZWxzKSwgaW1hZ2luZy5tdWxYWVoobmVhcmVzdC5jb2xvciwgbmVhcmVzdC5waXhlbHMpKSxcclxuICAgICAgICAgICAgICAgIGJ1Y2tldC5waXhlbHMgKyBuZWFyZXN0LnBpeGVscylcclxuXHJcbiAgICAgICAgICAgIGJ1Y2tldFNldC5kZWxldGUobmVhcmVzdClcclxuICAgICAgICAgICAgbWVyZ2UgPSB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIW1lcmdlKSB7XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGJ1Y2tldHMgPSBbLi4uYnVja2V0U2V0XVxyXG4gICAgICAgIC5zb3J0KChiMSwgYjIpID0+IGIyLnBpeGVscyAtIGIxLnBpeGVscylcclxuICAgICAgICAuc2xpY2UoMCwgbWF4Q29sb3JzKVxyXG5cclxuICAgIC8vIG1hcCBhbGwgY29sb3JzIHRvIHRvcCBOIGJ1Y2tldHNcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVja2V0T3ZlcmxheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIC8vIG90aGVyd2lzZSwgbWFwIHRvIG5ldyBidWNrZXRcclxuICAgICAgICBjb25zdCByID0gZGF0YVtpICogNF0gLyAyNTVcclxuICAgICAgICBjb25zdCBnID0gZGF0YVtpICogNCArIDFdIC8gMjU1XHJcbiAgICAgICAgY29uc3QgYiA9IGRhdGFbaSAqIDQgKyAyXSAvIDI1NVxyXG5cclxuICAgICAgICBpZiAociA+PSAuOTUgJiYgZyA+PSAuOTUgJiYgYiA+PSAuOTUpIHtcclxuICAgICAgICAgICAgYnVja2V0T3ZlcmxheVtpXSA9IG51bGxcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbG9yOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0gPSBbciwgZywgYl1cclxuICAgICAgICBjb25zdCBidWNrZXQgPSBidWNrZXRzLnJlZHVjZSgoYjEsIGIyKSA9PiBpbWFnaW5nLmNhbGNEaXN0U3EoYjEuY29sb3IsIGNvbG9yKSA8IGltYWdpbmcuY2FsY0Rpc3RTcShiMi5jb2xvciwgY29sb3IpID8gYjEgOiBiMilcclxuICAgICAgICBidWNrZXRPdmVybGF5W2ldID0gYnVja2V0XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZGV0ZXJtaW5lIHBhbGV0dGUgY29sb3JzXHJcbiAgICBjb25zdCBwYWxldHRlID0gYnVja2V0cy5tYXAoYiA9PiBpbWFnaW5nLm11bFhZWihiLmNvbG9yLCAyNTUpKVxyXG4gICAgY29uc3QgcGFsZXR0ZU92ZXJsYXkgPSBidWNrZXRPdmVybGF5Lm1hcChiID0+IGIgPyBidWNrZXRzLmluZGV4T2YoYikgOiAtMSlcclxuICAgIHJldHVybiBbcGFsZXR0ZSwgcGFsZXR0ZU92ZXJsYXldXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVJlZ2lvbk92ZXJsYXkod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSk6IFtSZWdpb25bXSwgUmVnaW9uT3ZlcmxheV0ge1xyXG4gICAgY29uc3QgcmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSA9IHV0aWwuZmlsbChudWxsLCB3aWR0aCAqIGhlaWdodClcclxuICAgIGNvbnN0IHJlZ2lvbnM6IFJlZ2lvbltdID0gW11cclxuXHJcbiAgICBpbWFnaW5nLnNjYW4od2lkdGgsIGhlaWdodCwgKHgsIHksIG9mZnNldCkgPT4ge1xyXG4gICAgICAgIGlmIChyZWdpb25PdmVybGF5W29mZnNldF0pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCByZWdpb246IFJlZ2lvbiA9IHtcclxuICAgICAgICAgICAgY29sb3I6IHBhbGV0dGVPdmVybGF5W29mZnNldF0sXHJcbiAgICAgICAgICAgIHBpeGVsczogMCxcclxuICAgICAgICAgICAgYm91bmRzOiB7XHJcbiAgICAgICAgICAgICAgICBtaW5YOiBJbmZpbml0eSxcclxuICAgICAgICAgICAgICAgIG1heFg6IC0xLFxyXG4gICAgICAgICAgICAgICAgbWluWTogSW5maW5pdHksXHJcbiAgICAgICAgICAgICAgICBtYXhZOiAtMVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBtYXhSZWN0OiB7XHJcbiAgICAgICAgICAgICAgICBtaW5YOiBJbmZpbml0eSxcclxuICAgICAgICAgICAgICAgIG1heFg6IC0xLFxyXG4gICAgICAgICAgICAgICAgbWluWTogSW5maW5pdHksXHJcbiAgICAgICAgICAgICAgICBtYXhZOiAtMVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSByZWdpb25cclxuICAgICAgICByZWdpb25zLnB1c2gocmVnaW9uKVxyXG4gICAgICAgIGV4cGxvcmVSZWdpb24od2lkdGgsIGhlaWdodCwgcGFsZXR0ZU92ZXJsYXksIHgsIHksIHJlZ2lvbk92ZXJsYXkpXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIHBydW5lIHNvbWUgcmVnaW9uc1xyXG4gICAgcmV0dXJuIFtyZWdpb25zLCByZWdpb25PdmVybGF5XVxyXG59XHJcblxyXG5mdW5jdGlvbiBwcnVuZVJlZ2lvbnMod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHJlZ2lvbnM6IFJlZ2lvbltdLCByZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5KTogUmVnaW9uW10ge1xyXG4gICAgY29uc3QgcmVnaW9uU2V0ID0gbmV3IFNldChyZWdpb25zKVxyXG5cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvbnMpIHtcclxuICAgICAgICBpZiAocmVnaW9uLnBpeGVscyA8PSAzMikge1xyXG4gICAgICAgICAgICByZWdpb25TZXQuZGVsZXRlKHJlZ2lvbilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2FsY1JlZ2lvbkJvdW5kcyh3aWR0aCwgaGVpZ2h0LCByZWdpb25PdmVybGF5KVxyXG4gICAgZm9yIChjb25zdCByZWdpb24gb2YgcmVnaW9uU2V0KSB7XHJcbiAgICAgICAgaWYgKGNhbGNXaWR0aChyZWdpb24uYm91bmRzKSA8PSAxNikge1xyXG4gICAgICAgICAgICByZWdpb25TZXQuZGVsZXRlKHJlZ2lvbilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChjYWxjSGVpZ2h0KHJlZ2lvbi5ib3VuZHMpIDw9IDE2KSB7XHJcbiAgICAgICAgICAgIHJlZ2lvblNldC5kZWxldGUocmVnaW9uKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBjYWxjdWxhdGUgbWF4aW1hbCByZWMgZm9yIGVhY2ggcmVnaW9uXHJcbiAgICBmb3IgKGNvbnN0IHJlZ2lvbiBvZiByZWdpb25TZXQpIHtcclxuICAgICAgICByZWdpb24ubWF4UmVjdCA9IGNhbGNNYXhSZWdpb25SZWN0KHdpZHRoLCByZWdpb24sIHJlZ2lvbk92ZXJsYXkpXHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCByZWdpb24gb2YgcmVnaW9uU2V0KSB7XHJcbiAgICAgICAgaWYgKGNhbGNBcmVhKHJlZ2lvbi5tYXhSZWN0KSA8IDMyKSB7XHJcbiAgICAgICAgICAgIHJlZ2lvblNldC5kZWxldGUocmVnaW9uKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyB1cGRhdGUgdGhlIG92ZXJsYXlcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVnaW9uT3ZlcmxheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IHJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbaV1cclxuICAgICAgICBpZiAoIXJlZ2lvbikge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFyZWdpb25TZXQuaGFzKHJlZ2lvbikpIHtcclxuICAgICAgICAgICAgcmVnaW9uT3ZlcmxheVtpXSA9IG51bGxcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFsuLi5yZWdpb25TZXRdXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGNSZWdpb25Cb3VuZHMod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkpIHtcclxuICAgIGltYWdpbmcuc2Nhbih3aWR0aCwgaGVpZ2h0LCAoeCwgeSwgb2Zmc2V0KSA9PiB7XHJcbiAgICAgICAgY29uc3QgcmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXRdXHJcbiAgICAgICAgaWYgKCFyZWdpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBib3VuZHMgPSByZWdpb24uYm91bmRzXHJcbiAgICAgICAgYm91bmRzLm1pblggPSBNYXRoLm1pbihib3VuZHMubWluWCwgeClcclxuICAgICAgICBib3VuZHMubWF4WCA9IE1hdGgubWF4KGJvdW5kcy5tYXhYLCB4KVxyXG4gICAgICAgIGJvdW5kcy5taW5ZID0gTWF0aC5taW4oYm91bmRzLm1pblksIHkpXHJcbiAgICAgICAgYm91bmRzLm1heFkgPSBNYXRoLm1heChib3VuZHMubWF4WSwgeSlcclxuICAgIH0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGNNYXhSZWdpb25SZWN0KHJvd1BpdGNoOiBudW1iZXIsIHJlZ2lvbjogUmVnaW9uLCByZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5KTogQm91bmRzIHtcclxuICAgIC8vIGRlcml2ZWQgZnJvbSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy83MjQ1L3B1enpsZS1maW5kLWxhcmdlc3QtcmVjdGFuZ2xlLW1heGltYWwtcmVjdGFuZ2xlLXByb2JsZW1cclxuICAgIC8vIGFsZ29yaXRobSBuZWVkcyB0byBrZWVwIHRyYWNrIG9mIHJlY3RhbmdsZSBzdGF0ZSBmb3IgZXZlcnkgY29sdW1uIGZvciBldmVyeSByZWdpb25cclxuICAgIGNvbnN0IHsgbWluWDogeDAsIG1pblk6IHkwLCBtYXhYOiB4MSwgbWF4WTogeTEgfSA9IHJlZ2lvbi5ib3VuZHNcclxuICAgIGNvbnN0IHdpZHRoID0geDEgLSB4MCArIDFcclxuICAgIGNvbnN0IGhlaWdodCA9IHkxIC0geTAgKyAxXHJcbiAgICBjb25zdCBscyA9IHV0aWwuZmlsbCh4MCwgd2lkdGgpXHJcbiAgICBjb25zdCBycyA9IHV0aWwuZmlsbCh4MCArIHdpZHRoLCB3aWR0aClcclxuICAgIGNvbnN0IGhzID0gdXRpbC5maWxsKDAsIHdpZHRoKVxyXG5cclxuICAgIGxldCBtYXhBcmVhID0gMFxyXG4gICAgY29uc3QgYm91bmRzOiBCb3VuZHMgPSB7XHJcbiAgICAgICAgbWluWDogSW5maW5pdHksXHJcbiAgICAgICAgbWF4WDogLTEsXHJcbiAgICAgICAgbWluWTogSW5maW5pdHksXHJcbiAgICAgICAgbWF4WTogLTEsXHJcbiAgICB9XHJcblxyXG4gICAgaW1hZ2luZy5zY2FuUm93c1JlZ2lvbih5MCwgaGVpZ2h0LCByb3dQaXRjaCwgKHksIHlPZmZzZXQpID0+IHtcclxuICAgICAgICBsZXQgbCA9IHgwXHJcbiAgICAgICAgbGV0IHIgPSB4MCArIHdpZHRoXHJcblxyXG4gICAgICAgIC8vIGhlaWdodCBzY2FuXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IHgwOyB4IDwgeDE7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCBpID0geCAtIHgwXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGNvbnN0IGlzUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXRdID09PSByZWdpb25cclxuXHJcbiAgICAgICAgICAgIGlmIChpc1JlZ2lvbikge1xyXG4gICAgICAgICAgICAgICAgaHNbaV0gKz0gMVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaHNbaV0gPSAwXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGwgc2NhblxyXG4gICAgICAgIGZvciAobGV0IHggPSB4MDsgeCA8IHgxOyArK3gpIHtcclxuICAgICAgICAgICAgY29uc3QgaSA9IHggLSB4MFxyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgICAgICBjb25zdCBpc1JlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9PT0gcmVnaW9uXHJcblxyXG4gICAgICAgICAgICBpZiAoaXNSZWdpb24pIHtcclxuICAgICAgICAgICAgICAgIGxzW2ldID0gTWF0aC5tYXgobHNbaV0sIGwpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsc1tpXSA9IDBcclxuICAgICAgICAgICAgICAgIGwgPSB4ICsgMVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyByIHNjYW5cclxuICAgICAgICBmb3IgKGxldCB4ID0geDEgLSAxOyB4ID49IHgwOyAtLXgpIHtcclxuICAgICAgICAgICAgY29uc3QgaSA9IHggLSB4MFxyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgICAgICBjb25zdCBpc1JlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9PT0gcmVnaW9uXHJcblxyXG4gICAgICAgICAgICBpZiAoaXNSZWdpb24pIHtcclxuICAgICAgICAgICAgICAgIHJzW2ldID0gTWF0aC5taW4ocnNbaV0sIHIpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByc1tpXSA9IHgxXHJcbiAgICAgICAgICAgICAgICByID0geFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhcmVhIHNjYW5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHdpZHRoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgYXJlYSA9IGhzW2ldICogKHJzW2ldIC0gbHNbaV0pXHJcbiAgICAgICAgICAgIGlmIChhcmVhID4gbWF4QXJlYSkge1xyXG4gICAgICAgICAgICAgICAgbWF4QXJlYSA9IGFyZWFcclxuICAgICAgICAgICAgICAgIGJvdW5kcy5taW5YID0gbHNbaV1cclxuICAgICAgICAgICAgICAgIGJvdW5kcy5tYXhYID0gcnNbaV1cclxuICAgICAgICAgICAgICAgIGJvdW5kcy5taW5ZID0geSAtIGhzW2ldXHJcbiAgICAgICAgICAgICAgICBib3VuZHMubWF4WSA9IHlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pXHJcblxyXG4gICAgcmV0dXJuIGJvdW5kc1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHBsb3JlUmVnaW9uKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBwYWxldHRlT3ZlcmxheTogbnVtYmVyW10sIHgwOiBudW1iZXIsIHkwOiBudW1iZXIsIHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkpIHtcclxuICAgIGNvbnN0IHN0YWNrOiBudW1iZXJbXSA9IFtdXHJcbiAgICBjb25zdCBvZmZzZXQwID0geTAgKiB3aWR0aCArIHgwXHJcbiAgICBjb25zdCByZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldDBdXHJcbiAgICBpZiAoIXJlZ2lvbikge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNvbG9yID0gcmVnaW9uLmNvbG9yXHJcblxyXG4gICAgc3RhY2sucHVzaCh4MClcclxuICAgIHN0YWNrLnB1c2goeTApXHJcblxyXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjb25zdCB5ID0gc3RhY2sucG9wKCkgYXMgbnVtYmVyXHJcbiAgICAgICAgY29uc3QgeCA9IHN0YWNrLnBvcCgpIGFzIG51bWJlclxyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHkgKiB3aWR0aCArIHhcclxuICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSByZWdpb25cclxuICAgICAgICByZWdpb24ucGl4ZWxzKytcclxuXHJcbiAgICAgICAgLy8gZXhwbG9yZSBuZWlnaGJvcnMgKGlmIHNhbWUgY29sb3IpXHJcbiAgICAgICAgY29uc3QgbCA9IHggLSAxXHJcbiAgICAgICAgY29uc3QgciA9IHggKyAxXHJcbiAgICAgICAgY29uc3QgdCA9IHkgLSAxXHJcbiAgICAgICAgY29uc3QgYiA9IHkgKyAxXHJcblxyXG4gICAgICAgIGlmIChsID49IDApIHtcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0MSA9IG9mZnNldCAtIDFcclxuICAgICAgICAgICAgY29uc3QgcmVnaW9uMSA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgY29uc3QgY29sb3IxID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgaWYgKCFyZWdpb24xICYmIGNvbG9yID09PSBjb2xvcjEpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2gobClcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHIgPCB3aWR0aCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQxID0gb2Zmc2V0ICsgMVxyXG4gICAgICAgICAgICBjb25zdCByZWdpb24xID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBjb25zdCBjb2xvcjEgPSBwYWxldHRlT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBpZiAoIXJlZ2lvbjEgJiYgY29sb3IgPT09IGNvbG9yMSkge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaChyKVxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh5KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodCA+PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldDEgPSBvZmZzZXQgLSB3aWR0aFxyXG4gICAgICAgICAgICBjb25zdCByZWdpb24xID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBjb25zdCBjb2xvcjEgPSBwYWxldHRlT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBpZiAoIXJlZ2lvbjEgJiYgY29sb3IgPT09IGNvbG9yMSkge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh4KVxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh0KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYiA8IGhlaWdodCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQxID0gb2Zmc2V0ICsgd2lkdGhcclxuICAgICAgICAgICAgY29uc3QgcmVnaW9uMSA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgY29uc3QgY29sb3IxID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgaWYgKCFyZWdpb24xICYmIGNvbG9yID09PSBjb2xvcjEpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeClcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goYilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0JvcmRlcnMocmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSwgaW1hZ2VEYXRhOiBJbWFnZURhdGEpIHtcclxuICAgIC8vIGNvbG9yIGJvcmRlcnNcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgZGF0YSB9ID0gaW1hZ2VEYXRhXHJcbiAgICBpbWFnaW5nLnNjYW5JbWFnZURhdGEoaW1hZ2VEYXRhLCAoeCwgeSwgb2Zmc2V0KSA9PiB7XHJcbiAgICAgICAgY29uc3QgcmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXRdXHJcbiAgICAgICAgaWYgKCFyZWdpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBsID0geCAtIDFcclxuICAgICAgICBjb25zdCByID0geCArIDFcclxuICAgICAgICBjb25zdCB0ID0geSAtIDFcclxuICAgICAgICBjb25zdCBiID0geSArIDFcclxuXHJcbiAgICAgICAgLy8gZWRnZSBjZWxscyBhcmUgbm90IGJvcmRlciAoZm9yIG5vdylcclxuICAgICAgICBpZiAobCA8IDAgfHwgciA+PSB3aWR0aCB8fCB0IDwgMCB8fCBiID49IGhlaWdodCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGxSZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldCAtIDFdXHJcbiAgICAgICAgaWYgKGxSZWdpb24gJiYgbFJlZ2lvbiAhPT0gcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNF0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDFdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAyXSA9IDBcclxuICAgICAgICAgICAgcmVnaW9uT3ZlcmxheVtvZmZzZXRdID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgclJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0ICsgMV1cclxuICAgICAgICBpZiAoclJlZ2lvbiAmJiByUmVnaW9uICE9PSByZWdpb24pIHtcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0XSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMV0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDJdID0gMFxyXG4gICAgICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB0UmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQgLSB3aWR0aF1cclxuICAgICAgICBpZiAodFJlZ2lvbiAmJiB0UmVnaW9uICE9PSByZWdpb24pIHtcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0XSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMV0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDJdID0gMFxyXG4gICAgICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBiUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQgKyB3aWR0aF1cclxuICAgICAgICBpZiAoYlJlZ2lvbiAmJiBiUmVnaW9uICE9PSByZWdpb24pIHtcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0XSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMV0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDJdID0gMFxyXG4gICAgICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSBudWxsXHJcbiAgICAgICAgfVxyXG4gICAgfSlcclxufVxyXG5cclxuZnVuY3Rpb24gZmlsbEludGVyaW9yKGRhdGE6IFVpbnQ4Q2xhbXBlZEFycmF5LCByZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5KSB7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlZ2lvbk92ZXJsYXkubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCByZWdpb24gPSByZWdpb25PdmVybGF5W2ldXHJcbiAgICAgICAgaWYgKCFyZWdpb24pIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRhdGFbaSAqIDRdID0gMjU1XHJcbiAgICAgICAgZGF0YVtpICogNCArIDFdID0gMjU1XHJcbiAgICAgICAgZGF0YVtpICogNCArIDJdID0gMjU1XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVBhbGV0dGVVaShwYWxldHRlOiBpbWFnaW5nLkNvbG9yW10pIHtcclxuICAgIHV0aWwucmVtb3ZlQWxsQ2hpbGRyZW4ocGFsZXR0ZURpdilcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFsZXR0ZS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGNvbG9yID0gcGFsZXR0ZVtpXVxyXG4gICAgICAgIGNvbnN0IGx1bSA9IGltYWdpbmcuY2FsY0x1bWluYW5jZShjb2xvcilcclxuICAgICAgICBjb25zdCBmcmFnbWVudCA9IHBhbGV0dGVFbnRyeVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICBjb25zdCBlbnRyeURpdiA9IHV0aWwuYnlTZWxlY3RvcihmcmFnbWVudCwgXCIucGFsZXR0ZS1lbnRyeVwiKSBhcyBIVE1MRWxlbWVudFxyXG4gICAgICAgIGVudHJ5RGl2LnRleHRDb250ZW50ID0gYCR7aSArIDF9YFxyXG4gICAgICAgIGVudHJ5RGl2LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGByZ2IoJHtjb2xvclswXX0sICR7Y29sb3JbMV19LCAke2NvbG9yWzJdfSlgXHJcbiAgICAgICAgZW50cnlEaXYuc3R5bGUuY29sb3IgPSBsdW0gPCAuNSA/IFwid2hpdGVcIiA6IFwiYmxhY2tcIlxyXG4gICAgICAgIHBhbGV0dGVEaXYuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdSZWdpb25MYWJlbHMoY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIHJlZ2lvbnM6IFJlZ2lvbltdKSB7XHJcbiAgICBjdHguZm9udCA9IFwiMTZweCBhcmlhbCBib2xkXCJcclxuICAgIGNvbnN0IHRleHRIZWlnaHQgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoXHJcbiAgICBjb25zdCBmb250ID0gY3R4LmZvbnRcclxuXHJcbiAgICBmb3IgKGNvbnN0IHJlZ2lvbiBvZiByZWdpb25zKSB7XHJcbiAgICAgICAgaWYgKHJlZ2lvbi5jb2xvciA9PT0gLTEpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGxhYmVsID0gYCR7cmVnaW9uLmNvbG9yICsgMX1gXHJcbiAgICAgICAgY29uc3QgbWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dChsYWJlbClcclxuICAgICAgICBjb25zdCBjZW50ZXIgPSBjYWxjQ2VudGVyKHJlZ2lvbi5tYXhSZWN0KVxyXG4gICAgICAgIGNvbnN0IHggPSBjZW50ZXJbMF0gLSBtZXRyaWNzLndpZHRoIC8gMlxyXG4gICAgICAgIGNvbnN0IHkgPSBjZW50ZXJbMV0gKyB0ZXh0SGVpZ2h0IC8gMlxyXG4gICAgICAgIGN0eC5maWxsVGV4dChsYWJlbCwgeCwgeSlcclxuICAgIH1cclxuXHJcbiAgICBjdHguZm9udCA9IGZvbnRcclxufSJdfQ==