import * as array from "../shared/array.js";
import * as dom from "../shared/dom.js";
import * as geo from "../shared/geo3d.js";
import * as math from "../shared/math.js";
import * as util from "../shared/util.js";
import * as iter from "../shared/iter.js";
// size that each image pixel is blown up to
const cellSize = 32;
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
        this.maxDimInput = dom.byId("maxDim");
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
    get maxDim() {
        return parseInt(this.maxDimInput.value) || 128;
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
        this.touch1Start = null;
        this.touch2Start = null;
        this.touch1Cur = null;
        this.touch2Cur = null;
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
        this.canvas.addEventListener("pointerdown", e => this.onPointerDown(e));
        this.canvas.addEventListener("pointermove", e => this.onPointerMove(e));
        this.canvas.addEventListener("pointerup", e => this.onPointerUp(e));
        this.canvas.addEventListener("wheel", e => this.onWheel(e));
        window.addEventListener("resize", e => this.onResize(e));
        dom.delegate(this.playUiDiv, "click", ".palette-entry", (e) => this.onPaletteEntryClick(e));
        this.returnButton.addEventListener("click", () => this.onReturn());
    }
    show(img, maxDim) {
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
    onResize(_) {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.redraw();
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
    onPointerDown(e) {
        if (this.complete) {
            return;
        }
        if (!e.isPrimary) {
            this.touch2Start = new geo.Vec2(e.offsetX, e.offsetY);
            return;
        }
        // are we overtop of a selected palette entry pixel?
        this.canvas.setPointerCapture(e.pointerId);
        this.drag = true;
        this.dragLast = new geo.Vec2(e.offsetX, e.offsetY);
        this.touch1Start = new geo.Vec2(e.offsetX, e.offsetY);
        // transform click coordinates to canvas coordinates
        const [x, y] = this.canvas2Cell(e.offsetX, e.offsetY);
        this.tryFillCell(x, y);
    }
    /**
     * convert a canvas coordinate into a cell coordinate
     * @param x x canvas coordinate
     * @param y y canvas coordinate
     */
    canvas2Cell(x, y) {
        const invTransform = this.ctx.getTransform().inverse();
        const domPt = invTransform.transformPoint({ x: x, y: y });
        return cell2Image(domPt.x, domPt.y);
    }
    onPointerUp(e) {
        if (!e.isPrimary) {
            this.touch2Start = null;
            return;
        }
        if (this.complete) {
            return;
        }
        this.touch1Start = null;
        this.drag = false;
    }
    onPointerMove(e) {
        var _a, _b;
        if (this.complete) {
            return;
        }
        if (e.isPrimary) {
            this.touch1Cur = new geo.Vec2(e.offsetX, e.offsetY);
        }
        else {
            this.touch2Cur = new geo.Vec2(e.offsetX, e.offsetY);
        }
        // handle pinch zoom
        if (this.touch2Start && this.touch1Start) {
            this.touch1Cur = (_a = this.touch1Cur) !== null && _a !== void 0 ? _a : this.touch1Start;
            this.touch2Cur = (_b = this.touch2Cur) !== null && _b !== void 0 ? _b : this.touch2Start;
            const d0 = this.touch1Start.sub(this.touch2Start).length();
            const d1 = this.touch1Cur.sub(this.touch2Cur).length();
            this.zoom = d1 / d0;
            this.redraw();
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
        // check for drag over palette color
        const [x, y] = this.canvas2Cell(e.offsetX, e.offsetY);
        if (this.paletteOverlay[flat(x, y, this.imageWidth)] === this.selectedPaletteIndex) {
            if (this.tryFillCell(x, y)) {
                this.redraw();
            }
            return;
        }
        if (Math.abs(delta.x) > 3 || Math.abs(delta.y) > 3) {
            this.centerX -= delta.x;
            this.centerY -= delta.y;
            this.dragLast = position;
            this.redraw();
        }
    }
    onWheel(e) {
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
    /**
     * true if specified cell is unfilled, and has specified palette index
     * @param x x cell coordinate
     * @param y y cell coordinate
     */
    checkCell(x, y) {
        // if already filled, do nothing
        const flatXY = flat(x, y, this.imageWidth);
        const pixels = this.pixelOverlay[this.selectedPaletteIndex];
        return pixels.has(flatXY);
    }
    /**
     * attempt to fill the specified cell
     * returns true if filled, false if cell is not selected palette or already filled
     * @param x
     * @param y
     */
    tryFillCell(x, y) {
        // if already filled, do nothing
        if (!this.checkCell(x, y)) {
            return false;
        }
        const [r, g, b] = unpackColor(this.palette[this.selectedPaletteIndex]);
        const [cx, cy] = image2Cell(x, y);
        this.colorCtx.fillStyle = color2RGBAStyle(r, g, b);
        this.colorCtx.fillRect(cx, cy, cellSize, cellSize);
        // remove the pixel from overlay
        const pixels = this.pixelOverlay[this.selectedPaletteIndex];
        const flatXY = flat(x, y, this.imageWidth);
        pixels.delete(flatXY);
        this.sequence.push(flatXY);
        if (pixels.size > 0) {
            this.redraw();
            return true;
        }
        // mark palette entry as done
        const entry = document.querySelectorAll(".palette-entry")[this.selectedPaletteIndex];
        entry.innerHTML = "&check;";
        const nextPaletteIdx = this.findNextUnfinishedEntry(this.selectedPaletteIndex);
        this.selectPaletteEntry(nextPaletteIdx);
        if (nextPaletteIdx !== -1) {
            return true;
        }
        // all colors complete! show animation of user coloring original image
        this.execDoneSequence();
        return true;
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
        this.playUi.show(img, this.loadUi.maxDim);
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
        height = maxSize * height / width;
        return [Math.floor(maxSize), Math.floor(height)];
    }
    if (height > width && height > maxSize) {
        width = maxSize * width / height;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQTtBQUN2QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBRXpDLDRDQUE0QztBQUM1QyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFFbkIsMkRBQTJEO0FBQzNELE1BQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFBO0FBRTlCLCtCQUErQjtBQUMvQixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQTtBQUVoQyxJQUFLLFVBSUo7QUFKRCxXQUFLLFVBQVU7SUFDWCwyQ0FBSSxDQUFBO0lBQ0osMkNBQUksQ0FBQTtJQUNKLHlEQUFXLENBQUE7QUFDZixDQUFDLEVBSkksVUFBVSxLQUFWLFVBQVUsUUFJZDtBQUlELE1BQU0sT0FBTztJQUFiO1FBQ3FCLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUE7SUFlNUQsQ0FBQztJQWJVLFFBQVEsQ0FBQyxVQUEwQjtRQUN0QyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRU0sV0FBVyxDQUFDLFVBQTBCO1FBQ3pDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFTSxPQUFPLENBQUMsQ0FBSTtRQUNmLEtBQUssTUFBTSxVQUFVLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUN2QyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7U0FD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QUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUUxRCxJQUFJLFlBQVksR0FBRyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDL0MsTUFBTSxFQUFFLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDdEQsTUFBTSxFQUFFLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZGLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRU8sdUJBQXVCLENBQUMsQ0FBUztRQUNyQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQ3RDLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQTtZQUNsQyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRTtnQkFDL0IsT0FBTyxFQUFFLENBQUE7YUFDWjtTQUNKO1FBRUQsT0FBTyxDQUFDLENBQUMsQ0FBQTtJQUNiLENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCO1FBQzFCLGNBQWM7UUFDZCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtRQUVwQixJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBRXpCLDJDQUEyQztRQUMzQyxxQkFBcUI7UUFDckIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFDckYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQy9ELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDN0csSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTFCLG9CQUFvQjtRQUNwQixNQUFNLEtBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUM1QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQTtRQUM1QyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUM5QyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFOUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQzNDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDM0IsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUMxQyxNQUFNLE1BQU0sR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ3JCLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDM0IsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDL0IsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDL0IsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQTtZQUVsQixJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FB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QyxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7U0FDM0M7UUFFRCxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQzFCO0lBRUQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzFELE9BQU8sVUFBVSxDQUFBO0FBQ3JCLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxDQUFTLEVBQUUsQ0FBUyxFQUFFLEtBQWEsRUFBRSxNQUFjO0lBQ3RFLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0FBQ3BFLENBQUM7QUFFRCxJQUFJLEdBQUcsRUFBRSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiXHJcbmltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzNkLmpzXCJcclxuaW1wb3J0ICogYXMgbWF0aCBmcm9tIFwiLi4vc2hhcmVkL21hdGguanNcIlxyXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gXCIuLi9zaGFyZWQvdXRpbC5qc1wiXHJcbmltcG9ydCAqIGFzIGl0ZXIgZnJvbSBcIi4uL3NoYXJlZC9pdGVyLmpzXCJcclxuXHJcbi8vIHNpemUgdGhhdCBlYWNoIGltYWdlIHBpeGVsIGlzIGJsb3duIHVwIHRvXHJcbmNvbnN0IGNlbGxTaXplID0gMzJcclxuXHJcbi8vIHRvbGVyYW5jZSBiZWZvcmUgc3BsaXR0aW5nIGNvbG9ycyAtIGhpZ2hlciA9IGxlc3MgY29sb3JzXHJcbmNvbnN0IGNvbG9yUmFuZ2VUb2xlcmFuY2UgPSA2NFxyXG5cclxuLy8gbWF4IGJnIHBpeGVscyBiZWZvcmUgcmVtb3ZhbFxyXG5jb25zdCBtYXhCYWNrZ3JvdW5kUGl4ZWxzID0gMTAyNFxyXG5cclxuZW51bSBDYW1lcmFNb2RlIHtcclxuICAgIE5vbmUsXHJcbiAgICBVc2VyLFxyXG4gICAgRW52aXJvbm1lbnQsXHJcbn1cclxuXHJcbnR5cGUgQ29sb3IgPSBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXVxyXG5cclxuY2xhc3MgQ2hhbm5lbDxUPiB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN1YnNjcmliZXJzID0gbmV3IFNldDwoeDogVCkgPT4gdm9pZD4oKVxyXG5cclxuICAgIHB1YmxpYyBzdWJjcmliZShzdWJzY3JpYmVyOiAoeDogVCkgPT4gdm9pZCkge1xyXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlcnMuYWRkKHN1YnNjcmliZXIpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHVuc3Vic2NyaWJlKHN1YnNjcmliZXI6ICh4OiBUKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVycy5kZWxldGUoc3Vic2NyaWJlcilcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgcHVibGlzaCh4OiBUKTogdm9pZCB7XHJcbiAgICAgICAgZm9yIChjb25zdCBzdWJzY3JpYmVyIG9mIHRoaXMuc3Vic2NyaWJlcnMpIHtcclxuICAgICAgICAgICAgc3Vic2NyaWJlcih4KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIENCTkltYWdlU291cmNlIHtcclxuICAgIHdpZHRoOiBudW1iZXJcclxuICAgIGhlaWdodDogbnVtYmVyXHJcbiAgICBzb3VyY2U6IEhUTUxWaWRlb0VsZW1lbnQgfCBIVE1MSW1hZ2VFbGVtZW50XHJcbn1cclxuXHJcbmNsYXNzIExvYWRVaSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhbWVyYSA9IGRvbS5ieUlkKFwiY2FtZXJhXCIpIGFzIEhUTUxWaWRlb0VsZW1lbnRcclxuICAgIHByaXZhdGUgY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuTm9uZVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBhY3F1aXJlSW1hZ2VEaXYgPSBkb20uYnlJZChcImFjcXVpcmVJbWFnZVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYXB0dXJlSW1hZ2VCdXR0b24gPSBkb20uYnlJZChcImNhcHR1cmVJbWFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsb2FkVWlEaXYgPSBkb20uYnlJZChcImxvYWRVaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtYXhEaW1JbnB1dCA9IGRvbS5ieUlkKFwibWF4RGltXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmlsZURyb3BCb3ggPSBkb20uYnlJZChcImZpbGVEcm9wQm94XCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpbGVJbnB1dCA9IGRvbS5ieUlkKFwiZmlsZUlucHV0XCIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmlsZUJ1dHRvbiA9IGRvbS5ieUlkKFwiZmlsZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB1c2VDYW1lcmFCdXR0b24gPSBkb20uYnlJZChcInVzZUNhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmbGlwQ2FtZXJhQnV0dG9uID0gZG9tLmJ5SWQoXCJmbGlwQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN0b3BDYW1lcmFCdXR0b24gPSBkb20uYnlJZChcInN0b3BDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGlicmFyeUJ1dHRvbiA9IGRvbS5ieUlkKFwibGlicmFyeUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBlcnJvcnNEaXYgPSBkb20uYnlJZChcImVycm9yc1wiKTtcclxuICAgIHB1YmxpYyByZWFkb25seSBpbWFnZUxvYWRlZCA9IG5ldyBDaGFubmVsPENCTkltYWdlU291cmNlPigpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxpYnJhcnlVaSA9IG5ldyBMaWJyYXJ5VWkoKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuZmlsZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmZpbGVJbnB1dC5jbGljaygpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5maWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2VudGVyXCIsIChlKSA9PiB0aGlzLm9uRHJhZ0VudGVyT3ZlcihlKSlcclxuICAgICAgICB0aGlzLmZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnb3ZlclwiLCAoZSkgPT4gdGhpcy5vbkRyYWdFbnRlck92ZXIoZSkpXHJcbiAgICAgICAgdGhpcy5maWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJvcFwiLCAoZSkgPT4gdGhpcy5vbkZpbGVEcm9wKGUpKVxyXG4gICAgICAgIHRoaXMuZmlsZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4gdGhpcy5vbkZpbGVDaGFuZ2UoKSlcclxuICAgICAgICB0aGlzLnVzZUNhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy51c2VDYW1lcmEoKSlcclxuICAgICAgICB0aGlzLmZsaXBDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuZmxpcENhbWVyYSgpKVxyXG4gICAgICAgIHRoaXMuc3RvcENhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5zdG9wQ2FtZXJhKCkpXHJcbiAgICAgICAgdGhpcy5jYXB0dXJlSW1hZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuY2FwdHVyZUltYWdlKCkpXHJcbiAgICAgICAgdGhpcy5jYW1lcmEuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZG1ldGFkYXRhXCIsICgpID0+IHRoaXMub25DYW1lcmFMb2FkKCkpXHJcbiAgICAgICAgdGhpcy5saWJyYXJ5QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnNob3dMaWJyYXJ5KCkpXHJcblxyXG4gICAgICAgIHRoaXMubGlicmFyeVVpLmNhbmNlbC5zdWJjcmliZSgoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFVpRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2hvdygpIHtcclxuICAgICAgICB0aGlzLmxvYWRVaURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIC8vIHRoaXMubG9hZEZyb21VcmwoXCIvY2JuL2Fzc2V0cy9sYXJyeUtvb3BhLmpwZ1wiKVxyXG4gICAgICAgIC8vIHRoaXMubG9hZEZyb21VcmwoXCIvY2JuL2Fzc2V0cy9vbHRzX2Zsb3dlci5qcGdcIilcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgaGlkZSgpIHtcclxuICAgICAgICB0aGlzLmxvYWRVaURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBtYXhEaW0oKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gcGFyc2VJbnQodGhpcy5tYXhEaW1JbnB1dC52YWx1ZSkgfHwgMTI4XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkRyYWdFbnRlck92ZXIoZXY6IERyYWdFdmVudCkge1xyXG4gICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgZXYucHJldmVudERlZmF1bHQoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25GaWxlQ2hhbmdlKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5maWxlSW5wdXQuZmlsZXM/Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmZpbGVJbnB1dC5maWxlc1swXVxyXG4gICAgICAgIHRoaXMucHJvY2Vzc0ZpbGUoZmlsZSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uRmlsZURyb3AoZXY6IERyYWdFdmVudCkge1xyXG4gICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgZXYucHJldmVudERlZmF1bHQoKVxyXG5cclxuICAgICAgICBpZiAoIWV2Py5kYXRhVHJhbnNmZXI/LmZpbGVzPy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmaWxlID0gZXYuZGF0YVRyYW5zZmVyLmZpbGVzWzBdXHJcbiAgICAgICAgdGhpcy5wcm9jZXNzRmlsZShmaWxlKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgdXNlQ2FtZXJhKCkge1xyXG4gICAgICAgIHRoaXMuYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgY29uc3QgZGlhbG9nV2lkdGggPSB0aGlzLmFjcXVpcmVJbWFnZURpdi5jbGllbnRXaWR0aFxyXG4gICAgICAgIGNvbnN0IGRpYWxvZ0hlaWdodCA9IHRoaXMuYWNxdWlyZUltYWdlRGl2LmNsaWVudEhlaWdodFxyXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcclxuICAgICAgICAgICAgdmlkZW86IHsgd2lkdGg6IHsgbWF4OiBkaWFsb2dXaWR0aCB9LCBoZWlnaHQ6IHsgbWF4OiBkaWFsb2dIZWlnaHQgfSwgZmFjaW5nTW9kZTogXCJ1c2VyXCIgfSxcclxuICAgICAgICAgICAgYXVkaW86IGZhbHNlXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5jYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Vc2VyXHJcbiAgICAgICAgdGhpcy5jYW1lcmEuc3JjT2JqZWN0ID0gc3RyZWFtXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBmbGlwQ2FtZXJhKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5jYW1lcmEuc3JjT2JqZWN0KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc3JjID0gdGhpcy5jYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICAgICAgY29uc3QgdHJhY2tzID0gc3JjLmdldFRyYWNrcygpXHJcbiAgICAgICAgZm9yIChjb25zdCB0cmFjayBvZiB0cmFja3MpIHtcclxuICAgICAgICAgICAgdHJhY2suc3RvcCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbWVyYU1vZGUgPSB0aGlzLmNhbWVyYU1vZGUgPT0gQ2FtZXJhTW9kZS5Vc2VyID8gQ2FtZXJhTW9kZS5FbnZpcm9ubWVudCA6IENhbWVyYU1vZGUuVXNlclxyXG4gICAgICAgIGNvbnN0IGZhY2luZ01vZGUgPSB0aGlzLmNhbWVyYU1vZGUgPT0gQ2FtZXJhTW9kZS5Vc2VyID8gXCJ1c2VyXCIgOiBcImVudmlyb25tZW50XCJcclxuXHJcbiAgICAgICAgLy8gZ2V0IGN1cnJlbnQgZmFjaW5nIG1vZGVcclxuICAgICAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7XHJcbiAgICAgICAgICAgIHZpZGVvOiB7IHdpZHRoOiB0aGlzLmNhbWVyYS5jbGllbnRXaWR0aCwgaGVpZ2h0OiB0aGlzLmNhbWVyYS5jbGllbnRIZWlnaHQsIGZhY2luZ01vZGU6IGZhY2luZ01vZGUgfSxcclxuICAgICAgICAgICAgYXVkaW86IGZhbHNlXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5jYW1lcmEuc3JjT2JqZWN0ID0gc3RyZWFtXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkNhbWVyYUxvYWQoKSB7XHJcbiAgICAgICAgdGhpcy5hY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmNhbWVyYS5wbGF5KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHN0b3BDYW1lcmEoKSB7XHJcbiAgICAgICAgY29uc3Qgc3JjID0gdGhpcy5jYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICAgICAgaWYgKCFzcmMpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB0cmFja3MgPSBzcmMuZ2V0VHJhY2tzKClcclxuICAgICAgICBmb3IgKGNvbnN0IHRyYWNrIG9mIHRyYWNrcykge1xyXG4gICAgICAgICAgICB0cmFjay5zdG9wKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuTm9uZVxyXG4gICAgICAgIHRoaXMuYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNhcHR1cmVJbWFnZSgpIHtcclxuICAgICAgICB0aGlzLmNsZWFyRXJyb3JNZXNzYWdlcygpXHJcblxyXG4gICAgICAgIGNvbnN0IHNyYyA9IHRoaXMuY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgICAgIGlmICghc3JjKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdHJhY2sgPSBzcmMuZ2V0VmlkZW9UcmFja3MoKVswXVxyXG4gICAgICAgIGlmICghdHJhY2spIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmltYWdlTG9hZGVkLnB1Ymxpc2goeyB3aWR0aDogdGhpcy5jYW1lcmEudmlkZW9XaWR0aCwgaGVpZ2h0OiB0aGlzLmNhbWVyYS52aWRlb0hlaWdodCwgc291cmNlOiB0aGlzLmNhbWVyYSB9KVxyXG4gICAgICAgIHRoaXMuc3RvcENhbWVyYSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzaG93TGlicmFyeSgpIHtcclxuICAgICAgICB0aGlzLmxvYWRVaURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgdGhpcy5saWJyYXJ5VWkuc2hvdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwcm9jZXNzRmlsZShmaWxlOiBGaWxlKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhckVycm9yTWVzc2FnZXMoKVxyXG4gICAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSlcclxuICAgICAgICB0aGlzLmxvYWRGcm9tVXJsKHVybClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxvYWRGcm9tVXJsKHVybDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhckVycm9yTWVzc2FnZXMoKVxyXG4gICAgICAgIGNvbnN0IGltZyA9IGF3YWl0IGRvbS5sb2FkSW1hZ2UodXJsKVxyXG4gICAgICAgIHRoaXMuaW1hZ2VMb2FkZWQucHVibGlzaCh7IHdpZHRoOiBpbWcud2lkdGgsIGhlaWdodDogaW1nLmhlaWdodCwgc291cmNlOiBpbWcgfSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNsZWFyRXJyb3JNZXNzYWdlcygpIHtcclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGhpcy5lcnJvcnNEaXYpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIExpYnJhcnlVaSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxpYnJhcnlEaXYgPSBkb20uYnlJZChcImxpYnJhcnlVaVwiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZXR1cm5CdXR0b24gPSBkb20uYnlJZChcInJldHVybkZyb21MaWJyYXJ5QnV0dG9uXCIpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgaW1hZ2VDaG9zZW4gPSBuZXcgQ2hhbm5lbDxzdHJpbmc+KClcclxuICAgIHB1YmxpYyByZWFkb25seSBjYW5jZWwgPSBuZXcgQ2hhbm5lbDx2b2lkPigpO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMucmV0dXJuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uUmV0dXJuQ2xpY2soKSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIHRoaXMubGlicmFyeURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25SZXR1cm5DbGljaygpIHtcclxuICAgICAgICB0aGlzLmxpYnJhcnlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuY2FuY2VsLnB1Ymxpc2goKVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBQbGF5VWkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW52YXMgPSBkb20uYnlJZChcImNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVEaXYgPSBkb20uYnlJZChcInBhbGV0dGVcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFsZXR0ZUVudHJ5VGVtcGxhdGUgPSBkb20uYnlJZChcInBhbGV0dGVFbnRyeVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBsYXlVaURpdiA9IGRvbS5ieUlkKFwicGxheVVpXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJldHVybkJ1dHRvbiA9IGRvbS5ieUlkKFwicmV0dXJuQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlQ2FudmFzID0gbmV3IE9mZnNjcmVlbkNhbnZhcygwLCAwKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZUN0eCA9IHRoaXMuaW1hZ2VDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjZWxsQ2FudmFzID0gbmV3IE9mZnNjcmVlbkNhbnZhcygwLCAwKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjZWxsQ3R4ID0gdGhpcy5jZWxsQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFsZXR0ZUNhbnZhcyA9IG5ldyBPZmZzY3JlZW5DYW52YXMoMCwgMClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFsZXR0ZUN0eCA9IHRoaXMucGFsZXR0ZUNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbG9yQ2FudmFzID0gbmV3IE9mZnNjcmVlbkNhbnZhcygwLCAwKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb2xvckN0eCA9IHRoaXMuY29sb3JDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSBjb21wbGV0ZSA9IGZhbHNlXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgcmV0dXJuID0gbmV3IENoYW5uZWw8dm9pZD4oKVxyXG4gICAgcHJpdmF0ZSBpbWFnZVdpZHRoID0gMFxyXG4gICAgcHJpdmF0ZSBpbWFnZUhlaWdodCA9IDBcclxuICAgIHByaXZhdGUgY2VudGVyWCA9IDBcclxuICAgIHByaXZhdGUgY2VudGVyWSA9IDBcclxuICAgIHByaXZhdGUgem9vbSA9IDFcclxuICAgIHByaXZhdGUgZHJhZyA9IGZhbHNlXHJcbiAgICBwcml2YXRlIHRvdWNoMVN0YXJ0OiBnZW8uVmVjMiB8IG51bGwgPSBudWxsXHJcbiAgICBwcml2YXRlIHRvdWNoMlN0YXJ0OiBnZW8uVmVjMiB8IG51bGwgPSBudWxsXHJcbiAgICBwcml2YXRlIHRvdWNoMUN1cjogZ2VvLlZlYzIgfCBudWxsID0gbnVsbFxyXG4gICAgcHJpdmF0ZSB0b3VjaDJDdXI6IGdlby5WZWMyIHwgbnVsbCA9IG51bGxcclxuICAgIHByaXZhdGUgZHJhZ0xhc3QgPSBuZXcgZ2VvLlZlYzIoMCwgMClcclxuXHJcbiAgICAvLyBsaXN0IG9mIGNvbG9ycyB1c2UgdXNlZCBpbiBpbWFnZVxyXG4gICAgcHJpdmF0ZSBwYWxldHRlOiBudW1iZXJbXSA9IFtdXHJcblxyXG4gICAgLy8gaW1hZ2Ugb3ZlcmxheSBvZiBwaXhlbCB0byBwYWxldHRlIGluZGV4XHJcbiAgICBwcml2YXRlIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSA9IFtdXHJcblxyXG4gICAgLy8gcGFsZXR0ZSBvdmVybGF5IG9mIHBhbGV0dGUgaW5kZXggdG8gbGlzdCBvZiBwaXhlbHMgaGF2aW5nIHRoYXQgY29sb3JcclxuICAgIHByaXZhdGUgcGl4ZWxPdmVybGF5OiBTZXQ8bnVtYmVyPltdID0gW11cclxuXHJcbiAgICBwcml2YXRlIHNlbGVjdGVkUGFsZXR0ZUluZGV4OiBudW1iZXIgPSAtMVxyXG4gICAgcHJpdmF0ZSBzZXF1ZW5jZTogbnVtYmVyW10gPSBbXVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5jdHgpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FudmFzIGVsZW1lbnQgbm90IHN1cHBvcnRlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmNlbGxDdHgpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT2Zmc2NyZWVuQ2FudmFzIG5vdCBzdXBwb3J0ZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVyZG93blwiLCBlID0+IHRoaXMub25Qb2ludGVyRG93bihlKSlcclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcm1vdmVcIiwgZSA9PiB0aGlzLm9uUG9pbnRlck1vdmUoZSkpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJ1cFwiLCBlID0+IHRoaXMub25Qb2ludGVyVXAoZSkpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIGUgPT4gdGhpcy5vbldoZWVsKGUpKVxyXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIGUgPT4gdGhpcy5vblJlc2l6ZShlKSlcclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5wbGF5VWlEaXYsIFwiY2xpY2tcIiwgXCIucGFsZXR0ZS1lbnRyeVwiLCAoZSkgPT4gdGhpcy5vblBhbGV0dGVFbnRyeUNsaWNrKGUgYXMgTW91c2VFdmVudCkpXHJcbiAgICAgICAgdGhpcy5yZXR1cm5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMub25SZXR1cm4oKSlcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2hvdyhpbWc6IENCTkltYWdlU291cmNlLCBtYXhEaW06IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMucGxheVVpRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5jb21wbGV0ZSA9IGZhbHNlXHJcblxyXG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5jYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHRcclxuXHJcbiAgICAgICAgLy8gZml0IGltYWdlXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCBbdywgaF0gPSBmaXQoaW1nLndpZHRoLCBpbWcuaGVpZ2h0LCBtYXhEaW0pXHJcbiAgICAgICAgICAgIHRoaXMuaW1hZ2VXaWR0aCA9IHdcclxuICAgICAgICAgICAgdGhpcy5pbWFnZUhlaWdodCA9IGhcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIC8vIGRlYnVnXHJcbiAgICAgICAgLy8gdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLmltYWdlV2lkdGhcclxuICAgICAgICAvLyB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlSGVpZ2h0XHJcbiAgICAgICAgLy8gdGhpcy5jdHguZHJhd0ltYWdlKGltZy5zb3VyY2UsIDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpXHJcbiAgICAgICAgLy8gcXVhbnRNZWRpYW5DdXQodGhpcy5jdHgsIDY0KVxyXG5cclxuICAgICAgICAvLyByZXR1cm5cclxuXHJcbiAgICAgICAgLy8gaW5pdGlhbGl6ZSBhbGwgZHJhd2luZyBsYXllcnNcclxuICAgICAgICB0aGlzLmltYWdlQ2FudmFzLndpZHRoID0gdGhpcy5pbWFnZVdpZHRoXHJcbiAgICAgICAgdGhpcy5pbWFnZUNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlSGVpZ2h0XHJcbiAgICAgICAgdGhpcy5pbWFnZUN0eC5kcmF3SW1hZ2UoaW1nLnNvdXJjZSwgMCwgMCwgdGhpcy5pbWFnZUNhbnZhcy53aWR0aCwgdGhpcy5pbWFnZUNhbnZhcy5oZWlnaHQpXHJcbiAgICAgICAgcXVhbnRNZWRpYW5DdXQodGhpcy5pbWFnZUN0eCwgNjQpXHJcblxyXG4gICAgICAgIGNvbnN0IGltZ0RhdGEgPSB0aGlzLmltYWdlQ3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlID0gZXh0cmFjdFBhbGV0dGUoaW1nRGF0YSlcclxuICAgICAgICB0aGlzLnBhbGV0dGVPdmVybGF5ID0gY3JlYXRlUGFsZXR0ZU92ZXJsYXkoaW1nRGF0YSwgdGhpcy5wYWxldHRlKVxyXG4gICAgICAgIHRoaXMucGl4ZWxPdmVybGF5ID0gY3JlYXRlUGl4ZWxPdmVybGF5KHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCwgdGhpcy5wYWxldHRlLCB0aGlzLnBhbGV0dGVPdmVybGF5KVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZSA9IHBydW5lUGFsbGV0ZSh0aGlzLnBhbGV0dGUsIHRoaXMucGl4ZWxPdmVybGF5LCBtYXhCYWNrZ3JvdW5kUGl4ZWxzLCB0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQsIHRoaXMuY29sb3JDdHgpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlT3ZlcmxheSA9IGNyZWF0ZVBhbGV0dGVPdmVybGF5KGltZ0RhdGEsIHRoaXMucGFsZXR0ZSlcclxuICAgICAgICB0aGlzLnBpeGVsT3ZlcmxheSA9IGNyZWF0ZVBpeGVsT3ZlcmxheSh0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQsIHRoaXMucGFsZXR0ZSwgdGhpcy5wYWxldHRlT3ZlcmxheSlcclxuICAgICAgICB0aGlzLmNyZWF0ZVBhbGV0dGVVaSgpXHJcbiAgICAgICAgZHJhd0NlbGxJbWFnZSh0aGlzLmNlbGxDdHgsIHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCwgdGhpcy5wYWxldHRlT3ZlcmxheSlcclxuICAgICAgICB0aGlzLnBhbGV0dGVDYW52YXMud2lkdGggPSB0aGlzLmNlbGxDYW52YXMud2lkdGhcclxuICAgICAgICB0aGlzLnBhbGV0dGVDYW52YXMuaGVpZ2h0ID0gdGhpcy5jZWxsQ2FudmFzLmhlaWdodFxyXG4gICAgICAgIHRoaXMuY2VudGVyWCA9IHRoaXMuY2FudmFzLndpZHRoIC8gMlxyXG4gICAgICAgIHRoaXMuY2VudGVyWSA9IHRoaXMuY2FudmFzLmhlaWdodCAvIDJcclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcblxyXG4gICAgICAgIGlmICh0aGlzLnBhbGV0dGUpIHtcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RQYWxldHRlRW50cnkoMClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2VxdWVuY2UgPSBbXVxyXG5cclxuICAgICAgICAvLyAvLyBkZWJ1ZyAtIGdvIHN0cmFpZ2h0IHRvIGVuZCBzdGF0ZVxyXG4gICAgICAgIC8vIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5pbWFnZUhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgLy8gICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5pbWFnZVdpZHRoOyArK3gpIHtcclxuICAgICAgICAvLyAgICAgICAgIHRoaXMuc2VxdWVuY2UucHVzaChmbGF0KHgsIHksIHRoaXMuaW1hZ2VXaWR0aCkpXHJcbiAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgIC8vIHJhbmQuc2h1ZmZsZSh0aGlzLnNlcXVlbmNlKVxyXG4gICAgICAgIC8vIHRoaXMuZXhlY0RvbmVTZXF1ZW5jZSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5wbGF5VWlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25SZXR1cm4oKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5yZXR1cm4ucHVibGlzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJlc2l6ZShfOiBVSUV2ZW50KSB7XHJcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLmNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNyZWF0ZVBhbGV0dGVVaSgpIHtcclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGhpcy5wYWxldHRlRGl2KVxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5wYWxldHRlLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFtyLCBnLCBiXSA9IHVucGFja0NvbG9yKHRoaXMucGFsZXR0ZVtpXSlcclxuICAgICAgICAgICAgY29uc3QgbHVtID0gY2FsY0x1bWluYW5jZShyLCBnLCBiKVxyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMucGFsZXR0ZUVudHJ5VGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCBlbnRyeURpdiA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5wYWxldHRlLWVudHJ5XCIpIGFzIEhUTUxFbGVtZW50XHJcbiAgICAgICAgICAgIGVudHJ5RGl2LnRleHRDb250ZW50ID0gYCR7aSArIDF9YFxyXG4gICAgICAgICAgICBlbnRyeURpdi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb2xvcjJSR0JBU3R5bGUociwgZywgYilcclxuICAgICAgICAgICAgZW50cnlEaXYuc3R5bGUuY29sb3IgPSBsdW0gPCAuNSA/IFwid2hpdGVcIiA6IFwiYmxhY2tcIlxyXG4gICAgICAgICAgICB0aGlzLnBhbGV0dGVEaXYuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Qb2ludGVyRG93bihlOiBQb2ludGVyRXZlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghZS5pc1ByaW1hcnkpIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDJTdGFydCA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhcmUgd2Ugb3ZlcnRvcCBvZiBhIHNlbGVjdGVkIHBhbGV0dGUgZW50cnkgcGl4ZWw/XHJcbiAgICAgICAgdGhpcy5jYW52YXMuc2V0UG9pbnRlckNhcHR1cmUoZS5wb2ludGVySWQpXHJcbiAgICAgICAgdGhpcy5kcmFnID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuZHJhZ0xhc3QgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgdGhpcy50b3VjaDFTdGFydCA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuXHJcbiAgICAgICAgLy8gdHJhbnNmb3JtIGNsaWNrIGNvb3JkaW5hdGVzIHRvIGNhbnZhcyBjb29yZGluYXRlc1xyXG4gICAgICAgIGNvbnN0IFt4LCB5XSA9IHRoaXMuY2FudmFzMkNlbGwoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgdGhpcy50cnlGaWxsQ2VsbCh4LCB5KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29udmVydCBhIGNhbnZhcyBjb29yZGluYXRlIGludG8gYSBjZWxsIGNvb3JkaW5hdGVcclxuICAgICAqIEBwYXJhbSB4IHggY2FudmFzIGNvb3JkaW5hdGVcclxuICAgICAqIEBwYXJhbSB5IHkgY2FudmFzIGNvb3JkaW5hdGVcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBjYW52YXMyQ2VsbCh4OiBudW1iZXIsIHk6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgICAgIGNvbnN0IGludlRyYW5zZm9ybSA9IHRoaXMuY3R4LmdldFRyYW5zZm9ybSgpLmludmVyc2UoKVxyXG4gICAgICAgIGNvbnN0IGRvbVB0ID0gaW52VHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHsgeDogeCwgeTogeSB9KVxyXG4gICAgICAgIHJldHVybiBjZWxsMkltYWdlKGRvbVB0LngsIGRvbVB0LnkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblBvaW50ZXJVcChlOiBQb2ludGVyRXZlbnQpIHtcclxuICAgICAgICBpZiAoIWUuaXNQcmltYXJ5KSB7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gyU3RhcnQgPSBudWxsXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRvdWNoMVN0YXJ0ID0gbnVsbFxyXG4gICAgICAgIHRoaXMuZHJhZyA9IGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblBvaW50ZXJNb3ZlKGU6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUuaXNQcmltYXJ5KSB7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gxQ3VyID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gyQ3VyID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGFuZGxlIHBpbmNoIHpvb21cclxuICAgICAgICBpZiAodGhpcy50b3VjaDJTdGFydCAmJiB0aGlzLnRvdWNoMVN0YXJ0KSB7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gxQ3VyID0gdGhpcy50b3VjaDFDdXIgPz8gdGhpcy50b3VjaDFTdGFydFxyXG4gICAgICAgICAgICB0aGlzLnRvdWNoMkN1ciA9IHRoaXMudG91Y2gyQ3VyID8/IHRoaXMudG91Y2gyU3RhcnRcclxuICAgICAgICAgICAgY29uc3QgZDAgPSB0aGlzLnRvdWNoMVN0YXJ0LnN1Yih0aGlzLnRvdWNoMlN0YXJ0KS5sZW5ndGgoKVxyXG4gICAgICAgICAgICBjb25zdCBkMSA9IHRoaXMudG91Y2gxQ3VyLnN1Yih0aGlzLnRvdWNoMkN1cikubGVuZ3RoKClcclxuICAgICAgICAgICAgdGhpcy56b29tID0gZDEgLyBkMFxyXG4gICAgICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmRyYWcpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSB0aGlzLmN0eC5nZXRUcmFuc2Zvcm0oKS5pbnZlcnNlKClcclxuICAgICAgICBjb25zdCBzdGFydCA9IGdlby5WZWMyLmZyb21ET00odHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHRoaXMuZHJhZ0xhc3QpKVxyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIGNvbnN0IGVuZCA9IGdlby5WZWMyLmZyb21ET00odHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHBvc2l0aW9uKSlcclxuICAgICAgICBjb25zdCBkZWx0YSA9IGVuZC5zdWIoc3RhcnQpXHJcblxyXG4gICAgICAgIC8vIGNoZWNrIGZvciBkcmFnIG92ZXIgcGFsZXR0ZSBjb2xvclxyXG4gICAgICAgIGNvbnN0IFt4LCB5XSA9IHRoaXMuY2FudmFzMkNlbGwoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgaWYgKHRoaXMucGFsZXR0ZU92ZXJsYXlbZmxhdCh4LCB5LCB0aGlzLmltYWdlV2lkdGgpXSA9PT0gdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy50cnlGaWxsQ2VsbCh4LCB5KSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChNYXRoLmFicyhkZWx0YS54KSA+IDMgfHwgTWF0aC5hYnMoZGVsdGEueSkgPiAzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2VudGVyWCAtPSBkZWx0YS54XHJcbiAgICAgICAgICAgIHRoaXMuY2VudGVyWSAtPSBkZWx0YS55XHJcbiAgICAgICAgICAgIHRoaXMuZHJhZ0xhc3QgPSBwb3NpdGlvblxyXG4gICAgICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25XaGVlbChlOiBXaGVlbEV2ZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZS5kZWx0YVkgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuem9vbSAqPSAuNVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUuZGVsdGFZIDwgMCkge1xyXG4gICAgICAgICAgICB0aGlzLnpvb20gKj0gMlxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25QYWxldHRlRW50cnlDbGljayhlOiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlbnRyeSA9IGUudGFyZ2V0IGFzIEVsZW1lbnRcclxuICAgICAgICBsZXQgaWR4ID0gZG9tLmdldEVsZW1lbnRJbmRleChlbnRyeSlcclxuXHJcbiAgICAgICAgaWYgKGlkeCA9PT0gdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleCkge1xyXG4gICAgICAgICAgICBpZHggPSAtMVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZWxlY3RQYWxldHRlRW50cnkoaWR4KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogdHJ1ZSBpZiBzcGVjaWZpZWQgY2VsbCBpcyB1bmZpbGxlZCwgYW5kIGhhcyBzcGVjaWZpZWQgcGFsZXR0ZSBpbmRleFxyXG4gICAgICogQHBhcmFtIHggeCBjZWxsIGNvb3JkaW5hdGVcclxuICAgICAqIEBwYXJhbSB5IHkgY2VsbCBjb29yZGluYXRlXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY2hlY2tDZWxsKHg6IG51bWJlciwgeTogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgLy8gaWYgYWxyZWFkeSBmaWxsZWQsIGRvIG5vdGhpbmdcclxuICAgICAgICBjb25zdCBmbGF0WFkgPSBmbGF0KHgsIHksIHRoaXMuaW1hZ2VXaWR0aClcclxuICAgICAgICBjb25zdCBwaXhlbHMgPSB0aGlzLnBpeGVsT3ZlcmxheVt0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4XVxyXG4gICAgICAgIHJldHVybiBwaXhlbHMuaGFzKGZsYXRYWSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGF0dGVtcHQgdG8gZmlsbCB0aGUgc3BlY2lmaWVkIGNlbGxcclxuICAgICAqIHJldHVybnMgdHJ1ZSBpZiBmaWxsZWQsIGZhbHNlIGlmIGNlbGwgaXMgbm90IHNlbGVjdGVkIHBhbGV0dGUgb3IgYWxyZWFkeSBmaWxsZWRcclxuICAgICAqIEBwYXJhbSB4IFxyXG4gICAgICogQHBhcmFtIHkgXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgdHJ5RmlsbENlbGwoeDogbnVtYmVyLCB5OiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgICAgICAvLyBpZiBhbHJlYWR5IGZpbGxlZCwgZG8gbm90aGluZ1xyXG4gICAgICAgIGlmICghdGhpcy5jaGVja0NlbGwoeCwgeSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBbciwgZywgYl0gPSB1bnBhY2tDb2xvcih0aGlzLnBhbGV0dGVbdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleF0pXHJcbiAgICAgICAgY29uc3QgW2N4LCBjeV0gPSBpbWFnZTJDZWxsKHgsIHkpXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5maWxsU3R5bGUgPSBjb2xvcjJSR0JBU3R5bGUociwgZywgYilcclxuICAgICAgICB0aGlzLmNvbG9yQ3R4LmZpbGxSZWN0KGN4LCBjeSwgY2VsbFNpemUsIGNlbGxTaXplKVxyXG5cclxuICAgICAgICAvLyByZW1vdmUgdGhlIHBpeGVsIGZyb20gb3ZlcmxheVxyXG4gICAgICAgIGNvbnN0IHBpeGVscyA9IHRoaXMucGl4ZWxPdmVybGF5W3RoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXhdXHJcbiAgICAgICAgY29uc3QgZmxhdFhZID0gZmxhdCh4LCB5LCB0aGlzLmltYWdlV2lkdGgpXHJcbiAgICAgICAgcGl4ZWxzLmRlbGV0ZShmbGF0WFkpXHJcbiAgICAgICAgdGhpcy5zZXF1ZW5jZS5wdXNoKGZsYXRYWSlcclxuXHJcbiAgICAgICAgaWYgKHBpeGVscy5zaXplID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBtYXJrIHBhbGV0dGUgZW50cnkgYXMgZG9uZVxyXG4gICAgICAgIGNvbnN0IGVudHJ5ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5wYWxldHRlLWVudHJ5XCIpW3RoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXhdXHJcbiAgICAgICAgZW50cnkuaW5uZXJIVE1MID0gXCImY2hlY2s7XCJcclxuICAgICAgICBjb25zdCBuZXh0UGFsZXR0ZUlkeCA9IHRoaXMuZmluZE5leHRVbmZpbmlzaGVkRW50cnkodGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleClcclxuICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeShuZXh0UGFsZXR0ZUlkeClcclxuXHJcbiAgICAgICAgaWYgKG5leHRQYWxldHRlSWR4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYWxsIGNvbG9ycyBjb21wbGV0ZSEgc2hvdyBhbmltYXRpb24gb2YgdXNlciBjb2xvcmluZyBvcmlnaW5hbCBpbWFnZVxyXG4gICAgICAgIHRoaXMuZXhlY0RvbmVTZXF1ZW5jZSgpXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNlbGVjdFBhbGV0dGVFbnRyeShpZHg6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXggPSBpZHhcclxuXHJcbiAgICAgICAgY29uc3QgZW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5wYWxldHRlLWVudHJ5XCIpKVxyXG4gICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgICAgICBlbnRyeS5jbGFzc0xpc3QucmVtb3ZlKFwic2VsZWN0ZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpZHggIT09IC0xKSB7XHJcbiAgICAgICAgICAgIGVudHJpZXNbaWR4XS5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGNsZWFyIHBhbGV0dGUgY2FudmFzXHJcbiAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5wYWxldHRlQ3R4XHJcbiAgICAgICAgY29uc3QgY2FudmFzID0gdGhpcy5wYWxldHRlQ2FudmFzXHJcbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpXHJcblxyXG4gICAgICAgIGlmIChpZHggPT0gLTEpIHtcclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhpZ2hsaWdodCByZW1haW5pbmcgcGl4ZWxzIGZvciB0aGlzIGNvbG9yXHJcbiAgICAgICAgY29uc3QgZm9udCA9IGN0eC5mb250XHJcbiAgICAgICAgY3R4LmZvbnQgPSBcImJvbGQgMTZweCBhcmlhbFwiXHJcbiAgICAgICAgY29uc3QgdGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGhcclxuICAgICAgICBjb25zdCBjZHh5ID0gY2VsbFNpemUgLyAyXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgcGl4ZWwgb2YgdGhpcy5waXhlbE92ZXJsYXlbaWR4XSkge1xyXG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSBpbWFnZTJDZWxsKC4uLnVuZmxhdChwaXhlbCwgdGhpcy5pbWFnZVdpZHRoKSlcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yMlJHQkFTdHlsZSgxOTEsIDE5MSwgMTkxLCAyNTUpXHJcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCh4LCB5LCBjZWxsU2l6ZSwgY2VsbFNpemUpXHJcblxyXG4gICAgICAgICAgICAvLyBkcmF3IGxhYmVsXHJcbiAgICAgICAgICAgIGNvbnN0IGxhYmVsID0gYCR7aWR4ICsgMX1gXHJcbiAgICAgICAgICAgIGNvbnN0IG1ldHJpY3MgPSBjdHgubWVhc3VyZVRleHQobGFiZWwpXHJcbiAgICAgICAgICAgIGNvbnN0IGN4ID0geCArIGNkeHkgLSBtZXRyaWNzLndpZHRoIC8gMlxyXG4gICAgICAgICAgICBjb25zdCBjeSA9IHkgKyBjZHh5ICsgdGV4dEhlaWdodCAvIDJcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiYmxhY2tcIlxyXG4gICAgICAgICAgICBjdHguZmlsbFRleHQobGFiZWwsIGN4LCBjeSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGN0eC5mb250ID0gZm9udFxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlZHJhdygpIHtcclxuICAgICAgICAvLyBub3RlIC0gY2xlYXIgaXMgc3ViamVjdCB0byB0cmFuc2Zvcm1cclxuICAgICAgICBjb25zdCBjdHggPSB0aGlzLmN0eFxyXG4gICAgICAgIHRoaXMuY3R4LnJlc2V0VHJhbnNmb3JtKClcclxuICAgICAgICBjb25zdCBodyA9IHRoaXMuY2FudmFzLndpZHRoIC8gMiAvIHRoaXMuem9vbVxyXG4gICAgICAgIGNvbnN0IGhoID0gdGhpcy5jYW52YXMuaGVpZ2h0IC8gMiAvIHRoaXMuem9vbVxyXG5cclxuICAgICAgICB0aGlzLmNlbnRlclggPSBtYXRoLmNsYW1wKHRoaXMuY2VudGVyWCwgMCwgdGhpcy5jZWxsQ2FudmFzLndpZHRoKVxyXG4gICAgICAgIHRoaXMuY2VudGVyWSA9IG1hdGguY2xhbXAodGhpcy5jZW50ZXJZLCAwLCB0aGlzLmNlbGxDYW52YXMuaGVpZ2h0KVxyXG4gICAgICAgIHRoaXMuY3R4LnNjYWxlKHRoaXMuem9vbSwgdGhpcy56b29tKVxyXG4gICAgICAgIHRoaXMuY3R4LnRyYW5zbGF0ZSgtdGhpcy5jZW50ZXJYICsgaHcsIC10aGlzLmNlbnRlclkgKyBoaClcclxuXHJcbiAgICAgICAgdmFyIGludlRyYW5zZm9ybSA9IGN0eC5nZXRUcmFuc2Zvcm0oKS5pbnZlcnNlKClcclxuICAgICAgICBjb25zdCB0bCA9IGludlRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh7IHg6IDAsIHk6IDAgfSlcclxuICAgICAgICBjb25zdCBiciA9IGludlRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh7IHg6IHRoaXMuY2FudmFzLndpZHRoLCB5OiB0aGlzLmNhbnZhcy5oZWlnaHQgfSlcclxuICAgICAgICBjdHguY2xlYXJSZWN0KHRsLngsIHRsLnksIGJyLnggLSB0bC54LCBici55IC0gdGwueSlcclxuICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuY2VsbENhbnZhcywgMCwgMClcclxuICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMucGFsZXR0ZUNhbnZhcywgMCwgMClcclxuICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuY29sb3JDYW52YXMsIDAsIDApXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmaW5kTmV4dFVuZmluaXNoZWRFbnRyeShpOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLnBhbGV0dGUubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgaWkgPSBpICUgdGhpcy5wYWxldHRlLmxlbmd0aFxyXG4gICAgICAgICAgICBpZiAodGhpcy5waXhlbE92ZXJsYXlbaV0uc2l6ZSA+IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpaVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gLTFcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGV4ZWNEb25lU2VxdWVuY2UoKSB7XHJcbiAgICAgICAgLy8gc2V0IGFzIGRvbmVcclxuICAgICAgICB0aGlzLmNvbXBsZXRlID0gdHJ1ZVxyXG5cclxuICAgICAgICB0aGlzLmN0eC5yZXNldFRyYW5zZm9ybSgpXHJcblxyXG4gICAgICAgIC8vIGRyYXcgb25lIHBpeGVsIGF0IGEgdGltZSB0byBjb2xvciBjYW52YXNcclxuICAgICAgICAvLyBvdnJsYXkgb250byBjYW52YXNcclxuICAgICAgICBjb25zdCBkYXRhID0gdGhpcy5pbWFnZUN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0KS5kYXRhXHJcbiAgICAgICAgdGhpcy5jdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpXHJcbiAgICAgICAgY29uc3Qgem9vbSA9IE1hdGgubWluKHRoaXMuY2FudmFzLmNsaWVudFdpZHRoIC8gdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHQgLyB0aGlzLmltYWdlSGVpZ2h0KVxyXG4gICAgICAgIHRoaXMuY3R4LnNjYWxlKHpvb20sIHpvb20pXHJcblxyXG4gICAgICAgIC8vIGNvbG9yIGFzIHVzZXIgZGlkXHJcbiAgICAgICAgY29uc3QgcGl4ZWwgPSBuZXcgSW1hZ2VEYXRhKDEsIDEpXHJcbiAgICAgICAgY29uc3QgcGl4ZWxEYXRhID0gcGl4ZWwuZGF0YVxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguY2FudmFzLndpZHRoID0gdGhpcy5pbWFnZVdpZHRoXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5jYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZUhlaWdodFxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY29sb3JDYW52YXMud2lkdGgsIHRoaXMuY29sb3JDYW52YXMuaGVpZ2h0KVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc2VxdWVuY2UubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgeHkgPSB0aGlzLnNlcXVlbmNlW2ldXHJcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IHVuZmxhdCh4eSwgdGhpcy5pbWFnZVdpZHRoKVxyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB4eSAqIDRcclxuICAgICAgICAgICAgcGl4ZWxEYXRhWzBdID0gZGF0YVtvZmZzZXRdXHJcbiAgICAgICAgICAgIHBpeGVsRGF0YVsxXSA9IGRhdGFbb2Zmc2V0ICsgMV1cclxuICAgICAgICAgICAgcGl4ZWxEYXRhWzJdID0gZGF0YVtvZmZzZXQgKyAyXVxyXG4gICAgICAgICAgICBwaXhlbERhdGFbM10gPSAyNTVcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29sb3JDdHgucHV0SW1hZ2VEYXRhKHBpeGVsLCB4LCB5KVxyXG4gICAgICAgICAgICB0aGlzLmN0eC5kcmF3SW1hZ2UodGhpcy5jb2xvckNhbnZhcywgMCwgMClcclxuICAgICAgICAgICAgaWYgKGkgJSA2NCA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB1dGlsLndhaXQoMClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQ0JOIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbG9hZFVpID0gbmV3IExvYWRVaSgpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBsYXlVaSA9IG5ldyBQbGF5VWkoKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMubG9hZFVpLnNob3coKVxyXG4gICAgICAgIHRoaXMubG9hZFVpLmltYWdlTG9hZGVkLnN1YmNyaWJlKHggPT4gdGhpcy5vbkltYWdlTG9hZGVkKHgpKVxyXG4gICAgICAgIHRoaXMucGxheVVpLnJldHVybi5zdWJjcmliZSgoKSA9PiB0aGlzLm9uUmV0dXJuKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkltYWdlTG9hZGVkKGltZzogQ0JOSW1hZ2VTb3VyY2UpIHtcclxuICAgICAgICB0aGlzLmxvYWRVaS5oaWRlKClcclxuICAgICAgICB0aGlzLnBsYXlVaS5zaG93KGltZywgdGhpcy5sb2FkVWkubWF4RGltKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmV0dXJuKCkge1xyXG4gICAgICAgIHRoaXMucGxheVVpLmhpZGUoKVxyXG4gICAgICAgIHRoaXMubG9hZFVpLnNob3coKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdFBhbGV0dGUoaW1nRGF0YTogSW1hZ2VEYXRhKTogbnVtYmVyW10ge1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBkYXRhIH0gPSBpbWdEYXRhXHJcbiAgICBjb25zdCByb3dQaXRjaCA9IHdpZHRoICogNFxyXG5cclxuICAgIC8vIGZpbmQgdW5pcXVlIGNvbG9ycywgY3JlYXRlIGVudHJ5IGZvciBlYWNoXHJcbiAgICBjb25zdCBwYWxldHRlID0gbmV3IFNldDxudW1iZXI+KClcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHJvd1BpdGNoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIC8vIHBhY2sgY29sb3IgdG8gYSB1bmlxdWUgdmFsdWVcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHggKiA0XHJcbiAgICAgICAgICAgIGNvbnN0IHIgPSBkYXRhW29mZnNldF1cclxuICAgICAgICAgICAgY29uc3QgZyA9IGRhdGFbb2Zmc2V0ICsgMV1cclxuICAgICAgICAgICAgY29uc3QgYiA9IGRhdGFbb2Zmc2V0ICsgMl1cclxuICAgICAgICAgICAgY29uc3QgYSA9IGRhdGFbb2Zmc2V0ICsgM11cclxuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBwYWNrQ29sb3IociwgZywgYiwgYSlcclxuICAgICAgICAgICAgcGFsZXR0ZS5hZGQodmFsdWUpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBbLi4ucGFsZXR0ZV1cclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBhbiBvdmVybGF5IHRoYXQgbWFwcyBlYWNoIHBpeGVsIHRvIHRoZSBpbmRleCBvZiBpdHMgcGFsZXR0ZSBlbnRyeVxyXG4gKiBAcGFyYW0gaW1nRGF0YSBpbWFnZSBkYXRhXHJcbiAqIEBwYXJhbSBwYWxldHRlIHBhbGV0dGUgY29sb3JzXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVQYWxldHRlT3ZlcmxheShpbWdEYXRhOiBJbWFnZURhdGEsIHBhbGV0dGU6IG51bWJlcltdKTogbnVtYmVyW10ge1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBkYXRhIH0gPSBpbWdEYXRhXHJcbiAgICBjb25zdCBwYWxldHRlTWFwID0gYXJyYXkubWFwSW5kaWNlcyhwYWxldHRlKVxyXG4gICAgY29uc3Qgcm93UGl0Y2ggPSB3aWR0aCAqIDRcclxuICAgIGNvbnN0IG92ZXJsYXkgPSBhcnJheS51bmlmb3JtKC0xLCB3aWR0aCAqIGhlaWdodClcclxuXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiByb3dQaXRjaFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICAvLyBwYWNrIGNvbG9yIHRvIGEgdW5pcXVlIHZhbHVlXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4ICogNFxyXG4gICAgICAgICAgICBjb25zdCByID0gZGF0YVtvZmZzZXRdXHJcbiAgICAgICAgICAgIGNvbnN0IGcgPSBkYXRhW29mZnNldCArIDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGIgPSBkYXRhW29mZnNldCArIDJdXHJcbiAgICAgICAgICAgIGNvbnN0IGEgPSBkYXRhW29mZnNldCArIDNdXHJcbiAgICAgICAgICAgIGNvbnN0IHJnYmEgPSBwYWNrQ29sb3IociwgZywgYiwgYSlcclxuICAgICAgICAgICAgY29uc3QgaWR4ID0gcGFsZXR0ZU1hcC5nZXQocmdiYSkgPz8gLTFcclxuICAgICAgICAgICAgb3ZlcmxheVt5ICogd2lkdGggKyB4XSA9IGlkeFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gb3ZlcmxheVxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGFuIG92ZXJsYXkgdGhhdCBtYXBzIGVhY2ggcGFsZXR0ZSBlbnRyeSB0byBhIGxpc3Qgb2YgcGl4ZWxzIHdpdGggaXRzIGNvbG9yXHJcbiAqIEBwYXJhbSBpbWdEYXRhIFxyXG4gKiBAcGFyYW0gcGFsZXR0ZSBcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZVBpeGVsT3ZlcmxheSh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcGFsZXR0ZTogbnVtYmVyW10sIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSk6IFNldDxudW1iZXI+W10ge1xyXG4gICAgY29uc3Qgb3ZlcmxheSA9IGFycmF5LmdlbmVyYXRlKHBhbGV0dGUubGVuZ3RoLCAoKSA9PiBuZXcgU2V0PG51bWJlcj4oKSlcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHdpZHRoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIC8vIHBhY2sgY29sb3IgdG8gYSB1bmlxdWUgdmFsdWVcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgcGFsZXR0ZUlkeCA9IHBhbGV0dGVPdmVybGF5W29mZnNldF1cclxuICAgICAgICAgICAgaWYgKHBhbGV0dGVJZHggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBmbGF0Q29vcmQgPSBmbGF0KHgsIHksIHdpZHRoKVxyXG4gICAgICAgICAgICBvdmVybGF5W3BhbGV0dGVJZHhdLmFkZChmbGF0Q29vcmQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBvdmVybGF5XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhY2tDb2xvcihyOiBudW1iZXIsIGc6IG51bWJlciwgYjogbnVtYmVyLCBhOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgY29uc3QgdmFsdWUgPSByIDw8IDI0IHwgZyA8PCAxNiB8IGIgPDwgOCB8IGFcclxuICAgIHJldHVybiB2YWx1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiB1bnBhY2tDb2xvcih4OiBudW1iZXIpOiBDb2xvciB7XHJcbiAgICBjb25zdCByID0gKHggJiAweEZGMDAwMDAwKSA+Pj4gMjRcclxuICAgIGNvbnN0IGcgPSAoeCAmIDB4MDBGRjAwMDApID4+PiAxNlxyXG4gICAgY29uc3QgYiA9ICh4ICYgMHgwMDAwRkYwMCkgPj4+IDhcclxuICAgIGNvbnN0IGEgPSB4ICYgMHgwMDAwMDBGRlxyXG5cclxuICAgIHJldHVybiBbciwgZywgYiwgYV1cclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY0x1bWluYW5jZShyOiBudW1iZXIsIGc6IG51bWJlciwgYjogbnVtYmVyKSB7XHJcbiAgICBjb25zdCBsID0gMC4yMTI2ICogKHIgLyAyNTUpICsgMC43MTUyICogKGcgLyAyNTUpICsgMC4wNzIyICogKGIgLyAyNTUpXHJcbiAgICByZXR1cm4gbFxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3Q2VsbEltYWdlKGN0eDogT2Zmc2NyZWVuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcGFsZXR0ZU92ZXJsYXk6IG51bWJlcltdKSB7XHJcbiAgICBjb25zdCBjZWxsSW1hZ2VXaWR0aCA9IHdpZHRoICogKGNlbGxTaXplICsgMSkgKyAxXHJcbiAgICBjb25zdCBjZWxsSW1hZ2VIZWlnaHQgPSBoZWlnaHQgKiAoY2VsbFNpemUgKyAxKSArIDFcclxuXHJcbiAgICAvLyBzaXplIGNhbnZhc1xyXG4gICAgY3R4LmNhbnZhcy53aWR0aCA9IGNlbGxJbWFnZVdpZHRoXHJcbiAgICBjdHguY2FudmFzLmhlaWdodCA9IGNlbGxJbWFnZUhlaWdodFxyXG5cclxuICAgIC8vIGRyYXcgaG9yaXpvbnRhbCBncmlkIGxpbmVzXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8PSBoZWlnaHQ7ICsraSkge1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KDAsIGkgKiAoY2VsbFNpemUgKyAxKSwgY2VsbEltYWdlV2lkdGgsIDEpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gZHJhdyB2ZXJ0aWNhbCBncmlkIGxpbmVzXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8PSB3aWR0aDsgKytpKSB7XHJcbiAgICAgICAgY3R4LnN0cm9rZVJlY3QoaSAqIChjZWxsU2l6ZSArIDEpLCAwLCAxLCBjZWxsSW1hZ2VIZWlnaHQpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gZHJhdyAjc1xyXG4gICAgY29uc3QgZm9udCA9IGN0eC5mb250XHJcbiAgICBjdHguZm9udCA9IFwiMTZweCBhcmlhbFwiXHJcbiAgICBjb25zdCB0ZXh0SGVpZ2h0ID0gY3R4Lm1lYXN1cmVUZXh0KFwiTVwiKS53aWR0aFxyXG4gICAgY29uc3QgY2R4eSA9IGNlbGxTaXplIC8gMlxyXG5cclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHdpZHRoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGNvbnN0IHBhbGV0dGVJZHggPSBwYWxldHRlT3ZlcmxheVtvZmZzZXRdXHJcbiAgICAgICAgICAgIGlmIChwYWxldHRlSWR4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgLy8gZmlsbCB0aGlzIHBhcnQgb2YgdGhlIGltYWdlIGluIHdpdGggc29saWQgY29sb3IhXHJcblxyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgbGFiZWwgPSBgJHtwYWxldHRlSWR4ICsgMX1gXHJcbiAgICAgICAgICAgIGNvbnN0IG1ldHJpY3MgPSBjdHgubWVhc3VyZVRleHQobGFiZWwpXHJcbiAgICAgICAgICAgIGNvbnN0IGN4ID0geCAqIChjZWxsU2l6ZSArIDEpICsgY2R4eSArIDEgLSBtZXRyaWNzLndpZHRoIC8gMlxyXG4gICAgICAgICAgICBjb25zdCBjeSA9IHkgKiAoY2VsbFNpemUgKyAxKSArIGNkeHkgKyAxICsgdGV4dEhlaWdodCAvIDJcclxuICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGxhYmVsLCBjeCwgY3kpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGN0eC5mb250ID0gZm9udFxyXG59XHJcblxyXG5mdW5jdGlvbiBmaXQod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIG1heFNpemU6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgaWYgKHdpZHRoID4gaGVpZ2h0ICYmIHdpZHRoID4gbWF4U2l6ZSkge1xyXG4gICAgICAgIGhlaWdodCA9IG1heFNpemUgKiBoZWlnaHQgLyB3aWR0aFxyXG4gICAgICAgIHJldHVybiBbTWF0aC5mbG9vcihtYXhTaXplKSwgTWF0aC5mbG9vcihoZWlnaHQpXVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChoZWlnaHQgPiB3aWR0aCAmJiBoZWlnaHQgPiBtYXhTaXplKSB7XHJcbiAgICAgICAgd2lkdGggPSBtYXhTaXplICogd2lkdGggLyBoZWlnaHRcclxuICAgICAgICByZXR1cm4gW01hdGguZmxvb3Iod2lkdGgpLCBNYXRoLmZsb29yKG1heFNpemUpXVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBbTWF0aC5mbG9vcih3aWR0aCksIE1hdGguZmxvb3IoaGVpZ2h0KV1cclxufVxyXG5cclxuZnVuY3Rpb24gZmxhdCh4OiBudW1iZXIsIHk6IG51bWJlciwgcm93UGl0Y2g6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIHkgKiByb3dQaXRjaCArIHhcclxufVxyXG5cclxuZnVuY3Rpb24gdW5mbGF0KGk6IG51bWJlciwgcm93UGl0Y2g6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgcmV0dXJuIFtpICUgcm93UGl0Y2gsIE1hdGguZmxvb3IoaSAvIHJvd1BpdGNoKV1cclxufVxyXG5cclxuLyoqXHJcbiAgICogQ29udmVydCBhbiBpbWFnZSB4IG9yIHkgY29vcmRpbmF0ZSB0byB0b3Agb3IgbGVmdCBvZiBjYm4gY2VsbCBjb250YWluaW5nIHRoYXQgcGl4ZWxcclxuICAgKiBAcGFyYW0gY29vcmQgeCBvciB5IGNvb3JkaW5hdGVcclxuICAgKi9cclxuZnVuY3Rpb24gaW1hZ2UyQ2VsbENvb3JkKGNvb3JkOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIGNvb3JkICogKGNlbGxTaXplICsgMSkgKyAxXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0IGEgY2JuIHggb3IgeSBjb29yZGluYXRlIHRvIHRvcCBvciBsZWZ0IG9mIGNibiBjZWxsIGNvbnRhaW5pbmcgdGhhdCBwaXhlbFxyXG4gKiBAcGFyYW0gY29vcmQgeCBvciB5IGNvb3JkaW5hdGVcclxuICovXHJcbmZ1bmN0aW9uIGNlbGwySW1hZ2VDb29yZChjb29yZDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBNYXRoLmZsb29yKChjb29yZCAtIDEpIC8gKGNlbGxTaXplICsgMSkpXHJcbn1cclxuXHJcbi8qKlxyXG4gICAqIENvbnZlcnQgYW4gaW1hZ2UgeCBvciB5IGNvb3JkaW5hdGUgdG8gdG9wIG9yIGxlZnQgb2YgY2JuIGNlbGwgY29udGFpbmluZyB0aGF0IHBpeGVsXHJcbiAgICogQHBhcmFtIGNvb3JkIHggb3IgeSBjb29yZGluYXRlXHJcbiAgICovXHJcbmZ1bmN0aW9uIGltYWdlMkNlbGwoeDogbnVtYmVyLCB5OiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIHJldHVybiBbaW1hZ2UyQ2VsbENvb3JkKHgpLCBpbWFnZTJDZWxsQ29vcmQoeSldXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0IGEgY2JuIHggb3IgeSBjb29yZGluYXRlIHRvIHRvcCBvciBsZWZ0IG9mIGNibiBjZWxsIGNvbnRhaW5pbmcgdGhhdCBwaXhlbFxyXG4gKiBAcGFyYW0gY29vcmQgeCBvciB5IGNvb3JkaW5hdGVcclxuICovXHJcbmZ1bmN0aW9uIGNlbGwySW1hZ2UoeDogbnVtYmVyLCB5OiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIHJldHVybiBbY2VsbDJJbWFnZUNvb3JkKHgpLCBjZWxsMkltYWdlQ29vcmQoeSldXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjb252ZXJ0IHJnYmEgY29vcmRpbmF0ZXMgdG8gYSBzdHlsZSBzdHJpbmdcclxuICogQHBhcmFtIHIgcmVkXHJcbiAqIEBwYXJhbSBnIGdyZWVuXHJcbiAqIEBwYXJhbSBiIGJsdWVcclxuICogQHBhcmFtIGEgYWxwaGFcclxuICovXHJcbmZ1bmN0aW9uIGNvbG9yMlJHQkFTdHlsZShyOiBudW1iZXIsIGc6IG51bWJlciwgYjogbnVtYmVyLCBhOiBudW1iZXIgPSAyNTUpIHtcclxuICAgIHJldHVybiBgcmdiYSgke3J9LCAke2d9LCAke2J9LCAke2EgLyAyNTV9KWBcclxufVxyXG5cclxuZnVuY3Rpb24gcXVhbnRNZWRpYW5DdXQoY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQgfCBPZmZzY3JlZW5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIG1heENvbG9yczogbnVtYmVyKSB7XHJcbiAgICBpbnRlcmZhY2UgUGl4ZWwge1xyXG4gICAgICAgIG9mZnNldDogbnVtYmVyXHJcbiAgICAgICAgcjogbnVtYmVyXHJcbiAgICAgICAgZzogbnVtYmVyXHJcbiAgICAgICAgYjogbnVtYmVyXHJcbiAgICB9XHJcblxyXG4gICAgLy8gbWF4Q29sb3JzIG11c3QgYmUgYSBwb3dlciBvZiAyIGZvciB0aGlzIGFsZ29yaXRobVxyXG4gICAgbWF4Q29sb3JzID0gbWF0aC5uZXh0UG93MihtYXhDb2xvcnMpXHJcbiAgICBjb25zdCBpbWdEYXRhID0gY3R4LmdldEltYWdlRGF0YSgwLCAwLCBjdHguY2FudmFzLndpZHRoLCBjdHguY2FudmFzLmhlaWdodClcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgZGF0YSB9ID0gaW1nRGF0YVxyXG4gICAgY29uc3Qgcm93UGl0Y2ggPSB3aWR0aCAqIDRcclxuXHJcbiAgICBjb25zdCBidWNrZXRzID0gbmV3IEFycmF5PFBpeGVsW10+KClcclxuICAgIGJ1Y2tldHMucHVzaChjcmVhdGVJbml0aWFsQnVja2V0KCkpXHJcblxyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICBjb25zdCBidWNrZXQgPSBjaG9vc2VCdWNrZXQoY29sb3JSYW5nZVRvbGVyYW5jZSwgYnVja2V0cylcclxuICAgICAgICBpZiAoIWJ1Y2tldCkge1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYnVja2V0cy5wdXNoKHNwbGl0QnVja2V0KGJ1Y2tldCkpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gY2FsY3VsYXRlIHRoZSBhdmVyYWdlIGNvbG9yIGZvciBlYWNoIGJ1Y2tldFxyXG4gICAgY29uc3QgY29sb3JzID0gbmV3IEFycmF5PFtudW1iZXIsIG51bWJlciwgbnVtYmVyXT4oKVxyXG4gICAgZm9yIChjb25zdCBidWNrZXQgb2YgYnVja2V0cykge1xyXG4gICAgICAgIGxldCByID0gMFxyXG4gICAgICAgIGxldCBnID0gMFxyXG4gICAgICAgIGxldCBiID0gMFxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHBpeGVsIG9mIGJ1Y2tldCkge1xyXG4gICAgICAgICAgICByICs9IHBpeGVsLnJcclxuICAgICAgICAgICAgZyArPSBwaXhlbC5nXHJcbiAgICAgICAgICAgIGIgKz0gcGl4ZWwuYlxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgciAvPSBidWNrZXQubGVuZ3RoXHJcbiAgICAgICAgZyAvPSBidWNrZXQubGVuZ3RoXHJcbiAgICAgICAgYiAvPSBidWNrZXQubGVuZ3RoXHJcblxyXG4gICAgICAgIGNvbG9ycy5wdXNoKFtNYXRoLnJvdW5kKHIpLCBNYXRoLnJvdW5kKGcpLCBNYXRoLnJvdW5kKGIpXSlcclxuICAgIH1cclxuXHJcbiAgICAvLyBpdGVyYXRlIHRocm91Z2ggZWFjaCBidWNrZXQsIHJlcGxhY2luZyBwaXhlbCBjb2xvciB3aXRoIGJ1Y2tldCBjb2xvciBmb3IgZWFjaCBwaXhlbFxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBidWNrZXRzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgYnVja2V0ID0gYnVja2V0c1tpXVxyXG4gICAgICAgIGNvbnN0IFtyLCBnLCBiXSA9IGNvbG9yc1tpXVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHBpeGVsIG9mIGJ1Y2tldCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSBwaXhlbC5vZmZzZXQgKiA0XHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0XSA9IHJcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKyAxXSA9IGdcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKyAyXSA9IGJcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LnB1dEltYWdlRGF0YShpbWdEYXRhLCAwLCAwKVxyXG5cclxuICAgIGZ1bmN0aW9uIGNyZWF0ZUluaXRpYWxCdWNrZXQoKTogUGl4ZWxbXSB7XHJcbiAgICAgICAgLy8gY3JlYXRlIGluaXRpYWwgYnVja2V0XHJcbiAgICAgICAgY29uc3QgYnVja2V0ID0gbmV3IEFycmF5PFBpeGVsPigpXHJcbiAgICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7ICsreSkge1xyXG4gICAgICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHJvd1BpdGNoXHJcbiAgICAgICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHggKiA0XHJcbiAgICAgICAgICAgICAgICBjb25zdCByID0gZGF0YVtvZmZzZXRdXHJcbiAgICAgICAgICAgICAgICBjb25zdCBnID0gZGF0YVtvZmZzZXQgKyAxXVxyXG4gICAgICAgICAgICAgICAgY29uc3QgYiA9IGRhdGFbb2Zmc2V0ICsgMl1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBwYWNrIGludG8gYnVja2V0XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwaXhlbDogUGl4ZWwgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiBmbGF0KHgsIHksIHdpZHRoKSxcclxuICAgICAgICAgICAgICAgICAgICByOiByLFxyXG4gICAgICAgICAgICAgICAgICAgIGc6IGcsXHJcbiAgICAgICAgICAgICAgICAgICAgYjogYlxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGJ1Y2tldC5wdXNoKHBpeGVsKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gYnVja2V0XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2FsY1JhbmdlKHBpeGVsczogUGl4ZWxbXSwgc2VsZWN0b3I6ICh4OiBQaXhlbCkgPT4gbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgbWluID0gSW5maW5pdHlcclxuICAgICAgICBsZXQgbWF4ID0gLUluZmluaXR5XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgcGl4ZWwgb2YgcGl4ZWxzKSB7XHJcbiAgICAgICAgICAgIG1pbiA9IE1hdGgubWluKHNlbGVjdG9yKHBpeGVsKSwgbWluKVxyXG4gICAgICAgICAgICBtYXggPSBNYXRoLm1heChzZWxlY3RvcihwaXhlbCksIG1heClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtYXggLSBtaW5cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjaG9vc2VCdWNrZXQodG9sZXJhbmNlOiBudW1iZXIsIGJ1Y2tldHM6IFBpeGVsW11bXSk6IFBpeGVsW10gfCBudWxsIHtcclxuICAgICAgICBsZXQgbWF4UmFuZ2UgPSAtSW5maW5pdHlcclxuICAgICAgICBsZXQgbWF4QnVja2V0OiBQaXhlbFtdIHwgbnVsbCA9IG51bGxcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBidWNrZXQgb2YgYnVja2V0cykge1xyXG4gICAgICAgICAgICBjb25zdCByYW5nZVIgPSBjYWxjUmFuZ2UoYnVja2V0LCBwID0+IHAucilcclxuICAgICAgICAgICAgY29uc3QgcmFuZ2VHID0gY2FsY1JhbmdlKGJ1Y2tldCwgcCA9PiBwLmcpXHJcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlQiA9IGNhbGNSYW5nZShidWNrZXQsIHAgPT4gcC5iKVxyXG4gICAgICAgICAgICBsZXQgcmFuZ2UgPSAwXHJcbiAgICAgICAgICAgIGlmIChyYW5nZVIgPiByYW5nZUcgJiYgcmFuZ2VSID4gcmFuZ2VCKSB7XHJcbiAgICAgICAgICAgICAgICByYW5nZSA9IHJhbmdlUlxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJhbmdlRyA+IHJhbmdlUikge1xyXG4gICAgICAgICAgICAgICAgcmFuZ2UgPSByYW5nZUdcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJhbmdlID0gcmFuZ2VCXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChyYW5nZSA+IG1heFJhbmdlKSB7XHJcbiAgICAgICAgICAgICAgICBtYXhSYW5nZSA9IHJhbmdlXHJcbiAgICAgICAgICAgICAgICBtYXhCdWNrZXQgPSBidWNrZXRcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1heFJhbmdlID4gdG9sZXJhbmNlID8gbWF4QnVja2V0IDogbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNwbGl0QnVja2V0KGJ1Y2tldDogUGl4ZWxbXSk6IFBpeGVsW10ge1xyXG4gICAgICAgIGNvbnN0IHJhbmdlUiA9IGNhbGNSYW5nZShidWNrZXQsIHAgPT4gcC5yKVxyXG4gICAgICAgIGNvbnN0IHJhbmdlRyA9IGNhbGNSYW5nZShidWNrZXQsIHAgPT4gcC5nKVxyXG4gICAgICAgIGNvbnN0IHJhbmdlQiA9IGNhbGNSYW5nZShidWNrZXQsIHAgPT4gcC5iKVxyXG5cclxuICAgICAgICBpZiAocmFuZ2VSID4gcmFuZ2VHICYmIHJhbmdlUiA+IHJhbmdlQikge1xyXG4gICAgICAgICAgICBidWNrZXQuc29ydCgoYSwgYikgPT4gYS5yIC0gYi5yKVxyXG4gICAgICAgIH0gZWxzZSBpZiAocmFuZ2VHID4gcmFuZ2VSKSB7XHJcbiAgICAgICAgICAgIGJ1Y2tldC5zb3J0KChhLCBiKSA9PiBhLmcgLSBiLmcpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgYnVja2V0LnNvcnQoKGEsIGIpID0+IGEuYiAtIGIuYilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG1pZGRsZSA9IE1hdGguZmxvb3IoYnVja2V0Lmxlbmd0aCAvIDIpXHJcbiAgICAgICAgY29uc3QgbmV3QnVja2V0ID0gYnVja2V0LnNwbGljZShtaWRkbGUpXHJcbiAgICAgICAgcmV0dXJuIG5ld0J1Y2tldFxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwcnVuZVBhbGxldGUocGFsZXR0ZTogbnVtYmVyW10sIHBpeGVsT3ZlcmxheTogU2V0PG51bWJlcj5bXSwgbWF4UGl4ZWxzOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBjdHg6IE9mZnNjcmVlbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCk6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IGluZGljZXNUb0tlZXAgPSBuZXcgU2V0PG51bWJlcj4oYXJyYXkuc2VxdWVuY2UoMCwgcGFsZXR0ZS5sZW5ndGgpKVxyXG5cclxuICAgIGN0eC5jYW52YXMud2lkdGggPSB3aWR0aCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG4gICAgY3R4LmNhbnZhcy5oZWlnaHQgPSBoZWlnaHQgKiAoY2VsbFNpemUgKyAxKSArIDFcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBpeGVsT3ZlcmxheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IHBpeGVscyA9IHBpeGVsT3ZlcmxheVtpXVxyXG4gICAgICAgIGlmIChwaXhlbHMuc2l6ZSA8IG1heFBpeGVscykge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGl0ZXIuYWxsKHBpeGVscywgeCA9PiAhaXNCb3JkZXJQaXhlbCguLi51bmZsYXQoeCwgd2lkdGgpLCB3aWR0aCwgaGVpZ2h0KSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGZpbGwgdGhlc2UgcGl4ZWxzIGluIGltYWdlIHdpdGggYXBwcm9wcmlhdGUgY29sb3JcclxuICAgICAgICBjb25zdCBbciwgZywgYl0gPSB1bnBhY2tDb2xvcihwYWxldHRlW2ldKVxyXG4gICAgICAgIGZvciAoY29uc3QgeHkgb2YgcGl4ZWxzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IHVuZmxhdCh4eSwgd2lkdGgpXHJcbiAgICAgICAgICAgIGNvbnN0IFtjeCwgY3ldID0gaW1hZ2UyQ2VsbCh4LCB5KVxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gY29sb3IyUkdCQVN0eWxlKHIsIGcsIGIpXHJcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdChjeCwgY3ksIGNlbGxTaXplLCBjZWxsU2l6ZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGluZGljZXNUb0tlZXAuZGVsZXRlKGkpXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbmV3UGFsZXR0ZSA9IFsuLi5pbmRpY2VzVG9LZWVwXS5tYXAoeCA9PiBwYWxldHRlW3hdKVxyXG4gICAgcmV0dXJuIG5ld1BhbGV0dGVcclxufVxyXG5cclxuZnVuY3Rpb24gaXNCb3JkZXJQaXhlbCh4OiBudW1iZXIsIHk6IG51bWJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB4ID09PSAwIHx8IHkgPT09IDAgfHwgeCA9PT0gd2lkdGggLSAxIHx8IHkgPT09IGhlaWdodCAtIDFcclxufVxyXG5cclxubmV3IENCTigpIl19