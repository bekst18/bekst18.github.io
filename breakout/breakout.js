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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtvdXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJicmVha291dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQixNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUE7QUFDcEIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFBO0FBQ3JCLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQTtBQUNyQixNQUFNLFlBQVksR0FBRyxFQUFFLENBQUE7QUFDdkIsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFBO0FBQ3RCLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQTtBQUN0QixNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFDckIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFBO0FBQ3RCLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQTtBQUN2QixNQUFNLGtCQUFrQixHQUFHLENBQUMsQ0FBQTtBQUU1QixNQUFNLFlBQVksR0FBRyw4Q0FBOEMsQ0FBQTtBQUNuRSxNQUFNLGVBQWUsR0FBRyxxREFBcUQsQ0FBQTtBQUM3RSxNQUFNLGdCQUFnQixHQUFHLHVEQUF1RCxDQUFBO0FBWWhGLE1BQU0sTUFBTSxHQUFHLElBQUksS0FBSztBQUNwQixVQUFVO0FBQ1Y7SUFDSSxTQUFTLEVBQUUsRUFBRTtJQUNiLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzdDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsQ0FBQztJQUNiLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQ3pDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEdBQUc7SUFDZCxVQUFVLEVBQUUsR0FBRztJQUNmLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ3ZDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ3pDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEdBQUc7SUFDZCxVQUFVLEVBQUUsR0FBRztJQUNmLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzdDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3JDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzFDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxHQUFHO0lBQ2hCLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUM3QztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxHQUFHO0lBQ2QsVUFBVSxFQUFFLEdBQUc7SUFDZixXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN2QyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUMzQztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxFQUFFO0lBQ2IsVUFBVSxFQUFFLEVBQUU7SUFDZCxXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUM3QztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxFQUFFO0lBQ2IsVUFBVSxFQUFFLEVBQUU7SUFDZCxXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztDQUMxQyxDQUNKLENBQUE7QUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLEtBQUssQ0FDekIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3hCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3hCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUMxQixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQzFCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDMUIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM1QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQzVCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFF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QUFHLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1lBQ3BFLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFBO1lBQ2pDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1lBQ3hCLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUN6RCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7U0FDekI7UUFFRCxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1lBQ2pDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFBO1lBQ2pDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1lBQ3hCLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUN6RCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7U0FDekI7UUFFRCxpQkFBaUI7UUFDakIsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtZQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJ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TyxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtTQUNwRTtRQUVELE9BQU8sUUFBUSxDQUFBO0lBQ25CLENBQUM7Q0FDSjtBQUVELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7QUFDckIsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvM2QuanNcIlxyXG5pbXBvcnQgKiBhcyBpbnB1dCBmcm9tIFwiLi4vc2hhcmVkL2lucHV0LmpzXCJcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIlxyXG5pbXBvcnQgKiBhcyBtYXRoIGZyb20gXCIuLi9zaGFyZWQvbWF0aC5qc1wiXHJcbmltcG9ydCAqIGFzIGF1ZGlvIGZyb20gXCIuLi9zaGFyZWQvYXVkaW8uanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuXHJcbmNvbnN0IGJyaWNrV2lkdGggPSAyXHJcbmNvbnN0IGJyaWNrSGVpZ2h0ID0gMVxyXG5jb25zdCBicmlja0RlcHRoID0gLjVcclxuY29uc3QgcGFkZGxlSGVpZ2h0ID0gLjVcclxuY29uc3QgcGFkZGxlRGVwdGggPSAuNVxyXG5jb25zdCBwYWRkbGVTcGVlZCA9IC41XHJcbmNvbnN0IGJvcmRlcldpZHRoID0gMVxyXG5jb25zdCB0b3BSb3dNYXJnaW4gPSAxXHJcbmNvbnN0IGJyaWNrTWFyZ2luID0gLjA1XHJcbmNvbnN0IHBhZGRsZUJvdHRvbU1hcmdpbiA9IDFcclxuXHJcbmNvbnN0IHN0YXJ0TWVzc2FnZSA9IFwiVGFwLCBjbGljaywgb3IgcHJlc3MgYW55IGtleSB0byBsYXVuY2ggYmFsbC5cIlxyXG5jb25zdCBnYW1lT3Zlck1lc3NhZ2UgPSBcIkdhbWUgb3ZlciEgVGFwLCBjbGljaywgb3IgcHJlc3MgYW55IGtleSB0byByZXN0YXJ0LlwiXHJcbmNvbnN0IG5leHRMZXZlbE1lc3NhZ2UgPSBcIkxldmVsIENsZWFyISBUYXAsIGNsaWNrLCBvciBwcmVzcyBhbnkga2V5IHRvIGFkdmFuY2UuXCJcclxuXHJcbmludGVyZmFjZSBMZXZlbERhdGEge1xyXG4gICAgYmFsbFNwZWVkOiBudW1iZXJcclxuICAgIGJhbGxSYWRpdXM6IG51bWJlclxyXG4gICAgcGFkZGxlV2lkdGg6IG51bWJlclxyXG4gICAgYnJpY2tSb3dzOiBudW1iZXJcclxuICAgIGJyaWNrQ29sczogbnVtYmVyXHJcbiAgICBib3JkZXJDb2xvcjogZ2VvLlZlYzRcclxuICAgIGZsb29yQ29sb3I6IGdlby5WZWM0XHJcbn1cclxuXHJcbmNvbnN0IGxldmVscyA9IG5ldyBBcnJheTxMZXZlbERhdGE+KFxyXG4gICAgLy8gbGV2ZWwgMVxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjIsXHJcbiAgICAgICAgYmFsbFJhZGl1czogMS4yNSxcclxuICAgICAgICBwYWRkbGVXaWR0aDogNixcclxuICAgICAgICBicmlja1Jvd3M6IDMsXHJcbiAgICAgICAgYnJpY2tDb2xzOiA3LFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjI1LCAwLCAwLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjI1LCAuMjUsIC4yNSwgMSlcclxuICAgIH0sXHJcbiAgICAvLyBsZXZlbCAyXHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuMyxcclxuICAgICAgICBiYWxsUmFkaXVzOiAxLFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiA2LFxyXG4gICAgICAgIGJyaWNrUm93czogMyxcclxuICAgICAgICBicmlja0NvbHM6IDcsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAuMjUsIDAsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAwLCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgM1xyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjM1LFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC43NSxcclxuICAgICAgICBwYWRkbGVXaWR0aDogNixcclxuICAgICAgICBicmlja1Jvd3M6IDMsXHJcbiAgICAgICAgYnJpY2tDb2xzOiA1LFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgMCwgLjU1LCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgMCwgMCwgMSlcclxuICAgIH0sXHJcbiAgICAvLyBsZXZlbCA0XHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuNCxcclxuICAgICAgICBiYWxsUmFkaXVzOiAuNixcclxuICAgICAgICBwYWRkbGVXaWR0aDogNSxcclxuICAgICAgICBicmlja1Jvd3M6IDMsXHJcbiAgICAgICAgYnJpY2tDb2xzOiA2LFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjYsIC41LCAwLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgLjI1LCAwLCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDVcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC40NSxcclxuICAgICAgICBiYWxsUmFkaXVzOiAuNTUsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDQsXHJcbiAgICAgICAgYnJpY2tSb3dzOiAzLFxyXG4gICAgICAgIGJyaWNrQ29sczogOCxcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KDAsIC41LCAuNiwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KC4yNSwgLjI1LCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgNlxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjUsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjUsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDQsXHJcbiAgICAgICAgYnJpY2tSb3dzOiA0LFxyXG4gICAgICAgIGJyaWNrQ29sczogOCxcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KDEsIDAsIDAsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAuMywgLjI1LCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDdcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC42LFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC40LFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiAzLjUsXHJcbiAgICAgICAgYnJpY2tSb3dzOiA0LFxyXG4gICAgICAgIGJyaWNrQ29sczogMTAsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCgxLCAxLCAwLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjI1LCAuMjUsIC4yNSwgMSlcclxuICAgIH0sXHJcbiAgICAvLyBsZXZlbCA4XHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuNjUsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjM1LFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiAzLFxyXG4gICAgICAgIGJyaWNrUm93czogNSxcclxuICAgICAgICBicmlja0NvbHM6IDEwLFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjUsIC42LCAxLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjI1LCAwLCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgOVxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjcsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjMsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDIsXHJcbiAgICAgICAgYnJpY2tSb3dzOiA2LFxyXG4gICAgICAgIGJyaWNrQ29sczogMTIsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAxLCAxLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjM1LCAuMTUsIC4yNSwgMSlcclxuICAgIH0sXHJcbiAgICAvLyBsZXZlbCA5XHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuOCxcclxuICAgICAgICBiYWxsUmFkaXVzOiAuMixcclxuICAgICAgICBwYWRkbGVXaWR0aDogMSxcclxuICAgICAgICBicmlja1Jvd3M6IDgsXHJcbiAgICAgICAgYnJpY2tDb2xzOiAxNSxcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KDEsIDEsIDEsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCguMSwgLjEsIC40LCAxKVxyXG4gICAgfSxcclxuKVxyXG5cclxuY29uc3QgYnJpY2tDb2xvcnMgPSBuZXcgQXJyYXk8Z2VvLlZlYzQ+KFxyXG4gICAgbmV3IGdlby5WZWM0KDEsIDAsIDAsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDAsIDEsIDAsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDAsIDAsIDEsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDAsIDEsIDEsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDEsIDAsIDEsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDEsIDEsIDEsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KC41LCAuNSwgMCwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMCwgLjUsIC41LCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCguNSwgMCwgLjUsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KC4yNSwgLjc1LCAwLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgwLCAuMjUsIC43NSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoLjI1LCAwLCAuNzUsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KC43NSwgLjI1LCAwLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgwLCAuNzUsIC4yNSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoLjc1LCAwLCAuMjUsIDEpLFxyXG4pXHJcblxyXG5pbnRlcmZhY2UgUGFkZGxlT3B0aW9ucyB7XHJcbiAgICBoYWxmRXh0ZW50czogZ2VvLlZlYzNcclxuICAgIHBvc2l0aW9uOiBnZW8uVmVjM1xyXG4gICAgYmF0Y2g6IGdmeC5CYXRjaFxyXG4gICAgdmVsb2NpdHk/OiBnZW8uVmVjM1xyXG59XHJcblxyXG5jbGFzcyBQYWRkbGUge1xyXG4gICAgcHVibGljIHJlYWRvbmx5IGhhbGZFeHRlbnRzOiBnZW8uVmVjM1xyXG4gICAgcHVibGljIHJlYWRvbmx5IGJhdGNoID0gbmV3IGdmeC5CYXRjaCgpXHJcbiAgICBwb3NpdGlvbiA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgdmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBQYWRkbGVPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5oYWxmRXh0ZW50cyA9IG9wdGlvbnMuaGFsZkV4dGVudHMuY2xvbmUoKVxyXG4gICAgICAgIHRoaXMuYmF0Y2ggPSBvcHRpb25zLmJhdGNoXHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IG9wdGlvbnMucG9zaXRpb24uY2xvbmUoKVxyXG4gICAgICAgIHRoaXMudmVsb2NpdHkgPSBvcHRpb25zLnZlbG9jaXR5Py5jbG9uZSgpID8/IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgQnJpY2tPcHRpb25zIHtcclxuICAgIHBvc2l0aW9uOiBnZW8uVmVjM1xyXG4gICAgYmF0Y2g6IGdmeC5CYXRjaFxyXG59XHJcblxyXG5jbGFzcyBCcmljayB7XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgYmF0Y2ggPSBuZXcgZ2Z4LkJhdGNoKClcclxuICAgIHB1YmxpYyByZWFkb25seSBwb3NpdGlvbiA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgc3RhdGljIHJlYWRvbmx5IGhhbGZFeHRlbnRzID0gbmV3IGdlby5WZWMzKGJyaWNrV2lkdGggLyAyIC0gYnJpY2tNYXJnaW4sIGJyaWNrSGVpZ2h0IC8gMiAtIGJyaWNrTWFyZ2luLCBicmlja0RlcHRoIC8gMilcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBCcmlja09wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbi5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy5iYXRjaCA9IG9wdGlvbnMuYmF0Y2hcclxuICAgIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIEJhbGxPcHRpb25zIHtcclxuICAgIHJhZGl1czogbnVtYmVyXHJcbiAgICBwb3NpdGlvbjogZ2VvLlZlYzNcclxuICAgIGJhdGNoOiBnZnguQmF0Y2hcclxuICAgIHZlbG9jaXR5PzogZ2VvLlZlYzNcclxufVxyXG5cclxuY2xhc3MgQmFsbCB7XHJcbiAgICByYWRpdXM6IG51bWJlciA9IDFcclxuICAgIHBvc2l0aW9uOiBnZW8uVmVjM1xyXG4gICAgYmF0Y2g6IGdmeC5CYXRjaFxyXG4gICAgdmVsb2NpdHk6IGdlby5WZWMzXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQmFsbE9wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLnJhZGl1cyA9IG9wdGlvbnMucmFkaXVzXHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IG9wdGlvbnMucG9zaXRpb24uY2xvbmUoKVxyXG4gICAgICAgIHRoaXMuYmF0Y2ggPSBvcHRpb25zLmJhdGNoXHJcbiAgICAgICAgdGhpcy52ZWxvY2l0eSA9IG9wdGlvbnMudmVsb2NpdHk/LmNsb25lKCkgPz8gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICB9XHJcbn1cclxuXHJcbmVudW0gR2FtZVN0YXRlIHtcclxuICAgIFBsYXksXHJcbiAgICBMYXVuY2gsXHJcbiAgICBXYWl0XHJcbn1cclxuXHJcbi8vIHN0ZXAgMSAtIGNsZWFyIHNjcmVlbiwgaW5pdCBnbCwgZXRjLi4uXHJcbi8vIHN0ZXAgMiAtIGRyYXcgYSBjbGlwIHNwYWNlIHRyaWFuZ2xlXHJcbi8vIHN0ZXAgMyAtIGRyYXcgYSB3b3JsZCBzcGFjZSB0cmlhbmdsZVxyXG5jbGFzcyBBcHAge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBjYW52YXMgPSBkb20uYnlJZChcImNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBsZXZlbFNwYW4gPSBkb20uYnlJZChcImxldmVsXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGJhbGxzUmVtYWluaW5nU3BhbiA9IGRvbS5ieUlkKFwiYmFsbHNSZW1haW5pbmdcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbWVzc2FnZURpdiA9IGRvbS5ieUlkKFwibWVzc2FnZVwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSByZW5kZXJlciA9IG5ldyBnZnguUmVuZGVyZXIodGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGlucCA9IG5ldyBpbnB1dC5JbnB1dCh0aGlzLmNhbnZhcylcclxuICAgIHByaXZhdGUgZmllbGRCYXRjaDogZ2Z4LkJhdGNoID0gbmV3IGdmeC5CYXRjaCgpXHJcbiAgICBwcml2YXRlIHBhZGRsZSE6IFBhZGRsZVxyXG4gICAgcHJpdmF0ZSBiYWxsITogQmFsbFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBicmlja3MgPSBuZXcgU2V0PEJyaWNrPigpXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFjID0gbmV3IEF1ZGlvQ29udGV4dCgpXHJcbiAgICBwcml2YXRlIGltcGFjdFNvdW5kcyA9IG5ldyBBcnJheTxBdWRpb0J1ZmZlcj4oKVxyXG4gICAgcHJpdmF0ZSBiYWxsc1JlbWFpbmluZyA9IDNcclxuICAgIHByaXZhdGUgbGV2ZWwgPSAxXHJcbiAgICBwcml2YXRlIHN0YXRlID0gR2FtZVN0YXRlLkxhdW5jaFxyXG4gICAgcHJpdmF0ZSBjb250aW51ZSA9ICgpID0+IHsgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWMoKSB7XHJcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gc3RhcnRNZXNzYWdlXHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsICgpID0+IHRoaXMuaGFuZGxlS2V5VXAoKSlcclxuXHJcbiAgICAgICAgdGhpcy5pbml0TGV2ZWwoKVxyXG4gICAgICAgIGF3YWl0IHRoaXMuaW5pdEF1ZGlvKClcclxuICAgICAgICB0aGlzLmNhbnZhcy5mb2N1cygpXHJcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMudGljaygpKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgaW5pdEF1ZGlvKCkge1xyXG4gICAgICAgIGNvbnN0IG51bUltcGFjdFNvdW5kcyA9IDE1XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gbnVtSW1wYWN0U291bmRzOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgdXJsID0gYC4vYXNzZXRzL2ltcGFjdCR7aX0ud2F2YFxyXG4gICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCBhdWRpby5sb2FkQXVkaW8odGhpcy5hYywgdXJsKVxyXG4gICAgICAgICAgICB0aGlzLmltcGFjdFNvdW5kcy5wdXNoKGJ1ZmZlcilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB0aWNrKCkge1xyXG4gICAgICAgIHRoaXMuY2hlY2tTaXplKClcclxuICAgICAgICB0aGlzLnVwZGF0ZSgpXHJcbiAgICAgICAgdGhpcy5kcmF3U2NlbmUoKVxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLnRpY2soKSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNoZWNrU2l6ZSgpIHtcclxuICAgICAgICBpZiAodGhpcy5jYW52YXMud2lkdGggPT09IHRoaXMuY2FudmFzLmNsaWVudFdpZHRoICYmIHRoaXMuY2FudmFzLmhlaWdodCA9PT0gdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLmNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlKCkge1xyXG4gICAgICAgIHRoaXMucGFkZGxlLnBvc2l0aW9uID0gdGhpcy5wYWRkbGUucG9zaXRpb24uYWRkKHRoaXMucGFkZGxlLnZlbG9jaXR5KVxyXG4gICAgICAgIHRoaXMuYmFsbC5wb3NpdGlvbiA9IHRoaXMuYmFsbC5wb3NpdGlvbi5hZGQodGhpcy5iYWxsLnZlbG9jaXR5KVxyXG4gICAgICAgIHRoaXMuaGFuZGxlSW5wdXQoKVxyXG4gICAgICAgIHRoaXMuaGFuZGxlQ29sbGlzaW9uKClcclxuICAgICAgICB0aGlzLnVwZGF0ZVdvcmxkTWF0cmljZXMoKVxyXG4gICAgICAgIHRoaXMudXBkYXRlVUkoKVxyXG4gICAgICAgIHRoaXMuaW5wLmZsdXNoKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZVVJKCkge1xyXG4gICAgICAgIHRoaXMuYmFsbHNSZW1haW5pbmdTcGFuLnRleHRDb250ZW50ID0gdGhpcy5iYWxsc1JlbWFpbmluZy50b1N0cmluZygpXHJcbiAgICAgICAgdGhpcy5sZXZlbFNwYW4udGV4dENvbnRlbnQgPSB0aGlzLmxldmVsLnRvU3RyaW5nKClcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubWVzc2FnZSkge1xyXG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2VEaXYuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2VEaXYuaGlkZGVuID0gdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBsZXZlbERhdGEoKTogTGV2ZWxEYXRhIHtcclxuICAgICAgICBjb25zdCBkYXRhID0gbGV2ZWxzW01hdGgubWluKHRoaXMubGV2ZWwgLSAxLCBsZXZlbHMubGVuZ3RoIC0gMSldXHJcbiAgICAgICAgcmV0dXJuIGRhdGFcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBmaWVsZFdpZHRoKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIGJyaWNrV2lkdGggKiB0aGlzLmxldmVsRGF0YS5icmlja0NvbHNcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBmaWVsZEhlaWdodCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBicmlja0hlaWdodCAqIHRoaXMubGV2ZWxEYXRhLmJyaWNrUm93cyAqIDQgKyB0b3BSb3dNYXJnaW5cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBmaWVsZExlZnQoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gLXRoaXMuZmllbGRXaWR0aCAvIDJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBmaWVsZFJpZ2h0KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmllbGRMZWZ0ICsgdGhpcy5maWVsZFdpZHRoXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRCb3R0b20oKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gLXRoaXMuZmllbGRIZWlnaHQgLyAyXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRUb3AoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5maWVsZEJvdHRvbSArIHRoaXMuZmllbGRIZWlnaHRcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBtZXNzYWdlKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZURpdi50ZXh0Q29udGVudCA/PyBcIlwiXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzZXQgbWVzc2FnZSh0ZXh0OiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLm1lc3NhZ2VEaXYudGV4dENvbnRlbnQgPSB0ZXh0XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVLZXlVcCgpIHtcclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSA9PT0gR2FtZVN0YXRlLlBsYXkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSA9PT0gR2FtZVN0YXRlLldhaXQpIHtcclxuICAgICAgICAgICAgdGhpcy5jb250aW51ZSgpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5sYXVuY2hCYWxsKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUlucHV0KCkge1xyXG4gICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xyXG4gICAgICAgICAgICBjYXNlIEdhbWVTdGF0ZS5MYXVuY2g6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUlucHV0TGF1bmNoKClcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIEdhbWVTdGF0ZS5QbGF5OlxyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dFBsYXkoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgR2FtZVN0YXRlLldhaXQ6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUlucHV0V2FpdCgpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUlucHV0TGF1bmNoKCk6IHZvaWQge1xyXG4gICAgICAgIC8vIHN0YXJ0IGdhbWUgb24gbW91c2UgY2lja1xyXG4gICAgICAgIGlmICh0aGlzLmlucC5tb3VzZUxlZnRQcmVzc2VkKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGF1bmNoQmFsbCgpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlSW5wdXRQbGF5KCkge1xyXG4gICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcblxyXG4gICAgICAgIC8vIG1vdXNlIC8gdG91Y2ggcGFkZGxlIG1vdmVtZW50XHJcbiAgICAgICAgaWYgKHRoaXMuaW5wLm1vdXNlTGVmdERvd24pIHtcclxuICAgICAgICAgICAgY29uc3Qgd29ybGRNb3VzZVJheSA9IHRoaXMuY2FudmFzVG9Xb3JsZFJheShuZXcgZ2VvLlZlYzIodGhpcy5pbnAubW91c2VYLCB0aGlzLmlucC5tb3VzZVkpKVxyXG4gICAgICAgICAgICBjb25zdCBmaWVsZFBsYW5lID0gZ2VvLlBsYW5lLmZyb21Qb2ludE5vcm1hbCh0aGlzLnBhZGRsZS5wb3NpdGlvbiwgbmV3IGdlby5WZWMzKDAsIDAsIDEpKVxyXG4gICAgICAgICAgICBjb25zdCBmaWVsZEl4ID0gd29ybGRNb3VzZVJheS5sZXJwKHdvcmxkTW91c2VSYXkuY2FzdChmaWVsZFBsYW5lKSlcclxuICAgICAgICAgICAgaWYgKGZpZWxkSXgueCA+IHRoaXMucGFkZGxlLnBvc2l0aW9uLngpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDEsIDAsIDApXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZmllbGRJeC54IDwgdGhpcy5wYWRkbGUucG9zaXRpb24ueCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoLTEsIDAsIDApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGtleWJvYXJkIHBhZGRsZSBtb3ZlbWVudFxyXG4gICAgICAgIGlmICh0aGlzLmlucC5kb3duKFwiYVwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygtMSwgMCwgMClcclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaW5wLmRvd24oXCJkXCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDEsIDAsIDApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5wYWRkbGUudmVsb2NpdHkubGVuZ3RoU3EoKSA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSB0aGlzLnBhZGRsZS52ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKHBhZGRsZVNwZWVkKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUlucHV0V2FpdCgpIHtcclxuICAgICAgICBpZiAodGhpcy5pbnAubW91c2VMZWZ0RG93bikge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRpbnVlKClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBsYXVuY2hCYWxsKCkge1xyXG4gICAgICAgIC8vIGNob29zZSByYW5kb20gdXB3YXJkIGxhdW5jaCBkaXJlY3Rpb25cclxuICAgICAgICBjb25zdCByb3QgPSBnZW8uTWF0My5yb3RhdGlvbloocmFuZC5mbG9hdCgtTWF0aC5QSSAvIDQsIE1hdGguUEkgLyA0KSlcclxuICAgICAgICBjb25zdCB2ID0gcm90LnRyYW5zZm9ybShuZXcgZ2VvLlZlYzMoMCwgMSwgMCkpLm5vcm1hbGl6ZSgpXHJcbiAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gdi5tdWxYKHRoaXMubGV2ZWxEYXRhLmJhbGxTcGVlZClcclxuICAgICAgICB0aGlzLnN0YXRlID0gR2FtZVN0YXRlLlBsYXlcclxuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBcIlwiXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVDb2xsaXNpb24oKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT09IEdhbWVTdGF0ZS5QbGF5KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaXMgcGFkZGxlIGdvaW5nIHRvIGNyb3NzIGJvdW5kYXJ5P1xyXG4gICAgICAgIGNvbnN0IGJvdW5kcyA9IGdlby5BQUJCLmZyb21Db29yZHMoXHJcbiAgICAgICAgICAgIHRoaXMuZmllbGRMZWZ0LCB0aGlzLmZpZWxkQm90dG9tLCAtMSxcclxuICAgICAgICAgICAgdGhpcy5maWVsZFJpZ2h0LCB0aGlzLmZpZWxkVG9wLCAxKVxyXG5cclxuICAgICAgICBjb25zdCBwYWRkbGVQb3NpdGlvbiA9IHRoaXMucGFkZGxlLnBvc2l0aW9uLmFkZCh0aGlzLnBhZGRsZS52ZWxvY2l0eSlcclxuICAgICAgICBjb25zdCBwYWRkbGVCb3VuZHMgPSBnZW8uQUFCQi5mcm9tUG9zaXRpb25IYWxmRXh0ZW50cyhwYWRkbGVQb3NpdGlvbiwgdGhpcy5wYWRkbGUuaGFsZkV4dGVudHMpXHJcblxyXG4gICAgICAgIGNvbnN0IGJhbGxQb3NpdGlvbiA9IHRoaXMuYmFsbC5wb3NpdGlvbi5hZGQodGhpcy5iYWxsLnZlbG9jaXR5KVxyXG4gICAgICAgIGNvbnN0IGJhbGxCb3VuZHMgPSBnZW8uQUFCQi5mcm9tUG9zaXRpb25IYWxmRXh0ZW50cyhiYWxsUG9zaXRpb24sIG5ldyBnZW8uVmVjMyh0aGlzLmJhbGwucmFkaXVzLCB0aGlzLmJhbGwucmFkaXVzLCB0aGlzLmJhbGwucmFkaXVzKSlcclxuICAgICAgICBjb25zdCBiYWxsU3BlZWQgPSB0aGlzLmxldmVsRGF0YS5iYWxsU3BlZWRcclxuXHJcbiAgICAgICAgLy8gY2hlY2sgcGFkZGxlIGFnYWluc3QgYm91bmRhcnlcclxuICAgICAgICBpZiAocGFkZGxlQm91bmRzLm1pbi54IDw9IHRoaXMuZmllbGRMZWZ0IHx8IHBhZGRsZUJvdW5kcy5tYXgueCA+PSB0aGlzLmZpZWxkUmlnaHQpIHtcclxuICAgICAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGJhbGwgLyBwYWRkbGUgaGl0IGNoZWNrXHJcbiAgICAgICAgaWYgKGJhbGxCb3VuZHMub3ZlcmxhcHMocGFkZGxlQm91bmRzKSkge1xyXG4gICAgICAgICAgICBsZXQgdmVsb2NpdHkgPSB0aGlzLmJhbGwudmVsb2NpdHlcclxuICAgICAgICAgICAgdmVsb2NpdHkueSA9IC12ZWxvY2l0eS55XHJcblxyXG4gICAgICAgICAgICAvLyBhbGxvdyBwbGF5ZXIgc29tZSBjb250cm9sXHJcbiAgICAgICAgICAgIC8vIHJpZ2h0IHNpZGUgb2YgcGFkZGxlIHJvdGF0ZXMgYW5nbGUgcmlnaHRcclxuICAgICAgICAgICAgLy8gbGVmdCBzaWRlIG9mIHBhZGRsZSByb3RhdGVzIGFuZ2xlIGxlZnRcclxuICAgICAgICAgICAgY29uc3QgYWFiYiA9IGdlby5BQUJCLmZyb21Qb3NpdGlvbkhhbGZFeHRlbnRzKHBhZGRsZVBvc2l0aW9uLCB0aGlzLnBhZGRsZS5oYWxmRXh0ZW50cylcclxuICAgICAgICAgICAgY29uc3QgbmVhcmVzdCA9IGJhbGxQb3NpdGlvbi5jbGFtcChhYWJiLm1pbiwgYWFiYi5tYXgpXHJcbiAgICAgICAgICAgIGNvbnN0IHQgPSBtYXRoLnVubGVycChhYWJiLm1pbi54LCBhYWJiLm1heC54LCBuZWFyZXN0LngpXHJcbiAgICAgICAgICAgIGNvbnN0IHJvdCA9IGdlby5NYXQ0LnJvdGF0aW9uWihtYXRoLmxlcnAoLU1hdGguUEkgLyA0LCBNYXRoLlBJIC8gNCwgdCkpXHJcblxyXG4gICAgICAgICAgICAvLyBjaG9vc2UgYSByYW5kb20gZGV2aWF0aW9uIGZyb20gc3RhbmRhcmQgcmVmbGVjdGlvbiBhbmdsZVxyXG4gICAgICAgICAgICB2ZWxvY2l0eSA9IHJvdC50cmFuc2Zvcm0zKHZlbG9jaXR5KVxyXG4gICAgICAgICAgICB2ZWxvY2l0eS56ID0gMFxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB2ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKGJhbGxTcGVlZClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhhbmRsZSBicmljayBoaXRcclxuICAgICAgICBjb25zdCBuZWFyZXN0QnJpY2sgPSB0aGlzLmZpbmROZWFyZXN0QnJpY2soYmFsbFBvc2l0aW9uLCB0aGlzLmJhbGwucmFkaXVzKVxyXG4gICAgICAgIGlmIChuZWFyZXN0QnJpY2spIHtcclxuICAgICAgICAgICAgY29uc3QgYWFiYiA9IGdlby5BQUJCLmZyb21Qb3NpdGlvbkhhbGZFeHRlbnRzKG5lYXJlc3RCcmljay5wb3NpdGlvbiwgQnJpY2suaGFsZkV4dGVudHMpXHJcbiAgICAgICAgICAgIGNvbnN0IG5lYXJlc3RQdCA9IHRoaXMuZmluZE5lYXJlc3RQb2ludE9uQnJpY2sobmVhcmVzdEJyaWNrLCBiYWxsUG9zaXRpb24pXHJcbiAgICAgICAgICAgIGxldCB2ZWxvY2l0eSA9IHRoaXMuYmFsbC52ZWxvY2l0eVxyXG5cclxuICAgICAgICAgICAgaWYgKG5lYXJlc3RQdC55IDw9IGFhYmIubWluLnkgKyAuMDEpIHtcclxuICAgICAgICAgICAgICAgIHZlbG9jaXR5LnkgPSAtdmVsb2NpdHkueVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobmVhcmVzdFB0LnggPD0gYWFiYi5taW4ueCArIC4wMSkge1xyXG4gICAgICAgICAgICAgICAgdmVsb2NpdHkueCA9IC12ZWxvY2l0eS54XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChuZWFyZXN0UHQueCA+PSBhYWJiLm1heC54IC0gLjAxKSB7XHJcbiAgICAgICAgICAgICAgICB2ZWxvY2l0eS54ID0gLXZlbG9jaXR5LnhcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG5lYXJlc3RQdC55ID4gYWFiYi5tYXgueSAtIC4wMSkge1xyXG4gICAgICAgICAgICAgICAgdmVsb2NpdHkueSA9IC12ZWxvY2l0eS55XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eSA9IHZlbG9jaXR5Lm5vcm1hbGl6ZSgpLm11bFgoYmFsbFNwZWVkKVxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkueiA9IDBcclxuICAgICAgICAgICAgdGhpcy5icmlja3MuZGVsZXRlKG5lYXJlc3RCcmljaylcclxuICAgICAgICAgICAgdGhpcy5wbGF5SW1wYWN0U291bmQoKVxyXG5cclxuICAgICAgICAgICAgLy8gaWYgbm8gYnJpY2tzLCBtb3ZlIHRvIG5leHQgbGV2ZWxcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnJpY2tzLnNpemUgPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgICAgICAgICAgICAgdGhpcy53YWl0KG5leHRMZXZlbE1lc3NhZ2UsICgpID0+IHRoaXMubmV4dExldmVsKCkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaXMgYmFsbCBnb2luZyB0byBjcm9zcyBib3VuZGFyeT9cclxuICAgICAgICBpZiAoYmFsbEJvdW5kcy5taW4ueCA8IGJvdW5kcy5taW4ueCB8fCBiYWxsQm91bmRzLm1heC54ID4gYm91bmRzLm1heC54KSB7XHJcbiAgICAgICAgICAgIGxldCB2ZWxvY2l0eSA9IHRoaXMuYmFsbC52ZWxvY2l0eVxyXG4gICAgICAgICAgICB2ZWxvY2l0eS54ID0gLXZlbG9jaXR5LnhcclxuICAgICAgICAgICAgdmVsb2NpdHkueiA9IDBcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gdmVsb2NpdHkubm9ybWFsaXplKCkubXVsWChiYWxsU3BlZWQpXHJcbiAgICAgICAgICAgIHRoaXMucGxheUltcGFjdFNvdW5kKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChiYWxsQm91bmRzLm1heC55ID4gYm91bmRzLm1heC55KSB7XHJcbiAgICAgICAgICAgIGxldCB2ZWxvY2l0eSA9IHRoaXMuYmFsbC52ZWxvY2l0eVxyXG4gICAgICAgICAgICB2ZWxvY2l0eS55ID0gLXZlbG9jaXR5LnlcclxuICAgICAgICAgICAgdmVsb2NpdHkueiA9IDBcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gdmVsb2NpdHkubm9ybWFsaXplKCkubXVsWChiYWxsU3BlZWQpXHJcbiAgICAgICAgICAgIHRoaXMucGxheUltcGFjdFNvdW5kKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGJhbGwgb2ZmIGJvYXJkXHJcbiAgICAgICAgaWYgKGJhbGxCb3VuZHMubWluLnkgPCBib3VuZHMubWluLnkpIHtcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC5wb3NpdGlvbiA9IG5ldyBnZW8uVmVjMygwLCB0aGlzLnBhZGRsZS5wb3NpdGlvbi55ICsgdGhpcy5wYWRkbGUuaGFsZkV4dGVudHMueSArIHRoaXMuYmFsbC5yYWRpdXMsIHRoaXMuYmFsbC5yYWRpdXMpXHJcbiAgICAgICAgICAgIHRoaXMucGxheUltcGFjdFNvdW5kKClcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IEdhbWVTdGF0ZS5MYXVuY2hcclxuICAgICAgICAgICAgdGhpcy5wYWRkbGUucG9zaXRpb24gPSBuZXcgZ2VvLlZlYzMoMCwgdGhpcy5maWVsZEJvdHRvbSArIHRoaXMucGFkZGxlLmhhbGZFeHRlbnRzLnkgKyBwYWRkbGVCb3R0b21NYXJnaW4sIHRoaXMucGFkZGxlLmhhbGZFeHRlbnRzLnopXHJcbiAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICAgICAgICAgIHRoaXMuYmFsbHNSZW1haW5pbmctLVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuYmFsbHNSZW1haW5pbmcgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nYW1lT3ZlcigpXHJcbiAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjbGFtcCB5IHZlbG9jaXR5IHRvIGF2b2lkIGhvcml6b250YWwgYW5nbGVzXHJcbiAgICAgICAgaWYgKHRoaXMuYmFsbC52ZWxvY2l0eS5sZW5ndGhTcSgpID4gMCAmJiBNYXRoLmFicyh0aGlzLmJhbGwudmVsb2NpdHkueSkgPCBiYWxsU3BlZWQgKiAuMjUpIHtcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5LnkgPSBNYXRoLnNpZ24odGhpcy5iYWxsLnZlbG9jaXR5LnkpICogYmFsbFNwZWVkICogLjI1XHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eSA9IHRoaXMuYmFsbC52ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKGJhbGxTcGVlZClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnYW1lT3ZlcigpIHtcclxuICAgICAgICB0aGlzLmJhbGxzUmVtYWluaW5nID0gM1xyXG4gICAgICAgIHRoaXMubGV2ZWwgPSAxXHJcbiAgICAgICAgdGhpcy53YWl0KGdhbWVPdmVyTWVzc2FnZSwgKCkgPT4gdGhpcy5pbml0TGV2ZWwoKSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG5leHRMZXZlbCgpIHtcclxuICAgICAgICB0aGlzLmxldmVsKytcclxuICAgICAgICB0aGlzLmluaXRMZXZlbCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB3YWl0KG1zZzogc3RyaW5nLCBmOiAoKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gbXNnXHJcbiAgICAgICAgdGhpcy5jb250aW51ZSA9IGZcclxuICAgICAgICB0aGlzLnN0YXRlID0gR2FtZVN0YXRlLldhaXRcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGluaXRMZXZlbCgpIHtcclxuICAgICAgICB0aGlzLmJyaWNrcy5jbGVhcigpXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IEdhbWVTdGF0ZS5MYXVuY2hcclxuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBzdGFydE1lc3NhZ2VcclxuXHJcbiAgICAgICAgLy8gcGxheWluZyBmaWVsZFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc3QgaXhtID0gbmV3IGdmeC5JeE1lc2goKVxyXG5cclxuICAgICAgICAgICAgLy8gZmxvb3JcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmxvb3IgPSBnZnguSXhNZXNoLnJlY3RGcm9tQ29vcmRzKHRoaXMuZmllbGRMZWZ0LCB0aGlzLmZpZWxkQm90dG9tLCAtLjI1LCB0aGlzLmZpZWxkUmlnaHQsIHRoaXMuZmllbGRUb3AsIDApXHJcbiAgICAgICAgICAgICAgICBjb25zdCBmbG9vckNvbG9yID0gdGhpcy5sZXZlbERhdGEuZmxvb3JDb2xvclxyXG4gICAgICAgICAgICAgICAgZmxvb3IudmVydGljZXMuZm9yRWFjaCh2ID0+IHYuY29sb3IgPSBmbG9vckNvbG9yKVxyXG4gICAgICAgICAgICAgICAgaXhtLmNhdChmbG9vcilcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gYm9yZGVyXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHdhbGxzID0gbmV3IGdmeC5JeE1lc2goKVxyXG4gICAgICAgICAgICAgICAgY29uc3QgYm9yZGVyQ29sb3IgPSB0aGlzLmxldmVsRGF0YS5ib3JkZXJDb2xvclxyXG4gICAgICAgICAgICAgICAgd2FsbHMuY2F0KGdmeC5JeE1lc2gucmVjdEZyb21Db29yZHModGhpcy5maWVsZExlZnQgLSBib3JkZXJXaWR0aCwgdGhpcy5maWVsZEJvdHRvbSwgLS4yNSwgdGhpcy5maWVsZExlZnQsIHRoaXMuZmllbGRUb3AsIDEpKVxyXG4gICAgICAgICAgICAgICAgd2FsbHMuY2F0KGdmeC5JeE1lc2gucmVjdEZyb21Db29yZHModGhpcy5maWVsZFJpZ2h0LCB0aGlzLmZpZWxkQm90dG9tLCAtLjI1LCB0aGlzLmZpZWxkUmlnaHQgKyBib3JkZXJXaWR0aCwgdGhpcy5maWVsZFRvcCwgMSkpXHJcbiAgICAgICAgICAgICAgICB3YWxscy5jYXQoZ2Z4Lkl4TWVzaC5yZWN0RnJvbUNvb3Jkcyh0aGlzLmZpZWxkTGVmdCAtIGJvcmRlcldpZHRoLCB0aGlzLmZpZWxkVG9wLCAtLjI1LCB0aGlzLmZpZWxkUmlnaHQgKyBib3JkZXJXaWR0aCwgdGhpcy5maWVsZFRvcCArIGJvcmRlcldpZHRoLCAxKSlcclxuICAgICAgICAgICAgICAgIHdhbGxzLnZlcnRpY2VzLmZvckVhY2godiA9PiB2LmNvbG9yID0gYm9yZGVyQ29sb3IpXHJcbiAgICAgICAgICAgICAgICBpeG0uY2F0KHdhbGxzKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCB2YW8gPSB0aGlzLnJlbmRlcmVyLmNyZWF0ZU1lc2goaXhtKVxyXG4gICAgICAgICAgICB0aGlzLmZpZWxkQmF0Y2ggPSBuZXcgZ2Z4LkJhdGNoKHtcclxuICAgICAgICAgICAgICAgIHZhbzogdmFvLFxyXG4gICAgICAgICAgICAgICAgbnVtSW5kaWNlczogaXhtLmluZGljZXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgcm91Z2huZXNzOiAxXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBicmlja3NcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IGJyaWNrSGFsZldpZHRoID0gYnJpY2tXaWR0aCAvIDJcclxuICAgICAgICAgICAgY29uc3QgYnJpY2tIYWxmSGVpZ2h0ID0gYnJpY2tIZWlnaHQgLyAyXHJcbiAgICAgICAgICAgIGNvbnN0IGJyaWNrSGFsZkRlcHRoID0gYnJpY2tEZXB0aCAvIDJcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkWE9mZnNldCA9IHRoaXMuZmllbGRMZWZ0ICsgQnJpY2suaGFsZkV4dGVudHMueFxyXG4gICAgICAgICAgICBjb25zdCBmaWVsZFlPZmZzZXQgPSB0aGlzLmZpZWxkVG9wIC0gdG9wUm93TWFyZ2luIC0gYnJpY2tIZWlnaHQgKiB0aGlzLmxldmVsRGF0YS5icmlja1Jvd3NcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5sZXZlbERhdGEuYnJpY2tSb3dzOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHlPZmZzZXQgPSBmaWVsZFlPZmZzZXQgKyBpICogYnJpY2tIZWlnaHQgKyBicmlja01hcmdpblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0aGlzLmxldmVsRGF0YS5icmlja0NvbHM7ICsraikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHhPZmZzZXQgPSBmaWVsZFhPZmZzZXQgKyBqICogKGJyaWNrV2lkdGggKyBicmlja01hcmdpbilcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBicmlja01pbiA9IG5ldyBnZW8uVmVjMygtYnJpY2tIYWxmV2lkdGggKyBicmlja01hcmdpbiwgLWJyaWNrSGFsZkhlaWdodCArIGJyaWNrTWFyZ2luLCAtYnJpY2tIYWxmRGVwdGgpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYnJpY2tNYXggPSBuZXcgZ2VvLlZlYzMoYnJpY2tIYWxmV2lkdGggLSBicmlja01hcmdpbiwgYnJpY2tIYWxmSGVpZ2h0IC0gYnJpY2tNYXJnaW4sIGJyaWNrSGFsZkRlcHRoKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFhYmIgPSBuZXcgZ2VvLkFBQkIoYnJpY2tNaW4sIGJyaWNrTWF4KVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGl4bSA9IGdmeC5JeE1lc2gucmVjdChhYWJiKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvc2l0aW9uID0gbmV3IGdlby5WZWMzKHhPZmZzZXQsIHlPZmZzZXQsIGJyaWNrSGFsZkRlcHRoKVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBicmljayA9IG5ldyBCcmljayh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYmF0Y2g6IG5ldyBnZnguQmF0Y2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ybGRNYXRyaXg6IGdlby5NYXQ0LnRyYW5zbGF0aW9uKHBvc2l0aW9uKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZ1c2VDb2xvcjogcmFuZC5jaG9vc2UoYnJpY2tDb2xvcnMpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcm91Z2huZXNzOiAuOCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbzogdGhpcy5yZW5kZXJlci5jcmVhdGVNZXNoKGl4bSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1JbmRpY2VzOiBpeG0uaW5kaWNlcy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5icmlja3MuYWRkKGJyaWNrKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhZGQgcGFkZGxlXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCB3aWR0aCA9IHRoaXMubGV2ZWxEYXRhLnBhZGRsZVdpZHRoXHJcbiAgICAgICAgICAgIGNvbnN0IGhhbGZFeHRlbnRzID0gbmV3IGdlby5WZWMzKHdpZHRoIC8gMiwgcGFkZGxlSGVpZ2h0IC8gMiwgcGFkZGxlRGVwdGggLyAyKVxyXG4gICAgICAgICAgICBjb25zdCBhYWJiID0gZ2VvLkFBQkIuZnJvbUhhbGZFeHRlbnRzKGhhbGZFeHRlbnRzKVxyXG4gICAgICAgICAgICBjb25zdCBpeG0gPSBnZnguSXhNZXNoLnJlY3QoYWFiYilcclxuICAgICAgICAgICAgaXhtLnZlcnRpY2VzLmZvckVhY2godiA9PiB2LmNvbG9yID0gbmV3IGdlby5WZWM0KDAsIDEsIDEsIDEpKVxyXG5cclxuICAgICAgICAgICAgY29uc3QgdmFvID0gdGhpcy5yZW5kZXJlci5jcmVhdGVNZXNoKGl4bSlcclxuICAgICAgICAgICAgdGhpcy5wYWRkbGUgPSBuZXcgUGFkZGxlKHtcclxuICAgICAgICAgICAgICAgIGhhbGZFeHRlbnRzOiBoYWxmRXh0ZW50cyxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBuZXcgZ2VvLlZlYzMoMCwgdGhpcy5maWVsZEJvdHRvbSArIGhhbGZFeHRlbnRzLnkgKyBwYWRkbGVCb3R0b21NYXJnaW4sIGhhbGZFeHRlbnRzLnopLFxyXG4gICAgICAgICAgICAgICAgYmF0Y2g6IG5ldyBnZnguQmF0Y2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbyxcclxuICAgICAgICAgICAgICAgICAgICByb3VnaG5lc3M6IC41LFxyXG4gICAgICAgICAgICAgICAgICAgIG51bUluZGljZXM6IGl4bS5pbmRpY2VzLmxlbmd0aFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFkZCBiYWxsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCByYWRpdXMgPSB0aGlzLmxldmVsRGF0YS5iYWxsUmFkaXVzXHJcbiAgICAgICAgICAgIGNvbnN0IGl4bSA9IGdmeC5JeE1lc2guc3BoZXJlKDE2LCAxNilcclxuICAgICAgICAgICAgaXhtLnRyYW5zZm9ybShnZW8uTWF0NC5zY2FsaW5nKG5ldyBnZW8uVmVjMyhyYWRpdXMsIHJhZGl1cywgcmFkaXVzKSkpXHJcbiAgICAgICAgICAgIGl4bS52ZXJ0aWNlcy5mb3JFYWNoKHYgPT4gdi5jb2xvciA9IG5ldyBnZW8uVmVjNCgwLCAwLCAxLCAxKSlcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHZhbyA9IHRoaXMucmVuZGVyZXIuY3JlYXRlTWVzaChpeG0pXHJcbiAgICAgICAgICAgIHRoaXMuYmFsbCA9IG5ldyBCYWxsKHtcclxuICAgICAgICAgICAgICAgIHJhZGl1czogcmFkaXVzLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5ldyBnZW8uVmVjMygwLCB0aGlzLnBhZGRsZS5wb3NpdGlvbi55ICsgdGhpcy5wYWRkbGUuaGFsZkV4dGVudHMueSArIHJhZGl1cywgcmFkaXVzKSxcclxuICAgICAgICAgICAgICAgIGJhdGNoOiBuZXcgZ2Z4LkJhdGNoKHtcclxuICAgICAgICAgICAgICAgICAgICB2YW8sXHJcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdWdobmVzczogMCxcclxuICAgICAgICAgICAgICAgICAgICBudW1JbmRpY2VzOiBpeG0uaW5kaWNlcy5sZW5ndGhcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcGxheUltcGFjdFNvdW5kKCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHNvdW5kID0gcmFuZC5jaG9vc2UodGhpcy5pbXBhY3RTb3VuZHMpXHJcbiAgICAgICAgY29uc3Qgc3JjID0gdGhpcy5hYy5jcmVhdGVCdWZmZXJTb3VyY2UoKVxyXG4gICAgICAgIHNyYy5idWZmZXIgPSBzb3VuZFxyXG4gICAgICAgIHNyYy5jb25uZWN0KHRoaXMuYWMuZGVzdGluYXRpb24pXHJcbiAgICAgICAgc3JjLnN0YXJ0KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZpbmROZWFyZXN0UG9pbnRPbkJyaWNrKGJyaWNrOiBCcmljaywgcG9zaXRpb246IGdlby5WZWMzKTogZ2VvLlZlYzMge1xyXG4gICAgICAgIGNvbnN0IGFhYmIgPSBnZW8uQUFCQi5mcm9tUG9zaXRpb25IYWxmRXh0ZW50cyhicmljay5wb3NpdGlvbiwgQnJpY2suaGFsZkV4dGVudHMpXHJcbiAgICAgICAgY29uc3QgbmVhcmVzdCA9IHBvc2l0aW9uLmNsYW1wKGFhYmIubWluLCBhYWJiLm1heClcclxuICAgICAgICByZXR1cm4gbmVhcmVzdFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZmluZE5lYXJlc3RCcmljayhwb3NpdGlvbjogZ2VvLlZlYzMsIHJhZGl1czogbnVtYmVyKTogQnJpY2sgfCBudWxsIHtcclxuICAgICAgICBjb25zdCByMiA9IHJhZGl1cyAqIHJhZGl1c1xyXG4gICAgICAgIGxldCBtaW5EaXN0U3EgPSByMlxyXG4gICAgICAgIGxldCBuZWFyZXN0QnJpY2s6IEJyaWNrIHwgbnVsbCA9IG51bGxcclxuICAgICAgICBmb3IgKGNvbnN0IGJyaWNrIG9mIHRoaXMuYnJpY2tzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5lYXJlc3RQdCA9IHRoaXMuZmluZE5lYXJlc3RQb2ludE9uQnJpY2soYnJpY2ssIHBvc2l0aW9uKVxyXG4gICAgICAgICAgICBjb25zdCBkaXN0U3EgPSBuZWFyZXN0UHQuc3ViKHBvc2l0aW9uKS5sZW5ndGhTcSgpXHJcbiAgICAgICAgICAgIGlmIChkaXN0U3EgPCBtaW5EaXN0U3EpIHtcclxuICAgICAgICAgICAgICAgIG5lYXJlc3RCcmljayA9IGJyaWNrXHJcbiAgICAgICAgICAgICAgICBtaW5EaXN0U3EgPSBkaXN0U3FcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG5lYXJlc3RCcmlja1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlV29ybGRNYXRyaWNlcygpIHtcclxuICAgICAgICB0aGlzLmJhbGwuYmF0Y2gud29ybGRNYXRyaXggPSBnZW8uTWF0NC50cmFuc2xhdGlvbih0aGlzLmJhbGwucG9zaXRpb24pXHJcbiAgICAgICAgdGhpcy5wYWRkbGUuYmF0Y2gud29ybGRNYXRyaXggPSBnZW8uTWF0NC50cmFuc2xhdGlvbih0aGlzLnBhZGRsZS5wb3NpdGlvbilcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyYXdTY2VuZSgpIHtcclxuICAgICAgICAvLyBjb25maWd1cmUgY2FtZXJhIC0gZml0IHBsYXkgYXJlYSB0byBzY3JlZW4gd2l0aCBzb21lIHNtYWxsIG1hcmdpblxyXG4gICAgICAgIGxldCB6ID0gMFxyXG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuZmllbGRUb3AgLSB0aGlzLmZpZWxkQm90dG9tICsgYm9yZGVyV2lkdGggKiAyXHJcbiAgICAgICAgY29uc3Qgd2lkdGggPSB0aGlzLmZpZWxkUmlnaHQgLSB0aGlzLmZpZWxkTGVmdCArIGJvcmRlcldpZHRoICogMlxyXG4gICAgICAgIGNvbnN0IGZpZWxkQXNwZWN0ID0gd2lkdGggLyBoZWlnaHRcclxuICAgICAgICBpZiAoZmllbGRBc3BlY3QgPCB0aGlzLnJlbmRlcmVyLmFzcGVjdCkge1xyXG4gICAgICAgICAgICB6ID0gaGVpZ2h0IC8gMiAvIE1hdGgudGFuKHRoaXMucmVuZGVyZXIuZm92IC8gMilcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB6ID0gd2lkdGggLyAyIC8gTWF0aC50YW4odGhpcy5yZW5kZXJlci5mb3YgKiB0aGlzLnJlbmRlcmVyLmFzcGVjdCAvIDIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci52aWV3TWF0cml4ID0gZ2VvLk1hdDQubG9va0F0KFxyXG4gICAgICAgICAgICBuZXcgZ2VvLlZlYzMoMCwgMCwgMSArIHopLCBuZXcgZ2VvLlZlYzMoMCwgMCwgLTEpLCBuZXcgZ2VvLlZlYzMoMCwgMSwgMCkpLmludmVydCgpXHJcblxyXG4gICAgICAgIC8vIHNob3cgZnJvbSBzaWRlIHZpZXcgZm9yIGRlYnVnZ2luZ1xyXG4gICAgICAgIC8vIHRoaXMucmVuZGVyZXIudmlld01hdHJpeCA9IGdlby5NYXQ0Lmxvb2tBdChcclxuICAgICAgICAvLyAgICAgbmV3IGdlby5WZWMzKDAsIC0xNiwgMCksIG5ldyBnZW8uVmVjMygwLCAxLCAwKSwgbmV3IGdlby5WZWMzKDAsIDAsIDEpKS5pbnZlcnQoKVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdCYXRjaCh0aGlzLmZpZWxkQmF0Y2gpXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3QmF0Y2godGhpcy5iYWxsLmJhdGNoKVxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd0JhdGNoKHRoaXMucGFkZGxlLmJhdGNoKVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGJyaWNrIG9mIHRoaXMuYnJpY2tzKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd0JhdGNoKGJyaWNrLmJhdGNoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5wcmVzZW50KClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNhbnZhc1RvTkRDKGNjOiBnZW8uVmVjMik6IGdlby5WZWMyIHtcclxuICAgICAgICBjb25zdCBuZGMgPSBuZXcgZ2VvLlZlYzIoXHJcbiAgICAgICAgICAgIGNjLnggLyB0aGlzLmNhbnZhcy53aWR0aCAqIDIgLSAxLFxyXG4gICAgICAgICAgICAtY2MueSAvIHRoaXMuY2FudmFzLmhlaWdodCAqIDIgKyAxXHJcbiAgICAgICAgKVxyXG5cclxuICAgICAgICByZXR1cm4gbmRjXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYW52YXNUb05EQ1JheShjYzogZ2VvLlZlYzIpOiBnZW8uUmF5IHtcclxuICAgICAgICBjb25zdCBuZGMgPSB0aGlzLmNhbnZhc1RvTkRDKGNjKVxyXG4gICAgICAgIGNvbnN0IHJheSA9IG5ldyBnZW8uUmF5KG5ldyBnZW8uVmVjMyhuZGMueCwgbmRjLnksIC0xKSwgbmV3IGdlby5WZWMzKDAsIDAsIDEpKVxyXG4gICAgICAgIHJldHVybiByYXlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNhbnZhc1RvV29ybGRSYXkoY2M6IGdlby5WZWMyKTogZ2VvLlJheSB7XHJcbiAgICAgICAgY29uc3QgbmRjUmF5ID0gdGhpcy5jYW52YXNUb05EQ1JheShjYylcclxuICAgICAgICBjb25zdCBpbnZQcm9qID0gdGhpcy5yZW5kZXJlci5wcm9qZWN0aW9uTWF0cml4LmludmVydCgpXHJcbiAgICAgICAgY29uc3QgaW52VmlldyA9IHRoaXMucmVuZGVyZXIudmlld01hdHJpeC5pbnZlcnQoKVxyXG4gICAgICAgIGNvbnN0IGludlZpZXdQcm9qID0gdGhpcy5yZW5kZXJlci5wcm9qZWN0aW9uTWF0cml4Lm1hdG11bCh0aGlzLnJlbmRlcmVyLnZpZXdNYXRyaXgpLmludmVydCgpXHJcbiAgICAgICAgY29uc3Qgdmlld1JheSA9IG5kY1JheS50cmFuc2Zvcm0oaW52UHJvailcclxuICAgICAgICBjb25zdCB3b3JsZFJheSA9IHZpZXdSYXkudHJhbnNmb3JtKGludlZpZXcpXHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlucC5tb3VzZUxlZnRSZWxlYXNlZCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImNjOiBcIiwgY2MudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJuZGM6IFwiLCBuZGNSYXkudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ2aWV3OiBcIiwgdmlld1JheS50b1N0cmluZygpKVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIndvcmxkOiBcIiwgd29ybGRSYXkudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ3b3JsZDI6IFwiLCBuZGNSYXkudHJhbnNmb3JtKGludlZpZXdQcm9qKS50b1N0cmluZygpKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHdvcmxkUmF5XHJcbiAgICB9XHJcbn1cclxuXHJcbmNvbnN0IGFwcCA9IG5ldyBBcHAoKVxyXG5hcHAuZXhlYygpXHJcbiJdfQ==