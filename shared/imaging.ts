import * as util from "../shared/util.js"

enum Axis { None, X, Y, Z }

interface Bucket {
    indices: number[]
    range: number
    splitAxis: Axis
}

export type Color = [number, number, number]

export function palettizeMedianCut(imageData: ImageData, maxColors: number): [Color[], number[]] {
    const buckets: Bucket[] = []
    const data = imageData.data

    // place all colors in initial bucket
    const bucket = createBucket(data, util.sequence(imageData.width * imageData.height))
    buckets.push(bucket)

    while (buckets.length < maxColors) {
        const bucket = buckets.reduce((x, y) => x.range > y.range ? x : y)
        const newBucket = splitBucket(data, bucket)
        buckets.push(newBucket)
    }

    // choose color for each bucket
    const palette = buckets.map(b => divXYZ(b.indices.reduce((xyz, i) => addXYZ(xyz, [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]), [0, 0, 0]), b.indices.length))
    const paletteOverlay = util.fill(0, imageData.width * imageData.height)

    for (let i = 0; i < buckets.length; ++i) {
        const bucket = buckets[i]
        for (let j = 0; j < bucket.indices.length; ++j) {
            paletteOverlay[bucket.indices[j]] = i
        }
    }

    return [palette, paletteOverlay]
}

export function palettizeHistogram(imageData: ImageData, bucketsPerComponent: number, maxColors: number): [Color[], number[]] {
    const { width, height, data } = imageData
    const pixels = width * height
    const bucketPitch = bucketsPerComponent * bucketsPerComponent
    const numBuckets = bucketPitch * bucketsPerComponent

    // creat intial buckets
    const buckets = util.generate(numBuckets, () => ({ color: [0, 0, 0] as [number, number, number], pixels: 0 }))

    // assign and update bucket for each pixel
    const bucketOverlay = util.generate(pixels, i => {
        const r = data[i * 4] / 255
        const g = data[i * 4 + 1] / 255
        const b = data[i * 4 + 2] / 255
        const rb = Math.min(Math.floor(r * bucketsPerComponent), bucketsPerComponent - 1)
        const gb = Math.min(Math.floor(g * bucketsPerComponent), bucketsPerComponent - 1)
        const bb = Math.min(Math.floor(b * bucketsPerComponent), bucketsPerComponent - 1)
        const bucketIdx = rb * bucketPitch + gb * bucketsPerComponent + bb
        const bucket = buckets[bucketIdx]
        bucket.color = addXYZ([r, g, b], bucket.color)
        bucket.pixels++
        return bucket
    })

    // calculate bucket colors
    for (const bucket of buckets) {
        bucket.color = divXYZ(bucket.color, bucket.pixels)
    }

    const topBuckets = buckets
        .sort((b1, b2) => b2.pixels - b1.pixels)
        .slice(0, maxColors)

    const bucketSet = new Set(topBuckets)

    // map all colors to top N buckets
    for (let i = 0; i < bucketOverlay.length; ++i) {
        if (bucketSet.has(bucketOverlay[i])) {
            continue
        }

        // otherwise, map to new bucket
        const r = data[i * 4] / 255
        const g = data[i * 4] / 255
        const b = data[i * 4] / 255
        const color: [number, number, number] = [r, g, b]
        const bucket = topBuckets.reduce((b1, b2) => calcDistSq(b1.color, color) < calcDistSq(b2.color, color) ? b1 : b2)
        bucketOverlay[i] = bucket
    }

    // determine palette colors
    const palette = topBuckets.map(b => mulXYZ(b.color, 255))
    const paletteOverlay = bucketOverlay.map(b => buckets.indexOf(b))

    return [palette, paletteOverlay]
}

export function applyPalette(palette: Color[], palleteOverlay: number[], imageData: ImageData) {
    const data = imageData.data
    for (let i = 0; i < palleteOverlay.length; ++i) {
        const color = palette[palleteOverlay[i]]
        data[i * 4] = color[0]
        data[i * 4 + 1] = color[1]
        data[i * 4 + 2] = color[2]
    }
}


function createBucket(data: Uint8ClampedArray, indices: number[]): Bucket {
    if (indices.length == 0) {
        throw new Error("bucket must contain at least 1 value")
    }

    const bucket: Bucket = {
        indices: indices,
        splitAxis: Axis.None,
        range: 0
    }

    updateBucket(data, bucket)
    return bucket
}

function updateBucket(data: Uint8ClampedArray, bucket: Bucket) {
    bucket.range = 0
    bucket.splitAxis = Axis.None

    let minX = Infinity
    let maxX = -1
    let minY = Infinity
    let maxY = -1
    let minZ = Infinity
    let maxZ = -1

    for (const i of bucket.indices) {
        const x = data[i * 4]
        const y = data[i * 4 + 1]
        const z = data[i * 4 + 2]
        minX = Math.min(x, minX)
        maxX = Math.max(x, maxX)
        minY = Math.min(y, minY)
        maxY = Math.max(y, maxY)
        minZ = Math.min(z, minZ)
        maxZ = Math.max(z, maxZ)
    }

    const dx = maxX - minX
    const dy = maxY - minY
    const dz = maxZ - minZ
    bucket.range = Math.max(dx, dy, dz)

    if (bucket.range === dx) {
        bucket.splitAxis = Axis.X
    } else if (bucket.range === dy) {
        bucket.splitAxis = Axis.Y
    } else {
        bucket.splitAxis = Axis.Z
    }
}

function splitBucket(data: Uint8ClampedArray, bucket: Bucket): Bucket {
    if (bucket.indices.length <= 1) {
        throw Error("Bucket must > 1 element to split")
    }

    // determine component with max range in bucket
    switch (bucket.splitAxis) {
        case Axis.X:
            bucket.indices.sort((a, b) => data[a * 4] - data[b * 4])
            break
        case Axis.Y:
            bucket.indices.sort((a, b) => data[a * 4 + 1] - data[b * 4 + 1])
            break
        case Axis.Z:
            bucket.indices.sort((a, b) => data[a * 4 + 2] - data[b * 4 + 2])
            break

        default:
            throw new Error("Invalid split axis")
            break
    }

    // left half of array stays in bucket
    // right half moves to new bucket
    const medianIdx = Math.floor(bucket.indices.length / 2)
    const newIndices = bucket.indices.splice(medianIdx, bucket.indices.length - medianIdx)
    const newBucket = createBucket(data, newIndices)
    updateBucket(data, bucket)
    return newBucket
}

export function mulXYZ(xyz: Color, s: number): Color {
    const [x, y, z] = xyz
    return [x * s, y * s, z * s]
}

export function divXYZ(xyz: Color, s: number): Color {
    const [x, y, z] = xyz
    return [x / s, y / s, z / s]
}

export function addXYZ(xyz1: Color, xyz2: Color): Color {
    return [xyz1[0] + xyz2[0], xyz1[1] + xyz2[1], xyz1[2] + xyz2[2]]
}

export function equalXYZ(xyz1: Color, xyz2: Color): boolean {
    return xyz1[0] === xyz2[0] && xyz1[1] === xyz2[1] && xyz1[2] === xyz2[2]
}

export function calcDistSq(xyz1: Color, xyz2: Color): number {
    const [x1, y1, z1] = xyz1
    const [x2, y2, z2] = xyz2
    const dx = x2 - x1
    const dy = y2 - y1
    const dz = z2 - z1
    const distSq = dx * dx + dy * dy + dz * dz
    return distSq
}

export function scanImageData(imageData: ImageData, f: (x: number, y: number, offset: number) => void): void {
    const { width, height } = imageData
    scan(width, height, f)
}

export function scanImageDataRegion(imageData: ImageData, x0: number, y0: number, f: (x: number, y: number, offset: number) => void): void {
    const { width, height } = imageData
    scanRegion(width, height, x0, y0, f)
}

export function scan(width: number, height: number, f: (x: number, y: number, offset: number) => void): void {
    for (let y = 0; y < height; ++y) {
        const yOffset = y * width
        for (let x = 0; x < width; ++x) {
            const xOffset = yOffset + x
            f(x, y, xOffset)
        }
    }
}

export function scanRegion(x0: number, y0: number, width: number, height: number, f: (x: number, y: number, offset: number) => void): void {
    const r = x0 + width
    const b = y0 + height

    for (let y = y0; y < b; ++y) {
        const yOffset = y * width
        for (let x = x0; x < r; ++x) {
            const xOffset = yOffset + x
            f(x, y, xOffset)
        }
    }
}

export function scanRows(width: number, height: number, f: (y: number, offset: number) => void): void {
    for (let y = 0; y < height; ++y) {
        const yOffset = y * width
        f(y, yOffset)
    }
}

export function scanRowsRegion(x0: number, y0: number, width: number, height: number, f: (y: number, offset: number) => void): void {
    const b = y0 + height
    for (let y = y0; y < b; ++y) {
        const yOffset = y * width + x0
        f(y, yOffset)
    }
}

export function rgb2xyz(rgb: Color): Color {
    let [r, b, g] = rgb
    r /= 255.0
    g /= 255.0
    b /= 255.0

    const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
    const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
    const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041
    return [x, y, z]
}

export function xyz2rgb(xyz: Color): Color {
    const [x, y, z] = xyz
    const r = (x * 3.2404542 + y * -1.5371385 + z * -0.4985314) * 255
    const g = (x * -0.9692660 + y * 1.8760108 + z * 0.0415560) * 255
    const b = (x * 0.0556434 + y * -0.2040259 + z * 1.0572252) * 255
    return [r, g, b]
}

export function linear(x: number) {
    if (x <= .04045) {
        return x / 12.92
    }

    return Math.pow(((x + .055) / 1.055), 2.4)
}

export function imageData2RGBArray(data: Uint8ClampedArray): Color[] {
    const result: Color[] = []
    for (let i = 0; i < data.length; i += 4) {
        result.push([data[i], data[i + 1], data[i + 2]])
    }

    return result
}

export function calcLuminance(color: Color) {
    const [r, g, b] = color
    const l = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255)
    return l
}