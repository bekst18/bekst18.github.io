/* webgl utility library */
import * as dom from "../shared/dom.js";
/**
 * create webgl2 rendering context
 */
export function createContext(canvas) {
    const gl = canvas.getContext("webgl2");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2x1LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2x1LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJCQUEyQjtBQUMzQixPQUFPLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFBO0FBRXZDOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGFBQWEsQ0FBQyxNQUF5QjtJQUNuRCxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3RDLElBQUksQ0FBQyxFQUFFLEVBQUU7UUFDTCxNQUFNLElBQUksS0FBSyxDQUFDLDhGQUE4RixDQUFDLENBQUE7S0FDbEg7SUFFRCxPQUFPLEVBQUUsQ0FBQTtBQUNiLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxZQUFZLENBQUMsRUFBMEIsRUFBRSxJQUFZLEVBQUUsTUFBYzs7SUFDakYsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNwQyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ1QsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0tBQzdDO0lBRUQsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDL0IsRUFBRSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUV4QixJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxFQUFFO1FBQ2xELE9BQU8sTUFBTSxDQUFBO0tBQ2hCO0lBRUQsTUFBTSxPQUFPLEdBQUcsNEJBQTRCLEdBQUcsT0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLG1DQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ2xGLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUM1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aUJBQWlCLENBQUMsRUFBMEI7SUFDeEQsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDMUMsSUFBSSxDQUFDLFdBQVcsRUFBRTtRQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQTtLQUN6RDtJQUVELE9BQU8sV0FBVyxDQUFBO0FBQ3RCLENBQUM7QUFFRCxzQkFBc0I7QUFDdEIsTUFBTSxPQUFPLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0E0bEJmLENBQUE7QUFFRCxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB3ZWJnbCB1dGlsaXR5IGxpYnJhcnkgKi9cclxuaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuXHJcbi8qKlxyXG4gKiBjcmVhdGUgd2ViZ2wyIHJlbmRlcmluZyBjb250ZXh0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29udGV4dChjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KTogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCB7XHJcbiAgICBjb25zdCBnbCA9IGNhbnZhcy5nZXRDb250ZXh0KFwid2ViZ2wyXCIpXHJcbiAgICBpZiAoIWdsKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIG5vdCBpbml0aWFsaXplIHdlYmdsIDIuMC4gQ29uZmlybSB0aGF0IHlvdXIgYnJvd3NlciBpcyB1cCB0byBkYXRlIGFuZCBoYXMgc3VwcG9ydC5cIilcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZ2xcclxufVxyXG5cclxuLyoqXHJcbiAqIFxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKiBAcGFyYW0gdHlwZSB0eXBlIG9mIHNoYWRlciB0byBjcmVhdGVcclxuICogQHBhcmFtIHNvdXJjZSBzaGFkZXIgc291cmNlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2hhZGVyKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LCB0eXBlOiBHTGVudW0sIHNvdXJjZTogc3RyaW5nKTogV2ViR0xTaGFkZXIge1xyXG4gICAgY29uc3Qgc2hhZGVyID0gZ2wuY3JlYXRlU2hhZGVyKHR5cGUpXHJcbiAgICBpZiAoIXNoYWRlcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBjcmVhdGUgc2hhZGVyXCIpXHJcbiAgICB9XHJcblxyXG4gICAgZ2wuc2hhZGVyU291cmNlKHNoYWRlciwgc291cmNlKVxyXG4gICAgZ2wuY29tcGlsZVNoYWRlcihzaGFkZXIpXHJcblxyXG4gICAgaWYgKGdsLmdldFNoYWRlclBhcmFtZXRlcihzaGFkZXIsIGdsLkNPTVBJTEVfU1RBVFVTKSkge1xyXG4gICAgICAgIHJldHVybiBzaGFkZXJcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBtZXNzYWdlID0gXCJGYWlsZWQgdG8gY29tcGlsZSBzaGFkZXI6IFwiICsgKGdsLmdldFNoYWRlckluZm9Mb2coc2hhZGVyKSA/PyBcIlwiKVxyXG4gICAgZ2wuZGVsZXRlU2hhZGVyKHNoYWRlcilcclxuICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKVxyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGEgZ2wgcHJvZ3JhbSBmcm9tIHNoYWRlcnNcclxuICogQHBhcmFtIGdsIGdsIGNvbnRleHRcclxuICogQHBhcmFtIHZlcnRleFNoYWRlciB2ZXJ0ZXggc2hhZGVyIHRvIGxpbmtcclxuICogQHBhcmFtIGZyYWdtZW50U2hhZGVyIGZyYWdtZW50IHNoYWRlciB0byBsaW5rXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJvZ3JhbShnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCwgdmVydGV4U2hhZGVyOiBXZWJHTFNoYWRlciwgZnJhZ21lbnRTaGFkZXI6IFdlYkdMU2hhZGVyKTogV2ViR0xQcm9ncmFtIHtcclxuICAgIGNvbnN0IHByb2dyYW0gPSBnbC5jcmVhdGVQcm9ncmFtKCk7XHJcbiAgICBpZiAoIXByb2dyYW0pIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gY3JlYXRlIHNoYWRlciBwcm9ncmFtXCIpXHJcbiAgICB9XHJcblxyXG4gICAgZ2wuYXR0YWNoU2hhZGVyKHByb2dyYW0sIHZlcnRleFNoYWRlcik7XHJcbiAgICBnbC5hdHRhY2hTaGFkZXIocHJvZ3JhbSwgZnJhZ21lbnRTaGFkZXIpO1xyXG4gICAgZ2wubGlua1Byb2dyYW0ocHJvZ3JhbSk7XHJcblxyXG4gICAgaWYgKGdsLmdldFByb2dyYW1QYXJhbWV0ZXIocHJvZ3JhbSwgZ2wuTElOS19TVEFUVVMpKSB7XHJcbiAgICAgICAgcmV0dXJuIHByb2dyYW1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBtZXNzYWdlID0gZ2wuZ2V0UHJvZ3JhbUluZm9Mb2cocHJvZ3JhbSlcclxuICAgIGdsLmRlbGV0ZVByb2dyYW0ocHJvZ3JhbSk7XHJcblxyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gbGluayBwcm9ncmFtOiAke21lc3NhZ2UgPz8gXCJcIn1gKVxyXG59XHJcblxyXG4vKipcclxuICogY29tcGlsZSBhbmQgbGluayB0aGUgdmVydGV4IGFuZCBmcmFnbWVudCBzaGFkZXIgc291cmNlXHJcbiAqIEBwYXJhbSBnbCBnbCBjb250ZXh0XHJcbiAqIEBwYXJhbSB2ZXJ0ZXhTcmMgdmVydGV4IHNoYWRlciBzb3VyY2VcclxuICogQHBhcmFtIGZyYWdtZW50U3JjIGZyYWdtZW50IHNoYWRlciBzb3VyY2VcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlUHJvZ3JhbShnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCwgdmVydGV4U3JjOiBzdHJpbmcsIGZyYWdtZW50U3JjOiBzdHJpbmcpOiBXZWJHTFByb2dyYW0ge1xyXG4gICAgY29uc3QgdmVydGV4U2hhZGVyID0gY3JlYXRlU2hhZGVyKGdsLCBnbC5WRVJURVhfU0hBREVSLCB2ZXJ0ZXhTcmMpXHJcbiAgICBjb25zdCBmcmFnbWVudFNoYWRlciA9IGNyZWF0ZVNoYWRlcihnbCwgZ2wuRlJBR01FTlRfU0hBREVSLCBmcmFnbWVudFNyYylcclxuICAgIGNvbnN0IHByb2dyYW0gPSBjcmVhdGVQcm9ncmFtKGdsLCB2ZXJ0ZXhTaGFkZXIsIGZyYWdtZW50U2hhZGVyKVxyXG4gICAgcmV0dXJuIHByb2dyYW1cclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBhIGJ1ZmZlciwgdGhyb3cgYW4gZXhjZXB0aW9uIG9uIGZhaWx1cmVcclxuICogQHBhcmFtIGdsIGdsIGNvbnRleHRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVCdWZmZXIoZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQpOiBXZWJHTEJ1ZmZlciB7XHJcbiAgICBjb25zdCBidWZmZXIgPSBnbC5jcmVhdGVCdWZmZXIoKVxyXG4gICAgaWYgKCFidWZmZXIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gY3JlYXRlIGJ1ZmZlclwiKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBidWZmZXJcclxufVxyXG5cclxuLyoqXHJcbiAqIFJldHJlaXZlIGxvY2F0aW9uIGZvciB1bmlmb3JtLCB0aHJvd3MgZXhjZXB0aW9uIGlmIG5vdCBmb3VuZFxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKiBAcGFyYW0gcHJvZ3JhbSBnbCBwcm9ncmFtXHJcbiAqIEBwYXJhbSBuYW1lIG5hbWUgb2YgdW5pZm9ybVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaWZvcm1Mb2NhdGlvbihnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCwgcHJvZ3JhbTogV2ViR0xQcm9ncmFtLCBuYW1lOiBzdHJpbmcpOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiB7XHJcbiAgICBjb25zdCBsb2NhdGlvbiA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9ncmFtLCBuYW1lKVxyXG4gICAgaWYgKCFsb2NhdGlvbikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHJldHJpZXZlIGxvY2F0aW9uIG9mICR7bmFtZX0gdW5pZm9ybS5gKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBsb2NhdGlvblxyXG59XHJcblxyXG4vKipcclxuICogUmV0cmVpdmUgbG9jYXRpb24gZm9yIGF0dHJpYnV0ZSwgdGhyb3dzIGV4Y2VwdGlvbiBpZiBub3QgZm91bmRcclxuICogQHBhcmFtIGdsIGdsIGNvbnRleHRcclxuICogQHBhcmFtIHByb2dyYW0gZ2wgcHJvZ3JhbVxyXG4gKiBAcGFyYW0gbmFtZSBuYW1lIG9mIGF0dHJpYnV0ZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEF0dHJpYkxvY2F0aW9uKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LCBwcm9ncmFtOiBXZWJHTFByb2dyYW0sIG5hbWU6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgICBjb25zdCBhdHRyaWJMb2NhdGlvbiA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHByb2dyYW0sIG5hbWUpXHJcbiAgICBpZiAoYXR0cmliTG9jYXRpb24gPCAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke25hbWV9IGF0dHJpYnV0ZSB3YXMgbm90IGZvdW5kYClcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYXR0cmliTG9jYXRpb25cclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBhIHZlcnRleCBhcnJheSBvYmplY3QsIHRocm93IGV4Y2VwdGlvbiBvbiBmYWlsdXJlXHJcbiAqIEBwYXJhbSBnbCBnbCBjb250ZXh0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVmVydGV4QXJyYXkoZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQpOiBXZWJHTFZlcnRleEFycmF5T2JqZWN0IHtcclxuICAgIGNvbnN0IHZhbyA9IGdsLmNyZWF0ZVZlcnRleEFycmF5KClcclxuICAgIGlmICghdmFvKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZmFpbGVkIHRvIGNyZWF0ZSB2ZXJ0ZXggYXJyYXkgb2JqZWN0XCIpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZhb1xyXG59XHJcblxyXG4vKipcclxuICogY3JlYXRlIGEgdGV4dHVyZSBvYmplY3QsIHRocm93IGFuIGV4Y2VwdGlvbiBvbiBmYWlsdXJlXHJcbiAqIEBwYXJhbSBnbCBnbCBjb250ZXh0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVGV4dHVyZShnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCk6IFdlYkdMVGV4dHVyZSB7XHJcbiAgICBjb25zdCB0ZXh0dXJlID0gZ2wuY3JlYXRlVGV4dHVyZSgpXHJcbiAgICBpZiAoIXRleHR1cmUpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJmYWlsZWQgdG8gY3JlYXRlIHRleHR1cmUgb2JqZWN0XCIpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRleHR1cmVcclxufVxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBhIHNhbXBsZXIgb2JqZWN0LCB0aHJvdyBhbiBleGNlcHRpb24gb24gZmFpbHVyZVxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNhbXBsZXIoZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQpOiBXZWJHTFNhbXBsZXIge1xyXG4gICAgY29uc3Qgc2FtcGxlciA9IGdsLmNyZWF0ZVNhbXBsZXIoKVxyXG4gICAgaWYgKCFzYW1wbGVyKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZmFpbGVkIHRvIGNyZWF0ZSBzYW1wbGVyIG9iamVjdFwiKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzYW1wbGVyXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBsb2FkIGEgdGV4dHVyZSBmcm9tIHRoZSBzcGVjaWZpZWQgZmlsZVxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKiBAcGFyYW0gdXJsIHVybCBmcm9tIHdoaWNoIHRvIGxvYWQgdGV4dHVyZVxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRUZXh0dXJlKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LCB1cmw6IHN0cmluZyk6IFByb21pc2U8V2ViR0xUZXh0dXJlPiB7XHJcbiAgICBjb25zdCB0ZXh0dXJlID0gY3JlYXRlVGV4dHVyZShnbClcclxuICAgIGNvbnN0IGltYWdlID0gYXdhaXQgZG9tLmxvYWRJbWFnZSh1cmwpXHJcbiAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0ZXh0dXJlKVxyXG4gICAgZ2wudGV4SW1hZ2UyRChnbC5URVhUVVJFXzJELCAwLCBnbC5SR0JBLCBnbC5SR0JBLCBnbC5VTlNJR05FRF9CWVRFLCBpbWFnZSlcclxuICAgIGdsLmdlbmVyYXRlTWlwbWFwKGdsLlRFWFRVUkVfMkQpXHJcbiAgICByZXR1cm4gdGV4dHVyZVxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGEgZnJhbWVidWZmZXIgb2JqZWN0LCB0aHJvdyBleGNlcHRpb24gb24gZmFpbHVyZVxyXG4gKiBAcGFyYW0gZ2wgZ2wgY29udGV4dFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUZyYW1lYnVmZmVyKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0KTogV2ViR0xGcmFtZWJ1ZmZlciB7XHJcbiAgICBjb25zdCBmcmFtZWJ1ZmZlciA9IGdsLmNyZWF0ZUZyYW1lYnVmZmVyKClcclxuICAgIGlmICghZnJhbWVidWZmZXIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gY3JlYXRlIGZyYW1lYnVmZmVyIG9iamVjdFwiKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmcmFtZWJ1ZmZlclxyXG59XHJcblxyXG4vKiBzaGFkZXIgZnJhZ21lbnRzICovXHJcbmNvbnN0IHBlcmxpbjIgPSBgXHJcbi8vIHBlcm11dGF0aW9uIHRhYmxlXHJcbmNvbnN0IGludCBwZXJtWzUxMl0gPSBpbnRbXShcclxuICAgIDIzLFxyXG4gICAgMTI1LFxyXG4gICAgMTYxLFxyXG4gICAgNTIsXHJcbiAgICAxMDMsXHJcbiAgICAxMTcsXHJcbiAgICA3MCxcclxuICAgIDM3LFxyXG4gICAgMjQ3LFxyXG4gICAgMTAxLFxyXG4gICAgMjAzLFxyXG4gICAgMTY5LFxyXG4gICAgMTI0LFxyXG4gICAgMTI2LFxyXG4gICAgNDQsXHJcbiAgICAxMjMsXHJcbiAgICAxNTIsXHJcbiAgICAyMzgsXHJcbiAgICAxNDUsXHJcbiAgICA0NSxcclxuICAgIDE3MSxcclxuICAgIDExNCxcclxuICAgIDI1MyxcclxuICAgIDEwLFxyXG4gICAgMTkyLFxyXG4gICAgMTM2LFxyXG4gICAgNCxcclxuICAgIDE1NyxcclxuICAgIDI0OSxcclxuICAgIDMwLFxyXG4gICAgMzUsXHJcbiAgICA3MixcclxuICAgIDE3NSxcclxuICAgIDYzLFxyXG4gICAgNzcsXHJcbiAgICA5MCxcclxuICAgIDE4MSxcclxuICAgIDE2LFxyXG4gICAgOTYsXHJcbiAgICAxMTEsXHJcbiAgICAxMzMsXHJcbiAgICAxMDQsXHJcbiAgICA3NSxcclxuICAgIDE2MixcclxuICAgIDkzLFxyXG4gICAgNTYsXHJcbiAgICA2NixcclxuICAgIDI0MCxcclxuICAgIDgsXHJcbiAgICA1MCxcclxuICAgIDg0LFxyXG4gICAgMjI5LFxyXG4gICAgNDksXHJcbiAgICAyMTAsXHJcbiAgICAxNzMsXHJcbiAgICAyMzksXHJcbiAgICAxNDEsXHJcbiAgICAxLFxyXG4gICAgODcsXHJcbiAgICAxOCxcclxuICAgIDIsXHJcbiAgICAxOTgsXHJcbiAgICAxNDMsXHJcbiAgICA1NyxcclxuICAgIDIyNSxcclxuICAgIDE2MCxcclxuICAgIDU4LFxyXG4gICAgMjE3LFxyXG4gICAgMTY4LFxyXG4gICAgMjA2LFxyXG4gICAgMjQ1LFxyXG4gICAgMjA0LFxyXG4gICAgMTk5LFxyXG4gICAgNixcclxuICAgIDczLFxyXG4gICAgNjAsXHJcbiAgICAyMCxcclxuICAgIDIzMCxcclxuICAgIDIxMSxcclxuICAgIDIzMyxcclxuICAgIDk0LFxyXG4gICAgMjAwLFxyXG4gICAgODgsXHJcbiAgICA5LFxyXG4gICAgNzQsXHJcbiAgICAxNTUsXHJcbiAgICAzMyxcclxuICAgIDE1LFxyXG4gICAgMjE5LFxyXG4gICAgMTMwLFxyXG4gICAgMjI2LFxyXG4gICAgMjAyLFxyXG4gICAgODMsXHJcbiAgICAyMzYsXHJcbiAgICA0MixcclxuICAgIDE3MixcclxuICAgIDE2NSxcclxuICAgIDIxOCxcclxuICAgIDU1LFxyXG4gICAgMjIyLFxyXG4gICAgNDYsXHJcbiAgICAxMDcsXHJcbiAgICA5OCxcclxuICAgIDE1NCxcclxuICAgIDEwOSxcclxuICAgIDY3LFxyXG4gICAgMTk2LFxyXG4gICAgMTc4LFxyXG4gICAgMTI3LFxyXG4gICAgMTU4LFxyXG4gICAgMTMsXHJcbiAgICAyNDMsXHJcbiAgICA2NSxcclxuICAgIDc5LFxyXG4gICAgMTY2LFxyXG4gICAgMjQ4LFxyXG4gICAgMjUsXHJcbiAgICAyMjQsXHJcbiAgICAxMTUsXHJcbiAgICA4MCxcclxuICAgIDY4LFxyXG4gICAgNTEsXHJcbiAgICAxODQsXHJcbiAgICAxMjgsXHJcbiAgICAyMzIsXHJcbiAgICAyMDgsXHJcbiAgICAxNTEsXHJcbiAgICAxMjIsXHJcbiAgICAyNixcclxuICAgIDIxMixcclxuICAgIDEwNSxcclxuICAgIDQzLFxyXG4gICAgMTc5LFxyXG4gICAgMjEzLFxyXG4gICAgMjM1LFxyXG4gICAgMTQ4LFxyXG4gICAgMTQ2LFxyXG4gICAgODksXHJcbiAgICAxNCxcclxuICAgIDE5NSxcclxuICAgIDI4LFxyXG4gICAgNzgsXHJcbiAgICAxMTIsXHJcbiAgICA3NixcclxuICAgIDI1MCxcclxuICAgIDQ3LFxyXG4gICAgMjQsXHJcbiAgICAyNTEsXHJcbiAgICAxNDAsXHJcbiAgICAxMDgsXHJcbiAgICAxODYsXHJcbiAgICAxOTAsXHJcbiAgICAyMjgsXHJcbiAgICAxNzAsXHJcbiAgICAxODMsXHJcbiAgICAxMzksXHJcbiAgICAzOSxcclxuICAgIDE4OCxcclxuICAgIDI0NCxcclxuICAgIDI0NixcclxuICAgIDEzMixcclxuICAgIDQ4LFxyXG4gICAgMTE5LFxyXG4gICAgMTQ0LFxyXG4gICAgMTgwLFxyXG4gICAgMTM4LFxyXG4gICAgMTM0LFxyXG4gICAgMTkzLFxyXG4gICAgODIsXHJcbiAgICAxODIsXHJcbiAgICAxMjAsXHJcbiAgICAxMjEsXHJcbiAgICA4NixcclxuICAgIDIyMCxcclxuICAgIDIwOSxcclxuICAgIDMsXHJcbiAgICA5MSxcclxuICAgIDI0MSxcclxuICAgIDE0OSxcclxuICAgIDg1LFxyXG4gICAgMjA1LFxyXG4gICAgMTUwLFxyXG4gICAgMTEzLFxyXG4gICAgMjE2LFxyXG4gICAgMzEsXHJcbiAgICAxMDAsXHJcbiAgICA0MSxcclxuICAgIDE2NCxcclxuICAgIDE3NyxcclxuICAgIDIxNCxcclxuICAgIDE1MyxcclxuICAgIDIzMSxcclxuICAgIDM4LFxyXG4gICAgNzEsXHJcbiAgICAxODUsXHJcbiAgICAxNzQsXHJcbiAgICA5NyxcclxuICAgIDIwMSxcclxuICAgIDI5LFxyXG4gICAgOTUsXHJcbiAgICA3LFxyXG4gICAgOTIsXHJcbiAgICA1NCxcclxuICAgIDI1NCxcclxuICAgIDE5MSxcclxuICAgIDExOCxcclxuICAgIDM0LFxyXG4gICAgMjIxLFxyXG4gICAgMTMxLFxyXG4gICAgMTEsXHJcbiAgICAxNjMsXHJcbiAgICA5OSxcclxuICAgIDIzNCxcclxuICAgIDgxLFxyXG4gICAgMjI3LFxyXG4gICAgMTQ3LFxyXG4gICAgMTU2LFxyXG4gICAgMTc2LFxyXG4gICAgMTcsXHJcbiAgICAxNDIsXHJcbiAgICA2OSxcclxuICAgIDEyLFxyXG4gICAgMTEwLFxyXG4gICAgNjIsXHJcbiAgICAyNyxcclxuICAgIDI1NSxcclxuICAgIDAsXHJcbiAgICAxOTQsXHJcbiAgICA1OSxcclxuICAgIDExNixcclxuICAgIDI0MixcclxuICAgIDI1MixcclxuICAgIDE5LFxyXG4gICAgMjEsXHJcbiAgICAxODcsXHJcbiAgICA1MyxcclxuICAgIDIwNyxcclxuICAgIDEyOSxcclxuICAgIDY0LFxyXG4gICAgMTM1LFxyXG4gICAgNjEsXHJcbiAgICA0MCxcclxuICAgIDE2NyxcclxuICAgIDIzNyxcclxuICAgIDEwMixcclxuICAgIDIyMyxcclxuICAgIDEwNixcclxuICAgIDE1OSxcclxuICAgIDE5NyxcclxuICAgIDE4OSxcclxuICAgIDIxNSxcclxuICAgIDEzNyxcclxuICAgIDM2LFxyXG4gICAgMzIsXHJcbiAgICAyMixcclxuICAgIDUsXHJcblxyXG4gICAgLy8gYW5kIGEgc2Vjb25kIGNvcHkgc28gd2UgZG9uJ3QgbmVlZCBhbiBleHRyYSBtYXNrIG9yIHN0YXRpYyBpbml0aWFsaXplclxyXG4gICAgMjMsXHJcbiAgICAxMjUsXHJcbiAgICAxNjEsXHJcbiAgICA1MixcclxuICAgIDEwMyxcclxuICAgIDExNyxcclxuICAgIDcwLFxyXG4gICAgMzcsXHJcbiAgICAyNDcsXHJcbiAgICAxMDEsXHJcbiAgICAyMDMsXHJcbiAgICAxNjksXHJcbiAgICAxMjQsXHJcbiAgICAxMjYsXHJcbiAgICA0NCxcclxuICAgIDEyMyxcclxuICAgIDE1MixcclxuICAgIDIzOCxcclxuICAgIDE0NSxcclxuICAgIDQ1LFxyXG4gICAgMTcxLFxyXG4gICAgMTE0LFxyXG4gICAgMjUzLFxyXG4gICAgMTAsXHJcbiAgICAxOTIsXHJcbiAgICAxMzYsXHJcbiAgICA0LFxyXG4gICAgMTU3LFxyXG4gICAgMjQ5LFxyXG4gICAgMzAsXHJcbiAgICAzNSxcclxuICAgIDcyLFxyXG4gICAgMTc1LFxyXG4gICAgNjMsXHJcbiAgICA3NyxcclxuICAgIDkwLFxyXG4gICAgMTgxLFxyXG4gICAgMTYsXHJcbiAgICA5NixcclxuICAgIDExMSxcclxuICAgIDEzMyxcclxuICAgIDEwNCxcclxuICAgIDc1LFxyXG4gICAgMTYyLFxyXG4gICAgOTMsXHJcbiAgICA1NixcclxuICAgIDY2LFxyXG4gICAgMjQwLFxyXG4gICAgOCxcclxuICAgIDUwLFxyXG4gICAgODQsXHJcbiAgICAyMjksXHJcbiAgICA0OSxcclxuICAgIDIxMCxcclxuICAgIDE3MyxcclxuICAgIDIzOSxcclxuICAgIDE0MSxcclxuICAgIDEsXHJcbiAgICA4NyxcclxuICAgIDE4LFxyXG4gICAgMixcclxuICAgIDE5OCxcclxuICAgIDE0MyxcclxuICAgIDU3LFxyXG4gICAgMjI1LFxyXG4gICAgMTYwLFxyXG4gICAgNTgsXHJcbiAgICAyMTcsXHJcbiAgICAxNjgsXHJcbiAgICAyMDYsXHJcbiAgICAyNDUsXHJcbiAgICAyMDQsXHJcbiAgICAxOTksXHJcbiAgICA2LFxyXG4gICAgNzMsXHJcbiAgICA2MCxcclxuICAgIDIwLFxyXG4gICAgMjMwLFxyXG4gICAgMjExLFxyXG4gICAgMjMzLFxyXG4gICAgOTQsXHJcbiAgICAyMDAsXHJcbiAgICA4OCxcclxuICAgIDksXHJcbiAgICA3NCxcclxuICAgIDE1NSxcclxuICAgIDMzLFxyXG4gICAgMTUsXHJcbiAgICAyMTksXHJcbiAgICAxMzAsXHJcbiAgICAyMjYsXHJcbiAgICAyMDIsXHJcbiAgICA4MyxcclxuICAgIDIzNixcclxuICAgIDQyLFxyXG4gICAgMTcyLFxyXG4gICAgMTY1LFxyXG4gICAgMjE4LFxyXG4gICAgNTUsXHJcbiAgICAyMjIsXHJcbiAgICA0NixcclxuICAgIDEwNyxcclxuICAgIDk4LFxyXG4gICAgMTU0LFxyXG4gICAgMTA5LFxyXG4gICAgNjcsXHJcbiAgICAxOTYsXHJcbiAgICAxNzgsXHJcbiAgICAxMjcsXHJcbiAgICAxNTgsXHJcbiAgICAxMyxcclxuICAgIDI0MyxcclxuICAgIDY1LFxyXG4gICAgNzksXHJcbiAgICAxNjYsXHJcbiAgICAyNDgsXHJcbiAgICAyNSxcclxuICAgIDIyNCxcclxuICAgIDExNSxcclxuICAgIDgwLFxyXG4gICAgNjgsXHJcbiAgICA1MSxcclxuICAgIDE4NCxcclxuICAgIDEyOCxcclxuICAgIDIzMixcclxuICAgIDIwOCxcclxuICAgIDE1MSxcclxuICAgIDEyMixcclxuICAgIDI2LFxyXG4gICAgMjEyLFxyXG4gICAgMTA1LFxyXG4gICAgNDMsXHJcbiAgICAxNzksXHJcbiAgICAyMTMsXHJcbiAgICAyMzUsXHJcbiAgICAxNDgsXHJcbiAgICAxNDYsXHJcbiAgICA4OSxcclxuICAgIDE0LFxyXG4gICAgMTk1LFxyXG4gICAgMjgsXHJcbiAgICA3OCxcclxuICAgIDExMixcclxuICAgIDc2LFxyXG4gICAgMjUwLFxyXG4gICAgNDcsXHJcbiAgICAyNCxcclxuICAgIDI1MSxcclxuICAgIDE0MCxcclxuICAgIDEwOCxcclxuICAgIDE4NixcclxuICAgIDE5MCxcclxuICAgIDIyOCxcclxuICAgIDE3MCxcclxuICAgIDE4MyxcclxuICAgIDEzOSxcclxuICAgIDM5LFxyXG4gICAgMTg4LFxyXG4gICAgMjQ0LFxyXG4gICAgMjQ2LFxyXG4gICAgMTMyLFxyXG4gICAgNDgsXHJcbiAgICAxMTksXHJcbiAgICAxNDQsXHJcbiAgICAxODAsXHJcbiAgICAxMzgsXHJcbiAgICAxMzQsXHJcbiAgICAxOTMsXHJcbiAgICA4MixcclxuICAgIDE4MixcclxuICAgIDEyMCxcclxuICAgIDEyMSxcclxuICAgIDg2LFxyXG4gICAgMjIwLFxyXG4gICAgMjA5LFxyXG4gICAgMyxcclxuICAgIDkxLFxyXG4gICAgMjQxLFxyXG4gICAgMTQ5LFxyXG4gICAgODUsXHJcbiAgICAyMDUsXHJcbiAgICAxNTAsXHJcbiAgICAxMTMsXHJcbiAgICAyMTYsXHJcbiAgICAzMSxcclxuICAgIDEwMCxcclxuICAgIDQxLFxyXG4gICAgMTY0LFxyXG4gICAgMTc3LFxyXG4gICAgMjE0LFxyXG4gICAgMTUzLFxyXG4gICAgMjMxLFxyXG4gICAgMzgsXHJcbiAgICA3MSxcclxuICAgIDE4NSxcclxuICAgIDE3NCxcclxuICAgIDk3LFxyXG4gICAgMjAxLFxyXG4gICAgMjksXHJcbiAgICA5NSxcclxuICAgIDcsXHJcbiAgICA5MixcclxuICAgIDU0LFxyXG4gICAgMjU0LFxyXG4gICAgMTkxLFxyXG4gICAgMTE4LFxyXG4gICAgMzQsXHJcbiAgICAyMjEsXHJcbiAgICAxMzEsXHJcbiAgICAxMSxcclxuICAgIDE2MyxcclxuICAgIDk5LFxyXG4gICAgMjM0LFxyXG4gICAgODEsXHJcbiAgICAyMjcsXHJcbiAgICAxNDcsXHJcbiAgICAxNTYsXHJcbiAgICAxNzYsXHJcbiAgICAxNyxcclxuICAgIDE0MixcclxuICAgIDY5LFxyXG4gICAgMTIsXHJcbiAgICAxMTAsXHJcbiAgICA2MixcclxuICAgIDI3LFxyXG4gICAgMjU1LFxyXG4gICAgMCxcclxuICAgIDE5NCxcclxuICAgIDU5LFxyXG4gICAgMTE2LFxyXG4gICAgMjQyLFxyXG4gICAgMjUyLFxyXG4gICAgMTksXHJcbiAgICAyMSxcclxuICAgIDE4NyxcclxuICAgIDUzLFxyXG4gICAgMjA3LFxyXG4gICAgMTI5LFxyXG4gICAgNjQsXHJcbiAgICAxMzUsXHJcbiAgICA2MSxcclxuICAgIDQwLFxyXG4gICAgMTY3LFxyXG4gICAgMjM3LFxyXG4gICAgMTAyLFxyXG4gICAgMjIzLFxyXG4gICAgMTA2LFxyXG4gICAgMTU5LFxyXG4gICAgMTk3LFxyXG4gICAgMTg5LFxyXG4gICAgMjE1LFxyXG4gICAgMTM3LFxyXG4gICAgMzYsXHJcbiAgICAzMixcclxuICAgIDIyLFxyXG4gICAgNVxyXG4pO1xyXG5cclxuLy8gY2FsY3VsYXRlcyBkb3QgcHJvZHVjdCBvZiB4LCB5IGFuZCBncmFkaWVudFxyXG5mbG9hdCBncmFkMShjb25zdCBpbnQgaGFzaCwgY29uc3QgZmxvYXQgeCkge1xyXG4gICAgcmV0dXJuIChoYXNoICYgMSkgPT0gMHgwID8gLXggOiB4O1xyXG59XHJcblxyXG4vLyBjYWxjdWxhdGVzIGRvdCBwcm9kdWN0IG9mIHgsIHkgYW5kIGdyYWRpZW50XHJcbmZsb2F0IGdyYWQyKGNvbnN0IGludCBoYXNoLCBjb25zdCBmbG9hdCB4LCBjb25zdCBmbG9hdCB5KSB7XHJcbiAgICBpbnQgaCA9IGhhc2ggJiAweDAzO1xyXG4gICAgc3dpdGNoIChoKSB7XHJcbiAgICBjYXNlIDB4MDA6XHJcbiAgICAgICAgLy8gKC0xLCAwKVxyXG4gICAgICAgIHJldHVybiAteDtcclxuICAgICAgICBicmVhaztcclxuICAgIGNhc2UgMHgwMTpcclxuICAgICAgICAvLyAoMSwgMClcclxuICAgICAgICByZXR1cm4geDtcclxuICAgICAgICBicmVhaztcclxuICAgIGNhc2UgMHgwMjpcclxuICAgICAgICAvLyAoMCwgLTEpXHJcbiAgICAgICAgcmV0dXJuIC15O1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAweDAzOlxyXG4gICAgICAgIC8vICgwLCAxKVxyXG4gICAgICAgIHJldHVybiB5O1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4gMC5mO1xyXG4gICAgfVxyXG59XHJcbiAgICBcclxuZmxvYXQgc21vb3RoZXJzdGVwKGNvbnN0IGZsb2F0IHgpIHtcclxuICAgIHJldHVybiB4ICogeCAqIHggKiAoeCAqICh4ICogNi5mIC0gMTUuZikgKyAxMC5mKTtcclxufVxyXG5cclxuZmxvYXQgcGVybGluMShjb25zdCBmbG9hdCB4eCkge1xyXG4gICAgaW50IHhmID0gaW50KGZsb29yKHh4KSk7XHJcbiAgICBmbG9hdCB4ID0geHggLSBmbG9hdCh4Zik7XHJcbiAgICBmbG9hdCB1ID0gc21vb3RoZXJzdGVwKHgpO1xyXG4gICAgaW50IHgwID0geGYgJiAyNTU7XHJcbiAgICBpbnQgeDEgPSAoeGYgKyAxKSAmIDI1NTtcclxuICAgIGZsb2F0IG4wID0gZ3JhZDEocGVybVt4MF0sIHgpO1xyXG4gICAgZmxvYXQgbjEgPSBncmFkMShwZXJtW3gxXSwgeCAtIDEuZik7XHJcbiAgICBmbG9hdCBuID0gbWl4KG4wLCBuMSwgdSk7XHJcbiAgICByZXR1cm4gbjtcclxufVxyXG5cclxuZmxvYXQgcGVybGluMihjb25zdCBmbG9hdCB4eCwgY29uc3QgZmxvYXQgeXkpIHtcclxuICAgIGludCB4ZiA9IGludChmbG9vcih4eCkpO1xyXG4gICAgaW50IHlmID0gaW50KGZsb29yKHl5KSk7XHJcbiAgICBmbG9hdCB4ID0geHggLSBmbG9hdCh4Zik7XHJcbiAgICBmbG9hdCB5ID0geXkgLSBmbG9hdCh5Zik7XHJcbiAgICBmbG9hdCB1ID0gc21vb3RoZXJzdGVwKHgpO1xyXG4gICAgZmxvYXQgdiA9IHNtb290aGVyc3RlcCh5KTtcclxuICAgIGludCB4MCA9IHhmICYgMjU1O1xyXG4gICAgaW50IHkwID0geWYgJiAyNTU7XHJcbiAgICBpbnQgeDEgPSAoeGYgKyAxKSAmIDI1NTtcclxuICAgIGludCB5MSA9ICh5ZiArIDEpICYgMjU1O1xyXG4gICAgaW50IHIwID0gcGVybVt4MF07XHJcbiAgICBpbnQgcjEgPSBwZXJtW3gxXTtcclxuICAgIGludCByMDAgPSBwZXJtW3IwICsgeTBdO1xyXG4gICAgaW50IHIwMSA9IHBlcm1bcjAgKyB5MV07XHJcbiAgICBpbnQgcjEwID0gcGVybVtyMSArIHkwXTtcclxuICAgIGludCByMTEgPSBwZXJtW3IxICsgeTFdO1xyXG4gICAgZmxvYXQgbjAwID0gZ3JhZDIocjAwLCB4LCB5KTtcclxuICAgIGZsb2F0IG4wMSA9IGdyYWQyKHIwMSwgeCwgeSAtIDEuZik7XHJcbiAgICBmbG9hdCBuMTAgPSBncmFkMihyMTAsIHggLSAxLmYsIHkpO1xyXG4gICAgZmxvYXQgbjExID0gZ3JhZDIocjExLCB4IC0gMS5mLCB5IC0gMS5mKTtcclxuICAgIGZsb2F0IG4wID0gbWl4KG4wMCwgbjAxLCB2KTtcclxuICAgIGZsb2F0IG4xID0gbWl4KG4xMCwgbjExLCB2KTtcclxuICAgIGZsb2F0IG4gPSBtaXgobjAsIG4xLCB1KTtcclxuICAgIHJldHVybiBuO1xyXG59XHJcblxyXG5mbG9hdCBmYm0yKGNvbnN0IGZsb2F0IHgsIGNvbnN0IGZsb2F0IHksIGNvbnN0IGZsb2F0IGxhY3VuYXJpdHksIGNvbnN0IGZsb2F0IGdhaW4sIGNvbnN0IGludCBvY3RhdmVzKSB7XHJcbiAgICBmbG9hdCBmcmVxID0gMS5mO1xyXG4gICAgZmxvYXQgYW1wID0gMS5mO1xyXG4gICAgZmxvYXQgc3VtID0gMC5mO1xyXG4gICAgZm9yIChpbnQgaSA9IDA7IGkgPCBvY3RhdmVzOyArK2kpIHtcclxuICAgICAgICBzdW0gKz0gYW1wICogcGVybGluMih4ICogZnJlcSwgeSAqIGZyZXEpO1xyXG4gICAgICAgIGZyZXEgKj0gbGFjdW5hcml0eTtcclxuICAgICAgICBhbXAgKj0gZ2FpbjtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc3VtO1xyXG59XHJcbmBcclxuXHJcbmV4cG9ydCB7IHBlcmxpbjIgfSJdfQ==