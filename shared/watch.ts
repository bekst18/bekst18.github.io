/**
 * Watch library
 */

export class Watch<T> {
    constructor(private x: T) {
        
    }

    get value() {
        return this.x;
    }
}