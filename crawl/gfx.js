/**
 * web gl sprite rendering utilities
 */
import * as glu from "./glu.js";
import * as geo from "../shared/geo2d.js";
import * as util from "../shared/util.js";
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
    frag_position = in_position;
    vec2 position = vec2(in_position.x / viewport_size.x * 2.f - 1.f, -in_position.y / viewport_size.y * 2.f + 1.f);
    gl_Position = vec4(position, 0, 1);
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
const shadowWidth = 1024;
export var SpriteFlags;
(function (SpriteFlags) {
    SpriteFlags[SpriteFlags["None"] = 0] = "None";
    SpriteFlags[SpriteFlags["Lit"] = 1] = "Lit";
    SpriteFlags[SpriteFlags["ArrayTexture"] = 2] = "ArrayTexture";
    SpriteFlags[SpriteFlags["CastsShadows"] = 4] = "CastsShadows";
    SpriteFlags[SpriteFlags["Flip"] = 8] = "Flip";
})(SpriteFlags || (SpriteFlags = {}));
function get_sprite_render_flags(flags) {
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
const elemsPerSpriteVertex = 9;
const spriteVertexStride = elemsPerSpriteVertex * 4;
export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.sprites = [];
        this.batches = [];
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
        // draw shadow sprite
        const sprite = new Sprite({
            position: new geo.Point(0, 0),
            width: 1024,
            height: 1024,
            color: [1, 1, 1, 1],
            texture: this.shadowMapTexture,
            flags: SpriteFlags.Flip
        });
        this.drawSprite(sprite);
        this.batchSprites();
        this.drawShadows();
        this.drawSprites(lightRadius);
        // clear sprites and batches
        this.sprites = [];
        this.batches = [];
    }
    batchSprites() {
        var _a, _b, _c, _d;
        // assign default texture to sprites without a texture
        for (const sprite of this.sprites) {
            if (!sprite.texture) {
                sprite.texture = this.white1x1Texture;
            }
        }
        // sort sprites
        const sprites = this.sprites;
        sprites.sort((s1, s2) => {
            var _a, _b, _c, _d;
            const id1 = (_b = (_a = s1.texture) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : 0;
            const id2 = (_d = (_c = s2.texture) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : 0;
            if (id1 < id2) {
                return -1;
            }
            if (id1 > id2) {
                return 1;
            }
            const renderFlags1 = get_sprite_render_flags(s1.flags);
            const renderFlags2 = get_sprite_render_flags(s2.flags);
            return util.compare(renderFlags1, renderFlags2);
        });
        let batch = {
            flags: SpriteFlags.None,
            texture: null,
            offset: 0,
            numSprites: 0
        };
        for (let i = 0; i < sprites.length; ++i) {
            const sprite = sprites[i];
            const renderFlags = get_sprite_render_flags(sprite.flags);
            if (((_b = (_a = sprite.texture) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : 0) !== ((_d = (_c = batch.texture) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : 0) ||
                renderFlags !== batch.flags) {
                // append current batch if it contains any sprites
                if (batch.numSprites > 0) {
                    this.batches.push(batch);
                }
                // begin new batch
                const offset = batch.offset + batch.numSprites;
                batch = {
                    flags: renderFlags,
                    texture: sprite.texture,
                    offset: offset,
                    numSprites: 0
                };
            }
            batch.numSprites++;
        }
        // append final batch if it contains any sprites
        if (batch.numSprites > 0) {
            this.batches.push(batch);
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
    drawShadows() {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowMapFramebuffer);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindVertexArray(this.shadowVao);
        gl.useProgram(this.shadowProgram);
        gl.uniform2f(this.shadowViewportSizeUniformLocation, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindVertexArray(this.shadowVao);
        // draw each shadow casting batch
        for (const batch of this.batches) {
            if (!(batch.flags & SpriteFlags.CastsShadows)) {
                continue;
            }
            gl.drawElements(gl.TRIANGLES, batch.numSprites * 6, gl.UNSIGNED_SHORT, batch.offset * 6 * 2);
        }
    }
    drawSprites(lightRadius) {
        var _a, _b;
        // draw the batched sprites
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
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
        for (const batch of this.batches) {
            const useArrayTexture = batch.flags & SpriteFlags.ArrayTexture ? true : false;
            const texture = (_b = (_a = batch.texture) === null || _a === void 0 ? void 0 : _a.texture) !== null && _b !== void 0 ? _b : null;
            if (useArrayTexture) {
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
            }
            else {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
            }
            gl.uniform1i(this.spriteLitUniformLocation, batch.flags & SpriteFlags.Lit ? 1 : 0);
            gl.uniform1i(this.spriteUseArrayTextureUniformLocation, useArrayTexture ? 1 : 0);
            gl.drawElements(gl.TRIANGLES, batch.numSprites * 6, gl.UNSIGNED_SHORT, batch.offset * 6 * 2);
        }
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
        this.vertices[offset + 1] = y;
        // uv
        this.vertices[offset + 2] = u;
        this.vertices[offset + 3] = v;
        this.vertices[offset + 4] = w;
        // color
        this.vertices[offset + 5] = r;
        this.vertices[offset + 6] = g;
        this.vertices[offset + 7] = b;
        this.vertices[offset + 8] = a;
    }
    checkSize() {
        const canvas = this.canvas;
        if (canvas.width !== canvas.clientWidth && canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }
        if (canvas.width === this.viewportWidth && canvas.height === this.viewportHeight) {
            return;
        }
        this.viewportWidth = canvas.width;
        this.viewportHeight = canvas.height;
        // setup shadowmapping texture and framebuffer
        const gl = this.gl;
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
    gl.vertexAttribPointer(positionAttribIdx, 2, gl.FLOAT, false, spriteVertexStride, 0);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2Z4LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2Z4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0gsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBSXpDLE1BQU0sZUFBZSxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBbUJ0QixDQUFBO0FBRUYsTUFBTSxpQkFBaUIsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQXFDeEIsQ0FBQTtBQUVGLE1BQU0sZUFBZSxHQUFHOzs7Ozs7Ozs7Ozs7O0VBYXRCLENBQUE7QUFFRixNQUFNLGlCQUFpQixHQUFHOzs7Ozs7Ozs7Ozs7Ozs7O0NBZ0J6QixDQUFBO0FBQ0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFBO0FBRXhCLE1BQU0sQ0FBTixJQUFZLFdBTVg7QUFORCxXQUFZLFdBQVc7SUFDbkIsNkNBQVEsQ0FBQTtJQUNSLDJDQUFZLENBQUE7SUFDWiw2REFBcUIsQ0FBQTtJQUNyQiw2REFBcUIsQ0FBQTtJQUNyQiw2Q0FBYSxDQUFBO0FBQ2pCLENBQUMsRUFOVyxXQUFXLEtBQVgsV0FBVyxRQU10QjtBQUVELFNBQVMsdUJBQXVCLENBQUMsS0FBa0I7SUFDL0MsT0FBTyxLQUFLLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxHQUFHLFdBQVcsQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFBO0FBQzFGLENBQUM7QUFpQkQsTUFBTSxPQUFPLE1BQU07SUFTZixZQUFZLFVBQXlCLEVBQUU7UUFSaEMsYUFBUSxHQUFjLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekMsVUFBSyxHQUFXLENBQUMsQ0FBQTtRQUNqQixXQUFNLEdBQVcsQ0FB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Q0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDcEssVUFBVSxJQUFJLG9CQUFvQixDQUFBO1lBRWxDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDcEwsVUFBVSxJQUFJLG9CQUFvQixDQUFBO1lBRWxDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNuTSxVQUFVLElBQUksb0JBQW9C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QUFFLENBQUMsQ0FBQTtJQUNsRixFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUNuRCxPQUFPLEdBQUcsQ0FBQTtBQUNkLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FDcEIsRUFBMEIsRUFDMUIsT0FBcUIsRUFDckIsWUFBeUIsRUFDekIsV0FBd0I7SUFDeEIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ3JDLEVBQUUsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUE7SUFFdkIsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUMzRSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDNUMsRUFBRSxDQUFDLHVCQUF1QixDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDN0MsRUFBRSxDQUFDLG1CQUFtQixDQUFDLGlCQUFpQixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNwRixFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUNuRCxPQUFPLEdBQUcsQ0FBQTtBQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogd2ViIGdsIHNwcml0ZSByZW5kZXJpbmcgdXRpbGl0aWVzXHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBnbHUgZnJvbSBcIi4vZ2x1LmpzXCJcclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvMmQuanNcIlxyXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gXCIuLi9zaGFyZWQvdXRpbC5qc1wiXHJcblxyXG5leHBvcnQgdHlwZSBDb2xvciA9IFtudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdXHJcblxyXG5jb25zdCBzcHJpdGVWZXJ0ZXhTcmMgPSBgI3ZlcnNpb24gMzAwIGVzXHJcbnByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1xyXG5cclxudW5pZm9ybSB2ZWMyIHZpZXdwb3J0X3NpemU7XHJcblxyXG5pbiB2ZWMyIGluX3Bvc2l0aW9uO1xyXG5pbiB2ZWMzIGluX3V2dztcclxuaW4gdmVjNCBpbl9jb2xvcjtcclxuXHJcbm91dCB2ZWMyIGZyYWdfcG9zaXRpb247XHJcbm91dCB2ZWM0IGZyYWdfY29sb3I7XHJcbm91dCB2ZWMzIGZyYWdfdXZ3O1xyXG5cclxudm9pZCBtYWluKCkge1xyXG4gICAgZnJhZ191dncgPSBpbl91dnc7XHJcbiAgICBmcmFnX2NvbG9yID0gaW5fY29sb3I7XHJcbiAgICBmcmFnX3Bvc2l0aW9uID0gaW5fcG9zaXRpb247XHJcbiAgICB2ZWMyIHBvc2l0aW9uID0gdmVjMihpbl9wb3NpdGlvbi54IC8gdmlld3BvcnRfc2l6ZS54ICogMi5mIC0gMS5mLCAtaW5fcG9zaXRpb24ueSAvIHZpZXdwb3J0X3NpemUueSAqIDIuZiArIDEuZik7XHJcbiAgICBnbF9Qb3NpdGlvbiA9IHZlYzQocG9zaXRpb24sIDAsIDEpO1xyXG59YFxyXG5cclxuY29uc3Qgc3ByaXRlRnJhZ21lbnRTcmMgPSBgI3ZlcnNpb24gMzAwIGVzXHJcbnByZWNpc2lvbiBoaWdocCBmbG9hdDtcclxucHJlY2lzaW9uIGhpZ2hwIHNhbXBsZXIyRDtcclxucHJlY2lzaW9uIGhpZ2hwIHNhbXBsZXIyREFycmF5O1xyXG5cclxudW5pZm9ybSBib29sIGxpdDtcclxudW5pZm9ybSBib29sIHVzZV9hcnJheV90ZXh0dXJlO1xyXG51bmlmb3JtIG1lZGl1bXAgdmVjMiB2aWV3cG9ydF9zaXplO1xyXG51bmlmb3JtIGZsb2F0IGxpZ2h0X3JhZGl1cztcclxudW5pZm9ybSBzYW1wbGVyMkQgc2FtcGxlcjtcclxudW5pZm9ybSBzYW1wbGVyMkRBcnJheSBhcnJheV9zYW1wbGVyO1xyXG5cclxuaW4gdmVjMiBmcmFnX3Bvc2l0aW9uO1xyXG5pbiB2ZWM0IGZyYWdfY29sb3I7XHJcbmluIHZlYzMgZnJhZ191dnc7XHJcblxyXG5vdXQgdmVjNCBvdXRfY29sb3I7XHJcblxyXG52b2lkIG1haW4oKSB7XHJcbiAgICBmbG9hdCBsID0gMS5mO1xyXG4gICAgaWYgKGxpdCkge1xyXG4gICAgICAgIC8vIGNhbGN1bGF0ZSBkaXN0YW5jZSBmcm9tIGxpZ2h0XHJcbiAgICAgICAgZmxvYXQgZCA9IGxlbmd0aChmcmFnX3Bvc2l0aW9uIC0gdmlld3BvcnRfc2l6ZSAvIDIuZik7XHJcblxyXG4gICAgICAgIC8vIGNhbGN1bGF0ZSBsaWdodCBhbW91bnQgKGZ1bGwgZnJvbSAwIHRvIGxpZ2h0IHJhZGl1cywgbGVycCBmcm9tIGxpZ2h0X3JhZGl1cyB0byAyICogbGlnaHRfcmFkaXVzKVxyXG4gICAgICAgIGwgPSBtaXgoMS5mLCAwLmYsIGQgLyBsaWdodF9yYWRpdXMpO1xyXG4gICAgfVxyXG5cclxuICAgIG91dF9jb2xvciA9IGZyYWdfY29sb3I7XHJcblxyXG4gICAgaWYgKHVzZV9hcnJheV90ZXh0dXJlKSB7XHJcbiAgICAgICAgb3V0X2NvbG9yICo9IHRleHR1cmUoYXJyYXlfc2FtcGxlciwgZnJhZ191dncpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBvdXRfY29sb3IgKj0gdGV4dHVyZShzYW1wbGVyLCBmcmFnX3V2dy54eSk7XHJcbiAgICB9XHJcblxyXG4gICAgb3V0X2NvbG9yICo9IHZlYzQobCwgbCwgbCwgMSk7XHJcbn1gXHJcblxyXG5jb25zdCBzaGFkb3dWZXJ0ZXhTcmMgPSBgI3ZlcnNpb24gMzAwIGVzXHJcbnByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1xyXG5cclxudW5pZm9ybSB2ZWMyIHZpZXdwb3J0X3NpemU7XHJcblxyXG5pbiB2ZWMyIGluX3Bvc2l0aW9uO1xyXG5cclxub3V0IHZlYzIgZnJhZ19wb3NpdGlvbjtcclxuXHJcbnZvaWQgbWFpbigpIHtcclxuICAgIGZyYWdfcG9zaXRpb24gPSBpbl9wb3NpdGlvbjtcclxuICAgIHZlYzIgcG9zaXRpb24gPSB2ZWMyKGluX3Bvc2l0aW9uLnggLyB2aWV3cG9ydF9zaXplLnggKiAyLmYgLSAxLmYsIC1pbl9wb3NpdGlvbi55IC8gdmlld3BvcnRfc2l6ZS55ICogMi5mICsgMS5mKTtcclxuICAgIGdsX1Bvc2l0aW9uID0gdmVjNChwb3NpdGlvbiwgMCwgMSk7XHJcbn1gXHJcblxyXG5jb25zdCBzaGFkb3dGcmFnbWVudFNyYyA9IGAjdmVyc2lvbiAzMDAgZXNcclxucHJlY2lzaW9uIGhpZ2hwIGZsb2F0O1xyXG5wcmVjaXNpb24gaGlnaHAgc2FtcGxlcjJEQXJyYXk7XHJcblxyXG51bmlmb3JtIG1lZGl1bXAgdmVjMiB2aWV3cG9ydF9zaXplO1xyXG5cclxuaW4gdmVjMiBmcmFnX3Bvc2l0aW9uO1xyXG5cclxub3V0IHZlYzQgb3V0X2NvbG9yO1xyXG5cclxudm9pZCBtYWluKCkge1xyXG4gICAgLy8gY2FsY3VsYXRlIGRpc3RhbmNlIGZyb20gbGlnaHRcclxuICAgIGZsb2F0IGQgPSBsZW5ndGgoZnJhZ19wb3NpdGlvbiAtIHZpZXdwb3J0X3NpemUgLyAyLmYpIC8gKDE2LmYgKiAyNC5mKTtcclxuICAgIG91dF9jb2xvciA9IHZlYzQoZCwgZCwgZCwgMSk7XHJcbiAgICBvdXRfY29sb3IgPSB2ZWM0KDEsMCwwLDEpO1xyXG59XHJcbmBcclxuY29uc3Qgc2hhZG93V2lkdGggPSAxMDI0XHJcblxyXG5leHBvcnQgZW51bSBTcHJpdGVGbGFncyB7XHJcbiAgICBOb25lID0gMCxcclxuICAgIExpdCA9IDEgPDwgMCxcclxuICAgIEFycmF5VGV4dHVyZSA9IDEgPDwgMSxcclxuICAgIENhc3RzU2hhZG93cyA9IDEgPDwgMixcclxuICAgIEZsaXAgPSAxIDw8IDNcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0X3Nwcml0ZV9yZW5kZXJfZmxhZ3MoZmxhZ3M6IFNwcml0ZUZsYWdzKTogU3ByaXRlRmxhZ3Mge1xyXG4gICAgcmV0dXJuIGZsYWdzICYgKFNwcml0ZUZsYWdzLkxpdCB8IFNwcml0ZUZsYWdzLkFycmF5VGV4dHVyZSB8IFNwcml0ZUZsYWdzLkNhc3RzU2hhZG93cylcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUZXh0dXJlIHtcclxuICAgIGlkOiBudW1iZXJcclxuICAgIHRleHR1cmU6IFdlYkdMVGV4dHVyZVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNwcml0ZU9wdGlvbnMge1xyXG4gICAgcG9zaXRpb24/OiBnZW8uUG9pbnRcclxuICAgIHdpZHRoPzogbnVtYmVyXHJcbiAgICBoZWlnaHQ/OiBudW1iZXJcclxuICAgIGxheWVyPzogbnVtYmVyXHJcbiAgICBjb2xvcj86IENvbG9yXHJcbiAgICB0ZXh0dXJlPzogVGV4dHVyZSB8IG51bGxcclxuICAgIGZsYWdzPzogU3ByaXRlRmxhZ3NcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNwcml0ZSB7XHJcbiAgICBwdWJsaWMgcG9zaXRpb246IGdlby5Qb2ludCA9IG5ldyBnZW8uUG9pbnQoMCwgMClcclxuICAgIHB1YmxpYyB3aWR0aDogbnVtYmVyID0gMFxyXG4gICAgcHVibGljIGhlaWdodDogbnVtYmVyID0gMFxyXG4gICAgcHVibGljIGxheWVyOiBudW1iZXIgPSAwXHJcbiAgICBwdWJsaWMgY29sb3I6IENvbG9yID0gWzEsIDEsIDEsIDFdXHJcbiAgICBwdWJsaWMgdGV4dHVyZTogVGV4dHVyZSB8IG51bGwgPSBudWxsXHJcbiAgICBwdWJsaWMgZmxhZ3M6IFNwcml0ZUZsYWdzID0gU3ByaXRlRmxhZ3MuTm9uZVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFNwcml0ZU9wdGlvbnMgPSB7fSkge1xyXG4gICAgICAgIGlmIChvcHRpb25zLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy53aWR0aCkge1xyXG4gICAgICAgICAgICB0aGlzLndpZHRoID0gb3B0aW9ucy53aWR0aFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmxheWVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGF5ZXIgPSBvcHRpb25zLmxheWVyXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5jb2xvcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvbG9yID0gb3B0aW9ucy5jb2xvclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMudGV4dHVyZSkge1xyXG4gICAgICAgICAgICB0aGlzLnRleHR1cmUgPSBvcHRpb25zLnRleHR1cmVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmZsYWdzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmxhZ3MgPSBvcHRpb25zLmZsYWdzXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jb25zdCBlbGVtc1BlclNwcml0ZVZlcnRleCA9IDlcclxuY29uc3Qgc3ByaXRlVmVydGV4U3RyaWRlID0gZWxlbXNQZXJTcHJpdGVWZXJ0ZXggKiA0XHJcblxyXG5pbnRlcmZhY2UgU3ByaXRlQmF0Y2gge1xyXG4gICAgdGV4dHVyZTogVGV4dHVyZSB8IG51bGxcclxuICAgIGZsYWdzOiBTcHJpdGVGbGFnc1xyXG4gICAgb2Zmc2V0OiBudW1iZXJcclxuICAgIG51bVNwcml0ZXM6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUmVuZGVyZXIge1xyXG4gICAgLy8gdmVydGV4IGxheW91dDpcclxuICAgIC8vIHh5IHV2dyByZ2JhIChhbGwgZmxvYXQzMilcclxuICAgIHB1YmxpYyByZWFkb25seSBnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzaGFkb3dQcm9ncmFtOiBXZWJHTFByb2dyYW1cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlUHJvZ3JhbTogV2ViR0xQcm9ncmFtXHJcbiAgICBwcml2YXRlIHNoYWRvd01hcFRleHR1cmU6IFRleHR1cmVcclxuICAgIHByaXZhdGUgc2hhZG93TWFwRnJhbWVidWZmZXI6IFdlYkdMRnJhbWVidWZmZXJcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlTGl0VW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvblxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzcHJpdGVVc2VBcnJheVRleHR1cmVVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNwcml0ZVNhbXBsZXJVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNwcml0ZUFycmF5U2FtcGxlclVuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb25cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlVmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvblxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzcHJpdGVMaWdodFJhZGl1c1VuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb25cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2hhZG93Vmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvblxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzYW1wbGVyOiBXZWJHTFNhbXBsZXJcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdmVydGV4QnVmZmVyOiBXZWJHTEJ1ZmZlclxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbmRleEJ1ZmZlcjogV2ViR0xCdWZmZXJcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlVmFvOiBXZWJHTFZlcnRleEFycmF5T2JqZWN0XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNoYWRvd1ZhbzogV2ViR0xWZXJ0ZXhBcnJheU9iamVjdFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB3aGl0ZTF4MVRleHR1cmU6IFRleHR1cmVcclxuICAgIHByaXZhdGUgc3ByaXRlczogU3ByaXRlW10gPSBbXVxyXG4gICAgcHJpdmF0ZSBiYXRjaGVzOiBTcHJpdGVCYXRjaFtdID0gW11cclxuICAgIHByaXZhdGUgdmVydGljZXM6IEZsb2F0MzJBcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkoKVxyXG4gICAgcHJpdmF0ZSBpbmRpY2VzOiBVaW50MTZBcnJheSA9IG5ldyBVaW50MTZBcnJheSgpXHJcbiAgICBwcml2YXRlIHZpZXdwb3J0V2lkdGg6IG51bWJlciA9IDBcclxuICAgIHByaXZhdGUgdmlld3BvcnRIZWlnaHQ6IG51bWJlciA9IDBcclxuICAgIHByaXZhdGUgdGV4dHVyZUlkOiBudW1iZXIgPSAwXHJcblxyXG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZ2wgPSBnbHUuY3JlYXRlQ29udGV4dChjYW52YXMpXHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcblxyXG4gICAgICAgIHRoaXMuc2hhZG93UHJvZ3JhbSA9IGdsdS5jb21waWxlUHJvZ3JhbShnbCwgc2hhZG93VmVydGV4U3JjLCBzaGFkb3dGcmFnbWVudFNyYylcclxuICAgICAgICB0aGlzLnNwcml0ZVByb2dyYW0gPSBnbHUuY29tcGlsZVByb2dyYW0oZ2wsIHNwcml0ZVZlcnRleFNyYywgc3ByaXRlRnJhZ21lbnRTcmMpXHJcbiAgICAgICAgdGhpcy5zcHJpdGVMaXRVbmlmb3JtTG9jYXRpb24gPSBnbHUuZ2V0VW5pZm9ybUxvY2F0aW9uKGdsLCB0aGlzLnNwcml0ZVByb2dyYW0sIFwibGl0XCIpXHJcbiAgICAgICAgdGhpcy5zcHJpdGVVc2VBcnJheVRleHR1cmVVbmlmb3JtTG9jYXRpb24gPSBnbHUuZ2V0VW5pZm9ybUxvY2F0aW9uKGdsLCB0aGlzLnNwcml0ZVByb2dyYW0sIFwidXNlX2FycmF5X3RleHR1cmVcIilcclxuICAgICAgICB0aGlzLnNwcml0ZVNhbXBsZXJVbmlmb3JtTG9jYXRpb24gPSBnbHUuZ2V0VW5pZm9ybUxvY2F0aW9uKGdsLCB0aGlzLnNwcml0ZVByb2dyYW0sIFwic2FtcGxlclwiKVxyXG4gICAgICAgIHRoaXMuc3ByaXRlQXJyYXlTYW1wbGVyVW5pZm9ybUxvY2F0aW9uID0gZ2x1LmdldFVuaWZvcm1Mb2NhdGlvbihnbCwgdGhpcy5zcHJpdGVQcm9ncmFtLCBcImFycmF5X3NhbXBsZXJcIilcclxuICAgICAgICB0aGlzLnNwcml0ZVZpZXdwb3J0U2l6ZVVuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgXCJ2aWV3cG9ydF9zaXplXCIpXHJcbiAgICAgICAgdGhpcy5zcHJpdGVMaWdodFJhZGl1c1VuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgXCJsaWdodF9yYWRpdXNcIilcclxuICAgICAgICB0aGlzLnNoYWRvd1ZpZXdwb3J0U2l6ZVVuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc2hhZG93UHJvZ3JhbSwgXCJ2aWV3cG9ydF9zaXplXCIpXHJcbiAgICAgICAgdGhpcy52ZXJ0ZXhCdWZmZXIgPSBnbHUuY3JlYXRlQnVmZmVyKGdsKVxyXG4gICAgICAgIHRoaXMuaW5kZXhCdWZmZXIgPSBnbHUuY3JlYXRlQnVmZmVyKGdsKVxyXG5cclxuICAgICAgICAvLyBkZWZhdWx0IDF4MSB3aGl0ZSB0ZXh0dXJlXHJcbiAgICAgICAgdGhpcy53aGl0ZTF4MVRleHR1cmUgPSB0aGlzLmNyZWF0ZVRleHR1cmUoKVxyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMud2hpdGUxeDFUZXh0dXJlLnRleHR1cmUpXHJcbiAgICAgICAgZ2wudGV4SW1hZ2UyRChnbC5URVhUVVJFXzJELCAwLCBnbC5SR0JBOCwgMSwgMSwgMCwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgbmV3IFVpbnQ4Q2xhbXBlZEFycmF5KFsyNTUsIDI1NSwgMjU1LCAyNTVdKSlcclxuXHJcbiAgICAgICAgLy8gc2V0dXAgc2FtcGxlclxyXG4gICAgICAgIHRoaXMuc2FtcGxlciA9IGdsdS5jcmVhdGVTYW1wbGVyKGdsKVxyXG4gICAgICAgIGdsLnNhbXBsZXJQYXJhbWV0ZXJpKHRoaXMuc2FtcGxlciwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5MSU5FQVIpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLkxJTkVBUl9NSVBNQVBfTElORUFSKVxyXG4gICAgICAgIGdsLnNhbXBsZXJQYXJhbWV0ZXJpKHRoaXMuc2FtcGxlciwgZ2wuVEVYVFVSRV9XUkFQX1IsIGdsLkNMQU1QX1RPX0VER0UpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSlcclxuICAgICAgICBnbC5zYW1wbGVyUGFyYW1ldGVyaSh0aGlzLnNhbXBsZXIsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKVxyXG5cclxuICAgICAgICB0aGlzLnNwcml0ZVZhbyA9IGNyZWF0ZVNwcml0ZVZhbyh0aGlzLmdsLCB0aGlzLnNwcml0ZVByb2dyYW0sIHRoaXMudmVydGV4QnVmZmVyLCB0aGlzLmluZGV4QnVmZmVyKVxyXG4gICAgICAgIHRoaXMuc2hhZG93VmFvID0gY3JlYXRlU2hhZG93VmFvKHRoaXMuZ2wsIHRoaXMuc2hhZG93UHJvZ3JhbSwgdGhpcy52ZXJ0ZXhCdWZmZXIsIHRoaXMuaW5kZXhCdWZmZXIpXHJcblxyXG4gICAgICAgIHRoaXMuc2hhZG93TWFwVGV4dHVyZSA9IHRoaXMuY3JlYXRlVGV4dHVyZSgpXHJcbiAgICAgICAgdGhpcy5zaGFkb3dNYXBGcmFtZWJ1ZmZlciA9IGdsdS5jcmVhdGVGcmFtZWJ1ZmZlcihnbClcclxuICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnNoYWRvd01hcFRleHR1cmUudGV4dHVyZSlcclxuICAgICAgICBnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuc2hhZG93TWFwRnJhbWVidWZmZXIpXHJcbiAgICAgICAgZ2wuZnJhbWVidWZmZXJUZXh0dXJlMkQoZ2wuRlJBTUVCVUZGRVIsIGdsLkNPTE9SX0FUVEFDSE1FTlQwLCBnbC5URVhUVVJFXzJELCB0aGlzLnNoYWRvd01hcFRleHR1cmUudGV4dHVyZSwgMClcclxuICAgIH1cclxuXHJcbiAgICBiYWtlVGV4dHVyZUFycmF5KHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBpbWFnZXM6IFRleEltYWdlU291cmNlW10pOiBUZXh0dXJlIHtcclxuICAgICAgICAvLyBlYWNoIGltYWdlIG11c3QgYmUgdGhlIHNhbWUgc2l6ZVxyXG4gICAgICAgIGNvbnN0IGdsID0gdGhpcy5nbFxyXG4gICAgICAgIGNvbnN0IHRleHR1cmUgPSB0aGlzLmNyZWF0ZVRleHR1cmUoKVxyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkRfQVJSQVksIHRleHR1cmUudGV4dHVyZSlcclxuICAgICAgICBnbC50ZXhJbWFnZTNEKGdsLlRFWFRVUkVfMkRfQVJSQVksIDAsIGdsLlJHQkEsIHdpZHRoLCBoZWlnaHQsIGltYWdlcy5sZW5ndGgsIDAsIGdsLlJHQkEsIGdsLlVOU0lHTkVEX0JZVEUsIG51bGwpXHJcbiAgICAgICAgaW1hZ2VzLmZvckVhY2goKGltZywgaSkgPT4ge1xyXG4gICAgICAgICAgICBnbC50ZXhTdWJJbWFnZTNEKGdsLlRFWFRVUkVfMkRfQVJSQVksIDAsIDAsIDAsIGksIHdpZHRoLCBoZWlnaHQsIDEsIGdsLlJHQkEsIGdsLlVOU0lHTkVEX0JZVEUsIGltZylcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBnbC5nZW5lcmF0ZU1pcG1hcChnbC5URVhUVVJFXzJEX0FSUkFZKVxyXG5cclxuICAgICAgICByZXR1cm4gdGV4dHVyZVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGxvYWRUZXh0dXJlKHVybDogc3RyaW5nKTogUHJvbWlzZTxUZXh0dXJlPiB7XHJcbiAgICAgICAgLy8gZWFjaCBpbWFnZSBtdXN0IGJlIHRoZSBzYW1lIHNpemVcclxuICAgICAgICBjb25zdCBnbCA9IHRoaXMuZ2xcclxuICAgICAgICBjb25zdCB0ZXh0dXJlID0gYXdhaXQgZ2x1LmxvYWRUZXh0dXJlKGdsLCB1cmwpXHJcbiAgICAgICAgZ2wuZ2VuZXJhdGVNaXBtYXAoZ2wuVEVYVFVSRV8yRF9BUlJBWSlcclxuICAgICAgICB0aGlzLnRleHR1cmVJZCsrXHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLnRleHR1cmVJZCxcclxuICAgICAgICAgICAgdGV4dHVyZTogdGV4dHVyZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBkcmF3U3ByaXRlKHNwcml0ZTogU3ByaXRlKSB7XHJcbiAgICAgICAgLy8gYWRkIHNwcml0ZSB0byBhcnJheVxyXG4gICAgICAgIHRoaXMuc3ByaXRlcy5wdXNoKHNwcml0ZSlcclxuICAgIH1cclxuXHJcbiAgICBmbHVzaChsaWdodFJhZGl1czogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5jaGVja1NpemUoKVxyXG5cclxuICAgICAgICAvLyBkcmF3IHNoYWRvdyBzcHJpdGVcclxuICAgICAgICBjb25zdCBzcHJpdGUgPSBuZXcgU3ByaXRlKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IG5ldyBnZW8uUG9pbnQoMCwgMCksXHJcbiAgICAgICAgICAgIHdpZHRoOiAxMDI0LFxyXG4gICAgICAgICAgICBoZWlnaHQ6IDEwMjQsXHJcbiAgICAgICAgICAgIGNvbG9yOiBbMSwgMSwgMSwgMV0sXHJcbiAgICAgICAgICAgIHRleHR1cmU6IHRoaXMuc2hhZG93TWFwVGV4dHVyZSxcclxuICAgICAgICAgICAgZmxhZ3M6IFNwcml0ZUZsYWdzLkZsaXBcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmRyYXdTcHJpdGUoc3ByaXRlKVxyXG4gICAgICAgIHRoaXMuYmF0Y2hTcHJpdGVzKClcclxuICAgICAgICB0aGlzLmRyYXdTaGFkb3dzKClcclxuICAgICAgICB0aGlzLmRyYXdTcHJpdGVzKGxpZ2h0UmFkaXVzKVxyXG5cclxuICAgICAgICAvLyBjbGVhciBzcHJpdGVzIGFuZCBiYXRjaGVzXHJcbiAgICAgICAgdGhpcy5zcHJpdGVzID0gW11cclxuICAgICAgICB0aGlzLmJhdGNoZXMgPSBbXVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYmF0Y2hTcHJpdGVzKCkge1xyXG4gICAgICAgIC8vIGFzc2lnbiBkZWZhdWx0IHRleHR1cmUgdG8gc3ByaXRlcyB3aXRob3V0IGEgdGV4dHVyZVxyXG4gICAgICAgIGZvciAoY29uc3Qgc3ByaXRlIG9mIHRoaXMuc3ByaXRlcykge1xyXG4gICAgICAgICAgICBpZiAoIXNwcml0ZS50ZXh0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICBzcHJpdGUudGV4dHVyZSA9IHRoaXMud2hpdGUxeDFUZXh0dXJlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHNvcnQgc3ByaXRlc1xyXG4gICAgICAgIGNvbnN0IHNwcml0ZXMgPSB0aGlzLnNwcml0ZXNcclxuICAgICAgICBzcHJpdGVzLnNvcnQoKHMxLCBzMikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBpZDEgPSBzMS50ZXh0dXJlPy5pZCA/PyAwXHJcbiAgICAgICAgICAgIGNvbnN0IGlkMiA9IHMyLnRleHR1cmU/LmlkID8/IDBcclxuICAgICAgICAgICAgaWYgKGlkMSA8IGlkMikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChpZDEgPiBpZDIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAxXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlbmRlckZsYWdzMSA9IGdldF9zcHJpdGVfcmVuZGVyX2ZsYWdzKHMxLmZsYWdzKVxyXG4gICAgICAgICAgICBjb25zdCByZW5kZXJGbGFnczIgPSBnZXRfc3ByaXRlX3JlbmRlcl9mbGFncyhzMi5mbGFncylcclxuICAgICAgICAgICAgcmV0dXJuIHV0aWwuY29tcGFyZShyZW5kZXJGbGFnczEsIHJlbmRlckZsYWdzMilcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBsZXQgYmF0Y2g6IFNwcml0ZUJhdGNoID0ge1xyXG4gICAgICAgICAgICBmbGFnczogU3ByaXRlRmxhZ3MuTm9uZSxcclxuICAgICAgICAgICAgdGV4dHVyZTogbnVsbCxcclxuICAgICAgICAgICAgb2Zmc2V0OiAwLFxyXG4gICAgICAgICAgICBudW1TcHJpdGVzOiAwXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNwcml0ZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3Qgc3ByaXRlID0gc3ByaXRlc1tpXVxyXG4gICAgICAgICAgICBjb25zdCByZW5kZXJGbGFncyA9IGdldF9zcHJpdGVfcmVuZGVyX2ZsYWdzKHNwcml0ZS5mbGFncylcclxuICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgKHNwcml0ZS50ZXh0dXJlPy5pZCA/PyAwKSAhPT0gKGJhdGNoLnRleHR1cmU/LmlkID8/IDApIHx8XHJcbiAgICAgICAgICAgICAgICByZW5kZXJGbGFncyAhPT0gYmF0Y2guZmxhZ3MpIHtcclxuICAgICAgICAgICAgICAgIC8vIGFwcGVuZCBjdXJyZW50IGJhdGNoIGlmIGl0IGNvbnRhaW5zIGFueSBzcHJpdGVzXHJcbiAgICAgICAgICAgICAgICBpZiAoYmF0Y2gubnVtU3ByaXRlcyA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJhdGNoZXMucHVzaChiYXRjaClcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBiZWdpbiBuZXcgYmF0Y2hcclxuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGJhdGNoLm9mZnNldCArIGJhdGNoLm51bVNwcml0ZXNcclxuICAgICAgICAgICAgICAgIGJhdGNoID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGZsYWdzOiByZW5kZXJGbGFncyxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0dXJlOiBzcHJpdGUudGV4dHVyZSxcclxuICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IG9mZnNldCxcclxuICAgICAgICAgICAgICAgICAgICBudW1TcHJpdGVzOiAwXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGJhdGNoLm51bVNwcml0ZXMrK1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYXBwZW5kIGZpbmFsIGJhdGNoIGlmIGl0IGNvbnRhaW5zIGFueSBzcHJpdGVzXHJcbiAgICAgICAgaWYgKGJhdGNoLm51bVNwcml0ZXMgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmF0Y2hlcy5wdXNoKGJhdGNoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY29weSB2ZXJ0aWNlcyBhbmQgaW5kaWNlcyB0byBhcnJheXMsIGdyb3dpbmcgYXJyYXlzIGlmIHJlcXVpcmVkXHJcbiAgICAgICAgY29uc3QgbnVtVmVydGljZXMgPSB0aGlzLnNwcml0ZXMubGVuZ3RoICogNFxyXG4gICAgICAgIGNvbnN0IG51bVZlcnRleEVsZW1zID0gbnVtVmVydGljZXMgKiBlbGVtc1BlclNwcml0ZVZlcnRleFxyXG4gICAgICAgIGNvbnN0IGVsZW1zUGVyU3ByaXRlID0gNCAqIGVsZW1zUGVyU3ByaXRlVmVydGV4XHJcbiAgICAgICAgaWYgKHRoaXMudmVydGljZXMubGVuZ3RoIDwgbnVtVmVydGV4RWxlbXMpIHtcclxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNlcyA9IG5ldyBGbG9hdDMyQXJyYXkobnVtVmVydGV4RWxlbXMpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBudW1JbmRpY2VzID0gdGhpcy5zcHJpdGVzLmxlbmd0aCAqIDZcclxuICAgICAgICBpZiAodGhpcy5pbmRpY2VzLmxlbmd0aCA8IG51bUluZGljZXMpIHtcclxuICAgICAgICAgICAgdGhpcy5pbmRpY2VzID0gbmV3IFVpbnQxNkFycmF5KG51bUluZGljZXMpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc3ByaXRlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBzcHJpdGUgPSB0aGlzLnNwcml0ZXNbaV1cclxuICAgICAgICAgICAgbGV0IGVsZW1PZmZzZXQgPSBpICogZWxlbXNQZXJTcHJpdGVcclxuICAgICAgICAgICAgbGV0IGluZGV4T2Zmc2V0ID0gaSAqIDZcclxuICAgICAgICAgICAgbGV0IGJhc2VJbmRleCA9IGkgKiA0XHJcbiAgICAgICAgICAgIGNvbnN0IGZsaXAgPSAoc3ByaXRlLmZsYWdzICYgU3ByaXRlRmxhZ3MuRmxpcCkgPT09IFNwcml0ZUZsYWdzLkZsaXBcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFZlcnRleChlbGVtT2Zmc2V0LCBzcHJpdGUucG9zaXRpb24ueCwgc3ByaXRlLnBvc2l0aW9uLnksIDAsIGZsaXAgPyAxIDogMCwgc3ByaXRlLmxheWVyLCBzcHJpdGUuY29sb3JbMF0sIHNwcml0ZS5jb2xvclsxXSwgc3ByaXRlLmNvbG9yWzJdLCBzcHJpdGUuY29sb3JbM10pXHJcbiAgICAgICAgICAgIGVsZW1PZmZzZXQgKz0gZWxlbXNQZXJTcHJpdGVWZXJ0ZXhcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFZlcnRleChlbGVtT2Zmc2V0LCBzcHJpdGUucG9zaXRpb24ueCwgc3ByaXRlLnBvc2l0aW9uLnkgKyBzcHJpdGUuaGVpZ2h0LCAwLCBmbGlwID8gMCA6IDEsIHNwcml0ZS5sYXllciwgc3ByaXRlLmNvbG9yWzBdLCBzcHJpdGUuY29sb3JbMV0sIHNwcml0ZS5jb2xvclsyXSwgc3ByaXRlLmNvbG9yWzNdKVxyXG4gICAgICAgICAgICBlbGVtT2Zmc2V0ICs9IGVsZW1zUGVyU3ByaXRlVmVydGV4XHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hWZXJ0ZXgoZWxlbU9mZnNldCwgc3ByaXRlLnBvc2l0aW9uLnggKyBzcHJpdGUud2lkdGgsIHNwcml0ZS5wb3NpdGlvbi55ICsgc3ByaXRlLmhlaWdodCwgMSwgZmxpcCA/IDAgOiAxLCBzcHJpdGUubGF5ZXIsIHNwcml0ZS5jb2xvclswXSwgc3ByaXRlLmNvbG9yWzFdLCBzcHJpdGUuY29sb3JbMl0sIHNwcml0ZS5jb2xvclszXSlcclxuICAgICAgICAgICAgZWxlbU9mZnNldCArPSBlbGVtc1BlclNwcml0ZVZlcnRleFxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoVmVydGV4KGVsZW1PZmZzZXQsIHNwcml0ZS5wb3NpdGlvbi54ICsgc3ByaXRlLndpZHRoLCBzcHJpdGUucG9zaXRpb24ueSwgMSwgZmxpcCA/IDEgOiAwLCBzcHJpdGUubGF5ZXIsIHNwcml0ZS5jb2xvclswXSwgc3ByaXRlLmNvbG9yWzFdLCBzcHJpdGUuY29sb3JbMl0sIHNwcml0ZS5jb2xvclszXSlcclxuICAgICAgICAgICAgZWxlbU9mZnNldCArPSBlbGVtc1BlclNwcml0ZVZlcnRleFxyXG5cclxuICAgICAgICAgICAgdGhpcy5pbmRpY2VzW2luZGV4T2Zmc2V0XSA9IGJhc2VJbmRleFxyXG4gICAgICAgICAgICB0aGlzLmluZGljZXNbaW5kZXhPZmZzZXQgKyAxXSA9IGJhc2VJbmRleCArIDFcclxuICAgICAgICAgICAgdGhpcy5pbmRpY2VzW2luZGV4T2Zmc2V0ICsgMl0gPSBiYXNlSW5kZXggKyAyXHJcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlc1tpbmRleE9mZnNldCArIDNdID0gYmFzZUluZGV4XHJcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlc1tpbmRleE9mZnNldCArIDRdID0gYmFzZUluZGV4ICsgMlxyXG4gICAgICAgICAgICB0aGlzLmluZGljZXNbaW5kZXhPZmZzZXQgKyA1XSA9IGJhc2VJbmRleCArIDNcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHRyYW5zZmVyIHZlcnRpY2VzIGFuZCBpbmRpY2VzIHRvIEdQVVxyXG4gICAgICAgIGNvbnN0IGdsID0gdGhpcy5nbFxyXG4gICAgICAgIGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnZlcnRleEJ1ZmZlcilcclxuICAgICAgICBnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy52ZXJ0aWNlcy5zdWJhcnJheSgwLCB0aGlzLnNwcml0ZXMubGVuZ3RoICogNCAqIGVsZW1zUGVyU3ByaXRlKSwgZ2wuRFlOQU1JQ19EUkFXKVxyXG4gICAgICAgIGdsLmJpbmRCdWZmZXIoZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIHRoaXMuaW5kZXhCdWZmZXIpXHJcbiAgICAgICAgZ2wuYnVmZmVyRGF0YShnbC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgdGhpcy5pbmRpY2VzLnN1YmFycmF5KDAsIHRoaXMuc3ByaXRlcy5sZW5ndGggKiA2KSwgZ2wuRFlOQU1JQ19EUkFXKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd1NoYWRvd3MoKSB7XHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcbiAgICAgICAgZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLnNoYWRvd01hcEZyYW1lYnVmZmVyKVxyXG4gICAgICAgIGdsLnZpZXdwb3J0KDAsIDAsIGdsLmRyYXdpbmdCdWZmZXJXaWR0aCwgZ2wuZHJhd2luZ0J1ZmZlckhlaWdodClcclxuICAgICAgICBnbC5jbGVhckNvbG9yKDAsIDAsIDAsIDApXHJcbiAgICAgICAgZ2wuY2xlYXIoZ2wuQ09MT1JfQlVGRkVSX0JJVClcclxuICAgICAgICBnbC5iaW5kVmVydGV4QXJyYXkodGhpcy5zaGFkb3dWYW8pXHJcbiAgICAgICAgZ2wudXNlUHJvZ3JhbSh0aGlzLnNoYWRvd1Byb2dyYW0pXHJcbiAgICAgICAgZ2wudW5pZm9ybTJmKHRoaXMuc2hhZG93Vmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgZ2wuYmluZFZlcnRleEFycmF5KHRoaXMuc2hhZG93VmFvKVxyXG5cclxuICAgICAgICAvLyBkcmF3IGVhY2ggc2hhZG93IGNhc3RpbmcgYmF0Y2hcclxuICAgICAgICBmb3IgKGNvbnN0IGJhdGNoIG9mIHRoaXMuYmF0Y2hlcykge1xyXG4gICAgICAgICAgICBpZiAoIShiYXRjaC5mbGFncyAmIFNwcml0ZUZsYWdzLkNhc3RzU2hhZG93cykpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGdsLmRyYXdFbGVtZW50cyhnbC5UUklBTkdMRVMsIGJhdGNoLm51bVNwcml0ZXMgKiA2LCBnbC5VTlNJR05FRF9TSE9SVCwgYmF0Y2gub2Zmc2V0ICogNiAqIDIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd1Nwcml0ZXMobGlnaHRSYWRpdXM6IG51bWJlcikge1xyXG4gICAgICAgIC8vIGRyYXcgdGhlIGJhdGNoZWQgc3ByaXRlc1xyXG4gICAgICAgIGNvbnN0IGdsID0gdGhpcy5nbFxyXG4gICAgICAgIGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbClcclxuICAgICAgICBnbC52aWV3cG9ydCgwLCAwLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgZ2wuY2xlYXJDb2xvcigwLCAwLCAwLCAxKVxyXG4gICAgICAgIGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpXHJcbiAgICAgICAgZ2wudXNlUHJvZ3JhbSh0aGlzLnNwcml0ZVByb2dyYW0pXHJcbiAgICAgICAgZ2wudW5pZm9ybTJmKHRoaXMuc3ByaXRlVmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgZ2wudW5pZm9ybTFmKHRoaXMuc3ByaXRlTGlnaHRSYWRpdXNVbmlmb3JtTG9jYXRpb24sIGxpZ2h0UmFkaXVzKVxyXG4gICAgICAgIGdsLmJpbmRWZXJ0ZXhBcnJheSh0aGlzLnNwcml0ZVZhbylcclxuXHJcbiAgICAgICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMClcclxuICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJEX0FSUkFZLCBudWxsKVxyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpXHJcbiAgICAgICAgZ2wuYmluZFNhbXBsZXIoMCwgdGhpcy5zYW1wbGVyKVxyXG5cclxuICAgICAgICBnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUxKVxyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkRfQVJSQVksIG51bGwpXHJcbiAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgbnVsbClcclxuICAgICAgICBnbC5iaW5kU2FtcGxlcigxLCB0aGlzLnNhbXBsZXIpXHJcblxyXG4gICAgICAgIGdsLnVuaWZvcm0xaSh0aGlzLnNwcml0ZVNhbXBsZXJVbmlmb3JtTG9jYXRpb24sIDApXHJcbiAgICAgICAgZ2wudW5pZm9ybTFpKHRoaXMuc3ByaXRlQXJyYXlTYW1wbGVyVW5pZm9ybUxvY2F0aW9uLCAxKVxyXG5cclxuICAgICAgICAvLyBkcmF3IGVhY2ggYmF0Y2hcclxuICAgICAgICBmb3IgKGNvbnN0IGJhdGNoIG9mIHRoaXMuYmF0Y2hlcykge1xyXG4gICAgICAgICAgICBjb25zdCB1c2VBcnJheVRleHR1cmUgPSBiYXRjaC5mbGFncyAmIFNwcml0ZUZsYWdzLkFycmF5VGV4dHVyZSA/IHRydWUgOiBmYWxzZVxyXG4gICAgICAgICAgICBjb25zdCB0ZXh0dXJlID0gYmF0Y2gudGV4dHVyZT8udGV4dHVyZSA/PyBudWxsXHJcblxyXG4gICAgICAgICAgICBpZiAodXNlQXJyYXlUZXh0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICBnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUxKVxyXG4gICAgICAgICAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgdGV4dHVyZSlcclxuXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwKVxyXG4gICAgICAgICAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZ2wudW5pZm9ybTFpKHRoaXMuc3ByaXRlTGl0VW5pZm9ybUxvY2F0aW9uLCBiYXRjaC5mbGFncyAmIFNwcml0ZUZsYWdzLkxpdCA/IDEgOiAwKVxyXG4gICAgICAgICAgICBnbC51bmlmb3JtMWkodGhpcy5zcHJpdGVVc2VBcnJheVRleHR1cmVVbmlmb3JtTG9jYXRpb24sIHVzZUFycmF5VGV4dHVyZSA/IDEgOiAwKVxyXG4gICAgICAgICAgICBnbC5kcmF3RWxlbWVudHMoZ2wuVFJJQU5HTEVTLCBiYXRjaC5udW1TcHJpdGVzICogNiwgZ2wuVU5TSUdORURfU0hPUlQsIGJhdGNoLm9mZnNldCAqIDYgKiAyKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNyZWF0ZVRleHR1cmUoKTogVGV4dHVyZSB7XHJcbiAgICAgICAgKyt0aGlzLnRleHR1cmVJZFxyXG4gICAgICAgIGNvbnN0IHRleHR1cmU6IFRleHR1cmUgPSB7XHJcbiAgICAgICAgICAgIHRleHR1cmU6IGdsdS5jcmVhdGVUZXh0dXJlKHRoaXMuZ2wpLFxyXG4gICAgICAgICAgICBpZDogdGhpcy50ZXh0dXJlSWRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0ZXh0dXJlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwdXNoVmVydGV4KG9mZnNldDogbnVtYmVyLCB4OiBudW1iZXIsIHk6IG51bWJlciwgdTogbnVtYmVyLCB2OiBudW1iZXIsIHc6IG51bWJlciwgcjogbnVtYmVyLCBnOiBudW1iZXIsIGI6IG51bWJlciwgYTogbnVtYmVyKSB7XHJcbiAgICAgICAgLy8gcG9zaXRpb25cclxuICAgICAgICB0aGlzLnZlcnRpY2VzW29mZnNldF0gPSB4XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXQgKyAxXSA9IHlcclxuICAgICAgICAvLyB1dlxyXG4gICAgICAgIHRoaXMudmVydGljZXNbb2Zmc2V0ICsgMl0gPSB1XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXQgKyAzXSA9IHZcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW29mZnNldCArIDRdID0gd1xyXG4gICAgICAgIC8vIGNvbG9yXHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXQgKyA1XSA9IHJcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW29mZnNldCArIDZdID0gZ1xyXG4gICAgICAgIHRoaXMudmVydGljZXNbb2Zmc2V0ICsgN10gPSBiXHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXQgKyA4XSA9IGFcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNoZWNrU2l6ZSgpIHtcclxuICAgICAgICBjb25zdCBjYW52YXMgPSB0aGlzLmNhbnZhc1xyXG4gICAgICAgIGlmIChjYW52YXMud2lkdGggIT09IGNhbnZhcy5jbGllbnRXaWR0aCAmJiBjYW52YXMuaGVpZ2h0ICE9PSBjYW52YXMuY2xpZW50SGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgICAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGNhbnZhcy53aWR0aCA9PT0gdGhpcy52aWV3cG9ydFdpZHRoICYmIGNhbnZhcy5oZWlnaHQgPT09IHRoaXMudmlld3BvcnRIZWlnaHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnZpZXdwb3J0V2lkdGggPSBjYW52YXMud2lkdGhcclxuICAgICAgICB0aGlzLnZpZXdwb3J0SGVpZ2h0ID0gY2FudmFzLmhlaWdodFxyXG5cclxuICAgICAgICAvLyBzZXR1cCBzaGFkb3dtYXBwaW5nIHRleHR1cmUgYW5kIGZyYW1lYnVmZmVyXHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcbiAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5zaGFkb3dNYXBUZXh0dXJlLnRleHR1cmUpXHJcbiAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSk7XHJcbiAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2wuQ0xBTVBfVE9fRURHRSk7XHJcbiAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLkxJTkVBUik7XHJcbiAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BWF9MRVZFTCwgMCk7XHJcbiAgICAgICAgZ2wudGV4SW1hZ2UyRChnbC5URVhUVVJFXzJELCAwLCBnbC5SR0JBLCB0aGlzLnZpZXdwb3J0V2lkdGgsIHRoaXMudmlld3BvcnRIZWlnaHQsIDAsIGdsLlJHQkEsIGdsLlVOU0lHTkVEX0JZVEUsIG51bGwpXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVNwcml0ZVZhbyhcclxuICAgIGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LFxyXG4gICAgcHJvZ3JhbTogV2ViR0xQcm9ncmFtLFxyXG4gICAgdmVydGV4QnVmZmVyOiBXZWJHTEJ1ZmZlcixcclxuICAgIGluZGV4QnVmZmVyOiBXZWJHTEJ1ZmZlcik6IFdlYkdMVmVydGV4QXJyYXlPYmplY3Qge1xyXG4gICAgY29uc3QgdmFvID0gZ2x1LmNyZWF0ZVZlcnRleEFycmF5KGdsKVxyXG4gICAgZ2wuYmluZFZlcnRleEFycmF5KHZhbylcclxuXHJcbiAgICBjb25zdCBwb3NpdGlvbkF0dHJpYklkeCA9IGdsdS5nZXRBdHRyaWJMb2NhdGlvbihnbCwgcHJvZ3JhbSwgXCJpbl9wb3NpdGlvblwiKVxyXG4gICAgY29uc3QgdXZ3QXR0cmliSWR4ID0gZ2x1LmdldEF0dHJpYkxvY2F0aW9uKGdsLCBwcm9ncmFtLCBcImluX3V2d1wiKVxyXG4gICAgY29uc3QgY29sb3JBdHRyaWJJZHggPSBnbHUuZ2V0QXR0cmliTG9jYXRpb24oZ2wsIHByb2dyYW0sIFwiaW5fY29sb3JcIilcclxuICAgIGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB2ZXJ0ZXhCdWZmZXIpXHJcbiAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShwb3NpdGlvbkF0dHJpYklkeClcclxuICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHV2d0F0dHJpYklkeClcclxuICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KGNvbG9yQXR0cmliSWR4KVxyXG4gICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcihwb3NpdGlvbkF0dHJpYklkeCwgMiwgZ2wuRkxPQVQsIGZhbHNlLCBzcHJpdGVWZXJ0ZXhTdHJpZGUsIDApXHJcbiAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHV2d0F0dHJpYklkeCwgMywgZ2wuRkxPQVQsIGZhbHNlLCBzcHJpdGVWZXJ0ZXhTdHJpZGUsIDgpXHJcbiAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKGNvbG9yQXR0cmliSWR4LCA0LCBnbC5GTE9BVCwgZmFsc2UsIHNwcml0ZVZlcnRleFN0cmlkZSwgMjApXHJcbiAgICBnbC5iaW5kQnVmZmVyKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCBpbmRleEJ1ZmZlcilcclxuICAgIHJldHVybiB2YW9cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlU2hhZG93VmFvKFxyXG4gICAgZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQsXHJcbiAgICBwcm9ncmFtOiBXZWJHTFByb2dyYW0sXHJcbiAgICB2ZXJ0ZXhCdWZmZXI6IFdlYkdMQnVmZmVyLFxyXG4gICAgaW5kZXhCdWZmZXI6IFdlYkdMQnVmZmVyKTogV2ViR0xWZXJ0ZXhBcnJheU9iamVjdCB7XHJcbiAgICBjb25zdCB2YW8gPSBnbHUuY3JlYXRlVmVydGV4QXJyYXkoZ2wpXHJcbiAgICBnbC5iaW5kVmVydGV4QXJyYXkodmFvKVxyXG5cclxuICAgIGNvbnN0IHBvc2l0aW9uQXR0cmliSWR4ID0gZ2x1LmdldEF0dHJpYkxvY2F0aW9uKGdsLCBwcm9ncmFtLCBcImluX3Bvc2l0aW9uXCIpXHJcbiAgICBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdmVydGV4QnVmZmVyKVxyXG4gICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkocG9zaXRpb25BdHRyaWJJZHgpXHJcbiAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHBvc2l0aW9uQXR0cmliSWR4LCAyLCBnbC5GTE9BVCwgZmFsc2UsIHNwcml0ZVZlcnRleFN0cmlkZSwgMClcclxuICAgIGdsLmJpbmRCdWZmZXIoZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIGluZGV4QnVmZmVyKVxyXG4gICAgcmV0dXJuIHZhb1xyXG59Il19