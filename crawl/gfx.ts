/**
 * web gl sprite rendering utilities
 */
import * as glu from "./glu.js"

export type Color = [number, number, number, number]
export type Vec2 = [number, number]

const vertexSrc = `#version 300 es
precision mediump float;

uniform vec2 viewport_size;

in vec2 in_position;
in vec3 in_uvw;
in vec4 in_color;

out vec4 frag_color;
out vec3 frag_uvw;

void main() {
    frag_uvw = in_uvw;
    frag_color = in_color;
    vec2 position = vec2(in_position.x / viewport_size.x * 2.f - 1.f, -in_position.y / viewport_size.y * 2.f + 1.f);
    gl_Position = vec4(position, 0, 1);
}
`

const fragmentSrc = `#version 300 es
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray sampler;

in vec4 frag_color;
in vec3 frag_uvw;

out vec4 out_color;

void main() {
    out_color = frag_color * texture(sampler, frag_uvw);
}
`
export interface Sprite {
    position: Vec2
    width: number
    height: number
    layer: number
    color: Color
    texture: WebGLTexture | null
}

interface SpriteBatch {
    offset: number
    sprites: Sprite[]
}

export class Renderer {
    // vertex layout:
    // xy uvw rgba (all float32)
    private static readonly elemsPerVertex = 9
    public readonly gl: WebGL2RenderingContext
    private readonly program: WebGLProgram
    private readonly vertexBuffer: WebGLBuffer
    private readonly indexBuffer: WebGLBuffer
    private readonly samplerUniformLocation: WebGLUniformLocation
    private readonly positionAttribIdx: number
    private readonly uvwAttribIdx: number
    private readonly colorAttribIdx: number
    private readonly viewportSizeUniformLocation: WebGLUniformLocation
    private readonly sampler: WebGLSampler
    private readonly vao: WebGLVertexArrayObject
    private batches: Map<(WebGLTexture | null), SpriteBatch> = new Map()
    private numSprites: number = 0
    private vertices: Float32Array = new Float32Array()
    private indices: Uint16Array = new Uint16Array()

    constructor(readonly canvas: HTMLCanvasElement) {
        this.gl = glu.createContext(canvas)
        const gl = this.gl

        this.vertexBuffer = glu.createBuffer(gl)
        this.indexBuffer = glu.createBuffer(gl)
        this.program = glu.compileProgram(gl, vertexSrc, fragmentSrc)
        this.samplerUniformLocation = glu.getUniformLocation(gl, this.program, "sampler")
        this.positionAttribIdx = glu.getAttribLocation(gl, this.program, "in_position")
        this.uvwAttribIdx = glu.getAttribLocation(gl, this.program, "in_uvw")
        this.colorAttribIdx = glu.getAttribLocation(gl, this.program, "in_color")
        this.viewportSizeUniformLocation = glu.getUniformLocation(gl, this.program, "viewport_size")
        this.vao = glu.createVertexArray(gl)

        // setup sampler
        this.sampler = glu.createSampler(gl)
        gl.samplerParameteri(this.sampler, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.samplerParameteri(this.sampler, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.samplerParameteri(this.sampler, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
        gl.samplerParameteri(this.sampler, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.samplerParameteri(this.sampler, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        // setup vertex array object
        const vertexStride = Renderer.elemsPerVertex * 4
        gl.bindVertexArray(this.vao)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
        gl.vertexAttribPointer(this.positionAttribIdx, 2, gl.FLOAT, false, vertexStride, 0)
        gl.vertexAttribPointer(this.uvwAttribIdx, 3, gl.FLOAT, false, vertexStride, 8)
        gl.vertexAttribPointer(this.colorAttribIdx, 4, gl.FLOAT, false, vertexStride, 20)
        gl.enableVertexAttribArray(this.positionAttribIdx)
        gl.enableVertexAttribArray(this.uvwAttribIdx)
        gl.enableVertexAttribArray(this.colorAttribIdx)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    }

    bakeTextureArray(width: number, height: number, images: TexImageSource[]) {
        // each image must be the same size
        const gl = this.gl
        const texture = glu.createTexture(gl)
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture)
        gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, width, height, images.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        images.forEach((img, i) => {
            gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, width, height, 1, gl.RGBA, gl.UNSIGNED_BYTE, img)
        })

        gl.generateMipmap(gl.TEXTURE_2D_ARRAY)
        return texture
    }

    drawSprite(sprite: Sprite) {
        // add sprite to batch
        const batch = this.batches.get(sprite.texture)
        if (batch) {
            batch.sprites.push(sprite)
        } else {
            // append vertex for this sprite, increase sprite count
            this.batches.set(sprite.texture, {
                offset: 0,
                sprites: [sprite]
            })
        }

        ++this.numSprites
    }

    flush() {
        // copy vertices and indices to arrays, growing arrays if required
        const numVertices = this.numSprites * 4
        const numVertexElems = numVertices * Renderer.elemsPerVertex
        const elemsPerSprite = 4 * Renderer.elemsPerVertex
        if (this.vertices.length < numVertexElems) {
            this.vertices = new Float32Array(numVertexElems)
        }

        const numIndices = this.numSprites * 6
        if (this.indices.length < numIndices) {
            this.indices = new Uint16Array(numIndices)
        }

        {
            let i = 0
            for (const [_, batch] of this.batches) {
                for (const sprite of batch.sprites) {
                    let elemOffset = i * elemsPerSprite
                    let indexOffset = i * 6
                    let baseIndex = i * 4
                    this.pushVertex(elemOffset, sprite.position[0], sprite.position[1], 0, 0, sprite.layer, sprite.color[0], sprite.color[1], sprite.color[2], sprite.color[3])
                    elemOffset += Renderer.elemsPerVertex

                    this.pushVertex(elemOffset, sprite.position[0], sprite.position[1] + sprite.height, 0, 1, sprite.layer, sprite.color[0], sprite.color[1], sprite.color[2], sprite.color[3])
                    elemOffset += Renderer.elemsPerVertex

                    this.pushVertex(elemOffset, sprite.position[0] + sprite.width, sprite.position[1] + sprite.height, 1, 1, sprite.layer, sprite.color[0], sprite.color[1], sprite.color[2], sprite.color[3])
                    elemOffset += Renderer.elemsPerVertex

                    this.pushVertex(elemOffset, sprite.position[0] + sprite.width, sprite.position[1], 1, 0, sprite.layer, sprite.color[0], sprite.color[1], sprite.color[2], sprite.color[3])
                    elemOffset += Renderer.elemsPerVertex

                    this.indices[indexOffset] = baseIndex
                    this.indices[indexOffset + 1] = baseIndex + 1
                    this.indices[indexOffset + 2] = baseIndex + 2
                    this.indices[indexOffset + 3] = baseIndex
                    this.indices[indexOffset + 4] = baseIndex + 2
                    this.indices[indexOffset + 5] = baseIndex + 3
                    ++i
                }
            }
        }

        // draw the sprites
        const gl = this.gl
        gl.bindVertexArray(this.vao)
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices.subarray(0, this.numSprites * 4 * elemsPerSprite), gl.DYNAMIC_DRAW)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices.subarray(0, this.numSprites * 6), gl.DYNAMIC_DRAW)

        this.checkResize()
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.useProgram(this.program)
        gl.uniform2f(this.viewportSizeUniformLocation, gl.drawingBufferWidth, gl.drawingBufferHeight)
        gl.bindVertexArray(this.vao)

        // draw each for
        for (const [texture, batch] of this.batches) {
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture)
            gl.bindSampler(0, this.sampler)
            gl.uniform1i(this.samplerUniformLocation, 0)
            gl.drawElements(gl.TRIANGLES, batch.sprites.length * 6, gl.UNSIGNED_SHORT, 0)
        }

        // clear sprites
        this.batches.clear()
        this.numSprites = 0
    }

    private pushVertex(offset: number, x: number, y: number, u: number, v: number, w: number, r: number, g: number, b: number, a: number) {
        // position
        this.vertices[offset] = x
        this.vertices[offset + 1] = y
        // uv
        this.vertices[offset + 2] = u
        this.vertices[offset + 3] = v
        this.vertices[offset + 4] = w
        // color
        this.vertices[offset + 5] = r
        this.vertices[offset + 6] = g
        this.vertices[offset + 7] = b
        this.vertices[offset + 8] = a
    }

    private checkResize() {
        const canvas = this.canvas
        if (canvas.width == canvas.clientWidth && canvas.height == canvas.clientHeight) {
            return
        }

        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
    }
}