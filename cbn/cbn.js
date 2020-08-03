import * as array from "../shared/array.js";
import * as imaging from "../shared/imaging.js";
import * as imaging2 from "../shared/imaging2.js";
import * as dom from "../shared/dom.js";
import * as geo from "../shared/geo3d.js";
import * as util from "../shared/util.js";
var CameraMode;
(function (CameraMode) {
    CameraMode[CameraMode["None"] = 0] = "None";
    CameraMode[CameraMode["User"] = 1] = "User";
    CameraMode[CameraMode["Environment"] = 2] = "Environment";
})(CameraMode || (CameraMode = {}));
class Channel {
    constructor() {
        this.subscribers = new Set();
    }
    subcribe(subscriber) {
        this.subscribers.add(subscriber);
    }
    unsubscribe(subscriber) {
        this.subscribers.delete(subscriber);
    }
    publish(x) {
        for (const subscriber of this.subscribers) {
            subscriber(x);
        }
    }
}
class LoadUi {
    constructor() {
        this.camera = dom.byId("camera");
        this.cameraMode = CameraMode.None;
        this.acquireImageDiv = dom.byId("acquireImage");
        this.captureImageButton = dom.byId("captureImageButton");
        this.loadUiDiv = dom.byId("loadUi");
        this.fileDropBox = dom.byId("fileDropBox");
        this.fileInput = dom.byId("fileInput");
        this.fileButton = dom.byId("fileButton");
        this.useCameraButton = dom.byId("useCameraButton");
        this.flipCameraButton = dom.byId("flipCameraButton");
        this.stopCameraButton = dom.byId("stopCameraButton");
        this.errorsDiv = dom.byId("errors");
        this.imageLoaded = new Channel();
        this.fileButton.addEventListener("click", () => {
            this.fileInput.click();
        });
        this.fileDropBox.addEventListener("dragenter", (e) => this.onDragEnterOver(e));
        this.fileDropBox.addEventListener("dragover", (e) => this.onDragEnterOver(e));
        this.fileDropBox.addEventListener("drop", (e) => this.onFileDrop(e));
        this.fileInput.addEventListener("change", () => this.onFileChange());
        this.useCameraButton.addEventListener("click", () => this.useCamera());
        this.flipCameraButton.addEventListener("click", () => this.flipCamera());
        this.stopCameraButton.addEventListener("click", () => this.stopCamera());
        this.captureImageButton.addEventListener("click", () => this.captureImage());
        this.camera.addEventListener("loadedmetadata", () => this.onCameraLoad());
    }
    show() {
        this.loadUiDiv.hidden = false;
        // this.loadFromUrl("/cbn/assets/acorn.jpg")
    }
    hide() {
        this.loadUiDiv.hidden = true;
    }
    onDragEnterOver(ev) {
        ev.stopPropagation();
        ev.preventDefault();
    }
    onFileChange() {
        var _a;
        if (!((_a = this.fileInput.files) === null || _a === void 0 ? void 0 : _a.length)) {
            return;
        }
        const file = this.fileInput.files[0];
        this.processFile(file);
    }
    onFileDrop(ev) {
        var _a, _b;
        ev.stopPropagation();
        ev.preventDefault();
        if (!((_b = (_a = ev === null || ev === void 0 ? void 0 : ev.dataTransfer) === null || _a === void 0 ? void 0 : _a.files) === null || _b === void 0 ? void 0 : _b.length)) {
            return;
        }
        const file = ev.dataTransfer.files[0];
        this.processFile(file);
    }
    async useCamera() {
        this.acquireImageDiv.hidden = false;
        const dialogWidth = this.acquireImageDiv.clientWidth;
        const dialogHeight = this.acquireImageDiv.clientHeight;
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { max: dialogWidth }, height: { max: dialogHeight }, facingMode: "user" },
            audio: false
        });
        this.cameraMode = CameraMode.User;
        this.camera.srcObject = stream;
    }
    async flipCamera() {
        if (!this.camera.srcObject) {
            return;
        }
        const src = this.camera.srcObject;
        const tracks = src.getTracks();
        for (const track of tracks) {
            track.stop();
        }
        this.cameraMode = this.cameraMode == CameraMode.User ? CameraMode.Environment : CameraMode.User;
        const facingMode = this.cameraMode == CameraMode.User ? "user" : "environment";
        // get current facing mode
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: this.camera.clientWidth, height: this.camera.clientHeight, facingMode: facingMode },
            audio: false
        });
        this.camera.srcObject = stream;
    }
    onCameraLoad() {
        this.acquireImageDiv.hidden = false;
        this.camera.play();
    }
    stopCamera() {
        const src = this.camera.srcObject;
        if (!src) {
            return;
        }
        const tracks = src.getTracks();
        for (const track of tracks) {
            track.stop();
        }
        this.cameraMode = CameraMode.None;
        this.acquireImageDiv.hidden = true;
    }
    captureImage() {
        this.clearErrorMessages();
        const src = this.camera.srcObject;
        if (!src) {
            return;
        }
        const track = src.getVideoTracks()[0];
        if (!track) {
            return;
        }
        this.imageLoaded.publish({ width: this.camera.videoWidth, height: this.camera.videoHeight, source: this.camera });
        this.stopCamera();
    }
    processFile(file) {
        this.clearErrorMessages();
        const url = URL.createObjectURL(file);
        this.loadFromUrl(url);
    }
    async loadFromUrl(url) {
        this.clearErrorMessages();
        const img = await dom.loadImage(url);
        this.imageLoaded.publish({ width: img.width, height: img.height, source: img });
    }
    clearErrorMessages() {
        dom.removeAllChildren(this.errorsDiv);
    }
}
class PlayUi {
    constructor() {
        this.canvas = dom.byId("canvas");
        this.scratchCanvas = new OffscreenCanvas(0, 0);
        this.paletteDiv = dom.byId("palette");
        this.paletteEntryTemplate = dom.byId("paletteEntry");
        this.playUiDiv = dom.byId("playUi");
        this.returnButton = dom.byId("returnButton");
        this.imageCtx = this.canvas.getContext("2d");
        this.scratchCtx = this.scratchCanvas.getContext("2d");
        this.return = new Channel();
        this.drag = false;
        this.dragged = false;
        this.dragLast = new geo.Vec2(0, 0);
        this.initialImageData = new ImageData(1, 1);
        this.processedImageData = new ImageData(1, 1);
        this.palette = [];
        this.regions = [];
        this.regionOverlay = [];
        this.selectedPaletteIndex = -1;
        this.sequence = [];
        if (!this.imageCtx) {
            throw new Error("Canvas element not supported");
        }
        if (!this.scratchCtx) {
            throw new Error("OffscreenCanvas  not supported");
        }
        this.canvas.addEventListener("click", e => this.onCanvasClick(e));
        this.canvas.addEventListener("mousedown", e => this.onCanvasMouseDown(e));
        this.canvas.addEventListener("mousemove", e => this.onCanvasMouseMove(e));
        this.canvas.addEventListener("mouseup", e => this.onCanvasMouseUp(e));
        this.canvas.addEventListener("wheel", e => this.onCanvasMouseWheel(e));
        dom.delegate(this.playUiDiv, "click", ".palette-entry", (e) => this.onPaletteEntryClick(e));
        this.returnButton.addEventListener("click", () => this.onReturn());
    }
    show(img) {
        this.playUiDiv.hidden = false;
        // clientWidth / clientHeight are css set width / height
        // before drawing, must set canvas width / height for drawing surface pixels
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        // fit width
        const aspect = img.width / img.height;
        let width = document.body.clientWidth;
        let height = width / aspect;
        if (height > this.canvas.height) {
            height = this.canvas.height;
            width = height * aspect;
        }
        this.canvas.width = width;
        this.scratchCanvas.width = this.canvas.width;
        this.scratchCanvas.height = this.canvas.height;
        this.scratchCtx.fillStyle = "white";
        this.scratchCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.scratchCtx.drawImage(img.source, 0, 0, width, height);
        // at this point, image should be drawn to scratch canvas
        // get (flat) image data from scratch canvas
        this.initialImageData = dom.copyImageData(this.scratchCtx.getImageData(0, 0, this.canvas.width, this.canvas.height));
        const processedImage = processImage(this.scratchCtx);
        this.processedImageData = dom.copyImageData(this.scratchCtx.getImageData(0, 0, this.scratchCtx.canvas.width, this.scratchCtx.canvas.height));
        this.palette = processedImage.palette;
        this.regions = processedImage.regions;
        this.regionOverlay = processedImage.regionOverlay;
        this.sequence = [];
        this.createPaletteUi();
        this.selectPaletteEntry(0);
        this.redraw();
    }
    hide() {
        this.playUiDiv.hidden = true;
    }
    onReturn() {
        this.return.publish();
    }
    createPaletteUi() {
        dom.removeAllChildren(this.paletteDiv);
        for (let i = 0; i < this.palette.length; ++i) {
            const color = imaging2.toCanvasColor(this.palette[i]);
            const lum = imaging2.calcLuminance(color);
            const fragment = this.paletteEntryTemplate.content.cloneNode(true);
            const entryDiv = dom.bySelector(fragment, ".palette-entry");
            entryDiv.textContent = `${i + 1}`;
            entryDiv.style.backgroundColor = `rgb(${color.x}, ${color.y}, ${color.z})`;
            entryDiv.style.color = lum < .5 ? "white" : "black";
            this.paletteDiv.appendChild(fragment);
        }
    }
    onCanvasClick(evt) {
        // don't count drag as click
        if (this.dragged) {
            this.dragged = false;
            return;
        }
        // transform click coordinates to scratch canvas coordinates, then determine region that was clicked on
        const { x: clickX, y: clickY } = this.imageCtx.getTransform().inverse().transformPoint({ x: evt.offsetX, y: evt.offsetY });
        const idx = clickY * this.imageCtx.canvas.width + clickX;
        const region = this.regionOverlay[idx];
        // if white region or null region, do nothing
        if (!region || region.color === -1) {
            return;
        }
        // if not selected region, nothing
        if (region.color != this.selectedPaletteIndex) {
            return;
        }
        // fill the region
        this.fillRegion(region);
        this.sequence.push(region);
        // if all regions for this color are filled, show checkmark on palette entry, and move to next unfinished region
        if (this.regions.filter(r => r.color == region.color).every(r => r.filled)) {
            const entry = document.querySelectorAll(".palette-entry")[region.color];
            entry.innerHTML = "&check;";
            this.selectPaletteEntry(this.findNextUnfinishedRegion());
        }
        // if all regions are filled, replace with original image data
        if (this.regions.every(r => r.filled || r.color === -1)) {
            this.scratchCtx.putImageData(this.initialImageData, 0, 0);
            this.redraw();
            this.showColorAnimation();
            return;
        }
        this.redraw();
    }
    fillRegion(region) {
        // fill the region
        const bounds = region.bounds;
        const imageData = this.scratchCtx.getImageData(bounds.min.x, bounds.min.y, bounds.width, bounds.height);
        const data = imageData.data;
        const color = imaging2.toCanvasColor(this.palette[region.color]);
        imaging.scanImageData(imageData, (x, y, offset) => {
            const imageX = x + bounds.min.x;
            const imageY = y + bounds.min.y;
            const imageOffset = imageY * this.scratchCtx.canvas.width + imageX;
            const imageRegion = this.regionOverlay[imageOffset];
            if (imageRegion !== region) {
                return;
            }
            data[offset * 4] = color.x;
            data[offset * 4 + 1] = color.y;
            data[offset * 4 + 2] = color.z;
        });
        this.scratchCtx.putImageData(imageData, bounds.min.x, bounds.min.y);
        region.filled = true;
    }
    onCanvasMouseDown(e) {
        this.drag = true;
        this.dragLast = new geo.Vec2(e.offsetX, e.offsetY);
    }
    onCanvasMouseUp(_) {
        this.drag = false;
    }
    onCanvasMouseMove(e) {
        if (!this.drag) {
            return;
        }
        const position = new geo.Vec2(e.offsetX, e.offsetY);
        const delta = position.sub(this.dragLast);
        if (Math.abs(delta.x) > 3 || Math.abs(delta.y) > 3) {
            this.imageCtx.translate(delta.x, delta.y);
            this.dragLast = position;
            this.dragged = true;
            this.redraw();
        }
    }
    onCanvasMouseWheel(e) {
        return;
        if (e.deltaY > 0) {
            this.imageCtx.translate(-e.offsetX, -e.offsetY);
            this.imageCtx.scale(.5, .5);
        }
        if (e.deltaY < 0) {
            this.imageCtx.translate(-e.offsetX, -e.offsetY);
            this.imageCtx.scale(2, 2);
        }
        this.redraw();
    }
    onPaletteEntryClick(e) {
        const entry = e.target;
        const idx = dom.getElementIndex(entry);
        this.selectPaletteEntry(idx);
    }
    selectPaletteEntry(idx) {
        this.selectedPaletteIndex = idx;
        const entries = Array.from(document.querySelectorAll(".palette-entry"));
        for (const entry of entries) {
            entry.classList.remove("selected");
        }
        if (idx !== -1) {
            entries[idx].classList.add("selected");
        }
        // display a pattern on these entries (or clear checkerboard from prevous)
        this.fillColorCheckerboard(idx);
        this.redraw();
    }
    fillColorCheckerboard(idx) {
        const imageData = this.scratchCtx.getImageData(0, 0, this.scratchCtx.canvas.width, this.scratchCtx.canvas.height);
        const data = imageData.data;
        let n = 0;
        for (let i = 0; i < this.regionOverlay.length; ++i) {
            const region = this.regionOverlay[i];
            if (!region) {
                continue;
            }
            if (region.filled) {
                continue;
            }
            if (region.color === -1) {
                continue;
            }
            const ii = i * 4;
            if (region.color === idx) {
                data[ii] = n % 3 == 0 ? 127 : 255;
                data[ii + 1] = n % 3 == 0 ? 127 : 255;
                data[ii + 2] = n % 3 == 0 ? 127 : 255;
                data[ii + 3] = 255;
                ++n;
            }
            else {
                data[ii] = 255;
                data[ii + 1] = 255;
                data[ii + 2] = 255;
                data[ii + 3] = 255;
            }
        }
        this.scratchCtx.putImageData(imageData, 0, 0);
        drawRegionLabels(this.scratchCtx, this.regions);
    }
    findNextUnfinishedRegion() {
        const regions = this.regions.filter(r => !r.filled && r.color != -1);
        if (regions.length == 0) {
            return -1;
        }
        const region = regions.reduce((r1, r2) => r1.color < r2.color ? r1 : r2);
        return region.color;
    }
    redraw() {
        // clear is subject to transform - that is probably why this is busted!
        const transform = this.imageCtx.getTransform();
        this.imageCtx.resetTransform();
        this.imageCtx.clearRect(0, 0, this.imageCtx.canvas.width, this.imageCtx.canvas.height);
        this.imageCtx.setTransform(transform);
        this.imageCtx.drawImage(this.scratchCanvas, 0, 0);
    }
    async showColorAnimation() {
        // first wait
        await util.wait(500);
        // reset image data
        this.imageCtx.resetTransform();
        this.scratchCtx.putImageData(this.processedImageData, 0, 0);
        this.redraw();
        // color as user did
        await util.wait(500);
        for (const r of this.sequence) {
            this.fillRegion(r);
            this.redraw();
            await util.wait(200);
        }
        this.scratchCtx.putImageData(this.initialImageData, 0, 0);
        this.redraw();
    }
}
class CBN {
    constructor() {
        this.loadUi = new LoadUi();
        this.playUi = new PlayUi();
        this.loadUi.show();
        this.loadUi.imageLoaded.subcribe(x => this.onImageLoaded(x));
        this.playUi.return.subcribe(() => this.onReturn());
    }
    onImageLoaded(img) {
        this.loadUi.hide();
        this.playUi.show(img);
    }
    onReturn() {
        this.playUi.hide();
        this.loadUi.show();
    }
}
function processImage(ctx) {
    // at this point, image should be drawn to scratch canvas
    // get (flat) image data from scratch canvas
    const img = imaging2.fromCanvasImageData(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height));
    imaging2.palettizeHistogram(img, 8, 128);
    // note - unique colors maps colors to integers and back again
    // this results in slightly different colors than the histogram calculated colors
    // pack / unpack to make these equal
    let palette = imaging2.uniqueColors(img);
    for (const color of img) {
        color.set(imaging2.unpackColor(imaging2.packColor(color)));
    }
    palette = palette.filter(c => c.x < .9 && c.y < .9 && c.z < .9);
    const paletteOverlay = imaging2.indexByColor(img, palette);
    let [regions, regionOverlay] = createRegionOverlay(img.width, img.height, paletteOverlay);
    regions = pruneRegions(img.width, img.height, regions, regionOverlay);
    // some pallette entries will now be unused by regions, remove these
    palette = removeUnusedPaletteEntries(palette, regions);
    drawBorders(regionOverlay, img);
    fillInterior(regionOverlay, img);
    ctx.fillStyle = "black";
    ctx.putImageData(imaging2.toCanvasImageData(img), 0, 0);
    drawRegionLabels(ctx, regions);
    return {
        palette: palette,
        regions: regions,
        regionOverlay: regionOverlay
    };
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
            bounds: geo.Rect.empty(),
            maxRect: geo.Rect.empty(),
            filled: false
        };
        regionOverlay[offset] = region;
        regions.push(region);
        exploreRegion(width, height, paletteOverlay, x, y, regionOverlay);
    });
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
    calcRegionBounds(width, height, regions, regionOverlay);
    for (const region of regionSet) {
        if (region.bounds.width <= minRegionWidth) {
            regionSet.delete(region);
        }
        if (region.bounds.height <= minRegionHeight) {
            regionSet.delete(region);
        }
    }
    // calculate maximal rec for each region
    for (const region of regionSet) {
        region.maxRect = calcMaxRegionRect(width, region, regionOverlay);
    }
    for (const region of regionSet) {
        if (region.maxRect.width < minRegionWidth) {
            regionSet.delete(region);
            continue;
        }
        if (region.maxRect.height < minRegionHeight) {
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
function calcRegionBounds(width, height, regions, overlay) {
    imaging.scan(width, height, (x, y, offset) => {
        const region = overlay[offset];
        if (!region) {
            return;
        }
        region.bounds = region.bounds.extend(new geo.Vec2(x, y));
    });
    // expand each region by 1 to include right / bottom pixels in box
    for (const region of regions) {
        if (region.bounds.max.x > region.bounds.min.x) {
            region.bounds.max.x += 1;
        }
        if (region.bounds.max.y > region.bounds.min.y) {
            region.bounds.max.y += 1;
        }
    }
}
function calcMaxRegionRect(rowPitch, region, regionOverlay) {
    // derived from https://stackoverflow.com/questions/7245/puzzle-find-largest-rectangle-maximal-rectangle-problem
    // algorithm needs to keep track of rectangle state for every column for every region
    const { x: x0, y: y0 } = region.bounds.min;
    const { x: x1, y: y1 } = region.bounds.max;
    const width = x1 - x0 + 1;
    const height = y1 - y0 + 1;
    const ls = array.uniform(x0, width);
    const rs = array.uniform(x0 + width, width);
    const hs = array.uniform(0, width);
    let maxArea = 0;
    const bounds = geo.Rect.empty();
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
                bounds.min.x = ls[i];
                bounds.max.x = rs[i];
                bounds.min.y = y - hs[i];
                bounds.max.y = y;
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
function drawBorders(regionOverlay, img) {
    // color borders
    const { width, height } = img;
    const black = new geo.Vec4(0, 0, 0, 1);
    img.scan((x, y, offset) => {
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
            img.atf(offset).set(black);
            regionOverlay[offset] = null;
        }
        const rRegion = regionOverlay[offset + 1];
        if (rRegion && rRegion !== region) {
            img.atf(offset).set(black);
            regionOverlay[offset] = null;
        }
        const tRegion = regionOverlay[offset - width];
        if (tRegion && tRegion !== region) {
            img.atf(offset).set(black);
            regionOverlay[offset] = null;
        }
        const bRegion = regionOverlay[offset + width];
        if (bRegion && bRegion !== region) {
            img.atf(offset).set(black);
            regionOverlay[offset] = null;
        }
    });
}
function fillInterior(regionOverlay, img) {
    const white = new geo.Vec4(1, 1, 1, 1);
    for (let i = 0; i < regionOverlay.length; ++i) {
        const region = regionOverlay[i];
        if (!region) {
            continue;
        }
        img.atf(i).set(white);
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
        if (region.filled) {
            continue;
        }
        const label = `${region.color + 1}`;
        const metrics = ctx.measureText(label);
        const center = region.maxRect.center;
        const x = center.x - metrics.width / 2;
        const y = center.y + textHeight / 2;
        ctx.fillText(label, x, y);
    }
    ctx.font = font;
}
new CBN();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQUMvQyxPQUFPLEtBQUssUUFBUSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBRXpDLElBQUssVUFJSjtBQUpELFdBQUssVUFBVTtJQUNYLDJDQUFJLENBQUE7SUFDSiwyQ0FBSSxDQUFBO0lBQ0oseURBQVcsQ0FBQTtBQUNmLENBQUMsRUFKSSxVQUFVLEtBQVYsVUFBVSxRQUlkO0FBWUQsTUFBTSxPQUFPO0lBQWI7UUFDcUIsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtJQWU1RCxDQUFDO0lBYlUsUUFBUSxDQUFDLFVBQTBCO1FBQ3RDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFTSxXQUFXLENBQUMsVUFBMEI7UUFDekMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVNLE9BQU8sQ0FBQyxDQUFJO1FBQ2YsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ3ZDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtTQUNoQjtJQUNMLENBQUM7Q0FDSjtBQWNELE1BQU0sTUFBTTtJQWVSO1FBZGlCLFdBQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBcUIsQ0FBQTtRQUN4RCxlQUFVLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQTtRQUNuQixvQkFB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QUNYO1FBRUQsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFO1lBQ2YsU0FBUTtTQUNYO1FBRUQsTUFBTSxLQUFLLEdBQUcsR0FBRyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFBO1FBQ25DLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUE7UUFDcEMsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxDQUFDLENBQUE7UUFDbkMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0tBQzVCO0lBRUQsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7QUFDbkIsQ0FBQztBQUVELElBQUksR0FBRyxFQUFFLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBhcnJheSBmcm9tIFwiLi4vc2hhcmVkL2FycmF5LmpzXCJcclxuaW1wb3J0ICogYXMgaW1hZ2luZyBmcm9tIFwiLi4vc2hhcmVkL2ltYWdpbmcuanNcIlxyXG5pbXBvcnQgKiBhcyBpbWFnaW5nMiBmcm9tIFwiLi4vc2hhcmVkL2ltYWdpbmcyLmpzXCJcclxuaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvM2QuanNcIlxyXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gXCIuLi9zaGFyZWQvdXRpbC5qc1wiXHJcblxyXG5lbnVtIENhbWVyYU1vZGUge1xyXG4gICAgTm9uZSxcclxuICAgIFVzZXIsXHJcbiAgICBFbnZpcm9ubWVudCxcclxufVxyXG5cclxuaW50ZXJmYWNlIFJlZ2lvbiB7XHJcbiAgICBjb2xvcjogbnVtYmVyXHJcbiAgICBwaXhlbHM6IG51bWJlclxyXG4gICAgYm91bmRzOiBnZW8uUmVjdFxyXG4gICAgbWF4UmVjdDogZ2VvLlJlY3RcclxuICAgIGZpbGxlZDogYm9vbGVhblxyXG59XHJcblxyXG50eXBlIFJlZ2lvbk92ZXJsYXkgPSAoUmVnaW9uIHwgbnVsbClbXVxyXG5cclxuY2xhc3MgQ2hhbm5lbDxUPiB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN1YnNjcmliZXJzID0gbmV3IFNldDwoeDogVCkgPT4gdm9pZD4oKVxyXG5cclxuICAgIHB1YmxpYyBzdWJjcmliZShzdWJzY3JpYmVyOiAoeDogVCkgPT4gdm9pZCkge1xyXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlcnMuYWRkKHN1YnNjcmliZXIpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHVuc3Vic2NyaWJlKHN1YnNjcmliZXI6ICh4OiBUKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVycy5kZWxldGUoc3Vic2NyaWJlcilcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgcHVibGlzaCh4OiBUKTogdm9pZCB7XHJcbiAgICAgICAgZm9yIChjb25zdCBzdWJzY3JpYmVyIG9mIHRoaXMuc3Vic2NyaWJlcnMpIHtcclxuICAgICAgICAgICAgc3Vic2NyaWJlcih4KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIENCTkltYWdlU291cmNlIHtcclxuICAgIHdpZHRoOiBudW1iZXJcclxuICAgIGhlaWdodDogbnVtYmVyXHJcbiAgICBzb3VyY2U6IEhUTUxWaWRlb0VsZW1lbnQgfCBIVE1MSW1hZ2VFbGVtZW50XHJcbn1cclxuXHJcbmludGVyZmFjZSBQcm9jZXNzZWRJbWFnZSB7XHJcbiAgICBwYWxldHRlOiBpbWFnaW5nMi5Db2xvcltdXHJcbiAgICByZWdpb25zOiBSZWdpb25bXVxyXG4gICAgcmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheVxyXG59XHJcblxyXG5jbGFzcyBMb2FkVWkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW1lcmEgPSBkb20uYnlJZChcImNhbWVyYVwiKSBhcyBIVE1MVmlkZW9FbGVtZW50XHJcbiAgICBwcml2YXRlIGNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLk5vbmVcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYWNxdWlyZUltYWdlRGl2ID0gZG9tLmJ5SWQoXCJhY3F1aXJlSW1hZ2VcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FwdHVyZUltYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJjYXB0dXJlSW1hZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbG9hZFVpRGl2ID0gZG9tLmJ5SWQoXCJsb2FkVWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmlsZURyb3BCb3ggPSBkb20uYnlJZChcImZpbGVEcm9wQm94XCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpbGVJbnB1dCA9IGRvbS5ieUlkKFwiZmlsZUlucHV0XCIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmlsZUJ1dHRvbiA9IGRvbS5ieUlkKFwiZmlsZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB1c2VDYW1lcmFCdXR0b24gPSBkb20uYnlJZChcInVzZUNhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmbGlwQ2FtZXJhQnV0dG9uID0gZG9tLmJ5SWQoXCJmbGlwQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN0b3BDYW1lcmFCdXR0b24gPSBkb20uYnlJZChcInN0b3BDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZXJyb3JzRGl2ID0gZG9tLmJ5SWQoXCJlcnJvcnNcIik7XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgaW1hZ2VMb2FkZWQgPSBuZXcgQ2hhbm5lbDxDQk5JbWFnZVNvdXJjZT4oKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuZmlsZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmZpbGVJbnB1dC5jbGljaygpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5maWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2VudGVyXCIsIChlKSA9PiB0aGlzLm9uRHJhZ0VudGVyT3ZlcihlKSlcclxuICAgICAgICB0aGlzLmZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnb3ZlclwiLCAoZSkgPT4gdGhpcy5vbkRyYWdFbnRlck92ZXIoZSkpXHJcbiAgICAgICAgdGhpcy5maWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJvcFwiLCAoZSkgPT4gdGhpcy5vbkZpbGVEcm9wKGUpKVxyXG4gICAgICAgIHRoaXMuZmlsZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4gdGhpcy5vbkZpbGVDaGFuZ2UoKSlcclxuICAgICAgICB0aGlzLnVzZUNhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy51c2VDYW1lcmEoKSlcclxuICAgICAgICB0aGlzLmZsaXBDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuZmxpcENhbWVyYSgpKVxyXG4gICAgICAgIHRoaXMuc3RvcENhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5zdG9wQ2FtZXJhKCkpXHJcbiAgICAgICAgdGhpcy5jYXB0dXJlSW1hZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuY2FwdHVyZUltYWdlKCkpXHJcbiAgICAgICAgdGhpcy5jYW1lcmEuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZG1ldGFkYXRhXCIsICgpID0+IHRoaXMub25DYW1lcmFMb2FkKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5sb2FkVWlEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICAvLyB0aGlzLmxvYWRGcm9tVXJsKFwiL2Nibi9hc3NldHMvYWNvcm4uanBnXCIpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5sb2FkVWlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25EcmFnRW50ZXJPdmVyKGV2OiBEcmFnRXZlbnQpIHtcclxuICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uRmlsZUNoYW5nZSgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuZmlsZUlucHV0LmZpbGVzPy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmaWxlID0gdGhpcy5maWxlSW5wdXQuZmlsZXNbMF1cclxuICAgICAgICB0aGlzLnByb2Nlc3NGaWxlKGZpbGUpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkZpbGVEcm9wKGV2OiBEcmFnRXZlbnQpIHtcclxuICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxuXHJcbiAgICAgICAgaWYgKCFldj8uZGF0YVRyYW5zZmVyPy5maWxlcz8ubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZmlsZSA9IGV2LmRhdGFUcmFuc2Zlci5maWxlc1swXVxyXG4gICAgICAgIHRoaXMucHJvY2Vzc0ZpbGUoZmlsZSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHVzZUNhbWVyYSgpIHtcclxuICAgICAgICB0aGlzLmFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIGNvbnN0IGRpYWxvZ1dpZHRoID0gdGhpcy5hY3F1aXJlSW1hZ2VEaXYuY2xpZW50V2lkdGhcclxuICAgICAgICBjb25zdCBkaWFsb2dIZWlnaHQgPSB0aGlzLmFjcXVpcmVJbWFnZURpdi5jbGllbnRIZWlnaHRcclxuICAgICAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7XHJcbiAgICAgICAgICAgIHZpZGVvOiB7IHdpZHRoOiB7IG1heDogZGlhbG9nV2lkdGggfSwgaGVpZ2h0OiB7IG1heDogZGlhbG9nSGVpZ2h0IH0sIGZhY2luZ01vZGU6IFwidXNlclwiIH0sXHJcbiAgICAgICAgICAgIGF1ZGlvOiBmYWxzZVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuVXNlclxyXG4gICAgICAgIHRoaXMuY2FtZXJhLnNyY09iamVjdCA9IHN0cmVhbVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZmxpcENhbWVyYSgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY2FtZXJhLnNyY09iamVjdCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHNyYyA9IHRoaXMuY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgICAgIGNvbnN0IHRyYWNrcyA9IHNyYy5nZXRUcmFja3MoKVxyXG4gICAgICAgIGZvciAoY29uc3QgdHJhY2sgb2YgdHJhY2tzKSB7XHJcbiAgICAgICAgICAgIHRyYWNrLnN0b3AoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jYW1lcmFNb2RlID0gdGhpcy5jYW1lcmFNb2RlID09IENhbWVyYU1vZGUuVXNlciA/IENhbWVyYU1vZGUuRW52aXJvbm1lbnQgOiBDYW1lcmFNb2RlLlVzZXJcclxuICAgICAgICBjb25zdCBmYWNpbmdNb2RlID0gdGhpcy5jYW1lcmFNb2RlID09IENhbWVyYU1vZGUuVXNlciA/IFwidXNlclwiIDogXCJlbnZpcm9ubWVudFwiXHJcblxyXG4gICAgICAgIC8vIGdldCBjdXJyZW50IGZhY2luZyBtb2RlXHJcbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xyXG4gICAgICAgICAgICB2aWRlbzogeyB3aWR0aDogdGhpcy5jYW1lcmEuY2xpZW50V2lkdGgsIGhlaWdodDogdGhpcy5jYW1lcmEuY2xpZW50SGVpZ2h0LCBmYWNpbmdNb2RlOiBmYWNpbmdNb2RlIH0sXHJcbiAgICAgICAgICAgIGF1ZGlvOiBmYWxzZVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhLnNyY09iamVjdCA9IHN0cmVhbVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25DYW1lcmFMb2FkKCkge1xyXG4gICAgICAgIHRoaXMuYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5jYW1lcmEucGxheSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzdG9wQ2FtZXJhKCkge1xyXG4gICAgICAgIGNvbnN0IHNyYyA9IHRoaXMuY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgICAgIGlmICghc3JjKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdHJhY2tzID0gc3JjLmdldFRyYWNrcygpXHJcbiAgICAgICAgZm9yIChjb25zdCB0cmFjayBvZiB0cmFja3MpIHtcclxuICAgICAgICAgICAgdHJhY2suc3RvcCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLk5vbmVcclxuICAgICAgICB0aGlzLmFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYXB0dXJlSW1hZ2UoKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhckVycm9yTWVzc2FnZXMoKVxyXG5cclxuICAgICAgICBjb25zdCBzcmMgPSB0aGlzLmNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgICAgICBpZiAoIXNyYykge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRyYWNrID0gc3JjLmdldFZpZGVvVHJhY2tzKClbMF1cclxuICAgICAgICBpZiAoIXRyYWNrKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5pbWFnZUxvYWRlZC5wdWJsaXNoKHsgd2lkdGg6IHRoaXMuY2FtZXJhLnZpZGVvV2lkdGgsIGhlaWdodDogdGhpcy5jYW1lcmEudmlkZW9IZWlnaHQsIHNvdXJjZTogdGhpcy5jYW1lcmEgfSlcclxuICAgICAgICB0aGlzLnN0b3BDYW1lcmEoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHJvY2Vzc0ZpbGUoZmlsZTogRmlsZSkge1xyXG4gICAgICAgIHRoaXMuY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpXHJcbiAgICAgICAgdGhpcy5sb2FkRnJvbVVybCh1cmwpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBsb2FkRnJvbVVybCh1cmw6IHN0cmluZykge1xyXG4gICAgICAgIHRoaXMuY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuICAgICAgICBjb25zdCBpbWcgPSBhd2FpdCBkb20ubG9hZEltYWdlKHVybClcclxuICAgICAgICB0aGlzLmltYWdlTG9hZGVkLnB1Ymxpc2goeyB3aWR0aDogaW1nLndpZHRoLCBoZWlnaHQ6IGltZy5oZWlnaHQsIHNvdXJjZTogaW1nIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjbGVhckVycm9yTWVzc2FnZXMoKSB7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRoaXMuZXJyb3JzRGl2KVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBQbGF5VWkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW52YXMgPSBkb20uYnlJZChcImNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzY3JhdGNoQ2FudmFzID0gbmV3IE9mZnNjcmVlbkNhbnZhcygwLCAwKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWxldHRlRGl2ID0gZG9tLmJ5SWQoXCJwYWxldHRlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVFbnRyeVRlbXBsYXRlID0gZG9tLmJ5SWQoXCJwYWxldHRlRW50cnlcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwbGF5VWlEaXYgPSBkb20uYnlJZChcInBsYXlVaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZXR1cm5CdXR0b24gPSBkb20uYnlJZChcInJldHVybkJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZUN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKSBhcyBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2NyYXRjaEN0eCA9IHRoaXMuc2NyYXRjaENhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikgYXMgT2Zmc2NyZWVuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgcmV0dXJuID0gbmV3IENoYW5uZWw8dm9pZD4oKVxyXG4gICAgcHJpdmF0ZSBkcmFnID0gZmFsc2VcclxuICAgIHByaXZhdGUgZHJhZ2dlZCA9IGZhbHNlXHJcbiAgICBwcml2YXRlIGRyYWdMYXN0ID0gbmV3IGdlby5WZWMyKDAsIDApXHJcbiAgICBwcml2YXRlIGluaXRpYWxJbWFnZURhdGE6IEltYWdlRGF0YSA9IG5ldyBJbWFnZURhdGEoMSwgMSlcclxuICAgIHByaXZhdGUgcHJvY2Vzc2VkSW1hZ2VEYXRhOiBJbWFnZURhdGEgPSBuZXcgSW1hZ2VEYXRhKDEsIDEpXHJcbiAgICBwcml2YXRlIHBhbGV0dGU6IGltYWdpbmcyLkNvbG9yW10gPSBbXVxyXG4gICAgcHJpdmF0ZSByZWdpb25zOiBSZWdpb25bXSA9IFtdXHJcbiAgICBwcml2YXRlIHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkgPSBbXVxyXG4gICAgcHJpdmF0ZSBzZWxlY3RlZFBhbGV0dGVJbmRleDogbnVtYmVyID0gLTFcclxuICAgIHByaXZhdGUgc2VxdWVuY2U6IFJlZ2lvbltdID0gW11cclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaW1hZ2VDdHgpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FudmFzIGVsZW1lbnQgbm90IHN1cHBvcnRlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLnNjcmF0Y2hDdHgpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT2Zmc2NyZWVuQ2FudmFzICBub3Qgc3VwcG9ydGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZSA9PiB0aGlzLm9uQ2FudmFzQ2xpY2soZSkpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBlID0+IHRoaXMub25DYW52YXNNb3VzZURvd24oZSkpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBlID0+IHRoaXMub25DYW52YXNNb3VzZU1vdmUoZSkpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgZSA9PiB0aGlzLm9uQ2FudmFzTW91c2VVcChlKSlcclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwid2hlZWxcIiwgZSA9PiB0aGlzLm9uQ2FudmFzTW91c2VXaGVlbChlKSlcclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5wbGF5VWlEaXYsIFwiY2xpY2tcIiwgXCIucGFsZXR0ZS1lbnRyeVwiLCAoZSkgPT4gdGhpcy5vblBhbGV0dGVFbnRyeUNsaWNrKGUgYXMgTW91c2VFdmVudCkpXHJcbiAgICAgICAgdGhpcy5yZXR1cm5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMub25SZXR1cm4oKSlcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2hvdyhpbWc6IENCTkltYWdlU291cmNlKSB7XHJcbiAgICAgICAgdGhpcy5wbGF5VWlEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICBcclxuICAgICAgICAvLyBjbGllbnRXaWR0aCAvIGNsaWVudEhlaWdodCBhcmUgY3NzIHNldCB3aWR0aCAvIGhlaWdodFxyXG4gICAgICAgIC8vIGJlZm9yZSBkcmF3aW5nLCBtdXN0IHNldCBjYW52YXMgd2lkdGggLyBoZWlnaHQgZm9yIGRyYXdpbmcgc3VyZmFjZSBwaXhlbHNcclxuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0XHJcblxyXG4gICAgICAgIC8vIGZpdCB3aWR0aFxyXG4gICAgICAgIGNvbnN0IGFzcGVjdCA9IGltZy53aWR0aCAvIGltZy5oZWlnaHRcclxuICAgICAgICBsZXQgd2lkdGggPSBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoXHJcbiAgICAgICAgbGV0IGhlaWdodCA9IHdpZHRoIC8gYXNwZWN0XHJcblxyXG4gICAgICAgIGlmIChoZWlnaHQgPiB0aGlzLmNhbnZhcy5oZWlnaHQpIHtcclxuICAgICAgICAgICAgaGVpZ2h0ID0gdGhpcy5jYW52YXMuaGVpZ2h0XHJcbiAgICAgICAgICAgIHdpZHRoID0gaGVpZ2h0ICogYXNwZWN0XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHdpZHRoXHJcbiAgICAgICAgdGhpcy5zY3JhdGNoQ2FudmFzLndpZHRoID0gdGhpcy5jYW52YXMud2lkdGhcclxuICAgICAgICB0aGlzLnNjcmF0Y2hDYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW52YXMuaGVpZ2h0XHJcbiAgICAgICAgdGhpcy5zY3JhdGNoQ3R4LmZpbGxTdHlsZSA9IFwid2hpdGVcIlxyXG4gICAgICAgIHRoaXMuc2NyYXRjaEN0eC5maWxsUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KVxyXG4gICAgICAgIHRoaXMuc2NyYXRjaEN0eC5kcmF3SW1hZ2UoaW1nLnNvdXJjZSwgMCwgMCwgd2lkdGgsIGhlaWdodClcclxuXHJcbiAgICAgICAgLy8gYXQgdGhpcyBwb2ludCwgaW1hZ2Ugc2hvdWxkIGJlIGRyYXduIHRvIHNjcmF0Y2ggY2FudmFzXHJcbiAgICAgICAgLy8gZ2V0IChmbGF0KSBpbWFnZSBkYXRhIGZyb20gc2NyYXRjaCBjYW52YXNcclxuICAgICAgICB0aGlzLmluaXRpYWxJbWFnZURhdGEgPSBkb20uY29weUltYWdlRGF0YSh0aGlzLnNjcmF0Y2hDdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpKVxyXG4gICAgICAgIGNvbnN0IHByb2Nlc3NlZEltYWdlID0gcHJvY2Vzc0ltYWdlKHRoaXMuc2NyYXRjaEN0eClcclxuICAgICAgICB0aGlzLnByb2Nlc3NlZEltYWdlRGF0YSA9IGRvbS5jb3B5SW1hZ2VEYXRhKHRoaXMuc2NyYXRjaEN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5zY3JhdGNoQ3R4LmNhbnZhcy53aWR0aCwgdGhpcy5zY3JhdGNoQ3R4LmNhbnZhcy5oZWlnaHQpKVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZSA9IHByb2Nlc3NlZEltYWdlLnBhbGV0dGVcclxuICAgICAgICB0aGlzLnJlZ2lvbnMgPSBwcm9jZXNzZWRJbWFnZS5yZWdpb25zXHJcbiAgICAgICAgdGhpcy5yZWdpb25PdmVybGF5ID0gcHJvY2Vzc2VkSW1hZ2UucmVnaW9uT3ZlcmxheVxyXG4gICAgICAgIHRoaXMuc2VxdWVuY2UgPSBbXVxyXG4gICAgICAgIHRoaXMuY3JlYXRlUGFsZXR0ZVVpKClcclxuICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeSgwKVxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgaGlkZSgpIHtcclxuICAgICAgICB0aGlzLnBsYXlVaURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJldHVybigpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnJldHVybi5wdWJsaXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNyZWF0ZVBhbGV0dGVVaSgpIHtcclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGhpcy5wYWxldHRlRGl2KVxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5wYWxldHRlLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbG9yID0gaW1hZ2luZzIudG9DYW52YXNDb2xvcih0aGlzLnBhbGV0dGVbaV0pXHJcbiAgICAgICAgICAgIGNvbnN0IGx1bSA9IGltYWdpbmcyLmNhbGNMdW1pbmFuY2UoY29sb3IpXHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy5wYWxldHRlRW50cnlUZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IGVudHJ5RGl2ID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLnBhbGV0dGUtZW50cnlcIikgYXMgSFRNTEVsZW1lbnRcclxuICAgICAgICAgICAgZW50cnlEaXYudGV4dENvbnRlbnQgPSBgJHtpICsgMX1gXHJcbiAgICAgICAgICAgIGVudHJ5RGl2LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGByZ2IoJHtjb2xvci54fSwgJHtjb2xvci55fSwgJHtjb2xvci56fSlgXHJcbiAgICAgICAgICAgIGVudHJ5RGl2LnN0eWxlLmNvbG9yID0gbHVtIDwgLjUgPyBcIndoaXRlXCIgOiBcImJsYWNrXCJcclxuICAgICAgICAgICAgdGhpcy5wYWxldHRlRGl2LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uQ2FudmFzQ2xpY2soZXZ0OiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgLy8gZG9uJ3QgY291bnQgZHJhZyBhcyBjbGlja1xyXG4gICAgICAgIGlmICh0aGlzLmRyYWdnZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmFnZ2VkID0gZmFsc2VcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB0cmFuc2Zvcm0gY2xpY2sgY29vcmRpbmF0ZXMgdG8gc2NyYXRjaCBjYW52YXMgY29vcmRpbmF0ZXMsIHRoZW4gZGV0ZXJtaW5lIHJlZ2lvbiB0aGF0IHdhcyBjbGlja2VkIG9uXHJcbiAgICAgICAgY29uc3QgeyB4OiBjbGlja1gsIHk6IGNsaWNrWSB9ID0gdGhpcy5pbWFnZUN0eC5nZXRUcmFuc2Zvcm0oKS5pbnZlcnNlKCkudHJhbnNmb3JtUG9pbnQoeyB4OiBldnQub2Zmc2V0WCwgeTogZXZ0Lm9mZnNldFkgfSlcclxuICAgICAgICBjb25zdCBpZHggPSBjbGlja1kgKiB0aGlzLmltYWdlQ3R4LmNhbnZhcy53aWR0aCArIGNsaWNrWFxyXG4gICAgICAgIGNvbnN0IHJlZ2lvbiA9IHRoaXMucmVnaW9uT3ZlcmxheVtpZHhdXHJcblxyXG4gICAgICAgIC8vIGlmIHdoaXRlIHJlZ2lvbiBvciBudWxsIHJlZ2lvbiwgZG8gbm90aGluZ1xyXG4gICAgICAgIGlmICghcmVnaW9uIHx8IHJlZ2lvbi5jb2xvciA9PT0gLTEpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpZiBub3Qgc2VsZWN0ZWQgcmVnaW9uLCBub3RoaW5nXHJcbiAgICAgICAgaWYgKHJlZ2lvbi5jb2xvciAhPSB0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZmlsbCB0aGUgcmVnaW9uXHJcbiAgICAgICAgdGhpcy5maWxsUmVnaW9uKHJlZ2lvbilcclxuICAgICAgICB0aGlzLnNlcXVlbmNlLnB1c2gocmVnaW9uKVxyXG5cclxuICAgICAgICAvLyBpZiBhbGwgcmVnaW9ucyBmb3IgdGhpcyBjb2xvciBhcmUgZmlsbGVkLCBzaG93IGNoZWNrbWFyayBvbiBwYWxldHRlIGVudHJ5LCBhbmQgbW92ZSB0byBuZXh0IHVuZmluaXNoZWQgcmVnaW9uXHJcbiAgICAgICAgaWYgKHRoaXMucmVnaW9ucy5maWx0ZXIociA9PiByLmNvbG9yID09IHJlZ2lvbi5jb2xvcikuZXZlcnkociA9PiByLmZpbGxlZCkpIHtcclxuICAgICAgICAgICAgY29uc3QgZW50cnkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnBhbGV0dGUtZW50cnlcIilbcmVnaW9uLmNvbG9yXVxyXG4gICAgICAgICAgICBlbnRyeS5pbm5lckhUTUwgPSBcIiZjaGVjaztcIlxyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeSh0aGlzLmZpbmROZXh0VW5maW5pc2hlZFJlZ2lvbigpKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaWYgYWxsIHJlZ2lvbnMgYXJlIGZpbGxlZCwgcmVwbGFjZSB3aXRoIG9yaWdpbmFsIGltYWdlIGRhdGFcclxuICAgICAgICBpZiAodGhpcy5yZWdpb25zLmV2ZXJ5KHIgPT4gci5maWxsZWQgfHwgci5jb2xvciA9PT0gLTEpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2NyYXRjaEN0eC5wdXRJbWFnZURhdGEodGhpcy5pbml0aWFsSW1hZ2VEYXRhLCAwLCAwKVxyXG4gICAgICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgICAgIHRoaXMuc2hvd0NvbG9yQW5pbWF0aW9uKClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmaWxsUmVnaW9uKHJlZ2lvbjogUmVnaW9uKSB7XHJcbiAgICAgICAgLy8gZmlsbCB0aGUgcmVnaW9uXHJcbiAgICAgICAgY29uc3QgYm91bmRzID0gcmVnaW9uLmJvdW5kc1xyXG4gICAgICAgIGNvbnN0IGltYWdlRGF0YSA9IHRoaXMuc2NyYXRjaEN0eC5nZXRJbWFnZURhdGEoYm91bmRzLm1pbi54LCBib3VuZHMubWluLnksIGJvdW5kcy53aWR0aCwgYm91bmRzLmhlaWdodClcclxuICAgICAgICBjb25zdCBkYXRhID0gaW1hZ2VEYXRhLmRhdGFcclxuICAgICAgICBjb25zdCBjb2xvciA9IGltYWdpbmcyLnRvQ2FudmFzQ29sb3IodGhpcy5wYWxldHRlW3JlZ2lvbi5jb2xvcl0pXHJcblxyXG4gICAgICAgIGltYWdpbmcuc2NhbkltYWdlRGF0YShpbWFnZURhdGEsICh4LCB5LCBvZmZzZXQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgaW1hZ2VYID0geCArIGJvdW5kcy5taW4ueFxyXG4gICAgICAgICAgICBjb25zdCBpbWFnZVkgPSB5ICsgYm91bmRzLm1pbi55XHJcbiAgICAgICAgICAgIGNvbnN0IGltYWdlT2Zmc2V0ID0gaW1hZ2VZICogdGhpcy5zY3JhdGNoQ3R4LmNhbnZhcy53aWR0aCArIGltYWdlWFxyXG4gICAgICAgICAgICBjb25zdCBpbWFnZVJlZ2lvbiA9IHRoaXMucmVnaW9uT3ZlcmxheVtpbWFnZU9mZnNldF1cclxuICAgICAgICAgICAgaWYgKGltYWdlUmVnaW9uICE9PSByZWdpb24pIHtcclxuICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDRdID0gY29sb3IueFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCAqIDQgKyAxXSA9IGNvbG9yLnlcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKiA0ICsgMl0gPSBjb2xvci56XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5zY3JhdGNoQ3R4LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIGJvdW5kcy5taW4ueCwgYm91bmRzLm1pbi55KVxyXG4gICAgICAgIHJlZ2lvbi5maWxsZWQgPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkNhbnZhc01vdXNlRG93bihlOiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgdGhpcy5kcmFnID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuZHJhZ0xhc3QgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkNhbnZhc01vdXNlVXAoXzogTW91c2VFdmVudCkge1xyXG4gICAgICAgIHRoaXMuZHJhZyA9IGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkNhbnZhc01vdXNlTW92ZShlOiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmRyYWcpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICBjb25zdCBkZWx0YSA9IHBvc2l0aW9uLnN1Yih0aGlzLmRyYWdMYXN0KVxyXG5cclxuICAgICAgICBpZiAoTWF0aC5hYnMoZGVsdGEueCkgPiAzIHx8IE1hdGguYWJzKGRlbHRhLnkpID4gMykge1xyXG4gICAgICAgICAgICB0aGlzLmltYWdlQ3R4LnRyYW5zbGF0ZShkZWx0YS54LCBkZWx0YS55KVxyXG4gICAgICAgICAgICB0aGlzLmRyYWdMYXN0ID0gcG9zaXRpb25cclxuICAgICAgICAgICAgdGhpcy5kcmFnZ2VkID0gdHJ1ZVxyXG4gICAgICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25DYW52YXNNb3VzZVdoZWVsKGU6IFdoZWVsRXZlbnQpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgICAgICBpZiAoZS5kZWx0YVkgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW1hZ2VDdHgudHJhbnNsYXRlKC1lLm9mZnNldFgsIC1lLm9mZnNldFkpXHJcbiAgICAgICAgICAgIHRoaXMuaW1hZ2VDdHguc2NhbGUoLjUsIC41KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUuZGVsdGFZIDwgMCkge1xyXG4gICAgICAgICAgICB0aGlzLmltYWdlQ3R4LnRyYW5zbGF0ZSgtZS5vZmZzZXRYLCAtZS5vZmZzZXRZKVxyXG4gICAgICAgICAgICB0aGlzLmltYWdlQ3R4LnNjYWxlKDIsIDIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblBhbGV0dGVFbnRyeUNsaWNrKGU6IE1vdXNlRXZlbnQpIHtcclxuICAgICAgICBjb25zdCBlbnRyeSA9IGUudGFyZ2V0IGFzIEVsZW1lbnRcclxuICAgICAgICBjb25zdCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KGVudHJ5KVxyXG4gICAgICAgIHRoaXMuc2VsZWN0UGFsZXR0ZUVudHJ5KGlkeClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNlbGVjdFBhbGV0dGVFbnRyeShpZHg6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXggPSBpZHhcclxuXHJcbiAgICAgICAgY29uc3QgZW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5wYWxldHRlLWVudHJ5XCIpKVxyXG4gICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgICAgICBlbnRyeS5jbGFzc0xpc3QucmVtb3ZlKFwic2VsZWN0ZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpZHggIT09IC0xKSB7XHJcbiAgICAgICAgICAgIGVudHJpZXNbaWR4XS5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGRpc3BsYXkgYSBwYXR0ZXJuIG9uIHRoZXNlIGVudHJpZXMgKG9yIGNsZWFyIGNoZWNrZXJib2FyZCBmcm9tIHByZXZvdXMpXHJcbiAgICAgICAgdGhpcy5maWxsQ29sb3JDaGVja2VyYm9hcmQoaWR4KVxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZpbGxDb2xvckNoZWNrZXJib2FyZChpZHg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGltYWdlRGF0YSA9IHRoaXMuc2NyYXRjaEN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5zY3JhdGNoQ3R4LmNhbnZhcy53aWR0aCwgdGhpcy5zY3JhdGNoQ3R4LmNhbnZhcy5oZWlnaHQpXHJcbiAgICAgICAgY29uc3QgZGF0YSA9IGltYWdlRGF0YS5kYXRhXHJcbiAgICAgICAgbGV0IG4gPSAwXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5yZWdpb25PdmVybGF5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlZ2lvbiA9IHRoaXMucmVnaW9uT3ZlcmxheVtpXVxyXG5cclxuICAgICAgICAgICAgaWYgKCFyZWdpb24pIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChyZWdpb24uZmlsbGVkKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocmVnaW9uLmNvbG9yID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgaWkgPSBpICogNFxyXG4gICAgICAgICAgICBpZiAocmVnaW9uLmNvbG9yID09PSBpZHgpIHtcclxuICAgICAgICAgICAgICAgIGRhdGFbaWldID0gbiAlIDMgPT0gMCA/IDEyNyA6IDI1NVxyXG4gICAgICAgICAgICAgICAgZGF0YVtpaSArIDFdID0gbiAlIDMgPT0gMCA/IDEyNyA6IDI1NVxyXG4gICAgICAgICAgICAgICAgZGF0YVtpaSArIDJdID0gbiAlIDMgPT0gMCA/IDEyNyA6IDI1NVxyXG4gICAgICAgICAgICAgICAgZGF0YVtpaSArIDNdID0gMjU1XHJcbiAgICAgICAgICAgICAgICArK25cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGRhdGFbaWldID0gMjU1XHJcbiAgICAgICAgICAgICAgICBkYXRhW2lpICsgMV0gPSAyNTVcclxuICAgICAgICAgICAgICAgIGRhdGFbaWkgKyAyXSA9IDI1NVxyXG4gICAgICAgICAgICAgICAgZGF0YVtpaSArIDNdID0gMjU1XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2NyYXRjaEN0eC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKVxyXG4gICAgICAgIGRyYXdSZWdpb25MYWJlbHModGhpcy5zY3JhdGNoQ3R4LCB0aGlzLnJlZ2lvbnMpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmaW5kTmV4dFVuZmluaXNoZWRSZWdpb24oKTogbnVtYmVyIHtcclxuICAgICAgICBjb25zdCByZWdpb25zID0gdGhpcy5yZWdpb25zLmZpbHRlcihyID0+ICFyLmZpbGxlZCAmJiByLmNvbG9yICE9IC0xKVxyXG4gICAgICAgIGlmIChyZWdpb25zLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAtMVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcmVnaW9uID0gcmVnaW9ucy5yZWR1Y2UoKHIxLCByMikgPT4gcjEuY29sb3IgPCByMi5jb2xvciA/IHIxIDogcjIpXHJcbiAgICAgICAgcmV0dXJuIHJlZ2lvbi5jb2xvclxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVkcmF3KCkge1xyXG4gICAgICAgIC8vIGNsZWFyIGlzIHN1YmplY3QgdG8gdHJhbnNmb3JtIC0gdGhhdCBpcyBwcm9iYWJseSB3aHkgdGhpcyBpcyBidXN0ZWQhXHJcbiAgICAgICAgY29uc3QgdHJhbnNmb3JtID0gdGhpcy5pbWFnZUN0eC5nZXRUcmFuc2Zvcm0oKVxyXG4gICAgICAgIHRoaXMuaW1hZ2VDdHgucmVzZXRUcmFuc2Zvcm0oKVxyXG4gICAgICAgIHRoaXMuaW1hZ2VDdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuaW1hZ2VDdHguY2FudmFzLndpZHRoLCB0aGlzLmltYWdlQ3R4LmNhbnZhcy5oZWlnaHQpXHJcbiAgICAgICAgdGhpcy5pbWFnZUN0eC5zZXRUcmFuc2Zvcm0odHJhbnNmb3JtKVxyXG4gICAgICAgIHRoaXMuaW1hZ2VDdHguZHJhd0ltYWdlKHRoaXMuc2NyYXRjaENhbnZhcywgMCwgMClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNob3dDb2xvckFuaW1hdGlvbigpIHtcclxuICAgICAgICAvLyBmaXJzdCB3YWl0XHJcbiAgICAgICAgYXdhaXQgdXRpbC53YWl0KDUwMClcclxuXHJcbiAgICAgICAgLy8gcmVzZXQgaW1hZ2UgZGF0YVxyXG4gICAgICAgIHRoaXMuaW1hZ2VDdHgucmVzZXRUcmFuc2Zvcm0oKVxyXG4gICAgICAgIHRoaXMuc2NyYXRjaEN0eC5wdXRJbWFnZURhdGEodGhpcy5wcm9jZXNzZWRJbWFnZURhdGEsIDAsIDApXHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG5cclxuICAgICAgICAvLyBjb2xvciBhcyB1c2VyIGRpZFxyXG4gICAgICAgIGF3YWl0IHV0aWwud2FpdCg1MDApXHJcbiAgICAgICAgZm9yIChjb25zdCByIG9mIHRoaXMuc2VxdWVuY2UpIHtcclxuICAgICAgICAgICAgdGhpcy5maWxsUmVnaW9uKHIpXHJcbiAgICAgICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICAgICAgYXdhaXQgdXRpbC53YWl0KDIwMClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2NyYXRjaEN0eC5wdXRJbWFnZURhdGEodGhpcy5pbml0aWFsSW1hZ2VEYXRhLCAwLCAwKVxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQ0JOIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbG9hZFVpID0gbmV3IExvYWRVaSgpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBsYXlVaSA9IG5ldyBQbGF5VWkoKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMubG9hZFVpLnNob3coKVxyXG4gICAgICAgIHRoaXMubG9hZFVpLmltYWdlTG9hZGVkLnN1YmNyaWJlKHggPT4gdGhpcy5vbkltYWdlTG9hZGVkKHgpKVxyXG4gICAgICAgIHRoaXMucGxheVVpLnJldHVybi5zdWJjcmliZSgoKSA9PiB0aGlzLm9uUmV0dXJuKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkltYWdlTG9hZGVkKGltZzogQ0JOSW1hZ2VTb3VyY2UpIHtcclxuICAgICAgICB0aGlzLmxvYWRVaS5oaWRlKClcclxuICAgICAgICB0aGlzLnBsYXlVaS5zaG93KGltZylcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmV0dXJuKCkge1xyXG4gICAgICAgIHRoaXMucGxheVVpLmhpZGUoKVxyXG4gICAgICAgIHRoaXMubG9hZFVpLnNob3coKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcHJvY2Vzc0ltYWdlKGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEIHwgT2Zmc2NyZWVuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKTogUHJvY2Vzc2VkSW1hZ2Uge1xyXG4gICAgLy8gYXQgdGhpcyBwb2ludCwgaW1hZ2Ugc2hvdWxkIGJlIGRyYXduIHRvIHNjcmF0Y2ggY2FudmFzXHJcbiAgICAvLyBnZXQgKGZsYXQpIGltYWdlIGRhdGEgZnJvbSBzY3JhdGNoIGNhbnZhc1xyXG4gICAgY29uc3QgaW1nID0gaW1hZ2luZzIuZnJvbUNhbnZhc0ltYWdlRGF0YShjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIGN0eC5jYW52YXMud2lkdGgsIGN0eC5jYW52YXMuaGVpZ2h0KSlcclxuICAgIGltYWdpbmcyLnBhbGV0dGl6ZUhpc3RvZ3JhbShpbWcsIDgsIDEyOClcclxuXHJcbiAgICAvLyBub3RlIC0gdW5pcXVlIGNvbG9ycyBtYXBzIGNvbG9ycyB0byBpbnRlZ2VycyBhbmQgYmFjayBhZ2FpblxyXG4gICAgLy8gdGhpcyByZXN1bHRzIGluIHNsaWdodGx5IGRpZmZlcmVudCBjb2xvcnMgdGhhbiB0aGUgaGlzdG9ncmFtIGNhbGN1bGF0ZWQgY29sb3JzXHJcbiAgICAvLyBwYWNrIC8gdW5wYWNrIHRvIG1ha2UgdGhlc2UgZXF1YWxcclxuICAgIGxldCBwYWxldHRlID0gaW1hZ2luZzIudW5pcXVlQ29sb3JzKGltZylcclxuICAgIGZvciAoY29uc3QgY29sb3Igb2YgaW1nKSB7XHJcbiAgICAgICAgY29sb3Iuc2V0KGltYWdpbmcyLnVucGFja0NvbG9yKGltYWdpbmcyLnBhY2tDb2xvcihjb2xvcikpKVxyXG4gICAgfVxyXG5cclxuICAgIHBhbGV0dGUgPSBwYWxldHRlLmZpbHRlcihjID0+IGMueCA8IC45ICYmIGMueSA8IC45ICYmIGMueiA8IC45KVxyXG4gICAgY29uc3QgcGFsZXR0ZU92ZXJsYXkgPSBpbWFnaW5nMi5pbmRleEJ5Q29sb3IoaW1nLCBwYWxldHRlKVxyXG5cclxuICAgIGxldCBbcmVnaW9ucywgcmVnaW9uT3ZlcmxheV0gPSBjcmVhdGVSZWdpb25PdmVybGF5KGltZy53aWR0aCwgaW1nLmhlaWdodCwgcGFsZXR0ZU92ZXJsYXkpXHJcbiAgICByZWdpb25zID0gcHJ1bmVSZWdpb25zKGltZy53aWR0aCwgaW1nLmhlaWdodCwgcmVnaW9ucywgcmVnaW9uT3ZlcmxheSlcclxuXHJcbiAgICAvLyBzb21lIHBhbGxldHRlIGVudHJpZXMgd2lsbCBub3cgYmUgdW51c2VkIGJ5IHJlZ2lvbnMsIHJlbW92ZSB0aGVzZVxyXG4gICAgcGFsZXR0ZSA9IHJlbW92ZVVudXNlZFBhbGV0dGVFbnRyaWVzKHBhbGV0dGUsIHJlZ2lvbnMpXHJcblxyXG4gICAgZHJhd0JvcmRlcnMocmVnaW9uT3ZlcmxheSwgaW1nKVxyXG4gICAgZmlsbEludGVyaW9yKHJlZ2lvbk92ZXJsYXksIGltZylcclxuICAgIGN0eC5maWxsU3R5bGUgPSBcImJsYWNrXCJcclxuICAgIGN0eC5wdXRJbWFnZURhdGEoaW1hZ2luZzIudG9DYW52YXNJbWFnZURhdGEoaW1nKSwgMCwgMClcclxuICAgIGRyYXdSZWdpb25MYWJlbHMoY3R4LCByZWdpb25zKVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcGFsZXR0ZTogcGFsZXR0ZSxcclxuICAgICAgICByZWdpb25zOiByZWdpb25zLFxyXG4gICAgICAgIHJlZ2lvbk92ZXJsYXk6IHJlZ2lvbk92ZXJsYXlcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlUmVnaW9uT3ZlcmxheSh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcGFsZXR0ZU92ZXJsYXk6IG51bWJlcltdKTogW1JlZ2lvbltdLCBSZWdpb25PdmVybGF5XSB7XHJcbiAgICBjb25zdCByZWdpb25PdmVybGF5OiBSZWdpb25PdmVybGF5ID0gYXJyYXkudW5pZm9ybShudWxsLCB3aWR0aCAqIGhlaWdodClcclxuICAgIGNvbnN0IHJlZ2lvbnM6IFJlZ2lvbltdID0gW11cclxuXHJcbiAgICBpbWFnaW5nLnNjYW4od2lkdGgsIGhlaWdodCwgKHgsIHksIG9mZnNldCkgPT4ge1xyXG4gICAgICAgIGlmIChyZWdpb25PdmVybGF5W29mZnNldF0pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCByZWdpb246IFJlZ2lvbiA9IHtcclxuICAgICAgICAgICAgY29sb3I6IHBhbGV0dGVPdmVybGF5W29mZnNldF0sXHJcbiAgICAgICAgICAgIHBpeGVsczogMCxcclxuICAgICAgICAgICAgYm91bmRzOiBnZW8uUmVjdC5lbXB0eSgpLFxyXG4gICAgICAgICAgICBtYXhSZWN0OiBnZW8uUmVjdC5lbXB0eSgpLFxyXG4gICAgICAgICAgICBmaWxsZWQ6IGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSByZWdpb25cclxuICAgICAgICByZWdpb25zLnB1c2gocmVnaW9uKVxyXG4gICAgICAgIGV4cGxvcmVSZWdpb24od2lkdGgsIGhlaWdodCwgcGFsZXR0ZU92ZXJsYXksIHgsIHksIHJlZ2lvbk92ZXJsYXkpXHJcbiAgICB9KVxyXG5cclxuICAgIHJldHVybiBbcmVnaW9ucywgcmVnaW9uT3ZlcmxheV1cclxufVxyXG5cclxuZnVuY3Rpb24gcHJ1bmVSZWdpb25zKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCByZWdpb25zOiBSZWdpb25bXSwgcmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSk6IFJlZ2lvbltdIHtcclxuICAgIGNvbnN0IHJlZ2lvblNldCA9IG5ldyBTZXQocmVnaW9ucylcclxuICAgIGNvbnN0IG1pblJlZ2lvbldpZHRoID0gMTBcclxuICAgIGNvbnN0IG1pblJlZ2lvbkhlaWdodCA9IDEwXHJcbiAgICBjb25zdCBtaW5SZWdpb25QaXhlbHMgPSBtaW5SZWdpb25XaWR0aCAqIG1pblJlZ2lvbkhlaWdodFxyXG5cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvbnMpIHtcclxuICAgICAgICBpZiAocmVnaW9uLnBpeGVscyA8PSBtaW5SZWdpb25QaXhlbHMpIHtcclxuICAgICAgICAgICAgcmVnaW9uU2V0LmRlbGV0ZShyZWdpb24pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNhbGNSZWdpb25Cb3VuZHMod2lkdGgsIGhlaWdodCwgcmVnaW9ucywgcmVnaW9uT3ZlcmxheSlcclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvblNldCkge1xyXG4gICAgICAgIGlmIChyZWdpb24uYm91bmRzLndpZHRoIDw9IG1pblJlZ2lvbldpZHRoKSB7XHJcbiAgICAgICAgICAgIHJlZ2lvblNldC5kZWxldGUocmVnaW9uKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHJlZ2lvbi5ib3VuZHMuaGVpZ2h0IDw9IG1pblJlZ2lvbkhlaWdodCkge1xyXG4gICAgICAgICAgICByZWdpb25TZXQuZGVsZXRlKHJlZ2lvbilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gY2FsY3VsYXRlIG1heGltYWwgcmVjIGZvciBlYWNoIHJlZ2lvblxyXG4gICAgZm9yIChjb25zdCByZWdpb24gb2YgcmVnaW9uU2V0KSB7XHJcbiAgICAgICAgcmVnaW9uLm1heFJlY3QgPSBjYWxjTWF4UmVnaW9uUmVjdCh3aWR0aCwgcmVnaW9uLCByZWdpb25PdmVybGF5KVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvblNldCkge1xyXG4gICAgICAgIGlmIChyZWdpb24ubWF4UmVjdC53aWR0aCA8IG1pblJlZ2lvbldpZHRoKSB7XHJcbiAgICAgICAgICAgIHJlZ2lvblNldC5kZWxldGUocmVnaW9uKVxyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHJlZ2lvbi5tYXhSZWN0LmhlaWdodCA8IG1pblJlZ2lvbkhlaWdodCkge1xyXG4gICAgICAgICAgICByZWdpb25TZXQuZGVsZXRlKHJlZ2lvbilcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gdXBkYXRlIHRoZSBvdmVybGF5XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlZ2lvbk92ZXJsYXkubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCByZWdpb24gPSByZWdpb25PdmVybGF5W2ldXHJcbiAgICAgICAgaWYgKCFyZWdpb24pIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghcmVnaW9uU2V0LmhhcyhyZWdpb24pKSB7XHJcbiAgICAgICAgICAgIHJlZ2lvbk92ZXJsYXlbaV0gPSBudWxsXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBbLi4ucmVnaW9uU2V0XVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVVbnVzZWRQYWxldHRlRW50cmllcyhwYWxldHRlOiBpbWFnaW5nMi5Db2xvcltdLCByZWdpb25zOiBSZWdpb25bXSk6IGltYWdpbmcyLkNvbG9yW10ge1xyXG4gICAgLy8gY3JlYXRlIGEgbWFwIGZyb20gY3VycmVudCBjb2xvciBpbmRleCB0byBuZXcgY29sb3IgaW5kZXhcclxuICAgIGNvbnN0IHVzZWRTZXQgPSBuZXcgU2V0KHJlZ2lvbnMubWFwKHIgPT4gci5jb2xvcikpXHJcbiAgICB1c2VkU2V0LmRlbGV0ZSgtMSlcclxuICAgIGNvbnN0IHVzZWQgPSBbLi4udXNlZFNldF1cclxuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KHVzZWQubWFwKCh1LCBpKSA9PiBbdSwgaV0pKVxyXG5cclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvbnMpIHtcclxuICAgICAgICBpZiAocmVnaW9uLmNvbG9yID09PSAtMSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29sb3IgPSBtYXAuZ2V0KHJlZ2lvbi5jb2xvcilcclxuICAgICAgICBpZiAodHlwZW9mIGNvbG9yID09PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvbG9yIG5vdCBmb3VuZCBpbiBtYXBcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlZ2lvbi5jb2xvciA9IGNvbG9yXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHVzZWQubWFwKGkgPT4gcGFsZXR0ZVtpXSlcclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY1JlZ2lvbkJvdW5kcyh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcmVnaW9uczogUmVnaW9uW10sIG92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkpIHtcclxuICAgIGltYWdpbmcuc2Nhbih3aWR0aCwgaGVpZ2h0LCAoeCwgeSwgb2Zmc2V0KSA9PiB7XHJcbiAgICAgICAgY29uc3QgcmVnaW9uID0gb3ZlcmxheVtvZmZzZXRdXHJcbiAgICAgICAgaWYgKCFyZWdpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZWdpb24uYm91bmRzID0gcmVnaW9uLmJvdW5kcy5leHRlbmQobmV3IGdlby5WZWMyKHgsIHkpKVxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBleHBhbmQgZWFjaCByZWdpb24gYnkgMSB0byBpbmNsdWRlIHJpZ2h0IC8gYm90dG9tIHBpeGVscyBpbiBib3hcclxuICAgIGZvciAoY29uc3QgcmVnaW9uIG9mIHJlZ2lvbnMpIHtcclxuICAgICAgICBpZiAocmVnaW9uLmJvdW5kcy5tYXgueCA+IHJlZ2lvbi5ib3VuZHMubWluLngpIHtcclxuICAgICAgICAgICAgcmVnaW9uLmJvdW5kcy5tYXgueCArPSAxXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocmVnaW9uLmJvdW5kcy5tYXgueSA+IHJlZ2lvbi5ib3VuZHMubWluLnkpIHtcclxuICAgICAgICAgICAgcmVnaW9uLmJvdW5kcy5tYXgueSArPSAxXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjTWF4UmVnaW9uUmVjdChyb3dQaXRjaDogbnVtYmVyLCByZWdpb246IFJlZ2lvbiwgcmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSk6IGdlby5SZWN0IHtcclxuICAgIC8vIGRlcml2ZWQgZnJvbSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy83MjQ1L3B1enpsZS1maW5kLWxhcmdlc3QtcmVjdGFuZ2xlLW1heGltYWwtcmVjdGFuZ2xlLXByb2JsZW1cclxuICAgIC8vIGFsZ29yaXRobSBuZWVkcyB0byBrZWVwIHRyYWNrIG9mIHJlY3RhbmdsZSBzdGF0ZSBmb3IgZXZlcnkgY29sdW1uIGZvciBldmVyeSByZWdpb25cclxuICAgIGNvbnN0IHsgeDogeDAsIHk6IHkwIH0gPSByZWdpb24uYm91bmRzLm1pblxyXG4gICAgY29uc3QgeyB4OiB4MSwgeTogeTEgfSA9IHJlZ2lvbi5ib3VuZHMubWF4XHJcbiAgICBjb25zdCB3aWR0aCA9IHgxIC0geDAgKyAxXHJcbiAgICBjb25zdCBoZWlnaHQgPSB5MSAtIHkwICsgMVxyXG4gICAgY29uc3QgbHMgPSBhcnJheS51bmlmb3JtKHgwLCB3aWR0aClcclxuICAgIGNvbnN0IHJzID0gYXJyYXkudW5pZm9ybSh4MCArIHdpZHRoLCB3aWR0aClcclxuICAgIGNvbnN0IGhzID0gYXJyYXkudW5pZm9ybSgwLCB3aWR0aClcclxuXHJcbiAgICBsZXQgbWF4QXJlYSA9IDBcclxuICAgIGNvbnN0IGJvdW5kcyA9IGdlby5SZWN0LmVtcHR5KClcclxuXHJcbiAgICBpbWFnaW5nLnNjYW5Sb3dzUmVnaW9uKHkwLCBoZWlnaHQsIHJvd1BpdGNoLCAoeSwgeU9mZnNldCkgPT4ge1xyXG4gICAgICAgIGxldCBsID0geDBcclxuICAgICAgICBsZXQgciA9IHgwICsgd2lkdGhcclxuXHJcbiAgICAgICAgLy8gaGVpZ2h0IHNjYW5cclxuICAgICAgICBmb3IgKGxldCB4ID0geDA7IHggPCB4MTsgKyt4KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGkgPSB4IC0geDBcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgaXNSZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldF0gPT09IHJlZ2lvblxyXG5cclxuICAgICAgICAgICAgaWYgKGlzUmVnaW9uKSB7XHJcbiAgICAgICAgICAgICAgICBoc1tpXSArPSAxXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBoc1tpXSA9IDBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbCBzY2FuXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IHgwOyB4IDwgeDE7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCBpID0geCAtIHgwXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGNvbnN0IGlzUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXRdID09PSByZWdpb25cclxuXHJcbiAgICAgICAgICAgIGlmIChpc1JlZ2lvbikge1xyXG4gICAgICAgICAgICAgICAgbHNbaV0gPSBNYXRoLm1heChsc1tpXSwgbClcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxzW2ldID0gMFxyXG4gICAgICAgICAgICAgICAgbCA9IHggKyAxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHIgc2NhblxyXG4gICAgICAgIGZvciAobGV0IHggPSB4MSAtIDE7IHggPj0geDA7IC0teCkge1xyXG4gICAgICAgICAgICBjb25zdCBpID0geCAtIHgwXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGNvbnN0IGlzUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXRdID09PSByZWdpb25cclxuXHJcbiAgICAgICAgICAgIGlmIChpc1JlZ2lvbikge1xyXG4gICAgICAgICAgICAgICAgcnNbaV0gPSBNYXRoLm1pbihyc1tpXSwgcilcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJzW2ldID0geDFcclxuICAgICAgICAgICAgICAgIHIgPSB4XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFyZWEgc2NhblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd2lkdGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBhcmVhID0gaHNbaV0gKiAocnNbaV0gLSBsc1tpXSlcclxuICAgICAgICAgICAgaWYgKGFyZWEgPiBtYXhBcmVhKSB7XHJcbiAgICAgICAgICAgICAgICBtYXhBcmVhID0gYXJlYVxyXG4gICAgICAgICAgICAgICAgYm91bmRzLm1pbi54ID0gbHNbaV1cclxuICAgICAgICAgICAgICAgIGJvdW5kcy5tYXgueCA9IHJzW2ldXHJcbiAgICAgICAgICAgICAgICBib3VuZHMubWluLnkgPSB5IC0gaHNbaV1cclxuICAgICAgICAgICAgICAgIGJvdW5kcy5tYXgueSA9IHlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pXHJcblxyXG4gICAgcmV0dXJuIGJvdW5kc1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHBsb3JlUmVnaW9uKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBwYWxldHRlT3ZlcmxheTogbnVtYmVyW10sIHgwOiBudW1iZXIsIHkwOiBudW1iZXIsIHJlZ2lvbk92ZXJsYXk6IFJlZ2lvbk92ZXJsYXkpIHtcclxuICAgIGNvbnN0IHN0YWNrOiBudW1iZXJbXSA9IFtdXHJcbiAgICBjb25zdCBvZmZzZXQwID0geTAgKiB3aWR0aCArIHgwXHJcbiAgICBjb25zdCByZWdpb24gPSByZWdpb25PdmVybGF5W29mZnNldDBdXHJcbiAgICBpZiAoIXJlZ2lvbikge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNvbG9yID0gcmVnaW9uLmNvbG9yXHJcblxyXG4gICAgc3RhY2sucHVzaCh4MClcclxuICAgIHN0YWNrLnB1c2goeTApXHJcblxyXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjb25zdCB5ID0gc3RhY2sucG9wKCkgYXMgbnVtYmVyXHJcbiAgICAgICAgY29uc3QgeCA9IHN0YWNrLnBvcCgpIGFzIG51bWJlclxyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHkgKiB3aWR0aCArIHhcclxuICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSByZWdpb25cclxuICAgICAgICByZWdpb24ucGl4ZWxzKytcclxuXHJcbiAgICAgICAgLy8gZXhwbG9yZSBuZWlnaGJvcnMgKGlmIHNhbWUgY29sb3IpXHJcbiAgICAgICAgY29uc3QgbCA9IHggLSAxXHJcbiAgICAgICAgY29uc3QgciA9IHggKyAxXHJcbiAgICAgICAgY29uc3QgdCA9IHkgLSAxXHJcbiAgICAgICAgY29uc3QgYiA9IHkgKyAxXHJcblxyXG4gICAgICAgIGlmIChsID49IDApIHtcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0MSA9IG9mZnNldCAtIDFcclxuICAgICAgICAgICAgY29uc3QgcmVnaW9uMSA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgY29uc3QgY29sb3IxID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgaWYgKCFyZWdpb24xICYmIGNvbG9yID09PSBjb2xvcjEpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2gobClcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHIgPCB3aWR0aCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQxID0gb2Zmc2V0ICsgMVxyXG4gICAgICAgICAgICBjb25zdCByZWdpb24xID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBjb25zdCBjb2xvcjEgPSBwYWxldHRlT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBpZiAoIXJlZ2lvbjEgJiYgY29sb3IgPT09IGNvbG9yMSkge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaChyKVxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh5KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodCA+PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldDEgPSBvZmZzZXQgLSB3aWR0aFxyXG4gICAgICAgICAgICBjb25zdCByZWdpb24xID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBjb25zdCBjb2xvcjEgPSBwYWxldHRlT3ZlcmxheVtvZmZzZXQxXVxyXG4gICAgICAgICAgICBpZiAoIXJlZ2lvbjEgJiYgY29sb3IgPT09IGNvbG9yMSkge1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh4KVxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh0KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYiA8IGhlaWdodCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQxID0gb2Zmc2V0ICsgd2lkdGhcclxuICAgICAgICAgICAgY29uc3QgcmVnaW9uMSA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgY29uc3QgY29sb3IxID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0MV1cclxuICAgICAgICAgICAgaWYgKCFyZWdpb24xICYmIGNvbG9yID09PSBjb2xvcjEpIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeClcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goYilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0JvcmRlcnMocmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSwgaW1nOiBpbWFnaW5nMi5JbWFnZSkge1xyXG4gICAgLy8gY29sb3IgYm9yZGVyc1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBpbWdcclxuICAgIGNvbnN0IGJsYWNrID0gbmV3IGdlby5WZWM0KDAsIDAsIDAsIDEpXHJcblxyXG4gICAgaW1nLnNjYW4oKHgsIHksIG9mZnNldCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XVxyXG4gICAgICAgIGlmICghcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbCA9IHggLSAxXHJcbiAgICAgICAgY29uc3QgciA9IHggKyAxXHJcbiAgICAgICAgY29uc3QgdCA9IHkgLSAxXHJcbiAgICAgICAgY29uc3QgYiA9IHkgKyAxXHJcblxyXG4gICAgICAgIC8vIGVkZ2UgY2VsbHMgYXJlIG5vdCBib3JkZXIgKGZvciBub3cpXHJcbiAgICAgICAgaWYgKGwgPCAwIHx8IHIgPj0gd2lkdGggfHwgdCA8IDAgfHwgYiA+PSBoZWlnaHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBsUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQgLSAxXVxyXG4gICAgICAgIGlmIChsUmVnaW9uICYmIGxSZWdpb24gIT09IHJlZ2lvbikge1xyXG4gICAgICAgICAgICBpbWcuYXRmKG9mZnNldCkuc2V0KGJsYWNrKVxyXG4gICAgICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCByUmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQgKyAxXVxyXG4gICAgICAgIGlmIChyUmVnaW9uICYmIHJSZWdpb24gIT09IHJlZ2lvbikge1xyXG4gICAgICAgICAgICBpbWcuYXRmKG9mZnNldCkuc2V0KGJsYWNrKVxyXG4gICAgICAgICAgICByZWdpb25PdmVybGF5W29mZnNldF0gPSBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB0UmVnaW9uID0gcmVnaW9uT3ZlcmxheVtvZmZzZXQgLSB3aWR0aF1cclxuICAgICAgICBpZiAodFJlZ2lvbiAmJiB0UmVnaW9uICE9PSByZWdpb24pIHtcclxuICAgICAgICAgICAgaW1nLmF0ZihvZmZzZXQpLnNldChibGFjaylcclxuICAgICAgICAgICAgcmVnaW9uT3ZlcmxheVtvZmZzZXRdID0gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgYlJlZ2lvbiA9IHJlZ2lvbk92ZXJsYXlbb2Zmc2V0ICsgd2lkdGhdXHJcbiAgICAgICAgaWYgKGJSZWdpb24gJiYgYlJlZ2lvbiAhPT0gcmVnaW9uKSB7XHJcbiAgICAgICAgICAgIGltZy5hdGYob2Zmc2V0KS5zZXQoYmxhY2spXHJcbiAgICAgICAgICAgIHJlZ2lvbk92ZXJsYXlbb2Zmc2V0XSA9IG51bGxcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBmaWxsSW50ZXJpb3IocmVnaW9uT3ZlcmxheTogUmVnaW9uT3ZlcmxheSwgaW1nOiBpbWFnaW5nMi5JbWFnZSkge1xyXG4gICAgY29uc3Qgd2hpdGUgPSBuZXcgZ2VvLlZlYzQoMSwgMSwgMSwgMSlcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlZ2lvbk92ZXJsYXkubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCByZWdpb24gPSByZWdpb25PdmVybGF5W2ldXHJcbiAgICAgICAgaWYgKCFyZWdpb24pIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGltZy5hdGYoaSkuc2V0KHdoaXRlKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3UmVnaW9uTGFiZWxzKGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEIHwgT2Zmc2NyZWVuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCByZWdpb25zOiBSZWdpb25bXSkge1xyXG4gICAgY3R4LmZvbnQgPSBcIjE2cHggYXJpYWwgYm9sZFwiXHJcbiAgICBjb25zdCB0ZXh0SGVpZ2h0ID0gY3R4Lm1lYXN1cmVUZXh0KFwiTVwiKS53aWR0aFxyXG4gICAgY29uc3QgZm9udCA9IGN0eC5mb250XHJcblxyXG4gICAgZm9yIChjb25zdCByZWdpb24gb2YgcmVnaW9ucykge1xyXG4gICAgICAgIGlmIChyZWdpb24uY29sb3IgPT09IC0xKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocmVnaW9uLmZpbGxlZCkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbGFiZWwgPSBgJHtyZWdpb24uY29sb3IgKyAxfWBcclxuICAgICAgICBjb25zdCBtZXRyaWNzID0gY3R4Lm1lYXN1cmVUZXh0KGxhYmVsKVxyXG4gICAgICAgIGNvbnN0IGNlbnRlciA9IHJlZ2lvbi5tYXhSZWN0LmNlbnRlclxyXG4gICAgICAgIGNvbnN0IHggPSBjZW50ZXIueCAtIG1ldHJpY3Mud2lkdGggLyAyXHJcbiAgICAgICAgY29uc3QgeSA9IGNlbnRlci55ICsgdGV4dEhlaWdodCAvIDJcclxuICAgICAgICBjdHguZmlsbFRleHQobGFiZWwsIHgsIHkpXHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmZvbnQgPSBmb250XHJcbn1cclxuXHJcbm5ldyBDQk4oKSJdfQ==