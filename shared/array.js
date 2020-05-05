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
/**
 * count the number of items in an iterable
 * @param a iterable
 */
export function count(a) {
    let r = 0;
    for (const _ of a) {
        ++r;
    }
    return r;
}
/**
 * count the number of items in an iterable that meet conditions in predicate
 * @param a iterable
 * @param f predicate
 */
export function countIf(a, f) {
    let r = 0;
    for (const x of a) {
        if (f(x)) {
            ++r;
        }
    }
    return r;
}
export function reduce(a, f, initialValue) {
    let value = initialValue;
    for (const x of a) {
        value = f(value, x);
    }
    return value;
}
/**
 * returns the first item in the iterable that satisfies the predicates
 * @param a iterable
 * @param f predicate function
 */
export function find(a, f) {
    for (const x of a) {
        if (f(x)) {
            return x;
        }
    }
    return null;
}
/**
 * yields only elements of a that satisfy the specified predicate
 * @param a iterable
 * @param f predicate
 */
export function* filter(a, f) {
    for (const x of a) {
        if (f(x)) {
            yield x;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyYXkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcnJheS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQTs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLFFBQVEsQ0FBQyxLQUFhLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUMvQyxJQUFJLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRTtRQUNmLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDZCxLQUFLLEdBQUcsQ0FBQyxDQUFBO0tBQ1o7SUFFRCxNQUFNLENBQUMsR0FBYSxFQUFFLENBQUE7SUFDdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQTtLQUNwQjtJQUVELE9BQU8sQ0FBQyxDQUFBO0FBQ1osQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsUUFBUSxDQUFJLE1BQWMsRUFBRSxDQUFtQjtJQUMzRCxNQUFNLENBQUMsR0FBUSxFQUFFLENBQUE7SUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQ2Y7SUFFRCxPQUFPLENBQUMsQ0FBQTtBQUNaLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLE9BQU8sQ0FBSSxLQUFRLEVBQUUsTUFBYztJQUMvQyxNQUFNLENBQUMsR0FBUSxFQUFFLENBQUE7SUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0tBQ2hCO0lBRUQsT0FBTyxD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QUFJLENBQUE7QUFDZixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFJLENBQWMsRUFBRSxDQUFvQjtJQUMzRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNmLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ04sTUFBTSxDQUFDLENBQUE7U0FDVjtLQUNKO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxyXG4vKipcclxuICogcmV0dXJucyBhbiBhcnJheSBvZiB0aGUgZm9ybSBbc3RhcnQuLmVuZCkgd2hlcmUgZW5kID0gc3RhcnQgKyBsZW5ndGggLSAxXHJcbiAqIEBwYXJhbSBzdGFydCBzdGFydCBudW1iZXIgb3IgbGVuZ3RoIGlmIG9ubHkgb25lIGFyZ3VtZW50IGlzIHByb3ZpZGVkXHJcbiAqIEBwYXJhbSBsZW5ndGggbGVuZ3RoIG9mIGFycmF5XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gc2VxdWVuY2Uoc3RhcnQ6IG51bWJlciwgbGVuZ3RoID0gLTEpOiBudW1iZXJbXSB7XHJcbiAgICBpZiAobGVuZ3RoID09PSAtMSkge1xyXG4gICAgICAgIGxlbmd0aCA9IHN0YXJ0XHJcbiAgICAgICAgc3RhcnQgPSAwXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYTogbnVtYmVyW10gPSBbXVxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGEucHVzaChpICsgc3RhcnQpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGFcclxufVxyXG5cclxuLyoqXHJcbiAqIGdlbmVyYXRlIGFuIGFycmF5IGdpdmVuIGl0J3MgbGVuZ3RoIGFuZCBhIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggaW5kZXhcclxuICogQHBhcmFtIGxlbmd0aCBsZW5ndGggb2YgYXJyYXlcclxuICogQHBhcmFtIGYgZnVuY3Rpb24gdG8gY2FsbCB3aXRoIGVhY2ggaW5kZXhcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZTxUPihsZW5ndGg6IG51bWJlciwgZjogKGk6IG51bWJlcikgPT4gVCkge1xyXG4gICAgY29uc3QgYTogVFtdID0gW11cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBhLnB1c2goZihpKSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYVxyXG59XHJcblxyXG4vKipcclxuICogcmV0dXJucyBhbiBhcnJheSBvZiB0aGUgc3BlY2lmaWVkIGxlbmd0aCBmaWxsZWQgd2l0aCB0aGUgc3BlY2lmaWVkIHZhbHVlXHJcbiAqIEBwYXJhbSB2YWx1ZSB2YWx1ZSB0byBmaWxsIGFycmF5IHdpdGhcclxuICogQHBhcmFtIGxlbmd0aCBsZW5ndGggb2YgYXJyYXlcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB1bmlmb3JtPFQ+KHZhbHVlOiBULCBsZW5ndGg6IG51bWJlcik6IFRbXSB7XHJcbiAgICBjb25zdCBhOiBUW10gPSBbXVxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGEucHVzaCh2YWx1ZSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYVxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIGxpc3Qgb2YgZGlzdGluY3QgdmFsdWVzIGZyb20gYVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGRpc3RpbmN0PFQ+KGE6IEl0ZXJhYmxlPFQ+KTogVFtdIHtcclxuICAgIHJldHVybiBbLi4ubmV3IFNldChhKV1cclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBsaXN0IG9mIHVuaXF1ZSB2YWx1ZXMgZnJvbSBhXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWFwRGlzdGluY3Q8VCwgVT4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBVKTogVVtdIHtcclxuICAgIHJldHVybiBkaXN0aW5jdChbLi4uYV0ubWFwKGYpKVxyXG59XHJcblxyXG4vKipcclxuICogdHJ1ZSBpZiBhbnkgaXRlbSBpbiB0aGUgaXRlcmFibGUgc2F0aXNmaWVzIHByZWRpY2F0ZVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gZiBwcmVkaWNhdGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhbnk8VD4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBib29sZWFuKTogYm9vbGVhbiB7XHJcbiAgICBmb3IgKGNvbnN0IHggb2YgYSkge1xyXG4gICAgICAgIGlmIChmKHgpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZVxyXG59XHJcblxyXG4vKipcclxuICogdHJ1ZSBpZiBhbGwgaXRlbXMgaW4gdGhlIGl0ZXJhYmxlIHNhdGlzZnkgcHJlZGljYXRlXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBmIHByZWRpY2F0ZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFsbDxUPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IGJvb2xlYW4pIHtcclxuICAgIGZvciAoY29uc3QgeCBvZiBhKSB7XHJcbiAgICAgICAgaWYgKCFmKHgpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG4vKipcclxuICogbWFwIGVhY2ggZWxlbWVudCBvZiBhIHRvIGFuIGVsZW1lbnQgaW4gYSBuZXcgYXJyYXlcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICogQHBhcmFtIGYgbWFwcGluZyBmdW5jdGlvbiB0byBleGVjdXRlIG9uIGVhY2ggZWxlbWVudFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG1hcDxULCBVPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IFUpOiBVW10ge1xyXG4gICAgY29uc3QgcjogVVtdID0gW11cclxuICAgIGZvciAoY29uc3QgeCBvZiBhKSB7XHJcbiAgICAgICAgci5wdXNoKGYoeCkpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJcclxufVxyXG5cclxuLyoqXHJcbiAqIHBvcCwgdGhyb3dpbmcgYW4gZXhjZXB0aW9uIGlmIHRoZSBhcnJheSBpcyBlbXB0eVxyXG4gKiBAcGFyYW0gYSBhcnJheSB3aXRoIGxlbmd0aCAxIG9yIGdyZWF0ZXJcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBwb3A8VD4oYTogVFtdKTogVCB7XHJcbiAgICBjb25zdCBlbGVtID0gYS5wb3AoKVxyXG4gICAgaWYgKGVsZW0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInBvcCByZXR1cm5lZCB1bmRlZmluZWQsIGFycmF5IG1heSBoYXZlIGJlZW4gZW1wdHlcIilcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZWxlbVxyXG59XHJcblxyXG4vKipcclxuICogY291bnQgdGhlIG51bWJlciBvZiBpdGVtcyBpbiBhbiBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50PFQ+KGE6IEl0ZXJhYmxlPFQ+KTogbnVtYmVyIHtcclxuICAgIGxldCByID0gMFxyXG4gICAgZm9yIChjb25zdCBfIG9mIGEpIHtcclxuICAgICAgICArK3JcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gclxyXG59XHJcblxyXG4vKipcclxuICogY291bnQgdGhlIG51bWJlciBvZiBpdGVtcyBpbiBhbiBpdGVyYWJsZSB0aGF0IG1lZXQgY29uZGl0aW9ucyBpbiBwcmVkaWNhdGVcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICogQHBhcmFtIGYgcHJlZGljYXRlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY291bnRJZjxUPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IGJvb2xlYW4pOiBudW1iZXIge1xyXG4gICAgbGV0IHIgPSAwXHJcbiAgICBmb3IgKGNvbnN0IHggb2YgYSkge1xyXG4gICAgICAgIGlmIChmKHgpKSB7XHJcbiAgICAgICAgICAgICsrclxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gclxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVkdWNlPFQsIFU+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAocHJldmlvdXNWYWx1ZTogVSwgY3VycmVudFZhbHVlOiBUKSA9PiBVLCBpbml0aWFsVmFsdWU6IFUpOiBVIHtcclxuICAgIGxldCB2YWx1ZSA9IGluaXRpYWxWYWx1ZVxyXG4gICAgZm9yIChjb25zdCB4IG9mIGEpIHtcclxuICAgICAgICB2YWx1ZSA9IGYodmFsdWUsIHgpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZhbHVlXHJcbn1cclxuXHJcbi8qKlxyXG4gKiByZXR1cm5zIHRoZSBmaXJzdCBpdGVtIGluIHRoZSBpdGVyYWJsZSB0aGF0IHNhdGlzZmllcyB0aGUgcHJlZGljYXRlc1xyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gZiBwcmVkaWNhdGUgZnVuY3Rpb25cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBmaW5kPFQ+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAoeDogVCkgPT4gYm9vbGVhbik6IChUIHwgbnVsbCkge1xyXG4gICAgZm9yIChjb25zdCB4IG9mIGEpIHtcclxuICAgICAgICBpZiAoZih4KSkge1xyXG4gICAgICAgICAgICByZXR1cm4geFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVsbFxyXG59XHJcblxyXG4vKipcclxuICogeWllbGRzIG9ubHkgZWxlbWVudHMgb2YgYSB0aGF0IHNhdGlzZnkgdGhlIHNwZWNpZmllZCBwcmVkaWNhdGVcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICogQHBhcmFtIGYgcHJlZGljYXRlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24qIGZpbHRlcjxUPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IGJvb2xlYW4pIHtcclxuICAgIGZvciAoY29uc3QgeCBvZiBhKSB7XHJcbiAgICAgICAgaWYgKGYoeCkpIHtcclxuICAgICAgICAgICAgeWllbGQgeFxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSJdfQ==