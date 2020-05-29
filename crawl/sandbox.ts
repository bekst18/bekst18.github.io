import * as dom from "../shared/dom.js"
import * as imaging from "../shared/imaging.js"
import * as noise from "../shared/noise.js"
init()

function init() {
    const canvas = dom.byId("canvas") as HTMLCanvasElement
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
    if (!ctx) {
        throw new Error("Canvas element not supported")
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    const dim = Math.min(imageData.height, imageData.width)
    const heightNoise = normalize(fbm(imageData.width, imageData.height, 0, 8 / dim, 2, .5, 6))
    const forestNoise = normalize(fbm(imageData.width, imageData.height, 8, 32 / dim, 2, .5, 6))
    imaging.scanImageData(imageData, (_0, _1, offset) => {
        const height = heightNoise[offset]
        const forest = forestNoise[offset]

        if (height > .75) {
            data[offset * 4] = 127
            data[offset * 4 + 1] = 127
            data[offset * 4 + 2] = 127
            data[offset * 4 + 3] = 255
        } else if (height > .65) {
            data[offset * 4] = 255
            data[offset * 4 + 1] = 102
            data[offset * 4 + 2] = 0
            data[offset * 4 + 3] = 255
        }else if (height > .6) {
            data[offset * 4] = 255
            data[offset * 4 + 1] = 255
            data[offset * 4 + 2] = 102
            data[offset * 4 + 3] = 255
        } else if (height > .45) {
            data[offset * 4] = 0
            data[offset * 4 + 1] = 0
            data[offset * 4 + 2] = 255
            data[offset * 4 + 3] = 255
        } else {
            data[offset * 4] = 0
            data[offset * 4 + 1] = 0
            data[offset * 4 + 2] = 191
            data[offset * 4 + 3] = 255
        }

        if (height > .65 && forest > .5) {
            data[offset * 4] = 0
            data[offset * 4 + 1] = 127
            data[offset * 4 + 2] = 0
            data[offset * 4 + 3] = 255
        }
        /*
        if (grass) {
            data[offset * 4] = 0
            data[offset * 4 + 1] = 255
            data[offset * 4 + 2] = 0
            data[offset * 4 + 3] = 255
        } else if (height) {
            data[offset * 4] = 255
            data[offset * 4 + 1] = 255
            data[offset * 4 + 2] = 255
            data[offset * 4 + 3] = 255
        } else {
            data[offset * 4] = 0
            data[offset * 4 + 1] = 0
            data[offset * 4 + 2] = 255
            data[offset * 4 + 3] = 255
        }*/
    })


    ctx.putImageData(imageData, 0, 0)
}

function fbm(width: number, height: number, bias: number, freq: number, lacunarity: number, gain: number, octaves: number): number[] {
    return imaging.generate(width, height, (x, y) => {
        return noise.fbmPerlin2(x * freq + bias, y * freq + bias, lacunarity, gain, octaves)
    })
}

function normalize(a: number[]) {
    const maxValue = a.reduce((x, y) => x > y ? x : y)
    const minValue = a.reduce((x, y) => x < y ? x : y)
    const range = maxValue - minValue
    return a.map(x => (x - minValue) / range)
}