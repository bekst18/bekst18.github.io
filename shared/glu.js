/* webgl utility library */
import * as dom from "./dom.js";
/**
 * create webgl2 rendering context
 */
export function createContext(canvas, options) {
    const gl = canvas.getContext("webgl2", options);
    if (!gl) {
        throw new Error("Failed to not initialize webgl 2.0. Confirm that your browser is up to date and has support.");
    }
    return gl;
}
/**
 *
 * @param gl gl context
 * @param type type of shader to create
 * @param source shader source
 */
export function createShader(gl, type, source) {
    var _a;
    const shader = gl.createShader(type);
    if (!shader) {
        throw new Error("Failed to create shader");
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return shader;
    }
    const message = "Failed to compile shader: " + ((_a = gl.getShaderInfoLog(shader)) !== null && _a !== void 0 ? _a : "");
    gl.deleteShader(shader);
    throw new Error(message);
}
/**
 * create a gl program from shaders
 * @param gl gl context
 * @param vertexShader vertex shader to link
 * @param fragmentShader fragment shader to link
 */
export function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    if (!program) {
        throw new Error("Failed to create shader program");
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return program;
    }
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Failed to link program: ${message !== null && message !== void 0 ? message : ""}`);
}
/**
 * compile and link the vertex and fragment shader source
 * @param gl gl context
 * @param vertexSrc vertex shader source
 * @param fragmentSrc fragment shader source
 */
export function compileProgram(gl, vertexSrc, fragmentSrc) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSrc);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
    const program = createProgram(gl, vertexShader, fragmentShader);
    return program;
}
/**
 * create a buffer, throw an exception on failure
 * @param gl gl context
 */
export function createBuffer(gl) {
    const buffer = gl.createBuffer();
    if (!buffer) {
        throw new Error("Failed to create buffer");
    }
    return buffer;
}
/**
 * Retreive location for uniform, throws exception if not found
 * @param gl gl context
 * @param program gl program
 * @param name name of uniform
 */
export function getUniformLocation(gl, program, name) {
    const location = gl.getUniformLocation(program, name);
    if (!location) {
        throw new Error(`Failed to retrieve location of ${name} uniform.`);
    }
    return location;
}
/**
 * Retreive location for attribute, throws exception if not found
 * @param gl gl context
 * @param program gl program
 * @param name name of attribute
 */
export function getAttribLocation(gl, program, name) {
    const attribLocation = gl.getAttribLocation(program, name);
    if (attribLocation < 0) {
        throw new Error(`${name} attribute was not found`);
    }
    return attribLocation;
}
/**
 * create a vertex array object, throw exception on failure
 * @param gl gl context
 */
export function createVertexArray(gl) {
    const vao = gl.createVertexArray();
    if (!vao) {
        throw new Error("failed to create vertex array object");
    }
    return vao;
}
/**
 * create a texture object, throw an exception on failure
 * @param gl gl context
 */
export function createTexture(gl) {
    const texture = gl.createTexture();
    if (!texture) {
        throw new Error("failed to create texture object");
    }
    return texture;
}
/**
 * create a renderbuffer object, throw an exception on failure
 * @param gl gl context
 */
export function createRenderbuffer(gl) {
    const buffer = gl.createRenderbuffer();
    if (!buffer) {
        throw new Error("Failed to create renderbuffer object");
    }
    return buffer;
}
/**
 * create a sampler object, throw an exception on failure
 * @param gl gl context
 */
export function createSampler(gl) {
    const sampler = gl.createSampler();
    if (!sampler) {
        throw new Error("failed to create sampler object");
    }
    return sampler;
}
/**
 * load a texture from the specified file
 * @param gl gl context
 * @param url url from which to load texture
 */
export async function loadTexture(gl, url) {
    const texture = createTexture(gl);
    const image = await dom.loadImage(url);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    return texture;
}
/**
 * Create a framebuffer object, throw exception on failure
 * @param gl gl context
 */
export function createFramebuffer(gl) {
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
        throw new Error("Failed to create framebuffer object");
    }
    return framebuffer;
}
/* shader fragments */
const perlin2 = `
// permutation table
const int perm[512] = int[](
    23,
    125,
    161,
    52,
    103,
    117,
    70,
    37,
    247,
    101,
    203,
    169,
    124,
    126,
    44,
    123,
    152,
    238,
    145,
    45,
    171,
    114,
    253,
    10,
    192,
    136,
    4,
    157,
    249,
    30,
    35,
    72,
    175,
    63,
    77,
    90,
    181,
    16,
    96,
    111,
    133,
    104,
    75,
    162,
    93,
    56,
    66,
    240,
    8,
    50,
    84,
    229,
    49,
    210,
    173,
    239,
    141,
    1,
    87,
    18,
    2,
    198,
    143,
    57,
    225,
    160,
    58,
    217,
    168,
    206,
    245,
    204,
    199,
    6,
    73,
    60,
    20,
    230,
    211,
    233,
    94,
    200,
    88,
    9,
    74,
    155,
    33,
    15,
    219,
    130,
    226,
    202,
    83,
    236,
    42,
    172,
    165,
    218,
    55,
    222,
    46,
    107,
    98,
    154,
    109,
    67,
    196,
    178,
    127,
    158,
    13,
    243,
    65,
    79,
    166,
    248,
    25,
    224,
    115,
    80,
    68,
    51,
    184,
    128,
    232,
    208,
    151,
    122,
    26,
    212,
    105,
    43,
    179,
    213,
    235,
    148,
    146,
    89,
    14,
    195,
    28,
    78,
    112,
    76,
    250,
    47,
    24,
    251,
    140,
    108,
    186,
    190,
    228,
    170,
    183,
    139,
    39,
    188,
    244,
    246,
    132,
    48,
    119,
    144,
    180,
    138,
    134,
    193,
    82,
    182,
    120,
    121,
    86,
    220,
    209,
    3,
    91,
    241,
    149,
    85,
    205,
    150,
    113,
    216,
    31,
    100,
    41,
    164,
    177,
    214,
    153,
    231,
    38,
    71,
    185,
    174,
    97,
    201,
    29,
    95,
    7,
    92,
    54,
    254,
    191,
    118,
    34,
    221,
    131,
    11,
    163,
    99,
    234,
    81,
    227,
    147,
    156,
    176,
    17,
    142,
    69,
    12,
    110,
    62,
    27,
    255,
    0,
    194,
    59,
    116,
    242,
    252,
    19,
    21,
    187,
    53,
    207,
    129,
    64,
    135,
    61,
    40,
    167,
    237,
    102,
    223,
    106,
    159,
    197,
    189,
    215,
    137,
    36,
    32,
    22,
    5,

    // and a second copy so we don't need an extra mask or static initializer
    23,
    125,
    161,
    52,
    103,
    117,
    70,
    37,
    247,
    101,
    203,
    169,
    124,
    126,
    44,
    123,
    152,
    238,
    145,
    45,
    171,
    114,
    253,
    10,
    192,
    136,
    4,
    157,
    249,
    30,
    35,
    72,
    175,
    63,
    77,
    90,
    181,
    16,
    96,
    111,
    133,
    104,
    75,
    162,
    93,
    56,
    66,
    240,
    8,
    50,
    84,
    229,
    49,
    210,
    173,
    239,
    141,
    1,
    87,
    18,
    2,
    198,
    143,
    57,
    225,
    160,
    58,
    217,
    168,
    206,
    245,
    204,
    199,
    6,
    73,
    60,
    20,
    230,
    211,
    233,
    94,
    200,
    88,
    9,
    74,
    155,
    33,
    15,
    219,
    130,
    226,
    202,
    83,
    236,
    42,
    172,
    165,
    218,
    55,
    222,
    46,
    107,
    98,
    154,
    109,
    67,
    196,
    178,
    127,
    158,
    13,
    243,
    65,
    79,
    166,
    248,
    25,
    224,
    115,
    80,
    68,
    51,
    184,
    128,
    232,
    208,
    151,
    122,
    26,
    212,
    105,
    43,
    179,
    213,
    235,
    148,
    146,
    89,
    14,
    195,
    28,
    78,
    112,
    76,
    250,
    47,
    24,
    251,
    140,
    108,
    186,
    190,
    228,
    170,
    183,
    139,
    39,
    188,
    244,
    246,
    132,
    48,
    119,
    144,
    180,
    138,
    134,
    193,
    82,
    182,
    120,
    121,
    86,
    220,
    209,
    3,
    91,
    241,
    149,
    85,
    205,
    150,
    113,
    216,
    31,
    100,
    41,
    164,
    177,
    214,
    153,
    231,
    38,
    71,
    185,
    174,
    97,
    201,
    29,
    95,
    7,
    92,
    54,
    254,
    191,
    118,
    34,
    221,
    131,
    11,
    163,
    99,
    234,
    81,
    227,
    147,
    156,
    176,
    17,
    142,
    69,
    12,
    110,
    62,
    27,
    255,
    0,
    194,
    59,
    116,
    242,
    252,
    19,
    21,
    187,
    53,
    207,
    129,
    64,
    135,
    61,
    40,
    167,
    237,
    102,
    223,
    106,
    159,
    197,
    189,
    215,
    137,
    36,
    32,
    22,
    5
);

// calculates dot product of x, y and gradient
float grad1(const int hash, const float x) {
    return (hash & 1) == 0x0 ? -x : x;
}

// calculates dot product of x, y and gradient
float grad2(const int hash, const float x, const float y) {
    int h = hash & 0x03;
    switch (h) {
    case 0x00:
        // (-1, 0)
        return -x;
        break;
    case 0x01:
        // (1, 0)
        return x;
        break;
    case 0x02:
        // (0, -1)
        return -y;
        break;
    case 0x03:
        // (0, 1)
        return y;
        break;
    default:
        return 0.f;
    }
}
    
float smootherstep(const float x) {
    return x * x * x * (x * (x * 6.f - 15.f) + 10.f);
}

float perlin1(const float xx) {
    int xf = int(floor(xx));
    float x = xx - float(xf);
    float u = smootherstep(x);
    int x0 = xf & 255;
    int x1 = (xf + 1) & 255;
    float n0 = grad1(perm[x0], x);
    float n1 = grad1(perm[x1], x - 1.f);
    float n = mix(n0, n1, u);
    return n;
}

float perlin2(const float xx, const float yy) {
    int xf = int(floor(xx));
    int yf = int(floor(yy));
    float x = xx - float(xf);
    float y = yy - float(yf);
    float u = smootherstep(x);
    float v = smootherstep(y);
    int x0 = xf & 255;
    int y0 = yf & 255;
    int x1 = (xf + 1) & 255;
    int y1 = (yf + 1) & 255;
    int r0 = perm[x0];
    int r1 = perm[x1];
    int r00 = perm[r0 + y0];
    int r01 = perm[r0 + y1];
    int r10 = perm[r1 + y0];
    int r11 = perm[r1 + y1];
    float n00 = grad2(r00, x, y);
    float n01 = grad2(r01, x, y - 1.f);
    float n10 = grad2(r10, x - 1.f, y);
    float n11 = grad2(r11, x - 1.f, y - 1.f);
    float n0 = mix(n00, n01, v);
    float n1 = mix(n10, n11, v);
    float n = mix(n0, n1, u);
    return n;
}

float fbm2(const float x, const float y, const float lacunarity, const float gain, const int octaves) {
    float freq = 1.f;
    float amp = 1.f;
    float sum = 0.f;
    for (int i = 0; i < octaves; ++i) {
        sum += amp * perlin2(x * freq, y * freq);
        freq *= lacunarity;
        amp *= gain;
    }

    return sum;
}
`;
export { perlin2 };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2x1LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2x1LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJCQUEyQjtBQUMzQixPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQjs7R0FFRztBQUNILE1BQU0sVUFBVSxhQUFhLENBQUMsTUFBeUIsRUFBRSxPQUFnQztJQUNyRixNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUMvQyxJQUFJLENBQUMsRUFBRSxFQUFFO1FBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyw4RkFBOEYsQ0FBQyxDQUFBO0tBQ2xIO0lBRUQsT0FBTyxFQUFFLENBQUE7QUFDYixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsWUFBWSxDQUFDLEVBQTBCLEVBQUUsSUFBWSxFQUFFLE1BQWM7O0lBQ2pGLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDcEMsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNULE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtLQUM3QztJQUVELEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQy9CLEVBQUUsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7SUFFeEIsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRTtRQUNsRCxPQUFPLE1BQU0sQ0FBQTtLQUNoQjtJQUVELE1BQU0sT0FBTyxHQUFHLDRCQUE0QixHQUFHLE9BQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxtQ0FBSSxFQUFFLENBQUMsQ0FBQTtJQUNsRixFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMs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Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBNGxCZixDQUFBO0FBRUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyogd2ViZ2wgdXRpbGl0eSBsaWJyYXJ5ICovXHJcbmltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi9kb20uanNcIlxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSB3ZWJnbDIgcmVuZGVyaW5nIGNvbnRleHRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDb250ZXh0KGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQsIG9wdGlvbnM/OiBXZWJHTENvbnRleHRBdHRyaWJ1dGVzKTogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCB7XHJcbiAgICBjb25zdCBnbCA9IGNhbnZhcy5nZXRDb250ZXh0KFwid2ViZ2wyXCIsIG9wdGlvbnMpXHJcbiAgICBpZiAoIWdsKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIG5vdCBpbml0aWFsaXplIHdlYmdsIDIuMC4gQ29uZmlybSB0aGF0IHlvdXIgYnJvd3NlciBpcyB1cCB0byBkYXRlIGFuZCBoYXMgc3VwcG9ydC5cIilcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZ2xcclxufVxyXG5cclxuLyoqXHJcbiAqIFxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKiBAcGFyYW0gdHlwZSB0eXBlIG9mIHNoYWRlciB0byBjcmVhdGVcclxuICogQHBhcmFtIHNvdXJjZSBzaGFkZXIgc291cmNlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2hhZGVyKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LCB0eXBlOiBHTGVudW0sIHNvdXJjZTogc3RyaW5nKTogV2ViR0xTaGFkZXIge1xyXG4gICAgY29uc3Qgc2hhZGVyID0gZ2wuY3JlYXRlU2hhZGVyKHR5cGUpXHJcbiAgICBpZiAoIXNoYWRlcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBjcmVhdGUgc2hhZGVyXCIpXHJcbiAgICB9XHJcblxyXG4gICAgZ2wuc2hhZGVyU291cmNlKHNoYWRlciwgc291cmNlKVxyXG4gICAgZ2wuY29tcGlsZVNoYWRlcihzaGFkZXIpXHJcblxyXG4gICAgaWYgKGdsLmdldFNoYWRlclBhcmFtZXRlcihzaGFkZXIsIGdsLkNPTVBJTEVfU1RBVFVTKSkge1xyXG4gICAgICAgIHJldHVybiBzaGFkZXJcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBtZXNzYWdlID0gXCJGYWlsZWQgdG8gY29tcGlsZSBzaGFkZXI6IFwiICsgKGdsLmdldFNoYWRlckluZm9Mb2coc2hhZGVyKSA/PyBcIlwiKVxyXG4gICAgZ2wuZGVsZXRlU2hhZGVyKHNoYWRlcilcclxuICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKVxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGEgZ2wgcHJvZ3JhbSBmcm9tIHNoYWRlcnNcclxuICogQHBhcmFtIGdsIGdsIGNvbnRleHRcclxuICogQHBhcmFtIHZlcnRleFNoYWRlciB2ZXJ0ZXggc2hhZGVyIHRvIGxpbmtcclxuICogQHBhcmFtIGZyYWdtZW50U2hhZGVyIGZyYWdtZW50IHNoYWRlciB0byBsaW5rXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJvZ3JhbShnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCwgdmVydGV4U2hhZGVyOiBXZWJHTFNoYWRlciwgZnJhZ21lbnRTaGFkZXI6IFdlYkdMU2hhZGVyKTogV2ViR0xQcm9ncmFtIHtcclxuICAgIGNvbnN0IHByb2dyYW0gPSBnbC5jcmVhdGVQcm9ncmFtKCk7XHJcbiAgICBpZiAoIXByb2dyYW0pIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gY3JlYXRlIHNoYWRlciBwcm9ncmFtXCIpXHJcbiAgICB9XHJcblxyXG4gICAgZ2wuYXR0YWNoU2hhZGVyKHByb2dyYW0sIHZlcnRleFNoYWRlcik7XHJcbiAgICBnbC5hdHRhY2hTaGFkZXIocHJvZ3JhbSwgZnJhZ21lbnRTaGFkZXIpO1xyXG4gICAgZ2wubGlua1Byb2dyYW0ocHJvZ3JhbSk7XHJcblxyXG4gICAgaWYgKGdsLmdldFByb2dyYW1QYXJhbWV0ZXIocHJvZ3JhbSwgZ2wuTElOS19TVEFUVVMpKSB7XHJcbiAgICAgICAgcmV0dXJuIHByb2dyYW1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBtZXNzYWdlID0gZ2wuZ2V0UHJvZ3JhbUluZm9Mb2cocHJvZ3JhbSlcclxuICAgIGdsLmRlbGV0ZVByb2dyYW0ocHJvZ3JhbSk7XHJcblxyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gbGluayBwcm9ncmFtOiAke21lc3NhZ2UgPz8gXCJcIn1gKVxyXG59XHJcblxyXG4vKipcclxuICogY29tcGlsZSBhbmQgbGluayB0aGUgdmVydGV4IGFuZCBmcmFnbWVudCBzaGFkZXIgc291cmNlXHJcbiAqIEBwYXJhbSBnbCBnbCBjb250ZXh0XHJcbiAqIEBwYXJhbSB2ZXJ0ZXhTcmMgdmVydGV4IHNoYWRlciBzb3VyY2VcclxuICogQHBhcmFtIGZyYWdtZW50U3JjIGZyYWdtZW50IHNoYWRlciBzb3VyY2VcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlUHJvZ3JhbShnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCwgdmVydGV4U3JjOiBzdHJpbmcsIGZyYWdtZW50U3JjOiBzdHJpbmcpOiBXZWJHTFByb2dyYW0ge1xyXG4gICAgY29uc3QgdmVydGV4U2hhZGVyID0gY3JlYXRlU2hhZGVyKGdsLCBnbC5WRVJURVhfU0hBREVSLCB2ZXJ0ZXhTcmMpXHJcbiAgICBjb25zdCBmcmFnbWVudFNoYWRlciA9IGNyZWF0ZVNoYWRlcihnbCwgZ2wuRlJBR01FTlRfU0hBREVSLCBmcmFnbWVudFNyYylcclxuICAgIGNvbnN0IHByb2dyYW0gPSBjcmVhdGVQcm9ncmFtKGdsLCB2ZXJ0ZXhTaGFkZXIsIGZyYWdtZW50U2hhZGVyKVxyXG4gICAgcmV0dXJuIHByb2dyYW1cclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBhIGJ1ZmZlciwgdGhyb3cgYW4gZXhjZXB0aW9uIG9uIGZhaWx1cmVcclxuICogQHBhcmFtIGdsIGdsIGNvbnRleHRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVCdWZmZXIoZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQpOiBXZWJHTEJ1ZmZlciB7XHJcbiAgICBjb25zdCBidWZmZXIgPSBnbC5jcmVhdGVCdWZmZXIoKVxyXG4gICAgaWYgKCFidWZmZXIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gY3JlYXRlIGJ1ZmZlclwiKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBidWZmZXJcclxufVxyXG5cclxuLyoqXHJcbiAqIFJldHJlaXZlIGxvY2F0aW9uIGZvciB1bmlmb3JtLCB0aHJvd3MgZXhjZXB0aW9uIGlmIG5vdCBmb3VuZFxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKiBAcGFyYW0gcHJvZ3JhbSBnbCBwcm9ncmFtXHJcbiAqIEBwYXJhbSBuYW1lIG5hbWUgb2YgdW5pZm9ybVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaWZvcm1Mb2NhdGlvbihnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCwgcHJvZ3JhbTogV2ViR0xQcm9ncmFtLCBuYW1lOiBzdHJpbmcpOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiB7XHJcbiAgICBjb25zdCBsb2NhdGlvbiA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9ncmFtLCBuYW1lKVxyXG4gICAgaWYgKCFsb2NhdGlvbikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHJldHJpZXZlIGxvY2F0aW9uIG9mICR7bmFtZX0gdW5pZm9ybS5gKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBsb2NhdGlvblxyXG59XHJcblxyXG4vKipcclxuICogUmV0cmVpdmUgbG9jYXRpb24gZm9yIGF0dHJpYnV0ZSwgdGhyb3dzIGV4Y2VwdGlvbiBpZiBub3QgZm91bmRcclxuICogQHBhcmFtIGdsIGdsIGNvbnRleHRcclxuICogQHBhcmFtIHByb2dyYW0gZ2wgcHJvZ3JhbVxyXG4gKiBAcGFyYW0gbmFtZSBuYW1lIG9mIGF0dHJpYnV0ZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEF0dHJpYkxvY2F0aW9uKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LCBwcm9ncmFtOiBXZWJHTFByb2dyYW0sIG5hbWU6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgICBjb25zdCBhdHRyaWJMb2NhdGlvbiA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHByb2dyYW0sIG5hbWUpXHJcbiAgICBpZiAoYXR0cmliTG9jYXRpb24gPCAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke25hbWV9IGF0dHJpYnV0ZSB3YXMgbm90IGZvdW5kYClcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYXR0cmliTG9jYXRpb25cclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBhIHZlcnRleCBhcnJheSBvYmplY3QsIHRocm93IGV4Y2VwdGlvbiBvbiBmYWlsdXJlXHJcbiAqIEBwYXJhbSBnbCBnbCBjb250ZXh0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVmVydGV4QXJyYXkoZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQpOiBXZWJHTFZlcnRleEFycmF5T2JqZWN0IHtcclxuICAgIGNvbnN0IHZhbyA9IGdsLmNyZWF0ZVZlcnRleEFycmF5KClcclxuICAgIGlmICghdmFvKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZmFpbGVkIHRvIGNyZWF0ZSB2ZXJ0ZXggYXJyYXkgb2JqZWN0XCIpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZhb1xyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGEgdGV4dHVyZSBvYmplY3QsIHRocm93IGFuIGV4Y2VwdGlvbiBvbiBmYWlsdXJlXHJcbiAqIEBwYXJhbSBnbCBnbCBjb250ZXh0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVGV4dHVyZShnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCk6IFdlYkdMVGV4dHVyZSB7XHJcbiAgICBjb25zdCB0ZXh0dXJlID0gZ2wuY3JlYXRlVGV4dHVyZSgpXHJcbiAgICBpZiAoIXRleHR1cmUpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJmYWlsZWQgdG8gY3JlYXRlIHRleHR1cmUgb2JqZWN0XCIpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRleHR1cmVcclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBhIHJlbmRlcmJ1ZmZlciBvYmplY3QsIHRocm93IGFuIGV4Y2VwdGlvbiBvbiBmYWlsdXJlXHJcbiAqIEBwYXJhbSBnbCBnbCBjb250ZXh0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVuZGVyYnVmZmVyKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0KTogV2ViR0xSZW5kZXJidWZmZXIge1xyXG4gICAgY29uc3QgYnVmZmVyID0gZ2wuY3JlYXRlUmVuZGVyYnVmZmVyKClcclxuICAgIGlmICghYnVmZmVyKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGNyZWF0ZSByZW5kZXJidWZmZXIgb2JqZWN0XCIpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGJ1ZmZlclxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGEgc2FtcGxlciBvYmplY3QsIHRocm93IGFuIGV4Y2VwdGlvbiBvbiBmYWlsdXJlXHJcbiAqIEBwYXJhbSBnbCBnbCBjb250ZXh0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2FtcGxlcihnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCk6IFdlYkdMU2FtcGxlciB7XHJcbiAgICBjb25zdCBzYW1wbGVyID0gZ2wuY3JlYXRlU2FtcGxlcigpXHJcbiAgICBpZiAoIXNhbXBsZXIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJmYWlsZWQgdG8gY3JlYXRlIHNhbXBsZXIgb2JqZWN0XCIpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHNhbXBsZXJcclxufVxyXG5cclxuLyoqXHJcbiAqIGxvYWQgYSB0ZXh0dXJlIGZyb20gdGhlIHNwZWNpZmllZCBmaWxlXHJcbiAqIEBwYXJhbSBnbCBnbCBjb250ZXh0XHJcbiAqIEBwYXJhbSB1cmwgdXJsIGZyb20gd2hpY2ggdG8gbG9hZCB0ZXh0dXJlXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZFRleHR1cmUoZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQsIHVybDogc3RyaW5nKTogUHJvbWlzZTxXZWJHTFRleHR1cmU+IHtcclxuICAgIGNvbnN0IHRleHR1cmUgPSBjcmVhdGVUZXh0dXJlKGdsKVxyXG4gICAgY29uc3QgaW1hZ2UgPSBhd2FpdCBkb20ubG9hZEltYWdlKHVybClcclxuICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUpXHJcbiAgICBnbC50ZXhJbWFnZTJEKGdsLlRFWFRVUkVfMkQsIDAsIGdsLlJHQkEsIGdsLlJHQkEsIGdsLlVOU0lHTkVEX0JZVEUsIGltYWdlKVxyXG4gICAgZ2wuZ2VuZXJhdGVNaXBtYXAoZ2wuVEVYVFVSRV8yRClcclxuICAgIHJldHVybiB0ZXh0dXJlXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgYSBmcmFtZWJ1ZmZlciBvYmplY3QsIHRocm93IGV4Y2VwdGlvbiBvbiBmYWlsdXJlXHJcbiAqIEBwYXJhbSBnbCBnbCBjb250ZXh0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRnJhbWVidWZmZXIoZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQpOiBXZWJHTEZyYW1lYnVmZmVyIHtcclxuICAgIGNvbnN0IGZyYW1lYnVmZmVyID0gZ2wuY3JlYXRlRnJhbWVidWZmZXIoKVxyXG4gICAgaWYgKCFmcmFtZWJ1ZmZlcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBjcmVhdGUgZnJhbWVidWZmZXIgb2JqZWN0XCIpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZyYW1lYnVmZmVyXHJcbn1cclxuXHJcbi8qIHNoYWRlciBmcmFnbWVudHMgKi9cclxuY29uc3QgcGVybGluMiA9IGBcclxuLy8gcGVybXV0YXRpb24gdGFibGVcclxuY29uc3QgaW50IHBlcm1bNTEyXSA9IGludFtdKFxyXG4gICAgMjMsXHJcbiAgICAxMjUsXHJcbiAgICAxNjEsXHJcbiAgICA1MixcclxuICAgIDEwMyxcclxuICAgIDExNyxcclxuICAgIDcwLFxyXG4gICAgMzcsXHJcbiAgICAyNDcsXHJcbiAgICAxMDEsXHJcbiAgICAyMDMsXHJcbiAgICAxNjksXHJcbiAgICAxMjQsXHJcbiAgICAxMjYsXHJcbiAgICA0NCxcclxuICAgIDEyMyxcclxuICAgIDE1MixcclxuICAgIDIzOCxcclxuICAgIDE0NSxcclxuICAgIDQ1LFxyXG4gICAgMTcxLFxyXG4gICAgMTE0LFxyXG4gICAgMjUzLFxyXG4gICAgMTAsXHJcbiAgICAxOTIsXHJcbiAgICAxMzYsXHJcbiAgICA0LFxyXG4gICAgMTU3LFxyXG4gICAgMjQ5LFxyXG4gICAgMzAsXHJcbiAgICAzNSxcclxuICAgIDcyLFxyXG4gICAgMTc1LFxyXG4gICAgNjMsXHJcbiAgICA3NyxcclxuICAgIDkwLFxyXG4gICAgMTgxLFxyXG4gICAgMTYsXHJcbiAgICA5NixcclxuICAgIDExMSxcclxuICAgIDEzMyxcclxuICAgIDEwNCxcclxuICAgIDc1LFxyXG4gICAgMTYyLFxyXG4gICAgOTMsXHJcbiAgICA1NixcclxuICAgIDY2LFxyXG4gICAgMjQwLFxyXG4gICAgOCxcclxuICAgIDUwLFxyXG4gICAgODQsXHJcbiAgICAyMjksXHJcbiAgICA0OSxcclxuICAgIDIxMCxcclxuICAgIDE3MyxcclxuICAgIDIzOSxcclxuICAgIDE0MSxcclxuICAgIDEsXHJcbiAgICA4NyxcclxuICAgIDE4LFxyXG4gICAgMixcclxuICAgIDE5OCxcclxuICAgIDE0MyxcclxuICAgIDU3LFxyXG4gICAgMjI1LFxyXG4gICAgMTYwLFxyXG4gICAgNTgsXHJcbiAgICAyMTcsXHJcbiAgICAxNjgsXHJcbiAgICAyMDYsXHJcbiAgICAyNDUsXHJcbiAgICAyMDQsXHJcbiAgICAxOTksXHJcbiAgICA2LFxyXG4gICAgNzMsXHJcbiAgICA2MCxcclxuICAgIDIwLFxyXG4gICAgMjMwLFxyXG4gICAgMjExLFxyXG4gICAgMjMzLFxyXG4gICAgOTQsXHJcbiAgICAyMDAsXHJcbiAgICA4OCxcclxuICAgIDksXHJcbiAgICA3NCxcclxuICAgIDE1NSxcclxuICAgIDMzLFxyXG4gICAgMTUsXHJcbiAgICAyMTksXHJcbiAgICAxMzAsXHJcbiAgICAyMjYsXHJcbiAgICAyMDIsXHJcbiAgICA4MyxcclxuICAgIDIzNixcclxuICAgIDQyLFxyXG4gICAgMTcyLFxyXG4gICAgMTY1LFxyXG4gICAgMjE4LFxyXG4gICAgNTUsXHJcbiAgICAyMjIsXHJcbiAgICA0NixcclxuICAgIDEwNyxcclxuICAgIDk4LFxyXG4gICAgMTU0LFxyXG4gICAgMTA5LFxyXG4gICAgNjcsXHJcbiAgICAxOTYsXHJcbiAgICAxNzgsXHJcbiAgICAxMjcsXHJcbiAgICAxNTgsXHJcbiAgICAxMyxcclxuICAgIDI0MyxcclxuICAgIDY1LFxyXG4gICAgNzksXHJcbiAgICAxNjYsXHJcbiAgICAyNDgsXHJcbiAgICAyNSxcclxuICAgIDIyNCxcclxuICAgIDExNSxcclxuICAgIDgwLFxyXG4gICAgNjgsXHJcbiAgICA1MSxcclxuICAgIDE4NCxcclxuICAgIDEyOCxcclxuICAgIDIzMixcclxuICAgIDIwOCxcclxuICAgIDE1MSxcclxuICAgIDEyMixcclxuICAgIDI2LFxyXG4gICAgMjEyLFxyXG4gICAgMTA1LFxyXG4gICAgNDMsXHJcbiAgICAxNzksXHJcbiAgICAyMTMsXHJcbiAgICAyMzUsXHJcbiAgICAxNDgsXHJcbiAgICAxNDYsXHJcbiAgICA4OSxcclxuICAgIDE0LFxyXG4gICAgMTk1LFxyXG4gICAgMjgsXHJcbiAgICA3OCxcclxuICAgIDExMixcclxuICAgIDc2LFxyXG4gICAgMjUwLFxyXG4gICAgNDcsXHJcbiAgICAyNCxcclxuICAgIDI1MSxcclxuICAgIDE0MCxcclxuICAgIDEwOCxcclxuICAgIDE4NixcclxuICAgIDE5MCxcclxuICAgIDIyOCxcclxuICAgIDE3MCxcclxuICAgIDE4MyxcclxuICAgIDEzOSxcclxuICAgIDM5LFxyXG4gICAgMTg4LFxyXG4gICAgMjQ0LFxyXG4gICAgMjQ2LFxyXG4gICAgMTMyLFxyXG4gICAgNDgsXHJcbiAgICAxMTksXHJcbiAgICAxNDQsXHJcbiAgICAxODAsXHJcbiAgICAxMzgsXHJcbiAgICAxMzQsXHJcbiAgICAxOTMsXHJcbiAgICA4MixcclxuICAgIDE4MixcclxuICAgIDEyMCxcclxuICAgIDEyMSxcclxuICAgIDg2LFxyXG4gICAgMjIwLFxyXG4gICAgMjA5LFxyXG4gICAgMyxcclxuICAgIDkxLFxyXG4gICAgMjQxLFxyXG4gICAgMTQ5LFxyXG4gICAgODUsXHJcbiAgICAyMDUsXHJcbiAgICAxNTAsXHJcbiAgICAxMTMsXHJcbiAgICAyMTYsXHJcbiAgICAzMSxcclxuICAgIDEwMCxcclxuICAgIDQxLFxyXG4gICAgMTY0LFxyXG4gICAgMTc3LFxyXG4gICAgMjE0LFxyXG4gICAgMTUzLFxyXG4gICAgMjMxLFxyXG4gICAgMzgsXHJcbiAgICA3MSxcclxuICAgIDE4NSxcclxuICAgIDE3NCxcclxuICAgIDk3LFxyXG4gICAgMjAxLFxyXG4gICAgMjksXHJcbiAgICA5NSxcclxuICAgIDcsXHJcbiAgICA5MixcclxuICAgIDU0LFxyXG4gICAgMjU0LFxyXG4gICAgMTkxLFxyXG4gICAgMTE4LFxyXG4gICAgMzQsXHJcbiAgICAyMjEsXHJcbiAgICAxMzEsXHJcbiAgICAxMSxcclxuICAgIDE2MyxcclxuICAgIDk5LFxyXG4gICAgMjM0LFxyXG4gICAgODEsXHJcbiAgICAyMjcsXHJcbiAgICAxNDcsXHJcbiAgICAxNTYsXHJcbiAgICAxNzYsXHJcbiAgICAxNyxcclxuICAgIDE0MixcclxuICAgIDY5LFxyXG4gICAgMTIsXHJcbiAgICAxMTAsXHJcbiAgICA2MixcclxuICAgIDI3LFxyXG4gICAgMjU1LFxyXG4gICAgMCxcclxuICAgIDE5NCxcclxuICAgIDU5LFxyXG4gICAgMTE2LFxyXG4gICAgMjQyLFxyXG4gICAgMjUyLFxyXG4gICAgMTksXHJcbiAgICAyMSxcclxuICAgIDE4NyxcclxuICAgIDUzLFxyXG4gICAgMjA3LFxyXG4gICAgMTI5LFxyXG4gICAgNjQsXHJcbiAgICAxMzUsXHJcbiAgICA2MSxcclxuICAgIDQwLFxyXG4gICAgMTY3LFxyXG4gICAgMjM3LFxyXG4gICAgMTAyLFxyXG4gICAgMjIzLFxyXG4gICAgMTA2LFxyXG4gICAgMTU5LFxyXG4gICAgMTk3LFxyXG4gICAgMTg5LFxyXG4gICAgMjE1LFxyXG4gICAgMTM3LFxyXG4gICAgMzYsXHJcbiAgICAzMixcclxuICAgIDIyLFxyXG4gICAgNSxcclxuXHJcbiAgICAvLyBhbmQgYSBzZWNvbmQgY29weSBzbyB3ZSBkb24ndCBuZWVkIGFuIGV4dHJhIG1hc2sgb3Igc3RhdGljIGluaXRpYWxpemVyXHJcbiAgICAyMyxcclxuICAgIDEyNSxcclxuICAgIDE2MSxcclxuICAgIDUyLFxyXG4gICAgMTAzLFxyXG4gICAgMTE3LFxyXG4gICAgNzAsXHJcbiAgICAzNyxcclxuICAgIDI0NyxcclxuICAgIDEwMSxcclxuICAgIDIwMyxcclxuICAgIDE2OSxcclxuICAgIDEyNCxcclxuICAgIDEyNixcclxuICAgIDQ0LFxyXG4gICAgMTIzLFxyXG4gICAgMTUyLFxyXG4gICAgMjM4LFxyXG4gICAgMTQ1LFxyXG4gICAgNDUsXHJcbiAgICAxNzEsXHJcbiAgICAxMTQsXHJcbiAgICAyNTMsXHJcbiAgICAxMCxcclxuICAgIDE5MixcclxuICAgIDEzNixcclxuICAgIDQsXHJcbiAgICAxNTcsXHJcbiAgICAyNDksXHJcbiAgICAzMCxcclxuICAgIDM1LFxyXG4gICAgNzIsXHJcbiAgICAxNzUsXHJcbiAgICA2MyxcclxuICAgIDc3LFxyXG4gICAgOTAsXHJcbiAgICAxODEsXHJcbiAgICAxNixcclxuICAgIDk2LFxyXG4gICAgMTExLFxyXG4gICAgMTMzLFxyXG4gICAgMTA0LFxyXG4gICAgNzUsXHJcbiAgICAxNjIsXHJcbiAgICA5MyxcclxuICAgIDU2LFxyXG4gICAgNjYsXHJcbiAgICAyNDAsXHJcbiAgICA4LFxyXG4gICAgNTAsXHJcbiAgICA4NCxcclxuICAgIDIyOSxcclxuICAgIDQ5LFxyXG4gICAgMjEwLFxyXG4gICAgMTczLFxyXG4gICAgMjM5LFxyXG4gICAgMTQxLFxyXG4gICAgMSxcclxuICAgIDg3LFxyXG4gICAgMTgsXHJcbiAgICAyLFxyXG4gICAgMTk4LFxyXG4gICAgMTQzLFxyXG4gICAgNTcsXHJcbiAgICAyMjUsXHJcbiAgICAxNjAsXHJcbiAgICA1OCxcclxuICAgIDIxNyxcclxuICAgIDE2OCxcclxuICAgIDIwNixcclxuICAgIDI0NSxcclxuICAgIDIwNCxcclxuICAgIDE5OSxcclxuICAgIDYsXHJcbiAgICA3MyxcclxuICAgIDYwLFxyXG4gICAgMjAsXHJcbiAgICAyMzAsXHJcbiAgICAyMTEsXHJcbiAgICAyMzMsXHJcbiAgICA5NCxcclxuICAgIDIwMCxcclxuICAgIDg4LFxyXG4gICAgOSxcclxuICAgIDc0LFxyXG4gICAgMTU1LFxyXG4gICAgMzMsXHJcbiAgICAxNSxcclxuICAgIDIxOSxcclxuICAgIDEzMCxcclxuICAgIDIyNixcclxuICAgIDIwMixcclxuICAgIDgzLFxyXG4gICAgMjM2LFxyXG4gICAgNDIsXHJcbiAgICAxNzIsXHJcbiAgICAxNjUsXHJcbiAgICAyMTgsXHJcbiAgICA1NSxcclxuICAgIDIyMixcclxuICAgIDQ2LFxyXG4gICAgMTA3LFxyXG4gICAgOTgsXHJcbiAgICAxNTQsXHJcbiAgICAxMDksXHJcbiAgICA2NyxcclxuICAgIDE5NixcclxuICAgIDE3OCxcclxuICAgIDEyNyxcclxuICAgIDE1OCxcclxuICAgIDEzLFxyXG4gICAgMjQzLFxyXG4gICAgNjUsXHJcbiAgICA3OSxcclxuICAgIDE2NixcclxuICAgIDI0OCxcclxuICAgIDI1LFxyXG4gICAgMjI0LFxyXG4gICAgMTE1LFxyXG4gICAgODAsXHJcbiAgICA2OCxcclxuICAgIDUxLFxyXG4gICAgMTg0LFxyXG4gICAgMTI4LFxyXG4gICAgMjMyLFxyXG4gICAgMjA4LFxyXG4gICAgMTUxLFxyXG4gICAgMTIyLFxyXG4gICAgMjYsXHJcbiAgICAyMTIsXHJcbiAgICAxMDUsXHJcbiAgICA0MyxcclxuICAgIDE3OSxcclxuICAgIDIxMyxcclxuICAgIDIzNSxcclxuICAgIDE0OCxcclxuICAgIDE0NixcclxuICAgIDg5LFxyXG4gICAgMTQsXHJcbiAgICAxOTUsXHJcbiAgICAyOCxcclxuICAgIDc4LFxyXG4gICAgMTEyLFxyXG4gICAgNzYsXHJcbiAgICAyNTAsXHJcbiAgICA0NyxcclxuICAgIDI0LFxyXG4gICAgMjUxLFxyXG4gICAgMTQwLFxyXG4gICAgMTA4LFxyXG4gICAgMTg2LFxyXG4gICAgMTkwLFxyXG4gICAgMjI4LFxyXG4gICAgMTcwLFxyXG4gICAgMTgzLFxyXG4gICAgMTM5LFxyXG4gICAgMzksXHJcbiAgICAxODgsXHJcbiAgICAyNDQsXHJcbiAgICAyNDYsXHJcbiAgICAxMzIsXHJcbiAgICA0OCxcclxuICAgIDExOSxcclxuICAgIDE0NCxcclxuICAgIDE4MCxcclxuICAgIDEzOCxcclxuICAgIDEzNCxcclxuICAgIDE5MyxcclxuICAgIDgyLFxyXG4gICAgMTgyLFxyXG4gICAgMTIwLFxyXG4gICAgMTIxLFxyXG4gICAgODYsXHJcbiAgICAyMjAsXHJcbiAgICAyMDksXHJcbiAgICAzLFxyXG4gICAgOTEsXHJcbiAgICAyNDEsXHJcbiAgICAxNDksXHJcbiAgICA4NSxcclxuICAgIDIwNSxcclxuICAgIDE1MCxcclxuICAgIDExMyxcclxuICAgIDIxNixcclxuICAgIDMxLFxyXG4gICAgMTAwLFxyXG4gICAgNDEsXHJcbiAgICAxNjQsXHJcbiAgICAxNzcsXHJcbiAgICAyMTQsXHJcbiAgICAxNTMsXHJcbiAgICAyMzEsXHJcbiAgICAzOCxcclxuICAgIDcxLFxyXG4gICAgMTg1LFxyXG4gICAgMTc0LFxyXG4gICAgOTcsXHJcbiAgICAyMDEsXHJcbiAgICAyOSxcclxuICAgIDk1LFxyXG4gICAgNyxcclxuICAgIDkyLFxyXG4gICAgNTQsXHJcbiAgICAyNTQsXHJcbiAgICAxOTEsXHJcbiAgICAxMTgsXHJcbiAgICAzNCxcclxuICAgIDIyMSxcclxuICAgIDEzMSxcclxuICAgIDExLFxyXG4gICAgMTYzLFxyXG4gICAgOTksXHJcbiAgICAyMzQsXHJcbiAgICA4MSxcclxuICAgIDIyNyxcclxuICAgIDE0NyxcclxuICAgIDE1NixcclxuICAgIDE3NixcclxuICAgIDE3LFxyXG4gICAgMTQyLFxyXG4gICAgNjksXHJcbiAgICAxMixcclxuICAgIDExMCxcclxuICAgIDYyLFxyXG4gICAgMjcsXHJcbiAgICAyNTUsXHJcbiAgICAwLFxyXG4gICAgMTk0LFxyXG4gICAgNTksXHJcbiAgICAxMTYsXHJcbiAgICAyNDIsXHJcbiAgICAyNTIsXHJcbiAgICAxOSxcclxuICAgIDIxLFxyXG4gICAgMTg3LFxyXG4gICAgNTMsXHJcbiAgICAyMDcsXHJcbiAgICAxMjksXHJcbiAgICA2NCxcclxuICAgIDEzNSxcclxuICAgIDYxLFxyXG4gICAgNDAsXHJcbiAgICAxNjcsXHJcbiAgICAyMzcsXHJcbiAgICAxMDIsXHJcbiAgICAyMjMsXHJcbiAgICAxMDYsXHJcbiAgICAxNTksXHJcbiAgICAxOTcsXHJcbiAgICAxODksXHJcbiAgICAyMTUsXHJcbiAgICAxMzcsXHJcbiAgICAzNixcclxuICAgIDMyLFxyXG4gICAgMjIsXHJcbiAgICA1XHJcbik7XHJcblxyXG4vLyBjYWxjdWxhdGVzIGRvdCBwcm9kdWN0IG9mIHgsIHkgYW5kIGdyYWRpZW50XHJcbmZsb2F0IGdyYWQxKGNvbnN0IGludCBoYXNoLCBjb25zdCBmbG9hdCB4KSB7XHJcbiAgICByZXR1cm4gKGhhc2ggJiAxKSA9PSAweDAgPyAteCA6IHg7XHJcbn1cclxuXHJcbi8vIGNhbGN1bGF0ZXMgZG90IHByb2R1Y3Qgb2YgeCwgeSBhbmQgZ3JhZGllbnRcclxuZmxvYXQgZ3JhZDIoY29uc3QgaW50IGhhc2gsIGNvbnN0IGZsb2F0IHgsIGNvbnN0IGZsb2F0IHkpIHtcclxuICAgIGludCBoID0gaGFzaCAmIDB4MDM7XHJcbiAgICBzd2l0Y2ggKGgpIHtcclxuICAgIGNhc2UgMHgwMDpcclxuICAgICAgICAvLyAoLTEsIDApXHJcbiAgICAgICAgcmV0dXJuIC14O1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAweDAxOlxyXG4gICAgICAgIC8vICgxLCAwKVxyXG4gICAgICAgIHJldHVybiB4O1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAweDAyOlxyXG4gICAgICAgIC8vICgwLCAtMSlcclxuICAgICAgICByZXR1cm4gLXk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIDB4MDM6XHJcbiAgICAgICAgLy8gKDAsIDEpXHJcbiAgICAgICAgcmV0dXJuIHk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICAgIHJldHVybiAwLmY7XHJcbiAgICB9XHJcbn1cclxuICAgIFxyXG5mbG9hdCBzbW9vdGhlcnN0ZXAoY29uc3QgZmxvYXQgeCkge1xyXG4gICAgcmV0dXJuIHggKiB4ICogeCAqICh4ICogKHggKiA2LmYgLSAxNS5mKSArIDEwLmYpO1xyXG59XHJcblxyXG5mbG9hdCBwZXJsaW4xKGNvbnN0IGZsb2F0IHh4KSB7XHJcbiAgICBpbnQgeGYgPSBpbnQoZmxvb3IoeHgpKTtcclxuICAgIGZsb2F0IHggPSB4eCAtIGZsb2F0KHhmKTtcclxuICAgIGZsb2F0IHUgPSBzbW9vdGhlcnN0ZXAoeCk7XHJcbiAgICBpbnQgeDAgPSB4ZiAmIDI1NTtcclxuICAgIGludCB4MSA9ICh4ZiArIDEpICYgMjU1O1xyXG4gICAgZmxvYXQgbjAgPSBncmFkMShwZXJtW3gwXSwgeCk7XHJcbiAgICBmbG9hdCBuMSA9IGdyYWQxKHBlcm1beDFdLCB4IC0gMS5mKTtcclxuICAgIGZsb2F0IG4gPSBtaXgobjAsIG4xLCB1KTtcclxuICAgIHJldHVybiBuO1xyXG59XHJcblxyXG5mbG9hdCBwZXJsaW4yKGNvbnN0IGZsb2F0IHh4LCBjb25zdCBmbG9hdCB5eSkge1xyXG4gICAgaW50IHhmID0gaW50KGZsb29yKHh4KSk7XHJcbiAgICBpbnQgeWYgPSBpbnQoZmxvb3IoeXkpKTtcclxuICAgIGZsb2F0IHggPSB4eCAtIGZsb2F0KHhmKTtcclxuICAgIGZsb2F0IHkgPSB5eSAtIGZsb2F0KHlmKTtcclxuICAgIGZsb2F0IHUgPSBzbW9vdGhlcnN0ZXAoeCk7XHJcbiAgICBmbG9hdCB2ID0gc21vb3RoZXJzdGVwKHkpO1xyXG4gICAgaW50IHgwID0geGYgJiAyNTU7XHJcbiAgICBpbnQgeTAgPSB5ZiAmIDI1NTtcclxuICAgIGludCB4MSA9ICh4ZiArIDEpICYgMjU1O1xyXG4gICAgaW50IHkxID0gKHlmICsgMSkgJiAyNTU7XHJcbiAgICBpbnQgcjAgPSBwZXJtW3gwXTtcclxuICAgIGludCByMSA9IHBlcm1beDFdO1xyXG4gICAgaW50IHIwMCA9IHBlcm1bcjAgKyB5MF07XHJcbiAgICBpbnQgcjAxID0gcGVybVtyMCArIHkxXTtcclxuICAgIGludCByMTAgPSBwZXJtW3IxICsgeTBdO1xyXG4gICAgaW50IHIxMSA9IHBlcm1bcjEgKyB5MV07XHJcbiAgICBmbG9hdCBuMDAgPSBncmFkMihyMDAsIHgsIHkpO1xyXG4gICAgZmxvYXQgbjAxID0gZ3JhZDIocjAxLCB4LCB5IC0gMS5mKTtcclxuICAgIGZsb2F0IG4xMCA9IGdyYWQyKHIxMCwgeCAtIDEuZiwgeSk7XHJcbiAgICBmbG9hdCBuMTEgPSBncmFkMihyMTEsIHggLSAxLmYsIHkgLSAxLmYpO1xyXG4gICAgZmxvYXQgbjAgPSBtaXgobjAwLCBuMDEsIHYpO1xyXG4gICAgZmxvYXQgbjEgPSBtaXgobjEwLCBuMTEsIHYpO1xyXG4gICAgZmxvYXQgbiA9IG1peChuMCwgbjEsIHUpO1xyXG4gICAgcmV0dXJuIG47XHJcbn1cclxuXHJcbmZsb2F0IGZibTIoY29uc3QgZmxvYXQgeCwgY29uc3QgZmxvYXQgeSwgY29uc3QgZmxvYXQgbGFjdW5hcml0eSwgY29uc3QgZmxvYXQgZ2FpbiwgY29uc3QgaW50IG9jdGF2ZXMpIHtcclxuICAgIGZsb2F0IGZyZXEgPSAxLmY7XHJcbiAgICBmbG9hdCBhbXAgPSAxLmY7XHJcbiAgICBmbG9hdCBzdW0gPSAwLmY7XHJcbiAgICBmb3IgKGludCBpID0gMDsgaSA8IG9jdGF2ZXM7ICsraSkge1xyXG4gICAgICAgIHN1bSArPSBhbXAgKiBwZXJsaW4yKHggKiBmcmVxLCB5ICogZnJlcSk7XHJcbiAgICAgICAgZnJlcSAqPSBsYWN1bmFyaXR5O1xyXG4gICAgICAgIGFtcCAqPSBnYWluO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzdW07XHJcbn1cclxuYFxyXG5cclxuZXhwb3J0IHsgcGVybGluMiB9Il19