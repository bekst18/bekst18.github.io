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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2x1LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2x1LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJCQUEyQjtBQUMzQixPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQjs7R0FFRztBQUNILE1BQU0sVUFBVSxhQUFhLENBQUMsTUFBeUIsRUFBRSxPQUFnQztJQUNyRixNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUMvQyxJQUFJLENBQUMsRUFBRSxFQUFFO1FBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyw4RkFBOEYsQ0FBQyxDQUFBO0tBQ2xIO0lBRUQsT0FBTyxFQUFFLENBQUE7QUFDYixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsWUFBWSxDQUFDLEVBQTBCLEVBQUUsSUFBWSxFQUFFLE1BQWM7O0lBQ2pGLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDcEMsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNULE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtLQUM3QztJQUVELEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQy9CLEVBQUUsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7SUFFeEIsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRTtRQUNsRCxPQUFPLE1BQU0sQ0FBQTtLQUNoQjtJQUVELE1BQU0sT0FBTyxHQUFHLDRCQUE0QixHQUFHLENBQUMsTUFBQSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLG1DQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ2xGLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDdkIsTUFBTSxJQUFJLEtBQUss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Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0E0bEJmLENBQUE7QUFFRCxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB3ZWJnbCB1dGlsaXR5IGxpYnJhcnkgKi9cclxuaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuL2RvbS5qc1wiXHJcblxyXG4vKipcclxuICogY3JlYXRlIHdlYmdsMiByZW5kZXJpbmcgY29udGV4dFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbnRleHQoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCwgb3B0aW9ucz86IFdlYkdMQ29udGV4dEF0dHJpYnV0ZXMpOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0IHtcclxuICAgIGNvbnN0IGdsID0gY2FudmFzLmdldENvbnRleHQoXCJ3ZWJnbDJcIiwgb3B0aW9ucylcclxuICAgIGlmICghZ2wpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gbm90IGluaXRpYWxpemUgd2ViZ2wgMi4wLiBDb25maXJtIHRoYXQgeW91ciBicm93c2VyIGlzIHVwIHRvIGRhdGUgYW5kIGhhcyBzdXBwb3J0LlwiKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBnbFxyXG59XHJcblxyXG4vKipcclxuICogXHJcbiAqIEBwYXJhbSBnbCBnbCBjb250ZXh0XHJcbiAqIEBwYXJhbSB0eXBlIHR5cGUgb2Ygc2hhZGVyIHRvIGNyZWF0ZVxyXG4gKiBAcGFyYW0gc291cmNlIHNoYWRlciBzb3VyY2VcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTaGFkZXIoZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQsIHR5cGU6IEdMZW51bSwgc291cmNlOiBzdHJpbmcpOiBXZWJHTFNoYWRlciB7XHJcbiAgICBjb25zdCBzaGFkZXIgPSBnbC5jcmVhdGVTaGFkZXIodHlwZSlcclxuICAgIGlmICghc2hhZGVyKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGNyZWF0ZSBzaGFkZXJcIilcclxuICAgIH1cclxuXHJcbiAgICBnbC5zaGFkZXJTb3VyY2Uoc2hhZGVyLCBzb3VyY2UpXHJcbiAgICBnbC5jb21waWxlU2hhZGVyKHNoYWRlcilcclxuXHJcbiAgICBpZiAoZ2wuZ2V0U2hhZGVyUGFyYW1ldGVyKHNoYWRlciwgZ2wuQ09NUElMRV9TVEFUVVMpKSB7XHJcbiAgICAgICAgcmV0dXJuIHNoYWRlclxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG1lc3NhZ2UgPSBcIkZhaWxlZCB0byBjb21waWxlIHNoYWRlcjogXCIgKyAoZ2wuZ2V0U2hhZGVySW5mb0xvZyhzaGFkZXIpID8/IFwiXCIpXHJcbiAgICBnbC5kZWxldGVTaGFkZXIoc2hhZGVyKVxyXG4gICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjcmVhdGUgYSBnbCBwcm9ncmFtIGZyb20gc2hhZGVyc1xyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKiBAcGFyYW0gdmVydGV4U2hhZGVyIHZlcnRleCBzaGFkZXIgdG8gbGlua1xyXG4gKiBAcGFyYW0gZnJhZ21lbnRTaGFkZXIgZnJhZ21lbnQgc2hhZGVyIHRvIGxpbmtcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQcm9ncmFtKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LCB2ZXJ0ZXhTaGFkZXI6IFdlYkdMU2hhZGVyLCBmcmFnbWVudFNoYWRlcjogV2ViR0xTaGFkZXIpOiBXZWJHTFByb2dyYW0ge1xyXG4gICAgY29uc3QgcHJvZ3JhbSA9IGdsLmNyZWF0ZVByb2dyYW0oKTtcclxuICAgIGlmICghcHJvZ3JhbSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBjcmVhdGUgc2hhZGVyIHByb2dyYW1cIilcclxuICAgIH1cclxuXHJcbiAgICBnbC5hdHRhY2hTaGFkZXIocHJvZ3JhbSwgdmVydGV4U2hhZGVyKTtcclxuICAgIGdsLmF0dGFjaFNoYWRlcihwcm9ncmFtLCBmcmFnbWVudFNoYWRlcik7XHJcbiAgICBnbC5saW5rUHJvZ3JhbShwcm9ncmFtKTtcclxuXHJcbiAgICBpZiAoZ2wuZ2V0UHJvZ3JhbVBhcmFtZXRlcihwcm9ncmFtLCBnbC5MSU5LX1NUQVRVUykpIHtcclxuICAgICAgICByZXR1cm4gcHJvZ3JhbVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG1lc3NhZ2UgPSBnbC5nZXRQcm9ncmFtSW5mb0xvZyhwcm9ncmFtKVxyXG4gICAgZ2wuZGVsZXRlUHJvZ3JhbShwcm9ncmFtKTtcclxuXHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBsaW5rIHByb2dyYW06ICR7bWVzc2FnZSA/PyBcIlwifWApXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjb21waWxlIGFuZCBsaW5rIHRoZSB2ZXJ0ZXggYW5kIGZyYWdtZW50IHNoYWRlciBzb3VyY2VcclxuICogQHBhcmFtIGdsIGdsIGNvbnRleHRcclxuICogQHBhcmFtIHZlcnRleFNyYyB2ZXJ0ZXggc2hhZGVyIHNvdXJjZVxyXG4gKiBAcGFyYW0gZnJhZ21lbnRTcmMgZnJhZ21lbnQgc2hhZGVyIHNvdXJjZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGVQcm9ncmFtKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LCB2ZXJ0ZXhTcmM6IHN0cmluZywgZnJhZ21lbnRTcmM6IHN0cmluZyk6IFdlYkdMUHJvZ3JhbSB7XHJcbiAgICBjb25zdCB2ZXJ0ZXhTaGFkZXIgPSBjcmVhdGVTaGFkZXIoZ2wsIGdsLlZFUlRFWF9TSEFERVIsIHZlcnRleFNyYylcclxuICAgIGNvbnN0IGZyYWdtZW50U2hhZGVyID0gY3JlYXRlU2hhZGVyKGdsLCBnbC5GUkFHTUVOVF9TSEFERVIsIGZyYWdtZW50U3JjKVxyXG4gICAgY29uc3QgcHJvZ3JhbSA9IGNyZWF0ZVByb2dyYW0oZ2wsIHZlcnRleFNoYWRlciwgZnJhZ21lbnRTaGFkZXIpXHJcbiAgICByZXR1cm4gcHJvZ3JhbVxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGEgYnVmZmVyLCB0aHJvdyBhbiBleGNlcHRpb24gb24gZmFpbHVyZVxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUJ1ZmZlcihnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCk6IFdlYkdMQnVmZmVyIHtcclxuICAgIGNvbnN0IGJ1ZmZlciA9IGdsLmNyZWF0ZUJ1ZmZlcigpXHJcbiAgICBpZiAoIWJ1ZmZlcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBjcmVhdGUgYnVmZmVyXCIpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGJ1ZmZlclxyXG59XHJcblxyXG4vKipcclxuICogUmV0cmVpdmUgbG9jYXRpb24gZm9yIHVuaWZvcm0sIHRocm93cyBleGNlcHRpb24gaWYgbm90IGZvdW5kXHJcbiAqIEBwYXJhbSBnbCBnbCBjb250ZXh0XHJcbiAqIEBwYXJhbSBwcm9ncmFtIGdsIHByb2dyYW1cclxuICogQHBhcmFtIG5hbWUgbmFtZSBvZiB1bmlmb3JtXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pZm9ybUxvY2F0aW9uKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LCBwcm9ncmFtOiBXZWJHTFByb2dyYW0sIG5hbWU6IHN0cmluZyk6IFdlYkdMVW5pZm9ybUxvY2F0aW9uIHtcclxuICAgIGNvbnN0IGxvY2F0aW9uID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHByb2dyYW0sIG5hbWUpXHJcbiAgICBpZiAoIWxvY2F0aW9uKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gcmV0cmlldmUgbG9jYXRpb24gb2YgJHtuYW1lfSB1bmlmb3JtLmApXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGxvY2F0aW9uXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXRyZWl2ZSBsb2NhdGlvbiBmb3IgYXR0cmlidXRlLCB0aHJvd3MgZXhjZXB0aW9uIGlmIG5vdCBmb3VuZFxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKiBAcGFyYW0gcHJvZ3JhbSBnbCBwcm9ncmFtXHJcbiAqIEBwYXJhbSBuYW1lIG5hbWUgb2YgYXR0cmlidXRlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXR0cmliTG9jYXRpb24oZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQsIHByb2dyYW06IFdlYkdMUHJvZ3JhbSwgbmFtZTogc3RyaW5nKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IGF0dHJpYkxvY2F0aW9uID0gZ2wuZ2V0QXR0cmliTG9jYXRpb24ocHJvZ3JhbSwgbmFtZSlcclxuICAgIGlmIChhdHRyaWJMb2NhdGlvbiA8IDApIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bmFtZX0gYXR0cmlidXRlIHdhcyBub3QgZm91bmRgKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhdHRyaWJMb2NhdGlvblxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGEgdmVydGV4IGFycmF5IG9iamVjdCwgdGhyb3cgZXhjZXB0aW9uIG9uIGZhaWx1cmVcclxuICogQHBhcmFtIGdsIGdsIGNvbnRleHRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVWZXJ0ZXhBcnJheShnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCk6IFdlYkdMVmVydGV4QXJyYXlPYmplY3Qge1xyXG4gICAgY29uc3QgdmFvID0gZ2wuY3JlYXRlVmVydGV4QXJyYXkoKVxyXG4gICAgaWYgKCF2YW8pIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJmYWlsZWQgdG8gY3JlYXRlIHZlcnRleCBhcnJheSBvYmplY3RcIilcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmFvXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjcmVhdGUgYSB0ZXh0dXJlIG9iamVjdCwgdGhyb3cgYW4gZXhjZXB0aW9uIG9uIGZhaWx1cmVcclxuICogQHBhcmFtIGdsIGdsIGNvbnRleHRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVUZXh0dXJlKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0KTogV2ViR0xUZXh0dXJlIHtcclxuICAgIGNvbnN0IHRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKClcclxuICAgIGlmICghdGV4dHVyZSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImZhaWxlZCB0byBjcmVhdGUgdGV4dHVyZSBvYmplY3RcIilcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGV4dHVyZVxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGEgcmVuZGVyYnVmZmVyIG9iamVjdCwgdGhyb3cgYW4gZXhjZXB0aW9uIG9uIGZhaWx1cmVcclxuICogQHBhcmFtIGdsIGdsIGNvbnRleHRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZW5kZXJidWZmZXIoZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQpOiBXZWJHTFJlbmRlcmJ1ZmZlciB7XHJcbiAgICBjb25zdCBidWZmZXIgPSBnbC5jcmVhdGVSZW5kZXJidWZmZXIoKVxyXG4gICAgaWYgKCFidWZmZXIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gY3JlYXRlIHJlbmRlcmJ1ZmZlciBvYmplY3RcIilcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYnVmZmVyXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjcmVhdGUgYSBzYW1wbGVyIG9iamVjdCwgdGhyb3cgYW4gZXhjZXB0aW9uIG9uIGZhaWx1cmVcclxuICogQHBhcmFtIGdsIGdsIGNvbnRleHRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTYW1wbGVyKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0KTogV2ViR0xTYW1wbGVyIHtcclxuICAgIGNvbnN0IHNhbXBsZXIgPSBnbC5jcmVhdGVTYW1wbGVyKClcclxuICAgIGlmICghc2FtcGxlcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImZhaWxlZCB0byBjcmVhdGUgc2FtcGxlciBvYmplY3RcIilcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc2FtcGxlclxyXG59XHJcblxyXG4vKipcclxuICogbG9hZCBhIHRleHR1cmUgZnJvbSB0aGUgc3BlY2lmaWVkIGZpbGVcclxuICogQHBhcmFtIGdsIGdsIGNvbnRleHRcclxuICogQHBhcmFtIHVybCB1cmwgZnJvbSB3aGljaCB0byBsb2FkIHRleHR1cmVcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkVGV4dHVyZShnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCwgdXJsOiBzdHJpbmcpOiBQcm9taXNlPFdlYkdMVGV4dHVyZT4ge1xyXG4gICAgY29uc3QgdGV4dHVyZSA9IGNyZWF0ZVRleHR1cmUoZ2wpXHJcbiAgICBjb25zdCBpbWFnZSA9IGF3YWl0IGRvbS5sb2FkSW1hZ2UodXJsKVxyXG4gICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZSlcclxuICAgIGdsLnRleEltYWdlMkQoZ2wuVEVYVFVSRV8yRCwgMCwgZ2wuUkdCQSwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgaW1hZ2UpXHJcbiAgICBnbC5nZW5lcmF0ZU1pcG1hcChnbC5URVhUVVJFXzJEKVxyXG4gICAgcmV0dXJuIHRleHR1cmVcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBhIGZyYW1lYnVmZmVyIG9iamVjdCwgdGhyb3cgZXhjZXB0aW9uIG9uIGZhaWx1cmVcclxuICogQHBhcmFtIGdsIGdsIGNvbnRleHRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVGcmFtZWJ1ZmZlcihnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCk6IFdlYkdMRnJhbWVidWZmZXIge1xyXG4gICAgY29uc3QgZnJhbWVidWZmZXIgPSBnbC5jcmVhdGVGcmFtZWJ1ZmZlcigpXHJcbiAgICBpZiAoIWZyYW1lYnVmZmVyKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGNyZWF0ZSBmcmFtZWJ1ZmZlciBvYmplY3RcIilcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZnJhbWVidWZmZXJcclxufVxyXG5cclxuLyogc2hhZGVyIGZyYWdtZW50cyAqL1xyXG5jb25zdCBwZXJsaW4yID0gYFxyXG4vLyBwZXJtdXRhdGlvbiB0YWJsZVxyXG5jb25zdCBpbnQgcGVybVs1MTJdID0gaW50W10oXHJcbiAgICAyMyxcclxuICAgIDEyNSxcclxuICAgIDE2MSxcclxuICAgIDUyLFxyXG4gICAgMTAzLFxyXG4gICAgMTE3LFxyXG4gICAgNzAsXHJcbiAgICAzNyxcclxuICAgIDI0NyxcclxuICAgIDEwMSxcclxuICAgIDIwMyxcclxuICAgIDE2OSxcclxuICAgIDEyNCxcclxuICAgIDEyNixcclxuICAgIDQ0LFxyXG4gICAgMTIzLFxyXG4gICAgMTUyLFxyXG4gICAgMjM4LFxyXG4gICAgMTQ1LFxyXG4gICAgNDUsXHJcbiAgICAxNzEsXHJcbiAgICAxMTQsXHJcbiAgICAyNTMsXHJcbiAgICAxMCxcclxuICAgIDE5MixcclxuICAgIDEzNixcclxuICAgIDQsXHJcbiAgICAxNTcsXHJcbiAgICAyNDksXHJcbiAgICAzMCxcclxuICAgIDM1LFxyXG4gICAgNzIsXHJcbiAgICAxNzUsXHJcbiAgICA2MyxcclxuICAgIDc3LFxyXG4gICAgOTAsXHJcbiAgICAxODEsXHJcbiAgICAxNixcclxuICAgIDk2LFxyXG4gICAgMTExLFxyXG4gICAgMTMzLFxyXG4gICAgMTA0LFxyXG4gICAgNzUsXHJcbiAgICAxNjIsXHJcbiAgICA5MyxcclxuICAgIDU2LFxyXG4gICAgNjYsXHJcbiAgICAyNDAsXHJcbiAgICA4LFxyXG4gICAgNTAsXHJcbiAgICA4NCxcclxuICAgIDIyOSxcclxuICAgIDQ5LFxyXG4gICAgMjEwLFxyXG4gICAgMTczLFxyXG4gICAgMjM5LFxyXG4gICAgMTQxLFxyXG4gICAgMSxcclxuICAgIDg3LFxyXG4gICAgMTgsXHJcbiAgICAyLFxyXG4gICAgMTk4LFxyXG4gICAgMTQzLFxyXG4gICAgNTcsXHJcbiAgICAyMjUsXHJcbiAgICAxNjAsXHJcbiAgICA1OCxcclxuICAgIDIxNyxcclxuICAgIDE2OCxcclxuICAgIDIwNixcclxuICAgIDI0NSxcclxuICAgIDIwNCxcclxuICAgIDE5OSxcclxuICAgIDYsXHJcbiAgICA3MyxcclxuICAgIDYwLFxyXG4gICAgMjAsXHJcbiAgICAyMzAsXHJcbiAgICAyMTEsXHJcbiAgICAyMzMsXHJcbiAgICA5NCxcclxuICAgIDIwMCxcclxuICAgIDg4LFxyXG4gICAgOSxcclxuICAgIDc0LFxyXG4gICAgMTU1LFxyXG4gICAgMzMsXHJcbiAgICAxNSxcclxuICAgIDIxOSxcclxuICAgIDEzMCxcclxuICAgIDIyNixcclxuICAgIDIwMixcclxuICAgIDgzLFxyXG4gICAgMjM2LFxyXG4gICAgNDIsXHJcbiAgICAxNzIsXHJcbiAgICAxNjUsXHJcbiAgICAyMTgsXHJcbiAgICA1NSxcclxuICAgIDIyMixcclxuICAgIDQ2LFxyXG4gICAgMTA3LFxyXG4gICAgOTgsXHJcbiAgICAxNTQsXHJcbiAgICAxMDksXHJcbiAgICA2NyxcclxuICAgIDE5NixcclxuICAgIDE3OCxcclxuICAgIDEyNyxcclxuICAgIDE1OCxcclxuICAgIDEzLFxyXG4gICAgMjQzLFxyXG4gICAgNjUsXHJcbiAgICA3OSxcclxuICAgIDE2NixcclxuICAgIDI0OCxcclxuICAgIDI1LFxyXG4gICAgMjI0LFxyXG4gICAgMTE1LFxyXG4gICAgODAsXHJcbiAgICA2OCxcclxuICAgIDUxLFxyXG4gICAgMTg0LFxyXG4gICAgMTI4LFxyXG4gICAgMjMyLFxyXG4gICAgMjA4LFxyXG4gICAgMTUxLFxyXG4gICAgMTIyLFxyXG4gICAgMjYsXHJcbiAgICAyMTIsXHJcbiAgICAxMDUsXHJcbiAgICA0MyxcclxuICAgIDE3OSxcclxuICAgIDIxMyxcclxuICAgIDIzNSxcclxuICAgIDE0OCxcclxuICAgIDE0NixcclxuICAgIDg5LFxyXG4gICAgMTQsXHJcbiAgICAxOTUsXHJcbiAgICAyOCxcclxuICAgIDc4LFxyXG4gICAgMTEyLFxyXG4gICAgNzYsXHJcbiAgICAyNTAsXHJcbiAgICA0NyxcclxuICAgIDI0LFxyXG4gICAgMjUxLFxyXG4gICAgMTQwLFxyXG4gICAgMTA4LFxyXG4gICAgMTg2LFxyXG4gICAgMTkwLFxyXG4gICAgMjI4LFxyXG4gICAgMTcwLFxyXG4gICAgMTgzLFxyXG4gICAgMTM5LFxyXG4gICAgMzksXHJcbiAgICAxODgsXHJcbiAgICAyNDQsXHJcbiAgICAyNDYsXHJcbiAgICAxMzIsXHJcbiAgICA0OCxcclxuICAgIDExOSxcclxuICAgIDE0NCxcclxuICAgIDE4MCxcclxuICAgIDEzOCxcclxuICAgIDEzNCxcclxuICAgIDE5MyxcclxuICAgIDgyLFxyXG4gICAgMTgyLFxyXG4gICAgMTIwLFxyXG4gICAgMTIxLFxyXG4gICAgODYsXHJcbiAgICAyMjAsXHJcbiAgICAyMDksXHJcbiAgICAzLFxyXG4gICAgOTEsXHJcbiAgICAyNDEsXHJcbiAgICAxNDksXHJcbiAgICA4NSxcclxuICAgIDIwNSxcclxuICAgIDE1MCxcclxuICAgIDExMyxcclxuICAgIDIxNixcclxuICAgIDMxLFxyXG4gICAgMTAwLFxyXG4gICAgNDEsXHJcbiAgICAxNjQsXHJcbiAgICAxNzcsXHJcbiAgICAyMTQsXHJcbiAgICAxNTMsXHJcbiAgICAyMzEsXHJcbiAgICAzOCxcclxuICAgIDcxLFxyXG4gICAgMTg1LFxyXG4gICAgMTc0LFxyXG4gICAgOTcsXHJcbiAgICAyMDEsXHJcbiAgICAyOSxcclxuICAgIDk1LFxyXG4gICAgNyxcclxuICAgIDkyLFxyXG4gICAgNTQsXHJcbiAgICAyNTQsXHJcbiAgICAxOTEsXHJcbiAgICAxMTgsXHJcbiAgICAzNCxcclxuICAgIDIyMSxcclxuICAgIDEzMSxcclxuICAgIDExLFxyXG4gICAgMTYzLFxyXG4gICAgOTksXHJcbiAgICAyMzQsXHJcbiAgICA4MSxcclxuICAgIDIyNyxcclxuICAgIDE0NyxcclxuICAgIDE1NixcclxuICAgIDE3NixcclxuICAgIDE3LFxyXG4gICAgMTQyLFxyXG4gICAgNjksXHJcbiAgICAxMixcclxuICAgIDExMCxcclxuICAgIDYyLFxyXG4gICAgMjcsXHJcbiAgICAyNTUsXHJcbiAgICAwLFxyXG4gICAgMTk0LFxyXG4gICAgNTksXHJcbiAgICAxMTYsXHJcbiAgICAyNDIsXHJcbiAgICAyNTIsXHJcbiAgICAxOSxcclxuICAgIDIxLFxyXG4gICAgMTg3LFxyXG4gICAgNTMsXHJcbiAgICAyMDcsXHJcbiAgICAxMjksXHJcbiAgICA2NCxcclxuICAgIDEzNSxcclxuICAgIDYxLFxyXG4gICAgNDAsXHJcbiAgICAxNjcsXHJcbiAgICAyMzcsXHJcbiAgICAxMDIsXHJcbiAgICAyMjMsXHJcbiAgICAxMDYsXHJcbiAgICAxNTksXHJcbiAgICAxOTcsXHJcbiAgICAxODksXHJcbiAgICAyMTUsXHJcbiAgICAxMzcsXHJcbiAgICAzNixcclxuICAgIDMyLFxyXG4gICAgMjIsXHJcbiAgICA1LFxyXG5cclxuICAgIC8vIGFuZCBhIHNlY29uZCBjb3B5IHNvIHdlIGRvbid0IG5lZWQgYW4gZXh0cmEgbWFzayBvciBzdGF0aWMgaW5pdGlhbGl6ZXJcclxuICAgIDIzLFxyXG4gICAgMTI1LFxyXG4gICAgMTYxLFxyXG4gICAgNTIsXHJcbiAgICAxMDMsXHJcbiAgICAxMTcsXHJcbiAgICA3MCxcclxuICAgIDM3LFxyXG4gICAgMjQ3LFxyXG4gICAgMTAxLFxyXG4gICAgMjAzLFxyXG4gICAgMTY5LFxyXG4gICAgMTI0LFxyXG4gICAgMTI2LFxyXG4gICAgNDQsXHJcbiAgICAxMjMsXHJcbiAgICAxNTIsXHJcbiAgICAyMzgsXHJcbiAgICAxNDUsXHJcbiAgICA0NSxcclxuICAgIDE3MSxcclxuICAgIDExNCxcclxuICAgIDI1MyxcclxuICAgIDEwLFxyXG4gICAgMTkyLFxyXG4gICAgMTM2LFxyXG4gICAgNCxcclxuICAgIDE1NyxcclxuICAgIDI0OSxcclxuICAgIDMwLFxyXG4gICAgMzUsXHJcbiAgICA3MixcclxuICAgIDE3NSxcclxuICAgIDYzLFxyXG4gICAgNzcsXHJcbiAgICA5MCxcclxuICAgIDE4MSxcclxuICAgIDE2LFxyXG4gICAgOTYsXHJcbiAgICAxMTEsXHJcbiAgICAxMzMsXHJcbiAgICAxMDQsXHJcbiAgICA3NSxcclxuICAgIDE2MixcclxuICAgIDkzLFxyXG4gICAgNTYsXHJcbiAgICA2NixcclxuICAgIDI0MCxcclxuICAgIDgsXHJcbiAgICA1MCxcclxuICAgIDg0LFxyXG4gICAgMjI5LFxyXG4gICAgNDksXHJcbiAgICAyMTAsXHJcbiAgICAxNzMsXHJcbiAgICAyMzksXHJcbiAgICAxNDEsXHJcbiAgICAxLFxyXG4gICAgODcsXHJcbiAgICAxOCxcclxuICAgIDIsXHJcbiAgICAxOTgsXHJcbiAgICAxNDMsXHJcbiAgICA1NyxcclxuICAgIDIyNSxcclxuICAgIDE2MCxcclxuICAgIDU4LFxyXG4gICAgMjE3LFxyXG4gICAgMTY4LFxyXG4gICAgMjA2LFxyXG4gICAgMjQ1LFxyXG4gICAgMjA0LFxyXG4gICAgMTk5LFxyXG4gICAgNixcclxuICAgIDczLFxyXG4gICAgNjAsXHJcbiAgICAyMCxcclxuICAgIDIzMCxcclxuICAgIDIxMSxcclxuICAgIDIzMyxcclxuICAgIDk0LFxyXG4gICAgMjAwLFxyXG4gICAgODgsXHJcbiAgICA5LFxyXG4gICAgNzQsXHJcbiAgICAxNTUsXHJcbiAgICAzMyxcclxuICAgIDE1LFxyXG4gICAgMjE5LFxyXG4gICAgMTMwLFxyXG4gICAgMjI2LFxyXG4gICAgMjAyLFxyXG4gICAgODMsXHJcbiAgICAyMzYsXHJcbiAgICA0MixcclxuICAgIDE3MixcclxuICAgIDE2NSxcclxuICAgIDIxOCxcclxuICAgIDU1LFxyXG4gICAgMjIyLFxyXG4gICAgNDYsXHJcbiAgICAxMDcsXHJcbiAgICA5OCxcclxuICAgIDE1NCxcclxuICAgIDEwOSxcclxuICAgIDY3LFxyXG4gICAgMTk2LFxyXG4gICAgMTc4LFxyXG4gICAgMTI3LFxyXG4gICAgMTU4LFxyXG4gICAgMTMsXHJcbiAgICAyNDMsXHJcbiAgICA2NSxcclxuICAgIDc5LFxyXG4gICAgMTY2LFxyXG4gICAgMjQ4LFxyXG4gICAgMjUsXHJcbiAgICAyMjQsXHJcbiAgICAxMTUsXHJcbiAgICA4MCxcclxuICAgIDY4LFxyXG4gICAgNTEsXHJcbiAgICAxODQsXHJcbiAgICAxMjgsXHJcbiAgICAyMzIsXHJcbiAgICAyMDgsXHJcbiAgICAxNTEsXHJcbiAgICAxMjIsXHJcbiAgICAyNixcclxuICAgIDIxMixcclxuICAgIDEwNSxcclxuICAgIDQzLFxyXG4gICAgMTc5LFxyXG4gICAgMjEzLFxyXG4gICAgMjM1LFxyXG4gICAgMTQ4LFxyXG4gICAgMTQ2LFxyXG4gICAgODksXHJcbiAgICAxNCxcclxuICAgIDE5NSxcclxuICAgIDI4LFxyXG4gICAgNzgsXHJcbiAgICAxMTIsXHJcbiAgICA3NixcclxuICAgIDI1MCxcclxuICAgIDQ3LFxyXG4gICAgMjQsXHJcbiAgICAyNTEsXHJcbiAgICAxNDAsXHJcbiAgICAxMDgsXHJcbiAgICAxODYsXHJcbiAgICAxOTAsXHJcbiAgICAyMjgsXHJcbiAgICAxNzAsXHJcbiAgICAxODMsXHJcbiAgICAxMzksXHJcbiAgICAzOSxcclxuICAgIDE4OCxcclxuICAgIDI0NCxcclxuICAgIDI0NixcclxuICAgIDEzMixcclxuICAgIDQ4LFxyXG4gICAgMTE5LFxyXG4gICAgMTQ0LFxyXG4gICAgMTgwLFxyXG4gICAgMTM4LFxyXG4gICAgMTM0LFxyXG4gICAgMTkzLFxyXG4gICAgODIsXHJcbiAgICAxODIsXHJcbiAgICAxMjAsXHJcbiAgICAxMjEsXHJcbiAgICA4NixcclxuICAgIDIyMCxcclxuICAgIDIwOSxcclxuICAgIDMsXHJcbiAgICA5MSxcclxuICAgIDI0MSxcclxuICAgIDE0OSxcclxuICAgIDg1LFxyXG4gICAgMjA1LFxyXG4gICAgMTUwLFxyXG4gICAgMTEzLFxyXG4gICAgMjE2LFxyXG4gICAgMzEsXHJcbiAgICAxMDAsXHJcbiAgICA0MSxcclxuICAgIDE2NCxcclxuICAgIDE3NyxcclxuICAgIDIxNCxcclxuICAgIDE1MyxcclxuICAgIDIzMSxcclxuICAgIDM4LFxyXG4gICAgNzEsXHJcbiAgICAxODUsXHJcbiAgICAxNzQsXHJcbiAgICA5NyxcclxuICAgIDIwMSxcclxuICAgIDI5LFxyXG4gICAgOTUsXHJcbiAgICA3LFxyXG4gICAgOTIsXHJcbiAgICA1NCxcclxuICAgIDI1NCxcclxuICAgIDE5MSxcclxuICAgIDExOCxcclxuICAgIDM0LFxyXG4gICAgMjIxLFxyXG4gICAgMTMxLFxyXG4gICAgMTEsXHJcbiAgICAxNjMsXHJcbiAgICA5OSxcclxuICAgIDIzNCxcclxuICAgIDgxLFxyXG4gICAgMjI3LFxyXG4gICAgMTQ3LFxyXG4gICAgMTU2LFxyXG4gICAgMTc2LFxyXG4gICAgMTcsXHJcbiAgICAxNDIsXHJcbiAgICA2OSxcclxuICAgIDEyLFxyXG4gICAgMTEwLFxyXG4gICAgNjIsXHJcbiAgICAyNyxcclxuICAgIDI1NSxcclxuICAgIDAsXHJcbiAgICAxOTQsXHJcbiAgICA1OSxcclxuICAgIDExNixcclxuICAgIDI0MixcclxuICAgIDI1MixcclxuICAgIDE5LFxyXG4gICAgMjEsXHJcbiAgICAxODcsXHJcbiAgICA1MyxcclxuICAgIDIwNyxcclxuICAgIDEyOSxcclxuICAgIDY0LFxyXG4gICAgMTM1LFxyXG4gICAgNjEsXHJcbiAgICA0MCxcclxuICAgIDE2NyxcclxuICAgIDIzNyxcclxuICAgIDEwMixcclxuICAgIDIyMyxcclxuICAgIDEwNixcclxuICAgIDE1OSxcclxuICAgIDE5NyxcclxuICAgIDE4OSxcclxuICAgIDIxNSxcclxuICAgIDEzNyxcclxuICAgIDM2LFxyXG4gICAgMzIsXHJcbiAgICAyMixcclxuICAgIDVcclxuKTtcclxuXHJcbi8vIGNhbGN1bGF0ZXMgZG90IHByb2R1Y3Qgb2YgeCwgeSBhbmQgZ3JhZGllbnRcclxuZmxvYXQgZ3JhZDEoY29uc3QgaW50IGhhc2gsIGNvbnN0IGZsb2F0IHgpIHtcclxuICAgIHJldHVybiAoaGFzaCAmIDEpID09IDB4MCA/IC14IDogeDtcclxufVxyXG5cclxuLy8gY2FsY3VsYXRlcyBkb3QgcHJvZHVjdCBvZiB4LCB5IGFuZCBncmFkaWVudFxyXG5mbG9hdCBncmFkMihjb25zdCBpbnQgaGFzaCwgY29uc3QgZmxvYXQgeCwgY29uc3QgZmxvYXQgeSkge1xyXG4gICAgaW50IGggPSBoYXNoICYgMHgwMztcclxuICAgIHN3aXRjaCAoaCkge1xyXG4gICAgY2FzZSAweDAwOlxyXG4gICAgICAgIC8vICgtMSwgMClcclxuICAgICAgICByZXR1cm4gLXg7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIDB4MDE6XHJcbiAgICAgICAgLy8gKDEsIDApXHJcbiAgICAgICAgcmV0dXJuIHg7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIDB4MDI6XHJcbiAgICAgICAgLy8gKDAsIC0xKVxyXG4gICAgICAgIHJldHVybiAteTtcclxuICAgICAgICBicmVhaztcclxuICAgIGNhc2UgMHgwMzpcclxuICAgICAgICAvLyAoMCwgMSlcclxuICAgICAgICByZXR1cm4geTtcclxuICAgICAgICBicmVhaztcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgcmV0dXJuIDAuZjtcclxuICAgIH1cclxufVxyXG4gICAgXHJcbmZsb2F0IHNtb290aGVyc3RlcChjb25zdCBmbG9hdCB4KSB7XHJcbiAgICByZXR1cm4geCAqIHggKiB4ICogKHggKiAoeCAqIDYuZiAtIDE1LmYpICsgMTAuZik7XHJcbn1cclxuXHJcbmZsb2F0IHBlcmxpbjEoY29uc3QgZmxvYXQgeHgpIHtcclxuICAgIGludCB4ZiA9IGludChmbG9vcih4eCkpO1xyXG4gICAgZmxvYXQgeCA9IHh4IC0gZmxvYXQoeGYpO1xyXG4gICAgZmxvYXQgdSA9IHNtb290aGVyc3RlcCh4KTtcclxuICAgIGludCB4MCA9IHhmICYgMjU1O1xyXG4gICAgaW50IHgxID0gKHhmICsgMSkgJiAyNTU7XHJcbiAgICBmbG9hdCBuMCA9IGdyYWQxKHBlcm1beDBdLCB4KTtcclxuICAgIGZsb2F0IG4xID0gZ3JhZDEocGVybVt4MV0sIHggLSAxLmYpO1xyXG4gICAgZmxvYXQgbiA9IG1peChuMCwgbjEsIHUpO1xyXG4gICAgcmV0dXJuIG47XHJcbn1cclxuXHJcbmZsb2F0IHBlcmxpbjIoY29uc3QgZmxvYXQgeHgsIGNvbnN0IGZsb2F0IHl5KSB7XHJcbiAgICBpbnQgeGYgPSBpbnQoZmxvb3IoeHgpKTtcclxuICAgIGludCB5ZiA9IGludChmbG9vcih5eSkpO1xyXG4gICAgZmxvYXQgeCA9IHh4IC0gZmxvYXQoeGYpO1xyXG4gICAgZmxvYXQgeSA9IHl5IC0gZmxvYXQoeWYpO1xyXG4gICAgZmxvYXQgdSA9IHNtb290aGVyc3RlcCh4KTtcclxuICAgIGZsb2F0IHYgPSBzbW9vdGhlcnN0ZXAoeSk7XHJcbiAgICBpbnQgeDAgPSB4ZiAmIDI1NTtcclxuICAgIGludCB5MCA9IHlmICYgMjU1O1xyXG4gICAgaW50IHgxID0gKHhmICsgMSkgJiAyNTU7XHJcbiAgICBpbnQgeTEgPSAoeWYgKyAxKSAmIDI1NTtcclxuICAgIGludCByMCA9IHBlcm1beDBdO1xyXG4gICAgaW50IHIxID0gcGVybVt4MV07XHJcbiAgICBpbnQgcjAwID0gcGVybVtyMCArIHkwXTtcclxuICAgIGludCByMDEgPSBwZXJtW3IwICsgeTFdO1xyXG4gICAgaW50IHIxMCA9IHBlcm1bcjEgKyB5MF07XHJcbiAgICBpbnQgcjExID0gcGVybVtyMSArIHkxXTtcclxuICAgIGZsb2F0IG4wMCA9IGdyYWQyKHIwMCwgeCwgeSk7XHJcbiAgICBmbG9hdCBuMDEgPSBncmFkMihyMDEsIHgsIHkgLSAxLmYpO1xyXG4gICAgZmxvYXQgbjEwID0gZ3JhZDIocjEwLCB4IC0gMS5mLCB5KTtcclxuICAgIGZsb2F0IG4xMSA9IGdyYWQyKHIxMSwgeCAtIDEuZiwgeSAtIDEuZik7XHJcbiAgICBmbG9hdCBuMCA9IG1peChuMDAsIG4wMSwgdik7XHJcbiAgICBmbG9hdCBuMSA9IG1peChuMTAsIG4xMSwgdik7XHJcbiAgICBmbG9hdCBuID0gbWl4KG4wLCBuMSwgdSk7XHJcbiAgICByZXR1cm4gbjtcclxufVxyXG5cclxuZmxvYXQgZmJtMihjb25zdCBmbG9hdCB4LCBjb25zdCBmbG9hdCB5LCBjb25zdCBmbG9hdCBsYWN1bmFyaXR5LCBjb25zdCBmbG9hdCBnYWluLCBjb25zdCBpbnQgb2N0YXZlcykge1xyXG4gICAgZmxvYXQgZnJlcSA9IDEuZjtcclxuICAgIGZsb2F0IGFtcCA9IDEuZjtcclxuICAgIGZsb2F0IHN1bSA9IDAuZjtcclxuICAgIGZvciAoaW50IGkgPSAwOyBpIDwgb2N0YXZlczsgKytpKSB7XHJcbiAgICAgICAgc3VtICs9IGFtcCAqIHBlcmxpbjIoeCAqIGZyZXEsIHkgKiBmcmVxKTtcclxuICAgICAgICBmcmVxICo9IGxhY3VuYXJpdHk7XHJcbiAgICAgICAgYW1wICo9IGdhaW47XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHN1bTtcclxufVxyXG5gXHJcblxyXG5leHBvcnQgeyBwZXJsaW4yIH0iXX0=