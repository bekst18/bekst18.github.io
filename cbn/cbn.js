import * as array from "../shared/array.js";
import * as dom from "../shared/dom.js";
import * as geo from "../shared/geo3d.js";
import * as math from "../shared/math.js";
import * as util from "../shared/util.js";
import * as iter from "../shared/iter.js";
// size that each image pixel is blown up to
const cellSize = 32;
// tolerance before splitting colors - higher = less colors
const colorRangeTolerance = 32;
// max bg pixels before removal
const maxBackgroundPixels = 1024;
// default max dimension
const defaultMaxDim = 128;
// default max colors
const defaultMaxColors = 256;
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
    publish(...args) {
        for (const subscriber of this.subscribers) {
            subscriber(...args);
        }
    }
}
class ImageAcquisitionUi {
    constructor() {
        this.camera = dom.byId("camera");
        this.cameraMode = CameraMode.None;
        this.acquireImageDiv = dom.byId("acquireImage");
        this.captureImageButton = dom.byId("captureImageButton");
        this.imageAcquisitionDiv = dom.byId("imageAcquisitionUi");
        this.fileDropBox = dom.byId("fileDropBox");
        this.fileInput = dom.byId("fileInput");
        this.fileButton = dom.byId("fileButton");
        this.useCameraButton = dom.byId("useCameraButton");
        this.flipCameraButton = dom.byId("flipCameraButton");
        this.stopCameraButton = dom.byId("stopCameraButton");
        // private readonly libraryButton = dom.byId("libraryButton") as HTMLButtonElement
        this.returnToColorByNumberButton = dom.byId("returnToColorByNumber");
        this.errorsDiv = dom.byId("errors");
        this.imageAcquired = new Channel();
        this.returnToColorByNumber = new Channel();
        this.libraryUi = new LibraryUi();
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
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
        // this.libraryButton.addEventListener("click", () => this.showLibrary())
        this.returnToColorByNumberButton.addEventListener("click", () => this.returnToColorByNumber.publish());
        this.libraryUi.cancel.subcribe(() => {
            this.imageAcquisitionDiv.hidden = false;
        });
    }
    show(options) {
        this.imageAcquisitionDiv.hidden = false;
        this.returnToColorByNumberButton.hidden = !options.showReturnToColorByNumber;
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        // this.loadFromUrl("/cbn/assets/larryKoopa.jpg")
        // this.loadFromUrl("/cbn/assets/olts_flower.jpg")
    }
    hide() {
        this.imageAcquisitionDiv.hidden = true;
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
        this.ctx.canvas.width = this.camera.videoWidth;
        this.ctx.canvas.height = this.camera.videoHeight;
        this.ctx.drawImage(this.camera, 0, 0);
        this.imageAcquired.publish(this.canvas);
        this.stopCamera();
    }
    showLibrary() {
        this.imageAcquisitionDiv.hidden = true;
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
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        this.imageAcquired.publish(this.canvas);
    }
    clearErrorMessages() {
        dom.removeAllChildren(this.errorsDiv);
    }
}
class ImageSizeUi {
    constructor() {
        this.imageSizeDiv = dom.byId("imageSizeUi");
        this.maxDimInput = dom.byId("maxDim");
        this.maxColorsInput = dom.byId("maxColors");
        this.createColorByNumberButton = dom.byId("createColorByNumber");
        this.returnButton = dom.byId("imageSizeReturn");
        this.imageScaleCanvas = document.createElement("canvas");
        this.imageScaleCtx = this.imageScaleCanvas.getContext("2d");
        this.imageSizeCanvas = dom.byId("imageSizeCanvas");
        this.imageSizeCtx = this.imageSizeCanvas.getContext("2d");
        this.imageCanvas = document.createElement("canvas");
        this.createCBN = new Channel();
        this.return = new Channel();
        this.createColorByNumberButton.addEventListener("click", () => this.onCreateColorByNumber());
        this.returnButton.addEventListener("click", () => this.onReturnClick());
    }
    show(imageCanvas) {
        this.imageSizeDiv.hidden = false;
        this.imageCanvas = imageCanvas;
        this.maxDimInput.addEventListener("change", () => this.onMaxDimChange());
        this.maxColorsInput.addEventListener("change", () => this.onMaxColorsChange());
        this.redraw();
    }
    hide() {
        this.imageSizeDiv.hidden = true;
    }
    onCreateColorByNumber() {
        this.createCBN.publish(this.imageScaleCanvas);
    }
    onReturnClick() {
        this.return.publish();
    }
    onMaxDimChange() {
        this.redraw();
    }
    onMaxColorsChange() {
        this.redraw();
    }
    redraw() {
        this.imageSizeCanvas.width = this.imageSizeCanvas.clientWidth;
        this.imageSizeCanvas.height = this.imageSizeCanvas.clientHeight;
        const maxDim = this.getMaxDim();
        const maxColors = this.getMaxColors();
        const [w, h] = fit(this.imageCanvas.width, this.imageCanvas.height, maxDim);
        this.imageScaleCanvas.width = w;
        this.imageScaleCanvas.height = h;
        this.imageScaleCtx.drawImage(this.imageCanvas, 0, 0, w, h);
        quantMedianCut(this.imageScaleCtx, maxColors);
        const minScale = Math.min(this.imageSizeCanvas.clientWidth / w, this.imageSizeCanvas.clientHeight / h);
        const sw = w * minScale;
        const sh = h * minScale;
        const x = (this.imageSizeCanvas.width - sw) / 2;
        const y = (this.imageSizeCanvas.height - sh) / 2;
        this.imageSizeCtx.drawImage(this.imageScaleCanvas, x, y, sw, sh);
    }
    getMaxDim() {
        let maxDim = parseInt(this.maxDimInput.value);
        if (!maxDim) {
            maxDim = defaultMaxDim;
            this.maxDimInput.value = maxDim.toString();
        }
        return maxDim;
    }
    getMaxColors() {
        let maxColors = parseInt(this.maxColorsInput.value);
        if (!maxColors) {
            maxColors = defaultMaxColors;
            this.maxColorsInput.value = maxColors.toString();
        }
        return maxColors;
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
        this.imageCanvas = document.createElement("canvas");
        this.imageCtx = this.imageCanvas.getContext("2d");
        this.cellCanvas = document.createElement("canvas");
        this.cellCtx = this.cellCanvas.getContext("2d");
        this.paletteCanvas = document.createElement("canvas");
        this.paletteCtx = this.paletteCanvas.getContext("2d");
        this.colorCanvas = document.createElement("canvas");
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
        this.canvas.addEventListener("pointerdown", e => this.onPointerDown(e));
        this.canvas.addEventListener("pointermove", e => this.onPointerMove(e));
        this.canvas.addEventListener("pointerup", e => this.onPointerUp(e));
        this.canvas.addEventListener("wheel", e => this.onWheel(e));
        window.addEventListener("resize", e => this.onResize(e));
        dom.delegate(this.playUiDiv, "click", ".palette-entry", (e) => this.onPaletteEntryClick(e));
        this.returnButton.addEventListener("click", () => this.onReturn());
    }
    create(img, sequence) {
        this.playUiDiv.hidden = false;
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.complete = false;
        this.zoom = 1;
        this.drag = false;
        this.touchZoom = 0;
        this.imageWidth = img.width;
        this.imageHeight = img.height;
        // capture image
        this.imageCanvas.width = this.imageWidth;
        this.imageCanvas.height = this.imageHeight;
        this.imageCtx.drawImage(img, 0, 0, this.imageCanvas.width, this.imageCanvas.height);
        // debug - show passed image
        // this.canvas.width = this.imageWidth
        // this.canvas.height = this.imageHeight
        // this.ctx.drawImage(this.imageCanvas, 0, 0, this.canvas.width, this.canvas.height)
        // return
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
        this.sequence = sequence;
        for (const xy of sequence) {
            const paletteIdx = this.paletteOverlay[xy];
            const [x, y] = unflat(xy, this.imageWidth);
            this.selectPaletteEntry(paletteIdx);
            this.tryFillCell(x, y);
        }
        this.saveState();
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
    async restore(state) {
        const image = await dom.loadImage(state.image);
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        this.create(canvas, state.sequence);
    }
    show() {
        this.playUiDiv.hidden = false;
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
        this.saveState();
    }
    saveState() {
        saveCBNState({ image: this.imageCanvas.toDataURL(), sequence: this.sequence });
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
        this.acquireUi = new ImageAcquisitionUi();
        this.sizeUi = new ImageSizeUi();
        this.playUi = new PlayUi();
        this.cbnCreated = false;
        this.acquireUi.imageAcquired.subcribe(img => this.onImageAcquired(img));
        this.acquireUi.returnToColorByNumber.subcribe(() => this.onReturnToCBN());
        this.sizeUi.createCBN.subcribe((img) => this.onCreateCBN(img));
        this.sizeUi.return.subcribe(() => this.onReturnToAcquire());
        this.playUi.return.subcribe(() => this.onReturnToAcquire());
        // try to restore state
        const state = loadCBNState();
        if (state.image) {
            showLoadingIndicator();
            this.cbnCreated = true;
            this.acquireUi.hide();
            this.playUi.restore(state);
            hideLoadingIndicator();
            return;
        }
        this.acquireUi.show({ showReturnToColorByNumber: false });
    }
    onImageAcquired(img) {
        showLoadingIndicator();
        this.acquireUi.hide();
        this.sizeUi.show(img);
        hideLoadingIndicator();
    }
    onCreateCBN(img) {
        showLoadingIndicator();
        this.sizeUi.hide();
        this.playUi.create(img, []);
        this.cbnCreated = true;
        hideLoadingIndicator();
    }
    onReturnToAcquire() {
        this.playUi.hide();
        this.sizeUi.hide();
        this.acquireUi.show({ showReturnToColorByNumber: this.cbnCreated });
    }
    onReturnToCBN() {
        this.acquireUi.hide();
        this.sizeUi.hide();
        this.playUi.show();
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
        if (buckets.length >= maxColors) {
            break;
        }
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
function clearCBNState() {
    window.localStorage.clear();
}
function saveCBNState(state) {
    window.localStorage.setItem("state", JSON.stringify(state));
}
function loadCBNState() {
    const data = window.localStorage.getItem("state");
    if (!data) {
        return {
            image: "",
            sequence: []
        };
    }
    const state = JSON.parse(data);
    return state;
}
function showLoadingIndicator() {
    const div = dom.byId("loadingModal");
    div.hidden = false;
}
function hideLoadingIndicator() {
    const div = dom.byId("loadingModal");
    div.hidden = true;
}
new CBN();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQTtBQUN2QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBRXpDLDRDQUE0QztBQUM1QyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFFbkIsMkRBQTJEO0FBQzNELE1BQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFBO0FBRTlCLCtCQUErQjtBQUMvQixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQTtBQUVoQyx3QkFBd0I7QUFDeEIsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFBO0FBRXpCLHFCQUFxQjtBQUNyQixNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQTtBQUU1QixJQUFLLFVBSUo7QUFKRCxXQUFLLFVBQVU7SUFDWCwyQ0FBSSxDQUFBO0lBQ0osMkNBQUksQ0FBQTtJQUNKLHlEQUFXLENBQUE7QUFDZixDQUFDLEVBSkksVUFBVSxLQUFWLFVBQVUsUUFJZDtBQVNELE1BQU0sT0FBTztJQUFiO1FBQ3FCLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQXdCLENBQUE7SUFlbEUsQ0FBQztJQWJVLFFBQVEsQ0FBQyxVQUFnQztRQUM1QyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRU0sV0FBVyxDQUFDLFVBQWdDO1FBQy9DLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFTSxPQUFP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LENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDM0MsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMzQixNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzFDLE1BQU0sTUFBTSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDckIsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMzQixTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMvQixTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMvQixTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFBO1lBRWxCLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDMUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRTtnQkFDYixNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7YUFDckI7U0FDSjtJQUNMLENBQUM7Q0FDSjtBQUVELE1BQU0sR0FBRztJQU1MO1FBTGlCLGNBQVMsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUE7UUFDcEMsV0FBTSxHQUFHLElBQUksV0FBVyxFQUFFLENBQUE7UUFDMUIsV0FBTSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUE7UUFDOUIsZUFBVSxHQUFHLEtBQUssQ0FBQTtR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QyxDQUFBO0lBQ3BDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO0FBQ3JCLENBQUM7QUFFRCxJQUFJLEdBQUcsRUFBRSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiXHJcbmltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzNkLmpzXCJcclxuaW1wb3J0ICogYXMgbWF0aCBmcm9tIFwiLi4vc2hhcmVkL21hdGguanNcIlxyXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gXCIuLi9zaGFyZWQvdXRpbC5qc1wiXHJcbmltcG9ydCAqIGFzIGl0ZXIgZnJvbSBcIi4uL3NoYXJlZC9pdGVyLmpzXCJcclxuXHJcbi8vIHNpemUgdGhhdCBlYWNoIGltYWdlIHBpeGVsIGlzIGJsb3duIHVwIHRvXHJcbmNvbnN0IGNlbGxTaXplID0gMzJcclxuXHJcbi8vIHRvbGVyYW5jZSBiZWZvcmUgc3BsaXR0aW5nIGNvbG9ycyAtIGhpZ2hlciA9IGxlc3MgY29sb3JzXHJcbmNvbnN0IGNvbG9yUmFuZ2VUb2xlcmFuY2UgPSAzMlxyXG5cclxuLy8gbWF4IGJnIHBpeGVscyBiZWZvcmUgcmVtb3ZhbFxyXG5jb25zdCBtYXhCYWNrZ3JvdW5kUGl4ZWxzID0gMTAyNFxyXG5cclxuLy8gZGVmYXVsdCBtYXggZGltZW5zaW9uXHJcbmNvbnN0IGRlZmF1bHRNYXhEaW0gPSAxMjhcclxuXHJcbi8vIGRlZmF1bHQgbWF4IGNvbG9yc1xyXG5jb25zdCBkZWZhdWx0TWF4Q29sb3JzID0gMjU2XHJcblxyXG5lbnVtIENhbWVyYU1vZGUge1xyXG4gICAgTm9uZSxcclxuICAgIFVzZXIsXHJcbiAgICBFbnZpcm9ubWVudCxcclxufVxyXG5cclxudHlwZSBDb2xvciA9IFtudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdXHJcblxyXG5pbnRlcmZhY2UgQ0JOU3RhdGUge1xyXG4gICAgaW1hZ2U6IHN0cmluZ1xyXG4gICAgc2VxdWVuY2U6IG51bWJlcltdXHJcbn1cclxuXHJcbmNsYXNzIENoYW5uZWw8VCBleHRlbmRzIGFueVtdPiB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN1YnNjcmliZXJzID0gbmV3IFNldDwoLi4uYXJnczogVCkgPT4gdm9pZD4oKVxyXG5cclxuICAgIHB1YmxpYyBzdWJjcmliZShzdWJzY3JpYmVyOiAoLi4uYXJnczogVCkgPT4gdm9pZCkge1xyXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlcnMuYWRkKHN1YnNjcmliZXIpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHVuc3Vic2NyaWJlKHN1YnNjcmliZXI6ICguLi5hcmdzOiBUKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVycy5kZWxldGUoc3Vic2NyaWJlcilcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgcHVibGlzaCguLi5hcmdzOiBUKTogdm9pZCB7XHJcbiAgICAgICAgZm9yIChjb25zdCBzdWJzY3JpYmVyIG9mIHRoaXMuc3Vic2NyaWJlcnMpIHtcclxuICAgICAgICAgICAgc3Vic2NyaWJlciguLi5hcmdzKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIEltYWdlQWNxdWlzaXRpb25VaVNob3dPcHRpb25zIHtcclxuICAgIHNob3dSZXR1cm5Ub0NvbG9yQnlOdW1iZXI6IGJvb2xlYW5cclxufVxyXG5cclxuY2xhc3MgSW1hZ2VBY3F1aXNpdGlvblVpIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FtZXJhID0gZG9tLmJ5SWQoXCJjYW1lcmFcIikgYXMgSFRNTFZpZGVvRWxlbWVudFxyXG4gICAgcHJpdmF0ZSBjYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Ob25lXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFjcXVpcmVJbWFnZURpdiA9IGRvbS5ieUlkKFwiYWNxdWlyZUltYWdlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhcHR1cmVJbWFnZUJ1dHRvbiA9IGRvbS5ieUlkKFwiY2FwdHVyZUltYWdlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlQWNxdWlzaXRpb25EaXYgPSBkb20uYnlJZChcImltYWdlQWNxdWlzaXRpb25VaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmaWxlRHJvcEJveCA9IGRvbS5ieUlkKFwiZmlsZURyb3BCb3hcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmlsZUlucHV0ID0gZG9tLmJ5SWQoXCJmaWxlSW5wdXRcIikgYXMgSFRNTElucHV0RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmaWxlQnV0dG9uID0gZG9tLmJ5SWQoXCJmaWxlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHVzZUNhbWVyYUJ1dHRvbiA9IGRvbS5ieUlkKFwidXNlQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZsaXBDYW1lcmFCdXR0b24gPSBkb20uYnlJZChcImZsaXBDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3RvcENhbWVyYUJ1dHRvbiA9IGRvbS5ieUlkKFwic3RvcENhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgLy8gcHJpdmF0ZSByZWFkb25seSBsaWJyYXJ5QnV0dG9uID0gZG9tLmJ5SWQoXCJsaWJyYXJ5QnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJldHVyblRvQ29sb3JCeU51bWJlckJ1dHRvbiA9IGRvbS5ieUlkKFwicmV0dXJuVG9Db2xvckJ5TnVtYmVyXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVycm9yc0RpdiA9IGRvbS5ieUlkKFwiZXJyb3JzXCIpO1xyXG4gICAgcHVibGljIHJlYWRvbmx5IGltYWdlQWNxdWlyZWQgPSBuZXcgQ2hhbm5lbDxbSFRNTENhbnZhc0VsZW1lbnRdPigpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgcmV0dXJuVG9Db2xvckJ5TnVtYmVyID0gbmV3IENoYW5uZWw8W10+KClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGlicmFyeVVpID0gbmV3IExpYnJhcnlVaSgpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuZmlsZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmZpbGVJbnB1dC5jbGljaygpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5maWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2VudGVyXCIsIChlKSA9PiB0aGlzLm9uRHJhZ0VudGVyT3ZlcihlKSlcclxuICAgICAgICB0aGlzLmZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnb3ZlclwiLCAoZSkgPT4gdGhpcy5vbkRyYWdFbnRlck92ZXIoZSkpXHJcbiAgICAgICAgdGhpcy5maWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJvcFwiLCAoZSkgPT4gdGhpcy5vbkZpbGVEcm9wKGUpKVxyXG4gICAgICAgIHRoaXMuZmlsZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4gdGhpcy5vbkZpbGVDaGFuZ2UoKSlcclxuICAgICAgICB0aGlzLnVzZUNhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy51c2VDYW1lcmEoKSlcclxuICAgICAgICB0aGlzLmZsaXBDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuZmxpcENhbWVyYSgpKVxyXG4gICAgICAgIHRoaXMuc3RvcENhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5zdG9wQ2FtZXJhKCkpXHJcbiAgICAgICAgdGhpcy5jYXB0dXJlSW1hZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuY2FwdHVyZUltYWdlKCkpXHJcbiAgICAgICAgdGhpcy5jYW1lcmEuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZG1ldGFkYXRhXCIsICgpID0+IHRoaXMub25DYW1lcmFMb2FkKCkpXHJcbiAgICAgICAgLy8gdGhpcy5saWJyYXJ5QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnNob3dMaWJyYXJ5KCkpXHJcbiAgICAgICAgdGhpcy5yZXR1cm5Ub0NvbG9yQnlOdW1iZXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMucmV0dXJuVG9Db2xvckJ5TnVtYmVyLnB1Ymxpc2goKSlcclxuXHJcbiAgICAgICAgdGhpcy5saWJyYXJ5VWkuY2FuY2VsLnN1YmNyaWJlKCgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5pbWFnZUFjcXVpc2l0aW9uRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2hvdyhvcHRpb25zOiBJbWFnZUFjcXVpc2l0aW9uVWlTaG93T3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMuaW1hZ2VBY3F1aXNpdGlvbkRpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMucmV0dXJuVG9Db2xvckJ5TnVtYmVyQnV0dG9uLmhpZGRlbiA9ICFvcHRpb25zLnNob3dSZXR1cm5Ub0NvbG9yQnlOdW1iZXJcclxuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICAgICAgLy8gdGhpcy5sb2FkRnJvbVVybChcIi9jYm4vYXNzZXRzL2xhcnJ5S29vcGEuanBnXCIpXHJcbiAgICAgICAgLy8gdGhpcy5sb2FkRnJvbVVybChcIi9jYm4vYXNzZXRzL29sdHNfZmxvd2VyLmpwZ1wiKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBoaWRlKCkge1xyXG4gICAgICAgIHRoaXMuaW1hZ2VBY3F1aXNpdGlvbkRpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkRyYWdFbnRlck92ZXIoZXY6IERyYWdFdmVudCkge1xyXG4gICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgZXYucHJldmVudERlZmF1bHQoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25GaWxlQ2hhbmdlKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5maWxlSW5wdXQuZmlsZXM/Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmZpbGVJbnB1dC5maWxlc1swXVxyXG4gICAgICAgIHRoaXMucHJvY2Vzc0ZpbGUoZmlsZSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uRmlsZURyb3AoZXY6IERyYWdFdmVudCkge1xyXG4gICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgZXYucHJldmVudERlZmF1bHQoKVxyXG5cclxuICAgICAgICBpZiAoIWV2Py5kYXRhVHJhbnNmZXI/LmZpbGVzPy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmaWxlID0gZXYuZGF0YVRyYW5zZmVyLmZpbGVzWzBdXHJcbiAgICAgICAgdGhpcy5wcm9jZXNzRmlsZShmaWxlKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgdXNlQ2FtZXJhKCkge1xyXG4gICAgICAgIHRoaXMuYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgY29uc3QgZGlhbG9nV2lkdGggPSB0aGlzLmFjcXVpcmVJbWFnZURpdi5jbGllbnRXaWR0aFxyXG4gICAgICAgIGNvbnN0IGRpYWxvZ0hlaWdodCA9IHRoaXMuYWNxdWlyZUltYWdlRGl2LmNsaWVudEhlaWdodFxyXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcclxuICAgICAgICAgICAgdmlkZW86IHsgd2lkdGg6IHsgbWF4OiBkaWFsb2dXaWR0aCB9LCBoZWlnaHQ6IHsgbWF4OiBkaWFsb2dIZWlnaHQgfSwgZmFjaW5nTW9kZTogXCJ1c2VyXCIgfSxcclxuICAgICAgICAgICAgYXVkaW86IGZhbHNlXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5jYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Vc2VyXHJcbiAgICAgICAgdGhpcy5jYW1lcmEuc3JjT2JqZWN0ID0gc3RyZWFtXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBmbGlwQ2FtZXJhKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5jYW1lcmEuc3JjT2JqZWN0KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc3JjID0gdGhpcy5jYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICAgICAgY29uc3QgdHJhY2tzID0gc3JjLmdldFRyYWNrcygpIFxyXG4gICAgICAgIGZvciAoY29uc3QgdHJhY2sgb2YgdHJhY2tzKSB7XHJcbiAgICAgICAgICAgIHRyYWNrLnN0b3AoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jYW1lcmFNb2RlID0gdGhpcy5jYW1lcmFNb2RlID09IENhbWVyYU1vZGUuVXNlciA/IENhbWVyYU1vZGUuRW52aXJvbm1lbnQgOiBDYW1lcmFNb2RlLlVzZXJcclxuICAgICAgICBjb25zdCBmYWNpbmdNb2RlID0gdGhpcy5jYW1lcmFNb2RlID09IENhbWVyYU1vZGUuVXNlciA/IFwidXNlclwiIDogXCJlbnZpcm9ubWVudFwiXHJcblxyXG4gICAgICAgIC8vIGdldCBjdXJyZW50IGZhY2luZyBtb2RlXHJcbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xyXG4gICAgICAgICAgICB2aWRlbzogeyB3aWR0aDogdGhpcy5jYW1lcmEuY2xpZW50V2lkdGgsIGhlaWdodDogdGhpcy5jYW1lcmEuY2xpZW50SGVpZ2h0LCBmYWNpbmdNb2RlOiBmYWNpbmdNb2RlIH0sXHJcbiAgICAgICAgICAgIGF1ZGlvOiBmYWxzZVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhLnNyY09iamVjdCA9IHN0cmVhbVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25DYW1lcmFMb2FkKCkge1xyXG4gICAgICAgIHRoaXMuYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5jYW1lcmEucGxheSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzdG9wQ2FtZXJhKCkge1xyXG4gICAgICAgIGNvbnN0IHNyYyA9IHRoaXMuY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgICAgIGlmICghc3JjKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdHJhY2tzID0gc3JjLmdldFRyYWNrcygpXHJcbiAgICAgICAgZm9yIChjb25zdCB0cmFjayBvZiB0cmFja3MpIHtcclxuICAgICAgICAgICAgdHJhY2suc3RvcCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLk5vbmVcclxuICAgICAgICB0aGlzLmFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYXB0dXJlSW1hZ2UoKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhckVycm9yTWVzc2FnZXMoKVxyXG5cclxuICAgICAgICBjb25zdCBzcmMgPSB0aGlzLmNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgICAgICBpZiAoIXNyYykge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRyYWNrID0gc3JjLmdldFZpZGVvVHJhY2tzKClbMF1cclxuICAgICAgICBpZiAoIXRyYWNrKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jdHguY2FudmFzLndpZHRoID0gdGhpcy5jYW1lcmEudmlkZW9XaWR0aFxyXG4gICAgICAgIHRoaXMuY3R4LmNhbnZhcy5oZWlnaHQgPSB0aGlzLmNhbWVyYS52aWRlb0hlaWdodFxyXG4gICAgICAgIHRoaXMuY3R4LmRyYXdJbWFnZSh0aGlzLmNhbWVyYSwgMCwgMClcclxuICAgICAgICB0aGlzLmltYWdlQWNxdWlyZWQucHVibGlzaCh0aGlzLmNhbnZhcylcclxuICAgICAgICB0aGlzLnN0b3BDYW1lcmEoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2hvd0xpYnJhcnkoKSB7XHJcbiAgICAgICAgdGhpcy5pbWFnZUFjcXVpc2l0aW9uRGl2LmhpZGRlbiA9IHRydWVcclxuICAgICAgICB0aGlzLmxpYnJhcnlVaS5zaG93KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHByb2Nlc3NGaWxlKGZpbGU6IEZpbGUpIHtcclxuICAgICAgICB0aGlzLmNsZWFyRXJyb3JNZXNzYWdlcygpXHJcbiAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKVxyXG4gICAgICAgIHRoaXMubG9hZEZyb21VcmwodXJsKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgbG9hZEZyb21VcmwodXJsOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLmNsZWFyRXJyb3JNZXNzYWdlcygpXHJcbiAgICAgICAgY29uc3QgaW1nID0gYXdhaXQgZG9tLmxvYWRJbWFnZSh1cmwpXHJcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSBpbWcud2lkdGhcclxuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSBpbWcuaGVpZ2h0XHJcbiAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKGltZywgMCwgMClcclxuICAgICAgICB0aGlzLmltYWdlQWNxdWlyZWQucHVibGlzaCh0aGlzLmNhbnZhcylcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNsZWFyRXJyb3JNZXNzYWdlcygpIHtcclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGhpcy5lcnJvcnNEaXYpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEltYWdlU2l6ZVVpIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VTaXplRGl2ID0gZG9tLmJ5SWQoXCJpbWFnZVNpemVVaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtYXhEaW1JbnB1dCA9IGRvbS5ieUlkKFwibWF4RGltXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbWF4Q29sb3JzSW5wdXQgPSBkb20uYnlJZChcIm1heENvbG9yc1wiKSBhcyBIVE1MSW5wdXRFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNyZWF0ZUNvbG9yQnlOdW1iZXJCdXR0b24gPSBkb20uYnlJZChcImNyZWF0ZUNvbG9yQnlOdW1iZXJcIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmV0dXJuQnV0dG9uID0gZG9tLmJ5SWQoXCJpbWFnZVNpemVSZXR1cm5cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VTY2FsZUNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VTY2FsZUN0eCA9IHRoaXMuaW1hZ2VTY2FsZUNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlU2l6ZUNhbnZhcyA9IGRvbS5ieUlkKFwiaW1hZ2VTaXplQ2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlU2l6ZUN0eCA9IHRoaXMuaW1hZ2VTaXplQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgaW1hZ2VDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgY3JlYXRlQ0JOID0gbmV3IENoYW5uZWw8W0hUTUxDYW52YXNFbGVtZW50XT4oKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IHJldHVybiA9IG5ldyBDaGFubmVsPFtdPigpXHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5jcmVhdGVDb2xvckJ5TnVtYmVyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uQ3JlYXRlQ29sb3JCeU51bWJlcigpKVxyXG4gICAgICAgIHRoaXMucmV0dXJuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uUmV0dXJuQ2xpY2soKSlcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2hvdyhpbWFnZUNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICB0aGlzLmltYWdlU2l6ZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuaW1hZ2VDYW52YXMgPSBpbWFnZUNhbnZhc1xyXG4gICAgICAgIHRoaXMubWF4RGltSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB0aGlzLm9uTWF4RGltQ2hhbmdlKCkpXHJcbiAgICAgICAgdGhpcy5tYXhDb2xvcnNJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHRoaXMub25NYXhDb2xvcnNDaGFuZ2UoKSlcclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5pbWFnZVNpemVEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25DcmVhdGVDb2xvckJ5TnVtYmVyKCkge1xyXG4gICAgICAgIHRoaXMuY3JlYXRlQ0JOLnB1Ymxpc2godGhpcy5pbWFnZVNjYWxlQ2FudmFzKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25SZXR1cm5DbGljaygpIHtcclxuICAgICAgICB0aGlzLnJldHVybi5wdWJsaXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uTWF4RGltQ2hhbmdlKCkge1xyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uTWF4Q29sb3JzQ2hhbmdlKCkge1xyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlZHJhdygpIHtcclxuICAgICAgICB0aGlzLmltYWdlU2l6ZUNhbnZhcy53aWR0aCA9IHRoaXMuaW1hZ2VTaXplQ2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgdGhpcy5pbWFnZVNpemVDYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZVNpemVDYW52YXMuY2xpZW50SGVpZ2h0XHJcblxyXG4gICAgICAgIGNvbnN0IG1heERpbSA9IHRoaXMuZ2V0TWF4RGltKClcclxuICAgICAgICBjb25zdCBtYXhDb2xvcnMgPSB0aGlzLmdldE1heENvbG9ycygpXHJcbiAgICAgICAgY29uc3QgW3csIGhdID0gZml0KHRoaXMuaW1hZ2VDYW52YXMud2lkdGgsIHRoaXMuaW1hZ2VDYW52YXMuaGVpZ2h0LCBtYXhEaW0pXHJcblxyXG4gICAgICAgIHRoaXMuaW1hZ2VTY2FsZUNhbnZhcy53aWR0aCA9IHdcclxuICAgICAgICB0aGlzLmltYWdlU2NhbGVDYW52YXMuaGVpZ2h0ID0gaFxyXG4gICAgICAgIHRoaXMuaW1hZ2VTY2FsZUN0eC5kcmF3SW1hZ2UodGhpcy5pbWFnZUNhbnZhcywgMCwgMCwgdywgaClcclxuICAgICAgICBxdWFudE1lZGlhbkN1dCh0aGlzLmltYWdlU2NhbGVDdHgsIG1heENvbG9ycylcclxuICAgICAgICBjb25zdCBtaW5TY2FsZSA9IE1hdGgubWluKHRoaXMuaW1hZ2VTaXplQ2FudmFzLmNsaWVudFdpZHRoIC8gdywgdGhpcy5pbWFnZVNpemVDYW52YXMuY2xpZW50SGVpZ2h0IC8gaClcclxuICAgICAgICBjb25zdCBzdyA9IHcgKiBtaW5TY2FsZVxyXG4gICAgICAgIGNvbnN0IHNoID0gaCAqIG1pblNjYWxlXHJcbiAgICAgICAgY29uc3QgeCA9ICh0aGlzLmltYWdlU2l6ZUNhbnZhcy53aWR0aCAtIHN3KSAvIDJcclxuICAgICAgICBjb25zdCB5ID0gKHRoaXMuaW1hZ2VTaXplQ2FudmFzLmhlaWdodCAtIHNoKSAvIDJcclxuICAgICAgICB0aGlzLmltYWdlU2l6ZUN0eC5kcmF3SW1hZ2UodGhpcy5pbWFnZVNjYWxlQ2FudmFzLCB4LCB5LCBzdywgc2gpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRNYXhEaW0oKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgbWF4RGltID0gcGFyc2VJbnQodGhpcy5tYXhEaW1JbnB1dC52YWx1ZSlcclxuICAgICAgICBpZiAoIW1heERpbSkge1xyXG4gICAgICAgICAgICBtYXhEaW0gPSBkZWZhdWx0TWF4RGltXHJcbiAgICAgICAgICAgIHRoaXMubWF4RGltSW5wdXQudmFsdWUgPSBtYXhEaW0udG9TdHJpbmcoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1heERpbVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0TWF4Q29sb3JzKCk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IG1heENvbG9ycyA9IHBhcnNlSW50KHRoaXMubWF4Q29sb3JzSW5wdXQudmFsdWUpXHJcbiAgICAgICAgaWYgKCFtYXhDb2xvcnMpIHtcclxuICAgICAgICAgICAgbWF4Q29sb3JzID0gZGVmYXVsdE1heENvbG9yc1xyXG4gICAgICAgICAgICB0aGlzLm1heENvbG9yc0lucHV0LnZhbHVlID0gbWF4Q29sb3JzLnRvU3RyaW5nKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtYXhDb2xvcnNcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgTGlicmFyeVVpIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGlicmFyeURpdiA9IGRvbS5ieUlkKFwibGlicmFyeVVpXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJldHVybkJ1dHRvbiA9IGRvbS5ieUlkKFwicmV0dXJuRnJvbUxpYnJhcnlCdXR0b25cIilcclxuICAgIHB1YmxpYyByZWFkb25seSBpbWFnZUNob3NlbiA9IG5ldyBDaGFubmVsPFtzdHJpbmddPigpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgY2FuY2VsID0gbmV3IENoYW5uZWw8W10+KCk7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5yZXR1cm5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMub25SZXR1cm5DbGljaygpKVxyXG4gICAgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5saWJyYXJ5RGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJldHVybkNsaWNrKCkge1xyXG4gICAgICAgIHRoaXMubGlicmFyeURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgdGhpcy5jYW5jZWwucHVibGlzaCgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFBsYXlVaSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFsZXR0ZURpdiA9IGRvbS5ieUlkKFwicGFsZXR0ZVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWxldHRlRW50cnlUZW1wbGF0ZSA9IGRvbS5ieUlkKFwicGFsZXR0ZUVudHJ5XCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGxheVVpRGl2ID0gZG9tLmJ5SWQoXCJwbGF5VWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmV0dXJuQnV0dG9uID0gZG9tLmJ5SWQoXCJyZXR1cm5CdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlQ3R4ID0gdGhpcy5pbWFnZUNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNlbGxDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNlbGxDdHggPSB0aGlzLmNlbGxDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWxldHRlQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWxldHRlQ3R4ID0gdGhpcy5wYWxldHRlQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29sb3JDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbG9yQ3R4ID0gdGhpcy5jb2xvckNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIGNvbXBsZXRlID0gZmFsc2VcclxuICAgIHB1YmxpYyByZWFkb25seSByZXR1cm4gPSBuZXcgQ2hhbm5lbDxbdm9pZF0+KClcclxuICAgIHByaXZhdGUgaW1hZ2VXaWR0aCA9IDBcclxuICAgIHByaXZhdGUgaW1hZ2VIZWlnaHQgPSAwXHJcbiAgICBwcml2YXRlIGNlbnRlclggPSAwXHJcbiAgICBwcml2YXRlIGNlbnRlclkgPSAwXHJcbiAgICBwcml2YXRlIHpvb20gPSAxXHJcbiAgICBwcml2YXRlIGRyYWcgPSBmYWxzZVxyXG4gICAgcHJpdmF0ZSBjb2xvckRyYWcgPSBmYWxzZVxyXG4gICAgcHJpdmF0ZSB0b3VjaFpvb206IG51bWJlciA9IDBcclxuICAgIHByaXZhdGUgdG91Y2gxU3RhcnQ6IGdlby5WZWMyIHwgbnVsbCA9IG51bGxcclxuICAgIHByaXZhdGUgdG91Y2gyU3RhcnQ6IGdlby5WZWMyIHwgbnVsbCA9IG51bGxcclxuICAgIHByaXZhdGUgdG91Y2gxQ3VyOiBnZW8uVmVjMiB8IG51bGwgPSBudWxsXHJcbiAgICBwcml2YXRlIHRvdWNoMkN1cjogZ2VvLlZlYzIgfCBudWxsID0gbnVsbFxyXG4gICAgcHJpdmF0ZSBkcmFnTGFzdCA9IG5ldyBnZW8uVmVjMigwLCAwKVxyXG5cclxuICAgIC8vIGxpc3Qgb2YgY29sb3JzIHVzZSB1c2VkIGluIGltYWdlXHJcbiAgICBwcml2YXRlIHBhbGV0dGU6IG51bWJlcltdID0gW11cclxuXHJcbiAgICAvLyBpbWFnZSBvdmVybGF5IG9mIHBpeGVsIHRvIHBhbGV0dGUgaW5kZXhcclxuICAgIHByaXZhdGUgcGFsZXR0ZU92ZXJsYXk6IG51bWJlcltdID0gW11cclxuXHJcbiAgICAvLyBwYWxldHRlIG92ZXJsYXkgb2YgcGFsZXR0ZSBpbmRleCB0byBsaXN0IG9mIHBpeGVscyBoYXZpbmcgdGhhdCBjb2xvclxyXG4gICAgcHJpdmF0ZSBwaXhlbE92ZXJsYXk6IFNldDxudW1iZXI+W10gPSBbXVxyXG5cclxuICAgIHByaXZhdGUgc2VsZWN0ZWRQYWxldHRlSW5kZXg6IG51bWJlciA9IC0xXHJcbiAgICBwcml2YXRlIHNlcXVlbmNlOiBudW1iZXJbXSA9IFtdXHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmN0eCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW52YXMgZWxlbWVudCBub3Qgc3VwcG9ydGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmRvd25cIiwgZSA9PiB0aGlzLm9uUG9pbnRlckRvd24oZSkpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJtb3ZlXCIsIGUgPT4gdGhpcy5vblBvaW50ZXJNb3ZlKGUpKVxyXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVydXBcIiwgZSA9PiB0aGlzLm9uUG9pbnRlclVwKGUpKVxyXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCBlID0+IHRoaXMub25XaGVlbChlKSlcclxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBlID0+IHRoaXMub25SZXNpemUoZSkpXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKHRoaXMucGxheVVpRGl2LCBcImNsaWNrXCIsIFwiLnBhbGV0dGUtZW50cnlcIiwgKGUpID0+IHRoaXMub25QYWxldHRlRW50cnlDbGljayhlIGFzIE1vdXNlRXZlbnQpKVxyXG4gICAgICAgIHRoaXMucmV0dXJuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uUmV0dXJuKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGNyZWF0ZShpbWc6IEhUTUxDYW52YXNFbGVtZW50LCBzZXF1ZW5jZTogbnVtYmVyW10pIHtcclxuICAgICAgICB0aGlzLnBsYXlVaURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5jYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHRcclxuXHJcbiAgICAgICAgdGhpcy5jb21wbGV0ZSA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy56b29tID0gMVxyXG4gICAgICAgIHRoaXMuZHJhZyA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy50b3VjaFpvb20gPSAwXHJcbiAgICAgICAgdGhpcy5pbWFnZVdpZHRoID0gaW1nLndpZHRoXHJcbiAgICAgICAgdGhpcy5pbWFnZUhlaWdodCA9IGltZy5oZWlnaHRcclxuXHJcbiAgICAgICAgLy8gY2FwdHVyZSBpbWFnZVxyXG4gICAgICAgIHRoaXMuaW1hZ2VDYW52YXMud2lkdGggPSB0aGlzLmltYWdlV2lkdGhcclxuICAgICAgICB0aGlzLmltYWdlQ2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2VIZWlnaHRcclxuICAgICAgICB0aGlzLmltYWdlQ3R4LmRyYXdJbWFnZShpbWcsIDAsIDAsIHRoaXMuaW1hZ2VDYW52YXMud2lkdGgsIHRoaXMuaW1hZ2VDYW52YXMuaGVpZ2h0KVxyXG5cclxuICAgICAgICAvLyBkZWJ1ZyAtIHNob3cgcGFzc2VkIGltYWdlXHJcbiAgICAgICAgLy8gdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLmltYWdlV2lkdGhcclxuICAgICAgICAvLyB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlSGVpZ2h0XHJcbiAgICAgICAgLy8gdGhpcy5jdHguZHJhd0ltYWdlKHRoaXMuaW1hZ2VDYW52YXMsIDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpXHJcbiAgICAgICAgLy8gcmV0dXJuXHJcblxyXG4gICAgICAgIGNvbnN0IGltZ0RhdGEgPSB0aGlzLmltYWdlQ3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlID0gZXh0cmFjdFBhbGV0dGUoaW1nRGF0YSlcclxuICAgICAgICB0aGlzLnBhbGV0dGVPdmVybGF5ID0gY3JlYXRlUGFsZXR0ZU92ZXJsYXkoaW1nRGF0YSwgdGhpcy5wYWxldHRlKVxyXG4gICAgICAgIHRoaXMucGl4ZWxPdmVybGF5ID0gY3JlYXRlUGl4ZWxPdmVybGF5KHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCwgdGhpcy5wYWxldHRlLCB0aGlzLnBhbGV0dGVPdmVybGF5KVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZSA9IHBydW5lUGFsbGV0ZSh0aGlzLnBhbGV0dGUsIHRoaXMucGl4ZWxPdmVybGF5LCBtYXhCYWNrZ3JvdW5kUGl4ZWxzLCB0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQsIHRoaXMuY29sb3JDdHgpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlT3ZlcmxheSA9IGNyZWF0ZVBhbGV0dGVPdmVybGF5KGltZ0RhdGEsIHRoaXMucGFsZXR0ZSlcclxuICAgICAgICB0aGlzLnBpeGVsT3ZlcmxheSA9IGNyZWF0ZVBpeGVsT3ZlcmxheSh0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQsIHRoaXMucGFsZXR0ZSwgdGhpcy5wYWxldHRlT3ZlcmxheSlcclxuICAgICAgICB0aGlzLmNyZWF0ZVBhbGV0dGVVaSgpXHJcbiAgICAgICAgZHJhd0NlbGxJbWFnZSh0aGlzLmNlbGxDdHgsIHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCwgdGhpcy5wYWxldHRlT3ZlcmxheSlcclxuICAgICAgICB0aGlzLnBhbGV0dGVDYW52YXMud2lkdGggPSB0aGlzLmNlbGxDYW52YXMud2lkdGhcclxuICAgICAgICB0aGlzLnBhbGV0dGVDYW52YXMuaGVpZ2h0ID0gdGhpcy5jZWxsQ2FudmFzLmhlaWdodFxyXG4gICAgICAgIHRoaXMuY2VudGVyWCA9IHRoaXMuY2FudmFzLndpZHRoIC8gMlxyXG4gICAgICAgIHRoaXMuY2VudGVyWSA9IHRoaXMuY2FudmFzLmhlaWdodCAvIDJcclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcblxyXG4gICAgICAgIGlmICh0aGlzLnBhbGV0dGUpIHtcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RQYWxldHRlRW50cnkoMClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2VxdWVuY2UgPSBzZXF1ZW5jZVxyXG4gICAgICAgIGZvciAoY29uc3QgeHkgb2Ygc2VxdWVuY2UpIHtcclxuICAgICAgICAgICAgY29uc3QgcGFsZXR0ZUlkeCA9IHRoaXMucGFsZXR0ZU92ZXJsYXlbeHldXHJcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IHVuZmxhdCh4eSwgdGhpcy5pbWFnZVdpZHRoKVxyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeShwYWxldHRlSWR4KVxyXG4gICAgICAgICAgICB0aGlzLnRyeUZpbGxDZWxsKHgsIHkpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNhdmVTdGF0ZSgpXHJcblxyXG4gICAgICAgIC8vIGRlYnVnIC0gZmlsbCBhbGwgcGl4ZWxzIGJ1dCBmaXJzdCB1bmZpbGxlZFxyXG4gICAgICAgIC8vIHtcclxuICAgICAgICAvLyAgICAgbGV0IHNraXBwZWQxID0gZmFsc2VcclxuICAgICAgICAvLyAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmltYWdlSGVpZ2h0OyArK3kpIHtcclxuICAgICAgICAvLyAgICAgICAgIGxldCB5T2Zmc2V0ID0geSAqIHRoaXMuaW1hZ2VXaWR0aFxyXG4gICAgICAgIC8vICAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLmltYWdlV2lkdGg7ICsreCkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGNvbnN0IHBhbGV0dGVJZHggPSB0aGlzLnBhbGV0dGVPdmVybGF5W2ZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKV1cclxuICAgICAgICAvLyAgICAgICAgICAgICBpZiAocGFsZXR0ZUlkeCA9PT0gLTEpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAvLyAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vICAgICAgICAgICAgIGxldCB4T2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAvLyAgICAgICAgICAgICBpZiAoIXNraXBwZWQxICYmIHRoaXMucGFsZXR0ZU92ZXJsYXlbeE9mZnNldF0gIT09IC0xKSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIHNraXBwZWQxID0gdHJ1ZVxyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIC8vICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgdGhpcy5zZWxlY3RQYWxldHRlRW50cnkocGFsZXR0ZUlkeClcclxuICAgICAgICAvLyAgICAgICAgICAgICB0aGlzLnRyeUZpbGxDZWxsKHgsIHkpXHJcblxyXG4gICAgICAgIC8vICAgICAgICAgfVxyXG4gICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAvLyAvLyBkZWJ1ZyAtIGdvIHN0cmFpZ2h0IHRvIGVuZCBzdGF0ZVxyXG4gICAgICAgIC8vIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5pbWFnZUhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgLy8gICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5pbWFnZVdpZHRoOyArK3gpIHtcclxuICAgICAgICAvLyAgICAgICAgIHRoaXMuc2VxdWVuY2UucHVzaChmbGF0KHgsIHksIHRoaXMuaW1hZ2VXaWR0aCkpXHJcbiAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgIC8vIHJhbmQuc2h1ZmZsZSh0aGlzLnNlcXVlbmNlKVxyXG4gICAgICAgIC8vIHRoaXMuZXhlY0RvbmVTZXF1ZW5jZSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIHJlc3RvcmUoc3RhdGU6IENCTlN0YXRlKSB7XHJcbiAgICAgICAgY29uc3QgaW1hZ2UgPSBhd2FpdCBkb20ubG9hZEltYWdlKHN0YXRlLmltYWdlKVxyXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgICAgICBjYW52YXMud2lkdGggPSBpbWFnZS53aWR0aFxyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBpbWFnZS5oZWlnaHRcclxuXHJcbiAgICAgICAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgICAgICBjdHguZHJhd0ltYWdlKGltYWdlLCAwLCAwKVxyXG4gICAgICAgIHRoaXMuY3JlYXRlKGNhbnZhcywgc3RhdGUuc2VxdWVuY2UpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5wbGF5VWlEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgaGlkZSgpIHtcclxuICAgICAgICB0aGlzLnBsYXlVaURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJldHVybigpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnJldHVybi5wdWJsaXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmVzaXplKF86IFVJRXZlbnQpIHtcclxuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY3JlYXRlUGFsZXR0ZVVpKCkge1xyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0aGlzLnBhbGV0dGVEaXYpXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnBhbGV0dGUubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgW3IsIGcsIGJdID0gdW5wYWNrQ29sb3IodGhpcy5wYWxldHRlW2ldKVxyXG4gICAgICAgICAgICBjb25zdCBsdW0gPSBjYWxjTHVtaW5hbmNlKHIsIGcsIGIpXHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy5wYWxldHRlRW50cnlUZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IGVudHJ5RGl2ID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLnBhbGV0dGUtZW50cnlcIikgYXMgSFRNTEVsZW1lbnRcclxuICAgICAgICAgICAgZW50cnlEaXYudGV4dENvbnRlbnQgPSBgJHtpICsgMX1gXHJcbiAgICAgICAgICAgIGVudHJ5RGl2LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGNvbG9yMlJHQkFTdHlsZShyLCBnLCBiKVxyXG4gICAgICAgICAgICBlbnRyeURpdi5zdHlsZS5jb2xvciA9IGx1bSA8IC41ID8gXCJ3aGl0ZVwiIDogXCJibGFja1wiXHJcbiAgICAgICAgICAgIHRoaXMucGFsZXR0ZURpdi5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblBvaW50ZXJEb3duKGU6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFlLmlzUHJpbWFyeSkge1xyXG4gICAgICAgICAgICB0aGlzLnRvdWNoMlN0YXJ0ID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgICAgICB0aGlzLnRvdWNoWm9vbSA9IHRoaXMuem9vbVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFyZSB3ZSBvdmVydG9wIG9mIGEgc2VsZWN0ZWQgcGFsZXR0ZSBlbnRyeSBwaXhlbD9cclxuICAgICAgICB0aGlzLmNhbnZhcy5zZXRQb2ludGVyQ2FwdHVyZShlLnBvaW50ZXJJZClcclxuICAgICAgICB0aGlzLmRyYWcgPSB0cnVlXHJcbiAgICAgICAgdGhpcy5kcmFnTGFzdCA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICB0aGlzLnRvdWNoMVN0YXJ0ID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIHRoaXMudG91Y2hab29tID0gdGhpcy56b29tXHJcblxyXG4gICAgICAgIC8vIHRyYW5zZm9ybSBjbGljayBjb29yZGluYXRlcyB0byBjYW52YXMgY29vcmRpbmF0ZXNcclxuICAgICAgICBjb25zdCBbeCwgeV0gPSB0aGlzLmNhbnZhczJDZWxsKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIGlmICh0aGlzLnRyeUZpbGxDZWxsKHgsIHkpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sb3JEcmFnID0gdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNvbnZlcnQgYSBjYW52YXMgY29vcmRpbmF0ZSBpbnRvIGEgY2VsbCBjb29yZGluYXRlXHJcbiAgICAgKiBAcGFyYW0geCB4IGNhbnZhcyBjb29yZGluYXRlXHJcbiAgICAgKiBAcGFyYW0geSB5IGNhbnZhcyBjb29yZGluYXRlXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY2FudmFzMkNlbGwoeDogbnVtYmVyLCB5OiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgICAgICBjb25zdCBpbnZUcmFuc2Zvcm0gPSB0aGlzLmN0eC5nZXRUcmFuc2Zvcm0oKS5pbnZlcnNlKClcclxuICAgICAgICBjb25zdCBkb21QdCA9IGludlRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh7IHg6IHgsIHk6IHkgfSlcclxuICAgICAgICByZXR1cm4gY2VsbDJJbWFnZShkb21QdC54LCBkb21QdC55KVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Qb2ludGVyVXAoZTogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCFlLmlzUHJpbWFyeSkge1xyXG4gICAgICAgICAgICB0aGlzLnRvdWNoMlN0YXJ0ID0gbnVsbFxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy50b3VjaDFTdGFydCA9IG51bGxcclxuICAgICAgICB0aGlzLmRyYWcgPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuY29sb3JEcmFnID0gZmFsc2VcclxuICAgICAgICB0aGlzLnRvdWNoWm9vbSA9IHRoaXMuem9vbVxyXG4gICAgICAgIHRoaXMuc2F2ZVN0YXRlKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNhdmVTdGF0ZSgpIHtcclxuICAgICAgICBzYXZlQ0JOU3RhdGUoeyBpbWFnZTogdGhpcy5pbWFnZUNhbnZhcy50b0RhdGFVUkwoKSwgc2VxdWVuY2U6IHRoaXMuc2VxdWVuY2UgfSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUG9pbnRlck1vdmUoZTogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZS5pc1ByaW1hcnkpIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDFDdXIgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDJDdXIgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoYW5kbGUgcGluY2ggem9vbVxyXG4gICAgICAgIGlmICh0aGlzLnRvdWNoMlN0YXJ0ICYmIHRoaXMudG91Y2gxU3RhcnQpIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDFDdXIgPSB0aGlzLnRvdWNoMUN1ciA/PyB0aGlzLnRvdWNoMVN0YXJ0XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gyQ3VyID0gdGhpcy50b3VjaDJDdXIgPz8gdGhpcy50b3VjaDJTdGFydFxyXG4gICAgICAgICAgICBjb25zdCBkMCA9IHRoaXMudG91Y2gxU3RhcnQuc3ViKHRoaXMudG91Y2gyU3RhcnQpLmxlbmd0aCgpXHJcbiAgICAgICAgICAgIGNvbnN0IGQxID0gdGhpcy50b3VjaDFDdXIuc3ViKHRoaXMudG91Y2gyQ3VyKS5sZW5ndGgoKVxyXG4gICAgICAgICAgICB0aGlzLnpvb20gPSB0aGlzLnRvdWNoWm9vbSAqIGQxIC8gZDBcclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5kcmFnKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdHJhbnNmb3JtID0gdGhpcy5jdHguZ2V0VHJhbnNmb3JtKCkuaW52ZXJzZSgpXHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBnZW8uVmVjMi5mcm9tRE9NKHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh0aGlzLmRyYWdMYXN0KSlcclxuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICBjb25zdCBlbmQgPSBnZW8uVmVjMi5mcm9tRE9NKHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChwb3NpdGlvbikpXHJcbiAgICAgICAgY29uc3QgZGVsdGEgPSBlbmQuc3ViKHN0YXJ0KVxyXG5cclxuICAgICAgICAvLyBjaGVjayBmb3IgZHJhZyBvdmVyIHBhbGV0dGUgY29sb3JcclxuICAgICAgICBjb25zdCBbeCwgeV0gPSB0aGlzLmNhbnZhczJDZWxsKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIGlmICh0aGlzLmNvbG9yRHJhZyAmJiB0aGlzLnBhbGV0dGVPdmVybGF5W2ZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKV0gPT09IHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudHJ5RmlsbENlbGwoeCwgeSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoTWF0aC5hYnMoZGVsdGEueCkgPiAzIHx8IE1hdGguYWJzKGRlbHRhLnkpID4gMykge1xyXG4gICAgICAgICAgICB0aGlzLmNlbnRlclggLT0gZGVsdGEueFxyXG4gICAgICAgICAgICB0aGlzLmNlbnRlclkgLT0gZGVsdGEueVxyXG4gICAgICAgICAgICB0aGlzLmRyYWdMYXN0ID0gcG9zaXRpb25cclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uV2hlZWwoZTogV2hlZWxFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUuZGVsdGFZID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnpvb20gKj0gLjVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlLmRlbHRhWSA8IDApIHtcclxuICAgICAgICAgICAgdGhpcy56b29tICo9IDJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUGFsZXR0ZUVudHJ5Q2xpY2soZTogTW91c2VFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBlLnRhcmdldCBhcyBFbGVtZW50XHJcbiAgICAgICAgbGV0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgoZW50cnkpXHJcblxyXG4gICAgICAgIGlmIChpZHggPT09IHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXgpIHtcclxuICAgICAgICAgICAgaWR4ID0gLTFcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2VsZWN0UGFsZXR0ZUVudHJ5KGlkeClcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHRydWUgaWYgc3BlY2lmaWVkIGNlbGwgaXMgdW5maWxsZWQsIGFuZCBoYXMgc3BlY2lmaWVkIHBhbGV0dGUgaW5kZXhcclxuICAgICAqIEBwYXJhbSB4IHggY2VsbCBjb29yZGluYXRlXHJcbiAgICAgKiBAcGFyYW0geSB5IGNlbGwgY29vcmRpbmF0ZVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNoZWNrQ2VsbCh4OiBudW1iZXIsIHk6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgIC8vIGlmIGFscmVhZHkgZmlsbGVkLCBkbyBub3RoaW5nXHJcbiAgICAgICAgY29uc3QgZmxhdFhZID0gZmxhdCh4LCB5LCB0aGlzLmltYWdlV2lkdGgpXHJcbiAgICAgICAgY29uc3QgcGl4ZWxzID0gdGhpcy5waXhlbE92ZXJsYXlbdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleF1cclxuICAgICAgICByZXR1cm4gcGl4ZWxzLmhhcyhmbGF0WFkpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBhdHRlbXB0IHRvIGZpbGwgdGhlIHNwZWNpZmllZCBjZWxsXHJcbiAgICAgKiByZXR1cm5zIHRydWUgaWYgZmlsbGVkLCBmYWxzZSBpZiBjZWxsIGlzIG5vdCBzZWxlY3RlZCBwYWxldHRlIG9yIGFscmVhZHkgZmlsbGVkXHJcbiAgICAgKiBAcGFyYW0geCBcclxuICAgICAqIEBwYXJhbSB5IFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHRyeUZpbGxDZWxsKHg6IG51bWJlciwgeTogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgLy8gaWYgYWxyZWFkeSBmaWxsZWQsIGRvIG5vdGhpbmdcclxuICAgICAgICBpZiAoIXRoaXMuY2hlY2tDZWxsKHgsIHkpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgW3IsIGcsIGJdID0gdW5wYWNrQ29sb3IodGhpcy5wYWxldHRlW3RoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXhdKVxyXG4gICAgICAgIGNvbnN0IFtjeCwgY3ldID0gaW1hZ2UyQ2VsbCh4LCB5KVxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguZmlsbFN0eWxlID0gY29sb3IyUkdCQVN0eWxlKHIsIGcsIGIpXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5maWxsUmVjdChjeCwgY3ksIGNlbGxTaXplLCBjZWxsU2l6ZSlcclxuXHJcbiAgICAgICAgLy8gcmVtb3ZlIHRoZSBwaXhlbCBmcm9tIG92ZXJsYXlcclxuICAgICAgICBjb25zdCBwaXhlbHMgPSB0aGlzLnBpeGVsT3ZlcmxheVt0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4XVxyXG4gICAgICAgIGNvbnN0IGZsYXRYWSA9IGZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKVxyXG4gICAgICAgIHBpeGVscy5kZWxldGUoZmxhdFhZKVxyXG4gICAgICAgIHRoaXMuc2VxdWVuY2UucHVzaChmbGF0WFkpXHJcblxyXG4gICAgICAgIGlmIChwaXhlbHMuc2l6ZSA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbWFyayBwYWxldHRlIGVudHJ5IGFzIGRvbmVcclxuICAgICAgICBjb25zdCBlbnRyeSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIucGFsZXR0ZS1lbnRyeVwiKVt0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4XVxyXG4gICAgICAgIGVudHJ5LmlubmVySFRNTCA9IFwiJmNoZWNrO1wiXHJcbiAgICAgICAgY29uc3QgbmV4dFBhbGV0dGVJZHggPSB0aGlzLmZpbmROZXh0VW5maW5pc2hlZEVudHJ5KHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXgpXHJcbiAgICAgICAgdGhpcy5zZWxlY3RQYWxldHRlRW50cnkobmV4dFBhbGV0dGVJZHgpXHJcblxyXG4gICAgICAgIGlmIChuZXh0UGFsZXR0ZUlkeCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFsbCBjb2xvcnMgY29tcGxldGUhIHNob3cgYW5pbWF0aW9uIG9mIHVzZXIgY29sb3Jpbmcgb3JpZ2luYWwgaW1hZ2VcclxuICAgICAgICB0aGlzLmV4ZWNEb25lU2VxdWVuY2UoKVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzZWxlY3RQYWxldHRlRW50cnkoaWR4OiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4ID0gaWR4XHJcblxyXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIucGFsZXR0ZS1lbnRyeVwiKSlcclxuICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICAgICAgZW50cnkuY2xhc3NMaXN0LnJlbW92ZShcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaWR4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICBlbnRyaWVzW2lkeF0uY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjbGVhciBwYWxldHRlIGNhbnZhc1xyXG4gICAgICAgIGNvbnN0IGN0eCA9IHRoaXMucGFsZXR0ZUN0eFxyXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IHRoaXMucGFsZXR0ZUNhbnZhc1xyXG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KVxyXG5cclxuICAgICAgICBpZiAoaWR4ID09PSAtMSkge1xyXG4gICAgICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGlnaGxpZ2h0IHJlbWFpbmluZyBwaXhlbHMgZm9yIHRoaXMgY29sb3JcclxuICAgICAgICBjb25zdCBmb250ID0gY3R4LmZvbnRcclxuICAgICAgICBjdHguZm9udCA9IFwiYm9sZCAxNnB4IGFyaWFsXCJcclxuICAgICAgICBjb25zdCB0ZXh0SGVpZ2h0ID0gY3R4Lm1lYXN1cmVUZXh0KFwiTVwiKS53aWR0aFxyXG4gICAgICAgIGNvbnN0IGNkeHkgPSBjZWxsU2l6ZSAvIDJcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBwaXhlbCBvZiB0aGlzLnBpeGVsT3ZlcmxheVtpZHhdKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IGltYWdlMkNlbGwoLi4udW5mbGF0KHBpeGVsLCB0aGlzLmltYWdlV2lkdGgpKVxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gY29sb3IyUkdCQVN0eWxlKDE5MSwgMTkxLCAxOTEsIDI1NSlcclxuICAgICAgICAgICAgY3R4LmZpbGxSZWN0KHgsIHksIGNlbGxTaXplLCBjZWxsU2l6ZSlcclxuXHJcbiAgICAgICAgICAgIC8vIGRyYXcgbGFiZWxcclxuICAgICAgICAgICAgY29uc3QgbGFiZWwgPSBgJHtpZHggKyAxfWBcclxuICAgICAgICAgICAgY29uc3QgbWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dChsYWJlbClcclxuICAgICAgICAgICAgY29uc3QgY3ggPSB4ICsgY2R4eSAtIG1ldHJpY3Mud2lkdGggLyAyXHJcbiAgICAgICAgICAgIGNvbnN0IGN5ID0geSArIGNkeHkgKyB0ZXh0SGVpZ2h0IC8gMlxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiXHJcbiAgICAgICAgICAgIGN0eC5maWxsVGV4dChsYWJlbCwgY3gsIGN5KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY3R4LmZvbnQgPSBmb250XHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVkcmF3KCkge1xyXG4gICAgICAgIC8vIG5vdGUgLSBjbGVhciBpcyBzdWJqZWN0IHRvIHRyYW5zZm9ybVxyXG4gICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuY3R4XHJcbiAgICAgICAgdGhpcy5jdHgucmVzZXRUcmFuc2Zvcm0oKVxyXG4gICAgICAgIGNvbnN0IGh3ID0gdGhpcy5jYW52YXMud2lkdGggLyAyIC8gdGhpcy56b29tXHJcbiAgICAgICAgY29uc3QgaGggPSB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyIC8gdGhpcy56b29tXHJcblxyXG4gICAgICAgIHRoaXMuY2VudGVyWCA9IG1hdGguY2xhbXAodGhpcy5jZW50ZXJYLCAwLCB0aGlzLmNlbGxDYW52YXMud2lkdGgpXHJcbiAgICAgICAgdGhpcy5jZW50ZXJZID0gbWF0aC5jbGFtcCh0aGlzLmNlbnRlclksIDAsIHRoaXMuY2VsbENhbnZhcy5oZWlnaHQpXHJcbiAgICAgICAgdGhpcy5jdHguc2NhbGUodGhpcy56b29tLCB0aGlzLnpvb20pXHJcbiAgICAgICAgdGhpcy5jdHgudHJhbnNsYXRlKC10aGlzLmNlbnRlclggKyBodywgLXRoaXMuY2VudGVyWSArIGhoKVxyXG5cclxuICAgICAgICB2YXIgaW52VHJhbnNmb3JtID0gY3R4LmdldFRyYW5zZm9ybSgpLmludmVyc2UoKVxyXG4gICAgICAgIGNvbnN0IHRsID0gaW52VHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHsgeDogMCwgeTogMCB9KVxyXG4gICAgICAgIGNvbnN0IGJyID0gaW52VHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHsgeDogdGhpcy5jYW52YXMud2lkdGgsIHk6IHRoaXMuY2FudmFzLmhlaWdodCB9KVxyXG4gICAgICAgIGN0eC5jbGVhclJlY3QodGwueCwgdGwueSwgYnIueCAtIHRsLngsIGJyLnkgLSB0bC55KVxyXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5jZWxsQ2FudmFzLCAwLCAwKVxyXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5wYWxldHRlQ2FudmFzLCAwLCAwKVxyXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5jb2xvckNhbnZhcywgMCwgMClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZpbmROZXh0VW5maW5pc2hlZEVudHJ5KGk6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHRoaXMucGFsZXR0ZS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBpaSA9IGkgJSB0aGlzLnBhbGV0dGUubGVuZ3RoXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBpeGVsT3ZlcmxheVtpXS5zaXplID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGlpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAtMVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZXhlY0RvbmVTZXF1ZW5jZSgpIHtcclxuICAgICAgICAvLyBzZXQgYXMgZG9uZVxyXG4gICAgICAgIHRoaXMuY29tcGxldGUgPSB0cnVlXHJcblxyXG4gICAgICAgIHRoaXMuY3R4LnJlc2V0VHJhbnNmb3JtKClcclxuXHJcbiAgICAgICAgLy8gZHJhdyBvbmUgcGl4ZWwgYXQgYSB0aW1lIHRvIGNvbG9yIGNhbnZhc1xyXG4gICAgICAgIC8vIG92cmxheSBvbnRvIGNhbnZhc1xyXG4gICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLmltYWdlQ3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQpLmRhdGFcclxuICAgICAgICB0aGlzLmN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodClcclxuICAgICAgICBjb25zdCB6b29tID0gTWF0aC5taW4odGhpcy5jYW52YXMuY2xpZW50V2lkdGggLyB0aGlzLmltYWdlV2lkdGgsIHRoaXMuY2FudmFzLmNsaWVudEhlaWdodCAvIHRoaXMuaW1hZ2VIZWlnaHQpXHJcbiAgICAgICAgdGhpcy5jdHguc2NhbGUoem9vbSwgem9vbSlcclxuXHJcbiAgICAgICAgLy8gY29sb3IgYXMgdXNlciBkaWRcclxuICAgICAgICBjb25zdCBwaXhlbCA9IG5ldyBJbWFnZURhdGEoMSwgMSlcclxuICAgICAgICBjb25zdCBwaXhlbERhdGEgPSBwaXhlbC5kYXRhXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5jYW52YXMud2lkdGggPSB0aGlzLmltYWdlV2lkdGhcclxuICAgICAgICB0aGlzLmNvbG9yQ3R4LmNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlSGVpZ2h0XHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jb2xvckNhbnZhcy53aWR0aCwgdGhpcy5jb2xvckNhbnZhcy5oZWlnaHQpXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zZXF1ZW5jZS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCB4eSA9IHRoaXMuc2VxdWVuY2VbaV1cclxuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gdW5mbGF0KHh5LCB0aGlzLmltYWdlV2lkdGgpXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHh5ICogNFxyXG4gICAgICAgICAgICBwaXhlbERhdGFbMF0gPSBkYXRhW29mZnNldF1cclxuICAgICAgICAgICAgcGl4ZWxEYXRhWzFdID0gZGF0YVtvZmZzZXQgKyAxXVxyXG4gICAgICAgICAgICBwaXhlbERhdGFbMl0gPSBkYXRhW29mZnNldCArIDJdXHJcbiAgICAgICAgICAgIHBpeGVsRGF0YVszXSA9IDI1NVxyXG5cclxuICAgICAgICAgICAgdGhpcy5jb2xvckN0eC5wdXRJbWFnZURhdGEocGl4ZWwsIHgsIHkpXHJcbiAgICAgICAgICAgIHRoaXMuY3R4LmRyYXdJbWFnZSh0aGlzLmNvbG9yQ2FudmFzLCAwLCAwKVxyXG4gICAgICAgICAgICBpZiAoaSAlIDY0ID09IDApIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHV0aWwud2FpdCgwKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBDQk4ge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBhY3F1aXJlVWkgPSBuZXcgSW1hZ2VBY3F1aXNpdGlvblVpKClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2l6ZVVpID0gbmV3IEltYWdlU2l6ZVVpKClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGxheVVpID0gbmV3IFBsYXlVaSgpXHJcbiAgICBwcml2YXRlIGNibkNyZWF0ZWQgPSBmYWxzZVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuYWNxdWlyZVVpLmltYWdlQWNxdWlyZWQuc3ViY3JpYmUoaW1nID0+IHRoaXMub25JbWFnZUFjcXVpcmVkKGltZykpXHJcbiAgICAgICAgdGhpcy5hY3F1aXJlVWkucmV0dXJuVG9Db2xvckJ5TnVtYmVyLnN1YmNyaWJlKCgpID0+IHRoaXMub25SZXR1cm5Ub0NCTigpKVxyXG4gICAgICAgIHRoaXMuc2l6ZVVpLmNyZWF0ZUNCTi5zdWJjcmliZSgoaW1nOiBIVE1MQ2FudmFzRWxlbWVudCkgPT4gdGhpcy5vbkNyZWF0ZUNCTihpbWcpKVxyXG4gICAgICAgIHRoaXMuc2l6ZVVpLnJldHVybi5zdWJjcmliZSgoKSA9PiB0aGlzLm9uUmV0dXJuVG9BY3F1aXJlKCkpXHJcbiAgICAgICAgdGhpcy5wbGF5VWkucmV0dXJuLnN1YmNyaWJlKCgpID0+IHRoaXMub25SZXR1cm5Ub0FjcXVpcmUoKSlcclxuXHJcbiAgICAgICAgLy8gdHJ5IHRvIHJlc3RvcmUgc3RhdGVcclxuICAgICAgICBjb25zdCBzdGF0ZSA9IGxvYWRDQk5TdGF0ZSgpXHJcbiAgICAgICAgaWYgKHN0YXRlLmltYWdlKSB7XHJcbiAgICAgICAgICAgIHNob3dMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgICAgICAgICAgdGhpcy5jYm5DcmVhdGVkID0gdHJ1ZVxyXG4gICAgICAgICAgICB0aGlzLmFjcXVpcmVVaS5oaWRlKClcclxuICAgICAgICAgICAgdGhpcy5wbGF5VWkucmVzdG9yZShzdGF0ZSlcclxuICAgICAgICAgICAgaGlkZUxvYWRpbmdJbmRpY2F0b3IoKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuYWNxdWlyZVVpLnNob3coeyBzaG93UmV0dXJuVG9Db2xvckJ5TnVtYmVyOiBmYWxzZSB9KVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25JbWFnZUFjcXVpcmVkKGltZzogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICBzaG93TG9hZGluZ0luZGljYXRvcigpXHJcbiAgICAgICAgdGhpcy5hY3F1aXJlVWkuaGlkZSgpXHJcbiAgICAgICAgdGhpcy5zaXplVWkuc2hvdyhpbWcpXHJcbiAgICAgICAgaGlkZUxvYWRpbmdJbmRpY2F0b3IoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25DcmVhdGVDQk4oaW1nOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHNob3dMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgICAgICB0aGlzLnNpemVVaS5oaWRlKClcclxuICAgICAgICB0aGlzLnBsYXlVaS5jcmVhdGUoaW1nLCBbXSlcclxuICAgICAgICB0aGlzLmNibkNyZWF0ZWQgPSB0cnVlXHJcbiAgICAgICAgaGlkZUxvYWRpbmdJbmRpY2F0b3IoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25SZXR1cm5Ub0FjcXVpcmUoKSB7XHJcbiAgICAgICAgdGhpcy5wbGF5VWkuaGlkZSgpXHJcbiAgICAgICAgdGhpcy5zaXplVWkuaGlkZSgpXHJcbiAgICAgICAgdGhpcy5hY3F1aXJlVWkuc2hvdyh7IHNob3dSZXR1cm5Ub0NvbG9yQnlOdW1iZXI6IHRoaXMuY2JuQ3JlYXRlZCB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmV0dXJuVG9DQk4oKSB7XHJcbiAgICAgICAgdGhpcy5hY3F1aXJlVWkuaGlkZSgpXHJcbiAgICAgICAgdGhpcy5zaXplVWkuaGlkZSgpXHJcbiAgICAgICAgdGhpcy5wbGF5VWkuc2hvdygpXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RQYWxldHRlKGltZ0RhdGE6IEltYWdlRGF0YSk6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgZGF0YSB9ID0gaW1nRGF0YVxyXG4gICAgY29uc3Qgcm93UGl0Y2ggPSB3aWR0aCAqIDRcclxuXHJcbiAgICAvLyBmaW5kIHVuaXF1ZSBjb2xvcnMsIGNyZWF0ZSBlbnRyeSBmb3IgZWFjaFxyXG4gICAgY29uc3QgcGFsZXR0ZSA9IG5ldyBTZXQ8bnVtYmVyPigpXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiByb3dQaXRjaFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICAvLyBwYWNrIGNvbG9yIHRvIGEgdW5pcXVlIHZhbHVlXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4ICogNFxyXG4gICAgICAgICAgICBjb25zdCByID0gZGF0YVtvZmZzZXRdXHJcbiAgICAgICAgICAgIGNvbnN0IGcgPSBkYXRhW29mZnNldCArIDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGIgPSBkYXRhW29mZnNldCArIDJdXHJcbiAgICAgICAgICAgIGNvbnN0IGEgPSBkYXRhW29mZnNldCArIDNdXHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcGFja0NvbG9yKHIsIGcsIGIsIGEpXHJcbiAgICAgICAgICAgIHBhbGV0dGUuYWRkKHZhbHVlKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gWy4uLnBhbGV0dGVdXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjcmVhdGUgYW4gb3ZlcmxheSB0aGF0IG1hcHMgZWFjaCBwaXhlbCB0byB0aGUgaW5kZXggb2YgaXRzIHBhbGV0dGUgZW50cnlcclxuICogQHBhcmFtIGltZ0RhdGEgaW1hZ2UgZGF0YVxyXG4gKiBAcGFyYW0gcGFsZXR0ZSBwYWxldHRlIGNvbG9yc1xyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlUGFsZXR0ZU92ZXJsYXkoaW1nRGF0YTogSW1hZ2VEYXRhLCBwYWxldHRlOiBudW1iZXJbXSk6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgZGF0YSB9ID0gaW1nRGF0YVxyXG4gICAgY29uc3QgcGFsZXR0ZU1hcCA9IGFycmF5Lm1hcEluZGljZXMocGFsZXR0ZSlcclxuICAgIGNvbnN0IHJvd1BpdGNoID0gd2lkdGggKiA0XHJcbiAgICBjb25zdCBvdmVybGF5ID0gYXJyYXkudW5pZm9ybSgtMSwgd2lkdGggKiBoZWlnaHQpXHJcblxyXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIGNvbnN0IHlPZmZzZXQgPSB5ICogcm93UGl0Y2hcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyArK3gpIHtcclxuICAgICAgICAgICAgLy8gcGFjayBjb2xvciB0byBhIHVuaXF1ZSB2YWx1ZVxyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeCAqIDRcclxuICAgICAgICAgICAgY29uc3QgciA9IGRhdGFbb2Zmc2V0XVxyXG4gICAgICAgICAgICBjb25zdCBnID0gZGF0YVtvZmZzZXQgKyAxXVxyXG4gICAgICAgICAgICBjb25zdCBiID0gZGF0YVtvZmZzZXQgKyAyXVxyXG4gICAgICAgICAgICBjb25zdCBhID0gZGF0YVtvZmZzZXQgKyAzXVxyXG4gICAgICAgICAgICBjb25zdCByZ2JhID0gcGFja0NvbG9yKHIsIGcsIGIsIGEpXHJcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IHBhbGV0dGVNYXAuZ2V0KHJnYmEpID8/IC0xXHJcbiAgICAgICAgICAgIG92ZXJsYXlbeSAqIHdpZHRoICsgeF0gPSBpZHhcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG92ZXJsYXlcclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBhbiBvdmVybGF5IHRoYXQgbWFwcyBlYWNoIHBhbGV0dGUgZW50cnkgdG8gYSBsaXN0IG9mIHBpeGVscyB3aXRoIGl0cyBjb2xvclxyXG4gKiBAcGFyYW0gaW1nRGF0YSBcclxuICogQHBhcmFtIHBhbGV0dGUgXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVQaXhlbE92ZXJsYXkod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHBhbGV0dGU6IG51bWJlcltdLCBwYWxldHRlT3ZlcmxheTogbnVtYmVyW10pOiBTZXQ8bnVtYmVyPltdIHtcclxuICAgIGNvbnN0IG92ZXJsYXkgPSBhcnJheS5nZW5lcmF0ZShwYWxldHRlLmxlbmd0aCwgKCkgPT4gbmV3IFNldDxudW1iZXI+KCkpXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiB3aWR0aFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICAvLyBwYWNrIGNvbG9yIHRvIGEgdW5pcXVlIHZhbHVlXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGNvbnN0IHBhbGV0dGVJZHggPSBwYWxldHRlT3ZlcmxheVtvZmZzZXRdXHJcbiAgICAgICAgICAgIGlmIChwYWxldHRlSWR4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgZmxhdENvb3JkID0gZmxhdCh4LCB5LCB3aWR0aClcclxuICAgICAgICAgICAgb3ZlcmxheVtwYWxldHRlSWR4XS5hZGQoZmxhdENvb3JkKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gb3ZlcmxheVxyXG59XHJcblxyXG5mdW5jdGlvbiBwYWNrQ29sb3IocjogbnVtYmVyLCBnOiBudW1iZXIsIGI6IG51bWJlciwgYTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IHZhbHVlID0gciA8PCAyNCB8IGcgPDwgMTYgfCBiIDw8IDggfCBhXHJcbiAgICByZXR1cm4gdmFsdWVcclxufVxyXG5cclxuZnVuY3Rpb24gdW5wYWNrQ29sb3IoeDogbnVtYmVyKTogQ29sb3Ige1xyXG4gICAgY29uc3QgciA9ICh4ICYgMHhGRjAwMDAwMCkgPj4+IDI0XHJcbiAgICBjb25zdCBnID0gKHggJiAweDAwRkYwMDAwKSA+Pj4gMTZcclxuICAgIGNvbnN0IGIgPSAoeCAmIDB4MDAwMEZGMDApID4+PiA4XHJcbiAgICBjb25zdCBhID0geCAmIDB4MDAwMDAwRkZcclxuXHJcbiAgICByZXR1cm4gW3IsIGcsIGIsIGFdXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGNMdW1pbmFuY2UocjogbnVtYmVyLCBnOiBudW1iZXIsIGI6IG51bWJlcikge1xyXG4gICAgY29uc3QgbCA9IDAuMjEyNiAqIChyIC8gMjU1KSArIDAuNzE1MiAqIChnIC8gMjU1KSArIDAuMDcyMiAqIChiIC8gMjU1KVxyXG4gICAgcmV0dXJuIGxcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0NlbGxJbWFnZShjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSkge1xyXG4gICAgY29uc3QgY2VsbEltYWdlV2lkdGggPSB3aWR0aCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG4gICAgY29uc3QgY2VsbEltYWdlSGVpZ2h0ID0gaGVpZ2h0ICogKGNlbGxTaXplICsgMSkgKyAxXHJcblxyXG4gICAgLy8gc2l6ZSBjYW52YXNcclxuICAgIGN0eC5jYW52YXMud2lkdGggPSBjZWxsSW1hZ2VXaWR0aFxyXG4gICAgY3R4LmNhbnZhcy5oZWlnaHQgPSBjZWxsSW1hZ2VIZWlnaHRcclxuXHJcbiAgICAvLyBkcmF3IGhvcml6b250YWwgZ3JpZCBsaW5lc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gaGVpZ2h0OyArK2kpIHtcclxuICAgICAgICBjdHguc3Ryb2tlUmVjdCgwLCBpICogKGNlbGxTaXplICsgMSksIGNlbGxJbWFnZVdpZHRoLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgdmVydGljYWwgZ3JpZCBsaW5lc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gd2lkdGg7ICsraSkge1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KGkgKiAoY2VsbFNpemUgKyAxKSwgMCwgMSwgY2VsbEltYWdlSGVpZ2h0KVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgI3NcclxuICAgIGNvbnN0IGZvbnQgPSBjdHguZm9udFxyXG4gICAgY3R4LmZvbnQgPSBcIjE2cHggYXJpYWxcIlxyXG4gICAgY29uc3QgdGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGhcclxuICAgIGNvbnN0IGNkeHkgPSBjZWxsU2l6ZSAvIDJcclxuXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiB3aWR0aFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgICAgICBjb25zdCBwYWxldHRlSWR4ID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0XVxyXG4gICAgICAgICAgICBjb25zdCBsYWJlbCA9IGAke3BhbGV0dGVJZHggKyAxfWBcclxuICAgICAgICAgICAgY29uc3QgbWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dChsYWJlbClcclxuICAgICAgICAgICAgY29uc3QgY3ggPSB4ICogKGNlbGxTaXplICsgMSkgKyBjZHh5ICsgMSAtIG1ldHJpY3Mud2lkdGggLyAyXHJcbiAgICAgICAgICAgIGNvbnN0IGN5ID0geSAqIChjZWxsU2l6ZSArIDEpICsgY2R4eSArIDEgKyB0ZXh0SGVpZ2h0IC8gMlxyXG4gICAgICAgICAgICBjdHguZmlsbFRleHQobGFiZWwsIGN4LCBjeSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmZvbnQgPSBmb250XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpdCh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgbWF4U2l6ZTogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICBpZiAod2lkdGggPiBoZWlnaHQgJiYgd2lkdGggPiBtYXhTaXplKSB7XHJcbiAgICAgICAgaGVpZ2h0ID0gbWF4U2l6ZSAqIGhlaWdodCAvIHdpZHRoXHJcbiAgICAgICAgcmV0dXJuIFtNYXRoLmZsb29yKG1heFNpemUpLCBNYXRoLmZsb29yKGhlaWdodCldXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGhlaWdodCA+IHdpZHRoICYmIGhlaWdodCA+IG1heFNpemUpIHtcclxuICAgICAgICB3aWR0aCA9IG1heFNpemUgKiB3aWR0aCAvIGhlaWdodFxyXG4gICAgICAgIHJldHVybiBbTWF0aC5mbG9vcih3aWR0aCksIE1hdGguZmxvb3IobWF4U2l6ZSldXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFtNYXRoLmZsb29yKHdpZHRoKSwgTWF0aC5mbG9vcihoZWlnaHQpXVxyXG59XHJcblxyXG5mdW5jdGlvbiBmbGF0KHg6IG51bWJlciwgeTogbnVtYmVyLCByb3dQaXRjaDogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4geSAqIHJvd1BpdGNoICsgeFxyXG59XHJcblxyXG5mdW5jdGlvbiB1bmZsYXQoaTogbnVtYmVyLCByb3dQaXRjaDogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICByZXR1cm4gW2kgJSByb3dQaXRjaCwgTWF0aC5mbG9vcihpIC8gcm93UGl0Y2gpXVxyXG59XHJcblxyXG4vKipcclxuICAgKiBDb252ZXJ0IGFuIGltYWdlIHggb3IgeSBjb29yZGluYXRlIHRvIHRvcCBvciBsZWZ0IG9mIGNibiBjZWxsIGNvbnRhaW5pbmcgdGhhdCBwaXhlbFxyXG4gICAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gICAqL1xyXG5mdW5jdGlvbiBpbWFnZTJDZWxsQ29vcmQoY29vcmQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gY29vcmQgKiAoY2VsbFNpemUgKyAxKSArIDFcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnQgYSBjYm4geCBvciB5IGNvb3JkaW5hdGUgdG8gdG9wIG9yIGxlZnQgb2YgY2JuIGNlbGwgY29udGFpbmluZyB0aGF0IHBpeGVsXHJcbiAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gKi9cclxuZnVuY3Rpb24gY2VsbDJJbWFnZUNvb3JkKGNvb3JkOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoKGNvb3JkIC0gMSkgLyAoY2VsbFNpemUgKyAxKSlcclxufVxyXG5cclxuLyoqXHJcbiAgICogQ29udmVydCBhbiBpbWFnZSB4IG9yIHkgY29vcmRpbmF0ZSB0byB0b3Agb3IgbGVmdCBvZiBjYm4gY2VsbCBjb250YWluaW5nIHRoYXQgcGl4ZWxcclxuICAgKiBAcGFyYW0gY29vcmQgeCBvciB5IGNvb3JkaW5hdGVcclxuICAgKi9cclxuZnVuY3Rpb24gaW1hZ2UyQ2VsbCh4OiBudW1iZXIsIHk6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgcmV0dXJuIFtpbWFnZTJDZWxsQ29vcmQoeCksIGltYWdlMkNlbGxDb29yZCh5KV1cclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnQgYSBjYm4geCBvciB5IGNvb3JkaW5hdGUgdG8gdG9wIG9yIGxlZnQgb2YgY2JuIGNlbGwgY29udGFpbmluZyB0aGF0IHBpeGVsXHJcbiAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gKi9cclxuZnVuY3Rpb24gY2VsbDJJbWFnZSh4OiBudW1iZXIsIHk6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgcmV0dXJuIFtjZWxsMkltYWdlQ29vcmQoeCksIGNlbGwySW1hZ2VDb29yZCh5KV1cclxufVxyXG5cclxuLyoqXHJcbiAqIGNvbnZlcnQgcmdiYSBjb29yZGluYXRlcyB0byBhIHN0eWxlIHN0cmluZ1xyXG4gKiBAcGFyYW0gciByZWRcclxuICogQHBhcmFtIGcgZ3JlZW5cclxuICogQHBhcmFtIGIgYmx1ZVxyXG4gKiBAcGFyYW0gYSBhbHBoYVxyXG4gKi9cclxuZnVuY3Rpb24gY29sb3IyUkdCQVN0eWxlKHI6IG51bWJlciwgZzogbnVtYmVyLCBiOiBudW1iZXIsIGE6IG51bWJlciA9IDI1NSkge1xyXG4gICAgcmV0dXJuIGByZ2JhKCR7cn0sICR7Z30sICR7Yn0sICR7YSAvIDI1NX0pYFxyXG59XHJcblxyXG5mdW5jdGlvbiBxdWFudE1lZGlhbkN1dChjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgbWF4Q29sb3JzOiBudW1iZXIpIHtcclxuICAgIGludGVyZmFjZSBQaXhlbCB7XHJcbiAgICAgICAgb2Zmc2V0OiBudW1iZXJcclxuICAgICAgICByOiBudW1iZXJcclxuICAgICAgICBnOiBudW1iZXJcclxuICAgICAgICBiOiBudW1iZXJcclxuICAgIH1cclxuXHJcbiAgICAvLyBtYXhDb2xvcnMgbXVzdCBiZSBhIHBvd2VyIG9mIDIgZm9yIHRoaXMgYWxnb3JpdGhtXHJcbiAgICBtYXhDb2xvcnMgPSBtYXRoLm5leHRQb3cyKG1heENvbG9ycylcclxuICAgIGNvbnN0IGltZ0RhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIGN0eC5jYW52YXMud2lkdGgsIGN0eC5jYW52YXMuaGVpZ2h0KVxyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBkYXRhIH0gPSBpbWdEYXRhXHJcbiAgICBjb25zdCByb3dQaXRjaCA9IHdpZHRoICogNFxyXG5cclxuICAgIGNvbnN0IGJ1Y2tldHMgPSBuZXcgQXJyYXk8UGl4ZWxbXT4oKVxyXG4gICAgYnVja2V0cy5wdXNoKGNyZWF0ZUluaXRpYWxCdWNrZXQoKSlcclxuXHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgIGNvbnN0IGJ1Y2tldCA9IGNob29zZUJ1Y2tldChjb2xvclJhbmdlVG9sZXJhbmNlLCBidWNrZXRzKVxyXG4gICAgICAgIGlmICghYnVja2V0KSB7XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBidWNrZXRzLnB1c2goc3BsaXRCdWNrZXQoYnVja2V0KSlcclxuICAgICAgICBpZiAoYnVja2V0cy5sZW5ndGggPj0gbWF4Q29sb3JzKSB7XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGNhbGN1bGF0ZSB0aGUgYXZlcmFnZSBjb2xvciBmb3IgZWFjaCBidWNrZXRcclxuICAgIGNvbnN0IGNvbG9ycyA9IG5ldyBBcnJheTxbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0+KClcclxuICAgIGZvciAoY29uc3QgYnVja2V0IG9mIGJ1Y2tldHMpIHtcclxuICAgICAgICBsZXQgciA9IDBcclxuICAgICAgICBsZXQgZyA9IDBcclxuICAgICAgICBsZXQgYiA9IDBcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBwaXhlbCBvZiBidWNrZXQpIHtcclxuICAgICAgICAgICAgciArPSBwaXhlbC5yXHJcbiAgICAgICAgICAgIGcgKz0gcGl4ZWwuZ1xyXG4gICAgICAgICAgICBiICs9IHBpeGVsLmJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHIgLz0gYnVja2V0Lmxlbmd0aFxyXG4gICAgICAgIGcgLz0gYnVja2V0Lmxlbmd0aFxyXG4gICAgICAgIGIgLz0gYnVja2V0Lmxlbmd0aFxyXG5cclxuICAgICAgICBjb2xvcnMucHVzaChbTWF0aC5yb3VuZChyKSwgTWF0aC5yb3VuZChnKSwgTWF0aC5yb3VuZChiKV0pXHJcbiAgICB9XHJcblxyXG4gICAgLy8gaXRlcmF0ZSB0aHJvdWdoIGVhY2ggYnVja2V0LCByZXBsYWNpbmcgcGl4ZWwgY29sb3Igd2l0aCBidWNrZXQgY29sb3IgZm9yIGVhY2ggcGl4ZWxcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVja2V0cy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGJ1Y2tldCA9IGJ1Y2tldHNbaV1cclxuICAgICAgICBjb25zdCBbciwgZywgYl0gPSBjb2xvcnNbaV1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBwaXhlbCBvZiBidWNrZXQpIHtcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gcGl4ZWwub2Zmc2V0ICogNFxyXG4gICAgICAgICAgICBkYXRhW29mZnNldF0gPSByXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICsgMV0gPSBnXHJcbiAgICAgICAgICAgIGRhdGFbb2Zmc2V0ICsgMl0gPSBiXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGN0eC5wdXRJbWFnZURhdGEoaW1nRGF0YSwgMCwgMClcclxuXHJcbiAgICBmdW5jdGlvbiBjcmVhdGVJbml0aWFsQnVja2V0KCk6IFBpeGVsW10ge1xyXG4gICAgICAgIC8vIGNyZWF0ZSBpbml0aWFsIGJ1Y2tldFxyXG4gICAgICAgIGNvbnN0IGJ1Y2tldCA9IG5ldyBBcnJheTxQaXhlbD4oKVxyXG4gICAgICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiByb3dQaXRjaFxyXG4gICAgICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyArK3gpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4ICogNFxyXG4gICAgICAgICAgICAgICAgY29uc3QgciA9IGRhdGFbb2Zmc2V0XVxyXG4gICAgICAgICAgICAgICAgY29uc3QgZyA9IGRhdGFbb2Zmc2V0ICsgMV1cclxuICAgICAgICAgICAgICAgIGNvbnN0IGIgPSBkYXRhW29mZnNldCArIDJdXHJcblxyXG4gICAgICAgICAgICAgICAgLy8gcGFjayBpbnRvIGJ1Y2tldFxyXG4gICAgICAgICAgICAgICAgY29uc3QgcGl4ZWw6IFBpeGVsID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldDogZmxhdCh4LCB5LCB3aWR0aCksXHJcbiAgICAgICAgICAgICAgICAgICAgcjogcixcclxuICAgICAgICAgICAgICAgICAgICBnOiBnLFxyXG4gICAgICAgICAgICAgICAgICAgIGI6IGJcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBidWNrZXQucHVzaChwaXhlbClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGJ1Y2tldFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGNSYW5nZShwaXhlbHM6IFBpeGVsW10sIHNlbGVjdG9yOiAoeDogUGl4ZWwpID0+IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IG1pbiA9IEluZmluaXR5XHJcbiAgICAgICAgbGV0IG1heCA9IC1JbmZpbml0eVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHBpeGVsIG9mIHBpeGVscykge1xyXG4gICAgICAgICAgICBtaW4gPSBNYXRoLm1pbihzZWxlY3RvcihwaXhlbCksIG1pbilcclxuICAgICAgICAgICAgbWF4ID0gTWF0aC5tYXgoc2VsZWN0b3IocGl4ZWwpLCBtYXgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbWF4IC0gbWluXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2hvb3NlQnVja2V0KHRvbGVyYW5jZTogbnVtYmVyLCBidWNrZXRzOiBQaXhlbFtdW10pOiBQaXhlbFtdIHwgbnVsbCB7XHJcbiAgICAgICAgbGV0IG1heFJhbmdlID0gLUluZmluaXR5XHJcbiAgICAgICAgbGV0IG1heEJ1Y2tldDogUGl4ZWxbXSB8IG51bGwgPSBudWxsXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgYnVja2V0IG9mIGJ1Y2tldHMpIHtcclxuICAgICAgICAgICAgY29uc3QgcmFuZ2VSID0gY2FsY1JhbmdlKGJ1Y2tldCwgcCA9PiBwLnIpXHJcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlRyA9IGNhbGNSYW5nZShidWNrZXQsIHAgPT4gcC5nKVxyXG4gICAgICAgICAgICBjb25zdCByYW5nZUIgPSBjYWxjUmFuZ2UoYnVja2V0LCBwID0+IHAuYilcclxuICAgICAgICAgICAgbGV0IHJhbmdlID0gMFxyXG4gICAgICAgICAgICBpZiAocmFuZ2VSID4gcmFuZ2VHICYmIHJhbmdlUiA+IHJhbmdlQikge1xyXG4gICAgICAgICAgICAgICAgcmFuZ2UgPSByYW5nZVJcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChyYW5nZUcgPiByYW5nZVIpIHtcclxuICAgICAgICAgICAgICAgIHJhbmdlID0gcmFuZ2VHXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByYW5nZSA9IHJhbmdlQlxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocmFuZ2UgPiBtYXhSYW5nZSkge1xyXG4gICAgICAgICAgICAgICAgbWF4UmFuZ2UgPSByYW5nZVxyXG4gICAgICAgICAgICAgICAgbWF4QnVja2V0ID0gYnVja2V0XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtYXhSYW5nZSA+IHRvbGVyYW5jZSA/IG1heEJ1Y2tldCA6IG51bGxcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzcGxpdEJ1Y2tldChidWNrZXQ6IFBpeGVsW10pOiBQaXhlbFtdIHtcclxuICAgICAgICBjb25zdCByYW5nZVIgPSBjYWxjUmFuZ2UoYnVja2V0LCBwID0+IHAucilcclxuICAgICAgICBjb25zdCByYW5nZUcgPSBjYWxjUmFuZ2UoYnVja2V0LCBwID0+IHAuZylcclxuICAgICAgICBjb25zdCByYW5nZUIgPSBjYWxjUmFuZ2UoYnVja2V0LCBwID0+IHAuYilcclxuXHJcbiAgICAgICAgaWYgKHJhbmdlUiA+IHJhbmdlRyAmJiByYW5nZVIgPiByYW5nZUIpIHtcclxuICAgICAgICAgICAgYnVja2V0LnNvcnQoKGEsIGIpID0+IGEuciAtIGIucilcclxuICAgICAgICB9IGVsc2UgaWYgKHJhbmdlRyA+IHJhbmdlUikge1xyXG4gICAgICAgICAgICBidWNrZXQuc29ydCgoYSwgYikgPT4gYS5nIC0gYi5nKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGJ1Y2tldC5zb3J0KChhLCBiKSA9PiBhLmIgLSBiLmIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtaWRkbGUgPSBNYXRoLmZsb29yKGJ1Y2tldC5sZW5ndGggLyAyKVxyXG4gICAgICAgIGNvbnN0IG5ld0J1Y2tldCA9IGJ1Y2tldC5zcGxpY2UobWlkZGxlKVxyXG4gICAgICAgIHJldHVybiBuZXdCdWNrZXRcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcHJ1bmVQYWxsZXRlKHBhbGV0dGU6IG51bWJlcltdLCBwaXhlbE92ZXJsYXk6IFNldDxudW1iZXI+W10sIG1heFBpeGVsczogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQpOiBudW1iZXJbXSB7XHJcbiAgICBjb25zdCBpbmRpY2VzVG9LZWVwID0gbmV3IFNldDxudW1iZXI+KGFycmF5LnNlcXVlbmNlKDAsIHBhbGV0dGUubGVuZ3RoKSlcclxuXHJcbiAgICBjdHguY2FudmFzLndpZHRoID0gd2lkdGggKiAoY2VsbFNpemUgKyAxKSArIDFcclxuICAgIGN0eC5jYW52YXMuaGVpZ2h0ID0gaGVpZ2h0ICogKGNlbGxTaXplICsgMSkgKyAxXHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwaXhlbE92ZXJsYXkubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCBwaXhlbHMgPSBwaXhlbE92ZXJsYXlbaV1cclxuICAgICAgICBpZiAocGl4ZWxzLnNpemUgPCBtYXhQaXhlbHMpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpdGVyLmFsbChwaXhlbHMsIHggPT4gIWlzQm9yZGVyUGl4ZWwoLi4udW5mbGF0KHgsIHdpZHRoKSwgd2lkdGgsIGhlaWdodCkpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBmaWxsIHRoZXNlIHBpeGVscyBpbiBpbWFnZSB3aXRoIGFwcHJvcHJpYXRlIGNvbG9yXHJcbiAgICAgICAgY29uc3QgW3IsIGcsIGJdID0gdW5wYWNrQ29sb3IocGFsZXR0ZVtpXSlcclxuICAgICAgICBmb3IgKGNvbnN0IHh5IG9mIHBpeGVscykge1xyXG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSB1bmZsYXQoeHksIHdpZHRoKVxyXG4gICAgICAgICAgICBjb25zdCBbY3gsIGN5XSA9IGltYWdlMkNlbGwoeCwgeSlcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yMlJHQkFTdHlsZShyLCBnLCBiKVxyXG4gICAgICAgICAgICBjdHguZmlsbFJlY3QoY3gsIGN5LCBjZWxsU2l6ZSwgY2VsbFNpemUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpbmRpY2VzVG9LZWVwLmRlbGV0ZShpKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG5ld1BhbGV0dGUgPSBbLi4uaW5kaWNlc1RvS2VlcF0ubWFwKHggPT4gcGFsZXR0ZVt4XSlcclxuICAgIHJldHVybiBuZXdQYWxldHRlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzQm9yZGVyUGl4ZWwoeDogbnVtYmVyLCB5OiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4geCA9PT0gMCB8fCB5ID09PSAwIHx8IHggPT09IHdpZHRoIC0gMSB8fCB5ID09PSBoZWlnaHQgLSAxXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFyQ0JOU3RhdGUoKSB7XHJcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLmNsZWFyKClcclxufVxyXG5cclxuZnVuY3Rpb24gc2F2ZUNCTlN0YXRlKHN0YXRlOiBDQk5TdGF0ZSkge1xyXG4gICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKFwic3RhdGVcIiwgSlNPTi5zdHJpbmdpZnkoc3RhdGUpKVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkQ0JOU3RhdGUoKTogQ0JOU3RhdGUge1xyXG4gICAgY29uc3QgZGF0YSA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInN0YXRlXCIpXHJcbiAgICBpZiAoIWRhdGEpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBpbWFnZTogXCJcIixcclxuICAgICAgICAgICAgc2VxdWVuY2U6IFtdXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHN0YXRlID0gSlNPTi5wYXJzZShkYXRhKVxyXG4gICAgcmV0dXJuIHN0YXRlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3dMb2FkaW5nSW5kaWNhdG9yKCkge1xyXG4gICAgY29uc3QgZGl2ID0gZG9tLmJ5SWQoXCJsb2FkaW5nTW9kYWxcIilcclxuICAgIGRpdi5oaWRkZW4gPSBmYWxzZVxyXG59XHJcblxyXG5mdW5jdGlvbiBoaWRlTG9hZGluZ0luZGljYXRvcigpIHtcclxuICAgIGNvbnN0IGRpdiA9IGRvbS5ieUlkKFwibG9hZGluZ01vZGFsXCIpXHJcbiAgICBkaXYuaGlkZGVuID0gdHJ1ZVxyXG59XHJcblxyXG5uZXcgQ0JOKCkiXX0=