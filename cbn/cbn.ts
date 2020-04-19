import * as util from "../util.js"

interface Cell {
    color: number
    region: number
    border: boolean
}

enum CameraMode {
    None,
    User,
    Environment,
}

const camera = util.byId("camera") as HTMLVideoElement
let cameraMode = CameraMode.None
const canvas = util.byId("canvas") as HTMLCanvasElement
const acquireImageDiv = util.byId("acquireImage") as HTMLDivElement

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
    // loadFromUrl("mario.jpg")
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
        video: { width: {max: dialogWidth}, height: {max: dialogHeight}, facingMode: "user" },
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

    // convert to xyz colors and choose palette
    const data = imageData2RGBArray(imageData.data).map(rgb2xyz)
    const palette = choosePaletteHistogram(data, 9, 3)

    const maxDist = Infinity
    const cells = data.map(xyz => {
        // find nearest color in palette
        let paletteIndex: number = -1
        let minDist = maxDist
        for (let i = 0; i < palette.length; ++i) {
            const dist = calcDistSq(xyz, palette[i])
            if (dist < minDist) {
                minDist = dist
                paletteIndex = i
            }
        }

        return { color: paletteIndex, region: -1, border: false }
    })

    findRegions(imageData.width, imageData.height, cells)
    findBorders(imageData.width, imageData.height, cells)

    // replace with palette colors
    // const paletteRGB = palette.map(xyz2rgb)

    // testing only - draw mapped colors
    // for (let i = 0; i < cells.length; ++i) {
    //     const cell = cells[i]
    //     const color = paletteRGB[cell.color]
    //     imageData.data[i * 4] = color[0]
    //     imageData.data[i * 4 + 1] = color[1]
    //     imageData.data[i * 4 + 2] = color[2]
    // }

    for (let i = 0; i < cells.length; ++i) {
        const cell = cells[i]
        const l = cell.border ? 0 : 255
        imageData.data[i * 4] = l
        imageData.data[i * 4 + 1] = l
        imageData.data[i * 4 + 2] = l
    }

    ctx.putImageData(imageData, 0, 0)
}

function calcDistSq(p1: [number, number, number], p2: [number, number, number]): number {
    const [x1, y1, z1] = p1
    const [x2, y2, z2] = p2
    const dx = x2 - x1
    const dy = y2 - y1
    const dz = z2 - z1
    const dist = dx * dx + dy * dy + dz * dz
    return dist
}

function choosePaletteHistogram(data: [number, number, number][], maxColors: number, bucketsPerComponent: number): [number, number, number][] {
    // divide color space into buckets
    const bpcSq = bucketsPerComponent * bucketsPerComponent
    const numBuckets = bucketsPerComponent * bpcSq
    const buckets: [number, number, number][][] = []
    for (let i = 0; i < numBuckets; ++i) {
        buckets.push([])
    }

    for (const xyz of data) {
        const xb = Math.trunc(xyz[0] * bucketsPerComponent)
        const yb = Math.trunc(xyz[1] * bucketsPerComponent)
        const zb = Math.trunc(xyz[2] * bucketsPerComponent)
        const xyzb = Math.min(numBuckets - 1, zb * bpcSq + yb * bucketsPerComponent + xb)
        buckets[xyzb].push(xyz)
    }

    // choose maxColors most populous buckets
    const bucketSumLength = buckets
        .sort((x, y) => y.length - x.length)
        .slice(0, maxColors)
        .map(a => [a.reduce((xyz1, xyz2) => [xyz1[0] + xyz2[0], xyz1[1] + xyz2[1], xyz1[2] + xyz2[2]], [0, 0, 0]), a.length]) as [[number, number, number], number][]

    const palette = bucketSumLength.map(elem => {
        const [xyz, l] = elem
        return divXYZ(xyz, l)
    })

    return palette
}

function divXYZ(xyz: [number, number, number], s: number): [number, number, number] {
    const [x, y, z] = xyz
    return [x / s, y / s, z / s]
}

function findRegions(width: number, height: number, cells: Cell[]) {
    let region = 0
    for (let y = 0; y < height; ++y) {
        let yOffset = y * width
        for (let x = 0; x < width; ++x) {
            let xOffset = yOffset + x
            const cell = cells[xOffset]
            if (cell.region != -1) {
                continue
            }

            cell.region = region
            scanRegion(width, height, x, y, cells)
            ++region
        }
    }
}

function findBorders(width: number, height: number, cells: Cell[]) {
    // color borders
    for (let y = 0; y < height; ++y) {
        let yOffset = y * width
        for (let x = 0; x < width; ++x) {
            let xOffset = yOffset + x
            const cell = cells[xOffset]
            const l = x - 1
            const r = x + 1
            const t = y - 1
            const b = y + 1

            // edge cells are border
            if (l < 0 || r >= width || t < 0 || b >= height) {
                cell.border = true
                continue
            }

            if (cells[xOffset - 1].region != cell.region) {
                cell.border = true
            }

            if (cells[xOffset + 1].region != cell.region) {
                cell.border = true
            }

            if (cells[xOffset - width].region != cell.region) {
                cell.border = true
            }

            if (cells[xOffset + width].region != cell.region) {
                cell.border = true
            }
        }
    }
}

function fillInterior(width: number, height: number, cells: Cell[]) {
    // color borders
    for (let y = 0; y < height; ++y) {
        let yOffset = y * width
        for (let x = 0; x < width; ++x) {
            let xOffset = yOffset + x
            const cell = cells[xOffset]
            const l = x - 1
            const r = x + 1
            const t = y - 1
            const b = y + 1

            // edge cells are border
            if (l < 0 || r >= width || t < 0 || b >= height) {
                continue
            }

            if (cells[xOffset - 1].region != cell.region) {
                continue
            }

            if (cells[xOffset + 1].region != cell.region) {
                continue
            }

            if (cells[xOffset - width].region != cell.region) {
                continue
            }

            if (cells[xOffset + width].region != cell.region) {
                continue
            }

            cell.color = 1
        }
    }
}

function scanRegion(width: number, height: number, x0: number, y0: number, cells: Cell[]) {
    const stack: number[] = []
    stack.push(x0)
    stack.push(y0)

    const offset0 = y0 * width + x0
    const cell0 = cells[offset0]
    const region0 = cell0.region
    const color0 = cell0.color

    while (stack.length > 0) {
        const y = stack.pop() as number
        const x = stack.pop() as number
        const offset = y * width + x
        const cell = cells[offset]
        cell.region = region0

        // explore neighbors (if same color)
        const l = x - 1
        const r = x + 1
        const t = y - 1
        const b = y + 1

        if (l >= 0) {
            const cell1 = cells[offset - 1]
            if (cell1.region == -1 && cell1.color == color0) {
                stack.push(l)
                stack.push(y)
            }
        }

        if (r < width) {
            const cell1 = cells[offset + 1]
            if (cell1.region == -1 && cell1.color == color0) {
                stack.push(r)
                stack.push(y)
            }
        }

        if (t >= 0) {
            const cell1 = cells[offset - width]
            if (cell1.region == -1 && cell1.color == color0) {
                stack.push(x)
                stack.push(t)
            }
        }

        if (b < height) {
            const cell1 = cells[offset + width]
            if (cell1.region == -1 && cell1.color == color0) {
                stack.push(x)
                stack.push(b)
            }
        }
    }
}

// function linear(x: number) {
//     if (x <= .04045) {
//         return x / 12.92
//     }

//     return Math.pow(((x + .055) / 1.055), 2.4)
// }

function imageData2RGBArray(data: Uint8ClampedArray): [number, number, number][] {
    const result: [number, number, number][] = []
    for (let i = 0; i < data.length; i += 4) {
        result.push([data[i], data[i + 1], data[i + 2]])
    }

    return result
}

function rgb2xyz(rgb: [number, number, number]): [number, number, number] {
    let [r, b, g] = rgb
    r /= 255.0
    g /= 255.0
    b /= 255.0

    const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
    const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
    const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041
    return [x, y, z]
}

function xyz2rgb(xyz: [number, number, number]): [number, number, number] {
    const [x, y, z] = xyz
    const r = (x * 3.2404542 + y * -1.5371385 + z * -0.4985314) * 255
    const g = (x * -0.9692660 + y * 1.8760108 + z * 0.0415560) * 255
    const b = (x * 0.0556434 + y * -0.2040259 + z * 1.0572252) * 255
    return [r, g, b]
}