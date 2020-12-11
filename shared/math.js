/**
 * math utility library
 */
/**
 * clamp x such that it is in the interval [min, max]
 * @param x value to clamp
 * @param min minimum value
 * @param max maximum vaule
 */
export function clamp(x, min, max) {
    return Math.min(Math.max(x, min), max);
}
/**
 * Linearly interpolate between 2 values
 * @param a first number
 * @param b second number
 * @param t interpolation factor (0 = a, 1 = b, .5 = halfway between a and b)
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}
/**
 * return a number between 0 and 1 (0 if a, 1 if b, .5 if halfway between)
 * @param a first number
 * @param b second number
 * @param x interpolated value
 */
export function unlerp(a, b, x) {
    return a == b ? 0 : (x - a) / (b - a);
}
/**
 * return the next power of two on or after the specified number
 * if the number is already a power of 2 it is returned
 * @param x number
 */
export function nextPow2(x) {
    return Math.pow(2, Math.ceil(Math.log2(x)));
}
/**
 * return python style modulo of x and y (negative mod results in positive number)
 * @param x number
 * @param y number
 */
export function mod(x, y) {
    return ((x % y) + y) % y;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hdGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFFSDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxLQUFLLENBQUMsQ0FBUyxFQUFFLEdBQVcsRUFBRSxHQUFXO0lBQ3JELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtBQUMxQyxDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsSUFBSSxDQUFDLENBQVMsRUFBRSxDQUFTLEVBQUUsQ0FBUztJQUNoRCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDMUIsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLE1BQU0sQ0FBQyxDQUFTLEVBQUUsQ0FBUyxFQUFFLENBQVM7SUFDbEQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBQ3pDLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLFFBQVEsQ0FBQyxDQUFTO0lBQzlCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUMvQyxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBUyxFQUFFLENBQVM7SUFDcEMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIG1hdGggdXRpbGl0eSBsaWJyYXJ5XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIGNsYW1wIHggc3VjaCB0aGF0IGl0IGlzIGluIHRoZSBpbnRlcnZhbCBbbWluLCBtYXhdXHJcbiAqIEBwYXJhbSB4IHZhbHVlIHRvIGNsYW1wXHJcbiAqIEBwYXJhbSBtaW4gbWluaW11bSB2YWx1ZVxyXG4gKiBAcGFyYW0gbWF4IG1heGltdW0gdmF1bGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjbGFtcCh4OiBudW1iZXIsIG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gTWF0aC5taW4oTWF0aC5tYXgoeCwgbWluKSwgbWF4KVxyXG59XHJcblxyXG4vKipcclxuICogTGluZWFybHkgaW50ZXJwb2xhdGUgYmV0d2VlbiAyIHZhbHVlc1xyXG4gKiBAcGFyYW0gYSBmaXJzdCBudW1iZXJcclxuICogQHBhcmFtIGIgc2Vjb25kIG51bWJlclxyXG4gKiBAcGFyYW0gdCBpbnRlcnBvbGF0aW9uIGZhY3RvciAoMCA9IGEsIDEgPSBiLCAuNSA9IGhhbGZ3YXkgYmV0d2VlbiBhIGFuZCBiKVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGxlcnAoYTogbnVtYmVyLCBiOiBudW1iZXIsIHQ6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIGEgKyAoYiAtIGEpICogdFxyXG59XHJcblxyXG4vKipcclxuICogcmV0dXJuIGEgbnVtYmVyIGJldHdlZW4gMCBhbmQgMSAoMCBpZiBhLCAxIGlmIGIsIC41IGlmIGhhbGZ3YXkgYmV0d2VlbilcclxuICogQHBhcmFtIGEgZmlyc3QgbnVtYmVyXHJcbiAqIEBwYXJhbSBiIHNlY29uZCBudW1iZXJcclxuICogQHBhcmFtIHggaW50ZXJwb2xhdGVkIHZhbHVlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdW5sZXJwKGE6IG51bWJlciwgYjogbnVtYmVyLCB4OiBudW1iZXIpIHtcclxuICAgIHJldHVybiBhID09IGIgPyAwIDogKHggLSBhKSAvIChiIC0gYSlcclxufVxyXG5cclxuLyoqXHJcbiAqIHJldHVybiB0aGUgbmV4dCBwb3dlciBvZiB0d28gb24gb3IgYWZ0ZXIgdGhlIHNwZWNpZmllZCBudW1iZXJcclxuICogaWYgdGhlIG51bWJlciBpcyBhbHJlYWR5IGEgcG93ZXIgb2YgMiBpdCBpcyByZXR1cm5lZFxyXG4gKiBAcGFyYW0geCBudW1iZXIgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbmV4dFBvdzIoeDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBNYXRoLnBvdygyLCBNYXRoLmNlaWwoTWF0aC5sb2cyKHgpKSlcclxufVxyXG5cclxuLyoqXHJcbiAqIHJldHVybiBweXRob24gc3R5bGUgbW9kdWxvIG9mIHggYW5kIHkgKG5lZ2F0aXZlIG1vZCByZXN1bHRzIGluIHBvc2l0aXZlIG51bWJlcilcclxuICogQHBhcmFtIHggbnVtYmVyXHJcbiAqIEBwYXJhbSB5IG51bWJlclxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG1vZCh4OiBudW1iZXIsIHk6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gKCh4ICUgeSkgKyB5KSAlIHk7XHJcbn0iXX0=