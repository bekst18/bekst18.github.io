export function waitRequest(req) {
    const prom = new Promise((resolve, reject) => {
        req.onsuccess = _ => resolve(req.result);
        req.onerror = _ => reject(req.error);
    });
    return prom;
}
/**
 * wait for idb transaction to complete or abort
 * complete / abort are both resolved
 * error is rejected
 * @param tx transaction
 */
export function waitTx(tx) {
    const prom = new Promise((resolve, reject) => {
        tx.oncomplete = _ => resolve();
        tx.onabort = _ => resolve();
        tx.onerror = _ => reject();
    });
    return prom;
}
/**
 * convert an array buffer to a blob
 * useful for Safari which can't directly store blobs in indexed db
 * use arrayBuffer2Blob to convert back to a blob later
 * @param blob blob
 */
export function blob2ArrayBuffer(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("loadend", _ => resolve(reader.result));
        reader.addEventListener("error", x => reject(x));
        reader.readAsArrayBuffer(blob);
    });
}
/**
 * convert an array buffer to a blob
 * @param buffer array buffer
 * @param type mime type
 */
export function arrayBuffer2Blob(buffer, type) {
    return new Blob([buffer], { type: type });
}
/**
 * retrieve all key / value pairs from an object store
 * @param store object store
 */
export async function getAllKeyValues(db, storeName) {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const datas = new Array();
    const req = store.openCursor();
    while (true) {
        const cursor = await waitRequest(req);
        if (!cursor) {
            break;
        }
        datas.push([cursor.key, cursor.value]);
        cursor.continue();
    }
    return datas;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWRiLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaWRiLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sVUFBVSxXQUFXLENBQUksR0FBa0I7SUFDN0MsTUFBTSxJQUFJLEdBQUcsSUFBSSxPQUFPLENBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDNUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDeEMsR0FBRyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDeEMsQ0FBQyxDQUFDLENBQUE7SUFFRixPQUFPLElBQUksQ0FBQTtBQUNmLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxNQUFNLENBQUMsRUFBa0I7SUFDckMsTUFBTSxJQUFJLEdBQUcsSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDL0MsRUFBRSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzlCLEVBQUUsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUMzQixFQUFFLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDOUIsQ0FBQyxDQUFDLENBQUE7SUFFRixPQUFPLElBQUksQ0FBQTtBQUNmLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxJQUFVO0lBQ3ZDLE9BQU8sSUFBSSxPQUFPLENBQWMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDaEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQTtRQUMvQixNQUFNLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFxQixDQUFDLENBQUMsQ0FBQTtRQUM5RSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2xDLENBQUMsQ0FBQyxDQUFBO0FBQ04sQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsTUFBbUIsRUFBRSxJQUFZO0lBQzlELE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0FBQzdDLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLGVBQWUsQ0FBQyxFQUFlLEVBQUUsU0FBaUI7SUFDcEUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDaEQsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUN2QyxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssRUFBc0IsQ0FBQTtJQUM3QyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDOUIsT0FBTyxJQUFJLEVBQUU7UUFDVCxNQUFNLE1BQU0sR0FBRyxNQUFNLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1QsTUFBSztTQUNSO1FBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO0tBQ3BCO0lBRUQsT0FBTyxLQUFLLENBQUE7QUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiB3YWl0UmVxdWVzdDxUPihyZXE6IElEQlJlcXVlc3Q8VD4pOiBQcm9taXNlPFQ+IHtcclxuICAgIGNvbnN0IHByb20gPSBuZXcgUHJvbWlzZTxUPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgcmVxLm9uc3VjY2VzcyA9IF8gPT4gcmVzb2x2ZShyZXEucmVzdWx0KVxyXG4gICAgICAgIHJlcS5vbmVycm9yID0gXyA9PiByZWplY3QocmVxLmVycm9yKVxyXG4gICAgfSlcclxuXHJcbiAgICByZXR1cm4gcHJvbVxyXG59XHJcblxyXG4vKipcclxuICogd2FpdCBmb3IgaWRiIHRyYW5zYWN0aW9uIHRvIGNvbXBsZXRlIG9yIGFib3J0XHJcbiAqIGNvbXBsZXRlIC8gYWJvcnQgYXJlIGJvdGggcmVzb2x2ZWRcclxuICogZXJyb3IgaXMgcmVqZWN0ZWRcclxuICogQHBhcmFtIHR4IHRyYW5zYWN0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gd2FpdFR4KHR4OiBJREJUcmFuc2FjdGlvbik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgcHJvbSA9IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICB0eC5vbmNvbXBsZXRlID0gXyA9PiByZXNvbHZlKClcclxuICAgICAgICB0eC5vbmFib3J0ID0gXyA9PiByZXNvbHZlKClcclxuICAgICAgICB0eC5vbmVycm9yID0gXyA9PiByZWplY3QoKVxyXG4gICAgfSlcclxuXHJcbiAgICByZXR1cm4gcHJvbVxyXG59XHJcblxyXG4vKipcclxuICogY29udmVydCBhbiBhcnJheSBidWZmZXIgdG8gYSBibG9iXHJcbiAqIHVzZWZ1bCBmb3IgU2FmYXJpIHdoaWNoIGNhbid0IGRpcmVjdGx5IHN0b3JlIGJsb2JzIGluIGluZGV4ZWQgZGJcclxuICogdXNlIGFycmF5QnVmZmVyMkJsb2IgdG8gY29udmVydCBiYWNrIHRvIGEgYmxvYiBsYXRlclxyXG4gKiBAcGFyYW0gYmxvYiBibG9iXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYmxvYjJBcnJheUJ1ZmZlcihibG9iOiBCbG9iKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPEFycmF5QnVmZmVyPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxyXG4gICAgICAgIHJlYWRlci5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVuZFwiLCBfID0+IHJlc29sdmUocmVhZGVyLnJlc3VsdCBhcyBBcnJheUJ1ZmZlcikpXHJcbiAgICAgICAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCB4ID0+IHJlamVjdCh4KSlcclxuICAgICAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYilcclxuICAgIH0pXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjb252ZXJ0IGFuIGFycmF5IGJ1ZmZlciB0byBhIGJsb2JcclxuICogQHBhcmFtIGJ1ZmZlciBhcnJheSBidWZmZXJcclxuICogQHBhcmFtIHR5cGUgbWltZSB0eXBlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYXJyYXlCdWZmZXIyQmxvYihidWZmZXI6IEFycmF5QnVmZmVyLCB0eXBlOiBzdHJpbmcpOiBCbG9iIHtcclxuICAgIHJldHVybiBuZXcgQmxvYihbYnVmZmVyXSwgeyB0eXBlOiB0eXBlIH0pXHJcbn1cclxuXHJcbi8qKlxyXG4gKiByZXRyaWV2ZSBhbGwga2V5IC8gdmFsdWUgcGFpcnMgZnJvbSBhbiBvYmplY3Qgc3RvcmVcclxuICogQHBhcmFtIHN0b3JlIG9iamVjdCBzdG9yZVxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFsbEtleVZhbHVlcyhkYjogSURCRGF0YWJhc2UsIHN0b3JlTmFtZTogc3RyaW5nKSA6IFByb21pc2U8QXJyYXk8W0lEQlZhbGlkS2V5LCBhbnldPj4ge1xyXG4gICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbihzdG9yZU5hbWUsIFwicmVhZG9ubHlcIilcclxuICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUoc3RvcmVOYW1lKVxyXG4gICAgY29uc3QgZGF0YXMgPSBuZXcgQXJyYXk8W0lEQlZhbGlkS2V5LCBhbnldPigpXHJcbiAgICBjb25zdCByZXEgPSBzdG9yZS5vcGVuQ3Vyc29yKClcclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgY29uc3QgY3Vyc29yID0gYXdhaXQgd2FpdFJlcXVlc3QocmVxKVxyXG4gICAgICAgIGlmICghY3Vyc29yKSB7XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkYXRhcy5wdXNoKFtjdXJzb3Iua2V5LCBjdXJzb3IudmFsdWVdKVxyXG4gICAgICAgIGN1cnNvci5jb250aW51ZSgpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGRhdGFzXHJcbn0iXX0=