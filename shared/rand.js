/**
 * choose a uniform random float from interval [min, max)
 * @param min min value to return
 * @param max max value to return
 */
export function float(min, max) {
    const range = max - min;
    return Math.random() * range + min;
}
/**
 * choose a uniform random integer from interval [min, max)
 * @param min
 * @param max
 */
export function int(min, max) {
    return Math.floor(float(min, max));
}
/**
 * choose a random element from the specified array
 * @param list array-like object to select a random element from
 */
export function choose(a) {
    const idx = int(0, a.length);
    return a[idx];
}
/**
 * randomly shuffle the specified array in place
 * @param a array to shuffle
 */
export function shuffle(a) {
    for (let i = a.length - 1; i >= 0; --i) {
        const j = Math.floor(Math.random() * i);
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
export function chance(x) {
    return Math.random() < x;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJhbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxLQUFLLENBQUMsR0FBVyxFQUFFLEdBQVc7SUFDMUMsTUFBTSxLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUN4QixPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFBO0FBQ3RDLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLEdBQUcsQ0FBQyxHQUFXLEVBQUUsR0FBVztJQUN4QyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBQ3RDLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsTUFBTSxDQUFJLENBQWU7SUFDckMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDNUIsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDakIsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxPQUFPLENBQUksQ0FBVztJQUNsQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUU7UUFDcEMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFBO0tBQ2I7SUFFRCxPQUFPLENBQUMsQ0FBQTtBQUNaLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsTUFBTSxDQUFDLENBQVM7SUFDNUIsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0FBQzVCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogY2hvb3NlIGEgdW5pZm9ybSByYW5kb20gZmxvYXQgZnJvbSBpbnRlcnZhbCBbbWluLCBtYXgpXHJcbiAqIEBwYXJhbSBtaW4gbWluIHZhbHVlIHRvIHJldHVyblxyXG4gKiBAcGFyYW0gbWF4IG1heCB2YWx1ZSB0byByZXR1cm5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBmbG9hdChtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgY29uc3QgcmFuZ2UgPSBtYXggLSBtaW47XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIHJhbmdlICsgbWluXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjaG9vc2UgYSB1bmlmb3JtIHJhbmRvbSBpbnRlZ2VyIGZyb20gaW50ZXJ2YWwgW21pbiwgbWF4KVxyXG4gKiBAcGFyYW0gbWluIFxyXG4gKiBAcGFyYW0gbWF4IFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGludChtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoZmxvYXQobWluLCBtYXgpKVxyXG59XHJcblxyXG4vKipcclxuICogY2hvb3NlIGEgcmFuZG9tIGVsZW1lbnQgZnJvbSB0aGUgc3BlY2lmaWVkIGFycmF5XHJcbiAqIEBwYXJhbSBsaXN0IGFycmF5LWxpa2Ugb2JqZWN0IHRvIHNlbGVjdCBhIHJhbmRvbSBlbGVtZW50IGZyb21cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjaG9vc2U8VD4oYTogQXJyYXlMaWtlPFQ+KSB7XHJcbiAgICBjb25zdCBpZHggPSBpbnQoMCwgYS5sZW5ndGgpXHJcbiAgICByZXR1cm4gYVtpZHhdXHJcbn1cclxuXHJcbi8qKlxyXG4gKiByYW5kb21seSBzaHVmZmxlIHRoZSBzcGVjaWZpZWQgYXJyYXkgaW4gcGxhY2VcclxuICogQHBhcmFtIGEgYXJyYXkgdG8gc2h1ZmZsZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGU8VD4oYTogQXJyYXk8VD4pIDogQXJyYXk8VD57XHJcbiAgICBmb3IgKGxldCBpID0gYS5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xyXG4gICAgICAgIGNvbnN0IGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBpKVxyXG4gICAgICAgIGNvbnN0IHRtcCA9IGFbaV1cclxuICAgICAgICBhW2ldID0gYVtqXVxyXG4gICAgICAgIGFbal0gPSB0bXBcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYVxyXG59XHJcblxyXG4vKipcclxuICogcmV0dXJucyB0cnVlIHglIG9mIHRoZSB0aW1lXHJcbiAqIEBwYXJhbSB4IHRydWUgY2hhbmNlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY2hhbmNlKHg6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgPCB4XHJcbn0iXX0=