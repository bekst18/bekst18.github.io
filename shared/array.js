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
export function* map(a, f) {
    for (const x of a) {
        yield f(x);
    }
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
/**
 * sort an array in ascending order based on the value returned by f
 * @param a array
 * @param f value selection function
 */
export function orderBy(a, f) {
    return [...a].sort((x, y) => f(x) < f(y) ? -1 : 1);
}
/**
 * sort an array in descending order based on the value returned by f
 * @param a array
 * @param f value selection function
 */
export function orderByDesc(a, f) {
    return [...a].sort((x, y) => f(y) < f(x) ? -1 : 1);
}
/**
 * identity function, returns itself
 * @param x value
 */
export function identity(x) {
    return x;
}
/**
 * append an item to end of iterable
 * @param a iterable
 * @param x item to append
 */
export function* append(a, x) {
    for (const y of a) {
        yield y;
    }
    yield x;
}
/**
 * prepend an item to start of iterable
 * @param a iterable
 * @param x item to prepend
 */
export function* prepend(a, x) {
    yield x;
    for (const y of a) {
        yield y;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyYXkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcnJheS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQTs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLFFBQVEsQ0FBQyxLQUFhLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUMvQyxJQUFJLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRTtRQUNmLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDZCxLQUFLLEdBQUcsQ0FBQyxDQUFBO0tBQ1o7SUFFRCxNQUFNLENBQUMsR0FBYSxFQUFFLENBQUE7SUFDdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQTtLQUNwQjtJQUVELE9BQU8sQ0FBQyxDQUFBO0FBQ1osQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsUUFBUSxDQUFJLE1BQWMsRUFBRSxDQUFtQjtJQUMzRCxNQUFNLENBQUMsR0FBUSxFQUFFLENBQUE7SUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQ2Y7SUFFRCxPQUFPLENBQUMsQ0FBQTtBQUNaLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLE9BQU8sQ0FBSSxLQUFRLEVBQUUsTUFBYztJQUMvQyxNQUFNLENBQUMsR0FBUSxFQUFFLENBQUE7SUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0tBQ2hCO0lBRUQsT0FBTyxD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QWMsRUFBRSxDQUFJO0lBQzVDLE1BQU0sQ0FBQyxDQUFBO0lBRVAsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDZixNQUFNLENBQUMsQ0FBQTtLQUNWO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxyXG4vKipcclxuICogcmV0dXJucyBhbiBhcnJheSBvZiB0aGUgZm9ybSBbc3RhcnQuLmVuZCkgd2hlcmUgZW5kID0gc3RhcnQgKyBsZW5ndGggLSAxXHJcbiAqIEBwYXJhbSBzdGFydCBzdGFydCBudW1iZXIgb3IgbGVuZ3RoIGlmIG9ubHkgb25lIGFyZ3VtZW50IGlzIHByb3ZpZGVkXHJcbiAqIEBwYXJhbSBsZW5ndGggbGVuZ3RoIG9mIGFycmF5XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gc2VxdWVuY2Uoc3RhcnQ6IG51bWJlciwgbGVuZ3RoID0gLTEpOiBudW1iZXJbXSB7XHJcbiAgICBpZiAobGVuZ3RoID09PSAtMSkge1xyXG4gICAgICAgIGxlbmd0aCA9IHN0YXJ0XHJcbiAgICAgICAgc3RhcnQgPSAwXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYTogbnVtYmVyW10gPSBbXVxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGEucHVzaChpICsgc3RhcnQpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGFcclxufVxyXG5cclxuLyoqXHJcbiAqIGdlbmVyYXRlIGFuIGFycmF5IGdpdmVuIGl0J3MgbGVuZ3RoIGFuZCBhIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggaW5kZXhcclxuICogQHBhcmFtIGxlbmd0aCBsZW5ndGggb2YgYXJyYXlcclxuICogQHBhcmFtIGYgZnVuY3Rpb24gdG8gY2FsbCB3aXRoIGVhY2ggaW5kZXhcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZTxUPihsZW5ndGg6IG51bWJlciwgZjogKGk6IG51bWJlcikgPT4gVCkge1xyXG4gICAgY29uc3QgYTogVFtdID0gW11cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBhLnB1c2goZihpKSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYVxyXG59XHJcblxyXG4vKipcclxuICogcmV0dXJucyBhbiBhcnJheSBvZiB0aGUgc3BlY2lmaWVkIGxlbmd0aCBmaWxsZWQgd2l0aCB0aGUgc3BlY2lmaWVkIHZhbHVlXHJcbiAqIEBwYXJhbSB2YWx1ZSB2YWx1ZSB0byBmaWxsIGFycmF5IHdpdGhcclxuICogQHBhcmFtIGxlbmd0aCBsZW5ndGggb2YgYXJyYXlcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB1bmlmb3JtPFQ+KHZhbHVlOiBULCBsZW5ndGg6IG51bWJlcik6IFRbXSB7XHJcbiAgICBjb25zdCBhOiBUW10gPSBbXVxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGEucHVzaCh2YWx1ZSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYVxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIGxpc3Qgb2YgZGlzdGluY3QgdmFsdWVzIGZyb20gYVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGRpc3RpbmN0PFQ+KGE6IEl0ZXJhYmxlPFQ+KTogVFtdIHtcclxuICAgIHJldHVybiBbLi4ubmV3IFNldChhKV1cclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBsaXN0IG9mIHVuaXF1ZSB2YWx1ZXMgZnJvbSBhXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWFwRGlzdGluY3Q8VCwgVT4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBVKTogVVtdIHtcclxuICAgIHJldHVybiBkaXN0aW5jdChbLi4uYV0ubWFwKGYpKVxyXG59XHJcblxyXG4vKipcclxuICogdHJ1ZSBpZiBhbnkgaXRlbSBpbiB0aGUgaXRlcmFibGUgc2F0aXNmaWVzIHByZWRpY2F0ZVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gZiBwcmVkaWNhdGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhbnk8VD4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBib29sZWFuKTogYm9vbGVhbiB7XHJcbiAgICBmb3IgKGNvbnN0IHggb2YgYSkge1xyXG4gICAgICAgIGlmIChmKHgpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZVxyXG59XHJcblxyXG4vKipcclxuICogdHJ1ZSBpZiBhbGwgaXRlbXMgaW4gdGhlIGl0ZXJhYmxlIHNhdGlzZnkgcHJlZGljYXRlXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBmIHByZWRpY2F0ZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFsbDxUPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IGJvb2xlYW4pIHtcclxuICAgIGZvciAoY29uc3QgeCBvZiBhKSB7XHJcbiAgICAgICAgaWYgKCFmKHgpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG4vKipcclxuICogbWFwIGVhY2ggZWxlbWVudCBvZiBhIHRvIGFuIGVsZW1lbnQgaW4gYSBuZXcgYXJyYXlcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICogQHBhcmFtIGYgbWFwcGluZyBmdW5jdGlvbiB0byBleGVjdXRlIG9uIGVhY2ggZWxlbWVudFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uKiBtYXA8VCwgVT4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBVKTogSXRlcmFibGU8VT4ge1xyXG4gICAgZm9yIChjb25zdCB4IG9mIGEpIHtcclxuICAgICAgICB5aWVsZCBmKHgpXHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBwb3AsIHRocm93aW5nIGFuIGV4Y2VwdGlvbiBpZiB0aGUgYXJyYXkgaXMgZW1wdHlcclxuICogQHBhcmFtIGEgYXJyYXkgd2l0aCBsZW5ndGggMSBvciBncmVhdGVyXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcG9wPFQ+KGE6IFRbXSk6IFQge1xyXG4gICAgY29uc3QgZWxlbSA9IGEucG9wKClcclxuICAgIGlmIChlbGVtID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwb3AgcmV0dXJuZWQgdW5kZWZpbmVkLCBhcnJheSBtYXkgaGF2ZSBiZWVuIGVtcHR5XCIpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGVsZW1cclxufVxyXG5cclxuLyoqXHJcbiAqIGNvdW50IHRoZSBudW1iZXIgb2YgaXRlbXMgaW4gYW4gaXRlcmFibGVcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjb3VudDxUPihhOiBJdGVyYWJsZTxUPik6IG51bWJlciB7XHJcbiAgICBsZXQgciA9IDBcclxuICAgIGZvciAoY29uc3QgXyBvZiBhKSB7XHJcbiAgICAgICAgKytyXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJcclxufVxyXG5cclxuLyoqXHJcbiAqIGNvdW50IHRoZSBudW1iZXIgb2YgaXRlbXMgaW4gYW4gaXRlcmFibGUgdGhhdCBtZWV0IGNvbmRpdGlvbnMgaW4gcHJlZGljYXRlXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBmIHByZWRpY2F0ZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50SWY8VD4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBib29sZWFuKTogbnVtYmVyIHtcclxuICAgIGxldCByID0gMFxyXG4gICAgZm9yIChjb25zdCB4IG9mIGEpIHtcclxuICAgICAgICBpZiAoZih4KSkge1xyXG4gICAgICAgICAgICArK3JcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlZHVjZTxULCBVPihhOiBJdGVyYWJsZTxUPiwgZjogKHByZXZpb3VzVmFsdWU6IFUsIGN1cnJlbnRWYWx1ZTogVCkgPT4gVSwgaW5pdGlhbFZhbHVlOiBVKTogVSB7XHJcbiAgICBsZXQgdmFsdWUgPSBpbml0aWFsVmFsdWVcclxuICAgIGZvciAoY29uc3QgeCBvZiBhKSB7XHJcbiAgICAgICAgdmFsdWUgPSBmKHZhbHVlLCB4KVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2YWx1ZVxyXG59XHJcblxyXG4vKipcclxuICogcmV0dXJucyB0aGUgZmlyc3QgaXRlbSBpbiB0aGUgaXRlcmFibGUgdGhhdCBzYXRpc2ZpZXMgdGhlIHByZWRpY2F0ZXNcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICogQHBhcmFtIGYgcHJlZGljYXRlIGZ1bmN0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmluZDxUPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IGJvb2xlYW4pOiAoVCB8IG51bGwpIHtcclxuICAgIGZvciAoY29uc3QgeCBvZiBhKSB7XHJcbiAgICAgICAgaWYgKGYoeCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHhcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51bGxcclxufVxyXG5cclxuLyoqXHJcbiAqIHlpZWxkcyBvbmx5IGVsZW1lbnRzIG9mIGEgdGhhdCBzYXRpc2Z5IHRoZSBzcGVjaWZpZWQgcHJlZGljYXRlXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBmIHByZWRpY2F0ZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uKiBmaWx0ZXI8VD4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBib29sZWFuKSB7XHJcbiAgICBmb3IgKGNvbnN0IHggb2YgYSkge1xyXG4gICAgICAgIGlmIChmKHgpKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHhcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBzb3J0IGFuIGFycmF5IGluIGFzY2VuZGluZyBvcmRlciBiYXNlZCBvbiB0aGUgdmFsdWUgcmV0dXJuZWQgYnkgZlxyXG4gKiBAcGFyYW0gYSBhcnJheVxyXG4gKiBAcGFyYW0gZiB2YWx1ZSBzZWxlY3Rpb24gZnVuY3Rpb25cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBvcmRlckJ5PFQsIFU+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAoeDogVCkgPT4gVSk6IEFycmF5PFQ+IHtcclxuICAgIHJldHVybiBbLi4uYV0uc29ydCgoeCwgeSkgPT4gZih4KSA8IGYoeSkgPyAtMSA6IDEpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBzb3J0IGFuIGFycmF5IGluIGRlc2NlbmRpbmcgb3JkZXIgYmFzZWQgb24gdGhlIHZhbHVlIHJldHVybmVkIGJ5IGZcclxuICogQHBhcmFtIGEgYXJyYXlcclxuICogQHBhcmFtIGYgdmFsdWUgc2VsZWN0aW9uIGZ1bmN0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gb3JkZXJCeURlc2M8VCwgVT4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBVKTogQXJyYXk8VD4ge1xyXG4gICAgcmV0dXJuIFsuLi5hXS5zb3J0KCh4LCB5KSA9PiBmKHkpIDwgZih4KSA/IC0xIDogMSlcclxufVxyXG5cclxuLyoqXHJcbiAqIGlkZW50aXR5IGZ1bmN0aW9uLCByZXR1cm5zIGl0c2VsZlxyXG4gKiBAcGFyYW0geCB2YWx1ZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlkZW50aXR5PFQ+KHg6IFQpOiBUIHtcclxuICAgIHJldHVybiB4XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBhcHBlbmQgYW4gaXRlbSB0byBlbmQgb2YgaXRlcmFibGVcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICogQHBhcmFtIHggaXRlbSB0byBhcHBlbmRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiogYXBwZW5kPFQ+KGE6IEl0ZXJhYmxlPFQ+LCB4OiBUKTogR2VuZXJhdG9yPFQ+IHtcclxuICAgIGZvciAoY29uc3QgeSBvZiBhKSB7XHJcbiAgICAgICAgeWllbGQgeVxyXG4gICAgfVxyXG5cclxuICAgIHlpZWxkIHhcclxufVxyXG5cclxuLyoqXHJcbiAqIHByZXBlbmQgYW4gaXRlbSB0byBzdGFydCBvZiBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKiBAcGFyYW0geCBpdGVtIHRvIHByZXBlbmRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiogcHJlcGVuZDxUPihhOiBJdGVyYWJsZTxUPiwgeDogVCk6IEdlbmVyYXRvcjxUPiB7XHJcbiAgICB5aWVsZCB4XHJcblxyXG4gICAgZm9yIChjb25zdCB5IG9mIGEpIHtcclxuICAgICAgICB5aWVsZCB5XHJcbiAgICB9XHJcbn0iXX0=