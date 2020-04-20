import * as util from "../util.js";
var CameraMode;
(function (CameraMode) {
    CameraMode[CameraMode["None"] = 0] = "None";
    CameraMode[CameraMode["User"] = 1] = "User";
    CameraMode[CameraMode["Environment"] = 2] = "Environment";
})(CameraMode || (CameraMode = {}));
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
    // TODO: temporary for testing purposes - remove this
    loadFromUrl("mario.jpg");
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
    // convert to xyz colors and palettize data
    const data = imageData2RGBArray(imageData.data);
    const [palette, palettizedData] = palettizeMedianCut(data, 8);
    const cells = palettizedData.map(i => ({
        color: i,
        region: -1,
        border: false
    }));
    const regions = findRegions(imageData.width, imageData.height, cells);
    findBorders(imageData.width, imageData.height, cells);
    // don't color border cells in regions we are leaving colored
    for (const cell of cells) {
        const region = regions[cell.region];
        if (region.leaveColored) {
            cell.border = false;
        }
    }
    // fill borders and regions
    // leave regions that are too thin or small to color colored
    for (let i = 0; i < cells.length; ++i) {
        const cell = cells[i];
        const l = cell.border ? 0 : 255;
        const region = regions[cell.region];
        if (region.leaveColored) {
            const color = palette[cell.color];
            imageData.data[i * 4] = color[0];
            imageData.data[i * 4 + 1] = color[1];
            imageData.data[i * 4 + 2] = color[2];
            continue;
        }
        imageData.data[i * 4] = l;
        imageData.data[i * 4 + 1] = l;
        imageData.data[i * 4 + 2] = l;
    }
    // DEBUG ONLY - show palettized image
    // for (let i = 0; i < palettizedData.length; ++i) {
    //     const colorIdx = palettizedData[i]
    //     const color = palette[colorIdx]
    //     imageData.data[i * 4] = color[0]
    //     imageData.data[i * 4 + 1] = color[1]
    //     imageData.data[i * 4 + 2] = color[2]
    // }
    ctx.putImageData(imageData, 0, 0);
    createPaletteUi(palette);
    drawRegionLabels(ctx, regions);
}
// function calcDistSq(p1: Color, p2: Color): number {
//     const [x1, y1, z1] = p1
//     const [x2, y2, z2] = p2
//     const dx = x2 - x1
//     const dy = y2 - y1
//     const dz = z2 - z1
//     const dist = dx * dx + dy * dy + dz * dz
//     return dist
// }
function palettizeMedianCut(data, maxColors) {
    const buckets = [];
    // place all colors in initial bucket
    const bucket = [];
    for (let i = 0; i < data.length; ++i) {
        bucket.push(i);
    }
    buckets.push(bucket);
    while (buckets.length < maxColors) {
        const bucket = chooseBucket(data, buckets);
        const newBucket = splitBucket(data, bucket);
        buckets.push(newBucket);
    }
    // choose color for each bucket
    const palette = buckets.map(b => divXYZ(b.reduce((xyz, i) => addXYZ(xyz, data[i]), [0, 0, 0]), b.length));
    const palettizedData = data.map(() => 0);
    for (let i = 0; i < buckets.length; ++i) {
        const bucket = buckets[i];
        for (let j = 0; j < bucket.length; ++j) {
            palettizedData[bucket[j]] = i;
        }
    }
    return [palette, palettizedData];
}
function chooseBucket(data, buckets) {
    const bucket = buckets.reduce((b1, b2) => calcBucketRange(data, b1) > calcBucketRange(data, b2) ? b1 : b2);
    return bucket;
}
function calcBucketRange(data, bucket) {
    const lx = bucket.reduce((min, i) => min < data[i][0] ? min : data[i][0], Infinity);
    const rx = bucket.reduce((max, i) => max > data[i][0] ? max : data[i][0], 0);
    const ly = bucket.reduce((min, i) => min < data[i][1] ? min : data[i][1], Infinity);
    const ry = bucket.reduce((max, i) => max > data[i][1] ? max : data[i][1], 0);
    const lz = bucket.reduce((min, i) => min < data[i][2] ? min : data[i][2], Infinity);
    const rz = bucket.reduce((max, i) => max > data[i][2] ? max : data[i][2], 0);
    const dx = rx - lx;
    const dy = ry - ly;
    const dz = rz - lz;
    const d = Math.max(dx, dy, dz);
    return d;
}
function splitBucket(data, bucket) {
    if (bucket.length <= 1) {
        throw Error("Bucket must have at least two elements to split");
    }
    // determine component with max range in bucket
    const lx = bucket.reduce((min, i) => min < data[i][0] ? min : data[i][0], Infinity);
    const rx = bucket.reduce((max, i) => max > data[i][0] ? max : data[i][0], 0);
    const ly = bucket.reduce((min, i) => min < data[i][1] ? min : data[i][1], Infinity);
    const ry = bucket.reduce((max, i) => max > data[i][1] ? max : data[i][1], 0);
    const lz = bucket.reduce((min, i) => min < data[i][2] ? min : data[i][2], Infinity);
    const rz = bucket.reduce((max, i) => max > data[i][2] ? max : data[i][2], 0);
    const dx = rx - lx;
    const dy = ry - ly;
    const dz = rz - lz;
    const d = Math.max(dx, dy, dz);
    if (dx === d) {
        bucket.sort((a, b) => data[a][0] - data[b][0]);
    }
    else if (dy === d) {
        bucket.sort((a, b) => data[a][1] - data[b][1]);
    }
    else if (dz === d) {
        bucket.sort((a, b) => data[a][2] - data[b][2]);
    }
    // left half of array stays in bucket
    // right half moves to new bucket
    const medianIdx = Math.floor(bucket.length / 2);
    const newBucket = bucket.splice(medianIdx, bucket.length - medianIdx);
    return newBucket;
}
function divXYZ(xyz, s) {
    const [x, y, z] = xyz;
    return [x / s, y / s, z / s];
}
function addXYZ(xyz1, xyz2) {
    return [xyz1[0] + xyz2[0], xyz1[1] + xyz2[1], xyz1[2] + xyz2[2]];
}
function findRegions(width, height, cells) {
    let region = 0;
    for (let y = 0; y < height; ++y) {
        let yOffset = y * width;
        for (let x = 0; x < width; ++x) {
            let xOffset = yOffset + x;
            const cell = cells[xOffset];
            if (cell.region != -1) {
                continue;
            }
            cell.region = region;
            scanRegion(width, height, x, y, cells);
            ++region;
        }
    }
    const regions = [];
    for (let i = 0; i < region; ++i) {
        regions.push({
            pixels: 0,
            centroidX: 0,
            centroidY: 0,
            color: -1,
            minX: Infinity,
            maxX: -1,
            minY: Infinity,
            maxY: -1,
            width: 0,
            height: 0,
            leaveColored: false
        });
    }
    for (let y = 0; y < height; ++y) {
        let yOffset = y * width;
        for (let x = 0; x < width; ++x) {
            let xOffset = yOffset + x;
            const cell = cells[xOffset];
            const region = regions[cell.region];
            region.pixels++;
            region.centroidX += x;
            region.centroidY += y;
            region.color = cell.color;
            region.minX = Math.min(x, region.minX);
            region.minY = Math.min(y, region.minY);
            region.maxX = Math.max(x, region.maxX);
            region.maxY = Math.max(y, region.maxY);
        }
    }
    for (const region of regions) {
        region.centroidX /= region.pixels;
        region.centroidY /= region.pixels;
        region.width = region.maxX - region.minX;
        region.height = region.maxY - region.minY;
    }
    for (const region of regions) {
        region.leaveColored = region.width < 32 || region.height < 32 || region.pixels < 512;
    }
    return regions;
}
function findBorders(width, height, cells) {
    // color borders
    for (let y = 0; y < height; ++y) {
        let yOffset = y * width;
        for (let x = 0; x < width; ++x) {
            let xOffset = yOffset + x;
            const cell = cells[xOffset];
            const l = x - 1;
            const r = x + 1;
            const t = y - 1;
            const b = y + 1;
            // edge cells are border
            if (l < 0 || r >= width || t < 0 || b >= height) {
                cell.border = true;
                continue;
            }
            if (cells[xOffset - 1].region != cell.region) {
                cell.border = true;
            }
            if (cells[xOffset + 1].region != cell.region) {
                cell.border = true;
            }
            if (cells[xOffset - width].region != cell.region) {
                cell.border = true;
            }
            if (cells[xOffset + width].region != cell.region) {
                cell.border = true;
            }
        }
    }
}
function scanRegion(width, height, x0, y0, cells) {
    const stack = [];
    stack.push(x0);
    stack.push(y0);
    const offset0 = y0 * width + x0;
    const cell0 = cells[offset0];
    const region0 = cell0.region;
    const color0 = cell0.color;
    while (stack.length > 0) {
        const y = stack.pop();
        const x = stack.pop();
        const offset = y * width + x;
        const cell = cells[offset];
        cell.region = region0;
        // explore neighbors (if same color)
        const l = x - 1;
        const r = x + 1;
        const t = y - 1;
        const b = y + 1;
        if (l >= 0) {
            const cell1 = cells[offset - 1];
            if (cell1.region == -1 && cell1.color == color0) {
                stack.push(l);
                stack.push(y);
            }
        }
        if (r < width) {
            const cell1 = cells[offset + 1];
            if (cell1.region == -1 && cell1.color == color0) {
                stack.push(r);
                stack.push(y);
            }
        }
        if (t >= 0) {
            const cell1 = cells[offset - width];
            if (cell1.region == -1 && cell1.color == color0) {
                stack.push(x);
                stack.push(t);
            }
        }
        if (b < height) {
            const cell1 = cells[offset + width];
            if (cell1.region == -1 && cell1.color == color0) {
                stack.push(x);
                stack.push(b);
            }
        }
    }
}
// function linear(x: number) {
//     if (x <= .04045) {
//         return x / 12.92
//     }
//     return Math.pow(((x + .055) / 1.055), 2.4)
// }
function imageData2RGBArray(data) {
    const result = [];
    for (let i = 0; i < data.length; i += 4) {
        result.push([data[i], data[i + 1], data[i + 2]]);
    }
    return result;
}
function createPaletteUi(palette) {
    util.removeAllChildren(paletteDiv);
    for (let i = 0; i < palette.length; ++i) {
        const color = palette[i];
        const lum = calcLuminance(color);
        const fragment = paletteEntryTemplate.content.cloneNode(true);
        const entryDiv = util.bySelector(fragment, ".palette-entry");
        entryDiv.textContent = i.toString();
        entryDiv.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        entryDiv.style.color = lum < .5 ? "white" : "black";
        paletteDiv.appendChild(fragment);
    }
}
function calcLuminance(color) {
    const [r, g, b] = color;
    const l = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
    return l;
}
function drawRegionLabels(ctx, regions) {
    const height = ctx.measureText("M").width;
    const font = ctx.font;
    ctx.font = "16px arial bold";
    for (const region of regions) {
        if (region.leaveColored) {
            continue;
        }
        const label = `${region.color + 1}`;
        const metrics = ctx.measureText(label);
        const x = region.centroidX - metrics.width / 2;
        const y = region.centroidY - height / 2;
        ctx.fillText(label, x, y);
    }
    ctx.font = font;
}
// function rgb2xyz(rgb: Color): Color {
//     let [r, b, g] = rgb
//     r /= 255.0
//     g /= 255.0
//     b /= 255.0
//     const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
//     const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
//     const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041
//     return [x, y, z]
// }
// function xyz2rgb(xyz: Color): Color {
//     const [x, y, z] = xyz
//     const r = (x * 3.2404542 + y * -1.5371385 + z * -0.4985314) * 255
//     const g = (x * -0.9692660 + y * 1.8760108 + z * 0.0415560) * 255
//     const b = (x * 0.0556434 + y * -0.2040259 + z * 1.0572252) * 255
//     return [r, g, b]
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxJQUFJLE1BQU0sWUFBWSxDQUFBO0FBc0JsQyxJQUFLLFVBSUo7QUFKRCxXQUFLLFVBQVU7SUFDWCwyQ0FBSSxDQUFBO0lBQ0osMkNBQUksQ0FBQTtJQUNKLHlEQUFXLENBQUE7QUFDZixDQUFDLEVBSkksVUFBVSxLQUFWLFVBQVUsUUFJZDtBQUlELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFxQixDQUFBO0FBQ3RELElBQUksVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUE7QUFDaEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQXNCLENBQUE7QUFDdkQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQW1CLENBQUE7QUFDbkUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQW1CLENBQUE7QUFDekQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBd0IsQ0FBQTtBQUU3RSxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBNkIsQ0FBQTtBQUMvRCxJQUFJLENBQUMsR0FBRyxFQUFFO0lBQ04saUJBQWlCLENBQUMsOEJBQThCLENBQUMsQ0FBQTtDQUNwRDtBQUVELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBc0IsQ0FBQTtBQUMvRSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBbUIsQ0FBQTtBQUNwRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBbUIsQ0FBQTtBQUVwRCxJQUFJLEVBQUUsQ0FBQTtBQUVOLEtBQUssVUFBVSxJ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QUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDNUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ25GLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM1RSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDbkYsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzVFLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUE7SUFDbEIsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQTtJQUNsQixNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFBO0lBQ2xCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUM5QixPQUFPLENBQUMsQ0FBQTtBQUNaLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxJQUFhLEVBQUUsTUFBZ0I7SUFDaEQsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtRQUNwQixNQUFNLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFBO0tBQ2pFO0lBRUQsK0NBQStDO0lBQy9DLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNuRixNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDNUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ25GLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM1RSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDbkYsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzVFLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUE7SUFDbEIsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQTtJQUNsQixNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFBO0lBQ2xCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUU5QixJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUU7UUFDVixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQ2pEO1NBQU0sSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFO1FBQ2pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FDakQ7U0FBTSxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUU7UUFDakIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUNqRDtJQUVELHFDQUFxQztJQUNyQyxpQ0FBaUM7SUFDakMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQy9DLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUE7SUFDckUs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QUcsQ0FBQyxDQUFBO1FBQ2YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUVmLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNSLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDL0IsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLElBQUksTUFBTSxFQUFFO2dCQUM3QyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNiLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7YUFDaEI7U0FDSjtRQUVELElBQUksQ0FBQyxHQUFHLEtBQUssRUFBRTtZQUNYLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDL0IsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLElBQUksTUFBTSxFQUFFO2dCQUM3QyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNiLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7YUFDaEI7U0FDSjtRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNSLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUE7WUFDbkMsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLElBQUksTUFBTSxFQUFFO2dCQUM3QyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNiLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7YUFDaEI7U0FDSjtRQUVELElBQUksQ0FBQyxHQUFHLE1BQU0sRUFBRTtZQUNaLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLENB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QVE7U0FDWDtRQUVELE1BQU0sS0FBSyxHQUFHLEdBQUcsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQTtRQUNuQyxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLFNBQVMsR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtLQUM1QjtJQUVELEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO0FBQ25CLENBQUM7QUFFRCx3Q0FBd0M7QUFDeEMsMEJBQTBCO0FBQzFCLGlCQUFpQjtBQUNqQixpQkFBaUI7QUFDakIsaUJBQWlCO0FBRWpCLDhEQUE4RDtBQUM5RCw4REFBOEQ7QUFDOUQsOERBQThEO0FBQzlELHVCQUF1QjtBQUN2QixJQUFJO0FBRUosd0NBQXdDO0FBQ3hDLDRCQUE0QjtBQUM1Qix3RUFBd0U7QUFDeEUsdUVBQXVFO0FBQ3ZFLHVFQUF1RTtBQUN2RSx1QkFBdUI7QUFDdkIsSUFBSSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHV0aWwgZnJvbSBcIi4uL3V0aWwuanNcIlxyXG5cclxuaW50ZXJmYWNlIENlbGwge1xyXG4gICAgY29sb3I6IG51bWJlclxyXG4gICAgcmVnaW9uOiBudW1iZXJcclxuICAgIGJvcmRlcjogYm9vbGVhblxyXG59XHJcblxyXG5pbnRlcmZhY2UgUmVnaW9uIHtcclxuICAgIGNvbG9yOiBudW1iZXJcclxuICAgIG1pblg6IG51bWJlclxyXG4gICAgbWF4WDogbnVtYmVyXHJcbiAgICBtaW5ZOiBudW1iZXJcclxuICAgIG1heFk6IG51bWJlclxyXG4gICAgd2lkdGg6IG51bWJlclxyXG4gICAgaGVpZ2h0OiBudW1iZXJcclxuICAgIHBpeGVsczogbnVtYmVyXHJcbiAgICBjZW50cm9pZFg6IG51bWJlclxyXG4gICAgY2VudHJvaWRZOiBudW1iZXJcclxuICAgIGxlYXZlQ29sb3JlZDogYm9vbGVhblxyXG59XHJcblxyXG5lbnVtIENhbWVyYU1vZGUge1xyXG4gICAgTm9uZSxcclxuICAgIFVzZXIsXHJcbiAgICBFbnZpcm9ubWVudCxcclxufVxyXG5cclxudHlwZSBDb2xvciA9IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXVxyXG5cclxuY29uc3QgY2FtZXJhID0gdXRpbC5ieUlkKFwiY2FtZXJhXCIpIGFzIEhUTUxWaWRlb0VsZW1lbnRcclxubGV0IGNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLk5vbmVcclxuY29uc3QgY2FudmFzID0gdXRpbC5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbmNvbnN0IGFjcXVpcmVJbWFnZURpdiA9IHV0aWwuYnlJZChcImFjcXVpcmVJbWFnZVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5jb25zdCBwYWxldHRlRGl2ID0gdXRpbC5ieUlkKFwicGFsZXR0ZVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG5jb25zdCBwYWxldHRlRW50cnlUZW1wbGF0ZSA9IHV0aWwuYnlJZChcInBhbGV0dGVFbnRyeVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcblxyXG5jb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIGFzIENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRFxyXG5pZiAoIWN0eCkge1xyXG4gICAgdGhyb3dFcnJvck1lc3NhZ2UoXCJDYW52YXMgZWxlbWVudCBub3Qgc3VwcG9ydGVkXCIpXHJcbn1cclxuXHJcbmNvbnN0IGNhcHR1cmVJbWFnZUJ1dHRvbiA9IHV0aWwuYnlJZChcImNhcHR1cmVJbWFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5jb25zdCBsb2FkVWkgPSB1dGlsLmJ5SWQoXCJsb2FkVWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuY29uc3QgcGxheVVpID0gdXRpbC5ieUlkKFwicGxheVVpXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcblxyXG5pbml0KClcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICBjb25zdCBmaWxlRHJvcEJveCA9IHV0aWwuYnlJZChcImZpbGVEcm9wQm94XCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBjb25zdCBmaWxlSW5wdXQgPSB1dGlsLmJ5SWQoXCJmaWxlSW5wdXRcIikgYXMgSFRNTElucHV0RWxlbWVudFxyXG4gICAgY29uc3QgZmlsZUJ1dHRvbiA9IHV0aWwuYnlJZChcImZpbGVCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIGNvbnN0IHVzZUNhbWVyYUJ1dHRvbiA9IHV0aWwuYnlJZChcInVzZUNhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgY29uc3QgZmxpcENhbWVyYUJ1dHRvbiA9IHV0aWwuYnlJZChcImZsaXBDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIGNvbnN0IHN0b3BDYW1lcmFCdXR0b24gPSB1dGlsLmJ5SWQoXCJzdG9wQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBjb25zdCByZXR1cm5CdXR0b24gPSB1dGlsLmJ5SWQoXCJyZXR1cm5CdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuXHJcbiAgICBmaWxlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgZmlsZUlucHV0LmNsaWNrKClcclxuICAgIH0pXHJcblxyXG4gICAgZmlsZURyb3BCb3guYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdlbnRlclwiLCBvbkRyYWdFbnRlck92ZXIpXHJcbiAgICBmaWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ292ZXJcIiwgb25EcmFnRW50ZXJPdmVyKVxyXG4gICAgZmlsZURyb3BCb3guYWRkRXZlbnRMaXN0ZW5lcihcImRyb3BcIiwgb25GaWxlRHJvcClcclxuXHJcbiAgICBmaWxlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB7XHJcbiAgICAgICAgaWYgKCFmaWxlSW5wdXQuZmlsZXM/Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGZpbGUgPSBmaWxlSW5wdXQuZmlsZXNbMF1cclxuICAgICAgICBwcm9jZXNzRmlsZShmaWxlKVxyXG4gICAgfSlcclxuXHJcbiAgICB1c2VDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHVzZUNhbWVyYSlcclxuICAgIGZsaXBDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZsaXBDYW1lcmEpXHJcbiAgICBzdG9wQ2FtZXJhQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBzdG9wQ2FtZXJhKVxyXG4gICAgY2FwdHVyZUltYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBjYXB0dXJlSW1hZ2UpXHJcbiAgICByZXR1cm5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHNob3dMb2FkVWkpXHJcblxyXG4gICAgLy8gVE9ETzogdGVtcG9yYXJ5IGZvciB0ZXN0aW5nIHB1cnBvc2VzIC0gcmVtb3ZlIHRoaXNcclxuICAgIGxvYWRGcm9tVXJsKFwibWFyaW8uanBnXCIpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9uRHJhZ0VudGVyT3ZlcihldjogRHJhZ0V2ZW50KSB7XHJcbiAgICBldi5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgZXYucHJldmVudERlZmF1bHQoKVxyXG59XHJcblxyXG5mdW5jdGlvbiBvbkZpbGVEcm9wKGV2OiBEcmFnRXZlbnQpIHtcclxuICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICBldi5wcmV2ZW50RGVmYXVsdCgpXHJcblxyXG4gICAgaWYgKCFldj8uZGF0YVRyYW5zZmVyPy5maWxlcz8ubGVuZ3RoKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZmlsZSA9IGV2LmRhdGFUcmFuc2Zlci5maWxlc1swXVxyXG4gICAgcHJvY2Vzc0ZpbGUoZmlsZSlcclxufVxyXG5cclxuZnVuY3Rpb24gcHJvY2Vzc0ZpbGUoZmlsZTogRmlsZSkge1xyXG4gICAgY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSlcclxuICAgIGxvYWRGcm9tVXJsKHVybClcclxufVxyXG5cclxuZnVuY3Rpb24gbG9hZEZyb21VcmwodXJsOiBzdHJpbmcpIHtcclxuICAgIGNsZWFyRXJyb3JNZXNzYWdlcygpXHJcbiAgICBjb25zdCBpbWcgPSBuZXcgSW1hZ2UoKVxyXG4gICAgaW1nLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsICgpID0+IHtcclxuICAgICAgICBzaG93UGxheVVpKGltZywgaW1nLndpZHRoLCBpbWcuaGVpZ2h0KVxyXG4gICAgfSlcclxuXHJcbiAgICBpbWcuc3JjID0gdXJsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFyRXJyb3JNZXNzYWdlcygpIHtcclxuICAgIGNvbnN0IGVycm9yc0RpdiA9IHV0aWwuYnlJZChcImVycm9yc1wiKVxyXG4gICAgdXRpbC5yZW1vdmVBbGxDaGlsZHJlbihlcnJvcnNEaXYpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFwcGVuZEVycm9yTWVzc2FnZShlcnJvcjogc3RyaW5nKSB7XHJcbiAgICBjb25zb2xlLmxvZyhlcnJvcilcclxuICAgIGNvbnN0IGVycm9yc0RpdiA9IHV0aWwuYnlJZChcImVycm9yc1wiKTtcclxuICAgIGNvbnN0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICBkaXYuY2xhc3NMaXN0LmFkZChcImVycm9yLW1lc3NhZ2VcIilcclxuICAgIGRpdi50ZXh0Q29udGVudCA9IGVycm9yXHJcbiAgICBlcnJvcnNEaXYuYXBwZW5kQ2hpbGQoZGl2KVxyXG59XHJcblxyXG5mdW5jdGlvbiB0aHJvd0Vycm9yTWVzc2FnZShlcnJvcjogc3RyaW5nKSB7XHJcbiAgICBhcHBlbmRFcnJvck1lc3NhZ2UoZXJyb3IpXHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3IpXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHVzZUNhbWVyYSgpIHtcclxuICAgIGFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgY29uc3QgZGlhbG9nV2lkdGggPSBhY3F1aXJlSW1hZ2VEaXYuY2xpZW50V2lkdGhcclxuICAgIGNvbnN0IGRpYWxvZ0hlaWdodCA9IGFjcXVpcmVJbWFnZURpdi5jbGllbnRIZWlnaHRcclxuICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcclxuICAgICAgICB2aWRlbzogeyB3aWR0aDogeyBtYXg6IGRpYWxvZ1dpZHRoIH0sIGhlaWdodDogeyBtYXg6IGRpYWxvZ0hlaWdodCB9LCBmYWNpbmdNb2RlOiBcInVzZXJcIiB9LFxyXG4gICAgICAgIGF1ZGlvOiBmYWxzZVxyXG4gICAgfSlcclxuXHJcbiAgICBjYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Vc2VyXHJcbiAgICBjYW1lcmEuc3JjT2JqZWN0ID0gc3RyZWFtXHJcbiAgICBjYW1lcmEuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZG1ldGFkYXRhXCIsIG9uQ2FtZXJhTG9hZClcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZmxpcENhbWVyYSgpIHtcclxuICAgIGlmICghY2FtZXJhLnNyY09iamVjdCkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHNyYyA9IGNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgIGNvbnN0IHRyYWNrcyA9IHNyYy5nZXRUcmFja3MoKVxyXG4gICAgZm9yIChjb25zdCB0cmFjayBvZiB0cmFja3MpIHtcclxuICAgICAgICB0cmFjay5zdG9wKClcclxuICAgIH1cclxuXHJcbiAgICBjYW1lcmFNb2RlID0gY2FtZXJhTW9kZSA9PSBDYW1lcmFNb2RlLlVzZXIgPyBDYW1lcmFNb2RlLkVudmlyb25tZW50IDogQ2FtZXJhTW9kZS5Vc2VyXHJcbiAgICBjb25zdCBmYWNpbmdNb2RlID0gY2FtZXJhTW9kZSA9PSBDYW1lcmFNb2RlLlVzZXIgPyBcInVzZXJcIiA6IFwiZW52aXJvbm1lbnRcIlxyXG5cclxuICAgIC8vIGdldCBjdXJyZW50IGZhY2luZyBtb2RlXHJcbiAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7XHJcbiAgICAgICAgdmlkZW86IHsgd2lkdGg6IGNhbWVyYS5jbGllbnRXaWR0aCwgaGVpZ2h0OiBjYW1lcmEuY2xpZW50SGVpZ2h0LCBmYWNpbmdNb2RlOiBmYWNpbmdNb2RlIH0sXHJcbiAgICAgICAgYXVkaW86IGZhbHNlXHJcbiAgICB9KVxyXG5cclxuICAgIGNhbWVyYS5zcmNPYmplY3QgPSBzdHJlYW1cclxuICAgIGNhbWVyYS5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkbWV0YWRhdGFcIiwgb25DYW1lcmFMb2FkKVxyXG59XHJcblxyXG5mdW5jdGlvbiBvbkNhbWVyYUxvYWQoKSB7XHJcbiAgICBjb25zb2xlLmxvZyhjYW1lcmEuY2xpZW50V2lkdGgsIGNhbWVyYS5jbGllbnRIZWlnaHQsIGNhbWVyYS53aWR0aCwgY2FtZXJhLmhlaWdodCwgY2FtZXJhLnZpZGVvV2lkdGgsIGNhbWVyYS52aWRlb0hlaWdodClcclxuICAgIGFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgY2FtZXJhLnBsYXkoKVxyXG5cclxufVxyXG5cclxuZnVuY3Rpb24gc3RvcENhbWVyYSgpIHtcclxuICAgIGNvbnN0IHNyYyA9IGNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgIGlmICghc3JjKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdHJhY2tzID0gc3JjLmdldFRyYWNrcygpXHJcbiAgICBmb3IgKGNvbnN0IHRyYWNrIG9mIHRyYWNrcykge1xyXG4gICAgICAgIHRyYWNrLnN0b3AoKVxyXG4gICAgfVxyXG5cclxuICAgIGNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLk5vbmVcclxuICAgIGFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSB0cnVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhcHR1cmVJbWFnZSgpIHtcclxuICAgIGNsZWFyRXJyb3JNZXNzYWdlcygpXHJcblxyXG4gICAgY29uc3Qgc3JjID0gY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgaWYgKCFzcmMpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0cmFjayA9IHNyYy5nZXRWaWRlb1RyYWNrcygpWzBdXHJcbiAgICBpZiAoIXRyYWNrKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgc2hvd1BsYXlVaShjYW1lcmEsIGNhbWVyYS52aWRlb1dpZHRoLCBjYW1lcmEudmlkZW9IZWlnaHQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93UGxheVVpKGltZzogQ2FudmFzSW1hZ2VTb3VyY2UsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKSB7XHJcbiAgICAvLyBtYWludGFpbiBhc3BlY3QgcmF0aW8hXHJcbiAgICBjb25zdCB2dyA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aFxyXG4gICAgY29uc3QgdmggPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0XHJcblxyXG4gICAgaWYgKHZ3IDwgdmgpIHtcclxuICAgICAgICBjYW52YXMud2lkdGggPSB2d1xyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSB2dyAqIGhlaWdodCAvIHdpZHRoXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSB2aFxyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHZoICogd2lkdGggLyBoZWlnaHRcclxuICAgIH1cclxuXHJcbiAgICBsb2FkVWkuaGlkZGVuID0gdHJ1ZVxyXG4gICAgcGxheVVpLmhpZGRlbiA9IGZhbHNlXHJcblxyXG4gICAgY3R4LmRyYXdJbWFnZShpbWcsIDAsIDAsIGNhbnZhcy5jbGllbnRXaWR0aCwgY2FudmFzLmNsaWVudEhlaWdodClcclxuICAgIHByb2Nlc3NJbWFnZSgpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3dMb2FkVWkoKSB7XHJcbiAgICBsb2FkVWkuaGlkZGVuID0gZmFsc2VcclxuICAgIHBsYXlVaS5oaWRkZW4gPSB0cnVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByb2Nlc3NJbWFnZSgpIHtcclxuICAgIC8vIGdldCAoZmxhdCkgaW1hZ2UgZGF0YSBmcm9tIGNhbnZhc1xyXG4gICAgY29uc3QgaW1hZ2VEYXRhID0gY3R4LmdldEltYWdlRGF0YSgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpXHJcblxyXG4gICAgLy8gY29udmVydCB0byB4eXogY29sb3JzIGFuZCBwYWxldHRpemUgZGF0YVxyXG4gICAgY29uc3QgZGF0YSA9IGltYWdlRGF0YTJSR0JBcnJheShpbWFnZURhdGEuZGF0YSlcclxuICAgIGNvbnN0IFtwYWxldHRlLCBwYWxldHRpemVkRGF0YV0gPSBwYWxldHRpemVNZWRpYW5DdXQoZGF0YSwgOClcclxuXHJcbiAgICBjb25zdCBjZWxsczogQ2VsbFtdID0gcGFsZXR0aXplZERhdGEubWFwKGkgPT4gKHtcclxuICAgICAgICBjb2xvcjogaSxcclxuICAgICAgICByZWdpb246IC0xLFxyXG4gICAgICAgIGJvcmRlcjogZmFsc2VcclxuICAgIH0pKVxyXG5cclxuICAgIGNvbnN0IHJlZ2lvbnMgPSBmaW5kUmVnaW9ucyhpbWFnZURhdGEud2lkdGgsIGltYWdlRGF0YS5oZWlnaHQsIGNlbGxzKVxyXG4gICAgZmluZEJvcmRlcnMoaW1hZ2VEYXRhLndpZHRoLCBpbWFnZURhdGEuaGVpZ2h0LCBjZWxscylcclxuXHJcbiAgICAvLyBkb24ndCBjb2xvciBib3JkZXIgY2VsbHMgaW4gcmVnaW9ucyB3ZSBhcmUgbGVhdmluZyBjb2xvcmVkXHJcbiAgICBmb3IgKGNvbnN0IGNlbGwgb2YgY2VsbHMpIHtcclxuICAgICAgICBjb25zdCByZWdpb24gPSByZWdpb25zW2NlbGwucmVnaW9uXVxyXG4gICAgICAgIGlmIChyZWdpb24ubGVhdmVDb2xvcmVkKSB7XHJcbiAgICAgICAgICAgIGNlbGwuYm9yZGVyID0gZmFsc2VcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZmlsbCBib3JkZXJzIGFuZCByZWdpb25zXHJcbiAgICAvLyBsZWF2ZSByZWdpb25zIHRoYXQgYXJlIHRvbyB0aGluIG9yIHNtYWxsIHRvIGNvbG9yIGNvbG9yZWRcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2VsbHMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCBjZWxsID0gY2VsbHNbaV1cclxuICAgICAgICBjb25zdCBsID0gY2VsbC5ib3JkZXIgPyAwIDogMjU1XHJcbiAgICAgICAgY29uc3QgcmVnaW9uID0gcmVnaW9uc1tjZWxsLnJlZ2lvbl1cclxuXHJcbiAgICAgICAgaWYgKHJlZ2lvbi5sZWF2ZUNvbG9yZWQpIHtcclxuICAgICAgICAgICAgY29uc3QgY29sb3IgPSBwYWxldHRlW2NlbGwuY29sb3JdXHJcbiAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2kgKiA0XSA9IGNvbG9yWzBdXHJcbiAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2kgKiA0ICsgMV0gPSBjb2xvclsxXVxyXG4gICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpICogNCArIDJdID0gY29sb3JbMl1cclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGltYWdlRGF0YS5kYXRhW2kgKiA0XSA9IGxcclxuICAgICAgICBpbWFnZURhdGEuZGF0YVtpICogNCArIDFdID0gbFxyXG4gICAgICAgIGltYWdlRGF0YS5kYXRhW2kgKiA0ICsgMl0gPSBsXHJcbiAgICB9XHJcblxyXG4gICAgLy8gREVCVUcgT05MWSAtIHNob3cgcGFsZXR0aXplZCBpbWFnZVxyXG4gICAgLy8gZm9yIChsZXQgaSA9IDA7IGkgPCBwYWxldHRpemVkRGF0YS5sZW5ndGg7ICsraSkge1xyXG4gICAgLy8gICAgIGNvbnN0IGNvbG9ySWR4ID0gcGFsZXR0aXplZERhdGFbaV1cclxuICAgIC8vICAgICBjb25zdCBjb2xvciA9IHBhbGV0dGVbY29sb3JJZHhdXHJcbiAgICAvLyAgICAgaW1hZ2VEYXRhLmRhdGFbaSAqIDRdID0gY29sb3JbMF1cclxuICAgIC8vICAgICBpbWFnZURhdGEuZGF0YVtpICogNCArIDFdID0gY29sb3JbMV1cclxuICAgIC8vICAgICBpbWFnZURhdGEuZGF0YVtpICogNCArIDJdID0gY29sb3JbMl1cclxuICAgIC8vIH1cclxuXHJcbiAgICBjdHgucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMClcclxuICAgIGNyZWF0ZVBhbGV0dGVVaShwYWxldHRlKVxyXG4gICAgZHJhd1JlZ2lvbkxhYmVscyhjdHgsIHJlZ2lvbnMpXHJcbn1cclxuXHJcbi8vIGZ1bmN0aW9uIGNhbGNEaXN0U3EocDE6IENvbG9yLCBwMjogQ29sb3IpOiBudW1iZXIge1xyXG4vLyAgICAgY29uc3QgW3gxLCB5MSwgejFdID0gcDFcclxuLy8gICAgIGNvbnN0IFt4MiwgeTIsIHoyXSA9IHAyXHJcbi8vICAgICBjb25zdCBkeCA9IHgyIC0geDFcclxuLy8gICAgIGNvbnN0IGR5ID0geTIgLSB5MVxyXG4vLyAgICAgY29uc3QgZHogPSB6MiAtIHoxXHJcbi8vICAgICBjb25zdCBkaXN0ID0gZHggKiBkeCArIGR5ICogZHkgKyBkeiAqIGR6XHJcbi8vICAgICByZXR1cm4gZGlzdFxyXG4vLyB9XHJcblxyXG5mdW5jdGlvbiBwYWxldHRpemVNZWRpYW5DdXQoZGF0YTogQ29sb3JbXSwgbWF4Q29sb3JzOiBudW1iZXIpOiBbQ29sb3JbXSwgbnVtYmVyW11dIHtcclxuICAgIGNvbnN0IGJ1Y2tldHM6IG51bWJlcltdW10gPSBbXVxyXG5cclxuICAgIC8vIHBsYWNlIGFsbCBjb2xvcnMgaW4gaW5pdGlhbCBidWNrZXRcclxuICAgIGNvbnN0IGJ1Y2tldDogbnVtYmVyW10gPSBbXVxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgYnVja2V0LnB1c2goaSlcclxuICAgIH1cclxuXHJcbiAgICBidWNrZXRzLnB1c2goYnVja2V0KVxyXG5cclxuICAgIHdoaWxlIChidWNrZXRzLmxlbmd0aCA8IG1heENvbG9ycykge1xyXG4gICAgICAgIGNvbnN0IGJ1Y2tldCA9IGNob29zZUJ1Y2tldChkYXRhLCBidWNrZXRzKVxyXG4gICAgICAgIGNvbnN0IG5ld0J1Y2tldCA9IHNwbGl0QnVja2V0KGRhdGEsIGJ1Y2tldClcclxuICAgICAgICBidWNrZXRzLnB1c2gobmV3QnVja2V0KVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGNob29zZSBjb2xvciBmb3IgZWFjaCBidWNrZXRcclxuICAgIGNvbnN0IHBhbGV0dGUgPSBidWNrZXRzLm1hcChiID0+IGRpdlhZWihiLnJlZHVjZSgoeHl6LCBpKSA9PiBhZGRYWVooeHl6LCBkYXRhW2ldKSwgWzAsIDAsIDBdKSwgYi5sZW5ndGgpKVxyXG4gICAgY29uc3QgcGFsZXR0aXplZERhdGE6IG51bWJlcltdID0gZGF0YS5tYXAoKCkgPT4gMClcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVja2V0cy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGJ1Y2tldCA9IGJ1Y2tldHNbaV1cclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGJ1Y2tldC5sZW5ndGg7ICsraikge1xyXG4gICAgICAgICAgICBwYWxldHRpemVkRGF0YVtidWNrZXRbal1dID0gaVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gW3BhbGV0dGUsIHBhbGV0dGl6ZWREYXRhXVxyXG59XHJcblxyXG5mdW5jdGlvbiBjaG9vc2VCdWNrZXQoZGF0YTogQ29sb3JbXSwgYnVja2V0czogbnVtYmVyW11bXSkge1xyXG4gICAgY29uc3QgYnVja2V0ID0gYnVja2V0cy5yZWR1Y2UoKGIxLCBiMikgPT4gY2FsY0J1Y2tldFJhbmdlKGRhdGEsIGIxKSA+IGNhbGNCdWNrZXRSYW5nZShkYXRhLCBiMikgPyBiMSA6IGIyKVxyXG4gICAgcmV0dXJuIGJ1Y2tldFxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjQnVja2V0UmFuZ2UoZGF0YTogQ29sb3JbXSwgYnVja2V0OiBudW1iZXJbXSk6IG51bWJlciB7XHJcbiAgICBjb25zdCBseCA9IGJ1Y2tldC5yZWR1Y2UoKG1pbiwgaSkgPT4gbWluIDwgZGF0YVtpXVswXSA/IG1pbiA6IGRhdGFbaV1bMF0sIEluZmluaXR5KVxyXG4gICAgY29uc3QgcnggPSBidWNrZXQucmVkdWNlKChtYXgsIGkpID0+IG1heCA+IGRhdGFbaV1bMF0gPyBtYXggOiBkYXRhW2ldWzBdLCAwKVxyXG4gICAgY29uc3QgbHkgPSBidWNrZXQucmVkdWNlKChtaW4sIGkpID0+IG1pbiA8IGRhdGFbaV1bMV0gPyBtaW4gOiBkYXRhW2ldWzFdLCBJbmZpbml0eSlcclxuICAgIGNvbnN0IHJ5ID0gYnVja2V0LnJlZHVjZSgobWF4LCBpKSA9PiBtYXggPiBkYXRhW2ldWzFdID8gbWF4IDogZGF0YVtpXVsxXSwgMClcclxuICAgIGNvbnN0IGx6ID0gYnVja2V0LnJlZHVjZSgobWluLCBpKSA9PiBtaW4gPCBkYXRhW2ldWzJdID8gbWluIDogZGF0YVtpXVsyXSwgSW5maW5pdHkpXHJcbiAgICBjb25zdCByeiA9IGJ1Y2tldC5yZWR1Y2UoKG1heCwgaSkgPT4gbWF4ID4gZGF0YVtpXVsyXSA/IG1heCA6IGRhdGFbaV1bMl0sIDApXHJcbiAgICBjb25zdCBkeCA9IHJ4IC0gbHhcclxuICAgIGNvbnN0IGR5ID0gcnkgLSBseVxyXG4gICAgY29uc3QgZHogPSByeiAtIGx6XHJcbiAgICBjb25zdCBkID0gTWF0aC5tYXgoZHgsIGR5LCBkeilcclxuICAgIHJldHVybiBkXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNwbGl0QnVja2V0KGRhdGE6IENvbG9yW10sIGJ1Y2tldDogbnVtYmVyW10pOiBudW1iZXJbXSB7XHJcbiAgICBpZiAoYnVja2V0Lmxlbmd0aCA8PSAxKSB7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJCdWNrZXQgbXVzdCBoYXZlIGF0IGxlYXN0IHR3byBlbGVtZW50cyB0byBzcGxpdFwiKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRldGVybWluZSBjb21wb25lbnQgd2l0aCBtYXggcmFuZ2UgaW4gYnVja2V0XHJcbiAgICBjb25zdCBseCA9IGJ1Y2tldC5yZWR1Y2UoKG1pbiwgaSkgPT4gbWluIDwgZGF0YVtpXVswXSA/IG1pbiA6IGRhdGFbaV1bMF0sIEluZmluaXR5KVxyXG4gICAgY29uc3QgcnggPSBidWNrZXQucmVkdWNlKChtYXgsIGkpID0+IG1heCA+IGRhdGFbaV1bMF0gPyBtYXggOiBkYXRhW2ldWzBdLCAwKVxyXG4gICAgY29uc3QgbHkgPSBidWNrZXQucmVkdWNlKChtaW4sIGkpID0+IG1pbiA8IGRhdGFbaV1bMV0gPyBtaW4gOiBkYXRhW2ldWzFdLCBJbmZpbml0eSlcclxuICAgIGNvbnN0IHJ5ID0gYnVja2V0LnJlZHVjZSgobWF4LCBpKSA9PiBtYXggPiBkYXRhW2ldWzFdID8gbWF4IDogZGF0YVtpXVsxXSwgMClcclxuICAgIGNvbnN0IGx6ID0gYnVja2V0LnJlZHVjZSgobWluLCBpKSA9PiBtaW4gPCBkYXRhW2ldWzJdID8gbWluIDogZGF0YVtpXVsyXSwgSW5maW5pdHkpXHJcbiAgICBjb25zdCByeiA9IGJ1Y2tldC5yZWR1Y2UoKG1heCwgaSkgPT4gbWF4ID4gZGF0YVtpXVsyXSA/IG1heCA6IGRhdGFbaV1bMl0sIDApXHJcbiAgICBjb25zdCBkeCA9IHJ4IC0gbHhcclxuICAgIGNvbnN0IGR5ID0gcnkgLSBseVxyXG4gICAgY29uc3QgZHogPSByeiAtIGx6XHJcbiAgICBjb25zdCBkID0gTWF0aC5tYXgoZHgsIGR5LCBkeilcclxuXHJcbiAgICBpZiAoZHggPT09IGQpIHtcclxuICAgICAgICBidWNrZXQuc29ydCgoYSwgYikgPT4gZGF0YVthXVswXSAtIGRhdGFbYl1bMF0pXHJcbiAgICB9IGVsc2UgaWYgKGR5ID09PSBkKSB7XHJcbiAgICAgICAgYnVja2V0LnNvcnQoKGEsIGIpID0+IGRhdGFbYV1bMV0gLSBkYXRhW2JdWzFdKVxyXG4gICAgfSBlbHNlIGlmIChkeiA9PT0gZCkge1xyXG4gICAgICAgIGJ1Y2tldC5zb3J0KChhLCBiKSA9PiBkYXRhW2FdWzJdIC0gZGF0YVtiXVsyXSlcclxuICAgIH1cclxuXHJcbiAgICAvLyBsZWZ0IGhhbGYgb2YgYXJyYXkgc3RheXMgaW4gYnVja2V0XHJcbiAgICAvLyByaWdodCBoYWxmIG1vdmVzIHRvIG5ldyBidWNrZXRcclxuICAgIGNvbnN0IG1lZGlhbklkeCA9IE1hdGguZmxvb3IoYnVja2V0Lmxlbmd0aCAvIDIpXHJcbiAgICBjb25zdCBuZXdCdWNrZXQgPSBidWNrZXQuc3BsaWNlKG1lZGlhbklkeCwgYnVja2V0Lmxlbmd0aCAtIG1lZGlhbklkeClcclxuICAgIHJldHVybiBuZXdCdWNrZXRcclxufVxyXG5cclxuZnVuY3Rpb24gZGl2WFlaKHh5ejogQ29sb3IsIHM6IG51bWJlcik6IENvbG9yIHtcclxuICAgIGNvbnN0IFt4LCB5LCB6XSA9IHh5elxyXG4gICAgcmV0dXJuIFt4IC8gcywgeSAvIHMsIHogLyBzXVxyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRYWVooeHl6MTogQ29sb3IsIHh5ejI6IENvbG9yKTogQ29sb3Ige1xyXG4gICAgcmV0dXJuIFt4eXoxWzBdICsgeHl6MlswXSwgeHl6MVsxXSArIHh5ejJbMV0sIHh5ejFbMl0gKyB4eXoyWzJdXVxyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kUmVnaW9ucyh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgY2VsbHM6IENlbGxbXSk6IFJlZ2lvbltdIHtcclxuICAgIGxldCByZWdpb24gPSAwXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgbGV0IHlPZmZzZXQgPSB5ICogd2lkdGhcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyArK3gpIHtcclxuICAgICAgICAgICAgbGV0IHhPZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgICAgICBjb25zdCBjZWxsID0gY2VsbHNbeE9mZnNldF1cclxuICAgICAgICAgICAgaWYgKGNlbGwucmVnaW9uICE9IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjZWxsLnJlZ2lvbiA9IHJlZ2lvblxyXG4gICAgICAgICAgICBzY2FuUmVnaW9uKHdpZHRoLCBoZWlnaHQsIHgsIHksIGNlbGxzKVxyXG4gICAgICAgICAgICArK3JlZ2lvblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZWdpb25zOiBSZWdpb25bXSA9IFtdXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlZ2lvbjsgKytpKSB7XHJcbiAgICAgICAgcmVnaW9ucy5wdXNoKHtcclxuICAgICAgICAgICAgcGl4ZWxzOiAwLFxyXG4gICAgICAgICAgICBjZW50cm9pZFg6IDAsXHJcbiAgICAgICAgICAgIGNlbnRyb2lkWTogMCxcclxuICAgICAgICAgICAgY29sb3I6IC0xLFxyXG4gICAgICAgICAgICBtaW5YOiBJbmZpbml0eSxcclxuICAgICAgICAgICAgbWF4WDogLTEsXHJcbiAgICAgICAgICAgIG1pblk6IEluZmluaXR5LFxyXG4gICAgICAgICAgICBtYXhZOiAtMSxcclxuICAgICAgICAgICAgd2lkdGg6IDAsXHJcbiAgICAgICAgICAgIGhlaWdodDogMCxcclxuICAgICAgICAgICAgbGVhdmVDb2xvcmVkOiBmYWxzZVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIGxldCB5T2Zmc2V0ID0geSAqIHdpZHRoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIGxldCB4T2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgY2VsbCA9IGNlbGxzW3hPZmZzZXRdXHJcbiAgICAgICAgICAgIGNvbnN0IHJlZ2lvbiA9IHJlZ2lvbnNbY2VsbC5yZWdpb25dXHJcbiAgICAgICAgICAgIHJlZ2lvbi5waXhlbHMrK1xyXG4gICAgICAgICAgICByZWdpb24uY2VudHJvaWRYICs9IHhcclxuICAgICAgICAgICAgcmVnaW9uLmNlbnRyb2lkWSArPSB5XHJcbiAgICAgICAgICAgIHJlZ2lvbi5jb2xvciA9IGNlbGwuY29sb3JcclxuICAgICAgICAgICAgcmVnaW9uLm1pblggPSBNYXRoLm1pbih4LCByZWdpb24ubWluWClcclxuICAgICAgICAgICAgcmVnaW9uLm1pblkgPSBNYXRoLm1pbih5LCByZWdpb24ubWluWSlcclxuICAgICAgICAgICAgcmVnaW9uLm1heFggPSBNYXRoLm1heCh4LCByZWdpb24ubWF4WClcclxuICAgICAgICAgICAgcmVnaW9uLm1heFkgPSBNYXRoLm1heCh5LCByZWdpb24ubWF4WSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCByZWdpb24gb2YgcmVnaW9ucykge1xyXG4gICAgICAgIHJlZ2lvbi5jZW50cm9pZFggLz0gcmVnaW9uLnBpeGVsc1xyXG4gICAgICAgIHJlZ2lvbi5jZW50cm9pZFkgLz0gcmVnaW9uLnBpeGVsc1xyXG4gICAgICAgIHJlZ2lvbi53aWR0aCA9IHJlZ2lvbi5tYXhYIC0gcmVnaW9uLm1pblhcclxuICAgICAgICByZWdpb24uaGVpZ2h0ID0gcmVnaW9uLm1heFkgLSByZWdpb24ubWluWVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvbnMpIHtcclxuICAgICAgICByZWdpb24ubGVhdmVDb2xvcmVkID0gcmVnaW9uLndpZHRoIDwgMzIgfHwgcmVnaW9uLmhlaWdodCA8IDMyIHx8IHJlZ2lvbi5waXhlbHMgPCA1MTJcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVnaW9uc1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kQm9yZGVycyh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgY2VsbHM6IENlbGxbXSkge1xyXG4gICAgLy8gY29sb3IgYm9yZGVyc1xyXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIGxldCB5T2Zmc2V0ID0geSAqIHdpZHRoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIGxldCB4T2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgY2VsbCA9IGNlbGxzW3hPZmZzZXRdXHJcbiAgICAgICAgICAgIGNvbnN0IGwgPSB4IC0gMVxyXG4gICAgICAgICAgICBjb25zdCByID0geCArIDFcclxuICAgICAgICAgICAgY29uc3QgdCA9IHkgLSAxXHJcbiAgICAgICAgICAgIGNvbnN0IGIgPSB5ICsgMVxyXG5cclxuICAgICAgICAgICAgLy8gZWRnZSBjZWxscyBhcmUgYm9yZGVyXHJcbiAgICAgICAgICAgIGlmIChsIDwgMCB8fCByID49IHdpZHRoIHx8IHQgPCAwIHx8IGIgPj0gaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICBjZWxsLmJvcmRlciA9IHRydWVcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChjZWxsc1t4T2Zmc2V0IC0gMV0ucmVnaW9uICE9IGNlbGwucmVnaW9uKSB7XHJcbiAgICAgICAgICAgICAgICBjZWxsLmJvcmRlciA9IHRydWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGNlbGxzW3hPZmZzZXQgKyAxXS5yZWdpb24gIT0gY2VsbC5yZWdpb24pIHtcclxuICAgICAgICAgICAgICAgIGNlbGwuYm9yZGVyID0gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoY2VsbHNbeE9mZnNldCAtIHdpZHRoXS5yZWdpb24gIT0gY2VsbC5yZWdpb24pIHtcclxuICAgICAgICAgICAgICAgIGNlbGwuYm9yZGVyID0gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoY2VsbHNbeE9mZnNldCArIHdpZHRoXS5yZWdpb24gIT0gY2VsbC5yZWdpb24pIHtcclxuICAgICAgICAgICAgICAgIGNlbGwuYm9yZGVyID0gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzY2FuUmVnaW9uKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCB4MDogbnVtYmVyLCB5MDogbnVtYmVyLCBjZWxsczogQ2VsbFtdKSB7XHJcbiAgICBjb25zdCBzdGFjazogbnVtYmVyW10gPSBbXVxyXG4gICAgc3RhY2sucHVzaCh4MClcclxuICAgIHN0YWNrLnB1c2goeTApXHJcblxyXG4gICAgY29uc3Qgb2Zmc2V0MCA9IHkwICogd2lkdGggKyB4MFxyXG4gICAgY29uc3QgY2VsbDAgPSBjZWxsc1tvZmZzZXQwXVxyXG4gICAgY29uc3QgcmVnaW9uMCA9IGNlbGwwLnJlZ2lvblxyXG4gICAgY29uc3QgY29sb3IwID0gY2VsbDAuY29sb3JcclxuXHJcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnN0IHkgPSBzdGFjay5wb3AoKSBhcyBudW1iZXJcclxuICAgICAgICBjb25zdCB4ID0gc3RhY2sucG9wKCkgYXMgbnVtYmVyXHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0geSAqIHdpZHRoICsgeFxyXG4gICAgICAgIGNvbnN0IGNlbGwgPSBjZWxsc1tvZmZzZXRdXHJcbiAgICAgICAgY2VsbC5yZWdpb24gPSByZWdpb24wXHJcblxyXG4gICAgICAgIC8vIGV4cGxvcmUgbmVpZ2hib3JzIChpZiBzYW1lIGNvbG9yKVxyXG4gICAgICAgIGNvbnN0IGwgPSB4IC0gMVxyXG4gICAgICAgIGNvbnN0IHIgPSB4ICsgMVxyXG4gICAgICAgIGNvbnN0IHQgPSB5IC0gMVxyXG4gICAgICAgIGNvbnN0IGIgPSB5ICsgMVxyXG5cclxuICAgICAgICBpZiAobCA+PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNlbGwxID0gY2VsbHNbb2Zmc2V0IC0gMV1cclxuICAgICAgICAgICAgaWYgKGNlbGwxLnJlZ2lvbiA9PSAtMSAmJiBjZWxsMS5jb2xvciA9PSBjb2xvcjApIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2gobClcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHIgPCB3aWR0aCkge1xyXG4gICAgICAgICAgICBjb25zdCBjZWxsMSA9IGNlbGxzW29mZnNldCArIDFdXHJcbiAgICAgICAgICAgIGlmIChjZWxsMS5yZWdpb24gPT0gLTEgJiYgY2VsbDEuY29sb3IgPT0gY29sb3IwKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHIpXHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0ID49IDApIHtcclxuICAgICAgICAgICAgY29uc3QgY2VsbDEgPSBjZWxsc1tvZmZzZXQgLSB3aWR0aF1cclxuICAgICAgICAgICAgaWYgKGNlbGwxLnJlZ2lvbiA9PSAtMSAmJiBjZWxsMS5jb2xvciA9PSBjb2xvcjApIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeClcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2godClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGIgPCBoZWlnaHQpIHtcclxuICAgICAgICAgICAgY29uc3QgY2VsbDEgPSBjZWxsc1tvZmZzZXQgKyB3aWR0aF1cclxuICAgICAgICAgICAgaWYgKGNlbGwxLnJlZ2lvbiA9PSAtMSAmJiBjZWxsMS5jb2xvciA9PSBjb2xvcjApIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeClcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goYilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLy8gZnVuY3Rpb24gbGluZWFyKHg6IG51bWJlcikge1xyXG4vLyAgICAgaWYgKHggPD0gLjA0MDQ1KSB7XHJcbi8vICAgICAgICAgcmV0dXJuIHggLyAxMi45MlxyXG4vLyAgICAgfVxyXG5cclxuLy8gICAgIHJldHVybiBNYXRoLnBvdygoKHggKyAuMDU1KSAvIDEuMDU1KSwgMi40KVxyXG4vLyB9XHJcblxyXG5mdW5jdGlvbiBpbWFnZURhdGEyUkdCQXJyYXkoZGF0YTogVWludDhDbGFtcGVkQXJyYXkpOiBDb2xvcltdIHtcclxuICAgIGNvbnN0IHJlc3VsdDogQ29sb3JbXSA9IFtdXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpICs9IDQpIHtcclxuICAgICAgICByZXN1bHQucHVzaChbZGF0YVtpXSwgZGF0YVtpICsgMV0sIGRhdGFbaSArIDJdXSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVBhbGV0dGVVaShwYWxldHRlOiBDb2xvcltdKSB7XHJcbiAgICB1dGlsLnJlbW92ZUFsbENoaWxkcmVuKHBhbGV0dGVEaXYpXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhbGV0dGUubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCBjb2xvciA9IHBhbGV0dGVbaV1cclxuICAgICAgICBjb25zdCBsdW0gPSBjYWxjTHVtaW5hbmNlKGNvbG9yKVxyXG4gICAgICAgIGNvbnN0IGZyYWdtZW50ID0gcGFsZXR0ZUVudHJ5VGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgIGNvbnN0IGVudHJ5RGl2ID0gdXRpbC5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5wYWxldHRlLWVudHJ5XCIpIGFzIEhUTUxFbGVtZW50XHJcbiAgICAgICAgZW50cnlEaXYudGV4dENvbnRlbnQgPSBpLnRvU3RyaW5nKClcclxuICAgICAgICBlbnRyeURpdi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBgcmdiKCR7Y29sb3JbMF19LCAke2NvbG9yWzFdfSwgJHtjb2xvclsyXX0pYFxyXG4gICAgICAgIGVudHJ5RGl2LnN0eWxlLmNvbG9yID0gbHVtIDwgLjUgPyBcIndoaXRlXCIgOiBcImJsYWNrXCJcclxuICAgICAgICBwYWxldHRlRGl2LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjTHVtaW5hbmNlKGNvbG9yOiBDb2xvcikge1xyXG4gICAgY29uc3QgW3IsIGcsIGJdID0gY29sb3JcclxuICAgIGNvbnN0IGwgPSAwLjIxMjYgKiAociAvIDI1NSkgKyAwLjcxNTIgKiAoZyAvIDI1NSkgKyAwLjA3MjIgKiAoYiAvIDI1NSlcclxuICAgIHJldHVybiBsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdSZWdpb25MYWJlbHMoY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIHJlZ2lvbnM6IFJlZ2lvbltdKSB7XHJcbiAgICBjb25zdCBoZWlnaHQgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoXHJcbiAgICBjb25zdCBmb250ID0gY3R4LmZvbnRcclxuICAgIGN0eC5mb250ID0gXCIxNnB4IGFyaWFsIGJvbGRcIlxyXG5cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvbnMpIHtcclxuICAgICAgICBpZiAocmVnaW9uLmxlYXZlQ29sb3JlZCkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbGFiZWwgPSBgJHtyZWdpb24uY29sb3IgKyAxfWBcclxuICAgICAgICBjb25zdCBtZXRyaWNzID0gY3R4Lm1lYXN1cmVUZXh0KGxhYmVsKVxyXG4gICAgICAgIGNvbnN0IHggPSByZWdpb24uY2VudHJvaWRYIC0gbWV0cmljcy53aWR0aCAvIDJcclxuICAgICAgICBjb25zdCB5ID0gcmVnaW9uLmNlbnRyb2lkWSAtIGhlaWdodCAvIDJcclxuICAgICAgICBjdHguZmlsbFRleHQobGFiZWwsIHgsIHkpXHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmZvbnQgPSBmb250XHJcbn1cclxuXHJcbi8vIGZ1bmN0aW9uIHJnYjJ4eXoocmdiOiBDb2xvcik6IENvbG9yIHtcclxuLy8gICAgIGxldCBbciwgYiwgZ10gPSByZ2JcclxuLy8gICAgIHIgLz0gMjU1LjBcclxuLy8gICAgIGcgLz0gMjU1LjBcclxuLy8gICAgIGIgLz0gMjU1LjBcclxuXHJcbi8vICAgICBjb25zdCB4ID0gciAqIDAuNDEyNDU2NCArIGcgKiAwLjM1NzU3NjEgKyBiICogMC4xODA0Mzc1XHJcbi8vICAgICBjb25zdCB5ID0gciAqIDAuMjEyNjcyOSArIGcgKiAwLjcxNTE1MjIgKyBiICogMC4wNzIxNzUwXHJcbi8vICAgICBjb25zdCB6ID0gciAqIDAuMDE5MzMzOSArIGcgKiAwLjExOTE5MjAgKyBiICogMC45NTAzMDQxXHJcbi8vICAgICByZXR1cm4gW3gsIHksIHpdXHJcbi8vIH1cclxuXHJcbi8vIGZ1bmN0aW9uIHh5ejJyZ2IoeHl6OiBDb2xvcik6IENvbG9yIHtcclxuLy8gICAgIGNvbnN0IFt4LCB5LCB6XSA9IHh5elxyXG4vLyAgICAgY29uc3QgciA9ICh4ICogMy4yNDA0NTQyICsgeSAqIC0xLjUzNzEzODUgKyB6ICogLTAuNDk4NTMxNCkgKiAyNTVcclxuLy8gICAgIGNvbnN0IGcgPSAoeCAqIC0wLjk2OTI2NjAgKyB5ICogMS44NzYwMTA4ICsgeiAqIDAuMDQxNTU2MCkgKiAyNTVcclxuLy8gICAgIGNvbnN0IGIgPSAoeCAqIDAuMDU1NjQzNCArIHkgKiAtMC4yMDQwMjU5ICsgeiAqIDEuMDU3MjI1MikgKiAyNTVcclxuLy8gICAgIHJldHVybiBbciwgZywgYl1cclxuLy8gfSJdfQ==