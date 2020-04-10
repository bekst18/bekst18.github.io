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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFTSDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsSUFBSSxDQUFDLEVBQVU7SUFDM0IsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUN4QyxJQUFJLENBQUMsSUFBSSxFQUFFO1FBQ1AsTUFBTSxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtLQUNsRDtJQUVELE9BQU8sSUFBSSxDQUFBO0FBQ2YsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLFVBQVUsQ0FBQyxJQUFnQixFQUFFLFFBQWdCO0lBQ3pELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDM0MsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1FBQ2hCLE1BQU0sS0FBSyxDQUFDLHVCQUF1QixRQUFRLGlCQUFpQixDQUFDLENBQUE7S0FDaEU7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNqQixDQUFDO0FBR0Q7Ozs7Ozs7R0FPRztBQUNILE1BQU0sVUFBVSxRQUFRLENBQUMsSUFBaUIsRUFBRSxJQUFZLEVBQUUsUUFBZ0IsRUFBRSxRQUF1QjtJQUMvRixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDaEMsaURBQWlEO1FBQ2pELElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUE0QixDQUFDO1FBQzlDLE9BQU8sSUFBSSxFQUFFO1lBQ1QsSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDVCxNQUFLO2FBQ1I7WUFFRCxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUU7Z0JBQ2hCLE1BQUs7YUFDUjtZQUVELElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDMUIsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBQzFCLE1BQUs7YUFDUjtZQUVELE1BQU0sR0FBRyxNQUFNLENBQUMsVUFBZ0MsQ0FBQTtTQUNuRDtJQUNMLENBQUMsQ0FBQyxDQUFBO0FBQ04sQ0FBQztBQUdELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxJQUFpQjtJQUMvQyxPQUFPLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDcEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7S0FDcEM7QUFDTCxDQUFDO0FBRUQsMEJBQTBCO0FBQzFCLE1BQU0sVUFBVSxJQUFJLENBQUMsSUFBaUIsRUFBRSxJQUFZLEVBQUUsUUFBdUI7SUFDekUsZUFBZTtJQUNmLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDO1FBQ25DLGVBQWU7UUFDZixJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUUxQyxlQUFlO1FBQ2YsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0FBRVAsQ0FBQztBQUVELE1BQU0sVUFBVSxlQUFlO0lBQzNCLE9BQU87UUFDSCxJQUFJLEVBQUUsTUFBTSxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsZUFBZSxDQUFDLFVBQVU7UUFDL0QsR0FBRyxFQUFFLE1BQU0sQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLGVBQWUsQ0FBQyxTQUFTO0tBQ2hFLENBQUE7QUFDTCxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUFDLENBQVU7SUFDeEMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLENBQUE7SUFDdEMsTUFBTSxZQUFZLEdBQUcsZUFBZSxFQUFFLENBQUE7SUFFdEMsT0FBTztRQUNILElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQyxJQUFJO1FBQ25DLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHO0tBQ25DLENBQUE7QUFDTCxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FBQyxJQUFhO0lBQ3pDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQTtJQUNYLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixFQUFFO1FBQ2hDLEVBQUUsR0FBRyxDQUFBO1FBQ0wsSUFBSSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQTtLQUNyQztJQUVELE9BQU8sR0FBRyxDQUFBO0FBQ2QsQ0FBQztBQUVELDJGQUEyRjtBQUMzRixNQUFNLFVBQVUsSUFBSSxDQUFJLENBQVU7SUFDOUIsSUFBSTtRQUNBLE9BQU8sQ0FBQyxFQUFFLENBQUE7S0FDYjtJQUNELE9BQU8sQ0FBQyxFQUFFO1FBQ04sSUFBSSxDQUFDLFlBQVksS0FBSyxFQUFFO1lBQ3BCLE9BQU8sQ0FBQyxDQUFBO1NBQ1g7UUFFRCxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtLQUM3QjtBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogU2hhcmVkIHV0aWxpdHkgbGlicmFyeVxyXG4gKi9cclxuXHJcbmV4cG9ydCB0eXBlIEV2ZW50U291cmNlID0gRG9jdW1lbnQgfCBXaW5kb3cgfCBIVE1MRWxlbWVudFxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBPZmZzZXQge1xyXG4gICAgdG9wOiBudW1iZXJcclxuICAgIGxlZnQ6IG51bWJlclxyXG59XHJcblxyXG4vKipcclxuICogUmV0cmlldmUgYW4gZWxlbWVudCBnaXZlbiBpdHMgaWRcclxuICogVGhyb3dzIGFuIGV4Y2VwdGlvbiBpZiBlbGVtZW50IGlzIG5vdCBmb3VuZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGJ5SWQoaWQ6IHN0cmluZyk6IEhUTUxFbGVtZW50IHtcclxuICAgIGNvbnN0IGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZClcclxuICAgIGlmICghZWxlbSkge1xyXG4gICAgICAgIHRocm93IEVycm9yKGBlbGVtIHdpdGggaWQgJHtpZH0gd2FzIG5vdCBmb3VuZGApXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGVsZW1cclxufVxyXG5cclxuLyoqXHJcbiAqIEZpbmQgZmlyc3QgZWxlbWVudCB0aGF0IG1hdGNoZXMgc2VsZWN0b3JcclxuICogdGhyb3dzIGFuIGV4Y2VwdGlvbiBpZiBub3QgZm91bmRcclxuICogQHBhcmFtIGVsZW0gZWxlbSB3aG9zZSBjaGlsZHJlbiB0byBxdWVyeVxyXG4gKiBAcGFyYW0gc2VsZWN0b3Igc2VsZWN0b3IgdG8gYXBwbHlcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBieVNlbGVjdG9yKGVsZW06IFBhcmVudE5vZGUsIHNlbGVjdG9yOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IHJlc3VsdCA9IGVsZW0ucXVlcnlTZWxlY3RvcihzZWxlY3RvcilcclxuICAgIGlmIChyZXN1bHQgPT0gbnVsbCkge1xyXG4gICAgICAgIHRocm93IEVycm9yKGBBbiBlbGVtZW50IG1hdGNoaW5nICR7c2VsZWN0b3J9IHdhcyBub3QgZm91bmQuYClcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogQXR0YWNoIGEgZGVsZWdhdGVkIGV2ZW50IGxpc3RlbmVyIHRvIGFuIGVsZW1lbnRcclxuICogTGlzdGVuZXIgaXMgb25seSBpbnZva2VkIGlmIGVsZW1lbnQgbWF0Y2hlcyBzZWxlY3RvclxyXG4gKiBAcGFyYW0gZWxlbSBlbGVtZW50IHRvIGF0dGFjaCBsaXN0ZW5lciB0b1xyXG4gKiBAcGFyYW0gdHlwZSB0eXBlIG9mIGV2ZW50IHRvIGxpc3RlbiBmb3JcclxuICogQHBhcmFtIHNlbGVjdG9yIHRhcmdldCBlbGVtZW50IHNlbGVjdG9yXHJcbiAqIEBwYXJhbSBsaXN0ZW5lciBldmVudCBsaXN0ZW5lclxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGRlbGVnYXRlKGVsZW06IEV2ZW50U291cmNlLCB0eXBlOiBzdHJpbmcsIHNlbGVjdG9yOiBzdHJpbmcsIGxpc3RlbmVyOiBFdmVudExpc3RlbmVyKSB7XHJcbiAgICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgKGV2dCkgPT4ge1xyXG4gICAgICAgIC8vIGNoZWNrIGlmIGFueSBwYXJlbnQgb2YgdGFyZ2V0IG1hdGNoZXMgc2VsZWN0b3JcclxuICAgICAgICBsZXQgdGFyZ2V0ID0gZXZ0LnRhcmdldCBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgaWYgKCF0YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0YXJnZXQgPT0gZWxlbSkge1xyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRhcmdldC5tYXRjaGVzKHNlbGVjdG9yKSkge1xyXG4gICAgICAgICAgICAgICAgbGlzdGVuZXIuY2FsbCh0YXJnZXQsIGV2dClcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlIGFzIEhUTUxFbGVtZW50IHwgbnVsbFxyXG4gICAgICAgIH1cclxuICAgIH0pXHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlQWxsQ2hpbGRyZW4oZWxlbTogSFRNTEVsZW1lbnQpIHtcclxuICAgIHdoaWxlIChlbGVtLmZpcnN0Q2hpbGQpIHtcclxuICAgICAgICBlbGVtLnJlbW92ZUNoaWxkKGVsZW0uZmlyc3RDaGlsZClcclxuICAgIH1cclxufVxyXG5cclxuLy8gY3JlYXRlIGEgb25lLXRpbWUgZXZlbnRcclxuZXhwb3J0IGZ1bmN0aW9uIG9uY2UoZWxlbTogRXZlbnRTb3VyY2UsIHR5cGU6IHN0cmluZywgbGlzdGVuZXI6IEV2ZW50TGlzdGVuZXIpIHtcclxuICAgIC8vIGNyZWF0ZSBldmVudFxyXG4gICAgZWxlbS5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgLy8gcmVtb3ZlIGV2ZW50XHJcbiAgICAgICAgZWxlbS5yZW1vdmVFdmVudExpc3RlbmVyKGUudHlwZSwgbGlzdGVuZXIpXHJcblxyXG4gICAgICAgIC8vIGNhbGwgaGFuZGxlclxyXG4gICAgICAgIGxpc3RlbmVyKGUpO1xyXG4gICAgfSk7XHJcblxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2Nyb2xsT2Zmc2V0KCk6IE9mZnNldCB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGxlZnQ6IHdpbmRvdy5wYWdlWE9mZnNldCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCxcclxuICAgICAgICB0b3A6IHdpbmRvdy5wYWdlWU9mZnNldCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wLFxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogR2V0IHRoZSBvZmZzZXQgb2YgYW4gZWxlbWVudCByZWxhdGl2ZSB0byBkb2N1bWVudFxyXG4gKiBAcGFyYW0gZSBlbGVtZW50XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RG9jdW1lbnRPZmZzZXQoZTogRWxlbWVudCk6IE9mZnNldCB7XHJcbiAgICBjb25zdCByZWN0ID0gZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVxyXG4gICAgY29uc3Qgc2Nyb2xsT2Zmc2V0ID0gZ2V0U2Nyb2xsT2Zmc2V0KClcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGxlZnQ6IHJlY3QubGVmdCArIHNjcm9sbE9mZnNldC5sZWZ0LFxyXG4gICAgICAgIHRvcDogcmVjdC50b3AgKyBzY3JvbGxPZmZzZXQudG9wLFxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogZ2V0RWxlbWVudEluZGV4IHJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBlbGVtZW50IHdpdGhpbiBpdHMgcGFyZW50IGNvbnRhaW5lclxyXG4gKiBAcGFyYW0gZWxlbSBlbGVtZW50XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RWxlbWVudEluZGV4KGVsZW06IEVsZW1lbnQpOiBudW1iZXIge1xyXG4gICAgbGV0IGlkeCA9IDBcclxuICAgIHdoaWxlIChlbGVtLnByZXZpb3VzRWxlbWVudFNpYmxpbmcpIHtcclxuICAgICAgICArK2lkeFxyXG4gICAgICAgIGVsZW0gPSBlbGVtLnByZXZpb3VzRWxlbWVudFNpYmxpbmdcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gaWR4XHJcbn1cclxuXHJcbi8vIHRyeSB0aGUgc3BlY2lmaWVkIGZ1bmN0aW9uLCByZXR1cm4gZWl0aGVyIHRoZSByZXN1bHQgb3IgYW4gZXJyb3IgaWYgYW4gZXhjZXB0aW9uIG9jY3VyZWRcclxuZXhwb3J0IGZ1bmN0aW9uIHRyeWY8VD4oZjogKCkgPT4gVCkgOiBUIHwgRXJyb3Ige1xyXG4gICAgdHJ5IHtcclxuICAgICAgICByZXR1cm4gZigpXHJcbiAgICB9XHJcbiAgICBjYXRjaCAoeCkge1xyXG4gICAgICAgIGlmICh4IGluc3RhbmNlb2YgRXJyb3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHhcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBFcnJvcih4LnRvU3RyaW5nKCkpXHJcbiAgICB9XHJcbn0iXX0=