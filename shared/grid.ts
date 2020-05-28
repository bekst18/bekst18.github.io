import * as geo from "../shared/geo2d.js"
import * as array from "../shared/array.js"

/**
 * a generic 2d array of data
 */
export class Grid<T> {
    constructor(readonly width: number = 0, readonly height: number = 0, readonly data: T[], readonly offset: number = 0, readonly rowPitch: number = 0) {
        // check for errors
        if (this.rowPitch === 0) {
            this.rowPitch = this.width
        }

        const maxOffset = this.offset + this.rowPitch * (this.height - 1) + this.width
        if (maxOffset > this.data.length) {
            throw new Error(`Max offset of ${maxOffset} is greater than length of data array - ${this.data.length}`)
        }
    }

    /**
     * get total number of entries - width * height
     */
    get size(): number {
        return this.width * this.height
    }

    assertBounds(x: number, y: number) {
        if (x < 0 || x >= this.width) {
            throw new Error(`${x} x-coordinate is out of bounds, must be between 0 and ${this.width - 1}`)
        }

        if (y < 0 || y >= this.height) {
            throw new Error(`${y} y-coordinate is out of bounds, must be between 0 and ${this.height - 1}`)
        }
    }

    inBounds(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height
    }

    regionInBounds(x: number, y: number, width: number, height: number): boolean {
        return this.inBounds(x, y) && this.inBounds(x + width - 1, y + height - 1)
    }

    aabbInBounds(aabb: geo.AABB): boolean {
        return this.regionInBounds(aabb.min.x, aabb.min.y, aabb.width, aabb.height)
    }

    /**
     * return flattened index for specified coordinates
     * @param x x coord
     * @param y y coord
     */
    flat(x: number, y: number): number {
        this.assertBounds(x, y)
        const i = this.offset + y * this.rowPitch + x
        return i
    }

    /**
     * return flattened index for coordinates
     * @param xy coordinates to flatten
     */
    flatPoint(xy: geo.Point): number {
        const { x, y } = xy
        return this.flat(x, y)
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
     * access item at specified coordinates
     * @param xy coordinates to access
     */
    atPoint(xy: geo.Point): T {
        const { x, y } = xy
        return this.at(x, y)
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
     * set item at specified coordinates to specified value
     * @param xy point
     * @param value value to set
     */
    setPoint(xy: geo.Point, value: T): void {
        const { x, y } = xy
        this.set(x, y, value)
    }

    /**
     * scan the specified region of the array
     * @param x0 x coord
     * @param y0 y coord
     * @param width width of scan region
     * @param height height of scan region
     * @param f function to call for each x/y coordinate
     */
    *scanRegion(x0: number, y0: number, width: number, height: number): Iterable<[T, number, number]> {
        const r = x0 + width
        const b = y0 + height

        for (let y = y0; y < b; ++y) {
            for (let x = x0; x < r; ++x) {
                yield [this.at(x, y), x, y]
            }
        }
    }

    /**
     * scan the specified region of the array
     * @param aabb aabb containing area to scan
     * @param f function to call for each x/y coordinate
     */
    scanAABB(aabb: geo.AABB): Iterable<[T, number, number]> {
        return this.scanRegion(aabb.min.x, aabb.min.y, aabb.width, aabb.height)
    }

    /**
     * scan the entire grid
     * @param f function to call for each x/y coordinate
     */
    scan(): Iterable<[T, number, number]> {
        return this.scanRegion(0, 0, this.width, this.height)
    }

    /**
     * iterate over all data in grid
     */
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
    * iterate over a specified region
    */
    iterAABB(aabb: geo.AABB) {
        return this.iterRegion(aabb.min.x, aabb.min.y, aabb.width, aabb.height)
    }

    /**
     * copy a portion of this grid into a new grid
     */
    view(x: number, y: number, width: number, height: number): Grid<T> {
        const offset = this.flat(x, y)
        const dst = new Grid<T>(width, height, this.data, offset, this.rowPitch)
        return dst
    }

    /**
    * copy a portion of this grid into a new grid
    */
    viewAABB(aabb: geo.AABB): Grid<T> {
        const v = this.view(aabb.min.x, aabb.min.y, aabb.width, aabb.height)
        return v
    }

    /**
     * construct an array by applying a function to every element in this grid
     * @param f mapping function
     */
    map<U>(f: (v: T, x: number, y: number) => U): U[] {
        const data: U[] = []
        for (let y = 0; y < this.height; ++y) {
            for (let x = 0; x < this.width; ++x) {
                const v = this.at(x, y)
                data.push(f(v, x, y))
            }
        }

        return data
    }

    /**
     * construct a grid by applying a function to every element in this grid
     * @param f mapping function
     */
    map2<U>(f: (v: T, x: number, y: number) => U): Grid<U> {
        const data = this.map(f)
        return new Grid<U>(this.width, this.height, data)
    }

    /**
     * find the coordinates of an element in the grid that meets the specified criteria
     * @param f predicate function
     */
    findPoint(f: (v: T) => boolean): (geo.Point | null) {
        for (let y = 0; y < this.height; ++y) {
            for (let x = 0; x < this.width; ++x) {
                const v = this.at(x, y)
                if (f(v)) {
                    return new geo.Point(x, y)
                }
            }
        }

        return null
    }

    /**
     * find the coordinates of all elements in the grid that meet the specified criteria
     * @param f predicate function
     */
    *findPoints(f: (v:T)=>boolean) : Iterable<geo.Point> {
        for (let y = 0; y < this.height; ++y) {
            for (let x = 0; x < this.width; ++x) {
                const v = this.at(x, y)
                if (f(v)) {
                    yield new geo.Point(x, y)
                }
            }
        }
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
    for (const [v, x, y] of src.scan()) {
        dst.set(x + dx, y + dy, v)
    }
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

    for (const [v, x, y] of src.scanRegion(sx, sy, width, height)) {
        dst.set(x + dx, y + dy, v)
    }
}

/**
 * Generate a grid of specified width and height by invoking function for every element
 * @param width width of grid
 * @param height height of grid
 * @param f function to invoke to get value for every x,y coordinate of grid
 */
export function generate<T>(width: number, height: number, f: (x: number, y: number) => T): Grid<T> {
    const data: T[] = []
    for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
            data.push(f(x, y))
        }
    }

    const grd = new Grid<T>(width, height, data)
    return grd
}

export function* scan(x0: number, y0: number, width: number, height: number): Iterable<geo.Point> {
    const r = x0 + width
    const b = y0 + height

    for (let x = x0; x < r; ++x) {
        for (let y = y0; y < b; ++y) {
            yield new geo.Point(x, y)
        }
    }
}

export function* visitNeighbors<T>(cells: Grid<T>, pt: geo.Point): Iterable<[T, geo.Point]> {
    cells.assertBounds(pt.x, pt.y)

    // w
    if (pt.x > 0) {
        const w = new geo.Point(pt.x - 1, pt.y)
        yield [cells.atPoint(w), w]
    }

    // s
    if (pt.y < cells.height - 1) {
        const s = new geo.Point(pt.x, pt.y + 1)
        yield [cells.atPoint(s), s]
    }

    // e
    if (pt.x < cells.width - 1) {
        const e = new geo.Point(pt.x + 1, pt.y)
        yield [cells.atPoint(e), e]
    }

    // n
    if (pt.y > 0) {
        const n = new geo.Point(pt.x, pt.y - 1)
        yield [cells.atPoint(n), n]
    }
}

/**
 * calculate the maximal rectangle that satisfies the specified predicate
 * @param grd grid
 * @param f predicate
 */
export function findMaximalRect<T>(grd: Grid<T>, f: (x: T) => boolean): geo.AABB {
    // derived from https://stackoverflow.com/questions/7245/puzzle-find-largest-rectangle-maximal-rectangle-problem
    // algorithm needs to keep track of rectangle state for every column for every region
    const { width, height } = grd
    const ls = array.uniform(0, width)
    const rs = array.uniform(width, width)
    const hs = array.uniform(0, width)
    const sat = array.uniform(false, width)

    let maxArea = 0
    const aabb = new geo.AABB(new geo.Point(0, 0), new geo.Point(0, 0))

    for (let y = 0; y < height; ++y) {
        let l = 0
        let r = grd.width

        // determine whether each cell meets predicate
        for (let x = 0; x < width; ++x) {
            sat[x] = f(grd.at(x, y))
        }

        // height scan
        for (let x = 0; x < width; ++x) {
            if (sat[x]) {
                hs[x] += 1
            } else {
                hs[x] = 0
            }
        }

        // l scan
        for (let x = 0; x < width; ++x) {
            if (sat[x]) {
                ls[x] = Math.max(ls[x], l)
            } else {
                ls[x] = 0
                l = x + 1
            }
        }

        // r scan
        for (let x = width - 1; x >= 0; --x) {
            if (sat[x]) {
                rs[x] = Math.min(rs[x], r)
            } else {
                rs[x] = width
                r = x
            }
        }

        // area scan
        for (let x = 0; x < width; ++x) {
            const area = hs[x] * (rs[x] - ls[x])
            if (area > maxArea) {
                maxArea = area
                aabb.min.x = ls[x]
                aabb.max.x = rs[x]
                aabb.min.y = y - hs[x] + 1
                aabb.max.y = y + 1
            }
        }
    }

    return aabb
}