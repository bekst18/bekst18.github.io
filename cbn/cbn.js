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
        this.colorDrag = false;
        this.touchZoom = 0;
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
        this.zoom = 1;
        this.drag = false;
        this.touchZoom = 0;
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
        // debug - fill all pixels but first unfilled
        // {
        //     let skipped1 = false
        //     for (let y = 0; y < this.imageHeight; ++y) {
        //         let yOffset = y * this.imageWidth
        //         for (let x = 0; x < this.imageWidth; ++x) {
        //             const paletteIdx = this.paletteOverlay[flat(x, y, this.imageWidth)]
        //             if (paletteIdx === -1) {
        //                 continue
        //             }
        //             let xOffset = yOffset + x
        //             if (!skipped1 && this.paletteOverlay[xOffset] !== -1) {
        //                 skipped1 = true
        //                 continue
        //             }
        //             this.selectPaletteEntry(paletteIdx)
        //             this.tryFillCell(x, y)
        //         }
        //     }
        // }
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
            this.touchZoom = this.zoom;
            return;
        }
        // are we overtop of a selected palette entry pixel?
        this.canvas.setPointerCapture(e.pointerId);
        this.drag = true;
        this.dragLast = new geo.Vec2(e.offsetX, e.offsetY);
        this.touch1Start = new geo.Vec2(e.offsetX, e.offsetY);
        this.touchZoom = this.zoom;
        // transform click coordinates to canvas coordinates
        const [x, y] = this.canvas2Cell(e.offsetX, e.offsetY);
        if (this.tryFillCell(x, y)) {
            this.colorDrag = true;
        }
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
        this.colorDrag = false;
        this.touchZoom = this.zoom;
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
            this.zoom = this.touchZoom * d1 / d0;
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
        if (this.colorDrag && this.paletteOverlay[flat(x, y, this.imageWidth)] === this.selectedPaletteIndex) {
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
        if (idx === -1) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQTtBQUN2QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBRXpDLDRDQUE0QztBQUM1QyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFFbkIsMkRBQTJEO0FBQzNELE1BQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFBO0FBRTlCLCtCQUErQjtBQUMvQixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQTtBQUVoQyxJQUFLLFVBSUo7QUFKRCxXQUFLLFVBQVU7SUFDWCwyQ0FBSSxDQUFBO0lBQ0osMkNBQUksQ0FBQTtJQUNKLHlEQUFXLENBQUE7QUFDZixDQUFDLEVBSkksVUFBVSxLQUFWLFVBQVUsUUFJZDtBQUlELE1BQU0sT0FBTztJQUFiO1FBQ3FCLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUE7SUFlNUQsQ0FBQztJQWJVLFFBQVEsQ0FBQyxVQUEwQjtRQUN0QyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRU0sV0FBVyxDQUFDLFVBQTBCO1FBQ3pDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFTSxPQUFPLENBQUMsQ0FBSTtRQUNmLEtBQUssTUFBTSxVQUFVLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUN2QyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7U0FD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YztJQUN0RSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssTUFBTSxHQUFHLENBQUMsQ0FBQTtBQUNwRSxDQUFDO0FBRUQsSUFBSSxHQUFHLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIlxyXG5pbXBvcnQgKiBhcyBkb20gZnJvbSBcIi4uL3NoYXJlZC9kb20uanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8zZC5qc1wiXHJcbmltcG9ydCAqIGFzIG1hdGggZnJvbSBcIi4uL3NoYXJlZC9tYXRoLmpzXCJcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tIFwiLi4vc2hhcmVkL3V0aWwuanNcIlxyXG5pbXBvcnQgKiBhcyBpdGVyIGZyb20gXCIuLi9zaGFyZWQvaXRlci5qc1wiXHJcblxyXG4vLyBzaXplIHRoYXQgZWFjaCBpbWFnZSBwaXhlbCBpcyBibG93biB1cCB0b1xyXG5jb25zdCBjZWxsU2l6ZSA9IDMyXHJcblxyXG4vLyB0b2xlcmFuY2UgYmVmb3JlIHNwbGl0dGluZyBjb2xvcnMgLSBoaWdoZXIgPSBsZXNzIGNvbG9yc1xyXG5jb25zdCBjb2xvclJhbmdlVG9sZXJhbmNlID0gNjRcclxuXHJcbi8vIG1heCBiZyBwaXhlbHMgYmVmb3JlIHJlbW92YWxcclxuY29uc3QgbWF4QmFja2dyb3VuZFBpeGVscyA9IDEwMjRcclxuXHJcbmVudW0gQ2FtZXJhTW9kZSB7XHJcbiAgICBOb25lLFxyXG4gICAgVXNlcixcclxuICAgIEVudmlyb25tZW50LFxyXG59XHJcblxyXG50eXBlIENvbG9yID0gW251bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl1cclxuXHJcbmNsYXNzIENoYW5uZWw8VD4ge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdWJzY3JpYmVycyA9IG5ldyBTZXQ8KHg6IFQpID0+IHZvaWQ+KClcclxuXHJcbiAgICBwdWJsaWMgc3ViY3JpYmUoc3Vic2NyaWJlcjogKHg6IFQpID0+IHZvaWQpIHtcclxuICAgICAgICB0aGlzLnN1YnNjcmliZXJzLmFkZChzdWJzY3JpYmVyKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyB1bnN1YnNjcmliZShzdWJzY3JpYmVyOiAoeDogVCkgPT4gdm9pZCkge1xyXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlcnMuZGVsZXRlKHN1YnNjcmliZXIpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHB1Ymxpc2goeDogVCk6IHZvaWQge1xyXG4gICAgICAgIGZvciAoY29uc3Qgc3Vic2NyaWJlciBvZiB0aGlzLnN1YnNjcmliZXJzKSB7XHJcbiAgICAgICAgICAgIHN1YnNjcmliZXIoeClcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSBDQk5JbWFnZVNvdXJjZSB7XHJcbiAgICB3aWR0aDogbnVtYmVyXHJcbiAgICBoZWlnaHQ6IG51bWJlclxyXG4gICAgc291cmNlOiBIVE1MVmlkZW9FbGVtZW50IHwgSFRNTEltYWdlRWxlbWVudFxyXG59XHJcblxyXG5jbGFzcyBMb2FkVWkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW1lcmEgPSBkb20uYnlJZChcImNhbWVyYVwiKSBhcyBIVE1MVmlkZW9FbGVtZW50XHJcbiAgICBwcml2YXRlIGNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLk5vbmVcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYWNxdWlyZUltYWdlRGl2ID0gZG9tLmJ5SWQoXCJhY3F1aXJlSW1hZ2VcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FwdHVyZUltYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJjYXB0dXJlSW1hZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbG9hZFVpRGl2ID0gZG9tLmJ5SWQoXCJsb2FkVWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbWF4RGltSW5wdXQgPSBkb20uYnlJZChcIm1heERpbVwiKSBhcyBIVE1MSW5wdXRFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpbGVEcm9wQm94ID0gZG9tLmJ5SWQoXCJmaWxlRHJvcEJveFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmaWxlSW5wdXQgPSBkb20uYnlJZChcImZpbGVJbnB1dFwiKSBhcyBIVE1MSW5wdXRFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpbGVCdXR0b24gPSBkb20uYnlJZChcImZpbGVCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdXNlQ2FtZXJhQnV0dG9uID0gZG9tLmJ5SWQoXCJ1c2VDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmxpcENhbWVyYUJ1dHRvbiA9IGRvbS5ieUlkKFwiZmxpcENhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdG9wQ2FtZXJhQnV0dG9uID0gZG9tLmJ5SWQoXCJzdG9wQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxpYnJhcnlCdXR0b24gPSBkb20uYnlJZChcImxpYnJhcnlCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZXJyb3JzRGl2ID0gZG9tLmJ5SWQoXCJlcnJvcnNcIik7XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgaW1hZ2VMb2FkZWQgPSBuZXcgQ2hhbm5lbDxDQk5JbWFnZVNvdXJjZT4oKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsaWJyYXJ5VWkgPSBuZXcgTGlicmFyeVVpKClcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmZpbGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5maWxlSW5wdXQuY2xpY2soKVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuZmlsZURyb3BCb3guYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdlbnRlclwiLCAoZSkgPT4gdGhpcy5vbkRyYWdFbnRlck92ZXIoZSkpXHJcbiAgICAgICAgdGhpcy5maWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ292ZXJcIiwgKGUpID0+IHRoaXMub25EcmFnRW50ZXJPdmVyKGUpKVxyXG4gICAgICAgIHRoaXMuZmlsZURyb3BCb3guYWRkRXZlbnRMaXN0ZW5lcihcImRyb3BcIiwgKGUpID0+IHRoaXMub25GaWxlRHJvcChlKSlcclxuICAgICAgICB0aGlzLmZpbGVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHRoaXMub25GaWxlQ2hhbmdlKCkpXHJcbiAgICAgICAgdGhpcy51c2VDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMudXNlQ2FtZXJhKCkpXHJcbiAgICAgICAgdGhpcy5mbGlwQ2FtZXJhQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmZsaXBDYW1lcmEoKSlcclxuICAgICAgICB0aGlzLnN0b3BDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuc3RvcENhbWVyYSgpKVxyXG4gICAgICAgIHRoaXMuY2FwdHVyZUltYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmNhcHR1cmVJbWFnZSgpKVxyXG4gICAgICAgIHRoaXMuY2FtZXJhLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRtZXRhZGF0YVwiLCAoKSA9PiB0aGlzLm9uQ2FtZXJhTG9hZCgpKVxyXG4gICAgICAgIHRoaXMubGlicmFyeUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5zaG93TGlicmFyeSgpKVxyXG5cclxuICAgICAgICB0aGlzLmxpYnJhcnlVaS5jYW5jZWwuc3ViY3JpYmUoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRVaURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5sb2FkVWlEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICAvLyB0aGlzLmxvYWRGcm9tVXJsKFwiL2Nibi9hc3NldHMvbGFycnlLb29wYS5qcGdcIilcclxuICAgICAgICAvLyB0aGlzLmxvYWRGcm9tVXJsKFwiL2Nibi9hc3NldHMvb2x0c19mbG93ZXIuanBnXCIpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5sb2FkVWlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgbWF4RGltKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KHRoaXMubWF4RGltSW5wdXQudmFsdWUpIHx8IDEyOFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25EcmFnRW50ZXJPdmVyKGV2OiBEcmFnRXZlbnQpIHtcclxuICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uRmlsZUNoYW5nZSgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuZmlsZUlucHV0LmZpbGVzPy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmaWxlID0gdGhpcy5maWxlSW5wdXQuZmlsZXNbMF1cclxuICAgICAgICB0aGlzLnByb2Nlc3NGaWxlKGZpbGUpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkZpbGVEcm9wKGV2OiBEcmFnRXZlbnQpIHtcclxuICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxuXHJcbiAgICAgICAgaWYgKCFldj8uZGF0YVRyYW5zZmVyPy5maWxlcz8ubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZmlsZSA9IGV2LmRhdGFUcmFuc2Zlci5maWxlc1swXVxyXG4gICAgICAgIHRoaXMucHJvY2Vzc0ZpbGUoZmlsZSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHVzZUNhbWVyYSgpIHtcclxuICAgICAgICB0aGlzLmFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIGNvbnN0IGRpYWxvZ1dpZHRoID0gdGhpcy5hY3F1aXJlSW1hZ2VEaXYuY2xpZW50V2lkdGhcclxuICAgICAgICBjb25zdCBkaWFsb2dIZWlnaHQgPSB0aGlzLmFjcXVpcmVJbWFnZURpdi5jbGllbnRIZWlnaHRcclxuICAgICAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7XHJcbiAgICAgICAgICAgIHZpZGVvOiB7IHdpZHRoOiB7IG1heDogZGlhbG9nV2lkdGggfSwgaGVpZ2h0OiB7IG1heDogZGlhbG9nSGVpZ2h0IH0sIGZhY2luZ01vZGU6IFwidXNlclwiIH0sXHJcbiAgICAgICAgICAgIGF1ZGlvOiBmYWxzZVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuVXNlclxyXG4gICAgICAgIHRoaXMuY2FtZXJhLnNyY09iamVjdCA9IHN0cmVhbVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZmxpcENhbWVyYSgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY2FtZXJhLnNyY09iamVjdCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHNyYyA9IHRoaXMuY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgICAgIGNvbnN0IHRyYWNrcyA9IHNyYy5nZXRUcmFja3MoKVxyXG4gICAgICAgIGZvciAoY29uc3QgdHJhY2sgb2YgdHJhY2tzKSB7XHJcbiAgICAgICAgICAgIHRyYWNrLnN0b3AoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jYW1lcmFNb2RlID0gdGhpcy5jYW1lcmFNb2RlID09IENhbWVyYU1vZGUuVXNlciA/IENhbWVyYU1vZGUuRW52aXJvbm1lbnQgOiBDYW1lcmFNb2RlLlVzZXJcclxuICAgICAgICBjb25zdCBmYWNpbmdNb2RlID0gdGhpcy5jYW1lcmFNb2RlID09IENhbWVyYU1vZGUuVXNlciA/IFwidXNlclwiIDogXCJlbnZpcm9ubWVudFwiXHJcblxyXG4gICAgICAgIC8vIGdldCBjdXJyZW50IGZhY2luZyBtb2RlXHJcbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xyXG4gICAgICAgICAgICB2aWRlbzogeyB3aWR0aDogdGhpcy5jYW1lcmEuY2xpZW50V2lkdGgsIGhlaWdodDogdGhpcy5jYW1lcmEuY2xpZW50SGVpZ2h0LCBmYWNpbmdNb2RlOiBmYWNpbmdNb2RlIH0sXHJcbiAgICAgICAgICAgIGF1ZGlvOiBmYWxzZVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhLnNyY09iamVjdCA9IHN0cmVhbVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25DYW1lcmFMb2FkKCkge1xyXG4gICAgICAgIHRoaXMuYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5jYW1lcmEucGxheSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzdG9wQ2FtZXJhKCkge1xyXG4gICAgICAgIGNvbnN0IHNyYyA9IHRoaXMuY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgICAgIGlmICghc3JjKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdHJhY2tzID0gc3JjLmdldFRyYWNrcygpXHJcbiAgICAgICAgZm9yIChjb25zdCB0cmFjayBvZiB0cmFja3MpIHtcclxuICAgICAgICAgICAgdHJhY2suc3RvcCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLk5vbmVcclxuICAgICAgICB0aGlzLmFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYXB0dXJlSW1hZ2UoKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhckVycm9yTWVzc2FnZXMoKVxyXG5cclxuICAgICAgICBjb25zdCBzcmMgPSB0aGlzLmNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgICAgICBpZiAoIXNyYykge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRyYWNrID0gc3JjLmdldFZpZGVvVHJhY2tzKClbMF1cclxuICAgICAgICBpZiAoIXRyYWNrKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5pbWFnZUxvYWRlZC5wdWJsaXNoKHsgd2lkdGg6IHRoaXMuY2FtZXJhLnZpZGVvV2lkdGgsIGhlaWdodDogdGhpcy5jYW1lcmEudmlkZW9IZWlnaHQsIHNvdXJjZTogdGhpcy5jYW1lcmEgfSlcclxuICAgICAgICB0aGlzLnN0b3BDYW1lcmEoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2hvd0xpYnJhcnkoKSB7XHJcbiAgICAgICAgdGhpcy5sb2FkVWlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMubGlicmFyeVVpLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHJvY2Vzc0ZpbGUoZmlsZTogRmlsZSkge1xyXG4gICAgICAgIHRoaXMuY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpXHJcbiAgICAgICAgdGhpcy5sb2FkRnJvbVVybCh1cmwpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBsb2FkRnJvbVVybCh1cmw6IHN0cmluZykge1xyXG4gICAgICAgIHRoaXMuY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuICAgICAgICBjb25zdCBpbWcgPSBhd2FpdCBkb20ubG9hZEltYWdlKHVybClcclxuICAgICAgICB0aGlzLmltYWdlTG9hZGVkLnB1Ymxpc2goeyB3aWR0aDogaW1nLndpZHRoLCBoZWlnaHQ6IGltZy5oZWlnaHQsIHNvdXJjZTogaW1nIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjbGVhckVycm9yTWVzc2FnZXMoKSB7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRoaXMuZXJyb3JzRGl2KVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBMaWJyYXJ5VWkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsaWJyYXJ5RGl2ID0gZG9tLmJ5SWQoXCJsaWJyYXJ5VWlcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmV0dXJuQnV0dG9uID0gZG9tLmJ5SWQoXCJyZXR1cm5Gcm9tTGlicmFyeUJ1dHRvblwiKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IGltYWdlQ2hvc2VuID0gbmV3IENoYW5uZWw8c3RyaW5nPigpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgY2FuY2VsID0gbmV3IENoYW5uZWw8dm9pZD4oKTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLnJldHVybkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5vblJldHVybkNsaWNrKCkpXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICB0aGlzLmxpYnJhcnlEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmV0dXJuQ2xpY2soKSB7XHJcbiAgICAgICAgdGhpcy5saWJyYXJ5RGl2LmhpZGRlbiA9IHRydWVcclxuICAgICAgICB0aGlzLmNhbmNlbC5wdWJsaXNoKClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgUGxheVVpIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FudmFzID0gZG9tLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWxldHRlRGl2ID0gZG9tLmJ5SWQoXCJwYWxldHRlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVFbnRyeVRlbXBsYXRlID0gZG9tLmJ5SWQoXCJwYWxldHRlRW50cnlcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwbGF5VWlEaXYgPSBkb20uYnlJZChcInBsYXlVaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZXR1cm5CdXR0b24gPSBkb20uYnlJZChcInJldHVybkJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZUNhbnZhcyA9IG5ldyBPZmZzY3JlZW5DYW52YXMoMCwgMClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VDdHggPSB0aGlzLmltYWdlQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2VsbENhbnZhcyA9IG5ldyBPZmZzY3JlZW5DYW52YXMoMCwgMClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2VsbEN0eCA9IHRoaXMuY2VsbENhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVDYW52YXMgPSBuZXcgT2Zmc2NyZWVuQ2FudmFzKDAsIDApXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVDdHggPSB0aGlzLnBhbGV0dGVDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb2xvckNhbnZhcyA9IG5ldyBPZmZzY3JlZW5DYW52YXMoMCwgMClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29sb3JDdHggPSB0aGlzLmNvbG9yQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgY29tcGxldGUgPSBmYWxzZVxyXG4gICAgcHVibGljIHJlYWRvbmx5IHJldHVybiA9IG5ldyBDaGFubmVsPHZvaWQ+KClcclxuICAgIHByaXZhdGUgaW1hZ2VXaWR0aCA9IDBcclxuICAgIHByaXZhdGUgaW1hZ2VIZWlnaHQgPSAwXHJcbiAgICBwcml2YXRlIGNlbnRlclggPSAwXHJcbiAgICBwcml2YXRlIGNlbnRlclkgPSAwXHJcbiAgICBwcml2YXRlIHpvb20gPSAxXHJcbiAgICBwcml2YXRlIGRyYWcgPSBmYWxzZVxyXG4gICAgcHJpdmF0ZSBjb2xvckRyYWcgPSBmYWxzZVxyXG4gICAgcHJpdmF0ZSB0b3VjaFpvb206IG51bWJlciA9IDBcclxuICAgIHByaXZhdGUgdG91Y2gxU3RhcnQ6IGdlby5WZWMyIHwgbnVsbCA9IG51bGxcclxuICAgIHByaXZhdGUgdG91Y2gyU3RhcnQ6IGdlby5WZWMyIHwgbnVsbCA9IG51bGxcclxuICAgIHByaXZhdGUgdG91Y2gxQ3VyOiBnZW8uVmVjMiB8IG51bGwgPSBudWxsXHJcbiAgICBwcml2YXRlIHRvdWNoMkN1cjogZ2VvLlZlYzIgfCBudWxsID0gbnVsbFxyXG4gICAgcHJpdmF0ZSBkcmFnTGFzdCA9IG5ldyBnZW8uVmVjMigwLCAwKVxyXG5cclxuICAgIC8vIGxpc3Qgb2YgY29sb3JzIHVzZSB1c2VkIGluIGltYWdlXHJcbiAgICBwcml2YXRlIHBhbGV0dGU6IG51bWJlcltdID0gW11cclxuXHJcbiAgICAvLyBpbWFnZSBvdmVybGF5IG9mIHBpeGVsIHRvIHBhbGV0dGUgaW5kZXhcclxuICAgIHByaXZhdGUgcGFsZXR0ZU92ZXJsYXk6IG51bWJlcltdID0gW11cclxuXHJcbiAgICAvLyBwYWxldHRlIG92ZXJsYXkgb2YgcGFsZXR0ZSBpbmRleCB0byBsaXN0IG9mIHBpeGVscyBoYXZpbmcgdGhhdCBjb2xvclxyXG4gICAgcHJpdmF0ZSBwaXhlbE92ZXJsYXk6IFNldDxudW1iZXI+W10gPSBbXVxyXG5cclxuICAgIHByaXZhdGUgc2VsZWN0ZWRQYWxldHRlSW5kZXg6IG51bWJlciA9IC0xXHJcbiAgICBwcml2YXRlIHNlcXVlbmNlOiBudW1iZXJbXSA9IFtdXHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmN0eCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW52YXMgZWxlbWVudCBub3Qgc3VwcG9ydGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuY2VsbEN0eCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPZmZzY3JlZW5DYW52YXMgbm90IHN1cHBvcnRlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIGUgPT4gdGhpcy5vblBvaW50ZXJEb3duKGUpKVxyXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVybW92ZVwiLCBlID0+IHRoaXMub25Qb2ludGVyTW92ZShlKSlcclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcnVwXCIsIGUgPT4gdGhpcy5vblBvaW50ZXJVcChlKSlcclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwid2hlZWxcIiwgZSA9PiB0aGlzLm9uV2hlZWwoZSkpXHJcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgZSA9PiB0aGlzLm9uUmVzaXplKGUpKVxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLnBsYXlVaURpdiwgXCJjbGlja1wiLCBcIi5wYWxldHRlLWVudHJ5XCIsIChlKSA9PiB0aGlzLm9uUGFsZXR0ZUVudHJ5Q2xpY2soZSBhcyBNb3VzZUV2ZW50KSlcclxuICAgICAgICB0aGlzLnJldHVybkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5vblJldHVybigpKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzaG93KGltZzogQ0JOSW1hZ2VTb3VyY2UsIG1heERpbTogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5wbGF5VWlEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmNvbXBsZXRlID0gZmFsc2VcclxuICAgICAgICB0aGlzLnpvb20gPSAxXHJcbiAgICAgICAgdGhpcy5kcmFnID0gZmFsc2VcclxuICAgICAgICB0aGlzLnRvdWNoWm9vbSA9IDBcclxuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICBcclxuICAgICAgICAvLyBmaXQgaW1hZ2VcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IFt3LCBoXSA9IGZpdChpbWcud2lkdGgsIGltZy5oZWlnaHQsIG1heERpbSlcclxuICAgICAgICAgICAgdGhpcy5pbWFnZVdpZHRoID0gd1xyXG4gICAgICAgICAgICB0aGlzLmltYWdlSGVpZ2h0ID0gaFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gLy8gZGVidWdcclxuICAgICAgICAvLyB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuaW1hZ2VXaWR0aFxyXG4gICAgICAgIC8vIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2VIZWlnaHRcclxuICAgICAgICAvLyB0aGlzLmN0eC5kcmF3SW1hZ2UoaW1nLnNvdXJjZSwgMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodClcclxuICAgICAgICAvLyBxdWFudE1lZGlhbkN1dCh0aGlzLmN0eCwgNjQpXHJcblxyXG4gICAgICAgIC8vIHJldHVyblxyXG5cclxuICAgICAgICAvLyBpbml0aWFsaXplIGFsbCBkcmF3aW5nIGxheWVyc1xyXG4gICAgICAgIHRoaXMuaW1hZ2VDYW52YXMud2lkdGggPSB0aGlzLmltYWdlV2lkdGhcclxuICAgICAgICB0aGlzLmltYWdlQ2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2VIZWlnaHRcclxuICAgICAgICB0aGlzLmltYWdlQ3R4LmRyYXdJbWFnZShpbWcuc291cmNlLCAwLCAwLCB0aGlzLmltYWdlQ2FudmFzLndpZHRoLCB0aGlzLmltYWdlQ2FudmFzLmhlaWdodClcclxuICAgICAgICBxdWFudE1lZGlhbkN1dCh0aGlzLmltYWdlQ3R4LCA2NClcclxuXHJcbiAgICAgICAgY29uc3QgaW1nRGF0YSA9IHRoaXMuaW1hZ2VDdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodClcclxuICAgICAgICB0aGlzLnBhbGV0dGUgPSBleHRyYWN0UGFsZXR0ZShpbWdEYXRhKVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZU92ZXJsYXkgPSBjcmVhdGVQYWxldHRlT3ZlcmxheShpbWdEYXRhLCB0aGlzLnBhbGV0dGUpXHJcbiAgICAgICAgdGhpcy5waXhlbE92ZXJsYXkgPSBjcmVhdGVQaXhlbE92ZXJsYXkodGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0LCB0aGlzLnBhbGV0dGUsIHRoaXMucGFsZXR0ZU92ZXJsYXkpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlID0gcHJ1bmVQYWxsZXRlKHRoaXMucGFsZXR0ZSwgdGhpcy5waXhlbE92ZXJsYXksIG1heEJhY2tncm91bmRQaXhlbHMsIHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCwgdGhpcy5jb2xvckN0eClcclxuICAgICAgICB0aGlzLnBhbGV0dGVPdmVybGF5ID0gY3JlYXRlUGFsZXR0ZU92ZXJsYXkoaW1nRGF0YSwgdGhpcy5wYWxldHRlKVxyXG4gICAgICAgIHRoaXMucGl4ZWxPdmVybGF5ID0gY3JlYXRlUGl4ZWxPdmVybGF5KHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCwgdGhpcy5wYWxldHRlLCB0aGlzLnBhbGV0dGVPdmVybGF5KVxyXG4gICAgICAgIHRoaXMuY3JlYXRlUGFsZXR0ZVVpKClcclxuICAgICAgICBkcmF3Q2VsbEltYWdlKHRoaXMuY2VsbEN0eCwgdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0LCB0aGlzLnBhbGV0dGVPdmVybGF5KVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZUNhbnZhcy53aWR0aCA9IHRoaXMuY2VsbENhbnZhcy53aWR0aFxyXG4gICAgICAgIHRoaXMucGFsZXR0ZUNhbnZhcy5oZWlnaHQgPSB0aGlzLmNlbGxDYW52YXMuaGVpZ2h0XHJcbiAgICAgICAgdGhpcy5jZW50ZXJYID0gdGhpcy5jYW52YXMud2lkdGggLyAyXHJcbiAgICAgICAgdGhpcy5jZW50ZXJZID0gdGhpcy5jYW52YXMuaGVpZ2h0IC8gMlxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuXHJcbiAgICAgICAgaWYgKHRoaXMucGFsZXR0ZSkge1xyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeSgwKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZXF1ZW5jZSA9IFtdXHJcblxyXG4gICAgICAgIC8vIGRlYnVnIC0gZmlsbCBhbGwgcGl4ZWxzIGJ1dCBmaXJzdCB1bmZpbGxlZFxyXG4gICAgICAgIC8vIHtcclxuICAgICAgICAvLyAgICAgbGV0IHNraXBwZWQxID0gZmFsc2VcclxuICAgICAgICAvLyAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmltYWdlSGVpZ2h0OyArK3kpIHtcclxuICAgICAgICAvLyAgICAgICAgIGxldCB5T2Zmc2V0ID0geSAqIHRoaXMuaW1hZ2VXaWR0aFxyXG4gICAgICAgIC8vICAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLmltYWdlV2lkdGg7ICsreCkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGNvbnN0IHBhbGV0dGVJZHggPSB0aGlzLnBhbGV0dGVPdmVybGF5W2ZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKV1cclxuICAgICAgICAvLyAgICAgICAgICAgICBpZiAocGFsZXR0ZUlkeCA9PT0gLTEpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAvLyAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vICAgICAgICAgICAgIGxldCB4T2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAvLyAgICAgICAgICAgICBpZiAoIXNraXBwZWQxICYmIHRoaXMucGFsZXR0ZU92ZXJsYXlbeE9mZnNldF0gIT09IC0xKSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIHNraXBwZWQxID0gdHJ1ZVxyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIC8vICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgdGhpcy5zZWxlY3RQYWxldHRlRW50cnkocGFsZXR0ZUlkeClcclxuICAgICAgICAvLyAgICAgICAgICAgICB0aGlzLnRyeUZpbGxDZWxsKHgsIHkpXHJcblxyXG4gICAgICAgIC8vICAgICAgICAgfVxyXG4gICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAvLyAvLyBkZWJ1ZyAtIGdvIHN0cmFpZ2h0IHRvIGVuZCBzdGF0ZVxyXG4gICAgICAgIC8vIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5pbWFnZUhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgLy8gICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5pbWFnZVdpZHRoOyArK3gpIHtcclxuICAgICAgICAvLyAgICAgICAgIHRoaXMuc2VxdWVuY2UucHVzaChmbGF0KHgsIHksIHRoaXMuaW1hZ2VXaWR0aCkpXHJcbiAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgIC8vIHJhbmQuc2h1ZmZsZSh0aGlzLnNlcXVlbmNlKVxyXG4gICAgICAgIC8vIHRoaXMuZXhlY0RvbmVTZXF1ZW5jZSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5wbGF5VWlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25SZXR1cm4oKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5yZXR1cm4ucHVibGlzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJlc2l6ZShfOiBVSUV2ZW50KSB7XHJcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLmNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNyZWF0ZVBhbGV0dGVVaSgpIHtcclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGhpcy5wYWxldHRlRGl2KVxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5wYWxldHRlLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFtyLCBnLCBiXSA9IHVucGFja0NvbG9yKHRoaXMucGFsZXR0ZVtpXSlcclxuICAgICAgICAgICAgY29uc3QgbHVtID0gY2FsY0x1bWluYW5jZShyLCBnLCBiKVxyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMucGFsZXR0ZUVudHJ5VGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCBlbnRyeURpdiA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5wYWxldHRlLWVudHJ5XCIpIGFzIEhUTUxFbGVtZW50XHJcbiAgICAgICAgICAgIGVudHJ5RGl2LnRleHRDb250ZW50ID0gYCR7aSArIDF9YFxyXG4gICAgICAgICAgICBlbnRyeURpdi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb2xvcjJSR0JBU3R5bGUociwgZywgYilcclxuICAgICAgICAgICAgZW50cnlEaXYuc3R5bGUuY29sb3IgPSBsdW0gPCAuNSA/IFwid2hpdGVcIiA6IFwiYmxhY2tcIlxyXG4gICAgICAgICAgICB0aGlzLnBhbGV0dGVEaXYuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Qb2ludGVyRG93bihlOiBQb2ludGVyRXZlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghZS5pc1ByaW1hcnkpIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDJTdGFydCA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICAgICAgdGhpcy50b3VjaFpvb20gPSB0aGlzLnpvb21cclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhcmUgd2Ugb3ZlcnRvcCBvZiBhIHNlbGVjdGVkIHBhbGV0dGUgZW50cnkgcGl4ZWw/XHJcbiAgICAgICAgdGhpcy5jYW52YXMuc2V0UG9pbnRlckNhcHR1cmUoZS5wb2ludGVySWQpXHJcbiAgICAgICAgdGhpcy5kcmFnID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuZHJhZ0xhc3QgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgdGhpcy50b3VjaDFTdGFydCA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICB0aGlzLnRvdWNoWm9vbSA9IHRoaXMuem9vbVxyXG5cclxuICAgICAgICAvLyB0cmFuc2Zvcm0gY2xpY2sgY29vcmRpbmF0ZXMgdG8gY2FudmFzIGNvb3JkaW5hdGVzXHJcbiAgICAgICAgY29uc3QgW3gsIHldID0gdGhpcy5jYW52YXMyQ2VsbChlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICBpZiAodGhpcy50cnlGaWxsQ2VsbCh4LCB5KSkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbG9yRHJhZyA9IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb252ZXJ0IGEgY2FudmFzIGNvb3JkaW5hdGUgaW50byBhIGNlbGwgY29vcmRpbmF0ZVxyXG4gICAgICogQHBhcmFtIHggeCBjYW52YXMgY29vcmRpbmF0ZVxyXG4gICAgICogQHBhcmFtIHkgeSBjYW52YXMgY29vcmRpbmF0ZVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNhbnZhczJDZWxsKHg6IG51bWJlciwgeTogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICAgICAgY29uc3QgaW52VHJhbnNmb3JtID0gdGhpcy5jdHguZ2V0VHJhbnNmb3JtKCkuaW52ZXJzZSgpXHJcbiAgICAgICAgY29uc3QgZG9tUHQgPSBpbnZUcmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQoeyB4OiB4LCB5OiB5IH0pXHJcbiAgICAgICAgcmV0dXJuIGNlbGwySW1hZ2UoZG9tUHQueCwgZG9tUHQueSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUG9pbnRlclVwKGU6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGlmICghZS5pc1ByaW1hcnkpIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDJTdGFydCA9IG51bGxcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudG91Y2gxU3RhcnQgPSBudWxsXHJcbiAgICAgICAgdGhpcy5kcmFnID0gZmFsc2VcclxuICAgICAgICB0aGlzLmNvbG9yRHJhZyA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy50b3VjaFpvb20gPSB0aGlzLnpvb21cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUG9pbnRlck1vdmUoZTogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZS5pc1ByaW1hcnkpIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDFDdXIgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDJDdXIgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoYW5kbGUgcGluY2ggem9vbVxyXG4gICAgICAgIGlmICh0aGlzLnRvdWNoMlN0YXJ0ICYmIHRoaXMudG91Y2gxU3RhcnQpIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDFDdXIgPSB0aGlzLnRvdWNoMUN1ciA/PyB0aGlzLnRvdWNoMVN0YXJ0XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gyQ3VyID0gdGhpcy50b3VjaDJDdXIgPz8gdGhpcy50b3VjaDJTdGFydFxyXG4gICAgICAgICAgICBjb25zdCBkMCA9IHRoaXMudG91Y2gxU3RhcnQuc3ViKHRoaXMudG91Y2gyU3RhcnQpLmxlbmd0aCgpXHJcbiAgICAgICAgICAgIGNvbnN0IGQxID0gdGhpcy50b3VjaDFDdXIuc3ViKHRoaXMudG91Y2gyQ3VyKS5sZW5ndGgoKVxyXG4gICAgICAgICAgICB0aGlzLnpvb20gPSB0aGlzLnRvdWNoWm9vbSAqIGQxIC8gZDBcclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5kcmFnKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdHJhbnNmb3JtID0gdGhpcy5jdHguZ2V0VHJhbnNmb3JtKCkuaW52ZXJzZSgpXHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBnZW8uVmVjMi5mcm9tRE9NKHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh0aGlzLmRyYWdMYXN0KSlcclxuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICBjb25zdCBlbmQgPSBnZW8uVmVjMi5mcm9tRE9NKHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChwb3NpdGlvbikpXHJcbiAgICAgICAgY29uc3QgZGVsdGEgPSBlbmQuc3ViKHN0YXJ0KVxyXG5cclxuICAgICAgICAvLyBjaGVjayBmb3IgZHJhZyBvdmVyIHBhbGV0dGUgY29sb3JcclxuICAgICAgICBjb25zdCBbeCwgeV0gPSB0aGlzLmNhbnZhczJDZWxsKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIGlmICh0aGlzLmNvbG9yRHJhZyAmJiB0aGlzLnBhbGV0dGVPdmVybGF5W2ZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKV0gPT09IHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudHJ5RmlsbENlbGwoeCwgeSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoTWF0aC5hYnMoZGVsdGEueCkgPiAzIHx8IE1hdGguYWJzKGRlbHRhLnkpID4gMykge1xyXG4gICAgICAgICAgICB0aGlzLmNlbnRlclggLT0gZGVsdGEueFxyXG4gICAgICAgICAgICB0aGlzLmNlbnRlclkgLT0gZGVsdGEueVxyXG4gICAgICAgICAgICB0aGlzLmRyYWdMYXN0ID0gcG9zaXRpb25cclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uV2hlZWwoZTogV2hlZWxFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUuZGVsdGFZID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnpvb20gKj0gLjVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlLmRlbHRhWSA8IDApIHtcclxuICAgICAgICAgICAgdGhpcy56b29tICo9IDJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUGFsZXR0ZUVudHJ5Q2xpY2soZTogTW91c2VFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBlLnRhcmdldCBhcyBFbGVtZW50XHJcbiAgICAgICAgbGV0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgoZW50cnkpXHJcblxyXG4gICAgICAgIGlmIChpZHggPT09IHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXgpIHtcclxuICAgICAgICAgICAgaWR4ID0gLTFcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2VsZWN0UGFsZXR0ZUVudHJ5KGlkeClcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHRydWUgaWYgc3BlY2lmaWVkIGNlbGwgaXMgdW5maWxsZWQsIGFuZCBoYXMgc3BlY2lmaWVkIHBhbGV0dGUgaW5kZXhcclxuICAgICAqIEBwYXJhbSB4IHggY2VsbCBjb29yZGluYXRlXHJcbiAgICAgKiBAcGFyYW0geSB5IGNlbGwgY29vcmRpbmF0ZVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNoZWNrQ2VsbCh4OiBudW1iZXIsIHk6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgIC8vIGlmIGFscmVhZHkgZmlsbGVkLCBkbyBub3RoaW5nXHJcbiAgICAgICAgY29uc3QgZmxhdFhZID0gZmxhdCh4LCB5LCB0aGlzLmltYWdlV2lkdGgpXHJcbiAgICAgICAgY29uc3QgcGl4ZWxzID0gdGhpcy5waXhlbE92ZXJsYXlbdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleF1cclxuICAgICAgICByZXR1cm4gcGl4ZWxzLmhhcyhmbGF0WFkpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBhdHRlbXB0IHRvIGZpbGwgdGhlIHNwZWNpZmllZCBjZWxsXHJcbiAgICAgKiByZXR1cm5zIHRydWUgaWYgZmlsbGVkLCBmYWxzZSBpZiBjZWxsIGlzIG5vdCBzZWxlY3RlZCBwYWxldHRlIG9yIGFscmVhZHkgZmlsbGVkXHJcbiAgICAgKiBAcGFyYW0geCBcclxuICAgICAqIEBwYXJhbSB5IFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHRyeUZpbGxDZWxsKHg6IG51bWJlciwgeTogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgLy8gaWYgYWxyZWFkeSBmaWxsZWQsIGRvIG5vdGhpbmdcclxuICAgICAgICBpZiAoIXRoaXMuY2hlY2tDZWxsKHgsIHkpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgW3IsIGcsIGJdID0gdW5wYWNrQ29sb3IodGhpcy5wYWxldHRlW3RoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXhdKVxyXG4gICAgICAgIGNvbnN0IFtjeCwgY3ldID0gaW1hZ2UyQ2VsbCh4LCB5KVxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguZmlsbFN0eWxlID0gY29sb3IyUkdCQVN0eWxlKHIsIGcsIGIpXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5maWxsUmVjdChjeCwgY3ksIGNlbGxTaXplLCBjZWxsU2l6ZSlcclxuXHJcbiAgICAgICAgLy8gcmVtb3ZlIHRoZSBwaXhlbCBmcm9tIG92ZXJsYXlcclxuICAgICAgICBjb25zdCBwaXhlbHMgPSB0aGlzLnBpeGVsT3ZlcmxheVt0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4XVxyXG4gICAgICAgIGNvbnN0IGZsYXRYWSA9IGZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKVxyXG4gICAgICAgIHBpeGVscy5kZWxldGUoZmxhdFhZKVxyXG4gICAgICAgIHRoaXMuc2VxdWVuY2UucHVzaChmbGF0WFkpXHJcblxyXG4gICAgICAgIGlmIChwaXhlbHMuc2l6ZSA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbWFyayBwYWxldHRlIGVudHJ5IGFzIGRvbmVcclxuICAgICAgICBjb25zdCBlbnRyeSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIucGFsZXR0ZS1lbnRyeVwiKVt0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4XVxyXG4gICAgICAgIGVudHJ5LmlubmVySFRNTCA9IFwiJmNoZWNrO1wiXHJcbiAgICAgICAgY29uc3QgbmV4dFBhbGV0dGVJZHggPSB0aGlzLmZpbmROZXh0VW5maW5pc2hlZEVudHJ5KHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXgpXHJcbiAgICAgICAgdGhpcy5zZWxlY3RQYWxldHRlRW50cnkobmV4dFBhbGV0dGVJZHgpXHJcblxyXG4gICAgICAgIGlmIChuZXh0UGFsZXR0ZUlkeCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFsbCBjb2xvcnMgY29tcGxldGUhIHNob3cgYW5pbWF0aW9uIG9mIHVzZXIgY29sb3Jpbmcgb3JpZ2luYWwgaW1hZ2VcclxuICAgICAgICB0aGlzLmV4ZWNEb25lU2VxdWVuY2UoKVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzZWxlY3RQYWxldHRlRW50cnkoaWR4OiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4ID0gaWR4XHJcblxyXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIucGFsZXR0ZS1lbnRyeVwiKSlcclxuICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICAgICAgZW50cnkuY2xhc3NMaXN0LnJlbW92ZShcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaWR4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICBlbnRyaWVzW2lkeF0uY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjbGVhciBwYWxldHRlIGNhbnZhc1xyXG4gICAgICAgIGNvbnN0IGN0eCA9IHRoaXMucGFsZXR0ZUN0eFxyXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IHRoaXMucGFsZXR0ZUNhbnZhc1xyXG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KVxyXG5cclxuICAgICAgICBpZiAoaWR4ID09PSAtMSkge1xyXG4gICAgICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGlnaGxpZ2h0IHJlbWFpbmluZyBwaXhlbHMgZm9yIHRoaXMgY29sb3JcclxuICAgICAgICBjb25zdCBmb250ID0gY3R4LmZvbnRcclxuICAgICAgICBjdHguZm9udCA9IFwiYm9sZCAxNnB4IGFyaWFsXCJcclxuICAgICAgICBjb25zdCB0ZXh0SGVpZ2h0ID0gY3R4Lm1lYXN1cmVUZXh0KFwiTVwiKS53aWR0aFxyXG4gICAgICAgIGNvbnN0IGNkeHkgPSBjZWxsU2l6ZSAvIDJcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBwaXhlbCBvZiB0aGlzLnBpeGVsT3ZlcmxheVtpZHhdKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IGltYWdlMkNlbGwoLi4udW5mbGF0KHBpeGVsLCB0aGlzLmltYWdlV2lkdGgpKVxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gY29sb3IyUkdCQVN0eWxlKDE5MSwgMTkxLCAxOTEsIDI1NSlcclxuICAgICAgICAgICAgY3R4LmZpbGxSZWN0KHgsIHksIGNlbGxTaXplLCBjZWxsU2l6ZSlcclxuXHJcbiAgICAgICAgICAgIC8vIGRyYXcgbGFiZWxcclxuICAgICAgICAgICAgY29uc3QgbGFiZWwgPSBgJHtpZHggKyAxfWBcclxuICAgICAgICAgICAgY29uc3QgbWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dChsYWJlbClcclxuICAgICAgICAgICAgY29uc3QgY3ggPSB4ICsgY2R4eSAtIG1ldHJpY3Mud2lkdGggLyAyXHJcbiAgICAgICAgICAgIGNvbnN0IGN5ID0geSArIGNkeHkgKyB0ZXh0SGVpZ2h0IC8gMlxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiXHJcbiAgICAgICAgICAgIGN0eC5maWxsVGV4dChsYWJlbCwgY3gsIGN5KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY3R4LmZvbnQgPSBmb250XHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVkcmF3KCkge1xyXG4gICAgICAgIC8vIG5vdGUgLSBjbGVhciBpcyBzdWJqZWN0IHRvIHRyYW5zZm9ybVxyXG4gICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuY3R4XHJcbiAgICAgICAgdGhpcy5jdHgucmVzZXRUcmFuc2Zvcm0oKVxyXG4gICAgICAgIGNvbnN0IGh3ID0gdGhpcy5jYW52YXMud2lkdGggLyAyIC8gdGhpcy56b29tXHJcbiAgICAgICAgY29uc3QgaGggPSB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyIC8gdGhpcy56b29tXHJcblxyXG4gICAgICAgIHRoaXMuY2VudGVyWCA9IG1hdGguY2xhbXAodGhpcy5jZW50ZXJYLCAwLCB0aGlzLmNlbGxDYW52YXMud2lkdGgpXHJcbiAgICAgICAgdGhpcy5jZW50ZXJZID0gbWF0aC5jbGFtcCh0aGlzLmNlbnRlclksIDAsIHRoaXMuY2VsbENhbnZhcy5oZWlnaHQpXHJcbiAgICAgICAgdGhpcy5jdHguc2NhbGUodGhpcy56b29tLCB0aGlzLnpvb20pXHJcbiAgICAgICAgdGhpcy5jdHgudHJhbnNsYXRlKC10aGlzLmNlbnRlclggKyBodywgLXRoaXMuY2VudGVyWSArIGhoKVxyXG5cclxuICAgICAgICB2YXIgaW52VHJhbnNmb3JtID0gY3R4LmdldFRyYW5zZm9ybSgpLmludmVyc2UoKVxyXG4gICAgICAgIGNvbnN0IHRsID0gaW52VHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHsgeDogMCwgeTogMCB9KVxyXG4gICAgICAgIGNvbnN0IGJyID0gaW52VHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHsgeDogdGhpcy5jYW52YXMud2lkdGgsIHk6IHRoaXMuY2FudmFzLmhlaWdodCB9KVxyXG4gICAgICAgIGN0eC5jbGVhclJlY3QodGwueCwgdGwueSwgYnIueCAtIHRsLngsIGJyLnkgLSB0bC55KVxyXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5jZWxsQ2FudmFzLCAwLCAwKVxyXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5wYWxldHRlQ2FudmFzLCAwLCAwKVxyXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5jb2xvckNhbnZhcywgMCwgMClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZpbmROZXh0VW5maW5pc2hlZEVudHJ5KGk6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHRoaXMucGFsZXR0ZS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBpaSA9IGkgJSB0aGlzLnBhbGV0dGUubGVuZ3RoXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBpeGVsT3ZlcmxheVtpXS5zaXplID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGlpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAtMVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZXhlY0RvbmVTZXF1ZW5jZSgpIHtcclxuICAgICAgICAvLyBzZXQgYXMgZG9uZVxyXG4gICAgICAgIHRoaXMuY29tcGxldGUgPSB0cnVlXHJcblxyXG4gICAgICAgIHRoaXMuY3R4LnJlc2V0VHJhbnNmb3JtKClcclxuXHJcbiAgICAgICAgLy8gZHJhdyBvbmUgcGl4ZWwgYXQgYSB0aW1lIHRvIGNvbG9yIGNhbnZhc1xyXG4gICAgICAgIC8vIG92cmxheSBvbnRvIGNhbnZhc1xyXG4gICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLmltYWdlQ3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQpLmRhdGFcclxuICAgICAgICB0aGlzLmN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodClcclxuICAgICAgICBjb25zdCB6b29tID0gTWF0aC5taW4odGhpcy5jYW52YXMuY2xpZW50V2lkdGggLyB0aGlzLmltYWdlV2lkdGgsIHRoaXMuY2FudmFzLmNsaWVudEhlaWdodCAvIHRoaXMuaW1hZ2VIZWlnaHQpXHJcbiAgICAgICAgdGhpcy5jdHguc2NhbGUoem9vbSwgem9vbSlcclxuXHJcbiAgICAgICAgLy8gY29sb3IgYXMgdXNlciBkaWRcclxuICAgICAgICBjb25zdCBwaXhlbCA9IG5ldyBJbWFnZURhdGEoMSwgMSlcclxuICAgICAgICBjb25zdCBwaXhlbERhdGEgPSBwaXhlbC5kYXRhXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5jYW52YXMud2lkdGggPSB0aGlzLmltYWdlV2lkdGhcclxuICAgICAgICB0aGlzLmNvbG9yQ3R4LmNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlSGVpZ2h0XHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jb2xvckNhbnZhcy53aWR0aCwgdGhpcy5jb2xvckNhbnZhcy5oZWlnaHQpXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zZXF1ZW5jZS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCB4eSA9IHRoaXMuc2VxdWVuY2VbaV1cclxuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gdW5mbGF0KHh5LCB0aGlzLmltYWdlV2lkdGgpXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHh5ICogNFxyXG4gICAgICAgICAgICBwaXhlbERhdGFbMF0gPSBkYXRhW29mZnNldF1cclxuICAgICAgICAgICAgcGl4ZWxEYXRhWzFdID0gZGF0YVtvZmZzZXQgKyAxXVxyXG4gICAgICAgICAgICBwaXhlbERhdGFbMl0gPSBkYXRhW29mZnNldCArIDJdXHJcbiAgICAgICAgICAgIHBpeGVsRGF0YVszXSA9IDI1NVxyXG5cclxuICAgICAgICAgICAgdGhpcy5jb2xvckN0eC5wdXRJbWFnZURhdGEocGl4ZWwsIHgsIHkpXHJcbiAgICAgICAgICAgIHRoaXMuY3R4LmRyYXdJbWFnZSh0aGlzLmNvbG9yQ2FudmFzLCAwLCAwKVxyXG4gICAgICAgICAgICBpZiAoaSAlIDY0ID09IDApIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHV0aWwud2FpdCgwKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBDQk4ge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsb2FkVWkgPSBuZXcgTG9hZFVpKClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGxheVVpID0gbmV3IFBsYXlVaSgpXHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5sb2FkVWkuc2hvdygpXHJcbiAgICAgICAgdGhpcy5sb2FkVWkuaW1hZ2VMb2FkZWQuc3ViY3JpYmUoeCA9PiB0aGlzLm9uSW1hZ2VMb2FkZWQoeCkpXHJcbiAgICAgICAgdGhpcy5wbGF5VWkucmV0dXJuLnN1YmNyaWJlKCgpID0+IHRoaXMub25SZXR1cm4oKSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uSW1hZ2VMb2FkZWQoaW1nOiBDQk5JbWFnZVNvdXJjZSkge1xyXG4gICAgICAgIHRoaXMubG9hZFVpLmhpZGUoKVxyXG4gICAgICAgIHRoaXMucGxheVVpLnNob3coaW1nLCB0aGlzLmxvYWRVaS5tYXhEaW0pXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25SZXR1cm4oKSB7XHJcbiAgICAgICAgdGhpcy5wbGF5VWkuaGlkZSgpXHJcbiAgICAgICAgdGhpcy5sb2FkVWkuc2hvdygpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0UGFsZXR0ZShpbWdEYXRhOiBJbWFnZURhdGEpOiBudW1iZXJbXSB7XHJcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQsIGRhdGEgfSA9IGltZ0RhdGFcclxuICAgIGNvbnN0IHJvd1BpdGNoID0gd2lkdGggKiA0XHJcblxyXG4gICAgLy8gZmluZCB1bmlxdWUgY29sb3JzLCBjcmVhdGUgZW50cnkgZm9yIGVhY2hcclxuICAgIGNvbnN0IHBhbGV0dGUgPSBuZXcgU2V0PG51bWJlcj4oKVxyXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIGNvbnN0IHlPZmZzZXQgPSB5ICogcm93UGl0Y2hcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyArK3gpIHtcclxuICAgICAgICAgICAgLy8gcGFjayBjb2xvciB0byBhIHVuaXF1ZSB2YWx1ZVxyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeCAqIDRcclxuICAgICAgICAgICAgY29uc3QgciA9IGRhdGFbb2Zmc2V0XVxyXG4gICAgICAgICAgICBjb25zdCBnID0gZGF0YVtvZmZzZXQgKyAxXVxyXG4gICAgICAgICAgICBjb25zdCBiID0gZGF0YVtvZmZzZXQgKyAyXVxyXG4gICAgICAgICAgICBjb25zdCBhID0gZGF0YVtvZmZzZXQgKyAzXVxyXG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IHBhY2tDb2xvcihyLCBnLCBiLCBhKVxyXG4gICAgICAgICAgICBwYWxldHRlLmFkZCh2YWx1ZSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFsuLi5wYWxldHRlXVxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGFuIG92ZXJsYXkgdGhhdCBtYXBzIGVhY2ggcGl4ZWwgdG8gdGhlIGluZGV4IG9mIGl0cyBwYWxldHRlIGVudHJ5XHJcbiAqIEBwYXJhbSBpbWdEYXRhIGltYWdlIGRhdGFcclxuICogQHBhcmFtIHBhbGV0dGUgcGFsZXR0ZSBjb2xvcnNcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZVBhbGV0dGVPdmVybGF5KGltZ0RhdGE6IEltYWdlRGF0YSwgcGFsZXR0ZTogbnVtYmVyW10pOiBudW1iZXJbXSB7XHJcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQsIGRhdGEgfSA9IGltZ0RhdGFcclxuICAgIGNvbnN0IHBhbGV0dGVNYXAgPSBhcnJheS5tYXBJbmRpY2VzKHBhbGV0dGUpXHJcbiAgICBjb25zdCByb3dQaXRjaCA9IHdpZHRoICogNFxyXG4gICAgY29uc3Qgb3ZlcmxheSA9IGFycmF5LnVuaWZvcm0oLTEsIHdpZHRoICogaGVpZ2h0KVxyXG5cclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHJvd1BpdGNoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIC8vIHBhY2sgY29sb3IgdG8gYSB1bmlxdWUgdmFsdWVcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHggKiA0XHJcbiAgICAgICAgICAgIGNvbnN0IHIgPSBkYXRhW29mZnNldF1cclxuICAgICAgICAgICAgY29uc3QgZyA9IGRhdGFbb2Zmc2V0ICsgMV1cclxuICAgICAgICAgICAgY29uc3QgYiA9IGRhdGFbb2Zmc2V0ICsgMl1cclxuICAgICAgICAgICAgY29uc3QgYSA9IGRhdGFbb2Zmc2V0ICsgM11cclxuICAgICAgICAgICAgY29uc3QgcmdiYSA9IHBhY2tDb2xvcihyLCBnLCBiLCBhKVxyXG4gICAgICAgICAgICBjb25zdCBpZHggPSBwYWxldHRlTWFwLmdldChyZ2JhKSA/PyAtMVxyXG4gICAgICAgICAgICBvdmVybGF5W3kgKiB3aWR0aCArIHhdID0gaWR4XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBvdmVybGF5XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjcmVhdGUgYW4gb3ZlcmxheSB0aGF0IG1hcHMgZWFjaCBwYWxldHRlIGVudHJ5IHRvIGEgbGlzdCBvZiBwaXhlbHMgd2l0aCBpdHMgY29sb3JcclxuICogQHBhcmFtIGltZ0RhdGEgXHJcbiAqIEBwYXJhbSBwYWxldHRlIFxyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlUGl4ZWxPdmVybGF5KHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBwYWxldHRlOiBudW1iZXJbXSwgcGFsZXR0ZU92ZXJsYXk6IG51bWJlcltdKTogU2V0PG51bWJlcj5bXSB7XHJcbiAgICBjb25zdCBvdmVybGF5ID0gYXJyYXkuZ2VuZXJhdGUocGFsZXR0ZS5sZW5ndGgsICgpID0+IG5ldyBTZXQ8bnVtYmVyPigpKVxyXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIGNvbnN0IHlPZmZzZXQgPSB5ICogd2lkdGhcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyArK3gpIHtcclxuICAgICAgICAgICAgLy8gcGFjayBjb2xvciB0byBhIHVuaXF1ZSB2YWx1ZVxyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgICAgICBjb25zdCBwYWxldHRlSWR4ID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0XVxyXG4gICAgICAgICAgICBpZiAocGFsZXR0ZUlkeCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGZsYXRDb29yZCA9IGZsYXQoeCwgeSwgd2lkdGgpXHJcbiAgICAgICAgICAgIG92ZXJsYXlbcGFsZXR0ZUlkeF0uYWRkKGZsYXRDb29yZClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG92ZXJsYXlcclxufVxyXG5cclxuZnVuY3Rpb24gcGFja0NvbG9yKHI6IG51bWJlciwgZzogbnVtYmVyLCBiOiBudW1iZXIsIGE6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICBjb25zdCB2YWx1ZSA9IHIgPDwgMjQgfCBnIDw8IDE2IHwgYiA8PCA4IHwgYVxyXG4gICAgcmV0dXJuIHZhbHVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVucGFja0NvbG9yKHg6IG51bWJlcik6IENvbG9yIHtcclxuICAgIGNvbnN0IHIgPSAoeCAmIDB4RkYwMDAwMDApID4+PiAyNFxyXG4gICAgY29uc3QgZyA9ICh4ICYgMHgwMEZGMDAwMCkgPj4+IDE2XHJcbiAgICBjb25zdCBiID0gKHggJiAweDAwMDBGRjAwKSA+Pj4gOFxyXG4gICAgY29uc3QgYSA9IHggJiAweDAwMDAwMEZGXHJcblxyXG4gICAgcmV0dXJuIFtyLCBnLCBiLCBhXVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjTHVtaW5hbmNlKHI6IG51bWJlciwgZzogbnVtYmVyLCBiOiBudW1iZXIpIHtcclxuICAgIGNvbnN0IGwgPSAwLjIxMjYgKiAociAvIDI1NSkgKyAwLjcxNTIgKiAoZyAvIDI1NSkgKyAwLjA3MjIgKiAoYiAvIDI1NSlcclxuICAgIHJldHVybiBsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdDZWxsSW1hZ2UoY3R4OiBPZmZzY3JlZW5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBwYWxldHRlT3ZlcmxheTogbnVtYmVyW10pIHtcclxuICAgIGNvbnN0IGNlbGxJbWFnZVdpZHRoID0gd2lkdGggKiAoY2VsbFNpemUgKyAxKSArIDFcclxuICAgIGNvbnN0IGNlbGxJbWFnZUhlaWdodCA9IGhlaWdodCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG5cclxuICAgIC8vIHNpemUgY2FudmFzXHJcbiAgICBjdHguY2FudmFzLndpZHRoID0gY2VsbEltYWdlV2lkdGhcclxuICAgIGN0eC5jYW52YXMuaGVpZ2h0ID0gY2VsbEltYWdlSGVpZ2h0XHJcblxyXG4gICAgLy8gZHJhdyBob3Jpem9udGFsIGdyaWQgbGluZXNcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IGhlaWdodDsgKytpKSB7XHJcbiAgICAgICAgY3R4LnN0cm9rZVJlY3QoMCwgaSAqIChjZWxsU2l6ZSArIDEpLCBjZWxsSW1hZ2VXaWR0aCwgMSlcclxuICAgIH1cclxuXHJcbiAgICAvLyBkcmF3IHZlcnRpY2FsIGdyaWQgbGluZXNcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IHdpZHRoOyArK2kpIHtcclxuICAgICAgICBjdHguc3Ryb2tlUmVjdChpICogKGNlbGxTaXplICsgMSksIDAsIDEsIGNlbGxJbWFnZUhlaWdodClcclxuICAgIH1cclxuXHJcbiAgICAvLyBkcmF3ICNzXHJcbiAgICBjb25zdCBmb250ID0gY3R4LmZvbnRcclxuICAgIGN0eC5mb250ID0gXCIxNnB4IGFyaWFsXCJcclxuICAgIGNvbnN0IHRleHRIZWlnaHQgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoXHJcbiAgICBjb25zdCBjZHh5ID0gY2VsbFNpemUgLyAyXHJcblxyXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIGNvbnN0IHlPZmZzZXQgPSB5ICogd2lkdGhcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyArK3gpIHtcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgcGFsZXR0ZUlkeCA9IHBhbGV0dGVPdmVybGF5W29mZnNldF1cclxuICAgICAgICAgICAgY29uc3QgbGFiZWwgPSBgJHtwYWxldHRlSWR4ICsgMX1gXHJcbiAgICAgICAgICAgIGNvbnN0IG1ldHJpY3MgPSBjdHgubWVhc3VyZVRleHQobGFiZWwpXHJcbiAgICAgICAgICAgIGNvbnN0IGN4ID0geCAqIChjZWxsU2l6ZSArIDEpICsgY2R4eSArIDEgLSBtZXRyaWNzLndpZHRoIC8gMlxyXG4gICAgICAgICAgICBjb25zdCBjeSA9IHkgKiAoY2VsbFNpemUgKyAxKSArIGNkeHkgKyAxICsgdGV4dEhlaWdodCAvIDJcclxuICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGxhYmVsLCBjeCwgY3kpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGN0eC5mb250ID0gZm9udFxyXG59XHJcblxyXG5mdW5jdGlvbiBmaXQod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIG1heFNpemU6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgaWYgKHdpZHRoID4gaGVpZ2h0ICYmIHdpZHRoID4gbWF4U2l6ZSkge1xyXG4gICAgICAgIGhlaWdodCA9IG1heFNpemUgKiBoZWlnaHQgLyB3aWR0aFxyXG4gICAgICAgIHJldHVybiBbTWF0aC5mbG9vcihtYXhTaXplKSwgTWF0aC5mbG9vcihoZWlnaHQpXVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChoZWlnaHQgPiB3aWR0aCAmJiBoZWlnaHQgPiBtYXhTaXplKSB7XHJcbiAgICAgICAgd2lkdGggPSBtYXhTaXplICogd2lkdGggLyBoZWlnaHRcclxuICAgICAgICByZXR1cm4gW01hdGguZmxvb3Iod2lkdGgpLCBNYXRoLmZsb29yKG1heFNpemUpXVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBbTWF0aC5mbG9vcih3aWR0aCksIE1hdGguZmxvb3IoaGVpZ2h0KV1cclxufVxyXG5cclxuZnVuY3Rpb24gZmxhdCh4OiBudW1iZXIsIHk6IG51bWJlciwgcm93UGl0Y2g6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIHkgKiByb3dQaXRjaCArIHhcclxufVxyXG5cclxuZnVuY3Rpb24gdW5mbGF0KGk6IG51bWJlciwgcm93UGl0Y2g6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgcmV0dXJuIFtpICUgcm93UGl0Y2gsIE1hdGguZmxvb3IoaSAvIHJvd1BpdGNoKV1cclxufVxyXG5cclxuLyoqXHJcbiAgICogQ29udmVydCBhbiBpbWFnZSB4IG9yIHkgY29vcmRpbmF0ZSB0byB0b3Agb3IgbGVmdCBvZiBjYm4gY2VsbCBjb250YWluaW5nIHRoYXQgcGl4ZWxcclxuICAgKiBAcGFyYW0gY29vcmQgeCBvciB5IGNvb3JkaW5hdGVcclxuICAgKi9cclxuZnVuY3Rpb24gaW1hZ2UyQ2VsbENvb3JkKGNvb3JkOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIGNvb3JkICogKGNlbGxTaXplICsgMSkgKyAxXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0IGEgY2JuIHggb3IgeSBjb29yZGluYXRlIHRvIHRvcCBvciBsZWZ0IG9mIGNibiBjZWxsIGNvbnRhaW5pbmcgdGhhdCBwaXhlbFxyXG4gKiBAcGFyYW0gY29vcmQgeCBvciB5IGNvb3JkaW5hdGVcclxuICovXHJcbmZ1bmN0aW9uIGNlbGwySW1hZ2VDb29yZChjb29yZDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBNYXRoLmZsb29yKChjb29yZCAtIDEpIC8gKGNlbGxTaXplICsgMSkpXHJcbn1cclxuXHJcbi8qKlxyXG4gICAqIENvbnZlcnQgYW4gaW1hZ2UgeCBvciB5IGNvb3JkaW5hdGUgdG8gdG9wIG9yIGxlZnQgb2YgY2JuIGNlbGwgY29udGFpbmluZyB0aGF0IHBpeGVsXHJcbiAgICogQHBhcmFtIGNvb3JkIHggb3IgeSBjb29yZGluYXRlXHJcbiAgICovXHJcbmZ1bmN0aW9uIGltYWdlMkNlbGwoeDogbnVtYmVyLCB5OiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIHJldHVybiBbaW1hZ2UyQ2VsbENvb3JkKHgpLCBpbWFnZTJDZWxsQ29vcmQoeSldXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0IGEgY2JuIHggb3IgeSBjb29yZGluYXRlIHRvIHRvcCBvciBsZWZ0IG9mIGNibiBjZWxsIGNvbnRhaW5pbmcgdGhhdCBwaXhlbFxyXG4gKiBAcGFyYW0gY29vcmQgeCBvciB5IGNvb3JkaW5hdGVcclxuICovXHJcbmZ1bmN0aW9uIGNlbGwySW1hZ2UoeDogbnVtYmVyLCB5OiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIHJldHVybiBbY2VsbDJJbWFnZUNvb3JkKHgpLCBjZWxsMkltYWdlQ29vcmQoeSldXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjb252ZXJ0IHJnYmEgY29vcmRpbmF0ZXMgdG8gYSBzdHlsZSBzdHJpbmdcclxuICogQHBhcmFtIHIgcmVkXHJcbiAqIEBwYXJhbSBnIGdyZWVuXHJcbiAqIEBwYXJhbSBiIGJsdWVcclxuICogQHBhcmFtIGEgYWxwaGFcclxuICovXHJcbmZ1bmN0aW9uIGNvbG9yMlJHQkFTdHlsZShyOiBudW1iZXIsIGc6IG51bWJlciwgYjogbnVtYmVyLCBhOiBudW1iZXIgPSAyNTUpIHtcclxuICAgIHJldHVybiBgcmdiYSgke3J9LCAke2d9LCAke2J9LCAke2EgLyAyNTV9KWBcclxufVxyXG5cclxuZnVuY3Rpb24gcXVhbnRNZWRpYW5DdXQoY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQgfCBPZmZzY3JlZW5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIG1heENvbG9yczogbnVtYmVyKSB7XHJcbiAgICBpbnRlcmZhY2UgUGl4ZWwge1xyXG4gICAgICAgIG9mZnNldDogbnVtYmVyXHJcbiAgICAgICAgcjogbnVtYmVyXHJcbiAgICAgICAgZzogbnVtYmVyXHJcbiAgICAgICAgYjogbnVtYmVyXHJcbiAgICB9XHJcblxyXG4gICAgLy8gbWF4Q29sb3JzIG11c3QgYmUgYSBwb3dlciBvZiAyIGZvciB0aGlzIGFsZ29yaXRobVxyXG4gICAgbWF4Q29sb3JzID0gbWF0aC5uZXh0UG93MihtYXhDb2xvcnMpXHJcbiAgICBjb25zdCBpbWdEYXRhID0gY3R4LmdldEltYWdlRGF0YSgwLCAwLCBjdHguY2FudmFzLndpZHRoLCBjdHguY2FudmFzLmhlaWdodClcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgZGF0YSB9ID0gaW1nRGF0YVxyXG4gICAgY29uc3Qgcm93UGl0Y2ggPSB3aWR0aCAqIDRcclxuXHJcbiAgICBjb25zdCBidWNrZXRzID0gbmV3IEFycmF5PFBpeGVsW10+KClcclxuICAgIGJ1Y2tldHMucHVzaChjcmVhdGVJbml0aWFsQnVja2V0KCkpXHJcblxyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICBjb25zdCBidWNrZXQgPSBjaG9vc2VCdWNrZXQoY29sb3JSYW5nZVRvbGVyYW5jZSwgYnVja2V0cylcclxuICAgICAgICBpZiAoIWJ1Y2tldCkge1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYnVja2V0cy5wdXNoKHNwbGl0QnVja2V0KGJ1Y2tldCkpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gY2FsY3VsYXRlIHRoZSBhdmVyYWdlIGNvbG9yIGZvciBlYWNoIGJ1Y2tldFxyXG4gICAgY29uc3QgY29sb3JzID0gbmV3IEFycmF5PFtudW1iZXIsIG51bWJlciwgbnVtYmVyXT4oKVxyXG4gICAgZm9yIChjb25zdCBidWNrZXQgb2YgYnVja2V0cykge1xyXG4gICAgICAgIGxldCByID0gMFxyXG4gICAgICAgIGxldCBnID0gMFxyXG4gICAgICAgIGxldCBiID0gMFxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHBpeGVsIG9mIGJ1Y2tldCkge1xyXG4gICAgICAgICAgICByICs9IHBpeGVsLnJcclxuICAgICAgICAgICAgZyArPSBwaXhlbC5nXHJcbiAgICAgICAgICAgIGIgKz0gcGl4ZWwuYlxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgciAvPSBidWNrZXQubGVuZ3RoXHJcbiAgICAgICAgZyAvPSBidWNrZXQubGVuZ3RoXHJcbiAgICAgICAgYiAvPSBidWNrZXQubGVuZ3RoXHJcblxyXG4gICAgICAgIGNvbG9ycy5wdXNoKFtNYXRoLnJvdW5kKHIpLCBNYXRoLnJvdW5kKGcpLCBNYXRoLnJvdW5kKGIpXSlcclxuICAgIH1cclxuXHJcbiAgICAvLyBpdGVyYXRlIHRocm91Z2ggZWFjaCBidWNrZXQsIHJlcGxhY2luZyBwaXhlbCBjb2xvciB3aXRoIGJ1Y2tldCBjb2xvciBmb3IgZWFjaCBwaXhlbFxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBidWNrZXRzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgYnVja2V0ID0gYnVja2V0c1tpXVxyXG4gICAgICAgIGNvbnN0IFtyLCBnLCBiXSA9IGNvbG9yc1tpXVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHBpeGVsIG9mIGJ1Y2tldCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSBwaXhlbC5vZmZzZXQgKiA0XHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0XSA9IHJcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKyAxXSA9IGdcclxuICAgICAgICAgICAgZGF0YVtvZmZzZXQgKyAyXSA9IGJcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LnB1dEltYWdlRGF0YShpbWdEYXRhLCAwLCAwKVxyXG5cclxuICAgIGZ1bmN0aW9uIGNyZWF0ZUluaXRpYWxCdWNrZXQoKTogUGl4ZWxbXSB7XHJcbiAgICAgICAgLy8gY3JlYXRlIGluaXRpYWwgYnVja2V0XHJcbiAgICAgICAgY29uc3QgYnVja2V0ID0gbmV3IEFycmF5PFBpeGVsPigpXHJcbiAgICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7ICsreSkge1xyXG4gICAgICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHJvd1BpdGNoXHJcbiAgICAgICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHggKiA0XHJcbiAgICAgICAgICAgICAgICBjb25zdCByID0gZGF0YVtvZmZzZXRdXHJcbiAgICAgICAgICAgICAgICBjb25zdCBnID0gZGF0YVtvZmZzZXQgKyAxXVxyXG4gICAgICAgICAgICAgICAgY29uc3QgYiA9IGRhdGFbb2Zmc2V0ICsgMl1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBwYWNrIGludG8gYnVja2V0XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwaXhlbDogUGl4ZWwgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiBmbGF0KHgsIHksIHdpZHRoKSxcclxuICAgICAgICAgICAgICAgICAgICByOiByLFxyXG4gICAgICAgICAgICAgICAgICAgIGc6IGcsXHJcbiAgICAgICAgICAgICAgICAgICAgYjogYlxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGJ1Y2tldC5wdXNoKHBpeGVsKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gYnVja2V0XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2FsY1JhbmdlKHBpeGVsczogUGl4ZWxbXSwgc2VsZWN0b3I6ICh4OiBQaXhlbCkgPT4gbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgbWluID0gSW5maW5pdHlcclxuICAgICAgICBsZXQgbWF4ID0gLUluZmluaXR5XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgcGl4ZWwgb2YgcGl4ZWxzKSB7XHJcbiAgICAgICAgICAgIG1pbiA9IE1hdGgubWluKHNlbGVjdG9yKHBpeGVsKSwgbWluKVxyXG4gICAgICAgICAgICBtYXggPSBNYXRoLm1heChzZWxlY3RvcihwaXhlbCksIG1heClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtYXggLSBtaW5cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjaG9vc2VCdWNrZXQodG9sZXJhbmNlOiBudW1iZXIsIGJ1Y2tldHM6IFBpeGVsW11bXSk6IFBpeGVsW10gfCBudWxsIHtcclxuICAgICAgICBsZXQgbWF4UmFuZ2UgPSAtSW5maW5pdHlcclxuICAgICAgICBsZXQgbWF4QnVja2V0OiBQaXhlbFtdIHwgbnVsbCA9IG51bGxcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBidWNrZXQgb2YgYnVja2V0cykge1xyXG4gICAgICAgICAgICBjb25zdCByYW5nZVIgPSBjYWxjUmFuZ2UoYnVja2V0LCBwID0+IHAucilcclxuICAgICAgICAgICAgY29uc3QgcmFuZ2VHID0gY2FsY1JhbmdlKGJ1Y2tldCwgcCA9PiBwLmcpXHJcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlQiA9IGNhbGNSYW5nZShidWNrZXQsIHAgPT4gcC5iKVxyXG4gICAgICAgICAgICBsZXQgcmFuZ2UgPSAwXHJcbiAgICAgICAgICAgIGlmIChyYW5nZVIgPiByYW5nZUcgJiYgcmFuZ2VSID4gcmFuZ2VCKSB7XHJcbiAgICAgICAgICAgICAgICByYW5nZSA9IHJhbmdlUlxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJhbmdlRyA+IHJhbmdlUikge1xyXG4gICAgICAgICAgICAgICAgcmFuZ2UgPSByYW5nZUdcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJhbmdlID0gcmFuZ2VCXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChyYW5nZSA+IG1heFJhbmdlKSB7XHJcbiAgICAgICAgICAgICAgICBtYXhSYW5nZSA9IHJhbmdlXHJcbiAgICAgICAgICAgICAgICBtYXhCdWNrZXQgPSBidWNrZXRcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1heFJhbmdlID4gdG9sZXJhbmNlID8gbWF4QnVja2V0IDogbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNwbGl0QnVja2V0KGJ1Y2tldDogUGl4ZWxbXSk6IFBpeGVsW10ge1xyXG4gICAgICAgIGNvbnN0IHJhbmdlUiA9IGNhbGNSYW5nZShidWNrZXQsIHAgPT4gcC5yKVxyXG4gICAgICAgIGNvbnN0IHJhbmdlRyA9IGNhbGNSYW5nZShidWNrZXQsIHAgPT4gcC5nKVxyXG4gICAgICAgIGNvbnN0IHJhbmdlQiA9IGNhbGNSYW5nZShidWNrZXQsIHAgPT4gcC5iKVxyXG5cclxuICAgICAgICBpZiAocmFuZ2VSID4gcmFuZ2VHICYmIHJhbmdlUiA+IHJhbmdlQikge1xyXG4gICAgICAgICAgICBidWNrZXQuc29ydCgoYSwgYikgPT4gYS5yIC0gYi5yKVxyXG4gICAgICAgIH0gZWxzZSBpZiAocmFuZ2VHID4gcmFuZ2VSKSB7XHJcbiAgICAgICAgICAgIGJ1Y2tldC5zb3J0KChhLCBiKSA9PiBhLmcgLSBiLmcpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgYnVja2V0LnNvcnQoKGEsIGIpID0+IGEuYiAtIGIuYilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG1pZGRsZSA9IE1hdGguZmxvb3IoYnVja2V0Lmxlbmd0aCAvIDIpXHJcbiAgICAgICAgY29uc3QgbmV3QnVja2V0ID0gYnVja2V0LnNwbGljZShtaWRkbGUpXHJcbiAgICAgICAgcmV0dXJuIG5ld0J1Y2tldFxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwcnVuZVBhbGxldGUocGFsZXR0ZTogbnVtYmVyW10sIHBpeGVsT3ZlcmxheTogU2V0PG51bWJlcj5bXSwgbWF4UGl4ZWxzOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBjdHg6IE9mZnNjcmVlbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCk6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IGluZGljZXNUb0tlZXAgPSBuZXcgU2V0PG51bWJlcj4oYXJyYXkuc2VxdWVuY2UoMCwgcGFsZXR0ZS5sZW5ndGgpKVxyXG5cclxuICAgIGN0eC5jYW52YXMud2lkdGggPSB3aWR0aCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG4gICAgY3R4LmNhbnZhcy5oZWlnaHQgPSBoZWlnaHQgKiAoY2VsbFNpemUgKyAxKSArIDFcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBpeGVsT3ZlcmxheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IHBpeGVscyA9IHBpeGVsT3ZlcmxheVtpXVxyXG4gICAgICAgIGlmIChwaXhlbHMuc2l6ZSA8IG1heFBpeGVscykge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGl0ZXIuYWxsKHBpeGVscywgeCA9PiAhaXNCb3JkZXJQaXhlbCguLi51bmZsYXQoeCwgd2lkdGgpLCB3aWR0aCwgaGVpZ2h0KSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGZpbGwgdGhlc2UgcGl4ZWxzIGluIGltYWdlIHdpdGggYXBwcm9wcmlhdGUgY29sb3JcclxuICAgICAgICBjb25zdCBbciwgZywgYl0gPSB1bnBhY2tDb2xvcihwYWxldHRlW2ldKVxyXG4gICAgICAgIGZvciAoY29uc3QgeHkgb2YgcGl4ZWxzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IHVuZmxhdCh4eSwgd2lkdGgpXHJcbiAgICAgICAgICAgIGNvbnN0IFtjeCwgY3ldID0gaW1hZ2UyQ2VsbCh4LCB5KVxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gY29sb3IyUkdCQVN0eWxlKHIsIGcsIGIpXHJcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdChjeCwgY3ksIGNlbGxTaXplLCBjZWxsU2l6ZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGluZGljZXNUb0tlZXAuZGVsZXRlKGkpXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbmV3UGFsZXR0ZSA9IFsuLi5pbmRpY2VzVG9LZWVwXS5tYXAoeCA9PiBwYWxldHRlW3hdKVxyXG4gICAgcmV0dXJuIG5ld1BhbGV0dGVcclxufVxyXG5cclxuZnVuY3Rpb24gaXNCb3JkZXJQaXhlbCh4OiBudW1iZXIsIHk6IG51bWJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB4ID09PSAwIHx8IHkgPT09IDAgfHwgeCA9PT0gd2lkdGggLSAxIHx8IHkgPT09IGhlaWdodCAtIDFcclxufVxyXG5cclxubmV3IENCTigpIl19