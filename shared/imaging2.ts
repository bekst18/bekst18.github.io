import * as geo from "../shared/geo3d.js"
import * as array from "../shared/array.js"

export class Color extends geo.Vec4 {

}

export class Image {
    public readonly data: Color[]

    constructor(public readonly width: number, public readonly height: number) {
        this.data = array.generate(width * height, _ => geo.Vec4.zero())
    }

    public atf(i: number): Color {
        return this.data[i]
    }

    public at(x: number, y: number): Color {
        return this.atf(this.flat(x, y))
    }

    public flat(x: number, y: number): number {
        return y * this.width + x
    }

    public map<T>(f: (x: Color) => T): T[] {
        return this.data.map(f)
    }

    public *[Symbol.iterator]() {
        for (const x of this.data) {
            yield x
        }
    }

    public scan(f: (x: number, y: number, offset: number) => void): void {
        for (let y = 0; y < this.height; ++y) {
            const yOffset = y * this.width
            for (let x = 0; x < this.width; ++x) {
                const xOffset = yOffset + x
                f(x, y, xOffset)
            }
        }
    }
}

export function fromCanvasImageData(imageData: ImageData): Image {
    const { width, height, data } = imageData
    const numPixels = width * height
    const image = new Image(width, height)

    for (let i = 0; i < numPixels; ++i) {
        const ii = i * 4
        const color = image.atf(i)
        color.x = data[ii] / 255
        color.y = data[ii + 1] / 255
        color.z = data[ii + 2] / 255
        color.w = data[ii + 3] / 255
    }

    return image
}

export function toCanvasImageData(image: Image): ImageData {
    const { width, height } = image
    const pixels = width * height
    const imageData = new ImageData(width, height)
    const data = imageData.data

    for (let i = 0; i < pixels; ++i) {
        const ii = i * 4
        const color = image.atf(i)
        data[ii] = Math.floor(color.x * 255)
        data[ii + 1] = Math.floor(color.y * 255)
        data[ii + 2] = Math.floor(color.z * 255)
        data[ii + 3] = Math.floor(color.w * 255)
    }

    return imageData
}

export function palettizeHistogram(image: Image, bucketsPerComponent: number, maxColors: number) {
    const bucketPitch = bucketsPerComponent * bucketsPerComponent
    const numBuckets = bucketPitch * bucketsPerComponent

    // create intial buckets
    const buckets = array.generate(numBuckets, () => ({ color: geo.Vec4.zero(), pixels: 0 }))

    // assign and update bucket for each pixel
    const bucketOverlay = image.map(color => {
        const rb = Math.min(Math.floor(color.x * bucketsPerComponent), bucketsPerComponent - 1)
        const gb = Math.min(Math.floor(color.y * bucketsPerComponent), bucketsPerComponent - 1)
        const bb = Math.min(Math.floor(color.z * bucketsPerComponent), bucketsPerComponent - 1)
        const bucketIdx = rb * bucketPitch + gb * bucketsPerComponent + bb
        const bucket = buckets[bucketIdx]
        bucket.color = bucket.color.add(color)
        bucket.pixels++
        return bucket
    })

    // calculate bucket colors
    for (const bucket of buckets) {
        bucket.color = bucket.color.divX(bucket.pixels)
    }

    const topBuckets = buckets
        .sort((b1, b2) => b2.pixels - b1.pixels)
        .slice(0, maxColors)

    const bucketSet = new Set(topBuckets)

    // map all colors to top N buckets
    for (let i = 0; i < bucketOverlay.length; ++i) {
        // if color is a remaining color, continue
        // otherwise replace with nearest top bucket
        if (bucketSet.has(bucketOverlay[i])) {
            continue
        }

        const color = image.atf(i)
        const bucket = topBuckets.reduce((b1, b2) => b1.color.xyz.sub(color.xyz).lengthSq() < b2.color.xyz.sub(color.xyz).lengthSq() ? b1 : b2)
        bucketOverlay[i] = bucket
    }

    // replace colors with bucket colors
    for (let i = 0; i < bucketOverlay.length; ++i) {
        image.atf(i).set(bucketOverlay[i].color)
    }
}

export function uniqueColors(img: Image): Color[] {
    const set = new Set<number>()

    for (const color of img) {
        set.add(packColor(color))
    }

    const colors = [...set].map(n => unpackColor(n))
    return colors
}

export function indexByColor(img: Image, colors: Color[]): number[] {
    const idxs = img.map(c1 => colors.findIndex(c2 => c1.equal(c2)))
    return idxs
}

export function calcLuminance(color: Color) {
    const l = 0.2126 * (color.x / 255) + 0.7152 * (color.y / 255) + 0.0722 * (color.z / 255)
    return l
}

export function toCanvasColor(color: Color): Color {
    const r = color.mulX(255).floor()
    return r
}

export function fromCanvasColor(color: Color): Color {
    const r = color.divX(255)
    return r
}

export function toCanvasComponent(x: number): number {
    const y = Math.floor(x * 255)
    return y
}

export function fromCanvasComponent(x: number): number {
    const y = x / 255
    return y
}

export function packColor(color: Color): number {
    const r = toCanvasComponent(color.x)
    const g = toCanvasComponent(color.y)
    const b = toCanvasComponent(color.z)
    const a = toCanvasComponent(color.w)
    const n = (r << 24) | (g << 16) | (b << 8) | a
    return n
}

export function unpackColor(n: number): Color {
    const r = (n & 0xFF000000) >>> 24
    const g = (n & 0x00FF0000) >>> 16
    const b = (n & 0x0000FF00) >>> 8
    const a = n & 0x000000FF

    return new Color(
        fromCanvasComponent(r),
        fromCanvasComponent(g),
        fromCanvasComponent(b),
        fromCanvasComponent(a))
}