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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFFSCwyRkFBMkY7QUFDM0YsTUFBTSxVQUFVLElBQUksQ0FBSSxDQUFVO0lBQzlCLElBQUk7UUFDQSxPQUFPLENBQUMsRUFBRSxDQUFBO0tBQ2I7SUFDRCxPQUFPLENBQUMsRUFBRTtRQUNOLElBQUksQ0FBQyxZQUFZLEtBQUssRUFBRTtZQUNwQixPQUFPLENBQUMsQ0FBQTtTQUNYO1FBRUQsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7S0FDN0I7QUFDTCxDQUFDO0FBRUQsTUFBTSxVQUFVLEtBQUssQ0FBQyxJQUFZLEVBQUUsQ0FBYTtJQUM3QyxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUE7SUFDbkMsZ0RBQWdEO0lBQ2hELENBQUMsRUFBRSxDQUFBO0lBQ0gsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ2pDLDRDQUE0QztJQUM1QyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxZQUFZLE9BQU8sR0FBRyxTQUFTLEtBQUssQ0FBQyxDQUFBO0FBQzVELENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLE9BQU8sQ0FBSSxDQUFJLEVBQUUsQ0FBSTtJQUNqQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDUCxPQUFPLENBQUMsQ0FBQyxDQUFBO0tBQ1o7U0FBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDZCxPQUFPLENBQUMsQ0FBQTtLQUNYO0lBRUQsT0FBTyxDQUFDLENBQUE7QUFDWixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFNoYXJlZCB1dGlsaXR5IGxpYnJhcnlcclxuICovXHJcblxyXG4vLyB0cnkgdGhlIHNwZWNpZmllZCBmdW5jdGlvbiwgcmV0dXJuIGVpdGhlciB0aGUgcmVzdWx0IG9yIGFuIGVycm9yIGlmIGFuIGV4Y2VwdGlvbiBvY2N1cmVkXHJcbmV4cG9ydCBmdW5jdGlvbiB0cnlmPFQ+KGY6ICgpID0+IFQpOiBUIHwgRXJyb3Ige1xyXG4gICAgdHJ5IHtcclxuICAgICAgICByZXR1cm4gZigpXHJcbiAgICB9XHJcbiAgICBjYXRjaCAoeCkge1xyXG4gICAgICAgIGlmICh4IGluc3RhbmNlb2YgRXJyb3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHhcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBFcnJvcih4LnRvU3RyaW5nKCkpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBiZW5jaChuYW1lOiBzdHJpbmcsIGY6ICgpID0+IHZvaWQpIHtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpXHJcbiAgICAvLyBjb25zb2xlLmxvZyhgJHtzdGFydFRpbWV9OiBzdGFydCAke25hbWV9IG1zYClcclxuICAgIGYoKVxyXG4gICAgY29uc3QgZW5kVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpXHJcbiAgICAvLyBjb25zb2xlLmxvZyhgJHtlbmRUaW1lfTogZW5kICR7bmFtZX0gbXNgKVxyXG4gICAgY29uc29sZS5sb2coYCR7bmFtZX0gZWxhcHNlZCAke2VuZFRpbWUgLSBzdGFydFRpbWV9IG1zYClcclxufVxyXG5cclxuLyoqXHJcbiAqIGNvbXBhcmUgdHdvIHByaW1pdGl2ZSBvYmplY3RzXHJcbiAqIEBwYXJhbSB4IGZpcnN0IG9iamVjdCB0byBjb21wYXJlXHJcbiAqIEBwYXJhbSB5IHNlY29uZCBvYmplY3QgdG8gY29tcGFyZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmU8VD4oeDogVCwgeTogVCk6IG51bWJlciB7XHJcbiAgICBpZiAoeCA8IHkpIHtcclxuICAgICAgICByZXR1cm4gLTFcclxuICAgIH0gZWxzZSBpZiAoeCA+IHkpIHtcclxuICAgICAgICByZXR1cm4gMVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiAwXHJcbn0iXX0=