import * as dom from "../shared/dom.js"
import * as geo from "../shared/geo3d.js"
import * as input from "../shared/input.js"
import * as rand from "../shared/rand.js"
import * as math from "../shared/math.js"
import * as array from "../shared/array.js"
import * as noise from "../shared/noise.js"
import * as audio from "../shared/audio.js"
import * as gfx from "./gfx.js"

const brickWidth = 2
const brickHeight = 1
const brickDepth = .5
const paddleWidth = 4
const paddleHeight = 1
const paddleDepth = .5
const ballRadius = .5
const paddleSpeed = .25
const ballSpeed = .35
const brickRows = 5
const brickCols = 10
const borderWidth = 1
const fieldWidth = brickWidth * brickCols
const topRowMargin = .5
const fieldHeight = brickHeight * brickRows * 4 + topRowMargin
const fieldLeft = -fieldWidth / 2
const fieldRight = fieldLeft + fieldWidth
const fieldBottom = -fieldHeight / 2
const fieldTop = fieldBottom + fieldHeight
const brickMargin = .05
const paddleBottomMargin = 1

const brickColors = new Array<geo.Vec4>(
    new geo.Vec4(1, 0, 0, 1),
    new geo.Vec4(0, 1, 0, 1),
    new geo.Vec4(0, 0, 1, 1),
    new geo.Vec4(0, 1, 1, 1),
    new geo.Vec4(1, 0, 1, 1),
    new geo.Vec4(.5, .5, .5, 1),
)

class Paddle {
    batch = new gfx.Batch()
    position = new geo.Vec3(0, 0, 0)
    velocity = new geo.Vec3(0, 0, 0)
    static readonly halfExtents = new geo.Vec3(paddleWidth / 2, paddleHeight / 2, paddleDepth)
}

class Brick {
    batch = new gfx.Batch()
    static readonly halfExtents = new geo.Vec3(brickWidth / 2 - brickMargin, brickHeight / 2 - brickMargin, brickDepth)
    position = new geo.Vec3(0, 0, 0)
}

class Ball {
    batch: gfx.Batch = new gfx.Batch()
    position: geo.Vec3 = new geo.Vec3(0, 0, 0)
    velocity: geo.Vec3 = new geo.Vec3(0, 0, 0)
    static readonly radius: number = ballRadius
}

// step 1 - clear screen, init gl, etc...
// step 2 - draw a clip space triangle
// step 3 - draw a world space triangle
class App {
    private readonly canvas = dom.byId("canvas") as HTMLCanvasElement
    private readonly renderer = new gfx.Renderer(this.canvas)
    private readonly inp = new input.Input(this.canvas)
    private ticks = 0
    private fieldBatch: gfx.Batch = new gfx.Batch()
    private readonly paddle = new Paddle()
    private readonly ball = new Ball()
    private bricks = new Set<Brick>()
    private readonly ac = new AudioContext()
    private impactSounds = new Array<AudioBuffer>()

    async exec() {
        this.initScene()
        await this.initAudio()
        this.canvas.focus()
        requestAnimationFrame(() => this.tick())
    }

    private initScene() {
        this.renderer.viewMatrix = geo.Mat4.lookAt(new geo.Vec3(0, -8, 8), new geo.Vec3(0, 0, -1), new geo.Vec3(0, 1, 0)).invert()
        this.initPlayingField()
    }

    private async initAudio() {
        const numImpactSounds = 15
        for (let i = 1; i <= numImpactSounds; ++i) {
            const url = `./assets/impact${i}.wav`
            const buffer = await audio.loadAudio(this.ac, url)
            this.impactSounds.push(buffer)
        }
    }

    private initPlayingField() {
        // playing field
        {
            const ixm = new gfx.IxMesh()

            // floor
            {
                const floor = gfx.IxMesh.rectFromCoords(fieldLeft, fieldBottom, -1.25, fieldRight, fieldTop, -1)
                floor.vertices.forEach(v => v.color = new geo.Vec4(.5, .5, .5, .5))
                ixm.cat(floor)
            }

            // border
            {
                const walls = new gfx.IxMesh()
                walls.cat(gfx.IxMesh.rectFromCoords(fieldLeft - borderWidth, fieldBottom, -1, fieldLeft, fieldTop, 1))
                walls.cat(gfx.IxMesh.rectFromCoords(fieldRight, fieldBottom, -1, fieldRight + borderWidth, fieldTop, 1))
                walls.cat(gfx.IxMesh.rectFromCoords(fieldLeft - borderWidth, fieldTop, -1, fieldRight + borderWidth, fieldTop + borderWidth, 1))
                walls.vertices.forEach(v => v.color = new geo.Vec4(1, 0, 0, 1))
                ixm.cat(walls)
            }

            const vao = this.renderer.createMesh(ixm)
            this.fieldBatch = new gfx.Batch({
                vao: vao,
                numIndices: ixm.indices.length,
                roughness: 1
            })
        }

        // bricks
        {
            const fieldXOffset = fieldLeft + Brick.halfExtents.x
            const fieldYOffset = fieldTop - topRowMargin - brickHeight * brickRows

            for (let i = 0; i < brickRows; ++i) {
                const yOffset = fieldYOffset + i * brickHeight + brickMargin
                for (let j = 0; j < brickCols; ++j) {
                    const xOffset = fieldXOffset + j * (brickWidth + brickMargin)
                    const aabb = geo.AABB.fromHalfExtents(Brick.halfExtents).shrink(brickMargin)
                    const ixm = gfx.IxMesh.rect(aabb)
                    const position = new geo.Vec3(xOffset, yOffset, -.5)

                    const brick = new Brick()
                    brick.batch = new gfx.Batch({
                        worldMatrix: geo.Mat4.translation(position),
                        diffuseColor: rand.choose(brickColors),
                        roughness: .8,
                        vao: this.renderer.createMesh(ixm),
                        numIndices: ixm.indices.length,
                    })

                    brick.position = new geo.Vec3(xOffset + Brick.halfExtents.x, yOffset + Brick.halfExtents.y, -1 + Brick.halfExtents.z)
                    this.bricks.add(brick)
                }
            }
        }

        // add paddle
        {
            const aabb = geo.AABB.fromHalfExtents(Paddle.halfExtents)
            const ixm = gfx.IxMesh.rect(aabb)
            ixm.vertices.forEach(v => v.color = new geo.Vec4(0, 1, 1, 1))

            const vao = this.renderer.createMesh(ixm)
            this.paddle.position = new geo.Vec3(0, fieldBottom + Paddle.halfExtents.y + paddleBottomMargin, -Paddle.halfExtents.z)
            this.paddle.batch = new gfx.Batch({
                vao,
                roughness: .5,
                numIndices: ixm.indices.length
            })
        }

        // add ball
        {
            const ixm = gfx.IxMesh.sphere(16, 16)
            ixm.transform(geo.Mat4.scaling(new geo.Vec3(Ball.radius, Ball.radius, Ball.radius)))
            ixm.vertices.forEach(v => v.color = new geo.Vec4(0, 0, 1, 1))

            const vao = this.renderer.createMesh(ixm)
            this.ball.position = new geo.Vec3(0, this.paddle.position.y + Ball.radius * 2 + .1, -Ball.radius)
            this.ball.batch = new gfx.Batch({
                vao,
                offset: 0,
                roughness: 0,
                numIndices: ixm.indices.length
            })
        }
    }

    private tick() {
        this.checkSize()
        this.update()
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

    private update() {
        this.paddle.position = this.paddle.position.add(this.paddle.velocity)
        this.ball.position = this.ball.position.add(this.ball.velocity)
        this.handleInput()
        this.handleCollision()
        this.updateWorldMatrices()
        this.inp.flush()
    }

    private handleInput() {
        const center = new geo.Vec2(this.canvas.width / 2, this.canvas.height / 2)

        if (this.inp.down("a") || (this.inp.mouseLeftDown && this.inp.mouseX - center.x < -5)) {
            this.paddle.velocity = new geo.Vec3(-1, 0, 0)
        } else if (this.inp.down("d") || (this.inp.mouseLeftDown && this.inp.mouseX - center.x > 5)) {
            this.paddle.velocity = new geo.Vec3(1, 0, 0)
        } else {
            this.paddle.velocity = new geo.Vec3(0, 0, 0)
        }

        // launch ball
        if (Math.abs(this.ball.velocity.lengthSq()) < .1 && (this.inp.released(" ") || this.inp.mouseLeftReleased)) {
            this.ball.velocity = new geo.Vec3(0, 1, 0).normalize().mulX(ballSpeed)
        }

        if (this.paddle.velocity.lengthSq() > 0) {
            this.paddle.velocity = this.paddle.velocity.normalize().mulX(paddleSpeed)
        }
    }

    private handleCollision() {
        // is paddle going to cross boundary?
        const bounds = geo.AABB.fromCoords(
            fieldLeft, fieldBottom, -1,
            fieldRight, fieldTop, 1)

        const paddlePosition = this.paddle.position.add(this.paddle.velocity)
        const paddleBounds = geo.AABB.fromPositionHalfExtents(paddlePosition, Paddle.halfExtents)

        const ballPosition = this.ball.position.add(this.ball.velocity)
        const ballBounds = geo.AABB.fromPositionHalfExtents(ballPosition, new geo.Vec3(Ball.radius, Ball.radius, Ball.radius))

        // check paddle against boundary
        if (paddleBounds.min.x < fieldLeft || paddleBounds.max.x > fieldRight) {
            this.paddle.velocity = new geo.Vec3(0, 0, 0)
        }

        // ball / paddle hit check
        if (ballBounds.overlaps(paddleBounds)) {
            let velocity = this.ball.velocity
            velocity.y = -velocity.y

            // allow player some control
            // right side of paddle rotates angle right
            // left side of paddle rotates angle left
            const aabb = geo.AABB.fromPositionHalfExtents(paddlePosition, Paddle.halfExtents)
            const nearest = ballPosition.clamp(aabb.min, aabb.max)
            const t = math.unlerp(aabb.min.x, aabb.max.x, nearest.x)
            const rot = geo.Mat4.rotationZ(math.lerp(-Math.PI / 4, Math.PI / 4, t))

            // choose a random deviation from standard reflection angle
            velocity = rot.transform3(velocity)
            velocity.z = 0
            this.ball.velocity = velocity.normalize().mulX(ballSpeed)
        }

        // handle brick hit
        const nearestBrick = this.findNearestBrick(ballPosition, Ball.radius)
        if (nearestBrick) {
            const aabb = geo.AABB.fromPositionHalfExtents(nearestBrick.position, Brick.halfExtents)
            const nearestPt = this.findNearestPointOnBrick(nearestBrick, ballPosition)
            let velocity = this.ball.velocity

            if (nearestPt.y <= aabb.min.y + .01) {
                velocity.y = -velocity.y
            }

            if (nearestPt.x <= aabb.min.x + .01) {
                velocity.x = -velocity.x
            }

            if (nearestPt.x >= aabb.max.x - .01) {
                velocity.x = -velocity.x
            }

            if (nearestPt.y > aabb.max.y - .01) {
                velocity.y = -velocity.y
            }

            this.ball.velocity = velocity.normalize().mulX(ballSpeed)
            this.ball.velocity.z = 0
            this.bricks.delete(nearestBrick)
            this.playImpactSound()
        }

        // is ball going to cross boundary?
        if (ballBounds.min.x < bounds.min.x || ballBounds.max.x > bounds.max.x) {
            let velocity = this.ball.velocity
            velocity.x = -velocity.x
            velocity.z = 0
            this.ball.velocity = velocity.normalize().mulX(ballSpeed)
            this.playImpactSound()
        }

        if (ballBounds.max.y > bounds.max.y) {
            let velocity = this.ball.velocity
            velocity.y = -velocity.y
            velocity.z = 0
            this.ball.velocity = velocity.normalize().mulX(ballSpeed)
            this.playImpactSound()
        }

        // ball off board
        if (ballBounds.min.y < bounds.min.y) {
            this.ball.velocity = new geo.Vec3(0, 0, 0)
            this.ball.position = new geo.Vec3(0, this.paddle.position.y + Ball.radius * 2 + .1, -Ball.radius)
            this.playImpactSound()
        }
    }

    private playImpactSound(): void {
        const sound = rand.choose(this.impactSounds)
        const src = this.ac.createBufferSource()
        src.buffer = sound
        src.connect(this.ac.destination)
        src.start()
    }

    private findNearestPointOnBrick(brick: Brick, position: geo.Vec3): geo.Vec3 {
        const aabb = geo.AABB.fromPositionHalfExtents(brick.position, Brick.halfExtents)
        const nearest = position.clamp(aabb.min, aabb.max)
        return nearest
    }

    private findNearestBrick(position: geo.Vec3, radius: number): Brick | null {
        const r2 = radius * radius
        let minDistSq = r2
        let nearestBrick: Brick | null = null
        for (const brick of this.bricks) {
            const nearestPt = this.findNearestPointOnBrick(brick, position)
            const distSq = nearestPt.sub(position).lengthSq()
            if (distSq < minDistSq) {
                nearestBrick = brick
                minDistSq = distSq
            }
        }

        return nearestBrick
    }

    private updateWorldMatrices() {
        this.ball.batch.worldMatrix = geo.Mat4.translation(this.ball.position)
        this.paddle.batch.worldMatrix = geo.Mat4.translation(this.paddle.position)
    }

    private drawScene() {
        // configure camera
        this.renderer.viewMatrix = geo.Mat4.lookAt(
            new geo.Vec3(0, 0, 16), new geo.Vec3(0, 1, 0), new geo.Vec3(0, 1, 0)).invert()

        this.renderer.drawBatch(this.fieldBatch)
        this.renderer.drawBatch(this.ball.batch)
        this.renderer.drawBatch(this.paddle.batch)

        for (const brick of this.bricks) {
            this.renderer.drawBatch(brick.batch)
        }

        this.renderer.present()
    }
}

const app = new App()
app.exec()
