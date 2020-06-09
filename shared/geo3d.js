import * as math from "../shared/math.js";
/**
 * 3d math library
 */
export class Vec2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    static inf() {
        return new Vec2(Infinity, Infinity);
    }
    equal(b) {
        return this.x === b.x && this.y === b.y;
    }
    clone() {
        return new Vec2(this.x, this.y);
    }
    addX(x) {
        return new Vec2(this.x + x, this.y + x);
    }
    subX(x) {
        return new Vec2(this.x - x, this.y - x);
    }
    mulX(x) {
        return new Vec2(this.x * x, this.y * x);
    }
    divX(x) {
        return new Vec2(this.x / x, this.y / x);
    }
    add(b) {
        return new Vec2(this.x + b.x, this.y + b.y);
    }
    sub(b) {
        return new Vec2(this.x - b.x, this.y - b.y);
    }
    mul(b) {
        return new Vec2(this.x * b.x, this.y * b.y);
    }
    div(b) {
        return new Vec2(this.x / b.x, this.y / b.y);
    }
    dot(b) {
        return this.x * b.x + this.y * b.y;
    }
    lengthSq() {
        return this.dot(this);
    }
    length() {
        return Math.sqrt(this.dot(this));
    }
    normalize() {
        return this.divX(this.length());
    }
    abs() {
        return new Vec2(Math.abs(this.x), Math.abs(this.y));
    }
    sign() {
        return new Vec2(Math.sign(this.x), Math.sign(this.y));
    }
    neg() {
        return new Vec2(-this.x, -this.y);
    }
    min(b) {
        return new Vec2(Math.min(this.x, b.x), Math.min(this.y, b.y));
    }
    max(b) {
        return new Vec2(Math.max(this.x, b.x), Math.max(this.y, b.y));
    }
    clamp(min, max) {
        return new Vec2(math.clamp(this.x, min.x, max.x), math.clamp(this.y, min.y, max.y));
    }
    toString() {
        return `(${this.x},${this.y})`;
    }
    toArray() {
        return [this.x, this.y];
    }
    get xy0() {
        return new Vec3(this.x, this.y, 0);
    }
}
export class Vec3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    static inf() {
        return new Vec3(Infinity, Infinity, Infinity);
    }
    equal(b) {
        return this.x === b.x && this.y === b.y && this.z === b.z;
    }
    clone() {
        return new Vec3(this.x, this.y, this.z);
    }
    addX(x) {
        return new Vec3(this.x + x, this.y + x, this.z + x);
    }
    subX(x) {
        return new Vec3(this.x - x, this.y - x, this.z - x);
    }
    mulX(x) {
        return new Vec3(this.x * x, this.y * x, this.z * x);
    }
    divX(x) {
        return new Vec3(this.x / x, this.y / x, this.z / x);
    }
    add(b) {
        return new Vec3(this.x + b.x, this.y + b.y, this.z + b.z);
    }
    sub(b) {
        return new Vec3(this.x - b.x, this.y - b.y, this.z - b.z);
    }
    mul(b) {
        return new Vec3(this.x * b.x, this.y * b.y, this.z * b.z);
    }
    div(b) {
        return new Vec3(this.x / b.x, this.y / b.y, this.z / b.z);
    }
    dot(b) {
        return this.x * b.x + this.y * b.y + this.z * b.z;
    }
    cross(b) {
        return new Vec3(this.y * b.z - this.z * b.y, this.z * b.x - this.x * b.z, this.x * b.y - this.y * b.x);
    }
    lengthSq() {
        return this.dot(this);
    }
    length() {
        return Math.sqrt(this.dot(this));
    }
    normalize() {
        return this.divX(this.length());
    }
    abs() {
        return new Vec3(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
    }
    sign() {
        return new Vec3(Math.sign(this.x), Math.sign(this.y), Math.sign(this.z));
    }
    neg() {
        return new Vec3(-this.x, -this.y, -this.z);
    }
    min(b) {
        return new Vec3(Math.min(this.x, b.x), Math.min(this.y, b.y), Math.min(this.z, b.z));
    }
    max(b) {
        return new Vec3(Math.max(this.x, b.x), Math.max(this.y, b.y), Math.max(this.z, b.z));
    }
    clamp(min, max) {
        return new Vec3(math.clamp(this.x, min.x, max.x), math.clamp(this.y, min.y, max.y), math.clamp(this.z, min.z, max.z));
    }
    toString() {
        return `(${this.x},${this.y},${this.z})`;
    }
    toArray() {
        return [this.x, this.y, this.z];
    }
    get xy() {
        return new Vec2(this.x, this.y);
    }
    get xz() {
        return new Vec2(this.x, this.z);
    }
    get xyz0() {
        return new Vec4(this.x, this.y, this.z, 0);
    }
    get xyz1() {
        return new Vec4(this.x, this.y, this.z, 1);
    }
}
export class Vec4 {
    constructor(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
    static inf() {
        return new Vec4(Infinity, Infinity, Infinity, Infinity);
    }
    equal(b) {
        return this.x === b.x && this.y === b.y && this.z === b.z && this.w == b.w;
    }
    clone() {
        return new Vec4(this.x, this.y, this.z, this.w);
    }
    addX(x) {
        return new Vec4(this.x + x, this.y + x, this.z + x, this.w + x);
    }
    subX(x) {
        return new Vec4(this.x - x, this.y - x, this.z - x, this.w - x);
    }
    mulX(x) {
        return new Vec4(this.x * x, this.y * x, this.z * x, this.w * x);
    }
    divX(x) {
        return new Vec4(this.x / x, this.y / x, this.z / x, this.w / x);
    }
    add(b) {
        return new Vec4(this.x + b.x, this.y + b.y, this.z + b.z, this.w + b.w);
    }
    sub(b) {
        return new Vec4(this.x - b.x, this.y - b.y, this.z - b.z, this.w - b.w);
    }
    mul(b) {
        return new Vec4(this.x * b.x, this.y * b.y, this.z * b.z, this.w - b.w);
    }
    div(b) {
        return new Vec4(this.x / b.x, this.y / b.y, this.z / b.z, this.w / b.w);
    }
    dot(b) {
        return this.x * b.x + this.y * b.y + this.z * b.z + this.w * b.w;
    }
    lengthSq() {
        return this.dot(this);
    }
    length() {
        return Math.sqrt(this.dot(this));
    }
    normalize() {
        return this.divX(this.length());
    }
    abs() {
        return new Vec4(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z), Math.abs(this.w));
    }
    sign() {
        return new Vec4(Math.sign(this.x), Math.sign(this.y), Math.sign(this.z), Math.sign(this.w));
    }
    neg() {
        return new Vec4(-this.x, -this.y, -this.z, -this.w);
    }
    min(b) {
        return new Vec4(Math.min(this.x, b.x), Math.min(this.y, b.y), Math.min(this.z, b.z), Math.min(this.w, b.w));
    }
    max(b) {
        return new Vec4(Math.max(this.x, b.x), Math.max(this.y, b.y), Math.max(this.z, b.z), Math.max(this.w, b.w));
    }
    clamp(min, max) {
        return new Vec4(math.clamp(this.x, min.x, max.x), math.clamp(this.y, min.y, max.y), math.clamp(this.z, min.z, max.z), math.clamp(this.w, min.w, max.w));
    }
    toString() {
        return `(${this.x},${this.y},${this.z},${this.w})`;
    }
    toArray() {
        return [this.x, this.y, this.z, this.w];
    }
    get xy() {
        return new Vec2(this.x, this.y);
    }
    get xz() {
        return new Vec2(this.x, this.z);
    }
    get xyz() {
        return new Vec3(this.x, this.y, this.z);
    }
}
export class Mat2 {
    constructor(m11, m12, m21, m22) {
        this.m11 = m11;
        this.m12 = m12;
        this.m21 = m21;
        this.m22 = m22;
    }
    static identity() {
        return new Mat2(1, 0, 0, 1);
    }
    static rotation(theta) {
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        return new Mat2(cosTheta, -sinTheta, sinTheta, cosTheta);
    }
    equal(b) {
        return this.m11 === b.m11 && this.m12 === b.m12 && this.m21 === b.m21 && this.m11 === b.m22;
    }
    clone() {
        return new Mat2(this.m11, this.m12, this.m21, this.m22);
    }
    transpose() {
        return new Mat2(this.m11, this.m21, this.m12, this.m22);
    }
    matmul(b) {
        return new Mat2(this.m11 * b.m11 + this.m12 * b.m21, // m11,
        this.m11 * b.m12 + this.m12 * b.m22, // m12,
        this.m21 * b.m11 + this.m22 * b.m21, // m21,
        this.m21 * b.m12 + this.m22 * b.m22);
    }
    toString() {
        return `| ${this.m11} ${this.m12} |
| ${this.m21} ${this.m22} |`;
    }
    toArray() {
        return [
            this.m11, this.m12,
            this.m21, this.m22
        ];
    }
}
export class Mat3 {
    constructor(m11, m12, m13, m21, m22, m23, m31, m32, m33) {
        this.m11 = m11;
        this.m12 = m12;
        this.m13 = m13;
        this.m21 = m21;
        this.m22 = m22;
        this.m23 = m23;
        this.m31 = m31;
        this.m32 = m32;
        this.m33 = m33;
    }
    static identity() {
        return new Mat3(1, 0, 0, 0, 1, 0, 0, 0, 1);
    }
    equal(b) {
        return (this.m11 === b.m11 && this.m12 === b.m12 && this.m13 === b.m13 &&
            this.m21 === b.m21 && this.m22 === b.m22 && this.m23 === b.m23 &&
            this.m31 === b.m31 && this.m32 === b.m32 && this.m33 === b.m33);
    }
    clone() {
        return new Mat3(this.m11, this.m12, this.m13, this.m21, this.m22, this.m23, this.m31, this.m32, this.m33);
    }
    transpose() {
        return new Mat3(this.m11, this.m21, this.m31, this.m12, this.m22, this.m32, this.m13, this.m23, this.m33);
    }
    matmul(b) {
        return new Mat3(this.m11 * b.m11 + this.m12 * b.m21 + this.m13 * b.m31, // m11,
        this.m11 * b.m12 + this.m12 * b.m22 + this.m13 * b.m32, // m12,
        this.m11 * b.m13 + this.m12 * b.m23 + this.m13 * b.m33, // m13,
        this.m21 * b.m11 + this.m22 * b.m21 + this.m23 * b.m31, // m21,
        this.m21 * b.m12 + this.m22 * b.m22 + this.m23 * b.m32, // m22,
        this.m21 * b.m13 + this.m22 * b.m23 + this.m23 * b.m33, // m23,
        this.m31 * b.m11 + this.m32 * b.m21 + this.m33 * b.m31, // m31,
        this.m31 * b.m12 + this.m32 * b.m22 + this.m33 * b.m32, // m32,
        this.m31 * b.m13 + this.m32 * b.m23 + this.m33 * b.m33);
    }
    /**
     * transform the vector by the specified matrix
     * treats vector as a column matrix to left of 3x3 matrix
     * |xyz| * m
     * @param a vector
     */
    transform(a) {
        const x = a.x * this.m11 + a.y * this.m21 + a.z * this.m31;
        const y = a.x * this.m12 + a.y * this.m22 + a.z * this.m32;
        const z = a.x * this.m13 + a.y * this.m23 + a.z * this.m33;
        return new Vec3(x, y, z);
    }
    toString() {
        return `| ${this.m11} ${this.m12} ${this.m13} |
| ${this.m21} ${this.m22} ${this.m23} |
| ${this.m31} ${this.m32} ${this.m33} |`;
    }
    toArray() {
        return [
            this.m11, this.m12, this.m13,
            this.m21, this.m22, this.m23,
            this.m31, this.m32, this.m33,
        ];
    }
}
export class Mat4 {
    constructor(m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44) {
        this.m11 = m11;
        this.m12 = m12;
        this.m13 = m13;
        this.m14 = m14;
        this.m21 = m21;
        this.m22 = m22;
        this.m23 = m23;
        this.m24 = m24;
        this.m31 = m31;
        this.m32 = m32;
        this.m33 = m33;
        this.m34 = m34;
        this.m41 = m41;
        this.m42 = m42;
        this.m43 = m43;
        this.m44 = m44;
    }
    static identity() {
        return new Mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }
    static translation(a) {
        return new Mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, a.x, a.y, a.z, 1);
    }
    static rotationX(theta) {
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        return new Mat4(1, 0, 0, 0, 0, cosTheta, -sinTheta, 0, 0, sinTheta, cosTheta, 0, 0, 0, 0, 1);
    }
    static rotationY(theta) {
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        return new Mat4(cosTheta, 0, sinTheta, 0, 0, 1, 0, 0, -sinTheta, 0, cosTheta, 0, 0, 0, 0, 1);
    }
    static rotationZ(theta) {
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        return new Mat4(cosTheta, -sinTheta, 0, 0, sinTheta, cosTheta, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }
    static rotation_axis(axis, theta) {
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        const { x, y, z } = axis;
        const xSinTheta = x * sinTheta;
        const ySinTheta = y * sinTheta;
        const zSinTheta = z * sinTheta;
        const oneMinusCosTheta = 1 - cosTheta;
        return new Mat4(cosTheta + x * x * oneMinusCosTheta, x * y * oneMinusCosTheta - zSinTheta, x * z * oneMinusCosTheta + ySinTheta, 0, y * x * oneMinusCosTheta + zSinTheta, cosTheta + y * y * oneMinusCosTheta, y * z * oneMinusCosTheta - xSinTheta, 0, z * x * oneMinusCosTheta - ySinTheta, z * y * oneMinusCosTheta + xSinTheta, cosTheta + z * z * oneMinusCosTheta, 0, 0, 0, 0, 1);
    }
    static scaling(xyz) {
        return new Mat4(xyz.x, 0, 0, 0, 0, xyz.y, 0, 0, 0, 0, xyz.z, 0, 0, 0, 0, 1);
    }
    /**
     * create a webgl perspective matrix
     * @param fovY y fov (radians)
     * @param aspect aspect ratio
     * @param nearZ near z coordinate
     * @param farZ far z coordinate
     */
    static perspective(fovY, aspect, nearZ, farZ) {
        const f = Math.tan(Math.PI * 0.5 - 0.5 * fovY);
        const invRange = 1 / (nearZ - farZ);
        return new Mat4(f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (nearZ + farZ) * invRange, -1, 0, 0, nearZ * farZ * invRange * 2, 0);
    }
    /**
     * construct a look at matrix that places the camera at the eye point, looking at the specified target
     * invert for a "view" matrix
     * @param eye eye position
     * @param target target position
     * @param up up axis
     */
    static lookAt(eye, target, up) {
        const zAxis = eye.sub(target).normalize();
        const xAxis = up.cross(zAxis);
        const yAxis = zAxis.cross(xAxis);
        return Mat4.basis(xAxis, yAxis, zAxis, eye);
    }
    static basis(xAxis, yAxis, zAxis, translation) {
        return new Mat4(xAxis.x, xAxis.y, xAxis.z, 0, yAxis.x, yAxis.y, yAxis.z, 0, zAxis.x, zAxis.y, zAxis.z, 0, translation.x, translation.y, translation.z, 1);
    }
    equal(b) {
        return (this.m11 === b.m11 && this.m12 === b.m12 && this.m13 === b.m13 && this.m14 === b.m14 &&
            this.m21 === b.m21 && this.m22 === b.m22 && this.m23 === b.m23 && this.m24 === b.m24 &&
            this.m31 === b.m31 && this.m32 === b.m32 && this.m33 === b.m33 && this.m34 === b.m34 &&
            this.m41 === b.m41 && this.m42 === b.m42 && this.m43 === b.m43 && this.m44 === b.m44);
    }
    clone() {
        return new Mat4(this.m11, this.m12, this.m13, this.m14, this.m21, this.m22, this.m23, this.m24, this.m31, this.m32, this.m33, this.m34, this.m41, this.m42, this.m43, this.m44);
    }
    transpose() {
        return new Mat4(this.m11, this.m21, this.m31, this.m41, this.m12, this.m22, this.m32, this.m42, this.m13, this.m23, this.m33, this.m43, this.m14, this.m24, this.m34, this.m44);
    }
    matmul(b) {
        return new Mat4(this.m11 * b.m11 + this.m12 * b.m21 + this.m13 * b.m31 + this.m14 * b.m41, // m11
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
        this.m41 * b.m14 + this.m42 * b.m24 + this.m43 * b.m34 + this.m44 * b.m44);
    }
    /**
     * transform the vector by the specified matrix
     * treats vector as a column matrix to left of 4x4 matrix
     * projects back to w = 1 space after multiplication
     * |xyz1| * m
     * @param a vector
     */
    transform3(a) {
        const w = a.x * this.m14 + a.y * this.m24 + a.z * this.m34 + this.m44;
        const invW = 1 / w;
        const x = (a.x * this.m11 + a.y * this.m21 + a.z * this.m31 + this.m41) * invW;
        const y = (a.x * this.m12 + a.y * this.m22 + a.z * this.m32 + this.m42) * invW;
        const z = (a.x * this.m13 + a.y * this.m23 + a.z * this.m33 + this.m43) * invW;
        return new Vec3(x, y, z);
    }
    /**
     * transform a vector using matrix multiplication
     * treats vector as a column vector in multiplication |xyzw| * m
     * @param a vector
     */
    transform4(a) {
        const x = a.x * this.m11 + a.y * this.m21 + a.z * this.m31 + a.w * this.m41;
        const y = a.x * this.m12 + a.y * this.m22 + a.z * this.m32 + a.w * this.m42;
        const z = a.x * this.m13 + a.y * this.m23 + a.z * this.m33 + a.w * this.m43;
        const w = a.x * this.m14 + a.y * this.m24 + a.z * this.m34 + a.w * this.m44;
        return new Vec4(x, y, z, w);
    }
    invert() {
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
            throw new Error("Can't invert");
        }
        return new Mat4((this.m22 * c5 - this.m23 * c4 + this.m24 * c3) / det, (-this.m12 * c5 + this.m13 * c4 - this.m14 * c3) / det, (this.m42 * s5 - this.m43 * s4 + this.m44 * s3) / det, (-this.m32 * s5 + this.m33 * s4 - this.m34 * s3) / det, (-this.m21 * c5 + this.m23 * c2 - this.m24 * c1) / det, (this.m11 * c5 - this.m13 * c2 + this.m14 * c1) / det, (-this.m41 * s5 + this.m43 * s2 - this.m44 * s1) / det, (this.m31 * s5 - this.m33 * s2 + this.m34 * s1) / det, (this.m21 * c4 - this.m22 * c2 + this.m24 * c0) / det, (-this.m11 * c4 + this.m12 * c2 - this.m14 * c0) / det, (this.m41 * s4 - this.m42 * s2 + this.m44 * s0) / det, (-this.m31 * s4 + this.m32 * s2 - this.m34 * s0) / det, (-this.m21 * c3 + this.m22 * c1 - this.m23 * c0) / det, (this.m11 * c3 - this.m12 * c1 + this.m13 * c0) / det, (-this.m41 * s3 + this.m42 * s1 - this.m43 * s0) / det, (this.m31 * s3 - this.m32 * s1 + this.m33 * s0) / det);
    }
    toMat3() {
        return new Mat3(this.m11, this.m12, this.m13, this.m21, this.m22, this.m23, this.m31, this.m32, this.m33);
    }
    toString() {
        return `| ${this.m11} ${this.m12} ${this.m13} ${this.m14} |
| ${this.m21} ${this.m22} ${this.m23} ${this.m24} |
| ${this.m31} ${this.m32} ${this.m33} ${this.m34} |
| ${this.m41} ${this.m42} ${this.m43} ${this.m44} |`;
    }
    toArray() {
        return [
            this.m11, this.m12, this.m13, this.m14,
            this.m21, this.m22, this.m23, this.m24,
            this.m31, this.m32, this.m33, this.m34,
            this.m41, this.m42, this.m43, this.m44,
        ];
    }
}
export class AABB {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }
    static fromPoints(pts) {
        let min = Vec3.inf();
        let max = min.neg();
        for (const pt of pts) {
            min = min.min(pt);
            max = max.max(pt);
        }
        const aabb = new AABB(min, max);
        return aabb;
    }
    static fromHalfExtents(halfExtents) {
        return new AABB(halfExtents.neg(), halfExtents);
    }
    static fromPositionHalfExtents(position, halfExtents) {
        return new AABB(position.sub(halfExtents), position.add(halfExtents));
    }
    static fromCoords(minX, minY, minZ, maxX, maxY, maxZ) {
        return new AABB(new Vec3(minX, minY, minZ), new Vec3(maxX, maxY, maxZ));
    }
    get extents() {
        return this.max.sub(this.min);
    }
    union(aabb) {
        const u = new AABB(this.min.min(aabb.min), this.max.max(aabb.max));
        return u;
    }
    intersection(aabb) {
        const ix = new AABB(this.min.max(aabb.min), this.max.min(aabb.max));
        return ix;
    }
    overlaps(aabb) {
        return (this.max.x >= aabb.min.x &&
            this.max.y >= aabb.min.y &&
            this.max.z >= aabb.min.z &&
            this.min.x <= aabb.max.x &&
            this.min.y <= aabb.max.y &&
            this.min.z <= aabb.max.z);
    }
    contains(pt) {
        return (pt.x >= this.min.x &&
            pt.y >= this.min.y &&
            pt.z >= this.min.z &&
            pt.x < this.max.x &&
            pt.y < this.max.y &&
            pt.z < this.max.z);
    }
    translate(offset) {
        return new AABB(this.min.add(offset), this.max.add(offset));
    }
    scale(s) {
        return new AABB(this.min.mulX(s), this.max.mulX(s));
    }
    buffer(padding) {
        const aabb = new AABB(this.min.addX(-padding), this.max.addX(padding));
        return aabb;
    }
    shrink(amount) {
        return this.buffer(-amount);
    }
    clone() {
        return new AABB(this.min.clone(), this.max.clone());
    }
}
export class Ray {
    constructor(orig, dir) {
        this.orig = orig;
        this.dir = dir;
    }
    /**
     * normalize ray direction
     */
    normalize() {
        return new Ray(this.orig, this.dir.normalize());
    }
    /**
     * transform ray by specified matrix
     * @param mat matrix
     */
    transform(mat) {
        const orig = mat.transform3(this.orig);
        const dest = mat.transform3(this.orig.add(this.dir));
        const ray = Ray.fromOrigDest(orig, dest);
        return ray;
    }
    /**
     * cast ray against plane, optional return value because it may not intersect
     * if plane is parallel with ray, will return Infinity
     * @param plane plane to cast ray against
     */
    cast(plane) {
        const d = plane.normal.dot(this.dir);
        const t = plane.center().sub(this.orig).dot(plane.normal) / d;
        return t;
    }
    /**
     * interpolate along ray
     * @param t t value (0 = origin, 1 = origin + dir)
     */
    lerp(t) {
        return this.orig.add(this.dir.mulX(t));
    }
    /**
     * convert to string
     */
    toString() {
        return `orig: ${this.orig} dir: ${this.dir}`;
    }
    /**
     * construct plane from origin and destination
     * @param orig orig point
     * @param dest destination point
     */
    static fromOrigDest(orig, dest) {
        const dir = dest.sub(orig).normalize();
        return new Ray(orig, dir);
    }
}
export class Plane {
    constructor(normal, d) {
        this.normal = normal;
        this.d = d;
    }
    /**
     * construct a plane from point and normal
     * @param pt point on plane
     * @param n plane normal
     */
    static fromPointNormal(pt, n) {
        n = n.normalize();
        return new Plane(n, pt.dot(n));
    }
    /**
     * construct a plane from three points, points are assumed to be specified in CCW order
     * @param a 1st point
     * @param b 2nd point
     * @param c 3rd point
     */
    static fromPoints(a, b, c) {
        const n = b.sub(a).cross(c.sub(a)).normalize();
        const d = a.dot(b);
        return new Plane(n, d);
    }
    /**
     * returns normalized plane
     */
    normalize() {
        const len = this.normal.length();
        return new Plane(this.normal.divX(len), this.d / len);
    }
    /**
     * returns the "center" of the plane - the point described by the normal and distance
     */
    center() {
        return this.normal.mulX(this.d);
    }
    /**
     * calculate signed distance from plane to point
     * positive distance indicates pt is in-front of plane
     * negative distance indicates pt is behind plane
     * @param pt point
     */
    distanceTo(pt) {
        return this.normal.dot(pt) - this.d;
    }
    /**
     * transform plane by matrix
     * @param mat matrix
     */
    transform(mat) {
        const center = mat.transform3(this.center());
        const normal = mat.toMat3().transform(this.normal);
        return Plane.fromPointNormal(center, normal);
    }
    toString() {
        return `${this.normal} ${this.d}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VvM2QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZW8zZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBRXpDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLElBQUk7SUFDYixZQUFtQixDQUFTLEVBQVMsQ0FBUztRQUEzQixNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQVMsTUFBQyxHQUFELENBQUMsQ0FBUTtJQUFJLENBQUM7SUFFbkQsTUFBTSxDQUFDLEdBQUc7UUFDTixPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsS0FBSyxDQUFDLENBQU87UUFDVCxPQUFPLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBUztRQUNWLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFTO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBUztRQUNWLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDdEMsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVELE1BQU07UUFDRixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxTQUFTO1FBQ0wsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxHQUFHO1FBQ0MsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxJQUFJO1FBQ0EsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFFRCxHQUFHO1FBQ0MsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBUyxFQUFFLEdBQVM7UUFDdEIsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDdkYsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUE7SUFDbEMsQ0FBQztJQUVELE9BQU87UUFDSCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVELElBQUksR0FBRztRQUNILE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxJQUFJO0lBQ2IsWUFBbUIsQ0FBUyxFQUFTLENBQVMsRUFBUyxDQUFTO1FBQTdDLE1BQUMsR0FBRCxDQUFDLENBQVE7UUFBUyxNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQVMsTUFBQyxHQUFELENBQUMsQ0FBUTtJQUFJLENBQUM7SUFFckUsTUFBTSxDQUFDLEdBQUc7UUFDTixPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUVELEtBQUssQ0FBQyxDQUFPO1FBQ1QsT0FBTyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFTO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBUztRQUNWLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVELEtBQUssQ0FBQyxDQUFPO1FBQ1QsT0FBTyxJQUFJLElBQUksQ0FDWCxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUMzQixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUMzQixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVELE1BQU07UUFDRixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxTQUFTO1FBQ0wsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxHQUFHO1FBQ0MsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFRCxJQUFJO1FBQ0EsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzVFLENBQUM7SUFFRCxHQUFHO1FBQ0MsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN4RixDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDeEYsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFTLEVBQUUsR0FBUztRQUN0QixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDekgsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsT0FBTztRQUNILE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLEVBQUU7UUFDRixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLEVBQUU7UUFDRixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDSixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDSixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzlDLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxJQUFJO0lBQ2IsWUFBbUIsQ0FBUyxFQUFTLENBQVMsRUFBUyxDQUFTLEVBQVMsQ0FBUztRQUEvRCxNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQVMsTUFBQyxHQUFELENBQUMsQ0FBUTtRQUFTLE1BQUMsR0FBRCxDQUFDLENBQVE7UUFBUyxNQUFDLEdBQUQsQ0FBQyxDQUFRO0lBQUksQ0FBQztJQUV2RixNQUFNLENBQUMsR0FBRztRQUNOLE9BQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDM0QsQ0FBQztJQUVELEtBQUssQ0FBQyxDQUFPO1FBQ1QsT0FBTyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDOUUsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFTO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBUztRQUNWLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNFLENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0lBRUQsUUFBUTtRQUNKLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN6QixDQUFDO0lBRUQsTUFBTTtRQUNGLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELFNBQVM7UUFDTCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELEdBQUc7UUFDQyxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0YsQ0FBQztJQUVELElBQUk7UUFDQSxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0YsQ0FBQztJQUVELEdBQUc7UUFDQyxPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQy9HLENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQy9HLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBUyxFQUFFLEdBQVM7UUFDdEIsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzSixDQUFDO0lBRUQsUUFBUTtRQUNKLE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUE7SUFDdEQsQ0FBQztJQUVELE9BQU87UUFDSCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxJQUFJLEVBQUU7UUFDRixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLEVBQUU7UUFDRixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLEdBQUc7UUFDSCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENB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RUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQzVCLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELFNBQVM7UUFDTCxPQUFPLElBQUksSUFBSSxDQUNYLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUM1QixJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFDNUIsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsTUFBTSxDQUFDLENBQU87UUFDVixPQUFPLElBQUksSUFBSSxDQUNYLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU87UUFDL0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTztRQUMvRCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPO1FBQy9ELElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU87UUFDL0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTztRQUMvRCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPO1FBQy9ELElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU87UUFDL0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTztRQUMvRCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FDekQsQ0FBQTtJQUNMLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQVMsQ0FBQyxDQUFPO1FBQ2IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7UUFDMUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJ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S0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUc7WUFDcEYsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRztZQUNwRixJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHO1lBQ3BGLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzdGLENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLElBQUksQ0FDWCxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELFNBQVM7UUFDTCxPQUFPLElBQUksSUFBSSxDQUNYLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQ3RDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQ3RDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQ3RDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsTUFBTSxDQUFDLENBQU87UUFDVixPQUFPLElBQUksSUFBSSxDQUNYLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FDNUUsQ0FBQTtJQUNMLENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSCxVQUFVLENBQUMsQ0FBTztRQUNkLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7UUFDckUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUE7UUFDOUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFBO1FBQzlFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQTtRQUM5RSxPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDNUIsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxVQUFVLENBQUMsQ0FBTztRQUNkLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQTtRQUMzRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7UUFDM0UsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQTtRQUMzRSxPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQy9CLENBQUM7SUFFRCxNQUFNO1FBQ0YsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFFdEUsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFO1lBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQTtTQUNsQztRQUVELE9BQU8sSUFBSSxJQUFJLENBQ1gsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQzVOLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUM1TixDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFDNU4sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQy9OLENBQUE7SUFDTCxDQUFDO0lBRUQsTUFBTTtRQUNGLE9BQU8sSUFBSSxJQUFJLENBQ1gsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQzVCLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUM1QixJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FDL0IsQ0FBQTtJQUNMLENBQUM7SUFFRCxRQUFRO1FBQ0osT0FBTyxLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHO0lBQzVELElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHO0lBQzVDLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHO0lBQzVDLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQTtJQUNoRCxDQUFDO0lBRUQsT0FBTztRQUNILE9BQU87WUFDSCxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztZQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztZQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxD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QUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2xELE9BQU8sS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUE7SUFDckMsQ0FBQztDQUNKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgbWF0aCBmcm9tIFwiLi4vc2hhcmVkL21hdGguanNcIlxyXG5cclxuLyoqXHJcbiAqIDNkIG1hdGggbGlicmFyeVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFZlYzIge1xyXG4gICAgY29uc3RydWN0b3IocHVibGljIHg6IG51bWJlciwgcHVibGljIHk6IG51bWJlcikgeyB9XHJcblxyXG4gICAgc3RhdGljIGluZigpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIoSW5maW5pdHksIEluZmluaXR5KVxyXG4gICAgfVxyXG5cclxuICAgIGVxdWFsKGI6IFZlYzIpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy54ID09PSBiLnggJiYgdGhpcy55ID09PSBiLnlcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54LCB0aGlzLnkpXHJcbiAgICB9XHJcblxyXG4gICAgYWRkWCh4OiBudW1iZXIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54ICsgeCwgdGhpcy55ICsgeClcclxuICAgIH1cclxuXHJcbiAgICBzdWJYKHg6IG51bWJlcik6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzLnggLSB4LCB0aGlzLnkgLSB4KVxyXG4gICAgfVxyXG5cclxuICAgIG11bFgoeDogbnVtYmVyKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCAqIHgsIHRoaXMueSAqIHgpXHJcbiAgICB9XHJcblxyXG4gICAgZGl2WCh4OiBudW1iZXIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54IC8geCwgdGhpcy55IC8geClcclxuICAgIH1cclxuXHJcbiAgICBhZGQoYjogVmVjMik6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzLnggKyBiLngsIHRoaXMueSArIGIueSlcclxuICAgIH1cclxuXHJcbiAgICBzdWIoYjogVmVjMik6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzLnggLSBiLngsIHRoaXMueSAtIGIueSlcclxuICAgIH1cclxuXHJcbiAgICBtdWwoYjogVmVjMik6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzLnggKiBiLngsIHRoaXMueSAqIGIueSlcclxuICAgIH1cclxuXHJcbiAgICBkaXYoYjogVmVjMik6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzLnggLyBiLngsIHRoaXMueSAvIGIueSlcclxuICAgIH1cclxuXHJcbiAgICBkb3QoYjogVmVjMik6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCAqIGIueCArIHRoaXMueSAqIGIueVxyXG4gICAgfVxyXG5cclxuICAgIGxlbmd0aFNxKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZG90KHRoaXMpXHJcbiAgICB9XHJcblxyXG4gICAgbGVuZ3RoKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmRvdCh0aGlzKSlcclxuICAgIH1cclxuXHJcbiAgICBub3JtYWxpemUoKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZGl2WCh0aGlzLmxlbmd0aCgpKVxyXG4gICAgfVxyXG5cclxuICAgIGFicygpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIoTWF0aC5hYnModGhpcy54KSwgTWF0aC5hYnModGhpcy55KSlcclxuICAgIH1cclxuXHJcbiAgICBzaWduKCk6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMihNYXRoLnNpZ24odGhpcy54KSwgTWF0aC5zaWduKHRoaXMueSkpXHJcbiAgICB9XHJcblxyXG4gICAgbmVnKCk6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMigtdGhpcy54LCAtdGhpcy55KVxyXG4gICAgfVxyXG5cclxuICAgIG1pbihiOiBWZWMyKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKE1hdGgubWluKHRoaXMueCwgYi54KSwgTWF0aC5taW4odGhpcy55LCBiLnkpKVxyXG4gICAgfVxyXG5cclxuICAgIG1heChiOiBWZWMyKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKE1hdGgubWF4KHRoaXMueCwgYi54KSwgTWF0aC5tYXgodGhpcy55LCBiLnkpKVxyXG4gICAgfVxyXG5cclxuICAgIGNsYW1wKG1pbjogVmVjMiwgbWF4OiBWZWMyKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKG1hdGguY2xhbXAodGhpcy54LCBtaW4ueCwgbWF4LngpLCBtYXRoLmNsYW1wKHRoaXMueSwgbWluLnksIG1heC55KSlcclxuICAgIH1cclxuXHJcbiAgICB0b1N0cmluZygpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBgKCR7dGhpcy54fSwke3RoaXMueX0pYFxyXG4gICAgfVxyXG5cclxuICAgIHRvQXJyYXkoKTogbnVtYmVyW10ge1xyXG4gICAgICAgIHJldHVybiBbdGhpcy54LCB0aGlzLnldXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHh5MCgpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54LCB0aGlzLnksIDApXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBWZWMzIHtcclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyB4OiBudW1iZXIsIHB1YmxpYyB5OiBudW1iZXIsIHB1YmxpYyB6OiBudW1iZXIpIHsgfVxyXG5cclxuICAgIHN0YXRpYyBpbmYoKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKEluZmluaXR5LCBJbmZpbml0eSwgSW5maW5pdHkpXHJcbiAgICB9XHJcblxyXG4gICAgZXF1YWwoYjogVmVjMyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnggPT09IGIueCAmJiB0aGlzLnkgPT09IGIueSAmJiB0aGlzLnogPT09IGIuelxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzLngsIHRoaXMueSwgdGhpcy56KVxyXG4gICAgfVxyXG5cclxuICAgIGFkZFgoeDogbnVtYmVyKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXMueCArIHgsIHRoaXMueSArIHgsIHRoaXMueiArIHgpXHJcbiAgICB9XHJcblxyXG4gICAgc3ViWCh4OiBudW1iZXIpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54IC0geCwgdGhpcy55IC0geCwgdGhpcy56IC0geClcclxuICAgIH1cclxuXHJcbiAgICBtdWxYKHg6IG51bWJlcik6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzLnggKiB4LCB0aGlzLnkgKiB4LCB0aGlzLnogKiB4KVxyXG4gICAgfVxyXG5cclxuICAgIGRpdlgoeDogbnVtYmVyKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXMueCAvIHgsIHRoaXMueSAvIHgsIHRoaXMueiAvIHgpXHJcbiAgICB9XHJcblxyXG4gICAgYWRkKGI6IFZlYzMpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54ICsgYi54LCB0aGlzLnkgKyBiLnksIHRoaXMueiArIGIueilcclxuICAgIH1cclxuXHJcbiAgICBzdWIoYjogVmVjMyk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzLnggLSBiLngsIHRoaXMueSAtIGIueSwgdGhpcy56IC0gYi56KVxyXG4gICAgfVxyXG5cclxuICAgIG11bChiOiBWZWMzKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXMueCAqIGIueCwgdGhpcy55ICogYi55LCB0aGlzLnogKiBiLnopXHJcbiAgICB9XHJcblxyXG4gICAgZGl2KGI6IFZlYzMpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54IC8gYi54LCB0aGlzLnkgLyBiLnksIHRoaXMueiAvIGIueilcclxuICAgIH1cclxuXHJcbiAgICBkb3QoYjogVmVjMyk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCAqIGIueCArIHRoaXMueSAqIGIueSArIHRoaXMueiAqIGIuelxyXG4gICAgfVxyXG5cclxuICAgIGNyb3NzKGI6IFZlYzMpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzMoXHJcbiAgICAgICAgICAgIHRoaXMueSAqIGIueiAtIHRoaXMueiAqIGIueSxcclxuICAgICAgICAgICAgdGhpcy56ICogYi54IC0gdGhpcy54ICogYi56LFxyXG4gICAgICAgICAgICB0aGlzLnggKiBiLnkgLSB0aGlzLnkgKiBiLngpXHJcbiAgICB9XHJcblxyXG4gICAgbGVuZ3RoU3EoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kb3QodGhpcylcclxuICAgIH1cclxuXHJcbiAgICBsZW5ndGgoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMuZG90KHRoaXMpKVxyXG4gICAgfVxyXG5cclxuICAgIG5vcm1hbGl6ZSgpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kaXZYKHRoaXMubGVuZ3RoKCkpXHJcbiAgICB9XHJcblxyXG4gICAgYWJzKCk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyhNYXRoLmFicyh0aGlzLngpLCBNYXRoLmFicyh0aGlzLnkpLCBNYXRoLmFicyh0aGlzLnopKVxyXG4gICAgfVxyXG5cclxuICAgIHNpZ24oKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKE1hdGguc2lnbih0aGlzLngpLCBNYXRoLnNpZ24odGhpcy55KSwgTWF0aC5zaWduKHRoaXMueikpXHJcbiAgICB9XHJcblxyXG4gICAgbmVnKCk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMygtdGhpcy54LCAtdGhpcy55LCAtdGhpcy56KVxyXG4gICAgfVxyXG5cclxuICAgIG1pbihiOiBWZWMzKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKE1hdGgubWluKHRoaXMueCwgYi54KSwgTWF0aC5taW4odGhpcy55LCBiLnkpLCBNYXRoLm1pbih0aGlzLnosIGIueikpXHJcbiAgICB9XHJcblxyXG4gICAgbWF4KGI6IFZlYzMpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzMoTWF0aC5tYXgodGhpcy54LCBiLngpLCBNYXRoLm1heCh0aGlzLnksIGIueSksIE1hdGgubWF4KHRoaXMueiwgYi56KSlcclxuICAgIH1cclxuXHJcbiAgICBjbGFtcChtaW46IFZlYzMsIG1heDogVmVjMyk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyhtYXRoLmNsYW1wKHRoaXMueCwgbWluLngsIG1heC54KSwgbWF0aC5jbGFtcCh0aGlzLnksIG1pbi55LCBtYXgueSksIG1hdGguY2xhbXAodGhpcy56LCBtaW4ueiwgbWF4LnopKVxyXG4gICAgfVxyXG5cclxuICAgIHRvU3RyaW5nKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGAoJHt0aGlzLnh9LCR7dGhpcy55fSwke3RoaXMuen0pYFxyXG4gICAgfVxyXG5cclxuICAgIHRvQXJyYXkoKTogbnVtYmVyW10ge1xyXG4gICAgICAgIHJldHVybiBbdGhpcy54LCB0aGlzLnksIHRoaXMuel1cclxuICAgIH1cclxuXHJcbiAgICBnZXQgeHkoKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCwgdGhpcy55KVxyXG4gICAgfVxyXG5cclxuICAgIGdldCB4eigpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54LCB0aGlzLnopXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHh5ejAoKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXMueCwgdGhpcy55LCB0aGlzLnosIDApXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHh5ejEoKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXMueCwgdGhpcy55LCB0aGlzLnosIDEpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBWZWM0IHtcclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyB4OiBudW1iZXIsIHB1YmxpYyB5OiBudW1iZXIsIHB1YmxpYyB6OiBudW1iZXIsIHB1YmxpYyB3OiBudW1iZXIpIHsgfVxyXG5cclxuICAgIHN0YXRpYyBpbmYoKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KEluZmluaXR5LCBJbmZpbml0eSwgSW5maW5pdHksIEluZmluaXR5KVxyXG4gICAgfVxyXG5cclxuICAgIGVxdWFsKGI6IFZlYzQpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy54ID09PSBiLnggJiYgdGhpcy55ID09PSBiLnkgJiYgdGhpcy56ID09PSBiLnogJiYgdGhpcy53ID09IGIud1xyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLngsIHRoaXMueSwgdGhpcy56LCB0aGlzLncpXHJcbiAgICB9XHJcblxyXG4gICAgYWRkWCh4OiBudW1iZXIpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpcy54ICsgeCwgdGhpcy55ICsgeCwgdGhpcy56ICsgeCwgdGhpcy53ICsgeClcclxuICAgIH1cclxuXHJcbiAgICBzdWJYKHg6IG51bWJlcik6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLnggLSB4LCB0aGlzLnkgLSB4LCB0aGlzLnogLSB4LCB0aGlzLncgLSB4KVxyXG4gICAgfVxyXG5cclxuICAgIG11bFgoeDogbnVtYmVyKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXMueCAqIHgsIHRoaXMueSAqIHgsIHRoaXMueiAqIHgsIHRoaXMudyAqIHgpXHJcbiAgICB9XHJcblxyXG4gICAgZGl2WCh4OiBudW1iZXIpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpcy54IC8geCwgdGhpcy55IC8geCwgdGhpcy56IC8geCwgdGhpcy53IC8geClcclxuICAgIH1cclxuXHJcbiAgICBhZGQoYjogVmVjNCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLnggKyBiLngsIHRoaXMueSArIGIueSwgdGhpcy56ICsgYi56LCB0aGlzLncgKyBiLncpXHJcbiAgICB9XHJcblxyXG4gICAgc3ViKGI6IFZlYzQpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpcy54IC0gYi54LCB0aGlzLnkgLSBiLnksIHRoaXMueiAtIGIueiwgdGhpcy53IC0gYi53KVxyXG4gICAgfVxyXG5cclxuICAgIG11bChiOiBWZWM0KTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXMueCAqIGIueCwgdGhpcy55ICogYi55LCB0aGlzLnogKiBiLnosIHRoaXMudyAtIGIudylcclxuICAgIH1cclxuXHJcbiAgICBkaXYoYjogVmVjNCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLnggLyBiLngsIHRoaXMueSAvIGIueSwgdGhpcy56IC8gYi56LCB0aGlzLncgLyBiLncpXHJcbiAgICB9XHJcblxyXG4gICAgZG90KGI6IFZlYzQpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnggKiBiLnggKyB0aGlzLnkgKiBiLnkgKyB0aGlzLnogKiBiLnogKyB0aGlzLncgKiBiLndcclxuICAgIH1cclxuXHJcbiAgICBsZW5ndGhTcSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRvdCh0aGlzKVxyXG4gICAgfVxyXG5cclxuICAgIGxlbmd0aCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5kb3QodGhpcykpXHJcbiAgICB9XHJcblxyXG4gICAgbm9ybWFsaXplKCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRpdlgodGhpcy5sZW5ndGgoKSlcclxuICAgIH1cclxuXHJcbiAgICBhYnMoKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KE1hdGguYWJzKHRoaXMueCksIE1hdGguYWJzKHRoaXMueSksIE1hdGguYWJzKHRoaXMueiksIE1hdGguYWJzKHRoaXMudykpXHJcbiAgICB9XHJcblxyXG4gICAgc2lnbigpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQoTWF0aC5zaWduKHRoaXMueCksIE1hdGguc2lnbih0aGlzLnkpLCBNYXRoLnNpZ24odGhpcy56KSwgTWF0aC5zaWduKHRoaXMudykpXHJcbiAgICB9XHJcblxyXG4gICAgbmVnKCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCgtdGhpcy54LCAtdGhpcy55LCAtdGhpcy56LCAtdGhpcy53KVxyXG4gICAgfVxyXG5cclxuICAgIG1pbihiOiBWZWM0KTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KE1hdGgubWluKHRoaXMueCwgYi54KSwgTWF0aC5taW4odGhpcy55LCBiLnkpLCBNYXRoLm1pbih0aGlzLnosIGIueiksIE1hdGgubWluKHRoaXMudywgYi53KSlcclxuICAgIH1cclxuXHJcbiAgICBtYXgoYjogVmVjNCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNChNYXRoLm1heCh0aGlzLngsIGIueCksIE1hdGgubWF4KHRoaXMueSwgYi55KSwgTWF0aC5tYXgodGhpcy56LCBiLnopLCBNYXRoLm1heCh0aGlzLncsIGIudykpXHJcbiAgICB9XHJcblxyXG4gICAgY2xhbXAobWluOiBWZWM0LCBtYXg6IFZlYzQpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQobWF0aC5jbGFtcCh0aGlzLngsIG1pbi54LCBtYXgueCksIG1hdGguY2xhbXAodGhpcy55LCBtaW4ueSwgbWF4LnkpLCBtYXRoLmNsYW1wKHRoaXMueiwgbWluLnosIG1heC56KSwgbWF0aC5jbGFtcCh0aGlzLncsIG1pbi53LCBtYXgudykpXHJcbiAgICB9XHJcblxyXG4gICAgdG9TdHJpbmcoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gYCgke3RoaXMueH0sJHt0aGlzLnl9LCR7dGhpcy56fSwke3RoaXMud30pYFxyXG4gICAgfVxyXG5cclxuICAgIHRvQXJyYXkoKTogbnVtYmVyW10ge1xyXG4gICAgICAgIHJldHVybiBbdGhpcy54LCB0aGlzLnksIHRoaXMueiwgdGhpcy53XVxyXG4gICAgfVxyXG5cclxuICAgIGdldCB4eSgpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54LCB0aGlzLnkpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHh6KCk6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzLngsIHRoaXMueilcclxuICAgIH1cclxuXHJcbiAgICBnZXQgeHl6KCk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzLngsIHRoaXMueSwgdGhpcy56KVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0MiB7XHJcbiAgICBzdGF0aWMgaWRlbnRpdHkoKTogTWF0MiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQyKDEsIDAsIDAsIDEpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHJvdGF0aW9uKHRoZXRhOiBudW1iZXIpOiBNYXQyIHtcclxuICAgICAgICBjb25zdCBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKVxyXG4gICAgICAgIGNvbnN0IGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpXHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQyKGNvc1RoZXRhLCAtc2luVGhldGEsIHNpblRoZXRhLCBjb3NUaGV0YSlcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICBwdWJsaWMgbTExOiBudW1iZXIsIHB1YmxpYyBtMTI6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgbTIxOiBudW1iZXIsIHB1YmxpYyBtMjI6IG51bWJlcikgeyB9XHJcblxyXG4gICAgZXF1YWwoYjogTWF0Mik6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm0xMSA9PT0gYi5tMTEgJiYgdGhpcy5tMTIgPT09IGIubTEyICYmIHRoaXMubTIxID09PSBiLm0yMSAmJiB0aGlzLm0xMSA9PT0gYi5tMjJcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBNYXQyIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDIodGhpcy5tMTEsIHRoaXMubTEyLCB0aGlzLm0yMSwgdGhpcy5tMjIpXHJcbiAgICB9XHJcblxyXG4gICAgdHJhbnNwb3NlKCk6IE1hdDIge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0Mih0aGlzLm0xMSwgdGhpcy5tMjEsIHRoaXMubTEyLCB0aGlzLm0yMilcclxuICAgIH1cclxuXHJcbiAgICBtYXRtdWwoYjogTWF0Mik6IE1hdDIge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0MihcclxuICAgICAgICAgICAgdGhpcy5tMTEgKiBiLm0xMSArIHRoaXMubTEyICogYi5tMjEsIC8vIG0xMSxcclxuICAgICAgICAgICAgdGhpcy5tMTEgKiBiLm0xMiArIHRoaXMubTEyICogYi5tMjIsIC8vIG0xMixcclxuICAgICAgICAgICAgdGhpcy5tMjEgKiBiLm0xMSArIHRoaXMubTIyICogYi5tMjEsIC8vIG0yMSxcclxuICAgICAgICAgICAgdGhpcy5tMjEgKiBiLm0xMiArIHRoaXMubTIyICogYi5tMjIsIC8vIG0yMixcclxuICAgICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgdG9TdHJpbmcoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gYHwgJHt0aGlzLm0xMX0gJHt0aGlzLm0xMn0gfFxyXG58ICR7dGhpcy5tMjF9ICR7dGhpcy5tMjJ9IHxgXHJcbiAgICB9XHJcblxyXG4gICAgdG9BcnJheSgpOiBudW1iZXJbXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgdGhpcy5tMTEsIHRoaXMubTEyLFxyXG4gICAgICAgICAgICB0aGlzLm0yMSwgdGhpcy5tMjJcclxuICAgICAgICBdXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXQzIHtcclxuICAgIHN0YXRpYyBpZGVudGl0eSgpOiBNYXQzIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDMoXHJcbiAgICAgICAgICAgIDEsIDAsIDAsXHJcbiAgICAgICAgICAgIDAsIDEsIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIDEpXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgcHVibGljIG0xMTogbnVtYmVyLCBwdWJsaWMgbTEyOiBudW1iZXIsIHB1YmxpYyBtMTM6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgbTIxOiBudW1iZXIsIHB1YmxpYyBtMjI6IG51bWJlciwgcHVibGljIG0yMzogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyBtMzE6IG51bWJlciwgcHVibGljIG0zMjogbnVtYmVyLCBwdWJsaWMgbTMzOiBudW1iZXIpIHsgfVxyXG5cclxuICAgIGVxdWFsKGI6IE1hdDMpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICB0aGlzLm0xMSA9PT0gYi5tMTEgJiYgdGhpcy5tMTIgPT09IGIubTEyICYmIHRoaXMubTEzID09PSBiLm0xMyAmJlxyXG4gICAgICAgICAgICB0aGlzLm0yMSA9PT0gYi5tMjEgJiYgdGhpcy5tMjIgPT09IGIubTIyICYmIHRoaXMubTIzID09PSBiLm0yMyAmJlxyXG4gICAgICAgICAgICB0aGlzLm0zMSA9PT0gYi5tMzEgJiYgdGhpcy5tMzIgPT09IGIubTMyICYmIHRoaXMubTMzID09PSBiLm0zMylcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBNYXQzIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDMoXHJcbiAgICAgICAgICAgIHRoaXMubTExLCB0aGlzLm0xMiwgdGhpcy5tMTMsXHJcbiAgICAgICAgICAgIHRoaXMubTIxLCB0aGlzLm0yMiwgdGhpcy5tMjMsXHJcbiAgICAgICAgICAgIHRoaXMubTMxLCB0aGlzLm0zMiwgdGhpcy5tMzMpXHJcbiAgICB9XHJcblxyXG4gICAgdHJhbnNwb3NlKCk6IE1hdDIge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0MyhcclxuICAgICAgICAgICAgdGhpcy5tMTEsIHRoaXMubTIxLCB0aGlzLm0zMSxcclxuICAgICAgICAgICAgdGhpcy5tMTIsIHRoaXMubTIyLCB0aGlzLm0zMixcclxuICAgICAgICAgICAgdGhpcy5tMTMsIHRoaXMubTIzLCB0aGlzLm0zMylcclxuICAgIH1cclxuXHJcbiAgICBtYXRtdWwoYjogTWF0Myk6IE1hdDMge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0MyhcclxuICAgICAgICAgICAgdGhpcy5tMTEgKiBiLm0xMSArIHRoaXMubTEyICogYi5tMjEgKyB0aGlzLm0xMyAqIGIubTMxLCAvLyBtMTEsXHJcbiAgICAgICAgICAgIHRoaXMubTExICogYi5tMTIgKyB0aGlzLm0xMiAqIGIubTIyICsgdGhpcy5tMTMgKiBiLm0zMiwgLy8gbTEyLFxyXG4gICAgICAgICAgICB0aGlzLm0xMSAqIGIubTEzICsgdGhpcy5tMTIgKiBiLm0yMyArIHRoaXMubTEzICogYi5tMzMsIC8vIG0xMyxcclxuICAgICAgICAgICAgdGhpcy5tMjEgKiBiLm0xMSArIHRoaXMubTIyICogYi5tMjEgKyB0aGlzLm0yMyAqIGIubTMxLCAvLyBtMjEsXHJcbiAgICAgICAgICAgIHRoaXMubTIxICogYi5tMTIgKyB0aGlzLm0yMiAqIGIubTIyICsgdGhpcy5tMjMgKiBiLm0zMiwgLy8gbTIyLFxyXG4gICAgICAgICAgICB0aGlzLm0yMSAqIGIubTEzICsgdGhpcy5tMjIgKiBiLm0yMyArIHRoaXMubTIzICogYi5tMzMsIC8vIG0yMyxcclxuICAgICAgICAgICAgdGhpcy5tMzEgKiBiLm0xMSArIHRoaXMubTMyICogYi5tMjEgKyB0aGlzLm0zMyAqIGIubTMxLCAvLyBtMzEsXHJcbiAgICAgICAgICAgIHRoaXMubTMxICogYi5tMTIgKyB0aGlzLm0zMiAqIGIubTIyICsgdGhpcy5tMzMgKiBiLm0zMiwgLy8gbTMyLFxyXG4gICAgICAgICAgICB0aGlzLm0zMSAqIGIubTEzICsgdGhpcy5tMzIgKiBiLm0yMyArIHRoaXMubTMzICogYi5tMzMsIC8vIG0zM1xyXG4gICAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHRyYW5zZm9ybSB0aGUgdmVjdG9yIGJ5IHRoZSBzcGVjaWZpZWQgbWF0cml4XHJcbiAgICAgKiB0cmVhdHMgdmVjdG9yIGFzIGEgY29sdW1uIG1hdHJpeCB0byBsZWZ0IG9mIDN4MyBtYXRyaXhcclxuICAgICAqIHx4eXp8ICogbVxyXG4gICAgICogQHBhcmFtIGEgdmVjdG9yXHJcbiAgICAgKi9cclxuICAgIHRyYW5zZm9ybShhOiBWZWMzKTogVmVjMyB7XHJcbiAgICAgICAgY29uc3QgeCA9IGEueCAqIHRoaXMubTExICsgYS55ICogdGhpcy5tMjEgKyBhLnogKiB0aGlzLm0zMVxyXG4gICAgICAgIGNvbnN0IHkgPSBhLnggKiB0aGlzLm0xMiArIGEueSAqIHRoaXMubTIyICsgYS56ICogdGhpcy5tMzJcclxuICAgICAgICBjb25zdCB6ID0gYS54ICogdGhpcy5tMTMgKyBhLnkgKiB0aGlzLm0yMyArIGEueiAqIHRoaXMubTMzXHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHgsIHksIHopXHJcbiAgICB9XHJcblxyXG4gICAgdG9TdHJpbmcoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gYHwgJHt0aGlzLm0xMX0gJHt0aGlzLm0xMn0gJHt0aGlzLm0xM30gfFxyXG58ICR7dGhpcy5tMjF9ICR7dGhpcy5tMjJ9ICR7dGhpcy5tMjN9IHxcclxufCAke3RoaXMubTMxfSAke3RoaXMubTMyfSAke3RoaXMubTMzfSB8YFxyXG4gICAgfVxyXG5cclxuICAgIHRvQXJyYXkoKTogbnVtYmVyW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHRoaXMubTExLCB0aGlzLm0xMiwgdGhpcy5tMTMsXHJcbiAgICAgICAgICAgIHRoaXMubTIxLCB0aGlzLm0yMiwgdGhpcy5tMjMsXHJcbiAgICAgICAgICAgIHRoaXMubTMxLCB0aGlzLm0zMiwgdGhpcy5tMzMsXHJcbiAgICAgICAgXVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0NCB7XHJcbiAgICBzdGF0aWMgaWRlbnRpdHkoKTogTWF0NCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICAxLCAwLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCAxLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAxLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAwLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyB0cmFuc2xhdGlvbihhOiBWZWMzKTogTWF0NCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICAxLCAwLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCAxLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAxLCAwLFxyXG4gICAgICAgICAgICBhLngsIGEueSwgYS56LCAxKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyByb3RhdGlvblgodGhldGE6IG51bWJlcik6IE1hdDQge1xyXG4gICAgICAgIGNvbnN0IGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpXHJcbiAgICAgICAgY29uc3Qgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSlcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICAxLCAwLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCBjb3NUaGV0YSwgLXNpblRoZXRhLCAwLFxyXG4gICAgICAgICAgICAwLCBzaW5UaGV0YSwgY29zVGhldGEsIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIDAsIDEpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHJvdGF0aW9uWSh0aGV0YTogbnVtYmVyKTogTWF0NCB7XHJcbiAgICAgICAgY29uc3QgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSlcclxuICAgICAgICBjb25zdCBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIGNvc1RoZXRhLCAwLCBzaW5UaGV0YSwgMCxcclxuICAgICAgICAgICAgMCwgMSwgMCwgMCxcclxuICAgICAgICAgICAgLXNpblRoZXRhLCAwLCBjb3NUaGV0YSwgMCxcclxuICAgICAgICAgICAgMCwgMCwgMCwgMSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgcm90YXRpb25aKHRoZXRhOiBudW1iZXIpOiBNYXQ0IHtcclxuICAgICAgICBjb25zdCBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKVxyXG4gICAgICAgIGNvbnN0IHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpXHJcblxyXG4gICAgICAgIHJldHVybiBuZXcgTWF0NChcclxuICAgICAgICAgICAgY29zVGhldGEsIC1zaW5UaGV0YSwgMCwgMCxcclxuICAgICAgICAgICAgc2luVGhldGEsIGNvc1RoZXRhLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAxLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAwLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyByb3RhdGlvbl9heGlzKGF4aXM6IFZlYzMsIHRoZXRhOiBudW1iZXIpOiBNYXQ0IHtcclxuICAgICAgICBjb25zdCBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKVxyXG4gICAgICAgIGNvbnN0IHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpXHJcbiAgICAgICAgY29uc3QgeyB4LCB5LCB6IH0gPSBheGlzXHJcbiAgICAgICAgY29uc3QgeFNpblRoZXRhID0geCAqIHNpblRoZXRhXHJcbiAgICAgICAgY29uc3QgeVNpblRoZXRhID0geSAqIHNpblRoZXRhXHJcbiAgICAgICAgY29uc3QgelNpblRoZXRhID0geiAqIHNpblRoZXRhXHJcbiAgICAgICAgY29uc3Qgb25lTWludXNDb3NUaGV0YSA9IDEgLSBjb3NUaGV0YVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIGNvc1RoZXRhICsgeCAqIHggKiBvbmVNaW51c0Nvc1RoZXRhLCB4ICogeSAqIG9uZU1pbnVzQ29zVGhldGEgLSB6U2luVGhldGEsIHggKiB6ICogb25lTWludXNDb3NUaGV0YSArIHlTaW5UaGV0YSwgMCxcclxuICAgICAgICAgICAgeSAqIHggKiBvbmVNaW51c0Nvc1RoZXRhICsgelNpblRoZXRhLCBjb3NUaGV0YSArIHkgKiB5ICogb25lTWludXNDb3NUaGV0YSwgeSAqIHogKiBvbmVNaW51c0Nvc1RoZXRhIC0geFNpblRoZXRhLCAwLFxyXG4gICAgICAgICAgICB6ICogeCAqIG9uZU1pbnVzQ29zVGhldGEgLSB5U2luVGhldGEsIHogKiB5ICogb25lTWludXNDb3NUaGV0YSArIHhTaW5UaGV0YSwgY29zVGhldGEgKyB6ICogeiAqIG9uZU1pbnVzQ29zVGhldGEsIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIDAsIDEpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHNjYWxpbmcoeHl6OiBWZWMzKTogTWF0NCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICB4eXoueCwgMCwgMCwgMCxcclxuICAgICAgICAgICAgMCwgeHl6LnksIDAsIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIHh5ei56LCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAwLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY3JlYXRlIGEgd2ViZ2wgcGVyc3BlY3RpdmUgbWF0cml4XHJcbiAgICAgKiBAcGFyYW0gZm92WSB5IGZvdiAocmFkaWFucylcclxuICAgICAqIEBwYXJhbSBhc3BlY3QgYXNwZWN0IHJhdGlvXHJcbiAgICAgKiBAcGFyYW0gbmVhclogbmVhciB6IGNvb3JkaW5hdGVcclxuICAgICAqIEBwYXJhbSBmYXJaIGZhciB6IGNvb3JkaW5hdGVcclxuICAgICAqL1xyXG4gICAgc3RhdGljIHBlcnNwZWN0aXZlKGZvdlk6IG51bWJlciwgYXNwZWN0OiBudW1iZXIsIG5lYXJaOiBudW1iZXIsIGZhclo6IG51bWJlcik6IE1hdDQge1xyXG4gICAgICAgIGNvbnN0IGYgPSBNYXRoLnRhbihNYXRoLlBJICogMC41IC0gMC41ICogZm92WSlcclxuICAgICAgICBjb25zdCBpbnZSYW5nZSA9IDEgLyAobmVhclogLSBmYXJaKVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIGYgLyBhc3BlY3QsIDAsIDAsIDAsXHJcbiAgICAgICAgICAgIDAsIGYsIDAsIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIChuZWFyWiArIGZhclopICogaW52UmFuZ2UsIC0xLFxyXG4gICAgICAgICAgICAwLCAwLCBuZWFyWiAqIGZhclogKiBpbnZSYW5nZSAqIDIsIDBcclxuICAgICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb25zdHJ1Y3QgYSBsb29rIGF0IG1hdHJpeCB0aGF0IHBsYWNlcyB0aGUgY2FtZXJhIGF0IHRoZSBleWUgcG9pbnQsIGxvb2tpbmcgYXQgdGhlIHNwZWNpZmllZCB0YXJnZXRcclxuICAgICAqIGludmVydCBmb3IgYSBcInZpZXdcIiBtYXRyaXhcclxuICAgICAqIEBwYXJhbSBleWUgZXllIHBvc2l0aW9uXHJcbiAgICAgKiBAcGFyYW0gdGFyZ2V0IHRhcmdldCBwb3NpdGlvblxyXG4gICAgICogQHBhcmFtIHVwIHVwIGF4aXNcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGxvb2tBdChleWU6IFZlYzMsIHRhcmdldDogVmVjMywgdXA6IFZlYzMpOiBNYXQ0IHtcclxuICAgICAgICBjb25zdCB6QXhpcyA9IGV5ZS5zdWIodGFyZ2V0KS5ub3JtYWxpemUoKVxyXG4gICAgICAgIGNvbnN0IHhBeGlzID0gdXAuY3Jvc3MoekF4aXMpXHJcbiAgICAgICAgY29uc3QgeUF4aXMgPSB6QXhpcy5jcm9zcyh4QXhpcylcclxuICAgICAgICByZXR1cm4gTWF0NC5iYXNpcyh4QXhpcywgeUF4aXMsIHpBeGlzLCBleWUpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGJhc2lzKHhBeGlzOiBWZWMzLCB5QXhpczogVmVjMywgekF4aXM6IFZlYzMsIHRyYW5zbGF0aW9uOiBWZWMzKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICB4QXhpcy54LCB4QXhpcy55LCB4QXhpcy56LCAwLFxyXG4gICAgICAgICAgICB5QXhpcy54LCB5QXhpcy55LCB5QXhpcy56LCAwLFxyXG4gICAgICAgICAgICB6QXhpcy54LCB6QXhpcy55LCB6QXhpcy56LCAwLFxyXG4gICAgICAgICAgICB0cmFuc2xhdGlvbi54LCB0cmFuc2xhdGlvbi55LCB0cmFuc2xhdGlvbi56LCAxXHJcbiAgICAgICAgKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIHB1YmxpYyBtMTE6IG51bWJlciwgcHVibGljIG0xMjogbnVtYmVyLCBwdWJsaWMgbTEzOiBudW1iZXIsIHB1YmxpYyBtMTQ6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgbTIxOiBudW1iZXIsIHB1YmxpYyBtMjI6IG51bWJlciwgcHVibGljIG0yMzogbnVtYmVyLCBwdWJsaWMgbTI0OiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIG0zMTogbnVtYmVyLCBwdWJsaWMgbTMyOiBudW1iZXIsIHB1YmxpYyBtMzM6IG51bWJlciwgcHVibGljIG0zNDogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyBtNDE6IG51bWJlciwgcHVibGljIG00MjogbnVtYmVyLCBwdWJsaWMgbTQzOiBudW1iZXIsIHB1YmxpYyBtNDQ6IG51bWJlcikgeyB9XHJcblxyXG4gICAgZXF1YWwoYjogTWF0NCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgIHRoaXMubTExID09PSBiLm0xMSAmJiB0aGlzLm0xMiA9PT0gYi5tMTIgJiYgdGhpcy5tMTMgPT09IGIubTEzICYmIHRoaXMubTE0ID09PSBiLm0xNCAmJlxyXG4gICAgICAgICAgICB0aGlzLm0yMSA9PT0gYi5tMjEgJiYgdGhpcy5tMjIgPT09IGIubTIyICYmIHRoaXMubTIzID09PSBiLm0yMyAmJiB0aGlzLm0yNCA9PT0gYi5tMjQgJiZcclxuICAgICAgICAgICAgdGhpcy5tMzEgPT09IGIubTMxICYmIHRoaXMubTMyID09PSBiLm0zMiAmJiB0aGlzLm0zMyA9PT0gYi5tMzMgJiYgdGhpcy5tMzQgPT09IGIubTM0ICYmXHJcbiAgICAgICAgICAgIHRoaXMubTQxID09PSBiLm00MSAmJiB0aGlzLm00MiA9PT0gYi5tNDIgJiYgdGhpcy5tNDMgPT09IGIubTQzICYmIHRoaXMubTQ0ID09PSBiLm00NClcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBNYXQ0IHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIHRoaXMubTExLCB0aGlzLm0xMiwgdGhpcy5tMTMsIHRoaXMubTE0LFxyXG4gICAgICAgICAgICB0aGlzLm0yMSwgdGhpcy5tMjIsIHRoaXMubTIzLCB0aGlzLm0yNCxcclxuICAgICAgICAgICAgdGhpcy5tMzEsIHRoaXMubTMyLCB0aGlzLm0zMywgdGhpcy5tMzQsXHJcbiAgICAgICAgICAgIHRoaXMubTQxLCB0aGlzLm00MiwgdGhpcy5tNDMsIHRoaXMubTQ0KVxyXG4gICAgfVxyXG5cclxuICAgIHRyYW5zcG9zZSgpOiBNYXQ0IHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIHRoaXMubTExLCB0aGlzLm0yMSwgdGhpcy5tMzEsIHRoaXMubTQxLFxyXG4gICAgICAgICAgICB0aGlzLm0xMiwgdGhpcy5tMjIsIHRoaXMubTMyLCB0aGlzLm00MixcclxuICAgICAgICAgICAgdGhpcy5tMTMsIHRoaXMubTIzLCB0aGlzLm0zMywgdGhpcy5tNDMsXHJcbiAgICAgICAgICAgIHRoaXMubTE0LCB0aGlzLm0yNCwgdGhpcy5tMzQsIHRoaXMubTQ0KVxyXG4gICAgfVxyXG5cclxuICAgIG1hdG11bChiOiBNYXQ0KTogTWF0NCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICB0aGlzLm0xMSAqIGIubTExICsgdGhpcy5tMTIgKiBiLm0yMSArIHRoaXMubTEzICogYi5tMzEgKyB0aGlzLm0xNCAqIGIubTQxLCAvLyBtMTFcclxuICAgICAgICAgICAgdGhpcy5tMTEgKiBiLm0xMiArIHRoaXMubTEyICogYi5tMjIgKyB0aGlzLm0xMyAqIGIubTMyICsgdGhpcy5tMTQgKiBiLm00MiwgLy8gbTEyXHJcbiAgICAgICAgICAgIHRoaXMubTExICogYi5tMTMgKyB0aGlzLm0xMiAqIGIubTIzICsgdGhpcy5tMTMgKiBiLm0zMyArIHRoaXMubTE0ICogYi5tNDMsIC8vIG0xM1xyXG4gICAgICAgICAgICB0aGlzLm0xMSAqIGIubTE0ICsgdGhpcy5tMTIgKiBiLm0yNCArIHRoaXMubTEzICogYi5tMzQgKyB0aGlzLm0xNCAqIGIubTQ0LCAvLyBtMTRcclxuICAgICAgICAgICAgdGhpcy5tMjEgKiBiLm0xMSArIHRoaXMubTIyICogYi5tMjEgKyB0aGlzLm0yMyAqIGIubTMxICsgdGhpcy5tMjQgKiBiLm00MSwgLy8gbTIxXHJcbiAgICAgICAgICAgIHRoaXMubTIxICogYi5tMTIgKyB0aGlzLm0yMiAqIGIubTIyICsgdGhpcy5tMjMgKiBiLm0zMiArIHRoaXMubTI0ICogYi5tNDIsIC8vIG0yMlxyXG4gICAgICAgICAgICB0aGlzLm0yMSAqIGIubTEzICsgdGhpcy5tMjIgKiBiLm0yMyArIHRoaXMubTIzICogYi5tMzMgKyB0aGlzLm0yNCAqIGIubTQzLCAvLyBtMjNcclxuICAgICAgICAgICAgdGhpcy5tMjEgKiBiLm0xNCArIHRoaXMubTIyICogYi5tMjQgKyB0aGlzLm0yMyAqIGIubTM0ICsgdGhpcy5tMjQgKiBiLm00NCwgLy8gbTI0XHJcbiAgICAgICAgICAgIHRoaXMubTMxICogYi5tMTEgKyB0aGlzLm0zMiAqIGIubTIxICsgdGhpcy5tMzMgKiBiLm0zMSArIHRoaXMubTM0ICogYi5tNDEsIC8vIG0zMVxyXG4gICAgICAgICAgICB0aGlzLm0zMSAqIGIubTEyICsgdGhpcy5tMzIgKiBiLm0yMiArIHRoaXMubTMzICogYi5tMzIgKyB0aGlzLm0zNCAqIGIubTQyLCAvLyBtMzJcclxuICAgICAgICAgICAgdGhpcy5tMzEgKiBiLm0xMyArIHRoaXMubTMyICogYi5tMjMgKyB0aGlzLm0zMyAqIGIubTMzICsgdGhpcy5tMzQgKiBiLm00MywgLy8gbTMzXHJcbiAgICAgICAgICAgIHRoaXMubTMxICogYi5tMTQgKyB0aGlzLm0zMiAqIGIubTI0ICsgdGhpcy5tMzMgKiBiLm0zNCArIHRoaXMubTM0ICogYi5tNDQsIC8vIG0zNFxyXG4gICAgICAgICAgICB0aGlzLm00MSAqIGIubTExICsgdGhpcy5tNDIgKiBiLm0yMSArIHRoaXMubTQzICogYi5tMzEgKyB0aGlzLm00NCAqIGIubTQxLCAvLyBtNDFcclxuICAgICAgICAgICAgdGhpcy5tNDEgKiBiLm0xMiArIHRoaXMubTQyICogYi5tMjIgKyB0aGlzLm00MyAqIGIubTMyICsgdGhpcy5tNDQgKiBiLm00MiwgLy8gbTQyXHJcbiAgICAgICAgICAgIHRoaXMubTQxICogYi5tMTMgKyB0aGlzLm00MiAqIGIubTIzICsgdGhpcy5tNDMgKiBiLm0zMyArIHRoaXMubTQ0ICogYi5tNDMsIC8vIG00M1xyXG4gICAgICAgICAgICB0aGlzLm00MSAqIGIubTE0ICsgdGhpcy5tNDIgKiBiLm0yNCArIHRoaXMubTQzICogYi5tMzQgKyB0aGlzLm00NCAqIGIubTQ0LCAvLyBtNDRcclxuICAgICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB0cmFuc2Zvcm0gdGhlIHZlY3RvciBieSB0aGUgc3BlY2lmaWVkIG1hdHJpeFxyXG4gICAgICogdHJlYXRzIHZlY3RvciBhcyBhIGNvbHVtbiBtYXRyaXggdG8gbGVmdCBvZiA0eDQgbWF0cml4XHJcbiAgICAgKiBwcm9qZWN0cyBiYWNrIHRvIHcgPSAxIHNwYWNlIGFmdGVyIG11bHRpcGxpY2F0aW9uXHJcbiAgICAgKiB8eHl6MXwgKiBtXHJcbiAgICAgKiBAcGFyYW0gYSB2ZWN0b3JcclxuICAgICAqL1xyXG4gICAgdHJhbnNmb3JtMyhhOiBWZWMzKTogVmVjMyB7XHJcbiAgICAgICAgY29uc3QgdyA9IGEueCAqIHRoaXMubTE0ICsgYS55ICogdGhpcy5tMjQgKyBhLnogKiB0aGlzLm0zNCArIHRoaXMubTQ0XHJcbiAgICAgICAgY29uc3QgaW52VyA9IDEgLyB3XHJcbiAgICAgICAgY29uc3QgeCA9IChhLnggKiB0aGlzLm0xMSArIGEueSAqIHRoaXMubTIxICsgYS56ICogdGhpcy5tMzEgKyB0aGlzLm00MSkgKiBpbnZXXHJcbiAgICAgICAgY29uc3QgeSA9IChhLnggKiB0aGlzLm0xMiArIGEueSAqIHRoaXMubTIyICsgYS56ICogdGhpcy5tMzIgKyB0aGlzLm00MikgKiBpbnZXXHJcbiAgICAgICAgY29uc3QgeiA9IChhLnggKiB0aGlzLm0xMyArIGEueSAqIHRoaXMubTIzICsgYS56ICogdGhpcy5tMzMgKyB0aGlzLm00MykgKiBpbnZXXHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHgsIHksIHopXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB0cmFuc2Zvcm0gYSB2ZWN0b3IgdXNpbmcgbWF0cml4IG11bHRpcGxpY2F0aW9uXHJcbiAgICAgKiB0cmVhdHMgdmVjdG9yIGFzIGEgY29sdW1uIHZlY3RvciBpbiBtdWx0aXBsaWNhdGlvbiB8eHl6d3wgKiBtXHJcbiAgICAgKiBAcGFyYW0gYSB2ZWN0b3JcclxuICAgICAqL1xyXG4gICAgdHJhbnNmb3JtNChhOiBWZWM0KTogVmVjNCB7XHJcbiAgICAgICAgY29uc3QgeCA9IGEueCAqIHRoaXMubTExICsgYS55ICogdGhpcy5tMjEgKyBhLnogKiB0aGlzLm0zMSArIGEudyAqIHRoaXMubTQxXHJcbiAgICAgICAgY29uc3QgeSA9IGEueCAqIHRoaXMubTEyICsgYS55ICogdGhpcy5tMjIgKyBhLnogKiB0aGlzLm0zMiArIGEudyAqIHRoaXMubTQyXHJcbiAgICAgICAgY29uc3QgeiA9IGEueCAqIHRoaXMubTEzICsgYS55ICogdGhpcy5tMjMgKyBhLnogKiB0aGlzLm0zMyArIGEudyAqIHRoaXMubTQzXHJcbiAgICAgICAgY29uc3QgdyA9IGEueCAqIHRoaXMubTE0ICsgYS55ICogdGhpcy5tMjQgKyBhLnogKiB0aGlzLm0zNCArIGEudyAqIHRoaXMubTQ0XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHgsIHksIHosIHcpXHJcbiAgICB9XHJcblxyXG4gICAgaW52ZXJ0KCk6IE1hdDQge1xyXG4gICAgICAgIGNvbnN0IHMwID0gdGhpcy5tMTEgKiB0aGlzLm0yMiAtIHRoaXMubTEyICogdGhpcy5tMjE7XHJcbiAgICAgICAgY29uc3QgczEgPSB0aGlzLm0xMSAqIHRoaXMubTIzIC0gdGhpcy5tMTMgKiB0aGlzLm0yMTtcclxuICAgICAgICBjb25zdCBzMiA9IHRoaXMubTExICogdGhpcy5tMjQgLSB0aGlzLm0xNCAqIHRoaXMubTIxO1xyXG4gICAgICAgIGNvbnN0IHMzID0gdGhpcy5tMTIgKiB0aGlzLm0yMyAtIHRoaXMubTEzICogdGhpcy5tMjI7XHJcbiAgICAgICAgY29uc3QgczQgPSB0aGlzLm0xMiAqIHRoaXMubTI0IC0gdGhpcy5tMTQgKiB0aGlzLm0yMjtcclxuICAgICAgICBjb25zdCBzNSA9IHRoaXMubTEzICogdGhpcy5tMjQgLSB0aGlzLm0xNCAqIHRoaXMubTIzO1xyXG4gICAgICAgIGNvbnN0IGM1ID0gdGhpcy5tMzMgKiB0aGlzLm00NCAtIHRoaXMubTM0ICogdGhpcy5tNDM7XHJcbiAgICAgICAgY29uc3QgYzQgPSB0aGlzLm0zMiAqIHRoaXMubTQ0IC0gdGhpcy5tMzQgKiB0aGlzLm00MjtcclxuICAgICAgICBjb25zdCBjMyA9IHRoaXMubTMyICogdGhpcy5tNDMgLSB0aGlzLm0zMyAqIHRoaXMubTQyO1xyXG4gICAgICAgIGNvbnN0IGMyID0gdGhpcy5tMzEgKiB0aGlzLm00NCAtIHRoaXMubTM0ICogdGhpcy5tNDE7XHJcbiAgICAgICAgY29uc3QgYzEgPSB0aGlzLm0zMSAqIHRoaXMubTQzIC0gdGhpcy5tMzMgKiB0aGlzLm00MTtcclxuICAgICAgICBjb25zdCBjMCA9IHRoaXMubTMxICogdGhpcy5tNDIgLSB0aGlzLm0zMiAqIHRoaXMubTQxO1xyXG4gICAgICAgIGNvbnN0IGRldCA9IHMwICogYzUgLSBzMSAqIGM0ICsgczIgKiBjMyArIHMzICogYzIgLSBzNCAqIGMxICsgczUgKiBjMDtcclxuXHJcbiAgICAgICAgaWYgKGRldCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBpbnZlcnRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBuZXcgTWF0NChcclxuICAgICAgICAgICAgKHRoaXMubTIyICogYzUgLSB0aGlzLm0yMyAqIGM0ICsgdGhpcy5tMjQgKiBjMykgLyBkZXQsICgtdGhpcy5tMTIgKiBjNSArIHRoaXMubTEzICogYzQgLSB0aGlzLm0xNCAqIGMzKSAvIGRldCwgKHRoaXMubTQyICogczUgLSB0aGlzLm00MyAqIHM0ICsgdGhpcy5tNDQgKiBzMykgLyBkZXQsICgtdGhpcy5tMzIgKiBzNSArIHRoaXMubTMzICogczQgLSB0aGlzLm0zNCAqIHMzKSAvIGRldCxcclxuICAgICAgICAgICAgKC10aGlzLm0yMSAqIGM1ICsgdGhpcy5tMjMgKiBjMiAtIHRoaXMubTI0ICogYzEpIC8gZGV0LCAodGhpcy5tMTEgKiBjNSAtIHRoaXMubTEzICogYzIgKyB0aGlzLm0xNCAqIGMxKSAvIGRldCwgKC10aGlzLm00MSAqIHM1ICsgdGhpcy5tNDMgKiBzMiAtIHRoaXMubTQ0ICogczEpIC8gZGV0LCAodGhpcy5tMzEgKiBzNSAtIHRoaXMubTMzICogczIgKyB0aGlzLm0zNCAqIHMxKSAvIGRldCxcclxuICAgICAgICAgICAgKHRoaXMubTIxICogYzQgLSB0aGlzLm0yMiAqIGMyICsgdGhpcy5tMjQgKiBjMCkgLyBkZXQsICgtdGhpcy5tMTEgKiBjNCArIHRoaXMubTEyICogYzIgLSB0aGlzLm0xNCAqIGMwKSAvIGRldCwgKHRoaXMubTQxICogczQgLSB0aGlzLm00MiAqIHMyICsgdGhpcy5tNDQgKiBzMCkgLyBkZXQsICgtdGhpcy5tMzEgKiBzNCArIHRoaXMubTMyICogczIgLSB0aGlzLm0zNCAqIHMwKSAvIGRldCxcclxuICAgICAgICAgICAgKC10aGlzLm0yMSAqIGMzICsgdGhpcy5tMjIgKiBjMSAtIHRoaXMubTIzICogYzApIC8gZGV0LCAodGhpcy5tMTEgKiBjMyAtIHRoaXMubTEyICogYzEgKyB0aGlzLm0xMyAqIGMwKSAvIGRldCwgKC10aGlzLm00MSAqIHMzICsgdGhpcy5tNDIgKiBzMSAtIHRoaXMubTQzICogczApIC8gZGV0LCAodGhpcy5tMzEgKiBzMyAtIHRoaXMubTMyICogczEgKyB0aGlzLm0zMyAqIHMwKSAvIGRldFxyXG4gICAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICB0b01hdDMoKTogTWF0MyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQzKFxyXG4gICAgICAgICAgICB0aGlzLm0xMSwgdGhpcy5tMTIsIHRoaXMubTEzLFxyXG4gICAgICAgICAgICB0aGlzLm0yMSwgdGhpcy5tMjIsIHRoaXMubTIzLFxyXG4gICAgICAgICAgICB0aGlzLm0zMSwgdGhpcy5tMzIsIHRoaXMubTMzXHJcbiAgICAgICAgKVxyXG4gICAgfVxyXG5cclxuICAgIHRvU3RyaW5nKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGB8ICR7dGhpcy5tMTF9ICR7dGhpcy5tMTJ9ICR7dGhpcy5tMTN9ICR7dGhpcy5tMTR9IHxcclxufCAke3RoaXMubTIxfSAke3RoaXMubTIyfSAke3RoaXMubTIzfSAke3RoaXMubTI0fSB8XHJcbnwgJHt0aGlzLm0zMX0gJHt0aGlzLm0zMn0gJHt0aGlzLm0zM30gJHt0aGlzLm0zNH0gfFxyXG58ICR7dGhpcy5tNDF9ICR7dGhpcy5tNDJ9ICR7dGhpcy5tNDN9ICR7dGhpcy5tNDR9IHxgXHJcbiAgICB9XHJcblxyXG4gICAgdG9BcnJheSgpOiBudW1iZXJbXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgdGhpcy5tMTEsIHRoaXMubTEyLCB0aGlzLm0xMywgdGhpcy5tMTQsXHJcbiAgICAgICAgICAgIHRoaXMubTIxLCB0aGlzLm0yMiwgdGhpcy5tMjMsIHRoaXMubTI0LFxyXG4gICAgICAgICAgICB0aGlzLm0zMSwgdGhpcy5tMzIsIHRoaXMubTMzLCB0aGlzLm0zNCxcclxuICAgICAgICAgICAgdGhpcy5tNDEsIHRoaXMubTQyLCB0aGlzLm00MywgdGhpcy5tNDQsXHJcbiAgICAgICAgXVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQUFCQiB7XHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgbWluOiBWZWMzLCBwdWJsaWMgcmVhZG9ubHkgbWF4OiBWZWMzKSB7IH1cclxuXHJcbiAgICBzdGF0aWMgZnJvbVBvaW50cyhwdHM6IEl0ZXJhYmxlPFZlYzM+KTogQUFCQiB7XHJcbiAgICAgICAgbGV0IG1pbiA9IFZlYzMuaW5mKClcclxuICAgICAgICBsZXQgbWF4ID0gbWluLm5lZygpXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgcHQgb2YgcHRzKSB7XHJcbiAgICAgICAgICAgIG1pbiA9IG1pbi5taW4ocHQpXHJcbiAgICAgICAgICAgIG1heCA9IG1heC5tYXgocHQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBhYWJiID0gbmV3IEFBQkIobWluLCBtYXgpXHJcbiAgICAgICAgcmV0dXJuIGFhYmJcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZnJvbUhhbGZFeHRlbnRzKGhhbGZFeHRlbnRzOiBWZWMzKTogQUFCQiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBQUJCKGhhbGZFeHRlbnRzLm5lZygpLCBoYWxmRXh0ZW50cylcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMocG9zaXRpb246IFZlYzMsIGhhbGZFeHRlbnRzOiBWZWMzKTogQUFCQiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBQUJCKHBvc2l0aW9uLnN1YihoYWxmRXh0ZW50cyksIHBvc2l0aW9uLmFkZChoYWxmRXh0ZW50cykpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGZyb21Db29yZHMobWluWDogbnVtYmVyLCBtaW5ZOiBudW1iZXIsIG1pblo6IG51bWJlciwgbWF4WDogbnVtYmVyLCBtYXhZOiBudW1iZXIsIG1heFo6IG51bWJlcik6IEFBQkIge1xyXG4gICAgICAgIHJldHVybiBuZXcgQUFCQihuZXcgVmVjMyhtaW5YLCBtaW5ZLCBtaW5aKSwgbmV3IFZlYzMobWF4WCwgbWF4WSwgbWF4WikpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGV4dGVudHMoKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWF4LnN1Yih0aGlzLm1pbilcclxuICAgIH1cclxuXHJcbiAgICB1bmlvbihhYWJiOiBBQUJCKTogQUFCQiB7XHJcbiAgICAgICAgY29uc3QgdSA9IG5ldyBBQUJCKHRoaXMubWluLm1pbihhYWJiLm1pbiksIHRoaXMubWF4Lm1heChhYWJiLm1heCkpXHJcbiAgICAgICAgcmV0dXJuIHVcclxuICAgIH1cclxuXHJcbiAgICBpbnRlcnNlY3Rpb24oYWFiYjogQUFCQik6IEFBQkIge1xyXG4gICAgICAgIGNvbnN0IGl4ID0gbmV3IEFBQkIodGhpcy5taW4ubWF4KGFhYmIubWluKSwgdGhpcy5tYXgubWluKGFhYmIubWF4KSlcclxuICAgICAgICByZXR1cm4gaXhcclxuICAgIH1cclxuXHJcbiAgICBvdmVybGFwcyhhYWJiOiBBQUJCKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgdGhpcy5tYXgueCA+PSBhYWJiLm1pbi54ICYmXHJcbiAgICAgICAgICAgIHRoaXMubWF4LnkgPj0gYWFiYi5taW4ueSAmJlxyXG4gICAgICAgICAgICB0aGlzLm1heC56ID49IGFhYmIubWluLnogJiZcclxuICAgICAgICAgICAgdGhpcy5taW4ueCA8PSBhYWJiLm1heC54ICYmXHJcbiAgICAgICAgICAgIHRoaXMubWluLnkgPD0gYWFiYi5tYXgueSAmJlxyXG4gICAgICAgICAgICB0aGlzLm1pbi56IDw9IGFhYmIubWF4LnpcclxuICAgICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgY29udGFpbnMocHQ6IFZlYzMpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICBwdC54ID49IHRoaXMubWluLnggJiZcclxuICAgICAgICAgICAgcHQueSA+PSB0aGlzLm1pbi55ICYmXHJcbiAgICAgICAgICAgIHB0LnogPj0gdGhpcy5taW4ueiAmJlxyXG4gICAgICAgICAgICBwdC54IDwgdGhpcy5tYXgueCAmJlxyXG4gICAgICAgICAgICBwdC55IDwgdGhpcy5tYXgueSAmJlxyXG4gICAgICAgICAgICBwdC56IDwgdGhpcy5tYXguelxyXG4gICAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICB0cmFuc2xhdGUob2Zmc2V0OiBWZWMzKTogQUFCQiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBQUJCKHRoaXMubWluLmFkZChvZmZzZXQpLCB0aGlzLm1heC5hZGQob2Zmc2V0KSlcclxuICAgIH1cclxuXHJcbiAgICBzY2FsZShzOiBudW1iZXIpOiBBQUJCIHtcclxuICAgICAgICByZXR1cm4gbmV3IEFBQkIodGhpcy5taW4ubXVsWChzKSwgdGhpcy5tYXgubXVsWChzKSlcclxuICAgIH1cclxuXHJcbiAgICBidWZmZXIocGFkZGluZzogbnVtYmVyKTogQUFCQiB7XHJcbiAgICAgICAgY29uc3QgYWFiYiA9IG5ldyBBQUJCKHRoaXMubWluLmFkZFgoLXBhZGRpbmcpLCB0aGlzLm1heC5hZGRYKHBhZGRpbmcpKVxyXG4gICAgICAgIHJldHVybiBhYWJiXHJcbiAgICB9XHJcblxyXG4gICAgc2hyaW5rKGFtb3VudDogbnVtYmVyKTogQUFCQiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYnVmZmVyKC1hbW91bnQpXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogQUFCQiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBQUJCKHRoaXMubWluLmNsb25lKCksIHRoaXMubWF4LmNsb25lKCkpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBSYXkge1xyXG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IG9yaWc6IFZlYzMsIHB1YmxpYyByZWFkb25seSBkaXI6IFZlYzMpIHsgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogbm9ybWFsaXplIHJheSBkaXJlY3Rpb25cclxuICAgICAqL1xyXG4gICAgbm9ybWFsaXplKCk6IFJheSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBSYXkodGhpcy5vcmlnLCB0aGlzLmRpci5ub3JtYWxpemUoKSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHRyYW5zZm9ybSByYXkgYnkgc3BlY2lmaWVkIG1hdHJpeFxyXG4gICAgICogQHBhcmFtIG1hdCBtYXRyaXhcclxuICAgICAqL1xyXG4gICAgdHJhbnNmb3JtKG1hdDogTWF0NCk6IFJheSB7XHJcbiAgICAgICAgY29uc3Qgb3JpZyA9IG1hdC50cmFuc2Zvcm0zKHRoaXMub3JpZylcclxuICAgICAgICBjb25zdCBkZXN0ID0gbWF0LnRyYW5zZm9ybTModGhpcy5vcmlnLmFkZCh0aGlzLmRpcikpXHJcbiAgICAgICAgY29uc3QgcmF5ID0gUmF5LmZyb21PcmlnRGVzdChvcmlnLCBkZXN0KVxyXG4gICAgICAgIHJldHVybiByYXlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNhc3QgcmF5IGFnYWluc3QgcGxhbmUsIG9wdGlvbmFsIHJldHVybiB2YWx1ZSBiZWNhdXNlIGl0IG1heSBub3QgaW50ZXJzZWN0XHJcbiAgICAgKiBpZiBwbGFuZSBpcyBwYXJhbGxlbCB3aXRoIHJheSwgd2lsbCByZXR1cm4gSW5maW5pdHlcclxuICAgICAqIEBwYXJhbSBwbGFuZSBwbGFuZSB0byBjYXN0IHJheSBhZ2FpbnN0XHJcbiAgICAgKi9cclxuICAgIGNhc3QocGxhbmU6IFBsYW5lKTogbnVtYmVyIHtcclxuICAgICAgICBjb25zdCBkID0gcGxhbmUubm9ybWFsLmRvdCh0aGlzLmRpcik7XHJcbiAgICAgICAgY29uc3QgdCA9IHBsYW5lLmNlbnRlcigpLnN1Yih0aGlzLm9yaWcpLmRvdChwbGFuZS5ub3JtYWwpIC8gZDtcclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGludGVycG9sYXRlIGFsb25nIHJheVxyXG4gICAgICogQHBhcmFtIHQgdCB2YWx1ZSAoMCA9IG9yaWdpbiwgMSA9IG9yaWdpbiArIGRpcilcclxuICAgICAqL1xyXG4gICAgbGVycCh0OiBudW1iZXIpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5vcmlnLmFkZCh0aGlzLmRpci5tdWxYKHQpKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29udmVydCB0byBzdHJpbmdcclxuICAgICAqL1xyXG4gICAgdG9TdHJpbmcoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gYG9yaWc6ICR7dGhpcy5vcmlnfSBkaXI6ICR7dGhpcy5kaXJ9YFxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29uc3RydWN0IHBsYW5lIGZyb20gb3JpZ2luIGFuZCBkZXN0aW5hdGlvblxyXG4gICAgICogQHBhcmFtIG9yaWcgb3JpZyBwb2ludFxyXG4gICAgICogQHBhcmFtIGRlc3QgZGVzdGluYXRpb24gcG9pbnRcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGZyb21PcmlnRGVzdChvcmlnOiBWZWMzLCBkZXN0OiBWZWMzKTogUmF5IHtcclxuICAgICAgICBjb25zdCBkaXIgPSBkZXN0LnN1YihvcmlnKS5ub3JtYWxpemUoKVxyXG4gICAgICAgIHJldHVybiBuZXcgUmF5KG9yaWcsIGRpcilcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFBsYW5lIHtcclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBub3JtYWw6IFZlYzMsIHB1YmxpYyByZWFkb25seSBkOiBudW1iZXIpIHsgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29uc3RydWN0IGEgcGxhbmUgZnJvbSBwb2ludCBhbmQgbm9ybWFsXHJcbiAgICAgKiBAcGFyYW0gcHQgcG9pbnQgb24gcGxhbmVcclxuICAgICAqIEBwYXJhbSBuIHBsYW5lIG5vcm1hbFxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZnJvbVBvaW50Tm9ybWFsKHB0OiBWZWMzLCBuOiBWZWMzKTogUGxhbmUge1xyXG4gICAgICAgIG4gPSBuLm5vcm1hbGl6ZSgpXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQbGFuZShuLCBwdC5kb3QobikpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb25zdHJ1Y3QgYSBwbGFuZSBmcm9tIHRocmVlIHBvaW50cywgcG9pbnRzIGFyZSBhc3N1bWVkIHRvIGJlIHNwZWNpZmllZCBpbiBDQ1cgb3JkZXJcclxuICAgICAqIEBwYXJhbSBhIDFzdCBwb2ludFxyXG4gICAgICogQHBhcmFtIGIgMm5kIHBvaW50XHJcbiAgICAgKiBAcGFyYW0gYyAzcmQgcG9pbnRcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGZyb21Qb2ludHMoYTogVmVjMywgYjogVmVjMywgYzogVmVjMyk6IFBsYW5lIHtcclxuICAgICAgICBjb25zdCBuID0gYi5zdWIoYSkuY3Jvc3MoYy5zdWIoYSkpLm5vcm1hbGl6ZSgpXHJcbiAgICAgICAgY29uc3QgZCA9IGEuZG90KGIpXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQbGFuZShuLCBkKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJldHVybnMgbm9ybWFsaXplZCBwbGFuZVxyXG4gICAgICovXHJcbiAgICBub3JtYWxpemUoKTogUGxhbmUge1xyXG4gICAgICAgIGNvbnN0IGxlbiA9IHRoaXMubm9ybWFsLmxlbmd0aCgpXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQbGFuZSh0aGlzLm5vcm1hbC5kaXZYKGxlbiksIHRoaXMuZCAvIGxlbilcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJldHVybnMgdGhlIFwiY2VudGVyXCIgb2YgdGhlIHBsYW5lIC0gdGhlIHBvaW50IGRlc2NyaWJlZCBieSB0aGUgbm9ybWFsIGFuZCBkaXN0YW5jZVxyXG4gICAgICovXHJcbiAgICBjZW50ZXIoKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubm9ybWFsLm11bFgodGhpcy5kKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY2FsY3VsYXRlIHNpZ25lZCBkaXN0YW5jZSBmcm9tIHBsYW5lIHRvIHBvaW50XHJcbiAgICAgKiBwb3NpdGl2ZSBkaXN0YW5jZSBpbmRpY2F0ZXMgcHQgaXMgaW4tZnJvbnQgb2YgcGxhbmVcclxuICAgICAqIG5lZ2F0aXZlIGRpc3RhbmNlIGluZGljYXRlcyBwdCBpcyBiZWhpbmQgcGxhbmVcclxuICAgICAqIEBwYXJhbSBwdCBwb2ludFxyXG4gICAgICovXHJcbiAgICBkaXN0YW5jZVRvKHB0OiBWZWMzKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5ub3JtYWwuZG90KHB0KSAtIHRoaXMuZDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHRyYW5zZm9ybSBwbGFuZSBieSBtYXRyaXhcclxuICAgICAqIEBwYXJhbSBtYXQgbWF0cml4XHJcbiAgICAgKi9cclxuICAgIHRyYW5zZm9ybShtYXQ6IE1hdDQpOiBQbGFuZSB7XHJcbiAgICAgICAgY29uc3QgY2VudGVyID0gbWF0LnRyYW5zZm9ybTModGhpcy5jZW50ZXIoKSlcclxuICAgICAgICBjb25zdCBub3JtYWwgPSBtYXQudG9NYXQzKCkudHJhbnNmb3JtKHRoaXMubm9ybWFsKVxyXG4gICAgICAgIHJldHVybiBQbGFuZS5mcm9tUG9pbnROb3JtYWwoY2VudGVyLCBub3JtYWwpO1xyXG4gICAgfVxyXG5cclxuICAgIHRvU3RyaW5nKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGAke3RoaXMubm9ybWFsfSAke3RoaXMuZH1gXHJcbiAgICB9XHJcbn0iXX0=