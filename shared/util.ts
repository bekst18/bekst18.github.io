/**
 * Shared utility library
 */

export type EventSource = Document | Window | HTMLElement

export interface Offset {
    top: number
    left: number
}

/**
 * Retrieve an element given its id
 * Throws an exception if element is not found
 */
export function byId(id: string): HTMLElement {
    const elem = document.getElementById(id)
    if (!elem) {
        throw Error(`elem with id ${id} was not found`)
    }

    return elem
}

/**
 * Find first element that matches selector
 * throws an exception if not found
 * @param elem elem whose children to query
 * @param selector selector to apply
 */
export function bySelector(elem: ParentNode, selector: string) {
    const result = elem.querySelector(selector)
    if (result == null) {
        throw Error(`An element matching ${selector} was not found.`)
    }

    return result
}


/**
 * Attach a delegated event listener to an element
 * Listener is only invoked if element matches selector
 * @param elem element to attach listener to
 * @param type type of event to listen for
 * @param selector target element selector
 * @param listener event listener
 */
export function delegate(elem: EventSource, type: string, selector: string, listener: EventListener) {
    elem.addEventListener(type, (evt) => {
        // check if any parent of target matches selector
        let target = evt.target as HTMLElement | null;
        while (true) {
            if (!target) {
                break
            }

            if (target == elem) {
                break
            }

            if (target.matches(selector)) {
                listener.call(target, evt)
                break
            }

            target = target.parentNode as HTMLElement | null
        }
    })
}


export function removeAllChildren(elem: HTMLElement) {
    while (elem.firstChild) {
        elem.removeChild(elem.firstChild)
    }
}

// create a one-time event
export function once(elem: EventSource, type: string, listener: EventListener) {
    // create event
    elem.addEventListener(type, function (e) {
        // remove event
        elem.removeEventListener(e.type, listener)

        // call handler
        listener(e);
    });

}

export function getScrollOffset(): Offset {
    return {
        left: window.pageXOffset || document.documentElement.scrollLeft,
        top: window.pageYOffset || document.documentElement.scrollTop,
    }
}

/**
 * Get the offset of an element relative to document
 * @param e element
 */
export function getDocumentOffset(e: Element): Offset {
    const rect = e.getBoundingClientRect()
    const scrollOffset = getScrollOffset()

    return {
        left: rect.left + scrollOffset.left,
        top: rect.top + scrollOffset.top,
    }
}

/**
 * getElementIndex returns the index of the element within its parent container
 * @param elem element
 */
export function getElementIndex(elem: Element): number {
    let idx = 0
    while (elem.previousElementSibling) {
        ++idx
        elem = elem.previousElementSibling
    }

    return idx
}

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
export function fill<T>(value: T, length: number): T[] {
    const a: T[] = []
    for (let i = 0; i < length; ++i) {
        a.push(value)
    }

    return a
}

/**
 * Load an image from the specified url
 * Returns a promise that resolves when the image is loaded
 * @param url url to load image from
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
    const promise = new Promise<HTMLImageElement>(resolve => {
        const img = new Image()
        img.addEventListener("load", () => resolve(img))
        img.src = url
    })

    return promise
}

export function bench(name: string, f: () => void) {
    const startTime = performance.now()
    // console.log(`${startTime}: start ${name} ms`)
    f()
    const endTime = performance.now()
    // console.log(`${endTime}: end ${name} ms`)
    console.log(`${name} elapsed ${endTime - startTime} ms`)
}