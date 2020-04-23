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
    loadFromUrl("peppa1.png");
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
        for (let x = x1 - 1; x >= 0; --x) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQUUvQyxJQUFLLFVBSUo7QUFKRCxXQUFLLFVBQVU7SUFDWCwyQ0FBSSxDQUFBO0lBQ0osMkNBQUksQ0FBQTtJQUNKLHlEQUFXLENBQUE7QUFDZixDQUFDLEVBSkksVUFBVSxLQUFWLFVBQVUsUUFJZDtBQVNELFNBQVMsU0FBUyxDQUFDLE1BQWM7SUFDN0IsT0FBTyxNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO0FBQ3hDLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxNQUFjO0lBQzlCLE9BQU8sTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtBQUN4QyxDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsTUFBYztJQUM1QixPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDakQsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLE1BQWM7SUFDOUIsT0FBTztRQUNILE1BQU0sQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDbkMsTUFBTSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztLQUN2QyxDQUFBO0FBQ0wsQ0FBQztBQVdELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFxQixDQUFBO0FBQ3RELElBQUksVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUE7QUFDaEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQXNCLENBQUE7QUFDdkQsTUFB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QVEsQ0FBQyxDQUFBO0tBQ25DO0FBQ0wsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsR0FBNkIsRUFBRSxPQUFpQjtJQUN0RSxHQUFHLENBQUMsSUFBSSxHQUFHLGlCQUFpQixDQUFBO0lBQzVCLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFBO0lBQzdDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUE7SUFFckIsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUU7UUFDMUIsSUFBSSxNQUFNLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFO1lBQ3JCLFNBQVE7U0FDWDtRQUVELE1BQU0sS0FBSyxHQUFHLEdBQUcsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQTtRQUNuQyxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDekMsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsQ0FBQyxDQUFBO1FBQ3BDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtLQUM1QjtJQUVELEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO0FBQ25CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyB1dGlsIGZyb20gXCIuLi9zaGFyZWQvdXRpbC5qc1wiXHJcbmltcG9ydCAqIGFzIGltYWdpbmcgZnJvbSBcIi4uL3NoYXJlZC9pbWFnaW5nLmpzXCJcclxuXHJcbmVudW0gQ2FtZXJhTW9kZSB7XHJcbiAgICBOb25lLFxyXG4gICAgVXNlcixcclxuICAgIEVudmlyb25tZW50LFxyXG59XHJcblxyXG5pbnRlcmZhY2UgQm91bmRzIHtcclxuICAgIG1pblg6IG51bWJlclxyXG4gICAgbWF4WDogbnVtYmVyXHJcbiAgICBtaW5ZOiBudW1iZXJcclxuICAgIG1heFk6IG51bWJlclxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjV2lkdGgoYm91bmRzOiBCb3VuZHMpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIGJvdW5kcy5tYXhYIC0gYm91bmRzLm1pblggKyAxXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGNIZWlnaHQoYm91bmRzOiBCb3VuZHMpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIGJvdW5kcy5tYXhZIC0gYm91bmRzLm1pblkgKyAxXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGNBcmVhKGJvdW5kczogQm91bmRzKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBjYWxjV2lkdGgoYm91bmRzKSAqIGNhbGNIZWlnaHQoYm91bmRzKVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjQ2VudGVyKGJvdW5kczogQm91bmRzKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICByZXR1cm4gW1xyXG4gICAgICAgIGJvdW5kcy5taW5YICsgY2FsY1dpZHRoKGJvdW5kcykgLyAyLFxyXG4gICAgICAgIGJvdW5kcy5taW5ZICsgY2FsY0hlaWdodChib3VuZHMpIC8gMlxyXG4gICAgXVxyXG59XHJcblxyXG5pbnRlcmZhY2UgUmVnaW9uIHtcclxuICAgIGNvbG9yOiBudW1iZXJcclxuICAgIHBpeGVsczogbnVtYmVyXHJcbiAgICBib3VuZHM6IEJvdW5kc1xyXG4gICAgbWF4UmVjdDogQm91bmRzXHJcbn1cclxuXHJcbnR5cGUgUmVnaW9uT3ZlcmxheSA9IChSZWdpb24gfCBudWxsKVtdXHJcblxyXG5jb25zdCBjYW1lcmEgPSB1dGlsLmJ5SWQoXCJjYW1lcmFcIikgYXMgSFRNTFZpZGVvRWxlbWVudFxyXG5sZXQgY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuTm9uZVxyXG5jb25zdCBjYW52YXMgPSB1dGlsLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuY29uc3QgYWNxdWlyZUltYWdlRGl2ID0gdXRpbC5ieUlkKFwiYWNxdWlyZUltYWdlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbmNvbnN0IHBhbGV0dGVEaXYgPSB1dGlsLmJ5SWQoXCJwYWxldHRlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbmNvbnN0IHBhbGV0dGVFbnRyeVRlbXBsYXRlID0gdXRpbC5ieUlkKFwicGFsZXR0ZUVudHJ5XCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuXHJcbmNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikgYXMgQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEXHJcbmlmICghY3R4KSB7XHJcbiAgICB0aHJvd0Vycm9yTWVzc2FnZShcIkNhbnZhcyBlbGVtZW50IG5vdCBzdXBwb3J0ZWRcIilcclxufVxyXG5cclxuY29uc3QgY2FwdHVyZUltYWdlQnV0dG9uID0gdXRpbC5ieUlkKFwiY2FwdHVyZUltYWdlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbmNvbnN0IGxvYWRVaSA9IHV0aWwuYnlJZChcImxvYWRVaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5jb25zdCBwbGF5VWkgPSB1dGlsLmJ5SWQoXCJwbGF5VWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuXHJcbmluaXQoKVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgIGNvbnN0IGZpbGVEcm9wQm94ID0gdXRpbC5ieUlkKFwiZmlsZURyb3BCb3hcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIGNvbnN0IGZpbGVJbnB1dCA9IHV0aWwuYnlJZChcImZpbGVJbnB1dFwiKSBhcyBIVE1MSW5wdXRFbGVtZW50XHJcbiAgICBjb25zdCBmaWxlQnV0dG9uID0gdXRpbC5ieUlkKFwiZmlsZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgY29uc3QgdXNlQ2FtZXJhQnV0dG9uID0gdXRpbC5ieUlkKFwidXNlQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBjb25zdCBmbGlwQ2FtZXJhQnV0dG9uID0gdXRpbC5ieUlkKFwiZmxpcENhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgY29uc3Qgc3RvcENhbWVyYUJ1dHRvbiA9IHV0aWwuYnlJZChcInN0b3BDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIGNvbnN0IHJldHVybkJ1dHRvbiA9IHV0aWwuYnlJZChcInJldHVybkJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5cclxuICAgIGZpbGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICBmaWxlSW5wdXQuY2xpY2soKVxyXG4gICAgfSlcclxuXHJcbiAgICBmaWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2VudGVyXCIsIG9uRHJhZ0VudGVyT3ZlcilcclxuICAgIGZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnb3ZlclwiLCBvbkRyYWdFbnRlck92ZXIpXHJcbiAgICBmaWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJvcFwiLCBvbkZpbGVEcm9wKVxyXG5cclxuICAgIGZpbGVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHtcclxuICAgICAgICBpZiAoIWZpbGVJbnB1dC5maWxlcz8ubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZmlsZSA9IGZpbGVJbnB1dC5maWxlc1swXVxyXG4gICAgICAgIHByb2Nlc3NGaWxlKGZpbGUpXHJcbiAgICB9KVxyXG5cclxuICAgIHVzZUNhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgdXNlQ2FtZXJhKVxyXG4gICAgZmxpcENhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZmxpcENhbWVyYSlcclxuICAgIHN0b3BDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHN0b3BDYW1lcmEpXHJcbiAgICBjYXB0dXJlSW1hZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNhcHR1cmVJbWFnZSlcclxuICAgIHJldHVybkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgc2hvd0xvYWRVaSlcclxuICAgIGxvYWRGcm9tVXJsKFwicGVwcGExLnBuZ1wiKVxyXG59XHJcblxyXG5mdW5jdGlvbiBvbkRyYWdFbnRlck92ZXIoZXY6IERyYWdFdmVudCkge1xyXG4gICAgZXYuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxufVxyXG5cclxuZnVuY3Rpb24gb25GaWxlRHJvcChldjogRHJhZ0V2ZW50KSB7XHJcbiAgICBldi5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgZXYucHJldmVudERlZmF1bHQoKVxyXG5cclxuICAgIGlmICghZXY/LmRhdGFUcmFuc2Zlcj8uZmlsZXM/Lmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGZpbGUgPSBldi5kYXRhVHJhbnNmZXIuZmlsZXNbMF1cclxuICAgIHByb2Nlc3NGaWxlKGZpbGUpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByb2Nlc3NGaWxlKGZpbGU6IEZpbGUpIHtcclxuICAgIGNsZWFyRXJyb3JNZXNzYWdlcygpXHJcbiAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpXHJcbiAgICBsb2FkRnJvbVVybCh1cmwpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRGcm9tVXJsKHVybDogc3RyaW5nKSB7XHJcbiAgICBjbGVhckVycm9yTWVzc2FnZXMoKVxyXG4gICAgY29uc3QgaW1nID0gbmV3IEltYWdlKClcclxuICAgIGltZy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgc2hvd1BsYXlVaShpbWcsIGltZy53aWR0aCwgaW1nLmhlaWdodClcclxuICAgIH0pXHJcblxyXG4gICAgaW1nLnNyYyA9IHVybFxyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhckVycm9yTWVzc2FnZXMoKSB7XHJcbiAgICBjb25zdCBlcnJvcnNEaXYgPSB1dGlsLmJ5SWQoXCJlcnJvcnNcIilcclxuICAgIHV0aWwucmVtb3ZlQWxsQ2hpbGRyZW4oZXJyb3JzRGl2KVxyXG59XHJcblxyXG5mdW5jdGlvbiBhcHBlbmRFcnJvck1lc3NhZ2UoZXJyb3I6IHN0cmluZykge1xyXG4gICAgY29uc29sZS5sb2coZXJyb3IpXHJcbiAgICBjb25zdCBlcnJvcnNEaXYgPSB1dGlsLmJ5SWQoXCJlcnJvcnNcIik7XHJcbiAgICBjb25zdCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgZGl2LmNsYXNzTGlzdC5hZGQoXCJlcnJvci1tZXNzYWdlXCIpXHJcbiAgICBkaXYudGV4dENvbnRlbnQgPSBlcnJvclxyXG4gICAgZXJyb3JzRGl2LmFwcGVuZENoaWxkKGRpdilcclxufVxyXG5cclxuZnVuY3Rpb24gdGhyb3dFcnJvck1lc3NhZ2UoZXJyb3I6IHN0cmluZykge1xyXG4gICAgYXBwZW5kRXJyb3JNZXNzYWdlKGVycm9yKVxyXG4gICAgdGhyb3cgbmV3IEVycm9yKGVycm9yKVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiB1c2VDYW1lcmEoKSB7XHJcbiAgICBhY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgIGNvbnN0IGRpYWxvZ1dpZHRoID0gYWNxdWlyZUltYWdlRGl2LmNsaWVudFdpZHRoXHJcbiAgICBjb25zdCBkaWFsb2dIZWlnaHQgPSBhY3F1aXJlSW1hZ2VEaXYuY2xpZW50SGVpZ2h0XHJcbiAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7XHJcbiAgICAgICAgdmlkZW86IHsgd2lkdGg6IHsgbWF4OiBkaWFsb2dXaWR0aCB9LCBoZWlnaHQ6IHsgbWF4OiBkaWFsb2dIZWlnaHQgfSwgZmFjaW5nTW9kZTogXCJ1c2VyXCIgfSxcclxuICAgICAgICBhdWRpbzogZmFsc2VcclxuICAgIH0pXHJcblxyXG4gICAgY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuVXNlclxyXG4gICAgY2FtZXJhLnNyY09iamVjdCA9IHN0cmVhbVxyXG4gICAgY2FtZXJhLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRtZXRhZGF0YVwiLCBvbkNhbWVyYUxvYWQpXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGZsaXBDYW1lcmEoKSB7XHJcbiAgICBpZiAoIWNhbWVyYS5zcmNPYmplY3QpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzcmMgPSBjYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICBjb25zdCB0cmFja3MgPSBzcmMuZ2V0VHJhY2tzKClcclxuICAgIGZvciAoY29uc3QgdHJhY2sgb2YgdHJhY2tzKSB7XHJcbiAgICAgICAgdHJhY2suc3RvcCgpXHJcbiAgICB9XHJcblxyXG4gICAgY2FtZXJhTW9kZSA9IGNhbWVyYU1vZGUgPT0gQ2FtZXJhTW9kZS5Vc2VyID8gQ2FtZXJhTW9kZS5FbnZpcm9ubWVudCA6IENhbWVyYU1vZGUuVXNlclxyXG4gICAgY29uc3QgZmFjaW5nTW9kZSA9IGNhbWVyYU1vZGUgPT0gQ2FtZXJhTW9kZS5Vc2VyID8gXCJ1c2VyXCIgOiBcImVudmlyb25tZW50XCJcclxuXHJcbiAgICAvLyBnZXQgY3VycmVudCBmYWNpbmcgbW9kZVxyXG4gICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xyXG4gICAgICAgIHZpZGVvOiB7IHdpZHRoOiBjYW1lcmEuY2xpZW50V2lkdGgsIGhlaWdodDogY2FtZXJhLmNsaWVudEhlaWdodCwgZmFjaW5nTW9kZTogZmFjaW5nTW9kZSB9LFxyXG4gICAgICAgIGF1ZGlvOiBmYWxzZVxyXG4gICAgfSlcclxuXHJcbiAgICBjYW1lcmEuc3JjT2JqZWN0ID0gc3RyZWFtXHJcbiAgICBjYW1lcmEuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZG1ldGFkYXRhXCIsIG9uQ2FtZXJhTG9hZClcclxufVxyXG5cclxuZnVuY3Rpb24gb25DYW1lcmFMb2FkKCkge1xyXG4gICAgY29uc29sZS5sb2coY2FtZXJhLmNsaWVudFdpZHRoLCBjYW1lcmEuY2xpZW50SGVpZ2h0LCBjYW1lcmEud2lkdGgsIGNhbWVyYS5oZWlnaHQsIGNhbWVyYS52aWRlb1dpZHRoLCBjYW1lcmEudmlkZW9IZWlnaHQpXHJcbiAgICBhY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgIGNhbWVyYS5wbGF5KClcclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN0b3BDYW1lcmEoKSB7XHJcbiAgICBjb25zdCBzcmMgPSBjYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICBpZiAoIXNyYykge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHRyYWNrcyA9IHNyYy5nZXRUcmFja3MoKVxyXG4gICAgZm9yIChjb25zdCB0cmFjayBvZiB0cmFja3MpIHtcclxuICAgICAgICB0cmFjay5zdG9wKClcclxuICAgIH1cclxuXHJcbiAgICBjYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Ob25lXHJcbiAgICBhY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYXB0dXJlSW1hZ2UoKSB7XHJcbiAgICBjbGVhckVycm9yTWVzc2FnZXMoKVxyXG5cclxuICAgIGNvbnN0IHNyYyA9IGNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgIGlmICghc3JjKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdHJhY2sgPSBzcmMuZ2V0VmlkZW9UcmFja3MoKVswXVxyXG4gICAgaWYgKCF0cmFjaykge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIHNob3dQbGF5VWkoY2FtZXJhLCBjYW1lcmEudmlkZW9XaWR0aCwgY2FtZXJhLnZpZGVvSGVpZ2h0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2hvd1BsYXlVaShpbWc6IENhbnZhc0ltYWdlU291cmNlLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcikge1xyXG4gICAgLy8gbWFpbnRhaW4gYXNwZWN0IHJhdGlvIVxyXG4gICAgY29uc3QgdncgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGhcclxuICAgIGNvbnN0IHZoID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodFxyXG5cclxuICAgIGlmICh2dyA8IHZoKSB7XHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gdndcclxuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gdncgKiBoZWlnaHQgLyB3aWR0aFxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gdmhcclxuICAgICAgICBjYW52YXMud2lkdGggPSB2aCAqIHdpZHRoIC8gaGVpZ2h0XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZFVpLmhpZGRlbiA9IHRydWVcclxuICAgIHBsYXlVaS5oaWRkZW4gPSBmYWxzZVxyXG5cclxuICAgIGN0eC5kcmF3SW1hZ2UoaW1nLCAwLCAwLCBjYW52YXMuY2xpZW50V2lkdGgsIGNhbnZhcy5jbGllbnRIZWlnaHQpXHJcbiAgICBwcm9jZXNzSW1hZ2UoKVxyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93TG9hZFVpKCkge1xyXG4gICAgbG9hZFVpLmhpZGRlbiA9IGZhbHNlXHJcbiAgICBwbGF5VWkuaGlkZGVuID0gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiBwcm9jZXNzSW1hZ2UoKSB7XHJcbiAgICAvLyBnZXQgKGZsYXQpIGltYWdlIGRhdGEgZnJvbSBjYW52YXNcclxuICAgIGNvbnN0IGltYWdlRGF0YSA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KVxyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBpbWFnZURhdGFcclxuXHJcbiAgICAvLyBjb252ZXJ0IHRvIHh5eiBjb2xvcnMgYW5kIHBhbGV0dGl6ZSBkYXRhXHJcbiAgICBjb25zdCBbcGFsZXR0ZSwgcGFsZXR0ZU92ZXJsYXldID0gcGFsZXR0aXplKGltYWdlRGF0YSwgMywgOClcclxuICAgIGltYWdpbmcuYXBwbHlQYWxldHRlKHBhbGV0dGUsIHBhbGV0dGVPdmVybGF5LCBpbWFnZURhdGEpXHJcbiAgICBsZXQgW3JlZ2lvbnMsIHJlZ2lvbk92ZXJsYXldID0gY3JlYXRlUmVnaW9uT3ZlcmxheSh3aWR0aCwgaGVpZ2h0LCBwYWxldHRlT3ZlcmxheSlcclxuICAgIHJlZ2lvbnMgPSBwcnVuZVJlZ2lvbnMod2lkdGgsIGhlaWdodCwgcmVnaW9ucywgcmVnaW9uT3ZlcmxheSlcclxuICAgIGRyYXdCb3JkZXJzKHJlZ2lvbk92ZXJsYXksIGltYWdlRGF0YSlcclxuICAgIGZpbGxJbnRlcmlvcihpbWFnZURhdGEuZGF0YSwgcmVnaW9uT3ZlcmxheSlcclxuICAgIGN0eC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKVxyXG4gICAgY3JlYXRlUGFsZXR0ZVVpKHBhbGV0dGUpXHJcbiAgICBkcmF3UmVnaW9uTGFiZWxzKGN0eCwgcmVnaW9ucylcclxufVxyXG5cclxuLy8gc3BlY2lhbGl6ZWQgdG8gaWdub3JlIHdoaXRlXHJcbmZ1bmN0aW9uIHBhbGV0dGl6ZShpbWFnZURhdGE6IEltYWdlRGF0YSwgYnVja2V0c1BlckNvbXBvbmVudDogbnVtYmVyLCBtYXhDb2xvcnM6IG51bWJlcik6IFtpbWFnaW5nLkNvbG9yW10sIG51bWJlcltdXSB7XHJcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQsIGRhdGEgfSA9IGltYWdlRGF0YVxyXG4gICAgY29uc3QgcGl4ZWxzID0gd2lkdGggKiBoZWlnaHRcclxuICAgIGNvbnN0IGJ1Y2tldFBpdGNoID0gYnVja2V0c1BlckNvbXBvbmVudCAqIGJ1Y2tldHNQZXJDb21wb25lbnRcclxuICAgIGNvbnN0IG51bUJ1Y2tldHMgPSBidWNrZXRQaXRjaCAqIGJ1Y2tldHNQZXJDb21wb25lbnRcclxuXHJcbiAgICAvLyBjcmVhdCBpbnRpYWwgYnVja2V0c1xyXG4gICAgbGV0IGJ1Y2tldHMgPSB1dGlsLmdlbmVyYXRlKG51bUJ1Y2tldHMsICgpID0+ICh7IGNvbG9yOiBbMCwgMCwgMF0gYXMgW251bWJlciwgbnVtYmVyLCBudW1iZXJdLCBwaXhlbHM6IDAgfSkpXHJcblxyXG4gICAgLy8gYXNzaWduIGFuZCB1cGRhdGUgYnVja2V0IGZvciBlYWNoIHBpeGVsXHJcbiAgICBjb25zdCBidWNrZXRPdmVybGF5ID0gdXRpbC5nZW5lcmF0ZShwaXhlbHMsIGkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHIgPSBkYXRhW2kgKiA0XSAvIDI1NVxyXG4gICAgICAgIGNvbnN0IGcgPSBkYXRhW2kgKiA0ICsgMV0gLyAyNTVcclxuICAgICAgICBjb25zdCBiID0gZGF0YVtpICogNCArIDJdIC8gMjU1XHJcblxyXG4gICAgICAgIC8vIGlnbm9yZSB3aGl0ZVxyXG4gICAgICAgIGlmIChyID49IC45NSAmJiBnID49IC45NSAmJiBiID49IC45NSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcmIgPSBNYXRoLm1pbihNYXRoLmZsb29yKHIgKiBidWNrZXRzUGVyQ29tcG9uZW50KSwgYnVja2V0c1BlckNvbXBvbmVudCAtIDEpXHJcbiAgICAgICAgY29uc3QgZ2IgPSBNYXRoLm1pbihNYXRoLmZsb29yKGcgKiBidWNrZXRzUGVyQ29tcG9uZW50KSwgYnVja2V0c1BlckNvbXBvbmVudCAtIDEpXHJcbiAgICAgICAgY29uc3QgYmIgPSBNYXRoLm1pbihNYXRoLmZsb29yKGIgKiBidWNrZXRzUGVyQ29tcG9uZW50KSwgYnVja2V0c1BlckNvbXBvbmVudCAtIDEpXHJcblxyXG4gICAgICAgIGNvbnN0IGJ1Y2tldElkeCA9IHJiICogYnVja2V0UGl0Y2ggKyBnYiAqIGJ1Y2tldHNQZXJDb21wb25lbnQgKyBiYlxyXG4gICAgICAgIGNvbnN0IGJ1Y2tldCA9IGJ1Y2tldHNbYnVja2V0SWR4XVxyXG4gICAgICAgIGJ1Y2tldC5jb2xvciA9IGltYWdpbmcuYWRkWFlaKFtyLCBnLCBiXSwgYnVja2V0LmNvbG9yKVxyXG4gICAgICAgIGJ1Y2tldC5waXhlbHMrK1xyXG4gICAgICAgIHJldHVybiBidWNrZXRcclxuICAgIH0pXHJcblxyXG4gICAgLy8gcHJ1bmUgZW1wdHkgYnVja2V0c1xyXG4gICAgYnVja2V0cyA9IGJ1Y2tldHMuZmlsdGVyKGIgPT4gYi5waXhlbHMgPiAwKVxyXG5cclxuICAgIC8vIGNhbGN1bGF0ZSBidWNrZXQgY29sb3JzXHJcbiAgICBmb3IgKGNvbnN0IGJ1Y2tldCBvZiBidWNrZXRzKSB7XHJcbiAgICAgICAgYnVja2V0LmNvbG9yID0gaW1hZ2luZy5kaXZYWVooYnVja2V0LmNvbG9yLCBidWNrZXQucGl4ZWxzKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGNvbWJpbmUgYnVja2V0cyB0aGF0IGFyZSB2ZXJ5IGNsb3NlIGluIGNvbG9yIGFmdGVyIGNvbG9yIGF2ZXJhZ2luZ1xyXG4gICAgbGV0IGJ1Y2tldFNldCA9IG5ldyBTZXQoYnVja2V0cylcclxuICAgIHdoaWxlIChidWNrZXRTZXQuc2l6ZSA+IDEpIHtcclxuICAgICAgICAvLyBwcm9jZWVkIGZvciBhcyBsb25nIGFzIGJ1Y2tldHMgY2FuIGJlIGNvbWJpbmVkXHJcbiAgICAgICAgbGV0IG1lcmdlID0gZmFsc2VcclxuICAgICAgICBmb3IgKGNvbnN0IGJ1Y2tldCBvZiBidWNrZXRTZXQpIHtcclxuICAgICAgICAgICAgLy8gZmluZCBcIm5lYXJlc3RcIiBjb2xvclxyXG4gICAgICAgICAgICBjb25zdCBuZWFyZXN0ID0gWy4uLmJ1Y2tldFNldF1cclxuICAgICAgICAgICAgICAgIC5maWx0ZXIoYiA9PiBiICE9IGJ1Y2tldClcclxuICAgICAgICAgICAgICAgIC5yZWR1Y2UoKGIxLCBiMikgPT4gaW1hZ2luZy5jYWxjRGlzdFNxKGJ1Y2tldC5jb2xvciwgYjEuY29sb3IpIDwgaW1hZ2luZy5jYWxjRGlzdFNxKGJ1Y2tldC5jb2xvciwgYjIuY29sb3IpID8gYjEgOiBiMilcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGRpc3RTcSA9IGltYWdpbmcuY2FsY0Rpc3RTcShidWNrZXQuY29sb3IsIG5lYXJlc3QuY29sb3IpXHJcbiAgICAgICAgICAgIGlmIChkaXN0U3EgPiAuMSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gbWVyZ2UgdGhlIGJ1Y2tldHNcclxuICAgICAgICAgICAgYnVja2V0LmNvbG9yID0gaW1hZ2luZy5kaXZYWVooXHJcbiAgICAgICAgICAgICAgICBpbWFnaW5nLmFkZFhZWihpbWFnaW5nLm11bFhZWihidWNrZXQuY29sb3IsIGJ1Y2tldC5waXhlbHMpLCBpbWFnaW5nLm11bFhZWihuZWFyZXN0LmNvbG9yLCBuZWFyZXN0LnBpeGVscykpLFxyXG4gICAgICAgICAgICAgICAgYnVja2V0LnBpeGVscyArIG5lYXJlc3QucGl4ZWxzKVxyXG5cclxuICAgICAgICAgICAgYnVja2V0U2V0LmRlbGV0ZShuZWFyZXN0KVxyXG4gICAgICAgICAgICBtZXJnZSA9IHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghbWVyZ2UpIHtcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYnVja2V0cyA9IFsuLi5idWNrZXRTZXRdXHJcbiAgICAgICAgLnNvcnQoKGIxLCBiMikgPT4gYjIucGl4ZWxzIC0gYjEucGl4ZWxzKVxyXG4gICAgICAgIC5zbGljZSgwLCBtYXhDb2xvcnMpXHJcblxyXG4gICAgLy8gbWFwIGFsbCBjb2xvcnMgdG8gdG9wIE4gYnVja2V0c1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBidWNrZXRPdmVybGF5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgLy8gb3RoZXJ3aXNlLCBtYXAgdG8gbmV3IGJ1Y2tldFxyXG4gICAgICAgIGNvbnN0IHIgPSBkYXRhW2kgKiA0XSAvIDI1NVxyXG4gICAgICAgIGNvbnN0IGcgPSBkYXRhW2kgKiA0ICsgMV0gLyAyNTVcclxuICAgICAgICBjb25zdCBiID0gZGF0YVtpICogNCArIDJdIC8gMjU1XHJcblxyXG4gICAgICAgIGlmIChyID49IC45NSAmJiBnID49IC45NSAmJiBiID49IC45NSkge1xyXG4gICAgICAgICAgICBidWNrZXRPdmVybGF5W2ldID0gbnVsbFxyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29sb3I6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSA9IFtyLCBnLCBiXVxyXG4gICAgICAgIGNvbnN0IGJ1Y2tldCA9IGJ1Y2tldHMucmVkdWNlKChiMSwgYjIpID0+IGltYWdpbmcuY2FsY0Rpc3RTcShiMS5jb2xvciwgY29sb3IpIDwgaW1hZ2luZy5jYWxjRGlzdFNxKGIyLmNvbG9yLCBjb2xvcikgPyBiMSA6IGIyKVxyXG4gICAgICAgIGJ1Y2tldE92ZXJsYXlbaV0gPSBidWNrZXRcclxuICAgIH1cclxuXHJcbiAgICAvLyBkZXRlcm1pbmUgcGFsZXR0ZSBjb2xvcnNcclxuICAgIGNvbnN0IHBhbGV0dGUgPSBidWNrZXRzLm1hcChiID0+IGltYWdpbmcubXVsWFlaKGIuY29sb3IsIDI1NSkpXHJcbiAgICBjb25zdCBwYWxldHRlT3ZlcmxheSA9IGJ1Y2tldE92ZXJsYXkubWFwKGIgPT4gYiA/IGJ1Y2tldHMuaW5kZXhPZihiKSA6IC0xKVxyXG4gICAgcmV0dXJuIFtwYWxldHRlLCBwYWxldHRlT3ZlcmxheV1cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlUmVnaW9uT3ZlcmxheSh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcGFsZXR0ZU92ZXJsYXk6IG51bWJlcltdKTogW1JlZ2lvbltdLCBSZWdpb25PdmVybGF5XSB7XHJcbiAgICBjb25zdCByZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5ID0gdXRpbC5maWxsKG51bGwsIHdpZHRoICogaGVpZ2h0KVxyXG4gICAgY29uc3QgcmVnaW9uczogUmVnaW9uW10gPSBbXVxyXG5cclxuICAgIGltYWdpbmcuc2Nhbih3aWR0aCwgaGVpZ2h0LCAoeCwgeSwgb2Zmc2V0KSA9PiB7XHJcbiAgICAgICAgaWYgKHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHJlZ2lvbjogUmVnaW9uID0ge1xyXG4gICAgICAgICAgICBjb2xvcjogcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0XSxcclxuICAgICAgICAgICAgcGl4ZWxzOiAwLFxyXG4gICAgICAgICAgICBib3VuZHM6IHtcclxuICAgICAgICAgICAgICAgIG1pblg6IEluZmluaXR5LFxyXG4gICAgICAgICAgICAgICAgbWF4WDogLTEsXHJcbiAgICAgICAgICAgICAgICBtaW5ZOiBJbmZpbml0eSxcclxuICAgICAgICAgICAgICAgIG1heFk6IC0xXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG1heFJlY3Q6IHtcclxuICAgICAgICAgICAgICAgIG1pblg6IEluZmluaXR5LFxyXG4gICAgICAgICAgICAgICAgbWF4WDogLTEsXHJcbiAgICAgICAgICAgICAgICBtaW5ZOiBJbmZpbml0eSxcclxuICAgICAgICAgICAgICAgIG1heFk6IC0xXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9IHJlZ2lvblxyXG4gICAgICAgIHJlZ2lvbnMucHVzaChyZWdpb24pXHJcbiAgICAgICAgZXhwbG9yZVJlZ2lvbih3aWR0aCwgaGVpZ2h0LCBwYWxldHRlT3ZlcmxheSwgeCwgeSwgcmVnaW9uT3ZlcmxheSlcclxuICAgIH0pXHJcblxyXG4gICAgLy8gcHJ1bmUgc29tZSByZWdpb25zXHJcbiAgICByZXR1cm4gW3JlZ2lvbnMsIHJlZ2lvbk92ZXJsYXldXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBydW5lUmVnaW9ucyh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcmVnaW9uczogUmVnaW9uW10sIHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkpOiBSZWdpb25bXSB7XHJcbiAgICBjb25zdCByZWdpb25TZXQgPSBuZXcgU2V0KHJlZ2lvbnMpXHJcblxyXG4gICAgZm9yIChjb25zdCByZWdpb24gb2YgcmVnaW9ucykge1xyXG4gICAgICAgIGlmIChyZWdpb24ucGl4ZWxzIDw9IDMyKSB7XHJcbiAgICAgICAgICAgIHJlZ2lvblNldC5kZWxldGUocmVnaW9uKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjYWxjUmVnaW9uQm91bmRzKHdpZHRoLCBoZWlnaHQsIHJlZ2lvbk92ZXJsYXkpXHJcbiAgICBmb3IgKGNvbnN0IHJlZ2lvbiBvZiByZWdpb25TZXQpIHtcclxuICAgICAgICBpZiAoY2FsY1dpZHRoKHJlZ2lvbi5ib3VuZHMpIDw9IDE2KSB7XHJcbiAgICAgICAgICAgIHJlZ2lvblNldC5kZWxldGUocmVnaW9uKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGNhbGNIZWlnaHQocmVnaW9uLmJvdW5kcykgPD0gMTYpIHtcclxuICAgICAgICAgICAgcmVnaW9uU2V0LmRlbGV0ZShyZWdpb24pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGNhbGN1bGF0ZSBtYXhpbWFsIHJlYyBmb3IgZWFjaCByZWdpb25cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvblNldCkge1xyXG4gICAgICAgIHJlZ2lvbi5tYXhSZWN0ID0gY2FsY01heFJlZ2lvblJlY3Qod2lkdGgsIHJlZ2lvbiwgcmVnaW9uT3ZlcmxheSlcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IHJlZ2lvbiBvZiByZWdpb25TZXQpIHtcclxuICAgICAgICBpZiAoY2FsY0FyZWEocmVnaW9uLm1heFJlY3QpIDwgMzIpIHtcclxuICAgICAgICAgICAgcmVnaW9uU2V0LmRlbGV0ZShyZWdpb24pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIHVwZGF0ZSB0aGUgb3ZlcmxheVxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZWdpb25PdmVybGF5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgcmVnaW9uID0gcmVnaW9uT3ZlcmxheVtpXVxyXG4gICAgICAgIGlmICghcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXJlZ2lvblNldC5oYXMocmVnaW9uKSkge1xyXG4gICAgICAgICAgICByZWdpb25PdmVybGF5W2ldID0gbnVsbFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gWy4uLnJlZ2lvblNldF1cclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY1JlZ2lvbkJvdW5kcyh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSkge1xyXG4gICAgaW1hZ2luZy5zY2FuKHdpZHRoLCBoZWlnaHQsICh4LCB5LCBvZmZzZXQpID0+IHtcclxuICAgICAgICBjb25zdCByZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldF1cclxuICAgICAgICBpZiAoIXJlZ2lvbikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGJvdW5kcyA9IHJlZ2lvbi5ib3VuZHNcclxuICAgICAgICBib3VuZHMubWluWCA9IE1hdGgubWluKGJvdW5kcy5taW5YLCB4KVxyXG4gICAgICAgIGJvdW5kcy5tYXhYID0gTWF0aC5tYXgoYm91bmRzLm1heFgsIHgpXHJcbiAgICAgICAgYm91bmRzLm1pblkgPSBNYXRoLm1pbihib3VuZHMubWluWSwgeSlcclxuICAgICAgICBib3VuZHMubWF4WSA9IE1hdGgubWF4KGJvdW5kcy5tYXhZLCB5KVxyXG4gICAgfSlcclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY01heFJlZ2lvblJlY3Qocm93UGl0Y2g6IG51bWJlciwgcmVnaW9uOiBSZWdpb24sIHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkpOiBCb3VuZHMge1xyXG4gICAgLy8gZGVyaXZlZCBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzcyNDUvcHV6emxlLWZpbmQtbGFyZ2VzdC1yZWN0YW5nbGUtbWF4aW1hbC1yZWN0YW5nbGUtcHJvYmxlbVxyXG4gICAgLy8gYWxnb3JpdGhtIG5lZWRzIHRvIGtlZXAgdHJhY2sgb2YgcmVjdGFuZ2xlIHN0YXRlIGZvciBldmVyeSBjb2x1bW4gZm9yIGV2ZXJ5IHJlZ2lvblxyXG4gICAgY29uc3QgeyBtaW5YOiB4MCwgbWluWTogeTAsIG1heFg6IHgxLCBtYXhZOiB5MSB9ID0gcmVnaW9uLmJvdW5kc1xyXG4gICAgY29uc3Qgd2lkdGggPSB4MSAtIHgwICsgMVxyXG4gICAgY29uc3QgaGVpZ2h0ID0geTEgLSB5MCArIDFcclxuICAgIGNvbnN0IGxzID0gdXRpbC5maWxsKHgwLCB3aWR0aClcclxuICAgIGNvbnN0IHJzID0gdXRpbC5maWxsKHgwICsgd2lkdGgsIHdpZHRoKVxyXG4gICAgY29uc3QgaHMgPSB1dGlsLmZpbGwoMCwgd2lkdGgpXHJcblxyXG4gICAgbGV0IG1heEFyZWEgPSAwXHJcbiAgICBjb25zdCBib3VuZHM6IEJvdW5kcyA9IHtcclxuICAgICAgICBtaW5YOiBJbmZpbml0eSxcclxuICAgICAgICBtYXhYOiAtMSxcclxuICAgICAgICBtaW5ZOiBJbmZpbml0eSxcclxuICAgICAgICBtYXhZOiAtMSxcclxuICAgIH1cclxuXHJcbiAgICBpbWFnaW5nLnNjYW5Sb3dzUmVnaW9uKHkwLCBoZWlnaHQsIHJvd1BpdGNoLCAoeSwgeU9mZnNldCkgPT4ge1xyXG4gICAgICAgIGxldCBsID0geDBcclxuICAgICAgICBsZXQgciA9IHgwICsgd2lkdGhcclxuXHJcbiAgICAgICAgLy8gaGVpZ2h0IHNjYW5cclxuICAgICAgICBmb3IgKGxldCB4ID0geDA7IHggPCB4MTsgKyt4KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGkgPSB4IC0geDBcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgaXNSZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldF0gPT09IHJlZ2lvblxyXG5cclxuICAgICAgICAgICAgaWYgKGlzUmVnaW9uKSB7XHJcbiAgICAgICAgICAgICAgICBoc1tpXSArPSAxXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBoc1tpXSA9IDBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbCBzY2FuXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IHgwOyB4IDwgeDE7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCBpID0geCAtIHgwXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGNvbnN0IGlzUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXRdID09PSByZWdpb25cclxuXHJcbiAgICAgICAgICAgIGlmIChpc1JlZ2lvbikge1xyXG4gICAgICAgICAgICAgICAgbHNbaV0gPSBNYXRoLm1heChsc1tpXSwgbClcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxzW2ldID0gMFxyXG4gICAgICAgICAgICAgICAgbCA9IHggKyAxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHIgc2NhblxyXG4gICAgICAgIGZvciAobGV0IHggPSB4MSAtIDE7IHggPj0gMDsgLS14KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGkgPSB4IC0geDBcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgaXNSZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldF0gPT09IHJlZ2lvblxyXG5cclxuICAgICAgICAgICAgaWYgKGlzUmVnaW9uKSB7XHJcbiAgICAgICAgICAgICAgICByc1tpXSA9IE1hdGgubWluKHJzW2ldLCByKVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcnNbaV0gPSB4MVxyXG4gICAgICAgICAgICAgICAgciA9IHhcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYXJlYSBzY2FuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3aWR0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFyZWEgPSBoc1tpXSAqIChyc1tpXSAtIGxzW2ldKVxyXG4gICAgICAgICAgICBpZiAoYXJlYSA+IG1heEFyZWEpIHtcclxuICAgICAgICAgICAgICAgIG1heEFyZWEgPSBhcmVhXHJcbiAgICAgICAgICAgICAgICBib3VuZHMubWluWCA9IGxzW2ldXHJcbiAgICAgICAgICAgICAgICBib3VuZHMubWF4WCA9IHJzW2ldXHJcbiAgICAgICAgICAgICAgICBib3VuZHMubWluWSA9IHkgLSBoc1tpXVxyXG4gICAgICAgICAgICAgICAgYm91bmRzLm1heFkgPSB5XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KVxyXG5cclxuICAgIHJldHVybiBib3VuZHNcclxufVxyXG5cclxuZnVuY3Rpb24gZXhwbG9yZVJlZ2lvbih3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcGFsZXR0ZU92ZXJsYXk6IG51bWJlcltdLCB4MDogbnVtYmVyLCB5MDogbnVtYmVyLCByZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5KSB7XHJcbiAgICBjb25zdCBzdGFjazogbnVtYmVyW10gPSBbXVxyXG4gICAgY29uc3Qgb2Zmc2V0MCA9IHkwICogd2lkdGggKyB4MFxyXG4gICAgY29uc3QgcmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQwXVxyXG4gICAgaWYgKCFyZWdpb24pIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBjb2xvciA9IHJlZ2lvbi5jb2xvclxyXG5cclxuICAgIHN0YWNrLnB1c2goeDApXHJcbiAgICBzdGFjay5wdXNoKHkwKVxyXG5cclxuICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc3QgeSA9IHN0YWNrLnBvcCgpIGFzIG51bWJlclxyXG4gICAgICAgIGNvbnN0IHggPSBzdGFjay5wb3AoKSBhcyBudW1iZXJcclxuICAgICAgICBjb25zdCBvZmZzZXQgPSB5ICogd2lkdGggKyB4XHJcbiAgICAgICAgcmVnaW9uT3ZlcmxheVtvZmZzZXRdID0gcmVnaW9uXHJcbiAgICAgICAgcmVnaW9uLnBpeGVscysrXHJcblxyXG4gICAgICAgIC8vIGV4cGxvcmUgbmVpZ2hib3JzIChpZiBzYW1lIGNvbG9yKVxyXG4gICAgICAgIGNvbnN0IGwgPSB4IC0gMVxyXG4gICAgICAgIGNvbnN0IHIgPSB4ICsgMVxyXG4gICAgICAgIGNvbnN0IHQgPSB5IC0gMVxyXG4gICAgICAgIGNvbnN0IGIgPSB5ICsgMVxyXG5cclxuICAgICAgICBpZiAobCA+PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldDEgPSBvZmZzZXQgLSAxXHJcbiAgICAgICAgICAgIGNvbnN0IHJlZ2lvbjEgPSByZWdpb25PdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbG9yMSA9IHBhbGV0dGVPdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGlmICghcmVnaW9uMSAmJiBjb2xvciA9PT0gY29sb3IxKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKGwpXHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChyIDwgd2lkdGgpIHtcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0MSA9IG9mZnNldCArIDFcclxuICAgICAgICAgICAgY29uc3QgcmVnaW9uMSA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgY29uc3QgY29sb3IxID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgaWYgKCFyZWdpb24xICYmIGNvbG9yID09PSBjb2xvcjEpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2gocilcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHQgPj0gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQxID0gb2Zmc2V0IC0gd2lkdGhcclxuICAgICAgICAgICAgY29uc3QgcmVnaW9uMSA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgY29uc3QgY29sb3IxID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgaWYgKCFyZWdpb24xICYmIGNvbG9yID09PSBjb2xvcjEpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeClcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2godClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGIgPCBoZWlnaHQpIHtcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0MSA9IG9mZnNldCArIHdpZHRoXHJcbiAgICAgICAgICAgIGNvbnN0IHJlZ2lvbjEgPSByZWdpb25PdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbG9yMSA9IHBhbGV0dGVPdmVybGF5W29mZnNldDFdXHJcbiAgICAgICAgICAgIGlmICghcmVnaW9uMSAmJiBjb2xvciA9PT0gY29sb3IxKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHgpXHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKGIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdCb3JkZXJzKHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXksIGltYWdlRGF0YTogSW1hZ2VEYXRhKSB7XHJcbiAgICAvLyBjb2xvciBib3JkZXJzXHJcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQsIGRhdGEgfSA9IGltYWdlRGF0YVxyXG4gICAgaW1hZ2luZy5zY2FuSW1hZ2VEYXRhKGltYWdlRGF0YSwgKHgsIHksIG9mZnNldCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XVxyXG4gICAgICAgIGlmICghcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbCA9IHggLSAxXHJcbiAgICAgICAgY29uc3QgciA9IHggKyAxXHJcbiAgICAgICAgY29uc3QgdCA9IHkgLSAxXHJcbiAgICAgICAgY29uc3QgYiA9IHkgKyAxXHJcblxyXG4gICAgICAgIC8vIGVkZ2UgY2VsbHMgYXJlIG5vdCBib3JkZXIgKGZvciBub3cpXHJcbiAgICAgICAgaWYgKGwgPCAwIHx8IHIgPj0gd2lkdGggfHwgdCA8IDAgfHwgYiA+PSBoZWlnaHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBsUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQgLSAxXVxyXG4gICAgICAgIGlmIChsUmVnaW9uICYmIGxSZWdpb24gIT09IHJlZ2lvbikge1xyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDRdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAxXSA9IDBcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMl0gPSAwXHJcbiAgICAgICAgICAgIHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHJSZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldCArIDFdXHJcbiAgICAgICAgaWYgKHJSZWdpb24gJiYgclJlZ2lvbiAhPT0gcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNF0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDFdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAyXSA9IDBcclxuICAgICAgICAgICAgcmVnaW9uT3ZlcmxheVtvZmZzZXRdID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdFJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0IC0gd2lkdGhdXHJcbiAgICAgICAgaWYgKHRSZWdpb24gJiYgdFJlZ2lvbiAhPT0gcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNF0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDFdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAyXSA9IDBcclxuICAgICAgICAgICAgcmVnaW9uT3ZlcmxheVtvZmZzZXRdID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgYlJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0ICsgd2lkdGhdXHJcbiAgICAgICAgaWYgKGJSZWdpb24gJiYgYlJlZ2lvbiAhPT0gcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNF0gPSAwXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICogNCArIDFdID0gMFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAyXSA9IDBcclxuICAgICAgICAgICAgcmVnaW9uT3ZlcmxheVtvZmZzZXRdID0gbnVsbFxyXG4gICAgICAgIH1cclxuICAgIH0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbGxJbnRlcmlvcihkYXRhOiBVaW50OENsYW1wZWRBcnJheSwgcmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSkge1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZWdpb25PdmVybGF5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgcmVnaW9uID0gcmVnaW9uT3ZlcmxheVtpXVxyXG4gICAgICAgIGlmICghcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkYXRhW2kgKiA0XSA9IDI1NVxyXG4gICAgICAgIGRhdGFbaSAqIDQgKyAxXSA9IDI1NVxyXG4gICAgICAgIGRhdGFbaSAqIDQgKyAyXSA9IDI1NVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVQYWxldHRlVWkocGFsZXR0ZTogaW1hZ2luZy5Db2xvcltdKSB7XHJcbiAgICB1dGlsLnJlbW92ZUFsbENoaWxkcmVuKHBhbGV0dGVEaXYpXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhbGV0dGUubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCBjb2xvciA9IHBhbGV0dGVbaV1cclxuICAgICAgICBjb25zdCBsdW0gPSBpbWFnaW5nLmNhbGNMdW1pbmFuY2UoY29sb3IpXHJcbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBwYWxldHRlRW50cnlUZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgY29uc3QgZW50cnlEaXYgPSB1dGlsLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLnBhbGV0dGUtZW50cnlcIikgYXMgSFRNTEVsZW1lbnRcclxuICAgICAgICBlbnRyeURpdi50ZXh0Q29udGVudCA9IGAke2kgKyAxfWBcclxuICAgICAgICBlbnRyeURpdi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBgcmdiKCR7Y29sb3JbMF19LCAke2NvbG9yWzFdfSwgJHtjb2xvclsyXX0pYFxyXG4gICAgICAgIGVudHJ5RGl2LnN0eWxlLmNvbG9yID0gbHVtIDwgLjUgPyBcIndoaXRlXCIgOiBcImJsYWNrXCJcclxuICAgICAgICBwYWxldHRlRGl2LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3UmVnaW9uTGFiZWxzKGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCByZWdpb25zOiBSZWdpb25bXSkge1xyXG4gICAgY3R4LmZvbnQgPSBcIjE2cHggYXJpYWwgYm9sZFwiXHJcbiAgICBjb25zdCB0ZXh0SGVpZ2h0ID0gY3R4Lm1lYXN1cmVUZXh0KFwiTVwiKS53aWR0aFxyXG4gICAgY29uc3QgZm9udCA9IGN0eC5mb250XHJcblxyXG4gICAgZm9yIChjb25zdCByZWdpb24gb2YgcmVnaW9ucykge1xyXG4gICAgICAgIGlmIChyZWdpb24uY29sb3IgPT09IC0xKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBsYWJlbCA9IGAke3JlZ2lvbi5jb2xvciArIDF9YFxyXG4gICAgICAgIGNvbnN0IG1ldHJpY3MgPSBjdHgubWVhc3VyZVRleHQobGFiZWwpXHJcbiAgICAgICAgY29uc3QgY2VudGVyID0gY2FsY0NlbnRlcihyZWdpb24ubWF4UmVjdClcclxuICAgICAgICBjb25zdCB4ID0gY2VudGVyWzBdIC0gbWV0cmljcy53aWR0aCAvIDJcclxuICAgICAgICBjb25zdCB5ID0gY2VudGVyWzFdICsgdGV4dEhlaWdodCAvIDJcclxuICAgICAgICBjdHguZmlsbFRleHQobGFiZWwsIHgsIHkpXHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmZvbnQgPSBmb250XHJcbn0iXX0=