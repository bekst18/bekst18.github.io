/**
 * choose a uniform random float from interval [min, max)
 * @param min min value to return
 * @param max max value to return
 */
export function float(min: number, max: number): number {
    const range = max - min;
    return Math.random() * range + min
}

/**
 * choose a uniform random integer from interval [min, max)
 * @param min 
 * @param max 
 */
export function int(min: number, max: number): number {
    return Math.floor(float(min, max))
}

/**
 * choose a random element from the specified array
 * @param list array-like object to select a random element from
 */
export function choose<T>(a: ArrayLike<T>) {
    const idx = int(0, a.length)
    return a[idx]
}

/**
 * randomly shuffle the specified array in place
 * @param a array to shuffle
 */
export function shuffle<T>(a: Array<T>) : Array<T>{
    for (let i = a.length - 1; i >= 0; --i) {
        const j = Math.floor(Math.random() * i)
        const tmp = a[i]
        a[i] = a[j]
        a[j] = tmp
    }

    return a
}

/**
 * returns true x% of the time
 * @param x true chance
 */
export function chance(x: number): boolean {
    return Math.random() < x
}