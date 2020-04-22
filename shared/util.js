/**
 * Shared utility library
 */
/**
 * Retrieve an element given its id
 * Throws an exception if element is not found
 */
export function byId(id) {
    const elem = document.getElementById(id);
    if (!elem) {
        throw Error(`elem with id ${id} was not found`);
    }
    return elem;
}
/**
 * Find first element that matches selector
 * throws an exception if not found
 * @param elem elem whose children to query
 * @param selector selector to apply
 */
export function bySelector(elem, selector) {
    const result = elem.querySelector(selector);
    if (result == null) {
        throw Error(`An element matching ${selector} was not found.`);
    }
    return result;
}
/**
 * Attach a delegated event listener to an element
 * Listener is only invoked if element matches selector
 * @param elem element to attach listener to
 * @param type type of event to listen for
 * @param selector target element selector
 * @param listener event listener
 */
export function delegate(elem, type, selector, listener) {
    elem.addEventListener(type, (evt) => {
        // check if any parent of target matches selector
        let target = evt.target;
        while (true) {
            if (!target) {
                break;
            }
            if (target == elem) {
                break;
            }
            if (target.matches(selector)) {
                listener.call(target, evt);
                break;
            }
            target = target.parentNode;
        }
    });
}
export function removeAllChildren(elem) {
    while (elem.firstChild) {
        elem.removeChild(elem.firstChild);
    }
}
// create a one-time event
export function once(elem, type, listener) {
    // create event
    elem.addEventListener(type, function (e) {
        // remove event
        elem.removeEventListener(e.type, listener);
        // call handler
        listener(e);
    });
}
export function getScrollOffset() {
    return {
        left: window.pageXOffset || document.documentElement.scrollLeft,
        top: window.pageYOffset || document.documentElement.scrollTop,
    };
}
/**
 * Get the offset of an element relative to document
 * @param e element
 */
export function getDocumentOffset(e) {
    const rect = e.getBoundingClientRect();
    const scrollOffset = getScrollOffset();
    return {
        left: rect.left + scrollOffset.left,
        top: rect.top + scrollOffset.top,
    };
}
/**
 * getElementIndex returns the index of the element within its parent container
 * @param elem element
 */
export function getElementIndex(elem) {
    let idx = 0;
    while (elem.previousElementSibling) {
        ++idx;
        elem = elem.previousElementSibling;
    }
    return idx;
}
// try the specified function, return either the result or an error if an exception occured
export function tryf(f) {
    try {
        return f();
    }
    catch (x) {
        if (x instanceof Error) {
            return x;
        }
        return Error(x.toString());
    }
}
/**
 * returns an array of the form [start..end) where end = start + length - 1
 * @param start start number or length if only one argument is provided
 * @param length length of array
 */
export function sequence(start, length = -1) {
    if (length === -1) {
        length = start;
        start = 0;
    }
    const a = [];
    for (let i = 0; i < length; ++i) {
        a.push(i + start);
    }
    return a;
}
/**
 * generate an array given it's length and a function to call for each index
 * @param length length of array
 * @param f function to call with each index
 */
export function generate(length, f) {
    const a = [];
    for (let i = 0; i < length; ++i) {
        a.push(f(i));
    }
    return a;
}
/**
 * returns an array of the specified length filled with the specified value
 * @param value value to fill array with
 * @param length length of array
 */
export function fill(value, length) {
    const a = [];
    for (let i = 0; i < length; ++i) {
        a.push(value);
    }
    return a;
}
/**
 * Load an image from the specified url
 * Returns a promise that resolves when the image is loaded
 * @param url url to load image from
 */
export function loadImage(url) {
    const promise = new Promise(resolve => {
        const img = new Image();
        img.addEventListener("load", () => resolve(img));
        img.src = url;
    });
    return promise;
}
export function bench(name, f) {
    const startTime = performance.now();
    // console.log(`${startTime}: start ${name} ms`)
    f();
    const endTime = performance.now();
    // console.log(`${endTime}: end ${name} ms`)
    console.log(`${name} elapsed ${endTime - startTime} ms`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFTSDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsSUFBSSxDQUFDLEVBQVU7SUFDM0IsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUN4QyxJQUFJLENBQUMsSUFBSSxFQUFFO1FBQ1AsTUFBTSxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtLQUNsRDtJQUVELE9BQU8sSUFBSSxDQUFBO0FBQ2YsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLFVBQVUsQ0FBQyxJQUFnQixFQUFFLFFBQWdCO0lBQ3pELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDM0MsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1FBQ2hCLE1BQU0sS0FBSyxDQUFDLHVCQUF1QixRQUFRLGlCQUFpQixDQUFDLENBQUE7S0FDaEU7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNqQixDQUFDO0FBR0Q7Ozs7Ozs7R0FPRztBQUNILE1BQU0sVUFBVSxRQUFRLENBQUMsSUFBaUIsRUFBRSxJQUFZLEVBQUUsUUFBZ0IsRUFBRSxRQUF1QjtJQUMvRixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDaEMsaURBQWlEO1FBQ2pELElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUE0QixDQUFDO1FBQzlDLE9BQU8sSUFBSSxFQUFFO1lBQ1QsSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDVCxNQUFLO2FBQ1I7WUFFRCxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUU7Z0JBQ2hCLE1BQUs7YUFDUjtZQUVELElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDMUIsUUFBUSxD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NUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksWUFBWSxPQUFPLEdBQUcsU0FBUyxLQUFLLENBQUMsQ0FBQTtBQUM1RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFNoYXJlZCB1dGlsaXR5IGxpYnJhcnlcclxuICovXHJcblxyXG5leHBvcnQgdHlwZSBFdmVudFNvdXJjZSA9IERvY3VtZW50IHwgV2luZG93IHwgSFRNTEVsZW1lbnRcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgT2Zmc2V0IHtcclxuICAgIHRvcDogbnVtYmVyXHJcbiAgICBsZWZ0OiBudW1iZXJcclxufVxyXG5cclxuLyoqXHJcbiAqIFJldHJpZXZlIGFuIGVsZW1lbnQgZ2l2ZW4gaXRzIGlkXHJcbiAqIFRocm93cyBhbiBleGNlcHRpb24gaWYgZWxlbWVudCBpcyBub3QgZm91bmRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBieUlkKGlkOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XHJcbiAgICBjb25zdCBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXHJcbiAgICBpZiAoIWVsZW0pIHtcclxuICAgICAgICB0aHJvdyBFcnJvcihgZWxlbSB3aXRoIGlkICR7aWR9IHdhcyBub3QgZm91bmRgKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBlbGVtXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGaW5kIGZpcnN0IGVsZW1lbnQgdGhhdCBtYXRjaGVzIHNlbGVjdG9yXHJcbiAqIHRocm93cyBhbiBleGNlcHRpb24gaWYgbm90IGZvdW5kXHJcbiAqIEBwYXJhbSBlbGVtIGVsZW0gd2hvc2UgY2hpbGRyZW4gdG8gcXVlcnlcclxuICogQHBhcmFtIHNlbGVjdG9yIHNlbGVjdG9yIHRvIGFwcGx5XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYnlTZWxlY3RvcihlbGVtOiBQYXJlbnROb2RlLCBzZWxlY3Rvcjogc3RyaW5nKSB7XHJcbiAgICBjb25zdCByZXN1bHQgPSBlbGVtLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpXHJcbiAgICBpZiAocmVzdWx0ID09IG51bGwpIHtcclxuICAgICAgICB0aHJvdyBFcnJvcihgQW4gZWxlbWVudCBtYXRjaGluZyAke3NlbGVjdG9yfSB3YXMgbm90IGZvdW5kLmApXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdFxyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIEF0dGFjaCBhIGRlbGVnYXRlZCBldmVudCBsaXN0ZW5lciB0byBhbiBlbGVtZW50XHJcbiAqIExpc3RlbmVyIGlzIG9ubHkgaW52b2tlZCBpZiBlbGVtZW50IG1hdGNoZXMgc2VsZWN0b3JcclxuICogQHBhcmFtIGVsZW0gZWxlbWVudCB0byBhdHRhY2ggbGlzdGVuZXIgdG9cclxuICogQHBhcmFtIHR5cGUgdHlwZSBvZiBldmVudCB0byBsaXN0ZW4gZm9yXHJcbiAqIEBwYXJhbSBzZWxlY3RvciB0YXJnZXQgZWxlbWVudCBzZWxlY3RvclxyXG4gKiBAcGFyYW0gbGlzdGVuZXIgZXZlbnQgbGlzdGVuZXJcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBkZWxlZ2F0ZShlbGVtOiBFdmVudFNvdXJjZSwgdHlwZTogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBsaXN0ZW5lcjogRXZlbnRMaXN0ZW5lcikge1xyXG4gICAgZWxlbS5hZGRFdmVudExpc3RlbmVyKHR5cGUsIChldnQpID0+IHtcclxuICAgICAgICAvLyBjaGVjayBpZiBhbnkgcGFyZW50IG9mIHRhcmdldCBtYXRjaGVzIHNlbGVjdG9yXHJcbiAgICAgICAgbGV0IHRhcmdldCA9IGV2dC50YXJnZXQgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgICAgIGlmICghdGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGFyZ2V0ID09IGVsZW0pIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0YXJnZXQubWF0Y2hlcyhzZWxlY3RvcikpIHtcclxuICAgICAgICAgICAgICAgIGxpc3RlbmVyLmNhbGwodGFyZ2V0LCBldnQpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZSBhcyBIVE1MRWxlbWVudCB8IG51bGxcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUFsbENoaWxkcmVuKGVsZW06IEhUTUxFbGVtZW50KSB7XHJcbiAgICB3aGlsZSAoZWxlbS5maXJzdENoaWxkKSB7XHJcbiAgICAgICAgZWxlbS5yZW1vdmVDaGlsZChlbGVtLmZpcnN0Q2hpbGQpXHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIGNyZWF0ZSBhIG9uZS10aW1lIGV2ZW50XHJcbmV4cG9ydCBmdW5jdGlvbiBvbmNlKGVsZW06IEV2ZW50U291cmNlLCB0eXBlOiBzdHJpbmcsIGxpc3RlbmVyOiBFdmVudExpc3RlbmVyKSB7XHJcbiAgICAvLyBjcmVhdGUgZXZlbnRcclxuICAgIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIC8vIHJlbW92ZSBldmVudFxyXG4gICAgICAgIGVsZW0ucmVtb3ZlRXZlbnRMaXN0ZW5lcihlLnR5cGUsIGxpc3RlbmVyKVxyXG5cclxuICAgICAgICAvLyBjYWxsIGhhbmRsZXJcclxuICAgICAgICBsaXN0ZW5lcihlKTtcclxuICAgIH0pO1xyXG5cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFNjcm9sbE9mZnNldCgpOiBPZmZzZXQge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBsZWZ0OiB3aW5kb3cucGFnZVhPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQsXHJcbiAgICAgICAgdG9wOiB3aW5kb3cucGFnZVlPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCxcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCB0aGUgb2Zmc2V0IG9mIGFuIGVsZW1lbnQgcmVsYXRpdmUgdG8gZG9jdW1lbnRcclxuICogQHBhcmFtIGUgZWxlbWVudFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldERvY3VtZW50T2Zmc2V0KGU6IEVsZW1lbnQpOiBPZmZzZXQge1xyXG4gICAgY29uc3QgcmVjdCA9IGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcclxuICAgIGNvbnN0IHNjcm9sbE9mZnNldCA9IGdldFNjcm9sbE9mZnNldCgpXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBsZWZ0OiByZWN0LmxlZnQgKyBzY3JvbGxPZmZzZXQubGVmdCxcclxuICAgICAgICB0b3A6IHJlY3QudG9wICsgc2Nyb2xsT2Zmc2V0LnRvcCxcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIGdldEVsZW1lbnRJbmRleCByZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgZWxlbWVudCB3aXRoaW4gaXRzIHBhcmVudCBjb250YWluZXJcclxuICogQHBhcmFtIGVsZW0gZWxlbWVudFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEVsZW1lbnRJbmRleChlbGVtOiBFbGVtZW50KTogbnVtYmVyIHtcclxuICAgIGxldCBpZHggPSAwXHJcbiAgICB3aGlsZSAoZWxlbS5wcmV2aW91c0VsZW1lbnRTaWJsaW5nKSB7XHJcbiAgICAgICAgKytpZHhcclxuICAgICAgICBlbGVtID0gZWxlbS5wcmV2aW91c0VsZW1lbnRTaWJsaW5nXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGlkeFxyXG59XHJcblxyXG4vLyB0cnkgdGhlIHNwZWNpZmllZCBmdW5jdGlvbiwgcmV0dXJuIGVpdGhlciB0aGUgcmVzdWx0IG9yIGFuIGVycm9yIGlmIGFuIGV4Y2VwdGlvbiBvY2N1cmVkXHJcbmV4cG9ydCBmdW5jdGlvbiB0cnlmPFQ+KGY6ICgpID0+IFQpOiBUIHwgRXJyb3Ige1xyXG4gICAgdHJ5IHtcclxuICAgICAgICByZXR1cm4gZigpXHJcbiAgICB9XHJcbiAgICBjYXRjaCAoeCkge1xyXG4gICAgICAgIGlmICh4IGluc3RhbmNlb2YgRXJyb3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHhcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBFcnJvcih4LnRvU3RyaW5nKCkpXHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiByZXR1cm5zIGFuIGFycmF5IG9mIHRoZSBmb3JtIFtzdGFydC4uZW5kKSB3aGVyZSBlbmQgPSBzdGFydCArIGxlbmd0aCAtIDFcclxuICogQHBhcmFtIHN0YXJ0IHN0YXJ0IG51bWJlciBvciBsZW5ndGggaWYgb25seSBvbmUgYXJndW1lbnQgaXMgcHJvdmlkZWRcclxuICogQHBhcmFtIGxlbmd0aCBsZW5ndGggb2YgYXJyYXlcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXF1ZW5jZShzdGFydDogbnVtYmVyLCBsZW5ndGggPSAtMSk6IG51bWJlcltdIHtcclxuICAgIGlmIChsZW5ndGggPT09IC0xKSB7XHJcbiAgICAgICAgbGVuZ3RoID0gc3RhcnRcclxuICAgICAgICBzdGFydCA9IDBcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBhOiBudW1iZXJbXSA9IFtdXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgYS5wdXNoKGkgKyBzdGFydClcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYVxyXG59XHJcblxyXG4vKipcclxuICogZ2VuZXJhdGUgYW4gYXJyYXkgZ2l2ZW4gaXQncyBsZW5ndGggYW5kIGEgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBpbmRleFxyXG4gKiBAcGFyYW0gbGVuZ3RoIGxlbmd0aCBvZiBhcnJheVxyXG4gKiBAcGFyYW0gZiBmdW5jdGlvbiB0byBjYWxsIHdpdGggZWFjaCBpbmRleFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlPFQ+KGxlbmd0aDogbnVtYmVyLCBmOiAoaTogbnVtYmVyKSA9PiBUKSB7XHJcbiAgICBjb25zdCBhOiBUW10gPSBbXVxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGEucHVzaChmKGkpKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhXHJcbn1cclxuXHJcbi8qKlxyXG4gKiByZXR1cm5zIGFuIGFycmF5IG9mIHRoZSBzcGVjaWZpZWQgbGVuZ3RoIGZpbGxlZCB3aXRoIHRoZSBzcGVjaWZpZWQgdmFsdWVcclxuICogQHBhcmFtIHZhbHVlIHZhbHVlIHRvIGZpbGwgYXJyYXkgd2l0aFxyXG4gKiBAcGFyYW0gbGVuZ3RoIGxlbmd0aCBvZiBhcnJheVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbGw8VD4odmFsdWU6IFQsIGxlbmd0aDogbnVtYmVyKTogVFtdIHtcclxuICAgIGNvbnN0IGE6IFRbXSA9IFtdXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgYS5wdXNoKHZhbHVlKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMb2FkIGFuIGltYWdlIGZyb20gdGhlIHNwZWNpZmllZCB1cmxcclxuICogUmV0dXJucyBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSBpbWFnZSBpcyBsb2FkZWRcclxuICogQHBhcmFtIHVybCB1cmwgdG8gbG9hZCBpbWFnZSBmcm9tXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbG9hZEltYWdlKHVybDogc3RyaW5nKTogUHJvbWlzZTxIVE1MSW1hZ2VFbGVtZW50PiB7XHJcbiAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2U8SFRNTEltYWdlRWxlbWVudD4ocmVzb2x2ZSA9PiB7XHJcbiAgICAgICAgY29uc3QgaW1nID0gbmV3IEltYWdlKClcclxuICAgICAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgKCkgPT4gcmVzb2x2ZShpbWcpKVxyXG4gICAgICAgIGltZy5zcmMgPSB1cmxcclxuICAgIH0pXHJcblxyXG4gICAgcmV0dXJuIHByb21pc2VcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGJlbmNoKG5hbWU6IHN0cmluZywgZjogKCkgPT4gdm9pZCkge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KClcclxuICAgIC8vIGNvbnNvbGUubG9nKGAke3N0YXJ0VGltZX06IHN0YXJ0ICR7bmFtZX0gbXNgKVxyXG4gICAgZigpXHJcbiAgICBjb25zdCBlbmRUaW1lID0gcGVyZm9ybWFuY2Uubm93KClcclxuICAgIC8vIGNvbnNvbGUubG9nKGAke2VuZFRpbWV9OiBlbmQgJHtuYW1lfSBtc2ApXHJcbiAgICBjb25zb2xlLmxvZyhgJHtuYW1lfSBlbGFwc2VkICR7ZW5kVGltZSAtIHN0YXJ0VGltZX0gbXNgKVxyXG59Il19