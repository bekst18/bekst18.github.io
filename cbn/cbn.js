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
            entryDiv.src = URL.createObjectURL(cbn.image);
            entryDiv.dataset["key"] = key.toString();
            this.cbnsDiv.appendChild(fragment);
        }
    }
    hide() {
        this.ui.hidden = true;
    }
    onEntryClick(evt) {
        const img = evt.target;
        const key = parseInt(img.dataset["key"] || "");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQTtBQUN2QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQUMvQyxPQUFPLEtBQUssS0FBSyxNQUFNLG9CQUFvQixDQUFBO0FBRTNDLDRDQUE0QztBQUM1QyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFFbkIsMkRBQTJEO0FBQzNELE1BQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFBO0FBRTlCLCtCQUErQjtBQUMvQixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQTtBQUVoQyx3QkFBd0I7QUFDeEIsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFBO0FBRXpCLHFCQUFxQjtBQUNyQixNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQTtBQUUzQixvQkFBb0I7QUFDcEIsTUFBTSx1QkFBdUIsR0FBRyxVQUFVLENBQUE7QUFFMUMsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFBO0FBRWpDLElBQUssVUFJSjtBQUpELFdBQUssVUFBVTtJQUNYLDJDQUFJLENBQUE7SUFDSiwyQ0FBSSxDQUFBO0lBQ0oseURBQVcsQ0FBQTtBQUNmLENBQUMsRUFKSSxVQUFVLEtBQVYsVUFBVSxRQUlkO0FBWUQsTUFBTSxPQUFPO0lBQWI7UUFDcUIsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBd0Is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Q2pDLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUE7UUFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUE7UUFDOUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTlFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtZQUMzQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNCLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ2xELE1BQU0sTUFBTSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDckIsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMzQixTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMvQixTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMvQixTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFBO1lBRWxCLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkMsSUFBSSxDQUFDLEdBQUcsQ0FB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LFVBQVUsTUFBTSxDQUFDLElBQWdCO0lBQ2xDLE1BQU0sTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNyRCxPQUFPO1FBQ0gsS0FBSyxFQUFFLE1BQU07UUFDYixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7S0FDMUIsQ0FBQTtBQUNMLENBQUM7QUFFRCxTQUFTLE1BQU0sQ0FBQyxJQUFrQjtJQUM5QixPQUFPO1FBQ0gsS0FBSyxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQztRQUN0RCxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7S0FDMUIsQ0FBQTtBQUNMLENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIlxyXG5pbXBvcnQgKiBhcyBkb20gZnJvbSBcIi4uL3NoYXJlZC9kb20uanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8zZC5qc1wiXHJcbmltcG9ydCAqIGFzIG1hdGggZnJvbSBcIi4uL3NoYXJlZC9tYXRoLmpzXCJcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tIFwiLi4vc2hhcmVkL3V0aWwuanNcIlxyXG5pbXBvcnQgKiBhcyBpdGVyIGZyb20gXCIuLi9zaGFyZWQvaXRlci5qc1wiXHJcbmltcG9ydCAqIGFzIGlkYiBmcm9tIFwiLi4vc2hhcmVkL2lkYi5qc1wiXHJcbmltcG9ydCAqIGFzIGltYWdpbmcgZnJvbSBcIi4uL3NoYXJlZC9pbWFnaW5nLmpzXCJcclxuaW1wb3J0ICogYXMgY29sb3IgZnJvbSBcIi4uL3NoYXJlZC9jb2xvci5qc1wiXHJcblxyXG4vLyBzaXplIHRoYXQgZWFjaCBpbWFnZSBwaXhlbCBpcyBibG93biB1cCB0b1xyXG5jb25zdCBjZWxsU2l6ZSA9IDMyXHJcblxyXG4vLyB0b2xlcmFuY2UgYmVmb3JlIHNwbGl0dGluZyBjb2xvcnMgLSBoaWdoZXIgPSBsZXNzIGNvbG9yc1xyXG5jb25zdCBjb2xvclJhbmdlVG9sZXJhbmNlID0gMzJcclxuXHJcbi8vIG1heCBiZyBwaXhlbHMgYmVmb3JlIHJlbW92YWxcclxuY29uc3QgbWF4QmFja2dyb3VuZFBpeGVscyA9IDEwMjRcclxuXHJcbi8vIGRlZmF1bHQgbWF4IGRpbWVuc2lvblxyXG5jb25zdCBkZWZhdWx0TWF4RGltID0gMTI4XHJcblxyXG4vLyBkZWZhdWx0IG1heCBjb2xvcnNcclxuY29uc3QgZGVmYXVsdE1heENvbG9ycyA9IDY0XHJcblxyXG4vLyBvYmplY3Qgc3RvcmUgbmFtZVxyXG5jb25zdCBwaWN0dXJlc09iamVjdFN0b3JlTmFtZSA9IFwicGljdHVyZXNcIlxyXG5cclxuY29uc3QgaW1hZ2VNaW1lVHlwZSA9IFwiaW1hZ2UvcG5nXCJcclxuXHJcbmVudW0gQ2FtZXJhTW9kZSB7XHJcbiAgICBOb25lLFxyXG4gICAgVXNlcixcclxuICAgIEVudmlyb25tZW50LFxyXG59XHJcblxyXG5pbnRlcmZhY2UgQ0JOUGljdHVyZSB7XHJcbiAgICBpbWFnZTogQmxvYlxyXG4gICAgc2VxdWVuY2U6IG51bWJlcltdXHJcbn1cclxuXHJcbmludGVyZmFjZSBDQk5QaWN0dXJlREIge1xyXG4gICAgaW1hZ2U6IEFycmF5QnVmZmVyXHJcbiAgICBzZXF1ZW5jZTogbnVtYmVyW11cclxufVxyXG5cclxuY2xhc3MgQ2hhbm5lbDxUIGV4dGVuZHMgYW55W10+IHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3Vic2NyaWJlcnMgPSBuZXcgU2V0PCguLi5hcmdzOiBUKSA9PiB2b2lkPigpXHJcblxyXG4gICAgcHVibGljIHN1YmNyaWJlKHN1YnNjcmliZXI6ICguLi5hcmdzOiBUKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVycy5hZGQoc3Vic2NyaWJlcilcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgdW5zdWJzY3JpYmUoc3Vic2NyaWJlcjogKC4uLmFyZ3M6IFQpID0+IHZvaWQpIHtcclxuICAgICAgICB0aGlzLnN1YnNjcmliZXJzLmRlbGV0ZShzdWJzY3JpYmVyKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBwdWJsaXNoKC4uLmFyZ3M6IFQpOiB2b2lkIHtcclxuICAgICAgICBmb3IgKGNvbnN0IHN1YnNjcmliZXIgb2YgdGhpcy5zdWJzY3JpYmVycykge1xyXG4gICAgICAgICAgICBzdWJzY3JpYmVyKC4uLmFyZ3MpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBBY3F1aXJlVWkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW1lcmEgPSBkb20uYnlJZChcImNhbWVyYVwiKSBhcyBIVE1MVmlkZW9FbGVtZW50XHJcbiAgICBwcml2YXRlIGNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLk5vbmVcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYWNxdWlyZUltYWdlRGl2ID0gZG9tLmJ5SWQoXCJhY3F1aXJlSW1hZ2VcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FwdHVyZUltYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJjYXB0dXJlSW1hZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VBY3F1aXNpdGlvbkRpdiA9IGRvbS5ieUlkKFwiaW1hZ2VBY3F1aXNpdGlvblVpXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpbGVEcm9wQm94ID0gZG9tLmJ5SWQoXCJmaWxlRHJvcEJveFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmaWxlSW5wdXQgPSBkb20uYnlJZChcImZpbGVJbnB1dFwiKSBhcyBIVE1MSW5wdXRFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpbGVCdXR0b24gPSBkb20uYnlJZChcImZpbGVCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdXNlQ2FtZXJhQnV0dG9uID0gZG9tLmJ5SWQoXCJ1c2VDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmxpcENhbWVyYUJ1dHRvbiA9IGRvbS5ieUlkKFwiZmxpcENhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdG9wQ2FtZXJhQnV0dG9uID0gZG9tLmJ5SWQoXCJzdG9wQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGdhbGxlcnlCdXR0b24gPSBkb20uYnlJZChcImdhbGxlcnlCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZXJyb3JzRGl2ID0gZG9tLmJ5SWQoXCJlcnJvcnNcIilcclxuICAgIHB1YmxpYyByZWFkb25seSBpbWFnZUFjcXVpcmVkID0gbmV3IENoYW5uZWw8W0hUTUxDYW52YXNFbGVtZW50XT4oKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsaWJyYXJ5VWkgPSBuZXcgTGlicmFyeVVpKClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgc2hvd0dhbGxlcnkgPSBuZXcgQ2hhbm5lbDxbdm9pZF0+KClcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmZpbGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5maWxlSW5wdXQuY2xpY2soKVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuZmlsZURyb3BCb3guYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdlbnRlclwiLCAoZSkgPT4gdGhpcy5vbkRyYWdFbnRlck92ZXIoZSkpXHJcbiAgICAgICAgdGhpcy5maWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ292ZXJcIiwgKGUpID0+IHRoaXMub25EcmFnRW50ZXJPdmVyKGUpKVxyXG4gICAgICAgIHRoaXMuZmlsZURyb3BCb3guYWRkRXZlbnRMaXN0ZW5lcihcImRyb3BcIiwgKGUpID0+IHRoaXMub25GaWxlRHJvcChlKSlcclxuICAgICAgICB0aGlzLmZpbGVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHRoaXMub25GaWxlQ2hhbmdlKCkpXHJcbiAgICAgICAgdGhpcy51c2VDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMudXNlQ2FtZXJhKCkpXHJcbiAgICAgICAgdGhpcy5mbGlwQ2FtZXJhQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmZsaXBDYW1lcmEoKSlcclxuICAgICAgICB0aGlzLnN0b3BDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuc3RvcENhbWVyYSgpKVxyXG4gICAgICAgIHRoaXMuY2FwdHVyZUltYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmNhcHR1cmVJbWFnZSgpKVxyXG4gICAgICAgIHRoaXMuY2FtZXJhLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRtZXRhZGF0YVwiLCAoKSA9PiB0aGlzLm9uQ2FtZXJhTG9hZCgpKVxyXG4gICAgICAgIHRoaXMuZ2FsbGVyeUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgXyA9PiB0aGlzLnNob3dHYWxsZXJ5LnB1Ymxpc2goKSlcclxuXHJcbiAgICAgICAgdGhpcy5saWJyYXJ5VWkuY2FuY2VsLnN1YmNyaWJlKCgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5pbWFnZUFjcXVpc2l0aW9uRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2hvdygpIHtcclxuICAgICAgICB0aGlzLmltYWdlQWNxdWlzaXRpb25EaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICAgICAgLy8gdGhpcy5sb2FkRnJvbVVybChcIi9jYm4vYXNzZXRzL2xhcnJ5S29vcGEuanBnXCIpXHJcbiAgICAgICAgLy8gdGhpcy5sb2FkRnJvbVVybChcIi9jYm4vYXNzZXRzL29sdHNfZmxvd2VyLmpwZ1wiKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBoaWRlKCkge1xyXG4gICAgICAgIHRoaXMuaW1hZ2VBY3F1aXNpdGlvbkRpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkRyYWdFbnRlck92ZXIoZXY6IERyYWdFdmVudCkge1xyXG4gICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgZXYucHJldmVudERlZmF1bHQoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25GaWxlQ2hhbmdlKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5maWxlSW5wdXQuZmlsZXM/Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmZpbGVJbnB1dC5maWxlc1swXVxyXG4gICAgICAgIHRoaXMucHJvY2Vzc0ZpbGUoZmlsZSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uRmlsZURyb3AoZXY6IERyYWdFdmVudCkge1xyXG4gICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgZXYucHJldmVudERlZmF1bHQoKVxyXG5cclxuICAgICAgICBpZiAoIWV2Py5kYXRhVHJhbnNmZXI/LmZpbGVzPy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmaWxlID0gZXYuZGF0YVRyYW5zZmVyLmZpbGVzWzBdXHJcbiAgICAgICAgdGhpcy5wcm9jZXNzRmlsZShmaWxlKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgdXNlQ2FtZXJhKCkge1xyXG4gICAgICAgIHRoaXMuYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgY29uc3QgZGlhbG9nV2lkdGggPSB0aGlzLmFjcXVpcmVJbWFnZURpdi5jbGllbnRXaWR0aFxyXG4gICAgICAgIGNvbnN0IGRpYWxvZ0hlaWdodCA9IHRoaXMuYWNxdWlyZUltYWdlRGl2LmNsaWVudEhlaWdodFxyXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcclxuICAgICAgICAgICAgdmlkZW86IHsgd2lkdGg6IHsgbWF4OiBkaWFsb2dXaWR0aCB9LCBoZWlnaHQ6IHsgbWF4OiBkaWFsb2dIZWlnaHQgfSwgZmFjaW5nTW9kZTogXCJ1c2VyXCIgfSxcclxuICAgICAgICAgICAgYXVkaW86IGZhbHNlXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5jYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Vc2VyXHJcbiAgICAgICAgdGhpcy5jYW1lcmEuc3JjT2JqZWN0ID0gc3RyZWFtXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBmbGlwQ2FtZXJhKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5jYW1lcmEuc3JjT2JqZWN0KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc3JjID0gdGhpcy5jYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICAgICAgY29uc3QgdHJhY2tzID0gc3JjLmdldFRyYWNrcygpXHJcbiAgICAgICAgZm9yIChjb25zdCB0cmFjayBvZiB0cmFja3MpIHtcclxuICAgICAgICAgICAgdHJhY2suc3RvcCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbWVyYU1vZGUgPSB0aGlzLmNhbWVyYU1vZGUgPT0gQ2FtZXJhTW9kZS5Vc2VyID8gQ2FtZXJhTW9kZS5FbnZpcm9ubWVudCA6IENhbWVyYU1vZGUuVXNlclxyXG4gICAgICAgIGNvbnN0IGZhY2luZ01vZGUgPSB0aGlzLmNhbWVyYU1vZGUgPT0gQ2FtZXJhTW9kZS5Vc2VyID8gXCJ1c2VyXCIgOiBcImVudmlyb25tZW50XCJcclxuXHJcbiAgICAgICAgLy8gZ2V0IGN1cnJlbnQgZmFjaW5nIG1vZGVcclxuICAgICAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7XHJcbiAgICAgICAgICAgIHZpZGVvOiB7IHdpZHRoOiB0aGlzLmNhbWVyYS5jbGllbnRXaWR0aCwgaGVpZ2h0OiB0aGlzLmNhbWVyYS5jbGllbnRIZWlnaHQsIGZhY2luZ01vZGU6IGZhY2luZ01vZGUgfSxcclxuICAgICAgICAgICAgYXVkaW86IGZhbHNlXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5jYW1lcmEuc3JjT2JqZWN0ID0gc3RyZWFtXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkNhbWVyYUxvYWQoKSB7XHJcbiAgICAgICAgdGhpcy5hY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmNhbWVyYS5wbGF5KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHN0b3BDYW1lcmEoKSB7XHJcbiAgICAgICAgY29uc3Qgc3JjID0gdGhpcy5jYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICAgICAgaWYgKCFzcmMpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB0cmFja3MgPSBzcmMuZ2V0VHJhY2tzKClcclxuICAgICAgICBmb3IgKGNvbnN0IHRyYWNrIG9mIHRyYWNrcykge1xyXG4gICAgICAgICAgICB0cmFjay5zdG9wKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuTm9uZVxyXG4gICAgICAgIHRoaXMuYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNhcHR1cmVJbWFnZSgpIHtcclxuICAgICAgICB0aGlzLmNsZWFyRXJyb3JNZXNzYWdlcygpXHJcblxyXG4gICAgICAgIGNvbnN0IHNyYyA9IHRoaXMuY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgICAgIGlmICghc3JjKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdHJhY2sgPSBzcmMuZ2V0VmlkZW9UcmFja3MoKVswXVxyXG4gICAgICAgIGlmICghdHJhY2spIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmN0eC5jYW52YXMud2lkdGggPSB0aGlzLmNhbWVyYS52aWRlb1dpZHRoXHJcbiAgICAgICAgdGhpcy5jdHguY2FudmFzLmhlaWdodCA9IHRoaXMuY2FtZXJhLnZpZGVvSGVpZ2h0XHJcbiAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKHRoaXMuY2FtZXJhLCAwLCAwKVxyXG4gICAgICAgIHRoaXMuaW1hZ2VBY3F1aXJlZC5wdWJsaXNoKHRoaXMuY2FudmFzKVxyXG4gICAgICAgIHRoaXMuc3RvcENhbWVyYSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwcm9jZXNzRmlsZShmaWxlOiBGaWxlKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhckVycm9yTWVzc2FnZXMoKVxyXG4gICAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSlcclxuICAgICAgICB0aGlzLmxvYWRGcm9tVXJsKHVybClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxvYWRGcm9tVXJsKHVybDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhckVycm9yTWVzc2FnZXMoKVxyXG4gICAgICAgIGNvbnN0IGltZyA9IGF3YWl0IGRvbS5sb2FkSW1hZ2UodXJsKVxyXG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gaW1nLndpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gaW1nLmhlaWdodFxyXG4gICAgICAgIHRoaXMuY3R4LmRyYXdJbWFnZShpbWcsIDAsIDApXHJcbiAgICAgICAgdGhpcy5pbWFnZUFjcXVpcmVkLnB1Ymxpc2godGhpcy5jYW52YXMpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjbGVhckVycm9yTWVzc2FnZXMoKSB7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRoaXMuZXJyb3JzRGl2KVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBJbWFnZVNpemVVaSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRiOiBJREJEYXRhYmFzZVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZVNpemVEaXYgPSBkb20uYnlJZChcImltYWdlU2l6ZVVpXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1heERpbUlucHV0ID0gZG9tLmJ5SWQoXCJtYXhEaW1cIikgYXMgSFRNTElucHV0RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtYXhDb2xvcnNJbnB1dCA9IGRvbS5ieUlkKFwibWF4Q29sb3JzXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY3JlYXRlQ29sb3JCeU51bWJlckJ1dHRvbiA9IGRvbS5ieUlkKFwiY3JlYXRlQ29sb3JCeU51bWJlclwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZXR1cm5CdXR0b24gPSBkb20uYnlJZChcImltYWdlU2l6ZVJldHVyblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZVNjYWxlQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZVNjYWxlQ3R4ID0gdGhpcy5pbWFnZVNjYWxlQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VTaXplQ2FudmFzID0gZG9tLmJ5SWQoXCJpbWFnZVNpemVDYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VTaXplQ3R4ID0gdGhpcy5pbWFnZVNpemVDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSBpbWFnZUNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIHB1YmxpYyByZWFkb25seSBjcmVhdGVDQk4gPSBuZXcgQ2hhbm5lbDxbbnVtYmVyXT4oKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IHJldHVybiA9IG5ldyBDaGFubmVsPFtdPigpXHJcblxyXG4gICAgY29uc3RydWN0b3IoZGI6IElEQkRhdGFiYXNlKSB7XHJcbiAgICAgICAgdGhpcy5kYiA9IGRiXHJcbiAgICAgICAgdGhpcy5jcmVhdGVDb2xvckJ5TnVtYmVyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uQ3JlYXRlQ29sb3JCeU51bWJlcigpKVxyXG4gICAgICAgIHRoaXMucmV0dXJuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uUmV0dXJuQ2xpY2soKSlcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2hvdyhpbWFnZUNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICB0aGlzLmltYWdlU2l6ZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuaW1hZ2VDYW52YXMgPSBpbWFnZUNhbnZhc1xyXG4gICAgICAgIHRoaXMubWF4RGltSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB0aGlzLm9uTWF4RGltQ2hhbmdlKCkpXHJcbiAgICAgICAgdGhpcy5tYXhDb2xvcnNJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHRoaXMub25NYXhDb2xvcnNDaGFuZ2UoKSlcclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5pbWFnZVNpemVEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgb25DcmVhdGVDb2xvckJ5TnVtYmVyKCkge1xyXG4gICAgICAgIGNvbnN0IGJsb2IgPSBhd2FpdCBpbWFnaW5nLmNhbnZhczJCbG9iKHRoaXMuaW1hZ2VTY2FsZUNhbnZhcywgaW1hZ2VNaW1lVHlwZSlcclxuICAgICAgICBjb25zdCBjYm46IENCTlBpY3R1cmUgPSB7XHJcbiAgICAgICAgICAgIGltYWdlOiBibG9iLFxyXG4gICAgICAgICAgICBzZXF1ZW5jZTogW11cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGtleSA9IGF3YWl0IHB1dENCTih0aGlzLmRiLCBjYm4pXHJcbiAgICAgICAgdGhpcy5jcmVhdGVDQk4ucHVibGlzaChrZXkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJldHVybkNsaWNrKCkge1xyXG4gICAgICAgIHRoaXMucmV0dXJuLnB1Ymxpc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgb25NYXhEaW1DaGFuZ2UoKSB7XHJcbiAgICAgICAgYXdhaXQgc2hvd0xvYWRpbmdJbmRpY2F0b3IoKVxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICBoaWRlTG9hZGluZ0luZGljYXRvcigpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvbk1heENvbG9yc0NoYW5nZSgpIHtcclxuICAgICAgICBhd2FpdCBzaG93TG9hZGluZ0luZGljYXRvcigpXHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgIGhpZGVMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlZHJhdygpIHtcclxuICAgICAgICB0aGlzLmltYWdlU2l6ZUNhbnZhcy53aWR0aCA9IHRoaXMuaW1hZ2VTaXplQ2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgdGhpcy5pbWFnZVNpemVDYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZVNpemVDYW52YXMuY2xpZW50SGVpZ2h0XHJcblxyXG4gICAgICAgIGNvbnN0IG1heERpbSA9IHRoaXMuZ2V0TWF4RGltKClcclxuICAgICAgICBjb25zdCBtYXhDb2xvcnMgPSB0aGlzLmdldE1heENvbG9ycygpXHJcbiAgICAgICAgY29uc3QgW3csIGhdID0gZml0KHRoaXMuaW1hZ2VDYW52YXMud2lkdGgsIHRoaXMuaW1hZ2VDYW52YXMuaGVpZ2h0LCBtYXhEaW0pXHJcblxyXG4gICAgICAgIHRoaXMuaW1hZ2VTY2FsZUNhbnZhcy53aWR0aCA9IHdcclxuICAgICAgICB0aGlzLmltYWdlU2NhbGVDYW52YXMuaGVpZ2h0ID0gaFxyXG4gICAgICAgIHRoaXMuaW1hZ2VTY2FsZUN0eC5kcmF3SW1hZ2UodGhpcy5pbWFnZUNhbnZhcywgMCwgMCwgdywgaClcclxuICAgICAgICBpbWFnaW5nLnF1YW50TWVkaWFuQ3V0KHRoaXMuaW1hZ2VTY2FsZUN0eCwgbWF4Q29sb3JzLCBjb2xvclJhbmdlVG9sZXJhbmNlKVxyXG4gICAgICAgIGNvbnN0IG1pblNjYWxlID0gTWF0aC5taW4odGhpcy5pbWFnZVNpemVDYW52YXMuY2xpZW50V2lkdGggLyB3LCB0aGlzLmltYWdlU2l6ZUNhbnZhcy5jbGllbnRIZWlnaHQgLyBoKVxyXG4gICAgICAgIGNvbnN0IHN3ID0gdyAqIG1pblNjYWxlXHJcbiAgICAgICAgY29uc3Qgc2ggPSBoICogbWluU2NhbGVcclxuICAgICAgICBjb25zdCB4ID0gKHRoaXMuaW1hZ2VTaXplQ2FudmFzLndpZHRoIC0gc3cpIC8gMlxyXG4gICAgICAgIGNvbnN0IHkgPSAodGhpcy5pbWFnZVNpemVDYW52YXMuaGVpZ2h0IC0gc2gpIC8gMlxyXG4gICAgICAgIHRoaXMuaW1hZ2VTaXplQ3R4LmRyYXdJbWFnZSh0aGlzLmltYWdlU2NhbGVDYW52YXMsIHgsIHksIHN3LCBzaClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldE1heERpbSgpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBtYXhEaW0gPSBwYXJzZUludCh0aGlzLm1heERpbUlucHV0LnZhbHVlKVxyXG4gICAgICAgIGlmICghbWF4RGltKSB7XHJcbiAgICAgICAgICAgIG1heERpbSA9IGRlZmF1bHRNYXhEaW1cclxuICAgICAgICAgICAgdGhpcy5tYXhEaW1JbnB1dC52YWx1ZSA9IG1heERpbS50b1N0cmluZygpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbWF4RGltXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRNYXhDb2xvcnMoKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgbWF4Q29sb3JzID0gcGFyc2VJbnQodGhpcy5tYXhDb2xvcnNJbnB1dC52YWx1ZSlcclxuICAgICAgICBpZiAoIW1heENvbG9ycykge1xyXG4gICAgICAgICAgICBtYXhDb2xvcnMgPSBkZWZhdWx0TWF4Q29sb3JzXHJcbiAgICAgICAgICAgIHRoaXMubWF4Q29sb3JzSW5wdXQudmFsdWUgPSBtYXhDb2xvcnMudG9TdHJpbmcoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1heENvbG9yc1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBMaWJyYXJ5VWkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsaWJyYXJ5RGl2ID0gZG9tLmJ5SWQoXCJsaWJyYXJ5VWlcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmV0dXJuQnV0dG9uID0gZG9tLmJ5SWQoXCJyZXR1cm5Gcm9tTGlicmFyeUJ1dHRvblwiKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IGltYWdlQ2hvc2VuID0gbmV3IENoYW5uZWw8W3N0cmluZ10+KClcclxuICAgIHB1YmxpYyByZWFkb25seSBjYW5jZWwgPSBuZXcgQ2hhbm5lbDxbXT4oKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMucmV0dXJuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uUmV0dXJuQ2xpY2soKSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIHRoaXMubGlicmFyeURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25SZXR1cm5DbGljaygpIHtcclxuICAgICAgICB0aGlzLmxpYnJhcnlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuY2FuY2VsLnB1Ymxpc2goKVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBQbGF5VWkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBkYjogSURCRGF0YWJhc2VcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FudmFzID0gZG9tLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWxldHRlRGl2ID0gZG9tLmJ5SWQoXCJwYWxldHRlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVFbnRyeVRlbXBsYXRlID0gZG9tLmJ5SWQoXCJwYWxldHRlRW50cnlcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwbGF5VWlEaXYgPSBkb20uYnlJZChcInBsYXlVaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZXR1cm5CdXR0b24gPSBkb20uYnlJZChcInJldHVybkJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZUNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VDdHggPSB0aGlzLmltYWdlQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2VsbENhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2VsbEN0eCA9IHRoaXMuY2VsbENhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVDdHggPSB0aGlzLnBhbGV0dGVDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb2xvckNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29sb3JDdHggPSB0aGlzLmNvbG9yQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUga2V5OiBudW1iZXIgPSAwXHJcbiAgICBwcml2YXRlIGNvbXBsZXRlID0gZmFsc2VcclxuICAgIHB1YmxpYyByZWFkb25seSByZXR1cm4gPSBuZXcgQ2hhbm5lbDxbdm9pZF0+KClcclxuICAgIHByaXZhdGUgaW1hZ2VXaWR0aCA9IDBcclxuICAgIHByaXZhdGUgaW1hZ2VIZWlnaHQgPSAwXHJcbiAgICBwcml2YXRlIGNlbnRlclggPSAwXHJcbiAgICBwcml2YXRlIGNlbnRlclkgPSAwXHJcbiAgICBwcml2YXRlIHpvb20gPSAxXHJcbiAgICBwcml2YXRlIGRyYWcgPSBmYWxzZVxyXG4gICAgcHJpdmF0ZSBjb2xvckRyYWcgPSBmYWxzZVxyXG4gICAgcHJpdmF0ZSB0b3VjaFpvb206IG51bWJlciA9IDBcclxuICAgIHByaXZhdGUgdG91Y2gxU3RhcnQ6IGdlby5WZWMyIHwgbnVsbCA9IG51bGxcclxuICAgIHByaXZhdGUgdG91Y2gyU3RhcnQ6IGdlby5WZWMyIHwgbnVsbCA9IG51bGxcclxuICAgIHByaXZhdGUgdG91Y2gxQ3VyOiBnZW8uVmVjMiB8IG51bGwgPSBudWxsXHJcbiAgICBwcml2YXRlIHRvdWNoMkN1cjogZ2VvLlZlYzIgfCBudWxsID0gbnVsbFxyXG4gICAgcHJpdmF0ZSBkcmFnTGFzdCA9IG5ldyBnZW8uVmVjMigwLCAwKVxyXG5cclxuICAgIC8vIGxpc3Qgb2YgY29sb3JzIHVzZSB1c2VkIGluIGltYWdlXHJcbiAgICBwcml2YXRlIHBhbGV0dGU6IG51bWJlcltdID0gW11cclxuXHJcbiAgICAvLyBpbWFnZSBvdmVybGF5IG9mIHBpeGVsIHRvIHBhbGV0dGUgaW5kZXhcclxuICAgIHByaXZhdGUgcGFsZXR0ZU92ZXJsYXk6IG51bWJlcltdID0gW11cclxuXHJcbiAgICAvLyBwYWxldHRlIG92ZXJsYXkgb2YgcGFsZXR0ZSBpbmRleCB0byBsaXN0IG9mIHBpeGVscyBoYXZpbmcgdGhhdCBjb2xvclxyXG4gICAgcHJpdmF0ZSBwaXhlbE92ZXJsYXk6IFNldDxudW1iZXI+W10gPSBbXVxyXG5cclxuICAgIHByaXZhdGUgc2VsZWN0ZWRQYWxldHRlSW5kZXg6IG51bWJlciA9IC0xXHJcbiAgICBwcml2YXRlIHNlcXVlbmNlOiBudW1iZXJbXSA9IFtdXHJcblxyXG4gICAgY29uc3RydWN0b3IoZGI6IElEQkRhdGFiYXNlKSB7XHJcbiAgICAgICAgdGhpcy5kYiA9IGRiXHJcblxyXG4gICAgICAgIGlmICghdGhpcy5jdHgpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FudmFzIGVsZW1lbnQgbm90IHN1cHBvcnRlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIGUgPT4gdGhpcy5vblBvaW50ZXJEb3duKGUpKVxyXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVybW92ZVwiLCBlID0+IHRoaXMub25Qb2ludGVyTW92ZShlKSlcclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcnVwXCIsIGUgPT4gdGhpcy5vblBvaW50ZXJVcChlKSlcclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwid2hlZWxcIiwgZSA9PiB0aGlzLm9uV2hlZWwoZSkpXHJcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgZSA9PiB0aGlzLm9uUmVzaXplKGUpKVxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLnBsYXlVaURpdiwgXCJjbGlja1wiLCBcIi5wYWxldHRlLWVudHJ5XCIsIChlKSA9PiB0aGlzLm9uUGFsZXR0ZUVudHJ5Q2xpY2soZSBhcyBNb3VzZUV2ZW50KSlcclxuICAgICAgICB0aGlzLnJldHVybkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5vblJldHVybigpKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyBzaG93KGtleTogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5rZXkgPSBrZXlcclxuICAgICAgICB0aGlzLnBsYXlVaURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5jYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHRcclxuICAgICAgICB0aGlzLmNvbXBsZXRlID0gZmFsc2VcclxuICAgICAgICB0aGlzLnpvb20gPSAxXHJcbiAgICAgICAgdGhpcy5kcmFnID0gZmFsc2VcclxuICAgICAgICB0aGlzLnRvdWNoWm9vbSA9IDBcclxuXHJcbiAgICAgICAgY29uc3QgcGljID0gYXdhaXQgZ2V0Q0JOKHRoaXMuZGIsIGtleSlcclxuICAgICAgICBjb25zdCBpbWcgPSBhd2FpdCBkb20ubG9hZEltYWdlKFVSTC5jcmVhdGVPYmplY3RVUkwocGljLmltYWdlKSlcclxuICAgICAgICB0aGlzLmltYWdlV2lkdGggPSBpbWcud2lkdGhcclxuICAgICAgICB0aGlzLmltYWdlSGVpZ2h0ID0gaW1nLmhlaWdodFxyXG5cclxuICAgICAgICAvLyBjYXB0dXJlIGltYWdlXHJcbiAgICAgICAgdGhpcy5pbWFnZUNhbnZhcy53aWR0aCA9IHRoaXMuaW1hZ2VXaWR0aFxyXG4gICAgICAgIHRoaXMuaW1hZ2VDYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZUhlaWdodFxyXG4gICAgICAgIHRoaXMuaW1hZ2VDdHguZHJhd0ltYWdlKGltZywgMCwgMCwgdGhpcy5pbWFnZUNhbnZhcy53aWR0aCwgdGhpcy5pbWFnZUNhbnZhcy5oZWlnaHQpXHJcblxyXG4gICAgICAgIC8vIGRlYnVnIC0gc2hvdyBwYXNzZWQgaW1hZ2VcclxuICAgICAgICAvLyB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuaW1hZ2VXaWR0aFxyXG4gICAgICAgIC8vIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2VIZWlnaHRcclxuICAgICAgICAvLyB0aGlzLmN0eC5kcmF3SW1hZ2UodGhpcy5pbWFnZUNhbnZhcywgMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodClcclxuICAgICAgICAvLyByZXR1cm5cclxuXHJcbiAgICAgICAgY29uc3QgaW1nRGF0YSA9IHRoaXMuaW1hZ2VDdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodClcclxuICAgICAgICB0aGlzLnBhbGV0dGUgPSBleHRyYWN0UGFsZXR0ZShpbWdEYXRhKVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZU92ZXJsYXkgPSBjcmVhdGVQYWxldHRlT3ZlcmxheShpbWdEYXRhLCB0aGlzLnBhbGV0dGUpXHJcbiAgICAgICAgdGhpcy5waXhlbE92ZXJsYXkgPSBjcmVhdGVQaXhlbE92ZXJsYXkodGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0LCB0aGlzLnBhbGV0dGUsIHRoaXMucGFsZXR0ZU92ZXJsYXkpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlID0gcHJ1bmVQYWxsZXRlKHRoaXMucGFsZXR0ZSwgdGhpcy5waXhlbE92ZXJsYXksIG1heEJhY2tncm91bmRQaXhlbHMsIHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCwgdGhpcy5jb2xvckN0eClcclxuICAgICAgICB0aGlzLnBhbGV0dGVPdmVybGF5ID0gY3JlYXRlUGFsZXR0ZU92ZXJsYXkoaW1nRGF0YSwgdGhpcy5wYWxldHRlKVxyXG4gICAgICAgIHRoaXMucGl4ZWxPdmVybGF5ID0gY3JlYXRlUGl4ZWxPdmVybGF5KHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCwgdGhpcy5wYWxldHRlLCB0aGlzLnBhbGV0dGVPdmVybGF5KVxyXG4gICAgICAgIHRoaXMuY3JlYXRlUGFsZXR0ZVVpKClcclxuICAgICAgICBkcmF3Q2VsbEltYWdlKHRoaXMuY2VsbEN0eCwgdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0LCB0aGlzLnBhbGV0dGVPdmVybGF5KVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZUNhbnZhcy53aWR0aCA9IHRoaXMuY2VsbENhbnZhcy53aWR0aFxyXG4gICAgICAgIHRoaXMucGFsZXR0ZUNhbnZhcy5oZWlnaHQgPSB0aGlzLmNlbGxDYW52YXMuaGVpZ2h0XHJcbiAgICAgICAgdGhpcy5jZW50ZXJYID0gdGhpcy5jYW52YXMud2lkdGggLyAyXHJcbiAgICAgICAgdGhpcy5jZW50ZXJZID0gdGhpcy5jYW52YXMuaGVpZ2h0IC8gMlxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuXHJcbiAgICAgICAgaWYgKHRoaXMucGFsZXR0ZSkge1xyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeSgwKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZXF1ZW5jZSA9IHBpYy5zZXF1ZW5jZVxyXG4gICAgICAgIGZvciAoY29uc3QgeHkgb2YgdGhpcy5zZXF1ZW5jZSkge1xyXG4gICAgICAgICAgICBjb25zdCBwYWxldHRlSWR4ID0gdGhpcy5wYWxldHRlT3ZlcmxheVt4eV1cclxuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gaW1hZ2luZy51bmZsYXQoeHksIHRoaXMuaW1hZ2VXaWR0aClcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RQYWxldHRlRW50cnkocGFsZXR0ZUlkeClcclxuICAgICAgICAgICAgdGhpcy50cnlGaWxsQ2VsbCh4LCB5KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZGVidWcgLSBmaWxsIGFsbCBwaXhlbHMgYnV0IGZpcnN0IHVuZmlsbGVkXHJcbiAgICAgICAgLy8ge1xyXG4gICAgICAgIC8vICAgICBsZXQgc2tpcHBlZDEgPSBmYWxzZVxyXG4gICAgICAgIC8vICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaW1hZ2VIZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIC8vICAgICAgICAgbGV0IHlPZmZzZXQgPSB5ICogdGhpcy5pbWFnZVdpZHRoXHJcbiAgICAgICAgLy8gICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuaW1hZ2VXaWR0aDsgKyt4KSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgY29uc3QgcGFsZXR0ZUlkeCA9IHRoaXMucGFsZXR0ZU92ZXJsYXlbZmxhdCh4LCB5LCB0aGlzLmltYWdlV2lkdGgpXVxyXG4gICAgICAgIC8vICAgICAgICAgICAgIGlmIChwYWxldHRlSWR4ID09PSAtMSkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIC8vICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgbGV0IHhPZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgIC8vICAgICAgICAgICAgIGlmICghc2tpcHBlZDEgJiYgdGhpcy5wYWxldHRlT3ZlcmxheVt4T2Zmc2V0XSAhPT0gLTEpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgc2tpcHBlZDEgPSB0cnVlXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAgICAgICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeShwYWxldHRlSWR4KVxyXG4gICAgICAgIC8vICAgICAgICAgICAgIHRoaXMudHJ5RmlsbENlbGwoeCwgeSlcclxuXHJcbiAgICAgICAgLy8gICAgICAgICB9XHJcbiAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgIC8vIC8vIGRlYnVnIC0gZ28gc3RyYWlnaHQgdG8gZW5kIHN0YXRlXHJcbiAgICAgICAgLy8gZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmltYWdlSGVpZ2h0OyArK3kpIHtcclxuICAgICAgICAvLyAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLmltYWdlV2lkdGg7ICsreCkge1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy5zZXF1ZW5jZS5wdXNoKGZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKSlcclxuICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgLy8gcmFuZC5zaHVmZmxlKHRoaXMuc2VxdWVuY2UpXHJcbiAgICAgICAgLy8gdGhpcy5leGVjRG9uZVNlcXVlbmNlKClcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgaGlkZSgpIHtcclxuICAgICAgICB0aGlzLnBsYXlVaURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJldHVybigpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnJldHVybi5wdWJsaXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmVzaXplKF86IFVJRXZlbnQpIHtcclxuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY3JlYXRlUGFsZXR0ZVVpKCkge1xyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0aGlzLnBhbGV0dGVEaXYpXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnBhbGV0dGUubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgW3IsIGcsIGJdID0gY29sb3IudW5wYWNrKHRoaXMucGFsZXR0ZVtpXSlcclxuICAgICAgICAgICAgY29uc3QgbHVtID0gY2FsY0x1bWluYW5jZShyLCBnLCBiKVxyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMucGFsZXR0ZUVudHJ5VGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCBlbnRyeURpdiA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5wYWxldHRlLWVudHJ5XCIpIGFzIEhUTUxFbGVtZW50XHJcbiAgICAgICAgICAgIGVudHJ5RGl2LnRleHRDb250ZW50ID0gYCR7aSArIDF9YFxyXG4gICAgICAgICAgICBlbnRyeURpdi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb2xvcjJSR0JBU3R5bGUociwgZywgYilcclxuICAgICAgICAgICAgZW50cnlEaXYuc3R5bGUuY29sb3IgPSBsdW0gPCAuNSA/IFwid2hpdGVcIiA6IFwiYmxhY2tcIlxyXG4gICAgICAgICAgICB0aGlzLnBhbGV0dGVEaXYuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Qb2ludGVyRG93bihlOiBQb2ludGVyRXZlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghZS5pc1ByaW1hcnkpIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDJTdGFydCA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICAgICAgdGhpcy50b3VjaFpvb20gPSB0aGlzLnpvb21cclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhcmUgd2Ugb3ZlcnRvcCBvZiBhIHNlbGVjdGVkIHBhbGV0dGUgZW50cnkgcGl4ZWw/XHJcbiAgICAgICAgdGhpcy5jYW52YXMuc2V0UG9pbnRlckNhcHR1cmUoZS5wb2ludGVySWQpXHJcbiAgICAgICAgdGhpcy5kcmFnID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuZHJhZ0xhc3QgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgdGhpcy50b3VjaDFTdGFydCA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICB0aGlzLnRvdWNoWm9vbSA9IHRoaXMuem9vbVxyXG5cclxuICAgICAgICAvLyB0cmFuc2Zvcm0gY2xpY2sgY29vcmRpbmF0ZXMgdG8gY2FudmFzIGNvb3JkaW5hdGVzXHJcbiAgICAgICAgY29uc3QgW3gsIHldID0gdGhpcy5jYW52YXMyQ2VsbChlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICBpZiAodGhpcy50cnlGaWxsQ2VsbCh4LCB5KSkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbG9yRHJhZyA9IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb252ZXJ0IGEgY2FudmFzIGNvb3JkaW5hdGUgaW50byBhIGNlbGwgY29vcmRpbmF0ZVxyXG4gICAgICogQHBhcmFtIHggeCBjYW52YXMgY29vcmRpbmF0ZVxyXG4gICAgICogQHBhcmFtIHkgeSBjYW52YXMgY29vcmRpbmF0ZVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNhbnZhczJDZWxsKHg6IG51bWJlciwgeTogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICAgICAgY29uc3QgaW52VHJhbnNmb3JtID0gdGhpcy5jdHguZ2V0VHJhbnNmb3JtKCkuaW52ZXJzZSgpXHJcbiAgICAgICAgY29uc3QgZG9tUHQgPSBpbnZUcmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQoeyB4OiB4LCB5OiB5IH0pXHJcbiAgICAgICAgcmV0dXJuIGNlbGwySW1hZ2UoZG9tUHQueCwgZG9tUHQueSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUG9pbnRlclVwKGU6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGlmICghZS5pc1ByaW1hcnkpIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDJTdGFydCA9IG51bGxcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudG91Y2gxU3RhcnQgPSBudWxsXHJcbiAgICAgICAgdGhpcy5kcmFnID0gZmFsc2VcclxuICAgICAgICB0aGlzLmNvbG9yRHJhZyA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy50b3VjaFpvb20gPSB0aGlzLnpvb21cclxuICAgICAgICB0aGlzLnNhdmVTdGF0ZSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzYXZlU3RhdGUoKSB7XHJcbiAgICAgICAgY29uc3QgYmxvYiA9IGF3YWl0IGltYWdpbmcuY2FudmFzMkJsb2IodGhpcy5pbWFnZUNhbnZhcywgaW1hZ2VNaW1lVHlwZSlcclxuICAgICAgICBhd2FpdCBwdXRDQk4odGhpcy5kYiwgeyBpbWFnZTogYmxvYiwgc2VxdWVuY2U6IHRoaXMuc2VxdWVuY2UgfSwgdGhpcy5rZXkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblBvaW50ZXJNb3ZlKGU6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUuaXNQcmltYXJ5KSB7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gxQ3VyID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gyQ3VyID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGFuZGxlIHBpbmNoIHpvb21cclxuICAgICAgICBpZiAodGhpcy50b3VjaDJTdGFydCAmJiB0aGlzLnRvdWNoMVN0YXJ0KSB7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gxQ3VyID0gdGhpcy50b3VjaDFDdXIgPz8gdGhpcy50b3VjaDFTdGFydFxyXG4gICAgICAgICAgICB0aGlzLnRvdWNoMkN1ciA9IHRoaXMudG91Y2gyQ3VyID8/IHRoaXMudG91Y2gyU3RhcnRcclxuICAgICAgICAgICAgY29uc3QgZDAgPSB0aGlzLnRvdWNoMVN0YXJ0LnN1Yih0aGlzLnRvdWNoMlN0YXJ0KS5sZW5ndGgoKVxyXG4gICAgICAgICAgICBjb25zdCBkMSA9IHRoaXMudG91Y2gxQ3VyLnN1Yih0aGlzLnRvdWNoMkN1cikubGVuZ3RoKClcclxuICAgICAgICAgICAgdGhpcy56b29tID0gdGhpcy50b3VjaFpvb20gKiBkMSAvIGQwXHJcbiAgICAgICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuZHJhZykge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IHRoaXMuY3R4LmdldFRyYW5zZm9ybSgpLmludmVyc2UoKVxyXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gZ2VvLlZlYzIuZnJvbURPTSh0cmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQodGhpcy5kcmFnTGFzdCkpXHJcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgY29uc3QgZW5kID0gZ2VvLlZlYzIuZnJvbURPTSh0cmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQocG9zaXRpb24pKVxyXG4gICAgICAgIGNvbnN0IGRlbHRhID0gZW5kLnN1YihzdGFydClcclxuXHJcbiAgICAgICAgLy8gY2hlY2sgZm9yIGRyYWcgb3ZlciBwYWxldHRlIGNvbG9yXHJcbiAgICAgICAgY29uc3QgW3gsIHldID0gdGhpcy5jYW52YXMyQ2VsbChlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICBpZiAodGhpcy5jb2xvckRyYWcgJiYgdGhpcy5wYWxldHRlT3ZlcmxheVtpbWFnaW5nLmZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKV0gPT09IHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudHJ5RmlsbENlbGwoeCwgeSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoTWF0aC5hYnMoZGVsdGEueCkgPiAzIHx8IE1hdGguYWJzKGRlbHRhLnkpID4gMykge1xyXG4gICAgICAgICAgICB0aGlzLmNlbnRlclggLT0gZGVsdGEueFxyXG4gICAgICAgICAgICB0aGlzLmNlbnRlclkgLT0gZGVsdGEueVxyXG4gICAgICAgICAgICB0aGlzLmRyYWdMYXN0ID0gcG9zaXRpb25cclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uV2hlZWwoZTogV2hlZWxFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUuZGVsdGFZID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnpvb20gKj0gLjVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlLmRlbHRhWSA8IDApIHtcclxuICAgICAgICAgICAgdGhpcy56b29tICo9IDJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUGFsZXR0ZUVudHJ5Q2xpY2soZTogTW91c2VFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBlLnRhcmdldCBhcyBFbGVtZW50XHJcbiAgICAgICAgbGV0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgoZW50cnkpXHJcblxyXG4gICAgICAgIGlmIChpZHggPT09IHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXgpIHtcclxuICAgICAgICAgICAgaWR4ID0gLTFcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2VsZWN0UGFsZXR0ZUVudHJ5KGlkeClcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHRydWUgaWYgc3BlY2lmaWVkIGNlbGwgaXMgdW5maWxsZWQsIGFuZCBoYXMgc3BlY2lmaWVkIHBhbGV0dGUgaW5kZXhcclxuICAgICAqIEBwYXJhbSB4IHggY2VsbCBjb29yZGluYXRlXHJcbiAgICAgKiBAcGFyYW0geSB5IGNlbGwgY29vcmRpbmF0ZVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNoZWNrQ2VsbCh4OiBudW1iZXIsIHk6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgIC8vIGlmIGFscmVhZHkgZmlsbGVkLCBkbyBub3RoaW5nXHJcbiAgICAgICAgY29uc3QgZmxhdFhZID0gaW1hZ2luZy5mbGF0KHgsIHksIHRoaXMuaW1hZ2VXaWR0aClcclxuICAgICAgICBjb25zdCBwaXhlbHMgPSB0aGlzLnBpeGVsT3ZlcmxheVt0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4XVxyXG4gICAgICAgIHJldHVybiBwaXhlbHMuaGFzKGZsYXRYWSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGF0dGVtcHQgdG8gZmlsbCB0aGUgc3BlY2lmaWVkIGNlbGxcclxuICAgICAqIHJldHVybnMgdHJ1ZSBpZiBmaWxsZWQsIGZhbHNlIGlmIGNlbGwgaXMgbm90IHNlbGVjdGVkIHBhbGV0dGUgb3IgYWxyZWFkeSBmaWxsZWRcclxuICAgICAqIEBwYXJhbSB4IFxyXG4gICAgICogQHBhcmFtIHkgXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgdHJ5RmlsbENlbGwoeDogbnVtYmVyLCB5OiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgICAgICAvLyBpZiBhbHJlYWR5IGZpbGxlZCwgZG8gbm90aGluZ1xyXG4gICAgICAgIGlmICghdGhpcy5jaGVja0NlbGwoeCwgeSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBbciwgZywgYl0gPSBjb2xvci51bnBhY2sodGhpcy5wYWxldHRlW3RoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXhdKVxyXG4gICAgICAgIGNvbnN0IFtjeCwgY3ldID0gaW1hZ2UyQ2VsbCh4LCB5KVxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguZmlsbFN0eWxlID0gY29sb3IyUkdCQVN0eWxlKHIsIGcsIGIpXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5maWxsUmVjdChjeCwgY3ksIGNlbGxTaXplLCBjZWxsU2l6ZSlcclxuXHJcbiAgICAgICAgLy8gcmVtb3ZlIHRoZSBwaXhlbCBmcm9tIG92ZXJsYXlcclxuICAgICAgICBjb25zdCBwaXhlbHMgPSB0aGlzLnBpeGVsT3ZlcmxheVt0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4XVxyXG4gICAgICAgIGNvbnN0IGZsYXRYWSA9IGltYWdpbmcuZmxhdCh4LCB5LCB0aGlzLmltYWdlV2lkdGgpXHJcbiAgICAgICAgcGl4ZWxzLmRlbGV0ZShmbGF0WFkpXHJcbiAgICAgICAgdGhpcy5zZXF1ZW5jZS5wdXNoKGZsYXRYWSlcclxuXHJcbiAgICAgICAgaWYgKHBpeGVscy5zaXplID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBtYXJrIHBhbGV0dGUgZW50cnkgYXMgZG9uZVxyXG4gICAgICAgIGNvbnN0IGVudHJ5ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5wYWxldHRlLWVudHJ5XCIpW3RoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXhdXHJcbiAgICAgICAgZW50cnkuaW5uZXJIVE1MID0gXCImY2hlY2s7XCJcclxuICAgICAgICBjb25zdCBuZXh0UGFsZXR0ZUlkeCA9IHRoaXMuZmluZE5leHRVbmZpbmlzaGVkRW50cnkodGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleClcclxuICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeShuZXh0UGFsZXR0ZUlkeClcclxuXHJcbiAgICAgICAgaWYgKG5leHRQYWxldHRlSWR4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYWxsIGNvbG9ycyBjb21wbGV0ZSEgc2hvdyBhbmltYXRpb24gb2YgdXNlciBjb2xvcmluZyBvcmlnaW5hbCBpbWFnZVxyXG4gICAgICAgIHRoaXMuZXhlY0RvbmVTZXF1ZW5jZSgpXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNlbGVjdFBhbGV0dGVFbnRyeShpZHg6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXggPSBpZHhcclxuXHJcbiAgICAgICAgY29uc3QgZW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5wYWxldHRlLWVudHJ5XCIpKVxyXG4gICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgICAgICBlbnRyeS5jbGFzc0xpc3QucmVtb3ZlKFwic2VsZWN0ZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpZHggIT09IC0xKSB7XHJcbiAgICAgICAgICAgIGVudHJpZXNbaWR4XS5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGNsZWFyIHBhbGV0dGUgY2FudmFzXHJcbiAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5wYWxldHRlQ3R4XHJcbiAgICAgICAgY29uc3QgY2FudmFzID0gdGhpcy5wYWxldHRlQ2FudmFzXHJcbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpXHJcblxyXG4gICAgICAgIGlmIChpZHggPT09IC0xKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoaWdobGlnaHQgcmVtYWluaW5nIHBpeGVscyBmb3IgdGhpcyBjb2xvclxyXG4gICAgICAgIGNvbnN0IGZvbnQgPSBjdHguZm9udFxyXG4gICAgICAgIGN0eC5mb250ID0gXCJib2xkIDE2cHggYXJpYWxcIlxyXG4gICAgICAgIGNvbnN0IHRleHRIZWlnaHQgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoXHJcbiAgICAgICAgY29uc3QgY2R4eSA9IGNlbGxTaXplIC8gMlxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHBpeGVsIG9mIHRoaXMucGl4ZWxPdmVybGF5W2lkeF0pIHtcclxuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gaW1hZ2UyQ2VsbCguLi5pbWFnaW5nLnVuZmxhdChwaXhlbCwgdGhpcy5pbWFnZVdpZHRoKSlcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yMlJHQkFTdHlsZSgxOTEsIDE5MSwgMTkxLCAyNTUpXHJcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCh4LCB5LCBjZWxsU2l6ZSwgY2VsbFNpemUpXHJcblxyXG4gICAgICAgICAgICAvLyBkcmF3IGxhYmVsXHJcbiAgICAgICAgICAgIGNvbnN0IGxhYmVsID0gYCR7aWR4ICsgMX1gXHJcbiAgICAgICAgICAgIGNvbnN0IG1ldHJpY3MgPSBjdHgubWVhc3VyZVRleHQobGFiZWwpXHJcbiAgICAgICAgICAgIGNvbnN0IGN4ID0geCArIGNkeHkgLSBtZXRyaWNzLndpZHRoIC8gMlxyXG4gICAgICAgICAgICBjb25zdCBjeSA9IHkgKyBjZHh5ICsgdGV4dEhlaWdodCAvIDJcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiYmxhY2tcIlxyXG4gICAgICAgICAgICBjdHguZmlsbFRleHQobGFiZWwsIGN4LCBjeSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGN0eC5mb250ID0gZm9udFxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlZHJhdygpIHtcclxuICAgICAgICAvLyBub3RlIC0gY2xlYXIgaXMgc3ViamVjdCB0byB0cmFuc2Zvcm1cclxuICAgICAgICBjb25zdCBjdHggPSB0aGlzLmN0eFxyXG4gICAgICAgIHRoaXMuY3R4LnJlc2V0VHJhbnNmb3JtKClcclxuICAgICAgICBjb25zdCBodyA9IHRoaXMuY2FudmFzLndpZHRoIC8gMiAvIHRoaXMuem9vbVxyXG4gICAgICAgIGNvbnN0IGhoID0gdGhpcy5jYW52YXMuaGVpZ2h0IC8gMiAvIHRoaXMuem9vbVxyXG5cclxuICAgICAgICB0aGlzLmNlbnRlclggPSBtYXRoLmNsYW1wKHRoaXMuY2VudGVyWCwgMCwgdGhpcy5jZWxsQ2FudmFzLndpZHRoKVxyXG4gICAgICAgIHRoaXMuY2VudGVyWSA9IG1hdGguY2xhbXAodGhpcy5jZW50ZXJZLCAwLCB0aGlzLmNlbGxDYW52YXMuaGVpZ2h0KVxyXG4gICAgICAgIHRoaXMuY3R4LnNjYWxlKHRoaXMuem9vbSwgdGhpcy56b29tKVxyXG4gICAgICAgIHRoaXMuY3R4LnRyYW5zbGF0ZSgtdGhpcy5jZW50ZXJYICsgaHcsIC10aGlzLmNlbnRlclkgKyBoaClcclxuXHJcbiAgICAgICAgdmFyIGludlRyYW5zZm9ybSA9IGN0eC5nZXRUcmFuc2Zvcm0oKS5pbnZlcnNlKClcclxuICAgICAgICBjb25zdCB0bCA9IGludlRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh7IHg6IDAsIHk6IDAgfSlcclxuICAgICAgICBjb25zdCBiciA9IGludlRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh7IHg6IHRoaXMuY2FudmFzLndpZHRoLCB5OiB0aGlzLmNhbnZhcy5oZWlnaHQgfSlcclxuICAgICAgICBjdHguY2xlYXJSZWN0KHRsLngsIHRsLnksIGJyLnggLSB0bC54LCBici55IC0gdGwueSlcclxuICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuY2VsbENhbnZhcywgMCwgMClcclxuICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMucGFsZXR0ZUNhbnZhcywgMCwgMClcclxuICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuY29sb3JDYW52YXMsIDAsIDApXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmaW5kTmV4dFVuZmluaXNoZWRFbnRyeShpOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLnBhbGV0dGUubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgaWkgPSBpICUgdGhpcy5wYWxldHRlLmxlbmd0aFxyXG4gICAgICAgICAgICBpZiAodGhpcy5waXhlbE92ZXJsYXlbaV0uc2l6ZSA+IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpaVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gLTFcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGV4ZWNEb25lU2VxdWVuY2UoKSB7XHJcbiAgICAgICAgLy8gc2V0IGFzIGRvbmVcclxuICAgICAgICB0aGlzLmNvbXBsZXRlID0gdHJ1ZVxyXG5cclxuICAgICAgICB0aGlzLmN0eC5yZXNldFRyYW5zZm9ybSgpXHJcblxyXG4gICAgICAgIC8vIGRyYXcgb25lIHBpeGVsIGF0IGEgdGltZSB0byBjb2xvciBjYW52YXNcclxuICAgICAgICAvLyBvdnJsYXkgb250byBjYW52YXNcclxuICAgICAgICBjb25zdCBkYXRhID0gdGhpcy5pbWFnZUN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0KS5kYXRhXHJcbiAgICAgICAgdGhpcy5jdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpXHJcbiAgICAgICAgY29uc3Qgem9vbSA9IE1hdGgubWluKHRoaXMuY2FudmFzLmNsaWVudFdpZHRoIC8gdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHQgLyB0aGlzLmltYWdlSGVpZ2h0KVxyXG4gICAgICAgIHRoaXMuY3R4LnNjYWxlKHpvb20sIHpvb20pXHJcblxyXG4gICAgICAgIC8vIGNvbG9yIGFzIHVzZXIgZGlkXHJcbiAgICAgICAgY29uc3QgcGl4ZWwgPSBuZXcgSW1hZ2VEYXRhKDEsIDEpXHJcbiAgICAgICAgY29uc3QgcGl4ZWxEYXRhID0gcGl4ZWwuZGF0YVxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguY2FudmFzLndpZHRoID0gdGhpcy5pbWFnZVdpZHRoXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5jYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZUhlaWdodFxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY29sb3JDYW52YXMud2lkdGgsIHRoaXMuY29sb3JDYW52YXMuaGVpZ2h0KVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc2VxdWVuY2UubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgeHkgPSB0aGlzLnNlcXVlbmNlW2ldXHJcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IGltYWdpbmcudW5mbGF0KHh5LCB0aGlzLmltYWdlV2lkdGgpXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHh5ICogNFxyXG4gICAgICAgICAgICBwaXhlbERhdGFbMF0gPSBkYXRhW29mZnNldF1cclxuICAgICAgICAgICAgcGl4ZWxEYXRhWzFdID0gZGF0YVtvZmZzZXQgKyAxXVxyXG4gICAgICAgICAgICBwaXhlbERhdGFbMl0gPSBkYXRhW29mZnNldCArIDJdXHJcbiAgICAgICAgICAgIHBpeGVsRGF0YVszXSA9IDI1NVxyXG5cclxuICAgICAgICAgICAgdGhpcy5jb2xvckN0eC5wdXRJbWFnZURhdGEocGl4ZWwsIHgsIHkpXHJcbiAgICAgICAgICAgIHRoaXMuY3R4LmRyYXdJbWFnZSh0aGlzLmNvbG9yQ2FudmFzLCAwLCAwKVxyXG4gICAgICAgICAgICBpZiAoaSAlIDY0ID09IDApIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHV0aWwud2FpdCgwKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBHYWxsZXJ5VWkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBkYjogSURCRGF0YWJhc2VcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdWkgPSBkb20uYnlJZChcImdhbGxlcnlVaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYm5zRGl2ID0gZG9tLmJ5SWQoXCJjYm5zXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGdhbGxlcnlBY3F1aXJlSW1hZ2VCdXR0b24gPSBkb20uYnlJZChcImdhbGxlcnlBY3F1aXJlSW1hZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdGVtcGxhdGUgPSBkb20uYnlJZChcImdhbGxlcnlFbnRyeVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgc2hvd0FjcXVpcmVJbWFnZSA9IG5ldyBDaGFubmVsPFt2b2lkXT4oKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IGNiblNlbGVjdGVkID0gbmV3IENoYW5uZWw8W251bWJlcl0+KClcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihkYjogSURCRGF0YWJhc2UpIHtcclxuICAgICAgICB0aGlzLmRiID0gZGJcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgYXN5bmMgc2hvdygpIHtcclxuICAgICAgICB0aGlzLnVpLmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKHRoaXMudWksIFwiY2xpY2tcIiwgXCIuZ2FsbGVyeS1lbnRyeVwiLCAoZXZ0KSA9PiB0aGlzLm9uRW50cnlDbGljayhldnQpKVxyXG4gICAgICAgIHRoaXMuZ2FsbGVyeUFjcXVpcmVJbWFnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5zaG93QWNxdWlyZUltYWdlLnB1Ymxpc2goKSlcclxuXHJcbiAgICAgICAgLy8gY2xlYXIgY3VycmVudCB1aVxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0aGlzLmNibnNEaXYpXHJcblxyXG4gICAgICAgIGNvbnN0IGt2cyA9IGF3YWl0IGdldEFsbENCTnModGhpcy5kYilcclxuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIGNibl0gb2Yga3ZzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy50ZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IGVudHJ5RGl2ID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLmdhbGxlcnktZW50cnlcIikgYXMgSFRNTEltYWdlRWxlbWVudFxyXG4gICAgICAgICAgICBlbnRyeURpdi5zcmMgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGNibi5pbWFnZSlcclxuICAgICAgICAgICAgZW50cnlEaXYuZGF0YXNldFtcImtleVwiXSA9IGtleS50b1N0cmluZygpXHJcbiAgICAgICAgICAgIHRoaXMuY2Juc0Rpdi5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy51aS5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkVudHJ5Q2xpY2soZXZ0OiBFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IGltZyA9IGV2dC50YXJnZXQgYXMgSFRNTEltYWdlRWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGtleSA9IHBhcnNlSW50KGltZy5kYXRhc2V0W1wia2V5XCJdIHx8IFwiXCIpXHJcbiAgICAgICAgaWYgKCFrZXkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNiblNlbGVjdGVkLnB1Ymxpc2goa2V5KVxyXG4gICAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xyXG4gICAgY29uc3QgZGIgPSBhd2FpdCBvcGVuREIoKVxyXG4gICAgY29uc3QgYWNxdWlyZVVpID0gbmV3IEFjcXVpcmVVaSgpXHJcbiAgICBjb25zdCBzaXplVWkgPSBuZXcgSW1hZ2VTaXplVWkoZGIpXHJcbiAgICBjb25zdCBwbGF5VWkgPSBuZXcgUGxheVVpKGRiKVxyXG4gICAgY29uc3QgZ2FsbGVyeVVpID0gbmV3IEdhbGxlcnlVaShkYilcclxuXHJcbiAgICBhY3F1aXJlVWkuaW1hZ2VBY3F1aXJlZC5zdWJjcmliZShvbkltYWdlQWNxdWlyZWQpXHJcbiAgICBhY3F1aXJlVWkuc2hvd0dhbGxlcnkuc3ViY3JpYmUoc2hvd0dhbGxlcnkpXHJcbiAgICBzaXplVWkuY3JlYXRlQ0JOLnN1YmNyaWJlKHNob3dQbGF5KVxyXG4gICAgc2l6ZVVpLnJldHVybi5zdWJjcmliZShzaG93QWNxdWlyZSlcclxuICAgIHBsYXlVaS5yZXR1cm4uc3ViY3JpYmUoc2hvd0FjcXVpcmUpXHJcbiAgICBnYWxsZXJ5VWkuc2hvd0FjcXVpcmVJbWFnZS5zdWJjcmliZShzaG93QWNxdWlyZSlcclxuICAgIGdhbGxlcnlVaS5jYm5TZWxlY3RlZC5zdWJjcmliZShzaG93UGxheSlcclxuXHJcbiAgICAvLyBpbml0aWFsbHkgc2hvdyBhY3F1aXJlIHVpXHJcbiAgICBhY3F1aXJlVWkuc2hvdygpXHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gb3BlbkRCKCk6IFByb21pc2U8SURCRGF0YWJhc2U+IHtcclxuICAgICAgICAvLyBvcGVuIC8gc2V0dXAgZGJcclxuICAgICAgICAvLyBhd2FpdCBpbmRleGVkREIuZGVsZXRlRGF0YWJhc2UoXCJjYm5cIilcclxuICAgICAgICBjb25zdCByZXEgPSBpbmRleGVkREIub3BlbihcImNiblwiLCAxKVxyXG4gICAgICAgIHJlcS5hZGRFdmVudExpc3RlbmVyKFwiYmxvY2tlZFwiLCBfID0+IGRiQmxvY2tlZCgpKVxyXG4gICAgICAgIHJlcS5hZGRFdmVudExpc3RlbmVyKFwidXBncmFkZW5lZWRlZFwiLCBldiA9PiB1cGdyYWRlREIoZXYpKVxyXG4gICAgICAgIGNvbnN0IGRiID0gYXdhaXQgaWRiLndhaXRSZXF1ZXN0KHJlcSlcclxuICAgICAgICByZXR1cm4gZGJcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBvbkltYWdlQWNxdWlyZWQoaW1nOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIGF3YWl0IHNob3dMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgICAgICBhY3F1aXJlVWkuaGlkZSgpXHJcbiAgICAgICAgc2l6ZVVpLnNob3coaW1nKVxyXG4gICAgICAgIGhpZGVMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzaG93QWNxdWlyZSgpIHtcclxuICAgICAgICBoaWRlQWxsKClcclxuICAgICAgICBhY3F1aXJlVWkuc2hvdygpXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2hvd0dhbGxlcnkoKSB7XHJcbiAgICAgICAgaGlkZUFsbCgpXHJcbiAgICAgICAgZ2FsbGVyeVVpLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIHNob3dQbGF5KGtleTogbnVtYmVyKSB7XHJcbiAgICAgICAgYXdhaXQgc2hvd0xvYWRpbmdJbmRpY2F0b3IoKVxyXG4gICAgICAgIGhpZGVBbGwoKVxyXG4gICAgICAgIHBsYXlVaS5zaG93KGtleSlcclxuICAgICAgICBoaWRlTG9hZGluZ0luZGljYXRvcigpXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaGlkZUFsbCgpIHtcclxuICAgICAgICBwbGF5VWkuaGlkZSgpXHJcbiAgICAgICAgc2l6ZVVpLmhpZGUoKVxyXG4gICAgICAgIGFjcXVpcmVVaS5oaWRlKClcclxuICAgICAgICBnYWxsZXJ5VWkuaGlkZSgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RQYWxldHRlKGltZ0RhdGE6IEltYWdlRGF0YSk6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgZGF0YSB9ID0gaW1nRGF0YVxyXG4gICAgY29uc3Qgcm93UGl0Y2ggPSB3aWR0aCAqIDRcclxuXHJcbiAgICAvLyBmaW5kIHVuaXF1ZSBjb2xvcnMsIGNyZWF0ZSBlbnRyeSBmb3IgZWFjaFxyXG4gICAgY29uc3QgcGFsZXR0ZSA9IG5ldyBTZXQ8bnVtYmVyPigpXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiByb3dQaXRjaFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICAvLyBwYWNrIGNvbG9yIHRvIGEgdW5pcXVlIHZhbHVlXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4ICogNFxyXG4gICAgICAgICAgICBjb25zdCByID0gZGF0YVtvZmZzZXRdXHJcbiAgICAgICAgICAgIGNvbnN0IGcgPSBkYXRhW29mZnNldCArIDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGIgPSBkYXRhW29mZnNldCArIDJdXHJcbiAgICAgICAgICAgIGNvbnN0IGEgPSBkYXRhW29mZnNldCArIDNdXHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gY29sb3IucGFjayhyLCBnLCBiLCBhKVxyXG4gICAgICAgICAgICBwYWxldHRlLmFkZCh2YWx1ZSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFsuLi5wYWxldHRlXVxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGFuIG92ZXJsYXkgdGhhdCBtYXBzIGVhY2ggcGl4ZWwgdG8gdGhlIGluZGV4IG9mIGl0cyBwYWxldHRlIGVudHJ5XHJcbiAqIEBwYXJhbSBpbWdEYXRhIGltYWdlIGRhdGFcclxuICogQHBhcmFtIHBhbGV0dGUgcGFsZXR0ZSBjb2xvcnNcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZVBhbGV0dGVPdmVybGF5KGltZ0RhdGE6IEltYWdlRGF0YSwgcGFsZXR0ZTogbnVtYmVyW10pOiBudW1iZXJbXSB7XHJcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQsIGRhdGEgfSA9IGltZ0RhdGFcclxuICAgIGNvbnN0IHBhbGV0dGVNYXAgPSBhcnJheS5tYXBJbmRpY2VzKHBhbGV0dGUpXHJcbiAgICBjb25zdCByb3dQaXRjaCA9IHdpZHRoICogNFxyXG4gICAgY29uc3Qgb3ZlcmxheSA9IGFycmF5LnVuaWZvcm0oLTEsIHdpZHRoICogaGVpZ2h0KVxyXG5cclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHJvd1BpdGNoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIC8vIHBhY2sgY29sb3IgdG8gYSB1bmlxdWUgdmFsdWVcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHggKiA0XHJcbiAgICAgICAgICAgIGNvbnN0IHIgPSBkYXRhW29mZnNldF1cclxuICAgICAgICAgICAgY29uc3QgZyA9IGRhdGFbb2Zmc2V0ICsgMV1cclxuICAgICAgICAgICAgY29uc3QgYiA9IGRhdGFbb2Zmc2V0ICsgMl1cclxuICAgICAgICAgICAgY29uc3QgYSA9IGRhdGFbb2Zmc2V0ICsgM11cclxuICAgICAgICAgICAgY29uc3QgcmdiYSA9IGNvbG9yLnBhY2sociwgZywgYiwgYSlcclxuICAgICAgICAgICAgY29uc3QgaWR4ID0gcGFsZXR0ZU1hcC5nZXQocmdiYSkgPz8gLTFcclxuICAgICAgICAgICAgb3ZlcmxheVt5ICogd2lkdGggKyB4XSA9IGlkeFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gb3ZlcmxheVxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGFuIG92ZXJsYXkgdGhhdCBtYXBzIGVhY2ggcGFsZXR0ZSBlbnRyeSB0byBhIGxpc3Qgb2YgcGl4ZWxzIHdpdGggaXRzIGNvbG9yXHJcbiAqIEBwYXJhbSBpbWdEYXRhIFxyXG4gKiBAcGFyYW0gcGFsZXR0ZSBcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZVBpeGVsT3ZlcmxheSh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcGFsZXR0ZTogbnVtYmVyW10sIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSk6IFNldDxudW1iZXI+W10ge1xyXG4gICAgY29uc3Qgb3ZlcmxheSA9IGFycmF5LmdlbmVyYXRlKHBhbGV0dGUubGVuZ3RoLCAoKSA9PiBuZXcgU2V0PG51bWJlcj4oKSlcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHdpZHRoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIC8vIHBhY2sgY29sb3IgdG8gYSB1bmlxdWUgdmFsdWVcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgcGFsZXR0ZUlkeCA9IHBhbGV0dGVPdmVybGF5W29mZnNldF1cclxuICAgICAgICAgICAgaWYgKHBhbGV0dGVJZHggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBmbGF0Q29vcmQgPSBpbWFnaW5nLmZsYXQoeCwgeSwgd2lkdGgpXHJcbiAgICAgICAgICAgIG92ZXJsYXlbcGFsZXR0ZUlkeF0uYWRkKGZsYXRDb29yZClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG92ZXJsYXlcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGNhbGNMdW1pbmFuY2UocjogbnVtYmVyLCBnOiBudW1iZXIsIGI6IG51bWJlcikge1xyXG4gICAgY29uc3QgbCA9IDAuMjEyNiAqIChyIC8gMjU1KSArIDAuNzE1MiAqIChnIC8gMjU1KSArIDAuMDcyMiAqIChiIC8gMjU1KVxyXG4gICAgcmV0dXJuIGxcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0NlbGxJbWFnZShjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSkge1xyXG4gICAgY29uc3QgY2VsbEltYWdlV2lkdGggPSB3aWR0aCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG4gICAgY29uc3QgY2VsbEltYWdlSGVpZ2h0ID0gaGVpZ2h0ICogKGNlbGxTaXplICsgMSkgKyAxXHJcblxyXG4gICAgLy8gc2l6ZSBjYW52YXNcclxuICAgIGN0eC5jYW52YXMud2lkdGggPSBjZWxsSW1hZ2VXaWR0aFxyXG4gICAgY3R4LmNhbnZhcy5oZWlnaHQgPSBjZWxsSW1hZ2VIZWlnaHRcclxuXHJcbiAgICAvLyBkcmF3IGhvcml6b250YWwgZ3JpZCBsaW5lc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gaGVpZ2h0OyArK2kpIHtcclxuICAgICAgICBjdHguc3Ryb2tlUmVjdCgwLCBpICogKGNlbGxTaXplICsgMSksIGNlbGxJbWFnZVdpZHRoLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgdmVydGljYWwgZ3JpZCBsaW5lc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gd2lkdGg7ICsraSkge1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KGkgKiAoY2VsbFNpemUgKyAxKSwgMCwgMSwgY2VsbEltYWdlSGVpZ2h0KVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgI3NcclxuICAgIGNvbnN0IGZvbnQgPSBjdHguZm9udFxyXG4gICAgY3R4LmZvbnQgPSBcIjE2cHggYXJpYWxcIlxyXG4gICAgY29uc3QgdGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGhcclxuICAgIGNvbnN0IGNkeHkgPSBjZWxsU2l6ZSAvIDJcclxuXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiB3aWR0aFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgICAgICBjb25zdCBwYWxldHRlSWR4ID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0XVxyXG4gICAgICAgICAgICBjb25zdCBsYWJlbCA9IGAke3BhbGV0dGVJZHggKyAxfWBcclxuICAgICAgICAgICAgY29uc3QgbWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dChsYWJlbClcclxuICAgICAgICAgICAgY29uc3QgY3ggPSB4ICogKGNlbGxTaXplICsgMSkgKyBjZHh5ICsgMSAtIG1ldHJpY3Mud2lkdGggLyAyXHJcbiAgICAgICAgICAgIGNvbnN0IGN5ID0geSAqIChjZWxsU2l6ZSArIDEpICsgY2R4eSArIDEgKyB0ZXh0SGVpZ2h0IC8gMlxyXG4gICAgICAgICAgICBjdHguZmlsbFRleHQobGFiZWwsIGN4LCBjeSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmZvbnQgPSBmb250XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpdCh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgbWF4U2l6ZTogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICBpZiAod2lkdGggPiBoZWlnaHQgJiYgd2lkdGggPiBtYXhTaXplKSB7XHJcbiAgICAgICAgaGVpZ2h0ID0gbWF4U2l6ZSAqIGhlaWdodCAvIHdpZHRoXHJcbiAgICAgICAgcmV0dXJuIFtNYXRoLmZsb29yKG1heFNpemUpLCBNYXRoLmZsb29yKGhlaWdodCldXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGhlaWdodCA+IHdpZHRoICYmIGhlaWdodCA+IG1heFNpemUpIHtcclxuICAgICAgICB3aWR0aCA9IG1heFNpemUgKiB3aWR0aCAvIGhlaWdodFxyXG4gICAgICAgIHJldHVybiBbTWF0aC5mbG9vcih3aWR0aCksIE1hdGguZmxvb3IobWF4U2l6ZSldXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFtNYXRoLmZsb29yKHdpZHRoKSwgTWF0aC5mbG9vcihoZWlnaHQpXVxyXG59XHJcblxyXG4vKipcclxuICAgKiBDb252ZXJ0IGFuIGltYWdlIHggb3IgeSBjb29yZGluYXRlIHRvIHRvcCBvciBsZWZ0IG9mIGNibiBjZWxsIGNvbnRhaW5pbmcgdGhhdCBwaXhlbFxyXG4gICAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gICAqL1xyXG5mdW5jdGlvbiBpbWFnZTJDZWxsQ29vcmQoY29vcmQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gY29vcmQgKiAoY2VsbFNpemUgKyAxKSArIDFcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnQgYSBjYm4geCBvciB5IGNvb3JkaW5hdGUgdG8gdG9wIG9yIGxlZnQgb2YgY2JuIGNlbGwgY29udGFpbmluZyB0aGF0IHBpeGVsXHJcbiAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gKi9cclxuZnVuY3Rpb24gY2VsbDJJbWFnZUNvb3JkKGNvb3JkOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoKGNvb3JkIC0gMSkgLyAoY2VsbFNpemUgKyAxKSlcclxufVxyXG5cclxuLyoqXHJcbiAgICogQ29udmVydCBhbiBpbWFnZSB4IG9yIHkgY29vcmRpbmF0ZSB0byB0b3Agb3IgbGVmdCBvZiBjYm4gY2VsbCBjb250YWluaW5nIHRoYXQgcGl4ZWxcclxuICAgKiBAcGFyYW0gY29vcmQgeCBvciB5IGNvb3JkaW5hdGVcclxuICAgKi9cclxuZnVuY3Rpb24gaW1hZ2UyQ2VsbCh4OiBudW1iZXIsIHk6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgcmV0dXJuIFtpbWFnZTJDZWxsQ29vcmQoeCksIGltYWdlMkNlbGxDb29yZCh5KV1cclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnQgYSBjYm4geCBvciB5IGNvb3JkaW5hdGUgdG8gdG9wIG9yIGxlZnQgb2YgY2JuIGNlbGwgY29udGFpbmluZyB0aGF0IHBpeGVsXHJcbiAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gKi9cclxuZnVuY3Rpb24gY2VsbDJJbWFnZSh4OiBudW1iZXIsIHk6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgcmV0dXJuIFtjZWxsMkltYWdlQ29vcmQoeCksIGNlbGwySW1hZ2VDb29yZCh5KV1cclxufVxyXG5cclxuLyoqXHJcbiAqIGNvbnZlcnQgcmdiYSBjb29yZGluYXRlcyB0byBhIHN0eWxlIHN0cmluZ1xyXG4gKiBAcGFyYW0gciByZWRcclxuICogQHBhcmFtIGcgZ3JlZW5cclxuICogQHBhcmFtIGIgYmx1ZVxyXG4gKiBAcGFyYW0gYSBhbHBoYVxyXG4gKi9cclxuZnVuY3Rpb24gY29sb3IyUkdCQVN0eWxlKHI6IG51bWJlciwgZzogbnVtYmVyLCBiOiBudW1iZXIsIGE6IG51bWJlciA9IDI1NSkge1xyXG4gICAgcmV0dXJuIGByZ2JhKCR7cn0sICR7Z30sICR7Yn0sICR7YSAvIDI1NX0pYFxyXG59XHJcblxyXG5mdW5jdGlvbiBwcnVuZVBhbGxldGUocGFsZXR0ZTogbnVtYmVyW10sIHBpeGVsT3ZlcmxheTogU2V0PG51bWJlcj5bXSwgbWF4UGl4ZWxzOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCk6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IGluZGljZXNUb0tlZXAgPSBuZXcgU2V0PG51bWJlcj4oYXJyYXkuc2VxdWVuY2UoMCwgcGFsZXR0ZS5sZW5ndGgpKVxyXG5cclxuICAgIGN0eC5jYW52YXMud2lkdGggPSB3aWR0aCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG4gICAgY3R4LmNhbnZhcy5oZWlnaHQgPSBoZWlnaHQgKiAoY2VsbFNpemUgKyAxKSArIDFcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBpeGVsT3ZlcmxheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IHBpeGVscyA9IHBpeGVsT3ZlcmxheVtpXVxyXG4gICAgICAgIGlmIChwaXhlbHMuc2l6ZSA8IG1heFBpeGVscykge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGl0ZXIuYWxsKHBpeGVscywgeCA9PiAhaXNCb3JkZXJQaXhlbCguLi5pbWFnaW5nLnVuZmxhdCh4LCB3aWR0aCksIHdpZHRoLCBoZWlnaHQpKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZmlsbCB0aGVzZSBwaXhlbHMgaW4gaW1hZ2Ugd2l0aCBhcHByb3ByaWF0ZSBjb2xvclxyXG4gICAgICAgIGNvbnN0IFtyLCBnLCBiXSA9IGNvbG9yLnVucGFjayhwYWxldHRlW2ldKVxyXG4gICAgICAgIGZvciAoY29uc3QgeHkgb2YgcGl4ZWxzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IGltYWdpbmcudW5mbGF0KHh5LCB3aWR0aClcclxuICAgICAgICAgICAgY29uc3QgW2N4LCBjeV0gPSBpbWFnZTJDZWxsKHgsIHkpXHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjJSR0JBU3R5bGUociwgZywgYilcclxuICAgICAgICAgICAgY3R4LmZpbGxSZWN0KGN4LCBjeSwgY2VsbFNpemUsIGNlbGxTaXplKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaW5kaWNlc1RvS2VlcC5kZWxldGUoaSlcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBuZXdQYWxldHRlID0gWy4uLmluZGljZXNUb0tlZXBdLm1hcCh4ID0+IHBhbGV0dGVbeF0pXHJcbiAgICByZXR1cm4gbmV3UGFsZXR0ZVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc0JvcmRlclBpeGVsKHg6IG51bWJlciwgeTogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHggPT09IDAgfHwgeSA9PT0gMCB8fCB4ID09PSB3aWR0aCAtIDEgfHwgeSA9PT0gaGVpZ2h0IC0gMVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBzaG93TG9hZGluZ0luZGljYXRvcigpIHtcclxuICAgIGNvbnN0IGRpdiA9IGRvbS5ieUlkKFwibG9hZGluZ01vZGFsXCIpXHJcbiAgICBkaXYuaGlkZGVuID0gZmFsc2VcclxuICAgIGF3YWl0IHV0aWwud2FpdCgwKVxyXG59XHJcblxyXG5mdW5jdGlvbiBoaWRlTG9hZGluZ0luZGljYXRvcigpIHtcclxuICAgIGNvbnN0IGRpdiA9IGRvbS5ieUlkKFwibG9hZGluZ01vZGFsXCIpXHJcbiAgICBkaXYuaGlkZGVuID0gdHJ1ZVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiB1cGdyYWRlREIoZXZ0OiBJREJWZXJzaW9uQ2hhbmdlRXZlbnQpIHtcclxuICAgIGNvbnN0IGRiID0gKGV2dC50YXJnZXQgYXMgSURCT3BlbkRCUmVxdWVzdCkucmVzdWx0XHJcblxyXG4gICAgLy8gbm90ZSAtIGV2ZW50IGNvbnRhaW5zIG9sZCAvIG5ldyB2ZXJzaW9ucyBpZiByZXF1aXJlZFxyXG4gICAgLy8gdXBkYXRlIHRvIHRoZSBuZXcgdmVyc2lvbiAgICBcclxuICAgIGlmICghZGIub2JqZWN0U3RvcmVOYW1lcy5jb250YWlucyhwaWN0dXJlc09iamVjdFN0b3JlTmFtZSkpIHtcclxuICAgICAgICBkYi5jcmVhdGVPYmplY3RTdG9yZShwaWN0dXJlc09iamVjdFN0b3JlTmFtZSwgeyBhdXRvSW5jcmVtZW50OiB0cnVlIH0pXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRiQmxvY2tlZCgpIHtcclxuICAgIHNob3dFcnJvcihcIlBpY3R1cmUgZGF0YWJhc2UgbmVlZHMgdXBkYXRlZCwgYnV0IG90aGVyIHRhYnMgYXJlIG9wZW4gdGhhdCBhcmUgdXNpbmcgaXQuIFBsZWFzZSBjbG9zZSBhbGwgdGFicyBmb3IgdGhpcyB3ZWIgc2l0ZSBhbmQgdHJ5IGFnYWluLlwiKVxyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93RXJyb3IobWVzc2FnZTogc3RyaW5nKSB7XHJcbiAgICBjb25zdCBtb2RhbERpdiA9IGRvbS5ieUlkKFwiZXJyb3JNb2RhbFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgY29uc3QgbWVzc2FnZURpdiA9IGRvbS5ieUlkKFwiZXJyb3JNZXNzYWdlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBtb2RhbERpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgbWVzc2FnZURpdi50ZXh0Q29udGVudCA9IG1lc3NhZ2VcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gcHV0Q0JOKGRiOiBJREJEYXRhYmFzZSwgZGF0YTogQ0JOUGljdHVyZSwga2V5PzogbnVtYmVyKTogUHJvbWlzZTxudW1iZXI+IHtcclxuICAgIC8vIG5vdGUgc2FmYXJpIGNhbid0IHN0b3JlIGJsb2JzIHNvIG11c3QgY29udmVydCB0byBhcnJheUJ1ZmZlclxyXG4gICAgY29uc3QgZGJEYXRhID0gYXdhaXQgY2JuMmRiKGRhdGEpXHJcbiAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lLCBcInJlYWR3cml0ZVwiKVxyXG4gICAgY29uc3Qgc3RvcmUgPSB0eC5vYmplY3RTdG9yZShwaWN0dXJlc09iamVjdFN0b3JlTmFtZSlcclxuICAgIGNvbnN0IGsgPSBhd2FpdCBpZGIud2FpdFJlcXVlc3Qoc3RvcmUucHV0KGRiRGF0YSwga2V5KSkgYXMgbnVtYmVyXHJcbiAgICByZXR1cm4ga1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBnZXRDQk4oZGI6IElEQkRhdGFiYXNlLCBrZXk6IG51bWJlcik6IFByb21pc2U8Q0JOUGljdHVyZT4ge1xyXG4gICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbihwaWN0dXJlc09iamVjdFN0b3JlTmFtZSwgXCJyZWFkd3JpdGVcIilcclxuICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUocGljdHVyZXNPYmplY3RTdG9yZU5hbWUpXHJcbiAgICBjb25zdCBkYkRhdGEgPSBhd2FpdCBpZGIud2FpdFJlcXVlc3Qoc3RvcmUuZ2V0KGtleSkpIGFzIENCTlBpY3R1cmVEQlxyXG4gICAgY29uc3QgZGF0YSA9IGRiMmNibihkYkRhdGEpXHJcbiAgICBhd2FpdCBpZGIud2FpdFR4KHR4KVxyXG4gICAgcmV0dXJuIGRhdGFcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZ2V0QWxsQ0JOcyhkYjogSURCRGF0YWJhc2UpOiBQcm9taXNlPFtudW1iZXIsIENCTlBpY3R1cmVdW10+IHtcclxuICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24ocGljdHVyZXNPYmplY3RTdG9yZU5hbWUsIFwicmVhZHdyaXRlXCIpXHJcbiAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lKVxyXG4gICAgY29uc3QgZGF0YXMgPSBuZXcgQXJyYXk8W251bWJlciwgQ0JOUGljdHVyZV0+KClcclxuXHJcbiAgICBjb25zdCByZXEgPSBzdG9yZS5vcGVuQ3Vyc29yKClcclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgY29uc3QgY3Vyc29yID0gYXdhaXQgaWRiLndhaXRSZXF1ZXN0KHJlcSlcclxuICAgICAgICBpZiAoIWN1cnNvcikge1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qga2V5ID0gY3Vyc29yLmtleSBhcyBudW1iZXJcclxuICAgICAgICBjb25zdCBkYkRhdGEgPSBjdXJzb3IudmFsdWUgYXMgQ0JOUGljdHVyZURCXHJcbiAgICAgICAgY29uc3QgZGF0YSA9IGRiMmNibihkYkRhdGEpXHJcbiAgICAgICAgZGF0YXMucHVzaChba2V5LCBkYXRhXSlcclxuICAgICAgICBjdXJzb3IuY29udGludWUoKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBkYXRhc1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBjYm4yZGIoZGF0YTogQ0JOUGljdHVyZSk6IFByb21pc2U8Q0JOUGljdHVyZURCPiB7XHJcbiAgICBjb25zdCBidWZmZXIgPSBhd2FpdCBpZGIuYmxvYjJBcnJheUJ1ZmZlcihkYXRhLmltYWdlKVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBpbWFnZTogYnVmZmVyLFxyXG4gICAgICAgIHNlcXVlbmNlOiBkYXRhLnNlcXVlbmNlXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRiMmNibihkYXRhOiBDQk5QaWN0dXJlREIpOiBDQk5QaWN0dXJlIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgaW1hZ2U6IGlkYi5hcnJheUJ1ZmZlcjJCbG9iKGRhdGEuaW1hZ2UsIGltYWdlTWltZVR5cGUpLFxyXG4gICAgICAgIHNlcXVlbmNlOiBkYXRhLnNlcXVlbmNlXHJcbiAgICB9XHJcbn1cclxuXHJcbm1haW4oKSJdfQ==