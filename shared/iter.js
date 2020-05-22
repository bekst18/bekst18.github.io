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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIml0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFFSCxNQUFNLElBQUk7SUFDTixZQUE2QixDQUFjO1FBQWQsTUFBQyxHQUFELENBQUMsQ0FBYTtJQUFJLENBQUM7SUFFaEQ7O09BRUc7SUFDSCxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNkLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRTtZQUNwQixNQUFNLENBQUMsQ0FBQTtTQUNWO0lBQ0wsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFpQjtRQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNmLE9BQU8sSUFBSSxDQUFBO0lBQ2YsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQW9CO1FBQ3BCLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFvQjtRQUNwQixPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFFRCxPQUFPLENBQUMsQ0FBSTtRQUNSLE9BQU8sSUFBSSxJQUFJLENBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsTUFBTSxDQUFDLENBQUk7UUFDUCxPQUFPLElBQUksSUFBSSxDQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVELEdBQUcsQ0FBSSxDQUFjO1FBQ2pCLE9B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dEQsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUksR0FBRyxFQUFpQjtJQUN4QyxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNoQixLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FDWDtBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogdXRpbGl0eSBmdW5jdGlvbnMgZm9yIGl0ZXJhYmxlc1xyXG4gKi9cclxuXHJcbmNsYXNzIEl0ZXI8VD4ge1xyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBhOiBJdGVyYWJsZTxUPikgeyB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBpdGVyYXRlIG92ZXIgYWxsIGRhdGEgaW4gZ3JpZFxyXG4gICAgICovXHJcbiAgICAqW1N5bWJvbC5pdGVyYXRvcl0oKSB7XHJcbiAgICAgICAgZm9yIChjb25zdCB4IG9mIHRoaXMuYSkge1xyXG4gICAgICAgICAgICB5aWVsZCB4XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGVhY2goZjogKHg6IFQpID0+IHZvaWQpIHtcclxuICAgICAgICBlYWNoKHRoaXMuYSwgZilcclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfVxyXG5cclxuICAgIGRpc3RpbmN0KCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSXRlcihkaXN0aW5jdCh0aGlzLmEpKVxyXG4gICAgfVxyXG5cclxuICAgIGFueShmOiAoeDogVCkgPT4gYm9vbGVhbik6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiBhbnkodGhpcy5hLCBmKVxyXG4gICAgfVxyXG5cclxuICAgIGFsbChmOiAoeDogVCkgPT4gYm9vbGVhbik6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiBhbGwodGhpcy5hLCBmKVxyXG4gICAgfVxyXG5cclxuICAgIHByZXBlbmQoeDogVCk6IEl0ZXI8VD4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgSXRlcjxUPihwcmVwZW5kKHRoaXMuYSwgeCkpXHJcbiAgICB9XHJcblxyXG4gICAgYXBwZW5kKHg6IFQpOiBJdGVyPFQ+IHtcclxuICAgICAgICByZXR1cm4gbmV3IEl0ZXI8VD4oYXBwZW5kKHRoaXMuYSwgeCkpXHJcbiAgICB9XHJcblxyXG4gICAgbWFwPFU+KGY6ICh4OiBUKSA9PiBVKTogSXRlcjxVPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJdGVyPFU+KG1hcCh0aGlzLmEsIGYpKVxyXG4gICAgfVxyXG5cclxuICAgIG1hcERpc3RpbmN0PFU+KGY6ICh4OiBUKSA9PiBVKTogSXRlcjxVPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJdGVyPFU+KG1hcERpc3RpbmN0KHRoaXMuYSwgZikpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb3VudCB0aGUgbnVtYmVyIG9mIGl0ZW1zIGluIGFuIGl0ZXJhYmxlXHJcbiAgICAgKi9cclxuICAgIGNvdW50KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIGNvdW50KHRoaXMuYSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNvdW50IHRoZSBudW1iZXIgb2YgaXRlbXMgaW4gYW4gaXRlcmFibGVcclxuICAgICAqL1xyXG4gICAgY291bnREaXN0aW5jdCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBjb3VudERpc3RpbmN0KHRoaXMuYSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNvdW50IHRoZSBudW1iZXIgb2YgaXRlbXMgaW4gYW4gaXRlcmFibGUgdGhhdCBtZWV0IGNvbmRpdGlvbnMgaW4gcHJlZGljYXRlXHJcbiAgICAgKiBAcGFyYW0gZiBwcmVkaWNhdGVcclxuICAgICAqL1xyXG4gICAgY291bnRJZihmOiAoeDogVCkgPT4gYm9vbGVhbik6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIGNvdW50SWYodGhpcy5hLCBmKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRmlsdGVyIGFuIGl0ZXJhYmxlIGJhc2VkIG9uIGEgcHJlZGljYXRcclxuICAgICAqIEtlZXBzIGFsbCBlbGVtZW50cyBmb3Igd2hpY2ggcHJlZGljYXRlIHJldHVybnMgdHJ1ZVxyXG4gICAgICogQHBhcmFtIGYgcHJlZGljYXRlIHRvIGZpbHRlciB3aXRoXHJcbiAgICAgKi9cclxuICAgIGZpbHRlcihmPzogKHg6IFQpID0+IGJvb2xlYW4pOiBJdGVyPFQ+IHtcclxuICAgICAgICByZXR1cm4gbmV3IEl0ZXIoZmlsdGVyKHRoaXMuYSwgZikpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBhY2N1bXVsYXRlIHRoZSByZXN1bHRzIG9mIGEgZnVuY3Rpb24gYWNyb3NzIGFuIGl0ZXJhYmxlXHJcbiAgICAgKiBAcGFyYW0gYSBhcnJheSB0byByZWR1Y2VcclxuICAgICAqIEBwYXJhbSBmIHJlZHVjdGlvbiBmdW5jdGlvblxyXG4gICAgICogQHBhcmFtIGluaXRpYWxWYWx1ZSBpbml0aWFsIHZhbHVlXHJcbiAgICAgKi9cclxuICAgIHJlZHVjZTxVPihmOiAocHJldmlvdXNWYWx1ZTogVSwgY3VycmVudFZhbHVlOiBUKSA9PiBVLCBpbml0aWFsVmFsdWU6IFUpOiBVIHtcclxuICAgICAgICByZXR1cm4gcmVkdWNlKHRoaXMuYSwgZiwgaW5pdGlhbFZhbHVlKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmV0dXJucyB0aGUgZmlyc3QgaXRlbSBpbiB0aGUgaXRlcmFibGUgdGhhdCBzYXRpc2ZpZXMgdGhlIHByZWRpY2F0ZVxyXG4gICAgICogQHBhcmFtIGEgaXRlcmFibGVcclxuICAgICAqIEBwYXJhbSBmIHByZWRpY2F0ZSBmdW5jdGlvblxyXG4gICAgICovXHJcbiAgICBmaW5kKGY6ICh4OiBUKSA9PiBib29sZWFuKTogKFQgfCBudWxsKSB7XHJcbiAgICAgICAgcmV0dXJuIGZpbmQodGhpcy5hLCBmKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogeWllbGQgdGhlIGZpcnN0IG4gaXRlbXMgaW4gYW4gaXRlcmFibGVcclxuICAgICAqIGlmIHRoZXJlIGFyZSBtb3JlIHRoYW4gbiBpdGVtcywgYWxsIGl0ZW1zIGFyZSBrZXB0XHJcbiAgICAgKi9cclxuICAgIHRha2UobjogbnVtYmVyKTogSXRlcmFibGU8VD4ge1xyXG4gICAgICAgIHJldHVybiB0YWtlKHRoaXMuYSwgbilcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGRyb3AgdGhlIGxhc3QgbiBpdGVtcyBmcm9tIGFuIGl0ZXJhYmxlXHJcbiAgICAgKiBpZiB0aGVyZSBhcmUgbGVzcyB0aGFuIG4gaXRlbXMsIG5vbmUgYXJlIHlpZWxkZWRcclxuICAgICAqL1xyXG4gICAgZHJvcChuOiBudW1iZXIpOiBJdGVyYWJsZTxUPiB7XHJcbiAgICAgICAgcmV0dXJuIGRyb3AodGhpcy5hLCBuKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgKiBzb3J0IGFuIGFycmF5IGluIGFzY2VuZGluZyBvcmRlciBiYXNlZCBvbiB0aGUgdmFsdWUgcmV0dXJuZWQgYnkgZlxyXG4gICAgKiBAcGFyYW0gZiB2YWx1ZSBzZWxlY3Rpb24gZnVuY3Rpb25cclxuICAgICovXHJcbiAgICBvcmRlckJ5PFU+KGY6ICh4OiBUKSA9PiBVKTogSXRlcjxUPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJdGVyKFsuLi50aGlzLmFdLnNvcnQoKHgsIHkpID0+IGYoeCkgPCBmKHkpID8gLTEgOiAxKSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHNvcnQgYW4gYXJyYXkgaW4gZGVzY2VuZGluZyBvcmRlciBiYXNlZCBvbiB0aGUgdmFsdWUgcmV0dXJuZWQgYnkgZlxyXG4gICAgICogQHBhcmFtIGYgdmFsdWUgc2VsZWN0aW9uIGZ1bmN0aW9uXHJcbiAgICAgKi9cclxuICAgIG9yZGVyQnlEZXNjPFU+KGY6ICh4OiBUKSA9PiBVKTogSXRlcjxUPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJdGVyKFsuLi50aGlzLmFdLnNvcnQoKHgsIHkpID0+IGYoeSkgPCBmKHgpID8gLTEgOiAxKSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNvbmNhdGVuYXRlIGl0ZXJhYmxlcywgeWllbGRpbmcgYWxsIGVsZW1lbnRzIG9mIGVhY2hcclxuICAgICovXHJcbiAgICBjYXQoLi4uYXM6IEl0ZXJhYmxlPFQ+W10pOiBJdGVyYWJsZTxUPiB7XHJcbiAgICAgICAgcmV0dXJuIGNhdCh0aGlzLmEsIC4uLmFzKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29udmVydCB0byBhbiBhcnJheVxyXG4gICAgICovXHJcbiAgICB0b0FycmF5KCk6IFRbXSB7XHJcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLmFdXHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBpbnZva2UgYSBmdW5jdGlvbiBvbiBldmVyeSBlbGVtZW50IG9mIHRoZSBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gZiBmdW5jdGlvblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGVhY2g8VD4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiB2b2lkKTogdm9pZCB7XHJcbiAgICBmb3IgKGNvbnN0IHggb2YgYSkge1xyXG4gICAgICAgIGYoeClcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIHdyYXBzIHRoZSBpdGVyYWJsZSB0eXBlIHdpdGggSXRlciBmb3IgZWFzeSBjaGFpbmVkIGNhbGxzXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlIHRvIHdyYXBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB3cmFwPFQ+KGE6IEl0ZXJhYmxlPFQ+KTogSXRlcjxUPiB7XHJcbiAgICByZXR1cm4gbmV3IEl0ZXIoYSlcclxufVxyXG5cclxuLyoqXHJcbiAqIHRydWUgaWYgYW55IGl0ZW0gaW4gdGhlIGl0ZXJhYmxlIHNhdGlzZmllcyBwcmVkaWNhdGVcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICogQHBhcmFtIGYgcHJlZGljYXRlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYW55PFQ+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAoeDogVCkgPT4gYm9vbGVhbik6IGJvb2xlYW4ge1xyXG4gICAgZm9yIChjb25zdCB4IG9mIGEpIHtcclxuICAgICAgICBpZiAoZih4KSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2VcclxufVxyXG5cclxuLyoqXHJcbiAqIHRydWUgaWYgYWxsIGl0ZW1zIGluIHRoZSBpdGVyYWJsZSBzYXRpc2Z5IHByZWRpY2F0ZVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gZiBwcmVkaWNhdGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhbGw8VD4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBib29sZWFuKSB7XHJcbiAgICBmb3IgKGNvbnN0IHggb2YgYSkge1xyXG4gICAgICAgIGlmICghZih4KSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWVcclxufVxyXG5cclxuLyoqXHJcbiAqIGFwcGVuZCBhbiBpdGVtIHRvIGVuZCBvZiBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKiBAcGFyYW0geCBpdGVtIHRvIGFwcGVuZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uKiBhcHBlbmQ8VD4oYTogSXRlcmFibGU8VD4sIHg6IFQpOiBHZW5lcmF0b3I8VD4ge1xyXG4gICAgZm9yIChjb25zdCB5IG9mIGEpIHtcclxuICAgICAgICB5aWVsZCB5XHJcbiAgICB9XHJcblxyXG4gICAgeWllbGQgeFxyXG59XHJcblxyXG4vKipcclxuICogcHJlcGVuZCBhbiBpdGVtIHRvIHN0YXJ0IG9mIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSB4IGl0ZW0gdG8gcHJlcGVuZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uKiBwcmVwZW5kPFQ+KGE6IEl0ZXJhYmxlPFQ+LCB4OiBUKTogR2VuZXJhdG9yPFQ+IHtcclxuICAgIHlpZWxkIHhcclxuXHJcbiAgICBmb3IgKGNvbnN0IHkgb2YgYSkge1xyXG4gICAgICAgIHlpZWxkIHlcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIGlkZW50aXR5IGZ1bmN0aW9uLCByZXR1cm5zIGl0c2VsZlxyXG4gKiBAcGFyYW0geCB2YWx1ZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlkZW50aXR5PFQ+KHg6IFQpOiBUIHtcclxuICAgIHJldHVybiB4XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbGlzdCBvZiBkaXN0aW5jdCB2YWx1ZXMgZnJvbSBhIC0gZG9lcyBOT1QgcHJlc2VydmUgb3JkZXJcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBkaXN0aW5jdDxUPihhOiBJdGVyYWJsZTxUPik6IEl0ZXJhYmxlPFQ+IHtcclxuICAgIHJldHVybiBuZXcgU2V0KGEpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBtYXAgZWFjaCBlbGVtZW50IG9mIGEgdG8gYW4gZWxlbWVudCBpbiBhIG5ldyBhcnJheVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKiBAcGFyYW0gZiBtYXBwaW5nIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgb24gZWFjaCBlbGVtZW50XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24qIG1hcDxULCBVPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IFUpOiBJdGVyYWJsZTxVPiB7XHJcbiAgICBmb3IgKGNvbnN0IHggb2YgYSkge1xyXG4gICAgICAgIHlpZWxkIGYoeClcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBsaXN0IG9mIHVuaXF1ZSB2YWx1ZXMgZnJvbSBhLCB0aGVuIGludm9rZXMgbWFwIGZ1bmN0aW9uIGZvciBlYWNoXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWFwRGlzdGluY3Q8VCwgVT4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBVKTogSXRlcmFibGU8VT4ge1xyXG4gICAgcmV0dXJuIG1hcChkaXN0aW5jdChhKSwgZilcclxufVxyXG5cclxuLyoqXHJcbiAqIGNvdW50IHRoZSBudW1iZXIgb2YgaXRlbXMgaW4gYW4gaXRlcmFibGVcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjb3VudDxUPihhOiBJdGVyYWJsZTxUPik6IG51bWJlciB7XHJcbiAgICBsZXQgciA9IDBcclxuICAgIGZvciAoY29uc3QgXyBvZiBhKSB7XHJcbiAgICAgICAgKytyXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJcclxufVxyXG5cclxuLyoqXHJcbiAqIGNvdW50IHRoZSBudW1iZXIgb2YgaXRlbXMgaW4gYW4gaXRlcmFibGVcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjb3VudERpc3RpbmN0PFQ+KGE6IEl0ZXJhYmxlPFQ+KTogbnVtYmVyIHtcclxuICAgIHJldHVybiBjb3VudChkaXN0aW5jdChhKSlcclxufVxyXG5cclxuLyoqXHJcbiAqIGNvdW50IHRoZSBudW1iZXIgb2YgaXRlbXMgaW4gYW4gaXRlcmFibGUgdGhhdCBtZWV0IGNvbmRpdGlvbnMgaW4gcHJlZGljYXRlXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBmIHByZWRpY2F0ZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50SWY8VD4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBib29sZWFuKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBjb3VudChmaWx0ZXIoYSwgZikpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBwcmVkaWNhdGUgdG8gdGVzdCBqYXZhc2NyaXB0IHRydXRoaW5lc3NcclxuICogQHBhcmFtIHggdmFsdWUgdG8gdGVzdCBmb3IgdHJ1dGhpbmVzc1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHRydXRoeTxUPih4OiBUKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4geCA/IHRydWUgOiBmYWxzZVxyXG59XHJcblxyXG4vKipcclxuICogRmlsdGVyIGFuIGl0ZXJhYmxlIGJhc2VkIG9uIGEgcHJlZGljYXRcclxuICogS2VlcHMgYWxsIGVsZW1lbnRzIGZvciB3aGljaCBwcmVkaWNhdGUgcmV0dXJucyB0cnVlXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlIHRvIGZpbHRlcmVcclxuICogQHBhcmFtIGYgcHJlZGljYXRlIHRvIGZpbHRlciB3aXRoXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24qIGZpbHRlcjxUPihhOiBJdGVyYWJsZTxUPiwgZjogKHg6IFQpID0+IGJvb2xlYW4gPSB0cnV0aHkpOiBJdGVyYWJsZTxUPiB7XHJcbiAgICBmb3IgKGNvbnN0IHggb2YgYSkge1xyXG4gICAgICAgIGlmIChmKHgpKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHhcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBhY2N1bXVsYXRlIHRoZSByZXN1bHRzIG9mIGEgZnVuY3Rpb24gYWNyb3NzIGFuIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBhIGFycmF5IHRvIHJlZHVjZVxyXG4gKiBAcGFyYW0gZiByZWR1Y3Rpb24gZnVuY3Rpb25cclxuICogQHBhcmFtIGluaXRpYWxWYWx1ZSBpbml0aWFsIHZhbHVlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVkdWNlPFQsIFU+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAocHJldmlvdXNWYWx1ZTogVSwgY3VycmVudFZhbHVlOiBUKSA9PiBVLCBpbml0aWFsVmFsdWU6IFUpOiBVIHtcclxuICAgIGxldCB2YWx1ZSA9IGluaXRpYWxWYWx1ZVxyXG4gICAgZm9yIChjb25zdCB4IG9mIGEpIHtcclxuICAgICAgICB2YWx1ZSA9IGYodmFsdWUsIHgpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZhbHVlXHJcbn1cclxuXHJcbi8qKlxyXG4gKiByZXR1cm5zIHRoZSBmaXJzdCBpdGVtIGluIHRoZSBpdGVyYWJsZSB0aGF0IHNhdGlzZmllcyB0aGUgcHJlZGljYXRlXHJcbiAqIEBwYXJhbSBhIGl0ZXJhYmxlXHJcbiAqIEBwYXJhbSBmIHByZWRpY2F0ZSBmdW5jdGlvblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbmQ8VD4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBib29sZWFuKTogKFQgfCBudWxsKSB7XHJcbiAgICBmb3IgKGNvbnN0IHggb2YgYSkge1xyXG4gICAgICAgIGlmIChmKHgpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB4XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsXHJcbn1cclxuXHJcbi8qKlxyXG4gKiB5aWVsZCB0aGUgZmlyc3QgbiBpdGVtcyBpbiBhbiBpdGVyYWJsZVxyXG4gKiBpZiB0aGVyZSBhcmUgbW9yZSB0aGFuIG4gaXRlbXMsIGFsbCBpdGVtcyBhcmUga2VwdFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uKiB0YWtlPFQ+KGE6IEl0ZXJhYmxlPFQ+LCBuOiBudW1iZXIpOiBJdGVyYWJsZTxUPiB7XHJcbiAgICBsZXQgaSA9IDBcclxuICAgIGZvciAoY29uc3QgeCBvZiBhKSB7XHJcbiAgICAgICAgaWYgKGkgPj0gbikge1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgICAgICB5aWVsZCB4XHJcbiAgICAgICAgKytpXHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBkcm9wIHRoZSBsYXN0IG4gaXRlbXMgZnJvbSBhbiBpdGVyYWJsZVxyXG4gKiBpZiB0aGVyZSBhcmUgbGVzcyB0aGFuIG4gaXRlbXMsIG5vbmUgYXJlIHlpZWxkZWRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBkcm9wPFQ+KGE6IEl0ZXJhYmxlPFQ+LCBuOiBudW1iZXIpOiBJdGVyYWJsZTxUPiB7XHJcbiAgICBjb25zdCBzaXplID0gY291bnQoYSlcclxuICAgIHJldHVybiB0YWtlKGEsIHNpemUgLSBuKVxyXG59XHJcblxyXG4vKipcclxuICogeWllbGQgbnVtYmVycyBvZiB0aGUgZm9ybSBbc3RhcnQuLmVuZCkgd2hlcmUgZW5kID0gc3RhcnQgKyBsZW5ndGggLSAxXHJcbiAqIEBwYXJhbSBzdGFydCBzdGFydCBudW1iZXIgb3IgbGVuZ3RoIGlmIG9ubHkgb25lIGFyZ3VtZW50IGlzIHByb3ZpZGVkXHJcbiAqIEBwYXJhbSBsZW5ndGggbGVuZ3RoIG9mIGFycmF5XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24qIHNlcXVlbmNlKHN0YXJ0OiBudW1iZXIsIGxlbmd0aCA9IC0xKTogSXRlcmFibGU8bnVtYmVyPiB7XHJcbiAgICBpZiAobGVuZ3RoID09PSAtMSkge1xyXG4gICAgICAgIGxlbmd0aCA9IHN0YXJ0XHJcbiAgICAgICAgc3RhcnQgPSAwXHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xyXG4gICAgICAgIHlpZWxkIGlcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIHlpZWxkIGVsZW1lbnRzIGdpdmVuIGEgbGVuZ3RoIGFuZCBhIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggaW5kZXhcclxuICogQHBhcmFtIGxlbmd0aCBsZW5ndGggb2YgZ2VuZXJhdGVkIHNlcXVlbmNlXHJcbiAqIEBwYXJhbSBmIGZ1bmN0aW9uIHRvIGNhbGwgd2l0aCBlYWNoIGluZGV4XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGU8VD4obGVuZ3RoOiBudW1iZXIsIGY6IChpOiBudW1iZXIpID0+IFQpOiBJdGVyYWJsZTxUPiB7XHJcbiAgICByZXR1cm4gbWFwKHNlcXVlbmNlKGxlbmd0aCksIGYpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBzb3J0IGFuIGl0ZXJhYmxlIGluIGFzY2VuZGluZyBvcmRlciBiYXNlZCBvbiB0aGUgdmFsdWUgcmV0dXJuZWQgYnkgZlxyXG4gKiBAcGFyYW0gYSBhcnJheVxyXG4gKiBAcGFyYW0gZiB2YWx1ZSBzZWxlY3Rpb24gZnVuY3Rpb25cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBvcmRlckJ5PFQsIFU+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAoeDogVCkgPT4gVSk6IEFycmF5PFQ+IHtcclxuICAgIHJldHVybiBbLi4uYV0uc29ydCgoeCwgeSkgPT4gZih4KSA8IGYoeSkgPyAtMSA6IDEpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBzb3J0IGFuIGl0ZXJhYmxlIGluIGRlc2NlbmRpbmcgb3JkZXIgYmFzZWQgb24gdGhlIHZhbHVlIHJldHVybmVkIGJ5IGZcclxuICogQHBhcmFtIGEgYXJyYXlcclxuICogQHBhcmFtIGYgdmFsdWUgc2VsZWN0aW9uIGZ1bmN0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gb3JkZXJCeURlc2M8VCwgVT4oYTogSXRlcmFibGU8VD4sIGY6ICh4OiBUKSA9PiBVKTogQXJyYXk8VD4ge1xyXG4gICAgcmV0dXJuIFsuLi5hXS5zb3J0KCh4LCB5KSA9PiBmKHkpIDwgZih4KSA/IC0xIDogMSlcclxufVxyXG5cclxuLyoqXHJcbiAqIGNvbmNhdGVuYXRlIGl0ZXJhYmxlcywgeWllbGRpbmcgYWxsIGVsZW1lbnRzIG9mIGVhY2hcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiogY2F0PFQ+KC4uLmFzOiBJdGVyYWJsZTxUPltdKTogSXRlcmFibGU8VD4ge1xyXG4gICAgZm9yIChjb25zdCBhIG9mIGFzKSB7XHJcbiAgICAgICAgeWllbGQqIGFcclxuICAgIH1cclxufSJdfQ==