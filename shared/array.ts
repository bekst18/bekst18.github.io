
/**
 * returns an array of the form [start..end) where end = start + length - 1
 * @param start start number or length if only one argument is provided
 * @param length length of array
 */
export function sequence(start: number, length = -1): number[] {
    if (length === -1) {
        length = start
        start = 0
    }

    const a: number[] = []
    for (let i = 0; i < length; ++i) {
        a.push(i + start)
    }

    return a
}

/**
 * generate an array given it's length and a function to call for each index
 * @param length length of array
 * @param f function to call with each index
 */
export function generate<T>(length: number, f: (i: number) => T) {
    const a: T[] = []
    for (let i = 0; i < length; ++i) {
        a.push(f(i))
    }

    return a
}

/**
 * returns an array of the specified length filled with the specified value
 * @param value value to fill array with
 * @param length length of array
 */
export function uniform<T>(value: T, length: number): T[] {
    const a: T[] = []
    for (let i = 0; i < length; ++i) {
        a.push(value)
    }

    return a
}

/**
 * Creates a list of distinct values from a
 * @param a iterable
 */
export function distinct<T>(a: Iterable<T>): T[] {
    return [...new Set(a)]
}

/**
 * Creates a list of unique values from a
 * @param a iterable
 */
export function mapDistinct<T, U>(a: Iterable<T>, f: (x: T) => U): U[] {
    return distinct([...a].map(f))
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
 * map each element of a to an element in a new array
 * @param a iterable
 * @param f mapping function to execute on each element
 */
export function map<T, U>(a: Iterable<T>, f: (x: T) => U): U[] {
    const r: U[] = []
    for (const x of a) {
        r.push(f(x))
    }

    return r
}

/**
 * pop, throwing an exception if the array is empty
 * @param a array with length 1 or greater
 */
export function pop<T>(a: T[]): T {
    const elem = a.pop()
    if (elem === undefined) {
        throw new Error("pop returned undefined, array may have been empty")
    }

    return elem
}