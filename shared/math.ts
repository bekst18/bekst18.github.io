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