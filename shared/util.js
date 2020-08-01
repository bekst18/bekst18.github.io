/**
 * Shared utility library
 */
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
export function bench(name, f) {
    const startTime = performance.now();
    // console.log(`${startTime}: start ${name} ms`)
    f();
    const endTime = performance.now();
    // console.log(`${endTime}: end ${name} ms`)
    console.log(`${name} elapsed ${endTime - startTime} ms`);
}
/**
 * compare two primitive objects
 * @param x first object to compare
 * @param y second object to compare
 */
export function compare(x, y) {
    if (x < y) {
        return -1;
    }
    else if (x > y) {
        return 1;
    }
    return 0;
}
/**
 * wait, and then resolve
 * @param ms milliseconds to wait
 */
export function wait(ms) {
    const promise = new Promise((resolve, _) => {
        setTimeout(() => resolve(), ms);
    });
    return promise;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFFSCwyRkFBMkY7QUFDM0YsTUFBTSxVQUFVLElBQUksQ0FBSSxDQUFVO0lBQzlCLElBQUk7UUFDQSxPQUFPLENBQUMsRUFBRSxDQUFBO0tBQ2I7SUFDRCxPQUFPLENBQUMsRUFBRTtRQUNOLElBQUksQ0FBQyxZQUFZLEtBQUssRUFBRTtZQUNwQixPQUFPLENBQUMsQ0FBQTtTQUNYO1FBRUQsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7S0FDN0I7QUFDTCxDQUFDO0FBRUQsTUFBTSxVQUFVLEtBQUssQ0FBQyxJQUFZLEVBQUUsQ0FBYTtJQUM3QyxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUE7SUFDbkMsZ0RBQWdEO0lBQ2hELENBQUMsRUFBRSxDQUFBO0lBQ0gsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ2pDLDRDQUE0QztJQUM1QyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxZQUFZLE9BQU8sR0FBRyxTQUFTLEtBQUssQ0FBQyxDQUFBO0FBQzVELENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLE9BQU8sQ0FBSSxDQUFJLEVBQUUsQ0FBSTtJQUNqQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDUCxPQUFPLENBQUMsQ0FBQyxDQUFBO0tBQ1o7U0FBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDZCxPQUFPLENBQUMsQ0FBQTtLQUNYO0lBRUQsT0FBTyxDQUFDLENBQUE7QUFDWixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLElBQUksQ0FBQyxFQUFVO0lBQzNCLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzdDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNuQyxDQUFDLENBQUMsQ0FBQTtJQUVGLE9BQU8sT0FBTyxDQUFBO0FBQ2xCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogU2hhcmVkIHV0aWxpdHkgbGlicmFyeVxyXG4gKi9cclxuXHJcbi8vIHRyeSB0aGUgc3BlY2lmaWVkIGZ1bmN0aW9uLCByZXR1cm4gZWl0aGVyIHRoZSByZXN1bHQgb3IgYW4gZXJyb3IgaWYgYW4gZXhjZXB0aW9uIG9jY3VyZWRcclxuZXhwb3J0IGZ1bmN0aW9uIHRyeWY8VD4oZjogKCkgPT4gVCk6IFQgfCBFcnJvciB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBmKClcclxuICAgIH1cclxuICAgIGNhdGNoICh4KSB7XHJcbiAgICAgICAgaWYgKHggaW5zdGFuY2VvZiBFcnJvcikge1xyXG4gICAgICAgICAgICByZXR1cm4geFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIEVycm9yKHgudG9TdHJpbmcoKSlcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGJlbmNoKG5hbWU6IHN0cmluZywgZjogKCkgPT4gdm9pZCkge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KClcclxuICAgIC8vIGNvbnNvbGUubG9nKGAke3N0YXJ0VGltZX06IHN0YXJ0ICR7bmFtZX0gbXNgKVxyXG4gICAgZigpXHJcbiAgICBjb25zdCBlbmRUaW1lID0gcGVyZm9ybWFuY2Uubm93KClcclxuICAgIC8vIGNvbnNvbGUubG9nKGAke2VuZFRpbWV9OiBlbmQgJHtuYW1lfSBtc2ApXHJcbiAgICBjb25zb2xlLmxvZyhgJHtuYW1lfSBlbGFwc2VkICR7ZW5kVGltZSAtIHN0YXJ0VGltZX0gbXNgKVxyXG59XHJcblxyXG4vKipcclxuICogY29tcGFyZSB0d28gcHJpbWl0aXZlIG9iamVjdHNcclxuICogQHBhcmFtIHggZmlyc3Qgb2JqZWN0IHRvIGNvbXBhcmVcclxuICogQHBhcmFtIHkgc2Vjb25kIG9iamVjdCB0byBjb21wYXJlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZTxUPih4OiBULCB5OiBUKTogbnVtYmVyIHtcclxuICAgIGlmICh4IDwgeSkge1xyXG4gICAgICAgIHJldHVybiAtMVxyXG4gICAgfSBlbHNlIGlmICh4ID4geSkge1xyXG4gICAgICAgIHJldHVybiAxXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIDBcclxufVxyXG5cclxuLyoqXHJcbiAqIHdhaXQsIGFuZCB0aGVuIHJlc29sdmVcclxuICogQHBhcmFtIG1zIG1pbGxpc2Vjb25kcyB0byB3YWl0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gd2FpdChtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIF8pID0+IHtcclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHJlc29sdmUoKSwgbXMpXHJcbiAgICB9KVxyXG5cclxuICAgIHJldHVybiBwcm9taXNlXHJcbn0iXX0=