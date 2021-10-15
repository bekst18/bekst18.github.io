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
        var _a, _b, _c;
        ev.stopPropagation();
        ev.preventDefault();
        if (!((_c = (_b = (_a = ev) === null || _a === void 0 ? void 0 : _a.dataTransfer) === null || _b === void 0 ? void 0 : _b.files) === null || _c === void 0 ? void 0 : _c.length)) {
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
            this.touch1Cur = (_a = this.touch1Cur, (_a !== null && _a !== void 0 ? _a : this.touch1Start));
            this.touch2Cur = (_b = this.touch2Cur, (_b !== null && _b !== void 0 ? _b : this.touch2Start));
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
            const idx = (_a = paletteMap.get(rgba), (_a !== null && _a !== void 0 ? _a : -1));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2JuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2JuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQTtBQUN2QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQTtBQUMvQyxPQUFPLEtBQUssS0FBSyxNQUFNLG9CQUFvQixDQUFBO0FBRTNDLDRDQUE0QztBQUM1QyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFFbkIsMkRBQTJEO0FBQzNELE1BQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFBO0FBRTlCLCtCQUErQjtBQUMvQixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQTtBQUVoQyx3QkFBd0I7QUFDeEIsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFBO0FBRXpCLHFCQUFxQjtBQUNyQixNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQTtBQUUzQixvQkFBb0I7QUFDcEIsTUFBTSx1QkFBdUIsR0FBRyxVQUFVLENBQUE7QUFFMUMsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFBO0FBRWpDLElBQUssVUFJSjtBQUpELFdBQUssVUFBVTtJQUNYLDJDQUFJLENBQUE7SUFDSiwyQ0FBSSxDQUFBO0lBQ0oseURBQVcsQ0FBQTtBQUNmLENBQUMsRUFKSSxVQUFVLEtBQVYsVUFBVSxRQUlkO0FBY0QsTUFBTSxPQUFPO0lBQWI7UUFDcUIsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBd0Is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LFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNqRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUUxRCxJQUFJLFlBQVksR0FBRyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDL0MsTUFBTSxFQUFFLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDdEQsTUFBTSxFQUFFLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZGLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRU8sdUJBQXVCLENBQUMsQ0FBUztRQUNyQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQ3RDLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQTtZQUNsQyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRTtnQkFDL0IsT0FBTyxFQUFFLENBQUE7YUFDWjtTQUNKO1FBRUQsT0FBTyxDQUFDLENBQUMsQ0FBQTtJQUNiLENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCO1FBQzFCLGNBQWM7UUFDZCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtRQUVwQixJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBRXpCLDJDQUEyQztRQUMzQyxxQkFBcUI7UUFDckIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFDckYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQy9ELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDN0csSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTFCLG9CQUFvQjtRQUNwQixNQUFNLEtBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUM1QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQTtRQUM1QyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUM5QyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFOUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQzNDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDM0IsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDbEQsTUFBTSxNQUFNLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUNyQixTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzNCLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQy9CLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQy9CLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUE7WUFFbEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMxQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFO2dCQUNiLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTthQUNyQjtTQUNKO0lBQ0wsQ0FBQztDQUNKO0FBRUQsTUFBTSxTQUFTO0lBU1gsWUFBWSxFQUFlO1FBUFYsT0FBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFtQixDQUFBO1FBQzVDLFlBQU8sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBbUIsQ0FBQTtRQUM1Qyw4QkFBeUIsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFzQixDQUFBO1FBQ3RGLGFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBd0IsQ0FBQTtRQUMzRCxxQkFBZ0IsR0FBRyxJQUFJLE9BQU8sRUFBVSxDQUFBO1FBQ3hDLGdCQUFXLEdBQUcsSUFBSSxPQUFPLEVBQVksQ0FBQTtRQUdqRCxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQTtRQUNaLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNqRixJQUFJLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQy9GLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUM3RCxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzNCLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVNLEtBQUssQ0FBQyxJQUFJO1FBQ2IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ3RCLE1BQU0sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ3ZCLENBQUM7SUFFTSxJQUFJO1FBQ1AsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxZQUFZLENBQUMsR0FBVTtRQUMzQixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBcUIsQ0FBQTtRQUN4QyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1QsT0FBTTtTQUNUO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtZQUNuQyxPQUFNO1NBQ1Q7UUFFRCxNQUFNLEdBQUcsR0FBSSxHQUFHLENBQUMsTUFBc0IsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQW1CLENBQUE7UUFDbkYsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNOLE9BQU07U0FDVDtRQUVELE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDTixPQUFNO1NBQ1Q7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRU8sS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFVO1FBQ2xDLE1BQU0sR0FBRyxHQUFJLEdBQUcsQ0FBQyxNQUFzQixDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBbUIsQ0FBQTtRQUNuRixJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ04sT0FBTTtTQUNUO1FBRUQsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7UUFDOUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNOLE9BQU07U0FDVDtRQUVELE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDN0IsTUFBTSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDdkIsQ0FBQztJQUVPLEtBQUssQ0FBQyxNQUFNO1FBQ2hCLG1CQUFtQjtRQUNuQixHQUFHLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRW5DLE1BQU0sR0FBRyxHQUFHLE1BQU0sVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNyQyxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFFO1lBQzFCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQXFCLENBQUE7WUFDMUUsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQW1CLENBQUE7WUFDN0UsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQXFCLENBQUE7WUFDL0UsUUFBUSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUMvQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUN4QyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtTQUNyQztJQUNMLENBQUM7Q0FDSjtBQUVELEtBQUssVUFBVSxJQUFJO0lBQ2YsTUFBTSxFQUFFLEdBQUcsTUFBTSxNQUFNLEVBQUUsQ0FBQTtJQUN6QixNQUFNLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUV0QixNQUFNLFNBQVMsR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFBO0lBQ2pDLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ2xDLE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzdCLE1BQU0sU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBRW5DLFNBQVMsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2pELFNBQVMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzNDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQ25DLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDaEQsU0FBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7SUFFeEMsNEJBQTRCO0lBQzVCLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUVoQixLQUFLLFVBQVUsTUFBTTtRQUNqQixrQkFBa0I7UUFDbEIsd0NBQXdDO1FBQ3hDLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFBO1FBQ2pELEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRCxNQUFNLEVBQUUsR0FBRyxNQUFNLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDckMsT0FBTyxFQUFFLENBQUE7SUFDYixDQUFDO0lBRUQsS0FBSyxVQUFVLGVBQWUsQ0FBQyxHQUFzQjtRQUNqRCxNQUFNLG9CQUFvQixFQUFFLENBQUE7UUFDNUIsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDaEIsb0JBQW9CLEVBQUUsQ0FBQTtJQUMxQixDQUFDO0lBRUQsU0FBUyxXQUFXO1FBQ2hCLE9BQU8sRUFBRSxDQUFBO1FBQ1QsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3BCLENBQUM7SUFFRCxTQUFTLFdBQVc7UUFDaEIsT0FBTyxFQUFFLENBQUE7UUFDVCxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDcEIsQ0FBQztJQUVELEtBQUssVUFBVSxRQUFRLENBQUMsR0FBVztRQUMvQixNQUFNLG9CQUFvQixFQUFFLENBQUE7UUFDNUIsT0FBTyxFQUFFLENBQUE7UUFDVCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hCLG9CQUFvQixFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUVELFNBQVMsT0FBTztRQUNaLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNiLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNiLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNoQixTQUFTLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDcEIsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxPQUFrQjtJQUN0QyxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUE7SUFDdkMsTUFBTSxRQUFRLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQTtJQUUxQiw0Q0FBNEM7SUFDNUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtJQUNqQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQzdCLE1BQU0sT0FBTyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUE7UUFDNUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRTtZQUM1QiwrQkFBK0I7WUFDL0IsTUFBTSxNQUFNLEdBQUcsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDOUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3RCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDMUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMxQixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQzFCLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDcEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtTQUNyQjtLQUNKO0lBRUQsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUE7QUFDdkIsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFTLG9CQUFvQixDQUFDLE9BQWtCLEVBQUUsT0FBaUI7O0lBQy9ELE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQTtJQUN2QyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzVDLE1BQU0sUUFBUSxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUE7SUFDMUIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUE7SUFFakQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM3QixNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFBO1FBQzVCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDNUIsK0JBQStCO1lBQy9CLE1BQU0sTUFBTSxHQUFHLE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzlCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN0QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQzFCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDMUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMxQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ25DLE1BQU0sR0FBRyxTQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHVDQUFJLENBQUMsQ0FBQyxFQUFBLENBQUE7WUFDdEMsT0FBTyxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFBO1NBQy9CO0tBQ0o7SUFFRCxPQUFPLE9BQU8sQ0FBQTtBQUNsQixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQVMsa0JBQWtCLENBQUMsS0FBYSxFQUFFLE1BQWMsRUFBRSxPQUFpQixFQUFFLGNBQXdCO0lBQ2xHLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsRUFBVSxDQUFDLENBQUE7SUFDdkUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM3QixNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFBO1FBQ3pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDNUIsK0JBQStCO1lBQy9CLE1BQU0sTUFBTSxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUE7WUFDMUIsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3pDLElBQUksVUFBVSxLQUFLLENBQUMsQ0FBQyxFQUFFO2dCQUNuQixTQUFRO2FBQ1g7WUFFRCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDM0MsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtTQUNyQztLQUNKO0lBRUQsT0FBTyxPQUFPLENBQUE7QUFDbEIsQ0FBQztBQUdELFNBQVMsYUFBYSxDQUFDLENBQVMsRUFBRSxDQUFTLEVBQUUsQ0FBUztJQUNsRCxNQUFNLENBQUMsR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQTtJQUN0RSxPQUFPLENBQUMsQ0FBQTtBQUNaLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxHQUE2QixFQUFFLEtBQWEsRUFBRSxNQUFjLEVBQUUsY0FBd0I7SUFDekcsTUFBTSxjQUFjLEdBQUcsS0FBSyxHQUFHLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNqRCxNQUFNLGVBQWUsR0FBRyxNQUFNLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBRW5ELGNBQWM7SUFDZCxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxjQUFjLENBQUE7SUFDakMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsZUFBZSxDQUFBO0lBRW5DLDZCQUE2QjtJQUM3QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQzlCLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUE7S0FDM0Q7SUFFRCwyQkFBMkI7SUFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM3QixHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBO0tBQzVEO0lBRUQsVUFBVTtJQUNWLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUE7SUFDckIsR0FBRyxDQUFDLElBQUksR0FBRyxZQUFZLENBQUE7SUFDdkIsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUE7SUFDN0MsTUFBTSxJQUFJLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQTtJQUV6QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQzdCLE1BQU0sT0FBTyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUE7UUFDekIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRTtZQUM1QixNQUFNLE1BQU0sR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFBO1lBQzFCLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN6QyxNQUFNLEtBQUssR0FBRyxHQUFHLFVBQVUsR0FBRyxDQUFDLEVBQUUsQ0FBQTtZQUNqQyxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO1lBQzVELE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLFVBQVUsR0FBRyxDQUFDLENBQUE7WUFDekQsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1NBQzlCO0tBQ0o7SUFFRCxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtBQUNuQixDQUFDO0FBRUQsU0FBUyxHQUFHLENBQUMsS0FBYSxFQUFFLE1BQWMsRUFBRSxPQUFlO0lBQ3ZELElBQUksS0FBSyxJQUFJLE1BQU0sSUFBSSxLQUFLLEdBQUcsT0FBTyxFQUFFO1FBQ3BDLE1BQU0sR0FBRyxPQUFPLEdBQUcsTUFBTSxHQUFHLEtBQUssQ0FBQTtRQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7S0FDbkQ7SUFFRCxJQUFJLE1BQU0sR0FBRyxLQUFLLElBQUksTUFBTSxHQUFHLE9BQU8sRUFBRTtRQUNwQyxLQUFLLEdBQUcsT0FBTyxHQUFHLEtBQUssR0FBRyxNQUFNLENBQUE7UUFDaEMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO0tBQ2xEO0lBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0FBQ2xELENBQUM7QUFFRDs7O0tBR0s7QUFDTCxTQUFTLGVBQWUsQ0FBQyxLQUFhO0lBQ2xDLE9BQU8sS0FBSyxHQUFHLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUNyQyxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBUyxlQUFlLENBQUMsS0FBYTtJQUNsQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNuRCxDQUFDO0FBRUQ7OztLQUdLO0FBQ0wsU0FBUyxVQUFVLENBQUMsQ0FBUyxFQUFFLENBQVM7SUFDcEMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNuRCxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBUyxVQUFVLENBQUMsQ0FBUyxFQUFFLENBQVM7SUFDcEMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNuRCxDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBUyxlQUFlLENBQUMsQ0FBUyxFQUFFLENBQVMsRUFBRSxDQUFTLEVBQUUsSUFBWSxHQUFHO0lBQ3JFLE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUE7QUFDL0MsQ0FBQztBQUVELFNBQVMsWUFBWSxDQUFDLE9BQWlCLEVBQUUsWUFBMkIsRUFBRSxTQUFpQixFQUFFLEtBQWEsRUFBRSxNQUFjLEVBQUUsR0FBNkI7SUFDakosTUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLENBQVMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFFeEUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsS0FBSyxHQUFHLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUM3QyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBRS9DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxZQUFZLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQzFDLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM5QixJQUFJLE1BQU0sQ0FBQyxJQUFJLEdBQUcsU0FBUyxFQUFFO1lBQ3pCLFNBQVE7U0FDWDtRQUVELElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFO1lBQ25GLFNBQVE7U0FDWDtRQUVELG9EQUFvRDtRQUNwRCxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFDLEtBQUssTUFBTSxFQUFFLElBQUksTUFBTSxFQUFFO1lBQ3JCLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDeEMsTUFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2pDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDeEMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtTQUMzQztRQUVELGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FDMUI7SUFFRCxNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQUcsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDMUQsT0FBTyxVQUFVLENBQUE7QUFDckIsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLENBQVMsRUFBRSxDQUFTLEVBQUUsS0FBYSxFQUFFLE1BQWM7SUFDdEUsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLE1BQU0sR0FBRyxDQUFDLENBQUE7QUFDcEUsQ0FBQztBQUVELEtBQUssVUFBVSxvQkFBb0I7SUFDL0IsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUNwQyxHQUFHLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtJQUNsQixNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDdEIsQ0FBQztBQUVELFNBQVMsb0JBQW9CO0lBQ3pCLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDcEMsR0FBRyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7QUFDckIsQ0FBQztBQUVELEtBQUssVUFBVSxTQUFTLENBQUMsR0FBMEI7SUFDL0MsTUFBTSxFQUFFLEdBQUksR0FBRyxDQUFDLE1BQTJCLENBQUMsTUFBTSxDQUFBO0lBRWxELHVEQUF1RDtJQUN2RCw0QkFBNEI7SUFDNUIsSUFBSSxHQUFHLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBRTtRQUNwQixVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7S0FDakI7SUFFRCxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUE7QUFDeEIsQ0FBQztBQUVELEtBQUssVUFBVSxVQUFVLENBQUMsRUFBZTtJQUNyQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtBQUMxRSxDQUFDO0FBRUQsU0FBUyxTQUFTO0lBQ2QsU0FBUyxDQUFDLG1JQUFtSSxDQUFDLENBQUE7QUFDbEosQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLE9BQWU7SUFDOUIsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQW1CLENBQUE7SUFDekQsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQW1CLENBQUE7SUFDN0QsUUFBUSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7SUFDdkIsVUFBVSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUE7QUFDcEMsQ0FBQztBQUVELEtBQUssVUFBVSxNQUFNLENBQUMsRUFBZSxFQUFFLElBQWdCLEVBQUUsR0FBWTtJQUNqRSwrREFBK0Q7SUFDL0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDakMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUMvRCxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUE7SUFDckQsTUFBTSxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFXLENBQUE7SUFDakUsT0FBTyxDQUFDLENBQUE7QUFDWixDQUFDO0FBRUQsS0FBSyxVQUFVLFNBQVMsQ0FBQyxFQUFlLEVBQUUsR0FBVztJQUNqRCwrREFBK0Q7SUFDL0QsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUMvRCxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUE7SUFDckQsTUFBTSxHQUFHLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUM1QyxDQUFDO0FBRUQsS0FBSyxVQUFVLE1BQU0sQ0FBQyxFQUFlLEVBQUUsR0FBVztJQUM5QyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQy9ELE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtJQUNyRCxNQUFNLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBaUIsQ0FBQTtJQUNwRSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDM0IsTUFBTSxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ3BCLE9BQU8sSUFBSSxDQUFBO0FBQ2YsQ0FBQztBQUVELEtBQUssVUFBVSxVQUFVLENBQUMsRUFBZTtJQUNyQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQy9ELE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtJQUNyRCxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssRUFBd0IsQ0FBQTtJQUUvQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDOUIsT0FBTyxJQUFJLEVBQUU7UUFDVCxNQUFNLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDekMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNULE1BQUs7U0FDUjtRQUVELE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFhLENBQUE7UUFDaEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQXFCLENBQUE7UUFDM0MsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNCLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUN2QixNQUFNLENBQUMsUUFBUSxFQUFFLENBQUE7S0FDcEI7SUFFRCxPQUFPLEtBQUssQ0FBQTtBQUNoQixDQUFDO0FBRUQsS0FBSyxVQUFVLE1BQU0sQ0FBQyxJQUFnQjtJQUNsQyxNQUFNLFdBQVcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDMUQsTUFBTSxhQUFhLEdBQUcsTUFBTSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBRTlELE9BQU87UUFDSCxLQUFLLEVBQUUsV0FBVztRQUNsQixPQUFPLEVBQUUsYUFBYTtRQUN0QixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7S0FDMUIsQ0FBQTtBQUNMLENBQUM7QUFFRCxTQUFTLE1BQU0sQ0FBQyxJQUFrQjtJQUM5QixPQUFPO1FBQ0gsS0FBSyxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQztRQUN0RCxPQUFPLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDO1FBQzFELFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtLQUMxQixDQUFBO0FBQ0wsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxLQUFLLFVBQVUsYUFBYSxDQUFDLEtBQVcsRUFBRSxRQUFrQjtJQUN4RCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3RDLE1BQU0sR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNwQyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3BELFdBQVcsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQTtJQUM3QixXQUFXLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUE7SUFDL0IsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUUsQ0FBQTtJQUM5QyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFFN0IsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUN0RCxhQUFhLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUE7SUFDL0IsYUFBYSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFBO0lBQ2pDLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFFLENBQUE7SUFFbEQsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3BFLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUV4RSxLQUFLLE1BQU0sQ0FBQyxJQUFJLFFBQVEsRUFBRTtRQUN0QixXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUMvQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDdkQsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtLQUMxRDtJQUVELFVBQVUsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMxQyxNQUFNLFdBQVcsR0FBRyxNQUFNLE9BQU8sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDNUQsT0FBTyxXQUFXLENBQUE7QUFDdEIsQ0FBQztBQUVELEtBQUssVUFBVSxZQUFZLENBQUMsRUFBZTtJQUN2QyxtRUFBbUU7SUFDbkUsTUFBTSxHQUFHLEdBQUcsTUFBTSxHQUFHLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO0lBQ2xFLE1BQU0sVUFBVSxHQUFHLElBQUksS0FBSyxFQUFpQixDQUFBO0lBRTdDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxHQUFHLEVBQUU7UUFDMUIsSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFO1lBQ2IsU0FBUTtTQUNYO1FBRUQsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDaEUsTUFBTSxXQUFXLEdBQUcsTUFBTSxhQUFhLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNoRSxHQUFHLENBQUMsT0FBTyxHQUFHLE1BQU0sR0FBRyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3JELFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFhLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtLQUN4QztJQUVELE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDL0QsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO0lBQ3JELEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxVQUFVLEVBQUU7UUFDakMsTUFBTSxHQUFHLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFXLENBQUE7S0FDdkQ7QUFDTCxDQUFDO0FBRUQsSUFBSSxFQUFFLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBhcnJheSBmcm9tIFwiLi4vc2hhcmVkL2FycmF5LmpzXCJcclxuaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvM2QuanNcIlxyXG5pbXBvcnQgKiBhcyBtYXRoIGZyb20gXCIuLi9zaGFyZWQvbWF0aC5qc1wiXHJcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSBcIi4uL3NoYXJlZC91dGlsLmpzXCJcclxuaW1wb3J0ICogYXMgaXRlciBmcm9tIFwiLi4vc2hhcmVkL2l0ZXIuanNcIlxyXG5pbXBvcnQgKiBhcyBpZGIgZnJvbSBcIi4uL3NoYXJlZC9pZGIuanNcIlxyXG5pbXBvcnQgKiBhcyBpbWFnaW5nIGZyb20gXCIuLi9zaGFyZWQvaW1hZ2luZy5qc1wiXHJcbmltcG9ydCAqIGFzIGNvbG9yIGZyb20gXCIuLi9zaGFyZWQvY29sb3IuanNcIlxyXG5cclxuLy8gc2l6ZSB0aGF0IGVhY2ggaW1hZ2UgcGl4ZWwgaXMgYmxvd24gdXAgdG9cclxuY29uc3QgY2VsbFNpemUgPSAzMlxyXG5cclxuLy8gdG9sZXJhbmNlIGJlZm9yZSBzcGxpdHRpbmcgY29sb3JzIC0gaGlnaGVyID0gbGVzcyBjb2xvcnNcclxuY29uc3QgY29sb3JSYW5nZVRvbGVyYW5jZSA9IDMyXHJcblxyXG4vLyBtYXggYmcgcGl4ZWxzIGJlZm9yZSByZW1vdmFsXHJcbmNvbnN0IG1heEJhY2tncm91bmRQaXhlbHMgPSAxMDI0XHJcblxyXG4vLyBkZWZhdWx0IG1heCBkaW1lbnNpb25cclxuY29uc3QgZGVmYXVsdE1heERpbSA9IDEyOFxyXG5cclxuLy8gZGVmYXVsdCBtYXggY29sb3JzXHJcbmNvbnN0IGRlZmF1bHRNYXhDb2xvcnMgPSA2NFxyXG5cclxuLy8gb2JqZWN0IHN0b3JlIG5hbWVcclxuY29uc3QgcGljdHVyZXNPYmplY3RTdG9yZU5hbWUgPSBcInBpY3R1cmVzXCJcclxuXHJcbmNvbnN0IGltYWdlTWltZVR5cGUgPSBcImltYWdlL3BuZ1wiXHJcblxyXG5lbnVtIENhbWVyYU1vZGUge1xyXG4gICAgTm9uZSxcclxuICAgIFVzZXIsXHJcbiAgICBFbnZpcm9ubWVudCxcclxufVxyXG5cclxuaW50ZXJmYWNlIENCTlBpY3R1cmUge1xyXG4gICAgaW1hZ2U6IEJsb2JcclxuICAgIHByZXZpZXc6IEJsb2JcclxuICAgIHNlcXVlbmNlOiBudW1iZXJbXVxyXG59XHJcblxyXG5pbnRlcmZhY2UgQ0JOUGljdHVyZURCIHtcclxuICAgIGltYWdlOiBBcnJheUJ1ZmZlclxyXG4gICAgcHJldmlldzogQXJyYXlCdWZmZXJcclxuICAgIHNlcXVlbmNlOiBudW1iZXJbXVxyXG59XHJcblxyXG5jbGFzcyBDaGFubmVsPFQgZXh0ZW5kcyBhbnlbXT4ge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdWJzY3JpYmVycyA9IG5ldyBTZXQ8KC4uLmFyZ3M6IFQpID0+IHZvaWQ+KClcclxuXHJcbiAgICBwdWJsaWMgc3ViY3JpYmUoc3Vic2NyaWJlcjogKC4uLmFyZ3M6IFQpID0+IHZvaWQpIHtcclxuICAgICAgICB0aGlzLnN1YnNjcmliZXJzLmFkZChzdWJzY3JpYmVyKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyB1bnN1YnNjcmliZShzdWJzY3JpYmVyOiAoLi4uYXJnczogVCkgPT4gdm9pZCkge1xyXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlcnMuZGVsZXRlKHN1YnNjcmliZXIpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHB1Ymxpc2goLi4uYXJnczogVCk6IHZvaWQge1xyXG4gICAgICAgIGZvciAoY29uc3Qgc3Vic2NyaWJlciBvZiB0aGlzLnN1YnNjcmliZXJzKSB7XHJcbiAgICAgICAgICAgIHN1YnNjcmliZXIoLi4uYXJncylcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEFjcXVpcmVVaSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhbWVyYSA9IGRvbS5ieUlkKFwiY2FtZXJhXCIpIGFzIEhUTUxWaWRlb0VsZW1lbnRcclxuICAgIHByaXZhdGUgY2FtZXJhTW9kZSA9IENhbWVyYU1vZGUuTm9uZVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBhY3F1aXJlSW1hZ2VEaXYgPSBkb20uYnlJZChcImFjcXVpcmVJbWFnZVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYXB0dXJlSW1hZ2VCdXR0b24gPSBkb20uYnlJZChcImNhcHR1cmVJbWFnZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZUFjcXVpc2l0aW9uRGl2ID0gZG9tLmJ5SWQoXCJpbWFnZUFjcXVpc2l0aW9uVWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmlsZURyb3BCb3ggPSBkb20uYnlJZChcImZpbGVEcm9wQm94XCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpbGVJbnB1dCA9IGRvbS5ieUlkKFwiZmlsZUlucHV0XCIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmlsZUJ1dHRvbiA9IGRvbS5ieUlkKFwiZmlsZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB1c2VDYW1lcmFCdXR0b24gPSBkb20uYnlJZChcInVzZUNhbWVyYUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmbGlwQ2FtZXJhQnV0dG9uID0gZG9tLmJ5SWQoXCJmbGlwQ2FtZXJhQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHN0b3BDYW1lcmFCdXR0b24gPSBkb20uYnlJZChcInN0b3BDYW1lcmFCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZ2FsbGVyeUJ1dHRvbiA9IGRvbS5ieUlkKFwiZ2FsbGVyeUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBlcnJvcnNEaXYgPSBkb20uYnlJZChcImVycm9yc1wiKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IGltYWdlQWNxdWlyZWQgPSBuZXcgQ2hhbm5lbDxbSFRNTENhbnZhc0VsZW1lbnRdPigpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxpYnJhcnlVaSA9IG5ldyBMaWJyYXJ5VWkoKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHB1YmxpYyByZWFkb25seSBzaG93R2FsbGVyeSA9IG5ldyBDaGFubmVsPFt2b2lkXT4oKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuZmlsZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmZpbGVJbnB1dC5jbGljaygpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5maWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2VudGVyXCIsIChlKSA9PiB0aGlzLm9uRHJhZ0VudGVyT3ZlcihlKSlcclxuICAgICAgICB0aGlzLmZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnb3ZlclwiLCAoZSkgPT4gdGhpcy5vbkRyYWdFbnRlck92ZXIoZSkpXHJcbiAgICAgICAgdGhpcy5maWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJvcFwiLCAoZSkgPT4gdGhpcy5vbkZpbGVEcm9wKGUpKVxyXG4gICAgICAgIHRoaXMuZmlsZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4gdGhpcy5vbkZpbGVDaGFuZ2UoKSlcclxuICAgICAgICB0aGlzLnVzZUNhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy51c2VDYW1lcmEoKSlcclxuICAgICAgICB0aGlzLmZsaXBDYW1lcmFCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuZmxpcENhbWVyYSgpKVxyXG4gICAgICAgIHRoaXMuc3RvcENhbWVyYUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5zdG9wQ2FtZXJhKCkpXHJcbiAgICAgICAgdGhpcy5jYXB0dXJlSW1hZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuY2FwdHVyZUltYWdlKCkpXHJcbiAgICAgICAgdGhpcy5jYW1lcmEuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZG1ldGFkYXRhXCIsICgpID0+IHRoaXMub25DYW1lcmFMb2FkKCkpXHJcbiAgICAgICAgdGhpcy5nYWxsZXJ5QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBfID0+IHRoaXMuc2hvd0dhbGxlcnkucHVibGlzaCgpKVxyXG5cclxuICAgICAgICB0aGlzLmxpYnJhcnlVaS5jYW5jZWwuc3ViY3JpYmUoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmltYWdlQWNxdWlzaXRpb25EaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzaG93KCkge1xyXG4gICAgICAgIHRoaXMuaW1hZ2VBY3F1aXNpdGlvbkRpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5jYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHRcclxuICAgICAgICAvLyB0aGlzLmxvYWRGcm9tVXJsKFwiL2Nibi9hc3NldHMvbGFycnlLb29wYS5qcGdcIilcclxuICAgICAgICAvLyB0aGlzLmxvYWRGcm9tVXJsKFwiL2Nibi9hc3NldHMvb2x0c19mbG93ZXIuanBnXCIpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGhpZGUoKSB7XHJcbiAgICAgICAgdGhpcy5pbWFnZUFjcXVpc2l0aW9uRGl2LmhpZGRlbiA9IHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uRHJhZ0VudGVyT3ZlcihldjogRHJhZ0V2ZW50KSB7XHJcbiAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkZpbGVDaGFuZ2UoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVJbnB1dC5maWxlcz8ubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZmlsZSA9IHRoaXMuZmlsZUlucHV0LmZpbGVzWzBdXHJcbiAgICAgICAgdGhpcy5wcm9jZXNzRmlsZShmaWxlKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25GaWxlRHJvcChldjogRHJhZ0V2ZW50KSB7XHJcbiAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpXHJcblxyXG4gICAgICAgIGlmICghZXY/LmRhdGFUcmFuc2Zlcj8uZmlsZXM/Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGZpbGUgPSBldi5kYXRhVHJhbnNmZXIuZmlsZXNbMF1cclxuICAgICAgICB0aGlzLnByb2Nlc3NGaWxlKGZpbGUpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyB1c2VDYW1lcmEoKSB7XHJcbiAgICAgICAgdGhpcy5hY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICBjb25zdCBkaWFsb2dXaWR0aCA9IHRoaXMuYWNxdWlyZUltYWdlRGl2LmNsaWVudFdpZHRoXHJcbiAgICAgICAgY29uc3QgZGlhbG9nSGVpZ2h0ID0gdGhpcy5hY3F1aXJlSW1hZ2VEaXYuY2xpZW50SGVpZ2h0XHJcbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xyXG4gICAgICAgICAgICB2aWRlbzogeyB3aWR0aDogeyBtYXg6IGRpYWxvZ1dpZHRoIH0sIGhlaWdodDogeyBtYXg6IGRpYWxvZ0hlaWdodCB9LCBmYWNpbmdNb2RlOiBcInVzZXJcIiB9LFxyXG4gICAgICAgICAgICBhdWRpbzogZmFsc2VcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmNhbWVyYU1vZGUgPSBDYW1lcmFNb2RlLlVzZXJcclxuICAgICAgICB0aGlzLmNhbWVyYS5zcmNPYmplY3QgPSBzdHJlYW1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGZsaXBDYW1lcmEoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmNhbWVyYS5zcmNPYmplY3QpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzcmMgPSB0aGlzLmNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgICAgICBjb25zdCB0cmFja3MgPSBzcmMuZ2V0VHJhY2tzKClcclxuICAgICAgICBmb3IgKGNvbnN0IHRyYWNrIG9mIHRyYWNrcykge1xyXG4gICAgICAgICAgICB0cmFjay5zdG9wKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhTW9kZSA9IHRoaXMuY2FtZXJhTW9kZSA9PSBDYW1lcmFNb2RlLlVzZXIgPyBDYW1lcmFNb2RlLkVudmlyb25tZW50IDogQ2FtZXJhTW9kZS5Vc2VyXHJcbiAgICAgICAgY29uc3QgZmFjaW5nTW9kZSA9IHRoaXMuY2FtZXJhTW9kZSA9PSBDYW1lcmFNb2RlLlVzZXIgPyBcInVzZXJcIiA6IFwiZW52aXJvbm1lbnRcIlxyXG5cclxuICAgICAgICAvLyBnZXQgY3VycmVudCBmYWNpbmcgbW9kZVxyXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcclxuICAgICAgICAgICAgdmlkZW86IHsgd2lkdGg6IHRoaXMuY2FtZXJhLmNsaWVudFdpZHRoLCBoZWlnaHQ6IHRoaXMuY2FtZXJhLmNsaWVudEhlaWdodCwgZmFjaW5nTW9kZTogZmFjaW5nTW9kZSB9LFxyXG4gICAgICAgICAgICBhdWRpbzogZmFsc2VcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmNhbWVyYS5zcmNPYmplY3QgPSBzdHJlYW1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uQ2FtZXJhTG9hZCgpIHtcclxuICAgICAgICB0aGlzLmFjcXVpcmVJbWFnZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuY2FtZXJhLnBsYXkoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc3RvcENhbWVyYSgpIHtcclxuICAgICAgICBjb25zdCBzcmMgPSB0aGlzLmNhbWVyYS5zcmNPYmplY3QgYXMgTWVkaWFTdHJlYW1cclxuICAgICAgICBpZiAoIXNyYykge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRyYWNrcyA9IHNyYy5nZXRUcmFja3MoKVxyXG4gICAgICAgIGZvciAoY29uc3QgdHJhY2sgb2YgdHJhY2tzKSB7XHJcbiAgICAgICAgICAgIHRyYWNrLnN0b3AoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jYW1lcmFNb2RlID0gQ2FtZXJhTW9kZS5Ob25lXHJcbiAgICAgICAgdGhpcy5hY3F1aXJlSW1hZ2VEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FwdHVyZUltYWdlKCkge1xyXG4gICAgICAgIHRoaXMuY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuXHJcbiAgICAgICAgY29uc3Qgc3JjID0gdGhpcy5jYW1lcmEuc3JjT2JqZWN0IGFzIE1lZGlhU3RyZWFtXHJcbiAgICAgICAgaWYgKCFzcmMpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB0cmFjayA9IHNyYy5nZXRWaWRlb1RyYWNrcygpWzBdXHJcbiAgICAgICAgaWYgKCF0cmFjaykge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY3R4LmNhbnZhcy53aWR0aCA9IHRoaXMuY2FtZXJhLnZpZGVvV2lkdGhcclxuICAgICAgICB0aGlzLmN0eC5jYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW1lcmEudmlkZW9IZWlnaHRcclxuICAgICAgICB0aGlzLmN0eC5kcmF3SW1hZ2UodGhpcy5jYW1lcmEsIDAsIDApXHJcbiAgICAgICAgdGhpcy5pbWFnZUFjcXVpcmVkLnB1Ymxpc2godGhpcy5jYW52YXMpXHJcbiAgICAgICAgdGhpcy5zdG9wQ2FtZXJhKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHByb2Nlc3NGaWxlKGZpbGU6IEZpbGUpIHtcclxuICAgICAgICB0aGlzLmNsZWFyRXJyb3JNZXNzYWdlcygpXHJcbiAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKVxyXG4gICAgICAgIHRoaXMubG9hZEZyb21VcmwodXJsKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgbG9hZEZyb21VcmwodXJsOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLmNsZWFyRXJyb3JNZXNzYWdlcygpXHJcbiAgICAgICAgY29uc3QgaW1nID0gYXdhaXQgZG9tLmxvYWRJbWFnZSh1cmwpXHJcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSBpbWcud2lkdGhcclxuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSBpbWcuaGVpZ2h0XHJcbiAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKGltZywgMCwgMClcclxuICAgICAgICB0aGlzLmltYWdlQWNxdWlyZWQucHVibGlzaCh0aGlzLmNhbnZhcylcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNsZWFyRXJyb3JNZXNzYWdlcygpIHtcclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4odGhpcy5lcnJvcnNEaXYpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEltYWdlU2l6ZVVpIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGI6IElEQkRhdGFiYXNlXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlU2l6ZURpdiA9IGRvbS5ieUlkKFwiaW1hZ2VTaXplVWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbWF4RGltSW5wdXQgPSBkb20uYnlJZChcIm1heERpbVwiKSBhcyBIVE1MSW5wdXRFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1heENvbG9yc0lucHV0ID0gZG9tLmJ5SWQoXCJtYXhDb2xvcnNcIikgYXMgSFRNTElucHV0RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjcmVhdGVDb2xvckJ5TnVtYmVyQnV0dG9uID0gZG9tLmJ5SWQoXCJjcmVhdGVDb2xvckJ5TnVtYmVyXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJldHVybkJ1dHRvbiA9IGRvbS5ieUlkKFwiaW1hZ2VTaXplUmV0dXJuXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlU2NhbGVDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlU2NhbGVDdHggPSB0aGlzLmltYWdlU2NhbGVDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZVNpemVDYW52YXMgPSBkb20uYnlJZChcImltYWdlU2l6ZUNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZVNpemVDdHggPSB0aGlzLmltYWdlU2l6ZUNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIGltYWdlQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IGNyZWF0ZUNCTiA9IG5ldyBDaGFubmVsPFtudW1iZXJdPigpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgcmV0dXJuID0gbmV3IENoYW5uZWw8W10+KClcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihkYjogSURCRGF0YWJhc2UpIHtcclxuICAgICAgICB0aGlzLmRiID0gZGJcclxuICAgICAgICB0aGlzLmNyZWF0ZUNvbG9yQnlOdW1iZXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMub25DcmVhdGVDb2xvckJ5TnVtYmVyKCkpXHJcbiAgICAgICAgdGhpcy5yZXR1cm5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMub25SZXR1cm5DbGljaygpKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzaG93KGltYWdlQ2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuaW1hZ2VTaXplRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5pbWFnZUNhbnZhcyA9IGltYWdlQ2FudmFzXHJcbiAgICAgICAgdGhpcy5tYXhEaW1JbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHRoaXMub25NYXhEaW1DaGFuZ2UoKSlcclxuICAgICAgICB0aGlzLm1heENvbG9yc0lucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4gdGhpcy5vbk1heENvbG9yc0NoYW5nZSgpKVxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgaGlkZSgpIHtcclxuICAgICAgICB0aGlzLmltYWdlU2l6ZURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvbkNyZWF0ZUNvbG9yQnlOdW1iZXIoKSB7XHJcbiAgICAgICAgY29uc3QgYmxvYiA9IGF3YWl0IGltYWdpbmcuY2FudmFzMkJsb2IodGhpcy5pbWFnZVNjYWxlQ2FudmFzLCBpbWFnZU1pbWVUeXBlKVxyXG4gICAgICAgIGNvbnN0IHByZXZpZXcgPSBhd2FpdCBjcmVhdGVQcmV2aWV3KGJsb2IsIFtdKVxyXG5cclxuICAgICAgICBjb25zdCBjYm46IENCTlBpY3R1cmUgPSB7XHJcbiAgICAgICAgICAgIGltYWdlOiBibG9iLFxyXG4gICAgICAgICAgICBzZXF1ZW5jZTogW10sXHJcbiAgICAgICAgICAgIHByZXZpZXc6IHByZXZpZXdcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGtleSA9IGF3YWl0IHB1dENCTih0aGlzLmRiLCBjYm4pXHJcbiAgICAgICAgdGhpcy5jcmVhdGVDQk4ucHVibGlzaChrZXkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJldHVybkNsaWNrKCkge1xyXG4gICAgICAgIHRoaXMucmV0dXJuLnB1Ymxpc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgb25NYXhEaW1DaGFuZ2UoKSB7XHJcbiAgICAgICAgYXdhaXQgc2hvd0xvYWRpbmdJbmRpY2F0b3IoKVxyXG4gICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICBoaWRlTG9hZGluZ0luZGljYXRvcigpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvbk1heENvbG9yc0NoYW5nZSgpIHtcclxuICAgICAgICBhd2FpdCBzaG93TG9hZGluZ0luZGljYXRvcigpXHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgIGhpZGVMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlZHJhdygpIHtcclxuICAgICAgICB0aGlzLmltYWdlU2l6ZUNhbnZhcy53aWR0aCA9IHRoaXMuaW1hZ2VTaXplQ2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgdGhpcy5pbWFnZVNpemVDYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZVNpemVDYW52YXMuY2xpZW50SGVpZ2h0XHJcblxyXG4gICAgICAgIGNvbnN0IG1heERpbSA9IHRoaXMuZ2V0TWF4RGltKClcclxuICAgICAgICBjb25zdCBtYXhDb2xvcnMgPSB0aGlzLmdldE1heENvbG9ycygpXHJcbiAgICAgICAgY29uc3QgW3csIGhdID0gZml0KHRoaXMuaW1hZ2VDYW52YXMud2lkdGgsIHRoaXMuaW1hZ2VDYW52YXMuaGVpZ2h0LCBtYXhEaW0pXHJcbiAgICAgICAgdGhpcy5pbWFnZVNjYWxlQ2FudmFzLndpZHRoID0gd1xyXG4gICAgICAgIHRoaXMuaW1hZ2VTY2FsZUNhbnZhcy5oZWlnaHQgPSBoXHJcbiAgICAgICAgdGhpcy5pbWFnZVNjYWxlQ3R4LmRyYXdJbWFnZSh0aGlzLmltYWdlQ2FudmFzLCAwLCAwLCB3LCBoKVxyXG4gICAgICAgIGltYWdpbmcucXVhbnRNZWRpYW5DdXQodGhpcy5pbWFnZVNjYWxlQ3R4LCBtYXhDb2xvcnMsIGNvbG9yUmFuZ2VUb2xlcmFuY2UpXHJcbiAgICAgICAgY29uc3QgbWluU2NhbGUgPSBNYXRoLm1pbih0aGlzLmltYWdlU2l6ZUNhbnZhcy5jbGllbnRXaWR0aCAvIHcsIHRoaXMuaW1hZ2VTaXplQ2FudmFzLmNsaWVudEhlaWdodCAvIGgpXHJcbiAgICAgICAgY29uc3Qgc3cgPSB3ICogbWluU2NhbGVcclxuICAgICAgICBjb25zdCBzaCA9IGggKiBtaW5TY2FsZVxyXG4gICAgICAgIGNvbnN0IHggPSAodGhpcy5pbWFnZVNpemVDYW52YXMud2lkdGggLSBzdykgLyAyXHJcbiAgICAgICAgY29uc3QgeSA9ICh0aGlzLmltYWdlU2l6ZUNhbnZhcy5oZWlnaHQgLSBzaCkgLyAyXHJcbiAgICAgICAgdGhpcy5pbWFnZVNpemVDdHguZHJhd0ltYWdlKHRoaXMuaW1hZ2VTY2FsZUNhbnZhcywgeCwgeSwgc3csIHNoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0TWF4RGltKCk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IG1heERpbSA9IHBhcnNlSW50KHRoaXMubWF4RGltSW5wdXQudmFsdWUpXHJcbiAgICAgICAgaWYgKCFtYXhEaW0pIHtcclxuICAgICAgICAgICAgbWF4RGltID0gZGVmYXVsdE1heERpbVxyXG4gICAgICAgICAgICB0aGlzLm1heERpbUlucHV0LnZhbHVlID0gbWF4RGltLnRvU3RyaW5nKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtYXhEaW1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldE1heENvbG9ycygpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBtYXhDb2xvcnMgPSBwYXJzZUludCh0aGlzLm1heENvbG9yc0lucHV0LnZhbHVlKVxyXG4gICAgICAgIGlmICghbWF4Q29sb3JzKSB7XHJcbiAgICAgICAgICAgIG1heENvbG9ycyA9IGRlZmF1bHRNYXhDb2xvcnNcclxuICAgICAgICAgICAgdGhpcy5tYXhDb2xvcnNJbnB1dC52YWx1ZSA9IG1heENvbG9ycy50b1N0cmluZygpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbWF4Q29sb3JzXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIExpYnJhcnlVaSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxpYnJhcnlEaXYgPSBkb20uYnlJZChcImxpYnJhcnlVaVwiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZXR1cm5CdXR0b24gPSBkb20uYnlJZChcInJldHVybkZyb21MaWJyYXJ5QnV0dG9uXCIpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgaW1hZ2VDaG9zZW4gPSBuZXcgQ2hhbm5lbDxbc3RyaW5nXT4oKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IGNhbmNlbCA9IG5ldyBDaGFubmVsPFtdPigpXHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5yZXR1cm5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMub25SZXR1cm5DbGljaygpKVxyXG4gICAgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy5saWJyYXJ5RGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJldHVybkNsaWNrKCkge1xyXG4gICAgICAgIHRoaXMubGlicmFyeURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgdGhpcy5jYW5jZWwucHVibGlzaCgpXHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFBsYXlVaSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRiOiBJREJEYXRhYmFzZVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW52YXMgPSBkb20uYnlJZChcImNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhbGV0dGVEaXYgPSBkb20uYnlJZChcInBhbGV0dGVcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFsZXR0ZUVudHJ5VGVtcGxhdGUgPSBkb20uYnlJZChcInBhbGV0dGVFbnRyeVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBsYXlVaURpdiA9IGRvbS5ieUlkKFwicGxheVVpXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJldHVybkJ1dHRvbiA9IGRvbS5ieUlkKFwicmV0dXJuQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGltYWdlQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbWFnZUN0eCA9IHRoaXMuaW1hZ2VDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjZWxsQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjZWxsQ3R4ID0gdGhpcy5jZWxsQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFsZXR0ZUNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFsZXR0ZUN0eCA9IHRoaXMucGFsZXR0ZUNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbG9yQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb2xvckN0eCA9IHRoaXMuY29sb3JDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG4gICAgcHJpdmF0ZSBrZXk6IG51bWJlciA9IDBcclxuICAgIHByaXZhdGUgY29tcGxldGUgPSBmYWxzZVxyXG4gICAgcHVibGljIHJlYWRvbmx5IHJldHVybiA9IG5ldyBDaGFubmVsPFt2b2lkXT4oKVxyXG4gICAgcHJpdmF0ZSBpbWFnZVdpZHRoID0gMFxyXG4gICAgcHJpdmF0ZSBpbWFnZUhlaWdodCA9IDBcclxuICAgIHByaXZhdGUgY2VudGVyWCA9IDBcclxuICAgIHByaXZhdGUgY2VudGVyWSA9IDBcclxuICAgIHByaXZhdGUgem9vbSA9IDFcclxuICAgIHByaXZhdGUgZHJhZyA9IGZhbHNlXHJcbiAgICBwcml2YXRlIGNvbG9yRHJhZyA9IGZhbHNlXHJcbiAgICBwcml2YXRlIHRvdWNoWm9vbTogbnVtYmVyID0gMFxyXG4gICAgcHJpdmF0ZSB0b3VjaDFTdGFydDogZ2VvLlZlYzIgfCBudWxsID0gbnVsbFxyXG4gICAgcHJpdmF0ZSB0b3VjaDJTdGFydDogZ2VvLlZlYzIgfCBudWxsID0gbnVsbFxyXG4gICAgcHJpdmF0ZSB0b3VjaDFDdXI6IGdlby5WZWMyIHwgbnVsbCA9IG51bGxcclxuICAgIHByaXZhdGUgdG91Y2gyQ3VyOiBnZW8uVmVjMiB8IG51bGwgPSBudWxsXHJcbiAgICBwcml2YXRlIGRyYWdMYXN0ID0gbmV3IGdlby5WZWMyKDAsIDApXHJcblxyXG4gICAgLy8gbGlzdCBvZiBjb2xvcnMgdXNlIHVzZWQgaW4gaW1hZ2VcclxuICAgIHByaXZhdGUgcGFsZXR0ZTogbnVtYmVyW10gPSBbXVxyXG5cclxuICAgIC8vIGltYWdlIG92ZXJsYXkgb2YgcGl4ZWwgdG8gcGFsZXR0ZSBpbmRleFxyXG4gICAgcHJpdmF0ZSBwYWxldHRlT3ZlcmxheTogbnVtYmVyW10gPSBbXVxyXG5cclxuICAgIC8vIHBhbGV0dGUgb3ZlcmxheSBvZiBwYWxldHRlIGluZGV4IHRvIGxpc3Qgb2YgcGl4ZWxzIGhhdmluZyB0aGF0IGNvbG9yXHJcbiAgICBwcml2YXRlIHBpeGVsT3ZlcmxheTogU2V0PG51bWJlcj5bXSA9IFtdXHJcblxyXG4gICAgcHJpdmF0ZSBzZWxlY3RlZFBhbGV0dGVJbmRleDogbnVtYmVyID0gLTFcclxuICAgIHByaXZhdGUgc2VxdWVuY2U6IG51bWJlcltdID0gW11cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihkYjogSURCRGF0YWJhc2UpIHtcclxuICAgICAgICB0aGlzLmRiID0gZGJcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmN0eCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW52YXMgZWxlbWVudCBub3Qgc3VwcG9ydGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmRvd25cIiwgZSA9PiB0aGlzLm9uUG9pbnRlckRvd24oZSkpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJtb3ZlXCIsIGUgPT4gdGhpcy5vblBvaW50ZXJNb3ZlKGUpKVxyXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVydXBcIiwgZSA9PiB0aGlzLm9uUG9pbnRlclVwKGUpKVxyXG4gICAgICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCBlID0+IHRoaXMub25XaGVlbChlKSlcclxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBlID0+IHRoaXMub25SZXNpemUoZSkpXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKHRoaXMucGxheVVpRGl2LCBcImNsaWNrXCIsIFwiLnBhbGV0dGUtZW50cnlcIiwgKGUpID0+IHRoaXMub25QYWxldHRlRW50cnlDbGljayhlIGFzIE1vdXNlRXZlbnQpKVxyXG4gICAgICAgIHRoaXMucmV0dXJuQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uUmV0dXJuKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIHNob3coa2V5OiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLmtleSA9IGtleVxyXG4gICAgICAgIHRoaXMucGxheVVpRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLmNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgICAgIHRoaXMuY29tcGxldGUgPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuem9vbSA9IDFcclxuICAgICAgICB0aGlzLmRyYWcgPSBmYWxzZVxyXG4gICAgICAgIHRoaXMudG91Y2hab29tID0gMFxyXG5cclxuICAgICAgICBjb25zdCBwaWMgPSBhd2FpdCBnZXRDQk4odGhpcy5kYiwga2V5KVxyXG4gICAgICAgIGNvbnN0IGltZyA9IGF3YWl0IGRvbS5sb2FkSW1hZ2UoVVJMLmNyZWF0ZU9iamVjdFVSTChwaWMuaW1hZ2UpKVxyXG4gICAgICAgIHRoaXMuaW1hZ2VXaWR0aCA9IGltZy53aWR0aFxyXG4gICAgICAgIHRoaXMuaW1hZ2VIZWlnaHQgPSBpbWcuaGVpZ2h0XHJcblxyXG4gICAgICAgIC8vIGNhcHR1cmUgaW1hZ2VcclxuICAgICAgICB0aGlzLmltYWdlQ2FudmFzLndpZHRoID0gdGhpcy5pbWFnZVdpZHRoXHJcbiAgICAgICAgdGhpcy5pbWFnZUNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlSGVpZ2h0XHJcbiAgICAgICAgdGhpcy5pbWFnZUN0eC5kcmF3SW1hZ2UoaW1nLCAwLCAwLCB0aGlzLmltYWdlQ2FudmFzLndpZHRoLCB0aGlzLmltYWdlQ2FudmFzLmhlaWdodClcclxuXHJcbiAgICAgICAgLy8gZGVidWcgLSBzaG93IHBhc3NlZCBpbWFnZVxyXG4gICAgICAgIC8vIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5pbWFnZVdpZHRoXHJcbiAgICAgICAgLy8gdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZUhlaWdodFxyXG4gICAgICAgIC8vIHRoaXMuY3R4LmRyYXdJbWFnZSh0aGlzLmltYWdlQ2FudmFzLCAwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KVxyXG4gICAgICAgIC8vIHJldHVyblxyXG5cclxuICAgICAgICBjb25zdCBpbWdEYXRhID0gdGhpcy5pbWFnZUN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0KVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZSA9IGV4dHJhY3RQYWxldHRlKGltZ0RhdGEpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlT3ZlcmxheSA9IGNyZWF0ZVBhbGV0dGVPdmVybGF5KGltZ0RhdGEsIHRoaXMucGFsZXR0ZSlcclxuICAgICAgICB0aGlzLnBpeGVsT3ZlcmxheSA9IGNyZWF0ZVBpeGVsT3ZlcmxheSh0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQsIHRoaXMucGFsZXR0ZSwgdGhpcy5wYWxldHRlT3ZlcmxheSlcclxuICAgICAgICB0aGlzLnBhbGV0dGUgPSBwcnVuZVBhbGxldGUodGhpcy5wYWxldHRlLCB0aGlzLnBpeGVsT3ZlcmxheSwgbWF4QmFja2dyb3VuZFBpeGVscywgdGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0LCB0aGlzLmNvbG9yQ3R4KVxyXG4gICAgICAgIHRoaXMucGFsZXR0ZU92ZXJsYXkgPSBjcmVhdGVQYWxldHRlT3ZlcmxheShpbWdEYXRhLCB0aGlzLnBhbGV0dGUpXHJcbiAgICAgICAgdGhpcy5waXhlbE92ZXJsYXkgPSBjcmVhdGVQaXhlbE92ZXJsYXkodGhpcy5pbWFnZVdpZHRoLCB0aGlzLmltYWdlSGVpZ2h0LCB0aGlzLnBhbGV0dGUsIHRoaXMucGFsZXR0ZU92ZXJsYXkpXHJcbiAgICAgICAgdGhpcy5jcmVhdGVQYWxldHRlVWkoKVxyXG4gICAgICAgIGRyYXdDZWxsSW1hZ2UodGhpcy5jZWxsQ3R4LCB0aGlzLmltYWdlV2lkdGgsIHRoaXMuaW1hZ2VIZWlnaHQsIHRoaXMucGFsZXR0ZU92ZXJsYXkpXHJcbiAgICAgICAgdGhpcy5wYWxldHRlQ2FudmFzLndpZHRoID0gdGhpcy5jZWxsQ2FudmFzLndpZHRoXHJcbiAgICAgICAgdGhpcy5wYWxldHRlQ2FudmFzLmhlaWdodCA9IHRoaXMuY2VsbENhbnZhcy5oZWlnaHRcclxuICAgICAgICB0aGlzLmNlbnRlclggPSB0aGlzLmNhbnZhcy53aWR0aCAvIDJcclxuICAgICAgICB0aGlzLmNlbnRlclkgPSB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyXHJcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG5cclxuICAgICAgICBpZiAodGhpcy5wYWxldHRlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0UGFsZXR0ZUVudHJ5KDApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNlcXVlbmNlID0gcGljLnNlcXVlbmNlXHJcbiAgICAgICAgZm9yIChjb25zdCB4eSBvZiB0aGlzLnNlcXVlbmNlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhbGV0dGVJZHggPSB0aGlzLnBhbGV0dGVPdmVybGF5W3h5XVxyXG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSBpbWFnaW5nLnVuZmxhdCh4eSwgdGhpcy5pbWFnZVdpZHRoKVxyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeShwYWxldHRlSWR4KVxyXG4gICAgICAgICAgICB0aGlzLnRyeUZpbGxDZWxsKHgsIHkpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBkZWJ1ZyAtIGZpbGwgYWxsIHBpeGVscyBidXQgZmlyc3QgdW5maWxsZWRcclxuICAgICAgICAvLyB7XHJcbiAgICAgICAgLy8gICAgIGxldCBza2lwcGVkMSA9IGZhbHNlXHJcbiAgICAgICAgLy8gICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5pbWFnZUhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgLy8gICAgICAgICBsZXQgeU9mZnNldCA9IHkgKiB0aGlzLmltYWdlV2lkdGhcclxuICAgICAgICAvLyAgICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5pbWFnZVdpZHRoOyArK3gpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICBjb25zdCBwYWxldHRlSWR4ID0gdGhpcy5wYWxldHRlT3ZlcmxheVtmbGF0KHgsIHksIHRoaXMuaW1hZ2VXaWR0aCldXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgaWYgKHBhbGV0dGVJZHggPT09IC0xKSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAgICAgICAgICAgICBsZXQgeE9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgaWYgKCFza2lwcGVkMSAmJiB0aGlzLnBhbGV0dGVPdmVybGF5W3hPZmZzZXRdICE9PSAtMSkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICBza2lwcGVkMSA9IHRydWVcclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAvLyAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vICAgICAgICAgICAgIHRoaXMuc2VsZWN0UGFsZXR0ZUVudHJ5KHBhbGV0dGVJZHgpXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgdGhpcy50cnlGaWxsQ2VsbCh4LCB5KVxyXG5cclxuICAgICAgICAvLyAgICAgICAgIH1cclxuICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgLy8gLy8gZGVidWcgLSBnbyBzdHJhaWdodCB0byBlbmQgc3RhdGVcclxuICAgICAgICAvLyBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaW1hZ2VIZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIC8vICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuaW1hZ2VXaWR0aDsgKyt4KSB7XHJcbiAgICAgICAgLy8gICAgICAgICB0aGlzLnNlcXVlbmNlLnB1c2goZmxhdCh4LCB5LCB0aGlzLmltYWdlV2lkdGgpKVxyXG4gICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAvLyByYW5kLnNodWZmbGUodGhpcy5zZXF1ZW5jZSlcclxuICAgICAgICAvLyB0aGlzLmV4ZWNEb25lU2VxdWVuY2UoKVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBoaWRlKCkge1xyXG4gICAgICAgIHRoaXMucGxheVVpRGl2LmhpZGRlbiA9IHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmV0dXJuKCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMucmV0dXJuLnB1Ymxpc2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25SZXNpemUoXzogVUlFdmVudCkge1xyXG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5jYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHRcclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjcmVhdGVQYWxldHRlVWkoKSB7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHRoaXMucGFsZXR0ZURpdilcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMucGFsZXR0ZS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBbciwgZywgYl0gPSBjb2xvci51bnBhY2sodGhpcy5wYWxldHRlW2ldKVxyXG4gICAgICAgICAgICBjb25zdCBsdW0gPSBjYWxjTHVtaW5hbmNlKHIsIGcsIGIpXHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy5wYWxldHRlRW50cnlUZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IGVudHJ5RGl2ID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLnBhbGV0dGUtZW50cnlcIikgYXMgSFRNTEVsZW1lbnRcclxuICAgICAgICAgICAgZW50cnlEaXYudGV4dENvbnRlbnQgPSBgJHtpICsgMX1gXHJcbiAgICAgICAgICAgIGVudHJ5RGl2LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGNvbG9yMlJHQkFTdHlsZShyLCBnLCBiKVxyXG4gICAgICAgICAgICBlbnRyeURpdi5zdHlsZS5jb2xvciA9IGx1bSA8IC41ID8gXCJ3aGl0ZVwiIDogXCJibGFja1wiXHJcbiAgICAgICAgICAgIHRoaXMucGFsZXR0ZURpdi5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblBvaW50ZXJEb3duKGU6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFlLmlzUHJpbWFyeSkge1xyXG4gICAgICAgICAgICB0aGlzLnRvdWNoMlN0YXJ0ID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgICAgICB0aGlzLnRvdWNoWm9vbSA9IHRoaXMuem9vbVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFyZSB3ZSBvdmVydG9wIG9mIGEgc2VsZWN0ZWQgcGFsZXR0ZSBlbnRyeSBwaXhlbD9cclxuICAgICAgICB0aGlzLmNhbnZhcy5zZXRQb2ludGVyQ2FwdHVyZShlLnBvaW50ZXJJZClcclxuICAgICAgICB0aGlzLmRyYWcgPSB0cnVlXHJcbiAgICAgICAgdGhpcy5kcmFnTGFzdCA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICB0aGlzLnRvdWNoMVN0YXJ0ID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIHRoaXMudG91Y2hab29tID0gdGhpcy56b29tXHJcblxyXG4gICAgICAgIC8vIHRyYW5zZm9ybSBjbGljayBjb29yZGluYXRlcyB0byBjYW52YXMgY29vcmRpbmF0ZXNcclxuICAgICAgICBjb25zdCBbeCwgeV0gPSB0aGlzLmNhbnZhczJDZWxsKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIGlmICh0aGlzLnRyeUZpbGxDZWxsKHgsIHkpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sb3JEcmFnID0gdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNvbnZlcnQgYSBjYW52YXMgY29vcmRpbmF0ZSBpbnRvIGEgY2VsbCBjb29yZGluYXRlXHJcbiAgICAgKiBAcGFyYW0geCB4IGNhbnZhcyBjb29yZGluYXRlXHJcbiAgICAgKiBAcGFyYW0geSB5IGNhbnZhcyBjb29yZGluYXRlXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY2FudmFzMkNlbGwoeDogbnVtYmVyLCB5OiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgICAgICBjb25zdCBpbnZUcmFuc2Zvcm0gPSB0aGlzLmN0eC5nZXRUcmFuc2Zvcm0oKS5pbnZlcnNlKClcclxuICAgICAgICBjb25zdCBkb21QdCA9IGludlRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludCh7IHg6IHgsIHk6IHkgfSlcclxuICAgICAgICByZXR1cm4gY2VsbDJJbWFnZShkb21QdC54LCBkb21QdC55KVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Qb2ludGVyVXAoZTogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCFlLmlzUHJpbWFyeSkge1xyXG4gICAgICAgICAgICB0aGlzLnRvdWNoMlN0YXJ0ID0gbnVsbFxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy50b3VjaDFTdGFydCA9IG51bGxcclxuICAgICAgICB0aGlzLmRyYWcgPSBmYWxzZVxyXG4gICAgICAgIHRoaXMuY29sb3JEcmFnID0gZmFsc2VcclxuICAgICAgICB0aGlzLnRvdWNoWm9vbSA9IHRoaXMuem9vbVxyXG4gICAgICAgIHRoaXMuc2F2ZVN0YXRlKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNhdmVTdGF0ZSgpIHtcclxuICAgICAgICBjb25zdCBibG9iID0gYXdhaXQgaW1hZ2luZy5jYW52YXMyQmxvYih0aGlzLmltYWdlQ2FudmFzLCBpbWFnZU1pbWVUeXBlKVxyXG4gICAgICAgIGNvbnN0IHByZXZpZXcgPSBhd2FpdCBjcmVhdGVQcmV2aWV3KGJsb2IsIHRoaXMuc2VxdWVuY2UpXHJcbiAgICAgICAgYXdhaXQgcHV0Q0JOKHRoaXMuZGIsIHsgaW1hZ2U6IGJsb2IsIHNlcXVlbmNlOiB0aGlzLnNlcXVlbmNlLCBwcmV2aWV3OiBwcmV2aWV3IH0sIHRoaXMua2V5KVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Qb2ludGVyTW92ZShlOiBQb2ludGVyRXZlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlLmlzUHJpbWFyeSkge1xyXG4gICAgICAgICAgICB0aGlzLnRvdWNoMUN1ciA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnRvdWNoMkN1ciA9IG5ldyBnZW8uVmVjMihlLm9mZnNldFgsIGUub2Zmc2V0WSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhhbmRsZSBwaW5jaCB6b29tXHJcbiAgICAgICAgaWYgKHRoaXMudG91Y2gyU3RhcnQgJiYgdGhpcy50b3VjaDFTdGFydCkge1xyXG4gICAgICAgICAgICB0aGlzLnRvdWNoMUN1ciA9IHRoaXMudG91Y2gxQ3VyID8/IHRoaXMudG91Y2gxU3RhcnRcclxuICAgICAgICAgICAgdGhpcy50b3VjaDJDdXIgPSB0aGlzLnRvdWNoMkN1ciA/PyB0aGlzLnRvdWNoMlN0YXJ0XHJcbiAgICAgICAgICAgIGNvbnN0IGQwID0gdGhpcy50b3VjaDFTdGFydC5zdWIodGhpcy50b3VjaDJTdGFydCkubGVuZ3RoKClcclxuICAgICAgICAgICAgY29uc3QgZDEgPSB0aGlzLnRvdWNoMUN1ci5zdWIodGhpcy50b3VjaDJDdXIpLmxlbmd0aCgpXHJcbiAgICAgICAgICAgIHRoaXMuem9vbSA9IHRoaXMudG91Y2hab29tICogZDEgLyBkMFxyXG4gICAgICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmRyYWcpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSB0aGlzLmN0eC5nZXRUcmFuc2Zvcm0oKS5pbnZlcnNlKClcclxuICAgICAgICBjb25zdCBzdGFydCA9IGdlby5WZWMyLmZyb21ET00odHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHRoaXMuZHJhZ0xhc3QpKVxyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gbmV3IGdlby5WZWMyKGUub2Zmc2V0WCwgZS5vZmZzZXRZKVxyXG4gICAgICAgIGNvbnN0IGVuZCA9IGdlby5WZWMyLmZyb21ET00odHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHBvc2l0aW9uKSlcclxuICAgICAgICBjb25zdCBkZWx0YSA9IGVuZC5zdWIoc3RhcnQpXHJcblxyXG4gICAgICAgIC8vIGNoZWNrIGZvciBkcmFnIG92ZXIgcGFsZXR0ZSBjb2xvclxyXG4gICAgICAgIGNvbnN0IFt4LCB5XSA9IHRoaXMuY2FudmFzMkNlbGwoZS5vZmZzZXRYLCBlLm9mZnNldFkpXHJcbiAgICAgICAgaWYgKHRoaXMuY29sb3JEcmFnICYmIHRoaXMucGFsZXR0ZU92ZXJsYXlbaW1hZ2luZy5mbGF0KHgsIHksIHRoaXMuaW1hZ2VXaWR0aCldID09PSB0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4KSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRyeUZpbGxDZWxsKHgsIHkpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKE1hdGguYWJzKGRlbHRhLngpID4gMyB8fCBNYXRoLmFicyhkZWx0YS55KSA+IDMpIHtcclxuICAgICAgICAgICAgdGhpcy5jZW50ZXJYIC09IGRlbHRhLnhcclxuICAgICAgICAgICAgdGhpcy5jZW50ZXJZIC09IGRlbHRhLnlcclxuICAgICAgICAgICAgdGhpcy5kcmFnTGFzdCA9IHBvc2l0aW9uXHJcbiAgICAgICAgICAgIHRoaXMucmVkcmF3KClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbldoZWVsKGU6IFdoZWVsRXZlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlLmRlbHRhWSA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy56b29tICo9IC41XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZS5kZWx0YVkgPCAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuem9vbSAqPSAyXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblBhbGV0dGVFbnRyeUNsaWNrKGU6IE1vdXNlRXZlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGVudHJ5ID0gZS50YXJnZXQgYXMgRWxlbWVudFxyXG4gICAgICAgIGxldCBpZHggPSBkb20uZ2V0RWxlbWVudEluZGV4KGVudHJ5KVxyXG5cclxuICAgICAgICBpZiAoaWR4ID09PSB0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4KSB7XHJcbiAgICAgICAgICAgIGlkeCA9IC0xXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNlbGVjdFBhbGV0dGVFbnRyeShpZHgpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB0cnVlIGlmIHNwZWNpZmllZCBjZWxsIGlzIHVuZmlsbGVkLCBhbmQgaGFzIHNwZWNpZmllZCBwYWxldHRlIGluZGV4XHJcbiAgICAgKiBAcGFyYW0geCB4IGNlbGwgY29vcmRpbmF0ZVxyXG4gICAgICogQHBhcmFtIHkgeSBjZWxsIGNvb3JkaW5hdGVcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBjaGVja0NlbGwoeDogbnVtYmVyLCB5OiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgICAgICAvLyBpZiBhbHJlYWR5IGZpbGxlZCwgZG8gbm90aGluZ1xyXG4gICAgICAgIGNvbnN0IGZsYXRYWSA9IGltYWdpbmcuZmxhdCh4LCB5LCB0aGlzLmltYWdlV2lkdGgpXHJcbiAgICAgICAgY29uc3QgcGl4ZWxzID0gdGhpcy5waXhlbE92ZXJsYXlbdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleF1cclxuICAgICAgICByZXR1cm4gcGl4ZWxzLmhhcyhmbGF0WFkpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBhdHRlbXB0IHRvIGZpbGwgdGhlIHNwZWNpZmllZCBjZWxsXHJcbiAgICAgKiByZXR1cm5zIHRydWUgaWYgZmlsbGVkLCBmYWxzZSBpZiBjZWxsIGlzIG5vdCBzZWxlY3RlZCBwYWxldHRlIG9yIGFscmVhZHkgZmlsbGVkXHJcbiAgICAgKiBAcGFyYW0geCBcclxuICAgICAqIEBwYXJhbSB5IFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHRyeUZpbGxDZWxsKHg6IG51bWJlciwgeTogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgLy8gaWYgYWxyZWFkeSBmaWxsZWQsIGRvIG5vdGhpbmdcclxuICAgICAgICBpZiAoIXRoaXMuY2hlY2tDZWxsKHgsIHkpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgW3IsIGcsIGJdID0gY29sb3IudW5wYWNrKHRoaXMucGFsZXR0ZVt0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4XSlcclxuICAgICAgICBjb25zdCBbY3gsIGN5XSA9IGltYWdlMkNlbGwoeCwgeSlcclxuICAgICAgICB0aGlzLmNvbG9yQ3R4LmZpbGxTdHlsZSA9IGNvbG9yMlJHQkFTdHlsZShyLCBnLCBiKVxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguZmlsbFJlY3QoY3gsIGN5LCBjZWxsU2l6ZSwgY2VsbFNpemUpXHJcblxyXG4gICAgICAgIC8vIHJlbW92ZSB0aGUgcGl4ZWwgZnJvbSBvdmVybGF5XHJcbiAgICAgICAgY29uc3QgcGl4ZWxzID0gdGhpcy5waXhlbE92ZXJsYXlbdGhpcy5zZWxlY3RlZFBhbGV0dGVJbmRleF1cclxuICAgICAgICBjb25zdCBmbGF0WFkgPSBpbWFnaW5nLmZsYXQoeCwgeSwgdGhpcy5pbWFnZVdpZHRoKVxyXG4gICAgICAgIHBpeGVscy5kZWxldGUoZmxhdFhZKVxyXG4gICAgICAgIHRoaXMuc2VxdWVuY2UucHVzaChmbGF0WFkpXHJcblxyXG4gICAgICAgIGlmIChwaXhlbHMuc2l6ZSA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbWFyayBwYWxldHRlIGVudHJ5IGFzIGRvbmVcclxuICAgICAgICBjb25zdCBlbnRyeSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIucGFsZXR0ZS1lbnRyeVwiKVt0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4XVxyXG4gICAgICAgIGVudHJ5LmlubmVySFRNTCA9IFwiJmNoZWNrO1wiXHJcbiAgICAgICAgY29uc3QgbmV4dFBhbGV0dGVJZHggPSB0aGlzLmZpbmROZXh0VW5maW5pc2hlZEVudHJ5KHRoaXMuc2VsZWN0ZWRQYWxldHRlSW5kZXgpXHJcbiAgICAgICAgdGhpcy5zZWxlY3RQYWxldHRlRW50cnkobmV4dFBhbGV0dGVJZHgpXHJcblxyXG4gICAgICAgIGlmIChuZXh0UGFsZXR0ZUlkeCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFsbCBjb2xvcnMgY29tcGxldGUhIHNob3cgYW5pbWF0aW9uIG9mIHVzZXIgY29sb3Jpbmcgb3JpZ2luYWwgaW1hZ2VcclxuICAgICAgICB0aGlzLmV4ZWNEb25lU2VxdWVuY2UoKVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzZWxlY3RQYWxldHRlRW50cnkoaWR4OiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLnNlbGVjdGVkUGFsZXR0ZUluZGV4ID0gaWR4XHJcblxyXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIucGFsZXR0ZS1lbnRyeVwiKSlcclxuICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICAgICAgZW50cnkuY2xhc3NMaXN0LnJlbW92ZShcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaWR4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICBlbnRyaWVzW2lkeF0uY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjbGVhciBwYWxldHRlIGNhbnZhc1xyXG4gICAgICAgIGNvbnN0IGN0eCA9IHRoaXMucGFsZXR0ZUN0eFxyXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IHRoaXMucGFsZXR0ZUNhbnZhc1xyXG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KVxyXG5cclxuICAgICAgICBpZiAoaWR4ID09PSAtMSkge1xyXG4gICAgICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGlnaGxpZ2h0IHJlbWFpbmluZyBwaXhlbHMgZm9yIHRoaXMgY29sb3JcclxuICAgICAgICBjb25zdCBmb250ID0gY3R4LmZvbnRcclxuICAgICAgICBjdHguZm9udCA9IFwiYm9sZCAxNnB4IGFyaWFsXCJcclxuICAgICAgICBjb25zdCB0ZXh0SGVpZ2h0ID0gY3R4Lm1lYXN1cmVUZXh0KFwiTVwiKS53aWR0aFxyXG4gICAgICAgIGNvbnN0IGNkeHkgPSBjZWxsU2l6ZSAvIDJcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBwaXhlbCBvZiB0aGlzLnBpeGVsT3ZlcmxheVtpZHhdKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IGltYWdlMkNlbGwoLi4uaW1hZ2luZy51bmZsYXQocGl4ZWwsIHRoaXMuaW1hZ2VXaWR0aCkpXHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjJSR0JBU3R5bGUoMTkxLCAxOTEsIDE5MSwgMjU1KVxyXG4gICAgICAgICAgICBjdHguZmlsbFJlY3QoeCwgeSwgY2VsbFNpemUsIGNlbGxTaXplKVxyXG5cclxuICAgICAgICAgICAgLy8gZHJhdyBsYWJlbFxyXG4gICAgICAgICAgICBjb25zdCBsYWJlbCA9IGAke2lkeCArIDF9YFxyXG4gICAgICAgICAgICBjb25zdCBtZXRyaWNzID0gY3R4Lm1lYXN1cmVUZXh0KGxhYmVsKVxyXG4gICAgICAgICAgICBjb25zdCBjeCA9IHggKyBjZHh5IC0gbWV0cmljcy53aWR0aCAvIDJcclxuICAgICAgICAgICAgY29uc3QgY3kgPSB5ICsgY2R4eSArIHRleHRIZWlnaHQgLyAyXHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImJsYWNrXCJcclxuICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGxhYmVsLCBjeCwgY3kpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjdHguZm9udCA9IGZvbnRcclxuICAgICAgICB0aGlzLnJlZHJhdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZWRyYXcoKSB7XHJcbiAgICAgICAgLy8gbm90ZSAtIGNsZWFyIGlzIHN1YmplY3QgdG8gdHJhbnNmb3JtXHJcbiAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5jdHhcclxuICAgICAgICB0aGlzLmN0eC5yZXNldFRyYW5zZm9ybSgpXHJcbiAgICAgICAgY29uc3QgaHcgPSB0aGlzLmNhbnZhcy53aWR0aCAvIDIgLyB0aGlzLnpvb21cclxuICAgICAgICBjb25zdCBoaCA9IHRoaXMuY2FudmFzLmhlaWdodCAvIDIgLyB0aGlzLnpvb21cclxuXHJcbiAgICAgICAgdGhpcy5jZW50ZXJYID0gbWF0aC5jbGFtcCh0aGlzLmNlbnRlclgsIDAsIHRoaXMuY2VsbENhbnZhcy53aWR0aClcclxuICAgICAgICB0aGlzLmNlbnRlclkgPSBtYXRoLmNsYW1wKHRoaXMuY2VudGVyWSwgMCwgdGhpcy5jZWxsQ2FudmFzLmhlaWdodClcclxuICAgICAgICB0aGlzLmN0eC5zY2FsZSh0aGlzLnpvb20sIHRoaXMuem9vbSlcclxuICAgICAgICB0aGlzLmN0eC50cmFuc2xhdGUoLXRoaXMuY2VudGVyWCArIGh3LCAtdGhpcy5jZW50ZXJZICsgaGgpXHJcblxyXG4gICAgICAgIHZhciBpbnZUcmFuc2Zvcm0gPSBjdHguZ2V0VHJhbnNmb3JtKCkuaW52ZXJzZSgpXHJcbiAgICAgICAgY29uc3QgdGwgPSBpbnZUcmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQoeyB4OiAwLCB5OiAwIH0pXHJcbiAgICAgICAgY29uc3QgYnIgPSBpbnZUcmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQoeyB4OiB0aGlzLmNhbnZhcy53aWR0aCwgeTogdGhpcy5jYW52YXMuaGVpZ2h0IH0pXHJcbiAgICAgICAgY3R4LmNsZWFyUmVjdCh0bC54LCB0bC55LCBici54IC0gdGwueCwgYnIueSAtIHRsLnkpXHJcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh0aGlzLmNlbGxDYW52YXMsIDAsIDApXHJcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh0aGlzLnBhbGV0dGVDYW52YXMsIDAsIDApXHJcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh0aGlzLmNvbG9yQ2FudmFzLCAwLCAwKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZmluZE5leHRVbmZpbmlzaGVkRW50cnkoaTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5wYWxldHRlLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGlpID0gaSAlIHRoaXMucGFsZXR0ZS5sZW5ndGhcclxuICAgICAgICAgICAgaWYgKHRoaXMucGl4ZWxPdmVybGF5W2ldLnNpemUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaWlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIC0xXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBleGVjRG9uZVNlcXVlbmNlKCkge1xyXG4gICAgICAgIC8vIHNldCBhcyBkb25lXHJcbiAgICAgICAgdGhpcy5jb21wbGV0ZSA9IHRydWVcclxuXHJcbiAgICAgICAgdGhpcy5jdHgucmVzZXRUcmFuc2Zvcm0oKVxyXG5cclxuICAgICAgICAvLyBkcmF3IG9uZSBwaXhlbCBhdCBhIHRpbWUgdG8gY29sb3IgY2FudmFzXHJcbiAgICAgICAgLy8gb3ZybGF5IG9udG8gY2FudmFzXHJcbiAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuaW1hZ2VDdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5pbWFnZUhlaWdodCkuZGF0YVxyXG4gICAgICAgIHRoaXMuY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KVxyXG4gICAgICAgIGNvbnN0IHpvb20gPSBNYXRoLm1pbih0aGlzLmNhbnZhcy5jbGllbnRXaWR0aCAvIHRoaXMuaW1hZ2VXaWR0aCwgdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0IC8gdGhpcy5pbWFnZUhlaWdodClcclxuICAgICAgICB0aGlzLmN0eC5zY2FsZSh6b29tLCB6b29tKVxyXG5cclxuICAgICAgICAvLyBjb2xvciBhcyB1c2VyIGRpZFxyXG4gICAgICAgIGNvbnN0IHBpeGVsID0gbmV3IEltYWdlRGF0YSgxLCAxKVxyXG4gICAgICAgIGNvbnN0IHBpeGVsRGF0YSA9IHBpeGVsLmRhdGFcclxuICAgICAgICB0aGlzLmNvbG9yQ3R4LmNhbnZhcy53aWR0aCA9IHRoaXMuaW1hZ2VXaWR0aFxyXG4gICAgICAgIHRoaXMuY29sb3JDdHguY2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2VIZWlnaHRcclxuICAgICAgICB0aGlzLmNvbG9yQ3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNvbG9yQ2FudmFzLndpZHRoLCB0aGlzLmNvbG9yQ2FudmFzLmhlaWdodClcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNlcXVlbmNlLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHh5ID0gdGhpcy5zZXF1ZW5jZVtpXVxyXG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSBpbWFnaW5nLnVuZmxhdCh4eSwgdGhpcy5pbWFnZVdpZHRoKVxyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB4eSAqIDRcclxuICAgICAgICAgICAgcGl4ZWxEYXRhWzBdID0gZGF0YVtvZmZzZXRdXHJcbiAgICAgICAgICAgIHBpeGVsRGF0YVsxXSA9IGRhdGFbb2Zmc2V0ICsgMV1cclxuICAgICAgICAgICAgcGl4ZWxEYXRhWzJdID0gZGF0YVtvZmZzZXQgKyAyXVxyXG4gICAgICAgICAgICBwaXhlbERhdGFbM10gPSAyNTVcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29sb3JDdHgucHV0SW1hZ2VEYXRhKHBpeGVsLCB4LCB5KVxyXG4gICAgICAgICAgICB0aGlzLmN0eC5kcmF3SW1hZ2UodGhpcy5jb2xvckNhbnZhcywgMCwgMClcclxuICAgICAgICAgICAgaWYgKGkgJSA2NCA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB1dGlsLndhaXQoMClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgR2FsbGVyeVVpIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGI6IElEQkRhdGFiYXNlXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHVpID0gZG9tLmJ5SWQoXCJnYWxsZXJ5VWlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2Juc0RpdiA9IGRvbS5ieUlkKFwiY2Juc1wiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBnYWxsZXJ5QWNxdWlyZUltYWdlQnV0dG9uID0gZG9tLmJ5SWQoXCJnYWxsZXJ5QWNxdWlyZUltYWdlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRlbXBsYXRlID0gZG9tLmJ5SWQoXCJnYWxsZXJ5RW50cnlcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgcHVibGljIHJlYWRvbmx5IHNob3dBY3F1aXJlSW1hZ2UgPSBuZXcgQ2hhbm5lbDxbdm9pZF0+KClcclxuICAgIHB1YmxpYyByZWFkb25seSBjYm5TZWxlY3RlZCA9IG5ldyBDaGFubmVsPFtudW1iZXJdPigpXHJcblxyXG4gICAgY29uc3RydWN0b3IoZGI6IElEQkRhdGFiYXNlKSB7XHJcbiAgICAgICAgdGhpcy5kYiA9IGRiXHJcbiAgICAgICAgZG9tLmRlbGVnYXRlKHRoaXMudWksIFwiY2xpY2tcIiwgXCIuZ2FsbGVyeS1lbnRyeVwiLCAoZXZ0KSA9PiB0aGlzLm9uRW50cnlDbGljayhldnQpKVxyXG4gICAgICAgIHRoaXMuZ2FsbGVyeUFjcXVpcmVJbWFnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5zaG93QWNxdWlyZUltYWdlLnB1Ymxpc2goKSlcclxuICAgICAgICBkb20uZGVsZWdhdGUodGhpcy51aSwgXCJjbGlja1wiLCBcIi5nYWxsZXJ5LWRlbGV0ZS1idXR0b25cIiwgKGV2dCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLm9uRW50cnlEZWxldGUoZXZ0KVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIHNob3coKSB7XHJcbiAgICAgICAgdGhpcy51aS5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIGF3YWl0IHRoaXMucmVkcmF3KClcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgaGlkZSgpIHtcclxuICAgICAgICB0aGlzLnVpLmhpZGRlbiA9IHRydWVcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uRW50cnlDbGljayhldnQ6IEV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXZ0LnRhcmdldCBhcyBIVE1MRWxlbWVudFxyXG4gICAgICAgIGlmICghdGFyZ2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0YXJnZXQubWF0Y2hlcyhcIi5nYWxsZXJ5LWltYWdlXCIpKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZGl2ID0gKGV2dC50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoXCIuZ2FsbGVyeS1lbnRyeVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgICAgIGlmICghZGl2KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qga2V5ID0gcGFyc2VJbnQoZGl2LmRhdGFzZXRbXCJrZXlcIl0gfHwgXCJcIilcclxuICAgICAgICBpZiAoIWtleSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2JuU2VsZWN0ZWQucHVibGlzaChrZXkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvbkVudHJ5RGVsZXRlKGV2dDogRXZlbnQpIHtcclxuICAgICAgICBjb25zdCBkaXYgPSAoZXZ0LnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdChcIi5nYWxsZXJ5LWVudHJ5XCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICAgICAgaWYgKCFkaXYpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBrZXkgPSBwYXJzZUludChkaXYuZGF0YXNldFtcImtleVwiXSB8fCBcIlwiKVxyXG4gICAgICAgIGlmICgha2V5KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXdhaXQgZGVsZXRlQ0JOKHRoaXMuZGIsIGtleSlcclxuICAgICAgICBhd2FpdCB0aGlzLnJlZHJhdygpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZWRyYXcoKSB7XHJcbiAgICAgICAgLy8gY2xlYXIgY3VycmVudCB1aVxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih0aGlzLmNibnNEaXYpXHJcblxyXG4gICAgICAgIGNvbnN0IGt2cyA9IGF3YWl0IGdldEFsbENCTnModGhpcy5kYilcclxuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIGNibl0gb2Yga3ZzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy50ZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgICAgIGNvbnN0IGVudHJ5RGl2ID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLmdhbGxlcnktZW50cnlcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgICAgICAgICAgY29uc3QgaW1hZ2VEaXYgPSBkb20uYnlTZWxlY3RvcihlbnRyeURpdiwgXCIuZ2FsbGVyeS1pbWFnZVwiKSBhcyBIVE1MSW1hZ2VFbGVtZW50XHJcbiAgICAgICAgICAgIGltYWdlRGl2LnNyYyA9IFVSTC5jcmVhdGVPYmplY3RVUkwoY2JuLnByZXZpZXcpXHJcbiAgICAgICAgICAgIGVudHJ5RGl2LmRhdGFzZXRbXCJrZXlcIl0gPSBrZXkudG9TdHJpbmcoKVxyXG4gICAgICAgICAgICB0aGlzLmNibnNEaXYuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xyXG4gICAgY29uc3QgZGIgPSBhd2FpdCBvcGVuREIoKVxyXG4gICAgYXdhaXQgdmFsaWRhdGVEYXRhKGRiKVxyXG5cclxuICAgIGNvbnN0IGFjcXVpcmVVaSA9IG5ldyBBY3F1aXJlVWkoKVxyXG4gICAgY29uc3Qgc2l6ZVVpID0gbmV3IEltYWdlU2l6ZVVpKGRiKVxyXG4gICAgY29uc3QgcGxheVVpID0gbmV3IFBsYXlVaShkYilcclxuICAgIGNvbnN0IGdhbGxlcnlVaSA9IG5ldyBHYWxsZXJ5VWkoZGIpXHJcblxyXG4gICAgYWNxdWlyZVVpLmltYWdlQWNxdWlyZWQuc3ViY3JpYmUob25JbWFnZUFjcXVpcmVkKVxyXG4gICAgYWNxdWlyZVVpLnNob3dHYWxsZXJ5LnN1YmNyaWJlKHNob3dHYWxsZXJ5KVxyXG4gICAgc2l6ZVVpLmNyZWF0ZUNCTi5zdWJjcmliZShzaG93UGxheSlcclxuICAgIHNpemVVaS5yZXR1cm4uc3ViY3JpYmUoc2hvd0FjcXVpcmUpXHJcbiAgICBwbGF5VWkucmV0dXJuLnN1YmNyaWJlKHNob3dBY3F1aXJlKVxyXG4gICAgZ2FsbGVyeVVpLnNob3dBY3F1aXJlSW1hZ2Uuc3ViY3JpYmUoc2hvd0FjcXVpcmUpXHJcbiAgICBnYWxsZXJ5VWkuY2JuU2VsZWN0ZWQuc3ViY3JpYmUoc2hvd1BsYXkpXHJcblxyXG4gICAgLy8gaW5pdGlhbGx5IHNob3cgYWNxdWlyZSB1aVxyXG4gICAgYWNxdWlyZVVpLnNob3coKVxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIG9wZW5EQigpOiBQcm9taXNlPElEQkRhdGFiYXNlPiB7XHJcbiAgICAgICAgLy8gb3BlbiAvIHNldHVwIGRiXHJcbiAgICAgICAgLy8gYXdhaXQgaW5kZXhlZERCLmRlbGV0ZURhdGFiYXNlKFwiY2JuXCIpXHJcbiAgICAgICAgY29uc3QgcmVxID0gaW5kZXhlZERCLm9wZW4oXCJjYm5cIiwgMSlcclxuICAgICAgICByZXEuYWRkRXZlbnRMaXN0ZW5lcihcImJsb2NrZWRcIiwgXyA9PiBkYkJsb2NrZWQoKSlcclxuICAgICAgICByZXEuYWRkRXZlbnRMaXN0ZW5lcihcInVwZ3JhZGVuZWVkZWRcIiwgZXYgPT4gdXBncmFkZURCKGV2KSlcclxuICAgICAgICBjb25zdCBkYiA9IGF3YWl0IGlkYi53YWl0UmVxdWVzdChyZXEpXHJcbiAgICAgICAgcmV0dXJuIGRiXHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gb25JbWFnZUFjcXVpcmVkKGltZzogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICBhd2FpdCBzaG93TG9hZGluZ0luZGljYXRvcigpXHJcbiAgICAgICAgYWNxdWlyZVVpLmhpZGUoKVxyXG4gICAgICAgIHNpemVVaS5zaG93KGltZylcclxuICAgICAgICBoaWRlTG9hZGluZ0luZGljYXRvcigpXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2hvd0FjcXVpcmUoKSB7XHJcbiAgICAgICAgaGlkZUFsbCgpXHJcbiAgICAgICAgYWNxdWlyZVVpLnNob3coKVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNob3dHYWxsZXJ5KCkge1xyXG4gICAgICAgIGhpZGVBbGwoKVxyXG4gICAgICAgIGdhbGxlcnlVaS5zaG93KClcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBzaG93UGxheShrZXk6IG51bWJlcikge1xyXG4gICAgICAgIGF3YWl0IHNob3dMb2FkaW5nSW5kaWNhdG9yKClcclxuICAgICAgICBoaWRlQWxsKClcclxuICAgICAgICBwbGF5VWkuc2hvdyhrZXkpXHJcbiAgICAgICAgaGlkZUxvYWRpbmdJbmRpY2F0b3IoKVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGhpZGVBbGwoKSB7XHJcbiAgICAgICAgcGxheVVpLmhpZGUoKVxyXG4gICAgICAgIHNpemVVaS5oaWRlKClcclxuICAgICAgICBhY3F1aXJlVWkuaGlkZSgpXHJcbiAgICAgICAgZ2FsbGVyeVVpLmhpZGUoKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0UGFsZXR0ZShpbWdEYXRhOiBJbWFnZURhdGEpOiBudW1iZXJbXSB7XHJcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQsIGRhdGEgfSA9IGltZ0RhdGFcclxuICAgIGNvbnN0IHJvd1BpdGNoID0gd2lkdGggKiA0XHJcblxyXG4gICAgLy8gZmluZCB1bmlxdWUgY29sb3JzLCBjcmVhdGUgZW50cnkgZm9yIGVhY2hcclxuICAgIGNvbnN0IHBhbGV0dGUgPSBuZXcgU2V0PG51bWJlcj4oKVxyXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIGNvbnN0IHlPZmZzZXQgPSB5ICogcm93UGl0Y2hcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyArK3gpIHtcclxuICAgICAgICAgICAgLy8gcGFjayBjb2xvciB0byBhIHVuaXF1ZSB2YWx1ZVxyXG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB5T2Zmc2V0ICsgeCAqIDRcclxuICAgICAgICAgICAgY29uc3QgciA9IGRhdGFbb2Zmc2V0XVxyXG4gICAgICAgICAgICBjb25zdCBnID0gZGF0YVtvZmZzZXQgKyAxXVxyXG4gICAgICAgICAgICBjb25zdCBiID0gZGF0YVtvZmZzZXQgKyAyXVxyXG4gICAgICAgICAgICBjb25zdCBhID0gZGF0YVtvZmZzZXQgKyAzXVxyXG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGNvbG9yLnBhY2sociwgZywgYiwgYSlcclxuICAgICAgICAgICAgcGFsZXR0ZS5hZGQodmFsdWUpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBbLi4ucGFsZXR0ZV1cclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBhbiBvdmVybGF5IHRoYXQgbWFwcyBlYWNoIHBpeGVsIHRvIHRoZSBpbmRleCBvZiBpdHMgcGFsZXR0ZSBlbnRyeVxyXG4gKiBAcGFyYW0gaW1nRGF0YSBpbWFnZSBkYXRhXHJcbiAqIEBwYXJhbSBwYWxldHRlIHBhbGV0dGUgY29sb3JzXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVQYWxldHRlT3ZlcmxheShpbWdEYXRhOiBJbWFnZURhdGEsIHBhbGV0dGU6IG51bWJlcltdKTogbnVtYmVyW10ge1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBkYXRhIH0gPSBpbWdEYXRhXHJcbiAgICBjb25zdCBwYWxldHRlTWFwID0gYXJyYXkubWFwSW5kaWNlcyhwYWxldHRlKVxyXG4gICAgY29uc3Qgcm93UGl0Y2ggPSB3aWR0aCAqIDRcclxuICAgIGNvbnN0IG92ZXJsYXkgPSBhcnJheS51bmlmb3JtKC0xLCB3aWR0aCAqIGhlaWdodClcclxuXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiByb3dQaXRjaFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICAvLyBwYWNrIGNvbG9yIHRvIGEgdW5pcXVlIHZhbHVlXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4ICogNFxyXG4gICAgICAgICAgICBjb25zdCByID0gZGF0YVtvZmZzZXRdXHJcbiAgICAgICAgICAgIGNvbnN0IGcgPSBkYXRhW29mZnNldCArIDFdXHJcbiAgICAgICAgICAgIGNvbnN0IGIgPSBkYXRhW29mZnNldCArIDJdXHJcbiAgICAgICAgICAgIGNvbnN0IGEgPSBkYXRhW29mZnNldCArIDNdXHJcbiAgICAgICAgICAgIGNvbnN0IHJnYmEgPSBjb2xvci5wYWNrKHIsIGcsIGIsIGEpXHJcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IHBhbGV0dGVNYXAuZ2V0KHJnYmEpID8/IC0xXHJcbiAgICAgICAgICAgIG92ZXJsYXlbeSAqIHdpZHRoICsgeF0gPSBpZHhcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG92ZXJsYXlcclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBhbiBvdmVybGF5IHRoYXQgbWFwcyBlYWNoIHBhbGV0dGUgZW50cnkgdG8gYSBsaXN0IG9mIHBpeGVscyB3aXRoIGl0cyBjb2xvclxyXG4gKiBAcGFyYW0gaW1nRGF0YSBcclxuICogQHBhcmFtIHBhbGV0dGUgXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVQaXhlbE92ZXJsYXkod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHBhbGV0dGU6IG51bWJlcltdLCBwYWxldHRlT3ZlcmxheTogbnVtYmVyW10pOiBTZXQ8bnVtYmVyPltdIHtcclxuICAgIGNvbnN0IG92ZXJsYXkgPSBhcnJheS5nZW5lcmF0ZShwYWxldHRlLmxlbmd0aCwgKCkgPT4gbmV3IFNldDxudW1iZXI+KCkpXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiB3aWR0aFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICAvLyBwYWNrIGNvbG9yIHRvIGEgdW5pcXVlIHZhbHVlXHJcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGNvbnN0IHBhbGV0dGVJZHggPSBwYWxldHRlT3ZlcmxheVtvZmZzZXRdXHJcbiAgICAgICAgICAgIGlmIChwYWxldHRlSWR4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgZmxhdENvb3JkID0gaW1hZ2luZy5mbGF0KHgsIHksIHdpZHRoKVxyXG4gICAgICAgICAgICBvdmVybGF5W3BhbGV0dGVJZHhdLmFkZChmbGF0Q29vcmQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBvdmVybGF5XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjYWxjTHVtaW5hbmNlKHI6IG51bWJlciwgZzogbnVtYmVyLCBiOiBudW1iZXIpIHtcclxuICAgIGNvbnN0IGwgPSAwLjIxMjYgKiAociAvIDI1NSkgKyAwLjcxNTIgKiAoZyAvIDI1NSkgKyAwLjA3MjIgKiAoYiAvIDI1NSlcclxuICAgIHJldHVybiBsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdDZWxsSW1hZ2UoY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBwYWxldHRlT3ZlcmxheTogbnVtYmVyW10pIHtcclxuICAgIGNvbnN0IGNlbGxJbWFnZVdpZHRoID0gd2lkdGggKiAoY2VsbFNpemUgKyAxKSArIDFcclxuICAgIGNvbnN0IGNlbGxJbWFnZUhlaWdodCA9IGhlaWdodCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG5cclxuICAgIC8vIHNpemUgY2FudmFzXHJcbiAgICBjdHguY2FudmFzLndpZHRoID0gY2VsbEltYWdlV2lkdGhcclxuICAgIGN0eC5jYW52YXMuaGVpZ2h0ID0gY2VsbEltYWdlSGVpZ2h0XHJcblxyXG4gICAgLy8gZHJhdyBob3Jpem9udGFsIGdyaWQgbGluZXNcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IGhlaWdodDsgKytpKSB7XHJcbiAgICAgICAgY3R4LnN0cm9rZVJlY3QoMCwgaSAqIChjZWxsU2l6ZSArIDEpLCBjZWxsSW1hZ2VXaWR0aCwgMSlcclxuICAgIH1cclxuXHJcbiAgICAvLyBkcmF3IHZlcnRpY2FsIGdyaWQgbGluZXNcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IHdpZHRoOyArK2kpIHtcclxuICAgICAgICBjdHguc3Ryb2tlUmVjdChpICogKGNlbGxTaXplICsgMSksIDAsIDEsIGNlbGxJbWFnZUhlaWdodClcclxuICAgIH1cclxuXHJcbiAgICAvLyBkcmF3ICNzXHJcbiAgICBjb25zdCBmb250ID0gY3R4LmZvbnRcclxuICAgIGN0eC5mb250ID0gXCIxNnB4IGFyaWFsXCJcclxuICAgIGNvbnN0IHRleHRIZWlnaHQgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoXHJcbiAgICBjb25zdCBjZHh5ID0gY2VsbFNpemUgLyAyXHJcblxyXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7ICsreSkge1xyXG4gICAgICAgIGNvbnN0IHlPZmZzZXQgPSB5ICogd2lkdGhcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyArK3gpIHtcclxuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgY29uc3QgcGFsZXR0ZUlkeCA9IHBhbGV0dGVPdmVybGF5W29mZnNldF1cclxuICAgICAgICAgICAgY29uc3QgbGFiZWwgPSBgJHtwYWxldHRlSWR4ICsgMX1gXHJcbiAgICAgICAgICAgIGNvbnN0IG1ldHJpY3MgPSBjdHgubWVhc3VyZVRleHQobGFiZWwpXHJcbiAgICAgICAgICAgIGNvbnN0IGN4ID0geCAqIChjZWxsU2l6ZSArIDEpICsgY2R4eSArIDEgLSBtZXRyaWNzLndpZHRoIC8gMlxyXG4gICAgICAgICAgICBjb25zdCBjeSA9IHkgKiAoY2VsbFNpemUgKyAxKSArIGNkeHkgKyAxICsgdGV4dEhlaWdodCAvIDJcclxuICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGxhYmVsLCBjeCwgY3kpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGN0eC5mb250ID0gZm9udFxyXG59XHJcblxyXG5mdW5jdGlvbiBmaXQod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIG1heFNpemU6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgaWYgKHdpZHRoID49IGhlaWdodCAmJiB3aWR0aCA+IG1heFNpemUpIHtcclxuICAgICAgICBoZWlnaHQgPSBtYXhTaXplICogaGVpZ2h0IC8gd2lkdGhcclxuICAgICAgICByZXR1cm4gW01hdGguZmxvb3IobWF4U2l6ZSksIE1hdGguZmxvb3IoaGVpZ2h0KV1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoaGVpZ2h0ID4gd2lkdGggJiYgaGVpZ2h0ID4gbWF4U2l6ZSkge1xyXG4gICAgICAgIHdpZHRoID0gbWF4U2l6ZSAqIHdpZHRoIC8gaGVpZ2h0XHJcbiAgICAgICAgcmV0dXJuIFtNYXRoLmZsb29yKHdpZHRoKSwgTWF0aC5mbG9vcihtYXhTaXplKV1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gW01hdGguZmxvb3Iod2lkdGgpLCBNYXRoLmZsb29yKGhlaWdodCldXHJcbn1cclxuXHJcbi8qKlxyXG4gICAqIENvbnZlcnQgYW4gaW1hZ2UgeCBvciB5IGNvb3JkaW5hdGUgdG8gdG9wIG9yIGxlZnQgb2YgY2JuIGNlbGwgY29udGFpbmluZyB0aGF0IHBpeGVsXHJcbiAgICogQHBhcmFtIGNvb3JkIHggb3IgeSBjb29yZGluYXRlXHJcbiAgICovXHJcbmZ1bmN0aW9uIGltYWdlMkNlbGxDb29yZChjb29yZDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBjb29yZCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG59XHJcblxyXG4vKipcclxuICogQ29udmVydCBhIGNibiB4IG9yIHkgY29vcmRpbmF0ZSB0byB0b3Agb3IgbGVmdCBvZiBjYm4gY2VsbCBjb250YWluaW5nIHRoYXQgcGl4ZWxcclxuICogQHBhcmFtIGNvb3JkIHggb3IgeSBjb29yZGluYXRlXHJcbiAqL1xyXG5mdW5jdGlvbiBjZWxsMkltYWdlQ29vcmQoY29vcmQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gTWF0aC5mbG9vcigoY29vcmQgLSAxKSAvIChjZWxsU2l6ZSArIDEpKVxyXG59XHJcblxyXG4vKipcclxuICAgKiBDb252ZXJ0IGFuIGltYWdlIHggb3IgeSBjb29yZGluYXRlIHRvIHRvcCBvciBsZWZ0IG9mIGNibiBjZWxsIGNvbnRhaW5pbmcgdGhhdCBwaXhlbFxyXG4gICAqIEBwYXJhbSBjb29yZCB4IG9yIHkgY29vcmRpbmF0ZVxyXG4gICAqL1xyXG5mdW5jdGlvbiBpbWFnZTJDZWxsKHg6IG51bWJlciwgeTogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICByZXR1cm4gW2ltYWdlMkNlbGxDb29yZCh4KSwgaW1hZ2UyQ2VsbENvb3JkKHkpXVxyXG59XHJcblxyXG4vKipcclxuICogQ29udmVydCBhIGNibiB4IG9yIHkgY29vcmRpbmF0ZSB0byB0b3Agb3IgbGVmdCBvZiBjYm4gY2VsbCBjb250YWluaW5nIHRoYXQgcGl4ZWxcclxuICogQHBhcmFtIGNvb3JkIHggb3IgeSBjb29yZGluYXRlXHJcbiAqL1xyXG5mdW5jdGlvbiBjZWxsMkltYWdlKHg6IG51bWJlciwgeTogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICByZXR1cm4gW2NlbGwySW1hZ2VDb29yZCh4KSwgY2VsbDJJbWFnZUNvb3JkKHkpXVxyXG59XHJcblxyXG4vKipcclxuICogY29udmVydCByZ2JhIGNvb3JkaW5hdGVzIHRvIGEgc3R5bGUgc3RyaW5nXHJcbiAqIEBwYXJhbSByIHJlZFxyXG4gKiBAcGFyYW0gZyBncmVlblxyXG4gKiBAcGFyYW0gYiBibHVlXHJcbiAqIEBwYXJhbSBhIGFscGhhXHJcbiAqL1xyXG5mdW5jdGlvbiBjb2xvcjJSR0JBU3R5bGUocjogbnVtYmVyLCBnOiBudW1iZXIsIGI6IG51bWJlciwgYTogbnVtYmVyID0gMjU1KSB7XHJcbiAgICByZXR1cm4gYHJnYmEoJHtyfSwgJHtnfSwgJHtifSwgJHthIC8gMjU1fSlgXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBydW5lUGFsbGV0ZShwYWxldHRlOiBudW1iZXJbXSwgcGl4ZWxPdmVybGF5OiBTZXQ8bnVtYmVyPltdLCBtYXhQaXhlbHM6IG51bWJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKTogbnVtYmVyW10ge1xyXG4gICAgY29uc3QgaW5kaWNlc1RvS2VlcCA9IG5ldyBTZXQ8bnVtYmVyPihhcnJheS5zZXF1ZW5jZSgwLCBwYWxldHRlLmxlbmd0aCkpXHJcblxyXG4gICAgY3R4LmNhbnZhcy53aWR0aCA9IHdpZHRoICogKGNlbGxTaXplICsgMSkgKyAxXHJcbiAgICBjdHguY2FudmFzLmhlaWdodCA9IGhlaWdodCAqIChjZWxsU2l6ZSArIDEpICsgMVxyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGl4ZWxPdmVybGF5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgcGl4ZWxzID0gcGl4ZWxPdmVybGF5W2ldXHJcbiAgICAgICAgaWYgKHBpeGVscy5zaXplIDwgbWF4UGl4ZWxzKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXRlci5hbGwocGl4ZWxzLCB4ID0+ICFpc0JvcmRlclBpeGVsKC4uLmltYWdpbmcudW5mbGF0KHgsIHdpZHRoKSwgd2lkdGgsIGhlaWdodCkpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBmaWxsIHRoZXNlIHBpeGVscyBpbiBpbWFnZSB3aXRoIGFwcHJvcHJpYXRlIGNvbG9yXHJcbiAgICAgICAgY29uc3QgW3IsIGcsIGJdID0gY29sb3IudW5wYWNrKHBhbGV0dGVbaV0pXHJcbiAgICAgICAgZm9yIChjb25zdCB4eSBvZiBwaXhlbHMpIHtcclxuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gaW1hZ2luZy51bmZsYXQoeHksIHdpZHRoKVxyXG4gICAgICAgICAgICBjb25zdCBbY3gsIGN5XSA9IGltYWdlMkNlbGwoeCwgeSlcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yMlJHQkFTdHlsZShyLCBnLCBiKVxyXG4gICAgICAgICAgICBjdHguZmlsbFJlY3QoY3gsIGN5LCBjZWxsU2l6ZSwgY2VsbFNpemUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpbmRpY2VzVG9LZWVwLmRlbGV0ZShpKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG5ld1BhbGV0dGUgPSBbLi4uaW5kaWNlc1RvS2VlcF0ubWFwKHggPT4gcGFsZXR0ZVt4XSlcclxuICAgIHJldHVybiBuZXdQYWxldHRlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzQm9yZGVyUGl4ZWwoeDogbnVtYmVyLCB5OiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4geCA9PT0gMCB8fCB5ID09PSAwIHx8IHggPT09IHdpZHRoIC0gMSB8fCB5ID09PSBoZWlnaHQgLSAxXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHNob3dMb2FkaW5nSW5kaWNhdG9yKCkge1xyXG4gICAgY29uc3QgZGl2ID0gZG9tLmJ5SWQoXCJsb2FkaW5nTW9kYWxcIilcclxuICAgIGRpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgYXdhaXQgdXRpbC53YWl0KDApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhpZGVMb2FkaW5nSW5kaWNhdG9yKCkge1xyXG4gICAgY29uc3QgZGl2ID0gZG9tLmJ5SWQoXCJsb2FkaW5nTW9kYWxcIilcclxuICAgIGRpdi5oaWRkZW4gPSB0cnVlXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHVwZ3JhZGVEQihldnQ6IElEQlZlcnNpb25DaGFuZ2VFdmVudCkge1xyXG4gICAgY29uc3QgZGIgPSAoZXZ0LnRhcmdldCBhcyBJREJPcGVuREJSZXF1ZXN0KS5yZXN1bHRcclxuXHJcbiAgICAvLyBub3RlIC0gZXZlbnQgY29udGFpbnMgb2xkIC8gbmV3IHZlcnNpb25zIGlmIHJlcXVpcmVkXHJcbiAgICAvLyB1cGRhdGUgdG8gdGhlIG5ldyB2ZXJzaW9uXHJcbiAgICBpZiAoZXZ0Lm9sZFZlcnNpb24gPCAxKSB7XHJcbiAgICAgICAgdXBncmFkZURCMShkYilcclxuICAgIH1cclxuXHJcbiAgICBldnQucHJldmVudERlZmF1bHQoKVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiB1cGdyYWRlREIxKGRiOiBJREJEYXRhYmFzZSkge1xyXG4gICAgZGIuY3JlYXRlT2JqZWN0U3RvcmUocGljdHVyZXNPYmplY3RTdG9yZU5hbWUsIHsgYXV0b0luY3JlbWVudDogdHJ1ZSB9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBkYkJsb2NrZWQoKSB7XHJcbiAgICBzaG93RXJyb3IoXCJQaWN0dXJlIGRhdGFiYXNlIG5lZWRzIHVwZGF0ZWQsIGJ1dCBvdGhlciB0YWJzIGFyZSBvcGVuIHRoYXQgYXJlIHVzaW5nIGl0LiBQbGVhc2UgY2xvc2UgYWxsIHRhYnMgZm9yIHRoaXMgd2ViIHNpdGUgYW5kIHRyeSBhZ2Fpbi5cIilcclxufVxyXG5cclxuZnVuY3Rpb24gc2hvd0Vycm9yKG1lc3NhZ2U6IHN0cmluZykge1xyXG4gICAgY29uc3QgbW9kYWxEaXYgPSBkb20uYnlJZChcImVycm9yTW9kYWxcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIGNvbnN0IG1lc3NhZ2VEaXYgPSBkb20uYnlJZChcImVycm9yTWVzc2FnZVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgbW9kYWxEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgIG1lc3NhZ2VEaXYudGV4dENvbnRlbnQgPSBtZXNzYWdlXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHB1dENCTihkYjogSURCRGF0YWJhc2UsIGRhdGE6IENCTlBpY3R1cmUsIGtleT86IG51bWJlcik6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgICAvLyBub3RlIHNhZmFyaSBjYW4ndCBzdG9yZSBibG9icyBzbyBtdXN0IGNvbnZlcnQgdG8gYXJyYXlCdWZmZXJcclxuICAgIGNvbnN0IGRiRGF0YSA9IGF3YWl0IGNibjJkYihkYXRhKVxyXG4gICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbihwaWN0dXJlc09iamVjdFN0b3JlTmFtZSwgXCJyZWFkd3JpdGVcIilcclxuICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUocGljdHVyZXNPYmplY3RTdG9yZU5hbWUpXHJcbiAgICBjb25zdCBrID0gYXdhaXQgaWRiLndhaXRSZXF1ZXN0KHN0b3JlLnB1dChkYkRhdGEsIGtleSkpIGFzIG51bWJlclxyXG4gICAgcmV0dXJuIGtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZGVsZXRlQ0JOKGRiOiBJREJEYXRhYmFzZSwga2V5OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIC8vIG5vdGUgc2FmYXJpIGNhbid0IHN0b3JlIGJsb2JzIHNvIG11c3QgY29udmVydCB0byBhcnJheUJ1ZmZlclxyXG4gICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbihwaWN0dXJlc09iamVjdFN0b3JlTmFtZSwgXCJyZWFkd3JpdGVcIilcclxuICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUocGljdHVyZXNPYmplY3RTdG9yZU5hbWUpXHJcbiAgICBhd2FpdCBpZGIud2FpdFJlcXVlc3Qoc3RvcmUuZGVsZXRlKGtleSkpXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGdldENCTihkYjogSURCRGF0YWJhc2UsIGtleTogbnVtYmVyKTogUHJvbWlzZTxDQk5QaWN0dXJlPiB7XHJcbiAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lLCBcInJlYWR3cml0ZVwiKVxyXG4gICAgY29uc3Qgc3RvcmUgPSB0eC5vYmplY3RTdG9yZShwaWN0dXJlc09iamVjdFN0b3JlTmFtZSlcclxuICAgIGNvbnN0IGRiRGF0YSA9IGF3YWl0IGlkYi53YWl0UmVxdWVzdChzdG9yZS5nZXQoa2V5KSkgYXMgQ0JOUGljdHVyZURCXHJcbiAgICBjb25zdCBkYXRhID0gZGIyY2JuKGRiRGF0YSlcclxuICAgIGF3YWl0IGlkYi53YWl0VHgodHgpXHJcbiAgICByZXR1cm4gZGF0YVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBnZXRBbGxDQk5zKGRiOiBJREJEYXRhYmFzZSk6IFByb21pc2U8W251bWJlciwgQ0JOUGljdHVyZV1bXT4ge1xyXG4gICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbihwaWN0dXJlc09iamVjdFN0b3JlTmFtZSwgXCJyZWFkd3JpdGVcIilcclxuICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUocGljdHVyZXNPYmplY3RTdG9yZU5hbWUpXHJcbiAgICBjb25zdCBkYXRhcyA9IG5ldyBBcnJheTxbbnVtYmVyLCBDQk5QaWN0dXJlXT4oKVxyXG5cclxuICAgIGNvbnN0IHJlcSA9IHN0b3JlLm9wZW5DdXJzb3IoKVxyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICBjb25zdCBjdXJzb3IgPSBhd2FpdCBpZGIud2FpdFJlcXVlc3QocmVxKVxyXG4gICAgICAgIGlmICghY3Vyc29yKSB7XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBrZXkgPSBjdXJzb3Iua2V5IGFzIG51bWJlclxyXG4gICAgICAgIGNvbnN0IGRiRGF0YSA9IGN1cnNvci52YWx1ZSBhcyBDQk5QaWN0dXJlREJcclxuICAgICAgICBjb25zdCBkYXRhID0gZGIyY2JuKGRiRGF0YSlcclxuICAgICAgICBkYXRhcy5wdXNoKFtrZXksIGRhdGFdKVxyXG4gICAgICAgIGN1cnNvci5jb250aW51ZSgpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGRhdGFzXHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGNibjJkYihkYXRhOiBDQk5QaWN0dXJlKTogUHJvbWlzZTxDQk5QaWN0dXJlREI+IHtcclxuICAgIGNvbnN0IGltYWdlQnVmZmVyID0gYXdhaXQgaWRiLmJsb2IyQXJyYXlCdWZmZXIoZGF0YS5pbWFnZSlcclxuICAgIGNvbnN0IHByZXZpZXdCdWZmZXIgPSBhd2FpdCBpZGIuYmxvYjJBcnJheUJ1ZmZlcihkYXRhLnByZXZpZXcpXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBpbWFnZTogaW1hZ2VCdWZmZXIsXHJcbiAgICAgICAgcHJldmlldzogcHJldmlld0J1ZmZlcixcclxuICAgICAgICBzZXF1ZW5jZTogZGF0YS5zZXF1ZW5jZSxcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZGIyY2JuKGRhdGE6IENCTlBpY3R1cmVEQik6IENCTlBpY3R1cmUge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBpbWFnZTogaWRiLmFycmF5QnVmZmVyMkJsb2IoZGF0YS5pbWFnZSwgaW1hZ2VNaW1lVHlwZSksXHJcbiAgICAgICAgcHJldmlldzogaWRiLmFycmF5QnVmZmVyMkJsb2IoZGF0YS5wcmV2aWV3LCBpbWFnZU1pbWVUeXBlKSxcclxuICAgICAgICBzZXF1ZW5jZTogZGF0YS5zZXF1ZW5jZVxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlZCBwcmV2aWV3IG9mIENCTiBjb21wbGV0ZWQgdGh1cyBmYXJcclxuICogQHBhcmFtIGltYWdlIGltYWdlXHJcbiAqIEBwYXJhbSBzZXF1ZW5jZSBzZXF1ZW5jZSBvZiBwaXhlbCBpbmRpY2VzIGNvbXBsZXRlZCB0aHVzIGZhclxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlUHJldmlldyhpbWFnZTogQmxvYiwgc2VxdWVuY2U6IG51bWJlcltdKTogUHJvbWlzZTxCbG9iPiB7XHJcbiAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGltYWdlKVxyXG4gICAgY29uc3QgaW1nID0gYXdhaXQgZG9tLmxvYWRJbWFnZSh1cmwpXHJcbiAgICBjb25zdCBpbWFnZUNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIGltYWdlQ2FudmFzLndpZHRoID0gaW1nLndpZHRoXHJcbiAgICBpbWFnZUNhbnZhcy5oZWlnaHQgPSBpbWcuaGVpZ2h0XHJcbiAgICBjb25zdCBpbWFnZUN0eCA9IGltYWdlQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSFcclxuICAgIGltYWdlQ3R4LmRyYXdJbWFnZShpbWcsIDAsIDApXHJcblxyXG4gICAgY29uc3QgcHJldmlld0NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgIHByZXZpZXdDYW52YXMud2lkdGggPSBpbWcud2lkdGhcclxuICAgIHByZXZpZXdDYW52YXMuaGVpZ2h0ID0gaW1nLmhlaWdodFxyXG4gICAgY29uc3QgcHJldmlld0N0eCA9IHByZXZpZXdDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIVxyXG5cclxuICAgIGNvbnN0IGltYWdlRGF0YSA9IGltYWdlQ3R4LmdldEltYWdlRGF0YSgwLCAwLCBpbWcud2lkdGgsIGltZy5oZWlnaHQpXHJcbiAgICBjb25zdCBwcmV2aWV3RGF0YSA9IHByZXZpZXdDdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIGltZy53aWR0aCwgaW1nLmhlaWdodClcclxuXHJcbiAgICBmb3IgKGNvbnN0IGkgb2Ygc2VxdWVuY2UpIHtcclxuICAgICAgICBwcmV2aWV3RGF0YS5kYXRhW2kgKiA0XSA9IGltYWdlRGF0YS5kYXRhW2kgKiA0XVxyXG4gICAgICAgIHByZXZpZXdEYXRhLmRhdGFbaSAqIDQgKyAxXSA9IGltYWdlRGF0YS5kYXRhW2kgKiA0ICsgMV1cclxuICAgICAgICBwcmV2aWV3RGF0YS5kYXRhW2kgKiA0ICsgMl0gPSBpbWFnZURhdGEuZGF0YVtpICogNCArIDJdXHJcbiAgICAgICAgcHJldmlld0RhdGEuZGF0YVtpICogNCArIDNdID0gaW1hZ2VEYXRhLmRhdGFbaSAqIDQgKyAzXVxyXG4gICAgfVxyXG5cclxuICAgIHByZXZpZXdDdHgucHV0SW1hZ2VEYXRhKHByZXZpZXdEYXRhLCAwLCAwKVxyXG4gICAgY29uc3QgcHJldmlld0Jsb2IgPSBhd2FpdCBpbWFnaW5nLmNhbnZhczJCbG9iKHByZXZpZXdDYW52YXMpXHJcbiAgICByZXR1cm4gcHJldmlld0Jsb2JcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gdmFsaWRhdGVEYXRhKGRiOiBJREJEYXRhYmFzZSkge1xyXG4gICAgLy8gaXRlcmF0ZSBvdmVyIGFsbCBjYm4gaW1hZ2VzLCB1cGRncmFkZSBvYmplY3Qgc3RydWN0dXJlIGlmIG5lZWRlZFxyXG4gICAgY29uc3Qga3ZzID0gYXdhaXQgaWRiLmdldEFsbEtleVZhbHVlcyhkYiwgcGljdHVyZXNPYmplY3RTdG9yZU5hbWUpXHJcbiAgICBjb25zdCB1cGRhdGVkS3ZzID0gbmV3IEFycmF5PFtudW1iZXIsIGFueV0+KClcclxuXHJcbiAgICBmb3IgKGNvbnN0IFtrZXksIGNibl0gb2Yga3ZzKSB7XHJcbiAgICAgICAgaWYgKGNibi5wcmV2aWV3KSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBpbWFnZUJsb2IgPSBpZGIuYXJyYXlCdWZmZXIyQmxvYihjYm4uaW1hZ2UsIGltYWdlTWltZVR5cGUpXHJcbiAgICAgICAgY29uc3QgcHJldmlld0Jsb2IgPSBhd2FpdCBjcmVhdGVQcmV2aWV3KGltYWdlQmxvYiwgY2JuLnNlcXVlbmNlKVxyXG4gICAgICAgIGNibi5wcmV2aWV3ID0gYXdhaXQgaWRiLmJsb2IyQXJyYXlCdWZmZXIocHJldmlld0Jsb2IpIFxyXG4gICAgICAgIHVwZGF0ZWRLdnMucHVzaChba2V5IGFzIG51bWJlciwgY2JuXSlcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKHBpY3R1cmVzT2JqZWN0U3RvcmVOYW1lLCBcInJlYWR3cml0ZVwiKVxyXG4gICAgY29uc3Qgc3RvcmUgPSB0eC5vYmplY3RTdG9yZShwaWN0dXJlc09iamVjdFN0b3JlTmFtZSlcclxuICAgIGZvciAoY29uc3QgW2tleSwgY2JuXSBvZiB1cGRhdGVkS3ZzKSB7XHJcbiAgICAgICAgYXdhaXQgaWRiLndhaXRSZXF1ZXN0KHN0b3JlLnB1dChjYm4sIGtleSkpIGFzIG51bWJlclxyXG4gICAgfVxyXG59XHJcblxyXG5tYWluKCkiXX0=