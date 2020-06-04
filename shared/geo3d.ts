import * as math from "../shared/math.js"

/**
 * 3d math library
 */
export class Vec2 {
    constructor(public x: number, public y: number) { }

    static inf(): Vec2 {
        return new Vec2(Infinity, Infinity)
    }

    equal(b: Vec2): boolean {
        return this.x === b.x && this.y === b.y
    }

    clone(): Vec2 {
        return new Vec2(this.x, this.y)
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

    sign(): Vec2 {
        return new Vec2(Math.sign(this.x), Math.sign(this.y))
    }

    neg(): Vec2 {
        return new Vec2(-this.x, -this.y)
    }

    min(b: Vec2): Vec2 {
        return new Vec2(Math.min(this.x, b.x), Math.min(this.y, b.y))
    }

    max(b: Vec2): Vec2 {
        return new Vec2(Math.max(this.x, b.x), Math.max(this.y, b.y))
    }

    clamp(min: Vec2, max: Vec2): Vec2 {
        return new Vec2(math.clamp(this.x, min.x, max.x), math.clamp(this.y, min.y, max.y))
    }

    toString(): string {
        return `(${this.x},${this.y})`
    }

    toArray(): number[] {
        return [this.x, this.y]
    }

    get xy0(): Vec3 {
        return new Vec3(this.x, this.y, 0)
    }
}

export class Vec3 {
    constructor(public x: number, public y: number, public z: number) { }

    static inf(): Vec3 {
        return new Vec3(Infinity, Infinity, Infinity)
    }

    equal(b: Vec3): boolean {
        return this.x === b.x && this.y === b.y && this.z === b.z
    }

    clone(): Vec3 {
        return new Vec3(this.x, this.y, this.z)
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

    cross(b: Vec3): Vec3 {
        return new Vec3(
            this.y * b.z - this.z * b.y,
            this.z * b.x - this.x * b.z,
            this.x * b.y - this.y * b.x)
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

    sign(): Vec3 {
        return new Vec3(Math.sign(this.x), Math.sign(this.y), Math.sign(this.z))
    }

    neg(): Vec3 {
        return new Vec3(-this.x, -this.y, -this.z)
    }

    min(b: Vec3): Vec3 {
        return new Vec3(Math.min(this.x, b.x), Math.min(this.y, b.y), Math.min(this.z, b.z))
    }

    max(b: Vec3): Vec3 {
        return new Vec3(Math.max(this.x, b.x), Math.max(this.y, b.y), Math.max(this.z, b.z))
    }

    clamp(min: Vec3, max: Vec3): Vec3 {
        return new Vec3(math.clamp(this.x, min.x, max.x), math.clamp(this.y, min.y, max.y), math.clamp(this.z, min.z, max.z))
    }

    toString(): string {
        return `(${this.x},${this.y},${this.z})`
    }

    toArray(): number[] {
        return [this.x, this.y, this.z]
    }

    get xy(): Vec2 {
        return new Vec2(this.x, this.y)
    }

    get xz(): Vec2 {
        return new Vec2(this.x, this.z)
    }

    get xyz0(): Vec4 {
        return new Vec4(this.x, this.y, this.z, 0)
    }

    get xyz1(): Vec4 {
        return new Vec4(this.x, this.y, this.z, 1)
    }
}

export class Vec4 {
    constructor(public x: number, public y: number, public z: number, public w: number) { }

    static inf(): Vec4 {
        return new Vec4(Infinity, Infinity, Infinity, Infinity)
    }

    equal(b: Vec4): boolean {
        return this.x === b.x && this.y === b.y && this.z === b.z && this.w == b.w
    }

    clone(): Vec4 {
        return new Vec4(this.x, this.y, this.z, this.w)
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

    normalize(): Vec4 {
        return this.divX(this.length())
    }

    abs(): Vec4 {
        return new Vec4(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z), Math.abs(this.w))
    }

    sign(): Vec4 {
        return new Vec4(Math.sign(this.x), Math.sign(this.y), Math.sign(this.z), Math.sign(this.w))
    }

    neg(): Vec4 {
        return new Vec4(-this.x, -this.y, -this.z, -this.w)
    }

    min(b: Vec4): Vec4 {
        return new Vec4(Math.min(this.x, b.x), Math.min(this.y, b.y), Math.min(this.z, b.z), Math.min(this.w, b.w))
    }

    max(b: Vec4): Vec4 {
        return new Vec4(Math.max(this.x, b.x), Math.max(this.y, b.y), Math.max(this.z, b.z), Math.max(this.w, b.w))
    }

    clamp(min: Vec4, max: Vec4): Vec4 {
        return new Vec4(math.clamp(this.x, min.x, max.x), math.clamp(this.y, min.y, max.y), math.clamp(this.z, min.z, max.z), math.clamp(this.w, min.w, max.w))
    }

    toString(): string {
        return `(${this.x},${this.y},${this.z},${this.w})`
    }

    toArray(): number[] {
        return [this.x, this.y, this.z, this.w]
    }

    get xy(): Vec2 {
        return new Vec2(this.x, this.y)
    }

    get xz(): Vec2 {
        return new Vec2(this.x, this.z)
    }

    get xyz(): Vec3 {
        return new Vec3(this.x, this.y, this.z)
    }
}

export class Mat2 {
    static identity(): Mat2 {
        return new Mat2(1, 0, 0, 1)
    }

    static rotation(theta: number): Mat2 {
        const sinTheta = Math.sin(theta)
        const cosTheta = Math.cos(theta)
        return new Mat2(cosTheta, -sinTheta, sinTheta, cosTheta)
    }

    constructor(
        public m11: number, public m12: number,
        public m21: number, public m22: number) { }

    equal(b: Mat2): boolean {
        return this.m11 === b.m11 && this.m12 === b.m12 && this.m21 === b.m21 && this.m11 === b.m22
    }

    clone(): Mat2 {
        return new Mat2(this.m11, this.m12, this.m21, this.m22)
    }

    transpose(): Mat2 {
        return new Mat2(this.m11, this.m21, this.m12, this.m22)
    }

    matmul(b: Mat2): Mat2 {
        return new Mat2(
            this.m11 * b.m11 + this.m12 * b.m21, // m11,
            this.m11 * b.m12 + this.m12 * b.m22, // m12,
            this.m21 * b.m11 + this.m22 * b.m21, // m21,
            this.m21 * b.m12 + this.m22 * b.m22, // m22,
        )
    }

    toString(): string {
        return `| ${this.m11} ${this.m12} |
| ${this.m21} ${this.m22} |`
    }

    toArray(): number[] {
        return [
            this.m11, this.m12,
            this.m21, this.m22
        ]
    }
}

export class Mat3 {
    static identity(): Mat3 {
        return new Mat3(
            1, 0, 0,
            0, 1, 0,
            0, 0, 1)
    }

    constructor(
        public m11: number, public m12: number, public m13: number,
        public m21: number, public m22: number, public m23: number,
        public m31: number, public m32: number, public m33: number) { }

    equal(b: Mat3): boolean {
        return (
            this.m11 === b.m11 && this.m12 === b.m12 && this.m13 === b.m13 &&
            this.m21 === b.m21 && this.m22 === b.m22 && this.m23 === b.m23 &&
            this.m31 === b.m31 && this.m32 === b.m32 && this.m33 === b.m33)
    }

    clone(): Mat3 {
        return new Mat3(
            this.m11, this.m12, this.m13,
            this.m21, this.m22, this.m23,
            this.m31, this.m32, this.m33)
    }

    transpose(): Mat2 {
        return new Mat3(
            this.m11, this.m21, this.m31,
            this.m12, this.m22, this.m32,
            this.m13, this.m23, this.m33)
    }

    matmul(b: Mat3): Mat3 {
        return new Mat3(
            this.m11 * b.m11 + this.m12 * b.m21 + this.m13 * b.m31, // m11,
            this.m11 * b.m12 + this.m12 * b.m22 + this.m13 * b.m32, // m12,
            this.m11 * b.m13 + this.m12 * b.m23 + this.m13 * b.m33, // m13,
            this.m21 * b.m11 + this.m22 * b.m21 + this.m23 * b.m31, // m21,
            this.m21 * b.m12 + this.m22 * b.m22 + this.m23 * b.m32, // m22,
            this.m21 * b.m13 + this.m22 * b.m23 + this.m23 * b.m33, // m23,
            this.m31 * b.m11 + this.m32 * b.m21 + this.m33 * b.m31, // m31,
            this.m31 * b.m12 + this.m32 * b.m22 + this.m33 * b.m32, // m32,
            this.m31 * b.m13 + this.m32 * b.m23 + this.m33 * b.m33, // m33
        )
    }

    /**
     * transform the vector by the specified matrix
     * treats vector as a column matrix to left of 3x3 matrix
     * |xyz| * m
     * @param a vector
     */
    transform(a: Vec3): Vec3 {
        const x = a.x * this.m11 + a.y * this.m21 + a.z * this.m31
        const y = a.x * this.m12 + a.y * this.m22 + a.z * this.m32
        const z = a.x * this.m13 + a.y * this.m23 + a.z * this.m33
        return new Vec3(x, y, z)
    }

    toString(): string {
        return `| ${this.m11} ${this.m12} ${this.m13} |
| ${this.m21} ${this.m22} ${this.m23} |
| ${this.m31} ${this.m32} ${this.m33} |`
    }

    toArray(): number[] {
        return [
            this.m11, this.m12, this.m13,
            this.m21, this.m22, this.m23,
            this.m31, this.m32, this.m33,
        ]
    }
}

export class Mat4 {
    static identity(): Mat4 {
        return new Mat4(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1)
    }

    static translation(a: Vec3): Mat4 {
        return new Mat4(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            a.x, a.y, a.z, 1)
    }

    static rotationX(theta: number): Mat4 {
        const cosTheta = Math.cos(theta)
        const sinTheta = Math.sin(theta)

        return new Mat4(
            1, 0, 0, 0,
            0, cosTheta, -sinTheta, 0,
            0, sinTheta, cosTheta, 0,
            0, 0, 0, 1)
    }

    static rotationY(theta: number): Mat4 {
        const cosTheta = Math.cos(theta)
        const sinTheta = Math.sin(theta)

        return new Mat4(
            cosTheta, 0, sinTheta, 0,
            0, 1, 0, 0,
            -sinTheta, 0, cosTheta, 0,
            0, 0, 0, 1)
    }

    static rotationZ(theta: number): Mat4 {
        const cosTheta = Math.cos(theta)
        const sinTheta = Math.sin(theta)

        return new Mat4(
            cosTheta, -sinTheta, 0, 0,
            sinTheta, cosTheta, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1)
    }

    static rotation_axis(axis: Vec3, theta: number): Mat4 {
        const cosTheta = Math.cos(theta)
        const sinTheta = Math.sin(theta)
        const { x, y, z } = axis
        const xSinTheta = x * sinTheta
        const ySinTheta = y * sinTheta
        const zSinTheta = z * sinTheta
        const oneMinusCosTheta = 1 - cosTheta

        return new Mat4(
            cosTheta + x * x * oneMinusCosTheta, x * y * oneMinusCosTheta - zSinTheta, x * z * oneMinusCosTheta + ySinTheta, 0,
            y * x * oneMinusCosTheta + zSinTheta, cosTheta + y * y * oneMinusCosTheta, y * z * oneMinusCosTheta - xSinTheta, 0,
            z * x * oneMinusCosTheta - ySinTheta, z * y * oneMinusCosTheta + xSinTheta, cosTheta + z * z * oneMinusCosTheta, 0,
            0, 0, 0, 1)
    }

    static scaling(xyz: Vec3): Mat4 {
        return new Mat4(
            xyz.x, 0, 0, 0,
            0, xyz.y, 0, 0,
            0, 0, xyz.z, 0,
            0, 0, 0, 1)
    }

    /**
     * create a webgl perspective matrix
     * @param fovY y fov (radians)
     * @param aspect aspect ratio
     * @param nearZ near z coordinate
     * @param farZ far z coordinate
     */
    static perspective(fovY: number, aspect: number, nearZ: number, farZ: number): Mat4 {
        const f = Math.tan(Math.PI * 0.5 - 0.5 * fovY)
        const invRange = 1 / (nearZ - farZ)

        return new Mat4(
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (nearZ + farZ) * invRange, -1,
            0, 0, nearZ * farZ * invRange * 2, 0
        )
    }

    /**
     * construct a look at matrix that places the camera at the eye point, looking at the specified target
     * invert for a "view" matrix
     * @param eye eye position
     * @param target target position
     * @param up up axis
     */
    static lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
        const zAxis = eye.sub(target).normalize()
        const xAxis = up.cross(zAxis)
        const yAxis = zAxis.cross(xAxis)
        return Mat4.basis(xAxis, yAxis, zAxis, eye)
    }

    static basis(xAxis: Vec3, yAxis: Vec3, zAxis: Vec3, translation: Vec3) {
        return new Mat4(
            xAxis.x, xAxis.y, xAxis.z, 0,
            yAxis.x, yAxis.y, yAxis.z, 0,
            zAxis.x, zAxis.y, zAxis.z, 0,
            translation.x, translation.y, translation.z, 1
        )
    }

    constructor(
        public m11: number, public m12: number, public m13: number, public m14: number,
        public m21: number, public m22: number, public m23: number, public m24: number,
        public m31: number, public m32: number, public m33: number, public m34: number,
        public m41: number, public m42: number, public m43: number, public m44: number) { }

    equal(b: Mat4): boolean {
        return (
            this.m11 === b.m11 && this.m12 === b.m12 && this.m13 === b.m13 && this.m14 === b.m14 &&
            this.m21 === b.m21 && this.m22 === b.m22 && this.m23 === b.m23 && this.m24 === b.m24 &&
            this.m31 === b.m31 && this.m32 === b.m32 && this.m33 === b.m33 && this.m34 === b.m34 &&
            this.m41 === b.m41 && this.m42 === b.m42 && this.m43 === b.m43 && this.m44 === b.m44)
    }

    clone(): Mat4 {
        return new Mat4(
            this.m11, this.m12, this.m13, this.m14,
            this.m21, this.m22, this.m23, this.m24,
            this.m31, this.m32, this.m33, this.m34,
            this.m41, this.m42, this.m43, this.m44)
    }

    transpose(): Mat4 {
        return new Mat4(
            this.m11, this.m21, this.m31, this.m41,
            this.m12, this.m22, this.m32, this.m42,
            this.m13, this.m23, this.m33, this.m43,
            this.m14, this.m24, this.m34, this.m44)
    }

    matmul(b: Mat4): Mat4 {
        return new Mat4(
            this.m11 * b.m11 + this.m12 * b.m21 + this.m13 * b.m31 + this.m14 * b.m41, // m11
            this.m11 * b.m12 + this.m12 * b.m22 + this.m13 * b.m32 + this.m14 * b.m42, // m12
            this.m11 * b.m13 + this.m12 * b.m23 + this.m13 * b.m33 + this.m14 * b.m43, // m13
            this.m11 * b.m14 + this.m12 * b.m24 + this.m13 * b.m34 + this.m14 * b.m44, // m14
            this.m21 * b.m11 + this.m22 * b.m21 + this.m23 * b.m31 + this.m24 * b.m41, // m21
            this.m21 * b.m12 + this.m22 * b.m22 + this.m23 * b.m32 + this.m24 * b.m42, // m22
            this.m21 * b.m13 + this.m22 * b.m23 + this.m23 * b.m33 + this.m24 * b.m43, // m23
            this.m21 * b.m14 + this.m22 * b.m24 + this.m23 * b.m34 + this.m24 * b.m44, // m24
            this.m31 * b.m11 + this.m32 * b.m21 + this.m33 * b.m31 + this.m34 * b.m41, // m31
            this.m31 * b.m12 + this.m32 * b.m22 + this.m33 * b.m32 + this.m34 * b.m42, // m32
            this.m31 * b.m13 + this.m32 * b.m23 + this.m33 * b.m33 + this.m34 * b.m43, // m33
            this.m31 * b.m14 + this.m32 * b.m24 + this.m33 * b.m34 + this.m34 * b.m44, // m34
            this.m41 * b.m11 + this.m42 * b.m21 + this.m43 * b.m31 + this.m44 * b.m41, // m41
            this.m41 * b.m12 + this.m42 * b.m22 + this.m43 * b.m32 + this.m44 * b.m42, // m42
            this.m41 * b.m13 + this.m42 * b.m23 + this.m43 * b.m33 + this.m44 * b.m43, // m43
            this.m41 * b.m14 + this.m42 * b.m24 + this.m43 * b.m34 + this.m44 * b.m44, // m44
        )
    }

    /**
     * transform the vector by the specified matrix
     * treats vector as a column matrix to left of 4x4 matrix
     * projects back to w = 1 space after multiplication
     * |xyz1| * m
     * @param a vector
     */
    transform3(a: Vec3): Vec3 {
        const w = a.x * this.m14 + a.y * this.m24 + a.z * this.m34 + this.m44
        const invW = 1 / w
        const x = (a.x * this.m11 + a.y * this.m21 + a.z * this.m31 + this.m41) / invW
        const y = (a.x * this.m12 + a.y * this.m22 + a.z * this.m32 + this.m42) / invW
        const z = (a.x * this.m13 + a.y * this.m23 + a.z * this.m33 + this.m43) / invW
        return new Vec3(x, y, z)
    }

    /**
     * transform a vector using matrix multiplication
     * treats vector as a column vector in multiplication |xyzw| * m
     * @param a vector
     */
    transform4(a: Vec4): Vec4 {
        const x = a.x * this.m11 + a.y * this.m21 + a.z * this.m31 + a.w * this.m41
        const y = a.x * this.m12 + a.y * this.m22 + a.z * this.m32 + a.w * this.m42
        const z = a.x * this.m13 + a.y * this.m23 + a.z * this.m33 + a.w * this.m43
        const w = a.x * this.m14 + a.y * this.m24 + a.z * this.m34 + a.w * this.m44
        return new Vec4(x, y, z, w)
    }

    invert(): Mat4 {
        const s0 = this.m11 * this.m22 - this.m12 * this.m21;
        const s1 = this.m11 * this.m23 - this.m13 * this.m21;
        const s2 = this.m11 * this.m24 - this.m14 * this.m21;
        const s3 = this.m12 * this.m23 - this.m13 * this.m22;
        const s4 = this.m12 * this.m24 - this.m14 * this.m22;
        const s5 = this.m13 * this.m24 - this.m14 * this.m23;
        const c5 = this.m33 * this.m44 - this.m34 * this.m43;
        const c4 = this.m32 * this.m44 - this.m34 * this.m42;
        const c3 = this.m32 * this.m43 - this.m33 * this.m42;
        const c2 = this.m31 * this.m44 - this.m34 * this.m41;
        const c1 = this.m31 * this.m43 - this.m33 * this.m41;
        const c0 = this.m31 * this.m42 - this.m32 * this.m41;
        const det = s0 * c5 - s1 * c4 + s2 * c3 + s3 * c2 - s4 * c1 + s5 * c0;

        if (det === 0) {
            throw new Error("Can't invert")
        }

        return new Mat4(
            (this.m22 * c5 - this.m23 * c4 + this.m24 * c3) / det, (-this.m12 * c5 + this.m13 * c4 - this.m14 * c3) / det, (this.m42 * s5 - this.m43 * s4 + this.m44 * s3) / det, (-this.m32 * s5 + this.m33 * s4 - this.m34 * s3) / det,
            (-this.m21 * c5 + this.m23 * c2 - this.m24 * c1) / det, (this.m11 * c5 - this.m13 * c2 + this.m14 * c1) / det, (-this.m41 * s5 + this.m43 * s2 - this.m44 * s1) / det, (this.m31 * s5 - this.m33 * s2 + this.m34 * s1) / det,
            (this.m21 * c4 - this.m22 * c2 + this.m24 * c0) / det, (-this.m11 * c4 + this.m12 * c2 - this.m14 * c0) / det, (this.m41 * s4 - this.m42 * s2 + this.m44 * s0) / det, (-this.m31 * s4 + this.m32 * s2 - this.m34 * s0) / det,
            (-this.m21 * c3 + this.m22 * c1 - this.m23 * c0) / det, (this.m11 * c3 - this.m12 * c1 + this.m13 * c0) / det, (-this.m41 * s3 + this.m42 * s1 - this.m43 * s0) / det, (this.m31 * s3 - this.m32 * s1 + this.m33 * s0) / det
        )
    }

    toMat3(): Mat3 {
        return new Mat3(
            this.m11, this.m12, this.m13,
            this.m21, this.m22, this.m23,
            this.m31, this.m32, this.m33
        )
    }

    toString(): string {
        return `| ${this.m11} ${this.m12} ${this.m13} ${this.m14} |
| ${this.m21} ${this.m22} ${this.m23} ${this.m24} |
| ${this.m31} ${this.m32} ${this.m33} ${this.m34} |
| ${this.m41} ${this.m42} ${this.m43} ${this.m44} |`
    }

    toArray(): number[] {
        return [
            this.m11, this.m12, this.m13, this.m14,
            this.m21, this.m22, this.m23, this.m24,
            this.m31, this.m32, this.m33, this.m34,
            this.m41, this.m42, this.m43, this.m44,
        ]
    }
}

export class AABB {
    constructor(public readonly min: Vec3, public readonly max: Vec3) { }

    static fromPoints(pts: Iterable<Vec3>): AABB {
        let min = Vec3.inf()
        let max = min.neg()

        for (const pt of pts) {
            min = min.min(pt)
            max = max.max(pt)
        }

        const aabb = new AABB(min, max)
        return aabb
    }

    static fromHalfExtents(halfExtents: Vec3): AABB {
        return new AABB(halfExtents.neg(), halfExtents)
    }

    static fromPositionHalfExtents(position: Vec3, halfExtents: Vec3): AABB {
        return new AABB(position.sub(halfExtents), position.add(halfExtents))
    }

    static fromCoords(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): AABB {
        return new AABB(new Vec3(minX, minY, minZ), new Vec3(maxX, maxY, maxZ))
    }

    get extents(): Vec3 {
        return this.max.sub(this.min)
    }

    union(aabb: AABB): AABB {
        const u = new AABB(this.min.min(aabb.min), this.max.max(aabb.max))
        return u
    }

    intersection(aabb: AABB): AABB {
        const ix = new AABB(this.min.max(aabb.min), this.max.min(aabb.max))
        return ix
    }

    overlaps(aabb: AABB): boolean {
        return (
            this.max.x >= aabb.min.x &&
            this.max.y >= aabb.min.y &&
            this.max.z >= aabb.min.z &&
            this.min.x <= aabb.max.x &&
            this.min.y <= aabb.max.y &&
            this.min.z <= aabb.max.z
        )
    }

    contains(pt: Vec3): boolean {
        return (
            pt.x >= this.min.x &&
            pt.y >= this.min.y &&
            pt.z >= this.min.z &&
            pt.x < this.max.x &&
            pt.y < this.max.y &&
            pt.z < this.max.z
        )
    }

    translate(offset: Vec3): AABB {
        return new AABB(this.min.add(offset), this.max.add(offset))
    }

    scale(s: number): AABB {
        return new AABB(this.min.mulX(s), this.max.mulX(s))
    }

    buffer(padding: number): AABB {
        const aabb = new AABB(this.min.addX(-padding), this.max.addX(padding))
        return aabb
    }

    shrink(amount: number): AABB {
        return this.buffer(-amount)
    }

    clone(): AABB {
        return new AABB(this.min.clone(), this.max.clone())
    }
}