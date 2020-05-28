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