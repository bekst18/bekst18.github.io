/* webgl utility library */
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
export function compileProgram(gl, vertexSrc, fragmentSrc) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSrc);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
    const program = createProgram(gl, vertexShader, fragmentShader);
    return program;
}
export function getUniformLocation(gl, program, name) {
    const location = gl.getUniformLocation(program, name);
    if (!location) {
        throw new Error(`Failed to retrieve location of ${name} uniform.`);
    }
    return location;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2x1LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2x1LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJCQUEyQjtBQUMzQixNQUFNLFVBQVUsWUFBWSxDQUFDLEVBQTBCLEVBQUUsSUFBWSxFQUFFLE1BQWM7O0lBQ2pGLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDcEMsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNULE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtLQUM3QztJQUVELEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQy9CLEVBQUUsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7SUFFeEIsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRTtRQUNsRCxPQUFPLE1BQU0sQ0FBQTtLQUNoQjtJQUVELE1BQU0sT0FBTyxHQUFHLDRCQUE0QixHQUFHLE9BQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxtQ0FBSSxFQUFFLENBQUMsQ0FBQTtJQUNsRixFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDNUIsQ0FBQztBQUVELE1BQU0sVUFBVSxhQUFhLENBQUMsRUFBMEIsRUFBRSxZQUF5QixFQUFFLGNBQTJCO0lBQzVHLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUNuQyxJQUFJLENBQUMsT0FBTyxFQUFFO1FBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFBO0tBQ3JEO0lBRUQsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDdkMsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDekMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUV4QixJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFO1FBQ2pELE9BQU8sT0FBTyxDQUFBO0tBQ2pCO0lBRUQsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzdDLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFMUIsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsT0FBTyxhQUFQLE9BQU8sY0FBUCxPQUFPLEdBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtBQUMvRCxDQUFDO0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FBQyxFQUEwQixFQUFFLFNBQWlCLEVBQUUsV0FBbUI7SUFDN0YsTUFBTSxZQUFZLEdBQUcsWUFBWSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ2xFLE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUN4RSxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsRUFBRSxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUMvRCxPQUFPLE9BQU8sQ0FBQTtBQUNsQixDQUFDO0FBRUQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLEVBQTBCLEVBQUUsT0FBcUIsRUFBRSxJQUFZO0lBQzlGLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDckQsSUFBSSxDQUFDLFFBQVEsRUFBRTtRQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLElBQUksV0FBVyxDQUFDLENBQUE7S0FDckU7SUFFRCxPQUFPLFFBQVEsQ0FBQTtBQUNuQixDQUFDO0FBRUQsc0JBQXNCO0FBQ3RCLE1BQU0sT0FBTyxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBNGxCZixDQUFBO0FBRUQsT0FBTyxFQUFDLE9BQU8sRUFBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyogd2ViZ2wgdXRpbGl0eSBsaWJyYXJ5ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTaGFkZXIoZ2w6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQsIHR5cGU6IEdMZW51bSwgc291cmNlOiBzdHJpbmcpOiBXZWJHTFNoYWRlciB7XHJcbiAgICBjb25zdCBzaGFkZXIgPSBnbC5jcmVhdGVTaGFkZXIodHlwZSlcclxuICAgIGlmICghc2hhZGVyKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGNyZWF0ZSBzaGFkZXJcIilcclxuICAgIH1cclxuXHJcbiAgICBnbC5zaGFkZXJTb3VyY2Uoc2hhZGVyLCBzb3VyY2UpXHJcbiAgICBnbC5jb21waWxlU2hhZGVyKHNoYWRlcilcclxuXHJcbiAgICBpZiAoZ2wuZ2V0U2hhZGVyUGFyYW1ldGVyKHNoYWRlciwgZ2wuQ09NUElMRV9TVEFUVVMpKSB7XHJcbiAgICAgICAgcmV0dXJuIHNoYWRlclxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG1lc3NhZ2UgPSBcIkZhaWxlZCB0byBjb21waWxlIHNoYWRlcjogXCIgKyAoZ2wuZ2V0U2hhZGVySW5mb0xvZyhzaGFkZXIpID8/IFwiXCIpXHJcbiAgICBnbC5kZWxldGVTaGFkZXIoc2hhZGVyKVxyXG4gICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQcm9ncmFtKGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LCB2ZXJ0ZXhTaGFkZXI6IFdlYkdMU2hhZGVyLCBmcmFnbWVudFNoYWRlcjogV2ViR0xTaGFkZXIpOiBXZWJHTFByb2dyYW0ge1xyXG4gICAgY29uc3QgcHJvZ3JhbSA9IGdsLmNyZWF0ZVByb2dyYW0oKTtcclxuICAgIGlmICghcHJvZ3JhbSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBjcmVhdGUgc2hhZGVyIHByb2dyYW1cIilcclxuICAgIH1cclxuXHJcbiAgICBnbC5hdHRhY2hTaGFkZXIocHJvZ3JhbSwgdmVydGV4U2hhZGVyKTtcclxuICAgIGdsLmF0dGFjaFNoYWRlcihwcm9ncmFtLCBmcmFnbWVudFNoYWRlcik7XHJcbiAgICBnbC5saW5rUHJvZ3JhbShwcm9ncmFtKTtcclxuXHJcbiAgICBpZiAoZ2wuZ2V0UHJvZ3JhbVBhcmFtZXRlcihwcm9ncmFtLCBnbC5MSU5LX1NUQVRVUykpIHtcclxuICAgICAgICByZXR1cm4gcHJvZ3JhbVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG1lc3NhZ2UgPSBnbC5nZXRQcm9ncmFtSW5mb0xvZyhwcm9ncmFtKVxyXG4gICAgZ2wuZGVsZXRlUHJvZ3JhbShwcm9ncmFtKTtcclxuXHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBsaW5rIHByb2dyYW06ICR7bWVzc2FnZSA/PyBcIlwifWApXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlUHJvZ3JhbShnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCwgdmVydGV4U3JjOiBzdHJpbmcsIGZyYWdtZW50U3JjOiBzdHJpbmcpOiBXZWJHTFByb2dyYW0ge1xyXG4gICAgY29uc3QgdmVydGV4U2hhZGVyID0gY3JlYXRlU2hhZGVyKGdsLCBnbC5WRVJURVhfU0hBREVSLCB2ZXJ0ZXhTcmMpXHJcbiAgICBjb25zdCBmcmFnbWVudFNoYWRlciA9IGNyZWF0ZVNoYWRlcihnbCwgZ2wuRlJBR01FTlRfU0hBREVSLCBmcmFnbWVudFNyYylcclxuICAgIGNvbnN0IHByb2dyYW0gPSBjcmVhdGVQcm9ncmFtKGdsLCB2ZXJ0ZXhTaGFkZXIsIGZyYWdtZW50U2hhZGVyKVxyXG4gICAgcmV0dXJuIHByb2dyYW1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaWZvcm1Mb2NhdGlvbihnbDogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCwgcHJvZ3JhbTogV2ViR0xQcm9ncmFtLCBuYW1lOiBzdHJpbmcpOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiB7XHJcbiAgICBjb25zdCBsb2NhdGlvbiA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9ncmFtLCBuYW1lKVxyXG4gICAgaWYgKCFsb2NhdGlvbikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHJldHJpZXZlIGxvY2F0aW9uIG9mICR7bmFtZX0gdW5pZm9ybS5gKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBsb2NhdGlvblxyXG59XHJcblxyXG4vKiBzaGFkZXIgZnJhZ21lbnRzICovXHJcbmNvbnN0IHBlcmxpbjIgPSBgXHJcbi8vIHBlcm11dGF0aW9uIHRhYmxlXHJcbmNvbnN0IGludCBwZXJtWzUxMl0gPSBpbnRbXShcclxuICAgIDIzLFxyXG4gICAgMTI1LFxyXG4gICAgMTYxLFxyXG4gICAgNTIsXHJcbiAgICAxMDMsXHJcbiAgICAxMTcsXHJcbiAgICA3MCxcclxuICAgIDM3LFxyXG4gICAgMjQ3LFxyXG4gICAgMTAxLFxyXG4gICAgMjAzLFxyXG4gICAgMTY5LFxyXG4gICAgMTI0LFxyXG4gICAgMTI2LFxyXG4gICAgNDQsXHJcbiAgICAxMjMsXHJcbiAgICAxNTIsXHJcbiAgICAyMzgsXHJcbiAgICAxNDUsXHJcbiAgICA0NSxcclxuICAgIDE3MSxcclxuICAgIDExNCxcclxuICAgIDI1MyxcclxuICAgIDEwLFxyXG4gICAgMTkyLFxyXG4gICAgMTM2LFxyXG4gICAgNCxcclxuICAgIDE1NyxcclxuICAgIDI0OSxcclxuICAgIDMwLFxyXG4gICAgMzUsXHJcbiAgICA3MixcclxuICAgIDE3NSxcclxuICAgIDYzLFxyXG4gICAgNzcsXHJcbiAgICA5MCxcclxuICAgIDE4MSxcclxuICAgIDE2LFxyXG4gICAgOTYsXHJcbiAgICAxMTEsXHJcbiAgICAxMzMsXHJcbiAgICAxMDQsXHJcbiAgICA3NSxcclxuICAgIDE2MixcclxuICAgIDkzLFxyXG4gICAgNTYsXHJcbiAgICA2NixcclxuICAgIDI0MCxcclxuICAgIDgsXHJcbiAgICA1MCxcclxuICAgIDg0LFxyXG4gICAgMjI5LFxyXG4gICAgNDksXHJcbiAgICAyMTAsXHJcbiAgICAxNzMsXHJcbiAgICAyMzksXHJcbiAgICAxNDEsXHJcbiAgICAxLFxyXG4gICAgODcsXHJcbiAgICAxOCxcclxuICAgIDIsXHJcbiAgICAxOTgsXHJcbiAgICAxNDMsXHJcbiAgICA1NyxcclxuICAgIDIyNSxcclxuICAgIDE2MCxcclxuICAgIDU4LFxyXG4gICAgMjE3LFxyXG4gICAgMTY4LFxyXG4gICAgMjA2LFxyXG4gICAgMjQ1LFxyXG4gICAgMjA0LFxyXG4gICAgMTk5LFxyXG4gICAgNixcclxuICAgIDczLFxyXG4gICAgNjAsXHJcbiAgICAyMCxcclxuICAgIDIzMCxcclxuICAgIDIxMSxcclxuICAgIDIzMyxcclxuICAgIDk0LFxyXG4gICAgMjAwLFxyXG4gICAgODgsXHJcbiAgICA5LFxyXG4gICAgNzQsXHJcbiAgICAxNTUsXHJcbiAgICAzMyxcclxuICAgIDE1LFxyXG4gICAgMjE5LFxyXG4gICAgMTMwLFxyXG4gICAgMjI2LFxyXG4gICAgMjAyLFxyXG4gICAgODMsXHJcbiAgICAyMzYsXHJcbiAgICA0MixcclxuICAgIDE3MixcclxuICAgIDE2NSxcclxuICAgIDIxOCxcclxuICAgIDU1LFxyXG4gICAgMjIyLFxyXG4gICAgNDYsXHJcbiAgICAxMDcsXHJcbiAgICA5OCxcclxuICAgIDE1NCxcclxuICAgIDEwOSxcclxuICAgIDY3LFxyXG4gICAgMTk2LFxyXG4gICAgMTc4LFxyXG4gICAgMTI3LFxyXG4gICAgMTU4LFxyXG4gICAgMTMsXHJcbiAgICAyNDMsXHJcbiAgICA2NSxcclxuICAgIDc5LFxyXG4gICAgMTY2LFxyXG4gICAgMjQ4LFxyXG4gICAgMjUsXHJcbiAgICAyMjQsXHJcbiAgICAxMTUsXHJcbiAgICA4MCxcclxuICAgIDY4LFxyXG4gICAgNTEsXHJcbiAgICAxODQsXHJcbiAgICAxMjgsXHJcbiAgICAyMzIsXHJcbiAgICAyMDgsXHJcbiAgICAxNTEsXHJcbiAgICAxMjIsXHJcbiAgICAyNixcclxuICAgIDIxMixcclxuICAgIDEwNSxcclxuICAgIDQzLFxyXG4gICAgMTc5LFxyXG4gICAgMjEzLFxyXG4gICAgMjM1LFxyXG4gICAgMTQ4LFxyXG4gICAgMTQ2LFxyXG4gICAgODksXHJcbiAgICAxNCxcclxuICAgIDE5NSxcclxuICAgIDI4LFxyXG4gICAgNzgsXHJcbiAgICAxMTIsXHJcbiAgICA3NixcclxuICAgIDI1MCxcclxuICAgIDQ3LFxyXG4gICAgMjQsXHJcbiAgICAyNTEsXHJcbiAgICAxNDAsXHJcbiAgICAxMDgsXHJcbiAgICAxODYsXHJcbiAgICAxOTAsXHJcbiAgICAyMjgsXHJcbiAgICAxNzAsXHJcbiAgICAxODMsXHJcbiAgICAxMzksXHJcbiAgICAzOSxcclxuICAgIDE4OCxcclxuICAgIDI0NCxcclxuICAgIDI0NixcclxuICAgIDEzMixcclxuICAgIDQ4LFxyXG4gICAgMTE5LFxyXG4gICAgMTQ0LFxyXG4gICAgMTgwLFxyXG4gICAgMTM4LFxyXG4gICAgMTM0LFxyXG4gICAgMTkzLFxyXG4gICAgODIsXHJcbiAgICAxODIsXHJcbiAgICAxMjAsXHJcbiAgICAxMjEsXHJcbiAgICA4NixcclxuICAgIDIyMCxcclxuICAgIDIwOSxcclxuICAgIDMsXHJcbiAgICA5MSxcclxuICAgIDI0MSxcclxuICAgIDE0OSxcclxuICAgIDg1LFxyXG4gICAgMjA1LFxyXG4gICAgMTUwLFxyXG4gICAgMTEzLFxyXG4gICAgMjE2LFxyXG4gICAgMzEsXHJcbiAgICAxMDAsXHJcbiAgICA0MSxcclxuICAgIDE2NCxcclxuICAgIDE3NyxcclxuICAgIDIxNCxcclxuICAgIDE1MyxcclxuICAgIDIzMSxcclxuICAgIDM4LFxyXG4gICAgNzEsXHJcbiAgICAxODUsXHJcbiAgICAxNzQsXHJcbiAgICA5NyxcclxuICAgIDIwMSxcclxuICAgIDI5LFxyXG4gICAgOTUsXHJcbiAgICA3LFxyXG4gICAgOTIsXHJcbiAgICA1NCxcclxuICAgIDI1NCxcclxuICAgIDE5MSxcclxuICAgIDExOCxcclxuICAgIDM0LFxyXG4gICAgMjIxLFxyXG4gICAgMTMxLFxyXG4gICAgMTEsXHJcbiAgICAxNjMsXHJcbiAgICA5OSxcclxuICAgIDIzNCxcclxuICAgIDgxLFxyXG4gICAgMjI3LFxyXG4gICAgMTQ3LFxyXG4gICAgMTU2LFxyXG4gICAgMTc2LFxyXG4gICAgMTcsXHJcbiAgICAxNDIsXHJcbiAgICA2OSxcclxuICAgIDEyLFxyXG4gICAgMTEwLFxyXG4gICAgNjIsXHJcbiAgICAyNyxcclxuICAgIDI1NSxcclxuICAgIDAsXHJcbiAgICAxOTQsXHJcbiAgICA1OSxcclxuICAgIDExNixcclxuICAgIDI0MixcclxuICAgIDI1MixcclxuICAgIDE5LFxyXG4gICAgMjEsXHJcbiAgICAxODcsXHJcbiAgICA1MyxcclxuICAgIDIwNyxcclxuICAgIDEyOSxcclxuICAgIDY0LFxyXG4gICAgMTM1LFxyXG4gICAgNjEsXHJcbiAgICA0MCxcclxuICAgIDE2NyxcclxuICAgIDIzNyxcclxuICAgIDEwMixcclxuICAgIDIyMyxcclxuICAgIDEwNixcclxuICAgIDE1OSxcclxuICAgIDE5NyxcclxuICAgIDE4OSxcclxuICAgIDIxNSxcclxuICAgIDEzNyxcclxuICAgIDM2LFxyXG4gICAgMzIsXHJcbiAgICAyMixcclxuICAgIDUsXHJcblxyXG4gICAgLy8gYW5kIGEgc2Vjb25kIGNvcHkgc28gd2UgZG9uJ3QgbmVlZCBhbiBleHRyYSBtYXNrIG9yIHN0YXRpYyBpbml0aWFsaXplclxyXG4gICAgMjMsXHJcbiAgICAxMjUsXHJcbiAgICAxNjEsXHJcbiAgICA1MixcclxuICAgIDEwMyxcclxuICAgIDExNyxcclxuICAgIDcwLFxyXG4gICAgMzcsXHJcbiAgICAyNDcsXHJcbiAgICAxMDEsXHJcbiAgICAyMDMsXHJcbiAgICAxNjksXHJcbiAgICAxMjQsXHJcbiAgICAxMjYsXHJcbiAgICA0NCxcclxuICAgIDEyMyxcclxuICAgIDE1MixcclxuICAgIDIzOCxcclxuICAgIDE0NSxcclxuICAgIDQ1LFxyXG4gICAgMTcxLFxyXG4gICAgMTE0LFxyXG4gICAgMjUzLFxyXG4gICAgMTAsXHJcbiAgICAxOTIsXHJcbiAgICAxMzYsXHJcbiAgICA0LFxyXG4gICAgMTU3LFxyXG4gICAgMjQ5LFxyXG4gICAgMzAsXHJcbiAgICAzNSxcclxuICAgIDcyLFxyXG4gICAgMTc1LFxyXG4gICAgNjMsXHJcbiAgICA3NyxcclxuICAgIDkwLFxyXG4gICAgMTgxLFxyXG4gICAgMTYsXHJcbiAgICA5NixcclxuICAgIDExMSxcclxuICAgIDEzMyxcclxuICAgIDEwNCxcclxuICAgIDc1LFxyXG4gICAgMTYyLFxyXG4gICAgOTMsXHJcbiAgICA1NixcclxuICAgIDY2LFxyXG4gICAgMjQwLFxyXG4gICAgOCxcclxuICAgIDUwLFxyXG4gICAgODQsXHJcbiAgICAyMjksXHJcbiAgICA0OSxcclxuICAgIDIxMCxcclxuICAgIDE3MyxcclxuICAgIDIzOSxcclxuICAgIDE0MSxcclxuICAgIDEsXHJcbiAgICA4NyxcclxuICAgIDE4LFxyXG4gICAgMixcclxuICAgIDE5OCxcclxuICAgIDE0MyxcclxuICAgIDU3LFxyXG4gICAgMjI1LFxyXG4gICAgMTYwLFxyXG4gICAgNTgsXHJcbiAgICAyMTcsXHJcbiAgICAxNjgsXHJcbiAgICAyMDYsXHJcbiAgICAyNDUsXHJcbiAgICAyMDQsXHJcbiAgICAxOTksXHJcbiAgICA2LFxyXG4gICAgNzMsXHJcbiAgICA2MCxcclxuICAgIDIwLFxyXG4gICAgMjMwLFxyXG4gICAgMjExLFxyXG4gICAgMjMzLFxyXG4gICAgOTQsXHJcbiAgICAyMDAsXHJcbiAgICA4OCxcclxuICAgIDksXHJcbiAgICA3NCxcclxuICAgIDE1NSxcclxuICAgIDMzLFxyXG4gICAgMTUsXHJcbiAgICAyMTksXHJcbiAgICAxMzAsXHJcbiAgICAyMjYsXHJcbiAgICAyMDIsXHJcbiAgICA4MyxcclxuICAgIDIzNixcclxuICAgIDQyLFxyXG4gICAgMTcyLFxyXG4gICAgMTY1LFxyXG4gICAgMjE4LFxyXG4gICAgNTUsXHJcbiAgICAyMjIsXHJcbiAgICA0NixcclxuICAgIDEwNyxcclxuICAgIDk4LFxyXG4gICAgMTU0LFxyXG4gICAgMTA5LFxyXG4gICAgNjcsXHJcbiAgICAxOTYsXHJcbiAgICAxNzgsXHJcbiAgICAxMjcsXHJcbiAgICAxNTgsXHJcbiAgICAxMyxcclxuICAgIDI0MyxcclxuICAgIDY1LFxyXG4gICAgNzksXHJcbiAgICAxNjYsXHJcbiAgICAyNDgsXHJcbiAgICAyNSxcclxuICAgIDIyNCxcclxuICAgIDExNSxcclxuICAgIDgwLFxyXG4gICAgNjgsXHJcbiAgICA1MSxcclxuICAgIDE4NCxcclxuICAgIDEyOCxcclxuICAgIDIzMixcclxuICAgIDIwOCxcclxuICAgIDE1MSxcclxuICAgIDEyMixcclxuICAgIDI2LFxyXG4gICAgMjEyLFxyXG4gICAgMTA1LFxyXG4gICAgNDMsXHJcbiAgICAxNzksXHJcbiAgICAyMTMsXHJcbiAgICAyMzUsXHJcbiAgICAxNDgsXHJcbiAgICAxNDYsXHJcbiAgICA4OSxcclxuICAgIDE0LFxyXG4gICAgMTk1LFxyXG4gICAgMjgsXHJcbiAgICA3OCxcclxuICAgIDExMixcclxuICAgIDc2LFxyXG4gICAgMjUwLFxyXG4gICAgNDcsXHJcbiAgICAyNCxcclxuICAgIDI1MSxcclxuICAgIDE0MCxcclxuICAgIDEwOCxcclxuICAgIDE4NixcclxuICAgIDE5MCxcclxuICAgIDIyOCxcclxuICAgIDE3MCxcclxuICAgIDE4MyxcclxuICAgIDEzOSxcclxuICAgIDM5LFxyXG4gICAgMTg4LFxyXG4gICAgMjQ0LFxyXG4gICAgMjQ2LFxyXG4gICAgMTMyLFxyXG4gICAgNDgsXHJcbiAgICAxMTksXHJcbiAgICAxNDQsXHJcbiAgICAxODAsXHJcbiAgICAxMzgsXHJcbiAgICAxMzQsXHJcbiAgICAxOTMsXHJcbiAgICA4MixcclxuICAgIDE4MixcclxuICAgIDEyMCxcclxuICAgIDEyMSxcclxuICAgIDg2LFxyXG4gICAgMjIwLFxyXG4gICAgMjA5LFxyXG4gICAgMyxcclxuICAgIDkxLFxyXG4gICAgMjQxLFxyXG4gICAgMTQ5LFxyXG4gICAgODUsXHJcbiAgICAyMDUsXHJcbiAgICAxNTAsXHJcbiAgICAxMTMsXHJcbiAgICAyMTYsXHJcbiAgICAzMSxcclxuICAgIDEwMCxcclxuICAgIDQxLFxyXG4gICAgMTY0LFxyXG4gICAgMTc3LFxyXG4gICAgMjE0LFxyXG4gICAgMTUzLFxyXG4gICAgMjMxLFxyXG4gICAgMzgsXHJcbiAgICA3MSxcclxuICAgIDE4NSxcclxuICAgIDE3NCxcclxuICAgIDk3LFxyXG4gICAgMjAxLFxyXG4gICAgMjksXHJcbiAgICA5NSxcclxuICAgIDcsXHJcbiAgICA5MixcclxuICAgIDU0LFxyXG4gICAgMjU0LFxyXG4gICAgMTkxLFxyXG4gICAgMTE4LFxyXG4gICAgMzQsXHJcbiAgICAyMjEsXHJcbiAgICAxMzEsXHJcbiAgICAxMSxcclxuICAgIDE2MyxcclxuICAgIDk5LFxyXG4gICAgMjM0LFxyXG4gICAgODEsXHJcbiAgICAyMjcsXHJcbiAgICAxNDcsXHJcbiAgICAxNTYsXHJcbiAgICAxNzYsXHJcbiAgICAxNyxcclxuICAgIDE0MixcclxuICAgIDY5LFxyXG4gICAgMTIsXHJcbiAgICAxMTAsXHJcbiAgICA2MixcclxuICAgIDI3LFxyXG4gICAgMjU1LFxyXG4gICAgMCxcclxuICAgIDE5NCxcclxuICAgIDU5LFxyXG4gICAgMTE2LFxyXG4gICAgMjQyLFxyXG4gICAgMjUyLFxyXG4gICAgMTksXHJcbiAgICAyMSxcclxuICAgIDE4NyxcclxuICAgIDUzLFxyXG4gICAgMjA3LFxyXG4gICAgMTI5LFxyXG4gICAgNjQsXHJcbiAgICAxMzUsXHJcbiAgICA2MSxcclxuICAgIDQwLFxyXG4gICAgMTY3LFxyXG4gICAgMjM3LFxyXG4gICAgMTAyLFxyXG4gICAgMjIzLFxyXG4gICAgMTA2LFxyXG4gICAgMTU5LFxyXG4gICAgMTk3LFxyXG4gICAgMTg5LFxyXG4gICAgMjE1LFxyXG4gICAgMTM3LFxyXG4gICAgMzYsXHJcbiAgICAzMixcclxuICAgIDIyLFxyXG4gICAgNVxyXG4pO1xyXG5cclxuLy8gY2FsY3VsYXRlcyBkb3QgcHJvZHVjdCBvZiB4LCB5IGFuZCBncmFkaWVudFxyXG5mbG9hdCBncmFkMShjb25zdCBpbnQgaGFzaCwgY29uc3QgZmxvYXQgeCkge1xyXG4gICAgcmV0dXJuIChoYXNoICYgMSkgPT0gMHgwID8gLXggOiB4O1xyXG59XHJcblxyXG4vLyBjYWxjdWxhdGVzIGRvdCBwcm9kdWN0IG9mIHgsIHkgYW5kIGdyYWRpZW50XHJcbmZsb2F0IGdyYWQyKGNvbnN0IGludCBoYXNoLCBjb25zdCBmbG9hdCB4LCBjb25zdCBmbG9hdCB5KSB7XHJcbiAgICBpbnQgaCA9IGhhc2ggJiAweDAzO1xyXG4gICAgc3dpdGNoIChoKSB7XHJcbiAgICBjYXNlIDB4MDA6XHJcbiAgICAgICAgLy8gKC0xLCAwKVxyXG4gICAgICAgIHJldHVybiAteDtcclxuICAgICAgICBicmVhaztcclxuICAgIGNhc2UgMHgwMTpcclxuICAgICAgICAvLyAoMSwgMClcclxuICAgICAgICByZXR1cm4geDtcclxuICAgICAgICBicmVhaztcclxuICAgIGNhc2UgMHgwMjpcclxuICAgICAgICAvLyAoMCwgLTEpXHJcbiAgICAgICAgcmV0dXJuIC15O1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAweDAzOlxyXG4gICAgICAgIC8vICgwLCAxKVxyXG4gICAgICAgIHJldHVybiB5O1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4gMC5mO1xyXG4gICAgfVxyXG59XHJcbiAgICBcclxuZmxvYXQgc21vb3RoZXJzdGVwKGNvbnN0IGZsb2F0IHgpIHtcclxuICAgIHJldHVybiB4ICogeCAqIHggKiAoeCAqICh4ICogNi5mIC0gMTUuZikgKyAxMC5mKTtcclxufVxyXG5cclxuZmxvYXQgcGVybGluMShjb25zdCBmbG9hdCB4eCkge1xyXG4gICAgaW50IHhmID0gaW50KGZsb29yKHh4KSk7XHJcbiAgICBmbG9hdCB4ID0geHggLSBmbG9hdCh4Zik7XHJcbiAgICBmbG9hdCB1ID0gc21vb3RoZXJzdGVwKHgpO1xyXG4gICAgaW50IHgwID0geGYgJiAyNTU7XHJcbiAgICBpbnQgeDEgPSAoeGYgKyAxKSAmIDI1NTtcclxuICAgIGZsb2F0IG4wID0gZ3JhZDEocGVybVt4MF0sIHgpO1xyXG4gICAgZmxvYXQgbjEgPSBncmFkMShwZXJtW3gxXSwgeCAtIDEuZik7XHJcbiAgICBmbG9hdCBuID0gbWl4KG4wLCBuMSwgdSk7XHJcbiAgICByZXR1cm4gbjtcclxufVxyXG5cclxuZmxvYXQgcGVybGluMihjb25zdCBmbG9hdCB4eCwgY29uc3QgZmxvYXQgeXkpIHtcclxuICAgIGludCB4ZiA9IGludChmbG9vcih4eCkpO1xyXG4gICAgaW50IHlmID0gaW50KGZsb29yKHl5KSk7XHJcbiAgICBmbG9hdCB4ID0geHggLSBmbG9hdCh4Zik7XHJcbiAgICBmbG9hdCB5ID0geXkgLSBmbG9hdCh5Zik7XHJcbiAgICBmbG9hdCB1ID0gc21vb3RoZXJzdGVwKHgpO1xyXG4gICAgZmxvYXQgdiA9IHNtb290aGVyc3RlcCh5KTtcclxuICAgIGludCB4MCA9IHhmICYgMjU1O1xyXG4gICAgaW50IHkwID0geWYgJiAyNTU7XHJcbiAgICBpbnQgeDEgPSAoeGYgKyAxKSAmIDI1NTtcclxuICAgIGludCB5MSA9ICh5ZiArIDEpICYgMjU1O1xyXG4gICAgaW50IHIwID0gcGVybVt4MF07XHJcbiAgICBpbnQgcjEgPSBwZXJtW3gxXTtcclxuICAgIGludCByMDAgPSBwZXJtW3IwICsgeTBdO1xyXG4gICAgaW50IHIwMSA9IHBlcm1bcjAgKyB5MV07XHJcbiAgICBpbnQgcjEwID0gcGVybVtyMSArIHkwXTtcclxuICAgIGludCByMTEgPSBwZXJtW3IxICsgeTFdO1xyXG4gICAgZmxvYXQgbjAwID0gZ3JhZDIocjAwLCB4LCB5KTtcclxuICAgIGZsb2F0IG4wMSA9IGdyYWQyKHIwMSwgeCwgeSAtIDEuZik7XHJcbiAgICBmbG9hdCBuMTAgPSBncmFkMihyMTAsIHggLSAxLmYsIHkpO1xyXG4gICAgZmxvYXQgbjExID0gZ3JhZDIocjExLCB4IC0gMS5mLCB5IC0gMS5mKTtcclxuICAgIGZsb2F0IG4wID0gbWl4KG4wMCwgbjAxLCB2KTtcclxuICAgIGZsb2F0IG4xID0gbWl4KG4xMCwgbjExLCB2KTtcclxuICAgIGZsb2F0IG4gPSBtaXgobjAsIG4xLCB1KTtcclxuICAgIHJldHVybiBuO1xyXG59XHJcblxyXG5mbG9hdCBmYm0yKGNvbnN0IGZsb2F0IHgsIGNvbnN0IGZsb2F0IHksIGNvbnN0IGZsb2F0IGxhY3VuYXJpdHksIGNvbnN0IGZsb2F0IGdhaW4sIGNvbnN0IGludCBvY3RhdmVzKSB7XHJcbiAgICBmbG9hdCBmcmVxID0gMS5mO1xyXG4gICAgZmxvYXQgYW1wID0gMS5mO1xyXG4gICAgZmxvYXQgc3VtID0gMC5mO1xyXG4gICAgZm9yIChpbnQgaSA9IDA7IGkgPCBvY3RhdmVzOyArK2kpIHtcclxuICAgICAgICBzdW0gKz0gYW1wICogcGVybGluMih4ICogZnJlcSwgeSAqIGZyZXEpO1xyXG4gICAgICAgIGZyZXEgKj0gbGFjdW5hcml0eTtcclxuICAgICAgICBhbXAgKj0gZ2FpbjtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc3VtO1xyXG59XHJcbmBcclxuXHJcbmV4cG9ydCB7cGVybGluMn0iXX0=