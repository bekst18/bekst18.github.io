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
/**
 *
 * @param data data to extract a page of
 * @param pageIndex index of page
 * @param pageSize size of page
 * @returns a page of the specified data
 */
export function page(data, pageIndex, pageSize) {
    const a = [...data];
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    const page = a.slice(startIndex, endIndex);
    return page;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIml0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFFSCxNQUFNLElBQUk7SUFDTixZQUE2QixDQUFjO1FBQWQsTUFBQyxHQUFELENBQUMsQ0FBYTtJQUFJLENBQUM7SUFFaEQ7O09BRUc7SUFDSCxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNkLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRTtZQUNwQixNQUFNLENBQUMsQ0FBQTtTQUNWO0lBQ0wsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFpQjtRQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNmLE9BQU8sSUFBSSxDQUFBO0lBQ2YsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQW9CO1FBQ3BCLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFvQjtRQUNwQixPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFFRCxPQUFPLENBQUMsQ0FBSTtRQUNSLE9BQU8sSUFBSSxJQUFJLENBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsTUFBTSxDQUFDLENBQUk7UUFDUCxPQUFPLElBQUksSUFBSSxDQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVELEdBQUcsQ0FBSSxDQUFjO1FBQ2pCLE9B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QUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUN0RCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBSSxHQUFHLEVBQWlCO0lBQ3hDLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ2hCLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUNYO0FBQ0wsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLEtBQUssQ0FBSSxFQUFlO0lBQ3BDLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ2hCLE9BQU8sQ0FBQyxDQUFBO0tBQ1g7SUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7QUFDdEQsQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILE1BQU0sVUFBVSxJQUFJLENBQUksSUFBaUIsRUFBRSxTQUFpQixFQUFFLFFBQWdCO0lBQzFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQTtJQUNuQixNQUFNLFVBQVUsR0FBRyxTQUFTLEdBQUcsUUFBUSxDQUFBO0lBQ3ZDLE1BQU0sUUFBUSxHQUFHLFVBQVUsR0FBRyxRQUFRLENBQUE7SUFDdEMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDMUMsT0FBTyxJQUFJLENBQUE7QUFDZixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIHV0aWxpdHkgZnVuY3Rpb25zIGZvciBpdGVyYWJsZXNcclxuICovXHJcblxyXG5jbGFzcyBJdGVyPFQ+IHtcclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgYTogSXRlcmFibGU8VD4pIHsgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogaXRlcmF0ZSBvdmVyIGFsbCBkYXRhIGluIGdyaWRcclxuICAgICAqL1xyXG4gICAgKltTeW1ib2wuaXRlcmF0b3JdKCkge1xyXG4gICAgICAgIGZvciAoY29uc3QgeCBvZiB0aGlzLmEpIHtcclxuICAgICAgICAgICAgeWllbGQgeFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBlYWNoKGY6ICh4OiBUKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgZWFjaCh0aGlzLmEsIGYpXHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH1cclxuXHJcbiAgICBkaXN0aW5jdCgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IEl0ZXIoZGlzdGluY3QodGhpcy5hKSlcclxuICAgIH1cclxuXHJcbiAgICBhbnkoZjogKHg6IFQpID0+IGJvb2xlYW4pOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gYW55KHRoaXMuYSwgZilcclxuICAgIH1cclxuXHJcbiAgICBhbGwoZjogKHg6IFQpID0+IGJvb2xlYW4pOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gYWxsKHRoaXMuYSwgZilcclxuICAgIH1cclxuXHJcbiAgICBwcmVwZW5kKHg6IFQpOiBJdGVyPFQ+IHtcclxuICAgICAgICByZXR1cm4gbmV3IEl0ZXI8VD4ocHJlcGVuZCh0aGlzLmEsIHgpKVxyXG4gICAgfVxyXG5cclxuICAgIGFwcGVuZCh4OiBUKTogSXRlcjxUPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJdGVyPFQ+KGFwcGVuZCh0aGlzLmEsIHgpKVxyXG4gICAgfVxyXG5cclxuICAgIG1hcDxVPihmOiAoeDogVCkgPT4gVSk6IEl0ZXI8VT4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgSXRlcjxVPihtYXAodGhpcy5hLCBmKSlcclxuICAgIH1cclxuXHJcbiAgICBtYXBEaXN0aW5jdDxVPihmOiAoeDogVCkgPT4gVSk6IEl0ZXI8VT4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgSXRlcjxVPihtYXBEaXN0aW5jdCh0aGlzLmEsIGYpKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY291bnQgdGhlIG51bWJlciBvZiBpdGVtcyBpbiBhbiBpdGVyYWJsZVxyXG4gICAgICovXHJcbiAgICBjb3VudCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBjb3VudCh0aGlzLmEpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb3VudCB0aGUgbnVtYmVyIG9mIGl0ZW1zIGluIGFuIGl0ZXJhYmxlXHJcbiAgICAgKi9cclxuICAgIGNvdW50RGlzdGluY3QoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gY291bnREaXN0aW5jdCh0aGlzLmEpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb3VudCB0aGUgbnVtYmVyIG9mIGl0ZW1zIGluIGFuIGl0ZXJhYmxlIHRoYXQgbWVldCBjb25kaXRpb25zIGluIHByZWRpY2F0ZVxyXG4gICAgICogQHBhcmFtIGYgcHJlZGljYXRlXHJcbiAgICAgKi9cclxuICAgIGNvdW50SWYoZjogKHg6IFQpID0+IGJvb2xlYW4pOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBjb3VudElmKHRoaXMuYSwgZilcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEZpbHRlciBhbiBpdGVyYWJsZSBiYXNlZCBvbiBhIHByZWRpY2F0XHJcbiAgICAgKiBLZWVwcyBhbGwgZWxlbWVudHMgZm9yIHdoaWNoIHByZWRpY2F0ZSByZXR1cm5zIHRydWVcclxuICAgICAqIEBwYXJhbSBmIHByZWRpY2F0ZSB0byBmaWx0ZXIgd2l0aFxyXG4gICAgICovXHJcbiAgICBmaWx0ZXIoZj86ICh4OiBUKSA9PiBib29sZWFuKTogSXRlcjxUPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJdGVyKGZpbHRlcih0aGlzLmEsIGYpKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogYWNjdW11bGF0ZSB0aGUgcmVzdWx0cyBvZiBhIGZ1bmN0aW9uIGFjcm9zcyBhbiBpdGVyYWJsZVxyXG4gICAgICogQHBhcmFtIGEgYXJyYXkgdG8gcmVkdWNlXHJcbiAgICAgKiBAcGFyYW0gZiByZWR1Y3Rpb24gZnVuY3Rpb25cclxuICAgICAqIEBwYXJhbSBpbml0aWFsVmFsdWUgaW5pdGlhbCB2YWx1ZVxyXG4gICAgICovXHJcbiAgICByZWR1Y2U8VT4oZjogKHByZXZpb3VzVmFsdWU6IFUsIGN1cnJlbnRWYWx1ZTogVCkgPT4gVSwgaW5pdGlhbFZhbHVlOiBVKTogVSB7XHJcbiAgICAgICAgcmV0dXJuIHJlZHVjZSh0aGlzLmEsIGYsIGluaXRpYWxWYWx1ZSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJldHVybnMgdGhlIGZpcnN0IGl0ZW0gaW4gdGhlIGl0ZXJhYmxlIHRoYXQgc2F0aXNmaWVzIHRoZSBwcmVkaWNhdGVcclxuICAgICAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAgICAgKiBAcGFyYW0gZiBwcmVkaWNhdGUgZnVuY3Rpb25cclxuICAgICAqL1xyXG4gICAgZmluZChmOiAoeDogVCkgPT4gYm9vbGVhbik6IChUIHwgbnVsbCkge1xyXG4gICAgICAgIHJldHVybiBmaW5kKHRoaXMuYSwgZilcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHlpZWxkIHRoZSBmaXJzdCBuIGl0ZW1zIGluIGFuIGl0ZXJhYmxlXHJcbiAgICAgKiBpZiB0aGVyZSBhcmUgbW9yZSB0aGFuIG4gaXRlbXMsIGFsbCBpdGVtcyBhcmUga2VwdFxyXG4gICAgICovXHJcbiAgICB0YWtlKG46IG51bWJlcik6IEl0ZXJhYmxlPFQ+IHtcclxuICAgICAgICByZXR1cm4gdGFrZSh0aGlzLmEsIG4pXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBkcm9wIHRoZSBsYXN0IG4gaXRlbXMgZnJvbSBhbiBpdGVyYWJsZVxyXG4gICAgICogaWYgdGhlcmUgYXJlIGxlc3MgdGhhbiBuIGl0ZW1zLCBub25lIGFyZSB5aWVsZGVkXHJcbiAgICAgKi9cclxuICAgIGRyb3AobjogbnVtYmVyKTogSXRlcmFibGU8VD4ge1xyXG4gICAgICAgIHJldHVybiBkcm9wKHRoaXMuYSwgbilcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICogc29ydCBhbiBhcnJheSBpbiBhc2NlbmRpbmcgb3JkZXIgYmFzZWQgb24gdGhlIHZhbHVlIHJldHVybmVkIGJ5IGZcclxuICAgICogQHBhcmFtIGYgdmFsdWUgc2VsZWN0aW9uIGZ1bmN0aW9uXHJcbiAgICAqL1xyXG4gICAgb3JkZXJCeTxVPihmOiAoeDogVCkgPT4gVSk6IEl0ZXI8VD4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgSXRlcihbLi4udGhpcy5hXS5zb3J0KCh4LCB5KSA9PiBmKHgpIDwgZih5KSA/IC0xIDogMSkpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzb3J0IGFuIGFycmF5IGluIGRlc2NlbmRpbmcgb3JkZXIgYmFzZWQgb24gdGhlIHZhbHVlIHJldHVybmVkIGJ5IGZcclxuICAgICAqIEBwYXJhbSBmIHZhbHVlIHNlbGVjdGlvbiBmdW5jdGlvblxyXG4gICAgICovXHJcbiAgICBvcmRlckJ5RGVzYzxVPihmOiAoeDogVCkgPT4gVSk6IEl0ZXI8VD4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgSXRlcihbLi4udGhpcy5hXS5zb3J0KCh4LCB5KSA9PiBmKHkpIDwgZih4KSA/IC0xIDogMSkpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb25jYXRlbmF0ZSBpdGVyYWJsZXMsIHlpZWxkaW5nIGFsbCBlbGVtZW50cyBvZiBlYWNoXHJcbiAgICAqL1xyXG4gICAgY2F0KC4uLmFzOiBJdGVyYWJsZTxUPltdKTogSXRlcmFibGU8VD4ge1xyXG4gICAgICAgIHJldHVybiBjYXQodGhpcy5hLCAuLi5hcylcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNvbnZlcnQgdG8gYW4gYXJyYXlcclxuICAgICAqL1xyXG4gICAgdG9BcnJheSgpOiBUW10ge1xyXG4gICAgICAgIHJldHVybiBbLi4udGhpcy5hXVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmV0dXJucyB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2VxdWVuY2UsIHRocm93aW5nIGFuIGV4Y2VwdGlvbiBpZiBlbXB0eVxyXG4gICAgICovXHJcbiAgICBmaXJzdCgpOiBUIHtcclxuICAgICAgICByZXR1cm4gZmlyc3QodGhpcy5hKVxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogaW52b2tlIGEgZnVuY3Rpb24gb24gZXZlcnkgZWxlbWVudCBvZiB0aGUgaXRlcmFibGVcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICogQHBhcmFtIGYgZnVuY3Rpb25cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBlYWNoPFQ+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAoeDogVCkgPT4gdm9pZCk6IHZvaWQge1xyXG4gICAgZm9yIChjb25zdCB4IG9mIGEpIHtcclxuICAgICAgICBmKHgpXHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiB3cmFwcyB0aGUgaXRlcmFibGUgdHlwZSB3aXRoIEl0ZXIgZm9yIGVhc3kgY2hhaW5lZCBjYWxsc1xyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZSB0byB3cmFwXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gd3JhcDxUPihhOiBJdGVyYWJsZTxUPik6IEl0ZXI8VD4ge1xyXG4gICAgcmV0dXJuIG5ldyBJdGVyKGEpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiB0cnVlIGlmIGFueSBpdGVtIGluIHRoZSBpdGVyYWJsZSBzYXRpc2ZpZXMgcHJlZGljYXRlXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBmIHByZWRpY2F0ZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFueTxUPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IGJvb2xlYW4pOiBib29sZWFuIHtcclxuICAgIGZvciAoY29uc3QgeCBvZiBhKSB7XHJcbiAgICAgICAgaWYgKGYoeCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlXHJcbn1cclxuXHJcbi8qKlxyXG4gKiB0cnVlIGlmIGFsbCBpdGVtcyBpbiB0aGUgaXRlcmFibGUgc2F0aXNmeSBwcmVkaWNhdGVcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICogQHBhcmFtIGYgcHJlZGljYXRlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYWxsPFQ+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAoeDogVCkgPT4gYm9vbGVhbikge1xyXG4gICAgZm9yIChjb25zdCB4IG9mIGEpIHtcclxuICAgICAgICBpZiAoIWYoeCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBhcHBlbmQgYW4gaXRlbSB0byBlbmQgb2YgaXRlcmFibGVcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICogQHBhcmFtIHggaXRlbSB0byBhcHBlbmRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiogYXBwZW5kPFQ+KGE6IEl0ZXJhYmxlPFQ+LCB4OiBUKTogR2VuZXJhdG9yPFQ+IHtcclxuICAgIGZvciAoY29uc3QgeSBvZiBhKSB7XHJcbiAgICAgICAgeWllbGQgeVxyXG4gICAgfVxyXG5cclxuICAgIHlpZWxkIHhcclxufVxyXG5cclxuLyoqXHJcbiAqIHByZXBlbmQgYW4gaXRlbSB0byBzdGFydCBvZiBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKiBAcGFyYW0geCBpdGVtIHRvIHByZXBlbmRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiogcHJlcGVuZDxUPihhOiBJdGVyYWJsZTxUPiwgeDogVCk6IEdlbmVyYXRvcjxUPiB7XHJcbiAgICB5aWVsZCB4XHJcblxyXG4gICAgZm9yIChjb25zdCB5IG9mIGEpIHtcclxuICAgICAgICB5aWVsZCB5XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBpZGVudGl0eSBmdW5jdGlvbiwgcmV0dXJucyBpdHNlbGZcclxuICogQHBhcmFtIHggdmFsdWVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpZGVudGl0eTxUPih4OiBUKTogVCB7XHJcbiAgICByZXR1cm4geFxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIGxpc3Qgb2YgZGlzdGluY3QgdmFsdWVzIGZyb20gYSAtIGRvZXMgTk9UIHByZXNlcnZlIG9yZGVyXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZGlzdGluY3Q8VD4oYTogSXRlcmFibGU8VD4pOiBJdGVyYWJsZTxUPiB7XHJcbiAgICByZXR1cm4gbmV3IFNldChhKVxyXG59XHJcblxyXG4vKipcclxuICogbWFwIGVhY2ggZWxlbWVudCBvZiBhIHRvIGFuIGVsZW1lbnQgaW4gYSBuZXcgYXJyYXlcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICogQHBhcmFtIGYgbWFwcGluZyBmdW5jdGlvbiB0byBleGVjdXRlIG9uIGVhY2ggZWxlbWVudFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uKiBtYXA8VCwgVT4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBVKTogSXRlcmFibGU8VT4ge1xyXG4gICAgZm9yIChjb25zdCB4IG9mIGEpIHtcclxuICAgICAgICB5aWVsZCBmKHgpXHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbGlzdCBvZiB1bmlxdWUgdmFsdWVzIGZyb20gYSwgdGhlbiBpbnZva2VzIG1hcCBmdW5jdGlvbiBmb3IgZWFjaFxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG1hcERpc3RpbmN0PFQsIFU+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAoeDogVCkgPT4gVSk6IEl0ZXJhYmxlPFU+IHtcclxuICAgIHJldHVybiBtYXAoZGlzdGluY3QoYSksIGYpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjb3VudCB0aGUgbnVtYmVyIG9mIGl0ZW1zIGluIGFuIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY291bnQ8VD4oYTogSXRlcmFibGU8VD4pOiBudW1iZXIge1xyXG4gICAgbGV0IHIgPSAwXHJcbiAgICBmb3IgKGNvbnN0IF8gb2YgYSkge1xyXG4gICAgICAgICsrclxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjb3VudCB0aGUgbnVtYmVyIG9mIGl0ZW1zIGluIGFuIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY291bnREaXN0aW5jdDxUPihhOiBJdGVyYWJsZTxUPik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gY291bnQoZGlzdGluY3QoYSkpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjb3VudCB0aGUgbnVtYmVyIG9mIGl0ZW1zIGluIGFuIGl0ZXJhYmxlIHRoYXQgbWVldCBjb25kaXRpb25zIGluIHByZWRpY2F0ZVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gZiBwcmVkaWNhdGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjb3VudElmPFQ+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAoeDogVCkgPT4gYm9vbGVhbik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gY291bnQoZmlsdGVyKGEsIGYpKVxyXG59XHJcblxyXG4vKipcclxuICogcHJlZGljYXRlIHRvIHRlc3QgamF2YXNjcmlwdCB0cnV0aGluZXNzXHJcbiAqIEBwYXJhbSB4IHZhbHVlIHRvIHRlc3QgZm9yIHRydXRoaW5lc3NcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB0cnV0aHk8VD4oeDogVCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHggPyB0cnVlIDogZmFsc2VcclxufVxyXG5cclxuLyoqXHJcbiAqIEZpbHRlciBhbiBpdGVyYWJsZSBiYXNlZCBvbiBhIHByZWRpY2F0XHJcbiAqIEtlZXBzIGFsbCBlbGVtZW50cyBmb3Igd2hpY2ggcHJlZGljYXRlIHJldHVybnMgdHJ1ZVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZSB0byBmaWx0ZXJlXHJcbiAqIEBwYXJhbSBmIHByZWRpY2F0ZSB0byBmaWx0ZXIgd2l0aFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uKiBmaWx0ZXI8VD4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBib29sZWFuID0gdHJ1dGh5KTogSXRlcmFibGU8VD4ge1xyXG4gICAgZm9yIChjb25zdCB4IG9mIGEpIHtcclxuICAgICAgICBpZiAoZih4KSkge1xyXG4gICAgICAgICAgICB5aWVsZCB4XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogYWNjdW11bGF0ZSB0aGUgcmVzdWx0cyBvZiBhIGZ1bmN0aW9uIGFjcm9zcyBhbiBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gYSBhcnJheSB0byByZWR1Y2VcclxuICogQHBhcmFtIGYgcmVkdWN0aW9uIGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSBpbml0aWFsVmFsdWUgaW5pdGlhbCB2YWx1ZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlZHVjZTxULCBVPihhOiBJdGVyYWJsZTxUPiwgZjogKHByZXZpb3VzVmFsdWU6IFUsIGN1cnJlbnRWYWx1ZTogVCkgPT4gVSwgaW5pdGlhbFZhbHVlOiBVKTogVSB7XHJcbiAgICBsZXQgdmFsdWUgPSBpbml0aWFsVmFsdWVcclxuICAgIGZvciAoY29uc3QgeCBvZiBhKSB7XHJcbiAgICAgICAgdmFsdWUgPSBmKHZhbHVlLCB4KVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2YWx1ZVxyXG59XHJcblxyXG4vKipcclxuICogcmV0dXJucyB0aGUgZmlyc3QgaXRlbSBpbiB0aGUgaXRlcmFibGUgdGhhdCBzYXRpc2ZpZXMgdGhlIHByZWRpY2F0ZVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gZiBwcmVkaWNhdGUgZnVuY3Rpb25cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBmaW5kPFQ+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAoeDogVCkgPT4gYm9vbGVhbik6IChUIHwgbnVsbCkge1xyXG4gICAgZm9yIChjb25zdCB4IG9mIGEpIHtcclxuICAgICAgICBpZiAoZih4KSkge1xyXG4gICAgICAgICAgICByZXR1cm4geFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVsbFxyXG59XHJcblxyXG4vKipcclxuICogeWllbGQgdGhlIGZpcnN0IG4gaXRlbXMgaW4gYW4gaXRlcmFibGVcclxuICogaWYgdGhlcmUgYXJlIG1vcmUgdGhhbiBuIGl0ZW1zLCBhbGwgaXRlbXMgYXJlIGtlcHRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiogdGFrZTxUPihhOiBJdGVyYWJsZTxUPiwgbjogbnVtYmVyKTogSXRlcmFibGU8VD4ge1xyXG4gICAgbGV0IGkgPSAwXHJcbiAgICBmb3IgKGNvbnN0IHggb2YgYSkge1xyXG4gICAgICAgIGlmIChpID49IG4pIHtcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICAgICAgeWllbGQgeFxyXG4gICAgICAgICsraVxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogZHJvcCB0aGUgbGFzdCBuIGl0ZW1zIGZyb20gYW4gaXRlcmFibGVcclxuICogaWYgdGhlcmUgYXJlIGxlc3MgdGhhbiBuIGl0ZW1zLCBub25lIGFyZSB5aWVsZGVkXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZHJvcDxUPihhOiBJdGVyYWJsZTxUPiwgbjogbnVtYmVyKTogSXRlcmFibGU8VD4ge1xyXG4gICAgY29uc3Qgc2l6ZSA9IGNvdW50KGEpXHJcbiAgICByZXR1cm4gdGFrZShhLCBzaXplIC0gbilcclxufVxyXG5cclxuLyoqXHJcbiAqIHlpZWxkIG51bWJlcnMgb2YgdGhlIGZvcm0gW3N0YXJ0Li5lbmQpIHdoZXJlIGVuZCA9IHN0YXJ0ICsgbGVuZ3RoIC0gMVxyXG4gKiBAcGFyYW0gc3RhcnQgc3RhcnQgbnVtYmVyIG9yIGxlbmd0aCBpZiBvbmx5IG9uZSBhcmd1bWVudCBpcyBwcm92aWRlZFxyXG4gKiBAcGFyYW0gbGVuZ3RoIGxlbmd0aCBvZiBhcnJheVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uKiBzZXF1ZW5jZShzdGFydDogbnVtYmVyLCBsZW5ndGggPSAtMSk6IEl0ZXJhYmxlPG51bWJlcj4ge1xyXG4gICAgaWYgKGxlbmd0aCA9PT0gLTEpIHtcclxuICAgICAgICBsZW5ndGggPSBzdGFydFxyXG4gICAgICAgIHN0YXJ0ID0gMFxyXG4gICAgfVxyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcclxuICAgICAgICB5aWVsZCBpXHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiB5aWVsZCBlbGVtZW50cyBnaXZlbiBhIGxlbmd0aCBhbmQgYSBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGluZGV4XHJcbiAqIEBwYXJhbSBsZW5ndGggbGVuZ3RoIG9mIGdlbmVyYXRlZCBzZXF1ZW5jZVxyXG4gKiBAcGFyYW0gZiBmdW5jdGlvbiB0byBjYWxsIHdpdGggZWFjaCBpbmRleFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlPFQ+KGxlbmd0aDogbnVtYmVyLCBmOiAoaTogbnVtYmVyKSA9PiBUKTogSXRlcmFibGU8VD4ge1xyXG4gICAgcmV0dXJuIG1hcChzZXF1ZW5jZShsZW5ndGgpLCBmKVxyXG59XHJcblxyXG4vKipcclxuICogc29ydCBhbiBpdGVyYWJsZSBpbiBhc2NlbmRpbmcgb3JkZXIgYmFzZWQgb24gdGhlIHZhbHVlIHJldHVybmVkIGJ5IGZcclxuICogQHBhcmFtIGEgYXJyYXlcclxuICogQHBhcmFtIGYgdmFsdWUgc2VsZWN0aW9uIGZ1bmN0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gb3JkZXJCeTxULCBVPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IFUpOiBBcnJheTxUPiB7XHJcbiAgICByZXR1cm4gWy4uLmFdLnNvcnQoKHgsIHkpID0+IGYoeCkgPCBmKHkpID8gLTEgOiAxKVxyXG59XHJcblxyXG4vKipcclxuICogc29ydCBhbiBpdGVyYWJsZSBpbiBkZXNjZW5kaW5nIG9yZGVyIGJhc2VkIG9uIHRoZSB2YWx1ZSByZXR1cm5lZCBieSBmXHJcbiAqIEBwYXJhbSBhIGFycmF5XHJcbiAqIEBwYXJhbSBmIHZhbHVlIHNlbGVjdGlvbiBmdW5jdGlvblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG9yZGVyQnlEZXNjPFQsIFU+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAoeDogVCkgPT4gVSk6IEFycmF5PFQ+IHtcclxuICAgIHJldHVybiBbLi4uYV0uc29ydCgoeCwgeSkgPT4gZih5KSA8IGYoeCkgPyAtMSA6IDEpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjb25jYXRlbmF0ZSBpdGVyYWJsZXMsIHlpZWxkaW5nIGFsbCBlbGVtZW50cyBvZiBlYWNoXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24qIGNhdDxUPiguLi5hczogSXRlcmFibGU8VD5bXSk6IEl0ZXJhYmxlPFQ+IHtcclxuICAgIGZvciAoY29uc3QgYSBvZiBhcykge1xyXG4gICAgICAgIHlpZWxkKiBhXHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiByZXR1cm5zIHRoZSBmaXJzdCBlbGVtZW50IGluIGFuIGl0ZXJhYmxlIHNlcXVlbmNlLlxyXG4gKiBhbiBleGNlcHRpb24gaXMgdGhyb3duIGlmIHNlcXVlbmNlIGNvbnRhaW5zIG5vIGVsZW1lbnRzLlxyXG4gKiBAcGFyYW0gYXMgaXRlcmFibGUgc2VxdWVuY2VcclxuICogQHJldHVybnMgZmlyc3QgZWxlbWVudCBpbiBzZXF1ZW5jZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZpcnN0PFQ+KGFzOiBJdGVyYWJsZTxUPik6IFQge1xyXG4gICAgZm9yIChjb25zdCB4IG9mIGFzKSB7XHJcbiAgICAgICAgcmV0dXJuIHhcclxuICAgIH1cclxuXHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJTZXF1ZW5jZSBjb250YWluZWQgbm8gZWxlbWVudHMuXCIpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBcclxuICogQHBhcmFtIGRhdGEgZGF0YSB0byBleHRyYWN0IGEgcGFnZSBvZlxyXG4gKiBAcGFyYW0gcGFnZUluZGV4IGluZGV4IG9mIHBhZ2VcclxuICogQHBhcmFtIHBhZ2VTaXplIHNpemUgb2YgcGFnZVxyXG4gKiBAcmV0dXJucyBhIHBhZ2Ugb2YgdGhlIHNwZWNpZmllZCBkYXRhXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcGFnZTxUPihkYXRhOiBJdGVyYWJsZTxUPiwgcGFnZUluZGV4OiBudW1iZXIsIHBhZ2VTaXplOiBudW1iZXIpOiBUW10ge1xyXG4gICAgY29uc3QgYSA9IFsuLi5kYXRhXVxyXG4gICAgY29uc3Qgc3RhcnRJbmRleCA9IHBhZ2VJbmRleCAqIHBhZ2VTaXplXHJcbiAgICBjb25zdCBlbmRJbmRleCA9IHN0YXJ0SW5kZXggKyBwYWdlU2l6ZVxyXG4gICAgY29uc3QgcGFnZSA9IGEuc2xpY2Uoc3RhcnRJbmRleCwgZW5kSW5kZXgpXHJcbiAgICByZXR1cm4gcGFnZVxyXG59Il19