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

        return Error(x.toString())
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