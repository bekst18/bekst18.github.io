import * as dom from "../shared/dom.js"
import * as geo from "../shared/geo3d.js"
import * as input from "../shared/input.js"
import * as rand from "../shared/rand.js"
import * as math from "../shared/math.js"
import * as audio from "../shared/audio.js"
import * as gfx from "./gfx.js"

const brickWidth = 2
const brickHeight = 1
const brickDepth = .5
const paddleHeight = .5
const paddleDepth = .5
const paddleSpeed = .5
const borderWidth = 1
const topRowMargin = 1
const brickMargin = .05
const paddleBottomMargin = 1

const startMessage = "Tap, click, or press any key to launch ball."
const gameOverMessage = "Game over! Tap, click, or press any key to restart."
const nextLevelMessage = "Level Clear! Tap, click, or press any key to advance."

interface LevelData {
    ballSpeed: number
    ballRadius: number
    paddleWidth: number
    brickRows: number
    brickCols: number
    borderColor: geo.Vec4
    floorColor: geo.Vec4
}

const levels = new Array<LevelData>(
    // level 1
    {
        ballSpeed: .2,
        ballRadius: 1.25,
        paddleWidth: 6,
        brickRows: 3,
        brickCols: 7,
        borderColor: new geo.Vec4(.25, 0, 0, 1),
        floorColor: new geo.Vec4(.25, .25, .25, 1)
    },
    // level 2
    {
        ballSpeed: .3,
        ballRadius: 1,
        paddleWidth: 6,
        brickRows: 3,
        brickCols: 7,
        borderColor: new geo.Vec4(0, .25, 0, 1),
        floorColor: new geo.Vec4(0, 0, .25, 1)
    },
    // level 3
    {
        ballSpeed: .35,
        ballRadius: .75,
        paddleWidth: 6,
        brickRows: 3,
        brickCols: 5,
        borderColor: new geo.Vec4(0, 0, .55, 1),
        floorColor: new geo.Vec4(0, 0, 0, 1)
    },
    // level 4
    {
        ballSpeed: .4,
        ballRadius: .6,
        paddleWidth: 5,
        brickRows: 3,
        brickCols: 6,
        borderColor: new geo.Vec4(.6, .5, 0, 1),
        floorColor: new geo.Vec4(0, .25, 0, 1)
    },
    // level 5
    {
        ballSpeed: .45,
        ballRadius: .55,
        paddleWidth: 4,
        brickRows: 3,
        brickCols: 8,
        borderColor: new geo.Vec4(0, .5, .6, 1),
        floorColor: new geo.Vec4(.25, .25, .25, 1)
    },
    // level 6
    {
        ballSpeed: .5,
        ballRadius: .5,
        paddleWidth: 4,
        brickRows: 4,
        brickCols: 8,
        borderColor: new geo.Vec4(1, 0, 0, 1),
        floorColor: new geo.Vec4(0, .3, .25, 1)
    },
    // level 7
    {
        ballSpeed: .6,
        ballRadius: .4,
        paddleWidth: 3.5,
        brickRows: 4,
        brickCols: 10,
        borderColor: new geo.Vec4(1, 1, 0, 1),
        floorColor: new geo.Vec4(.25, .25, .25, 1)
    },
    // level 8
    {
        ballSpeed: .65,
        ballRadius: .35,
        paddleWidth: 3,
        brickRows: 5,
        brickCols: 10,
        borderColor: new geo.Vec4(.5, .6, 1, 1),
        floorColor: new geo.Vec4(.25, 0, .25, 1)
    },
    // level 9
    {
        ballSpeed: .7,
        ballRadius: .3,
        paddleWidth: 2,
        brickRows: 6,
        brickCols: 12,
        borderColor: new geo.Vec4(0, 1, 1, 1),
        floorColor: new geo.Vec4(.35, .15, .25, 1)
    },
    // level 9
    {
        ballSpeed: .8,
        ballRadius: .2,
        paddleWidth: 1,
        brickRows: 8,
        brickCols: 15,
        borderColor: new geo.Vec4(1, 1, 1, 1),
        floorColor: new geo.Vec4(.1, .1, .4, 1)
    },
)

const brickColors = new Array<geo.Vec4>(
    new geo.Vec4(1, 0, 0, 1),
    new geo.Vec4(0, 1, 0, 1),
    new geo.Vec4(0, 0, 1, 1),
    new geo.Vec4(0, 1, 1, 1),
    new geo.Vec4(1, 0, 1, 1),
    new geo.Vec4(1, 1, 1, 1),
    new geo.Vec4(.5, .5, 0, 1),
    new geo.Vec4(0, .5, .5, 1),
    new geo.Vec4(.5, 0, .5, 1),
    new geo.Vec4(.25, .75, 0, 1),
    new geo.Vec4(0, .25, .75, 1),
    new geo.Vec4(.25, 0, .75, 1),
    new geo.Vec4(.75, .25, 0, 1),
    new geo.Vec4(0, .75, .25, 1),
    new geo.Vec4(.75, 0, .25, 1),
)

interface PaddleOptions {
    halfExtents: geo.Vec3
    position: geo.Vec3
    batch: gfx.Batch
    velocity?: geo.Vec3
}

class Paddle {
    public readonly halfExtents: geo.Vec3
    public readonly batch = new gfx.Batch()
    position = new geo.Vec3(0, 0, 0)
    velocity = new geo.Vec3(0, 0, 0)

    constructor(options: PaddleOptions) {
        this.halfExtents = options.halfExtents.clone()
        this.batch = options.batch
        this.position = options.position.clone()
        this.velocity = options.velocity?.clone() ?? new geo.Vec3(0, 0, 0)
    }
}

interface BrickOptions {
    position: geo.Vec3
    batch: gfx.Batch
}

class Brick {
    public readonly batch = new gfx.Batch()
    public readonly position = new geo.Vec3(0, 0, 0)
    static readonly halfExtents = new geo.Vec3(brickWidth / 2 - brickMargin, brickHeight / 2 - brickMargin, brickDepth / 2)

    constructor(options: BrickOptions) {
        this.position = options.position.clone()
        this.batch = options.batch
    }
}

interface BallOptions {
    radius: number
    position: geo.Vec3
    batch: gfx.Batch
    velocity?: geo.Vec3
}

class Ball {
    radius: number = 1
    position: geo.Vec3
    batch: gfx.Batch
    velocity: geo.Vec3

    constructor(options: BallOptions) {
        this.radius = options.radius
        this.position = options.position.clone()
        this.batch = options.batch
        this.velocity = options.velocity?.clone() ?? new geo.Vec3(0, 0, 0)
    }
}

enum GameState {
    Play,
    Launch,
    Wait
}

// step 1 - clear screen, init gl, etc...
// step 2 - draw a clip space triangle
// step 3 - draw a world space triangle
class App {
    private readonly canvas = dom.byId("canvas") as HTMLCanvasElement
    private readonly levelSpan = dom.byId("level") as HTMLDivElement
    private readonly ballsRemainingSpan = dom.byId("ballsRemaining") as HTMLDivElement
    private readonly messageDiv = dom.byId("message") as HTMLDivElement
    private readonly renderer = new gfx.Renderer(this.canvas)
    private readonly inp = new input.Input(this.canvas)
    private fieldBatch: gfx.Batch = new gfx.Batch()
    private paddle!: Paddle
    private ball!: Ball
    private readonly bricks = new Set<Brick>()
    private readonly ac = new AudioContext()
    private impactSounds = new Array<AudioBuffer>()
    private ballsRemaining = 3
    private level = 10
    private state = GameState.Launch
    private continue = () => { }

    async exec() {
        this.message = startMessage
        document.addEventListener("keyup", () => this.handleKeyUp())

        this.initLevel()
        await this.initAudio()
        this.canvas.focus()
        requestAnimationFrame(() => this.tick())
    }

    private async initAudio() {
        const numImpactSounds = 15
        for (let i = 1; i <= numImpactSounds; ++i) {
            const url = `./assets/impact${i}.wav`
            const buffer = await audio.loadAudio(this.ac, url)
            this.impactSounds.push(buffer)
        }
    }

    private tick() {
        this.checkSize()
        this.update()
        this.drawScene()
        requestAnimationFrame(() => this.tick())
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
        this.updateUI()
        this.inp.flush()
    }

    private updateUI() {
        this.ballsRemainingSpan.textContent = this.ballsRemaining.toString()
        this.levelSpan.textContent = this.level.toString()

        if (this.message) {
            this.messageDiv.hidden = false
        } else {
            this.messageDiv.hidden = true
        }
    }

    private get levelData(): LevelData {
        const data = levels[Math.min(this.level - 1, levels.length - 1)]
        return data
    }

    private get fieldWidth(): number {
        return brickWidth * this.levelData.brickCols
    }

    private get fieldHeight(): number {
        return brickHeight * this.levelData.brickRows * 4 + topRowMargin
    }

    private get fieldLeft(): number {
        return -this.fieldWidth / 2
    }

    private get fieldRight(): number {
        return this.fieldLeft + this.fieldWidth
    }

    private get fieldBottom(): number {
        return -this.fieldHeight / 2
    }

    private get fieldTop(): number {
        return this.fieldBottom + this.fieldHeight
    }

    private get message(): string {
        return this.messageDiv.textContent ?? ""
    }

    private set message(text: string) {
        this.messageDiv.textContent = text
    }

    private handleKeyUp() {
        if (this.state === GameState.Play) {
            return
        }

        if (this.state === GameState.Wait) {
            this.continue()
            return
        }

        this.launchBall()
    }

    private handleInput() {
        switch (this.state) {
            case GameState.Launch:
                this.handleInputLaunch()
                break

            case GameState.Play:
                this.handleInputPlay()
                break

            case GameState.Wait:
                this.handleInputWait()
                break
        }
    }

    private handleInputLaunch(): void {
        // start game on mouse cick
        if (this.inp.mouseLeftPressed) {
            this.launchBall()
        }
    }

    private handleInputPlay() {
        this.paddle.velocity = new geo.Vec3(0, 0, 0)

        // mouse / touch paddle movement
        if (this.inp.mouseLeftDown) {
            const worldMouseRay = this.canvasToWorldRay(new geo.Vec2(this.inp.mouseX, this.inp.mouseY))
            const fieldPlane = geo.Plane.fromPointNormal(this.paddle.position, new geo.Vec3(0, 0, 1))
            const fieldIx = worldMouseRay.lerp(worldMouseRay.cast(fieldPlane))
            if (fieldIx.x > this.paddle.position.x) {
                this.paddle.velocity = new geo.Vec3(1, 0, 0)
            } else if (fieldIx.x < this.paddle.position.x) {
                this.paddle.velocity = new geo.Vec3(-1, 0, 0)
            }
        }

        // keyboard paddle movement
        if (this.inp.down("a")) {
            this.paddle.velocity = new geo.Vec3(-1, 0, 0)
        } else if (this.inp.down("d")) {
            this.paddle.velocity = new geo.Vec3(1, 0, 0)
        }

        if (this.paddle.velocity.lengthSq() > 0) {
            this.paddle.velocity = this.paddle.velocity.normalize().mulX(paddleSpeed)
        }
    }

    private handleInputWait() {
        if (this.inp.mouseLeftDown) {
            this.continue()
        }
    }

    private launchBall() {
        // choose random upward launch direction
        const rot = geo.Mat3.rotationZ(rand.float(-Math.PI / 4, Math.PI / 4))
        const v = rot.transform(new geo.Vec3(0, 1, 0)).normalize()
        this.ball.velocity = v.mulX(this.levelData.ballSpeed)
        this.state = GameState.Play
        this.message = ""
    }

    private handleCollision() {
        if (this.state !== GameState.Play) {
            return
        }

        // is paddle going to cross boundary?
        const bounds = geo.AABB.fromCoords(
            this.fieldLeft, this.fieldBottom, -1,
            this.fieldRight, this.fieldTop, 1)

        const paddlePosition = this.paddle.position.add(this.paddle.velocity)
        const paddleBounds = geo.AABB.fromPositionHalfExtents(paddlePosition, this.paddle.halfExtents)

        const ballPosition = this.ball.position.add(this.ball.velocity)
        const ballBounds = geo.AABB.fromPositionHalfExtents(ballPosition, new geo.Vec3(this.ball.radius, this.ball.radius, this.ball.radius))
        const ballSpeed = this.levelData.ballSpeed

        // check paddle against boundary
        if (paddleBounds.min.x <= this.fieldLeft || paddleBounds.max.x >= this.fieldRight) {
            this.paddle.velocity = new geo.Vec3(0, 0, 0)
        }

        // ball / paddle hit check
        if (ballBounds.overlaps(paddleBounds)) {
            let velocity = this.ball.velocity
            velocity.y = -velocity.y

            // allow player some control
            // right side of paddle rotates angle right
            // left side of paddle rotates angle left
            const aabb = geo.AABB.fromPositionHalfExtents(paddlePosition, this.paddle.halfExtents)
            const nearest = ballPosition.clamp(aabb.min, aabb.max)
            const t = math.unlerp(aabb.min.x, aabb.max.x, nearest.x)
            const rot = geo.Mat4.rotationZ(math.lerp(-Math.PI / 4, Math.PI / 4, t))

            // choose a random deviation from standard reflection angle
            velocity = rot.transform3(velocity)
            velocity.z = 0
            this.ball.velocity = velocity.normalize().mulX(ballSpeed)
        }

        // handle brick hit
        const nearestBrick = this.findNearestBrick(ballPosition, this.ball.radius)
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

            // if no bricks, move to next level
            if (this.bricks.size === 0) {
                this.ball.velocity = new geo.Vec3(0, 0, 0)
                this.wait(nextLevelMessage, () => this.nextLevel())
            }
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
            this.ball.position = new geo.Vec3(0, this.paddle.position.y + this.paddle.halfExtents.y + this.ball.radius, this.ball.radius),
                this.playImpactSound()
            this.state = GameState.Launch
            this.ballsRemaining--

            if (this.ballsRemaining <= 0) {
                this.gameOver()
            }
        }

        // clamp y velocity to avoid horizontal angles
        if (this.ball.velocity.lengthSq() > 0 && Math.abs(this.ball.velocity.y) < ballSpeed * .25) {
            this.ball.velocity.y = Math.sign(this.ball.velocity.y) * ballSpeed * .25
            this.ball.velocity = this.ball.velocity.normalize().mulX(ballSpeed)
        }
    }

    private gameOver() {
        this.ballsRemaining = 3
        this.level = 1
        this.wait(gameOverMessage, () => this.initLevel())
    }

    private nextLevel() {
        this.level++
        this.initLevel()
    }

    private wait(msg: string, f: () => void) {
        this.message = msg
        this.continue = f
        this.state = GameState.Wait
    }

    private initLevel() {
        this.bricks.clear()
        this.state = GameState.Launch
        this.message = startMessage

        // playing field
        {
            const ixm = new gfx.IxMesh()

            // floor
            {
                const floor = gfx.IxMesh.rectFromCoords(this.fieldLeft, this.fieldBottom, -.25, this.fieldRight, this.fieldTop, 0)
                const floorColor = this.levelData.floorColor
                floor.vertices.forEach(v => v.color = floorColor)
                ixm.cat(floor)
            }

            // border
            {
                const walls = new gfx.IxMesh()
                const borderColor = this.levelData.borderColor
                walls.cat(gfx.IxMesh.rectFromCoords(this.fieldLeft - borderWidth, this.fieldBottom, -.25, this.fieldLeft, this.fieldTop, 1))
                walls.cat(gfx.IxMesh.rectFromCoords(this.fieldRight, this.fieldBottom, -.25, this.fieldRight + borderWidth, this.fieldTop, 1))
                walls.cat(gfx.IxMesh.rectFromCoords(this.fieldLeft - borderWidth, this.fieldTop, -.25, this.fieldRight + borderWidth, this.fieldTop + borderWidth, 1))
                walls.vertices.forEach(v => v.color = borderColor)
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
            const brickHalfWidth = brickWidth / 2
            const brickHalfHeight = brickHeight / 2
            const brickHalfDepth = brickDepth / 2

            const fieldXOffset = this.fieldLeft + Brick.halfExtents.x
            const fieldYOffset = this.fieldTop - topRowMargin - brickHeight * this.levelData.brickRows

            for (let i = 0; i < this.levelData.brickRows; ++i) {
                const yOffset = fieldYOffset + i * brickHeight + brickMargin
                for (let j = 0; j < this.levelData.brickCols; ++j) {
                    const xOffset = fieldXOffset + j * (brickWidth + brickMargin)
                    const brickMin = new geo.Vec3(-brickHalfWidth + brickMargin, -brickHalfHeight + brickMargin, -brickHalfDepth)
                    const brickMax = new geo.Vec3(brickHalfWidth - brickMargin, brickHalfHeight - brickMargin, brickHalfDepth)
                    const aabb = new geo.AABB(brickMin, brickMax)
                    const ixm = gfx.IxMesh.rect(aabb)
                    const position = new geo.Vec3(xOffset, yOffset, brickHalfDepth)

                    const brick = new Brick({
                        position: position,
                        batch: new gfx.Batch({
                            worldMatrix: geo.Mat4.translation(position),
                            diffuseColor: rand.choose(brickColors),
                            roughness: .8,
                            vao: this.renderer.createMesh(ixm),
                            numIndices: ixm.indices.length,
                        })
                    })

                    this.bricks.add(brick)
                }
            }
        }

        // add paddle
        {
            const width = this.levelData.paddleWidth
            const halfExtents = new geo.Vec3(width / 2, paddleHeight / 2, paddleDepth / 2)
            const aabb = geo.AABB.fromHalfExtents(halfExtents)
            const ixm = gfx.IxMesh.rect(aabb)
            ixm.vertices.forEach(v => v.color = new geo.Vec4(0, 1, 1, 1))

            const vao = this.renderer.createMesh(ixm)
            this.paddle = new Paddle({
                halfExtents: halfExtents,
                position: new geo.Vec3(0, this.fieldBottom + halfExtents.y + paddleBottomMargin, halfExtents.z),
                batch: new gfx.Batch({
                    vao,
                    roughness: .5,
                    numIndices: ixm.indices.length
                })
            })
        }

        // add ball
        {
            const radius = this.levelData.ballRadius
            const ixm = gfx.IxMesh.sphere(16, 16)
            ixm.transform(geo.Mat4.scaling(new geo.Vec3(radius, radius, radius)))
            ixm.vertices.forEach(v => v.color = new geo.Vec4(0, 0, 1, 1))

            const vao = this.renderer.createMesh(ixm)
            this.ball = new Ball({
                radius: radius,
                position: new geo.Vec3(0, this.paddle.position.y + this.paddle.halfExtents.y + radius, radius),
                batch: new gfx.Batch({
                    vao,
                    offset: 0,
                    roughness: 0,
                    numIndices: ixm.indices.length
                })
            })
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
        // configure camera - fit play area to screen with some small margin
        let z = 0
        const height = this.fieldTop - this.fieldBottom + borderWidth * 2
        const width = this.fieldRight - this.fieldLeft + borderWidth * 2
        const fieldAspect = width / height
        if (fieldAspect < this.renderer.aspect) {
            z = height / 2 / Math.tan(this.renderer.fov / 2)
        } else {
            z = width / 2 / Math.tan(this.renderer.fov * this.renderer.aspect / 2);
        }

        this.renderer.viewMatrix = geo.Mat4.lookAt(
            new geo.Vec3(0, 0, 1 + z), new geo.Vec3(0, 0, -1), new geo.Vec3(0, 1, 0)).invert()

        // show from side view for debugging
        // this.renderer.viewMatrix = geo.Mat4.lookAt(
        //     new geo.Vec3(0, -16, 0), new geo.Vec3(0, 1, 0), new geo.Vec3(0, 0, 1)).invert()

        this.renderer.drawBatch(this.fieldBatch)
        this.renderer.drawBatch(this.ball.batch)
        this.renderer.drawBatch(this.paddle.batch)

        for (const brick of this.bricks) {
            this.renderer.drawBatch(brick.batch)
        }

        this.renderer.present()
    }

    private canvasToNDC(cc: geo.Vec2): geo.Vec2 {
        const ndc = new geo.Vec2(
            cc.x / this.canvas.width * 2 - 1,
            -cc.y / this.canvas.height * 2 + 1
        )

        return ndc
    }

    private canvasToNDCRay(cc: geo.Vec2): geo.Ray {
        const ndc = this.canvasToNDC(cc)
        const ray = new geo.Ray(new geo.Vec3(ndc.x, ndc.y, -1), new geo.Vec3(0, 0, 1))
        return ray
    }

    private canvasToWorldRay(cc: geo.Vec2): geo.Ray {
        const ndcRay = this.canvasToNDCRay(cc)
        const invProj = this.renderer.projectionMatrix.invert()
        const invView = this.renderer.viewMatrix.invert()
        const invViewProj = this.renderer.projectionMatrix.matmul(this.renderer.viewMatrix).invert()
        const viewRay = ndcRay.transform(invProj)
        const worldRay = viewRay.transform(invView)

        if (this.inp.mouseLeftReleased) {
            console.log("cc: ", cc.toString())
            console.log("ndc: ", ndcRay.toString())
            console.log("view: ", viewRay.toString())
            console.log("world: ", worldRay.toString())
            console.log("world2: ", ndcRay.transform(invViewProj).toString())
        }

        return worldRay
    }
}

const app = new App()
app.exec()
