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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtvdXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJicmVha291dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQixNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUE7QUFDcEIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFBO0FBQ3JCLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQTtBQUNyQixNQUFNLFlBQVksR0FBRyxFQUFFLENBQUE7QUFDdkIsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFBO0FBQ3RCLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQTtBQUN0QixNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFDckIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFBO0FBQ3RCLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQTtBQUN2QixNQUFNLGtCQUFrQixHQUFHLENBQUMsQ0FBQTtBQUU1QixNQUFNLFlBQVksR0FBRyw4Q0FBOEMsQ0FBQTtBQUNuRSxNQUFNLGVBQWUsR0FBRyxxREFBcUQsQ0FBQTtBQUM3RSxNQUFNLGdCQUFnQixHQUFHLHVEQUF1RCxDQUFBO0FBWWhGLE1BQU0sTUFBTSxHQUFHLElBQUksS0FBSztBQUNwQixVQUFVO0FBQ1Y7SUFDSSxTQUFTLEVBQUUsRUFBRTtJQUNiLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzdDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsQ0FBQztJQUNiLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQ3pDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEdBQUc7SUFDZCxVQUFVLEVBQUUsR0FBRztJQUNmLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ3ZDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ3pDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEdBQUc7SUFDZCxVQUFVLEVBQUUsR0FBRztJQUNmLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzdDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3JDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzFDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxHQUFHO0lBQ2hCLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUM3QztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxHQUFHO0lBQ2QsVUFBVSxFQUFFLEdBQUc7SUFDZixXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN2QyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUMzQztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxFQUFFO0lBQ2IsVUFBVSxFQUFFLEVBQUU7SUFDZCxXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUM3QztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxFQUFFO0lBQ2IsVUFBVSxFQUFFLEVBQUU7SUFDZCxXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztDQUMxQyxDQUNKLENBQUE7QUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLEtBQUssQ0FDekIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3hCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3hCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUMxQixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQzFCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDMUIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM1QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQzVCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFF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QUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDMUQsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3JELElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQTtRQUMzQixJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQTtJQUNyQixDQUFDO0lBRU8sZUFBZTtRQUNuQixJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDLElBQUksRUFBRTtZQUMvQixPQUFNO1NBQ1Q7UUFFRCxxQ0FBcUM7UUFDckMsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQzlCLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFDcEMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXRDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUE7UUFFOUYsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDL0QsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyx1QkFB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USxFQUFFLENBQUMsQ0FBQTtZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUN6QyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7U0FDcEU7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNuQixDQUFDO0NBQ0o7QUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFBO0FBQ3JCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzNkLmpzXCJcclxuaW1wb3J0ICogYXMgaW5wdXQgZnJvbSBcIi4uL3NoYXJlZC9pbnB1dC5qc1wiXHJcbmltcG9ydCAqIGFzIHJhbmQgZnJvbSBcIi4uL3NoYXJlZC9yYW5kLmpzXCJcclxuaW1wb3J0ICogYXMgbWF0aCBmcm9tIFwiLi4vc2hhcmVkL21hdGguanNcIlxyXG5pbXBvcnQgKiBhcyBhdWRpbyBmcm9tIFwiLi4vc2hhcmVkL2F1ZGlvLmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcblxyXG5jb25zdCBicmlja1dpZHRoID0gMlxyXG5jb25zdCBicmlja0hlaWdodCA9IDFcclxuY29uc3QgYnJpY2tEZXB0aCA9IC41XHJcbmNvbnN0IHBhZGRsZUhlaWdodCA9IC41XHJcbmNvbnN0IHBhZGRsZURlcHRoID0gLjVcclxuY29uc3QgcGFkZGxlU3BlZWQgPSAuNVxyXG5jb25zdCBib3JkZXJXaWR0aCA9IDFcclxuY29uc3QgdG9wUm93TWFyZ2luID0gMVxyXG5jb25zdCBicmlja01hcmdpbiA9IC4wNVxyXG5jb25zdCBwYWRkbGVCb3R0b21NYXJnaW4gPSAxXHJcblxyXG5jb25zdCBzdGFydE1lc3NhZ2UgPSBcIlRhcCwgY2xpY2ssIG9yIHByZXNzIGFueSBrZXkgdG8gbGF1bmNoIGJhbGwuXCJcclxuY29uc3QgZ2FtZU92ZXJNZXNzYWdlID0gXCJHYW1lIG92ZXIhIFRhcCwgY2xpY2ssIG9yIHByZXNzIGFueSBrZXkgdG8gcmVzdGFydC5cIlxyXG5jb25zdCBuZXh0TGV2ZWxNZXNzYWdlID0gXCJMZXZlbCBDbGVhciEgVGFwLCBjbGljaywgb3IgcHJlc3MgYW55IGtleSB0byBhZHZhbmNlLlwiXHJcblxyXG5pbnRlcmZhY2UgTGV2ZWxEYXRhIHtcclxuICAgIGJhbGxTcGVlZDogbnVtYmVyXHJcbiAgICBiYWxsUmFkaXVzOiBudW1iZXJcclxuICAgIHBhZGRsZVdpZHRoOiBudW1iZXJcclxuICAgIGJyaWNrUm93czogbnVtYmVyXHJcbiAgICBicmlja0NvbHM6IG51bWJlclxyXG4gICAgYm9yZGVyQ29sb3I6IGdlby5WZWM0XHJcbiAgICBmbG9vckNvbG9yOiBnZW8uVmVjNFxyXG59XHJcblxyXG5jb25zdCBsZXZlbHMgPSBuZXcgQXJyYXk8TGV2ZWxEYXRhPihcclxuICAgIC8vIGxldmVsIDFcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC4yLFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IDEuMjUsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDYsXHJcbiAgICAgICAgYnJpY2tSb3dzOiAzLFxyXG4gICAgICAgIGJyaWNrQ29sczogNyxcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KC4yNSwgMCwgMCwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KC4yNSwgLjI1LCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgMlxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjMsXHJcbiAgICAgICAgYmFsbFJhZGl1czogMSxcclxuICAgICAgICBwYWRkbGVXaWR0aDogNixcclxuICAgICAgICBicmlja1Jvd3M6IDMsXHJcbiAgICAgICAgYnJpY2tDb2xzOiA3LFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgLjI1LCAwLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgMCwgLjI1LCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDNcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC4zNSxcclxuICAgICAgICBiYWxsUmFkaXVzOiAuNzUsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDYsXHJcbiAgICAgICAgYnJpY2tSb3dzOiAzLFxyXG4gICAgICAgIGJyaWNrQ29sczogNSxcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KDAsIDAsIC41NSwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KDAsIDAsIDAsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgNFxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjQsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjYsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDUsXHJcbiAgICAgICAgYnJpY2tSb3dzOiAzLFxyXG4gICAgICAgIGJyaWNrQ29sczogNixcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KC42LCAuNSwgMCwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KDAsIC4yNSwgMCwgMSlcclxuICAgIH0sXHJcbiAgICAvLyBsZXZlbCA1XHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuNDUsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjU1LFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiA0LFxyXG4gICAgICAgIGJyaWNrUm93czogMyxcclxuICAgICAgICBicmlja0NvbHM6IDgsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAuNSwgLjYsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCguMjUsIC4yNSwgLjI1LCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDZcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC41LFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC41LFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiA0LFxyXG4gICAgICAgIGJyaWNrUm93czogNCxcclxuICAgICAgICBicmlja0NvbHM6IDgsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCgxLCAwLCAwLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgLjMsIC4yNSwgMSlcclxuICAgIH0sXHJcbiAgICAvLyBsZXZlbCA3XHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuNixcclxuICAgICAgICBiYWxsUmFkaXVzOiAuNCxcclxuICAgICAgICBwYWRkbGVXaWR0aDogMy41LFxyXG4gICAgICAgIGJyaWNrUm93czogNCxcclxuICAgICAgICBicmlja0NvbHM6IDEwLFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoMSwgMSwgMCwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KC4yNSwgLjI1LCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgOFxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjY1LFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC4zNSxcclxuICAgICAgICBwYWRkbGVXaWR0aDogMyxcclxuICAgICAgICBicmlja1Jvd3M6IDUsXHJcbiAgICAgICAgYnJpY2tDb2xzOiAxMCxcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KC41LCAuNiwgMSwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KC4yNSwgMCwgLjI1LCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDlcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC43LFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC4zLFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiAyLFxyXG4gICAgICAgIGJyaWNrUm93czogNixcclxuICAgICAgICBicmlja0NvbHM6IDEyLFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgMSwgMSwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KC4zNSwgLjE1LCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgOVxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjgsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjIsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDEsXHJcbiAgICAgICAgYnJpY2tSb3dzOiA4LFxyXG4gICAgICAgIGJyaWNrQ29sczogMTUsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCgxLCAxLCAxLCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjEsIC4xLCAuNCwgMSlcclxuICAgIH0sXHJcbilcclxuXHJcbmNvbnN0IGJyaWNrQ29sb3JzID0gbmV3IEFycmF5PGdlby5WZWM0PihcclxuICAgIG5ldyBnZW8uVmVjNCgxLCAwLCAwLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgwLCAxLCAwLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgwLCAwLCAxLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgwLCAxLCAxLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgxLCAwLCAxLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgxLCAxLCAxLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCguNSwgLjUsIDAsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDAsIC41LCAuNSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoLjUsIDAsIC41LCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCguMjUsIC43NSwgMCwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMCwgLjI1LCAuNzUsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KC4yNSwgMCwgLjc1LCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCguNzUsIC4yNSwgMCwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMCwgLjc1LCAuMjUsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KC43NSwgMCwgLjI1LCAxKSxcclxuKVxyXG5cclxuaW50ZXJmYWNlIFBhZGRsZU9wdGlvbnMge1xyXG4gICAgaGFsZkV4dGVudHM6IGdlby5WZWMzXHJcbiAgICBwb3NpdGlvbjogZ2VvLlZlYzNcclxuICAgIGJhdGNoOiBnZnguQmF0Y2hcclxuICAgIHZlbG9jaXR5PzogZ2VvLlZlYzNcclxufVxyXG5cclxuY2xhc3MgUGFkZGxlIHtcclxuICAgIHB1YmxpYyByZWFkb25seSBoYWxmRXh0ZW50czogZ2VvLlZlYzNcclxuICAgIHB1YmxpYyByZWFkb25seSBiYXRjaCA9IG5ldyBnZnguQmF0Y2goKVxyXG4gICAgcG9zaXRpb24gPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgIHZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogUGFkZGxlT3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMuaGFsZkV4dGVudHMgPSBvcHRpb25zLmhhbGZFeHRlbnRzLmNsb25lKClcclxuICAgICAgICB0aGlzLmJhdGNoID0gb3B0aW9ucy5iYXRjaFxyXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uLmNsb25lKClcclxuICAgICAgICB0aGlzLnZlbG9jaXR5ID0gb3B0aW9ucy52ZWxvY2l0eT8uY2xvbmUoKSA/PyBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIEJyaWNrT3B0aW9ucyB7XHJcbiAgICBwb3NpdGlvbjogZ2VvLlZlYzNcclxuICAgIGJhdGNoOiBnZnguQmF0Y2hcclxufVxyXG5cclxuY2xhc3MgQnJpY2sge1xyXG4gICAgcHVibGljIHJlYWRvbmx5IGJhdGNoID0gbmV3IGdmeC5CYXRjaCgpXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgcG9zaXRpb24gPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgIHN0YXRpYyByZWFkb25seSBoYWxmRXh0ZW50cyA9IG5ldyBnZW8uVmVjMyhicmlja1dpZHRoIC8gMiAtIGJyaWNrTWFyZ2luLCBicmlja0hlaWdodCAvIDIgLSBicmlja01hcmdpbiwgYnJpY2tEZXB0aCAvIDIpXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQnJpY2tPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IG9wdGlvbnMucG9zaXRpb24uY2xvbmUoKVxyXG4gICAgICAgIHRoaXMuYmF0Y2ggPSBvcHRpb25zLmJhdGNoXHJcbiAgICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSBCYWxsT3B0aW9ucyB7XHJcbiAgICByYWRpdXM6IG51bWJlclxyXG4gICAgcG9zaXRpb246IGdlby5WZWMzXHJcbiAgICBiYXRjaDogZ2Z4LkJhdGNoXHJcbiAgICB2ZWxvY2l0eT86IGdlby5WZWMzXHJcbn1cclxuXHJcbmNsYXNzIEJhbGwge1xyXG4gICAgcmFkaXVzOiBudW1iZXIgPSAxXHJcbiAgICBwb3NpdGlvbjogZ2VvLlZlYzNcclxuICAgIGJhdGNoOiBnZnguQmF0Y2hcclxuICAgIHZlbG9jaXR5OiBnZW8uVmVjM1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEJhbGxPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5yYWRpdXMgPSBvcHRpb25zLnJhZGl1c1xyXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uLmNsb25lKClcclxuICAgICAgICB0aGlzLmJhdGNoID0gb3B0aW9ucy5iYXRjaFxyXG4gICAgICAgIHRoaXMudmVsb2NpdHkgPSBvcHRpb25zLnZlbG9jaXR5Py5jbG9uZSgpID8/IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgfVxyXG59XHJcblxyXG5lbnVtIEdhbWVTdGF0ZSB7XHJcbiAgICBQbGF5LFxyXG4gICAgTGF1bmNoLFxyXG4gICAgV2FpdFxyXG59XHJcblxyXG4vLyBzdGVwIDEgLSBjbGVhciBzY3JlZW4sIGluaXQgZ2wsIGV0Yy4uLlxyXG4vLyBzdGVwIDIgLSBkcmF3IGEgY2xpcCBzcGFjZSB0cmlhbmdsZVxyXG4vLyBzdGVwIDMgLSBkcmF3IGEgd29ybGQgc3BhY2UgdHJpYW5nbGVcclxuY2xhc3MgQXBwIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgY2FudmFzID0gZG9tLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWxTcGFuID0gZG9tLmJ5SWQoXCJsZXZlbFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBiYWxsc1JlbWFpbmluZ1NwYW4gPSBkb20uYnlJZChcImJhbGxzUmVtYWluaW5nXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1lc3NhZ2VEaXYgPSBkb20uYnlJZChcIm1lc3NhZ2VcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmVuZGVyZXIgPSBuZXcgZ2Z4LlJlbmRlcmVyKHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbnAgPSBuZXcgaW5wdXQuSW5wdXQodGhpcy5jYW52YXMpXHJcbiAgICBwcml2YXRlIGZpZWxkQmF0Y2g6IGdmeC5CYXRjaCA9IG5ldyBnZnguQmF0Y2goKVxyXG4gICAgcHJpdmF0ZSBwYWRkbGUhOiBQYWRkbGVcclxuICAgIHByaXZhdGUgYmFsbCE6IEJhbGxcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYnJpY2tzID0gbmV3IFNldDxCcmljaz4oKVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBhYyA9IG5ldyBBdWRpb0NvbnRleHQoKVxyXG4gICAgcHJpdmF0ZSBpbXBhY3RTb3VuZHMgPSBuZXcgQXJyYXk8QXVkaW9CdWZmZXI+KClcclxuICAgIHByaXZhdGUgYmFsbHNSZW1haW5pbmcgPSAzXHJcbiAgICBwcml2YXRlIGxldmVsID0gMVxyXG4gICAgcHJpdmF0ZSBzdGF0ZSA9IEdhbWVTdGF0ZS5MYXVuY2hcclxuICAgIHByaXZhdGUgY29udGludWUgPSAoKSA9PiB7IH1cclxuXHJcbiAgICBhc3luYyBleGVjKCkge1xyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IHN0YXJ0TWVzc2FnZVxyXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoKSA9PiB0aGlzLmhhbmRsZUtleVVwKCkpXHJcblxyXG4gICAgICAgIHRoaXMuaW5pdExldmVsKClcclxuICAgICAgICBhd2FpdCB0aGlzLmluaXRBdWRpbygpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuZm9jdXMoKVxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLnRpY2soKSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGluaXRBdWRpbygpIHtcclxuICAgICAgICBjb25zdCBudW1JbXBhY3RTb3VuZHMgPSAxNVxyXG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IG51bUltcGFjdFNvdW5kczsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IGAuL2Fzc2V0cy9pbXBhY3Qke2l9LndhdmBcclxuICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgYXVkaW8ubG9hZEF1ZGlvKHRoaXMuYWMsIHVybClcclxuICAgICAgICAgICAgdGhpcy5pbXBhY3RTb3VuZHMucHVzaChidWZmZXIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdGljaygpIHtcclxuICAgICAgICB0aGlzLmNoZWNrU2l6ZSgpXHJcbiAgICAgICAgdGhpcy51cGRhdGUoKVxyXG4gICAgICAgIHRoaXMuZHJhd1NjZW5lKClcclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy50aWNrKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjaGVja1NpemUoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY2FudmFzLndpZHRoID09PSB0aGlzLmNhbnZhcy5jbGllbnRXaWR0aCAmJiB0aGlzLmNhbnZhcy5oZWlnaHQgPT09IHRoaXMuY2FudmFzLmNsaWVudEhlaWdodCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5jYW52YXMuY2xpZW50V2lkdGhcclxuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHRcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZSgpIHtcclxuICAgICAgICB0aGlzLnBhZGRsZS5wb3NpdGlvbiA9IHRoaXMucGFkZGxlLnBvc2l0aW9uLmFkZCh0aGlzLnBhZGRsZS52ZWxvY2l0eSlcclxuICAgICAgICB0aGlzLmJhbGwucG9zaXRpb24gPSB0aGlzLmJhbGwucG9zaXRpb24uYWRkKHRoaXMuYmFsbC52ZWxvY2l0eSlcclxuICAgICAgICB0aGlzLmhhbmRsZUlucHV0KClcclxuICAgICAgICB0aGlzLmhhbmRsZUNvbGxpc2lvbigpXHJcbiAgICAgICAgdGhpcy51cGRhdGVXb3JsZE1hdHJpY2VzKClcclxuICAgICAgICB0aGlzLnVwZGF0ZVVJKClcclxuICAgICAgICB0aGlzLmlucC5mbHVzaCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVVSSgpIHtcclxuICAgICAgICB0aGlzLmJhbGxzUmVtYWluaW5nU3Bhbi50ZXh0Q29udGVudCA9IHRoaXMuYmFsbHNSZW1haW5pbmcudG9TdHJpbmcoKVxyXG4gICAgICAgIHRoaXMubGV2ZWxTcGFuLnRleHRDb250ZW50ID0gdGhpcy5sZXZlbC50b1N0cmluZygpXHJcblxyXG4gICAgICAgIGlmICh0aGlzLm1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgdGhpcy5tZXNzYWdlRGl2LmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5tZXNzYWdlRGl2LmhpZGRlbiA9IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgbGV2ZWxEYXRhKCk6IExldmVsRGF0YSB7XHJcbiAgICAgICAgY29uc3QgZGF0YSA9IGxldmVsc1tNYXRoLm1pbih0aGlzLmxldmVsIC0gMSwgbGV2ZWxzLmxlbmd0aCAtIDEpXVxyXG4gICAgICAgIHJldHVybiBkYXRhXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRXaWR0aCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBicmlja1dpZHRoICogdGhpcy5sZXZlbERhdGEuYnJpY2tDb2xzXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRIZWlnaHQoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gYnJpY2tIZWlnaHQgKiB0aGlzLmxldmVsRGF0YS5icmlja1Jvd3MgKiA0ICsgdG9wUm93TWFyZ2luXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRMZWZ0KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIC10aGlzLmZpZWxkV2lkdGggLyAyXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRSaWdodCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZpZWxkTGVmdCArIHRoaXMuZmllbGRXaWR0aFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IGZpZWxkQm90dG9tKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIC10aGlzLmZpZWxkSGVpZ2h0IC8gMlxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IGZpZWxkVG9wKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmllbGRCb3R0b20gKyB0aGlzLmZpZWxkSGVpZ2h0XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgbWVzc2FnZSgpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2VEaXYudGV4dENvbnRlbnQgPz8gXCJcIlxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2V0IG1lc3NhZ2UodGV4dDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy5tZXNzYWdlRGl2LnRleHRDb250ZW50ID0gdGV4dFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlS2V5VXAoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT09IEdhbWVTdGF0ZS5QbGF5KSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT09IEdhbWVTdGF0ZS5XYWl0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGludWUoKVxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubGF1bmNoQmFsbCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVJbnB1dCgpIHtcclxuICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcclxuICAgICAgICAgICAgY2FzZSBHYW1lU3RhdGUuTGF1bmNoOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dExhdW5jaCgpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBHYW1lU3RhdGUuUGxheTpcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlSW5wdXRQbGF5KClcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIEdhbWVTdGF0ZS5XYWl0OlxyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dFdhaXQoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVJbnB1dExhdW5jaCgpOiB2b2lkIHtcclxuICAgICAgICAvLyBzdGFydCBnYW1lIG9uIG1vdXNlIGNpY2tcclxuICAgICAgICBpZiAodGhpcy5pbnAubW91c2VMZWZ0UHJlc3NlZCkge1xyXG4gICAgICAgICAgICB0aGlzLmxhdW5jaEJhbGwoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUlucHV0UGxheSgpIHtcclxuICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG5cclxuICAgICAgICAvLyBtb3VzZSAvIHRvdWNoIHBhZGRsZSBtb3ZlbWVudFxyXG4gICAgICAgIGlmICh0aGlzLmlucC5tb3VzZUxlZnREb3duKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHdvcmxkTW91c2VSYXkgPSB0aGlzLmNhbnZhc1RvV29ybGRSYXkobmV3IGdlby5WZWMyKHRoaXMuaW5wLm1vdXNlWCwgdGhpcy5pbnAubW91c2VZKSlcclxuICAgICAgICAgICAgY29uc3QgZmllbGRQbGFuZSA9IGdlby5QbGFuZS5mcm9tUG9pbnROb3JtYWwodGhpcy5wYWRkbGUucG9zaXRpb24sIG5ldyBnZW8uVmVjMygwLCAwLCAxKSlcclxuICAgICAgICAgICAgY29uc3QgZmllbGRJeCA9IHdvcmxkTW91c2VSYXkubGVycCh3b3JsZE1vdXNlUmF5LmNhc3QoZmllbGRQbGFuZSkpXHJcbiAgICAgICAgICAgIGlmIChmaWVsZEl4LnggPiB0aGlzLnBhZGRsZS5wb3NpdGlvbi54KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygxLCAwLCAwKVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZpZWxkSXgueCA8IHRoaXMucGFkZGxlLnBvc2l0aW9uLngpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKC0xLCAwLCAwKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBrZXlib2FyZCBwYWRkbGUgbW92ZW1lbnRcclxuICAgICAgICBpZiAodGhpcy5pbnAuZG93bihcImFcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoLTEsIDAsIDApXHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlucC5kb3duKFwiZFwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygxLCAwLCAwKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMucGFkZGxlLnZlbG9jaXR5Lmxlbmd0aFNxKCkgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gdGhpcy5wYWRkbGUudmVsb2NpdHkubm9ybWFsaXplKCkubXVsWChwYWRkbGVTcGVlZClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVJbnB1dFdhaXQoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuaW5wLm1vdXNlTGVmdERvd24pIHtcclxuICAgICAgICAgICAgdGhpcy5jb250aW51ZSgpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbGF1bmNoQmFsbCgpIHtcclxuICAgICAgICAvLyBjaG9vc2UgcmFuZG9tIHVwd2FyZCBsYXVuY2ggZGlyZWN0aW9uXHJcbiAgICAgICAgY29uc3Qgcm90ID0gZ2VvLk1hdDMucm90YXRpb25aKHJhbmQuZmxvYXQoLU1hdGguUEkgLyA0LCBNYXRoLlBJIC8gNCkpXHJcbiAgICAgICAgY29uc3QgdiA9IHJvdC50cmFuc2Zvcm0obmV3IGdlby5WZWMzKDAsIDEsIDApKS5ub3JtYWxpemUoKVxyXG4gICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eSA9IHYubXVsWCh0aGlzLmxldmVsRGF0YS5iYWxsU3BlZWQpXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IEdhbWVTdGF0ZS5QbGF5XHJcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gXCJcIlxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlQ29sbGlzaW9uKCkge1xyXG4gICAgICAgIGlmICh0aGlzLnN0YXRlICE9PSBHYW1lU3RhdGUuUGxheSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGlzIHBhZGRsZSBnb2luZyB0byBjcm9zcyBib3VuZGFyeT9cclxuICAgICAgICBjb25zdCBib3VuZHMgPSBnZW8uQUFCQi5mcm9tQ29vcmRzKFxyXG4gICAgICAgICAgICB0aGlzLmZpZWxkTGVmdCwgdGhpcy5maWVsZEJvdHRvbSwgLTEsXHJcbiAgICAgICAgICAgIHRoaXMuZmllbGRSaWdodCwgdGhpcy5maWVsZFRvcCwgMSlcclxuXHJcbiAgICAgICAgY29uc3QgcGFkZGxlUG9zaXRpb24gPSB0aGlzLnBhZGRsZS5wb3NpdGlvbi5hZGQodGhpcy5wYWRkbGUudmVsb2NpdHkpXHJcbiAgICAgICAgY29uc3QgcGFkZGxlQm91bmRzID0gZ2VvLkFBQkIuZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMocGFkZGxlUG9zaXRpb24sIHRoaXMucGFkZGxlLmhhbGZFeHRlbnRzKVxyXG5cclxuICAgICAgICBjb25zdCBiYWxsUG9zaXRpb24gPSB0aGlzLmJhbGwucG9zaXRpb24uYWRkKHRoaXMuYmFsbC52ZWxvY2l0eSlcclxuICAgICAgICBjb25zdCBiYWxsQm91bmRzID0gZ2VvLkFBQkIuZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMoYmFsbFBvc2l0aW9uLCBuZXcgZ2VvLlZlYzModGhpcy5iYWxsLnJhZGl1cywgdGhpcy5iYWxsLnJhZGl1cywgdGhpcy5iYWxsLnJhZGl1cykpXHJcbiAgICAgICAgY29uc3QgYmFsbFNwZWVkID0gdGhpcy5sZXZlbERhdGEuYmFsbFNwZWVkXHJcblxyXG4gICAgICAgIC8vIGNoZWNrIHBhZGRsZSBhZ2FpbnN0IGJvdW5kYXJ5XHJcbiAgICAgICAgaWYgKHBhZGRsZUJvdW5kcy5taW4ueCA8PSB0aGlzLmZpZWxkTGVmdCB8fCBwYWRkbGVCb3VuZHMubWF4LnggPj0gdGhpcy5maWVsZFJpZ2h0KSB7XHJcbiAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBiYWxsIC8gcGFkZGxlIGhpdCBjaGVja1xyXG4gICAgICAgIGlmIChiYWxsQm91bmRzLm92ZXJsYXBzKHBhZGRsZUJvdW5kcykpIHtcclxuICAgICAgICAgICAgbGV0IHZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5XHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnkgPSAtdmVsb2NpdHkueVxyXG5cclxuICAgICAgICAgICAgLy8gYWxsb3cgcGxheWVyIHNvbWUgY29udHJvbFxyXG4gICAgICAgICAgICAvLyByaWdodCBzaWRlIG9mIHBhZGRsZSByb3RhdGVzIGFuZ2xlIHJpZ2h0XHJcbiAgICAgICAgICAgIC8vIGxlZnQgc2lkZSBvZiBwYWRkbGUgcm90YXRlcyBhbmdsZSBsZWZ0XHJcbiAgICAgICAgICAgIGNvbnN0IGFhYmIgPSBnZW8uQUFCQi5mcm9tUG9zaXRpb25IYWxmRXh0ZW50cyhwYWRkbGVQb3NpdGlvbiwgdGhpcy5wYWRkbGUuaGFsZkV4dGVudHMpXHJcbiAgICAgICAgICAgIGNvbnN0IG5lYXJlc3QgPSBiYWxsUG9zaXRpb24uY2xhbXAoYWFiYi5taW4sIGFhYmIubWF4KVxyXG4gICAgICAgICAgICBjb25zdCB0ID0gbWF0aC51bmxlcnAoYWFiYi5taW4ueCwgYWFiYi5tYXgueCwgbmVhcmVzdC54KVxyXG4gICAgICAgICAgICBjb25zdCByb3QgPSBnZW8uTWF0NC5yb3RhdGlvbloobWF0aC5sZXJwKC1NYXRoLlBJIC8gNCwgTWF0aC5QSSAvIDQsIHQpKVxyXG5cclxuICAgICAgICAgICAgLy8gY2hvb3NlIGEgcmFuZG9tIGRldmlhdGlvbiBmcm9tIHN0YW5kYXJkIHJlZmxlY3Rpb24gYW5nbGVcclxuICAgICAgICAgICAgdmVsb2NpdHkgPSByb3QudHJhbnNmb3JtMyh2ZWxvY2l0eSlcclxuICAgICAgICAgICAgdmVsb2NpdHkueiA9IDBcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gdmVsb2NpdHkubm9ybWFsaXplKCkubXVsWChiYWxsU3BlZWQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoYW5kbGUgYnJpY2sgaGl0XHJcbiAgICAgICAgY29uc3QgbmVhcmVzdEJyaWNrID0gdGhpcy5maW5kTmVhcmVzdEJyaWNrKGJhbGxQb3NpdGlvbiwgdGhpcy5iYWxsLnJhZGl1cylcclxuICAgICAgICBpZiAobmVhcmVzdEJyaWNrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFhYmIgPSBnZW8uQUFCQi5mcm9tUG9zaXRpb25IYWxmRXh0ZW50cyhuZWFyZXN0QnJpY2sucG9zaXRpb24sIEJyaWNrLmhhbGZFeHRlbnRzKVxyXG4gICAgICAgICAgICBjb25zdCBuZWFyZXN0UHQgPSB0aGlzLmZpbmROZWFyZXN0UG9pbnRPbkJyaWNrKG5lYXJlc3RCcmljaywgYmFsbFBvc2l0aW9uKVxyXG4gICAgICAgICAgICBsZXQgdmVsb2NpdHkgPSB0aGlzLmJhbGwudmVsb2NpdHlcclxuXHJcbiAgICAgICAgICAgIGlmIChuZWFyZXN0UHQueSA8PSBhYWJiLm1pbi55ICsgLjAxKSB7XHJcbiAgICAgICAgICAgICAgICB2ZWxvY2l0eS55ID0gLXZlbG9jaXR5LnlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG5lYXJlc3RQdC54IDw9IGFhYmIubWluLnggKyAuMDEpIHtcclxuICAgICAgICAgICAgICAgIHZlbG9jaXR5LnggPSAtdmVsb2NpdHkueFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobmVhcmVzdFB0LnggPj0gYWFiYi5tYXgueCAtIC4wMSkge1xyXG4gICAgICAgICAgICAgICAgdmVsb2NpdHkueCA9IC12ZWxvY2l0eS54XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChuZWFyZXN0UHQueSA+IGFhYmIubWF4LnkgLSAuMDEpIHtcclxuICAgICAgICAgICAgICAgIHZlbG9jaXR5LnkgPSAtdmVsb2NpdHkueVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB2ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKGJhbGxTcGVlZClcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5LnogPSAwXHJcbiAgICAgICAgICAgIHRoaXMuYnJpY2tzLmRlbGV0ZShuZWFyZXN0QnJpY2spXHJcbiAgICAgICAgICAgIHRoaXMucGxheUltcGFjdFNvdW5kKClcclxuXHJcbiAgICAgICAgICAgIC8vIGlmIG5vIGJyaWNrcywgbW92ZSB0byBuZXh0IGxldmVsXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJyaWNrcy5zaXplID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgICAgICAgICAgICAgIHRoaXMud2FpdChuZXh0TGV2ZWxNZXNzYWdlLCAoKSA9PiB0aGlzLm5leHRMZXZlbCgpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGlzIGJhbGwgZ29pbmcgdG8gY3Jvc3MgYm91bmRhcnk/XHJcbiAgICAgICAgaWYgKGJhbGxCb3VuZHMubWluLnggPCBib3VuZHMubWluLnggfHwgYmFsbEJvdW5kcy5tYXgueCA+IGJvdW5kcy5tYXgueCkge1xyXG4gICAgICAgICAgICBsZXQgdmVsb2NpdHkgPSB0aGlzLmJhbGwudmVsb2NpdHlcclxuICAgICAgICAgICAgdmVsb2NpdHkueCA9IC12ZWxvY2l0eS54XHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnogPSAwXHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eSA9IHZlbG9jaXR5Lm5vcm1hbGl6ZSgpLm11bFgoYmFsbFNwZWVkKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXlJbXBhY3RTb3VuZCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYmFsbEJvdW5kcy5tYXgueSA+IGJvdW5kcy5tYXgueSkge1xyXG4gICAgICAgICAgICBsZXQgdmVsb2NpdHkgPSB0aGlzLmJhbGwudmVsb2NpdHlcclxuICAgICAgICAgICAgdmVsb2NpdHkueSA9IC12ZWxvY2l0eS55XHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnogPSAwXHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eSA9IHZlbG9jaXR5Lm5vcm1hbGl6ZSgpLm11bFgoYmFsbFNwZWVkKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXlJbXBhY3RTb3VuZCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBiYWxsIG9mZiBib2FyZFxyXG4gICAgICAgIGlmIChiYWxsQm91bmRzLm1pbi55IDwgYm91bmRzLm1pbi55KSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgICAgICAgICB0aGlzLmJhbGwucG9zaXRpb24gPSBuZXcgZ2VvLlZlYzMoMCwgdGhpcy5wYWRkbGUucG9zaXRpb24ueSArIHRoaXMucGFkZGxlLmhhbGZFeHRlbnRzLnkgKyB0aGlzLmJhbGwucmFkaXVzLCB0aGlzLmJhbGwucmFkaXVzKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXlJbXBhY3RTb3VuZCgpXHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBHYW1lU3RhdGUuTGF1bmNoXHJcbiAgICAgICAgICAgIHRoaXMucGFkZGxlLnBvc2l0aW9uID0gbmV3IGdlby5WZWMzKDAsIHRoaXMuZmllbGRCb3R0b20gKyB0aGlzLnBhZGRsZS5oYWxmRXh0ZW50cy55ICsgcGFkZGxlQm90dG9tTWFyZ2luLCB0aGlzLnBhZGRsZS5oYWxmRXh0ZW50cy56KVxyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgICAgICAgICB0aGlzLmJhbGxzUmVtYWluaW5nLS1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJhbGxzUmVtYWluaW5nIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2FtZU92ZXIoKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY2xhbXAgeSB2ZWxvY2l0eSB0byBhdm9pZCBob3Jpem9udGFsIGFuZ2xlc1xyXG4gICAgICAgIGlmICh0aGlzLmJhbGwudmVsb2NpdHkubGVuZ3RoU3EoKSA+IDAgJiYgTWF0aC5hYnModGhpcy5iYWxsLnZlbG9jaXR5LnkpIDwgYmFsbFNwZWVkICogLjI1KSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eS55ID0gTWF0aC5zaWduKHRoaXMuYmFsbC52ZWxvY2l0eS55KSAqIGJhbGxTcGVlZCAqIC4yNVxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB0aGlzLmJhbGwudmVsb2NpdHkubm9ybWFsaXplKCkubXVsWChiYWxsU3BlZWQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2FtZU92ZXIoKSB7XHJcbiAgICAgICAgdGhpcy5iYWxsc1JlbWFpbmluZyA9IDNcclxuICAgICAgICB0aGlzLmxldmVsID0gMVxyXG4gICAgICAgIHRoaXMud2FpdChnYW1lT3Zlck1lc3NhZ2UsICgpID0+IHRoaXMuaW5pdExldmVsKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBuZXh0TGV2ZWwoKSB7XHJcbiAgICAgICAgdGhpcy5sZXZlbCsrXHJcbiAgICAgICAgdGhpcy5pbml0TGV2ZWwoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgd2FpdChtc2c6IHN0cmluZywgZjogKCkgPT4gdm9pZCkge1xyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IG1zZ1xyXG4gICAgICAgIHRoaXMuY29udGludWUgPSBmXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IEdhbWVTdGF0ZS5XYWl0XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBpbml0TGV2ZWwoKSB7XHJcbiAgICAgICAgdGhpcy5icmlja3MuY2xlYXIoKVxyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBHYW1lU3RhdGUuTGF1bmNoXHJcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gc3RhcnRNZXNzYWdlXHJcblxyXG4gICAgICAgIC8vIHBsYXlpbmcgZmllbGRcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl4bSA9IG5ldyBnZnguSXhNZXNoKClcclxuXHJcbiAgICAgICAgICAgIC8vIGZsb29yXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZsb29yID0gZ2Z4Lkl4TWVzaC5yZWN0RnJvbUNvb3Jkcyh0aGlzLmZpZWxkTGVmdCwgdGhpcy5maWVsZEJvdHRvbSwgLS4yNSwgdGhpcy5maWVsZFJpZ2h0LCB0aGlzLmZpZWxkVG9wLCAwKVxyXG4gICAgICAgICAgICAgICAgY29uc3QgZmxvb3JDb2xvciA9IHRoaXMubGV2ZWxEYXRhLmZsb29yQ29sb3JcclxuICAgICAgICAgICAgICAgIGZsb29yLnZlcnRpY2VzLmZvckVhY2godiA9PiB2LmNvbG9yID0gZmxvb3JDb2xvcilcclxuICAgICAgICAgICAgICAgIGl4bS5jYXQoZmxvb3IpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGJvcmRlclxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB3YWxscyA9IG5ldyBnZnguSXhNZXNoKClcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJvcmRlckNvbG9yID0gdGhpcy5sZXZlbERhdGEuYm9yZGVyQ29sb3JcclxuICAgICAgICAgICAgICAgIHdhbGxzLmNhdChnZnguSXhNZXNoLnJlY3RGcm9tQ29vcmRzKHRoaXMuZmllbGRMZWZ0IC0gYm9yZGVyV2lkdGgsIHRoaXMuZmllbGRCb3R0b20sIC0uMjUsIHRoaXMuZmllbGRMZWZ0LCB0aGlzLmZpZWxkVG9wLCAxKSlcclxuICAgICAgICAgICAgICAgIHdhbGxzLmNhdChnZnguSXhNZXNoLnJlY3RGcm9tQ29vcmRzKHRoaXMuZmllbGRSaWdodCwgdGhpcy5maWVsZEJvdHRvbSwgLS4yNSwgdGhpcy5maWVsZFJpZ2h0ICsgYm9yZGVyV2lkdGgsIHRoaXMuZmllbGRUb3AsIDEpKVxyXG4gICAgICAgICAgICAgICAgd2FsbHMuY2F0KGdmeC5JeE1lc2gucmVjdEZyb21Db29yZHModGhpcy5maWVsZExlZnQgLSBib3JkZXJXaWR0aCwgdGhpcy5maWVsZFRvcCwgLS4yNSwgdGhpcy5maWVsZFJpZ2h0ICsgYm9yZGVyV2lkdGgsIHRoaXMuZmllbGRUb3AgKyBib3JkZXJXaWR0aCwgMSkpXHJcbiAgICAgICAgICAgICAgICB3YWxscy52ZXJ0aWNlcy5mb3JFYWNoKHYgPT4gdi5jb2xvciA9IGJvcmRlckNvbG9yKVxyXG4gICAgICAgICAgICAgICAgaXhtLmNhdCh3YWxscylcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgdmFvID0gdGhpcy5yZW5kZXJlci5jcmVhdGVNZXNoKGl4bSlcclxuICAgICAgICAgICAgdGhpcy5maWVsZEJhdGNoID0gbmV3IGdmeC5CYXRjaCh7XHJcbiAgICAgICAgICAgICAgICB2YW86IHZhbyxcclxuICAgICAgICAgICAgICAgIG51bUluZGljZXM6IGl4bS5pbmRpY2VzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgIHJvdWdobmVzczogMVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYnJpY2tzXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCBicmlja0hhbGZXaWR0aCA9IGJyaWNrV2lkdGggLyAyXHJcbiAgICAgICAgICAgIGNvbnN0IGJyaWNrSGFsZkhlaWdodCA9IGJyaWNrSGVpZ2h0IC8gMlxyXG4gICAgICAgICAgICBjb25zdCBicmlja0hhbGZEZXB0aCA9IGJyaWNrRGVwdGggLyAyXHJcblxyXG4gICAgICAgICAgICBjb25zdCBmaWVsZFhPZmZzZXQgPSB0aGlzLmZpZWxkTGVmdCArIEJyaWNrLmhhbGZFeHRlbnRzLnhcclxuICAgICAgICAgICAgY29uc3QgZmllbGRZT2Zmc2V0ID0gdGhpcy5maWVsZFRvcCAtIHRvcFJvd01hcmdpbiAtIGJyaWNrSGVpZ2h0ICogdGhpcy5sZXZlbERhdGEuYnJpY2tSb3dzXHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubGV2ZWxEYXRhLmJyaWNrUm93czsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB5T2Zmc2V0ID0gZmllbGRZT2Zmc2V0ICsgaSAqIGJyaWNrSGVpZ2h0ICsgYnJpY2tNYXJnaW5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhpcy5sZXZlbERhdGEuYnJpY2tDb2xzOyArK2opIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB4T2Zmc2V0ID0gZmllbGRYT2Zmc2V0ICsgaiAqIChicmlja1dpZHRoICsgYnJpY2tNYXJnaW4pXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYnJpY2tNaW4gPSBuZXcgZ2VvLlZlYzMoLWJyaWNrSGFsZldpZHRoICsgYnJpY2tNYXJnaW4sIC1icmlja0hhbGZIZWlnaHQgKyBicmlja01hcmdpbiwgLWJyaWNrSGFsZkRlcHRoKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJyaWNrTWF4ID0gbmV3IGdlby5WZWMzKGJyaWNrSGFsZldpZHRoIC0gYnJpY2tNYXJnaW4sIGJyaWNrSGFsZkhlaWdodCAtIGJyaWNrTWFyZ2luLCBicmlja0hhbGZEZXB0aClcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhYWJiID0gbmV3IGdlby5BQUJCKGJyaWNrTWluLCBicmlja01heClcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpeG0gPSBnZnguSXhNZXNoLnJlY3QoYWFiYilcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9IG5ldyBnZW8uVmVjMyh4T2Zmc2V0LCB5T2Zmc2V0LCBicmlja0hhbGZEZXB0aClcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYnJpY2sgPSBuZXcgQnJpY2soe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhdGNoOiBuZXcgZ2Z4LkJhdGNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmxkTWF0cml4OiBnZW8uTWF0NC50cmFuc2xhdGlvbihwb3NpdGlvbiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmdXNlQ29sb3I6IHJhbmQuY2hvb3NlKGJyaWNrQ29sb3JzKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdWdobmVzczogLjgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YW86IHRoaXMucmVuZGVyZXIuY3JlYXRlTWVzaChpeG0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtSW5kaWNlczogaXhtLmluZGljZXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnJpY2tzLmFkZChicmljaylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYWRkIHBhZGRsZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc3Qgd2lkdGggPSB0aGlzLmxldmVsRGF0YS5wYWRkbGVXaWR0aFxyXG4gICAgICAgICAgICBjb25zdCBoYWxmRXh0ZW50cyA9IG5ldyBnZW8uVmVjMyh3aWR0aCAvIDIsIHBhZGRsZUhlaWdodCAvIDIsIHBhZGRsZURlcHRoIC8gMilcclxuICAgICAgICAgICAgY29uc3QgYWFiYiA9IGdlby5BQUJCLmZyb21IYWxmRXh0ZW50cyhoYWxmRXh0ZW50cylcclxuICAgICAgICAgICAgY29uc3QgaXhtID0gZ2Z4Lkl4TWVzaC5yZWN0KGFhYmIpXHJcbiAgICAgICAgICAgIGl4bS52ZXJ0aWNlcy5mb3JFYWNoKHYgPT4gdi5jb2xvciA9IG5ldyBnZW8uVmVjNCgwLCAxLCAxLCAxKSlcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHZhbyA9IHRoaXMucmVuZGVyZXIuY3JlYXRlTWVzaChpeG0pXHJcbiAgICAgICAgICAgIHRoaXMucGFkZGxlID0gbmV3IFBhZGRsZSh7XHJcbiAgICAgICAgICAgICAgICBoYWxmRXh0ZW50czogaGFsZkV4dGVudHMsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbmV3IGdlby5WZWMzKDAsIHRoaXMuZmllbGRCb3R0b20gKyBoYWxmRXh0ZW50cy55ICsgcGFkZGxlQm90dG9tTWFyZ2luLCBoYWxmRXh0ZW50cy56KSxcclxuICAgICAgICAgICAgICAgIGJhdGNoOiBuZXcgZ2Z4LkJhdGNoKHtcclxuICAgICAgICAgICAgICAgICAgICB2YW8sXHJcbiAgICAgICAgICAgICAgICAgICAgcm91Z2huZXNzOiAuNSxcclxuICAgICAgICAgICAgICAgICAgICBudW1JbmRpY2VzOiBpeG0uaW5kaWNlcy5sZW5ndGhcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhZGQgYmFsbFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc3QgcmFkaXVzID0gdGhpcy5sZXZlbERhdGEuYmFsbFJhZGl1c1xyXG4gICAgICAgICAgICBjb25zdCBpeG0gPSBnZnguSXhNZXNoLnNwaGVyZSgxNiwgMTYpXHJcbiAgICAgICAgICAgIGl4bS50cmFuc2Zvcm0oZ2VvLk1hdDQuc2NhbGluZyhuZXcgZ2VvLlZlYzMocmFkaXVzLCByYWRpdXMsIHJhZGl1cykpKVxyXG4gICAgICAgICAgICBpeG0udmVydGljZXMuZm9yRWFjaCh2ID0+IHYuY29sb3IgPSBuZXcgZ2VvLlZlYzQoMCwgMCwgMSwgMSkpXHJcblxyXG4gICAgICAgICAgICBjb25zdCB2YW8gPSB0aGlzLnJlbmRlcmVyLmNyZWF0ZU1lc2goaXhtKVxyXG4gICAgICAgICAgICB0aGlzLmJhbGwgPSBuZXcgQmFsbCh7XHJcbiAgICAgICAgICAgICAgICByYWRpdXM6IHJhZGl1cyxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBuZXcgZ2VvLlZlYzMoMCwgdGhpcy5wYWRkbGUucG9zaXRpb24ueSArIHRoaXMucGFkZGxlLmhhbGZFeHRlbnRzLnkgKyByYWRpdXMsIHJhZGl1cyksXHJcbiAgICAgICAgICAgICAgICBiYXRjaDogbmV3IGdmeC5CYXRjaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFvLFxyXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldDogMCxcclxuICAgICAgICAgICAgICAgICAgICByb3VnaG5lc3M6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgbnVtSW5kaWNlczogaXhtLmluZGljZXMubGVuZ3RoXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHBsYXlJbXBhY3RTb3VuZCgpOiB2b2lkIHtcclxuICAgICAgICBjb25zdCBzb3VuZCA9IHJhbmQuY2hvb3NlKHRoaXMuaW1wYWN0U291bmRzKVxyXG4gICAgICAgIGNvbnN0IHNyYyA9IHRoaXMuYWMuY3JlYXRlQnVmZmVyU291cmNlKClcclxuICAgICAgICBzcmMuYnVmZmVyID0gc291bmRcclxuICAgICAgICBzcmMuY29ubmVjdCh0aGlzLmFjLmRlc3RpbmF0aW9uKVxyXG4gICAgICAgIHNyYy5zdGFydCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmaW5kTmVhcmVzdFBvaW50T25CcmljayhicmljazogQnJpY2ssIHBvc2l0aW9uOiBnZW8uVmVjMyk6IGdlby5WZWMzIHtcclxuICAgICAgICBjb25zdCBhYWJiID0gZ2VvLkFBQkIuZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMoYnJpY2sucG9zaXRpb24sIEJyaWNrLmhhbGZFeHRlbnRzKVxyXG4gICAgICAgIGNvbnN0IG5lYXJlc3QgPSBwb3NpdGlvbi5jbGFtcChhYWJiLm1pbiwgYWFiYi5tYXgpXHJcbiAgICAgICAgcmV0dXJuIG5lYXJlc3RcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZpbmROZWFyZXN0QnJpY2socG9zaXRpb246IGdlby5WZWMzLCByYWRpdXM6IG51bWJlcik6IEJyaWNrIHwgbnVsbCB7XHJcbiAgICAgICAgY29uc3QgcjIgPSByYWRpdXMgKiByYWRpdXNcclxuICAgICAgICBsZXQgbWluRGlzdFNxID0gcjJcclxuICAgICAgICBsZXQgbmVhcmVzdEJyaWNrOiBCcmljayB8IG51bGwgPSBudWxsXHJcbiAgICAgICAgZm9yIChjb25zdCBicmljayBvZiB0aGlzLmJyaWNrcykge1xyXG4gICAgICAgICAgICBjb25zdCBuZWFyZXN0UHQgPSB0aGlzLmZpbmROZWFyZXN0UG9pbnRPbkJyaWNrKGJyaWNrLCBwb3NpdGlvbilcclxuICAgICAgICAgICAgY29uc3QgZGlzdFNxID0gbmVhcmVzdFB0LnN1Yihwb3NpdGlvbikubGVuZ3RoU3EoKVxyXG4gICAgICAgICAgICBpZiAoZGlzdFNxIDwgbWluRGlzdFNxKSB7XHJcbiAgICAgICAgICAgICAgICBuZWFyZXN0QnJpY2sgPSBicmlja1xyXG4gICAgICAgICAgICAgICAgbWluRGlzdFNxID0gZGlzdFNxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBuZWFyZXN0QnJpY2tcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZVdvcmxkTWF0cmljZXMoKSB7XHJcbiAgICAgICAgdGhpcy5iYWxsLmJhdGNoLndvcmxkTWF0cml4ID0gZ2VvLk1hdDQudHJhbnNsYXRpb24odGhpcy5iYWxsLnBvc2l0aW9uKVxyXG4gICAgICAgIHRoaXMucGFkZGxlLmJhdGNoLndvcmxkTWF0cml4ID0gZ2VvLk1hdDQudHJhbnNsYXRpb24odGhpcy5wYWRkbGUucG9zaXRpb24pXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkcmF3U2NlbmUoKSB7XHJcbiAgICAgICAgLy8gY29uZmlndXJlIGNhbWVyYSAtIGZpdCBwbGF5IGFyZWEgdG8gc2NyZWVuIHdpdGggc29tZSBzbWFsbCBtYXJnaW5cclxuICAgICAgICBsZXQgeiA9IDBcclxuICAgICAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmZpZWxkVG9wIC0gdGhpcy5maWVsZEJvdHRvbSArIGJvcmRlcldpZHRoICogMlxyXG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5maWVsZFJpZ2h0IC0gdGhpcy5maWVsZExlZnQgKyBib3JkZXJXaWR0aCAqIDJcclxuICAgICAgICBjb25zdCBmaWVsZEFzcGVjdCA9IHdpZHRoIC8gaGVpZ2h0XHJcbiAgICAgICAgaWYgKGZpZWxkQXNwZWN0IDwgdGhpcy5yZW5kZXJlci5hc3BlY3QpIHtcclxuICAgICAgICAgICAgeiA9IGhlaWdodCAvIDIgLyBNYXRoLnRhbih0aGlzLnJlbmRlcmVyLmZvdiAvIDIpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgeiA9IHdpZHRoIC8gMiAvIE1hdGgudGFuKHRoaXMucmVuZGVyZXIuZm92ICogdGhpcy5yZW5kZXJlci5hc3BlY3QgLyAyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIudmlld01hdHJpeCA9IGdlby5NYXQ0Lmxvb2tBdChcclxuICAgICAgICAgICAgbmV3IGdlby5WZWMzKDAsIDAsIDEgKyB6KSwgbmV3IGdlby5WZWMzKDAsIDAsIC0xKSwgbmV3IGdlby5WZWMzKDAsIDEsIDApKS5pbnZlcnQoKVxyXG5cclxuICAgICAgICAvLyBzaG93IGZyb20gc2lkZSB2aWV3IGZvciBkZWJ1Z2dpbmdcclxuICAgICAgICAvLyB0aGlzLnJlbmRlcmVyLnZpZXdNYXRyaXggPSBnZW8uTWF0NC5sb29rQXQoXHJcbiAgICAgICAgLy8gICAgIG5ldyBnZW8uVmVjMygwLCAtMTYsIDApLCBuZXcgZ2VvLlZlYzMoMCwgMSwgMCksIG5ldyBnZW8uVmVjMygwLCAwLCAxKSkuaW52ZXJ0KClcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3QmF0Y2godGhpcy5maWVsZEJhdGNoKVxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd0JhdGNoKHRoaXMuYmFsbC5iYXRjaClcclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdCYXRjaCh0aGlzLnBhZGRsZS5iYXRjaClcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBicmljayBvZiB0aGlzLmJyaWNrcykge1xyXG4gICAgICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdCYXRjaChicmljay5iYXRjaClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIucHJlc2VudCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYW52YXNUb05EQyhjYzogZ2VvLlZlYzIpOiBnZW8uVmVjMiB7XHJcbiAgICAgICAgY29uc3QgbmRjID0gbmV3IGdlby5WZWMyKFxyXG4gICAgICAgICAgICBjYy54IC8gdGhpcy5jYW52YXMud2lkdGggKiAyIC0gMSxcclxuICAgICAgICAgICAgLWNjLnkgLyB0aGlzLmNhbnZhcy5oZWlnaHQgKiAyICsgMVxyXG4gICAgICAgIClcclxuXHJcbiAgICAgICAgcmV0dXJuIG5kY1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FudmFzVG9ORENSYXkoY2M6IGdlby5WZWMyKTogZ2VvLlJheSB7XHJcbiAgICAgICAgY29uc3QgbmRjID0gdGhpcy5jYW52YXNUb05EQyhjYylcclxuICAgICAgICBjb25zdCByYXkgPSBuZXcgZ2VvLlJheShuZXcgZ2VvLlZlYzMobmRjLngsIG5kYy55LCAtMSksIG5ldyBnZW8uVmVjMygwLCAwLCAxKSlcclxuICAgICAgICByZXR1cm4gcmF5XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYW52YXNUb1dvcmxkUmF5KGNjOiBnZW8uVmVjMik6IGdlby5SYXkge1xyXG4gICAgICAgIGNvbnN0IG5kY1JheSA9IHRoaXMuY2FudmFzVG9ORENSYXkoY2MpXHJcbiAgICAgICAgY29uc3QgaW52UHJvaiA9IHRoaXMucmVuZGVyZXIucHJvamVjdGlvbk1hdHJpeC5pbnZlcnQoKVxyXG4gICAgICAgIGNvbnN0IGludlZpZXcgPSB0aGlzLnJlbmRlcmVyLnZpZXdNYXRyaXguaW52ZXJ0KClcclxuICAgICAgICBjb25zdCBpbnZWaWV3UHJvaiA9IHRoaXMucmVuZGVyZXIucHJvamVjdGlvbk1hdHJpeC5tYXRtdWwodGhpcy5yZW5kZXJlci52aWV3TWF0cml4KS5pbnZlcnQoKVxyXG4gICAgICAgIGNvbnN0IHZpZXdSYXkgPSBuZGNSYXkudHJhbnNmb3JtKGludlByb2opXHJcbiAgICAgICAgY29uc3Qgd29ybGRSYXkgPSB2aWV3UmF5LnRyYW5zZm9ybShpbnZWaWV3KVxyXG5cclxuICAgICAgICBpZiAodGhpcy5pbnAubW91c2VMZWZ0UmVsZWFzZWQpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJjYzogXCIsIGNjLnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibmRjOiBcIiwgbmRjUmF5LnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidmlldzogXCIsIHZpZXdSYXkudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ3b3JsZDogXCIsIHdvcmxkUmF5LnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid29ybGQyOiBcIiwgbmRjUmF5LnRyYW5zZm9ybShpbnZWaWV3UHJvaikudG9TdHJpbmcoKSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB3b3JsZFJheVxyXG4gICAgfVxyXG59XHJcblxyXG5jb25zdCBhcHAgPSBuZXcgQXBwKClcclxuYXBwLmV4ZWMoKVxyXG4iXX0=