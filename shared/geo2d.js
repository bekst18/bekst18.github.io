/**
 * 1st attempt at a simple 2d geometry library
 */
import * as array from "../shared/array.js";
export class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
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
    clone() {
        return new Point(this.x, this.y);
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
    combine(aabb) {
        const min = new Point(Math.min(this.min.x, aabb.min.x), Math.min(this.min.y, aabb.min.y));
        const max = new Point(Math.max(this.max.x, aabb.max.x), Math.max(this.max.y, aabb.max.y));
        const r = new AABB(min, max);
        return r;
    }
    overlaps(aabb) {
        return (this.max.x >= aabb.min.x &&
            this.max.y >= aabb.min.y &&
            this.min.x <= aabb.max.x &&
            this.min.y <= aabb.max.y);
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
        return new AABB(this.min, this.max);
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
            aabb: aabb.combine(sibling.aabb),
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
                    const da = a.aabb.area - a.aabb.combine(aabb).area;
                    const db = b.aabb.area - b.aabb.combine(aabb).area;
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
            node.aabb = node.children[0].aabb.combine(node.children[1].aabb);
            node = node.parent;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VvMmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZW8yZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUNILE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUE7QUFFM0MsTUFBTSxPQUFPLEtBQUs7SUFDZCxZQUFtQixDQUFTLEVBQVMsQ0FBUztRQUEzQixNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQVMsTUFBQyxHQUFELENBQUMsQ0FBUTtJQUFJLENBQUM7SUFFbkQsS0FBSyxDQUFDLEVBQVM7UUFDWCxPQUFPLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVELFNBQVMsQ0FBQyxDQUFTO1FBQ2YsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFRCxTQUFTLENBQUMsQ0FBUztRQUNmLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsU0FBUyxDQUFDLENBQVM7UUFDZixPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVELFNBQVMsQ0FBQyxDQUFTO1FBQ2YsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFRCxRQUFRLENBQUMsRUFBUztRQUNkLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFRCxRQUFRLENBQUMsRUFBUztRQUNkLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFRCxRQUFRLENBQUMsRUFBUztRQUNkLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFRCxRQUFRLENBQUMsRUFBUztRQUNkLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzVELENBQUM7SUFFRCxJQUFJO1FBQ0EsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFD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QUFDLENBQUE7WUFDaEUsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7U0FDckI7SUFDTCxDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogMXN0IGF0dGVtcHQgYXQgYSBzaW1wbGUgMmQgZ2VvbWV0cnkgbGlicmFyeVxyXG4gKi9cclxuaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiXHJcblxyXG5leHBvcnQgY2xhc3MgUG9pbnQge1xyXG4gICAgY29uc3RydWN0b3IocHVibGljIHg6IG51bWJlciwgcHVibGljIHk6IG51bWJlcikgeyB9XHJcblxyXG4gICAgZXF1YWwocHQ6IFBvaW50KTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCA9PT0gcHQueCAmJiB0aGlzLnkgPT09IHB0LnlcclxuICAgIH1cclxuXHJcbiAgICBhZGRTY2FsYXIoeDogbnVtYmVyKTogUG9pbnQge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9pbnQodGhpcy54ICsgeCwgdGhpcy55ICsgeClcclxuICAgIH1cclxuXHJcbiAgICBzdWJTY2FsYXIoeDogbnVtYmVyKTogUG9pbnQge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9pbnQodGhpcy54IC0geCwgdGhpcy55IC0geClcclxuICAgIH1cclxuXHJcbiAgICBtdWxTY2FsYXIoeDogbnVtYmVyKTogUG9pbnQge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9pbnQodGhpcy54ICogeCwgdGhpcy55ICogeClcclxuICAgIH1cclxuXHJcbiAgICBkaXZTY2FsYXIoeDogbnVtYmVyKTogUG9pbnQge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9pbnQodGhpcy54IC8geCwgdGhpcy55IC8geClcclxuICAgIH1cclxuXHJcbiAgICBhZGRQb2ludChwdDogUG9pbnQpOiBQb2ludCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLnggKyBwdC54LCB0aGlzLnkgKyBwdC55KVxyXG4gICAgfVxyXG5cclxuICAgIHN1YlBvaW50KHB0OiBQb2ludCk6IFBvaW50IHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvaW50KHRoaXMueCAtIHB0LngsIHRoaXMueSAtIHB0LnkpXHJcbiAgICB9XHJcblxyXG4gICAgbXVsUG9pbnQocHQ6IFBvaW50KTogUG9pbnQge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9pbnQodGhpcy54ICogcHQueCwgdGhpcy55ICogcHQueSlcclxuICAgIH1cclxuXHJcbiAgICBkaXZQb2ludChwdDogUG9pbnQpOiBQb2ludCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLnggLyBwdC54LCB0aGlzLnkgLyBwdC55KVxyXG4gICAgfVxyXG5cclxuICAgIGZsb29yKCk6IFBvaW50IHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvaW50KE1hdGguZmxvb3IodGhpcy54KSwgTWF0aC5mbG9vcih0aGlzLnkpKVxyXG4gICAgfVxyXG5cclxuICAgIGNpZWwoKTogUG9pbnQge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9pbnQoTWF0aC5jZWlsKHRoaXMueCksIE1hdGguY2VpbCh0aGlzLnkpKVxyXG4gICAgfVxyXG5cclxuICAgIHJvdW5kKCk6IFBvaW50IHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvaW50KE1hdGgucm91bmQodGhpcy54KSwgTWF0aC5yb3VuZCh0aGlzLnkpKVxyXG4gICAgfVxyXG5cclxuICAgIHNpZ24oKTogUG9pbnQge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9pbnQoTWF0aC5zaWduKHRoaXMueCksIE1hdGguc2lnbih0aGlzLnkpKVxyXG4gICAgfVxyXG5cclxuICAgIGFicygpOiBQb2ludCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb2ludChNYXRoLmFicyh0aGlzLngpLCBNYXRoLmFicyh0aGlzLnkpKVxyXG4gICAgfVxyXG5cclxuICAgIG5lZygpOiBQb2ludCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb2ludCgtdGhpcy54LCAtdGhpcy55KVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFBvaW50IHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvaW50KHRoaXMueCwgdGhpcy55KVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQUFCQiB7XHJcbiAgICBjb25zdHJ1Y3RvcihyZWFkb25seSBtaW46IFBvaW50LCByZWFkb25seSBtYXg6IFBvaW50KSB7IH1cclxuXHJcbiAgICBnZXQgd2lkdGgoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWF4LnggLSB0aGlzLm1pbi54XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGhlaWdodCgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXgueSAtIHRoaXMubWluLnlcclxuICAgIH1cclxuXHJcbiAgICBnZXQgYXJlYSgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy53aWR0aCAqIHRoaXMuaGVpZ2h0XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGNlbnRlcigpOiBQb2ludCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLm1pbi54ICsgdGhpcy53aWR0aCAvIDIsIHRoaXMubWluLnkgKyB0aGlzLmhlaWdodCAvIDIpXHJcbiAgICB9XHJcblxyXG4gICAgY29tYmluZShhYWJiOiBBQUJCKTogQUFCQiB7XHJcbiAgICAgICAgY29uc3QgbWluID0gbmV3IFBvaW50KE1hdGgubWluKHRoaXMubWluLngsIGFhYmIubWluLngpLCBNYXRoLm1pbih0aGlzLm1pbi55LCBhYWJiLm1pbi55KSlcclxuICAgICAgICBjb25zdCBtYXggPSBuZXcgUG9pbnQoTWF0aC5tYXgodGhpcy5tYXgueCwgYWFiYi5tYXgueCksIE1hdGgubWF4KHRoaXMubWF4LnksIGFhYmIubWF4LnkpKVxyXG4gICAgICAgIGNvbnN0IHIgPSBuZXcgQUFCQihtaW4sIG1heClcclxuICAgICAgICByZXR1cm4gclxyXG4gICAgfVxyXG5cclxuICAgIG92ZXJsYXBzKGFhYmI6IEFBQkIpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICB0aGlzLm1heC54ID49IGFhYmIubWluLnggJiZcclxuICAgICAgICAgICAgdGhpcy5tYXgueSA+PSBhYWJiLm1pbi55ICYmXHJcbiAgICAgICAgICAgIHRoaXMubWluLnggPD0gYWFiYi5tYXgueCAmJlxyXG4gICAgICAgICAgICB0aGlzLm1pbi55IDw9IGFhYmIubWF4LnlcclxuICAgICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgdHJhbnNsYXRlKG9mZnNldDogUG9pbnQpOiBBQUJCIHtcclxuICAgICAgICByZXR1cm4gbmV3IEFBQkIodGhpcy5taW4uYWRkUG9pbnQob2Zmc2V0KSwgdGhpcy5tYXguYWRkUG9pbnQob2Zmc2V0KSlcclxuICAgIH1cclxuXHJcbiAgICBzY2FsZShzOiBudW1iZXIpOiBBQUJCIHtcclxuICAgICAgICByZXR1cm4gbmV3IEFBQkIodGhpcy5taW4ubXVsU2NhbGFyKHMpLCB0aGlzLm1heC5tdWxTY2FsYXIocykpXHJcbiAgICB9XHJcblxyXG4gICAgYnVmZmVyKHBhZGRpbmc6IG51bWJlcik6IEFBQkIge1xyXG4gICAgICAgIGNvbnN0IG1pbiA9IG5ldyBQb2ludCh0aGlzLm1pbi54IC0gcGFkZGluZywgdGhpcy5taW4ueSAtIHBhZGRpbmcpXHJcbiAgICAgICAgY29uc3QgbWF4ID0gbmV3IFBvaW50KHRoaXMubWF4LnggKyBwYWRkaW5nLCB0aGlzLm1heC55ICsgcGFkZGluZylcclxuICAgICAgICByZXR1cm4gbmV3IEFBQkIobWluLCBtYXgpXHJcbiAgICB9XHJcblxyXG4gICAgc2hyaW5rKGFtb3VudDogbnVtYmVyKTogQUFCQiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYnVmZmVyKC1hbW91bnQpXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogQUFCQiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBQUJCKHRoaXMubWluLCB0aGlzLm1heClcclxuICAgIH1cclxufVxyXG5cclxuZW51bSBOb2RlVHlwZSB7XHJcbiAgICBJbnRlcm5hbCxcclxuICAgIExlYWZcclxufVxyXG5cclxuaW50ZXJmYWNlIEludGVybmFsTm9kZTxUPiB7XHJcbiAgICB0eXBlOiBOb2RlVHlwZS5JbnRlcm5hbFxyXG4gICAgYWFiYjogQUFCQlxyXG4gICAgcGFyZW50OiBJbnRlcm5hbE5vZGU8VD4gfCBudWxsXHJcbiAgICBjaGlsZHJlbjogTm9kZTxUPltdXHJcbn1cclxuXHJcbmludGVyZmFjZSBMZWFmTm9kZTxUPiB7XHJcbiAgICB0eXBlOiBOb2RlVHlwZS5MZWFmXHJcbiAgICBhYWJiOiBBQUJCXHJcbiAgICBwYXJlbnQ6IEludGVybmFsTm9kZTxUPiB8IG51bGxcclxuICAgIGRhdGE6IFRcclxufVxyXG5cclxudHlwZSBOb2RlPFQ+ID0gSW50ZXJuYWxOb2RlPFQ+IHwgTGVhZk5vZGU8VD5cclxuXHJcbmV4cG9ydCBjbGFzcyBBQUJCVHJlZTxUPiB7XHJcbiAgICByb290OiBOb2RlPFQ+IHwgbnVsbCA9IG51bGxcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHsgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogaW5zZXJ0IGEgbmV3IG5vZGUgaW50byB0aGUgdHJlZVxyXG4gICAgICogcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgbGVhZiBub2RlIHRoYXQgY2FuIGxhdGVyIGJlIHVzZWQgZm9yIHJlbW92YWxcclxuICAgICAqIEBwYXJhbSBhYWJiIGFhYmIgb2YgZGF0YVxyXG4gICAgICogQHBhcmFtIGRhdGEgZGF0YSB0byBpbnNlcnRcclxuICAgICAqL1xyXG4gICAgaW5zZXJ0KGFhYmI6IEFBQkIsIGRhdGE6IFQpOiBMZWFmTm9kZTxUPiB7XHJcbiAgICAgICAgLy8gY3JlYXRlIHRoZSBsZWFmIG5vZGUgdGhhdCB3aWxsIGJlIGluc2VydGVkXHJcbiAgICAgICAgY29uc3QgbmV3TGVhZjogTGVhZk5vZGU8VD4gPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IE5vZGVUeXBlLkxlYWYsXHJcbiAgICAgICAgICAgIGFhYmI6IGFhYmIuY2xvbmUoKSxcclxuICAgICAgICAgICAgcGFyZW50OiBudWxsLFxyXG4gICAgICAgICAgICBkYXRhXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBubyByb290LCBjcmVhdGUgYSBsZWFmXHJcbiAgICAgICAgaWYgKCF0aGlzLnJvb3QpIHtcclxuICAgICAgICAgICAgdGhpcy5yb290ID0gbmV3TGVhZlxyXG4gICAgICAgICAgICByZXR1cm4gbmV3TGVhZlxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gb3RoZXJ3aXNlLCBjaG9vc2UgYSBsZWFmIHRvIGJlY29tZSB0aGUgc2libGluZyBvZiB0aGUgbmV3IGxlYWZcclxuICAgICAgICBjb25zdCBzaWJsaW5nID0gdGhpcy5jaG9vc2VTaWJsaW5nTGVhZih0aGlzLnJvb3QsIGFhYmIpXHJcblxyXG4gICAgICAgIC8vIGNyZWF0ZSBhIG5ldyBwYXJlbnQgbm9kZVxyXG4gICAgICAgIGNvbnN0IG5ld1BhcmVudDogSW50ZXJuYWxOb2RlPFQ+ID0ge1xyXG4gICAgICAgICAgICB0eXBlOiBOb2RlVHlwZS5JbnRlcm5hbCxcclxuICAgICAgICAgICAgcGFyZW50OiBzaWJsaW5nLnBhcmVudCxcclxuICAgICAgICAgICAgYWFiYjogYWFiYi5jb21iaW5lKHNpYmxpbmcuYWFiYiksXHJcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbbmV3TGVhZiwgc2libGluZ11cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNpYmxpbmcucGFyZW50ID0gbmV3UGFyZW50XHJcbiAgICAgICAgbmV3TGVhZi5wYXJlbnQgPSBuZXdQYXJlbnRcclxuXHJcbiAgICAgICAgLy8gcmVwbGFjZSBsaW5rIGluIG9sZCBwYXJlbnQgd2l0aCBuZXdseSBjcmVhdGVkIHBhcmVudFxyXG4gICAgICAgIC8vIG9yIGlmIHRoZXJlIHdhcyBubyBwYXJlbnQsIGxlYWYgd2FzIHJvb3QsIG1ha2UgbmV3IHBhcmVudCB0aGUgbmV3IHJvb3RcclxuICAgICAgICBsZXQgcGFyZW50ID0gbmV3UGFyZW50LnBhcmVudFxyXG4gICAgICAgIGlmIChwYXJlbnQpIHtcclxuICAgICAgICAgICAgY29uc3QgaWR4ID0gcGFyZW50LmNoaWxkcmVuLmluZGV4T2Yoc2libGluZylcclxuICAgICAgICAgICAgaWYgKGlkeCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBmaW5kIGxpbmsgdG8gY2hvc2VuIHNpYmxpbmdcIilcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcGFyZW50LmNoaWxkcmVuW2lkeF0gPSBuZXdQYXJlbnRcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnJvb3QgPSBuZXdQYXJlbnRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlQUFCQnMocGFyZW50KVxyXG4gICAgICAgIHJldHVybiBuZXdMZWFmXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZW1vdmVzIHNwZWNpZmllZCBsZWFmIG5vZGUgYW5kIGl0cyBkYXRhIGZyb20gdGhlIHRyZWVcclxuICAgICAqIEBwYXJhbSBsZWFmIGxlYWYgXHJcbiAgICAgKi9cclxuICAgIGRlbGV0ZShsZWFmOiBMZWFmTm9kZTxUPikge1xyXG4gICAgICAgIC8vIHNwZWNpYWwgY2FzZSAtIGxlYWYgaXMgcm9vdFxyXG4gICAgICAgIGlmICh0aGlzLnJvb3QgPT09IGxlYWYpIHtcclxuICAgICAgICAgICAgdGhpcy5yb290ID0gbnVsbFxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBhcmVudCA9IGxlYWYucGFyZW50XHJcbiAgICAgICAgaWYgKCFwYXJlbnQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB0cmVlLCBub24tcm9vdCBsZWFmIGhhcyBubyBwYXJlbnRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIG90aGVyd2lzZSxcclxuICAgICAgICAvLyByZXBsYWNlIGxlYWYucGFyZW50IHdpdGggbGVhZidzIHNpYmxpbmdcclxuICAgICAgICAvLyByZWNhbGN1bGF0ZSBhYWJic1xyXG4gICAgICAgIGNvbnN0IHNpYmxpbmcgPSBwYXJlbnQuY2hpbGRyZW4uZmluZChuID0+IG4gIT09IGxlYWYpXHJcbiAgICAgICAgaWYgKCFzaWJsaW5nKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdHJlZSwgbGVhZiBub2RlIGhhcyBubyBzaWJsaW5nXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBncmFuZFBhcmVudCA9IHBhcmVudC5wYXJlbnRcclxuXHJcbiAgICAgICAgLy8gbm8gZ3JhbmRwYXJlbnQgLSBwYXJlbnQgd2FzIHJvb3QgLSBtYWtlIHNpYmxpbmcgdGhlIG5ldyByb290XHJcbiAgICAgICAgaWYgKCFncmFuZFBhcmVudCkge1xyXG4gICAgICAgICAgICB0aGlzLnJvb3QgPSBzaWJsaW5nXHJcbiAgICAgICAgICAgIHNpYmxpbmcucGFyZW50ID0gbnVsbFxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBhcmVudElkeCA9IGdyYW5kUGFyZW50LmNoaWxkcmVuLmluZGV4T2YocGFyZW50KVxyXG4gICAgICAgIGlmIChwYXJlbnRJZHggPT09IC0xKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdHJlZSwgZ3JhbmRwYXJlbnQgZG9lcyBub3QgaGF2ZSBsaW5rIHRvIHBhcmVudFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ3JhbmRQYXJlbnQuY2hpbGRyZW5bcGFyZW50SWR4XSA9IHNpYmxpbmdcclxuICAgICAgICBzaWJsaW5nLnBhcmVudCA9IGdyYW5kUGFyZW50XHJcbiAgICAgICAgdGhpcy51cGRhdGVBQUJCcyhncmFuZFBhcmVudClcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEl0ZXJhdGVzIG92ZXIgYWxsIGRhdGEgdGhhdCBvdmVybGFwcyB0aGUgQUFCQlxyXG4gICAgICogQHBhcmFtIGFhYmIgYWFiYlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgKnF1ZXJ5KGFhYmI6IEFBQkIpOiBJdGVyYWJsZTxUPiB7XHJcbiAgICAgICAgY29uc3Qgc3RhY2s6IE5vZGU8VD5bXSA9IFtdXHJcbiAgICAgICAgaWYgKHRoaXMucm9vdCAmJiB0aGlzLnJvb3QuYWFiYi5vdmVybGFwcyhhYWJiKSkge1xyXG4gICAgICAgICAgICBzdGFjay5wdXNoKHRoaXMucm9vdClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBhcnJheS5wb3Aoc3RhY2spXHJcbiAgICAgICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIE5vZGVUeXBlLkludGVybmFsOlxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hpbGQuYWFiYi5vdmVybGFwcyhhYWJiKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaChjaGlsZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlIE5vZGVUeXBlLkxlYWY6XHJcbiAgICAgICAgICAgICAgICAgICAgeWllbGQgbm9kZS5kYXRhXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjaG9vc2VTaWJsaW5nTGVhZihub2RlOiBOb2RlPFQ+LCBhYWJiOiBBQUJCKTogTm9kZTxUPiB7XHJcbiAgICAgICAgLy8gY2hvb3NlIHRoZSBsZWFmIHRoYXQgd291bGQgaW5jcmVhc2UgbGVhc3QgaW4gYXJlYSBieSBpbmNsdWRpbmcgdGhpcyBub2RlXHJcbiAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBOb2RlVHlwZS5JbnRlcm5hbDpcclxuICAgICAgICAgICAgICAgIGNvbnN0IG4gPSBub2RlLmNoaWxkcmVuLnJlZHVjZSgoYSwgYikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNhbGN1bGF0ZSBzdXJmYWNlIGFyZWEgaW5jcmVhc2UgZm9yIG5vZGUgYVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhID0gYS5hYWJiLmFyZWEgLSBhLmFhYmIuY29tYmluZShhYWJiKS5hcmVhXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGIgPSBiLmFhYmIuYXJlYSAtIGIuYWFiYi5jb21iaW5lKGFhYmIpLmFyZWFcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGEgPCBkYiA/IGEgOiBiXHJcbiAgICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNob29zZVNpYmxpbmdMZWFmKG4sIGFhYmIpXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIGNhc2UgTm9kZVR5cGUuTGVhZjpcclxuICAgICAgICAgICAgICAgIC8vIHdlJ3ZlIHJlYWNoZWQgYSBsZWFmIC0gcmV0dXJuIGl0XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZUFBQkJzKG5vZGU6IEludGVybmFsTm9kZTxUPiB8IG51bGwpIHtcclxuICAgICAgICB3aGlsZSAobm9kZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIG5vZGUuYWFiYiA9IG5vZGUuY2hpbGRyZW5bMF0uYWFiYi5jb21iaW5lKG5vZGUuY2hpbGRyZW5bMV0uYWFiYilcclxuICAgICAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59Il19