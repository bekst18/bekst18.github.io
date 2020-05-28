import * as math from "./math.js"

// permutation table
const perm = [
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
    5]

// calculates dot product of x, y and gradient
function grad1(hash: number, x: number): number {
    return (hash & 1) == 0x0 ? -x : x
}

// calculates dot product of x, y and gradient
function grad2(hash: number, x: number, y: number): number {
    const h = hash & 0x03;
    switch (h) {
        case 0x00:
            // (-1, 0)
            return -x
        case 0x01:
            // (1, 0)
            return x
        case 0x02:
            // (0, -1)
            return -y
        case 0x03:
            // (0, 1)
            return y
    }

    throw new Error("Invalid code path")
}

function grad3(hash: number, x: number, y: number, z: number): number {
    switch (hash & 0xF) {
        case 0x0:
            // (1, 1, 0)
            return x + y
        case 0x1:
            // (-1, 1, 0)
            return -x + y
        case 0x2:
            // (1, -1, 0)
            return x - y
        case 0x3:
            // (-1, -1, 0)
            return -x - y
        case 0x4:
            // (1, 0, 1)
            return x + z
        case 0x5:
            // (-1, 0, 1)
            return -x + z
        case 0x6:
            // (1, 0, -1)
            return x - z
        case 0x7:
            // (-1, 0, -1)
            return -x - z
        case 0x8:
            // (0, 1, 1)
            return y + z
        case 0x9:
            // (0, -1, 1)
            return -y + z
        case 0xA:
            // (0, 1, -1)
            return y - z
        case 0xB:
            // (0, -1, -1)
            return -y - z
        case 0xC:
            // (1, 1, 0)
            return y + x
        case 0xD:
            // (0, -1, 1)
            return -y + z
        case 0xE:
            // (0, 1, -1)
            return y - x;
        case 0xF:
            // (0, -1, -1)
            return -y - z
        default:
            throw new Error("Invalid code path")
    }
}

function smootherstep(x: number) {
    return x * x * x * (x * (x * 6 - 15) + 10)
}

function rnd1(x: number) {
    const v = perm[x] / 255
    return v;
}

function rnd2(x: number, y: number) {
    const v = perm[perm[x] + y] / 255
    return v
}

function rnd3(x: number, y: number, z: number) {
    const v = perm[perm[perm[x] + y] + z] / 255
    return v;
}

/**
 * 1d value noise
 * @param x x coordinate
 */
export function value1(x: number): number {
    const xf = Math.floor(x)
    x = x - xf
    const u = smootherstep(x)
    const x0 = xf & 255
    const x1 = (xf + 1) & 255
    const n0 = rnd1(x0)
    const n1 = rnd1(x1)
    const n = math.lerp(n0, n1, u)
    return n
}

/**
 * 2d value noise
 * @param x x coordinate 
 * @param y y coordinate
 */
export function value2(x: number, y: number): number {
    const xf = Math.floor(x)
    const yf = Math.floor(y)
    x = x - xf
    y = y - yf
    const u = smootherstep(x)
    const v = smootherstep(y)
    const x0 = xf & 255
    const y0 = yf & 255
    const x1 = (xf + 1) & 255
    const y1 = (yf + 1) & 255
    const n00 = rnd2(x0, y0)
    const n10 = rnd2(x1, y0)
    const n01 = rnd2(x0, y1)
    const n11 = rnd2(x1, y1)
    const n0 = math.lerp(n00, n01, v)
    const n1 = math.lerp(n10, n11, v)
    const n = math.lerp(n0, n1, u)
    return n
}

/**
 * 3d value noise
 * @param x x coordinate
 * @param y y coordinate
 * @param z z coordinate
 */
export function value3(x: number, y: number, z: number): number {
    const xf = Math.floor(x)
    const yf = Math.floor(y)
    const zf = Math.floor(z)
    const tx = smootherstep(x - xf)
    const ty = smootherstep(y - yf)
    const tz = smootherstep(z - zf)
    const x0 = xf & 255
    const y0 = yf & 255
    const z0 = zf & 255
    const x1 = (xf + 1) & 255
    const y1 = (yf + 1) & 255
    const z1 = (zf + 1) & 255
    const v000 = rnd3(x0, y0, z0)
    const v001 = rnd3(x1, y0, z0)
    const v010 = rnd3(x0, y1, z0)
    const v011 = rnd3(x1, y1, z0)
    const v100 = rnd3(x0, y0, z1)
    const v101 = rnd3(x1, y0, z1)
    const v110 = rnd3(x0, y1, z1)
    const v111 = rnd3(x1, y1, z1)
    const v00 = math.lerp(v000, v001, tx)
    const v01 = math.lerp(v010, v011, tx)
    const v10 = math.lerp(v100, v101, tx)
    const v11 = math.lerp(v110, v111, tx)
    const v0 = math.lerp(v00, v01, ty)
    const v1 = math.lerp(v10, v11, ty)
    const v = math.lerp(v0, v1, tz)
    return v
}

/**
 * 1d perlin noise
 * @param x x coordinate
 */
export function perlin1(x: number): number {
    const xf = Math.floor(x)
    x = x - xf
    const u = smootherstep(x)
    const x0 = xf & 255
    const x1 = (xf + 1) & 255
    const n0 = grad1(perm[x0], x)
    const n1 = grad1(perm[x1], x - 1)
    const n = math.lerp(n0, n1, u)
    return n
}

/**
 * 2d perlin noise
 * @param x x coordinate
 * @param y y coordinate
 */
export function perlin2(x: number, y: number): number {
    const xf = Math.floor(x)
    const yf = Math.floor(y)
    x = x - xf
    y = y - yf
    const u = smootherstep(x)
    const v = smootherstep(y)
    const x0 = xf & 255
    const y0 = yf & 255
    const x1 = (xf + 1) & 255
    const y1 = (yf + 1) & 255
    const r0 = perm[x0]
    const r1 = perm[x1]
    const r00 = perm[r0 + y0]
    const r01 = perm[r0 + y1]
    const r10 = perm[r1 + y0]
    const r11 = perm[r1 + y1]
    const n00 = grad2(r00, x, y)
    const n01 = grad2(r01, x, y - 1)
    const n10 = grad2(r10, x - 1, y)
    const n11 = grad2(r11, x - 1, y - 1)
    const n0 = math.lerp(n00, n01, v)
    const n1 = math.lerp(n10, n11, v)
    const n = math.lerp(n0, n1, u)
    return n
}

/**
 * 3d perlin noise
 * @param x x coordinate
 * @param y y coordinate
 * @param z z coordinate
 */
export function perlin3(x: number, y: number, z: number): number {
    const xf = Math.floor(x)
    const yf = Math.floor(y)
    const zf = Math.floor(z)
    x = x - xf
    y = y - yf
    z = z - zf

    const u = smootherstep(x)
    const v = smootherstep(y)
    const w = smootherstep(z)
    const x0 = xf & 255
    const y0 = yf & 255
    const z0 = zf & 255
    const x1 = (xf + 1) & 255
    const y1 = (yf + 1) & 255
    const z1 = (zf + 1) & 255
    const r0 = perm[x0]
    const r1 = perm[x1]
    const r00 = perm[r0 + y0]
    const r01 = perm[r0 + y1]
    const r10 = perm[r1 + y0]
    const r11 = perm[r1 + y1]
    const r000 = perm[r00 + z0]
    const r001 = perm[r00 + z1]
    const r010 = perm[r01 + z0]
    const r011 = perm[r01 + z1]
    const r100 = perm[r10 + z0]
    const r101 = perm[r10 + z1]
    const r110 = perm[r11 + z0]
    const r111 = perm[r11 + z1]
    const n000 = grad3(r000, x, y, z)
    const n001 = grad3(r001, x, y, z - 1)
    const n010 = grad3(r010, x, y - 1, z)
    const n011 = grad3(r011, x, y - 1, z - 1)
    const n100 = grad3(r100, x - 1, y, z)
    const n101 = grad3(r101, x - 1, y, z - 1)
    const n110 = grad3(r110, x - 1, y - 1, z)
    const n111 = grad3(r111, x - 1, y - 1, z - 1)
    const n00 = math.lerp(n000, n001, w)
    const n01 = math.lerp(n010, n011, w)
    const n10 = math.lerp(n100, n101, w)
    const n11 = math.lerp(n110, n111, w)
    const n0 = math.lerp(n00, n01, v)
    const n1 = math.lerp(n10, n11, v)
    const n = math.lerp(n0, n1, u)
    return n
}

export function fbmValue1(x: number, lacunarity: number, gain: number, octaves: number): number {
    let freq = 1
    let amp = 1
    let sum = 0
    for (let i = 0; i < octaves; ++i) {
        sum += amp * value1(x * freq)
        freq *= lacunarity
        amp *= gain
    }

    return sum;
}

export function fbmValue2(x: number, y: number, lacunarity: number, gain: number, octaves: number): number {
    let freq = 1
    let amp = 1
    let sum = 0

    for (let i = 0; i < octaves; ++i) {
        sum += amp * value2(x * freq, y * freq)
        freq *= lacunarity
        amp *= gain
    }

    return sum
}

export function fbmValue3(x: number, y: number, z: number, lacunarity: number, gain: number, octaves: number): number {
    let freq = 1
    let amp = 1
    let sum = 0

    for (let i = 0; i < octaves; ++i) {
        const n = value3(x * freq, y * freq, z * freq)
        sum += amp * n
        freq *= lacunarity
        amp *= gain
    }

    return sum;
}

export function fbmPerlin1(x: number, lacunarity: number, gain: number, octaves: number): number {
    let freq = 1
    let amp = 1
    let sum = 0

    for (let i = 0; i < octaves; ++i) {
        sum += amp * perlin1(x * freq)
        freq *= lacunarity
        amp *= gain
    }

    return sum;
}

export function fbmPerlin2(x: number, y: number, lacunarity: number, gain: number, octaves: number): number {
    let freq = 1
    let amp = 1
    let sum = 0

    for (let i = 0; i < octaves; ++i) {
        sum += amp * perlin2(x * freq, y * freq)
        freq *= lacunarity
        amp *= gain
    }

    return sum;
}

export function fbmPerlin3(x: number, y: number, z: number, lacunarity: number, gain: number, octaves: number): number {
    let freq = 1
    let amp = 1
    let sum = 0

    for (let i = 0; i < octaves; ++i) {
        sum += amp * perlin3(x * freq, y * freq, z * freq)
        freq *= lacunarity
        amp *= gain
    }

    return sum;
}