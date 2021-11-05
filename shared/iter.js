/**
 * utility functions for iterables
 */
class Iter {
    constructor(a) {
        this.a = a;
    }
    /**
     * iterate over all data in grid
     */
    *[Symbol.iterator]() {
        for (const x of this.a) {
            yield x;
        }
    }
    each(f) {
        each(this.a, f);
        return this;
    }
    distinct() {
        return new Iter(distinct(this.a));
    }
    any(f) {
        return any(this.a, f);
    }
    all(f) {
        return all(this.a, f);
    }
    prepend(x) {
        return new Iter(prepend(this.a, x));
    }
    append(x) {
        return new Iter(append(this.a, x));
    }
    map(f) {
        return new Iter(map(this.a, f));
    }
    mapDistinct(f) {
        return new Iter(mapDistinct(this.a, f));
    }
    /**
     * count the number of items in an iterable
     */
    count() {
        return count(this.a);
    }
    /**
     * count the number of items in an iterable
     */
    countDistinct() {
        return countDistinct(this.a);
    }
    /**
     * count the number of items in an iterable that meet conditions in predicate
     * @param f predicate
     */
    countIf(f) {
        return countIf(this.a, f);
    }
    /**
     * Filter an iterable based on a predicat
     * Keeps all elements for which predicate returns true
     * @param f predicate to filter with
     */
    filter(f) {
        return new Iter(filter(this.a, f));
    }
    /**
     * accumulate the results of a function across an iterable
     * @param a array to reduce
     * @param f reduction function
     * @param initialValue initial value
     */
    reduce(f, initialValue) {
        return reduce(this.a, f, initialValue);
    }
    /**
     * returns the first item in the iterable that satisfies the predicate
     * @param a iterable
     * @param f predicate function
     */
    find(f) {
        return find(this.a, f);
    }
    /**
     * yield the first n items in an iterable
     * if there are more than n items, all items are kept
     */
    take(n) {
        return take(this.a, n);
    }
    /**
     * drop the last n items from an iterable
     * if there are less than n items, none are yielded
     */
    drop(n) {
        return drop(this.a, n);
    }
    /**
    * sort an array in ascending order based on the value returned by f
    * @param f value selection function
    */
    orderBy(f) {
        return new Iter([...this.a].sort((x, y) => f(x) < f(y) ? -1 : 1));
    }
    /**
     * sort an array in descending order based on the value returned by f
     * @param f value selection function
     */
    orderByDesc(f) {
        return new Iter([...this.a].sort((x, y) => f(y) < f(x) ? -1 : 1));
    }
    /**
     * concatenate iterables, yielding all elements of each
    */
    cat(...as) {
        return cat(this.a, ...as);
    }
    /**
     * convert to an array
     */
    toArray() {
        return [...this.a];
    }
    /**
     * returns the first element in the sequence, throwing an exception if empty
     */
    first() {
        return first(this.a);
    }
}
/**
 * invoke a function on every element of the iterable
 * @param a iterable
 * @param f function
 */
export function each(a, f) {
    for (const x of a) {
        f(x);
    }
}
/**
 * wraps the iterable type with Iter for easy chained calls
 * @param a iterable to wrap
 */
export function wrap(a) {
    return new Iter(a);
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
/**
 * identity function, returns itself
 * @param x value
 */
export function identity(x) {
    return x;
}
/**
 * Creates a list of distinct values from a - does NOT preserve order
 * @param a iterable
 */
export function distinct(a) {
    return new Set(a);
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
 * Creates a list of unique values from a, then invokes map function for each
 * @param a iterable
 */
export function mapDistinct(a, f) {
    return map(distinct(a), f);
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
 * count the number of items in an iterable
 * @param a iterable
 */
export function countDistinct(a) {
    return count(distinct(a));
}
/**
 * count the number of items in an iterable that meet conditions in predicate
 * @param a iterable
 * @param f predicate
 */
export function countIf(a, f) {
    return count(filter(a, f));
}
/**
 * predicate to test javascript truthiness
 * @param x value to test for truthiness
 */
export function truthy(x) {
    return x ? true : false;
}
/**
 * Filter an iterable based on a predicat
 * Keeps all elements for which predicate returns true
 * @param a iterable to filtere
 * @param f predicate to filter with
 */
export function* filter(a, f = truthy) {
    for (const x of a) {
        if (f(x)) {
            yield x;
        }
    }
}
/**
 * accumulate the results of a function across an iterable
 * @param a array to reduce
 * @param f reduction function
 * @param initialValue initial value
 */
export function reduce(a, f, initialValue) {
    let value = initialValue;
    for (const x of a) {
        value = f(value, x);
    }
    return value;
}
/**
 * returns the first item in the iterable that satisfies the predicate
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
 * yield the first n items in an iterable
 * if there are more than n items, all items are kept
 */
export function* take(a, n) {
    let i = 0;
    for (const x of a) {
        if (i >= n) {
            break;
        }
        yield x;
        ++i;
    }
}
/**
 * drop the last n items from an iterable
 * if there are less than n items, none are yielded
 */
export function drop(a, n) {
    const size = count(a);
    return take(a, size - n);
}
/**
 * yield numbers of the form [start..end) where end = start + length - 1
 * @param start start number or length if only one argument is provided
 * @param length length of array
 */
export function* sequence(start, length = -1) {
    if (length === -1) {
        length = start;
        start = 0;
    }
    for (let i = 0; i < length; ++i) {
        yield i;
    }
}
/**
 * yield elements given a length and a function to call for each index
 * @param length length of generated sequence
 * @param f function to call with each index
 */
export function generate(length, f) {
    return map(sequence(length), f);
}
/**
 * sort an iterable in ascending order based on the value returned by f
 * @param a array
 * @param f value selection function
 */
export function orderBy(a, f) {
    return [...a].sort((x, y) => f(x) < f(y) ? -1 : 1);
}
/**
 * sort an iterable in descending order based on the value returned by f
 * @param a array
 * @param f value selection function
 */
export function orderByDesc(a, f) {
    return [...a].sort((x, y) => f(y) < f(x) ? -1 : 1);
}
/**
 * concatenate iterables, yielding all elements of each
 */
export function* cat(...as) {
    for (const a of as) {
        yield* a;
    }
}
/**
 * returns the first element in an iterable sequence.
 * an exception is thrown if sequence contains no elements.
 * @param as iterable sequence
 * @returns first element in sequence
 */
export function first(as) {
    for (const x of as) {
        return x;
    }
    throw new Error("Sequence contained no elements.");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIml0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFFSCxNQUFNLElBQUk7SUFDTixZQUE2QixDQUFjO1FBQWQsTUFBQyxHQUFELENBQUMsQ0FBYTtJQUFJLENBQUM7SUFFaEQ7O09BRUc7SUFDSCxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNkLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRTtZQUNwQixNQUFNLENBQUMsQ0FBQTtTQUNWO0lBQ0wsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFpQjtRQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNmLE9BQU8sSUFBSSxDQUFBO0lBQ2YsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQW9CO1FBQ3BCLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFvQjtRQUNwQixPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFFRCxPQUFPLENBQUMsQ0FBSTtRQUNSLE9BQU8sSUFBSSxJQUFJLENBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsTUFBTSxDQUFDLENBQUk7UUFDUCxPQUFPLElBQUksSUFBSSxDQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVELEdBQUcsQ0FBSSxDQUFjO1FBQ2pCLE9B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QUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUN0RCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBSSxHQUFHLEVBQWlCO0lBQ3hDLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ2hCLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUNYO0FBQ0wsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLEtBQUssQ0FBSSxFQUFlO0lBQ3BDLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ2hCLE9BQU8sQ0FBQyxDQUFBO0tBQ1g7SUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7QUFDdEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiB1dGlsaXR5IGZ1bmN0aW9ucyBmb3IgaXRlcmFibGVzXHJcbiAqL1xyXG5cclxuY2xhc3MgSXRlcjxUPiB7XHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGE6IEl0ZXJhYmxlPFQ+KSB7IH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGl0ZXJhdGUgb3ZlciBhbGwgZGF0YSBpbiBncmlkXHJcbiAgICAgKi9cclxuICAgICpbU3ltYm9sLml0ZXJhdG9yXSgpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IHggb2YgdGhpcy5hKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHhcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZWFjaChmOiAoeDogVCkgPT4gdm9pZCkge1xyXG4gICAgICAgIGVhY2godGhpcy5hLCBmKVxyXG4gICAgICAgIHJldHVybiB0aGlzXHJcbiAgICB9XHJcblxyXG4gICAgZGlzdGluY3QoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJdGVyKGRpc3RpbmN0KHRoaXMuYSkpXHJcbiAgICB9XHJcblxyXG4gICAgYW55KGY6ICh4OiBUKSA9PiBib29sZWFuKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIGFueSh0aGlzLmEsIGYpXHJcbiAgICB9XHJcblxyXG4gICAgYWxsKGY6ICh4OiBUKSA9PiBib29sZWFuKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIGFsbCh0aGlzLmEsIGYpXHJcbiAgICB9XHJcblxyXG4gICAgcHJlcGVuZCh4OiBUKTogSXRlcjxUPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJdGVyPFQ+KHByZXBlbmQodGhpcy5hLCB4KSlcclxuICAgIH1cclxuXHJcbiAgICBhcHBlbmQoeDogVCk6IEl0ZXI8VD4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgSXRlcjxUPihhcHBlbmQodGhpcy5hLCB4KSlcclxuICAgIH1cclxuXHJcbiAgICBtYXA8VT4oZjogKHg6IFQpID0+IFUpOiBJdGVyPFU+IHtcclxuICAgICAgICByZXR1cm4gbmV3IEl0ZXI8VT4obWFwKHRoaXMuYSwgZikpXHJcbiAgICB9XHJcblxyXG4gICAgbWFwRGlzdGluY3Q8VT4oZjogKHg6IFQpID0+IFUpOiBJdGVyPFU+IHtcclxuICAgICAgICByZXR1cm4gbmV3IEl0ZXI8VT4obWFwRGlzdGluY3QodGhpcy5hLCBmKSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNvdW50IHRoZSBudW1iZXIgb2YgaXRlbXMgaW4gYW4gaXRlcmFibGVcclxuICAgICAqL1xyXG4gICAgY291bnQoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gY291bnQodGhpcy5hKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY291bnQgdGhlIG51bWJlciBvZiBpdGVtcyBpbiBhbiBpdGVyYWJsZVxyXG4gICAgICovXHJcbiAgICBjb3VudERpc3RpbmN0KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIGNvdW50RGlzdGluY3QodGhpcy5hKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY291bnQgdGhlIG51bWJlciBvZiBpdGVtcyBpbiBhbiBpdGVyYWJsZSB0aGF0IG1lZXQgY29uZGl0aW9ucyBpbiBwcmVkaWNhdGVcclxuICAgICAqIEBwYXJhbSBmIHByZWRpY2F0ZVxyXG4gICAgICovXHJcbiAgICBjb3VudElmKGY6ICh4OiBUKSA9PiBib29sZWFuKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gY291bnRJZih0aGlzLmEsIGYpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGaWx0ZXIgYW4gaXRlcmFibGUgYmFzZWQgb24gYSBwcmVkaWNhdFxyXG4gICAgICogS2VlcHMgYWxsIGVsZW1lbnRzIGZvciB3aGljaCBwcmVkaWNhdGUgcmV0dXJucyB0cnVlXHJcbiAgICAgKiBAcGFyYW0gZiBwcmVkaWNhdGUgdG8gZmlsdGVyIHdpdGhcclxuICAgICAqL1xyXG4gICAgZmlsdGVyKGY/OiAoeDogVCkgPT4gYm9vbGVhbik6IEl0ZXI8VD4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgSXRlcihmaWx0ZXIodGhpcy5hLCBmKSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGFjY3VtdWxhdGUgdGhlIHJlc3VsdHMgb2YgYSBmdW5jdGlvbiBhY3Jvc3MgYW4gaXRlcmFibGVcclxuICAgICAqIEBwYXJhbSBhIGFycmF5IHRvIHJlZHVjZVxyXG4gICAgICogQHBhcmFtIGYgcmVkdWN0aW9uIGZ1bmN0aW9uXHJcbiAgICAgKiBAcGFyYW0gaW5pdGlhbFZhbHVlIGluaXRpYWwgdmFsdWVcclxuICAgICAqL1xyXG4gICAgcmVkdWNlPFU+KGY6IChwcmV2aW91c1ZhbHVlOiBVLCBjdXJyZW50VmFsdWU6IFQpID0+IFUsIGluaXRpYWxWYWx1ZTogVSk6IFUge1xyXG4gICAgICAgIHJldHVybiByZWR1Y2UodGhpcy5hLCBmLCBpbml0aWFsVmFsdWUpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXR1cm5zIHRoZSBmaXJzdCBpdGVtIGluIHRoZSBpdGVyYWJsZSB0aGF0IHNhdGlzZmllcyB0aGUgcHJlZGljYXRlXHJcbiAgICAgKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gICAgICogQHBhcmFtIGYgcHJlZGljYXRlIGZ1bmN0aW9uXHJcbiAgICAgKi9cclxuICAgIGZpbmQoZjogKHg6IFQpID0+IGJvb2xlYW4pOiAoVCB8IG51bGwpIHtcclxuICAgICAgICByZXR1cm4gZmluZCh0aGlzLmEsIGYpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB5aWVsZCB0aGUgZmlyc3QgbiBpdGVtcyBpbiBhbiBpdGVyYWJsZVxyXG4gICAgICogaWYgdGhlcmUgYXJlIG1vcmUgdGhhbiBuIGl0ZW1zLCBhbGwgaXRlbXMgYXJlIGtlcHRcclxuICAgICAqL1xyXG4gICAgdGFrZShuOiBudW1iZXIpOiBJdGVyYWJsZTxUPiB7XHJcbiAgICAgICAgcmV0dXJuIHRha2UodGhpcy5hLCBuKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogZHJvcCB0aGUgbGFzdCBuIGl0ZW1zIGZyb20gYW4gaXRlcmFibGVcclxuICAgICAqIGlmIHRoZXJlIGFyZSBsZXNzIHRoYW4gbiBpdGVtcywgbm9uZSBhcmUgeWllbGRlZFxyXG4gICAgICovXHJcbiAgICBkcm9wKG46IG51bWJlcik6IEl0ZXJhYmxlPFQ+IHtcclxuICAgICAgICByZXR1cm4gZHJvcCh0aGlzLmEsIG4pXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAqIHNvcnQgYW4gYXJyYXkgaW4gYXNjZW5kaW5nIG9yZGVyIGJhc2VkIG9uIHRoZSB2YWx1ZSByZXR1cm5lZCBieSBmXHJcbiAgICAqIEBwYXJhbSBmIHZhbHVlIHNlbGVjdGlvbiBmdW5jdGlvblxyXG4gICAgKi9cclxuICAgIG9yZGVyQnk8VT4oZjogKHg6IFQpID0+IFUpOiBJdGVyPFQ+IHtcclxuICAgICAgICByZXR1cm4gbmV3IEl0ZXIoWy4uLnRoaXMuYV0uc29ydCgoeCwgeSkgPT4gZih4KSA8IGYoeSkgPyAtMSA6IDEpKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogc29ydCBhbiBhcnJheSBpbiBkZXNjZW5kaW5nIG9yZGVyIGJhc2VkIG9uIHRoZSB2YWx1ZSByZXR1cm5lZCBieSBmXHJcbiAgICAgKiBAcGFyYW0gZiB2YWx1ZSBzZWxlY3Rpb24gZnVuY3Rpb25cclxuICAgICAqL1xyXG4gICAgb3JkZXJCeURlc2M8VT4oZjogKHg6IFQpID0+IFUpOiBJdGVyPFQ+IHtcclxuICAgICAgICByZXR1cm4gbmV3IEl0ZXIoWy4uLnRoaXMuYV0uc29ydCgoeCwgeSkgPT4gZih5KSA8IGYoeCkgPyAtMSA6IDEpKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29uY2F0ZW5hdGUgaXRlcmFibGVzLCB5aWVsZGluZyBhbGwgZWxlbWVudHMgb2YgZWFjaFxyXG4gICAgKi9cclxuICAgIGNhdCguLi5hczogSXRlcmFibGU8VD5bXSk6IEl0ZXJhYmxlPFQ+IHtcclxuICAgICAgICByZXR1cm4gY2F0KHRoaXMuYSwgLi4uYXMpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb252ZXJ0IHRvIGFuIGFycmF5XHJcbiAgICAgKi9cclxuICAgIHRvQXJyYXkoKTogVFtdIHtcclxuICAgICAgICByZXR1cm4gWy4uLnRoaXMuYV1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJldHVybnMgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNlcXVlbmNlLCB0aHJvd2luZyBhbiBleGNlcHRpb24gaWYgZW1wdHlcclxuICAgICAqL1xyXG4gICAgZmlyc3QoKTogVCB7XHJcbiAgICAgICAgcmV0dXJuIGZpcnN0KHRoaXMuYSlcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIGludm9rZSBhIGZ1bmN0aW9uIG9uIGV2ZXJ5IGVsZW1lbnQgb2YgdGhlIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBmIGZ1bmN0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZWFjaDxUPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IHZvaWQpOiB2b2lkIHtcclxuICAgIGZvciAoY29uc3QgeCBvZiBhKSB7XHJcbiAgICAgICAgZih4KVxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogd3JhcHMgdGhlIGl0ZXJhYmxlIHR5cGUgd2l0aCBJdGVyIGZvciBlYXN5IGNoYWluZWQgY2FsbHNcclxuICogQHBhcmFtIGEgaXRlcmFibGUgdG8gd3JhcFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHdyYXA8VD4oYTogSXRlcmFibGU8VD4pOiBJdGVyPFQ+IHtcclxuICAgIHJldHVybiBuZXcgSXRlcihhKVxyXG59XHJcblxyXG4vKipcclxuICogdHJ1ZSBpZiBhbnkgaXRlbSBpbiB0aGUgaXRlcmFibGUgc2F0aXNmaWVzIHByZWRpY2F0ZVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gZiBwcmVkaWNhdGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhbnk8VD4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBib29sZWFuKTogYm9vbGVhbiB7XHJcbiAgICBmb3IgKGNvbnN0IHggb2YgYSkge1xyXG4gICAgICAgIGlmIChmKHgpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZVxyXG59XHJcblxyXG4vKipcclxuICogdHJ1ZSBpZiBhbGwgaXRlbXMgaW4gdGhlIGl0ZXJhYmxlIHNhdGlzZnkgcHJlZGljYXRlXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBmIHByZWRpY2F0ZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFsbDxUPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IGJvb2xlYW4pIHtcclxuICAgIGZvciAoY29uc3QgeCBvZiBhKSB7XHJcbiAgICAgICAgaWYgKCFmKHgpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59XHJcblxyXG4vKipcclxuICogYXBwZW5kIGFuIGl0ZW0gdG8gZW5kIG9mIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSB4IGl0ZW0gdG8gYXBwZW5kXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24qIGFwcGVuZDxUPihhOiBJdGVyYWJsZTxUPiwgeDogVCk6IEdlbmVyYXRvcjxUPiB7XHJcbiAgICBmb3IgKGNvbnN0IHkgb2YgYSkge1xyXG4gICAgICAgIHlpZWxkIHlcclxuICAgIH1cclxuXHJcbiAgICB5aWVsZCB4XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBwcmVwZW5kIGFuIGl0ZW0gdG8gc3RhcnQgb2YgaXRlcmFibGVcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICogQHBhcmFtIHggaXRlbSB0byBwcmVwZW5kXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24qIHByZXBlbmQ8VD4oYTogSXRlcmFibGU8VD4sIHg6IFQpOiBHZW5lcmF0b3I8VD4ge1xyXG4gICAgeWllbGQgeFxyXG5cclxuICAgIGZvciAoY29uc3QgeSBvZiBhKSB7XHJcbiAgICAgICAgeWllbGQgeVxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogaWRlbnRpdHkgZnVuY3Rpb24sIHJldHVybnMgaXRzZWxmXHJcbiAqIEBwYXJhbSB4IHZhbHVlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaWRlbnRpdHk8VD4oeDogVCk6IFQge1xyXG4gICAgcmV0dXJuIHhcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBsaXN0IG9mIGRpc3RpbmN0IHZhbHVlcyBmcm9tIGEgLSBkb2VzIE5PVCBwcmVzZXJ2ZSBvcmRlclxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGRpc3RpbmN0PFQ+KGE6IEl0ZXJhYmxlPFQ+KTogSXRlcmFibGU8VD4ge1xyXG4gICAgcmV0dXJuIG5ldyBTZXQoYSlcclxufVxyXG5cclxuLyoqXHJcbiAqIG1hcCBlYWNoIGVsZW1lbnQgb2YgYSB0byBhbiBlbGVtZW50IGluIGEgbmV3IGFycmF5XHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBmIG1hcHBpbmcgZnVuY3Rpb24gdG8gZXhlY3V0ZSBvbiBlYWNoIGVsZW1lbnRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiogbWFwPFQsIFU+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAoeDogVCkgPT4gVSk6IEl0ZXJhYmxlPFU+IHtcclxuICAgIGZvciAoY29uc3QgeCBvZiBhKSB7XHJcbiAgICAgICAgeWllbGQgZih4KVxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIGxpc3Qgb2YgdW5pcXVlIHZhbHVlcyBmcm9tIGEsIHRoZW4gaW52b2tlcyBtYXAgZnVuY3Rpb24gZm9yIGVhY2hcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXBEaXN0aW5jdDxULCBVPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IFUpOiBJdGVyYWJsZTxVPiB7XHJcbiAgICByZXR1cm4gbWFwKGRpc3RpbmN0KGEpLCBmKVxyXG59XHJcblxyXG4vKipcclxuICogY291bnQgdGhlIG51bWJlciBvZiBpdGVtcyBpbiBhbiBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50PFQ+KGE6IEl0ZXJhYmxlPFQ+KTogbnVtYmVyIHtcclxuICAgIGxldCByID0gMFxyXG4gICAgZm9yIChjb25zdCBfIG9mIGEpIHtcclxuICAgICAgICArK3JcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gclxyXG59XHJcblxyXG4vKipcclxuICogY291bnQgdGhlIG51bWJlciBvZiBpdGVtcyBpbiBhbiBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50RGlzdGluY3Q8VD4oYTogSXRlcmFibGU8VD4pOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIGNvdW50KGRpc3RpbmN0KGEpKVxyXG59XHJcblxyXG4vKipcclxuICogY291bnQgdGhlIG51bWJlciBvZiBpdGVtcyBpbiBhbiBpdGVyYWJsZSB0aGF0IG1lZXQgY29uZGl0aW9ucyBpbiBwcmVkaWNhdGVcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICogQHBhcmFtIGYgcHJlZGljYXRlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY291bnRJZjxUPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IGJvb2xlYW4pOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIGNvdW50KGZpbHRlcihhLCBmKSlcclxufVxyXG5cclxuLyoqXHJcbiAqIHByZWRpY2F0ZSB0byB0ZXN0IGphdmFzY3JpcHQgdHJ1dGhpbmVzc1xyXG4gKiBAcGFyYW0geCB2YWx1ZSB0byB0ZXN0IGZvciB0cnV0aGluZXNzXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdHJ1dGh5PFQ+KHg6IFQpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB4ID8gdHJ1ZSA6IGZhbHNlXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGaWx0ZXIgYW4gaXRlcmFibGUgYmFzZWQgb24gYSBwcmVkaWNhdFxyXG4gKiBLZWVwcyBhbGwgZWxlbWVudHMgZm9yIHdoaWNoIHByZWRpY2F0ZSByZXR1cm5zIHRydWVcclxuICogQHBhcmFtIGEgaXRlcmFibGUgdG8gZmlsdGVyZVxyXG4gKiBAcGFyYW0gZiBwcmVkaWNhdGUgdG8gZmlsdGVyIHdpdGhcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiogZmlsdGVyPFQ+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAoeDogVCkgPT4gYm9vbGVhbiA9IHRydXRoeSk6IEl0ZXJhYmxlPFQ+IHtcclxuICAgIGZvciAoY29uc3QgeCBvZiBhKSB7XHJcbiAgICAgICAgaWYgKGYoeCkpIHtcclxuICAgICAgICAgICAgeWllbGQgeFxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIGFjY3VtdWxhdGUgdGhlIHJlc3VsdHMgb2YgYSBmdW5jdGlvbiBhY3Jvc3MgYW4gaXRlcmFibGVcclxuICogQHBhcmFtIGEgYXJyYXkgdG8gcmVkdWNlXHJcbiAqIEBwYXJhbSBmIHJlZHVjdGlvbiBmdW5jdGlvblxyXG4gKiBAcGFyYW0gaW5pdGlhbFZhbHVlIGluaXRpYWwgdmFsdWVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWR1Y2U8VCwgVT4oYTogSXRlcmFibGU8VD4sIGY6IChwcmV2aW91c1ZhbHVlOiBVLCBjdXJyZW50VmFsdWU6IFQpID0+IFUsIGluaXRpYWxWYWx1ZTogVSk6IFUge1xyXG4gICAgbGV0IHZhbHVlID0gaW5pdGlhbFZhbHVlXHJcbiAgICBmb3IgKGNvbnN0IHggb2YgYSkge1xyXG4gICAgICAgIHZhbHVlID0gZih2YWx1ZSwgeClcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmFsdWVcclxufVxyXG5cclxuLyoqXHJcbiAqIHJldHVybnMgdGhlIGZpcnN0IGl0ZW0gaW4gdGhlIGl0ZXJhYmxlIHRoYXQgc2F0aXNmaWVzIHRoZSBwcmVkaWNhdGVcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICogQHBhcmFtIGYgcHJlZGljYXRlIGZ1bmN0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmluZDxUPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IGJvb2xlYW4pOiAoVCB8IG51bGwpIHtcclxuICAgIGZvciAoY29uc3QgeCBvZiBhKSB7XHJcbiAgICAgICAgaWYgKGYoeCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHhcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51bGxcclxufVxyXG5cclxuLyoqXHJcbiAqIHlpZWxkIHRoZSBmaXJzdCBuIGl0ZW1zIGluIGFuIGl0ZXJhYmxlXHJcbiAqIGlmIHRoZXJlIGFyZSBtb3JlIHRoYW4gbiBpdGVtcywgYWxsIGl0ZW1zIGFyZSBrZXB0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24qIHRha2U8VD4oYTogSXRlcmFibGU8VD4sIG46IG51bWJlcik6IEl0ZXJhYmxlPFQ+IHtcclxuICAgIGxldCBpID0gMFxyXG4gICAgZm9yIChjb25zdCB4IG9mIGEpIHtcclxuICAgICAgICBpZiAoaSA+PSBuKSB7XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHlpZWxkIHhcclxuICAgICAgICArK2lcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIGRyb3AgdGhlIGxhc3QgbiBpdGVtcyBmcm9tIGFuIGl0ZXJhYmxlXHJcbiAqIGlmIHRoZXJlIGFyZSBsZXNzIHRoYW4gbiBpdGVtcywgbm9uZSBhcmUgeWllbGRlZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGRyb3A8VD4oYTogSXRlcmFibGU8VD4sIG46IG51bWJlcik6IEl0ZXJhYmxlPFQ+IHtcclxuICAgIGNvbnN0IHNpemUgPSBjb3VudChhKVxyXG4gICAgcmV0dXJuIHRha2UoYSwgc2l6ZSAtIG4pXHJcbn1cclxuXHJcbi8qKlxyXG4gKiB5aWVsZCBudW1iZXJzIG9mIHRoZSBmb3JtIFtzdGFydC4uZW5kKSB3aGVyZSBlbmQgPSBzdGFydCArIGxlbmd0aCAtIDFcclxuICogQHBhcmFtIHN0YXJ0IHN0YXJ0IG51bWJlciBvciBsZW5ndGggaWYgb25seSBvbmUgYXJndW1lbnQgaXMgcHJvdmlkZWRcclxuICogQHBhcmFtIGxlbmd0aCBsZW5ndGggb2YgYXJyYXlcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiogc2VxdWVuY2Uoc3RhcnQ6IG51bWJlciwgbGVuZ3RoID0gLTEpOiBJdGVyYWJsZTxudW1iZXI+IHtcclxuICAgIGlmIChsZW5ndGggPT09IC0xKSB7XHJcbiAgICAgICAgbGVuZ3RoID0gc3RhcnRcclxuICAgICAgICBzdGFydCA9IDBcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgeWllbGQgaVxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogeWllbGQgZWxlbWVudHMgZ2l2ZW4gYSBsZW5ndGggYW5kIGEgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBpbmRleFxyXG4gKiBAcGFyYW0gbGVuZ3RoIGxlbmd0aCBvZiBnZW5lcmF0ZWQgc2VxdWVuY2VcclxuICogQHBhcmFtIGYgZnVuY3Rpb24gdG8gY2FsbCB3aXRoIGVhY2ggaW5kZXhcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZTxUPihsZW5ndGg6IG51bWJlciwgZjogKGk6IG51bWJlcikgPT4gVCk6IEl0ZXJhYmxlPFQ+IHtcclxuICAgIHJldHVybiBtYXAoc2VxdWVuY2UobGVuZ3RoKSwgZilcclxufVxyXG5cclxuLyoqXHJcbiAqIHNvcnQgYW4gaXRlcmFibGUgaW4gYXNjZW5kaW5nIG9yZGVyIGJhc2VkIG9uIHRoZSB2YWx1ZSByZXR1cm5lZCBieSBmXHJcbiAqIEBwYXJhbSBhIGFycmF5XHJcbiAqIEBwYXJhbSBmIHZhbHVlIHNlbGVjdGlvbiBmdW5jdGlvblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG9yZGVyQnk8VCwgVT4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBVKTogQXJyYXk8VD4ge1xyXG4gICAgcmV0dXJuIFsuLi5hXS5zb3J0KCh4LCB5KSA9PiBmKHgpIDwgZih5KSA/IC0xIDogMSlcclxufVxyXG5cclxuLyoqXHJcbiAqIHNvcnQgYW4gaXRlcmFibGUgaW4gZGVzY2VuZGluZyBvcmRlciBiYXNlZCBvbiB0aGUgdmFsdWUgcmV0dXJuZWQgYnkgZlxyXG4gKiBAcGFyYW0gYSBhcnJheVxyXG4gKiBAcGFyYW0gZiB2YWx1ZSBzZWxlY3Rpb24gZnVuY3Rpb25cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBvcmRlckJ5RGVzYzxULCBVPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IFUpOiBBcnJheTxUPiB7XHJcbiAgICByZXR1cm4gWy4uLmFdLnNvcnQoKHgsIHkpID0+IGYoeSkgPCBmKHgpID8gLTEgOiAxKVxyXG59XHJcblxyXG4vKipcclxuICogY29uY2F0ZW5hdGUgaXRlcmFibGVzLCB5aWVsZGluZyBhbGwgZWxlbWVudHMgb2YgZWFjaFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uKiBjYXQ8VD4oLi4uYXM6IEl0ZXJhYmxlPFQ+W10pOiBJdGVyYWJsZTxUPiB7XHJcbiAgICBmb3IgKGNvbnN0IGEgb2YgYXMpIHtcclxuICAgICAgICB5aWVsZCogYVxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogcmV0dXJucyB0aGUgZmlyc3QgZWxlbWVudCBpbiBhbiBpdGVyYWJsZSBzZXF1ZW5jZS5cclxuICogYW4gZXhjZXB0aW9uIGlzIHRocm93biBpZiBzZXF1ZW5jZSBjb250YWlucyBubyBlbGVtZW50cy5cclxuICogQHBhcmFtIGFzIGl0ZXJhYmxlIHNlcXVlbmNlXHJcbiAqIEByZXR1cm5zIGZpcnN0IGVsZW1lbnQgaW4gc2VxdWVuY2VcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBmaXJzdDxUPihhczogSXRlcmFibGU8VD4pOiBUIHtcclxuICAgIGZvciAoY29uc3QgeCBvZiBhcykge1xyXG4gICAgICAgIHJldHVybiB4XHJcbiAgICB9XHJcblxyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiU2VxdWVuY2UgY29udGFpbmVkIG5vIGVsZW1lbnRzLlwiKVxyXG59Il19