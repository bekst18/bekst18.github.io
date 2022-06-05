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
        this.level = 1;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtvdXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJicmVha291dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQixNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUE7QUFDcEIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFBO0FBQ3JCLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQTtBQUNyQixNQUFNLFlBQVksR0FBRyxFQUFFLENBQUE7QUFDdkIsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFBO0FBQ3RCLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQTtBQUN0QixNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFDckIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFBO0FBQ3RCLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQTtBQUN2QixNQUFNLGtCQUFrQixHQUFHLENBQUMsQ0FBQTtBQUU1QixNQUFNLFlBQVksR0FBRyw4Q0FBOEMsQ0FBQTtBQUNuRSxNQUFNLGVBQWUsR0FBRyxxREFBcUQsQ0FBQTtBQUM3RSxNQUFNLGdCQUFnQixHQUFHLHVEQUF1RCxDQUFBO0FBWWhGLE1BQU0sTUFBTSxHQUFHLElBQUksS0FBSztBQUNwQixVQUFVO0FBQ1Y7SUFDSSxTQUFTLEVBQUUsR0FBRztJQUNkLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzdDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEdBQUc7SUFDZCxVQUFVLEVBQUUsQ0FBQztJQUNiLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQ3pDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEdBQUc7SUFDZCxVQUFVLEVBQUUsR0FBRztJQUNmLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ3ZDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ3pDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEdBQUc7SUFDZCxVQUFVLEVBQUUsR0FBRztJQUNmLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzdDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3JDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzFDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxHQUFHO0lBQ2hCLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUM3QztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxHQUFHO0lBQ2QsVUFBVSxFQUFFLEdBQUc7SUFDZixXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN2QyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUMzQztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxFQUFFO0lBQ2IsVUFBVSxFQUFFLEVBQUU7SUFDZCxXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUM3QztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxFQUFFO0lBQ2IsVUFBVSxFQUFFLEVBQUU7SUFDZCxXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztDQUMxQyxDQUNKLENBQUE7QUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLEtBQUssQ0FDekIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3hCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3hCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUMxQixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQzFCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDMUIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM1QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQzVCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFF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QkFBaUIsRUFBRTtZQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUN6QyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7U0FDcEU7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNuQixDQUFDO0NBQ0o7QUFFRCxTQUFTLFNBQVM7SUFDZCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUM5QyxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUM3RCxPQUFPLEdBQUcsQ0FBQTtBQUNkLENBQUM7QUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFBO0FBQ3JCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzNkLmpzXCJcclxuaW1wb3J0ICogYXMgaW5wdXQgZnJvbSBcIi4uL3NoYXJlZC9pbnB1dC5qc1wiXHJcbmltcG9ydCAqIGFzIHJhbmQgZnJvbSBcIi4uL3NoYXJlZC9yYW5kLmpzXCJcclxuaW1wb3J0ICogYXMgbWF0aCBmcm9tIFwiLi4vc2hhcmVkL21hdGguanNcIlxyXG5pbXBvcnQgKiBhcyBhdWRpbyBmcm9tIFwiLi4vc2hhcmVkL2F1ZGlvLmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcblxyXG5jb25zdCBicmlja1dpZHRoID0gMlxyXG5jb25zdCBicmlja0hlaWdodCA9IDFcclxuY29uc3QgYnJpY2tEZXB0aCA9IC41XHJcbmNvbnN0IHBhZGRsZUhlaWdodCA9IC41XHJcbmNvbnN0IHBhZGRsZURlcHRoID0gLjVcclxuY29uc3QgcGFkZGxlU3BlZWQgPSAuNVxyXG5jb25zdCBib3JkZXJXaWR0aCA9IDFcclxuY29uc3QgdG9wUm93TWFyZ2luID0gMVxyXG5jb25zdCBicmlja01hcmdpbiA9IC4wNVxyXG5jb25zdCBwYWRkbGVCb3R0b21NYXJnaW4gPSAxXHJcblxyXG5jb25zdCBzdGFydE1lc3NhZ2UgPSBcIlRhcCwgY2xpY2ssIG9yIHByZXNzIGFueSBrZXkgdG8gbGF1bmNoIGJhbGwuXCJcclxuY29uc3QgZ2FtZU92ZXJNZXNzYWdlID0gXCJHYW1lIG92ZXIhIFRhcCwgY2xpY2ssIG9yIHByZXNzIGFueSBrZXkgdG8gcmVzdGFydC5cIlxyXG5jb25zdCBuZXh0TGV2ZWxNZXNzYWdlID0gXCJMZXZlbCBDbGVhciEgVGFwLCBjbGljaywgb3IgcHJlc3MgYW55IGtleSB0byBhZHZhbmNlLlwiXHJcblxyXG5pbnRlcmZhY2UgTGV2ZWxEYXRhIHtcclxuICAgIGJhbGxTcGVlZDogbnVtYmVyXHJcbiAgICBiYWxsUmFkaXVzOiBudW1iZXJcclxuICAgIHBhZGRsZVdpZHRoOiBudW1iZXJcclxuICAgIGJyaWNrUm93czogbnVtYmVyXHJcbiAgICBicmlja0NvbHM6IG51bWJlclxyXG4gICAgYm9yZGVyQ29sb3I6IGdlby5WZWM0XHJcbiAgICBmbG9vckNvbG9yOiBnZW8uVmVjNFxyXG59XHJcblxyXG5jb25zdCBsZXZlbHMgPSBuZXcgQXJyYXk8TGV2ZWxEYXRhPihcclxuICAgIC8vIGxldmVsIDFcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC4xNSxcclxuICAgICAgICBiYWxsUmFkaXVzOiAxLjI1LFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiA2LFxyXG4gICAgICAgIGJyaWNrUm93czogMyxcclxuICAgICAgICBicmlja0NvbHM6IDcsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCguMjUsIDAsIDAsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCguMjUsIC4yNSwgLjI1LCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDJcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC4xNSxcclxuICAgICAgICBiYWxsUmFkaXVzOiAxLFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiA2LFxyXG4gICAgICAgIGJyaWNrUm93czogMyxcclxuICAgICAgICBicmlja0NvbHM6IDcsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAuMjUsIDAsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAwLCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgM1xyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjM1LFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC43NSxcclxuICAgICAgICBwYWRkbGVXaWR0aDogNixcclxuICAgICAgICBicmlja1Jvd3M6IDMsXHJcbiAgICAgICAgYnJpY2tDb2xzOiA1LFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgMCwgLjU1LCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgMCwgMCwgMSlcclxuICAgIH0sXHJcbiAgICAvLyBsZXZlbCA0XHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuNCxcclxuICAgICAgICBiYWxsUmFkaXVzOiAuNixcclxuICAgICAgICBwYWRkbGVXaWR0aDogNSxcclxuICAgICAgICBicmlja1Jvd3M6IDMsXHJcbiAgICAgICAgYnJpY2tDb2xzOiA2LFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjYsIC41LCAwLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgLjI1LCAwLCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDVcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC40NSxcclxuICAgICAgICBiYWxsUmFkaXVzOiAuNTUsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDQsXHJcbiAgICAgICAgYnJpY2tSb3dzOiAzLFxyXG4gICAgICAgIGJyaWNrQ29sczogOCxcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KDAsIC41LCAuNiwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KC4yNSwgLjI1LCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgNlxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjUsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjUsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDQsXHJcbiAgICAgICAgYnJpY2tSb3dzOiA0LFxyXG4gICAgICAgIGJyaWNrQ29sczogOCxcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KDEsIDAsIDAsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAuMywgLjI1LCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDdcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC42LFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC40LFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiAzLjUsXHJcbiAgICAgICAgYnJpY2tSb3dzOiA0LFxyXG4gICAgICAgIGJyaWNrQ29sczogMTAsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCgxLCAxLCAwLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjI1LCAuMjUsIC4yNSwgMSlcclxuICAgIH0sXHJcbiAgICAvLyBsZXZlbCA4XHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuNjUsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjM1LFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiAzLFxyXG4gICAgICAgIGJyaWNrUm93czogNSxcclxuICAgICAgICBicmlja0NvbHM6IDEwLFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjUsIC42LCAxLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjI1LCAwLCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgOVxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjcsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjMsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDIsXHJcbiAgICAgICAgYnJpY2tSb3dzOiA2LFxyXG4gICAgICAgIGJyaWNrQ29sczogMTIsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAxLCAxLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjM1LCAuMTUsIC4yNSwgMSlcclxuICAgIH0sXHJcbiAgICAvLyBsZXZlbCA5XHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuOCxcclxuICAgICAgICBiYWxsUmFkaXVzOiAuMixcclxuICAgICAgICBwYWRkbGVXaWR0aDogMSxcclxuICAgICAgICBicmlja1Jvd3M6IDgsXHJcbiAgICAgICAgYnJpY2tDb2xzOiAxNSxcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KDEsIDEsIDEsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCguMSwgLjEsIC40LCAxKVxyXG4gICAgfSxcclxuKVxyXG5cclxuY29uc3QgYnJpY2tDb2xvcnMgPSBuZXcgQXJyYXk8Z2VvLlZlYzQ+KFxyXG4gICAgbmV3IGdlby5WZWM0KDEsIDAsIDAsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDAsIDEsIDAsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDAsIDAsIDEsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDAsIDEsIDEsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDEsIDAsIDEsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDEsIDEsIDEsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KC41LCAuNSwgMCwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMCwgLjUsIC41LCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCguNSwgMCwgLjUsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KC4yNSwgLjc1LCAwLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgwLCAuMjUsIC43NSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoLjI1LCAwLCAuNzUsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KC43NSwgLjI1LCAwLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgwLCAuNzUsIC4yNSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoLjc1LCAwLCAuMjUsIDEpLFxyXG4pXHJcblxyXG5pbnRlcmZhY2UgUGFkZGxlT3B0aW9ucyB7XHJcbiAgICBoYWxmRXh0ZW50czogZ2VvLlZlYzNcclxuICAgIHBvc2l0aW9uOiBnZW8uVmVjM1xyXG4gICAgYmF0Y2g6IGdmeC5CYXRjaFxyXG4gICAgdmVsb2NpdHk/OiBnZW8uVmVjM1xyXG59XHJcblxyXG5jbGFzcyBQYWRkbGUge1xyXG4gICAgcHVibGljIHJlYWRvbmx5IGhhbGZFeHRlbnRzOiBnZW8uVmVjM1xyXG4gICAgcHVibGljIHJlYWRvbmx5IGJhdGNoID0gbmV3IGdmeC5CYXRjaCgpXHJcbiAgICBwb3NpdGlvbiA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgdmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBQYWRkbGVPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5oYWxmRXh0ZW50cyA9IG9wdGlvbnMuaGFsZkV4dGVudHMuY2xvbmUoKVxyXG4gICAgICAgIHRoaXMuYmF0Y2ggPSBvcHRpb25zLmJhdGNoXHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IG9wdGlvbnMucG9zaXRpb24uY2xvbmUoKVxyXG4gICAgICAgIHRoaXMudmVsb2NpdHkgPSBvcHRpb25zLnZlbG9jaXR5Py5jbG9uZSgpID8/IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgQnJpY2tPcHRpb25zIHtcclxuICAgIHBvc2l0aW9uOiBnZW8uVmVjM1xyXG4gICAgYmF0Y2g6IGdmeC5CYXRjaFxyXG59XHJcblxyXG5jbGFzcyBCcmljayB7XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgYmF0Y2ggPSBuZXcgZ2Z4LkJhdGNoKClcclxuICAgIHB1YmxpYyByZWFkb25seSBwb3NpdGlvbiA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgc3RhdGljIHJlYWRvbmx5IGhhbGZFeHRlbnRzID0gbmV3IGdlby5WZWMzKGJyaWNrV2lkdGggLyAyIC0gYnJpY2tNYXJnaW4sIGJyaWNrSGVpZ2h0IC8gMiAtIGJyaWNrTWFyZ2luLCBicmlja0RlcHRoIC8gMilcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBCcmlja09wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbi5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy5iYXRjaCA9IG9wdGlvbnMuYmF0Y2hcclxuICAgIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIEJhbGxPcHRpb25zIHtcclxuICAgIHJhZGl1czogbnVtYmVyXHJcbiAgICBwb3NpdGlvbjogZ2VvLlZlYzNcclxuICAgIGJhdGNoOiBnZnguQmF0Y2hcclxuICAgIHZlbG9jaXR5PzogZ2VvLlZlYzNcclxufVxyXG5cclxuY2xhc3MgQmFsbCB7XHJcbiAgICByYWRpdXM6IG51bWJlciA9IDFcclxuICAgIHBvc2l0aW9uOiBnZW8uVmVjM1xyXG4gICAgYmF0Y2g6IGdmeC5CYXRjaFxyXG4gICAgdmVsb2NpdHk6IGdlby5WZWMzXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQmFsbE9wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLnJhZGl1cyA9IG9wdGlvbnMucmFkaXVzXHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IG9wdGlvbnMucG9zaXRpb24uY2xvbmUoKVxyXG4gICAgICAgIHRoaXMuYmF0Y2ggPSBvcHRpb25zLmJhdGNoXHJcbiAgICAgICAgdGhpcy52ZWxvY2l0eSA9IG9wdGlvbnMudmVsb2NpdHk/LmNsb25lKCkgPz8gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICB9XHJcbn1cclxuXHJcbmVudW0gR2FtZVN0YXRlIHtcclxuICAgIFBsYXksXHJcbiAgICBMYXVuY2gsXHJcbiAgICBXYWl0XHJcbn1cclxuXHJcbi8vIHN0ZXAgMSAtIGNsZWFyIHNjcmVlbiwgaW5pdCBnbCwgZXRjLi4uXHJcbi8vIHN0ZXAgMiAtIGRyYXcgYSBjbGlwIHNwYWNlIHRyaWFuZ2xlXHJcbi8vIHN0ZXAgMyAtIGRyYXcgYSB3b3JsZCBzcGFjZSB0cmlhbmdsZVxyXG5jbGFzcyBBcHAge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBybmcgPSBjcmVhdGVSTkcoKTtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FudmFzID0gZG9tLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWxTcGFuID0gZG9tLmJ5SWQoXCJsZXZlbFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBiYWxsc1JlbWFpbmluZ1NwYW4gPSBkb20uYnlJZChcImJhbGxzUmVtYWluaW5nXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1lc3NhZ2VEaXYgPSBkb20uYnlJZChcIm1lc3NhZ2VcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmVuZGVyZXIgPSBuZXcgZ2Z4LlJlbmRlcmVyKHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbnAgPSBuZXcgaW5wdXQuSW5wdXQodGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIGZpZWxkQmF0Y2g6IGdmeC5CYXRjaCA9IG5ldyBnZnguQmF0Y2goKVxyXG4gICAgcHJpdmF0ZSBwYWRkbGUhOiBQYWRkbGVcclxuICAgIHByaXZhdGUgYmFsbCE6IEJhbGxcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYnJpY2tzID0gbmV3IFNldDxCcmljaz4oKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBhYyA9IG5ldyBBdWRpb0NvbnRleHQoKVxyXG4gICAgcHJpdmF0ZSBpbXBhY3RTb3VuZHMgPSBuZXcgQXJyYXk8QXVkaW9CdWZmZXI+KClcclxuICAgIHByaXZhdGUgYmFsbHNSZW1haW5pbmcgPSAzXHJcbiAgICBwcml2YXRlIGxldmVsID0gMVxyXG4gICAgcHJpdmF0ZSBzdGF0ZSA9IEdhbWVTdGF0ZS5MYXVuY2hcclxuICAgIHByaXZhdGUgY29udGludWUgPSAoKSA9PiB7IH1cclxuXHJcbiAgICBhc3luYyBleGVjKCkge1xyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IHN0YXJ0TWVzc2FnZVxyXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoKSA9PiB0aGlzLmhhbmRsZUtleVVwKCkpXHJcblxyXG4gICAgICAgIHRoaXMuaW5pdExldmVsKClcclxuICAgICAgICBhd2FpdCB0aGlzLmluaXRBdWRpbygpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuZm9jdXMoKVxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLnRpY2soKSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGluaXRBdWRpbygpIHtcclxuICAgICAgICBjb25zdCBudW1JbXBhY3RTb3VuZHMgPSAxNVxyXG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IG51bUltcGFjdFNvdW5kczsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IGAuL2Fzc2V0cy9pbXBhY3Qke2l9LndhdmBcclxuICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgYXVkaW8ubG9hZEF1ZGlvKHRoaXMuYWMsIHVybClcclxuICAgICAgICAgICAgdGhpcy5pbXBhY3RTb3VuZHMucHVzaChidWZmZXIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdGljaygpIHtcclxuICAgICAgICB0aGlzLmNoZWNrU2l6ZSgpXHJcbiAgICAgICAgdGhpcy51cGRhdGUoKVxyXG4gICAgICAgIHRoaXMuZHJhd1NjZW5lKClcclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy50aWNrKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjaGVja1NpemUoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY2FudmFzLndpZHRoID09PSB0aGlzLmNhbnZhcy5jbGllbnRXaWR0aCAmJiB0aGlzLmNhbnZhcy5oZWlnaHQgPT09IHRoaXMuY2FudmFzLmNsaWVudEhlaWdodCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5jYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHRcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZSgpIHtcclxuICAgICAgICB0aGlzLnBhZGRsZS5wb3NpdGlvbiA9IHRoaXMucGFkZGxlLnBvc2l0aW9uLmFkZCh0aGlzLnBhZGRsZS52ZWxvY2l0eSlcclxuICAgICAgICB0aGlzLmJhbGwucG9zaXRpb24gPSB0aGlzLmJhbGwucG9zaXRpb24uYWRkKHRoaXMuYmFsbC52ZWxvY2l0eSlcclxuICAgICAgICB0aGlzLmhhbmRsZUlucHV0KClcclxuICAgICAgICB0aGlzLmhhbmRsZUNvbGxpc2lvbigpXHJcbiAgICAgICAgdGhpcy51cGRhdGVXb3JsZE1hdHJpY2VzKClcclxuICAgICAgICB0aGlzLnVwZGF0ZVVJKClcclxuICAgICAgICB0aGlzLmlucC5mbHVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVVSSgpIHtcclxuICAgICAgICB0aGlzLmJhbGxzUmVtYWluaW5nU3Bhbi50ZXh0Q29udGVudCA9IHRoaXMuYmFsbHNSZW1haW5pbmcudG9TdHJpbmcoKVxyXG4gICAgICAgIHRoaXMubGV2ZWxTcGFuLnRleHRDb250ZW50ID0gdGhpcy5sZXZlbC50b1N0cmluZygpXHJcblxyXG4gICAgICAgIGlmICh0aGlzLm1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgdGhpcy5tZXNzYWdlRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5tZXNzYWdlRGl2LmhpZGRlbiA9IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgbGV2ZWxEYXRhKCk6IExldmVsRGF0YSB7XHJcbiAgICAgICAgY29uc3QgZGF0YSA9IGxldmVsc1tNYXRoLm1pbih0aGlzLmxldmVsIC0gMSwgbGV2ZWxzLmxlbmd0aCAtIDEpXVxyXG4gICAgICAgIHJldHVybiBkYXRhXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRXaWR0aCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBicmlja1dpZHRoICogdGhpcy5sZXZlbERhdGEuYnJpY2tDb2xzXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRIZWlnaHQoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gYnJpY2tIZWlnaHQgKiB0aGlzLmxldmVsRGF0YS5icmlja1Jvd3MgKiA0ICsgdG9wUm93TWFyZ2luXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRMZWZ0KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIC10aGlzLmZpZWxkV2lkdGggLyAyXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRSaWdodCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZpZWxkTGVmdCArIHRoaXMuZmllbGRXaWR0aFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IGZpZWxkQm90dG9tKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIC10aGlzLmZpZWxkSGVpZ2h0IC8gMlxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IGZpZWxkVG9wKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmllbGRCb3R0b20gKyB0aGlzLmZpZWxkSGVpZ2h0XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgbWVzc2FnZSgpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2VEaXYudGV4dENvbnRlbnQgPz8gXCJcIlxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2V0IG1lc3NhZ2UodGV4dDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy5tZXNzYWdlRGl2LnRleHRDb250ZW50ID0gdGV4dFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlS2V5VXAoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT09IEdhbWVTdGF0ZS5QbGF5KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT09IEdhbWVTdGF0ZS5XYWl0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGludWUoKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubGF1bmNoQmFsbCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVJbnB1dCgpIHtcclxuICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcclxuICAgICAgICAgICAgY2FzZSBHYW1lU3RhdGUuTGF1bmNoOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dExhdW5jaCgpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBHYW1lU3RhdGUuUGxheTpcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlSW5wdXRQbGF5KClcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIEdhbWVTdGF0ZS5XYWl0OlxyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dFdhaXQoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVJbnB1dExhdW5jaCgpOiB2b2lkIHtcclxuICAgICAgICAvLyBzdGFydCBnYW1lIG9uIG1vdXNlIGNpY2tcclxuICAgICAgICBpZiAodGhpcy5pbnAubW91c2VMZWZ0UHJlc3NlZCkge1xyXG4gICAgICAgICAgICB0aGlzLmxhdW5jaEJhbGwoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUlucHV0UGxheSgpIHtcclxuICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG5cclxuICAgICAgICAvLyBtb3VzZSAvIHRvdWNoIHBhZGRsZSBtb3ZlbWVudFxyXG4gICAgICAgIGlmICh0aGlzLmlucC5tb3VzZUxlZnREb3duKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHdvcmxkTW91c2VSYXkgPSB0aGlzLmNhbnZhc1RvV29ybGRSYXkobmV3IGdlby5WZWMyKHRoaXMuaW5wLm1vdXNlWCwgdGhpcy5pbnAubW91c2VZKSlcclxuICAgICAgICAgICAgY29uc3QgZmllbGRQbGFuZSA9IGdlby5QbGFuZS5mcm9tUG9pbnROb3JtYWwodGhpcy5wYWRkbGUucG9zaXRpb24sIG5ldyBnZW8uVmVjMygwLCAwLCAxKSlcclxuICAgICAgICAgICAgY29uc3QgZmllbGRJeCA9IHdvcmxkTW91c2VSYXkubGVycCh3b3JsZE1vdXNlUmF5LmNhc3QoZmllbGRQbGFuZSkpXHJcbiAgICAgICAgICAgIGlmIChmaWVsZEl4LnggPiB0aGlzLnBhZGRsZS5wb3NpdGlvbi54KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygxLCAwLCAwKVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZpZWxkSXgueCA8IHRoaXMucGFkZGxlLnBvc2l0aW9uLngpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKC0xLCAwLCAwKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBrZXlib2FyZCBwYWRkbGUgbW92ZW1lbnRcclxuICAgICAgICBpZiAodGhpcy5pbnAuZG93bihcImFcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoLTEsIDAsIDApXHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlucC5kb3duKFwiZFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygxLCAwLCAwKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucGFkZGxlLnZlbG9jaXR5Lmxlbmd0aFNxKCkgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gdGhpcy5wYWRkbGUudmVsb2NpdHkubm9ybWFsaXplKCkubXVsWChwYWRkbGVTcGVlZClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVJbnB1dFdhaXQoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuaW5wLm1vdXNlTGVmdERvd24pIHtcclxuICAgICAgICAgICAgdGhpcy5jb250aW51ZSgpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbGF1bmNoQmFsbCgpIHtcclxuICAgICAgICAvLyBjaG9vc2UgcmFuZG9tIHVwd2FyZCBsYXVuY2ggZGlyZWN0aW9uXHJcbiAgICAgICAgY29uc3Qgcm90ID0gZ2VvLk1hdDMucm90YXRpb25aKHJhbmQuZmxvYXQodGhpcy5ybmcsIC1NYXRoLlBJIC8gNCwgTWF0aC5QSSAvIDQpKVxyXG4gICAgICAgIGNvbnN0IHYgPSByb3QudHJhbnNmb3JtKG5ldyBnZW8uVmVjMygwLCAxLCAwKSkubm9ybWFsaXplKClcclxuICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB2Lm11bFgodGhpcy5sZXZlbERhdGEuYmFsbFNwZWVkKVxyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBHYW1lU3RhdGUuUGxheVxyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IFwiXCJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUNvbGxpc2lvbigpIHtcclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gR2FtZVN0YXRlLlBsYXkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpcyBwYWRkbGUgZ29pbmcgdG8gY3Jvc3MgYm91bmRhcnk/XHJcbiAgICAgICAgY29uc3QgYm91bmRzID0gZ2VvLkFBQkIuZnJvbUNvb3JkcyhcclxuICAgICAgICAgICAgdGhpcy5maWVsZExlZnQsIHRoaXMuZmllbGRCb3R0b20sIC0xLFxyXG4gICAgICAgICAgICB0aGlzLmZpZWxkUmlnaHQsIHRoaXMuZmllbGRUb3AsIDEpXHJcblxyXG4gICAgICAgIGNvbnN0IHBhZGRsZVBvc2l0aW9uID0gdGhpcy5wYWRkbGUucG9zaXRpb24uYWRkKHRoaXMucGFkZGxlLnZlbG9jaXR5KVxyXG4gICAgICAgIGNvbnN0IHBhZGRsZUJvdW5kcyA9IGdlby5BQUJCLmZyb21Qb3NpdGlvbkhhbGZFeHRlbnRzKHBhZGRsZVBvc2l0aW9uLCB0aGlzLnBhZGRsZS5oYWxmRXh0ZW50cylcclxuXHJcbiAgICAgICAgY29uc3QgYmFsbFBvc2l0aW9uID0gdGhpcy5iYWxsLnBvc2l0aW9uLmFkZCh0aGlzLmJhbGwudmVsb2NpdHkpXHJcbiAgICAgICAgY29uc3QgYmFsbEJvdW5kcyA9IGdlby5BQUJCLmZyb21Qb3NpdGlvbkhhbGZFeHRlbnRzKGJhbGxQb3NpdGlvbiwgbmV3IGdlby5WZWMzKHRoaXMuYmFsbC5yYWRpdXMsIHRoaXMuYmFsbC5yYWRpdXMsIHRoaXMuYmFsbC5yYWRpdXMpKVxyXG4gICAgICAgIGNvbnN0IGJhbGxTcGVlZCA9IHRoaXMubGV2ZWxEYXRhLmJhbGxTcGVlZFxyXG5cclxuICAgICAgICAvLyBjaGVjayBwYWRkbGUgYWdhaW5zdCBib3VuZGFyeVxyXG4gICAgICAgIGlmIChwYWRkbGVCb3VuZHMubWluLnggPD0gdGhpcy5maWVsZExlZnQgfHwgcGFkZGxlQm91bmRzLm1heC54ID49IHRoaXMuZmllbGRSaWdodCkge1xyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYmFsbCAvIHBhZGRsZSBoaXQgY2hlY2tcclxuICAgICAgICBpZiAoYmFsbEJvdW5kcy5vdmVybGFwcyhwYWRkbGVCb3VuZHMpKSB7XHJcbiAgICAgICAgICAgIGxldCB2ZWxvY2l0eSA9IHRoaXMuYmFsbC52ZWxvY2l0eVxyXG4gICAgICAgICAgICB2ZWxvY2l0eS55ID0gLXZlbG9jaXR5LnlcclxuXHJcbiAgICAgICAgICAgIC8vIGFsbG93IHBsYXllciBzb21lIGNvbnRyb2xcclxuICAgICAgICAgICAgLy8gcmlnaHQgc2lkZSBvZiBwYWRkbGUgcm90YXRlcyBhbmdsZSByaWdodFxyXG4gICAgICAgICAgICAvLyBsZWZ0IHNpZGUgb2YgcGFkZGxlIHJvdGF0ZXMgYW5nbGUgbGVmdFxyXG4gICAgICAgICAgICBjb25zdCBhYWJiID0gZ2VvLkFBQkIuZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMocGFkZGxlUG9zaXRpb24sIHRoaXMucGFkZGxlLmhhbGZFeHRlbnRzKVxyXG4gICAgICAgICAgICBjb25zdCBuZWFyZXN0ID0gYmFsbFBvc2l0aW9uLmNsYW1wKGFhYmIubWluLCBhYWJiLm1heClcclxuICAgICAgICAgICAgY29uc3QgdCA9IG1hdGgudW5sZXJwKGFhYmIubWluLngsIGFhYmIubWF4LngsIG5lYXJlc3QueClcclxuICAgICAgICAgICAgY29uc3Qgcm90ID0gZ2VvLk1hdDQucm90YXRpb25aKG1hdGgubGVycCgtTWF0aC5QSSAvIDQsIE1hdGguUEkgLyA0LCB0KSlcclxuXHJcbiAgICAgICAgICAgIC8vIGNob29zZSBhIHJhbmRvbSBkZXZpYXRpb24gZnJvbSBzdGFuZGFyZCByZWZsZWN0aW9uIGFuZ2xlXHJcbiAgICAgICAgICAgIHZlbG9jaXR5ID0gcm90LnRyYW5zZm9ybTModmVsb2NpdHkpXHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnogPSAwXHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eSA9IHZlbG9jaXR5Lm5vcm1hbGl6ZSgpLm11bFgoYmFsbFNwZWVkKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGFuZGxlIGJyaWNrIGhpdFxyXG4gICAgICAgIGNvbnN0IG5lYXJlc3RCcmljayA9IHRoaXMuZmluZE5lYXJlc3RCcmljayhiYWxsUG9zaXRpb24sIHRoaXMuYmFsbC5yYWRpdXMpXHJcbiAgICAgICAgaWYgKG5lYXJlc3RCcmljaykge1xyXG4gICAgICAgICAgICBjb25zdCBhYWJiID0gZ2VvLkFBQkIuZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMobmVhcmVzdEJyaWNrLnBvc2l0aW9uLCBCcmljay5oYWxmRXh0ZW50cylcclxuICAgICAgICAgICAgY29uc3QgbmVhcmVzdFB0ID0gdGhpcy5maW5kTmVhcmVzdFBvaW50T25CcmljayhuZWFyZXN0QnJpY2ssIGJhbGxQb3NpdGlvbilcclxuICAgICAgICAgICAgbGV0IHZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5XHJcblxyXG4gICAgICAgICAgICBpZiAobmVhcmVzdFB0LnkgPD0gYWFiYi5taW4ueSArIC4wMSkge1xyXG4gICAgICAgICAgICAgICAgdmVsb2NpdHkueSA9IC12ZWxvY2l0eS55XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChuZWFyZXN0UHQueCA8PSBhYWJiLm1pbi54ICsgLjAxKSB7XHJcbiAgICAgICAgICAgICAgICB2ZWxvY2l0eS54ID0gLXZlbG9jaXR5LnhcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG5lYXJlc3RQdC54ID49IGFhYmIubWF4LnggLSAuMDEpIHtcclxuICAgICAgICAgICAgICAgIHZlbG9jaXR5LnggPSAtdmVsb2NpdHkueFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobmVhcmVzdFB0LnkgPiBhYWJiLm1heC55IC0gLjAxKSB7XHJcbiAgICAgICAgICAgICAgICB2ZWxvY2l0eS55ID0gLXZlbG9jaXR5LnlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gdmVsb2NpdHkubm9ybWFsaXplKCkubXVsWChiYWxsU3BlZWQpXHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eS56ID0gMFxyXG4gICAgICAgICAgICB0aGlzLmJyaWNrcy5kZWxldGUobmVhcmVzdEJyaWNrKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXlJbXBhY3RTb3VuZCgpXHJcblxyXG4gICAgICAgICAgICAvLyBpZiBubyBicmlja3MsIG1vdmUgdG8gbmV4dCBsZXZlbFxyXG4gICAgICAgICAgICBpZiAodGhpcy5icmlja3Muc2l6ZSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICAgICAgICAgICAgICB0aGlzLndhaXQobmV4dExldmVsTWVzc2FnZSwgKCkgPT4gdGhpcy5uZXh0TGV2ZWwoKSlcclxuICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpcyBiYWxsIGdvaW5nIHRvIGNyb3NzIGJvdW5kYXJ5P1xyXG4gICAgICAgIGlmIChiYWxsQm91bmRzLm1pbi54IDwgYm91bmRzLm1pbi54IHx8IGJhbGxCb3VuZHMubWF4LnggPiBib3VuZHMubWF4LngpIHtcclxuICAgICAgICAgICAgbGV0IHZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5XHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnggPSAtdmVsb2NpdHkueFxyXG4gICAgICAgICAgICB2ZWxvY2l0eS56ID0gMFxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB2ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKGJhbGxTcGVlZClcclxuICAgICAgICAgICAgdGhpcy5wbGF5SW1wYWN0U291bmQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGJhbGxCb3VuZHMubWF4LnkgPiBib3VuZHMubWF4LnkpIHtcclxuICAgICAgICAgICAgbGV0IHZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5XHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnkgPSAtdmVsb2NpdHkueVxyXG4gICAgICAgICAgICB2ZWxvY2l0eS56ID0gMFxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB2ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKGJhbGxTcGVlZClcclxuICAgICAgICAgICAgdGhpcy5wbGF5SW1wYWN0U291bmQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYmFsbCBvZmYgYm9hcmRcclxuICAgICAgICBpZiAoYmFsbEJvdW5kcy5taW4ueSA8IGJvdW5kcy5taW4ueSkge1xyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnBvc2l0aW9uID0gbmV3IGdlby5WZWMzKDAsIHRoaXMucGFkZGxlLnBvc2l0aW9uLnkgKyB0aGlzLnBhZGRsZS5oYWxmRXh0ZW50cy55ICsgdGhpcy5iYWxsLnJhZGl1cywgdGhpcy5iYWxsLnJhZGl1cylcclxuICAgICAgICAgICAgdGhpcy5wbGF5SW1wYWN0U291bmQoKVxyXG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gR2FtZVN0YXRlLkxhdW5jaFxyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZS5wb3NpdGlvbiA9IG5ldyBnZW8uVmVjMygwLCB0aGlzLmZpZWxkQm90dG9tICsgdGhpcy5wYWRkbGUuaGFsZkV4dGVudHMueSArIHBhZGRsZUJvdHRvbU1hcmdpbiwgdGhpcy5wYWRkbGUuaGFsZkV4dGVudHMueilcclxuICAgICAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgICAgICAgICAgdGhpcy5iYWxsc1JlbWFpbmluZy0tXHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5iYWxsc1JlbWFpbmluZyA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdhbWVPdmVyKClcclxuICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGNsYW1wIHkgdmVsb2NpdHkgdG8gYXZvaWQgaG9yaXpvbnRhbCBhbmdsZXNcclxuICAgICAgICBpZiAodGhpcy5iYWxsLnZlbG9jaXR5Lmxlbmd0aFNxKCkgPiAwICYmIE1hdGguYWJzKHRoaXMuYmFsbC52ZWxvY2l0eS55KSA8IGJhbGxTcGVlZCAqIC4yNSkge1xyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkueSA9IE1hdGguc2lnbih0aGlzLmJhbGwudmVsb2NpdHkueSkgKiBiYWxsU3BlZWQgKiAuMjVcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5Lm5vcm1hbGl6ZSgpLm11bFgoYmFsbFNwZWVkKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdhbWVPdmVyKCkge1xyXG4gICAgICAgIHRoaXMuYmFsbHNSZW1haW5pbmcgPSAzXHJcbiAgICAgICAgdGhpcy5sZXZlbCA9IDFcclxuICAgICAgICB0aGlzLndhaXQoZ2FtZU92ZXJNZXNzYWdlLCAoKSA9PiB0aGlzLmluaXRMZXZlbCgpKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbmV4dExldmVsKCkge1xyXG4gICAgICAgIHRoaXMubGV2ZWwrK1xyXG4gICAgICAgIHRoaXMuaW5pdExldmVsKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHdhaXQobXNnOiBzdHJpbmcsIGY6ICgpID0+IHZvaWQpIHtcclxuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtc2dcclxuICAgICAgICB0aGlzLmNvbnRpbnVlID0gZlxyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBHYW1lU3RhdGUuV2FpdFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaW5pdExldmVsKCkge1xyXG4gICAgICAgIHRoaXMuYnJpY2tzLmNsZWFyKClcclxuICAgICAgICB0aGlzLnN0YXRlID0gR2FtZVN0YXRlLkxhdW5jaFxyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IHN0YXJ0TWVzc2FnZVxyXG5cclxuICAgICAgICAvLyBwbGF5aW5nIGZpZWxkXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCBpeG0gPSBuZXcgZ2Z4Lkl4TWVzaCgpXHJcblxyXG4gICAgICAgICAgICAvLyBmbG9vclxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmbG9vciA9IGdmeC5JeE1lc2gucmVjdEZyb21Db29yZHModGhpcy5maWVsZExlZnQsIHRoaXMuZmllbGRCb3R0b20sIC0uMjUsIHRoaXMuZmllbGRSaWdodCwgdGhpcy5maWVsZFRvcCwgMClcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZsb29yQ29sb3IgPSB0aGlzLmxldmVsRGF0YS5mbG9vckNvbG9yXHJcbiAgICAgICAgICAgICAgICBmbG9vci52ZXJ0aWNlcy5mb3JFYWNoKHYgPT4gdi5jb2xvciA9IGZsb29yQ29sb3IpXHJcbiAgICAgICAgICAgICAgICBpeG0uY2F0KGZsb29yKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBib3JkZXJcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgd2FsbHMgPSBuZXcgZ2Z4Lkl4TWVzaCgpXHJcbiAgICAgICAgICAgICAgICBjb25zdCBib3JkZXJDb2xvciA9IHRoaXMubGV2ZWxEYXRhLmJvcmRlckNvbG9yXHJcbiAgICAgICAgICAgICAgICB3YWxscy5jYXQoZ2Z4Lkl4TWVzaC5yZWN0RnJvbUNvb3Jkcyh0aGlzLmZpZWxkTGVmdCAtIGJvcmRlcldpZHRoLCB0aGlzLmZpZWxkQm90dG9tLCAtLjI1LCB0aGlzLmZpZWxkTGVmdCwgdGhpcy5maWVsZFRvcCwgMSkpXHJcbiAgICAgICAgICAgICAgICB3YWxscy5jYXQoZ2Z4Lkl4TWVzaC5yZWN0RnJvbUNvb3Jkcyh0aGlzLmZpZWxkUmlnaHQsIHRoaXMuZmllbGRCb3R0b20sIC0uMjUsIHRoaXMuZmllbGRSaWdodCArIGJvcmRlcldpZHRoLCB0aGlzLmZpZWxkVG9wLCAxKSlcclxuICAgICAgICAgICAgICAgIHdhbGxzLmNhdChnZnguSXhNZXNoLnJlY3RGcm9tQ29vcmRzKHRoaXMuZmllbGRMZWZ0IC0gYm9yZGVyV2lkdGgsIHRoaXMuZmllbGRUb3AsIC0uMjUsIHRoaXMuZmllbGRSaWdodCArIGJvcmRlcldpZHRoLCB0aGlzLmZpZWxkVG9wICsgYm9yZGVyV2lkdGgsIDEpKVxyXG4gICAgICAgICAgICAgICAgd2FsbHMudmVydGljZXMuZm9yRWFjaCh2ID0+IHYuY29sb3IgPSBib3JkZXJDb2xvcilcclxuICAgICAgICAgICAgICAgIGl4bS5jYXQod2FsbHMpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHZhbyA9IHRoaXMucmVuZGVyZXIuY3JlYXRlTWVzaChpeG0pXHJcbiAgICAgICAgICAgIHRoaXMuZmllbGRCYXRjaCA9IG5ldyBnZnguQmF0Y2goe1xyXG4gICAgICAgICAgICAgICAgdmFvOiB2YW8sXHJcbiAgICAgICAgICAgICAgICBudW1JbmRpY2VzOiBpeG0uaW5kaWNlcy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICByb3VnaG5lc3M6IDFcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGJyaWNrc1xyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc3QgYnJpY2tIYWxmV2lkdGggPSBicmlja1dpZHRoIC8gMlxyXG4gICAgICAgICAgICBjb25zdCBicmlja0hhbGZIZWlnaHQgPSBicmlja0hlaWdodCAvIDJcclxuICAgICAgICAgICAgY29uc3QgYnJpY2tIYWxmRGVwdGggPSBicmlja0RlcHRoIC8gMlxyXG5cclxuICAgICAgICAgICAgY29uc3QgZmllbGRYT2Zmc2V0ID0gdGhpcy5maWVsZExlZnQgKyBCcmljay5oYWxmRXh0ZW50cy54XHJcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkWU9mZnNldCA9IHRoaXMuZmllbGRUb3AgLSB0b3BSb3dNYXJnaW4gLSBicmlja0hlaWdodCAqIHRoaXMubGV2ZWxEYXRhLmJyaWNrUm93c1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxldmVsRGF0YS5icmlja1Jvd3M7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgeU9mZnNldCA9IGZpZWxkWU9mZnNldCArIGkgKiBicmlja0hlaWdodCArIGJyaWNrTWFyZ2luXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRoaXMubGV2ZWxEYXRhLmJyaWNrQ29sczsgKytqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeE9mZnNldCA9IGZpZWxkWE9mZnNldCArIGogKiAoYnJpY2tXaWR0aCArIGJyaWNrTWFyZ2luKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJyaWNrTWluID0gbmV3IGdlby5WZWMzKC1icmlja0hhbGZXaWR0aCArIGJyaWNrTWFyZ2luLCAtYnJpY2tIYWxmSGVpZ2h0ICsgYnJpY2tNYXJnaW4sIC1icmlja0hhbGZEZXB0aClcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBicmlja01heCA9IG5ldyBnZW8uVmVjMyhicmlja0hhbGZXaWR0aCAtIGJyaWNrTWFyZ2luLCBicmlja0hhbGZIZWlnaHQgLSBicmlja01hcmdpbiwgYnJpY2tIYWxmRGVwdGgpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWFiYiA9IG5ldyBnZW8uQUFCQihicmlja01pbiwgYnJpY2tNYXgpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXhtID0gZ2Z4Lkl4TWVzaC5yZWN0KGFhYmIpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSBuZXcgZ2VvLlZlYzMoeE9mZnNldCwgeU9mZnNldCwgYnJpY2tIYWxmRGVwdGgpXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJyaWNrID0gbmV3IEJyaWNrKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBiYXRjaDogbmV3IGdmeC5CYXRjaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JsZE1hdHJpeDogZ2VvLk1hdDQudHJhbnNsYXRpb24ocG9zaXRpb24pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlmZnVzZUNvbG9yOiByYW5kLmNob29zZSh0aGlzLnJuZywgYnJpY2tDb2xvcnMpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcm91Z2huZXNzOiAuOCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbzogdGhpcy5yZW5kZXJlci5jcmVhdGVNZXNoKGl4bSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1JbmRpY2VzOiBpeG0uaW5kaWNlcy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5icmlja3MuYWRkKGJyaWNrKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhZGQgcGFkZGxlXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCB3aWR0aCA9IHRoaXMubGV2ZWxEYXRhLnBhZGRsZVdpZHRoXHJcbiAgICAgICAgICAgIGNvbnN0IGhhbGZFeHRlbnRzID0gbmV3IGdlby5WZWMzKHdpZHRoIC8gMiwgcGFkZGxlSGVpZ2h0IC8gMiwgcGFkZGxlRGVwdGggLyAyKVxyXG4gICAgICAgICAgICBjb25zdCBhYWJiID0gZ2VvLkFBQkIuZnJvbUhhbGZFeHRlbnRzKGhhbGZFeHRlbnRzKVxyXG4gICAgICAgICAgICBjb25zdCBpeG0gPSBnZnguSXhNZXNoLnJlY3QoYWFiYilcclxuICAgICAgICAgICAgaXhtLnZlcnRpY2VzLmZvckVhY2godiA9PiB2LmNvbG9yID0gbmV3IGdlby5WZWM0KDAsIDEsIDEsIDEpKVxyXG5cclxuICAgICAgICAgICAgY29uc3QgdmFvID0gdGhpcy5yZW5kZXJlci5jcmVhdGVNZXNoKGl4bSlcclxuICAgICAgICAgICAgdGhpcy5wYWRkbGUgPSBuZXcgUGFkZGxlKHtcclxuICAgICAgICAgICAgICAgIGhhbGZFeHRlbnRzOiBoYWxmRXh0ZW50cyxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBuZXcgZ2VvLlZlYzMoMCwgdGhpcy5maWVsZEJvdHRvbSArIGhhbGZFeHRlbnRzLnkgKyBwYWRkbGVCb3R0b21NYXJnaW4sIGhhbGZFeHRlbnRzLnopLFxyXG4gICAgICAgICAgICAgICAgYmF0Y2g6IG5ldyBnZnguQmF0Y2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbyxcclxuICAgICAgICAgICAgICAgICAgICByb3VnaG5lc3M6IC41LFxyXG4gICAgICAgICAgICAgICAgICAgIG51bUluZGljZXM6IGl4bS5pbmRpY2VzLmxlbmd0aFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFkZCBiYWxsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCByYWRpdXMgPSB0aGlzLmxldmVsRGF0YS5iYWxsUmFkaXVzXHJcbiAgICAgICAgICAgIGNvbnN0IGl4bSA9IGdmeC5JeE1lc2guc3BoZXJlKDE2LCAxNilcclxuICAgICAgICAgICAgaXhtLnRyYW5zZm9ybShnZW8uTWF0NC5zY2FsaW5nKG5ldyBnZW8uVmVjMyhyYWRpdXMsIHJhZGl1cywgcmFkaXVzKSkpXHJcbiAgICAgICAgICAgIGl4bS52ZXJ0aWNlcy5mb3JFYWNoKHYgPT4gdi5jb2xvciA9IG5ldyBnZW8uVmVjNCgwLCAwLCAxLCAxKSlcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHZhbyA9IHRoaXMucmVuZGVyZXIuY3JlYXRlTWVzaChpeG0pXHJcbiAgICAgICAgICAgIHRoaXMuYmFsbCA9IG5ldyBCYWxsKHtcclxuICAgICAgICAgICAgICAgIHJhZGl1czogcmFkaXVzLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5ldyBnZW8uVmVjMygwLCB0aGlzLnBhZGRsZS5wb3NpdGlvbi55ICsgdGhpcy5wYWRkbGUuaGFsZkV4dGVudHMueSArIHJhZGl1cywgcmFkaXVzKSxcclxuICAgICAgICAgICAgICAgIGJhdGNoOiBuZXcgZ2Z4LkJhdGNoKHtcclxuICAgICAgICAgICAgICAgICAgICB2YW8sXHJcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdWdobmVzczogMCxcclxuICAgICAgICAgICAgICAgICAgICBudW1JbmRpY2VzOiBpeG0uaW5kaWNlcy5sZW5ndGhcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcGxheUltcGFjdFNvdW5kKCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHNvdW5kID0gcmFuZC5jaG9vc2UodGhpcy5ybmcsIHRoaXMuaW1wYWN0U291bmRzKVxyXG4gICAgICAgIGNvbnN0IHNyYyA9IHRoaXMuYWMuY3JlYXRlQnVmZmVyU291cmNlKClcclxuICAgICAgICBzcmMuYnVmZmVyID0gc291bmRcclxuICAgICAgICBzcmMuY29ubmVjdCh0aGlzLmFjLmRlc3RpbmF0aW9uKVxyXG4gICAgICAgIHNyYy5zdGFydCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmaW5kTmVhcmVzdFBvaW50T25CcmljayhicmljazogQnJpY2ssIHBvc2l0aW9uOiBnZW8uVmVjMyk6IGdlby5WZWMzIHtcclxuICAgICAgICBjb25zdCBhYWJiID0gZ2VvLkFBQkIuZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMoYnJpY2sucG9zaXRpb24sIEJyaWNrLmhhbGZFeHRlbnRzKVxyXG4gICAgICAgIGNvbnN0IG5lYXJlc3QgPSBwb3NpdGlvbi5jbGFtcChhYWJiLm1pbiwgYWFiYi5tYXgpXHJcbiAgICAgICAgcmV0dXJuIG5lYXJlc3RcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZpbmROZWFyZXN0QnJpY2socG9zaXRpb246IGdlby5WZWMzLCByYWRpdXM6IG51bWJlcik6IEJyaWNrIHwgbnVsbCB7XHJcbiAgICAgICAgY29uc3QgcjIgPSByYWRpdXMgKiByYWRpdXNcclxuICAgICAgICBsZXQgbWluRGlzdFNxID0gcjJcclxuICAgICAgICBsZXQgbmVhcmVzdEJyaWNrOiBCcmljayB8IG51bGwgPSBudWxsXHJcbiAgICAgICAgZm9yIChjb25zdCBicmljayBvZiB0aGlzLmJyaWNrcykge1xyXG4gICAgICAgICAgICBjb25zdCBuZWFyZXN0UHQgPSB0aGlzLmZpbmROZWFyZXN0UG9pbnRPbkJyaWNrKGJyaWNrLCBwb3NpdGlvbilcclxuICAgICAgICAgICAgY29uc3QgZGlzdFNxID0gbmVhcmVzdFB0LnN1Yihwb3NpdGlvbikubGVuZ3RoU3EoKVxyXG4gICAgICAgICAgICBpZiAoZGlzdFNxIDwgbWluRGlzdFNxKSB7XHJcbiAgICAgICAgICAgICAgICBuZWFyZXN0QnJpY2sgPSBicmlja1xyXG4gICAgICAgICAgICAgICAgbWluRGlzdFNxID0gZGlzdFNxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBuZWFyZXN0QnJpY2tcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZVdvcmxkTWF0cmljZXMoKSB7XHJcbiAgICAgICAgdGhpcy5iYWxsLmJhdGNoLndvcmxkTWF0cml4ID0gZ2VvLk1hdDQudHJhbnNsYXRpb24odGhpcy5iYWxsLnBvc2l0aW9uKVxyXG4gICAgICAgIHRoaXMucGFkZGxlLmJhdGNoLndvcmxkTWF0cml4ID0gZ2VvLk1hdDQudHJhbnNsYXRpb24odGhpcy5wYWRkbGUucG9zaXRpb24pXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkcmF3U2NlbmUoKSB7XHJcbiAgICAgICAgLy8gY29uZmlndXJlIGNhbWVyYSAtIGZpdCBwbGF5IGFyZWEgdG8gc2NyZWVuIHdpdGggc29tZSBzbWFsbCBtYXJnaW5cclxuICAgICAgICBsZXQgeiA9IDBcclxuICAgICAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmZpZWxkVG9wIC0gdGhpcy5maWVsZEJvdHRvbSArIGJvcmRlcldpZHRoICogMlxyXG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5maWVsZFJpZ2h0IC0gdGhpcy5maWVsZExlZnQgKyBib3JkZXJXaWR0aCAqIDJcclxuICAgICAgICBjb25zdCBmaWVsZEFzcGVjdCA9IHdpZHRoIC8gaGVpZ2h0XHJcbiAgICAgICAgaWYgKGZpZWxkQXNwZWN0IDwgdGhpcy5yZW5kZXJlci5hc3BlY3QpIHtcclxuICAgICAgICAgICAgeiA9IGhlaWdodCAvIDIgLyBNYXRoLnRhbih0aGlzLnJlbmRlcmVyLmZvdiAvIDIpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgeiA9IHdpZHRoIC8gMiAvIE1hdGgudGFuKHRoaXMucmVuZGVyZXIuZm92ICogdGhpcy5yZW5kZXJlci5hc3BlY3QgLyAyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIudmlld01hdHJpeCA9IGdlby5NYXQ0Lmxvb2tBdChcclxuICAgICAgICAgICAgbmV3IGdlby5WZWMzKDAsIDAsIDEgKyB6KSwgbmV3IGdlby5WZWMzKDAsIDAsIC0xKSwgbmV3IGdlby5WZWMzKDAsIDEsIDApKS5pbnZlcnQoKVxyXG5cclxuICAgICAgICAvLyBzaG93IGZyb20gc2lkZSB2aWV3IGZvciBkZWJ1Z2dpbmdcclxuICAgICAgICAvLyB0aGlzLnJlbmRlcmVyLnZpZXdNYXRyaXggPSBnZW8uTWF0NC5sb29rQXQoXHJcbiAgICAgICAgLy8gICAgIG5ldyBnZW8uVmVjMygwLCAtMTYsIDApLCBuZXcgZ2VvLlZlYzMoMCwgMSwgMCksIG5ldyBnZW8uVmVjMygwLCAwLCAxKSkuaW52ZXJ0KClcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3QmF0Y2godGhpcy5maWVsZEJhdGNoKVxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd0JhdGNoKHRoaXMuYmFsbC5iYXRjaClcclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdCYXRjaCh0aGlzLnBhZGRsZS5iYXRjaClcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBicmljayBvZiB0aGlzLmJyaWNrcykge1xyXG4gICAgICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdCYXRjaChicmljay5iYXRjaClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIucHJlc2VudCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYW52YXNUb05EQyhjYzogZ2VvLlZlYzIpOiBnZW8uVmVjMiB7XHJcbiAgICAgICAgY29uc3QgbmRjID0gbmV3IGdlby5WZWMyKFxyXG4gICAgICAgICAgICBjYy54IC8gdGhpcy5jYW52YXMud2lkdGggKiAyIC0gMSxcclxuICAgICAgICAgICAgLWNjLnkgLyB0aGlzLmNhbnZhcy5oZWlnaHQgKiAyICsgMVxyXG4gICAgICAgIClcclxuXHJcbiAgICAgICAgcmV0dXJuIG5kY1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FudmFzVG9ORENSYXkoY2M6IGdlby5WZWMyKTogZ2VvLlJheSB7XHJcbiAgICAgICAgY29uc3QgbmRjID0gdGhpcy5jYW52YXNUb05EQyhjYylcclxuICAgICAgICBjb25zdCByYXkgPSBuZXcgZ2VvLlJheShuZXcgZ2VvLlZlYzMobmRjLngsIG5kYy55LCAtMSksIG5ldyBnZW8uVmVjMygwLCAwLCAxKSlcclxuICAgICAgICByZXR1cm4gcmF5XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYW52YXNUb1dvcmxkUmF5KGNjOiBnZW8uVmVjMik6IGdlby5SYXkge1xyXG4gICAgICAgIGNvbnN0IG5kY1JheSA9IHRoaXMuY2FudmFzVG9ORENSYXkoY2MpXHJcbiAgICAgICAgY29uc3QgaW52UHJvaiA9IHRoaXMucmVuZGVyZXIucHJvamVjdGlvbk1hdHJpeC5pbnZlcnQoKVxyXG4gICAgICAgIGNvbnN0IGludlZpZXcgPSB0aGlzLnJlbmRlcmVyLnZpZXdNYXRyaXguaW52ZXJ0KClcclxuICAgICAgICBjb25zdCBpbnZWaWV3UHJvaiA9IHRoaXMucmVuZGVyZXIucHJvamVjdGlvbk1hdHJpeC5tYXRtdWwodGhpcy5yZW5kZXJlci52aWV3TWF0cml4KS5pbnZlcnQoKVxyXG4gICAgICAgIGNvbnN0IHZpZXdSYXkgPSBuZGNSYXkudHJhbnNmb3JtKGludlByb2opXHJcbiAgICAgICAgY29uc3Qgd29ybGRSYXkgPSB2aWV3UmF5LnRyYW5zZm9ybShpbnZWaWV3KVxyXG5cclxuICAgICAgICBpZiAodGhpcy5pbnAubW91c2VMZWZ0UmVsZWFzZWQpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJjYzogXCIsIGNjLnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibmRjOiBcIiwgbmRjUmF5LnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidmlldzogXCIsIHZpZXdSYXkudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ3b3JsZDogXCIsIHdvcmxkUmF5LnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid29ybGQyOiBcIiwgbmRjUmF5LnRyYW5zZm9ybShpbnZWaWV3UHJvaikudG9TdHJpbmcoKSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB3b3JsZFJheVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVSTkcoKTogcmFuZC5STkcgIHtcclxuICAgIGNvbnN0IHNlZWQgPSByYW5kLnhtdXIzKG5ldyBEYXRlKCkudG9TdHJpbmcoKSlcclxuICAgIGNvbnN0IHJuZyA9IG5ldyByYW5kLlNGQzMyUk5HKHNlZWQoKSwgc2VlZCgpLCBzZWVkKCksIHNlZWQoKSlcclxuICAgIHJldHVybiBybmdcclxufVxyXG5cclxuY29uc3QgYXBwID0gbmV3IEFwcCgpXHJcbmFwcC5leGVjKClcclxuIl19