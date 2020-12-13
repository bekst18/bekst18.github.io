import * as array from "../shared/array.js";
import * as dom from "../shared/dom.js";
import * as geo from "../shared/geo3d.js";
import * as math from "../shared/math.js";
import * as util from "../shared/util.js";
import * as iter from "../shared/iter.js";
import * as idb from "../shared/idb.js";
import * as imaging from "../shared/imaging.js";
import * as color from "../shared/color.js";
// size that each image pixel is blown up to
const cellSize = 32;
// tolerance before splitting colors - higher = less colors
const colorRangeTolerance = 32;
// max bg pixels before removal
const maxBackgroundPixels = 1024;
// default max dimension
const defaultMaxDim = 128;
// default max colors
const defaultMaxColors = 64;
// object store name
const picturesObjectStoreName = "pictures";
const imageMimeType = "image/png";
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
class AcquireUi {
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
        this.galleryButton = dom.byId("galleryButton");
        this.errorsDiv = dom.byId("errors");
        this.imageAcquired = new Channel();
        this.libraryUi = new LibraryUi();
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.showGallery = new Channel();
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
        this.galleryButton.addEventListener("click", _ => this.showGallery.publish());
        this.libraryUi.cancel.subcribe(() => {
            this.imageAcquisitionDiv.hidden = false;
        });
    }
    show() {
        this.imageAcquisitionDiv.hidden = false;
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
    constructor(db) {
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
        this.db = db;
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
    async onCreateColorByNumber() {
        const blob = await imaging.canvas2Blob(this.imageScaleCanvas, imageMimeType);
        const cbn = {
            image: blob,
            sequence: []
        };
        const key = await putCBN(this.db, cbn);
        this.createCBN.publish(key);
    }
    onReturnClick() {
        this.return.publish();
    }
    async onMaxDimChange() {
        await showLoadingIndicator();
        this.redraw();
        hideLoadingIndicator();
    }
    async onMaxColorsChange() {
        await showLoadingIndicator();
        this.redraw();
        hideLoadingIndicator();
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
        imaging.quantMedianCut(this.imageScaleCtx, maxColors, colorRangeTolerance);
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
    constructor(db) {
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
        this.key = 0;
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
        this.db = db;
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
    async show(key) {
        this.key = key;
        this.playUiDiv.hidden = false;
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.complete = false;
        this.zoom = 1;
        this.drag = false;
        this.touchZoom = 0;
        const pic = await getCBN(this.db, key);
        const img = await dom.loadImage(URL.createObjectURL(pic.image));
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
        this.sequence = pic.sequence;
        for (const xy of this.sequence) {
            const paletteIdx = this.paletteOverlay[xy];
            const [x, y] = imaging.unflat(xy, this.imageWidth);
            this.selectPaletteEntry(paletteIdx);
            this.tryFillCell(x, y);
        }
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
            const [r, g, b] = color.unpack(this.palette[i]);
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
    async saveState() {
        const blob = await imaging.canvas2Blob(this.imageCanvas, imageMimeType);
        await putCBN(this.db, { image: blob, sequence: this.sequence }, this.key);
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
        if (this.colorDrag && this.paletteOverlay[imaging.flat(x, y, this.imageWidth)] === this.selectedPaletteIndex) {
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
        const flatXY = imaging.flat(x, y, this.imageWidth);
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
        const [r, g, b] = color.unpack(this.palette[this.selectedPaletteIndex]);
        const [cx, cy] = image2Cell(x, y);
        this.colorCtx.fillStyle = color2RGBAStyle(r, g, b);
        this.colorCtx.fillRect(cx, cy, cellSize, cellSize);
        // remove the pixel from overlay
        const pixels = this.pixelOverlay[this.selectedPaletteIndex];
        const flatXY = imaging.flat(x, y, this.imageWidth);
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
            const [x, y] = image2Cell(...imaging.unflat(pixel, this.imageWidth));
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
            const [x, y] = imaging.unflat(xy, this.imageWidth);
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
class GalleryUi {
    constructor(db) {
        this.ui = dom.byId("galleryUi");
        this.cbnsDiv = dom.byId("cbns");
        this.galleryAcquireImageButton = dom.byId("galleryAcquireImageButton");
        this.template = dom.byId("galleryEntry");
        this.showAcquireImage = new Channel();
        this.cbnSelected = new Channel();
        this.db = db;
    }
    async show() {
        this.ui.hidden = false;
        dom.delegate(this.ui, "click", ".gallery-entry", (evt) => this.onEntryClick(evt));
        this.galleryAcquireImageButton.addEventListener("click", () => this.showAcquireImage.publish());
        // clear current ui
        dom.removeAllChildren(this.cbnsDiv);
        const kvs = await getAllCBNs(this.db);
        for (const [key, cbn] of kvs) {
            const fragment = this.template.content.cloneNode(true);
            const entryDiv = dom.bySelector(fragment, ".gallery-entry");
            const imageDiv = dom.bySelector(entryDiv, ".gallery-image");
            imageDiv.src = URL.createObjectURL(cbn.image);
            entryDiv.dataset["key"] = key.toString();
            this.cbnsDiv.appendChild(fragment);
        }
    }
    hide() {
        this.ui.hidden = true;
    }
    onEntryClick(evt) {
        const div = evt.target.closest(".gallery-entry");
        if (!div) {
            return;
        }
        const key = parseInt(div.dataset["key"] || "");
        if (!key) {
            return;
        }
        this.cbnSelected.publish(key);
    }
}
async function main() {
    const db = await openDB();
    const acquireUi = new AcquireUi();
    const sizeUi = new ImageSizeUi(db);
    const playUi = new PlayUi(db);
    const galleryUi = new GalleryUi(db);
    acquireUi.imageAcquired.subcribe(onImageAcquired);
    acquireUi.showGallery.subcribe(showGallery);
    sizeUi.createCBN.subcribe(showPlay);
    sizeUi.return.subcribe(showAcquire);
    playUi.return.subcribe(showAcquire);
    galleryUi.showAcquireImage.subcribe(showAcquire);
    galleryUi.cbnSelected.subcribe(showPlay);
    // initially show acquire ui
    acquireUi.show();
    async function openDB() {
        // open / setup db
        // await indexedDB.deleteDatabase("cbn")
        const req = indexedDB.open("cbn", 1);
        req.addEventListener("blocked", _ => dbBlocked());
        req.addEventListener("upgradeneeded", ev => upgradeDB(ev));
        const db = await idb.waitRequest(req);
        return db;
    }
    async function onImageAcquired(img) {
        await showLoadingIndicator();
        acquireUi.hide();
        sizeUi.show(img);
        hideLoadingIndicator();
    }
    function showAcquire() {
        hideAll();
        acquireUi.show();
    }
    function showGallery() {
        hideAll();
        galleryUi.show();
    }
    async function showPlay(key) {
        await showLoadingIndicator();
        hideAll();
        playUi.show(key);
        hideLoadingIndicator();
    }
    function hideAll() {
        playUi.hide();
        sizeUi.hide();
        acquireUi.hide();
        galleryUi.hide();
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
            const value = color.pack(r, g, b, a);
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
            const rgba = color.pack(r, g, b, a);
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
            const flatCoord = imaging.flat(x, y, width);
            overlay[paletteIdx].add(flatCoord);
        }
    }
    return overlay;
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
function prunePallete(palette, pixelOverlay, maxPixels, width, height, ctx) {
    const indicesToKeep = new Set(array.sequence(0, palette.length));
    ctx.canvas.width = width * (cellSize + 1) + 1;
    ctx.canvas.height = height * (cellSize + 1) + 1;
    for (let i = 0; i < pixelOverlay.length; ++i) {
        const pixels = pixelOverlay[i];
        if (pixels.size < maxPixels) {
            continue;
        }
        if (iter.all(pixels, x => !isBorderPixel(...imaging.unflat(x, width), width, height))) {
            continue;
        }
        // fill these pixels in image with appropriate color
        const [r, g, b] = color.unpack(palette[i]);
        for (const xy of pixels) {
            const [x, y] = imaging.unflat(xy, width);
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
async function showLoadingIndicator() {
    const div = dom.byId("loadingModal");
    div.hidden = false;
    await util.wait(0);
}
function hideLoadingIndicator() {
    const div = dom.byId("loadingModal");
    div.hidden = true;
}
async function upgradeDB(evt) {
    const db = evt.target.result;
    // note - event contains old / new versions if required
    // update to the new version    
    if (!db.objectStoreNames.contains(picturesObjectStoreName)) {
        db.createObjectStore(picturesObjectStoreName, { autoIncrement: true });
    }
}
function dbBlocked() {
    showError("Picture database needs updated, but other tabs are open that are using it. Please close all tabs for this web site and try again.");
}
function showError(message) {
    const modalDiv = dom.byId("errorModal");
    const messageDiv = dom.byId("errorMessage");
    modalDiv.hidden = false;
    messageDiv.textContent = message;
}
async function putCBN(db, data, key) {
    // note safari can't store blobs so must convert to arrayBuffer
    const dbData = await cbn2db(data);
    const tx = db.transaction(picturesObjectStoreName, "readwrite");
    const store = tx.objectStore(picturesObjectStoreName);
    const k = await idb.waitRequest(store.put(dbData, key));
    return k;
}
async function getCBN(db, key) {
    const tx = db.transaction(picturesObjectStoreName, "readwrite");
    const store = tx.objectStore(picturesObjectStoreName);
    const dbData = await idb.waitRequest(store.get(key));
    const data = db2cbn(dbData);
    await idb.waitTx(tx);
    return data;
}
async function getAllCBNs(db) {
    const tx = db.transaction(picturesObjectStoreName, "readwrite");
    const store = tx.objectStore(picturesObjectStoreName);
    const datas = new Array();
    const req = store.openCursor();
    while (true) {
        const cursor = await idb.waitRequest(req);
        if (!cursor) {
            break;
        }
        const key = cursor.key;
        const dbData = cursor.value;
        const data = db2cbn(dbData);
        datas.push([key, data]);
        cursor.continue();
    }
    return datas;
}
async function cbn2db(data) {
    const buffer = await idb.blob2ArrayBuffer(data.image);
    return {
        image: buffer,
        sequence: data.sequence
    };
}
function db2cbn(data) {
    return {
        image: idb.arrayBuffer2Blob(data.image, imageMimeType),
        sequence: data.sequence
    };
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQTtBQUN2QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQUMvQyxPQUFPLEtBQUssS0FBSyxNQUFNLG9CQUFvQixDQUFBO0FBRTNDLDRDQUE0QztBQUM1QyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFFbkIsMkRBQTJEO0FBQzNELE1BQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFBO0FBRTlCLCtCQUErQjtBQUMvQixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQTtBQUVoQyx3QkFBd0I7QUFDeEIsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFBO0FBRXpCLHFCQUFxQjtBQUNyQixNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQTtBQUUzQixvQkFBb0I7QUFDcEIsTUFBTSx1QkFBdUIsR0FBRyxVQUFVLENBQUE7QUFFMUMsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFBO0FBRWpDLElBQUssVUFJSjtBQUpELFdBQUssVUFBVTtJQUNYLDJDQUFJLENBQUE7SUFDSiwyQ0FBSSxDQUFBO0lBQ0oseURBQVcsQ0FBQTtBQUNmLENBQUMsRUFKSSxVQUFVLEtBQVYsVUFBVSxRQUlkO0FBWUQsTUFBTSxPQUFPO0lBQWI7UUFDcUIsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBd0Is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Q2pDLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUE7UUFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUE7UUFDOUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTlFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtZQUMzQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNCLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ2xELE1BQU0sTUFBTSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDckIsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMzQixTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMvQixTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMvQixTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFBO1lBRWxCLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkMsSUFBSSxDQUFDLEdBQUcsQ0FB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QUMzQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDdkIsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO0tBQ3BCO0lBRUQsT0FBTyxLQUFLLENBQUE7QUFDaEIsQ0FBQztBQUVELEtBQUssVUFBVSxNQUFNLENBQUMsSUFBZ0I7SUFDbEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3JELE9BQU87UUFDSCxLQUFLLEVBQUUsTUFBTTtRQUNiLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtLQUMxQixDQUFBO0FBQ0wsQ0FBQztBQUVELFNBQVMsTUFBTSxDQUFDLElBQWtCO0lBQzlCLE9BQU87UUFDSCxLQUFLLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDO1FBQ3RELFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtLQUMxQixDQUFBO0FBQ0wsQ0FBQztBQUVELElBQUksRUFBRSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiXHJcbmltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzNkLmpzXCJcclxuaW1wb3J0ICogYXMgbWF0aCBmcm9tIFwiLi4vc2hhcmVkL21hdGguanNcIlxyXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gXCIuLi9zaGFyZWQvdXRpbC5qc1wiXHJcbmltcG9ydCAqIGFzIGl0ZXIgZnJvbSBcIi4uL3NoYXJlZC9pdGVyLmpzXCJcclxuaW1wb3J0ICogYXMgaWRiIGZyb20gXCIuLi9zaGFyZWQvaWRiLmpzXCJcclxuaW1wb3J0ICogYXMgaW1hZ2luZyBmcm9tIFwiLi4vc2hhcmVkL2ltYWdpbmcuanNcIlxyXG5pbXBvcnQgKiBhcyBjb2xvciBmcm9tIFwiLi4vc2hhcmVkL2NvbG9yLmpzXCJcclxuXHJcbi8vIHNpemUgdGhhdCBlYWNoIGltYWdlIHBpeGVsIGlzIGJsb3duIHVwIHRvXHJcbmNvbnN0IGNlbGxTaXplID0gMzJcclxuXHJcbi8vIHRvbGVyYW5jZSBiZWZvcmUgc3BsaXR0aW5nIGNvbG9ycyAtIGhpZ2hlciA9IGxlc3MgY29sb3JzXHJcbmNvbnN0IGNvbG9yUmFuZ2VUb2xlcmFuY2UgPSAzMlxyXG5cclxuLy8gbWF4IGJnIHBpeGVscyBiZWZvcmUgcmVtb3ZhbFxyXG5jb25zdCBtYXhCYWNrZ3JvdW5kUGl4ZWxzID0gMTAyNFxyXG5cclxuLy8gZGVmYXVsdCBtYXggZGltZW5zaW9uXHJcbmNvbnN0IGRlZmF1bHRNYXhEaW0gPSAxMjhcclxuXHJcbi8vIGRlZmF1bHQgbWF4IGNvbG9yc1xyXG5jb25zdCBkZWZhdWx0TWF4Q29sb3JzID0gNjRcclxuXHJcbi8vIG9iamVjdCBzdG9yZSBuYW1lXHJcbmNvbnN0IHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lID0gXCJwaWN0dXJlc1wiXHJcblxyXG5jb25zdCBpbWFnZU1pbWVUeXBlID0gXCJpbWFnZS9wbmdcIlxyXG5cclxuZW51bSBDYW1lcmFNb2RlIHtcclxuICAgIE5vbmUsXHJcbiAgICBVc2VyLFxyXG4gICAgRW52aXJvbm1lbnQsXHJcbn1cclxuXHJcbmludGVyZmFjZSBDQk5QaWN0dXJlIHtcclxuICAgIGltYWdlOiBCbG9iXHJcbiAgICBzZXF1ZW5jZTogbnVtYmVyW11cclxufVxyXG5cclxuaW50ZXJmYWNlIENCTlBpY3R1cmVEQiB7XHJcbiAgICBpbWFnZTogQXJyYXlCdWZmZXJcclxuICAgIHNlcXVlbmNlOiBudW1iZXJbXVxyXG59XHJcblxyXG5jbGFzcyBDaGFubmVsPFQgZXh0ZW5kcyBhbnlbXT4ge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdWJzY3JpYmVycyA9IG5ldyBTZXQ8KC4uLmFyZ3M6IFQpID0+IHZvaWQ+KClcclxuXHJcbiAgICBwdWJsaWMgc3ViY3JpYmUoc3Vic2NyaWJlcjogKC4uLmFyZ3M6IFQpID0+IHZvaWQpIHtcclxuICAgICAgICB0aGlzLnN1YnNjcmliZXJzLmFkZChzdWJzY3JpYmVyKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyB1bnN1YnNjcmliZShzdWJzY3JpYmVyOiAoLi4uYXJnczogVCkgPT4gdm9pZCkge1xyXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlcnMuZGVsZXRlKHN1YnNjcmliZXIpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHB1Ymxpc2goLi4uYXJnczogVCk6IHZvaWQge1xyXG4gICAgICAgIGZvciAoY29uc3Qgc3Vic2NyaWJlciBvZiB0aGlzLnN1YnNjcmliZXJzKSB7XHJcbiAgICAgICAgICAgIHN1YnNjcmliZXIoLi4uYXJncylcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEFjcXVpcmVVaSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhbWVyYSA9IGRvbS5ieUlkKFwiY2FtZXJhXCIpIGFzIEhUTUxWaWRlb0VsZW1lbnRcclxuICAgIHByaXZhdGUgY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuTm9uZVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBhY3F1aXJlSW1hZ2VEaXYgPSBkb20uYnlJZChcImFjcXVpcmVJbWFnZVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYXB0dXJlSW1hZ2VCdXR0b24gPSBkb20uYnlJZChcImNhcHR1cmVJbWFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZUFjcXVpc2l0aW9uRGl2ID0gZG9tLmJ5SWQoXCJpbWFnZUFjcXVpc2l0aW9uVWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmlsZURyb3BCb3ggPSBkb20uYnlJZChcImZpbGVEcm9wQm94XCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpbGVJbnB1dCA9IGRvbS5ieUlkKFwiZmlsZUlucHV0XCIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmlsZUJ1dHRvbiA9IGRvbS5ieUlkKFwiZmlsZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB1c2VDYW1lcmFCdXR0b24gPSBkb20uYnlJZChcInVzZUNhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmbGlwQ2FtZXJhQnV0dG9uID0gZG9tLmJ5SWQoXCJmbGlwQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN0b3BDYW1lcmFCdXR0b24gPSBkb20uYnlJZChcInN0b3BDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZ2FsbGVyeUJ1dHRvbiA9IGRvbS5ieUlkKFwiZ2FsbGVyeUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBlcnJvcnNEaXYgPSBkb20uYnlJZChcImVycm9yc1wiKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IGltYWdlQWNxdWlyZWQgPSBuZXcgQ2hhbm5lbDxbSFRNTENhbnZhc0VsZW1lbnRdPigpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxpYnJhcnlVaSA9IG5ldyBMaWJyYXJ5VWkoKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHB1YmxpYyByZWFkb25seSBzaG93R2FsbGVyeSA9IG5ldyBDaGFubmVsPFt2b2lkXT4oKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuZmlsZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmZpbGVJbnB1dC5jbGljaygpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5maWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2VudGVyXCIsIChlKSA9PiB0aGlzLm9uRHJhZ0VudGVyT3ZlcihlKSlcclxuICAgICAgICB0aGlzLmZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnb3ZlclwiLCAoZSkgPT4gdGhpcy5vbkRyYWdFbnRlck92ZXIoZSkpXHJcbiAgICAgICAgdGhpcy5maWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJvcFwiLCAoZSkgPT4gdGhpcy5vbkZpbGVEcm9wKGUpKVxyXG4gICAgICAgIHRoaXMuZmlsZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4gdGhpcy5vbkZpbGVDaGFuZ2UoKSlcclxuICAgICAgICB0aGlzLnVzZUNhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy51c2VDYW1lcmEoKSlcclxuICAgICAgICB0aGlzLmZsaXBDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuZmxpcENhbWVyYSgpKVxyXG4gICAgICAgIHRoaXMuc3RvcENhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5zdG9wQ2FtZXJhKCkpXHJcbiAgICAgICAgdGhpcy5jYXB0dXJlSW1hZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuY2FwdHVyZUltYWdlKCkpXHJcbiAgICAgICAgdGhpcy5jYW1lcmEuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZG1ldGFkYXRhXCIsICgpID0+IHRoaXMub25DYW1lcmFMb2FkKCkpXHJcbiAgICAgICAgdGhpcy5nYWxsZXJ5QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBfID0+IHRoaXMuc2hvd0dhbGxlcnkucHVibGlzaCgpKVxyXG5cclxuICAgICAgICB0aGlzLmxpYnJhcnlVaS5jYW5jZWwuc3ViY3JpYmUoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmltYWdlQWNxdWlzaXRpb25EaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzaG93KCkge1xyXG4gICAgICAgIHRoaXMuaW1hZ2VBY3F1aXNpdGlvbkRpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5jYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHRcclxuICAgICAgICAvLyB0aGlzLmxvYWRGcm9tVXJsKFwiL2Nibi9hc3NldHMvbGFycnlLb29wYS5qcGdcIilcclxuICAgICAgICAvLyB0aGlzLmxvYWRGcm9tVXJsKFwiL2Nibi9hc3NldHMvb2x0c19mbG93ZXIuanBnXCIpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5pbWFnZUFjcXVpc2l0aW9uRGl2LmhpZGRlbiA9IHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uRHJhZ0VudGVyT3ZlcihldjogRHJhZ0V2ZW50KSB7XHJcbiAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkZpbGVDaGFuZ2UoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVJbnB1dC5maWxlcz8ubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZmlsZSA9IHRoaXMuZmlsZUlucHV0LmZpbGVzWzBdXHJcbiAgICAgICAgdGhpcy5wcm9jZXNzRmlsZShmaWxlKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25GaWxlRHJvcChldjogRHJhZ0V2ZW50KSB7XHJcbiAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpXHJcblxyXG4gICAgICAgIGlmICghZXY/LmRhdGFUcmFuc2Zlcj8uZmlsZXM/Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGZpbGUgPSBldi5kYXRhVHJhbnNmZXIuZmlsZXNbMF1cclxuICAgICAgICB0aGlzLnByb2Nlc3NGaWxlKGZpbGUpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyB1c2VDYW1lcmEoKSB7XHJcbiAgICAgICAgdGhpcy5hY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICBjb25zdCBkaWFsb2dXaWR0aCA9IHRoaXMuYWNxdWlyZUltYWdlRGl2LmNsaWVudFdpZHRoXHJcbiAgICAgICAgY29uc3QgZGlhbG9nSGVpZ2h0ID0gdGhpcy5hY3F1aXJlSW1hZ2VEaXYuY2xpZW50SGVpZ2h0XHJcbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xyXG4gICAgICAgICAgICB2aWRlbzogeyB3aWR0aDogeyBtYXg6IGRpYWxvZ1dpZHRoIH0sIGhlaWdodDogeyBtYXg6IGRpYWxvZ0hlaWdodCB9LCBmYWNpbmdNb2RlOiBcInVzZXJcIiB9LFxyXG4gICAgICAgICAgICBhdWRpbzogZmFsc2VcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLlVzZXJcclxuICAgICAgICB0aGlzLmNhbWVyYS5zcmNPYmplY3QgPSBzdHJlYW1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGZsaXBDYW1lcmEoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmNhbWVyYS5zcmNPYmplY3QpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzcmMgPSB0aGlzLmNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgICAgICBjb25zdCB0cmFja3MgPSBzcmMuZ2V0VHJhY2tzKClcclxuICAgICAgICBmb3IgKGNvbnN0IHRyYWNrIG9mIHRyYWNrcykge1xyXG4gICAgICAgICAgICB0cmFjay5zdG9wKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhTW9kZSA9IHRoaXMuY2FtZXJhTW9kZSA9PSBDYW1lcmFNb2RlLlVzZXIgPyBDYW1lcmFNb2RlLkVudmlyb25tZW50IDogQ2FtZXJhTW9kZS5Vc2VyXHJcbiAgICAgICAgY29uc3QgZmFjaW5nTW9kZSA9IHRoaXMuY2FtZXJhTW9kZSA9PSBDYW1lcmFNb2RlLlVzZXIgPyBcInVzZXJcIiA6IFwiZW52aXJvbm1lbnRcIlxyXG5cclxuICAgICAgICAvLyBnZXQgY3VycmVudCBmYWNpbmcgbW9kZVxyXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcclxuICAgICAgICAgICAgdmlkZW86IHsgd2lkdGg6IHRoaXMuY2FtZXJhLmNsaWVudFdpZHRoLCBoZWlnaHQ6IHRoaXMuY2FtZXJhLmNsaWVudEhlaWdodCwgZmFjaW5nTW9kZTogZmFjaW5nTW9kZSB9LFxyXG4gICAgICAgICAgICBhdWRpbzogZmFsc2VcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmNhbWVyYS5zcmNPYmplY3QgPSBzdHJlYW1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uQ2FtZXJhTG9hZCgpIHtcclxuICAgICAgICB0aGlzLmFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuY2FtZXJhLnBsYXkoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc3RvcENhbWVyYSgpIHtcclxuICAgICAgICBjb25zdCBzcmMgPSB0aGlzLmNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgICAgICBpZiAoIXNyYykge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRyYWNrcyA9IHNyYy5nZXRUcmFja3MoKVxyXG4gICAgICAgIGZvciAoY29uc3QgdHJhY2sgb2YgdHJhY2tzKSB7XHJcbiAgICAgICAgICAgIHRyYWNrLnN0b3AoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Ob25lXHJcbiAgICAgICAgdGhpcy5hY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FwdHVyZUltYWdlKCkge1xyXG4gICAgICAgIHRoaXMuY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuXHJcbiAgICAgICAgY29uc3Qgc3JjID0gdGhpcy5jYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICAgICAgaWYgKCFzcmMpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB0cmFjayA9IHNyYy5nZXRWaWRlb1RyYWNrcygpWzBdXHJcbiAgICAgICAgaWYgKCF0cmFjaykge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY3R4LmNhbnZhcy53aWR0aCA9IHRoaXMuY2FtZXJhLnZpZGVvV2lkdGhcclxuICAgICAgICB0aGlzLmN0eC5jYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW1lcmEudmlkZW9IZWlnaHRcclxuICAgICAgICB0aGlzLmN0eC5kcmF3SW1hZ2UodGhpcy5jYW1lcmEsIDAsIDApXHJcbiAgICAgICAgdGhpcy5pbWFnZUFjcXVpcmVkLnB1Ymxpc2godGhpcy5jYW52YXMpXHJcbiAgICAgICAgdGhpcy5zdG9wQ2FtZXJhKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHByb2Nlc3NGaWxlKGZpbGU6IEZpbGUpIHtcclxuICAgICAgICB0aGlzLmNsZWFyRXJyb3JNZXNzYWdlcygpXHJcbiAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKVxyXG4gICAgICAgIHRoaXMubG9hZEZyb21VcmwodXJsKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgbG9hZEZyb21VcmwodXJsOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLmNsZWFyRXJyb3JNZXNzYWdlcygpXHJcbiAgICAgICAgY29uc3QgaW1nID0gYXdhaXQgZG9tLmxvYWRJbWFnZSh1cmwpXHJcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSBpbWcud2lkdGhcclxuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSBpbWcuaGVpZ2h0XHJcbiAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKGltZywgMCwgMClcclxuICAgICAgICB0aGlzLmltYWdlQWNxdWlyZWQucHVibGlzaCh0aGlzLmNhbnZhcylcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNsZWFyRXJyb3JNZXNzYWdlcygpIHtcclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGhpcy5lcnJvcnNEaXYpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEltYWdlU2l6ZVVpIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGI6IElEQkRhdGFiYXNlXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlU2l6ZURpdiA9IGRvbS5ieUlkKFwiaW1hZ2VTaXplVWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbWF4RGltSW5wdXQgPSBkb20uYnlJZChcIm1heERpbVwiKSBhcyBIVE1MSW5wdXRFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1heENvbG9yc0lucHV0ID0gZG9tLmJ5SWQoXCJtYXhDb2xvcnNcIikgYXMgSFRNTElucHV0RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjcmVhdGVDb2xvckJ5TnVtYmVyQnV0dG9uID0gZG9tLmJ5SWQoXCJjcmVhdGVDb2xvckJ5TnVtYmVyXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJldHVybkJ1dHRvbiA9IGRvbS5ieUlkKFwiaW1hZ2VTaXplUmV0dXJuXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlU2NhbGVDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlU2NhbGVDdHggPSB0aGlzLmltYWdlU2NhbGVDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZVNpemVDYW52YXMgPSBkb20uYnlJZChcImltYWdlU2l6ZUNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZVNpemVDdHggPSB0aGlzLmltYWdlU2l6ZUNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIGltYWdlQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IGNyZWF0ZUNCTiA9IG5ldyBDaGFubmVsPFtudW1iZXJdPigpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgcmV0dXJuID0gbmV3IENoYW5uZWw8W10+KClcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihkYjogSURCRGF0YWJhc2UpIHtcclxuICAgICAgICB0aGlzLmRiID0gZGJcclxuICAgICAgICB0aGlzLmNyZWF0ZUNvbG9yQnlOdW1iZXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMub25DcmVhdGVDb2xvckJ5TnVtYmVyKCkpXHJcbiAgICAgICAgdGhpcy5yZXR1cm5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMub25SZXR1cm5DbGljaygpKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzaG93KGltYWdlQ2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuaW1hZ2VTaXplRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5pbWFnZUNhbnZhcyA9IGltYWdlQ2FudmFzXHJcbiAgICAgICAgdGhpcy5tYXhEaW1JbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHRoaXMub25NYXhEaW1DaGFuZ2UoKSlcclxuICAgICAgICB0aGlzLm1heENvbG9yc0lucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4gdGhpcy5vbk1heENvbG9yc0NoYW5nZSgpKVxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgaGlkZSgpIHtcclxuICAgICAgICB0aGlzLmltYWdlU2l6ZURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvbkNyZWF0ZUNvbG9yQnlOdW1iZXIoKSB7XHJcbiAgICAgICAgY29uc3QgYmxvYiA9IGF3YWl0IGltYWdpbmcuY2FudmFzMkJsb2IodGhpcy5pbWFnZVNjYWxlQ2FudmFzLCBpbWFnZU1pbWVUeXBlKVxyXG4gICAgICAgIGNvbnN0IGNibjogQ0JOUGljdHVyZSA9IHtcclxuICAgICAgICAgICAgaW1hZ2U6IGJsb2IsXHJcbiAgICAgICAgICAgIHNlcXVlbmNlOiBbXVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qga2V5ID0gYXdhaXQgcHV0Q0JOKHRoaXMuZGIsIGNibilcclxuICAgICAgICB0aGlzLmNyZWF0ZUNCTi5wdWJsaXNoKGtleSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmV0dXJuQ2xpY2soKSB7XHJcbiAgICAgICAgdGhpcy5yZXR1cm4ucHVibGlzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvbk1heERpbUNoYW5nZSgpIHtcclxuICAgICAgICBhd2FpdCBzaG93TG9hZGluZ0luZGljYXRvcigpXHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgIGhpZGVMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIG9uTWF4Q29sb3JzQ2hhbmdlKCkge1xyXG4gICAgICAgIGF3YWl0IHNob3dMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgaGlkZUxvYWRpbmdJbmRpY2F0b3IoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVkcmF3KCkge1xyXG4gICAgICAgIHRoaXMuaW1hZ2VTaXplQ2FudmFzLndpZHRoID0gdGhpcy5pbWFnZVNpemVDYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICB0aGlzLmltYWdlU2l6ZUNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlU2l6ZUNhbnZhcy5jbGllbnRIZWlnaHRcclxuXHJcbiAgICAgICAgY29uc3QgbWF4RGltID0gdGhpcy5nZXRNYXhEaW0oKVxyXG4gICAgICAgIGNvbnN0IG1heENvbG9ycyA9IHRoaXMuZ2V0TWF4Q29sb3JzKClcclxuICAgICAgICBjb25zdCBbdywgaF0gPSBmaXQodGhpcy5pbWFnZUNhbnZhcy53aWR0aCwgdGhpcy5pbWFnZUNhbnZhcy5oZWlnaHQsIG1heERpbSlcclxuXHJcbiAgICAgICAgdGhpcy5pbWFnZVNjYWxlQ2FudmFzLndpZHRoID0gd1xyXG4gICAgICAgIHRoaXMuaW1hZ2VTY2FsZUNhbnZhcy5oZWlnaHQgPSBoXHJcbiAgICAgICAgdGhpcy5pbWFnZVNjYWxlQ3R4LmRyYXdJbWFnZSh0aGlzLmltYWdlQ2FudmFzLCAwLCAwLCB3LCBoKVxyXG4gICAgICAgIGltYWdpbmcucXVhbnRNZWRpYW5DdXQodGhpcy5pbWFnZVNjYWxlQ3R4LCBtYXhDb2xvcnMsIGNvbG9yUmFuZ2VUb2xlcmFuY2UpXHJcbiAgICAgICAgY29uc3QgbWluU2NhbGUgPSBNYXRoLm1pbih0aGlzLmltYWdlU2l6ZUNhbnZhcy5jbGllbnRXaWR0aCAvIHcsIHRoaXMuaW1hZ2VTaXplQ2FudmFzLmNsaWVudEhlaWdodCAvIGgpXHJcbiAgICAgICAgY29uc3Qgc3cgPSB3ICogbWluU2NhbGVcclxuICAgICAgICBjb25zdCBzaCA9IGggKiBtaW5TY2FsZVxyXG4gICAgICAgIGNvbnN0IHggPSAodGhpcy5pbWFnZVNpemVDYW52YXMud2lkdGggLSBzdykgLyAyXHJcbiAgICAgICAgY29uc3QgeSA9ICh0aGlzLmltYWdlU2l6ZUNhbnZhcy5oZWlnaHQgLSBzaCkgLyAyXHJcbiAgICAgICAgdGhpcy5pbWFnZVNpemVDdHguZHJhd0ltYWdlKHRoaXMuaW1hZ2VTY2FsZUNhbnZhcywgeCwgeSwgc3csIHNoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0TWF4RGltKCk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IG1heERpbSA9IHBhcnNlSW50KHRoaXMubWF4RGltSW5wdXQudmFsdWUpXHJcbiAgICAgICAgaWYgKCFtYXhEaW0pIHtcclxuICAgICAgICAgICAgbWF4RGltID0gZGVmYXVsdE1heERpbVxyXG4gICAgICAgICAgICB0aGlzLm1heERpbUlucHV0LnZhbHVlID0gbWF4RGltLnRvU3RyaW5nKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtYXhEaW1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldE1heENvbG9ycygpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBtYXhDb2xvcnMgPSBwYXJzZUludCh0aGlzLm1heENvbG9yc0lucHV0LnZhbHVlKVxyXG4gICAgICAgIGlmICghbWF4Q29sb3JzKSB7XHJcbiAgICAgICAgICAgIG1heENvbG9ycyA9IGRlZmF1bHRNYXhDb2xvcnNcclxuICAgICAgICAgICAgdGhpcy5tYXhDb2xvcnNJbnB1dC52YWx1ZSA9IG1heENvbG9ycy50b1N0cmluZygpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbWF4Q29sb3JzXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIExpYnJhcnlVaSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxpYnJhcnlEaXYgPSBkb20uYnlJZChcImxpYnJhcnlVaVwiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZXR1cm5CdXR0b24gPSBkb20uYnlJZChcInJldHVybkZyb21MaWJyYXJ5QnV0dG9uXCIpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgaW1hZ2VDaG9zZW4gPSBuZXcgQ2hhbm5lbDxbc3RyaW5nXT4oKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IGNhbmNlbCA9IG5ldyBDaGFubmVsPFtdPigpXHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5yZXR1cm5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMub25SZXR1cm5DbGljaygpKVxyXG4gICAgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5saWJyYXJ5RGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJldHVybkNsaWNrKCkge1xyXG4gICAgICAgIHRoaXMubGlicmFyeURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgdGhpcy5jYW5jZWwucHVibGlzaCgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFBsYXlVaSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRiOiBJREJEYXRhYmFzZVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW52YXMgPSBkb20uYnlJZChcImNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVEaXYgPSBkb20uYnlJZChcInBhbGV0dGVcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFsZXR0ZUVudHJ5VGVtcGxhdGUgPSBkb20uYnlJZChcInBhbGV0dGVFbnRyeVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBsYXlVaURpdiA9IGRvbS5ieUlkKFwicGxheVVpXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJldHVybkJ1dHRvbiA9IGRvbS5ieUlkKFwicmV0dXJuQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZUN0eCA9IHRoaXMuaW1hZ2VDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjZWxsQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjZWxsQ3R4ID0gdGhpcy5jZWxsQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFsZXR0ZUNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFsZXR0ZUN0eCA9IHRoaXMucGFsZXR0ZUNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbG9yQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb2xvckN0eCA9IHRoaXMuY29sb3JDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSBrZXk6IG51bWJlciA9IDBcclxuICAgIHByaXZhdGUgY29tcGxldGUgPSBmYWxzZVxyXG4gICAgcHVibGljIHJlYWRvbmx5IHJldHVybiA9IG5ldyBDaGFubmVsPFt2b2lkXT4oKVxyXG4gICAgcHJpdmF0ZSBpbWFnZVdpZHRoID0gMFxyXG4gICAgcHJpdmF0ZSBpbWFnZUhlaWdodCA9IDBcclxuICAgIHByaXZhdGUgY2VudGVyWCA9IDBcclxuICAgIHByaXZhdGUgY2VudGVyWSA9IDBcclxuICAgIHByaXZhdGUgem9vbSA9IDFcclxuICAgIHByaXZhdGUgZHJhZyA9IGZhbHNlXHJcbiAgICBwcml2YXRlIGNvbG9yRHJhZyA9IGZhbHNlXHJcbiAgICBwcml2YXRlIHRvdWNoWm9vbTogbnVtYmVyID0gMFxyXG4gICAgcHJpdmF0ZSB0b3VjaDFTdGFydDogZ2VvLlZlYzIgfCBudWxsID0gbnVsbFxyXG4gICAgcHJpdmF0ZSB0b3VjaDJTdGFydDogZ2VvLlZlYzIgfCBudWxsID0gbnVsbFxyXG4gICAgcHJpdmF0ZSB0b3VjaDFDdXI6IGdlby5WZWMyIHwgbnVsbCA9IG51bGxcclxuICAgIHByaXZhdGUgdG91Y2gyQ3VyOiBnZW8uVmVjMiB8IG51bGwgPSBudWxsXHJcbiAgICBwcml2YXRlIGRyYWdMYXN0ID0gbmV3IGdlby5WZWMyKDAsIDApXHJcblxyXG4gICAgLy8gbGlzdCBvZiBjb2xvcnMgdXNlIHVzZWQgaW4gaW1hZ2VcclxuICAgIHByaXZhdGUgcGFsZXR0ZTogbnVtYmVyW10gPSBbXVxyXG5cclxuICAgIC8vIGltYWdlIG92ZXJsYXkgb2YgcGl4ZWwgdG8gcGFsZXR0ZSBpbmRleFxyXG4gICAgcHJpdmF0ZSBwYWxldHRlT3ZlcmxheTogbnVtYmVyW10gPSBbXVxyXG5cclxuICAgIC8vIHBhbGV0dGUgb3ZlcmxheSBvZiBwYWxldHRlIGluZGV4IHRvIGxpc3Qgb2YgcGl4ZWxzIGhhdmluZyB0aGF0IGNvbG9yXHJcbiAgICBwcml2YXRlIHBpeGVsT3ZlcmxheTogU2V0PG51bWJlcj5bXSA9IFtdXHJcblxyXG4gICAgcHJpdmF0ZSBzZWxlY3RlZFBhbGV0dGVJbmRleDogbnVtYmVyID0gLTFcclxuICAgIHByaXZhdGUgc2VxdWVuY2U6IG51bWJlcltdID0gW11cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihkYjogSURCRGF0YWJhc2UpIHtcclxuICAgICAgICB0aGlzLmRiID0gZGJcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmN0eCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW52YXMgZWxlbWVudCBub3Qgc3VwcG9ydGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmRvd25cIiwgZSA9PiB0aGlzLm9uUG9pbnRlckRvd24oZSkpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJtb3ZlXCIsIGUgPT4gdGhpcy5vblBvaW50ZXJNb3ZlKGUpKVxyXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVydXBcIiwgZSA9PiB0aGlzLm9uUG9pbnRlclVwKGUpKVxyXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCBlID0+IHRoaXMub25XaGVlbChlKSlcclxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBlID0+IHRoaXMub25SZXNpemUoZSkpXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKHRoaXMucGxheVVpRGl2LCBcImNsaWNrXCIsIFwiLnBhbGV0dGUtZW50cnlcIiwgKGUpID0+IHRoaXMub25QYWxldHRlRW50cnlDbGljayhlIGFzIE1vdXNlRXZlbnQpKVxyXG4gICAgICAgIHRoaXMucmV0dXJuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uUmV0dXJuKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIHNob3coa2V5OiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLmtleSA9IGtleVxyXG4gICAgICAgIHRoaXMucGxheVVpRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLmNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgICAgIHRoaXMuY29tcGxldGUgPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuem9vbSA9IDFcclxuICAgICAgICB0aGlzLmRyYWcgPSBmYWxzZVxyXG4gICAgICAgIHRoaXMudG91Y2hab29tID0gMFxyXG5cclxuICAgICAgICBjb25zdCBwaWMgPSBhd2FpdCBnZXRDQk4odGhpcy5kYiwga2V5KVxyXG4gICAgICAgIGNvbnN0IGltZyA9IGF3YWl0IGRvbS5sb2FkSW1hZ2UoVVJMLmNyZWF0ZU9iamVjdFVSTChwaWMuaW1hZ2UpKVxyXG4gICAgICAgIHRoaXMuaW1hZ2VXaWR0aCA9IGltZy53aWR0aFxyXG4gICAgICAgIHRoaXMuaW1hZ2VIZWlnaHQgPSBpbWcuaGVpZ2h0XHJcblxyXG4gICAgICAgIC8vIGNhcHR1cmUgaW1hZ2VcclxuICAgICAgICB0aGlzLmltYWdlQ2FudmFzLndpZHRoID0gdGhpcy5pbWFnZVdpZHRoXHJcbiAgICAgICAgdGhpcy5pbWFnZUNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlSGVpZ2h0XHJcbiAgICAgICAgdGhpcy5pbWFnZUN0eC5kcmF3SW1hZ2UoaW1nLCAwLCAwLCB0aGlzLmltYWdlQ2FudmFzLndpZHRoLCB0aGlzLmltYWdlQ2FudmFzLmhlaWdodClcclxuXHJcbiAgICAgICAgLy8gZGVidWcgLSBzaG93IHBhc3NlZCBpbWFnZVxyXG4gICAgICAgIC8vIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5pbWFnZVdpZHRoXHJcbiAgICAgICAgLy8gdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZUhlaWdodFxyXG4gICAgICAgIC8vIHRoaXMuY3R4LmRyYXdJbWFnZSh0aGlzLmltYWdlQ2FudmFzLCAwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KVxyXG4gICAgICAgIC8vIHJldHVyblxyXG5cclxuICAgICAgICBjb25zdCBpbWdEYXRhID0gdGhpcy5pbWFnZUN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0KVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZSA9IGV4dHJhY3RQYWxldHRlKGltZ0RhdGEpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlT3ZlcmxheSA9IGNyZWF0ZVBhbGV0dGVPdmVybGF5KGltZ0RhdGEsIHRoaXMucGFsZXR0ZSlcclxuICAgICAgICB0aGlzLnBpeGVsT3ZlcmxheSA9IGNyZWF0ZVBpeGVsT3ZlcmxheSh0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQsIHRoaXMucGFsZXR0ZSwgdGhpcy5wYWxldHRlT3ZlcmxheSlcclxuICAgICAgICB0aGlzLnBhbGV0dGUgPSBwcnVuZVBhbGxldGUodGhpcy5wYWxldHRlLCB0aGlzLnBpeGVsT3ZlcmxheSwgbWF4QmFja2dyb3VuZFBpeGVscywgdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0LCB0aGlzLmNvbG9yQ3R4KVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZU92ZXJsYXkgPSBjcmVhdGVQYWxldHRlT3ZlcmxheShpbWdEYXRhLCB0aGlzLnBhbGV0dGUpXHJcbiAgICAgICAgdGhpcy5waXhlbE92ZXJsYXkgPSBjcmVhdGVQaXhlbE92ZXJsYXkodGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0LCB0aGlzLnBhbGV0dGUsIHRoaXMucGFsZXR0ZU92ZXJsYXkpXHJcbiAgICAgICAgdGhpcy5jcmVhdGVQYWxldHRlVWkoKVxyXG4gICAgICAgIGRyYXdDZWxsSW1hZ2UodGhpcy5jZWxsQ3R4LCB0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQsIHRoaXMucGFsZXR0ZU92ZXJsYXkpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlQ2FudmFzLndpZHRoID0gdGhpcy5jZWxsQ2FudmFzLndpZHRoXHJcbiAgICAgICAgdGhpcy5wYWxldHRlQ2FudmFzLmhlaWdodCA9IHRoaXMuY2VsbENhbnZhcy5oZWlnaHRcclxuICAgICAgICB0aGlzLmNlbnRlclggPSB0aGlzLmNhbnZhcy53aWR0aCAvIDJcclxuICAgICAgICB0aGlzLmNlbnRlclkgPSB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyXHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG5cclxuICAgICAgICBpZiAodGhpcy5wYWxldHRlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0UGFsZXR0ZUVudHJ5KDApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNlcXVlbmNlID0gcGljLnNlcXVlbmNlXHJcbiAgICAgICAgZm9yIChjb25zdCB4eSBvZiB0aGlzLnNlcXVlbmNlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhbGV0dGVJZHggPSB0aGlzLnBhbGV0dGVPdmVybGF5W3h5XVxyXG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSBpbWFnaW5nLnVuZmxhdCh4eSwgdGhpcy5pbWFnZVdpZHRoKVxyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeShwYWxldHRlSWR4KVxyXG4gICAgICAgICAgICB0aGlzLnRyeUZpbGxDZWxsKHgsIHkpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBkZWJ1ZyAtIGZpbGwgYWxsIHBpeGVscyBidXQgZmlyc3QgdW5maWxsZWRcclxuICAgICAgICAvLyB7XHJcbiAgICAgICAgLy8gICAgIGxldCBza2lwcGVkMSA9IGZhbHNlXHJcbiAgICAgICAgLy8gICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5pbWFnZUhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgLy8gICAgICAgICBsZXQgeU9mZnNldCA9IHkgKiB0aGlzLmltYWdlV2lkdGhcclxuICAgICAgICAvLyAgICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5pbWFnZVdpZHRoOyArK3gpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICBjb25zdCBwYWxldHRlSWR4ID0gdGhpcy5wYWxldHRlT3ZlcmxheVtmbGF0KHgsIHksIHRoaXMuaW1hZ2VXaWR0aCldXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgaWYgKHBhbGV0dGVJZHggPT09IC0xKSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAgICAgICAgICAgICBsZXQgeE9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgaWYgKCFza2lwcGVkMSAmJiB0aGlzLnBhbGV0dGVPdmVybGF5W3hPZmZzZXRdICE9PSAtMSkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICBza2lwcGVkMSA9IHRydWVcclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAvLyAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vICAgICAgICAgICAgIHRoaXMuc2VsZWN0UGFsZXR0ZUVudHJ5KHBhbGV0dGVJZHgpXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgdGhpcy50cnlGaWxsQ2VsbCh4LCB5KVxyXG5cclxuICAgICAgICAvLyAgICAgICAgIH1cclxuICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgLy8gLy8gZGVidWcgLSBnbyBzdHJhaWdodCB0byBlbmQgc3RhdGVcclxuICAgICAgICAvLyBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaW1hZ2VIZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIC8vICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuaW1hZ2VXaWR0aDsgKyt4KSB7XHJcbiAgICAgICAgLy8gICAgICAgICB0aGlzLnNlcXVlbmNlLnB1c2goZmxhdCh4LCB5LCB0aGlzLmltYWdlV2lkdGgpKVxyXG4gICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAvLyByYW5kLnNodWZmbGUodGhpcy5zZXF1ZW5jZSlcclxuICAgICAgICAvLyB0aGlzLmV4ZWNEb25lU2VxdWVuY2UoKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBoaWRlKCkge1xyXG4gICAgICAgIHRoaXMucGxheVVpRGl2LmhpZGRlbiA9IHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmV0dXJuKCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMucmV0dXJuLnB1Ymxpc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25SZXNpemUoXzogVUlFdmVudCkge1xyXG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5jYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHRcclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjcmVhdGVQYWxldHRlVWkoKSB7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRoaXMucGFsZXR0ZURpdilcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMucGFsZXR0ZS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBbciwgZywgYl0gPSBjb2xvci51bnBhY2sodGhpcy5wYWxldHRlW2ldKVxyXG4gICAgICAgICAgICBjb25zdCBsdW0gPSBjYWxjTHVtaW5hbmNlKHIsIGcsIGIpXHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy5wYWxldHRlRW50cnlUZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IGVudHJ5RGl2ID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLnBhbGV0dGUtZW50cnlcIikgYXMgSFRNTEVsZW1lbnRcclxuICAgICAgICAgICAgZW50cnlEaXYudGV4dENvbnRlbnQgPSBgJHtpICsgMX1gXHJcbiAgICAgICAgICAgIGVudHJ5RGl2LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGNvbG9yMlJHQkFTdHlsZShyLCBnLCBiKVxyXG4gICAgICAgICAgICBlbnRyeURpdi5zdHlsZS5jb2xvciA9IGx1bSA8IC41ID8gXCJ3aGl0ZVwiIDogXCJibGFja1wiXHJcbiAgICAgICAgICAgIHRoaXMucGFsZXR0ZURpdi5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblBvaW50ZXJEb3duKGU6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFlLmlzUHJpbWFyeSkge1xyXG4gICAgICAgICAgICB0aGlzLnRvdWNoMlN0YXJ0ID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgICAgICB0aGlzLnRvdWNoWm9vbSA9IHRoaXMuem9vbVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFyZSB3ZSBvdmVydG9wIG9mIGEgc2VsZWN0ZWQgcGFsZXR0ZSBlbnRyeSBwaXhlbD9cclxuICAgICAgICB0aGlzLmNhbnZhcy5zZXRQb2ludGVyQ2FwdHVyZShlLnBvaW50ZXJJZClcclxuICAgICAgICB0aGlzLmRyYWcgPSB0cnVlXHJcbiAgICAgICAgdGhpcy5kcmFnTGFzdCA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICB0aGlzLnRvdWNoMVN0YXJ0ID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIHRoaXMudG91Y2hab29tID0gdGhpcy56b29tXHJcblxyXG4gICAgICAgIC8vIHRyYW5zZm9ybSBjbGljayBjb29yZGluYXRlcyB0byBjYW52YXMgY29vcmRpbmF0ZXNcclxuICAgICAgICBjb25zdCBbeCwgeV0gPSB0aGlzLmNhbnZhczJDZWxsKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIGlmICh0aGlzLnRyeUZpbGxDZWxsKHgsIHkpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sb3JEcmFnID0gdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNvbnZlcnQgYSBjYW52YXMgY29vcmRpbmF0ZSBpbnRvIGEgY2VsbCBjb29yZGluYXRlXHJcbiAgICAgKiBAcGFyYW0geCB4IGNhbnZhcyBjb29yZGluYXRlXHJcbiAgICAgKiBAcGFyYW0geSB5IGNhbnZhcyBjb29yZGluYXRlXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY2FudmFzMkNlbGwoeDogbnVtYmVyLCB5OiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgICAgICBjb25zdCBpbnZUcmFuc2Zvcm0gPSB0aGlzLmN0eC5nZXRUcmFuc2Zvcm0oKS5pbnZlcnNlKClcclxuICAgICAgICBjb25zdCBkb21QdCA9IGludlRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh7IHg6IHgsIHk6IHkgfSlcclxuICAgICAgICByZXR1cm4gY2VsbDJJbWFnZShkb21QdC54LCBkb21QdC55KVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Qb2ludGVyVXAoZTogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCFlLmlzUHJpbWFyeSkge1xyXG4gICAgICAgICAgICB0aGlzLnRvdWNoMlN0YXJ0ID0gbnVsbFxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy50b3VjaDFTdGFydCA9IG51bGxcclxuICAgICAgICB0aGlzLmRyYWcgPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuY29sb3JEcmFnID0gZmFsc2VcclxuICAgICAgICB0aGlzLnRvdWNoWm9vbSA9IHRoaXMuem9vbVxyXG4gICAgICAgIHRoaXMuc2F2ZVN0YXRlKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNhdmVTdGF0ZSgpIHtcclxuICAgICAgICBjb25zdCBibG9iID0gYXdhaXQgaW1hZ2luZy5jYW52YXMyQmxvYih0aGlzLmltYWdlQ2FudmFzLCBpbWFnZU1pbWVUeXBlKVxyXG4gICAgICAgIGF3YWl0IHB1dENCTih0aGlzLmRiLCB7IGltYWdlOiBibG9iLCBzZXF1ZW5jZTogdGhpcy5zZXF1ZW5jZSB9LCB0aGlzLmtleSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUG9pbnRlck1vdmUoZTogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZS5pc1ByaW1hcnkpIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDFDdXIgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDJDdXIgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoYW5kbGUgcGluY2ggem9vbVxyXG4gICAgICAgIGlmICh0aGlzLnRvdWNoMlN0YXJ0ICYmIHRoaXMudG91Y2gxU3RhcnQpIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDFDdXIgPSB0aGlzLnRvdWNoMUN1ciA/PyB0aGlzLnRvdWNoMVN0YXJ0XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gyQ3VyID0gdGhpcy50b3VjaDJDdXIgPz8gdGhpcy50b3VjaDJTdGFydFxyXG4gICAgICAgICAgICBjb25zdCBkMCA9IHRoaXMudG91Y2gxU3RhcnQuc3ViKHRoaXMudG91Y2gyU3RhcnQpLmxlbmd0aCgpXHJcbiAgICAgICAgICAgIGNvbnN0IGQxID0gdGhpcy50b3VjaDFDdXIuc3ViKHRoaXMudG91Y2gyQ3VyKS5sZW5ndGgoKVxyXG4gICAgICAgICAgICB0aGlzLnpvb20gPSB0aGlzLnRvdWNoWm9vbSAqIGQxIC8gZDBcclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5kcmFnKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdHJhbnNmb3JtID0gdGhpcy5jdHguZ2V0VHJhbnNmb3JtKCkuaW52ZXJzZSgpXHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBnZW8uVmVjMi5mcm9tRE9NKHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh0aGlzLmRyYWdMYXN0KSlcclxuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICBjb25zdCBlbmQgPSBnZW8uVmVjMi5mcm9tRE9NKHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChwb3NpdGlvbikpXHJcbiAgICAgICAgY29uc3QgZGVsdGEgPSBlbmQuc3ViKHN0YXJ0KVxyXG5cclxuICAgICAgICAvLyBjaGVjayBmb3IgZHJhZyBvdmVyIHBhbGV0dGUgY29sb3JcclxuICAgICAgICBjb25zdCBbeCwgeV0gPSB0aGlzLmNhbnZhczJDZWxsKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIGlmICh0aGlzLmNvbG9yRHJhZyAmJiB0aGlzLnBhbGV0dGVPdmVybGF5W2ltYWdpbmcuZmxhdCh4LCB5LCB0aGlzLmltYWdlV2lkdGgpXSA9PT0gdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy50cnlGaWxsQ2VsbCh4LCB5KSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChNYXRoLmFicyhkZWx0YS54KSA+IDMgfHwgTWF0aC5hYnMoZGVsdGEueSkgPiAzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2VudGVyWCAtPSBkZWx0YS54XHJcbiAgICAgICAgICAgIHRoaXMuY2VudGVyWSAtPSBkZWx0YS55XHJcbiAgICAgICAgICAgIHRoaXMuZHJhZ0xhc3QgPSBwb3NpdGlvblxyXG4gICAgICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25XaGVlbChlOiBXaGVlbEV2ZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZS5kZWx0YVkgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuem9vbSAqPSAuNVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUuZGVsdGFZIDwgMCkge1xyXG4gICAgICAgICAgICB0aGlzLnpvb20gKj0gMlxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25QYWxldHRlRW50cnlDbGljayhlOiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlbnRyeSA9IGUudGFyZ2V0IGFzIEVsZW1lbnRcclxuICAgICAgICBsZXQgaWR4ID0gZG9tLmdldEVsZW1lbnRJbmRleChlbnRyeSlcclxuXHJcbiAgICAgICAgaWYgKGlkeCA9PT0gdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleCkge1xyXG4gICAgICAgICAgICBpZHggPSAtMVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZWxlY3RQYWxldHRlRW50cnkoaWR4KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogdHJ1ZSBpZiBzcGVjaWZpZWQgY2VsbCBpcyB1bmZpbGxlZCwgYW5kIGhhcyBzcGVjaWZpZWQgcGFsZXR0ZSBpbmRleFxyXG4gICAgICogQHBhcmFtIHggeCBjZWxsIGNvb3JkaW5hdGVcclxuICAgICAqIEBwYXJhbSB5IHkgY2VsbCBjb29yZGluYXRlXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY2hlY2tDZWxsKHg6IG51bWJlciwgeTogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgLy8gaWYgYWxyZWFkeSBmaWxsZWQsIGRvIG5vdGhpbmdcclxuICAgICAgICBjb25zdCBmbGF0WFkgPSBpbWFnaW5nLmZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKVxyXG4gICAgICAgIGNvbnN0IHBpeGVscyA9IHRoaXMucGl4ZWxPdmVybGF5W3RoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXhdXHJcbiAgICAgICAgcmV0dXJuIHBpeGVscy5oYXMoZmxhdFhZKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogYXR0ZW1wdCB0byBmaWxsIHRoZSBzcGVjaWZpZWQgY2VsbFxyXG4gICAgICogcmV0dXJucyB0cnVlIGlmIGZpbGxlZCwgZmFsc2UgaWYgY2VsbCBpcyBub3Qgc2VsZWN0ZWQgcGFsZXR0ZSBvciBhbHJlYWR5IGZpbGxlZFxyXG4gICAgICogQHBhcmFtIHggXHJcbiAgICAgKiBAcGFyYW0geSBcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSB0cnlGaWxsQ2VsbCh4OiBudW1iZXIsIHk6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgIC8vIGlmIGFscmVhZHkgZmlsbGVkLCBkbyBub3RoaW5nXHJcbiAgICAgICAgaWYgKCF0aGlzLmNoZWNrQ2VsbCh4LCB5KSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IFtyLCBnLCBiXSA9IGNvbG9yLnVucGFjayh0aGlzLnBhbGV0dGVbdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleF0pXHJcbiAgICAgICAgY29uc3QgW2N4LCBjeV0gPSBpbWFnZTJDZWxsKHgsIHkpXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5maWxsU3R5bGUgPSBjb2xvcjJSR0JBU3R5bGUociwgZywgYilcclxuICAgICAgICB0aGlzLmNvbG9yQ3R4LmZpbGxSZWN0KGN4LCBjeSwgY2VsbFNpemUsIGNlbGxTaXplKVxyXG5cclxuICAgICAgICAvLyByZW1vdmUgdGhlIHBpeGVsIGZyb20gb3ZlcmxheVxyXG4gICAgICAgIGNvbnN0IHBpeGVscyA9IHRoaXMucGl4ZWxPdmVybGF5W3RoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXhdXHJcbiAgICAgICAgY29uc3QgZmxhdFhZID0gaW1hZ2luZy5mbGF0KHgsIHksIHRoaXMuaW1hZ2VXaWR0aClcclxuICAgICAgICBwaXhlbHMuZGVsZXRlKGZsYXRYWSlcclxuICAgICAgICB0aGlzLnNlcXVlbmNlLnB1c2goZmxhdFhZKVxyXG5cclxuICAgICAgICBpZiAocGl4ZWxzLnNpemUgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIG1hcmsgcGFsZXR0ZSBlbnRyeSBhcyBkb25lXHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnBhbGV0dGUtZW50cnlcIilbdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleF1cclxuICAgICAgICBlbnRyeS5pbm5lckhUTUwgPSBcIiZjaGVjaztcIlxyXG4gICAgICAgIGNvbnN0IG5leHRQYWxldHRlSWR4ID0gdGhpcy5maW5kTmV4dFVuZmluaXNoZWRFbnRyeSh0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4KVxyXG4gICAgICAgIHRoaXMuc2VsZWN0UGFsZXR0ZUVudHJ5KG5leHRQYWxldHRlSWR4KVxyXG5cclxuICAgICAgICBpZiAobmV4dFBhbGV0dGVJZHggIT09IC0xKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhbGwgY29sb3JzIGNvbXBsZXRlISBzaG93IGFuaW1hdGlvbiBvZiB1c2VyIGNvbG9yaW5nIG9yaWdpbmFsIGltYWdlXHJcbiAgICAgICAgdGhpcy5leGVjRG9uZVNlcXVlbmNlKClcclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2VsZWN0UGFsZXR0ZUVudHJ5KGlkeDogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleCA9IGlkeFxyXG5cclxuICAgICAgICBjb25zdCBlbnRyaWVzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnBhbGV0dGUtZW50cnlcIikpXHJcbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgICAgIGVudHJ5LmNsYXNzTGlzdC5yZW1vdmUoXCJzZWxlY3RlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGlkeCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgZW50cmllc1tpZHhdLmNsYXNzTGlzdC5hZGQoXCJzZWxlY3RlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY2xlYXIgcGFsZXR0ZSBjYW52YXNcclxuICAgICAgICBjb25zdCBjdHggPSB0aGlzLnBhbGV0dGVDdHhcclxuICAgICAgICBjb25zdCBjYW52YXMgPSB0aGlzLnBhbGV0dGVDYW52YXNcclxuICAgICAgICBjdHguY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodClcclxuXHJcbiAgICAgICAgaWYgKGlkeCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhpZ2hsaWdodCByZW1haW5pbmcgcGl4ZWxzIGZvciB0aGlzIGNvbG9yXHJcbiAgICAgICAgY29uc3QgZm9udCA9IGN0eC5mb250XHJcbiAgICAgICAgY3R4LmZvbnQgPSBcImJvbGQgMTZweCBhcmlhbFwiXHJcbiAgICAgICAgY29uc3QgdGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGhcclxuICAgICAgICBjb25zdCBjZHh5ID0gY2VsbFNpemUgLyAyXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgcGl4ZWwgb2YgdGhpcy5waXhlbE92ZXJsYXlbaWR4XSkge1xyXG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSBpbWFnZTJDZWxsKC4uLmltYWdpbmcudW5mbGF0KHBpeGVsLCB0aGlzLmltYWdlV2lkdGgpKVxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gY29sb3IyUkdCQVN0eWxlKDE5MSwgMTkxLCAxOTEsIDI1NSlcclxuICAgICAgICAgICAgY3R4LmZpbGxSZWN0KHgsIHksIGNlbGxTaXplLCBjZWxsU2l6ZSlcclxuXHJcbiAgICAgICAgICAgIC8vIGRyYXcgbGFiZWxcclxuICAgICAgICAgICAgY29uc3QgbGFiZWwgPSBgJHtpZHggKyAxfWBcclxuICAgICAgICAgICAgY29uc3QgbWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dChsYWJlbClcclxuICAgICAgICAgICAgY29uc3QgY3ggPSB4ICsgY2R4eSAtIG1ldHJpY3Mud2lkdGggLyAyXHJcbiAgICAgICAgICAgIGNvbnN0IGN5ID0geSArIGNkeHkgKyB0ZXh0SGVpZ2h0IC8gMlxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiXHJcbiAgICAgICAgICAgIGN0eC5maWxsVGV4dChsYWJlbCwgY3gsIGN5KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY3R4LmZvbnQgPSBmb250XHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVkcmF3KCkge1xyXG4gICAgICAgIC8vIG5vdGUgLSBjbGVhciBpcyBzdWJqZWN0IHRvIHRyYW5zZm9ybVxyXG4gICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuY3R4XHJcbiAgICAgICAgdGhpcy5jdHgucmVzZXRUcmFuc2Zvcm0oKVxyXG4gICAgICAgIGNvbnN0IGh3ID0gdGhpcy5jYW52YXMud2lkdGggLyAyIC8gdGhpcy56b29tXHJcbiAgICAgICAgY29uc3QgaGggPSB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyIC8gdGhpcy56b29tXHJcblxyXG4gICAgICAgIHRoaXMuY2VudGVyWCA9IG1hdGguY2xhbXAodGhpcy5jZW50ZXJYLCAwLCB0aGlzLmNlbGxDYW52YXMud2lkdGgpXHJcbiAgICAgICAgdGhpcy5jZW50ZXJZID0gbWF0aC5jbGFtcCh0aGlzLmNlbnRlclksIDAsIHRoaXMuY2VsbENhbnZhcy5oZWlnaHQpXHJcbiAgICAgICAgdGhpcy5jdHguc2NhbGUodGhpcy56b29tLCB0aGlzLnpvb20pXHJcbiAgICAgICAgdGhpcy5jdHgudHJhbnNsYXRlKC10aGlzLmNlbnRlclggKyBodywgLXRoaXMuY2VudGVyWSArIGhoKVxyXG5cclxuICAgICAgICB2YXIgaW52VHJhbnNmb3JtID0gY3R4LmdldFRyYW5zZm9ybSgpLmludmVyc2UoKVxyXG4gICAgICAgIGNvbnN0IHRsID0gaW52VHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHsgeDogMCwgeTogMCB9KVxyXG4gICAgICAgIGNvbnN0IGJyID0gaW52VHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHsgeDogdGhpcy5jYW52YXMud2lkdGgsIHk6IHRoaXMuY2FudmFzLmhlaWdodCB9KVxyXG4gICAgICAgIGN0eC5jbGVhclJlY3QodGwueCwgdGwueSwgYnIueCAtIHRsLngsIGJyLnkgLSB0bC55KVxyXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5jZWxsQ2FudmFzLCAwLCAwKVxyXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5wYWxldHRlQ2FudmFzLCAwLCAwKVxyXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5jb2xvckNhbnZhcywgMCwgMClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZpbmROZXh0VW5maW5pc2hlZEVudHJ5KGk6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHRoaXMucGFsZXR0ZS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBpaSA9IGkgJSB0aGlzLnBhbGV0dGUubGVuZ3RoXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBpeGVsT3ZlcmxheVtpXS5zaXplID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGlpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAtMVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZXhlY0RvbmVTZXF1ZW5jZSgpIHtcclxuICAgICAgICAvLyBzZXQgYXMgZG9uZVxyXG4gICAgICAgIHRoaXMuY29tcGxldGUgPSB0cnVlXHJcblxyXG4gICAgICAgIHRoaXMuY3R4LnJlc2V0VHJhbnNmb3JtKClcclxuXHJcbiAgICAgICAgLy8gZHJhdyBvbmUgcGl4ZWwgYXQgYSB0aW1lIHRvIGNvbG9yIGNhbnZhc1xyXG4gICAgICAgIC8vIG92cmxheSBvbnRvIGNhbnZhc1xyXG4gICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLmltYWdlQ3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQpLmRhdGFcclxuICAgICAgICB0aGlzLmN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodClcclxuICAgICAgICBjb25zdCB6b29tID0gTWF0aC5taW4odGhpcy5jYW52YXMuY2xpZW50V2lkdGggLyB0aGlzLmltYWdlV2lkdGgsIHRoaXMuY2FudmFzLmNsaWVudEhlaWdodCAvIHRoaXMuaW1hZ2VIZWlnaHQpXHJcbiAgICAgICAgdGhpcy5jdHguc2NhbGUoem9vbSwgem9vbSlcclxuXHJcbiAgICAgICAgLy8gY29sb3IgYXMgdXNlciBkaWRcclxuICAgICAgICBjb25zdCBwaXhlbCA9IG5ldyBJbWFnZURhdGEoMSwgMSlcclxuICAgICAgICBjb25zdCBwaXhlbERhdGEgPSBwaXhlbC5kYXRhXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5jYW52YXMud2lkdGggPSB0aGlzLmltYWdlV2lkdGhcclxuICAgICAgICB0aGlzLmNvbG9yQ3R4LmNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlSGVpZ2h0XHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jb2xvckNhbnZhcy53aWR0aCwgdGhpcy5jb2xvckNhbnZhcy5oZWlnaHQpXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zZXF1ZW5jZS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCB4eSA9IHRoaXMuc2VxdWVuY2VbaV1cclxuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gaW1hZ2luZy51bmZsYXQoeHksIHRoaXMuaW1hZ2VXaWR0aClcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geHkgKiA0XHJcbiAgICAgICAgICAgIHBpeGVsRGF0YVswXSA9IGRhdGFbb2Zmc2V0XVxyXG4gICAgICAgICAgICBwaXhlbERhdGFbMV0gPSBkYXRhW29mZnNldCArIDFdXHJcbiAgICAgICAgICAgIHBpeGVsRGF0YVsyXSA9IGRhdGFbb2Zmc2V0ICsgMl1cclxuICAgICAgICAgICAgcGl4ZWxEYXRhWzNdID0gMjU1XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbG9yQ3R4LnB1dEltYWdlRGF0YShwaXhlbCwgeCwgeSlcclxuICAgICAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKHRoaXMuY29sb3JDYW52YXMsIDAsIDApXHJcbiAgICAgICAgICAgIGlmIChpICUgNjQgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdXRpbC53YWl0KDApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEdhbGxlcnlVaSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRiOiBJREJEYXRhYmFzZVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB1aSA9IGRvbS5ieUlkKFwiZ2FsbGVyeVVpXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNibnNEaXYgPSBkb20uYnlJZChcImNibnNcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZ2FsbGVyeUFjcXVpcmVJbWFnZUJ1dHRvbiA9IGRvbS5ieUlkKFwiZ2FsbGVyeUFjcXVpcmVJbWFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZSA9IGRvbS5ieUlkKFwiZ2FsbGVyeUVudHJ5XCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHB1YmxpYyByZWFkb25seSBzaG93QWNxdWlyZUltYWdlID0gbmV3IENoYW5uZWw8W3ZvaWRdPigpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgY2JuU2VsZWN0ZWQgPSBuZXcgQ2hhbm5lbDxbbnVtYmVyXT4oKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKGRiOiBJREJEYXRhYmFzZSkge1xyXG4gICAgICAgIHRoaXMuZGIgPSBkYlxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyBzaG93KCkge1xyXG4gICAgICAgIHRoaXMudWkuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy51aSwgXCJjbGlja1wiLCBcIi5nYWxsZXJ5LWVudHJ5XCIsIChldnQpID0+IHRoaXMub25FbnRyeUNsaWNrKGV2dCkpXHJcbiAgICAgICAgdGhpcy5nYWxsZXJ5QWNxdWlyZUltYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnNob3dBY3F1aXJlSW1hZ2UucHVibGlzaCgpKVxyXG5cclxuICAgICAgICAvLyBjbGVhciBjdXJyZW50IHVpXHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRoaXMuY2Juc0RpdilcclxuXHJcbiAgICAgICAgY29uc3Qga3ZzID0gYXdhaXQgZ2V0QWxsQ0JOcyh0aGlzLmRiKVxyXG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgY2JuXSBvZiBrdnMpIHtcclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0aGlzLnRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgZW50cnlEaXYgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuZ2FsbGVyeS1lbnRyeVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCBpbWFnZURpdiA9IGRvbS5ieVNlbGVjdG9yKGVudHJ5RGl2LCBcIi5nYWxsZXJ5LWltYWdlXCIpIGFzIEhUTUxJbWFnZUVsZW1lbnRcclxuICAgICAgICAgICAgaW1hZ2VEaXYuc3JjID0gVVJMLmNyZWF0ZU9iamVjdFVSTChjYm4uaW1hZ2UpXHJcbiAgICAgICAgICAgIGVudHJ5RGl2LmRhdGFzZXRbXCJrZXlcIl0gPSBrZXkudG9TdHJpbmcoKVxyXG4gICAgICAgICAgICB0aGlzLmNibnNEaXYuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBoaWRlKCkge1xyXG4gICAgICAgIHRoaXMudWkuaGlkZGVuID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25FbnRyeUNsaWNrKGV2dDogRXZlbnQpIHtcclxuICAgICAgICBjb25zdCBkaXYgPSAoZXZ0LnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdChcIi5nYWxsZXJ5LWVudHJ5XCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICAgICAgaWYgKCFkaXYpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGtleSA9IHBhcnNlSW50KGRpdi5kYXRhc2V0W1wia2V5XCJdIHx8IFwiXCIpXHJcbiAgICAgICAgaWYgKCFrZXkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNiblNlbGVjdGVkLnB1Ymxpc2goa2V5KVxyXG4gICAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xyXG4gICAgY29uc3QgZGIgPSBhd2FpdCBvcGVuREIoKVxyXG4gICAgY29uc3QgYWNxdWlyZVVpID0gbmV3IEFjcXVpcmVVaSgpXHJcbiAgICBjb25zdCBzaXplVWkgPSBuZXcgSW1hZ2VTaXplVWkoZGIpXHJcbiAgICBjb25zdCBwbGF5VWkgPSBuZXcgUGxheVVpKGRiKVxyXG4gICAgY29uc3QgZ2FsbGVyeVVpID0gbmV3IEdhbGxlcnlVaShkYilcclxuXHJcbiAgICBhY3F1aXJlVWkuaW1hZ2VBY3F1aXJlZC5zdWJjcmliZShvbkltYWdlQWNxdWlyZWQpXHJcbiAgICBhY3F1aXJlVWkuc2hvd0dhbGxlcnkuc3ViY3JpYmUoc2hvd0dhbGxlcnkpXHJcbiAgICBzaXplVWkuY3JlYXRlQ0JOLnN1YmNyaWJlKHNob3dQbGF5KVxyXG4gICAgc2l6ZVVpLnJldHVybi5zdWJjcmliZShzaG93QWNxdWlyZSlcclxuICAgIHBsYXlVaS5yZXR1cm4uc3ViY3JpYmUoc2hvd0FjcXVpcmUpXHJcbiAgICBnYWxsZXJ5VWkuc2hvd0FjcXVpcmVJbWFnZS5zdWJjcmliZShzaG93QWNxdWlyZSlcclxuICAgIGdhbGxlcnlVaS5jYm5TZWxlY3RlZC5zdWJjcmliZShzaG93UGxheSlcclxuXHJcbiAgICAvLyBpbml0aWFsbHkgc2hvdyBhY3F1aXJlIHVpXHJcbiAgICBhY3F1aXJlVWkuc2hvdygpXHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gb3BlbkRCKCk6IFByb21pc2U8SURCRGF0YWJhc2U+IHtcclxuICAgICAgICAvLyBvcGVuIC8gc2V0dXAgZGJcclxuICAgICAgICAvLyBhd2FpdCBpbmRleGVkREIuZGVsZXRlRGF0YWJhc2UoXCJjYm5cIilcclxuICAgICAgICBjb25zdCByZXEgPSBpbmRleGVkREIub3BlbihcImNiblwiLCAxKVxyXG4gICAgICAgIHJlcS5hZGRFdmVudExpc3RlbmVyKFwiYmxvY2tlZFwiLCBfID0+IGRiQmxvY2tlZCgpKVxyXG4gICAgICAgIHJlcS5hZGRFdmVudExpc3RlbmVyKFwidXBncmFkZW5lZWRlZFwiLCBldiA9PiB1cGdyYWRlREIoZXYpKVxyXG4gICAgICAgIGNvbnN0IGRiID0gYXdhaXQgaWRiLndhaXRSZXF1ZXN0KHJlcSlcclxuICAgICAgICByZXR1cm4gZGJcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBvbkltYWdlQWNxdWlyZWQoaW1nOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIGF3YWl0IHNob3dMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgICAgICBhY3F1aXJlVWkuaGlkZSgpXHJcbiAgICAgICAgc2l6ZVVpLnNob3coaW1nKVxyXG4gICAgICAgIGhpZGVMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzaG93QWNxdWlyZSgpIHtcclxuICAgICAgICBoaWRlQWxsKClcclxuICAgICAgICBhY3F1aXJlVWkuc2hvdygpXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2hvd0dhbGxlcnkoKSB7XHJcbiAgICAgICAgaGlkZUFsbCgpXHJcbiAgICAgICAgZ2FsbGVyeVVpLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIHNob3dQbGF5KGtleTogbnVtYmVyKSB7XHJcbiAgICAgICAgYXdhaXQgc2hvd0xvYWRpbmdJbmRpY2F0b3IoKVxyXG4gICAgICAgIGhpZGVBbGwoKVxyXG4gICAgICAgIHBsYXlVaS5zaG93KGtleSlcclxuICAgICAgICBoaWRlTG9hZGluZ0luZGljYXRvcigpXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaGlkZUFsbCgpIHtcclxuICAgICAgICBwbGF5VWkuaGlkZSgpXHJcbiAgICAgICAgc2l6ZVVpLmhpZGUoKVxyXG4gICAgICAgIGFjcXVpcmVVaS5oaWRlKClcclxuICAgICAgICBnYWxsZXJ5VWkuaGlkZSgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RQYWxldHRlKGltZ0RhdGE6IEltYWdlRGF0YSk6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgZGF0YSB9ID0gaW1nRGF0YVxyXG4gICAgY29uc3Qgcm93UGl0Y2ggPSB3aWR0aCAqIDRcclxuXHJcbiAgICAvLyBmaW5kIHVuaXF1ZSBjb2xvcnMsIGNyZWF0ZSBlbnRyeSBmb3IgZWFjaFxyXG4gICAgY29uc3QgcGFsZXR0ZSA9IG5ldyBTZXQ8bnVtYmVyPigpXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiByb3dQaXRjaFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICAvLyBwYWNrIGNvbG9yIHRvIGEgdW5pcXVlIHZhbHVlXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4ICogNFxyXG4gICAgICAgICAgICBjb25zdCByID0gZGF0YVtvZmZzZXRdXHJcbiAgICAgICAgICAgIGNvbnN0IGcgPSBkYXRhW29mZnNldCArIDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGIgPSBkYXRhW29mZnNldCArIDJdXHJcbiAgICAgICAgICAgIGNvbnN0IGEgPSBkYXRhW29mZnNldCArIDNdXHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gY29sb3IucGFjayhyLCBnLCBiLCBhKVxyXG4gICAgICAgICAgICBwYWxldHRlLmFkZCh2YWx1ZSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFsuLi5wYWxldHRlXVxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGFuIG92ZXJsYXkgdGhhdCBtYXBzIGVhY2ggcGl4ZWwgdG8gdGhlIGluZGV4IG9mIGl0cyBwYWxldHRlIGVudHJ5XHJcbiAqIEBwYXJhbSBpbWdEYXRhIGltYWdlIGRhdGFcclxuICogQHBhcmFtIHBhbGV0dGUgcGFsZXR0ZSBjb2xvcnNcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZVBhbGV0dGVPdmVybGF5KGltZ0RhdGE6IEltYWdlRGF0YSwgcGFsZXR0ZTogbnVtYmVyW10pOiBudW1iZXJbXSB7XHJcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQsIGRhdGEgfSA9IGltZ0RhdGFcclxuICAgIGNvbnN0IHBhbGV0dGVNYXAgPSBhcnJheS5tYXBJbmRpY2VzKHBhbGV0dGUpXHJcbiAgICBjb25zdCByb3dQaXRjaCA9IHdpZHRoICogNFxyXG4gICAgY29uc3Qgb3ZlcmxheSA9IGFycmF5LnVuaWZvcm0oLTEsIHdpZHRoICogaGVpZ2h0KVxyXG5cclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHJvd1BpdGNoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIC8vIHBhY2sgY29sb3IgdG8gYSB1bmlxdWUgdmFsdWVcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHggKiA0XHJcbiAgICAgICAgICAgIGNvbnN0IHIgPSBkYXRhW29mZnNldF1cclxuICAgICAgICAgICAgY29uc3QgZyA9IGRhdGFbb2Zmc2V0ICsgMV1cclxuICAgICAgICAgICAgY29uc3QgYiA9IGRhdGFbb2Zmc2V0ICsgMl1cclxuICAgICAgICAgICAgY29uc3QgYSA9IGRhdGFbb2Zmc2V0ICsgM11cclxuICAgICAgICAgICAgY29uc3QgcmdiYSA9IGNvbG9yLnBhY2sociwgZywgYiwgYSlcclxuICAgICAgICAgICAgY29uc3QgaWR4ID0gcGFsZXR0ZU1hcC5nZXQocmdiYSkgPz8gLTFcclxuICAgICAgICAgICAgb3ZlcmxheVt5ICogd2lkdGggKyB4XSA9IGlkeFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gb3ZlcmxheVxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGFuIG92ZXJsYXkgdGhhdCBtYXBzIGVhY2ggcGFsZXR0ZSBlbnRyeSB0byBhIGxpc3Qgb2YgcGl4ZWxzIHdpdGggaXRzIGNvbG9yXHJcbiAqIEBwYXJhbSBpbWdEYXRhIFxyXG4gKiBAcGFyYW0gcGFsZXR0ZSBcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZVBpeGVsT3ZlcmxheSh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcGFsZXR0ZTogbnVtYmVyW10sIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSk6IFNldDxudW1iZXI+W10ge1xyXG4gICAgY29uc3Qgb3ZlcmxheSA9IGFycmF5LmdlbmVyYXRlKHBhbGV0dGUubGVuZ3RoLCAoKSA9PiBuZXcgU2V0PG51bWJlcj4oKSlcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHdpZHRoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIC8vIHBhY2sgY29sb3IgdG8gYSB1bmlxdWUgdmFsdWVcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgcGFsZXR0ZUlkeCA9IHBhbGV0dGVPdmVybGF5W29mZnNldF1cclxuICAgICAgICAgICAgaWYgKHBhbGV0dGVJZHggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBmbGF0Q29vcmQgPSBpbWFnaW5nLmZsYXQoeCwgeSwgd2lkdGgpXHJcbiAgICAgICAgICAgIG92ZXJsYXlbcGFsZXR0ZUlkeF0uYWRkKGZsYXRDb29yZClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG92ZXJsYXlcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGNhbGNMdW1pbmFuY2UocjogbnVtYmVyLCBnOiBudW1iZXIsIGI6IG51bWJlcikge1xyXG4gICAgY29uc3QgbCA9IDAuMjEyNiAqIChyIC8gMjU1KSArIDAuNzE1MiAqIChnIC8gMjU1KSArIDAuMDcyMiAqIChiIC8gMjU1KVxyXG4gICAgcmV0dXJuIGxcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0NlbGxJbWFnZShjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSkge1xyXG4gICAgY29uc3QgY2VsbEltYWdlV2lkdGggPSB3aWR0aCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG4gICAgY29uc3QgY2VsbEltYWdlSGVpZ2h0ID0gaGVpZ2h0ICogKGNlbGxTaXplICsgMSkgKyAxXHJcblxyXG4gICAgLy8gc2l6ZSBjYW52YXNcclxuICAgIGN0eC5jYW52YXMud2lkdGggPSBjZWxsSW1hZ2VXaWR0aFxyXG4gICAgY3R4LmNhbnZhcy5oZWlnaHQgPSBjZWxsSW1hZ2VIZWlnaHRcclxuXHJcbiAgICAvLyBkcmF3IGhvcml6b250YWwgZ3JpZCBsaW5lc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gaGVpZ2h0OyArK2kpIHtcclxuICAgICAgICBjdHguc3Ryb2tlUmVjdCgwLCBpICogKGNlbGxTaXplICsgMSksIGNlbGxJbWFnZVdpZHRoLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgdmVydGljYWwgZ3JpZCBsaW5lc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gd2lkdGg7ICsraSkge1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KGkgKiAoY2VsbFNpemUgKyAxKSwgMCwgMSwgY2VsbEltYWdlSGVpZ2h0KVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgI3NcclxuICAgIGNvbnN0IGZvbnQgPSBjdHguZm9udFxyXG4gICAgY3R4LmZvbnQgPSBcIjE2cHggYXJpYWxcIlxyXG4gICAgY29uc3QgdGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGhcclxuICAgIGNvbnN0IGNkeHkgPSBjZWxsU2l6ZSAvIDJcclxuXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiB3aWR0aFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgICAgICBjb25zdCBwYWxldHRlSWR4ID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0XVxyXG4gICAgICAgICAgICBjb25zdCBsYWJlbCA9IGAke3BhbGV0dGVJZHggKyAxfWBcclxuICAgICAgICAgICAgY29uc3QgbWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dChsYWJlbClcclxuICAgICAgICAgICAgY29uc3QgY3ggPSB4ICogKGNlbGxTaXplICsgMSkgKyBjZHh5ICsgMSAtIG1ldHJpY3Mud2lkdGggLyAyXHJcbiAgICAgICAgICAgIGNvbnN0IGN5ID0geSAqIChjZWxsU2l6ZSArIDEpICsgY2R4eSArIDEgKyB0ZXh0SGVpZ2h0IC8gMlxyXG4gICAgICAgICAgICBjdHguZmlsbFRleHQobGFiZWwsIGN4LCBjeSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmZvbnQgPSBmb250XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpdCh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgbWF4U2l6ZTogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICBpZiAod2lkdGggPiBoZWlnaHQgJiYgd2lkdGggPiBtYXhTaXplKSB7XHJcbiAgICAgICAgaGVpZ2h0ID0gbWF4U2l6ZSAqIGhlaWdodCAvIHdpZHRoXHJcbiAgICAgICAgcmV0dXJuIFtNYXRoLmZsb29yKG1heFNpemUpLCBNYXRoLmZsb29yKGhlaWdodCldXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGhlaWdodCA+IHdpZHRoICYmIGhlaWdodCA+IG1heFNpemUpIHtcclxuICAgICAgICB3aWR0aCA9IG1heFNpemUgKiB3aWR0aCAvIGhlaWdodFxyXG4gICAgICAgIHJldHVybiBbTWF0aC5mbG9vcih3aWR0aCksIE1hdGguZmxvb3IobWF4U2l6ZSldXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFtNYXRoLmZsb29yKHdpZHRoKSwgTWF0aC5mbG9vcihoZWlnaHQpXVxyXG59XHJcblxyXG4vKipcclxuICAgKiBDb252ZXJ0IGFuIGltYWdlIHggb3IgeSBjb29yZGluYXRlIHRvIHRvcCBvciBsZWZ0IG9mIGNibiBjZWxsIGNvbnRhaW5pbmcgdGhhdCBwaXhlbFxyXG4gICAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gICAqL1xyXG5mdW5jdGlvbiBpbWFnZTJDZWxsQ29vcmQoY29vcmQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gY29vcmQgKiAoY2VsbFNpemUgKyAxKSArIDFcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnQgYSBjYm4geCBvciB5IGNvb3JkaW5hdGUgdG8gdG9wIG9yIGxlZnQgb2YgY2JuIGNlbGwgY29udGFpbmluZyB0aGF0IHBpeGVsXHJcbiAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gKi9cclxuZnVuY3Rpb24gY2VsbDJJbWFnZUNvb3JkKGNvb3JkOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoKGNvb3JkIC0gMSkgLyAoY2VsbFNpemUgKyAxKSlcclxufVxyXG5cclxuLyoqXHJcbiAgICogQ29udmVydCBhbiBpbWFnZSB4IG9yIHkgY29vcmRpbmF0ZSB0byB0b3Agb3IgbGVmdCBvZiBjYm4gY2VsbCBjb250YWluaW5nIHRoYXQgcGl4ZWxcclxuICAgKiBAcGFyYW0gY29vcmQgeCBvciB5IGNvb3JkaW5hdGVcclxuICAgKi9cclxuZnVuY3Rpb24gaW1hZ2UyQ2VsbCh4OiBudW1iZXIsIHk6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgcmV0dXJuIFtpbWFnZTJDZWxsQ29vcmQoeCksIGltYWdlMkNlbGxDb29yZCh5KV1cclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnQgYSBjYm4geCBvciB5IGNvb3JkaW5hdGUgdG8gdG9wIG9yIGxlZnQgb2YgY2JuIGNlbGwgY29udGFpbmluZyB0aGF0IHBpeGVsXHJcbiAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gKi9cclxuZnVuY3Rpb24gY2VsbDJJbWFnZSh4OiBudW1iZXIsIHk6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgcmV0dXJuIFtjZWxsMkltYWdlQ29vcmQoeCksIGNlbGwySW1hZ2VDb29yZCh5KV1cclxufVxyXG5cclxuLyoqXHJcbiAqIGNvbnZlcnQgcmdiYSBjb29yZGluYXRlcyB0byBhIHN0eWxlIHN0cmluZ1xyXG4gKiBAcGFyYW0gciByZWRcclxuICogQHBhcmFtIGcgZ3JlZW5cclxuICogQHBhcmFtIGIgYmx1ZVxyXG4gKiBAcGFyYW0gYSBhbHBoYVxyXG4gKi9cclxuZnVuY3Rpb24gY29sb3IyUkdCQVN0eWxlKHI6IG51bWJlciwgZzogbnVtYmVyLCBiOiBudW1iZXIsIGE6IG51bWJlciA9IDI1NSkge1xyXG4gICAgcmV0dXJuIGByZ2JhKCR7cn0sICR7Z30sICR7Yn0sICR7YSAvIDI1NX0pYFxyXG59XHJcblxyXG5mdW5jdGlvbiBwcnVuZVBhbGxldGUocGFsZXR0ZTogbnVtYmVyW10sIHBpeGVsT3ZlcmxheTogU2V0PG51bWJlcj5bXSwgbWF4UGl4ZWxzOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCk6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IGluZGljZXNUb0tlZXAgPSBuZXcgU2V0PG51bWJlcj4oYXJyYXkuc2VxdWVuY2UoMCwgcGFsZXR0ZS5sZW5ndGgpKVxyXG5cclxuICAgIGN0eC5jYW52YXMud2lkdGggPSB3aWR0aCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG4gICAgY3R4LmNhbnZhcy5oZWlnaHQgPSBoZWlnaHQgKiAoY2VsbFNpemUgKyAxKSArIDFcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBpeGVsT3ZlcmxheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IHBpeGVscyA9IHBpeGVsT3ZlcmxheVtpXVxyXG4gICAgICAgIGlmIChwaXhlbHMuc2l6ZSA8IG1heFBpeGVscykge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGl0ZXIuYWxsKHBpeGVscywgeCA9PiAhaXNCb3JkZXJQaXhlbCguLi5pbWFnaW5nLnVuZmxhdCh4LCB3aWR0aCksIHdpZHRoLCBoZWlnaHQpKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZmlsbCB0aGVzZSBwaXhlbHMgaW4gaW1hZ2Ugd2l0aCBhcHByb3ByaWF0ZSBjb2xvclxyXG4gICAgICAgIGNvbnN0IFtyLCBnLCBiXSA9IGNvbG9yLnVucGFjayhwYWxldHRlW2ldKVxyXG4gICAgICAgIGZvciAoY29uc3QgeHkgb2YgcGl4ZWxzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IGltYWdpbmcudW5mbGF0KHh5LCB3aWR0aClcclxuICAgICAgICAgICAgY29uc3QgW2N4LCBjeV0gPSBpbWFnZTJDZWxsKHgsIHkpXHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjJSR0JBU3R5bGUociwgZywgYilcclxuICAgICAgICAgICAgY3R4LmZpbGxSZWN0KGN4LCBjeSwgY2VsbFNpemUsIGNlbGxTaXplKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaW5kaWNlc1RvS2VlcC5kZWxldGUoaSlcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBuZXdQYWxldHRlID0gWy4uLmluZGljZXNUb0tlZXBdLm1hcCh4ID0+IHBhbGV0dGVbeF0pXHJcbiAgICByZXR1cm4gbmV3UGFsZXR0ZVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc0JvcmRlclBpeGVsKHg6IG51bWJlciwgeTogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHggPT09IDAgfHwgeSA9PT0gMCB8fCB4ID09PSB3aWR0aCAtIDEgfHwgeSA9PT0gaGVpZ2h0IC0gMVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBzaG93TG9hZGluZ0luZGljYXRvcigpIHtcclxuICAgIGNvbnN0IGRpdiA9IGRvbS5ieUlkKFwibG9hZGluZ01vZGFsXCIpXHJcbiAgICBkaXYuaGlkZGVuID0gZmFsc2VcclxuICAgIGF3YWl0IHV0aWwud2FpdCgwKVxyXG59XHJcblxyXG5mdW5jdGlvbiBoaWRlTG9hZGluZ0luZGljYXRvcigpIHtcclxuICAgIGNvbnN0IGRpdiA9IGRvbS5ieUlkKFwibG9hZGluZ01vZGFsXCIpXHJcbiAgICBkaXYuaGlkZGVuID0gdHJ1ZVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiB1cGdyYWRlREIoZXZ0OiBJREJWZXJzaW9uQ2hhbmdlRXZlbnQpIHtcclxuICAgIGNvbnN0IGRiID0gKGV2dC50YXJnZXQgYXMgSURCT3BlbkRCUmVxdWVzdCkucmVzdWx0XHJcblxyXG4gICAgLy8gbm90ZSAtIGV2ZW50IGNvbnRhaW5zIG9sZCAvIG5ldyB2ZXJzaW9ucyBpZiByZXF1aXJlZFxyXG4gICAgLy8gdXBkYXRlIHRvIHRoZSBuZXcgdmVyc2lvbiAgICBcclxuICAgIGlmICghZGIub2JqZWN0U3RvcmVOYW1lcy5jb250YWlucyhwaWN0dXJlc09iamVjdFN0b3JlTmFtZSkpIHtcclxuICAgICAgICBkYi5jcmVhdGVPYmplY3RTdG9yZShwaWN0dXJlc09iamVjdFN0b3JlTmFtZSwgeyBhdXRvSW5jcmVtZW50OiB0cnVlIH0pXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRiQmxvY2tlZCgpIHtcclxuICAgIHNob3dFcnJvcihcIlBpY3R1cmUgZGF0YWJhc2UgbmVlZHMgdXBkYXRlZCwgYnV0IG90aGVyIHRhYnMgYXJlIG9wZW4gdGhhdCBhcmUgdXNpbmcgaXQuIFBsZWFzZSBjbG9zZSBhbGwgdGFicyBmb3IgdGhpcyB3ZWIgc2l0ZSBhbmQgdHJ5IGFnYWluLlwiKVxyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93RXJyb3IobWVzc2FnZTogc3RyaW5nKSB7XHJcbiAgICBjb25zdCBtb2RhbERpdiA9IGRvbS5ieUlkKFwiZXJyb3JNb2RhbFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgY29uc3QgbWVzc2FnZURpdiA9IGRvbS5ieUlkKFwiZXJyb3JNZXNzYWdlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBtb2RhbERpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgbWVzc2FnZURpdi50ZXh0Q29udGVudCA9IG1lc3NhZ2VcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gcHV0Q0JOKGRiOiBJREJEYXRhYmFzZSwgZGF0YTogQ0JOUGljdHVyZSwga2V5PzogbnVtYmVyKTogUHJvbWlzZTxudW1iZXI+IHtcclxuICAgIC8vIG5vdGUgc2FmYXJpIGNhbid0IHN0b3JlIGJsb2JzIHNvIG11c3QgY29udmVydCB0byBhcnJheUJ1ZmZlclxyXG4gICAgY29uc3QgZGJEYXRhID0gYXdhaXQgY2JuMmRiKGRhdGEpXHJcbiAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lLCBcInJlYWR3cml0ZVwiKVxyXG4gICAgY29uc3Qgc3RvcmUgPSB0eC5vYmplY3RTdG9yZShwaWN0dXJlc09iamVjdFN0b3JlTmFtZSlcclxuICAgIGNvbnN0IGsgPSBhd2FpdCBpZGIud2FpdFJlcXVlc3Qoc3RvcmUucHV0KGRiRGF0YSwga2V5KSkgYXMgbnVtYmVyXHJcbiAgICByZXR1cm4ga1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBnZXRDQk4oZGI6IElEQkRhdGFiYXNlLCBrZXk6IG51bWJlcik6IFByb21pc2U8Q0JOUGljdHVyZT4ge1xyXG4gICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbihwaWN0dXJlc09iamVjdFN0b3JlTmFtZSwgXCJyZWFkd3JpdGVcIilcclxuICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUocGljdHVyZXNPYmplY3RTdG9yZU5hbWUpXHJcbiAgICBjb25zdCBkYkRhdGEgPSBhd2FpdCBpZGIud2FpdFJlcXVlc3Qoc3RvcmUuZ2V0KGtleSkpIGFzIENCTlBpY3R1cmVEQlxyXG4gICAgY29uc3QgZGF0YSA9IGRiMmNibihkYkRhdGEpXHJcbiAgICBhd2FpdCBpZGIud2FpdFR4KHR4KVxyXG4gICAgcmV0dXJuIGRhdGFcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZ2V0QWxsQ0JOcyhkYjogSURCRGF0YWJhc2UpOiBQcm9taXNlPFtudW1iZXIsIENCTlBpY3R1cmVdW10+IHtcclxuICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24ocGljdHVyZXNPYmplY3RTdG9yZU5hbWUsIFwicmVhZHdyaXRlXCIpXHJcbiAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lKVxyXG4gICAgY29uc3QgZGF0YXMgPSBuZXcgQXJyYXk8W251bWJlciwgQ0JOUGljdHVyZV0+KClcclxuXHJcbiAgICBjb25zdCByZXEgPSBzdG9yZS5vcGVuQ3Vyc29yKClcclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgY29uc3QgY3Vyc29yID0gYXdhaXQgaWRiLndhaXRSZXF1ZXN0KHJlcSlcclxuICAgICAgICBpZiAoIWN1cnNvcikge1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qga2V5ID0gY3Vyc29yLmtleSBhcyBudW1iZXJcclxuICAgICAgICBjb25zdCBkYkRhdGEgPSBjdXJzb3IudmFsdWUgYXMgQ0JOUGljdHVyZURCXHJcbiAgICAgICAgY29uc3QgZGF0YSA9IGRiMmNibihkYkRhdGEpXHJcbiAgICAgICAgZGF0YXMucHVzaChba2V5LCBkYXRhXSlcclxuICAgICAgICBjdXJzb3IuY29udGludWUoKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBkYXRhc1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBjYm4yZGIoZGF0YTogQ0JOUGljdHVyZSk6IFByb21pc2U8Q0JOUGljdHVyZURCPiB7XHJcbiAgICBjb25zdCBidWZmZXIgPSBhd2FpdCBpZGIuYmxvYjJBcnJheUJ1ZmZlcihkYXRhLmltYWdlKVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBpbWFnZTogYnVmZmVyLFxyXG4gICAgICAgIHNlcXVlbmNlOiBkYXRhLnNlcXVlbmNlXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRiMmNibihkYXRhOiBDQk5QaWN0dXJlREIpOiBDQk5QaWN0dXJlIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgaW1hZ2U6IGlkYi5hcnJheUJ1ZmZlcjJCbG9iKGRhdGEuaW1hZ2UsIGltYWdlTWltZVR5cGUpLFxyXG4gICAgICAgIHNlcXVlbmNlOiBkYXRhLnNlcXVlbmNlXHJcbiAgICB9XHJcbn1cclxuXHJcbm1haW4oKSJdfQ==