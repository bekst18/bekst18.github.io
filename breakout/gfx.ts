import * as glu from "../shared/glu.js"
import * as geo from "../shared/geo3d.js"
import * as array from "../shared/array.js"

const vertexSrc = `#version 300 es
precision mediump float;
uniform mat4 world_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;
in vec3 vert_position;
in vec3 vert_normal;
in vec4 vert_color;
out vec3 frag_normal;
out vec4 frag_color;

void main() {
    frag_color = vert_color;
    frag_normal - vert_normal;
    gl_Position = projection_matrix * view_matrix * world_matrix * vec4(vert_position, 1.f);
}`

const fragmentSrc = `#version 300 es
precision highp float;
precision highp sampler2D;
precision highp sampler2DArray;

in vec4 frag_color;
in vec3 frag_normal;
out vec4 out_color;

void main() {
    out_color = frag_color;
}`

export interface Vertex {
    position: geo.Vec3
    normal: geo.Vec3
    color: geo.Vec4
}

export interface IxMesh {
    vertices: Vertex[]
    indices: number[]
}

export interface MeshData {
    vertices: Vertex[]
    indices: number[]
    indexOffset: number
}

export interface Batch {
    worldMatrix: geo.Mat4
    vao: WebGLVertexArrayObject
    offset: number
    numIndices: number
}

const elemsPerVertex = 10
const vertexStride = elemsPerVertex * 4

export class Renderer {
    private readonly gl: WebGL2RenderingContext
    private readonly program: WebGLProgram
    private readonly worldMatrixLoc: WebGLUniformLocation
    private readonly viewMatrixLoc: WebGLUniformLocation
    private readonly projectionMatrixLoc: WebGLUniformLocation
    public projectionMatrix: geo.Mat4 = geo.Mat4.identity()
    public viewMatrix: geo.Mat4 = geo.Mat4.identity()
    private batches: Batch[] = []

    constructor(private readonly canvas: HTMLCanvasElement) {
        this.gl = glu.createContext(this.canvas)
        const gl = this.gl
        this.program = glu.compileProgram(gl, vertexSrc, fragmentSrc)
        this.worldMatrixLoc = glu.getUniformLocation(gl, this.program, "world_matrix")
        this.viewMatrixLoc = glu.getUniformLocation(gl, this.program, "view_matrix")
        this.projectionMatrixLoc = glu.getUniformLocation(gl, this.program, "projection_matrix")
    }

    public present() {
        const gl = this.gl

        this.projectionMatrix = geo.Mat4.perspective(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 1, 100)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        this.renderBatches()
    }

    public createMesh(mesh: IxMesh): WebGLVertexArrayObject {
        // for now - place single triangle into vertex buffer
        const gl = this.gl
        const vbo = glu.createBuffer(gl)
        const ibo = glu.createBuffer(gl)
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
        gl.bufferData(gl.ARRAY_BUFFER, toFloatArray(mesh.vertices), gl.STATIC_DRAW)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mesh.indices), gl.STATIC_DRAW)
        return this.createVao(vbo, ibo)
    }

    public drawBatch(batch: Batch) {
        this.batches.push(batch)
    }

    private createVao(vbo: WebGLBuffer, ibo: WebGLBuffer): WebGLVertexArrayObject {
        const { gl, program } = this
        const vao = glu.createVertexArray(gl)
        gl.bindVertexArray(vao)

        const positionAttribIdx = glu.getAttribLocation(gl, program, "vert_position")
        const normalAttribIdx = glu.getAttribLocation(gl, program, "vert_normal")
        const colorAttribIdx = glu.getAttribLocation(gl, program, "vert_color")
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
        gl.enableVertexAttribArray(positionAttribIdx)
        gl.enableVertexAttribArray(normalAttribIdx)
        gl.enableVertexAttribArray(colorAttribIdx)
        gl.vertexAttribPointer(positionAttribIdx, 3, gl.FLOAT, false, vertexStride, 0)
        gl.vertexAttribPointer(normalAttribIdx, 3, gl.FLOAT, false, vertexStride, 12)
        gl.vertexAttribPointer(colorAttribIdx, 4, gl.FLOAT, false, vertexStride, 24)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
        return vao
    }

    private renderBatches() {
        const gl = this.gl
        gl.useProgram(this.program)
        gl.uniformMatrix4fv(this.projectionMatrixLoc, false, this.projectionMatrix.toArray())
        gl.uniformMatrix4fv(this.viewMatrixLoc, false, this.viewMatrix.toArray())

        for (const batch of this.batches) {
            gl.uniformMatrix4fv(this.worldMatrixLoc, false, batch.worldMatrix.toArray())
            gl.bindVertexArray(batch.vao)
            gl.drawElements(gl.TRIANGLES, batch.numIndices, gl.UNSIGNED_INT, batch.offset)
        }

        this.batches = []
    }
}

function toFloatArray(vertices: Vertex[]): Float32Array {
    const a = new Float32Array(vertices.flatMap(v => [
        v.position.x, v.position.y, v.position.z,
        v.normal.x, v.normal.y, v.normal.z,
        v.color.x, v.color.y, v.color.z, v.color.w]))

    return a
}

export function cube(): IxMesh {
    // -x, +x, -y, +y, -z, +z
    const vertices = new Array<Vertex>(
        // -x
        { position: new geo.Vec3(-1, -1, -1), normal: new geo.Vec3(-1, 0, 0), color: new geo.Vec4(1, 0, 0, 1) },
        { position: new geo.Vec3(-1, -1, 1), normal: new geo.Vec3(-1, 0, 0), color: new geo.Vec4(1, 0, 0, 1) },
        { position: new geo.Vec3(-1, 1, 1), normal: new geo.Vec3(-1, 0, 0), color: new geo.Vec4(1, 0, 0, 1) },
        { position: new geo.Vec3(-1, 1, -1), normal: new geo.Vec3(-1, 0, 0), color: new geo.Vec4(1, 0, 0, 1) },
        // +x
        { position: new geo.Vec3(1, -1, 1), normal: new geo.Vec3(1, 0, 0), color: new geo.Vec4(0, 1, 0, 1) },
        { position: new geo.Vec3(1, -1, -1), normal: new geo.Vec3(1, 0, 0), color: new geo.Vec4(0, 1, 0, 1) },
        { position: new geo.Vec3(1, 1, -1), normal: new geo.Vec3(1, 0, 0), color: new geo.Vec4(0, 1, 0, 1) },
        { position: new geo.Vec3(1, 1, 1), normal: new geo.Vec3(1, 0, 0), color: new geo.Vec4(0, 1, 0, 1) },
        // -y
        { position: new geo.Vec3(-1, -1, 1), normal: new geo.Vec3(0, -1, 0), color: new geo.Vec4(1, 0, 0, 1) },
        { position: new geo.Vec3(-1, -1, -1), normal: new geo.Vec3(0, -1, 0), color: new geo.Vec4(1, 0, 0, 1) },
        { position: new geo.Vec3(1, -1, -1), normal: new geo.Vec3(0, -1, 0), color: new geo.Vec4(1, 0, 0, 1) },
        { position: new geo.Vec3(1, -1, 1), normal: new geo.Vec3(0, -1, 0), color: new geo.Vec4(1, 0, 0, 1) },
        // +y
        { position: new geo.Vec3(-1, 1, 1), normal: new geo.Vec3(0, 1, 0), color: new geo.Vec4(0, 1, 0, 1) },
        { position: new geo.Vec3(1, 1, 1), normal: new geo.Vec3(0, 1, 0), color: new geo.Vec4(0, 1, 0, 1) },
        { position: new geo.Vec3(1, 1, -1), normal: new geo.Vec3(0, 1, 0), color: new geo.Vec4(0, 1, 0, 1) },
        { position: new geo.Vec3(-1, 1, -1), normal: new geo.Vec3(0, 1, 0), color: new geo.Vec4(0, 1, 0, 1) },
        // -z
        { position: new geo.Vec3(-1, -1, -1), normal: new geo.Vec3(0, 0, -1), color: new geo.Vec4(1, 0, 0, 1) },
        { position: new geo.Vec3(-1, 1, -1), normal: new geo.Vec3(0, 0, -1), color: new geo.Vec4(1, 0, 0, 1) },
        { position: new geo.Vec3(1, 1, -1), normal: new geo.Vec3(0, 0, -1), color: new geo.Vec4(1, 0, 0, 1) },
        { position: new geo.Vec3(1, -1, -1), normal: new geo.Vec3(0, 0, -1), color: new geo.Vec4(1, 0, 0, 1) },
        // +z
        { position: new geo.Vec3(-1, -1, 1), normal: new geo.Vec3(0, 0, 1), color: new geo.Vec4(0, 1, 0, 1) },
        { position: new geo.Vec3(1, -1, 1), normal: new geo.Vec3(0, 0, 1), color: new geo.Vec4(0, 1, 0, 1) },
        { position: new geo.Vec3(1, 1, 1), normal: new geo.Vec3(0, 0, 1), color: new geo.Vec4(0, 1, 0, 1) },
        { position: new geo.Vec3(-1, 1, 1), normal: new geo.Vec3(0, 0, 1), color: new geo.Vec4(0, 1, 0, 1) }
    )

    return {
        vertices,
        indices: quadIndices(vertices.length / 4)
    }
}

export function sphere(rows: number, cols: number): IxMesh {
    // create north pole
    const vertices = new Array<Vertex>()
    const indices = new Array<number>()
    const northPole: Vertex = { position: new geo.Vec3(0, 1, 0), normal: new geo.Vec3(0, 1, 0), color: new geo.Vec4(1, 1, 1, 1) }
    vertices.push(northPole)

    // iterate over angles, essentially forming polar coordinates of each point
    // let theta = elevation angle above xy plane
    // let phi = xy plane angle
    const dtheta = Math.PI / rows
    const dphi = 2 * Math.PI / cols

    for (let j = 0; j < cols; ++j) {
        const phi = dphi * j
        const theta = dtheta
        const position = new geo.Vec3(
            Math.sin(theta) * Math.cos(phi),
            Math.cos(theta),
            Math.sin(theta) * Math.sin(phi)
        )

        vertices.push({ position: position, normal: new geo.Vec3(0, 1, 0), color: new geo.Vec4(1, 1, 1, 1) })

        // connect to pole to form triangle
        const base = 1
        indices.push(base + j, base + (j + 1) % cols, 0)
    }

    // for (let i = 1; i < rows; ++i) {
    //     const theta = dtheta * i
    //     for (let j = 0; j < cols; ++j) {
    //         const phi = dphi * j
    //         const position = new geo.Vec3(
    //             Math.sin(theta) * Math.cos(phi),
    //             Math.cos(theta),
    //             Math.sin(theta) * Math.sin(phi)
    //         )
    //         vertices.push({ position: position, normal: new geo.Vec3(0, 1, 0), color: new geo.Vec4(1, 1, 1, 1) })

    // create quad with above vertices
    //         if (i === 0) {

    //         } else {

    //         }
    //     }
    // }

    // create south pole
    // const southPole: Vertex = { position: new geo.Vec3(0, 1, 0), normal: new geo.Vec3(0, 1, 0), color: new geo.Vec4(1, 1, 1, 1) }

    return {
        vertices: vertices,
        indices: indices
    }
}

function quadIndices(quads: number): number[] {
    return array.generate(quads, i => [i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3]).flat()
}