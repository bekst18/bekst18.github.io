import * as array from "../shared/array.js";
/**
 * components of a generated map area
 */
export class Map {
    constructor(player) {
        this.player = player;
        this.tiles = new Set();
        this.fixtures = new Set();
        this.monsters = new Set();
        this.containers = new Set();
    }
    /**
      * iterate over all things in map
    */
    *[Symbol.iterator]() {
        for (const tile of this.tiles) {
            yield tile;
        }
        for (const fixture of this.fixtures) {
            yield fixture;
        }
        for (const container of this.containers) {
            yield container;
        }
        for (const monster of this.monsters) {
            yield monster;
        }
        yield this.player;
    }
    tileAt(xy) {
        return array.find(this.tiles, t => { var _a, _b; return (_b = ((_a = t.position) === null || _a === void 0 ? void 0 : _a.equal(xy))) !== null && _b !== void 0 ? _b : false; }) || null;
    }
    fixtureAt(xy) {
        return array.find(this.fixtures, f => { var _a, _b; return (_b = ((_a = f.position) === null || _a === void 0 ? void 0 : _a.equal(xy))) !== null && _b !== void 0 ? _b : false; }) || null;
    }
    containerAt(xy) {
        return array.find(this.containers, c => { var _a, _b; return (_b = ((_a = c.position) === null || _a === void 0 ? void 0 : _a.equal(xy))) !== null && _b !== void 0 ? _b : false; }) || null;
    }
    monsterAt(xy) {
        return array.find(this.monsters, c => { var _a, _b; return (_b = ((_a = c.position) === null || _a === void 0 ? void 0 : _a.equal(xy))) !== null && _b !== void 0 ? _b : false; }) || null;
    }
    *thingsAt(xy) {
        const fixture = this.fixtureAt(xy);
        if (fixture) {
            yield fixture;
        }
        const tile = this.tileAt(xy);
        if (tile) {
            yield tile;
        }
        const container = this.containerAt(xy);
        if (container) {
            yield container;
        }
        const monster = this.monsterAt(xy);
        if (monster) {
            yield monster;
        }
    }
}
// export function updateVisibility(map: Map, eye: geo.Point, radius: number) {
//     updateVisibilityFlags(map, eye, radius, TileFlags.Visible | TileFlags.Seen, TileFlags.Visible)
// }
// function updateVisibilityFlags(map: Map, eye: geo.Point, radius: number, setFlags: TileFlags, clearFlags: TileFlags) {
//     for (const tile of map) {
//         tile.flags &= ~clearFlags
//     }
//     map.getTile(eye).flags |= setFlags
//     for (let i = 0; i < 8; ++i) {
//         updateVisibilityOctant(map, eye, radius, setFlags, i)
//     }
// }
// function updateVisibilityOctant(map: Map, eye: geo.Point, radius: number, setFlags: TileFlags, octant: number) {
//     const shadows: geo.Point[] = []
//     for (let i = 1; i <= radius; ++i) {
//         for (let j = 0; j <= i; ++j) {
//             const octantPoint = new geo.Point(i, j)
//             const mapPoint = transformOctant(octantPoint, octant).add(eye)
//             if (!map.inBounds(mapPoint)) {
//                 continue
//             }
//             if (isShadowed(shadows, octantPoint)) {
//                 continue
//             }
//             const tile = map.getTile(mapPoint)
//             if (tileBlocksView(tile)) {
//                 shadows.push(octantPoint)
//             }
//             if (geo.calcDist(mapPoint, eye) > radius) {
//                 continue
//             }
//             tile.flags |= setFlags
//         }
//     }
// }
// function transformOctant(coords: geo.Point, octant: number): geo.Point {
//     switch (octant) {
//         case 0: return new geo.Point(coords.i, -coords.j);
//         case 1: return new geo.Point(coords.j, -coords.i);
//         case 2: return new geo.Point(coords.j, coords.i);
//         case 3: return new geo.Point(coords.i, coords.j);
//         case 4: return new geo.Point(-coords.i, coords.j);
//         case 5: return new geo.Point(-coords.j, coords.i);
//         case 6: return new geo.Point(-coords.j, -coords.i);
//         case 7: return new geo.Point(-coords.i, -coords.j);
//     }
//     throw new Error("Invalid octant - must be in interval [0, 8)")
// }
// function isShadowed(shadows: geo.Point[], coords: geo.Point): boolean {
//     return iter.any(shadows, x => shadowCoversPoint(x, coords))
// }
// function shadowCoversPoint(shadow: geo.Point, coords: geo.Point): boolean {
//     if (shadow.j == 0) {
//         return coords.i > shadow.i
//     }
//     const startJ = shadow.j / (shadow.i + 1) * coords.i
//     const endJ = (shadow.j + 1) / shadow.i * coords.i
//     return coords.i > shadow.i && coords.j > startJ && coords.j < endJ
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hcHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUczQzs7R0FFRztBQUNILE1BQU0sT0FBTyxHQUFHO0lBTVosWUFBcUIsTUFBaUI7UUFBakIsV0FBTSxHQUFOLE1BQU0sQ0FBVztRQUx0QyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQVcsQ0FBQTtRQUMxQixhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQWMsQ0FBQTtRQUNoQyxhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQWMsQ0FBQztRQUNqQyxlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7SUFFSyxDQUFDO0lBRTNDOztNQUVFO0lBQ0ssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDckIsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQzNCLE1BQU0sSUFBSSxDQUFBO1NBQ2I7UUFFRCxLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDakMsTUFBTSxPQUFPLENBQUE7U0FDaEI7UUFFRCxLQUFLLE1BQU0sU0FBUyxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDckMsTUFBTSxTQUFTLENBQUE7U0FDbEI7UUFFRCxLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDakMsTUFBTSxPQUFPLENBQUE7U0FDaEI7UUFFRCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDckIsQ0FBQztJQUVELE1BQU0sQ0FBQyxFQUFhO1FBQ2hCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLDRCQUFDLE9BQUMsQ0FBQyxDQUFDLFFBQVEsMENBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxtQ0FBSSxLQUFLLEdBQUEsQ0FBQyxJQUFJLElB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aGFyZWQvZ2VvMmQuanNcIlxyXG5pbXBvcnQgKiBhcyBncmlkIGZyb20gXCIuLi9zaGFyZWQvZ3JpZC5qc1wiXHJcbmltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIlxyXG5pbXBvcnQgKiBhcyBybCBmcm9tIFwiLi9ybC5qc1wiXHJcblxyXG4vKipcclxuICogY29tcG9uZW50cyBvZiBhIGdlbmVyYXRlZCBtYXAgYXJlYVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIE1hcCB7XHJcbiAgICB0aWxlcyA9IG5ldyBTZXQ8cmwuVGlsZT4oKVxyXG4gICAgZml4dHVyZXMgPSBuZXcgU2V0PHJsLkZpeHR1cmU+KClcclxuICAgIG1vbnN0ZXJzID0gbmV3IFNldDxybC5Nb25zdGVyPigpO1xyXG4gICAgY29udGFpbmVycyA9IG5ldyBTZXQ8cmwuQ29udGFpbmVyPigpO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHBsYXllcjogcmwuUGxheWVyKSB7IH1cclxuXHJcbiAgICAvKipcclxuICAgICAgKiBpdGVyYXRlIG92ZXIgYWxsIHRoaW5ncyBpbiBtYXBcclxuICAgICovXHJcbiAgICBwdWJsaWMgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEdlbmVyYXRvcjxybC5UaGluZz4ge1xyXG4gICAgICAgIGZvciAoY29uc3QgdGlsZSBvZiB0aGlzLnRpbGVzKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIHRpbGVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgZml4dHVyZSBvZiB0aGlzLmZpeHR1cmVzKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIGZpeHR1cmVcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgY29udGFpbmVyIG9mIHRoaXMuY29udGFpbmVycykge1xyXG4gICAgICAgICAgICB5aWVsZCBjb250YWluZXJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgbW9uc3RlciBvZiB0aGlzLm1vbnN0ZXJzKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIG1vbnN0ZXJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHlpZWxkIHRoaXMucGxheWVyXHJcbiAgICB9XHJcblxyXG4gICAgdGlsZUF0KHh5OiBnZW8uUG9pbnQpOiBybC5UaWxlIHwgbnVsbCB7XHJcbiAgICAgICAgcmV0dXJuIGFycmF5LmZpbmQodGhpcy50aWxlcywgdCA9PiAodC5wb3NpdGlvbj8uZXF1YWwoeHkpKSA/PyBmYWxzZSkgfHwgbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIGZpeHR1cmVBdCh4eTogZ2VvLlBvaW50KTogcmwuRml4dHVyZSB8IG51bGwge1xyXG4gICAgICAgIHJldHVybiBhcnJheS5maW5kKHRoaXMuZml4dHVyZXMsIGYgPT4gKGYucG9zaXRpb24/LmVxdWFsKHh5KSkgPz8gZmFsc2UpIHx8IG51bGxcclxuICAgIH1cclxuXHJcbiAgICBjb250YWluZXJBdCh4eTogZ2VvLlBvaW50KTogcmwuQ29udGFpbmVyIHwgbnVsbCB7XHJcbiAgICAgICAgcmV0dXJuIGFycmF5LmZpbmQodGhpcy5jb250YWluZXJzLCBjID0+IChjLnBvc2l0aW9uPy5lcXVhbCh4eSkpID8/IGZhbHNlKSB8fCBudWxsXHJcbiAgICB9XHJcblxyXG4gICAgbW9uc3RlckF0KHh5OiBnZW8uUG9pbnQpOiBybC5Nb25zdGVyIHwgbnVsbCB7XHJcbiAgICAgICAgcmV0dXJuIGFycmF5LmZpbmQodGhpcy5tb25zdGVycywgYyA9PiAoYy5wb3NpdGlvbj8uZXF1YWwoeHkpKSA/PyBmYWxzZSkgfHwgbnVsbFxyXG4gICAgfVxyXG5cclxuICAgICp0aGluZ3NBdCh4eTogZ2VvLlBvaW50KTogR2VuZXJhdG9yPHJsLk1vbnN0ZXIgfCBybC5GaXh0dXJlIHwgcmwuVGlsZT4ge1xyXG4gICAgICAgIGNvbnN0IGZpeHR1cmUgPSB0aGlzLmZpeHR1cmVBdCh4eSlcclxuICAgICAgICBpZiAoZml4dHVyZSkge1xyXG4gICAgICAgICAgICB5aWVsZCBmaXh0dXJlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB0aWxlID0gdGhpcy50aWxlQXQoeHkpXHJcbiAgICAgICAgaWYgKHRpbGUpIHtcclxuICAgICAgICAgICAgeWllbGQgdGlsZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5jb250YWluZXJBdCh4eSlcclxuICAgICAgICBpZiAoY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIGNvbnRhaW5lclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbW9uc3RlciA9IHRoaXMubW9uc3RlckF0KHh5KVxyXG4gICAgICAgIGlmIChtb25zdGVyKSB7XHJcbiAgICAgICAgICAgIHlpZWxkIG1vbnN0ZXJcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVWaXNpYmlsaXR5KG1hcDogTWFwLCBleWU6IGdlby5Qb2ludCwgcmFkaXVzOiBudW1iZXIpIHtcclxuLy8gICAgIHVwZGF0ZVZpc2liaWxpdHlGbGFncyhtYXAsIGV5ZSwgcmFkaXVzLCBUaWxlRmxhZ3MuVmlzaWJsZSB8IFRpbGVGbGFncy5TZWVuLCBUaWxlRmxhZ3MuVmlzaWJsZSlcclxuLy8gfVxyXG5cclxuLy8gZnVuY3Rpb24gdXBkYXRlVmlzaWJpbGl0eUZsYWdzKG1hcDogTWFwLCBleWU6IGdlby5Qb2ludCwgcmFkaXVzOiBudW1iZXIsIHNldEZsYWdzOiBUaWxlRmxhZ3MsIGNsZWFyRmxhZ3M6IFRpbGVGbGFncykge1xyXG4vLyAgICAgZm9yIChjb25zdCB0aWxlIG9mIG1hcCkge1xyXG4vLyAgICAgICAgIHRpbGUuZmxhZ3MgJj0gfmNsZWFyRmxhZ3NcclxuLy8gICAgIH1cclxuXHJcbi8vICAgICBtYXAuZ2V0VGlsZShleWUpLmZsYWdzIHw9IHNldEZsYWdzXHJcblxyXG4vLyAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA4OyArK2kpIHtcclxuLy8gICAgICAgICB1cGRhdGVWaXNpYmlsaXR5T2N0YW50KG1hcCwgZXllLCByYWRpdXMsIHNldEZsYWdzLCBpKVxyXG4vLyAgICAgfVxyXG4vLyB9XHJcblxyXG4vLyBmdW5jdGlvbiB1cGRhdGVWaXNpYmlsaXR5T2N0YW50KG1hcDogTWFwLCBleWU6IGdlby5Qb2ludCwgcmFkaXVzOiBudW1iZXIsIHNldEZsYWdzOiBUaWxlRmxhZ3MsIG9jdGFudDogbnVtYmVyKSB7XHJcbi8vICAgICBjb25zdCBzaGFkb3dzOiBnZW8uUG9pbnRbXSA9IFtdXHJcblxyXG4vLyAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gcmFkaXVzOyArK2kpIHtcclxuLy8gICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8PSBpOyArK2opIHtcclxuLy8gICAgICAgICAgICAgY29uc3Qgb2N0YW50UG9pbnQgPSBuZXcgZ2VvLlBvaW50KGksIGopXHJcblxyXG4vLyAgICAgICAgICAgICBjb25zdCBtYXBQb2ludCA9IHRyYW5zZm9ybU9jdGFudChvY3RhbnRQb2ludCwgb2N0YW50KS5hZGQoZXllKVxyXG4vLyAgICAgICAgICAgICBpZiAoIW1hcC5pbkJvdW5kcyhtYXBQb2ludCkpIHtcclxuLy8gICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbi8vICAgICAgICAgICAgIH1cclxuXHJcbi8vICAgICAgICAgICAgIGlmIChpc1NoYWRvd2VkKHNoYWRvd3MsIG9jdGFudFBvaW50KSkge1xyXG4vLyAgICAgICAgICAgICAgICAgY29udGludWVcclxuLy8gICAgICAgICAgICAgfVxyXG5cclxuLy8gICAgICAgICAgICAgY29uc3QgdGlsZSA9IG1hcC5nZXRUaWxlKG1hcFBvaW50KVxyXG4vLyAgICAgICAgICAgICBpZiAodGlsZUJsb2Nrc1ZpZXcodGlsZSkpIHtcclxuLy8gICAgICAgICAgICAgICAgIHNoYWRvd3MucHVzaChvY3RhbnRQb2ludClcclxuLy8gICAgICAgICAgICAgfVxyXG5cclxuLy8gICAgICAgICAgICAgaWYgKGdlby5jYWxjRGlzdChtYXBQb2ludCwgZXllKSA+IHJhZGl1cykge1xyXG4vLyAgICAgICAgICAgICAgICAgY29udGludWVcclxuLy8gICAgICAgICAgICAgfVxyXG5cclxuLy8gICAgICAgICAgICAgdGlsZS5mbGFncyB8PSBzZXRGbGFnc1xyXG4vLyAgICAgICAgIH1cclxuLy8gICAgIH1cclxuLy8gfVxyXG5cclxuLy8gZnVuY3Rpb24gdHJhbnNmb3JtT2N0YW50KGNvb3JkczogZ2VvLlBvaW50LCBvY3RhbnQ6IG51bWJlcik6IGdlby5Qb2ludCB7XHJcbi8vICAgICBzd2l0Y2ggKG9jdGFudCkge1xyXG4vLyAgICAgICAgIGNhc2UgMDogcmV0dXJuIG5ldyBnZW8uUG9pbnQoY29vcmRzLmksIC1jb29yZHMuaik7XHJcbi8vICAgICAgICAgY2FzZSAxOiByZXR1cm4gbmV3IGdlby5Qb2ludChjb29yZHMuaiwgLWNvb3Jkcy5pKTtcclxuLy8gICAgICAgICBjYXNlIDI6IHJldHVybiBuZXcgZ2VvLlBvaW50KGNvb3Jkcy5qLCBjb29yZHMuaSk7XHJcbi8vICAgICAgICAgY2FzZSAzOiByZXR1cm4gbmV3IGdlby5Qb2ludChjb29yZHMuaSwgY29vcmRzLmopO1xyXG4vLyAgICAgICAgIGNhc2UgNDogcmV0dXJuIG5ldyBnZW8uUG9pbnQoLWNvb3Jkcy5pLCBjb29yZHMuaik7XHJcbi8vICAgICAgICAgY2FzZSA1OiByZXR1cm4gbmV3IGdlby5Qb2ludCgtY29vcmRzLmosIGNvb3Jkcy5pKTtcclxuLy8gICAgICAgICBjYXNlIDY6IHJldHVybiBuZXcgZ2VvLlBvaW50KC1jb29yZHMuaiwgLWNvb3Jkcy5pKTtcclxuLy8gICAgICAgICBjYXNlIDc6IHJldHVybiBuZXcgZ2VvLlBvaW50KC1jb29yZHMuaSwgLWNvb3Jkcy5qKTtcclxuLy8gICAgIH1cclxuXHJcbi8vICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIG9jdGFudCAtIG11c3QgYmUgaW4gaW50ZXJ2YWwgWzAsIDgpXCIpXHJcbi8vIH1cclxuXHJcbi8vIGZ1bmN0aW9uIGlzU2hhZG93ZWQoc2hhZG93czogZ2VvLlBvaW50W10sIGNvb3JkczogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbi8vICAgICByZXR1cm4gaXRlci5hbnkoc2hhZG93cywgeCA9PiBzaGFkb3dDb3ZlcnNQb2ludCh4LCBjb29yZHMpKVxyXG4vLyB9XHJcblxyXG4vLyBmdW5jdGlvbiBzaGFkb3dDb3ZlcnNQb2ludChzaGFkb3c6IGdlby5Qb2ludCwgY29vcmRzOiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuLy8gICAgIGlmIChzaGFkb3cuaiA9PSAwKSB7XHJcbi8vICAgICAgICAgcmV0dXJuIGNvb3Jkcy5pID4gc2hhZG93LmlcclxuLy8gICAgIH1cclxuXHJcbi8vICAgICBjb25zdCBzdGFydEogPSBzaGFkb3cuaiAvIChzaGFkb3cuaSArIDEpICogY29vcmRzLmlcclxuLy8gICAgIGNvbnN0IGVuZEogPSAoc2hhZG93LmogKyAxKSAvIHNoYWRvdy5pICogY29vcmRzLmlcclxuXHJcbi8vICAgICByZXR1cm4gY29vcmRzLmkgPiBzaGFkb3cuaSAmJiBjb29yZHMuaiA+IHN0YXJ0SiAmJiBjb29yZHMuaiA8IGVuZEpcclxuLy8gfSJdfQ==