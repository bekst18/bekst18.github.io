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
let Brick = /** @class */ (() => {
    class Brick {
        constructor(options) {
            this.batch = new gfx.Batch();
            this.position = new geo.Vec3(0, 0, 0);
            this.position = options.position.clone();
            this.batch = options.batch;
        }
    }
    Brick.halfExtents = new geo.Vec3(brickWidth / 2 - brickMargin, brickHeight / 2 - brickMargin, brickDepth / 2);
    return Brick;
})();
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
        const rot = geo.Mat3.rotationZ(rand.float(-Math.PI / 4, Math.PI / 4));
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
            this.ball.position = new geo.Vec3(0, this.paddle.position.y + this.paddle.halfExtents.y + this.ball.radius, this.ball.radius),
                this.playImpactSound();
            this.state = GameState.Launch;
            this.ballsRemaining--;
            if (this.ballsRemaining <= 0) {
                this.gameOver();
            }
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
                            diffuseColor: rand.choose(brickColors),
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
        const sound = rand.choose(this.impactSounds);
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
const app = new App();
app.exec();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtvdXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJicmVha291dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQixNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUE7QUFDcEIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFBO0FBQ3JCLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQTtBQUNyQixNQUFNLFlBQVksR0FBRyxFQUFFLENBQUE7QUFDdkIsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFBO0FBQ3RCLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQTtBQUN0QixNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFDckIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFBO0FBQ3RCLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQTtBQUN2QixNQUFNLGtCQUFrQixHQUFHLENBQUMsQ0FBQTtBQUU1QixNQUFNLFlBQVksR0FBRyw4Q0FBOEMsQ0FBQTtBQUNuRSxNQUFNLGVBQWUsR0FBRyxxREFBcUQsQ0FBQTtBQUM3RSxNQUFNLGdCQUFnQixHQUFHLHVEQUF1RCxDQUFBO0FBWWhGLE1BQU0sTUFBTSxHQUFHLElBQUksS0FBSztBQUNwQixVQUFVO0FBQ1Y7SUFDSSxTQUFTLEVBQUUsRUFBRTtJQUNiLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzdDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsQ0FBQztJQUNiLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQ3pDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEdBQUc7SUFDZCxVQUFVLEVBQUUsR0FBRztJQUNmLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ3ZDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ3pDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEdBQUc7SUFDZCxVQUFVLEVBQUUsR0FBRztJQUNmLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzdDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3JDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzFDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxHQUFHO0lBQ2hCLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUM3QztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxHQUFHO0lBQ2QsVUFBVSxFQUFFLEdBQUc7SUFDZixXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN2QyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUMzQztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxFQUFFO0lBQ2IsVUFBVSxFQUFFLEVBQUU7SUFDZCxXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUM3QztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxFQUFFO0lBQ2IsVUFBVSxFQUFFLEVBQUU7SUFDZCxXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztDQUMxQyxDQUNKLENBQUE7QUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLEtBQUssQ0FDekIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3hCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3hCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUMxQixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQzFCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDMUIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM1QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQzVCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFF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QyxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1lBQ3BFLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFBO1lBQ2pDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1lBQ3hCLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUN6RCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7U0FDekI7UUFFRCxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1lBQ2pDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFBO1lBQ2pDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1lBQ3hCLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUN6RCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7U0FDekI7UUFFRCxpQkFBaUI7UUFDakIsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtZQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FB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RyxJQUFJLEdBQUcsRUFBRSxDQUFBO0FBQ3JCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzNkLmpzXCJcclxuaW1wb3J0ICogYXMgaW5wdXQgZnJvbSBcIi4uL3NoYXJlZC9pbnB1dC5qc1wiXHJcbmltcG9ydCAqIGFzIHJhbmQgZnJvbSBcIi4uL3NoYXJlZC9yYW5kLmpzXCJcclxuaW1wb3J0ICogYXMgbWF0aCBmcm9tIFwiLi4vc2hhcmVkL21hdGguanNcIlxyXG5pbXBvcnQgKiBhcyBhdWRpbyBmcm9tIFwiLi4vc2hhcmVkL2F1ZGlvLmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcblxyXG5jb25zdCBicmlja1dpZHRoID0gMlxyXG5jb25zdCBicmlja0hlaWdodCA9IDFcclxuY29uc3QgYnJpY2tEZXB0aCA9IC41XHJcbmNvbnN0IHBhZGRsZUhlaWdodCA9IC41XHJcbmNvbnN0IHBhZGRsZURlcHRoID0gLjVcclxuY29uc3QgcGFkZGxlU3BlZWQgPSAuNVxyXG5jb25zdCBib3JkZXJXaWR0aCA9IDFcclxuY29uc3QgdG9wUm93TWFyZ2luID0gMVxyXG5jb25zdCBicmlja01hcmdpbiA9IC4wNVxyXG5jb25zdCBwYWRkbGVCb3R0b21NYXJnaW4gPSAxXHJcblxyXG5jb25zdCBzdGFydE1lc3NhZ2UgPSBcIlRhcCwgY2xpY2ssIG9yIHByZXNzIGFueSBrZXkgdG8gbGF1bmNoIGJhbGwuXCJcclxuY29uc3QgZ2FtZU92ZXJNZXNzYWdlID0gXCJHYW1lIG92ZXIhIFRhcCwgY2xpY2ssIG9yIHByZXNzIGFueSBrZXkgdG8gcmVzdGFydC5cIlxyXG5jb25zdCBuZXh0TGV2ZWxNZXNzYWdlID0gXCJMZXZlbCBDbGVhciEgVGFwLCBjbGljaywgb3IgcHJlc3MgYW55IGtleSB0byBhZHZhbmNlLlwiXHJcblxyXG5pbnRlcmZhY2UgTGV2ZWxEYXRhIHtcclxuICAgIGJhbGxTcGVlZDogbnVtYmVyXHJcbiAgICBiYWxsUmFkaXVzOiBudW1iZXJcclxuICAgIHBhZGRsZVdpZHRoOiBudW1iZXJcclxuICAgIGJyaWNrUm93czogbnVtYmVyXHJcbiAgICBicmlja0NvbHM6IG51bWJlclxyXG4gICAgYm9yZGVyQ29sb3I6IGdlby5WZWM0XHJcbiAgICBmbG9vckNvbG9yOiBnZW8uVmVjNFxyXG59XHJcblxyXG5jb25zdCBsZXZlbHMgPSBuZXcgQXJyYXk8TGV2ZWxEYXRhPihcclxuICAgIC8vIGxldmVsIDFcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC4yLFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IDEuMjUsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDYsXHJcbiAgICAgICAgYnJpY2tSb3dzOiAzLFxyXG4gICAgICAgIGJyaWNrQ29sczogNyxcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KC4yNSwgMCwgMCwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KC4yNSwgLjI1LCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgMlxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjMsXHJcbiAgICAgICAgYmFsbFJhZGl1czogMSxcclxuICAgICAgICBwYWRkbGVXaWR0aDogNixcclxuICAgICAgICBicmlja1Jvd3M6IDMsXHJcbiAgICAgICAgYnJpY2tDb2xzOiA3LFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgLjI1LCAwLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgMCwgLjI1LCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDNcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC4zNSxcclxuICAgICAgICBiYWxsUmFkaXVzOiAuNzUsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDYsXHJcbiAgICAgICAgYnJpY2tSb3dzOiAzLFxyXG4gICAgICAgIGJyaWNrQ29sczogNSxcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KDAsIDAsIC41NSwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KDAsIDAsIDAsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgNFxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjQsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjYsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDUsXHJcbiAgICAgICAgYnJpY2tSb3dzOiAzLFxyXG4gICAgICAgIGJyaWNrQ29sczogNixcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KC42LCAuNSwgMCwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KDAsIC4yNSwgMCwgMSlcclxuICAgIH0sXHJcbiAgICAvLyBsZXZlbCA1XHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuNDUsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjU1LFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiA0LFxyXG4gICAgICAgIGJyaWNrUm93czogMyxcclxuICAgICAgICBicmlja0NvbHM6IDgsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAuNSwgLjYsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCguMjUsIC4yNSwgLjI1LCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDZcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC41LFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC41LFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiA0LFxyXG4gICAgICAgIGJyaWNrUm93czogNCxcclxuICAgICAgICBicmlja0NvbHM6IDgsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCgxLCAwLCAwLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgLjMsIC4yNSwgMSlcclxuICAgIH0sXHJcbiAgICAvLyBsZXZlbCA3XHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuNixcclxuICAgICAgICBiYWxsUmFkaXVzOiAuNCxcclxuICAgICAgICBwYWRkbGVXaWR0aDogMy41LFxyXG4gICAgICAgIGJyaWNrUm93czogNCxcclxuICAgICAgICBicmlja0NvbHM6IDEwLFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoMSwgMSwgMCwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KC4yNSwgLjI1LCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgOFxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjY1LFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC4zNSxcclxuICAgICAgICBwYWRkbGVXaWR0aDogMyxcclxuICAgICAgICBicmlja1Jvd3M6IDUsXHJcbiAgICAgICAgYnJpY2tDb2xzOiAxMCxcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KC41LCAuNiwgMSwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KC4yNSwgMCwgLjI1LCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDlcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC43LFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC4zLFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiAyLFxyXG4gICAgICAgIGJyaWNrUm93czogNixcclxuICAgICAgICBicmlja0NvbHM6IDEyLFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgMSwgMSwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KC4zNSwgLjE1LCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgOVxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjgsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjIsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDEsXHJcbiAgICAgICAgYnJpY2tSb3dzOiA4LFxyXG4gICAgICAgIGJyaWNrQ29sczogMTUsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCgxLCAxLCAxLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjEsIC4xLCAuNCwgMSlcclxuICAgIH0sXHJcbilcclxuXHJcbmNvbnN0IGJyaWNrQ29sb3JzID0gbmV3IEFycmF5PGdlby5WZWM0PihcclxuICAgIG5ldyBnZW8uVmVjNCgxLCAwLCAwLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgwLCAxLCAwLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgwLCAwLCAxLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgwLCAxLCAxLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgxLCAwLCAxLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgxLCAxLCAxLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCguNSwgLjUsIDAsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDAsIC41LCAuNSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoLjUsIDAsIC41LCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCguMjUsIC43NSwgMCwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMCwgLjI1LCAuNzUsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KC4yNSwgMCwgLjc1LCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCguNzUsIC4yNSwgMCwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMCwgLjc1LCAuMjUsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KC43NSwgMCwgLjI1LCAxKSxcclxuKVxyXG5cclxuaW50ZXJmYWNlIFBhZGRsZU9wdGlvbnMge1xyXG4gICAgaGFsZkV4dGVudHM6IGdlby5WZWMzXHJcbiAgICBwb3NpdGlvbjogZ2VvLlZlYzNcclxuICAgIGJhdGNoOiBnZnguQmF0Y2hcclxuICAgIHZlbG9jaXR5PzogZ2VvLlZlYzNcclxufVxyXG5cclxuY2xhc3MgUGFkZGxlIHtcclxuICAgIHB1YmxpYyByZWFkb25seSBoYWxmRXh0ZW50czogZ2VvLlZlYzNcclxuICAgIHB1YmxpYyByZWFkb25seSBiYXRjaCA9IG5ldyBnZnguQmF0Y2goKVxyXG4gICAgcG9zaXRpb24gPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgIHZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogUGFkZGxlT3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMuaGFsZkV4dGVudHMgPSBvcHRpb25zLmhhbGZFeHRlbnRzLmNsb25lKClcclxuICAgICAgICB0aGlzLmJhdGNoID0gb3B0aW9ucy5iYXRjaFxyXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uLmNsb25lKClcclxuICAgICAgICB0aGlzLnZlbG9jaXR5ID0gb3B0aW9ucy52ZWxvY2l0eT8uY2xvbmUoKSA/PyBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIEJyaWNrT3B0aW9ucyB7XHJcbiAgICBwb3NpdGlvbjogZ2VvLlZlYzNcclxuICAgIGJhdGNoOiBnZnguQmF0Y2hcclxufVxyXG5cclxuY2xhc3MgQnJpY2sge1xyXG4gICAgcHVibGljIHJlYWRvbmx5IGJhdGNoID0gbmV3IGdmeC5CYXRjaCgpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgcG9zaXRpb24gPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgIHN0YXRpYyByZWFkb25seSBoYWxmRXh0ZW50cyA9IG5ldyBnZW8uVmVjMyhicmlja1dpZHRoIC8gMiAtIGJyaWNrTWFyZ2luLCBicmlja0hlaWdodCAvIDIgLSBicmlja01hcmdpbiwgYnJpY2tEZXB0aCAvIDIpXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQnJpY2tPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IG9wdGlvbnMucG9zaXRpb24uY2xvbmUoKVxyXG4gICAgICAgIHRoaXMuYmF0Y2ggPSBvcHRpb25zLmJhdGNoXHJcbiAgICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSBCYWxsT3B0aW9ucyB7XHJcbiAgICByYWRpdXM6IG51bWJlclxyXG4gICAgcG9zaXRpb246IGdlby5WZWMzXHJcbiAgICBiYXRjaDogZ2Z4LkJhdGNoXHJcbiAgICB2ZWxvY2l0eT86IGdlby5WZWMzXHJcbn1cclxuXHJcbmNsYXNzIEJhbGwge1xyXG4gICAgcmFkaXVzOiBudW1iZXIgPSAxXHJcbiAgICBwb3NpdGlvbjogZ2VvLlZlYzNcclxuICAgIGJhdGNoOiBnZnguQmF0Y2hcclxuICAgIHZlbG9jaXR5OiBnZW8uVmVjM1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEJhbGxPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5yYWRpdXMgPSBvcHRpb25zLnJhZGl1c1xyXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uLmNsb25lKClcclxuICAgICAgICB0aGlzLmJhdGNoID0gb3B0aW9ucy5iYXRjaFxyXG4gICAgICAgIHRoaXMudmVsb2NpdHkgPSBvcHRpb25zLnZlbG9jaXR5Py5jbG9uZSgpID8/IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgfVxyXG59XHJcblxyXG5lbnVtIEdhbWVTdGF0ZSB7XHJcbiAgICBQbGF5LFxyXG4gICAgTGF1bmNoLFxyXG4gICAgV2FpdFxyXG59XHJcblxyXG4vLyBzdGVwIDEgLSBjbGVhciBzY3JlZW4sIGluaXQgZ2wsIGV0Yy4uLlxyXG4vLyBzdGVwIDIgLSBkcmF3IGEgY2xpcCBzcGFjZSB0cmlhbmdsZVxyXG4vLyBzdGVwIDMgLSBkcmF3IGEgd29ybGQgc3BhY2UgdHJpYW5nbGVcclxuY2xhc3MgQXBwIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FudmFzID0gZG9tLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWxTcGFuID0gZG9tLmJ5SWQoXCJsZXZlbFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBiYWxsc1JlbWFpbmluZ1NwYW4gPSBkb20uYnlJZChcImJhbGxzUmVtYWluaW5nXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1lc3NhZ2VEaXYgPSBkb20uYnlJZChcIm1lc3NhZ2VcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmVuZGVyZXIgPSBuZXcgZ2Z4LlJlbmRlcmVyKHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbnAgPSBuZXcgaW5wdXQuSW5wdXQodGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIGZpZWxkQmF0Y2g6IGdmeC5CYXRjaCA9IG5ldyBnZnguQmF0Y2goKVxyXG4gICAgcHJpdmF0ZSBwYWRkbGUhOiBQYWRkbGVcclxuICAgIHByaXZhdGUgYmFsbCE6IEJhbGxcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYnJpY2tzID0gbmV3IFNldDxCcmljaz4oKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBhYyA9IG5ldyBBdWRpb0NvbnRleHQoKVxyXG4gICAgcHJpdmF0ZSBpbXBhY3RTb3VuZHMgPSBuZXcgQXJyYXk8QXVkaW9CdWZmZXI+KClcclxuICAgIHByaXZhdGUgYmFsbHNSZW1haW5pbmcgPSAzXHJcbiAgICBwcml2YXRlIGxldmVsID0gMVxyXG4gICAgcHJpdmF0ZSBzdGF0ZSA9IEdhbWVTdGF0ZS5MYXVuY2hcclxuICAgIHByaXZhdGUgY29udGludWUgPSAoKSA9PiB7IH1cclxuXHJcbiAgICBhc3luYyBleGVjKCkge1xyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IHN0YXJ0TWVzc2FnZVxyXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoKSA9PiB0aGlzLmhhbmRsZUtleVVwKCkpXHJcblxyXG4gICAgICAgIHRoaXMuaW5pdExldmVsKClcclxuICAgICAgICBhd2FpdCB0aGlzLmluaXRBdWRpbygpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuZm9jdXMoKVxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLnRpY2soKSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGluaXRBdWRpbygpIHtcclxuICAgICAgICBjb25zdCBudW1JbXBhY3RTb3VuZHMgPSAxNVxyXG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IG51bUltcGFjdFNvdW5kczsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IGAuL2Fzc2V0cy9pbXBhY3Qke2l9LndhdmBcclxuICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgYXVkaW8ubG9hZEF1ZGlvKHRoaXMuYWMsIHVybClcclxuICAgICAgICAgICAgdGhpcy5pbXBhY3RTb3VuZHMucHVzaChidWZmZXIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdGljaygpIHtcclxuICAgICAgICB0aGlzLmNoZWNrU2l6ZSgpXHJcbiAgICAgICAgdGhpcy51cGRhdGUoKVxyXG4gICAgICAgIHRoaXMuZHJhd1NjZW5lKClcclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy50aWNrKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjaGVja1NpemUoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY2FudmFzLndpZHRoID09PSB0aGlzLmNhbnZhcy5jbGllbnRXaWR0aCAmJiB0aGlzLmNhbnZhcy5oZWlnaHQgPT09IHRoaXMuY2FudmFzLmNsaWVudEhlaWdodCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5jYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHRcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZSgpIHtcclxuICAgICAgICB0aGlzLnBhZGRsZS5wb3NpdGlvbiA9IHRoaXMucGFkZGxlLnBvc2l0aW9uLmFkZCh0aGlzLnBhZGRsZS52ZWxvY2l0eSlcclxuICAgICAgICB0aGlzLmJhbGwucG9zaXRpb24gPSB0aGlzLmJhbGwucG9zaXRpb24uYWRkKHRoaXMuYmFsbC52ZWxvY2l0eSlcclxuICAgICAgICB0aGlzLmhhbmRsZUlucHV0KClcclxuICAgICAgICB0aGlzLmhhbmRsZUNvbGxpc2lvbigpXHJcbiAgICAgICAgdGhpcy51cGRhdGVXb3JsZE1hdHJpY2VzKClcclxuICAgICAgICB0aGlzLnVwZGF0ZVVJKClcclxuICAgICAgICB0aGlzLmlucC5mbHVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVVSSgpIHtcclxuICAgICAgICB0aGlzLmJhbGxzUmVtYWluaW5nU3Bhbi50ZXh0Q29udGVudCA9IHRoaXMuYmFsbHNSZW1haW5pbmcudG9TdHJpbmcoKVxyXG4gICAgICAgIHRoaXMubGV2ZWxTcGFuLnRleHRDb250ZW50ID0gdGhpcy5sZXZlbC50b1N0cmluZygpXHJcblxyXG4gICAgICAgIGlmICh0aGlzLm1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgdGhpcy5tZXNzYWdlRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5tZXNzYWdlRGl2LmhpZGRlbiA9IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgbGV2ZWxEYXRhKCk6IExldmVsRGF0YSB7XHJcbiAgICAgICAgY29uc3QgZGF0YSA9IGxldmVsc1tNYXRoLm1pbih0aGlzLmxldmVsIC0gMSwgbGV2ZWxzLmxlbmd0aCAtIDEpXVxyXG4gICAgICAgIHJldHVybiBkYXRhXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRXaWR0aCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBicmlja1dpZHRoICogdGhpcy5sZXZlbERhdGEuYnJpY2tDb2xzXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRIZWlnaHQoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gYnJpY2tIZWlnaHQgKiB0aGlzLmxldmVsRGF0YS5icmlja1Jvd3MgKiA0ICsgdG9wUm93TWFyZ2luXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRMZWZ0KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIC10aGlzLmZpZWxkV2lkdGggLyAyXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRSaWdodCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZpZWxkTGVmdCArIHRoaXMuZmllbGRXaWR0aFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IGZpZWxkQm90dG9tKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIC10aGlzLmZpZWxkSGVpZ2h0IC8gMlxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IGZpZWxkVG9wKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmllbGRCb3R0b20gKyB0aGlzLmZpZWxkSGVpZ2h0XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgbWVzc2FnZSgpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2VEaXYudGV4dENvbnRlbnQgPz8gXCJcIlxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2V0IG1lc3NhZ2UodGV4dDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy5tZXNzYWdlRGl2LnRleHRDb250ZW50ID0gdGV4dFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlS2V5VXAoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT09IEdhbWVTdGF0ZS5QbGF5KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT09IEdhbWVTdGF0ZS5XYWl0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGludWUoKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubGF1bmNoQmFsbCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVJbnB1dCgpIHtcclxuICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcclxuICAgICAgICAgICAgY2FzZSBHYW1lU3RhdGUuTGF1bmNoOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dExhdW5jaCgpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBHYW1lU3RhdGUuUGxheTpcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlSW5wdXRQbGF5KClcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIEdhbWVTdGF0ZS5XYWl0OlxyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dFdhaXQoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVJbnB1dExhdW5jaCgpOiB2b2lkIHtcclxuICAgICAgICAvLyBzdGFydCBnYW1lIG9uIG1vdXNlIGNpY2tcclxuICAgICAgICBpZiAodGhpcy5pbnAubW91c2VMZWZ0UHJlc3NlZCkge1xyXG4gICAgICAgICAgICB0aGlzLmxhdW5jaEJhbGwoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUlucHV0UGxheSgpIHtcclxuICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG5cclxuICAgICAgICAvLyBtb3VzZSAvIHRvdWNoIHBhZGRsZSBtb3ZlbWVudFxyXG4gICAgICAgIGlmICh0aGlzLmlucC5tb3VzZUxlZnREb3duKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHdvcmxkTW91c2VSYXkgPSB0aGlzLmNhbnZhc1RvV29ybGRSYXkobmV3IGdlby5WZWMyKHRoaXMuaW5wLm1vdXNlWCwgdGhpcy5pbnAubW91c2VZKSlcclxuICAgICAgICAgICAgY29uc3QgZmllbGRQbGFuZSA9IGdlby5QbGFuZS5mcm9tUG9pbnROb3JtYWwodGhpcy5wYWRkbGUucG9zaXRpb24sIG5ldyBnZW8uVmVjMygwLCAwLCAxKSlcclxuICAgICAgICAgICAgY29uc3QgZmllbGRJeCA9IHdvcmxkTW91c2VSYXkubGVycCh3b3JsZE1vdXNlUmF5LmNhc3QoZmllbGRQbGFuZSkpXHJcbiAgICAgICAgICAgIGlmIChmaWVsZEl4LnggPiB0aGlzLnBhZGRsZS5wb3NpdGlvbi54KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygxLCAwLCAwKVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZpZWxkSXgueCA8IHRoaXMucGFkZGxlLnBvc2l0aW9uLngpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKC0xLCAwLCAwKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBrZXlib2FyZCBwYWRkbGUgbW92ZW1lbnRcclxuICAgICAgICBpZiAodGhpcy5pbnAuZG93bihcImFcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoLTEsIDAsIDApXHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlucC5kb3duKFwiZFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygxLCAwLCAwKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucGFkZGxlLnZlbG9jaXR5Lmxlbmd0aFNxKCkgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gdGhpcy5wYWRkbGUudmVsb2NpdHkubm9ybWFsaXplKCkubXVsWChwYWRkbGVTcGVlZClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVJbnB1dFdhaXQoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuaW5wLm1vdXNlTGVmdERvd24pIHtcclxuICAgICAgICAgICAgdGhpcy5jb250aW51ZSgpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbGF1bmNoQmFsbCgpIHtcclxuICAgICAgICAvLyBjaG9vc2UgcmFuZG9tIHVwd2FyZCBsYXVuY2ggZGlyZWN0aW9uXHJcbiAgICAgICAgY29uc3Qgcm90ID0gZ2VvLk1hdDMucm90YXRpb25aKHJhbmQuZmxvYXQoLU1hdGguUEkgLyA0LCBNYXRoLlBJIC8gNCkpXHJcbiAgICAgICAgY29uc3QgdiA9IHJvdC50cmFuc2Zvcm0obmV3IGdlby5WZWMzKDAsIDEsIDApKS5ub3JtYWxpemUoKVxyXG4gICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eSA9IHYubXVsWCh0aGlzLmxldmVsRGF0YS5iYWxsU3BlZWQpXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IEdhbWVTdGF0ZS5QbGF5XHJcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gXCJcIlxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlQ29sbGlzaW9uKCkge1xyXG4gICAgICAgIGlmICh0aGlzLnN0YXRlICE9PSBHYW1lU3RhdGUuUGxheSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGlzIHBhZGRsZSBnb2luZyB0byBjcm9zcyBib3VuZGFyeT9cclxuICAgICAgICBjb25zdCBib3VuZHMgPSBnZW8uQUFCQi5mcm9tQ29vcmRzKFxyXG4gICAgICAgICAgICB0aGlzLmZpZWxkTGVmdCwgdGhpcy5maWVsZEJvdHRvbSwgLTEsXHJcbiAgICAgICAgICAgIHRoaXMuZmllbGRSaWdodCwgdGhpcy5maWVsZFRvcCwgMSlcclxuXHJcbiAgICAgICAgY29uc3QgcGFkZGxlUG9zaXRpb24gPSB0aGlzLnBhZGRsZS5wb3NpdGlvbi5hZGQodGhpcy5wYWRkbGUudmVsb2NpdHkpXHJcbiAgICAgICAgY29uc3QgcGFkZGxlQm91bmRzID0gZ2VvLkFBQkIuZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMocGFkZGxlUG9zaXRpb24sIHRoaXMucGFkZGxlLmhhbGZFeHRlbnRzKVxyXG5cclxuICAgICAgICBjb25zdCBiYWxsUG9zaXRpb24gPSB0aGlzLmJhbGwucG9zaXRpb24uYWRkKHRoaXMuYmFsbC52ZWxvY2l0eSlcclxuICAgICAgICBjb25zdCBiYWxsQm91bmRzID0gZ2VvLkFBQkIuZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMoYmFsbFBvc2l0aW9uLCBuZXcgZ2VvLlZlYzModGhpcy5iYWxsLnJhZGl1cywgdGhpcy5iYWxsLnJhZGl1cywgdGhpcy5iYWxsLnJhZGl1cykpXHJcbiAgICAgICAgY29uc3QgYmFsbFNwZWVkID0gdGhpcy5sZXZlbERhdGEuYmFsbFNwZWVkXHJcblxyXG4gICAgICAgIC8vIGNoZWNrIHBhZGRsZSBhZ2FpbnN0IGJvdW5kYXJ5XHJcbiAgICAgICAgaWYgKHBhZGRsZUJvdW5kcy5taW4ueCA8PSB0aGlzLmZpZWxkTGVmdCB8fCBwYWRkbGVCb3VuZHMubWF4LnggPj0gdGhpcy5maWVsZFJpZ2h0KSB7XHJcbiAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBiYWxsIC8gcGFkZGxlIGhpdCBjaGVja1xyXG4gICAgICAgIGlmIChiYWxsQm91bmRzLm92ZXJsYXBzKHBhZGRsZUJvdW5kcykpIHtcclxuICAgICAgICAgICAgbGV0IHZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5XHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnkgPSAtdmVsb2NpdHkueVxyXG5cclxuICAgICAgICAgICAgLy8gYWxsb3cgcGxheWVyIHNvbWUgY29udHJvbFxyXG4gICAgICAgICAgICAvLyByaWdodCBzaWRlIG9mIHBhZGRsZSByb3RhdGVzIGFuZ2xlIHJpZ2h0XHJcbiAgICAgICAgICAgIC8vIGxlZnQgc2lkZSBvZiBwYWRkbGUgcm90YXRlcyBhbmdsZSBsZWZ0XHJcbiAgICAgICAgICAgIGNvbnN0IGFhYmIgPSBnZW8uQUFCQi5mcm9tUG9zaXRpb25IYWxmRXh0ZW50cyhwYWRkbGVQb3NpdGlvbiwgdGhpcy5wYWRkbGUuaGFsZkV4dGVudHMpXHJcbiAgICAgICAgICAgIGNvbnN0IG5lYXJlc3QgPSBiYWxsUG9zaXRpb24uY2xhbXAoYWFiYi5taW4sIGFhYmIubWF4KVxyXG4gICAgICAgICAgICBjb25zdCB0ID0gbWF0aC51bmxlcnAoYWFiYi5taW4ueCwgYWFiYi5tYXgueCwgbmVhcmVzdC54KVxyXG4gICAgICAgICAgICBjb25zdCByb3QgPSBnZW8uTWF0NC5yb3RhdGlvbloobWF0aC5sZXJwKC1NYXRoLlBJIC8gNCwgTWF0aC5QSSAvIDQsIHQpKVxyXG5cclxuICAgICAgICAgICAgLy8gY2hvb3NlIGEgcmFuZG9tIGRldmlhdGlvbiBmcm9tIHN0YW5kYXJkIHJlZmxlY3Rpb24gYW5nbGVcclxuICAgICAgICAgICAgdmVsb2NpdHkgPSByb3QudHJhbnNmb3JtMyh2ZWxvY2l0eSlcclxuICAgICAgICAgICAgdmVsb2NpdHkueiA9IDBcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gdmVsb2NpdHkubm9ybWFsaXplKCkubXVsWChiYWxsU3BlZWQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoYW5kbGUgYnJpY2sgaGl0XHJcbiAgICAgICAgY29uc3QgbmVhcmVzdEJyaWNrID0gdGhpcy5maW5kTmVhcmVzdEJyaWNrKGJhbGxQb3NpdGlvbiwgdGhpcy5iYWxsLnJhZGl1cylcclxuICAgICAgICBpZiAobmVhcmVzdEJyaWNrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFhYmIgPSBnZW8uQUFCQi5mcm9tUG9zaXRpb25IYWxmRXh0ZW50cyhuZWFyZXN0QnJpY2sucG9zaXRpb24sIEJyaWNrLmhhbGZFeHRlbnRzKVxyXG4gICAgICAgICAgICBjb25zdCBuZWFyZXN0UHQgPSB0aGlzLmZpbmROZWFyZXN0UG9pbnRPbkJyaWNrKG5lYXJlc3RCcmljaywgYmFsbFBvc2l0aW9uKVxyXG4gICAgICAgICAgICBsZXQgdmVsb2NpdHkgPSB0aGlzLmJhbGwudmVsb2NpdHlcclxuXHJcbiAgICAgICAgICAgIGlmIChuZWFyZXN0UHQueSA8PSBhYWJiLm1pbi55ICsgLjAxKSB7XHJcbiAgICAgICAgICAgICAgICB2ZWxvY2l0eS55ID0gLXZlbG9jaXR5LnlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG5lYXJlc3RQdC54IDw9IGFhYmIubWluLnggKyAuMDEpIHtcclxuICAgICAgICAgICAgICAgIHZlbG9jaXR5LnggPSAtdmVsb2NpdHkueFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobmVhcmVzdFB0LnggPj0gYWFiYi5tYXgueCAtIC4wMSkge1xyXG4gICAgICAgICAgICAgICAgdmVsb2NpdHkueCA9IC12ZWxvY2l0eS54XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChuZWFyZXN0UHQueSA+IGFhYmIubWF4LnkgLSAuMDEpIHtcclxuICAgICAgICAgICAgICAgIHZlbG9jaXR5LnkgPSAtdmVsb2NpdHkueVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB2ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKGJhbGxTcGVlZClcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5LnogPSAwXHJcbiAgICAgICAgICAgIHRoaXMuYnJpY2tzLmRlbGV0ZShuZWFyZXN0QnJpY2spXHJcbiAgICAgICAgICAgIHRoaXMucGxheUltcGFjdFNvdW5kKClcclxuXHJcbiAgICAgICAgICAgIC8vIGlmIG5vIGJyaWNrcywgbW92ZSB0byBuZXh0IGxldmVsXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJyaWNrcy5zaXplID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgICAgICAgICAgICAgIHRoaXMud2FpdChuZXh0TGV2ZWxNZXNzYWdlLCAoKSA9PiB0aGlzLm5leHRMZXZlbCgpKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpcyBiYWxsIGdvaW5nIHRvIGNyb3NzIGJvdW5kYXJ5P1xyXG4gICAgICAgIGlmIChiYWxsQm91bmRzLm1pbi54IDwgYm91bmRzLm1pbi54IHx8IGJhbGxCb3VuZHMubWF4LnggPiBib3VuZHMubWF4LngpIHtcclxuICAgICAgICAgICAgbGV0IHZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5XHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnggPSAtdmVsb2NpdHkueFxyXG4gICAgICAgICAgICB2ZWxvY2l0eS56ID0gMFxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB2ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKGJhbGxTcGVlZClcclxuICAgICAgICAgICAgdGhpcy5wbGF5SW1wYWN0U291bmQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGJhbGxCb3VuZHMubWF4LnkgPiBib3VuZHMubWF4LnkpIHtcclxuICAgICAgICAgICAgbGV0IHZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5XHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnkgPSAtdmVsb2NpdHkueVxyXG4gICAgICAgICAgICB2ZWxvY2l0eS56ID0gMFxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB2ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKGJhbGxTcGVlZClcclxuICAgICAgICAgICAgdGhpcy5wbGF5SW1wYWN0U291bmQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYmFsbCBvZmYgYm9hcmRcclxuICAgICAgICBpZiAoYmFsbEJvdW5kcy5taW4ueSA8IGJvdW5kcy5taW4ueSkge1xyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnBvc2l0aW9uID0gbmV3IGdlby5WZWMzKDAsIHRoaXMucGFkZGxlLnBvc2l0aW9uLnkgKyB0aGlzLnBhZGRsZS5oYWxmRXh0ZW50cy55ICsgdGhpcy5iYWxsLnJhZGl1cywgdGhpcy5iYWxsLnJhZGl1cyksXHJcbiAgICAgICAgICAgICAgICB0aGlzLnBsYXlJbXBhY3RTb3VuZCgpXHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBHYW1lU3RhdGUuTGF1bmNoXHJcbiAgICAgICAgICAgIHRoaXMuYmFsbHNSZW1haW5pbmctLVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuYmFsbHNSZW1haW5pbmcgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nYW1lT3ZlcigpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGNsYW1wIHkgdmVsb2NpdHkgdG8gYXZvaWQgaG9yaXpvbnRhbCBhbmdsZXNcclxuICAgICAgICBpZiAodGhpcy5iYWxsLnZlbG9jaXR5Lmxlbmd0aFNxKCkgPiAwICYmIE1hdGguYWJzKHRoaXMuYmFsbC52ZWxvY2l0eS55KSA8IGJhbGxTcGVlZCAqIC4yNSkge1xyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkueSA9IE1hdGguc2lnbih0aGlzLmJhbGwudmVsb2NpdHkueSkgKiBiYWxsU3BlZWQgKiAuMjVcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5Lm5vcm1hbGl6ZSgpLm11bFgoYmFsbFNwZWVkKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdhbWVPdmVyKCkge1xyXG4gICAgICAgIHRoaXMuYmFsbHNSZW1haW5pbmcgPSAzXHJcbiAgICAgICAgdGhpcy5sZXZlbCA9IDFcclxuICAgICAgICB0aGlzLndhaXQoZ2FtZU92ZXJNZXNzYWdlLCAoKSA9PiB0aGlzLmluaXRMZXZlbCgpKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbmV4dExldmVsKCkge1xyXG4gICAgICAgIHRoaXMubGV2ZWwrK1xyXG4gICAgICAgIHRoaXMuaW5pdExldmVsKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHdhaXQobXNnOiBzdHJpbmcsIGY6ICgpID0+IHZvaWQpIHtcclxuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtc2dcclxuICAgICAgICB0aGlzLmNvbnRpbnVlID0gZlxyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBHYW1lU3RhdGUuV2FpdFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaW5pdExldmVsKCkge1xyXG4gICAgICAgIHRoaXMuYnJpY2tzLmNsZWFyKClcclxuICAgICAgICB0aGlzLnN0YXRlID0gR2FtZVN0YXRlLkxhdW5jaFxyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IHN0YXJ0TWVzc2FnZVxyXG5cclxuICAgICAgICAvLyBwbGF5aW5nIGZpZWxkXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCBpeG0gPSBuZXcgZ2Z4Lkl4TWVzaCgpXHJcblxyXG4gICAgICAgICAgICAvLyBmbG9vclxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmbG9vciA9IGdmeC5JeE1lc2gucmVjdEZyb21Db29yZHModGhpcy5maWVsZExlZnQsIHRoaXMuZmllbGRCb3R0b20sIC0uMjUsIHRoaXMuZmllbGRSaWdodCwgdGhpcy5maWVsZFRvcCwgMClcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZsb29yQ29sb3IgPSB0aGlzLmxldmVsRGF0YS5mbG9vckNvbG9yXHJcbiAgICAgICAgICAgICAgICBmbG9vci52ZXJ0aWNlcy5mb3JFYWNoKHYgPT4gdi5jb2xvciA9IGZsb29yQ29sb3IpXHJcbiAgICAgICAgICAgICAgICBpeG0uY2F0KGZsb29yKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBib3JkZXJcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgd2FsbHMgPSBuZXcgZ2Z4Lkl4TWVzaCgpXHJcbiAgICAgICAgICAgICAgICBjb25zdCBib3JkZXJDb2xvciA9IHRoaXMubGV2ZWxEYXRhLmJvcmRlckNvbG9yXHJcbiAgICAgICAgICAgICAgICB3YWxscy5jYXQoZ2Z4Lkl4TWVzaC5yZWN0RnJvbUNvb3Jkcyh0aGlzLmZpZWxkTGVmdCAtIGJvcmRlcldpZHRoLCB0aGlzLmZpZWxkQm90dG9tLCAtLjI1LCB0aGlzLmZpZWxkTGVmdCwgdGhpcy5maWVsZFRvcCwgMSkpXHJcbiAgICAgICAgICAgICAgICB3YWxscy5jYXQoZ2Z4Lkl4TWVzaC5yZWN0RnJvbUNvb3Jkcyh0aGlzLmZpZWxkUmlnaHQsIHRoaXMuZmllbGRCb3R0b20sIC0uMjUsIHRoaXMuZmllbGRSaWdodCArIGJvcmRlcldpZHRoLCB0aGlzLmZpZWxkVG9wLCAxKSlcclxuICAgICAgICAgICAgICAgIHdhbGxzLmNhdChnZnguSXhNZXNoLnJlY3RGcm9tQ29vcmRzKHRoaXMuZmllbGRMZWZ0IC0gYm9yZGVyV2lkdGgsIHRoaXMuZmllbGRUb3AsIC0uMjUsIHRoaXMuZmllbGRSaWdodCArIGJvcmRlcldpZHRoLCB0aGlzLmZpZWxkVG9wICsgYm9yZGVyV2lkdGgsIDEpKVxyXG4gICAgICAgICAgICAgICAgd2FsbHMudmVydGljZXMuZm9yRWFjaCh2ID0+IHYuY29sb3IgPSBib3JkZXJDb2xvcilcclxuICAgICAgICAgICAgICAgIGl4bS5jYXQod2FsbHMpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHZhbyA9IHRoaXMucmVuZGVyZXIuY3JlYXRlTWVzaChpeG0pXHJcbiAgICAgICAgICAgIHRoaXMuZmllbGRCYXRjaCA9IG5ldyBnZnguQmF0Y2goe1xyXG4gICAgICAgICAgICAgICAgdmFvOiB2YW8sXHJcbiAgICAgICAgICAgICAgICBudW1JbmRpY2VzOiBpeG0uaW5kaWNlcy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICByb3VnaG5lc3M6IDFcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGJyaWNrc1xyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc3QgYnJpY2tIYWxmV2lkdGggPSBicmlja1dpZHRoIC8gMlxyXG4gICAgICAgICAgICBjb25zdCBicmlja0hhbGZIZWlnaHQgPSBicmlja0hlaWdodCAvIDJcclxuICAgICAgICAgICAgY29uc3QgYnJpY2tIYWxmRGVwdGggPSBicmlja0RlcHRoIC8gMlxyXG5cclxuICAgICAgICAgICAgY29uc3QgZmllbGRYT2Zmc2V0ID0gdGhpcy5maWVsZExlZnQgKyBCcmljay5oYWxmRXh0ZW50cy54XHJcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkWU9mZnNldCA9IHRoaXMuZmllbGRUb3AgLSB0b3BSb3dNYXJnaW4gLSBicmlja0hlaWdodCAqIHRoaXMubGV2ZWxEYXRhLmJyaWNrUm93c1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxldmVsRGF0YS5icmlja1Jvd3M7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgeU9mZnNldCA9IGZpZWxkWU9mZnNldCArIGkgKiBicmlja0hlaWdodCArIGJyaWNrTWFyZ2luXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRoaXMubGV2ZWxEYXRhLmJyaWNrQ29sczsgKytqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeE9mZnNldCA9IGZpZWxkWE9mZnNldCArIGogKiAoYnJpY2tXaWR0aCArIGJyaWNrTWFyZ2luKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJyaWNrTWluID0gbmV3IGdlby5WZWMzKC1icmlja0hhbGZXaWR0aCArIGJyaWNrTWFyZ2luLCAtYnJpY2tIYWxmSGVpZ2h0ICsgYnJpY2tNYXJnaW4sIC1icmlja0hhbGZEZXB0aClcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBicmlja01heCA9IG5ldyBnZW8uVmVjMyhicmlja0hhbGZXaWR0aCAtIGJyaWNrTWFyZ2luLCBicmlja0hhbGZIZWlnaHQgLSBicmlja01hcmdpbiwgYnJpY2tIYWxmRGVwdGgpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWFiYiA9IG5ldyBnZW8uQUFCQihicmlja01pbiwgYnJpY2tNYXgpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXhtID0gZ2Z4Lkl4TWVzaC5yZWN0KGFhYmIpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSBuZXcgZ2VvLlZlYzMoeE9mZnNldCwgeU9mZnNldCwgYnJpY2tIYWxmRGVwdGgpXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJyaWNrID0gbmV3IEJyaWNrKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBiYXRjaDogbmV3IGdmeC5CYXRjaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JsZE1hdHJpeDogZ2VvLk1hdDQudHJhbnNsYXRpb24ocG9zaXRpb24pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlmZnVzZUNvbG9yOiByYW5kLmNob29zZShicmlja0NvbG9ycyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3VnaG5lc3M6IC44LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFvOiB0aGlzLnJlbmRlcmVyLmNyZWF0ZU1lc2goaXhtKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bUluZGljZXM6IGl4bS5pbmRpY2VzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJyaWNrcy5hZGQoYnJpY2spXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFkZCBwYWRkbGVcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5sZXZlbERhdGEucGFkZGxlV2lkdGhcclxuICAgICAgICAgICAgY29uc3QgaGFsZkV4dGVudHMgPSBuZXcgZ2VvLlZlYzMod2lkdGggLyAyLCBwYWRkbGVIZWlnaHQgLyAyLCBwYWRkbGVEZXB0aCAvIDIpXHJcbiAgICAgICAgICAgIGNvbnN0IGFhYmIgPSBnZW8uQUFCQi5mcm9tSGFsZkV4dGVudHMoaGFsZkV4dGVudHMpXHJcbiAgICAgICAgICAgIGNvbnN0IGl4bSA9IGdmeC5JeE1lc2gucmVjdChhYWJiKVxyXG4gICAgICAgICAgICBpeG0udmVydGljZXMuZm9yRWFjaCh2ID0+IHYuY29sb3IgPSBuZXcgZ2VvLlZlYzQoMCwgMSwgMSwgMSkpXHJcblxyXG4gICAgICAgICAgICBjb25zdCB2YW8gPSB0aGlzLnJlbmRlcmVyLmNyZWF0ZU1lc2goaXhtKVxyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZSA9IG5ldyBQYWRkbGUoe1xyXG4gICAgICAgICAgICAgICAgaGFsZkV4dGVudHM6IGhhbGZFeHRlbnRzLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5ldyBnZW8uVmVjMygwLCB0aGlzLmZpZWxkQm90dG9tICsgaGFsZkV4dGVudHMueSArIHBhZGRsZUJvdHRvbU1hcmdpbiwgaGFsZkV4dGVudHMueiksXHJcbiAgICAgICAgICAgICAgICBiYXRjaDogbmV3IGdmeC5CYXRjaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFvLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdWdobmVzczogLjUsXHJcbiAgICAgICAgICAgICAgICAgICAgbnVtSW5kaWNlczogaXhtLmluZGljZXMubGVuZ3RoXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYWRkIGJhbGxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJhZGl1cyA9IHRoaXMubGV2ZWxEYXRhLmJhbGxSYWRpdXNcclxuICAgICAgICAgICAgY29uc3QgaXhtID0gZ2Z4Lkl4TWVzaC5zcGhlcmUoMTYsIDE2KVxyXG4gICAgICAgICAgICBpeG0udHJhbnNmb3JtKGdlby5NYXQ0LnNjYWxpbmcobmV3IGdlby5WZWMzKHJhZGl1cywgcmFkaXVzLCByYWRpdXMpKSlcclxuICAgICAgICAgICAgaXhtLnZlcnRpY2VzLmZvckVhY2godiA9PiB2LmNvbG9yID0gbmV3IGdlby5WZWM0KDAsIDAsIDEsIDEpKVxyXG5cclxuICAgICAgICAgICAgY29uc3QgdmFvID0gdGhpcy5yZW5kZXJlci5jcmVhdGVNZXNoKGl4bSlcclxuICAgICAgICAgICAgdGhpcy5iYWxsID0gbmV3IEJhbGwoe1xyXG4gICAgICAgICAgICAgICAgcmFkaXVzOiByYWRpdXMsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbmV3IGdlby5WZWMzKDAsIHRoaXMucGFkZGxlLnBvc2l0aW9uLnkgKyB0aGlzLnBhZGRsZS5oYWxmRXh0ZW50cy55ICsgcmFkaXVzLCByYWRpdXMpLFxyXG4gICAgICAgICAgICAgICAgYmF0Y2g6IG5ldyBnZnguQmF0Y2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbyxcclxuICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgcm91Z2huZXNzOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIG51bUluZGljZXM6IGl4bS5pbmRpY2VzLmxlbmd0aFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwbGF5SW1wYWN0U291bmQoKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3Qgc291bmQgPSByYW5kLmNob29zZSh0aGlzLmltcGFjdFNvdW5kcylcclxuICAgICAgICBjb25zdCBzcmMgPSB0aGlzLmFjLmNyZWF0ZUJ1ZmZlclNvdXJjZSgpXHJcbiAgICAgICAgc3JjLmJ1ZmZlciA9IHNvdW5kXHJcbiAgICAgICAgc3JjLmNvbm5lY3QodGhpcy5hYy5kZXN0aW5hdGlvbilcclxuICAgICAgICBzcmMuc3RhcnQoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZmluZE5lYXJlc3RQb2ludE9uQnJpY2soYnJpY2s6IEJyaWNrLCBwb3NpdGlvbjogZ2VvLlZlYzMpOiBnZW8uVmVjMyB7XHJcbiAgICAgICAgY29uc3QgYWFiYiA9IGdlby5BQUJCLmZyb21Qb3NpdGlvbkhhbGZFeHRlbnRzKGJyaWNrLnBvc2l0aW9uLCBCcmljay5oYWxmRXh0ZW50cylcclxuICAgICAgICBjb25zdCBuZWFyZXN0ID0gcG9zaXRpb24uY2xhbXAoYWFiYi5taW4sIGFhYmIubWF4KVxyXG4gICAgICAgIHJldHVybiBuZWFyZXN0XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmaW5kTmVhcmVzdEJyaWNrKHBvc2l0aW9uOiBnZW8uVmVjMywgcmFkaXVzOiBudW1iZXIpOiBCcmljayB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IHIyID0gcmFkaXVzICogcmFkaXVzXHJcbiAgICAgICAgbGV0IG1pbkRpc3RTcSA9IHIyXHJcbiAgICAgICAgbGV0IG5lYXJlc3RCcmljazogQnJpY2sgfCBudWxsID0gbnVsbFxyXG4gICAgICAgIGZvciAoY29uc3QgYnJpY2sgb2YgdGhpcy5icmlja3MpIHtcclxuICAgICAgICAgICAgY29uc3QgbmVhcmVzdFB0ID0gdGhpcy5maW5kTmVhcmVzdFBvaW50T25CcmljayhicmljaywgcG9zaXRpb24pXHJcbiAgICAgICAgICAgIGNvbnN0IGRpc3RTcSA9IG5lYXJlc3RQdC5zdWIocG9zaXRpb24pLmxlbmd0aFNxKClcclxuICAgICAgICAgICAgaWYgKGRpc3RTcSA8IG1pbkRpc3RTcSkge1xyXG4gICAgICAgICAgICAgICAgbmVhcmVzdEJyaWNrID0gYnJpY2tcclxuICAgICAgICAgICAgICAgIG1pbkRpc3RTcSA9IGRpc3RTcVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmVhcmVzdEJyaWNrXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVXb3JsZE1hdHJpY2VzKCkge1xyXG4gICAgICAgIHRoaXMuYmFsbC5iYXRjaC53b3JsZE1hdHJpeCA9IGdlby5NYXQ0LnRyYW5zbGF0aW9uKHRoaXMuYmFsbC5wb3NpdGlvbilcclxuICAgICAgICB0aGlzLnBhZGRsZS5iYXRjaC53b3JsZE1hdHJpeCA9IGdlby5NYXQ0LnRyYW5zbGF0aW9uKHRoaXMucGFkZGxlLnBvc2l0aW9uKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd1NjZW5lKCkge1xyXG4gICAgICAgIC8vIGNvbmZpZ3VyZSBjYW1lcmEgLSBmaXQgcGxheSBhcmVhIHRvIHNjcmVlbiB3aXRoIHNvbWUgc21hbGwgbWFyZ2luXHJcbiAgICAgICAgbGV0IHogPSAwXHJcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5maWVsZFRvcCAtIHRoaXMuZmllbGRCb3R0b20gKyBib3JkZXJXaWR0aCAqIDJcclxuICAgICAgICBjb25zdCB3aWR0aCA9IHRoaXMuZmllbGRSaWdodCAtIHRoaXMuZmllbGRMZWZ0ICsgYm9yZGVyV2lkdGggKiAyXHJcbiAgICAgICAgY29uc3QgZmllbGRBc3BlY3QgPSB3aWR0aCAvIGhlaWdodFxyXG4gICAgICAgIGlmIChmaWVsZEFzcGVjdCA8IHRoaXMucmVuZGVyZXIuYXNwZWN0KSB7XHJcbiAgICAgICAgICAgIHogPSBoZWlnaHQgLyAyIC8gTWF0aC50YW4odGhpcy5yZW5kZXJlci5mb3YgLyAyKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHogPSB3aWR0aCAvIDIgLyBNYXRoLnRhbih0aGlzLnJlbmRlcmVyLmZvdiAqIHRoaXMucmVuZGVyZXIuYXNwZWN0IC8gMik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLnZpZXdNYXRyaXggPSBnZW8uTWF0NC5sb29rQXQoXHJcbiAgICAgICAgICAgIG5ldyBnZW8uVmVjMygwLCAwLCAxICsgeiksIG5ldyBnZW8uVmVjMygwLCAwLCAtMSksIG5ldyBnZW8uVmVjMygwLCAxLCAwKSkuaW52ZXJ0KClcclxuXHJcbiAgICAgICAgLy8gc2hvdyBmcm9tIHNpZGUgdmlldyBmb3IgZGVidWdnaW5nXHJcbiAgICAgICAgLy8gdGhpcy5yZW5kZXJlci52aWV3TWF0cml4ID0gZ2VvLk1hdDQubG9va0F0KFxyXG4gICAgICAgIC8vICAgICBuZXcgZ2VvLlZlYzMoMCwgLTE2LCAwKSwgbmV3IGdlby5WZWMzKDAsIDEsIDApLCBuZXcgZ2VvLlZlYzMoMCwgMCwgMSkpLmludmVydCgpXHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd0JhdGNoKHRoaXMuZmllbGRCYXRjaClcclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdCYXRjaCh0aGlzLmJhbGwuYmF0Y2gpXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3QmF0Y2godGhpcy5wYWRkbGUuYmF0Y2gpXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgYnJpY2sgb2YgdGhpcy5icmlja3MpIHtcclxuICAgICAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3QmF0Y2goYnJpY2suYmF0Y2gpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLnByZXNlbnQoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FudmFzVG9OREMoY2M6IGdlby5WZWMyKTogZ2VvLlZlYzIge1xyXG4gICAgICAgIGNvbnN0IG5kYyA9IG5ldyBnZW8uVmVjMihcclxuICAgICAgICAgICAgY2MueCAvIHRoaXMuY2FudmFzLndpZHRoICogMiAtIDEsXHJcbiAgICAgICAgICAgIC1jYy55IC8gdGhpcy5jYW52YXMuaGVpZ2h0ICogMiArIDFcclxuICAgICAgICApXHJcblxyXG4gICAgICAgIHJldHVybiBuZGNcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNhbnZhc1RvTkRDUmF5KGNjOiBnZW8uVmVjMik6IGdlby5SYXkge1xyXG4gICAgICAgIGNvbnN0IG5kYyA9IHRoaXMuY2FudmFzVG9OREMoY2MpXHJcbiAgICAgICAgY29uc3QgcmF5ID0gbmV3IGdlby5SYXkobmV3IGdlby5WZWMzKG5kYy54LCBuZGMueSwgLTEpLCBuZXcgZ2VvLlZlYzMoMCwgMCwgMSkpXHJcbiAgICAgICAgcmV0dXJuIHJheVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FudmFzVG9Xb3JsZFJheShjYzogZ2VvLlZlYzIpOiBnZW8uUmF5IHtcclxuICAgICAgICBjb25zdCBuZGNSYXkgPSB0aGlzLmNhbnZhc1RvTkRDUmF5KGNjKVxyXG4gICAgICAgIGNvbnN0IGludlByb2ogPSB0aGlzLnJlbmRlcmVyLnByb2plY3Rpb25NYXRyaXguaW52ZXJ0KClcclxuICAgICAgICBjb25zdCBpbnZWaWV3ID0gdGhpcy5yZW5kZXJlci52aWV3TWF0cml4LmludmVydCgpXHJcbiAgICAgICAgY29uc3QgaW52Vmlld1Byb2ogPSB0aGlzLnJlbmRlcmVyLnByb2plY3Rpb25NYXRyaXgubWF0bXVsKHRoaXMucmVuZGVyZXIudmlld01hdHJpeCkuaW52ZXJ0KClcclxuICAgICAgICBjb25zdCB2aWV3UmF5ID0gbmRjUmF5LnRyYW5zZm9ybShpbnZQcm9qKVxyXG4gICAgICAgIGNvbnN0IHdvcmxkUmF5ID0gdmlld1JheS50cmFuc2Zvcm0oaW52VmlldylcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaW5wLm1vdXNlTGVmdFJlbGVhc2VkKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY2M6IFwiLCBjYy50b1N0cmluZygpKVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm5kYzogXCIsIG5kY1JheS50b1N0cmluZygpKVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInZpZXc6IFwiLCB2aWV3UmF5LnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid29ybGQ6IFwiLCB3b3JsZFJheS50b1N0cmluZygpKVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIndvcmxkMjogXCIsIG5kY1JheS50cmFuc2Zvcm0oaW52Vmlld1Byb2opLnRvU3RyaW5nKCkpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gd29ybGRSYXlcclxuICAgIH1cclxufVxyXG5cclxuY29uc3QgYXBwID0gbmV3IEFwcCgpXHJcbmFwcC5leGVjKClcclxuIl19