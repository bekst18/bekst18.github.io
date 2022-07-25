import * as dom from "../shared/dom.js";
import * as geo from "../shared/geo3d.js";
import * as input from "../shared/input.js";
import * as rand from "../shared/rand.js";
import * as math from "../shared/math.js";
import * as audio from "../shared/audio.js";
import * as gfx from "./gfx.js";
const brickWidth = 2;
const brickHeight = 1;
const brickDepth = .5;
const paddleHeight = .5;
const paddleDepth = .5;
const paddleSpeed = .5;
const borderWidth = 1;
const topRowMargin = 1;
const brickMargin = .05;
const paddleBottomMargin = 1;
const startMessage = "Tap, click, or press any key to launch ball.";
const gameOverMessage = "Game over! Tap, click, or press any key to restart.";
const nextLevelMessage = "Level Clear! Tap, click, or press any key to advance.";
const levels = new Array(
// level 1
{
    ballSpeed: .15,
    ballRadius: 1.25,
    paddleWidth: 6,
    brickRows: 3,
    brickCols: 7,
    borderColor: new geo.Vec4(.25, 0, 0, 1),
    floorColor: new geo.Vec4(.25, .25, .25, 1)
}, 
// level 2
{
    ballSpeed: .15,
    ballRadius: 1,
    paddleWidth: 6,
    brickRows: 3,
    brickCols: 7,
    borderColor: new geo.Vec4(0, .25, 0, 1),
    floorColor: new geo.Vec4(0, 0, .25, 1)
}, 
// level 3
{
    ballSpeed: .2,
    ballRadius: .75,
    paddleWidth: 6,
    brickRows: 3,
    brickCols: 5,
    borderColor: new geo.Vec4(0, 0, .55, 1),
    floorColor: new geo.Vec4(0, 0, 0, 1)
}, 
// level 4
{
    ballSpeed: .25,
    ballRadius: .6,
    paddleWidth: 5,
    brickRows: 3,
    brickCols: 6,
    borderColor: new geo.Vec4(.6, .5, 0, 1),
    floorColor: new geo.Vec4(0, .25, 0, 1)
}, 
// level 5
{
    ballSpeed: .3,
    ballRadius: .55,
    paddleWidth: 4,
    brickRows: 3,
    brickCols: 8,
    borderColor: new geo.Vec4(0, .5, .6, 1),
    floorColor: new geo.Vec4(.25, .25, .25, 1)
}, 
// level 6
{
    ballSpeed: .35,
    ballRadius: .5,
    paddleWidth: 4,
    brickRows: 4,
    brickCols: 8,
    borderColor: new geo.Vec4(1, 0, 0, 1),
    floorColor: new geo.Vec4(0, .3, .25, 1)
}, 
// level 7
{
    ballSpeed: .35,
    ballRadius: .4,
    paddleWidth: 3.5,
    brickRows: 4,
    brickCols: 10,
    borderColor: new geo.Vec4(1, 1, 0, 1),
    floorColor: new geo.Vec4(.25, .25, .25, 1)
}, 
// level 8
{
    ballSpeed: .4,
    ballRadius: .35,
    paddleWidth: 3,
    brickRows: 5,
    brickCols: 10,
    borderColor: new geo.Vec4(.5, .6, 1, 1),
    floorColor: new geo.Vec4(.25, 0, .25, 1)
}, 
// level 9
{
    ballSpeed: .45,
    ballRadius: .3,
    paddleWidth: 2,
    brickRows: 6,
    brickCols: 12,
    borderColor: new geo.Vec4(0, 1, 1, 1),
    floorColor: new geo.Vec4(.35, .15, .25, 1)
}, 
// level 10
{
    ballSpeed: .5,
    ballRadius: .2,
    paddleWidth: 1,
    brickRows: 8,
    brickCols: 15,
    borderColor: new geo.Vec4(1, 1, 1, 1),
    floorColor: new geo.Vec4(.1, .1, .4, 1)
});
const brickColors = new Array(new geo.Vec4(1, 0, 0, 1), new geo.Vec4(0, 1, 0, 1), new geo.Vec4(0, 0, 1, 1), new geo.Vec4(0, 1, 1, 1), new geo.Vec4(1, 0, 1, 1), new geo.Vec4(1, 1, 1, 1), new geo.Vec4(.5, .5, 0, 1), new geo.Vec4(0, .5, .5, 1), new geo.Vec4(.5, 0, .5, 1), new geo.Vec4(.25, .75, 0, 1), new geo.Vec4(0, .25, .75, 1), new geo.Vec4(.25, 0, .75, 1), new geo.Vec4(.75, .25, 0, 1), new geo.Vec4(0, .75, .25, 1), new geo.Vec4(.75, 0, .25, 1));
class Paddle {
    constructor(options) {
        var _a, _b;
        this.batch = new gfx.Batch();
        this.position = new geo.Vec3(0, 0, 0);
        this.velocity = new geo.Vec3(0, 0, 0);
        this.halfExtents = options.halfExtents.clone();
        this.batch = options.batch;
        this.position = options.position.clone();
        this.velocity = (_b = (_a = options.velocity) === null || _a === void 0 ? void 0 : _a.clone()) !== null && _b !== void 0 ? _b : new geo.Vec3(0, 0, 0);
    }
}
class Brick {
    constructor(options) {
        this.batch = new gfx.Batch();
        this.position = new geo.Vec3(0, 0, 0);
        this.position = options.position.clone();
        this.batch = options.batch;
    }
}
Brick.halfExtents = new geo.Vec3(brickWidth / 2 - brickMargin, brickHeight / 2 - brickMargin, brickDepth / 2);
class Ball {
    constructor(options) {
        var _a, _b;
        this.radius = 1;
        this.radius = options.radius;
        this.position = options.position.clone();
        this.batch = options.batch;
        this.velocity = (_b = (_a = options.velocity) === null || _a === void 0 ? void 0 : _a.clone()) !== null && _b !== void 0 ? _b : new geo.Vec3(0, 0, 0);
    }
}
var GameState;
(function (GameState) {
    GameState[GameState["Play"] = 0] = "Play";
    GameState[GameState["Launch"] = 1] = "Launch";
    GameState[GameState["Wait"] = 2] = "Wait";
})(GameState || (GameState = {}));
// step 1 - clear screen, init gl, etc...
// step 2 - draw a clip space triangle
// step 3 - draw a world space triangle
class App {
    constructor() {
        this.rng = createRNG();
        this.canvas = dom.byId("canvas");
        this.levelSpan = dom.byId("level");
        this.ballsRemainingSpan = dom.byId("ballsRemaining");
        this.messageDiv = dom.byId("message");
        this.renderer = new gfx.Renderer(this.canvas);
        this.inp = new input.Input(this.canvas);
        this.fieldBatch = new gfx.Batch();
        this.bricks = new Set();
        this.ac = new AudioContext();
        this.impactSounds = new Array();
        this.ballsRemaining = 3;
        this.level = 9;
        this.state = GameState.Launch;
        this.continue = () => { };
    }
    async exec() {
        this.message = startMessage;
        document.addEventListener("keyup", () => this.handleKeyUp());
        this.initLevel();
        await this.initAudio();
        this.canvas.focus();
        requestAnimationFrame(() => this.tick());
    }
    async initAudio() {
        const numImpactSounds = 15;
        for (let i = 1; i <= numImpactSounds; ++i) {
            const url = `./assets/impact${i}.wav`;
            const buffer = await audio.loadAudio(this.ac, url);
            this.impactSounds.push(buffer);
        }
    }
    tick() {
        this.checkSize();
        this.update();
        this.drawScene();
        requestAnimationFrame(() => this.tick());
    }
    checkSize() {
        if (this.canvas.width === this.canvas.clientWidth && this.canvas.height === this.canvas.clientHeight) {
            return;
        }
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }
    update() {
        this.paddle.position = this.paddle.position.add(this.paddle.velocity);
        this.ball.position = this.ball.position.add(this.ball.velocity);
        this.handleInput();
        this.handleCollision();
        this.updateWorldMatrices();
        this.updateUI();
        this.inp.flush();
    }
    updateUI() {
        this.ballsRemainingSpan.textContent = this.ballsRemaining.toString();
        this.levelSpan.textContent = this.level.toString();
        if (this.message) {
            this.messageDiv.hidden = false;
        }
        else {
            this.messageDiv.hidden = true;
        }
    }
    get levelData() {
        const data = levels[Math.min(this.level - 1, levels.length - 1)];
        return data;
    }
    get fieldWidth() {
        return brickWidth * this.levelData.brickCols;
    }
    get fieldHeight() {
        return brickHeight * this.levelData.brickRows * 4 + topRowMargin;
    }
    get fieldLeft() {
        return -this.fieldWidth / 2;
    }
    get fieldRight() {
        return this.fieldLeft + this.fieldWidth;
    }
    get fieldBottom() {
        return -this.fieldHeight / 2;
    }
    get fieldTop() {
        return this.fieldBottom + this.fieldHeight;
    }
    get message() {
        var _a;
        return (_a = this.messageDiv.textContent) !== null && _a !== void 0 ? _a : "";
    }
    set message(text) {
        this.messageDiv.textContent = text;
    }
    handleKeyUp() {
        if (this.state === GameState.Play) {
            return;
        }
        if (this.state === GameState.Wait) {
            this.continue();
            return;
        }
        this.launchBall();
    }
    handleInput() {
        switch (this.state) {
            case GameState.Launch:
                this.handleInputLaunch();
                break;
            case GameState.Play:
                this.handleInputPlay();
                break;
            case GameState.Wait:
                this.handleInputWait();
                break;
        }
    }
    handleInputLaunch() {
        // start game on mouse cick
        if (this.inp.mouseLeftPressed) {
            this.launchBall();
        }
    }
    handleInputPlay() {
        this.paddle.velocity = new geo.Vec3(0, 0, 0);
        // mouse / touch paddle movement
        if (this.inp.mouseLeftDown) {
            const worldMouseRay = this.canvasToWorldRay(new geo.Vec2(this.inp.mouseX, this.inp.mouseY));
            const fieldPlane = geo.Plane.fromPointNormal(this.paddle.position, new geo.Vec3(0, 0, 1));
            const fieldIx = worldMouseRay.lerp(worldMouseRay.cast(fieldPlane));
            if (fieldIx.x > this.paddle.position.x) {
                this.paddle.velocity = new geo.Vec3(1, 0, 0);
            }
            else if (fieldIx.x < this.paddle.position.x) {
                this.paddle.velocity = new geo.Vec3(-1, 0, 0);
            }
        }
        // keyboard paddle movement
        if (this.inp.down("a")) {
            this.paddle.velocity = new geo.Vec3(-1, 0, 0);
        }
        else if (this.inp.down("d")) {
            this.paddle.velocity = new geo.Vec3(1, 0, 0);
        }
        if (this.paddle.velocity.lengthSq() > 0) {
            this.paddle.velocity = this.paddle.velocity.normalize().mulX(paddleSpeed);
        }
    }
    handleInputWait() {
        if (this.inp.mouseLeftDown) {
            this.continue();
        }
    }
    launchBall() {
        // choose random upward launch direction
        const rot = geo.Mat3.rotationZ(rand.float(this.rng, -Math.PI / 4, Math.PI / 4));
        const v = rot.transform(new geo.Vec3(0, 1, 0)).normalize();
        this.ball.velocity = v.mulX(this.levelData.ballSpeed);
        this.state = GameState.Play;
        this.message = "";
    }
    handleCollision() {
        if (this.state !== GameState.Play) {
            return;
        }
        // is paddle going to cross boundary?
        const bounds = geo.AABB.fromCoords(this.fieldLeft, this.fieldBottom, -1, this.fieldRight, this.fieldTop, 1);
        const paddlePosition = this.paddle.position.add(this.paddle.velocity);
        const paddleBounds = geo.AABB.fromPositionHalfExtents(paddlePosition, this.paddle.halfExtents);
        const ballPosition = this.ball.position.add(this.ball.velocity);
        const ballBounds = geo.AABB.fromPositionHalfExtents(ballPosition, new geo.Vec3(this.ball.radius, this.ball.radius, this.ball.radius));
        const ballSpeed = this.levelData.ballSpeed;
        // check paddle against boundary
        if (paddleBounds.min.x <= this.fieldLeft || paddleBounds.max.x >= this.fieldRight) {
            this.paddle.velocity = new geo.Vec3(0, 0, 0);
        }
        // ball / paddle hit check
        if (ballBounds.overlaps(paddleBounds)) {
            let velocity = this.ball.velocity;
            velocity.y = -velocity.y;
            // allow player some control
            // right side of paddle rotates angle right
            // left side of paddle rotates angle left
            const aabb = geo.AABB.fromPositionHalfExtents(paddlePosition, this.paddle.halfExtents);
            const nearest = ballPosition.clamp(aabb.min, aabb.max);
            const t = math.unlerp(aabb.min.x, aabb.max.x, nearest.x);
            const rot = geo.Mat4.rotationZ(math.lerp(-Math.PI / 4, Math.PI / 4, t));
            // choose a random deviation from standard reflection angle
            velocity = rot.transform3(velocity);
            velocity.z = 0;
            this.ball.velocity = velocity.normalize().mulX(ballSpeed);
        }
        // handle brick hit
        const nearestBrick = this.findNearestBrick(ballPosition, this.ball.radius);
        if (nearestBrick) {
            const aabb = geo.AABB.fromPositionHalfExtents(nearestBrick.position, Brick.halfExtents);
            const nearestPt = this.findNearestPointOnBrick(nearestBrick, ballPosition);
            let velocity = this.ball.velocity;
            if (nearestPt.y <= aabb.min.y + .01) {
                velocity.y = -velocity.y;
            }
            if (nearestPt.x <= aabb.min.x + .01) {
                velocity.x = -velocity.x;
            }
            if (nearestPt.x >= aabb.max.x - .01) {
                velocity.x = -velocity.x;
            }
            if (nearestPt.y > aabb.max.y - .01) {
                velocity.y = -velocity.y;
            }
            this.ball.velocity = velocity.normalize().mulX(ballSpeed);
            this.ball.velocity.z = 0;
            this.bricks.delete(nearestBrick);
            this.playImpactSound();
            // if no bricks, move to next level
            if (this.bricks.size === 0) {
                this.ball.velocity = new geo.Vec3(0, 0, 0);
                this.wait(nextLevelMessage, () => this.nextLevel());
                return;
            }
        }
        // is ball going to cross boundary?
        if (ballBounds.min.x < bounds.min.x || ballBounds.max.x > bounds.max.x) {
            let velocity = this.ball.velocity;
            velocity.x = -velocity.x;
            velocity.z = 0;
            this.ball.velocity = velocity.normalize().mulX(ballSpeed);
            this.playImpactSound();
        }
        if (ballBounds.max.y > bounds.max.y) {
            let velocity = this.ball.velocity;
            velocity.y = -velocity.y;
            velocity.z = 0;
            this.ball.velocity = velocity.normalize().mulX(ballSpeed);
            this.playImpactSound();
        }
        // ball off board
        if (ballBounds.min.y < bounds.min.y) {
            this.ball.velocity = new geo.Vec3(0, 0, 0);
            this.ball.position = new geo.Vec3(0, this.paddle.position.y + this.paddle.halfExtents.y + this.ball.radius, this.ball.radius);
            this.playImpactSound();
            this.state = GameState.Launch;
            this.paddle.position = new geo.Vec3(0, this.fieldBottom + this.paddle.halfExtents.y + paddleBottomMargin, this.paddle.halfExtents.z);
            this.paddle.velocity = new geo.Vec3(0, 0, 0);
            this.ballsRemaining--;
            if (this.ballsRemaining <= 0) {
                this.gameOver();
                return;
            }
            return;
        }
        // clamp y velocity to avoid horizontal angles
        if (this.ball.velocity.lengthSq() > 0 && Math.abs(this.ball.velocity.y) < ballSpeed * .25) {
            this.ball.velocity.y = Math.sign(this.ball.velocity.y) * ballSpeed * .25;
            this.ball.velocity = this.ball.velocity.normalize().mulX(ballSpeed);
        }
    }
    gameOver() {
        this.ballsRemaining = 3;
        this.level = 1;
        this.wait(gameOverMessage, () => this.initLevel());
    }
    nextLevel() {
        this.level++;
        this.initLevel();
    }
    wait(msg, f) {
        this.message = msg;
        this.continue = f;
        this.state = GameState.Wait;
    }
    initLevel() {
        this.bricks.clear();
        this.state = GameState.Launch;
        this.message = startMessage;
        // playing field
        {
            const ixm = new gfx.IxMesh();
            // floor
            {
                const floor = gfx.IxMesh.rectFromCoords(this.fieldLeft, this.fieldBottom, -.25, this.fieldRight, this.fieldTop, 0);
                const floorColor = this.levelData.floorColor;
                floor.vertices.forEach(v => v.color = floorColor);
                ixm.cat(floor);
            }
            // border
            {
                const walls = new gfx.IxMesh();
                const borderColor = this.levelData.borderColor;
                walls.cat(gfx.IxMesh.rectFromCoords(this.fieldLeft - borderWidth, this.fieldBottom, -.25, this.fieldLeft, this.fieldTop, 1));
                walls.cat(gfx.IxMesh.rectFromCoords(this.fieldRight, this.fieldBottom, -.25, this.fieldRight + borderWidth, this.fieldTop, 1));
                walls.cat(gfx.IxMesh.rectFromCoords(this.fieldLeft - borderWidth, this.fieldTop, -.25, this.fieldRight + borderWidth, this.fieldTop + borderWidth, 1));
                walls.vertices.forEach(v => v.color = borderColor);
                ixm.cat(walls);
            }
            const vao = this.renderer.createMesh(ixm);
            this.fieldBatch = new gfx.Batch({
                vao: vao,
                numIndices: ixm.indices.length,
                roughness: 1
            });
        }
        // bricks
        {
            const brickHalfWidth = brickWidth / 2;
            const brickHalfHeight = brickHeight / 2;
            const brickHalfDepth = brickDepth / 2;
            const fieldXOffset = this.fieldLeft + Brick.halfExtents.x;
            const fieldYOffset = this.fieldTop - topRowMargin - brickHeight * this.levelData.brickRows;
            for (let i = 0; i < this.levelData.brickRows; ++i) {
                const yOffset = fieldYOffset + i * brickHeight + brickMargin;
                for (let j = 0; j < this.levelData.brickCols; ++j) {
                    const xOffset = fieldXOffset + j * (brickWidth + brickMargin);
                    const brickMin = new geo.Vec3(-brickHalfWidth + brickMargin, -brickHalfHeight + brickMargin, -brickHalfDepth);
                    const brickMax = new geo.Vec3(brickHalfWidth - brickMargin, brickHalfHeight - brickMargin, brickHalfDepth);
                    const aabb = new geo.AABB(brickMin, brickMax);
                    const ixm = gfx.IxMesh.rect(aabb);
                    const position = new geo.Vec3(xOffset, yOffset, brickHalfDepth);
                    const brick = new Brick({
                        position: position,
                        batch: new gfx.Batch({
                            worldMatrix: geo.Mat4.translation(position),
                            diffuseColor: rand.choose(this.rng, brickColors),
                            roughness: .8,
                            vao: this.renderer.createMesh(ixm),
                            numIndices: ixm.indices.length,
                        })
                    });
                    this.bricks.add(brick);
                }
            }
        }
        // add paddle
        {
            const width = this.levelData.paddleWidth;
            const halfExtents = new geo.Vec3(width / 2, paddleHeight / 2, paddleDepth / 2);
            const aabb = geo.AABB.fromHalfExtents(halfExtents);
            const ixm = gfx.IxMesh.rect(aabb);
            ixm.vertices.forEach(v => v.color = new geo.Vec4(0, 1, 1, 1));
            const vao = this.renderer.createMesh(ixm);
            this.paddle = new Paddle({
                halfExtents: halfExtents,
                position: new geo.Vec3(0, this.fieldBottom + halfExtents.y + paddleBottomMargin, halfExtents.z),
                batch: new gfx.Batch({
                    vao,
                    roughness: .5,
                    numIndices: ixm.indices.length
                })
            });
        }
        // add ball
        {
            const radius = this.levelData.ballRadius;
            const ixm = gfx.IxMesh.sphere(16, 16);
            ixm.transform(geo.Mat4.scaling(new geo.Vec3(radius, radius, radius)));
            ixm.vertices.forEach(v => v.color = new geo.Vec4(0, 0, 1, 1));
            const vao = this.renderer.createMesh(ixm);
            this.ball = new Ball({
                radius: radius,
                position: new geo.Vec3(0, this.paddle.position.y + this.paddle.halfExtents.y + radius, radius),
                batch: new gfx.Batch({
                    vao,
                    offset: 0,
                    roughness: 0,
                    numIndices: ixm.indices.length
                })
            });
        }
    }
    playImpactSound() {
        const sound = rand.choose(this.rng, this.impactSounds);
        const src = this.ac.createBufferSource();
        src.buffer = sound;
        src.connect(this.ac.destination);
        src.start();
    }
    findNearestPointOnBrick(brick, position) {
        const aabb = geo.AABB.fromPositionHalfExtents(brick.position, Brick.halfExtents);
        const nearest = position.clamp(aabb.min, aabb.max);
        return nearest;
    }
    findNearestBrick(position, radius) {
        const r2 = radius * radius;
        let minDistSq = r2;
        let nearestBrick = null;
        for (const brick of this.bricks) {
            const nearestPt = this.findNearestPointOnBrick(brick, position);
            const distSq = nearestPt.sub(position).lengthSq();
            if (distSq < minDistSq) {
                nearestBrick = brick;
                minDistSq = distSq;
            }
        }
        return nearestBrick;
    }
    updateWorldMatrices() {
        this.ball.batch.worldMatrix = geo.Mat4.translation(this.ball.position);
        this.paddle.batch.worldMatrix = geo.Mat4.translation(this.paddle.position);
    }
    drawScene() {
        // configure camera - fit play area to screen with some small margin
        let z = 0;
        const height = this.fieldTop - this.fieldBottom + borderWidth * 2;
        const width = this.fieldRight - this.fieldLeft + borderWidth * 2;
        const fieldAspect = width / height;
        if (fieldAspect < this.renderer.aspect) {
            z = height / 2 / Math.tan(this.renderer.fov / 2);
        }
        else {
            z = width / 2 / Math.tan(this.renderer.fov * this.renderer.aspect / 2);
        }
        this.renderer.viewMatrix = geo.Mat4.lookAt(new geo.Vec3(0, 0, 1 + z), new geo.Vec3(0, 0, -1), new geo.Vec3(0, 1, 0)).invert();
        // show from side view for debugging
        // this.renderer.viewMatrix = geo.Mat4.lookAt(
        //     new geo.Vec3(0, -16, 0), new geo.Vec3(0, 1, 0), new geo.Vec3(0, 0, 1)).invert()
        this.renderer.drawBatch(this.fieldBatch);
        this.renderer.drawBatch(this.ball.batch);
        this.renderer.drawBatch(this.paddle.batch);
        for (const brick of this.bricks) {
            this.renderer.drawBatch(brick.batch);
        }
        this.renderer.present();
    }
    canvasToNDC(cc) {
        const ndc = new geo.Vec2(cc.x / this.canvas.width * 2 - 1, -cc.y / this.canvas.height * 2 + 1);
        return ndc;
    }
    canvasToNDCRay(cc) {
        const ndc = this.canvasToNDC(cc);
        const ray = new geo.Ray(new geo.Vec3(ndc.x, ndc.y, -1), new geo.Vec3(0, 0, 1));
        return ray;
    }
    canvasToWorldRay(cc) {
        const ndcRay = this.canvasToNDCRay(cc);
        const invProj = this.renderer.projectionMatrix.invert();
        const invView = this.renderer.viewMatrix.invert();
        const invViewProj = this.renderer.projectionMatrix.matmul(this.renderer.viewMatrix).invert();
        const viewRay = ndcRay.transform(invProj);
        const worldRay = viewRay.transform(invView);
        if (this.inp.mouseLeftReleased) {
            console.log("cc: ", cc.toString());
            console.log("ndc: ", ndcRay.toString());
            console.log("view: ", viewRay.toString());
            console.log("world: ", worldRay.toString());
            console.log("world2: ", ndcRay.transform(invViewProj).toString());
        }
        return worldRay;
    }
}
function createRNG() {
    const seed = rand.xmur3(new Date().toString());
    const rng = new rand.SFC32RNG(seed(), seed(), seed(), seed());
    return rng;
}
const app = new App();
app.exec();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtvdXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJicmVha291dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQixNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUE7QUFDcEIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFBO0FBQ3JCLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQTtBQUNyQixNQUFNLFlBQVksR0FBRyxFQUFFLENBQUE7QUFDdkIsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFBO0FBQ3RCLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQTtBQUN0QixNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFDckIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFBO0FBQ3RCLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQTtBQUN2QixNQUFNLGtCQUFrQixHQUFHLENBQUMsQ0FBQTtBQUU1QixNQUFNLFlBQVksR0FBRyw4Q0FBOEMsQ0FBQTtBQUNuRSxNQUFNLGVBQWUsR0FBRyxxREFBcUQsQ0FBQTtBQUM3RSxNQUFNLGdCQUFnQixHQUFHLHVEQUF1RCxDQUFBO0FBWWhGLE1BQU0sTUFBTSxHQUFHLElBQUksS0FBSztBQUNwQixVQUFVO0FBQ1Y7SUFDSSxTQUFTLEVBQUUsR0FBRztJQUNkLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzdDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEdBQUc7SUFDZCxVQUFVLEVBQUUsQ0FBQztJQUNiLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQ3pDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsR0FBRztJQUNmLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ3ZDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEdBQUc7SUFDZCxVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ3pDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsR0FBRztJQUNmLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzdDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEdBQUc7SUFDZCxVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3JDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzFDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEdBQUc7SUFDZCxVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxHQUFHO0lBQ2hCLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUM3QztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxFQUFFO0lBQ2IsVUFBVSxFQUFFLEdBQUc7SUFDZixXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN2QyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUMzQztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxHQUFHO0lBQ2QsVUFBVSxFQUFFLEVBQUU7SUFDZCxXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUM3QztBQUNELFdBQVc7QUFDWDtJQUNJLFNBQVMsRUFBRSxFQUFFO0lBQ2IsVUFBVSxFQUFFLEVBQUU7SUFDZCxXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztDQUMxQyxDQUNKLENBQUE7QUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLEtBQUssQ0FDekIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3hCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3hCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUMxQixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQzFCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDMUIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM1QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQzVCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFF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QkFBaUIsRUFBRTtZQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUN6QyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7U0FDcEU7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNuQixDQUFDO0NBQ0o7QUFFRCxTQUFTLFNBQVM7SUFDZCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUM5QyxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUM3RCxPQUFPLEdBQUcsQ0FBQTtBQUNkLENBQUM7QUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFBO0FBQ3JCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzNkLmpzXCJcclxuaW1wb3J0ICogYXMgaW5wdXQgZnJvbSBcIi4uL3NoYXJlZC9pbnB1dC5qc1wiXHJcbmltcG9ydCAqIGFzIHJhbmQgZnJvbSBcIi4uL3NoYXJlZC9yYW5kLmpzXCJcclxuaW1wb3J0ICogYXMgbWF0aCBmcm9tIFwiLi4vc2hhcmVkL21hdGguanNcIlxyXG5pbXBvcnQgKiBhcyBhdWRpbyBmcm9tIFwiLi4vc2hhcmVkL2F1ZGlvLmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcblxyXG5jb25zdCBicmlja1dpZHRoID0gMlxyXG5jb25zdCBicmlja0hlaWdodCA9IDFcclxuY29uc3QgYnJpY2tEZXB0aCA9IC41XHJcbmNvbnN0IHBhZGRsZUhlaWdodCA9IC41XHJcbmNvbnN0IHBhZGRsZURlcHRoID0gLjVcclxuY29uc3QgcGFkZGxlU3BlZWQgPSAuNVxyXG5jb25zdCBib3JkZXJXaWR0aCA9IDFcclxuY29uc3QgdG9wUm93TWFyZ2luID0gMVxyXG5jb25zdCBicmlja01hcmdpbiA9IC4wNVxyXG5jb25zdCBwYWRkbGVCb3R0b21NYXJnaW4gPSAxXHJcblxyXG5jb25zdCBzdGFydE1lc3NhZ2UgPSBcIlRhcCwgY2xpY2ssIG9yIHByZXNzIGFueSBrZXkgdG8gbGF1bmNoIGJhbGwuXCJcclxuY29uc3QgZ2FtZU92ZXJNZXNzYWdlID0gXCJHYW1lIG92ZXIhIFRhcCwgY2xpY2ssIG9yIHByZXNzIGFueSBrZXkgdG8gcmVzdGFydC5cIlxyXG5jb25zdCBuZXh0TGV2ZWxNZXNzYWdlID0gXCJMZXZlbCBDbGVhciEgVGFwLCBjbGljaywgb3IgcHJlc3MgYW55IGtleSB0byBhZHZhbmNlLlwiXHJcblxyXG5pbnRlcmZhY2UgTGV2ZWxEYXRhIHtcclxuICAgIGJhbGxTcGVlZDogbnVtYmVyXHJcbiAgICBiYWxsUmFkaXVzOiBudW1iZXJcclxuICAgIHBhZGRsZVdpZHRoOiBudW1iZXJcclxuICAgIGJyaWNrUm93czogbnVtYmVyXHJcbiAgICBicmlja0NvbHM6IG51bWJlclxyXG4gICAgYm9yZGVyQ29sb3I6IGdlby5WZWM0XHJcbiAgICBmbG9vckNvbG9yOiBnZW8uVmVjNFxyXG59XHJcblxyXG5jb25zdCBsZXZlbHMgPSBuZXcgQXJyYXk8TGV2ZWxEYXRhPihcclxuICAgIC8vIGxldmVsIDFcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC4xNSxcclxuICAgICAgICBiYWxsUmFkaXVzOiAxLjI1LFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiA2LFxyXG4gICAgICAgIGJyaWNrUm93czogMyxcclxuICAgICAgICBicmlja0NvbHM6IDcsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCguMjUsIDAsIDAsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCguMjUsIC4yNSwgLjI1LCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDJcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC4xNSxcclxuICAgICAgICBiYWxsUmFkaXVzOiAxLFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiA2LFxyXG4gICAgICAgIGJyaWNrUm93czogMyxcclxuICAgICAgICBicmlja0NvbHM6IDcsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAuMjUsIDAsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAwLCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgM1xyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjIsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjc1LFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiA2LFxyXG4gICAgICAgIGJyaWNrUm93czogMyxcclxuICAgICAgICBicmlja0NvbHM6IDUsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAwLCAuNTUsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAwLCAwLCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDRcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC4yNSxcclxuICAgICAgICBiYWxsUmFkaXVzOiAuNixcclxuICAgICAgICBwYWRkbGVXaWR0aDogNSxcclxuICAgICAgICBicmlja1Jvd3M6IDMsXHJcbiAgICAgICAgYnJpY2tDb2xzOiA2LFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjYsIC41LCAwLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgLjI1LCAwLCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDVcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC4zLFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC41NSxcclxuICAgICAgICBwYWRkbGVXaWR0aDogNCxcclxuICAgICAgICBicmlja1Jvd3M6IDMsXHJcbiAgICAgICAgYnJpY2tDb2xzOiA4LFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgLjUsIC42LCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjI1LCAuMjUsIC4yNSwgMSlcclxuICAgIH0sXHJcbiAgICAvLyBsZXZlbCA2XHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuMzUsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjUsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDQsXHJcbiAgICAgICAgYnJpY2tSb3dzOiA0LFxyXG4gICAgICAgIGJyaWNrQ29sczogOCxcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KDEsIDAsIDAsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAuMywgLjI1LCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDdcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC4zNSxcclxuICAgICAgICBiYWxsUmFkaXVzOiAuNCxcclxuICAgICAgICBwYWRkbGVXaWR0aDogMy41LFxyXG4gICAgICAgIGJyaWNrUm93czogNCxcclxuICAgICAgICBicmlja0NvbHM6IDEwLFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoMSwgMSwgMCwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KC4yNSwgLjI1LCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgOFxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjQsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjM1LFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiAzLFxyXG4gICAgICAgIGJyaWNrUm93czogNSxcclxuICAgICAgICBicmlja0NvbHM6IDEwLFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjUsIC42LCAxLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjI1LCAwLCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgOVxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjQ1LFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC4zLFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiAyLFxyXG4gICAgICAgIGJyaWNrUm93czogNixcclxuICAgICAgICBicmlja0NvbHM6IDEyLFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgMSwgMSwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KC4zNSwgLjE1LCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgMTBcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC41LFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC4yLFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiAxLFxyXG4gICAgICAgIGJyaWNrUm93czogOCxcclxuICAgICAgICBicmlja0NvbHM6IDE1LFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoMSwgMSwgMSwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KC4xLCAuMSwgLjQsIDEpXHJcbiAgICB9LFxyXG4pXHJcblxyXG5jb25zdCBicmlja0NvbG9ycyA9IG5ldyBBcnJheTxnZW8uVmVjND4oXHJcbiAgICBuZXcgZ2VvLlZlYzQoMSwgMCwgMCwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMCwgMSwgMCwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMCwgMCwgMSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMCwgMSwgMSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMSwgMCwgMSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMSwgMSwgMSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoLjUsIC41LCAwLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgwLCAuNSwgLjUsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KC41LCAwLCAuNSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoLjI1LCAuNzUsIDAsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDAsIC4yNSwgLjc1LCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCguMjUsIDAsIC43NSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoLjc1LCAuMjUsIDAsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDAsIC43NSwgLjI1LCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCguNzUsIDAsIC4yNSwgMSksXHJcbilcclxuXHJcbmludGVyZmFjZSBQYWRkbGVPcHRpb25zIHtcclxuICAgIGhhbGZFeHRlbnRzOiBnZW8uVmVjM1xyXG4gICAgcG9zaXRpb246IGdlby5WZWMzXHJcbiAgICBiYXRjaDogZ2Z4LkJhdGNoXHJcbiAgICB2ZWxvY2l0eT86IGdlby5WZWMzXHJcbn1cclxuXHJcbmNsYXNzIFBhZGRsZSB7XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgaGFsZkV4dGVudHM6IGdlby5WZWMzXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgYmF0Y2ggPSBuZXcgZ2Z4LkJhdGNoKClcclxuICAgIHBvc2l0aW9uID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICB2ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFBhZGRsZU9wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLmhhbGZFeHRlbnRzID0gb3B0aW9ucy5oYWxmRXh0ZW50cy5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy5iYXRjaCA9IG9wdGlvbnMuYmF0Y2hcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbi5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy52ZWxvY2l0eSA9IG9wdGlvbnMudmVsb2NpdHk/LmNsb25lKCkgPz8gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSBCcmlja09wdGlvbnMge1xyXG4gICAgcG9zaXRpb246IGdlby5WZWMzXHJcbiAgICBiYXRjaDogZ2Z4LkJhdGNoXHJcbn1cclxuXHJcbmNsYXNzIEJyaWNrIHtcclxuICAgIHB1YmxpYyByZWFkb25seSBiYXRjaCA9IG5ldyBnZnguQmF0Y2goKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IHBvc2l0aW9uID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICBzdGF0aWMgcmVhZG9ubHkgaGFsZkV4dGVudHMgPSBuZXcgZ2VvLlZlYzMoYnJpY2tXaWR0aCAvIDIgLSBicmlja01hcmdpbiwgYnJpY2tIZWlnaHQgLyAyIC0gYnJpY2tNYXJnaW4sIGJyaWNrRGVwdGggLyAyKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEJyaWNrT3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uLmNsb25lKClcclxuICAgICAgICB0aGlzLmJhdGNoID0gb3B0aW9ucy5iYXRjaFxyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgQmFsbE9wdGlvbnMge1xyXG4gICAgcmFkaXVzOiBudW1iZXJcclxuICAgIHBvc2l0aW9uOiBnZW8uVmVjM1xyXG4gICAgYmF0Y2g6IGdmeC5CYXRjaFxyXG4gICAgdmVsb2NpdHk/OiBnZW8uVmVjM1xyXG59XHJcblxyXG5jbGFzcyBCYWxsIHtcclxuICAgIHJhZGl1czogbnVtYmVyID0gMVxyXG4gICAgcG9zaXRpb246IGdlby5WZWMzXHJcbiAgICBiYXRjaDogZ2Z4LkJhdGNoXHJcbiAgICB2ZWxvY2l0eTogZ2VvLlZlYzNcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBCYWxsT3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMucmFkaXVzID0gb3B0aW9ucy5yYWRpdXNcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbi5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy5iYXRjaCA9IG9wdGlvbnMuYmF0Y2hcclxuICAgICAgICB0aGlzLnZlbG9jaXR5ID0gb3B0aW9ucy52ZWxvY2l0eT8uY2xvbmUoKSA/PyBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgIH1cclxufVxyXG5cclxuZW51bSBHYW1lU3RhdGUge1xyXG4gICAgUGxheSxcclxuICAgIExhdW5jaCxcclxuICAgIFdhaXRcclxufVxyXG5cclxuLy8gc3RlcCAxIC0gY2xlYXIgc2NyZWVuLCBpbml0IGdsLCBldGMuLi5cclxuLy8gc3RlcCAyIC0gZHJhdyBhIGNsaXAgc3BhY2UgdHJpYW5nbGVcclxuLy8gc3RlcCAzIC0gZHJhdyBhIHdvcmxkIHNwYWNlIHRyaWFuZ2xlXHJcbmNsYXNzIEFwcCB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJuZyA9IGNyZWF0ZVJORygpO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW52YXMgPSBkb20uYnlJZChcImNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsZXZlbFNwYW4gPSBkb20uYnlJZChcImxldmVsXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGJhbGxzUmVtYWluaW5nU3BhbiA9IGRvbS5ieUlkKFwiYmFsbHNSZW1haW5pbmdcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbWVzc2FnZURpdiA9IGRvbS5ieUlkKFwibWVzc2FnZVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZW5kZXJlciA9IG5ldyBnZnguUmVuZGVyZXIodGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGlucCA9IG5ldyBpbnB1dC5JbnB1dCh0aGlzLmNhbnZhcylcclxuICAgIHByaXZhdGUgZmllbGRCYXRjaDogZ2Z4LkJhdGNoID0gbmV3IGdmeC5CYXRjaCgpXHJcbiAgICBwcml2YXRlIHBhZGRsZSE6IFBhZGRsZVxyXG4gICAgcHJpdmF0ZSBiYWxsITogQmFsbFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBicmlja3MgPSBuZXcgU2V0PEJyaWNrPigpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFjID0gbmV3IEF1ZGlvQ29udGV4dCgpXHJcbiAgICBwcml2YXRlIGltcGFjdFNvdW5kcyA9IG5ldyBBcnJheTxBdWRpb0J1ZmZlcj4oKVxyXG4gICAgcHJpdmF0ZSBiYWxsc1JlbWFpbmluZyA9IDNcclxuICAgIHByaXZhdGUgbGV2ZWwgPSA5XHJcbiAgICBwcml2YXRlIHN0YXRlID0gR2FtZVN0YXRlLkxhdW5jaFxyXG4gICAgcHJpdmF0ZSBjb250aW51ZSA9ICgpID0+IHsgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWMoKSB7XHJcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gc3RhcnRNZXNzYWdlXHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsICgpID0+IHRoaXMuaGFuZGxlS2V5VXAoKSlcclxuXHJcbiAgICAgICAgdGhpcy5pbml0TGV2ZWwoKVxyXG4gICAgICAgIGF3YWl0IHRoaXMuaW5pdEF1ZGlvKClcclxuICAgICAgICB0aGlzLmNhbnZhcy5mb2N1cygpXHJcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMudGljaygpKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgaW5pdEF1ZGlvKCkge1xyXG4gICAgICAgIGNvbnN0IG51bUltcGFjdFNvdW5kcyA9IDE1XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gbnVtSW1wYWN0U291bmRzOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgdXJsID0gYC4vYXNzZXRzL2ltcGFjdCR7aX0ud2F2YFxyXG4gICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCBhdWRpby5sb2FkQXVkaW8odGhpcy5hYywgdXJsKVxyXG4gICAgICAgICAgICB0aGlzLmltcGFjdFNvdW5kcy5wdXNoKGJ1ZmZlcilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB0aWNrKCkge1xyXG4gICAgICAgIHRoaXMuY2hlY2tTaXplKClcclxuICAgICAgICB0aGlzLnVwZGF0ZSgpXHJcbiAgICAgICAgdGhpcy5kcmF3U2NlbmUoKVxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLnRpY2soKSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNoZWNrU2l6ZSgpIHtcclxuICAgICAgICBpZiAodGhpcy5jYW52YXMud2lkdGggPT09IHRoaXMuY2FudmFzLmNsaWVudFdpZHRoICYmIHRoaXMuY2FudmFzLmhlaWdodCA9PT0gdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLmNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlKCkge1xyXG4gICAgICAgIHRoaXMucGFkZGxlLnBvc2l0aW9uID0gdGhpcy5wYWRkbGUucG9zaXRpb24uYWRkKHRoaXMucGFkZGxlLnZlbG9jaXR5KVxyXG4gICAgICAgIHRoaXMuYmFsbC5wb3NpdGlvbiA9IHRoaXMuYmFsbC5wb3NpdGlvbi5hZGQodGhpcy5iYWxsLnZlbG9jaXR5KVxyXG4gICAgICAgIHRoaXMuaGFuZGxlSW5wdXQoKVxyXG4gICAgICAgIHRoaXMuaGFuZGxlQ29sbGlzaW9uKClcclxuICAgICAgICB0aGlzLnVwZGF0ZVdvcmxkTWF0cmljZXMoKVxyXG4gICAgICAgIHRoaXMudXBkYXRlVUkoKVxyXG4gICAgICAgIHRoaXMuaW5wLmZsdXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZVVJKCkge1xyXG4gICAgICAgIHRoaXMuYmFsbHNSZW1haW5pbmdTcGFuLnRleHRDb250ZW50ID0gdGhpcy5iYWxsc1JlbWFpbmluZy50b1N0cmluZygpXHJcbiAgICAgICAgdGhpcy5sZXZlbFNwYW4udGV4dENvbnRlbnQgPSB0aGlzLmxldmVsLnRvU3RyaW5nKClcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubWVzc2FnZSkge1xyXG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2VEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2VEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBsZXZlbERhdGEoKTogTGV2ZWxEYXRhIHtcclxuICAgICAgICBjb25zdCBkYXRhID0gbGV2ZWxzW01hdGgubWluKHRoaXMubGV2ZWwgLSAxLCBsZXZlbHMubGVuZ3RoIC0gMSldXHJcbiAgICAgICAgcmV0dXJuIGRhdGFcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBmaWVsZFdpZHRoKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIGJyaWNrV2lkdGggKiB0aGlzLmxldmVsRGF0YS5icmlja0NvbHNcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBmaWVsZEhlaWdodCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBicmlja0hlaWdodCAqIHRoaXMubGV2ZWxEYXRhLmJyaWNrUm93cyAqIDQgKyB0b3BSb3dNYXJnaW5cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBmaWVsZExlZnQoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gLXRoaXMuZmllbGRXaWR0aCAvIDJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBmaWVsZFJpZ2h0KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmllbGRMZWZ0ICsgdGhpcy5maWVsZFdpZHRoXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRCb3R0b20oKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gLXRoaXMuZmllbGRIZWlnaHQgLyAyXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRUb3AoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5maWVsZEJvdHRvbSArIHRoaXMuZmllbGRIZWlnaHRcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBtZXNzYWdlKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZURpdi50ZXh0Q29udGVudCA/PyBcIlwiXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzZXQgbWVzc2FnZSh0ZXh0OiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLm1lc3NhZ2VEaXYudGV4dENvbnRlbnQgPSB0ZXh0XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVLZXlVcCgpIHtcclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSA9PT0gR2FtZVN0YXRlLlBsYXkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSA9PT0gR2FtZVN0YXRlLldhaXQpIHtcclxuICAgICAgICAgICAgdGhpcy5jb250aW51ZSgpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5sYXVuY2hCYWxsKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUlucHV0KCkge1xyXG4gICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xyXG4gICAgICAgICAgICBjYXNlIEdhbWVTdGF0ZS5MYXVuY2g6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUlucHV0TGF1bmNoKClcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIEdhbWVTdGF0ZS5QbGF5OlxyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dFBsYXkoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgR2FtZVN0YXRlLldhaXQ6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUlucHV0V2FpdCgpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUlucHV0TGF1bmNoKCk6IHZvaWQge1xyXG4gICAgICAgIC8vIHN0YXJ0IGdhbWUgb24gbW91c2UgY2lja1xyXG4gICAgICAgIGlmICh0aGlzLmlucC5tb3VzZUxlZnRQcmVzc2VkKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGF1bmNoQmFsbCgpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlSW5wdXRQbGF5KCkge1xyXG4gICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcblxyXG4gICAgICAgIC8vIG1vdXNlIC8gdG91Y2ggcGFkZGxlIG1vdmVtZW50XHJcbiAgICAgICAgaWYgKHRoaXMuaW5wLm1vdXNlTGVmdERvd24pIHtcclxuICAgICAgICAgICAgY29uc3Qgd29ybGRNb3VzZVJheSA9IHRoaXMuY2FudmFzVG9Xb3JsZFJheShuZXcgZ2VvLlZlYzIodGhpcy5pbnAubW91c2VYLCB0aGlzLmlucC5tb3VzZVkpKVxyXG4gICAgICAgICAgICBjb25zdCBmaWVsZFBsYW5lID0gZ2VvLlBsYW5lLmZyb21Qb2ludE5vcm1hbCh0aGlzLnBhZGRsZS5wb3NpdGlvbiwgbmV3IGdlby5WZWMzKDAsIDAsIDEpKVxyXG4gICAgICAgICAgICBjb25zdCBmaWVsZEl4ID0gd29ybGRNb3VzZVJheS5sZXJwKHdvcmxkTW91c2VSYXkuY2FzdChmaWVsZFBsYW5lKSlcclxuICAgICAgICAgICAgaWYgKGZpZWxkSXgueCA+IHRoaXMucGFkZGxlLnBvc2l0aW9uLngpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDEsIDAsIDApXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZmllbGRJeC54IDwgdGhpcy5wYWRkbGUucG9zaXRpb24ueCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoLTEsIDAsIDApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGtleWJvYXJkIHBhZGRsZSBtb3ZlbWVudFxyXG4gICAgICAgIGlmICh0aGlzLmlucC5kb3duKFwiYVwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygtMSwgMCwgMClcclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaW5wLmRvd24oXCJkXCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDEsIDAsIDApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5wYWRkbGUudmVsb2NpdHkubGVuZ3RoU3EoKSA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSB0aGlzLnBhZGRsZS52ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKHBhZGRsZVNwZWVkKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUlucHV0V2FpdCgpIHtcclxuICAgICAgICBpZiAodGhpcy5pbnAubW91c2VMZWZ0RG93bikge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRpbnVlKClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBsYXVuY2hCYWxsKCkge1xyXG4gICAgICAgIC8vIGNob29zZSByYW5kb20gdXB3YXJkIGxhdW5jaCBkaXJlY3Rpb25cclxuICAgICAgICBjb25zdCByb3QgPSBnZW8uTWF0My5yb3RhdGlvbloocmFuZC5mbG9hdCh0aGlzLnJuZywgLU1hdGguUEkgLyA0LCBNYXRoLlBJIC8gNCkpXHJcbiAgICAgICAgY29uc3QgdiA9IHJvdC50cmFuc2Zvcm0obmV3IGdlby5WZWMzKDAsIDEsIDApKS5ub3JtYWxpemUoKVxyXG4gICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eSA9IHYubXVsWCh0aGlzLmxldmVsRGF0YS5iYWxsU3BlZWQpXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IEdhbWVTdGF0ZS5QbGF5XHJcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gXCJcIlxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlQ29sbGlzaW9uKCkge1xyXG4gICAgICAgIGlmICh0aGlzLnN0YXRlICE9PSBHYW1lU3RhdGUuUGxheSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGlzIHBhZGRsZSBnb2luZyB0byBjcm9zcyBib3VuZGFyeT9cclxuICAgICAgICBjb25zdCBib3VuZHMgPSBnZW8uQUFCQi5mcm9tQ29vcmRzKFxyXG4gICAgICAgICAgICB0aGlzLmZpZWxkTGVmdCwgdGhpcy5maWVsZEJvdHRvbSwgLTEsXHJcbiAgICAgICAgICAgIHRoaXMuZmllbGRSaWdodCwgdGhpcy5maWVsZFRvcCwgMSlcclxuXHJcbiAgICAgICAgY29uc3QgcGFkZGxlUG9zaXRpb24gPSB0aGlzLnBhZGRsZS5wb3NpdGlvbi5hZGQodGhpcy5wYWRkbGUudmVsb2NpdHkpXHJcbiAgICAgICAgY29uc3QgcGFkZGxlQm91bmRzID0gZ2VvLkFBQkIuZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMocGFkZGxlUG9zaXRpb24sIHRoaXMucGFkZGxlLmhhbGZFeHRlbnRzKVxyXG5cclxuICAgICAgICBjb25zdCBiYWxsUG9zaXRpb24gPSB0aGlzLmJhbGwucG9zaXRpb24uYWRkKHRoaXMuYmFsbC52ZWxvY2l0eSlcclxuICAgICAgICBjb25zdCBiYWxsQm91bmRzID0gZ2VvLkFBQkIuZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMoYmFsbFBvc2l0aW9uLCBuZXcgZ2VvLlZlYzModGhpcy5iYWxsLnJhZGl1cywgdGhpcy5iYWxsLnJhZGl1cywgdGhpcy5iYWxsLnJhZGl1cykpXHJcbiAgICAgICAgY29uc3QgYmFsbFNwZWVkID0gdGhpcy5sZXZlbERhdGEuYmFsbFNwZWVkXHJcblxyXG4gICAgICAgIC8vIGNoZWNrIHBhZGRsZSBhZ2FpbnN0IGJvdW5kYXJ5XHJcbiAgICAgICAgaWYgKHBhZGRsZUJvdW5kcy5taW4ueCA8PSB0aGlzLmZpZWxkTGVmdCB8fCBwYWRkbGVCb3VuZHMubWF4LnggPj0gdGhpcy5maWVsZFJpZ2h0KSB7XHJcbiAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBiYWxsIC8gcGFkZGxlIGhpdCBjaGVja1xyXG4gICAgICAgIGlmIChiYWxsQm91bmRzLm92ZXJsYXBzKHBhZGRsZUJvdW5kcykpIHtcclxuICAgICAgICAgICAgbGV0IHZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5XHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnkgPSAtdmVsb2NpdHkueVxyXG5cclxuICAgICAgICAgICAgLy8gYWxsb3cgcGxheWVyIHNvbWUgY29udHJvbFxyXG4gICAgICAgICAgICAvLyByaWdodCBzaWRlIG9mIHBhZGRsZSByb3RhdGVzIGFuZ2xlIHJpZ2h0XHJcbiAgICAgICAgICAgIC8vIGxlZnQgc2lkZSBvZiBwYWRkbGUgcm90YXRlcyBhbmdsZSBsZWZ0XHJcbiAgICAgICAgICAgIGNvbnN0IGFhYmIgPSBnZW8uQUFCQi5mcm9tUG9zaXRpb25IYWxmRXh0ZW50cyhwYWRkbGVQb3NpdGlvbiwgdGhpcy5wYWRkbGUuaGFsZkV4dGVudHMpXHJcbiAgICAgICAgICAgIGNvbnN0IG5lYXJlc3QgPSBiYWxsUG9zaXRpb24uY2xhbXAoYWFiYi5taW4sIGFhYmIubWF4KVxyXG4gICAgICAgICAgICBjb25zdCB0ID0gbWF0aC51bmxlcnAoYWFiYi5taW4ueCwgYWFiYi5tYXgueCwgbmVhcmVzdC54KVxyXG4gICAgICAgICAgICBjb25zdCByb3QgPSBnZW8uTWF0NC5yb3RhdGlvbloobWF0aC5sZXJwKC1NYXRoLlBJIC8gNCwgTWF0aC5QSSAvIDQsIHQpKVxyXG5cclxuICAgICAgICAgICAgLy8gY2hvb3NlIGEgcmFuZG9tIGRldmlhdGlvbiBmcm9tIHN0YW5kYXJkIHJlZmxlY3Rpb24gYW5nbGVcclxuICAgICAgICAgICAgdmVsb2NpdHkgPSByb3QudHJhbnNmb3JtMyh2ZWxvY2l0eSlcclxuICAgICAgICAgICAgdmVsb2NpdHkueiA9IDBcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gdmVsb2NpdHkubm9ybWFsaXplKCkubXVsWChiYWxsU3BlZWQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoYW5kbGUgYnJpY2sgaGl0XHJcbiAgICAgICAgY29uc3QgbmVhcmVzdEJyaWNrID0gdGhpcy5maW5kTmVhcmVzdEJyaWNrKGJhbGxQb3NpdGlvbiwgdGhpcy5iYWxsLnJhZGl1cylcclxuICAgICAgICBpZiAobmVhcmVzdEJyaWNrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFhYmIgPSBnZW8uQUFCQi5mcm9tUG9zaXRpb25IYWxmRXh0ZW50cyhuZWFyZXN0QnJpY2sucG9zaXRpb24sIEJyaWNrLmhhbGZFeHRlbnRzKVxyXG4gICAgICAgICAgICBjb25zdCBuZWFyZXN0UHQgPSB0aGlzLmZpbmROZWFyZXN0UG9pbnRPbkJyaWNrKG5lYXJlc3RCcmljaywgYmFsbFBvc2l0aW9uKVxyXG4gICAgICAgICAgICBsZXQgdmVsb2NpdHkgPSB0aGlzLmJhbGwudmVsb2NpdHlcclxuXHJcbiAgICAgICAgICAgIGlmIChuZWFyZXN0UHQueSA8PSBhYWJiLm1pbi55ICsgLjAxKSB7XHJcbiAgICAgICAgICAgICAgICB2ZWxvY2l0eS55ID0gLXZlbG9jaXR5LnlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG5lYXJlc3RQdC54IDw9IGFhYmIubWluLnggKyAuMDEpIHtcclxuICAgICAgICAgICAgICAgIHZlbG9jaXR5LnggPSAtdmVsb2NpdHkueFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobmVhcmVzdFB0LnggPj0gYWFiYi5tYXgueCAtIC4wMSkge1xyXG4gICAgICAgICAgICAgICAgdmVsb2NpdHkueCA9IC12ZWxvY2l0eS54XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChuZWFyZXN0UHQueSA+IGFhYmIubWF4LnkgLSAuMDEpIHtcclxuICAgICAgICAgICAgICAgIHZlbG9jaXR5LnkgPSAtdmVsb2NpdHkueVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB2ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKGJhbGxTcGVlZClcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5LnogPSAwXHJcbiAgICAgICAgICAgIHRoaXMuYnJpY2tzLmRlbGV0ZShuZWFyZXN0QnJpY2spXHJcbiAgICAgICAgICAgIHRoaXMucGxheUltcGFjdFNvdW5kKClcclxuXHJcbiAgICAgICAgICAgIC8vIGlmIG5vIGJyaWNrcywgbW92ZSB0byBuZXh0IGxldmVsXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJyaWNrcy5zaXplID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgICAgICAgICAgICAgIHRoaXMud2FpdChuZXh0TGV2ZWxNZXNzYWdlLCAoKSA9PiB0aGlzLm5leHRMZXZlbCgpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGlzIGJhbGwgZ29pbmcgdG8gY3Jvc3MgYm91bmRhcnk/XHJcbiAgICAgICAgaWYgKGJhbGxCb3VuZHMubWluLnggPCBib3VuZHMubWluLnggfHwgYmFsbEJvdW5kcy5tYXgueCA+IGJvdW5kcy5tYXgueCkge1xyXG4gICAgICAgICAgICBsZXQgdmVsb2NpdHkgPSB0aGlzLmJhbGwudmVsb2NpdHlcclxuICAgICAgICAgICAgdmVsb2NpdHkueCA9IC12ZWxvY2l0eS54XHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnogPSAwXHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eSA9IHZlbG9jaXR5Lm5vcm1hbGl6ZSgpLm11bFgoYmFsbFNwZWVkKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXlJbXBhY3RTb3VuZCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYmFsbEJvdW5kcy5tYXgueSA+IGJvdW5kcy5tYXgueSkge1xyXG4gICAgICAgICAgICBsZXQgdmVsb2NpdHkgPSB0aGlzLmJhbGwudmVsb2NpdHlcclxuICAgICAgICAgICAgdmVsb2NpdHkueSA9IC12ZWxvY2l0eS55XHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnogPSAwXHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eSA9IHZlbG9jaXR5Lm5vcm1hbGl6ZSgpLm11bFgoYmFsbFNwZWVkKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXlJbXBhY3RTb3VuZCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBiYWxsIG9mZiBib2FyZFxyXG4gICAgICAgIGlmIChiYWxsQm91bmRzLm1pbi55IDwgYm91bmRzLm1pbi55KSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgICAgICAgICB0aGlzLmJhbGwucG9zaXRpb24gPSBuZXcgZ2VvLlZlYzMoMCwgdGhpcy5wYWRkbGUucG9zaXRpb24ueSArIHRoaXMucGFkZGxlLmhhbGZFeHRlbnRzLnkgKyB0aGlzLmJhbGwucmFkaXVzLCB0aGlzLmJhbGwucmFkaXVzKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXlJbXBhY3RTb3VuZCgpXHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBHYW1lU3RhdGUuTGF1bmNoXHJcbiAgICAgICAgICAgIHRoaXMucGFkZGxlLnBvc2l0aW9uID0gbmV3IGdlby5WZWMzKDAsIHRoaXMuZmllbGRCb3R0b20gKyB0aGlzLnBhZGRsZS5oYWxmRXh0ZW50cy55ICsgcGFkZGxlQm90dG9tTWFyZ2luLCB0aGlzLnBhZGRsZS5oYWxmRXh0ZW50cy56KVxyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgICAgICAgICB0aGlzLmJhbGxzUmVtYWluaW5nLS1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJhbGxzUmVtYWluaW5nIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2FtZU92ZXIoKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY2xhbXAgeSB2ZWxvY2l0eSB0byBhdm9pZCBob3Jpem9udGFsIGFuZ2xlc1xyXG4gICAgICAgIGlmICh0aGlzLmJhbGwudmVsb2NpdHkubGVuZ3RoU3EoKSA+IDAgJiYgTWF0aC5hYnModGhpcy5iYWxsLnZlbG9jaXR5LnkpIDwgYmFsbFNwZWVkICogLjI1KSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eS55ID0gTWF0aC5zaWduKHRoaXMuYmFsbC52ZWxvY2l0eS55KSAqIGJhbGxTcGVlZCAqIC4yNVxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB0aGlzLmJhbGwudmVsb2NpdHkubm9ybWFsaXplKCkubXVsWChiYWxsU3BlZWQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2FtZU92ZXIoKSB7XHJcbiAgICAgICAgdGhpcy5iYWxsc1JlbWFpbmluZyA9IDNcclxuICAgICAgICB0aGlzLmxldmVsID0gMVxyXG4gICAgICAgIHRoaXMud2FpdChnYW1lT3Zlck1lc3NhZ2UsICgpID0+IHRoaXMuaW5pdExldmVsKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBuZXh0TGV2ZWwoKSB7XHJcbiAgICAgICAgdGhpcy5sZXZlbCsrXHJcbiAgICAgICAgdGhpcy5pbml0TGV2ZWwoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgd2FpdChtc2c6IHN0cmluZywgZjogKCkgPT4gdm9pZCkge1xyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IG1zZ1xyXG4gICAgICAgIHRoaXMuY29udGludWUgPSBmXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IEdhbWVTdGF0ZS5XYWl0XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBpbml0TGV2ZWwoKSB7XHJcbiAgICAgICAgdGhpcy5icmlja3MuY2xlYXIoKVxyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBHYW1lU3RhdGUuTGF1bmNoXHJcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gc3RhcnRNZXNzYWdlXHJcblxyXG4gICAgICAgIC8vIHBsYXlpbmcgZmllbGRcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl4bSA9IG5ldyBnZnguSXhNZXNoKClcclxuXHJcbiAgICAgICAgICAgIC8vIGZsb29yXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZsb29yID0gZ2Z4Lkl4TWVzaC5yZWN0RnJvbUNvb3Jkcyh0aGlzLmZpZWxkTGVmdCwgdGhpcy5maWVsZEJvdHRvbSwgLS4yNSwgdGhpcy5maWVsZFJpZ2h0LCB0aGlzLmZpZWxkVG9wLCAwKVxyXG4gICAgICAgICAgICAgICAgY29uc3QgZmxvb3JDb2xvciA9IHRoaXMubGV2ZWxEYXRhLmZsb29yQ29sb3JcclxuICAgICAgICAgICAgICAgIGZsb29yLnZlcnRpY2VzLmZvckVhY2godiA9PiB2LmNvbG9yID0gZmxvb3JDb2xvcilcclxuICAgICAgICAgICAgICAgIGl4bS5jYXQoZmxvb3IpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGJvcmRlclxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB3YWxscyA9IG5ldyBnZnguSXhNZXNoKClcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJvcmRlckNvbG9yID0gdGhpcy5sZXZlbERhdGEuYm9yZGVyQ29sb3JcclxuICAgICAgICAgICAgICAgIHdhbGxzLmNhdChnZnguSXhNZXNoLnJlY3RGcm9tQ29vcmRzKHRoaXMuZmllbGRMZWZ0IC0gYm9yZGVyV2lkdGgsIHRoaXMuZmllbGRCb3R0b20sIC0uMjUsIHRoaXMuZmllbGRMZWZ0LCB0aGlzLmZpZWxkVG9wLCAxKSlcclxuICAgICAgICAgICAgICAgIHdhbGxzLmNhdChnZnguSXhNZXNoLnJlY3RGcm9tQ29vcmRzKHRoaXMuZmllbGRSaWdodCwgdGhpcy5maWVsZEJvdHRvbSwgLS4yNSwgdGhpcy5maWVsZFJpZ2h0ICsgYm9yZGVyV2lkdGgsIHRoaXMuZmllbGRUb3AsIDEpKVxyXG4gICAgICAgICAgICAgICAgd2FsbHMuY2F0KGdmeC5JeE1lc2gucmVjdEZyb21Db29yZHModGhpcy5maWVsZExlZnQgLSBib3JkZXJXaWR0aCwgdGhpcy5maWVsZFRvcCwgLS4yNSwgdGhpcy5maWVsZFJpZ2h0ICsgYm9yZGVyV2lkdGgsIHRoaXMuZmllbGRUb3AgKyBib3JkZXJXaWR0aCwgMSkpXHJcbiAgICAgICAgICAgICAgICB3YWxscy52ZXJ0aWNlcy5mb3JFYWNoKHYgPT4gdi5jb2xvciA9IGJvcmRlckNvbG9yKVxyXG4gICAgICAgICAgICAgICAgaXhtLmNhdCh3YWxscylcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgdmFvID0gdGhpcy5yZW5kZXJlci5jcmVhdGVNZXNoKGl4bSlcclxuICAgICAgICAgICAgdGhpcy5maWVsZEJhdGNoID0gbmV3IGdmeC5CYXRjaCh7XHJcbiAgICAgICAgICAgICAgICB2YW86IHZhbyxcclxuICAgICAgICAgICAgICAgIG51bUluZGljZXM6IGl4bS5pbmRpY2VzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgIHJvdWdobmVzczogMVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYnJpY2tzXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCBicmlja0hhbGZXaWR0aCA9IGJyaWNrV2lkdGggLyAyXHJcbiAgICAgICAgICAgIGNvbnN0IGJyaWNrSGFsZkhlaWdodCA9IGJyaWNrSGVpZ2h0IC8gMlxyXG4gICAgICAgICAgICBjb25zdCBicmlja0hhbGZEZXB0aCA9IGJyaWNrRGVwdGggLyAyXHJcblxyXG4gICAgICAgICAgICBjb25zdCBmaWVsZFhPZmZzZXQgPSB0aGlzLmZpZWxkTGVmdCArIEJyaWNrLmhhbGZFeHRlbnRzLnhcclxuICAgICAgICAgICAgY29uc3QgZmllbGRZT2Zmc2V0ID0gdGhpcy5maWVsZFRvcCAtIHRvcFJvd01hcmdpbiAtIGJyaWNrSGVpZ2h0ICogdGhpcy5sZXZlbERhdGEuYnJpY2tSb3dzXHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubGV2ZWxEYXRhLmJyaWNrUm93czsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB5T2Zmc2V0ID0gZmllbGRZT2Zmc2V0ICsgaSAqIGJyaWNrSGVpZ2h0ICsgYnJpY2tNYXJnaW5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhpcy5sZXZlbERhdGEuYnJpY2tDb2xzOyArK2opIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB4T2Zmc2V0ID0gZmllbGRYT2Zmc2V0ICsgaiAqIChicmlja1dpZHRoICsgYnJpY2tNYXJnaW4pXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYnJpY2tNaW4gPSBuZXcgZ2VvLlZlYzMoLWJyaWNrSGFsZldpZHRoICsgYnJpY2tNYXJnaW4sIC1icmlja0hhbGZIZWlnaHQgKyBicmlja01hcmdpbiwgLWJyaWNrSGFsZkRlcHRoKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJyaWNrTWF4ID0gbmV3IGdlby5WZWMzKGJyaWNrSGFsZldpZHRoIC0gYnJpY2tNYXJnaW4sIGJyaWNrSGFsZkhlaWdodCAtIGJyaWNrTWFyZ2luLCBicmlja0hhbGZEZXB0aClcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhYWJiID0gbmV3IGdlby5BQUJCKGJyaWNrTWluLCBicmlja01heClcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpeG0gPSBnZnguSXhNZXNoLnJlY3QoYWFiYilcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9IG5ldyBnZW8uVmVjMyh4T2Zmc2V0LCB5T2Zmc2V0LCBicmlja0hhbGZEZXB0aClcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYnJpY2sgPSBuZXcgQnJpY2soe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhdGNoOiBuZXcgZ2Z4LkJhdGNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmxkTWF0cml4OiBnZW8uTWF0NC50cmFuc2xhdGlvbihwb3NpdGlvbiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmdXNlQ29sb3I6IHJhbmQuY2hvb3NlKHRoaXMucm5nLCBicmlja0NvbG9ycyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3VnaG5lc3M6IC44LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFvOiB0aGlzLnJlbmRlcmVyLmNyZWF0ZU1lc2goaXhtKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bUluZGljZXM6IGl4bS5pbmRpY2VzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJyaWNrcy5hZGQoYnJpY2spXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFkZCBwYWRkbGVcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5sZXZlbERhdGEucGFkZGxlV2lkdGhcclxuICAgICAgICAgICAgY29uc3QgaGFsZkV4dGVudHMgPSBuZXcgZ2VvLlZlYzMod2lkdGggLyAyLCBwYWRkbGVIZWlnaHQgLyAyLCBwYWRkbGVEZXB0aCAvIDIpXHJcbiAgICAgICAgICAgIGNvbnN0IGFhYmIgPSBnZW8uQUFCQi5mcm9tSGFsZkV4dGVudHMoaGFsZkV4dGVudHMpXHJcbiAgICAgICAgICAgIGNvbnN0IGl4bSA9IGdmeC5JeE1lc2gucmVjdChhYWJiKVxyXG4gICAgICAgICAgICBpeG0udmVydGljZXMuZm9yRWFjaCh2ID0+IHYuY29sb3IgPSBuZXcgZ2VvLlZlYzQoMCwgMSwgMSwgMSkpXHJcblxyXG4gICAgICAgICAgICBjb25zdCB2YW8gPSB0aGlzLnJlbmRlcmVyLmNyZWF0ZU1lc2goaXhtKVxyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZSA9IG5ldyBQYWRkbGUoe1xyXG4gICAgICAgICAgICAgICAgaGFsZkV4dGVudHM6IGhhbGZFeHRlbnRzLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5ldyBnZW8uVmVjMygwLCB0aGlzLmZpZWxkQm90dG9tICsgaGFsZkV4dGVudHMueSArIHBhZGRsZUJvdHRvbU1hcmdpbiwgaGFsZkV4dGVudHMueiksXHJcbiAgICAgICAgICAgICAgICBiYXRjaDogbmV3IGdmeC5CYXRjaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFvLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdWdobmVzczogLjUsXHJcbiAgICAgICAgICAgICAgICAgICAgbnVtSW5kaWNlczogaXhtLmluZGljZXMubGVuZ3RoXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYWRkIGJhbGxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJhZGl1cyA9IHRoaXMubGV2ZWxEYXRhLmJhbGxSYWRpdXNcclxuICAgICAgICAgICAgY29uc3QgaXhtID0gZ2Z4Lkl4TWVzaC5zcGhlcmUoMTYsIDE2KVxyXG4gICAgICAgICAgICBpeG0udHJhbnNmb3JtKGdlby5NYXQ0LnNjYWxpbmcobmV3IGdlby5WZWMzKHJhZGl1cywgcmFkaXVzLCByYWRpdXMpKSlcclxuICAgICAgICAgICAgaXhtLnZlcnRpY2VzLmZvckVhY2godiA9PiB2LmNvbG9yID0gbmV3IGdlby5WZWM0KDAsIDAsIDEsIDEpKVxyXG5cclxuICAgICAgICAgICAgY29uc3QgdmFvID0gdGhpcy5yZW5kZXJlci5jcmVhdGVNZXNoKGl4bSlcclxuICAgICAgICAgICAgdGhpcy5iYWxsID0gbmV3IEJhbGwoe1xyXG4gICAgICAgICAgICAgICAgcmFkaXVzOiByYWRpdXMsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbmV3IGdlby5WZWMzKDAsIHRoaXMucGFkZGxlLnBvc2l0aW9uLnkgKyB0aGlzLnBhZGRsZS5oYWxmRXh0ZW50cy55ICsgcmFkaXVzLCByYWRpdXMpLFxyXG4gICAgICAgICAgICAgICAgYmF0Y2g6IG5ldyBnZnguQmF0Y2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbyxcclxuICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgcm91Z2huZXNzOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIG51bUluZGljZXM6IGl4bS5pbmRpY2VzLmxlbmd0aFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwbGF5SW1wYWN0U291bmQoKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3Qgc291bmQgPSByYW5kLmNob29zZSh0aGlzLnJuZywgdGhpcy5pbXBhY3RTb3VuZHMpXHJcbiAgICAgICAgY29uc3Qgc3JjID0gdGhpcy5hYy5jcmVhdGVCdWZmZXJTb3VyY2UoKVxyXG4gICAgICAgIHNyYy5idWZmZXIgPSBzb3VuZFxyXG4gICAgICAgIHNyYy5jb25uZWN0KHRoaXMuYWMuZGVzdGluYXRpb24pXHJcbiAgICAgICAgc3JjLnN0YXJ0KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZpbmROZWFyZXN0UG9pbnRPbkJyaWNrKGJyaWNrOiBCcmljaywgcG9zaXRpb246IGdlby5WZWMzKTogZ2VvLlZlYzMge1xyXG4gICAgICAgIGNvbnN0IGFhYmIgPSBnZW8uQUFCQi5mcm9tUG9zaXRpb25IYWxmRXh0ZW50cyhicmljay5wb3NpdGlvbiwgQnJpY2suaGFsZkV4dGVudHMpXHJcbiAgICAgICAgY29uc3QgbmVhcmVzdCA9IHBvc2l0aW9uLmNsYW1wKGFhYmIubWluLCBhYWJiLm1heClcclxuICAgICAgICByZXR1cm4gbmVhcmVzdFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZmluZE5lYXJlc3RCcmljayhwb3NpdGlvbjogZ2VvLlZlYzMsIHJhZGl1czogbnVtYmVyKTogQnJpY2sgfCBudWxsIHtcclxuICAgICAgICBjb25zdCByMiA9IHJhZGl1cyAqIHJhZGl1c1xyXG4gICAgICAgIGxldCBtaW5EaXN0U3EgPSByMlxyXG4gICAgICAgIGxldCBuZWFyZXN0QnJpY2s6IEJyaWNrIHwgbnVsbCA9IG51bGxcclxuICAgICAgICBmb3IgKGNvbnN0IGJyaWNrIG9mIHRoaXMuYnJpY2tzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5lYXJlc3RQdCA9IHRoaXMuZmluZE5lYXJlc3RQb2ludE9uQnJpY2soYnJpY2ssIHBvc2l0aW9uKVxyXG4gICAgICAgICAgICBjb25zdCBkaXN0U3EgPSBuZWFyZXN0UHQuc3ViKHBvc2l0aW9uKS5sZW5ndGhTcSgpXHJcbiAgICAgICAgICAgIGlmIChkaXN0U3EgPCBtaW5EaXN0U3EpIHtcclxuICAgICAgICAgICAgICAgIG5lYXJlc3RCcmljayA9IGJyaWNrXHJcbiAgICAgICAgICAgICAgICBtaW5EaXN0U3EgPSBkaXN0U3FcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG5lYXJlc3RCcmlja1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlV29ybGRNYXRyaWNlcygpIHtcclxuICAgICAgICB0aGlzLmJhbGwuYmF0Y2gud29ybGRNYXRyaXggPSBnZW8uTWF0NC50cmFuc2xhdGlvbih0aGlzLmJhbGwucG9zaXRpb24pXHJcbiAgICAgICAgdGhpcy5wYWRkbGUuYmF0Y2gud29ybGRNYXRyaXggPSBnZW8uTWF0NC50cmFuc2xhdGlvbih0aGlzLnBhZGRsZS5wb3NpdGlvbilcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyYXdTY2VuZSgpIHtcclxuICAgICAgICAvLyBjb25maWd1cmUgY2FtZXJhIC0gZml0IHBsYXkgYXJlYSB0byBzY3JlZW4gd2l0aCBzb21lIHNtYWxsIG1hcmdpblxyXG4gICAgICAgIGxldCB6ID0gMFxyXG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuZmllbGRUb3AgLSB0aGlzLmZpZWxkQm90dG9tICsgYm9yZGVyV2lkdGggKiAyXHJcbiAgICAgICAgY29uc3Qgd2lkdGggPSB0aGlzLmZpZWxkUmlnaHQgLSB0aGlzLmZpZWxkTGVmdCArIGJvcmRlcldpZHRoICogMlxyXG4gICAgICAgIGNvbnN0IGZpZWxkQXNwZWN0ID0gd2lkdGggLyBoZWlnaHRcclxuICAgICAgICBpZiAoZmllbGRBc3BlY3QgPCB0aGlzLnJlbmRlcmVyLmFzcGVjdCkge1xyXG4gICAgICAgICAgICB6ID0gaGVpZ2h0IC8gMiAvIE1hdGgudGFuKHRoaXMucmVuZGVyZXIuZm92IC8gMilcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB6ID0gd2lkdGggLyAyIC8gTWF0aC50YW4odGhpcy5yZW5kZXJlci5mb3YgKiB0aGlzLnJlbmRlcmVyLmFzcGVjdCAvIDIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci52aWV3TWF0cml4ID0gZ2VvLk1hdDQubG9va0F0KFxyXG4gICAgICAgICAgICBuZXcgZ2VvLlZlYzMoMCwgMCwgMSArIHopLCBuZXcgZ2VvLlZlYzMoMCwgMCwgLTEpLCBuZXcgZ2VvLlZlYzMoMCwgMSwgMCkpLmludmVydCgpXHJcblxyXG4gICAgICAgIC8vIHNob3cgZnJvbSBzaWRlIHZpZXcgZm9yIGRlYnVnZ2luZ1xyXG4gICAgICAgIC8vIHRoaXMucmVuZGVyZXIudmlld01hdHJpeCA9IGdlby5NYXQ0Lmxvb2tBdChcclxuICAgICAgICAvLyAgICAgbmV3IGdlby5WZWMzKDAsIC0xNiwgMCksIG5ldyBnZW8uVmVjMygwLCAxLCAwKSwgbmV3IGdlby5WZWMzKDAsIDAsIDEpKS5pbnZlcnQoKVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdCYXRjaCh0aGlzLmZpZWxkQmF0Y2gpXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3QmF0Y2godGhpcy5iYWxsLmJhdGNoKVxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd0JhdGNoKHRoaXMucGFkZGxlLmJhdGNoKVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGJyaWNrIG9mIHRoaXMuYnJpY2tzKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd0JhdGNoKGJyaWNrLmJhdGNoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5wcmVzZW50KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNhbnZhc1RvTkRDKGNjOiBnZW8uVmVjMik6IGdlby5WZWMyIHtcclxuICAgICAgICBjb25zdCBuZGMgPSBuZXcgZ2VvLlZlYzIoXHJcbiAgICAgICAgICAgIGNjLnggLyB0aGlzLmNhbnZhcy53aWR0aCAqIDIgLSAxLFxyXG4gICAgICAgICAgICAtY2MueSAvIHRoaXMuY2FudmFzLmhlaWdodCAqIDIgKyAxXHJcbiAgICAgICAgKVxyXG5cclxuICAgICAgICByZXR1cm4gbmRjXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYW52YXNUb05EQ1JheShjYzogZ2VvLlZlYzIpOiBnZW8uUmF5IHtcclxuICAgICAgICBjb25zdCBuZGMgPSB0aGlzLmNhbnZhc1RvTkRDKGNjKVxyXG4gICAgICAgIGNvbnN0IHJheSA9IG5ldyBnZW8uUmF5KG5ldyBnZW8uVmVjMyhuZGMueCwgbmRjLnksIC0xKSwgbmV3IGdlby5WZWMzKDAsIDAsIDEpKVxyXG4gICAgICAgIHJldHVybiByYXlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNhbnZhc1RvV29ybGRSYXkoY2M6IGdlby5WZWMyKTogZ2VvLlJheSB7XHJcbiAgICAgICAgY29uc3QgbmRjUmF5ID0gdGhpcy5jYW52YXNUb05EQ1JheShjYylcclxuICAgICAgICBjb25zdCBpbnZQcm9qID0gdGhpcy5yZW5kZXJlci5wcm9qZWN0aW9uTWF0cml4LmludmVydCgpXHJcbiAgICAgICAgY29uc3QgaW52VmlldyA9IHRoaXMucmVuZGVyZXIudmlld01hdHJpeC5pbnZlcnQoKVxyXG4gICAgICAgIGNvbnN0IGludlZpZXdQcm9qID0gdGhpcy5yZW5kZXJlci5wcm9qZWN0aW9uTWF0cml4Lm1hdG11bCh0aGlzLnJlbmRlcmVyLnZpZXdNYXRyaXgpLmludmVydCgpXHJcbiAgICAgICAgY29uc3Qgdmlld1JheSA9IG5kY1JheS50cmFuc2Zvcm0oaW52UHJvailcclxuICAgICAgICBjb25zdCB3b3JsZFJheSA9IHZpZXdSYXkudHJhbnNmb3JtKGludlZpZXcpXHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlucC5tb3VzZUxlZnRSZWxlYXNlZCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImNjOiBcIiwgY2MudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJuZGM6IFwiLCBuZGNSYXkudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ2aWV3OiBcIiwgdmlld1JheS50b1N0cmluZygpKVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIndvcmxkOiBcIiwgd29ybGRSYXkudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ3b3JsZDI6IFwiLCBuZGNSYXkudHJhbnNmb3JtKGludlZpZXdQcm9qKS50b1N0cmluZygpKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHdvcmxkUmF5XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVJORygpOiByYW5kLlJORyAge1xyXG4gICAgY29uc3Qgc2VlZCA9IHJhbmQueG11cjMobmV3IERhdGUoKS50b1N0cmluZygpKVxyXG4gICAgY29uc3Qgcm5nID0gbmV3IHJhbmQuU0ZDMzJSTkcoc2VlZCgpLCBzZWVkKCksIHNlZWQoKSwgc2VlZCgpKVxyXG4gICAgcmV0dXJuIHJuZ1xyXG59XHJcblxyXG5jb25zdCBhcHAgPSBuZXcgQXBwKClcclxuYXBwLmV4ZWMoKVxyXG4iXX0=