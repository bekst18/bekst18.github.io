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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2Z4LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2Z4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0gsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBSXpDLE1BQU0sZUFBZSxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBbUJ0QixDQUFBO0FBRUYsTUFBTSxpQkFBaUIsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQXFDeEIsQ0FBQTtBQUVGLE1BQU0sZUFBZSxHQUFHOzs7Ozs7Ozs7Ozs7O0VBYXRCLENBQUE7QUFFRixNQUFNLGlCQUFpQixHQUFHOzs7Ozs7Ozs7Ozs7Ozs7O0NBZ0J6QixDQUFBO0FBQ0QsTUFBTSxDQUFOLElBQVksV0FNWDtBQU5ELFdBQVksV0FBVztJQUNuQiw2Q0FBUSxDQUFBO0lBQ1IsMkNBQVksQ0FBQTtJQUNaLDZEQUFxQixDQUFBO0lBQ3JCLDZEQUFxQixDQUFBO0lBQ3JCLDZDQUFhLENBQUE7QUFDakIsQ0FBQyxFQU5XLFdBQVcsS0FBWCxXQUFXLFFBTXRCO0FBRUQsU0FBUyx1QkFBdUIsQ0FBQyxLQUFrQjtJQUMvQyxPQUFPLEtBQUssR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsV0FBVyxDQUFDLFlBQVksR0FBRyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDMUYsQ0FBQztBQWlCRCxNQUFNLE9BQU8sTUFBTTtJQVNmLFlBQVksVUFBeUIsRUFBRTtRQVJoQyxhQUFRLEdBQWMsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QyxVQUFLLEdBQVcsQ0FBQyxDQUFBO1FBQ2pCLFdBQU0sR0FBVyxDQUFDLENBQUE7UUFDbEIsVUFBSyxHQUFXLENBQUMsQ0FBQTtRQUNqQixVQUFLLEdBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzQixZQUFPLEdBQW1CLElBQUksQ0FBQTtRQUM5QixVQUFLLEdBQWdCLFdBQVcsQ0FBQyxJQUFJLENBQUE7UUFHeEMsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO1lBQ2xCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQTtTQUNuQztRQUVELElBQUksT0FBTyxDQUFDLEtBQUssRUFBRTtZQUNmLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQTtTQUM3QjtRQUVELElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUNoQixJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7U0FDL0I7UUFFRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUU7WUFDZixJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7U0FDN0I7UUFFRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUU7WUFDZixJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7U0FDN0I7UUFFRCxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7WUFDakIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFBO1NBQ2pDO1FBRUQsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFO1lBQ2YsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFBO1NBQzdCO0lBQ0wsQ0FBQztDQUNKO0FBRUQsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLENBQUE7QUFDOUIsTUFBTSxrQkFBa0IsR0FBRyxvQkFBb0IsR0FBRyxDQUFDLENBQUE7QUFTbkQsTUFBTSxPQUFPLFFBQVE7SUE2QmpCLFlBQXFCLE1BQXlCO1FBQXpCLFdBQU0sR0FBTixNQUFNLENBQW1CO1FBUnRDLFlBQU8sR0FBYSxFQUFFLENBQUE7UUFDdEIsWUFBTyxHQUFrQixFQUFFLENBQUE7UUFDM0IsYUFBUSxHQUFpQixJQUFJLFlBQVksRUFBRSxDQUFBO1FBQzNDLFlBQU8sR0FBZ0IsSUFBSSxXQUFXLEVBQUUsQ0FBQTtRQUN4QyxrQkFBYSxHQUFXLENBQUMsQ0FBQTtRQUN6QixtQkFBYyxHQUFXLENBQUMsQ0FBQTtRQUMxQixjQUFTLEdBQVcsQ0FBQyxDQUFBO1FBR3pCLElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNuQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFBO1FBRWxCLElBQUksQ0FBQyxhQUFhLEdBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDL0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUMvRSxJQUFJLENBQUMsd0JBQXdCLEdBQUcsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3JGLElBQUksQ0FBQyxvQ0FBb0MsR0FBRyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUMvRyxJQUFJLENBQUMsNEJBQTRCLEdBQUcsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzdGLElBQUksQ0FBQyxpQ0FBaUMsR0FBRyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDeEcsSUFBSSxDQUFDLGlDQUFpQyxHQUFHLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUN4RyxJQUFJLENBQUMsZ0NBQWdDLEdBQUcsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQ3RHLElBQUksQ0FBQyxpQ0FBaUMsR0FBRyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDeEcsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3hDLElBQUksQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUV2Qyw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDM0MsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDM0QsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLGFBQWEsRUFBRSxJQUFJLGlCQUFpQixDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTFILGdCQUFnQjtRQUNoQixJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDcEMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDbEYsRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDdkUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDdkUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFdkUsSUFBSSxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ2xHLElBQUksQ0FBQyxTQUFTLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUVsRyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQzVDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxHQUFHLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDckQsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM1RCxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDN0QsRUFBRSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNsSCxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsS0FBYSxFQUFFLE1BQWMsRUFBRSxNQUF3QjtRQUNwRSxtQ0FBbUM7UUFDbkMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQTtRQUNsQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDcEMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3BELEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hILE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDdEIsRUFBRSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN2RyxDQUFDLENBQUMsQ0FBQTtRQUVGLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFFdEMsT0FBTyxPQUFPLENBQUE7SUFDbEIsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBVztRQUN6QixtQ0FBbUM7UUFDbkMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQTtRQUNsQixNQUFNLE9BQU8sR0FBRyxNQUFNLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzlDLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBRWhCLE9BQU87WUFDSCxFQUFFLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDbEIsT0FBTyxFQUFFLE9BQU87U0FDbkIsQ0FBQTtJQUNMLENBQUM7SUFFRCxVQUFVLENBQUMsTUFBYztRQUNyQixzQkFBc0I7UUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFtQjtRQUNyQixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7UUFFaEIsNEJBQTRCO1FBQzVCLDhCQUE4QjtRQUM5QixxQ0FBcUM7UUFDckMsbUJBQW1CO1FBQ25CLG9CQUFvQjtRQUNwQiwyQkFBMkI7UUFDM0Isc0NBQXNDO1FBQ3RDLDhCQUE4QjtRQUM5QixLQUFLO1FBQ0wsMEJBQTBCO1FBRTFCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNuQixxQkFBcUI7UUFDckIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUU3Qiw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUE7UUFDakIsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVPLFlBQVk7O1FBQ2hCLHNEQUFzRDtRQUN0RCxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUU7Z0JBQ2pCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQTthQUN4QztTQUNKO1FBRUQsZUFBZTtRQUNmLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUE7UUFDNUIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTs7WUFDcEIsTUFBTSxHQUFHLGVBQUcsRUFBRSxDQUFDLE9BQU8sMENBQUUsRUFBRSxtQ0FBSSxDQUFDLENBQUE7WUFDL0IsTUFBTSxHQUFHLGVBQUcsRUFBRSxDQUFDLE9BQU8sMENBQUUsRUFBRSxtQ0FBSSxDQUFDLENBQUE7WUFDL0IsSUFBSSxHQUFHLEdBQUcsR0FBRyxFQUFFO2dCQUNYLE9BQU8sQ0FBQyxDQUFDLENBQUE7YUFDWjtZQUVELElBQUksR0FBRyxHQUFHLEdBQUcsRUFBRTtnQkFDWCxPQUFPLENBQUMsQ0FBQTthQUNYO1lBRUQsTUFBTSxZQUFZLEdBQUcsdUJBQXVCLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3RELE1BQU0sWUFBWSxHQUFHLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN0RCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ25ELENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxLQUFLLEdBQWdCO1lBQ3JCLEtBQUssRUFBRSxXQUFXLENBQUMsSUFBSTtZQUN2QixPQUFPLEVBQUUsSUFBSTtZQUNiLE1BQU0sRUFBRSxDQUFDO1lBQ1QsVUFBVSxFQUFFLENBQUM7U0FDaEIsQ0FBQTtRQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQ3JDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6QixNQUFNLFdBQVcsR0FBRyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDekQsSUFDSSxhQUFDLE1BQU0sQ0FBQyxPQUFPLDBDQUFFLEVBQUUsbUNBQUksQ0FBQyxDQUFDLEtBQUssYUFBQyxLQUFLLENBQUMsT0FBTywwQ0FBRSxFQUFFLG1DQUFJLENBQUMsQ0FBQztnQkFDdEQsV0FBVyxLQUFLLEtBQUssQ0FBQyxLQUFLLEVBQUU7Z0JBQzdCLGtEQUFrRDtnQkFDbEQsSUFBSSxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBRTtvQkFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7aUJBQzNCO2dCQUVELGtCQUFrQjtnQkFDbEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFBO2dCQUM5QyxLQUFLLEdBQUc7b0JBQ0osS0FBSyxFQUFFLFdBQVc7b0JBQ2xCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztvQkFDdkIsTUFBTSxFQUFFLE1BQU07b0JBQ2QsVUFBVSxFQUFFLENBQUM7aUJBQ2hCLENBQUE7YUFDSjtZQUVELEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQTtTQUNyQjtRQUVELGdEQUFnRDtRQUNoRCxJQUFJLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFO1lBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1NBQzNCO1FBRUQsa0VBQWtFO1FBQ2xFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUMzQyxNQUFNLGNBQWMsR0FBRyxXQUFXLEdBQUcsb0JBQW9CLENBQUE7UUFDekQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxHQUFHLG9CQUFvQixDQUFBO1FBQy9DLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsY0FBYyxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUE7U0FDbkQ7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDMUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxVQUFVLEVBQUU7WUFDbEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtTQUM3QztRQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtZQUMxQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzlCLElBQUksVUFBVSxHQUFHLENBQUMsR0FBRyxjQUFjLENBQUE7WUFDbkMsSUFBSSxXQUFXLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN2QixJQUFJLFNBQVMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3JCLE1BQU0sSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssV0FBVyxDQUFDLElBQUksQ0FBQTtZQUVuRSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNwSyxVQUFVLElBQUksb0JBQW9CLENBQUE7WUFFbEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNwTCxVQUFVLElBQUksb0JBQW9CLENBQUE7WUFFbEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ25NLFVBQVUsSUFBSSxvQkFBb0IsQ0FBQTtZQUVsQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxD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QyxHQUFHLENBQUMsQ0FBQTtJQUV2QixNQUFNLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBQzNFLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUM1QyxFQUFFLENBQUMsdUJBQXVCLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUM3QyxFQUFFLENBQUMsbUJBQW1CLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3BGLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ25ELE9BQU8sR0FBRyxDQUFBO0FBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiB3ZWIgZ2wgc3ByaXRlIHJlbmRlcmluZyB1dGlsaXRpZXNcclxuICovXHJcbmltcG9ydCAqIGFzIGdsdSBmcm9tIFwiLi9nbHUuanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSBcIi4uL3NoYXJlZC91dGlsLmpzXCJcclxuXHJcbmV4cG9ydCB0eXBlIENvbG9yID0gW251bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl1cclxuXHJcbmNvbnN0IHNwcml0ZVZlcnRleFNyYyA9IGAjdmVyc2lvbiAzMDAgZXNcclxucHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XHJcblxyXG51bmlmb3JtIHZlYzIgdmlld3BvcnRfc2l6ZTtcclxuXHJcbmluIHZlYzIgaW5fcG9zaXRpb247XHJcbmluIHZlYzMgaW5fdXZ3O1xyXG5pbiB2ZWM0IGluX2NvbG9yO1xyXG5cclxub3V0IHZlYzIgZnJhZ19wb3NpdGlvbjtcclxub3V0IHZlYzQgZnJhZ19jb2xvcjtcclxub3V0IHZlYzMgZnJhZ191dnc7XHJcblxyXG52b2lkIG1haW4oKSB7XHJcbiAgICBmcmFnX3V2dyA9IGluX3V2dztcclxuICAgIGZyYWdfY29sb3IgPSBpbl9jb2xvcjtcclxuICAgIGZyYWdfcG9zaXRpb24gPSBpbl9wb3NpdGlvbjtcclxuICAgIHZlYzIgcG9zaXRpb24gPSB2ZWMyKGluX3Bvc2l0aW9uLnggLyB2aWV3cG9ydF9zaXplLnggKiAyLmYgLSAxLmYsIC1pbl9wb3NpdGlvbi55IC8gdmlld3BvcnRfc2l6ZS55ICogMi5mICsgMS5mKTtcclxuICAgIGdsX1Bvc2l0aW9uID0gdmVjNChwb3NpdGlvbiwgMCwgMSk7XHJcbn1gXHJcblxyXG5jb25zdCBzcHJpdGVGcmFnbWVudFNyYyA9IGAjdmVyc2lvbiAzMDAgZXNcclxucHJlY2lzaW9uIGhpZ2hwIGZsb2F0O1xyXG5wcmVjaXNpb24gaGlnaHAgc2FtcGxlcjJEO1xyXG5wcmVjaXNpb24gaGlnaHAgc2FtcGxlcjJEQXJyYXk7XHJcblxyXG51bmlmb3JtIGJvb2wgbGl0O1xyXG51bmlmb3JtIGJvb2wgdXNlX2FycmF5X3RleHR1cmU7XHJcbnVuaWZvcm0gbWVkaXVtcCB2ZWMyIHZpZXdwb3J0X3NpemU7XHJcbnVuaWZvcm0gZmxvYXQgbGlnaHRfcmFkaXVzO1xyXG51bmlmb3JtIHNhbXBsZXIyRCBzYW1wbGVyO1xyXG51bmlmb3JtIHNhbXBsZXIyREFycmF5IGFycmF5X3NhbXBsZXI7XHJcblxyXG5pbiB2ZWMyIGZyYWdfcG9zaXRpb247XHJcbmluIHZlYzQgZnJhZ19jb2xvcjtcclxuaW4gdmVjMyBmcmFnX3V2dztcclxuXHJcbm91dCB2ZWM0IG91dF9jb2xvcjtcclxuXHJcbnZvaWQgbWFpbigpIHtcclxuICAgIGZsb2F0IGwgPSAxLmY7XHJcbiAgICBpZiAobGl0KSB7XHJcbiAgICAgICAgLy8gY2FsY3VsYXRlIGRpc3RhbmNlIGZyb20gbGlnaHRcclxuICAgICAgICBmbG9hdCBkID0gbGVuZ3RoKGZyYWdfcG9zaXRpb24gLSB2aWV3cG9ydF9zaXplIC8gMi5mKTtcclxuXHJcbiAgICAgICAgLy8gY2FsY3VsYXRlIGxpZ2h0IGFtb3VudCAoZnVsbCBmcm9tIDAgdG8gbGlnaHQgcmFkaXVzLCBsZXJwIGZyb20gbGlnaHRfcmFkaXVzIHRvIDIgKiBsaWdodF9yYWRpdXMpXHJcbiAgICAgICAgbCA9IG1peCgxLmYsIDAuZiwgZCAvIGxpZ2h0X3JhZGl1cyk7XHJcbiAgICB9XHJcblxyXG4gICAgb3V0X2NvbG9yID0gZnJhZ19jb2xvcjtcclxuXHJcbiAgICBpZiAodXNlX2FycmF5X3RleHR1cmUpIHtcclxuICAgICAgICBvdXRfY29sb3IgKj0gdGV4dHVyZShhcnJheV9zYW1wbGVyLCBmcmFnX3V2dyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIG91dF9jb2xvciAqPSB0ZXh0dXJlKHNhbXBsZXIsIGZyYWdfdXZ3Lnh5KTtcclxuICAgIH1cclxuXHJcbiAgICBvdXRfY29sb3IgKj0gdmVjNChsLCBsLCBsLCAxKTtcclxufWBcclxuXHJcbmNvbnN0IHNoYWRvd1ZlcnRleFNyYyA9IGAjdmVyc2lvbiAzMDAgZXNcclxucHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XHJcblxyXG51bmlmb3JtIHZlYzIgdmlld3BvcnRfc2l6ZTtcclxuXHJcbmluIHZlYzIgaW5fcG9zaXRpb247XHJcblxyXG5vdXQgdmVjMiBmcmFnX3Bvc2l0aW9uO1xyXG5cclxudm9pZCBtYWluKCkge1xyXG4gICAgZnJhZ19wb3NpdGlvbiA9IGluX3Bvc2l0aW9uO1xyXG4gICAgdmVjMiBwb3NpdGlvbiA9IHZlYzIoaW5fcG9zaXRpb24ueCAvIHZpZXdwb3J0X3NpemUueCAqIDIuZiAtIDEuZiwgLWluX3Bvc2l0aW9uLnkgLyB2aWV3cG9ydF9zaXplLnkgKiAyLmYgKyAxLmYpO1xyXG4gICAgZ2xfUG9zaXRpb24gPSB2ZWM0KHBvc2l0aW9uLCAwLCAxKTtcclxufWBcclxuXHJcbmNvbnN0IHNoYWRvd0ZyYWdtZW50U3JjID0gYCN2ZXJzaW9uIDMwMCBlc1xyXG5wcmVjaXNpb24gaGlnaHAgZmxvYXQ7XHJcbnByZWNpc2lvbiBoaWdocCBzYW1wbGVyMkRBcnJheTtcclxuXHJcbnVuaWZvcm0gbWVkaXVtcCB2ZWMyIHZpZXdwb3J0X3NpemU7XHJcblxyXG5pbiB2ZWMyIGZyYWdfcG9zaXRpb247XHJcblxyXG5vdXQgdmVjNCBvdXRfY29sb3I7XHJcblxyXG52b2lkIG1haW4oKSB7XHJcbiAgICAvLyBjYWxjdWxhdGUgZGlzdGFuY2UgZnJvbSBsaWdodFxyXG4gICAgZmxvYXQgZCA9IGxlbmd0aChmcmFnX3Bvc2l0aW9uIC0gdmlld3BvcnRfc2l6ZSAvIDIuZikgLyAoMTYuZiAqIDI0LmYpO1xyXG4gICAgb3V0X2NvbG9yID0gdmVjNChkLCBkLCBkLCAxKTtcclxuICAgIG91dF9jb2xvciA9IHZlYzQoMSwwLDAsMSk7XHJcbn1cclxuYFxyXG5leHBvcnQgZW51bSBTcHJpdGVGbGFncyB7XHJcbiAgICBOb25lID0gMCxcclxuICAgIExpdCA9IDEgPDwgMCxcclxuICAgIEFycmF5VGV4dHVyZSA9IDEgPDwgMSxcclxuICAgIENhc3RzU2hhZG93cyA9IDEgPDwgMixcclxuICAgIEZsaXAgPSAxIDw8IDNcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0X3Nwcml0ZV9yZW5kZXJfZmxhZ3MoZmxhZ3M6IFNwcml0ZUZsYWdzKTogU3ByaXRlRmxhZ3Mge1xyXG4gICAgcmV0dXJuIGZsYWdzICYgKFNwcml0ZUZsYWdzLkxpdCB8IFNwcml0ZUZsYWdzLkFycmF5VGV4dHVyZSB8IFNwcml0ZUZsYWdzLkNhc3RzU2hhZG93cylcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUZXh0dXJlIHtcclxuICAgIGlkOiBudW1iZXJcclxuICAgIHRleHR1cmU6IFdlYkdMVGV4dHVyZVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNwcml0ZU9wdGlvbnMge1xyXG4gICAgcG9zaXRpb24/OiBnZW8uUG9pbnRcclxuICAgIHdpZHRoPzogbnVtYmVyXHJcbiAgICBoZWlnaHQ/OiBudW1iZXJcclxuICAgIGxheWVyPzogbnVtYmVyXHJcbiAgICBjb2xvcj86IENvbG9yXHJcbiAgICB0ZXh0dXJlPzogVGV4dHVyZSB8IG51bGxcclxuICAgIGZsYWdzPzogU3ByaXRlRmxhZ3NcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNwcml0ZSB7XHJcbiAgICBwdWJsaWMgcG9zaXRpb246IGdlby5Qb2ludCA9IG5ldyBnZW8uUG9pbnQoMCwgMClcclxuICAgIHB1YmxpYyB3aWR0aDogbnVtYmVyID0gMFxyXG4gICAgcHVibGljIGhlaWdodDogbnVtYmVyID0gMFxyXG4gICAgcHVibGljIGxheWVyOiBudW1iZXIgPSAwXHJcbiAgICBwdWJsaWMgY29sb3I6IENvbG9yID0gWzEsIDEsIDEsIDFdXHJcbiAgICBwdWJsaWMgdGV4dHVyZTogVGV4dHVyZSB8IG51bGwgPSBudWxsXHJcbiAgICBwdWJsaWMgZmxhZ3M6IFNwcml0ZUZsYWdzID0gU3ByaXRlRmxhZ3MuTm9uZVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFNwcml0ZU9wdGlvbnMgPSB7fSkge1xyXG4gICAgICAgIGlmIChvcHRpb25zLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy53aWR0aCkge1xyXG4gICAgICAgICAgICB0aGlzLndpZHRoID0gb3B0aW9ucy53aWR0aFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmxheWVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGF5ZXIgPSBvcHRpb25zLmxheWVyXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5jb2xvcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvbG9yID0gb3B0aW9ucy5jb2xvclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMudGV4dHVyZSkge1xyXG4gICAgICAgICAgICB0aGlzLnRleHR1cmUgPSBvcHRpb25zLnRleHR1cmVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmZsYWdzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmxhZ3MgPSBvcHRpb25zLmZsYWdzXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jb25zdCBlbGVtc1BlclNwcml0ZVZlcnRleCA9IDlcclxuY29uc3Qgc3ByaXRlVmVydGV4U3RyaWRlID0gZWxlbXNQZXJTcHJpdGVWZXJ0ZXggKiA0XHJcblxyXG5pbnRlcmZhY2UgU3ByaXRlQmF0Y2gge1xyXG4gICAgdGV4dHVyZTogVGV4dHVyZSB8IG51bGxcclxuICAgIGZsYWdzOiBTcHJpdGVGbGFnc1xyXG4gICAgb2Zmc2V0OiBudW1iZXJcclxuICAgIG51bVNwcml0ZXM6IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUmVuZGVyZXIge1xyXG4gICAgLy8gdmVydGV4IGxheW91dDpcclxuICAgIC8vIHh5IHV2dyByZ2JhIChhbGwgZmxvYXQzMilcclxuICAgIHB1YmxpYyByZWFkb25seSBnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzaGFkb3dQcm9ncmFtOiBXZWJHTFByb2dyYW1cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlUHJvZ3JhbTogV2ViR0xQcm9ncmFtXHJcbiAgICBwcml2YXRlIHNoYWRvd01hcFRleHR1cmU6IFRleHR1cmVcclxuICAgIHByaXZhdGUgc2hhZG93TWFwRnJhbWVidWZmZXI6IFdlYkdMRnJhbWVidWZmZXJcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlTGl0VW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvblxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzcHJpdGVVc2VBcnJheVRleHR1cmVVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNwcml0ZVNhbXBsZXJVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNwcml0ZUFycmF5U2FtcGxlclVuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb25cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlVmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvblxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzcHJpdGVMaWdodFJhZGl1c1VuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb25cclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2hhZG93Vmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvblxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzYW1wbGVyOiBXZWJHTFNhbXBsZXJcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdmVydGV4QnVmZmVyOiBXZWJHTEJ1ZmZlclxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBpbmRleEJ1ZmZlcjogV2ViR0xCdWZmZXJcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3ByaXRlVmFvOiBXZWJHTFZlcnRleEFycmF5T2JqZWN0XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNoYWRvd1ZhbzogV2ViR0xWZXJ0ZXhBcnJheU9iamVjdFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSB3aGl0ZTF4MVRleHR1cmU6IFRleHR1cmVcclxuICAgIHByaXZhdGUgc3ByaXRlczogU3ByaXRlW10gPSBbXVxyXG4gICAgcHJpdmF0ZSBiYXRjaGVzOiBTcHJpdGVCYXRjaFtdID0gW11cclxuICAgIHByaXZhdGUgdmVydGljZXM6IEZsb2F0MzJBcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkoKVxyXG4gICAgcHJpdmF0ZSBpbmRpY2VzOiBVaW50MTZBcnJheSA9IG5ldyBVaW50MTZBcnJheSgpXHJcbiAgICBwcml2YXRlIHZpZXdwb3J0V2lkdGg6IG51bWJlciA9IDBcclxuICAgIHByaXZhdGUgdmlld3BvcnRIZWlnaHQ6IG51bWJlciA9IDBcclxuICAgIHByaXZhdGUgdGV4dHVyZUlkOiBudW1iZXIgPSAwXHJcblxyXG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZ2wgPSBnbHUuY3JlYXRlQ29udGV4dChjYW52YXMpXHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcblxyXG4gICAgICAgIHRoaXMuc2hhZG93UHJvZ3JhbSA9IGdsdS5jb21waWxlUHJvZ3JhbShnbCwgc2hhZG93VmVydGV4U3JjLCBzaGFkb3dGcmFnbWVudFNyYylcclxuICAgICAgICB0aGlzLnNwcml0ZVByb2dyYW0gPSBnbHUuY29tcGlsZVByb2dyYW0oZ2wsIHNwcml0ZVZlcnRleFNyYywgc3ByaXRlRnJhZ21lbnRTcmMpXHJcbiAgICAgICAgdGhpcy5zcHJpdGVMaXRVbmlmb3JtTG9jYXRpb24gPSBnbHUuZ2V0VW5pZm9ybUxvY2F0aW9uKGdsLCB0aGlzLnNwcml0ZVByb2dyYW0sIFwibGl0XCIpXHJcbiAgICAgICAgdGhpcy5zcHJpdGVVc2VBcnJheVRleHR1cmVVbmlmb3JtTG9jYXRpb24gPSBnbHUuZ2V0VW5pZm9ybUxvY2F0aW9uKGdsLCB0aGlzLnNwcml0ZVByb2dyYW0sIFwidXNlX2FycmF5X3RleHR1cmVcIilcclxuICAgICAgICB0aGlzLnNwcml0ZVNhbXBsZXJVbmlmb3JtTG9jYXRpb24gPSBnbHUuZ2V0VW5pZm9ybUxvY2F0aW9uKGdsLCB0aGlzLnNwcml0ZVByb2dyYW0sIFwic2FtcGxlclwiKVxyXG4gICAgICAgIHRoaXMuc3ByaXRlQXJyYXlTYW1wbGVyVW5pZm9ybUxvY2F0aW9uID0gZ2x1LmdldFVuaWZvcm1Mb2NhdGlvbihnbCwgdGhpcy5zcHJpdGVQcm9ncmFtLCBcImFycmF5X3NhbXBsZXJcIilcclxuICAgICAgICB0aGlzLnNwcml0ZVZpZXdwb3J0U2l6ZVVuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgXCJ2aWV3cG9ydF9zaXplXCIpXHJcbiAgICAgICAgdGhpcy5zcHJpdGVMaWdodFJhZGl1c1VuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc3ByaXRlUHJvZ3JhbSwgXCJsaWdodF9yYWRpdXNcIilcclxuICAgICAgICB0aGlzLnNoYWRvd1ZpZXdwb3J0U2l6ZVVuaWZvcm1Mb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHRoaXMuc2hhZG93UHJvZ3JhbSwgXCJ2aWV3cG9ydF9zaXplXCIpXHJcbiAgICAgICAgdGhpcy52ZXJ0ZXhCdWZmZXIgPSBnbHUuY3JlYXRlQnVmZmVyKGdsKVxyXG4gICAgICAgIHRoaXMuaW5kZXhCdWZmZXIgPSBnbHUuY3JlYXRlQnVmZmVyKGdsKVxyXG5cclxuICAgICAgICAvLyBkZWZhdWx0IDF4MSB3aGl0ZSB0ZXh0dXJlXHJcbiAgICAgICAgdGhpcy53aGl0ZTF4MVRleHR1cmUgPSB0aGlzLmNyZWF0ZVRleHR1cmUoKVxyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMud2hpdGUxeDFUZXh0dXJlLnRleHR1cmUpXHJcbiAgICAgICAgZ2wudGV4SW1hZ2UyRChnbC5URVhUVVJFXzJELCAwLCBnbC5SR0JBOCwgMSwgMSwgMCwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgbmV3IFVpbnQ4Q2xhbXBlZEFycmF5KFsyNTUsIDI1NSwgMjU1LCAyNTVdKSlcclxuXHJcbiAgICAgICAgLy8gc2V0dXAgc2FtcGxlclxyXG4gICAgICAgIHRoaXMuc2FtcGxlciA9IGdsdS5jcmVhdGVTYW1wbGVyKGdsKVxyXG4gICAgICAgIGdsLnNhbXBsZXJQYXJhbWV0ZXJpKHRoaXMuc2FtcGxlciwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5MSU5FQVIpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLkxJTkVBUl9NSVBNQVBfTElORUFSKVxyXG4gICAgICAgIGdsLnNhbXBsZXJQYXJhbWV0ZXJpKHRoaXMuc2FtcGxlciwgZ2wuVEVYVFVSRV9XUkFQX1IsIGdsLkNMQU1QX1RPX0VER0UpXHJcbiAgICAgICAgZ2wuc2FtcGxlclBhcmFtZXRlcmkodGhpcy5zYW1wbGVyLCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSlcclxuICAgICAgICBnbC5zYW1wbGVyUGFyYW1ldGVyaSh0aGlzLnNhbXBsZXIsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKVxyXG5cclxuICAgICAgICB0aGlzLnNwcml0ZVZhbyA9IGNyZWF0ZVNwcml0ZVZhbyh0aGlzLmdsLCB0aGlzLnNwcml0ZVByb2dyYW0sIHRoaXMudmVydGV4QnVmZmVyLCB0aGlzLmluZGV4QnVmZmVyKVxyXG4gICAgICAgIHRoaXMuc2hhZG93VmFvID0gY3JlYXRlU2hhZG93VmFvKHRoaXMuZ2wsIHRoaXMuc2hhZG93UHJvZ3JhbSwgdGhpcy52ZXJ0ZXhCdWZmZXIsIHRoaXMuaW5kZXhCdWZmZXIpXHJcblxyXG4gICAgICAgIHRoaXMuc2hhZG93TWFwVGV4dHVyZSA9IHRoaXMuY3JlYXRlVGV4dHVyZSgpXHJcbiAgICAgICAgdGhpcy5zaGFkb3dNYXBGcmFtZWJ1ZmZlciA9IGdsdS5jcmVhdGVGcmFtZWJ1ZmZlcihnbClcclxuICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnNoYWRvd01hcFRleHR1cmUudGV4dHVyZSlcclxuICAgICAgICBnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuc2hhZG93TWFwRnJhbWVidWZmZXIpXHJcbiAgICAgICAgZ2wuZnJhbWVidWZmZXJUZXh0dXJlMkQoZ2wuRlJBTUVCVUZGRVIsIGdsLkNPTE9SX0FUVEFDSE1FTlQwLCBnbC5URVhUVVJFXzJELCB0aGlzLnNoYWRvd01hcFRleHR1cmUudGV4dHVyZSwgMClcclxuICAgIH1cclxuXHJcbiAgICBiYWtlVGV4dHVyZUFycmF5KHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBpbWFnZXM6IFRleEltYWdlU291cmNlW10pOiBUZXh0dXJlIHtcclxuICAgICAgICAvLyBlYWNoIGltYWdlIG11c3QgYmUgdGhlIHNhbWUgc2l6ZVxyXG4gICAgICAgIGNvbnN0IGdsID0gdGhpcy5nbFxyXG4gICAgICAgIGNvbnN0IHRleHR1cmUgPSB0aGlzLmNyZWF0ZVRleHR1cmUoKVxyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkRfQVJSQVksIHRleHR1cmUudGV4dHVyZSlcclxuICAgICAgICBnbC50ZXhJbWFnZTNEKGdsLlRFWFRVUkVfMkRfQVJSQVksIDAsIGdsLlJHQkEsIHdpZHRoLCBoZWlnaHQsIGltYWdlcy5sZW5ndGgsIDAsIGdsLlJHQkEsIGdsLlVOU0lHTkVEX0JZVEUsIG51bGwpXHJcbiAgICAgICAgaW1hZ2VzLmZvckVhY2goKGltZywgaSkgPT4ge1xyXG4gICAgICAgICAgICBnbC50ZXhTdWJJbWFnZTNEKGdsLlRFWFRVUkVfMkRfQVJSQVksIDAsIDAsIDAsIGksIHdpZHRoLCBoZWlnaHQsIDEsIGdsLlJHQkEsIGdsLlVOU0lHTkVEX0JZVEUsIGltZylcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBnbC5nZW5lcmF0ZU1pcG1hcChnbC5URVhUVVJFXzJEX0FSUkFZKVxyXG5cclxuICAgICAgICByZXR1cm4gdGV4dHVyZVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGxvYWRUZXh0dXJlKHVybDogc3RyaW5nKTogUHJvbWlzZTxUZXh0dXJlPiB7XHJcbiAgICAgICAgLy8gZWFjaCBpbWFnZSBtdXN0IGJlIHRoZSBzYW1lIHNpemVcclxuICAgICAgICBjb25zdCBnbCA9IHRoaXMuZ2xcclxuICAgICAgICBjb25zdCB0ZXh0dXJlID0gYXdhaXQgZ2x1LmxvYWRUZXh0dXJlKGdsLCB1cmwpXHJcbiAgICAgICAgZ2wuZ2VuZXJhdGVNaXBtYXAoZ2wuVEVYVFVSRV8yRF9BUlJBWSlcclxuICAgICAgICB0aGlzLnRleHR1cmVJZCsrXHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLnRleHR1cmVJZCxcclxuICAgICAgICAgICAgdGV4dHVyZTogdGV4dHVyZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBkcmF3U3ByaXRlKHNwcml0ZTogU3ByaXRlKSB7XHJcbiAgICAgICAgLy8gYWRkIHNwcml0ZSB0byBhcnJheVxyXG4gICAgICAgIHRoaXMuc3ByaXRlcy5wdXNoKHNwcml0ZSlcclxuICAgIH1cclxuXHJcbiAgICBmbHVzaChsaWdodFJhZGl1czogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5jaGVja1NpemUoKVxyXG5cclxuICAgICAgICAvLyBERUJVRzogZHJhdyBzaGFkb3cgc3ByaXRlXHJcbiAgICAgICAgLy8gY29uc3Qgc3ByaXRlID0gbmV3IFNwcml0ZSh7XHJcbiAgICAgICAgLy8gICAgIHBvc2l0aW9uOiBuZXcgZ2VvLlBvaW50KDAsIDApLFxyXG4gICAgICAgIC8vICAgICB3aWR0aDogMTAyNCxcclxuICAgICAgICAvLyAgICAgaGVpZ2h0OiAxMDI0LFxyXG4gICAgICAgIC8vICAgICBjb2xvcjogWzEsIDEsIDEsIDFdLFxyXG4gICAgICAgIC8vICAgICB0ZXh0dXJlOiB0aGlzLnNoYWRvd01hcFRleHR1cmUsXHJcbiAgICAgICAgLy8gICAgIGZsYWdzOiBTcHJpdGVGbGFncy5GbGlwXHJcbiAgICAgICAgLy8gfSlcclxuICAgICAgICAvLyB0aGlzLmRyYXdTcHJpdGUoc3ByaXRlKVxyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuYmF0Y2hTcHJpdGVzKClcclxuICAgICAgICAvLyB0aGlzLmRyYXdTaGFkb3dzKClcclxuICAgICAgICB0aGlzLmRyYXdTcHJpdGVzKGxpZ2h0UmFkaXVzKVxyXG5cclxuICAgICAgICAvLyBjbGVhciBzcHJpdGVzIGFuZCBiYXRjaGVzXHJcbiAgICAgICAgdGhpcy5zcHJpdGVzID0gW11cclxuICAgICAgICB0aGlzLmJhdGNoZXMgPSBbXVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYmF0Y2hTcHJpdGVzKCkge1xyXG4gICAgICAgIC8vIGFzc2lnbiBkZWZhdWx0IHRleHR1cmUgdG8gc3ByaXRlcyB3aXRob3V0IGEgdGV4dHVyZVxyXG4gICAgICAgIGZvciAoY29uc3Qgc3ByaXRlIG9mIHRoaXMuc3ByaXRlcykge1xyXG4gICAgICAgICAgICBpZiAoIXNwcml0ZS50ZXh0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICBzcHJpdGUudGV4dHVyZSA9IHRoaXMud2hpdGUxeDFUZXh0dXJlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHNvcnQgc3ByaXRlc1xyXG4gICAgICAgIGNvbnN0IHNwcml0ZXMgPSB0aGlzLnNwcml0ZXNcclxuICAgICAgICBzcHJpdGVzLnNvcnQoKHMxLCBzMikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBpZDEgPSBzMS50ZXh0dXJlPy5pZCA/PyAwXHJcbiAgICAgICAgICAgIGNvbnN0IGlkMiA9IHMyLnRleHR1cmU/LmlkID8/IDBcclxuICAgICAgICAgICAgaWYgKGlkMSA8IGlkMikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChpZDEgPiBpZDIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAxXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlbmRlckZsYWdzMSA9IGdldF9zcHJpdGVfcmVuZGVyX2ZsYWdzKHMxLmZsYWdzKVxyXG4gICAgICAgICAgICBjb25zdCByZW5kZXJGbGFnczIgPSBnZXRfc3ByaXRlX3JlbmRlcl9mbGFncyhzMi5mbGFncylcclxuICAgICAgICAgICAgcmV0dXJuIHV0aWwuY29tcGFyZShyZW5kZXJGbGFnczEsIHJlbmRlckZsYWdzMilcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBsZXQgYmF0Y2g6IFNwcml0ZUJhdGNoID0ge1xyXG4gICAgICAgICAgICBmbGFnczogU3ByaXRlRmxhZ3MuTm9uZSxcclxuICAgICAgICAgICAgdGV4dHVyZTogbnVsbCxcclxuICAgICAgICAgICAgb2Zmc2V0OiAwLFxyXG4gICAgICAgICAgICBudW1TcHJpdGVzOiAwXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNwcml0ZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3Qgc3ByaXRlID0gc3ByaXRlc1tpXVxyXG4gICAgICAgICAgICBjb25zdCByZW5kZXJGbGFncyA9IGdldF9zcHJpdGVfcmVuZGVyX2ZsYWdzKHNwcml0ZS5mbGFncylcclxuICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgKHNwcml0ZS50ZXh0dXJlPy5pZCA/PyAwKSAhPT0gKGJhdGNoLnRleHR1cmU/LmlkID8/IDApIHx8XHJcbiAgICAgICAgICAgICAgICByZW5kZXJGbGFncyAhPT0gYmF0Y2guZmxhZ3MpIHtcclxuICAgICAgICAgICAgICAgIC8vIGFwcGVuZCBjdXJyZW50IGJhdGNoIGlmIGl0IGNvbnRhaW5zIGFueSBzcHJpdGVzXHJcbiAgICAgICAgICAgICAgICBpZiAoYmF0Y2gubnVtU3ByaXRlcyA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJhdGNoZXMucHVzaChiYXRjaClcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBiZWdpbiBuZXcgYmF0Y2hcclxuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGJhdGNoLm9mZnNldCArIGJhdGNoLm51bVNwcml0ZXNcclxuICAgICAgICAgICAgICAgIGJhdGNoID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGZsYWdzOiByZW5kZXJGbGFncyxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0dXJlOiBzcHJpdGUudGV4dHVyZSxcclxuICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IG9mZnNldCxcclxuICAgICAgICAgICAgICAgICAgICBudW1TcHJpdGVzOiAwXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGJhdGNoLm51bVNwcml0ZXMrK1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYXBwZW5kIGZpbmFsIGJhdGNoIGlmIGl0IGNvbnRhaW5zIGFueSBzcHJpdGVzXHJcbiAgICAgICAgaWYgKGJhdGNoLm51bVNwcml0ZXMgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmF0Y2hlcy5wdXNoKGJhdGNoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY29weSB2ZXJ0aWNlcyBhbmQgaW5kaWNlcyB0byBhcnJheXMsIGdyb3dpbmcgYXJyYXlzIGlmIHJlcXVpcmVkXHJcbiAgICAgICAgY29uc3QgbnVtVmVydGljZXMgPSB0aGlzLnNwcml0ZXMubGVuZ3RoICogNFxyXG4gICAgICAgIGNvbnN0IG51bVZlcnRleEVsZW1zID0gbnVtVmVydGljZXMgKiBlbGVtc1BlclNwcml0ZVZlcnRleFxyXG4gICAgICAgIGNvbnN0IGVsZW1zUGVyU3ByaXRlID0gNCAqIGVsZW1zUGVyU3ByaXRlVmVydGV4XHJcbiAgICAgICAgaWYgKHRoaXMudmVydGljZXMubGVuZ3RoIDwgbnVtVmVydGV4RWxlbXMpIHtcclxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNlcyA9IG5ldyBGbG9hdDMyQXJyYXkobnVtVmVydGV4RWxlbXMpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBudW1JbmRpY2VzID0gdGhpcy5zcHJpdGVzLmxlbmd0aCAqIDZcclxuICAgICAgICBpZiAodGhpcy5pbmRpY2VzLmxlbmd0aCA8IG51bUluZGljZXMpIHtcclxuICAgICAgICAgICAgdGhpcy5pbmRpY2VzID0gbmV3IFVpbnQxNkFycmF5KG51bUluZGljZXMpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc3ByaXRlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBzcHJpdGUgPSB0aGlzLnNwcml0ZXNbaV1cclxuICAgICAgICAgICAgbGV0IGVsZW1PZmZzZXQgPSBpICogZWxlbXNQZXJTcHJpdGVcclxuICAgICAgICAgICAgbGV0IGluZGV4T2Zmc2V0ID0gaSAqIDZcclxuICAgICAgICAgICAgbGV0IGJhc2VJbmRleCA9IGkgKiA0XHJcbiAgICAgICAgICAgIGNvbnN0IGZsaXAgPSAoc3ByaXRlLmZsYWdzICYgU3ByaXRlRmxhZ3MuRmxpcCkgPT09IFNwcml0ZUZsYWdzLkZsaXBcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFZlcnRleChlbGVtT2Zmc2V0LCBzcHJpdGUucG9zaXRpb24ueCwgc3ByaXRlLnBvc2l0aW9uLnksIDAsIGZsaXAgPyAxIDogMCwgc3ByaXRlLmxheWVyLCBzcHJpdGUuY29sb3JbMF0sIHNwcml0ZS5jb2xvclsxXSwgc3ByaXRlLmNvbG9yWzJdLCBzcHJpdGUuY29sb3JbM10pXHJcbiAgICAgICAgICAgIGVsZW1PZmZzZXQgKz0gZWxlbXNQZXJTcHJpdGVWZXJ0ZXhcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFZlcnRleChlbGVtT2Zmc2V0LCBzcHJpdGUucG9zaXRpb24ueCwgc3ByaXRlLnBvc2l0aW9uLnkgKyBzcHJpdGUuaGVpZ2h0LCAwLCBmbGlwID8gMCA6IDEsIHNwcml0ZS5sYXllciwgc3ByaXRlLmNvbG9yWzBdLCBzcHJpdGUuY29sb3JbMV0sIHNwcml0ZS5jb2xvclsyXSwgc3ByaXRlLmNvbG9yWzNdKVxyXG4gICAgICAgICAgICBlbGVtT2Zmc2V0ICs9IGVsZW1zUGVyU3ByaXRlVmVydGV4XHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hWZXJ0ZXgoZWxlbU9mZnNldCwgc3ByaXRlLnBvc2l0aW9uLnggKyBzcHJpdGUud2lkdGgsIHNwcml0ZS5wb3NpdGlvbi55ICsgc3ByaXRlLmhlaWdodCwgMSwgZmxpcCA/IDAgOiAxLCBzcHJpdGUubGF5ZXIsIHNwcml0ZS5jb2xvclswXSwgc3ByaXRlLmNvbG9yWzFdLCBzcHJpdGUuY29sb3JbMl0sIHNwcml0ZS5jb2xvclszXSlcclxuICAgICAgICAgICAgZWxlbU9mZnNldCArPSBlbGVtc1BlclNwcml0ZVZlcnRleFxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoVmVydGV4KGVsZW1PZmZzZXQsIHNwcml0ZS5wb3NpdGlvbi54ICsgc3ByaXRlLndpZHRoLCBzcHJpdGUucG9zaXRpb24ueSwgMSwgZmxpcCA/IDEgOiAwLCBzcHJpdGUubGF5ZXIsIHNwcml0ZS5jb2xvclswXSwgc3ByaXRlLmNvbG9yWzFdLCBzcHJpdGUuY29sb3JbMl0sIHNwcml0ZS5jb2xvclszXSlcclxuICAgICAgICAgICAgZWxlbU9mZnNldCArPSBlbGVtc1BlclNwcml0ZVZlcnRleFxyXG5cclxuICAgICAgICAgICAgdGhpcy5pbmRpY2VzW2luZGV4T2Zmc2V0XSA9IGJhc2VJbmRleFxyXG4gICAgICAgICAgICB0aGlzLmluZGljZXNbaW5kZXhPZmZzZXQgKyAxXSA9IGJhc2VJbmRleCArIDFcclxuICAgICAgICAgICAgdGhpcy5pbmRpY2VzW2luZGV4T2Zmc2V0ICsgMl0gPSBiYXNlSW5kZXggKyAyXHJcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlc1tpbmRleE9mZnNldCArIDNdID0gYmFzZUluZGV4XHJcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlc1tpbmRleE9mZnNldCArIDRdID0gYmFzZUluZGV4ICsgMlxyXG4gICAgICAgICAgICB0aGlzLmluZGljZXNbaW5kZXhPZmZzZXQgKyA1XSA9IGJhc2VJbmRleCArIDNcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHRyYW5zZmVyIHZlcnRpY2VzIGFuZCBpbmRpY2VzIHRvIEdQVVxyXG4gICAgICAgIGNvbnN0IGdsID0gdGhpcy5nbFxyXG4gICAgICAgIGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnZlcnRleEJ1ZmZlcilcclxuICAgICAgICBnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy52ZXJ0aWNlcy5zdWJhcnJheSgwLCB0aGlzLnNwcml0ZXMubGVuZ3RoICogNCAqIGVsZW1zUGVyU3ByaXRlKSwgZ2wuRFlOQU1JQ19EUkFXKVxyXG4gICAgICAgIGdsLmJpbmRCdWZmZXIoZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIHRoaXMuaW5kZXhCdWZmZXIpXHJcbiAgICAgICAgZ2wuYnVmZmVyRGF0YShnbC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgdGhpcy5pbmRpY2VzLnN1YmFycmF5KDAsIHRoaXMuc3ByaXRlcy5sZW5ndGggKiA2KSwgZ2wuRFlOQU1JQ19EUkFXKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd1NoYWRvd3MoKSB7XHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcbiAgICAgICAgZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLnNoYWRvd01hcEZyYW1lYnVmZmVyKVxyXG4gICAgICAgIGdsLnZpZXdwb3J0KDAsIDAsIGdsLmRyYXdpbmdCdWZmZXJXaWR0aCwgZ2wuZHJhd2luZ0J1ZmZlckhlaWdodClcclxuICAgICAgICBnbC5jbGVhckNvbG9yKDAsIDAsIDAsIDApXHJcbiAgICAgICAgZ2wuY2xlYXIoZ2wuQ09MT1JfQlVGRkVSX0JJVClcclxuICAgICAgICBnbC5iaW5kVmVydGV4QXJyYXkodGhpcy5zaGFkb3dWYW8pXHJcbiAgICAgICAgZ2wudXNlUHJvZ3JhbSh0aGlzLnNoYWRvd1Byb2dyYW0pXHJcbiAgICAgICAgZ2wudW5pZm9ybTJmKHRoaXMuc2hhZG93Vmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgZ2wuYmluZFZlcnRleEFycmF5KHRoaXMuc2hhZG93VmFvKVxyXG5cclxuICAgICAgICAvLyBkcmF3IGVhY2ggc2hhZG93IGNhc3RpbmcgYmF0Y2hcclxuICAgICAgICBmb3IgKGNvbnN0IGJhdGNoIG9mIHRoaXMuYmF0Y2hlcykge1xyXG4gICAgICAgICAgICBpZiAoIShiYXRjaC5mbGFncyAmIFNwcml0ZUZsYWdzLkNhc3RzU2hhZG93cykpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGdsLmRyYXdFbGVtZW50cyhnbC5UUklBTkdMRVMsIGJhdGNoLm51bVNwcml0ZXMgKiA2LCBnbC5VTlNJR05FRF9TSE9SVCwgYmF0Y2gub2Zmc2V0ICogNiAqIDIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhd1Nwcml0ZXMobGlnaHRSYWRpdXM6IG51bWJlcikge1xyXG4gICAgICAgIC8vIGRyYXcgdGhlIGJhdGNoZWQgc3ByaXRlc1xyXG4gICAgICAgIGNvbnN0IGdsID0gdGhpcy5nbFxyXG4gICAgICAgIGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbClcclxuICAgICAgICBnbC52aWV3cG9ydCgwLCAwLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgZ2wuY2xlYXJDb2xvcigwLCAwLCAwLCAxKVxyXG4gICAgICAgIGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpXHJcbiAgICAgICAgZ2wudXNlUHJvZ3JhbSh0aGlzLnNwcml0ZVByb2dyYW0pXHJcbiAgICAgICAgZ2wudW5pZm9ybTJmKHRoaXMuc3ByaXRlVmlld3BvcnRTaXplVW5pZm9ybUxvY2F0aW9uLCBnbC5kcmF3aW5nQnVmZmVyV2lkdGgsIGdsLmRyYXdpbmdCdWZmZXJIZWlnaHQpXHJcbiAgICAgICAgZ2wudW5pZm9ybTFmKHRoaXMuc3ByaXRlTGlnaHRSYWRpdXNVbmlmb3JtTG9jYXRpb24sIGxpZ2h0UmFkaXVzKVxyXG4gICAgICAgIGdsLmJpbmRWZXJ0ZXhBcnJheSh0aGlzLnNwcml0ZVZhbylcclxuXHJcbiAgICAgICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMClcclxuICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJEX0FSUkFZLCBudWxsKVxyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpXHJcbiAgICAgICAgZ2wuYmluZFNhbXBsZXIoMCwgdGhpcy5zYW1wbGVyKVxyXG5cclxuICAgICAgICBnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUxKVxyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkRfQVJSQVksIG51bGwpXHJcbiAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgbnVsbClcclxuICAgICAgICBnbC5iaW5kU2FtcGxlcigxLCB0aGlzLnNhbXBsZXIpXHJcblxyXG4gICAgICAgIGdsLnVuaWZvcm0xaSh0aGlzLnNwcml0ZVNhbXBsZXJVbmlmb3JtTG9jYXRpb24sIDApXHJcbiAgICAgICAgZ2wudW5pZm9ybTFpKHRoaXMuc3ByaXRlQXJyYXlTYW1wbGVyVW5pZm9ybUxvY2F0aW9uLCAxKVxyXG5cclxuICAgICAgICAvLyBkcmF3IGVhY2ggYmF0Y2hcclxuICAgICAgICBmb3IgKGNvbnN0IGJhdGNoIG9mIHRoaXMuYmF0Y2hlcykge1xyXG4gICAgICAgICAgICBjb25zdCB1c2VBcnJheVRleHR1cmUgPSBiYXRjaC5mbGFncyAmIFNwcml0ZUZsYWdzLkFycmF5VGV4dHVyZSA/IHRydWUgOiBmYWxzZVxyXG4gICAgICAgICAgICBjb25zdCB0ZXh0dXJlID0gYmF0Y2gudGV4dHVyZT8udGV4dHVyZSA/PyBudWxsXHJcblxyXG4gICAgICAgICAgICBpZiAodXNlQXJyYXlUZXh0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICBnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUxKVxyXG4gICAgICAgICAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRF9BUlJBWSwgdGV4dHVyZSlcclxuXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwKVxyXG4gICAgICAgICAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZ2wudW5pZm9ybTFpKHRoaXMuc3ByaXRlTGl0VW5pZm9ybUxvY2F0aW9uLCBiYXRjaC5mbGFncyAmIFNwcml0ZUZsYWdzLkxpdCA/IDEgOiAwKVxyXG4gICAgICAgICAgICBnbC51bmlmb3JtMWkodGhpcy5zcHJpdGVVc2VBcnJheVRleHR1cmVVbmlmb3JtTG9jYXRpb24sIHVzZUFycmF5VGV4dHVyZSA/IDEgOiAwKVxyXG4gICAgICAgICAgICBnbC5kcmF3RWxlbWVudHMoZ2wuVFJJQU5HTEVTLCBiYXRjaC5udW1TcHJpdGVzICogNiwgZ2wuVU5TSUdORURfU0hPUlQsIGJhdGNoLm9mZnNldCAqIDYgKiAyKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNyZWF0ZVRleHR1cmUoKTogVGV4dHVyZSB7XHJcbiAgICAgICAgKyt0aGlzLnRleHR1cmVJZFxyXG4gICAgICAgIGNvbnN0IHRleHR1cmU6IFRleHR1cmUgPSB7XHJcbiAgICAgICAgICAgIHRleHR1cmU6IGdsdS5jcmVhdGVUZXh0dXJlKHRoaXMuZ2wpLFxyXG4gICAgICAgICAgICBpZDogdGhpcy50ZXh0dXJlSWRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0ZXh0dXJlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwdXNoVmVydGV4KG9mZnNldDogbnVtYmVyLCB4OiBudW1iZXIsIHk6IG51bWJlciwgdTogbnVtYmVyLCB2OiBudW1iZXIsIHc6IG51bWJlciwgcjogbnVtYmVyLCBnOiBudW1iZXIsIGI6IG51bWJlciwgYTogbnVtYmVyKSB7XHJcbiAgICAgICAgLy8gcG9zaXRpb25cclxuICAgICAgICB0aGlzLnZlcnRpY2VzW29mZnNldF0gPSB4XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXQgKyAxXSA9IHlcclxuICAgICAgICAvLyB1dlxyXG4gICAgICAgIHRoaXMudmVydGljZXNbb2Zmc2V0ICsgMl0gPSB1XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXQgKyAzXSA9IHZcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW29mZnNldCArIDRdID0gd1xyXG4gICAgICAgIC8vIGNvbG9yXHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXQgKyA1XSA9IHJcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW29mZnNldCArIDZdID0gZ1xyXG4gICAgICAgIHRoaXMudmVydGljZXNbb2Zmc2V0ICsgN10gPSBiXHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tvZmZzZXQgKyA4XSA9IGFcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNoZWNrU2l6ZSgpIHtcclxuICAgICAgICBjb25zdCBjYW52YXMgPSB0aGlzLmNhbnZhc1xyXG4gICAgICAgIGlmIChjYW52YXMud2lkdGggIT09IGNhbnZhcy5jbGllbnRXaWR0aCAmJiBjYW52YXMuaGVpZ2h0ICE9PSBjYW52YXMuY2xpZW50SGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgICAgICAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzLmNsaWVudEhlaWdodFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGNhbnZhcy53aWR0aCA9PT0gdGhpcy52aWV3cG9ydFdpZHRoICYmIGNhbnZhcy5oZWlnaHQgPT09IHRoaXMudmlld3BvcnRIZWlnaHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnZpZXdwb3J0V2lkdGggPSBjYW52YXMud2lkdGhcclxuICAgICAgICB0aGlzLnZpZXdwb3J0SGVpZ2h0ID0gY2FudmFzLmhlaWdodFxyXG5cclxuICAgICAgICAvLyBzZXR1cCBzaGFkb3dtYXBwaW5nIHRleHR1cmUgYW5kIGZyYW1lYnVmZmVyXHJcbiAgICAgICAgY29uc3QgZ2wgPSB0aGlzLmdsXHJcbiAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5zaGFkb3dNYXBUZXh0dXJlLnRleHR1cmUpXHJcbiAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSk7XHJcbiAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2wuQ0xBTVBfVE9fRURHRSk7XHJcbiAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLkxJTkVBUik7XHJcbiAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BWF9MRVZFTCwgMCk7XHJcbiAgICAgICAgZ2wudGV4SW1hZ2UyRChnbC5URVhUVVJFXzJELCAwLCBnbC5SR0JBLCB0aGlzLnZpZXdwb3J0V2lkdGgsIHRoaXMudmlld3BvcnRIZWlnaHQsIDAsIGdsLlJHQkEsIGdsLlVOU0lHTkVEX0JZVEUsIG51bGwpXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVNwcml0ZVZhbyhcclxuICAgIGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LFxyXG4gICAgcHJvZ3JhbTogV2ViR0xQcm9ncmFtLFxyXG4gICAgdmVydGV4QnVmZmVyOiBXZWJHTEJ1ZmZlcixcclxuICAgIGluZGV4QnVmZmVyOiBXZWJHTEJ1ZmZlcik6IFdlYkdMVmVydGV4QXJyYXlPYmplY3Qge1xyXG4gICAgY29uc3QgdmFvID0gZ2x1LmNyZWF0ZVZlcnRleEFycmF5KGdsKVxyXG4gICAgZ2wuYmluZFZlcnRleEFycmF5KHZhbylcclxuXHJcbiAgICBjb25zdCBwb3NpdGlvbkF0dHJpYklkeCA9IGdsdS5nZXRBdHRyaWJMb2NhdGlvbihnbCwgcHJvZ3JhbSwgXCJpbl9wb3NpdGlvblwiKVxyXG4gICAgY29uc3QgdXZ3QXR0cmliSWR4ID0gZ2x1LmdldEF0dHJpYkxvY2F0aW9uKGdsLCBwcm9ncmFtLCBcImluX3V2d1wiKVxyXG4gICAgY29uc3QgY29sb3JBdHRyaWJJZHggPSBnbHUuZ2V0QXR0cmliTG9jYXRpb24oZ2wsIHByb2dyYW0sIFwiaW5fY29sb3JcIilcclxuICAgIGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB2ZXJ0ZXhCdWZmZXIpXHJcbiAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShwb3NpdGlvbkF0dHJpYklkeClcclxuICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHV2d0F0dHJpYklkeClcclxuICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KGNvbG9yQXR0cmliSWR4KVxyXG4gICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcihwb3NpdGlvbkF0dHJpYklkeCwgMiwgZ2wuRkxPQVQsIGZhbHNlLCBzcHJpdGVWZXJ0ZXhTdHJpZGUsIDApXHJcbiAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHV2d0F0dHJpYklkeCwgMywgZ2wuRkxPQVQsIGZhbHNlLCBzcHJpdGVWZXJ0ZXhTdHJpZGUsIDgpXHJcbiAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKGNvbG9yQXR0cmliSWR4LCA0LCBnbC5GTE9BVCwgZmFsc2UsIHNwcml0ZVZlcnRleFN0cmlkZSwgMjApXHJcbiAgICBnbC5iaW5kQnVmZmVyKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCBpbmRleEJ1ZmZlcilcclxuICAgIHJldHVybiB2YW9cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlU2hhZG93VmFvKFxyXG4gICAgZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQsXHJcbiAgICBwcm9ncmFtOiBXZWJHTFByb2dyYW0sXHJcbiAgICB2ZXJ0ZXhCdWZmZXI6IFdlYkdMQnVmZmVyLFxyXG4gICAgaW5kZXhCdWZmZXI6IFdlYkdMQnVmZmVyKTogV2ViR0xWZXJ0ZXhBcnJheU9iamVjdCB7XHJcbiAgICBjb25zdCB2YW8gPSBnbHUuY3JlYXRlVmVydGV4QXJyYXkoZ2wpXHJcbiAgICBnbC5iaW5kVmVydGV4QXJyYXkodmFvKVxyXG5cclxuICAgIGNvbnN0IHBvc2l0aW9uQXR0cmliSWR4ID0gZ2x1LmdldEF0dHJpYkxvY2F0aW9uKGdsLCBwcm9ncmFtLCBcImluX3Bvc2l0aW9uXCIpXHJcbiAgICBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdmVydGV4QnVmZmVyKVxyXG4gICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkocG9zaXRpb25BdHRyaWJJZHgpXHJcbiAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHBvc2l0aW9uQXR0cmliSWR4LCAyLCBnbC5GTE9BVCwgZmFsc2UsIHNwcml0ZVZlcnRleFN0cmlkZSwgMClcclxuICAgIGdsLmJpbmRCdWZmZXIoZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIGluZGV4QnVmZmVyKVxyXG4gICAgcmV0dXJuIHZhb1xyXG59Il19