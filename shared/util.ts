/**
 * Shared utility library
 */

// try the specified function, return either the result or an error if an exception occured
export function tryf<T>(f: () => T): T | Error {
    try {
        return f()
    }
    catch (x) {
        if (x instanceof Error) {
            return x
        }

        return Error(`${x}`)
    }
}

export function bench(name: string, f: () => void) {
    const startTime = performance.now()
    // console.log(`${startTime}: start ${name} ms`)
    f()
    const endTime = performance.now()
    // console.log(`${endTime}: end ${name} ms`)
    console.log(`${name} elapsed ${endTime - startTime} ms`)
}

/**
 * compare two primitive objects
 * @param x first object to compare
 * @param y second object to compare
 */
export function compare<T>(x: T, y: T): number {
    if (x < y) {
        return -1
    } else if (x > y) {
        return 1
    }

    return 0
}

/**
 * wait, and then resolve
 * @param ms milliseconds to wait
 */
export function wait(ms: number): Promise<void> {
    const promise = new Promise<void>((resolve, _) => {
        setTimeout(() => resolve(), ms)
    })

    return promise
}