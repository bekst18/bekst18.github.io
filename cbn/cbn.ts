import * as array from "../shared/array.js"
import * as dom from "../shared/dom.js"
import * as geo from "../shared/geo3d.js"
import * as math from "../shared/math.js"
import * as util from "../shared/util.js"
import * as iter from "../shared/iter.js"

// size that each image pixel is blown up to
const cellSize = 32

// tolerance before splitting colors - higher = less colors
const colorRangeTolerance = 32

// max bg pixels before removal
const maxBackgroundPixels = 1024

// default max dimension
const defaultMaxDim = 128

// default max colors
const defaultMaxColors = 64

enum CameraMode {
    None,
    User,
    Environment,
}

type Color = [number, number, number, number]

interface CBNState {
    image: string
    sequence: number[]
}

class Channel<T extends any[]> {
    private readonly subscribers = new Set<(...args: T) => void>()

    public subcribe(subscriber: (...args: T) => void) {
        this.subscribers.add(subscriber)
    }

    public unsubscribe(subscriber: (...args: T) => void) {
        this.subscribers.delete(subscriber)
    }

    public publish(...args: T): void {
        for (const subscriber of this.subscribers) {
            subscriber(...args)
        }
    }
}

interface ImageAcquisitionUiShowOptions {
    showReturnToColorByNumber: boolean
}

class ImageAcquisitionUi {
    private readonly camera = dom.byId("camera") as HTMLVideoElement
    private cameraMode = CameraMode.None
    private readonly acquireImageDiv = dom.byId("acquireImage") as HTMLDivElement
    private readonly captureImageButton = dom.byId("captureImageButton") as HTMLButtonElement
    private readonly imageAcquisitionDiv = dom.byId("imageAcquisitionUi") as HTMLDivElement
    private readonly fileDropBox = dom.byId("fileDropBox") as HTMLDivElement
    private readonly fileInput = dom.byId("fileInput") as HTMLInputElement
    private readonly fileButton = dom.byId("fileButton") as HTMLButtonElement
    private readonly useCameraButton = dom.byId("useCameraButton") as HTMLButtonElement
    private readonly flipCameraButton = dom.byId("flipCameraButton") as HTMLButtonElement
    private readonly stopCameraButton = dom.byId("stopCameraButton") as HTMLButtonElement
    private readonly libraryButton = dom.byId("libraryButton") as HTMLButtonElement
    private readonly returnToColorByNumberButton = dom.byId("returnToColorByNumber") as HTMLButtonElement
    private readonly errorsDiv = dom.byId("errors");
    public readonly imageAcquired = new Channel<[HTMLCanvasElement]>()
    public readonly returnToColorByNumber = new Channel<[]>()
    private readonly libraryUi = new LibraryUi()
    private readonly canvas = document.createElement("canvas")
    private readonly ctx = this.canvas.getContext("2d")!

    constructor() {
        this.fileButton.addEventListener("click", () => {
            this.fileInput.click()
        })

        this.fileDropBox.addEventListener("dragenter", (e) => this.onDragEnterOver(e))
        this.fileDropBox.addEventListener("dragover", (e) => this.onDragEnterOver(e))
        this.fileDropBox.addEventListener("drop", (e) => this.onFileDrop(e))
        this.fileInput.addEventListener("change", () => this.onFileChange())
        this.useCameraButton.addEventListener("click", () => this.useCamera())
        this.flipCameraButton.addEventListener("click", () => this.flipCamera())
        this.stopCameraButton.addEventListener("click", () => this.stopCamera())
        this.captureImageButton.addEventListener("click", () => this.captureImage())
        this.camera.addEventListener("loadedmetadata", () => this.onCameraLoad())
        this.libraryButton.addEventListener("click", () => this.showLibrary())
        this.returnToColorByNumberButton.addEventListener("click", () => this.returnToColorByNumber.publish())

        this.libraryUi.cancel.subcribe(() => {
            this.imageAcquisitionDiv.hidden = false
        })
    }

    public show(options: ImageAcquisitionUiShowOptions) {
        this.imageAcquisitionDiv.hidden = false
        this.returnToColorByNumberButton.hidden = !options.showReturnToColorByNumber
        this.canvas.width = this.canvas.clientWidth
        this.canvas.height = this.canvas.clientHeight
        // this.loadFromUrl("/cbn/assets/larryKoopa.jpg")
        // this.loadFromUrl("/cbn/assets/olts_flower.jpg")
    }

    public hide() {
        this.imageAcquisitionDiv.hidden = true
    }

    private onDragEnterOver(ev: DragEvent) {
        ev.stopPropagation()
        ev.preventDefault()
    }

    private onFileChange() {
        if (!this.fileInput.files?.length) {
            return
        }

        const file = this.fileInput.files[0]
        this.processFile(file)
    }

    private onFileDrop(ev: DragEvent) {
        ev.stopPropagation()
        ev.preventDefault()

        if (!ev?.dataTransfer?.files?.length) {
            return
        }

        const file = ev.dataTransfer.files[0]
        this.processFile(file)
    }

    private async useCamera() {
        this.acquireImageDiv.hidden = false
        const dialogWidth = this.acquireImageDiv.clientWidth
        const dialogHeight = this.acquireImageDiv.clientHeight
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { max: dialogWidth }, height: { max: dialogHeight }, facingMode: "user" },
            audio: false
        })

        this.cameraMode = CameraMode.User
        this.camera.srcObject = stream
    }

    private async flipCamera() {
        if (!this.camera.srcObject) {
            return
        }

        const src = this.camera.srcObject as MediaStream
        const tracks = src.getTracks()
        for (const track of tracks) {
            track.stop()
        }

        this.cameraMode = this.cameraMode == CameraMode.User ? CameraMode.Environment : CameraMode.User
        const facingMode = this.cameraMode == CameraMode.User ? "user" : "environment"

        // get current facing mode
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: this.camera.clientWidth, height: this.camera.clientHeight, facingMode: facingMode },
            audio: false
        })

        this.camera.srcObject = stream
    }

    private onCameraLoad() {
        this.acquireImageDiv.hidden = false
        this.camera.play()
    }

    private stopCamera() {
        const src = this.camera.srcObject as MediaStream
        if (!src) {
            return
        }

        const tracks = src.getTracks()
        for (const track of tracks) {
            track.stop()
        }

        this.cameraMode = CameraMode.None
        this.acquireImageDiv.hidden = true
    }

    private captureImage() {
        this.clearErrorMessages()

        const src = this.camera.srcObject as MediaStream
        if (!src) {
            return
        }

        const track = src.getVideoTracks()[0]
        if (!track) {
            return
        }

        this.ctx.canvas.width = this.camera.videoWidth
        this.ctx.canvas.height = this.camera.videoHeight
        this.ctx.drawImage(this.camera, 0, 0)
        this.imageAcquired.publish(this.canvas)
        this.stopCamera()
    }

    private showLibrary() {
        this.imageAcquisitionDiv.hidden = true
        this.libraryUi.show()
    }

    private processFile(file: File) {
        this.clearErrorMessages()
        const url = URL.createObjectURL(file)
        this.loadFromUrl(url)
    }

    private async loadFromUrl(url: string) {
        this.clearErrorMessages()
        const img = await dom.loadImage(url)
        this.canvas.width = img.width
        this.canvas.height = img.height
        this.ctx.drawImage(img, 0, 0)
        this.imageAcquired.publish(this.canvas)
    }

    private clearErrorMessages() {
        dom.removeAllChildren(this.errorsDiv)
    }
}

class ImageSizeUi {
    private readonly imageSizeDiv = dom.byId("imageSizeUi") as HTMLDivElement
    private readonly maxDimInput = dom.byId("maxDim") as HTMLInputElement
    private readonly maxColorsInput = dom.byId("maxColors") as HTMLInputElement
    private readonly createColorByNumberButton = dom.byId("createColorByNumber") as HTMLButtonElement
    private readonly returnButton = dom.byId("imageSizeReturn") as HTMLButtonElement
    private readonly imageScaleCanvas = document.createElement("canvas")
    private readonly imageScaleCtx = this.imageScaleCanvas.getContext("2d")!
    private readonly imageSizeCanvas = dom.byId("imageSizeCanvas") as HTMLCanvasElement
    private readonly imageSizeCtx = this.imageSizeCanvas.getContext("2d")!
    private imageCanvas = document.createElement("canvas")
    public readonly createCBN = new Channel<[HTMLCanvasElement]>()
    public readonly return = new Channel<[]>()

    constructor() {
        this.createColorByNumberButton.addEventListener("click", () => this.onCreateColorByNumber())
        this.returnButton.addEventListener("click", () => this.onReturnClick())
    }

    public show(imageCanvas: HTMLCanvasElement) {
        this.imageSizeDiv.hidden = false
        this.imageCanvas = imageCanvas
        this.maxDimInput.addEventListener("change", () => this.onMaxDimChange())
        this.maxColorsInput.addEventListener("change", () => this.onMaxColorsChange())
        this.redraw()
    }

    public hide() {
        this.imageSizeDiv.hidden = true
    }

    private onCreateColorByNumber() {
        this.createCBN.publish(this.imageScaleCanvas)
    }

    private onReturnClick() {
        this.return.publish()
    }

    private async onMaxDimChange() {
        await showLoadingIndicator()
        this.redraw()
        hideLoadingIndicator()
    }

    private async onMaxColorsChange() {
        await showLoadingIndicator()
        this.redraw()
        hideLoadingIndicator()
    }

    private redraw() {
        this.imageSizeCanvas.width = this.imageSizeCanvas.clientWidth
        this.imageSizeCanvas.height = this.imageSizeCanvas.clientHeight

        const maxDim = this.getMaxDim()
        const maxColors = this.getMaxColors()
        const [w, h] = fit(this.imageCanvas.width, this.imageCanvas.height, maxDim)

        this.imageScaleCanvas.width = w
        this.imageScaleCanvas.height = h
        this.imageScaleCtx.drawImage(this.imageCanvas, 0, 0, w, h)
        quantMedianCut(this.imageScaleCtx, maxColors)
        const minScale = Math.min(this.imageSizeCanvas.clientWidth / w, this.imageSizeCanvas.clientHeight / h)
        const sw = w * minScale
        const sh = h * minScale
        const x = (this.imageSizeCanvas.width - sw) / 2
        const y = (this.imageSizeCanvas.height - sh) / 2
        this.imageSizeCtx.drawImage(this.imageScaleCanvas, x, y, sw, sh)
    }

    private getMaxDim(): number {
        let maxDim = parseInt(this.maxDimInput.value)
        if (!maxDim) {
            maxDim = defaultMaxDim
            this.maxDimInput.value = maxDim.toString()
        }

        return maxDim
    }

    private getMaxColors(): number {
        let maxColors = parseInt(this.maxColorsInput.value)
        if (!maxColors) {
            maxColors = defaultMaxColors
            this.maxColorsInput.value = maxColors.toString()
        }

        return maxColors
    }
}

class LibraryUi {
    private readonly libraryDiv = dom.byId("libraryUi")
    private readonly returnButton = dom.byId("returnFromLibraryButton")
    public readonly imageChosen = new Channel<[string]>()
    public readonly cancel = new Channel<[]>();

    constructor() {
        this.returnButton.addEventListener("click", () => this.onReturnClick())
    }

    show() {
        this.libraryDiv.hidden = false
    }

    private onReturnClick() {
        this.libraryDiv.hidden = true
        this.cancel.publish()
    }
}

class PlayUi {
    private readonly canvas = dom.byId("canvas") as HTMLCanvasElement
    private readonly ctx = this.canvas.getContext("2d")!
    private readonly paletteDiv = dom.byId("palette") as HTMLDivElement
    private readonly paletteEntryTemplate = dom.byId("paletteEntry") as HTMLTemplateElement
    private readonly playUiDiv = dom.byId("playUi") as HTMLDivElement
    private readonly returnButton = dom.byId("returnButton") as HTMLButtonElement
    private readonly imageCanvas = document.createElement("canvas")
    private readonly imageCtx = this.imageCanvas.getContext("2d")!
    private readonly cellCanvas = document.createElement("canvas")
    private readonly cellCtx = this.cellCanvas.getContext("2d")!
    private readonly paletteCanvas = document.createElement("canvas")
    private readonly paletteCtx = this.paletteCanvas.getContext("2d")!
    private readonly colorCanvas = document.createElement("canvas")
    private readonly colorCtx = this.colorCanvas.getContext("2d")!
    private complete = false
    public readonly return = new Channel<[void]>()
    private imageWidth = 0
    private imageHeight = 0
    private centerX = 0
    private centerY = 0
    private zoom = 1
    private drag = false
    private colorDrag = false
    private touchZoom: number = 0
    private touch1Start: geo.Vec2 | null = null
    private touch2Start: geo.Vec2 | null = null
    private touch1Cur: geo.Vec2 | null = null
    private touch2Cur: geo.Vec2 | null = null
    private dragLast = new geo.Vec2(0, 0)

    // list of colors use used in image
    private palette: number[] = []

    // image overlay of pixel to palette index
    private paletteOverlay: number[] = []

    // palette overlay of palette index to list of pixels having that color
    private pixelOverlay: Set<number>[] = []

    private selectedPaletteIndex: number = -1
    private sequence: number[] = []

    constructor() {
        if (!this.ctx) {
            throw new Error("Canvas element not supported")
        }

        this.canvas.addEventListener("pointerdown", e => this.onPointerDown(e))
        this.canvas.addEventListener("pointermove", e => this.onPointerMove(e))
        this.canvas.addEventListener("pointerup", e => this.onPointerUp(e))
        this.canvas.addEventListener("wheel", e => this.onWheel(e))
        window.addEventListener("resize", e => this.onResize(e))
        dom.delegate(this.playUiDiv, "click", ".palette-entry", (e) => this.onPaletteEntryClick(e as MouseEvent))
        this.returnButton.addEventListener("click", () => this.onReturn())
    }

    public create(img: HTMLCanvasElement, sequence: number[]) {
        this.playUiDiv.hidden = false
        this.canvas.width = this.canvas.clientWidth
        this.canvas.height = this.canvas.clientHeight

        this.complete = false
        this.zoom = 1
        this.drag = false
        this.touchZoom = 0
        this.imageWidth = img.width
        this.imageHeight = img.height

        // capture image
        this.imageCanvas.width = this.imageWidth
        this.imageCanvas.height = this.imageHeight
        this.imageCtx.drawImage(img, 0, 0, this.imageCanvas.width, this.imageCanvas.height)

        // debug - show passed image
        // this.canvas.width = this.imageWidth
        // this.canvas.height = this.imageHeight
        // this.ctx.drawImage(this.imageCanvas, 0, 0, this.canvas.width, this.canvas.height)
        // return

        const imgData = this.imageCtx.getImageData(0, 0, this.imageWidth, this.imageHeight)
        this.palette = extractPalette(imgData)
        this.paletteOverlay = createPaletteOverlay(imgData, this.palette)
        this.pixelOverlay = createPixelOverlay(this.imageWidth, this.imageHeight, this.palette, this.paletteOverlay)
        this.palette = prunePallete(this.palette, this.pixelOverlay, maxBackgroundPixels, this.imageWidth, this.imageHeight, this.colorCtx)
        this.paletteOverlay = createPaletteOverlay(imgData, this.palette)
        this.pixelOverlay = createPixelOverlay(this.imageWidth, this.imageHeight, this.palette, this.paletteOverlay)
        this.createPaletteUi()
        drawCellImage(this.cellCtx, this.imageWidth, this.imageHeight, this.paletteOverlay)
        this.paletteCanvas.width = this.cellCanvas.width
        this.paletteCanvas.height = this.cellCanvas.height
        this.centerX = this.canvas.width / 2
        this.centerY = this.canvas.height / 2
        this.redraw()

        if (this.palette) {
            this.selectPaletteEntry(0)
        }

        this.sequence = sequence
        for (const xy of sequence) {
            const paletteIdx = this.paletteOverlay[xy]
            const [x, y] = unflat(xy, this.imageWidth)
            this.selectPaletteEntry(paletteIdx)
            this.tryFillCell(x, y)
        }

        this.saveState()

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

    public async restore(state: CBNState) {
        const image = await dom.loadImage(state.image)
        const canvas = document.createElement("canvas")
        canvas.width = image.width
        canvas.height = image.height

        const ctx = canvas.getContext("2d")!
        ctx.drawImage(image, 0, 0)
        this.create(canvas, state.sequence)
    }

    public show() {
        this.playUiDiv.hidden = false
    }

    public hide() {
        this.playUiDiv.hidden = true
    }

    private onReturn(): void {
        this.return.publish()
    }

    private onResize(_: UIEvent) {
        this.canvas.width = this.canvas.clientWidth
        this.canvas.height = this.canvas.clientHeight
        this.redraw()
    }

    private createPaletteUi() {
        dom.removeAllChildren(this.paletteDiv)
        for (let i = 0; i < this.palette.length; ++i) {
            const [r, g, b] = unpackColor(this.palette[i])
            const lum = calcLuminance(r, g, b)
            const fragment = this.paletteEntryTemplate.content.cloneNode(true) as DocumentFragment
            const entryDiv = dom.bySelector(fragment, ".palette-entry") as HTMLElement
            entryDiv.textContent = `${i + 1}`
            entryDiv.style.backgroundColor = color2RGBAStyle(r, g, b)
            entryDiv.style.color = lum < .5 ? "white" : "black"
            this.paletteDiv.appendChild(fragment)
        }
    }

    private onPointerDown(e: PointerEvent) {
        if (this.complete) {
            return
        }

        if (!e.isPrimary) {
            this.touch2Start = new geo.Vec2(e.offsetX, e.offsetY)
            this.touchZoom = this.zoom
            return
        }

        // are we overtop of a selected palette entry pixel?
        this.canvas.setPointerCapture(e.pointerId)
        this.drag = true
        this.dragLast = new geo.Vec2(e.offsetX, e.offsetY)
        this.touch1Start = new geo.Vec2(e.offsetX, e.offsetY)
        this.touchZoom = this.zoom

        // transform click coordinates to canvas coordinates
        const [x, y] = this.canvas2Cell(e.offsetX, e.offsetY)
        if (this.tryFillCell(x, y)) {
            this.colorDrag = true
        }
    }

    /**
     * convert a canvas coordinate into a cell coordinate
     * @param x x canvas coordinate
     * @param y y canvas coordinate
     */
    private canvas2Cell(x: number, y: number): [number, number] {
        const invTransform = this.ctx.getTransform().inverse()
        const domPt = invTransform.transformPoint({ x: x, y: y })
        return cell2Image(domPt.x, domPt.y)
    }

    private onPointerUp(e: PointerEvent) {
        if (!e.isPrimary) {
            this.touch2Start = null
            return
        }

        if (this.complete) {
            return
        }

        this.touch1Start = null
        this.drag = false
        this.colorDrag = false
        this.touchZoom = this.zoom
        this.saveState()
    }

    private saveState() {
        saveCBNState({ image: this.imageCanvas.toDataURL(), sequence: this.sequence })
    }

    private onPointerMove(e: PointerEvent) {
        if (this.complete) {
            return
        }

        if (e.isPrimary) {
            this.touch1Cur = new geo.Vec2(e.offsetX, e.offsetY)
        } else {
            this.touch2Cur = new geo.Vec2(e.offsetX, e.offsetY)
        }

        // handle pinch zoom
        if (this.touch2Start && this.touch1Start) {
            this.touch1Cur = this.touch1Cur ?? this.touch1Start
            this.touch2Cur = this.touch2Cur ?? this.touch2Start
            const d0 = this.touch1Start.sub(this.touch2Start).length()
            const d1 = this.touch1Cur.sub(this.touch2Cur).length()
            this.zoom = this.touchZoom * d1 / d0
            this.redraw()
            return
        }

        if (!this.drag) {
            return
        }

        const transform = this.ctx.getTransform().inverse()
        const start = geo.Vec2.fromDOM(transform.transformPoint(this.dragLast))
        const position = new geo.Vec2(e.offsetX, e.offsetY)
        const end = geo.Vec2.fromDOM(transform.transformPoint(position))
        const delta = end.sub(start)

        // check for drag over palette color
        const [x, y] = this.canvas2Cell(e.offsetX, e.offsetY)
        if (this.colorDrag && this.paletteOverlay[flat(x, y, this.imageWidth)] === this.selectedPaletteIndex) {
            if (this.tryFillCell(x, y)) {
                this.redraw()
            }

            return
        }

        if (Math.abs(delta.x) > 3 || Math.abs(delta.y) > 3) {
            this.centerX -= delta.x
            this.centerY -= delta.y
            this.dragLast = position
            this.redraw()
        }
    }

    private onWheel(e: WheelEvent) {
        if (this.complete) {
            return
        }

        if (e.deltaY > 0) {
            this.zoom *= .5
        }

        if (e.deltaY < 0) {
            this.zoom *= 2
        }

        this.redraw()
    }

    private onPaletteEntryClick(e: MouseEvent) {
        if (this.complete) {
            return
        }

        const entry = e.target as Element
        let idx = dom.getElementIndex(entry)

        if (idx === this.selectedPaletteIndex) {
            idx = -1
        }

        this.selectPaletteEntry(idx)
    }

    /**
     * true if specified cell is unfilled, and has specified palette index
     * @param x x cell coordinate
     * @param y y cell coordinate
     */
    private checkCell(x: number, y: number): boolean {
        // if already filled, do nothing
        const flatXY = flat(x, y, this.imageWidth)
        const pixels = this.pixelOverlay[this.selectedPaletteIndex]
        return pixels.has(flatXY)
    }

    /**
     * attempt to fill the specified cell
     * returns true if filled, false if cell is not selected palette or already filled
     * @param x 
     * @param y 
     */
    private tryFillCell(x: number, y: number): boolean {
        // if already filled, do nothing
        if (!this.checkCell(x, y)) {
            return false
        }

        const [r, g, b] = unpackColor(this.palette[this.selectedPaletteIndex])
        const [cx, cy] = image2Cell(x, y)
        this.colorCtx.fillStyle = color2RGBAStyle(r, g, b)
        this.colorCtx.fillRect(cx, cy, cellSize, cellSize)

        // remove the pixel from overlay
        const pixels = this.pixelOverlay[this.selectedPaletteIndex]
        const flatXY = flat(x, y, this.imageWidth)
        pixels.delete(flatXY)
        this.sequence.push(flatXY)

        if (pixels.size > 0) {
            this.redraw()
            return true
        }

        // mark palette entry as done
        const entry = document.querySelectorAll(".palette-entry")[this.selectedPaletteIndex]
        entry.innerHTML = "&check;"
        const nextPaletteIdx = this.findNextUnfinishedEntry(this.selectedPaletteIndex)
        this.selectPaletteEntry(nextPaletteIdx)

        if (nextPaletteIdx !== -1) {
            return true
        }

        // all colors complete! show animation of user coloring original image
        this.execDoneSequence()
        return true
    }

    private selectPaletteEntry(idx: number) {
        this.selectedPaletteIndex = idx

        const entries = Array.from(document.querySelectorAll(".palette-entry"))
        for (const entry of entries) {
            entry.classList.remove("selected")
        }

        if (idx !== -1) {
            entries[idx].classList.add("selected")
        }

        // clear palette canvas
        const ctx = this.paletteCtx
        const canvas = this.paletteCanvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (idx === -1) {
            this.redraw()
            return
        }

        // highlight remaining pixels for this color
        const font = ctx.font
        ctx.font = "bold 16px arial"
        const textHeight = ctx.measureText("M").width
        const cdxy = cellSize / 2

        for (const pixel of this.pixelOverlay[idx]) {
            const [x, y] = image2Cell(...unflat(pixel, this.imageWidth))
            ctx.fillStyle = color2RGBAStyle(191, 191, 191, 255)
            ctx.fillRect(x, y, cellSize, cellSize)

            // draw label
            const label = `${idx + 1}`
            const metrics = ctx.measureText(label)
            const cx = x + cdxy - metrics.width / 2
            const cy = y + cdxy + textHeight / 2
            ctx.fillStyle = "black"
            ctx.fillText(label, cx, cy)
        }

        ctx.font = font
        this.redraw()
    }

    private redraw() {
        // note - clear is subject to transform
        const ctx = this.ctx
        this.ctx.resetTransform()
        const hw = this.canvas.width / 2 / this.zoom
        const hh = this.canvas.height / 2 / this.zoom

        this.centerX = math.clamp(this.centerX, 0, this.cellCanvas.width)
        this.centerY = math.clamp(this.centerY, 0, this.cellCanvas.height)
        this.ctx.scale(this.zoom, this.zoom)
        this.ctx.translate(-this.centerX + hw, -this.centerY + hh)

        var invTransform = ctx.getTransform().inverse()
        const tl = invTransform.transformPoint({ x: 0, y: 0 })
        const br = invTransform.transformPoint({ x: this.canvas.width, y: this.canvas.height })
        ctx.clearRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y)
        ctx.drawImage(this.cellCanvas, 0, 0)
        ctx.drawImage(this.paletteCanvas, 0, 0)
        ctx.drawImage(this.colorCanvas, 0, 0)
    }

    private findNextUnfinishedEntry(i: number): number {
        for (i = 0; i < this.palette.length; ++i) {
            const ii = i % this.palette.length
            if (this.pixelOverlay[i].size > 0) {
                return ii
            }
        }

        return -1
    }

    private async execDoneSequence() {
        // set as done
        this.complete = true

        this.ctx.resetTransform()

        // draw one pixel at a time to color canvas
        // ovrlay onto canvas
        const data = this.imageCtx.getImageData(0, 0, this.imageWidth, this.imageHeight).data
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        const zoom = Math.min(this.canvas.clientWidth / this.imageWidth, this.canvas.clientHeight / this.imageHeight)
        this.ctx.scale(zoom, zoom)

        // color as user did
        const pixel = new ImageData(1, 1)
        const pixelData = pixel.data
        this.colorCtx.canvas.width = this.imageWidth
        this.colorCtx.canvas.height = this.imageHeight
        this.colorCtx.clearRect(0, 0, this.colorCanvas.width, this.colorCanvas.height)

        for (let i = 0; i < this.sequence.length; ++i) {
            const xy = this.sequence[i]
            const [x, y] = unflat(xy, this.imageWidth)
            const offset = xy * 4
            pixelData[0] = data[offset]
            pixelData[1] = data[offset + 1]
            pixelData[2] = data[offset + 2]
            pixelData[3] = 255

            this.colorCtx.putImageData(pixel, x, y)
            this.ctx.drawImage(this.colorCanvas, 0, 0)
            if (i % 64 == 0) {
                await util.wait(0)
            }
        }
    }
}

class CBN {
    private readonly acquireUi = new ImageAcquisitionUi()
    private readonly sizeUi = new ImageSizeUi()
    private readonly playUi = new PlayUi()
    private cbnCreated = false

    constructor() {
        this.acquireUi.imageAcquired.subcribe(img => this.onImageAcquired(img))
        this.acquireUi.returnToColorByNumber.subcribe(() => this.onReturnToCBN())
        this.sizeUi.createCBN.subcribe((img: HTMLCanvasElement) => this.onCreateCBN(img))
        this.sizeUi.return.subcribe(() => this.onReturnToAcquire())
        this.playUi.return.subcribe(() => this.onReturnToAcquire())
    }

    public async exec() {
        // try to restore state
        const state = loadCBNState()
        if (state.image) {
            await showLoadingIndicator()
            this.cbnCreated = true
            this.acquireUi.hide()
            this.playUi.restore(state)
            hideLoadingIndicator()
            return
        }

        this.acquireUi.show({ showReturnToColorByNumber: false })
    }

    private async onImageAcquired(img: HTMLCanvasElement) {
        await showLoadingIndicator()
        this.acquireUi.hide()
        this.sizeUi.show(img)
        hideLoadingIndicator()
    }

    private async onCreateCBN(img: HTMLCanvasElement) {
        await showLoadingIndicator()
        this.sizeUi.hide()
        this.playUi.create(img, [])
        this.cbnCreated = true
        hideLoadingIndicator()
    }

    private onReturnToAcquire() {
        this.playUi.hide()
        this.sizeUi.hide()
        this.acquireUi.show({ showReturnToColorByNumber: this.cbnCreated });
    }

    private onReturnToCBN() {
        this.acquireUi.hide()
        this.sizeUi.hide()
        this.playUi.show()
    }
}

function extractPalette(imgData: ImageData): number[] {
    const { width, height, data } = imgData
    const rowPitch = width * 4

    // find unique colors, create entry for each
    const palette = new Set<number>()
    for (let y = 0; y < height; ++y) {
        const yOffset = y * rowPitch
        for (let x = 0; x < width; ++x) {
            // pack color to a unique value
            const offset = yOffset + x * 4
            const r = data[offset]
            const g = data[offset + 1]
            const b = data[offset + 2]
            const a = data[offset + 3]
            const value = packColor(r, g, b, a)
            palette.add(value)
        }
    }

    return [...palette]
}

/**
 * create an overlay that maps each pixel to the index of its palette entry
 * @param imgData image data
 * @param palette palette colors
 */
function createPaletteOverlay(imgData: ImageData, palette: number[]): number[] {
    const { width, height, data } = imgData
    const paletteMap = array.mapIndices(palette)
    const rowPitch = width * 4
    const overlay = array.uniform(-1, width * height)

    for (let y = 0; y < height; ++y) {
        const yOffset = y * rowPitch
        for (let x = 0; x < width; ++x) {
            // pack color to a unique value
            const offset = yOffset + x * 4
            const r = data[offset]
            const g = data[offset + 1]
            const b = data[offset + 2]
            const a = data[offset + 3]
            const rgba = packColor(r, g, b, a)
            const idx = paletteMap.get(rgba) ?? -1
            overlay[y * width + x] = idx
        }
    }

    return overlay
}

/**
 * create an overlay that maps each palette entry to a list of pixels with its color
 * @param imgData 
 * @param palette 
 */
function createPixelOverlay(width: number, height: number, palette: number[], paletteOverlay: number[]): Set<number>[] {
    const overlay = array.generate(palette.length, () => new Set<number>())
    for (let y = 0; y < height; ++y) {
        const yOffset = y * width
        for (let x = 0; x < width; ++x) {
            // pack color to a unique value
            const offset = yOffset + x
            const paletteIdx = paletteOverlay[offset]
            if (paletteIdx === -1) {
                continue
            }

            const flatCoord = flat(x, y, width)
            overlay[paletteIdx].add(flatCoord)
        }
    }

    return overlay
}

function packColor(r: number, g: number, b: number, a: number): number {
    const value = r << 24 | g << 16 | b << 8 | a
    return value
}

function unpackColor(x: number): Color {
    const r = (x & 0xFF000000) >>> 24
    const g = (x & 0x00FF0000) >>> 16
    const b = (x & 0x0000FF00) >>> 8
    const a = x & 0x000000FF

    return [r, g, b, a]
}

function calcLuminance(r: number, g: number, b: number) {
    const l = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255)
    return l
}

function drawCellImage(ctx: CanvasRenderingContext2D, width: number, height: number, paletteOverlay: number[]) {
    const cellImageWidth = width * (cellSize + 1) + 1
    const cellImageHeight = height * (cellSize + 1) + 1

    // size canvas
    ctx.canvas.width = cellImageWidth
    ctx.canvas.height = cellImageHeight

    // draw horizontal grid lines
    for (let i = 0; i <= height; ++i) {
        ctx.strokeRect(0, i * (cellSize + 1), cellImageWidth, 1)
    }

    // draw vertical grid lines
    for (let i = 0; i <= width; ++i) {
        ctx.strokeRect(i * (cellSize + 1), 0, 1, cellImageHeight)
    }

    // draw #s
    const font = ctx.font
    ctx.font = "16px arial"
    const textHeight = ctx.measureText("M").width
    const cdxy = cellSize / 2

    for (let y = 0; y < height; ++y) {
        const yOffset = y * width
        for (let x = 0; x < width; ++x) {
            const offset = yOffset + x
            const paletteIdx = paletteOverlay[offset]
            const label = `${paletteIdx + 1}`
            const metrics = ctx.measureText(label)
            const cx = x * (cellSize + 1) + cdxy + 1 - metrics.width / 2
            const cy = y * (cellSize + 1) + cdxy + 1 + textHeight / 2
            ctx.fillText(label, cx, cy)
        }
    }

    ctx.font = font
}

function fit(width: number, height: number, maxSize: number): [number, number] {
    if (width > height && width > maxSize) {
        height = maxSize * height / width
        return [Math.floor(maxSize), Math.floor(height)]
    }

    if (height > width && height > maxSize) {
        width = maxSize * width / height
        return [Math.floor(width), Math.floor(maxSize)]
    }

    return [Math.floor(width), Math.floor(height)]
}

function flat(x: number, y: number, rowPitch: number) {
    return y * rowPitch + x
}

function unflat(i: number, rowPitch: number): [number, number] {
    return [i % rowPitch, Math.floor(i / rowPitch)]
}

/**
   * Convert an image x or y coordinate to top or left of cbn cell containing that pixel
   * @param coord x or y coordinate
   */
function image2CellCoord(coord: number): number {
    return coord * (cellSize + 1) + 1
}

/**
 * Convert a cbn x or y coordinate to top or left of cbn cell containing that pixel
 * @param coord x or y coordinate
 */
function cell2ImageCoord(coord: number): number {
    return Math.floor((coord - 1) / (cellSize + 1))
}

/**
   * Convert an image x or y coordinate to top or left of cbn cell containing that pixel
   * @param coord x or y coordinate
   */
function image2Cell(x: number, y: number): [number, number] {
    return [image2CellCoord(x), image2CellCoord(y)]
}

/**
 * Convert a cbn x or y coordinate to top or left of cbn cell containing that pixel
 * @param coord x or y coordinate
 */
function cell2Image(x: number, y: number): [number, number] {
    return [cell2ImageCoord(x), cell2ImageCoord(y)]
}

/**
 * convert rgba coordinates to a style string
 * @param r red
 * @param g green
 * @param b blue
 * @param a alpha
 */
function color2RGBAStyle(r: number, g: number, b: number, a: number = 255) {
    return `rgba(${r}, ${g}, ${b}, ${a / 255})`
}

function quantMedianCut(ctx: CanvasRenderingContext2D, maxColors: number) {
    interface Pixel {
        offset: number
        r: number
        g: number
        b: number
    }

    // maxColors must be a power of 2 for this algorithm
    maxColors = math.nextPow2(maxColors)
    const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
    const { width, height, data } = imgData
    const rowPitch = width * 4

    const buckets = new Array<Pixel[]>()
    buckets.push(createInitialBucket())

    while (true) {
        const bucket = chooseBucket(colorRangeTolerance, buckets)
        if (!bucket) {
            break
        }

        buckets.push(splitBucket(bucket))
        if (buckets.length >= maxColors) {
            break
        }
    }

    // calculate the average color for each bucket
    const colors = new Array<[number, number, number]>()
    for (const bucket of buckets) {
        let r = 0
        let g = 0
        let b = 0

        for (const pixel of bucket) {
            r += pixel.r
            g += pixel.g
            b += pixel.b
        }

        r /= bucket.length
        g /= bucket.length
        b /= bucket.length

        colors.push([Math.round(r), Math.round(g), Math.round(b)])
    }

    // iterate through each bucket, replacing pixel color with bucket color for each pixel
    for (let i = 0; i < buckets.length; ++i) {
        const bucket = buckets[i]
        const [r, g, b] = colors[i]

        for (const pixel of bucket) {
            const offset = pixel.offset * 4
            data[offset] = r
            data[offset + 1] = g
            data[offset + 2] = b
        }
    }

    ctx.putImageData(imgData, 0, 0)

    function createInitialBucket(): Pixel[] {
        // create initial bucket
        const bucket = new Array<Pixel>()
        for (let y = 0; y < height; ++y) {
            const yOffset = y * rowPitch
            for (let x = 0; x < width; ++x) {
                const offset = yOffset + x * 4
                const r = data[offset]
                const g = data[offset + 1]
                const b = data[offset + 2]

                // pack into bucket
                const pixel: Pixel = {
                    offset: flat(x, y, width),
                    r: r,
                    g: g,
                    b: b
                }

                bucket.push(pixel)
            }
        }

        return bucket
    }

    function calcRange(pixels: Pixel[], selector: (x: Pixel) => number): number {
        let min = Infinity
        let max = -Infinity

        for (const pixel of pixels) {
            min = Math.min(selector(pixel), min)
            max = Math.max(selector(pixel), max)
        }

        return max - min
    }

    function chooseBucket(tolerance: number, buckets: Pixel[][]): Pixel[] | null {
        let maxRange = -Infinity
        let maxBucket: Pixel[] | null = null

        for (const bucket of buckets) {
            const rangeR = calcRange(bucket, p => p.r)
            const rangeG = calcRange(bucket, p => p.g)
            const rangeB = calcRange(bucket, p => p.b)
            let range = 0
            if (rangeR > rangeG && rangeR > rangeB) {
                range = rangeR
            } else if (rangeG > rangeR) {
                range = rangeG
            } else {
                range = rangeB
            }

            if (range > maxRange) {
                maxRange = range
                maxBucket = bucket
            }
        }

        return maxRange > tolerance ? maxBucket : null
    }

    function splitBucket(bucket: Pixel[]): Pixel[] {
        const rangeR = calcRange(bucket, p => p.r)
        const rangeG = calcRange(bucket, p => p.g)
        const rangeB = calcRange(bucket, p => p.b)

        if (rangeR > rangeG && rangeR > rangeB) {
            bucket.sort((a, b) => a.r - b.r)
        } else if (rangeG > rangeR) {
            bucket.sort((a, b) => a.g - b.g)
        } else {
            bucket.sort((a, b) => a.b - b.b)
        }

        const middle = Math.floor(bucket.length / 2)
        const newBucket = bucket.splice(middle)
        return newBucket
    }
}

function prunePallete(palette: number[], pixelOverlay: Set<number>[], maxPixels: number, width: number, height: number, ctx: CanvasRenderingContext2D): number[] {
    const indicesToKeep = new Set<number>(array.sequence(0, palette.length))

    ctx.canvas.width = width * (cellSize + 1) + 1
    ctx.canvas.height = height * (cellSize + 1) + 1

    for (let i = 0; i < pixelOverlay.length; ++i) {
        const pixels = pixelOverlay[i]
        if (pixels.size < maxPixels) {
            continue
        }

        if (iter.all(pixels, x => !isBorderPixel(...unflat(x, width), width, height))) {
            continue
        }

        // fill these pixels in image with appropriate color
        const [r, g, b] = unpackColor(palette[i])
        for (const xy of pixels) {
            const [x, y] = unflat(xy, width)
            const [cx, cy] = image2Cell(x, y)
            ctx.fillStyle = color2RGBAStyle(r, g, b)
            ctx.fillRect(cx, cy, cellSize, cellSize)
        }

        indicesToKeep.delete(i)
    }

    const newPalette = [...indicesToKeep].map(x => palette[x])
    return newPalette
}

function isBorderPixel(x: number, y: number, width: number, height: number): boolean {
    return x === 0 || y === 0 || x === width - 1 || y === height - 1
}

function clearCBNState() {
    window.localStorage.clear()
}

function saveCBNState(state: CBNState) {
    window.localStorage.setItem("state", JSON.stringify(state))
}

function loadCBNState(): CBNState {
    const data = window.localStorage.getItem("state")
    if (!data) {
        return {
            image: "",
            sequence: []
        }
    }

    const state = JSON.parse(data)
    return state
}

async function showLoadingIndicator() {
    const div = dom.byId("loadingModal")
    div.hidden = false
    await util.wait(0)
}

function hideLoadingIndicator() {
    const div = dom.byId("loadingModal")
    div.hidden = true
}

new CBN().exec()