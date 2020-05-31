/**
 * 3d math library
 */
export class Vec2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VvM2QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZW8zZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUNILE1BQU0sT0FBTyxJQUFJO0lBQ2IsWUFBbUIsQ0FBUyxFQUFTLENBQVM7UUFBM0IsTUFBQyxHQUFELENBQUMsQ0FBUTtRQUFTLE1BQUMsR0FBRCxDQUFDLENBQVE7SUFBSSxDQUFDO0lBRW5ELEtBQUssQ0FBQyxDQUFPO1FBQ1QsT0FBTyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFTO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBUztRQUNWLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFFRCxRQUFRO1FBQ0osT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFFRCxNQUFNO1FBQ0YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsU0FBUztRQUNMLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsR0FBRztRQUNDLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRUQsSUFBSTtRQUNBLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRUQsR0FBRztRQUNDLE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxRQUFRO1FBQ0osT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxPQUFPO1FBQ0gsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFRCxJQUFJLEdBQUc7UUFDSCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sSUFBSTtJQUNiLFlBQW1CLENBQVMsRUFBUyxDQUFTLEVBQVMsQ0FBUztRQUE3QyxNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQVMsTUFBQyxHQUFELENBQUMsQ0FBUTtRQUFTLE1BQUMsR0FBRCxDQUFDLENBQVE7SUFBSSxDQUFDO0lBRXJFLEtBQUssQ0FBQyxDQUFPO1FBQ1QsT0FBTyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFTO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBUztRQUNWLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVELEtBQUssQ0FBQyxDQUFPO1FBQ1QsT0FBTyxJQUFJLElBQUksQ0FDWCxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUMzQixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUMzQixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVELE1BQU07UUFDRixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxTQUFTO1FBQ0wsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxHQUFHO1FBQ0MsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFRCxJQUFJO1FBQ0EsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzVFLENBQUM7SUFFRCxHQUFHO1FBQ0MsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFRCxRQUFRO1FBQ0osT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUE7SUFDNUMsQ0FBQztJQUVELE9BQU87UUFDSCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxFQUFFO1FBQ0YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxFQUFFO1FBQ0YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ0osT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ0osT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sSUFBSTtJQUNiLFlBQW1CLENBQVMsRUFBUyxDQUFTLEVBQVMsQ0FBUyxFQUFTLENBQVM7UUFBL0QsTUFBQyxHQUFELENBQUMsQ0FBUTtRQUFTLE1BQUMsR0FBRCxDQUFDLENBQVE7UUFBUyxNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQVMsTUFBQyxHQUFELENBQUMsQ0FBUTtJQUFJLENBQUM7SUFFdkYsS0FBSyxDQUFDLENBQU87UUFDVCxPQUFPLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM5RSxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25ELENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBUztRQUNWLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVM7UUFDVixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFTO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBUztRQUNWLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNFLENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFPO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQU87UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNFLENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBTztRQUNQLE9BQU8sSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3BFLENBQUM7SUFFRCxRQUFRO1FBQ0osT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFFRCxNQUFNO1FBQ0YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsU0FBUztRQUNMLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsR0FBRztRQUNDLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzRixDQUFDO0lBRUQsSUFBSTtRQUNBLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMvRixDQUFDO0lBRUQsR0FBRztRQUNDLE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFBO0lBQ3RELENBQUM7SUFFRCxPQUFPO1FBQ0gsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsSUFBSSxFQUFFO1FBQ0YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxFQUFFO1FBQ0YsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxHQUFHO1FBQ0gsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxJQUFJO0lBV2IsWUFDVyxHQUFXLEVBQVMsR0FBVyxFQUMvQixHQUFXLEVBQVMsR0FBVztRQUQvQixRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQVMsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUMvQixRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQVMsUUFBRyxHQUFILEdBQUcsQ0FBUTtJQUFJLENBQUM7SUFaL0MsTUFBTSxDQUFDLFFBQVE7UUFDWCxPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQy9CLENBQUM7SUFFRCxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQWE7UUFDekIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNoQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2hDLE9BQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0lBTUQsS0FBSyxDQUFDLENBQU87UUFDVCxPQUFPLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQTtJQUMvRixDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFRCxTQUFTO1FBQ0wsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDM0QsQ0FBQztJQUVELE1BQU0sQ0FBQyxDQUFPO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FDWCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU87UUFDNUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPO1FBQzVDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTztRQUM1QyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUN0QyxDQUFBO0lBQ0wsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRztJQUNwQyxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQTtJQUN4QixDQUFDO0lBRUQsT0FBTztRQUNILE9BQU87WUFDSCxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ2xCLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUc7U0FDckIsQ0FBQTtJQUNMLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxJQUFJO0lBUWIsWUFDVyxHQUFXLEVBQVMsR0FBVyxFQUFTLEdBQVcsRUFDbkQsR0FBVyxFQUFTLEdBQVcsRUFBUyxHQUFXLEVBQ25ELEdBQVcsRUFBUyxHQUFXLEVBQVMsR0FBVztRQUZuRCxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQVMsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUFTLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDbkQsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUFTLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFBUyxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQ25ELFFBQUcsR0FBSCxHQUFHLENBQVE7UUFBUyxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQVMsUUFBRyxHQUFILEdBQUcsQ0FBUTtJQUFJLENBQUM7SUFWbkUsTUFBTSxDQUFDLFFBQVE7UUFDWCxPQUFPLElBQUksSUFBSSxDQUNYLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUNQLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUNQLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDaEIsQ0FBQztJQU9ELEtBQUssQ0FBQyxDQUFPO1FBQ1QsT0FBTyxDQUNILElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRztZQUM5RCxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUc7WUFDOUQsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN2RSxDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxJQUFJLENBQ1gsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQzVCLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUM1QixJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxTQUFTO1FBQ0wsT0FBTyxJQUFJLElBQUksQ0FDWCxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFDNUIsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQzVCLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELE1BQU0sQ0FBQyxDQUFPO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FDWCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPO1FBQy9ELElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU87UUFDL0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTztRQUMvRCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPO1FBQy9ELElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU87UUFDL0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTztRQUMvRCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPO1FBQy9ELElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU87UUFDL0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQ3pELENBQUE7SUFDTCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFTLENBQUMsQ0FBTztRQUNiLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FB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QUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUc7WUFDcEYsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRztZQUNwRixJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUM3RixDQUFDO0lBRUQsS0FBSztRQUNELE9BQU8sSUFBSSxJQUFJLENBQ1gsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFDdEMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFDdEMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFDdEMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFRCxTQUFTO1FBQ0wsT0FBTyxJQUFJLElBQUksQ0FDWCxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELE1BQU0sQ0FBQyxDQUFPO1FBQ1YsT0FBTyxJQUFJLElBQUksQ0FDWCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTTtRQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQzVFLENBQUE7SUFDTCxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsVUFBVSxDQUFDLENBQU87UUFDZCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO1FBQ3JFLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFBO1FBQzlFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQTtRQUM5RSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUE7UUFDOUUsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzVCLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsVUFBVSxDQUFDLENBQU87UUFDZCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7UUFDM0UsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQTtRQUMzRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7UUFDM0UsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRUQsTUFBTTtRQUNGLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JELE1BQU0sR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBRXRFLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRTtZQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUE7U0FDbEM7UUFFRCxPQUFPLElBQUksSUFBSSxDQUNYLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUM1TixDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFDNU4sQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQzVOLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUMvTixDQUFBO0lBQ0wsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUc7SUFDNUQsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUc7SUFDNUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUc7SUFDNUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFBO0lBQ2hELENBQUM7SUFFRCxPQUFPO1FBQ0gsT0FBTztZQUNILElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ3RDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ3RDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ3RDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1NBQ3pDLENBQUE7SUFDTCxDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogM2QgbWF0aCBsaWJyYXJ5XHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVmVjMiB7XHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgeDogbnVtYmVyLCBwdWJsaWMgeTogbnVtYmVyKSB7IH1cclxuXHJcbiAgICBlcXVhbChiOiBWZWMyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCA9PT0gYi54ICYmIHRoaXMueSA9PT0gYi55XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCwgdGhpcy55KVxyXG4gICAgfVxyXG5cclxuICAgIGFkZFgoeDogbnVtYmVyKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCArIHgsIHRoaXMueSArIHgpXHJcbiAgICB9XHJcblxyXG4gICAgc3ViWCh4OiBudW1iZXIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54IC0geCwgdGhpcy55IC0geClcclxuICAgIH1cclxuXHJcbiAgICBtdWxYKHg6IG51bWJlcik6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzLnggKiB4LCB0aGlzLnkgKiB4KVxyXG4gICAgfVxyXG5cclxuICAgIGRpdlgoeDogbnVtYmVyKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCAvIHgsIHRoaXMueSAvIHgpXHJcbiAgICB9XHJcblxyXG4gICAgYWRkKGI6IFZlYzIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54ICsgYi54LCB0aGlzLnkgKyBiLnkpXHJcbiAgICB9XHJcblxyXG4gICAgc3ViKGI6IFZlYzIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54IC0gYi54LCB0aGlzLnkgLSBiLnkpXHJcbiAgICB9XHJcblxyXG4gICAgbXVsKGI6IFZlYzIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54ICogYi54LCB0aGlzLnkgKiBiLnkpXHJcbiAgICB9XHJcblxyXG4gICAgZGl2KGI6IFZlYzIpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpcy54IC8gYi54LCB0aGlzLnkgLyBiLnkpXHJcbiAgICB9XHJcblxyXG4gICAgZG90KGI6IFZlYzIpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnggKiBiLnggKyB0aGlzLnkgKiBiLnlcclxuICAgIH1cclxuXHJcbiAgICBsZW5ndGhTcSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRvdCh0aGlzKVxyXG4gICAgfVxyXG5cclxuICAgIGxlbmd0aCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5kb3QodGhpcykpXHJcbiAgICB9XHJcblxyXG4gICAgbm9ybWFsaXplKCk6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRpdlgodGhpcy5sZW5ndGgoKSlcclxuICAgIH1cclxuXHJcbiAgICBhYnMoKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKE1hdGguYWJzKHRoaXMueCksIE1hdGguYWJzKHRoaXMueSkpXHJcbiAgICB9XHJcblxyXG4gICAgc2lnbigpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIoTWF0aC5zaWduKHRoaXMueCksIE1hdGguc2lnbih0aGlzLnkpKVxyXG4gICAgfVxyXG5cclxuICAgIG5lZygpOiBWZWMyIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIoLXRoaXMueCwgLXRoaXMueSlcclxuICAgIH1cclxuXHJcbiAgICB0b1N0cmluZygpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBgKCR7dGhpcy54fSwke3RoaXMueX0pYFxyXG4gICAgfVxyXG5cclxuICAgIHRvQXJyYXkoKTogbnVtYmVyW10ge1xyXG4gICAgICAgIHJldHVybiBbdGhpcy54LCB0aGlzLnldXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHh5MCgpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54LCB0aGlzLnksIDApXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBWZWMzIHtcclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyB4OiBudW1iZXIsIHB1YmxpYyB5OiBudW1iZXIsIHB1YmxpYyB6OiBudW1iZXIpIHsgfVxyXG5cclxuICAgIGVxdWFsKGI6IFZlYzMpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy54ID09PSBiLnggJiYgdGhpcy55ID09PSBiLnkgJiYgdGhpcy56ID09PSBiLnpcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54LCB0aGlzLnksIHRoaXMueilcclxuICAgIH1cclxuXHJcbiAgICBhZGRYKHg6IG51bWJlcik6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzLnggKyB4LCB0aGlzLnkgKyB4LCB0aGlzLnogKyB4KVxyXG4gICAgfVxyXG5cclxuICAgIHN1YlgoeDogbnVtYmVyKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXMueCAtIHgsIHRoaXMueSAtIHgsIHRoaXMueiAtIHgpXHJcbiAgICB9XHJcblxyXG4gICAgbXVsWCh4OiBudW1iZXIpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54ICogeCwgdGhpcy55ICogeCwgdGhpcy56ICogeClcclxuICAgIH1cclxuXHJcbiAgICBkaXZYKHg6IG51bWJlcik6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzLnggLyB4LCB0aGlzLnkgLyB4LCB0aGlzLnogLyB4KVxyXG4gICAgfVxyXG5cclxuICAgIGFkZChiOiBWZWMzKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXMueCArIGIueCwgdGhpcy55ICsgYi55LCB0aGlzLnogKyBiLnopXHJcbiAgICB9XHJcblxyXG4gICAgc3ViKGI6IFZlYzMpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpcy54IC0gYi54LCB0aGlzLnkgLSBiLnksIHRoaXMueiAtIGIueilcclxuICAgIH1cclxuXHJcbiAgICBtdWwoYjogVmVjMyk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzLnggKiBiLngsIHRoaXMueSAqIGIueSwgdGhpcy56ICogYi56KVxyXG4gICAgfVxyXG5cclxuICAgIGRpdihiOiBWZWMzKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXMueCAvIGIueCwgdGhpcy55IC8gYi55LCB0aGlzLnogLyBiLnopXHJcbiAgICB9XHJcblxyXG4gICAgZG90KGI6IFZlYzMpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnggKiBiLnggKyB0aGlzLnkgKiBiLnkgKyB0aGlzLnogKiBiLnpcclxuICAgIH1cclxuXHJcbiAgICBjcm9zcyhiOiBWZWMzKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKFxyXG4gICAgICAgICAgICB0aGlzLnkgKiBiLnogLSB0aGlzLnogKiBiLnksXHJcbiAgICAgICAgICAgIHRoaXMueiAqIGIueCAtIHRoaXMueCAqIGIueixcclxuICAgICAgICAgICAgdGhpcy54ICogYi55IC0gdGhpcy55ICogYi54KVxyXG4gICAgfVxyXG5cclxuICAgIGxlbmd0aFNxKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZG90KHRoaXMpXHJcbiAgICB9XHJcblxyXG4gICAgbGVuZ3RoKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmRvdCh0aGlzKSlcclxuICAgIH1cclxuXHJcbiAgICBub3JtYWxpemUoKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZGl2WCh0aGlzLmxlbmd0aCgpKVxyXG4gICAgfVxyXG5cclxuICAgIGFicygpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzMoTWF0aC5hYnModGhpcy54KSwgTWF0aC5hYnModGhpcy55KSwgTWF0aC5hYnModGhpcy56KSlcclxuICAgIH1cclxuXHJcbiAgICBzaWduKCk6IFZlYzMge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyhNYXRoLnNpZ24odGhpcy54KSwgTWF0aC5zaWduKHRoaXMueSksIE1hdGguc2lnbih0aGlzLnopKVxyXG4gICAgfVxyXG5cclxuICAgIG5lZygpOiBWZWMzIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzMoLXRoaXMueCwgLXRoaXMueSwgLXRoaXMueilcclxuICAgIH1cclxuXHJcbiAgICB0b1N0cmluZygpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBgKCR7dGhpcy54fSwke3RoaXMueX0sJHt0aGlzLnp9KWBcclxuICAgIH1cclxuXHJcbiAgICB0b0FycmF5KCk6IG51bWJlcltdIHtcclxuICAgICAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55LCB0aGlzLnpdXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHh5KCk6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzLngsIHRoaXMueSlcclxuICAgIH1cclxuXHJcbiAgICBnZXQgeHooKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCwgdGhpcy56KVxyXG4gICAgfVxyXG5cclxuICAgIGdldCB4eXowKCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLngsIHRoaXMueSwgdGhpcy56LCAwKVxyXG4gICAgfVxyXG5cclxuICAgIGdldCB4eXoxKCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLngsIHRoaXMueSwgdGhpcy56LCAxKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVmVjNCB7XHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgeDogbnVtYmVyLCBwdWJsaWMgeTogbnVtYmVyLCBwdWJsaWMgejogbnVtYmVyLCBwdWJsaWMgdzogbnVtYmVyKSB7IH1cclxuXHJcbiAgICBlcXVhbChiOiBWZWM0KTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCA9PT0gYi54ICYmIHRoaXMueSA9PT0gYi55ICYmIHRoaXMueiA9PT0gYi56ICYmIHRoaXMudyA9PSBiLndcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpcy54LCB0aGlzLnksIHRoaXMueiwgdGhpcy53KVxyXG4gICAgfVxyXG5cclxuICAgIGFkZFgoeDogbnVtYmVyKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXMueCArIHgsIHRoaXMueSArIHgsIHRoaXMueiArIHgsIHRoaXMudyArIHgpXHJcbiAgICB9XHJcblxyXG4gICAgc3ViWCh4OiBudW1iZXIpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpcy54IC0geCwgdGhpcy55IC0geCwgdGhpcy56IC0geCwgdGhpcy53IC0geClcclxuICAgIH1cclxuXHJcbiAgICBtdWxYKHg6IG51bWJlcik6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLnggKiB4LCB0aGlzLnkgKiB4LCB0aGlzLnogKiB4LCB0aGlzLncgKiB4KVxyXG4gICAgfVxyXG5cclxuICAgIGRpdlgoeDogbnVtYmVyKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXMueCAvIHgsIHRoaXMueSAvIHgsIHRoaXMueiAvIHgsIHRoaXMudyAvIHgpXHJcbiAgICB9XHJcblxyXG4gICAgYWRkKGI6IFZlYzQpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpcy54ICsgYi54LCB0aGlzLnkgKyBiLnksIHRoaXMueiArIGIueiwgdGhpcy53ICsgYi53KVxyXG4gICAgfVxyXG5cclxuICAgIHN1YihiOiBWZWM0KTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXMueCAtIGIueCwgdGhpcy55IC0gYi55LCB0aGlzLnogLSBiLnosIHRoaXMudyAtIGIudylcclxuICAgIH1cclxuXHJcbiAgICBtdWwoYjogVmVjNCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzLnggKiBiLngsIHRoaXMueSAqIGIueSwgdGhpcy56ICogYi56LCB0aGlzLncgLSBiLncpXHJcbiAgICB9XHJcblxyXG4gICAgZGl2KGI6IFZlYzQpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpcy54IC8gYi54LCB0aGlzLnkgLyBiLnksIHRoaXMueiAvIGIueiwgdGhpcy53IC8gYi53KVxyXG4gICAgfVxyXG5cclxuICAgIGRvdChiOiBWZWM0KTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy54ICogYi54ICsgdGhpcy55ICogYi55ICsgdGhpcy56ICogYi56ICsgdGhpcy53ICogYi53XHJcbiAgICB9XHJcblxyXG4gICAgbGVuZ3RoU3EoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kb3QodGhpcylcclxuICAgIH1cclxuXHJcbiAgICBsZW5ndGgoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMuZG90KHRoaXMpKVxyXG4gICAgfVxyXG5cclxuICAgIG5vcm1hbGl6ZSgpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kaXZYKHRoaXMubGVuZ3RoKCkpXHJcbiAgICB9XHJcblxyXG4gICAgYWJzKCk6IFZlYzQge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNChNYXRoLmFicyh0aGlzLngpLCBNYXRoLmFicyh0aGlzLnkpLCBNYXRoLmFicyh0aGlzLnopLCBNYXRoLmFicyh0aGlzLncpKVxyXG4gICAgfVxyXG5cclxuICAgIHNpZ24oKTogVmVjNCB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KE1hdGguc2lnbih0aGlzLngpLCBNYXRoLnNpZ24odGhpcy55KSwgTWF0aC5zaWduKHRoaXMueiksIE1hdGguc2lnbih0aGlzLncpKVxyXG4gICAgfVxyXG5cclxuICAgIG5lZygpOiBWZWM0IHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQoLXRoaXMueCwgLXRoaXMueSwgLXRoaXMueiwgLXRoaXMudylcclxuICAgIH1cclxuXHJcbiAgICB0b1N0cmluZygpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBgKCR7dGhpcy54fSwke3RoaXMueX0sJHt0aGlzLnp9LCR7dGhpcy53fSlgXHJcbiAgICB9XHJcblxyXG4gICAgdG9BcnJheSgpOiBudW1iZXJbXSB7XHJcbiAgICAgICAgcmV0dXJuIFt0aGlzLngsIHRoaXMueSwgdGhpcy56LCB0aGlzLnddXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHh5KCk6IFZlYzIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzLngsIHRoaXMueSlcclxuICAgIH1cclxuXHJcbiAgICBnZXQgeHooKTogVmVjMiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCwgdGhpcy56KVxyXG4gICAgfVxyXG5cclxuICAgIGdldCB4eXooKTogVmVjMyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXMueCwgdGhpcy55LCB0aGlzLnopXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXQyIHtcclxuICAgIHN0YXRpYyBpZGVudGl0eSgpOiBNYXQyIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDIoMSwgMCwgMCwgMSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgcm90YXRpb24odGhldGE6IG51bWJlcik6IE1hdDIge1xyXG4gICAgICAgIGNvbnN0IHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpXHJcbiAgICAgICAgY29uc3QgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSlcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDIoY29zVGhldGEsIC1zaW5UaGV0YSwgc2luVGhldGEsIGNvc1RoZXRhKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIHB1YmxpYyBtMTE6IG51bWJlciwgcHVibGljIG0xMjogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyBtMjE6IG51bWJlciwgcHVibGljIG0yMjogbnVtYmVyKSB7IH1cclxuXHJcbiAgICBlcXVhbChiOiBNYXQyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubTExID09PSBiLm0xMSAmJiB0aGlzLm0xMiA9PT0gYi5tMTIgJiYgdGhpcy5tMjEgPT09IGIubTIxICYmIHRoaXMubTExID09PSBiLm0yMlxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IE1hdDIge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0Mih0aGlzLm0xMSwgdGhpcy5tMTIsIHRoaXMubTIxLCB0aGlzLm0yMilcclxuICAgIH1cclxuXHJcbiAgICB0cmFuc3Bvc2UoKTogTWF0MiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQyKHRoaXMubTExLCB0aGlzLm0yMSwgdGhpcy5tMTIsIHRoaXMubTIyKVxyXG4gICAgfVxyXG5cclxuICAgIG1hdG11bChiOiBNYXQyKTogTWF0MiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQyKFxyXG4gICAgICAgICAgICB0aGlzLm0xMSAqIGIubTExICsgdGhpcy5tMTIgKiBiLm0yMSwgLy8gbTExLFxyXG4gICAgICAgICAgICB0aGlzLm0xMSAqIGIubTEyICsgdGhpcy5tMTIgKiBiLm0yMiwgLy8gbTEyLFxyXG4gICAgICAgICAgICB0aGlzLm0yMSAqIGIubTExICsgdGhpcy5tMjIgKiBiLm0yMSwgLy8gbTIxLFxyXG4gICAgICAgICAgICB0aGlzLm0yMSAqIGIubTEyICsgdGhpcy5tMjIgKiBiLm0yMiwgLy8gbTIyLFxyXG4gICAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICB0b1N0cmluZygpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBgfCAke3RoaXMubTExfSAke3RoaXMubTEyfSB8XHJcbnwgJHt0aGlzLm0yMX0gJHt0aGlzLm0yMn0gfGBcclxuICAgIH1cclxuXHJcbiAgICB0b0FycmF5KCk6IG51bWJlcltdIHtcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICB0aGlzLm0xMSwgdGhpcy5tMTIsXHJcbiAgICAgICAgICAgIHRoaXMubTIxLCB0aGlzLm0yMlxyXG4gICAgICAgIF1cclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdDMge1xyXG4gICAgc3RhdGljIGlkZW50aXR5KCk6IE1hdDMge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0MyhcclxuICAgICAgICAgICAgMSwgMCwgMCxcclxuICAgICAgICAgICAgMCwgMSwgMCxcclxuICAgICAgICAgICAgMCwgMCwgMSlcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICBwdWJsaWMgbTExOiBudW1iZXIsIHB1YmxpYyBtMTI6IG51bWJlciwgcHVibGljIG0xMzogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyBtMjE6IG51bWJlciwgcHVibGljIG0yMjogbnVtYmVyLCBwdWJsaWMgbTIzOiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIG0zMTogbnVtYmVyLCBwdWJsaWMgbTMyOiBudW1iZXIsIHB1YmxpYyBtMzM6IG51bWJlcikgeyB9XHJcblxyXG4gICAgZXF1YWwoYjogTWF0Myk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgIHRoaXMubTExID09PSBiLm0xMSAmJiB0aGlzLm0xMiA9PT0gYi5tMTIgJiYgdGhpcy5tMTMgPT09IGIubTEzICYmXHJcbiAgICAgICAgICAgIHRoaXMubTIxID09PSBiLm0yMSAmJiB0aGlzLm0yMiA9PT0gYi5tMjIgJiYgdGhpcy5tMjMgPT09IGIubTIzICYmXHJcbiAgICAgICAgICAgIHRoaXMubTMxID09PSBiLm0zMSAmJiB0aGlzLm0zMiA9PT0gYi5tMzIgJiYgdGhpcy5tMzMgPT09IGIubTMzKVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IE1hdDMge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0MyhcclxuICAgICAgICAgICAgdGhpcy5tMTEsIHRoaXMubTEyLCB0aGlzLm0xMyxcclxuICAgICAgICAgICAgdGhpcy5tMjEsIHRoaXMubTIyLCB0aGlzLm0yMyxcclxuICAgICAgICAgICAgdGhpcy5tMzEsIHRoaXMubTMyLCB0aGlzLm0zMylcclxuICAgIH1cclxuXHJcbiAgICB0cmFuc3Bvc2UoKTogTWF0MiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQzKFxyXG4gICAgICAgICAgICB0aGlzLm0xMSwgdGhpcy5tMjEsIHRoaXMubTMxLFxyXG4gICAgICAgICAgICB0aGlzLm0xMiwgdGhpcy5tMjIsIHRoaXMubTMyLFxyXG4gICAgICAgICAgICB0aGlzLm0xMywgdGhpcy5tMjMsIHRoaXMubTMzKVxyXG4gICAgfVxyXG5cclxuICAgIG1hdG11bChiOiBNYXQzKTogTWF0MyB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQzKFxyXG4gICAgICAgICAgICB0aGlzLm0xMSAqIGIubTExICsgdGhpcy5tMTIgKiBiLm0yMSArIHRoaXMubTEzICogYi5tMzEsIC8vIG0xMSxcclxuICAgICAgICAgICAgdGhpcy5tMTEgKiBiLm0xMiArIHRoaXMubTEyICogYi5tMjIgKyB0aGlzLm0xMyAqIGIubTMyLCAvLyBtMTIsXHJcbiAgICAgICAgICAgIHRoaXMubTExICogYi5tMTMgKyB0aGlzLm0xMiAqIGIubTIzICsgdGhpcy5tMTMgKiBiLm0zMywgLy8gbTEzLFxyXG4gICAgICAgICAgICB0aGlzLm0yMSAqIGIubTExICsgdGhpcy5tMjIgKiBiLm0yMSArIHRoaXMubTIzICogYi5tMzEsIC8vIG0yMSxcclxuICAgICAgICAgICAgdGhpcy5tMjEgKiBiLm0xMiArIHRoaXMubTIyICogYi5tMjIgKyB0aGlzLm0yMyAqIGIubTMyLCAvLyBtMjIsXHJcbiAgICAgICAgICAgIHRoaXMubTIxICogYi5tMTMgKyB0aGlzLm0yMiAqIGIubTIzICsgdGhpcy5tMjMgKiBiLm0zMywgLy8gbTIzLFxyXG4gICAgICAgICAgICB0aGlzLm0zMSAqIGIubTExICsgdGhpcy5tMzIgKiBiLm0yMSArIHRoaXMubTMzICogYi5tMzEsIC8vIG0zMSxcclxuICAgICAgICAgICAgdGhpcy5tMzEgKiBiLm0xMiArIHRoaXMubTMyICogYi5tMjIgKyB0aGlzLm0zMyAqIGIubTMyLCAvLyBtMzIsXHJcbiAgICAgICAgICAgIHRoaXMubTMxICogYi5tMTMgKyB0aGlzLm0zMiAqIGIubTIzICsgdGhpcy5tMzMgKiBiLm0zMywgLy8gbTMzXHJcbiAgICAgICAgKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogdHJhbnNmb3JtIHRoZSB2ZWN0b3IgYnkgdGhlIHNwZWNpZmllZCBtYXRyaXhcclxuICAgICAqIHRyZWF0cyB2ZWN0b3IgYXMgYSBjb2x1bW4gbWF0cml4IHRvIGxlZnQgb2YgM3gzIG1hdHJpeFxyXG4gICAgICogfHh5enwgKiBtXHJcbiAgICAgKiBAcGFyYW0gYSB2ZWN0b3JcclxuICAgICAqL1xyXG4gICAgdHJhbnNmb3JtKGE6IFZlYzMpOiBWZWMzIHtcclxuICAgICAgICBjb25zdCB4ID0gYS54ICogdGhpcy5tMTEgKyBhLnkgKiB0aGlzLm0yMSArIGEueiAqIHRoaXMubTMxXHJcbiAgICAgICAgY29uc3QgeSA9IGEueCAqIHRoaXMubTEyICsgYS55ICogdGhpcy5tMjIgKyBhLnogKiB0aGlzLm0zMlxyXG4gICAgICAgIGNvbnN0IHogPSBhLnggKiB0aGlzLm0xMyArIGEueSAqIHRoaXMubTIzICsgYS56ICogdGhpcy5tMzNcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzMoeCwgeSwgeilcclxuICAgIH1cclxuXHJcbiAgICB0b1N0cmluZygpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBgfCAke3RoaXMubTExfSAke3RoaXMubTEyfSAke3RoaXMubTEzfSB8XHJcbnwgJHt0aGlzLm0yMX0gJHt0aGlzLm0yMn0gJHt0aGlzLm0yM30gfFxyXG58ICR7dGhpcy5tMzF9ICR7dGhpcy5tMzJ9ICR7dGhpcy5tMzN9IHxgXHJcbiAgICB9XHJcblxyXG4gICAgdG9BcnJheSgpOiBudW1iZXJbXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgdGhpcy5tMTEsIHRoaXMubTEyLCB0aGlzLm0xMyxcclxuICAgICAgICAgICAgdGhpcy5tMjEsIHRoaXMubTIyLCB0aGlzLm0yMyxcclxuICAgICAgICAgICAgdGhpcy5tMzEsIHRoaXMubTMyLCB0aGlzLm0zMyxcclxuICAgICAgICBdXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXQ0IHtcclxuICAgIHN0YXRpYyBpZGVudGl0eSgpOiBNYXQ0IHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIDEsIDAsIDAsIDAsXHJcbiAgICAgICAgICAgIDAsIDEsIDAsIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIDEsIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIDAsIDEpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHRyYW5zbGF0aW9uKGE6IFZlYzMpOiBNYXQ0IHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIDEsIDAsIDAsIDAsXHJcbiAgICAgICAgICAgIDAsIDEsIDAsIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIDEsIDAsXHJcbiAgICAgICAgICAgIGEueCwgYS55LCBhLnosIDEpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHJvdGF0aW9uWCh0aGV0YTogbnVtYmVyKTogTWF0NCB7XHJcbiAgICAgICAgY29uc3QgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSlcclxuICAgICAgICBjb25zdCBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIDEsIDAsIDAsIDAsXHJcbiAgICAgICAgICAgIDAsIGNvc1RoZXRhLCAtc2luVGhldGEsIDAsXHJcbiAgICAgICAgICAgIDAsIHNpblRoZXRhLCBjb3NUaGV0YSwgMCxcclxuICAgICAgICAgICAgMCwgMCwgMCwgMSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgcm90YXRpb25ZKHRoZXRhOiBudW1iZXIpOiBNYXQ0IHtcclxuICAgICAgICBjb25zdCBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKVxyXG4gICAgICAgIGNvbnN0IHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpXHJcblxyXG4gICAgICAgIHJldHVybiBuZXcgTWF0NChcclxuICAgICAgICAgICAgY29zVGhldGEsIDAsIHNpblRoZXRhLCAwLFxyXG4gICAgICAgICAgICAwLCAxLCAwLCAwLFxyXG4gICAgICAgICAgICAtc2luVGhldGEsIDAsIGNvc1RoZXRhLCAwLFxyXG4gICAgICAgICAgICAwLCAwLCAwLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyByb3RhdGlvbloodGhldGE6IG51bWJlcik6IE1hdDQge1xyXG4gICAgICAgIGNvbnN0IGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpXHJcbiAgICAgICAgY29uc3Qgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSlcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICBjb3NUaGV0YSwgLXNpblRoZXRhLCAwLCAwLFxyXG4gICAgICAgICAgICBzaW5UaGV0YSwgY29zVGhldGEsIDAsIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIDEsIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIDAsIDEpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHJvdGF0aW9uX2F4aXMoYXhpczogVmVjMywgdGhldGE6IG51bWJlcik6IE1hdDQge1xyXG4gICAgICAgIGNvbnN0IGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpXHJcbiAgICAgICAgY29uc3Qgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSlcclxuICAgICAgICBjb25zdCB7IHgsIHksIHogfSA9IGF4aXNcclxuICAgICAgICBjb25zdCB4U2luVGhldGEgPSB4ICogc2luVGhldGFcclxuICAgICAgICBjb25zdCB5U2luVGhldGEgPSB5ICogc2luVGhldGFcclxuICAgICAgICBjb25zdCB6U2luVGhldGEgPSB6ICogc2luVGhldGFcclxuICAgICAgICBjb25zdCBvbmVNaW51c0Nvc1RoZXRhID0gMSAtIGNvc1RoZXRhXHJcblxyXG4gICAgICAgIHJldHVybiBuZXcgTWF0NChcclxuICAgICAgICAgICAgY29zVGhldGEgKyB4ICogeCAqIG9uZU1pbnVzQ29zVGhldGEsIHggKiB5ICogb25lTWludXNDb3NUaGV0YSAtIHpTaW5UaGV0YSwgeCAqIHogKiBvbmVNaW51c0Nvc1RoZXRhICsgeVNpblRoZXRhLCAwLFxyXG4gICAgICAgICAgICB5ICogeCAqIG9uZU1pbnVzQ29zVGhldGEgKyB6U2luVGhldGEsIGNvc1RoZXRhICsgeSAqIHkgKiBvbmVNaW51c0Nvc1RoZXRhLCB5ICogeiAqIG9uZU1pbnVzQ29zVGhldGEgLSB4U2luVGhldGEsIDAsXHJcbiAgICAgICAgICAgIHogKiB4ICogb25lTWludXNDb3NUaGV0YSAtIHlTaW5UaGV0YSwgeiAqIHkgKiBvbmVNaW51c0Nvc1RoZXRhICsgeFNpblRoZXRhLCBjb3NUaGV0YSArIHogKiB6ICogb25lTWludXNDb3NUaGV0YSwgMCxcclxuICAgICAgICAgICAgMCwgMCwgMCwgMSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgc2NhbGluZyh4eXo6IFZlYzMpOiBNYXQ0IHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIHh5ei54LCAwLCAwLCAwLFxyXG4gICAgICAgICAgICAwLCB4eXoueSwgMCwgMCxcclxuICAgICAgICAgICAgMCwgMCwgeHl6LnosIDAsXHJcbiAgICAgICAgICAgIDAsIDAsIDAsIDEpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjcmVhdGUgYSB3ZWJnbCBwZXJzcGVjdGl2ZSBtYXRyaXhcclxuICAgICAqIEBwYXJhbSBmb3ZZIHkgZm92IChyYWRpYW5zKVxyXG4gICAgICogQHBhcmFtIGFzcGVjdCBhc3BlY3QgcmF0aW9cclxuICAgICAqIEBwYXJhbSBuZWFyWiBuZWFyIHogY29vcmRpbmF0ZVxyXG4gICAgICogQHBhcmFtIGZhclogZmFyIHogY29vcmRpbmF0ZVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgcGVyc3BlY3RpdmUoZm92WTogbnVtYmVyLCBhc3BlY3Q6IG51bWJlciwgbmVhclo6IG51bWJlciwgZmFyWjogbnVtYmVyKTogTWF0NCB7XHJcbiAgICAgICAgY29uc3QgZiA9IE1hdGgudGFuKE1hdGguUEkgKiAwLjUgLSAwLjUgKiBmb3ZZKVxyXG4gICAgICAgIGNvbnN0IGludlJhbmdlID0gMSAvIChuZWFyWiAtIGZhclopXHJcblxyXG4gICAgICAgIHJldHVybiBuZXcgTWF0NChcclxuICAgICAgICAgICAgZiAvIGFzcGVjdCwgMCwgMCwgMCxcclxuICAgICAgICAgICAgMCwgZiwgMCwgMCxcclxuICAgICAgICAgICAgMCwgMCwgKG5lYXJaICsgZmFyWikgKiBpbnZSYW5nZSwgLTEsXHJcbiAgICAgICAgICAgIDAsIDAsIG5lYXJaICogZmFyWiAqIGludlJhbmdlICogMiwgMFxyXG4gICAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNvbnN0cnVjdCBhIGxvb2sgYXQgbWF0cml4IHRoYXQgcGxhY2VzIHRoZSBjYW1lcmEgYXQgdGhlIGV5ZSBwb2ludCwgbG9va2luZyBhdCB0aGUgc3BlY2lmaWVkIHRhcmdldFxyXG4gICAgICogaW52ZXJ0IGZvciBhIFwidmlld1wiIG1hdHJpeFxyXG4gICAgICogQHBhcmFtIGV5ZSBleWUgcG9zaXRpb25cclxuICAgICAqIEBwYXJhbSB0YXJnZXQgdGFyZ2V0IHBvc2l0aW9uXHJcbiAgICAgKiBAcGFyYW0gdXAgdXAgYXhpc1xyXG4gICAgICovXHJcbiAgICBzdGF0aWMgbG9va0F0KGV5ZTogVmVjMywgdGFyZ2V0OiBWZWMzLCB1cDogVmVjMyk6IE1hdDQge1xyXG4gICAgICAgIGNvbnN0IHpBeGlzID0gZXllLnN1Yih0YXJnZXQpLm5vcm1hbGl6ZSgpXHJcbiAgICAgICAgY29uc3QgeEF4aXMgPSB1cC5jcm9zcyh6QXhpcylcclxuICAgICAgICBjb25zdCB5QXhpcyA9IHpBeGlzLmNyb3NzKHhBeGlzKVxyXG4gICAgICAgIHJldHVybiBNYXQ0LmJhc2lzKHhBeGlzLCB5QXhpcywgekF4aXMsIGV5ZSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgYmFzaXMoeEF4aXM6IFZlYzMsIHlBeGlzOiBWZWMzLCB6QXhpczogVmVjMywgdHJhbnNsYXRpb246IFZlYzMpIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIHhBeGlzLngsIHhBeGlzLnksIHhBeGlzLnosIDAsXHJcbiAgICAgICAgICAgIHlBeGlzLngsIHlBeGlzLnksIHlBeGlzLnosIDAsXHJcbiAgICAgICAgICAgIHpBeGlzLngsIHpBeGlzLnksIHpBeGlzLnosIDAsXHJcbiAgICAgICAgICAgIHRyYW5zbGF0aW9uLngsIHRyYW5zbGF0aW9uLnksIHRyYW5zbGF0aW9uLnosIDFcclxuICAgICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgcHVibGljIG0xMTogbnVtYmVyLCBwdWJsaWMgbTEyOiBudW1iZXIsIHB1YmxpYyBtMTM6IG51bWJlciwgcHVibGljIG0xNDogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyBtMjE6IG51bWJlciwgcHVibGljIG0yMjogbnVtYmVyLCBwdWJsaWMgbTIzOiBudW1iZXIsIHB1YmxpYyBtMjQ6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgbTMxOiBudW1iZXIsIHB1YmxpYyBtMzI6IG51bWJlciwgcHVibGljIG0zMzogbnVtYmVyLCBwdWJsaWMgbTM0OiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIG00MTogbnVtYmVyLCBwdWJsaWMgbTQyOiBudW1iZXIsIHB1YmxpYyBtNDM6IG51bWJlciwgcHVibGljIG00NDogbnVtYmVyKSB7IH1cclxuXHJcbiAgICBlcXVhbChiOiBNYXQ0KTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgdGhpcy5tMTEgPT09IGIubTExICYmIHRoaXMubTEyID09PSBiLm0xMiAmJiB0aGlzLm0xMyA9PT0gYi5tMTMgJiYgdGhpcy5tMTQgPT09IGIubTE0ICYmXHJcbiAgICAgICAgICAgIHRoaXMubTIxID09PSBiLm0yMSAmJiB0aGlzLm0yMiA9PT0gYi5tMjIgJiYgdGhpcy5tMjMgPT09IGIubTIzICYmIHRoaXMubTI0ID09PSBiLm0yNCAmJlxyXG4gICAgICAgICAgICB0aGlzLm0zMSA9PT0gYi5tMzEgJiYgdGhpcy5tMzIgPT09IGIubTMyICYmIHRoaXMubTMzID09PSBiLm0zMyAmJiB0aGlzLm0zNCA9PT0gYi5tMzQgJiZcclxuICAgICAgICAgICAgdGhpcy5tNDEgPT09IGIubTQxICYmIHRoaXMubTQyID09PSBiLm00MiAmJiB0aGlzLm00MyA9PT0gYi5tNDMgJiYgdGhpcy5tNDQgPT09IGIubTQ0KVxyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IE1hdDQge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0NChcclxuICAgICAgICAgICAgdGhpcy5tMTEsIHRoaXMubTEyLCB0aGlzLm0xMywgdGhpcy5tMTQsXHJcbiAgICAgICAgICAgIHRoaXMubTIxLCB0aGlzLm0yMiwgdGhpcy5tMjMsIHRoaXMubTI0LFxyXG4gICAgICAgICAgICB0aGlzLm0zMSwgdGhpcy5tMzIsIHRoaXMubTMzLCB0aGlzLm0zNCxcclxuICAgICAgICAgICAgdGhpcy5tNDEsIHRoaXMubTQyLCB0aGlzLm00MywgdGhpcy5tNDQpXHJcbiAgICB9XHJcblxyXG4gICAgdHJhbnNwb3NlKCk6IE1hdDQge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0NChcclxuICAgICAgICAgICAgdGhpcy5tMTEsIHRoaXMubTIxLCB0aGlzLm0zMSwgdGhpcy5tNDEsXHJcbiAgICAgICAgICAgIHRoaXMubTEyLCB0aGlzLm0yMiwgdGhpcy5tMzIsIHRoaXMubTQyLFxyXG4gICAgICAgICAgICB0aGlzLm0xMywgdGhpcy5tMjMsIHRoaXMubTMzLCB0aGlzLm00MyxcclxuICAgICAgICAgICAgdGhpcy5tMTQsIHRoaXMubTI0LCB0aGlzLm0zNCwgdGhpcy5tNDQpXHJcbiAgICB9XHJcblxyXG4gICAgbWF0bXVsKGI6IE1hdDQpOiBNYXQ0IHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDQoXHJcbiAgICAgICAgICAgIHRoaXMubTExICogYi5tMTEgKyB0aGlzLm0xMiAqIGIubTIxICsgdGhpcy5tMTMgKiBiLm0zMSArIHRoaXMubTE0ICogYi5tNDEsIC8vIG0xMVxyXG4gICAgICAgICAgICB0aGlzLm0xMSAqIGIubTEyICsgdGhpcy5tMTIgKiBiLm0yMiArIHRoaXMubTEzICogYi5tMzIgKyB0aGlzLm0xNCAqIGIubTQyLCAvLyBtMTJcclxuICAgICAgICAgICAgdGhpcy5tMTEgKiBiLm0xMyArIHRoaXMubTEyICogYi5tMjMgKyB0aGlzLm0xMyAqIGIubTMzICsgdGhpcy5tMTQgKiBiLm00MywgLy8gbTEzXHJcbiAgICAgICAgICAgIHRoaXMubTExICogYi5tMTQgKyB0aGlzLm0xMiAqIGIubTI0ICsgdGhpcy5tMTMgKiBiLm0zNCArIHRoaXMubTE0ICogYi5tNDQsIC8vIG0xNFxyXG4gICAgICAgICAgICB0aGlzLm0yMSAqIGIubTExICsgdGhpcy5tMjIgKiBiLm0yMSArIHRoaXMubTIzICogYi5tMzEgKyB0aGlzLm0yNCAqIGIubTQxLCAvLyBtMjFcclxuICAgICAgICAgICAgdGhpcy5tMjEgKiBiLm0xMiArIHRoaXMubTIyICogYi5tMjIgKyB0aGlzLm0yMyAqIGIubTMyICsgdGhpcy5tMjQgKiBiLm00MiwgLy8gbTIyXHJcbiAgICAgICAgICAgIHRoaXMubTIxICogYi5tMTMgKyB0aGlzLm0yMiAqIGIubTIzICsgdGhpcy5tMjMgKiBiLm0zMyArIHRoaXMubTI0ICogYi5tNDMsIC8vIG0yM1xyXG4gICAgICAgICAgICB0aGlzLm0yMSAqIGIubTE0ICsgdGhpcy5tMjIgKiBiLm0yNCArIHRoaXMubTIzICogYi5tMzQgKyB0aGlzLm0yNCAqIGIubTQ0LCAvLyBtMjRcclxuICAgICAgICAgICAgdGhpcy5tMzEgKiBiLm0xMSArIHRoaXMubTMyICogYi5tMjEgKyB0aGlzLm0zMyAqIGIubTMxICsgdGhpcy5tMzQgKiBiLm00MSwgLy8gbTMxXHJcbiAgICAgICAgICAgIHRoaXMubTMxICogYi5tMTIgKyB0aGlzLm0zMiAqIGIubTIyICsgdGhpcy5tMzMgKiBiLm0zMiArIHRoaXMubTM0ICogYi5tNDIsIC8vIG0zMlxyXG4gICAgICAgICAgICB0aGlzLm0zMSAqIGIubTEzICsgdGhpcy5tMzIgKiBiLm0yMyArIHRoaXMubTMzICogYi5tMzMgKyB0aGlzLm0zNCAqIGIubTQzLCAvLyBtMzNcclxuICAgICAgICAgICAgdGhpcy5tMzEgKiBiLm0xNCArIHRoaXMubTMyICogYi5tMjQgKyB0aGlzLm0zMyAqIGIubTM0ICsgdGhpcy5tMzQgKiBiLm00NCwgLy8gbTM0XHJcbiAgICAgICAgICAgIHRoaXMubTQxICogYi5tMTEgKyB0aGlzLm00MiAqIGIubTIxICsgdGhpcy5tNDMgKiBiLm0zMSArIHRoaXMubTQ0ICogYi5tNDEsIC8vIG00MVxyXG4gICAgICAgICAgICB0aGlzLm00MSAqIGIubTEyICsgdGhpcy5tNDIgKiBiLm0yMiArIHRoaXMubTQzICogYi5tMzIgKyB0aGlzLm00NCAqIGIubTQyLCAvLyBtNDJcclxuICAgICAgICAgICAgdGhpcy5tNDEgKiBiLm0xMyArIHRoaXMubTQyICogYi5tMjMgKyB0aGlzLm00MyAqIGIubTMzICsgdGhpcy5tNDQgKiBiLm00MywgLy8gbTQzXHJcbiAgICAgICAgICAgIHRoaXMubTQxICogYi5tMTQgKyB0aGlzLm00MiAqIGIubTI0ICsgdGhpcy5tNDMgKiBiLm0zNCArIHRoaXMubTQ0ICogYi5tNDQsIC8vIG00NFxyXG4gICAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHRyYW5zZm9ybSB0aGUgdmVjdG9yIGJ5IHRoZSBzcGVjaWZpZWQgbWF0cml4XHJcbiAgICAgKiB0cmVhdHMgdmVjdG9yIGFzIGEgY29sdW1uIG1hdHJpeCB0byBsZWZ0IG9mIDR4NCBtYXRyaXhcclxuICAgICAqIHByb2plY3RzIGJhY2sgdG8gdyA9IDEgc3BhY2UgYWZ0ZXIgbXVsdGlwbGljYXRpb25cclxuICAgICAqIHx4eXoxfCAqIG1cclxuICAgICAqIEBwYXJhbSBhIHZlY3RvclxyXG4gICAgICovXHJcbiAgICB0cmFuc2Zvcm0zKGE6IFZlYzMpOiBWZWMzIHtcclxuICAgICAgICBjb25zdCB3ID0gYS54ICogdGhpcy5tMTQgKyBhLnkgKiB0aGlzLm0yNCArIGEueiAqIHRoaXMubTM0ICsgdGhpcy5tNDRcclxuICAgICAgICBjb25zdCBpbnZXID0gMSAvIHdcclxuICAgICAgICBjb25zdCB4ID0gKGEueCAqIHRoaXMubTExICsgYS55ICogdGhpcy5tMjEgKyBhLnogKiB0aGlzLm0zMSArIHRoaXMubTQxKSAvIGludldcclxuICAgICAgICBjb25zdCB5ID0gKGEueCAqIHRoaXMubTEyICsgYS55ICogdGhpcy5tMjIgKyBhLnogKiB0aGlzLm0zMiArIHRoaXMubTQyKSAvIGludldcclxuICAgICAgICBjb25zdCB6ID0gKGEueCAqIHRoaXMubTEzICsgYS55ICogdGhpcy5tMjMgKyBhLnogKiB0aGlzLm0zMyArIHRoaXMubTQzKSAvIGludldcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzMoeCwgeSwgeilcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHRyYW5zZm9ybSBhIHZlY3RvciB1c2luZyBtYXRyaXggbXVsdGlwbGljYXRpb25cclxuICAgICAqIHRyZWF0cyB2ZWN0b3IgYXMgYSBjb2x1bW4gdmVjdG9yIGluIG11bHRpcGxpY2F0aW9uIHx4eXp3fCAqIG1cclxuICAgICAqIEBwYXJhbSBhIHZlY3RvclxyXG4gICAgICovXHJcbiAgICB0cmFuc2Zvcm00KGE6IFZlYzQpOiBWZWM0IHtcclxuICAgICAgICBjb25zdCB4ID0gYS54ICogdGhpcy5tMTEgKyBhLnkgKiB0aGlzLm0yMSArIGEueiAqIHRoaXMubTMxICsgYS53ICogdGhpcy5tNDFcclxuICAgICAgICBjb25zdCB5ID0gYS54ICogdGhpcy5tMTIgKyBhLnkgKiB0aGlzLm0yMiArIGEueiAqIHRoaXMubTMyICsgYS53ICogdGhpcy5tNDJcclxuICAgICAgICBjb25zdCB6ID0gYS54ICogdGhpcy5tMTMgKyBhLnkgKiB0aGlzLm0yMyArIGEueiAqIHRoaXMubTMzICsgYS53ICogdGhpcy5tNDNcclxuICAgICAgICBjb25zdCB3ID0gYS54ICogdGhpcy5tMTQgKyBhLnkgKiB0aGlzLm0yNCArIGEueiAqIHRoaXMubTM0ICsgYS53ICogdGhpcy5tNDRcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQoeCwgeSwgeiwgdylcclxuICAgIH1cclxuXHJcbiAgICBpbnZlcnQoKTogTWF0NCB7XHJcbiAgICAgICAgY29uc3QgczAgPSB0aGlzLm0xMSAqIHRoaXMubTIyIC0gdGhpcy5tMTIgKiB0aGlzLm0yMTtcclxuICAgICAgICBjb25zdCBzMSA9IHRoaXMubTExICogdGhpcy5tMjMgLSB0aGlzLm0xMyAqIHRoaXMubTIxO1xyXG4gICAgICAgIGNvbnN0IHMyID0gdGhpcy5tMTEgKiB0aGlzLm0yNCAtIHRoaXMubTE0ICogdGhpcy5tMjE7XHJcbiAgICAgICAgY29uc3QgczMgPSB0aGlzLm0xMiAqIHRoaXMubTIzIC0gdGhpcy5tMTMgKiB0aGlzLm0yMjtcclxuICAgICAgICBjb25zdCBzNCA9IHRoaXMubTEyICogdGhpcy5tMjQgLSB0aGlzLm0xNCAqIHRoaXMubTIyO1xyXG4gICAgICAgIGNvbnN0IHM1ID0gdGhpcy5tMTMgKiB0aGlzLm0yNCAtIHRoaXMubTE0ICogdGhpcy5tMjM7XHJcbiAgICAgICAgY29uc3QgYzUgPSB0aGlzLm0zMyAqIHRoaXMubTQ0IC0gdGhpcy5tMzQgKiB0aGlzLm00MztcclxuICAgICAgICBjb25zdCBjNCA9IHRoaXMubTMyICogdGhpcy5tNDQgLSB0aGlzLm0zNCAqIHRoaXMubTQyO1xyXG4gICAgICAgIGNvbnN0IGMzID0gdGhpcy5tMzIgKiB0aGlzLm00MyAtIHRoaXMubTMzICogdGhpcy5tNDI7XHJcbiAgICAgICAgY29uc3QgYzIgPSB0aGlzLm0zMSAqIHRoaXMubTQ0IC0gdGhpcy5tMzQgKiB0aGlzLm00MTtcclxuICAgICAgICBjb25zdCBjMSA9IHRoaXMubTMxICogdGhpcy5tNDMgLSB0aGlzLm0zMyAqIHRoaXMubTQxO1xyXG4gICAgICAgIGNvbnN0IGMwID0gdGhpcy5tMzEgKiB0aGlzLm00MiAtIHRoaXMubTMyICogdGhpcy5tNDE7XHJcbiAgICAgICAgY29uc3QgZGV0ID0gczAgKiBjNSAtIHMxICogYzQgKyBzMiAqIGMzICsgczMgKiBjMiAtIHM0ICogYzEgKyBzNSAqIGMwO1xyXG5cclxuICAgICAgICBpZiAoZGV0ID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGludmVydFwiKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQ0KFxyXG4gICAgICAgICAgICAodGhpcy5tMjIgKiBjNSAtIHRoaXMubTIzICogYzQgKyB0aGlzLm0yNCAqIGMzKSAvIGRldCwgKC10aGlzLm0xMiAqIGM1ICsgdGhpcy5tMTMgKiBjNCAtIHRoaXMubTE0ICogYzMpIC8gZGV0LCAodGhpcy5tNDIgKiBzNSAtIHRoaXMubTQzICogczQgKyB0aGlzLm00NCAqIHMzKSAvIGRldCwgKC10aGlzLm0zMiAqIHM1ICsgdGhpcy5tMzMgKiBzNCAtIHRoaXMubTM0ICogczMpIC8gZGV0LFxyXG4gICAgICAgICAgICAoLXRoaXMubTIxICogYzUgKyB0aGlzLm0yMyAqIGMyIC0gdGhpcy5tMjQgKiBjMSkgLyBkZXQsICh0aGlzLm0xMSAqIGM1IC0gdGhpcy5tMTMgKiBjMiArIHRoaXMubTE0ICogYzEpIC8gZGV0LCAoLXRoaXMubTQxICogczUgKyB0aGlzLm00MyAqIHMyIC0gdGhpcy5tNDQgKiBzMSkgLyBkZXQsICh0aGlzLm0zMSAqIHM1IC0gdGhpcy5tMzMgKiBzMiArIHRoaXMubTM0ICogczEpIC8gZGV0LFxyXG4gICAgICAgICAgICAodGhpcy5tMjEgKiBjNCAtIHRoaXMubTIyICogYzIgKyB0aGlzLm0yNCAqIGMwKSAvIGRldCwgKC10aGlzLm0xMSAqIGM0ICsgdGhpcy5tMTIgKiBjMiAtIHRoaXMubTE0ICogYzApIC8gZGV0LCAodGhpcy5tNDEgKiBzNCAtIHRoaXMubTQyICogczIgKyB0aGlzLm00NCAqIHMwKSAvIGRldCwgKC10aGlzLm0zMSAqIHM0ICsgdGhpcy5tMzIgKiBzMiAtIHRoaXMubTM0ICogczApIC8gZGV0LFxyXG4gICAgICAgICAgICAoLXRoaXMubTIxICogYzMgKyB0aGlzLm0yMiAqIGMxIC0gdGhpcy5tMjMgKiBjMCkgLyBkZXQsICh0aGlzLm0xMSAqIGMzIC0gdGhpcy5tMTIgKiBjMSArIHRoaXMubTEzICogYzApIC8gZGV0LCAoLXRoaXMubTQxICogczMgKyB0aGlzLm00MiAqIHMxIC0gdGhpcy5tNDMgKiBzMCkgLyBkZXQsICh0aGlzLm0zMSAqIHMzIC0gdGhpcy5tMzIgKiBzMSArIHRoaXMubTMzICogczApIC8gZGV0XHJcbiAgICAgICAgKVxyXG4gICAgfVxyXG5cclxuICAgIHRvU3RyaW5nKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGB8ICR7dGhpcy5tMTF9ICR7dGhpcy5tMTJ9ICR7dGhpcy5tMTN9ICR7dGhpcy5tMTR9IHxcclxufCAke3RoaXMubTIxfSAke3RoaXMubTIyfSAke3RoaXMubTIzfSAke3RoaXMubTI0fSB8XHJcbnwgJHt0aGlzLm0zMX0gJHt0aGlzLm0zMn0gJHt0aGlzLm0zM30gJHt0aGlzLm0zNH0gfFxyXG58ICR7dGhpcy5tNDF9ICR7dGhpcy5tNDJ9ICR7dGhpcy5tNDN9ICR7dGhpcy5tNDR9IHxgXHJcbiAgICB9XHJcblxyXG4gICAgdG9BcnJheSgpOiBudW1iZXJbXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgdGhpcy5tMTEsIHRoaXMubTEyLCB0aGlzLm0xMywgdGhpcy5tMTQsXHJcbiAgICAgICAgICAgIHRoaXMubTIxLCB0aGlzLm0yMiwgdGhpcy5tMjMsIHRoaXMubTI0LFxyXG4gICAgICAgICAgICB0aGlzLm0zMSwgdGhpcy5tMzIsIHRoaXMubTMzLCB0aGlzLm0zNCxcclxuICAgICAgICAgICAgdGhpcy5tNDEsIHRoaXMubTQyLCB0aGlzLm00MywgdGhpcy5tNDQsXHJcbiAgICAgICAgXVxyXG4gICAgfVxyXG59Il19