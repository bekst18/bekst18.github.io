import * as util from "../shared/util.js";
import * as glu from "./glu.js";
const vertexSrc = `#version 300 es
precision mediump float;
in vec4 in_position;

void main() {
    gl_Position = in_position;
}
`;
const fragmentSrc = `#version 300 es
precision mediump float;
uniform vec2 scroll_offset;
out vec4 out_color;

${glu.perlin2}

int mmod(const int n, const int M) {
    return ((n % M) + M) % M;
}

ivec2 mmod(const ivec2 n, const ivec2 M) {
    return ((n % M) + M) % M;
}

float grid_line_dist(const vec2 xy, const int interval, const float width) {
    vec2 mxy = vec2(mmod(ivec2(xy), ivec2(interval, interval)));
    mxy = clamp(mxy, vec2(0, 0), vec2(width, width));
    vec2 dxy = vec2(width, width) - mxy;
    return max(dxy.x, dxy.y) / float(width);
}

void main() {
    vec2 xy = gl_FragCoord.xy + scroll_offset.xy;
    float freq = 16.f / 512.f;
    float v = fbm2(freq * xy.x, freq * xy.y, 2.f, .5f, 5) / 32.f;
    vec4 bg = vec4(.9 + v,.9 + v,.9 + v,1);
    float d1 = grid_line_dist(xy, 128, 3.f);
    float d2 = grid_line_dist(xy, 32, 1.f);
    vec3 a = mix(bg.rgb, vec3(0, 0, 1), d1);
    vec3 b = mix(a, vec3(0, 0, 1), d2);
    out_color = vec4(b, 1);
}
`;
const canvas = util.byId("canvas");
const errorsDiv = util.byId("errors");
const acquireImage = util.byId("acquireImage");
init();
function init() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    clearErrorMessages();
    const gs = createGameState();
    canvas.addEventListener("keydown", (ev) => handleKeyDown(ev, gs.keyState));
    canvas.addEventListener("keyup", (ev) => handleKeyUp(ev, gs.keyState));
    acquireImage.addEventListener("click", handleAcquireImageClick);
    requestAnimationFrame(() => {
        tick(gs);
    });
}
function createGameState() {
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        throw new Error("Failed to not initialize webgl 2.0. Confirm that your browser is up to date and has support.");
    }
    clearErrorMessages();
    // compile program, get uniform locations
    const program = glu.compileProgram(gl, vertexSrc, fragmentSrc);
    const scrollOffsetLocation = glu.getUniformLocation(gl, program, "scroll_offset");
    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) {
        throw new Error("Failed to create buffer");
    }
    const positions = [-1, -1, 1, -1, 1, 1, -1, 1];
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    const indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        throw new Error("Failed to create index buffer");
    }
    const vao = gl.createVertexArray();
    if (!vao) {
        throw new Error("failed to create vertex array object");
    }
    const positionAttributeIndex = gl.getAttribLocation(program, "in_position");
    if (positionAttributeIndex < 0) {
        throwError("in_position attribute was not found");
    }
    gl.bindVertexArray(vao);
    const indices = [0, 1, 2, 0, 2, 3];
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(positionAttributeIndex, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeIndex);
    return {
        gl: gl,
        program: program,
        vao: vao,
        scrollOffsetLocation: scrollOffsetLocation,
        scrollOffset: { x: 0, y: 0 },
        keyState: {}
    };
}
function tick(gs) {
    processInput(gs);
    renderFrame(gs);
    requestAnimationFrame(() => tick(gs));
}
function processInput(gs) {
    if (gs.keyState["w"]) {
        gs.scrollOffset.y += 1;
    }
    if (gs.keyState["s"]) {
        gs.scrollOffset.y -= 1;
    }
    if (gs.keyState["a"]) {
        gs.scrollOffset.x -= 1;
    }
    if (gs.keyState["d"]) {
        gs.scrollOffset.x += 1;
    }
}
function renderFrame(gs) {
    const { gl, program, vao } = gs;
    checkResize();
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(gs.scrollOffsetLocation, gs.scrollOffset.x, gs.scrollOffset.y);
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}
function checkResize() {
    if (canvas.width == canvas.clientWidth && canvas.height == canvas.clientHeight) {
        return;
    }
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
function clearErrorMessages() {
    canvas.hidden = false;
    util.removeAllChildren(errorsDiv);
}
function appendErrorMessage(error) {
    console.log(error);
    const div = document.createElement("div");
    div.classList.add("error-message");
    div.textContent = error;
    errorsDiv.appendChild(div);
    canvas.hidden = true;
}
function throwError(message) {
    appendErrorMessage(message);
    throw new Error(message);
}
function handleKeyDown(ev, keyState) {
    keyState[ev.key] = true;
}
function handleKeyUp(ev, keyState) {
    keyState[ev.key] = false;
}
function handleAcquireImageClick() {
    navigator.mediaDevices.getUserMedia({ video: true });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1hZ2luZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImltYWdpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQixNQUFNLFNBQVMsR0FBRzs7Ozs7OztDQU9qQixDQUFBO0FBQ0QsTUFBTSxXQUFXLEdBQUc7Ozs7O0VBS2xCLEdBQUcsQ0FBQyxPQUFPOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBNEJaLENBQUE7QUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBc0IsQ0FBQTtBQUN2RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFzQixDQUFBO0FBRW5FLElBQUksRUFBRSxDQUFBO0FBZ0JOLFNBQVMsSUFBSTtJQUNULE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQTtJQUNqQyxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUE7SUFFbkMsa0JBQWtCLEVBQUUsQ0FBQTtJQUNwQixNQUFNLEVBQUUsR0FBRyxlQUFlLEVBQUUsQ0FBQTtJQUU1QixNQUFNLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO0lBQzFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7SUFDdEUsWUFBWSxDQUFDLGdCQUFnQixDQUFD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Q0FBQTtJQUNsQyxHQUFHLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtJQUN2QixTQUFTLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzFCLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO0FBQ3hCLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxPQUFlO0lBQy9CLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDNUIsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEVBQWlCLEVBQUUsUUFBaUM7SUFDdkUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUE7QUFDM0IsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLEVBQWlCLEVBQUUsUUFBaUM7SUFDckUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUE7QUFDNUIsQ0FBQztBQUVELFNBQVMsdUJBQXVCO0lBQzVCLFNBQVMsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUE7QUFDdEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHV0aWwgZnJvbSBcIi4uL3NoYXJlZC91dGlsLmpzXCJcclxuaW1wb3J0ICogYXMgZ2x1IGZyb20gXCIuL2dsdS5qc1wiXHJcblxyXG5jb25zdCB2ZXJ0ZXhTcmMgPSBgI3ZlcnNpb24gMzAwIGVzXHJcbnByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1xyXG5pbiB2ZWM0IGluX3Bvc2l0aW9uO1xyXG5cclxudm9pZCBtYWluKCkge1xyXG4gICAgZ2xfUG9zaXRpb24gPSBpbl9wb3NpdGlvbjtcclxufVxyXG5gXHJcbmNvbnN0IGZyYWdtZW50U3JjID0gYCN2ZXJzaW9uIDMwMCBlc1xyXG5wcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcclxudW5pZm9ybSB2ZWMyIHNjcm9sbF9vZmZzZXQ7XHJcbm91dCB2ZWM0IG91dF9jb2xvcjtcclxuXHJcbiR7Z2x1LnBlcmxpbjJ9XHJcblxyXG5pbnQgbW1vZChjb25zdCBpbnQgbiwgY29uc3QgaW50IE0pIHtcclxuICAgIHJldHVybiAoKG4gJSBNKSArIE0pICUgTTtcclxufVxyXG5cclxuaXZlYzIgbW1vZChjb25zdCBpdmVjMiBuLCBjb25zdCBpdmVjMiBNKSB7XHJcbiAgICByZXR1cm4gKChuICUgTSkgKyBNKSAlIE07XHJcbn1cclxuXHJcbmZsb2F0IGdyaWRfbGluZV9kaXN0KGNvbnN0IHZlYzIgeHksIGNvbnN0IGludCBpbnRlcnZhbCwgY29uc3QgZmxvYXQgd2lkdGgpIHtcclxuICAgIHZlYzIgbXh5ID0gdmVjMihtbW9kKGl2ZWMyKHh5KSwgaXZlYzIoaW50ZXJ2YWwsIGludGVydmFsKSkpO1xyXG4gICAgbXh5ID0gY2xhbXAobXh5LCB2ZWMyKDAsIDApLCB2ZWMyKHdpZHRoLCB3aWR0aCkpO1xyXG4gICAgdmVjMiBkeHkgPSB2ZWMyKHdpZHRoLCB3aWR0aCkgLSBteHk7XHJcbiAgICByZXR1cm4gbWF4KGR4eS54LCBkeHkueSkgLyBmbG9hdCh3aWR0aCk7XHJcbn1cclxuXHJcbnZvaWQgbWFpbigpIHtcclxuICAgIHZlYzIgeHkgPSBnbF9GcmFnQ29vcmQueHkgKyBzY3JvbGxfb2Zmc2V0Lnh5O1xyXG4gICAgZmxvYXQgZnJlcSA9IDE2LmYgLyA1MTIuZjtcclxuICAgIGZsb2F0IHYgPSBmYm0yKGZyZXEgKiB4eS54LCBmcmVxICogeHkueSwgMi5mLCAuNWYsIDUpIC8gMzIuZjtcclxuICAgIHZlYzQgYmcgPSB2ZWM0KC45ICsgdiwuOSArIHYsLjkgKyB2LDEpO1xyXG4gICAgZmxvYXQgZDEgPSBncmlkX2xpbmVfZGlzdCh4eSwgMTI4LCAzLmYpO1xyXG4gICAgZmxvYXQgZDIgPSBncmlkX2xpbmVfZGlzdCh4eSwgMzIsIDEuZik7XHJcbiAgICB2ZWMzIGEgPSBtaXgoYmcucmdiLCB2ZWMzKDAsIDAsIDEpLCBkMSk7XHJcbiAgICB2ZWMzIGIgPSBtaXgoYSwgdmVjMygwLCAwLCAxKSwgZDIpO1xyXG4gICAgb3V0X2NvbG9yID0gdmVjNChiLCAxKTtcclxufVxyXG5gXHJcblxyXG5jb25zdCBjYW52YXMgPSB1dGlsLmJ5SWQoXCJjYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnRcclxuY29uc3QgZXJyb3JzRGl2ID0gdXRpbC5ieUlkKFwiZXJyb3JzXCIpO1xyXG5jb25zdCBhY3F1aXJlSW1hZ2UgPSB1dGlsLmJ5SWQoXCJhY3F1aXJlSW1hZ2VcIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcclxuXHJcbmluaXQoKVxyXG5cclxuaW50ZXJmYWNlIFBvaW50IHtcclxuICAgIHg6IG51bWJlcixcclxuICAgIHk6IG51bWJlclxyXG59XHJcblxyXG5pbnRlcmZhY2UgR2FtZVN0YXRlIHtcclxuICAgIGdsOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0XHJcbiAgICBwcm9ncmFtOiBXZWJHTFByb2dyYW1cclxuICAgIHZhbzogV2ViR0xWZXJ0ZXhBcnJheU9iamVjdCxcclxuICAgIHNjcm9sbE9mZnNldExvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbixcclxuICAgIHNjcm9sbE9mZnNldDogUG9pbnQsXHJcbiAgICBrZXlTdGF0ZTogUmVjb3JkPHN0cmluZywgYm9vbGVhbj5cclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgY2FudmFzLmhlaWdodCA9IGNhbnZhcy5jbGllbnRIZWlnaHRcclxuXHJcbiAgICBjbGVhckVycm9yTWVzc2FnZXMoKVxyXG4gICAgY29uc3QgZ3MgPSBjcmVhdGVHYW1lU3RhdGUoKVxyXG5cclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZXYpID0+IGhhbmRsZUtleURvd24oZXYsIGdzLmtleVN0YXRlKSlcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgKGV2KSA9PiBoYW5kbGVLZXlVcChldiwgZ3Mua2V5U3RhdGUpKVxyXG4gICAgYWNxdWlyZUltYWdlLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBoYW5kbGVBY3F1aXJlSW1hZ2VDbGljaylcclxuXHJcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xyXG4gICAgICAgIHRpY2soZ3MpXHJcbiAgICB9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVHYW1lU3RhdGUoKTogR2FtZVN0YXRlIHtcclxuICAgIGNvbnN0IGdsID0gY2FudmFzLmdldENvbnRleHQoXCJ3ZWJnbDJcIilcclxuICAgIGlmICghZ2wpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gbm90IGluaXRpYWxpemUgd2ViZ2wgMi4wLiBDb25maXJtIHRoYXQgeW91ciBicm93c2VyIGlzIHVwIHRvIGRhdGUgYW5kIGhhcyBzdXBwb3J0LlwiKVxyXG4gICAgfVxyXG5cclxuICAgIGNsZWFyRXJyb3JNZXNzYWdlcygpXHJcblxyXG4gICAgLy8gY29tcGlsZSBwcm9ncmFtLCBnZXQgdW5pZm9ybSBsb2NhdGlvbnNcclxuICAgIGNvbnN0IHByb2dyYW0gPSBnbHUuY29tcGlsZVByb2dyYW0oZ2wsIHZlcnRleFNyYywgZnJhZ21lbnRTcmMpXHJcbiAgICBjb25zdCBzY3JvbGxPZmZzZXRMb2NhdGlvbiA9IGdsdS5nZXRVbmlmb3JtTG9jYXRpb24oZ2wsIHByb2dyYW0sIFwic2Nyb2xsX29mZnNldFwiKVxyXG5cclxuICAgIGNvbnN0IHBvc2l0aW9uQnVmZmVyID0gZ2wuY3JlYXRlQnVmZmVyKClcclxuICAgIGlmICghcG9zaXRpb25CdWZmZXIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gY3JlYXRlIGJ1ZmZlclwiKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHBvc2l0aW9ucyA9IFstMSwgLTEsIDEsIC0xLCAxLCAxLCAtMSwgMV1cclxuICAgIGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCBwb3NpdGlvbkJ1ZmZlcilcclxuICAgIGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KHBvc2l0aW9ucyksIGdsLlNUQVRJQ19EUkFXKVxyXG5cclxuICAgIGNvbnN0IGluZGV4QnVmZmVyID0gZ2wuY3JlYXRlQnVmZmVyKClcclxuICAgIGlmICghaW5kZXhCdWZmZXIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gY3JlYXRlIGluZGV4IGJ1ZmZlclwiKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHZhbyA9IGdsLmNyZWF0ZVZlcnRleEFycmF5KClcclxuICAgIGlmICghdmFvKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZmFpbGVkIHRvIGNyZWF0ZSB2ZXJ0ZXggYXJyYXkgb2JqZWN0XCIpXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcG9zaXRpb25BdHRyaWJ1dGVJbmRleCA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHByb2dyYW0sIFwiaW5fcG9zaXRpb25cIilcclxuICAgIGlmIChwb3NpdGlvbkF0dHJpYnV0ZUluZGV4IDwgMCkge1xyXG4gICAgICAgIHRocm93RXJyb3IoXCJpbl9wb3NpdGlvbiBhdHRyaWJ1dGUgd2FzIG5vdCBmb3VuZFwiKVxyXG4gICAgfVxyXG5cclxuICAgIGdsLmJpbmRWZXJ0ZXhBcnJheSh2YW8pXHJcblxyXG4gICAgY29uc3QgaW5kaWNlcyA9IFswLCAxLCAyLCAwLCAyLCAzXVxyXG4gICAgZ2wuYmluZEJ1ZmZlcihnbC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgaW5kZXhCdWZmZXIpXHJcbiAgICBnbC5idWZmZXJEYXRhKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCBuZXcgVWludDE2QXJyYXkoaW5kaWNlcyksIGdsLlNUQVRJQ19EUkFXKVxyXG5cclxuICAgIGdsLnZlcnRleEF0dHJpYlBvaW50ZXIocG9zaXRpb25BdHRyaWJ1dGVJbmRleCwgMiwgZ2wuRkxPQVQsIGZhbHNlLCAwLCAwKVxyXG4gICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkocG9zaXRpb25BdHRyaWJ1dGVJbmRleClcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGdsOiBnbCxcclxuICAgICAgICBwcm9ncmFtOiBwcm9ncmFtLFxyXG4gICAgICAgIHZhbzogdmFvLFxyXG4gICAgICAgIHNjcm9sbE9mZnNldExvY2F0aW9uOiBzY3JvbGxPZmZzZXRMb2NhdGlvbixcclxuICAgICAgICBzY3JvbGxPZmZzZXQ6IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICAgIGtleVN0YXRlOiB7fVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0aWNrKGdzOiBHYW1lU3RhdGUpIHtcclxuICAgIHByb2Nlc3NJbnB1dChncylcclxuICAgIHJlbmRlckZyYW1lKGdzKVxyXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRpY2soZ3MpKVxyXG59XHJcblxyXG5mdW5jdGlvbiBwcm9jZXNzSW5wdXQoZ3M6IEdhbWVTdGF0ZSkge1xyXG4gICAgaWYgKGdzLmtleVN0YXRlW1wid1wiXSkge1xyXG4gICAgICAgIGdzLnNjcm9sbE9mZnNldC55ICs9IDFcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZ3Mua2V5U3RhdGVbXCJzXCJdKSB7XHJcbiAgICAgICAgZ3Muc2Nyb2xsT2Zmc2V0LnkgLT0gMVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChncy5rZXlTdGF0ZVtcImFcIl0pIHtcclxuICAgICAgICBncy5zY3JvbGxPZmZzZXQueCAtPSAxXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGdzLmtleVN0YXRlW1wiZFwiXSkge1xyXG4gICAgICAgIGdzLnNjcm9sbE9mZnNldC54ICs9IDFcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyRnJhbWUoZ3M6IEdhbWVTdGF0ZSkge1xyXG4gICAgY29uc3QgeyBnbCwgcHJvZ3JhbSwgdmFvIH0gPSBnc1xyXG4gICAgY2hlY2tSZXNpemUoKVxyXG4gICAgZ2wudmlld3BvcnQoMCwgMCwgZ2wuZHJhd2luZ0J1ZmZlcldpZHRoLCBnbC5kcmF3aW5nQnVmZmVySGVpZ2h0KVxyXG4gICAgZ2wuY2xlYXJDb2xvcigwLCAwLCAwLCAxKVxyXG4gICAgZ2wuY2xlYXIoZ2wuQ09MT1JfQlVGRkVSX0JJVClcclxuICAgIGdsLnVzZVByb2dyYW0ocHJvZ3JhbSlcclxuICAgIGdsLnVuaWZvcm0yZihncy5zY3JvbGxPZmZzZXRMb2NhdGlvbiwgZ3Muc2Nyb2xsT2Zmc2V0LngsIGdzLnNjcm9sbE9mZnNldC55KVxyXG4gICAgZ2wuYmluZFZlcnRleEFycmF5KHZhbylcclxuICAgIGdsLmRyYXdFbGVtZW50cyhnbC5UUklBTkdMRVMsIDYsIGdsLlVOU0lHTkVEX1NIT1JULCAwKVxyXG59XHJcblxyXG5mdW5jdGlvbiBjaGVja1Jlc2l6ZSgpIHtcclxuICAgIGlmIChjYW52YXMud2lkdGggPT0gY2FudmFzLmNsaWVudFdpZHRoICYmIGNhbnZhcy5oZWlnaHQgPT0gY2FudmFzLmNsaWVudEhlaWdodCkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5jbGllbnRXaWR0aFxyXG4gICAgY2FudmFzLmhlaWdodCA9IGNhbnZhcy5jbGllbnRIZWlnaHRcclxufVxyXG5cclxuZnVuY3Rpb24gY2xlYXJFcnJvck1lc3NhZ2VzKCkge1xyXG4gICAgY2FudmFzLmhpZGRlbiA9IGZhbHNlXHJcbiAgICB1dGlsLnJlbW92ZUFsbENoaWxkcmVuKGVycm9yc0RpdilcclxufVxyXG5cclxuZnVuY3Rpb24gYXBwZW5kRXJyb3JNZXNzYWdlKGVycm9yOiBzdHJpbmcpIHtcclxuICAgIGNvbnNvbGUubG9nKGVycm9yKVxyXG4gICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgIGRpdi5jbGFzc0xpc3QuYWRkKFwiZXJyb3ItbWVzc2FnZVwiKVxyXG4gICAgZGl2LnRleHRDb250ZW50ID0gZXJyb3JcclxuICAgIGVycm9yc0Rpdi5hcHBlbmRDaGlsZChkaXYpXHJcbiAgICBjYW52YXMuaGlkZGVuID0gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiB0aHJvd0Vycm9yKG1lc3NhZ2U6IHN0cmluZykge1xyXG4gICAgYXBwZW5kRXJyb3JNZXNzYWdlKG1lc3NhZ2UpXHJcbiAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSlcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlS2V5RG93bihldjogS2V5Ym9hcmRFdmVudCwga2V5U3RhdGU6IFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+KSB7XHJcbiAgICBrZXlTdGF0ZVtldi5rZXldID0gdHJ1ZVxyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVLZXlVcChldjogS2V5Ym9hcmRFdmVudCwga2V5U3RhdGU6IFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+KSB7XHJcbiAgICBrZXlTdGF0ZVtldi5rZXldID0gZmFsc2VcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlQWNxdWlyZUltYWdlQ2xpY2soKSB7XHJcbiAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7dmlkZW86IHRydWV9KVxyXG59Il19