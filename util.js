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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFTSDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsSUFBSSxDQUFDLEVBQVU7SUFDM0IsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUN4QyxJQUFJLENBQUMsSUFBSSxFQUFFO1FBQ1AsTUFBTSxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtLQUNsRDtJQUVELE9BQU8sSUFBSSxDQUFBO0FBQ2YsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLFVBQVUsQ0FBQyxJQUFnQixFQUFFLFFBQWdCO0lBQ3pELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDM0MsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1FBQ2hCLE1BQU0sS0FBSyxDQUFDLHVCQUF1QixRQUFRLGlCQUFpQixDQUFDLENBQUE7S0FDaEU7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNqQixDQUFDO0FBR0Q7Ozs7Ozs7R0FPRztBQUNILE1BQU0sVUFBVSxRQUFRLENBQUMsSUFBaUIsRUFBRSxJQUFZLEVBQUUsUUFBZ0IsRUFBRSxRQUF1QjtJQUMvRixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDaEMsaURBQWlEO1FBQ2pELElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUE0QixDQUFDO1FBQzlDLE9BQU8sSUFBSSxFQUFFO1lBQ1QsSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDVCxNQUFLO2FBQ1I7WUFFRCxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUU7Z0JBQ2hCLE1BQUs7YUFDUjtZQUVELElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDMUIsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBQzFCLE1BQUs7YUFDUjtZQUVELE1BQU0sR0FBRyxNQUFNLENBQUMsVUFBZ0MsQ0FBQTtTQUNuRDtJQUNMLENBQUMsQ0FBQyxDQUFBO0FBQ04sQ0FBQztBQUdELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxJQUFpQjtJQUMvQyxPQUFPLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDcEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7S0FDcEM7QUFDTCxDQUFDO0FBRUQsMEJBQTBCO0FBQzFCLE1BQU0sVUFBVSxJQUFJLENBQUMsSUFBaUIsRUFBRSxJQUFZLEVBQUUsUUFBdUI7SUFDekUsZUFBZTtJQUNmLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDO1FBQ25DLGVBQWU7UUFDZixJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUUxQyxlQUFlO1FBQ2YsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0FBRVAsQ0FBQztBQUVELE1BQU0sVUFBVSxlQUFlO0lBQzNCLE9BQU87UUFDSCxJQUFJLEVBQUUsTUFBTSxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsZUFBZSxDQUFDLFVBQVU7UUFDL0QsR0FBRyxFQUFFLE1BQU0sQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLGVBQWUsQ0FBQyxTQUFTO0tBQ2hFLENBQUE7QUFDTCxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUFDLENBQVU7SUFDeEMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLENBQUE7SUFDdEMsTUFBTSxZQUFZLEdBQUcsZUFBZSxFQUFFLENBQUE7SUFFdEMsT0FBTztRQUNILElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQyxJQUFJO1FBQ25DLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHO0tBQ25DLENBQUE7QUFDTCxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FBQyxJQUFhO0lBQ3pDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQTtJQUNYLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixFQUFFO1FBQ2hDLEVBQUUsR0FBRyxDQUFBO1FBQ0wsSUFBSSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQTtLQUNyQztJQUVELE9BQU8sR0FBRyxDQUFBO0FBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBTaGFyZWQgdXRpbGl0eSBsaWJyYXJ5XHJcbiAqL1xyXG5cclxuZXhwb3J0IHR5cGUgRXZlbnRTb3VyY2UgPSBEb2N1bWVudCB8IFdpbmRvdyB8IEhUTUxFbGVtZW50XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE9mZnNldCB7XHJcbiAgICB0b3A6IG51bWJlclxyXG4gICAgbGVmdDogbnVtYmVyXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXRyaWV2ZSBhbiBlbGVtZW50IGdpdmVuIGl0cyBpZFxyXG4gKiBUaHJvd3MgYW4gZXhjZXB0aW9uIGlmIGVsZW1lbnQgaXMgbm90IGZvdW5kXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYnlJZChpZDogc3RyaW5nKTogSFRNTEVsZW1lbnQge1xyXG4gICAgY29uc3QgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKVxyXG4gICAgaWYgKCFlbGVtKSB7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoYGVsZW0gd2l0aCBpZCAke2lkfSB3YXMgbm90IGZvdW5kYClcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZWxlbVxyXG59XHJcblxyXG4vKipcclxuICogRmluZCBmaXJzdCBlbGVtZW50IHRoYXQgbWF0Y2hlcyBzZWxlY3RvclxyXG4gKiB0aHJvd3MgYW4gZXhjZXB0aW9uIGlmIG5vdCBmb3VuZFxyXG4gKiBAcGFyYW0gZWxlbSBlbGVtIHdob3NlIGNoaWxkcmVuIHRvIHF1ZXJ5XHJcbiAqIEBwYXJhbSBzZWxlY3RvciBzZWxlY3RvciB0byBhcHBseVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGJ5U2VsZWN0b3IoZWxlbTogUGFyZW50Tm9kZSwgc2VsZWN0b3I6IHN0cmluZykge1xyXG4gICAgY29uc3QgcmVzdWx0ID0gZWxlbS5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKVxyXG4gICAgaWYgKHJlc3VsdCA9PSBudWxsKSB7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoYEFuIGVsZW1lbnQgbWF0Y2hpbmcgJHtzZWxlY3Rvcn0gd2FzIG5vdCBmb3VuZC5gKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHRcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBBdHRhY2ggYSBkZWxlZ2F0ZWQgZXZlbnQgbGlzdGVuZXIgdG8gYW4gZWxlbWVudFxyXG4gKiBMaXN0ZW5lciBpcyBvbmx5IGludm9rZWQgaWYgZWxlbWVudCBtYXRjaGVzIHNlbGVjdG9yXHJcbiAqIEBwYXJhbSBlbGVtIGVsZW1lbnQgdG8gYXR0YWNoIGxpc3RlbmVyIHRvXHJcbiAqIEBwYXJhbSB0eXBlIHR5cGUgb2YgZXZlbnQgdG8gbGlzdGVuIGZvclxyXG4gKiBAcGFyYW0gc2VsZWN0b3IgdGFyZ2V0IGVsZW1lbnQgc2VsZWN0b3JcclxuICogQHBhcmFtIGxpc3RlbmVyIGV2ZW50IGxpc3RlbmVyXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZGVsZWdhdGUoZWxlbTogRXZlbnRTb3VyY2UsIHR5cGU6IHN0cmluZywgc2VsZWN0b3I6IHN0cmluZywgbGlzdGVuZXI6IEV2ZW50TGlzdGVuZXIpIHtcclxuICAgIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCAoZXZ0KSA9PiB7XHJcbiAgICAgICAgLy8gY2hlY2sgaWYgYW55IHBhcmVudCBvZiB0YXJnZXQgbWF0Y2hlcyBzZWxlY3RvclxyXG4gICAgICAgIGxldCB0YXJnZXQgPSBldnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICBpZiAoIXRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRhcmdldCA9PSBlbGVtKSB7XHJcbiAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGFyZ2V0Lm1hdGNoZXMoc2VsZWN0b3IpKSB7XHJcbiAgICAgICAgICAgICAgICBsaXN0ZW5lci5jYWxsKHRhcmdldCwgZXZ0KVxyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGFyZ2V0ID0gdGFyZ2V0LnBhcmVudE5vZGUgYXMgSFRNTEVsZW1lbnQgfCBudWxsXHJcbiAgICAgICAgfVxyXG4gICAgfSlcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVBbGxDaGlsZHJlbihlbGVtOiBIVE1MRWxlbWVudCkge1xyXG4gICAgd2hpbGUgKGVsZW0uZmlyc3RDaGlsZCkge1xyXG4gICAgICAgIGVsZW0ucmVtb3ZlQ2hpbGQoZWxlbS5maXJzdENoaWxkKVxyXG4gICAgfVxyXG59XHJcblxyXG4vLyBjcmVhdGUgYSBvbmUtdGltZSBldmVudFxyXG5leHBvcnQgZnVuY3Rpb24gb25jZShlbGVtOiBFdmVudFNvdXJjZSwgdHlwZTogc3RyaW5nLCBsaXN0ZW5lcjogRXZlbnRMaXN0ZW5lcikge1xyXG4gICAgLy8gY3JlYXRlIGV2ZW50XHJcbiAgICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAvLyByZW1vdmUgZXZlbnRcclxuICAgICAgICBlbGVtLnJlbW92ZUV2ZW50TGlzdGVuZXIoZS50eXBlLCBsaXN0ZW5lcilcclxuXHJcbiAgICAgICAgLy8gY2FsbCBoYW5kbGVyXHJcbiAgICAgICAgbGlzdGVuZXIoZSk7XHJcbiAgICB9KTtcclxuXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRTY3JvbGxPZmZzZXQoKTogT2Zmc2V0IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgbGVmdDogd2luZG93LnBhZ2VYT2Zmc2V0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0LFxyXG4gICAgICAgIHRvcDogd2luZG93LnBhZ2VZT2Zmc2V0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3AsXHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgdGhlIG9mZnNldCBvZiBhbiBlbGVtZW50IHJlbGF0aXZlIHRvIGRvY3VtZW50XHJcbiAqIEBwYXJhbSBlIGVsZW1lbnRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXREb2N1bWVudE9mZnNldChlOiBFbGVtZW50KTogT2Zmc2V0IHtcclxuICAgIGNvbnN0IHJlY3QgPSBlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpXHJcbiAgICBjb25zdCBzY3JvbGxPZmZzZXQgPSBnZXRTY3JvbGxPZmZzZXQoKVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgbGVmdDogcmVjdC5sZWZ0ICsgc2Nyb2xsT2Zmc2V0LmxlZnQsXHJcbiAgICAgICAgdG9wOiByZWN0LnRvcCArIHNjcm9sbE9mZnNldC50b3AsXHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBnZXRFbGVtZW50SW5kZXggcmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGVsZW1lbnQgd2l0aGluIGl0cyBwYXJlbnQgY29udGFpbmVyXHJcbiAqIEBwYXJhbSBlbGVtIGVsZW1lbnRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRFbGVtZW50SW5kZXgoZWxlbTogRWxlbWVudCk6IG51bWJlciB7XHJcbiAgICBsZXQgaWR4ID0gMFxyXG4gICAgd2hpbGUgKGVsZW0ucHJldmlvdXNFbGVtZW50U2libGluZykge1xyXG4gICAgICAgICsraWR4XHJcbiAgICAgICAgZWxlbSA9IGVsZW0ucHJldmlvdXNFbGVtZW50U2libGluZ1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBpZHhcclxufSJdfQ==