import * as util from "../shared/util.js"
import * as glu from "./glu.js"

const vertexSrc = `#version 300 es
precision mediump float;
in vec4 in_position;

void main() {
    gl_Position = in_position;
}
`
const fragmentSrc = `#version 300 es
precision mediump float;
uniform vec2 scroll_offset;
out vec4 out_color;

${glu.perlin2}

int mmod(const int n, const int M) {
    return ((n % M) + M) % M;
}

ivec2 mmod(const ivec2 n, const ivec2 M) {
    return ((n % M) + M) % M;
}

float grid_line_dist(const vec2 xy, const int interval, const float width) {
    vec2 mxy = vec2(mmod(ivec2(xy), ivec2(interval, interval)));
    mxy = clamp(mxy, vec2(0, 0), vec2(width, width));
    vec2 dxy = vec2(width, width) - mxy;
    return max(dxy.x, dxy.y) / float(width);
}

void main() {
    vec2 xy = gl_FragCoord.xy + scroll_offset.xy;
    float freq = 16.f / 512.f;
    float v = fbm2(freq * xy.x, freq * xy.y, 2.f, .5f, 5) / 32.f;
    vec4 bg = vec4(.9 + v,.9 + v,.9 + v,1);
    float d1 = grid_line_dist(xy, 128, 3.f);
    float d2 = grid_line_dist(xy, 32, 1.f);
    vec3 a = mix(bg.rgb, vec3(0, 0, 1), d1);
    vec3 b = mix(a, vec3(0, 0, 1), d2);
    out_color = vec4(b, 1);
}
`

const canvas = util.byId("canvas") as HTMLCanvasElement
const errorsDiv = util.byId("errors");
const acquireImage = util.byId("acquireImage") as HTMLButtonElement

init()

interface Point {
    x: number,
    y: number
}

interface GameState {
    gl: WebGL2RenderingContext
    program: WebGLProgram
    vao: WebGLVertexArrayObject,
    scrollOffsetLocation: WebGLUniformLocation,
    scrollOffset: Point,
    keyState: Record<string, boolean>
}

function init() {
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    clearErrorMessages()
    const gs = createGameState()

    canvas.addEventListener("keydown", (ev) => handleKeyDown(ev, gs.keyState))
    canvas.addEventListener("keyup", (ev) => handleKeyUp(ev, gs.keyState))
    acquireImage.addEventListener("click", handleAcquireImageClick)

    requestAnimationFrame(() => {
        tick(gs)
    })
}

function createGameState(): GameState {
    const gl = canvas.getContext("webgl2")
    if (!gl) {
        throw new Error("Failed to not initialize webgl 2.0. Confirm that your browser is up to date and has support.")
    }

    clearErrorMessages()

    // compile program, get uniform locations
    const program = glu.compileProgram(gl, vertexSrc, fragmentSrc)
    const scrollOffsetLocation = glu.getUniformLocation(gl, program, "scroll_offset")

    const positionBuffer = gl.createBuffer()
    if (!positionBuffer) {
        throw new Error("Failed to create buffer")
    }

    const positions = [-1, -1, 1, -1, 1, 1, -1, 1]
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

    const indexBuffer = gl.createBuffer()
    if (!indexBuffer) {
        throw new Error("Failed to create index buffer")
    }

    const vao = gl.createVertexArray()
    if (!vao) {
        throw new Error("failed to create vertex array object")
    }

    const positionAttributeIndex = gl.getAttribLocation(program, "in_position")
    if (positionAttributeIndex < 0) {
        throwError("in_position attribute was not found")
    }

    gl.bindVertexArray(vao)

    const indices = [0, 1, 2, 0, 2, 3]
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)

    gl.vertexAttribPointer(positionAttributeIndex, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(positionAttributeIndex)

    return {
        gl: gl,
        program: program,
        vao: vao,
        scrollOffsetLocation: scrollOffsetLocation,
        scrollOffset: { x: 0, y: 0 },
        keyState: {}
    }
}

function tick(gs: GameState) {
    processInput(gs)
    renderFrame(gs)
    requestAnimationFrame(() => tick(gs))
}

function processInput(gs: GameState) {
    if (gs.keyState["w"]) {
        gs.scrollOffset.y += 1
    }

    if (gs.keyState["s"]) {
        gs.scrollOffset.y -= 1
    }

    if (gs.keyState["a"]) {
        gs.scrollOffset.x -= 1
    }

    if (gs.keyState["d"]) {
        gs.scrollOffset.x += 1
    }
}

function renderFrame(gs: GameState) {
    const { gl, program, vao } = gs
    checkResize()
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.uniform2f(gs.scrollOffsetLocation, gs.scrollOffset.x, gs.scrollOffset.y)
    gl.bindVertexArray(vao)
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
}

function checkResize() {
    if (canvas.width == canvas.clientWidth && canvas.height == canvas.clientHeight) {
        return
    }

    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
}

function clearErrorMessages() {
    canvas.hidden = false
    util.removeAllChildren(errorsDiv)
}

function appendErrorMessage(error: string) {
    console.log(error)
    const div = document.createElement("div");
    div.classList.add("error-message")
    div.textContent = error
    errorsDiv.appendChild(div)
    canvas.hidden = true
}

function throwError(message: string) {
    appendErrorMessage(message)
    throw new Error(message)
}

function handleKeyDown(ev: KeyboardEvent, keyState: Record<string, boolean>) {
    keyState[ev.key] = true
}

function handleKeyUp(ev: KeyboardEvent, keyState: Record<string, boolean>) {
    keyState[ev.key] = false
}

function handleAcquireImageClick() {
    navigator.mediaDevices.getUserMedia({video: true})
}