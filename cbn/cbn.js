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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQTtBQUN2QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQUMvQyxPQUFPLEtBQUssS0FBSyxNQUFNLG9CQUFvQixDQUFBO0FBRTNDLDRDQUE0QztBQUM1QyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFFbkIsMkRBQTJEO0FBQzNELE1BQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFBO0FBRTlCLCtCQUErQjtBQUMvQixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQTtBQUVoQyx3QkFBd0I7QUFDeEIsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFBO0FBRXpCLHFCQUFxQjtBQUNyQixNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQTtBQUUzQixvQkFBb0I7QUFDcEIsTUFBTSx1QkFBdUIsR0FBRyxVQUFVLENBQUE7QUFFMUMsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFBO0FBRWpDLElBQUssVUFJSjtBQUpELFdBQUssVUFBVTtJQUNYLDJDQUFJLENBQUE7SUFDSiwyQ0FBSSxDQUFBO0lBQ0oseURBQVcsQ0FBQTtBQUNmLENBQUMsRUFKSSxVQUFVLEtBQVYsVUFBVSxRQUlkO0FBY0QsTUFBTSxPQUFPO0lBQWI7UUFDcUIsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBd0Is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SUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNqRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUUxRCxJQUFJLFlBQVksR0FBRyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDL0MsTUFBTSxFQUFFLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDdEQsTUFBTSxFQUFFLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZGLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxD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LElBQUksR0FBRyxFQUFFO1FBQzFCLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRTtZQUNiLFNBQVE7U0FDWDtRQUVELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sV0FBVyxHQUFHLE1BQU0sYUFBYSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDaEUsR0FBRyxDQUFDLE9BQU8sR0FBRyxNQUFNLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNyRCxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBYSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7S0FDeEM7SUFFRCxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQy9ELE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtJQUNyRCxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksVUFBVSxFQUFFO1FBQ2pDLE1BQU0sR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBVyxDQUFBO0tBQ3ZEO0FBQ0wsQ0FBQztBQUVELElBQUksRUFBRSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiXHJcbmltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzNkLmpzXCJcclxuaW1wb3J0ICogYXMgbWF0aCBmcm9tIFwiLi4vc2hhcmVkL21hdGguanNcIlxyXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gXCIuLi9zaGFyZWQvdXRpbC5qc1wiXHJcbmltcG9ydCAqIGFzIGl0ZXIgZnJvbSBcIi4uL3NoYXJlZC9pdGVyLmpzXCJcclxuaW1wb3J0ICogYXMgaWRiIGZyb20gXCIuLi9zaGFyZWQvaWRiLmpzXCJcclxuaW1wb3J0ICogYXMgaW1hZ2luZyBmcm9tIFwiLi4vc2hhcmVkL2ltYWdpbmcuanNcIlxyXG5pbXBvcnQgKiBhcyBjb2xvciBmcm9tIFwiLi4vc2hhcmVkL2NvbG9yLmpzXCJcclxuXHJcbi8vIHNpemUgdGhhdCBlYWNoIGltYWdlIHBpeGVsIGlzIGJsb3duIHVwIHRvXHJcbmNvbnN0IGNlbGxTaXplID0gMzJcclxuXHJcbi8vIHRvbGVyYW5jZSBiZWZvcmUgc3BsaXR0aW5nIGNvbG9ycyAtIGhpZ2hlciA9IGxlc3MgY29sb3JzXHJcbmNvbnN0IGNvbG9yUmFuZ2VUb2xlcmFuY2UgPSAzMlxyXG5cclxuLy8gbWF4IGJnIHBpeGVscyBiZWZvcmUgcmVtb3ZhbFxyXG5jb25zdCBtYXhCYWNrZ3JvdW5kUGl4ZWxzID0gMTAyNFxyXG5cclxuLy8gZGVmYXVsdCBtYXggZGltZW5zaW9uXHJcbmNvbnN0IGRlZmF1bHRNYXhEaW0gPSAxMjhcclxuXHJcbi8vIGRlZmF1bHQgbWF4IGNvbG9yc1xyXG5jb25zdCBkZWZhdWx0TWF4Q29sb3JzID0gNjRcclxuXHJcbi8vIG9iamVjdCBzdG9yZSBuYW1lXHJcbmNvbnN0IHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lID0gXCJwaWN0dXJlc1wiXHJcblxyXG5jb25zdCBpbWFnZU1pbWVUeXBlID0gXCJpbWFnZS9wbmdcIlxyXG5cclxuZW51bSBDYW1lcmFNb2RlIHtcclxuICAgIE5vbmUsXHJcbiAgICBVc2VyLFxyXG4gICAgRW52aXJvbm1lbnQsXHJcbn1cclxuXHJcbmludGVyZmFjZSBDQk5QaWN0dXJlIHtcclxuICAgIGltYWdlOiBCbG9iXHJcbiAgICBwcmV2aWV3OiBCbG9iXHJcbiAgICBzZXF1ZW5jZTogbnVtYmVyW11cclxufVxyXG5cclxuaW50ZXJmYWNlIENCTlBpY3R1cmVEQiB7XHJcbiAgICBpbWFnZTogQXJyYXlCdWZmZXJcclxuICAgIHByZXZpZXc6IEFycmF5QnVmZmVyXHJcbiAgICBzZXF1ZW5jZTogbnVtYmVyW11cclxufVxyXG5cclxuY2xhc3MgQ2hhbm5lbDxUIGV4dGVuZHMgYW55W10+IHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3Vic2NyaWJlcnMgPSBuZXcgU2V0PCguLi5hcmdzOiBUKSA9PiB2b2lkPigpXHJcblxyXG4gICAgcHVibGljIHN1YmNyaWJlKHN1YnNjcmliZXI6ICguLi5hcmdzOiBUKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVycy5hZGQoc3Vic2NyaWJlcilcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgdW5zdWJzY3JpYmUoc3Vic2NyaWJlcjogKC4uLmFyZ3M6IFQpID0+IHZvaWQpIHtcclxuICAgICAgICB0aGlzLnN1YnNjcmliZXJzLmRlbGV0ZShzdWJzY3JpYmVyKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBwdWJsaXNoKC4uLmFyZ3M6IFQpOiB2b2lkIHtcclxuICAgICAgICBmb3IgKGNvbnN0IHN1YnNjcmliZXIgb2YgdGhpcy5zdWJzY3JpYmVycykge1xyXG4gICAgICAgICAgICBzdWJzY3JpYmVyKC4uLmFyZ3MpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBBY3F1aXJlVWkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW1lcmEgPSBkb20uYnlJZChcImNhbWVyYVwiKSBhcyBIVE1MVmlkZW9FbGVtZW50XHJcbiAgICBwcml2YXRlIGNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLk5vbmVcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYWNxdWlyZUltYWdlRGl2ID0gZG9tLmJ5SWQoXCJhY3F1aXJlSW1hZ2VcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FwdHVyZUltYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJjYXB0dXJlSW1hZ2VCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VBY3F1aXNpdGlvbkRpdiA9IGRvbS5ieUlkKFwiaW1hZ2VBY3F1aXNpdGlvblVpXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpbGVEcm9wQm94ID0gZG9tLmJ5SWQoXCJmaWxlRHJvcEJveFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmaWxlSW5wdXQgPSBkb20uYnlJZChcImZpbGVJbnB1dFwiKSBhcyBIVE1MSW5wdXRFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpbGVCdXR0b24gPSBkb20uYnlJZChcImZpbGVCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdXNlQ2FtZXJhQnV0dG9uID0gZG9tLmJ5SWQoXCJ1c2VDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmxpcENhbWVyYUJ1dHRvbiA9IGRvbS5ieUlkKFwiZmxpcENhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdG9wQ2FtZXJhQnV0dG9uID0gZG9tLmJ5SWQoXCJzdG9wQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGdhbGxlcnlCdXR0b24gPSBkb20uYnlJZChcImdhbGxlcnlCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZXJyb3JzRGl2ID0gZG9tLmJ5SWQoXCJlcnJvcnNcIilcclxuICAgIHB1YmxpYyByZWFkb25seSBpbWFnZUFjcXVpcmVkID0gbmV3IENoYW5uZWw8W0hUTUxDYW52YXNFbGVtZW50XT4oKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsaWJyYXJ5VWkgPSBuZXcgTGlicmFyeVVpKClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgc2hvd0dhbGxlcnkgPSBuZXcgQ2hhbm5lbDxbdm9pZF0+KClcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmZpbGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5maWxlSW5wdXQuY2xpY2soKVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuZmlsZURyb3BCb3guYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdlbnRlclwiLCAoZSkgPT4gdGhpcy5vbkRyYWdFbnRlck92ZXIoZSkpXHJcbiAgICAgICAgdGhpcy5maWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ292ZXJcIiwgKGUpID0+IHRoaXMub25EcmFnRW50ZXJPdmVyKGUpKVxyXG4gICAgICAgIHRoaXMuZmlsZURyb3BCb3guYWRkRXZlbnRMaXN0ZW5lcihcImRyb3BcIiwgKGUpID0+IHRoaXMub25GaWxlRHJvcChlKSlcclxuICAgICAgICB0aGlzLmZpbGVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHRoaXMub25GaWxlQ2hhbmdlKCkpXHJcbiAgICAgICAgdGhpcy51c2VDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMudXNlQ2FtZXJhKCkpXHJcbiAgICAgICAgdGhpcy5mbGlwQ2FtZXJhQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmZsaXBDYW1lcmEoKSlcclxuICAgICAgICB0aGlzLnN0b3BDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuc3RvcENhbWVyYSgpKVxyXG4gICAgICAgIHRoaXMuY2FwdHVyZUltYWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmNhcHR1cmVJbWFnZSgpKVxyXG4gICAgICAgIHRoaXMuY2FtZXJhLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRtZXRhZGF0YVwiLCAoKSA9PiB0aGlzLm9uQ2FtZXJhTG9hZCgpKVxyXG4gICAgICAgIHRoaXMuZ2FsbGVyeUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgXyA9PiB0aGlzLnNob3dHYWxsZXJ5LnB1Ymxpc2goKSlcclxuXHJcbiAgICAgICAgdGhpcy5saWJyYXJ5VWkuY2FuY2VsLnN1YmNyaWJlKCgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5pbWFnZUFjcXVpc2l0aW9uRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2hvdygpIHtcclxuICAgICAgICB0aGlzLmltYWdlQWNxdWlzaXRpb25EaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICAgICAgLy8gdGhpcy5sb2FkRnJvbVVybChcIi9jYm4vYXNzZXRzL2xhcnJ5S29vcGEuanBnXCIpXHJcbiAgICAgICAgLy8gdGhpcy5sb2FkRnJvbVVybChcIi9jYm4vYXNzZXRzL29sdHNfZmxvd2VyLmpwZ1wiKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBoaWRlKCkge1xyXG4gICAgICAgIHRoaXMuaW1hZ2VBY3F1aXNpdGlvbkRpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkRyYWdFbnRlck92ZXIoZXY6IERyYWdFdmVudCkge1xyXG4gICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgZXYucHJldmVudERlZmF1bHQoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25GaWxlQ2hhbmdlKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5maWxlSW5wdXQuZmlsZXM/Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmZpbGVJbnB1dC5maWxlc1swXVxyXG4gICAgICAgIHRoaXMucHJvY2Vzc0ZpbGUoZmlsZSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uRmlsZURyb3AoZXY6IERyYWdFdmVudCkge1xyXG4gICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgZXYucHJldmVudERlZmF1bHQoKVxyXG5cclxuICAgICAgICBpZiAoIWV2Py5kYXRhVHJhbnNmZXI/LmZpbGVzPy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmaWxlID0gZXYuZGF0YVRyYW5zZmVyLmZpbGVzWzBdXHJcbiAgICAgICAgdGhpcy5wcm9jZXNzRmlsZShmaWxlKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgdXNlQ2FtZXJhKCkge1xyXG4gICAgICAgIHRoaXMuYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgY29uc3QgZGlhbG9nV2lkdGggPSB0aGlzLmFjcXVpcmVJbWFnZURpdi5jbGllbnRXaWR0aFxyXG4gICAgICAgIGNvbnN0IGRpYWxvZ0hlaWdodCA9IHRoaXMuYWNxdWlyZUltYWdlRGl2LmNsaWVudEhlaWdodFxyXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcclxuICAgICAgICAgICAgdmlkZW86IHsgd2lkdGg6IHsgbWF4OiBkaWFsb2dXaWR0aCB9LCBoZWlnaHQ6IHsgbWF4OiBkaWFsb2dIZWlnaHQgfSwgZmFjaW5nTW9kZTogXCJ1c2VyXCIgfSxcclxuICAgICAgICAgICAgYXVkaW86IGZhbHNlXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5jYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Vc2VyXHJcbiAgICAgICAgdGhpcy5jYW1lcmEuc3JjT2JqZWN0ID0gc3RyZWFtXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBmbGlwQ2FtZXJhKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5jYW1lcmEuc3JjT2JqZWN0KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc3JjID0gdGhpcy5jYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICAgICAgY29uc3QgdHJhY2tzID0gc3JjLmdldFRyYWNrcygpXHJcbiAgICAgICAgZm9yIChjb25zdCB0cmFjayBvZiB0cmFja3MpIHtcclxuICAgICAgICAgICAgdHJhY2suc3RvcCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbWVyYU1vZGUgPSB0aGlzLmNhbWVyYU1vZGUgPT0gQ2FtZXJhTW9kZS5Vc2VyID8gQ2FtZXJhTW9kZS5FbnZpcm9ubWVudCA6IENhbWVyYU1vZGUuVXNlclxyXG4gICAgICAgIGNvbnN0IGZhY2luZ01vZGUgPSB0aGlzLmNhbWVyYU1vZGUgPT0gQ2FtZXJhTW9kZS5Vc2VyID8gXCJ1c2VyXCIgOiBcImVudmlyb25tZW50XCJcclxuXHJcbiAgICAgICAgLy8gZ2V0IGN1cnJlbnQgZmFjaW5nIG1vZGVcclxuICAgICAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7XHJcbiAgICAgICAgICAgIHZpZGVvOiB7IHdpZHRoOiB0aGlzLmNhbWVyYS5jbGllbnRXaWR0aCwgaGVpZ2h0OiB0aGlzLmNhbWVyYS5jbGllbnRIZWlnaHQsIGZhY2luZ01vZGU6IGZhY2luZ01vZGUgfSxcclxuICAgICAgICAgICAgYXVkaW86IGZhbHNlXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5jYW1lcmEuc3JjT2JqZWN0ID0gc3RyZWFtXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkNhbWVyYUxvYWQoKSB7XHJcbiAgICAgICAgdGhpcy5hY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0aGlzLmNhbWVyYS5wbGF5KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHN0b3BDYW1lcmEoKSB7XHJcbiAgICAgICAgY29uc3Qgc3JjID0gdGhpcy5jYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICAgICAgaWYgKCFzcmMpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB0cmFja3MgPSBzcmMuZ2V0VHJhY2tzKClcclxuICAgICAgICBmb3IgKGNvbnN0IHRyYWNrIG9mIHRyYWNrcykge1xyXG4gICAgICAgICAgICB0cmFjay5zdG9wKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuTm9uZVxyXG4gICAgICAgIHRoaXMuYWNxdWlyZUltYWdlRGl2LmhpZGRlbiA9IHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNhcHR1cmVJbWFnZSgpIHtcclxuICAgICAgICB0aGlzLmNsZWFyRXJyb3JNZXNzYWdlcygpXHJcblxyXG4gICAgICAgIGNvbnN0IHNyYyA9IHRoaXMuY2FtZXJhLnNyY09iamVjdCBhcyBNZWRpYVN0cmVhbVxyXG4gICAgICAgIGlmICghc3JjKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdHJhY2sgPSBzcmMuZ2V0VmlkZW9UcmFja3MoKVswXVxyXG4gICAgICAgIGlmICghdHJhY2spIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmN0eC5jYW52YXMud2lkdGggPSB0aGlzLmNhbWVyYS52aWRlb1dpZHRoXHJcbiAgICAgICAgdGhpcy5jdHguY2FudmFzLmhlaWdodCA9IHRoaXMuY2FtZXJhLnZpZGVvSGVpZ2h0XHJcbiAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKHRoaXMuY2FtZXJhLCAwLCAwKVxyXG4gICAgICAgIHRoaXMuaW1hZ2VBY3F1aXJlZC5wdWJsaXNoKHRoaXMuY2FudmFzKVxyXG4gICAgICAgIHRoaXMuc3RvcENhbWVyYSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwcm9jZXNzRmlsZShmaWxlOiBGaWxlKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhckVycm9yTWVzc2FnZXMoKVxyXG4gICAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSlcclxuICAgICAgICB0aGlzLmxvYWRGcm9tVXJsKHVybClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxvYWRGcm9tVXJsKHVybDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhckVycm9yTWVzc2FnZXMoKVxyXG4gICAgICAgIGNvbnN0IGltZyA9IGF3YWl0IGRvbS5sb2FkSW1hZ2UodXJsKVxyXG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gaW1nLndpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gaW1nLmhlaWdodFxyXG4gICAgICAgIHRoaXMuY3R4LmRyYXdJbWFnZShpbWcsIDAsIDApXHJcbiAgICAgICAgdGhpcy5pbWFnZUFjcXVpcmVkLnB1Ymxpc2godGhpcy5jYW52YXMpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjbGVhckVycm9yTWVzc2FnZXMoKSB7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRoaXMuZXJyb3JzRGl2KVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBJbWFnZVNpemVVaSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRiOiBJREJEYXRhYmFzZVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZVNpemVEaXYgPSBkb20uYnlJZChcImltYWdlU2l6ZVVpXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1heERpbUlucHV0ID0gZG9tLmJ5SWQoXCJtYXhEaW1cIikgYXMgSFRNTElucHV0RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtYXhDb2xvcnNJbnB1dCA9IGRvbS5ieUlkKFwibWF4Q29sb3JzXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY3JlYXRlQ29sb3JCeU51bWJlckJ1dHRvbiA9IGRvbS5ieUlkKFwiY3JlYXRlQ29sb3JCeU51bWJlclwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZXR1cm5CdXR0b24gPSBkb20uYnlJZChcImltYWdlU2l6ZVJldHVyblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZVNjYWxlQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZVNjYWxlQ3R4ID0gdGhpcy5pbWFnZVNjYWxlQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VTaXplQ2FudmFzID0gZG9tLmJ5SWQoXCJpbWFnZVNpemVDYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VTaXplQ3R4ID0gdGhpcy5pbWFnZVNpemVDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSBpbWFnZUNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIHB1YmxpYyByZWFkb25seSBjcmVhdGVDQk4gPSBuZXcgQ2hhbm5lbDxbbnVtYmVyXT4oKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IHJldHVybiA9IG5ldyBDaGFubmVsPFtdPigpXHJcblxyXG4gICAgY29uc3RydWN0b3IoZGI6IElEQkRhdGFiYXNlKSB7XHJcbiAgICAgICAgdGhpcy5kYiA9IGRiXHJcbiAgICAgICAgdGhpcy5jcmVhdGVDb2xvckJ5TnVtYmVyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uQ3JlYXRlQ29sb3JCeU51bWJlcigpKVxyXG4gICAgICAgIHRoaXMucmV0dXJuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uUmV0dXJuQ2xpY2soKSlcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2hvdyhpbWFnZUNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICB0aGlzLmltYWdlU2l6ZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuaW1hZ2VDYW52YXMgPSBpbWFnZUNhbnZhc1xyXG4gICAgICAgIHRoaXMubWF4RGltSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB0aGlzLm9uTWF4RGltQ2hhbmdlKCkpXHJcbiAgICAgICAgdGhpcy5tYXhDb2xvcnNJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHRoaXMub25NYXhDb2xvcnNDaGFuZ2UoKSlcclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5pbWFnZVNpemVEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgb25DcmVhdGVDb2xvckJ5TnVtYmVyKCkge1xyXG4gICAgICAgIGNvbnN0IGJsb2IgPSBhd2FpdCBpbWFnaW5nLmNhbnZhczJCbG9iKHRoaXMuaW1hZ2VTY2FsZUNhbnZhcywgaW1hZ2VNaW1lVHlwZSlcclxuICAgICAgICBjb25zdCBwcmV2aWV3ID0gYXdhaXQgY3JlYXRlUHJldmlldyhibG9iLCBbXSlcclxuXHJcbiAgICAgICAgY29uc3QgY2JuOiBDQk5QaWN0dXJlID0ge1xyXG4gICAgICAgICAgICBpbWFnZTogYmxvYixcclxuICAgICAgICAgICAgc2VxdWVuY2U6IFtdLFxyXG4gICAgICAgICAgICBwcmV2aWV3OiBwcmV2aWV3XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBrZXkgPSBhd2FpdCBwdXRDQk4odGhpcy5kYiwgY2JuKVxyXG4gICAgICAgIHRoaXMuY3JlYXRlQ0JOLnB1Ymxpc2goa2V5KVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25SZXR1cm5DbGljaygpIHtcclxuICAgICAgICB0aGlzLnJldHVybi5wdWJsaXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIG9uTWF4RGltQ2hhbmdlKCkge1xyXG4gICAgICAgIGF3YWl0IHNob3dMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgaGlkZUxvYWRpbmdJbmRpY2F0b3IoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgb25NYXhDb2xvcnNDaGFuZ2UoKSB7XHJcbiAgICAgICAgYXdhaXQgc2hvd0xvYWRpbmdJbmRpY2F0b3IoKVxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICBoaWRlTG9hZGluZ0luZGljYXRvcigpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZWRyYXcoKSB7XHJcbiAgICAgICAgdGhpcy5pbWFnZVNpemVDYW52YXMud2lkdGggPSB0aGlzLmltYWdlU2l6ZUNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgIHRoaXMuaW1hZ2VTaXplQ2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2VTaXplQ2FudmFzLmNsaWVudEhlaWdodFxyXG5cclxuICAgICAgICBjb25zdCBtYXhEaW0gPSB0aGlzLmdldE1heERpbSgpXHJcbiAgICAgICAgY29uc3QgbWF4Q29sb3JzID0gdGhpcy5nZXRNYXhDb2xvcnMoKVxyXG4gICAgICAgIGNvbnN0IFt3LCBoXSA9IGZpdCh0aGlzLmltYWdlQ2FudmFzLndpZHRoLCB0aGlzLmltYWdlQ2FudmFzLmhlaWdodCwgbWF4RGltKVxyXG4gICAgICAgIHRoaXMuaW1hZ2VTY2FsZUNhbnZhcy53aWR0aCA9IHdcclxuICAgICAgICB0aGlzLmltYWdlU2NhbGVDYW52YXMuaGVpZ2h0ID0gaFxyXG4gICAgICAgIHRoaXMuaW1hZ2VTY2FsZUN0eC5kcmF3SW1hZ2UodGhpcy5pbWFnZUNhbnZhcywgMCwgMCwgdywgaClcclxuICAgICAgICBpbWFnaW5nLnF1YW50TWVkaWFuQ3V0KHRoaXMuaW1hZ2VTY2FsZUN0eCwgbWF4Q29sb3JzLCBjb2xvclJhbmdlVG9sZXJhbmNlKVxyXG4gICAgICAgIGNvbnN0IG1pblNjYWxlID0gTWF0aC5taW4odGhpcy5pbWFnZVNpemVDYW52YXMuY2xpZW50V2lkdGggLyB3LCB0aGlzLmltYWdlU2l6ZUNhbnZhcy5jbGllbnRIZWlnaHQgLyBoKVxyXG4gICAgICAgIGNvbnN0IHN3ID0gdyAqIG1pblNjYWxlXHJcbiAgICAgICAgY29uc3Qgc2ggPSBoICogbWluU2NhbGVcclxuICAgICAgICBjb25zdCB4ID0gKHRoaXMuaW1hZ2VTaXplQ2FudmFzLndpZHRoIC0gc3cpIC8gMlxyXG4gICAgICAgIGNvbnN0IHkgPSAodGhpcy5pbWFnZVNpemVDYW52YXMuaGVpZ2h0IC0gc2gpIC8gMlxyXG4gICAgICAgIHRoaXMuaW1hZ2VTaXplQ3R4LmRyYXdJbWFnZSh0aGlzLmltYWdlU2NhbGVDYW52YXMsIHgsIHksIHN3LCBzaClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldE1heERpbSgpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBtYXhEaW0gPSBwYXJzZUludCh0aGlzLm1heERpbUlucHV0LnZhbHVlKVxyXG4gICAgICAgIGlmICghbWF4RGltKSB7XHJcbiAgICAgICAgICAgIG1heERpbSA9IGRlZmF1bHRNYXhEaW1cclxuICAgICAgICAgICAgdGhpcy5tYXhEaW1JbnB1dC52YWx1ZSA9IG1heERpbS50b1N0cmluZygpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbWF4RGltXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRNYXhDb2xvcnMoKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgbWF4Q29sb3JzID0gcGFyc2VJbnQodGhpcy5tYXhDb2xvcnNJbnB1dC52YWx1ZSlcclxuICAgICAgICBpZiAoIW1heENvbG9ycykge1xyXG4gICAgICAgICAgICBtYXhDb2xvcnMgPSBkZWZhdWx0TWF4Q29sb3JzXHJcbiAgICAgICAgICAgIHRoaXMubWF4Q29sb3JzSW5wdXQudmFsdWUgPSBtYXhDb2xvcnMudG9TdHJpbmcoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1heENvbG9yc1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBMaWJyYXJ5VWkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsaWJyYXJ5RGl2ID0gZG9tLmJ5SWQoXCJsaWJyYXJ5VWlcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmV0dXJuQnV0dG9uID0gZG9tLmJ5SWQoXCJyZXR1cm5Gcm9tTGlicmFyeUJ1dHRvblwiKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IGltYWdlQ2hvc2VuID0gbmV3IENoYW5uZWw8W3N0cmluZ10+KClcclxuICAgIHB1YmxpYyByZWFkb25seSBjYW5jZWwgPSBuZXcgQ2hhbm5lbDxbXT4oKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMucmV0dXJuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uUmV0dXJuQ2xpY2soKSlcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIHRoaXMubGlicmFyeURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25SZXR1cm5DbGljaygpIHtcclxuICAgICAgICB0aGlzLmxpYnJhcnlEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuY2FuY2VsLnB1Ymxpc2goKVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBQbGF5VWkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBkYjogSURCRGF0YWJhc2VcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FudmFzID0gZG9tLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwYWxldHRlRGl2ID0gZG9tLmJ5SWQoXCJwYWxldHRlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVFbnRyeVRlbXBsYXRlID0gZG9tLmJ5SWQoXCJwYWxldHRlRW50cnlcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBwbGF5VWlEaXYgPSBkb20uYnlJZChcInBsYXlVaVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZXR1cm5CdXR0b24gPSBkb20uYnlJZChcInJldHVybkJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZUNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW1hZ2VDdHggPSB0aGlzLmltYWdlQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2VsbENhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2VsbEN0eCA9IHRoaXMuY2VsbENhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVDdHggPSB0aGlzLnBhbGV0dGVDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb2xvckNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29sb3JDdHggPSB0aGlzLmNvbG9yQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUga2V5OiBudW1iZXIgPSAwXHJcbiAgICBwcml2YXRlIGNvbXBsZXRlID0gZmFsc2VcclxuICAgIHB1YmxpYyByZWFkb25seSByZXR1cm4gPSBuZXcgQ2hhbm5lbDxbdm9pZF0+KClcclxuICAgIHByaXZhdGUgaW1hZ2VXaWR0aCA9IDBcclxuICAgIHByaXZhdGUgaW1hZ2VIZWlnaHQgPSAwXHJcbiAgICBwcml2YXRlIGNlbnRlclggPSAwXHJcbiAgICBwcml2YXRlIGNlbnRlclkgPSAwXHJcbiAgICBwcml2YXRlIHpvb20gPSAxXHJcbiAgICBwcml2YXRlIGRyYWcgPSBmYWxzZVxyXG4gICAgcHJpdmF0ZSBjb2xvckRyYWcgPSBmYWxzZVxyXG4gICAgcHJpdmF0ZSB0b3VjaFpvb206IG51bWJlciA9IDBcclxuICAgIHByaXZhdGUgdG91Y2gxU3RhcnQ6IGdlby5WZWMyIHwgbnVsbCA9IG51bGxcclxuICAgIHByaXZhdGUgdG91Y2gyU3RhcnQ6IGdlby5WZWMyIHwgbnVsbCA9IG51bGxcclxuICAgIHByaXZhdGUgdG91Y2gxQ3VyOiBnZW8uVmVjMiB8IG51bGwgPSBudWxsXHJcbiAgICBwcml2YXRlIHRvdWNoMkN1cjogZ2VvLlZlYzIgfCBudWxsID0gbnVsbFxyXG4gICAgcHJpdmF0ZSBkcmFnTGFzdCA9IG5ldyBnZW8uVmVjMigwLCAwKVxyXG5cclxuICAgIC8vIGxpc3Qgb2YgY29sb3JzIHVzZSB1c2VkIGluIGltYWdlXHJcbiAgICBwcml2YXRlIHBhbGV0dGU6IG51bWJlcltdID0gW11cclxuXHJcbiAgICAvLyBpbWFnZSBvdmVybGF5IG9mIHBpeGVsIHRvIHBhbGV0dGUgaW5kZXhcclxuICAgIHByaXZhdGUgcGFsZXR0ZU92ZXJsYXk6IG51bWJlcltdID0gW11cclxuXHJcbiAgICAvLyBwYWxldHRlIG92ZXJsYXkgb2YgcGFsZXR0ZSBpbmRleCB0byBsaXN0IG9mIHBpeGVscyBoYXZpbmcgdGhhdCBjb2xvclxyXG4gICAgcHJpdmF0ZSBwaXhlbE92ZXJsYXk6IFNldDxudW1iZXI+W10gPSBbXVxyXG5cclxuICAgIHByaXZhdGUgc2VsZWN0ZWRQYWxldHRlSW5kZXg6IG51bWJlciA9IC0xXHJcbiAgICBwcml2YXRlIHNlcXVlbmNlOiBudW1iZXJbXSA9IFtdXHJcblxyXG4gICAgY29uc3RydWN0b3IoZGI6IElEQkRhdGFiYXNlKSB7XHJcbiAgICAgICAgdGhpcy5kYiA9IGRiXHJcblxyXG4gICAgICAgIGlmICghdGhpcy5jdHgpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FudmFzIGVsZW1lbnQgbm90IHN1cHBvcnRlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIGUgPT4gdGhpcy5vblBvaW50ZXJEb3duKGUpKVxyXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVybW92ZVwiLCBlID0+IHRoaXMub25Qb2ludGVyTW92ZShlKSlcclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcnVwXCIsIGUgPT4gdGhpcy5vblBvaW50ZXJVcChlKSlcclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwid2hlZWxcIiwgZSA9PiB0aGlzLm9uV2hlZWwoZSkpXHJcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgZSA9PiB0aGlzLm9uUmVzaXplKGUpKVxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLnBsYXlVaURpdiwgXCJjbGlja1wiLCBcIi5wYWxldHRlLWVudHJ5XCIsIChlKSA9PiB0aGlzLm9uUGFsZXR0ZUVudHJ5Q2xpY2soZSBhcyBNb3VzZUV2ZW50KSlcclxuICAgICAgICB0aGlzLnJldHVybkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5vblJldHVybigpKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyBzaG93KGtleTogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5rZXkgPSBrZXlcclxuICAgICAgICB0aGlzLnBsYXlVaURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5jYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHRcclxuICAgICAgICB0aGlzLmNvbXBsZXRlID0gZmFsc2VcclxuICAgICAgICB0aGlzLnpvb20gPSAxXHJcbiAgICAgICAgdGhpcy5kcmFnID0gZmFsc2VcclxuICAgICAgICB0aGlzLnRvdWNoWm9vbSA9IDBcclxuXHJcbiAgICAgICAgY29uc3QgcGljID0gYXdhaXQgZ2V0Q0JOKHRoaXMuZGIsIGtleSlcclxuICAgICAgICBjb25zdCBpbWcgPSBhd2FpdCBkb20ubG9hZEltYWdlKFVSTC5jcmVhdGVPYmplY3RVUkwocGljLmltYWdlKSlcclxuICAgICAgICB0aGlzLmltYWdlV2lkdGggPSBpbWcud2lkdGhcclxuICAgICAgICB0aGlzLmltYWdlSGVpZ2h0ID0gaW1nLmhlaWdodFxyXG5cclxuICAgICAgICAvLyBjYXB0dXJlIGltYWdlXHJcbiAgICAgICAgdGhpcy5pbWFnZUNhbnZhcy53aWR0aCA9IHRoaXMuaW1hZ2VXaWR0aFxyXG4gICAgICAgIHRoaXMuaW1hZ2VDYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZUhlaWdodFxyXG4gICAgICAgIHRoaXMuaW1hZ2VDdHguZHJhd0ltYWdlKGltZywgMCwgMCwgdGhpcy5pbWFnZUNhbnZhcy53aWR0aCwgdGhpcy5pbWFnZUNhbnZhcy5oZWlnaHQpXHJcblxyXG4gICAgICAgIC8vIGRlYnVnIC0gc2hvdyBwYXNzZWQgaW1hZ2VcclxuICAgICAgICAvLyB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuaW1hZ2VXaWR0aFxyXG4gICAgICAgIC8vIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2VIZWlnaHRcclxuICAgICAgICAvLyB0aGlzLmN0eC5kcmF3SW1hZ2UodGhpcy5pbWFnZUNhbnZhcywgMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodClcclxuICAgICAgICAvLyByZXR1cm5cclxuXHJcbiAgICAgICAgY29uc3QgaW1nRGF0YSA9IHRoaXMuaW1hZ2VDdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodClcclxuICAgICAgICB0aGlzLnBhbGV0dGUgPSBleHRyYWN0UGFsZXR0ZShpbWdEYXRhKVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZU92ZXJsYXkgPSBjcmVhdGVQYWxldHRlT3ZlcmxheShpbWdEYXRhLCB0aGlzLnBhbGV0dGUpXHJcbiAgICAgICAgdGhpcy5waXhlbE92ZXJsYXkgPSBjcmVhdGVQaXhlbE92ZXJsYXkodGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0LCB0aGlzLnBhbGV0dGUsIHRoaXMucGFsZXR0ZU92ZXJsYXkpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlID0gcHJ1bmVQYWxsZXRlKHRoaXMucGFsZXR0ZSwgdGhpcy5waXhlbE92ZXJsYXksIG1heEJhY2tncm91bmRQaXhlbHMsIHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCwgdGhpcy5jb2xvckN0eClcclxuICAgICAgICB0aGlzLnBhbGV0dGVPdmVybGF5ID0gY3JlYXRlUGFsZXR0ZU92ZXJsYXkoaW1nRGF0YSwgdGhpcy5wYWxldHRlKVxyXG4gICAgICAgIHRoaXMucGl4ZWxPdmVybGF5ID0gY3JlYXRlUGl4ZWxPdmVybGF5KHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCwgdGhpcy5wYWxldHRlLCB0aGlzLnBhbGV0dGVPdmVybGF5KVxyXG4gICAgICAgIHRoaXMuY3JlYXRlUGFsZXR0ZVVpKClcclxuICAgICAgICBkcmF3Q2VsbEltYWdlKHRoaXMuY2VsbEN0eCwgdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0LCB0aGlzLnBhbGV0dGVPdmVybGF5KVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZUNhbnZhcy53aWR0aCA9IHRoaXMuY2VsbENhbnZhcy53aWR0aFxyXG4gICAgICAgIHRoaXMucGFsZXR0ZUNhbnZhcy5oZWlnaHQgPSB0aGlzLmNlbGxDYW52YXMuaGVpZ2h0XHJcbiAgICAgICAgdGhpcy5jZW50ZXJYID0gdGhpcy5jYW52YXMud2lkdGggLyAyXHJcbiAgICAgICAgdGhpcy5jZW50ZXJZID0gdGhpcy5jYW52YXMuaGVpZ2h0IC8gMlxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuXHJcbiAgICAgICAgaWYgKHRoaXMucGFsZXR0ZSkge1xyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeSgwKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZXF1ZW5jZSA9IHBpYy5zZXF1ZW5jZVxyXG4gICAgICAgIGZvciAoY29uc3QgeHkgb2YgdGhpcy5zZXF1ZW5jZSkge1xyXG4gICAgICAgICAgICBjb25zdCBwYWxldHRlSWR4ID0gdGhpcy5wYWxldHRlT3ZlcmxheVt4eV1cclxuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gaW1hZ2luZy51bmZsYXQoeHksIHRoaXMuaW1hZ2VXaWR0aClcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RQYWxldHRlRW50cnkocGFsZXR0ZUlkeClcclxuICAgICAgICAgICAgdGhpcy50cnlGaWxsQ2VsbCh4LCB5KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZGVidWcgLSBmaWxsIGFsbCBwaXhlbHMgYnV0IGZpcnN0IHVuZmlsbGVkXHJcbiAgICAgICAgLy8ge1xyXG4gICAgICAgIC8vICAgICBsZXQgc2tpcHBlZDEgPSBmYWxzZVxyXG4gICAgICAgIC8vICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaW1hZ2VIZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIC8vICAgICAgICAgbGV0IHlPZmZzZXQgPSB5ICogdGhpcy5pbWFnZVdpZHRoXHJcbiAgICAgICAgLy8gICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuaW1hZ2VXaWR0aDsgKyt4KSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgY29uc3QgcGFsZXR0ZUlkeCA9IHRoaXMucGFsZXR0ZU92ZXJsYXlbZmxhdCh4LCB5LCB0aGlzLmltYWdlV2lkdGgpXVxyXG4gICAgICAgIC8vICAgICAgICAgICAgIGlmIChwYWxldHRlSWR4ID09PSAtMSkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIC8vICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgbGV0IHhPZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgIC8vICAgICAgICAgICAgIGlmICghc2tpcHBlZDEgJiYgdGhpcy5wYWxldHRlT3ZlcmxheVt4T2Zmc2V0XSAhPT0gLTEpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgc2tpcHBlZDEgPSB0cnVlXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAgICAgICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeShwYWxldHRlSWR4KVxyXG4gICAgICAgIC8vICAgICAgICAgICAgIHRoaXMudHJ5RmlsbENlbGwoeCwgeSlcclxuXHJcbiAgICAgICAgLy8gICAgICAgICB9XHJcbiAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgIC8vIC8vIGRlYnVnIC0gZ28gc3RyYWlnaHQgdG8gZW5kIHN0YXRlXHJcbiAgICAgICAgLy8gZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmltYWdlSGVpZ2h0OyArK3kpIHtcclxuICAgICAgICAvLyAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLmltYWdlV2lkdGg7ICsreCkge1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy5zZXF1ZW5jZS5wdXNoKGZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKSlcclxuICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgLy8gcmFuZC5zaHVmZmxlKHRoaXMuc2VxdWVuY2UpXHJcbiAgICAgICAgLy8gdGhpcy5leGVjRG9uZVNlcXVlbmNlKClcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgaGlkZSgpIHtcclxuICAgICAgICB0aGlzLnBsYXlVaURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJldHVybigpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnJldHVybi5wdWJsaXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmVzaXplKF86IFVJRXZlbnQpIHtcclxuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY3JlYXRlUGFsZXR0ZVVpKCkge1xyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0aGlzLnBhbGV0dGVEaXYpXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnBhbGV0dGUubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgW3IsIGcsIGJdID0gY29sb3IudW5wYWNrKHRoaXMucGFsZXR0ZVtpXSlcclxuICAgICAgICAgICAgY29uc3QgbHVtID0gY2FsY0x1bWluYW5jZShyLCBnLCBiKVxyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMucGFsZXR0ZUVudHJ5VGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCBlbnRyeURpdiA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5wYWxldHRlLWVudHJ5XCIpIGFzIEhUTUxFbGVtZW50XHJcbiAgICAgICAgICAgIGVudHJ5RGl2LnRleHRDb250ZW50ID0gYCR7aSArIDF9YFxyXG4gICAgICAgICAgICBlbnRyeURpdi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb2xvcjJSR0JBU3R5bGUociwgZywgYilcclxuICAgICAgICAgICAgZW50cnlEaXYuc3R5bGUuY29sb3IgPSBsdW0gPCAuNSA/IFwid2hpdGVcIiA6IFwiYmxhY2tcIlxyXG4gICAgICAgICAgICB0aGlzLnBhbGV0dGVEaXYuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Qb2ludGVyRG93bihlOiBQb2ludGVyRXZlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghZS5pc1ByaW1hcnkpIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDJTdGFydCA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICAgICAgdGhpcy50b3VjaFpvb20gPSB0aGlzLnpvb21cclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhcmUgd2Ugb3ZlcnRvcCBvZiBhIHNlbGVjdGVkIHBhbGV0dGUgZW50cnkgcGl4ZWw/XHJcbiAgICAgICAgdGhpcy5jYW52YXMuc2V0UG9pbnRlckNhcHR1cmUoZS5wb2ludGVySWQpXHJcbiAgICAgICAgdGhpcy5kcmFnID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuZHJhZ0xhc3QgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgdGhpcy50b3VjaDFTdGFydCA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICB0aGlzLnRvdWNoWm9vbSA9IHRoaXMuem9vbVxyXG5cclxuICAgICAgICAvLyB0cmFuc2Zvcm0gY2xpY2sgY29vcmRpbmF0ZXMgdG8gY2FudmFzIGNvb3JkaW5hdGVzXHJcbiAgICAgICAgY29uc3QgW3gsIHldID0gdGhpcy5jYW52YXMyQ2VsbChlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICBpZiAodGhpcy50cnlGaWxsQ2VsbCh4LCB5KSkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbG9yRHJhZyA9IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb252ZXJ0IGEgY2FudmFzIGNvb3JkaW5hdGUgaW50byBhIGNlbGwgY29vcmRpbmF0ZVxyXG4gICAgICogQHBhcmFtIHggeCBjYW52YXMgY29vcmRpbmF0ZVxyXG4gICAgICogQHBhcmFtIHkgeSBjYW52YXMgY29vcmRpbmF0ZVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNhbnZhczJDZWxsKHg6IG51bWJlciwgeTogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICAgICAgY29uc3QgaW52VHJhbnNmb3JtID0gdGhpcy5jdHguZ2V0VHJhbnNmb3JtKCkuaW52ZXJzZSgpXHJcbiAgICAgICAgY29uc3QgZG9tUHQgPSBpbnZUcmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQoeyB4OiB4LCB5OiB5IH0pXHJcbiAgICAgICAgcmV0dXJuIGNlbGwySW1hZ2UoZG9tUHQueCwgZG9tUHQueSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUG9pbnRlclVwKGU6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGlmICghZS5pc1ByaW1hcnkpIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDJTdGFydCA9IG51bGxcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudG91Y2gxU3RhcnQgPSBudWxsXHJcbiAgICAgICAgdGhpcy5kcmFnID0gZmFsc2VcclxuICAgICAgICB0aGlzLmNvbG9yRHJhZyA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy50b3VjaFpvb20gPSB0aGlzLnpvb21cclxuICAgICAgICB0aGlzLnNhdmVTdGF0ZSgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzYXZlU3RhdGUoKSB7XHJcbiAgICAgICAgY29uc3QgYmxvYiA9IGF3YWl0IGltYWdpbmcuY2FudmFzMkJsb2IodGhpcy5pbWFnZUNhbnZhcywgaW1hZ2VNaW1lVHlwZSlcclxuICAgICAgICBjb25zdCBwcmV2aWV3ID0gYXdhaXQgY3JlYXRlUHJldmlldyhibG9iLCB0aGlzLnNlcXVlbmNlKVxyXG4gICAgICAgIGF3YWl0IHB1dENCTih0aGlzLmRiLCB7IGltYWdlOiBibG9iLCBzZXF1ZW5jZTogdGhpcy5zZXF1ZW5jZSwgcHJldmlldzogcHJldmlldyB9LCB0aGlzLmtleSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUG9pbnRlck1vdmUoZTogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZS5pc1ByaW1hcnkpIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDFDdXIgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDJDdXIgPSBuZXcgZ2VvLlZlYzIoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoYW5kbGUgcGluY2ggem9vbVxyXG4gICAgICAgIGlmICh0aGlzLnRvdWNoMlN0YXJ0ICYmIHRoaXMudG91Y2gxU3RhcnQpIHtcclxuICAgICAgICAgICAgdGhpcy50b3VjaDFDdXIgPSB0aGlzLnRvdWNoMUN1ciA/PyB0aGlzLnRvdWNoMVN0YXJ0XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2gyQ3VyID0gdGhpcy50b3VjaDJDdXIgPz8gdGhpcy50b3VjaDJTdGFydFxyXG4gICAgICAgICAgICBjb25zdCBkMCA9IHRoaXMudG91Y2gxU3RhcnQuc3ViKHRoaXMudG91Y2gyU3RhcnQpLmxlbmd0aCgpXHJcbiAgICAgICAgICAgIGNvbnN0IGQxID0gdGhpcy50b3VjaDFDdXIuc3ViKHRoaXMudG91Y2gyQ3VyKS5sZW5ndGgoKVxyXG4gICAgICAgICAgICB0aGlzLnpvb20gPSB0aGlzLnRvdWNoWm9vbSAqIGQxIC8gZDBcclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5kcmFnKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdHJhbnNmb3JtID0gdGhpcy5jdHguZ2V0VHJhbnNmb3JtKCkuaW52ZXJzZSgpXHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBnZW8uVmVjMi5mcm9tRE9NKHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh0aGlzLmRyYWdMYXN0KSlcclxuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICBjb25zdCBlbmQgPSBnZW8uVmVjMi5mcm9tRE9NKHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChwb3NpdGlvbikpXHJcbiAgICAgICAgY29uc3QgZGVsdGEgPSBlbmQuc3ViKHN0YXJ0KVxyXG5cclxuICAgICAgICAvLyBjaGVjayBmb3IgZHJhZyBvdmVyIHBhbGV0dGUgY29sb3JcclxuICAgICAgICBjb25zdCBbeCwgeV0gPSB0aGlzLmNhbnZhczJDZWxsKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIGlmICh0aGlzLmNvbG9yRHJhZyAmJiB0aGlzLnBhbGV0dGVPdmVybGF5W2ltYWdpbmcuZmxhdCh4LCB5LCB0aGlzLmltYWdlV2lkdGgpXSA9PT0gdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy50cnlGaWxsQ2VsbCh4LCB5KSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChNYXRoLmFicyhkZWx0YS54KSA+IDMgfHwgTWF0aC5hYnMoZGVsdGEueSkgPiAzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2VudGVyWCAtPSBkZWx0YS54XHJcbiAgICAgICAgICAgIHRoaXMuY2VudGVyWSAtPSBkZWx0YS55XHJcbiAgICAgICAgICAgIHRoaXMuZHJhZ0xhc3QgPSBwb3NpdGlvblxyXG4gICAgICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25XaGVlbChlOiBXaGVlbEV2ZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZS5kZWx0YVkgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuem9vbSAqPSAuNVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUuZGVsdGFZIDwgMCkge1xyXG4gICAgICAgICAgICB0aGlzLnpvb20gKj0gMlxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25QYWxldHRlRW50cnlDbGljayhlOiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlbnRyeSA9IGUudGFyZ2V0IGFzIEVsZW1lbnRcclxuICAgICAgICBsZXQgaWR4ID0gZG9tLmdldEVsZW1lbnRJbmRleChlbnRyeSlcclxuXHJcbiAgICAgICAgaWYgKGlkeCA9PT0gdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleCkge1xyXG4gICAgICAgICAgICBpZHggPSAtMVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZWxlY3RQYWxldHRlRW50cnkoaWR4KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogdHJ1ZSBpZiBzcGVjaWZpZWQgY2VsbCBpcyB1bmZpbGxlZCwgYW5kIGhhcyBzcGVjaWZpZWQgcGFsZXR0ZSBpbmRleFxyXG4gICAgICogQHBhcmFtIHggeCBjZWxsIGNvb3JkaW5hdGVcclxuICAgICAqIEBwYXJhbSB5IHkgY2VsbCBjb29yZGluYXRlXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY2hlY2tDZWxsKHg6IG51bWJlciwgeTogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgLy8gaWYgYWxyZWFkeSBmaWxsZWQsIGRvIG5vdGhpbmdcclxuICAgICAgICBjb25zdCBmbGF0WFkgPSBpbWFnaW5nLmZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKVxyXG4gICAgICAgIGNvbnN0IHBpeGVscyA9IHRoaXMucGl4ZWxPdmVybGF5W3RoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXhdXHJcbiAgICAgICAgcmV0dXJuIHBpeGVscy5oYXMoZmxhdFhZKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogYXR0ZW1wdCB0byBmaWxsIHRoZSBzcGVjaWZpZWQgY2VsbFxyXG4gICAgICogcmV0dXJucyB0cnVlIGlmIGZpbGxlZCwgZmFsc2UgaWYgY2VsbCBpcyBub3Qgc2VsZWN0ZWQgcGFsZXR0ZSBvciBhbHJlYWR5IGZpbGxlZFxyXG4gICAgICogQHBhcmFtIHggXHJcbiAgICAgKiBAcGFyYW0geSBcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSB0cnlGaWxsQ2VsbCh4OiBudW1iZXIsIHk6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgIC8vIGlmIGFscmVhZHkgZmlsbGVkLCBkbyBub3RoaW5nXHJcbiAgICAgICAgaWYgKCF0aGlzLmNoZWNrQ2VsbCh4LCB5KSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IFtyLCBnLCBiXSA9IGNvbG9yLnVucGFjayh0aGlzLnBhbGV0dGVbdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleF0pXHJcbiAgICAgICAgY29uc3QgW2N4LCBjeV0gPSBpbWFnZTJDZWxsKHgsIHkpXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5maWxsU3R5bGUgPSBjb2xvcjJSR0JBU3R5bGUociwgZywgYilcclxuICAgICAgICB0aGlzLmNvbG9yQ3R4LmZpbGxSZWN0KGN4LCBjeSwgY2VsbFNpemUsIGNlbGxTaXplKVxyXG5cclxuICAgICAgICAvLyByZW1vdmUgdGhlIHBpeGVsIGZyb20gb3ZlcmxheVxyXG4gICAgICAgIGNvbnN0IHBpeGVscyA9IHRoaXMucGl4ZWxPdmVybGF5W3RoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXhdXHJcbiAgICAgICAgY29uc3QgZmxhdFhZID0gaW1hZ2luZy5mbGF0KHgsIHksIHRoaXMuaW1hZ2VXaWR0aClcclxuICAgICAgICBwaXhlbHMuZGVsZXRlKGZsYXRYWSlcclxuICAgICAgICB0aGlzLnNlcXVlbmNlLnB1c2goZmxhdFhZKVxyXG5cclxuICAgICAgICBpZiAocGl4ZWxzLnNpemUgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIG1hcmsgcGFsZXR0ZSBlbnRyeSBhcyBkb25lXHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnBhbGV0dGUtZW50cnlcIilbdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleF1cclxuICAgICAgICBlbnRyeS5pbm5lckhUTUwgPSBcIiZjaGVjaztcIlxyXG4gICAgICAgIGNvbnN0IG5leHRQYWxldHRlSWR4ID0gdGhpcy5maW5kTmV4dFVuZmluaXNoZWRFbnRyeSh0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4KVxyXG4gICAgICAgIHRoaXMuc2VsZWN0UGFsZXR0ZUVudHJ5KG5leHRQYWxldHRlSWR4KVxyXG5cclxuICAgICAgICBpZiAobmV4dFBhbGV0dGVJZHggIT09IC0xKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhbGwgY29sb3JzIGNvbXBsZXRlISBzaG93IGFuaW1hdGlvbiBvZiB1c2VyIGNvbG9yaW5nIG9yaWdpbmFsIGltYWdlXHJcbiAgICAgICAgdGhpcy5leGVjRG9uZVNlcXVlbmNlKClcclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2VsZWN0UGFsZXR0ZUVudHJ5KGlkeDogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleCA9IGlkeFxyXG5cclxuICAgICAgICBjb25zdCBlbnRyaWVzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnBhbGV0dGUtZW50cnlcIikpXHJcbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgICAgIGVudHJ5LmNsYXNzTGlzdC5yZW1vdmUoXCJzZWxlY3RlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGlkeCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgZW50cmllc1tpZHhdLmNsYXNzTGlzdC5hZGQoXCJzZWxlY3RlZFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY2xlYXIgcGFsZXR0ZSBjYW52YXNcclxuICAgICAgICBjb25zdCBjdHggPSB0aGlzLnBhbGV0dGVDdHhcclxuICAgICAgICBjb25zdCBjYW52YXMgPSB0aGlzLnBhbGV0dGVDYW52YXNcclxuICAgICAgICBjdHguY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodClcclxuXHJcbiAgICAgICAgaWYgKGlkeCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhpZ2hsaWdodCByZW1haW5pbmcgcGl4ZWxzIGZvciB0aGlzIGNvbG9yXHJcbiAgICAgICAgY29uc3QgZm9udCA9IGN0eC5mb250XHJcbiAgICAgICAgY3R4LmZvbnQgPSBcImJvbGQgMTZweCBhcmlhbFwiXHJcbiAgICAgICAgY29uc3QgdGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGhcclxuICAgICAgICBjb25zdCBjZHh5ID0gY2VsbFNpemUgLyAyXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgcGl4ZWwgb2YgdGhpcy5waXhlbE92ZXJsYXlbaWR4XSkge1xyXG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSBpbWFnZTJDZWxsKC4uLmltYWdpbmcudW5mbGF0KHBpeGVsLCB0aGlzLmltYWdlV2lkdGgpKVxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gY29sb3IyUkdCQVN0eWxlKDE5MSwgMTkxLCAxOTEsIDI1NSlcclxuICAgICAgICAgICAgY3R4LmZpbGxSZWN0KHgsIHksIGNlbGxTaXplLCBjZWxsU2l6ZSlcclxuXHJcbiAgICAgICAgICAgIC8vIGRyYXcgbGFiZWxcclxuICAgICAgICAgICAgY29uc3QgbGFiZWwgPSBgJHtpZHggKyAxfWBcclxuICAgICAgICAgICAgY29uc3QgbWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dChsYWJlbClcclxuICAgICAgICAgICAgY29uc3QgY3ggPSB4ICsgY2R4eSAtIG1ldHJpY3Mud2lkdGggLyAyXHJcbiAgICAgICAgICAgIGNvbnN0IGN5ID0geSArIGNkeHkgKyB0ZXh0SGVpZ2h0IC8gMlxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiXHJcbiAgICAgICAgICAgIGN0eC5maWxsVGV4dChsYWJlbCwgY3gsIGN5KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY3R4LmZvbnQgPSBmb250XHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVkcmF3KCkge1xyXG4gICAgICAgIC8vIG5vdGUgLSBjbGVhciBpcyBzdWJqZWN0IHRvIHRyYW5zZm9ybVxyXG4gICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuY3R4XHJcbiAgICAgICAgdGhpcy5jdHgucmVzZXRUcmFuc2Zvcm0oKVxyXG4gICAgICAgIGNvbnN0IGh3ID0gdGhpcy5jYW52YXMud2lkdGggLyAyIC8gdGhpcy56b29tXHJcbiAgICAgICAgY29uc3QgaGggPSB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyIC8gdGhpcy56b29tXHJcblxyXG4gICAgICAgIHRoaXMuY2VudGVyWCA9IG1hdGguY2xhbXAodGhpcy5jZW50ZXJYLCAwLCB0aGlzLmNlbGxDYW52YXMud2lkdGgpXHJcbiAgICAgICAgdGhpcy5jZW50ZXJZID0gbWF0aC5jbGFtcCh0aGlzLmNlbnRlclksIDAsIHRoaXMuY2VsbENhbnZhcy5oZWlnaHQpXHJcbiAgICAgICAgdGhpcy5jdHguc2NhbGUodGhpcy56b29tLCB0aGlzLnpvb20pXHJcbiAgICAgICAgdGhpcy5jdHgudHJhbnNsYXRlKC10aGlzLmNlbnRlclggKyBodywgLXRoaXMuY2VudGVyWSArIGhoKVxyXG5cclxuICAgICAgICB2YXIgaW52VHJhbnNmb3JtID0gY3R4LmdldFRyYW5zZm9ybSgpLmludmVyc2UoKVxyXG4gICAgICAgIGNvbnN0IHRsID0gaW52VHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHsgeDogMCwgeTogMCB9KVxyXG4gICAgICAgIGNvbnN0IGJyID0gaW52VHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHsgeDogdGhpcy5jYW52YXMud2lkdGgsIHk6IHRoaXMuY2FudmFzLmhlaWdodCB9KVxyXG4gICAgICAgIGN0eC5jbGVhclJlY3QodGwueCwgdGwueSwgYnIueCAtIHRsLngsIGJyLnkgLSB0bC55KVxyXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5jZWxsQ2FudmFzLCAwLCAwKVxyXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5wYWxldHRlQ2FudmFzLCAwLCAwKVxyXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5jb2xvckNhbnZhcywgMCwgMClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZpbmROZXh0VW5maW5pc2hlZEVudHJ5KGk6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHRoaXMucGFsZXR0ZS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBpaSA9IGkgJSB0aGlzLnBhbGV0dGUubGVuZ3RoXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBpeGVsT3ZlcmxheVtpXS5zaXplID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGlpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAtMVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZXhlY0RvbmVTZXF1ZW5jZSgpIHtcclxuICAgICAgICAvLyBzZXQgYXMgZG9uZVxyXG4gICAgICAgIHRoaXMuY29tcGxldGUgPSB0cnVlXHJcblxyXG4gICAgICAgIHRoaXMuY3R4LnJlc2V0VHJhbnNmb3JtKClcclxuXHJcbiAgICAgICAgLy8gZHJhdyBvbmUgcGl4ZWwgYXQgYSB0aW1lIHRvIGNvbG9yIGNhbnZhc1xyXG4gICAgICAgIC8vIG92cmxheSBvbnRvIGNhbnZhc1xyXG4gICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLmltYWdlQ3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQpLmRhdGFcclxuICAgICAgICB0aGlzLmN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodClcclxuICAgICAgICBjb25zdCB6b29tID0gTWF0aC5taW4odGhpcy5jYW52YXMuY2xpZW50V2lkdGggLyB0aGlzLmltYWdlV2lkdGgsIHRoaXMuY2FudmFzLmNsaWVudEhlaWdodCAvIHRoaXMuaW1hZ2VIZWlnaHQpXHJcbiAgICAgICAgdGhpcy5jdHguc2NhbGUoem9vbSwgem9vbSlcclxuXHJcbiAgICAgICAgLy8gY29sb3IgYXMgdXNlciBkaWRcclxuICAgICAgICBjb25zdCBwaXhlbCA9IG5ldyBJbWFnZURhdGEoMSwgMSlcclxuICAgICAgICBjb25zdCBwaXhlbERhdGEgPSBwaXhlbC5kYXRhXHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5jYW52YXMud2lkdGggPSB0aGlzLmltYWdlV2lkdGhcclxuICAgICAgICB0aGlzLmNvbG9yQ3R4LmNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlSGVpZ2h0XHJcbiAgICAgICAgdGhpcy5jb2xvckN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jb2xvckNhbnZhcy53aWR0aCwgdGhpcy5jb2xvckNhbnZhcy5oZWlnaHQpXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zZXF1ZW5jZS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCB4eSA9IHRoaXMuc2VxdWVuY2VbaV1cclxuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gaW1hZ2luZy51bmZsYXQoeHksIHRoaXMuaW1hZ2VXaWR0aClcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geHkgKiA0XHJcbiAgICAgICAgICAgIHBpeGVsRGF0YVswXSA9IGRhdGFbb2Zmc2V0XVxyXG4gICAgICAgICAgICBwaXhlbERhdGFbMV0gPSBkYXRhW29mZnNldCArIDFdXHJcbiAgICAgICAgICAgIHBpeGVsRGF0YVsyXSA9IGRhdGFbb2Zmc2V0ICsgMl1cclxuICAgICAgICAgICAgcGl4ZWxEYXRhWzNdID0gMjU1XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbG9yQ3R4LnB1dEltYWdlRGF0YShwaXhlbCwgeCwgeSlcclxuICAgICAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKHRoaXMuY29sb3JDYW52YXMsIDAsIDApXHJcbiAgICAgICAgICAgIGlmIChpICUgNjQgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdXRpbC53YWl0KDApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEdhbGxlcnlVaSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRiOiBJREJEYXRhYmFzZVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB1aSA9IGRvbS5ieUlkKFwiZ2FsbGVyeVVpXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNibnNEaXYgPSBkb20uYnlJZChcImNibnNcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZ2FsbGVyeUFjcXVpcmVJbWFnZUJ1dHRvbiA9IGRvbS5ieUlkKFwiZ2FsbGVyeUFjcXVpcmVJbWFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZSA9IGRvbS5ieUlkKFwiZ2FsbGVyeUVudHJ5XCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnRcclxuICAgIHB1YmxpYyByZWFkb25seSBzaG93QWNxdWlyZUltYWdlID0gbmV3IENoYW5uZWw8W3ZvaWRdPigpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgY2JuU2VsZWN0ZWQgPSBuZXcgQ2hhbm5lbDxbbnVtYmVyXT4oKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKGRiOiBJREJEYXRhYmFzZSkge1xyXG4gICAgICAgIHRoaXMuZGIgPSBkYlxyXG4gICAgICAgIGRvbS5kZWxlZ2F0ZSh0aGlzLnVpLCBcImNsaWNrXCIsIFwiLmdhbGxlcnktZW50cnlcIiwgKGV2dCkgPT4gdGhpcy5vbkVudHJ5Q2xpY2soZXZ0KSlcclxuICAgICAgICB0aGlzLmdhbGxlcnlBY3F1aXJlSW1hZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuc2hvd0FjcXVpcmVJbWFnZS5wdWJsaXNoKCkpXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKHRoaXMudWksIFwiY2xpY2tcIiwgXCIuZ2FsbGVyeS1kZWxldGUtYnV0dG9uXCIsIChldnQpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5vbkVudHJ5RGVsZXRlKGV2dClcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyBzaG93KCkge1xyXG4gICAgICAgIHRoaXMudWkuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICBhd2FpdCB0aGlzLnJlZHJhdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy51aS5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkVudHJ5Q2xpY2soZXZ0OiBFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGV2dC50YXJnZXQgYXMgSFRNTEVsZW1lbnRcclxuICAgICAgICBpZiAoIXRhcmdldCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGFyZ2V0Lm1hdGNoZXMoXCIuZ2FsbGVyeS1pbWFnZVwiKSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGRpdiA9IChldnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KFwiLmdhbGxlcnktZW50cnlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgICAgICBpZiAoIWRpdikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGtleSA9IHBhcnNlSW50KGRpdi5kYXRhc2V0W1wia2V5XCJdIHx8IFwiXCIpXHJcbiAgICAgICAgaWYgKCFrZXkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNiblNlbGVjdGVkLnB1Ymxpc2goa2V5KVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgb25FbnRyeURlbGV0ZShldnQ6IEV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgZGl2ID0gKGV2dC50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoXCIuZ2FsbGVyeS1lbnRyeVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgICAgIGlmICghZGl2KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qga2V5ID0gcGFyc2VJbnQoZGl2LmRhdGFzZXRbXCJrZXlcIl0gfHwgXCJcIilcclxuICAgICAgICBpZiAoIWtleSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGF3YWl0IGRlbGV0ZUNCTih0aGlzLmRiLCBrZXkpXHJcbiAgICAgICAgYXdhaXQgdGhpcy5yZWRyYXcoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVkcmF3KCkge1xyXG4gICAgICAgIC8vIGNsZWFyIGN1cnJlbnQgdWlcclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGhpcy5jYm5zRGl2KVxyXG5cclxuICAgICAgICBjb25zdCBrdnMgPSBhd2FpdCBnZXRBbGxDQk5zKHRoaXMuZGIpXHJcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCBjYm5dIG9mIGt2cykge1xyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRoaXMudGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudFxyXG4gICAgICAgICAgICBjb25zdCBlbnRyeURpdiA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5nYWxsZXJ5LWVudHJ5XCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IGltYWdlRGl2ID0gZG9tLmJ5U2VsZWN0b3IoZW50cnlEaXYsIFwiLmdhbGxlcnktaW1hZ2VcIikgYXMgSFRNTEltYWdlRWxlbWVudFxyXG4gICAgICAgICAgICBpbWFnZURpdi5zcmMgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGNibi5wcmV2aWV3KVxyXG4gICAgICAgICAgICBlbnRyeURpdi5kYXRhc2V0W1wia2V5XCJdID0ga2V5LnRvU3RyaW5nKClcclxuICAgICAgICAgICAgdGhpcy5jYm5zRGl2LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gbWFpbigpIHtcclxuICAgIGNvbnN0IGRiID0gYXdhaXQgb3BlbkRCKClcclxuICAgIGF3YWl0IHZhbGlkYXRlRGF0YShkYilcclxuXHJcbiAgICBjb25zdCBhY3F1aXJlVWkgPSBuZXcgQWNxdWlyZVVpKClcclxuICAgIGNvbnN0IHNpemVVaSA9IG5ldyBJbWFnZVNpemVVaShkYilcclxuICAgIGNvbnN0IHBsYXlVaSA9IG5ldyBQbGF5VWkoZGIpXHJcbiAgICBjb25zdCBnYWxsZXJ5VWkgPSBuZXcgR2FsbGVyeVVpKGRiKVxyXG5cclxuICAgIGFjcXVpcmVVaS5pbWFnZUFjcXVpcmVkLnN1YmNyaWJlKG9uSW1hZ2VBY3F1aXJlZClcclxuICAgIGFjcXVpcmVVaS5zaG93R2FsbGVyeS5zdWJjcmliZShzaG93R2FsbGVyeSlcclxuICAgIHNpemVVaS5jcmVhdGVDQk4uc3ViY3JpYmUoc2hvd1BsYXkpXHJcbiAgICBzaXplVWkucmV0dXJuLnN1YmNyaWJlKHNob3dBY3F1aXJlKVxyXG4gICAgcGxheVVpLnJldHVybi5zdWJjcmliZShzaG93QWNxdWlyZSlcclxuICAgIGdhbGxlcnlVaS5zaG93QWNxdWlyZUltYWdlLnN1YmNyaWJlKHNob3dBY3F1aXJlKVxyXG4gICAgZ2FsbGVyeVVpLmNiblNlbGVjdGVkLnN1YmNyaWJlKHNob3dQbGF5KVxyXG5cclxuICAgIC8vIGluaXRpYWxseSBzaG93IGFjcXVpcmUgdWlcclxuICAgIGFjcXVpcmVVaS5zaG93KClcclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBvcGVuREIoKTogUHJvbWlzZTxJREJEYXRhYmFzZT4ge1xyXG4gICAgICAgIC8vIG9wZW4gLyBzZXR1cCBkYlxyXG4gICAgICAgIC8vIGF3YWl0IGluZGV4ZWREQi5kZWxldGVEYXRhYmFzZShcImNiblwiKVxyXG4gICAgICAgIGNvbnN0IHJlcSA9IGluZGV4ZWREQi5vcGVuKFwiY2JuXCIsIDEpXHJcbiAgICAgICAgcmVxLmFkZEV2ZW50TGlzdGVuZXIoXCJibG9ja2VkXCIsIF8gPT4gZGJCbG9ja2VkKCkpXHJcbiAgICAgICAgcmVxLmFkZEV2ZW50TGlzdGVuZXIoXCJ1cGdyYWRlbmVlZGVkXCIsIGV2ID0+IHVwZ3JhZGVEQihldikpXHJcbiAgICAgICAgY29uc3QgZGIgPSBhd2FpdCBpZGIud2FpdFJlcXVlc3QocmVxKVxyXG4gICAgICAgIHJldHVybiBkYlxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIG9uSW1hZ2VBY3F1aXJlZChpbWc6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgYXdhaXQgc2hvd0xvYWRpbmdJbmRpY2F0b3IoKVxyXG4gICAgICAgIGFjcXVpcmVVaS5oaWRlKClcclxuICAgICAgICBzaXplVWkuc2hvdyhpbWcpXHJcbiAgICAgICAgaGlkZUxvYWRpbmdJbmRpY2F0b3IoKVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNob3dBY3F1aXJlKCkge1xyXG4gICAgICAgIGhpZGVBbGwoKVxyXG4gICAgICAgIGFjcXVpcmVVaS5zaG93KClcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzaG93R2FsbGVyeSgpIHtcclxuICAgICAgICBoaWRlQWxsKClcclxuICAgICAgICBnYWxsZXJ5VWkuc2hvdygpXHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gc2hvd1BsYXkoa2V5OiBudW1iZXIpIHtcclxuICAgICAgICBhd2FpdCBzaG93TG9hZGluZ0luZGljYXRvcigpXHJcbiAgICAgICAgaGlkZUFsbCgpXHJcbiAgICAgICAgcGxheVVpLnNob3coa2V5KVxyXG4gICAgICAgIGhpZGVMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBoaWRlQWxsKCkge1xyXG4gICAgICAgIHBsYXlVaS5oaWRlKClcclxuICAgICAgICBzaXplVWkuaGlkZSgpXHJcbiAgICAgICAgYWNxdWlyZVVpLmhpZGUoKVxyXG4gICAgICAgIGdhbGxlcnlVaS5oaWRlKClcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdFBhbGV0dGUoaW1nRGF0YTogSW1hZ2VEYXRhKTogbnVtYmVyW10ge1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBkYXRhIH0gPSBpbWdEYXRhXHJcbiAgICBjb25zdCByb3dQaXRjaCA9IHdpZHRoICogNFxyXG5cclxuICAgIC8vIGZpbmQgdW5pcXVlIGNvbG9ycywgY3JlYXRlIGVudHJ5IGZvciBlYWNoXHJcbiAgICBjb25zdCBwYWxldHRlID0gbmV3IFNldDxudW1iZXI+KClcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHJvd1BpdGNoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIC8vIHBhY2sgY29sb3IgdG8gYSB1bmlxdWUgdmFsdWVcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHggKiA0XHJcbiAgICAgICAgICAgIGNvbnN0IHIgPSBkYXRhW29mZnNldF1cclxuICAgICAgICAgICAgY29uc3QgZyA9IGRhdGFbb2Zmc2V0ICsgMV1cclxuICAgICAgICAgICAgY29uc3QgYiA9IGRhdGFbb2Zmc2V0ICsgMl1cclxuICAgICAgICAgICAgY29uc3QgYSA9IGRhdGFbb2Zmc2V0ICsgM11cclxuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBjb2xvci5wYWNrKHIsIGcsIGIsIGEpXHJcbiAgICAgICAgICAgIHBhbGV0dGUuYWRkKHZhbHVlKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gWy4uLnBhbGV0dGVdXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjcmVhdGUgYW4gb3ZlcmxheSB0aGF0IG1hcHMgZWFjaCBwaXhlbCB0byB0aGUgaW5kZXggb2YgaXRzIHBhbGV0dGUgZW50cnlcclxuICogQHBhcmFtIGltZ0RhdGEgaW1hZ2UgZGF0YVxyXG4gKiBAcGFyYW0gcGFsZXR0ZSBwYWxldHRlIGNvbG9yc1xyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlUGFsZXR0ZU92ZXJsYXkoaW1nRGF0YTogSW1hZ2VEYXRhLCBwYWxldHRlOiBudW1iZXJbXSk6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgZGF0YSB9ID0gaW1nRGF0YVxyXG4gICAgY29uc3QgcGFsZXR0ZU1hcCA9IGFycmF5Lm1hcEluZGljZXMocGFsZXR0ZSlcclxuICAgIGNvbnN0IHJvd1BpdGNoID0gd2lkdGggKiA0XHJcbiAgICBjb25zdCBvdmVybGF5ID0gYXJyYXkudW5pZm9ybSgtMSwgd2lkdGggKiBoZWlnaHQpXHJcblxyXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIGNvbnN0IHlPZmZzZXQgPSB5ICogcm93UGl0Y2hcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyArK3gpIHtcclxuICAgICAgICAgICAgLy8gcGFjayBjb2xvciB0byBhIHVuaXF1ZSB2YWx1ZVxyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeCAqIDRcclxuICAgICAgICAgICAgY29uc3QgciA9IGRhdGFbb2Zmc2V0XVxyXG4gICAgICAgICAgICBjb25zdCBnID0gZGF0YVtvZmZzZXQgKyAxXVxyXG4gICAgICAgICAgICBjb25zdCBiID0gZGF0YVtvZmZzZXQgKyAyXVxyXG4gICAgICAgICAgICBjb25zdCBhID0gZGF0YVtvZmZzZXQgKyAzXVxyXG4gICAgICAgICAgICBjb25zdCByZ2JhID0gY29sb3IucGFjayhyLCBnLCBiLCBhKVxyXG4gICAgICAgICAgICBjb25zdCBpZHggPSBwYWxldHRlTWFwLmdldChyZ2JhKSA/PyAtMVxyXG4gICAgICAgICAgICBvdmVybGF5W3kgKiB3aWR0aCArIHhdID0gaWR4XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBvdmVybGF5XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjcmVhdGUgYW4gb3ZlcmxheSB0aGF0IG1hcHMgZWFjaCBwYWxldHRlIGVudHJ5IHRvIGEgbGlzdCBvZiBwaXhlbHMgd2l0aCBpdHMgY29sb3JcclxuICogQHBhcmFtIGltZ0RhdGEgXHJcbiAqIEBwYXJhbSBwYWxldHRlIFxyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlUGl4ZWxPdmVybGF5KHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBwYWxldHRlOiBudW1iZXJbXSwgcGFsZXR0ZU92ZXJsYXk6IG51bWJlcltdKTogU2V0PG51bWJlcj5bXSB7XHJcbiAgICBjb25zdCBvdmVybGF5ID0gYXJyYXkuZ2VuZXJhdGUocGFsZXR0ZS5sZW5ndGgsICgpID0+IG5ldyBTZXQ8bnVtYmVyPigpKVxyXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIGNvbnN0IHlPZmZzZXQgPSB5ICogd2lkdGhcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyArK3gpIHtcclxuICAgICAgICAgICAgLy8gcGFjayBjb2xvciB0byBhIHVuaXF1ZSB2YWx1ZVxyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgICAgICBjb25zdCBwYWxldHRlSWR4ID0gcGFsZXR0ZU92ZXJsYXlbb2Zmc2V0XVxyXG4gICAgICAgICAgICBpZiAocGFsZXR0ZUlkeCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGZsYXRDb29yZCA9IGltYWdpbmcuZmxhdCh4LCB5LCB3aWR0aClcclxuICAgICAgICAgICAgb3ZlcmxheVtwYWxldHRlSWR4XS5hZGQoZmxhdENvb3JkKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gb3ZlcmxheVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gY2FsY0x1bWluYW5jZShyOiBudW1iZXIsIGc6IG51bWJlciwgYjogbnVtYmVyKSB7XHJcbiAgICBjb25zdCBsID0gMC4yMTI2ICogKHIgLyAyNTUpICsgMC43MTUyICogKGcgLyAyNTUpICsgMC4wNzIyICogKGIgLyAyNTUpXHJcbiAgICByZXR1cm4gbFxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3Q2VsbEltYWdlKGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcGFsZXR0ZU92ZXJsYXk6IG51bWJlcltdKSB7XHJcbiAgICBjb25zdCBjZWxsSW1hZ2VXaWR0aCA9IHdpZHRoICogKGNlbGxTaXplICsgMSkgKyAxXHJcbiAgICBjb25zdCBjZWxsSW1hZ2VIZWlnaHQgPSBoZWlnaHQgKiAoY2VsbFNpemUgKyAxKSArIDFcclxuXHJcbiAgICAvLyBzaXplIGNhbnZhc1xyXG4gICAgY3R4LmNhbnZhcy53aWR0aCA9IGNlbGxJbWFnZVdpZHRoXHJcbiAgICBjdHguY2FudmFzLmhlaWdodCA9IGNlbGxJbWFnZUhlaWdodFxyXG5cclxuICAgIC8vIGRyYXcgaG9yaXpvbnRhbCBncmlkIGxpbmVzXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8PSBoZWlnaHQ7ICsraSkge1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KDAsIGkgKiAoY2VsbFNpemUgKyAxKSwgY2VsbEltYWdlV2lkdGgsIDEpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gZHJhdyB2ZXJ0aWNhbCBncmlkIGxpbmVzXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8PSB3aWR0aDsgKytpKSB7XHJcbiAgICAgICAgY3R4LnN0cm9rZVJlY3QoaSAqIChjZWxsU2l6ZSArIDEpLCAwLCAxLCBjZWxsSW1hZ2VIZWlnaHQpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gZHJhdyAjc1xyXG4gICAgY29uc3QgZm9udCA9IGN0eC5mb250XHJcbiAgICBjdHguZm9udCA9IFwiMTZweCBhcmlhbFwiXHJcbiAgICBjb25zdCB0ZXh0SGVpZ2h0ID0gY3R4Lm1lYXN1cmVUZXh0KFwiTVwiKS53aWR0aFxyXG4gICAgY29uc3QgY2R4eSA9IGNlbGxTaXplIC8gMlxyXG5cclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHdpZHRoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGNvbnN0IHBhbGV0dGVJZHggPSBwYWxldHRlT3ZlcmxheVtvZmZzZXRdXHJcbiAgICAgICAgICAgIGNvbnN0IGxhYmVsID0gYCR7cGFsZXR0ZUlkeCArIDF9YFxyXG4gICAgICAgICAgICBjb25zdCBtZXRyaWNzID0gY3R4Lm1lYXN1cmVUZXh0KGxhYmVsKVxyXG4gICAgICAgICAgICBjb25zdCBjeCA9IHggKiAoY2VsbFNpemUgKyAxKSArIGNkeHkgKyAxIC0gbWV0cmljcy53aWR0aCAvIDJcclxuICAgICAgICAgICAgY29uc3QgY3kgPSB5ICogKGNlbGxTaXplICsgMSkgKyBjZHh5ICsgMSArIHRleHRIZWlnaHQgLyAyXHJcbiAgICAgICAgICAgIGN0eC5maWxsVGV4dChsYWJlbCwgY3gsIGN5KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjdHguZm9udCA9IGZvbnRcclxufVxyXG5cclxuZnVuY3Rpb24gZml0KHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBtYXhTaXplOiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIGlmICh3aWR0aCA+PSBoZWlnaHQgJiYgd2lkdGggPiBtYXhTaXplKSB7XHJcbiAgICAgICAgaGVpZ2h0ID0gbWF4U2l6ZSAqIGhlaWdodCAvIHdpZHRoXHJcbiAgICAgICAgcmV0dXJuIFtNYXRoLmZsb29yKG1heFNpemUpLCBNYXRoLmZsb29yKGhlaWdodCldXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGhlaWdodCA+IHdpZHRoICYmIGhlaWdodCA+IG1heFNpemUpIHtcclxuICAgICAgICB3aWR0aCA9IG1heFNpemUgKiB3aWR0aCAvIGhlaWdodFxyXG4gICAgICAgIHJldHVybiBbTWF0aC5mbG9vcih3aWR0aCksIE1hdGguZmxvb3IobWF4U2l6ZSldXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFtNYXRoLmZsb29yKHdpZHRoKSwgTWF0aC5mbG9vcihoZWlnaHQpXVxyXG59XHJcblxyXG4vKipcclxuICAgKiBDb252ZXJ0IGFuIGltYWdlIHggb3IgeSBjb29yZGluYXRlIHRvIHRvcCBvciBsZWZ0IG9mIGNibiBjZWxsIGNvbnRhaW5pbmcgdGhhdCBwaXhlbFxyXG4gICAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gICAqL1xyXG5mdW5jdGlvbiBpbWFnZTJDZWxsQ29vcmQoY29vcmQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gY29vcmQgKiAoY2VsbFNpemUgKyAxKSArIDFcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnQgYSBjYm4geCBvciB5IGNvb3JkaW5hdGUgdG8gdG9wIG9yIGxlZnQgb2YgY2JuIGNlbGwgY29udGFpbmluZyB0aGF0IHBpeGVsXHJcbiAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gKi9cclxuZnVuY3Rpb24gY2VsbDJJbWFnZUNvb3JkKGNvb3JkOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoKGNvb3JkIC0gMSkgLyAoY2VsbFNpemUgKyAxKSlcclxufVxyXG5cclxuLyoqXHJcbiAgICogQ29udmVydCBhbiBpbWFnZSB4IG9yIHkgY29vcmRpbmF0ZSB0byB0b3Agb3IgbGVmdCBvZiBjYm4gY2VsbCBjb250YWluaW5nIHRoYXQgcGl4ZWxcclxuICAgKiBAcGFyYW0gY29vcmQgeCBvciB5IGNvb3JkaW5hdGVcclxuICAgKi9cclxuZnVuY3Rpb24gaW1hZ2UyQ2VsbCh4OiBudW1iZXIsIHk6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgcmV0dXJuIFtpbWFnZTJDZWxsQ29vcmQoeCksIGltYWdlMkNlbGxDb29yZCh5KV1cclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnQgYSBjYm4geCBvciB5IGNvb3JkaW5hdGUgdG8gdG9wIG9yIGxlZnQgb2YgY2JuIGNlbGwgY29udGFpbmluZyB0aGF0IHBpeGVsXHJcbiAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gKi9cclxuZnVuY3Rpb24gY2VsbDJJbWFnZSh4OiBudW1iZXIsIHk6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgcmV0dXJuIFtjZWxsMkltYWdlQ29vcmQoeCksIGNlbGwySW1hZ2VDb29yZCh5KV1cclxufVxyXG5cclxuLyoqXHJcbiAqIGNvbnZlcnQgcmdiYSBjb29yZGluYXRlcyB0byBhIHN0eWxlIHN0cmluZ1xyXG4gKiBAcGFyYW0gciByZWRcclxuICogQHBhcmFtIGcgZ3JlZW5cclxuICogQHBhcmFtIGIgYmx1ZVxyXG4gKiBAcGFyYW0gYSBhbHBoYVxyXG4gKi9cclxuZnVuY3Rpb24gY29sb3IyUkdCQVN0eWxlKHI6IG51bWJlciwgZzogbnVtYmVyLCBiOiBudW1iZXIsIGE6IG51bWJlciA9IDI1NSkge1xyXG4gICAgcmV0dXJuIGByZ2JhKCR7cn0sICR7Z30sICR7Yn0sICR7YSAvIDI1NX0pYFxyXG59XHJcblxyXG5mdW5jdGlvbiBwcnVuZVBhbGxldGUocGFsZXR0ZTogbnVtYmVyW10sIHBpeGVsT3ZlcmxheTogU2V0PG51bWJlcj5bXSwgbWF4UGl4ZWxzOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCk6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IGluZGljZXNUb0tlZXAgPSBuZXcgU2V0PG51bWJlcj4oYXJyYXkuc2VxdWVuY2UoMCwgcGFsZXR0ZS5sZW5ndGgpKVxyXG5cclxuICAgIGN0eC5jYW52YXMud2lkdGggPSB3aWR0aCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG4gICAgY3R4LmNhbnZhcy5oZWlnaHQgPSBoZWlnaHQgKiAoY2VsbFNpemUgKyAxKSArIDFcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBpeGVsT3ZlcmxheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IHBpeGVscyA9IHBpeGVsT3ZlcmxheVtpXVxyXG4gICAgICAgIGlmIChwaXhlbHMuc2l6ZSA8IG1heFBpeGVscykge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGl0ZXIuYWxsKHBpeGVscywgeCA9PiAhaXNCb3JkZXJQaXhlbCguLi5pbWFnaW5nLnVuZmxhdCh4LCB3aWR0aCksIHdpZHRoLCBoZWlnaHQpKSkge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZmlsbCB0aGVzZSBwaXhlbHMgaW4gaW1hZ2Ugd2l0aCBhcHByb3ByaWF0ZSBjb2xvclxyXG4gICAgICAgIGNvbnN0IFtyLCBnLCBiXSA9IGNvbG9yLnVucGFjayhwYWxldHRlW2ldKVxyXG4gICAgICAgIGZvciAoY29uc3QgeHkgb2YgcGl4ZWxzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IGltYWdpbmcudW5mbGF0KHh5LCB3aWR0aClcclxuICAgICAgICAgICAgY29uc3QgW2N4LCBjeV0gPSBpbWFnZTJDZWxsKHgsIHkpXHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjJSR0JBU3R5bGUociwgZywgYilcclxuICAgICAgICAgICAgY3R4LmZpbGxSZWN0KGN4LCBjeSwgY2VsbFNpemUsIGNlbGxTaXplKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaW5kaWNlc1RvS2VlcC5kZWxldGUoaSlcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBuZXdQYWxldHRlID0gWy4uLmluZGljZXNUb0tlZXBdLm1hcCh4ID0+IHBhbGV0dGVbeF0pXHJcbiAgICByZXR1cm4gbmV3UGFsZXR0ZVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc0JvcmRlclBpeGVsKHg6IG51bWJlciwgeTogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHggPT09IDAgfHwgeSA9PT0gMCB8fCB4ID09PSB3aWR0aCAtIDEgfHwgeSA9PT0gaGVpZ2h0IC0gMVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBzaG93TG9hZGluZ0luZGljYXRvcigpIHtcclxuICAgIGNvbnN0IGRpdiA9IGRvbS5ieUlkKFwibG9hZGluZ01vZGFsXCIpXHJcbiAgICBkaXYuaGlkZGVuID0gZmFsc2VcclxuICAgIGF3YWl0IHV0aWwud2FpdCgwKVxyXG59XHJcblxyXG5mdW5jdGlvbiBoaWRlTG9hZGluZ0luZGljYXRvcigpIHtcclxuICAgIGNvbnN0IGRpdiA9IGRvbS5ieUlkKFwibG9hZGluZ01vZGFsXCIpXHJcbiAgICBkaXYuaGlkZGVuID0gdHJ1ZVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiB1cGdyYWRlREIoZXZ0OiBJREJWZXJzaW9uQ2hhbmdlRXZlbnQpIHtcclxuICAgIGNvbnN0IGRiID0gKGV2dC50YXJnZXQgYXMgSURCT3BlbkRCUmVxdWVzdCkucmVzdWx0XHJcblxyXG4gICAgLy8gbm90ZSAtIGV2ZW50IGNvbnRhaW5zIG9sZCAvIG5ldyB2ZXJzaW9ucyBpZiByZXF1aXJlZFxyXG4gICAgLy8gdXBkYXRlIHRvIHRoZSBuZXcgdmVyc2lvblxyXG4gICAgaWYgKGV2dC5vbGRWZXJzaW9uIDwgMSkge1xyXG4gICAgICAgIHVwZ3JhZGVEQjEoZGIpXHJcbiAgICB9XHJcblxyXG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KClcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gdXBncmFkZURCMShkYjogSURCRGF0YWJhc2UpIHtcclxuICAgIGRiLmNyZWF0ZU9iamVjdFN0b3JlKHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lLCB7IGF1dG9JbmNyZW1lbnQ6IHRydWUgfSlcclxufVxyXG5cclxuZnVuY3Rpb24gZGJCbG9ja2VkKCkge1xyXG4gICAgc2hvd0Vycm9yKFwiUGljdHVyZSBkYXRhYmFzZSBuZWVkcyB1cGRhdGVkLCBidXQgb3RoZXIgdGFicyBhcmUgb3BlbiB0aGF0IGFyZSB1c2luZyBpdC4gUGxlYXNlIGNsb3NlIGFsbCB0YWJzIGZvciB0aGlzIHdlYiBzaXRlIGFuZCB0cnkgYWdhaW4uXCIpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3dFcnJvcihtZXNzYWdlOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IG1vZGFsRGl2ID0gZG9tLmJ5SWQoXCJlcnJvck1vZGFsXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBjb25zdCBtZXNzYWdlRGl2ID0gZG9tLmJ5SWQoXCJlcnJvck1lc3NhZ2VcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIG1vZGFsRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICBtZXNzYWdlRGl2LnRleHRDb250ZW50ID0gbWVzc2FnZVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBwdXRDQk4oZGI6IElEQkRhdGFiYXNlLCBkYXRhOiBDQk5QaWN0dXJlLCBrZXk/OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcj4ge1xyXG4gICAgLy8gbm90ZSBzYWZhcmkgY2FuJ3Qgc3RvcmUgYmxvYnMgc28gbXVzdCBjb252ZXJ0IHRvIGFycmF5QnVmZmVyXHJcbiAgICBjb25zdCBkYkRhdGEgPSBhd2FpdCBjYm4yZGIoZGF0YSlcclxuICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24ocGljdHVyZXNPYmplY3RTdG9yZU5hbWUsIFwicmVhZHdyaXRlXCIpXHJcbiAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lKVxyXG4gICAgY29uc3QgayA9IGF3YWl0IGlkYi53YWl0UmVxdWVzdChzdG9yZS5wdXQoZGJEYXRhLCBrZXkpKSBhcyBudW1iZXJcclxuICAgIHJldHVybiBrXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGRlbGV0ZUNCTihkYjogSURCRGF0YWJhc2UsIGtleTogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAvLyBub3RlIHNhZmFyaSBjYW4ndCBzdG9yZSBibG9icyBzbyBtdXN0IGNvbnZlcnQgdG8gYXJyYXlCdWZmZXJcclxuICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24ocGljdHVyZXNPYmplY3RTdG9yZU5hbWUsIFwicmVhZHdyaXRlXCIpXHJcbiAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lKVxyXG4gICAgYXdhaXQgaWRiLndhaXRSZXF1ZXN0KHN0b3JlLmRlbGV0ZShrZXkpKVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBnZXRDQk4oZGI6IElEQkRhdGFiYXNlLCBrZXk6IG51bWJlcik6IFByb21pc2U8Q0JOUGljdHVyZT4ge1xyXG4gICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbihwaWN0dXJlc09iamVjdFN0b3JlTmFtZSwgXCJyZWFkd3JpdGVcIilcclxuICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUocGljdHVyZXNPYmplY3RTdG9yZU5hbWUpXHJcbiAgICBjb25zdCBkYkRhdGEgPSBhd2FpdCBpZGIud2FpdFJlcXVlc3Qoc3RvcmUuZ2V0KGtleSkpIGFzIENCTlBpY3R1cmVEQlxyXG4gICAgY29uc3QgZGF0YSA9IGRiMmNibihkYkRhdGEpXHJcbiAgICBhd2FpdCBpZGIud2FpdFR4KHR4KVxyXG4gICAgcmV0dXJuIGRhdGFcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZ2V0QWxsQ0JOcyhkYjogSURCRGF0YWJhc2UpOiBQcm9taXNlPFtudW1iZXIsIENCTlBpY3R1cmVdW10+IHtcclxuICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24ocGljdHVyZXNPYmplY3RTdG9yZU5hbWUsIFwicmVhZHdyaXRlXCIpXHJcbiAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lKVxyXG4gICAgY29uc3QgZGF0YXMgPSBuZXcgQXJyYXk8W251bWJlciwgQ0JOUGljdHVyZV0+KClcclxuXHJcbiAgICBjb25zdCByZXEgPSBzdG9yZS5vcGVuQ3Vyc29yKClcclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgY29uc3QgY3Vyc29yID0gYXdhaXQgaWRiLndhaXRSZXF1ZXN0KHJlcSlcclxuICAgICAgICBpZiAoIWN1cnNvcikge1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qga2V5ID0gY3Vyc29yLmtleSBhcyBudW1iZXJcclxuICAgICAgICBjb25zdCBkYkRhdGEgPSBjdXJzb3IudmFsdWUgYXMgQ0JOUGljdHVyZURCXHJcbiAgICAgICAgY29uc3QgZGF0YSA9IGRiMmNibihkYkRhdGEpXHJcbiAgICAgICAgZGF0YXMucHVzaChba2V5LCBkYXRhXSlcclxuICAgICAgICBjdXJzb3IuY29udGludWUoKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBkYXRhc1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBjYm4yZGIoZGF0YTogQ0JOUGljdHVyZSk6IFByb21pc2U8Q0JOUGljdHVyZURCPiB7XHJcbiAgICBjb25zdCBpbWFnZUJ1ZmZlciA9IGF3YWl0IGlkYi5ibG9iMkFycmF5QnVmZmVyKGRhdGEuaW1hZ2UpXHJcbiAgICBjb25zdCBwcmV2aWV3QnVmZmVyID0gYXdhaXQgaWRiLmJsb2IyQXJyYXlCdWZmZXIoZGF0YS5wcmV2aWV3KVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgaW1hZ2U6IGltYWdlQnVmZmVyLFxyXG4gICAgICAgIHByZXZpZXc6IHByZXZpZXdCdWZmZXIsXHJcbiAgICAgICAgc2VxdWVuY2U6IGRhdGEuc2VxdWVuY2UsXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRiMmNibihkYXRhOiBDQk5QaWN0dXJlREIpOiBDQk5QaWN0dXJlIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgaW1hZ2U6IGlkYi5hcnJheUJ1ZmZlcjJCbG9iKGRhdGEuaW1hZ2UsIGltYWdlTWltZVR5cGUpLFxyXG4gICAgICAgIHByZXZpZXc6IGlkYi5hcnJheUJ1ZmZlcjJCbG9iKGRhdGEucHJldmlldywgaW1hZ2VNaW1lVHlwZSksXHJcbiAgICAgICAgc2VxdWVuY2U6IGRhdGEuc2VxdWVuY2VcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZWQgcHJldmlldyBvZiBDQk4gY29tcGxldGVkIHRodXMgZmFyXHJcbiAqIEBwYXJhbSBpbWFnZSBpbWFnZVxyXG4gKiBAcGFyYW0gc2VxdWVuY2Ugc2VxdWVuY2Ugb2YgcGl4ZWwgaW5kaWNlcyBjb21wbGV0ZWQgdGh1cyBmYXJcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVByZXZpZXcoaW1hZ2U6IEJsb2IsIHNlcXVlbmNlOiBudW1iZXJbXSk6IFByb21pc2U8QmxvYj4ge1xyXG4gICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChpbWFnZSlcclxuICAgIGNvbnN0IGltZyA9IGF3YWl0IGRvbS5sb2FkSW1hZ2UodXJsKVxyXG4gICAgY29uc3QgaW1hZ2VDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBpbWFnZUNhbnZhcy53aWR0aCA9IGltZy53aWR0aFxyXG4gICAgaW1hZ2VDYW52YXMuaGVpZ2h0ID0gaW1nLmhlaWdodFxyXG4gICAgY29uc3QgaW1hZ2VDdHggPSBpbWFnZUNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBpbWFnZUN0eC5kcmF3SW1hZ2UoaW1nLCAwLCAwKVxyXG5cclxuICAgIGNvbnN0IHByZXZpZXdDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBwcmV2aWV3Q2FudmFzLndpZHRoID0gaW1nLndpZHRoXHJcbiAgICBwcmV2aWV3Q2FudmFzLmhlaWdodCA9IGltZy5oZWlnaHRcclxuICAgIGNvbnN0IHByZXZpZXdDdHggPSBwcmV2aWV3Q2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuXHJcbiAgICBjb25zdCBpbWFnZURhdGEgPSBpbWFnZUN0eC5nZXRJbWFnZURhdGEoMCwgMCwgaW1nLndpZHRoLCBpbWcuaGVpZ2h0KVxyXG4gICAgY29uc3QgcHJldmlld0RhdGEgPSBwcmV2aWV3Q3R4LmdldEltYWdlRGF0YSgwLCAwLCBpbWcud2lkdGgsIGltZy5oZWlnaHQpXHJcblxyXG4gICAgZm9yIChjb25zdCBpIG9mIHNlcXVlbmNlKSB7XHJcbiAgICAgICAgcHJldmlld0RhdGEuZGF0YVtpICogNF0gPSBpbWFnZURhdGEuZGF0YVtpICogNF1cclxuICAgICAgICBwcmV2aWV3RGF0YS5kYXRhW2kgKiA0ICsgMV0gPSBpbWFnZURhdGEuZGF0YVtpICogNCArIDFdXHJcbiAgICAgICAgcHJldmlld0RhdGEuZGF0YVtpICogNCArIDJdID0gaW1hZ2VEYXRhLmRhdGFbaSAqIDQgKyAyXVxyXG4gICAgICAgIHByZXZpZXdEYXRhLmRhdGFbaSAqIDQgKyAzXSA9IGltYWdlRGF0YS5kYXRhW2kgKiA0ICsgM11cclxuICAgIH1cclxuXHJcbiAgICBwcmV2aWV3Q3R4LnB1dEltYWdlRGF0YShwcmV2aWV3RGF0YSwgMCwgMClcclxuICAgIGNvbnN0IHByZXZpZXdCbG9iID0gYXdhaXQgaW1hZ2luZy5jYW52YXMyQmxvYihwcmV2aWV3Q2FudmFzKVxyXG4gICAgcmV0dXJuIHByZXZpZXdCbG9iXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRlRGF0YShkYjogSURCRGF0YWJhc2UpIHtcclxuICAgIC8vIGl0ZXJhdGUgb3ZlciBhbGwgY2JuIGltYWdlcywgdXBkZ3JhZGUgb2JqZWN0IHN0cnVjdHVyZSBpZiBuZWVkZWRcclxuICAgIGNvbnN0IGt2cyA9IGF3YWl0IGlkYi5nZXRBbGxLZXlWYWx1ZXMoZGIsIHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lKVxyXG4gICAgY29uc3QgdXBkYXRlZEt2cyA9IG5ldyBBcnJheTxbbnVtYmVyLCBhbnldPigpXHJcblxyXG4gICAgZm9yIChjb25zdCBba2V5LCBjYm5dIG9mIGt2cykge1xyXG4gICAgICAgIGlmIChjYm4ucHJldmlldykge1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaW1hZ2VCbG9iID0gaWRiLmFycmF5QnVmZmVyMkJsb2IoY2JuLmltYWdlLCBpbWFnZU1pbWVUeXBlKVxyXG4gICAgICAgIGNvbnN0IHByZXZpZXdCbG9iID0gYXdhaXQgY3JlYXRlUHJldmlldyhpbWFnZUJsb2IsIGNibi5zZXF1ZW5jZSlcclxuICAgICAgICBjYm4ucHJldmlldyA9IGF3YWl0IGlkYi5ibG9iMkFycmF5QnVmZmVyKHByZXZpZXdCbG9iKSBcclxuICAgICAgICB1cGRhdGVkS3ZzLnB1c2goW2tleSBhcyBudW1iZXIsIGNibl0pXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbihwaWN0dXJlc09iamVjdFN0b3JlTmFtZSwgXCJyZWFkd3JpdGVcIilcclxuICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUocGljdHVyZXNPYmplY3RTdG9yZU5hbWUpXHJcbiAgICBmb3IgKGNvbnN0IFtrZXksIGNibl0gb2YgdXBkYXRlZEt2cykge1xyXG4gICAgICAgIGF3YWl0IGlkYi53YWl0UmVxdWVzdChzdG9yZS5wdXQoY2JuLCBrZXkpKSBhcyBudW1iZXJcclxuICAgIH1cclxufVxyXG5cclxubWFpbigpIl19