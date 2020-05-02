/**
 * a generic 2d array of data
 */
export class Grid<T> {
    private data: T[] = []

    constructor(readonly width: number, readonly height: number, f: (x: number, y: number) => T) {
        for (let y = 0; y < height; ++y) {
            for (let x = 0; x < width; ++x) {
                this.data.push(f(x, y))
            }
        }
    }

    assertBounds(x: number, y: number) {
        if (x < 0 || x >= this.width) {
            throw new Error(`${x} x-coordinate is out of bounds, must be between 0 and ${this.width - 1}`)
        }

        if (y < 0 || y >= this.width) {
            throw new Error(`${y} y-coordinate is out of bounds, must be between 0 and ${this.height - 1}`)
        }
    }

    inBounds(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height
    }

    regionInBounds(x: number, y: number, width: number, height: number): boolean {
        return this.inBounds(x, y) && this.inBounds(x + width - 1, y + height - 1)
    }

    flat(x: number, y: number): number {
        this.assertBounds(x, y)
        const i = y * this.width + x
        return i
    }

    /**
     * return item at specified "flat" index
     * @param i flat coordinate to access item at 
     */
    atf(i: number): T {
        const item = this.data[i]
        return item
    }

    /**
     * access item at specified coordinates
     * @param x x coordinate
     * @param y y coordinate
     */
    at(x: number, y: number): T {
        const i = this.flat(x, y)
        const item = this.atf(i)
        return item
    }

    /**
     * set item at specified flat index to specified value
     * @param i flat index of item
     * @param value value
     */
    setf(i: number, value: T): void {
        this.data[i] = value
    }

    /**
     * set item at specified coordinates to specified value
     * @param x x coordinate
     * @param y y coordinate
     * @param value value to set
     */
    set(x: number, y: number, value: T): void {
        this.setf(this.flat(x, y), value)
    }

    /**
     * scan the specified region of the array
     * @param x0 x coord
     * @param y0 y coord
     * @param width width of scan region
     * @param height height of scan region
     * @param f function to call for each x/y coordinate
     */
    scanRegion(x0: number, y0: number, width: number, height: number, f: (x: number, y: number, v: T) => void): void {
        const r = x0 + width
        const b = y0 + height

        for (let y = y0; y < b; ++y) {
            for (let x = x0; x < r; ++x) {
                f(x, y, this.at(x, y))
            }
        }
    }

    /**
     * scan the entire grid
     * @param f function to call for each x/y coordinate
     */
    scan(f: (x: number, y: number, v: T) => void): void {
        this.scanRegion(0, 0, this.width, this.height, f)
    }

    *[Symbol.iterator]() {
        for (const x of this.data) {
            yield x
        }
    }


    /**
     * iterate over a specified region
     */
    *iterRegion(x0: number, y0: number, width: number, height: number) {
        const r = x0 + width
        const b = y0 + height

        for (let x = x0; x < r; ++x) {
            for (let y = y0; y < b; ++y) {
                yield this.at(x, y)
            }
        }
    }

    /**
     * copy a portion of this grid into a new grid
     */
    Grid<T> subgrid(x: number, y: number, width: number, height: number) {
        const dst = new Grid<T>(width, height, (dx, dy)=>this.at(x + dx, y + dy))
        return dst
    }
}

/**
 * copy source grid to destination grid
 * @param src source grid
 * @param dst destination grid
 * @param x destination x offset
 * @param y destination y offset
 */
export function copy<T>(src: Grid<T>, dst: Grid<T>, dx: number, dy: number) {
    src.scan((x, y, v) => {
        dst.set(x + dx, y + dy, v)
    })
}

/**
 * copy a region of grid to subgrid
 * @param src source grid
 * @param sx source x offset
 * @param sy source y offset
 * @param width width of region
 * @param height height of region
 * @param dst destination grid
 * @param dx destination x offset
 * @param dy destination y offset
 */
export function copyRegion<T>(
    src: Grid<T>, sx: number, sy: number, width: number, height: number,
    dst: Grid<T>, dx: number, dy: number) {
    src.scanRegion(sx, sy, width, height, (x, y, v) => {
        dst.set(x + dx, y + dy, v)
    })
}