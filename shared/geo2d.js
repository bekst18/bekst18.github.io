/**
 * 1st attempt at a simple 2d geometry library
 */
import * as array from "../shared/array.js";
export class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    static fromJSON(options) {
        return new Point(options.x, options.y);
    }
    equal(pt) {
        return this.x === pt.x && this.y === pt.y;
    }
    addScalar(x) {
        return new Point(this.x + x, this.y + x);
    }
    subScalar(x) {
        return new Point(this.x - x, this.y - x);
    }
    mulScalar(x) {
        return new Point(this.x * x, this.y * x);
    }
    divScalar(x) {
        return new Point(this.x / x, this.y / x);
    }
    addPoint(pt) {
        return new Point(this.x + pt.x, this.y + pt.y);
    }
    subPoint(pt) {
        return new Point(this.x - pt.x, this.y - pt.y);
    }
    mulPoint(pt) {
        return new Point(this.x * pt.x, this.y * pt.y);
    }
    divPoint(pt) {
        return new Point(this.x / pt.x, this.y / pt.y);
    }
    floor() {
        return new Point(Math.floor(this.x), Math.floor(this.y));
    }
    ciel() {
        return new Point(Math.ceil(this.x), Math.ceil(this.y));
    }
    round() {
        return new Point(Math.round(this.x), Math.round(this.y));
    }
    sign() {
        return new Point(Math.sign(this.x), Math.sign(this.y));
    }
    abs() {
        return new Point(Math.abs(this.x), Math.abs(this.y));
    }
    neg() {
        return new Point(-this.x, -this.y);
    }
    max() {
        return Math.max(this.x, this.y);
    }
    min() {
        return Math.min(this.x, this.y);
    }
    clone() {
        return new Point(this.x, this.y);
    }
    toJSON() {
        return {
            x: this.x,
            y: this.y,
        };
    }
    static inf() {
        return new Point(Infinity, Infinity);
    }
    static negInf() {
        return new Point(-Infinity, -Infinity);
    }
}
export class AABB {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }
    get width() {
        return this.max.x - this.min.x;
    }
    get height() {
        return this.max.y - this.min.y;
    }
    get area() {
        return this.width * this.height;
    }
    get center() {
        return new Point(this.min.x + this.width / 2, this.min.y + this.height / 2);
    }
    union(aabb) {
        const min = new Point(Math.min(this.min.x, aabb.min.x), Math.min(this.min.y, aabb.min.y));
        const max = new Point(Math.max(this.max.x, aabb.max.x), Math.max(this.max.y, aabb.max.y));
        const r = new AABB(min, max);
        return r;
    }
    intersection(aabb) {
        const min = new Point(Math.max(this.min.x, aabb.min.x), Math.max(this.min.y, aabb.min.y));
        const max = new Point(Math.min(this.max.x, aabb.max.x), Math.min(this.max.y, aabb.max.y));
        const r = new AABB(min, max);
        return r;
    }
    overlaps(aabb) {
        return (this.max.x >= aabb.min.x &&
            this.max.y >= aabb.min.y &&
            this.min.x <= aabb.max.x &&
            this.min.y <= aabb.max.y);
    }
    contains(pt) {
        return (pt.x >= this.min.x &&
            pt.y >= this.min.y &&
            pt.x < this.max.x &&
            pt.y < this.max.y);
    }
    translate(offset) {
        return new AABB(this.min.addPoint(offset), this.max.addPoint(offset));
    }
    scale(s) {
        return new AABB(this.min.mulScalar(s), this.max.mulScalar(s));
    }
    buffer(padding) {
        const min = new Point(this.min.x - padding, this.min.y - padding);
        const max = new Point(this.max.x + padding, this.max.y + padding);
        return new AABB(min, max);
    }
    shrink(amount) {
        return this.buffer(-amount);
    }
    clone() {
        return new AABB(this.min.clone(), this.max.clone());
    }
    static empty() {
        return new AABB(Point.inf(), Point.negInf());
    }
    static inf() {
        return new AABB(Point.negInf(), Point.inf());
    }
}
var NodeType;
(function (NodeType) {
    NodeType[NodeType["Internal"] = 0] = "Internal";
    NodeType[NodeType["Leaf"] = 1] = "Leaf";
})(NodeType || (NodeType = {}));
export class AABBTree {
    constructor() {
        this.root = null;
    }
    /**
     * insert a new node into the tree
     * returns a reference to the leaf node that can later be used for removal
     * @param aabb aabb of data
     * @param data data to insert
     */
    insert(aabb, data) {
        // create the leaf node that will be inserted
        const newLeaf = {
            type: NodeType.Leaf,
            aabb: aabb.clone(),
            parent: null,
            data
        };
        // no root, create a leaf
        if (!this.root) {
            this.root = newLeaf;
            return newLeaf;
        }
        // otherwise, choose a leaf to become the sibling of the new leaf
        const sibling = this.chooseSiblingLeaf(this.root, aabb);
        // create a new parent node
        const newParent = {
            type: NodeType.Internal,
            parent: sibling.parent,
            aabb: aabb.union(sibling.aabb),
            children: [newLeaf, sibling]
        };
        sibling.parent = newParent;
        newLeaf.parent = newParent;
        // replace link in old parent with newly created parent
        // or if there was no parent, leaf was root, make new parent the new root
        let parent = newParent.parent;
        if (parent) {
            const idx = parent.children.indexOf(sibling);
            if (idx === -1) {
                throw new Error("Could not find link to chosen sibling");
            }
            parent.children[idx] = newParent;
        }
        else {
            this.root = newParent;
        }
        this.updateAABBs(parent);
        return newLeaf;
    }
    /**
     * removes specified leaf node and its data from the tree
     * @param leaf leaf
     */
    delete(leaf) {
        // special case - leaf is root
        if (this.root === leaf) {
            this.root = null;
            return;
        }
        const parent = leaf.parent;
        if (!parent) {
            throw new Error("Invalid tree, non-root leaf has no parent");
        }
        // otherwise,
        // replace leaf.parent with leaf's sibling
        // recalculate aabbs
        const sibling = parent.children.find(n => n !== leaf);
        if (!sibling) {
            throw new Error("Invalid tree, leaf node has no sibling");
        }
        const grandParent = parent.parent;
        // no grandparent - parent was root - make sibling the new root
        if (!grandParent) {
            this.root = sibling;
            sibling.parent = null;
            return;
        }
        const parentIdx = grandParent.children.indexOf(parent);
        if (parentIdx === -1) {
            throw new Error("Invalid tree, grandparent does not have link to parent");
        }
        grandParent.children[parentIdx] = sibling;
        sibling.parent = grandParent;
        this.updateAABBs(grandParent);
    }
    /**
     * Iterates over all data that overlaps the AABB
     * @param aabb aabb
     */
    *query(aabb) {
        const stack = [];
        if (this.root && this.root.aabb.overlaps(aabb)) {
            stack.push(this.root);
        }
        while (stack.length > 0) {
            const node = array.pop(stack);
            switch (node.type) {
                case NodeType.Internal:
                    for (const child of node.children) {
                        if (child.aabb.overlaps(aabb)) {
                            stack.push(child);
                        }
                    }
                    break;
                case NodeType.Leaf:
                    yield node.data;
                    break;
            }
        }
    }
    chooseSiblingLeaf(node, aabb) {
        // choose the leaf that would increase least in area by including this node
        switch (node.type) {
            case NodeType.Internal:
                const n = node.children.reduce((a, b) => {
                    // calculate surface area increase for node a
                    const da = a.aabb.area - a.aabb.union(aabb).area;
                    const db = b.aabb.area - b.aabb.union(aabb).area;
                    return da < db ? a : b;
                });
                return this.chooseSiblingLeaf(n, aabb);
                break;
            case NodeType.Leaf:
                // we've reached a leaf - return it
                return node;
        }
    }
    updateAABBs(node) {
        while (node != null) {
            node.aabb = node.children[0].aabb.union(node.children[1].aabb);
            node = node.parent;
        }
    }
}
/**
 * calculate manhatten distance between coordinates
 * @param a first point
 * @param b second point
 */
export function calcManhattenDist(a, b) {
    return Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VvMmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZW8yZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUNILE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFPM0MsTUFBTSxPQUFPLEtBQUs7SUFDZCxZQUFtQixDQUFTLEVBQVMsQ0FBUztRQUEzQixNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQVMsTUFBQyxHQUFELENBQUMsQ0FBUTtJQUFJLENBQUM7SUFFbkQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFxQjtRQUNqQyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxLQUFLLENBQUMsRUFBUztRQUNYLE9BQU8sSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsU0FBUyxDQUFDLENBQVM7UUFDZixPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVELFNBQVMsQ0FBQyxDQUFTO1FBQ2YsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFRCxTQUFTLENBQUMsQ0FBUztRQUNmLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsU0FBUyxDQUFDLENBQVM7UUFDZixPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVELFFBQVEsQ0FBQyxFQUFTO1FBQ2QsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVELFFBQVEsQ0FBQyxFQUFTO1FBQ2QsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVELFFBQVEsQ0FBQyxFQUFTO1FBQ2QsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVELFFBQVEsQ0FBQyxFQUFTO1FBQ2QsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVELElBQUk7UUFDQSxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVELElBQUk7UUFDQSxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVELEdBQUc7UUFDQyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDeEQsQ0FBQztJQUVELEdBQUc7UUFDQyxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsR0FBRztRQUNDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsR0FBRztRQUNDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELE1BQU07UUFDRixPQUFPO1lBQ0gsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ1QsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ1osQ0FBQTtJQUNMLENBQUM7SUFFRCxNQUFNLENBQUMsR0FBRztRQUNOLE9BQU8sSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBTTtRQUNULE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sSUFBSTtJQUNiLFlBQXFCLEdBQVUsRUFBVyxHQUFVO1FBQS9CLFFBQUcsR0FBSCxHQUFHLENBQU87UUFBVyxRQUFHLEdBQUgsR0FBRyxDQUFPO0lBQUksQ0FBQztJQUV6RCxJQUFJLEtBQUs7UUFDTCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxJQUFJLE1BQU07UUFDTixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDSixPQUFPLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ04sT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBVTtRQUNaLE1BQU0sR0FBRyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RixNQUFNLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekYsTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVCLE9BQU8sQ0FBQyxDQUFBO0lBQ1osQ0FBQztJQUVELFlBQVksQ0FBQyxJQUFVO1FBQ25CLE1BQU0sR0FBRyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RixNQUFNLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekYsTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVCLE9BQU8sQ0FB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QUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ3BELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogMXN0IGF0dGVtcHQgYXQgYSBzaW1wbGUgMmQgZ2VvbWV0cnkgbGlicmFyeVxyXG4gKi9cclxuaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBvaW50T3B0aW9ucyB7XHJcbiAgICB4OiBudW1iZXIsXHJcbiAgICB5OiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFBvaW50IHtcclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyB4OiBudW1iZXIsIHB1YmxpYyB5OiBudW1iZXIpIHsgfVxyXG5cclxuICAgIHN0YXRpYyBmcm9tSlNPTihvcHRpb25zOiBQb2ludE9wdGlvbnMpOiBQb2ludCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb2ludChvcHRpb25zLngsIG9wdGlvbnMueSlcclxuICAgIH1cclxuXHJcbiAgICBlcXVhbChwdDogUG9pbnQpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy54ID09PSBwdC54ICYmIHRoaXMueSA9PT0gcHQueVxyXG4gICAgfVxyXG5cclxuICAgIGFkZFNjYWxhcih4OiBudW1iZXIpOiBQb2ludCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLnggKyB4LCB0aGlzLnkgKyB4KVxyXG4gICAgfVxyXG5cclxuICAgIHN1YlNjYWxhcih4OiBudW1iZXIpOiBQb2ludCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLnggLSB4LCB0aGlzLnkgLSB4KVxyXG4gICAgfVxyXG5cclxuICAgIG11bFNjYWxhcih4OiBudW1iZXIpOiBQb2ludCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLnggKiB4LCB0aGlzLnkgKiB4KVxyXG4gICAgfVxyXG5cclxuICAgIGRpdlNjYWxhcih4OiBudW1iZXIpOiBQb2ludCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLnggLyB4LCB0aGlzLnkgLyB4KVxyXG4gICAgfVxyXG5cclxuICAgIGFkZFBvaW50KHB0OiBQb2ludCk6IFBvaW50IHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvaW50KHRoaXMueCArIHB0LngsIHRoaXMueSArIHB0LnkpXHJcbiAgICB9XHJcblxyXG4gICAgc3ViUG9pbnQocHQ6IFBvaW50KTogUG9pbnQge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9pbnQodGhpcy54IC0gcHQueCwgdGhpcy55IC0gcHQueSlcclxuICAgIH1cclxuXHJcbiAgICBtdWxQb2ludChwdDogUG9pbnQpOiBQb2ludCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLnggKiBwdC54LCB0aGlzLnkgKiBwdC55KVxyXG4gICAgfVxyXG5cclxuICAgIGRpdlBvaW50KHB0OiBQb2ludCk6IFBvaW50IHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvaW50KHRoaXMueCAvIHB0LngsIHRoaXMueSAvIHB0LnkpXHJcbiAgICB9XHJcblxyXG4gICAgZmxvb3IoKTogUG9pbnQge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9pbnQoTWF0aC5mbG9vcih0aGlzLngpLCBNYXRoLmZsb29yKHRoaXMueSkpXHJcbiAgICB9XHJcblxyXG4gICAgY2llbCgpOiBQb2ludCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb2ludChNYXRoLmNlaWwodGhpcy54KSwgTWF0aC5jZWlsKHRoaXMueSkpXHJcbiAgICB9XHJcblxyXG4gICAgcm91bmQoKTogUG9pbnQge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9pbnQoTWF0aC5yb3VuZCh0aGlzLngpLCBNYXRoLnJvdW5kKHRoaXMueSkpXHJcbiAgICB9XHJcblxyXG4gICAgc2lnbigpOiBQb2ludCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb2ludChNYXRoLnNpZ24odGhpcy54KSwgTWF0aC5zaWduKHRoaXMueSkpXHJcbiAgICB9XHJcblxyXG4gICAgYWJzKCk6IFBvaW50IHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvaW50KE1hdGguYWJzKHRoaXMueCksIE1hdGguYWJzKHRoaXMueSkpXHJcbiAgICB9XHJcblxyXG4gICAgbmVnKCk6IFBvaW50IHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvaW50KC10aGlzLngsIC10aGlzLnkpXHJcbiAgICB9XHJcblxyXG4gICAgbWF4KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMueCwgdGhpcy55KVxyXG4gICAgfVxyXG5cclxuICAgIG1pbigpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBNYXRoLm1pbih0aGlzLngsIHRoaXMueSlcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBQb2ludCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLngsIHRoaXMueSlcclxuICAgIH1cclxuXHJcbiAgICB0b0pTT04oKTogUG9pbnRPcHRpb25zIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB4OiB0aGlzLngsXHJcbiAgICAgICAgICAgIHk6IHRoaXMueSxcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGluZigpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvaW50KEluZmluaXR5LCBJbmZpbml0eSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgbmVnSW5mKCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9pbnQoLUluZmluaXR5LCAtSW5maW5pdHkpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBBQUJCIHtcclxuICAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IG1pbjogUG9pbnQsIHJlYWRvbmx5IG1heDogUG9pbnQpIHsgfVxyXG5cclxuICAgIGdldCB3aWR0aCgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXgueCAtIHRoaXMubWluLnhcclxuICAgIH1cclxuXHJcbiAgICBnZXQgaGVpZ2h0KCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1heC55IC0gdGhpcy5taW4ueVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBhcmVhKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLndpZHRoICogdGhpcy5oZWlnaHRcclxuICAgIH1cclxuXHJcbiAgICBnZXQgY2VudGVyKCk6IFBvaW50IHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvaW50KHRoaXMubWluLnggKyB0aGlzLndpZHRoIC8gMiwgdGhpcy5taW4ueSArIHRoaXMuaGVpZ2h0IC8gMilcclxuICAgIH1cclxuXHJcbiAgICB1bmlvbihhYWJiOiBBQUJCKTogQUFCQiB7XHJcbiAgICAgICAgY29uc3QgbWluID0gbmV3IFBvaW50KE1hdGgubWluKHRoaXMubWluLngsIGFhYmIubWluLngpLCBNYXRoLm1pbih0aGlzLm1pbi55LCBhYWJiLm1pbi55KSlcclxuICAgICAgICBjb25zdCBtYXggPSBuZXcgUG9pbnQoTWF0aC5tYXgodGhpcy5tYXgueCwgYWFiYi5tYXgueCksIE1hdGgubWF4KHRoaXMubWF4LnksIGFhYmIubWF4LnkpKVxyXG4gICAgICAgIGNvbnN0IHIgPSBuZXcgQUFCQihtaW4sIG1heClcclxuICAgICAgICByZXR1cm4gclxyXG4gICAgfVxyXG5cclxuICAgIGludGVyc2VjdGlvbihhYWJiOiBBQUJCKTogQUFCQiB7XHJcbiAgICAgICAgY29uc3QgbWluID0gbmV3IFBvaW50KE1hdGgubWF4KHRoaXMubWluLngsIGFhYmIubWluLngpLCBNYXRoLm1heCh0aGlzLm1pbi55LCBhYWJiLm1pbi55KSlcclxuICAgICAgICBjb25zdCBtYXggPSBuZXcgUG9pbnQoTWF0aC5taW4odGhpcy5tYXgueCwgYWFiYi5tYXgueCksIE1hdGgubWluKHRoaXMubWF4LnksIGFhYmIubWF4LnkpKVxyXG4gICAgICAgIGNvbnN0IHIgPSBuZXcgQUFCQihtaW4sIG1heClcclxuICAgICAgICByZXR1cm4gclxyXG4gICAgfVxyXG5cclxuICAgIG92ZXJsYXBzKGFhYmI6IEFBQkIpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICB0aGlzLm1heC54ID49IGFhYmIubWluLnggJiZcclxuICAgICAgICAgICAgdGhpcy5tYXgueSA+PSBhYWJiLm1pbi55ICYmXHJcbiAgICAgICAgICAgIHRoaXMubWluLnggPD0gYWFiYi5tYXgueCAmJlxyXG4gICAgICAgICAgICB0aGlzLm1pbi55IDw9IGFhYmIubWF4LnlcclxuICAgICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgY29udGFpbnMocHQ6IFBvaW50KTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgcHQueCA+PSB0aGlzLm1pbi54ICYmXHJcbiAgICAgICAgICAgIHB0LnkgPj0gdGhpcy5taW4ueSAmJlxyXG4gICAgICAgICAgICBwdC54IDwgdGhpcy5tYXgueCAmJlxyXG4gICAgICAgICAgICBwdC55IDwgdGhpcy5tYXgueVxyXG4gICAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICB0cmFuc2xhdGUob2Zmc2V0OiBQb2ludCk6IEFBQkIge1xyXG4gICAgICAgIHJldHVybiBuZXcgQUFCQih0aGlzLm1pbi5hZGRQb2ludChvZmZzZXQpLCB0aGlzLm1heC5hZGRQb2ludChvZmZzZXQpKVxyXG4gICAgfVxyXG5cclxuICAgIHNjYWxlKHM6IG51bWJlcik6IEFBQkIge1xyXG4gICAgICAgIHJldHVybiBuZXcgQUFCQih0aGlzLm1pbi5tdWxTY2FsYXIocyksIHRoaXMubWF4Lm11bFNjYWxhcihzKSlcclxuICAgIH1cclxuXHJcbiAgICBidWZmZXIocGFkZGluZzogbnVtYmVyKTogQUFCQiB7XHJcbiAgICAgICAgY29uc3QgbWluID0gbmV3IFBvaW50KHRoaXMubWluLnggLSBwYWRkaW5nLCB0aGlzLm1pbi55IC0gcGFkZGluZylcclxuICAgICAgICBjb25zdCBtYXggPSBuZXcgUG9pbnQodGhpcy5tYXgueCArIHBhZGRpbmcsIHRoaXMubWF4LnkgKyBwYWRkaW5nKVxyXG4gICAgICAgIHJldHVybiBuZXcgQUFCQihtaW4sIG1heClcclxuICAgIH1cclxuXHJcbiAgICBzaHJpbmsoYW1vdW50OiBudW1iZXIpOiBBQUJCIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5idWZmZXIoLWFtb3VudClcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBBQUJCIHtcclxuICAgICAgICByZXR1cm4gbmV3IEFBQkIodGhpcy5taW4uY2xvbmUoKSwgdGhpcy5tYXguY2xvbmUoKSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZW1wdHkoKTogQUFCQiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBQUJCKFBvaW50LmluZigpLCBQb2ludC5uZWdJbmYoKSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgaW5mKCk6IEFBQkIge1xyXG4gICAgICAgIHJldHVybiBuZXcgQUFCQihQb2ludC5uZWdJbmYoKSwgUG9pbnQuaW5mKCkpXHJcbiAgICB9XHJcbn1cclxuXHJcbmVudW0gTm9kZVR5cGUge1xyXG4gICAgSW50ZXJuYWwsXHJcbiAgICBMZWFmXHJcbn1cclxuXHJcbmludGVyZmFjZSBJbnRlcm5hbE5vZGU8VD4ge1xyXG4gICAgdHlwZTogTm9kZVR5cGUuSW50ZXJuYWxcclxuICAgIGFhYmI6IEFBQkJcclxuICAgIHBhcmVudDogSW50ZXJuYWxOb2RlPFQ+IHwgbnVsbFxyXG4gICAgY2hpbGRyZW46IE5vZGU8VD5bXVxyXG59XHJcblxyXG5pbnRlcmZhY2UgTGVhZk5vZGU8VD4ge1xyXG4gICAgdHlwZTogTm9kZVR5cGUuTGVhZlxyXG4gICAgYWFiYjogQUFCQlxyXG4gICAgcGFyZW50OiBJbnRlcm5hbE5vZGU8VD4gfCBudWxsXHJcbiAgICBkYXRhOiBUXHJcbn1cclxuXHJcbnR5cGUgTm9kZTxUPiA9IEludGVybmFsTm9kZTxUPiB8IExlYWZOb2RlPFQ+XHJcblxyXG5leHBvcnQgY2xhc3MgQUFCQlRyZWU8VD4ge1xyXG4gICAgcm9vdDogTm9kZTxUPiB8IG51bGwgPSBudWxsXHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7IH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGluc2VydCBhIG5ldyBub2RlIGludG8gdGhlIHRyZWVcclxuICAgICAqIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGxlYWYgbm9kZSB0aGF0IGNhbiBsYXRlciBiZSB1c2VkIGZvciByZW1vdmFsXHJcbiAgICAgKiBAcGFyYW0gYWFiYiBhYWJiIG9mIGRhdGFcclxuICAgICAqIEBwYXJhbSBkYXRhIGRhdGEgdG8gaW5zZXJ0XHJcbiAgICAgKi9cclxuICAgIGluc2VydChhYWJiOiBBQUJCLCBkYXRhOiBUKTogTGVhZk5vZGU8VD4ge1xyXG4gICAgICAgIC8vIGNyZWF0ZSB0aGUgbGVhZiBub2RlIHRoYXQgd2lsbCBiZSBpbnNlcnRlZFxyXG4gICAgICAgIGNvbnN0IG5ld0xlYWY6IExlYWZOb2RlPFQ+ID0ge1xyXG4gICAgICAgICAgICB0eXBlOiBOb2RlVHlwZS5MZWFmLFxyXG4gICAgICAgICAgICBhYWJiOiBhYWJiLmNsb25lKCksXHJcbiAgICAgICAgICAgIHBhcmVudDogbnVsbCxcclxuICAgICAgICAgICAgZGF0YVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbm8gcm9vdCwgY3JlYXRlIGEgbGVhZlxyXG4gICAgICAgIGlmICghdGhpcy5yb290KSB7XHJcbiAgICAgICAgICAgIHRoaXMucm9vdCA9IG5ld0xlYWZcclxuICAgICAgICAgICAgcmV0dXJuIG5ld0xlYWZcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIG90aGVyd2lzZSwgY2hvb3NlIGEgbGVhZiB0byBiZWNvbWUgdGhlIHNpYmxpbmcgb2YgdGhlIG5ldyBsZWFmXHJcbiAgICAgICAgY29uc3Qgc2libGluZyA9IHRoaXMuY2hvb3NlU2libGluZ0xlYWYodGhpcy5yb290LCBhYWJiKVxyXG5cclxuICAgICAgICAvLyBjcmVhdGUgYSBuZXcgcGFyZW50IG5vZGVcclxuICAgICAgICBjb25zdCBuZXdQYXJlbnQ6IEludGVybmFsTm9kZTxUPiA9IHtcclxuICAgICAgICAgICAgdHlwZTogTm9kZVR5cGUuSW50ZXJuYWwsXHJcbiAgICAgICAgICAgIHBhcmVudDogc2libGluZy5wYXJlbnQsXHJcbiAgICAgICAgICAgIGFhYmI6IGFhYmIudW5pb24oc2libGluZy5hYWJiKSxcclxuICAgICAgICAgICAgY2hpbGRyZW46IFtuZXdMZWFmLCBzaWJsaW5nXVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2libGluZy5wYXJlbnQgPSBuZXdQYXJlbnRcclxuICAgICAgICBuZXdMZWFmLnBhcmVudCA9IG5ld1BhcmVudFxyXG5cclxuICAgICAgICAvLyByZXBsYWNlIGxpbmsgaW4gb2xkIHBhcmVudCB3aXRoIG5ld2x5IGNyZWF0ZWQgcGFyZW50XHJcbiAgICAgICAgLy8gb3IgaWYgdGhlcmUgd2FzIG5vIHBhcmVudCwgbGVhZiB3YXMgcm9vdCwgbWFrZSBuZXcgcGFyZW50IHRoZSBuZXcgcm9vdFxyXG4gICAgICAgIGxldCBwYXJlbnQgPSBuZXdQYXJlbnQucGFyZW50XHJcbiAgICAgICAgaWYgKHBhcmVudCkge1xyXG4gICAgICAgICAgICBjb25zdCBpZHggPSBwYXJlbnQuY2hpbGRyZW4uaW5kZXhPZihzaWJsaW5nKVxyXG4gICAgICAgICAgICBpZiAoaWR4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IGZpbmQgbGluayB0byBjaG9zZW4gc2libGluZ1wiKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBwYXJlbnQuY2hpbGRyZW5baWR4XSA9IG5ld1BhcmVudFxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMucm9vdCA9IG5ld1BhcmVudFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGVBQUJCcyhwYXJlbnQpXHJcbiAgICAgICAgcmV0dXJuIG5ld0xlYWZcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJlbW92ZXMgc3BlY2lmaWVkIGxlYWYgbm9kZSBhbmQgaXRzIGRhdGEgZnJvbSB0aGUgdHJlZVxyXG4gICAgICogQHBhcmFtIGxlYWYgbGVhZiBcclxuICAgICAqL1xyXG4gICAgZGVsZXRlKGxlYWY6IExlYWZOb2RlPFQ+KSB7XHJcbiAgICAgICAgLy8gc3BlY2lhbCBjYXNlIC0gbGVhZiBpcyByb290XHJcbiAgICAgICAgaWYgKHRoaXMucm9vdCA9PT0gbGVhZikge1xyXG4gICAgICAgICAgICB0aGlzLnJvb3QgPSBudWxsXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcGFyZW50ID0gbGVhZi5wYXJlbnRcclxuICAgICAgICBpZiAoIXBhcmVudCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHRyZWUsIG5vbi1yb290IGxlYWYgaGFzIG5vIHBhcmVudFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gb3RoZXJ3aXNlLFxyXG4gICAgICAgIC8vIHJlcGxhY2UgbGVhZi5wYXJlbnQgd2l0aCBsZWFmJ3Mgc2libGluZ1xyXG4gICAgICAgIC8vIHJlY2FsY3VsYXRlIGFhYmJzXHJcbiAgICAgICAgY29uc3Qgc2libGluZyA9IHBhcmVudC5jaGlsZHJlbi5maW5kKG4gPT4gbiAhPT0gbGVhZilcclxuICAgICAgICBpZiAoIXNpYmxpbmcpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB0cmVlLCBsZWFmIG5vZGUgaGFzIG5vIHNpYmxpbmdcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGdyYW5kUGFyZW50ID0gcGFyZW50LnBhcmVudFxyXG5cclxuICAgICAgICAvLyBubyBncmFuZHBhcmVudCAtIHBhcmVudCB3YXMgcm9vdCAtIG1ha2Ugc2libGluZyB0aGUgbmV3IHJvb3RcclxuICAgICAgICBpZiAoIWdyYW5kUGFyZW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMucm9vdCA9IHNpYmxpbmdcclxuICAgICAgICAgICAgc2libGluZy5wYXJlbnQgPSBudWxsXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcGFyZW50SWR4ID0gZ3JhbmRQYXJlbnQuY2hpbGRyZW4uaW5kZXhPZihwYXJlbnQpXHJcbiAgICAgICAgaWYgKHBhcmVudElkeCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB0cmVlLCBncmFuZHBhcmVudCBkb2VzIG5vdCBoYXZlIGxpbmsgdG8gcGFyZW50XCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBncmFuZFBhcmVudC5jaGlsZHJlbltwYXJlbnRJZHhdID0gc2libGluZ1xyXG4gICAgICAgIHNpYmxpbmcucGFyZW50ID0gZ3JhbmRQYXJlbnRcclxuICAgICAgICB0aGlzLnVwZGF0ZUFBQkJzKGdyYW5kUGFyZW50KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSXRlcmF0ZXMgb3ZlciBhbGwgZGF0YSB0aGF0IG92ZXJsYXBzIHRoZSBBQUJCXHJcbiAgICAgKiBAcGFyYW0gYWFiYiBhYWJiXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyAqcXVlcnkoYWFiYjogQUFCQik6IEl0ZXJhYmxlPFQ+IHtcclxuICAgICAgICBjb25zdCBzdGFjazogTm9kZTxUPltdID0gW11cclxuICAgICAgICBpZiAodGhpcy5yb290ICYmIHRoaXMucm9vdC5hYWJiLm92ZXJsYXBzKGFhYmIpKSB7XHJcbiAgICAgICAgICAgIHN0YWNrLnB1c2godGhpcy5yb290KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGFycmF5LnBvcChzdGFjaylcclxuICAgICAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgTm9kZVR5cGUuSW50ZXJuYWw6XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZC5hYWJiLm92ZXJsYXBzKGFhYmIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKGNoaWxkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgTm9kZVR5cGUuTGVhZjpcclxuICAgICAgICAgICAgICAgICAgICB5aWVsZCBub2RlLmRhdGFcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNob29zZVNpYmxpbmdMZWFmKG5vZGU6IE5vZGU8VD4sIGFhYmI6IEFBQkIpOiBOb2RlPFQ+IHtcclxuICAgICAgICAvLyBjaG9vc2UgdGhlIGxlYWYgdGhhdCB3b3VsZCBpbmNyZWFzZSBsZWFzdCBpbiBhcmVhIGJ5IGluY2x1ZGluZyB0aGlzIG5vZGVcclxuICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIE5vZGVUeXBlLkludGVybmFsOlxyXG4gICAgICAgICAgICAgICAgY29uc3QgbiA9IG5vZGUuY2hpbGRyZW4ucmVkdWNlKChhLCBiKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHN1cmZhY2UgYXJlYSBpbmNyZWFzZSBmb3Igbm9kZSBhXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGEgPSBhLmFhYmIuYXJlYSAtIGEuYWFiYi51bmlvbihhYWJiKS5hcmVhXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGIgPSBiLmFhYmIuYXJlYSAtIGIuYWFiYi51bmlvbihhYWJiKS5hcmVhXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhIDwgZGIgPyBhIDogYlxyXG4gICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jaG9vc2VTaWJsaW5nTGVhZihuLCBhYWJiKVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIE5vZGVUeXBlLkxlYWY6XHJcbiAgICAgICAgICAgICAgICAvLyB3ZSd2ZSByZWFjaGVkIGEgbGVhZiAtIHJldHVybiBpdFxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVBQUJCcyhub2RlOiBJbnRlcm5hbE5vZGU8VD4gfCBudWxsKSB7XHJcbiAgICAgICAgd2hpbGUgKG5vZGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBub2RlLmFhYmIgPSBub2RlLmNoaWxkcmVuWzBdLmFhYmIudW5pb24obm9kZS5jaGlsZHJlblsxXS5hYWJiKVxyXG4gICAgICAgICAgICBub2RlID0gbm9kZS5wYXJlbnRcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjYWxjdWxhdGUgbWFuaGF0dGVuIGRpc3RhbmNlIGJldHdlZW4gY29vcmRpbmF0ZXNcclxuICogQHBhcmFtIGEgZmlyc3QgcG9pbnRcclxuICogQHBhcmFtIGIgc2Vjb25kIHBvaW50XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY2FsY01hbmhhdHRlbkRpc3QoYTogUG9pbnQsIGI6IFBvaW50KTogbnVtYmVyIHtcclxuICAgIHJldHVybiBNYXRoLmFicyhiLnggLSBhLngpICsgTWF0aC5hYnMoYi55IC0gYS55KVxyXG59Il19