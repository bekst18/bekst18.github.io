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
precision highp sampler2DArray;

uniform bool lit;
uniform bool array_texture;
uniform mediump vec2 viewport_size;
uniform float light_radius;
uniform sampler2DArray sampler;

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

    if (array_texture) {
        out_color *= texture(sampler, frag_uvw);
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
    constructor(options) {
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
        this.spriteArrayTextureUniformLocation = glu.getUniformLocation(gl, this.spriteProgram, "array_texture");
        this.spriteSamplerUniformLocation = glu.getUniformLocation(gl, this.spriteProgram, "sampler");
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
    drawSprite(sprite) {
        // add sprite to array
        this.sprites.push(sprite);
    }
    flush(lightRadius) {
        this.checkResize();
        this.batchSprites();
        this.drawSprites(lightRadius);
        this.drawShadows();
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
        // draw each batch
        for (const batch of this.batches) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D_ARRAY, (_b = (_a = batch.texture) === null || _a === void 0 ? void 0 : _a.texture) !== null && _b !== void 0 ? _b : null);
            gl.bindSampler(0, this.sampler);
            gl.uniform1i(this.spriteSamplerUniformLocation, 0);
            gl.uniform1i(this.spriteLitUniformLocation, batch.flags & SpriteFlags.Lit ? 1 : 0);
            gl.uniform1i(this.spriteArrayTextureUniformLocation, batch.flags & SpriteFlags.ArrayTexture ? 1 : 0);
            gl.drawElements(gl.TRIANGLES, batch.numSprites * 6, gl.UNSIGNED_SHORT, batch.offset * 6);
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
    console.log("NEW SHADOW MAP");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2Z4LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2Z4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0gsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBSXpDLE1BQU0sZUFBZSxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBbUJ0QixDQUFBO0FBRUYsTUFBTSxpQkFBaUIsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBaUN4QixDQUFBO0FBRUYsTUFBTSxlQUFlLEdBQUc7Ozs7Ozs7Ozs7Ozs7OztFQWV0QixDQUFBO0FBRUYsTUFBTSxpQkFBaUIsR0FBRzs7Ozs7Ozs7Ozs7Ozs7O0NBZXpCLENBQUE7QUFFRCxNQUFNLENBQU4sSUFBWSxXQUlYO0FBSkQsV0FBWSxXQUFXO0lBQ25CLDZDQUFRLENBQUE7SUFDUiwyQ0FBWSxDQUFBO0lBQ1osNkRBQXFCLENBQUE7QUFDekIsQ0FBQyxFQUpXLFdBQVcsS0FBWCxXQUFXLFFBSXRCO0FBaUJELE1BQU0sT0FBTyxNQUFNO0lBU2YsWUFBWSxPQUFzQjtRQVIzQixhQUFRLEdBQWMsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QyxVQUFLLEdBQVcsQ0FBQyxDQUFBO1FBQ2pCLFdBQU0sR0FBVyxDQUFDLENBQUE7UUFDbEIsVUFBSyxHQUFXLENBQUMsQ0FBQTtRQUNqQixVQUFLLEdBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzQixZQUFPLEdBQW1CLElBQUksQ0FBQTtRQUM5QixVQUFLLEdBQWdCLFdBQVcsQ0FBQyxJQUFJLENBQUE7UUFHeEMsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO1lBQ2xCLElBQUks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TSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6SixVQUFVLElBQUksb0JBQW9CLENBQUE7WUFFbEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pLLFVBQVUsSUFBSSxvQkFBb0IsQ0FBQTtZQUVsQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN4TCxVQUFVLElBQUksb0JBQW9CLENBQUE7WUFFbEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssRUFBRSxN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QUFFLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzVGLE9BQU8sT0FBTyxDQUFBO0FBQ2xCLENBQUM7QUFFRCxTQUFTLDBCQUEwQixDQUFDLEVBQTBCLEVBQUUsT0FBcUI7SUFDakYsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ3BDLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUN0QyxFQUFFLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDeEYsT0FBTyxFQUFFLENBQUE7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIHdlYiBnbCBzcHJpdGUgcmVuZGVyaW5nIHV0aWxpdGllc1xyXG4gKi9cclxuaW1wb3J0ICogYXMgZ2x1IGZyb20gXCIuL2dsdS5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tIFwiLi4vc2hhcmVkL3V0aWwuanNcIlxyXG5cclxuZXhwb3J0IHR5cGUgQ29sb3IgPSBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXVxyXG5cclxuY29uc3Qgc3ByaXRlVmVydGV4U3JjID0gYCN2ZXJzaW9uIDMwMCBlc1xyXG5wcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcclxuXHJcbnVuaWZvcm0gdmVjMiB2aWV3cG9ydF9zaXplO1xyXG5cclxuaW4gdmVjMiBpbl9wb3NpdGlvbjtcclxuaW4gdmVjMyBpbl91dnc7XHJcbmluIHZlYzQgaW5fY29sb3I7XHJcblxyXG5vdXQgdmVjMiBmcmFnX3Bvc2l0aW9uO1xyXG5vdXQgdmVjNCBmcmFnX2NvbG9yO1xyXG5vdXQgdmVjMyBmcmFnX3V2dztcclxuXHJcbnZvaWQgbWFpbigpIHtcclxuICAgIGZyYWdfdXZ3ID0gaW5fdXZ3O1xyXG4gICAgZnJhZ19jb2xvciA9IGluX2NvbG9yO1xyXG4gICAgZnJhZ19wb3NpdGlvbiA9IGluX3Bvc2l0aW9uO1xyXG4gICAgdmVjMiBwb3NpdGlvbiA9IHZlYzIoaW5fcG9zaXRpb24ueCAvIHZpZXdwb3J0X3NpemUueCAqIDIuZiAtIDEuZiwgLWluX3Bvc2l0aW9uLnkgLyB2aWV3cG9ydF9zaXplLnkgKiAyLmYgKyAxLmYpO1xyXG4gICAgZ2xfUG9zaXRpb24gPSB2ZWM0KHBvc2l0aW9uLCAwLCAxKTtcclxufWBcclxuXHJcbmNvbnN0IHNwcml0ZUZyYWdtZW50U3JjID0gYCN2ZXJzaW9uIDMwMCBlc1xyXG5wcmVjaXNpb24gaGlnaHAgZmxvYXQ7XHJcbnByZWNpc2lvbiBoaWdocCBzYW1wbGVyMkRBcnJheTtcclxuXHJcbnVuaWZvcm0gYm9vbCBsaXQ7XHJcbnVuaWZvcm0gYm9vbCBhcnJheV90ZXh0dXJlO1xyXG51bmlmb3JtIG1lZGl1bXAgdmVjMiB2aWV3cG9ydF9zaXplO1xyXG51bmlmb3JtIGZsb2F0IGxpZ2h0X3JhZGl1cztcclxudW5pZm9ybSBzYW1wbGVyMkRBcnJheSBzYW1wbGVyO1xyXG5cclxuaW4gdmVjMiBmcmFnX3Bvc2l0aW9uO1xyXG5pbiB2ZWM0IGZyYWdfY29sb3I7XHJcbmluIHZlYzMgZnJhZ191dnc7XHJcblxyXG5vdXQgdmVjNCBvdXRfY29sb3I7XHJcblxyXG52b2lkIG1haW4oKSB7XHJcbiAgICBmbG9hdCBsID0gMS5mO1xyXG4gICAgaWYgKGxpdCkge1xyXG4gICAgICAgIC8vIGNhbGN1bGF0ZSBkaXN0YW5jZSBmcm9tIGxpZ2h0XHJcbiAgICAgICAgZmxvYXQgZCA9IGxlbmd0aChmcmFnX3Bvc2l0aW9uIC0gdmlld3BvcnRfc2l6ZSAvIDIuZik7XHJcblxyXG4gICAgICAgIC8vIGNhbGN1bGF0ZSBsaWdodCBhbW91bnQgKGZ1bGwgZnJvbSAwIHRvIGxpZ2h0IHJhZGl1cywgbGVycCBmcm9tIGxpZ2h0X3JhZGl1cyB0byAyICogbGlnaHRfcmFkaXVzKVxyXG4gICAgICAgIGwgPSBtaXgoMS5mLCAwLmYsIGQgLyBsaWdodF9yYWRpdXMpO1xyXG4gICAgfVxyXG5cclxuICAgIG91dF9jb2xvciA9IGZyYWdfY29sb3I7XHJcblxyXG4gICAgaWYgKGFycmF5X3RleHR1cmUpIHtcclxuICAgICAgICBvdXRfY29sb3IgKj0gdGV4dHVyZShzYW1wbGVyLCBmcmFnX3V2dyk7XHJcbiAgICB9XHJcblxyXG4gICAgb3V0X2NvbG9yICo9IHZlYzQobCwgbCwgbCwgMSk7XHJcbn1gXHJcblxyXG5jb25zdCBzaGFkb3dWZXJ0ZXhTcmMgPSBgI3ZlcnNpb24gMzAwIGVzXHJcbnByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1xyXG5cclxudW5pZm9ybSB2ZWMyIHZpZXdwb3J0X3NpemU7XHJcblxyXG5pbiB2ZWMyIGluX3Bvc2l0aW9uO1xyXG5cclxub3V0IHZlYzIgZnJhZ19wb3NpdGlvbjtcclxub3V0IHZlYzQgZnJhZ19jb2xvcjtcclxub3V0IHZlYzMgZnJhZ191dnc7XHJcblxyXG52b2lkIG1haW4oKSB7XHJcbiAgICBmcmFnX3Bvc2l0aW9uID0gaW5fcG9zaXRpb247XHJcbiAgICB2ZWMyIHBvc2l0aW9uID0gdmVjMihpbl9wb3NpdGlvbi54IC8gdmlld3BvcnRfc2l6ZS54ICogMi5mIC0gMS5mLCAtaW5fcG9zaXRpb24ueSAvIHZpZXdwb3J0X3NpemUueSAqIDIuZiArIDEuZik7XHJcbiAgICBnbF9Qb3NpdGlvbiA9IHZlYzQocG9zaXRpb24sIDAsIDEpO1xyXG59YFxyXG5cclxuY29uc3Qgc2hhZG93RnJhZ21lbnRTcmMgPSBgI3ZlcnNpb24gMzAwIGVzXHJcbnByZWNpc2lvbiBoaWdocCBmbG9hdDtcclxucHJlY2lzaW9uIGhpZ2hwIHNhbXBsZXIyREFycmF5O1xyXG5cclxudW5pZm9ybSBtZWRpdW1wIHZlYzIgdmlld3BvcnRfc2l6ZTtcclxuXHJcbmluIHZlYzIgZnJhZ19wb3NpdGlvbjtcclxuXHJcbm91dCBmbG9hdCBvdXRfY29sb3I7XHJcblxyXG52b2lkIG1haW4oKSB7XHJcbiAgICAvLyBjYWxjdWxhdGUgZGlzdGFuY2UgZnJvbSBsaWdodFxyXG4gICAgZmxvYXQgZCA9IGxlbmd0aChmcmFnX3Bvc2l0aW9uIC0gdmlld3BvcnRfc2l6ZSAvIDIuZik7XHJcbiAgICBvdXRfY29sb3IgPSBkO1xyXG59XHJcbmBcclxuXHJcbmV4cG9ydCBlbnVtIFNwcml0ZUZsYWdzIHtcclxuICAgIE5vbmUgPSAwLFxyXG4gICAgTGl0ID0gMSA8PCAwLFxyXG4gICAgQXJyYXlUZXh0dXJlID0gMSA8PCAxLFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRleHR1cmUge1xyXG4gICAgaWQ6IG51bWJlclxyXG4gICAgdGV4dHVyZTogV2ViR0xUZXh0dXJlXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU3ByaXRlT3B0aW9ucyB7XHJcbiAgICBwb3NpdGlvbj86IGdlby5Qb2ludFxyXG4gICAgd2lkdGg/OiBudW1iZXJcclxuICAgIGhlaWdodD86IG51bWJlclxyXG4gICAgbGF5ZXI/OiBudW1iZXJcclxuICAgIGNvbG9yPzogQ29sb3JcclxuICAgIHRleHR1cmU/OiBUZXh0dXJlIHwgbnVsbFxyXG4gICAgZmxhZ3M/OiBTcHJpdGVGbGFnc1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU3ByaXRlIHtcclxuICAgIHB1YmxpYyBwb3NpdGlvbjogZ2VvLlBvaW50ID0gbmV3IGdlby5Qb2ludCgwLCAwKVxyXG4gICAgcHVibGljIHdpZHRoOiBudW1iZXIgPSAwXHJcbiAgICBwdWJsaWMgaGVpZ2h0OiBudW1iZXIgPSAwXHJcbiAgICBwdWJsaWMgbGF5ZXI6IG51bWJlciA9IDBcclxuICAgIHB1YmxpYyBjb2xvcjogQ29sb3IgPSBbMSwgMSwgMSwgMV1cclxuICAgIHB1YmxpYyB0ZXh0dXJlOiBUZXh0dXJlIHwgbnVsbCA9IG51bGxcclxuICAgIHB1YmxpYyBmbGFnczogU3ByaXRlRmxhZ3MgPSBTcHJpdGVGbGFncy5Ob25lXHJcblxyXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogU3ByaXRlT3B0aW9ucykge1xyXG4gICAgICAgIGlmIChvcHRpb25zLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy53aWR0aCkge1xyXG4gICAgICAgICAgICB0aGlzLndpZHRoID0gb3B0aW9ucy53aWR0aFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmxheWVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGF5ZXIgPSBvcHRpb25zLmxheWVyXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5jb2xvcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvbG9yID0gb3B0aW9ucy5jb2xvclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMudGV4dHVyZSkge1xyXG4gICAgICAgICAgICB0aGlzLnRleHR1cmUgPSBvcHRpb25zLnRleHR1cmVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmZsYWdzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmxhZ3MgPSBvcHRpb25zLmZsYWdzXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jb25zdCBlbGVtc1BlclNwcml0ZVZlcnRleCA9IDlcclxuY29uc3Qgc3ByaXRlVmVydGV4U3RyaWRlID0gZWxlbXNQZXJTcHJpdGVWZXJ0ZXggKiA0XHJcblxyXG5pbnRlcmZhY2UgU3ByaXRlQmF0Y2gge1xyXG4gICAgdGV4dHVyZTogVGV4dHVyZSB8IG51bGxcclxuICAgIGZsYWdzOiBTcHJpdGVGbGFnc1xyXG4gICAgb2Zmc2V0OiBudW1iZXJcclxuICAgIG51bVNwcml0ZXM6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUmVuZGVyZXIge1xyXG4gICAgLy8gdmVydGV4IGxheW91dDpcclxuICAgIC8vIHh5IHV2dyByZ2JhIChhbGwgZmxvYXQzMilcclxuICAgIHB1YmxpYyByZWFkb25seSBnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzaGFkb3dQcm9ncmFtOiBXZWJHTFByb2dyYW1cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlUHJvZ3JhbTogV2ViR0xQcm9ncmFtXHJcbiAgICBwcml2YXRlIHNoYWRvd01hcFRleHR1cmU6IFdlYkdMVGV4dHVyZVxyXG4gICAgcHJpdmF0ZSBzaGFkb3dNYXBGcmFtZWJ1ZmZlcjogV2ViR0xGcmFtZWJ1ZmZlclxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzcHJpdGVMaXRVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNwcml0ZUFycmF5VGV4dHVyZVVuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb25cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlU2FtcGxlclVuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb25cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlVmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvblxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzcHJpdGVMaWdodFJhZGl1c1VuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb25cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2hhZG93Vmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvblxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzYW1wbGVyOiBXZWJHTFNhbXBsZXJcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdmVydGV4QnVmZmVyOiBXZWJHTEJ1ZmZlclxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbmRleEJ1ZmZlcjogV2ViR0xCdWZmZXJcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlVmFvOiBXZWJHTFZlcnRleEFycmF5T2JqZWN0XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNoYWRvd1ZhbzogV2ViR0xWZXJ0ZXhBcnJheU9iamVjdFxyXG4gICAgcHJpdmF0ZSBzcHJpdGVzOiBTcHJpdGVbXSA9IFtdXHJcbiAgICBwcml2YXRlIGJhdGNoZXM6IFNwcml0ZUJhdGNoW10gPSBbXVxyXG4gICAgcHJpdmF0ZSB2ZXJ0aWNlczogRmxvYXQzMkFycmF5ID0gbmV3IEZsb2F0MzJBcnJheSgpXHJcbiAgICBwcml2YXRlIGluZGljZXM6IFVpbnQxNkFycmF5ID0gbmV3IFVpbnQxNkFycmF5KClcclxuICAgIHByaXZhdGUgdmlld3BvcnRXaWR0aDogbnVtYmVyXHJcbiAgICBwcml2YXRlIHZpZXdwb3J0SGVpZ2h0OiBudW1iZXJcclxuICAgIHByaXZhdGUgdGV4dHVyZUlkOiBudW1iZXIgPSAwXHJcblxyXG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZ2wgPSBnbHUuY3JlYXRlQ29udGV4dChjYW52YXMpXHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcblxyXG4gICAgICAgIHRoaXMuc2hhZG93UHJvZ3JhbSA9IGdsdS5jb21waWxlUHJvZ3JhbShnbCwgc2hhZG93VmVydGV4U3JjLCBzaGFkb3dGcmFnbWVudFNyYylcclxuICAgICAgICB0aGlzLnNoYWRvd01hcFRleHR1cmUgPSBjcmVhdGVTaGFkb3dNYXBUZXh0dXJlKGdsLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgdGhpcy5zaGFkb3dNYXBGcmFtZWJ1ZmZlciA9IGNyZWF0ZVNoYWRvd01hcEZyYW1lYnVmZmVyKGdsLCB0aGlzLnNoYWRvd01hcFRleHR1cmUpXHJcbiAgICAgICAgdGhpcy5zcHJpdGVQcm9ncmFtID0gZ2x1LmNvbXBpbGVQcm9ncmFtKGdsLCBzcHJpdGVWZXJ0ZXhTcmMsIHNwcml0ZUZyYWdtZW50U3JjKVxyXG5cclxuICAgICAgICB0aGlzLnNwcml0ZUxpdFVuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgXCJsaXRcIilcclxuICAgICAgICB0aGlzLnNwcml0ZUFycmF5VGV4dHVyZVVuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgXCJhcnJheV90ZXh0dXJlXCIpXHJcbiAgICAgICAgdGhpcy5zcHJpdGVTYW1wbGVyVW5pZm9ybUxvY2F0aW9uID0gZ2x1LmdldFVuaWZvcm1Mb2NhdGlvbihnbCwgdGhpcy5zcHJpdGVQcm9ncmFtLCBcInNhbXBsZXJcIilcclxuICAgICAgICB0aGlzLnNwcml0ZVZpZXdwb3J0U2l6ZVVuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgXCJ2aWV3cG9ydF9zaXplXCIpXHJcbiAgICAgICAgdGhpcy5zcHJpdGVMaWdodFJhZGl1c1VuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgXCJsaWdodF9yYWRpdXNcIilcclxuICAgICAgICB0aGlzLnNoYWRvd1ZpZXdwb3J0U2l6ZVVuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc2hhZG93UHJvZ3JhbSwgXCJ2aWV3cG9ydF9zaXplXCIpXHJcblxyXG4gICAgICAgIHRoaXMudmVydGV4QnVmZmVyID0gZ2x1LmNyZWF0ZUJ1ZmZlcihnbClcclxuICAgICAgICB0aGlzLmluZGV4QnVmZmVyID0gZ2x1LmNyZWF0ZUJ1ZmZlcihnbClcclxuICAgICAgICB0aGlzLnZpZXdwb3J0V2lkdGggPSBjYW52YXMud2lkdGhcclxuICAgICAgICB0aGlzLnZpZXdwb3J0SGVpZ2h0ID0gY2FudmFzLmhlaWdodFxyXG5cclxuICAgICAgICAvLyBzZXR1cCBzYW1wbGVyXHJcbiAgICAgICAgdGhpcy5zYW1wbGVyID0gZ2x1LmNyZWF0ZVNhbXBsZXIoZ2wpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLkxJTkVBUilcclxuICAgICAgICBnbC5zYW1wbGVyUGFyYW1ldGVyaSh0aGlzLnNhbXBsZXIsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTElORUFSX01JUE1BUF9MSU5FQVIpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX1dSQVBfUiwgZ2wuQ0xBTVBfVE9fRURHRSlcclxuICAgICAgICBnbC5zYW1wbGVyUGFyYW1ldGVyaSh0aGlzLnNhbXBsZXIsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKVxyXG4gICAgICAgIGdsLnNhbXBsZXJQYXJhbWV0ZXJpKHRoaXMuc2FtcGxlciwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpXHJcblxyXG4gICAgICAgIHRoaXMuc3ByaXRlVmFvID0gY3JlYXRlU3ByaXRlVmFvKHRoaXMuZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgdGhpcy52ZXJ0ZXhCdWZmZXIsIHRoaXMuaW5kZXhCdWZmZXIpXHJcbiAgICAgICAgdGhpcy5zaGFkb3dWYW8gPSBjcmVhdGVTaGFkb3dWYW8odGhpcy5nbCwgdGhpcy5zaGFkb3dQcm9ncmFtLCB0aGlzLnZlcnRleEJ1ZmZlciwgdGhpcy5pbmRleEJ1ZmZlcilcclxuICAgIH1cclxuXHJcbiAgICBiYWtlVGV4dHVyZUFycmF5KHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBpbWFnZXM6IFRleEltYWdlU291cmNlW10pOiBUZXh0dXJlIHtcclxuICAgICAgICAvLyBlYWNoIGltYWdlIG11c3QgYmUgdGhlIHNhbWUgc2l6ZVxyXG4gICAgICAgIGNvbnN0IGdsID0gdGhpcy5nbFxyXG4gICAgICAgIGNvbnN0IHRleHR1cmUgPSBnbHUuY3JlYXRlVGV4dHVyZShnbClcclxuICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJEX0FSUkFZLCB0ZXh0dXJlKVxyXG4gICAgICAgIGdsLnRleEltYWdlM0QoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgMCwgZ2wuUkdCQSwgd2lkdGgsIGhlaWdodCwgaW1hZ2VzLmxlbmd0aCwgMCwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgbnVsbClcclxuICAgICAgICBpbWFnZXMuZm9yRWFjaCgoaW1nLCBpKSA9PiB7XHJcbiAgICAgICAgICAgIGdsLnRleFN1YkltYWdlM0QoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgMCwgMCwgMCwgaSwgd2lkdGgsIGhlaWdodCwgMSwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgaW1nKVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGdsLmdlbmVyYXRlTWlwbWFwKGdsLlRFWFRVUkVfMkRfQVJSQVkpXHJcbiAgICAgICAgdGhpcy50ZXh0dXJlSWQrK1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBpZDogdGhpcy50ZXh0dXJlSWQsXHJcbiAgICAgICAgICAgIHRleHR1cmU6IHRleHR1cmVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZHJhd1Nwcml0ZShzcHJpdGU6IFNwcml0ZSkge1xyXG4gICAgICAgIC8vIGFkZCBzcHJpdGUgdG8gYXJyYXlcclxuICAgICAgICB0aGlzLnNwcml0ZXMucHVzaChzcHJpdGUpXHJcbiAgICB9XHJcblxyXG4gICAgZmx1c2gobGlnaHRSYWRpdXM6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMuY2hlY2tSZXNpemUoKVxyXG4gICAgICAgIHRoaXMuYmF0Y2hTcHJpdGVzKClcclxuICAgICAgICB0aGlzLmRyYXdTcHJpdGVzKGxpZ2h0UmFkaXVzKVxyXG4gICAgICAgIHRoaXMuZHJhd1NoYWRvd3MoKVxyXG5cclxuICAgICAgICAvLyBjbGVhciBzcHJpdGVzIGFuZCBiYXRjaGVzXHJcbiAgICAgICAgdGhpcy5zcHJpdGVzID0gW11cclxuICAgICAgICB0aGlzLmJhdGNoZXMgPSBbXVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYmF0Y2hTcHJpdGVzKCkge1xyXG4gICAgICAgIC8vIHNvcnQgc3ByaXRlc1xyXG4gICAgICAgIGNvbnN0IHNwcml0ZXMgPSB0aGlzLnNwcml0ZXNcclxuICAgICAgICBzcHJpdGVzLnNvcnQoKHMxLCBzMikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBpZDEgPSBzMT8udGV4dHVyZT8uaWQgPz8gMFxyXG4gICAgICAgICAgICBjb25zdCBpZDIgPSBzMj8udGV4dHVyZT8uaWQgPz8gMFxyXG4gICAgICAgICAgICBpZiAoaWQxIDwgaWQyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gLTFcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGlkMSA+IGlkMikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIDFcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHV0aWwuY29tcGFyZShzMS5mbGFncywgczIuZmxhZ3MpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgbGV0IGJhdGNoOiBTcHJpdGVCYXRjaCA9IHtcclxuICAgICAgICAgICAgZmxhZ3M6IFNwcml0ZUZsYWdzLk5vbmUsXHJcbiAgICAgICAgICAgIHRleHR1cmU6IG51bGwsXHJcbiAgICAgICAgICAgIG9mZnNldDogMCxcclxuICAgICAgICAgICAgbnVtU3ByaXRlczogMFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzcHJpdGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNwcml0ZSA9IHNwcml0ZXNbaV1cclxuICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgKHNwcml0ZS50ZXh0dXJlPy5pZCA/PyAwKSAhPT0gKGJhdGNoLnRleHR1cmU/LmlkID8/IDApIHx8XHJcbiAgICAgICAgICAgICAgICBzcHJpdGUuZmxhZ3MgIT09IGJhdGNoLmZsYWdzKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBhcHBlbmQgY3VycmVudCBiYXRjaCBpZiBpdCBjb250YWlucyBhbnkgc3ByaXRlc1xyXG4gICAgICAgICAgICAgICAgaWYgKGJhdGNoLm51bVNwcml0ZXMgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5iYXRjaGVzLnB1c2goYmF0Y2gpXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYmVnaW4gbmV3IGJhdGNoXHJcbiAgICAgICAgICAgICAgICBjb25zdCBvZmZzZXQgPSBiYXRjaC5vZmZzZXQgKyBiYXRjaC5udW1TcHJpdGVzXHJcbiAgICAgICAgICAgICAgICBiYXRjaCA9IHtcclxuICAgICAgICAgICAgICAgICAgICBmbGFnczogc3ByaXRlLmZsYWdzLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHR1cmU6IHNwcml0ZS50ZXh0dXJlLFxyXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldDogb2Zmc2V0LFxyXG4gICAgICAgICAgICAgICAgICAgIG51bVNwcml0ZXM6IDBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgYmF0Y2gubnVtU3ByaXRlcysrXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhcHBlbmQgZmluYWwgYmF0Y2ggaWYgaXQgY29udGFpbnMgYW55IHNwcml0ZXNcclxuICAgICAgICBpZiAoYmF0Y2gubnVtU3ByaXRlcyA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy5iYXRjaGVzLnB1c2goYmF0Y2gpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjb3B5IHZlcnRpY2VzIGFuZCBpbmRpY2VzIHRvIGFycmF5cywgZ3Jvd2luZyBhcnJheXMgaWYgcmVxdWlyZWRcclxuICAgICAgICBjb25zdCBudW1WZXJ0aWNlcyA9IHRoaXMuc3ByaXRlcy5sZW5ndGggKiA0XHJcbiAgICAgICAgY29uc3QgbnVtVmVydGV4RWxlbXMgPSBudW1WZXJ0aWNlcyAqIGVsZW1zUGVyU3ByaXRlVmVydGV4XHJcbiAgICAgICAgY29uc3QgZWxlbXNQZXJTcHJpdGUgPSA0ICogZWxlbXNQZXJTcHJpdGVWZXJ0ZXhcclxuICAgICAgICBpZiAodGhpcy52ZXJ0aWNlcy5sZW5ndGggPCBudW1WZXJ0ZXhFbGVtcykge1xyXG4gICAgICAgICAgICB0aGlzLnZlcnRpY2VzID0gbmV3IEZsb2F0MzJBcnJheShudW1WZXJ0ZXhFbGVtcylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG51bUluZGljZXMgPSB0aGlzLnNwcml0ZXMubGVuZ3RoICogNlxyXG4gICAgICAgIGlmICh0aGlzLmluZGljZXMubGVuZ3RoIDwgbnVtSW5kaWNlcykge1xyXG4gICAgICAgICAgICB0aGlzLmluZGljZXMgPSBuZXcgVWludDE2QXJyYXkobnVtSW5kaWNlcylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zcHJpdGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNwcml0ZSA9IHRoaXMuc3ByaXRlc1tpXVxyXG4gICAgICAgICAgICBsZXQgZWxlbU9mZnNldCA9IGkgKiBlbGVtc1BlclNwcml0ZVxyXG4gICAgICAgICAgICBsZXQgaW5kZXhPZmZzZXQgPSBpICogNlxyXG4gICAgICAgICAgICBsZXQgYmFzZUluZGV4ID0gaSAqIDRcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFZlcnRleChlbGVtT2Zmc2V0LCBzcHJpdGUucG9zaXRpb24ueCwgc3ByaXRlLnBvc2l0aW9uLnksIDAsIDAsIHNwcml0ZS5sYXllciwgc3ByaXRlLmNvbG9yWzBdLCBzcHJpdGUuY29sb3JbMV0sIHNwcml0ZS5jb2xvclsyXSwgc3ByaXRlLmNvbG9yWzNdKVxyXG4gICAgICAgICAgICBlbGVtT2Zmc2V0ICs9IGVsZW1zUGVyU3ByaXRlVmVydGV4XHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hWZXJ0ZXgoZWxlbU9mZnNldCwgc3ByaXRlLnBvc2l0aW9uLngsIHNwcml0ZS5wb3NpdGlvbi55ICsgc3ByaXRlLmhlaWdodCwgMCwgMSwgc3ByaXRlLmxheWVyLCBzcHJpdGUuY29sb3JbMF0sIHNwcml0ZS5jb2xvclsxXSwgc3ByaXRlLmNvbG9yWzJdLCBzcHJpdGUuY29sb3JbM10pXHJcbiAgICAgICAgICAgIGVsZW1PZmZzZXQgKz0gZWxlbXNQZXJTcHJpdGVWZXJ0ZXhcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFZlcnRleChlbGVtT2Zmc2V0LCBzcHJpdGUucG9zaXRpb24ueCArIHNwcml0ZS53aWR0aCwgc3ByaXRlLnBvc2l0aW9uLnkgKyBzcHJpdGUuaGVpZ2h0LCAxLCAxLCBzcHJpdGUubGF5ZXIsIHNwcml0ZS5jb2xvclswXSwgc3ByaXRlLmNvbG9yWzFdLCBzcHJpdGUuY29sb3JbMl0sIHNwcml0ZS5jb2xvclszXSlcclxuICAgICAgICAgICAgZWxlbU9mZnNldCArPSBlbGVtc1BlclNwcml0ZVZlcnRleFxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoVmVydGV4KGVsZW1PZmZzZXQsIHNwcml0ZS5wb3NpdGlvbi54ICsgc3ByaXRlLndpZHRoLCBzcHJpdGUucG9zaXRpb24ueSwgMSwgMCwgc3ByaXRlLmxheWVyLCBzcHJpdGUuY29sb3JbMF0sIHNwcml0ZS5jb2xvclsxXSwgc3ByaXRlLmNvbG9yWzJdLCBzcHJpdGUuY29sb3JbM10pXHJcbiAgICAgICAgICAgIGVsZW1PZmZzZXQgKz0gZWxlbXNQZXJTcHJpdGVWZXJ0ZXhcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlc1tpbmRleE9mZnNldF0gPSBiYXNlSW5kZXhcclxuICAgICAgICAgICAgdGhpcy5pbmRpY2VzW2luZGV4T2Zmc2V0ICsgMV0gPSBiYXNlSW5kZXggKyAxXHJcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlc1tpbmRleE9mZnNldCArIDJdID0gYmFzZUluZGV4ICsgMlxyXG4gICAgICAgICAgICB0aGlzLmluZGljZXNbaW5kZXhPZmZzZXQgKyAzXSA9IGJhc2VJbmRleFxyXG4gICAgICAgICAgICB0aGlzLmluZGljZXNbaW5kZXhPZmZzZXQgKyA0XSA9IGJhc2VJbmRleCArIDJcclxuICAgICAgICAgICAgdGhpcy5pbmRpY2VzW2luZGV4T2Zmc2V0ICsgNV0gPSBiYXNlSW5kZXggKyAzXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB0cmFuc2ZlciB2ZXJ0aWNlcyBhbmQgaW5kaWNlcyB0byBHUFVcclxuICAgICAgICBjb25zdCBnbCA9IHRoaXMuZ2xcclxuICAgICAgICBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy52ZXJ0ZXhCdWZmZXIpXHJcbiAgICAgICAgZ2wuYnVmZmVyRGF0YShnbC5BUlJBWV9CVUZGRVIsIHRoaXMudmVydGljZXMuc3ViYXJyYXkoMCwgdGhpcy5zcHJpdGVzLmxlbmd0aCAqIDQgKiBlbGVtc1BlclNwcml0ZSksIGdsLkRZTkFNSUNfRFJBVylcclxuICAgICAgICBnbC5iaW5kQnVmZmVyKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCB0aGlzLmluZGV4QnVmZmVyKVxyXG4gICAgICAgIGdsLmJ1ZmZlckRhdGEoZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIHRoaXMuaW5kaWNlcy5zdWJhcnJheSgwLCB0aGlzLnNwcml0ZXMubGVuZ3RoICogNiksIGdsLkRZTkFNSUNfRFJBVylcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyYXdTaGFkb3dzKCkge1xyXG4gICAgICAgIGNvbnN0IGdsID0gdGhpcy5nbFxyXG4gICAgICAgIGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5zaGFkb3dNYXBGcmFtZWJ1ZmZlcilcclxuICAgICAgICBnbC5iaW5kVmVydGV4QXJyYXkodGhpcy5zaGFkb3dWYW8pXHJcbiAgICAgICAgZ2wudmlld3BvcnQoMCwgMCwgZ2wuZHJhd2luZ0J1ZmZlcldpZHRoLCBnbC5kcmF3aW5nQnVmZmVySGVpZ2h0KVxyXG4gICAgICAgIGdsLmNsZWFyQ29sb3IoMCwgMCwgMCwgMClcclxuICAgICAgICBnbC5jbGVhcihnbC5DT0xPUl9CVUZGRVJfQklUKVxyXG4gICAgICAgIGdsLnVzZVByb2dyYW0odGhpcy5zaGFkb3dQcm9ncmFtKVxyXG4gICAgICAgIGdsLnVuaWZvcm0yZih0aGlzLnNoYWRvd1ZpZXdwb3J0U2l6ZVVuaWZvcm1Mb2NhdGlvbiwgZ2wuZHJhd2luZ0J1ZmZlcldpZHRoLCBnbC5kcmF3aW5nQnVmZmVySGVpZ2h0KVxyXG4gICAgICAgIGdsLmJpbmRWZXJ0ZXhBcnJheSh0aGlzLnNoYWRvd1ZhbylcclxuXHJcbiAgICAgICAgLy8gZHJhdyBlYWNoIGZvclxyXG4gICAgICAgIGdsLmRyYXdFbGVtZW50cyhnbC5UUklBTkdMRVMsIHRoaXMuc3ByaXRlcy5sZW5ndGggKiA2LCBnbC5VTlNJR05FRF9TSE9SVCwgMClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRyYXdTcHJpdGVzKGxpZ2h0UmFkaXVzOiBudW1iZXIpIHtcclxuICAgICAgICAvLyBkcmF3IHRoZSBzcHJpdGVzXHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcbiAgICAgICAgZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBudWxsKVxyXG4gICAgICAgIGdsLmJpbmRWZXJ0ZXhBcnJheSh0aGlzLnNwcml0ZVZhbylcclxuICAgICAgICBnbC52aWV3cG9ydCgwLCAwLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgZ2wuY2xlYXJDb2xvcigwLCAwLCAwLCAxKVxyXG4gICAgICAgIGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpXHJcbiAgICAgICAgZ2wudXNlUHJvZ3JhbSh0aGlzLnNwcml0ZVByb2dyYW0pXHJcbiAgICAgICAgZ2wudW5pZm9ybTJmKHRoaXMuc3ByaXRlVmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgZ2wudW5pZm9ybTFmKHRoaXMuc3ByaXRlTGlnaHRSYWRpdXNVbmlmb3JtTG9jYXRpb24sIGxpZ2h0UmFkaXVzKVxyXG4gICAgICAgIGdsLmJpbmRWZXJ0ZXhBcnJheSh0aGlzLnNwcml0ZVZhbylcclxuXHJcbiAgICAgICAgLy8gZHJhdyBlYWNoIGJhdGNoXHJcbiAgICAgICAgZm9yIChjb25zdCBiYXRjaCBvZiB0aGlzLmJhdGNoZXMpIHtcclxuICAgICAgICAgICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMClcclxuICAgICAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgYmF0Y2gudGV4dHVyZT8udGV4dHVyZSA/PyBudWxsKVxyXG4gICAgICAgICAgICBnbC5iaW5kU2FtcGxlcigwLCB0aGlzLnNhbXBsZXIpXHJcbiAgICAgICAgICAgIGdsLnVuaWZvcm0xaSh0aGlzLnNwcml0ZVNhbXBsZXJVbmlmb3JtTG9jYXRpb24sIDApXHJcbiAgICAgICAgICAgIGdsLnVuaWZvcm0xaSh0aGlzLnNwcml0ZUxpdFVuaWZvcm1Mb2NhdGlvbiwgYmF0Y2guZmxhZ3MgJiBTcHJpdGVGbGFncy5MaXQgPyAxIDogMClcclxuICAgICAgICAgICAgZ2wudW5pZm9ybTFpKHRoaXMuc3ByaXRlQXJyYXlUZXh0dXJlVW5pZm9ybUxvY2F0aW9uLCBiYXRjaC5mbGFncyAmIFNwcml0ZUZsYWdzLkFycmF5VGV4dHVyZSA/IDEgOiAwKVxyXG4gICAgICAgICAgICBnbC5kcmF3RWxlbWVudHMoZ2wuVFJJQU5HTEVTLCBiYXRjaC5udW1TcHJpdGVzICogNiwgZ2wuVU5TSUdORURfU0hPUlQsIGJhdGNoLm9mZnNldCAqIDYpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd1NoYWRvd1RleHR1cmUoKSB7XHJcbiAgICAgICAgLy8gY29uc3QgZ2wgPSB0aGlzLmdsXHJcbiAgICAgICAgLy8gZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBudWxsKVxyXG4gICAgICAgIC8vIGdsLmJpbmRWZXJ0ZXhBcnJheSh0aGlzLnNwcml0ZVZhbylcclxuICAgICAgICAvLyBnbC52aWV3cG9ydCgwLCAwLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgLy8gZ2wuY2xlYXJDb2xvcigwLCAwLCAwLCAxKVxyXG4gICAgICAgIC8vIGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpXHJcbiAgICAgICAgLy8gZ2wudXNlUHJvZ3JhbSh0aGlzLnNwcml0ZVByb2dyYW0pXHJcbiAgICAgICAgLy8gZ2wudW5pZm9ybTJmKHRoaXMuc3ByaXRlVmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgLy8gZ2wudW5pZm9ybTFmKHRoaXMuc3ByaXRlTGlnaHRSYWRpdXNVbmlmb3JtTG9jYXRpb24sIGxpZ2h0UmFkaXVzKVxyXG4gICAgICAgIC8vIGdsLmJpbmRWZXJ0ZXhBcnJheSh0aGlzLnNwcml0ZVZhbylcclxuXHJcbiAgICAgICAgLy8gLy8gZHJhdyBlYWNoIGJhdGNoXHJcbiAgICAgICAgLy8gZm9yIChjb25zdCBbdGV4dHVyZSwgYmF0Y2hdIG9mIHRoaXMuYmF0Y2hlcykge1xyXG4gICAgICAgIC8vICAgICBnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwKVxyXG4gICAgICAgIC8vICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJEX0FSUkFZLCB0ZXh0dXJlKVxyXG4gICAgICAgIC8vICAgICBnbC5iaW5kU2FtcGxlcigwLCB0aGlzLnNhbXBsZXIpXHJcbiAgICAgICAgLy8gICAgIGdsLnVuaWZvcm0xaSh0aGlzLnNhbXBsZXJVbmlmb3JtTG9jYXRpb24sIDApXHJcbiAgICAgICAgLy8gICAgIGdsLmRyYXdFbGVtZW50cyhnbC5UUklBTkdMRVMsIGJhdGNoLnNwcml0ZXMubGVuZ3RoICogNiwgZ2wuVU5TSUdORURfU0hPUlQsIDApXHJcbiAgICAgICAgLy8gfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHVzaFZlcnRleChvZmZzZXQ6IG51bWJlciwgeDogbnVtYmVyLCB5OiBudW1iZXIsIHU6IG51bWJlciwgdjogbnVtYmVyLCB3OiBudW1iZXIsIHI6IG51bWJlciwgZzogbnVtYmVyLCBiOiBudW1iZXIsIGE6IG51bWJlcikge1xyXG4gICAgICAgIC8vIHBvc2l0aW9uXHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXRdID0geFxyXG4gICAgICAgIHRoaXMudmVydGljZXNbb2Zmc2V0ICsgMV0gPSB5XHJcbiAgICAgICAgLy8gdXZcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW29mZnNldCArIDJdID0gdVxyXG4gICAgICAgIHRoaXMudmVydGljZXNbb2Zmc2V0ICsgM10gPSB2XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXQgKyA0XSA9IHdcclxuICAgICAgICAvLyBjb2xvclxyXG4gICAgICAgIHRoaXMudmVydGljZXNbb2Zmc2V0ICsgNV0gPSByXHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXQgKyA2XSA9IGdcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW29mZnNldCArIDddID0gYlxyXG4gICAgICAgIHRoaXMudmVydGljZXNbb2Zmc2V0ICsgOF0gPSBhXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjaGVja1Jlc2l6ZSgpIHtcclxuICAgICAgICBjb25zdCBjYW52YXMgPSB0aGlzLmNhbnZhc1xyXG4gICAgICAgIGlmIChjYW52YXMud2lkdGggIT09IGNhbnZhcy5jbGllbnRXaWR0aCAmJiBjYW52YXMuaGVpZ2h0ICE9PSBjYW52YXMuY2xpZW50SGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgICAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGNhbnZhcy53aWR0aCA9PT0gdGhpcy52aWV3cG9ydFdpZHRoICYmIGNhbnZhcy5oZWlnaHQgPT09IHRoaXMudmlld3BvcnRIZWlnaHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmdsLmRlbGV0ZVRleHR1cmUodGhpcy5zaGFkb3dNYXBUZXh0dXJlKVxyXG4gICAgICAgIHRoaXMuZ2wuZGVsZXRlRnJhbWVidWZmZXIodGhpcy5zaGFkb3dNYXBGcmFtZWJ1ZmZlcilcclxuICAgICAgICB0aGlzLnNoYWRvd01hcFRleHR1cmUgPSBjcmVhdGVTaGFkb3dNYXBUZXh0dXJlKHRoaXMuZ2wsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodClcclxuICAgICAgICB0aGlzLnNoYWRvd01hcEZyYW1lYnVmZmVyID0gY3JlYXRlU2hhZG93TWFwRnJhbWVidWZmZXIodGhpcy5nbCwgdGhpcy5zaGFkb3dNYXBUZXh0dXJlKVxyXG4gICAgICAgIHRoaXMudmlld3BvcnRXaWR0aCA9IGNhbnZhcy53aWR0aFxyXG4gICAgICAgIHRoaXMudmlld3BvcnRIZWlnaHQgPSBjYW52YXMuaGVpZ2h0XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVNwcml0ZVZhbyhcclxuICAgIGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LFxyXG4gICAgcHJvZ3JhbTogV2ViR0xQcm9ncmFtLFxyXG4gICAgdmVydGV4QnVmZmVyOiBXZWJHTEJ1ZmZlcixcclxuICAgIGluZGV4QnVmZmVyOiBXZWJHTEJ1ZmZlcik6IFdlYkdMVmVydGV4QXJyYXlPYmplY3Qge1xyXG4gICAgY29uc3QgdmFvID0gZ2x1LmNyZWF0ZVZlcnRleEFycmF5KGdsKVxyXG4gICAgZ2wuYmluZFZlcnRleEFycmF5KHZhbylcclxuXHJcbiAgICBjb25zdCBwb3NpdGlvbkF0dHJpYklkeCA9IGdsdS5nZXRBdHRyaWJMb2NhdGlvbihnbCwgcHJvZ3JhbSwgXCJpbl9wb3NpdGlvblwiKVxyXG4gICAgY29uc3QgdXZ3QXR0cmliSWR4ID0gZ2x1LmdldEF0dHJpYkxvY2F0aW9uKGdsLCBwcm9ncmFtLCBcImluX3V2d1wiKVxyXG4gICAgY29uc3QgY29sb3JBdHRyaWJJZHggPSBnbHUuZ2V0QXR0cmliTG9jYXRpb24oZ2wsIHByb2dyYW0sIFwiaW5fY29sb3JcIilcclxuICAgIGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB2ZXJ0ZXhCdWZmZXIpXHJcbiAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShwb3NpdGlvbkF0dHJpYklkeClcclxuICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHV2d0F0dHJpYklkeClcclxuICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KGNvbG9yQXR0cmliSWR4KVxyXG4gICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcihwb3NpdGlvbkF0dHJpYklkeCwgMiwgZ2wuRkxPQVQsIGZhbHNlLCBzcHJpdGVWZXJ0ZXhTdHJpZGUsIDApXHJcbiAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHV2d0F0dHJpYklkeCwgMywgZ2wuRkxPQVQsIGZhbHNlLCBzcHJpdGVWZXJ0ZXhTdHJpZGUsIDgpXHJcbiAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKGNvbG9yQXR0cmliSWR4LCA0LCBnbC5GTE9BVCwgZmFsc2UsIHNwcml0ZVZlcnRleFN0cmlkZSwgMjApXHJcbiAgICBnbC5iaW5kQnVmZmVyKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCBpbmRleEJ1ZmZlcilcclxuICAgIHJldHVybiB2YW9cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlU2hhZG93VmFvKFxyXG4gICAgZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQsXHJcbiAgICBwcm9ncmFtOiBXZWJHTFByb2dyYW0sXHJcbiAgICB2ZXJ0ZXhCdWZmZXI6IFdlYkdMQnVmZmVyLFxyXG4gICAgaW5kZXhCdWZmZXI6IFdlYkdMQnVmZmVyKTogV2ViR0xWZXJ0ZXhBcnJheU9iamVjdCB7XHJcbiAgICBjb25zdCB2YW8gPSBnbHUuY3JlYXRlVmVydGV4QXJyYXkoZ2wpXHJcbiAgICBnbC5iaW5kVmVydGV4QXJyYXkodmFvKVxyXG5cclxuICAgIGNvbnN0IHBvc2l0aW9uQXR0cmliSWR4ID0gZ2x1LmdldEF0dHJpYkxvY2F0aW9uKGdsLCBwcm9ncmFtLCBcImluX3Bvc2l0aW9uXCIpXHJcbiAgICBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdmVydGV4QnVmZmVyKVxyXG4gICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkocG9zaXRpb25BdHRyaWJJZHgpXHJcbiAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHBvc2l0aW9uQXR0cmliSWR4LCAyLCBnbC5GTE9BVCwgZmFsc2UsIHNwcml0ZVZlcnRleFN0cmlkZSwgMClcclxuICAgIGdsLmJpbmRCdWZmZXIoZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIGluZGV4QnVmZmVyKVxyXG4gICAgcmV0dXJuIHZhb1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVTaGFkb3dNYXBUZXh0dXJlKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFdlYkdMVGV4dHVyZSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIk5FVyBTSEFET1cgTUFQXCIpXHJcbiAgICBjb25zdCB0ZXh0dXJlID0gZ2x1LmNyZWF0ZVRleHR1cmUoZ2wpXHJcbiAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0ZXh0dXJlKVxyXG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSk7XHJcbiAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcclxuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5MSU5FQVIpO1xyXG4gICAgZ2wudGV4SW1hZ2UyRChnbC5URVhUVVJFXzJELCAwLCBnbC5SR0JBOCwgd2lkdGgsIGhlaWdodCwgMCwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgbnVsbClcclxuICAgIHJldHVybiB0ZXh0dXJlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVNoYWRvd01hcEZyYW1lYnVmZmVyKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LCB0ZXh0dXJlOiBXZWJHTFRleHR1cmUpOiBXZWJHTEZyYW1lYnVmZmVyIHtcclxuICAgIGNvbnN0IGZiID0gZ2x1LmNyZWF0ZUZyYW1lYnVmZmVyKGdsKVxyXG4gICAgZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBmYilcclxuICAgIGdsLmZyYW1lYnVmZmVyVGV4dHVyZTJEKGdsLkZSQU1FQlVGRkVSLCBnbC5DT0xPUl9BVFRBQ0hNRU5UMCwgZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZSwgMClcclxuICAgIHJldHVybiBmYlxyXG59Il19