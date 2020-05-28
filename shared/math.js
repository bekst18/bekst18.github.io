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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hdGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFFSDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxLQUFLLENBQUMsQ0FBUyxFQUFFLEdBQVcsRUFBRSxHQUFXO0lBQ3JELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtBQUMxQyxDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsSUFBSSxDQUFDLENBQVMsRUFBRSxDQUFTLEVBQUUsQ0FBUztJQUNoRCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDMUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBtYXRoIHV0aWxpdHkgbGlicmFyeVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBjbGFtcCB4IHN1Y2ggdGhhdCBpdCBpcyBpbiB0aGUgaW50ZXJ2YWwgW21pbiwgbWF4XVxyXG4gKiBAcGFyYW0geCB2YWx1ZSB0byBjbGFtcFxyXG4gKiBAcGFyYW0gbWluIG1pbmltdW0gdmFsdWVcclxuICogQHBhcmFtIG1heCBtYXhpbXVtIHZhdWxlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY2xhbXAoeDogbnVtYmVyLCBtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIE1hdGgubWluKE1hdGgubWF4KHgsIG1pbiksIG1heClcclxufVxyXG5cclxuLyoqXHJcbiAqIExpbmVhcmx5IGludGVycG9sYXRlIGJldHdlZW4gMiB2YWx1ZXNcclxuICogQHBhcmFtIGEgZmlyc3QgbnVtYmVyXHJcbiAqIEBwYXJhbSBiIHNlY29uZCBudW1iZXJcclxuICogQHBhcmFtIHQgaW50ZXJwb2xhdGlvbiBmYWN0b3IgKDAgPSBhLCAxID0gYiwgLjUgPSBoYWxmd2F5IGJldHdlZW4gYSBhbmQgYilcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsZXJwKGE6IG51bWJlciwgYjogbnVtYmVyLCB0OiBudW1iZXIpIHtcclxuICAgIHJldHVybiBhICsgKGIgLSBhKSAqIHRcclxufSJdfQ==