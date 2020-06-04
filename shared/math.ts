/**
 * math utility library
 */

/**
 * clamp x such that it is in the interval [min, max]
 * @param x value to clamp
 * @param min minimum value
 * @param max maximum vaule
 */
export function clamp(x: number, min: number, max: number): number {
    return Math.min(Math.max(x, min), max)
}

/**
 * Linearly interpolate between 2 values
 * @param a first number
 * @param b second number
 * @param t interpolation factor (0 = a, 1 = b, .5 = halfway between a and b)
 */
export function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t
}

/**
 * return a number between 0 and 1 (0 if a, 1 if b, .5 if halfway between)
 * @param a first number
 * @param b second number
 * @param x interpolated value
 */
export function unlerp(a: number, b: number, x: number) {
    return a == b ? 0 : (x - a) / (b - a)
}