/**
 * web gl sprite rendering utilities
 */
import * as glu from "./glu.js";
import * as geo from "../shared/geo2d.js";
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

    out_color *= vec4(l, l, l, 1);
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
        this.color = [1, 1, 1, 1];
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
        // setup sampler
        this.sampler = glu.createSampler(gl);
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
            this.pushVertex(elemOffset, sprite.position.x, sprite.position.y, 0, flip ? 1 : 0, sprite.layer, sprite.color[0], sprite.color[1], sprite.color[2], sprite.color[3]);
            elemOffset += elemsPerSpriteVertex;
            this.pushVertex(elemOffset, sprite.position.x, sprite.position.y + sprite.height, 0, flip ? 0 : 1, sprite.layer, sprite.color[0], sprite.color[1], sprite.color[2], sprite.color[3]);
            elemOffset += elemsPerSpriteVertex;
            this.pushVertex(elemOffset, sprite.position.x + sprite.width, sprite.position.y + sprite.height, 1, flip ? 0 : 1, sprite.layer, sprite.color[0], sprite.color[1], sprite.color[2], sprite.color[3]);
            elemOffset += elemsPerSpriteVertex;
            this.pushVertex(elemOffset, sprite.position.x + sprite.width, sprite.position.y, 1, flip ? 1 : 0, sprite.layer, sprite.color[0], sprite.color[1], sprite.color[2], sprite.color[3]);
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
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindSampler(0, this.sampler);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindSampler(1, this.sampler);
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
                        console.log(numSprites);
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
                        gl.activeTexture(gl.TEXTURE1);
                        gl.bindTexture(gl.TEXTURE_2D_ARRAY, sprite.texture.texture);
                    }
                    else {
                        gl.activeTexture(gl.TEXTURE0);
                        gl.bindTexture(gl.TEXTURE_2D, sprite.texture.texture);
                    }
                }
                ++numSprites;
            }
            if (numSprites > 0) {
                gl.drawElements(gl.TRIANGLES, numSprites * 6, gl.UNSIGNED_SHORT, offset * 6 * 2);
            }
        }
        // for (const batch of this.batches) {
        //     const useArrayTexture = batch.flags & SpriteFlags.ArrayTexture ? true : false
        //     const texture = batch.texture?.texture ?? null
        //     if (useArrayTexture) {
        //         gl.activeTexture(gl.TEXTURE1)
        //         gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture)
        //     } else {
        //         gl.activeTexture(gl.TEXTURE0)
        //         gl.bindTexture(gl.TEXTURE_2D, texture)
        //     }
        //     gl.uniform1i(this.spriteLitUniformLocation, batch.flags & SpriteFlags.Lit ? 1 : 0)
        //     gl.uniform1i(this.spriteUseArrayTextureUniformLocation, useArrayTexture ? 1 : 0)
        //     gl.drawElements(gl.TRIANGLES, batch.numSprites * 6, gl.UNSIGNED_SHORT, batch.offset * 6 * 2)
        // }
    }
    createTexture() {
        ++this.textureId;
        const texture = {
            texture: glu.createTexture(this.gl),
            id: this.textureId
        };
        return texture;
    }
    pushVertex(offset, x, y, u, v, w, r, g, b, a) {
        // position
        this.vertices[offset] = x;
        this.vertices[++offset] = y;
        // uv
        this.vertices[++offset] = u;
        this.vertices[++offset] = v;
        this.vertices[++offset] = w;
        // color
        this.vertices[++offset] = r;
        this.vertices[++offset] = g;
        this.vertices[++offset] = b;
        this.vertices[++offset] = a;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2Z4LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2Z4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0gsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUl6QyxNQUFNLGVBQWUsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQW1CdEIsQ0FBQTtBQUVGLE1BQU0saUJBQWlCLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUFxQ3hCLENBQUE7QUFFRixNQUFNLGVBQWUsR0FBRzs7Ozs7Ozs7Ozs7OztFQWF0QixDQUFBO0FBRUYsTUFBTSxpQkFBaUIsR0FBRzs7Ozs7Ozs7Ozs7Ozs7OztDQWdCekIsQ0FBQTtBQUNELE1BQU0sQ0FBTixJQUFZLFdBTVg7QUFORCxXQUFZLFdBQVc7SUFDbkIsNkNBQVEsQ0FBQTtJQUNSLDJDQUFZLENBQUE7SUFDWiw2REFBcUIsQ0FBQTtJQUNyQiw2REFBcUIsQ0FBQTtJQUNyQiw2Q0FBYSxDQUFBO0FBQ2pCLENBQUMsRUFOVyxXQUFXLEtBQVgsV0FBVyxRQU10QjtBQUVELFNBQVMsb0JBQW9CLENBQUMsS0FBa0I7SUFDNUMsT0FBTyxLQUFLLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxHQUFHLFdBQVcsQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFBO0FBQzFGLENBQUM7QUFpQkQsTUFBTSxPQUFPLE1BQU07SUFTZixZQUFZLFVBQXlCLEVBQUU7UUFSaEMsYUFBUSxHQUFjLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekMsVUFBSyxHQUFXLENBQUMsQ0FBQTtRQUNqQixXQUFNLEdBQVcsQ0FBQyxDQUFBO1FBQ2xCLFVBQUssR0FBVyxDQUFDLENBQUE7UUFDakIsVUFBSyxHQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMs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QyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3BLLFVBQVUsSUFBSSxvQkFBb0IsQ0FBQTtZQUVsQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3BMLFVBQVUsSUFBSSxvQkFBb0IsQ0FBQTtZQUVsQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbk0sVUFBVSxJQUFJ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QUFDLENBQUE7SUFDN0MsRUFBRSxDQUFDLG1CQUFtQixDQUFDLGlCQUFpQixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNwRixFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUNuRCxPQUFPLEdBQUcsQ0FBQTtBQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogd2ViIGdsIHNwcml0ZSByZW5kZXJpbmcgdXRpbGl0aWVzXHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBnbHUgZnJvbSBcIi4vZ2x1LmpzXCJcclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvMmQuanNcIlxyXG5cclxuZXhwb3J0IHR5cGUgQ29sb3IgPSBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXVxyXG5cclxuY29uc3Qgc3ByaXRlVmVydGV4U3JjID0gYCN2ZXJzaW9uIDMwMCBlc1xyXG5wcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcclxuXHJcbnVuaWZvcm0gdmVjMiB2aWV3cG9ydF9zaXplO1xyXG5cclxuaW4gdmVjMiBpbl9wb3NpdGlvbjtcclxuaW4gdmVjMyBpbl91dnc7XHJcbmluIHZlYzQgaW5fY29sb3I7XHJcblxyXG5vdXQgdmVjMiBmcmFnX3Bvc2l0aW9uO1xyXG5vdXQgdmVjNCBmcmFnX2NvbG9yO1xyXG5vdXQgdmVjMyBmcmFnX3V2dztcclxuXHJcbnZvaWQgbWFpbigpIHtcclxuICAgIGZyYWdfdXZ3ID0gaW5fdXZ3O1xyXG4gICAgZnJhZ19jb2xvciA9IGluX2NvbG9yO1xyXG4gICAgZnJhZ19wb3NpdGlvbiA9IGluX3Bvc2l0aW9uLnh5O1xyXG4gICAgdmVjMiBwb3NpdGlvbiA9IHZlYzIoaW5fcG9zaXRpb24ueCAvIHZpZXdwb3J0X3NpemUueCAqIDIuZiAtIDEuZiwgLWluX3Bvc2l0aW9uLnkgLyB2aWV3cG9ydF9zaXplLnkgKiAyLmYgKyAxLmYpO1xyXG4gICAgZ2xfUG9zaXRpb24gPSB2ZWM0KHBvc2l0aW9uLCAwLCAxLmYpO1xyXG59YFxyXG5cclxuY29uc3Qgc3ByaXRlRnJhZ21lbnRTcmMgPSBgI3ZlcnNpb24gMzAwIGVzXHJcbnByZWNpc2lvbiBoaWdocCBmbG9hdDtcclxucHJlY2lzaW9uIGhpZ2hwIHNhbXBsZXIyRDtcclxucHJlY2lzaW9uIGhpZ2hwIHNhbXBsZXIyREFycmF5O1xyXG5cclxudW5pZm9ybSBib29sIGxpdDtcclxudW5pZm9ybSBib29sIHVzZV9hcnJheV90ZXh0dXJlO1xyXG51bmlmb3JtIG1lZGl1bXAgdmVjMiB2aWV3cG9ydF9zaXplO1xyXG51bmlmb3JtIGZsb2F0IGxpZ2h0X3JhZGl1cztcclxudW5pZm9ybSBzYW1wbGVyMkQgc2FtcGxlcjtcclxudW5pZm9ybSBzYW1wbGVyMkRBcnJheSBhcnJheV9zYW1wbGVyO1xyXG5cclxuaW4gdmVjMiBmcmFnX3Bvc2l0aW9uO1xyXG5pbiB2ZWM0IGZyYWdfY29sb3I7XHJcbmluIHZlYzMgZnJhZ191dnc7XHJcblxyXG5vdXQgdmVjNCBvdXRfY29sb3I7XHJcblxyXG52b2lkIG1haW4oKSB7XHJcbiAgICBmbG9hdCBsID0gMS5mO1xyXG4gICAgaWYgKGxpdCkge1xyXG4gICAgICAgIC8vIGNhbGN1bGF0ZSBkaXN0YW5jZSBmcm9tIGxpZ2h0XHJcbiAgICAgICAgZmxvYXQgZCA9IGxlbmd0aChmcmFnX3Bvc2l0aW9uIC0gdmlld3BvcnRfc2l6ZSAvIDIuZik7XHJcblxyXG4gICAgICAgIC8vIGNhbGN1bGF0ZSBsaWdodCBhbW91bnQgKGZ1bGwgZnJvbSAwIHRvIGxpZ2h0IHJhZGl1cywgbGVycCBmcm9tIGxpZ2h0X3JhZGl1cyB0byAyICogbGlnaHRfcmFkaXVzKVxyXG4gICAgICAgIGwgPSBtaXgoMS5mLCAwLmYsIGQgLyBsaWdodF9yYWRpdXMpO1xyXG4gICAgfVxyXG5cclxuICAgIG91dF9jb2xvciA9IGZyYWdfY29sb3I7XHJcblxyXG4gICAgaWYgKHVzZV9hcnJheV90ZXh0dXJlKSB7XHJcbiAgICAgICAgb3V0X2NvbG9yICo9IHRleHR1cmUoYXJyYXlfc2FtcGxlciwgZnJhZ191dncpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBvdXRfY29sb3IgKj0gdGV4dHVyZShzYW1wbGVyLCBmcmFnX3V2dy54eSk7XHJcbiAgICB9XHJcblxyXG4gICAgb3V0X2NvbG9yICo9IHZlYzQobCwgbCwgbCwgMSk7XHJcbn1gXHJcblxyXG5jb25zdCBzaGFkb3dWZXJ0ZXhTcmMgPSBgI3ZlcnNpb24gMzAwIGVzXHJcbnByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1xyXG5cclxudW5pZm9ybSB2ZWMyIHZpZXdwb3J0X3NpemU7XHJcblxyXG5pbiB2ZWMyIGluX3Bvc2l0aW9uO1xyXG5cclxub3V0IHZlYzIgZnJhZ19wb3NpdGlvbjtcclxuXHJcbnZvaWQgbWFpbigpIHtcclxuICAgIGZyYWdfcG9zaXRpb24gPSBpbl9wb3NpdGlvbjtcclxuICAgIHZlYzIgcG9zaXRpb24gPSB2ZWMyKGluX3Bvc2l0aW9uLnggLyB2aWV3cG9ydF9zaXplLnggKiAyLmYgLSAxLmYsIC1pbl9wb3NpdGlvbi55IC8gdmlld3BvcnRfc2l6ZS55ICogMi5mICsgMS5mKTtcclxuICAgIGdsX1Bvc2l0aW9uID0gdmVjNChwb3NpdGlvbiwgMCwgMSk7XHJcbn1gXHJcblxyXG5jb25zdCBzaGFkb3dGcmFnbWVudFNyYyA9IGAjdmVyc2lvbiAzMDAgZXNcclxucHJlY2lzaW9uIGhpZ2hwIGZsb2F0O1xyXG5wcmVjaXNpb24gaGlnaHAgc2FtcGxlcjJEQXJyYXk7XHJcblxyXG51bmlmb3JtIG1lZGl1bXAgdmVjMiB2aWV3cG9ydF9zaXplO1xyXG5cclxuaW4gdmVjMiBmcmFnX3Bvc2l0aW9uO1xyXG5cclxub3V0IHZlYzQgb3V0X2NvbG9yO1xyXG5cclxudm9pZCBtYWluKCkge1xyXG4gICAgLy8gY2FsY3VsYXRlIGRpc3RhbmNlIGZyb20gbGlnaHRcclxuICAgIGZsb2F0IGQgPSBsZW5ndGgoZnJhZ19wb3NpdGlvbiAtIHZpZXdwb3J0X3NpemUgLyAyLmYpIC8gKDE2LmYgKiAyNC5mKTtcclxuICAgIG91dF9jb2xvciA9IHZlYzQoZCwgZCwgZCwgMSk7XHJcbiAgICBvdXRfY29sb3IgPSB2ZWM0KDEsMCwwLDEpO1xyXG59XHJcbmBcclxuZXhwb3J0IGVudW0gU3ByaXRlRmxhZ3Mge1xyXG4gICAgTm9uZSA9IDAsXHJcbiAgICBMaXQgPSAxIDw8IDAsXHJcbiAgICBBcnJheVRleHR1cmUgPSAxIDw8IDEsXHJcbiAgICBDYXN0c1NoYWRvd3MgPSAxIDw8IDIsXHJcbiAgICBGbGlwID0gMSA8PCAzXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFNwcml0ZVJlbmRlckZsYWdzKGZsYWdzOiBTcHJpdGVGbGFncyk6IFNwcml0ZUZsYWdzIHtcclxuICAgIHJldHVybiBmbGFncyAmIChTcHJpdGVGbGFncy5MaXQgfCBTcHJpdGVGbGFncy5BcnJheVRleHR1cmUgfCBTcHJpdGVGbGFncy5DYXN0c1NoYWRvd3MpXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGV4dHVyZSB7XHJcbiAgICBpZDogbnVtYmVyXHJcbiAgICB0ZXh0dXJlOiBXZWJHTFRleHR1cmVcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTcHJpdGVPcHRpb25zIHtcclxuICAgIHBvc2l0aW9uPzogZ2VvLlBvaW50XHJcbiAgICB3aWR0aD86IG51bWJlclxyXG4gICAgaGVpZ2h0PzogbnVtYmVyXHJcbiAgICBsYXllcj86IG51bWJlclxyXG4gICAgY29sb3I/OiBDb2xvclxyXG4gICAgdGV4dHVyZT86IFRleHR1cmUgfCBudWxsXHJcbiAgICBmbGFncz86IFNwcml0ZUZsYWdzXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTcHJpdGUge1xyXG4gICAgcHVibGljIHBvc2l0aW9uOiBnZW8uUG9pbnQgPSBuZXcgZ2VvLlBvaW50KDAsIDApXHJcbiAgICBwdWJsaWMgd2lkdGg6IG51bWJlciA9IDBcclxuICAgIHB1YmxpYyBoZWlnaHQ6IG51bWJlciA9IDBcclxuICAgIHB1YmxpYyBsYXllcjogbnVtYmVyID0gMFxyXG4gICAgcHVibGljIGNvbG9yOiBDb2xvciA9IFsxLCAxLCAxLCAxXVxyXG4gICAgcHVibGljIHRleHR1cmU6IFRleHR1cmUgfCBudWxsID0gbnVsbFxyXG4gICAgcHVibGljIGZsYWdzOiBTcHJpdGVGbGFncyA9IFNwcml0ZUZsYWdzLk5vbmVcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBTcHJpdGVPcHRpb25zID0ge30pIHtcclxuICAgICAgICBpZiAob3B0aW9ucy5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uID0gb3B0aW9ucy5wb3NpdGlvblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMud2lkdGgpIHtcclxuICAgICAgICAgICAgdGhpcy53aWR0aCA9IG9wdGlvbnMud2lkdGhcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmhlaWdodCkge1xyXG4gICAgICAgICAgICB0aGlzLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5sYXllcikge1xyXG4gICAgICAgICAgICB0aGlzLmxheWVyID0gb3B0aW9ucy5sYXllclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuY29sb3IpIHtcclxuICAgICAgICAgICAgdGhpcy5jb2xvciA9IG9wdGlvbnMuY29sb3JcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLnRleHR1cmUpIHtcclxuICAgICAgICAgICAgdGhpcy50ZXh0dXJlID0gb3B0aW9ucy50ZXh0dXJlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5mbGFncykge1xyXG4gICAgICAgICAgICB0aGlzLmZsYWdzID0gb3B0aW9ucy5mbGFnc1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLy8gdmVydGV4IGxheW91dDpcclxuLy8geHkgdXZ3IHJnYmEgKGFsbCBmbG9hdDMyKVxyXG5jb25zdCBlbGVtc1BlclNwcml0ZVZlcnRleCA9IDlcclxuY29uc3Qgc3ByaXRlVmVydGV4U3RyaWRlID0gZWxlbXNQZXJTcHJpdGVWZXJ0ZXggKiA0XHJcblxyXG5leHBvcnQgY2xhc3MgUmVuZGVyZXIge1xyXG4gICAgcHVibGljIHJlYWRvbmx5IGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNoYWRvd1Byb2dyYW06IFdlYkdMUHJvZ3JhbVxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzcHJpdGVQcm9ncmFtOiBXZWJHTFByb2dyYW1cclxuICAgIHByaXZhdGUgc2hhZG93TWFwVGV4dHVyZTogVGV4dHVyZVxyXG4gICAgcHJpdmF0ZSBzaGFkb3dNYXBGcmFtZWJ1ZmZlcjogV2ViR0xGcmFtZWJ1ZmZlclxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzcHJpdGVMaXRVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNwcml0ZVVzZUFycmF5VGV4dHVyZVVuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb25cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlU2FtcGxlclVuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb25cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlQXJyYXlTYW1wbGVyVW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvblxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzcHJpdGVWaWV3cG9ydFNpemVVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNwcml0ZUxpZ2h0UmFkaXVzVW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvblxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzaGFkb3dWaWV3cG9ydFNpemVVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNhbXBsZXI6IFdlYkdMU2FtcGxlclxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB2ZXJ0ZXhCdWZmZXI6IFdlYkdMQnVmZmVyXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGluZGV4QnVmZmVyOiBXZWJHTEJ1ZmZlclxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzcHJpdGVWYW86IFdlYkdMVmVydGV4QXJyYXlPYmplY3RcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2hhZG93VmFvOiBXZWJHTFZlcnRleEFycmF5T2JqZWN0XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHdoaXRlMXgxVGV4dHVyZTogVGV4dHVyZVxyXG4gICAgcHJpdmF0ZSBzcHJpdGVzOiBTcHJpdGVbXSA9IFtdXHJcbiAgICBwcml2YXRlIHZlcnRpY2VzOiBGbG9hdDMyQXJyYXkgPSBuZXcgRmxvYXQzMkFycmF5KClcclxuICAgIHByaXZhdGUgaW5kaWNlczogVWludDE2QXJyYXkgPSBuZXcgVWludDE2QXJyYXkoKVxyXG4gICAgcHJpdmF0ZSB2aWV3cG9ydFdpZHRoOiBudW1iZXIgPSAwXHJcbiAgICBwcml2YXRlIHZpZXdwb3J0SGVpZ2h0OiBudW1iZXIgPSAwXHJcbiAgICBwcml2YXRlIHRleHR1cmVJZDogbnVtYmVyID0gMFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpIHtcclxuICAgICAgICB0aGlzLmdsID0gZ2x1LmNyZWF0ZUNvbnRleHQoY2FudmFzKVxyXG5cclxuICAgICAgICBjb25zdCBnbCA9IHRoaXMuZ2xcclxuXHJcbiAgICAgICAgdGhpcy5zaGFkb3dQcm9ncmFtID0gZ2x1LmNvbXBpbGVQcm9ncmFtKGdsLCBzaGFkb3dWZXJ0ZXhTcmMsIHNoYWRvd0ZyYWdtZW50U3JjKVxyXG4gICAgICAgIHRoaXMuc3ByaXRlUHJvZ3JhbSA9IGdsdS5jb21waWxlUHJvZ3JhbShnbCwgc3ByaXRlVmVydGV4U3JjLCBzcHJpdGVGcmFnbWVudFNyYylcclxuICAgICAgICB0aGlzLnNwcml0ZUxpdFVuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgXCJsaXRcIilcclxuICAgICAgICB0aGlzLnNwcml0ZVVzZUFycmF5VGV4dHVyZVVuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgXCJ1c2VfYXJyYXlfdGV4dHVyZVwiKVxyXG4gICAgICAgIHRoaXMuc3ByaXRlU2FtcGxlclVuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgXCJzYW1wbGVyXCIpXHJcbiAgICAgICAgdGhpcy5zcHJpdGVBcnJheVNhbXBsZXJVbmlmb3JtTG9jYXRpb24gPSBnbHUuZ2V0VW5pZm9ybUxvY2F0aW9uKGdsLCB0aGlzLnNwcml0ZVByb2dyYW0sIFwiYXJyYXlfc2FtcGxlclwiKVxyXG4gICAgICAgIHRoaXMuc3ByaXRlVmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uID0gZ2x1LmdldFVuaWZvcm1Mb2NhdGlvbihnbCwgdGhpcy5zcHJpdGVQcm9ncmFtLCBcInZpZXdwb3J0X3NpemVcIilcclxuICAgICAgICB0aGlzLnNwcml0ZUxpZ2h0UmFkaXVzVW5pZm9ybUxvY2F0aW9uID0gZ2x1LmdldFVuaWZvcm1Mb2NhdGlvbihnbCwgdGhpcy5zcHJpdGVQcm9ncmFtLCBcImxpZ2h0X3JhZGl1c1wiKVxyXG4gICAgICAgIHRoaXMuc2hhZG93Vmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uID0gZ2x1LmdldFVuaWZvcm1Mb2NhdGlvbihnbCwgdGhpcy5zaGFkb3dQcm9ncmFtLCBcInZpZXdwb3J0X3NpemVcIilcclxuICAgICAgICB0aGlzLnZlcnRleEJ1ZmZlciA9IGdsdS5jcmVhdGVCdWZmZXIoZ2wpXHJcbiAgICAgICAgdGhpcy5pbmRleEJ1ZmZlciA9IGdsdS5jcmVhdGVCdWZmZXIoZ2wpXHJcblxyXG4gICAgICAgIC8vIGRlZmF1bHQgMXgxIHdoaXRlIHRleHR1cmVcclxuICAgICAgICB0aGlzLndoaXRlMXgxVGV4dHVyZSA9IHRoaXMuY3JlYXRlVGV4dHVyZSgpXHJcbiAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy53aGl0ZTF4MVRleHR1cmUudGV4dHVyZSlcclxuICAgICAgICBnbC50ZXhJbWFnZTJEKGdsLlRFWFRVUkVfMkQsIDAsIGdsLlJHQkE4LCAxLCAxLCAwLCBnbC5SR0JBLCBnbC5VTlNJR05FRF9CWVRFLCBuZXcgVWludDhDbGFtcGVkQXJyYXkoWzI1NSwgMjU1LCAyNTUsIDI1NV0pKVxyXG5cclxuICAgICAgICAvLyBzZXR1cCBzYW1wbGVyXHJcbiAgICAgICAgdGhpcy5zYW1wbGVyID0gZ2x1LmNyZWF0ZVNhbXBsZXIoZ2wpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLkxJTkVBUilcclxuICAgICAgICBnbC5zYW1wbGVyUGFyYW1ldGVyaSh0aGlzLnNhbXBsZXIsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTElORUFSX01JUE1BUF9MSU5FQVIpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX1dSQVBfUiwgZ2wuQ0xBTVBfVE9fRURHRSlcclxuICAgICAgICBnbC5zYW1wbGVyUGFyYW1ldGVyaSh0aGlzLnNhbXBsZXIsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKVxyXG4gICAgICAgIGdsLnNhbXBsZXJQYXJhbWV0ZXJpKHRoaXMuc2FtcGxlciwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpXHJcblxyXG4gICAgICAgIHRoaXMuc3ByaXRlVmFvID0gY3JlYXRlU3ByaXRlVmFvKHRoaXMuZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgdGhpcy52ZXJ0ZXhCdWZmZXIsIHRoaXMuaW5kZXhCdWZmZXIpXHJcbiAgICAgICAgdGhpcy5zaGFkb3dWYW8gPSBjcmVhdGVTaGFkb3dWYW8odGhpcy5nbCwgdGhpcy5zaGFkb3dQcm9ncmFtLCB0aGlzLnZlcnRleEJ1ZmZlciwgdGhpcy5pbmRleEJ1ZmZlcilcclxuXHJcbiAgICAgICAgdGhpcy5zaGFkb3dNYXBUZXh0dXJlID0gdGhpcy5jcmVhdGVUZXh0dXJlKClcclxuICAgICAgICB0aGlzLnNoYWRvd01hcEZyYW1lYnVmZmVyID0gZ2x1LmNyZWF0ZUZyYW1lYnVmZmVyKGdsKVxyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuc2hhZG93TWFwVGV4dHVyZS50ZXh0dXJlKVxyXG4gICAgICAgIGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5zaGFkb3dNYXBGcmFtZWJ1ZmZlcilcclxuICAgICAgICBnbC5mcmFtZWJ1ZmZlclRleHR1cmUyRChnbC5GUkFNRUJVRkZFUiwgZ2wuQ09MT1JfQVRUQUNITUVOVDAsIGdsLlRFWFRVUkVfMkQsIHRoaXMuc2hhZG93TWFwVGV4dHVyZS50ZXh0dXJlLCAwKVxyXG4gICAgfVxyXG5cclxuICAgIGJha2VUZXh0dXJlQXJyYXkod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIGltYWdlczogVGV4SW1hZ2VTb3VyY2VbXSk6IFRleHR1cmUge1xyXG4gICAgICAgIC8vIGVhY2ggaW1hZ2UgbXVzdCBiZSB0aGUgc2FtZSBzaXplXHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcbiAgICAgICAgY29uc3QgdGV4dHVyZSA9IHRoaXMuY3JlYXRlVGV4dHVyZSgpXHJcbiAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgdGV4dHVyZS50ZXh0dXJlKVxyXG4gICAgICAgIGdsLnRleEltYWdlM0QoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgMCwgZ2wuUkdCQSwgd2lkdGgsIGhlaWdodCwgaW1hZ2VzLmxlbmd0aCwgMCwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgbnVsbClcclxuICAgICAgICBpbWFnZXMuZm9yRWFjaCgoaW1nLCBpKSA9PiB7XHJcbiAgICAgICAgICAgIGdsLnRleFN1YkltYWdlM0QoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgMCwgMCwgMCwgaSwgd2lkdGgsIGhlaWdodCwgMSwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgaW1nKVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGdsLmdlbmVyYXRlTWlwbWFwKGdsLlRFWFRVUkVfMkRfQVJSQVkpXHJcblxyXG4gICAgICAgIHJldHVybiB0ZXh0dXJlXHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgbG9hZFRleHR1cmUodXJsOiBzdHJpbmcpOiBQcm9taXNlPFRleHR1cmU+IHtcclxuICAgICAgICAvLyBlYWNoIGltYWdlIG11c3QgYmUgdGhlIHNhbWUgc2l6ZVxyXG4gICAgICAgIGNvbnN0IGdsID0gdGhpcy5nbFxyXG4gICAgICAgIGNvbnN0IHRleHR1cmUgPSBhd2FpdCBnbHUubG9hZFRleHR1cmUoZ2wsIHVybClcclxuICAgICAgICBnbC5nZW5lcmF0ZU1pcG1hcChnbC5URVhUVVJFXzJEX0FSUkFZKVxyXG4gICAgICAgIHRoaXMudGV4dHVyZUlkKytcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMudGV4dHVyZUlkLFxyXG4gICAgICAgICAgICB0ZXh0dXJlOiB0ZXh0dXJlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGRyYXdTcHJpdGUoc3ByaXRlOiBTcHJpdGUpIHtcclxuICAgICAgICAvLyBhZGQgc3ByaXRlIHRvIGFycmF5XHJcbiAgICAgICAgdGhpcy5zcHJpdGVzLnB1c2goc3ByaXRlKVxyXG4gICAgfVxyXG5cclxuICAgIGZsdXNoKGxpZ2h0UmFkaXVzOiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLmNoZWNrU2l6ZSgpXHJcblxyXG4gICAgICAgIC8vIERFQlVHOiBkcmF3IHNoYWRvdyBzcHJpdGVcclxuICAgICAgICAvLyBjb25zdCBzcHJpdGUgPSBuZXcgU3ByaXRlKHtcclxuICAgICAgICAvLyAgICAgcG9zaXRpb246IG5ldyBnZW8uUG9pbnQoMCwgMCksXHJcbiAgICAgICAgLy8gICAgIHdpZHRoOiAxMDI0LFxyXG4gICAgICAgIC8vICAgICBoZWlnaHQ6IDEwMjQsXHJcbiAgICAgICAgLy8gICAgIGNvbG9yOiBbMSwgMSwgMSwgMV0sXHJcbiAgICAgICAgLy8gICAgIHRleHR1cmU6IHRoaXMuc2hhZG93TWFwVGV4dHVyZSxcclxuICAgICAgICAvLyAgICAgZmxhZ3M6IFNwcml0ZUZsYWdzLkZsaXBcclxuICAgICAgICAvLyB9KVxyXG4gICAgICAgIC8vIHRoaXMuZHJhd1Nwcml0ZShzcHJpdGUpXHJcblxyXG4gICAgICAgIHRoaXMuYmF0Y2hTcHJpdGVzKClcclxuICAgICAgICAvLyB0aGlzLmRyYXdTaGFkb3dzKClcclxuICAgICAgICB0aGlzLmRyYXdTcHJpdGVzKGxpZ2h0UmFkaXVzKVxyXG5cclxuICAgICAgICAvLyBjbGVhciBzcHJpdGVzIGFuZCBiYXRjaGVzXHJcbiAgICAgICAgdGhpcy5zcHJpdGVzID0gW11cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGJhdGNoU3ByaXRlcygpIHtcclxuICAgICAgICAvLyBhc3NpZ24gZGVmYXVsdCB0ZXh0dXJlIHRvIHNwcml0ZXMgd2l0aG91dCBhIHRleHR1cmVcclxuICAgICAgICBmb3IgKGNvbnN0IHNwcml0ZSBvZiB0aGlzLnNwcml0ZXMpIHtcclxuICAgICAgICAgICAgaWYgKCFzcHJpdGUudGV4dHVyZSkge1xyXG4gICAgICAgICAgICAgICAgc3ByaXRlLnRleHR1cmUgPSB0aGlzLndoaXRlMXgxVGV4dHVyZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjb3B5IHZlcnRpY2VzIGFuZCBpbmRpY2VzIHRvIGFycmF5cywgZ3Jvd2luZyBhcnJheXMgaWYgcmVxdWlyZWRcclxuICAgICAgICBjb25zdCBudW1WZXJ0aWNlcyA9IHRoaXMuc3ByaXRlcy5sZW5ndGggKiA0XHJcbiAgICAgICAgY29uc3QgbnVtVmVydGV4RWxlbXMgPSBudW1WZXJ0aWNlcyAqIGVsZW1zUGVyU3ByaXRlVmVydGV4XHJcbiAgICAgICAgY29uc3QgZWxlbXNQZXJTcHJpdGUgPSA0ICogZWxlbXNQZXJTcHJpdGVWZXJ0ZXhcclxuICAgICAgICBpZiAodGhpcy52ZXJ0aWNlcy5sZW5ndGggPCBudW1WZXJ0ZXhFbGVtcykge1xyXG4gICAgICAgICAgICB0aGlzLnZlcnRpY2VzID0gbmV3IEZsb2F0MzJBcnJheShudW1WZXJ0ZXhFbGVtcylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG51bUluZGljZXMgPSB0aGlzLnNwcml0ZXMubGVuZ3RoICogNlxyXG4gICAgICAgIGlmICh0aGlzLmluZGljZXMubGVuZ3RoIDwgbnVtSW5kaWNlcykge1xyXG4gICAgICAgICAgICB0aGlzLmluZGljZXMgPSBuZXcgVWludDE2QXJyYXkobnVtSW5kaWNlcylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zcHJpdGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNwcml0ZSA9IHRoaXMuc3ByaXRlc1tpXVxyXG4gICAgICAgICAgICBsZXQgZWxlbU9mZnNldCA9IGkgKiBlbGVtc1BlclNwcml0ZVxyXG4gICAgICAgICAgICBsZXQgaW5kZXhPZmZzZXQgPSBpICogNlxyXG4gICAgICAgICAgICBsZXQgYmFzZUluZGV4ID0gaSAqIDRcclxuICAgICAgICAgICAgY29uc3QgZmxpcCA9IChzcHJpdGUuZmxhZ3MgJiBTcHJpdGVGbGFncy5GbGlwKSA9PT0gU3ByaXRlRmxhZ3MuRmxpcFxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoVmVydGV4KGVsZW1PZmZzZXQsIHNwcml0ZS5wb3NpdGlvbi54LCBzcHJpdGUucG9zaXRpb24ueSwgMCwgZmxpcCA/IDEgOiAwLCBzcHJpdGUubGF5ZXIsIHNwcml0ZS5jb2xvclswXSwgc3ByaXRlLmNvbG9yWzFdLCBzcHJpdGUuY29sb3JbMl0sIHNwcml0ZS5jb2xvclszXSlcclxuICAgICAgICAgICAgZWxlbU9mZnNldCArPSBlbGVtc1BlclNwcml0ZVZlcnRleFxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoVmVydGV4KGVsZW1PZmZzZXQsIHNwcml0ZS5wb3NpdGlvbi54LCBzcHJpdGUucG9zaXRpb24ueSArIHNwcml0ZS5oZWlnaHQsIDAsIGZsaXAgPyAwIDogMSwgc3ByaXRlLmxheWVyLCBzcHJpdGUuY29sb3JbMF0sIHNwcml0ZS5jb2xvclsxXSwgc3ByaXRlLmNvbG9yWzJdLCBzcHJpdGUuY29sb3JbM10pXHJcbiAgICAgICAgICAgIGVsZW1PZmZzZXQgKz0gZWxlbXNQZXJTcHJpdGVWZXJ0ZXhcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFZlcnRleChlbGVtT2Zmc2V0LCBzcHJpdGUucG9zaXRpb24ueCArIHNwcml0ZS53aWR0aCwgc3ByaXRlLnBvc2l0aW9uLnkgKyBzcHJpdGUuaGVpZ2h0LCAxLCBmbGlwID8gMCA6IDEsIHNwcml0ZS5sYXllciwgc3ByaXRlLmNvbG9yWzBdLCBzcHJpdGUuY29sb3JbMV0sIHNwcml0ZS5jb2xvclsyXSwgc3ByaXRlLmNvbG9yWzNdKVxyXG4gICAgICAgICAgICBlbGVtT2Zmc2V0ICs9IGVsZW1zUGVyU3ByaXRlVmVydGV4XHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hWZXJ0ZXgoZWxlbU9mZnNldCwgc3ByaXRlLnBvc2l0aW9uLnggKyBzcHJpdGUud2lkdGgsIHNwcml0ZS5wb3NpdGlvbi55LCAxLCBmbGlwID8gMSA6IDAsIHNwcml0ZS5sYXllciwgc3ByaXRlLmNvbG9yWzBdLCBzcHJpdGUuY29sb3JbMV0sIHNwcml0ZS5jb2xvclsyXSwgc3ByaXRlLmNvbG9yWzNdKVxyXG4gICAgICAgICAgICBlbGVtT2Zmc2V0ICs9IGVsZW1zUGVyU3ByaXRlVmVydGV4XHJcblxyXG4gICAgICAgICAgICB0aGlzLmluZGljZXNbaW5kZXhPZmZzZXRdID0gYmFzZUluZGV4XHJcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlc1tpbmRleE9mZnNldCArIDFdID0gYmFzZUluZGV4ICsgMVxyXG4gICAgICAgICAgICB0aGlzLmluZGljZXNbaW5kZXhPZmZzZXQgKyAyXSA9IGJhc2VJbmRleCArIDJcclxuICAgICAgICAgICAgdGhpcy5pbmRpY2VzW2luZGV4T2Zmc2V0ICsgM10gPSBiYXNlSW5kZXhcclxuICAgICAgICAgICAgdGhpcy5pbmRpY2VzW2luZGV4T2Zmc2V0ICsgNF0gPSBiYXNlSW5kZXggKyAyXHJcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlc1tpbmRleE9mZnNldCArIDVdID0gYmFzZUluZGV4ICsgM1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdHJhbnNmZXIgdmVydGljZXMgYW5kIGluZGljZXMgdG8gR1BVXHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcbiAgICAgICAgZ2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMudmVydGV4QnVmZmVyKVxyXG4gICAgICAgIGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnZlcnRpY2VzLnN1YmFycmF5KDAsIHRoaXMuc3ByaXRlcy5sZW5ndGggKiA0ICogZWxlbXNQZXJTcHJpdGUpLCBnbC5EWU5BTUlDX0RSQVcpXHJcbiAgICAgICAgZ2wuYmluZEJ1ZmZlcihnbC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgdGhpcy5pbmRleEJ1ZmZlcilcclxuICAgICAgICBnbC5idWZmZXJEYXRhKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCB0aGlzLmluZGljZXMuc3ViYXJyYXkoMCwgdGhpcy5zcHJpdGVzLmxlbmd0aCAqIDYpLCBnbC5EWU5BTUlDX0RSQVcpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gcHJpdmF0ZSBkcmF3U2hhZG93cygpIHtcclxuICAgIC8vICAgICBjb25zdCBnbCA9IHRoaXMuZ2xcclxuICAgIC8vICAgICBnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuc2hhZG93TWFwRnJhbWVidWZmZXIpXHJcbiAgICAvLyAgICAgZ2wudmlld3BvcnQoMCwgMCwgZ2wuZHJhd2luZ0J1ZmZlcldpZHRoLCBnbC5kcmF3aW5nQnVmZmVySGVpZ2h0KVxyXG4gICAgLy8gICAgIGdsLmNsZWFyQ29sb3IoMCwgMCwgMCwgMClcclxuICAgIC8vICAgICBnbC5jbGVhcihnbC5DT0xPUl9CVUZGRVJfQklUKVxyXG4gICAgLy8gICAgIGdsLmJpbmRWZXJ0ZXhBcnJheSh0aGlzLnNoYWRvd1ZhbylcclxuICAgIC8vICAgICBnbC51c2VQcm9ncmFtKHRoaXMuc2hhZG93UHJvZ3JhbSlcclxuICAgIC8vICAgICBnbC51bmlmb3JtMmYodGhpcy5zaGFkb3dWaWV3cG9ydFNpemVVbmlmb3JtTG9jYXRpb24sIGdsLmRyYXdpbmdCdWZmZXJXaWR0aCwgZ2wuZHJhd2luZ0J1ZmZlckhlaWdodClcclxuICAgIC8vICAgICBnbC5iaW5kVmVydGV4QXJyYXkodGhpcy5zaGFkb3dWYW8pXHJcblxyXG4gICAgLy8gICAgIC8vIGRyYXcgZWFjaCBzaGFkb3cgY2FzdGluZyBiYXRjaFxyXG4gICAgLy8gICAgIGZvciAoY29uc3QgYmF0Y2ggb2YgdGhpcy5iYXRjaGVzKSB7XHJcbiAgICAvLyAgICAgICAgIGlmICghKGJhdGNoLmZsYWdzICYgU3ByaXRlRmxhZ3MuQ2FzdHNTaGFkb3dzKSkge1xyXG4gICAgLy8gICAgICAgICAgICAgY29udGludWVcclxuICAgIC8vICAgICAgICAgfVxyXG5cclxuICAgIC8vICAgICAgICAgZ2wuZHJhd0VsZW1lbnRzKGdsLlRSSUFOR0xFUywgYmF0Y2gubnVtU3ByaXRlcyAqIDYsIGdsLlVOU0lHTkVEX1NIT1JULCBiYXRjaC5vZmZzZXQgKiA2ICogMilcclxuICAgIC8vICAgICB9XHJcbiAgICAvLyB9XHJcblxyXG4gICAgcHJpdmF0ZSBkcmF3U3ByaXRlcyhsaWdodFJhZGl1czogbnVtYmVyKSB7XHJcbiAgICAgICAgLy8gZHJhdyB0aGUgYmF0Y2hlZCBzcHJpdGVzXHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcbiAgICAgICAgZ2wuZW5hYmxlKGdsLkJMRU5EKVxyXG4gICAgICAgIGdsLmJsZW5kRnVuYyhnbC5TUkNfQUxQSEEsIGdsLk9ORV9NSU5VU19TUkNfQUxQSEEpO1xyXG4gICAgICAgIGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbClcclxuICAgICAgICBnbC52aWV3cG9ydCgwLCAwLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgZ2wuY2xlYXJDb2xvcigwLCAwLCAwLCAxKVxyXG4gICAgICAgIGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQgfCBnbC5ERVBUSF9CVUZGRVJfQklUKVxyXG4gICAgICAgIGdsLnVzZVByb2dyYW0odGhpcy5zcHJpdGVQcm9ncmFtKVxyXG4gICAgICAgIGdsLnVuaWZvcm0yZih0aGlzLnNwcml0ZVZpZXdwb3J0U2l6ZVVuaWZvcm1Mb2NhdGlvbiwgZ2wuZHJhd2luZ0J1ZmZlcldpZHRoLCBnbC5kcmF3aW5nQnVmZmVySGVpZ2h0KVxyXG4gICAgICAgIGdsLnVuaWZvcm0xZih0aGlzLnNwcml0ZUxpZ2h0UmFkaXVzVW5pZm9ybUxvY2F0aW9uLCBsaWdodFJhZGl1cylcclxuICAgICAgICBnbC5iaW5kVmVydGV4QXJyYXkodGhpcy5zcHJpdGVWYW8pXHJcblxyXG4gICAgICAgIGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTApXHJcbiAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgbnVsbClcclxuICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKVxyXG4gICAgICAgIGdsLmJpbmRTYW1wbGVyKDAsIHRoaXMuc2FtcGxlcilcclxuXHJcbiAgICAgICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMSlcclxuICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJEX0FSUkFZLCBudWxsKVxyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpXHJcbiAgICAgICAgZ2wuYmluZFNhbXBsZXIoMSwgdGhpcy5zYW1wbGVyKVxyXG5cclxuICAgICAgICBnbC51bmlmb3JtMWkodGhpcy5zcHJpdGVTYW1wbGVyVW5pZm9ybUxvY2F0aW9uLCAwKVxyXG4gICAgICAgIGdsLnVuaWZvcm0xaSh0aGlzLnNwcml0ZUFycmF5U2FtcGxlclVuaWZvcm1Mb2NhdGlvbiwgMSlcclxuXHJcbiAgICAgICAgLy8gZHJhdyBlYWNoIGJhdGNoXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBsZXQgb2Zmc2V0ID0gMFxyXG4gICAgICAgICAgICBsZXQgbnVtU3ByaXRlcyA9IDBcclxuICAgICAgICAgICAgbGV0IHJlbmRlckZsYWdzID0gU3ByaXRlRmxhZ3MuTm9uZVxyXG4gICAgICAgICAgICBsZXQgdGV4dHVyZUlkID0gLTFcclxuICAgICAgICAgICAgZm9yIChjb25zdCBzcHJpdGUgb2YgdGhpcy5zcHJpdGVzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXNwcml0ZS50ZXh0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gdGV4dHVyZSBhc3NpZ25lZCAoZGVmYXVsdCBzaG91bGQgaGF2ZSBiZWVuIGFwcGxpZWQpXCIpXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3ByaXRlUmVuZGVyRmxhZ3MgPSBnZXRTcHJpdGVSZW5kZXJGbGFncyhzcHJpdGUuZmxhZ3MpXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZW5kZXJGbGFnQnJlYWsgPSByZW5kZXJGbGFncyAhPT0gc3ByaXRlUmVuZGVyRmxhZ3NcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHR1cmVCcmVhayA9IHRleHR1cmVJZCAhPT0gc3ByaXRlLnRleHR1cmUuaWRcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBkcmF3IGN1cnJlbnQgYmF0Y2hcclxuICAgICAgICAgICAgICAgIGlmIChyZW5kZXJGbGFnQnJlYWsgfHwgdGV4dHVyZUJyZWFrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bVNwcml0ZXMgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG51bVNwcml0ZXMpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLmRyYXdFbGVtZW50cyhnbC5UUklBTkdMRVMsIG51bVNwcml0ZXMgKiA2LCBnbC5VTlNJR05FRF9TSE9SVCwgb2Zmc2V0ICogNiAqIDIpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBvZmZzZXQgKz0gbnVtU3ByaXRlc1xyXG4gICAgICAgICAgICAgICAgICAgIG51bVNwcml0ZXMgPSAwXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHJlbmRlckZsYWdzICE9PSBzcHJpdGVSZW5kZXJGbGFncykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlckZsYWdzID0gc3ByaXRlUmVuZGVyRmxhZ3NcclxuICAgICAgICAgICAgICAgICAgICBnbC51bmlmb3JtMWkodGhpcy5zcHJpdGVMaXRVbmlmb3JtTG9jYXRpb24sIHJlbmRlckZsYWdzICYgU3ByaXRlRmxhZ3MuTGl0ID8gMSA6IDApXHJcbiAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybTFpKHRoaXMuc3ByaXRlVXNlQXJyYXlUZXh0dXJlVW5pZm9ybUxvY2F0aW9uLCByZW5kZXJGbGFncyAmIFNwcml0ZUZsYWdzLkFycmF5VGV4dHVyZSA/IDEgOiAwKVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0ZXh0dXJlSWQgIT09IHNwcml0ZS50ZXh0dXJlLmlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dHVyZUlkID0gc3ByaXRlLnRleHR1cmUuaWRcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVuZGVyRmxhZ3MgJiBTcHJpdGVGbGFncy5BcnJheVRleHR1cmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgc3ByaXRlLnRleHR1cmUudGV4dHVyZSlcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMClcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgc3ByaXRlLnRleHR1cmUudGV4dHVyZSlcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgKytudW1TcHJpdGVzXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChudW1TcHJpdGVzID4gMCkge1xyXG4gICAgICAgICAgICAgICAgZ2wuZHJhd0VsZW1lbnRzKGdsLlRSSUFOR0xFUywgbnVtU3ByaXRlcyAqIDYsIGdsLlVOU0lHTkVEX1NIT1JULCBvZmZzZXQgKiA2ICogMilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZm9yIChjb25zdCBiYXRjaCBvZiB0aGlzLmJhdGNoZXMpIHtcclxuICAgICAgICAvLyAgICAgY29uc3QgdXNlQXJyYXlUZXh0dXJlID0gYmF0Y2guZmxhZ3MgJiBTcHJpdGVGbGFncy5BcnJheVRleHR1cmUgPyB0cnVlIDogZmFsc2VcclxuICAgICAgICAvLyAgICAgY29uc3QgdGV4dHVyZSA9IGJhdGNoLnRleHR1cmU/LnRleHR1cmUgPz8gbnVsbFxyXG5cclxuICAgICAgICAvLyAgICAgaWYgKHVzZUFycmF5VGV4dHVyZSkge1xyXG4gICAgICAgIC8vICAgICAgICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMSlcclxuICAgICAgICAvLyAgICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkRfQVJSQVksIHRleHR1cmUpXHJcblxyXG4gICAgICAgIC8vICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vICAgICAgICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMClcclxuICAgICAgICAvLyAgICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUpXHJcbiAgICAgICAgLy8gICAgIH1cclxuXHJcbiAgICAgICAgLy8gICAgIGdsLnVuaWZvcm0xaSh0aGlzLnNwcml0ZUxpdFVuaWZvcm1Mb2NhdGlvbiwgYmF0Y2guZmxhZ3MgJiBTcHJpdGVGbGFncy5MaXQgPyAxIDogMClcclxuICAgICAgICAvLyAgICAgZ2wudW5pZm9ybTFpKHRoaXMuc3ByaXRlVXNlQXJyYXlUZXh0dXJlVW5pZm9ybUxvY2F0aW9uLCB1c2VBcnJheVRleHR1cmUgPyAxIDogMClcclxuICAgICAgICAvLyAgICAgZ2wuZHJhd0VsZW1lbnRzKGdsLlRSSUFOR0xFUywgYmF0Y2gubnVtU3ByaXRlcyAqIDYsIGdsLlVOU0lHTkVEX1NIT1JULCBiYXRjaC5vZmZzZXQgKiA2ICogMilcclxuICAgICAgICAvLyB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjcmVhdGVUZXh0dXJlKCk6IFRleHR1cmUge1xyXG4gICAgICAgICsrdGhpcy50ZXh0dXJlSWRcclxuICAgICAgICBjb25zdCB0ZXh0dXJlOiBUZXh0dXJlID0ge1xyXG4gICAgICAgICAgICB0ZXh0dXJlOiBnbHUuY3JlYXRlVGV4dHVyZSh0aGlzLmdsKSxcclxuICAgICAgICAgICAgaWQ6IHRoaXMudGV4dHVyZUlkXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGV4dHVyZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHVzaFZlcnRleChvZmZzZXQ6IG51bWJlciwgeDogbnVtYmVyLCB5OiBudW1iZXIsIHU6IG51bWJlciwgdjogbnVtYmVyLCB3OiBudW1iZXIsIHI6IG51bWJlciwgZzogbnVtYmVyLCBiOiBudW1iZXIsIGE6IG51bWJlcikge1xyXG4gICAgICAgIC8vIHBvc2l0aW9uXHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXRdID0geFxyXG4gICAgICAgIHRoaXMudmVydGljZXNbKytvZmZzZXRdID0geVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIHV2XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1srK29mZnNldF0gPSB1XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1srK29mZnNldF0gPSB2XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1srK29mZnNldF0gPSB3XHJcblxyXG4gICAgICAgIC8vIGNvbG9yXHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1srK29mZnNldF0gPSByXHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1srK29mZnNldF0gPSBnXHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1srK29mZnNldF0gPSBiXHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1srK29mZnNldF0gPSBhXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjaGVja1NpemUoKSB7XHJcbiAgICAgICAgY29uc3QgY2FudmFzID0gdGhpcy5jYW52YXNcclxuICAgICAgICBjb25zdCBnbCA9IHRoaXMuZ2xcclxuXHJcbiAgICAgICAgaWYgKGNhbnZhcy53aWR0aCAhPT0gY2FudmFzLmNsaWVudFdpZHRoICYmIGNhbnZhcy5oZWlnaHQgIT09IGNhbnZhcy5jbGllbnRIZWlnaHQpIHtcclxuICAgICAgICAgICAgY2FudmFzLndpZHRoID0gY2FudmFzLmNsaWVudFdpZHRoXHJcbiAgICAgICAgICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMuY2xpZW50SGVpZ2h0XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoY2FudmFzLndpZHRoID09PSB0aGlzLnZpZXdwb3J0V2lkdGggJiYgY2FudmFzLmhlaWdodCA9PT0gdGhpcy52aWV3cG9ydEhlaWdodCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudmlld3BvcnRXaWR0aCA9IGNhbnZhcy53aWR0aFxyXG4gICAgICAgIHRoaXMudmlld3BvcnRIZWlnaHQgPSBjYW52YXMuaGVpZ2h0ICAgICAgICBcclxuXHJcbiAgICAgICAgLy8gc2V0dXAgc2hhZG93bWFwcGluZyB0ZXh0dXJlIGFuZCBzaGFkb3cgZnJhbWVidWZmZXJcclxuICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnNoYWRvd01hcFRleHR1cmUudGV4dHVyZSlcclxuICAgICAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcclxuICAgICAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcclxuICAgICAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTElORUFSKTtcclxuICAgICAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFYX0xFVkVMLCAwKTtcclxuICAgICAgICBnbC50ZXhJbWFnZTJEKGdsLlRFWFRVUkVfMkQsIDAsIGdsLlJHQkEsIHRoaXMudmlld3BvcnRXaWR0aCwgdGhpcy52aWV3cG9ydEhlaWdodCwgMCwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgbnVsbClcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlU3ByaXRlVmFvKFxyXG4gICAgZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQsXHJcbiAgICBwcm9ncmFtOiBXZWJHTFByb2dyYW0sXHJcbiAgICB2ZXJ0ZXhCdWZmZXI6IFdlYkdMQnVmZmVyLFxyXG4gICAgaW5kZXhCdWZmZXI6IFdlYkdMQnVmZmVyKTogV2ViR0xWZXJ0ZXhBcnJheU9iamVjdCB7XHJcbiAgICBjb25zdCB2YW8gPSBnbHUuY3JlYXRlVmVydGV4QXJyYXkoZ2wpXHJcbiAgICBnbC5iaW5kVmVydGV4QXJyYXkodmFvKVxyXG5cclxuICAgIGNvbnN0IHBvc2l0aW9uQXR0cmliSWR4ID0gZ2x1LmdldEF0dHJpYkxvY2F0aW9uKGdsLCBwcm9ncmFtLCBcImluX3Bvc2l0aW9uXCIpXHJcbiAgICBjb25zdCB1dndBdHRyaWJJZHggPSBnbHUuZ2V0QXR0cmliTG9jYXRpb24oZ2wsIHByb2dyYW0sIFwiaW5fdXZ3XCIpXHJcbiAgICBjb25zdCBjb2xvckF0dHJpYklkeCA9IGdsdS5nZXRBdHRyaWJMb2NhdGlvbihnbCwgcHJvZ3JhbSwgXCJpbl9jb2xvclwiKVxyXG4gICAgZ2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHZlcnRleEJ1ZmZlcilcclxuICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHBvc2l0aW9uQXR0cmliSWR4KVxyXG4gICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkodXZ3QXR0cmliSWR4KVxyXG4gICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkoY29sb3JBdHRyaWJJZHgpXHJcbiAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHBvc2l0aW9uQXR0cmliSWR4LCAzLCBnbC5GTE9BVCwgZmFsc2UsIHNwcml0ZVZlcnRleFN0cmlkZSwgMClcclxuICAgIGdsLnZlcnRleEF0dHJpYlBvaW50ZXIodXZ3QXR0cmliSWR4LCAzLCBnbC5GTE9BVCwgZmFsc2UsIHNwcml0ZVZlcnRleFN0cmlkZSwgOClcclxuICAgIGdsLnZlcnRleEF0dHJpYlBvaW50ZXIoY29sb3JBdHRyaWJJZHgsIDQsIGdsLkZMT0FULCBmYWxzZSwgc3ByaXRlVmVydGV4U3RyaWRlLCAyMClcclxuICAgIGdsLmJpbmRCdWZmZXIoZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIGluZGV4QnVmZmVyKVxyXG4gICAgcmV0dXJuIHZhb1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVTaGFkb3dWYW8oXHJcbiAgICBnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCxcclxuICAgIHByb2dyYW06IFdlYkdMUHJvZ3JhbSxcclxuICAgIHZlcnRleEJ1ZmZlcjogV2ViR0xCdWZmZXIsXHJcbiAgICBpbmRleEJ1ZmZlcjogV2ViR0xCdWZmZXIpOiBXZWJHTFZlcnRleEFycmF5T2JqZWN0IHtcclxuICAgIGNvbnN0IHZhbyA9IGdsdS5jcmVhdGVWZXJ0ZXhBcnJheShnbClcclxuICAgIGdsLmJpbmRWZXJ0ZXhBcnJheSh2YW8pXHJcblxyXG4gICAgY29uc3QgcG9zaXRpb25BdHRyaWJJZHggPSBnbHUuZ2V0QXR0cmliTG9jYXRpb24oZ2wsIHByb2dyYW0sIFwiaW5fcG9zaXRpb25cIilcclxuICAgIGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB2ZXJ0ZXhCdWZmZXIpXHJcbiAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShwb3NpdGlvbkF0dHJpYklkeClcclxuICAgIGdsLnZlcnRleEF0dHJpYlBvaW50ZXIocG9zaXRpb25BdHRyaWJJZHgsIDIsIGdsLkZMT0FULCBmYWxzZSwgc3ByaXRlVmVydGV4U3RyaWRlLCAwKVxyXG4gICAgZ2wuYmluZEJ1ZmZlcihnbC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgaW5kZXhCdWZmZXIpXHJcbiAgICByZXR1cm4gdmFvXHJcbn0iXX0=