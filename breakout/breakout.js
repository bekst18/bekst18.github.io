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
        this.velocity = (_b = (_a = options.velocity) === null || _a === void 0 ? void 0 : _a.clone(), (_b !== null && _b !== void 0 ? _b : new geo.Vec3(0, 0, 0)));
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
        this.velocity = (_b = (_a = options.velocity) === null || _a === void 0 ? void 0 : _a.clone(), (_b !== null && _b !== void 0 ? _b : new geo.Vec3(0, 0, 0)));
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
        return _a = this.messageDiv.textContent, (_a !== null && _a !== void 0 ? _a : "");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtvdXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJicmVha291dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQixNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUE7QUFDcEIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFBO0FBQ3JCLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQTtBQUNyQixNQUFNLFlBQVksR0FBRyxFQUFFLENBQUE7QUFDdkIsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFBO0FBQ3RCLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQTtBQUN0QixNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFDckIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFBO0FBQ3RCLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQTtBQUN2QixNQUFNLGtCQUFrQixHQUFHLENBQUMsQ0FBQTtBQUU1QixNQUFNLFlBQVksR0FBRyw4Q0FBOEMsQ0FBQTtBQUNuRSxNQUFNLGVBQWUsR0FBRyxxREFBcUQsQ0FBQTtBQUM3RSxNQUFNLGdCQUFnQixHQUFHLHVEQUF1RCxDQUFBO0FBWWhGLE1BQU0sTUFBTSxHQUFHLElBQUksS0FBSztBQUNwQixVQUFVO0FBQ1Y7SUFDSSxTQUFTLEVBQUUsRUFBRTtJQUNiLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzdDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsQ0FBQztJQUNiLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQ3pDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEdBQUc7SUFDZCxVQUFVLEVBQUUsR0FBRztJQUNmLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ3ZDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ3pDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEdBQUc7SUFDZCxVQUFVLEVBQUUsR0FBRztJQUNmLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzdDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxDQUFDO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3JDLFVBQVUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0NBQzFDO0FBQ0QsVUFBVTtBQUNWO0lBQ0ksU0FBUyxFQUFFLEVBQUU7SUFDYixVQUFVLEVBQUUsRUFBRTtJQUNkLFdBQVcsRUFBRSxHQUFHO0lBQ2hCLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUM3QztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxHQUFHO0lBQ2QsVUFBVSxFQUFFLEdBQUc7SUFDZixXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN2QyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUMzQztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxFQUFFO0lBQ2IsVUFBVSxFQUFFLEVBQUU7SUFDZCxXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztDQUM3QztBQUNELFVBQVU7QUFDVjtJQUNJLFNBQVMsRUFBRSxFQUFFO0lBQ2IsVUFBVSxFQUFFLEVBQUU7SUFDZCxXQUFXLEVBQUUsQ0FBQztJQUNkLFNBQVMsRUFBRSxDQUFDO0lBQ1osU0FBUyxFQUFFLEVBQUU7SUFDYixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyQyxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztDQUMxQyxDQUNKLENBQUE7QUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLEtBQUssQ0FDekIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3hCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3hCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUMxQixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQzFCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDMUIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM1QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQzVCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFF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TSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDekMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1NBQ3BFO1FBRUQsT0FBTyxRQUFRLENBQUE7SUFDbkIsQ0FBQztDQUNKO0FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQTtBQUNyQixHQUFHLENBQUMsSUFBSSxFQUFFLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBkb20gZnJvbSBcIi4uL3NoYXJlZC9kb20uanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8zZC5qc1wiXHJcbmltcG9ydCAqIGFzIGlucHV0IGZyb20gXCIuLi9zaGFyZWQvaW5wdXQuanNcIlxyXG5pbXBvcnQgKiBhcyByYW5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiXHJcbmltcG9ydCAqIGFzIG1hdGggZnJvbSBcIi4uL3NoYXJlZC9tYXRoLmpzXCJcclxuaW1wb3J0ICogYXMgYXVkaW8gZnJvbSBcIi4uL3NoYXJlZC9hdWRpby5qc1wiXHJcbmltcG9ydCAqIGFzIGdmeCBmcm9tIFwiLi9nZnguanNcIlxyXG5cclxuY29uc3QgYnJpY2tXaWR0aCA9IDJcclxuY29uc3QgYnJpY2tIZWlnaHQgPSAxXHJcbmNvbnN0IGJyaWNrRGVwdGggPSAuNVxyXG5jb25zdCBwYWRkbGVIZWlnaHQgPSAuNVxyXG5jb25zdCBwYWRkbGVEZXB0aCA9IC41XHJcbmNvbnN0IHBhZGRsZVNwZWVkID0gLjVcclxuY29uc3QgYm9yZGVyV2lkdGggPSAxXHJcbmNvbnN0IHRvcFJvd01hcmdpbiA9IDFcclxuY29uc3QgYnJpY2tNYXJnaW4gPSAuMDVcclxuY29uc3QgcGFkZGxlQm90dG9tTWFyZ2luID0gMVxyXG5cclxuY29uc3Qgc3RhcnRNZXNzYWdlID0gXCJUYXAsIGNsaWNrLCBvciBwcmVzcyBhbnkga2V5IHRvIGxhdW5jaCBiYWxsLlwiXHJcbmNvbnN0IGdhbWVPdmVyTWVzc2FnZSA9IFwiR2FtZSBvdmVyISBUYXAsIGNsaWNrLCBvciBwcmVzcyBhbnkga2V5IHRvIHJlc3RhcnQuXCJcclxuY29uc3QgbmV4dExldmVsTWVzc2FnZSA9IFwiTGV2ZWwgQ2xlYXIhIFRhcCwgY2xpY2ssIG9yIHByZXNzIGFueSBrZXkgdG8gYWR2YW5jZS5cIlxyXG5cclxuaW50ZXJmYWNlIExldmVsRGF0YSB7XHJcbiAgICBiYWxsU3BlZWQ6IG51bWJlclxyXG4gICAgYmFsbFJhZGl1czogbnVtYmVyXHJcbiAgICBwYWRkbGVXaWR0aDogbnVtYmVyXHJcbiAgICBicmlja1Jvd3M6IG51bWJlclxyXG4gICAgYnJpY2tDb2xzOiBudW1iZXJcclxuICAgIGJvcmRlckNvbG9yOiBnZW8uVmVjNFxyXG4gICAgZmxvb3JDb2xvcjogZ2VvLlZlYzRcclxufVxyXG5cclxuY29uc3QgbGV2ZWxzID0gbmV3IEFycmF5PExldmVsRGF0YT4oXHJcbiAgICAvLyBsZXZlbCAxXHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuMixcclxuICAgICAgICBiYWxsUmFkaXVzOiAxLjI1LFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiA2LFxyXG4gICAgICAgIGJyaWNrUm93czogMyxcclxuICAgICAgICBicmlja0NvbHM6IDcsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCguMjUsIDAsIDAsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCguMjUsIC4yNSwgLjI1LCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDJcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC4zLFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IDEsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDYsXHJcbiAgICAgICAgYnJpY2tSb3dzOiAzLFxyXG4gICAgICAgIGJyaWNrQ29sczogNyxcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KDAsIC4yNSwgMCwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KDAsIDAsIC4yNSwgMSlcclxuICAgIH0sXHJcbiAgICAvLyBsZXZlbCAzXHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuMzUsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjc1LFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiA2LFxyXG4gICAgICAgIGJyaWNrUm93czogMyxcclxuICAgICAgICBicmlja0NvbHM6IDUsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAwLCAuNTUsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAwLCAwLCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDRcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC40LFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC42LFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiA1LFxyXG4gICAgICAgIGJyaWNrUm93czogMyxcclxuICAgICAgICBicmlja0NvbHM6IDYsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCguNiwgLjUsIDAsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCgwLCAuMjUsIDAsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgNVxyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjQ1LFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC41NSxcclxuICAgICAgICBwYWRkbGVXaWR0aDogNCxcclxuICAgICAgICBicmlja1Jvd3M6IDMsXHJcbiAgICAgICAgYnJpY2tDb2xzOiA4LFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoMCwgLjUsIC42LCAxKSxcclxuICAgICAgICBmbG9vckNvbG9yOiBuZXcgZ2VvLlZlYzQoLjI1LCAuMjUsIC4yNSwgMSlcclxuICAgIH0sXHJcbiAgICAvLyBsZXZlbCA2XHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuNSxcclxuICAgICAgICBiYWxsUmFkaXVzOiAuNSxcclxuICAgICAgICBwYWRkbGVXaWR0aDogNCxcclxuICAgICAgICBicmlja1Jvd3M6IDQsXHJcbiAgICAgICAgYnJpY2tDb2xzOiA4LFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoMSwgMCwgMCwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KDAsIC4zLCAuMjUsIDEpXHJcbiAgICB9LFxyXG4gICAgLy8gbGV2ZWwgN1xyXG4gICAge1xyXG4gICAgICAgIGJhbGxTcGVlZDogLjYsXHJcbiAgICAgICAgYmFsbFJhZGl1czogLjQsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDMuNSxcclxuICAgICAgICBicmlja1Jvd3M6IDQsXHJcbiAgICAgICAgYnJpY2tDb2xzOiAxMCxcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KDEsIDEsIDAsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCguMjUsIC4yNSwgLjI1LCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDhcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC42NSxcclxuICAgICAgICBiYWxsUmFkaXVzOiAuMzUsXHJcbiAgICAgICAgcGFkZGxlV2lkdGg6IDMsXHJcbiAgICAgICAgYnJpY2tSb3dzOiA1LFxyXG4gICAgICAgIGJyaWNrQ29sczogMTAsXHJcbiAgICAgICAgYm9yZGVyQ29sb3I6IG5ldyBnZW8uVmVjNCguNSwgLjYsIDEsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCguMjUsIDAsIC4yNSwgMSlcclxuICAgIH0sXHJcbiAgICAvLyBsZXZlbCA5XHJcbiAgICB7XHJcbiAgICAgICAgYmFsbFNwZWVkOiAuNyxcclxuICAgICAgICBiYWxsUmFkaXVzOiAuMyxcclxuICAgICAgICBwYWRkbGVXaWR0aDogMixcclxuICAgICAgICBicmlja1Jvd3M6IDYsXHJcbiAgICAgICAgYnJpY2tDb2xzOiAxMixcclxuICAgICAgICBib3JkZXJDb2xvcjogbmV3IGdlby5WZWM0KDAsIDEsIDEsIDEpLFxyXG4gICAgICAgIGZsb29yQ29sb3I6IG5ldyBnZW8uVmVjNCguMzUsIC4xNSwgLjI1LCAxKVxyXG4gICAgfSxcclxuICAgIC8vIGxldmVsIDlcclxuICAgIHtcclxuICAgICAgICBiYWxsU3BlZWQ6IC44LFxyXG4gICAgICAgIGJhbGxSYWRpdXM6IC4yLFxyXG4gICAgICAgIHBhZGRsZVdpZHRoOiAxLFxyXG4gICAgICAgIGJyaWNrUm93czogOCxcclxuICAgICAgICBicmlja0NvbHM6IDE1LFxyXG4gICAgICAgIGJvcmRlckNvbG9yOiBuZXcgZ2VvLlZlYzQoMSwgMSwgMSwgMSksXHJcbiAgICAgICAgZmxvb3JDb2xvcjogbmV3IGdlby5WZWM0KC4xLCAuMSwgLjQsIDEpXHJcbiAgICB9LFxyXG4pXHJcblxyXG5jb25zdCBicmlja0NvbG9ycyA9IG5ldyBBcnJheTxnZW8uVmVjND4oXHJcbiAgICBuZXcgZ2VvLlZlYzQoMSwgMCwgMCwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMCwgMSwgMCwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMCwgMCwgMSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMCwgMSwgMSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMSwgMCwgMSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMSwgMSwgMSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoLjUsIC41LCAwLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgwLCAuNSwgLjUsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KC41LCAwLCAuNSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoLjI1LCAuNzUsIDAsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDAsIC4yNSwgLjc1LCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCguMjUsIDAsIC43NSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoLjc1LCAuMjUsIDAsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDAsIC43NSwgLjI1LCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCguNzUsIDAsIC4yNSwgMSksXHJcbilcclxuXHJcbmludGVyZmFjZSBQYWRkbGVPcHRpb25zIHtcclxuICAgIGhhbGZFeHRlbnRzOiBnZW8uVmVjM1xyXG4gICAgcG9zaXRpb246IGdlby5WZWMzXHJcbiAgICBiYXRjaDogZ2Z4LkJhdGNoXHJcbiAgICB2ZWxvY2l0eT86IGdlby5WZWMzXHJcbn1cclxuXHJcbmNsYXNzIFBhZGRsZSB7XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgaGFsZkV4dGVudHM6IGdlby5WZWMzXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgYmF0Y2ggPSBuZXcgZ2Z4LkJhdGNoKClcclxuICAgIHBvc2l0aW9uID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICB2ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFBhZGRsZU9wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLmhhbGZFeHRlbnRzID0gb3B0aW9ucy5oYWxmRXh0ZW50cy5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy5iYXRjaCA9IG9wdGlvbnMuYmF0Y2hcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbi5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy52ZWxvY2l0eSA9IG9wdGlvbnMudmVsb2NpdHk/LmNsb25lKCkgPz8gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSBCcmlja09wdGlvbnMge1xyXG4gICAgcG9zaXRpb246IGdlby5WZWMzXHJcbiAgICBiYXRjaDogZ2Z4LkJhdGNoXHJcbn1cclxuXHJcbmNsYXNzIEJyaWNrIHtcclxuICAgIHB1YmxpYyByZWFkb25seSBiYXRjaCA9IG5ldyBnZnguQmF0Y2goKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IHBvc2l0aW9uID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICBzdGF0aWMgcmVhZG9ubHkgaGFsZkV4dGVudHMgPSBuZXcgZ2VvLlZlYzMoYnJpY2tXaWR0aCAvIDIgLSBicmlja01hcmdpbiwgYnJpY2tIZWlnaHQgLyAyIC0gYnJpY2tNYXJnaW4sIGJyaWNrRGVwdGggLyAyKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEJyaWNrT3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uLmNsb25lKClcclxuICAgICAgICB0aGlzLmJhdGNoID0gb3B0aW9ucy5iYXRjaFxyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgQmFsbE9wdGlvbnMge1xyXG4gICAgcmFkaXVzOiBudW1iZXJcclxuICAgIHBvc2l0aW9uOiBnZW8uVmVjM1xyXG4gICAgYmF0Y2g6IGdmeC5CYXRjaFxyXG4gICAgdmVsb2NpdHk/OiBnZW8uVmVjM1xyXG59XHJcblxyXG5jbGFzcyBCYWxsIHtcclxuICAgIHJhZGl1czogbnVtYmVyID0gMVxyXG4gICAgcG9zaXRpb246IGdlby5WZWMzXHJcbiAgICBiYXRjaDogZ2Z4LkJhdGNoXHJcbiAgICB2ZWxvY2l0eTogZ2VvLlZlYzNcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBCYWxsT3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMucmFkaXVzID0gb3B0aW9ucy5yYWRpdXNcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbi5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy5iYXRjaCA9IG9wdGlvbnMuYmF0Y2hcclxuICAgICAgICB0aGlzLnZlbG9jaXR5ID0gb3B0aW9ucy52ZWxvY2l0eT8uY2xvbmUoKSA/PyBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgIH1cclxufVxyXG5cclxuZW51bSBHYW1lU3RhdGUge1xyXG4gICAgUGxheSxcclxuICAgIExhdW5jaCxcclxuICAgIFdhaXRcclxufVxyXG5cclxuLy8gc3RlcCAxIC0gY2xlYXIgc2NyZWVuLCBpbml0IGdsLCBldGMuLi5cclxuLy8gc3RlcCAyIC0gZHJhdyBhIGNsaXAgc3BhY2UgdHJpYW5nbGVcclxuLy8gc3RlcCAzIC0gZHJhdyBhIHdvcmxkIHNwYWNlIHRyaWFuZ2xlXHJcbmNsYXNzIEFwcCB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxldmVsU3BhbiA9IGRvbS5ieUlkKFwibGV2ZWxcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYmFsbHNSZW1haW5pbmdTcGFuID0gZG9tLmJ5SWQoXCJiYWxsc1JlbWFpbmluZ1wiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtZXNzYWdlRGl2ID0gZG9tLmJ5SWQoXCJtZXNzYWdlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJlbmRlcmVyID0gbmV3IGdmeC5SZW5kZXJlcih0aGlzLmNhbnZhcylcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW5wID0gbmV3IGlucHV0LklucHV0KHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSBmaWVsZEJhdGNoOiBnZnguQmF0Y2ggPSBuZXcgZ2Z4LkJhdGNoKClcclxuICAgIHByaXZhdGUgcGFkZGxlITogUGFkZGxlXHJcbiAgICBwcml2YXRlIGJhbGwhOiBCYWxsXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGJyaWNrcyA9IG5ldyBTZXQ8QnJpY2s+KClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYWMgPSBuZXcgQXVkaW9Db250ZXh0KClcclxuICAgIHByaXZhdGUgaW1wYWN0U291bmRzID0gbmV3IEFycmF5PEF1ZGlvQnVmZmVyPigpXHJcbiAgICBwcml2YXRlIGJhbGxzUmVtYWluaW5nID0gM1xyXG4gICAgcHJpdmF0ZSBsZXZlbCA9IDFcclxuICAgIHByaXZhdGUgc3RhdGUgPSBHYW1lU3RhdGUuTGF1bmNoXHJcbiAgICBwcml2YXRlIGNvbnRpbnVlID0gKCkgPT4geyB9XHJcblxyXG4gICAgYXN5bmMgZXhlYygpIHtcclxuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBzdGFydE1lc3NhZ2VcclxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgKCkgPT4gdGhpcy5oYW5kbGVLZXlVcCgpKVxyXG5cclxuICAgICAgICB0aGlzLmluaXRMZXZlbCgpXHJcbiAgICAgICAgYXdhaXQgdGhpcy5pbml0QXVkaW8oKVxyXG4gICAgICAgIHRoaXMuY2FudmFzLmZvY3VzKClcclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy50aWNrKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBpbml0QXVkaW8oKSB7XHJcbiAgICAgICAgY29uc3QgbnVtSW1wYWN0U291bmRzID0gMTVcclxuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8PSBudW1JbXBhY3RTb3VuZHM7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCB1cmwgPSBgLi9hc3NldHMvaW1wYWN0JHtpfS53YXZgXHJcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IGF1ZGlvLmxvYWRBdWRpbyh0aGlzLmFjLCB1cmwpXHJcbiAgICAgICAgICAgIHRoaXMuaW1wYWN0U291bmRzLnB1c2goYnVmZmVyKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHRpY2soKSB7XHJcbiAgICAgICAgdGhpcy5jaGVja1NpemUoKVxyXG4gICAgICAgIHRoaXMudXBkYXRlKClcclxuICAgICAgICB0aGlzLmRyYXdTY2VuZSgpXHJcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMudGljaygpKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2hlY2tTaXplKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNhbnZhcy53aWR0aCA9PT0gdGhpcy5jYW52YXMuY2xpZW50V2lkdGggJiYgdGhpcy5jYW52YXMuaGVpZ2h0ID09PSB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGUoKSB7XHJcbiAgICAgICAgdGhpcy5wYWRkbGUucG9zaXRpb24gPSB0aGlzLnBhZGRsZS5wb3NpdGlvbi5hZGQodGhpcy5wYWRkbGUudmVsb2NpdHkpXHJcbiAgICAgICAgdGhpcy5iYWxsLnBvc2l0aW9uID0gdGhpcy5iYWxsLnBvc2l0aW9uLmFkZCh0aGlzLmJhbGwudmVsb2NpdHkpXHJcbiAgICAgICAgdGhpcy5oYW5kbGVJbnB1dCgpXHJcbiAgICAgICAgdGhpcy5oYW5kbGVDb2xsaXNpb24oKVxyXG4gICAgICAgIHRoaXMudXBkYXRlV29ybGRNYXRyaWNlcygpXHJcbiAgICAgICAgdGhpcy51cGRhdGVVSSgpXHJcbiAgICAgICAgdGhpcy5pbnAuZmx1c2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlVUkoKSB7XHJcbiAgICAgICAgdGhpcy5iYWxsc1JlbWFpbmluZ1NwYW4udGV4dENvbnRlbnQgPSB0aGlzLmJhbGxzUmVtYWluaW5nLnRvU3RyaW5nKClcclxuICAgICAgICB0aGlzLmxldmVsU3Bhbi50ZXh0Q29udGVudCA9IHRoaXMubGV2ZWwudG9TdHJpbmcoKVxyXG5cclxuICAgICAgICBpZiAodGhpcy5tZXNzYWdlKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IGxldmVsRGF0YSgpOiBMZXZlbERhdGEge1xyXG4gICAgICAgIGNvbnN0IGRhdGEgPSBsZXZlbHNbTWF0aC5taW4odGhpcy5sZXZlbCAtIDEsIGxldmVscy5sZW5ndGggLSAxKV1cclxuICAgICAgICByZXR1cm4gZGF0YVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IGZpZWxkV2lkdGgoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gYnJpY2tXaWR0aCAqIHRoaXMubGV2ZWxEYXRhLmJyaWNrQ29sc1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IGZpZWxkSGVpZ2h0KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIGJyaWNrSGVpZ2h0ICogdGhpcy5sZXZlbERhdGEuYnJpY2tSb3dzICogNCArIHRvcFJvd01hcmdpblxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IGZpZWxkTGVmdCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiAtdGhpcy5maWVsZFdpZHRoIC8gMlxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IGZpZWxkUmlnaHQoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5maWVsZExlZnQgKyB0aGlzLmZpZWxkV2lkdGhcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBmaWVsZEJvdHRvbSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiAtdGhpcy5maWVsZEhlaWdodCAvIDJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBmaWVsZFRvcCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZpZWxkQm90dG9tICsgdGhpcy5maWVsZEhlaWdodFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IG1lc3NhZ2UoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tZXNzYWdlRGl2LnRleHRDb250ZW50ID8/IFwiXCJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNldCBtZXNzYWdlKHRleHQ6IHN0cmluZykge1xyXG4gICAgICAgIHRoaXMubWVzc2FnZURpdi50ZXh0Q29udGVudCA9IHRleHRcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUtleVVwKCkge1xyXG4gICAgICAgIGlmICh0aGlzLnN0YXRlID09PSBHYW1lU3RhdGUuUGxheSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnN0YXRlID09PSBHYW1lU3RhdGUuV2FpdCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRpbnVlKClcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmxhdW5jaEJhbGwoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlSW5wdXQoKSB7XHJcbiAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgR2FtZVN0YXRlLkxhdW5jaDpcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlSW5wdXRMYXVuY2goKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgR2FtZVN0YXRlLlBsYXk6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUlucHV0UGxheSgpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG5cclxuICAgICAgICAgICAgY2FzZSBHYW1lU3RhdGUuV2FpdDpcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlSW5wdXRXYWl0KClcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlSW5wdXRMYXVuY2goKTogdm9pZCB7XHJcbiAgICAgICAgLy8gc3RhcnQgZ2FtZSBvbiBtb3VzZSBjaWNrXHJcbiAgICAgICAgaWYgKHRoaXMuaW5wLm1vdXNlTGVmdFByZXNzZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5sYXVuY2hCYWxsKClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVJbnB1dFBsYXkoKSB7XHJcbiAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuXHJcbiAgICAgICAgLy8gbW91c2UgLyB0b3VjaCBwYWRkbGUgbW92ZW1lbnRcclxuICAgICAgICBpZiAodGhpcy5pbnAubW91c2VMZWZ0RG93bikge1xyXG4gICAgICAgICAgICBjb25zdCB3b3JsZE1vdXNlUmF5ID0gdGhpcy5jYW52YXNUb1dvcmxkUmF5KG5ldyBnZW8uVmVjMih0aGlzLmlucC5tb3VzZVgsIHRoaXMuaW5wLm1vdXNlWSkpXHJcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkUGxhbmUgPSBnZW8uUGxhbmUuZnJvbVBvaW50Tm9ybWFsKHRoaXMucGFkZGxlLnBvc2l0aW9uLCBuZXcgZ2VvLlZlYzMoMCwgMCwgMSkpXHJcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkSXggPSB3b3JsZE1vdXNlUmF5LmxlcnAod29ybGRNb3VzZVJheS5jYXN0KGZpZWxkUGxhbmUpKVxyXG4gICAgICAgICAgICBpZiAoZmllbGRJeC54ID4gdGhpcy5wYWRkbGUucG9zaXRpb24ueCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoMSwgMCwgMClcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChmaWVsZEl4LnggPCB0aGlzLnBhZGRsZS5wb3NpdGlvbi54KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygtMSwgMCwgMClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8ga2V5Ym9hcmQgcGFkZGxlIG1vdmVtZW50XHJcbiAgICAgICAgaWYgKHRoaXMuaW5wLmRvd24oXCJhXCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKC0xLCAwLCAwKVxyXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pbnAuZG93bihcImRcIikpIHtcclxuICAgICAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoMSwgMCwgMClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnBhZGRsZS52ZWxvY2l0eS5sZW5ndGhTcSgpID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IHRoaXMucGFkZGxlLnZlbG9jaXR5Lm5vcm1hbGl6ZSgpLm11bFgocGFkZGxlU3BlZWQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlSW5wdXRXYWl0KCkge1xyXG4gICAgICAgIGlmICh0aGlzLmlucC5tb3VzZUxlZnREb3duKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGludWUoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGxhdW5jaEJhbGwoKSB7XHJcbiAgICAgICAgLy8gY2hvb3NlIHJhbmRvbSB1cHdhcmQgbGF1bmNoIGRpcmVjdGlvblxyXG4gICAgICAgIGNvbnN0IHJvdCA9IGdlby5NYXQzLnJvdGF0aW9uWihyYW5kLmZsb2F0KC1NYXRoLlBJIC8gNCwgTWF0aC5QSSAvIDQpKVxyXG4gICAgICAgIGNvbnN0IHYgPSByb3QudHJhbnNmb3JtKG5ldyBnZW8uVmVjMygwLCAxLCAwKSkubm9ybWFsaXplKClcclxuICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB2Lm11bFgodGhpcy5sZXZlbERhdGEuYmFsbFNwZWVkKVxyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBHYW1lU3RhdGUuUGxheVxyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IFwiXCJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUNvbGxpc2lvbigpIHtcclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gR2FtZVN0YXRlLlBsYXkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpcyBwYWRkbGUgZ29pbmcgdG8gY3Jvc3MgYm91bmRhcnk/XHJcbiAgICAgICAgY29uc3QgYm91bmRzID0gZ2VvLkFBQkIuZnJvbUNvb3JkcyhcclxuICAgICAgICAgICAgdGhpcy5maWVsZExlZnQsIHRoaXMuZmllbGRCb3R0b20sIC0xLFxyXG4gICAgICAgICAgICB0aGlzLmZpZWxkUmlnaHQsIHRoaXMuZmllbGRUb3AsIDEpXHJcblxyXG4gICAgICAgIGNvbnN0IHBhZGRsZVBvc2l0aW9uID0gdGhpcy5wYWRkbGUucG9zaXRpb24uYWRkKHRoaXMucGFkZGxlLnZlbG9jaXR5KVxyXG4gICAgICAgIGNvbnN0IHBhZGRsZUJvdW5kcyA9IGdlby5BQUJCLmZyb21Qb3NpdGlvbkhhbGZFeHRlbnRzKHBhZGRsZVBvc2l0aW9uLCB0aGlzLnBhZGRsZS5oYWxmRXh0ZW50cylcclxuXHJcbiAgICAgICAgY29uc3QgYmFsbFBvc2l0aW9uID0gdGhpcy5iYWxsLnBvc2l0aW9uLmFkZCh0aGlzLmJhbGwudmVsb2NpdHkpXHJcbiAgICAgICAgY29uc3QgYmFsbEJvdW5kcyA9IGdlby5BQUJCLmZyb21Qb3NpdGlvbkhhbGZFeHRlbnRzKGJhbGxQb3NpdGlvbiwgbmV3IGdlby5WZWMzKHRoaXMuYmFsbC5yYWRpdXMsIHRoaXMuYmFsbC5yYWRpdXMsIHRoaXMuYmFsbC5yYWRpdXMpKVxyXG4gICAgICAgIGNvbnN0IGJhbGxTcGVlZCA9IHRoaXMubGV2ZWxEYXRhLmJhbGxTcGVlZFxyXG5cclxuICAgICAgICAvLyBjaGVjayBwYWRkbGUgYWdhaW5zdCBib3VuZGFyeVxyXG4gICAgICAgIGlmIChwYWRkbGVCb3VuZHMubWluLnggPD0gdGhpcy5maWVsZExlZnQgfHwgcGFkZGxlQm91bmRzLm1heC54ID49IHRoaXMuZmllbGRSaWdodCkge1xyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYmFsbCAvIHBhZGRsZSBoaXQgY2hlY2tcclxuICAgICAgICBpZiAoYmFsbEJvdW5kcy5vdmVybGFwcyhwYWRkbGVCb3VuZHMpKSB7XHJcbiAgICAgICAgICAgIGxldCB2ZWxvY2l0eSA9IHRoaXMuYmFsbC52ZWxvY2l0eVxyXG4gICAgICAgICAgICB2ZWxvY2l0eS55ID0gLXZlbG9jaXR5LnlcclxuXHJcbiAgICAgICAgICAgIC8vIGFsbG93IHBsYXllciBzb21lIGNvbnRyb2xcclxuICAgICAgICAgICAgLy8gcmlnaHQgc2lkZSBvZiBwYWRkbGUgcm90YXRlcyBhbmdsZSByaWdodFxyXG4gICAgICAgICAgICAvLyBsZWZ0IHNpZGUgb2YgcGFkZGxlIHJvdGF0ZXMgYW5nbGUgbGVmdFxyXG4gICAgICAgICAgICBjb25zdCBhYWJiID0gZ2VvLkFBQkIuZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMocGFkZGxlUG9zaXRpb24sIHRoaXMucGFkZGxlLmhhbGZFeHRlbnRzKVxyXG4gICAgICAgICAgICBjb25zdCBuZWFyZXN0ID0gYmFsbFBvc2l0aW9uLmNsYW1wKGFhYmIubWluLCBhYWJiLm1heClcclxuICAgICAgICAgICAgY29uc3QgdCA9IG1hdGgudW5sZXJwKGFhYmIubWluLngsIGFhYmIubWF4LngsIG5lYXJlc3QueClcclxuICAgICAgICAgICAgY29uc3Qgcm90ID0gZ2VvLk1hdDQucm90YXRpb25aKG1hdGgubGVycCgtTWF0aC5QSSAvIDQsIE1hdGguUEkgLyA0LCB0KSlcclxuXHJcbiAgICAgICAgICAgIC8vIGNob29zZSBhIHJhbmRvbSBkZXZpYXRpb24gZnJvbSBzdGFuZGFyZCByZWZsZWN0aW9uIGFuZ2xlXHJcbiAgICAgICAgICAgIHZlbG9jaXR5ID0gcm90LnRyYW5zZm9ybTModmVsb2NpdHkpXHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnogPSAwXHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eSA9IHZlbG9jaXR5Lm5vcm1hbGl6ZSgpLm11bFgoYmFsbFNwZWVkKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGFuZGxlIGJyaWNrIGhpdFxyXG4gICAgICAgIGNvbnN0IG5lYXJlc3RCcmljayA9IHRoaXMuZmluZE5lYXJlc3RCcmljayhiYWxsUG9zaXRpb24sIHRoaXMuYmFsbC5yYWRpdXMpXHJcbiAgICAgICAgaWYgKG5lYXJlc3RCcmljaykge1xyXG4gICAgICAgICAgICBjb25zdCBhYWJiID0gZ2VvLkFBQkIuZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMobmVhcmVzdEJyaWNrLnBvc2l0aW9uLCBCcmljay5oYWxmRXh0ZW50cylcclxuICAgICAgICAgICAgY29uc3QgbmVhcmVzdFB0ID0gdGhpcy5maW5kTmVhcmVzdFBvaW50T25CcmljayhuZWFyZXN0QnJpY2ssIGJhbGxQb3NpdGlvbilcclxuICAgICAgICAgICAgbGV0IHZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5XHJcblxyXG4gICAgICAgICAgICBpZiAobmVhcmVzdFB0LnkgPD0gYWFiYi5taW4ueSArIC4wMSkge1xyXG4gICAgICAgICAgICAgICAgdmVsb2NpdHkueSA9IC12ZWxvY2l0eS55XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChuZWFyZXN0UHQueCA8PSBhYWJiLm1pbi54ICsgLjAxKSB7XHJcbiAgICAgICAgICAgICAgICB2ZWxvY2l0eS54ID0gLXZlbG9jaXR5LnhcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG5lYXJlc3RQdC54ID49IGFhYmIubWF4LnggLSAuMDEpIHtcclxuICAgICAgICAgICAgICAgIHZlbG9jaXR5LnggPSAtdmVsb2NpdHkueFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobmVhcmVzdFB0LnkgPiBhYWJiLm1heC55IC0gLjAxKSB7XHJcbiAgICAgICAgICAgICAgICB2ZWxvY2l0eS55ID0gLXZlbG9jaXR5LnlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gdmVsb2NpdHkubm9ybWFsaXplKCkubXVsWChiYWxsU3BlZWQpXHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eS56ID0gMFxyXG4gICAgICAgICAgICB0aGlzLmJyaWNrcy5kZWxldGUobmVhcmVzdEJyaWNrKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXlJbXBhY3RTb3VuZCgpXHJcblxyXG4gICAgICAgICAgICAvLyBpZiBubyBicmlja3MsIG1vdmUgdG8gbmV4dCBsZXZlbFxyXG4gICAgICAgICAgICBpZiAodGhpcy5icmlja3Muc2l6ZSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICAgICAgICAgICAgICB0aGlzLndhaXQobmV4dExldmVsTWVzc2FnZSwgKCkgPT4gdGhpcy5uZXh0TGV2ZWwoKSlcclxuICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpcyBiYWxsIGdvaW5nIHRvIGNyb3NzIGJvdW5kYXJ5P1xyXG4gICAgICAgIGlmIChiYWxsQm91bmRzLm1pbi54IDwgYm91bmRzLm1pbi54IHx8IGJhbGxCb3VuZHMubWF4LnggPiBib3VuZHMubWF4LngpIHtcclxuICAgICAgICAgICAgbGV0IHZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5XHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnggPSAtdmVsb2NpdHkueFxyXG4gICAgICAgICAgICB2ZWxvY2l0eS56ID0gMFxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB2ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKGJhbGxTcGVlZClcclxuICAgICAgICAgICAgdGhpcy5wbGF5SW1wYWN0U291bmQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGJhbGxCb3VuZHMubWF4LnkgPiBib3VuZHMubWF4LnkpIHtcclxuICAgICAgICAgICAgbGV0IHZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5XHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnkgPSAtdmVsb2NpdHkueVxyXG4gICAgICAgICAgICB2ZWxvY2l0eS56ID0gMFxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB2ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKGJhbGxTcGVlZClcclxuICAgICAgICAgICAgdGhpcy5wbGF5SW1wYWN0U291bmQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYmFsbCBvZmYgYm9hcmRcclxuICAgICAgICBpZiAoYmFsbEJvdW5kcy5taW4ueSA8IGJvdW5kcy5taW4ueSkge1xyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnBvc2l0aW9uID0gbmV3IGdlby5WZWMzKDAsIHRoaXMucGFkZGxlLnBvc2l0aW9uLnkgKyB0aGlzLnBhZGRsZS5oYWxmRXh0ZW50cy55ICsgdGhpcy5iYWxsLnJhZGl1cywgdGhpcy5iYWxsLnJhZGl1cylcclxuICAgICAgICAgICAgdGhpcy5wbGF5SW1wYWN0U291bmQoKVxyXG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gR2FtZVN0YXRlLkxhdW5jaFxyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZS5wb3NpdGlvbiA9IG5ldyBnZW8uVmVjMygwLCB0aGlzLmZpZWxkQm90dG9tICsgdGhpcy5wYWRkbGUuaGFsZkV4dGVudHMueSArIHBhZGRsZUJvdHRvbU1hcmdpbiwgdGhpcy5wYWRkbGUuaGFsZkV4dGVudHMueilcclxuICAgICAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgICAgICAgICAgdGhpcy5iYWxsc1JlbWFpbmluZy0tXHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5iYWxsc1JlbWFpbmluZyA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdhbWVPdmVyKClcclxuICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGNsYW1wIHkgdmVsb2NpdHkgdG8gYXZvaWQgaG9yaXpvbnRhbCBhbmdsZXNcclxuICAgICAgICBpZiAodGhpcy5iYWxsLnZlbG9jaXR5Lmxlbmd0aFNxKCkgPiAwICYmIE1hdGguYWJzKHRoaXMuYmFsbC52ZWxvY2l0eS55KSA8IGJhbGxTcGVlZCAqIC4yNSkge1xyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkueSA9IE1hdGguc2lnbih0aGlzLmJhbGwudmVsb2NpdHkueSkgKiBiYWxsU3BlZWQgKiAuMjVcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5Lm5vcm1hbGl6ZSgpLm11bFgoYmFsbFNwZWVkKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdhbWVPdmVyKCkge1xyXG4gICAgICAgIHRoaXMuYmFsbHNSZW1haW5pbmcgPSAzXHJcbiAgICAgICAgdGhpcy5sZXZlbCA9IDFcclxuICAgICAgICB0aGlzLndhaXQoZ2FtZU92ZXJNZXNzYWdlLCAoKSA9PiB0aGlzLmluaXRMZXZlbCgpKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbmV4dExldmVsKCkge1xyXG4gICAgICAgIHRoaXMubGV2ZWwrK1xyXG4gICAgICAgIHRoaXMuaW5pdExldmVsKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHdhaXQobXNnOiBzdHJpbmcsIGY6ICgpID0+IHZvaWQpIHtcclxuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtc2dcclxuICAgICAgICB0aGlzLmNvbnRpbnVlID0gZlxyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBHYW1lU3RhdGUuV2FpdFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaW5pdExldmVsKCkge1xyXG4gICAgICAgIHRoaXMuYnJpY2tzLmNsZWFyKClcclxuICAgICAgICB0aGlzLnN0YXRlID0gR2FtZVN0YXRlLkxhdW5jaFxyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IHN0YXJ0TWVzc2FnZVxyXG5cclxuICAgICAgICAvLyBwbGF5aW5nIGZpZWxkXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCBpeG0gPSBuZXcgZ2Z4Lkl4TWVzaCgpXHJcblxyXG4gICAgICAgICAgICAvLyBmbG9vclxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmbG9vciA9IGdmeC5JeE1lc2gucmVjdEZyb21Db29yZHModGhpcy5maWVsZExlZnQsIHRoaXMuZmllbGRCb3R0b20sIC0uMjUsIHRoaXMuZmllbGRSaWdodCwgdGhpcy5maWVsZFRvcCwgMClcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZsb29yQ29sb3IgPSB0aGlzLmxldmVsRGF0YS5mbG9vckNvbG9yXHJcbiAgICAgICAgICAgICAgICBmbG9vci52ZXJ0aWNlcy5mb3JFYWNoKHYgPT4gdi5jb2xvciA9IGZsb29yQ29sb3IpXHJcbiAgICAgICAgICAgICAgICBpeG0uY2F0KGZsb29yKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBib3JkZXJcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgd2FsbHMgPSBuZXcgZ2Z4Lkl4TWVzaCgpXHJcbiAgICAgICAgICAgICAgICBjb25zdCBib3JkZXJDb2xvciA9IHRoaXMubGV2ZWxEYXRhLmJvcmRlckNvbG9yXHJcbiAgICAgICAgICAgICAgICB3YWxscy5jYXQoZ2Z4Lkl4TWVzaC5yZWN0RnJvbUNvb3Jkcyh0aGlzLmZpZWxkTGVmdCAtIGJvcmRlcldpZHRoLCB0aGlzLmZpZWxkQm90dG9tLCAtLjI1LCB0aGlzLmZpZWxkTGVmdCwgdGhpcy5maWVsZFRvcCwgMSkpXHJcbiAgICAgICAgICAgICAgICB3YWxscy5jYXQoZ2Z4Lkl4TWVzaC5yZWN0RnJvbUNvb3Jkcyh0aGlzLmZpZWxkUmlnaHQsIHRoaXMuZmllbGRCb3R0b20sIC0uMjUsIHRoaXMuZmllbGRSaWdodCArIGJvcmRlcldpZHRoLCB0aGlzLmZpZWxkVG9wLCAxKSlcclxuICAgICAgICAgICAgICAgIHdhbGxzLmNhdChnZnguSXhNZXNoLnJlY3RGcm9tQ29vcmRzKHRoaXMuZmllbGRMZWZ0IC0gYm9yZGVyV2lkdGgsIHRoaXMuZmllbGRUb3AsIC0uMjUsIHRoaXMuZmllbGRSaWdodCArIGJvcmRlcldpZHRoLCB0aGlzLmZpZWxkVG9wICsgYm9yZGVyV2lkdGgsIDEpKVxyXG4gICAgICAgICAgICAgICAgd2FsbHMudmVydGljZXMuZm9yRWFjaCh2ID0+IHYuY29sb3IgPSBib3JkZXJDb2xvcilcclxuICAgICAgICAgICAgICAgIGl4bS5jYXQod2FsbHMpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHZhbyA9IHRoaXMucmVuZGVyZXIuY3JlYXRlTWVzaChpeG0pXHJcbiAgICAgICAgICAgIHRoaXMuZmllbGRCYXRjaCA9IG5ldyBnZnguQmF0Y2goe1xyXG4gICAgICAgICAgICAgICAgdmFvOiB2YW8sXHJcbiAgICAgICAgICAgICAgICBudW1JbmRpY2VzOiBpeG0uaW5kaWNlcy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICByb3VnaG5lc3M6IDFcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGJyaWNrc1xyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc3QgYnJpY2tIYWxmV2lkdGggPSBicmlja1dpZHRoIC8gMlxyXG4gICAgICAgICAgICBjb25zdCBicmlja0hhbGZIZWlnaHQgPSBicmlja0hlaWdodCAvIDJcclxuICAgICAgICAgICAgY29uc3QgYnJpY2tIYWxmRGVwdGggPSBicmlja0RlcHRoIC8gMlxyXG5cclxuICAgICAgICAgICAgY29uc3QgZmllbGRYT2Zmc2V0ID0gdGhpcy5maWVsZExlZnQgKyBCcmljay5oYWxmRXh0ZW50cy54XHJcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkWU9mZnNldCA9IHRoaXMuZmllbGRUb3AgLSB0b3BSb3dNYXJnaW4gLSBicmlja0hlaWdodCAqIHRoaXMubGV2ZWxEYXRhLmJyaWNrUm93c1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxldmVsRGF0YS5icmlja1Jvd3M7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgeU9mZnNldCA9IGZpZWxkWU9mZnNldCArIGkgKiBicmlja0hlaWdodCArIGJyaWNrTWFyZ2luXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRoaXMubGV2ZWxEYXRhLmJyaWNrQ29sczsgKytqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeE9mZnNldCA9IGZpZWxkWE9mZnNldCArIGogKiAoYnJpY2tXaWR0aCArIGJyaWNrTWFyZ2luKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJyaWNrTWluID0gbmV3IGdlby5WZWMzKC1icmlja0hhbGZXaWR0aCArIGJyaWNrTWFyZ2luLCAtYnJpY2tIYWxmSGVpZ2h0ICsgYnJpY2tNYXJnaW4sIC1icmlja0hhbGZEZXB0aClcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBicmlja01heCA9IG5ldyBnZW8uVmVjMyhicmlja0hhbGZXaWR0aCAtIGJyaWNrTWFyZ2luLCBicmlja0hhbGZIZWlnaHQgLSBicmlja01hcmdpbiwgYnJpY2tIYWxmRGVwdGgpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWFiYiA9IG5ldyBnZW8uQUFCQihicmlja01pbiwgYnJpY2tNYXgpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXhtID0gZ2Z4Lkl4TWVzaC5yZWN0KGFhYmIpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSBuZXcgZ2VvLlZlYzMoeE9mZnNldCwgeU9mZnNldCwgYnJpY2tIYWxmRGVwdGgpXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJyaWNrID0gbmV3IEJyaWNrKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBiYXRjaDogbmV3IGdmeC5CYXRjaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JsZE1hdHJpeDogZ2VvLk1hdDQudHJhbnNsYXRpb24ocG9zaXRpb24pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlmZnVzZUNvbG9yOiByYW5kLmNob29zZShicmlja0NvbG9ycyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3VnaG5lc3M6IC44LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFvOiB0aGlzLnJlbmRlcmVyLmNyZWF0ZU1lc2goaXhtKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bUluZGljZXM6IGl4bS5pbmRpY2VzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJyaWNrcy5hZGQoYnJpY2spXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFkZCBwYWRkbGVcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5sZXZlbERhdGEucGFkZGxlV2lkdGhcclxuICAgICAgICAgICAgY29uc3QgaGFsZkV4dGVudHMgPSBuZXcgZ2VvLlZlYzMod2lkdGggLyAyLCBwYWRkbGVIZWlnaHQgLyAyLCBwYWRkbGVEZXB0aCAvIDIpXHJcbiAgICAgICAgICAgIGNvbnN0IGFhYmIgPSBnZW8uQUFCQi5mcm9tSGFsZkV4dGVudHMoaGFsZkV4dGVudHMpXHJcbiAgICAgICAgICAgIGNvbnN0IGl4bSA9IGdmeC5JeE1lc2gucmVjdChhYWJiKVxyXG4gICAgICAgICAgICBpeG0udmVydGljZXMuZm9yRWFjaCh2ID0+IHYuY29sb3IgPSBuZXcgZ2VvLlZlYzQoMCwgMSwgMSwgMSkpXHJcblxyXG4gICAgICAgICAgICBjb25zdCB2YW8gPSB0aGlzLnJlbmRlcmVyLmNyZWF0ZU1lc2goaXhtKVxyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZSA9IG5ldyBQYWRkbGUoe1xyXG4gICAgICAgICAgICAgICAgaGFsZkV4dGVudHM6IGhhbGZFeHRlbnRzLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5ldyBnZW8uVmVjMygwLCB0aGlzLmZpZWxkQm90dG9tICsgaGFsZkV4dGVudHMueSArIHBhZGRsZUJvdHRvbU1hcmdpbiwgaGFsZkV4dGVudHMueiksXHJcbiAgICAgICAgICAgICAgICBiYXRjaDogbmV3IGdmeC5CYXRjaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFvLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdWdobmVzczogLjUsXHJcbiAgICAgICAgICAgICAgICAgICAgbnVtSW5kaWNlczogaXhtLmluZGljZXMubGVuZ3RoXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYWRkIGJhbGxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJhZGl1cyA9IHRoaXMubGV2ZWxEYXRhLmJhbGxSYWRpdXNcclxuICAgICAgICAgICAgY29uc3QgaXhtID0gZ2Z4Lkl4TWVzaC5zcGhlcmUoMTYsIDE2KVxyXG4gICAgICAgICAgICBpeG0udHJhbnNmb3JtKGdlby5NYXQ0LnNjYWxpbmcobmV3IGdlby5WZWMzKHJhZGl1cywgcmFkaXVzLCByYWRpdXMpKSlcclxuICAgICAgICAgICAgaXhtLnZlcnRpY2VzLmZvckVhY2godiA9PiB2LmNvbG9yID0gbmV3IGdlby5WZWM0KDAsIDAsIDEsIDEpKVxyXG5cclxuICAgICAgICAgICAgY29uc3QgdmFvID0gdGhpcy5yZW5kZXJlci5jcmVhdGVNZXNoKGl4bSlcclxuICAgICAgICAgICAgdGhpcy5iYWxsID0gbmV3IEJhbGwoe1xyXG4gICAgICAgICAgICAgICAgcmFkaXVzOiByYWRpdXMsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbmV3IGdlby5WZWMzKDAsIHRoaXMucGFkZGxlLnBvc2l0aW9uLnkgKyB0aGlzLnBhZGRsZS5oYWxmRXh0ZW50cy55ICsgcmFkaXVzLCByYWRpdXMpLFxyXG4gICAgICAgICAgICAgICAgYmF0Y2g6IG5ldyBnZnguQmF0Y2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbyxcclxuICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgcm91Z2huZXNzOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIG51bUluZGljZXM6IGl4bS5pbmRpY2VzLmxlbmd0aFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwbGF5SW1wYWN0U291bmQoKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3Qgc291bmQgPSByYW5kLmNob29zZSh0aGlzLmltcGFjdFNvdW5kcylcclxuICAgICAgICBjb25zdCBzcmMgPSB0aGlzLmFjLmNyZWF0ZUJ1ZmZlclNvdXJjZSgpXHJcbiAgICAgICAgc3JjLmJ1ZmZlciA9IHNvdW5kXHJcbiAgICAgICAgc3JjLmNvbm5lY3QodGhpcy5hYy5kZXN0aW5hdGlvbilcclxuICAgICAgICBzcmMuc3RhcnQoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZmluZE5lYXJlc3RQb2ludE9uQnJpY2soYnJpY2s6IEJyaWNrLCBwb3NpdGlvbjogZ2VvLlZlYzMpOiBnZW8uVmVjMyB7XHJcbiAgICAgICAgY29uc3QgYWFiYiA9IGdlby5BQUJCLmZyb21Qb3NpdGlvbkhhbGZFeHRlbnRzKGJyaWNrLnBvc2l0aW9uLCBCcmljay5oYWxmRXh0ZW50cylcclxuICAgICAgICBjb25zdCBuZWFyZXN0ID0gcG9zaXRpb24uY2xhbXAoYWFiYi5taW4sIGFhYmIubWF4KVxyXG4gICAgICAgIHJldHVybiBuZWFyZXN0XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmaW5kTmVhcmVzdEJyaWNrKHBvc2l0aW9uOiBnZW8uVmVjMywgcmFkaXVzOiBudW1iZXIpOiBCcmljayB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IHIyID0gcmFkaXVzICogcmFkaXVzXHJcbiAgICAgICAgbGV0IG1pbkRpc3RTcSA9IHIyXHJcbiAgICAgICAgbGV0IG5lYXJlc3RCcmljazogQnJpY2sgfCBudWxsID0gbnVsbFxyXG4gICAgICAgIGZvciAoY29uc3QgYnJpY2sgb2YgdGhpcy5icmlja3MpIHtcclxuICAgICAgICAgICAgY29uc3QgbmVhcmVzdFB0ID0gdGhpcy5maW5kTmVhcmVzdFBvaW50T25CcmljayhicmljaywgcG9zaXRpb24pXHJcbiAgICAgICAgICAgIGNvbnN0IGRpc3RTcSA9IG5lYXJlc3RQdC5zdWIocG9zaXRpb24pLmxlbmd0aFNxKClcclxuICAgICAgICAgICAgaWYgKGRpc3RTcSA8IG1pbkRpc3RTcSkge1xyXG4gICAgICAgICAgICAgICAgbmVhcmVzdEJyaWNrID0gYnJpY2tcclxuICAgICAgICAgICAgICAgIG1pbkRpc3RTcSA9IGRpc3RTcVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmVhcmVzdEJyaWNrXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVXb3JsZE1hdHJpY2VzKCkge1xyXG4gICAgICAgIHRoaXMuYmFsbC5iYXRjaC53b3JsZE1hdHJpeCA9IGdlby5NYXQ0LnRyYW5zbGF0aW9uKHRoaXMuYmFsbC5wb3NpdGlvbilcclxuICAgICAgICB0aGlzLnBhZGRsZS5iYXRjaC53b3JsZE1hdHJpeCA9IGdlby5NYXQ0LnRyYW5zbGF0aW9uKHRoaXMucGFkZGxlLnBvc2l0aW9uKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd1NjZW5lKCkge1xyXG4gICAgICAgIC8vIGNvbmZpZ3VyZSBjYW1lcmEgLSBmaXQgcGxheSBhcmVhIHRvIHNjcmVlbiB3aXRoIHNvbWUgc21hbGwgbWFyZ2luXHJcbiAgICAgICAgbGV0IHogPSAwXHJcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5maWVsZFRvcCAtIHRoaXMuZmllbGRCb3R0b20gKyBib3JkZXJXaWR0aCAqIDJcclxuICAgICAgICBjb25zdCB3aWR0aCA9IHRoaXMuZmllbGRSaWdodCAtIHRoaXMuZmllbGRMZWZ0ICsgYm9yZGVyV2lkdGggKiAyXHJcbiAgICAgICAgY29uc3QgZmllbGRBc3BlY3QgPSB3aWR0aCAvIGhlaWdodFxyXG4gICAgICAgIGlmIChmaWVsZEFzcGVjdCA8IHRoaXMucmVuZGVyZXIuYXNwZWN0KSB7XHJcbiAgICAgICAgICAgIHogPSBoZWlnaHQgLyAyIC8gTWF0aC50YW4odGhpcy5yZW5kZXJlci5mb3YgLyAyKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHogPSB3aWR0aCAvIDIgLyBNYXRoLnRhbih0aGlzLnJlbmRlcmVyLmZvdiAqIHRoaXMucmVuZGVyZXIuYXNwZWN0IC8gMik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLnZpZXdNYXRyaXggPSBnZW8uTWF0NC5sb29rQXQoXHJcbiAgICAgICAgICAgIG5ldyBnZW8uVmVjMygwLCAwLCAxICsgeiksIG5ldyBnZW8uVmVjMygwLCAwLCAtMSksIG5ldyBnZW8uVmVjMygwLCAxLCAwKSkuaW52ZXJ0KClcclxuXHJcbiAgICAgICAgLy8gc2hvdyBmcm9tIHNpZGUgdmlldyBmb3IgZGVidWdnaW5nXHJcbiAgICAgICAgLy8gdGhpcy5yZW5kZXJlci52aWV3TWF0cml4ID0gZ2VvLk1hdDQubG9va0F0KFxyXG4gICAgICAgIC8vICAgICBuZXcgZ2VvLlZlYzMoMCwgLTE2LCAwKSwgbmV3IGdlby5WZWMzKDAsIDEsIDApLCBuZXcgZ2VvLlZlYzMoMCwgMCwgMSkpLmludmVydCgpXHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd0JhdGNoKHRoaXMuZmllbGRCYXRjaClcclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdCYXRjaCh0aGlzLmJhbGwuYmF0Y2gpXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3QmF0Y2godGhpcy5wYWRkbGUuYmF0Y2gpXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgYnJpY2sgb2YgdGhpcy5icmlja3MpIHtcclxuICAgICAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3QmF0Y2goYnJpY2suYmF0Y2gpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcmVyLnByZXNlbnQoKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FudmFzVG9OREMoY2M6IGdlby5WZWMyKTogZ2VvLlZlYzIge1xyXG4gICAgICAgIGNvbnN0IG5kYyA9IG5ldyBnZW8uVmVjMihcclxuICAgICAgICAgICAgY2MueCAvIHRoaXMuY2FudmFzLndpZHRoICogMiAtIDEsXHJcbiAgICAgICAgICAgIC1jYy55IC8gdGhpcy5jYW52YXMuaGVpZ2h0ICogMiArIDFcclxuICAgICAgICApXHJcblxyXG4gICAgICAgIHJldHVybiBuZGNcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNhbnZhc1RvTkRDUmF5KGNjOiBnZW8uVmVjMik6IGdlby5SYXkge1xyXG4gICAgICAgIGNvbnN0IG5kYyA9IHRoaXMuY2FudmFzVG9OREMoY2MpXHJcbiAgICAgICAgY29uc3QgcmF5ID0gbmV3IGdlby5SYXkobmV3IGdlby5WZWMzKG5kYy54LCBuZGMueSwgLTEpLCBuZXcgZ2VvLlZlYzMoMCwgMCwgMSkpXHJcbiAgICAgICAgcmV0dXJuIHJheVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FudmFzVG9Xb3JsZFJheShjYzogZ2VvLlZlYzIpOiBnZW8uUmF5IHtcclxuICAgICAgICBjb25zdCBuZGNSYXkgPSB0aGlzLmNhbnZhc1RvTkRDUmF5KGNjKVxyXG4gICAgICAgIGNvbnN0IGludlByb2ogPSB0aGlzLnJlbmRlcmVyLnByb2plY3Rpb25NYXRyaXguaW52ZXJ0KClcclxuICAgICAgICBjb25zdCBpbnZWaWV3ID0gdGhpcy5yZW5kZXJlci52aWV3TWF0cml4LmludmVydCgpXHJcbiAgICAgICAgY29uc3QgaW52Vmlld1Byb2ogPSB0aGlzLnJlbmRlcmVyLnByb2plY3Rpb25NYXRyaXgubWF0bXVsKHRoaXMucmVuZGVyZXIudmlld01hdHJpeCkuaW52ZXJ0KClcclxuICAgICAgICBjb25zdCB2aWV3UmF5ID0gbmRjUmF5LnRyYW5zZm9ybShpbnZQcm9qKVxyXG4gICAgICAgIGNvbnN0IHdvcmxkUmF5ID0gdmlld1JheS50cmFuc2Zvcm0oaW52VmlldylcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaW5wLm1vdXNlTGVmdFJlbGVhc2VkKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY2M6IFwiLCBjYy50b1N0cmluZygpKVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm5kYzogXCIsIG5kY1JheS50b1N0cmluZygpKVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInZpZXc6IFwiLCB2aWV3UmF5LnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid29ybGQ6IFwiLCB3b3JsZFJheS50b1N0cmluZygpKVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIndvcmxkMjogXCIsIG5kY1JheS50cmFuc2Zvcm0oaW52Vmlld1Byb2opLnRvU3RyaW5nKCkpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gd29ybGRSYXlcclxuICAgIH1cclxufVxyXG5cclxuY29uc3QgYXBwID0gbmV3IEFwcCgpXHJcbmFwcC5leGVjKClcclxuIl19