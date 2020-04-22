import * as util from "../shared/util.js"
import * as imaging from "../shared/imaging.js"

enum CameraMode {
    None,
    User,
    Environment,
}

interface RegionDrawInfo {
    color: number
    centroid: [number, number]
}

interface Bounds {
    minX: number
    maxX: number
    minY: number
    maxY: number
}

interface Region {
    color: number
    pixels: number
    bounds: Bounds
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

    // TODO: temporary for testing purposes - remove this
    loadFromUrl("mario.jpg")
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
    const [palette, paletteOverlay] = imaging.palettizeHistogram(imageData, 3, 8)
    // const [palette, paletteOverlay] = palettizeMedianCut(imageData, 8)
    imaging.applyPalette(palette, paletteOverlay, imageData)

    const [regions, regionOverlay] = createRegionOverlay(width, height, paletteOverlay)
    pruneRegions(width, height, regions, regionOverlay)

    drawBorders(regionOverlay, imageData)
    fillInterior(imageData.data, regionOverlay)
    ctx.putImageData(imageData, 0, 0)
    createPaletteUi(palette)

    ctx.putImageData(imageData, 0, 0)
    // drawRegionLabels(ctx, width, height, regionOverlay, paletteOverlay)
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

    for (const region of regions) {
        if (region.pixels <= 64) {
            regionSet.delete(region)
        }
    }

    regions = [...regionSet]
    calcRegionBounds(width, height, regionOverlay)

    for (const region of regions) {
        if (region.bounds.maxX - region.bounds.minX <= 16) {
            regionSet.delete(region)
        }

        if (region.bounds.maxY - region.bounds.minY <= 16) {
            regionSet.delete(region)
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

// function calcMaxRegionRect(x: number, y: number, width: number, height: number, regionOverlay: number[]) {
//     const numRegions = regionOverlay.reduce((a, b) => a > b ? a : b) + 1

//     // algorithm needs to keep track of rectangle state for every column for every region
//     const rowOverlay = util.generate(width, () => ({
//         h: 0,
//         l: 0,
//         r: 0
//     }))

//     scanRows(width, height, (y, offset) => {
//         const overlay = rowOverlay[y]
//         for (let x = 0; x < width; ++x) {
//             const region = 
//         }
//     })
// }


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

function drawRegionLabels(ctx: CanvasRenderingContext2D, width: number, height: number, regionOverlay: number[], paletteOverlay: number[]) {
    const textHeight = ctx.measureText("M").width
    const font = ctx.font
    ctx.font = "16px arial bold"

    const infos = calcRegionDrawInfos(width, height, regionOverlay, paletteOverlay)
    for (const info of infos) {
        const label = `${info.color + 1}`
        const metrics = ctx.measureText(label)
        const centroid = info.centroid
        const x = centroid[0] - metrics.width / 2
        const y = centroid[1] - textHeight / 2
        ctx.fillText(label, x, y)
    }

    ctx.font = font
}

function calcRegionDrawInfos(width: number, height: number, regionOverlay: number[], paletteOverlay: number[]): RegionDrawInfo[] {
    const numRegions = regionOverlay.reduce((a, b) => a > b ? a : b) + 1
    const infos = util.generate(numRegions, () => ({
        centroid: [0, 0],
        pixels: 0,
        color: 0
    }))

    imaging.scan(width, height, (x, y, offset) => {
        const region = regionOverlay[offset]
        if (region == -1) {
            return
        }

        const info = infos[regionOverlay[offset]]
        info.centroid[0] += x
        info.centroid[1] += y
        info.color = paletteOverlay[offset]
        info.pixels++
    })

    const drawInfos: RegionDrawInfo[] = infos
        .filter(i => i.pixels > 0)
        .map(info => ({
            color: info.color,
            centroid: [info.centroid[0] / info.pixels, info.centroid[1] / info.pixels]
        }))

    return drawInfos
}