/**
 * 1st attempt at a simple 2d geometry library
 */
import * as array from "../shared/array.js"

type Coords = [number, number]

export class AABB {
    constructor(readonly min: Coords, readonly max: Coords) { }

    get width() {
        return this.max[0] - this.min[0]
    }

    get height() {
        return this.max[1] - this.min[1]
    }

    get area() {
        return this.width * this.height
    }

    combine(aabb: AABB): AABB {
        const min = [Math.min(this.min[0], aabb.min[0]), Math.min(this.min[1], aabb.min[1])] as Coords
        const max = [Math.max(this.max[0], aabb.max[0]), Math.max(this.max[1], aabb.max[1])] as Coords
        const r = new AABB(min, max)
        return r
    }

    overlaps(aabb: AABB): boolean {
        return (
            this.max[0] >= aabb.min[0] &&
            this.max[1] >= aabb.min[1] &&
            this.min[0] <= aabb.max[0] &&
            this.min[1] <= aabb.max[1]
        )
    }

    clone(): AABB {
        return new AABB(this.min, this.max)
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
            aabb: aabb.combine(sibling.aabb),
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
                    const da = a.aabb.area - a.aabb.combine(aabb).area
                    const db = b.aabb.area - b.aabb.combine(aabb).area
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
            node.aabb = node.children[0].aabb.combine(node.children[1].aabb)
            node = node.parent
        }
    }
}