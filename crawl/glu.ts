/* webgl utility library */
import * as dom from "../shared/dom.js"

/**
 * create webgl2 rendering context
 */
export function createContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
    const gl = canvas.getContext("webgl2")
    if (!gl) {
        throw new Error("Failed to not initialize webgl 2.0. Confirm that your browser is up to date and has support.")
    }

    return gl
}

/**
 * 
 * @param gl gl context
 * @param type type of shader to create
 * @param source shader source
 */
export function createShader(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
    const shader = gl.createShader(type)
    if (!shader) {
        throw new Error("Failed to create shader")
    }

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return shader
    }

    const message = "Failed to compile shader: " + (gl.getShaderInfoLog(shader) ?? "")
    gl.deleteShader(shader)
    throw new Error(message)
}

/**
 * create a gl program from shaders
 * @param gl gl context
 * @param vertexShader vertex shader to link
 * @param fragmentShader fragment shader to link
 */
export function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = gl.createProgram();
    if (!program) {
        throw new Error("Failed to create shader program")
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return program
    }

    const message = gl.getProgramInfoLog(program)
    gl.deleteProgram(program);

    throw new Error(`Failed to link program: ${message ?? ""}`)
}

/**
 * compile and link the vertex and fragment shader source
 * @param gl gl context
 * @param vertexSrc vertex shader source
 * @param fragmentSrc fragment shader source
 */
export function compileProgram(gl: WebGL2RenderingContext, vertexSrc: string, fragmentSrc: string): WebGLProgram {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSrc)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc)
    const program = createProgram(gl, vertexShader, fragmentShader)
    return program
}

/**
 * create a buffer, throw an exception on failure
 * @param gl gl context
 */
export function createBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
    const buffer = gl.createBuffer()
    if (!buffer) {
        throw new Error("Failed to create buffer")
    }

    return buffer
}

/**
 * Retreive location for uniform, throws exception if not found
 * @param gl gl context
 * @param program gl program
 * @param name name of uniform
 */
export function getUniformLocation(gl: WebGL2RenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation {
    const location = gl.getUniformLocation(program, name)
    if (!location) {
        throw new Error(`Failed to retrieve location of ${name} uniform.`)
    }

    return location
}

/**
 * Retreive location for attribute, throws exception if not found
 * @param gl gl context
 * @param program gl program
 * @param name name of attribute
 */
export function getAttribLocation(gl: WebGL2RenderingContext, program: WebGLProgram, name: string): number {
    const attribLocation = gl.getAttribLocation(program, name)
    if (attribLocation < 0) {
        throw new Error(`${name} attribute was not found`)
    }

    return attribLocation
}

/**
 * create a vertex array object, throw exception on failure
 * @param gl gl context
 */
export function createVertexArray(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
    const vao = gl.createVertexArray()
    if (!vao) {
        throw new Error("failed to create vertex array object")
    }

    return vao
}

/**
 * create a texture object, throw an exception on failure
 * @param gl gl context
 */
export function createTexture(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
    const texture = gl.createTexture()
    if (!texture) {
        throw new Error("failed to create texture object")
    }

    return texture
}

/**
 * create a sampler object, throw an exception on failure
 * @param gl gl context
 */
export function createSampler(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
    const sampler = gl.createSampler()
    if (!sampler) {
        throw new Error("failed to create sampler object")
    }

    return sampler
}

/**
 * load a texture from the specified file
 * @param gl gl context
 * @param url url from which to load texture
 */
export async function loadTexture(gl: WebGL2RenderingContext, url: string): Promise<WebGLTexture> {
    const texture = createTexture(gl)
    const image = await dom.loadImage(url)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.generateMipmap(gl.TEXTURE_2D)
    return texture
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
`

export { perlin2 }