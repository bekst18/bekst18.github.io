import * as array from "../shared/array.js";
import * as dom from "../shared/dom.js";
import * as geo from "../shared/geo3d.js";
import * as math from "../shared/math.js";
import * as util from "../shared/util.js";
import * as iter from "../shared/iter.js";
// size that each image pixel is blown up to
const cellSize = 24;
// max height / width of image
const maxDim = 256;
// tolerance before splitting colors - higher = less colors
const colorRangeTolerance = 32;
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
        this.loadFromUrl("/cbn/assets/larryKoopa.jpg");
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
        // // debug - go straight to end state
        // for (let y = 0; y < this.imageHeight; ++y) {
        //     for (let x = 0; x < this.imageWidth; ++x) {
        //         this.sequence.push(flat(x, y, this.imageWidth))
        //     }
        // }
        // rand.shuffle(this.sequence)
        // this.execDoneSequence()
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQTtBQUN2QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBSXpDLDRDQUE0QztBQUM1QyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFFbkIsOEJBQThCO0FBQzlCLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQTtBQUVsQiwyREFBMkQ7QUFDM0QsTUFBTSxtQkFBbUIsR0FBRyxFQUFFLENBQUE7QUFFOUIsK0JBQStCO0FBQy9CLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFBO0FBRWhDLElBQUssVUFJSjtBQUpELFdBQUssVUFBVTtJQUNYLDJDQUFJLENBQUE7SUFDSiwyQ0FBSSxDQUFBO0lBQ0oseURBQVcsQ0FBQTtBQUNmLENBQUMsRUFKSSxVQUFVLEtBQVYsVUFBVSxRQUlkO0FBSUQsTUFBTSxPQUFPO0lBQWI7UUFDcUIsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtJQWU1RCxDQUFDO0lBYlUsUUFBUSxDQUFDLFVBQTBCO1FBQ3RDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFTSxXQUFXLENBQUMsVUFBMEI7UUFDekMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVNLE9BQU8sQ0FBQyxDQUFJO1FBQ2YsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMs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UyxFQUFFLENBQVMsRUFBRSxLQUFhLEVBQUUsTUFBYztJQUN0RSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssTUFBTSxHQUFHLENBQUMsQ0FBQTtBQUNwRSxDQUFDO0FBRUQsSUFBSSxHQUFHLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIlxyXG5pbXBvcnQgKiBhcyBkb20gZnJvbSBcIi4uL3NoYXJlZC9kb20uanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8zZC5qc1wiXHJcbmltcG9ydCAqIGFzIG1hdGggZnJvbSBcIi4uL3NoYXJlZC9tYXRoLmpzXCJcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tIFwiLi4vc2hhcmVkL3V0aWwuanNcIlxyXG5pbXBvcnQgKiBhcyBpdGVyIGZyb20gXCIuLi9zaGFyZWQvaXRlci5qc1wiXHJcbmltcG9ydCAqIGFzIHJhbmQgZnJvbSBcIi4uL3NoYXJlZC9yYW5kLmpzXCJcclxuaW1wb3J0IHsgdGlsZVNpemUgfSBmcm9tIFwiLi4vY3Jhd2wvcmwuanNcIlxyXG5cclxuLy8gc2l6ZSB0aGF0IGVhY2ggaW1hZ2UgcGl4ZWwgaXMgYmxvd24gdXAgdG9cclxuY29uc3QgY2VsbFNpemUgPSAyNFxyXG5cclxuLy8gbWF4IGhlaWdodCAvIHdpZHRoIG9mIGltYWdlXHJcbmNvbnN0IG1heERpbSA9IDI1NlxyXG5cclxuLy8gdG9sZXJhbmNlIGJlZm9yZSBzcGxpdHRpbmcgY29sb3JzIC0gaGlnaGVyID0gbGVzcyBjb2xvcnNcclxuY29uc3QgY29sb3JSYW5nZVRvbGVyYW5jZSA9IDMyXHJcblxyXG4vLyBtYXggYmcgcGl4ZWxzIGJlZm9yZSByZW1vdmFsXHJcbmNvbnN0IG1heEJhY2tncm91bmRQaXhlbHMgPSAxMDI0XHJcblxyXG5lbnVtIENhbWVyYU1vZGUge1xyXG4gICAgTm9uZSxcclxuICAgIFVzZXIsXHJcbiAgICBFbnZpcm9ubWVudCxcclxufVxyXG5cclxudHlwZSBDb2xvciA9IFtudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdXHJcblxyXG5jbGFzcyBDaGFubmVsPFQ+IHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3Vic2NyaWJlcnMgPSBuZXcgU2V0PCh4OiBUKSA9PiB2b2lkPigpXHJcblxyXG4gICAgcHVibGljIHN1YmNyaWJlKHN1YnNjcmliZXI6ICh4OiBUKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVycy5hZGQoc3Vic2NyaWJlcilcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgdW5zdWJzY3JpYmUoc3Vic2NyaWJlcjogKHg6IFQpID0+IHZvaWQpIHtcclxuICAgICAgICB0aGlzLnN1YnNjcmliZXJzLmRlbGV0ZShzdWJzY3JpYmVyKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBwdWJsaXNoKHg6IFQpOiB2b2lkIHtcclxuICAgICAgICBmb3IgKGNvbnN0IHN1YnNjcmliZXIgb2YgdGhpcy5zdWJzY3JpYmVycykge1xyXG4gICAgICAgICAgICBzdWJzY3JpYmVyKHgpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgQ0JOSW1hZ2VTb3VyY2Uge1xyXG4gICAgd2lkdGg6IG51bWJlclxyXG4gICAgaGVpZ2h0OiBudW1iZXJcclxuICAgIHNvdXJjZTogSFRNTFZpZGVvRWxlbWVudCB8IEhUTUxJbWFnZUVsZW1lbnRcclxufVxyXG5cclxuY2xhc3MgTG9hZFVpIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FtZXJhID0gZG9tLmJ5SWQoXCJjYW1lcmFcIikgYXMgSFRNTFZpZGVvRWxlbWVudFxyXG4gICAgcHJpdmF0ZSBjYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Ob25lXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFjcXVpcmVJbWFnZURpdiA9IGRvbS5ieUlkKFwiYWNxdWlyZUltYWdlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhcHR1cmVJbWFnZUJ1dHRvbiA9IGRvbS5ieUlkKFwiY2FwdHVyZUltYWdlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxvYWRVaURpdiA9IGRvbS5ieUlkKFwibG9hZFVpXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpbGVEcm9wQm94ID0gZG9tLmJ5SWQoXCJmaWxlRHJvcEJveFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmaWxlSW5wdXQgPSBkb20uYnlJZChcImZpbGVJbnB1dFwiKSBhcyBIVE1MSW5wdXRFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpbGVCdXR0b24gPSBkb20uYnlJZChcImZpbGVCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdXNlQ2FtZXJhQnV0dG9uID0gZG9tLmJ5SWQoXCJ1c2VDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmxpcENhbWVyYUJ1dHRvbiA9IGRvbS5ieUlkKFwiZmxpcENhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdG9wQ2FtZXJhQnV0dG9uID0gZG9tLmJ5SWQoXCJzdG9wQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxpYnJhcnlCdXR0b24gPSBkb20uYnlJZChcImxpYnJhcnlCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZXJyb3JzRGl2ID0gZG9tLmJ5SWQoXCJlcnJvcnNcIik7XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgaW1hZ2VMb2FkZWQgPSBuZXcgQ2hhbm5lbDxDQk5JbWFnZVNvdXJjZT4oKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsaWJyYXJ5VWkgPSBuZXcgTGlicmFyeVVpKClcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmZpbGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5maWxlSW5wdXQuY2xpY2soKVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuZmlsZURyb3BCb3guYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdlbnRlclwiLCAoZSkgPT4gdGhpcy5vbkRyYWdFbnRlck92ZXIoZSkpXHJcbiAgICAgICAgdGhpcy5maWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ292ZXJcIiwgKGUpID0+IHRoaXMub25EcmFnRW50ZXJPdmVyKGUpKVxyXG4gICAgICAgIHRoaXMuZmlsZURyb3BCb3guYWRkRXZlbnRMaXN0ZW5lcihcImRyb3BcIiwgKGUpID0+IHRoaXMub25GaWxlRHJvcChlKSlcclxuICAgICAgICB0aGlzLmZpbGVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHRoaXMub25GaWxlQ2hhbmdlKCkpXHJcbiAgICAgICAgdGhpcy51c2VDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMudXNlQ2FtZXJhKCkpXHJcbiAgICAgICAgdGhpcy5mbGlwQ2FtZXJhQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmZsaXBDYW1lcmEoKSlcclxuICAgICAgICB0aGlzLnN0b3BDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuc3RvcENhbWVyYSgpKVxyXG4gICAgICAgIHRoaXMuY2FwdHVyZUltYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmNhcHR1cmVJbWFnZSgpKVxyXG4gICAgICAgIHRoaXMuY2FtZXJhLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRtZXRhZGF0YVwiLCAoKSA9PiB0aGlzLm9uQ2FtZXJhTG9hZCgpKVxyXG4gICAgICAgIHRoaXMubGlicmFyeUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5zaG93TGlicmFyeSgpKVxyXG5cclxuICAgICAgICB0aGlzLmxpYnJhcnlVaS5jYW5jZWwuc3ViY3JpYmUoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRVaURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5sb2FkVWlEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmxvYWRGcm9tVXJsKFwiL2Nibi9hc3NldHMvbGFycnlLb29wYS5qcGdcIilcclxuICAgICAgICAvLyB0aGlzLmxvYWRGcm9tVXJsKFwiL2Nibi9hc3NldHMvb2x0c19mbG93ZXIuanBnXCIpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5sb2FkVWlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25EcmFnRW50ZXJPdmVyKGV2OiBEcmFnRXZlbnQpIHtcclxuICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uRmlsZUNoYW5nZSgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuZmlsZUlucHV0LmZpbGVzPy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmaWxlID0gdGhpcy5maWxlSW5wdXQuZmlsZXNbMF1cclxuICAgICAgICB0aGlzLnByb2Nlc3NGaWxlKGZpbGUpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkZpbGVEcm9wKGV2OiBEcmFnRXZlbnQpIHtcclxuICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxuXHJcbiAgICAgICAgaWYgKCFldj8uZGF0YVRyYW5zZmVyPy5maWxlcz8ubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZmlsZSA9IGV2LmRhdGFUcmFuc2Zlci5maWxlc1swXVxyXG4gICAgICAgIHRoaXMucHJvY2Vzc0ZpbGUoZmlsZSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHVzZUNhbWVyYSgpIHtcclxuICAgICAgICB0aGlzLmFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIGNvbnN0IGRpYWxvZ1dpZHRoID0gdGhpcy5hY3F1aXJlSW1hZ2VEaXYuY2xpZW50V2lkdGhcclxuICAgICAgICBjb25zdCBkaWFsb2dIZWlnaHQgPSB0aGlzLmFjcXVpcmVJbWFnZURpdi5jbGllbnRIZWlnaHRcclxuICAgICAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7XHJcbiAgICAgICAgICAgIHZpZGVvOiB7IHdpZHRoOiB7IG1heDogZGlhbG9nV2lkdGggfSwgaGVpZ2h0OiB7IG1heDogZGlhbG9nSGVpZ2h0IH0sIGZhY2luZ01vZGU6IFwidXNlclwiIH0sXHJcbiAgICAgICAgICAgIGF1ZGlvOiBmYWxzZVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuVXNlclxyXG4gICAgICAgIHRoaXMuY2FtZXJhLnNyY09iamVjdCA9IHN0cmVhbVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZmxpcENhbWVyYSgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY2FtZXJhLnNyY09iamVjdCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHNyYyA9IHRoaXMuY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgICAgIGNvbnN0IHRyYWNrcyA9IHNyYy5nZXRUcmFja3MoKVxyXG4gICAgICAgIGZvciAoY29uc3QgdHJhY2sgb2YgdHJhY2tzKSB7XHJcbiAgICAgICAgICAgIHRyYWNrLnN0b3AoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jYW1lcmFNb2RlID0gdGhpcy5jYW1lcmFNb2RlID09IENhbWVyYU1vZGUuVXNlciA/IENhbWVyYU1vZGUuRW52aXJvbm1lbnQgOiBDYW1lcmFNb2RlLlVzZXJcclxuICAgICAgICBjb25zdCBmYWNpbmdNb2RlID0gdGhpcy5jYW1lcmFNb2RlID09IENhbWVyYU1vZGUuVXNlciA/IFwidXNlclwiIDogXCJlbnZpcm9ubWVudFwiXHJcblxyXG4gICAgICAgIC8vIGdldCBjdXJyZW50IGZhY2luZyBtb2RlXHJcbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xyXG4gICAgICAgICAgICB2aWRlbzogeyB3aWR0aDogdGhpcy5jYW1lcmEuY2xpZW50V2lkdGgsIGhlaWdodDogdGhpcy5jYW1lcmEuY2xpZW50SGVpZ2h0LCBmYWNpbmdNb2RlOiBmYWNpbmdNb2RlIH0sXHJcbiAgICAgICAgICAgIGF1ZGlvOiBmYWxzZVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhLnNyY09iamVjdCA9IHN0cmVhbVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25DYW1lcmFMb2FkKCkge1xyXG4gICAgICAgIHRoaXMuYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5jYW1lcmEucGxheSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzdG9wQ2FtZXJhKCkge1xyXG4gICAgICAgIGNvbnN0IHNyYyA9IHRoaXMuY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgICAgIGlmICghc3JjKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdHJhY2tzID0gc3JjLmdldFRyYWNrcygpXHJcbiAgICAgICAgZm9yIChjb25zdCB0cmFjayBvZiB0cmFja3MpIHtcclxuICAgICAgICAgICAgdHJhY2suc3RvcCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLk5vbmVcclxuICAgICAgICB0aGlzLmFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYXB0dXJlSW1hZ2UoKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhckVycm9yTWVzc2FnZXMoKVxyXG5cclxuICAgICAgICBjb25zdCBzcmMgPSB0aGlzLmNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgICAgICBpZiAoIXNyYykge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRyYWNrID0gc3JjLmdldFZpZGVvVHJhY2tzKClbMF1cclxuICAgICAgICBpZiAoIXRyYWNrKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5pbWFnZUxvYWRlZC5wdWJsaXNoKHsgd2lkdGg6IHRoaXMuY2FtZXJhLnZpZGVvV2lkdGgsIGhlaWdodDogdGhpcy5jYW1lcmEudmlkZW9IZWlnaHQsIHNvdXJjZTogdGhpcy5jYW1lcmEgfSlcclxuICAgICAgICB0aGlzLnN0b3BDYW1lcmEoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2hvd0xpYnJhcnkoKSB7XHJcbiAgICAgICAgdGhpcy5sb2FkVWlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMubGlicmFyeVVpLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHJvY2Vzc0ZpbGUoZmlsZTogRmlsZSkge1xyXG4gICAgICAgIHRoaXMuY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpXHJcbiAgICAgICAgdGhpcy5sb2FkRnJvbVVybCh1cmwpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBsb2FkRnJvbVVybCh1cmw6IHN0cmluZykge1xyXG4gICAgICAgIHRoaXMuY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuICAgICAgICBjb25zdCBpbWcgPSBhd2FpdCBkb20ubG9hZEltYWdlKHVybClcclxuICAgICAgICB0aGlzLmltYWdlTG9hZGVkLnB1Ymxpc2goeyB3aWR0aDogaW1nLndpZHRoLCBoZWlnaHQ6IGltZy5oZWlnaHQsIHNvdXJjZTogaW1nIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjbGVhckVycm9yTWVzc2FnZXMoKSB7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRoaXMuZXJyb3JzRGl2KVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBMaWJyYXJ5VWkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsaWJyYXJ5RGl2ID0gZG9tLmJ5SWQoXCJsaWJyYXJ5VWlcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmV0dXJuQnV0dG9uID0gZG9tLmJ5SWQoXCJyZXR1cm5Gcm9tTGlicmFyeUJ1dHRvblwiKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IGltYWdlQ2hvc2VuID0gbmV3IENoYW5uZWw8c3RyaW5nPigpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgY2FuY2VsID0gbmV3IENoYW5uZWw8dm9pZD4oKTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLnJldHVybkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5vblJldHVybkNsaWNrKCkpXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICB0aGlzLmxpYnJhcnlEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmV0dXJuQ2xpY2soKSB7XHJcbiAgICAgICAgdGhpcy5saWJyYXJ5RGl2LmhpZGRlbiA9IHRydWVcclxuICAgICAgICB0aGlzLmNhbmNlbC5wdWJsaXNoKClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgUGxheVVpIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FudmFzID0gZG9tLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWxldHRlRGl2ID0gZG9tLmJ5SWQoXCJwYWxldHRlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVFbnRyeVRlbXBsYXRlID0gZG9tLmJ5SWQoXCJwYWxldHRlRW50cnlcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwbGF5VWlEaXYgPSBkb20uYnlJZChcInBsYXlVaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZXR1cm5CdXR0b24gPSBkb20uYnlJZChcInJldHVybkJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZUNhbnZhcyA9IG5ldyBPZmZzY3JlZW5DYW52YXMoMCwgMClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VDdHggPSB0aGlzLmltYWdlQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2VsbENhbnZhcyA9IG5ldyBPZmZzY3JlZW5DYW52YXMoMCwgMClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2VsbEN0eCA9IHRoaXMuY2VsbENhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVDYW52YXMgPSBuZXcgT2Zmc2NyZWVuQ2FudmFzKDAsIDApXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVDdHggPSB0aGlzLnBhbGV0dGVDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb2xvckNhbnZhcyA9IG5ldyBPZmZzY3JlZW5DYW52YXMoMCwgMClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29sb3JDdHggPSB0aGlzLmNvbG9yQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgY29tcGxldGUgPSBmYWxzZVxyXG4gICAgcHVibGljIHJlYWRvbmx5IHJldHVybiA9IG5ldyBDaGFubmVsPHZvaWQ+KClcclxuICAgIHByaXZhdGUgaW1hZ2VXaWR0aCA9IDBcclxuICAgIHByaXZhdGUgaW1hZ2VIZWlnaHQgPSAwXHJcbiAgICBwcml2YXRlIGNlbnRlclggPSAwXHJcbiAgICBwcml2YXRlIGNlbnRlclkgPSAwXHJcbiAgICBwcml2YXRlIHpvb20gPSAxXHJcbiAgICBwcml2YXRlIGRyYWcgPSBmYWxzZVxyXG4gICAgcHJpdmF0ZSBkcmFnZ2VkID0gZmFsc2VcclxuICAgIHByaXZhdGUgZHJhZ0xhc3QgPSBuZXcgZ2VvLlZlYzIoMCwgMClcclxuXHJcbiAgICAvLyBsaXN0IG9mIGNvbG9ycyB1c2UgdXNlZCBpbiBpbWFnZVxyXG4gICAgcHJpdmF0ZSBwYWxldHRlOiBudW1iZXJbXSA9IFtdXHJcblxyXG4gICAgLy8gaW1hZ2Ugb3ZlcmxheSBvZiBwaXhlbCB0byBwYWxldHRlIGluZGV4XHJcbiAgICBwcml2YXRlIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSA9IFtdXHJcblxyXG4gICAgLy8gcGFsZXR0ZSBvdmVybGF5IG9mIHBhbGV0dGUgaW5kZXggdG8gbGlzdCBvZiBwaXhlbHMgaGF2aW5nIHRoYXQgY29sb3JcclxuICAgIHByaXZhdGUgcGl4ZWxPdmVybGF5OiBTZXQ8bnVtYmVyPltdID0gW11cclxuXHJcbiAgICBwcml2YXRlIHNlbGVjdGVkUGFsZXR0ZUluZGV4OiBudW1iZXIgPSAtMVxyXG4gICAgcHJpdmF0ZSBzZXF1ZW5jZTogbnVtYmVyW10gPSBbXVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5jdHgpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FudmFzIGVsZW1lbnQgbm90IHN1cHBvcnRlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmNlbGxDdHgpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT2Zmc2NyZWVuQ2FudmFzIG5vdCBzdXBwb3J0ZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBlID0+IHRoaXMub25DYW52YXNDbGljayhlKSlcclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGUgPT4gdGhpcy5vbkNhbnZhc01vdXNlRG93bihlKSlcclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGUgPT4gdGhpcy5vbkNhbnZhc01vdXNlTW92ZShlKSlcclxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBlID0+IHRoaXMub25DYW52YXNNb3VzZVVwKGUpKVxyXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCBlID0+IHRoaXMub25DYW52YXNNb3VzZVdoZWVsKGUpKVxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLnBsYXlVaURpdiwgXCJjbGlja1wiLCBcIi5wYWxldHRlLWVudHJ5XCIsIChlKSA9PiB0aGlzLm9uUGFsZXR0ZUVudHJ5Q2xpY2soZSBhcyBNb3VzZUV2ZW50KSlcclxuICAgICAgICB0aGlzLnJldHVybkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5vblJldHVybigpKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzaG93KGltZzogQ0JOSW1hZ2VTb3VyY2UpIHtcclxuICAgICAgICB0aGlzLnBsYXlVaURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuY29tcGxldGUgPSBmYWxzZVxyXG5cclxuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0XHJcblxyXG4gICAgICAgIC8vIGZpdCBpbWFnZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc3QgW3csIGhdID0gZml0KGltZy53aWR0aCwgaW1nLmhlaWdodCwgbWF4RGltKVxyXG4gICAgICAgICAgICB0aGlzLmltYWdlV2lkdGggPSB3XHJcbiAgICAgICAgICAgIHRoaXMuaW1hZ2VIZWlnaHQgPSBoXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAvLyBkZWJ1Z1xyXG4gICAgICAgIC8vIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5pbWFnZVdpZHRoXHJcbiAgICAgICAgLy8gdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZUhlaWdodFxyXG4gICAgICAgIC8vIHRoaXMuY3R4LmRyYXdJbWFnZShpbWcuc291cmNlLCAwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KVxyXG4gICAgICAgIC8vIHF1YW50TWVkaWFuQ3V0KHRoaXMuY3R4LCA2NClcclxuXHJcbiAgICAgICAgLy8gcmV0dXJuXHJcblxyXG4gICAgICAgIC8vIGluaXRpYWxpemUgYWxsIGRyYXdpbmcgbGF5ZXJzXHJcbiAgICAgICAgdGhpcy5pbWFnZUNhbnZhcy53aWR0aCA9IHRoaXMuaW1hZ2VXaWR0aFxyXG4gICAgICAgIHRoaXMuaW1hZ2VDYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZUhlaWdodFxyXG4gICAgICAgIHRoaXMuaW1hZ2VDdHguZHJhd0ltYWdlKGltZy5zb3VyY2UsIDAsIDAsIHRoaXMuaW1hZ2VDYW52YXMud2lkdGgsIHRoaXMuaW1hZ2VDYW52YXMuaGVpZ2h0KVxyXG4gICAgICAgIHF1YW50TWVkaWFuQ3V0KHRoaXMuaW1hZ2VDdHgsIDY0KVxyXG5cclxuICAgICAgICBjb25zdCBpbWdEYXRhID0gdGhpcy5pbWFnZUN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0KVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZSA9IGV4dHJhY3RQYWxldHRlKGltZ0RhdGEpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlT3ZlcmxheSA9IGNyZWF0ZVBhbGV0dGVPdmVybGF5KGltZ0RhdGEsIHRoaXMucGFsZXR0ZSlcclxuICAgICAgICB0aGlzLnBpeGVsT3ZlcmxheSA9IGNyZWF0ZVBpeGVsT3ZlcmxheSh0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQsIHRoaXMucGFsZXR0ZSwgdGhpcy5wYWxldHRlT3ZlcmxheSlcclxuICAgICAgICB0aGlzLnBhbGV0dGUgPSBwcnVuZVBhbGxldGUodGhpcy5wYWxldHRlLCB0aGlzLnBpeGVsT3ZlcmxheSwgbWF4QmFja2dyb3VuZFBpeGVscywgdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0LCB0aGlzLmNvbG9yQ3R4KVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZU92ZXJsYXkgPSBjcmVhdGVQYWxldHRlT3ZlcmxheShpbWdEYXRhLCB0aGlzLnBhbGV0dGUpXHJcbiAgICAgICAgdGhpcy5waXhlbE92ZXJsYXkgPSBjcmVhdGVQaXhlbE92ZXJsYXkodGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0LCB0aGlzLnBhbGV0dGUsIHRoaXMucGFsZXR0ZU92ZXJsYXkpXHJcbiAgICAgICAgdGhpcy5jcmVhdGVQYWxldHRlVWkoKVxyXG4gICAgICAgIGRyYXdDZWxsSW1hZ2UodGhpcy5jZWxsQ3R4LCB0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQsIHRoaXMucGFsZXR0ZU92ZXJsYXkpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlQ2FudmFzLndpZHRoID0gdGhpcy5jZWxsQ2FudmFzLndpZHRoXHJcbiAgICAgICAgdGhpcy5wYWxldHRlQ2FudmFzLmhlaWdodCA9IHRoaXMuY2VsbENhbnZhcy5oZWlnaHRcclxuICAgICAgICB0aGlzLmNlbnRlclggPSB0aGlzLmNhbnZhcy53aWR0aCAvIDJcclxuICAgICAgICB0aGlzLmNlbnRlclkgPSB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyXHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG5cclxuICAgICAgICBpZiAodGhpcy5wYWxldHRlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0UGFsZXR0ZUVudHJ5KDApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNlcXVlbmNlID0gW11cclxuXHJcbiAgICAgICAgLy8gLy8gZGVidWcgLSBnbyBzdHJhaWdodCB0byBlbmQgc3RhdGVcclxuICAgICAgICAvLyBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaW1hZ2VIZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIC8vICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuaW1hZ2VXaWR0aDsgKyt4KSB7XHJcbiAgICAgICAgLy8gICAgICAgICB0aGlzLnNlcXVlbmNlLnB1c2goZmxhdCh4LCB5LCB0aGlzLmltYWdlV2lkdGgpKVxyXG4gICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAvLyByYW5kLnNodWZmbGUodGhpcy5zZXF1ZW5jZSlcclxuICAgICAgICAvLyB0aGlzLmV4ZWNEb25lU2VxdWVuY2UoKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBoaWRlKCkge1xyXG4gICAgICAgIHRoaXMucGxheVVpRGl2LmhpZGRlbiA9IHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmV0dXJuKCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMucmV0dXJuLnB1Ymxpc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY3JlYXRlUGFsZXR0ZVVpKCkge1xyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0aGlzLnBhbGV0dGVEaXYpXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnBhbGV0dGUubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgW3IsIGcsIGJdID0gdW5wYWNrQ29sb3IodGhpcy5wYWxldHRlW2ldKVxyXG4gICAgICAgICAgICBjb25zdCBsdW0gPSBjYWxjTHVtaW5hbmNlKHIsIGcsIGIpXHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy5wYWxldHRlRW50cnlUZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IGVudHJ5RGl2ID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLnBhbGV0dGUtZW50cnlcIikgYXMgSFRNTEVsZW1lbnRcclxuICAgICAgICAgICAgZW50cnlEaXYudGV4dENvbnRlbnQgPSBgJHtpICsgMX1gXHJcbiAgICAgICAgICAgIGVudHJ5RGl2LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGNvbG9yMlJHQkFTdHlsZShyLCBnLCBiKVxyXG4gICAgICAgICAgICBlbnRyeURpdi5zdHlsZS5jb2xvciA9IGx1bSA8IC41ID8gXCJ3aGl0ZVwiIDogXCJibGFja1wiXHJcbiAgICAgICAgICAgIHRoaXMucGFsZXR0ZURpdi5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkNhbnZhc0NsaWNrKGV2dDogTW91c2VFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZG9uJ3QgY291bnQgZHJhZyBhcyBjbGlja1xyXG4gICAgICAgIGlmICh0aGlzLmRyYWdnZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5kcmFnZ2VkID0gZmFsc2VcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB0cmFuc2Zvcm0gY2xpY2sgY29vcmRpbmF0ZXMgdG8gY2FudmFzIGNvb3JkaW5hdGVzXHJcbiAgICAgICAgY29uc3QgaW52VHJhbnNmb3JtID0gdGhpcy5jdHguZ2V0VHJhbnNmb3JtKCkuaW52ZXJzZSgpXHJcbiAgICAgICAgY29uc3QgZG9tUHQgPSBpbnZUcmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQoeyB4OiBldnQub2Zmc2V0WCwgeTogZXZ0Lm9mZnNldFkgfSlcclxuICAgICAgICBjb25zdCBbeCwgeV0gPSBjZWxsMkltYWdlKGRvbVB0LngsIGRvbVB0LnkpXHJcblxyXG4gICAgICAgIC8vIGlmIG5vdCBjb3JyZWN0IHBhbGV0dGUgY29sb3IsIGRvIG5vdGhpbmdcclxuICAgICAgICBjb25zdCBwYWxldHRlSWR4ID0gdGhpcy5wYWxldHRlT3ZlcmxheVtmbGF0KHgsIHksIHRoaXMuaW1hZ2VXaWR0aCldXHJcbiAgICAgICAgaWYgKHBhbGV0dGVJZHggIT09IHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXgpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpZiBhbHJlYWR5IGZpbGxlZCwgZG8gbm90aGluZ1xyXG4gICAgICAgIGNvbnN0IGZsYXRYWSA9IGZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKVxyXG4gICAgICAgIGNvbnN0IHBpeGVscyA9IHRoaXMucGl4ZWxPdmVybGF5W3BhbGV0dGVJZHhdXHJcbiAgICAgICAgaWYgKCFwaXhlbHMuaGFzKGZsYXRYWSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBbciwgZywgYl0gPSB1bnBhY2tDb2xvcih0aGlzLnBhbGV0dGVbcGFsZXR0ZUlkeF0pXHJcbiAgICAgICAgY29uc3QgW2N4LCBjeV0gPSBpbWFnZTJDZWxsKHgsIHkpXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5maWxsU3R5bGUgPSBjb2xvcjJSR0JBU3R5bGUociwgZywgYilcclxuICAgICAgICB0aGlzLmNvbG9yQ3R4LmZpbGxSZWN0KGN4LCBjeSwgY2VsbFNpemUsIGNlbGxTaXplKVxyXG5cclxuICAgICAgICAvLyByZW1vdmUgdGhlIHBpeGVsIGZyb20gb3ZlcmxheVxyXG4gICAgICAgIHBpeGVscy5kZWxldGUoZmxhdFhZKVxyXG4gICAgICAgIHRoaXMuc2VxdWVuY2UucHVzaChmbGF0WFkpXHJcblxyXG4gICAgICAgIGlmIChwaXhlbHMuc2l6ZSA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIG1hcmsgcGFsZXR0ZSBlbnRyeSBhcyBkb25lXHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnBhbGV0dGUtZW50cnlcIilbcGFsZXR0ZUlkeF1cclxuICAgICAgICBlbnRyeS5pbm5lckhUTUwgPSBcIiZjaGVjaztcIlxyXG4gICAgICAgIGNvbnN0IG5leHRQYWxldHRlSWR4ID0gdGhpcy5maW5kTmV4dFVuZmluaXNoZWRFbnRyeShwYWxldHRlSWR4KVxyXG4gICAgICAgIHRoaXMuc2VsZWN0UGFsZXR0ZUVudHJ5KG5leHRQYWxldHRlSWR4KVxyXG5cclxuICAgICAgICBpZiAobmV4dFBhbGV0dGVJZHggIT09IC0xKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYWxsIGNvbG9ycyBjb21wbGV0ZSEgc2hvdyBhbmltYXRpb24gb2YgdXNlciBjb2xvcmluZyBvcmlnaW5hbCBpbWFnZVxyXG4gICAgICAgIHRoaXMuZXhlY0RvbmVTZXF1ZW5jZSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkNhbnZhc01vdXNlRG93bihlOiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRyYWcgPSB0cnVlXHJcbiAgICAgICAgdGhpcy5kcmFnTGFzdCA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uQ2FudmFzTW91c2VVcChfOiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRyYWcgPSBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25DYW52YXNNb3VzZU1vdmUoZTogTW91c2VFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmRyYWcpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSB0aGlzLmN0eC5nZXRUcmFuc2Zvcm0oKS5pbnZlcnNlKClcclxuICAgICAgICBjb25zdCBzdGFydCA9IGdlby5WZWMyLmZyb21ET00odHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHRoaXMuZHJhZ0xhc3QpKVxyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIGNvbnN0IGVuZCA9IGdlby5WZWMyLmZyb21ET00odHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHBvc2l0aW9uKSlcclxuICAgICAgICBjb25zdCBkZWx0YSA9IGVuZC5zdWIoc3RhcnQpXHJcblxyXG4gICAgICAgIGlmIChNYXRoLmFicyhkZWx0YS54KSA+IDMgfHwgTWF0aC5hYnMoZGVsdGEueSkgPiAzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2VudGVyWCAtPSBkZWx0YS54XHJcbiAgICAgICAgICAgIHRoaXMuY2VudGVyWSAtPSBkZWx0YS55XHJcbiAgICAgICAgICAgIHRoaXMuZHJhZ0xhc3QgPSBwb3NpdGlvblxyXG4gICAgICAgICAgICB0aGlzLmRyYWdnZWQgPSB0cnVlXHJcbiAgICAgICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkNhbnZhc01vdXNlV2hlZWwoZTogV2hlZWxFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUuZGVsdGFZID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnpvb20gKj0gLjVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlLmRlbHRhWSA8IDApIHtcclxuICAgICAgICAgICAgdGhpcy56b29tICo9IDJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUGFsZXR0ZUVudHJ5Q2xpY2soZTogTW91c2VFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBlLnRhcmdldCBhcyBFbGVtZW50XHJcbiAgICAgICAgbGV0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgoZW50cnkpXHJcblxyXG4gICAgICAgIGlmIChpZHggPT09IHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXgpIHtcclxuICAgICAgICAgICAgaWR4ID0gLTFcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2VsZWN0UGFsZXR0ZUVudHJ5KGlkeClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNlbGVjdFBhbGV0dGVFbnRyeShpZHg6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXggPSBpZHhcclxuXHJcbiAgICAgICAgY29uc3QgZW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5wYWxldHRlLWVudHJ5XCIpKVxyXG4gICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgICAgICBlbnRyeS5jbGFzc0xpc3QucmVtb3ZlKFwic2VsZWN0ZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpZHggIT09IC0xKSB7XHJcbiAgICAgICAgICAgIGVudHJpZXNbaWR4XS5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGNsZWFyIHBhbGV0dGUgY2FudmFzXHJcbiAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5wYWxldHRlQ3R4XHJcbiAgICAgICAgY29uc3QgY2FudmFzID0gdGhpcy5wYWxldHRlQ2FudmFzXHJcbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpXHJcblxyXG4gICAgICAgIGlmIChpZHggPT0gLTEpIHtcclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhpZ2hsaWdodCByZW1haW5pbmcgcGl4ZWxzIGZvciB0aGlzIGNvbG9yXHJcbiAgICAgICAgY29uc3QgZm9udCA9IGN0eC5mb250XHJcbiAgICAgICAgY3R4LmZvbnQgPSBcImJvbGQgMTZweCBhcmlhbFwiXHJcbiAgICAgICAgY29uc3QgdGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGhcclxuICAgICAgICBjb25zdCBjZHh5ID0gY2VsbFNpemUgLyAyXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgcGl4ZWwgb2YgdGhpcy5waXhlbE92ZXJsYXlbaWR4XSkge1xyXG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSBpbWFnZTJDZWxsKC4uLnVuZmxhdChwaXhlbCwgdGhpcy5pbWFnZVdpZHRoKSlcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yMlJHQkFTdHlsZSgxOTEsIDE5MSwgMTkxLCAyNTUpXHJcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCh4LCB5LCBjZWxsU2l6ZSwgY2VsbFNpemUpXHJcblxyXG4gICAgICAgICAgICAvLyBkcmF3IGxhYmVsXHJcbiAgICAgICAgICAgIGNvbnN0IGxhYmVsID0gYCR7aWR4ICsgMX1gXHJcbiAgICAgICAgICAgIGNvbnN0IG1ldHJpY3MgPSBjdHgubWVhc3VyZVRleHQobGFiZWwpXHJcbiAgICAgICAgICAgIGNvbnN0IGN4ID0geCArIGNkeHkgLSBtZXRyaWNzLndpZHRoIC8gMlxyXG4gICAgICAgICAgICBjb25zdCBjeSA9IHkgKyBjZHh5ICsgdGV4dEhlaWdodCAvIDJcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiYmxhY2tcIlxyXG4gICAgICAgICAgICBjdHguZmlsbFRleHQobGFiZWwsIGN4LCBjeSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGN0eC5mb250ID0gZm9udFxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlZHJhdygpIHtcclxuICAgICAgICAvLyBub3RlIC0gY2xlYXIgaXMgc3ViamVjdCB0byB0cmFuc2Zvcm1cclxuICAgICAgICBjb25zdCBjdHggPSB0aGlzLmN0eFxyXG4gICAgICAgIHRoaXMuY3R4LnJlc2V0VHJhbnNmb3JtKClcclxuICAgICAgICBjb25zdCBodyA9IHRoaXMuY2FudmFzLndpZHRoIC8gMiAvIHRoaXMuem9vbVxyXG4gICAgICAgIGNvbnN0IGhoID0gdGhpcy5jYW52YXMuaGVpZ2h0IC8gMiAvIHRoaXMuem9vbVxyXG5cclxuICAgICAgICB0aGlzLmNlbnRlclggPSBtYXRoLmNsYW1wKHRoaXMuY2VudGVyWCwgMCwgdGhpcy5jZWxsQ2FudmFzLndpZHRoKVxyXG4gICAgICAgIHRoaXMuY2VudGVyWSA9IG1hdGguY2xhbXAodGhpcy5jZW50ZXJZLCAwLCB0aGlzLmNlbGxDYW52YXMuaGVpZ2h0KVxyXG4gICAgICAgIHRoaXMuY3R4LnNjYWxlKHRoaXMuem9vbSwgdGhpcy56b29tKVxyXG4gICAgICAgIHRoaXMuY3R4LnRyYW5zbGF0ZSgtdGhpcy5jZW50ZXJYICsgaHcsIC10aGlzLmNlbnRlclkgKyBoaClcclxuXHJcbiAgICAgICAgdmFyIGludlRyYW5zZm9ybSA9IGN0eC5nZXRUcmFuc2Zvcm0oKS5pbnZlcnNlKClcclxuICAgICAgICBjb25zdCB0bCA9IGludlRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh7IHg6IDAsIHk6IDAgfSlcclxuICAgICAgICBjb25zdCBiciA9IGludlRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh7IHg6IHRoaXMuY2FudmFzLndpZHRoLCB5OiB0aGlzLmNhbnZhcy5oZWlnaHQgfSlcclxuICAgICAgICBjdHguY2xlYXJSZWN0KHRsLngsIHRsLnksIGJyLnggLSB0bC54LCBici55IC0gdGwueSlcclxuICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuY2VsbENhbnZhcywgMCwgMClcclxuICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMucGFsZXR0ZUNhbnZhcywgMCwgMClcclxuICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuY29sb3JDYW52YXMsIDAsIDApXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmaW5kTmV4dFVuZmluaXNoZWRFbnRyeShpOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLnBhbGV0dGUubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgaWkgPSBpICUgdGhpcy5wYWxldHRlLmxlbmd0aFxyXG4gICAgICAgICAgICBpZiAodGhpcy5waXhlbE92ZXJsYXlbaV0uc2l6ZSA+IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpaVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gLTFcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGV4ZWNEb25lU2VxdWVuY2UoKSB7XHJcbiAgICAgICAgLy8gc2V0IGFzIGRvbmVcclxuICAgICAgICB0aGlzLmNvbXBsZXRlID0gdHJ1ZVxyXG5cclxuICAgICAgICB0aGlzLmN0eC5yZXNldFRyYW5zZm9ybSgpXHJcblxyXG4gICAgICAgIC8vIGRyYXcgb25lIHBpeGVsIGF0IGEgdGltZSB0byBjb2xvciBjYW52YXNcclxuICAgICAgICAvLyBvdnJsYXkgb250byBjYW52YXNcclxuICAgICAgICBjb25zdCBkYXRhID0gdGhpcy5pbWFnZUN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0KS5kYXRhXHJcbiAgICAgICAgdGhpcy5jdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpXHJcbiAgICAgICAgY29uc3Qgem9vbSA9IE1hdGgubWluKHRoaXMuY2FudmFzLmNsaWVudFdpZHRoIC8gdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHQgLyB0aGlzLmltYWdlSGVpZ2h0KVxyXG4gICAgICAgIHRoaXMuY3R4LnNjYWxlKHpvb20sIHpvb20pXHJcblxyXG4gICAgICAgIC8vIGNvbG9yIGFzIHVzZXIgZGlkXHJcbiAgICAgICAgY29uc3QgcGl4ZWwgPSBuZXcgSW1hZ2VEYXRhKDEsIDEpXHJcbiAgICAgICAgY29uc3QgcGl4ZWxEYXRhID0gcGl4ZWwuZGF0YVxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguY2FudmFzLndpZHRoID0gdGhpcy5pbWFnZVdpZHRoXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5jYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZUhlaWdodFxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY29sb3JDYW52YXMud2lkdGgsIHRoaXMuY29sb3JDYW52YXMuaGVpZ2h0KVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc2VxdWVuY2UubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgeHkgPSB0aGlzLnNlcXVlbmNlW2ldXHJcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IHVuZmxhdCh4eSwgdGhpcy5pbWFnZVdpZHRoKVxyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB4eSAqIDRcclxuICAgICAgICAgICAgcGl4ZWxEYXRhWzBdID0gZGF0YVtvZmZzZXRdXHJcbiAgICAgICAgICAgIHBpeGVsRGF0YVsxXSA9IGRhdGFbb2Zmc2V0ICsgMV1cclxuICAgICAgICAgICAgcGl4ZWxEYXRhWzJdID0gZGF0YVtvZmZzZXQgKyAyXVxyXG4gICAgICAgICAgICBwaXhlbERhdGFbM10gPSAyNTVcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29sb3JDdHgucHV0SW1hZ2VEYXRhKHBpeGVsLCB4LCB5KVxyXG4gICAgICAgICAgICB0aGlzLmN0eC5kcmF3SW1hZ2UodGhpcy5jb2xvckNhbnZhcywgMCwgMClcclxuICAgICAgICAgICAgaWYgKGkgJSA2NCA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB1dGlsLndhaXQoMClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQ0JOIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbG9hZFVpID0gbmV3IExvYWRVaSgpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBsYXlVaSA9IG5ldyBQbGF5VWkoKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMubG9hZFVpLnNob3coKVxyXG4gICAgICAgIHRoaXMubG9hZFVpLmltYWdlTG9hZGVkLnN1YmNyaWJlKHggPT4gdGhpcy5vbkltYWdlTG9hZGVkKHgpKVxyXG4gICAgICAgIHRoaXMucGxheVVpLnJldHVybi5zdWJjcmliZSgoKSA9PiB0aGlzLm9uUmV0dXJuKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkltYWdlTG9hZGVkKGltZzogQ0JOSW1hZ2VTb3VyY2UpIHtcclxuICAgICAgICB0aGlzLmxvYWRVaS5oaWRlKClcclxuICAgICAgICB0aGlzLnBsYXlVaS5zaG93KGltZylcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmV0dXJuKCkge1xyXG4gICAgICAgIHRoaXMucGxheVVpLmhpZGUoKVxyXG4gICAgICAgIHRoaXMubG9hZFVpLnNob3coKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdFBhbGV0dGUoaW1nRGF0YTogSW1hZ2VEYXRhKTogbnVtYmVyW10ge1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBkYXRhIH0gPSBpbWdEYXRhXHJcbiAgICBjb25zdCByb3dQaXRjaCA9IHdpZHRoICogNFxyXG5cclxuICAgIC8vIGZpbmQgdW5pcXVlIGNvbG9ycywgY3JlYXRlIGVudHJ5IGZvciBlYWNoXHJcbiAgICBjb25zdCBwYWxldHRlID0gbmV3IFNldDxudW1iZXI+KClcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHJvd1BpdGNoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIC8vIHBhY2sgY29sb3IgdG8gYSB1bmlxdWUgdmFsdWVcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHggKiA0XHJcbiAgICAgICAgICAgIGNvbnN0IHIgPSBkYXRhW29mZnNldF1cclxuICAgICAgICAgICAgY29uc3QgZyA9IGRhdGFbb2Zmc2V0ICsgMV1cclxuICAgICAgICAgICAgY29uc3QgYiA9IGRhdGFbb2Zmc2V0ICsgMl1cclxuICAgICAgICAgICAgY29uc3QgYSA9IGRhdGFbb2Zmc2V0ICsgM11cclxuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBwYWNrQ29sb3IociwgZywgYiwgYSlcclxuICAgICAgICAgICAgcGFsZXR0ZS5hZGQodmFsdWUpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBbLi4ucGFsZXR0ZV1cclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBhbiBvdmVybGF5IHRoYXQgbWFwcyBlYWNoIHBpeGVsIHRvIHRoZSBpbmRleCBvZiBpdHMgcGFsZXR0ZSBlbnRyeVxyXG4gKiBAcGFyYW0gaW1nRGF0YSBpbWFnZSBkYXRhXHJcbiAqIEBwYXJhbSBwYWxldHRlIHBhbGV0dGUgY29sb3JzXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVQYWxldHRlT3ZlcmxheShpbWdEYXRhOiBJbWFnZURhdGEsIHBhbGV0dGU6IG51bWJlcltdKTogbnVtYmVyW10ge1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBkYXRhIH0gPSBpbWdEYXRhXHJcbiAgICBjb25zdCBwYWxldHRlTWFwID0gYXJyYXkubWFwSW5kaWNlcyhwYWxldHRlKVxyXG4gICAgY29uc3Qgcm93UGl0Y2ggPSB3aWR0aCAqIDRcclxuICAgIGNvbnN0IG92ZXJsYXkgPSBhcnJheS51bmlmb3JtKC0xLCB3aWR0aCAqIGhlaWdodClcclxuXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiByb3dQaXRjaFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICAvLyBwYWNrIGNvbG9yIHRvIGEgdW5pcXVlIHZhbHVlXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4ICogNFxyXG4gICAgICAgICAgICBjb25zdCByID0gZGF0YVtvZmZzZXRdXHJcbiAgICAgICAgICAgIGNvbnN0IGcgPSBkYXRhW29mZnNldCArIDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGIgPSBkYXRhW29mZnNldCArIDJdXHJcbiAgICAgICAgICAgIGNvbnN0IGEgPSBkYXRhW29mZnNldCArIDNdXHJcbiAgICAgICAgICAgIGNvbnN0IHJnYmEgPSBwYWNrQ29sb3IociwgZywgYiwgYSlcclxuICAgICAgICAgICAgY29uc3QgaWR4ID0gcGFsZXR0ZU1hcC5nZXQocmdiYSkgPz8gLTFcclxuICAgICAgICAgICAgb3ZlcmxheVt5ICogd2lkdGggKyB4XSA9IGlkeFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gb3ZlcmxheVxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGFuIG92ZXJsYXkgdGhhdCBtYXBzIGVhY2ggcGFsZXR0ZSBlbnRyeSB0byBhIGxpc3Qgb2YgcGl4ZWxzIHdpdGggaXRzIGNvbG9yXHJcbiAqIEBwYXJhbSBpbWdEYXRhIFxyXG4gKiBAcGFyYW0gcGFsZXR0ZSBcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZVBpeGVsT3ZlcmxheSh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcGFsZXR0ZTogbnVtYmVyW10sIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSk6IFNldDxudW1iZXI+W10ge1xyXG4gICAgY29uc3Qgb3ZlcmxheSA9IGFycmF5LmdlbmVyYXRlKHBhbGV0dGUubGVuZ3RoLCAoKSA9PiBuZXcgU2V0PG51bWJlcj4oKSlcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHdpZHRoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIC8vIHBhY2sgY29sb3IgdG8gYSB1bmlxdWUgdmFsdWVcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgcGFsZXR0ZUlkeCA9IHBhbGV0dGVPdmVybGF5W29mZnNldF1cclxuICAgICAgICAgICAgaWYgKHBhbGV0dGVJZHggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBmbGF0Q29vcmQgPSBmbGF0KHgsIHksIHdpZHRoKVxyXG4gICAgICAgICAgICBvdmVybGF5W3BhbGV0dGVJZHhdLmFkZChmbGF0Q29vcmQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBvdmVybGF5XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhY2tDb2xvcihyOiBudW1iZXIsIGc6IG51bWJlciwgYjogbnVtYmVyLCBhOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgY29uc3QgdmFsdWUgPSByIDw8IDI0IHwgZyA8PCAxNiB8IGIgPDwgOCB8IGFcclxuICAgIHJldHVybiB2YWx1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiB1bnBhY2tDb2xvcih4OiBudW1iZXIpOiBDb2xvciB7XHJcbiAgICBjb25zdCByID0gKHggJiAweEZGMDAwMDAwKSA+Pj4gMjRcclxuICAgIGNvbnN0IGcgPSAoeCAmIDB4MDBGRjAwMDApID4+PiAxNlxyXG4gICAgY29uc3QgYiA9ICh4ICYgMHgwMDAwRkYwMCkgPj4+IDhcclxuICAgIGNvbnN0IGEgPSB4ICYgMHgwMDAwMDBGRlxyXG5cclxuICAgIHJldHVybiBbciwgZywgYiwgYV1cclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY0x1bWluYW5jZShyOiBudW1iZXIsIGc6IG51bWJlciwgYjogbnVtYmVyKSB7XHJcbiAgICBjb25zdCBsID0gMC4yMTI2ICogKHIgLyAyNTUpICsgMC43MTUyICogKGcgLyAyNTUpICsgMC4wNzIyICogKGIgLyAyNTUpXHJcbiAgICByZXR1cm4gbFxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3Q2VsbEltYWdlKGN0eDogT2Zmc2NyZWVuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcGFsZXR0ZU92ZXJsYXk6IG51bWJlcltdKSB7XHJcbiAgICBjb25zdCBjZWxsSW1hZ2VXaWR0aCA9IHdpZHRoICogKGNlbGxTaXplICsgMSkgKyAxXHJcbiAgICBjb25zdCBjZWxsSW1hZ2VIZWlnaHQgPSBoZWlnaHQgKiAoY2VsbFNpemUgKyAxKSArIDFcclxuXHJcbiAgICAvLyBzaXplIGNhbnZhc1xyXG4gICAgY3R4LmNhbnZhcy53aWR0aCA9IGNlbGxJbWFnZVdpZHRoXHJcbiAgICBjdHguY2FudmFzLmhlaWdodCA9IGNlbGxJbWFnZUhlaWdodFxyXG5cclxuICAgIC8vIGRyYXcgaG9yaXpvbnRhbCBncmlkIGxpbmVzXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8PSBoZWlnaHQ7ICsraSkge1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KDAsIGkgKiAoY2VsbFNpemUgKyAxKSwgY2VsbEltYWdlV2lkdGgsIDEpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gZHJhdyB2ZXJ0aWNhbCBncmlkIGxpbmVzXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8PSB3aWR0aDsgKytpKSB7XHJcbiAgICAgICAgY3R4LnN0cm9rZVJlY3QoaSAqIChjZWxsU2l6ZSArIDEpLCAwLCAxLCBjZWxsSW1hZ2VIZWlnaHQpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gZHJhdyAjc1xyXG4gICAgY29uc3QgZm9udCA9IGN0eC5mb250XHJcbiAgICBjdHguZm9udCA9IFwiMTZweCBhcmlhbFwiXHJcbiAgICBjb25zdCB0ZXh0SGVpZ2h0ID0gY3R4Lm1lYXN1cmVUZXh0KFwiTVwiKS53aWR0aFxyXG4gICAgY29uc3QgY2R4eSA9IGNlbGxTaXplIC8gMlxyXG5cclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHdpZHRoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGNvbnN0IHBhbGV0dGVJZHggPSBwYWxldHRlT3ZlcmxheVtvZmZzZXRdXHJcbiAgICAgICAgICAgIGlmIChwYWxldHRlSWR4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgLy8gZmlsbCB0aGlzIHBhcnQgb2YgdGhlIGltYWdlIGluIHdpdGggc29saWQgY29sb3IhXHJcblxyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgbGFiZWwgPSBgJHtwYWxldHRlSWR4ICsgMX1gXHJcbiAgICAgICAgICAgIGNvbnN0IG1ldHJpY3MgPSBjdHgubWVhc3VyZVRleHQobGFiZWwpXHJcbiAgICAgICAgICAgIGNvbnN0IGN4ID0geCAqIChjZWxsU2l6ZSArIDEpICsgY2R4eSArIDEgLSBtZXRyaWNzLndpZHRoIC8gMlxyXG4gICAgICAgICAgICBjb25zdCBjeSA9IHkgKiAoY2VsbFNpemUgKyAxKSArIGNkeHkgKyAxICsgdGV4dEhlaWdodCAvIDJcclxuICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGxhYmVsLCBjeCwgY3kpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGN0eC5mb250ID0gZm9udFxyXG59XHJcblxyXG5mdW5jdGlvbiBmaXQod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIG1heFNpemU6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgaWYgKHdpZHRoID4gaGVpZ2h0ICYmIHdpZHRoID4gbWF4U2l6ZSkge1xyXG4gICAgICAgIGhlaWdodCA9IG1heERpbSAqIGhlaWdodCAvIHdpZHRoXHJcbiAgICAgICAgcmV0dXJuIFtNYXRoLmZsb29yKG1heFNpemUpLCBNYXRoLmZsb29yKGhlaWdodCldXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGhlaWdodCA+IHdpZHRoICYmIGhlaWdodCA+IG1heFNpemUpIHtcclxuICAgICAgICB3aWR0aCA9IG1heERpbSAqIHdpZHRoIC8gaGVpZ2h0XHJcbiAgICAgICAgcmV0dXJuIFtNYXRoLmZsb29yKHdpZHRoKSwgTWF0aC5mbG9vcihtYXhTaXplKV1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gW01hdGguZmxvb3Iod2lkdGgpLCBNYXRoLmZsb29yKGhlaWdodCldXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZsYXQoeDogbnVtYmVyLCB5OiBudW1iZXIsIHJvd1BpdGNoOiBudW1iZXIpIHtcclxuICAgIHJldHVybiB5ICogcm93UGl0Y2ggKyB4XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVuZmxhdChpOiBudW1iZXIsIHJvd1BpdGNoOiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIHJldHVybiBbaSAlIHJvd1BpdGNoLCBNYXRoLmZsb29yKGkgLyByb3dQaXRjaCldXHJcbn1cclxuXHJcbi8qKlxyXG4gICAqIENvbnZlcnQgYW4gaW1hZ2UgeCBvciB5IGNvb3JkaW5hdGUgdG8gdG9wIG9yIGxlZnQgb2YgY2JuIGNlbGwgY29udGFpbmluZyB0aGF0IHBpeGVsXHJcbiAgICogQHBhcmFtIGNvb3JkIHggb3IgeSBjb29yZGluYXRlXHJcbiAgICovXHJcbmZ1bmN0aW9uIGltYWdlMkNlbGxDb29yZChjb29yZDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBjb29yZCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG59XHJcblxyXG4vKipcclxuICogQ29udmVydCBhIGNibiB4IG9yIHkgY29vcmRpbmF0ZSB0byB0b3Agb3IgbGVmdCBvZiBjYm4gY2VsbCBjb250YWluaW5nIHRoYXQgcGl4ZWxcclxuICogQHBhcmFtIGNvb3JkIHggb3IgeSBjb29yZGluYXRlXHJcbiAqL1xyXG5mdW5jdGlvbiBjZWxsMkltYWdlQ29vcmQoY29vcmQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gTWF0aC5mbG9vcigoY29vcmQgLSAxKSAvIChjZWxsU2l6ZSArIDEpKVxyXG59XHJcblxyXG4vKipcclxuICAgKiBDb252ZXJ0IGFuIGltYWdlIHggb3IgeSBjb29yZGluYXRlIHRvIHRvcCBvciBsZWZ0IG9mIGNibiBjZWxsIGNvbnRhaW5pbmcgdGhhdCBwaXhlbFxyXG4gICAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gICAqL1xyXG5mdW5jdGlvbiBpbWFnZTJDZWxsKHg6IG51bWJlciwgeTogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICByZXR1cm4gW2ltYWdlMkNlbGxDb29yZCh4KSwgaW1hZ2UyQ2VsbENvb3JkKHkpXVxyXG59XHJcblxyXG4vKipcclxuICogQ29udmVydCBhIGNibiB4IG9yIHkgY29vcmRpbmF0ZSB0byB0b3Agb3IgbGVmdCBvZiBjYm4gY2VsbCBjb250YWluaW5nIHRoYXQgcGl4ZWxcclxuICogQHBhcmFtIGNvb3JkIHggb3IgeSBjb29yZGluYXRlXHJcbiAqL1xyXG5mdW5jdGlvbiBjZWxsMkltYWdlKHg6IG51bWJlciwgeTogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICByZXR1cm4gW2NlbGwySW1hZ2VDb29yZCh4KSwgY2VsbDJJbWFnZUNvb3JkKHkpXVxyXG59XHJcblxyXG4vKipcclxuICogY29udmVydCByZ2JhIGNvb3JkaW5hdGVzIHRvIGEgc3R5bGUgc3RyaW5nXHJcbiAqIEBwYXJhbSByIHJlZFxyXG4gKiBAcGFyYW0gZyBncmVlblxyXG4gKiBAcGFyYW0gYiBibHVlXHJcbiAqIEBwYXJhbSBhIGFscGhhXHJcbiAqL1xyXG5mdW5jdGlvbiBjb2xvcjJSR0JBU3R5bGUocjogbnVtYmVyLCBnOiBudW1iZXIsIGI6IG51bWJlciwgYTogbnVtYmVyID0gMjU1KSB7XHJcbiAgICByZXR1cm4gYHJnYmEoJHtyfSwgJHtnfSwgJHtifSwgJHthIC8gMjU1fSlgXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHF1YW50TWVkaWFuQ3V0KGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEIHwgT2Zmc2NyZWVuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCBtYXhDb2xvcnM6IG51bWJlcikge1xyXG4gICAgaW50ZXJmYWNlIFBpeGVsIHtcclxuICAgICAgICBvZmZzZXQ6IG51bWJlclxyXG4gICAgICAgIHI6IG51bWJlclxyXG4gICAgICAgIGc6IG51bWJlclxyXG4gICAgICAgIGI6IG51bWJlclxyXG4gICAgfVxyXG5cclxuICAgIC8vIG1heENvbG9ycyBtdXN0IGJlIGEgcG93ZXIgb2YgMiBmb3IgdGhpcyBhbGdvcml0aG1cclxuICAgIG1heENvbG9ycyA9IG1hdGgubmV4dFBvdzIobWF4Q29sb3JzKVxyXG4gICAgY29uc3QgaW1nRGF0YSA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgY3R4LmNhbnZhcy53aWR0aCwgY3R4LmNhbnZhcy5oZWlnaHQpXHJcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQsIGRhdGEgfSA9IGltZ0RhdGFcclxuICAgIGNvbnN0IHJvd1BpdGNoID0gd2lkdGggKiA0XHJcblxyXG4gICAgY29uc3QgYnVja2V0cyA9IG5ldyBBcnJheTxQaXhlbFtdPigpXHJcbiAgICBidWNrZXRzLnB1c2goY3JlYXRlSW5pdGlhbEJ1Y2tldCgpKVxyXG5cclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgY29uc3QgYnVja2V0ID0gY2hvb3NlQnVja2V0KGNvbG9yUmFuZ2VUb2xlcmFuY2UsIGJ1Y2tldHMpXHJcbiAgICAgICAgaWYgKCFidWNrZXQpIHtcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGJ1Y2tldHMucHVzaChzcGxpdEJ1Y2tldChidWNrZXQpKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGNhbGN1bGF0ZSB0aGUgYXZlcmFnZSBjb2xvciBmb3IgZWFjaCBidWNrZXRcclxuICAgIGNvbnN0IGNvbG9ycyA9IG5ldyBBcnJheTxbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0+KClcclxuICAgIGZvciAoY29uc3QgYnVja2V0IG9mIGJ1Y2tldHMpIHtcclxuICAgICAgICBsZXQgciA9IDBcclxuICAgICAgICBsZXQgZyA9IDBcclxuICAgICAgICBsZXQgYiA9IDBcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBwaXhlbCBvZiBidWNrZXQpIHtcclxuICAgICAgICAgICAgciArPSBwaXhlbC5yXHJcbiAgICAgICAgICAgIGcgKz0gcGl4ZWwuZ1xyXG4gICAgICAgICAgICBiICs9IHBpeGVsLmJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHIgLz0gYnVja2V0Lmxlbmd0aFxyXG4gICAgICAgIGcgLz0gYnVja2V0Lmxlbmd0aFxyXG4gICAgICAgIGIgLz0gYnVja2V0Lmxlbmd0aFxyXG5cclxuICAgICAgICBjb2xvcnMucHVzaChbTWF0aC5yb3VuZChyKSwgTWF0aC5yb3VuZChnKSwgTWF0aC5yb3VuZChiKV0pXHJcbiAgICB9XHJcblxyXG4gICAgLy8gaXRlcmF0ZSB0aHJvdWdoIGVhY2ggYnVja2V0LCByZXBsYWNpbmcgcGl4ZWwgY29sb3Igd2l0aCBidWNrZXQgY29sb3IgZm9yIGVhY2ggcGl4ZWxcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVja2V0cy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGJ1Y2tldCA9IGJ1Y2tldHNbaV1cclxuICAgICAgICBjb25zdCBbciwgZywgYl0gPSBjb2xvcnNbaV1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBwaXhlbCBvZiBidWNrZXQpIHtcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gcGl4ZWwub2Zmc2V0ICogNFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldF0gPSByXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICsgMV0gPSBnXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICsgMl0gPSBiXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGN0eC5wdXRJbWFnZURhdGEoaW1nRGF0YSwgMCwgMClcclxuXHJcbiAgICBmdW5jdGlvbiBjcmVhdGVJbml0aWFsQnVja2V0KCk6IFBpeGVsW10ge1xyXG4gICAgICAgIC8vIGNyZWF0ZSBpbml0aWFsIGJ1Y2tldFxyXG4gICAgICAgIGNvbnN0IGJ1Y2tldCA9IG5ldyBBcnJheTxQaXhlbD4oKVxyXG4gICAgICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiByb3dQaXRjaFxyXG4gICAgICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyArK3gpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4ICogNFxyXG4gICAgICAgICAgICAgICAgY29uc3QgciA9IGRhdGFbb2Zmc2V0XVxyXG4gICAgICAgICAgICAgICAgY29uc3QgZyA9IGRhdGFbb2Zmc2V0ICsgMV1cclxuICAgICAgICAgICAgICAgIGNvbnN0IGIgPSBkYXRhW29mZnNldCArIDJdXHJcblxyXG4gICAgICAgICAgICAgICAgLy8gcGFjayBpbnRvIGJ1Y2tldFxyXG4gICAgICAgICAgICAgICAgY29uc3QgcGl4ZWw6IFBpeGVsID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldDogZmxhdCh4LCB5LCB3aWR0aCksXHJcbiAgICAgICAgICAgICAgICAgICAgcjogcixcclxuICAgICAgICAgICAgICAgICAgICBnOiBnLFxyXG4gICAgICAgICAgICAgICAgICAgIGI6IGJcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBidWNrZXQucHVzaChwaXhlbClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGJ1Y2tldFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGNSYW5nZShwaXhlbHM6IFBpeGVsW10sIHNlbGVjdG9yOiAoeDogUGl4ZWwpID0+IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IG1pbiA9IEluZmluaXR5XHJcbiAgICAgICAgbGV0IG1heCA9IC1JbmZpbml0eVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHBpeGVsIG9mIHBpeGVscykge1xyXG4gICAgICAgICAgICBtaW4gPSBNYXRoLm1pbihzZWxlY3RvcihwaXhlbCksIG1pbilcclxuICAgICAgICAgICAgbWF4ID0gTWF0aC5tYXgoc2VsZWN0b3IocGl4ZWwpLCBtYXgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbWF4IC0gbWluXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2hvb3NlQnVja2V0KHRvbGVyYW5jZTogbnVtYmVyLCBidWNrZXRzOiBQaXhlbFtdW10pOiBQaXhlbFtdIHwgbnVsbCB7XHJcbiAgICAgICAgbGV0IG1heFJhbmdlID0gLUluZmluaXR5XHJcbiAgICAgICAgbGV0IG1heEJ1Y2tldDogUGl4ZWxbXSB8IG51bGwgPSBudWxsXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgYnVja2V0IG9mIGJ1Y2tldHMpIHtcclxuICAgICAgICAgICAgY29uc3QgcmFuZ2VSID0gY2FsY1JhbmdlKGJ1Y2tldCwgcCA9PiBwLnIpXHJcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlRyA9IGNhbGNSYW5nZShidWNrZXQsIHAgPT4gcC5nKVxyXG4gICAgICAgICAgICBjb25zdCByYW5nZUIgPSBjYWxjUmFuZ2UoYnVja2V0LCBwID0+IHAuYilcclxuICAgICAgICAgICAgbGV0IHJhbmdlID0gMFxyXG4gICAgICAgICAgICBpZiAocmFuZ2VSID4gcmFuZ2VHICYmIHJhbmdlUiA+IHJhbmdlQikge1xyXG4gICAgICAgICAgICAgICAgcmFuZ2UgPSByYW5nZVJcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChyYW5nZUcgPiByYW5nZVIpIHtcclxuICAgICAgICAgICAgICAgIHJhbmdlID0gcmFuZ2VHXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByYW5nZSA9IHJhbmdlQlxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocmFuZ2UgPiBtYXhSYW5nZSkge1xyXG4gICAgICAgICAgICAgICAgbWF4UmFuZ2UgPSByYW5nZVxyXG4gICAgICAgICAgICAgICAgbWF4QnVja2V0ID0gYnVja2V0XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtYXhSYW5nZSA+IHRvbGVyYW5jZSA/IG1heEJ1Y2tldCA6IG51bGxcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzcGxpdEJ1Y2tldChidWNrZXQ6IFBpeGVsW10pOiBQaXhlbFtdIHtcclxuICAgICAgICBjb25zdCByYW5nZVIgPSBjYWxjUmFuZ2UoYnVja2V0LCBwID0+IHAucilcclxuICAgICAgICBjb25zdCByYW5nZUcgPSBjYWxjUmFuZ2UoYnVja2V0LCBwID0+IHAuZylcclxuICAgICAgICBjb25zdCByYW5nZUIgPSBjYWxjUmFuZ2UoYnVja2V0LCBwID0+IHAuYilcclxuXHJcbiAgICAgICAgaWYgKHJhbmdlUiA+IHJhbmdlRyAmJiByYW5nZVIgPiByYW5nZUIpIHtcclxuICAgICAgICAgICAgYnVja2V0LnNvcnQoKGEsIGIpID0+IGEuciAtIGIucilcclxuICAgICAgICB9IGVsc2UgaWYgKHJhbmdlRyA+IHJhbmdlUikge1xyXG4gICAgICAgICAgICBidWNrZXQuc29ydCgoYSwgYikgPT4gYS5nIC0gYi5nKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGJ1Y2tldC5zb3J0KChhLCBiKSA9PiBhLmIgLSBiLmIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtaWRkbGUgPSBNYXRoLmZsb29yKGJ1Y2tldC5sZW5ndGggLyAyKVxyXG4gICAgICAgIGNvbnN0IG5ld0J1Y2tldCA9IGJ1Y2tldC5zcGxpY2UobWlkZGxlKVxyXG4gICAgICAgIHJldHVybiBuZXdCdWNrZXRcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcHJ1bmVQYWxsZXRlKHBhbGV0dGU6IG51bWJlcltdLCBwaXhlbE92ZXJsYXk6IFNldDxudW1iZXI+W10sIG1heFBpeGVsczogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgY3R4OiBPZmZzY3JlZW5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQpOiBudW1iZXJbXSB7XHJcbiAgICBjb25zdCBpbmRpY2VzVG9LZWVwID0gbmV3IFNldDxudW1iZXI+KGFycmF5LnNlcXVlbmNlKDAsIHBhbGV0dGUubGVuZ3RoKSlcclxuXHJcbiAgICBjdHguY2FudmFzLndpZHRoID0gd2lkdGggKiAoY2VsbFNpemUgKyAxKSArIDFcclxuICAgIGN0eC5jYW52YXMuaGVpZ2h0ID0gaGVpZ2h0ICogKGNlbGxTaXplICsgMSkgKyAxXHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwaXhlbE92ZXJsYXkubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCBwaXhlbHMgPSBwaXhlbE92ZXJsYXlbaV1cclxuICAgICAgICBpZiAocGl4ZWxzLnNpemUgPCBtYXhQaXhlbHMpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpdGVyLmFsbChwaXhlbHMsIHggPT4gIWlzQm9yZGVyUGl4ZWwoLi4udW5mbGF0KHgsIHdpZHRoKSwgd2lkdGgsIGhlaWdodCkpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBmaWxsIHRoZXNlIHBpeGVscyBpbiBpbWFnZSB3aXRoIGFwcHJvcHJpYXRlIGNvbG9yXHJcbiAgICAgICAgY29uc3QgW3IsIGcsIGJdID0gdW5wYWNrQ29sb3IocGFsZXR0ZVtpXSlcclxuICAgICAgICBmb3IgKGNvbnN0IHh5IG9mIHBpeGVscykge1xyXG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSB1bmZsYXQoeHksIHdpZHRoKVxyXG4gICAgICAgICAgICBjb25zdCBbY3gsIGN5XSA9IGltYWdlMkNlbGwoeCwgeSlcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yMlJHQkFTdHlsZShyLCBnLCBiKVxyXG4gICAgICAgICAgICBjdHguZmlsbFJlY3QoY3gsIGN5LCBjZWxsU2l6ZSwgY2VsbFNpemUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpbmRpY2VzVG9LZWVwLmRlbGV0ZShpKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG5ld1BhbGV0dGUgPSBbLi4uaW5kaWNlc1RvS2VlcF0ubWFwKHggPT4gcGFsZXR0ZVt4XSlcclxuICAgIHJldHVybiBuZXdQYWxldHRlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzQm9yZGVyUGl4ZWwoeDogbnVtYmVyLCB5OiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4geCA9PT0gMCB8fCB5ID09PSAwIHx8IHggPT09IHdpZHRoIC0gMSB8fCB5ID09PSBoZWlnaHQgLSAxXHJcbn1cclxuXHJcbm5ldyBDQk4oKSJdfQ==