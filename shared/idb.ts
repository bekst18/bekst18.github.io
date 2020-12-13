export function waitRequest<T>(req: IDBRequest<T>): Promise<T> {
    const prom = new Promise<T>((resolve, reject) => {
        req.onsuccess = _ => resolve(req.result)
        req.onerror = _ => reject(req.error)
    })

    return prom
}

/**
 * wait for idb transaction to complete or abort
 * complete / abort are both resolved
 * error is rejected
 * @param tx transaction
 */
export function waitTx(tx: IDBTransaction): Promise<void> {
    const prom = new Promise<void>((resolve, reject) => {
        tx.oncomplete = _ => resolve()
        tx.onabort = _ => resolve()
        tx.onerror = _ => reject()
    })

    return prom
}

/**
 * convert an array buffer to a blob
 * useful for Safari which can't directly store blobs in indexed db
 * use arrayBuffer2Blob to convert back to a blob later
 * @param blob blob
 */
export function blob2ArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.addEventListener("loadend", _ => resolve(reader.result as ArrayBuffer))
        reader.addEventListener("error", x => reject(x))
        reader.readAsArrayBuffer(blob)
    })
}

/**
 * convert an array buffer to a blob
 * @param buffer array buffer
 * @param type mime type
 */
export function arrayBuffer2Blob(buffer: ArrayBuffer, type: string): Blob {
    return new Blob([buffer], { type: type })
}