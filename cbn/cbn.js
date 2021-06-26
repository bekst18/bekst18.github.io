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
        const preview = await createPreview(blob, []);
        const cbn = {
            image: blob,
            sequence: [],
            preview: preview
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
        const preview = await createPreview(blob, this.sequence);
        await putCBN(this.db, { image: blob, sequence: this.sequence, preview: preview }, this.key);
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
        dom.delegate(this.ui, "click", ".gallery-entry", (evt) => this.onEntryClick(evt));
        this.galleryAcquireImageButton.addEventListener("click", () => this.showAcquireImage.publish());
        dom.delegate(this.ui, "click", ".gallery-delete-button", (evt) => {
            this.onEntryDelete(evt);
        });
    }
    async show() {
        this.ui.hidden = false;
        await this.redraw();
    }
    hide() {
        this.ui.hidden = true;
    }
    onEntryClick(evt) {
        const target = evt.target;
        if (!target) {
            return;
        }
        if (!target.matches(".gallery-image")) {
            return;
        }
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
    async onEntryDelete(evt) {
        const div = evt.target.closest(".gallery-entry");
        if (!div) {
            return;
        }
        const key = parseInt(div.dataset["key"] || "");
        if (!key) {
            return;
        }
        await deleteCBN(this.db, key);
        await this.redraw();
    }
    async redraw() {
        // clear current ui
        dom.removeAllChildren(this.cbnsDiv);
        const kvs = await getAllCBNs(this.db);
        for (const [key, cbn] of kvs) {
            const fragment = this.template.content.cloneNode(true);
            const entryDiv = dom.bySelector(fragment, ".gallery-entry");
            const imageDiv = dom.bySelector(entryDiv, ".gallery-image");
            imageDiv.src = URL.createObjectURL(cbn.preview);
            entryDiv.dataset["key"] = key.toString();
            this.cbnsDiv.appendChild(fragment);
        }
    }
}
async function main() {
    const db = await openDB();
    await validateData(db);
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
    if (width >= height && width > maxSize) {
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
    if (evt.oldVersion < 1) {
        upgradeDB1(db);
    }
    evt.preventDefault();
}
async function upgradeDB1(db) {
    db.createObjectStore(picturesObjectStoreName, { autoIncrement: true });
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
async function deleteCBN(db, key) {
    // note safari can't store blobs so must convert to arrayBuffer
    const tx = db.transaction(picturesObjectStoreName, "readwrite");
    const store = tx.objectStore(picturesObjectStoreName);
    await idb.waitRequest(store.delete(key));
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
    const imageBuffer = await idb.blob2ArrayBuffer(data.image);
    const previewBuffer = await idb.blob2ArrayBuffer(data.preview);
    return {
        image: imageBuffer,
        preview: previewBuffer,
        sequence: data.sequence,
    };
}
function db2cbn(data) {
    return {
        image: idb.arrayBuffer2Blob(data.image, imageMimeType),
        preview: idb.arrayBuffer2Blob(data.preview, imageMimeType),
        sequence: data.sequence
    };
}
/**
 * created preview of CBN completed thus far
 * @param image image
 * @param sequence sequence of pixel indices completed thus far
 */
async function createPreview(image, sequence) {
    const url = URL.createObjectURL(image);
    const img = await dom.loadImage(url);
    const imageCanvas = document.createElement("canvas");
    imageCanvas.width = img.width;
    imageCanvas.height = img.height;
    const imageCtx = imageCanvas.getContext("2d");
    imageCtx.drawImage(img, 0, 0);
    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = img.width;
    previewCanvas.height = img.height;
    const previewCtx = previewCanvas.getContext("2d");
    const imageData = imageCtx.getImageData(0, 0, img.width, img.height);
    const previewData = previewCtx.getImageData(0, 0, img.width, img.height);
    for (const i of sequence) {
        previewData.data[i * 4] = imageData.data[i * 4];
        previewData.data[i * 4 + 1] = imageData.data[i * 4 + 1];
        previewData.data[i * 4 + 2] = imageData.data[i * 4 + 2];
        previewData.data[i * 4 + 3] = imageData.data[i * 4 + 3];
    }
    previewCtx.putImageData(previewData, 0, 0);
    const previewBlob = await imaging.canvas2Blob(previewCanvas);
    return previewBlob;
}
async function validateData(db) {
    // iterate over all cbn images, updgrade object structure if needed
    const kvs = await idb.getAllKeyValues(db, picturesObjectStoreName);
    const updatedKvs = new Array();
    for (const [key, cbn] of kvs) {
        if (cbn.preview) {
            continue;
        }
        const imageBlob = idb.arrayBuffer2Blob(cbn.image, imageMimeType);
        const previewBlob = await createPreview(imageBlob, cbn.sequence);
        cbn.preview = await idb.blob2ArrayBuffer(previewBlob);
        updatedKvs.push([key, cbn]);
    }
    const tx = db.transaction(picturesObjectStoreName, "readwrite");
    const store = tx.objectStore(picturesObjectStoreName);
    for (const [key, cbn] of updatedKvs) {
        await idb.waitRequest(store.put(cbn, key));
    }
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQTtBQUN2QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQUMvQyxPQUFPLEtBQUssS0FBSyxNQUFNLG9CQUFvQixDQUFBO0FBRTNDLDRDQUE0QztBQUM1QyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFFbkIsMkRBQTJEO0FBQzNELE1BQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFBO0FBRTlCLCtCQUErQjtBQUMvQixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQTtBQUVoQyx3QkFBd0I7QUFDeEIsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFBO0FBRXpCLHFCQUFxQjtBQUNyQixNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQTtBQUUzQixvQkFBb0I7QUFDcEIsTUFBTSx1QkFBdUIsR0FBRyxVQUFVLENBQUE7QUFFMUMsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFBO0FBRWpDLElBQUssVUFJSjtBQUpELFdBQUssVUFBVTtJQUNYLDJDQUFJLENBQUE7SUFDSiwyQ0FBSSxDQUFBO0lBQ0oseURBQVcsQ0FBQTtBQUNmLENBQUMsRUFKSSxVQUFVLEtBQVYsVUFBVSxRQUlkO0FBY0QsTUFBTSxPQUFPO0lBQWI7UUFDcUIsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQTtJQWVsRSxDQUFDO0lBYlUsUUFBUSxDQUFDLFVBQWdDO1FBQzVDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFTSxXQUFXLENBQUMsVUFBZ0M7UUFDL0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVNLE9BQU8sQ0FBQyxHQUFHLElBQU87UUFDckIsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ3ZDLFVBQVUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFBO1NBQ3RCO0lBQ0wsQ0FBQztDQUNKO0FBRUQsTUFBTSxTQUFTO0lBb0JYO1FBbkJpQixXQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQXFCLENBQUE7UUFDeEQsZUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUE7UUFDbkIsb0JBQWUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBbUIsQ0FBQTtRQUM1RCx1QkFBa0IsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFzQixDQUFBO1FBQ3hFLHdCQUFtQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQW1CLENBQUE7UUFDdEUsZ0JBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBbUIsQ0FBQTtRQUN2RCxjQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQXFCLENBQUE7UUFDckQsZUFBVSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFzQixDQUFBO1FBQ3hELG9CQUFlLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBc0IsQ0FBQTtRQUNsRSxxQkFBZ0IsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFzQixDQUFBO1FBQ3BFLHFCQUFnQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQXNCLENBQUE7UUFDcEUsa0JBQWEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBc0IsQ0FBQTtRQUM5RCxjQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvQixrQkFBYSxHQUFHLElBQUksT0FBTyxFQUF1QixDQUFBO1FBQ2pELGNBQVMsR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFBO1FBQzNCLFdBQU0sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3pDLFFBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUUsQ0FBQTtRQUNwQyxnQkFBVyxHQUFHLElBQUksT0FBTyxFQUFVLENBQUE7UUFHL0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQzNDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDMUIsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzlFLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0UsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUN0RSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQ3hFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFDeEUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQTtRQUM1RSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFBO1FBQ3pFLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBRTdFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDaEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDM0MsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRU0sSUFBSTtRQUNQLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFBO1FBQzNDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFBO1FBQzdDLGlEQUFpRDtRQUNqRCxrREFBa0Q7SUFDdEQsQ0FBQztJQUVNLElBQUk7UUFDUCxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQTtJQUMxQyxDQUFDO0lBRU8sZUFBZSxDQUFDLEVBQWE7UUFDakMsRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQ3BCLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtJQUN2QixDQUFDO0lBRU8sWUFBWTs7UUFDaEIsSUFBSSxDQUFDLENBQUEsTUFBQSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssMENBQUUsTUFBTSxDQUFBLEVBQUU7WUFDL0IsT0FBTTtTQUNUO1FBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMxQixDQUFDO0lBRU8sVUFBVSxDQUFDLEVBQWE7O1FBQzVCLEVBQUUsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUNwQixFQUFFLENBQUMsY0FBYyxFQUFFLENBQUE7UUFFbkIsSUFBSSxDQUFDLENBQUEsTUFBQSxNQUFBLEVBQUUsYUFBRixFQUFFLHVCQUFGLEVBQUUsQ0FBRSxZQUFZLDBDQUFFLEtBQUssMENBQUUsTUFBTSxDQUFBLEVBQUU7WUFDbEMsT0FBTTtTQUNUO1FBRUQsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMxQixDQUFDO0lBRU8sS0FBSyxDQUFDLFNBQVM7UUFDbkIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ25DLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFBO1FBQ3BELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFBO1FBQ3RELE1BQU0sTUFBTSxHQUFHLE1BQU0sU0FBUyxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUM7WUFDckQsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFO1lBQ3pGLEtBQUssRUFBRSxLQUFLO1NBQ2YsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQTtJQUNsQyxDQUFDO0lBRU8sS0FBSyxDQUFDLFVBQVU7UUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFO1lBQ3hCLE9BQU07U0FDVDtRQUVELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBd0IsQ0FBQTtRQUNoRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDOUIsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7WUFDeEIsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFBO1NBQ2Y7UUFFRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQTtRQUMvRixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFBO1FBRTlFLDBCQUEwQjtRQUMxQixNQUFNLE1BQU0sR0FBRyxNQUFNLFNBQVMsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDO1lBQ3JELEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRTtZQUNuRyxLQUFLLEVBQUUsS0FBSztTQUNmLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQTtJQUNsQyxDQUFDO0lBRU8sWUFBWTtRQUNoQixJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0lBRU8sVUFBVTtRQUNkLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBd0IsQ0FBQTtRQUNoRCxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ04sT0FBTTtTQUNUO1FBRUQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQzlCLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFO1lBQ3hCLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQTtTQUNmO1FBRUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQTtJQUN0QyxDQUFDO0lBRU8sWUFBWTtRQUNoQixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUV6QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQXdCLENBQUE7UUFDaEQsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNOLE9BQU07U0FDVDtRQUVELE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ1IsT0FBTTtTQUNUO1FBRUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFBO1FBQzlDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQTtRQUNoRCxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQ3JCLENBQUM7SUFFTyxXQUFXLENBQUMsSUFBVTtRQUMxQixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUN6QixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVPLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBVztRQUNqQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUN6QixNQUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQTtRQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFBO1FBQy9CLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFTyxrQkFBa0I7UUFDdEIsR0FBRyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0NBQ0o7QUFFRCxNQUFNLFdBQVc7SUFlYixZQUFZLEVBQWU7UUFiVixpQkFBWSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFtQixDQUFBO1FBQ3hELGdCQUFXLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQXFCLENBQUE7UUFDcEQsbUJBQWMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBcUIsQ0FBQTtRQUMxRCw4QkFBeUIsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFzQixDQUFBO1FBQ2hGLGlCQUFZLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBc0IsQ0FBQTtRQUMvRCxxQkFBZ0IsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ25ELGtCQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUUsQ0FBQTtRQUN2RCxvQkFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQXNCLENBQUE7UUFDbEUsaUJBQVksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUUsQ0FBQTtRQUM5RCxnQkFBVyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdEMsY0FBUyxHQUFHLElBQUksT0FBTyxFQUFZLENBQUE7UUFDbkMsV0FBTSxHQUFHLElBQUksT0FBTyxFQUFNLENBQUE7UUFHdEMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUE7UUFDWixJQUFJLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLENBQUE7UUFDNUYsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVNLElBQUksQ0FBQyxXQUE4QjtRQUN0QyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDaEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUE7UUFDOUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUE7UUFDeEUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtRQUM5RSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDakIsQ0FBQztJQUVNLElBQUk7UUFDUCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7SUFDbkMsQ0FBQztJQUVPLEtBQUssQ0FBQyxxQkFBcUI7UUFDL0IsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUM1RSxNQUFNLE9BQU8sR0FBRyxNQUFNLGFBQWEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFN0MsTUFBTSxHQUFHLEdBQWU7WUFDcEIsS0FBSyxFQUFFLElBQUk7WUFDWCxRQUFRLEVBQUUsRUFBRTtZQUNaLE9BQU8sRUFBRSxPQUFPO1NBQ25CLENBQUE7UUFFRCxNQUFNLEdBQUcsR0FBRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQy9CLENBQUM7SUFFTyxhQUFhO1FBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVPLEtBQUssQ0FBQyxjQUFjO1FBQ3hCLE1BQU0sb0JBQW9CLEVBQUUsQ0FBQTtRQUM1QixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDYixvQkFBb0IsRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCO1FBQzNCLE1BQU0sb0JBQW9CLEVBQUUsQ0FBQTtRQUM1QixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDYixvQkFBb0IsRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFTyxNQUFNO1FBQ1YsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUE7UUFDN0QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUE7UUFFL0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQy9CLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNyQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMzRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUMvQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNoQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFELE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUMxRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN0RyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFBO1FBQ3ZCLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUE7UUFDdkIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDaEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ3BFLENBQUM7SUFFTyxTQUFTO1FBQ2IsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNULE1BQU0sR0FBRyxhQUFhLENBQUE7WUFDdEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1NBQzdDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDakIsQ0FBQztJQUVPLFlBQVk7UUFDaEIsSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbkQsSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNaLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQTtZQUM1QixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUE7U0FDbkQ7UUFFRCxPQUFPLFNBQVMsQ0FBQTtJQUNwQixDQUFDO0NBQ0o7QUFFRCxNQUFNLFNBQVM7SUFNWDtRQUxpQixlQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNsQyxpQkFBWSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQTtRQUNuRCxnQkFBVyxHQUFHLElBQUksT0FBTyxFQUFZLENBQUE7UUFDckMsV0FBTSxHQUFHLElBQUksT0FBTyxFQUFNLENBQUE7UUFHdEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVELElBQUk7UUFDQSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7SUFDbEMsQ0FBQztJQUVPLGFBQWE7UUFDakIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO1FBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDekIsQ0FBQztDQUNKO0FBRUQsTUFBTSxNQUFNO0lBNkNSLFlBQVksRUFBZTtRQTNDVixXQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQXNCLENBQUE7UUFDaEQsUUFBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBRSxDQUFBO1FBQ25DLGVBQVUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBbUIsQ0FBQTtRQUNsRCx5QkFBb0IsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBd0IsQ0FBQTtRQUN0RSxjQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQW1CLENBQUE7UUFDaEQsaUJBQVksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBc0IsQ0FBQTtRQUM1RCxnQkFBVyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDOUMsYUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBRSxDQUFBO1FBQzdDLGVBQVUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzdDLFlBQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUUsQ0FBQTtRQUMzQyxrQkFBYSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDaEQsZUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBRSxDQUFBO1FBQ2pELGdCQUFXLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM5QyxhQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFFLENBQUE7UUFDdEQsUUFBRyxHQUFXLENBQUMsQ0FBQTtRQUNmLGFBQVEsR0FBRyxLQUFLLENBQUE7UUFDUixXQUFNLEdBQUcsSUFBSSxPQUFPLEVBQVUsQ0FBQTtRQUN0QyxlQUFVLEdBQUcsQ0FBQyxDQUFBO1FBQ2QsZ0JBQVcsR0FBRyxDQUFDLENBQUE7UUFDZixZQUFPLEdBQUcsQ0FBQyxDQUFBO1FBQ1gsWUFBTyxHQUFHLENBQUMsQ0FBQTtRQUNYLFNBQUksR0FBRyxDQUFDLENBQUE7UUFDUixTQUFJLEdBQUcsS0FBSyxDQUFBO1FBQ1osY0FBUyxHQUFHLEtBQUssQ0FBQTtRQUNqQixjQUFTLEdBQVcsQ0FBQyxDQUFBO1FBQ3JCLGdCQUFXLEdBQW9CLElBQUksQ0FBQTtRQUNuQyxnQkFBVyxHQUFvQixJQUFJLENBQUE7UUFDbkMsY0FBUyxHQUFvQixJQUFJLENBQUE7UUFDakMsY0FBUyxHQUFvQixJQUFJLENBQUE7UUFDakMsYUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFckMsbUNBQW1DO1FBQzNCLFlBQU8sR0FBYSxFQUFFLENBQUE7UUFFOUIsMENBQTBDO1FBQ2xDLG1CQUFjLEdBQWEsRUFBRSxDQUFBO1FBRXJDLHVFQUF1RTtRQUMvRCxpQkFBWSxHQUFrQixFQUFFLENBQUE7UUFFaEMseUJBQW9CLEdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDakMsYUFBUSxHQUFhLEVBQUUsQ0FBQTtRQUczQixJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQTtRQUVaLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO1NBQ2xEO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN4RCxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBZSxDQUFDLENBQUMsQ0FBQTtRQUN6RyxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUN0RSxDQUFDO0lBRU0sS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFXO1FBQ3pCLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFBO1FBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFBO1FBQzNDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFBO1FBQzdDLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBQ3JCLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO1FBQ2IsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUE7UUFDakIsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUE7UUFFbEIsTUFBTSxHQUFHLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN0QyxNQUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUMvRCxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUE7UUFDM0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFBO1FBRTdCLGdCQUFnQjtRQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFBO1FBQ3hDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUE7UUFDMUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVuRiw0QkFBNEI7UUFDNUIsc0NBQXNDO1FBQ3RDLHdDQUF3QztRQUN4QyxvRkFBb0Y7UUFDcEYsU0FBUztRQUVULE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDbkYsSUFBSSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2pFLElBQUksQ0FBQyxZQUFZLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQzVHLElBQUksQ0FBQyxPQUFPLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxtQkFBbUIsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ25JLElBQUksQ0FBQyxjQUFjLEdBQUcsb0JBQW9CLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNqRSxJQUFJLENBQUMsWUFBWSxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUM1RyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDdEIsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNuRixJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQTtRQUNoRCxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQTtRQUNsRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUNwQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFFYixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDZCxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUE7U0FDN0I7UUFFRCxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUE7UUFDNUIsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQzVCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDMUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDbEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ25DLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1NBQ3pCO1FBRUQsNkNBQTZDO1FBQzdDLElBQUk7UUFDSiwyQkFBMkI7UUFDM0IsbURBQW1EO1FBQ25ELDRDQUE0QztRQUM1QyxzREFBc0Q7UUFDdEQsa0ZBQWtGO1FBQ2xGLHVDQUF1QztRQUN2QywyQkFBMkI7UUFDM0IsZ0JBQWdCO1FBRWhCLHdDQUF3QztRQUN4QyxzRUFBc0U7UUFDdEUsa0NBQWtDO1FBQ2xDLDJCQUEyQjtRQUMzQixnQkFBZ0I7UUFFaEIsa0RBQWtEO1FBQ2xELHFDQUFxQztRQUVyQyxZQUFZO1FBQ1osUUFBUTtRQUNSLElBQUk7UUFFSixzQ0FBc0M7UUFDdEMsK0NBQStDO1FBQy9DLGtEQUFrRDtRQUNsRCwwREFBMEQ7UUFDMUQsUUFBUTtRQUNSLElBQUk7UUFFSiw4QkFBOEI7UUFDOUIsMEJBQTBCO0lBQzlCLENBQUM7SUFFTSxJQUFJO1FBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO0lBQ2hDLENBQUM7SUFFTyxRQUFRO1FBQ1osSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU8sUUFBUSxDQUFDLENBQVU7UUFDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUE7UUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUE7UUFDN0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ2pCLENBQUM7SUFFTyxlQUFlO1FBQ25CLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDdEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQzFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQy9DLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2xDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBcUIsQ0FBQTtZQUN0RixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBZ0IsQ0FBQTtZQUMxRSxRQUFRLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFBO1lBQ2pDLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pELFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFBO1lBQ25ELElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1NBQ3hDO0lBQ0wsQ0FBQztJQUVPLGFBQWEsQ0FBQyxDQUFlO1FBQ2pDLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNmLE9BQU07U0FDVDtRQUVELElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFO1lBQ2QsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDckQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFBO1lBQzFCLE9BQU07U0FDVDtRQUVELG9EQUFvRDtRQUNwRCxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMxQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNoQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNsRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNyRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUE7UUFFMUIsb0RBQW9EO1FBQ3BELE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNyRCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFBO1NBQ3hCO0lBQ0wsQ0FBQztJQUVEOzs7O09BSUc7SUFDSyxXQUFXLENBQUMsQ0FBUyxFQUFFLENBQVM7UUFDcEMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN0RCxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN6RCxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRU8sV0FBVyxDQUFDLENBQWU7UUFDL0IsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUU7WUFDZCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtZQUN2QixPQUFNO1NBQ1Q7UUFFRCxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDZixPQUFNO1NBQ1Q7UUFFRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtRQUN2QixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQTtRQUNqQixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUN0QixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUE7UUFDMUIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO0lBQ3BCLENBQUM7SUFFTyxLQUFLLENBQUMsU0FBUztRQUNuQixNQUFNLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUN2RSxNQUFNLE9BQU8sR0FBRyxNQUFNLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDL0YsQ0FBQztJQUVPLGFBQWEsQ0FBQyxDQUFlOztRQUNqQyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDZixPQUFNO1NBQ1Q7UUFFRCxJQUFJLENBQUMsQ0FBQyxTQUFTLEVBQUU7WUFDYixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtTQUN0RDthQUFNO1lBQ0gsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7U0FDdEQ7UUFFRCxvQkFBb0I7UUFDcEIsSUFBSSxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDdEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFBLElBQUksQ0FBQyxTQUFTLG1DQUFJLElBQUksQ0FBQyxXQUFXLENBQUE7WUFDbkQsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFBLElBQUksQ0FBQyxTQUFTLG1DQUFJLElBQUksQ0FBQyxXQUFXLENBQUE7WUFDbkQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQzFELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUN0RCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQTtZQUNwQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDYixPQUFNO1NBQ1Q7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNaLE9BQU07U0FDVDtRQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDbkQsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUN2RSxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDbkQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFNUIsb0NBQW9DO1FBQ3BDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNyRCxJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLG9CQUFvQixFQUFFO1lBQzFHLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3hCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTthQUNoQjtZQUVELE9BQU07U0FDVDtRQUVELElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNoRCxJQUFJLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUE7WUFDdkIsSUFBSSxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO1lBQ3hCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtTQUNoQjtJQUNMLENBQUM7SUFFTyxPQUFPLENBQUMsQ0FBYTtRQUN6QixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDZixPQUFNO1NBQ1Q7UUFFRCxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ2QsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUE7U0FDbEI7UUFFRCxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ2QsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUE7U0FDakI7UUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDakIsQ0FBQztJQUVPLG1CQUFtQixDQUFDLENBQWE7UUFDckMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2YsT0FBTTtTQUNUO1FBRUQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLE1BQWlCLENBQUE7UUFDakMsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUVwQyxJQUFJLEdBQUcsS0FBSyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7WUFDbkMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO1NBQ1g7UUFFRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSyxTQUFTLENBQUMsQ0FBUyxFQUFFLENBQVM7UUFDbEMsZ0NBQWdDO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUMzRCxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ssV0FBVyxDQUFDLENBQVMsRUFBRSxDQUFTO1FBQ3BDLGdDQUFnQztRQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDdkIsT0FBTyxLQUFLLENBQUE7U0FDZjtRQUVELE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRCxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUVsRCxnQ0FBZ0M7UUFDaEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUMzRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFMUIsSUFBSSxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRTtZQUNqQixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDYixPQUFPLElBQUksQ0FBQTtTQUNkO1FBRUQsNkJBQTZCO1FBQzdCLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQ3BGLEtBQUssQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO1FBQzNCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUM5RSxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFdkMsSUFBSSxjQUFjLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDdkIsT0FBTyxJQUFJLENBQUE7U0FDZDtRQUVELHNFQUFzRTtRQUN0RSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUN2QixPQUFPLElBQUksQ0FBQTtJQUNmLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxHQUFXO1FBQ2xDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxHQUFHLENBQUE7UUFFL0IsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBQ3ZFLEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxFQUFFO1lBQ3pCLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1NBQ3JDO1FBRUQsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDWixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtTQUN6QztRQUVELHVCQUF1QjtRQUN2QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFBO1FBQzNCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUE7UUFDakMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRWhELElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFFO1lBQ1osSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ2IsT0FBTTtTQUNUO1FBRUQsNENBQTRDO1FBQzVDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUE7UUFDckIsR0FBRyxDQUFDLElBQUksR0FBRyxpQkFBaUIsQ0FBQTtRQUM1QixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQTtRQUM3QyxNQUFNLElBQUksR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFBO1FBRXpCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN4QyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1lBQ3BFLEdBQUcsQ0FBQyxTQUFTLEdBQUcsZUFBZSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ25ELEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFFdEMsYUFBYTtZQUNiLE1BQU0sS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFBO1lBQzFCLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdEMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQTtZQUN2QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLFVBQVUsR0FBRyxDQUFDLENBQUE7WUFDcEMsR0FBRyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUE7WUFDdkIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1NBQzlCO1FBRUQsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7UUFDZixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDakIsQ0FBQztJQUVPLE1BQU07UUFDVix1Q0FBdUM7UUFDdkMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQTtRQUNwQixJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3pCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFBO1FBQzVDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFBO1FBRTdDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2pFLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2xFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBRTFELElBQUksWUFBWSxHQUFHLEdBQUcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUMvQyxNQUFNLEVBQUUsR0FBRyxZQUFZLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN0RCxNQUFNLEVBQUUsR0FBRyxZQUFZLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDdkYsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25ELEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsR0FBRyxD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SUFFN0MsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEdBQUcsRUFBRTtRQUMxQixJQUFJLEdBQUcsQ0FBQyxPQUFPLEVBQUU7WUFDYixTQUFRO1NBQ1g7UUFFRCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUNoRSxNQUFNLFdBQVcsR0FBRyxNQUFNLGFBQWEsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2hFLEdBQUcsQ0FBQyxPQUFPLEdBQUcsTUFBTSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDckQsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO0tBQ3hDO0lBRUQsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUMvRCxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUE7SUFDckQsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLFVBQVUsRUFBRTtRQUNqQyxNQUFNLEdBQUcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQVcsQ0FBQTtLQUN2RDtBQUNMLENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIlxyXG5pbXBvcnQgKiBhcyBkb20gZnJvbSBcIi4uL3NoYXJlZC9kb20uanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8zZC5qc1wiXHJcbmltcG9ydCAqIGFzIG1hdGggZnJvbSBcIi4uL3NoYXJlZC9tYXRoLmpzXCJcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tIFwiLi4vc2hhcmVkL3V0aWwuanNcIlxyXG5pbXBvcnQgKiBhcyBpdGVyIGZyb20gXCIuLi9zaGFyZWQvaXRlci5qc1wiXHJcbmltcG9ydCAqIGFzIGlkYiBmcm9tIFwiLi4vc2hhcmVkL2lkYi5qc1wiXHJcbmltcG9ydCAqIGFzIGltYWdpbmcgZnJvbSBcIi4uL3NoYXJlZC9pbWFnaW5nLmpzXCJcclxuaW1wb3J0ICogYXMgY29sb3IgZnJvbSBcIi4uL3NoYXJlZC9jb2xvci5qc1wiXHJcblxyXG4vLyBzaXplIHRoYXQgZWFjaCBpbWFnZSBwaXhlbCBpcyBibG93biB1cCB0b1xyXG5jb25zdCBjZWxsU2l6ZSA9IDMyXHJcblxyXG4vLyB0b2xlcmFuY2UgYmVmb3JlIHNwbGl0dGluZyBjb2xvcnMgLSBoaWdoZXIgPSBsZXNzIGNvbG9yc1xyXG5jb25zdCBjb2xvclJhbmdlVG9sZXJhbmNlID0gMzJcclxuXHJcbi8vIG1heCBiZyBwaXhlbHMgYmVmb3JlIHJlbW92YWxcclxuY29uc3QgbWF4QmFja2dyb3VuZFBpeGVscyA9IDEwMjRcclxuXHJcbi8vIGRlZmF1bHQgbWF4IGRpbWVuc2lvblxyXG5jb25zdCBkZWZhdWx0TWF4RGltID0gMTI4XHJcblxyXG4vLyBkZWZhdWx0IG1heCBjb2xvcnNcclxuY29uc3QgZGVmYXVsdE1heENvbG9ycyA9IDY0XHJcblxyXG4vLyBvYmplY3Qgc3RvcmUgbmFtZVxyXG5jb25zdCBwaWN0dXJlc09iamVjdFN0b3JlTmFtZSA9IFwicGljdHVyZXNcIlxyXG5cclxuY29uc3QgaW1hZ2VNaW1lVHlwZSA9IFwiaW1hZ2UvcG5nXCJcclxuXHJcbmVudW0gQ2FtZXJhTW9kZSB7XHJcbiAgICBOb25lLFxyXG4gICAgVXNlcixcclxuICAgIEVudmlyb25tZW50LFxyXG59XHJcblxyXG5pbnRlcmZhY2UgQ0JOUGljdHVyZSB7XHJcbiAgICBpbWFnZTogQmxvYlxyXG4gICAgcHJldmlldzogQmxvYlxyXG4gICAgc2VxdWVuY2U6IG51bWJlcltdXHJcbn1cclxuXHJcbmludGVyZmFjZSBDQk5QaWN0dXJlREIge1xyXG4gICAgaW1hZ2U6IEFycmF5QnVmZmVyXHJcbiAgICBwcmV2aWV3OiBBcnJheUJ1ZmZlclxyXG4gICAgc2VxdWVuY2U6IG51bWJlcltdXHJcbn1cclxuXHJcbmNsYXNzIENoYW5uZWw8VCBleHRlbmRzIGFueVtdPiB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN1YnNjcmliZXJzID0gbmV3IFNldDwoLi4uYXJnczogVCkgPT4gdm9pZD4oKVxyXG5cclxuICAgIHB1YmxpYyBzdWJjcmliZShzdWJzY3JpYmVyOiAoLi4uYXJnczogVCkgPT4gdm9pZCkge1xyXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlcnMuYWRkKHN1YnNjcmliZXIpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHVuc3Vic2NyaWJlKHN1YnNjcmliZXI6ICguLi5hcmdzOiBUKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVycy5kZWxldGUoc3Vic2NyaWJlcilcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgcHVibGlzaCguLi5hcmdzOiBUKTogdm9pZCB7XHJcbiAgICAgICAgZm9yIChjb25zdCBzdWJzY3JpYmVyIG9mIHRoaXMuc3Vic2NyaWJlcnMpIHtcclxuICAgICAgICAgICAgc3Vic2NyaWJlciguLi5hcmdzKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQWNxdWlyZVVpIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FtZXJhID0gZG9tLmJ5SWQoXCJjYW1lcmFcIikgYXMgSFRNTFZpZGVvRWxlbWVudFxyXG4gICAgcHJpdmF0ZSBjYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Ob25lXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFjcXVpcmVJbWFnZURpdiA9IGRvbS5ieUlkKFwiYWNxdWlyZUltYWdlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhcHR1cmVJbWFnZUJ1dHRvbiA9IGRvbS5ieUlkKFwiY2FwdHVyZUltYWdlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlQWNxdWlzaXRpb25EaXYgPSBkb20uYnlJZChcImltYWdlQWNxdWlzaXRpb25VaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmaWxlRHJvcEJveCA9IGRvbS5ieUlkKFwiZmlsZURyb3BCb3hcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmlsZUlucHV0ID0gZG9tLmJ5SWQoXCJmaWxlSW5wdXRcIikgYXMgSFRNTElucHV0RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmaWxlQnV0dG9uID0gZG9tLmJ5SWQoXCJmaWxlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHVzZUNhbWVyYUJ1dHRvbiA9IGRvbS5ieUlkKFwidXNlQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZsaXBDYW1lcmFCdXR0b24gPSBkb20uYnlJZChcImZsaXBDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3RvcENhbWVyYUJ1dHRvbiA9IGRvbS5ieUlkKFwic3RvcENhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBnYWxsZXJ5QnV0dG9uID0gZG9tLmJ5SWQoXCJnYWxsZXJ5QnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVycm9yc0RpdiA9IGRvbS5ieUlkKFwiZXJyb3JzXCIpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgaW1hZ2VBY3F1aXJlZCA9IG5ldyBDaGFubmVsPFtIVE1MQ2FudmFzRWxlbWVudF0+KClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGlicmFyeVVpID0gbmV3IExpYnJhcnlVaSgpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHVibGljIHJlYWRvbmx5IHNob3dHYWxsZXJ5ID0gbmV3IENoYW5uZWw8W3ZvaWRdPigpXHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5maWxlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuZmlsZUlucHV0LmNsaWNrKClcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnZW50ZXJcIiwgKGUpID0+IHRoaXMub25EcmFnRW50ZXJPdmVyKGUpKVxyXG4gICAgICAgIHRoaXMuZmlsZURyb3BCb3guYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdvdmVyXCIsIChlKSA9PiB0aGlzLm9uRHJhZ0VudGVyT3ZlcihlKSlcclxuICAgICAgICB0aGlzLmZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcm9wXCIsIChlKSA9PiB0aGlzLm9uRmlsZURyb3AoZSkpXHJcbiAgICAgICAgdGhpcy5maWxlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB0aGlzLm9uRmlsZUNoYW5nZSgpKVxyXG4gICAgICAgIHRoaXMudXNlQ2FtZXJhQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnVzZUNhbWVyYSgpKVxyXG4gICAgICAgIHRoaXMuZmxpcENhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5mbGlwQ2FtZXJhKCkpXHJcbiAgICAgICAgdGhpcy5zdG9wQ2FtZXJhQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnN0b3BDYW1lcmEoKSlcclxuICAgICAgICB0aGlzLmNhcHR1cmVJbWFnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5jYXB0dXJlSW1hZ2UoKSlcclxuICAgICAgICB0aGlzLmNhbWVyYS5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkbWV0YWRhdGFcIiwgKCkgPT4gdGhpcy5vbkNhbWVyYUxvYWQoKSlcclxuICAgICAgICB0aGlzLmdhbGxlcnlCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIF8gPT4gdGhpcy5zaG93R2FsbGVyeS5wdWJsaXNoKCkpXHJcblxyXG4gICAgICAgIHRoaXMubGlicmFyeVVpLmNhbmNlbC5zdWJjcmliZSgoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuaW1hZ2VBY3F1aXNpdGlvbkRpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5pbWFnZUFjcXVpc2l0aW9uRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLmNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgICAgIC8vIHRoaXMubG9hZEZyb21VcmwoXCIvY2JuL2Fzc2V0cy9sYXJyeUtvb3BhLmpwZ1wiKVxyXG4gICAgICAgIC8vIHRoaXMubG9hZEZyb21VcmwoXCIvY2JuL2Fzc2V0cy9vbHRzX2Zsb3dlci5qcGdcIilcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgaGlkZSgpIHtcclxuICAgICAgICB0aGlzLmltYWdlQWNxdWlzaXRpb25EaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25EcmFnRW50ZXJPdmVyKGV2OiBEcmFnRXZlbnQpIHtcclxuICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uRmlsZUNoYW5nZSgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuZmlsZUlucHV0LmZpbGVzPy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmaWxlID0gdGhpcy5maWxlSW5wdXQuZmlsZXNbMF1cclxuICAgICAgICB0aGlzLnByb2Nlc3NGaWxlKGZpbGUpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkZpbGVEcm9wKGV2OiBEcmFnRXZlbnQpIHtcclxuICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxuXHJcbiAgICAgICAgaWYgKCFldj8uZGF0YVRyYW5zZmVyPy5maWxlcz8ubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZmlsZSA9IGV2LmRhdGFUcmFuc2Zlci5maWxlc1swXVxyXG4gICAgICAgIHRoaXMucHJvY2Vzc0ZpbGUoZmlsZSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHVzZUNhbWVyYSgpIHtcclxuICAgICAgICB0aGlzLmFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIGNvbnN0IGRpYWxvZ1dpZHRoID0gdGhpcy5hY3F1aXJlSW1hZ2VEaXYuY2xpZW50V2lkdGhcclxuICAgICAgICBjb25zdCBkaWFsb2dIZWlnaHQgPSB0aGlzLmFjcXVpcmVJbWFnZURpdi5jbGllbnRIZWlnaHRcclxuICAgICAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7XHJcbiAgICAgICAgICAgIHZpZGVvOiB7IHdpZHRoOiB7IG1heDogZGlhbG9nV2lkdGggfSwgaGVpZ2h0OiB7IG1heDogZGlhbG9nSGVpZ2h0IH0sIGZhY2luZ01vZGU6IFwidXNlclwiIH0sXHJcbiAgICAgICAgICAgIGF1ZGlvOiBmYWxzZVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuVXNlclxyXG4gICAgICAgIHRoaXMuY2FtZXJhLnNyY09iamVjdCA9IHN0cmVhbVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZmxpcENhbWVyYSgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY2FtZXJhLnNyY09iamVjdCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHNyYyA9IHRoaXMuY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgICAgIGNvbnN0IHRyYWNrcyA9IHNyYy5nZXRUcmFja3MoKVxyXG4gICAgICAgIGZvciAoY29uc3QgdHJhY2sgb2YgdHJhY2tzKSB7XHJcbiAgICAgICAgICAgIHRyYWNrLnN0b3AoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jYW1lcmFNb2RlID0gdGhpcy5jYW1lcmFNb2RlID09IENhbWVyYU1vZGUuVXNlciA/IENhbWVyYU1vZGUuRW52aXJvbm1lbnQgOiBDYW1lcmFNb2RlLlVzZXJcclxuICAgICAgICBjb25zdCBmYWNpbmdNb2RlID0gdGhpcy5jYW1lcmFNb2RlID09IENhbWVyYU1vZGUuVXNlciA/IFwidXNlclwiIDogXCJlbnZpcm9ubWVudFwiXHJcblxyXG4gICAgICAgIC8vIGdldCBjdXJyZW50IGZhY2luZyBtb2RlXHJcbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xyXG4gICAgICAgICAgICB2aWRlbzogeyB3aWR0aDogdGhpcy5jYW1lcmEuY2xpZW50V2lkdGgsIGhlaWdodDogdGhpcy5jYW1lcmEuY2xpZW50SGVpZ2h0LCBmYWNpbmdNb2RlOiBmYWNpbmdNb2RlIH0sXHJcbiAgICAgICAgICAgIGF1ZGlvOiBmYWxzZVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhLnNyY09iamVjdCA9IHN0cmVhbVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25DYW1lcmFMb2FkKCkge1xyXG4gICAgICAgIHRoaXMuYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5jYW1lcmEucGxheSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzdG9wQ2FtZXJhKCkge1xyXG4gICAgICAgIGNvbnN0IHNyYyA9IHRoaXMuY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgICAgIGlmICghc3JjKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdHJhY2tzID0gc3JjLmdldFRyYWNrcygpXHJcbiAgICAgICAgZm9yIChjb25zdCB0cmFjayBvZiB0cmFja3MpIHtcclxuICAgICAgICAgICAgdHJhY2suc3RvcCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLk5vbmVcclxuICAgICAgICB0aGlzLmFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYXB0dXJlSW1hZ2UoKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhckVycm9yTWVzc2FnZXMoKVxyXG5cclxuICAgICAgICBjb25zdCBzcmMgPSB0aGlzLmNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgICAgICBpZiAoIXNyYykge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRyYWNrID0gc3JjLmdldFZpZGVvVHJhY2tzKClbMF1cclxuICAgICAgICBpZiAoIXRyYWNrKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jdHguY2FudmFzLndpZHRoID0gdGhpcy5jYW1lcmEudmlkZW9XaWR0aFxyXG4gICAgICAgIHRoaXMuY3R4LmNhbnZhcy5oZWlnaHQgPSB0aGlzLmNhbWVyYS52aWRlb0hlaWdodFxyXG4gICAgICAgIHRoaXMuY3R4LmRyYXdJbWFnZSh0aGlzLmNhbWVyYSwgMCwgMClcclxuICAgICAgICB0aGlzLmltYWdlQWNxdWlyZWQucHVibGlzaCh0aGlzLmNhbnZhcylcclxuICAgICAgICB0aGlzLnN0b3BDYW1lcmEoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHJvY2Vzc0ZpbGUoZmlsZTogRmlsZSkge1xyXG4gICAgICAgIHRoaXMuY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpXHJcbiAgICAgICAgdGhpcy5sb2FkRnJvbVVybCh1cmwpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBsb2FkRnJvbVVybCh1cmw6IHN0cmluZykge1xyXG4gICAgICAgIHRoaXMuY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuICAgICAgICBjb25zdCBpbWcgPSBhd2FpdCBkb20ubG9hZEltYWdlKHVybClcclxuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IGltZy53aWR0aFxyXG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IGltZy5oZWlnaHRcclxuICAgICAgICB0aGlzLmN0eC5kcmF3SW1hZ2UoaW1nLCAwLCAwKVxyXG4gICAgICAgIHRoaXMuaW1hZ2VBY3F1aXJlZC5wdWJsaXNoKHRoaXMuY2FudmFzKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2xlYXJFcnJvck1lc3NhZ2VzKCkge1xyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0aGlzLmVycm9yc0RpdilcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgSW1hZ2VTaXplVWkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBkYjogSURCRGF0YWJhc2VcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VTaXplRGl2ID0gZG9tLmJ5SWQoXCJpbWFnZVNpemVVaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtYXhEaW1JbnB1dCA9IGRvbS5ieUlkKFwibWF4RGltXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbWF4Q29sb3JzSW5wdXQgPSBkb20uYnlJZChcIm1heENvbG9yc1wiKSBhcyBIVE1MSW5wdXRFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNyZWF0ZUNvbG9yQnlOdW1iZXJCdXR0b24gPSBkb20uYnlJZChcImNyZWF0ZUNvbG9yQnlOdW1iZXJcIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmV0dXJuQnV0dG9uID0gZG9tLmJ5SWQoXCJpbWFnZVNpemVSZXR1cm5cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VTY2FsZUNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VTY2FsZUN0eCA9IHRoaXMuaW1hZ2VTY2FsZUNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlU2l6ZUNhbnZhcyA9IGRvbS5ieUlkKFwiaW1hZ2VTaXplQ2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlU2l6ZUN0eCA9IHRoaXMuaW1hZ2VTaXplQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgaW1hZ2VDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgY3JlYXRlQ0JOID0gbmV3IENoYW5uZWw8W251bWJlcl0+KClcclxuICAgIHB1YmxpYyByZWFkb25seSByZXR1cm4gPSBuZXcgQ2hhbm5lbDxbXT4oKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKGRiOiBJREJEYXRhYmFzZSkge1xyXG4gICAgICAgIHRoaXMuZGIgPSBkYlxyXG4gICAgICAgIHRoaXMuY3JlYXRlQ29sb3JCeU51bWJlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5vbkNyZWF0ZUNvbG9yQnlOdW1iZXIoKSlcclxuICAgICAgICB0aGlzLnJldHVybkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5vblJldHVybkNsaWNrKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNob3coaW1hZ2VDYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgdGhpcy5pbWFnZVNpemVEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmltYWdlQ2FudmFzID0gaW1hZ2VDYW52YXNcclxuICAgICAgICB0aGlzLm1heERpbUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4gdGhpcy5vbk1heERpbUNoYW5nZSgpKVxyXG4gICAgICAgIHRoaXMubWF4Q29sb3JzSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB0aGlzLm9uTWF4Q29sb3JzQ2hhbmdlKCkpXHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBoaWRlKCkge1xyXG4gICAgICAgIHRoaXMuaW1hZ2VTaXplRGl2LmhpZGRlbiA9IHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIG9uQ3JlYXRlQ29sb3JCeU51bWJlcigpIHtcclxuICAgICAgICBjb25zdCBibG9iID0gYXdhaXQgaW1hZ2luZy5jYW52YXMyQmxvYih0aGlzLmltYWdlU2NhbGVDYW52YXMsIGltYWdlTWltZVR5cGUpXHJcbiAgICAgICAgY29uc3QgcHJldmlldyA9IGF3YWl0IGNyZWF0ZVByZXZpZXcoYmxvYiwgW10pXHJcblxyXG4gICAgICAgIGNvbnN0IGNibjogQ0JOUGljdHVyZSA9IHtcclxuICAgICAgICAgICAgaW1hZ2U6IGJsb2IsXHJcbiAgICAgICAgICAgIHNlcXVlbmNlOiBbXSxcclxuICAgICAgICAgICAgcHJldmlldzogcHJldmlld1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qga2V5ID0gYXdhaXQgcHV0Q0JOKHRoaXMuZGIsIGNibilcclxuICAgICAgICB0aGlzLmNyZWF0ZUNCTi5wdWJsaXNoKGtleSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmV0dXJuQ2xpY2soKSB7XHJcbiAgICAgICAgdGhpcy5yZXR1cm4ucHVibGlzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvbk1heERpbUNoYW5nZSgpIHtcclxuICAgICAgICBhd2FpdCBzaG93TG9hZGluZ0luZGljYXRvcigpXHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgIGhpZGVMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIG9uTWF4Q29sb3JzQ2hhbmdlKCkge1xyXG4gICAgICAgIGF3YWl0IHNob3dMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgaGlkZUxvYWRpbmdJbmRpY2F0b3IoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVkcmF3KCkge1xyXG4gICAgICAgIHRoaXMuaW1hZ2VTaXplQ2FudmFzLndpZHRoID0gdGhpcy5pbWFnZVNpemVDYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICB0aGlzLmltYWdlU2l6ZUNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlU2l6ZUNhbnZhcy5jbGllbnRIZWlnaHRcclxuXHJcbiAgICAgICAgY29uc3QgbWF4RGltID0gdGhpcy5nZXRNYXhEaW0oKVxyXG4gICAgICAgIGNvbnN0IG1heENvbG9ycyA9IHRoaXMuZ2V0TWF4Q29sb3JzKClcclxuICAgICAgICBjb25zdCBbdywgaF0gPSBmaXQodGhpcy5pbWFnZUNhbnZhcy53aWR0aCwgdGhpcy5pbWFnZUNhbnZhcy5oZWlnaHQsIG1heERpbSlcclxuICAgICAgICB0aGlzLmltYWdlU2NhbGVDYW52YXMud2lkdGggPSB3XHJcbiAgICAgICAgdGhpcy5pbWFnZVNjYWxlQ2FudmFzLmhlaWdodCA9IGhcclxuICAgICAgICB0aGlzLmltYWdlU2NhbGVDdHguZHJhd0ltYWdlKHRoaXMuaW1hZ2VDYW52YXMsIDAsIDAsIHcsIGgpXHJcbiAgICAgICAgaW1hZ2luZy5xdWFudE1lZGlhbkN1dCh0aGlzLmltYWdlU2NhbGVDdHgsIG1heENvbG9ycywgY29sb3JSYW5nZVRvbGVyYW5jZSlcclxuICAgICAgICBjb25zdCBtaW5TY2FsZSA9IE1hdGgubWluKHRoaXMuaW1hZ2VTaXplQ2FudmFzLmNsaWVudFdpZHRoIC8gdywgdGhpcy5pbWFnZVNpemVDYW52YXMuY2xpZW50SGVpZ2h0IC8gaClcclxuICAgICAgICBjb25zdCBzdyA9IHcgKiBtaW5TY2FsZVxyXG4gICAgICAgIGNvbnN0IHNoID0gaCAqIG1pblNjYWxlXHJcbiAgICAgICAgY29uc3QgeCA9ICh0aGlzLmltYWdlU2l6ZUNhbnZhcy53aWR0aCAtIHN3KSAvIDJcclxuICAgICAgICBjb25zdCB5ID0gKHRoaXMuaW1hZ2VTaXplQ2FudmFzLmhlaWdodCAtIHNoKSAvIDJcclxuICAgICAgICB0aGlzLmltYWdlU2l6ZUN0eC5kcmF3SW1hZ2UodGhpcy5pbWFnZVNjYWxlQ2FudmFzLCB4LCB5LCBzdywgc2gpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRNYXhEaW0oKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgbWF4RGltID0gcGFyc2VJbnQodGhpcy5tYXhEaW1JbnB1dC52YWx1ZSlcclxuICAgICAgICBpZiAoIW1heERpbSkge1xyXG4gICAgICAgICAgICBtYXhEaW0gPSBkZWZhdWx0TWF4RGltXHJcbiAgICAgICAgICAgIHRoaXMubWF4RGltSW5wdXQudmFsdWUgPSBtYXhEaW0udG9TdHJpbmcoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1heERpbVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0TWF4Q29sb3JzKCk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IG1heENvbG9ycyA9IHBhcnNlSW50KHRoaXMubWF4Q29sb3JzSW5wdXQudmFsdWUpXHJcbiAgICAgICAgaWYgKCFtYXhDb2xvcnMpIHtcclxuICAgICAgICAgICAgbWF4Q29sb3JzID0gZGVmYXVsdE1heENvbG9yc1xyXG4gICAgICAgICAgICB0aGlzLm1heENvbG9yc0lucHV0LnZhbHVlID0gbWF4Q29sb3JzLnRvU3RyaW5nKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtYXhDb2xvcnNcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgTGlicmFyeVVpIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGlicmFyeURpdiA9IGRvbS5ieUlkKFwibGlicmFyeVVpXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJldHVybkJ1dHRvbiA9IGRvbS5ieUlkKFwicmV0dXJuRnJvbUxpYnJhcnlCdXR0b25cIilcclxuICAgIHB1YmxpYyByZWFkb25seSBpbWFnZUNob3NlbiA9IG5ldyBDaGFubmVsPFtzdHJpbmddPigpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgY2FuY2VsID0gbmV3IENoYW5uZWw8W10+KClcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLnJldHVybkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5vblJldHVybkNsaWNrKCkpXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICB0aGlzLmxpYnJhcnlEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmV0dXJuQ2xpY2soKSB7XHJcbiAgICAgICAgdGhpcy5saWJyYXJ5RGl2LmhpZGRlbiA9IHRydWVcclxuICAgICAgICB0aGlzLmNhbmNlbC5wdWJsaXNoKClcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgUGxheVVpIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGI6IElEQkRhdGFiYXNlXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFsZXR0ZURpdiA9IGRvbS5ieUlkKFwicGFsZXR0ZVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWxldHRlRW50cnlUZW1wbGF0ZSA9IGRvbS5ieUlkKFwicGFsZXR0ZUVudHJ5XCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGxheVVpRGl2ID0gZG9tLmJ5SWQoXCJwbGF5VWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmV0dXJuQnV0dG9uID0gZG9tLmJ5SWQoXCJyZXR1cm5CdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlQ3R4ID0gdGhpcy5pbWFnZUNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNlbGxDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNlbGxDdHggPSB0aGlzLmNlbGxDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWxldHRlQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWxldHRlQ3R4ID0gdGhpcy5wYWxldHRlQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29sb3JDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbG9yQ3R4ID0gdGhpcy5jb2xvckNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIGtleTogbnVtYmVyID0gMFxyXG4gICAgcHJpdmF0ZSBjb21wbGV0ZSA9IGZhbHNlXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgcmV0dXJuID0gbmV3IENoYW5uZWw8W3ZvaWRdPigpXHJcbiAgICBwcml2YXRlIGltYWdlV2lkdGggPSAwXHJcbiAgICBwcml2YXRlIGltYWdlSGVpZ2h0ID0gMFxyXG4gICAgcHJpdmF0ZSBjZW50ZXJYID0gMFxyXG4gICAgcHJpdmF0ZSBjZW50ZXJZID0gMFxyXG4gICAgcHJpdmF0ZSB6b29tID0gMVxyXG4gICAgcHJpdmF0ZSBkcmFnID0gZmFsc2VcclxuICAgIHByaXZhdGUgY29sb3JEcmFnID0gZmFsc2VcclxuICAgIHByaXZhdGUgdG91Y2hab29tOiBudW1iZXIgPSAwXHJcbiAgICBwcml2YXRlIHRvdWNoMVN0YXJ0OiBnZW8uVmVjMiB8IG51bGwgPSBudWxsXHJcbiAgICBwcml2YXRlIHRvdWNoMlN0YXJ0OiBnZW8uVmVjMiB8IG51bGwgPSBudWxsXHJcbiAgICBwcml2YXRlIHRvdWNoMUN1cjogZ2VvLlZlYzIgfCBudWxsID0gbnVsbFxyXG4gICAgcHJpdmF0ZSB0b3VjaDJDdXI6IGdlby5WZWMyIHwgbnVsbCA9IG51bGxcclxuICAgIHByaXZhdGUgZHJhZ0xhc3QgPSBuZXcgZ2VvLlZlYzIoMCwgMClcclxuXHJcbiAgICAvLyBsaXN0IG9mIGNvbG9ycyB1c2UgdXNlZCBpbiBpbWFnZVxyXG4gICAgcHJpdmF0ZSBwYWxldHRlOiBudW1iZXJbXSA9IFtdXHJcblxyXG4gICAgLy8gaW1hZ2Ugb3ZlcmxheSBvZiBwaXhlbCB0byBwYWxldHRlIGluZGV4XHJcbiAgICBwcml2YXRlIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSA9IFtdXHJcblxyXG4gICAgLy8gcGFsZXR0ZSBvdmVybGF5IG9mIHBhbGV0dGUgaW5kZXggdG8gbGlzdCBvZiBwaXhlbHMgaGF2aW5nIHRoYXQgY29sb3JcclxuICAgIHByaXZhdGUgcGl4ZWxPdmVybGF5OiBTZXQ8bnVtYmVyPltdID0gW11cclxuXHJcbiAgICBwcml2YXRlIHNlbGVjdGVkUGFsZXR0ZUluZGV4OiBudW1iZXIgPSAtMVxyXG4gICAgcHJpdmF0ZSBzZXF1ZW5jZTogbnVtYmVyW10gPSBbXVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKGRiOiBJREJEYXRhYmFzZSkge1xyXG4gICAgICAgIHRoaXMuZGIgPSBkYlxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuY3R4KSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbnZhcyBlbGVtZW50IG5vdCBzdXBwb3J0ZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVyZG93blwiLCBlID0+IHRoaXMub25Qb2ludGVyRG93bihlKSlcclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcm1vdmVcIiwgZSA9PiB0aGlzLm9uUG9pbnRlck1vdmUoZSkpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJ1cFwiLCBlID0+IHRoaXMub25Qb2ludGVyVXAoZSkpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIGUgPT4gdGhpcy5vbldoZWVsKGUpKVxyXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIGUgPT4gdGhpcy5vblJlc2l6ZShlKSlcclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy5wbGF5VWlEaXYsIFwiY2xpY2tcIiwgXCIucGFsZXR0ZS1lbnRyeVwiLCAoZSkgPT4gdGhpcy5vblBhbGV0dGVFbnRyeUNsaWNrKGUgYXMgTW91c2VFdmVudCkpXHJcbiAgICAgICAgdGhpcy5yZXR1cm5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMub25SZXR1cm4oKSlcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgYXN5bmMgc2hvdyhrZXk6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMua2V5ID0ga2V5XHJcbiAgICAgICAgdGhpcy5wbGF5VWlEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICAgICAgdGhpcy5jb21wbGV0ZSA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy56b29tID0gMVxyXG4gICAgICAgIHRoaXMuZHJhZyA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy50b3VjaFpvb20gPSAwXHJcblxyXG4gICAgICAgIGNvbnN0IHBpYyA9IGF3YWl0IGdldENCTih0aGlzLmRiLCBrZXkpXHJcbiAgICAgICAgY29uc3QgaW1nID0gYXdhaXQgZG9tLmxvYWRJbWFnZShVUkwuY3JlYXRlT2JqZWN0VVJMKHBpYy5pbWFnZSkpXHJcbiAgICAgICAgdGhpcy5pbWFnZVdpZHRoID0gaW1nLndpZHRoXHJcbiAgICAgICAgdGhpcy5pbWFnZUhlaWdodCA9IGltZy5oZWlnaHRcclxuXHJcbiAgICAgICAgLy8gY2FwdHVyZSBpbWFnZVxyXG4gICAgICAgIHRoaXMuaW1hZ2VDYW52YXMud2lkdGggPSB0aGlzLmltYWdlV2lkdGhcclxuICAgICAgICB0aGlzLmltYWdlQ2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2VIZWlnaHRcclxuICAgICAgICB0aGlzLmltYWdlQ3R4LmRyYXdJbWFnZShpbWcsIDAsIDAsIHRoaXMuaW1hZ2VDYW52YXMud2lkdGgsIHRoaXMuaW1hZ2VDYW52YXMuaGVpZ2h0KVxyXG5cclxuICAgICAgICAvLyBkZWJ1ZyAtIHNob3cgcGFzc2VkIGltYWdlXHJcbiAgICAgICAgLy8gdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLmltYWdlV2lkdGhcclxuICAgICAgICAvLyB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlSGVpZ2h0XHJcbiAgICAgICAgLy8gdGhpcy5jdHguZHJhd0ltYWdlKHRoaXMuaW1hZ2VDYW52YXMsIDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpXHJcbiAgICAgICAgLy8gcmV0dXJuXHJcblxyXG4gICAgICAgIGNvbnN0IGltZ0RhdGEgPSB0aGlzLmltYWdlQ3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlID0gZXh0cmFjdFBhbGV0dGUoaW1nRGF0YSlcclxuICAgICAgICB0aGlzLnBhbGV0dGVPdmVybGF5ID0gY3JlYXRlUGFsZXR0ZU92ZXJsYXkoaW1nRGF0YSwgdGhpcy5wYWxldHRlKVxyXG4gICAgICAgIHRoaXMucGl4ZWxPdmVybGF5ID0gY3JlYXRlUGl4ZWxPdmVybGF5KHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCwgdGhpcy5wYWxldHRlLCB0aGlzLnBhbGV0dGVPdmVybGF5KVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZSA9IHBydW5lUGFsbGV0ZSh0aGlzLnBhbGV0dGUsIHRoaXMucGl4ZWxPdmVybGF5LCBtYXhCYWNrZ3JvdW5kUGl4ZWxzLCB0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQsIHRoaXMuY29sb3JDdHgpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlT3ZlcmxheSA9IGNyZWF0ZVBhbGV0dGVPdmVybGF5KGltZ0RhdGEsIHRoaXMucGFsZXR0ZSlcclxuICAgICAgICB0aGlzLnBpeGVsT3ZlcmxheSA9IGNyZWF0ZVBpeGVsT3ZlcmxheSh0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQsIHRoaXMucGFsZXR0ZSwgdGhpcy5wYWxldHRlT3ZlcmxheSlcclxuICAgICAgICB0aGlzLmNyZWF0ZVBhbGV0dGVVaSgpXHJcbiAgICAgICAgZHJhd0NlbGxJbWFnZSh0aGlzLmNlbGxDdHgsIHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCwgdGhpcy5wYWxldHRlT3ZlcmxheSlcclxuICAgICAgICB0aGlzLnBhbGV0dGVDYW52YXMud2lkdGggPSB0aGlzLmNlbGxDYW52YXMud2lkdGhcclxuICAgICAgICB0aGlzLnBhbGV0dGVDYW52YXMuaGVpZ2h0ID0gdGhpcy5jZWxsQ2FudmFzLmhlaWdodFxyXG4gICAgICAgIHRoaXMuY2VudGVyWCA9IHRoaXMuY2FudmFzLndpZHRoIC8gMlxyXG4gICAgICAgIHRoaXMuY2VudGVyWSA9IHRoaXMuY2FudmFzLmhlaWdodCAvIDJcclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcblxyXG4gICAgICAgIGlmICh0aGlzLnBhbGV0dGUpIHtcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RQYWxldHRlRW50cnkoMClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2VxdWVuY2UgPSBwaWMuc2VxdWVuY2VcclxuICAgICAgICBmb3IgKGNvbnN0IHh5IG9mIHRoaXMuc2VxdWVuY2UpIHtcclxuICAgICAgICAgICAgY29uc3QgcGFsZXR0ZUlkeCA9IHRoaXMucGFsZXR0ZU92ZXJsYXlbeHldXHJcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IGltYWdpbmcudW5mbGF0KHh5LCB0aGlzLmltYWdlV2lkdGgpXHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0UGFsZXR0ZUVudHJ5KHBhbGV0dGVJZHgpXHJcbiAgICAgICAgICAgIHRoaXMudHJ5RmlsbENlbGwoeCwgeSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGRlYnVnIC0gZmlsbCBhbGwgcGl4ZWxzIGJ1dCBmaXJzdCB1bmZpbGxlZFxyXG4gICAgICAgIC8vIHtcclxuICAgICAgICAvLyAgICAgbGV0IHNraXBwZWQxID0gZmFsc2VcclxuICAgICAgICAvLyAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmltYWdlSGVpZ2h0OyArK3kpIHtcclxuICAgICAgICAvLyAgICAgICAgIGxldCB5T2Zmc2V0ID0geSAqIHRoaXMuaW1hZ2VXaWR0aFxyXG4gICAgICAgIC8vICAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLmltYWdlV2lkdGg7ICsreCkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGNvbnN0IHBhbGV0dGVJZHggPSB0aGlzLnBhbGV0dGVPdmVybGF5W2ZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKV1cclxuICAgICAgICAvLyAgICAgICAgICAgICBpZiAocGFsZXR0ZUlkeCA9PT0gLTEpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAvLyAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vICAgICAgICAgICAgIGxldCB4T2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAvLyAgICAgICAgICAgICBpZiAoIXNraXBwZWQxICYmIHRoaXMucGFsZXR0ZU92ZXJsYXlbeE9mZnNldF0gIT09IC0xKSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIHNraXBwZWQxID0gdHJ1ZVxyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIC8vICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgdGhpcy5zZWxlY3RQYWxldHRlRW50cnkocGFsZXR0ZUlkeClcclxuICAgICAgICAvLyAgICAgICAgICAgICB0aGlzLnRyeUZpbGxDZWxsKHgsIHkpXHJcblxyXG4gICAgICAgIC8vICAgICAgICAgfVxyXG4gICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAvLyAvLyBkZWJ1ZyAtIGdvIHN0cmFpZ2h0IHRvIGVuZCBzdGF0ZVxyXG4gICAgICAgIC8vIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5pbWFnZUhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgLy8gICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5pbWFnZVdpZHRoOyArK3gpIHtcclxuICAgICAgICAvLyAgICAgICAgIHRoaXMuc2VxdWVuY2UucHVzaChmbGF0KHgsIHksIHRoaXMuaW1hZ2VXaWR0aCkpXHJcbiAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgIC8vIHJhbmQuc2h1ZmZsZSh0aGlzLnNlcXVlbmNlKVxyXG4gICAgICAgIC8vIHRoaXMuZXhlY0RvbmVTZXF1ZW5jZSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5wbGF5VWlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25SZXR1cm4oKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5yZXR1cm4ucHVibGlzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJlc2l6ZShfOiBVSUV2ZW50KSB7XHJcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLmNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNyZWF0ZVBhbGV0dGVVaSgpIHtcclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGhpcy5wYWxldHRlRGl2KVxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5wYWxldHRlLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFtyLCBnLCBiXSA9IGNvbG9yLnVucGFjayh0aGlzLnBhbGV0dGVbaV0pXHJcbiAgICAgICAgICAgIGNvbnN0IGx1bSA9IGNhbGNMdW1pbmFuY2UociwgZywgYilcclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0aGlzLnBhbGV0dGVFbnRyeVRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgZW50cnlEaXYgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIucGFsZXR0ZS1lbnRyeVwiKSBhcyBIVE1MRWxlbWVudFxyXG4gICAgICAgICAgICBlbnRyeURpdi50ZXh0Q29udGVudCA9IGAke2kgKyAxfWBcclxuICAgICAgICAgICAgZW50cnlEaXYuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gY29sb3IyUkdCQVN0eWxlKHIsIGcsIGIpXHJcbiAgICAgICAgICAgIGVudHJ5RGl2LnN0eWxlLmNvbG9yID0gbHVtIDwgLjUgPyBcIndoaXRlXCIgOiBcImJsYWNrXCJcclxuICAgICAgICAgICAgdGhpcy5wYWxldHRlRGl2LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUG9pbnRlckRvd24oZTogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIWUuaXNQcmltYXJ5KSB7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gyU3RhcnQgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgICAgIHRoaXMudG91Y2hab29tID0gdGhpcy56b29tXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYXJlIHdlIG92ZXJ0b3Agb2YgYSBzZWxlY3RlZCBwYWxldHRlIGVudHJ5IHBpeGVsP1xyXG4gICAgICAgIHRoaXMuY2FudmFzLnNldFBvaW50ZXJDYXB0dXJlKGUucG9pbnRlcklkKVxyXG4gICAgICAgIHRoaXMuZHJhZyA9IHRydWVcclxuICAgICAgICB0aGlzLmRyYWdMYXN0ID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIHRoaXMudG91Y2gxU3RhcnQgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgdGhpcy50b3VjaFpvb20gPSB0aGlzLnpvb21cclxuXHJcbiAgICAgICAgLy8gdHJhbnNmb3JtIGNsaWNrIGNvb3JkaW5hdGVzIHRvIGNhbnZhcyBjb29yZGluYXRlc1xyXG4gICAgICAgIGNvbnN0IFt4LCB5XSA9IHRoaXMuY2FudmFzMkNlbGwoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgaWYgKHRoaXMudHJ5RmlsbENlbGwoeCwgeSkpIHtcclxuICAgICAgICAgICAgdGhpcy5jb2xvckRyYWcgPSB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29udmVydCBhIGNhbnZhcyBjb29yZGluYXRlIGludG8gYSBjZWxsIGNvb3JkaW5hdGVcclxuICAgICAqIEBwYXJhbSB4IHggY2FudmFzIGNvb3JkaW5hdGVcclxuICAgICAqIEBwYXJhbSB5IHkgY2FudmFzIGNvb3JkaW5hdGVcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBjYW52YXMyQ2VsbCh4OiBudW1iZXIsIHk6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgICAgIGNvbnN0IGludlRyYW5zZm9ybSA9IHRoaXMuY3R4LmdldFRyYW5zZm9ybSgpLmludmVyc2UoKVxyXG4gICAgICAgIGNvbnN0IGRvbVB0ID0gaW52VHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHsgeDogeCwgeTogeSB9KVxyXG4gICAgICAgIHJldHVybiBjZWxsMkltYWdlKGRvbVB0LngsIGRvbVB0LnkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblBvaW50ZXJVcChlOiBQb2ludGVyRXZlbnQpIHtcclxuICAgICAgICBpZiAoIWUuaXNQcmltYXJ5KSB7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gyU3RhcnQgPSBudWxsXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRvdWNoMVN0YXJ0ID0gbnVsbFxyXG4gICAgICAgIHRoaXMuZHJhZyA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5jb2xvckRyYWcgPSBmYWxzZVxyXG4gICAgICAgIHRoaXMudG91Y2hab29tID0gdGhpcy56b29tXHJcbiAgICAgICAgdGhpcy5zYXZlU3RhdGUoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2F2ZVN0YXRlKCkge1xyXG4gICAgICAgIGNvbnN0IGJsb2IgPSBhd2FpdCBpbWFnaW5nLmNhbnZhczJCbG9iKHRoaXMuaW1hZ2VDYW52YXMsIGltYWdlTWltZVR5cGUpXHJcbiAgICAgICAgY29uc3QgcHJldmlldyA9IGF3YWl0IGNyZWF0ZVByZXZpZXcoYmxvYiwgdGhpcy5zZXF1ZW5jZSlcclxuICAgICAgICBhd2FpdCBwdXRDQk4odGhpcy5kYiwgeyBpbWFnZTogYmxvYiwgc2VxdWVuY2U6IHRoaXMuc2VxdWVuY2UsIHByZXZpZXc6IHByZXZpZXcgfSwgdGhpcy5rZXkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblBvaW50ZXJNb3ZlKGU6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUuaXNQcmltYXJ5KSB7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gxQ3VyID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gyQ3VyID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGFuZGxlIHBpbmNoIHpvb21cclxuICAgICAgICBpZiAodGhpcy50b3VjaDJTdGFydCAmJiB0aGlzLnRvdWNoMVN0YXJ0KSB7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gxQ3VyID0gdGhpcy50b3VjaDFDdXIgPz8gdGhpcy50b3VjaDFTdGFydFxyXG4gICAgICAgICAgICB0aGlzLnRvdWNoMkN1ciA9IHRoaXMudG91Y2gyQ3VyID8/IHRoaXMudG91Y2gyU3RhcnRcclxuICAgICAgICAgICAgY29uc3QgZDAgPSB0aGlzLnRvdWNoMVN0YXJ0LnN1Yih0aGlzLnRvdWNoMlN0YXJ0KS5sZW5ndGgoKVxyXG4gICAgICAgICAgICBjb25zdCBkMSA9IHRoaXMudG91Y2gxQ3VyLnN1Yih0aGlzLnRvdWNoMkN1cikubGVuZ3RoKClcclxuICAgICAgICAgICAgdGhpcy56b29tID0gdGhpcy50b3VjaFpvb20gKiBkMSAvIGQwXHJcbiAgICAgICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuZHJhZykge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IHRoaXMuY3R4LmdldFRyYW5zZm9ybSgpLmludmVyc2UoKVxyXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gZ2VvLlZlYzIuZnJvbURPTSh0cmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQodGhpcy5kcmFnTGFzdCkpXHJcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgY29uc3QgZW5kID0gZ2VvLlZlYzIuZnJvbURPTSh0cmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQocG9zaXRpb24pKVxyXG4gICAgICAgIGNvbnN0IGRlbHRhID0gZW5kLnN1YihzdGFydClcclxuXHJcbiAgICAgICAgLy8gY2hlY2sgZm9yIGRyYWcgb3ZlciBwYWxldHRlIGNvbG9yXHJcbiAgICAgICAgY29uc3QgW3gsIHldID0gdGhpcy5jYW52YXMyQ2VsbChlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICBpZiAodGhpcy5jb2xvckRyYWcgJiYgdGhpcy5wYWxldHRlT3ZlcmxheVtpbWFnaW5nLmZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKV0gPT09IHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudHJ5RmlsbENlbGwoeCwgeSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoTWF0aC5hYnMoZGVsdGEueCkgPiAzIHx8IE1hdGguYWJzKGRlbHRhLnkpID4gMykge1xyXG4gICAgICAgICAgICB0aGlzLmNlbnRlclggLT0gZGVsdGEueFxyXG4gICAgICAgICAgICB0aGlzLmNlbnRlclkgLT0gZGVsdGEueVxyXG4gICAgICAgICAgICB0aGlzLmRyYWdMYXN0ID0gcG9zaXRpb25cclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uV2hlZWwoZTogV2hlZWxFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUuZGVsdGFZID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnpvb20gKj0gLjVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlLmRlbHRhWSA8IDApIHtcclxuICAgICAgICAgICAgdGhpcy56b29tICo9IDJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUGFsZXR0ZUVudHJ5Q2xpY2soZTogTW91c2VFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBlLnRhcmdldCBhcyBFbGVtZW50XHJcbiAgICAgICAgbGV0IGlkeCA9IGRvbS5nZXRFbGVtZW50SW5kZXgoZW50cnkpXHJcblxyXG4gICAgICAgIGlmIChpZHggPT09IHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXgpIHtcclxuICAgICAgICAgICAgaWR4ID0gLTFcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2VsZWN0UGFsZXR0ZUVudHJ5KGlkeClcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHRydWUgaWYgc3BlY2lmaWVkIGNlbGwgaXMgdW5maWxsZWQsIGFuZCBoYXMgc3BlY2lmaWVkIHBhbGV0dGUgaW5kZXhcclxuICAgICAqIEBwYXJhbSB4IHggY2VsbCBjb29yZGluYXRlXHJcbiAgICAgKiBAcGFyYW0geSB5IGNlbGwgY29vcmRpbmF0ZVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNoZWNrQ2VsbCh4OiBudW1iZXIsIHk6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgIC8vIGlmIGFscmVhZHkgZmlsbGVkLCBkbyBub3RoaW5nXHJcbiAgICAgICAgY29uc3QgZmxhdFhZID0gaW1hZ2luZy5mbGF0KHgsIHksIHRoaXMuaW1hZ2VXaWR0aClcclxuICAgICAgICBjb25zdCBwaXhlbHMgPSB0aGlzLnBpeGVsT3ZlcmxheVt0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4XVxyXG4gICAgICAgIHJldHVybiBwaXhlbHMuaGFzKGZsYXRYWSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGF0dGVtcHQgdG8gZmlsbCB0aGUgc3BlY2lmaWVkIGNlbGxcclxuICAgICAqIHJldHVybnMgdHJ1ZSBpZiBmaWxsZWQsIGZhbHNlIGlmIGNlbGwgaXMgbm90IHNlbGVjdGVkIHBhbGV0dGUgb3IgYWxyZWFkeSBmaWxsZWRcclxuICAgICAqIEBwYXJhbSB4IFxyXG4gICAgICogQHBhcmFtIHkgXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgdHJ5RmlsbENlbGwoeDogbnVtYmVyLCB5OiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgICAgICAvLyBpZiBhbHJlYWR5IGZpbGxlZCwgZG8gbm90aGluZ1xyXG4gICAgICAgIGlmICghdGhpcy5jaGVja0NlbGwoeCwgeSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBbciwgZywgYl0gPSBjb2xvci51bnBhY2sodGhpcy5wYWxldHRlW3RoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXhdKVxyXG4gICAgICAgIGNvbnN0IFtjeCwgY3ldID0gaW1hZ2UyQ2VsbCh4LCB5KVxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguZmlsbFN0eWxlID0gY29sb3IyUkdCQVN0eWxlKHIsIGcsIGIpXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5maWxsUmVjdChjeCwgY3ksIGNlbGxTaXplLCBjZWxsU2l6ZSlcclxuXHJcbiAgICAgICAgLy8gcmVtb3ZlIHRoZSBwaXhlbCBmcm9tIG92ZXJsYXlcclxuICAgICAgICBjb25zdCBwaXhlbHMgPSB0aGlzLnBpeGVsT3ZlcmxheVt0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4XVxyXG4gICAgICAgIGNvbnN0IGZsYXRYWSA9IGltYWdpbmcuZmxhdCh4LCB5LCB0aGlzLmltYWdlV2lkdGgpXHJcbiAgICAgICAgcGl4ZWxzLmRlbGV0ZShmbGF0WFkpXHJcbiAgICAgICAgdGhpcy5zZXF1ZW5jZS5wdXNoKGZsYXRYWSlcclxuXHJcbiAgICAgICAgaWYgKHBpeGVscy5zaXplID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBtYXJrIHBhbGV0dGUgZW50cnkgYXMgZG9uZVxyXG4gICAgICAgIGNvbnN0IGVudHJ5ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5wYWxldHRlLWVudHJ5XCIpW3RoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXhdXHJcbiAgICAgICAgZW50cnkuaW5uZXJIVE1MID0gXCImY2hlY2s7XCJcclxuICAgICAgICBjb25zdCBuZXh0UGFsZXR0ZUlkeCA9IHRoaXMuZmluZE5leHRVbmZpbmlzaGVkRW50cnkodGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleClcclxuICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeShuZXh0UGFsZXR0ZUlkeClcclxuXHJcbiAgICAgICAgaWYgKG5leHRQYWxldHRlSWR4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYWxsIGNvbG9ycyBjb21wbGV0ZSEgc2hvdyBhbmltYXRpb24gb2YgdXNlciBjb2xvcmluZyBvcmlnaW5hbCBpbWFnZVxyXG4gICAgICAgIHRoaXMuZXhlY0RvbmVTZXF1ZW5jZSgpXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNlbGVjdFBhbGV0dGVFbnRyeShpZHg6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXggPSBpZHhcclxuXHJcbiAgICAgICAgY29uc3QgZW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5wYWxldHRlLWVudHJ5XCIpKVxyXG4gICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgICAgICBlbnRyeS5jbGFzc0xpc3QucmVtb3ZlKFwic2VsZWN0ZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpZHggIT09IC0xKSB7XHJcbiAgICAgICAgICAgIGVudHJpZXNbaWR4XS5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGNsZWFyIHBhbGV0dGUgY2FudmFzXHJcbiAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5wYWxldHRlQ3R4XHJcbiAgICAgICAgY29uc3QgY2FudmFzID0gdGhpcy5wYWxldHRlQ2FudmFzXHJcbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpXHJcblxyXG4gICAgICAgIGlmIChpZHggPT09IC0xKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoaWdobGlnaHQgcmVtYWluaW5nIHBpeGVscyBmb3IgdGhpcyBjb2xvclxyXG4gICAgICAgIGNvbnN0IGZvbnQgPSBjdHguZm9udFxyXG4gICAgICAgIGN0eC5mb250ID0gXCJib2xkIDE2cHggYXJpYWxcIlxyXG4gICAgICAgIGNvbnN0IHRleHRIZWlnaHQgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoXHJcbiAgICAgICAgY29uc3QgY2R4eSA9IGNlbGxTaXplIC8gMlxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHBpeGVsIG9mIHRoaXMucGl4ZWxPdmVybGF5W2lkeF0pIHtcclxuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gaW1hZ2UyQ2VsbCguLi5pbWFnaW5nLnVuZmxhdChwaXhlbCwgdGhpcy5pbWFnZVdpZHRoKSlcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yMlJHQkFTdHlsZSgxOTEsIDE5MSwgMTkxLCAyNTUpXHJcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCh4LCB5LCBjZWxsU2l6ZSwgY2VsbFNpemUpXHJcblxyXG4gICAgICAgICAgICAvLyBkcmF3IGxhYmVsXHJcbiAgICAgICAgICAgIGNvbnN0IGxhYmVsID0gYCR7aWR4ICsgMX1gXHJcbiAgICAgICAgICAgIGNvbnN0IG1ldHJpY3MgPSBjdHgubWVhc3VyZVRleHQobGFiZWwpXHJcbiAgICAgICAgICAgIGNvbnN0IGN4ID0geCArIGNkeHkgLSBtZXRyaWNzLndpZHRoIC8gMlxyXG4gICAgICAgICAgICBjb25zdCBjeSA9IHkgKyBjZHh5ICsgdGV4dEhlaWdodCAvIDJcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiYmxhY2tcIlxyXG4gICAgICAgICAgICBjdHguZmlsbFRleHQobGFiZWwsIGN4LCBjeSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGN0eC5mb250ID0gZm9udFxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlZHJhdygpIHtcclxuICAgICAgICAvLyBub3RlIC0gY2xlYXIgaXMgc3ViamVjdCB0byB0cmFuc2Zvcm1cclxuICAgICAgICBjb25zdCBjdHggPSB0aGlzLmN0eFxyXG4gICAgICAgIHRoaXMuY3R4LnJlc2V0VHJhbnNmb3JtKClcclxuICAgICAgICBjb25zdCBodyA9IHRoaXMuY2FudmFzLndpZHRoIC8gMiAvIHRoaXMuem9vbVxyXG4gICAgICAgIGNvbnN0IGhoID0gdGhpcy5jYW52YXMuaGVpZ2h0IC8gMiAvIHRoaXMuem9vbVxyXG5cclxuICAgICAgICB0aGlzLmNlbnRlclggPSBtYXRoLmNsYW1wKHRoaXMuY2VudGVyWCwgMCwgdGhpcy5jZWxsQ2FudmFzLndpZHRoKVxyXG4gICAgICAgIHRoaXMuY2VudGVyWSA9IG1hdGguY2xhbXAodGhpcy5jZW50ZXJZLCAwLCB0aGlzLmNlbGxDYW52YXMuaGVpZ2h0KVxyXG4gICAgICAgIHRoaXMuY3R4LnNjYWxlKHRoaXMuem9vbSwgdGhpcy56b29tKVxyXG4gICAgICAgIHRoaXMuY3R4LnRyYW5zbGF0ZSgtdGhpcy5jZW50ZXJYICsgaHcsIC10aGlzLmNlbnRlclkgKyBoaClcclxuXHJcbiAgICAgICAgdmFyIGludlRyYW5zZm9ybSA9IGN0eC5nZXRUcmFuc2Zvcm0oKS5pbnZlcnNlKClcclxuICAgICAgICBjb25zdCB0bCA9IGludlRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh7IHg6IDAsIHk6IDAgfSlcclxuICAgICAgICBjb25zdCBiciA9IGludlRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh7IHg6IHRoaXMuY2FudmFzLndpZHRoLCB5OiB0aGlzLmNhbnZhcy5oZWlnaHQgfSlcclxuICAgICAgICBjdHguY2xlYXJSZWN0KHRsLngsIHRsLnksIGJyLnggLSB0bC54LCBici55IC0gdGwueSlcclxuICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuY2VsbENhbnZhcywgMCwgMClcclxuICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMucGFsZXR0ZUNhbnZhcywgMCwgMClcclxuICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuY29sb3JDYW52YXMsIDAsIDApXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmaW5kTmV4dFVuZmluaXNoZWRFbnRyeShpOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLnBhbGV0dGUubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgaWkgPSBpICUgdGhpcy5wYWxldHRlLmxlbmd0aFxyXG4gICAgICAgICAgICBpZiAodGhpcy5waXhlbE92ZXJsYXlbaV0uc2l6ZSA+IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpaVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gLTFcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGV4ZWNEb25lU2VxdWVuY2UoKSB7XHJcbiAgICAgICAgLy8gc2V0IGFzIGRvbmVcclxuICAgICAgICB0aGlzLmNvbXBsZXRlID0gdHJ1ZVxyXG5cclxuICAgICAgICB0aGlzLmN0eC5yZXNldFRyYW5zZm9ybSgpXHJcblxyXG4gICAgICAgIC8vIGRyYXcgb25lIHBpeGVsIGF0IGEgdGltZSB0byBjb2xvciBjYW52YXNcclxuICAgICAgICAvLyBvdnJsYXkgb250byBjYW52YXNcclxuICAgICAgICBjb25zdCBkYXRhID0gdGhpcy5pbWFnZUN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0KS5kYXRhXHJcbiAgICAgICAgdGhpcy5jdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpXHJcbiAgICAgICAgY29uc3Qgem9vbSA9IE1hdGgubWluKHRoaXMuY2FudmFzLmNsaWVudFdpZHRoIC8gdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHQgLyB0aGlzLmltYWdlSGVpZ2h0KVxyXG4gICAgICAgIHRoaXMuY3R4LnNjYWxlKHpvb20sIHpvb20pXHJcblxyXG4gICAgICAgIC8vIGNvbG9yIGFzIHVzZXIgZGlkXHJcbiAgICAgICAgY29uc3QgcGl4ZWwgPSBuZXcgSW1hZ2VEYXRhKDEsIDEpXHJcbiAgICAgICAgY29uc3QgcGl4ZWxEYXRhID0gcGl4ZWwuZGF0YVxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguY2FudmFzLndpZHRoID0gdGhpcy5pbWFnZVdpZHRoXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5jYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZUhlaWdodFxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY29sb3JDYW52YXMud2lkdGgsIHRoaXMuY29sb3JDYW52YXMuaGVpZ2h0KVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc2VxdWVuY2UubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgeHkgPSB0aGlzLnNlcXVlbmNlW2ldXHJcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IGltYWdpbmcudW5mbGF0KHh5LCB0aGlzLmltYWdlV2lkdGgpXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHh5ICogNFxyXG4gICAgICAgICAgICBwaXhlbERhdGFbMF0gPSBkYXRhW29mZnNldF1cclxuICAgICAgICAgICAgcGl4ZWxEYXRhWzFdID0gZGF0YVtvZmZzZXQgKyAxXVxyXG4gICAgICAgICAgICBwaXhlbERhdGFbMl0gPSBkYXRhW29mZnNldCArIDJdXHJcbiAgICAgICAgICAgIHBpeGVsRGF0YVszXSA9IDI1NVxyXG5cclxuICAgICAgICAgICAgdGhpcy5jb2xvckN0eC5wdXRJbWFnZURhdGEocGl4ZWwsIHgsIHkpXHJcbiAgICAgICAgICAgIHRoaXMuY3R4LmRyYXdJbWFnZSh0aGlzLmNvbG9yQ2FudmFzLCAwLCAwKVxyXG4gICAgICAgICAgICBpZiAoaSAlIDY0ID09IDApIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHV0aWwud2FpdCgwKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBHYWxsZXJ5VWkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBkYjogSURCRGF0YWJhc2VcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdWkgPSBkb20uYnlJZChcImdhbGxlcnlVaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYm5zRGl2ID0gZG9tLmJ5SWQoXCJjYm5zXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGdhbGxlcnlBY3F1aXJlSW1hZ2VCdXR0b24gPSBkb20uYnlJZChcImdhbGxlcnlBY3F1aXJlSW1hZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdGVtcGxhdGUgPSBkb20uYnlJZChcImdhbGxlcnlFbnRyeVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgc2hvd0FjcXVpcmVJbWFnZSA9IG5ldyBDaGFubmVsPFt2b2lkXT4oKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IGNiblNlbGVjdGVkID0gbmV3IENoYW5uZWw8W251bWJlcl0+KClcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihkYjogSURCRGF0YWJhc2UpIHtcclxuICAgICAgICB0aGlzLmRiID0gZGJcclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy51aSwgXCJjbGlja1wiLCBcIi5nYWxsZXJ5LWVudHJ5XCIsIChldnQpID0+IHRoaXMub25FbnRyeUNsaWNrKGV2dCkpXHJcbiAgICAgICAgdGhpcy5nYWxsZXJ5QWNxdWlyZUltYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnNob3dBY3F1aXJlSW1hZ2UucHVibGlzaCgpKVxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLnVpLCBcImNsaWNrXCIsIFwiLmdhbGxlcnktZGVsZXRlLWJ1dHRvblwiLCAoZXZ0KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMub25FbnRyeURlbGV0ZShldnQpXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgYXN5bmMgc2hvdygpIHtcclxuICAgICAgICB0aGlzLnVpLmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgYXdhaXQgdGhpcy5yZWRyYXcoKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBoaWRlKCkge1xyXG4gICAgICAgIHRoaXMudWkuaGlkZGVuID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25FbnRyeUNsaWNrKGV2dDogRXZlbnQpIHtcclxuICAgICAgICBjb25zdCB0YXJnZXQgPSBldnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50XHJcbiAgICAgICAgaWYgKCF0YXJnZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXRhcmdldC5tYXRjaGVzKFwiLmdhbGxlcnktaW1hZ2VcIikpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBkaXYgPSAoZXZ0LnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdChcIi5nYWxsZXJ5LWVudHJ5XCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICAgICAgaWYgKCFkaXYpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBrZXkgPSBwYXJzZUludChkaXYuZGF0YXNldFtcImtleVwiXSB8fCBcIlwiKVxyXG4gICAgICAgIGlmICgha2V5KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jYm5TZWxlY3RlZC5wdWJsaXNoKGtleSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIG9uRW50cnlEZWxldGUoZXZ0OiBFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IGRpdiA9IChldnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KFwiLmdhbGxlcnktZW50cnlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgICAgICBpZiAoIWRpdikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGtleSA9IHBhcnNlSW50KGRpdi5kYXRhc2V0W1wia2V5XCJdIHx8IFwiXCIpXHJcbiAgICAgICAgaWYgKCFrZXkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhd2FpdCBkZWxldGVDQk4odGhpcy5kYiwga2V5KVxyXG4gICAgICAgIGF3YWl0IHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlZHJhdygpIHtcclxuICAgICAgICAvLyBjbGVhciBjdXJyZW50IHVpXHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRoaXMuY2Juc0RpdilcclxuXHJcbiAgICAgICAgY29uc3Qga3ZzID0gYXdhaXQgZ2V0QWxsQ0JOcyh0aGlzLmRiKVxyXG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgY2JuXSBvZiBrdnMpIHtcclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0aGlzLnRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnRcclxuICAgICAgICAgICAgY29uc3QgZW50cnlEaXYgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuZ2FsbGVyeS1lbnRyeVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgICAgICAgICBjb25zdCBpbWFnZURpdiA9IGRvbS5ieVNlbGVjdG9yKGVudHJ5RGl2LCBcIi5nYWxsZXJ5LWltYWdlXCIpIGFzIEhUTUxJbWFnZUVsZW1lbnRcclxuICAgICAgICAgICAgaW1hZ2VEaXYuc3JjID0gVVJMLmNyZWF0ZU9iamVjdFVSTChjYm4ucHJldmlldylcclxuICAgICAgICAgICAgZW50cnlEaXYuZGF0YXNldFtcImtleVwiXSA9IGtleS50b1N0cmluZygpXHJcbiAgICAgICAgICAgIHRoaXMuY2Juc0Rpdi5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XHJcbiAgICBjb25zdCBkYiA9IGF3YWl0IG9wZW5EQigpXHJcbiAgICBhd2FpdCB2YWxpZGF0ZURhdGEoZGIpXHJcblxyXG4gICAgY29uc3QgYWNxdWlyZVVpID0gbmV3IEFjcXVpcmVVaSgpXHJcbiAgICBjb25zdCBzaXplVWkgPSBuZXcgSW1hZ2VTaXplVWkoZGIpXHJcbiAgICBjb25zdCBwbGF5VWkgPSBuZXcgUGxheVVpKGRiKVxyXG4gICAgY29uc3QgZ2FsbGVyeVVpID0gbmV3IEdhbGxlcnlVaShkYilcclxuXHJcbiAgICBhY3F1aXJlVWkuaW1hZ2VBY3F1aXJlZC5zdWJjcmliZShvbkltYWdlQWNxdWlyZWQpXHJcbiAgICBhY3F1aXJlVWkuc2hvd0dhbGxlcnkuc3ViY3JpYmUoc2hvd0dhbGxlcnkpXHJcbiAgICBzaXplVWkuY3JlYXRlQ0JOLnN1YmNyaWJlKHNob3dQbGF5KVxyXG4gICAgc2l6ZVVpLnJldHVybi5zdWJjcmliZShzaG93QWNxdWlyZSlcclxuICAgIHBsYXlVaS5yZXR1cm4uc3ViY3JpYmUoc2hvd0FjcXVpcmUpXHJcbiAgICBnYWxsZXJ5VWkuc2hvd0FjcXVpcmVJbWFnZS5zdWJjcmliZShzaG93QWNxdWlyZSlcclxuICAgIGdhbGxlcnlVaS5jYm5TZWxlY3RlZC5zdWJjcmliZShzaG93UGxheSlcclxuXHJcbiAgICAvLyBpbml0aWFsbHkgc2hvdyBhY3F1aXJlIHVpXHJcbiAgICBhY3F1aXJlVWkuc2hvdygpXHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gb3BlbkRCKCk6IFByb21pc2U8SURCRGF0YWJhc2U+IHtcclxuICAgICAgICAvLyBvcGVuIC8gc2V0dXAgZGJcclxuICAgICAgICAvLyBhd2FpdCBpbmRleGVkREIuZGVsZXRlRGF0YWJhc2UoXCJjYm5cIilcclxuICAgICAgICBjb25zdCByZXEgPSBpbmRleGVkREIub3BlbihcImNiblwiLCAxKVxyXG4gICAgICAgIHJlcS5hZGRFdmVudExpc3RlbmVyKFwiYmxvY2tlZFwiLCBfID0+IGRiQmxvY2tlZCgpKVxyXG4gICAgICAgIHJlcS5hZGRFdmVudExpc3RlbmVyKFwidXBncmFkZW5lZWRlZFwiLCBldiA9PiB1cGdyYWRlREIoZXYpKVxyXG4gICAgICAgIGNvbnN0IGRiID0gYXdhaXQgaWRiLndhaXRSZXF1ZXN0KHJlcSlcclxuICAgICAgICByZXR1cm4gZGJcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBvbkltYWdlQWNxdWlyZWQoaW1nOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIGF3YWl0IHNob3dMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgICAgICBhY3F1aXJlVWkuaGlkZSgpXHJcbiAgICAgICAgc2l6ZVVpLnNob3coaW1nKVxyXG4gICAgICAgIGhpZGVMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzaG93QWNxdWlyZSgpIHtcclxuICAgICAgICBoaWRlQWxsKClcclxuICAgICAgICBhY3F1aXJlVWkuc2hvdygpXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2hvd0dhbGxlcnkoKSB7XHJcbiAgICAgICAgaGlkZUFsbCgpXHJcbiAgICAgICAgZ2FsbGVyeVVpLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIHNob3dQbGF5KGtleTogbnVtYmVyKSB7XHJcbiAgICAgICAgYXdhaXQgc2hvd0xvYWRpbmdJbmRpY2F0b3IoKVxyXG4gICAgICAgIGhpZGVBbGwoKVxyXG4gICAgICAgIHBsYXlVaS5zaG93KGtleSlcclxuICAgICAgICBoaWRlTG9hZGluZ0luZGljYXRvcigpXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaGlkZUFsbCgpIHtcclxuICAgICAgICBwbGF5VWkuaGlkZSgpXHJcbiAgICAgICAgc2l6ZVVpLmhpZGUoKVxyXG4gICAgICAgIGFjcXVpcmVVaS5oaWRlKClcclxuICAgICAgICBnYWxsZXJ5VWkuaGlkZSgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RQYWxldHRlKGltZ0RhdGE6IEltYWdlRGF0YSk6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgZGF0YSB9ID0gaW1nRGF0YVxyXG4gICAgY29uc3Qgcm93UGl0Y2ggPSB3aWR0aCAqIDRcclxuXHJcbiAgICAvLyBmaW5kIHVuaXF1ZSBjb2xvcnMsIGNyZWF0ZSBlbnRyeSBmb3IgZWFjaFxyXG4gICAgY29uc3QgcGFsZXR0ZSA9IG5ldyBTZXQ8bnVtYmVyPigpXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiByb3dQaXRjaFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICAvLyBwYWNrIGNvbG9yIHRvIGEgdW5pcXVlIHZhbHVlXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4ICogNFxyXG4gICAgICAgICAgICBjb25zdCByID0gZGF0YVtvZmZzZXRdXHJcbiAgICAgICAgICAgIGNvbnN0IGcgPSBkYXRhW29mZnNldCArIDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGIgPSBkYXRhW29mZnNldCArIDJdXHJcbiAgICAgICAgICAgIGNvbnN0IGEgPSBkYXRhW29mZnNldCArIDNdXHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gY29sb3IucGFjayhyLCBnLCBiLCBhKVxyXG4gICAgICAgICAgICBwYWxldHRlLmFkZCh2YWx1ZSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFsuLi5wYWxldHRlXVxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGFuIG92ZXJsYXkgdGhhdCBtYXBzIGVhY2ggcGl4ZWwgdG8gdGhlIGluZGV4IG9mIGl0cyBwYWxldHRlIGVudHJ5XHJcbiAqIEBwYXJhbSBpbWdEYXRhIGltYWdlIGRhdGFcclxuICogQHBhcmFtIHBhbGV0dGUgcGFsZXR0ZSBjb2xvcnNcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZVBhbGV0dGVPdmVybGF5KGltZ0RhdGE6IEltYWdlRGF0YSwgcGFsZXR0ZTogbnVtYmVyW10pOiBudW1iZXJbXSB7XHJcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQsIGRhdGEgfSA9IGltZ0RhdGFcclxuICAgIGNvbnN0IHBhbGV0dGVNYXAgPSBhcnJheS5tYXBJbmRpY2VzKHBhbGV0dGUpXHJcbiAgICBjb25zdCByb3dQaXRjaCA9IHdpZHRoICogNFxyXG4gICAgY29uc3Qgb3ZlcmxheSA9IGFycmF5LnVuaWZvcm0oLTEsIHdpZHRoICogaGVpZ2h0KVxyXG5cclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHJvd1BpdGNoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIC8vIHBhY2sgY29sb3IgdG8gYSB1bmlxdWUgdmFsdWVcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHggKiA0XHJcbiAgICAgICAgICAgIGNvbnN0IHIgPSBkYXRhW29mZnNldF1cclxuICAgICAgICAgICAgY29uc3QgZyA9IGRhdGFbb2Zmc2V0ICsgMV1cclxuICAgICAgICAgICAgY29uc3QgYiA9IGRhdGFbb2Zmc2V0ICsgMl1cclxuICAgICAgICAgICAgY29uc3QgYSA9IGRhdGFbb2Zmc2V0ICsgM11cclxuICAgICAgICAgICAgY29uc3QgcmdiYSA9IGNvbG9yLnBhY2sociwgZywgYiwgYSlcclxuICAgICAgICAgICAgY29uc3QgaWR4ID0gcGFsZXR0ZU1hcC5nZXQocmdiYSkgPz8gLTFcclxuICAgICAgICAgICAgb3ZlcmxheVt5ICogd2lkdGggKyB4XSA9IGlkeFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gb3ZlcmxheVxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGFuIG92ZXJsYXkgdGhhdCBtYXBzIGVhY2ggcGFsZXR0ZSBlbnRyeSB0byBhIGxpc3Qgb2YgcGl4ZWxzIHdpdGggaXRzIGNvbG9yXHJcbiAqIEBwYXJhbSBpbWdEYXRhIFxyXG4gKiBAcGFyYW0gcGFsZXR0ZSBcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZVBpeGVsT3ZlcmxheSh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcGFsZXR0ZTogbnVtYmVyW10sIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSk6IFNldDxudW1iZXI+W10ge1xyXG4gICAgY29uc3Qgb3ZlcmxheSA9IGFycmF5LmdlbmVyYXRlKHBhbGV0dGUubGVuZ3RoLCAoKSA9PiBuZXcgU2V0PG51bWJlcj4oKSlcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHdpZHRoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIC8vIHBhY2sgY29sb3IgdG8gYSB1bmlxdWUgdmFsdWVcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgcGFsZXR0ZUlkeCA9IHBhbGV0dGVPdmVybGF5W29mZnNldF1cclxuICAgICAgICAgICAgaWYgKHBhbGV0dGVJZHggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBmbGF0Q29vcmQgPSBpbWFnaW5nLmZsYXQoeCwgeSwgd2lkdGgpXHJcbiAgICAgICAgICAgIG92ZXJsYXlbcGFsZXR0ZUlkeF0uYWRkKGZsYXRDb29yZClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG92ZXJsYXlcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGNhbGNMdW1pbmFuY2UocjogbnVtYmVyLCBnOiBudW1iZXIsIGI6IG51bWJlcikge1xyXG4gICAgY29uc3QgbCA9IDAuMjEyNiAqIChyIC8gMjU1KSArIDAuNzE1MiAqIChnIC8gMjU1KSArIDAuMDcyMiAqIChiIC8gMjU1KVxyXG4gICAgcmV0dXJuIGxcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0NlbGxJbWFnZShjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHBhbGV0dGVPdmVybGF5OiBudW1iZXJbXSkge1xyXG4gICAgY29uc3QgY2VsbEltYWdlV2lkdGggPSB3aWR0aCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG4gICAgY29uc3QgY2VsbEltYWdlSGVpZ2h0ID0gaGVpZ2h0ICogKGNlbGxTaXplICsgMSkgKyAxXHJcblxyXG4gICAgLy8gc2l6ZSBjYW52YXNcclxuICAgIGN0eC5jYW52YXMud2lkdGggPSBjZWxsSW1hZ2VXaWR0aFxyXG4gICAgY3R4LmNhbnZhcy5oZWlnaHQgPSBjZWxsSW1hZ2VIZWlnaHRcclxuXHJcbiAgICAvLyBkcmF3IGhvcml6b250YWwgZ3JpZCBsaW5lc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gaGVpZ2h0OyArK2kpIHtcclxuICAgICAgICBjdHguc3Ryb2tlUmVjdCgwLCBpICogKGNlbGxTaXplICsgMSksIGNlbGxJbWFnZVdpZHRoLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgdmVydGljYWwgZ3JpZCBsaW5lc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gd2lkdGg7ICsraSkge1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KGkgKiAoY2VsbFNpemUgKyAxKSwgMCwgMSwgY2VsbEltYWdlSGVpZ2h0KVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgI3NcclxuICAgIGNvbnN0IGZvbnQgPSBjdHguZm9udFxyXG4gICAgY3R4LmZvbnQgPSBcIjE2cHggYXJpYWxcIlxyXG4gICAgY29uc3QgdGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGhcclxuICAgIGNvbnN0IGNkeHkgPSBjZWxsU2l6ZSAvIDJcclxuXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiB3aWR0aFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgICAgICBjb25zdCBwYWxldHRlSWR4ID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0XVxyXG4gICAgICAgICAgICBjb25zdCBsYWJlbCA9IGAke3BhbGV0dGVJZHggKyAxfWBcclxuICAgICAgICAgICAgY29uc3QgbWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dChsYWJlbClcclxuICAgICAgICAgICAgY29uc3QgY3ggPSB4ICogKGNlbGxTaXplICsgMSkgKyBjZHh5ICsgMSAtIG1ldHJpY3Mud2lkdGggLyAyXHJcbiAgICAgICAgICAgIGNvbnN0IGN5ID0geSAqIChjZWxsU2l6ZSArIDEpICsgY2R4eSArIDEgKyB0ZXh0SGVpZ2h0IC8gMlxyXG4gICAgICAgICAgICBjdHguZmlsbFRleHQobGFiZWwsIGN4LCBjeSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmZvbnQgPSBmb250XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpdCh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgbWF4U2l6ZTogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICBpZiAod2lkdGggPj0gaGVpZ2h0ICYmIHdpZHRoID4gbWF4U2l6ZSkge1xyXG4gICAgICAgIGhlaWdodCA9IG1heFNpemUgKiBoZWlnaHQgLyB3aWR0aFxyXG4gICAgICAgIHJldHVybiBbTWF0aC5mbG9vcihtYXhTaXplKSwgTWF0aC5mbG9vcihoZWlnaHQpXVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChoZWlnaHQgPiB3aWR0aCAmJiBoZWlnaHQgPiBtYXhTaXplKSB7XHJcbiAgICAgICAgd2lkdGggPSBtYXhTaXplICogd2lkdGggLyBoZWlnaHRcclxuICAgICAgICByZXR1cm4gW01hdGguZmxvb3Iod2lkdGgpLCBNYXRoLmZsb29yKG1heFNpemUpXVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBbTWF0aC5mbG9vcih3aWR0aCksIE1hdGguZmxvb3IoaGVpZ2h0KV1cclxufVxyXG5cclxuLyoqXHJcbiAgICogQ29udmVydCBhbiBpbWFnZSB4IG9yIHkgY29vcmRpbmF0ZSB0byB0b3Agb3IgbGVmdCBvZiBjYm4gY2VsbCBjb250YWluaW5nIHRoYXQgcGl4ZWxcclxuICAgKiBAcGFyYW0gY29vcmQgeCBvciB5IGNvb3JkaW5hdGVcclxuICAgKi9cclxuZnVuY3Rpb24gaW1hZ2UyQ2VsbENvb3JkKGNvb3JkOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIGNvb3JkICogKGNlbGxTaXplICsgMSkgKyAxXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0IGEgY2JuIHggb3IgeSBjb29yZGluYXRlIHRvIHRvcCBvciBsZWZ0IG9mIGNibiBjZWxsIGNvbnRhaW5pbmcgdGhhdCBwaXhlbFxyXG4gKiBAcGFyYW0gY29vcmQgeCBvciB5IGNvb3JkaW5hdGVcclxuICovXHJcbmZ1bmN0aW9uIGNlbGwySW1hZ2VDb29yZChjb29yZDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBNYXRoLmZsb29yKChjb29yZCAtIDEpIC8gKGNlbGxTaXplICsgMSkpXHJcbn1cclxuXHJcbi8qKlxyXG4gICAqIENvbnZlcnQgYW4gaW1hZ2UgeCBvciB5IGNvb3JkaW5hdGUgdG8gdG9wIG9yIGxlZnQgb2YgY2JuIGNlbGwgY29udGFpbmluZyB0aGF0IHBpeGVsXHJcbiAgICogQHBhcmFtIGNvb3JkIHggb3IgeSBjb29yZGluYXRlXHJcbiAgICovXHJcbmZ1bmN0aW9uIGltYWdlMkNlbGwoeDogbnVtYmVyLCB5OiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIHJldHVybiBbaW1hZ2UyQ2VsbENvb3JkKHgpLCBpbWFnZTJDZWxsQ29vcmQoeSldXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0IGEgY2JuIHggb3IgeSBjb29yZGluYXRlIHRvIHRvcCBvciBsZWZ0IG9mIGNibiBjZWxsIGNvbnRhaW5pbmcgdGhhdCBwaXhlbFxyXG4gKiBAcGFyYW0gY29vcmQgeCBvciB5IGNvb3JkaW5hdGVcclxuICovXHJcbmZ1bmN0aW9uIGNlbGwySW1hZ2UoeDogbnVtYmVyLCB5OiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIHJldHVybiBbY2VsbDJJbWFnZUNvb3JkKHgpLCBjZWxsMkltYWdlQ29vcmQoeSldXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjb252ZXJ0IHJnYmEgY29vcmRpbmF0ZXMgdG8gYSBzdHlsZSBzdHJpbmdcclxuICogQHBhcmFtIHIgcmVkXHJcbiAqIEBwYXJhbSBnIGdyZWVuXHJcbiAqIEBwYXJhbSBiIGJsdWVcclxuICogQHBhcmFtIGEgYWxwaGFcclxuICovXHJcbmZ1bmN0aW9uIGNvbG9yMlJHQkFTdHlsZShyOiBudW1iZXIsIGc6IG51bWJlciwgYjogbnVtYmVyLCBhOiBudW1iZXIgPSAyNTUpIHtcclxuICAgIHJldHVybiBgcmdiYSgke3J9LCAke2d9LCAke2J9LCAke2EgLyAyNTV9KWBcclxufVxyXG5cclxuZnVuY3Rpb24gcHJ1bmVQYWxsZXRlKHBhbGV0dGU6IG51bWJlcltdLCBwaXhlbE92ZXJsYXk6IFNldDxudW1iZXI+W10sIG1heFBpeGVsczogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQpOiBudW1iZXJbXSB7XHJcbiAgICBjb25zdCBpbmRpY2VzVG9LZWVwID0gbmV3IFNldDxudW1iZXI+KGFycmF5LnNlcXVlbmNlKDAsIHBhbGV0dGUubGVuZ3RoKSlcclxuXHJcbiAgICBjdHguY2FudmFzLndpZHRoID0gd2lkdGggKiAoY2VsbFNpemUgKyAxKSArIDFcclxuICAgIGN0eC5jYW52YXMuaGVpZ2h0ID0gaGVpZ2h0ICogKGNlbGxTaXplICsgMSkgKyAxXHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwaXhlbE92ZXJsYXkubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCBwaXhlbHMgPSBwaXhlbE92ZXJsYXlbaV1cclxuICAgICAgICBpZiAocGl4ZWxzLnNpemUgPCBtYXhQaXhlbHMpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpdGVyLmFsbChwaXhlbHMsIHggPT4gIWlzQm9yZGVyUGl4ZWwoLi4uaW1hZ2luZy51bmZsYXQoeCwgd2lkdGgpLCB3aWR0aCwgaGVpZ2h0KSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGZpbGwgdGhlc2UgcGl4ZWxzIGluIGltYWdlIHdpdGggYXBwcm9wcmlhdGUgY29sb3JcclxuICAgICAgICBjb25zdCBbciwgZywgYl0gPSBjb2xvci51bnBhY2socGFsZXR0ZVtpXSlcclxuICAgICAgICBmb3IgKGNvbnN0IHh5IG9mIHBpeGVscykge1xyXG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSBpbWFnaW5nLnVuZmxhdCh4eSwgd2lkdGgpXHJcbiAgICAgICAgICAgIGNvbnN0IFtjeCwgY3ldID0gaW1hZ2UyQ2VsbCh4LCB5KVxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gY29sb3IyUkdCQVN0eWxlKHIsIGcsIGIpXHJcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdChjeCwgY3ksIGNlbGxTaXplLCBjZWxsU2l6ZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGluZGljZXNUb0tlZXAuZGVsZXRlKGkpXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbmV3UGFsZXR0ZSA9IFsuLi5pbmRpY2VzVG9LZWVwXS5tYXAoeCA9PiBwYWxldHRlW3hdKVxyXG4gICAgcmV0dXJuIG5ld1BhbGV0dGVcclxufVxyXG5cclxuZnVuY3Rpb24gaXNCb3JkZXJQaXhlbCh4OiBudW1iZXIsIHk6IG51bWJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB4ID09PSAwIHx8IHkgPT09IDAgfHwgeCA9PT0gd2lkdGggLSAxIHx8IHkgPT09IGhlaWdodCAtIDFcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gc2hvd0xvYWRpbmdJbmRpY2F0b3IoKSB7XHJcbiAgICBjb25zdCBkaXYgPSBkb20uYnlJZChcImxvYWRpbmdNb2RhbFwiKVxyXG4gICAgZGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICBhd2FpdCB1dGlsLndhaXQoMClcclxufVxyXG5cclxuZnVuY3Rpb24gaGlkZUxvYWRpbmdJbmRpY2F0b3IoKSB7XHJcbiAgICBjb25zdCBkaXYgPSBkb20uYnlJZChcImxvYWRpbmdNb2RhbFwiKVxyXG4gICAgZGl2LmhpZGRlbiA9IHRydWVcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gdXBncmFkZURCKGV2dDogSURCVmVyc2lvbkNoYW5nZUV2ZW50KSB7XHJcbiAgICBjb25zdCBkYiA9IChldnQudGFyZ2V0IGFzIElEQk9wZW5EQlJlcXVlc3QpLnJlc3VsdFxyXG5cclxuICAgIC8vIG5vdGUgLSBldmVudCBjb250YWlucyBvbGQgLyBuZXcgdmVyc2lvbnMgaWYgcmVxdWlyZWRcclxuICAgIC8vIHVwZGF0ZSB0byB0aGUgbmV3IHZlcnNpb25cclxuICAgIGlmIChldnQub2xkVmVyc2lvbiA8IDEpIHtcclxuICAgICAgICB1cGdyYWRlREIxKGRiKVxyXG4gICAgfVxyXG5cclxuICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHVwZ3JhZGVEQjEoZGI6IElEQkRhdGFiYXNlKSB7XHJcbiAgICBkYi5jcmVhdGVPYmplY3RTdG9yZShwaWN0dXJlc09iamVjdFN0b3JlTmFtZSwgeyBhdXRvSW5jcmVtZW50OiB0cnVlIH0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRiQmxvY2tlZCgpIHtcclxuICAgIHNob3dFcnJvcihcIlBpY3R1cmUgZGF0YWJhc2UgbmVlZHMgdXBkYXRlZCwgYnV0IG90aGVyIHRhYnMgYXJlIG9wZW4gdGhhdCBhcmUgdXNpbmcgaXQuIFBsZWFzZSBjbG9zZSBhbGwgdGFicyBmb3IgdGhpcyB3ZWIgc2l0ZSBhbmQgdHJ5IGFnYWluLlwiKVxyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93RXJyb3IobWVzc2FnZTogc3RyaW5nKSB7XHJcbiAgICBjb25zdCBtb2RhbERpdiA9IGRvbS5ieUlkKFwiZXJyb3JNb2RhbFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgY29uc3QgbWVzc2FnZURpdiA9IGRvbS5ieUlkKFwiZXJyb3JNZXNzYWdlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBtb2RhbERpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgbWVzc2FnZURpdi50ZXh0Q29udGVudCA9IG1lc3NhZ2VcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gcHV0Q0JOKGRiOiBJREJEYXRhYmFzZSwgZGF0YTogQ0JOUGljdHVyZSwga2V5PzogbnVtYmVyKTogUHJvbWlzZTxudW1iZXI+IHtcclxuICAgIC8vIG5vdGUgc2FmYXJpIGNhbid0IHN0b3JlIGJsb2JzIHNvIG11c3QgY29udmVydCB0byBhcnJheUJ1ZmZlclxyXG4gICAgY29uc3QgZGJEYXRhID0gYXdhaXQgY2JuMmRiKGRhdGEpXHJcbiAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lLCBcInJlYWR3cml0ZVwiKVxyXG4gICAgY29uc3Qgc3RvcmUgPSB0eC5vYmplY3RTdG9yZShwaWN0dXJlc09iamVjdFN0b3JlTmFtZSlcclxuICAgIGNvbnN0IGsgPSBhd2FpdCBpZGIud2FpdFJlcXVlc3Qoc3RvcmUucHV0KGRiRGF0YSwga2V5KSkgYXMgbnVtYmVyXHJcbiAgICByZXR1cm4ga1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBkZWxldGVDQk4oZGI6IElEQkRhdGFiYXNlLCBrZXk6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgLy8gbm90ZSBzYWZhcmkgY2FuJ3Qgc3RvcmUgYmxvYnMgc28gbXVzdCBjb252ZXJ0IHRvIGFycmF5QnVmZmVyXHJcbiAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lLCBcInJlYWR3cml0ZVwiKVxyXG4gICAgY29uc3Qgc3RvcmUgPSB0eC5vYmplY3RTdG9yZShwaWN0dXJlc09iamVjdFN0b3JlTmFtZSlcclxuICAgIGF3YWl0IGlkYi53YWl0UmVxdWVzdChzdG9yZS5kZWxldGUoa2V5KSlcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZ2V0Q0JOKGRiOiBJREJEYXRhYmFzZSwga2V5OiBudW1iZXIpOiBQcm9taXNlPENCTlBpY3R1cmU+IHtcclxuICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24ocGljdHVyZXNPYmplY3RTdG9yZU5hbWUsIFwicmVhZHdyaXRlXCIpXHJcbiAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lKVxyXG4gICAgY29uc3QgZGJEYXRhID0gYXdhaXQgaWRiLndhaXRSZXF1ZXN0KHN0b3JlLmdldChrZXkpKSBhcyBDQk5QaWN0dXJlREJcclxuICAgIGNvbnN0IGRhdGEgPSBkYjJjYm4oZGJEYXRhKVxyXG4gICAgYXdhaXQgaWRiLndhaXRUeCh0eClcclxuICAgIHJldHVybiBkYXRhXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGdldEFsbENCTnMoZGI6IElEQkRhdGFiYXNlKTogUHJvbWlzZTxbbnVtYmVyLCBDQk5QaWN0dXJlXVtdPiB7XHJcbiAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lLCBcInJlYWR3cml0ZVwiKVxyXG4gICAgY29uc3Qgc3RvcmUgPSB0eC5vYmplY3RTdG9yZShwaWN0dXJlc09iamVjdFN0b3JlTmFtZSlcclxuICAgIGNvbnN0IGRhdGFzID0gbmV3IEFycmF5PFtudW1iZXIsIENCTlBpY3R1cmVdPigpXHJcblxyXG4gICAgY29uc3QgcmVxID0gc3RvcmUub3BlbkN1cnNvcigpXHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgIGNvbnN0IGN1cnNvciA9IGF3YWl0IGlkYi53YWl0UmVxdWVzdChyZXEpXHJcbiAgICAgICAgaWYgKCFjdXJzb3IpIHtcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGtleSA9IGN1cnNvci5rZXkgYXMgbnVtYmVyXHJcbiAgICAgICAgY29uc3QgZGJEYXRhID0gY3Vyc29yLnZhbHVlIGFzIENCTlBpY3R1cmVEQlxyXG4gICAgICAgIGNvbnN0IGRhdGEgPSBkYjJjYm4oZGJEYXRhKVxyXG4gICAgICAgIGRhdGFzLnB1c2goW2tleSwgZGF0YV0pXHJcbiAgICAgICAgY3Vyc29yLmNvbnRpbnVlKClcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZGF0YXNcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gY2JuMmRiKGRhdGE6IENCTlBpY3R1cmUpOiBQcm9taXNlPENCTlBpY3R1cmVEQj4ge1xyXG4gICAgY29uc3QgaW1hZ2VCdWZmZXIgPSBhd2FpdCBpZGIuYmxvYjJBcnJheUJ1ZmZlcihkYXRhLmltYWdlKVxyXG4gICAgY29uc3QgcHJldmlld0J1ZmZlciA9IGF3YWl0IGlkYi5ibG9iMkFycmF5QnVmZmVyKGRhdGEucHJldmlldylcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGltYWdlOiBpbWFnZUJ1ZmZlcixcclxuICAgICAgICBwcmV2aWV3OiBwcmV2aWV3QnVmZmVyLFxyXG4gICAgICAgIHNlcXVlbmNlOiBkYXRhLnNlcXVlbmNlLFxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkYjJjYm4oZGF0YTogQ0JOUGljdHVyZURCKTogQ0JOUGljdHVyZSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGltYWdlOiBpZGIuYXJyYXlCdWZmZXIyQmxvYihkYXRhLmltYWdlLCBpbWFnZU1pbWVUeXBlKSxcclxuICAgICAgICBwcmV2aWV3OiBpZGIuYXJyYXlCdWZmZXIyQmxvYihkYXRhLnByZXZpZXcsIGltYWdlTWltZVR5cGUpLFxyXG4gICAgICAgIHNlcXVlbmNlOiBkYXRhLnNlcXVlbmNlXHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjcmVhdGVkIHByZXZpZXcgb2YgQ0JOIGNvbXBsZXRlZCB0aHVzIGZhclxyXG4gKiBAcGFyYW0gaW1hZ2UgaW1hZ2VcclxuICogQHBhcmFtIHNlcXVlbmNlIHNlcXVlbmNlIG9mIHBpeGVsIGluZGljZXMgY29tcGxldGVkIHRodXMgZmFyXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVQcmV2aWV3KGltYWdlOiBCbG9iLCBzZXF1ZW5jZTogbnVtYmVyW10pOiBQcm9taXNlPEJsb2I+IHtcclxuICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoaW1hZ2UpXHJcbiAgICBjb25zdCBpbWcgPSBhd2FpdCBkb20ubG9hZEltYWdlKHVybClcclxuICAgIGNvbnN0IGltYWdlQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgaW1hZ2VDYW52YXMud2lkdGggPSBpbWcud2lkdGhcclxuICAgIGltYWdlQ2FudmFzLmhlaWdodCA9IGltZy5oZWlnaHRcclxuICAgIGNvbnN0IGltYWdlQ3R4ID0gaW1hZ2VDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgaW1hZ2VDdHguZHJhd0ltYWdlKGltZywgMCwgMClcclxuXHJcbiAgICBjb25zdCBwcmV2aWV3Q2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgcHJldmlld0NhbnZhcy53aWR0aCA9IGltZy53aWR0aFxyXG4gICAgcHJldmlld0NhbnZhcy5oZWlnaHQgPSBpbWcuaGVpZ2h0XHJcbiAgICBjb25zdCBwcmV2aWV3Q3R4ID0gcHJldmlld0NhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcblxyXG4gICAgY29uc3QgaW1hZ2VEYXRhID0gaW1hZ2VDdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIGltZy53aWR0aCwgaW1nLmhlaWdodClcclxuICAgIGNvbnN0IHByZXZpZXdEYXRhID0gcHJldmlld0N0eC5nZXRJbWFnZURhdGEoMCwgMCwgaW1nLndpZHRoLCBpbWcuaGVpZ2h0KVxyXG5cclxuICAgIGZvciAoY29uc3QgaSBvZiBzZXF1ZW5jZSkge1xyXG4gICAgICAgIHByZXZpZXdEYXRhLmRhdGFbaSAqIDRdID0gaW1hZ2VEYXRhLmRhdGFbaSAqIDRdXHJcbiAgICAgICAgcHJldmlld0RhdGEuZGF0YVtpICogNCArIDFdID0gaW1hZ2VEYXRhLmRhdGFbaSAqIDQgKyAxXVxyXG4gICAgICAgIHByZXZpZXdEYXRhLmRhdGFbaSAqIDQgKyAyXSA9IGltYWdlRGF0YS5kYXRhW2kgKiA0ICsgMl1cclxuICAgICAgICBwcmV2aWV3RGF0YS5kYXRhW2kgKiA0ICsgM10gPSBpbWFnZURhdGEuZGF0YVtpICogNCArIDNdXHJcbiAgICB9XHJcblxyXG4gICAgcHJldmlld0N0eC5wdXRJbWFnZURhdGEocHJldmlld0RhdGEsIDAsIDApXHJcbiAgICBjb25zdCBwcmV2aWV3QmxvYiA9IGF3YWl0IGltYWdpbmcuY2FudmFzMkJsb2IocHJldmlld0NhbnZhcylcclxuICAgIHJldHVybiBwcmV2aWV3QmxvYlxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiB2YWxpZGF0ZURhdGEoZGI6IElEQkRhdGFiYXNlKSB7XHJcbiAgICAvLyBpdGVyYXRlIG92ZXIgYWxsIGNibiBpbWFnZXMsIHVwZGdyYWRlIG9iamVjdCBzdHJ1Y3R1cmUgaWYgbmVlZGVkXHJcbiAgICBjb25zdCBrdnMgPSBhd2FpdCBpZGIuZ2V0QWxsS2V5VmFsdWVzKGRiLCBwaWN0dXJlc09iamVjdFN0b3JlTmFtZSlcclxuICAgIGNvbnN0IHVwZGF0ZWRLdnMgPSBuZXcgQXJyYXk8W251bWJlciwgYW55XT4oKVxyXG5cclxuICAgIGZvciAoY29uc3QgW2tleSwgY2JuXSBvZiBrdnMpIHtcclxuICAgICAgICBpZiAoY2JuLnByZXZpZXcpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGltYWdlQmxvYiA9IGlkYi5hcnJheUJ1ZmZlcjJCbG9iKGNibi5pbWFnZSwgaW1hZ2VNaW1lVHlwZSlcclxuICAgICAgICBjb25zdCBwcmV2aWV3QmxvYiA9IGF3YWl0IGNyZWF0ZVByZXZpZXcoaW1hZ2VCbG9iLCBjYm4uc2VxdWVuY2UpXHJcbiAgICAgICAgY2JuLnByZXZpZXcgPSBhd2FpdCBpZGIuYmxvYjJBcnJheUJ1ZmZlcihwcmV2aWV3QmxvYikgXHJcbiAgICAgICAgdXBkYXRlZEt2cy5wdXNoKFtrZXkgYXMgbnVtYmVyLCBjYm5dKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24ocGljdHVyZXNPYmplY3RTdG9yZU5hbWUsIFwicmVhZHdyaXRlXCIpXHJcbiAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lKVxyXG4gICAgZm9yIChjb25zdCBba2V5LCBjYm5dIG9mIHVwZGF0ZWRLdnMpIHtcclxuICAgICAgICBhd2FpdCBpZGIud2FpdFJlcXVlc3Qoc3RvcmUucHV0KGNibiwga2V5KSkgYXMgbnVtYmVyXHJcbiAgICB9XHJcbn1cclxuXHJcbm1haW4oKSJdfQ==