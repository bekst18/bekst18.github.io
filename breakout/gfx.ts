import * as glu from "../shared/glu.js"
import * as geo from "../shared/geo3d.js"
import * as array from "../shared/array.js"
import * as iter from "../shared/iter.js"

const vertexSrc = `#version 300 es
precision mediump float;
uniform mat4 world_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;
uniform vec4 diffuse_color;

in vec3 vert_position;
in vec3 vert_normal;
in vec4 vert_color;
out vec3 frag_normal;
out vec3 frag_position;
out vec4 frag_color;

void main() {
    frag_color = vert_color * diffuse_color;
    frag_normal = mat3(world_matrix) * vert_normal;
    vec4 position_world = world_matrix * vec4(vert_position, 1.f);
    gl_Position = projection_matrix * view_matrix * position_world;
    frag_position = position_world.xyz / position_world.w;
}`

const fragmentSrc = `#version 300 es
precision highp float;
precision highp sampler2D;
precision highp sampler2DArray;

uniform vec3 eye_position;
uniform float roughness;
in vec4 frag_color;
in vec3 frag_position;
in vec3 frag_normal;
out vec4 out_color;

void main() {
    float specular_intensity = 1.f - roughness;
    float specular_pow = mix(.1f, 32.f, specular_intensity);
    vec3 surface_normal = normalize(frag_normal);
    vec3 to_light = normalize(vec3(-1, 0, 1));
    vec3 half_vec = normalize(normalize(eye_position - frag_position) + to_light);
    float ndl = clamp(dot(to_light, surface_normal), 0.f, 1.f);
    float ndh = pow(clamp(dot(half_vec, surface_normal), 0.0, 1.f), specular_pow);

    vec3 directional = frag_color.rgb * ndl;
    vec3 specular = vec3(1, 1, 1) * ndh * specular_intensity;
    out_color = vec4(directional + specular, frag_color.a);
}`

interface VertexOptions {
    position?: geo.Vec3
    normal?: geo.Vec3
    color?: geo.Vec4
}

export class Vertex {
    position: geo.Vec3
    normal: geo.Vec3
    color: geo.Vec4

    constructor(options: VertexOptions = {}) {
        this.position = options.position?.clone() ?? new geo.Vec3(0, 0, 0)
        this.normal = options.normal?.clone() ?? new geo.Vec3(0, 0, 0)
        this.color = options.color?.clone() ?? new geo.Vec4(1, 1, 1, 1)
    }

    clone(): Vertex {
        return new Vertex(this)
    }
}

interface IxMeshOptions {
    vertices?: Vertex[]
    indices?: number[]
}

export class IxMesh {
    public vertices: Vertex[] = []
    public indices: number[] = []

    constructor(options: IxMeshOptions = {}) {
        if (options.vertices) {
            this.vertices.push(...options.vertices)
        }

        if (options.indices) {
            this.indices.push(...options.indices)
        }
    }

    clear() {
        this.vertices = []
        this.indices = []
    }

    transform(mat: geo.Mat4) {
        transform(mat, this.vertices)
    }

    cat(ixm: IxMesh): void {
        const offset = this.vertices.length
        this.vertices.push(...ixm.vertices.map(v => v.clone()))
        this.indices.push(...ixm.indices.map(ix => ix + offset))
    }

    calcAABB(): geo.AABB {
        return calcAABB(this.vertices)
    }

    static cube(): IxMesh {
        // -x, +x, -y, +y, -z, +z
        const vertices = new Array<Vertex>(
            // -x
            new Vertex({ position: new geo.Vec3(-1, -1, -1), normal: new geo.Vec3(-1, 0, 0) }),
            new Vertex({ position: new geo.Vec3(-1, -1, 1), normal: new geo.Vec3(-1, 0, 0) }),
            new Vertex({ position: new geo.Vec3(-1, 1, 1), normal: new geo.Vec3(-1, 0, 0), }),
            new Vertex({ position: new geo.Vec3(-1, 1, -1), normal: new geo.Vec3(-1, 0, 0) }),
            // +x
            new Vertex({ position: new geo.Vec3(1, -1, 1), normal: new geo.Vec3(1, 0, 0) }),
            new Vertex({ position: new geo.Vec3(1, -1, -1), normal: new geo.Vec3(1, 0, 0) }),
            new Vertex({ position: new geo.Vec3(1, 1, -1), normal: new geo.Vec3(1, 0, 0) }),
            new Vertex({ position: new geo.Vec3(1, 1, 1), normal: new geo.Vec3(1, 0, 0) }),
            // -y
            new Vertex({ position: new geo.Vec3(-1, -1, 1), normal: new geo.Vec3(0, -1, 0) }),
            new Vertex({ position: new geo.Vec3(-1, -1, -1), normal: new geo.Vec3(0, -1, 0) }),
            new Vertex({ position: new geo.Vec3(1, -1, -1), normal: new geo.Vec3(0, -1, 0) }),
            new Vertex({ position: new geo.Vec3(1, -1, 1), normal: new geo.Vec3(0, -1, 0) }),
            // +y
            new Vertex({ position: new geo.Vec3(-1, 1, 1), normal: new geo.Vec3(0, 1, 0) }),
            new Vertex({ position: new geo.Vec3(1, 1, 1), normal: new geo.Vec3(0, 1, 0) }),
            new Vertex({ position: new geo.Vec3(1, 1, -1), normal: new geo.Vec3(0, 1, 0) }),
            new Vertex({ position: new geo.Vec3(-1, 1, -1), normal: new geo.Vec3(0, 1, 0) }),
            // -z
            new Vertex({ position: new geo.Vec3(-1, -1, -1), normal: new geo.Vec3(0, 0, -1) }),
            new Vertex({ position: new geo.Vec3(-1, 1, -1), normal: new geo.Vec3(0, 0, -1) }),
            new Vertex({ position: new geo.Vec3(1, 1, -1), normal: new geo.Vec3(0, 0, -1) }),
            new Vertex({ position: new geo.Vec3(1, -1, -1), normal: new geo.Vec3(0, 0, -1) }),
            // +z
            new Vertex({ position: new geo.Vec3(-1, -1, 1), normal: new geo.Vec3(0, 0, 1) }),
            new Vertex({ position: new geo.Vec3(1, -1, 1), normal: new geo.Vec3(0, 0, 1) }),
            new Vertex({ position: new geo.Vec3(1, 1, 1), normal: new geo.Vec3(0, 0, 1) }),
            new Vertex({ position: new geo.Vec3(-1, 1, 1), normal: new geo.Vec3(0, 0, 1) })
        )

        return new IxMesh({
            vertices,
            indices: quadIndices(vertices.length / 4)
        })
    }

    static sphere(rows: number, cols: number): IxMesh {
        // create north pole
        const vertices = new Array<Vertex>()
        const indices = new Array<number>()
        const northPole = new Vertex({ position: new geo.Vec3(0, 1, 0), normal: new geo.Vec3(0, 1, 0), color: new geo.Vec4(1, 1, 1, 1) })
        vertices.push(northPole)

        // iterate over angles, essentially forming polar coordinates of each point
        // let theta = elevation angle above xy plane
        // let phi = xy plane angle
        const dtheta = Math.PI / (rows + 1)
        const dphi = 2 * Math.PI / cols

        for (let j = 0; j < cols; ++j) {
            const phi = dphi * j
            const theta = dtheta
            const position = new geo.Vec3(
                Math.sin(theta) * Math.cos(phi),
                Math.cos(theta),
                Math.sin(theta) * Math.sin(phi)
            )

            vertices.push(new Vertex({ position: position, normal: position, color: new geo.Vec4(1, 1, 1, 1) }))

            // connect to pole to form triangle
            indices.push(j + 1, (j + 1) % cols + 1, 0)
        }

        // interior
        for (let i = 1; i < rows; ++i) {
            const theta = dtheta * (i + 1)
            const prevRowOffset = (i - 1) * cols + 1
            const rowOffset = prevRowOffset + cols
            for (let j = 0; j < cols; ++j) {
                const phi = dphi * j
                const position = new geo.Vec3(
                    Math.sin(theta) * Math.cos(phi),
                    Math.cos(theta),
                    Math.sin(theta) * Math.sin(phi)
                )
                vertices.push(new Vertex({ position: position, normal: position, color: new geo.Vec4(1, 1, 1, 1) }))

                const a = prevRowOffset + j
                const b = rowOffset + j
                const c = rowOffset + (j + 1) % cols
                const d = prevRowOffset + (j + 1) % cols
                indices.push(a, b, c, a, c, d)
            }
        }

        // create south pole
        const southPole = new Vertex({ position: new geo.Vec3(0, -1, 0), normal: new geo.Vec3(0, -1, 0), color: new geo.Vec4(1, 1, 1, 1) })
        vertices.push(southPole)
        const southPoleIdx = vertices.length - 1

        // connect south pole to rest of mesh
        for (let j = 0; j < cols; ++j) {
            const offset = southPoleIdx - cols

            // connect to pole to form triangle
            indices.push(offset + j, southPoleIdx, offset + (j + 1) % cols)
        }

        return new IxMesh({
            vertices,
            indices
        })
    }

    static rect(aabb: geo.AABB): IxMesh {
        // -x, +x, -y, +y, -z, +z
        const mesh = IxMesh.cube()
        const halfExtents = aabb.extents.divX(2)
        const negHalfExtents = halfExtents.neg()
        const translation = geo.Mat4.translation(aabb.min.sub(negHalfExtents))
        const scaling = geo.Mat4.scaling(halfExtents)
        const mat = scaling.matmul(translation)
        mesh.transform(mat)
        return mesh
    }

    static rectFromCoords(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): IxMesh {
        return this.rect(geo.AABB.fromCoords(minX, minY, minZ, maxX, maxY, maxZ))
    }
}

function quadIndices(quads: number): number[] {
    return array.generate(quads, i => [i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3]).flat()
}

export interface MeshData {
    vertices: Vertex[]
    indices: number[]
    indexOffset: number
}

export interface BatchOptions {
    worldMatrix?: geo.Mat4
    diffuseColor?: geo.Vec4
    roughness?: number
    vao?: WebGLVertexArrayObject
    offset?: number
    numIndices?: number
}

export class Batch {
    public worldMatrix: geo.Mat4
    public diffuseColor: geo.Vec4 = new geo.Vec4(1, 1, 1, 1)
    public roughness: number = 0
    public vao: WebGLVertexArrayObject | null
    public offset: number
    public numIndices: number

    constructor(options: BatchOptions = {}) {
        this.worldMatrix = options.worldMatrix ?? geo.Mat4.identity()
        this.diffuseColor = options.diffuseColor ?? new geo.Vec4(1, 1, 1, 1)
        this.roughness = options.roughness ?? 0
        this.vao = options.vao ?? null
        this.offset = options.offset ?? 0
        this.numIndices = options.numIndices ?? 0
    }
}

const elemsPerVertex = 10
const vertexStride = elemsPerVertex * 4

export class Renderer {
    private readonly gl: WebGL2RenderingContext
    private readonly program: WebGLProgram
    private readonly worldMatrixLoc: WebGLUniformLocation
    private readonly viewMatrixLoc: WebGLUniformLocation
    private readonly projectionMatrixLoc: WebGLUniformLocation
    private readonly diffuseColorLoc: WebGLUniformLocation
    private readonly eyePositionLoc: WebGLUniformLocation
    private readonly roughnessLoc: WebGLUniformLocation
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
        this.projectionMatrixLoc = glu.getUniformLocation(gl, this.program, "projection_matrix")
        this.diffuseColorLoc = glu.getUniformLocation(gl, this.program, "diffuse_color")
        this.eyePositionLoc = glu.getUniformLocation(gl, this.program, "eye_position")
        this.roughnessLoc = glu.getUniformLocation(gl, this.program, "roughness")
    }

    public present() {
        const gl = this.gl

        this.projectionMatrix = geo.Mat4.perspective(Math.PI / 2, gl.drawingBufferWidth / gl.drawingBufferHeight, 1, 512)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        gl.enable(gl.DEPTH_TEST)
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

        gl.bindVertexArray(null)
        return vao
    }

    private renderBatches() {
        const gl = this.gl
        gl.useProgram(this.program)
        gl.uniformMatrix4fv(this.projectionMatrixLoc, false, this.projectionMatrix.toArray())
        gl.uniformMatrix4fv(this.viewMatrixLoc, false, this.viewMatrix.toArray())

        // determine eye position and set uniform
        {
            const invViewMatrix = this.viewMatrix.invert()
            const eyePosition = invViewMatrix.transform3(new geo.Vec3(0, 0, 0))
            gl.uniform3fv(this.eyePositionLoc, eyePosition.toArray())
        }

        for (const batch of this.batches) {
            if (!batch.vao) {
                continue
            }

            if (batch.numIndices <= 0) {
                continue
            }

            gl.uniformMatrix4fv(this.worldMatrixLoc, false, batch.worldMatrix.toArray())
            gl.uniform4fv(this.diffuseColorLoc, batch.diffuseColor.toArray())
            gl.uniform1f(this.roughnessLoc, batch.roughness)
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

export function transform(mat: geo.Mat4, vertices: Vertex[]) {
    const basis = mat.toMat3()
    for (const v of vertices) {
        v.position = mat.transform3(v.position)
        v.normal = basis.transform(v.normal)
    }
}

export function calcAABB(vertices: Iterable<Vertex>): geo.AABB {
    const aabb = geo.AABB.fromPoints(iter.map(vertices, v => v.position))
    return aabb
}