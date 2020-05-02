/**
 * Dom utility library
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZG9tLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBU0g7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLElBQUksQ0FBQyxFQUFVO0lBQzNCLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDeEMsSUFBSSxDQUFDLElBQUksRUFBRTtRQUNQLE1BQU0sS0FBSyxDQUFDLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLENBQUE7S0FDbEQ7SUFFRCxPQUFPLElBQUksQ0FBQTtBQUNmLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxVQUFVLENBQUMsSUFBZ0IsRUFBRSxRQUFnQjtJQUN6RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzNDLElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtRQUNoQixNQUFNLEtBQUssQ0FBQyx1QkFBdUIsUUFBUSxpQkFBaUIsQ0FBQyxDQUFBO0tBQ2hFO0lBRUQsT0FBTyxNQUFNLENBQUE7QUFDakIsQ0FBQztBQUdEOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLFVBQVUsUUFBUSxDQUFDLElBQWlCLEVBQUUsSUFBWSxFQUFFLFFBQWdCLEVBQUUsUUFBdUI7SUFDL0YsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQ2hDLGlEQUFpRDtRQUNqRCxJQUFJLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBNEIsQ0FBQztRQUM5QyxPQUFPLElBQUksRUFBRTtZQUNULElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQ1QsTUFBSzthQUNSO1lBRUQsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO2dCQUNoQixNQUFLO2FBQ1I7WUFFRCxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzFCLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUMxQixNQUFLO2FBQ1I7WUFFRCxNQUFNLEdBQUcsTUFBTSxDQUFDLFVBQWdDLENBQUE7U0FDbkQ7SUFDTCxDQUFDLENBQUMsQ0FBQTtBQUNOLENBQUM7QUFHRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsSUFBaUI7SUFDL0MsT0FBTyxJQUFJLENBQUMsVUFBVSxFQUFFO1FBQ3BCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0tBQ3BDO0FBQ0wsQ0FBQztBQUVELDBCQUEwQjtBQUMxQixNQUFNLFVBQVUsSUFBSSxDQUFDLElBQWlCLEVBQUUsSUFBWSxFQUFFLFFBQXVCO0lBQ3pFLGVBQWU7SUFDZixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQztRQUNuQyxlQUFlO1FBQ2YsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFMUMsZUFBZTtRQUNmLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQztBQUVQLENBQUM7QUFFRCxNQUFNLFVBQVUsZUFBZTtJQUMzQixPQUFPO1FBQ0gsSUFBSSxFQUFFLE1BQU0sQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLGVBQWUsQ0FBQyxVQUFVO1FBQy9ELEdBQUcsRUFBRSxNQUFNLENBQUMsV0FBVyxJQUFJLFFBQVEsQ0FBQyxlQUFlLENBQUMsU0FBUztLQUNoRSxDQUFBO0FBQ0wsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxDQUFVO0lBQ3hDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO0lBQ3RDLE1BQU0sWUFBWSxHQUFHLGVBQWUsRUFBRSxDQUFBO0lBRXRDLE9BQU87UUFDSCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsSUFBSTtRQUNuQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxZQUFZLENBQUMsR0FBRztLQUNuQyxDQUFBO0FBQ0wsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQUMsSUFBYTtJQUN6QyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUE7SUFDWCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsRUFBRTtRQUNoQyxFQUFFLEdBQUcsQ0FBQTtRQUNMLElBQUksR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUE7S0FDckM7SUFFRCxPQUFPLEdBQUcsQ0FBQTtBQUNkLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLFNBQVMsQ0FBQyxHQUFXO0lBQ2pDLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUFtQixPQUFPLENBQUMsRUFBRTtRQUNwRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFBO1FBQ3ZCLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDaEQsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUE7SUFDakIsQ0FBQyxDQUFDLENBQUE7SUFFRixPQUFPLE9BQU8sQ0FBQTtBQUNsQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIERvbSB1dGlsaXR5IGxpYnJhcnlcclxuICovXHJcblxyXG5leHBvcnQgdHlwZSBFdmVudFNvdXJjZSA9IERvY3VtZW50IHwgV2luZG93IHwgSFRNTEVsZW1lbnRcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgT2Zmc2V0IHtcclxuICAgIHRvcDogbnVtYmVyXHJcbiAgICBsZWZ0OiBudW1iZXJcclxufVxyXG5cclxuLyoqXHJcbiAqIFJldHJpZXZlIGFuIGVsZW1lbnQgZ2l2ZW4gaXRzIGlkXHJcbiAqIFRocm93cyBhbiBleGNlcHRpb24gaWYgZWxlbWVudCBpcyBub3QgZm91bmRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBieUlkKGlkOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XHJcbiAgICBjb25zdCBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXHJcbiAgICBpZiAoIWVsZW0pIHtcclxuICAgICAgICB0aHJvdyBFcnJvcihgZWxlbSB3aXRoIGlkICR7aWR9IHdhcyBub3QgZm91bmRgKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBlbGVtXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGaW5kIGZpcnN0IGVsZW1lbnQgdGhhdCBtYXRjaGVzIHNlbGVjdG9yXHJcbiAqIHRocm93cyBhbiBleGNlcHRpb24gaWYgbm90IGZvdW5kXHJcbiAqIEBwYXJhbSBlbGVtIGVsZW0gd2hvc2UgY2hpbGRyZW4gdG8gcXVlcnlcclxuICogQHBhcmFtIHNlbGVjdG9yIHNlbGVjdG9yIHRvIGFwcGx5XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYnlTZWxlY3RvcihlbGVtOiBQYXJlbnROb2RlLCBzZWxlY3Rvcjogc3RyaW5nKSB7XHJcbiAgICBjb25zdCByZXN1bHQgPSBlbGVtLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpXHJcbiAgICBpZiAocmVzdWx0ID09IG51bGwpIHtcclxuICAgICAgICB0aHJvdyBFcnJvcihgQW4gZWxlbWVudCBtYXRjaGluZyAke3NlbGVjdG9yfSB3YXMgbm90IGZvdW5kLmApXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdFxyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIEF0dGFjaCBhIGRlbGVnYXRlZCBldmVudCBsaXN0ZW5lciB0byBhbiBlbGVtZW50XHJcbiAqIExpc3RlbmVyIGlzIG9ubHkgaW52b2tlZCBpZiBlbGVtZW50IG1hdGNoZXMgc2VsZWN0b3JcclxuICogQHBhcmFtIGVsZW0gZWxlbWVudCB0byBhdHRhY2ggbGlzdGVuZXIgdG9cclxuICogQHBhcmFtIHR5cGUgdHlwZSBvZiBldmVudCB0byBsaXN0ZW4gZm9yXHJcbiAqIEBwYXJhbSBzZWxlY3RvciB0YXJnZXQgZWxlbWVudCBzZWxlY3RvclxyXG4gKiBAcGFyYW0gbGlzdGVuZXIgZXZlbnQgbGlzdGVuZXJcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBkZWxlZ2F0ZShlbGVtOiBFdmVudFNvdXJjZSwgdHlwZTogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBsaXN0ZW5lcjogRXZlbnRMaXN0ZW5lcikge1xyXG4gICAgZWxlbS5hZGRFdmVudExpc3RlbmVyKHR5cGUsIChldnQpID0+IHtcclxuICAgICAgICAvLyBjaGVjayBpZiBhbnkgcGFyZW50IG9mIHRhcmdldCBtYXRjaGVzIHNlbGVjdG9yXHJcbiAgICAgICAgbGV0IHRhcmdldCA9IGV2dC50YXJnZXQgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgICAgIGlmICghdGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGFyZ2V0ID09IGVsZW0pIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0YXJnZXQubWF0Y2hlcyhzZWxlY3RvcikpIHtcclxuICAgICAgICAgICAgICAgIGxpc3RlbmVyLmNhbGwodGFyZ2V0LCBldnQpXHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZSBhcyBIVE1MRWxlbWVudCB8IG51bGxcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUFsbENoaWxkcmVuKGVsZW06IEhUTUxFbGVtZW50KSB7XHJcbiAgICB3aGlsZSAoZWxlbS5maXJzdENoaWxkKSB7XHJcbiAgICAgICAgZWxlbS5yZW1vdmVDaGlsZChlbGVtLmZpcnN0Q2hpbGQpXHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIGNyZWF0ZSBhIG9uZS10aW1lIGV2ZW50XHJcbmV4cG9ydCBmdW5jdGlvbiBvbmNlKGVsZW06IEV2ZW50U291cmNlLCB0eXBlOiBzdHJpbmcsIGxpc3RlbmVyOiBFdmVudExpc3RlbmVyKSB7XHJcbiAgICAvLyBjcmVhdGUgZXZlbnRcclxuICAgIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIC8vIHJlbW92ZSBldmVudFxyXG4gICAgICAgIGVsZW0ucmVtb3ZlRXZlbnRMaXN0ZW5lcihlLnR5cGUsIGxpc3RlbmVyKVxyXG5cclxuICAgICAgICAvLyBjYWxsIGhhbmRsZXJcclxuICAgICAgICBsaXN0ZW5lcihlKTtcclxuICAgIH0pO1xyXG5cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFNjcm9sbE9mZnNldCgpOiBPZmZzZXQge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBsZWZ0OiB3aW5kb3cucGFnZVhPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQsXHJcbiAgICAgICAgdG9wOiB3aW5kb3cucGFnZVlPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCxcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCB0aGUgb2Zmc2V0IG9mIGFuIGVsZW1lbnQgcmVsYXRpdmUgdG8gZG9jdW1lbnRcclxuICogQHBhcmFtIGUgZWxlbWVudFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldERvY3VtZW50T2Zmc2V0KGU6IEVsZW1lbnQpOiBPZmZzZXQge1xyXG4gICAgY29uc3QgcmVjdCA9IGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcclxuICAgIGNvbnN0IHNjcm9sbE9mZnNldCA9IGdldFNjcm9sbE9mZnNldCgpXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBsZWZ0OiByZWN0LmxlZnQgKyBzY3JvbGxPZmZzZXQubGVmdCxcclxuICAgICAgICB0b3A6IHJlY3QudG9wICsgc2Nyb2xsT2Zmc2V0LnRvcCxcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIGdldEVsZW1lbnRJbmRleCByZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgZWxlbWVudCB3aXRoaW4gaXRzIHBhcmVudCBjb250YWluZXJcclxuICogQHBhcmFtIGVsZW0gZWxlbWVudFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEVsZW1lbnRJbmRleChlbGVtOiBFbGVtZW50KTogbnVtYmVyIHtcclxuICAgIGxldCBpZHggPSAwXHJcbiAgICB3aGlsZSAoZWxlbS5wcmV2aW91c0VsZW1lbnRTaWJsaW5nKSB7XHJcbiAgICAgICAgKytpZHhcclxuICAgICAgICBlbGVtID0gZWxlbS5wcmV2aW91c0VsZW1lbnRTaWJsaW5nXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGlkeFxyXG59XHJcblxyXG4vKipcclxuICogTG9hZCBhbiBpbWFnZSBmcm9tIHRoZSBzcGVjaWZpZWQgdXJsXHJcbiAqIFJldHVybnMgYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgaW1hZ2UgaXMgbG9hZGVkXHJcbiAqIEBwYXJhbSB1cmwgdXJsIHRvIGxvYWQgaW1hZ2UgZnJvbVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRJbWFnZSh1cmw6IHN0cmluZyk6IFByb21pc2U8SFRNTEltYWdlRWxlbWVudD4ge1xyXG4gICAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlPEhUTUxJbWFnZUVsZW1lbnQ+KHJlc29sdmUgPT4ge1xyXG4gICAgICAgIGNvbnN0IGltZyA9IG5ldyBJbWFnZSgpXHJcbiAgICAgICAgaW1nLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsICgpID0+IHJlc29sdmUoaW1nKSlcclxuICAgICAgICBpbWcuc3JjID0gdXJsXHJcbiAgICB9KVxyXG5cclxuICAgIHJldHVybiBwcm9taXNlXHJcbn0iXX0=