import * as array from "../shared/array.js";
import * as dom from "../shared/dom.js";
import * as geo from "../shared/geo3d.js";
import * as math from "../shared/math.js";
import * as util from "../shared/util.js";
import * as iter from "../shared/iter.js";
import * as rand from "../shared/rand.js";
// size that each image pixel is blown up to
const cellSize = 24;
// max height / width of image
const maxDim = 128;
// tolerance before splitting colors - higher = less colors
const colorRangeTolerance = 64;
// max bg pixels before removal
const maxBackgroundPixels = 1024;
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
        this.libraryButton = dom.byId("libraryButton");
        this.errorsDiv = dom.byId("errors");
        this.imageLoaded = new Channel();
        this.libraryUi = new LibraryUi();
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
        this.libraryButton.addEventListener("click", () => this.showLibrary());
        this.libraryUi.cancel.subcribe(() => {
            this.loadUiDiv.hidden = false;
        });
    }
    show() {
        this.loadUiDiv.hidden = false;
        // this.loadFromUrl("/cbn/assets/larryKoopa.jpg")
        // this.loadFromUrl("/cbn/assets/olts_flower.jpg")
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
    showLibrary() {
        this.loadUiDiv.hidden = true;
        this.libraryUi.show();
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
class LibraryUi {
    constructor() {
        this.libraryDiv = dom.byId("libraryUi");
        this.returnButton = dom.byId("returnFromLibraryButton");
        this.imageChosen = new Channel();
        this.cancel = new Channel();
        this.returnButton.addEventListener("click", () => this.onReturnClick());
    }
    show() {
        this.libraryDiv.hidden = false;
    }
    onReturnClick() {
        this.libraryDiv.hidden = true;
        this.cancel.publish();
    }
}
class PlayUi {
    constructor() {
        this.canvas = dom.byId("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.paletteDiv = dom.byId("palette");
        this.paletteEntryTemplate = dom.byId("paletteEntry");
        this.playUiDiv = dom.byId("playUi");
        this.returnButton = dom.byId("returnButton");
        this.imageCanvas = new OffscreenCanvas(0, 0);
        this.imageCtx = this.imageCanvas.getContext("2d");
        this.cellCanvas = new OffscreenCanvas(0, 0);
        this.cellCtx = this.cellCanvas.getContext("2d");
        this.paletteCanvas = new OffscreenCanvas(0, 0);
        this.paletteCtx = this.paletteCanvas.getContext("2d");
        this.colorCanvas = new OffscreenCanvas(0, 0);
        this.colorCtx = this.colorCanvas.getContext("2d");
        this.complete = false;
        this.return = new Channel();
        this.imageWidth = 0;
        this.imageHeight = 0;
        this.centerX = 0;
        this.centerY = 0;
        this.zoom = 1;
        this.drag = false;
        this.dragged = false;
        this.dragLast = new geo.Vec2(0, 0);
        // list of colors use used in image
        this.palette = [];
        // image overlay of pixel to palette index
        this.paletteOverlay = [];
        // palette overlay of palette index to list of pixels having that color
        this.pixelOverlay = [];
        this.selectedPaletteIndex = -1;
        this.sequence = [];
        if (!this.ctx) {
            throw new Error("Canvas element not supported");
        }
        if (!this.cellCtx) {
            throw new Error("OffscreenCanvas not supported");
        }
        this.canvas.addEventListener("click", e => this.onCanvasClick(e));
        this.canvas.addEventListener("mousedown", e => this.onCanvasMouseDown(e));
        this.canvas.addEventListener("mousemove", e => this.onCanvasMouseMove(e));
        document.addEventListener("mouseup", e => this.onCanvasMouseUp(e));
        this.canvas.addEventListener("wheel", e => this.onCanvasMouseWheel(e));
        dom.delegate(this.playUiDiv, "click", ".palette-entry", (e) => this.onPaletteEntryClick(e));
        this.returnButton.addEventListener("click", () => this.onReturn());
    }
    show(img) {
        this.playUiDiv.hidden = false;
        this.complete = false;
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        // fit image
        {
            const [w, h] = fit(img.width, img.height, maxDim);
            this.imageWidth = w;
            this.imageHeight = h;
        }
        // // debug
        // this.canvas.width = this.imageWidth
        // this.canvas.height = this.imageHeight
        // this.ctx.drawImage(img.source, 0, 0, this.canvas.width, this.canvas.height)
        // quantMedianCut(this.ctx, 64)
        // return
        // initialize all drawing layers
        this.imageCanvas.width = this.imageWidth;
        this.imageCanvas.height = this.imageHeight;
        this.imageCtx.drawImage(img.source, 0, 0, this.imageCanvas.width, this.imageCanvas.height);
        quantMedianCut(this.imageCtx, 64);
        const imgData = this.imageCtx.getImageData(0, 0, this.imageWidth, this.imageHeight);
        this.palette = extractPalette(imgData);
        this.paletteOverlay = createPaletteOverlay(imgData, this.palette);
        this.pixelOverlay = createPixelOverlay(this.imageWidth, this.imageHeight, this.palette, this.paletteOverlay);
        this.palette = prunePallete(this.palette, this.pixelOverlay, maxBackgroundPixels, this.imageWidth, this.imageHeight, this.colorCtx);
        this.paletteOverlay = createPaletteOverlay(imgData, this.palette);
        this.pixelOverlay = createPixelOverlay(this.imageWidth, this.imageHeight, this.palette, this.paletteOverlay);
        this.createPaletteUi();
        drawCellImage(this.cellCtx, this.imageWidth, this.imageHeight, this.paletteOverlay);
        this.paletteCanvas.width = this.cellCanvas.width;
        this.paletteCanvas.height = this.cellCanvas.height;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.redraw();
        if (this.palette) {
            this.selectPaletteEntry(0);
        }
        this.sequence = [];
        // debug - go straight to end state
        for (let y = 0; y < this.imageHeight; ++y) {
            for (let x = 0; x < this.imageWidth; ++x) {
                this.sequence.push(flat(x, y, this.imageWidth));
            }
        }
        rand.shuffle(this.sequence);
        this.execDoneSequence();
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
            const [r, g, b] = unpackColor(this.palette[i]);
            const lum = calcLuminance(r, g, b);
            const fragment = this.paletteEntryTemplate.content.cloneNode(true);
            const entryDiv = dom.bySelector(fragment, ".palette-entry");
            entryDiv.textContent = `${i + 1}`;
            entryDiv.style.backgroundColor = color2RGBAStyle(r, g, b);
            entryDiv.style.color = lum < .5 ? "white" : "black";
            this.paletteDiv.appendChild(fragment);
        }
    }
    onCanvasClick(evt) {
        if (this.complete) {
            return;
        }
        // don't count drag as click
        if (this.dragged) {
            this.dragged = false;
            return;
        }
        // transform click coordinates to canvas coordinates
        const invTransform = this.ctx.getTransform().inverse();
        const domPt = invTransform.transformPoint({ x: evt.offsetX, y: evt.offsetY });
        const [x, y] = cell2Image(domPt.x, domPt.y);
        // if not correct palette color, do nothing
        const paletteIdx = this.paletteOverlay[flat(x, y, this.imageWidth)];
        if (paletteIdx !== this.selectedPaletteIndex) {
            return;
        }
        // if already filled, do nothing
        const flatXY = flat(x, y, this.imageWidth);
        const pixels = this.pixelOverlay[paletteIdx];
        if (!pixels.has(flatXY)) {
            return;
        }
        const [r, g, b] = unpackColor(this.palette[paletteIdx]);
        const [cx, cy] = image2Cell(x, y);
        this.colorCtx.fillStyle = color2RGBAStyle(r, g, b);
        this.colorCtx.fillRect(cx, cy, cellSize, cellSize);
        // remove the pixel from overlay
        pixels.delete(flatXY);
        this.sequence.push(flatXY);
        if (pixels.size > 0) {
            this.redraw();
            return;
        }
        // mark palette entry as done
        const entry = document.querySelectorAll(".palette-entry")[paletteIdx];
        entry.innerHTML = "&check;";
        const nextPaletteIdx = this.findNextUnfinishedEntry(paletteIdx);
        this.selectPaletteEntry(nextPaletteIdx);
        if (nextPaletteIdx !== -1) {
            return;
        }
        // all colors complete! show animation of user coloring original image
        this.execDoneSequence();
    }
    onCanvasMouseDown(e) {
        if (this.complete) {
            return;
        }
        this.drag = true;
        this.dragLast = new geo.Vec2(e.offsetX, e.offsetY);
    }
    onCanvasMouseUp(_) {
        if (this.complete) {
            return;
        }
        this.drag = false;
    }
    onCanvasMouseMove(e) {
        if (this.complete) {
            return;
        }
        if (!this.drag) {
            return;
        }
        const transform = this.ctx.getTransform().inverse();
        const start = geo.Vec2.fromDOM(transform.transformPoint(this.dragLast));
        const position = new geo.Vec2(e.offsetX, e.offsetY);
        const end = geo.Vec2.fromDOM(transform.transformPoint(position));
        const delta = end.sub(start);
        if (Math.abs(delta.x) > 3 || Math.abs(delta.y) > 3) {
            this.centerX -= delta.x;
            this.centerY -= delta.y;
            this.dragLast = position;
            this.dragged = true;
            this.redraw();
        }
    }
    onCanvasMouseWheel(e) {
        if (this.complete) {
            return;
        }
        if (e.deltaY > 0) {
            this.zoom *= .5;
        }
        if (e.deltaY < 0) {
            this.zoom *= 2;
        }
        this.redraw();
    }
    onPaletteEntryClick(e) {
        if (this.complete) {
            return;
        }
        const entry = e.target;
        let idx = dom.getElementIndex(entry);
        if (idx === this.selectedPaletteIndex) {
            idx = -1;
        }
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
        // clear palette canvas
        const ctx = this.paletteCtx;
        const canvas = this.paletteCanvas;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (idx == -1) {
            this.redraw();
            return;
        }
        // highlight remaining pixels for this color
        const font = ctx.font;
        ctx.font = "bold 16px arial";
        const textHeight = ctx.measureText("M").width;
        const cdxy = cellSize / 2;
        for (const pixel of this.pixelOverlay[idx]) {
            const [x, y] = image2Cell(...unflat(pixel, this.imageWidth));
            ctx.fillStyle = color2RGBAStyle(191, 191, 191, 255);
            ctx.fillRect(x, y, cellSize, cellSize);
            // draw label
            const label = `${idx + 1}`;
            const metrics = ctx.measureText(label);
            const cx = x + cdxy - metrics.width / 2;
            const cy = y + cdxy + textHeight / 2;
            ctx.fillStyle = "black";
            ctx.fillText(label, cx, cy);
        }
        ctx.font = font;
        this.redraw();
    }
    redraw() {
        // note - clear is subject to transform
        const ctx = this.ctx;
        this.ctx.resetTransform();
        const hw = this.canvas.width / 2 / this.zoom;
        const hh = this.canvas.height / 2 / this.zoom;
        this.centerX = math.clamp(this.centerX, 0, this.cellCanvas.width);
        this.centerY = math.clamp(this.centerY, 0, this.cellCanvas.height);
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(-this.centerX + hw, -this.centerY + hh);
        var invTransform = ctx.getTransform().inverse();
        const tl = invTransform.transformPoint({ x: 0, y: 0 });
        const br = invTransform.transformPoint({ x: this.canvas.width, y: this.canvas.height });
        ctx.clearRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
        ctx.drawImage(this.cellCanvas, 0, 0);
        ctx.drawImage(this.paletteCanvas, 0, 0);
        ctx.drawImage(this.colorCanvas, 0, 0);
    }
    findNextUnfinishedEntry(i) {
        for (i = 0; i < this.palette.length; ++i) {
            const ii = i % this.palette.length;
            if (this.pixelOverlay[i].size > 0) {
                return ii;
            }
        }
        return -1;
    }
    async execDoneSequence() {
        // set as done
        this.complete = true;
        this.ctx.resetTransform();
        // draw one pixel at a time to color canvas
        // ovrlay onto canvas
        const data = this.imageCtx.getImageData(0, 0, this.imageWidth, this.imageHeight).data;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const zoom = Math.min(this.canvas.clientWidth / this.imageWidth, this.canvas.clientHeight / this.imageHeight);
        this.ctx.scale(zoom, zoom);
        // color as user did
        const pixel = new ImageData(1, 1);
        const pixelData = pixel.data;
        this.colorCtx.canvas.width = this.imageWidth;
        this.colorCtx.canvas.height = this.imageHeight;
        this.colorCtx.clearRect(0, 0, this.colorCanvas.width, this.colorCanvas.height);
        for (let i = 0; i < this.sequence.length; ++i) {
            const xy = this.sequence[i];
            const [x, y] = unflat(xy, this.imageWidth);
            const offset = xy * 4;
            pixelData[0] = data[offset];
            pixelData[1] = data[offset + 1];
            pixelData[2] = data[offset + 2];
            pixelData[3] = 255;
            this.colorCtx.putImageData(pixel, x, y);
            this.ctx.drawImage(this.colorCanvas, 0, 0);
            if (i % 64 == 0) {
                await util.wait(0);
            }
        }
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
function extractPalette(imgData) {
    const { width, height, data } = imgData;
    const rowPitch = width * 4;
    // find unique colors, create entry for each
    const palette = new Set();
    for (let y = 0; y < height; ++y) {
        const yOffset = y * rowPitch;
        for (let x = 0; x < width; ++x) {
            // pack color to a unique value
            const offset = yOffset + x * 4;
            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];
            const a = data[offset + 3];
            const value = packColor(r, g, b, a);
            palette.add(value);
        }
    }
    return [...palette];
}
/**
 * create an overlay that maps each pixel to the index of its palette entry
 * @param imgData image data
 * @param palette palette colors
 */
function createPaletteOverlay(imgData, palette) {
    var _a;
    const { width, height, data } = imgData;
    const paletteMap = array.mapIndices(palette);
    const rowPitch = width * 4;
    const overlay = array.uniform(-1, width * height);
    for (let y = 0; y < height; ++y) {
        const yOffset = y * rowPitch;
        for (let x = 0; x < width; ++x) {
            // pack color to a unique value
            const offset = yOffset + x * 4;
            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];
            const a = data[offset + 3];
            const rgba = packColor(r, g, b, a);
            const idx = (_a = paletteMap.get(rgba)) !== null && _a !== void 0 ? _a : -1;
            overlay[y * width + x] = idx;
        }
    }
    return overlay;
}
/**
 * create an overlay that maps each palette entry to a list of pixels with its color
 * @param imgData
 * @param palette
 */
function createPixelOverlay(width, height, palette, paletteOverlay) {
    const overlay = array.generate(palette.length, () => new Set());
    for (let y = 0; y < height; ++y) {
        const yOffset = y * width;
        for (let x = 0; x < width; ++x) {
            // pack color to a unique value
            const offset = yOffset + x;
            const paletteIdx = paletteOverlay[offset];
            if (paletteIdx === -1) {
                continue;
            }
            const flatCoord = flat(x, y, width);
            overlay[paletteIdx].add(flatCoord);
        }
    }
    return overlay;
}
function packColor(r, g, b, a) {
    const value = r << 24 | g << 16 | b << 8 | a;
    return value;
}
function unpackColor(x) {
    const r = (x & 0xFF000000) >>> 24;
    const g = (x & 0x00FF0000) >>> 16;
    const b = (x & 0x0000FF00) >>> 8;
    const a = x & 0x000000FF;
    return [r, g, b, a];
}
function calcLuminance(r, g, b) {
    const l = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
    return l;
}
function drawCellImage(ctx, width, height, paletteOverlay) {
    const cellImageWidth = width * (cellSize + 1) + 1;
    const cellImageHeight = height * (cellSize + 1) + 1;
    // size canvas
    ctx.canvas.width = cellImageWidth;
    ctx.canvas.height = cellImageHeight;
    // draw horizontal grid lines
    for (let i = 0; i <= height; ++i) {
        ctx.strokeRect(0, i * (cellSize + 1), cellImageWidth, 1);
    }
    // draw vertical grid lines
    for (let i = 0; i <= width; ++i) {
        ctx.strokeRect(i * (cellSize + 1), 0, 1, cellImageHeight);
    }
    // draw #s
    const font = ctx.font;
    ctx.font = "16px arial";
    const textHeight = ctx.measureText("M").width;
    const cdxy = cellSize / 2;
    for (let y = 0; y < height; ++y) {
        const yOffset = y * width;
        for (let x = 0; x < width; ++x) {
            const offset = yOffset + x;
            const paletteIdx = paletteOverlay[offset];
            if (paletteIdx === -1) {
                // fill this part of the image in with solid color!
                continue;
            }
            const label = `${paletteIdx + 1}`;
            const metrics = ctx.measureText(label);
            const cx = x * (cellSize + 1) + cdxy + 1 - metrics.width / 2;
            const cy = y * (cellSize + 1) + cdxy + 1 + textHeight / 2;
            ctx.fillText(label, cx, cy);
        }
    }
    ctx.font = font;
}
function fit(width, height, maxSize) {
    if (width > height && width > maxSize) {
        height = maxDim * height / width;
        return [Math.floor(maxSize), Math.floor(height)];
    }
    if (height > width && height > maxSize) {
        width = maxDim * width / height;
        return [Math.floor(width), Math.floor(maxSize)];
    }
    return [Math.floor(width), Math.floor(height)];
}
function flat(x, y, rowPitch) {
    return y * rowPitch + x;
}
function unflat(i, rowPitch) {
    return [i % rowPitch, Math.floor(i / rowPitch)];
}
/**
   * Convert an image x or y coordinate to top or left of cbn cell containing that pixel
   * @param coord x or y coordinate
   */
function image2CellCoord(coord) {
    return coord * (cellSize + 1) + 1;
}
/**
 * Convert a cbn x or y coordinate to top or left of cbn cell containing that pixel
 * @param coord x or y coordinate
 */
function cell2ImageCoord(coord) {
    return Math.floor((coord - 1) / (cellSize + 1));
}
/**
   * Convert an image x or y coordinate to top or left of cbn cell containing that pixel
   * @param coord x or y coordinate
   */
function image2Cell(x, y) {
    return [image2CellCoord(x), image2CellCoord(y)];
}
/**
 * Convert a cbn x or y coordinate to top or left of cbn cell containing that pixel
 * @param coord x or y coordinate
 */
function cell2Image(x, y) {
    return [cell2ImageCoord(x), cell2ImageCoord(y)];
}
/**
 * convert rgba coordinates to a style string
 * @param r red
 * @param g green
 * @param b blue
 * @param a alpha
 */
function color2RGBAStyle(r, g, b, a = 255) {
    return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}
function quantMedianCut(ctx, maxColors) {
    // maxColors must be a power of 2 for this algorithm
    maxColors = math.nextPow2(maxColors);
    const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { width, height, data } = imgData;
    const rowPitch = width * 4;
    const buckets = new Array();
    buckets.push(createInitialBucket());
    while (true) {
        const bucket = chooseBucket(colorRangeTolerance, buckets);
        if (!bucket) {
            break;
        }
        buckets.push(splitBucket(bucket));
    }
    // calculate the average color for each bucket
    const colors = new Array();
    for (const bucket of buckets) {
        let r = 0;
        let g = 0;
        let b = 0;
        for (const pixel of bucket) {
            r += pixel.r;
            g += pixel.g;
            b += pixel.b;
        }
        r /= bucket.length;
        g /= bucket.length;
        b /= bucket.length;
        colors.push([Math.round(r), Math.round(g), Math.round(b)]);
    }
    // iterate through each bucket, replacing pixel color with bucket color for each pixel
    for (let i = 0; i < buckets.length; ++i) {
        const bucket = buckets[i];
        const [r, g, b] = colors[i];
        for (const pixel of bucket) {
            const offset = pixel.offset * 4;
            data[offset] = r;
            data[offset + 1] = g;
            data[offset + 2] = b;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    function createInitialBucket() {
        // create initial bucket
        const bucket = new Array();
        for (let y = 0; y < height; ++y) {
            const yOffset = y * rowPitch;
            for (let x = 0; x < width; ++x) {
                const offset = yOffset + x * 4;
                const r = data[offset];
                const g = data[offset + 1];
                const b = data[offset + 2];
                // pack into bucket
                const pixel = {
                    offset: flat(x, y, width),
                    r: r,
                    g: g,
                    b: b
                };
                bucket.push(pixel);
            }
        }
        return bucket;
    }
    function calcRange(pixels, selector) {
        let min = Infinity;
        let max = -Infinity;
        for (const pixel of pixels) {
            min = Math.min(selector(pixel), min);
            max = Math.max(selector(pixel), max);
        }
        return max - min;
    }
    function chooseBucket(tolerance, buckets) {
        let maxRange = -Infinity;
        let maxBucket = null;
        for (const bucket of buckets) {
            const rangeR = calcRange(bucket, p => p.r);
            const rangeG = calcRange(bucket, p => p.g);
            const rangeB = calcRange(bucket, p => p.b);
            let range = 0;
            if (rangeR > rangeG && rangeR > rangeB) {
                range = rangeR;
            }
            else if (rangeG > rangeR) {
                range = rangeG;
            }
            else {
                range = rangeB;
            }
            if (range > maxRange) {
                maxRange = range;
                maxBucket = bucket;
            }
        }
        return maxRange > tolerance ? maxBucket : null;
    }
    function splitBucket(bucket) {
        const rangeR = calcRange(bucket, p => p.r);
        const rangeG = calcRange(bucket, p => p.g);
        const rangeB = calcRange(bucket, p => p.b);
        if (rangeR > rangeG && rangeR > rangeB) {
            bucket.sort((a, b) => a.r - b.r);
        }
        else if (rangeG > rangeR) {
            bucket.sort((a, b) => a.g - b.g);
        }
        else {
            bucket.sort((a, b) => a.b - b.b);
        }
        const middle = Math.floor(bucket.length / 2);
        const newBucket = bucket.splice(middle);
        return newBucket;
    }
}
function prunePallete(palette, pixelOverlay, maxPixels, width, height, ctx) {
    const indicesToKeep = new Set(array.sequence(0, palette.length));
    ctx.canvas.width = width * (cellSize + 1) + 1;
    ctx.canvas.height = height * (cellSize + 1) + 1;
    for (let i = 0; i < pixelOverlay.length; ++i) {
        const pixels = pixelOverlay[i];
        if (pixels.size < maxPixels) {
            continue;
        }
        if (iter.all(pixels, x => !isBorderPixel(...unflat(x, width), width, height))) {
            continue;
        }
        // fill these pixels in image with appropriate color
        const [r, g, b] = unpackColor(palette[i]);
        for (const xy of pixels) {
            const [x, y] = unflat(xy, width);
            const [cx, cy] = image2Cell(x, y);
            ctx.fillStyle = color2RGBAStyle(r, g, b);
            ctx.fillRect(cx, cy, cellSize, cellSize);
        }
        indicesToKeep.delete(i);
    }
    const newPalette = [...indicesToKeep].map(x => palette[x]);
    return newPalette;
}
function isBorderPixel(x, y, width, height) {
    return x === 0 || y === 0 || x === width - 1 || y === height - 1;
}
new CBN();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQTtBQUN2QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFFekMsNENBQTRDO0FBQzVDLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQTtBQUVuQiw4QkFBOEI7QUFDOUIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFBO0FBRWxCLDJEQUEyRDtBQUMzRCxNQUFNLG1CQUFtQixHQUFHLEVBQUUsQ0FBQTtBQUU5QiwrQkFBK0I7QUFDL0IsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUE7QUFFaEMsSUFBSyxVQUlKO0FBSkQsV0FBSyxVQUFVO0lBQ1gsMkNBQUksQ0FBQTtJQUNKLDJDQUFJLENBQUE7SUFDSix5REFBVyxDQUFBO0FBQ2YsQ0FBQyxFQUpJLFVBQVUsS0FBVixVQUFVLFFBSWQ7QUFJRCxNQUFNLE9BQU87SUFBYjtRQUNxQixnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO0lBZTVELENBQUM7SUFiVSxRQUFRLENBQUMsVUFBMEI7UUFDdEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVNLFdBQVcsQ0FBQyxVQUEwQjtRQUN6QyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRU0sT0FBTyxDQUFDLENB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LElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUE7UUFFMUQsSUFBSSxZQUFZLEdBQUcsR0FBRyxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQy9DLE1BQU0sRUFBRSxHQUFHLFlBQVksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sRUFBRSxHQUFHLFlBQVksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUN2RixHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVPLHVCQUF1QixDQUFDLENBQVM7UUFDckMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtZQUN0QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUE7WUFDbEMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUU7Z0JBQy9CLE9BQU8sRUFBRSxDQUFBO2FBQ1o7U0FDSjtRQUVELE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDYixDQUFDO0lBRU8sS0FBSyxDQUFDLGdCQUFnQjtRQUMxQixjQUFjO1FBQ2QsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUE7UUFFcEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUV6QiwyQ0FBMkM7UUFDM0MscUJBQXFCO1FBQ3JCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFBO1FBQ3JGLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMvRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQzdHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUUxQixvQkFBb0I7UUFDcEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUE7UUFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUE7UUFDOUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTlFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtZQUMzQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNCLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDMUMsTUFBTSxNQUFNLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUNyQixTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzNCLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQy9CLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQy9CLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUE7WUFFbEIsSUFBSSxD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QUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1NBQzNDO1FBRUQsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUMxQjtJQUVELE1BQU0sVUFBVSxHQUFHLENBQUMsR0FBRyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMxRCxPQUFPLFVBQVUsQ0FBQTtBQUNyQixDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsQ0FBUyxFQUFFLENBQVMsRUFBRSxLQUFhLEVBQUUsTUFBYztJQUN0RSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssTUFBTSxHQUFHLENBQUMsQ0FBQTtBQUNwRSxDQUFDO0FBRUQsSUFBSSxHQUFHLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIlxyXG5pbXBvcnQgKiBhcyBkb20gZnJvbSBcIi4uL3NoYXJlZC9kb20uanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8zZC5qc1wiXHJcbmltcG9ydCAqIGFzIG1hdGggZnJvbSBcIi4uL3NoYXJlZC9tYXRoLmpzXCJcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tIFwiLi4vc2hhcmVkL3V0aWwuanNcIlxyXG5pbXBvcnQgKiBhcyBpdGVyIGZyb20gXCIuLi9zaGFyZWQvaXRlci5qc1wiXHJcbmltcG9ydCAqIGFzIHJhbmQgZnJvbSBcIi4uL3NoYXJlZC9yYW5kLmpzXCJcclxuXHJcbi8vIHNpemUgdGhhdCBlYWNoIGltYWdlIHBpeGVsIGlzIGJsb3duIHVwIHRvXHJcbmNvbnN0IGNlbGxTaXplID0gMjRcclxuXHJcbi8vIG1heCBoZWlnaHQgLyB3aWR0aCBvZiBpbWFnZVxyXG5jb25zdCBtYXhEaW0gPSAxMjhcclxuXHJcbi8vIHRvbGVyYW5jZSBiZWZvcmUgc3BsaXR0aW5nIGNvbG9ycyAtIGhpZ2hlciA9IGxlc3MgY29sb3JzXHJcbmNvbnN0IGNvbG9yUmFuZ2VUb2xlcmFuY2UgPSA2NFxyXG5cclxuLy8gbWF4IGJnIHBpeGVscyBiZWZvcmUgcmVtb3ZhbFxyXG5jb25zdCBtYXhCYWNrZ3JvdW5kUGl4ZWxzID0gMTAyNFxyXG5cclxuZW51bSBDYW1lcmFNb2RlIHtcclxuICAgIE5vbmUsXHJcbiAgICBVc2VyLFxyXG4gICAgRW52aXJvbm1lbnQsXHJcbn1cclxuXHJcbnR5cGUgQ29sb3IgPSBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXVxyXG5cclxuY2xhc3MgQ2hhbm5lbDxUPiB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN1YnNjcmliZXJzID0gbmV3IFNldDwoeDogVCkgPT4gdm9pZD4oKVxyXG5cclxuICAgIHB1YmxpYyBzdWJjcmliZShzdWJzY3JpYmVyOiAoeDogVCkgPT4gdm9pZCkge1xyXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlcnMuYWRkKHN1YnNjcmliZXIpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHVuc3Vic2NyaWJlKHN1YnNjcmliZXI6ICh4OiBUKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVycy5kZWxldGUoc3Vic2NyaWJlcilcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgcHVibGlzaCh4OiBUKTogdm9pZCB7XHJcbiAgICAgICAgZm9yIChjb25zdCBzdWJzY3JpYmVyIG9mIHRoaXMuc3Vic2NyaWJlcnMpIHtcclxuICAgICAgICAgICAgc3Vic2NyaWJlcih4KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIENCTkltYWdlU291cmNlIHtcclxuICAgIHdpZHRoOiBudW1iZXJcclxuICAgIGhlaWdodDogbnVtYmVyXHJcbiAgICBzb3VyY2U6IEhUTUxWaWRlb0VsZW1lbnQgfCBIVE1MSW1hZ2VFbGVtZW50XHJcbn1cclxuXHJcbmNsYXNzIExvYWRVaSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhbWVyYSA9IGRvbS5ieUlkKFwiY2FtZXJhXCIpIGFzIEhUTUxWaWRlb0VsZW1lbnRcclxuICAgIHByaXZhdGUgY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuTm9uZVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBhY3F1aXJlSW1hZ2VEaXYgPSBkb20uYnlJZChcImFjcXVpcmVJbWFnZVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYXB0dXJlSW1hZ2VCdXR0b24gPSBkb20uYnlJZChcImNhcHR1cmVJbWFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsb2FkVWlEaXYgPSBkb20uYnlJZChcImxvYWRVaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmaWxlRHJvcEJveCA9IGRvbS5ieUlkKFwiZmlsZURyb3BCb3hcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmlsZUlucHV0ID0gZG9tLmJ5SWQoXCJmaWxlSW5wdXRcIikgYXMgSFRNTElucHV0RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmaWxlQnV0dG9uID0gZG9tLmJ5SWQoXCJmaWxlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHVzZUNhbWVyYUJ1dHRvbiA9IGRvbS5ieUlkKFwidXNlQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZsaXBDYW1lcmFCdXR0b24gPSBkb20uYnlJZChcImZsaXBDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3RvcENhbWVyYUJ1dHRvbiA9IGRvbS5ieUlkKFwic3RvcENhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsaWJyYXJ5QnV0dG9uID0gZG9tLmJ5SWQoXCJsaWJyYXJ5QnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVycm9yc0RpdiA9IGRvbS5ieUlkKFwiZXJyb3JzXCIpO1xyXG4gICAgcHVibGljIHJlYWRvbmx5IGltYWdlTG9hZGVkID0gbmV3IENoYW5uZWw8Q0JOSW1hZ2VTb3VyY2U+KClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGlicmFyeVVpID0gbmV3IExpYnJhcnlVaSgpXHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5maWxlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuZmlsZUlucHV0LmNsaWNrKClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnZW50ZXJcIiwgKGUpID0+IHRoaXMub25EcmFnRW50ZXJPdmVyKGUpKVxyXG4gICAgICAgIHRoaXMuZmlsZURyb3BCb3guYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdvdmVyXCIsIChlKSA9PiB0aGlzLm9uRHJhZ0VudGVyT3ZlcihlKSlcclxuICAgICAgICB0aGlzLmZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcm9wXCIsIChlKSA9PiB0aGlzLm9uRmlsZURyb3AoZSkpXHJcbiAgICAgICAgdGhpcy5maWxlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB0aGlzLm9uRmlsZUNoYW5nZSgpKVxyXG4gICAgICAgIHRoaXMudXNlQ2FtZXJhQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnVzZUNhbWVyYSgpKVxyXG4gICAgICAgIHRoaXMuZmxpcENhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5mbGlwQ2FtZXJhKCkpXHJcbiAgICAgICAgdGhpcy5zdG9wQ2FtZXJhQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnN0b3BDYW1lcmEoKSlcclxuICAgICAgICB0aGlzLmNhcHR1cmVJbWFnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5jYXB0dXJlSW1hZ2UoKSlcclxuICAgICAgICB0aGlzLmNhbWVyYS5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkbWV0YWRhdGFcIiwgKCkgPT4gdGhpcy5vbkNhbWVyYUxvYWQoKSlcclxuICAgICAgICB0aGlzLmxpYnJhcnlCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuc2hvd0xpYnJhcnkoKSlcclxuXHJcbiAgICAgICAgdGhpcy5saWJyYXJ5VWkuY2FuY2VsLnN1YmNyaWJlKCgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5sb2FkVWlEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzaG93KCkge1xyXG4gICAgICAgIHRoaXMubG9hZFVpRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgLy8gdGhpcy5sb2FkRnJvbVVybChcIi9jYm4vYXNzZXRzL2xhcnJ5S29vcGEuanBnXCIpXHJcbiAgICAgICAgLy8gdGhpcy5sb2FkRnJvbVVybChcIi9jYm4vYXNzZXRzL29sdHNfZmxvd2VyLmpwZ1wiKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBoaWRlKCkge1xyXG4gICAgICAgIHRoaXMubG9hZFVpRGl2LmhpZGRlbiA9IHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uRHJhZ0VudGVyT3ZlcihldjogRHJhZ0V2ZW50KSB7XHJcbiAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkZpbGVDaGFuZ2UoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVJbnB1dC5maWxlcz8ubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZmlsZSA9IHRoaXMuZmlsZUlucHV0LmZpbGVzWzBdXHJcbiAgICAgICAgdGhpcy5wcm9jZXNzRmlsZShmaWxlKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25GaWxlRHJvcChldjogRHJhZ0V2ZW50KSB7XHJcbiAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpXHJcblxyXG4gICAgICAgIGlmICghZXY/LmRhdGFUcmFuc2Zlcj8uZmlsZXM/Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGZpbGUgPSBldi5kYXRhVHJhbnNmZXIuZmlsZXNbMF1cclxuICAgICAgICB0aGlzLnByb2Nlc3NGaWxlKGZpbGUpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyB1c2VDYW1lcmEoKSB7XHJcbiAgICAgICAgdGhpcy5hY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICBjb25zdCBkaWFsb2dXaWR0aCA9IHRoaXMuYWNxdWlyZUltYWdlRGl2LmNsaWVudFdpZHRoXHJcbiAgICAgICAgY29uc3QgZGlhbG9nSGVpZ2h0ID0gdGhpcy5hY3F1aXJlSW1hZ2VEaXYuY2xpZW50SGVpZ2h0XHJcbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xyXG4gICAgICAgICAgICB2aWRlbzogeyB3aWR0aDogeyBtYXg6IGRpYWxvZ1dpZHRoIH0sIGhlaWdodDogeyBtYXg6IGRpYWxvZ0hlaWdodCB9LCBmYWNpbmdNb2RlOiBcInVzZXJcIiB9LFxyXG4gICAgICAgICAgICBhdWRpbzogZmFsc2VcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLlVzZXJcclxuICAgICAgICB0aGlzLmNhbWVyYS5zcmNPYmplY3QgPSBzdHJlYW1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGZsaXBDYW1lcmEoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmNhbWVyYS5zcmNPYmplY3QpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzcmMgPSB0aGlzLmNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgICAgICBjb25zdCB0cmFja3MgPSBzcmMuZ2V0VHJhY2tzKClcclxuICAgICAgICBmb3IgKGNvbnN0IHRyYWNrIG9mIHRyYWNrcykge1xyXG4gICAgICAgICAgICB0cmFjay5zdG9wKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhTW9kZSA9IHRoaXMuY2FtZXJhTW9kZSA9PSBDYW1lcmFNb2RlLlVzZXIgPyBDYW1lcmFNb2RlLkVudmlyb25tZW50IDogQ2FtZXJhTW9kZS5Vc2VyXHJcbiAgICAgICAgY29uc3QgZmFjaW5nTW9kZSA9IHRoaXMuY2FtZXJhTW9kZSA9PSBDYW1lcmFNb2RlLlVzZXIgPyBcInVzZXJcIiA6IFwiZW52aXJvbm1lbnRcIlxyXG5cclxuICAgICAgICAvLyBnZXQgY3VycmVudCBmYWNpbmcgbW9kZVxyXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcclxuICAgICAgICAgICAgdmlkZW86IHsgd2lkdGg6IHRoaXMuY2FtZXJhLmNsaWVudFdpZHRoLCBoZWlnaHQ6IHRoaXMuY2FtZXJhLmNsaWVudEhlaWdodCwgZmFjaW5nTW9kZTogZmFjaW5nTW9kZSB9LFxyXG4gICAgICAgICAgICBhdWRpbzogZmFsc2VcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmNhbWVyYS5zcmNPYmplY3QgPSBzdHJlYW1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uQ2FtZXJhTG9hZCgpIHtcclxuICAgICAgICB0aGlzLmFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuY2FtZXJhLnBsYXkoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc3RvcENhbWVyYSgpIHtcclxuICAgICAgICBjb25zdCBzcmMgPSB0aGlzLmNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgICAgICBpZiAoIXNyYykge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRyYWNrcyA9IHNyYy5nZXRUcmFja3MoKVxyXG4gICAgICAgIGZvciAoY29uc3QgdHJhY2sgb2YgdHJhY2tzKSB7XHJcbiAgICAgICAgICAgIHRyYWNrLnN0b3AoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Ob25lXHJcbiAgICAgICAgdGhpcy5hY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FwdHVyZUltYWdlKCkge1xyXG4gICAgICAgIHRoaXMuY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuXHJcbiAgICAgICAgY29uc3Qgc3JjID0gdGhpcy5jYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICAgICAgaWYgKCFzcmMpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB0cmFjayA9IHNyYy5nZXRWaWRlb1RyYWNrcygpWzBdXHJcbiAgICAgICAgaWYgKCF0cmFjaykge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuaW1hZ2VMb2FkZWQucHVibGlzaCh7IHdpZHRoOiB0aGlzLmNhbWVyYS52aWRlb1dpZHRoLCBoZWlnaHQ6IHRoaXMuY2FtZXJhLnZpZGVvSGVpZ2h0LCBzb3VyY2U6IHRoaXMuY2FtZXJhIH0pXHJcbiAgICAgICAgdGhpcy5zdG9wQ2FtZXJhKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNob3dMaWJyYXJ5KCkge1xyXG4gICAgICAgIHRoaXMubG9hZFVpRGl2LmhpZGRlbiA9IHRydWVcclxuICAgICAgICB0aGlzLmxpYnJhcnlVaS5zaG93KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHByb2Nlc3NGaWxlKGZpbGU6IEZpbGUpIHtcclxuICAgICAgICB0aGlzLmNsZWFyRXJyb3JNZXNzYWdlcygpXHJcbiAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKVxyXG4gICAgICAgIHRoaXMubG9hZEZyb21VcmwodXJsKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgbG9hZEZyb21VcmwodXJsOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLmNsZWFyRXJyb3JNZXNzYWdlcygpXHJcbiAgICAgICAgY29uc3QgaW1nID0gYXdhaXQgZG9tLmxvYWRJbWFnZSh1cmwpXHJcbiAgICAgICAgdGhpcy5pbWFnZUxvYWRlZC5wdWJsaXNoKHsgd2lkdGg6IGltZy53aWR0aCwgaGVpZ2h0OiBpbWcuaGVpZ2h0LCBzb3VyY2U6IGltZyB9KVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2xlYXJFcnJvck1lc3NhZ2VzKCkge1xyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0aGlzLmVycm9yc0RpdilcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgTGlicmFyeVVpIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGlicmFyeURpdiA9IGRvbS5ieUlkKFwibGlicmFyeVVpXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJldHVybkJ1dHRvbiA9IGRvbS5ieUlkKFwicmV0dXJuRnJvbUxpYnJhcnlCdXR0b25cIilcclxuICAgIHB1YmxpYyByZWFkb25seSBpbWFnZUNob3NlbiA9IG5ldyBDaGFubmVsPHN0cmluZz4oKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IGNhbmNlbCA9IG5ldyBDaGFubmVsPHZvaWQ+KCk7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5yZXR1cm5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMub25SZXR1cm5DbGljaygpKVxyXG4gICAgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5saWJyYXJ5RGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJldHVybkNsaWNrKCkge1xyXG4gICAgICAgIHRoaXMubGlicmFyeURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgdGhpcy5jYW5jZWwucHVibGlzaCgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFBsYXlVaSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFsZXR0ZURpdiA9IGRvbS5ieUlkKFwicGFsZXR0ZVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWxldHRlRW50cnlUZW1wbGF0ZSA9IGRvbS5ieUlkKFwicGFsZXR0ZUVudHJ5XCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGxheVVpRGl2ID0gZG9tLmJ5SWQoXCJwbGF5VWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmV0dXJuQnV0dG9uID0gZG9tLmJ5SWQoXCJyZXR1cm5CdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VDYW52YXMgPSBuZXcgT2Zmc2NyZWVuQ2FudmFzKDAsIDApXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlQ3R4ID0gdGhpcy5pbWFnZUNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNlbGxDYW52YXMgPSBuZXcgT2Zmc2NyZWVuQ2FudmFzKDAsIDApXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNlbGxDdHggPSB0aGlzLmNlbGxDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWxldHRlQ2FudmFzID0gbmV3IE9mZnNjcmVlbkNhbnZhcygwLCAwKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWxldHRlQ3R4ID0gdGhpcy5wYWxldHRlQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29sb3JDYW52YXMgPSBuZXcgT2Zmc2NyZWVuQ2FudmFzKDAsIDApXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbG9yQ3R4ID0gdGhpcy5jb2xvckNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIGNvbXBsZXRlID0gZmFsc2VcclxuICAgIHB1YmxpYyByZWFkb25seSByZXR1cm4gPSBuZXcgQ2hhbm5lbDx2b2lkPigpXHJcbiAgICBwcml2YXRlIGltYWdlV2lkdGggPSAwXHJcbiAgICBwcml2YXRlIGltYWdlSGVpZ2h0ID0gMFxyXG4gICAgcHJpdmF0ZSBjZW50ZXJYID0gMFxyXG4gICAgcHJpdmF0ZSBjZW50ZXJZID0gMFxyXG4gICAgcHJpdmF0ZSB6b29tID0gMVxyXG4gICAgcHJpdmF0ZSBkcmFnID0gZmFsc2VcclxuICAgIHByaXZhdGUgZHJhZ2dlZCA9IGZhbHNlXHJcbiAgICBwcml2YXRlIGRyYWdMYXN0ID0gbmV3IGdlby5WZWMyKDAsIDApXHJcblxyXG4gICAgLy8gbGlzdCBvZiBjb2xvcnMgdXNlIHVzZWQgaW4gaW1hZ2VcclxuICAgIHByaXZhdGUgcGFsZXR0ZTogbnVtYmVyW10gPSBbXVxyXG5cclxuICAgIC8vIGltYWdlIG92ZXJsYXkgb2YgcGl4ZWwgdG8gcGFsZXR0ZSBpbmRleFxyXG4gICAgcHJpdmF0ZSBwYWxldHRlT3ZlcmxheTogbnVtYmVyW10gPSBbXVxyXG5cclxuICAgIC8vIHBhbGV0dGUgb3ZlcmxheSBvZiBwYWxldHRlIGluZGV4IHRvIGxpc3Qgb2YgcGl4ZWxzIGhhdmluZyB0aGF0IGNvbG9yXHJcbiAgICBwcml2YXRlIHBpeGVsT3ZlcmxheTogU2V0PG51bWJlcj5bXSA9IFtdXHJcblxyXG4gICAgcHJpdmF0ZSBzZWxlY3RlZFBhbGV0dGVJbmRleDogbnVtYmVyID0gLTFcclxuICAgIHByaXZhdGUgc2VxdWVuY2U6IG51bWJlcltdID0gW11cclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY3R4KSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbnZhcyBlbGVtZW50IG5vdCBzdXBwb3J0ZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5jZWxsQ3R4KSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk9mZnNjcmVlbkNhbnZhcyBub3Qgc3VwcG9ydGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZSA9PiB0aGlzLm9uQ2FudmFzQ2xpY2soZSkpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBlID0+IHRoaXMub25DYW52YXNNb3VzZURvd24oZSkpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBlID0+IHRoaXMub25DYW52YXNNb3VzZU1vdmUoZSkpXHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgZSA9PiB0aGlzLm9uQ2FudmFzTW91c2VVcChlKSlcclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwid2hlZWxcIiwgZSA9PiB0aGlzLm9uQ2FudmFzTW91c2VXaGVlbChlKSlcclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5wbGF5VWlEaXYsIFwiY2xpY2tcIiwgXCIucGFsZXR0ZS1lbnRyeVwiLCAoZSkgPT4gdGhpcy5vblBhbGV0dGVFbnRyeUNsaWNrKGUgYXMgTW91c2VFdmVudCkpXHJcbiAgICAgICAgdGhpcy5yZXR1cm5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMub25SZXR1cm4oKSlcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2hvdyhpbWc6IENCTkltYWdlU291cmNlKSB7XHJcbiAgICAgICAgdGhpcy5wbGF5VWlEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmNvbXBsZXRlID0gZmFsc2VcclxuXHJcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLmNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuY2FudmFzLmNsaWVudEhlaWdodFxyXG5cclxuICAgICAgICAvLyBmaXQgaW1hZ2VcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IFt3LCBoXSA9IGZpdChpbWcud2lkdGgsIGltZy5oZWlnaHQsIG1heERpbSlcclxuICAgICAgICAgICAgdGhpcy5pbWFnZVdpZHRoID0gd1xyXG4gICAgICAgICAgICB0aGlzLmltYWdlSGVpZ2h0ID0gaFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gLy8gZGVidWdcclxuICAgICAgICAvLyB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuaW1hZ2VXaWR0aFxyXG4gICAgICAgIC8vIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2VIZWlnaHRcclxuICAgICAgICAvLyB0aGlzLmN0eC5kcmF3SW1hZ2UoaW1nLnNvdXJjZSwgMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodClcclxuICAgICAgICAvLyBxdWFudE1lZGlhbkN1dCh0aGlzLmN0eCwgNjQpXHJcblxyXG4gICAgICAgIC8vIHJldHVyblxyXG5cclxuICAgICAgICAvLyBpbml0aWFsaXplIGFsbCBkcmF3aW5nIGxheWVyc1xyXG4gICAgICAgIHRoaXMuaW1hZ2VDYW52YXMud2lkdGggPSB0aGlzLmltYWdlV2lkdGhcclxuICAgICAgICB0aGlzLmltYWdlQ2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2VIZWlnaHRcclxuICAgICAgICB0aGlzLmltYWdlQ3R4LmRyYXdJbWFnZShpbWcuc291cmNlLCAwLCAwLCB0aGlzLmltYWdlQ2FudmFzLndpZHRoLCB0aGlzLmltYWdlQ2FudmFzLmhlaWdodClcclxuICAgICAgICBxdWFudE1lZGlhbkN1dCh0aGlzLmltYWdlQ3R4LCA2NClcclxuXHJcbiAgICAgICAgY29uc3QgaW1nRGF0YSA9IHRoaXMuaW1hZ2VDdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodClcclxuICAgICAgICB0aGlzLnBhbGV0dGUgPSBleHRyYWN0UGFsZXR0ZShpbWdEYXRhKVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZU92ZXJsYXkgPSBjcmVhdGVQYWxldHRlT3ZlcmxheShpbWdEYXRhLCB0aGlzLnBhbGV0dGUpXHJcbiAgICAgICAgdGhpcy5waXhlbE92ZXJsYXkgPSBjcmVhdGVQaXhlbE92ZXJsYXkodGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0LCB0aGlzLnBhbGV0dGUsIHRoaXMucGFsZXR0ZU92ZXJsYXkpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlID0gcHJ1bmVQYWxsZXRlKHRoaXMucGFsZXR0ZSwgdGhpcy5waXhlbE92ZXJsYXksIG1heEJhY2tncm91bmRQaXhlbHMsIHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCwgdGhpcy5jb2xvckN0eClcclxuICAgICAgICB0aGlzLnBhbGV0dGVPdmVybGF5ID0gY3JlYXRlUGFsZXR0ZU92ZXJsYXkoaW1nRGF0YSwgdGhpcy5wYWxldHRlKVxyXG4gICAgICAgIHRoaXMucGl4ZWxPdmVybGF5ID0gY3JlYXRlUGl4ZWxPdmVybGF5KHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCwgdGhpcy5wYWxldHRlLCB0aGlzLnBhbGV0dGVPdmVybGF5KVxyXG4gICAgICAgIHRoaXMuY3JlYXRlUGFsZXR0ZVVpKClcclxuICAgICAgICBkcmF3Q2VsbEltYWdlKHRoaXMuY2VsbEN0eCwgdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0LCB0aGlzLnBhbGV0dGVPdmVybGF5KVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZUNhbnZhcy53aWR0aCA9IHRoaXMuY2VsbENhbnZhcy53aWR0aFxyXG4gICAgICAgIHRoaXMucGFsZXR0ZUNhbnZhcy5oZWlnaHQgPSB0aGlzLmNlbGxDYW52YXMuaGVpZ2h0XHJcbiAgICAgICAgdGhpcy5jZW50ZXJYID0gdGhpcy5jYW52YXMud2lkdGggLyAyXHJcbiAgICAgICAgdGhpcy5jZW50ZXJZID0gdGhpcy5jYW52YXMuaGVpZ2h0IC8gMlxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuXHJcbiAgICAgICAgaWYgKHRoaXMucGFsZXR0ZSkge1xyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeSgwKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZXF1ZW5jZSA9IFtdXHJcblxyXG4gICAgICAgIC8vIGRlYnVnIC0gZ28gc3RyYWlnaHQgdG8gZW5kIHN0YXRlXHJcbiAgICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmltYWdlSGVpZ2h0OyArK3kpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLmltYWdlV2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXF1ZW5jZS5wdXNoKGZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmFuZC5zaHVmZmxlKHRoaXMuc2VxdWVuY2UpXHJcbiAgICAgICAgdGhpcy5leGVjRG9uZVNlcXVlbmNlKClcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgaGlkZSgpIHtcclxuICAgICAgICB0aGlzLnBsYXlVaURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJldHVybigpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnJldHVybi5wdWJsaXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNyZWF0ZVBhbGV0dGVVaSgpIHtcclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGhpcy5wYWxldHRlRGl2KVxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5wYWxldHRlLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFtyLCBnLCBiXSA9IHVucGFja0NvbG9yKHRoaXMucGFsZXR0ZVtpXSlcclxuICAgICAgICAgICAgY29uc3QgbHVtID0gY2FsY0x1bWluYW5jZShyLCBnLCBiKVxyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMucGFsZXR0ZUVudHJ5VGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCBlbnRyeURpdiA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5wYWxldHRlLWVudHJ5XCIpIGFzIEhUTUxFbGVtZW50XHJcbiAgICAgICAgICAgIGVudHJ5RGl2LnRleHRDb250ZW50ID0gYCR7aSArIDF9YFxyXG4gICAgICAgICAgICBlbnRyeURpdi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb2xvcjJSR0JBU3R5bGUociwgZywgYilcclxuICAgICAgICAgICAgZW50cnlEaXYuc3R5bGUuY29sb3IgPSBsdW0gPCAuNSA/IFwid2hpdGVcIiA6IFwiYmxhY2tcIlxyXG4gICAgICAgICAgICB0aGlzLnBhbGV0dGVEaXYuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25DYW52YXNDbGljayhldnQ6IE1vdXNlRXZlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGRvbid0IGNvdW50IGRyYWcgYXMgY2xpY2tcclxuICAgICAgICBpZiAodGhpcy5kcmFnZ2VkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhZ2dlZCA9IGZhbHNlXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdHJhbnNmb3JtIGNsaWNrIGNvb3JkaW5hdGVzIHRvIGNhbnZhcyBjb29yZGluYXRlc1xyXG4gICAgICAgIGNvbnN0IGludlRyYW5zZm9ybSA9IHRoaXMuY3R4LmdldFRyYW5zZm9ybSgpLmludmVyc2UoKVxyXG4gICAgICAgIGNvbnN0IGRvbVB0ID0gaW52VHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHsgeDogZXZ0Lm9mZnNldFgsIHk6IGV2dC5vZmZzZXRZIH0pXHJcbiAgICAgICAgY29uc3QgW3gsIHldID0gY2VsbDJJbWFnZShkb21QdC54LCBkb21QdC55KVxyXG5cclxuICAgICAgICAvLyBpZiBub3QgY29ycmVjdCBwYWxldHRlIGNvbG9yLCBkbyBub3RoaW5nXHJcbiAgICAgICAgY29uc3QgcGFsZXR0ZUlkeCA9IHRoaXMucGFsZXR0ZU92ZXJsYXlbZmxhdCh4LCB5LCB0aGlzLmltYWdlV2lkdGgpXVxyXG4gICAgICAgIGlmIChwYWxldHRlSWR4ICE9PSB0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaWYgYWxyZWFkeSBmaWxsZWQsIGRvIG5vdGhpbmdcclxuICAgICAgICBjb25zdCBmbGF0WFkgPSBmbGF0KHgsIHksIHRoaXMuaW1hZ2VXaWR0aClcclxuICAgICAgICBjb25zdCBwaXhlbHMgPSB0aGlzLnBpeGVsT3ZlcmxheVtwYWxldHRlSWR4XVxyXG4gICAgICAgIGlmICghcGl4ZWxzLmhhcyhmbGF0WFkpKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgW3IsIGcsIGJdID0gdW5wYWNrQ29sb3IodGhpcy5wYWxldHRlW3BhbGV0dGVJZHhdKVxyXG4gICAgICAgIGNvbnN0IFtjeCwgY3ldID0gaW1hZ2UyQ2VsbCh4LCB5KVxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguZmlsbFN0eWxlID0gY29sb3IyUkdCQVN0eWxlKHIsIGcsIGIpXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5maWxsUmVjdChjeCwgY3ksIGNlbGxTaXplLCBjZWxsU2l6ZSlcclxuXHJcbiAgICAgICAgLy8gcmVtb3ZlIHRoZSBwaXhlbCBmcm9tIG92ZXJsYXlcclxuICAgICAgICBwaXhlbHMuZGVsZXRlKGZsYXRYWSlcclxuICAgICAgICB0aGlzLnNlcXVlbmNlLnB1c2goZmxhdFhZKVxyXG5cclxuICAgICAgICBpZiAocGl4ZWxzLnNpemUgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBtYXJrIHBhbGV0dGUgZW50cnkgYXMgZG9uZVxyXG4gICAgICAgIGNvbnN0IGVudHJ5ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5wYWxldHRlLWVudHJ5XCIpW3BhbGV0dGVJZHhdXHJcbiAgICAgICAgZW50cnkuaW5uZXJIVE1MID0gXCImY2hlY2s7XCJcclxuICAgICAgICBjb25zdCBuZXh0UGFsZXR0ZUlkeCA9IHRoaXMuZmluZE5leHRVbmZpbmlzaGVkRW50cnkocGFsZXR0ZUlkeClcclxuICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeShuZXh0UGFsZXR0ZUlkeClcclxuXHJcbiAgICAgICAgaWYgKG5leHRQYWxldHRlSWR4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFsbCBjb2xvcnMgY29tcGxldGUhIHNob3cgYW5pbWF0aW9uIG9mIHVzZXIgY29sb3Jpbmcgb3JpZ2luYWwgaW1hZ2VcclxuICAgICAgICB0aGlzLmV4ZWNEb25lU2VxdWVuY2UoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25DYW52YXNNb3VzZURvd24oZTogTW91c2VFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmFnID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuZHJhZ0xhc3QgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkNhbnZhc01vdXNlVXAoXzogTW91c2VFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmFnID0gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uQ2FudmFzTW91c2VNb3ZlKGU6IE1vdXNlRXZlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5kcmFnKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdHJhbnNmb3JtID0gdGhpcy5jdHguZ2V0VHJhbnNmb3JtKCkuaW52ZXJzZSgpXHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBnZW8uVmVjMi5mcm9tRE9NKHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh0aGlzLmRyYWdMYXN0KSlcclxuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICBjb25zdCBlbmQgPSBnZW8uVmVjMi5mcm9tRE9NKHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChwb3NpdGlvbikpXHJcbiAgICAgICAgY29uc3QgZGVsdGEgPSBlbmQuc3ViKHN0YXJ0KVxyXG5cclxuICAgICAgICBpZiAoTWF0aC5hYnMoZGVsdGEueCkgPiAzIHx8IE1hdGguYWJzKGRlbHRhLnkpID4gMykge1xyXG4gICAgICAgICAgICB0aGlzLmNlbnRlclggLT0gZGVsdGEueFxyXG4gICAgICAgICAgICB0aGlzLmNlbnRlclkgLT0gZGVsdGEueVxyXG4gICAgICAgICAgICB0aGlzLmRyYWdMYXN0ID0gcG9zaXRpb25cclxuICAgICAgICAgICAgdGhpcy5kcmFnZ2VkID0gdHJ1ZVxyXG4gICAgICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25DYW52YXNNb3VzZVdoZWVsKGU6IFdoZWVsRXZlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlLmRlbHRhWSA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy56b29tICo9IC41XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZS5kZWx0YVkgPCAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuem9vbSAqPSAyXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblBhbGV0dGVFbnRyeUNsaWNrKGU6IE1vdXNlRXZlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGVudHJ5ID0gZS50YXJnZXQgYXMgRWxlbWVudFxyXG4gICAgICAgIGxldCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KGVudHJ5KVxyXG5cclxuICAgICAgICBpZiAoaWR4ID09PSB0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4KSB7XHJcbiAgICAgICAgICAgIGlkeCA9IC0xXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeShpZHgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzZWxlY3RQYWxldHRlRW50cnkoaWR4OiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4ID0gaWR4XHJcblxyXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIucGFsZXR0ZS1lbnRyeVwiKSlcclxuICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICAgICAgZW50cnkuY2xhc3NMaXN0LnJlbW92ZShcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaWR4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICBlbnRyaWVzW2lkeF0uY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjbGVhciBwYWxldHRlIGNhbnZhc1xyXG4gICAgICAgIGNvbnN0IGN0eCA9IHRoaXMucGFsZXR0ZUN0eFxyXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IHRoaXMucGFsZXR0ZUNhbnZhc1xyXG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KVxyXG5cclxuICAgICAgICBpZiAoaWR4ID09IC0xKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoaWdobGlnaHQgcmVtYWluaW5nIHBpeGVscyBmb3IgdGhpcyBjb2xvclxyXG4gICAgICAgIGNvbnN0IGZvbnQgPSBjdHguZm9udFxyXG4gICAgICAgIGN0eC5mb250ID0gXCJib2xkIDE2cHggYXJpYWxcIlxyXG4gICAgICAgIGNvbnN0IHRleHRIZWlnaHQgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoXHJcbiAgICAgICAgY29uc3QgY2R4eSA9IGNlbGxTaXplIC8gMlxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHBpeGVsIG9mIHRoaXMucGl4ZWxPdmVybGF5W2lkeF0pIHtcclxuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gaW1hZ2UyQ2VsbCguLi51bmZsYXQocGl4ZWwsIHRoaXMuaW1hZ2VXaWR0aCkpXHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjJSR0JBU3R5bGUoMTkxLCAxOTEsIDE5MSwgMjU1KVxyXG4gICAgICAgICAgICBjdHguZmlsbFJlY3QoeCwgeSwgY2VsbFNpemUsIGNlbGxTaXplKVxyXG5cclxuICAgICAgICAgICAgLy8gZHJhdyBsYWJlbFxyXG4gICAgICAgICAgICBjb25zdCBsYWJlbCA9IGAke2lkeCArIDF9YFxyXG4gICAgICAgICAgICBjb25zdCBtZXRyaWNzID0gY3R4Lm1lYXN1cmVUZXh0KGxhYmVsKVxyXG4gICAgICAgICAgICBjb25zdCBjeCA9IHggKyBjZHh5IC0gbWV0cmljcy53aWR0aCAvIDJcclxuICAgICAgICAgICAgY29uc3QgY3kgPSB5ICsgY2R4eSArIHRleHRIZWlnaHQgLyAyXHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImJsYWNrXCJcclxuICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGxhYmVsLCBjeCwgY3kpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjdHguZm9udCA9IGZvbnRcclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZWRyYXcoKSB7XHJcbiAgICAgICAgLy8gbm90ZSAtIGNsZWFyIGlzIHN1YmplY3QgdG8gdHJhbnNmb3JtXHJcbiAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5jdHhcclxuICAgICAgICB0aGlzLmN0eC5yZXNldFRyYW5zZm9ybSgpXHJcbiAgICAgICAgY29uc3QgaHcgPSB0aGlzLmNhbnZhcy53aWR0aCAvIDIgLyB0aGlzLnpvb21cclxuICAgICAgICBjb25zdCBoaCA9IHRoaXMuY2FudmFzLmhlaWdodCAvIDIgLyB0aGlzLnpvb21cclxuXHJcbiAgICAgICAgdGhpcy5jZW50ZXJYID0gbWF0aC5jbGFtcCh0aGlzLmNlbnRlclgsIDAsIHRoaXMuY2VsbENhbnZhcy53aWR0aClcclxuICAgICAgICB0aGlzLmNlbnRlclkgPSBtYXRoLmNsYW1wKHRoaXMuY2VudGVyWSwgMCwgdGhpcy5jZWxsQ2FudmFzLmhlaWdodClcclxuICAgICAgICB0aGlzLmN0eC5zY2FsZSh0aGlzLnpvb20sIHRoaXMuem9vbSlcclxuICAgICAgICB0aGlzLmN0eC50cmFuc2xhdGUoLXRoaXMuY2VudGVyWCArIGh3LCAtdGhpcy5jZW50ZXJZICsgaGgpXHJcblxyXG4gICAgICAgIHZhciBpbnZUcmFuc2Zvcm0gPSBjdHguZ2V0VHJhbnNmb3JtKCkuaW52ZXJzZSgpXHJcbiAgICAgICAgY29uc3QgdGwgPSBpbnZUcmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQoeyB4OiAwLCB5OiAwIH0pXHJcbiAgICAgICAgY29uc3QgYnIgPSBpbnZUcmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQoeyB4OiB0aGlzLmNhbnZhcy53aWR0aCwgeTogdGhpcy5jYW52YXMuaGVpZ2h0IH0pXHJcbiAgICAgICAgY3R4LmNsZWFyUmVjdCh0bC54LCB0bC55LCBici54IC0gdGwueCwgYnIueSAtIHRsLnkpXHJcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh0aGlzLmNlbGxDYW52YXMsIDAsIDApXHJcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh0aGlzLnBhbGV0dGVDYW52YXMsIDAsIDApXHJcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh0aGlzLmNvbG9yQ2FudmFzLCAwLCAwKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZmluZE5leHRVbmZpbmlzaGVkRW50cnkoaTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5wYWxldHRlLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGlpID0gaSAlIHRoaXMucGFsZXR0ZS5sZW5ndGhcclxuICAgICAgICAgICAgaWYgKHRoaXMucGl4ZWxPdmVybGF5W2ldLnNpemUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaWlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIC0xXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBleGVjRG9uZVNlcXVlbmNlKCkge1xyXG4gICAgICAgIC8vIHNldCBhcyBkb25lXHJcbiAgICAgICAgdGhpcy5jb21wbGV0ZSA9IHRydWVcclxuXHJcbiAgICAgICAgdGhpcy5jdHgucmVzZXRUcmFuc2Zvcm0oKVxyXG5cclxuICAgICAgICAvLyBkcmF3IG9uZSBwaXhlbCBhdCBhIHRpbWUgdG8gY29sb3IgY2FudmFzXHJcbiAgICAgICAgLy8gb3ZybGF5IG9udG8gY2FudmFzXHJcbiAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuaW1hZ2VDdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCkuZGF0YVxyXG4gICAgICAgIHRoaXMuY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KVxyXG4gICAgICAgIGNvbnN0IHpvb20gPSBNYXRoLm1pbih0aGlzLmNhbnZhcy5jbGllbnRXaWR0aCAvIHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0IC8gdGhpcy5pbWFnZUhlaWdodClcclxuICAgICAgICB0aGlzLmN0eC5zY2FsZSh6b29tLCB6b29tKVxyXG5cclxuICAgICAgICAvLyBjb2xvciBhcyB1c2VyIGRpZFxyXG4gICAgICAgIGNvbnN0IHBpeGVsID0gbmV3IEltYWdlRGF0YSgxLCAxKVxyXG4gICAgICAgIGNvbnN0IHBpeGVsRGF0YSA9IHBpeGVsLmRhdGFcclxuICAgICAgICB0aGlzLmNvbG9yQ3R4LmNhbnZhcy53aWR0aCA9IHRoaXMuaW1hZ2VXaWR0aFxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguY2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2VIZWlnaHRcclxuICAgICAgICB0aGlzLmNvbG9yQ3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNvbG9yQ2FudmFzLndpZHRoLCB0aGlzLmNvbG9yQ2FudmFzLmhlaWdodClcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNlcXVlbmNlLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHh5ID0gdGhpcy5zZXF1ZW5jZVtpXVxyXG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSB1bmZsYXQoeHksIHRoaXMuaW1hZ2VXaWR0aClcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geHkgKiA0XHJcbiAgICAgICAgICAgIHBpeGVsRGF0YVswXSA9IGRhdGFbb2Zmc2V0XVxyXG4gICAgICAgICAgICBwaXhlbERhdGFbMV0gPSBkYXRhW29mZnNldCArIDFdXHJcbiAgICAgICAgICAgIHBpeGVsRGF0YVsyXSA9IGRhdGFbb2Zmc2V0ICsgMl1cclxuICAgICAgICAgICAgcGl4ZWxEYXRhWzNdID0gMjU1XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbG9yQ3R4LnB1dEltYWdlRGF0YShwaXhlbCwgeCwgeSlcclxuICAgICAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKHRoaXMuY29sb3JDYW52YXMsIDAsIDApXHJcbiAgICAgICAgICAgIGlmIChpICUgNjQgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdXRpbC53YWl0KDApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIENCTiB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxvYWRVaSA9IG5ldyBMb2FkVWkoKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwbGF5VWkgPSBuZXcgUGxheVVpKClcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmxvYWRVaS5zaG93KClcclxuICAgICAgICB0aGlzLmxvYWRVaS5pbWFnZUxvYWRlZC5zdWJjcmliZSh4ID0+IHRoaXMub25JbWFnZUxvYWRlZCh4KSlcclxuICAgICAgICB0aGlzLnBsYXlVaS5yZXR1cm4uc3ViY3JpYmUoKCkgPT4gdGhpcy5vblJldHVybigpKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25JbWFnZUxvYWRlZChpbWc6IENCTkltYWdlU291cmNlKSB7XHJcbiAgICAgICAgdGhpcy5sb2FkVWkuaGlkZSgpXHJcbiAgICAgICAgdGhpcy5wbGF5VWkuc2hvdyhpbWcpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJldHVybigpIHtcclxuICAgICAgICB0aGlzLnBsYXlVaS5oaWRlKClcclxuICAgICAgICB0aGlzLmxvYWRVaS5zaG93KCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RQYWxldHRlKGltZ0RhdGE6IEltYWdlRGF0YSk6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgZGF0YSB9ID0gaW1nRGF0YVxyXG4gICAgY29uc3Qgcm93UGl0Y2ggPSB3aWR0aCAqIDRcclxuXHJcbiAgICAvLyBmaW5kIHVuaXF1ZSBjb2xvcnMsIGNyZWF0ZSBlbnRyeSBmb3IgZWFjaFxyXG4gICAgY29uc3QgcGFsZXR0ZSA9IG5ldyBTZXQ8bnVtYmVyPigpXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiByb3dQaXRjaFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICAvLyBwYWNrIGNvbG9yIHRvIGEgdW5pcXVlIHZhbHVlXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4ICogNFxyXG4gICAgICAgICAgICBjb25zdCByID0gZGF0YVtvZmZzZXRdXHJcbiAgICAgICAgICAgIGNvbnN0IGcgPSBkYXRhW29mZnNldCArIDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGIgPSBkYXRhW29mZnNldCArIDJdXHJcbiAgICAgICAgICAgIGNvbnN0IGEgPSBkYXRhW29mZnNldCArIDNdXHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcGFja0NvbG9yKHIsIGcsIGIsIGEpXHJcbiAgICAgICAgICAgIHBhbGV0dGUuYWRkKHZhbHVlKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gWy4uLnBhbGV0dGVdXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjcmVhdGUgYW4gb3ZlcmxheSB0aGF0IG1hcHMgZWFjaCBwaXhlbCB0byB0aGUgaW5kZXggb2YgaXRzIHBhbGV0dGUgZW50cnlcclxuICogQHBhcmFtIGltZ0RhdGEgaW1hZ2UgZGF0YVxyXG4gKiBAcGFyYW0gcGFsZXR0ZSBwYWxldHRlIGNvbG9yc1xyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlUGFsZXR0ZU92ZXJsYXkoaW1nRGF0YTogSW1hZ2VEYXRhLCBwYWxldHRlOiBudW1iZXJbXSk6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgZGF0YSB9ID0gaW1nRGF0YVxyXG4gICAgY29uc3QgcGFsZXR0ZU1hcCA9IGFycmF5Lm1hcEluZGljZXMocGFsZXR0ZSlcclxuICAgIGNvbnN0IHJvd1BpdGNoID0gd2lkdGggKiA0XHJcbiAgICBjb25zdCBvdmVybGF5ID0gYXJyYXkudW5pZm9ybSgtMSwgd2lkdGggKiBoZWlnaHQpXHJcblxyXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIGNvbnN0IHlPZmZzZXQgPSB5ICogcm93UGl0Y2hcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyArK3gpIHtcclxuICAgICAgICAgICAgLy8gcGFjayBjb2xvciB0byBhIHVuaXF1ZSB2YWx1ZVxyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeCAqIDRcclxuICAgICAgICAgICAgY29uc3QgciA9IGRhdGFbb2Zmc2V0XVxyXG4gICAgICAgICAgICBjb25zdCBnID0gZGF0YVtvZmZzZXQgKyAxXVxyXG4gICAgICAgICAgICBjb25zdCBiID0gZGF0YVtvZmZzZXQgKyAyXVxyXG4gICAgICAgICAgICBjb25zdCBhID0gZGF0YVtvZmZzZXQgKyAzXVxyXG4gICAgICAgICAgICBjb25zdCByZ2JhID0gcGFja0NvbG9yKHIsIGcsIGIsIGEpXHJcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IHBhbGV0dGVNYXAuZ2V0KHJnYmEpID8/IC0xXHJcbiAgICAgICAgICAgIG92ZXJsYXlbeSAqIHdpZHRoICsgeF0gPSBpZHhcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG92ZXJsYXlcclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBhbiBvdmVybGF5IHRoYXQgbWFwcyBlYWNoIHBhbGV0dGUgZW50cnkgdG8gYSBsaXN0IG9mIHBpeGVscyB3aXRoIGl0cyBjb2xvclxyXG4gKiBAcGFyYW0gaW1nRGF0YSBcclxuICogQHBhcmFtIHBhbGV0dGUgXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVQaXhlbE92ZXJsYXkod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHBhbGV0dGU6IG51bWJlcltdLCBwYWxldHRlT3ZlcmxheTogbnVtYmVyW10pOiBTZXQ8bnVtYmVyPltdIHtcclxuICAgIGNvbnN0IG92ZXJsYXkgPSBhcnJheS5nZW5lcmF0ZShwYWxldHRlLmxlbmd0aCwgKCkgPT4gbmV3IFNldDxudW1iZXI+KCkpXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiB3aWR0aFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICAvLyBwYWNrIGNvbG9yIHRvIGEgdW5pcXVlIHZhbHVlXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGNvbnN0IHBhbGV0dGVJZHggPSBwYWxldHRlT3ZlcmxheVtvZmZzZXRdXHJcbiAgICAgICAgICAgIGlmIChwYWxldHRlSWR4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgZmxhdENvb3JkID0gZmxhdCh4LCB5LCB3aWR0aClcclxuICAgICAgICAgICAgb3ZlcmxheVtwYWxldHRlSWR4XS5hZGQoZmxhdENvb3JkKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gb3ZlcmxheVxyXG59XHJcblxyXG5mdW5jdGlvbiBwYWNrQ29sb3IocjogbnVtYmVyLCBnOiBudW1iZXIsIGI6IG51bWJlciwgYTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IHZhbHVlID0gciA8PCAyNCB8IGcgPDwgMTYgfCBiIDw8IDggfCBhXHJcbiAgICByZXR1cm4gdmFsdWVcclxufVxyXG5cclxuZnVuY3Rpb24gdW5wYWNrQ29sb3IoeDogbnVtYmVyKTogQ29sb3Ige1xyXG4gICAgY29uc3QgciA9ICh4ICYgMHhGRjAwMDAwMCkgPj4+IDI0XHJcbiAgICBjb25zdCBnID0gKHggJiAweDAwRkYwMDAwKSA+Pj4gMTZcclxuICAgIGNvbnN0IGIgPSAoeCAmIDB4MDAwMEZGMDApID4+PiA4XHJcbiAgICBjb25zdCBhID0geCAmIDB4MDAwMDAwRkZcclxuXHJcbiAgICByZXR1cm4gW3IsIGcsIGIsIGFdXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGNMdW1pbmFuY2UocjogbnVtYmVyLCBnOiBudW1iZXIsIGI6IG51bWJlcikge1xyXG4gICAgY29uc3QgbCA9IDAuMjEyNiAqIChyIC8gMjU1KSArIDAuNzE1MiAqIChnIC8gMjU1KSArIDAuMDcyMiAqIChiIC8gMjU1KVxyXG4gICAgcmV0dXJuIGxcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0NlbGxJbWFnZShjdHg6IE9mZnNjcmVlbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSkge1xyXG4gICAgY29uc3QgY2VsbEltYWdlV2lkdGggPSB3aWR0aCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG4gICAgY29uc3QgY2VsbEltYWdlSGVpZ2h0ID0gaGVpZ2h0ICogKGNlbGxTaXplICsgMSkgKyAxXHJcblxyXG4gICAgLy8gc2l6ZSBjYW52YXNcclxuICAgIGN0eC5jYW52YXMud2lkdGggPSBjZWxsSW1hZ2VXaWR0aFxyXG4gICAgY3R4LmNhbnZhcy5oZWlnaHQgPSBjZWxsSW1hZ2VIZWlnaHRcclxuXHJcbiAgICAvLyBkcmF3IGhvcml6b250YWwgZ3JpZCBsaW5lc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gaGVpZ2h0OyArK2kpIHtcclxuICAgICAgICBjdHguc3Ryb2tlUmVjdCgwLCBpICogKGNlbGxTaXplICsgMSksIGNlbGxJbWFnZVdpZHRoLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgdmVydGljYWwgZ3JpZCBsaW5lc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gd2lkdGg7ICsraSkge1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KGkgKiAoY2VsbFNpemUgKyAxKSwgMCwgMSwgY2VsbEltYWdlSGVpZ2h0KVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgI3NcclxuICAgIGNvbnN0IGZvbnQgPSBjdHguZm9udFxyXG4gICAgY3R4LmZvbnQgPSBcIjE2cHggYXJpYWxcIlxyXG4gICAgY29uc3QgdGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGhcclxuICAgIGNvbnN0IGNkeHkgPSBjZWxsU2l6ZSAvIDJcclxuXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiB3aWR0aFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgICAgICBjb25zdCBwYWxldHRlSWR4ID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0XVxyXG4gICAgICAgICAgICBpZiAocGFsZXR0ZUlkeCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIC8vIGZpbGwgdGhpcyBwYXJ0IG9mIHRoZSBpbWFnZSBpbiB3aXRoIHNvbGlkIGNvbG9yIVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGxhYmVsID0gYCR7cGFsZXR0ZUlkeCArIDF9YFxyXG4gICAgICAgICAgICBjb25zdCBtZXRyaWNzID0gY3R4Lm1lYXN1cmVUZXh0KGxhYmVsKVxyXG4gICAgICAgICAgICBjb25zdCBjeCA9IHggKiAoY2VsbFNpemUgKyAxKSArIGNkeHkgKyAxIC0gbWV0cmljcy53aWR0aCAvIDJcclxuICAgICAgICAgICAgY29uc3QgY3kgPSB5ICogKGNlbGxTaXplICsgMSkgKyBjZHh5ICsgMSArIHRleHRIZWlnaHQgLyAyXHJcbiAgICAgICAgICAgIGN0eC5maWxsVGV4dChsYWJlbCwgY3gsIGN5KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjdHguZm9udCA9IGZvbnRcclxufVxyXG5cclxuZnVuY3Rpb24gZml0KHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBtYXhTaXplOiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIGlmICh3aWR0aCA+IGhlaWdodCAmJiB3aWR0aCA+IG1heFNpemUpIHtcclxuICAgICAgICBoZWlnaHQgPSBtYXhEaW0gKiBoZWlnaHQgLyB3aWR0aFxyXG4gICAgICAgIHJldHVybiBbTWF0aC5mbG9vcihtYXhTaXplKSwgTWF0aC5mbG9vcihoZWlnaHQpXVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChoZWlnaHQgPiB3aWR0aCAmJiBoZWlnaHQgPiBtYXhTaXplKSB7XHJcbiAgICAgICAgd2lkdGggPSBtYXhEaW0gKiB3aWR0aCAvIGhlaWdodFxyXG4gICAgICAgIHJldHVybiBbTWF0aC5mbG9vcih3aWR0aCksIE1hdGguZmxvb3IobWF4U2l6ZSldXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFtNYXRoLmZsb29yKHdpZHRoKSwgTWF0aC5mbG9vcihoZWlnaHQpXVxyXG59XHJcblxyXG5mdW5jdGlvbiBmbGF0KHg6IG51bWJlciwgeTogbnVtYmVyLCByb3dQaXRjaDogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4geSAqIHJvd1BpdGNoICsgeFxyXG59XHJcblxyXG5mdW5jdGlvbiB1bmZsYXQoaTogbnVtYmVyLCByb3dQaXRjaDogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICByZXR1cm4gW2kgJSByb3dQaXRjaCwgTWF0aC5mbG9vcihpIC8gcm93UGl0Y2gpXVxyXG59XHJcblxyXG4vKipcclxuICAgKiBDb252ZXJ0IGFuIGltYWdlIHggb3IgeSBjb29yZGluYXRlIHRvIHRvcCBvciBsZWZ0IG9mIGNibiBjZWxsIGNvbnRhaW5pbmcgdGhhdCBwaXhlbFxyXG4gICAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gICAqL1xyXG5mdW5jdGlvbiBpbWFnZTJDZWxsQ29vcmQoY29vcmQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gY29vcmQgKiAoY2VsbFNpemUgKyAxKSArIDFcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnQgYSBjYm4geCBvciB5IGNvb3JkaW5hdGUgdG8gdG9wIG9yIGxlZnQgb2YgY2JuIGNlbGwgY29udGFpbmluZyB0aGF0IHBpeGVsXHJcbiAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gKi9cclxuZnVuY3Rpb24gY2VsbDJJbWFnZUNvb3JkKGNvb3JkOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoKGNvb3JkIC0gMSkgLyAoY2VsbFNpemUgKyAxKSlcclxufVxyXG5cclxuLyoqXHJcbiAgICogQ29udmVydCBhbiBpbWFnZSB4IG9yIHkgY29vcmRpbmF0ZSB0byB0b3Agb3IgbGVmdCBvZiBjYm4gY2VsbCBjb250YWluaW5nIHRoYXQgcGl4ZWxcclxuICAgKiBAcGFyYW0gY29vcmQgeCBvciB5IGNvb3JkaW5hdGVcclxuICAgKi9cclxuZnVuY3Rpb24gaW1hZ2UyQ2VsbCh4OiBudW1iZXIsIHk6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgcmV0dXJuIFtpbWFnZTJDZWxsQ29vcmQoeCksIGltYWdlMkNlbGxDb29yZCh5KV1cclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnQgYSBjYm4geCBvciB5IGNvb3JkaW5hdGUgdG8gdG9wIG9yIGxlZnQgb2YgY2JuIGNlbGwgY29udGFpbmluZyB0aGF0IHBpeGVsXHJcbiAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gKi9cclxuZnVuY3Rpb24gY2VsbDJJbWFnZSh4OiBudW1iZXIsIHk6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgcmV0dXJuIFtjZWxsMkltYWdlQ29vcmQoeCksIGNlbGwySW1hZ2VDb29yZCh5KV1cclxufVxyXG5cclxuLyoqXHJcbiAqIGNvbnZlcnQgcmdiYSBjb29yZGluYXRlcyB0byBhIHN0eWxlIHN0cmluZ1xyXG4gKiBAcGFyYW0gciByZWRcclxuICogQHBhcmFtIGcgZ3JlZW5cclxuICogQHBhcmFtIGIgYmx1ZVxyXG4gKiBAcGFyYW0gYSBhbHBoYVxyXG4gKi9cclxuZnVuY3Rpb24gY29sb3IyUkdCQVN0eWxlKHI6IG51bWJlciwgZzogbnVtYmVyLCBiOiBudW1iZXIsIGE6IG51bWJlciA9IDI1NSkge1xyXG4gICAgcmV0dXJuIGByZ2JhKCR7cn0sICR7Z30sICR7Yn0sICR7YSAvIDI1NX0pYFxyXG59XHJcblxyXG5mdW5jdGlvbiBxdWFudE1lZGlhbkN1dChjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCB8IE9mZnNjcmVlbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgbWF4Q29sb3JzOiBudW1iZXIpIHtcclxuICAgIGludGVyZmFjZSBQaXhlbCB7XHJcbiAgICAgICAgb2Zmc2V0OiBudW1iZXJcclxuICAgICAgICByOiBudW1iZXJcclxuICAgICAgICBnOiBudW1iZXJcclxuICAgICAgICBiOiBudW1iZXJcclxuICAgIH1cclxuXHJcbiAgICAvLyBtYXhDb2xvcnMgbXVzdCBiZSBhIHBvd2VyIG9mIDIgZm9yIHRoaXMgYWxnb3JpdGhtXHJcbiAgICBtYXhDb2xvcnMgPSBtYXRoLm5leHRQb3cyKG1heENvbG9ycylcclxuICAgIGNvbnN0IGltZ0RhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIGN0eC5jYW52YXMud2lkdGgsIGN0eC5jYW52YXMuaGVpZ2h0KVxyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBkYXRhIH0gPSBpbWdEYXRhXHJcbiAgICBjb25zdCByb3dQaXRjaCA9IHdpZHRoICogNFxyXG5cclxuICAgIGNvbnN0IGJ1Y2tldHMgPSBuZXcgQXJyYXk8UGl4ZWxbXT4oKVxyXG4gICAgYnVja2V0cy5wdXNoKGNyZWF0ZUluaXRpYWxCdWNrZXQoKSlcclxuXHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgIGNvbnN0IGJ1Y2tldCA9IGNob29zZUJ1Y2tldChjb2xvclJhbmdlVG9sZXJhbmNlLCBidWNrZXRzKVxyXG4gICAgICAgIGlmICghYnVja2V0KSB7XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBidWNrZXRzLnB1c2goc3BsaXRCdWNrZXQoYnVja2V0KSlcclxuICAgIH1cclxuXHJcbiAgICAvLyBjYWxjdWxhdGUgdGhlIGF2ZXJhZ2UgY29sb3IgZm9yIGVhY2ggYnVja2V0XHJcbiAgICBjb25zdCBjb2xvcnMgPSBuZXcgQXJyYXk8W251bWJlciwgbnVtYmVyLCBudW1iZXJdPigpXHJcbiAgICBmb3IgKGNvbnN0IGJ1Y2tldCBvZiBidWNrZXRzKSB7XHJcbiAgICAgICAgbGV0IHIgPSAwXHJcbiAgICAgICAgbGV0IGcgPSAwXHJcbiAgICAgICAgbGV0IGIgPSAwXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgcGl4ZWwgb2YgYnVja2V0KSB7XHJcbiAgICAgICAgICAgIHIgKz0gcGl4ZWwuclxyXG4gICAgICAgICAgICBnICs9IHBpeGVsLmdcclxuICAgICAgICAgICAgYiArPSBwaXhlbC5iXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByIC89IGJ1Y2tldC5sZW5ndGhcclxuICAgICAgICBnIC89IGJ1Y2tldC5sZW5ndGhcclxuICAgICAgICBiIC89IGJ1Y2tldC5sZW5ndGhcclxuXHJcbiAgICAgICAgY29sb3JzLnB1c2goW01hdGgucm91bmQociksIE1hdGgucm91bmQoZyksIE1hdGgucm91bmQoYildKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGl0ZXJhdGUgdGhyb3VnaCBlYWNoIGJ1Y2tldCwgcmVwbGFjaW5nIHBpeGVsIGNvbG9yIHdpdGggYnVja2V0IGNvbG9yIGZvciBlYWNoIHBpeGVsXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJ1Y2tldHMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCBidWNrZXQgPSBidWNrZXRzW2ldXHJcbiAgICAgICAgY29uc3QgW3IsIGcsIGJdID0gY29sb3JzW2ldXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgcGl4ZWwgb2YgYnVja2V0KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHBpeGVsLm9mZnNldCAqIDRcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXRdID0gclxyXG4gICAgICAgICAgICBkYXRhW29mZnNldCArIDFdID0gZ1xyXG4gICAgICAgICAgICBkYXRhW29mZnNldCArIDJdID0gYlxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjdHgucHV0SW1hZ2VEYXRhKGltZ0RhdGEsIDAsIDApXHJcblxyXG4gICAgZnVuY3Rpb24gY3JlYXRlSW5pdGlhbEJ1Y2tldCgpOiBQaXhlbFtdIHtcclxuICAgICAgICAvLyBjcmVhdGUgaW5pdGlhbCBidWNrZXRcclxuICAgICAgICBjb25zdCBidWNrZXQgPSBuZXcgQXJyYXk8UGl4ZWw+KClcclxuICAgICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHlPZmZzZXQgPSB5ICogcm93UGl0Y2hcclxuICAgICAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeCAqIDRcclxuICAgICAgICAgICAgICAgIGNvbnN0IHIgPSBkYXRhW29mZnNldF1cclxuICAgICAgICAgICAgICAgIGNvbnN0IGcgPSBkYXRhW29mZnNldCArIDFdXHJcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gZGF0YVtvZmZzZXQgKyAyXVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIHBhY2sgaW50byBidWNrZXRcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBpeGVsOiBQaXhlbCA9IHtcclxuICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IGZsYXQoeCwgeSwgd2lkdGgpLFxyXG4gICAgICAgICAgICAgICAgICAgIHI6IHIsXHJcbiAgICAgICAgICAgICAgICAgICAgZzogZyxcclxuICAgICAgICAgICAgICAgICAgICBiOiBiXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgYnVja2V0LnB1c2gocGl4ZWwpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBidWNrZXRcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYWxjUmFuZ2UocGl4ZWxzOiBQaXhlbFtdLCBzZWxlY3RvcjogKHg6IFBpeGVsKSA9PiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBtaW4gPSBJbmZpbml0eVxyXG4gICAgICAgIGxldCBtYXggPSAtSW5maW5pdHlcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBwaXhlbCBvZiBwaXhlbHMpIHtcclxuICAgICAgICAgICAgbWluID0gTWF0aC5taW4oc2VsZWN0b3IocGl4ZWwpLCBtaW4pXHJcbiAgICAgICAgICAgIG1heCA9IE1hdGgubWF4KHNlbGVjdG9yKHBpeGVsKSwgbWF4KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1heCAtIG1pblxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNob29zZUJ1Y2tldCh0b2xlcmFuY2U6IG51bWJlciwgYnVja2V0czogUGl4ZWxbXVtdKTogUGl4ZWxbXSB8IG51bGwge1xyXG4gICAgICAgIGxldCBtYXhSYW5nZSA9IC1JbmZpbml0eVxyXG4gICAgICAgIGxldCBtYXhCdWNrZXQ6IFBpeGVsW10gfCBudWxsID0gbnVsbFxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGJ1Y2tldCBvZiBidWNrZXRzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlUiA9IGNhbGNSYW5nZShidWNrZXQsIHAgPT4gcC5yKVxyXG4gICAgICAgICAgICBjb25zdCByYW5nZUcgPSBjYWxjUmFuZ2UoYnVja2V0LCBwID0+IHAuZylcclxuICAgICAgICAgICAgY29uc3QgcmFuZ2VCID0gY2FsY1JhbmdlKGJ1Y2tldCwgcCA9PiBwLmIpXHJcbiAgICAgICAgICAgIGxldCByYW5nZSA9IDBcclxuICAgICAgICAgICAgaWYgKHJhbmdlUiA+IHJhbmdlRyAmJiByYW5nZVIgPiByYW5nZUIpIHtcclxuICAgICAgICAgICAgICAgIHJhbmdlID0gcmFuZ2VSXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmFuZ2VHID4gcmFuZ2VSKSB7XHJcbiAgICAgICAgICAgICAgICByYW5nZSA9IHJhbmdlR1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmFuZ2UgPSByYW5nZUJcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHJhbmdlID4gbWF4UmFuZ2UpIHtcclxuICAgICAgICAgICAgICAgIG1heFJhbmdlID0gcmFuZ2VcclxuICAgICAgICAgICAgICAgIG1heEJ1Y2tldCA9IGJ1Y2tldFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbWF4UmFuZ2UgPiB0b2xlcmFuY2UgPyBtYXhCdWNrZXQgOiBudWxsXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc3BsaXRCdWNrZXQoYnVja2V0OiBQaXhlbFtdKTogUGl4ZWxbXSB7XHJcbiAgICAgICAgY29uc3QgcmFuZ2VSID0gY2FsY1JhbmdlKGJ1Y2tldCwgcCA9PiBwLnIpXHJcbiAgICAgICAgY29uc3QgcmFuZ2VHID0gY2FsY1JhbmdlKGJ1Y2tldCwgcCA9PiBwLmcpXHJcbiAgICAgICAgY29uc3QgcmFuZ2VCID0gY2FsY1JhbmdlKGJ1Y2tldCwgcCA9PiBwLmIpXHJcblxyXG4gICAgICAgIGlmIChyYW5nZVIgPiByYW5nZUcgJiYgcmFuZ2VSID4gcmFuZ2VCKSB7XHJcbiAgICAgICAgICAgIGJ1Y2tldC5zb3J0KChhLCBiKSA9PiBhLnIgLSBiLnIpXHJcbiAgICAgICAgfSBlbHNlIGlmIChyYW5nZUcgPiByYW5nZVIpIHtcclxuICAgICAgICAgICAgYnVja2V0LnNvcnQoKGEsIGIpID0+IGEuZyAtIGIuZylcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBidWNrZXQuc29ydCgoYSwgYikgPT4gYS5iIC0gYi5iKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbWlkZGxlID0gTWF0aC5mbG9vcihidWNrZXQubGVuZ3RoIC8gMilcclxuICAgICAgICBjb25zdCBuZXdCdWNrZXQgPSBidWNrZXQuc3BsaWNlKG1pZGRsZSlcclxuICAgICAgICByZXR1cm4gbmV3QnVja2V0XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBydW5lUGFsbGV0ZShwYWxldHRlOiBudW1iZXJbXSwgcGl4ZWxPdmVybGF5OiBTZXQ8bnVtYmVyPltdLCBtYXhQaXhlbHM6IG51bWJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIGN0eDogT2Zmc2NyZWVuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKTogbnVtYmVyW10ge1xyXG4gICAgY29uc3QgaW5kaWNlc1RvS2VlcCA9IG5ldyBTZXQ8bnVtYmVyPihhcnJheS5zZXF1ZW5jZSgwLCBwYWxldHRlLmxlbmd0aCkpXHJcblxyXG4gICAgY3R4LmNhbnZhcy53aWR0aCA9IHdpZHRoICogKGNlbGxTaXplICsgMSkgKyAxXHJcbiAgICBjdHguY2FudmFzLmhlaWdodCA9IGhlaWdodCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGl4ZWxPdmVybGF5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgcGl4ZWxzID0gcGl4ZWxPdmVybGF5W2ldXHJcbiAgICAgICAgaWYgKHBpeGVscy5zaXplIDwgbWF4UGl4ZWxzKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXRlci5hbGwocGl4ZWxzLCB4ID0+ICFpc0JvcmRlclBpeGVsKC4uLnVuZmxhdCh4LCB3aWR0aCksIHdpZHRoLCBoZWlnaHQpKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZmlsbCB0aGVzZSBwaXhlbHMgaW4gaW1hZ2Ugd2l0aCBhcHByb3ByaWF0ZSBjb2xvclxyXG4gICAgICAgIGNvbnN0IFtyLCBnLCBiXSA9IHVucGFja0NvbG9yKHBhbGV0dGVbaV0pXHJcbiAgICAgICAgZm9yIChjb25zdCB4eSBvZiBwaXhlbHMpIHtcclxuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gdW5mbGF0KHh5LCB3aWR0aClcclxuICAgICAgICAgICAgY29uc3QgW2N4LCBjeV0gPSBpbWFnZTJDZWxsKHgsIHkpXHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjJSR0JBU3R5bGUociwgZywgYilcclxuICAgICAgICAgICAgY3R4LmZpbGxSZWN0KGN4LCBjeSwgY2VsbFNpemUsIGNlbGxTaXplKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaW5kaWNlc1RvS2VlcC5kZWxldGUoaSlcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBuZXdQYWxldHRlID0gWy4uLmluZGljZXNUb0tlZXBdLm1hcCh4ID0+IHBhbGV0dGVbeF0pXHJcbiAgICByZXR1cm4gbmV3UGFsZXR0ZVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc0JvcmRlclBpeGVsKHg6IG51bWJlciwgeTogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHggPT09IDAgfHwgeSA9PT0gMCB8fCB4ID09PSB3aWR0aCAtIDEgfHwgeSA9PT0gaGVpZ2h0IC0gMVxyXG59XHJcblxyXG5uZXcgQ0JOKCkiXX0=