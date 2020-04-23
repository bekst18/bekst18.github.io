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
        const color = palette[palleteOverlay[i]];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1hZ2luZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImltYWdpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUV6QyxJQUFLLElBQXNCO0FBQTNCLFdBQUssSUFBSTtJQUFHLCtCQUFJLENBQUE7SUFBRSx5QkFBQyxDQUFBO0lBQUUseUJBQUMsQ0FBQTtJQUFFLHlCQUFDLENBQUE7QUFBQyxDQUFDLEVBQXRCLElBQUksS0FBSixJQUFJLFFBQWtCO0FBVTNCLE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxTQUFvQixFQUFFLFNBQWlCO0lBQ3RFLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQTtJQUM1QixNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFBO0lBRTNCLHFDQUFxQztJQUNyQyxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUNwRixPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBRXBCLE9BQU8sT0FBTyxDQUFDLE1BQU0sR0FBRyxTQUFTLEVBQUU7UUFDL0IsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsRSxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzNDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7S0FDMUI7SUFFRCwrQkFBK0I7SUFDL0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdB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QUU7UUFDckIsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO0tBQzVCO1NBQU0sSUFBSSxNQUFNLENBQUMsS0FBSyxLQUFLLEVBQUUsRUFBRTtRQUM1QixNQUFNLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUE7S0FDNUI7U0FBTTtRQUNILE1BQU0sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQTtLQUM1QjtBQUNMLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxJQUF1QixFQUFFLE1BQWM7SUFDeEQsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7UUFDNUIsTUFBTSxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQTtLQUNsRDtJQUVELCtDQUErQztJQUMvQyxRQUFRLE1BQU0sQ0FBQyxTQUFTLEVBQUU7UUFDdEIsS0FBSyxJQUFJLENBQUMsQ0FBQztZQUNQLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDeEQsTUFBSztRQUNULEtBQUssSUFBSSxDQUFDLENBQUM7WUFDUCxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDaEUsTUFBSztRQUNULEtBQUssSUFBSSxDQUFDLENBQUM7WUFDUCxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMs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LEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUNuRDtJQUVELE9BQU8sTUFBTSxDQUFBO0FBQ2pCLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEtBQVk7SUFDdEMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFBO0lBQ3ZCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFBO0lBQ3RFLE9BQU8sQ0FBQyxDQUFBO0FBQ1osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHV0aWwgZnJvbSBcIi4uL3NoYXJlZC91dGlsLmpzXCJcclxuXHJcbmVudW0gQXhpcyB7IE5vbmUsIFgsIFksIFogfVxyXG5cclxuaW50ZXJmYWNlIEJ1Y2tldCB7XHJcbiAgICBpbmRpY2VzOiBudW1iZXJbXVxyXG4gICAgcmFuZ2U6IG51bWJlclxyXG4gICAgc3BsaXRBeGlzOiBBeGlzXHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIENvbG9yID0gW251bWJlciwgbnVtYmVyLCBudW1iZXJdXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcGFsZXR0aXplTWVkaWFuQ3V0KGltYWdlRGF0YTogSW1hZ2VEYXRhLCBtYXhDb2xvcnM6IG51bWJlcik6IFtDb2xvcltdLCBudW1iZXJbXV0ge1xyXG4gICAgY29uc3QgYnVja2V0czogQnVja2V0W10gPSBbXVxyXG4gICAgY29uc3QgZGF0YSA9IGltYWdlRGF0YS5kYXRhXHJcblxyXG4gICAgLy8gcGxhY2UgYWxsIGNvbG9ycyBpbiBpbml0aWFsIGJ1Y2tldFxyXG4gICAgY29uc3QgYnVja2V0ID0gY3JlYXRlQnVja2V0KGRhdGEsIHV0aWwuc2VxdWVuY2UoaW1hZ2VEYXRhLndpZHRoICogaW1hZ2VEYXRhLmhlaWdodCkpXHJcbiAgICBidWNrZXRzLnB1c2goYnVja2V0KVxyXG5cclxuICAgIHdoaWxlIChidWNrZXRzLmxlbmd0aCA8IG1heENvbG9ycykge1xyXG4gICAgICAgIGNvbnN0IGJ1Y2tldCA9IGJ1Y2tldHMucmVkdWNlKCh4LCB5KSA9PiB4LnJhbmdlID4geS5yYW5nZSA/IHggOiB5KVxyXG4gICAgICAgIGNvbnN0IG5ld0J1Y2tldCA9IHNwbGl0QnVja2V0KGRhdGEsIGJ1Y2tldClcclxuICAgICAgICBidWNrZXRzLnB1c2gobmV3QnVja2V0KVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGNob29zZSBjb2xvciBmb3IgZWFjaCBidWNrZXRcclxuICAgIGNvbnN0IHBhbGV0dGUgPSBidWNrZXRzLm1hcChiID0+IGRpdlhZWihiLmluZGljZXMucmVkdWNlKCh4eXosIGkpID0+IGFkZFhZWih4eXosIFtkYXRhW2kgKiA0XSwgZGF0YVtpICogNCArIDFdLCBkYXRhW2kgKiA0ICsgMl1dKSwgWzAsIDAsIDBdKSwgYi5pbmRpY2VzLmxlbmd0aCkpXHJcbiAgICBjb25zdCBwYWxldHRlT3ZlcmxheSA9IHV0aWwuZmlsbCgwLCBpbWFnZURhdGEud2lkdGggKiBpbWFnZURhdGEuaGVpZ2h0KVxyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVja2V0cy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGJ1Y2tldCA9IGJ1Y2tldHNbaV1cclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGJ1Y2tldC5pbmRpY2VzLmxlbmd0aDsgKytqKSB7XHJcbiAgICAgICAgICAgIHBhbGV0dGVPdmVybGF5W2J1Y2tldC5pbmRpY2VzW2pdXSA9IGlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFtwYWxldHRlLCBwYWxldHRlT3ZlcmxheV1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBhbGV0dGl6ZUhpc3RvZ3JhbShpbWFnZURhdGE6IEltYWdlRGF0YSwgYnVja2V0c1BlckNvbXBvbmVudDogbnVtYmVyLCBtYXhDb2xvcnM6IG51bWJlcik6IFtDb2xvcltdLCBudW1iZXJbXV0ge1xyXG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBkYXRhIH0gPSBpbWFnZURhdGFcclxuICAgIGNvbnN0IHBpeGVscyA9IHdpZHRoICogaGVpZ2h0XHJcbiAgICBjb25zdCBidWNrZXRQaXRjaCA9IGJ1Y2tldHNQZXJDb21wb25lbnQgKiBidWNrZXRzUGVyQ29tcG9uZW50XHJcbiAgICBjb25zdCBudW1CdWNrZXRzID0gYnVja2V0UGl0Y2ggKiBidWNrZXRzUGVyQ29tcG9uZW50XHJcblxyXG4gICAgLy8gY3JlYXQgaW50aWFsIGJ1Y2tldHNcclxuICAgIGNvbnN0IGJ1Y2tldHMgPSB1dGlsLmdlbmVyYXRlKG51bUJ1Y2tldHMsICgpID0+ICh7IGNvbG9yOiBbMCwgMCwgMF0gYXMgW251bWJlciwgbnVtYmVyLCBudW1iZXJdLCBwaXhlbHM6IDAgfSkpXHJcblxyXG4gICAgLy8gYXNzaWduIGFuZCB1cGRhdGUgYnVja2V0IGZvciBlYWNoIHBpeGVsXHJcbiAgICBjb25zdCBidWNrZXRPdmVybGF5ID0gdXRpbC5nZW5lcmF0ZShwaXhlbHMsIGkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHIgPSBkYXRhW2kgKiA0XSAvIDI1NVxyXG4gICAgICAgIGNvbnN0IGcgPSBkYXRhW2kgKiA0ICsgMV0gLyAyNTVcclxuICAgICAgICBjb25zdCBiID0gZGF0YVtpICogNCArIDJdIC8gMjU1XHJcbiAgICAgICAgY29uc3QgcmIgPSBNYXRoLm1pbihNYXRoLmZsb29yKHIgKiBidWNrZXRzUGVyQ29tcG9uZW50KSwgYnVja2V0c1BlckNvbXBvbmVudCAtIDEpXHJcbiAgICAgICAgY29uc3QgZ2IgPSBNYXRoLm1pbihNYXRoLmZsb29yKGcgKiBidWNrZXRzUGVyQ29tcG9uZW50KSwgYnVja2V0c1BlckNvbXBvbmVudCAtIDEpXHJcbiAgICAgICAgY29uc3QgYmIgPSBNYXRoLm1pbihNYXRoLmZsb29yKGIgKiBidWNrZXRzUGVyQ29tcG9uZW50KSwgYnVja2V0c1BlckNvbXBvbmVudCAtIDEpXHJcbiAgICAgICAgY29uc3QgYnVja2V0SWR4ID0gcmIgKiBidWNrZXRQaXRjaCArIGdiICogYnVja2V0c1BlckNvbXBvbmVudCArIGJiXHJcbiAgICAgICAgY29uc3QgYnVja2V0ID0gYnVja2V0c1tidWNrZXRJZHhdXHJcbiAgICAgICAgYnVja2V0LmNvbG9yID0gYWRkWFlaKFtyLCBnLCBiXSwgYnVja2V0LmNvbG9yKVxyXG4gICAgICAgIGJ1Y2tldC5waXhlbHMrK1xyXG4gICAgICAgIHJldHVybiBidWNrZXRcclxuICAgIH0pXHJcblxyXG4gICAgLy8gY2FsY3VsYXRlIGJ1Y2tldCBjb2xvcnNcclxuICAgIGZvciAoY29uc3QgYnVja2V0IG9mIGJ1Y2tldHMpIHtcclxuICAgICAgICBidWNrZXQuY29sb3IgPSBkaXZYWVooYnVja2V0LmNvbG9yLCBidWNrZXQucGl4ZWxzKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHRvcEJ1Y2tldHMgPSBidWNrZXRzXHJcbiAgICAgICAgLnNvcnQoKGIxLCBiMikgPT4gYjIucGl4ZWxzIC0gYjEucGl4ZWxzKVxyXG4gICAgICAgIC5zbGljZSgwLCBtYXhDb2xvcnMpXHJcblxyXG4gICAgY29uc3QgYnVja2V0U2V0ID0gbmV3IFNldCh0b3BCdWNrZXRzKVxyXG5cclxuICAgIC8vIG1hcCBhbGwgY29sb3JzIHRvIHRvcCBOIGJ1Y2tldHNcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVja2V0T3ZlcmxheS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGlmIChidWNrZXRTZXQuaGFzKGJ1Y2tldE92ZXJsYXlbaV0pKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBvdGhlcndpc2UsIG1hcCB0byBuZXcgYnVja2V0XHJcbiAgICAgICAgY29uc3QgciA9IGRhdGFbaSAqIDRdIC8gMjU1XHJcbiAgICAgICAgY29uc3QgZyA9IGRhdGFbaSAqIDRdIC8gMjU1XHJcbiAgICAgICAgY29uc3QgYiA9IGRhdGFbaSAqIDRdIC8gMjU1XHJcbiAgICAgICAgY29uc3QgY29sb3I6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSA9IFtyLCBnLCBiXVxyXG4gICAgICAgIGNvbnN0IGJ1Y2tldCA9IHRvcEJ1Y2tldHMucmVkdWNlKChiMSwgYjIpID0+IGNhbGNEaXN0U3EoYjEuY29sb3IsIGNvbG9yKSA8IGNhbGNEaXN0U3EoYjIuY29sb3IsIGNvbG9yKSA/IGIxIDogYjIpXHJcbiAgICAgICAgYnVja2V0T3ZlcmxheVtpXSA9IGJ1Y2tldFxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRldGVybWluZSBwYWxldHRlIGNvbG9yc1xyXG4gICAgY29uc3QgcGFsZXR0ZSA9IHRvcEJ1Y2tldHMubWFwKGIgPT4gbXVsWFlaKGIuY29sb3IsIDI1NSkpXHJcbiAgICBjb25zdCBwYWxldHRlT3ZlcmxheSA9IGJ1Y2tldE92ZXJsYXkubWFwKGIgPT4gYnVja2V0cy5pbmRleE9mKGIpKVxyXG5cclxuICAgIHJldHVybiBbcGFsZXR0ZSwgcGFsZXR0ZU92ZXJsYXldXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhcHBseVBhbGV0dGUocGFsZXR0ZTogQ29sb3JbXSwgcGFsbGV0ZU92ZXJsYXk6IG51bWJlcltdLCBpbWFnZURhdGE6IEltYWdlRGF0YSkge1xyXG4gICAgY29uc3QgZGF0YSA9IGltYWdlRGF0YS5kYXRhXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhbGxldGVPdmVybGF5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgY29sb3IgPSBwYWxldHRlW3BhbGxldGVPdmVybGF5W2ldXVxyXG4gICAgICAgIGRhdGFbaSAqIDRdID0gY29sb3JbMF1cclxuICAgICAgICBkYXRhW2kgKiA0ICsgMV0gPSBjb2xvclsxXVxyXG4gICAgICAgIGRhdGFbaSAqIDQgKyAyXSA9IGNvbG9yWzJdXHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjcmVhdGVCdWNrZXQoZGF0YTogVWludDhDbGFtcGVkQXJyYXksIGluZGljZXM6IG51bWJlcltdKTogQnVja2V0IHtcclxuICAgIGlmIChpbmRpY2VzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiYnVja2V0IG11c3QgY29udGFpbiBhdCBsZWFzdCAxIHZhbHVlXCIpXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYnVja2V0OiBCdWNrZXQgPSB7XHJcbiAgICAgICAgaW5kaWNlczogaW5kaWNlcyxcclxuICAgICAgICBzcGxpdEF4aXM6IEF4aXMuTm9uZSxcclxuICAgICAgICByYW5nZTogMFxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZUJ1Y2tldChkYXRhLCBidWNrZXQpXHJcbiAgICByZXR1cm4gYnVja2V0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZUJ1Y2tldChkYXRhOiBVaW50OENsYW1wZWRBcnJheSwgYnVja2V0OiBCdWNrZXQpIHtcclxuICAgIGJ1Y2tldC5yYW5nZSA9IDBcclxuICAgIGJ1Y2tldC5zcGxpdEF4aXMgPSBBeGlzLk5vbmVcclxuXHJcbiAgICBsZXQgbWluWCA9IEluZmluaXR5XHJcbiAgICBsZXQgbWF4WCA9IC0xXHJcbiAgICBsZXQgbWluWSA9IEluZmluaXR5XHJcbiAgICBsZXQgbWF4WSA9IC0xXHJcbiAgICBsZXQgbWluWiA9IEluZmluaXR5XHJcbiAgICBsZXQgbWF4WiA9IC0xXHJcblxyXG4gICAgZm9yIChjb25zdCBpIG9mIGJ1Y2tldC5pbmRpY2VzKSB7XHJcbiAgICAgICAgY29uc3QgeCA9IGRhdGFbaSAqIDRdXHJcbiAgICAgICAgY29uc3QgeSA9IGRhdGFbaSAqIDQgKyAxXVxyXG4gICAgICAgIGNvbnN0IHogPSBkYXRhW2kgKiA0ICsgMl1cclxuICAgICAgICBtaW5YID0gTWF0aC5taW4oeCwgbWluWClcclxuICAgICAgICBtYXhYID0gTWF0aC5tYXgoeCwgbWF4WClcclxuICAgICAgICBtaW5ZID0gTWF0aC5taW4oeSwgbWluWSlcclxuICAgICAgICBtYXhZID0gTWF0aC5tYXgoeSwgbWF4WSlcclxuICAgICAgICBtaW5aID0gTWF0aC5taW4oeiwgbWluWilcclxuICAgICAgICBtYXhaID0gTWF0aC5tYXgoeiwgbWF4WilcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBkeCA9IG1heFggLSBtaW5YXHJcbiAgICBjb25zdCBkeSA9IG1heFkgLSBtaW5ZXHJcbiAgICBjb25zdCBkeiA9IG1heFogLSBtaW5aXHJcbiAgICBidWNrZXQucmFuZ2UgPSBNYXRoLm1heChkeCwgZHksIGR6KVxyXG5cclxuICAgIGlmIChidWNrZXQucmFuZ2UgPT09IGR4KSB7XHJcbiAgICAgICAgYnVja2V0LnNwbGl0QXhpcyA9IEF4aXMuWFxyXG4gICAgfSBlbHNlIGlmIChidWNrZXQucmFuZ2UgPT09IGR5KSB7XHJcbiAgICAgICAgYnVja2V0LnNwbGl0QXhpcyA9IEF4aXMuWVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBidWNrZXQuc3BsaXRBeGlzID0gQXhpcy5aXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNwbGl0QnVja2V0KGRhdGE6IFVpbnQ4Q2xhbXBlZEFycmF5LCBidWNrZXQ6IEJ1Y2tldCk6IEJ1Y2tldCB7XHJcbiAgICBpZiAoYnVja2V0LmluZGljZXMubGVuZ3RoIDw9IDEpIHtcclxuICAgICAgICB0aHJvdyBFcnJvcihcIkJ1Y2tldCBtdXN0ID4gMSBlbGVtZW50IHRvIHNwbGl0XCIpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gZGV0ZXJtaW5lIGNvbXBvbmVudCB3aXRoIG1heCByYW5nZSBpbiBidWNrZXRcclxuICAgIHN3aXRjaCAoYnVja2V0LnNwbGl0QXhpcykge1xyXG4gICAgICAgIGNhc2UgQXhpcy5YOlxyXG4gICAgICAgICAgICBidWNrZXQuaW5kaWNlcy5zb3J0KChhLCBiKSA9PiBkYXRhW2EgKiA0XSAtIGRhdGFbYiAqIDRdKVxyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIGNhc2UgQXhpcy5ZOlxyXG4gICAgICAgICAgICBidWNrZXQuaW5kaWNlcy5zb3J0KChhLCBiKSA9PiBkYXRhW2EgKiA0ICsgMV0gLSBkYXRhW2IgKiA0ICsgMV0pXHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgY2FzZSBBeGlzLlo6XHJcbiAgICAgICAgICAgIGJ1Y2tldC5pbmRpY2VzLnNvcnQoKGEsIGIpID0+IGRhdGFbYSAqIDQgKyAyXSAtIGRhdGFbYiAqIDQgKyAyXSlcclxuICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBzcGxpdCBheGlzXCIpXHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICB9XHJcblxyXG4gICAgLy8gbGVmdCBoYWxmIG9mIGFycmF5IHN0YXlzIGluIGJ1Y2tldFxyXG4gICAgLy8gcmlnaHQgaGFsZiBtb3ZlcyB0byBuZXcgYnVja2V0XHJcbiAgICBjb25zdCBtZWRpYW5JZHggPSBNYXRoLmZsb29yKGJ1Y2tldC5pbmRpY2VzLmxlbmd0aCAvIDIpXHJcbiAgICBjb25zdCBuZXdJbmRpY2VzID0gYnVja2V0LmluZGljZXMuc3BsaWNlKG1lZGlhbklkeCwgYnVja2V0LmluZGljZXMubGVuZ3RoIC0gbWVkaWFuSWR4KVxyXG4gICAgY29uc3QgbmV3QnVja2V0ID0gY3JlYXRlQnVja2V0KGRhdGEsIG5ld0luZGljZXMpXHJcbiAgICB1cGRhdGVCdWNrZXQoZGF0YSwgYnVja2V0KVxyXG4gICAgcmV0dXJuIG5ld0J1Y2tldFxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbXVsWFlaKHh5ejogQ29sb3IsIHM6IG51bWJlcik6IENvbG9yIHtcclxuICAgIGNvbnN0IFt4LCB5LCB6XSA9IHh5elxyXG4gICAgcmV0dXJuIFt4ICogcywgeSAqIHMsIHogKiBzXVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZGl2WFlaKHh5ejogQ29sb3IsIHM6IG51bWJlcik6IENvbG9yIHtcclxuICAgIGNvbnN0IFt4LCB5LCB6XSA9IHh5elxyXG4gICAgcmV0dXJuIFt4IC8gcywgeSAvIHMsIHogLyBzXVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYWRkWFlaKHh5ejE6IENvbG9yLCB4eXoyOiBDb2xvcik6IENvbG9yIHtcclxuICAgIHJldHVybiBbeHl6MVswXSArIHh5ejJbMF0sIHh5ejFbMV0gKyB4eXoyWzFdLCB4eXoxWzJdICsgeHl6MlsyXV1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsWFlaKHh5ejE6IENvbG9yLCB4eXoyOiBDb2xvcik6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHh5ejFbMF0gPT09IHh5ejJbMF0gJiYgeHl6MVsxXSA9PT0geHl6MlsxXSAmJiB4eXoxWzJdID09PSB4eXoyWzJdXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYWxjRGlzdFNxKHh5ejE6IENvbG9yLCB4eXoyOiBDb2xvcik6IG51bWJlciB7XHJcbiAgICBjb25zdCBbeDEsIHkxLCB6MV0gPSB4eXoxXHJcbiAgICBjb25zdCBbeDIsIHkyLCB6Ml0gPSB4eXoyXHJcbiAgICBjb25zdCBkeCA9IHgyIC0geDFcclxuICAgIGNvbnN0IGR5ID0geTIgLSB5MVxyXG4gICAgY29uc3QgZHogPSB6MiAtIHoxXHJcbiAgICBjb25zdCBkaXN0U3EgPSBkeCAqIGR4ICsgZHkgKiBkeSArIGR6ICogZHpcclxuICAgIHJldHVybiBkaXN0U3FcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNjYW5JbWFnZURhdGEoaW1hZ2VEYXRhOiBJbWFnZURhdGEsIGY6ICh4OiBudW1iZXIsIHk6IG51bWJlciwgb2Zmc2V0OiBudW1iZXIpID0+IHZvaWQpOiB2b2lkIHtcclxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gaW1hZ2VEYXRhXHJcbiAgICBzY2FuKHdpZHRoLCBoZWlnaHQsIGYpXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzY2FuKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBmOiAoeDogbnVtYmVyLCB5OiBudW1iZXIsIG9mZnNldDogbnVtYmVyKSA9PiB2b2lkKTogdm9pZCB7XHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3QgeU9mZnNldCA9IHkgKiB3aWR0aFxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7ICsreCkge1xyXG4gICAgICAgICAgICBjb25zdCB4T2Zmc2V0ID0geU9mZnNldCArIHhcclxuICAgICAgICAgICAgZih4LCB5LCB4T2Zmc2V0KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNjYW5SZWdpb24oeDA6IG51bWJlciwgeTA6IG51bWJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHJvd1BpdGNoOiBudW1iZXIsIGY6ICh4OiBudW1iZXIsIHk6IG51bWJlciwgb2Zmc2V0OiBudW1iZXIpID0+IHZvaWQpOiB2b2lkIHtcclxuICAgIGNvbnN0IHgxID0geDAgKyB3aWR0aFxyXG4gICAgY29uc3QgeTEgPSB5MCArIGhlaWdodFxyXG4gICAgZm9yIChsZXQgeSA9IHkwOyB5IDwgeTE7ICsreSkge1xyXG4gICAgICAgIGNvbnN0IHlPZmZzZXQgPSB5ICogcm93UGl0Y2hcclxuICAgICAgICBmb3IgKGxldCB4ID0geDA7IHggPCB4MTsgKyt4KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHhPZmZzZXQgPSB5T2Zmc2V0ICsgeFxyXG4gICAgICAgICAgICBmKHgsIHksIHhPZmZzZXQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2NhblJvd3Mod2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIGY6ICh5OiBudW1iZXIsIG9mZnNldDogbnVtYmVyKSA9PiB2b2lkKSB7XHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgKyt5KSB7XHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0geSAqIHdpZHRoXHJcbiAgICAgICAgZih5LCBvZmZzZXQpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzY2FuUm93c1JlZ2lvbih5MDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgcm93UGl0Y2g6IG51bWJlciwgZjogKHk6IG51bWJlciwgb2Zmc2V0OiBudW1iZXIpID0+IHZvaWQpIHtcclxuICAgIGNvbnN0IHkxID0geTAgKyBoZWlnaHRcclxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgeTE7ICsreSkge1xyXG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHkgKiByb3dQaXRjaFxyXG4gICAgICAgIGYoeSwgb2Zmc2V0KVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmdiMnh5eihyZ2I6IENvbG9yKTogQ29sb3Ige1xyXG4gICAgbGV0IFtyLCBiLCBnXSA9IHJnYlxyXG4gICAgciAvPSAyNTUuMFxyXG4gICAgZyAvPSAyNTUuMFxyXG4gICAgYiAvPSAyNTUuMFxyXG5cclxuICAgIGNvbnN0IHggPSByICogMC40MTI0NTY0ICsgZyAqIDAuMzU3NTc2MSArIGIgKiAwLjE4MDQzNzVcclxuICAgIGNvbnN0IHkgPSByICogMC4yMTI2NzI5ICsgZyAqIDAuNzE1MTUyMiArIGIgKiAwLjA3MjE3NTBcclxuICAgIGNvbnN0IHogPSByICogMC4wMTkzMzM5ICsgZyAqIDAuMTE5MTkyMCArIGIgKiAwLjk1MDMwNDFcclxuICAgIHJldHVybiBbeCwgeSwgel1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHh5ejJyZ2IoeHl6OiBDb2xvcik6IENvbG9yIHtcclxuICAgIGNvbnN0IFt4LCB5LCB6XSA9IHh5elxyXG4gICAgY29uc3QgciA9ICh4ICogMy4yNDA0NTQyICsgeSAqIC0xLjUzNzEzODUgKyB6ICogLTAuNDk4NTMxNCkgKiAyNTVcclxuICAgIGNvbnN0IGcgPSAoeCAqIC0wLjk2OTI2NjAgKyB5ICogMS44NzYwMTA4ICsgeiAqIDAuMDQxNTU2MCkgKiAyNTVcclxuICAgIGNvbnN0IGIgPSAoeCAqIDAuMDU1NjQzNCArIHkgKiAtMC4yMDQwMjU5ICsgeiAqIDEuMDU3MjI1MikgKiAyNTVcclxuICAgIHJldHVybiBbciwgZywgYl1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxpbmVhcih4OiBudW1iZXIpIHtcclxuICAgIGlmICh4IDw9IC4wNDA0NSkge1xyXG4gICAgICAgIHJldHVybiB4IC8gMTIuOTJcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gTWF0aC5wb3coKCh4ICsgLjA1NSkgLyAxLjA1NSksIDIuNClcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGltYWdlRGF0YTJSR0JBcnJheShkYXRhOiBVaW50OENsYW1wZWRBcnJheSk6IENvbG9yW10ge1xyXG4gICAgY29uc3QgcmVzdWx0OiBDb2xvcltdID0gW11cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkgKz0gNCkge1xyXG4gICAgICAgIHJlc3VsdC5wdXNoKFtkYXRhW2ldLCBkYXRhW2kgKyAxXSwgZGF0YVtpICsgMl1dKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHRcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNMdW1pbmFuY2UoY29sb3I6IENvbG9yKSB7XHJcbiAgICBjb25zdCBbciwgZywgYl0gPSBjb2xvclxyXG4gICAgY29uc3QgbCA9IDAuMjEyNiAqIChyIC8gMjU1KSArIDAuNzE1MiAqIChnIC8gMjU1KSArIDAuMDcyMiAqIChiIC8gMjU1KVxyXG4gICAgcmV0dXJuIGxcclxufSJdfQ==