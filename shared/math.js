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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hdGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFFSDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxLQUFLLENBQUMsQ0FBUyxFQUFFLEdBQVcsRUFBRSxHQUFXO0lBQ3JELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtBQUMxQyxDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsSUFBSSxDQUFDLENBQVMsRUFBRSxDQUFTLEVBQUUsQ0FBUztJQUNoRCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDMUIsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLE1BQU0sQ0FBQyxDQUFTLEVBQUUsQ0FBUyxFQUFFLENBQVM7SUFDbEQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBQ3pDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogbWF0aCB1dGlsaXR5IGxpYnJhcnlcclxuICovXHJcblxyXG4vKipcclxuICogY2xhbXAgeCBzdWNoIHRoYXQgaXQgaXMgaW4gdGhlIGludGVydmFsIFttaW4sIG1heF1cclxuICogQHBhcmFtIHggdmFsdWUgdG8gY2xhbXBcclxuICogQHBhcmFtIG1pbiBtaW5pbXVtIHZhbHVlXHJcbiAqIEBwYXJhbSBtYXggbWF4aW11bSB2YXVsZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNsYW1wKHg6IG51bWJlciwgbWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBNYXRoLm1pbihNYXRoLm1heCh4LCBtaW4pLCBtYXgpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMaW5lYXJseSBpbnRlcnBvbGF0ZSBiZXR3ZWVuIDIgdmFsdWVzXHJcbiAqIEBwYXJhbSBhIGZpcnN0IG51bWJlclxyXG4gKiBAcGFyYW0gYiBzZWNvbmQgbnVtYmVyXHJcbiAqIEBwYXJhbSB0IGludGVycG9sYXRpb24gZmFjdG9yICgwID0gYSwgMSA9IGIsIC41ID0gaGFsZndheSBiZXR3ZWVuIGEgYW5kIGIpXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbGVycChhOiBudW1iZXIsIGI6IG51bWJlciwgdDogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gYSArIChiIC0gYSkgKiB0XHJcbn1cclxuXHJcbi8qKlxyXG4gKiByZXR1cm4gYSBudW1iZXIgYmV0d2VlbiAwIGFuZCAxICgwIGlmIGEsIDEgaWYgYiwgLjUgaWYgaGFsZndheSBiZXR3ZWVuKVxyXG4gKiBAcGFyYW0gYSBmaXJzdCBudW1iZXJcclxuICogQHBhcmFtIGIgc2Vjb25kIG51bWJlclxyXG4gKiBAcGFyYW0geCBpbnRlcnBvbGF0ZWQgdmFsdWVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB1bmxlcnAoYTogbnVtYmVyLCBiOiBudW1iZXIsIHg6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIGEgPT0gYiA/IDAgOiAoeCAtIGEpIC8gKGIgLSBhKVxyXG59Il19