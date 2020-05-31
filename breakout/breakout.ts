import * as dom from "../shared/dom.js"
import * as geo from "../shared/geo3d.js"
import * as gfx from "./gfx.js"

// step 1 - clear screen, init gl, etc...
// step 2 - draw a clip space triangle
// step 3 - draw a world space triangle
class App {
    private readonly canvas = dom.byId("canvas") as HTMLCanvasElement
    private readonly renderer = new gfx.Renderer(this.canvas)
    private ticks = 0
    private batches: Array<gfx.Batch> = []

    exec() {
        requestAnimationFrame(() => this.tick())
        this.initScene()
    }

    private initScene() {
        this.renderer.viewMatrix = geo.Mat4.lookAt(new geo.Vec3(0, 0, 8), new geo.Vec3(0, 0, -1), new geo.Vec3(0, 1, 0)).invert()

        const ixm = gfx.cube()
        const vao = this.renderer.createMesh(ixm)

        this.batches.push({
            vao: vao,
            worldMatrix: geo.Mat4.identity(),
            offset: 0,
            numIndices: ixm.indices.length
        })
    }

    private tick() {
        // const rate =  Math.PI / 60
        // this.renderer.worldMatrix = geo.Mat4.rotationY(this.ticks * rate).matmul(geo.Mat4.translation(new geo.Vec3(0, 0, -16)))
        // this.renderer.worldMatrix = geo.Mat4.translation(new geo.Vec3(0, 0, -4))
        this.drawScene()
        requestAnimationFrame(() => this.tick())
        ++this.ticks
    }

    private drawScene() {
        for (const batch of this.batches) {
            this.renderer.drawBatch(batch)
        }

        this.renderer.present()
    }
}

const app = new App()
app.exec()