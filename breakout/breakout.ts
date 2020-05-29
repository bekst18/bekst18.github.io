import * as dom from "../shared/dom.js"
import * as glu from "../shared/glu.js"

// step 1 - clear screen, init gl, etc...

class App {
    private readonly canvas = dom.byId("canvas") as HTMLCanvasElement
    private readonly gl = glu.createContext(this.canvas)

    exec() {
        requestAnimationFrame(() => this.tick())
    }

    private tick() {
        this.present()
        requestAnimationFrame(() => this.tick())
    }

    private present() {
        const gl = this.gl
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
        gl.clearColor(0, 0, 1, 1)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    }
}

const app = new App()
app.exec()