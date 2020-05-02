/**
 * Dom utility library
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