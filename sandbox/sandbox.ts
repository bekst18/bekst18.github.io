import * as dom from "../shared/dom.js"
import * as util from "../shared/util.js"

const canvas = dom.byId("canvas") as HTMLCanvasElement
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
if (!ctx) {
    throw new Error("Canvas element not supported")
}

const gl = canvas.getContext("webgl2-compute")
if (!gl) {
    throw new Error("GL compute not supported")
}

init()

function init() {
    
}