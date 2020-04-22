import * as util from "../shared/util.js"

const canvas = util.byId("canvas") as HTMLCanvasElement
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
if (!ctx) {
    throw new Error("Canvas element not supported")
}

init()

async function init() {
    const image = await util.loadImage("olts.jpg")
    canvas.width = image.width
    canvas.height = image.height
    ctx.drawImage(image, 0, 0)

    const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    {
        const imageData = copyImageData(originalImageData)
        util.bench(brightenImageData.name, () => brightenImageData(imageData))
    }

    {
        const imageData = copyImageData(originalImageData)
        util.bench(brightenLoop.name, () => brightenLoop(imageData))
    }

    {
        const imageData = copyImageData(originalImageData)
        util.bench(brightenScan.name, () => brightenScan(imageData))
    }

    {
        const imageData = copyImageData(originalImageData)
        const nested = nest(imageData)
        util.bench(brightenNested.name, () => brightenNested(nested))
        const newImageData = unnest(nested)
        ctx.putImageData(newImageData, 0, 0)
    }

    {
        const a = util.sequence(originalImageData.data.length / 4)
        util.bench("access array of numbers", () => {
            for (let i = 0; i < a.length; ++i) {
                a[1] += 9
            }
        })
    }
}

function copyImageData(imageData: ImageData): ImageData {
    return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)
}

function brightenImageData(imageData: ImageData) {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
        data[i] += 64
        data[i + 1] += 64
        data[i + 2] += 64
    }
}

function brightenLoop(imageData: ImageData) {
    const { height, width, data } = imageData
    const pixelPitch = 4
    const rowPitch = width * pixelPitch

    for (let y = 0; y < height; ++y) {
        const yOffset = y * rowPitch
        for (let x = 0; x < width; ++x) {
            const xOffset = yOffset + x * pixelPitch
            data[xOffset] += 64
            data[xOffset + 1] += 64
            data[xOffset + 2] += 64
        }
    }
}

function brightenScan(imageData: ImageData) {
    const data = imageData.data
    scan(imageData, (_1, _2, offset) => {
        data[offset] += 64
        data[offset + 1] += 64
        data[offset + 2] += 64
    })
}

function scan(imageData: ImageData, f: (x: number, y: number, offset: number) => void) {
    const { height, width } = imageData
    const pixelPitch = 4
    const rowPitch = width * pixelPitch

    for (let y = 0; y < height; ++y) {
        const yOffset = y * rowPitch
        for (let x = 0; x < width; ++x) {
            const xOffset = yOffset + x * pixelPitch
            f(x, y, xOffset)
        }
    }
}

function nest(imageData: ImageData): number[][][] {
    const { height, width, data } = imageData
    const pixelPitch = 4
    const rowPitch = width * pixelPitch
    const rows: number[][][] = []

    for (let y = 0; y < height; ++y) {
        const yOffset = y * rowPitch
        const row: number[][] = []
        for (let x = 0; x < width; ++x) {
            const xOffset = yOffset + x * pixelPitch
            const color = [data[xOffset], data[xOffset + 1], data[xOffset + 2]]
            row.push(color)
        }

        rows.push(row)
    }

    return rows
}

function unnest(data: number[][][]): ImageData {
    const flat: number[] = []
    for (const row of data) {
        for (const color of row) {
            flat.push(color[0], color[1], color[2], 255)
        }
    }

    const height = data.length
    const width = data[0].length
    const imageData = new ImageData(new Uint8ClampedArray(flat), width, height)
    return imageData
}

function brightenNested(data: number[][][]) {
    for (const row of data) {
        for (const color of row) {
            color[0] += 64
            color[1] += 64
            color[2] += 64
        }
    }
}