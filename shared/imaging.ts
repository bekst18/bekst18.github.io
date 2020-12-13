export function quantMedianCut(ctx: CanvasRenderingContext2D, maxColors: number, tolerance: number) {
    interface Pixel {
        offset: number
        r: number
        g: number
        b: number
    }

    const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
    const { width, height, data } = imgData
    const rowPitch = width * 4

    const buckets = new Array<Pixel[]>()
    buckets.push(createInitialBucket())

    while (true) {
        const bucket = chooseBucket(tolerance, buckets)
        if (!bucket) {
            break
        }

        buckets.push(splitBucket(bucket))
        if (buckets.length >= maxColors) {
            break
        }
    }

    // calculate the average color for each bucket
    const colors = new Array<[number, number, number]>()
    for (const bucket of buckets) {
        let r = 0
        let g = 0
        let b = 0

        for (const pixel of bucket) {
            r += pixel.r
            g += pixel.g
            b += pixel.b
        }

        r /= bucket.length
        g /= bucket.length
        b /= bucket.length

        colors.push([Math.round(r), Math.round(g), Math.round(b)])
    }

    // iterate through each bucket, replacing pixel color with bucket color for each pixel
    for (let i = 0; i < buckets.length; ++i) {
        const bucket = buckets[i]
        const [r, g, b] = colors[i]

        for (const pixel of bucket) {
            const offset = pixel.offset * 4
            data[offset] = r
            data[offset + 1] = g
            data[offset + 2] = b
        }
    }

    ctx.putImageData(imgData, 0, 0)

    function createInitialBucket(): Pixel[] {
        // create initial bucket
        const bucket = new Array<Pixel>()
        for (let y = 0; y < height; ++y) {
            const yOffset = y * rowPitch
            for (let x = 0; x < width; ++x) {
                const offset = yOffset + x * 4
                const r = data[offset]
                const g = data[offset + 1]
                const b = data[offset + 2]

                // pack into bucket
                const pixel: Pixel = {
                    offset: flat(x, y, width),
                    r: r,
                    g: g,
                    b: b
                }

                bucket.push(pixel)
            }
        }

        return bucket
    }

    function calcRange(pixels: Pixel[], selector: (x: Pixel) => number): number {
        let min = Infinity
        let max = -Infinity

        for (const pixel of pixels) {
            min = Math.min(selector(pixel), min)
            max = Math.max(selector(pixel), max)
        }

        return max - min
    }

    function chooseBucket(tolerance: number, buckets: Pixel[][]): Pixel[] | null {
        let maxRange = -Infinity
        let maxBucket: Pixel[] | null = null

        for (const bucket of buckets) {
            const rangeR = calcRange(bucket, p => p.r)
            const rangeG = calcRange(bucket, p => p.g)
            const rangeB = calcRange(bucket, p => p.b)
            let range = 0
            if (rangeR > rangeG && rangeR > rangeB) {
                range = rangeR
            } else if (rangeG > rangeR) {
                range = rangeG
            } else {
                range = rangeB
            }

            if (range > maxRange) {
                maxRange = range
                maxBucket = bucket
            }
        }

        return maxRange > tolerance ? maxBucket : null
    }

    function splitBucket(bucket: Pixel[]): Pixel[] {
        const rangeR = calcRange(bucket, p => p.r)
        const rangeG = calcRange(bucket, p => p.g)
        const rangeB = calcRange(bucket, p => p.b)

        if (rangeR > rangeG && rangeR > rangeB) {
            bucket.sort((a, b) => a.r - b.r)
        } else if (rangeG > rangeR) {
            bucket.sort((a, b) => a.g - b.g)
        } else {
            bucket.sort((a, b) => a.b - b.b)
        }

        const middle = Math.floor(bucket.length / 2)
        const newBucket = bucket.splice(middle)
        return newBucket
    }
}

export function scanImageData(imageData: ImageData, f: (x: number, y: number, offset: number) => void): void {
    const { width, height } = imageData
    scan(width, height, f)
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

export function generate(width: number, height: number, f: (x: number, y: number) => number): number[] {
    const a = new Array<number>()
    scan(width, height, (x, y) => {
        a.push(f(x, y))
    })

    return a
}

export function scanRegion(x0: number, y0: number, width: number, height: number, rowPitch: number, f: (x: number, y: number, offset: number) => void): void {
    const x1 = x0 + width
    const y1 = y0 + height
    for (let y = y0; y < y1; ++y) {
        const yOffset = y * rowPitch
        for (let x = x0; x < x1; ++x) {
            const xOffset = yOffset + x
            f(x, y, xOffset)
        }
    }
}

export function scanRows(width: number, height: number, f: (y: number, offset: number) => void) {
    for (let y = 0; y < height; ++y) {
        const offset = y * width
        f(y, offset)
    }
}

export function scanRowsRegion(y0: number, height: number, rowPitch: number, f: (y: number, offset: number) => void) {
    const y1 = y0 + height
    for (let y = 0; y < y1; ++y) {
        const offset = y * rowPitch
        f(y, offset)
    }
}

export function calcLuminance(color: [number, number, number]) {
    const [r, g, b] = color
    const l = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255)
    return l
}

export function copyImageData(imageData: ImageData): ImageData {
    return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)
}

export function canvas2Blob(canvas: HTMLCanvasElement, type?: string, quality?: number): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob)
            }
            else {
                reject(new Error("toBlob returned null"))
            }
        },
            type,
            quality)
    })
}

export function flat(x: number, y: number, rowPitch: number) {
    return y * rowPitch + x
}

export function unflat(i: number, rowPitch: number): [number, number] {
    return [i % rowPitch, Math.floor(i / rowPitch)]
}
