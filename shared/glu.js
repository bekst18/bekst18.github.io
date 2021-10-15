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
    const message = "Failed to compile shader: " + (_a = gl.getShaderInfoLog(shader), (_a !== null && _a !== void 0 ? _a : ""));
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
    throw new Error(`Failed to link program: ${(message !== null && message !== void 0 ? message : "")}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2x1LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2x1LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJCQUEyQjtBQUMzQixPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQjs7R0FFRztBQUNILE1BQU0sVUFBVSxhQUFhLENBQUMsTUFBeUIsRUFBRSxPQUFnQztJQUNyRixNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUMvQyxJQUFJLENBQUMsRUFBRSxFQUFFO1FBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyw4RkFBOEYsQ0FBQyxDQUFBO0tBQ2xIO0lBRUQsT0FBTyxFQUFFLENBQUE7QUFDYixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsWUFBWSxDQUFDLEVBQTBCLEVBQUUsSUFBWSxFQUFFLE1BQWM7O0lBQ2pGLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDcEMsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNULE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtLQUM3QztJQUVELEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQy9CLEVBQUUsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7SUFFeEIsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRTtRQUNsRCxPQUFPLE1BQU0sQ0FBQTtLQUNoQjtJQUVELE1BQU0sT0FBTyxHQUFHLDRCQUE0QixHQUFHLE1BQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyx1Q0FBSSxFQUFFLEVBQUMsQ0FBQTtJQUNsRixFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMs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Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQTRsQmYsQ0FBQTtBQUVELE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qIHdlYmdsIHV0aWxpdHkgbGlicmFyeSAqL1xyXG5pbXBvcnQgKiBhcyBkb20gZnJvbSBcIi4vZG9tLmpzXCJcclxuXHJcbi8qKlxyXG4gKiBjcmVhdGUgd2ViZ2wyIHJlbmRlcmluZyBjb250ZXh0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29udGV4dChjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50LCBvcHRpb25zPzogV2ViR0xDb250ZXh0QXR0cmlidXRlcyk6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQge1xyXG4gICAgY29uc3QgZ2wgPSBjYW52YXMuZ2V0Q29udGV4dChcIndlYmdsMlwiLCBvcHRpb25zKVxyXG4gICAgaWYgKCFnbCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBub3QgaW5pdGlhbGl6ZSB3ZWJnbCAyLjAuIENvbmZpcm0gdGhhdCB5b3VyIGJyb3dzZXIgaXMgdXAgdG8gZGF0ZSBhbmQgaGFzIHN1cHBvcnQuXCIpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGdsXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBcclxuICogQHBhcmFtIGdsIGdsIGNvbnRleHRcclxuICogQHBhcmFtIHR5cGUgdHlwZSBvZiBzaGFkZXIgdG8gY3JlYXRlXHJcbiAqIEBwYXJhbSBzb3VyY2Ugc2hhZGVyIHNvdXJjZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNoYWRlcihnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCwgdHlwZTogR0xlbnVtLCBzb3VyY2U6IHN0cmluZyk6IFdlYkdMU2hhZGVyIHtcclxuICAgIGNvbnN0IHNoYWRlciA9IGdsLmNyZWF0ZVNoYWRlcih0eXBlKVxyXG4gICAgaWYgKCFzaGFkZXIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gY3JlYXRlIHNoYWRlclwiKVxyXG4gICAgfVxyXG5cclxuICAgIGdsLnNoYWRlclNvdXJjZShzaGFkZXIsIHNvdXJjZSlcclxuICAgIGdsLmNvbXBpbGVTaGFkZXIoc2hhZGVyKVxyXG5cclxuICAgIGlmIChnbC5nZXRTaGFkZXJQYXJhbWV0ZXIoc2hhZGVyLCBnbC5DT01QSUxFX1NUQVRVUykpIHtcclxuICAgICAgICByZXR1cm4gc2hhZGVyXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbWVzc2FnZSA9IFwiRmFpbGVkIHRvIGNvbXBpbGUgc2hhZGVyOiBcIiArIChnbC5nZXRTaGFkZXJJbmZvTG9nKHNoYWRlcikgPz8gXCJcIilcclxuICAgIGdsLmRlbGV0ZVNoYWRlcihzaGFkZXIpXHJcbiAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSlcclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBhIGdsIHByb2dyYW0gZnJvbSBzaGFkZXJzXHJcbiAqIEBwYXJhbSBnbCBnbCBjb250ZXh0XHJcbiAqIEBwYXJhbSB2ZXJ0ZXhTaGFkZXIgdmVydGV4IHNoYWRlciB0byBsaW5rXHJcbiAqIEBwYXJhbSBmcmFnbWVudFNoYWRlciBmcmFnbWVudCBzaGFkZXIgdG8gbGlua1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVByb2dyYW0oZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQsIHZlcnRleFNoYWRlcjogV2ViR0xTaGFkZXIsIGZyYWdtZW50U2hhZGVyOiBXZWJHTFNoYWRlcik6IFdlYkdMUHJvZ3JhbSB7XHJcbiAgICBjb25zdCBwcm9ncmFtID0gZ2wuY3JlYXRlUHJvZ3JhbSgpO1xyXG4gICAgaWYgKCFwcm9ncmFtKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGNyZWF0ZSBzaGFkZXIgcHJvZ3JhbVwiKVxyXG4gICAgfVxyXG5cclxuICAgIGdsLmF0dGFjaFNoYWRlcihwcm9ncmFtLCB2ZXJ0ZXhTaGFkZXIpO1xyXG4gICAgZ2wuYXR0YWNoU2hhZGVyKHByb2dyYW0sIGZyYWdtZW50U2hhZGVyKTtcclxuICAgIGdsLmxpbmtQcm9ncmFtKHByb2dyYW0pO1xyXG5cclxuICAgIGlmIChnbC5nZXRQcm9ncmFtUGFyYW1ldGVyKHByb2dyYW0sIGdsLkxJTktfU1RBVFVTKSkge1xyXG4gICAgICAgIHJldHVybiBwcm9ncmFtXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbWVzc2FnZSA9IGdsLmdldFByb2dyYW1JbmZvTG9nKHByb2dyYW0pXHJcbiAgICBnbC5kZWxldGVQcm9ncmFtKHByb2dyYW0pO1xyXG5cclxuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGxpbmsgcHJvZ3JhbTogJHttZXNzYWdlID8/IFwiXCJ9YClcclxufVxyXG5cclxuLyoqXHJcbiAqIGNvbXBpbGUgYW5kIGxpbmsgdGhlIHZlcnRleCBhbmQgZnJhZ21lbnQgc2hhZGVyIHNvdXJjZVxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKiBAcGFyYW0gdmVydGV4U3JjIHZlcnRleCBzaGFkZXIgc291cmNlXHJcbiAqIEBwYXJhbSBmcmFnbWVudFNyYyBmcmFnbWVudCBzaGFkZXIgc291cmNlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZVByb2dyYW0oZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQsIHZlcnRleFNyYzogc3RyaW5nLCBmcmFnbWVudFNyYzogc3RyaW5nKTogV2ViR0xQcm9ncmFtIHtcclxuICAgIGNvbnN0IHZlcnRleFNoYWRlciA9IGNyZWF0ZVNoYWRlcihnbCwgZ2wuVkVSVEVYX1NIQURFUiwgdmVydGV4U3JjKVxyXG4gICAgY29uc3QgZnJhZ21lbnRTaGFkZXIgPSBjcmVhdGVTaGFkZXIoZ2wsIGdsLkZSQUdNRU5UX1NIQURFUiwgZnJhZ21lbnRTcmMpXHJcbiAgICBjb25zdCBwcm9ncmFtID0gY3JlYXRlUHJvZ3JhbShnbCwgdmVydGV4U2hhZGVyLCBmcmFnbWVudFNoYWRlcilcclxuICAgIHJldHVybiBwcm9ncmFtXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjcmVhdGUgYSBidWZmZXIsIHRocm93IGFuIGV4Y2VwdGlvbiBvbiBmYWlsdXJlXHJcbiAqIEBwYXJhbSBnbCBnbCBjb250ZXh0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQnVmZmVyKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0KTogV2ViR0xCdWZmZXIge1xyXG4gICAgY29uc3QgYnVmZmVyID0gZ2wuY3JlYXRlQnVmZmVyKClcclxuICAgIGlmICghYnVmZmVyKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGNyZWF0ZSBidWZmZXJcIilcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYnVmZmVyXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXRyZWl2ZSBsb2NhdGlvbiBmb3IgdW5pZm9ybSwgdGhyb3dzIGV4Y2VwdGlvbiBpZiBub3QgZm91bmRcclxuICogQHBhcmFtIGdsIGdsIGNvbnRleHRcclxuICogQHBhcmFtIHByb2dyYW0gZ2wgcHJvZ3JhbVxyXG4gKiBAcGFyYW0gbmFtZSBuYW1lIG9mIHVuaWZvcm1cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRVbmlmb3JtTG9jYXRpb24oZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQsIHByb2dyYW06IFdlYkdMUHJvZ3JhbSwgbmFtZTogc3RyaW5nKTogV2ViR0xVbmlmb3JtTG9jYXRpb24ge1xyXG4gICAgY29uc3QgbG9jYXRpb24gPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24ocHJvZ3JhbSwgbmFtZSlcclxuICAgIGlmICghbG9jYXRpb24pIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byByZXRyaWV2ZSBsb2NhdGlvbiBvZiAke25hbWV9IHVuaWZvcm0uYClcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbG9jYXRpb25cclxufVxyXG5cclxuLyoqXHJcbiAqIFJldHJlaXZlIGxvY2F0aW9uIGZvciBhdHRyaWJ1dGUsIHRocm93cyBleGNlcHRpb24gaWYgbm90IGZvdW5kXHJcbiAqIEBwYXJhbSBnbCBnbCBjb250ZXh0XHJcbiAqIEBwYXJhbSBwcm9ncmFtIGdsIHByb2dyYW1cclxuICogQHBhcmFtIG5hbWUgbmFtZSBvZiBhdHRyaWJ1dGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRBdHRyaWJMb2NhdGlvbihnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCwgcHJvZ3JhbTogV2ViR0xQcm9ncmFtLCBuYW1lOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gICAgY29uc3QgYXR0cmliTG9jYXRpb24gPSBnbC5nZXRBdHRyaWJMb2NhdGlvbihwcm9ncmFtLCBuYW1lKVxyXG4gICAgaWYgKGF0dHJpYkxvY2F0aW9uIDwgMCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtuYW1lfSBhdHRyaWJ1dGUgd2FzIG5vdCBmb3VuZGApXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGF0dHJpYkxvY2F0aW9uXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjcmVhdGUgYSB2ZXJ0ZXggYXJyYXkgb2JqZWN0LCB0aHJvdyBleGNlcHRpb24gb24gZmFpbHVyZVxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVZlcnRleEFycmF5KGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0KTogV2ViR0xWZXJ0ZXhBcnJheU9iamVjdCB7XHJcbiAgICBjb25zdCB2YW8gPSBnbC5jcmVhdGVWZXJ0ZXhBcnJheSgpXHJcbiAgICBpZiAoIXZhbykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImZhaWxlZCB0byBjcmVhdGUgdmVydGV4IGFycmF5IG9iamVjdFwiKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2YW9cclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBhIHRleHR1cmUgb2JqZWN0LCB0aHJvdyBhbiBleGNlcHRpb24gb24gZmFpbHVyZVxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVRleHR1cmUoZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQpOiBXZWJHTFRleHR1cmUge1xyXG4gICAgY29uc3QgdGV4dHVyZSA9IGdsLmNyZWF0ZVRleHR1cmUoKVxyXG4gICAgaWYgKCF0ZXh0dXJlKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZmFpbGVkIHRvIGNyZWF0ZSB0ZXh0dXJlIG9iamVjdFwiKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0ZXh0dXJlXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjcmVhdGUgYSByZW5kZXJidWZmZXIgb2JqZWN0LCB0aHJvdyBhbiBleGNlcHRpb24gb24gZmFpbHVyZVxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlbmRlcmJ1ZmZlcihnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCk6IFdlYkdMUmVuZGVyYnVmZmVyIHtcclxuICAgIGNvbnN0IGJ1ZmZlciA9IGdsLmNyZWF0ZVJlbmRlcmJ1ZmZlcigpXHJcbiAgICBpZiAoIWJ1ZmZlcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBjcmVhdGUgcmVuZGVyYnVmZmVyIG9iamVjdFwiKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBidWZmZXJcclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBhIHNhbXBsZXIgb2JqZWN0LCB0aHJvdyBhbiBleGNlcHRpb24gb24gZmFpbHVyZVxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNhbXBsZXIoZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQpOiBXZWJHTFNhbXBsZXIge1xyXG4gICAgY29uc3Qgc2FtcGxlciA9IGdsLmNyZWF0ZVNhbXBsZXIoKVxyXG4gICAgaWYgKCFzYW1wbGVyKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZmFpbGVkIHRvIGNyZWF0ZSBzYW1wbGVyIG9iamVjdFwiKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzYW1wbGVyXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBsb2FkIGEgdGV4dHVyZSBmcm9tIHRoZSBzcGVjaWZpZWQgZmlsZVxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKiBAcGFyYW0gdXJsIHVybCBmcm9tIHdoaWNoIHRvIGxvYWQgdGV4dHVyZVxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRUZXh0dXJlKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LCB1cmw6IHN0cmluZyk6IFByb21pc2U8V2ViR0xUZXh0dXJlPiB7XHJcbiAgICBjb25zdCB0ZXh0dXJlID0gY3JlYXRlVGV4dHVyZShnbClcclxuICAgIGNvbnN0IGltYWdlID0gYXdhaXQgZG9tLmxvYWRJbWFnZSh1cmwpXHJcbiAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0ZXh0dXJlKVxyXG4gICAgZ2wudGV4SW1hZ2UyRChnbC5URVhUVVJFXzJELCAwLCBnbC5SR0JBLCBnbC5SR0JBLCBnbC5VTlNJR05FRF9CWVRFLCBpbWFnZSlcclxuICAgIGdsLmdlbmVyYXRlTWlwbWFwKGdsLlRFWFRVUkVfMkQpXHJcbiAgICByZXR1cm4gdGV4dHVyZVxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGEgZnJhbWVidWZmZXIgb2JqZWN0LCB0aHJvdyBleGNlcHRpb24gb24gZmFpbHVyZVxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUZyYW1lYnVmZmVyKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0KTogV2ViR0xGcmFtZWJ1ZmZlciB7XHJcbiAgICBjb25zdCBmcmFtZWJ1ZmZlciA9IGdsLmNyZWF0ZUZyYW1lYnVmZmVyKClcclxuICAgIGlmICghZnJhbWVidWZmZXIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gY3JlYXRlIGZyYW1lYnVmZmVyIG9iamVjdFwiKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmcmFtZWJ1ZmZlclxyXG59XHJcblxyXG4vKiBzaGFkZXIgZnJhZ21lbnRzICovXHJcbmNvbnN0IHBlcmxpbjIgPSBgXHJcbi8vIHBlcm11dGF0aW9uIHRhYmxlXHJcbmNvbnN0IGludCBwZXJtWzUxMl0gPSBpbnRbXShcclxuICAgIDIzLFxyXG4gICAgMTI1LFxyXG4gICAgMTYxLFxyXG4gICAgNTIsXHJcbiAgICAxMDMsXHJcbiAgICAxMTcsXHJcbiAgICA3MCxcclxuICAgIDM3LFxyXG4gICAgMjQ3LFxyXG4gICAgMTAxLFxyXG4gICAgMjAzLFxyXG4gICAgMTY5LFxyXG4gICAgMTI0LFxyXG4gICAgMTI2LFxyXG4gICAgNDQsXHJcbiAgICAxMjMsXHJcbiAgICAxNTIsXHJcbiAgICAyMzgsXHJcbiAgICAxNDUsXHJcbiAgICA0NSxcclxuICAgIDE3MSxcclxuICAgIDExNCxcclxuICAgIDI1MyxcclxuICAgIDEwLFxyXG4gICAgMTkyLFxyXG4gICAgMTM2LFxyXG4gICAgNCxcclxuICAgIDE1NyxcclxuICAgIDI0OSxcclxuICAgIDMwLFxyXG4gICAgMzUsXHJcbiAgICA3MixcclxuICAgIDE3NSxcclxuICAgIDYzLFxyXG4gICAgNzcsXHJcbiAgICA5MCxcclxuICAgIDE4MSxcclxuICAgIDE2LFxyXG4gICAgOTYsXHJcbiAgICAxMTEsXHJcbiAgICAxMzMsXHJcbiAgICAxMDQsXHJcbiAgICA3NSxcclxuICAgIDE2MixcclxuICAgIDkzLFxyXG4gICAgNTYsXHJcbiAgICA2NixcclxuICAgIDI0MCxcclxuICAgIDgsXHJcbiAgICA1MCxcclxuICAgIDg0LFxyXG4gICAgMjI5LFxyXG4gICAgNDksXHJcbiAgICAyMTAsXHJcbiAgICAxNzMsXHJcbiAgICAyMzksXHJcbiAgICAxNDEsXHJcbiAgICAxLFxyXG4gICAgODcsXHJcbiAgICAxOCxcclxuICAgIDIsXHJcbiAgICAxOTgsXHJcbiAgICAxNDMsXHJcbiAgICA1NyxcclxuICAgIDIyNSxcclxuICAgIDE2MCxcclxuICAgIDU4LFxyXG4gICAgMjE3LFxyXG4gICAgMTY4LFxyXG4gICAgMjA2LFxyXG4gICAgMjQ1LFxyXG4gICAgMjA0LFxyXG4gICAgMTk5LFxyXG4gICAgNixcclxuICAgIDczLFxyXG4gICAgNjAsXHJcbiAgICAyMCxcclxuICAgIDIzMCxcclxuICAgIDIxMSxcclxuICAgIDIzMyxcclxuICAgIDk0LFxyXG4gICAgMjAwLFxyXG4gICAgODgsXHJcbiAgICA5LFxyXG4gICAgNzQsXHJcbiAgICAxNTUsXHJcbiAgICAzMyxcclxuICAgIDE1LFxyXG4gICAgMjE5LFxyXG4gICAgMTMwLFxyXG4gICAgMjI2LFxyXG4gICAgMjAyLFxyXG4gICAgODMsXHJcbiAgICAyMzYsXHJcbiAgICA0MixcclxuICAgIDE3MixcclxuICAgIDE2NSxcclxuICAgIDIxOCxcclxuICAgIDU1LFxyXG4gICAgMjIyLFxyXG4gICAgNDYsXHJcbiAgICAxMDcsXHJcbiAgICA5OCxcclxuICAgIDE1NCxcclxuICAgIDEwOSxcclxuICAgIDY3LFxyXG4gICAgMTk2LFxyXG4gICAgMTc4LFxyXG4gICAgMTI3LFxyXG4gICAgMTU4LFxyXG4gICAgMTMsXHJcbiAgICAyNDMsXHJcbiAgICA2NSxcclxuICAgIDc5LFxyXG4gICAgMTY2LFxyXG4gICAgMjQ4LFxyXG4gICAgMjUsXHJcbiAgICAyMjQsXHJcbiAgICAxMTUsXHJcbiAgICA4MCxcclxuICAgIDY4LFxyXG4gICAgNTEsXHJcbiAgICAxODQsXHJcbiAgICAxMjgsXHJcbiAgICAyMzIsXHJcbiAgICAyMDgsXHJcbiAgICAxNTEsXHJcbiAgICAxMjIsXHJcbiAgICAyNixcclxuICAgIDIxMixcclxuICAgIDEwNSxcclxuICAgIDQzLFxyXG4gICAgMTc5LFxyXG4gICAgMjEzLFxyXG4gICAgMjM1LFxyXG4gICAgMTQ4LFxyXG4gICAgMTQ2LFxyXG4gICAgODksXHJcbiAgICAxNCxcclxuICAgIDE5NSxcclxuICAgIDI4LFxyXG4gICAgNzgsXHJcbiAgICAxMTIsXHJcbiAgICA3NixcclxuICAgIDI1MCxcclxuICAgIDQ3LFxyXG4gICAgMjQsXHJcbiAgICAyNTEsXHJcbiAgICAxNDAsXHJcbiAgICAxMDgsXHJcbiAgICAxODYsXHJcbiAgICAxOTAsXHJcbiAgICAyMjgsXHJcbiAgICAxNzAsXHJcbiAgICAxODMsXHJcbiAgICAxMzksXHJcbiAgICAzOSxcclxuICAgIDE4OCxcclxuICAgIDI0NCxcclxuICAgIDI0NixcclxuICAgIDEzMixcclxuICAgIDQ4LFxyXG4gICAgMTE5LFxyXG4gICAgMTQ0LFxyXG4gICAgMTgwLFxyXG4gICAgMTM4LFxyXG4gICAgMTM0LFxyXG4gICAgMTkzLFxyXG4gICAgODIsXHJcbiAgICAxODIsXHJcbiAgICAxMjAsXHJcbiAgICAxMjEsXHJcbiAgICA4NixcclxuICAgIDIyMCxcclxuICAgIDIwOSxcclxuICAgIDMsXHJcbiAgICA5MSxcclxuICAgIDI0MSxcclxuICAgIDE0OSxcclxuICAgIDg1LFxyXG4gICAgMjA1LFxyXG4gICAgMTUwLFxyXG4gICAgMTEzLFxyXG4gICAgMjE2LFxyXG4gICAgMzEsXHJcbiAgICAxMDAsXHJcbiAgICA0MSxcclxuICAgIDE2NCxcclxuICAgIDE3NyxcclxuICAgIDIxNCxcclxuICAgIDE1MyxcclxuICAgIDIzMSxcclxuICAgIDM4LFxyXG4gICAgNzEsXHJcbiAgICAxODUsXHJcbiAgICAxNzQsXHJcbiAgICA5NyxcclxuICAgIDIwMSxcclxuICAgIDI5LFxyXG4gICAgOTUsXHJcbiAgICA3LFxyXG4gICAgOTIsXHJcbiAgICA1NCxcclxuICAgIDI1NCxcclxuICAgIDE5MSxcclxuICAgIDExOCxcclxuICAgIDM0LFxyXG4gICAgMjIxLFxyXG4gICAgMTMxLFxyXG4gICAgMTEsXHJcbiAgICAxNjMsXHJcbiAgICA5OSxcclxuICAgIDIzNCxcclxuICAgIDgxLFxyXG4gICAgMjI3LFxyXG4gICAgMTQ3LFxyXG4gICAgMTU2LFxyXG4gICAgMTc2LFxyXG4gICAgMTcsXHJcbiAgICAxNDIsXHJcbiAgICA2OSxcclxuICAgIDEyLFxyXG4gICAgMTEwLFxyXG4gICAgNjIsXHJcbiAgICAyNyxcclxuICAgIDI1NSxcclxuICAgIDAsXHJcbiAgICAxOTQsXHJcbiAgICA1OSxcclxuICAgIDExNixcclxuICAgIDI0MixcclxuICAgIDI1MixcclxuICAgIDE5LFxyXG4gICAgMjEsXHJcbiAgICAxODcsXHJcbiAgICA1MyxcclxuICAgIDIwNyxcclxuICAgIDEyOSxcclxuICAgIDY0LFxyXG4gICAgMTM1LFxyXG4gICAgNjEsXHJcbiAgICA0MCxcclxuICAgIDE2NyxcclxuICAgIDIzNyxcclxuICAgIDEwMixcclxuICAgIDIyMyxcclxuICAgIDEwNixcclxuICAgIDE1OSxcclxuICAgIDE5NyxcclxuICAgIDE4OSxcclxuICAgIDIxNSxcclxuICAgIDEzNyxcclxuICAgIDM2LFxyXG4gICAgMzIsXHJcbiAgICAyMixcclxuICAgIDUsXHJcblxyXG4gICAgLy8gYW5kIGEgc2Vjb25kIGNvcHkgc28gd2UgZG9uJ3QgbmVlZCBhbiBleHRyYSBtYXNrIG9yIHN0YXRpYyBpbml0aWFsaXplclxyXG4gICAgMjMsXHJcbiAgICAxMjUsXHJcbiAgICAxNjEsXHJcbiAgICA1MixcclxuICAgIDEwMyxcclxuICAgIDExNyxcclxuICAgIDcwLFxyXG4gICAgMzcsXHJcbiAgICAyNDcsXHJcbiAgICAxMDEsXHJcbiAgICAyMDMsXHJcbiAgICAxNjksXHJcbiAgICAxMjQsXHJcbiAgICAxMjYsXHJcbiAgICA0NCxcclxuICAgIDEyMyxcclxuICAgIDE1MixcclxuICAgIDIzOCxcclxuICAgIDE0NSxcclxuICAgIDQ1LFxyXG4gICAgMTcxLFxyXG4gICAgMTE0LFxyXG4gICAgMjUzLFxyXG4gICAgMTAsXHJcbiAgICAxOTIsXHJcbiAgICAxMzYsXHJcbiAgICA0LFxyXG4gICAgMTU3LFxyXG4gICAgMjQ5LFxyXG4gICAgMzAsXHJcbiAgICAzNSxcclxuICAgIDcyLFxyXG4gICAgMTc1LFxyXG4gICAgNjMsXHJcbiAgICA3NyxcclxuICAgIDkwLFxyXG4gICAgMTgxLFxyXG4gICAgMTYsXHJcbiAgICA5NixcclxuICAgIDExMSxcclxuICAgIDEzMyxcclxuICAgIDEwNCxcclxuICAgIDc1LFxyXG4gICAgMTYyLFxyXG4gICAgOTMsXHJcbiAgICA1NixcclxuICAgIDY2LFxyXG4gICAgMjQwLFxyXG4gICAgOCxcclxuICAgIDUwLFxyXG4gICAgODQsXHJcbiAgICAyMjksXHJcbiAgICA0OSxcclxuICAgIDIxMCxcclxuICAgIDE3MyxcclxuICAgIDIzOSxcclxuICAgIDE0MSxcclxuICAgIDEsXHJcbiAgICA4NyxcclxuICAgIDE4LFxyXG4gICAgMixcclxuICAgIDE5OCxcclxuICAgIDE0MyxcclxuICAgIDU3LFxyXG4gICAgMjI1LFxyXG4gICAgMTYwLFxyXG4gICAgNTgsXHJcbiAgICAyMTcsXHJcbiAgICAxNjgsXHJcbiAgICAyMDYsXHJcbiAgICAyNDUsXHJcbiAgICAyMDQsXHJcbiAgICAxOTksXHJcbiAgICA2LFxyXG4gICAgNzMsXHJcbiAgICA2MCxcclxuICAgIDIwLFxyXG4gICAgMjMwLFxyXG4gICAgMjExLFxyXG4gICAgMjMzLFxyXG4gICAgOTQsXHJcbiAgICAyMDAsXHJcbiAgICA4OCxcclxuICAgIDksXHJcbiAgICA3NCxcclxuICAgIDE1NSxcclxuICAgIDMzLFxyXG4gICAgMTUsXHJcbiAgICAyMTksXHJcbiAgICAxMzAsXHJcbiAgICAyMjYsXHJcbiAgICAyMDIsXHJcbiAgICA4MyxcclxuICAgIDIzNixcclxuICAgIDQyLFxyXG4gICAgMTcyLFxyXG4gICAgMTY1LFxyXG4gICAgMjE4LFxyXG4gICAgNTUsXHJcbiAgICAyMjIsXHJcbiAgICA0NixcclxuICAgIDEwNyxcclxuICAgIDk4LFxyXG4gICAgMTU0LFxyXG4gICAgMTA5LFxyXG4gICAgNjcsXHJcbiAgICAxOTYsXHJcbiAgICAxNzgsXHJcbiAgICAxMjcsXHJcbiAgICAxNTgsXHJcbiAgICAxMyxcclxuICAgIDI0MyxcclxuICAgIDY1LFxyXG4gICAgNzksXHJcbiAgICAxNjYsXHJcbiAgICAyNDgsXHJcbiAgICAyNSxcclxuICAgIDIyNCxcclxuICAgIDExNSxcclxuICAgIDgwLFxyXG4gICAgNjgsXHJcbiAgICA1MSxcclxuICAgIDE4NCxcclxuICAgIDEyOCxcclxuICAgIDIzMixcclxuICAgIDIwOCxcclxuICAgIDE1MSxcclxuICAgIDEyMixcclxuICAgIDI2LFxyXG4gICAgMjEyLFxyXG4gICAgMTA1LFxyXG4gICAgNDMsXHJcbiAgICAxNzksXHJcbiAgICAyMTMsXHJcbiAgICAyMzUsXHJcbiAgICAxNDgsXHJcbiAgICAxNDYsXHJcbiAgICA4OSxcclxuICAgIDE0LFxyXG4gICAgMTk1LFxyXG4gICAgMjgsXHJcbiAgICA3OCxcclxuICAgIDExMixcclxuICAgIDc2LFxyXG4gICAgMjUwLFxyXG4gICAgNDcsXHJcbiAgICAyNCxcclxuICAgIDI1MSxcclxuICAgIDE0MCxcclxuICAgIDEwOCxcclxuICAgIDE4NixcclxuICAgIDE5MCxcclxuICAgIDIyOCxcclxuICAgIDE3MCxcclxuICAgIDE4MyxcclxuICAgIDEzOSxcclxuICAgIDM5LFxyXG4gICAgMTg4LFxyXG4gICAgMjQ0LFxyXG4gICAgMjQ2LFxyXG4gICAgMTMyLFxyXG4gICAgNDgsXHJcbiAgICAxMTksXHJcbiAgICAxNDQsXHJcbiAgICAxODAsXHJcbiAgICAxMzgsXHJcbiAgICAxMzQsXHJcbiAgICAxOTMsXHJcbiAgICA4MixcclxuICAgIDE4MixcclxuICAgIDEyMCxcclxuICAgIDEyMSxcclxuICAgIDg2LFxyXG4gICAgMjIwLFxyXG4gICAgMjA5LFxyXG4gICAgMyxcclxuICAgIDkxLFxyXG4gICAgMjQxLFxyXG4gICAgMTQ5LFxyXG4gICAgODUsXHJcbiAgICAyMDUsXHJcbiAgICAxNTAsXHJcbiAgICAxMTMsXHJcbiAgICAyMTYsXHJcbiAgICAzMSxcclxuICAgIDEwMCxcclxuICAgIDQxLFxyXG4gICAgMTY0LFxyXG4gICAgMTc3LFxyXG4gICAgMjE0LFxyXG4gICAgMTUzLFxyXG4gICAgMjMxLFxyXG4gICAgMzgsXHJcbiAgICA3MSxcclxuICAgIDE4NSxcclxuICAgIDE3NCxcclxuICAgIDk3LFxyXG4gICAgMjAxLFxyXG4gICAgMjksXHJcbiAgICA5NSxcclxuICAgIDcsXHJcbiAgICA5MixcclxuICAgIDU0LFxyXG4gICAgMjU0LFxyXG4gICAgMTkxLFxyXG4gICAgMTE4LFxyXG4gICAgMzQsXHJcbiAgICAyMjEsXHJcbiAgICAxMzEsXHJcbiAgICAxMSxcclxuICAgIDE2MyxcclxuICAgIDk5LFxyXG4gICAgMjM0LFxyXG4gICAgODEsXHJcbiAgICAyMjcsXHJcbiAgICAxNDcsXHJcbiAgICAxNTYsXHJcbiAgICAxNzYsXHJcbiAgICAxNyxcclxuICAgIDE0MixcclxuICAgIDY5LFxyXG4gICAgMTIsXHJcbiAgICAxMTAsXHJcbiAgICA2MixcclxuICAgIDI3LFxyXG4gICAgMjU1LFxyXG4gICAgMCxcclxuICAgIDE5NCxcclxuICAgIDU5LFxyXG4gICAgMTE2LFxyXG4gICAgMjQyLFxyXG4gICAgMjUyLFxyXG4gICAgMTksXHJcbiAgICAyMSxcclxuICAgIDE4NyxcclxuICAgIDUzLFxyXG4gICAgMjA3LFxyXG4gICAgMTI5LFxyXG4gICAgNjQsXHJcbiAgICAxMzUsXHJcbiAgICA2MSxcclxuICAgIDQwLFxyXG4gICAgMTY3LFxyXG4gICAgMjM3LFxyXG4gICAgMTAyLFxyXG4gICAgMjIzLFxyXG4gICAgMTA2LFxyXG4gICAgMTU5LFxyXG4gICAgMTk3LFxyXG4gICAgMTg5LFxyXG4gICAgMjE1LFxyXG4gICAgMTM3LFxyXG4gICAgMzYsXHJcbiAgICAzMixcclxuICAgIDIyLFxyXG4gICAgNVxyXG4pO1xyXG5cclxuLy8gY2FsY3VsYXRlcyBkb3QgcHJvZHVjdCBvZiB4LCB5IGFuZCBncmFkaWVudFxyXG5mbG9hdCBncmFkMShjb25zdCBpbnQgaGFzaCwgY29uc3QgZmxvYXQgeCkge1xyXG4gICAgcmV0dXJuIChoYXNoICYgMSkgPT0gMHgwID8gLXggOiB4O1xyXG59XHJcblxyXG4vLyBjYWxjdWxhdGVzIGRvdCBwcm9kdWN0IG9mIHgsIHkgYW5kIGdyYWRpZW50XHJcbmZsb2F0IGdyYWQyKGNvbnN0IGludCBoYXNoLCBjb25zdCBmbG9hdCB4LCBjb25zdCBmbG9hdCB5KSB7XHJcbiAgICBpbnQgaCA9IGhhc2ggJiAweDAzO1xyXG4gICAgc3dpdGNoIChoKSB7XHJcbiAgICBjYXNlIDB4MDA6XHJcbiAgICAgICAgLy8gKC0xLCAwKVxyXG4gICAgICAgIHJldHVybiAteDtcclxuICAgICAgICBicmVhaztcclxuICAgIGNhc2UgMHgwMTpcclxuICAgICAgICAvLyAoMSwgMClcclxuICAgICAgICByZXR1cm4geDtcclxuICAgICAgICBicmVhaztcclxuICAgIGNhc2UgMHgwMjpcclxuICAgICAgICAvLyAoMCwgLTEpXHJcbiAgICAgICAgcmV0dXJuIC15O1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAweDAzOlxyXG4gICAgICAgIC8vICgwLCAxKVxyXG4gICAgICAgIHJldHVybiB5O1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4gMC5mO1xyXG4gICAgfVxyXG59XHJcbiAgICBcclxuZmxvYXQgc21vb3RoZXJzdGVwKGNvbnN0IGZsb2F0IHgpIHtcclxuICAgIHJldHVybiB4ICogeCAqIHggKiAoeCAqICh4ICogNi5mIC0gMTUuZikgKyAxMC5mKTtcclxufVxyXG5cclxuZmxvYXQgcGVybGluMShjb25zdCBmbG9hdCB4eCkge1xyXG4gICAgaW50IHhmID0gaW50KGZsb29yKHh4KSk7XHJcbiAgICBmbG9hdCB4ID0geHggLSBmbG9hdCh4Zik7XHJcbiAgICBmbG9hdCB1ID0gc21vb3RoZXJzdGVwKHgpO1xyXG4gICAgaW50IHgwID0geGYgJiAyNTU7XHJcbiAgICBpbnQgeDEgPSAoeGYgKyAxKSAmIDI1NTtcclxuICAgIGZsb2F0IG4wID0gZ3JhZDEocGVybVt4MF0sIHgpO1xyXG4gICAgZmxvYXQgbjEgPSBncmFkMShwZXJtW3gxXSwgeCAtIDEuZik7XHJcbiAgICBmbG9hdCBuID0gbWl4KG4wLCBuMSwgdSk7XHJcbiAgICByZXR1cm4gbjtcclxufVxyXG5cclxuZmxvYXQgcGVybGluMihjb25zdCBmbG9hdCB4eCwgY29uc3QgZmxvYXQgeXkpIHtcclxuICAgIGludCB4ZiA9IGludChmbG9vcih4eCkpO1xyXG4gICAgaW50IHlmID0gaW50KGZsb29yKHl5KSk7XHJcbiAgICBmbG9hdCB4ID0geHggLSBmbG9hdCh4Zik7XHJcbiAgICBmbG9hdCB5ID0geXkgLSBmbG9hdCh5Zik7XHJcbiAgICBmbG9hdCB1ID0gc21vb3RoZXJzdGVwKHgpO1xyXG4gICAgZmxvYXQgdiA9IHNtb290aGVyc3RlcCh5KTtcclxuICAgIGludCB4MCA9IHhmICYgMjU1O1xyXG4gICAgaW50IHkwID0geWYgJiAyNTU7XHJcbiAgICBpbnQgeDEgPSAoeGYgKyAxKSAmIDI1NTtcclxuICAgIGludCB5MSA9ICh5ZiArIDEpICYgMjU1O1xyXG4gICAgaW50IHIwID0gcGVybVt4MF07XHJcbiAgICBpbnQgcjEgPSBwZXJtW3gxXTtcclxuICAgIGludCByMDAgPSBwZXJtW3IwICsgeTBdO1xyXG4gICAgaW50IHIwMSA9IHBlcm1bcjAgKyB5MV07XHJcbiAgICBpbnQgcjEwID0gcGVybVtyMSArIHkwXTtcclxuICAgIGludCByMTEgPSBwZXJtW3IxICsgeTFdO1xyXG4gICAgZmxvYXQgbjAwID0gZ3JhZDIocjAwLCB4LCB5KTtcclxuICAgIGZsb2F0IG4wMSA9IGdyYWQyKHIwMSwgeCwgeSAtIDEuZik7XHJcbiAgICBmbG9hdCBuMTAgPSBncmFkMihyMTAsIHggLSAxLmYsIHkpO1xyXG4gICAgZmxvYXQgbjExID0gZ3JhZDIocjExLCB4IC0gMS5mLCB5IC0gMS5mKTtcclxuICAgIGZsb2F0IG4wID0gbWl4KG4wMCwgbjAxLCB2KTtcclxuICAgIGZsb2F0IG4xID0gbWl4KG4xMCwgbjExLCB2KTtcclxuICAgIGZsb2F0IG4gPSBtaXgobjAsIG4xLCB1KTtcclxuICAgIHJldHVybiBuO1xyXG59XHJcblxyXG5mbG9hdCBmYm0yKGNvbnN0IGZsb2F0IHgsIGNvbnN0IGZsb2F0IHksIGNvbnN0IGZsb2F0IGxhY3VuYXJpdHksIGNvbnN0IGZsb2F0IGdhaW4sIGNvbnN0IGludCBvY3RhdmVzKSB7XHJcbiAgICBmbG9hdCBmcmVxID0gMS5mO1xyXG4gICAgZmxvYXQgYW1wID0gMS5mO1xyXG4gICAgZmxvYXQgc3VtID0gMC5mO1xyXG4gICAgZm9yIChpbnQgaSA9IDA7IGkgPCBvY3RhdmVzOyArK2kpIHtcclxuICAgICAgICBzdW0gKz0gYW1wICogcGVybGluMih4ICogZnJlcSwgeSAqIGZyZXEpO1xyXG4gICAgICAgIGZyZXEgKj0gbGFjdW5hcml0eTtcclxuICAgICAgICBhbXAgKj0gZ2FpbjtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc3VtO1xyXG59XHJcbmBcclxuXHJcbmV4cG9ydCB7IHBlcmxpbjIgfSJdfQ==