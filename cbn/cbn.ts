import * as util from "../util.js"

interface Cell {
    color: number
    region: number
    border: boolean
}

interface Region {
    size: number
}

enum CameraMode {
    None,
    User,
    Environment,
}

type Color = [number, number, number]

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

    // convert to xyz colors and palettize data
    const data = imageData2RGBArray(imageData.data)
    const [palette, palettizedData] = palettizeMedianCut(data, 8)

    const cells: Cell[] = palettizedData.map(i => ({
        color: i,
        region: -1,
        border: false
    }))

    const regions = findRegions(imageData.width, imageData.height, cells)
    findBorders(imageData.width, imageData.height, cells)

    // fill borders and regions
    for (let i = 0; i < cells.length; ++i) {
        const cell = cells[i]
        const l = cell.border ? 0 : 255

        if (regions[cell.region].size < 256) {
            const color = palette[cell.color]
            imageData.data[i * 4] = color[0]
            imageData.data[i * 4 + 1] = color[1]
            imageData.data[i * 4 + 2] = color[2]
            continue
        }

        imageData.data[i * 4] = l
        imageData.data[i * 4 + 1] = l
        imageData.data[i * 4 + 2] = l
    }

    // DEBUG ONLY - show palettized image
    // for (let i = 0; i < palettizedData.length; ++i) {
    //     const colorIdx = palettizedData[i]
    //     const color = palette[colorIdx]
    //     imageData.data[i * 4] = color[0]
    //     imageData.data[i * 4 + 1] = color[1]
    //     imageData.data[i * 4 + 2] = color[2]
    // }

    ctx.putImageData(imageData, 0, 0)
}

// function calcDistSq(p1: Color, p2: Color): number {
//     const [x1, y1, z1] = p1
//     const [x2, y2, z2] = p2
//     const dx = x2 - x1
//     const dy = y2 - y1
//     const dz = z2 - z1
//     const dist = dx * dx + dy * dy + dz * dz
//     return dist
// }

function palettizeMedianCut(data: Color[], maxColors: number): [Color[], number[]] {
    const buckets: number[][] = []

    // place all colors in initial bucket
    const bucket: number[] = []
    for (let i = 0; i < data.length; ++i) {
        bucket.push(i)
    }

    buckets.push(bucket)

    while (buckets.length < maxColors) {
        const bucket = chooseBucket(data, buckets)
        const newBucket = splitBucket(data, bucket)
        buckets.push(newBucket)
    }

    // choose color for each bucket
    const palette = buckets.map(b => divXYZ(b.reduce((xyz, i) => addXYZ(xyz, data[i]), [0, 0, 0]), b.length))
    const palettizedData: number[] = data.map(() => 0)
    for (let i = 0; i < buckets.length; ++i) {
        const bucket = buckets[i]
        for (let j = 0; j < bucket.length; ++j) {
            palettizedData[bucket[j]] = i
        }
    }

    return [palette, palettizedData]
}

function chooseBucket(data: Color[], buckets: number[][]) {
    const bucket = buckets.reduce((b1, b2) => calcBucketRange(data, b1) > calcBucketRange(data, b2) ? b1 : b2)
    return bucket
}

function calcBucketRange(data: Color[], bucket: number[]): number {
    const lx = bucket.reduce((min, i) => min < data[i][0] ? min : data[i][0], Infinity)
    const rx = bucket.reduce((max, i) => max > data[i][0] ? max : data[i][0], 0)
    const ly = bucket.reduce((min, i) => min < data[i][1] ? min : data[i][1], Infinity)
    const ry = bucket.reduce((max, i) => max > data[i][1] ? max : data[i][1], 0)
    const lz = bucket.reduce((min, i) => min < data[i][2] ? min : data[i][2], Infinity)
    const rz = bucket.reduce((max, i) => max > data[i][2] ? max : data[i][2], 0)
    const dx = rx - lx
    const dy = ry - ly
    const dz = rz - lz
    const d = Math.max(dx, dy, dz)
    return d
}

function splitBucket(data: Color[], bucket: number[]): number[] {
    if (bucket.length <= 1) {
        throw Error("Bucket must have at least two elements to split")
    }

    // determine component with max range in bucket
    const lx = bucket.reduce((min, i) => min < data[i][0] ? min : data[i][0], Infinity)
    const rx = bucket.reduce((max, i) => max > data[i][0] ? max : data[i][0], 0)
    const ly = bucket.reduce((min, i) => min < data[i][1] ? min : data[i][1], Infinity)
    const ry = bucket.reduce((max, i) => max > data[i][1] ? max : data[i][1], 0)
    const lz = bucket.reduce((min, i) => min < data[i][2] ? min : data[i][2], Infinity)
    const rz = bucket.reduce((max, i) => max > data[i][2] ? max : data[i][2], 0)
    const dx = rx - lx
    const dy = ry - ly
    const dz = rz - lz
    const d = Math.max(dx, dy, dz)

    if (dx === d) {
        bucket.sort((a, b) => data[a][0] - data[b][0])
    } else if (dy === d) {
        bucket.sort((a, b) => data[a][1] - data[b][1])
    } else if (dz === d) {
        bucket.sort((a, b) => data[a][2] - data[b][2])
    }

    // left half of array stays in bucket
    // right half moves to new bucket
    const medianIdx = Math.floor(bucket.length / 2)
    const newBucket = bucket.splice(medianIdx, bucket.length - medianIdx)
    return newBucket
}

function divXYZ(xyz: Color, s: number): Color {
    const [x, y, z] = xyz
    return [x / s, y / s, z / s]
}

function addXYZ(xyz1: Color, xyz2: Color): Color {
    return [xyz1[0] + xyz2[0], xyz1[1] + xyz2[1], xyz1[2] + xyz2[2]]
}

function findRegions(width: number, height: number, cells: Cell[]) : Region[]{
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

    const regions: Region[] = []
    for (let i = 0; i < region; ++i) {
        regions.push({ size: 0 })
    }

    for (const cell of cells) {
        regions[cell.region].size++
    }

    return regions
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

function imageData2RGBArray(data: Uint8ClampedArray): Color[] {
    const result: Color[] = []
    for (let i = 0; i < data.length; i += 4) {
        result.push([data[i], data[i + 1], data[i + 2]])
    }

    return result
}

function rgb2xyz(rgb: Color): Color {
    let [r, b, g] = rgb
    r /= 255.0
    g /= 255.0
    b /= 255.0

    const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
    const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
    const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041
    return [x, y, z]
}

function xyz2rgb(xyz: Color): Color {
    const [x, y, z] = xyz
    const r = (x * 3.2404542 + y * -1.5371385 + z * -0.4985314) * 255
    const g = (x * -0.9692660 + y * 1.8760108 + z * 0.0415560) * 255
    const b = (x * 0.0556434 + y * -0.2040259 + z * 1.0572252) * 255
    return [r, g, b]
}