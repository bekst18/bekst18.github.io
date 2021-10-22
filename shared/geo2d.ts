/**
 * 1st attempt at a simple 2d geometry library
 */
import * as array from "../shared/array.js"

export interface PointOptions {
    x: number,
    y: number
}

export class Point {
    constructor(public x: number, public y: number) { }

    static fromJSON(options: PointOptions): Point {
        return new Point(options.x, options.y)
    }

    equal(pt: Point): boolean {
        return this.x === pt.x && this.y === pt.y
    }

    addScalar(x: number): Point {
        return new Point(this.x + x, this.y + x)
    }

    subScalar(x: number): Point {
        return new Point(this.x - x, this.y - x)
    }

    mulScalar(x: number): Point {
        return new Point(this.x * x, this.y * x)
    }

    divScalar(x: number): Point {
        return new Point(this.x / x, this.y / x)
    }

    addPoint(pt: Point): Point {
        return new Point(this.x + pt.x, this.y + pt.y)
    }

    subPoint(pt: Point): Point {
        return new Point(this.x - pt.x, this.y - pt.y)
    }

    mulPoint(pt: Point): Point {
        return new Point(this.x * pt.x, this.y * pt.y)
    }

    divPoint(pt: Point): Point {
        return new Point(this.x / pt.x, this.y / pt.y)
    }

    floor(): Point {
        return new Point(Math.floor(this.x), Math.floor(this.y))
    }

    ciel(): Point {
        return new Point(Math.ceil(this.x), Math.ceil(this.y))
    }

    round(): Point {
        return new Point(Math.round(this.x), Math.round(this.y))
    }

    sign(): Point {
        return new Point(Math.sign(this.x), Math.sign(this.y))
    }

    abs(): Point {
        return new Point(Math.abs(this.x), Math.abs(this.y))
    }

    neg(): Point {
        return new Point(-this.x, -this.y)
    }

    max(): number {
        return Math.max(this.x, this.y)
    }

    min(): number {
        return Math.min(this.x, this.y)
    }

    clone(): Point {
        return new Point(this.x, this.y)
    }

    toJSON(): PointOptions {
        return {
            x: this.x,
            y: this.y,
        }
    }

    static inf() {
        return new Point(Infinity, Infinity)
    }

    static negInf() {
        return new Point(-Infinity, -Infinity)
    }
}

export class AABB {
    constructor(readonly min: Point, readonly max: Point) { }

    get width() {
        return this.max.x - this.min.x
    }

    get height() {
        return this.max.y - this.min.y
    }

    get area() {
        return this.width * this.height
    }

    get center(): Point {
        return new Point(this.min.x + this.width / 2, this.min.y + this.height / 2)
    }

    union(aabb: AABB): AABB {
        const min = new Point(Math.min(this.min.x, aabb.min.x), Math.min(this.min.y, aabb.min.y))
        const max = new Point(Math.max(this.max.x, aabb.max.x), Math.max(this.max.y, aabb.max.y))
        const r = new AABB(min, max)
        return r
    }

    intersection(aabb: AABB): AABB {
        const min = new Point(Math.max(this.min.x, aabb.min.x), Math.max(this.min.y, aabb.min.y))
        const max = new Point(Math.min(this.max.x, aabb.max.x), Math.min(this.max.y, aabb.max.y))
        const r = new AABB(min, max)
        return r
    }

    overlaps(aabb: AABB): boolean {
        return (
            this.max.x >= aabb.min.x &&
            this.max.y >= aabb.min.y &&
            this.min.x <= aabb.max.x &&
            this.min.y <= aabb.max.y
        )
    }

    contains(pt: Point): boolean {
        return (
            pt.x >= this.min.x &&
            pt.y >= this.min.y &&
            pt.x < this.max.x &&
            pt.y < this.max.y
        )
    }

    translate(offset: Point): AABB {
        return new AABB(this.min.addPoint(offset), this.max.addPoint(offset))
    }

    scale(s: number): AABB {
        return new AABB(this.min.mulScalar(s), this.max.mulScalar(s))
    }

    buffer(padding: number): AABB {
        const min = new Point(this.min.x - padding, this.min.y - padding)
        const max = new Point(this.max.x + padding, this.max.y + padding)
        return new AABB(min, max)
    }

    shrink(amount: number): AABB {
        return this.buffer(-amount)
    }

    clone(): AABB {
        return new AABB(this.min.clone(), this.max.clone())
    }

    static empty(): AABB {
        return new AABB(Point.inf(), Point.negInf())
    }

    static inf(): AABB {
        return new AABB(Point.negInf(), Point.inf())
    }
}

enum NodeType {
    Internal,
    Leaf
}

interface InternalNode<T> {
    type: NodeType.Internal
    aabb: AABB
    parent: InternalNode<T> | null
    children: Node<T>[]
}

interface LeafNode<T> {
    type: NodeType.Leaf
    aabb: AABB
    parent: InternalNode<T> | null
    data: T
}

type Node<T> = InternalNode<T> | LeafNode<T>

export class AABBTree<T> {
    root: Node<T> | null = null

    constructor() { }

    /**
     * insert a new node into the tree
     * returns a reference to the leaf node that can later be used for removal
     * @param aabb aabb of data
     * @param data data to insert
     */
    insert(aabb: AABB, data: T): LeafNode<T> {
        // create the leaf node that will be inserted
        const newLeaf: LeafNode<T> = {
            type: NodeType.Leaf,
            aabb: aabb.clone(),
            parent: null,
            data
        }

        // no root, create a leaf
        if (!this.root) {
            this.root = newLeaf
            return newLeaf
        }

        // otherwise, choose a leaf to become the sibling of the new leaf
        const sibling = this.chooseSiblingLeaf(this.root, aabb)

        // create a new parent node
        const newParent: InternalNode<T> = {
            type: NodeType.Internal,
            parent: sibling.parent,
            aabb: aabb.union(sibling.aabb),
            children: [newLeaf, sibling]
        }

        sibling.parent = newParent
        newLeaf.parent = newParent

        // replace link in old parent with newly created parent
        // or if there was no parent, leaf was root, make new parent the new root
        let parent = newParent.parent
        if (parent) {
            const idx = parent.children.indexOf(sibling)
            if (idx === -1) {
                throw new Error("Could not find link to chosen sibling")
            }

            parent.children[idx] = newParent
        } else {
            this.root = newParent
        }

        this.updateAABBs(parent)
        return newLeaf
    }

    /**
     * removes specified leaf node and its data from the tree
     * @param leaf leaf 
     */
    delete(leaf: LeafNode<T>) {
        // special case - leaf is root
        if (this.root === leaf) {
            this.root = null
            return
        }

        const parent = leaf.parent
        if (!parent) {
            throw new Error("Invalid tree, non-root leaf has no parent")
        }

        // otherwise,
        // replace leaf.parent with leaf's sibling
        // recalculate aabbs
        const sibling = parent.children.find(n => n !== leaf)
        if (!sibling) {
            throw new Error("Invalid tree, leaf node has no sibling")
        }

        const grandParent = parent.parent

        // no grandparent - parent was root - make sibling the new root
        if (!grandParent) {
            this.root = sibling
            sibling.parent = null
            return
        }

        const parentIdx = grandParent.children.indexOf(parent)
        if (parentIdx === -1) {
            throw new Error("Invalid tree, grandparent does not have link to parent")
        }

        grandParent.children[parentIdx] = sibling
        sibling.parent = grandParent
        this.updateAABBs(grandParent)
    }

    /**
     * Iterates over all data that overlaps the AABB
     * @param aabb aabb
     */
    public *query(aabb: AABB): Iterable<T> {
        const stack: Node<T>[] = []
        if (this.root && this.root.aabb.overlaps(aabb)) {
            stack.push(this.root)
        }

        while (stack.length > 0) {
            const node = array.pop(stack)
            switch (node.type) {
                case NodeType.Internal:
                    for (const child of node.children) {
                        if (child.aabb.overlaps(aabb)) {
                            stack.push(child)
                        }
                    }
                    break;

                case NodeType.Leaf:
                    yield node.data
                    break;
            }
        }
    }

    private chooseSiblingLeaf(node: Node<T>, aabb: AABB): Node<T> {
        // choose the leaf that would increase least in area by including this node
        switch (node.type) {
            case NodeType.Internal:
                const n = node.children.reduce((a, b) => {
                    // calculate surface area increase for node a
                    const da = a.aabb.area - a.aabb.union(aabb).area
                    const db = b.aabb.area - b.aabb.union(aabb).area
                    return da < db ? a : b
                })

                return this.chooseSiblingLeaf(n, aabb)
                break;

            case NodeType.Leaf:
                // we've reached a leaf - return it
                return node
        }
    }

    private updateAABBs(node: InternalNode<T> | null) {
        while (node != null) {
            node.aabb = node.children[0].aabb.union(node.children[1].aabb)
            node = node.parent
        }
    }
}

/**
 * calculate manhatten distance between coordinates
 * @param a first point
 * @param b second point
 */
export function calcManhattenDist(a: Point, b: Point): number {
    return Math.abs(b.x - a.x) + Math.abs(b.y - a.y)
}