/**
 * Random number generator type alias
 * an RNG should return a pseudo-random number in the range (0,1)
 */
export type RNG = () => number

/**
 * returns a function that generates hashes
 * @param str string state
 * @returns hash function
 */
export function xmur3(str: string): RNG {
    for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
            h = h << 13 | h >>> 19;
    return function () {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}

/**
 * sfc32 is part of the PractRand random number testing suite (which it passes of course). sfc32 has a 128-bit state and is very fast in JS.
 * @param a seed1
 * @param b seed2
 * @param c seed3
 * @param d seed4
 * @returns rng
 */
export function sfc32(a: number, b: number, c: number, d: number): RNG {
    return () => {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        var t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

/**
 * Mulberry32 is a simple generator with a 32-bit state, but is extremely fast and has good quality (author states it passes all tests of gjrand testing suite and has a full 232 period, but I haven't verified).
 * @param a seed
 * @returns rng
 */
export function mulberry32(a: number): RNG {
    return () => {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

/**
 * As of May 2018, xoshiro128** is the new member of the Xorshift family, by Vigna & Blackman (professor Vigna was also responsible for the Xorshift128+ algorithm powering most Math.random implementations under the hood). It is the fastest generator that offers a 128-bit state.
 * @param a seed1
 * @param b seed2
 * @param c seed3
 * @param d seed4
 * @returns rng
 */
export function xoshiro128ss(a: number, b: number, c: number, d: number): RNG {
    return () => {
        var t = b << 9, r = a * 5; r = (r << 7 | r >>> 25) * 9;
        c ^= a; d ^= b;
        b ^= c; a ^= d; c ^= t;
        d = d << 11 | d >>> 21;
        return (r >>> 0) / 4294967296;
    }
}

/**
 * This is JSF or 'smallprng' by Bob Jenkins (2007), who also made ISAAC and SpookyHash. It passes PractRand tests and should be quite fast, although not as fast as sfc32.
 * @param a seed1
 * @param b seed2
 * @param c seed3
 * @param d seed4
 * @returns rnhg
 */
export function jsf32(a: number, b: number, c: number, d: number): RNG {
    return () => {
        a |= 0; b |= 0; c |= 0; d |= 0;
        var t = a - (b << 27 | b >>> 5) | 0;
        a = b ^ (c << 17 | c >>> 15);
        b = c + d | 0;
        c = d + t | 0;
        d = a + t | 0;
        return (d >>> 0) / 4294967296;
    }
}

/**
 * choose a uniform random float from interval [min, max)
 * @param min min value to return
 * @param max max value to return
 */
export function float(rng: RNG, min: number, max: number): number {
    const range = max - min;
    return rng() * range + min
}

/**
 * choose a uniform random integer from interval [min, max)
 * @param min 
 * @param max 
 */
export function int(rng: RNG, min: number, max: number): number {
    return Math.floor(float(rng, min, max))
}

/**
 * choose a random element from the specified array
 * @param list array-like object to select a random element from
 */
export function choose<T>(rng: RNG, a: ArrayLike<T>) {
    const idx = int(rng, 0, a.length)
    return a[idx]
}

/**
 * randomly shuffle the specified array in place
 * @param a array to shuffle
 */
export function shuffle<T>(rng: RNG, a: Array<T>): Array<T> {
    for (let i = a.length - 1; i >= 0; --i) {
        const j = Math.floor(rng() * i)
        const tmp = a[i]
        a[i] = a[j]
        a[j] = tmp
    }

    return a
}

/**
 * returns true x% of the time
 * @param x true chance
 */
export function chance(rng: RNG, x: number): boolean {
    return rng() < x
}