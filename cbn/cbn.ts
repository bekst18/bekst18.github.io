import * as array from "../shared/array.js"
import * as iter from "../shared/iter.js"
import * as imaging from "../shared/imaging.js"
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

type CBNImageSource = HTMLVideoElement | HTMLImageElement

interface ProcessedImage {
    palette: imaging.Color[]
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
        // this.loadFromUrl("/cbn/assets/bowser.png")
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

        this.imageLoaded.publish(this.camera)
    }

    private processFile(file: File) {
        this.clearErrorMessages()
        const url = URL.createObjectURL(file)
        this.loadFromUrl(url)
    }

    private async loadFromUrl(url: string) {
        this.clearErrorMessages()
        const img = await dom.loadImage(url)
        this.imageLoaded.publish(img)
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
    private palette: imaging.Color[] = []
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

        this.scratchCtx.drawImage(img, 0, 0, width, height)

        // at this point, image should be drawn to scratch canvas
        // get (flat) image data from scratch canvas
        this.initialImageData = imaging.copyImageData(this.scratchCtx.getImageData(0, 0, this.canvas.width, this.canvas.height))
        const processedImage = processImage(this.scratchCtx)
        this.processedImageData = imaging.copyImageData(this.scratchCtx.getImageData(0, 0, this.scratchCtx.canvas.width, this.scratchCtx.canvas.height))
        this.palette = processedImage.palette
        this.regions = processedImage.regions
        this.regionOverlay = processedImage.regionOverlay
        this.sequence = []
        this.createPaletteUi()
        this.selectPaletteEntry(0)

        // // for testing purposes - fill all regions but final
        // for (const r of iter.drop(this.regions.filter(r=>r.color !== -1), 1)) {
        //     if (r.color === -1) {
        //         continue
        //     }

        //     this.sequence.push(r)
        //     this.fillRegion(r)
        // }

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
            const color = this.palette[i]
            const lum = imaging.calcLuminance(color)
            const fragment = this.paletteEntryTemplate.content.cloneNode(true) as DocumentFragment
            const entryDiv = dom.bySelector(fragment, ".palette-entry") as HTMLElement
            entryDiv.textContent = `${i + 1}`
            entryDiv.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
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
        const color = this.palette[region.color]

        imaging.scanImageData(imageData, (x, y, offset) => {
            const imageX = x + bounds.min.x
            const imageY = y + bounds.min.y
            const imageOffset = imageY * this.scratchCtx.canvas.width + imageX
            const imageRegion = this.regionOverlay[imageOffset]
            if (imageRegion !== region) {
                return
            }

            data[offset * 4] = color[0]
            data[offset * 4 + 1] = color[1]
            data[offset * 4 + 2] = color[2]
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
            console.log(r)
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
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
    const { width, height } = imageData

    // convert to xyz colors and palettize data
    let [palette, paletteOverlay] = palettize(imageData, 3, 512)
    imaging.applyPalette(palette, paletteOverlay, imageData)

    let [regions, regionOverlay] = createRegionOverlay(width, height, paletteOverlay)
    regions = pruneRegions(width, height, regions, regionOverlay)

    // some pallette entries will now be unused by regions, remove these
    palette = removeUnusedPaletteEntries(palette, regions)

    drawBorders(regionOverlay, imageData)
    fillInterior(imageData.data, regionOverlay)
    ctx.putImageData(imageData, 0, 0)

    drawRegionLabels(ctx, regions)

    return {
        palette: palette,
        regions: regions,
        regionOverlay: regionOverlay
    }
}

// specialized to ignore white
function palettize(imageData: ImageData, bucketsPerComponent: number, maxColors: number): [imaging.Color[], number[]] {
    const { width, height, data } = imageData
    const pixels = width * height
    const bucketPitch = bucketsPerComponent * bucketsPerComponent
    const numBuckets = bucketPitch * bucketsPerComponent

    // creat intial buckets
    let buckets = array.generate(numBuckets, () => ({ color: [0, 0, 0] as [number, number, number], pixels: 0 }))

    // assign and update bucket for each pixel
    const bucketOverlay = array.generate(pixels, i => {
        const r = data[i * 4] / 255
        const g = data[i * 4 + 1] / 255
        const b = data[i * 4 + 2] / 255

        // ignore white
        if (r >= .95 && g >= .95 && b >= .95) {
            return null
        }

        const rb = Math.min(Math.floor(r * bucketsPerComponent), bucketsPerComponent - 1)
        const gb = Math.min(Math.floor(g * bucketsPerComponent), bucketsPerComponent - 1)
        const bb = Math.min(Math.floor(b * bucketsPerComponent), bucketsPerComponent - 1)

        const bucketIdx = rb * bucketPitch + gb * bucketsPerComponent + bb
        const bucket = buckets[bucketIdx]
        bucket.color = imaging.addXYZ([r, g, b], bucket.color)
        bucket.pixels++
        return bucket
    })

    // prune empty buckets
    buckets = buckets.filter(b => b.pixels > 0)

    // calculate bucket colors
    for (const bucket of buckets) {
        bucket.color = imaging.divXYZ(bucket.color, bucket.pixels)
    }

    // combine buckets that are very close in color after color averaging
    let bucketSet = new Set(buckets)
    while (bucketSet.size > 1) {
        // proceed for as long as buckets can be combined
        let merge = false
        for (const bucket of bucketSet) {
            // find "nearest" color
            const nearest = [...bucketSet]
                .filter(b => b != bucket)
                .reduce((b1, b2) => imaging.calcDistSq(bucket.color, b1.color) < imaging.calcDistSq(bucket.color, b2.color) ? b1 : b2)

            const dist = imaging.calcDist(bucket.color, nearest.color)
            if (dist > .1) {
                continue
            }

            // merge the buckets
            bucket.color = imaging.divXYZ(
                imaging.addXYZ(imaging.mulXYZ(bucket.color, bucket.pixels), imaging.mulXYZ(nearest.color, nearest.pixels)),
                bucket.pixels + nearest.pixels)

            bucketSet.delete(nearest)
            merge = true
        }

        if (!merge) {
            break
        }
    }

    buckets = [...bucketSet]
        .sort((b1, b2) => b2.pixels - b1.pixels)
        .slice(0, maxColors)

    // map all colors to top N buckets
    for (let i = 0; i < bucketOverlay.length; ++i) {
        // otherwise, map to new bucket
        const r = data[i * 4] / 255
        const g = data[i * 4 + 1] / 255
        const b = data[i * 4 + 2] / 255

        if (r >= .95 && g >= .95 && b >= .95) {
            bucketOverlay[i] = null
            continue
        }

        const color: [number, number, number] = [r, g, b]
        const bucket = buckets.reduce((b1, b2) => imaging.calcDistSq(b1.color, color) < imaging.calcDistSq(b2.color, color) ? b1 : b2)
        bucketOverlay[i] = bucket
    }

    // determine palette colors
    const palette = buckets.map(b => imaging.mulXYZ(b.color, 255))
    const paletteOverlay = bucketOverlay.map(b => b ? buckets.indexOf(b) : -1)
    return [palette, paletteOverlay]
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

    // prune some regions
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

function removeUnusedPaletteEntries(palette: imaging.Color[], regions: Region[]): imaging.Color[] {
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

function drawBorders(regionOverlay: RegionOverlay, imageData: ImageData) {
    // color borders
    const { width, height, data } = imageData
    imaging.scanImageData(imageData, (x, y, offset) => {
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
            data[offset * 4] = 0
            data[offset * 4 + 1] = 0
            data[offset * 4 + 2] = 0
            regionOverlay[offset] = null
        }

        const rRegion = regionOverlay[offset + 1]
        if (rRegion && rRegion !== region) {
            data[offset * 4] = 0
            data[offset * 4 + 1] = 0
            data[offset * 4 + 2] = 0
            regionOverlay[offset] = null
        }

        const tRegion = regionOverlay[offset - width]
        if (tRegion && tRegion !== region) {
            data[offset * 4] = 0
            data[offset * 4 + 1] = 0
            data[offset * 4 + 2] = 0
            regionOverlay[offset] = null
        }

        const bRegion = regionOverlay[offset + width]
        if (bRegion && bRegion !== region) {
            data[offset * 4] = 0
            data[offset * 4 + 1] = 0
            data[offset * 4 + 2] = 0
            regionOverlay[offset] = null
        }
    })
}

function fillInterior(data: Uint8ClampedArray, regionOverlay: RegionOverlay) {
    for (let i = 0; i < regionOverlay.length; ++i) {
        const region = regionOverlay[i]
        if (!region) {
            continue
        }

        data[i * 4] = 255
        data[i * 4 + 1] = 255
        data[i * 4 + 2] = 255
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