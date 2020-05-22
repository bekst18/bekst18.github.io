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
export function uniform(value, length) {
    const a = [];
    for (let i = 0; i < length; ++i) {
        a.push(value);
    }
    return a;
}
/**
 * Creates a list of distinct values from a
 * @param a iterable
 */
export function distinct(a) {
    return [...new Set(a)];
}
/**
 * Creates a list of unique values from a
 * @param a iterable
 */
export function mapDistinct(a, f) {
    return distinct([...a].map(f));
}
/**
 * pop, throwing an exception if the array is empty
 * @param a array with length 1 or greater
 */
export function pop(a) {
    const elem = a.pop();
    if (elem === undefined) {
        throw new Error("pop returned undefined, array may have been empty");
    }
    return elem;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyYXkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcnJheS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQTs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLFFBQVEsQ0FBQyxLQUFhLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUMvQyxJQUFJLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRTtRQUNmLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDZCxLQUFLLEdBQUcsQ0FBQyxDQUFBO0tBQ1o7SUFFRCxNQUFNLENBQUMsR0FBYSxFQUFFLENBQUE7SUFDdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQTtLQUNwQjtJQUVELE9BQU8sQ0FBQyxDQUFBO0FBQ1osQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsUUFBUSxDQUFJLE1BQWMsRUFBRSxDQUFtQjtJQUMzRCxNQUFNLENBQUMsR0FBUSxFQUFFLENBQUE7SUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQ2Y7SUFFRCxPQUFPLENBQUMsQ0FBQTtBQUNaLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLE9BQU8sQ0FBSSxLQUFRLEVBQUUsTUFBYztJQUMvQyxNQUFNLENBQUMsR0FBUSxFQUFFLENBQUE7SUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0tBQ2hCO0lBRUQsT0FBTyxDQUFDLENBQUE7QUFDWixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLFFBQVEsQ0FBSSxDQUFjO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDMUIsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxXQUFXLENBQU8sQ0FBYyxFQUFFLENBQWM7SUFDNUQsT0FBTyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ2xDLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsR0FBRyxDQUFJLENBQU07SUFDekIsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ3BCLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtRQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLG1EQUFtRCxDQUFDLENBQUE7S0FDdkU7SUFFRCxPQUFPLElBQUksQ0FBQTtBQUNmLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuLyoqXHJcbiAqIHJldHVybnMgYW4gYXJyYXkgb2YgdGhlIGZvcm0gW3N0YXJ0Li5lbmQpIHdoZXJlIGVuZCA9IHN0YXJ0ICsgbGVuZ3RoIC0gMVxyXG4gKiBAcGFyYW0gc3RhcnQgc3RhcnQgbnVtYmVyIG9yIGxlbmd0aCBpZiBvbmx5IG9uZSBhcmd1bWVudCBpcyBwcm92aWRlZFxyXG4gKiBAcGFyYW0gbGVuZ3RoIGxlbmd0aCBvZiBhcnJheVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHNlcXVlbmNlKHN0YXJ0OiBudW1iZXIsIGxlbmd0aCA9IC0xKTogbnVtYmVyW10ge1xyXG4gICAgaWYgKGxlbmd0aCA9PT0gLTEpIHtcclxuICAgICAgICBsZW5ndGggPSBzdGFydFxyXG4gICAgICAgIHN0YXJ0ID0gMFxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGE6IG51bWJlcltdID0gW11cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBhLnB1c2goaSArIHN0YXJ0KVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBnZW5lcmF0ZSBhbiBhcnJheSBnaXZlbiBpdCdzIGxlbmd0aCBhbmQgYSBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGluZGV4XHJcbiAqIEBwYXJhbSBsZW5ndGggbGVuZ3RoIG9mIGFycmF5XHJcbiAqIEBwYXJhbSBmIGZ1bmN0aW9uIHRvIGNhbGwgd2l0aCBlYWNoIGluZGV4XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGU8VD4obGVuZ3RoOiBudW1iZXIsIGY6IChpOiBudW1iZXIpID0+IFQpIHtcclxuICAgIGNvbnN0IGE6IFRbXSA9IFtdXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgYS5wdXNoKGYoaSkpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGFcclxufVxyXG5cclxuLyoqXHJcbiAqIHJldHVybnMgYW4gYXJyYXkgb2YgdGhlIHNwZWNpZmllZCBsZW5ndGggZmlsbGVkIHdpdGggdGhlIHNwZWNpZmllZCB2YWx1ZVxyXG4gKiBAcGFyYW0gdmFsdWUgdmFsdWUgdG8gZmlsbCBhcnJheSB3aXRoXHJcbiAqIEBwYXJhbSBsZW5ndGggbGVuZ3RoIG9mIGFycmF5XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdW5pZm9ybTxUPih2YWx1ZTogVCwgbGVuZ3RoOiBudW1iZXIpOiBUW10ge1xyXG4gICAgY29uc3QgYTogVFtdID0gW11cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBhLnB1c2godmFsdWUpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGFcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBsaXN0IG9mIGRpc3RpbmN0IHZhbHVlcyBmcm9tIGFcclxuICogQHBhcmFtIGEgaXRlcmFibGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBkaXN0aW5jdDxUPihhOiBJdGVyYWJsZTxUPik6IFRbXSB7XHJcbiAgICByZXR1cm4gWy4uLm5ldyBTZXQoYSldXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbGlzdCBvZiB1bmlxdWUgdmFsdWVzIGZyb20gYVxyXG4gKiBAcGFyYW0gYSBpdGVyYWJsZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG1hcERpc3RpbmN0PFQsIFU+KGE6IEl0ZXJhYmxlPFQ+LCBmOiAoeDogVCkgPT4gVSk6IFVbXSB7XHJcbiAgICByZXR1cm4gZGlzdGluY3QoWy4uLmFdLm1hcChmKSlcclxufVxyXG5cclxuLyoqXHJcbiAqIHBvcCwgdGhyb3dpbmcgYW4gZXhjZXB0aW9uIGlmIHRoZSBhcnJheSBpcyBlbXB0eVxyXG4gKiBAcGFyYW0gYSBhcnJheSB3aXRoIGxlbmd0aCAxIG9yIGdyZWF0ZXJcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBwb3A8VD4oYTogVFtdKTogVCB7XHJcbiAgICBjb25zdCBlbGVtID0gYS5wb3AoKVxyXG4gICAgaWYgKGVsZW0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInBvcCByZXR1cm5lZCB1bmRlZmluZWQsIGFycmF5IG1heSBoYXZlIGJlZW4gZW1wdHlcIilcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZWxlbVxyXG59XHJcbiJdfQ==