/**
 * 3d math library
 */
class Vec2 {
    constructor(public x: number, public y: number) { }

    equal(b: Vec2): boolean {
        return this.x === b.x && this.y === b.y
    }

    addX(x: number): Vec2 {
        return new Vec2(this.x + x, this.y + x)
    }

    subX(x: number): Vec2 {
        return new Vec2(this.x - x, this.y - x)
    }

    mulX(x: number): Vec2 {
        return new Vec2(this.x * x, this.y * x)
    }

    divX(x: number): Vec2 {
        return new Vec2(this.x / x, this.y / x)
    }

    add(b: Vec2): Vec2 {
        return new Vec2(this.x + b.x, this.y + b.y)
    }

    sub(b: Vec2): Vec2 {
        return new Vec2(this.x - b.x, this.y - b.y)
    }

    mul(b: Vec2): Vec2 {
        return new Vec2(this.x * b.x, this.y * b.y)
    }

    div(b: Vec2): Vec2 {
        return new Vec2(this.x / b.x, this.y / b.y)
    }

    dot(b: Vec2): number {
        return this.x * b.x + this.y * b.y
    }

    lengthSq(): number {
        return this.dot(this)
    }

    length(): number {
        return Math.sqrt(this.dot(this))
    }

    normalize(): Vec2 {
        return this.divX(this.length())
    }

    abs(): Vec2 {
        return new Vec2(Math.abs(this.x), Math.abs(this.y))
    }

    neg(): Vec2 {
        return new Vec2(-this.x, -this.y)
    }

    toString() {
        return `(${this.x},${this.y})`
    }
}

class Vec3 {
    constructor(public x: number, public y: number, public z: number) { }

    equal(b: Vec3): boolean {
        return this.x === b.x && this.y === b.y && this.z === b.z
    }

    addX(x: number): Vec3 {
        return new Vec3(this.x + x, this.y + x, this.z + x)
    }

    subX(x: number): Vec3 {
        return new Vec3(this.x - x, this.y - x, this.z - x)
    }

    mulX(x: number): Vec3 {
        return new Vec3(this.x * x, this.y * x, this.z * x)
    }

    divX(x: number): Vec3 {
        return new Vec3(this.x / x, this.y / x, this.z / x)
    }

    add(b: Vec3): Vec3 {
        return new Vec3(this.x + b.x, this.y + b.y, this.z + b.z)
    }

    sub(b: Vec3): Vec3 {
        return new Vec3(this.x - b.x, this.y - b.y, this.z - b.z)
    }

    mul(b: Vec3): Vec3 {
        return new Vec3(this.x * b.x, this.y * b.y, this.z * b.z)
    }

    div(b: Vec3): Vec3 {
        return new Vec3(this.x / b.x, this.y / b.y, this.z / b.z)
    }

    dot(b: Vec3): number {
        return this.x * b.x + this.y * b.y + this.z * b.z
    }

    lengthSq(): number {
        return this.dot(this)
    }

    length(): number {
        return Math.sqrt(this.dot(this))
    }

    normalize(): Vec3 {
        return this.divX(this.length())
    }

    abs(): Vec3 {
        return new Vec3(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z))
    }

    neg(): Vec3 {
        return new Vec3(-this.x, -this.y, -this.z)
    }

    toString() {
        return `(${this.x},${this.y},${this.z})`
    }
}

class Vec4 {
    constructor(public x: number, public y: number, public z: number, public w: number) { }

    equal(b: Vec4): boolean {
        return this.x === b.x && this.y === b.y && this.z === b.z && this.w == b.w
    }

    addX(x: number): Vec4 {
        return new Vec4(this.x + x, this.y + x, this.z + x, this.w + x)
    }

    subX(x: number): Vec4 {
        return new Vec4(this.x - x, this.y - x, this.z - x, this.w - x)
    }

    mulX(x: number): Vec4 {
        return new Vec4(this.x * x, this.y * x, this.z * x, this.w * x)
    }

    divX(x: number): Vec4 {
        return new Vec4(this.x / x, this.y / x, this.z / x, this.w / x)
    }

    add(b: Vec4): Vec4 {
        return new Vec4(this.x + b.x, this.y + b.y, this.z + b.z, this.w + b.w)
    }

    sub(b: Vec4): Vec4 {
        return new Vec4(this.x - b.x, this.y - b.y, this.z - b.z, this.w - b.w)
    }

    mul(b: Vec4): Vec4 {
        return new Vec4(this.x * b.x, this.y * b.y, this.z * b.z, this.w - b.w)
    }

    div(b: Vec4): Vec4 {
        return new Vec4(this.x / b.x, this.y / b.y, this.z / b.z, this.w / b.w)
    }

    dot(b: Vec4): number {
        return this.x * b.x + this.y * b.y + this.z * b.z + this.w * b.w
    }

    lengthSq(): number {
        return this.dot(this)
    }

    length(): number {
        return Math.sqrt(this.dot(this))
    }

    normalize(): Vec3 {
        return this.divX(this.length())
    }

    abs(): Vec4 {
        return new Vec4(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z), Math.abs(this.w))
    }

    neg(): Vec4 {
        return new Vec4(-this.x, -this.y, -this.z, -this.w)
    }

    toString() {
        return `(${this.x},${this.y},${this.z},${this.w})`
    }
}