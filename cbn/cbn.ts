import * as util from "../shared/util.js"
import * as imaging from "../shared/imaging.js"

enum CameraMode {
    None,
    User,
    Environment,
}

interface Bounds {
    minX: number
    maxX: number
    minY: number
    maxY: number
}

function calcWidth(bounds: Bounds): number {
    return bounds.maxX - bounds.minX + 1
}

function calcHeight(bounds: Bounds): number {
    return bounds.maxY - bounds.minY + 1
}

function calcArea(bounds: Bounds): number {
    return calcWidth(bounds) * calcHeight(bounds)
}

function calcCenter(bounds: Bounds): [number, number] {
    return [
        bounds.minX + calcWidth(bounds) / 2,
        bounds.minY + calcHeight(bounds) / 2
    ]
}

interface Region {
    color: number
    pixels: number
    bounds: Bounds
    maxRect: Bounds
}

type RegionOverlay = (Region | null)[]

const camera = util.byId("camera") as HTMLVideoElement
let cameraMode = CameraMode.None
const canvas = util.byId("canvas") as HTMLCanvasElement
const acquireImageDiv = util.byId("acquireImage") as HTMLDivElement
const paletteDiv = util.byId("palette") as HTMLDivElement
const paletteEntryTemplate = util.byId("paletteEntry") as HTMLTemplateElement

const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
if (!ctx) {
    throwErrorMessage("Canvas element not supported")
}

const captureImageButton = util.byId("captureImageButton") as HTMLButtonElement
const loadUi = util.byId("loadUi") as HTMLDivElement
const playUi = util.byId("playUi") as HTMLDivElement

init()

async function init() {
    const fileDropBox = util.byId("fileDropBox") as HTMLDivElement
    const fileInput = util.byId("fileInput") as HTMLInputElement
    const fileButton = util.byId("fileButton") as HTMLButtonElement
    const useCameraButton = util.byId("useCameraButton") as HTMLButtonElement
    const flipCameraButton = util.byId("flipCameraButton") as HTMLButtonElement
    const stopCameraButton = util.byId("stopCameraButton") as HTMLButtonElement
    const returnButton = util.byId("returnButton") as HTMLButtonElement

    fileButton.addEventListener("click", () => {
        fileInput.click()
    })

    fileDropBox.addEventListener("dragenter", onDragEnterOver)
    fileDropBox.addEventListener("dragover", onDragEnterOver)
    fileDropBox.addEventListener("drop", onFileDrop)

    fileInput.addEventListener("change", () => {
        if (!fileInput.files?.length) {
            return
        }

        const file = fileInput.files[0]
        processFile(file)
    })

    useCameraButton.addEventListener("click", useCamera)
    flipCameraButton.addEventListener("click", flipCamera)
    stopCameraButton.addEventListener("click", stopCamera)
    captureImageButton.addEventListener("click", captureImage)
    returnButton.addEventListener("click", showLoadUi)
}

function onDragEnterOver(ev: DragEvent) {
    ev.stopPropagation()
    ev.preventDefault()
}

function onFileDrop(ev: DragEvent) {
    ev.stopPropagation()
    ev.preventDefault()

    if (!ev?.dataTransfer?.files?.length) {
        return
    }

    const file = ev.dataTransfer.files[0]
    processFile(file)
}

function processFile(file: File) {
    clearErrorMessages()
    const url = URL.createObjectURL(file)
    loadFromUrl(url)
}

function loadFromUrl(url: string) {
    clearErrorMessages()
    const img = new Image()
    img.addEventListener("load", () => {
        showPlayUi(img, img.width, img.height)
    })

    img.src = url
}

function clearErrorMessages() {
    const errorsDiv = util.byId("errors")
    util.removeAllChildren(errorsDiv)
}

function appendErrorMessage(error: string) {
    console.log(error)
    const errorsDiv = util.byId("errors");
    const div = document.createElement("div");
    div.classList.add("error-message")
    div.textContent = error
    errorsDiv.appendChild(div)
}

function throwErrorMessage(error: string) {
    appendErrorMessage(error)
    throw new Error(error)
}

async function useCamera() {
    acquireImageDiv.hidden = false
    const dialogWidth = acquireImageDiv.clientWidth
    const dialogHeight = acquireImageDiv.clientHeight
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { max: dialogWidth }, height: { max: dialogHeight }, facingMode: "user" },
        audio: false
    })

    cameraMode = CameraMode.User
    camera.srcObject = stream
    camera.addEventListener("loadedmetadata", onCameraLoad)
}

async function flipCamera() {
    if (!camera.srcObject) {
        return
    }

    const src = camera.srcObject as MediaStream
    const tracks = src.getTracks()
    for (const track of tracks) {
        track.stop()
    }

    cameraMode = cameraMode == CameraMode.User ? CameraMode.Environment : CameraMode.User
    const facingMode = cameraMode == CameraMode.User ? "user" : "environment"

    // get current facing mode
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: camera.clientWidth, height: camera.clientHeight, facingMode: facingMode },
        audio: false
    })

    camera.srcObject = stream
    camera.addEventListener("loadedmetadata", onCameraLoad)
}

function onCameraLoad() {
    console.log(camera.clientWidth, camera.clientHeight, camera.width, camera.height, camera.videoWidth, camera.videoHeight)
    acquireImageDiv.hidden = false
    camera.play()

}

function stopCamera() {
    const src = camera.srcObject as MediaStream
    if (!src) {
        return
    }

    const tracks = src.getTracks()
    for (const track of tracks) {
        track.stop()
    }

    cameraMode = CameraMode.None
    acquireImageDiv.hidden = true
}

function captureImage() {
    clearErrorMessages()

    const src = camera.srcObject as MediaStream
    if (!src) {
        return
    }

    const track = src.getVideoTracks()[0]
    if (!track) {
        return
    }

    showPlayUi(camera, camera.videoWidth, camera.videoHeight);
}

function showPlayUi(img: CanvasImageSource, width: number, height: number) {
    // maintain aspect ratio!
    const vw = document.documentElement.clientWidth
    const vh = document.documentElement.clientHeight

    if (vw < vh) {
        canvas.width = vw
        canvas.height = vw * height / width
    } else {
        canvas.height = vh
        canvas.width = vh * width / height
    }

    loadUi.hidden = true
    playUi.hidden = false

    ctx.drawImage(img, 0, 0, canvas.clientWidth, canvas.clientHeight)
    processImage()
}

function showLoadUi() {
    loadUi.hidden = false
    playUi.hidden = true
}

function processImage() {
    // get (flat) image data from canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const { width, height } = imageData

    // convert to xyz colors and palettize data
    const [palette, paletteOverlay] = palettize(imageData, 3, 8)
    imaging.applyPalette(palette, paletteOverlay, imageData)

    let [regions, regionOverlay] = createRegionOverlay(width, height, paletteOverlay)
    regions = pruneRegions(width, height, regions, regionOverlay)
    drawBorders(regionOverlay, imageData)
    fillInterior(imageData.data, regionOverlay)
    ctx.putImageData(imageData, 0, 0)
    createPaletteUi(palette)
    drawRegionLabels(ctx, regions)
}

// specialized to ignore white
function palettize(imageData: ImageData, bucketsPerComponent: number, maxColors: number): [imaging.Color[], number[]] {
    const { width, height, data } = imageData
    const pixels = width * height
    const bucketPitch = bucketsPerComponent * bucketsPerComponent
    const numBuckets = bucketPitch * bucketsPerComponent

    // creat intial buckets
    let buckets = util.generate(numBuckets, () => ({ color: [0, 0, 0] as [number, number, number], pixels: 0 }))

    // assign and update bucket for each pixel
    const bucketOverlay = util.generate(pixels, i => {
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

            const distSq = imaging.calcDistSq(bucket.color, nearest.color)
            if (distSq > .1) {
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
    const regionOverlay: RegionOverlay = util.fill(null, width * height)
    const regions: Region[] = []

    imaging.scan(width, height, (x, y, offset) => {
        if (regionOverlay[offset]) {
            return
        }

        const region: Region = {
            color: paletteOverlay[offset],
            pixels: 0,
            bounds: {
                minX: Infinity,
                maxX: -1,
                minY: Infinity,
                maxY: -1
            },
            maxRect: {
                minX: Infinity,
                maxX: -1,
                minY: Infinity,
                maxY: -1
            }
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

    calcRegionBounds(width, height, regionOverlay)
    for (const region of regionSet) {
        if (calcWidth(region.bounds) <= minRegionWidth) {
            regionSet.delete(region)
        }

        if (calcHeight(region.bounds) <= minRegionHeight) {
            regionSet.delete(region)
        }
    }

    // calculate maximal rec for each region
    for (const region of regionSet) {
        region.maxRect = calcMaxRegionRect(width, region, regionOverlay)
    }

    for (const region of regionSet) {
        if (calcWidth(region.maxRect) < minRegionWidth) {
            regionSet.delete(region)
            continue
        }

        if (calcHeight(region.maxRect) < minRegionHeight) {
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

function calcRegionBounds(width: number, height: number, regionOverlay: RegionOverlay) {
    imaging.scan(width, height, (x, y, offset) => {
        const region = regionOverlay[offset]
        if (!region) {
            return
        }

        const bounds = region.bounds
        bounds.minX = Math.min(bounds.minX, x)
        bounds.maxX = Math.max(bounds.maxX, x)
        bounds.minY = Math.min(bounds.minY, y)
        bounds.maxY = Math.max(bounds.maxY, y)
    })
}

function calcMaxRegionRect(rowPitch: number, region: Region, regionOverlay: RegionOverlay): Bounds {
    // derived from https://stackoverflow.com/questions/7245/puzzle-find-largest-rectangle-maximal-rectangle-problem
    // algorithm needs to keep track of rectangle state for every column for every region
    const { minX: x0, minY: y0, maxX: x1, maxY: y1 } = region.bounds
    const width = x1 - x0 + 1
    const height = y1 - y0 + 1
    const ls = util.fill(x0, width)
    const rs = util.fill(x0 + width, width)
    const hs = util.fill(0, width)

    let maxArea = 0
    const bounds: Bounds = {
        minX: Infinity,
        maxX: -1,
        minY: Infinity,
        maxY: -1,
    }

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
                bounds.minX = ls[i]
                bounds.maxX = rs[i]
                bounds.minY = y - hs[i]
                bounds.maxY = y
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

function createPaletteUi(palette: imaging.Color[]) {
    util.removeAllChildren(paletteDiv)
    for (let i = 0; i < palette.length; ++i) {
        const color = palette[i]
        const lum = imaging.calcLuminance(color)
        const fragment = paletteEntryTemplate.content.cloneNode(true) as DocumentFragment
        const entryDiv = util.bySelector(fragment, ".palette-entry") as HTMLElement
        entryDiv.textContent = `${i + 1}`
        entryDiv.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
        entryDiv.style.color = lum < .5 ? "white" : "black"
        paletteDiv.appendChild(fragment)
    }
}

function drawRegionLabels(ctx: CanvasRenderingContext2D, regions: Region[]) {
    ctx.font = "16px arial bold"
    const textHeight = ctx.measureText("M").width
    const font = ctx.font

    for (const region of regions) {
        if (region.color === -1) {
            continue
        }

        const label = `${region.color + 1}`
        const metrics = ctx.measureText(label)
        const center = calcCenter(region.maxRect)
        const x = center[0] - metrics.width / 2
        const y = center[1] + textHeight / 2
        ctx.fillText(label, x, y)
    }

    ctx.font = font
}