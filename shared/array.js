/**
 * returns an array of the form [start..end) where end = start + length - 1
 * @param start start number or length if only one argument is provided
 * @param length length of array
 */
export function sequence(start, length = -1) {
    if (length === -1) {
        length = start;
        start = 0;
    }
    const a = [];
    for (let i = 0; i < length; ++i) {
        a.push(i + start);
    }
    return a;
}
/**
 * generate an array given it's length and a function to call for each index
 * @param length length of array
 * @param f function to call with each index
 */
export function generate(length, f) {
    const a = [];
    for (let i = 0; i < length; ++i) {
        a.push(f(i));
    }
    return a;
}
/**
 * returns an array of the specified length filled with the specified value
 * @param value value to fill array with
 * @param length length of array
 */
export function uniform(value, length) {
    const a = [];
    for (let i = 0; i < length; ++i) {
        a.push(value);
    }
    return a;
}
/**
 * Creates a list of distinct values from a
 * @param a iterable
 */
export function distinct(a) {
    return [...new Set(a)];
}
/**
 * Creates a list of unique values from a
 * @param a iterable
 */
export function mapDistinct(a, f) {
    return distinct([...a].map(f));
}
/**
 * true if any item in the iterable satisfies predicate
 * @param a iterable
 * @param f predicate
 */
export function any(a, f) {
    for (const x of a) {
        if (f(x)) {
            return true;
        }
    }
    return false;
}
/**
 * true if all items in the iterable satisfy predicate
 * @param a iterable
 * @param f predicate
 */
export function all(a, f) {
    for (const x of a) {
        if (!f(x)) {
            return false;
        }
    }
    return true;
}
/**
 * map each element of a to an element in a new array
 * @param a iterable
 * @param f mapping function to execute on each element
 */
export function map(a, f) {
    const r = [];
    for (const x of a) {
        r.push(f(x));
    }
    return r;
}
/**
 * pop, throwing an exception if the array is empty
 * @param a array with length 1 or greater
 */
export function pop(a) {
    const elem = a.pop();
    if (elem === undefined) {
        throw new Error("pop returned undefined, array may have been empty");
    }
    return elem;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyYXkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcnJheS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQTs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLFFBQVEsQ0FBQyxLQUFhLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUMvQyxJQUFJLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRTtRQUNmLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDZCxLQUFLLEdBQUcsQ0FBQyxDQUFBO0tBQ1o7SUFFRCxNQUFNLENBQUMsR0FBYSxFQUFFLENBQUE7SUFDdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQTtLQUNwQjtJQUVELE9BQU8sQ0FBQyxDQUFBO0FBQ1osQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsUUFBUSxDQUFJLE1BQWMsRUFBRSxDQUFtQjtJQUMzRCxNQUFNLENBQUMsR0FBUSxFQUFFLENBQUE7SUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQ2Y7SUFFRCxPQUFPLENBQUMsQ0FBQTtBQUNaLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLE9BQU8sQ0FBSSxLQUFRLEVBQUUsTUFBYztJQUMvQyxNQUFNLENBQUMsR0FBUSxFQUFFLENBQUE7SUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0tBQ2hCO0lBRUQsT0FBTyxDQUFDLENBQUE7QUFDWixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLFFBQVEsQ0FBSSxDQUFjO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDMUIsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxXQUFXLENBQU8sQ0FBYyxFQUFFLENBQWM7SUFDNUQsT0FBTyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ2xDLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLEdBQUcsQ0FBSSxDQUFjLEVBQUUsQ0FBb0I7SUFDdkQsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDZixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNOLE9BQU8sSUFBSSxDQUFBO1NBQ2Q7S0FDSjtJQUVELE9BQU8sS0FBSyxDQUFBO0FBQ2hCLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLEdBQUcsQ0FBSSxDQUFjLEVBQUUsQ0FBb0I7SUFDdkQsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDZixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ1AsT0FBTyxLQUFLLENBQUE7U0FDZjtLQUNKO0lBRUQsT0FBTyxJQUFJLENBQUE7QUFDZixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxHQUFHLENBQU8sQ0FBYyxFQUFFLENBQWM7SUFDcEQsTUFBTSxDQUFDLEdBQVEsRUFBRSxDQUFBO0lBQ2pCLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ2YsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUNmO0lBRUQsT0FBTyxDQUFDLENBQUE7QUFDWixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLEdBQUcsQ0FBSSxDQUFNO0lBQ3pCLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtJQUNwQixJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7UUFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxtREFBbUQsQ0FBQyxDQUFBO0tBQ3ZFO0lBRUQsT0FBTyxJQUFJLENBQUE7QUFDZixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXHJcbi8qKlxyXG4gKiByZXR1cm5zIGFuIGFycmF5IG9mIHRoZSBmb3JtIFtzdGFydC4uZW5kKSB3aGVyZSBlbmQgPSBzdGFydCArIGxlbmd0aCAtIDFcclxuICogQHBhcmFtIHN0YXJ0IHN0YXJ0IG51bWJlciBvciBsZW5ndGggaWYgb25seSBvbmUgYXJndW1lbnQgaXMgcHJvdmlkZWRcclxuICogQHBhcmFtIGxlbmd0aCBsZW5ndGggb2YgYXJyYXlcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXF1ZW5jZShzdGFydDogbnVtYmVyLCBsZW5ndGggPSAtMSk6IG51bWJlcltdIHtcclxuICAgIGlmIChsZW5ndGggPT09IC0xKSB7XHJcbiAgICAgICAgbGVuZ3RoID0gc3RhcnRcclxuICAgICAgICBzdGFydCA9IDBcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBhOiBudW1iZXJbXSA9IFtdXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgYS5wdXNoKGkgKyBzdGFydClcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYVxyXG59XHJcblxyXG4vKipcclxuICogZ2VuZXJhdGUgYW4gYXJyYXkgZ2l2ZW4gaXQncyBsZW5ndGggYW5kIGEgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBpbmRleFxyXG4gKiBAcGFyYW0gbGVuZ3RoIGxlbmd0aCBvZiBhcnJheVxyXG4gKiBAcGFyYW0gZiBmdW5jdGlvbiB0byBjYWxsIHdpdGggZWFjaCBpbmRleFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlPFQ+KGxlbmd0aDogbnVtYmVyLCBmOiAoaTogbnVtYmVyKSA9PiBUKSB7XHJcbiAgICBjb25zdCBhOiBUW10gPSBbXVxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGEucHVzaChmKGkpKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhXHJcbn1cclxuXHJcbi8qKlxyXG4gKiByZXR1cm5zIGFuIGFycmF5IG9mIHRoZSBzcGVjaWZpZWQgbGVuZ3RoIGZpbGxlZCB3aXRoIHRoZSBzcGVjaWZpZWQgdmFsdWVcclxuICogQHBhcmFtIHZhbHVlIHZhbHVlIHRvIGZpbGwgYXJyYXkgd2l0aFxyXG4gKiBAcGFyYW0gbGVuZ3RoIGxlbmd0aCBvZiBhcnJheVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHVuaWZvcm08VD4odmFsdWU6IFQsIGxlbmd0aDogbnVtYmVyKTogVFtdIHtcclxuICAgIGNvbnN0IGE6IFRbXSA9IFtdXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgYS5wdXNoKHZhbHVlKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbGlzdCBvZiBkaXN0aW5jdCB2YWx1ZXMgZnJvbSBhXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZGlzdGluY3Q8VD4oYTogSXRlcmFibGU8VD4pOiBUW10ge1xyXG4gICAgcmV0dXJuIFsuLi5uZXcgU2V0KGEpXVxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIGxpc3Qgb2YgdW5pcXVlIHZhbHVlcyBmcm9tIGFcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXBEaXN0aW5jdDxULCBVPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IFUpOiBVW10ge1xyXG4gICAgcmV0dXJuIGRpc3RpbmN0KFsuLi5hXS5tYXAoZikpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiB0cnVlIGlmIGFueSBpdGVtIGluIHRoZSBpdGVyYWJsZSBzYXRpc2ZpZXMgcHJlZGljYXRlXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBmIHByZWRpY2F0ZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFueTxUPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IGJvb2xlYW4pOiBib29sZWFuIHtcclxuICAgIGZvciAoY29uc3QgeCBvZiBhKSB7XHJcbiAgICAgICAgaWYgKGYoeCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlXHJcbn1cclxuXHJcbi8qKlxyXG4gKiB0cnVlIGlmIGFsbCBpdGVtcyBpbiB0aGUgaXRlcmFibGUgc2F0aXNmeSBwcmVkaWNhdGVcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICogQHBhcmFtIGYgcHJlZGljYXRlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYWxsPFQ+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAoeDogVCkgPT4gYm9vbGVhbikge1xyXG4gICAgZm9yIChjb25zdCB4IG9mIGEpIHtcclxuICAgICAgICBpZiAoIWYoeCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBtYXAgZWFjaCBlbGVtZW50IG9mIGEgdG8gYW4gZWxlbWVudCBpbiBhIG5ldyBhcnJheVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gZiBtYXBwaW5nIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgb24gZWFjaCBlbGVtZW50XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWFwPFQsIFU+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAoeDogVCkgPT4gVSk6IFVbXSB7XHJcbiAgICBjb25zdCByOiBVW10gPSBbXVxyXG4gICAgZm9yIChjb25zdCB4IG9mIGEpIHtcclxuICAgICAgICByLnB1c2goZih4KSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gclxyXG59XHJcblxyXG4vKipcclxuICogcG9wLCB0aHJvd2luZyBhbiBleGNlcHRpb24gaWYgdGhlIGFycmF5IGlzIGVtcHR5XHJcbiAqIEBwYXJhbSBhIGFycmF5IHdpdGggbGVuZ3RoIDEgb3IgZ3JlYXRlclxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHBvcDxUPihhOiBUW10pOiBUIHtcclxuICAgIGNvbnN0IGVsZW0gPSBhLnBvcCgpXHJcbiAgICBpZiAoZWxlbSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwicG9wIHJldHVybmVkIHVuZGVmaW5lZCwgYXJyYXkgbWF5IGhhdmUgYmVlbiBlbXB0eVwiKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBlbGVtXHJcbn0iXX0=