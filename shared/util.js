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
        return Error(`${x}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFFSCwyRkFBMkY7QUFDM0YsTUFBTSxVQUFVLElBQUksQ0FBSSxDQUFVO0lBQzlCLElBQUk7UUFDQSxPQUFPLENBQUMsRUFBRSxDQUFBO0tBQ2I7SUFDRCxPQUFPLENBQUMsRUFBRTtRQUNOLElBQUksQ0FBQyxZQUFZLEtBQUssRUFBRTtZQUNwQixPQUFPLENBQUMsQ0FBQTtTQUNYO1FBRUQsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0tBQ3ZCO0FBQ0wsQ0FBQztBQUVELE1BQU0sVUFBVSxLQUFLLENBQUMsSUFBWSxFQUFFLENBQWE7SUFDN0MsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ25DLGdEQUFnRDtJQUNoRCxDQUFDLEVBQUUsQ0FBQTtJQUNILE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtJQUNqQyw0Q0FBNEM7SUFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksWUFBWSxPQUFPLEdBQUcsU0FBUyxLQUFLLENBQUMsQ0FBQTtBQUM1RCxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxPQUFPLENBQUksQ0FBSSxFQUFFLENBQUk7SUFDakMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ1AsT0FBTyxDQUFDLENBQUMsQ0FBQTtLQUNaO1NBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2QsT0FBTyxDQUFDLENBQUE7S0FDWDtJQUVELE9BQU8sQ0FBQyxDQUFBO0FBQ1osQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxJQUFJLENBQUMsRUFBVTtJQUMzQixNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM3QyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDbkMsQ0FBQyxDQUFDLENBQUE7SUFFRixPQUFPLE9BQU8sQ0FBQTtBQUNsQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFNoYXJlZCB1dGlsaXR5IGxpYnJhcnlcclxuICovXHJcblxyXG4vLyB0cnkgdGhlIHNwZWNpZmllZCBmdW5jdGlvbiwgcmV0dXJuIGVpdGhlciB0aGUgcmVzdWx0IG9yIGFuIGVycm9yIGlmIGFuIGV4Y2VwdGlvbiBvY2N1cmVkXHJcbmV4cG9ydCBmdW5jdGlvbiB0cnlmPFQ+KGY6ICgpID0+IFQpOiBUIHwgRXJyb3Ige1xyXG4gICAgdHJ5IHtcclxuICAgICAgICByZXR1cm4gZigpXHJcbiAgICB9XHJcbiAgICBjYXRjaCAoeCkge1xyXG4gICAgICAgIGlmICh4IGluc3RhbmNlb2YgRXJyb3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHhcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBFcnJvcihgJHt4fWApXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBiZW5jaChuYW1lOiBzdHJpbmcsIGY6ICgpID0+IHZvaWQpIHtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpXHJcbiAgICAvLyBjb25zb2xlLmxvZyhgJHtzdGFydFRpbWV9OiBzdGFydCAke25hbWV9IG1zYClcclxuICAgIGYoKVxyXG4gICAgY29uc3QgZW5kVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpXHJcbiAgICAvLyBjb25zb2xlLmxvZyhgJHtlbmRUaW1lfTogZW5kICR7bmFtZX0gbXNgKVxyXG4gICAgY29uc29sZS5sb2coYCR7bmFtZX0gZWxhcHNlZCAke2VuZFRpbWUgLSBzdGFydFRpbWV9IG1zYClcclxufVxyXG5cclxuLyoqXHJcbiAqIGNvbXBhcmUgdHdvIHByaW1pdGl2ZSBvYmplY3RzXHJcbiAqIEBwYXJhbSB4IGZpcnN0IG9iamVjdCB0byBjb21wYXJlXHJcbiAqIEBwYXJhbSB5IHNlY29uZCBvYmplY3QgdG8gY29tcGFyZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmU8VD4oeDogVCwgeTogVCk6IG51bWJlciB7XHJcbiAgICBpZiAoeCA8IHkpIHtcclxuICAgICAgICByZXR1cm4gLTFcclxuICAgIH0gZWxzZSBpZiAoeCA+IHkpIHtcclxuICAgICAgICByZXR1cm4gMVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiAwXHJcbn1cclxuXHJcbi8qKlxyXG4gKiB3YWl0LCBhbmQgdGhlbiByZXNvbHZlXHJcbiAqIEBwYXJhbSBtcyBtaWxsaXNlY29uZHMgdG8gd2FpdFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHdhaXQobXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCBfKSA9PiB7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiByZXNvbHZlKCksIG1zKVxyXG4gICAgfSlcclxuXHJcbiAgICByZXR1cm4gcHJvbWlzZVxyXG59Il19