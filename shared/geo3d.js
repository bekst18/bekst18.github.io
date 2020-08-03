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
    static negInf() {
        return new Vec2(-Infinity, -Infinity);
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
    static zero() {
        return new Vec4(0, 0, 0, 0);
    }
    equal(b) {
        return this.x === b.x && this.y === b.y && this.z === b.z && this.w === b.w;
    }
    clone() {
        return new Vec4(this.x, this.y, this.z, this.w);
    }
    set(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        this.w = v.w;
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
    floor() {
        return new Vec4(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z), Math.floor(this.w));
    }
    ceil() {
        return new Vec4(Math.ceil(this.x), Math.ceil(this.y), Math.ceil(this.z), Math.ceil(this.w));
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
    static rotationX(theta) {
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        return new Mat3(1, 0, 0, 0, cosTheta, -sinTheta, 0, sinTheta, cosTheta);
    }
    static rotationY(theta) {
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        return new Mat3(cosTheta, 0, sinTheta, 0, 1, 0, -sinTheta, 0, cosTheta);
    }
    static rotationZ(theta) {
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        return new Mat3(cosTheta, -sinTheta, 0, sinTheta, cosTheta, 0, 0, 0, 1);
    }
    static rotation_axis(axis, theta) {
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        const { x, y, z } = axis;
        const xSinTheta = x * sinTheta;
        const ySinTheta = y * sinTheta;
        const zSinTheta = z * sinTheta;
        const oneMinusCosTheta = 1 - cosTheta;
        return new Mat3(cosTheta + x * x * oneMinusCosTheta, x * y * oneMinusCosTheta - zSinTheta, x * z * oneMinusCosTheta + ySinTheta, y * x * oneMinusCosTheta + zSinTheta, cosTheta + y * y * oneMinusCosTheta, y * z * oneMinusCosTheta - xSinTheta, z * x * oneMinusCosTheta - ySinTheta, z * y * oneMinusCosTheta + xSinTheta, cosTheta + z * z * oneMinusCosTheta);
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
export class Rect {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }
    static empty() {
        return new Rect(Vec2.inf(), Vec2.negInf());
    }
    static fromPoints(pts) {
        let min = Vec2.inf();
        let max = min.neg();
        for (const pt of pts) {
            min = min.min(pt);
            max = max.max(pt);
        }
        const rect = new Rect(min, max);
        return rect;
    }
    static fromHalfExtents(halfExtents) {
        return new Rect(halfExtents.neg(), halfExtents);
    }
    static fromPositionHalfExtents(position, halfExtents) {
        return new Rect(position.sub(halfExtents), position.add(halfExtents));
    }
    static fromCoords(minX, minY, maxX, maxY) {
        return new Rect(new Vec2(minX, minY), new Vec2(maxX, maxY));
    }
    get extents() {
        return this.max.sub(this.min);
    }
    get width() {
        return this.max.x - this.min.x;
    }
    get height() {
        return this.max.y - this.min.y;
    }
    get center() {
        return new Vec2(this.min.x + this.width / 2, this.min.y + this.height / 2);
    }
    union(rect) {
        const u = new Rect(this.min.min(rect.min), this.max.max(rect.max));
        return u;
    }
    extend(pt) {
        const r = new Rect(this.min.min(pt), this.max.max(pt));
        return r;
    }
    intersection(rect) {
        const ix = new Rect(this.min.max(rect.min), this.max.min(rect.max));
        return ix;
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
        return new Rect(this.min.add(offset), this.max.add(offset));
    }
    scale(s) {
        return new Rect(this.min.mulX(s), this.max.mulX(s));
    }
    buffer(padding) {
        const rect = new Rect(this.min.addX(-padding), this.max.addX(padding));
        return rect;
    }
    shrink(amount) {
        return this.buffer(-amount);
    }
    clone() {
        return new Rect(this.min.clone(), this.max.clone());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VvM2QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZW8zZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBRXpDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLElBQUk7SUFDYixZQUFtQixDQUFTLEVBQVMsQ0FBUztRQUEzQixNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQVMsTUFBQyxHQUFELENBQUMsQ0FBUTtJQUFJLENBQUM7SUFFbkQsTUFBTSxDQUFDLEdBQUc7UUFDTixPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQU07UUFDVCxPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVELEtBQUssQ0FBQyxDQUFPO1FBQ1QsT0FBTyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFTO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBUztRQUNWLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3RDLENB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S0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFTO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBUztRQUNWLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFTO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFRCxLQUFLLENBQUMsQ0FBTztRQUNULE9BQU8sSUFBSSxJQUFJLENBQ1gsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFDM0IsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFDM0IsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxRQUFRO1FBQ0osT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFFRCxNQUFNO1FBQ0YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsU0FBUztRQUNMLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsR0FBRztRQUNDLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN6RSxDQUFDO0lBRUQsSUFBSTtRQUNBLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM1RSxDQUFDO0lBRUQsR0FBRztRQUNDLE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDeEYsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3hGLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBUyxFQUFFLEdBQVM7UUFDdEIsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3pILENBQUM7SUFFRCxRQUFRO1FBQ0osT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUE7SUFDNUMsQ0FBQztJQUVELE9BQU87UUFDSCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxFQUFFO1FBQ0YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxFQUFFO1FBQ0YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ0osT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ0osT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sSUFBSTtJQUNiLFlBQW1CLENBQVMsRUFBUyxDQUFTLEVBQVMsQ0FBUyxFQUFTLENBQVM7UUFBL0QsTUFBQyxHQUFELENBQUMsQ0FBUTtRQUFTLE1BQUMsR0FBRCxDQUFDLENBQVE7UUFBUyxNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQVMsTUFBQyxHQUFELENBQUMsQ0FBUTtJQUFJLENBQUM7SUFFdkYsTUFBTSxDQUFDLEdBQUc7UUFDTixPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFRCxNQUFNLENBQUMsSUFBSTtRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDL0IsQ0FBQztJQUVELEtBQUssQ0FBQyxDQUFPO1FBQ1QsT0FBTyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0UsQ0FBQztJQUVELEtBQUs7UUFDRCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDWixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDWixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDWixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDaEIsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFTO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBUztRQUNWLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFTO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNFLENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVELE1BQU07UUFDRixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxTQUFTO1FBQ0wsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxHQUFHO1FBQ0MsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNGLENBQUM7SUFFRCxJQUFJO1FBQ0EsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQy9GLENBQUM7SUFFRCxHQUFHO1FBQ0MsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuRyxDQUFDO0lBRUQsSUFBSTtRQUNBLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMvRixDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMvRyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMvRyxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQVMsRUFBRSxHQUFTO1FBQ3RCLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0osQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFBO0lBQ3RELENBQUM7SUFFRCxPQUFPO1FBQ0gsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsSUFBSSxFQUFFO1FBQ0YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxFQUFFO1FBQ0YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxHQUFHO1FBQ0gsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDSjtB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LEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFDNUIsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQzVCLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELE1BQU0sQ0FBQyxDQUFPO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FDWCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPO1FBQy9ELElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU87UUFDL0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTztRQUMvRCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPO1FBQy9ELElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU87UUFDL0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTztRQUMvRCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPO1FBQy9ELElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU87UUFDL0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQ3pELENBQUE7SUFDTCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFTLENBQUMsQ0FBTztRQUNiLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxH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Q0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUc7WUFDcEYsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRztZQUNwRixJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUM3RixDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxJQUFJLENBQ1gsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFDdEMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFDdEMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFDdEMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFRCxTQUFTO1FBQ0wsT0FBTyxJQUFJLElBQUksQ0FDWCxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELE1BQU0sQ0FBQyxDQUFPO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FDWCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQzVFLENBQUE7SUFDTCxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsVUFBVSxDQUFDLENBQU87UUFDZCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO1FBQ3JFLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFBO1FBQzlFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQTtRQUM5RSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUE7UUFDOUUsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzVCLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsVUFBVSxDQUFDLENBQU87UUFDZCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7UUFDM0UsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQTtRQUMzRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7UUFDM0UsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRUQsTUFBTTtRQUNGLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBRXRFLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRTtZQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUE7U0FDbEM7UUFFRCxPQUFPLElBQUksSUFBSSxDQUNYLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUM1TixDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFDNU4sQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQzVOLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUMvTixDQUFBO0lBQ0wsQ0FBQztJQUVELE1BQU07UUFDRixPQUFPLElBQUksSUFBSSxDQUNYLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUM1QixJQUFJLENBQUMsR0FBRyxFQUFFLElBQUks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QUksQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQy9ELENBQUM7SUFFRCxJQUFJLE9BQU87UUFDUCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsSUFBSSxLQUFLO1FBQ0wsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ04sT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ04sT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzlFLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBVTtRQUNaLE1BQU0sQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsRSxPQUFPLENBQUMsQ0FBQTtJQUNaLENBQUM7SUFFRCxNQUFNLENBQUMsRUFBUTtRQUNYLE1BQU0sQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdEQsT0FBTyxDQUFDLENBQUE7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QUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUE7SUFDekQsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTTtRQUNGLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFVBQVUsQ0FBQyxFQUFRO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRDs7O09BR0c7SUFDSCxTQUFTLENBQUMsR0FBUztRQUNmLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDNUMsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbEQsT0FBTyxLQUFLLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsUUFBUTtRQUNKLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUNyQyxDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBtYXRoIGZyb20gXCIuLi9zaGFyZWQvbWF0aC5qc1wiXHJcblxyXG4vKipcclxuICogM2QgbWF0aCBsaWJyYXJ5XHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVmVjMiB7XHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgeDogbnVtYmVyLCBwdWJsaWMgeTogbnVtYmVyKSB7IH1cclxuXHJcbiAgICBzdGF0aWMgaW5mKCk6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMihJbmZpbml0eSwgSW5maW5pdHkpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIG5lZ0luZigpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIoLUluZmluaXR5LCAtSW5maW5pdHkpXHJcbiAgICB9XHJcblxyXG4gICAgZXF1YWwoYjogVmVjMik6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnggPT09IGIueCAmJiB0aGlzLnkgPT09IGIueVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzLngsIHRoaXMueSlcclxuICAgIH1cclxuXHJcbiAgICBhZGRYKHg6IG51bWJlcik6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzLnggKyB4LCB0aGlzLnkgKyB4KVxyXG4gICAgfVxyXG5cclxuICAgIHN1YlgoeDogbnVtYmVyKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCAtIHgsIHRoaXMueSAtIHgpXHJcbiAgICB9XHJcblxyXG4gICAgbXVsWCh4OiBudW1iZXIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54ICogeCwgdGhpcy55ICogeClcclxuICAgIH1cclxuXHJcbiAgICBkaXZYKHg6IG51bWJlcik6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzLnggLyB4LCB0aGlzLnkgLyB4KVxyXG4gICAgfVxyXG5cclxuICAgIGFkZChiOiBWZWMyKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCArIGIueCwgdGhpcy55ICsgYi55KVxyXG4gICAgfVxyXG5cclxuICAgIHN1YihiOiBWZWMyKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCAtIGIueCwgdGhpcy55IC0gYi55KVxyXG4gICAgfVxyXG5cclxuICAgIG11bChiOiBWZWMyKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCAqIGIueCwgdGhpcy55ICogYi55KVxyXG4gICAgfVxyXG5cclxuICAgIGRpdihiOiBWZWMyKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCAvIGIueCwgdGhpcy55IC8gYi55KVxyXG4gICAgfVxyXG5cclxuICAgIGRvdChiOiBWZWMyKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy54ICogYi54ICsgdGhpcy55ICogYi55XHJcbiAgICB9XHJcblxyXG4gICAgbGVuZ3RoU3EoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kb3QodGhpcylcclxuICAgIH1cclxuXHJcbiAgICBsZW5ndGgoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMuZG90KHRoaXMpKVxyXG4gICAgfVxyXG5cclxuICAgIG5vcm1hbGl6ZSgpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kaXZYKHRoaXMubGVuZ3RoKCkpXHJcbiAgICB9XHJcblxyXG4gICAgYWJzKCk6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMihNYXRoLmFicyh0aGlzLngpLCBNYXRoLmFicyh0aGlzLnkpKVxyXG4gICAgfVxyXG5cclxuICAgIHNpZ24oKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKE1hdGguc2lnbih0aGlzLngpLCBNYXRoLnNpZ24odGhpcy55KSlcclxuICAgIH1cclxuXHJcbiAgICBuZWcoKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKC10aGlzLngsIC10aGlzLnkpXHJcbiAgICB9XHJcblxyXG4gICAgbWluKGI6IFZlYzIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIoTWF0aC5taW4odGhpcy54LCBiLngpLCBNYXRoLm1pbih0aGlzLnksIGIueSkpXHJcbiAgICB9XHJcblxyXG4gICAgbWF4KGI6IFZlYzIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIoTWF0aC5tYXgodGhpcy54LCBiLngpLCBNYXRoLm1heCh0aGlzLnksIGIueSkpXHJcbiAgICB9XHJcblxyXG4gICAgY2xhbXAobWluOiBWZWMyLCBtYXg6IFZlYzIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIobWF0aC5jbGFtcCh0aGlzLngsIG1pbi54LCBtYXgueCksIG1hdGguY2xhbXAodGhpcy55LCBtaW4ueSwgbWF4LnkpKVxyXG4gICAgfVxyXG5cclxuICAgIHRvU3RyaW5nKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGAoJHt0aGlzLnh9LCR7dGhpcy55fSlgXHJcbiAgICB9XHJcblxyXG4gICAgdG9BcnJheSgpOiBudW1iZXJbXSB7XHJcbiAgICAgICAgcmV0dXJuIFt0aGlzLngsIHRoaXMueV1cclxuICAgIH1cclxuXHJcbiAgICBnZXQgeHkwKCk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzLngsIHRoaXMueSwgMClcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFZlYzMge1xyXG4gICAgY29uc3RydWN0b3IocHVibGljIHg6IG51bWJlciwgcHVibGljIHk6IG51bWJlciwgcHVibGljIHo6IG51bWJlcikgeyB9XHJcblxyXG4gICAgc3RhdGljIGluZigpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzMoSW5maW5pdHksIEluZmluaXR5LCBJbmZpbml0eSlcclxuICAgIH1cclxuXHJcbiAgICBlcXVhbChiOiBWZWMzKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCA9PT0gYi54ICYmIHRoaXMueSA9PT0gYi55ICYmIHRoaXMueiA9PT0gYi56XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXMueCwgdGhpcy55LCB0aGlzLnopXHJcbiAgICB9XHJcblxyXG4gICAgYWRkWCh4OiBudW1iZXIpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54ICsgeCwgdGhpcy55ICsgeCwgdGhpcy56ICsgeClcclxuICAgIH1cclxuXHJcbiAgICBzdWJYKHg6IG51bWJlcik6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzLnggLSB4LCB0aGlzLnkgLSB4LCB0aGlzLnogLSB4KVxyXG4gICAgfVxyXG5cclxuICAgIG11bFgoeDogbnVtYmVyKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXMueCAqIHgsIHRoaXMueSAqIHgsIHRoaXMueiAqIHgpXHJcbiAgICB9XHJcblxyXG4gICAgZGl2WCh4OiBudW1iZXIpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54IC8geCwgdGhpcy55IC8geCwgdGhpcy56IC8geClcclxuICAgIH1cclxuXHJcbiAgICBhZGQoYjogVmVjMyk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzLnggKyBiLngsIHRoaXMueSArIGIueSwgdGhpcy56ICsgYi56KVxyXG4gICAgfVxyXG5cclxuICAgIHN1YihiOiBWZWMzKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXMueCAtIGIueCwgdGhpcy55IC0gYi55LCB0aGlzLnogLSBiLnopXHJcbiAgICB9XHJcblxyXG4gICAgbXVsKGI6IFZlYzMpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54ICogYi54LCB0aGlzLnkgKiBiLnksIHRoaXMueiAqIGIueilcclxuICAgIH1cclxuXHJcbiAgICBkaXYoYjogVmVjMyk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzLnggLyBiLngsIHRoaXMueSAvIGIueSwgdGhpcy56IC8gYi56KVxyXG4gICAgfVxyXG5cclxuICAgIGRvdChiOiBWZWMzKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy54ICogYi54ICsgdGhpcy55ICogYi55ICsgdGhpcy56ICogYi56XHJcbiAgICB9XHJcblxyXG4gICAgY3Jvc3MoYjogVmVjMyk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyhcclxuICAgICAgICAgICAgdGhpcy55ICogYi56IC0gdGhpcy56ICogYi55LFxyXG4gICAgICAgICAgICB0aGlzLnogKiBiLnggLSB0aGlzLnggKiBiLnosXHJcbiAgICAgICAgICAgIHRoaXMueCAqIGIueSAtIHRoaXMueSAqIGIueClcclxuICAgIH1cclxuXHJcbiAgICBsZW5ndGhTcSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRvdCh0aGlzKVxyXG4gICAgfVxyXG5cclxuICAgIGxlbmd0aCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5kb3QodGhpcykpXHJcbiAgICB9XHJcblxyXG4gICAgbm9ybWFsaXplKCk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRpdlgodGhpcy5sZW5ndGgoKSlcclxuICAgIH1cclxuXHJcbiAgICBhYnMoKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKE1hdGguYWJzKHRoaXMueCksIE1hdGguYWJzKHRoaXMueSksIE1hdGguYWJzKHRoaXMueikpXHJcbiAgICB9XHJcblxyXG4gICAgc2lnbigpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzMoTWF0aC5zaWduKHRoaXMueCksIE1hdGguc2lnbih0aGlzLnkpLCBNYXRoLnNpZ24odGhpcy56KSlcclxuICAgIH1cclxuXHJcbiAgICBuZWcoKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKC10aGlzLngsIC10aGlzLnksIC10aGlzLnopXHJcbiAgICB9XHJcblxyXG4gICAgbWluKGI6IFZlYzMpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzMoTWF0aC5taW4odGhpcy54LCBiLngpLCBNYXRoLm1pbih0aGlzLnksIGIueSksIE1hdGgubWluKHRoaXMueiwgYi56KSlcclxuICAgIH1cclxuXHJcbiAgICBtYXgoYjogVmVjMyk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyhNYXRoLm1heCh0aGlzLngsIGIueCksIE1hdGgubWF4KHRoaXMueSwgYi55KSwgTWF0aC5tYXgodGhpcy56LCBiLnopKVxyXG4gICAgfVxyXG5cclxuICAgIGNsYW1wKG1pbjogVmVjMywgbWF4OiBWZWMzKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKG1hdGguY2xhbXAodGhpcy54LCBtaW4ueCwgbWF4LngpLCBtYXRoLmNsYW1wKHRoaXMueSwgbWluLnksIG1heC55KSwgbWF0aC5jbGFtcCh0aGlzLnosIG1pbi56LCBtYXgueikpXHJcbiAgICB9XHJcblxyXG4gICAgdG9TdHJpbmcoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gYCgke3RoaXMueH0sJHt0aGlzLnl9LCR7dGhpcy56fSlgXHJcbiAgICB9XHJcblxyXG4gICAgdG9BcnJheSgpOiBudW1iZXJbXSB7XHJcbiAgICAgICAgcmV0dXJuIFt0aGlzLngsIHRoaXMueSwgdGhpcy56XVxyXG4gICAgfVxyXG5cclxuICAgIGdldCB4eSgpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54LCB0aGlzLnkpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHh6KCk6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzLngsIHRoaXMueilcclxuICAgIH1cclxuXHJcbiAgICBnZXQgeHl6MCgpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpcy54LCB0aGlzLnksIHRoaXMueiwgMClcclxuICAgIH1cclxuXHJcbiAgICBnZXQgeHl6MSgpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpcy54LCB0aGlzLnksIHRoaXMueiwgMSlcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFZlYzQge1xyXG4gICAgY29uc3RydWN0b3IocHVibGljIHg6IG51bWJlciwgcHVibGljIHk6IG51bWJlciwgcHVibGljIHo6IG51bWJlciwgcHVibGljIHc6IG51bWJlcikgeyB9XHJcblxyXG4gICAgc3RhdGljIGluZigpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQoSW5maW5pdHksIEluZmluaXR5LCBJbmZpbml0eSwgSW5maW5pdHkpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHplcm8oKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KDAsIDAsIDAsIDApXHJcbiAgICB9XHJcblxyXG4gICAgZXF1YWwoYjogVmVjNCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnggPT09IGIueCAmJiB0aGlzLnkgPT09IGIueSAmJiB0aGlzLnogPT09IGIueiAmJiB0aGlzLncgPT09IGIud1xyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLngsIHRoaXMueSwgdGhpcy56LCB0aGlzLncpXHJcbiAgICB9XHJcblxyXG4gICAgc2V0KHY6IFZlYzQpIHtcclxuICAgICAgICB0aGlzLnggPSB2LnhcclxuICAgICAgICB0aGlzLnkgPSB2LnlcclxuICAgICAgICB0aGlzLnogPSB2LnpcclxuICAgICAgICB0aGlzLncgPSB2LndcclxuICAgIH1cclxuXHJcbiAgICBhZGRYKHg6IG51bWJlcik6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLnggKyB4LCB0aGlzLnkgKyB4LCB0aGlzLnogKyB4LCB0aGlzLncgKyB4KVxyXG4gICAgfVxyXG5cclxuICAgIHN1YlgoeDogbnVtYmVyKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXMueCAtIHgsIHRoaXMueSAtIHgsIHRoaXMueiAtIHgsIHRoaXMudyAtIHgpXHJcbiAgICB9XHJcblxyXG4gICAgbXVsWCh4OiBudW1iZXIpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpcy54ICogeCwgdGhpcy55ICogeCwgdGhpcy56ICogeCwgdGhpcy53ICogeClcclxuICAgIH1cclxuXHJcbiAgICBkaXZYKHg6IG51bWJlcik6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLnggLyB4LCB0aGlzLnkgLyB4LCB0aGlzLnogLyB4LCB0aGlzLncgLyB4KVxyXG4gICAgfVxyXG5cclxuICAgIGFkZChiOiBWZWM0KTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXMueCArIGIueCwgdGhpcy55ICsgYi55LCB0aGlzLnogKyBiLnosIHRoaXMudyArIGIudylcclxuICAgIH1cclxuXHJcbiAgICBzdWIoYjogVmVjNCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLnggLSBiLngsIHRoaXMueSAtIGIueSwgdGhpcy56IC0gYi56LCB0aGlzLncgLSBiLncpXHJcbiAgICB9XHJcblxyXG4gICAgbXVsKGI6IFZlYzQpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpcy54ICogYi54LCB0aGlzLnkgKiBiLnksIHRoaXMueiAqIGIueiwgdGhpcy53IC0gYi53KVxyXG4gICAgfVxyXG5cclxuICAgIGRpdihiOiBWZWM0KTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXMueCAvIGIueCwgdGhpcy55IC8gYi55LCB0aGlzLnogLyBiLnosIHRoaXMudyAvIGIudylcclxuICAgIH1cclxuXHJcbiAgICBkb3QoYjogVmVjNCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCAqIGIueCArIHRoaXMueSAqIGIueSArIHRoaXMueiAqIGIueiArIHRoaXMudyAqIGIud1xyXG4gICAgfVxyXG5cclxuICAgIGxlbmd0aFNxKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZG90KHRoaXMpXHJcbiAgICB9XHJcblxyXG4gICAgbGVuZ3RoKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmRvdCh0aGlzKSlcclxuICAgIH1cclxuXHJcbiAgICBub3JtYWxpemUoKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZGl2WCh0aGlzLmxlbmd0aCgpKVxyXG4gICAgfVxyXG5cclxuICAgIGFicygpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQoTWF0aC5hYnModGhpcy54KSwgTWF0aC5hYnModGhpcy55KSwgTWF0aC5hYnModGhpcy56KSwgTWF0aC5hYnModGhpcy53KSlcclxuICAgIH1cclxuXHJcbiAgICBzaWduKCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNChNYXRoLnNpZ24odGhpcy54KSwgTWF0aC5zaWduKHRoaXMueSksIE1hdGguc2lnbih0aGlzLnopLCBNYXRoLnNpZ24odGhpcy53KSlcclxuICAgIH1cclxuXHJcbiAgICBuZWcoKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KC10aGlzLngsIC10aGlzLnksIC10aGlzLnosIC10aGlzLncpXHJcbiAgICB9XHJcblxyXG4gICAgZmxvb3IoKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KE1hdGguZmxvb3IodGhpcy54KSwgTWF0aC5mbG9vcih0aGlzLnkpLCBNYXRoLmZsb29yKHRoaXMueiksIE1hdGguZmxvb3IodGhpcy53KSlcclxuICAgIH1cclxuXHJcbiAgICBjZWlsKCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNChNYXRoLmNlaWwodGhpcy54KSwgTWF0aC5jZWlsKHRoaXMueSksIE1hdGguY2VpbCh0aGlzLnopLCBNYXRoLmNlaWwodGhpcy53KSlcclxuICAgIH1cclxuXHJcbiAgICBtaW4oYjogVmVjNCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNChNYXRoLm1pbih0aGlzLngsIGIueCksIE1hdGgubWluKHRoaXMueSwgYi55KSwgTWF0aC5taW4odGhpcy56LCBiLnopLCBNYXRoLm1pbih0aGlzLncsIGIudykpXHJcbiAgICB9XHJcblxyXG4gICAgbWF4KGI6IFZlYzQpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQoTWF0aC5tYXgodGhpcy54LCBiLngpLCBNYXRoLm1heCh0aGlzLnksIGIueSksIE1hdGgubWF4KHRoaXMueiwgYi56KSwgTWF0aC5tYXgodGhpcy53LCBiLncpKVxyXG4gICAgfVxyXG5cclxuICAgIGNsYW1wKG1pbjogVmVjNCwgbWF4OiBWZWM0KTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KG1hdGguY2xhbXAodGhpcy54LCBtaW4ueCwgbWF4LngpLCBtYXRoLmNsYW1wKHRoaXMueSwgbWluLnksIG1heC55KSwgbWF0aC5jbGFtcCh0aGlzLnosIG1pbi56LCBtYXgueiksIG1hdGguY2xhbXAodGhpcy53LCBtaW4udywgbWF4LncpKVxyXG4gICAgfVxyXG5cclxuICAgIHRvU3RyaW5nKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGAoJHt0aGlzLnh9LCR7dGhpcy55fSwke3RoaXMuen0sJHt0aGlzLnd9KWBcclxuICAgIH1cclxuXHJcbiAgICB0b0FycmF5KCk6IG51bWJlcltdIHtcclxuICAgICAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55LCB0aGlzLnosIHRoaXMud11cclxuICAgIH1cclxuXHJcbiAgICBnZXQgeHkoKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCwgdGhpcy55KVxyXG4gICAgfVxyXG5cclxuICAgIGdldCB4eigpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54LCB0aGlzLnopXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHh5eigpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54LCB0aGlzLnksIHRoaXMueilcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdDIge1xyXG4gICAgc3RhdGljIGlkZW50aXR5KCk6IE1hdDIge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0MigxLCAwLCAwLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyByb3RhdGlvbih0aGV0YTogbnVtYmVyKTogTWF0MiB7XHJcbiAgICAgICAgY29uc3Qgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSlcclxuICAgICAgICBjb25zdCBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKVxyXG4gICAgICAgIHJldHVybiBuZXcgTWF0Mihjb3NUaGV0YSwgLXNpblRoZXRhLCBzaW5UaGV0YSwgY29zVGhldGEpXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgcHVibGljIG0xMTogbnVtYmVyLCBwdWJsaWMgbTEyOiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIG0yMTogbnVtYmVyLCBwdWJsaWMgbTIyOiBudW1iZXIpIHsgfVxyXG5cclxuICAgIGVxdWFsKGI6IE1hdDIpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tMTEgPT09IGIubTExICYmIHRoaXMubTEyID09PSBiLm0xMiAmJiB0aGlzLm0yMSA9PT0gYi5tMjEgJiYgdGhpcy5tMTEgPT09IGIubTIyXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogTWF0MiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQyKHRoaXMubTExLCB0aGlzLm0xMiwgdGhpcy5tMjEsIHRoaXMubTIyKVxyXG4gICAgfVxyXG5cclxuICAgIHRyYW5zcG9zZSgpOiBNYXQyIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDIodGhpcy5tMTEsIHRoaXMubTIxLCB0aGlzLm0xMiwgdGhpcy5tMjIpXHJcbiAgICB9XHJcblxyXG4gICAgbWF0bXVsKGI6IE1hdDIpOiBNYXQyIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDIoXHJcbiAgICAgICAgICAgIHRoaXMubTExICogYi5tMTEgKyB0aGlzLm0xMiAqIGIubTIxLCAvLyBtMTEsXHJcbiAgICAgICAgICAgIHRoaXMubTExICogYi5tMTIgKyB0aGlzLm0xMiAqIGIubTIyLCAvLyBtMTIsXHJcbiAgICAgICAgICAgIHRoaXMubTIxICogYi5tMTEgKyB0aGlzLm0yMiAqIGIubTIxLCAvLyBtMjEsXHJcbiAgICAgICAgICAgIHRoaXMubTIxICogYi5tMTIgKyB0aGlzLm0yMiAqIGIubTIyLCAvLyBtMjIsXHJcbiAgICAgICAgKVxyXG4gICAgfVxyXG5cclxuICAgIHRvU3RyaW5nKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGB8ICR7dGhpcy5tMTF9ICR7dGhpcy5tMTJ9IHxcclxufCAke3RoaXMubTIxfSAke3RoaXMubTIyfSB8YFxyXG4gICAgfVxyXG5cclxuICAgIHRvQXJyYXkoKTogbnVtYmVyW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHRoaXMubTExLCB0aGlzLm0xMixcclxuICAgICAgICAgICAgdGhpcy5tMjEsIHRoaXMubTIyXHJcbiAgICAgICAgXVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0MyB7XHJcbiAgICBzdGF0aWMgaWRlbnRpdHkoKTogTWF0MyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQzKFxyXG4gICAgICAgICAgICAxLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCAxLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyByb3RhdGlvblgodGhldGE6IG51bWJlcik6IE1hdDMge1xyXG4gICAgICAgIGNvbnN0IGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpXHJcbiAgICAgICAgY29uc3Qgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSlcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQzKFxyXG4gICAgICAgICAgICAxLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCBjb3NUaGV0YSwgLXNpblRoZXRhLFxyXG4gICAgICAgICAgICAwLCBzaW5UaGV0YSwgY29zVGhldGEpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHJvdGF0aW9uWSh0aGV0YTogbnVtYmVyKTogTWF0MyB7XHJcbiAgICAgICAgY29uc3QgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSlcclxuICAgICAgICBjb25zdCBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IE1hdDMoXHJcbiAgICAgICAgICAgIGNvc1RoZXRhLCAwLCBzaW5UaGV0YSxcclxuICAgICAgICAgICAgMCwgMSwgMCxcclxuICAgICAgICAgICAgLXNpblRoZXRhLCAwLCBjb3NUaGV0YSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgcm90YXRpb25aKHRoZXRhOiBudW1iZXIpOiBNYXQzIHtcclxuICAgICAgICBjb25zdCBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKVxyXG4gICAgICAgIGNvbnN0IHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpXHJcblxyXG4gICAgICAgIHJldHVybiBuZXcgTWF0MyhcclxuICAgICAgICAgICAgY29zVGhldGEsIC1zaW5UaGV0YSwgMCxcclxuICAgICAgICAgICAgc2luVGhldGEsIGNvc1RoZXRhLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyByb3RhdGlvbl9heGlzKGF4aXM6IFZlYzMsIHRoZXRhOiBudW1iZXIpOiBNYXQzIHtcclxuICAgICAgICBjb25zdCBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKVxyXG4gICAgICAgIGNvbnN0IHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpXHJcbiAgICAgICAgY29uc3QgeyB4LCB5LCB6IH0gPSBheGlzXHJcbiAgICAgICAgY29uc3QgeFNpblRoZXRhID0geCAqIHNpblRoZXRhXHJcbiAgICAgICAgY29uc3QgeVNpblRoZXRhID0geSAqIHNpblRoZXRhXHJcbiAgICAgICAgY29uc3QgelNpblRoZXRhID0geiAqIHNpblRoZXRhXHJcbiAgICAgICAgY29uc3Qgb25lTWludXNDb3NUaGV0YSA9IDEgLSBjb3NUaGV0YVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IE1hdDMoXHJcbiAgICAgICAgICAgIGNvc1RoZXRhICsgeCAqIHggKiBvbmVNaW51c0Nvc1RoZXRhLCB4ICogeSAqIG9uZU1pbnVzQ29zVGhldGEgLSB6U2luVGhldGEsIHggKiB6ICogb25lTWludXNDb3NUaGV0YSArIHlTaW5UaGV0YSxcclxuICAgICAgICAgICAgeSAqIHggKiBvbmVNaW51c0Nvc1RoZXRhICsgelNpblRoZXRhLCBjb3NUaGV0YSArIHkgKiB5ICogb25lTWludXNDb3NUaGV0YSwgeSAqIHogKiBvbmVNaW51c0Nvc1RoZXRhIC0geFNpblRoZXRhLFxyXG4gICAgICAgICAgICB6ICogeCAqIG9uZU1pbnVzQ29zVGhldGEgLSB5U2luVGhldGEsIHogKiB5ICogb25lTWludXNDb3NUaGV0YSArIHhTaW5UaGV0YSwgY29zVGhldGEgKyB6ICogeiAqIG9uZU1pbnVzQ29zVGhldGEpXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgcHVibGljIG0xMTogbnVtYmVyLCBwdWJsaWMgbTEyOiBudW1iZXIsIHB1YmxpYyBtMTM6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgbTIxOiBudW1iZXIsIHB1YmxpYyBtMjI6IG51bWJlciwgcHVibGljIG0yMzogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyBtMzE6IG51bWJlciwgcHVibGljIG0zMjogbnVtYmVyLCBwdWJsaWMgbTMzOiBudW1iZXIpIHsgfVxyXG5cclxuICAgIGVxdWFsKGI6IE1hdDMpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICB0aGlzLm0xMSA9PT0gYi5tMTEgJiYgdGhpcy5tMTIgPT09IGIubTEyICYmIHRoaXMubTEzID09PSBiLm0xMyAmJlxyXG4gICAgICAgICAgICB0aGlzLm0yMSA9PT0gYi5tMjEgJiYgdGhpcy5tMjIgPT09IGIubTIyICYmIHRoaXMubTIzID09PSBiLm0yMyAmJlxyXG4gICAgICAgICAgICB0aGlzLm0zMSA9PT0gYi5tMzEgJiYgdGhpcy5tMzIgPT09IGIubTMyICYmIHRoaXMubTMzID09PSBiLm0zMylcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBNYXQzIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDMoXHJcbiAgICAgICAgICAgIHRoaXMubTExLCB0aGlzLm0xMiwgdGhpcy5tMTMsXHJcbiAgICAgICAgICAgIHRoaXMubTIxLCB0aGlzLm0yMiwgdGhpcy5tMjMsXHJcbiAgICAgICAgICAgIHRoaXMubTMxLCB0aGlzLm0zMiwgdGhpcy5tMzMpXHJcbiAgICB9XHJcblxyXG4gICAgdHJhbnNwb3NlKCk6IE1hdDIge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0MyhcclxuICAgICAgICAgICAgdGhpcy5tMTEsIHRoaXMubTIxLCB0aGlzLm0zMSxcclxuICAgICAgICAgICAgdGhpcy5tMTIsIHRoaXMubTIyLCB0aGlzLm0zMixcclxuICAgICAgICAgICAgdGhpcy5tMTMsIHRoaXMubTIzLCB0aGlzLm0zMylcclxuICAgIH1cclxuXHJcbiAgICBtYXRtdWwoYjogTWF0Myk6IE1hdDMge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0MyhcclxuICAgICAgICAgICAgdGhpcy5tMTEgKiBiLm0xMSArIHRoaXMubTEyICogYi5tMjEgKyB0aGlzLm0xMyAqIGIubTMxLCAvLyBtMTEsXHJcbiAgICAgICAgICAgIHRoaXMubTExICogYi5tMTIgKyB0aGlzLm0xMiAqIGIubTIyICsgdGhpcy5tMTMgKiBiLm0zMiwgLy8gbTEyLFxyXG4gICAgICAgICAgICB0aGlzLm0xMSAqIGIubTEzICsgdGhpcy5tMTIgKiBiLm0yMyArIHRoaXMubTEzICogYi5tMzMsIC8vIG0xMyxcclxuICAgICAgICAgICAgdGhpcy5tMjEgKiBiLm0xMSArIHRoaXMubTIyICogYi5tMjEgKyB0aGlzLm0yMyAqIGIubTMxLCAvLyBtMjEsXHJcbiAgICAgICAgICAgIHRoaXMubTIxICogYi5tMTIgKyB0aGlzLm0yMiAqIGIubTIyICsgdGhpcy5tMjMgKiBiLm0zMiwgLy8gbTIyLFxyXG4gICAgICAgICAgICB0aGlzLm0yMSAqIGIubTEzICsgdGhpcy5tMjIgKiBiLm0yMyArIHRoaXMubTIzICogYi5tMzMsIC8vIG0yMyxcclxuICAgICAgICAgICAgdGhpcy5tMzEgKiBiLm0xMSArIHRoaXMubTMyICogYi5tMjEgKyB0aGlzLm0zMyAqIGIubTMxLCAvLyBtMzEsXHJcbiAgICAgICAgICAgIHRoaXMubTMxICogYi5tMTIgKyB0aGlzLm0zMiAqIGIubTIyICsgdGhpcy5tMzMgKiBiLm0zMiwgLy8gbTMyLFxyXG4gICAgICAgICAgICB0aGlzLm0zMSAqIGIubTEzICsgdGhpcy5tMzIgKiBiLm0yMyArIHRoaXMubTMzICogYi5tMzMsIC8vIG0zM1xyXG4gICAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHRyYW5zZm9ybSB0aGUgdmVjdG9yIGJ5IHRoZSBzcGVjaWZpZWQgbWF0cml4XHJcbiAgICAgKiB0cmVhdHMgdmVjdG9yIGFzIGEgY29sdW1uIG1hdHJpeCB0byBsZWZ0IG9mIDN4MyBtYXRyaXhcclxuICAgICAqIHx4eXp8ICogbVxyXG4gICAgICogQHBhcmFtIGEgdmVjdG9yXHJcbiAgICAgKi9cclxuICAgIHRyYW5zZm9ybShhOiBWZWMzKTogVmVjMyB7XHJcbiAgICAgICAgY29uc3QgeCA9IGEueCAqIHRoaXMubTExICsgYS55ICogdGhpcy5tMjEgKyBhLnogKiB0aGlzLm0zMVxyXG4gICAgICAgIGNvbnN0IHkgPSBhLnggKiB0aGlzLm0xMiArIGEueSAqIHRoaXMubTIyICsgYS56ICogdGhpcy5tMzJcclxuICAgICAgICBjb25zdCB6ID0gYS54ICogdGhpcy5tMTMgKyBhLnkgKiB0aGlzLm0yMyArIGEueiAqIHRoaXMubTMzXHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHgsIHksIHopXHJcbiAgICB9XHJcblxyXG4gICAgdG9TdHJpbmcoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gYHwgJHt0aGlzLm0xMX0gJHt0aGlzLm0xMn0gJHt0aGlzLm0xM30gfFxyXG58ICR7dGhpcy5tMjF9ICR7dGhpcy5tMjJ9ICR7dGhpcy5tMjN9IHxcclxufCAke3RoaXMubTMxfSAke3RoaXMubTMyfSAke3RoaXMubTMzfSB8YFxyXG4gICAgfVxyXG5cclxuICAgIHRvQXJyYXkoKTogbnVtYmVyW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHRoaXMubTExLCB0aGlzLm0xMiwgdGhpcy5tMTMsXHJcbiAgICAgICAgICAgIHRoaXMubTIxLCB0aGlzLm0yMiwgdGhpcy5tMjMsXHJcbiAgICAgICAgICAgIHRoaXMubTMxLCB0aGlzLm0zMiwgdGhpcy5tMzMsXHJcbiAgICAgICAgXVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0NCB7XHJcbiAgICBzdGF0aWMgaWRlbnRpdHkoKTogTWF0NCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICAxLCAwLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCAxLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAxLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAwLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyB0cmFuc2xhdGlvbihhOiBWZWMzKTogTWF0NCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICAxLCAwLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCAxLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAxLCAwLFxyXG4gICAgICAgICAgICBhLngsIGEueSwgYS56LCAxKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyByb3RhdGlvblgodGhldGE6IG51bWJlcik6IE1hdDQge1xyXG4gICAgICAgIGNvbnN0IGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpXHJcbiAgICAgICAgY29uc3Qgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSlcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICAxLCAwLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCBjb3NUaGV0YSwgLXNpblRoZXRhLCAwLFxyXG4gICAgICAgICAgICAwLCBzaW5UaGV0YSwgY29zVGhldGEsIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIDAsIDEpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHJvdGF0aW9uWSh0aGV0YTogbnVtYmVyKTogTWF0NCB7XHJcbiAgICAgICAgY29uc3QgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSlcclxuICAgICAgICBjb25zdCBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIGNvc1RoZXRhLCAwLCBzaW5UaGV0YSwgMCxcclxuICAgICAgICAgICAgMCwgMSwgMCwgMCxcclxuICAgICAgICAgICAgLXNpblRoZXRhLCAwLCBjb3NUaGV0YSwgMCxcclxuICAgICAgICAgICAgMCwgMCwgMCwgMSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgcm90YXRpb25aKHRoZXRhOiBudW1iZXIpOiBNYXQ0IHtcclxuICAgICAgICBjb25zdCBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKVxyXG4gICAgICAgIGNvbnN0IHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpXHJcblxyXG4gICAgICAgIHJldHVybiBuZXcgTWF0NChcclxuICAgICAgICAgICAgY29zVGhldGEsIC1zaW5UaGV0YSwgMCwgMCxcclxuICAgICAgICAgICAgc2luVGhldGEsIGNvc1RoZXRhLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAxLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAwLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyByb3RhdGlvbl9heGlzKGF4aXM6IFZlYzMsIHRoZXRhOiBudW1iZXIpOiBNYXQ0IHtcclxuICAgICAgICBjb25zdCBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKVxyXG4gICAgICAgIGNvbnN0IHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpXHJcbiAgICAgICAgY29uc3QgeyB4LCB5LCB6IH0gPSBheGlzXHJcbiAgICAgICAgY29uc3QgeFNpblRoZXRhID0geCAqIHNpblRoZXRhXHJcbiAgICAgICAgY29uc3QgeVNpblRoZXRhID0geSAqIHNpblRoZXRhXHJcbiAgICAgICAgY29uc3QgelNpblRoZXRhID0geiAqIHNpblRoZXRhXHJcbiAgICAgICAgY29uc3Qgb25lTWludXNDb3NUaGV0YSA9IDEgLSBjb3NUaGV0YVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIGNvc1RoZXRhICsgeCAqIHggKiBvbmVNaW51c0Nvc1RoZXRhLCB4ICogeSAqIG9uZU1pbnVzQ29zVGhldGEgLSB6U2luVGhldGEsIHggKiB6ICogb25lTWludXNDb3NUaGV0YSArIHlTaW5UaGV0YSwgMCxcclxuICAgICAgICAgICAgeSAqIHggKiBvbmVNaW51c0Nvc1RoZXRhICsgelNpblRoZXRhLCBjb3NUaGV0YSArIHkgKiB5ICogb25lTWludXNDb3NUaGV0YSwgeSAqIHogKiBvbmVNaW51c0Nvc1RoZXRhIC0geFNpblRoZXRhLCAwLFxyXG4gICAgICAgICAgICB6ICogeCAqIG9uZU1pbnVzQ29zVGhldGEgLSB5U2luVGhldGEsIHogKiB5ICogb25lTWludXNDb3NUaGV0YSArIHhTaW5UaGV0YSwgY29zVGhldGEgKyB6ICogeiAqIG9uZU1pbnVzQ29zVGhldGEsIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIDAsIDEpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHNjYWxpbmcoeHl6OiBWZWMzKTogTWF0NCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICB4eXoueCwgMCwgMCwgMCxcclxuICAgICAgICAgICAgMCwgeHl6LnksIDAsIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIHh5ei56LCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAwLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY3JlYXRlIGEgd2ViZ2wgcGVyc3BlY3RpdmUgbWF0cml4XHJcbiAgICAgKiBAcGFyYW0gZm92WSB5IGZvdiAocmFkaWFucylcclxuICAgICAqIEBwYXJhbSBhc3BlY3QgYXNwZWN0IHJhdGlvXHJcbiAgICAgKiBAcGFyYW0gbmVhclogbmVhciB6IGNvb3JkaW5hdGVcclxuICAgICAqIEBwYXJhbSBmYXJaIGZhciB6IGNvb3JkaW5hdGVcclxuICAgICAqL1xyXG4gICAgc3RhdGljIHBlcnNwZWN0aXZlKGZvdlk6IG51bWJlciwgYXNwZWN0OiBudW1iZXIsIG5lYXJaOiBudW1iZXIsIGZhclo6IG51bWJlcik6IE1hdDQge1xyXG4gICAgICAgIGNvbnN0IGYgPSBNYXRoLnRhbihNYXRoLlBJICogMC41IC0gMC41ICogZm92WSlcclxuICAgICAgICBjb25zdCBpbnZSYW5nZSA9IDEgLyAobmVhclogLSBmYXJaKVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIGYgLyBhc3BlY3QsIDAsIDAsIDAsXHJcbiAgICAgICAgICAgIDAsIGYsIDAsIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIChuZWFyWiArIGZhclopICogaW52UmFuZ2UsIC0xLFxyXG4gICAgICAgICAgICAwLCAwLCBuZWFyWiAqIGZhclogKiBpbnZSYW5nZSAqIDIsIDBcclxuICAgICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb25zdHJ1Y3QgYSBsb29rIGF0IG1hdHJpeCB0aGF0IHBsYWNlcyB0aGUgY2FtZXJhIGF0IHRoZSBleWUgcG9pbnQsIGxvb2tpbmcgYXQgdGhlIHNwZWNpZmllZCB0YXJnZXRcclxuICAgICAqIGludmVydCBmb3IgYSBcInZpZXdcIiBtYXRyaXhcclxuICAgICAqIEBwYXJhbSBleWUgZXllIHBvc2l0aW9uXHJcbiAgICAgKiBAcGFyYW0gdGFyZ2V0IHRhcmdldCBwb3NpdGlvblxyXG4gICAgICogQHBhcmFtIHVwIHVwIGF4aXNcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGxvb2tBdChleWU6IFZlYzMsIHRhcmdldDogVmVjMywgdXA6IFZlYzMpOiBNYXQ0IHtcclxuICAgICAgICBjb25zdCB6QXhpcyA9IGV5ZS5zdWIodGFyZ2V0KS5ub3JtYWxpemUoKVxyXG4gICAgICAgIGNvbnN0IHhBeGlzID0gdXAuY3Jvc3MoekF4aXMpXHJcbiAgICAgICAgY29uc3QgeUF4aXMgPSB6QXhpcy5jcm9zcyh4QXhpcylcclxuICAgICAgICByZXR1cm4gTWF0NC5iYXNpcyh4QXhpcywgeUF4aXMsIHpBeGlzLCBleWUpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGJhc2lzKHhBeGlzOiBWZWMzLCB5QXhpczogVmVjMywgekF4aXM6IFZlYzMsIHRyYW5zbGF0aW9uOiBWZWMzKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICB4QXhpcy54LCB4QXhpcy55LCB4QXhpcy56LCAwLFxyXG4gICAgICAgICAgICB5QXhpcy54LCB5QXhpcy55LCB5QXhpcy56LCAwLFxyXG4gICAgICAgICAgICB6QXhpcy54LCB6QXhpcy55LCB6QXhpcy56LCAwLFxyXG4gICAgICAgICAgICB0cmFuc2xhdGlvbi54LCB0cmFuc2xhdGlvbi55LCB0cmFuc2xhdGlvbi56LCAxXHJcbiAgICAgICAgKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIHB1YmxpYyBtMTE6IG51bWJlciwgcHVibGljIG0xMjogbnVtYmVyLCBwdWJsaWMgbTEzOiBudW1iZXIsIHB1YmxpYyBtMTQ6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgbTIxOiBudW1iZXIsIHB1YmxpYyBtMjI6IG51bWJlciwgcHVibGljIG0yMzogbnVtYmVyLCBwdWJsaWMgbTI0OiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIG0zMTogbnVtYmVyLCBwdWJsaWMgbTMyOiBudW1iZXIsIHB1YmxpYyBtMzM6IG51bWJlciwgcHVibGljIG0zNDogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyBtNDE6IG51bWJlciwgcHVibGljIG00MjogbnVtYmVyLCBwdWJsaWMgbTQzOiBudW1iZXIsIHB1YmxpYyBtNDQ6IG51bWJlcikgeyB9XHJcblxyXG4gICAgZXF1YWwoYjogTWF0NCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgIHRoaXMubTExID09PSBiLm0xMSAmJiB0aGlzLm0xMiA9PT0gYi5tMTIgJiYgdGhpcy5tMTMgPT09IGIubTEzICYmIHRoaXMubTE0ID09PSBiLm0xNCAmJlxyXG4gICAgICAgICAgICB0aGlzLm0yMSA9PT0gYi5tMjEgJiYgdGhpcy5tMjIgPT09IGIubTIyICYmIHRoaXMubTIzID09PSBiLm0yMyAmJiB0aGlzLm0yNCA9PT0gYi5tMjQgJiZcclxuICAgICAgICAgICAgdGhpcy5tMzEgPT09IGIubTMxICYmIHRoaXMubTMyID09PSBiLm0zMiAmJiB0aGlzLm0zMyA9PT0gYi5tMzMgJiYgdGhpcy5tMzQgPT09IGIubTM0ICYmXHJcbiAgICAgICAgICAgIHRoaXMubTQxID09PSBiLm00MSAmJiB0aGlzLm00MiA9PT0gYi5tNDIgJiYgdGhpcy5tNDMgPT09IGIubTQzICYmIHRoaXMubTQ0ID09PSBiLm00NClcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBNYXQ0IHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIHRoaXMubTExLCB0aGlzLm0xMiwgdGhpcy5tMTMsIHRoaXMubTE0LFxyXG4gICAgICAgICAgICB0aGlzLm0yMSwgdGhpcy5tMjIsIHRoaXMubTIzLCB0aGlzLm0yNCxcclxuICAgICAgICAgICAgdGhpcy5tMzEsIHRoaXMubTMyLCB0aGlzLm0zMywgdGhpcy5tMzQsXHJcbiAgICAgICAgICAgIHRoaXMubTQxLCB0aGlzLm00MiwgdGhpcy5tNDMsIHRoaXMubTQ0KVxyXG4gICAgfVxyXG5cclxuICAgIHRyYW5zcG9zZSgpOiBNYXQ0IHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIHRoaXMubTExLCB0aGlzLm0yMSwgdGhpcy5tMzEsIHRoaXMubTQxLFxyXG4gICAgICAgICAgICB0aGlzLm0xMiwgdGhpcy5tMjIsIHRoaXMubTMyLCB0aGlzLm00MixcclxuICAgICAgICAgICAgdGhpcy5tMTMsIHRoaXMubTIzLCB0aGlzLm0zMywgdGhpcy5tNDMsXHJcbiAgICAgICAgICAgIHRoaXMubTE0LCB0aGlzLm0yNCwgdGhpcy5tMzQsIHRoaXMubTQ0KVxyXG4gICAgfVxyXG5cclxuICAgIG1hdG11bChiOiBNYXQ0KTogTWF0NCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICB0aGlzLm0xMSAqIGIubTExICsgdGhpcy5tMTIgKiBiLm0yMSArIHRoaXMubTEzICogYi5tMzEgKyB0aGlzLm0xNCAqIGIubTQxLCAvLyBtMTFcclxuICAgICAgICAgICAgdGhpcy5tMTEgKiBiLm0xMiArIHRoaXMubTEyICogYi5tMjIgKyB0aGlzLm0xMyAqIGIubTMyICsgdGhpcy5tMTQgKiBiLm00MiwgLy8gbTEyXHJcbiAgICAgICAgICAgIHRoaXMubTExICogYi5tMTMgKyB0aGlzLm0xMiAqIGIubTIzICsgdGhpcy5tMTMgKiBiLm0zMyArIHRoaXMubTE0ICogYi5tNDMsIC8vIG0xM1xyXG4gICAgICAgICAgICB0aGlzLm0xMSAqIGIubTE0ICsgdGhpcy5tMTIgKiBiLm0yNCArIHRoaXMubTEzICogYi5tMzQgKyB0aGlzLm0xNCAqIGIubTQ0LCAvLyBtMTRcclxuICAgICAgICAgICAgdGhpcy5tMjEgKiBiLm0xMSArIHRoaXMubTIyICogYi5tMjEgKyB0aGlzLm0yMyAqIGIubTMxICsgdGhpcy5tMjQgKiBiLm00MSwgLy8gbTIxXHJcbiAgICAgICAgICAgIHRoaXMubTIxICogYi5tMTIgKyB0aGlzLm0yMiAqIGIubTIyICsgdGhpcy5tMjMgKiBiLm0zMiArIHRoaXMubTI0ICogYi5tNDIsIC8vIG0yMlxyXG4gICAgICAgICAgICB0aGlzLm0yMSAqIGIubTEzICsgdGhpcy5tMjIgKiBiLm0yMyArIHRoaXMubTIzICogYi5tMzMgKyB0aGlzLm0yNCAqIGIubTQzLCAvLyBtMjNcclxuICAgICAgICAgICAgdGhpcy5tMjEgKiBiLm0xNCArIHRoaXMubTIyICogYi5tMjQgKyB0aGlzLm0yMyAqIGIubTM0ICsgdGhpcy5tMjQgKiBiLm00NCwgLy8gbTI0XHJcbiAgICAgICAgICAgIHRoaXMubTMxICogYi5tMTEgKyB0aGlzLm0zMiAqIGIubTIxICsgdGhpcy5tMzMgKiBiLm0zMSArIHRoaXMubTM0ICogYi5tNDEsIC8vIG0zMVxyXG4gICAgICAgICAgICB0aGlzLm0zMSAqIGIubTEyICsgdGhpcy5tMzIgKiBiLm0yMiArIHRoaXMubTMzICogYi5tMzIgKyB0aGlzLm0zNCAqIGIubTQyLCAvLyBtMzJcclxuICAgICAgICAgICAgdGhpcy5tMzEgKiBiLm0xMyArIHRoaXMubTMyICogYi5tMjMgKyB0aGlzLm0zMyAqIGIubTMzICsgdGhpcy5tMzQgKiBiLm00MywgLy8gbTMzXHJcbiAgICAgICAgICAgIHRoaXMubTMxICogYi5tMTQgKyB0aGlzLm0zMiAqIGIubTI0ICsgdGhpcy5tMzMgKiBiLm0zNCArIHRoaXMubTM0ICogYi5tNDQsIC8vIG0zNFxyXG4gICAgICAgICAgICB0aGlzLm00MSAqIGIubTExICsgdGhpcy5tNDIgKiBiLm0yMSArIHRoaXMubTQzICogYi5tMzEgKyB0aGlzLm00NCAqIGIubTQxLCAvLyBtNDFcclxuICAgICAgICAgICAgdGhpcy5tNDEgKiBiLm0xMiArIHRoaXMubTQyICogYi5tMjIgKyB0aGlzLm00MyAqIGIubTMyICsgdGhpcy5tNDQgKiBiLm00MiwgLy8gbTQyXHJcbiAgICAgICAgICAgIHRoaXMubTQxICogYi5tMTMgKyB0aGlzLm00MiAqIGIubTIzICsgdGhpcy5tNDMgKiBiLm0zMyArIHRoaXMubTQ0ICogYi5tNDMsIC8vIG00M1xyXG4gICAgICAgICAgICB0aGlzLm00MSAqIGIubTE0ICsgdGhpcy5tNDIgKiBiLm0yNCArIHRoaXMubTQzICogYi5tMzQgKyB0aGlzLm00NCAqIGIubTQ0LCAvLyBtNDRcclxuICAgICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB0cmFuc2Zvcm0gdGhlIHZlY3RvciBieSB0aGUgc3BlY2lmaWVkIG1hdHJpeFxyXG4gICAgICogdHJlYXRzIHZlY3RvciBhcyBhIGNvbHVtbiBtYXRyaXggdG8gbGVmdCBvZiA0eDQgbWF0cml4XHJcbiAgICAgKiBwcm9qZWN0cyBiYWNrIHRvIHcgPSAxIHNwYWNlIGFmdGVyIG11bHRpcGxpY2F0aW9uXHJcbiAgICAgKiB8eHl6MXwgKiBtXHJcbiAgICAgKiBAcGFyYW0gYSB2ZWN0b3JcclxuICAgICAqL1xyXG4gICAgdHJhbnNmb3JtMyhhOiBWZWMzKTogVmVjMyB7XHJcbiAgICAgICAgY29uc3QgdyA9IGEueCAqIHRoaXMubTE0ICsgYS55ICogdGhpcy5tMjQgKyBhLnogKiB0aGlzLm0zNCArIHRoaXMubTQ0XHJcbiAgICAgICAgY29uc3QgaW52VyA9IDEgLyB3XHJcbiAgICAgICAgY29uc3QgeCA9IChhLnggKiB0aGlzLm0xMSArIGEueSAqIHRoaXMubTIxICsgYS56ICogdGhpcy5tMzEgKyB0aGlzLm00MSkgKiBpbnZXXHJcbiAgICAgICAgY29uc3QgeSA9IChhLnggKiB0aGlzLm0xMiArIGEueSAqIHRoaXMubTIyICsgYS56ICogdGhpcy5tMzIgKyB0aGlzLm00MikgKiBpbnZXXHJcbiAgICAgICAgY29uc3QgeiA9IChhLnggKiB0aGlzLm0xMyArIGEueSAqIHRoaXMubTIzICsgYS56ICogdGhpcy5tMzMgKyB0aGlzLm00MykgKiBpbnZXXHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHgsIHksIHopXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB0cmFuc2Zvcm0gYSB2ZWN0b3IgdXNpbmcgbWF0cml4IG11bHRpcGxpY2F0aW9uXHJcbiAgICAgKiB0cmVhdHMgdmVjdG9yIGFzIGEgY29sdW1uIHZlY3RvciBpbiBtdWx0aXBsaWNhdGlvbiB8eHl6d3wgKiBtXHJcbiAgICAgKiBAcGFyYW0gYSB2ZWN0b3JcclxuICAgICAqL1xyXG4gICAgdHJhbnNmb3JtNChhOiBWZWM0KTogVmVjNCB7XHJcbiAgICAgICAgY29uc3QgeCA9IGEueCAqIHRoaXMubTExICsgYS55ICogdGhpcy5tMjEgKyBhLnogKiB0aGlzLm0zMSArIGEudyAqIHRoaXMubTQxXHJcbiAgICAgICAgY29uc3QgeSA9IGEueCAqIHRoaXMubTEyICsgYS55ICogdGhpcy5tMjIgKyBhLnogKiB0aGlzLm0zMiArIGEudyAqIHRoaXMubTQyXHJcbiAgICAgICAgY29uc3QgeiA9IGEueCAqIHRoaXMubTEzICsgYS55ICogdGhpcy5tMjMgKyBhLnogKiB0aGlzLm0zMyArIGEudyAqIHRoaXMubTQzXHJcbiAgICAgICAgY29uc3QgdyA9IGEueCAqIHRoaXMubTE0ICsgYS55ICogdGhpcy5tMjQgKyBhLnogKiB0aGlzLm0zNCArIGEudyAqIHRoaXMubTQ0XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHgsIHksIHosIHcpXHJcbiAgICB9XHJcblxyXG4gICAgaW52ZXJ0KCk6IE1hdDQge1xyXG4gICAgICAgIGNvbnN0IHMwID0gdGhpcy5tMTEgKiB0aGlzLm0yMiAtIHRoaXMubTEyICogdGhpcy5tMjE7XHJcbiAgICAgICAgY29uc3QgczEgPSB0aGlzLm0xMSAqIHRoaXMubTIzIC0gdGhpcy5tMTMgKiB0aGlzLm0yMTtcclxuICAgICAgICBjb25zdCBzMiA9IHRoaXMubTExICogdGhpcy5tMjQgLSB0aGlzLm0xNCAqIHRoaXMubTIxO1xyXG4gICAgICAgIGNvbnN0IHMzID0gdGhpcy5tMTIgKiB0aGlzLm0yMyAtIHRoaXMubTEzICogdGhpcy5tMjI7XHJcbiAgICAgICAgY29uc3QgczQgPSB0aGlzLm0xMiAqIHRoaXMubTI0IC0gdGhpcy5tMTQgKiB0aGlzLm0yMjtcclxuICAgICAgICBjb25zdCBzNSA9IHRoaXMubTEzICogdGhpcy5tMjQgLSB0aGlzLm0xNCAqIHRoaXMubTIzO1xyXG4gICAgICAgIGNvbnN0IGM1ID0gdGhpcy5tMzMgKiB0aGlzLm00NCAtIHRoaXMubTM0ICogdGhpcy5tNDM7XHJcbiAgICAgICAgY29uc3QgYzQgPSB0aGlzLm0zMiAqIHRoaXMubTQ0IC0gdGhpcy5tMzQgKiB0aGlzLm00MjtcclxuICAgICAgICBjb25zdCBjMyA9IHRoaXMubTMyICogdGhpcy5tNDMgLSB0aGlzLm0zMyAqIHRoaXMubTQyO1xyXG4gICAgICAgIGNvbnN0IGMyID0gdGhpcy5tMzEgKiB0aGlzLm00NCAtIHRoaXMubTM0ICogdGhpcy5tNDE7XHJcbiAgICAgICAgY29uc3QgYzEgPSB0aGlzLm0zMSAqIHRoaXMubTQzIC0gdGhpcy5tMzMgKiB0aGlzLm00MTtcclxuICAgICAgICBjb25zdCBjMCA9IHRoaXMubTMxICogdGhpcy5tNDIgLSB0aGlzLm0zMiAqIHRoaXMubTQxO1xyXG4gICAgICAgIGNvbnN0IGRldCA9IHMwICogYzUgLSBzMSAqIGM0ICsgczIgKiBjMyArIHMzICogYzIgLSBzNCAqIGMxICsgczUgKiBjMDtcclxuXHJcbiAgICAgICAgaWYgKGRldCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBpbnZlcnRcIilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBuZXcgTWF0NChcclxuICAgICAgICAgICAgKHRoaXMubTIyICogYzUgLSB0aGlzLm0yMyAqIGM0ICsgdGhpcy5tMjQgKiBjMykgLyBkZXQsICgtdGhpcy5tMTIgKiBjNSArIHRoaXMubTEzICogYzQgLSB0aGlzLm0xNCAqIGMzKSAvIGRldCwgKHRoaXMubTQyICogczUgLSB0aGlzLm00MyAqIHM0ICsgdGhpcy5tNDQgKiBzMykgLyBkZXQsICgtdGhpcy5tMzIgKiBzNSArIHRoaXMubTMzICogczQgLSB0aGlzLm0zNCAqIHMzKSAvIGRldCxcclxuICAgICAgICAgICAgKC10aGlzLm0yMSAqIGM1ICsgdGhpcy5tMjMgKiBjMiAtIHRoaXMubTI0ICogYzEpIC8gZGV0LCAodGhpcy5tMTEgKiBjNSAtIHRoaXMubTEzICogYzIgKyB0aGlzLm0xNCAqIGMxKSAvIGRldCwgKC10aGlzLm00MSAqIHM1ICsgdGhpcy5tNDMgKiBzMiAtIHRoaXMubTQ0ICogczEpIC8gZGV0LCAodGhpcy5tMzEgKiBzNSAtIHRoaXMubTMzICogczIgKyB0aGlzLm0zNCAqIHMxKSAvIGRldCxcclxuICAgICAgICAgICAgKHRoaXMubTIxICogYzQgLSB0aGlzLm0yMiAqIGMyICsgdGhpcy5tMjQgKiBjMCkgLyBkZXQsICgtdGhpcy5tMTEgKiBjNCArIHRoaXMubTEyICogYzIgLSB0aGlzLm0xNCAqIGMwKSAvIGRldCwgKHRoaXMubTQxICogczQgLSB0aGlzLm00MiAqIHMyICsgdGhpcy5tNDQgKiBzMCkgLyBkZXQsICgtdGhpcy5tMzEgKiBzNCArIHRoaXMubTMyICogczIgLSB0aGlzLm0zNCAqIHMwKSAvIGRldCxcclxuICAgICAgICAgICAgKC10aGlzLm0yMSAqIGMzICsgdGhpcy5tMjIgKiBjMSAtIHRoaXMubTIzICogYzApIC8gZGV0LCAodGhpcy5tMTEgKiBjMyAtIHRoaXMubTEyICogYzEgKyB0aGlzLm0xMyAqIGMwKSAvIGRldCwgKC10aGlzLm00MSAqIHMzICsgdGhpcy5tNDIgKiBzMSAtIHRoaXMubTQzICogczApIC8gZGV0LCAodGhpcy5tMzEgKiBzMyAtIHRoaXMubTMyICogczEgKyB0aGlzLm0zMyAqIHMwKSAvIGRldFxyXG4gICAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICB0b01hdDMoKTogTWF0MyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQzKFxyXG4gICAgICAgICAgICB0aGlzLm0xMSwgdGhpcy5tMTIsIHRoaXMubTEzLFxyXG4gICAgICAgICAgICB0aGlzLm0yMSwgdGhpcy5tMjIsIHRoaXMubTIzLFxyXG4gICAgICAgICAgICB0aGlzLm0zMSwgdGhpcy5tMzIsIHRoaXMubTMzXHJcbiAgICAgICAgKVxyXG4gICAgfVxyXG5cclxuICAgIHRvU3RyaW5nKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGB8ICR7dGhpcy5tMTF9ICR7dGhpcy5tMTJ9ICR7dGhpcy5tMTN9ICR7dGhpcy5tMTR9IHxcclxufCAke3RoaXMubTIxfSAke3RoaXMubTIyfSAke3RoaXMubTIzfSAke3RoaXMubTI0fSB8XHJcbnwgJHt0aGlzLm0zMX0gJHt0aGlzLm0zMn0gJHt0aGlzLm0zM30gJHt0aGlzLm0zNH0gfFxyXG58ICR7dGhpcy5tNDF9ICR7dGhpcy5tNDJ9ICR7dGhpcy5tNDN9ICR7dGhpcy5tNDR9IHxgXHJcbiAgICB9XHJcblxyXG4gICAgdG9BcnJheSgpOiBudW1iZXJbXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgdGhpcy5tMTEsIHRoaXMubTEyLCB0aGlzLm0xMywgdGhpcy5tMTQsXHJcbiAgICAgICAgICAgIHRoaXMubTIxLCB0aGlzLm0yMiwgdGhpcy5tMjMsIHRoaXMubTI0LFxyXG4gICAgICAgICAgICB0aGlzLm0zMSwgdGhpcy5tMzIsIHRoaXMubTMzLCB0aGlzLm0zNCxcclxuICAgICAgICAgICAgdGhpcy5tNDEsIHRoaXMubTQyLCB0aGlzLm00MywgdGhpcy5tNDQsXHJcbiAgICAgICAgXVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUmVjdCB7XHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgbWluOiBWZWMyLCBwdWJsaWMgcmVhZG9ubHkgbWF4OiBWZWMyKSB7IH1cclxuXHJcbiAgICBzdGF0aWMgZW1wdHkoKTogUmVjdCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBSZWN0KFZlYzIuaW5mKCksIFZlYzIubmVnSW5mKCkpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGZyb21Qb2ludHMocHRzOiBJdGVyYWJsZTxWZWMyPik6IFJlY3Qge1xyXG4gICAgICAgIGxldCBtaW4gPSBWZWMyLmluZigpXHJcbiAgICAgICAgbGV0IG1heCA9IG1pbi5uZWcoKVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHB0IG9mIHB0cykge1xyXG4gICAgICAgICAgICBtaW4gPSBtaW4ubWluKHB0KVxyXG4gICAgICAgICAgICBtYXggPSBtYXgubWF4KHB0KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcmVjdCA9IG5ldyBSZWN0KG1pbiwgbWF4KVxyXG4gICAgICAgIHJldHVybiByZWN0XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGZyb21IYWxmRXh0ZW50cyhoYWxmRXh0ZW50czogVmVjMik6IFJlY3Qge1xyXG4gICAgICAgIHJldHVybiBuZXcgUmVjdChoYWxmRXh0ZW50cy5uZWcoKSwgaGFsZkV4dGVudHMpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGZyb21Qb3NpdGlvbkhhbGZFeHRlbnRzKHBvc2l0aW9uOiBWZWMyLCBoYWxmRXh0ZW50czogVmVjMik6IFJlY3Qge1xyXG4gICAgICAgIHJldHVybiBuZXcgUmVjdChwb3NpdGlvbi5zdWIoaGFsZkV4dGVudHMpLCBwb3NpdGlvbi5hZGQoaGFsZkV4dGVudHMpKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBmcm9tQ29vcmRzKG1pblg6IG51bWJlciwgbWluWTogbnVtYmVyLCBtYXhYOiBudW1iZXIsIG1heFk6IG51bWJlcik6IFJlY3Qge1xyXG4gICAgICAgIHJldHVybiBuZXcgUmVjdChuZXcgVmVjMihtaW5YLCBtaW5ZKSwgbmV3IFZlYzIobWF4WCwgbWF4WSkpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGV4dGVudHMoKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWF4LnN1Yih0aGlzLm1pbilcclxuICAgIH1cclxuXHJcbiAgICBnZXQgd2lkdGgoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXgueCAtIHRoaXMubWluLnhcclxuICAgIH1cclxuXHJcbiAgICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWF4LnkgLSB0aGlzLm1pbi55XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGNlbnRlcigpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy5taW4ueCArIHRoaXMud2lkdGggLyAyLCB0aGlzLm1pbi55ICsgdGhpcy5oZWlnaHQgLyAyKVxyXG4gICAgfVxyXG5cclxuICAgIHVuaW9uKHJlY3Q6IFJlY3QpOiBSZWN0IHtcclxuICAgICAgICBjb25zdCB1ID0gbmV3IFJlY3QodGhpcy5taW4ubWluKHJlY3QubWluKSwgdGhpcy5tYXgubWF4KHJlY3QubWF4KSlcclxuICAgICAgICByZXR1cm4gdVxyXG4gICAgfVxyXG5cclxuICAgIGV4dGVuZChwdDogVmVjMik6IFJlY3Qge1xyXG4gICAgICAgIGNvbnN0IHIgPSBuZXcgUmVjdCh0aGlzLm1pbi5taW4ocHQpLCB0aGlzLm1heC5tYXgocHQpKVxyXG4gICAgICAgIHJldHVybiByXHJcbiAgICB9XHJcblxyXG4gICAgaW50ZXJzZWN0aW9uKHJlY3Q6IFJlY3QpOiBSZWN0IHtcclxuICAgICAgICBjb25zdCBpeCA9IG5ldyBSZWN0KHRoaXMubWluLm1heChyZWN0Lm1pbiksIHRoaXMubWF4Lm1pbihyZWN0Lm1heCkpXHJcbiAgICAgICAgcmV0dXJuIGl4XHJcbiAgICB9XHJcblxyXG4gICAgb3ZlcmxhcHMoYWFiYjogQUFCQik6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgIHRoaXMubWF4LnggPj0gYWFiYi5taW4ueCAmJlxyXG4gICAgICAgICAgICB0aGlzLm1heC55ID49IGFhYmIubWluLnkgJiZcclxuICAgICAgICAgICAgdGhpcy5taW4ueCA8PSBhYWJiLm1heC54ICYmXHJcbiAgICAgICAgICAgIHRoaXMubWluLnkgPD0gYWFiYi5tYXgueVxyXG4gICAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICBjb250YWlucyhwdDogVmVjMik6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgIHB0LnggPj0gdGhpcy5taW4ueCAmJlxyXG4gICAgICAgICAgICBwdC55ID49IHRoaXMubWluLnkgJiZcclxuICAgICAgICAgICAgcHQueCA8IHRoaXMubWF4LnggJiZcclxuICAgICAgICAgICAgcHQueSA8IHRoaXMubWF4LnlcclxuICAgICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgdHJhbnNsYXRlKG9mZnNldDogVmVjMik6IFJlY3Qge1xyXG4gICAgICAgIHJldHVybiBuZXcgUmVjdCh0aGlzLm1pbi5hZGQob2Zmc2V0KSwgdGhpcy5tYXguYWRkKG9mZnNldCkpXHJcbiAgICB9XHJcblxyXG4gICAgc2NhbGUoczogbnVtYmVyKTogUmVjdCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBSZWN0KHRoaXMubWluLm11bFgocyksIHRoaXMubWF4Lm11bFgocykpXHJcbiAgICB9XHJcblxyXG4gICAgYnVmZmVyKHBhZGRpbmc6IG51bWJlcik6IFJlY3Qge1xyXG4gICAgICAgIGNvbnN0IHJlY3QgPSBuZXcgUmVjdCh0aGlzLm1pbi5hZGRYKC1wYWRkaW5nKSwgdGhpcy5tYXguYWRkWChwYWRkaW5nKSlcclxuICAgICAgICByZXR1cm4gcmVjdFxyXG4gICAgfVxyXG5cclxuICAgIHNocmluayhhbW91bnQ6IG51bWJlcik6IFJlY3Qge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJ1ZmZlcigtYW1vdW50KVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IFJlY3Qge1xyXG4gICAgICAgIHJldHVybiBuZXcgUmVjdCh0aGlzLm1pbi5jbG9uZSgpLCB0aGlzLm1heC5jbG9uZSgpKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQUFCQiB7XHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgbWluOiBWZWMzLCBwdWJsaWMgcmVhZG9ubHkgbWF4OiBWZWMzKSB7IH1cclxuXHJcbiAgICBzdGF0aWMgZnJvbVBvaW50cyhwdHM6IEl0ZXJhYmxlPFZlYzM+KTogQUFCQiB7XHJcbiAgICAgICAgbGV0IG1pbiA9IFZlYzMuaW5mKClcclxuICAgICAgICBsZXQgbWF4ID0gbWluLm5lZygpXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgcHQgb2YgcHRzKSB7XHJcbiAgICAgICAgICAgIG1pbiA9IG1pbi5taW4ocHQpXHJcbiAgICAgICAgICAgIG1heCA9IG1heC5tYXgocHQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBhYWJiID0gbmV3IEFBQkIobWluLCBtYXgpXHJcbiAgICAgICAgcmV0dXJuIGFhYmJcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZnJvbUhhbGZFeHRlbnRzKGhhbGZFeHRlbnRzOiBWZWMzKTogQUFCQiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBQUJCKGhhbGZFeHRlbnRzLm5lZygpLCBoYWxmRXh0ZW50cylcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZnJvbVBvc2l0aW9uSGFsZkV4dGVudHMocG9zaXRpb246IFZlYzMsIGhhbGZFeHRlbnRzOiBWZWMzKTogQUFCQiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBQUJCKHBvc2l0aW9uLnN1YihoYWxmRXh0ZW50cyksIHBvc2l0aW9uLmFkZChoYWxmRXh0ZW50cykpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGZyb21Db29yZHMobWluWDogbnVtYmVyLCBtaW5ZOiBudW1iZXIsIG1pblo6IG51bWJlciwgbWF4WDogbnVtYmVyLCBtYXhZOiBudW1iZXIsIG1heFo6IG51bWJlcik6IEFBQkIge1xyXG4gICAgICAgIHJldHVybiBuZXcgQUFCQihuZXcgVmVjMyhtaW5YLCBtaW5ZLCBtaW5aKSwgbmV3IFZlYzMobWF4WCwgbWF4WSwgbWF4WikpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGV4dGVudHMoKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWF4LnN1Yih0aGlzLm1pbilcclxuICAgIH1cclxuXHJcbiAgICB1bmlvbihhYWJiOiBBQUJCKTogQUFCQiB7XHJcbiAgICAgICAgY29uc3QgdSA9IG5ldyBBQUJCKHRoaXMubWluLm1pbihhYWJiLm1pbiksIHRoaXMubWF4Lm1heChhYWJiLm1heCkpXHJcbiAgICAgICAgcmV0dXJuIHVcclxuICAgIH1cclxuXHJcbiAgICBpbnRlcnNlY3Rpb24oYWFiYjogQUFCQik6IEFBQkIge1xyXG4gICAgICAgIGNvbnN0IGl4ID0gbmV3IEFBQkIodGhpcy5taW4ubWF4KGFhYmIubWluKSwgdGhpcy5tYXgubWluKGFhYmIubWF4KSlcclxuICAgICAgICByZXR1cm4gaXhcclxuICAgIH1cclxuXHJcbiAgICBvdmVybGFwcyhhYWJiOiBBQUJCKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgdGhpcy5tYXgueCA+PSBhYWJiLm1pbi54ICYmXHJcbiAgICAgICAgICAgIHRoaXMubWF4LnkgPj0gYWFiYi5taW4ueSAmJlxyXG4gICAgICAgICAgICB0aGlzLm1heC56ID49IGFhYmIubWluLnogJiZcclxuICAgICAgICAgICAgdGhpcy5taW4ueCA8PSBhYWJiLm1heC54ICYmXHJcbiAgICAgICAgICAgIHRoaXMubWluLnkgPD0gYWFiYi5tYXgueSAmJlxyXG4gICAgICAgICAgICB0aGlzLm1pbi56IDw9IGFhYmIubWF4LnpcclxuICAgICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgY29udGFpbnMocHQ6IFZlYzMpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICBwdC54ID49IHRoaXMubWluLnggJiZcclxuICAgICAgICAgICAgcHQueSA+PSB0aGlzLm1pbi55ICYmXHJcbiAgICAgICAgICAgIHB0LnogPj0gdGhpcy5taW4ueiAmJlxyXG4gICAgICAgICAgICBwdC54IDwgdGhpcy5tYXgueCAmJlxyXG4gICAgICAgICAgICBwdC55IDwgdGhpcy5tYXgueSAmJlxyXG4gICAgICAgICAgICBwdC56IDwgdGhpcy5tYXguelxyXG4gICAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICB0cmFuc2xhdGUob2Zmc2V0OiBWZWMzKTogQUFCQiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBQUJCKHRoaXMubWluLmFkZChvZmZzZXQpLCB0aGlzLm1heC5hZGQob2Zmc2V0KSlcclxuICAgIH1cclxuXHJcbiAgICBzY2FsZShzOiBudW1iZXIpOiBBQUJCIHtcclxuICAgICAgICByZXR1cm4gbmV3IEFBQkIodGhpcy5taW4ubXVsWChzKSwgdGhpcy5tYXgubXVsWChzKSlcclxuICAgIH1cclxuXHJcbiAgICBidWZmZXIocGFkZGluZzogbnVtYmVyKTogQUFCQiB7XHJcbiAgICAgICAgY29uc3QgYWFiYiA9IG5ldyBBQUJCKHRoaXMubWluLmFkZFgoLXBhZGRpbmcpLCB0aGlzLm1heC5hZGRYKHBhZGRpbmcpKVxyXG4gICAgICAgIHJldHVybiBhYWJiXHJcbiAgICB9XHJcblxyXG4gICAgc2hyaW5rKGFtb3VudDogbnVtYmVyKTogQUFCQiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYnVmZmVyKC1hbW91bnQpXHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogQUFCQiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBQUJCKHRoaXMubWluLmNsb25lKCksIHRoaXMubWF4LmNsb25lKCkpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBSYXkge1xyXG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IG9yaWc6IFZlYzMsIHB1YmxpYyByZWFkb25seSBkaXI6IFZlYzMpIHsgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogbm9ybWFsaXplIHJheSBkaXJlY3Rpb25cclxuICAgICAqL1xyXG4gICAgbm9ybWFsaXplKCk6IFJheSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBSYXkodGhpcy5vcmlnLCB0aGlzLmRpci5ub3JtYWxpemUoKSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHRyYW5zZm9ybSByYXkgYnkgc3BlY2lmaWVkIG1hdHJpeFxyXG4gICAgICogQHBhcmFtIG1hdCBtYXRyaXhcclxuICAgICAqL1xyXG4gICAgdHJhbnNmb3JtKG1hdDogTWF0NCk6IFJheSB7XHJcbiAgICAgICAgY29uc3Qgb3JpZyA9IG1hdC50cmFuc2Zvcm0zKHRoaXMub3JpZylcclxuICAgICAgICBjb25zdCBkZXN0ID0gbWF0LnRyYW5zZm9ybTModGhpcy5vcmlnLmFkZCh0aGlzLmRpcikpXHJcbiAgICAgICAgY29uc3QgcmF5ID0gUmF5LmZyb21PcmlnRGVzdChvcmlnLCBkZXN0KVxyXG4gICAgICAgIHJldHVybiByYXlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNhc3QgcmF5IGFnYWluc3QgcGxhbmUsIG9wdGlvbmFsIHJldHVybiB2YWx1ZSBiZWNhdXNlIGl0IG1heSBub3QgaW50ZXJzZWN0XHJcbiAgICAgKiBpZiBwbGFuZSBpcyBwYXJhbGxlbCB3aXRoIHJheSwgd2lsbCByZXR1cm4gSW5maW5pdHlcclxuICAgICAqIEBwYXJhbSBwbGFuZSBwbGFuZSB0byBjYXN0IHJheSBhZ2FpbnN0XHJcbiAgICAgKi9cclxuICAgIGNhc3QocGxhbmU6IFBsYW5lKTogbnVtYmVyIHtcclxuICAgICAgICBjb25zdCBkID0gcGxhbmUubm9ybWFsLmRvdCh0aGlzLmRpcik7XHJcbiAgICAgICAgY29uc3QgdCA9IHBsYW5lLmNlbnRlcigpLnN1Yih0aGlzLm9yaWcpLmRvdChwbGFuZS5ub3JtYWwpIC8gZDtcclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGludGVycG9sYXRlIGFsb25nIHJheVxyXG4gICAgICogQHBhcmFtIHQgdCB2YWx1ZSAoMCA9IG9yaWdpbiwgMSA9IG9yaWdpbiArIGRpcilcclxuICAgICAqL1xyXG4gICAgbGVycCh0OiBudW1iZXIpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5vcmlnLmFkZCh0aGlzLmRpci5tdWxYKHQpKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29udmVydCB0byBzdHJpbmdcclxuICAgICAqL1xyXG4gICAgdG9TdHJpbmcoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gYG9yaWc6ICR7dGhpcy5vcmlnfSBkaXI6ICR7dGhpcy5kaXJ9YFxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29uc3RydWN0IHBsYW5lIGZyb20gb3JpZ2luIGFuZCBkZXN0aW5hdGlvblxyXG4gICAgICogQHBhcmFtIG9yaWcgb3JpZyBwb2ludFxyXG4gICAgICogQHBhcmFtIGRlc3QgZGVzdGluYXRpb24gcG9pbnRcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGZyb21PcmlnRGVzdChvcmlnOiBWZWMzLCBkZXN0OiBWZWMzKTogUmF5IHtcclxuICAgICAgICBjb25zdCBkaXIgPSBkZXN0LnN1YihvcmlnKS5ub3JtYWxpemUoKVxyXG4gICAgICAgIHJldHVybiBuZXcgUmF5KG9yaWcsIGRpcilcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFBsYW5lIHtcclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBub3JtYWw6IFZlYzMsIHB1YmxpYyByZWFkb25seSBkOiBudW1iZXIpIHsgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29uc3RydWN0IGEgcGxhbmUgZnJvbSBwb2ludCBhbmQgbm9ybWFsXHJcbiAgICAgKiBAcGFyYW0gcHQgcG9pbnQgb24gcGxhbmVcclxuICAgICAqIEBwYXJhbSBuIHBsYW5lIG5vcm1hbFxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZnJvbVBvaW50Tm9ybWFsKHB0OiBWZWMzLCBuOiBWZWMzKTogUGxhbmUge1xyXG4gICAgICAgIG4gPSBuLm5vcm1hbGl6ZSgpXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQbGFuZShuLCBwdC5kb3QobikpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb25zdHJ1Y3QgYSBwbGFuZSBmcm9tIHRocmVlIHBvaW50cywgcG9pbnRzIGFyZSBhc3N1bWVkIHRvIGJlIHNwZWNpZmllZCBpbiBDQ1cgb3JkZXJcclxuICAgICAqIEBwYXJhbSBhIDFzdCBwb2ludFxyXG4gICAgICogQHBhcmFtIGIgMm5kIHBvaW50XHJcbiAgICAgKiBAcGFyYW0gYyAzcmQgcG9pbnRcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGZyb21Qb2ludHMoYTogVmVjMywgYjogVmVjMywgYzogVmVjMyk6IFBsYW5lIHtcclxuICAgICAgICBjb25zdCBuID0gYi5zdWIoYSkuY3Jvc3MoYy5zdWIoYSkpLm5vcm1hbGl6ZSgpXHJcbiAgICAgICAgY29uc3QgZCA9IGEuZG90KGIpXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQbGFuZShuLCBkKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJldHVybnMgbm9ybWFsaXplZCBwbGFuZVxyXG4gICAgICovXHJcbiAgICBub3JtYWxpemUoKTogUGxhbmUge1xyXG4gICAgICAgIGNvbnN0IGxlbiA9IHRoaXMubm9ybWFsLmxlbmd0aCgpXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQbGFuZSh0aGlzLm5vcm1hbC5kaXZYKGxlbiksIHRoaXMuZCAvIGxlbilcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJldHVybnMgdGhlIFwiY2VudGVyXCIgb2YgdGhlIHBsYW5lIC0gdGhlIHBvaW50IGRlc2NyaWJlZCBieSB0aGUgbm9ybWFsIGFuZCBkaXN0YW5jZVxyXG4gICAgICovXHJcbiAgICBjZW50ZXIoKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubm9ybWFsLm11bFgodGhpcy5kKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY2FsY3VsYXRlIHNpZ25lZCBkaXN0YW5jZSBmcm9tIHBsYW5lIHRvIHBvaW50XHJcbiAgICAgKiBwb3NpdGl2ZSBkaXN0YW5jZSBpbmRpY2F0ZXMgcHQgaXMgaW4tZnJvbnQgb2YgcGxhbmVcclxuICAgICAqIG5lZ2F0aXZlIGRpc3RhbmNlIGluZGljYXRlcyBwdCBpcyBiZWhpbmQgcGxhbmVcclxuICAgICAqIEBwYXJhbSBwdCBwb2ludFxyXG4gICAgICovXHJcbiAgICBkaXN0YW5jZVRvKHB0OiBWZWMzKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5ub3JtYWwuZG90KHB0KSAtIHRoaXMuZDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHRyYW5zZm9ybSBwbGFuZSBieSBtYXRyaXhcclxuICAgICAqIEBwYXJhbSBtYXQgbWF0cml4XHJcbiAgICAgKi9cclxuICAgIHRyYW5zZm9ybShtYXQ6IE1hdDQpOiBQbGFuZSB7XHJcbiAgICAgICAgY29uc3QgY2VudGVyID0gbWF0LnRyYW5zZm9ybTModGhpcy5jZW50ZXIoKSlcclxuICAgICAgICBjb25zdCBub3JtYWwgPSBtYXQudG9NYXQzKCkudHJhbnNmb3JtKHRoaXMubm9ybWFsKVxyXG4gICAgICAgIHJldHVybiBQbGFuZS5mcm9tUG9pbnROb3JtYWwoY2VudGVyLCBub3JtYWwpO1xyXG4gICAgfVxyXG5cclxuICAgIHRvU3RyaW5nKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGAke3RoaXMubm9ybWFsfSAke3RoaXMuZH1gXHJcbiAgICB9XHJcbn0iXX0=