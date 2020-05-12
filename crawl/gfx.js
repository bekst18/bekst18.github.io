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
out vec4 frag_color;
out vec3 frag_uvw;

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

out float out_color;

void main() {
    // calculate distance from light
    float d = length(frag_position - viewport_size / 2.f);
    out_color = d;
}
`;
export var SpriteFlags;
(function (SpriteFlags) {
    SpriteFlags[SpriteFlags["None"] = 0] = "None";
    SpriteFlags[SpriteFlags["Lit"] = 1] = "Lit";
    SpriteFlags[SpriteFlags["ArrayTexture"] = 2] = "ArrayTexture";
})(SpriteFlags || (SpriteFlags = {}));
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
        this.textureId = 0;
        this.gl = glu.createContext(canvas);
        const gl = this.gl;
        this.shadowProgram = glu.compileProgram(gl, shadowVertexSrc, shadowFragmentSrc);
        this.shadowMapTexture = createShadowMapTexture(gl, gl.drawingBufferWidth, gl.drawingBufferHeight);
        this.shadowMapFramebuffer = createShadowMapFramebuffer(gl, this.shadowMapTexture);
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
        this.viewportWidth = canvas.width;
        this.viewportHeight = canvas.height;
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
    }
    bakeTextureArray(width, height, images) {
        // each image must be the same size
        const gl = this.gl;
        const texture = glu.createTexture(gl);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
        gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, width, height, images.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        images.forEach((img, i) => {
            gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, width, height, 1, gl.RGBA, gl.UNSIGNED_BYTE, img);
        });
        gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
        this.textureId++;
        return {
            id: this.textureId,
            texture: texture
        };
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
        this.checkResize();
        this.batchSprites();
        this.drawSprites(lightRadius);
        // this.drawShadows()
        // clear sprites and batches
        this.sprites = [];
        this.batches = [];
    }
    batchSprites() {
        var _a, _b, _c, _d;
        // sort sprites
        const sprites = this.sprites;
        sprites.sort((s1, s2) => {
            var _a, _b, _c, _d;
            const id1 = (_b = (_a = s1 === null || s1 === void 0 ? void 0 : s1.texture) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : 0;
            const id2 = (_d = (_c = s2 === null || s2 === void 0 ? void 0 : s2.texture) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : 0;
            if (id1 < id2) {
                return -1;
            }
            if (id1 > id2) {
                return 1;
            }
            return util.compare(s1.flags, s2.flags);
        });
        let batch = {
            flags: SpriteFlags.None,
            texture: null,
            offset: 0,
            numSprites: 0
        };
        for (let i = 0; i < sprites.length; ++i) {
            const sprite = sprites[i];
            if (((_b = (_a = sprite.texture) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : 0) !== ((_d = (_c = batch.texture) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : 0) ||
                sprite.flags !== batch.flags) {
                // append current batch if it contains any sprites
                if (batch.numSprites > 0) {
                    this.batches.push(batch);
                }
                // begin new batch
                const offset = batch.offset + batch.numSprites;
                batch = {
                    flags: sprite.flags,
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
            this.pushVertex(elemOffset, sprite.position.x, sprite.position.y, 0, 0, sprite.layer, sprite.color[0], sprite.color[1], sprite.color[2], sprite.color[3]);
            elemOffset += elemsPerSpriteVertex;
            this.pushVertex(elemOffset, sprite.position.x, sprite.position.y + sprite.height, 0, 1, sprite.layer, sprite.color[0], sprite.color[1], sprite.color[2], sprite.color[3]);
            elemOffset += elemsPerSpriteVertex;
            this.pushVertex(elemOffset, sprite.position.x + sprite.width, sprite.position.y + sprite.height, 1, 1, sprite.layer, sprite.color[0], sprite.color[1], sprite.color[2], sprite.color[3]);
            elemOffset += elemsPerSpriteVertex;
            this.pushVertex(elemOffset, sprite.position.x + sprite.width, sprite.position.y, 1, 0, sprite.layer, sprite.color[0], sprite.color[1], sprite.color[2], sprite.color[3]);
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
        gl.bindVertexArray(this.shadowVao);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.shadowProgram);
        gl.uniform2f(this.shadowViewportSizeUniformLocation, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindVertexArray(this.shadowVao);
        // draw each for
        gl.drawElements(gl.TRIANGLES, this.sprites.length * 6, gl.UNSIGNED_SHORT, 0);
    }
    drawSprites(lightRadius) {
        var _a, _b;
        // draw the sprites
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindVertexArray(this.spriteVao);
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
    drawShadowTexture() {
        // const gl = this.gl
        // gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        // gl.bindVertexArray(this.spriteVao)
        // gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
        // gl.clearColor(0, 0, 0, 1)
        // gl.clear(gl.COLOR_BUFFER_BIT)
        // gl.useProgram(this.spriteProgram)
        // gl.uniform2f(this.spriteViewportSizeUniformLocation, gl.drawingBufferWidth, gl.drawingBufferHeight)
        // gl.uniform1f(this.spriteLightRadiusUniformLocation, lightRadius)
        // gl.bindVertexArray(this.spriteVao)
        // // draw each batch
        // for (const [texture, batch] of this.batches) {
        //     gl.activeTexture(gl.TEXTURE0)
        //     gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture)
        //     gl.bindSampler(0, this.sampler)
        //     gl.uniform1i(this.samplerUniformLocation, 0)
        //     gl.drawElements(gl.TRIANGLES, batch.sprites.length * 6, gl.UNSIGNED_SHORT, 0)
        // }
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
    checkResize() {
        const canvas = this.canvas;
        if (canvas.width !== canvas.clientWidth && canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }
        if (canvas.width === this.viewportWidth && canvas.height === this.viewportHeight) {
            return;
        }
        this.gl.deleteTexture(this.shadowMapTexture);
        this.gl.deleteFramebuffer(this.shadowMapFramebuffer);
        this.shadowMapTexture = createShadowMapTexture(this.gl, canvas.width, canvas.height);
        this.shadowMapFramebuffer = createShadowMapFramebuffer(this.gl, this.shadowMapTexture);
        this.viewportWidth = canvas.width;
        this.viewportHeight = canvas.height;
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
function createShadowMapTexture(gl, width, height) {
    const texture = glu.createTexture(gl);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return texture;
}
function createShadowMapFramebuffer(gl, texture) {
    const fb = glu.createFramebuffer(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return fb;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2Z4LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2Z4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0gsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBSXpDLE1BQU0sZUFBZSxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBbUJ0QixDQUFBO0FBRUYsTUFBTSxpQkFBaUIsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQXFDeEIsQ0FBQTtBQUVGLE1BQU0sZUFBZSxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7RUFldEIsQ0FBQTtBQUVGLE1BQU0saUJBQWlCLEdBQUc7Ozs7Ozs7Ozs7Ozs7OztDQWV6QixDQUFBO0FBRUQsTUFBTSxDQUFOLElBQVksV0FJWDtBQUpELFdBQVksV0FBVztJQUNuQiw2Q0FBUSxDQUFBO0lBQ1IsMkNBQVksQ0FBQTtJQUNaLDZEQUFxQixDQUFBO0FBQ3pCLENBQUMsRUFKVyxXQUFXLEtBQVgsV0FBVyxRQUl0QjtBQWlCRCxNQUFNLE9BQU8sTUFBTTtJQVNmLFlBQVksVUFBeUIsRUFBRTtRQVJoQyxhQUFRLEdBQWMsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QyxVQUFLLEdBQVcsQ0FBQyxDQUFBO1FBQ2pCLFdBQU0sR0FBVyxDQUFDLENBQUE7UUFDbEIsVUFBSyxHQUFXLENBQUMsQ0FBQTtRQUNqQixVQUFLLEdBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzQixZQUFPLEdBQW1CLElBQUksQ0FBQTtRQUM5QixVQUFLLEdBQWdCLFdBQVcsQ0FBQyxJQUFJLENBQUE7UUFHeEMsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO1lB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QUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6SixVQUFVLElBQUksb0JBQW9CLENBQUE7WUFFbEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pLLFVBQVUsSUFBSSxvQkFBb0IsQ0FBQTtZQUVsQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN4TCxVQUFVLElBQUksb0JBQW9CLENBQUE7WUFFbEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFD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O0lBQ3BDLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUN0QyxFQUFFLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDeEYsT0FBTyxFQUFFLENBQUE7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIHdlYiBnbCBzcHJpdGUgcmVuZGVyaW5nIHV0aWxpdGllc1xyXG4gKi9cclxuaW1wb3J0ICogYXMgZ2x1IGZyb20gXCIuL2dsdS5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tIFwiLi4vc2hhcmVkL3V0aWwuanNcIlxyXG5cclxuZXhwb3J0IHR5cGUgQ29sb3IgPSBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXVxyXG5cclxuY29uc3Qgc3ByaXRlVmVydGV4U3JjID0gYCN2ZXJzaW9uIDMwMCBlc1xyXG5wcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcclxuXHJcbnVuaWZvcm0gdmVjMiB2aWV3cG9ydF9zaXplO1xyXG5cclxuaW4gdmVjMiBpbl9wb3NpdGlvbjtcclxuaW4gdmVjMyBpbl91dnc7XHJcbmluIHZlYzQgaW5fY29sb3I7XHJcblxyXG5vdXQgdmVjMiBmcmFnX3Bvc2l0aW9uO1xyXG5vdXQgdmVjNCBmcmFnX2NvbG9yO1xyXG5vdXQgdmVjMyBmcmFnX3V2dztcclxuXHJcbnZvaWQgbWFpbigpIHtcclxuICAgIGZyYWdfdXZ3ID0gaW5fdXZ3O1xyXG4gICAgZnJhZ19jb2xvciA9IGluX2NvbG9yO1xyXG4gICAgZnJhZ19wb3NpdGlvbiA9IGluX3Bvc2l0aW9uO1xyXG4gICAgdmVjMiBwb3NpdGlvbiA9IHZlYzIoaW5fcG9zaXRpb24ueCAvIHZpZXdwb3J0X3NpemUueCAqIDIuZiAtIDEuZiwgLWluX3Bvc2l0aW9uLnkgLyB2aWV3cG9ydF9zaXplLnkgKiAyLmYgKyAxLmYpO1xyXG4gICAgZ2xfUG9zaXRpb24gPSB2ZWM0KHBvc2l0aW9uLCAwLCAxKTtcclxufWBcclxuXHJcbmNvbnN0IHNwcml0ZUZyYWdtZW50U3JjID0gYCN2ZXJzaW9uIDMwMCBlc1xyXG5wcmVjaXNpb24gaGlnaHAgZmxvYXQ7XHJcbnByZWNpc2lvbiBoaWdocCBzYW1wbGVyMkQ7XHJcbnByZWNpc2lvbiBoaWdocCBzYW1wbGVyMkRBcnJheTtcclxuXHJcbnVuaWZvcm0gYm9vbCBsaXQ7XHJcbnVuaWZvcm0gYm9vbCB1c2VfYXJyYXlfdGV4dHVyZTtcclxudW5pZm9ybSBtZWRpdW1wIHZlYzIgdmlld3BvcnRfc2l6ZTtcclxudW5pZm9ybSBmbG9hdCBsaWdodF9yYWRpdXM7XHJcbnVuaWZvcm0gc2FtcGxlcjJEIHNhbXBsZXI7XHJcbnVuaWZvcm0gc2FtcGxlcjJEQXJyYXkgYXJyYXlfc2FtcGxlcjtcclxuXHJcbmluIHZlYzIgZnJhZ19wb3NpdGlvbjtcclxuaW4gdmVjNCBmcmFnX2NvbG9yO1xyXG5pbiB2ZWMzIGZyYWdfdXZ3O1xyXG5cclxub3V0IHZlYzQgb3V0X2NvbG9yO1xyXG5cclxudm9pZCBtYWluKCkge1xyXG4gICAgZmxvYXQgbCA9IDEuZjtcclxuICAgIGlmIChsaXQpIHtcclxuICAgICAgICAvLyBjYWxjdWxhdGUgZGlzdGFuY2UgZnJvbSBsaWdodFxyXG4gICAgICAgIGZsb2F0IGQgPSBsZW5ndGgoZnJhZ19wb3NpdGlvbiAtIHZpZXdwb3J0X3NpemUgLyAyLmYpO1xyXG5cclxuICAgICAgICAvLyBjYWxjdWxhdGUgbGlnaHQgYW1vdW50IChmdWxsIGZyb20gMCB0byBsaWdodCByYWRpdXMsIGxlcnAgZnJvbSBsaWdodF9yYWRpdXMgdG8gMiAqIGxpZ2h0X3JhZGl1cylcclxuICAgICAgICBsID0gbWl4KDEuZiwgMC5mLCBkIC8gbGlnaHRfcmFkaXVzKTtcclxuICAgIH1cclxuXHJcbiAgICBvdXRfY29sb3IgPSBmcmFnX2NvbG9yO1xyXG5cclxuICAgIGlmICh1c2VfYXJyYXlfdGV4dHVyZSkge1xyXG4gICAgICAgIG91dF9jb2xvciAqPSB0ZXh0dXJlKGFycmF5X3NhbXBsZXIsIGZyYWdfdXZ3KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgb3V0X2NvbG9yICo9IHRleHR1cmUoc2FtcGxlciwgZnJhZ191dncueHkpO1xyXG4gICAgfVxyXG5cclxuICAgIG91dF9jb2xvciAqPSB2ZWM0KGwsIGwsIGwsIDEpO1xyXG59YFxyXG5cclxuY29uc3Qgc2hhZG93VmVydGV4U3JjID0gYCN2ZXJzaW9uIDMwMCBlc1xyXG5wcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcclxuXHJcbnVuaWZvcm0gdmVjMiB2aWV3cG9ydF9zaXplO1xyXG5cclxuaW4gdmVjMiBpbl9wb3NpdGlvbjtcclxuXHJcbm91dCB2ZWMyIGZyYWdfcG9zaXRpb247XHJcbm91dCB2ZWM0IGZyYWdfY29sb3I7XHJcbm91dCB2ZWMzIGZyYWdfdXZ3O1xyXG5cclxudm9pZCBtYWluKCkge1xyXG4gICAgZnJhZ19wb3NpdGlvbiA9IGluX3Bvc2l0aW9uO1xyXG4gICAgdmVjMiBwb3NpdGlvbiA9IHZlYzIoaW5fcG9zaXRpb24ueCAvIHZpZXdwb3J0X3NpemUueCAqIDIuZiAtIDEuZiwgLWluX3Bvc2l0aW9uLnkgLyB2aWV3cG9ydF9zaXplLnkgKiAyLmYgKyAxLmYpO1xyXG4gICAgZ2xfUG9zaXRpb24gPSB2ZWM0KHBvc2l0aW9uLCAwLCAxKTtcclxufWBcclxuXHJcbmNvbnN0IHNoYWRvd0ZyYWdtZW50U3JjID0gYCN2ZXJzaW9uIDMwMCBlc1xyXG5wcmVjaXNpb24gaGlnaHAgZmxvYXQ7XHJcbnByZWNpc2lvbiBoaWdocCBzYW1wbGVyMkRBcnJheTtcclxuXHJcbnVuaWZvcm0gbWVkaXVtcCB2ZWMyIHZpZXdwb3J0X3NpemU7XHJcblxyXG5pbiB2ZWMyIGZyYWdfcG9zaXRpb247XHJcblxyXG5vdXQgZmxvYXQgb3V0X2NvbG9yO1xyXG5cclxudm9pZCBtYWluKCkge1xyXG4gICAgLy8gY2FsY3VsYXRlIGRpc3RhbmNlIGZyb20gbGlnaHRcclxuICAgIGZsb2F0IGQgPSBsZW5ndGgoZnJhZ19wb3NpdGlvbiAtIHZpZXdwb3J0X3NpemUgLyAyLmYpO1xyXG4gICAgb3V0X2NvbG9yID0gZDtcclxufVxyXG5gXHJcblxyXG5leHBvcnQgZW51bSBTcHJpdGVGbGFncyB7XHJcbiAgICBOb25lID0gMCxcclxuICAgIExpdCA9IDEgPDwgMCxcclxuICAgIEFycmF5VGV4dHVyZSA9IDEgPDwgMSxcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUZXh0dXJlIHtcclxuICAgIGlkOiBudW1iZXJcclxuICAgIHRleHR1cmU6IFdlYkdMVGV4dHVyZVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNwcml0ZU9wdGlvbnMge1xyXG4gICAgcG9zaXRpb24/OiBnZW8uUG9pbnRcclxuICAgIHdpZHRoPzogbnVtYmVyXHJcbiAgICBoZWlnaHQ/OiBudW1iZXJcclxuICAgIGxheWVyPzogbnVtYmVyXHJcbiAgICBjb2xvcj86IENvbG9yXHJcbiAgICB0ZXh0dXJlPzogVGV4dHVyZSB8IG51bGxcclxuICAgIGZsYWdzPzogU3ByaXRlRmxhZ3NcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNwcml0ZSB7XHJcbiAgICBwdWJsaWMgcG9zaXRpb246IGdlby5Qb2ludCA9IG5ldyBnZW8uUG9pbnQoMCwgMClcclxuICAgIHB1YmxpYyB3aWR0aDogbnVtYmVyID0gMFxyXG4gICAgcHVibGljIGhlaWdodDogbnVtYmVyID0gMFxyXG4gICAgcHVibGljIGxheWVyOiBudW1iZXIgPSAwXHJcbiAgICBwdWJsaWMgY29sb3I6IENvbG9yID0gWzEsIDEsIDEsIDFdXHJcbiAgICBwdWJsaWMgdGV4dHVyZTogVGV4dHVyZSB8IG51bGwgPSBudWxsXHJcbiAgICBwdWJsaWMgZmxhZ3M6IFNwcml0ZUZsYWdzID0gU3ByaXRlRmxhZ3MuTm9uZVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFNwcml0ZU9wdGlvbnMgPSB7fSkge1xyXG4gICAgICAgIGlmIChvcHRpb25zLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy53aWR0aCkge1xyXG4gICAgICAgICAgICB0aGlzLndpZHRoID0gb3B0aW9ucy53aWR0aFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmxheWVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGF5ZXIgPSBvcHRpb25zLmxheWVyXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5jb2xvcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvbG9yID0gb3B0aW9ucy5jb2xvclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMudGV4dHVyZSkge1xyXG4gICAgICAgICAgICB0aGlzLnRleHR1cmUgPSBvcHRpb25zLnRleHR1cmVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmZsYWdzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmxhZ3MgPSBvcHRpb25zLmZsYWdzXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jb25zdCBlbGVtc1BlclNwcml0ZVZlcnRleCA9IDlcclxuY29uc3Qgc3ByaXRlVmVydGV4U3RyaWRlID0gZWxlbXNQZXJTcHJpdGVWZXJ0ZXggKiA0XHJcblxyXG5pbnRlcmZhY2UgU3ByaXRlQmF0Y2gge1xyXG4gICAgdGV4dHVyZTogVGV4dHVyZSB8IG51bGxcclxuICAgIGZsYWdzOiBTcHJpdGVGbGFnc1xyXG4gICAgb2Zmc2V0OiBudW1iZXJcclxuICAgIG51bVNwcml0ZXM6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUmVuZGVyZXIge1xyXG4gICAgLy8gdmVydGV4IGxheW91dDpcclxuICAgIC8vIHh5IHV2dyByZ2JhIChhbGwgZmxvYXQzMilcclxuICAgIHB1YmxpYyByZWFkb25seSBnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzaGFkb3dQcm9ncmFtOiBXZWJHTFByb2dyYW1cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlUHJvZ3JhbTogV2ViR0xQcm9ncmFtXHJcbiAgICBwcml2YXRlIHNoYWRvd01hcFRleHR1cmU6IFdlYkdMVGV4dHVyZVxyXG4gICAgcHJpdmF0ZSBzaGFkb3dNYXBGcmFtZWJ1ZmZlcjogV2ViR0xGcmFtZWJ1ZmZlclxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzcHJpdGVMaXRVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNwcml0ZVVzZUFycmF5VGV4dHVyZVVuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb25cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlU2FtcGxlclVuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb25cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlQXJyYXlTYW1wbGVyVW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvblxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzcHJpdGVWaWV3cG9ydFNpemVVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNwcml0ZUxpZ2h0UmFkaXVzVW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvblxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzaGFkb3dWaWV3cG9ydFNpemVVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNhbXBsZXI6IFdlYkdMU2FtcGxlclxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBhcnJheVNhbXBsZXI6IFdlYkdMU2FtcGxlclxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB2ZXJ0ZXhCdWZmZXI6IFdlYkdMQnVmZmVyXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGluZGV4QnVmZmVyOiBXZWJHTEJ1ZmZlclxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzcHJpdGVWYW86IFdlYkdMVmVydGV4QXJyYXlPYmplY3RcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2hhZG93VmFvOiBXZWJHTFZlcnRleEFycmF5T2JqZWN0XHJcbiAgICBwcml2YXRlIHNwcml0ZXM6IFNwcml0ZVtdID0gW11cclxuICAgIHByaXZhdGUgYmF0Y2hlczogU3ByaXRlQmF0Y2hbXSA9IFtdXHJcbiAgICBwcml2YXRlIHZlcnRpY2VzOiBGbG9hdDMyQXJyYXkgPSBuZXcgRmxvYXQzMkFycmF5KClcclxuICAgIHByaXZhdGUgaW5kaWNlczogVWludDE2QXJyYXkgPSBuZXcgVWludDE2QXJyYXkoKVxyXG4gICAgcHJpdmF0ZSB2aWV3cG9ydFdpZHRoOiBudW1iZXJcclxuICAgIHByaXZhdGUgdmlld3BvcnRIZWlnaHQ6IG51bWJlclxyXG4gICAgcHJpdmF0ZSB0ZXh0dXJlSWQ6IG51bWJlciA9IDBcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihyZWFkb25seSBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KSB7XHJcbiAgICAgICAgdGhpcy5nbCA9IGdsdS5jcmVhdGVDb250ZXh0KGNhbnZhcylcclxuICAgICAgICBjb25zdCBnbCA9IHRoaXMuZ2xcclxuXHJcbiAgICAgICAgdGhpcy5zaGFkb3dQcm9ncmFtID0gZ2x1LmNvbXBpbGVQcm9ncmFtKGdsLCBzaGFkb3dWZXJ0ZXhTcmMsIHNoYWRvd0ZyYWdtZW50U3JjKVxyXG4gICAgICAgIHRoaXMuc2hhZG93TWFwVGV4dHVyZSA9IGNyZWF0ZVNoYWRvd01hcFRleHR1cmUoZ2wsIGdsLmRyYXdpbmdCdWZmZXJXaWR0aCwgZ2wuZHJhd2luZ0J1ZmZlckhlaWdodClcclxuICAgICAgICB0aGlzLnNoYWRvd01hcEZyYW1lYnVmZmVyID0gY3JlYXRlU2hhZG93TWFwRnJhbWVidWZmZXIoZ2wsIHRoaXMuc2hhZG93TWFwVGV4dHVyZSlcclxuICAgICAgICB0aGlzLnNwcml0ZVByb2dyYW0gPSBnbHUuY29tcGlsZVByb2dyYW0oZ2wsIHNwcml0ZVZlcnRleFNyYywgc3ByaXRlRnJhZ21lbnRTcmMpXHJcblxyXG4gICAgICAgIHRoaXMuc3ByaXRlTGl0VW5pZm9ybUxvY2F0aW9uID0gZ2x1LmdldFVuaWZvcm1Mb2NhdGlvbihnbCwgdGhpcy5zcHJpdGVQcm9ncmFtLCBcImxpdFwiKVxyXG4gICAgICAgIHRoaXMuc3ByaXRlVXNlQXJyYXlUZXh0dXJlVW5pZm9ybUxvY2F0aW9uID0gZ2x1LmdldFVuaWZvcm1Mb2NhdGlvbihnbCwgdGhpcy5zcHJpdGVQcm9ncmFtLCBcInVzZV9hcnJheV90ZXh0dXJlXCIpXHJcbiAgICAgICAgdGhpcy5zcHJpdGVTYW1wbGVyVW5pZm9ybUxvY2F0aW9uID0gZ2x1LmdldFVuaWZvcm1Mb2NhdGlvbihnbCwgdGhpcy5zcHJpdGVQcm9ncmFtLCBcInNhbXBsZXJcIilcclxuICAgICAgICB0aGlzLnNwcml0ZUFycmF5U2FtcGxlclVuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgXCJhcnJheV9zYW1wbGVyXCIpXHJcbiAgICAgICAgdGhpcy5zcHJpdGVWaWV3cG9ydFNpemVVbmlmb3JtTG9jYXRpb24gPSBnbHUuZ2V0VW5pZm9ybUxvY2F0aW9uKGdsLCB0aGlzLnNwcml0ZVByb2dyYW0sIFwidmlld3BvcnRfc2l6ZVwiKVxyXG4gICAgICAgIHRoaXMuc3ByaXRlTGlnaHRSYWRpdXNVbmlmb3JtTG9jYXRpb24gPSBnbHUuZ2V0VW5pZm9ybUxvY2F0aW9uKGdsLCB0aGlzLnNwcml0ZVByb2dyYW0sIFwibGlnaHRfcmFkaXVzXCIpXHJcbiAgICAgICAgdGhpcy5zaGFkb3dWaWV3cG9ydFNpemVVbmlmb3JtTG9jYXRpb24gPSBnbHUuZ2V0VW5pZm9ybUxvY2F0aW9uKGdsLCB0aGlzLnNoYWRvd1Byb2dyYW0sIFwidmlld3BvcnRfc2l6ZVwiKVxyXG5cclxuICAgICAgICB0aGlzLnZlcnRleEJ1ZmZlciA9IGdsdS5jcmVhdGVCdWZmZXIoZ2wpXHJcbiAgICAgICAgdGhpcy5pbmRleEJ1ZmZlciA9IGdsdS5jcmVhdGVCdWZmZXIoZ2wpXHJcbiAgICAgICAgdGhpcy52aWV3cG9ydFdpZHRoID0gY2FudmFzLndpZHRoXHJcbiAgICAgICAgdGhpcy52aWV3cG9ydEhlaWdodCA9IGNhbnZhcy5oZWlnaHRcclxuXHJcbiAgICAgICAgLy8gc2V0dXAgc2FtcGxlclxyXG4gICAgICAgIHRoaXMuc2FtcGxlciA9IGdsdS5jcmVhdGVTYW1wbGVyKGdsKVxyXG4gICAgICAgIGdsLnNhbXBsZXJQYXJhbWV0ZXJpKHRoaXMuc2FtcGxlciwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5MSU5FQVIpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLkxJTkVBUl9NSVBNQVBfTElORUFSKVxyXG4gICAgICAgIGdsLnNhbXBsZXJQYXJhbWV0ZXJpKHRoaXMuc2FtcGxlciwgZ2wuVEVYVFVSRV9XUkFQX1IsIGdsLkNMQU1QX1RPX0VER0UpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSlcclxuICAgICAgICBnbC5zYW1wbGVyUGFyYW1ldGVyaSh0aGlzLnNhbXBsZXIsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKVxyXG5cclxuICAgICAgICB0aGlzLmFycmF5U2FtcGxlciA9IGdsdS5jcmVhdGVTYW1wbGVyKGdsKVxyXG4gICAgICAgIGdsLnNhbXBsZXJQYXJhbWV0ZXJpKHRoaXMuc2FtcGxlciwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5MSU5FQVIpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLkxJTkVBUl9NSVBNQVBfTElORUFSKVxyXG4gICAgICAgIGdsLnNhbXBsZXJQYXJhbWV0ZXJpKHRoaXMuc2FtcGxlciwgZ2wuVEVYVFVSRV9XUkFQX1IsIGdsLkNMQU1QX1RPX0VER0UpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSlcclxuICAgICAgICBnbC5zYW1wbGVyUGFyYW1ldGVyaSh0aGlzLnNhbXBsZXIsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKVxyXG5cclxuICAgICAgICB0aGlzLnNwcml0ZVZhbyA9IGNyZWF0ZVNwcml0ZVZhbyh0aGlzLmdsLCB0aGlzLnNwcml0ZVByb2dyYW0sIHRoaXMudmVydGV4QnVmZmVyLCB0aGlzLmluZGV4QnVmZmVyKVxyXG4gICAgICAgIHRoaXMuc2hhZG93VmFvID0gY3JlYXRlU2hhZG93VmFvKHRoaXMuZ2wsIHRoaXMuc2hhZG93UHJvZ3JhbSwgdGhpcy52ZXJ0ZXhCdWZmZXIsIHRoaXMuaW5kZXhCdWZmZXIpXHJcbiAgICB9XHJcblxyXG4gICAgYmFrZVRleHR1cmVBcnJheSh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgaW1hZ2VzOiBUZXhJbWFnZVNvdXJjZVtdKTogVGV4dHVyZSB7XHJcbiAgICAgICAgLy8gZWFjaCBpbWFnZSBtdXN0IGJlIHRoZSBzYW1lIHNpemVcclxuICAgICAgICBjb25zdCBnbCA9IHRoaXMuZ2xcclxuICAgICAgICBjb25zdCB0ZXh0dXJlID0gZ2x1LmNyZWF0ZVRleHR1cmUoZ2wpXHJcbiAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgdGV4dHVyZSlcclxuICAgICAgICBnbC50ZXhJbWFnZTNEKGdsLlRFWFRVUkVfMkRfQVJSQVksIDAsIGdsLlJHQkEsIHdpZHRoLCBoZWlnaHQsIGltYWdlcy5sZW5ndGgsIDAsIGdsLlJHQkEsIGdsLlVOU0lHTkVEX0JZVEUsIG51bGwpXHJcbiAgICAgICAgaW1hZ2VzLmZvckVhY2goKGltZywgaSkgPT4ge1xyXG4gICAgICAgICAgICBnbC50ZXhTdWJJbWFnZTNEKGdsLlRFWFRVUkVfMkRfQVJSQVksIDAsIDAsIDAsIGksIHdpZHRoLCBoZWlnaHQsIDEsIGdsLlJHQkEsIGdsLlVOU0lHTkVEX0JZVEUsIGltZylcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBnbC5nZW5lcmF0ZU1pcG1hcChnbC5URVhUVVJFXzJEX0FSUkFZKVxyXG4gICAgICAgIHRoaXMudGV4dHVyZUlkKytcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMudGV4dHVyZUlkLFxyXG4gICAgICAgICAgICB0ZXh0dXJlOiB0ZXh0dXJlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGxvYWRUZXh0dXJlKHVybDogc3RyaW5nKTogUHJvbWlzZTxUZXh0dXJlPiB7XHJcbiAgICAgICAgLy8gZWFjaCBpbWFnZSBtdXN0IGJlIHRoZSBzYW1lIHNpemVcclxuICAgICAgICBjb25zdCBnbCA9IHRoaXMuZ2xcclxuICAgICAgICBjb25zdCB0ZXh0dXJlID0gYXdhaXQgZ2x1LmxvYWRUZXh0dXJlKGdsLCB1cmwpXHJcbiAgICAgICAgZ2wuZ2VuZXJhdGVNaXBtYXAoZ2wuVEVYVFVSRV8yRF9BUlJBWSlcclxuICAgICAgICB0aGlzLnRleHR1cmVJZCsrXHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLnRleHR1cmVJZCxcclxuICAgICAgICAgICAgdGV4dHVyZTogdGV4dHVyZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBkcmF3U3ByaXRlKHNwcml0ZTogU3ByaXRlKSB7XHJcbiAgICAgICAgLy8gYWRkIHNwcml0ZSB0byBhcnJheVxyXG4gICAgICAgIHRoaXMuc3ByaXRlcy5wdXNoKHNwcml0ZSlcclxuICAgIH1cclxuXHJcbiAgICBmbHVzaChsaWdodFJhZGl1czogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5jaGVja1Jlc2l6ZSgpXHJcbiAgICAgICAgdGhpcy5iYXRjaFNwcml0ZXMoKVxyXG4gICAgICAgIHRoaXMuZHJhd1Nwcml0ZXMobGlnaHRSYWRpdXMpXHJcbiAgICAgICAgLy8gdGhpcy5kcmF3U2hhZG93cygpXHJcblxyXG4gICAgICAgIC8vIGNsZWFyIHNwcml0ZXMgYW5kIGJhdGNoZXNcclxuICAgICAgICB0aGlzLnNwcml0ZXMgPSBbXVxyXG4gICAgICAgIHRoaXMuYmF0Y2hlcyA9IFtdXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBiYXRjaFNwcml0ZXMoKSB7XHJcbiAgICAgICAgLy8gc29ydCBzcHJpdGVzXHJcbiAgICAgICAgY29uc3Qgc3ByaXRlcyA9IHRoaXMuc3ByaXRlc1xyXG4gICAgICAgIHNwcml0ZXMuc29ydCgoczEsIHMyKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGlkMSA9IHMxPy50ZXh0dXJlPy5pZCA/PyAwXHJcbiAgICAgICAgICAgIGNvbnN0IGlkMiA9IHMyPy50ZXh0dXJlPy5pZCA/PyAwXHJcbiAgICAgICAgICAgIGlmIChpZDEgPCBpZDIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAtMVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoaWQxID4gaWQyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gMVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdXRpbC5jb21wYXJlKHMxLmZsYWdzLCBzMi5mbGFncylcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBsZXQgYmF0Y2g6IFNwcml0ZUJhdGNoID0ge1xyXG4gICAgICAgICAgICBmbGFnczogU3ByaXRlRmxhZ3MuTm9uZSxcclxuICAgICAgICAgICAgdGV4dHVyZTogbnVsbCxcclxuICAgICAgICAgICAgb2Zmc2V0OiAwLFxyXG4gICAgICAgICAgICBudW1TcHJpdGVzOiAwXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNwcml0ZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3Qgc3ByaXRlID0gc3ByaXRlc1tpXVxyXG4gICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICAoc3ByaXRlLnRleHR1cmU/LmlkID8/IDApICE9PSAoYmF0Y2gudGV4dHVyZT8uaWQgPz8gMCkgfHxcclxuICAgICAgICAgICAgICAgIHNwcml0ZS5mbGFncyAhPT0gYmF0Y2guZmxhZ3MpIHtcclxuICAgICAgICAgICAgICAgIC8vIGFwcGVuZCBjdXJyZW50IGJhdGNoIGlmIGl0IGNvbnRhaW5zIGFueSBzcHJpdGVzXHJcbiAgICAgICAgICAgICAgICBpZiAoYmF0Y2gubnVtU3ByaXRlcyA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJhdGNoZXMucHVzaChiYXRjaClcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBiZWdpbiBuZXcgYmF0Y2hcclxuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGJhdGNoLm9mZnNldCArIGJhdGNoLm51bVNwcml0ZXNcclxuICAgICAgICAgICAgICAgIGJhdGNoID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGZsYWdzOiBzcHJpdGUuZmxhZ3MsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dHVyZTogc3ByaXRlLnRleHR1cmUsXHJcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiBvZmZzZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgbnVtU3ByaXRlczogMFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBiYXRjaC5udW1TcHJpdGVzKytcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFwcGVuZCBmaW5hbCBiYXRjaCBpZiBpdCBjb250YWlucyBhbnkgc3ByaXRlc1xyXG4gICAgICAgIGlmIChiYXRjaC5udW1TcHJpdGVzID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmJhdGNoZXMucHVzaChiYXRjaClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGNvcHkgdmVydGljZXMgYW5kIGluZGljZXMgdG8gYXJyYXlzLCBncm93aW5nIGFycmF5cyBpZiByZXF1aXJlZFxyXG4gICAgICAgIGNvbnN0IG51bVZlcnRpY2VzID0gdGhpcy5zcHJpdGVzLmxlbmd0aCAqIDRcclxuICAgICAgICBjb25zdCBudW1WZXJ0ZXhFbGVtcyA9IG51bVZlcnRpY2VzICogZWxlbXNQZXJTcHJpdGVWZXJ0ZXhcclxuICAgICAgICBjb25zdCBlbGVtc1BlclNwcml0ZSA9IDQgKiBlbGVtc1BlclNwcml0ZVZlcnRleFxyXG4gICAgICAgIGlmICh0aGlzLnZlcnRpY2VzLmxlbmd0aCA8IG51bVZlcnRleEVsZW1zKSB7XHJcbiAgICAgICAgICAgIHRoaXMudmVydGljZXMgPSBuZXcgRmxvYXQzMkFycmF5KG51bVZlcnRleEVsZW1zKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbnVtSW5kaWNlcyA9IHRoaXMuc3ByaXRlcy5sZW5ndGggKiA2XHJcbiAgICAgICAgaWYgKHRoaXMuaW5kaWNlcy5sZW5ndGggPCBudW1JbmRpY2VzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlcyA9IG5ldyBVaW50MTZBcnJheShudW1JbmRpY2VzKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNwcml0ZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3Qgc3ByaXRlID0gdGhpcy5zcHJpdGVzW2ldXHJcbiAgICAgICAgICAgIGxldCBlbGVtT2Zmc2V0ID0gaSAqIGVsZW1zUGVyU3ByaXRlXHJcbiAgICAgICAgICAgIGxldCBpbmRleE9mZnNldCA9IGkgKiA2XHJcbiAgICAgICAgICAgIGxldCBiYXNlSW5kZXggPSBpICogNFxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoVmVydGV4KGVsZW1PZmZzZXQsIHNwcml0ZS5wb3NpdGlvbi54LCBzcHJpdGUucG9zaXRpb24ueSwgMCwgMCwgc3ByaXRlLmxheWVyLCBzcHJpdGUuY29sb3JbMF0sIHNwcml0ZS5jb2xvclsxXSwgc3ByaXRlLmNvbG9yWzJdLCBzcHJpdGUuY29sb3JbM10pXHJcbiAgICAgICAgICAgIGVsZW1PZmZzZXQgKz0gZWxlbXNQZXJTcHJpdGVWZXJ0ZXhcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFZlcnRleChlbGVtT2Zmc2V0LCBzcHJpdGUucG9zaXRpb24ueCwgc3ByaXRlLnBvc2l0aW9uLnkgKyBzcHJpdGUuaGVpZ2h0LCAwLCAxLCBzcHJpdGUubGF5ZXIsIHNwcml0ZS5jb2xvclswXSwgc3ByaXRlLmNvbG9yWzFdLCBzcHJpdGUuY29sb3JbMl0sIHNwcml0ZS5jb2xvclszXSlcclxuICAgICAgICAgICAgZWxlbU9mZnNldCArPSBlbGVtc1BlclNwcml0ZVZlcnRleFxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoVmVydGV4KGVsZW1PZmZzZXQsIHNwcml0ZS5wb3NpdGlvbi54ICsgc3ByaXRlLndpZHRoLCBzcHJpdGUucG9zaXRpb24ueSArIHNwcml0ZS5oZWlnaHQsIDEsIDEsIHNwcml0ZS5sYXllciwgc3ByaXRlLmNvbG9yWzBdLCBzcHJpdGUuY29sb3JbMV0sIHNwcml0ZS5jb2xvclsyXSwgc3ByaXRlLmNvbG9yWzNdKVxyXG4gICAgICAgICAgICBlbGVtT2Zmc2V0ICs9IGVsZW1zUGVyU3ByaXRlVmVydGV4XHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hWZXJ0ZXgoZWxlbU9mZnNldCwgc3ByaXRlLnBvc2l0aW9uLnggKyBzcHJpdGUud2lkdGgsIHNwcml0ZS5wb3NpdGlvbi55LCAxLCAwLCBzcHJpdGUubGF5ZXIsIHNwcml0ZS5jb2xvclswXSwgc3ByaXRlLmNvbG9yWzFdLCBzcHJpdGUuY29sb3JbMl0sIHNwcml0ZS5jb2xvclszXSlcclxuICAgICAgICAgICAgZWxlbU9mZnNldCArPSBlbGVtc1BlclNwcml0ZVZlcnRleFxyXG5cclxuICAgICAgICAgICAgdGhpcy5pbmRpY2VzW2luZGV4T2Zmc2V0XSA9IGJhc2VJbmRleFxyXG4gICAgICAgICAgICB0aGlzLmluZGljZXNbaW5kZXhPZmZzZXQgKyAxXSA9IGJhc2VJbmRleCArIDFcclxuICAgICAgICAgICAgdGhpcy5pbmRpY2VzW2luZGV4T2Zmc2V0ICsgMl0gPSBiYXNlSW5kZXggKyAyXHJcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlc1tpbmRleE9mZnNldCArIDNdID0gYmFzZUluZGV4XHJcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlc1tpbmRleE9mZnNldCArIDRdID0gYmFzZUluZGV4ICsgMlxyXG4gICAgICAgICAgICB0aGlzLmluZGljZXNbaW5kZXhPZmZzZXQgKyA1XSA9IGJhc2VJbmRleCArIDNcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHRyYW5zZmVyIHZlcnRpY2VzIGFuZCBpbmRpY2VzIHRvIEdQVVxyXG4gICAgICAgIGNvbnN0IGdsID0gdGhpcy5nbFxyXG4gICAgICAgIGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnZlcnRleEJ1ZmZlcilcclxuICAgICAgICBnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy52ZXJ0aWNlcy5zdWJhcnJheSgwLCB0aGlzLnNwcml0ZXMubGVuZ3RoICogNCAqIGVsZW1zUGVyU3ByaXRlKSwgZ2wuRFlOQU1JQ19EUkFXKVxyXG4gICAgICAgIGdsLmJpbmRCdWZmZXIoZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIHRoaXMuaW5kZXhCdWZmZXIpXHJcbiAgICAgICAgZ2wuYnVmZmVyRGF0YShnbC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgdGhpcy5pbmRpY2VzLnN1YmFycmF5KDAsIHRoaXMuc3ByaXRlcy5sZW5ndGggKiA2KSwgZ2wuRFlOQU1JQ19EUkFXKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd1NoYWRvd3MoKSB7XHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcbiAgICAgICAgZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLnNoYWRvd01hcEZyYW1lYnVmZmVyKVxyXG4gICAgICAgIGdsLmJpbmRWZXJ0ZXhBcnJheSh0aGlzLnNoYWRvd1ZhbylcclxuICAgICAgICBnbC52aWV3cG9ydCgwLCAwLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgZ2wuY2xlYXJDb2xvcigwLCAwLCAwLCAwKVxyXG4gICAgICAgIGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpXHJcbiAgICAgICAgZ2wudXNlUHJvZ3JhbSh0aGlzLnNoYWRvd1Byb2dyYW0pXHJcbiAgICAgICAgZ2wudW5pZm9ybTJmKHRoaXMuc2hhZG93Vmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgZ2wuYmluZFZlcnRleEFycmF5KHRoaXMuc2hhZG93VmFvKVxyXG5cclxuICAgICAgICAvLyBkcmF3IGVhY2ggZm9yXHJcbiAgICAgICAgZ2wuZHJhd0VsZW1lbnRzKGdsLlRSSUFOR0xFUywgdGhpcy5zcHJpdGVzLmxlbmd0aCAqIDYsIGdsLlVOU0lHTkVEX1NIT1JULCAwKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd1Nwcml0ZXMobGlnaHRSYWRpdXM6IG51bWJlcikge1xyXG4gICAgICAgIC8vIGRyYXcgdGhlIHNwcml0ZXNcclxuICAgICAgICBjb25zdCBnbCA9IHRoaXMuZ2xcclxuICAgICAgICBnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpXHJcbiAgICAgICAgZ2wuYmluZFZlcnRleEFycmF5KHRoaXMuc3ByaXRlVmFvKVxyXG4gICAgICAgIGdsLnZpZXdwb3J0KDAsIDAsIGdsLmRyYXdpbmdCdWZmZXJXaWR0aCwgZ2wuZHJhd2luZ0J1ZmZlckhlaWdodClcclxuICAgICAgICBnbC5jbGVhckNvbG9yKDAsIDAsIDAsIDEpXHJcbiAgICAgICAgZ2wuY2xlYXIoZ2wuQ09MT1JfQlVGRkVSX0JJVClcclxuICAgICAgICBnbC51c2VQcm9ncmFtKHRoaXMuc3ByaXRlUHJvZ3JhbSlcclxuICAgICAgICBnbC51bmlmb3JtMmYodGhpcy5zcHJpdGVWaWV3cG9ydFNpemVVbmlmb3JtTG9jYXRpb24sIGdsLmRyYXdpbmdCdWZmZXJXaWR0aCwgZ2wuZHJhd2luZ0J1ZmZlckhlaWdodClcclxuICAgICAgICBnbC51bmlmb3JtMWYodGhpcy5zcHJpdGVMaWdodFJhZGl1c1VuaWZvcm1Mb2NhdGlvbiwgbGlnaHRSYWRpdXMpXHJcbiAgICAgICAgZ2wuYmluZFZlcnRleEFycmF5KHRoaXMuc3ByaXRlVmFvKVxyXG5cclxuICAgICAgICBnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwKVxyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkRfQVJSQVksIG51bGwpXHJcbiAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgbnVsbClcclxuICAgICAgICBnbC5iaW5kU2FtcGxlcigwLCB0aGlzLnNhbXBsZXIpXHJcblxyXG4gICAgICAgIGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTEpXHJcbiAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgbnVsbClcclxuICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKVxyXG4gICAgICAgIGdsLmJpbmRTYW1wbGVyKDEsIHRoaXMuc2FtcGxlcilcclxuXHJcbiAgICAgICAgZ2wudW5pZm9ybTFpKHRoaXMuc3ByaXRlU2FtcGxlclVuaWZvcm1Mb2NhdGlvbiwgMClcclxuICAgICAgICBnbC51bmlmb3JtMWkodGhpcy5zcHJpdGVBcnJheVNhbXBsZXJVbmlmb3JtTG9jYXRpb24sIDEpXHJcblxyXG4gICAgICAgIC8vIGRyYXcgZWFjaCBiYXRjaFxyXG4gICAgICAgIGZvciAoY29uc3QgYmF0Y2ggb2YgdGhpcy5iYXRjaGVzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVzZUFycmF5VGV4dHVyZSA9IGJhdGNoLmZsYWdzICYgU3ByaXRlRmxhZ3MuQXJyYXlUZXh0dXJlID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgICAgICAgIGNvbnN0IHRleHR1cmUgPSBiYXRjaC50ZXh0dXJlPy50ZXh0dXJlID8/IG51bGxcclxuXHJcbiAgICAgICAgICAgIGlmICh1c2VBcnJheVRleHR1cmUpIHtcclxuICAgICAgICAgICAgICAgIGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTEpXHJcbiAgICAgICAgICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJEX0FSUkFZLCB0ZXh0dXJlKVxyXG5cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTApXHJcbiAgICAgICAgICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0ZXh0dXJlKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBnbC51bmlmb3JtMWkodGhpcy5zcHJpdGVMaXRVbmlmb3JtTG9jYXRpb24sIGJhdGNoLmZsYWdzICYgU3ByaXRlRmxhZ3MuTGl0ID8gMSA6IDApXHJcbiAgICAgICAgICAgIGdsLnVuaWZvcm0xaSh0aGlzLnNwcml0ZVVzZUFycmF5VGV4dHVyZVVuaWZvcm1Mb2NhdGlvbiwgdXNlQXJyYXlUZXh0dXJlID8gMSA6IDApXHJcbiAgICAgICAgICAgIGdsLmRyYXdFbGVtZW50cyhnbC5UUklBTkdMRVMsIGJhdGNoLm51bVNwcml0ZXMgKiA2LCBnbC5VTlNJR05FRF9TSE9SVCwgYmF0Y2gub2Zmc2V0ICogNiAqIDIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd1NoYWRvd1RleHR1cmUoKSB7XHJcbiAgICAgICAgLy8gY29uc3QgZ2wgPSB0aGlzLmdsXHJcbiAgICAgICAgLy8gZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBudWxsKVxyXG4gICAgICAgIC8vIGdsLmJpbmRWZXJ0ZXhBcnJheSh0aGlzLnNwcml0ZVZhbylcclxuICAgICAgICAvLyBnbC52aWV3cG9ydCgwLCAwLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgLy8gZ2wuY2xlYXJDb2xvcigwLCAwLCAwLCAxKVxyXG4gICAgICAgIC8vIGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpXHJcbiAgICAgICAgLy8gZ2wudXNlUHJvZ3JhbSh0aGlzLnNwcml0ZVByb2dyYW0pXHJcbiAgICAgICAgLy8gZ2wudW5pZm9ybTJmKHRoaXMuc3ByaXRlVmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgLy8gZ2wudW5pZm9ybTFmKHRoaXMuc3ByaXRlTGlnaHRSYWRpdXNVbmlmb3JtTG9jYXRpb24sIGxpZ2h0UmFkaXVzKVxyXG4gICAgICAgIC8vIGdsLmJpbmRWZXJ0ZXhBcnJheSh0aGlzLnNwcml0ZVZhbylcclxuXHJcbiAgICAgICAgLy8gLy8gZHJhdyBlYWNoIGJhdGNoXHJcbiAgICAgICAgLy8gZm9yIChjb25zdCBbdGV4dHVyZSwgYmF0Y2hdIG9mIHRoaXMuYmF0Y2hlcykge1xyXG4gICAgICAgIC8vICAgICBnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwKVxyXG4gICAgICAgIC8vICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJEX0FSUkFZLCB0ZXh0dXJlKVxyXG4gICAgICAgIC8vICAgICBnbC5iaW5kU2FtcGxlcigwLCB0aGlzLnNhbXBsZXIpXHJcbiAgICAgICAgLy8gICAgIGdsLnVuaWZvcm0xaSh0aGlzLnNhbXBsZXJVbmlmb3JtTG9jYXRpb24sIDApXHJcbiAgICAgICAgLy8gICAgIGdsLmRyYXdFbGVtZW50cyhnbC5UUklBTkdMRVMsIGJhdGNoLnNwcml0ZXMubGVuZ3RoICogNiwgZ2wuVU5TSUdORURfU0hPUlQsIDApXHJcbiAgICAgICAgLy8gfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHVzaFZlcnRleChvZmZzZXQ6IG51bWJlciwgeDogbnVtYmVyLCB5OiBudW1iZXIsIHU6IG51bWJlciwgdjogbnVtYmVyLCB3OiBudW1iZXIsIHI6IG51bWJlciwgZzogbnVtYmVyLCBiOiBudW1iZXIsIGE6IG51bWJlcikge1xyXG4gICAgICAgIC8vIHBvc2l0aW9uXHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXRdID0geFxyXG4gICAgICAgIHRoaXMudmVydGljZXNbb2Zmc2V0ICsgMV0gPSB5XHJcbiAgICAgICAgLy8gdXZcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW29mZnNldCArIDJdID0gdVxyXG4gICAgICAgIHRoaXMudmVydGljZXNbb2Zmc2V0ICsgM10gPSB2XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXQgKyA0XSA9IHdcclxuICAgICAgICAvLyBjb2xvclxyXG4gICAgICAgIHRoaXMudmVydGljZXNbb2Zmc2V0ICsgNV0gPSByXHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXQgKyA2XSA9IGdcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW29mZnNldCArIDddID0gYlxyXG4gICAgICAgIHRoaXMudmVydGljZXNbb2Zmc2V0ICsgOF0gPSBhXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjaGVja1Jlc2l6ZSgpIHtcclxuICAgICAgICBjb25zdCBjYW52YXMgPSB0aGlzLmNhbnZhc1xyXG4gICAgICAgIGlmIChjYW52YXMud2lkdGggIT09IGNhbnZhcy5jbGllbnRXaWR0aCAmJiBjYW52YXMuaGVpZ2h0ICE9PSBjYW52YXMuY2xpZW50SGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgICAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGNhbnZhcy53aWR0aCA9PT0gdGhpcy52aWV3cG9ydFdpZHRoICYmIGNhbnZhcy5oZWlnaHQgPT09IHRoaXMudmlld3BvcnRIZWlnaHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmdsLmRlbGV0ZVRleHR1cmUodGhpcy5zaGFkb3dNYXBUZXh0dXJlKVxyXG4gICAgICAgIHRoaXMuZ2wuZGVsZXRlRnJhbWVidWZmZXIodGhpcy5zaGFkb3dNYXBGcmFtZWJ1ZmZlcilcclxuICAgICAgICB0aGlzLnNoYWRvd01hcFRleHR1cmUgPSBjcmVhdGVTaGFkb3dNYXBUZXh0dXJlKHRoaXMuZ2wsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodClcclxuICAgICAgICB0aGlzLnNoYWRvd01hcEZyYW1lYnVmZmVyID0gY3JlYXRlU2hhZG93TWFwRnJhbWVidWZmZXIodGhpcy5nbCwgdGhpcy5zaGFkb3dNYXBUZXh0dXJlKVxyXG4gICAgICAgIHRoaXMudmlld3BvcnRXaWR0aCA9IGNhbnZhcy53aWR0aFxyXG4gICAgICAgIHRoaXMudmlld3BvcnRIZWlnaHQgPSBjYW52YXMuaGVpZ2h0XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVNwcml0ZVZhbyhcclxuICAgIGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LFxyXG4gICAgcHJvZ3JhbTogV2ViR0xQcm9ncmFtLFxyXG4gICAgdmVydGV4QnVmZmVyOiBXZWJHTEJ1ZmZlcixcclxuICAgIGluZGV4QnVmZmVyOiBXZWJHTEJ1ZmZlcik6IFdlYkdMVmVydGV4QXJyYXlPYmplY3Qge1xyXG4gICAgY29uc3QgdmFvID0gZ2x1LmNyZWF0ZVZlcnRleEFycmF5KGdsKVxyXG4gICAgZ2wuYmluZFZlcnRleEFycmF5KHZhbylcclxuXHJcbiAgICBjb25zdCBwb3NpdGlvbkF0dHJpYklkeCA9IGdsdS5nZXRBdHRyaWJMb2NhdGlvbihnbCwgcHJvZ3JhbSwgXCJpbl9wb3NpdGlvblwiKVxyXG4gICAgY29uc3QgdXZ3QXR0cmliSWR4ID0gZ2x1LmdldEF0dHJpYkxvY2F0aW9uKGdsLCBwcm9ncmFtLCBcImluX3V2d1wiKVxyXG4gICAgY29uc3QgY29sb3JBdHRyaWJJZHggPSBnbHUuZ2V0QXR0cmliTG9jYXRpb24oZ2wsIHByb2dyYW0sIFwiaW5fY29sb3JcIilcclxuICAgIGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB2ZXJ0ZXhCdWZmZXIpXHJcbiAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShwb3NpdGlvbkF0dHJpYklkeClcclxuICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHV2d0F0dHJpYklkeClcclxuICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KGNvbG9yQXR0cmliSWR4KVxyXG4gICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcihwb3NpdGlvbkF0dHJpYklkeCwgMiwgZ2wuRkxPQVQsIGZhbHNlLCBzcHJpdGVWZXJ0ZXhTdHJpZGUsIDApXHJcbiAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHV2d0F0dHJpYklkeCwgMywgZ2wuRkxPQVQsIGZhbHNlLCBzcHJpdGVWZXJ0ZXhTdHJpZGUsIDgpXHJcbiAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKGNvbG9yQXR0cmliSWR4LCA0LCBnbC5GTE9BVCwgZmFsc2UsIHNwcml0ZVZlcnRleFN0cmlkZSwgMjApXHJcbiAgICBnbC5iaW5kQnVmZmVyKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCBpbmRleEJ1ZmZlcilcclxuICAgIHJldHVybiB2YW9cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlU2hhZG93VmFvKFxyXG4gICAgZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQsXHJcbiAgICBwcm9ncmFtOiBXZWJHTFByb2dyYW0sXHJcbiAgICB2ZXJ0ZXhCdWZmZXI6IFdlYkdMQnVmZmVyLFxyXG4gICAgaW5kZXhCdWZmZXI6IFdlYkdMQnVmZmVyKTogV2ViR0xWZXJ0ZXhBcnJheU9iamVjdCB7XHJcbiAgICBjb25zdCB2YW8gPSBnbHUuY3JlYXRlVmVydGV4QXJyYXkoZ2wpXHJcbiAgICBnbC5iaW5kVmVydGV4QXJyYXkodmFvKVxyXG5cclxuICAgIGNvbnN0IHBvc2l0aW9uQXR0cmliSWR4ID0gZ2x1LmdldEF0dHJpYkxvY2F0aW9uKGdsLCBwcm9ncmFtLCBcImluX3Bvc2l0aW9uXCIpXHJcbiAgICBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdmVydGV4QnVmZmVyKVxyXG4gICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkocG9zaXRpb25BdHRyaWJJZHgpXHJcbiAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHBvc2l0aW9uQXR0cmliSWR4LCAyLCBnbC5GTE9BVCwgZmFsc2UsIHNwcml0ZVZlcnRleFN0cmlkZSwgMClcclxuICAgIGdsLmJpbmRCdWZmZXIoZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIGluZGV4QnVmZmVyKVxyXG4gICAgcmV0dXJuIHZhb1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVTaGFkb3dNYXBUZXh0dXJlKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFdlYkdMVGV4dHVyZSB7XHJcbiAgICBjb25zdCB0ZXh0dXJlID0gZ2x1LmNyZWF0ZVRleHR1cmUoZ2wpXHJcbiAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0ZXh0dXJlKVxyXG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSk7XHJcbiAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcclxuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5MSU5FQVIpO1xyXG4gICAgZ2wudGV4SW1hZ2UyRChnbC5URVhUVVJFXzJELCAwLCBnbC5SR0JBOCwgd2lkdGgsIGhlaWdodCwgMCwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgbnVsbClcclxuICAgIHJldHVybiB0ZXh0dXJlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVNoYWRvd01hcEZyYW1lYnVmZmVyKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LCB0ZXh0dXJlOiBXZWJHTFRleHR1cmUpOiBXZWJHTEZyYW1lYnVmZmVyIHtcclxuICAgIGNvbnN0IGZiID0gZ2x1LmNyZWF0ZUZyYW1lYnVmZmVyKGdsKVxyXG4gICAgZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBmYilcclxuICAgIGdsLmZyYW1lYnVmZmVyVGV4dHVyZTJEKGdsLkZSQU1FQlVGRkVSLCBnbC5DT0xPUl9BVFRBQ0hNRU5UMCwgZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZSwgMClcclxuICAgIHJldHVybiBmYlxyXG59Il19