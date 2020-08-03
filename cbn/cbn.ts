import * as array from "../shared/array.js"
import * as imaging from "../shared/imaging.js"
import * as imaging2 from "../shared/imaging2.js"
import * as dom from "../shared/dom.js"
import * as geo from "../shared/geo3d.js"
import * as util from "../shared/util.js"

enum CameraMode {
    None,
    User,
    Environment,
}

interface Region {
    color: number
    pixels: number
    bounds: geo.Rect
    maxRect: geo.Rect
    filled: boolean
}

type RegionOverlay = (Region | null)[]

class Channel<T> {
    private readonly subscribers = new Set<(x: T) => void>()

    public subcribe(subscriber: (x: T) => void) {
        this.subscribers.add(subscriber)
    }

    public unsubscribe(subscriber: (x: T) => void) {
        this.subscribers.delete(subscriber)
    }

    public publish(x: T): void {
        for (const subscriber of this.subscribers) {
            subscriber(x)
        }
    }
}

interface CBNImageSource {
    width: number
    height: number
    source: HTMLVideoElement | HTMLImageElement
}

interface ProcessedImage {
    palette: imaging2.Color[]
    regions: Region[]
    regionOverlay: RegionOverlay
}

class LoadUi {
    private readonly camera = dom.byId("camera") as HTMLVideoElement
    private cameraMode = CameraMode.None
    private readonly acquireImageDiv = dom.byId("acquireImage") as HTMLDivElement
    private readonly captureImageButton = dom.byId("captureImageButton") as HTMLButtonElement
    private readonly loadUiDiv = dom.byId("loadUi") as HTMLDivElement
    private readonly fileDropBox = dom.byId("fileDropBox") as HTMLDivElement
    private readonly fileInput = dom.byId("fileInput") as HTMLInputElement
    private readonly fileButton = dom.byId("fileButton") as HTMLButtonElement
    private readonly useCameraButton = dom.byId("useCameraButton") as HTMLButtonElement
    private readonly flipCameraButton = dom.byId("flipCameraButton") as HTMLButtonElement
    private readonly stopCameraButton = dom.byId("stopCameraButton") as HTMLButtonElement
    private readonly errorsDiv = dom.byId("errors");
    public readonly imageLoaded = new Channel<CBNImageSource>()

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
    }

    public show() {
        this.loadUiDiv.hidden = false
        // this.loadFromUrl("/cbn/assets/acorn.jpg")
    }

    public hide() {
        this.loadUiDiv.hidden = true
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

        this.imageLoaded.publish({ width: this.camera.videoWidth, height: this.camera.videoHeight, source: this.camera })
        this.stopCamera()
    }

    private processFile(file: File) {
        this.clearErrorMessages()
        const url = URL.createObjectURL(file)
        this.loadFromUrl(url)
    }

    private async loadFromUrl(url: string) {
        this.clearErrorMessages()
        const img = await dom.loadImage(url)
        this.imageLoaded.publish({ width: img.width, height: img.height, source: img })
    }

    private clearErrorMessages() {
        dom.removeAllChildren(this.errorsDiv)
    }
}

class PlayUi {
    private readonly canvas = dom.byId("canvas") as HTMLCanvasElement
    private readonly scratchCanvas = new OffscreenCanvas(0, 0)
    private readonly paletteDiv = dom.byId("palette") as HTMLDivElement
    private readonly paletteEntryTemplate = dom.byId("paletteEntry") as HTMLTemplateElement
    private readonly playUiDiv = dom.byId("playUi") as HTMLDivElement
    private readonly returnButton = dom.byId("returnButton") as HTMLButtonElement
    private readonly imageCtx = this.canvas.getContext("2d") as CanvasRenderingContext2D
    private readonly scratchCtx = this.scratchCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D
    public readonly return = new Channel<void>()
    private drag = false
    private dragged = false
    private dragLast = new geo.Vec2(0, 0)
    private initialImageData: ImageData = new ImageData(1, 1)
    private processedImageData: ImageData = new ImageData(1, 1)
    private palette: imaging2.Color[] = []
    private regions: Region[] = []
    private regionOverlay: RegionOverlay = []
    private selectedPaletteIndex: number = -1
    private sequence: Region[] = []

    constructor() {
        if (!this.imageCtx) {
            throw new Error("Canvas element not supported")
        }

        if (!this.scratchCtx) {
            throw new Error("OffscreenCanvas  not supported")
        }

        this.canvas.addEventListener("click", e => this.onCanvasClick(e))
        this.canvas.addEventListener("mousedown", e => this.onCanvasMouseDown(e))
        this.canvas.addEventListener("mousemove", e => this.onCanvasMouseMove(e))
        this.canvas.addEventListener("mouseup", e => this.onCanvasMouseUp(e))
        this.canvas.addEventListener("wheel", e => this.onCanvasMouseWheel(e))
        dom.delegate(this.playUiDiv, "click", ".palette-entry", (e) => this.onPaletteEntryClick(e as MouseEvent))
        this.returnButton.addEventListener("click", () => this.onReturn())
    }

    public show(img: CBNImageSource) {
        this.playUiDiv.hidden = false
        
        // clientWidth / clientHeight are css set width / height
        // before drawing, must set canvas width / height for drawing surface pixels
        this.canvas.width = this.canvas.clientWidth
        this.canvas.height = this.canvas.clientHeight

        // fit width
        const aspect = img.width / img.height
        let width = document.body.clientWidth
        let height = width / aspect

        if (height > this.canvas.height) {
            height = this.canvas.height
            width = height * aspect
        }

        this.canvas.width = width
        this.scratchCanvas.width = this.canvas.width
        this.scratchCanvas.height = this.canvas.height
        this.scratchCtx.fillStyle = "white"
        this.scratchCtx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        this.scratchCtx.drawImage(img.source, 0, 0, width, height)

        // at this point, image should be drawn to scratch canvas
        // get (flat) image data from scratch canvas
        this.initialImageData = dom.copyImageData(this.scratchCtx.getImageData(0, 0, this.canvas.width, this.canvas.height))
        const processedImage = processImage(this.scratchCtx)
        this.processedImageData = dom.copyImageData(this.scratchCtx.getImageData(0, 0, this.scratchCtx.canvas.width, this.scratchCtx.canvas.height))
        this.palette = processedImage.palette
        this.regions = processedImage.regions
        this.regionOverlay = processedImage.regionOverlay
        this.sequence = []
        this.createPaletteUi()
        this.selectPaletteEntry(0)
        this.redraw()
    }

    public hide() {
        this.playUiDiv.hidden = true
    }

    private onReturn(): void {
        this.return.publish()
    }

    private createPaletteUi() {
        dom.removeAllChildren(this.paletteDiv)
        for (let i = 0; i < this.palette.length; ++i) {
            const color = imaging2.toCanvasColor(this.palette[i])
            const lum = imaging2.calcLuminance(color)
            const fragment = this.paletteEntryTemplate.content.cloneNode(true) as DocumentFragment
            const entryDiv = dom.bySelector(fragment, ".palette-entry") as HTMLElement
            entryDiv.textContent = `${i + 1}`
            entryDiv.style.backgroundColor = `rgb(${color.x}, ${color.y}, ${color.z})`
            entryDiv.style.color = lum < .5 ? "white" : "black"
            this.paletteDiv.appendChild(fragment)
        }
    }

    private onCanvasClick(evt: MouseEvent) {
        // don't count drag as click
        if (this.dragged) {
            this.dragged = false
            return
        }

        // transform click coordinates to scratch canvas coordinates, then determine region that was clicked on
        const { x: clickX, y: clickY } = this.imageCtx.getTransform().inverse().transformPoint({ x: evt.offsetX, y: evt.offsetY })
        const idx = clickY * this.imageCtx.canvas.width + clickX
        const region = this.regionOverlay[idx]

        // if white region or null region, do nothing
        if (!region || region.color === -1) {
            return
        }

        // if not selected region, nothing
        if (region.color != this.selectedPaletteIndex) {
            return
        }

        // fill the region
        this.fillRegion(region)
        this.sequence.push(region)

        // if all regions for this color are filled, show checkmark on palette entry, and move to next unfinished region
        if (this.regions.filter(r => r.color == region.color).every(r => r.filled)) {
            const entry = document.querySelectorAll(".palette-entry")[region.color]
            entry.innerHTML = "&check;"
            this.selectPaletteEntry(this.findNextUnfinishedRegion())
        }

        // if all regions are filled, replace with original image data
        if (this.regions.every(r => r.filled || r.color === -1)) {
            this.scratchCtx.putImageData(this.initialImageData, 0, 0)
            this.redraw()
            this.showColorAnimation()
            return
        }

        this.redraw()
    }

    private fillRegion(region: Region) {
        // fill the region
        const bounds = region.bounds
        const imageData = this.scratchCtx.getImageData(bounds.min.x, bounds.min.y, bounds.width, bounds.height)
        const data = imageData.data
        const color = imaging2.toCanvasColor(this.palette[region.color])

        imaging.scanImageData(imageData, (x, y, offset) => {
            const imageX = x + bounds.min.x
            const imageY = y + bounds.min.y
            const imageOffset = imageY * this.scratchCtx.canvas.width + imageX
            const imageRegion = this.regionOverlay[imageOffset]
            if (imageRegion !== region) {
                return
            }

            data[offset * 4] = color.x
            data[offset * 4 + 1] = color.y
            data[offset * 4 + 2] = color.z
        })

        this.scratchCtx.putImageData(imageData, bounds.min.x, bounds.min.y)
        region.filled = true
    }

    private onCanvasMouseDown(e: MouseEvent) {
        this.drag = true
        this.dragLast = new geo.Vec2(e.offsetX, e.offsetY)
    }

    private onCanvasMouseUp(_: MouseEvent) {
        this.drag = false
    }

    private onCanvasMouseMove(e: MouseEvent) {
        if (!this.drag) {
            return
        }

        const position = new geo.Vec2(e.offsetX, e.offsetY)
        const delta = position.sub(this.dragLast)

        if (Math.abs(delta.x) > 3 || Math.abs(delta.y) > 3) {
            this.imageCtx.translate(delta.x, delta.y)
            this.dragLast = position
            this.dragged = true
            this.redraw()
        }
    }

    private onCanvasMouseWheel(e: WheelEvent) {
        return
        if (e.deltaY > 0) {
            this.imageCtx.translate(-e.offsetX, -e.offsetY)
            this.imageCtx.scale(.5, .5)
        }

        if (e.deltaY < 0) {
            this.imageCtx.translate(-e.offsetX, -e.offsetY)
            this.imageCtx.scale(2, 2)
        }

        this.redraw()
    }

    private onPaletteEntryClick(e: MouseEvent) {
        const entry = e.target as Element
        const idx = dom.getElementIndex(entry)
        this.selectPaletteEntry(idx)
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

        // display a pattern on these entries (or clear checkerboard from prevous)
        this.fillColorCheckerboard(idx)
        this.redraw()
    }

    private fillColorCheckerboard(idx: number) {
        const imageData = this.scratchCtx.getImageData(0, 0, this.scratchCtx.canvas.width, this.scratchCtx.canvas.height)
        const data = imageData.data
        let n = 0

        for (let i = 0; i < this.regionOverlay.length; ++i) {
            const region = this.regionOverlay[i]

            if (!region) {
                continue
            }

            if (region.filled) {
                continue
            }

            if (region.color === -1) {
                continue
            }

            const ii = i * 4
            if (region.color === idx) {
                data[ii] = n % 3 == 0 ? 127 : 255
                data[ii + 1] = n % 3 == 0 ? 127 : 255
                data[ii + 2] = n % 3 == 0 ? 127 : 255
                data[ii + 3] = 255
                ++n
            } else {
                data[ii] = 255
                data[ii + 1] = 255
                data[ii + 2] = 255
                data[ii + 3] = 255
            }
        }

        this.scratchCtx.putImageData(imageData, 0, 0)
        drawRegionLabels(this.scratchCtx, this.regions)
    }

    private findNextUnfinishedRegion(): number {
        const regions = this.regions.filter(r => !r.filled && r.color != -1)
        if (regions.length == 0) {
            return -1
        }

        const region = regions.reduce((r1, r2) => r1.color < r2.color ? r1 : r2)
        return region.color
    }

    private redraw() {
        // clear is subject to transform - that is probably why this is busted!
        const transform = this.imageCtx.getTransform()
        this.imageCtx.resetTransform()
        this.imageCtx.clearRect(0, 0, this.imageCtx.canvas.width, this.imageCtx.canvas.height)
        this.imageCtx.setTransform(transform)
        this.imageCtx.drawImage(this.scratchCanvas, 0, 0)
    }

    private async showColorAnimation() {
        // first wait
        await util.wait(500)

        // reset image data
        this.imageCtx.resetTransform()
        this.scratchCtx.putImageData(this.processedImageData, 0, 0)
        this.redraw()

        // color as user did
        await util.wait(500)
        for (const r of this.sequence) {
            this.fillRegion(r)
            this.redraw()
            await util.wait(200)
        }

        this.scratchCtx.putImageData(this.initialImageData, 0, 0)
        this.redraw()
    }
}

class CBN {
    private readonly loadUi = new LoadUi()
    private readonly playUi = new PlayUi()

    constructor() {
        this.loadUi.show()
        this.loadUi.imageLoaded.subcribe(x => this.onImageLoaded(x))
        this.playUi.return.subcribe(() => this.onReturn())
    }

    private onImageLoaded(img: CBNImageSource) {
        this.loadUi.hide()
        this.playUi.show(img)
    }

    private onReturn() {
        this.playUi.hide()
        this.loadUi.show();
    }
}

function processImage(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): ProcessedImage {
    // at this point, image should be drawn to scratch canvas
    // get (flat) image data from scratch canvas
    const img = imaging2.fromCanvasImageData(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height))
    imaging2.palettizeHistogram(img, 8, 128)

    // note - unique colors maps colors to integers and back again
    // this results in slightly different colors than the histogram calculated colors
    // pack / unpack to make these equal
    let palette = imaging2.uniqueColors(img)
    for (const color of img) {
        color.set(imaging2.unpackColor(imaging2.packColor(color)))
    }

    palette = palette.filter(c => c.x < .9 && c.y < .9 && c.z < .9)
    const paletteOverlay = imaging2.indexByColor(img, palette)

    let [regions, regionOverlay] = createRegionOverlay(img.width, img.height, paletteOverlay)
    regions = pruneRegions(img.width, img.height, regions, regionOverlay)

    // some pallette entries will now be unused by regions, remove these
    palette = removeUnusedPaletteEntries(palette, regions)

    drawBorders(regionOverlay, img)
    fillInterior(regionOverlay, img)
    ctx.fillStyle = "black"
    ctx.putImageData(imaging2.toCanvasImageData(img), 0, 0)
    drawRegionLabels(ctx, regions)

    return {
        palette: palette,
        regions: regions,
        regionOverlay: regionOverlay
    }
}

function createRegionOverlay(width: number, height: number, paletteOverlay: number[]): [Region[], RegionOverlay] {
    const regionOverlay: RegionOverlay = array.uniform(null, width * height)
    const regions: Region[] = []

    imaging.scan(width, height, (x, y, offset) => {
        if (regionOverlay[offset]) {
            return
        }

        const region: Region = {
            color: paletteOverlay[offset],
            pixels: 0,
            bounds: geo.Rect.empty(),
            maxRect: geo.Rect.empty(),
            filled: false
        }

        regionOverlay[offset] = region
        regions.push(region)
        exploreRegion(width, height, paletteOverlay, x, y, regionOverlay)
    })

    return [regions, regionOverlay]
}

function pruneRegions(width: number, height: number, regions: Region[], regionOverlay: RegionOverlay): Region[] {
    const regionSet = new Set(regions)
    const minRegionWidth = 10
    const minRegionHeight = 10
    const minRegionPixels = minRegionWidth * minRegionHeight

    for (const region of regions) {
        if (region.pixels <= minRegionPixels) {
            regionSet.delete(region)
        }
    }

    calcRegionBounds(width, height, regions, regionOverlay)
    for (const region of regionSet) {
        if (region.bounds.width <= minRegionWidth) {
            regionSet.delete(region)
        }

        if (region.bounds.height <= minRegionHeight) {
            regionSet.delete(region)
        }
    }

    // calculate maximal rec for each region
    for (const region of regionSet) {
        region.maxRect = calcMaxRegionRect(width, region, regionOverlay)
    }

    for (const region of regionSet) {
        if (region.maxRect.width < minRegionWidth) {
            regionSet.delete(region)
            continue
        }

        if (region.maxRect.height < minRegionHeight) {
            regionSet.delete(region)
            continue
        }
    }

    // update the overlay
    for (let i = 0; i < regionOverlay.length; ++i) {
        const region = regionOverlay[i]
        if (!region) {
            continue
        }

        if (!regionSet.has(region)) {
            regionOverlay[i] = null
        }
    }

    return [...regionSet]
}

function removeUnusedPaletteEntries(palette: imaging2.Color[], regions: Region[]): imaging2.Color[] {
    // create a map from current color index to new color index
    const usedSet = new Set(regions.map(r => r.color))
    usedSet.delete(-1)
    const used = [...usedSet]
    const map = new Map<number, number>(used.map((u, i) => [u, i]))

    for (const region of regions) {
        if (region.color === -1) {
            continue
        }

        const color = map.get(region.color)
        if (typeof color === "undefined") {
            throw new Error("Color not found in map")
        }

        region.color = color
    }

    return used.map(i => palette[i])
}

function calcRegionBounds(width: number, height: number, regions: Region[], overlay: RegionOverlay) {
    imaging.scan(width, height, (x, y, offset) => {
        const region = overlay[offset]
        if (!region) {
            return
        }

        region.bounds = region.bounds.extend(new geo.Vec2(x, y))
    })

    // expand each region by 1 to include right / bottom pixels in box
    for (const region of regions) {
        if (region.bounds.max.x > region.bounds.min.x) {
            region.bounds.max.x += 1
        }

        if (region.bounds.max.y > region.bounds.min.y) {
            region.bounds.max.y += 1
        }
    }
}

function calcMaxRegionRect(rowPitch: number, region: Region, regionOverlay: RegionOverlay): geo.Rect {
    // derived from https://stackoverflow.com/questions/7245/puzzle-find-largest-rectangle-maximal-rectangle-problem
    // algorithm needs to keep track of rectangle state for every column for every region
    const { x: x0, y: y0 } = region.bounds.min
    const { x: x1, y: y1 } = region.bounds.max
    const width = x1 - x0 + 1
    const height = y1 - y0 + 1
    const ls = array.uniform(x0, width)
    const rs = array.uniform(x0 + width, width)
    const hs = array.uniform(0, width)

    let maxArea = 0
    const bounds = geo.Rect.empty()

    imaging.scanRowsRegion(y0, height, rowPitch, (y, yOffset) => {
        let l = x0
        let r = x0 + width

        // height scan
        for (let x = x0; x < x1; ++x) {
            const i = x - x0
            const offset = yOffset + x
            const isRegion = regionOverlay[offset] === region

            if (isRegion) {
                hs[i] += 1
            } else {
                hs[i] = 0
            }
        }

        // l scan
        for (let x = x0; x < x1; ++x) {
            const i = x - x0
            const offset = yOffset + x
            const isRegion = regionOverlay[offset] === region

            if (isRegion) {
                ls[i] = Math.max(ls[i], l)
            } else {
                ls[i] = 0
                l = x + 1
            }
        }

        // r scan
        for (let x = x1 - 1; x >= x0; --x) {
            const i = x - x0
            const offset = yOffset + x
            const isRegion = regionOverlay[offset] === region

            if (isRegion) {
                rs[i] = Math.min(rs[i], r)
            } else {
                rs[i] = x1
                r = x
            }
        }

        // area scan
        for (let i = 0; i < width; ++i) {
            const area = hs[i] * (rs[i] - ls[i])
            if (area > maxArea) {
                maxArea = area
                bounds.min.x = ls[i]
                bounds.max.x = rs[i]
                bounds.min.y = y - hs[i]
                bounds.max.y = y
            }
        }
    })

    return bounds
}

function exploreRegion(width: number, height: number, paletteOverlay: number[], x0: number, y0: number, regionOverlay: RegionOverlay) {
    const stack: number[] = []
    const offset0 = y0 * width + x0
    const region = regionOverlay[offset0]
    if (!region) {
        return
    }

    const color = region.color

    stack.push(x0)
    stack.push(y0)

    while (stack.length > 0) {
        const y = stack.pop() as number
        const x = stack.pop() as number
        const offset = y * width + x
        regionOverlay[offset] = region
        region.pixels++

        // explore neighbors (if same color)
        const l = x - 1
        const r = x + 1
        const t = y - 1
        const b = y + 1

        if (l >= 0) {
            const offset1 = offset - 1
            const region1 = regionOverlay[offset1]
            const color1 = paletteOverlay[offset1]
            if (!region1 && color === color1) {
                stack.push(l)
                stack.push(y)
            }
        }

        if (r < width) {
            const offset1 = offset + 1
            const region1 = regionOverlay[offset1]
            const color1 = paletteOverlay[offset1]
            if (!region1 && color === color1) {
                stack.push(r)
                stack.push(y)
            }
        }

        if (t >= 0) {
            const offset1 = offset - width
            const region1 = regionOverlay[offset1]
            const color1 = paletteOverlay[offset1]
            if (!region1 && color === color1) {
                stack.push(x)
                stack.push(t)
            }
        }

        if (b < height) {
            const offset1 = offset + width
            const region1 = regionOverlay[offset1]
            const color1 = paletteOverlay[offset1]
            if (!region1 && color === color1) {
                stack.push(x)
                stack.push(b)
            }
        }
    }
}

function drawBorders(regionOverlay: RegionOverlay, img: imaging2.Image) {
    // color borders
    const { width, height } = img
    const black = new geo.Vec4(0, 0, 0, 1)

    img.scan((x, y, offset) => {
        const region = regionOverlay[offset]
        if (!region) {
            return
        }

        const l = x - 1
        const r = x + 1
        const t = y - 1
        const b = y + 1

        // edge cells are not border (for now)
        if (l < 0 || r >= width || t < 0 || b >= height) {
            return
        }

        const lRegion = regionOverlay[offset - 1]
        if (lRegion && lRegion !== region) {
            img.atf(offset).set(black)
            regionOverlay[offset] = null
        }

        const rRegion = regionOverlay[offset + 1]
        if (rRegion && rRegion !== region) {
            img.atf(offset).set(black)
            regionOverlay[offset] = null
        }

        const tRegion = regionOverlay[offset - width]
        if (tRegion && tRegion !== region) {
            img.atf(offset).set(black)
            regionOverlay[offset] = null
        }

        const bRegion = regionOverlay[offset + width]
        if (bRegion && bRegion !== region) {
            img.atf(offset).set(black)
            regionOverlay[offset] = null
        }
    })
}

function fillInterior(regionOverlay: RegionOverlay, img: imaging2.Image) {
    const white = new geo.Vec4(1, 1, 1, 1)

    for (let i = 0; i < regionOverlay.length; ++i) {
        const region = regionOverlay[i]
        if (!region) {
            continue
        }

        img.atf(i).set(white)
    }
}

function drawRegionLabels(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, regions: Region[]) {
    ctx.font = "16px arial bold"
    const textHeight = ctx.measureText("M").width
    const font = ctx.font

    for (const region of regions) {
        if (region.color === -1) {
            continue
        }

        if (region.filled) {
            continue
        }

        const label = `${region.color + 1}`
        const metrics = ctx.measureText(label)
        const center = region.maxRect.center
        const x = center.x - metrics.width / 2
        const y = center.y + textHeight / 2
        ctx.fillText(label, x, y)
    }

    ctx.font = font
}

new CBN()