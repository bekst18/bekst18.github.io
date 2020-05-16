/**
 * web gl sprite rendering utilities
 */
import * as glu from "./glu.js";
import * as geo from "../shared/geo2d.js";
let Color = /** @class */ (() => {
    class Color {
        constructor(r, g, b, a) {
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = a;
        }
        clone() {
            return new Color(this.r, this.g, this.b, this.a);
        }
    }
    Color.white = new Color(1, 1, 1, 1);
    Color.black = new Color(0, 0, 0, 1);
    Color.gray = new Color(.5, .5, .5, 1);
    Color.red = new Color(1, 0, 0, 1);
    Color.green = new Color(0, 1, 0, 1);
    Color.blue = new Color(0, 0, 1, 1);
    return Color;
})();
export { Color };
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
}`;
const spriteFragmentSrc = `#version 300 es
precision highp float;
precision highp sampler2D;
precision highp sampler2DArray;

uniform bool lit;
uniform bool use_array_texture;
uniform mediump vec2 viewport_size;
uniform float light_radius;
uniform sampler2D sampler;
uniform sampler2DArray array_sampler;

in vec2 frag_position;
in vec4 frag_color;
in vec3 frag_uvw;

out vec4 out_color;

void main() {
    float l = 1.f;
    if (lit) {
        // calculate distance from light
        float d = length(frag_position - viewport_size / 2.f);

        // calculate light amount (full from 0 to light radius, lerp from light_radius to 2 * light_radius)
        l = mix(1.f, 0.f, d / light_radius);
    }

    out_color = frag_color;

    if (use_array_texture) {
        out_color *= texture(array_sampler, frag_uvw);
    } else {
        out_color *= texture(sampler, frag_uvw.xy);
    }

    // out_color *= vec4(l, l, l, 1);
}`;
const shadowVertexSrc = `#version 300 es
precision mediump float;

uniform vec2 viewport_size;

in vec2 in_position;

out vec2 frag_position;

void main() {
    frag_position = in_position;
    vec2 position = vec2(in_position.x / viewport_size.x * 2.f - 1.f, -in_position.y / viewport_size.y * 2.f + 1.f);
    gl_Position = vec4(position, 0, 1);
}`;
const shadowFragmentSrc = `#version 300 es
precision highp float;
precision highp sampler2DArray;

uniform mediump vec2 viewport_size;

in vec2 frag_position;

out vec4 out_color;

void main() {
    // calculate distance from light
    float d = length(frag_position - viewport_size / 2.f) / (16.f * 24.f);
    out_color = vec4(d, d, d, 1);
    out_color = vec4(1,0,0,1);
}
`;
export var SpriteFlags;
(function (SpriteFlags) {
    SpriteFlags[SpriteFlags["None"] = 0] = "None";
    SpriteFlags[SpriteFlags["Lit"] = 1] = "Lit";
    SpriteFlags[SpriteFlags["ArrayTexture"] = 2] = "ArrayTexture";
    SpriteFlags[SpriteFlags["CastsShadows"] = 4] = "CastsShadows";
    SpriteFlags[SpriteFlags["Flip"] = 8] = "Flip";
})(SpriteFlags || (SpriteFlags = {}));
function getSpriteRenderFlags(flags) {
    return flags & (SpriteFlags.Lit | SpriteFlags.ArrayTexture | SpriteFlags.CastsShadows);
}
export class Sprite {
    constructor(options = {}) {
        this.position = new geo.Point(0, 0);
        this.width = 0;
        this.height = 0;
        this.layer = 0;
        this.color = Color.white.clone();
        this.texture = null;
        this.flags = SpriteFlags.None;
        if (options.position) {
            this.position = options.position;
        }
        if (options.width) {
            this.width = options.width;
        }
        if (options.height) {
            this.height = options.height;
        }
        if (options.layer) {
            this.layer = options.layer;
        }
        if (options.color) {
            this.color = options.color;
        }
        if (options.texture) {
            this.texture = options.texture;
        }
        if (options.flags) {
            this.flags = options.flags;
        }
    }
}
// vertex layout:
// xy uvw rgba (all float32)
const elemsPerSpriteVertex = 9;
const spriteVertexStride = elemsPerSpriteVertex * 4;
export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.sprites = [];
        this.vertices = new Float32Array();
        this.indices = new Uint16Array();
        this.viewportWidth = 0;
        this.viewportHeight = 0;
        this.textureId = 0;
        this.gl = glu.createContext(canvas);
        const gl = this.gl;
        this.shadowProgram = glu.compileProgram(gl, shadowVertexSrc, shadowFragmentSrc);
        this.spriteProgram = glu.compileProgram(gl, spriteVertexSrc, spriteFragmentSrc);
        this.spriteLitUniformLocation = glu.getUniformLocation(gl, this.spriteProgram, "lit");
        this.spriteUseArrayTextureUniformLocation = glu.getUniformLocation(gl, this.spriteProgram, "use_array_texture");
        this.spriteSamplerUniformLocation = glu.getUniformLocation(gl, this.spriteProgram, "sampler");
        this.spriteArraySamplerUniformLocation = glu.getUniformLocation(gl, this.spriteProgram, "array_sampler");
        this.spriteViewportSizeUniformLocation = glu.getUniformLocation(gl, this.spriteProgram, "viewport_size");
        this.spriteLightRadiusUniformLocation = glu.getUniformLocation(gl, this.spriteProgram, "light_radius");
        this.shadowViewportSizeUniformLocation = glu.getUniformLocation(gl, this.shadowProgram, "viewport_size");
        this.vertexBuffer = glu.createBuffer(gl);
        this.indexBuffer = glu.createBuffer(gl);
        // default 1x1 white texture
        this.white1x1Texture = this.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.white1x1Texture.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8ClampedArray([255, 255, 255, 255]));
        this.white1x1ArrayTexture = this.createTexture();
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.white1x1ArrayTexture.texture);
        gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8ClampedArray([255, 255, 255, 255]));
        // setup sampler
        this.sampler = glu.createSampler(gl);
        gl.samplerParameteri(this.sampler, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.samplerParameteri(this.sampler, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.samplerParameteri(this.sampler, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        gl.samplerParameteri(this.sampler, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.samplerParameteri(this.sampler, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.arraySampler = glu.createSampler(gl);
        gl.samplerParameteri(this.sampler, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.samplerParameteri(this.sampler, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.samplerParameteri(this.sampler, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        gl.samplerParameteri(this.sampler, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.samplerParameteri(this.sampler, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.spriteVao = createSpriteVao(this.gl, this.spriteProgram, this.vertexBuffer, this.indexBuffer);
        this.shadowVao = createShadowVao(this.gl, this.shadowProgram, this.vertexBuffer, this.indexBuffer);
        this.shadowMapTexture = this.createTexture();
        this.shadowMapFramebuffer = glu.createFramebuffer(gl);
        gl.bindTexture(gl.TEXTURE_2D, this.shadowMapTexture.texture);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowMapFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.shadowMapTexture.texture, 0);
    }
    bakeTextureArray(width, height, images) {
        // each image must be the same size
        const gl = this.gl;
        const texture = this.createTexture();
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture.texture);
        gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, width, height, images.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        images.forEach((img, i) => {
            gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, width, height, 1, gl.RGBA, gl.UNSIGNED_BYTE, img);
        });
        gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
        return texture;
    }
    async loadTexture(url) {
        // each image must be the same size
        const gl = this.gl;
        const texture = await glu.loadTexture(gl, url);
        gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
        this.textureId++;
        return {
            id: this.textureId,
            texture: texture
        };
    }
    drawSprite(sprite) {
        // add sprite to array
        this.sprites.push(sprite);
    }
    flush(lightRadius) {
        this.checkSize();
        // DEBUG: draw shadow sprite
        // const sprite = new Sprite({
        //     position: new geo.Point(0, 0),
        //     width: 1024,
        //     height: 1024,
        //     color: [1, 1, 1, 1],
        //     texture: this.shadowMapTexture,
        //     flags: SpriteFlags.Flip
        // })
        // this.drawSprite(sprite)
        this.batchSprites();
        // this.drawShadows()
        this.drawSprites(lightRadius);
        // clear sprites and batches
        this.sprites = [];
    }
    batchSprites() {
        // assign default texture to sprites without a texture
        for (const sprite of this.sprites) {
            if (!sprite.texture) {
                sprite.texture = this.white1x1Texture;
                sprite.flags = sprite.flags & ~SpriteFlags.ArrayTexture;
            }
        }
        // copy vertices and indices to arrays, growing arrays if required
        const numVertices = this.sprites.length * 4;
        const numVertexElems = numVertices * elemsPerSpriteVertex;
        const elemsPerSprite = 4 * elemsPerSpriteVertex;
        if (this.vertices.length < numVertexElems) {
            this.vertices = new Float32Array(numVertexElems);
        }
        const numIndices = this.sprites.length * 6;
        if (this.indices.length < numIndices) {
            this.indices = new Uint16Array(numIndices);
        }
        for (let i = 0; i < this.sprites.length; ++i) {
            const sprite = this.sprites[i];
            let elemOffset = i * elemsPerSprite;
            let indexOffset = i * 6;
            let baseIndex = i * 4;
            const flip = (sprite.flags & SpriteFlags.Flip) === SpriteFlags.Flip;
            this.pushVertex(elemOffset, sprite.position.x, sprite.position.y, 0, flip ? 1 : 0, sprite.layer, sprite.color);
            elemOffset += elemsPerSpriteVertex;
            this.pushVertex(elemOffset, sprite.position.x, sprite.position.y + sprite.height, 0, flip ? 0 : 1, sprite.layer, sprite.color);
            elemOffset += elemsPerSpriteVertex;
            this.pushVertex(elemOffset, sprite.position.x + sprite.width, sprite.position.y + sprite.height, 1, flip ? 0 : 1, sprite.layer, sprite.color);
            elemOffset += elemsPerSpriteVertex;
            this.pushVertex(elemOffset, sprite.position.x + sprite.width, sprite.position.y, 1, flip ? 1 : 0, sprite.layer, sprite.color);
            elemOffset += elemsPerSpriteVertex;
            this.indices[indexOffset] = baseIndex;
            this.indices[indexOffset + 1] = baseIndex + 1;
            this.indices[indexOffset + 2] = baseIndex + 2;
            this.indices[indexOffset + 3] = baseIndex;
            this.indices[indexOffset + 4] = baseIndex + 2;
            this.indices[indexOffset + 5] = baseIndex + 3;
        }
        // transfer vertices and indices to GPU
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices.subarray(0, this.sprites.length * 4 * elemsPerSprite), gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices.subarray(0, this.sprites.length * 6), gl.DYNAMIC_DRAW);
    }
    // private drawShadows() {
    //     const gl = this.gl
    //     gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowMapFramebuffer)
    //     gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    //     gl.clearColor(0, 0, 0, 0)
    //     gl.clear(gl.COLOR_BUFFER_BIT)
    //     gl.bindVertexArray(this.shadowVao)
    //     gl.useProgram(this.shadowProgram)
    //     gl.uniform2f(this.shadowViewportSizeUniformLocation, gl.drawingBufferWidth, gl.drawingBufferHeight)
    //     gl.bindVertexArray(this.shadowVao)
    //     // draw each shadow casting batch
    //     for (const batch of this.batches) {
    //         if (!(batch.flags & SpriteFlags.CastsShadows)) {
    //             continue
    //         }
    //         gl.drawElements(gl.TRIANGLES, batch.numSprites * 6, gl.UNSIGNED_SHORT, batch.offset * 6 * 2)
    //     }
    // }
    drawSprites(lightRadius) {
        // draw the batched sprites
        const gl = this.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.spriteProgram);
        gl.uniform2f(this.spriteViewportSizeUniformLocation, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.uniform1f(this.spriteLightRadiusUniformLocation, lightRadius);
        gl.bindVertexArray(this.spriteVao);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.white1x1Texture.texture);
        gl.bindSampler(0, this.sampler);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.white1x1ArrayTexture.texture);
        gl.bindSampler(1, this.arraySampler);
        gl.uniform1i(this.spriteSamplerUniformLocation, 0);
        gl.uniform1i(this.spriteArraySamplerUniformLocation, 1);
        // draw each batch
        {
            let offset = 0;
            let numSprites = 0;
            let renderFlags = SpriteFlags.None;
            let textureId = -1;
            for (const sprite of this.sprites) {
                if (!sprite.texture) {
                    throw new Error("No texture assigned (default should have been applied)");
                }
                const spriteRenderFlags = getSpriteRenderFlags(sprite.flags);
                const renderFlagBreak = renderFlags !== spriteRenderFlags;
                const textureBreak = textureId !== sprite.texture.id;
                // draw current batch
                if (renderFlagBreak || textureBreak) {
                    if (numSprites > 0) {
                        gl.drawElements(gl.TRIANGLES, numSprites * 6, gl.UNSIGNED_SHORT, offset * 6 * 2);
                    }
                    offset += numSprites;
                    numSprites = 0;
                }
                if (renderFlags !== spriteRenderFlags) {
                    renderFlags = spriteRenderFlags;
                    gl.uniform1i(this.spriteLitUniformLocation, renderFlags & SpriteFlags.Lit ? 1 : 0);
                    gl.uniform1i(this.spriteUseArrayTextureUniformLocation, renderFlags & SpriteFlags.ArrayTexture ? 1 : 0);
                }
                if (textureId !== sprite.texture.id) {
                    textureId = sprite.texture.id;
                    if (renderFlags & SpriteFlags.ArrayTexture) {
                        gl.activeTexture(gl.TEXTURE0);
                        gl.bindTexture(gl.TEXTURE_2D, this.white1x1Texture.texture);
                        gl.activeTexture(gl.TEXTURE1);
                        gl.bindTexture(gl.TEXTURE_2D_ARRAY, sprite.texture.texture);
                    }
                    else {
                        gl.activeTexture(gl.TEXTURE0);
                        gl.bindTexture(gl.TEXTURE_2D, sprite.texture.texture);
                        gl.activeTexture(gl.TEXTURE1);
                        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.white1x1ArrayTexture.texture);
                    }
                }
                ++numSprites;
            }
            if (numSprites > 0) {
                gl.drawElements(gl.TRIANGLES, numSprites * 6, gl.UNSIGNED_SHORT, offset * 6 * 2);
            }
        }
        // clean up state
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindSampler(0, null);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
        gl.bindSampler(1, null);
    }
    createTexture() {
        ++this.textureId;
        const texture = {
            texture: glu.createTexture(this.gl),
            id: this.textureId
        };
        return texture;
    }
    pushVertex(offset, x, y, u, v, w, color) {
        // position
        this.vertices[offset] = x;
        this.vertices[++offset] = y;
        // uv
        this.vertices[++offset] = u;
        this.vertices[++offset] = v;
        this.vertices[++offset] = w;
        // color
        this.vertices[++offset] = color.r;
        this.vertices[++offset] = color.g;
        this.vertices[++offset] = color.b;
        this.vertices[++offset] = color.a;
    }
    checkSize() {
        const canvas = this.canvas;
        const gl = this.gl;
        if (canvas.width !== canvas.clientWidth && canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }
        if (canvas.width === this.viewportWidth && canvas.height === this.viewportHeight) {
            return;
        }
        this.viewportWidth = canvas.width;
        this.viewportHeight = canvas.height;
        // setup shadowmapping texture and shadow framebuffer
        gl.bindTexture(gl.TEXTURE_2D, this.shadowMapTexture.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.viewportWidth, this.viewportHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
}
function createSpriteVao(gl, program, vertexBuffer, indexBuffer) {
    const vao = glu.createVertexArray(gl);
    gl.bindVertexArray(vao);
    const positionAttribIdx = glu.getAttribLocation(gl, program, "in_position");
    const uvwAttribIdx = glu.getAttribLocation(gl, program, "in_uvw");
    const colorAttribIdx = glu.getAttribLocation(gl, program, "in_color");
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(positionAttribIdx);
    gl.enableVertexAttribArray(uvwAttribIdx);
    gl.enableVertexAttribArray(colorAttribIdx);
    gl.vertexAttribPointer(positionAttribIdx, 3, gl.FLOAT, false, spriteVertexStride, 0);
    gl.vertexAttribPointer(uvwAttribIdx, 3, gl.FLOAT, false, spriteVertexStride, 8);
    gl.vertexAttribPointer(colorAttribIdx, 4, gl.FLOAT, false, spriteVertexStride, 20);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    return vao;
}
function createShadowVao(gl, program, vertexBuffer, indexBuffer) {
    const vao = glu.createVertexArray(gl);
    gl.bindVertexArray(vao);
    const positionAttribIdx = glu.getAttribLocation(gl, program, "in_position");
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(positionAttribIdx);
    gl.vertexAttribPointer(positionAttribIdx, 2, gl.FLOAT, false, spriteVertexStride, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    return vao;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2Z4LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2Z4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0gsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QztJQUFBLE1BQWEsS0FBSztRQUNkLFlBQW1CLENBQVMsRUFBUyxDQUFTLEVBQVMsQ0FBUyxFQUFTLENBQVM7WUFBL0QsTUFBQyxHQUFELENBQUMsQ0FBUTtZQUFTLE1BQUMsR0FBRCxDQUFDLENBQVE7WUFBUyxNQUFDLEdBQUQsQ0FBQyxDQUFRO1lBQVMsTUFBQyxHQUFELENBQUMsQ0FBUTtRQUFJLENBQUM7UUFFdkYsS0FBSztZQUNELE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BELENBQUM7O0lBRWEsV0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzdCLFdBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM3QixVQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDL0IsU0FBRyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzNCLFdBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM3QixVQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxF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Q0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDOUgsVUFBVSxJQUFJLG9CQUFvQixDQUFBO1lBRWxDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM3SSxVQUFVLElBQUksb0JBQW9CLENBQUE7WUFFbEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM3SCxVQUFVLElBQUksb0JBQW9CLENBQUE7WUFFbEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxTQUFTLENBQUE7WUFDckMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLEdBQUcsU0FBUyxHQUFHLENBQUMsQ0FBQTtZQUM3QyxJQUFJLENBQUMsT0FBTyxD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QUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIHdlYiBnbCBzcHJpdGUgcmVuZGVyaW5nIHV0aWxpdGllc1xyXG4gKi9cclxuaW1wb3J0ICogYXMgZ2x1IGZyb20gXCIuL2dsdS5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuXHJcbmV4cG9ydCBjbGFzcyBDb2xvciB7XHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcjogbnVtYmVyLCBwdWJsaWMgZzogbnVtYmVyLCBwdWJsaWMgYjogbnVtYmVyLCBwdWJsaWMgYTogbnVtYmVyKSB7IH1cclxuXHJcbiAgICBjbG9uZSgpOiBDb2xvciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBDb2xvcih0aGlzLnIsIHRoaXMuZywgdGhpcy5iLCB0aGlzLmEpXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyB3aGl0ZSA9IG5ldyBDb2xvcigxLCAxLCAxLCAxKVxyXG4gICAgcHVibGljIHN0YXRpYyBibGFjayA9IG5ldyBDb2xvcigwLCAwLCAwLCAxKVxyXG4gICAgcHVibGljIHN0YXRpYyBncmF5ID0gbmV3IENvbG9yKC41LCAuNSwgLjUsIDEpXHJcbiAgICBwdWJsaWMgc3RhdGljIHJlZCA9IG5ldyBDb2xvcigxLCAwLCAwLCAxKVxyXG4gICAgcHVibGljIHN0YXRpYyBncmVlbiA9IG5ldyBDb2xvcigwLCAxLCAwLCAxKVxyXG4gICAgcHVibGljIHN0YXRpYyBibHVlID0gbmV3IENvbG9yKDAsIDAsIDEsIDEpXHJcbn1cclxuXHJcbmNvbnN0IHNwcml0ZVZlcnRleFNyYyA9IGAjdmVyc2lvbiAzMDAgZXNcclxucHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XHJcblxyXG51bmlmb3JtIHZlYzIgdmlld3BvcnRfc2l6ZTtcclxuXHJcbmluIHZlYzIgaW5fcG9zaXRpb247XHJcbmluIHZlYzMgaW5fdXZ3O1xyXG5pbiB2ZWM0IGluX2NvbG9yO1xyXG5cclxub3V0IHZlYzIgZnJhZ19wb3NpdGlvbjtcclxub3V0IHZlYzQgZnJhZ19jb2xvcjtcclxub3V0IHZlYzMgZnJhZ191dnc7XHJcblxyXG52b2lkIG1haW4oKSB7XHJcbiAgICBmcmFnX3V2dyA9IGluX3V2dztcclxuICAgIGZyYWdfY29sb3IgPSBpbl9jb2xvcjtcclxuICAgIGZyYWdfcG9zaXRpb24gPSBpbl9wb3NpdGlvbi54eTtcclxuICAgIHZlYzIgcG9zaXRpb24gPSB2ZWMyKGluX3Bvc2l0aW9uLnggLyB2aWV3cG9ydF9zaXplLnggKiAyLmYgLSAxLmYsIC1pbl9wb3NpdGlvbi55IC8gdmlld3BvcnRfc2l6ZS55ICogMi5mICsgMS5mKTtcclxuICAgIGdsX1Bvc2l0aW9uID0gdmVjNChwb3NpdGlvbiwgMCwgMS5mKTtcclxufWBcclxuXHJcbmNvbnN0IHNwcml0ZUZyYWdtZW50U3JjID0gYCN2ZXJzaW9uIDMwMCBlc1xyXG5wcmVjaXNpb24gaGlnaHAgZmxvYXQ7XHJcbnByZWNpc2lvbiBoaWdocCBzYW1wbGVyMkQ7XHJcbnByZWNpc2lvbiBoaWdocCBzYW1wbGVyMkRBcnJheTtcclxuXHJcbnVuaWZvcm0gYm9vbCBsaXQ7XHJcbnVuaWZvcm0gYm9vbCB1c2VfYXJyYXlfdGV4dHVyZTtcclxudW5pZm9ybSBtZWRpdW1wIHZlYzIgdmlld3BvcnRfc2l6ZTtcclxudW5pZm9ybSBmbG9hdCBsaWdodF9yYWRpdXM7XHJcbnVuaWZvcm0gc2FtcGxlcjJEIHNhbXBsZXI7XHJcbnVuaWZvcm0gc2FtcGxlcjJEQXJyYXkgYXJyYXlfc2FtcGxlcjtcclxuXHJcbmluIHZlYzIgZnJhZ19wb3NpdGlvbjtcclxuaW4gdmVjNCBmcmFnX2NvbG9yO1xyXG5pbiB2ZWMzIGZyYWdfdXZ3O1xyXG5cclxub3V0IHZlYzQgb3V0X2NvbG9yO1xyXG5cclxudm9pZCBtYWluKCkge1xyXG4gICAgZmxvYXQgbCA9IDEuZjtcclxuICAgIGlmIChsaXQpIHtcclxuICAgICAgICAvLyBjYWxjdWxhdGUgZGlzdGFuY2UgZnJvbSBsaWdodFxyXG4gICAgICAgIGZsb2F0IGQgPSBsZW5ndGgoZnJhZ19wb3NpdGlvbiAtIHZpZXdwb3J0X3NpemUgLyAyLmYpO1xyXG5cclxuICAgICAgICAvLyBjYWxjdWxhdGUgbGlnaHQgYW1vdW50IChmdWxsIGZyb20gMCB0byBsaWdodCByYWRpdXMsIGxlcnAgZnJvbSBsaWdodF9yYWRpdXMgdG8gMiAqIGxpZ2h0X3JhZGl1cylcclxuICAgICAgICBsID0gbWl4KDEuZiwgMC5mLCBkIC8gbGlnaHRfcmFkaXVzKTtcclxuICAgIH1cclxuXHJcbiAgICBvdXRfY29sb3IgPSBmcmFnX2NvbG9yO1xyXG5cclxuICAgIGlmICh1c2VfYXJyYXlfdGV4dHVyZSkge1xyXG4gICAgICAgIG91dF9jb2xvciAqPSB0ZXh0dXJlKGFycmF5X3NhbXBsZXIsIGZyYWdfdXZ3KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgb3V0X2NvbG9yICo9IHRleHR1cmUoc2FtcGxlciwgZnJhZ191dncueHkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIG91dF9jb2xvciAqPSB2ZWM0KGwsIGwsIGwsIDEpO1xyXG59YFxyXG5cclxuY29uc3Qgc2hhZG93VmVydGV4U3JjID0gYCN2ZXJzaW9uIDMwMCBlc1xyXG5wcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcclxuXHJcbnVuaWZvcm0gdmVjMiB2aWV3cG9ydF9zaXplO1xyXG5cclxuaW4gdmVjMiBpbl9wb3NpdGlvbjtcclxuXHJcbm91dCB2ZWMyIGZyYWdfcG9zaXRpb247XHJcblxyXG52b2lkIG1haW4oKSB7XHJcbiAgICBmcmFnX3Bvc2l0aW9uID0gaW5fcG9zaXRpb247XHJcbiAgICB2ZWMyIHBvc2l0aW9uID0gdmVjMihpbl9wb3NpdGlvbi54IC8gdmlld3BvcnRfc2l6ZS54ICogMi5mIC0gMS5mLCAtaW5fcG9zaXRpb24ueSAvIHZpZXdwb3J0X3NpemUueSAqIDIuZiArIDEuZik7XHJcbiAgICBnbF9Qb3NpdGlvbiA9IHZlYzQocG9zaXRpb24sIDAsIDEpO1xyXG59YFxyXG5cclxuY29uc3Qgc2hhZG93RnJhZ21lbnRTcmMgPSBgI3ZlcnNpb24gMzAwIGVzXHJcbnByZWNpc2lvbiBoaWdocCBmbG9hdDtcclxucHJlY2lzaW9uIGhpZ2hwIHNhbXBsZXIyREFycmF5O1xyXG5cclxudW5pZm9ybSBtZWRpdW1wIHZlYzIgdmlld3BvcnRfc2l6ZTtcclxuXHJcbmluIHZlYzIgZnJhZ19wb3NpdGlvbjtcclxuXHJcbm91dCB2ZWM0IG91dF9jb2xvcjtcclxuXHJcbnZvaWQgbWFpbigpIHtcclxuICAgIC8vIGNhbGN1bGF0ZSBkaXN0YW5jZSBmcm9tIGxpZ2h0XHJcbiAgICBmbG9hdCBkID0gbGVuZ3RoKGZyYWdfcG9zaXRpb24gLSB2aWV3cG9ydF9zaXplIC8gMi5mKSAvICgxNi5mICogMjQuZik7XHJcbiAgICBvdXRfY29sb3IgPSB2ZWM0KGQsIGQsIGQsIDEpO1xyXG4gICAgb3V0X2NvbG9yID0gdmVjNCgxLDAsMCwxKTtcclxufVxyXG5gXHJcbmV4cG9ydCBlbnVtIFNwcml0ZUZsYWdzIHtcclxuICAgIE5vbmUgPSAwLFxyXG4gICAgTGl0ID0gMSA8PCAwLFxyXG4gICAgQXJyYXlUZXh0dXJlID0gMSA8PCAxLFxyXG4gICAgQ2FzdHNTaGFkb3dzID0gMSA8PCAyLFxyXG4gICAgRmxpcCA9IDEgPDwgM1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTcHJpdGVSZW5kZXJGbGFncyhmbGFnczogU3ByaXRlRmxhZ3MpOiBTcHJpdGVGbGFncyB7XHJcbiAgICByZXR1cm4gZmxhZ3MgJiAoU3ByaXRlRmxhZ3MuTGl0IHwgU3ByaXRlRmxhZ3MuQXJyYXlUZXh0dXJlIHwgU3ByaXRlRmxhZ3MuQ2FzdHNTaGFkb3dzKVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRleHR1cmUge1xyXG4gICAgaWQ6IG51bWJlclxyXG4gICAgdGV4dHVyZTogV2ViR0xUZXh0dXJlXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU3ByaXRlT3B0aW9ucyB7XHJcbiAgICBwb3NpdGlvbj86IGdlby5Qb2ludFxyXG4gICAgd2lkdGg/OiBudW1iZXJcclxuICAgIGhlaWdodD86IG51bWJlclxyXG4gICAgbGF5ZXI/OiBudW1iZXJcclxuICAgIGNvbG9yPzogQ29sb3JcclxuICAgIHRleHR1cmU/OiBUZXh0dXJlIHwgbnVsbFxyXG4gICAgZmxhZ3M/OiBTcHJpdGVGbGFnc1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU3ByaXRlIHtcclxuICAgIHB1YmxpYyBwb3NpdGlvbjogZ2VvLlBvaW50ID0gbmV3IGdlby5Qb2ludCgwLCAwKVxyXG4gICAgcHVibGljIHdpZHRoOiBudW1iZXIgPSAwXHJcbiAgICBwdWJsaWMgaGVpZ2h0OiBudW1iZXIgPSAwXHJcbiAgICBwdWJsaWMgbGF5ZXI6IG51bWJlciA9IDBcclxuICAgIHB1YmxpYyBjb2xvcjogQ29sb3IgPSBDb2xvci53aGl0ZS5jbG9uZSgpXHJcbiAgICBwdWJsaWMgdGV4dHVyZTogVGV4dHVyZSB8IG51bGwgPSBudWxsXHJcbiAgICBwdWJsaWMgZmxhZ3M6IFNwcml0ZUZsYWdzID0gU3ByaXRlRmxhZ3MuTm9uZVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFNwcml0ZU9wdGlvbnMgPSB7fSkge1xyXG4gICAgICAgIGlmIChvcHRpb25zLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy53aWR0aCkge1xyXG4gICAgICAgICAgICB0aGlzLndpZHRoID0gb3B0aW9ucy53aWR0aFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmxheWVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGF5ZXIgPSBvcHRpb25zLmxheWVyXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5jb2xvcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvbG9yID0gb3B0aW9ucy5jb2xvclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMudGV4dHVyZSkge1xyXG4gICAgICAgICAgICB0aGlzLnRleHR1cmUgPSBvcHRpb25zLnRleHR1cmVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmZsYWdzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmxhZ3MgPSBvcHRpb25zLmZsYWdzXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vLyB2ZXJ0ZXggbGF5b3V0OlxyXG4vLyB4eSB1dncgcmdiYSAoYWxsIGZsb2F0MzIpXHJcbmNvbnN0IGVsZW1zUGVyU3ByaXRlVmVydGV4ID0gOVxyXG5jb25zdCBzcHJpdGVWZXJ0ZXhTdHJpZGUgPSBlbGVtc1BlclNwcml0ZVZlcnRleCAqIDRcclxuXHJcbmV4cG9ydCBjbGFzcyBSZW5kZXJlciB7XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHRcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2hhZG93UHJvZ3JhbTogV2ViR0xQcm9ncmFtXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNwcml0ZVByb2dyYW06IFdlYkdMUHJvZ3JhbVxyXG4gICAgcHJpdmF0ZSBzaGFkb3dNYXBUZXh0dXJlOiBUZXh0dXJlXHJcbiAgICBwcml2YXRlIHNoYWRvd01hcEZyYW1lYnVmZmVyOiBXZWJHTEZyYW1lYnVmZmVyXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNwcml0ZUxpdFVuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb25cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlVXNlQXJyYXlUZXh0dXJlVW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvblxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzcHJpdGVTYW1wbGVyVW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvblxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzcHJpdGVBcnJheVNhbXBsZXJVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNwcml0ZVZpZXdwb3J0U2l6ZVVuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb25cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlTGlnaHRSYWRpdXNVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNoYWRvd1ZpZXdwb3J0U2l6ZVVuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb25cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2FtcGxlcjogV2ViR0xTYW1wbGVyXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFycmF5U2FtcGxlcjogV2ViR0xTYW1wbGVyXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHZlcnRleEJ1ZmZlcjogV2ViR0xCdWZmZXJcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaW5kZXhCdWZmZXI6IFdlYkdMQnVmZmVyXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNwcml0ZVZhbzogV2ViR0xWZXJ0ZXhBcnJheU9iamVjdFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzaGFkb3dWYW86IFdlYkdMVmVydGV4QXJyYXlPYmplY3RcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgd2hpdGUxeDFUZXh0dXJlOiBUZXh0dXJlXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHdoaXRlMXgxQXJyYXlUZXh0dXJlOiBUZXh0dXJlXHJcbiAgICBwcml2YXRlIHNwcml0ZXM6IFNwcml0ZVtdID0gW11cclxuICAgIHByaXZhdGUgdmVydGljZXM6IEZsb2F0MzJBcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkoKVxyXG4gICAgcHJpdmF0ZSBpbmRpY2VzOiBVaW50MTZBcnJheSA9IG5ldyBVaW50MTZBcnJheSgpXHJcbiAgICBwcml2YXRlIHZpZXdwb3J0V2lkdGg6IG51bWJlciA9IDBcclxuICAgIHByaXZhdGUgdmlld3BvcnRIZWlnaHQ6IG51bWJlciA9IDBcclxuICAgIHByaXZhdGUgdGV4dHVyZUlkOiBudW1iZXIgPSAwXHJcblxyXG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZ2wgPSBnbHUuY3JlYXRlQ29udGV4dChjYW52YXMpXHJcblxyXG4gICAgICAgIGNvbnN0IGdsID0gdGhpcy5nbFxyXG5cclxuICAgICAgICB0aGlzLnNoYWRvd1Byb2dyYW0gPSBnbHUuY29tcGlsZVByb2dyYW0oZ2wsIHNoYWRvd1ZlcnRleFNyYywgc2hhZG93RnJhZ21lbnRTcmMpXHJcbiAgICAgICAgdGhpcy5zcHJpdGVQcm9ncmFtID0gZ2x1LmNvbXBpbGVQcm9ncmFtKGdsLCBzcHJpdGVWZXJ0ZXhTcmMsIHNwcml0ZUZyYWdtZW50U3JjKVxyXG4gICAgICAgIHRoaXMuc3ByaXRlTGl0VW5pZm9ybUxvY2F0aW9uID0gZ2x1LmdldFVuaWZvcm1Mb2NhdGlvbihnbCwgdGhpcy5zcHJpdGVQcm9ncmFtLCBcImxpdFwiKVxyXG4gICAgICAgIHRoaXMuc3ByaXRlVXNlQXJyYXlUZXh0dXJlVW5pZm9ybUxvY2F0aW9uID0gZ2x1LmdldFVuaWZvcm1Mb2NhdGlvbihnbCwgdGhpcy5zcHJpdGVQcm9ncmFtLCBcInVzZV9hcnJheV90ZXh0dXJlXCIpXHJcbiAgICAgICAgdGhpcy5zcHJpdGVTYW1wbGVyVW5pZm9ybUxvY2F0aW9uID0gZ2x1LmdldFVuaWZvcm1Mb2NhdGlvbihnbCwgdGhpcy5zcHJpdGVQcm9ncmFtLCBcInNhbXBsZXJcIilcclxuICAgICAgICB0aGlzLnNwcml0ZUFycmF5U2FtcGxlclVuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgXCJhcnJheV9zYW1wbGVyXCIpXHJcbiAgICAgICAgdGhpcy5zcHJpdGVWaWV3cG9ydFNpemVVbmlmb3JtTG9jYXRpb24gPSBnbHUuZ2V0VW5pZm9ybUxvY2F0aW9uKGdsLCB0aGlzLnNwcml0ZVByb2dyYW0sIFwidmlld3BvcnRfc2l6ZVwiKVxyXG4gICAgICAgIHRoaXMuc3ByaXRlTGlnaHRSYWRpdXNVbmlmb3JtTG9jYXRpb24gPSBnbHUuZ2V0VW5pZm9ybUxvY2F0aW9uKGdsLCB0aGlzLnNwcml0ZVByb2dyYW0sIFwibGlnaHRfcmFkaXVzXCIpXHJcbiAgICAgICAgdGhpcy5zaGFkb3dWaWV3cG9ydFNpemVVbmlmb3JtTG9jYXRpb24gPSBnbHUuZ2V0VW5pZm9ybUxvY2F0aW9uKGdsLCB0aGlzLnNoYWRvd1Byb2dyYW0sIFwidmlld3BvcnRfc2l6ZVwiKVxyXG4gICAgICAgIHRoaXMudmVydGV4QnVmZmVyID0gZ2x1LmNyZWF0ZUJ1ZmZlcihnbClcclxuICAgICAgICB0aGlzLmluZGV4QnVmZmVyID0gZ2x1LmNyZWF0ZUJ1ZmZlcihnbClcclxuXHJcbiAgICAgICAgLy8gZGVmYXVsdCAxeDEgd2hpdGUgdGV4dHVyZVxyXG4gICAgICAgIHRoaXMud2hpdGUxeDFUZXh0dXJlID0gdGhpcy5jcmVhdGVUZXh0dXJlKClcclxuICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLndoaXRlMXgxVGV4dHVyZS50ZXh0dXJlKVxyXG4gICAgICAgIGdsLnRleEltYWdlMkQoZ2wuVEVYVFVSRV8yRCwgMCwgZ2wuUkdCQTgsIDEsIDEsIDAsIGdsLlJHQkEsIGdsLlVOU0lHTkVEX0JZVEUsIG5ldyBVaW50OENsYW1wZWRBcnJheShbMjU1LCAyNTUsIDI1NSwgMjU1XSkpXHJcblxyXG4gICAgICAgIHRoaXMud2hpdGUxeDFBcnJheVRleHR1cmUgPSB0aGlzLmNyZWF0ZVRleHR1cmUoKVxyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkRfQVJSQVksIHRoaXMud2hpdGUxeDFBcnJheVRleHR1cmUudGV4dHVyZSlcclxuICAgICAgICBnbC50ZXhJbWFnZTNEKGdsLlRFWFRVUkVfMkRfQVJSQVksIDAsIGdsLlJHQkE4LCAxLCAxLCAxLCAwLCBnbC5SR0JBLCBnbC5VTlNJR05FRF9CWVRFLCBuZXcgVWludDhDbGFtcGVkQXJyYXkoWzI1NSwgMjU1LCAyNTUsIDI1NV0pKVxyXG5cclxuICAgICAgICAvLyBzZXR1cCBzYW1wbGVyXHJcbiAgICAgICAgdGhpcy5zYW1wbGVyID0gZ2x1LmNyZWF0ZVNhbXBsZXIoZ2wpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLkxJTkVBUilcclxuICAgICAgICBnbC5zYW1wbGVyUGFyYW1ldGVyaSh0aGlzLnNhbXBsZXIsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTElORUFSX01JUE1BUF9MSU5FQVIpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX1dSQVBfUiwgZ2wuQ0xBTVBfVE9fRURHRSlcclxuICAgICAgICBnbC5zYW1wbGVyUGFyYW1ldGVyaSh0aGlzLnNhbXBsZXIsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKVxyXG4gICAgICAgIGdsLnNhbXBsZXJQYXJhbWV0ZXJpKHRoaXMuc2FtcGxlciwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpXHJcblxyXG4gICAgICAgIHRoaXMuYXJyYXlTYW1wbGVyID0gZ2x1LmNyZWF0ZVNhbXBsZXIoZ2wpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLkxJTkVBUilcclxuICAgICAgICBnbC5zYW1wbGVyUGFyYW1ldGVyaSh0aGlzLnNhbXBsZXIsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTElORUFSX01JUE1BUF9MSU5FQVIpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX1dSQVBfUiwgZ2wuQ0xBTVBfVE9fRURHRSlcclxuICAgICAgICBnbC5zYW1wbGVyUGFyYW1ldGVyaSh0aGlzLnNhbXBsZXIsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKVxyXG4gICAgICAgIGdsLnNhbXBsZXJQYXJhbWV0ZXJpKHRoaXMuc2FtcGxlciwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpXHJcblxyXG4gICAgICAgIHRoaXMuc3ByaXRlVmFvID0gY3JlYXRlU3ByaXRlVmFvKHRoaXMuZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgdGhpcy52ZXJ0ZXhCdWZmZXIsIHRoaXMuaW5kZXhCdWZmZXIpXHJcbiAgICAgICAgdGhpcy5zaGFkb3dWYW8gPSBjcmVhdGVTaGFkb3dWYW8odGhpcy5nbCwgdGhpcy5zaGFkb3dQcm9ncmFtLCB0aGlzLnZlcnRleEJ1ZmZlciwgdGhpcy5pbmRleEJ1ZmZlcilcclxuXHJcbiAgICAgICAgdGhpcy5zaGFkb3dNYXBUZXh0dXJlID0gdGhpcy5jcmVhdGVUZXh0dXJlKClcclxuICAgICAgICB0aGlzLnNoYWRvd01hcEZyYW1lYnVmZmVyID0gZ2x1LmNyZWF0ZUZyYW1lYnVmZmVyKGdsKVxyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuc2hhZG93TWFwVGV4dHVyZS50ZXh0dXJlKVxyXG4gICAgICAgIGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5zaGFkb3dNYXBGcmFtZWJ1ZmZlcilcclxuICAgICAgICBnbC5mcmFtZWJ1ZmZlclRleHR1cmUyRChnbC5GUkFNRUJVRkZFUiwgZ2wuQ09MT1JfQVRUQUNITUVOVDAsIGdsLlRFWFRVUkVfMkQsIHRoaXMuc2hhZG93TWFwVGV4dHVyZS50ZXh0dXJlLCAwKVxyXG4gICAgfVxyXG5cclxuICAgIGJha2VUZXh0dXJlQXJyYXkod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIGltYWdlczogVGV4SW1hZ2VTb3VyY2VbXSk6IFRleHR1cmUge1xyXG4gICAgICAgIC8vIGVhY2ggaW1hZ2UgbXVzdCBiZSB0aGUgc2FtZSBzaXplXHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcbiAgICAgICAgY29uc3QgdGV4dHVyZSA9IHRoaXMuY3JlYXRlVGV4dHVyZSgpXHJcbiAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgdGV4dHVyZS50ZXh0dXJlKVxyXG4gICAgICAgIGdsLnRleEltYWdlM0QoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgMCwgZ2wuUkdCQSwgd2lkdGgsIGhlaWdodCwgaW1hZ2VzLmxlbmd0aCwgMCwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgbnVsbClcclxuICAgICAgICBpbWFnZXMuZm9yRWFjaCgoaW1nLCBpKSA9PiB7XHJcbiAgICAgICAgICAgIGdsLnRleFN1YkltYWdlM0QoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgMCwgMCwgMCwgaSwgd2lkdGgsIGhlaWdodCwgMSwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgaW1nKVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGdsLmdlbmVyYXRlTWlwbWFwKGdsLlRFWFRVUkVfMkRfQVJSQVkpXHJcblxyXG4gICAgICAgIHJldHVybiB0ZXh0dXJlXHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgbG9hZFRleHR1cmUodXJsOiBzdHJpbmcpOiBQcm9taXNlPFRleHR1cmU+IHtcclxuICAgICAgICAvLyBlYWNoIGltYWdlIG11c3QgYmUgdGhlIHNhbWUgc2l6ZVxyXG4gICAgICAgIGNvbnN0IGdsID0gdGhpcy5nbFxyXG4gICAgICAgIGNvbnN0IHRleHR1cmUgPSBhd2FpdCBnbHUubG9hZFRleHR1cmUoZ2wsIHVybClcclxuICAgICAgICBnbC5nZW5lcmF0ZU1pcG1hcChnbC5URVhUVVJFXzJEX0FSUkFZKVxyXG4gICAgICAgIHRoaXMudGV4dHVyZUlkKytcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMudGV4dHVyZUlkLFxyXG4gICAgICAgICAgICB0ZXh0dXJlOiB0ZXh0dXJlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGRyYXdTcHJpdGUoc3ByaXRlOiBTcHJpdGUpIHtcclxuICAgICAgICAvLyBhZGQgc3ByaXRlIHRvIGFycmF5XHJcbiAgICAgICAgdGhpcy5zcHJpdGVzLnB1c2goc3ByaXRlKVxyXG4gICAgfVxyXG5cclxuICAgIGZsdXNoKGxpZ2h0UmFkaXVzOiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLmNoZWNrU2l6ZSgpXHJcblxyXG4gICAgICAgIC8vIERFQlVHOiBkcmF3IHNoYWRvdyBzcHJpdGVcclxuICAgICAgICAvLyBjb25zdCBzcHJpdGUgPSBuZXcgU3ByaXRlKHtcclxuICAgICAgICAvLyAgICAgcG9zaXRpb246IG5ldyBnZW8uUG9pbnQoMCwgMCksXHJcbiAgICAgICAgLy8gICAgIHdpZHRoOiAxMDI0LFxyXG4gICAgICAgIC8vICAgICBoZWlnaHQ6IDEwMjQsXHJcbiAgICAgICAgLy8gICAgIGNvbG9yOiBbMSwgMSwgMSwgMV0sXHJcbiAgICAgICAgLy8gICAgIHRleHR1cmU6IHRoaXMuc2hhZG93TWFwVGV4dHVyZSxcclxuICAgICAgICAvLyAgICAgZmxhZ3M6IFNwcml0ZUZsYWdzLkZsaXBcclxuICAgICAgICAvLyB9KVxyXG4gICAgICAgIC8vIHRoaXMuZHJhd1Nwcml0ZShzcHJpdGUpXHJcblxyXG4gICAgICAgIHRoaXMuYmF0Y2hTcHJpdGVzKClcclxuICAgICAgICAvLyB0aGlzLmRyYXdTaGFkb3dzKClcclxuICAgICAgICB0aGlzLmRyYXdTcHJpdGVzKGxpZ2h0UmFkaXVzKVxyXG5cclxuICAgICAgICAvLyBjbGVhciBzcHJpdGVzIGFuZCBiYXRjaGVzXHJcbiAgICAgICAgdGhpcy5zcHJpdGVzID0gW11cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGJhdGNoU3ByaXRlcygpIHtcclxuICAgICAgICAvLyBhc3NpZ24gZGVmYXVsdCB0ZXh0dXJlIHRvIHNwcml0ZXMgd2l0aG91dCBhIHRleHR1cmVcclxuICAgICAgICBmb3IgKGNvbnN0IHNwcml0ZSBvZiB0aGlzLnNwcml0ZXMpIHtcclxuICAgICAgICAgICAgaWYgKCFzcHJpdGUudGV4dHVyZSkge1xyXG4gICAgICAgICAgICAgICAgc3ByaXRlLnRleHR1cmUgPSB0aGlzLndoaXRlMXgxVGV4dHVyZVxyXG4gICAgICAgICAgICAgICAgc3ByaXRlLmZsYWdzID0gc3ByaXRlLmZsYWdzICYgflNwcml0ZUZsYWdzLkFycmF5VGV4dHVyZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjb3B5IHZlcnRpY2VzIGFuZCBpbmRpY2VzIHRvIGFycmF5cywgZ3Jvd2luZyBhcnJheXMgaWYgcmVxdWlyZWRcclxuICAgICAgICBjb25zdCBudW1WZXJ0aWNlcyA9IHRoaXMuc3ByaXRlcy5sZW5ndGggKiA0XHJcbiAgICAgICAgY29uc3QgbnVtVmVydGV4RWxlbXMgPSBudW1WZXJ0aWNlcyAqIGVsZW1zUGVyU3ByaXRlVmVydGV4XHJcbiAgICAgICAgY29uc3QgZWxlbXNQZXJTcHJpdGUgPSA0ICogZWxlbXNQZXJTcHJpdGVWZXJ0ZXhcclxuICAgICAgICBpZiAodGhpcy52ZXJ0aWNlcy5sZW5ndGggPCBudW1WZXJ0ZXhFbGVtcykge1xyXG4gICAgICAgICAgICB0aGlzLnZlcnRpY2VzID0gbmV3IEZsb2F0MzJBcnJheShudW1WZXJ0ZXhFbGVtcylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG51bUluZGljZXMgPSB0aGlzLnNwcml0ZXMubGVuZ3RoICogNlxyXG4gICAgICAgIGlmICh0aGlzLmluZGljZXMubGVuZ3RoIDwgbnVtSW5kaWNlcykge1xyXG4gICAgICAgICAgICB0aGlzLmluZGljZXMgPSBuZXcgVWludDE2QXJyYXkobnVtSW5kaWNlcylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zcHJpdGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNwcml0ZSA9IHRoaXMuc3ByaXRlc1tpXVxyXG4gICAgICAgICAgICBsZXQgZWxlbU9mZnNldCA9IGkgKiBlbGVtc1BlclNwcml0ZVxyXG4gICAgICAgICAgICBsZXQgaW5kZXhPZmZzZXQgPSBpICogNlxyXG4gICAgICAgICAgICBsZXQgYmFzZUluZGV4ID0gaSAqIDRcclxuICAgICAgICAgICAgY29uc3QgZmxpcCA9IChzcHJpdGUuZmxhZ3MgJiBTcHJpdGVGbGFncy5GbGlwKSA9PT0gU3ByaXRlRmxhZ3MuRmxpcFxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoVmVydGV4KGVsZW1PZmZzZXQsIHNwcml0ZS5wb3NpdGlvbi54LCBzcHJpdGUucG9zaXRpb24ueSwgMCwgZmxpcCA/IDEgOiAwLCBzcHJpdGUubGF5ZXIsIHNwcml0ZS5jb2xvcilcclxuICAgICAgICAgICAgZWxlbU9mZnNldCArPSBlbGVtc1BlclNwcml0ZVZlcnRleFxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoVmVydGV4KGVsZW1PZmZzZXQsIHNwcml0ZS5wb3NpdGlvbi54LCBzcHJpdGUucG9zaXRpb24ueSArIHNwcml0ZS5oZWlnaHQsIDAsIGZsaXAgPyAwIDogMSwgc3ByaXRlLmxheWVyLCBzcHJpdGUuY29sb3IpXHJcbiAgICAgICAgICAgIGVsZW1PZmZzZXQgKz0gZWxlbXNQZXJTcHJpdGVWZXJ0ZXhcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFZlcnRleChlbGVtT2Zmc2V0LCBzcHJpdGUucG9zaXRpb24ueCArIHNwcml0ZS53aWR0aCwgc3ByaXRlLnBvc2l0aW9uLnkgKyBzcHJpdGUuaGVpZ2h0LCAxLCBmbGlwID8gMCA6IDEsIHNwcml0ZS5sYXllciwgc3ByaXRlLmNvbG9yKVxyXG4gICAgICAgICAgICBlbGVtT2Zmc2V0ICs9IGVsZW1zUGVyU3ByaXRlVmVydGV4XHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hWZXJ0ZXgoZWxlbU9mZnNldCwgc3ByaXRlLnBvc2l0aW9uLnggKyBzcHJpdGUud2lkdGgsIHNwcml0ZS5wb3NpdGlvbi55LCAxLCBmbGlwID8gMSA6IDAsIHNwcml0ZS5sYXllciwgc3ByaXRlLmNvbG9yKVxyXG4gICAgICAgICAgICBlbGVtT2Zmc2V0ICs9IGVsZW1zUGVyU3ByaXRlVmVydGV4XHJcblxyXG4gICAgICAgICAgICB0aGlzLmluZGljZXNbaW5kZXhPZmZzZXRdID0gYmFzZUluZGV4XHJcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlc1tpbmRleE9mZnNldCArIDFdID0gYmFzZUluZGV4ICsgMVxyXG4gICAgICAgICAgICB0aGlzLmluZGljZXNbaW5kZXhPZmZzZXQgKyAyXSA9IGJhc2VJbmRleCArIDJcclxuICAgICAgICAgICAgdGhpcy5pbmRpY2VzW2luZGV4T2Zmc2V0ICsgM10gPSBiYXNlSW5kZXhcclxuICAgICAgICAgICAgdGhpcy5pbmRpY2VzW2luZGV4T2Zmc2V0ICsgNF0gPSBiYXNlSW5kZXggKyAyXHJcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlc1tpbmRleE9mZnNldCArIDVdID0gYmFzZUluZGV4ICsgM1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdHJhbnNmZXIgdmVydGljZXMgYW5kIGluZGljZXMgdG8gR1BVXHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcbiAgICAgICAgZ2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMudmVydGV4QnVmZmVyKVxyXG4gICAgICAgIGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnZlcnRpY2VzLnN1YmFycmF5KDAsIHRoaXMuc3ByaXRlcy5sZW5ndGggKiA0ICogZWxlbXNQZXJTcHJpdGUpLCBnbC5EWU5BTUlDX0RSQVcpXHJcbiAgICAgICAgZ2wuYmluZEJ1ZmZlcihnbC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgdGhpcy5pbmRleEJ1ZmZlcilcclxuICAgICAgICBnbC5idWZmZXJEYXRhKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCB0aGlzLmluZGljZXMuc3ViYXJyYXkoMCwgdGhpcy5zcHJpdGVzLmxlbmd0aCAqIDYpLCBnbC5EWU5BTUlDX0RSQVcpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gcHJpdmF0ZSBkcmF3U2hhZG93cygpIHtcclxuICAgIC8vICAgICBjb25zdCBnbCA9IHRoaXMuZ2xcclxuICAgIC8vICAgICBnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuc2hhZG93TWFwRnJhbWVidWZmZXIpXHJcbiAgICAvLyAgICAgZ2wudmlld3BvcnQoMCwgMCwgZ2wuZHJhd2luZ0J1ZmZlcldpZHRoLCBnbC5kcmF3aW5nQnVmZmVySGVpZ2h0KVxyXG4gICAgLy8gICAgIGdsLmNsZWFyQ29sb3IoMCwgMCwgMCwgMClcclxuICAgIC8vICAgICBnbC5jbGVhcihnbC5DT0xPUl9CVUZGRVJfQklUKVxyXG4gICAgLy8gICAgIGdsLmJpbmRWZXJ0ZXhBcnJheSh0aGlzLnNoYWRvd1ZhbylcclxuICAgIC8vICAgICBnbC51c2VQcm9ncmFtKHRoaXMuc2hhZG93UHJvZ3JhbSlcclxuICAgIC8vICAgICBnbC51bmlmb3JtMmYodGhpcy5zaGFkb3dWaWV3cG9ydFNpemVVbmlmb3JtTG9jYXRpb24sIGdsLmRyYXdpbmdCdWZmZXJXaWR0aCwgZ2wuZHJhd2luZ0J1ZmZlckhlaWdodClcclxuICAgIC8vICAgICBnbC5iaW5kVmVydGV4QXJyYXkodGhpcy5zaGFkb3dWYW8pXHJcblxyXG4gICAgLy8gICAgIC8vIGRyYXcgZWFjaCBzaGFkb3cgY2FzdGluZyBiYXRjaFxyXG4gICAgLy8gICAgIGZvciAoY29uc3QgYmF0Y2ggb2YgdGhpcy5iYXRjaGVzKSB7XHJcbiAgICAvLyAgICAgICAgIGlmICghKGJhdGNoLmZsYWdzICYgU3ByaXRlRmxhZ3MuQ2FzdHNTaGFkb3dzKSkge1xyXG4gICAgLy8gICAgICAgICAgICAgY29udGludWVcclxuICAgIC8vICAgICAgICAgfVxyXG5cclxuICAgIC8vICAgICAgICAgZ2wuZHJhd0VsZW1lbnRzKGdsLlRSSUFOR0xFUywgYmF0Y2gubnVtU3ByaXRlcyAqIDYsIGdsLlVOU0lHTkVEX1NIT1JULCBiYXRjaC5vZmZzZXQgKiA2ICogMilcclxuICAgIC8vICAgICB9XHJcbiAgICAvLyB9XHJcblxyXG4gICAgcHJpdmF0ZSBkcmF3U3ByaXRlcyhsaWdodFJhZGl1czogbnVtYmVyKSB7XHJcbiAgICAgICAgLy8gZHJhdyB0aGUgYmF0Y2hlZCBzcHJpdGVzXHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcbiAgICAgICAgZ2wuZW5hYmxlKGdsLkJMRU5EKVxyXG4gICAgICAgIGdsLmJsZW5kRnVuYyhnbC5TUkNfQUxQSEEsIGdsLk9ORV9NSU5VU19TUkNfQUxQSEEpO1xyXG4gICAgICAgIGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbClcclxuICAgICAgICBnbC52aWV3cG9ydCgwLCAwLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgZ2wuY2xlYXJDb2xvcigwLCAwLCAwLCAxKVxyXG4gICAgICAgIGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQgfCBnbC5ERVBUSF9CVUZGRVJfQklUKVxyXG4gICAgICAgIGdsLnVzZVByb2dyYW0odGhpcy5zcHJpdGVQcm9ncmFtKVxyXG4gICAgICAgIGdsLnVuaWZvcm0yZih0aGlzLnNwcml0ZVZpZXdwb3J0U2l6ZVVuaWZvcm1Mb2NhdGlvbiwgZ2wuZHJhd2luZ0J1ZmZlcldpZHRoLCBnbC5kcmF3aW5nQnVmZmVySGVpZ2h0KVxyXG4gICAgICAgIGdsLnVuaWZvcm0xZih0aGlzLnNwcml0ZUxpZ2h0UmFkaXVzVW5pZm9ybUxvY2F0aW9uLCBsaWdodFJhZGl1cylcclxuICAgICAgICBnbC5iaW5kVmVydGV4QXJyYXkodGhpcy5zcHJpdGVWYW8pXHJcblxyXG4gICAgICAgIGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTApXHJcbiAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy53aGl0ZTF4MVRleHR1cmUudGV4dHVyZSlcclxuICAgICAgICBnbC5iaW5kU2FtcGxlcigwLCB0aGlzLnNhbXBsZXIpXHJcblxyXG4gICAgICAgIGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTEpXHJcbiAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgdGhpcy53aGl0ZTF4MUFycmF5VGV4dHVyZS50ZXh0dXJlKVxyXG4gICAgICAgIGdsLmJpbmRTYW1wbGVyKDEsIHRoaXMuYXJyYXlTYW1wbGVyKVxyXG5cclxuICAgICAgICBnbC51bmlmb3JtMWkodGhpcy5zcHJpdGVTYW1wbGVyVW5pZm9ybUxvY2F0aW9uLCAwKVxyXG4gICAgICAgIGdsLnVuaWZvcm0xaSh0aGlzLnNwcml0ZUFycmF5U2FtcGxlclVuaWZvcm1Mb2NhdGlvbiwgMSlcclxuXHJcbiAgICAgICAgLy8gZHJhdyBlYWNoIGJhdGNoXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBsZXQgb2Zmc2V0ID0gMFxyXG4gICAgICAgICAgICBsZXQgbnVtU3ByaXRlcyA9IDBcclxuICAgICAgICAgICAgbGV0IHJlbmRlckZsYWdzID0gU3ByaXRlRmxhZ3MuTm9uZVxyXG4gICAgICAgICAgICBsZXQgdGV4dHVyZUlkID0gLTFcclxuICAgICAgICAgICAgZm9yIChjb25zdCBzcHJpdGUgb2YgdGhpcy5zcHJpdGVzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXNwcml0ZS50ZXh0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gdGV4dHVyZSBhc3NpZ25lZCAoZGVmYXVsdCBzaG91bGQgaGF2ZSBiZWVuIGFwcGxpZWQpXCIpXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3ByaXRlUmVuZGVyRmxhZ3MgPSBnZXRTcHJpdGVSZW5kZXJGbGFncyhzcHJpdGUuZmxhZ3MpXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZW5kZXJGbGFnQnJlYWsgPSByZW5kZXJGbGFncyAhPT0gc3ByaXRlUmVuZGVyRmxhZ3NcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHR1cmVCcmVhayA9IHRleHR1cmVJZCAhPT0gc3ByaXRlLnRleHR1cmUuaWRcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBkcmF3IGN1cnJlbnQgYmF0Y2hcclxuICAgICAgICAgICAgICAgIGlmIChyZW5kZXJGbGFnQnJlYWsgfHwgdGV4dHVyZUJyZWFrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bVNwcml0ZXMgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLmRyYXdFbGVtZW50cyhnbC5UUklBTkdMRVMsIG51bVNwcml0ZXMgKiA2LCBnbC5VTlNJR05FRF9TSE9SVCwgb2Zmc2V0ICogNiAqIDIpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBvZmZzZXQgKz0gbnVtU3ByaXRlc1xyXG4gICAgICAgICAgICAgICAgICAgIG51bVNwcml0ZXMgPSAwXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHJlbmRlckZsYWdzICE9PSBzcHJpdGVSZW5kZXJGbGFncykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlckZsYWdzID0gc3ByaXRlUmVuZGVyRmxhZ3NcclxuICAgICAgICAgICAgICAgICAgICBnbC51bmlmb3JtMWkodGhpcy5zcHJpdGVMaXRVbmlmb3JtTG9jYXRpb24sIHJlbmRlckZsYWdzICYgU3ByaXRlRmxhZ3MuTGl0ID8gMSA6IDApXHJcbiAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybTFpKHRoaXMuc3ByaXRlVXNlQXJyYXlUZXh0dXJlVW5pZm9ybUxvY2F0aW9uLCByZW5kZXJGbGFncyAmIFNwcml0ZUZsYWdzLkFycmF5VGV4dHVyZSA/IDEgOiAwKVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0ZXh0dXJlSWQgIT09IHNwcml0ZS50ZXh0dXJlLmlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dHVyZUlkID0gc3ByaXRlLnRleHR1cmUuaWRcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVuZGVyRmxhZ3MgJiBTcHJpdGVGbGFncy5BcnJheVRleHR1cmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMClcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy53aGl0ZTF4MVRleHR1cmUudGV4dHVyZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgc3ByaXRlLnRleHR1cmUudGV4dHVyZSlcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBzcHJpdGUudGV4dHVyZS50ZXh0dXJlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUxKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJEX0FSUkFZLCB0aGlzLndoaXRlMXgxQXJyYXlUZXh0dXJlLnRleHR1cmUpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICsrbnVtU3ByaXRlc1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobnVtU3ByaXRlcyA+IDApIHtcclxuICAgICAgICAgICAgICAgIGdsLmRyYXdFbGVtZW50cyhnbC5UUklBTkdMRVMsIG51bVNwcml0ZXMgKiA2LCBnbC5VTlNJR05FRF9TSE9SVCwgb2Zmc2V0ICogNiAqIDIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGNsZWFuIHVwIHN0YXRlXHJcbiAgICAgICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMClcclxuICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKVxyXG4gICAgICAgIGdsLmJpbmRTYW1wbGVyKDAsIG51bGwpXHJcbiAgICAgICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMSlcclxuICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJEX0FSUkFZLCBudWxsKVxyXG4gICAgICAgIGdsLmJpbmRTYW1wbGVyKDEsIG51bGwpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjcmVhdGVUZXh0dXJlKCk6IFRleHR1cmUge1xyXG4gICAgICAgICsrdGhpcy50ZXh0dXJlSWRcclxuICAgICAgICBjb25zdCB0ZXh0dXJlOiBUZXh0dXJlID0ge1xyXG4gICAgICAgICAgICB0ZXh0dXJlOiBnbHUuY3JlYXRlVGV4dHVyZSh0aGlzLmdsKSxcclxuICAgICAgICAgICAgaWQ6IHRoaXMudGV4dHVyZUlkXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGV4dHVyZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHVzaFZlcnRleChvZmZzZXQ6IG51bWJlciwgeDogbnVtYmVyLCB5OiBudW1iZXIsIHU6IG51bWJlciwgdjogbnVtYmVyLCB3OiBudW1iZXIsIGNvbG9yOiBDb2xvcikge1xyXG4gICAgICAgIC8vIHBvc2l0aW9uXHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXRdID0geFxyXG4gICAgICAgIHRoaXMudmVydGljZXNbKytvZmZzZXRdID0geVxyXG5cclxuICAgICAgICAvLyB1dlxyXG4gICAgICAgIHRoaXMudmVydGljZXNbKytvZmZzZXRdID0gdVxyXG4gICAgICAgIHRoaXMudmVydGljZXNbKytvZmZzZXRdID0gdlxyXG4gICAgICAgIHRoaXMudmVydGljZXNbKytvZmZzZXRdID0gd1xyXG5cclxuICAgICAgICAvLyBjb2xvclxyXG4gICAgICAgIHRoaXMudmVydGljZXNbKytvZmZzZXRdID0gY29sb3IuclxyXG4gICAgICAgIHRoaXMudmVydGljZXNbKytvZmZzZXRdID0gY29sb3IuZ1xyXG4gICAgICAgIHRoaXMudmVydGljZXNbKytvZmZzZXRdID0gY29sb3IuYlxyXG4gICAgICAgIHRoaXMudmVydGljZXNbKytvZmZzZXRdID0gY29sb3IuYVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2hlY2tTaXplKCkge1xyXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IHRoaXMuY2FudmFzXHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcblxyXG4gICAgICAgIGlmIChjYW52YXMud2lkdGggIT09IGNhbnZhcy5jbGllbnRXaWR0aCAmJiBjYW52YXMuaGVpZ2h0ICE9PSBjYW52YXMuY2xpZW50SGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgICAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGNhbnZhcy53aWR0aCA9PT0gdGhpcy52aWV3cG9ydFdpZHRoICYmIGNhbnZhcy5oZWlnaHQgPT09IHRoaXMudmlld3BvcnRIZWlnaHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnZpZXdwb3J0V2lkdGggPSBjYW52YXMud2lkdGhcclxuICAgICAgICB0aGlzLnZpZXdwb3J0SGVpZ2h0ID0gY2FudmFzLmhlaWdodFxyXG5cclxuICAgICAgICAvLyBzZXR1cCBzaGFkb3dtYXBwaW5nIHRleHR1cmUgYW5kIHNoYWRvdyBmcmFtZWJ1ZmZlclxyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuc2hhZG93TWFwVGV4dHVyZS50ZXh0dXJlKVxyXG4gICAgICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xyXG4gICAgICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xyXG4gICAgICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5MSU5FQVIpO1xyXG4gICAgICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQVhfTEVWRUwsIDApO1xyXG4gICAgICAgIGdsLnRleEltYWdlMkQoZ2wuVEVYVFVSRV8yRCwgMCwgZ2wuUkdCQSwgdGhpcy52aWV3cG9ydFdpZHRoLCB0aGlzLnZpZXdwb3J0SGVpZ2h0LCAwLCBnbC5SR0JBLCBnbC5VTlNJR05FRF9CWVRFLCBudWxsKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVTcHJpdGVWYW8oXHJcbiAgICBnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCxcclxuICAgIHByb2dyYW06IFdlYkdMUHJvZ3JhbSxcclxuICAgIHZlcnRleEJ1ZmZlcjogV2ViR0xCdWZmZXIsXHJcbiAgICBpbmRleEJ1ZmZlcjogV2ViR0xCdWZmZXIpOiBXZWJHTFZlcnRleEFycmF5T2JqZWN0IHtcclxuICAgIGNvbnN0IHZhbyA9IGdsdS5jcmVhdGVWZXJ0ZXhBcnJheShnbClcclxuICAgIGdsLmJpbmRWZXJ0ZXhBcnJheSh2YW8pXHJcblxyXG4gICAgY29uc3QgcG9zaXRpb25BdHRyaWJJZHggPSBnbHUuZ2V0QXR0cmliTG9jYXRpb24oZ2wsIHByb2dyYW0sIFwiaW5fcG9zaXRpb25cIilcclxuICAgIGNvbnN0IHV2d0F0dHJpYklkeCA9IGdsdS5nZXRBdHRyaWJMb2NhdGlvbihnbCwgcHJvZ3JhbSwgXCJpbl91dndcIilcclxuICAgIGNvbnN0IGNvbG9yQXR0cmliSWR4ID0gZ2x1LmdldEF0dHJpYkxvY2F0aW9uKGdsLCBwcm9ncmFtLCBcImluX2NvbG9yXCIpXHJcbiAgICBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdmVydGV4QnVmZmVyKVxyXG4gICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkocG9zaXRpb25BdHRyaWJJZHgpXHJcbiAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheSh1dndBdHRyaWJJZHgpXHJcbiAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShjb2xvckF0dHJpYklkeClcclxuICAgIGdsLnZlcnRleEF0dHJpYlBvaW50ZXIocG9zaXRpb25BdHRyaWJJZHgsIDMsIGdsLkZMT0FULCBmYWxzZSwgc3ByaXRlVmVydGV4U3RyaWRlLCAwKVxyXG4gICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcih1dndBdHRyaWJJZHgsIDMsIGdsLkZMT0FULCBmYWxzZSwgc3ByaXRlVmVydGV4U3RyaWRlLCA4KVxyXG4gICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcihjb2xvckF0dHJpYklkeCwgNCwgZ2wuRkxPQVQsIGZhbHNlLCBzcHJpdGVWZXJ0ZXhTdHJpZGUsIDIwKVxyXG4gICAgZ2wuYmluZEJ1ZmZlcihnbC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgaW5kZXhCdWZmZXIpXHJcbiAgICByZXR1cm4gdmFvXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVNoYWRvd1ZhbyhcclxuICAgIGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LFxyXG4gICAgcHJvZ3JhbTogV2ViR0xQcm9ncmFtLFxyXG4gICAgdmVydGV4QnVmZmVyOiBXZWJHTEJ1ZmZlcixcclxuICAgIGluZGV4QnVmZmVyOiBXZWJHTEJ1ZmZlcik6IFdlYkdMVmVydGV4QXJyYXlPYmplY3Qge1xyXG4gICAgY29uc3QgdmFvID0gZ2x1LmNyZWF0ZVZlcnRleEFycmF5KGdsKVxyXG4gICAgZ2wuYmluZFZlcnRleEFycmF5KHZhbylcclxuXHJcbiAgICBjb25zdCBwb3NpdGlvbkF0dHJpYklkeCA9IGdsdS5nZXRBdHRyaWJMb2NhdGlvbihnbCwgcHJvZ3JhbSwgXCJpbl9wb3NpdGlvblwiKVxyXG4gICAgZ2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHZlcnRleEJ1ZmZlcilcclxuICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHBvc2l0aW9uQXR0cmliSWR4KVxyXG4gICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcihwb3NpdGlvbkF0dHJpYklkeCwgMiwgZ2wuRkxPQVQsIGZhbHNlLCBzcHJpdGVWZXJ0ZXhTdHJpZGUsIDApXHJcbiAgICBnbC5iaW5kQnVmZmVyKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCBpbmRleEJ1ZmZlcilcclxuICAgIHJldHVybiB2YW9cclxufSJdfQ==