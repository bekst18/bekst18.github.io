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
    private fieldBatch: gfx.Batch | null = null
    private ballBatch: gfx.Batch | null = null
    private paddleBatch: gfx.Batch | null = null

    exec() {
        this.initScene()
        requestAnimationFrame(() => this.tick())
    }

    private initScene() {
        this.renderer.viewMatrix = geo.Mat4.lookAt(new geo.Vec3(0, -16, 16), new geo.Vec3(0, 0, -1), new geo.Vec3(0, 1, 0)).invert()
        this.initPlayingField()
    }

    private initPlayingField() {
        // generate border
        const ixm = new gfx.IxMesh()
        const brickRows = 5
        const brickCols = 10
        const brickWidth = 2
        const brickHeight = 1
        const borderWidth = 1
        const fieldWidth = brickWidth * brickCols + borderWidth * 2
        const fieldHeight = brickHeight * brickRows * 4 + borderWidth * 2
        const left = -fieldWidth / 2
        const right = left + fieldWidth
        const bottom = -fieldHeight / 2
        const top = bottom + fieldHeight
        const brickMargin = .1
        const topRowMargin = 1
        const paddleBottomMargin = 1

        // playing field
        {
            // floor
            {
                const floor = gfx.IxMesh.rect(new geo.AABB(new geo.Vec3(left, bottom, -3), new geo.Vec3(right, top, -1)))
                floor.vertices.forEach(v => v.color = new geo.Vec4(1, 1, 1, 1))
                ixm.cat(floor)
            }

            // border
            {
                const walls = new gfx.IxMesh()
                walls.cat(gfx.IxMesh.rect(new geo.AABB(new geo.Vec3(left, bottom + borderWidth, -1), new geo.Vec3(left + borderWidth, top - borderWidth, 1))))
                walls.cat(gfx.IxMesh.rect(new geo.AABB(new geo.Vec3(right - borderWidth, bottom + borderWidth, -1), new geo.Vec3(right, top - borderWidth, 1))))
                walls.cat(gfx.IxMesh.rect(new geo.AABB(new geo.Vec3(left, bottom, -1), new geo.Vec3(right, bottom + borderWidth, 1))))
                walls.cat(gfx.IxMesh.rect(new geo.AABB(new geo.Vec3(left, top - borderWidth, -1), new geo.Vec3(right, top, 1))))

                walls.vertices.forEach(v => v.color = new geo.Vec4(1, 0, 0, 1))
                ixm.cat(walls)
            }

            // bricks
            {
                const bricks = new gfx.IxMesh()
                const fieldXOffset = left + borderWidth
                const fieldYOffset = top - topRowMargin - brickHeight * brickRows

                for (let i = 0; i < brickRows; ++i) {
                    const yOffset = fieldYOffset + i * brickHeight + brickMargin
                    for (let j = 0; j < brickCols; ++j) {
                        const xOffset = fieldXOffset + j * brickWidth + brickMargin
                        const brick = gfx.IxMesh.rect(new geo.AABB(
                            new geo.Vec3(xOffset, yOffset, -1),
                            new geo.Vec3(xOffset + brickWidth - brickMargin, yOffset + brickHeight - brickMargin, 1)))

                        bricks.cat(brick)
                    }
                }

                bricks.vertices.forEach(v => v.color = new geo.Vec4(0, 1, 0, 1))
                ixm.cat(bricks)
            }

            const vao = this.renderer.createMesh(ixm)

            this.fieldBatch = {
                vao: vao,
                worldMatrix: geo.Mat4.identity(),
                offset: 0,
                numIndices: ixm.indices.length
            }
        }

        // add player paddle and ball
        {
            const ixm = gfx.IxMesh.sphere(16, 16)
            ixm.vertices.forEach(v => v.color = new geo.Vec4(0, 0, 1, 1))

            const vao = this.renderer.createMesh(ixm)
            this.ballBatch = {
                vao,
                worldMatrix: geo.Mat4.identity(),
                offset: 0,
                numIndices: ixm.indices.length
            }
        }

        // add paddle
        {
            const paddleWidth = 4
            const paddleHeight = 1

            const ixm = gfx.IxMesh.rect(new geo.AABB(
                new geo.Vec3(-paddleWidth / 2, bottom + borderWidth + paddleBottomMargin, -1),
                new geo.Vec3(paddleWidth / 2, bottom + borderWidth + paddleBottomMargin + paddleHeight, 1)))

            ixm.vertices.forEach(v => v.color = new geo.Vec4(0, 1, 1, 1))

            const vao = this.renderer.createMesh(ixm)
            this.paddleBatch = {
                vao,
                worldMatrix: geo.Mat4.identity(),
                offset: 0,
                numIndices: ixm.indices.length
            }
        }
    }

    private tick() {
        this.checkSize()
        this.drawScene()
        requestAnimationFrame(() => this.tick())
        ++this.ticks
    }

    private checkSize() {
        if (this.canvas.width === this.canvas.clientWidth && this.canvas.height === this.canvas.clientHeight) {
            return
        }

        this.canvas.width = this.canvas.clientWidth
        this.canvas.height = this.canvas.clientHeight
    }

    private drawScene() {
        // const rate = Math.PI / 240
        const rate = 0
        const worldMatrix = geo.Mat4.rotationX(this.ticks * rate)

        if (this.fieldBatch) {
            this.fieldBatch.worldMatrix = worldMatrix
            this.renderer.drawBatch(this.fieldBatch)
        }

        if (this.ballBatch) {
            this.ballBatch.worldMatrix = worldMatrix
            this.renderer.drawBatch(this.ballBatch)
        }

        if (this.paddleBatch) {
            this.paddleBatch.worldMatrix = worldMatrix
            this.renderer.drawBatch(this.paddleBatch)
        }

        this.renderer.present()
    }
}

const app = new App()
app.exec()