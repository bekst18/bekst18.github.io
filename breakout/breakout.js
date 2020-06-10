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
const ballSpeedByLevel = [.2, .3, .35, .4, .4, .4, .5, .5, .6, .7];
const ballRadiusByLevel = [1.5, 1, .5, .5, .5, .5, .25, .25, .25, .125];
const paddleWidthByLevel = [8, 8, 6, 6, 4, 4, 4, 4, 3, 2];
const brickRowsByLevel = [3, 3, 4, 4, 5, 5, 6, 6, 7, 8];
const brickColsByLevel = [6, 6, 8, 8, 10, 10, 12, 12, 14, 16];
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
    get brickRows() {
        return brickRowsByLevel[this.level - 1];
    }
    get brickCols() {
        return brickColsByLevel[this.level - 1];
    }
    get fieldWidth() {
        return brickWidth * this.brickCols;
    }
    get fieldHeight() {
        return brickHeight * this.brickRows * 4 + topRowMargin;
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
    get ballSpeed() {
        return ballSpeedByLevel[this.level - 1];
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
        this.ball.velocity = v.mulX(this.ballSpeed);
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
        // check paddle against boundary
        if (paddleBounds.min.x < this.fieldLeft || paddleBounds.max.x > this.fieldRight) {
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
            this.ball.velocity = velocity.normalize().mulX(this.ballSpeed);
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
            this.ball.velocity = velocity.normalize().mulX(this.ballSpeed);
            this.ball.velocity.z = 0;
            this.bricks.delete(nearestBrick);
            this.playImpactSound();
            // if no bricks, move to next level
            if (this.bricks.size === 0) {
                this.wait(nextLevelMessage, () => this.nextLevel());
            }
        }
        // is ball going to cross boundary?
        if (ballBounds.min.x < bounds.min.x || ballBounds.max.x > bounds.max.x) {
            let velocity = this.ball.velocity;
            velocity.x = -velocity.x;
            velocity.z = 0;
            this.ball.velocity = velocity.normalize().mulX(this.ballSpeed);
            this.playImpactSound();
        }
        if (ballBounds.max.y > bounds.max.y) {
            let velocity = this.ball.velocity;
            velocity.y = -velocity.y;
            velocity.z = 0;
            this.ball.velocity = velocity.normalize().mulX(this.ballSpeed);
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
        if (this.ball.velocity.lengthSq() > 0 && Math.abs(this.ball.velocity.y) < this.ballSpeed * .25) {
            this.ball.velocity.y = Math.sign(this.ball.velocity.y) * this.ballSpeed * .25;
            this.ball.velocity = this.ball.velocity.normalize().mulX(this.ballSpeed);
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
                floor.vertices.forEach(v => v.color = new geo.Vec4(.5, .5, .5, .5));
                ixm.cat(floor);
            }
            // border
            {
                const walls = new gfx.IxMesh();
                walls.cat(gfx.IxMesh.rectFromCoords(this.fieldLeft - borderWidth, this.fieldBottom, -.25, this.fieldLeft, this.fieldTop, 1));
                walls.cat(gfx.IxMesh.rectFromCoords(this.fieldRight, this.fieldBottom, -.25, this.fieldRight + borderWidth, this.fieldTop, 1));
                walls.cat(gfx.IxMesh.rectFromCoords(this.fieldLeft - borderWidth, this.fieldTop, -.25, this.fieldRight + borderWidth, this.fieldTop + borderWidth, 1));
                walls.vertices.forEach(v => v.color = new geo.Vec4(1, 0, 0, 1));
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
            const fieldYOffset = this.fieldTop - topRowMargin - brickHeight * this.brickRows;
            for (let i = 0; i < this.brickRows; ++i) {
                const yOffset = fieldYOffset + i * brickHeight + brickMargin;
                for (let j = 0; j < this.brickCols; ++j) {
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
            const width = paddleWidthByLevel[this.level - 1];
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
            const radius = ballRadiusByLevel[this.level - 1];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtvdXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJicmVha291dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQixNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUE7QUFDcEIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFBO0FBQ3JCLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQTtBQUNyQixNQUFNLFlBQVksR0FBRyxFQUFFLENBQUE7QUFDdkIsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFBO0FBQ3RCLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQTtBQUN0QixNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFDckIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFBO0FBQ3RCLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQTtBQUN2QixNQUFNLGtCQUFrQixHQUFHLENBQUMsQ0FBQTtBQUU1QixNQUFNLFlBQVksR0FBRyw4Q0FBOEMsQ0FBQTtBQUNuRSxNQUFNLGVBQWUsR0FBRyxxREFBcUQsQ0FBQTtBQUM3RSxNQUFNLGdCQUFnQixHQUFHLHVEQUF1RCxDQUFBO0FBRWhGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtBQUNsRSxNQUFNLGlCQUFpQixHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDdkUsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ3pELE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUN2RCxNQUFNLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7QUFFN0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxLQUFLLENBQ3pCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3hCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3hCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDMUIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUMxQixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQzFCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDNUIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUM1QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQzVCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDNUIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUM1QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQy9CLENBQUE7QUFTRCxNQUFNLE1BQU07SUFNUixZQUFZLE9BQXNCOztRQUpsQixVQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDdkMsYUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFB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USxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFM0MsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFO1lBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtTQUNwRTtRQUVELE9BQU8sUUFBUSxDQUFBO0lBQ25CLENBQUM7Q0FDSjtBQUVELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7QUFDckIsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvM2QuanNcIlxyXG5pbXBvcnQgKiBhcyBpbnB1dCBmcm9tIFwiLi4vc2hhcmVkL2lucHV0LmpzXCJcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIlxyXG5pbXBvcnQgKiBhcyBtYXRoIGZyb20gXCIuLi9zaGFyZWQvbWF0aC5qc1wiXHJcbmltcG9ydCAqIGFzIGF1ZGlvIGZyb20gXCIuLi9zaGFyZWQvYXVkaW8uanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuXHJcbmNvbnN0IGJyaWNrV2lkdGggPSAyXHJcbmNvbnN0IGJyaWNrSGVpZ2h0ID0gMVxyXG5jb25zdCBicmlja0RlcHRoID0gLjVcclxuY29uc3QgcGFkZGxlSGVpZ2h0ID0gLjVcclxuY29uc3QgcGFkZGxlRGVwdGggPSAuNVxyXG5jb25zdCBwYWRkbGVTcGVlZCA9IC41XHJcbmNvbnN0IGJvcmRlcldpZHRoID0gMVxyXG5jb25zdCB0b3BSb3dNYXJnaW4gPSAxXHJcbmNvbnN0IGJyaWNrTWFyZ2luID0gLjA1XHJcbmNvbnN0IHBhZGRsZUJvdHRvbU1hcmdpbiA9IDFcclxuXHJcbmNvbnN0IHN0YXJ0TWVzc2FnZSA9IFwiVGFwLCBjbGljaywgb3IgcHJlc3MgYW55IGtleSB0byBsYXVuY2ggYmFsbC5cIlxyXG5jb25zdCBnYW1lT3Zlck1lc3NhZ2UgPSBcIkdhbWUgb3ZlciEgVGFwLCBjbGljaywgb3IgcHJlc3MgYW55IGtleSB0byByZXN0YXJ0LlwiXHJcbmNvbnN0IG5leHRMZXZlbE1lc3NhZ2UgPSBcIkxldmVsIENsZWFyISBUYXAsIGNsaWNrLCBvciBwcmVzcyBhbnkga2V5IHRvIGFkdmFuY2UuXCJcclxuXHJcbmNvbnN0IGJhbGxTcGVlZEJ5TGV2ZWwgPSBbLjIsIC4zLCAuMzUsIC40LCAuNCwgLjQsIC41LCAuNSwgLjYsIC43XVxyXG5jb25zdCBiYWxsUmFkaXVzQnlMZXZlbCA9IFsxLjUsIDEsIC41LCAuNSwgLjUsIC41LCAuMjUsIC4yNSwgLjI1LCAuMTI1XVxyXG5jb25zdCBwYWRkbGVXaWR0aEJ5TGV2ZWwgPSBbOCwgOCwgNiwgNiwgNCwgNCwgNCwgNCwgMywgMl1cclxuY29uc3QgYnJpY2tSb3dzQnlMZXZlbCA9IFszLCAzLCA0LCA0LCA1LCA1LCA2LCA2LCA3LCA4XVxyXG5jb25zdCBicmlja0NvbHNCeUxldmVsID0gWzYsIDYsIDgsIDgsIDEwLCAxMCwgMTIsIDEyLCAxNCwgMTZdXHJcblxyXG5jb25zdCBicmlja0NvbG9ycyA9IG5ldyBBcnJheTxnZW8uVmVjND4oXHJcbiAgICBuZXcgZ2VvLlZlYzQoMSwgMCwgMCwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMCwgMSwgMCwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMCwgMCwgMSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMCwgMSwgMSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMSwgMCwgMSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoMSwgMSwgMSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoLjUsIC41LCAwLCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCgwLCAuNSwgLjUsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KC41LCAwLCAuNSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoLjI1LCAuNzUsIDAsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDAsIC4yNSwgLjc1LCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCguMjUsIDAsIC43NSwgMSksXHJcbiAgICBuZXcgZ2VvLlZlYzQoLjc1LCAuMjUsIDAsIDEpLFxyXG4gICAgbmV3IGdlby5WZWM0KDAsIC43NSwgLjI1LCAxKSxcclxuICAgIG5ldyBnZW8uVmVjNCguNzUsIDAsIC4yNSwgMSksXHJcbilcclxuXHJcbmludGVyZmFjZSBQYWRkbGVPcHRpb25zIHtcclxuICAgIGhhbGZFeHRlbnRzOiBnZW8uVmVjM1xyXG4gICAgcG9zaXRpb246IGdlby5WZWMzXHJcbiAgICBiYXRjaDogZ2Z4LkJhdGNoXHJcbiAgICB2ZWxvY2l0eT86IGdlby5WZWMzXHJcbn1cclxuXHJcbmNsYXNzIFBhZGRsZSB7XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgaGFsZkV4dGVudHM6IGdlby5WZWMzXHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgYmF0Y2ggPSBuZXcgZ2Z4LkJhdGNoKClcclxuICAgIHBvc2l0aW9uID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICB2ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFBhZGRsZU9wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLmhhbGZFeHRlbnRzID0gb3B0aW9ucy5oYWxmRXh0ZW50cy5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy5iYXRjaCA9IG9wdGlvbnMuYmF0Y2hcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbi5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy52ZWxvY2l0eSA9IG9wdGlvbnMudmVsb2NpdHk/LmNsb25lKCkgPz8gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSBCcmlja09wdGlvbnMge1xyXG4gICAgcG9zaXRpb246IGdlby5WZWMzXHJcbiAgICBiYXRjaDogZ2Z4LkJhdGNoXHJcbn1cclxuXHJcbmNsYXNzIEJyaWNrIHtcclxuICAgIHB1YmxpYyByZWFkb25seSBiYXRjaCA9IG5ldyBnZnguQmF0Y2goKVxyXG4gICAgcHVibGljIHJlYWRvbmx5IHBvc2l0aW9uID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcbiAgICBzdGF0aWMgcmVhZG9ubHkgaGFsZkV4dGVudHMgPSBuZXcgZ2VvLlZlYzMoYnJpY2tXaWR0aCAvIDIgLSBicmlja01hcmdpbiwgYnJpY2tIZWlnaHQgLyAyIC0gYnJpY2tNYXJnaW4sIGJyaWNrRGVwdGggLyAyKVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEJyaWNrT3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uLmNsb25lKClcclxuICAgICAgICB0aGlzLmJhdGNoID0gb3B0aW9ucy5iYXRjaFxyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgQmFsbE9wdGlvbnMge1xyXG4gICAgcmFkaXVzOiBudW1iZXJcclxuICAgIHBvc2l0aW9uOiBnZW8uVmVjM1xyXG4gICAgYmF0Y2g6IGdmeC5CYXRjaFxyXG4gICAgdmVsb2NpdHk/OiBnZW8uVmVjM1xyXG59XHJcblxyXG5jbGFzcyBCYWxsIHtcclxuICAgIHJhZGl1czogbnVtYmVyID0gMVxyXG4gICAgcG9zaXRpb246IGdlby5WZWMzXHJcbiAgICBiYXRjaDogZ2Z4LkJhdGNoXHJcbiAgICB2ZWxvY2l0eTogZ2VvLlZlYzNcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBCYWxsT3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMucmFkaXVzID0gb3B0aW9ucy5yYWRpdXNcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvbi5jbG9uZSgpXHJcbiAgICAgICAgdGhpcy5iYXRjaCA9IG9wdGlvbnMuYmF0Y2hcclxuICAgICAgICB0aGlzLnZlbG9jaXR5ID0gb3B0aW9ucy52ZWxvY2l0eT8uY2xvbmUoKSA/PyBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgIH1cclxufVxyXG5cclxuZW51bSBHYW1lU3RhdGUge1xyXG4gICAgUGxheSxcclxuICAgIExhdW5jaCxcclxuICAgIFdhaXRcclxufVxyXG5cclxuLy8gc3RlcCAxIC0gY2xlYXIgc2NyZWVuLCBpbml0IGdsLCBldGMuLi5cclxuLy8gc3RlcCAyIC0gZHJhdyBhIGNsaXAgc3BhY2UgdHJpYW5nbGVcclxuLy8gc3RlcCAzIC0gZHJhdyBhIHdvcmxkIHNwYWNlIHRyaWFuZ2xlXHJcbmNsYXNzIEFwcCB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNhbnZhcyA9IGRvbS5ieUlkKFwiY2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxldmVsU3BhbiA9IGRvbS5ieUlkKFwibGV2ZWxcIikgYXMgSFRNTERpdkVsZW1lbnRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYmFsbHNSZW1haW5pbmdTcGFuID0gZG9tLmJ5SWQoXCJiYWxsc1JlbWFpbmluZ1wiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBtZXNzYWdlRGl2ID0gZG9tLmJ5SWQoXCJtZXNzYWdlXCIpIGFzIEhUTUxEaXZFbGVtZW50XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJlbmRlcmVyID0gbmV3IGdmeC5SZW5kZXJlcih0aGlzLmNhbnZhcylcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW5wID0gbmV3IGlucHV0LklucHV0KHRoaXMuY2FudmFzKVxyXG4gICAgcHJpdmF0ZSBmaWVsZEJhdGNoOiBnZnguQmF0Y2ggPSBuZXcgZ2Z4LkJhdGNoKClcclxuICAgIHByaXZhdGUgcGFkZGxlITogUGFkZGxlXHJcbiAgICBwcml2YXRlIGJhbGwhOiBCYWxsXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGJyaWNrcyA9IG5ldyBTZXQ8QnJpY2s+KClcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYWMgPSBuZXcgQXVkaW9Db250ZXh0KClcclxuICAgIHByaXZhdGUgaW1wYWN0U291bmRzID0gbmV3IEFycmF5PEF1ZGlvQnVmZmVyPigpXHJcbiAgICBwcml2YXRlIGJhbGxzUmVtYWluaW5nID0gM1xyXG4gICAgcHJpdmF0ZSBsZXZlbCA9IDlcclxuICAgIHByaXZhdGUgc3RhdGUgPSBHYW1lU3RhdGUuTGF1bmNoXHJcbiAgICBwcml2YXRlIGNvbnRpbnVlID0gKCkgPT4geyB9XHJcblxyXG4gICAgYXN5bmMgZXhlYygpIHtcclxuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBzdGFydE1lc3NhZ2VcclxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgKCkgPT4gdGhpcy5oYW5kbGVLZXlVcCgpKVxyXG5cclxuICAgICAgICB0aGlzLmluaXRMZXZlbCgpXHJcbiAgICAgICAgYXdhaXQgdGhpcy5pbml0QXVkaW8oKVxyXG4gICAgICAgIHRoaXMuY2FudmFzLmZvY3VzKClcclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy50aWNrKCkpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBpbml0QXVkaW8oKSB7XHJcbiAgICAgICAgY29uc3QgbnVtSW1wYWN0U291bmRzID0gMTVcclxuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8PSBudW1JbXBhY3RTb3VuZHM7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCB1cmwgPSBgLi9hc3NldHMvaW1wYWN0JHtpfS53YXZgXHJcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IGF1ZGlvLmxvYWRBdWRpbyh0aGlzLmFjLCB1cmwpXHJcbiAgICAgICAgICAgIHRoaXMuaW1wYWN0U291bmRzLnB1c2goYnVmZmVyKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHRpY2soKSB7XHJcbiAgICAgICAgdGhpcy5jaGVja1NpemUoKVxyXG4gICAgICAgIHRoaXMudXBkYXRlKClcclxuICAgICAgICB0aGlzLmRyYXdTY2VuZSgpXHJcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMudGljaygpKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2hlY2tTaXplKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNhbnZhcy53aWR0aCA9PT0gdGhpcy5jYW52YXMuY2xpZW50V2lkdGggJiYgdGhpcy5jYW52YXMuaGVpZ2h0ID09PSB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGUoKSB7XHJcbiAgICAgICAgdGhpcy5wYWRkbGUucG9zaXRpb24gPSB0aGlzLnBhZGRsZS5wb3NpdGlvbi5hZGQodGhpcy5wYWRkbGUudmVsb2NpdHkpXHJcbiAgICAgICAgdGhpcy5iYWxsLnBvc2l0aW9uID0gdGhpcy5iYWxsLnBvc2l0aW9uLmFkZCh0aGlzLmJhbGwudmVsb2NpdHkpXHJcbiAgICAgICAgdGhpcy5oYW5kbGVJbnB1dCgpXHJcbiAgICAgICAgdGhpcy5oYW5kbGVDb2xsaXNpb24oKVxyXG4gICAgICAgIHRoaXMudXBkYXRlV29ybGRNYXRyaWNlcygpXHJcbiAgICAgICAgdGhpcy51cGRhdGVVSSgpXHJcbiAgICAgICAgdGhpcy5pbnAuZmx1c2goKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlVUkoKSB7XHJcbiAgICAgICAgdGhpcy5iYWxsc1JlbWFpbmluZ1NwYW4udGV4dENvbnRlbnQgPSB0aGlzLmJhbGxzUmVtYWluaW5nLnRvU3RyaW5nKClcclxuICAgICAgICB0aGlzLmxldmVsU3Bhbi50ZXh0Q29udGVudCA9IHRoaXMubGV2ZWwudG9TdHJpbmcoKVxyXG5cclxuICAgICAgICBpZiAodGhpcy5tZXNzYWdlKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZURpdi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZURpdi5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IGJyaWNrUm93cygpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBicmlja1Jvd3NCeUxldmVsW3RoaXMubGV2ZWwgLSAxXVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IGJyaWNrQ29scygpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBicmlja0NvbHNCeUxldmVsW3RoaXMubGV2ZWwgLSAxXVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0IGZpZWxkV2lkdGgoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gYnJpY2tXaWR0aCAqIHRoaXMuYnJpY2tDb2xzXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRIZWlnaHQoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gYnJpY2tIZWlnaHQgKiB0aGlzLmJyaWNrUm93cyAqIDQgKyB0b3BSb3dNYXJnaW5cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBmaWVsZExlZnQoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gLXRoaXMuZmllbGRXaWR0aCAvIDJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBmaWVsZFJpZ2h0KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmllbGRMZWZ0ICsgdGhpcy5maWVsZFdpZHRoXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRCb3R0b20oKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gLXRoaXMuZmllbGRIZWlnaHQgLyAyXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXQgZmllbGRUb3AoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5maWVsZEJvdHRvbSArIHRoaXMuZmllbGRIZWlnaHRcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBiYWxsU3BlZWQoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gYmFsbFNwZWVkQnlMZXZlbFt0aGlzLmxldmVsIC0gMV1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldCBtZXNzYWdlKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZURpdi50ZXh0Q29udGVudCA/PyBcIlwiXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzZXQgbWVzc2FnZSh0ZXh0OiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLm1lc3NhZ2VEaXYudGV4dENvbnRlbnQgPSB0ZXh0XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVLZXlVcCgpIHtcclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSA9PT0gR2FtZVN0YXRlLlBsYXkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSA9PT0gR2FtZVN0YXRlLldhaXQpIHtcclxuICAgICAgICAgICAgdGhpcy5jb250aW51ZSgpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5sYXVuY2hCYWxsKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUlucHV0KCkge1xyXG4gICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xyXG4gICAgICAgICAgICBjYXNlIEdhbWVTdGF0ZS5MYXVuY2g6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUlucHV0TGF1bmNoKClcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgICBjYXNlIEdhbWVTdGF0ZS5QbGF5OlxyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dFBsYXkoKVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgR2FtZVN0YXRlLldhaXQ6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUlucHV0V2FpdCgpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUlucHV0TGF1bmNoKCk6IHZvaWQge1xyXG4gICAgICAgIC8vIHN0YXJ0IGdhbWUgb24gbW91c2UgY2lja1xyXG4gICAgICAgIGlmICh0aGlzLmlucC5tb3VzZUxlZnRQcmVzc2VkKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGF1bmNoQmFsbCgpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlSW5wdXRQbGF5KCkge1xyXG4gICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDAsIDAsIDApXHJcblxyXG4gICAgICAgIC8vIG1vdXNlIC8gdG91Y2ggcGFkZGxlIG1vdmVtZW50XHJcbiAgICAgICAgaWYgKHRoaXMuaW5wLm1vdXNlTGVmdERvd24pIHtcclxuICAgICAgICAgICAgY29uc3Qgd29ybGRNb3VzZVJheSA9IHRoaXMuY2FudmFzVG9Xb3JsZFJheShuZXcgZ2VvLlZlYzIodGhpcy5pbnAubW91c2VYLCB0aGlzLmlucC5tb3VzZVkpKVxyXG4gICAgICAgICAgICBjb25zdCBmaWVsZFBsYW5lID0gZ2VvLlBsYW5lLmZyb21Qb2ludE5vcm1hbCh0aGlzLnBhZGRsZS5wb3NpdGlvbiwgbmV3IGdlby5WZWMzKDAsIDAsIDEpKVxyXG4gICAgICAgICAgICBjb25zdCBmaWVsZEl4ID0gd29ybGRNb3VzZVJheS5sZXJwKHdvcmxkTW91c2VSYXkuY2FzdChmaWVsZFBsYW5lKSlcclxuICAgICAgICAgICAgaWYgKGZpZWxkSXgueCA+IHRoaXMucGFkZGxlLnBvc2l0aW9uLngpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDEsIDAsIDApXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZmllbGRJeC54IDwgdGhpcy5wYWRkbGUucG9zaXRpb24ueCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoLTEsIDAsIDApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGtleWJvYXJkIHBhZGRsZSBtb3ZlbWVudFxyXG4gICAgICAgIGlmICh0aGlzLmlucC5kb3duKFwiYVwiKSkge1xyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZS52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygtMSwgMCwgMClcclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaW5wLmRvd24oXCJkXCIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGFkZGxlLnZlbG9jaXR5ID0gbmV3IGdlby5WZWMzKDEsIDAsIDApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5wYWRkbGUudmVsb2NpdHkubGVuZ3RoU3EoKSA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSB0aGlzLnBhZGRsZS52ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKHBhZGRsZVNwZWVkKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUlucHV0V2FpdCgpIHtcclxuICAgICAgICBpZiAodGhpcy5pbnAubW91c2VMZWZ0RG93bikge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRpbnVlKClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBsYXVuY2hCYWxsKCkge1xyXG4gICAgICAgIC8vIGNob29zZSByYW5kb20gdXB3YXJkIGxhdW5jaCBkaXJlY3Rpb25cclxuICAgICAgICBjb25zdCByb3QgPSBnZW8uTWF0My5yb3RhdGlvbloocmFuZC5mbG9hdCgtTWF0aC5QSSAvIDQsIE1hdGguUEkgLyA0KSlcclxuICAgICAgICBjb25zdCB2ID0gcm90LnRyYW5zZm9ybShuZXcgZ2VvLlZlYzMoMCwgMSwgMCkpLm5vcm1hbGl6ZSgpXHJcbiAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gdi5tdWxYKHRoaXMuYmFsbFNwZWVkKVxyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBHYW1lU3RhdGUuUGxheVxyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IFwiXCJcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUNvbGxpc2lvbigpIHtcclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gR2FtZVN0YXRlLlBsYXkpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpcyBwYWRkbGUgZ29pbmcgdG8gY3Jvc3MgYm91bmRhcnk/XHJcbiAgICAgICAgY29uc3QgYm91bmRzID0gZ2VvLkFBQkIuZnJvbUNvb3JkcyhcclxuICAgICAgICAgICAgdGhpcy5maWVsZExlZnQsIHRoaXMuZmllbGRCb3R0b20sIC0xLFxyXG4gICAgICAgICAgICB0aGlzLmZpZWxkUmlnaHQsIHRoaXMuZmllbGRUb3AsIDEpXHJcblxyXG4gICAgICAgIGNvbnN0IHBhZGRsZVBvc2l0aW9uID0gdGhpcy5wYWRkbGUucG9zaXRpb24uYWRkKHRoaXMucGFkZGxlLnZlbG9jaXR5KVxyXG4gICAgICAgIGNvbnN0IHBhZGRsZUJvdW5kcyA9IGdlby5BQUJCLmZyb21Qb3NpdGlvbkhhbGZFeHRlbnRzKHBhZGRsZVBvc2l0aW9uLCB0aGlzLnBhZGRsZS5oYWxmRXh0ZW50cylcclxuXHJcbiAgICAgICAgY29uc3QgYmFsbFBvc2l0aW9uID0gdGhpcy5iYWxsLnBvc2l0aW9uLmFkZCh0aGlzLmJhbGwudmVsb2NpdHkpXHJcbiAgICAgICAgY29uc3QgYmFsbEJvdW5kcyA9IGdlby5BQUJCLmZyb21Qb3NpdGlvbkhhbGZFeHRlbnRzKGJhbGxQb3NpdGlvbiwgbmV3IGdlby5WZWMzKHRoaXMuYmFsbC5yYWRpdXMsIHRoaXMuYmFsbC5yYWRpdXMsIHRoaXMuYmFsbC5yYWRpdXMpKVxyXG5cclxuICAgICAgICAvLyBjaGVjayBwYWRkbGUgYWdhaW5zdCBib3VuZGFyeVxyXG4gICAgICAgIGlmIChwYWRkbGVCb3VuZHMubWluLnggPCB0aGlzLmZpZWxkTGVmdCB8fCBwYWRkbGVCb3VuZHMubWF4LnggPiB0aGlzLmZpZWxkUmlnaHQpIHtcclxuICAgICAgICAgICAgdGhpcy5wYWRkbGUudmVsb2NpdHkgPSBuZXcgZ2VvLlZlYzMoMCwgMCwgMClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGJhbGwgLyBwYWRkbGUgaGl0IGNoZWNrXHJcbiAgICAgICAgaWYgKGJhbGxCb3VuZHMub3ZlcmxhcHMocGFkZGxlQm91bmRzKSkge1xyXG4gICAgICAgICAgICBsZXQgdmVsb2NpdHkgPSB0aGlzLmJhbGwudmVsb2NpdHlcclxuICAgICAgICAgICAgdmVsb2NpdHkueSA9IC12ZWxvY2l0eS55XHJcblxyXG4gICAgICAgICAgICAvLyBhbGxvdyBwbGF5ZXIgc29tZSBjb250cm9sXHJcbiAgICAgICAgICAgIC8vIHJpZ2h0IHNpZGUgb2YgcGFkZGxlIHJvdGF0ZXMgYW5nbGUgcmlnaHRcclxuICAgICAgICAgICAgLy8gbGVmdCBzaWRlIG9mIHBhZGRsZSByb3RhdGVzIGFuZ2xlIGxlZnRcclxuICAgICAgICAgICAgY29uc3QgYWFiYiA9IGdlby5BQUJCLmZyb21Qb3NpdGlvbkhhbGZFeHRlbnRzKHBhZGRsZVBvc2l0aW9uLCB0aGlzLnBhZGRsZS5oYWxmRXh0ZW50cylcclxuICAgICAgICAgICAgY29uc3QgbmVhcmVzdCA9IGJhbGxQb3NpdGlvbi5jbGFtcChhYWJiLm1pbiwgYWFiYi5tYXgpXHJcbiAgICAgICAgICAgIGNvbnN0IHQgPSBtYXRoLnVubGVycChhYWJiLm1pbi54LCBhYWJiLm1heC54LCBuZWFyZXN0LngpXHJcbiAgICAgICAgICAgIGNvbnN0IHJvdCA9IGdlby5NYXQ0LnJvdGF0aW9uWihtYXRoLmxlcnAoLU1hdGguUEkgLyA0LCBNYXRoLlBJIC8gNCwgdCkpXHJcblxyXG4gICAgICAgICAgICAvLyBjaG9vc2UgYSByYW5kb20gZGV2aWF0aW9uIGZyb20gc3RhbmRhcmQgcmVmbGVjdGlvbiBhbmdsZVxyXG4gICAgICAgICAgICB2ZWxvY2l0eSA9IHJvdC50cmFuc2Zvcm0zKHZlbG9jaXR5KVxyXG4gICAgICAgICAgICB2ZWxvY2l0eS56ID0gMFxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB2ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKHRoaXMuYmFsbFNwZWVkKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaGFuZGxlIGJyaWNrIGhpdFxyXG4gICAgICAgIGNvbnN0IG5lYXJlc3RCcmljayA9IHRoaXMuZmluZE5lYXJlc3RCcmljayhiYWxsUG9zaXRpb24sIHRoaXMuYmFsbC5yYWRpdXMpXHJcbiAgICAgICAgaWYgKG5lYXJlc3RCcmljaykge1xyXG4gICAgICAgICAgICBjb25zdCBhYWJiID0gZ2VvLkFBQkIuZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMobmVhcmVzdEJyaWNrLnBvc2l0aW9uLCBCcmljay5oYWxmRXh0ZW50cylcclxuICAgICAgICAgICAgY29uc3QgbmVhcmVzdFB0ID0gdGhpcy5maW5kTmVhcmVzdFBvaW50T25CcmljayhuZWFyZXN0QnJpY2ssIGJhbGxQb3NpdGlvbilcclxuICAgICAgICAgICAgbGV0IHZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5XHJcblxyXG4gICAgICAgICAgICBpZiAobmVhcmVzdFB0LnkgPD0gYWFiYi5taW4ueSArIC4wMSkge1xyXG4gICAgICAgICAgICAgICAgdmVsb2NpdHkueSA9IC12ZWxvY2l0eS55XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChuZWFyZXN0UHQueCA8PSBhYWJiLm1pbi54ICsgLjAxKSB7XHJcbiAgICAgICAgICAgICAgICB2ZWxvY2l0eS54ID0gLXZlbG9jaXR5LnhcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG5lYXJlc3RQdC54ID49IGFhYmIubWF4LnggLSAuMDEpIHtcclxuICAgICAgICAgICAgICAgIHZlbG9jaXR5LnggPSAtdmVsb2NpdHkueFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobmVhcmVzdFB0LnkgPiBhYWJiLm1heC55IC0gLjAxKSB7XHJcbiAgICAgICAgICAgICAgICB2ZWxvY2l0eS55ID0gLXZlbG9jaXR5LnlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gdmVsb2NpdHkubm9ybWFsaXplKCkubXVsWCh0aGlzLmJhbGxTcGVlZClcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5LnogPSAwXHJcbiAgICAgICAgICAgIHRoaXMuYnJpY2tzLmRlbGV0ZShuZWFyZXN0QnJpY2spXHJcbiAgICAgICAgICAgIHRoaXMucGxheUltcGFjdFNvdW5kKClcclxuXHJcbiAgICAgICAgICAgIC8vIGlmIG5vIGJyaWNrcywgbW92ZSB0byBuZXh0IGxldmVsXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJyaWNrcy5zaXplID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndhaXQobmV4dExldmVsTWVzc2FnZSwgKCkgPT4gdGhpcy5uZXh0TGV2ZWwoKSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaXMgYmFsbCBnb2luZyB0byBjcm9zcyBib3VuZGFyeT9cclxuICAgICAgICBpZiAoYmFsbEJvdW5kcy5taW4ueCA8IGJvdW5kcy5taW4ueCB8fCBiYWxsQm91bmRzLm1heC54ID4gYm91bmRzLm1heC54KSB7XHJcbiAgICAgICAgICAgIGxldCB2ZWxvY2l0eSA9IHRoaXMuYmFsbC52ZWxvY2l0eVxyXG4gICAgICAgICAgICB2ZWxvY2l0eS54ID0gLXZlbG9jaXR5LnhcclxuICAgICAgICAgICAgdmVsb2NpdHkueiA9IDBcclxuICAgICAgICAgICAgdGhpcy5iYWxsLnZlbG9jaXR5ID0gdmVsb2NpdHkubm9ybWFsaXplKCkubXVsWCh0aGlzLmJhbGxTcGVlZClcclxuICAgICAgICAgICAgdGhpcy5wbGF5SW1wYWN0U291bmQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGJhbGxCb3VuZHMubWF4LnkgPiBib3VuZHMubWF4LnkpIHtcclxuICAgICAgICAgICAgbGV0IHZlbG9jaXR5ID0gdGhpcy5iYWxsLnZlbG9jaXR5XHJcbiAgICAgICAgICAgIHZlbG9jaXR5LnkgPSAtdmVsb2NpdHkueVxyXG4gICAgICAgICAgICB2ZWxvY2l0eS56ID0gMFxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB2ZWxvY2l0eS5ub3JtYWxpemUoKS5tdWxYKHRoaXMuYmFsbFNwZWVkKVxyXG4gICAgICAgICAgICB0aGlzLnBsYXlJbXBhY3RTb3VuZCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBiYWxsIG9mZiBib2FyZFxyXG4gICAgICAgIGlmIChiYWxsQm91bmRzLm1pbi55IDwgYm91bmRzLm1pbi55KSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmFsbC52ZWxvY2l0eSA9IG5ldyBnZW8uVmVjMygwLCAwLCAwKVxyXG4gICAgICAgICAgICB0aGlzLmJhbGwucG9zaXRpb24gPSBuZXcgZ2VvLlZlYzMoMCwgdGhpcy5wYWRkbGUucG9zaXRpb24ueSArIHRoaXMucGFkZGxlLmhhbGZFeHRlbnRzLnkgKyB0aGlzLmJhbGwucmFkaXVzLCB0aGlzLmJhbGwucmFkaXVzKSxcclxuICAgICAgICAgICAgdGhpcy5wbGF5SW1wYWN0U291bmQoKVxyXG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gR2FtZVN0YXRlLkxhdW5jaFxyXG4gICAgICAgICAgICB0aGlzLmJhbGxzUmVtYWluaW5nLS1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJhbGxzUmVtYWluaW5nIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2FtZU92ZXIoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjbGFtcCB5IHZlbG9jaXR5IHRvIGF2b2lkIGhvcml6b250YWwgYW5nbGVzXHJcbiAgICAgICAgaWYgKHRoaXMuYmFsbC52ZWxvY2l0eS5sZW5ndGhTcSgpID4gMCAmJiBNYXRoLmFicyh0aGlzLmJhbGwudmVsb2NpdHkueSkgPCB0aGlzLmJhbGxTcGVlZCAqIC4yNSkge1xyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkueSA9IE1hdGguc2lnbih0aGlzLmJhbGwudmVsb2NpdHkueSkgKiB0aGlzLmJhbGxTcGVlZCAqIC4yNVxyXG4gICAgICAgICAgICB0aGlzLmJhbGwudmVsb2NpdHkgPSB0aGlzLmJhbGwudmVsb2NpdHkubm9ybWFsaXplKCkubXVsWCh0aGlzLmJhbGxTcGVlZClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnYW1lT3ZlcigpIHtcclxuICAgICAgICB0aGlzLmJhbGxzUmVtYWluaW5nID0gM1xyXG4gICAgICAgIHRoaXMubGV2ZWwgPSAxXHJcbiAgICAgICAgdGhpcy53YWl0KGdhbWVPdmVyTWVzc2FnZSwgKCkgPT4gdGhpcy5pbml0TGV2ZWwoKSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG5leHRMZXZlbCgpIHtcclxuICAgICAgICB0aGlzLmxldmVsKytcclxuICAgICAgICB0aGlzLmluaXRMZXZlbCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB3YWl0KG1zZzogc3RyaW5nLCBmOiAoKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gbXNnXHJcbiAgICAgICAgdGhpcy5jb250aW51ZSA9IGZcclxuICAgICAgICB0aGlzLnN0YXRlID0gR2FtZVN0YXRlLldhaXRcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGluaXRMZXZlbCgpIHtcclxuICAgICAgICB0aGlzLmJyaWNrcy5jbGVhcigpXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IEdhbWVTdGF0ZS5MYXVuY2hcclxuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBzdGFydE1lc3NhZ2VcclxuXHJcbiAgICAgICAgLy8gcGxheWluZyBmaWVsZFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc3QgaXhtID0gbmV3IGdmeC5JeE1lc2goKVxyXG5cclxuICAgICAgICAgICAgLy8gZmxvb3JcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmxvb3IgPSBnZnguSXhNZXNoLnJlY3RGcm9tQ29vcmRzKHRoaXMuZmllbGRMZWZ0LCB0aGlzLmZpZWxkQm90dG9tLCAtLjI1LCB0aGlzLmZpZWxkUmlnaHQsIHRoaXMuZmllbGRUb3AsIDApXHJcbiAgICAgICAgICAgICAgICBmbG9vci52ZXJ0aWNlcy5mb3JFYWNoKHYgPT4gdi5jb2xvciA9IG5ldyBnZW8uVmVjNCguNSwgLjUsIC41LCAuNSkpXHJcbiAgICAgICAgICAgICAgICBpeG0uY2F0KGZsb29yKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBib3JkZXJcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgd2FsbHMgPSBuZXcgZ2Z4Lkl4TWVzaCgpXHJcbiAgICAgICAgICAgICAgICB3YWxscy5jYXQoZ2Z4Lkl4TWVzaC5yZWN0RnJvbUNvb3Jkcyh0aGlzLmZpZWxkTGVmdCAtIGJvcmRlcldpZHRoLCB0aGlzLmZpZWxkQm90dG9tLCAtLjI1LCB0aGlzLmZpZWxkTGVmdCwgdGhpcy5maWVsZFRvcCwgMSkpXHJcbiAgICAgICAgICAgICAgICB3YWxscy5jYXQoZ2Z4Lkl4TWVzaC5yZWN0RnJvbUNvb3Jkcyh0aGlzLmZpZWxkUmlnaHQsIHRoaXMuZmllbGRCb3R0b20sIC0uMjUsIHRoaXMuZmllbGRSaWdodCArIGJvcmRlcldpZHRoLCB0aGlzLmZpZWxkVG9wLCAxKSlcclxuICAgICAgICAgICAgICAgIHdhbGxzLmNhdChnZnguSXhNZXNoLnJlY3RGcm9tQ29vcmRzKHRoaXMuZmllbGRMZWZ0IC0gYm9yZGVyV2lkdGgsIHRoaXMuZmllbGRUb3AsIC0uMjUsIHRoaXMuZmllbGRSaWdodCArIGJvcmRlcldpZHRoLCB0aGlzLmZpZWxkVG9wICsgYm9yZGVyV2lkdGgsIDEpKVxyXG4gICAgICAgICAgICAgICAgd2FsbHMudmVydGljZXMuZm9yRWFjaCh2ID0+IHYuY29sb3IgPSBuZXcgZ2VvLlZlYzQoMSwgMCwgMCwgMSkpXHJcbiAgICAgICAgICAgICAgICBpeG0uY2F0KHdhbGxzKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCB2YW8gPSB0aGlzLnJlbmRlcmVyLmNyZWF0ZU1lc2goaXhtKVxyXG4gICAgICAgICAgICB0aGlzLmZpZWxkQmF0Y2ggPSBuZXcgZ2Z4LkJhdGNoKHtcclxuICAgICAgICAgICAgICAgIHZhbzogdmFvLFxyXG4gICAgICAgICAgICAgICAgbnVtSW5kaWNlczogaXhtLmluZGljZXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgcm91Z2huZXNzOiAxXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBicmlja3NcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IGJyaWNrSGFsZldpZHRoID0gYnJpY2tXaWR0aCAvIDJcclxuICAgICAgICAgICAgY29uc3QgYnJpY2tIYWxmSGVpZ2h0ID0gYnJpY2tIZWlnaHQgLyAyXHJcbiAgICAgICAgICAgIGNvbnN0IGJyaWNrSGFsZkRlcHRoID0gYnJpY2tEZXB0aCAvIDJcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkWE9mZnNldCA9IHRoaXMuZmllbGRMZWZ0ICsgQnJpY2suaGFsZkV4dGVudHMueFxyXG4gICAgICAgICAgICBjb25zdCBmaWVsZFlPZmZzZXQgPSB0aGlzLmZpZWxkVG9wIC0gdG9wUm93TWFyZ2luIC0gYnJpY2tIZWlnaHQgKiB0aGlzLmJyaWNrUm93c1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmJyaWNrUm93czsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB5T2Zmc2V0ID0gZmllbGRZT2Zmc2V0ICsgaSAqIGJyaWNrSGVpZ2h0ICsgYnJpY2tNYXJnaW5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhpcy5icmlja0NvbHM7ICsraikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHhPZmZzZXQgPSBmaWVsZFhPZmZzZXQgKyBqICogKGJyaWNrV2lkdGggKyBicmlja01hcmdpbilcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBicmlja01pbiA9IG5ldyBnZW8uVmVjMygtYnJpY2tIYWxmV2lkdGggKyBicmlja01hcmdpbiwgLWJyaWNrSGFsZkhlaWdodCArIGJyaWNrTWFyZ2luLCAtYnJpY2tIYWxmRGVwdGgpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYnJpY2tNYXggPSBuZXcgZ2VvLlZlYzMoYnJpY2tIYWxmV2lkdGggLSBicmlja01hcmdpbiwgYnJpY2tIYWxmSGVpZ2h0IC0gYnJpY2tNYXJnaW4sIGJyaWNrSGFsZkRlcHRoKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFhYmIgPSBuZXcgZ2VvLkFBQkIoYnJpY2tNaW4sIGJyaWNrTWF4KVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGl4bSA9IGdmeC5JeE1lc2gucmVjdChhYWJiKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvc2l0aW9uID0gbmV3IGdlby5WZWMzKHhPZmZzZXQsIHlPZmZzZXQsIGJyaWNrSGFsZkRlcHRoKVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBicmljayA9IG5ldyBCcmljayh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYmF0Y2g6IG5ldyBnZnguQmF0Y2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ybGRNYXRyaXg6IGdlby5NYXQ0LnRyYW5zbGF0aW9uKHBvc2l0aW9uKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZ1c2VDb2xvcjogcmFuZC5jaG9vc2UoYnJpY2tDb2xvcnMpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcm91Z2huZXNzOiAuOCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbzogdGhpcy5yZW5kZXJlci5jcmVhdGVNZXNoKGl4bSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1JbmRpY2VzOiBpeG0uaW5kaWNlcy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5icmlja3MuYWRkKGJyaWNrKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhZGQgcGFkZGxlXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCB3aWR0aCA9IHBhZGRsZVdpZHRoQnlMZXZlbFt0aGlzLmxldmVsIC0gMV1cclxuICAgICAgICAgICAgY29uc3QgaGFsZkV4dGVudHMgPSBuZXcgZ2VvLlZlYzMod2lkdGggLyAyLCBwYWRkbGVIZWlnaHQgLyAyLCBwYWRkbGVEZXB0aCAvIDIpXHJcbiAgICAgICAgICAgIGNvbnN0IGFhYmIgPSBnZW8uQUFCQi5mcm9tSGFsZkV4dGVudHMoaGFsZkV4dGVudHMpXHJcbiAgICAgICAgICAgIGNvbnN0IGl4bSA9IGdmeC5JeE1lc2gucmVjdChhYWJiKVxyXG4gICAgICAgICAgICBpeG0udmVydGljZXMuZm9yRWFjaCh2ID0+IHYuY29sb3IgPSBuZXcgZ2VvLlZlYzQoMCwgMSwgMSwgMSkpXHJcblxyXG4gICAgICAgICAgICBjb25zdCB2YW8gPSB0aGlzLnJlbmRlcmVyLmNyZWF0ZU1lc2goaXhtKVxyXG4gICAgICAgICAgICB0aGlzLnBhZGRsZSA9IG5ldyBQYWRkbGUoe1xyXG4gICAgICAgICAgICAgICAgaGFsZkV4dGVudHM6IGhhbGZFeHRlbnRzLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5ldyBnZW8uVmVjMygwLCB0aGlzLmZpZWxkQm90dG9tICsgaGFsZkV4dGVudHMueSArIHBhZGRsZUJvdHRvbU1hcmdpbiwgaGFsZkV4dGVudHMueiksXHJcbiAgICAgICAgICAgICAgICBiYXRjaDogbmV3IGdmeC5CYXRjaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFvLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdWdobmVzczogLjUsXHJcbiAgICAgICAgICAgICAgICAgICAgbnVtSW5kaWNlczogaXhtLmluZGljZXMubGVuZ3RoXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYWRkIGJhbGxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJhZGl1cyA9IGJhbGxSYWRpdXNCeUxldmVsW3RoaXMubGV2ZWwgLSAxXVxyXG4gICAgICAgICAgICBjb25zdCBpeG0gPSBnZnguSXhNZXNoLnNwaGVyZSgxNiwgMTYpXHJcbiAgICAgICAgICAgIGl4bS50cmFuc2Zvcm0oZ2VvLk1hdDQuc2NhbGluZyhuZXcgZ2VvLlZlYzMocmFkaXVzLCByYWRpdXMsIHJhZGl1cykpKVxyXG4gICAgICAgICAgICBpeG0udmVydGljZXMuZm9yRWFjaCh2ID0+IHYuY29sb3IgPSBuZXcgZ2VvLlZlYzQoMCwgMCwgMSwgMSkpXHJcblxyXG4gICAgICAgICAgICBjb25zdCB2YW8gPSB0aGlzLnJlbmRlcmVyLmNyZWF0ZU1lc2goaXhtKVxyXG4gICAgICAgICAgICB0aGlzLmJhbGwgPSBuZXcgQmFsbCh7XHJcbiAgICAgICAgICAgICAgICByYWRpdXM6IHJhZGl1cyxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBuZXcgZ2VvLlZlYzMoMCwgdGhpcy5wYWRkbGUucG9zaXRpb24ueSArIHRoaXMucGFkZGxlLmhhbGZFeHRlbnRzLnkgKyByYWRpdXMsIHJhZGl1cyksXHJcbiAgICAgICAgICAgICAgICBiYXRjaDogbmV3IGdmeC5CYXRjaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFvLFxyXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldDogMCxcclxuICAgICAgICAgICAgICAgICAgICByb3VnaG5lc3M6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgbnVtSW5kaWNlczogaXhtLmluZGljZXMubGVuZ3RoXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHBsYXlJbXBhY3RTb3VuZCgpOiB2b2lkIHtcclxuICAgICAgICBjb25zdCBzb3VuZCA9IHJhbmQuY2hvb3NlKHRoaXMuaW1wYWN0U291bmRzKVxyXG4gICAgICAgIGNvbnN0IHNyYyA9IHRoaXMuYWMuY3JlYXRlQnVmZmVyU291cmNlKClcclxuICAgICAgICBzcmMuYnVmZmVyID0gc291bmRcclxuICAgICAgICBzcmMuY29ubmVjdCh0aGlzLmFjLmRlc3RpbmF0aW9uKVxyXG4gICAgICAgIHNyYy5zdGFydCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmaW5kTmVhcmVzdFBvaW50T25CcmljayhicmljazogQnJpY2ssIHBvc2l0aW9uOiBnZW8uVmVjMyk6IGdlby5WZWMzIHtcclxuICAgICAgICBjb25zdCBhYWJiID0gZ2VvLkFBQkIuZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMoYnJpY2sucG9zaXRpb24sIEJyaWNrLmhhbGZFeHRlbnRzKVxyXG4gICAgICAgIGNvbnN0IG5lYXJlc3QgPSBwb3NpdGlvbi5jbGFtcChhYWJiLm1pbiwgYWFiYi5tYXgpXHJcbiAgICAgICAgcmV0dXJuIG5lYXJlc3RcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZpbmROZWFyZXN0QnJpY2socG9zaXRpb246IGdlby5WZWMzLCByYWRpdXM6IG51bWJlcik6IEJyaWNrIHwgbnVsbCB7XHJcbiAgICAgICAgY29uc3QgcjIgPSByYWRpdXMgKiByYWRpdXNcclxuICAgICAgICBsZXQgbWluRGlzdFNxID0gcjJcclxuICAgICAgICBsZXQgbmVhcmVzdEJyaWNrOiBCcmljayB8IG51bGwgPSBudWxsXHJcbiAgICAgICAgZm9yIChjb25zdCBicmljayBvZiB0aGlzLmJyaWNrcykge1xyXG4gICAgICAgICAgICBjb25zdCBuZWFyZXN0UHQgPSB0aGlzLmZpbmROZWFyZXN0UG9pbnRPbkJyaWNrKGJyaWNrLCBwb3NpdGlvbilcclxuICAgICAgICAgICAgY29uc3QgZGlzdFNxID0gbmVhcmVzdFB0LnN1Yihwb3NpdGlvbikubGVuZ3RoU3EoKVxyXG4gICAgICAgICAgICBpZiAoZGlzdFNxIDwgbWluRGlzdFNxKSB7XHJcbiAgICAgICAgICAgICAgICBuZWFyZXN0QnJpY2sgPSBicmlja1xyXG4gICAgICAgICAgICAgICAgbWluRGlzdFNxID0gZGlzdFNxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBuZWFyZXN0QnJpY2tcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZVdvcmxkTWF0cmljZXMoKSB7XHJcbiAgICAgICAgdGhpcy5iYWxsLmJhdGNoLndvcmxkTWF0cml4ID0gZ2VvLk1hdDQudHJhbnNsYXRpb24odGhpcy5iYWxsLnBvc2l0aW9uKVxyXG4gICAgICAgIHRoaXMucGFkZGxlLmJhdGNoLndvcmxkTWF0cml4ID0gZ2VvLk1hdDQudHJhbnNsYXRpb24odGhpcy5wYWRkbGUucG9zaXRpb24pXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkcmF3U2NlbmUoKSB7XHJcbiAgICAgICAgLy8gY29uZmlndXJlIGNhbWVyYSAtIGZpdCBwbGF5IGFyZWEgdG8gc2NyZWVuIHdpdGggc29tZSBzbWFsbCBtYXJnaW5cclxuICAgICAgICBsZXQgeiA9IDBcclxuICAgICAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmZpZWxkVG9wIC0gdGhpcy5maWVsZEJvdHRvbSArIGJvcmRlcldpZHRoICogMlxyXG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5maWVsZFJpZ2h0IC0gdGhpcy5maWVsZExlZnQgKyBib3JkZXJXaWR0aCAqIDJcclxuICAgICAgICBjb25zdCBmaWVsZEFzcGVjdCA9IHdpZHRoIC8gaGVpZ2h0XHJcbiAgICAgICAgaWYgKGZpZWxkQXNwZWN0IDwgdGhpcy5yZW5kZXJlci5hc3BlY3QpIHtcclxuICAgICAgICAgICAgeiA9IGhlaWdodCAvIDIgLyBNYXRoLnRhbih0aGlzLnJlbmRlcmVyLmZvdiAvIDIpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgeiA9IHdpZHRoIC8gMiAvIE1hdGgudGFuKHRoaXMucmVuZGVyZXIuZm92ICogdGhpcy5yZW5kZXJlci5hc3BlY3QgLyAyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIudmlld01hdHJpeCA9IGdlby5NYXQ0Lmxvb2tBdChcclxuICAgICAgICAgICAgbmV3IGdlby5WZWMzKDAsIDAsIDEgKyB6KSwgbmV3IGdlby5WZWMzKDAsIDAsIC0xKSwgbmV3IGdlby5WZWMzKDAsIDEsIDApKS5pbnZlcnQoKVxyXG5cclxuICAgICAgICAvLyBzaG93IGZyb20gc2lkZSB2aWV3IGZvciBkZWJ1Z2dpbmdcclxuICAgICAgICAvLyB0aGlzLnJlbmRlcmVyLnZpZXdNYXRyaXggPSBnZW8uTWF0NC5sb29rQXQoXHJcbiAgICAgICAgLy8gICAgIG5ldyBnZW8uVmVjMygwLCAtMTYsIDApLCBuZXcgZ2VvLlZlYzMoMCwgMSwgMCksIG5ldyBnZW8uVmVjMygwLCAwLCAxKSkuaW52ZXJ0KClcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5kcmF3QmF0Y2godGhpcy5maWVsZEJhdGNoKVxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIuZHJhd0JhdGNoKHRoaXMuYmFsbC5iYXRjaClcclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdCYXRjaCh0aGlzLnBhZGRsZS5iYXRjaClcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBicmljayBvZiB0aGlzLmJyaWNrcykge1xyXG4gICAgICAgICAgICB0aGlzLnJlbmRlcmVyLmRyYXdCYXRjaChicmljay5iYXRjaClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIucHJlc2VudCgpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYW52YXNUb05EQyhjYzogZ2VvLlZlYzIpOiBnZW8uVmVjMiB7XHJcbiAgICAgICAgY29uc3QgbmRjID0gbmV3IGdlby5WZWMyKFxyXG4gICAgICAgICAgICBjYy54IC8gdGhpcy5jYW52YXMud2lkdGggKiAyIC0gMSxcclxuICAgICAgICAgICAgLWNjLnkgLyB0aGlzLmNhbnZhcy5oZWlnaHQgKiAyICsgMVxyXG4gICAgICAgIClcclxuXHJcbiAgICAgICAgcmV0dXJuIG5kY1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FudmFzVG9ORENSYXkoY2M6IGdlby5WZWMyKTogZ2VvLlJheSB7XHJcbiAgICAgICAgY29uc3QgbmRjID0gdGhpcy5jYW52YXNUb05EQyhjYylcclxuICAgICAgICBjb25zdCByYXkgPSBuZXcgZ2VvLlJheShuZXcgZ2VvLlZlYzMobmRjLngsIG5kYy55LCAtMSksIG5ldyBnZW8uVmVjMygwLCAwLCAxKSlcclxuICAgICAgICByZXR1cm4gcmF5XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYW52YXNUb1dvcmxkUmF5KGNjOiBnZW8uVmVjMik6IGdlby5SYXkge1xyXG4gICAgICAgIGNvbnN0IG5kY1JheSA9IHRoaXMuY2FudmFzVG9ORENSYXkoY2MpXHJcbiAgICAgICAgY29uc3QgaW52UHJvaiA9IHRoaXMucmVuZGVyZXIucHJvamVjdGlvbk1hdHJpeC5pbnZlcnQoKVxyXG4gICAgICAgIGNvbnN0IGludlZpZXcgPSB0aGlzLnJlbmRlcmVyLnZpZXdNYXRyaXguaW52ZXJ0KClcclxuICAgICAgICBjb25zdCBpbnZWaWV3UHJvaiA9IHRoaXMucmVuZGVyZXIucHJvamVjdGlvbk1hdHJpeC5tYXRtdWwodGhpcy5yZW5kZXJlci52aWV3TWF0cml4KS5pbnZlcnQoKVxyXG4gICAgICAgIGNvbnN0IHZpZXdSYXkgPSBuZGNSYXkudHJhbnNmb3JtKGludlByb2opXHJcbiAgICAgICAgY29uc3Qgd29ybGRSYXkgPSB2aWV3UmF5LnRyYW5zZm9ybShpbnZWaWV3KVxyXG5cclxuICAgICAgICBpZiAodGhpcy5pbnAubW91c2VMZWZ0UmVsZWFzZWQpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJjYzogXCIsIGNjLnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibmRjOiBcIiwgbmRjUmF5LnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidmlldzogXCIsIHZpZXdSYXkudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ3b3JsZDogXCIsIHdvcmxkUmF5LnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid29ybGQyOiBcIiwgbmRjUmF5LnRyYW5zZm9ybShpbnZWaWV3UHJvaikudG9TdHJpbmcoKSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB3b3JsZFJheVxyXG4gICAgfVxyXG59XHJcblxyXG5jb25zdCBhcHAgPSBuZXcgQXBwKClcclxuYXBwLmV4ZWMoKVxyXG4iXX0=