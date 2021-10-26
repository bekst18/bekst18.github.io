/**
 * sfc32 is part of the PractRand random number testing suite (which it passes of course). sfc32 has a 128-bit state and is very fast in JS.
 */
export class SFC32RNG {
    /**
     * * sfc32 is part of the PractRand random number testing suite (which it passes of course). sfc32 has a 128-bit state and is very fast in JS.
     * @param a seed 1
     * @param b seed 2
     * @param c seed 3
     * @param d seed 4
     */
    constructor(a, b, c, d) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
    }
    next() {
        let a = this.a;
        let b = this.b;
        let c = this.c;
        let d = this.d;
        a >>>= 0;
        b >>>= 0;
        c >>>= 0;
        d >>>= 0;
        var t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        return (t >>> 0) / 4294967296;
    }
    save() {
        return [this.a, this.b, this.c, this.d];
    }
}
/**
 * returns a function that generates hashes
 * @param str string state
 * @returns hash function
 */
export function xmur3(str) {
    for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
            h = h << 13 | h >>> 19;
    return function () {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}
/**
 * sfc32 is part of the PractRand random number testing suite (which it passes of course). sfc32 has a 128-bit state and is very fast in JS.
 * @param a seed1
 * @param b seed2
 * @param c seed3
 * @param d seed4
 * @returns rng
 */
// export function sfc32(a: number, b: number, c: number, d: number): RNG {
//     return () => {
//         a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
//         let t = (a + b) | 0;
//         a = b ^ b >>> 9;
//         b = c + (c << 3) | 0;
//         c = (c << 21 | c >>> 11);
//         d = d + 1 | 0;
//         t = t + d | 0;
//         c = c + t | 0;
//         return (t >>> 0) / 4294967296;
//     }
// }
/**
 * Mulberry32 is a simple generator with a 32-bit state, but is extremely fast and has good quality (author states it passes all tests of gjrand testing suite and has a full 232 period, but I haven't verified).
 * @param a seed
 * @returns rng
 */
// export function mulberry32(a: number): RNG {
//     return () => {
//         let t = a += 0x6D2B79F5;
//         t = Math.imul(t ^ t >>> 15, t | 1);
//         t ^= t + Math.imul(t ^ t >>> 7, t | 61);
//         return ((t ^ t >>> 14) >>> 0) / 4294967296;
//     }
// }
/**
 * As of May 2018, xoshiro128** is the new member of the Xorshift family, by Vigna & Blackman (professor Vigna was also responsible for the Xorshift128+ algorithm powering most Math.random implementations under the hood). It is the fastest generator that offers a 128-bit state.
 * @param a seed1
 * @param b seed2
 * @param c seed3
 * @param d seed4
 * @returns rng
 */
// export function xoshiro128ss(a: number, b: number, c: number, d: number): RNG {
//     return () => {
//         let t = b << 9, r = a * 5; r = (r << 7 | r >>> 25) * 9;
//         c ^= a; d ^= b;
//         b ^= c; a ^= d; c ^= t;
//         d = d << 11 | d >>> 21;
//         return (r >>> 0) / 4294967296;
//     }
// }
/**
 * This is JSF or 'smallprng' by Bob Jenkins (2007), who also made ISAAC and SpookyHash. It passes PractRand tests and should be quite fast, although not as fast as sfc32.
 * @param a seed1
 * @param b seed2
 * @param c seed3
 * @param d seed4
 * @returns rnhg
 */
// export function jsf32(a: number, b: number, c: number, d: number): RNG {
//     return () => {
//         a |= 0; b |= 0; c |= 0; d |= 0;
//         let t = a - (b << 27 | b >>> 5) | 0;
//         a = b ^ (c << 17 | c >>> 15);
//         b = c + d | 0;
//         c = d + t | 0;
//         d = a + t | 0;
//         return (d >>> 0) / 4294967296;
//     }
// }
/**
 * choose a uniform random float from interval [min, max)
 * @param min min value to return
 * @param max max value to return
 */
export function float(rng, min, max) {
    const range = max - min;
    return rng.next() * range + min;
}
/**
 * choose a uniform random integer from interval [min, max)
 * @param min
 * @param max
 */
export function int(rng, min, max) {
    return Math.floor(float(rng, min, max));
}
/**
 * choose a random element from the specified array
 * @param list array-like object to select a random element from
 */
export function choose(rng, a) {
    const idx = int(rng, 0, a.length);
    return a[idx];
}
/**
 * randomly shuffle the specified array in place
 * @param a array to shuffle
 */
export function shuffle(rng, a) {
    for (let i = a.length - 1; i >= 0; --i) {
        const j = Math.floor(rng.next() * i);
        const tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
    return a;
}
/**
 * returns true x% of the time
 * @param x true chance
 */
export function chance(rng, x) {
    return rng.next() < x;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJhbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBUUE7O0dBRUc7QUFDSCxNQUFNLE9BQU8sUUFBUTtJQUNqQjs7Ozs7O09BTUc7SUFDSCxZQUFvQixDQUFTLEVBQVUsQ0FBUyxFQUFVLENBQVMsRUFBVSxDQUFTO1FBQWxFLE1BQUMsR0FBRCxDQUFDLENBQVE7UUFBVSxNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQVUsTUFBQyxHQUFELENBQUMsQ0FBUTtRQUFVLE1BQUMsR0FBRCxDQUFDLENBQVE7SUFBSSxDQUFDO0lBRTNGLElBQUk7UUFDQSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2QsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNkLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDZCxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRWQsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2hCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3pCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVkLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ1YsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDVixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNWLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRVYsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUM7SUFDbEMsQ0FBQztJQUVELElBQUk7UUFDQSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDSjtBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsS0FBSyxDQUFDLEdBQVc7SUFDN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUM1RCxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUM7WUFDNUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUMvQixPQUFPO1FBQ0gsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDeEMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDeEMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2pDLENBQUMsQ0FBQTtBQUNMLENBQUM7QUFFRDs7Ozs7OztHQU9HO0FBQ0gsMkVBQTJFO0FBQzNFLHFCQUFxQjtBQUNyQixrREFBa0Q7QUFDbEQsK0JBQStCO0FBQy9CLDJCQUEyQjtBQUMzQixnQ0FBZ0M7QUFDaEMsb0NBQW9DO0FBQ3BDLHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIseUJBQXlCO0FBQ3pCLHlDQUF5QztBQUN6QyxRQUFRO0FBQ1IsSUFBSTtBQUVKOzs7O0dBSUc7QUFDSCwrQ0FBK0M7QUFDL0MscUJBQXFCO0FBQ3JCLG1DQUFtQztBQUNuQyw4Q0FBOEM7QUFDOUMsbURBQW1EO0FBQ25ELHNEQUFzRDtBQUN0RCxRQUFRO0FBQ1IsSUFBSTtBQUVKOzs7Ozs7O0dBT0c7QUFDSCxrRkFBa0Y7QUFDbEYscUJBQXFCO0FBQ3JCLGtFQUFrRTtBQUNsRSwwQkFBMEI7QUFDMUIsa0NBQWtDO0FBQ2xDLGtDQUFrQztBQUNsQyx5Q0FBeUM7QUFDekMsUUFBUTtBQUNSLElBQUk7QUFFSjs7Ozs7OztHQU9HO0FBQ0gsMkVBQTJFO0FBQzNFLHFCQUFxQjtBQUNyQiwwQ0FBMEM7QUFDMUMsK0NBQStDO0FBQy9DLHdDQUF3QztBQUN4Qyx5QkFBeUI7QUFDekIseUJBQXlCO0FBQ3pCLHlCQUF5QjtBQUN6Qix5Q0FBeUM7QUFDekMsUUFBUTtBQUNSLElBQUk7QUFFSjs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLEtBQUssQ0FBQyxHQUFRLEVBQUUsR0FBVyxFQUFFLEdBQVc7SUFDcEQsTUFBTSxLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUN4QixPQUFPLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFBO0FBQ25DLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLEdBQUcsQ0FBQyxHQUFRLEVBQUUsR0FBVyxFQUFFLEdBQVc7SUFDbEQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFDM0MsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxNQUFNLENBQUksR0FBUSxFQUFFLENBQWU7SUFDL0MsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2pDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0FBQ2pCLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsT0FBTyxDQUFJLEdBQVEsRUFBRSxDQUFXO0lBQzVDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRTtRQUNwQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUE7S0FDYjtJQUVELE9BQU8sQ0FBQyxDQUFBO0FBQ1osQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxNQUFNLENBQUMsR0FBUSxFQUFFLENBQVM7SUFDdEMsT0FBTyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0FBQ3pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogUmFuZG9tIG51bWJlciBnZW5lcmF0b3JcclxuICogUHJvdmlkZXMgYSBzaW5nbGUgbmV4dCgpIG1ldGhvZCB0aGF0IGdlbmVyYXRlcyBhIHJhbmRvbSBudW1iZXJcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgUk5HIHtcclxuICAgIG5leHQoKTogbnVtYmVyXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBzZmMzMiBpcyBwYXJ0IG9mIHRoZSBQcmFjdFJhbmQgcmFuZG9tIG51bWJlciB0ZXN0aW5nIHN1aXRlICh3aGljaCBpdCBwYXNzZXMgb2YgY291cnNlKS4gc2ZjMzIgaGFzIGEgMTI4LWJpdCBzdGF0ZSBhbmQgaXMgdmVyeSBmYXN0IGluIEpTLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFNGQzMyUk5HIGltcGxlbWVudHMgUk5HIHtcclxuICAgIC8qKlxyXG4gICAgICogKiBzZmMzMiBpcyBwYXJ0IG9mIHRoZSBQcmFjdFJhbmQgcmFuZG9tIG51bWJlciB0ZXN0aW5nIHN1aXRlICh3aGljaCBpdCBwYXNzZXMgb2YgY291cnNlKS4gc2ZjMzIgaGFzIGEgMTI4LWJpdCBzdGF0ZSBhbmQgaXMgdmVyeSBmYXN0IGluIEpTLlxyXG4gICAgICogQHBhcmFtIGEgc2VlZCAxXHJcbiAgICAgKiBAcGFyYW0gYiBzZWVkIDJcclxuICAgICAqIEBwYXJhbSBjIHNlZWQgM1xyXG4gICAgICogQHBhcmFtIGQgc2VlZCA0XHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgYTogbnVtYmVyLCBwcml2YXRlIGI6IG51bWJlciwgcHJpdmF0ZSBjOiBudW1iZXIsIHByaXZhdGUgZDogbnVtYmVyKSB7IH1cclxuXHJcbiAgICBuZXh0KCk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IGEgPSB0aGlzLmFcclxuICAgICAgICBsZXQgYiA9IHRoaXMuYlxyXG4gICAgICAgIGxldCBjID0gdGhpcy5jXHJcbiAgICAgICAgbGV0IGQgPSB0aGlzLmRcclxuXHJcbiAgICAgICAgYSA+Pj49IDA7IGIgPj4+PSAwOyBjID4+Pj0gMDsgZCA+Pj49IDA7XHJcbiAgICAgICAgdmFyIHQgPSAoYSArIGIpIHwgMDtcclxuICAgICAgICBhID0gYiBeIGIgPj4+IDk7XHJcbiAgICAgICAgYiA9IGMgKyAoYyA8PCAzKSB8IDA7XHJcbiAgICAgICAgYyA9IChjIDw8IDIxIHwgYyA+Pj4gMTEpO1xyXG4gICAgICAgIGQgPSBkICsgMSB8IDA7XHJcbiAgICAgICAgdCA9IHQgKyBkIHwgMDtcclxuICAgICAgICBjID0gYyArIHQgfCAwO1xyXG5cclxuICAgICAgICB0aGlzLmEgPSBhXHJcbiAgICAgICAgdGhpcy5iID0gYlxyXG4gICAgICAgIHRoaXMuYyA9IGNcclxuICAgICAgICB0aGlzLmQgPSBkXHJcblxyXG4gICAgICAgIHJldHVybiAodCA+Pj4gMCkgLyA0Mjk0OTY3Mjk2O1xyXG4gICAgfVxyXG5cclxuICAgIHNhdmUoKTogW251bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgICAgIHJldHVybiBbdGhpcy5hLCB0aGlzLmIsIHRoaXMuYywgdGhpcy5kXVxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogcmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgZ2VuZXJhdGVzIGhhc2hlc1xyXG4gKiBAcGFyYW0gc3RyIHN0cmluZyBzdGF0ZVxyXG4gKiBAcmV0dXJucyBoYXNoIGZ1bmN0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24geG11cjMoc3RyOiBzdHJpbmcpOiAoKSA9PiBudW1iZXIge1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIGggPSAxNzc5MDMzNzAzIF4gc3RyLmxlbmd0aDsgaSA8IHN0ci5sZW5ndGg7IGkrKylcclxuICAgICAgICBoID0gTWF0aC5pbXVsKGggXiBzdHIuY2hhckNvZGVBdChpKSwgMzQzMjkxODM1MyksXHJcbiAgICAgICAgICAgIGggPSBoIDw8IDEzIHwgaCA+Pj4gMTk7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGggPSBNYXRoLmltdWwoaCBeIGggPj4+IDE2LCAyMjQ2ODIyNTA3KTtcclxuICAgICAgICBoID0gTWF0aC5pbXVsKGggXiBoID4+PiAxMywgMzI2NjQ4OTkwOSk7XHJcbiAgICAgICAgcmV0dXJuIChoIF49IGggPj4+IDE2KSA+Pj4gMDtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIHNmYzMyIGlzIHBhcnQgb2YgdGhlIFByYWN0UmFuZCByYW5kb20gbnVtYmVyIHRlc3Rpbmcgc3VpdGUgKHdoaWNoIGl0IHBhc3NlcyBvZiBjb3Vyc2UpLiBzZmMzMiBoYXMgYSAxMjgtYml0IHN0YXRlIGFuZCBpcyB2ZXJ5IGZhc3QgaW4gSlMuXHJcbiAqIEBwYXJhbSBhIHNlZWQxXHJcbiAqIEBwYXJhbSBiIHNlZWQyXHJcbiAqIEBwYXJhbSBjIHNlZWQzXHJcbiAqIEBwYXJhbSBkIHNlZWQ0XHJcbiAqIEByZXR1cm5zIHJuZ1xyXG4gKi9cclxuLy8gZXhwb3J0IGZ1bmN0aW9uIHNmYzMyKGE6IG51bWJlciwgYjogbnVtYmVyLCBjOiBudW1iZXIsIGQ6IG51bWJlcik6IFJORyB7XHJcbi8vICAgICByZXR1cm4gKCkgPT4ge1xyXG4vLyAgICAgICAgIGEgPj4+PSAwOyBiID4+Pj0gMDsgYyA+Pj49IDA7IGQgPj4+PSAwO1xyXG4vLyAgICAgICAgIGxldCB0ID0gKGEgKyBiKSB8IDA7XHJcbi8vICAgICAgICAgYSA9IGIgXiBiID4+PiA5O1xyXG4vLyAgICAgICAgIGIgPSBjICsgKGMgPDwgMykgfCAwO1xyXG4vLyAgICAgICAgIGMgPSAoYyA8PCAyMSB8IGMgPj4+IDExKTtcclxuLy8gICAgICAgICBkID0gZCArIDEgfCAwO1xyXG4vLyAgICAgICAgIHQgPSB0ICsgZCB8IDA7XHJcbi8vICAgICAgICAgYyA9IGMgKyB0IHwgMDtcclxuLy8gICAgICAgICByZXR1cm4gKHQgPj4+IDApIC8gNDI5NDk2NzI5NjtcclxuLy8gICAgIH1cclxuLy8gfVxyXG5cclxuLyoqXHJcbiAqIE11bGJlcnJ5MzIgaXMgYSBzaW1wbGUgZ2VuZXJhdG9yIHdpdGggYSAzMi1iaXQgc3RhdGUsIGJ1dCBpcyBleHRyZW1lbHkgZmFzdCBhbmQgaGFzIGdvb2QgcXVhbGl0eSAoYXV0aG9yIHN0YXRlcyBpdCBwYXNzZXMgYWxsIHRlc3RzIG9mIGdqcmFuZCB0ZXN0aW5nIHN1aXRlIGFuZCBoYXMgYSBmdWxsIDIzMiBwZXJpb2QsIGJ1dCBJIGhhdmVuJ3QgdmVyaWZpZWQpLlxyXG4gKiBAcGFyYW0gYSBzZWVkXHJcbiAqIEByZXR1cm5zIHJuZ1xyXG4gKi9cclxuLy8gZXhwb3J0IGZ1bmN0aW9uIG11bGJlcnJ5MzIoYTogbnVtYmVyKTogUk5HIHtcclxuLy8gICAgIHJldHVybiAoKSA9PiB7XHJcbi8vICAgICAgICAgbGV0IHQgPSBhICs9IDB4NkQyQjc5RjU7XHJcbi8vICAgICAgICAgdCA9IE1hdGguaW11bCh0IF4gdCA+Pj4gMTUsIHQgfCAxKTtcclxuLy8gICAgICAgICB0IF49IHQgKyBNYXRoLmltdWwodCBeIHQgPj4+IDcsIHQgfCA2MSk7XHJcbi8vICAgICAgICAgcmV0dXJuICgodCBeIHQgPj4+IDE0KSA+Pj4gMCkgLyA0Mjk0OTY3Mjk2O1xyXG4vLyAgICAgfVxyXG4vLyB9XHJcblxyXG4vKipcclxuICogQXMgb2YgTWF5IDIwMTgsIHhvc2hpcm8xMjgqKiBpcyB0aGUgbmV3IG1lbWJlciBvZiB0aGUgWG9yc2hpZnQgZmFtaWx5LCBieSBWaWduYSAmIEJsYWNrbWFuIChwcm9mZXNzb3IgVmlnbmEgd2FzIGFsc28gcmVzcG9uc2libGUgZm9yIHRoZSBYb3JzaGlmdDEyOCsgYWxnb3JpdGhtIHBvd2VyaW5nIG1vc3QgTWF0aC5yYW5kb20gaW1wbGVtZW50YXRpb25zIHVuZGVyIHRoZSBob29kKS4gSXQgaXMgdGhlIGZhc3Rlc3QgZ2VuZXJhdG9yIHRoYXQgb2ZmZXJzIGEgMTI4LWJpdCBzdGF0ZS5cclxuICogQHBhcmFtIGEgc2VlZDFcclxuICogQHBhcmFtIGIgc2VlZDJcclxuICogQHBhcmFtIGMgc2VlZDNcclxuICogQHBhcmFtIGQgc2VlZDRcclxuICogQHJldHVybnMgcm5nXHJcbiAqL1xyXG4vLyBleHBvcnQgZnVuY3Rpb24geG9zaGlybzEyOHNzKGE6IG51bWJlciwgYjogbnVtYmVyLCBjOiBudW1iZXIsIGQ6IG51bWJlcik6IFJORyB7XHJcbi8vICAgICByZXR1cm4gKCkgPT4ge1xyXG4vLyAgICAgICAgIGxldCB0ID0gYiA8PCA5LCByID0gYSAqIDU7IHIgPSAociA8PCA3IHwgciA+Pj4gMjUpICogOTtcclxuLy8gICAgICAgICBjIF49IGE7IGQgXj0gYjtcclxuLy8gICAgICAgICBiIF49IGM7IGEgXj0gZDsgYyBePSB0O1xyXG4vLyAgICAgICAgIGQgPSBkIDw8IDExIHwgZCA+Pj4gMjE7XHJcbi8vICAgICAgICAgcmV0dXJuIChyID4+PiAwKSAvIDQyOTQ5NjcyOTY7XHJcbi8vICAgICB9XHJcbi8vIH1cclxuXHJcbi8qKlxyXG4gKiBUaGlzIGlzIEpTRiBvciAnc21hbGxwcm5nJyBieSBCb2IgSmVua2lucyAoMjAwNyksIHdobyBhbHNvIG1hZGUgSVNBQUMgYW5kIFNwb29reUhhc2guIEl0IHBhc3NlcyBQcmFjdFJhbmQgdGVzdHMgYW5kIHNob3VsZCBiZSBxdWl0ZSBmYXN0LCBhbHRob3VnaCBub3QgYXMgZmFzdCBhcyBzZmMzMi5cclxuICogQHBhcmFtIGEgc2VlZDFcclxuICogQHBhcmFtIGIgc2VlZDJcclxuICogQHBhcmFtIGMgc2VlZDNcclxuICogQHBhcmFtIGQgc2VlZDRcclxuICogQHJldHVybnMgcm5oZ1xyXG4gKi9cclxuLy8gZXhwb3J0IGZ1bmN0aW9uIGpzZjMyKGE6IG51bWJlciwgYjogbnVtYmVyLCBjOiBudW1iZXIsIGQ6IG51bWJlcik6IFJORyB7XHJcbi8vICAgICByZXR1cm4gKCkgPT4ge1xyXG4vLyAgICAgICAgIGEgfD0gMDsgYiB8PSAwOyBjIHw9IDA7IGQgfD0gMDtcclxuLy8gICAgICAgICBsZXQgdCA9IGEgLSAoYiA8PCAyNyB8IGIgPj4+IDUpIHwgMDtcclxuLy8gICAgICAgICBhID0gYiBeIChjIDw8IDE3IHwgYyA+Pj4gMTUpO1xyXG4vLyAgICAgICAgIGIgPSBjICsgZCB8IDA7XHJcbi8vICAgICAgICAgYyA9IGQgKyB0IHwgMDtcclxuLy8gICAgICAgICBkID0gYSArIHQgfCAwO1xyXG4vLyAgICAgICAgIHJldHVybiAoZCA+Pj4gMCkgLyA0Mjk0OTY3Mjk2O1xyXG4vLyAgICAgfVxyXG4vLyB9XHJcblxyXG4vKipcclxuICogY2hvb3NlIGEgdW5pZm9ybSByYW5kb20gZmxvYXQgZnJvbSBpbnRlcnZhbCBbbWluLCBtYXgpXHJcbiAqIEBwYXJhbSBtaW4gbWluIHZhbHVlIHRvIHJldHVyblxyXG4gKiBAcGFyYW0gbWF4IG1heCB2YWx1ZSB0byByZXR1cm5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBmbG9hdChybmc6IFJORywgbWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IHJhbmdlID0gbWF4IC0gbWluO1xyXG4gICAgcmV0dXJuIHJuZy5uZXh0KCkgKiByYW5nZSArIG1pblxyXG59XHJcblxyXG4vKipcclxuICogY2hvb3NlIGEgdW5pZm9ybSByYW5kb20gaW50ZWdlciBmcm9tIGludGVydmFsIFttaW4sIG1heClcclxuICogQHBhcmFtIG1pbiBcclxuICogQHBhcmFtIG1heCBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnQocm5nOiBSTkcsIG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gTWF0aC5mbG9vcihmbG9hdChybmcsIG1pbiwgbWF4KSlcclxufVxyXG5cclxuLyoqXHJcbiAqIGNob29zZSBhIHJhbmRvbSBlbGVtZW50IGZyb20gdGhlIHNwZWNpZmllZCBhcnJheVxyXG4gKiBAcGFyYW0gbGlzdCBhcnJheS1saWtlIG9iamVjdCB0byBzZWxlY3QgYSByYW5kb20gZWxlbWVudCBmcm9tXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY2hvb3NlPFQ+KHJuZzogUk5HLCBhOiBBcnJheUxpa2U8VD4pIHtcclxuICAgIGNvbnN0IGlkeCA9IGludChybmcsIDAsIGEubGVuZ3RoKVxyXG4gICAgcmV0dXJuIGFbaWR4XVxyXG59XHJcblxyXG4vKipcclxuICogcmFuZG9tbHkgc2h1ZmZsZSB0aGUgc3BlY2lmaWVkIGFycmF5IGluIHBsYWNlXHJcbiAqIEBwYXJhbSBhIGFycmF5IHRvIHNodWZmbGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBzaHVmZmxlPFQ+KHJuZzogUk5HLCBhOiBBcnJheTxUPik6IEFycmF5PFQ+IHtcclxuICAgIGZvciAobGV0IGkgPSBhLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XHJcbiAgICAgICAgY29uc3QgaiA9IE1hdGguZmxvb3Iocm5nLm5leHQoKSAqIGkpXHJcbiAgICAgICAgY29uc3QgdG1wID0gYVtpXVxyXG4gICAgICAgIGFbaV0gPSBhW2pdXHJcbiAgICAgICAgYVtqXSA9IHRtcFxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhXHJcbn1cclxuXHJcbi8qKlxyXG4gKiByZXR1cm5zIHRydWUgeCUgb2YgdGhlIHRpbWVcclxuICogQHBhcmFtIHggdHJ1ZSBjaGFuY2VcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjaGFuY2Uocm5nOiBSTkcsIHg6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHJuZy5uZXh0KCkgPCB4XHJcbn0iXX0=