/**
 * web gl sprite rendering utilities
 */
import * as glu from "./glu.js"
import * as geo from "../shared/geo2d.js"

export class Color {
    constructor(public r: number, public g: number, public b: number, public a: number) { }

    clone(): Color {
        return new Color(this.r, this.g, this.b, this.a)
    }

    public static white = new Color(1, 1, 1, 1)
    public static black = new Color(0, 0, 0, 1)
    public static gray = new Color(.5, .5, .5, 1)
    public static red = new Color(1, 0, 0, 1)
    public static green = new Color(0, 1, 0, 1)
    public static blue = new Color(0, 0, 1, 1)
}

const spriteVertexSrc = `#version 300 es
precision mediump float;

uniform vec2 viewport_size;

in vec2 in_position;
in vec3 in_uvw;
in vec4 in_color;

out vec2 frag_position;
out vec4 frag_color;
out vec3 frag_uvw;

void main() {
    frag_uvw = in_uvw;
    frag_color = in_color;
    frag_position = in_position.xy;
    vec2 position = vec2(in_position.x / viewport_size.x * 2.f - 1.f, -in_position.y / viewport_size.y * 2.f + 1.f);
    gl_Position = vec4(position, 0, 1.f);
}`

const spriteFragmentSrc = `#version 300 es
precision highp float;
precision highp sampler2D;
precision highp sampler2DArray;

uniform bool use_array_texture;
uniform mediump vec2 viewport_size;
uniform sampler2D sampler;
uniform sampler2DArray array_sampler;

in vec2 frag_position;
in vec4 frag_color;
in vec3 frag_uvw;

out vec4 out_color;

void main() {
    float l = 1.f;
    out_color = frag_color;

    if (use_array_texture) {
        out_color *= texture(array_sampler, frag_uvw);
    } else {
        out_color *= texture(sampler, frag_uvw.xy);
    }

    out_color *= vec4(l, l, l, 1);
}`

export enum SpriteFlags {
    None = 0,
    ArrayTexture = 1 << 0,
    Flip = 1 << 1
}

function getSpriteRenderFlags(flags: SpriteFlags): SpriteFlags {
    return flags & (SpriteFlags.ArrayTexture)
}

export interface Texture {
    id: number
    texture: WebGLTexture
}

export interface SpriteOptions {
    position?: geo.Point
    width?: number
    height?: number
    layer?: number
    color?: Color
    texture?: Texture | null
    flags?: SpriteFlags
}

export class Sprite {
    public position: geo.Point = new geo.Point(0, 0)
    public width: number = 0
    public height: number = 0
    public layer: number = 0
    public color: Color = Color.white.clone()
    public texture: Texture | null = null
    public flags: SpriteFlags = SpriteFlags.None

    constructor(options: SpriteOptions = {}) {
        if (options.position) {
            this.position = options.position
        }

        if (options.width) {
            this.width = options.width
        }

        if (options.height) {
            this.height = options.height
        }

        if (options.layer) {
            this.layer = options.layer
        }

        if (options.color) {
            this.color = options.color
        }

        if (options.texture) {
            this.texture = options.texture
        }

        if (options.flags) {
            this.flags = options.flags
        }
    }
}

// vertex layout:
// xy uvw rgba (all float32)
const elemsPerSpriteVertex = 9
const spriteVertexStride = elemsPerSpriteVertex * 4

export class Renderer {
    public readonly gl: WebGL2RenderingContext
    private readonly spriteProgram: WebGLProgram
    private readonly spriteUseArrayTextureUniformLocation: WebGLUniformLocation
    private readonly spriteSamplerUniformLocation: WebGLUniformLocation
    private readonly spriteArraySamplerUniformLocation: WebGLUniformLocation
    private readonly spriteViewportSizeUniformLocation: WebGLUniformLocation
    private readonly sampler: WebGLSampler
    private readonly arraySampler: WebGLSampler
    private readonly vertexBuffer: WebGLBuffer
    private readonly indexBuffer: WebGLBuffer
    private readonly spriteVao: WebGLVertexArrayObject
    private readonly white1x1Texture: Texture
    private readonly white1x1ArrayTexture: Texture
    private sprites: Sprite[] = []
    private vertices: Float32Array = new Float32Array()
    private indices: Uint16Array = new Uint16Array()
    private viewportWidth: number = 0
    private viewportHeight: number = 0
    private textureId: number = 0

    constructor(readonly canvas: HTMLCanvasElement) {
        this.gl = glu.createContext(canvas)

        const gl = this.gl

        this.spriteProgram = glu.compileProgram(gl, spriteVertexSrc, spriteFragmentSrc)
        this.spriteUseArrayTextureUniformLocation = glu.getUniformLocation(gl, this.spriteProgram, "use_array_texture")
        this.spriteSamplerUniformLocation = glu.getUniformLocation(gl, this.spriteProgram, "sampler")
        this.spriteArraySamplerUniformLocation = glu.getUniformLocation(gl, this.spriteProgram, "array_sampler")
        this.spriteViewportSizeUniformLocation = glu.getUniformLocation(gl, this.spriteProgram, "viewport_size")
        this.vertexBuffer = glu.createBuffer(gl)
        this.indexBuffer = glu.createBuffer(gl)

        // default 1x1 white texture
        this.white1x1Texture = this.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, this.white1x1Texture.texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8ClampedArray([255, 255, 255, 255]))

        this.white1x1ArrayTexture = this.createTexture()
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.white1x1ArrayTexture.texture)
        gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8ClampedArray([255, 255, 255, 255]))

        // setup sampler
        this.sampler = glu.createSampler(gl)
        gl.samplerParameteri(this.sampler, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.samplerParameteri(this.sampler, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.samplerParameteri(this.sampler, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
        gl.samplerParameteri(this.sampler, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.samplerParameteri(this.sampler, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        this.arraySampler = glu.createSampler(gl)
        gl.samplerParameteri(this.sampler, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.samplerParameteri(this.sampler, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.samplerParameteri(this.sampler, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
        gl.samplerParameteri(this.sampler, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.samplerParameteri(this.sampler, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        this.spriteVao = createSpriteVao(this.gl, this.spriteProgram, this.vertexBuffer, this.indexBuffer)
    }

    bakeTextureArray(width: number, height: number, images: TexImageSource[]): Texture {
        // each image must be the same size
        const gl = this.gl
        const texture = this.createTexture()
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture.texture)
        gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, width, height, images.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        images.forEach((img, i) => {
            gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, width, height, 1, gl.RGBA, gl.UNSIGNED_BYTE, img)
        })

        gl.generateMipmap(gl.TEXTURE_2D_ARRAY)

        return texture
    }

    async loadTexture(url: string): Promise<Texture> {
        // each image must be the same size
        const gl = this.gl
        const texture = await glu.loadTexture(gl, url)
        gl.generateMipmap(gl.TEXTURE_2D_ARRAY)
        this.textureId++

        return {
            id: this.textureId,
            texture: texture
        }
    }

    drawSprite(sprite: Sprite) {
        // add sprite to array
        this.sprites.push(sprite)
    }

    flush() {
        this.checkSize()
        this.batchSprites()
        this.drawSprites()

        // clear sprites and batches
        this.sprites = []
    }

    private batchSprites() {
        // assign default texture to sprites without a texture
        for (const sprite of this.sprites) {
            if (!sprite.texture) {
                sprite.texture = this.white1x1Texture
                sprite.flags = sprite.flags & ~SpriteFlags.ArrayTexture
            }
        }

        // copy vertices and indices to arrays, growing arrays if required
        const numVertices = this.sprites.length * 4
        const numVertexElems = numVertices * elemsPerSpriteVertex
        const elemsPerSprite = 4 * elemsPerSpriteVertex
        if (this.vertices.length < numVertexElems) {
            this.vertices = new Float32Array(numVertexElems)
        }

        const numIndices = this.sprites.length * 6
        if (this.indices.length < numIndices) {
            this.indices = new Uint16Array(numIndices)
        }

        for (let i = 0; i < this.sprites.length; ++i) {
            const sprite = this.sprites[i]
            let elemOffset = i * elemsPerSprite
            let indexOffset = i * 6
            let baseIndex = i * 4
            const flip = (sprite.flags & SpriteFlags.Flip) === SpriteFlags.Flip

            this.pushVertex(elemOffset, sprite.position.x, sprite.position.y, 0, flip ? 1 : 0, sprite.layer, sprite.color)
            elemOffset += elemsPerSpriteVertex

            this.pushVertex(elemOffset, sprite.position.x, sprite.position.y + sprite.height, 0, flip ? 0 : 1, sprite.layer, sprite.color)
            elemOffset += elemsPerSpriteVertex

            this.pushVertex(elemOffset, sprite.position.x + sprite.width, sprite.position.y + sprite.height, 1, flip ? 0 : 1, sprite.layer, sprite.color)
            elemOffset += elemsPerSpriteVertex

            this.pushVertex(elemOffset, sprite.position.x + sprite.width, sprite.position.y, 1, flip ? 1 : 0, sprite.layer, sprite.color)
            elemOffset += elemsPerSpriteVertex

            this.indices[indexOffset] = baseIndex
            this.indices[indexOffset + 1] = baseIndex + 1
            this.indices[indexOffset + 2] = baseIndex + 2
            this.indices[indexOffset + 3] = baseIndex
            this.indices[indexOffset + 4] = baseIndex + 2
            this.indices[indexOffset + 5] = baseIndex + 3
        }

        // transfer vertices and indices to GPU
        const gl = this.gl
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices.subarray(0, this.sprites.length * 4 * elemsPerSprite), gl.DYNAMIC_DRAW)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices.subarray(0, this.sprites.length * 6), gl.DYNAMIC_DRAW)
    }

    private drawSprites() {
        // draw the batched sprites
        const gl = this.gl
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        gl.useProgram(this.spriteProgram)
        gl.uniform2f(this.spriteViewportSizeUniformLocation, gl.drawingBufferWidth, gl.drawingBufferHeight)
        gl.bindVertexArray(this.spriteVao)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, this.white1x1Texture.texture)
        gl.bindSampler(0, this.sampler)

        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.white1x1ArrayTexture.texture)
        gl.bindSampler(1, this.arraySampler)

        gl.uniform1i(this.spriteSamplerUniformLocation, 0)
        gl.uniform1i(this.spriteArraySamplerUniformLocation, 1)

        // draw each batch
        {
            let offset = 0
            let numSprites = 0
            let renderFlags = SpriteFlags.None
            let textureId = -1
            for (const sprite of this.sprites) {
                if (!sprite.texture) {
                    throw new Error("No texture assigned (default should have been applied)")
                }

                const spriteRenderFlags = getSpriteRenderFlags(sprite.flags)
                const renderFlagBreak = renderFlags !== spriteRenderFlags
                const textureBreak = textureId !== sprite.texture.id

                // draw current batch
                if (renderFlagBreak || textureBreak) {
                    if (numSprites > 0) {
                        gl.drawElements(gl.TRIANGLES, numSprites * 6, gl.UNSIGNED_SHORT, offset * 6 * 2)
                    }

                    offset += numSprites
                    numSprites = 0
                }

                if (renderFlags !== spriteRenderFlags) {
                    renderFlags = spriteRenderFlags
                    gl.uniform1i(this.spriteUseArrayTextureUniformLocation, renderFlags & SpriteFlags.ArrayTexture ? 1 : 0)
                }

                if (textureId !== sprite.texture.id) {
                    textureId = sprite.texture.id
                    if (renderFlags & SpriteFlags.ArrayTexture) {
                        gl.activeTexture(gl.TEXTURE0)
                        gl.bindTexture(gl.TEXTURE_2D, this.white1x1Texture.texture)
                        gl.activeTexture(gl.TEXTURE1)
                        gl.bindTexture(gl.TEXTURE_2D_ARRAY, sprite.texture.texture)
                    } else {
                        gl.activeTexture(gl.TEXTURE0)
                        gl.bindTexture(gl.TEXTURE_2D, sprite.texture.texture)
                        gl.activeTexture(gl.TEXTURE1)
                        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.white1x1ArrayTexture.texture)
                    }
                }

                ++numSprites
            }

            if (numSprites > 0) {
                gl.drawElements(gl.TRIANGLES, numSprites * 6, gl.UNSIGNED_SHORT, offset * 6 * 2)
            }
        }

        // clean up state
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, null)
        gl.bindSampler(0, null)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, null)
        gl.bindSampler(1, null)
    }

    private createTexture(): Texture {
        ++this.textureId
        const texture: Texture = {
            texture: glu.createTexture(this.gl),
            id: this.textureId
        }

        return texture
    }

    private pushVertex(offset: number, x: number, y: number, u: number, v: number, w: number, color: Color) {
        // position
        this.vertices[offset] = x
        this.vertices[++offset] = y

        // uv
        this.vertices[++offset] = u
        this.vertices[++offset] = v
        this.vertices[++offset] = w

        // color
        this.vertices[++offset] = color.r
        this.vertices[++offset] = color.g
        this.vertices[++offset] = color.b
        this.vertices[++offset] = color.a
    }

    private checkSize() {
        const canvas = this.canvas
        const gl = this.gl

        if (canvas.width !== canvas.clientWidth && canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth
            canvas.height = canvas.clientHeight
        }

        if (canvas.width === this.viewportWidth && canvas.height === this.viewportHeight) {
            return
        }

        this.viewportWidth = canvas.width
        this.viewportHeight = canvas.height
    }
}

function createSpriteVao(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    vertexBuffer: WebGLBuffer,
    indexBuffer: WebGLBuffer): WebGLVertexArrayObject {
    const vao = glu.createVertexArray(gl)
    gl.bindVertexArray(vao)

    const positionAttribIdx = glu.getAttribLocation(gl, program, "in_position")
    const uvwAttribIdx = glu.getAttribLocation(gl, program, "in_uvw")
    const colorAttribIdx = glu.getAttribLocation(gl, program, "in_color")
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.enableVertexAttribArray(positionAttribIdx)
    gl.enableVertexAttribArray(uvwAttribIdx)
    gl.enableVertexAttribArray(colorAttribIdx)
    gl.vertexAttribPointer(positionAttribIdx, 3, gl.FLOAT, false, spriteVertexStride, 0)
    gl.vertexAttribPointer(uvwAttribIdx, 3, gl.FLOAT, false, spriteVertexStride, 8)
    gl.vertexAttribPointer(colorAttribIdx, 4, gl.FLOAT, false, spriteVertexStride, 20)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    return vao
}