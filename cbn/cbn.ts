import * as util from "../util.js"

const camera = util.byId("camera") as HTMLVideoElement
const canvas = util.byId("canvas") as HTMLCanvasElement

interface PaletteEntry {
    name: string
    color: number[]
}

interface Cell {
    color: number
    region: number
}

const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
if (!ctx) {
    throwErrorMessage("Canvas element not supported")
}

const captureImageButton = util.byId("captureImageButton") as HTMLButtonElement
const loadUi = util.byId("loadUi") as HTMLDivElement
const playUi = util.byId("playUi") as HTMLDivElement

init()

function init() {
    const fileDropBox = util.byId("fileDropBox") as HTMLDivElement
    const fileInput = util.byId("fileInput") as HTMLInputElement
    const fileButton = util.byId("fileButton") as HTMLButtonElement
    const frontCameraButton = util.byId("frontCameraButton") as HTMLButtonElement
    const rearCameraButton = util.byId("rearCameraButton") as HTMLButtonElement
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

    frontCameraButton.addEventListener("click", acquireImageFront)
    rearCameraButton.addEventListener("click", acquireImageRear)
    stopCameraButton.addEventListener("click", stopCamera)
    captureImageButton.addEventListener("click", captureImage)
    returnButton.addEventListener("click", showLoadUi)

    // TODO: temporary for testing purposes - remove this
    // loadFromUrl("olts.jpg")
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

async function acquireImageFront() {
    camera.hidden = false
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: camera.clientWidth, height: camera.clientHeight, facingMode: "user" },
        audio: false
    })

    camera.srcObject = stream
    camera.addEventListener("loadedmetadata", onCameraLoad)
}

async function acquireImageRear() {
    camera.hidden = false
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: camera.clientWidth, height: camera.clientHeight, facingMode: "environment" },
        audio: false
    })

    camera.srcObject = stream
    camera.addEventListener("loadedmetadata", onCameraLoad)
}

function onCameraLoad() {
    camera.hidden = false
    camera.play()
    captureImageButton.hidden = false
    camera.width = camera.videoWidth
    camera.height = camera.videoHeight
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

    camera.hidden = true
    captureImageButton.hidden = true
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
    loadUi.hidden = true
    playUi.hidden = false
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    ctx.drawImage(img, 0, 0, canvas.clientWidth, canvas.clientHeight)
    processImage()
}

function showLoadUi() {
    loadUi.hidden = false
    playUi.hidden = true
}

function processImage() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const size = data.length

    const palette: PaletteEntry[] = [
        { name: "black", color: [0, 0, 0] },
        { name: "white", color: [255, 255, 255] },
        { name: "red", color: [255, 0, 0] },
        { name: "green", color: [0, 255, 0] },
        { name: "blue", color: [0, 0, 255] },
        { name: "pink", color: [255, 192, 203] },
        { name: "orange", color: [255, 165, 0] },
        { name: "yellow", color: [255, 255, 0] },
        { name: "purple", color: [127, 0, 127] },
        { name: "magenta", color: [255, 0, 255] },
        { name: "brown", color: [165, 42, 42] },
        { name: "gray", color: [127, 127, 127] }
    ]

    // create a "cell" for each pixel
    const cells: Cell[] = []
    const maxDist = 255 * 255 + 255 * 255 + 255 * 255
    for (let i = 0; i < size; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        // find nearest color in palette
        let paletteIndex: number = -1
        let minDist = maxDist
        for (let i = 0; i < palette.length; ++i) {
            const color = palette[i].color
            const dist = calcDist(r, g, b, color[0], color[1], color[2])
            if (dist < minDist) {
                minDist = dist
                paletteIndex = i
            }
        }

        cells.push({ color: paletteIndex, region: -1 })
    }

    determineRegions(imageData.width, imageData.height, cells)
    drawBorders(imageData.width, imageData.height, cells)
    // fillInterior(imageData.width, imageData.height, cells)

    // replace with palette colors
    for (let i = 0; i < cells.length; ++i) {
        const cell = cells[i]
        const color = palette[cell.color].color
        data[i * 4] = color[0]
        data[i * 4 + 1] = color[1]
        data[i * 4 + 2] = color[2]
    }

    ctx.putImageData(imageData, 0, 0)
}

function calcDist(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
    const dx = x2 - x1
    const dy = y2 - y1
    const dz = z2 - z1
    const dist = dx * dx + dy * dy + dz * dz
    return dist
}

function determineRegions(width: number, height: number, cells: Cell[]) {
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

function drawBorders(width: number, height: number, cells: Cell[]) {
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
                cell.color = 0
                continue
            }

            if (cells[xOffset - 1].region != cell.region) {
                cell.color = 0
            }

            if (cells[xOffset + 1].region != cell.region) {
                cell.color = 0
            }

            if (cells[xOffset - width].region != cell.region) {
                cell.color = 0
            }

            if (cells[xOffset + width].region != cell.region) {
                cell.color = 0
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