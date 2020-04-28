import * as util from "../shared/util.js";
var Axis;
(function (Axis) {
    Axis[Axis["None"] = 0] = "None";
    Axis[Axis["X"] = 1] = "X";
    Axis[Axis["Y"] = 2] = "Y";
    Axis[Axis["Z"] = 3] = "Z";
})(Axis || (Axis = {}));
export function palettizeMedianCut(imageData, maxColors) {
    const buckets = [];
    const data = imageData.data;
    // place all colors in initial bucket
    const bucket = createBucket(data, util.sequence(imageData.width * imageData.height));
    buckets.push(bucket);
    while (buckets.length < maxColors) {
        const bucket = buckets.reduce((x, y) => x.range > y.range ? x : y);
        const newBucket = splitBucket(data, bucket);
        buckets.push(newBucket);
    }
    // choose color for each bucket
    const palette = buckets.map(b => divXYZ(b.indices.reduce((xyz, i) => addXYZ(xyz, [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]), [0, 0, 0]), b.indices.length));
    const paletteOverlay = util.fill(0, imageData.width * imageData.height);
    for (let i = 0; i < buckets.length; ++i) {
        const bucket = buckets[i];
        for (let j = 0; j < bucket.indices.length; ++j) {
            paletteOverlay[bucket.indices[j]] = i;
        }
    }
    return [palette, paletteOverlay];
}
export function palettizeHistogram(imageData, bucketsPerComponent, maxColors) {
    const { width, height, data } = imageData;
    const pixels = width * height;
    const bucketPitch = bucketsPerComponent * bucketsPerComponent;
    const numBuckets = bucketPitch * bucketsPerComponent;
    // creat intial buckets
    const buckets = util.generate(numBuckets, () => ({ color: [0, 0, 0], pixels: 0 }));
    // assign and update bucket for each pixel
    const bucketOverlay = util.generate(pixels, i => {
        const r = data[i * 4] / 255;
        const g = data[i * 4 + 1] / 255;
        const b = data[i * 4 + 2] / 255;
        const rb = Math.min(Math.floor(r * bucketsPerComponent), bucketsPerComponent - 1);
        const gb = Math.min(Math.floor(g * bucketsPerComponent), bucketsPerComponent - 1);
        const bb = Math.min(Math.floor(b * bucketsPerComponent), bucketsPerComponent - 1);
        const bucketIdx = rb * bucketPitch + gb * bucketsPerComponent + bb;
        const bucket = buckets[bucketIdx];
        bucket.color = addXYZ([r, g, b], bucket.color);
        bucket.pixels++;
        return bucket;
    });
    // calculate bucket colors
    for (const bucket of buckets) {
        bucket.color = divXYZ(bucket.color, bucket.pixels);
    }
    const topBuckets = buckets
        .sort((b1, b2) => b2.pixels - b1.pixels)
        .slice(0, maxColors);
    const bucketSet = new Set(topBuckets);
    // map all colors to top N buckets
    for (let i = 0; i < bucketOverlay.length; ++i) {
        if (bucketSet.has(bucketOverlay[i])) {
            continue;
        }
        // otherwise, map to new bucket
        const r = data[i * 4] / 255;
        const g = data[i * 4] / 255;
        const b = data[i * 4] / 255;
        const color = [r, g, b];
        const bucket = topBuckets.reduce((b1, b2) => calcDistSq(b1.color, color) < calcDistSq(b2.color, color) ? b1 : b2);
        bucketOverlay[i] = bucket;
    }
    // determine palette colors
    const palette = topBuckets.map(b => mulXYZ(b.color, 255));
    const paletteOverlay = bucketOverlay.map(b => buckets.indexOf(b));
    return [palette, paletteOverlay];
}
export function applyPalette(palette, palleteOverlay, imageData) {
    const data = imageData.data;
    for (let i = 0; i < palleteOverlay.length; ++i) {
        // ignore index of -1
        const idx = palleteOverlay[i];
        if (idx == -1) {
            continue;
        }
        const color = palette[idx];
        data[i * 4] = color[0];
        data[i * 4 + 1] = color[1];
        data[i * 4 + 2] = color[2];
    }
}
function createBucket(data, indices) {
    if (indices.length == 0) {
        throw new Error("bucket must contain at least 1 value");
    }
    const bucket = {
        indices: indices,
        splitAxis: Axis.None,
        range: 0
    };
    updateBucket(data, bucket);
    return bucket;
}
function updateBucket(data, bucket) {
    bucket.range = 0;
    bucket.splitAxis = Axis.None;
    let minX = Infinity;
    let maxX = -1;
    let minY = Infinity;
    let maxY = -1;
    let minZ = Infinity;
    let maxZ = -1;
    for (const i of bucket.indices) {
        const x = data[i * 4];
        const y = data[i * 4 + 1];
        const z = data[i * 4 + 2];
        minX = Math.min(x, minX);
        maxX = Math.max(x, maxX);
        minY = Math.min(y, minY);
        maxY = Math.max(y, maxY);
        minZ = Math.min(z, minZ);
        maxZ = Math.max(z, maxZ);
    }
    const dx = maxX - minX;
    const dy = maxY - minY;
    const dz = maxZ - minZ;
    bucket.range = Math.max(dx, dy, dz);
    if (bucket.range === dx) {
        bucket.splitAxis = Axis.X;
    }
    else if (bucket.range === dy) {
        bucket.splitAxis = Axis.Y;
    }
    else {
        bucket.splitAxis = Axis.Z;
    }
}
function splitBucket(data, bucket) {
    if (bucket.indices.length <= 1) {
        throw Error("Bucket must > 1 element to split");
    }
    // determine component with max range in bucket
    switch (bucket.splitAxis) {
        case Axis.X:
            bucket.indices.sort((a, b) => data[a * 4] - data[b * 4]);
            break;
        case Axis.Y:
            bucket.indices.sort((a, b) => data[a * 4 + 1] - data[b * 4 + 1]);
            break;
        case Axis.Z:
            bucket.indices.sort((a, b) => data[a * 4 + 2] - data[b * 4 + 2]);
            break;
        default:
            throw new Error("Invalid split axis");
            break;
    }
    // left half of array stays in bucket
    // right half moves to new bucket
    const medianIdx = Math.floor(bucket.indices.length / 2);
    const newIndices = bucket.indices.splice(medianIdx, bucket.indices.length - medianIdx);
    const newBucket = createBucket(data, newIndices);
    updateBucket(data, bucket);
    return newBucket;
}
export function mulXYZ(xyz, s) {
    const [x, y, z] = xyz;
    return [x * s, y * s, z * s];
}
export function divXYZ(xyz, s) {
    const [x, y, z] = xyz;
    return [x / s, y / s, z / s];
}
export function addXYZ(xyz1, xyz2) {
    return [xyz1[0] + xyz2[0], xyz1[1] + xyz2[1], xyz1[2] + xyz2[2]];
}
export function equalXYZ(xyz1, xyz2) {
    return xyz1[0] === xyz2[0] && xyz1[1] === xyz2[1] && xyz1[2] === xyz2[2];
}
export function calcDistSq(xyz1, xyz2) {
    const [x1, y1, z1] = xyz1;
    const [x2, y2, z2] = xyz2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const distSq = dx * dx + dy * dy + dz * dz;
    return distSq;
}
export function calcDist(xyz1, xyz2) {
    return Math.sqrt(calcDistSq(xyz1, xyz2));
}
export function scanImageData(imageData, f) {
    const { width, height } = imageData;
    scan(width, height, f);
}
export function scan(width, height, f) {
    for (let y = 0; y < height; ++y) {
        const yOffset = y * width;
        for (let x = 0; x < width; ++x) {
            const xOffset = yOffset + x;
            f(x, y, xOffset);
        }
    }
}
export function scanRegion(x0, y0, width, height, rowPitch, f) {
    const x1 = x0 + width;
    const y1 = y0 + height;
    for (let y = y0; y < y1; ++y) {
        const yOffset = y * rowPitch;
        for (let x = x0; x < x1; ++x) {
            const xOffset = yOffset + x;
            f(x, y, xOffset);
        }
    }
}
export function scanRows(width, height, f) {
    for (let y = 0; y < height; ++y) {
        const offset = y * width;
        f(y, offset);
    }
}
export function scanRowsRegion(y0, height, rowPitch, f) {
    const y1 = y0 + height;
    for (let y = 0; y < y1; ++y) {
        const offset = y * rowPitch;
        f(y, offset);
    }
}
export function rgb2xyz(rgb) {
    let [r, b, g] = rgb;
    r /= 255.0;
    g /= 255.0;
    b /= 255.0;
    const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
    const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
    return [x, y, z];
}
export function xyz2rgb(xyz) {
    const [x, y, z] = xyz;
    const r = (x * 3.2404542 + y * -1.5371385 + z * -0.4985314) * 255;
    const g = (x * -0.9692660 + y * 1.8760108 + z * 0.0415560) * 255;
    const b = (x * 0.0556434 + y * -0.2040259 + z * 1.0572252) * 255;
    return [r, g, b];
}
export function linear(x) {
    if (x <= .04045) {
        return x / 12.92;
    }
    return Math.pow(((x + .055) / 1.055), 2.4);
}
export function imageData2RGBArray(data) {
    const result = [];
    for (let i = 0; i < data.length; i += 4) {
        result.push([data[i], data[i + 1], data[i + 2]]);
    }
    return result;
}
export function calcLuminance(color) {
    const [r, g, b] = color;
    const l = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
    return l;
}
export function copyImageData(imageData) {
    return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1hZ2luZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImltYWdpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUV6QyxJQUFLLElBQXNCO0FBQTNCLFdBQUssSUFBSTtJQUFHLCtCQUFJLENBQUE7SUFBRSx5QkFBQyxDQUFBO0lBQUUseUJBQUMsQ0FBQTtJQUFFLHlCQUFDLENBQUE7QUFBQyxDQUFDLEVBQXRCLElBQUksS0FBSixJQUFJLFFBQWtCO0FBVTNCLE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxTQUFvQixFQUFFLFNBQWlCO0lBQ3RFLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQTtJQUM1QixNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFBO0lBRTNCLHFDQUFxQztJQUNyQyxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUNwRixPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBRXBCLE9BQU8sT0FBTyxDQUFDLE1BQU0sR0FBRyxTQUFTLEVBQUU7UUFDL0IsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsRSxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzNDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7S0FDMUI7SUFFRCwrQkFBK0I7SUFDL0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdB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LENBQUMsQ0FBQyxDQUFBO0lBQ2IsSUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFBO0lBQ25CLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ2IsSUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFBO0lBQ25CLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBRWIsS0FBSyxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFO1FBQzVCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDckIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDekIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDekIsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hCLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4QixJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEIsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hCLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4QixJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7S0FDM0I7SUFFRCxNQUFNLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFBO0lBQ3RCLE1BQU0sRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUE7SUFDdEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQTtJQUN0QixNQUFNLENBQUMsS0FBSyxHQUFH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Q0FBQTtBQUM5QyxDQUFDO0FBRUQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLElBQXVCO0lBQ3RELE1BQU0sTUFBTSxHQUFZLEVBQUUsQ0FBQTtJQUMxQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3JDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUNuRDtJQUVELE9BQU8sTUFBTSxDQUFBO0FBQ2pCLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEtBQVk7SUFDdEMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFBO0lBQ3ZCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFBO0lBQ3RFLE9BQU8sQ0FBQyxDQUFBO0FBQ1osQ0FBQztBQUVELE1BQU0sVUFBVSxhQUFhLENBQUMsU0FBb0I7SUFDOUMsT0FBTyxJQUFJLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUNsRyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgdXRpbCBmcm9tIFwiLi4vc2hhcmVkL3V0aWwuanNcIlxyXG5cclxuZW51bSBBeGlzIHsgTm9uZSwgWCwgWSwgWiB9XHJcblxyXG5pbnRlcmZhY2UgQnVja2V0IHtcclxuICAgIGluZGljZXM6IG51bWJlcltdXHJcbiAgICByYW5nZTogbnVtYmVyXHJcbiAgICBzcGxpdEF4aXM6IEF4aXNcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgQ29sb3IgPSBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwYWxldHRpemVNZWRpYW5DdXQoaW1hZ2VEYXRhOiBJbWFnZURhdGEsIG1heENvbG9yczogbnVtYmVyKTogW0NvbG9yW10sIG51bWJlcltdXSB7XHJcbiAgICBjb25zdCBidWNrZXRzOiBCdWNrZXRbXSA9IFtdXHJcbiAgICBjb25zdCBkYXRhID0gaW1hZ2VEYXRhLmRhdGFcclxuXHJcbiAgICAvLyBwbGFjZSBhbGwgY29sb3JzIGluIGluaXRpYWwgYnVja2V0XHJcbiAgICBjb25zdCBidWNrZXQgPSBjcmVhdGVCdWNrZXQoZGF0YSwgdXRpbC5zZXF1ZW5jZShpbWFnZURhdGEud2lkdGggKiBpbWFnZURhdGEuaGVpZ2h0KSlcclxuICAgIGJ1Y2tldHMucHVzaChidWNrZXQpXHJcblxyXG4gICAgd2hpbGUgKGJ1Y2tldHMubGVuZ3RoIDwgbWF4Q29sb3JzKSB7XHJcbiAgICAgICAgY29uc3QgYnVja2V0ID0gYnVja2V0cy5yZWR1Y2UoKHgsIHkpID0+IHgucmFuZ2UgPiB5LnJhbmdlID8geCA6IHkpXHJcbiAgICAgICAgY29uc3QgbmV3QnVja2V0ID0gc3BsaXRCdWNrZXQoZGF0YSwgYnVja2V0KVxyXG4gICAgICAgIGJ1Y2tldHMucHVzaChuZXdCdWNrZXQpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gY2hvb3NlIGNvbG9yIGZvciBlYWNoIGJ1Y2tldFxyXG4gICAgY29uc3QgcGFsZXR0ZSA9IGJ1Y2tldHMubWFwKGIgPT4gZGl2WFlaKGIuaW5kaWNlcy5yZWR1Y2UoKHh5eiwgaSkgPT4gYWRkWFlaKHh5eiwgW2RhdGFbaSAqIDRdLCBkYXRhW2kgKiA0ICsgMV0sIGRhdGFbaSAqIDQgKyAyXV0pLCBbMCwgMCwgMF0pLCBiLmluZGljZXMubGVuZ3RoKSlcclxuICAgIGNvbnN0IHBhbGV0dGVPdmVybGF5ID0gdXRpbC5maWxsKDAsIGltYWdlRGF0YS53aWR0aCAqIGltYWdlRGF0YS5oZWlnaHQpXHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBidWNrZXRzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgYnVja2V0ID0gYnVja2V0c1tpXVxyXG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgYnVja2V0LmluZGljZXMubGVuZ3RoOyArK2opIHtcclxuICAgICAgICAgICAgcGFsZXR0ZU92ZXJsYXlbYnVja2V0LmluZGljZXNbal1dID0gaVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gW3BhbGV0dGUsIHBhbGV0dGVPdmVybGF5XVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcGFsZXR0aXplSGlzdG9ncmFtKGltYWdlRGF0YTogSW1hZ2VEYXRhLCBidWNrZXRzUGVyQ29tcG9uZW50OiBudW1iZXIsIG1heENvbG9yczogbnVtYmVyKTogW0NvbG9yW10sIG51bWJlcltdXSB7XHJcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQsIGRhdGEgfSA9IGltYWdlRGF0YVxyXG4gICAgY29uc3QgcGl4ZWxzID0gd2lkdGggKiBoZWlnaHRcclxuICAgIGNvbnN0IGJ1Y2tldFBpdGNoID0gYnVja2V0c1BlckNvbXBvbmVudCAqIGJ1Y2tldHNQZXJDb21wb25lbnRcclxuICAgIGNvbnN0IG51bUJ1Y2tldHMgPSBidWNrZXRQaXRjaCAqIGJ1Y2tldHNQZXJDb21wb25lbnRcclxuXHJcbiAgICAvLyBjcmVhdCBpbnRpYWwgYnVja2V0c1xyXG4gICAgY29uc3QgYnVja2V0cyA9IHV0aWwuZ2VuZXJhdGUobnVtQnVja2V0cywgKCkgPT4gKHsgY29sb3I6IFswLCAwLCAwXSBhcyBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0sIHBpeGVsczogMCB9KSlcclxuXHJcbiAgICAvLyBhc3NpZ24gYW5kIHVwZGF0ZSBidWNrZXQgZm9yIGVhY2ggcGl4ZWxcclxuICAgIGNvbnN0IGJ1Y2tldE92ZXJsYXkgPSB1dGlsLmdlbmVyYXRlKHBpeGVscywgaSA9PiB7XHJcbiAgICAgICAgY29uc3QgciA9IGRhdGFbaSAqIDRdIC8gMjU1XHJcbiAgICAgICAgY29uc3QgZyA9IGRhdGFbaSAqIDQgKyAxXSAvIDI1NVxyXG4gICAgICAgIGNvbnN0IGIgPSBkYXRhW2kgKiA0ICsgMl0gLyAyNTVcclxuICAgICAgICBjb25zdCByYiA9IE1hdGgubWluKE1hdGguZmxvb3IociAqIGJ1Y2tldHNQZXJDb21wb25lbnQpLCBidWNrZXRzUGVyQ29tcG9uZW50IC0gMSlcclxuICAgICAgICBjb25zdCBnYiA9IE1hdGgubWluKE1hdGguZmxvb3IoZyAqIGJ1Y2tldHNQZXJDb21wb25lbnQpLCBidWNrZXRzUGVyQ29tcG9uZW50IC0gMSlcclxuICAgICAgICBjb25zdCBiYiA9IE1hdGgubWluKE1hdGguZmxvb3IoYiAqIGJ1Y2tldHNQZXJDb21wb25lbnQpLCBidWNrZXRzUGVyQ29tcG9uZW50IC0gMSlcclxuICAgICAgICBjb25zdCBidWNrZXRJZHggPSByYiAqIGJ1Y2tldFBpdGNoICsgZ2IgKiBidWNrZXRzUGVyQ29tcG9uZW50ICsgYmJcclxuICAgICAgICBjb25zdCBidWNrZXQgPSBidWNrZXRzW2J1Y2tldElkeF1cclxuICAgICAgICBidWNrZXQuY29sb3IgPSBhZGRYWVooW3IsIGcsIGJdLCBidWNrZXQuY29sb3IpXHJcbiAgICAgICAgYnVja2V0LnBpeGVscysrXHJcbiAgICAgICAgcmV0dXJuIGJ1Y2tldFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBjYWxjdWxhdGUgYnVja2V0IGNvbG9yc1xyXG4gICAgZm9yIChjb25zdCBidWNrZXQgb2YgYnVja2V0cykge1xyXG4gICAgICAgIGJ1Y2tldC5jb2xvciA9IGRpdlhZWihidWNrZXQuY29sb3IsIGJ1Y2tldC5waXhlbHMpXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdG9wQnVja2V0cyA9IGJ1Y2tldHNcclxuICAgICAgICAuc29ydCgoYjEsIGIyKSA9PiBiMi5waXhlbHMgLSBiMS5waXhlbHMpXHJcbiAgICAgICAgLnNsaWNlKDAsIG1heENvbG9ycylcclxuXHJcbiAgICBjb25zdCBidWNrZXRTZXQgPSBuZXcgU2V0KHRvcEJ1Y2tldHMpXHJcblxyXG4gICAgLy8gbWFwIGFsbCBjb2xvcnMgdG8gdG9wIE4gYnVja2V0c1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBidWNrZXRPdmVybGF5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgaWYgKGJ1Y2tldFNldC5oYXMoYnVja2V0T3ZlcmxheVtpXSkpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIG90aGVyd2lzZSwgbWFwIHRvIG5ldyBidWNrZXRcclxuICAgICAgICBjb25zdCByID0gZGF0YVtpICogNF0gLyAyNTVcclxuICAgICAgICBjb25zdCBnID0gZGF0YVtpICogNF0gLyAyNTVcclxuICAgICAgICBjb25zdCBiID0gZGF0YVtpICogNF0gLyAyNTVcclxuICAgICAgICBjb25zdCBjb2xvcjogW251bWJlciwgbnVtYmVyLCBudW1iZXJdID0gW3IsIGcsIGJdXHJcbiAgICAgICAgY29uc3QgYnVja2V0ID0gdG9wQnVja2V0cy5yZWR1Y2UoKGIxLCBiMikgPT4gY2FsY0Rpc3RTcShiMS5jb2xvciwgY29sb3IpIDwgY2FsY0Rpc3RTcShiMi5jb2xvciwgY29sb3IpID8gYjEgOiBiMilcclxuICAgICAgICBidWNrZXRPdmVybGF5W2ldID0gYnVja2V0XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZGV0ZXJtaW5lIHBhbGV0dGUgY29sb3JzXHJcbiAgICBjb25zdCBwYWxldHRlID0gdG9wQnVja2V0cy5tYXAoYiA9PiBtdWxYWVooYi5jb2xvciwgMjU1KSlcclxuICAgIGNvbnN0IHBhbGV0dGVPdmVybGF5ID0gYnVja2V0T3ZlcmxheS5tYXAoYiA9PiBidWNrZXRzLmluZGV4T2YoYikpXHJcblxyXG4gICAgcmV0dXJuIFtwYWxldHRlLCBwYWxldHRlT3ZlcmxheV1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UGFsZXR0ZShwYWxldHRlOiBDb2xvcltdLCBwYWxsZXRlT3ZlcmxheTogbnVtYmVyW10sIGltYWdlRGF0YTogSW1hZ2VEYXRhKSB7XHJcbiAgICBjb25zdCBkYXRhID0gaW1hZ2VEYXRhLmRhdGFcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFsbGV0ZU92ZXJsYXkubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAvLyBpZ25vcmUgaW5kZXggb2YgLTFcclxuICAgICAgICBjb25zdCBpZHggPSBwYWxsZXRlT3ZlcmxheVtpXVxyXG4gICAgICAgIGlmIChpZHggPT0gLTEpIHtcclxuICAgICAgICAgICAgY29udGludWVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbG9yID0gcGFsZXR0ZVtpZHhdXHJcbiAgICAgICAgZGF0YVtpICogNF0gPSBjb2xvclswXVxyXG4gICAgICAgIGRhdGFbaSAqIDQgKyAxXSA9IGNvbG9yWzFdXHJcbiAgICAgICAgZGF0YVtpICogNCArIDJdID0gY29sb3JbMl1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlQnVja2V0KGRhdGE6IFVpbnQ4Q2xhbXBlZEFycmF5LCBpbmRpY2VzOiBudW1iZXJbXSk6IEJ1Y2tldCB7XHJcbiAgICBpZiAoaW5kaWNlcy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImJ1Y2tldCBtdXN0IGNvbnRhaW4gYXQgbGVhc3QgMSB2YWx1ZVwiKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGJ1Y2tldDogQnVja2V0ID0ge1xyXG4gICAgICAgIGluZGljZXM6IGluZGljZXMsXHJcbiAgICAgICAgc3BsaXRBeGlzOiBBeGlzLk5vbmUsXHJcbiAgICAgICAgcmFuZ2U6IDBcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVCdWNrZXQoZGF0YSwgYnVja2V0KVxyXG4gICAgcmV0dXJuIGJ1Y2tldFxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVCdWNrZXQoZGF0YTogVWludDhDbGFtcGVkQXJyYXksIGJ1Y2tldDogQnVja2V0KSB7XHJcbiAgICBidWNrZXQucmFuZ2UgPSAwXHJcbiAgICBidWNrZXQuc3BsaXRBeGlzID0gQXhpcy5Ob25lXHJcblxyXG4gICAgbGV0IG1pblggPSBJbmZpbml0eVxyXG4gICAgbGV0IG1heFggPSAtMVxyXG4gICAgbGV0IG1pblkgPSBJbmZpbml0eVxyXG4gICAgbGV0IG1heFkgPSAtMVxyXG4gICAgbGV0IG1pblogPSBJbmZpbml0eVxyXG4gICAgbGV0IG1heFogPSAtMVxyXG5cclxuICAgIGZvciAoY29uc3QgaSBvZiBidWNrZXQuaW5kaWNlcykge1xyXG4gICAgICAgIGNvbnN0IHggPSBkYXRhW2kgKiA0XVxyXG4gICAgICAgIGNvbnN0IHkgPSBkYXRhW2kgKiA0ICsgMV1cclxuICAgICAgICBjb25zdCB6ID0gZGF0YVtpICogNCArIDJdXHJcbiAgICAgICAgbWluWCA9IE1hdGgubWluKHgsIG1pblgpXHJcbiAgICAgICAgbWF4WCA9IE1hdGgubWF4KHgsIG1heFgpXHJcbiAgICAgICAgbWluWSA9IE1hdGgubWluKHksIG1pblkpXHJcbiAgICAgICAgbWF4WSA9IE1hdGgubWF4KHksIG1heFkpXHJcbiAgICAgICAgbWluWiA9IE1hdGgubWluKHosIG1pblopXHJcbiAgICAgICAgbWF4WiA9IE1hdGgubWF4KHosIG1heFopXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZHggPSBtYXhYIC0gbWluWFxyXG4gICAgY29uc3QgZHkgPSBtYXhZIC0gbWluWVxyXG4gICAgY29uc3QgZHogPSBtYXhaIC0gbWluWlxyXG4gICAgYnVja2V0LnJhbmdlID0gTWF0aC5tYXgoZHgsIGR5LCBkeilcclxuXHJcbiAgICBpZiAoYnVja2V0LnJhbmdlID09PSBkeCkge1xyXG4gICAgICAgIGJ1Y2tldC5zcGxpdEF4aXMgPSBBeGlzLlhcclxuICAgIH0gZWxzZSBpZiAoYnVja2V0LnJhbmdlID09PSBkeSkge1xyXG4gICAgICAgIGJ1Y2tldC5zcGxpdEF4aXMgPSBBeGlzLllcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYnVja2V0LnNwbGl0QXhpcyA9IEF4aXMuWlxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzcGxpdEJ1Y2tldChkYXRhOiBVaW50OENsYW1wZWRBcnJheSwgYnVja2V0OiBCdWNrZXQpOiBCdWNrZXQge1xyXG4gICAgaWYgKGJ1Y2tldC5pbmRpY2VzLmxlbmd0aCA8PSAxKSB7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJCdWNrZXQgbXVzdCA+IDEgZWxlbWVudCB0byBzcGxpdFwiKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRldGVybWluZSBjb21wb25lbnQgd2l0aCBtYXggcmFuZ2UgaW4gYnVja2V0XHJcbiAgICBzd2l0Y2ggKGJ1Y2tldC5zcGxpdEF4aXMpIHtcclxuICAgICAgICBjYXNlIEF4aXMuWDpcclxuICAgICAgICAgICAgYnVja2V0LmluZGljZXMuc29ydCgoYSwgYikgPT4gZGF0YVthICogNF0gLSBkYXRhW2IgKiA0XSlcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICBjYXNlIEF4aXMuWTpcclxuICAgICAgICAgICAgYnVja2V0LmluZGljZXMuc29ydCgoYSwgYikgPT4gZGF0YVthICogNCArIDFdIC0gZGF0YVtiICogNCArIDFdKVxyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIGNhc2UgQXhpcy5aOlxyXG4gICAgICAgICAgICBidWNrZXQuaW5kaWNlcy5zb3J0KChhLCBiKSA9PiBkYXRhW2EgKiA0ICsgMl0gLSBkYXRhW2IgKiA0ICsgMl0pXHJcbiAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgc3BsaXQgYXhpc1wiKVxyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGxlZnQgaGFsZiBvZiBhcnJheSBzdGF5cyBpbiBidWNrZXRcclxuICAgIC8vIHJpZ2h0IGhhbGYgbW92ZXMgdG8gbmV3IGJ1Y2tldFxyXG4gICAgY29uc3QgbWVkaWFuSWR4ID0gTWF0aC5mbG9vcihidWNrZXQuaW5kaWNlcy5sZW5ndGggLyAyKVxyXG4gICAgY29uc3QgbmV3SW5kaWNlcyA9IGJ1Y2tldC5pbmRpY2VzLnNwbGljZShtZWRpYW5JZHgsIGJ1Y2tldC5pbmRpY2VzLmxlbmd0aCAtIG1lZGlhbklkeClcclxuICAgIGNvbnN0IG5ld0J1Y2tldCA9IGNyZWF0ZUJ1Y2tldChkYXRhLCBuZXdJbmRpY2VzKVxyXG4gICAgdXBkYXRlQnVja2V0KGRhdGEsIGJ1Y2tldClcclxuICAgIHJldHVybiBuZXdCdWNrZXRcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG11bFhZWih4eXo6IENvbG9yLCBzOiBudW1iZXIpOiBDb2xvciB7XHJcbiAgICBjb25zdCBbeCwgeSwgel0gPSB4eXpcclxuICAgIHJldHVybiBbeCAqIHMsIHkgKiBzLCB6ICogc11cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGRpdlhZWih4eXo6IENvbG9yLCBzOiBudW1iZXIpOiBDb2xvciB7XHJcbiAgICBjb25zdCBbeCwgeSwgel0gPSB4eXpcclxuICAgIHJldHVybiBbeCAvIHMsIHkgLyBzLCB6IC8gc11cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFkZFhZWih4eXoxOiBDb2xvciwgeHl6MjogQ29sb3IpOiBDb2xvciB7XHJcbiAgICByZXR1cm4gW3h5ejFbMF0gKyB4eXoyWzBdLCB4eXoxWzFdICsgeHl6MlsxXSwgeHl6MVsyXSArIHh5ejJbMl1dXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBlcXVhbFhZWih4eXoxOiBDb2xvciwgeHl6MjogQ29sb3IpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB4eXoxWzBdID09PSB4eXoyWzBdICYmIHh5ejFbMV0gPT09IHh5ejJbMV0gJiYgeHl6MVsyXSA9PT0geHl6MlsyXVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2FsY0Rpc3RTcSh4eXoxOiBDb2xvciwgeHl6MjogQ29sb3IpOiBudW1iZXIge1xyXG4gICAgY29uc3QgW3gxLCB5MSwgejFdID0geHl6MVxyXG4gICAgY29uc3QgW3gyLCB5MiwgejJdID0geHl6MlxyXG4gICAgY29uc3QgZHggPSB4MiAtIHgxXHJcbiAgICBjb25zdCBkeSA9IHkyIC0geTFcclxuICAgIGNvbnN0IGR6ID0gejIgLSB6MVxyXG4gICAgY29uc3QgZGlzdFNxID0gZHggKiBkeCArIGR5ICogZHkgKyBkeiAqIGR6XHJcbiAgICByZXR1cm4gZGlzdFNxXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYWxjRGlzdCh4eXoxOiBDb2xvciwgeHl6MjogQ29sb3IpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIE1hdGguc3FydChjYWxjRGlzdFNxKHh5ejEsIHh5ejIpKVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2NhbkltYWdlRGF0YShpbWFnZURhdGE6IEltYWdlRGF0YSwgZjogKHg6IG51bWJlciwgeTogbnVtYmVyLCBvZmZzZXQ6IG51bWJlcikgPT4gdm9pZCk6IHZvaWQge1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBpbWFnZURhdGFcclxuICAgIHNjYW4od2lkdGgsIGhlaWdodCwgZilcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNjYW4od2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIGY6ICh4OiBudW1iZXIsIHk6IG51bWJlciwgb2Zmc2V0OiBudW1iZXIpID0+IHZvaWQpOiB2b2lkIHtcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCB5T2Zmc2V0ID0geSAqIHdpZHRoXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgKyt4KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHhPZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgICAgICBmKHgsIHksIHhPZmZzZXQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2NhblJlZ2lvbih4MDogbnVtYmVyLCB5MDogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcm93UGl0Y2g6IG51bWJlciwgZjogKHg6IG51bWJlciwgeTogbnVtYmVyLCBvZmZzZXQ6IG51bWJlcikgPT4gdm9pZCk6IHZvaWQge1xyXG4gICAgY29uc3QgeDEgPSB4MCArIHdpZHRoXHJcbiAgICBjb25zdCB5MSA9IHkwICsgaGVpZ2h0XHJcbiAgICBmb3IgKGxldCB5ID0geTA7IHkgPCB5MTsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiByb3dQaXRjaFxyXG4gICAgICAgIGZvciAobGV0IHggPSB4MDsgeCA8IHgxOyArK3gpIHtcclxuICAgICAgICAgICAgY29uc3QgeE9mZnNldCA9IHlPZmZzZXQgKyB4XHJcbiAgICAgICAgICAgIGYoeCwgeSwgeE9mZnNldClcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzY2FuUm93cyh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgZjogKHk6IG51bWJlciwgb2Zmc2V0OiBudW1iZXIpID0+IHZvaWQpIHtcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyArK3kpIHtcclxuICAgICAgICBjb25zdCBvZmZzZXQgPSB5ICogd2lkdGhcclxuICAgICAgICBmKHksIG9mZnNldClcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNjYW5Sb3dzUmVnaW9uKHkwOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCByb3dQaXRjaDogbnVtYmVyLCBmOiAoeTogbnVtYmVyLCBvZmZzZXQ6IG51bWJlcikgPT4gdm9pZCkge1xyXG4gICAgY29uc3QgeTEgPSB5MCArIGhlaWdodFxyXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB5MTsgKyt5KSB7XHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0geSAqIHJvd1BpdGNoXHJcbiAgICAgICAgZih5LCBvZmZzZXQpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZ2IyeHl6KHJnYjogQ29sb3IpOiBDb2xvciB7XHJcbiAgICBsZXQgW3IsIGIsIGddID0gcmdiXHJcbiAgICByIC89IDI1NS4wXHJcbiAgICBnIC89IDI1NS4wXHJcbiAgICBiIC89IDI1NS4wXHJcblxyXG4gICAgY29uc3QgeCA9IHIgKiAwLjQxMjQ1NjQgKyBnICogMC4zNTc1NzYxICsgYiAqIDAuMTgwNDM3NVxyXG4gICAgY29uc3QgeSA9IHIgKiAwLjIxMjY3MjkgKyBnICogMC43MTUxNTIyICsgYiAqIDAuMDcyMTc1MFxyXG4gICAgY29uc3QgeiA9IHIgKiAwLjAxOTMzMzkgKyBnICogMC4xMTkxOTIwICsgYiAqIDAuOTUwMzA0MVxyXG4gICAgcmV0dXJuIFt4LCB5LCB6XVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24geHl6MnJnYih4eXo6IENvbG9yKTogQ29sb3Ige1xyXG4gICAgY29uc3QgW3gsIHksIHpdID0geHl6XHJcbiAgICBjb25zdCByID0gKHggKiAzLjI0MDQ1NDIgKyB5ICogLTEuNTM3MTM4NSArIHogKiAtMC40OTg1MzE0KSAqIDI1NVxyXG4gICAgY29uc3QgZyA9ICh4ICogLTAuOTY5MjY2MCArIHkgKiAxLjg3NjAxMDggKyB6ICogMC4wNDE1NTYwKSAqIDI1NVxyXG4gICAgY29uc3QgYiA9ICh4ICogMC4wNTU2NDM0ICsgeSAqIC0wLjIwNDAyNTkgKyB6ICogMS4wNTcyMjUyKSAqIDI1NVxyXG4gICAgcmV0dXJuIFtyLCBnLCBiXVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbGluZWFyKHg6IG51bWJlcikge1xyXG4gICAgaWYgKHggPD0gLjA0MDQ1KSB7XHJcbiAgICAgICAgcmV0dXJuIHggLyAxMi45MlxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBNYXRoLnBvdygoKHggKyAuMDU1KSAvIDEuMDU1KSwgMi40KVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaW1hZ2VEYXRhMlJHQkFycmF5KGRhdGE6IFVpbnQ4Q2xhbXBlZEFycmF5KTogQ29sb3JbXSB7XHJcbiAgICBjb25zdCByZXN1bHQ6IENvbG9yW10gPSBbXVxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSArPSA0KSB7XHJcbiAgICAgICAgcmVzdWx0LnB1c2goW2RhdGFbaV0sIGRhdGFbaSArIDFdLCBkYXRhW2kgKyAyXV0pXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdFxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2FsY0x1bWluYW5jZShjb2xvcjogQ29sb3IpIHtcclxuICAgIGNvbnN0IFtyLCBnLCBiXSA9IGNvbG9yXHJcbiAgICBjb25zdCBsID0gMC4yMTI2ICogKHIgLyAyNTUpICsgMC43MTUyICogKGcgLyAyNTUpICsgMC4wNzIyICogKGIgLyAyNTUpXHJcbiAgICByZXR1cm4gbFxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29weUltYWdlRGF0YShpbWFnZURhdGE6IEltYWdlRGF0YSk6IEltYWdlRGF0YSB7XHJcbiAgICByZXR1cm4gbmV3IEltYWdlRGF0YShuZXcgVWludDhDbGFtcGVkQXJyYXkoaW1hZ2VEYXRhLmRhdGEpLCBpbWFnZURhdGEud2lkdGgsIGltYWdlRGF0YS5oZWlnaHQpXHJcbn0iXX0=