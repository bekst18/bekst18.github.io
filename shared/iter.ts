/**
 * utility functions for iterables
 */

class Iter<T> {
    constructor(private readonly a: Iterable<T>) { }

    /**
     * iterate over all data in grid
     */
    *[Symbol.iterator]() {
        for (const x of this.a) {
            yield x
        }
    }

    each(f: (x: T) => void) {
        each(this.a, f)
        return this
    }

    distinct() {
        return new Iter(distinct(this.a))
    }

    any(f: (x: T) => boolean): boolean {
        return any(this.a, f)
    }

    all(f: (x: T) => boolean): boolean {
        return all(this.a, f)
    }

    prepend(x: T): Iter<T> {
        return new Iter<T>(prepend(this.a, x))
    }

    append(x: T): Iter<T> {
        return new Iter<T>(append(this.a, x))
    }

    map<U>(f: (x: T) => U): Iter<U> {
        return new Iter<U>(map(this.a, f))
    }

    mapDistinct<U>(f: (x: T) => U): Iter<U> {
        return new Iter<U>(mapDistinct(this.a, f))
    }

    /**
     * count the number of items in an iterable
     */
    count(): number {
        return count(this.a)
    }

    /**
     * count the number of items in an iterable
     */
    countDistinct(): number {
        return countDistinct(this.a)
    }

    /**
     * count the number of items in an iterable that meet conditions in predicate
     * @param f predicate
     */
    countIf(f: (x: T) => boolean): number {
        return countIf(this.a, f)
    }

    /**
     * Filter an iterable based on a predicat
     * Keeps all elements for which predicate returns true
     * @param f predicate to filter with
     */
    filter(f?: (x: T) => boolean): Iter<T> {
        return new Iter(filter(this.a, f))
    }

    /**
     * accumulate the results of a function across an iterable
     * @param a array to reduce
     * @param f reduction function
     * @param initialValue initial value
     */
    reduce<U>(f: (previousValue: U, currentValue: T) => U, initialValue: U): U {
        return reduce(this.a, f, initialValue)
    }

    /**
     * returns the first item in the iterable that satisfies the predicate
     * @param a iterable
     * @param f predicate function
     */
    find(f: (x: T) => boolean): (T | null) {
        return find(this.a, f)
    }

    /**
     * yield the first n items in an iterable
     * if there are more than n items, all items are kept
     */
    take(n: number): Iterable<T> {
        return take(this.a, n)
    }

    /**
     * drop the last n items from an iterable
     * if there are less than n items, none are yielded
     */
    drop(n: number): Iterable<T> {
        return drop(this.a, n)
    }

    /**
    * sort an array in ascending order based on the value returned by f
    * @param f value selection function
    */
    orderBy<U>(f: (x: T) => U): Iter<T> {
        return new Iter([...this.a].sort((x, y) => f(x) < f(y) ? -1 : 1))
    }

    /**
     * sort an array in descending order based on the value returned by f
     * @param f value selection function
     */
    orderByDesc<U>(f: (x: T) => U): Iter<T> {
        return new Iter([...this.a].sort((x, y) => f(y) < f(x) ? -1 : 1))
    }

    /**
     * concatenate iterables, yielding all elements of each
    */
    cat(...as: Iterable<T>[]): Iterable<T> {
        return cat(this.a, ...as)
    }

    /**
     * convert to an array
     */
    toArray(): T[] {
        return [...this.a]
    }
}

/**
 * invoke a function on every element of the iterable
 * @param a iterable
 * @param f function
 */
export function each<T>(a: Iterable<T>, f: (x: T) => void): void {
    for (const x of a) {
        f(x)
    }
}

/**
 * wraps the iterable type with Iter for easy chained calls
 * @param a iterable to wrap
 */
export function wrap<T>(a: Iterable<T>): Iter<T> {
    return new Iter(a)
}

/**
 * true if any item in the iterable satisfies predicate
 * @param a iterable
 * @param f predicate
 */
export function any<T>(a: Iterable<T>, f: (x: T) => boolean): boolean {
    for (const x of a) {
        if (f(x)) {
            return true
        }
    }

    return false
}

/**
 * true if all items in the iterable satisfy predicate
 * @param a iterable
 * @param f predicate
 */
export function all<T>(a: Iterable<T>, f: (x: T) => boolean) {
    for (const x of a) {
        if (!f(x)) {
            return false
        }
    }

    return true
}

/**
 * append an item to end of iterable
 * @param a iterable
 * @param x item to append
 */
export function* append<T>(a: Iterable<T>, x: T): Generator<T> {
    for (const y of a) {
        yield y
    }

    yield x
}

/**
 * prepend an item to start of iterable
 * @param a iterable
 * @param x item to prepend
 */
export function* prepend<T>(a: Iterable<T>, x: T): Generator<T> {
    yield x

    for (const y of a) {
        yield y
    }
}

/**
 * identity function, returns itself
 * @param x value
 */
export function identity<T>(x: T): T {
    return x
}

/**
 * Creates a list of distinct values from a - does NOT preserve order
 * @param a iterable
 */
export function distinct<T>(a: Iterable<T>): Iterable<T> {
    return new Set(a)
}

/**
 * map each element of a to an element in a new array
 * @param a iterable
 * @param f mapping function to execute on each element
 */
export function* map<T, U>(a: Iterable<T>, f: (x: T) => U): Iterable<U> {
    for (const x of a) {
        yield f(x)
    }
}

/**
 * Creates a list of unique values from a, then invokes map function for each
 * @param a iterable
 */
export function mapDistinct<T, U>(a: Iterable<T>, f: (x: T) => U): Iterable<U> {
    return map(distinct(a), f)
}

/**
 * count the number of items in an iterable
 * @param a iterable
 */
export function count<T>(a: Iterable<T>): number {
    let r = 0
    for (const _ of a) {
        ++r
    }

    return r
}

/**
 * count the number of items in an iterable
 * @param a iterable
 */
export function countDistinct<T>(a: Iterable<T>): number {
    return count(distinct(a))
}

/**
 * count the number of items in an iterable that meet conditions in predicate
 * @param a iterable
 * @param f predicate
 */
export function countIf<T>(a: Iterable<T>, f: (x: T) => boolean): number {
    return count(filter(a, f))
}

/**
 * predicate to test javascript truthiness
 * @param x value to test for truthiness
 */
export function truthy<T>(x: T): boolean {
    return x ? true : false
}

/**
 * Filter an iterable based on a predicat
 * Keeps all elements for which predicate returns true
 * @param a iterable to filtere
 * @param f predicate to filter with
 */
export function* filter<T>(a: Iterable<T>, f: (x: T) => boolean = truthy): Iterable<T> {
    for (const x of a) {
        if (f(x)) {
            yield x
        }
    }
}

/**
 * accumulate the results of a function across an iterable
 * @param a array to reduce
 * @param f reduction function
 * @param initialValue initial value
 */
export function reduce<T, U>(a: Iterable<T>, f: (previousValue: U, currentValue: T) => U, initialValue: U): U {
    let value = initialValue
    for (const x of a) {
        value = f(value, x)
    }

    return value
}

/**
 * returns the first item in the iterable that satisfies the predicate
 * @param a iterable
 * @param f predicate function
 */
export function find<T>(a: Iterable<T>, f: (x: T) => boolean): (T | null) {
    for (const x of a) {
        if (f(x)) {
            return x
        }
    }

    return null
}

/**
 * yield the first n items in an iterable
 * if there are more than n items, all items are kept
 */
export function* take<T>(a: Iterable<T>, n: number): Iterable<T> {
    let i = 0
    for (const x of a) {
        if (i >= n) {
            break
        }
        yield x
        ++i
    }
}

/**
 * drop the last n items from an iterable
 * if there are less than n items, none are yielded
 */
export function drop<T>(a: Iterable<T>, n: number): Iterable<T> {
    const size = count(a)
    return take(a, size - n)
}

/**
 * yield numbers of the form [start..end) where end = start + length - 1
 * @param start start number or length if only one argument is provided
 * @param length length of array
 */
export function* sequence(start: number, length = -1): Iterable<number> {
    if (length === -1) {
        length = start
        start = 0
    }

    for (let i = 0; i < length; ++i) {
        yield i
    }
}

/**
 * yield elements given a length and a function to call for each index
 * @param length length of generated sequence
 * @param f function to call with each index
 */
export function generate<T>(length: number, f: (i: number) => T): Iterable<T> {
    return map(sequence(length), f)
}

/**
 * sort an iterable in ascending order based on the value returned by f
 * @param a array
 * @param f value selection function
 */
export function orderBy<T, U>(a: Iterable<T>, f: (x: T) => U): Array<T> {
    return [...a].sort((x, y) => f(x) < f(y) ? -1 : 1)
}

/**
 * sort an iterable in descending order based on the value returned by f
 * @param a array
 * @param f value selection function
 */
export function orderByDesc<T, U>(a: Iterable<T>, f: (x: T) => U): Array<T> {
    return [...a].sort((x, y) => f(y) < f(x) ? -1 : 1)
}

/**
 * concatenate iterables, yielding all elements of each
 */
export function* cat<T>(...as: Iterable<T>[]): Iterable<T> {
    for (const a of as) {
        yield* a
    }
}