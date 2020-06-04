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
        const x = (a.x * this.m11 + a.y * this.m21 + a.z * this.m31 + this.m41) / invW;
        const y = (a.x * this.m12 + a.y * this.m22 + a.z * this.m32 + this.m42) / invW;
        const z = (a.x * this.m13 + a.y * this.m23 + a.z * this.m33 + this.m43) / invW;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VvM2QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZW8zZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBRXpDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLElBQUk7SUFDYixZQUFtQixDQUFTLEVBQVMsQ0FBUztRQUEzQixNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQVMsTUFBQyxHQUFELENBQUMsQ0FBUTtJQUFJLENBQUM7SUFFbkQsTUFBTSxDQUFDLEdBQUc7UUFDTixPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsS0FBSyxDQUFDLENBQU87UUFDVCxPQUFPLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBUztRQUNWLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFTO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBUztRQUNWLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDdEMsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVELE1BQU07UUFDRixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxTQUFTO1FBQ0wsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxHQUFHO1FBQ0MsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxJQUFJO1FBQ0EsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFFRCxHQUFHO1FBQ0MsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBUyxFQUFFLEdBQVM7UUFDdEIsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDdkYsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUE7SUFDbEMsQ0FBQztJQUVELE9BQU87UUFDSCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVELElBQUksR0FBRztRQUNILE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxJQUFJO0lBQ2IsWUFBbUIsQ0FBUyxFQUFTLENBQVMsRUFBUyxDQUFTO1FBQTdDLE1BQUMsR0FBRCxDQUFDLENBQVE7UUFBUyxNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQVMsTUFBQyxHQUFELENBQUMsQ0FBUTtJQUFJLENBQUM7SUFFckUsTUFBTSxDQUFDLEdBQUc7UUFDTixPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUVELEtBQUssQ0FBQyxDQUFPO1FBQ1QsT0FBTyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFTO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBUztRQUNWLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVELEtBQUssQ0FBQyxDQUFPO1FBQ1QsT0FBTyxJQUFJLElBQUksQ0FDWCxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUMzQixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUMzQixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVELE1BQU07UUFDRixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxTQUFTO1FBQ0wsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxHQUFHO1FBQ0MsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFRCxJQUFJO1FBQ0EsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzVFLENBQUM7SUFFRCxHQUFHO1FBQ0MsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN4RixDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDeEYsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFTLEVBQUUsR0FBUztRQUN0QixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDekgsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsT0FBTztRQUNILE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLEVBQUU7UUFDRixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLEVBQUU7UUFDRixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDSixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDSixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzlDLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxJQUFJO0lBQ2IsWUFBbUIsQ0FBUyxFQUFTLENBQVMsRUFBUyxDQUFTLEVBQVMsQ0FBUztRQUEvRCxNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQVMsTUFBQyxHQUFELENBQUMsQ0FBUTtRQUFTLE1BQUMsR0FBRCxDQUFDLENBQVE7UUFBUyxNQUFDLEdBQUQsQ0FBQyxDQUFRO0lBQUksQ0FBQztJQUV2RixNQUFNLENBQUMsR0FBRztRQUNOLE9BQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDM0QsQ0FBQztJQUVELEtBQUssQ0FBQyxDQUFPO1FBQ1QsT0FBTyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDOUUsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFTO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBUztRQUNWLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNFLENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0lBRUQsUUFBUTtRQUNKLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN6QixDQUFDO0lBRUQsTUFBTTtRQUNGLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELFNBQVM7UUFDTCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELEdBQUc7UUFDQyxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0YsQ0FBQztJQUVELElBQUk7UUFDQSxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0YsQ0FBQztJQUVELEdBQUc7UUFDQyxPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQy9HLENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQy9HLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBUyxFQUFFLEdBQVM7UUFDdEIsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzSixDQUFDO0lBRUQsUUFBUTtRQUNKLE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUE7SUFDdEQsQ0FBQztJQUVELE9BQU87UUFDSCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxJQUFJLEVBQUU7UUFDRixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLEVBQUU7UUFDRixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLEdBQUc7UUFDSCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENB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RUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQzVCLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELFNBQVM7UUFDTCxPQUFPLElBQUksSUFBSSxDQUNYLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUM1QixJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFDNUIsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsTUFBTSxDQUFDLENBQU87UUFDVixPQUFPLElBQUksSUFBSSxDQUNYLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU87UUFDL0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTztRQUMvRCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPO1FBQy9ELElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU87UUFDL0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTztRQUMvRCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPO1FBQy9ELElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU87UUFDL0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTztRQUMvRCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FDekQsQ0FBQTtJQUNMLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQVMsQ0FBQyxDQUFPO1FBQ2IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7UUFDMUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJ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S0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUc7WUFDcEYsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRztZQUNwRixJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHO1lBQ3BGLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzdGLENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLElBQUksQ0FDWCxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELFNBQVM7UUFDTCxPQUFPLElBQUksSUFBSSxDQUNYLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQ3RDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQ3RDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQ3RDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsTUFBTSxDQUFDLENBQU87UUFDVixPQUFPLElBQUksSUFBSSxDQUNYLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNO1FBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FDNUUsQ0FBQTtJQUNMLENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSCxVQUFVLENBQUMsQ0FBTztRQUNkLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7UUFDckUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUE7UUFDOUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFBO1FBQzlFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQTtRQUM5RSxPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDNUIsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxVQUFVLENBQUMsQ0FBTztRQUNkLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQTtRQUMzRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7UUFDM0UsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQTtRQUMzRSxPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQy9CLENBQUM7SUFFRCxNQUFNO1FBQ0YsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFFdEUsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFO1lBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQTtTQUNsQztRQUVELE9BQU8sSUFBSSxJQUFJLENBQ1gsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQzVOLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUM1TixDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFDNU4sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQy9OLENBQUE7SUFDTCxDQUFDO0lBRUQsTUFBTTtRQUNGLE9BQU8sSUFBSSxJQUFJLENBQ1gsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQzVCLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUM1QixJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FDL0IsQ0FBQTtJQUNMLENBQUM7SUFFRCxRQUFRO1FBQ0osT0FBTyxLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHO0lBQzVELElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHO0lBQzVDLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHO0lBQzVDLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQTtJQUNoRCxDQUFDO0lBRUQsT0FBTztRQUNILE9BQU87WUFDSCxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztZQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztZQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxD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QUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDdEUsT0FBTyxJQUFJLENBQUE7SUFDZixDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQWM7UUFDakIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDL0IsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7Q0FDSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIG1hdGggZnJvbSBcIi4uL3NoYXJlZC9tYXRoLmpzXCJcclxuXHJcbi8qKlxyXG4gKiAzZCBtYXRoIGxpYnJhcnlcclxuICovXHJcbmV4cG9ydCBjbGFzcyBWZWMyIHtcclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyB4OiBudW1iZXIsIHB1YmxpYyB5OiBudW1iZXIpIHsgfVxyXG5cclxuICAgIHN0YXRpYyBpbmYoKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKEluZmluaXR5LCBJbmZpbml0eSlcclxuICAgIH1cclxuXHJcbiAgICBlcXVhbChiOiBWZWMyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCA9PT0gYi54ICYmIHRoaXMueSA9PT0gYi55XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCwgdGhpcy55KVxyXG4gICAgfVxyXG5cclxuICAgIGFkZFgoeDogbnVtYmVyKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCArIHgsIHRoaXMueSArIHgpXHJcbiAgICB9XHJcblxyXG4gICAgc3ViWCh4OiBudW1iZXIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54IC0geCwgdGhpcy55IC0geClcclxuICAgIH1cclxuXHJcbiAgICBtdWxYKHg6IG51bWJlcik6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzLnggKiB4LCB0aGlzLnkgKiB4KVxyXG4gICAgfVxyXG5cclxuICAgIGRpdlgoeDogbnVtYmVyKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCAvIHgsIHRoaXMueSAvIHgpXHJcbiAgICB9XHJcblxyXG4gICAgYWRkKGI6IFZlYzIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54ICsgYi54LCB0aGlzLnkgKyBiLnkpXHJcbiAgICB9XHJcblxyXG4gICAgc3ViKGI6IFZlYzIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54IC0gYi54LCB0aGlzLnkgLSBiLnkpXHJcbiAgICB9XHJcblxyXG4gICAgbXVsKGI6IFZlYzIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54ICogYi54LCB0aGlzLnkgKiBiLnkpXHJcbiAgICB9XHJcblxyXG4gICAgZGl2KGI6IFZlYzIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54IC8gYi54LCB0aGlzLnkgLyBiLnkpXHJcbiAgICB9XHJcblxyXG4gICAgZG90KGI6IFZlYzIpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnggKiBiLnggKyB0aGlzLnkgKiBiLnlcclxuICAgIH1cclxuXHJcbiAgICBsZW5ndGhTcSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRvdCh0aGlzKVxyXG4gICAgfVxyXG5cclxuICAgIGxlbmd0aCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5kb3QodGhpcykpXHJcbiAgICB9XHJcblxyXG4gICAgbm9ybWFsaXplKCk6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRpdlgodGhpcy5sZW5ndGgoKSlcclxuICAgIH1cclxuXHJcbiAgICBhYnMoKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKE1hdGguYWJzKHRoaXMueCksIE1hdGguYWJzKHRoaXMueSkpXHJcbiAgICB9XHJcblxyXG4gICAgc2lnbigpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIoTWF0aC5zaWduKHRoaXMueCksIE1hdGguc2lnbih0aGlzLnkpKVxyXG4gICAgfVxyXG5cclxuICAgIG5lZygpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIoLXRoaXMueCwgLXRoaXMueSlcclxuICAgIH1cclxuXHJcbiAgICBtaW4oYjogVmVjMik6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMihNYXRoLm1pbih0aGlzLngsIGIueCksIE1hdGgubWluKHRoaXMueSwgYi55KSlcclxuICAgIH1cclxuXHJcbiAgICBtYXgoYjogVmVjMik6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMihNYXRoLm1heCh0aGlzLngsIGIueCksIE1hdGgubWF4KHRoaXMueSwgYi55KSlcclxuICAgIH1cclxuXHJcbiAgICBjbGFtcChtaW46IFZlYzIsIG1heDogVmVjMik6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMihtYXRoLmNsYW1wKHRoaXMueCwgbWluLngsIG1heC54KSwgbWF0aC5jbGFtcCh0aGlzLnksIG1pbi55LCBtYXgueSkpXHJcbiAgICB9XHJcblxyXG4gICAgdG9TdHJpbmcoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gYCgke3RoaXMueH0sJHt0aGlzLnl9KWBcclxuICAgIH1cclxuXHJcbiAgICB0b0FycmF5KCk6IG51bWJlcltdIHtcclxuICAgICAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55XVxyXG4gICAgfVxyXG5cclxuICAgIGdldCB4eTAoKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXMueCwgdGhpcy55LCAwKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVmVjMyB7XHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgeDogbnVtYmVyLCBwdWJsaWMgeTogbnVtYmVyLCBwdWJsaWMgejogbnVtYmVyKSB7IH1cclxuXHJcbiAgICBzdGF0aWMgaW5mKCk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyhJbmZpbml0eSwgSW5maW5pdHksIEluZmluaXR5KVxyXG4gICAgfVxyXG5cclxuICAgIGVxdWFsKGI6IFZlYzMpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy54ID09PSBiLnggJiYgdGhpcy55ID09PSBiLnkgJiYgdGhpcy56ID09PSBiLnpcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54LCB0aGlzLnksIHRoaXMueilcclxuICAgIH1cclxuXHJcbiAgICBhZGRYKHg6IG51bWJlcik6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzLnggKyB4LCB0aGlzLnkgKyB4LCB0aGlzLnogKyB4KVxyXG4gICAgfVxyXG5cclxuICAgIHN1YlgoeDogbnVtYmVyKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXMueCAtIHgsIHRoaXMueSAtIHgsIHRoaXMueiAtIHgpXHJcbiAgICB9XHJcblxyXG4gICAgbXVsWCh4OiBudW1iZXIpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54ICogeCwgdGhpcy55ICogeCwgdGhpcy56ICogeClcclxuICAgIH1cclxuXHJcbiAgICBkaXZYKHg6IG51bWJlcik6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzLnggLyB4LCB0aGlzLnkgLyB4LCB0aGlzLnogLyB4KVxyXG4gICAgfVxyXG5cclxuICAgIGFkZChiOiBWZWMzKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXMueCArIGIueCwgdGhpcy55ICsgYi55LCB0aGlzLnogKyBiLnopXHJcbiAgICB9XHJcblxyXG4gICAgc3ViKGI6IFZlYzMpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54IC0gYi54LCB0aGlzLnkgLSBiLnksIHRoaXMueiAtIGIueilcclxuICAgIH1cclxuXHJcbiAgICBtdWwoYjogVmVjMyk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzLnggKiBiLngsIHRoaXMueSAqIGIueSwgdGhpcy56ICogYi56KVxyXG4gICAgfVxyXG5cclxuICAgIGRpdihiOiBWZWMzKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXMueCAvIGIueCwgdGhpcy55IC8gYi55LCB0aGlzLnogLyBiLnopXHJcbiAgICB9XHJcblxyXG4gICAgZG90KGI6IFZlYzMpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnggKiBiLnggKyB0aGlzLnkgKiBiLnkgKyB0aGlzLnogKiBiLnpcclxuICAgIH1cclxuXHJcbiAgICBjcm9zcyhiOiBWZWMzKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKFxyXG4gICAgICAgICAgICB0aGlzLnkgKiBiLnogLSB0aGlzLnogKiBiLnksXHJcbiAgICAgICAgICAgIHRoaXMueiAqIGIueCAtIHRoaXMueCAqIGIueixcclxuICAgICAgICAgICAgdGhpcy54ICogYi55IC0gdGhpcy55ICogYi54KVxyXG4gICAgfVxyXG5cclxuICAgIGxlbmd0aFNxKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZG90KHRoaXMpXHJcbiAgICB9XHJcblxyXG4gICAgbGVuZ3RoKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmRvdCh0aGlzKSlcclxuICAgIH1cclxuXHJcbiAgICBub3JtYWxpemUoKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZGl2WCh0aGlzLmxlbmd0aCgpKVxyXG4gICAgfVxyXG5cclxuICAgIGFicygpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzMoTWF0aC5hYnModGhpcy54KSwgTWF0aC5hYnModGhpcy55KSwgTWF0aC5hYnModGhpcy56KSlcclxuICAgIH1cclxuXHJcbiAgICBzaWduKCk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyhNYXRoLnNpZ24odGhpcy54KSwgTWF0aC5zaWduKHRoaXMueSksIE1hdGguc2lnbih0aGlzLnopKVxyXG4gICAgfVxyXG5cclxuICAgIG5lZygpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzMoLXRoaXMueCwgLXRoaXMueSwgLXRoaXMueilcclxuICAgIH1cclxuXHJcbiAgICBtaW4oYjogVmVjMyk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyhNYXRoLm1pbih0aGlzLngsIGIueCksIE1hdGgubWluKHRoaXMueSwgYi55KSwgTWF0aC5taW4odGhpcy56LCBiLnopKVxyXG4gICAgfVxyXG5cclxuICAgIG1heChiOiBWZWMzKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKE1hdGgubWF4KHRoaXMueCwgYi54KSwgTWF0aC5tYXgodGhpcy55LCBiLnkpLCBNYXRoLm1heCh0aGlzLnosIGIueikpXHJcbiAgICB9XHJcblxyXG4gICAgY2xhbXAobWluOiBWZWMzLCBtYXg6IFZlYzMpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzMobWF0aC5jbGFtcCh0aGlzLngsIG1pbi54LCBtYXgueCksIG1hdGguY2xhbXAodGhpcy55LCBtaW4ueSwgbWF4LnkpLCBtYXRoLmNsYW1wKHRoaXMueiwgbWluLnosIG1heC56KSlcclxuICAgIH1cclxuXHJcbiAgICB0b1N0cmluZygpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBgKCR7dGhpcy54fSwke3RoaXMueX0sJHt0aGlzLnp9KWBcclxuICAgIH1cclxuXHJcbiAgICB0b0FycmF5KCk6IG51bWJlcltdIHtcclxuICAgICAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55LCB0aGlzLnpdXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHh5KCk6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzLngsIHRoaXMueSlcclxuICAgIH1cclxuXHJcbiAgICBnZXQgeHooKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCwgdGhpcy56KVxyXG4gICAgfVxyXG5cclxuICAgIGdldCB4eXowKCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLngsIHRoaXMueSwgdGhpcy56LCAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCB4eXoxKCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLngsIHRoaXMueSwgdGhpcy56LCAxKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVmVjNCB7XHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgeDogbnVtYmVyLCBwdWJsaWMgeTogbnVtYmVyLCBwdWJsaWMgejogbnVtYmVyLCBwdWJsaWMgdzogbnVtYmVyKSB7IH1cclxuXHJcbiAgICBzdGF0aWMgaW5mKCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNChJbmZpbml0eSwgSW5maW5pdHksIEluZmluaXR5LCBJbmZpbml0eSlcclxuICAgIH1cclxuXHJcbiAgICBlcXVhbChiOiBWZWM0KTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCA9PT0gYi54ICYmIHRoaXMueSA9PT0gYi55ICYmIHRoaXMueiA9PT0gYi56ICYmIHRoaXMudyA9PSBiLndcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpcy54LCB0aGlzLnksIHRoaXMueiwgdGhpcy53KVxyXG4gICAgfVxyXG5cclxuICAgIGFkZFgoeDogbnVtYmVyKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXMueCArIHgsIHRoaXMueSArIHgsIHRoaXMueiArIHgsIHRoaXMudyArIHgpXHJcbiAgICB9XHJcblxyXG4gICAgc3ViWCh4OiBudW1iZXIpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpcy54IC0geCwgdGhpcy55IC0geCwgdGhpcy56IC0geCwgdGhpcy53IC0geClcclxuICAgIH1cclxuXHJcbiAgICBtdWxYKHg6IG51bWJlcik6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLnggKiB4LCB0aGlzLnkgKiB4LCB0aGlzLnogKiB4LCB0aGlzLncgKiB4KVxyXG4gICAgfVxyXG5cclxuICAgIGRpdlgoeDogbnVtYmVyKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXMueCAvIHgsIHRoaXMueSAvIHgsIHRoaXMueiAvIHgsIHRoaXMudyAvIHgpXHJcbiAgICB9XHJcblxyXG4gICAgYWRkKGI6IFZlYzQpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpcy54ICsgYi54LCB0aGlzLnkgKyBiLnksIHRoaXMueiArIGIueiwgdGhpcy53ICsgYi53KVxyXG4gICAgfVxyXG5cclxuICAgIHN1YihiOiBWZWM0KTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXMueCAtIGIueCwgdGhpcy55IC0gYi55LCB0aGlzLnogLSBiLnosIHRoaXMudyAtIGIudylcclxuICAgIH1cclxuXHJcbiAgICBtdWwoYjogVmVjNCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLnggKiBiLngsIHRoaXMueSAqIGIueSwgdGhpcy56ICogYi56LCB0aGlzLncgLSBiLncpXHJcbiAgICB9XHJcblxyXG4gICAgZGl2KGI6IFZlYzQpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpcy54IC8gYi54LCB0aGlzLnkgLyBiLnksIHRoaXMueiAvIGIueiwgdGhpcy53IC8gYi53KVxyXG4gICAgfVxyXG5cclxuICAgIGRvdChiOiBWZWM0KTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy54ICogYi54ICsgdGhpcy55ICogYi55ICsgdGhpcy56ICogYi56ICsgdGhpcy53ICogYi53XHJcbiAgICB9XHJcblxyXG4gICAgbGVuZ3RoU3EoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kb3QodGhpcylcclxuICAgIH1cclxuXHJcbiAgICBsZW5ndGgoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMuZG90KHRoaXMpKVxyXG4gICAgfVxyXG5cclxuICAgIG5vcm1hbGl6ZSgpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kaXZYKHRoaXMubGVuZ3RoKCkpXHJcbiAgICB9XHJcblxyXG4gICAgYWJzKCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNChNYXRoLmFicyh0aGlzLngpLCBNYXRoLmFicyh0aGlzLnkpLCBNYXRoLmFicyh0aGlzLnopLCBNYXRoLmFicyh0aGlzLncpKVxyXG4gICAgfVxyXG5cclxuICAgIHNpZ24oKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KE1hdGguc2lnbih0aGlzLngpLCBNYXRoLnNpZ24odGhpcy55KSwgTWF0aC5zaWduKHRoaXMueiksIE1hdGguc2lnbih0aGlzLncpKVxyXG4gICAgfVxyXG5cclxuICAgIG5lZygpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQoLXRoaXMueCwgLXRoaXMueSwgLXRoaXMueiwgLXRoaXMudylcclxuICAgIH1cclxuXHJcbiAgICBtaW4oYjogVmVjNCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNChNYXRoLm1pbih0aGlzLngsIGIueCksIE1hdGgubWluKHRoaXMueSwgYi55KSwgTWF0aC5taW4odGhpcy56LCBiLnopLCBNYXRoLm1pbih0aGlzLncsIGIudykpXHJcbiAgICB9XHJcblxyXG4gICAgbWF4KGI6IFZlYzQpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQoTWF0aC5tYXgodGhpcy54LCBiLngpLCBNYXRoLm1heCh0aGlzLnksIGIueSksIE1hdGgubWF4KHRoaXMueiwgYi56KSwgTWF0aC5tYXgodGhpcy53LCBiLncpKVxyXG4gICAgfVxyXG5cclxuICAgIGNsYW1wKG1pbjogVmVjNCwgbWF4OiBWZWM0KTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KG1hdGguY2xhbXAodGhpcy54LCBtaW4ueCwgbWF4LngpLCBtYXRoLmNsYW1wKHRoaXMueSwgbWluLnksIG1heC55KSwgbWF0aC5jbGFtcCh0aGlzLnosIG1pbi56LCBtYXgueiksIG1hdGguY2xhbXAodGhpcy53LCBtaW4udywgbWF4LncpKVxyXG4gICAgfVxyXG5cclxuICAgIHRvU3RyaW5nKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGAoJHt0aGlzLnh9LCR7dGhpcy55fSwke3RoaXMuen0sJHt0aGlzLnd9KWBcclxuICAgIH1cclxuXHJcbiAgICB0b0FycmF5KCk6IG51bWJlcltdIHtcclxuICAgICAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55LCB0aGlzLnosIHRoaXMud11cclxuICAgIH1cclxuXHJcbiAgICBnZXQgeHkoKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCwgdGhpcy55KVxyXG4gICAgfVxyXG5cclxuICAgIGdldCB4eigpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54LCB0aGlzLnopXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHh5eigpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54LCB0aGlzLnksIHRoaXMueilcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdDIge1xyXG4gICAgc3RhdGljIGlkZW50aXR5KCk6IE1hdDIge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0MigxLCAwLCAwLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyByb3RhdGlvbih0aGV0YTogbnVtYmVyKTogTWF0MiB7XHJcbiAgICAgICAgY29uc3Qgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSlcclxuICAgICAgICBjb25zdCBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKVxyXG4gICAgICAgIHJldHVybiBuZXcgTWF0Mihjb3NUaGV0YSwgLXNpblRoZXRhLCBzaW5UaGV0YSwgY29zVGhldGEpXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgcHVibGljIG0xMTogbnVtYmVyLCBwdWJsaWMgbTEyOiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIG0yMTogbnVtYmVyLCBwdWJsaWMgbTIyOiBudW1iZXIpIHsgfVxyXG5cclxuICAgIGVxdWFsKGI6IE1hdDIpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tMTEgPT09IGIubTExICYmIHRoaXMubTEyID09PSBiLm0xMiAmJiB0aGlzLm0yMSA9PT0gYi5tMjEgJiYgdGhpcy5tMTEgPT09IGIubTIyXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogTWF0MiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQyKHRoaXMubTExLCB0aGlzLm0xMiwgdGhpcy5tMjEsIHRoaXMubTIyKVxyXG4gICAgfVxyXG5cclxuICAgIHRyYW5zcG9zZSgpOiBNYXQyIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDIodGhpcy5tMTEsIHRoaXMubTIxLCB0aGlzLm0xMiwgdGhpcy5tMjIpXHJcbiAgICB9XHJcblxyXG4gICAgbWF0bXVsKGI6IE1hdDIpOiBNYXQyIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDIoXHJcbiAgICAgICAgICAgIHRoaXMubTExICogYi5tMTEgKyB0aGlzLm0xMiAqIGIubTIxLCAvLyBtMTEsXHJcbiAgICAgICAgICAgIHRoaXMubTExICogYi5tMTIgKyB0aGlzLm0xMiAqIGIubTIyLCAvLyBtMTIsXHJcbiAgICAgICAgICAgIHRoaXMubTIxICogYi5tMTEgKyB0aGlzLm0yMiAqIGIubTIxLCAvLyBtMjEsXHJcbiAgICAgICAgICAgIHRoaXMubTIxICogYi5tMTIgKyB0aGlzLm0yMiAqIGIubTIyLCAvLyBtMjIsXHJcbiAgICAgICAgKVxyXG4gICAgfVxyXG5cclxuICAgIHRvU3RyaW5nKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGB8ICR7dGhpcy5tMTF9ICR7dGhpcy5tMTJ9IHxcclxufCAke3RoaXMubTIxfSAke3RoaXMubTIyfSB8YFxyXG4gICAgfVxyXG5cclxuICAgIHRvQXJyYXkoKTogbnVtYmVyW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHRoaXMubTExLCB0aGlzLm0xMixcclxuICAgICAgICAgICAgdGhpcy5tMjEsIHRoaXMubTIyXHJcbiAgICAgICAgXVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0MyB7XHJcbiAgICBzdGF0aWMgaWRlbnRpdHkoKTogTWF0MyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQzKFxyXG4gICAgICAgICAgICAxLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCAxLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIHB1YmxpYyBtMTE6IG51bWJlciwgcHVibGljIG0xMjogbnVtYmVyLCBwdWJsaWMgbTEzOiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIG0yMTogbnVtYmVyLCBwdWJsaWMgbTIyOiBudW1iZXIsIHB1YmxpYyBtMjM6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgbTMxOiBudW1iZXIsIHB1YmxpYyBtMzI6IG51bWJlciwgcHVibGljIG0zMzogbnVtYmVyKSB7IH1cclxuXHJcbiAgICBlcXVhbChiOiBNYXQzKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgdGhpcy5tMTEgPT09IGIubTExICYmIHRoaXMubTEyID09PSBiLm0xMiAmJiB0aGlzLm0xMyA9PT0gYi5tMTMgJiZcclxuICAgICAgICAgICAgdGhpcy5tMjEgPT09IGIubTIxICYmIHRoaXMubTIyID09PSBiLm0yMiAmJiB0aGlzLm0yMyA9PT0gYi5tMjMgJiZcclxuICAgICAgICAgICAgdGhpcy5tMzEgPT09IGIubTMxICYmIHRoaXMubTMyID09PSBiLm0zMiAmJiB0aGlzLm0zMyA9PT0gYi5tMzMpXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogTWF0MyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQzKFxyXG4gICAgICAgICAgICB0aGlzLm0xMSwgdGhpcy5tMTIsIHRoaXMubTEzLFxyXG4gICAgICAgICAgICB0aGlzLm0yMSwgdGhpcy5tMjIsIHRoaXMubTIzLFxyXG4gICAgICAgICAgICB0aGlzLm0zMSwgdGhpcy5tMzIsIHRoaXMubTMzKVxyXG4gICAgfVxyXG5cclxuICAgIHRyYW5zcG9zZSgpOiBNYXQyIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDMoXHJcbiAgICAgICAgICAgIHRoaXMubTExLCB0aGlzLm0yMSwgdGhpcy5tMzEsXHJcbiAgICAgICAgICAgIHRoaXMubTEyLCB0aGlzLm0yMiwgdGhpcy5tMzIsXHJcbiAgICAgICAgICAgIHRoaXMubTEzLCB0aGlzLm0yMywgdGhpcy5tMzMpXHJcbiAgICB9XHJcblxyXG4gICAgbWF0bXVsKGI6IE1hdDMpOiBNYXQzIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDMoXHJcbiAgICAgICAgICAgIHRoaXMubTExICogYi5tMTEgKyB0aGlzLm0xMiAqIGIubTIxICsgdGhpcy5tMTMgKiBiLm0zMSwgLy8gbTExLFxyXG4gICAgICAgICAgICB0aGlzLm0xMSAqIGIubTEyICsgdGhpcy5tMTIgKiBiLm0yMiArIHRoaXMubTEzICogYi5tMzIsIC8vIG0xMixcclxuICAgICAgICAgICAgdGhpcy5tMTEgKiBiLm0xMyArIHRoaXMubTEyICogYi5tMjMgKyB0aGlzLm0xMyAqIGIubTMzLCAvLyBtMTMsXHJcbiAgICAgICAgICAgIHRoaXMubTIxICogYi5tMTEgKyB0aGlzLm0yMiAqIGIubTIxICsgdGhpcy5tMjMgKiBiLm0zMSwgLy8gbTIxLFxyXG4gICAgICAgICAgICB0aGlzLm0yMSAqIGIubTEyICsgdGhpcy5tMjIgKiBiLm0yMiArIHRoaXMubTIzICogYi5tMzIsIC8vIG0yMixcclxuICAgICAgICAgICAgdGhpcy5tMjEgKiBiLm0xMyArIHRoaXMubTIyICogYi5tMjMgKyB0aGlzLm0yMyAqIGIubTMzLCAvLyBtMjMsXHJcbiAgICAgICAgICAgIHRoaXMubTMxICogYi5tMTEgKyB0aGlzLm0zMiAqIGIubTIxICsgdGhpcy5tMzMgKiBiLm0zMSwgLy8gbTMxLFxyXG4gICAgICAgICAgICB0aGlzLm0zMSAqIGIubTEyICsgdGhpcy5tMzIgKiBiLm0yMiArIHRoaXMubTMzICogYi5tMzIsIC8vIG0zMixcclxuICAgICAgICAgICAgdGhpcy5tMzEgKiBiLm0xMyArIHRoaXMubTMyICogYi5tMjMgKyB0aGlzLm0zMyAqIGIubTMzLCAvLyBtMzNcclxuICAgICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB0cmFuc2Zvcm0gdGhlIHZlY3RvciBieSB0aGUgc3BlY2lmaWVkIG1hdHJpeFxyXG4gICAgICogdHJlYXRzIHZlY3RvciBhcyBhIGNvbHVtbiBtYXRyaXggdG8gbGVmdCBvZiAzeDMgbWF0cml4XHJcbiAgICAgKiB8eHl6fCAqIG1cclxuICAgICAqIEBwYXJhbSBhIHZlY3RvclxyXG4gICAgICovXHJcbiAgICB0cmFuc2Zvcm0oYTogVmVjMyk6IFZlYzMge1xyXG4gICAgICAgIGNvbnN0IHggPSBhLnggKiB0aGlzLm0xMSArIGEueSAqIHRoaXMubTIxICsgYS56ICogdGhpcy5tMzFcclxuICAgICAgICBjb25zdCB5ID0gYS54ICogdGhpcy5tMTIgKyBhLnkgKiB0aGlzLm0yMiArIGEueiAqIHRoaXMubTMyXHJcbiAgICAgICAgY29uc3QgeiA9IGEueCAqIHRoaXMubTEzICsgYS55ICogdGhpcy5tMjMgKyBhLnogKiB0aGlzLm0zM1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh4LCB5LCB6KVxyXG4gICAgfVxyXG5cclxuICAgIHRvU3RyaW5nKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGB8ICR7dGhpcy5tMTF9ICR7dGhpcy5tMTJ9ICR7dGhpcy5tMTN9IHxcclxufCAke3RoaXMubTIxfSAke3RoaXMubTIyfSAke3RoaXMubTIzfSB8XHJcbnwgJHt0aGlzLm0zMX0gJHt0aGlzLm0zMn0gJHt0aGlzLm0zM30gfGBcclxuICAgIH1cclxuXHJcbiAgICB0b0FycmF5KCk6IG51bWJlcltdIHtcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICB0aGlzLm0xMSwgdGhpcy5tMTIsIHRoaXMubTEzLFxyXG4gICAgICAgICAgICB0aGlzLm0yMSwgdGhpcy5tMjIsIHRoaXMubTIzLFxyXG4gICAgICAgICAgICB0aGlzLm0zMSwgdGhpcy5tMzIsIHRoaXMubTMzLFxyXG4gICAgICAgIF1cclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdDQge1xyXG4gICAgc3RhdGljIGlkZW50aXR5KCk6IE1hdDQge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0NChcclxuICAgICAgICAgICAgMSwgMCwgMCwgMCxcclxuICAgICAgICAgICAgMCwgMSwgMCwgMCxcclxuICAgICAgICAgICAgMCwgMCwgMSwgMCxcclxuICAgICAgICAgICAgMCwgMCwgMCwgMSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgdHJhbnNsYXRpb24oYTogVmVjMyk6IE1hdDQge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0NChcclxuICAgICAgICAgICAgMSwgMCwgMCwgMCxcclxuICAgICAgICAgICAgMCwgMSwgMCwgMCxcclxuICAgICAgICAgICAgMCwgMCwgMSwgMCxcclxuICAgICAgICAgICAgYS54LCBhLnksIGEueiwgMSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgcm90YXRpb25YKHRoZXRhOiBudW1iZXIpOiBNYXQ0IHtcclxuICAgICAgICBjb25zdCBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKVxyXG4gICAgICAgIGNvbnN0IHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpXHJcblxyXG4gICAgICAgIHJldHVybiBuZXcgTWF0NChcclxuICAgICAgICAgICAgMSwgMCwgMCwgMCxcclxuICAgICAgICAgICAgMCwgY29zVGhldGEsIC1zaW5UaGV0YSwgMCxcclxuICAgICAgICAgICAgMCwgc2luVGhldGEsIGNvc1RoZXRhLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAwLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyByb3RhdGlvblkodGhldGE6IG51bWJlcik6IE1hdDQge1xyXG4gICAgICAgIGNvbnN0IGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpXHJcbiAgICAgICAgY29uc3Qgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSlcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICBjb3NUaGV0YSwgMCwgc2luVGhldGEsIDAsXHJcbiAgICAgICAgICAgIDAsIDEsIDAsIDAsXHJcbiAgICAgICAgICAgIC1zaW5UaGV0YSwgMCwgY29zVGhldGEsIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIDAsIDEpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHJvdGF0aW9uWih0aGV0YTogbnVtYmVyKTogTWF0NCB7XHJcbiAgICAgICAgY29uc3QgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSlcclxuICAgICAgICBjb25zdCBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIGNvc1RoZXRhLCAtc2luVGhldGEsIDAsIDAsXHJcbiAgICAgICAgICAgIHNpblRoZXRhLCBjb3NUaGV0YSwgMCwgMCxcclxuICAgICAgICAgICAgMCwgMCwgMSwgMCxcclxuICAgICAgICAgICAgMCwgMCwgMCwgMSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgcm90YXRpb25fYXhpcyhheGlzOiBWZWMzLCB0aGV0YTogbnVtYmVyKTogTWF0NCB7XHJcbiAgICAgICAgY29uc3QgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSlcclxuICAgICAgICBjb25zdCBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKVxyXG4gICAgICAgIGNvbnN0IHsgeCwgeSwgeiB9ID0gYXhpc1xyXG4gICAgICAgIGNvbnN0IHhTaW5UaGV0YSA9IHggKiBzaW5UaGV0YVxyXG4gICAgICAgIGNvbnN0IHlTaW5UaGV0YSA9IHkgKiBzaW5UaGV0YVxyXG4gICAgICAgIGNvbnN0IHpTaW5UaGV0YSA9IHogKiBzaW5UaGV0YVxyXG4gICAgICAgIGNvbnN0IG9uZU1pbnVzQ29zVGhldGEgPSAxIC0gY29zVGhldGFcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICBjb3NUaGV0YSArIHggKiB4ICogb25lTWludXNDb3NUaGV0YSwgeCAqIHkgKiBvbmVNaW51c0Nvc1RoZXRhIC0gelNpblRoZXRhLCB4ICogeiAqIG9uZU1pbnVzQ29zVGhldGEgKyB5U2luVGhldGEsIDAsXHJcbiAgICAgICAgICAgIHkgKiB4ICogb25lTWludXNDb3NUaGV0YSArIHpTaW5UaGV0YSwgY29zVGhldGEgKyB5ICogeSAqIG9uZU1pbnVzQ29zVGhldGEsIHkgKiB6ICogb25lTWludXNDb3NUaGV0YSAtIHhTaW5UaGV0YSwgMCxcclxuICAgICAgICAgICAgeiAqIHggKiBvbmVNaW51c0Nvc1RoZXRhIC0geVNpblRoZXRhLCB6ICogeSAqIG9uZU1pbnVzQ29zVGhldGEgKyB4U2luVGhldGEsIGNvc1RoZXRhICsgeiAqIHogKiBvbmVNaW51c0Nvc1RoZXRhLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAwLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBzY2FsaW5nKHh5ejogVmVjMyk6IE1hdDQge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0NChcclxuICAgICAgICAgICAgeHl6LngsIDAsIDAsIDAsXHJcbiAgICAgICAgICAgIDAsIHh5ei55LCAwLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCB4eXoueiwgMCxcclxuICAgICAgICAgICAgMCwgMCwgMCwgMSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNyZWF0ZSBhIHdlYmdsIHBlcnNwZWN0aXZlIG1hdHJpeFxyXG4gICAgICogQHBhcmFtIGZvdlkgeSBmb3YgKHJhZGlhbnMpXHJcbiAgICAgKiBAcGFyYW0gYXNwZWN0IGFzcGVjdCByYXRpb1xyXG4gICAgICogQHBhcmFtIG5lYXJaIG5lYXIgeiBjb29yZGluYXRlXHJcbiAgICAgKiBAcGFyYW0gZmFyWiBmYXIgeiBjb29yZGluYXRlXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBwZXJzcGVjdGl2ZShmb3ZZOiBudW1iZXIsIGFzcGVjdDogbnVtYmVyLCBuZWFyWjogbnVtYmVyLCBmYXJaOiBudW1iZXIpOiBNYXQ0IHtcclxuICAgICAgICBjb25zdCBmID0gTWF0aC50YW4oTWF0aC5QSSAqIDAuNSAtIDAuNSAqIGZvdlkpXHJcbiAgICAgICAgY29uc3QgaW52UmFuZ2UgPSAxIC8gKG5lYXJaIC0gZmFyWilcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICBmIC8gYXNwZWN0LCAwLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCBmLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAobmVhclogKyBmYXJaKSAqIGludlJhbmdlLCAtMSxcclxuICAgICAgICAgICAgMCwgMCwgbmVhclogKiBmYXJaICogaW52UmFuZ2UgKiAyLCAwXHJcbiAgICAgICAgKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29uc3RydWN0IGEgbG9vayBhdCBtYXRyaXggdGhhdCBwbGFjZXMgdGhlIGNhbWVyYSBhdCB0aGUgZXllIHBvaW50LCBsb29raW5nIGF0IHRoZSBzcGVjaWZpZWQgdGFyZ2V0XHJcbiAgICAgKiBpbnZlcnQgZm9yIGEgXCJ2aWV3XCIgbWF0cml4XHJcbiAgICAgKiBAcGFyYW0gZXllIGV5ZSBwb3NpdGlvblxyXG4gICAgICogQHBhcmFtIHRhcmdldCB0YXJnZXQgcG9zaXRpb25cclxuICAgICAqIEBwYXJhbSB1cCB1cCBheGlzXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBsb29rQXQoZXllOiBWZWMzLCB0YXJnZXQ6IFZlYzMsIHVwOiBWZWMzKTogTWF0NCB7XHJcbiAgICAgICAgY29uc3QgekF4aXMgPSBleWUuc3ViKHRhcmdldCkubm9ybWFsaXplKClcclxuICAgICAgICBjb25zdCB4QXhpcyA9IHVwLmNyb3NzKHpBeGlzKVxyXG4gICAgICAgIGNvbnN0IHlBeGlzID0gekF4aXMuY3Jvc3MoeEF4aXMpXHJcbiAgICAgICAgcmV0dXJuIE1hdDQuYmFzaXMoeEF4aXMsIHlBeGlzLCB6QXhpcywgZXllKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBiYXNpcyh4QXhpczogVmVjMywgeUF4aXM6IFZlYzMsIHpBeGlzOiBWZWMzLCB0cmFuc2xhdGlvbjogVmVjMykge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0NChcclxuICAgICAgICAgICAgeEF4aXMueCwgeEF4aXMueSwgeEF4aXMueiwgMCxcclxuICAgICAgICAgICAgeUF4aXMueCwgeUF4aXMueSwgeUF4aXMueiwgMCxcclxuICAgICAgICAgICAgekF4aXMueCwgekF4aXMueSwgekF4aXMueiwgMCxcclxuICAgICAgICAgICAgdHJhbnNsYXRpb24ueCwgdHJhbnNsYXRpb24ueSwgdHJhbnNsYXRpb24ueiwgMVxyXG4gICAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICBwdWJsaWMgbTExOiBudW1iZXIsIHB1YmxpYyBtMTI6IG51bWJlciwgcHVibGljIG0xMzogbnVtYmVyLCBwdWJsaWMgbTE0OiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIG0yMTogbnVtYmVyLCBwdWJsaWMgbTIyOiBudW1iZXIsIHB1YmxpYyBtMjM6IG51bWJlciwgcHVibGljIG0yNDogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyBtMzE6IG51bWJlciwgcHVibGljIG0zMjogbnVtYmVyLCBwdWJsaWMgbTMzOiBudW1iZXIsIHB1YmxpYyBtMzQ6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgbTQxOiBudW1iZXIsIHB1YmxpYyBtNDI6IG51bWJlciwgcHVibGljIG00MzogbnVtYmVyLCBwdWJsaWMgbTQ0OiBudW1iZXIpIHsgfVxyXG5cclxuICAgIGVxdWFsKGI6IE1hdDQpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICB0aGlzLm0xMSA9PT0gYi5tMTEgJiYgdGhpcy5tMTIgPT09IGIubTEyICYmIHRoaXMubTEzID09PSBiLm0xMyAmJiB0aGlzLm0xNCA9PT0gYi5tMTQgJiZcclxuICAgICAgICAgICAgdGhpcy5tMjEgPT09IGIubTIxICYmIHRoaXMubTIyID09PSBiLm0yMiAmJiB0aGlzLm0yMyA9PT0gYi5tMjMgJiYgdGhpcy5tMjQgPT09IGIubTI0ICYmXHJcbiAgICAgICAgICAgIHRoaXMubTMxID09PSBiLm0zMSAmJiB0aGlzLm0zMiA9PT0gYi5tMzIgJiYgdGhpcy5tMzMgPT09IGIubTMzICYmIHRoaXMubTM0ID09PSBiLm0zNCAmJlxyXG4gICAgICAgICAgICB0aGlzLm00MSA9PT0gYi5tNDEgJiYgdGhpcy5tNDIgPT09IGIubTQyICYmIHRoaXMubTQzID09PSBiLm00MyAmJiB0aGlzLm00NCA9PT0gYi5tNDQpXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogTWF0NCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICB0aGlzLm0xMSwgdGhpcy5tMTIsIHRoaXMubTEzLCB0aGlzLm0xNCxcclxuICAgICAgICAgICAgdGhpcy5tMjEsIHRoaXMubTIyLCB0aGlzLm0yMywgdGhpcy5tMjQsXHJcbiAgICAgICAgICAgIHRoaXMubTMxLCB0aGlzLm0zMiwgdGhpcy5tMzMsIHRoaXMubTM0LFxyXG4gICAgICAgICAgICB0aGlzLm00MSwgdGhpcy5tNDIsIHRoaXMubTQzLCB0aGlzLm00NClcclxuICAgIH1cclxuXHJcbiAgICB0cmFuc3Bvc2UoKTogTWF0NCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICB0aGlzLm0xMSwgdGhpcy5tMjEsIHRoaXMubTMxLCB0aGlzLm00MSxcclxuICAgICAgICAgICAgdGhpcy5tMTIsIHRoaXMubTIyLCB0aGlzLm0zMiwgdGhpcy5tNDIsXHJcbiAgICAgICAgICAgIHRoaXMubTEzLCB0aGlzLm0yMywgdGhpcy5tMzMsIHRoaXMubTQzLFxyXG4gICAgICAgICAgICB0aGlzLm0xNCwgdGhpcy5tMjQsIHRoaXMubTM0LCB0aGlzLm00NClcclxuICAgIH1cclxuXHJcbiAgICBtYXRtdWwoYjogTWF0NCk6IE1hdDQge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0NChcclxuICAgICAgICAgICAgdGhpcy5tMTEgKiBiLm0xMSArIHRoaXMubTEyICogYi5tMjEgKyB0aGlzLm0xMyAqIGIubTMxICsgdGhpcy5tMTQgKiBiLm00MSwgLy8gbTExXHJcbiAgICAgICAgICAgIHRoaXMubTExICogYi5tMTIgKyB0aGlzLm0xMiAqIGIubTIyICsgdGhpcy5tMTMgKiBiLm0zMiArIHRoaXMubTE0ICogYi5tNDIsIC8vIG0xMlxyXG4gICAgICAgICAgICB0aGlzLm0xMSAqIGIubTEzICsgdGhpcy5tMTIgKiBiLm0yMyArIHRoaXMubTEzICogYi5tMzMgKyB0aGlzLm0xNCAqIGIubTQzLCAvLyBtMTNcclxuICAgICAgICAgICAgdGhpcy5tMTEgKiBiLm0xNCArIHRoaXMubTEyICogYi5tMjQgKyB0aGlzLm0xMyAqIGIubTM0ICsgdGhpcy5tMTQgKiBiLm00NCwgLy8gbTE0XHJcbiAgICAgICAgICAgIHRoaXMubTIxICogYi5tMTEgKyB0aGlzLm0yMiAqIGIubTIxICsgdGhpcy5tMjMgKiBiLm0zMSArIHRoaXMubTI0ICogYi5tNDEsIC8vIG0yMVxyXG4gICAgICAgICAgICB0aGlzLm0yMSAqIGIubTEyICsgdGhpcy5tMjIgKiBiLm0yMiArIHRoaXMubTIzICogYi5tMzIgKyB0aGlzLm0yNCAqIGIubTQyLCAvLyBtMjJcclxuICAgICAgICAgICAgdGhpcy5tMjEgKiBiLm0xMyArIHRoaXMubTIyICogYi5tMjMgKyB0aGlzLm0yMyAqIGIubTMzICsgdGhpcy5tMjQgKiBiLm00MywgLy8gbTIzXHJcbiAgICAgICAgICAgIHRoaXMubTIxICogYi5tMTQgKyB0aGlzLm0yMiAqIGIubTI0ICsgdGhpcy5tMjMgKiBiLm0zNCArIHRoaXMubTI0ICogYi5tNDQsIC8vIG0yNFxyXG4gICAgICAgICAgICB0aGlzLm0zMSAqIGIubTExICsgdGhpcy5tMzIgKiBiLm0yMSArIHRoaXMubTMzICogYi5tMzEgKyB0aGlzLm0zNCAqIGIubTQxLCAvLyBtMzFcclxuICAgICAgICAgICAgdGhpcy5tMzEgKiBiLm0xMiArIHRoaXMubTMyICogYi5tMjIgKyB0aGlzLm0zMyAqIGIubTMyICsgdGhpcy5tMzQgKiBiLm00MiwgLy8gbTMyXHJcbiAgICAgICAgICAgIHRoaXMubTMxICogYi5tMTMgKyB0aGlzLm0zMiAqIGIubTIzICsgdGhpcy5tMzMgKiBiLm0zMyArIHRoaXMubTM0ICogYi5tNDMsIC8vIG0zM1xyXG4gICAgICAgICAgICB0aGlzLm0zMSAqIGIubTE0ICsgdGhpcy5tMzIgKiBiLm0yNCArIHRoaXMubTMzICogYi5tMzQgKyB0aGlzLm0zNCAqIGIubTQ0LCAvLyBtMzRcclxuICAgICAgICAgICAgdGhpcy5tNDEgKiBiLm0xMSArIHRoaXMubTQyICogYi5tMjEgKyB0aGlzLm00MyAqIGIubTMxICsgdGhpcy5tNDQgKiBiLm00MSwgLy8gbTQxXHJcbiAgICAgICAgICAgIHRoaXMubTQxICogYi5tMTIgKyB0aGlzLm00MiAqIGIubTIyICsgdGhpcy5tNDMgKiBiLm0zMiArIHRoaXMubTQ0ICogYi5tNDIsIC8vIG00MlxyXG4gICAgICAgICAgICB0aGlzLm00MSAqIGIubTEzICsgdGhpcy5tNDIgKiBiLm0yMyArIHRoaXMubTQzICogYi5tMzMgKyB0aGlzLm00NCAqIGIubTQzLCAvLyBtNDNcclxuICAgICAgICAgICAgdGhpcy5tNDEgKiBiLm0xNCArIHRoaXMubTQyICogYi5tMjQgKyB0aGlzLm00MyAqIGIubTM0ICsgdGhpcy5tNDQgKiBiLm00NCwgLy8gbTQ0XHJcbiAgICAgICAgKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogdHJhbnNmb3JtIHRoZSB2ZWN0b3IgYnkgdGhlIHNwZWNpZmllZCBtYXRyaXhcclxuICAgICAqIHRyZWF0cyB2ZWN0b3IgYXMgYSBjb2x1bW4gbWF0cml4IHRvIGxlZnQgb2YgNHg0IG1hdHJpeFxyXG4gICAgICogcHJvamVjdHMgYmFjayB0byB3ID0gMSBzcGFjZSBhZnRlciBtdWx0aXBsaWNhdGlvblxyXG4gICAgICogfHh5ejF8ICogbVxyXG4gICAgICogQHBhcmFtIGEgdmVjdG9yXHJcbiAgICAgKi9cclxuICAgIHRyYW5zZm9ybTMoYTogVmVjMyk6IFZlYzMge1xyXG4gICAgICAgIGNvbnN0IHcgPSBhLnggKiB0aGlzLm0xNCArIGEueSAqIHRoaXMubTI0ICsgYS56ICogdGhpcy5tMzQgKyB0aGlzLm00NFxyXG4gICAgICAgIGNvbnN0IGludlcgPSAxIC8gd1xyXG4gICAgICAgIGNvbnN0IHggPSAoYS54ICogdGhpcy5tMTEgKyBhLnkgKiB0aGlzLm0yMSArIGEueiAqIHRoaXMubTMxICsgdGhpcy5tNDEpIC8gaW52V1xyXG4gICAgICAgIGNvbnN0IHkgPSAoYS54ICogdGhpcy5tMTIgKyBhLnkgKiB0aGlzLm0yMiArIGEueiAqIHRoaXMubTMyICsgdGhpcy5tNDIpIC8gaW52V1xyXG4gICAgICAgIGNvbnN0IHogPSAoYS54ICogdGhpcy5tMTMgKyBhLnkgKiB0aGlzLm0yMyArIGEueiAqIHRoaXMubTMzICsgdGhpcy5tNDMpIC8gaW52V1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh4LCB5LCB6KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogdHJhbnNmb3JtIGEgdmVjdG9yIHVzaW5nIG1hdHJpeCBtdWx0aXBsaWNhdGlvblxyXG4gICAgICogdHJlYXRzIHZlY3RvciBhcyBhIGNvbHVtbiB2ZWN0b3IgaW4gbXVsdGlwbGljYXRpb24gfHh5end8ICogbVxyXG4gICAgICogQHBhcmFtIGEgdmVjdG9yXHJcbiAgICAgKi9cclxuICAgIHRyYW5zZm9ybTQoYTogVmVjNCk6IFZlYzQge1xyXG4gICAgICAgIGNvbnN0IHggPSBhLnggKiB0aGlzLm0xMSArIGEueSAqIHRoaXMubTIxICsgYS56ICogdGhpcy5tMzEgKyBhLncgKiB0aGlzLm00MVxyXG4gICAgICAgIGNvbnN0IHkgPSBhLnggKiB0aGlzLm0xMiArIGEueSAqIHRoaXMubTIyICsgYS56ICogdGhpcy5tMzIgKyBhLncgKiB0aGlzLm00MlxyXG4gICAgICAgIGNvbnN0IHogPSBhLnggKiB0aGlzLm0xMyArIGEueSAqIHRoaXMubTIzICsgYS56ICogdGhpcy5tMzMgKyBhLncgKiB0aGlzLm00M1xyXG4gICAgICAgIGNvbnN0IHcgPSBhLnggKiB0aGlzLm0xNCArIGEueSAqIHRoaXMubTI0ICsgYS56ICogdGhpcy5tMzQgKyBhLncgKiB0aGlzLm00NFxyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh4LCB5LCB6LCB3KVxyXG4gICAgfVxyXG5cclxuICAgIGludmVydCgpOiBNYXQ0IHtcclxuICAgICAgICBjb25zdCBzMCA9IHRoaXMubTExICogdGhpcy5tMjIgLSB0aGlzLm0xMiAqIHRoaXMubTIxO1xyXG4gICAgICAgIGNvbnN0IHMxID0gdGhpcy5tMTEgKiB0aGlzLm0yMyAtIHRoaXMubTEzICogdGhpcy5tMjE7XHJcbiAgICAgICAgY29uc3QgczIgPSB0aGlzLm0xMSAqIHRoaXMubTI0IC0gdGhpcy5tMTQgKiB0aGlzLm0yMTtcclxuICAgICAgICBjb25zdCBzMyA9IHRoaXMubTEyICogdGhpcy5tMjMgLSB0aGlzLm0xMyAqIHRoaXMubTIyO1xyXG4gICAgICAgIGNvbnN0IHM0ID0gdGhpcy5tMTIgKiB0aGlzLm0yNCAtIHRoaXMubTE0ICogdGhpcy5tMjI7XHJcbiAgICAgICAgY29uc3QgczUgPSB0aGlzLm0xMyAqIHRoaXMubTI0IC0gdGhpcy5tMTQgKiB0aGlzLm0yMztcclxuICAgICAgICBjb25zdCBjNSA9IHRoaXMubTMzICogdGhpcy5tNDQgLSB0aGlzLm0zNCAqIHRoaXMubTQzO1xyXG4gICAgICAgIGNvbnN0IGM0ID0gdGhpcy5tMzIgKiB0aGlzLm00NCAtIHRoaXMubTM0ICogdGhpcy5tNDI7XHJcbiAgICAgICAgY29uc3QgYzMgPSB0aGlzLm0zMiAqIHRoaXMubTQzIC0gdGhpcy5tMzMgKiB0aGlzLm00MjtcclxuICAgICAgICBjb25zdCBjMiA9IHRoaXMubTMxICogdGhpcy5tNDQgLSB0aGlzLm0zNCAqIHRoaXMubTQxO1xyXG4gICAgICAgIGNvbnN0IGMxID0gdGhpcy5tMzEgKiB0aGlzLm00MyAtIHRoaXMubTMzICogdGhpcy5tNDE7XHJcbiAgICAgICAgY29uc3QgYzAgPSB0aGlzLm0zMSAqIHRoaXMubTQyIC0gdGhpcy5tMzIgKiB0aGlzLm00MTtcclxuICAgICAgICBjb25zdCBkZXQgPSBzMCAqIGM1IC0gczEgKiBjNCArIHMyICogYzMgKyBzMyAqIGMyIC0gczQgKiBjMSArIHM1ICogYzA7XHJcblxyXG4gICAgICAgIGlmIChkZXQgPT09IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgaW52ZXJ0XCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgICh0aGlzLm0yMiAqIGM1IC0gdGhpcy5tMjMgKiBjNCArIHRoaXMubTI0ICogYzMpIC8gZGV0LCAoLXRoaXMubTEyICogYzUgKyB0aGlzLm0xMyAqIGM0IC0gdGhpcy5tMTQgKiBjMykgLyBkZXQsICh0aGlzLm00MiAqIHM1IC0gdGhpcy5tNDMgKiBzNCArIHRoaXMubTQ0ICogczMpIC8gZGV0LCAoLXRoaXMubTMyICogczUgKyB0aGlzLm0zMyAqIHM0IC0gdGhpcy5tMzQgKiBzMykgLyBkZXQsXHJcbiAgICAgICAgICAgICgtdGhpcy5tMjEgKiBjNSArIHRoaXMubTIzICogYzIgLSB0aGlzLm0yNCAqIGMxKSAvIGRldCwgKHRoaXMubTExICogYzUgLSB0aGlzLm0xMyAqIGMyICsgdGhpcy5tMTQgKiBjMSkgLyBkZXQsICgtdGhpcy5tNDEgKiBzNSArIHRoaXMubTQzICogczIgLSB0aGlzLm00NCAqIHMxKSAvIGRldCwgKHRoaXMubTMxICogczUgLSB0aGlzLm0zMyAqIHMyICsgdGhpcy5tMzQgKiBzMSkgLyBkZXQsXHJcbiAgICAgICAgICAgICh0aGlzLm0yMSAqIGM0IC0gdGhpcy5tMjIgKiBjMiArIHRoaXMubTI0ICogYzApIC8gZGV0LCAoLXRoaXMubTExICogYzQgKyB0aGlzLm0xMiAqIGMyIC0gdGhpcy5tMTQgKiBjMCkgLyBkZXQsICh0aGlzLm00MSAqIHM0IC0gdGhpcy5tNDIgKiBzMiArIHRoaXMubTQ0ICogczApIC8gZGV0LCAoLXRoaXMubTMxICogczQgKyB0aGlzLm0zMiAqIHMyIC0gdGhpcy5tMzQgKiBzMCkgLyBkZXQsXHJcbiAgICAgICAgICAgICgtdGhpcy5tMjEgKiBjMyArIHRoaXMubTIyICogYzEgLSB0aGlzLm0yMyAqIGMwKSAvIGRldCwgKHRoaXMubTExICogYzMgLSB0aGlzLm0xMiAqIGMxICsgdGhpcy5tMTMgKiBjMCkgLyBkZXQsICgtdGhpcy5tNDEgKiBzMyArIHRoaXMubTQyICogczEgLSB0aGlzLm00MyAqIHMwKSAvIGRldCwgKHRoaXMubTMxICogczMgLSB0aGlzLm0zMiAqIHMxICsgdGhpcy5tMzMgKiBzMCkgLyBkZXRcclxuICAgICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgdG9NYXQzKCk6IE1hdDMge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0MyhcclxuICAgICAgICAgICAgdGhpcy5tMTEsIHRoaXMubTEyLCB0aGlzLm0xMyxcclxuICAgICAgICAgICAgdGhpcy5tMjEsIHRoaXMubTIyLCB0aGlzLm0yMyxcclxuICAgICAgICAgICAgdGhpcy5tMzEsIHRoaXMubTMyLCB0aGlzLm0zM1xyXG4gICAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICB0b1N0cmluZygpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBgfCAke3RoaXMubTExfSAke3RoaXMubTEyfSAke3RoaXMubTEzfSAke3RoaXMubTE0fSB8XHJcbnwgJHt0aGlzLm0yMX0gJHt0aGlzLm0yMn0gJHt0aGlzLm0yM30gJHt0aGlzLm0yNH0gfFxyXG58ICR7dGhpcy5tMzF9ICR7dGhpcy5tMzJ9ICR7dGhpcy5tMzN9ICR7dGhpcy5tMzR9IHxcclxufCAke3RoaXMubTQxfSAke3RoaXMubTQyfSAke3RoaXMubTQzfSAke3RoaXMubTQ0fSB8YFxyXG4gICAgfVxyXG5cclxuICAgIHRvQXJyYXkoKTogbnVtYmVyW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHRoaXMubTExLCB0aGlzLm0xMiwgdGhpcy5tMTMsIHRoaXMubTE0LFxyXG4gICAgICAgICAgICB0aGlzLm0yMSwgdGhpcy5tMjIsIHRoaXMubTIzLCB0aGlzLm0yNCxcclxuICAgICAgICAgICAgdGhpcy5tMzEsIHRoaXMubTMyLCB0aGlzLm0zMywgdGhpcy5tMzQsXHJcbiAgICAgICAgICAgIHRoaXMubTQxLCB0aGlzLm00MiwgdGhpcy5tNDMsIHRoaXMubTQ0LFxyXG4gICAgICAgIF1cclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEFBQkIge1xyXG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IG1pbjogVmVjMywgcHVibGljIHJlYWRvbmx5IG1heDogVmVjMykgeyB9XHJcblxyXG4gICAgc3RhdGljIGZyb21Qb2ludHMocHRzOiBJdGVyYWJsZTxWZWMzPik6IEFBQkIge1xyXG4gICAgICAgIGxldCBtaW4gPSBWZWMzLmluZigpXHJcbiAgICAgICAgbGV0IG1heCA9IG1pbi5uZWcoKVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHB0IG9mIHB0cykge1xyXG4gICAgICAgICAgICBtaW4gPSBtaW4ubWluKHB0KVxyXG4gICAgICAgICAgICBtYXggPSBtYXgubWF4KHB0KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgYWFiYiA9IG5ldyBBQUJCKG1pbiwgbWF4KVxyXG4gICAgICAgIHJldHVybiBhYWJiXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGZyb21IYWxmRXh0ZW50cyhoYWxmRXh0ZW50czogVmVjMyk6IEFBQkIge1xyXG4gICAgICAgIHJldHVybiBuZXcgQUFCQihoYWxmRXh0ZW50cy5uZWcoKSwgaGFsZkV4dGVudHMpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGZyb21Qb3NpdGlvbkhhbGZFeHRlbnRzKHBvc2l0aW9uOiBWZWMzLCBoYWxmRXh0ZW50czogVmVjMyk6IEFBQkIge1xyXG4gICAgICAgIHJldHVybiBuZXcgQUFCQihwb3NpdGlvbi5zdWIoaGFsZkV4dGVudHMpLCBwb3NpdGlvbi5hZGQoaGFsZkV4dGVudHMpKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBmcm9tQ29vcmRzKG1pblg6IG51bWJlciwgbWluWTogbnVtYmVyLCBtaW5aOiBudW1iZXIsIG1heFg6IG51bWJlciwgbWF4WTogbnVtYmVyLCBtYXhaOiBudW1iZXIpOiBBQUJCIHtcclxuICAgICAgICByZXR1cm4gbmV3IEFBQkIobmV3IFZlYzMobWluWCwgbWluWSwgbWluWiksIG5ldyBWZWMzKG1heFgsIG1heFksIG1heFopKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBleHRlbnRzKCk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1heC5zdWIodGhpcy5taW4pXHJcbiAgICB9XHJcblxyXG4gICAgdW5pb24oYWFiYjogQUFCQik6IEFBQkIge1xyXG4gICAgICAgIGNvbnN0IHUgPSBuZXcgQUFCQih0aGlzLm1pbi5taW4oYWFiYi5taW4pLCB0aGlzLm1heC5tYXgoYWFiYi5tYXgpKVxyXG4gICAgICAgIHJldHVybiB1XHJcbiAgICB9XHJcblxyXG4gICAgaW50ZXJzZWN0aW9uKGFhYmI6IEFBQkIpOiBBQUJCIHtcclxuICAgICAgICBjb25zdCBpeCA9IG5ldyBBQUJCKHRoaXMubWluLm1heChhYWJiLm1pbiksIHRoaXMubWF4Lm1pbihhYWJiLm1heCkpXHJcbiAgICAgICAgcmV0dXJuIGl4XHJcbiAgICB9XHJcblxyXG4gICAgb3ZlcmxhcHMoYWFiYjogQUFCQik6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgIHRoaXMubWF4LnggPj0gYWFiYi5taW4ueCAmJlxyXG4gICAgICAgICAgICB0aGlzLm1heC55ID49IGFhYmIubWluLnkgJiZcclxuICAgICAgICAgICAgdGhpcy5tYXgueiA+PSBhYWJiLm1pbi56ICYmXHJcbiAgICAgICAgICAgIHRoaXMubWluLnggPD0gYWFiYi5tYXgueCAmJlxyXG4gICAgICAgICAgICB0aGlzLm1pbi55IDw9IGFhYmIubWF4LnkgJiZcclxuICAgICAgICAgICAgdGhpcy5taW4ueiA8PSBhYWJiLm1heC56XHJcbiAgICAgICAgKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnRhaW5zKHB0OiBWZWMzKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgcHQueCA+PSB0aGlzLm1pbi54ICYmXHJcbiAgICAgICAgICAgIHB0LnkgPj0gdGhpcy5taW4ueSAmJlxyXG4gICAgICAgICAgICBwdC56ID49IHRoaXMubWluLnogJiZcclxuICAgICAgICAgICAgcHQueCA8IHRoaXMubWF4LnggJiZcclxuICAgICAgICAgICAgcHQueSA8IHRoaXMubWF4LnkgJiZcclxuICAgICAgICAgICAgcHQueiA8IHRoaXMubWF4LnpcclxuICAgICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgdHJhbnNsYXRlKG9mZnNldDogVmVjMyk6IEFBQkIge1xyXG4gICAgICAgIHJldHVybiBuZXcgQUFCQih0aGlzLm1pbi5hZGQob2Zmc2V0KSwgdGhpcy5tYXguYWRkKG9mZnNldCkpXHJcbiAgICB9XHJcblxyXG4gICAgc2NhbGUoczogbnVtYmVyKTogQUFCQiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBQUJCKHRoaXMubWluLm11bFgocyksIHRoaXMubWF4Lm11bFgocykpXHJcbiAgICB9XHJcblxyXG4gICAgYnVmZmVyKHBhZGRpbmc6IG51bWJlcik6IEFBQkIge1xyXG4gICAgICAgIGNvbnN0IGFhYmIgPSBuZXcgQUFCQih0aGlzLm1pbi5hZGRYKC1wYWRkaW5nKSwgdGhpcy5tYXguYWRkWChwYWRkaW5nKSlcclxuICAgICAgICByZXR1cm4gYWFiYlxyXG4gICAgfVxyXG5cclxuICAgIHNocmluayhhbW91bnQ6IG51bWJlcik6IEFBQkIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJ1ZmZlcigtYW1vdW50KVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEFBQkIge1xyXG4gICAgICAgIHJldHVybiBuZXcgQUFCQih0aGlzLm1pbi5jbG9uZSgpLCB0aGlzLm1heC5jbG9uZSgpKVxyXG4gICAgfVxyXG59Il19