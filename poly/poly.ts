import * as dom from "../shared/dom.js"
import * as math from "../shared/math.js"

interface Vertex {
    x: number
    y: number
    reflex: boolean
    ear: boolean
}

function init() {
    const canvas = dom.byId("canvas") as HTMLCanvasElement
    const ctx = canvas.getContext("2d")!
    if (!ctx) {
        throw new Error("Failed to create canvas, no browser support?")
    }

    const clearButton = dom.byId("clear") as HTMLButtonElement
    const xSpan = dom.byId("x") as HTMLSpanElement
    const ySpan = dom.byId("y") as HTMLSpanElement

    let poly = new Array<[number, number]>()
    let vertices = new Array<Vertex>()
    let diags = new Array<[number, number, number, number]>()

    canvas.addEventListener("pointerup", onCanvasClick)
    canvas.addEventListener("pointermove", onCanvasMove)
    canvas.addEventListener("contextmenu", (e) => e.preventDefault())
    canvas.addEventListener("keypress", onCanvasKeypress)
    clearButton.addEventListener("click", onClearClick)

    function onCanvasClick(e: PointerEvent) {
        if (e.button === 0) {
            poly.push([e.clientX, e.clientY])
            reset()
            redraw()
        } else if (e.button === 2) {
            poly.pop()
            reset()
            redraw()
        }
    }

    function onCanvasMove(e: PointerEvent) {
        const [x, y] = [e.clientX, e.clientY]
        xSpan.textContent = x.toString()
        ySpan.textContent = y.toString()
    }

    function onCanvasKeypress(e: KeyboardEvent) {
        if (e.key === ' ') {
            const diag = step(vertices)
            if (diag) {
                diags.push(diag)
            }

            redraw()
        }

        if (e.key === 'r' || e.key === 'R') {
            reset()
            redraw()
        }
    }

    function reset() {
        vertices = beginTriangulation(poly)
        diags = []
    }

    function redraw() {
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
        drawPoly()
        drawTriangulation()
    }

    function drawPoly() {
        // draw interior
        if (poly.length >= 3) {
            ctx.fillStyle = "lightgray"
            ctx.strokeStyle = "black"
            ctx.beginPath()
            for (const pt of poly) {
                const [x, y] = pt
                ctx.lineTo(x, y)
            }

            {
                const [x, y] = poly[0]
                ctx.lineTo(x, y)
            }

            ctx.closePath()
            ctx.fill()
            ctx.stroke()
        }

        // draw vertices
        ctx.strokeStyle = "black"
        ctx.fillStyle = "gray"
        for (const pt of poly) {
            let radius = 3
            const [x, y] = pt
            ctx.beginPath()
            ctx.arc(x, y, radius, 0, Math.PI * 2)
            ctx.closePath()
            ctx.fill()
            ctx.stroke()
        }
    }

    function drawTriangulation() {
        // draw interior
        if (vertices.length >= 3) {
            ctx.fillStyle = "darkgray"
            ctx.strokeStyle = "black"
            ctx.beginPath()
            for (const v of vertices) {
                const { x, y } = v
                ctx.lineTo(x, y)
            }

            {
                const { x, y } = vertices[0]
                ctx.lineTo(x, y)
            }

            ctx.closePath()
            ctx.fill()
            ctx.stroke()
        }

        // draw diagonals
        ctx.strokeStyle = "red"
        for (const diag of diags) {
            const [x0, y0, x1, y1] = diag
            ctx.beginPath()
            ctx.setLineDash([1, 2])
            ctx.lineTo(x0, y0)
            ctx.setLineDash([1, 2])
            ctx.lineTo(x1, y1)
            ctx.closePath()
            ctx.stroke()
        }

        // draw vertices
        ctx.strokeStyle = "black"
        const textHeight = ctx.measureText("M").width
        for (let i = 0; i < vertices.length; ++i) {
            let radius = 9
            const { x, y, reflex, ear } = vertices[i]

            ctx.fillStyle = "blue"
            if (ear) {
                ctx.fillStyle = "green"
                radius = 9
            } else if (reflex) {
                ctx.fillStyle = "red"
                radius = 9
            }

            ctx.beginPath()
            ctx.arc(x, y, radius, 0, Math.PI * 2)
            ctx.closePath()
            ctx.fill()
            ctx.stroke()

            ctx.fillStyle = "black"
            const label = i.toString()
            const metrics = ctx.measureText(label)
            ctx.fillText(i.toString(), x - metrics.width / 2, y + textHeight / 2)
        }
    }

    function onClearClick() {
        poly = []
        reset()
        redraw()
    }
}

function beginTriangulation(poly: [number, number][]): Vertex[] {
    const vertices = poly.map(pt => ({ x: pt[0], y: pt[1], reflex: false, ear: false }))

    // determine initial status of every vertex
    for (let i = 0; i < vertices.length; ++i) {
        updateReflex(vertices, i)
    }

    // determine status of every vertex
    for (let i = 0; i < vertices.length; ++i) {
        updateEar(vertices, i)
    }

    return vertices
}

function step(vertices: Vertex[]): [number, number, number, number] | null {
    if (vertices.length <= 3) {
        return null
    }

    // start removing ears!
    // copy initial array, then splice triangles off one by one
    // find ear
    const i1 = vertices.findIndex(v => v.ear)
    if (i1 === -1) {
        throw new Error("No ear found")
    }
 
    const i0 = math.mod(i1 - 1, vertices.length)
    const i2 = math.mod(i1 + 1, vertices.length)
    const { x: x0, y: y0 } = vertices[i0]
    const { x: x2, y: y2 } = vertices[i2]

    vertices.splice(i1, 1)
    updateStatus(vertices, math.mod(i1 - 1, vertices.length))

    return ([x0, y0, x2, y2])
}

// function triangulate(vs: Vertex[]): Array<[number, number, number, number]> {
//     for (const v of vs) {
//         v.status = Status.none
//     }

//     if (vs.length <= 3) {
//         return []
//     }

//     // determine status of every vertex
//     for (let i = 0; i < vs.length; ++i) {
//         updateReflex(vs, i)
//     }

//     // determine status of every vertex
//     for (let i = 0; i < vs.length; ++i) {
//         updateEar(vs, i)
//     }

//     // start removing ears!
//     // copy initial array, then splice triangles off one by one
//     const diags = new Array<[number, number, number, number]>()
//     while (vs.length > 3) {
//         // find ear
//         const i1 = vs.findIndex(v => v.status === Status.ear)
//         if (i1 === -1) {
//             throw new Error("No ear found")
//         }

//         const i0 = math.mod(i1 - 1, vs.length)
//         const i2 = math.mod(i1 + 1, vs.length)
//         const { x: x0, y: y0 } = vs[i0]
//         const { x: x2, y: y2 } = vs[i2]
//         diags.push([x0, y0, x2, y2])

//         vs.splice(i1, 1)
//         updateStatus(vs, math.mod(i1 - 1, vs.length))
//     }

//     // final triangle (does this line always already exist?)
//     // diags.push([vs[0].x, vs[0].y, vs[2].x, vs[2].y])
//     return diags
// }

// update status of two adjacent vertices
function updateStatus(vs: Vertex[], i0: number) {
    const i1 = math.mod(i0 + 1, vs.length)
    console.log(vs, i0, i1)

    // convex can't become reflex
    const v0 = vs[i0]
    if (v0.reflex) {
        updateReflex(vs, i0)
    }

    const v1 = vs[i1]
    if (v1.reflex) {
        updateReflex(vs, i1)
    }

    updateEar(vs, i0)
    updateEar(vs, i1)
}

function updateEar(vs: readonly Vertex[], i: number) {
    const n = vs.length
    const v0 = vs[math.mod(i - 1, n)]
    const v1 = vs[i]
    const v2 = vs[math.mod(i + 1, n)]
    const i3 = math.mod(i + 2, n)
    // reflex can't also be ear
    if (v1.reflex) {
        v1.ear = false
        return
    }

    // update ear status
    // check other vertices to determine if they are in triangle
    for (let j = 0; j < n - 3; ++j) {
        const jj = (i3 + j) % n
        const { x, y, reflex } = vs[jj]

        // must be reflex to be inside triangle
        if (!reflex) {
            continue
        }

        if (
            leftTurn(x, y, v0.x, v0.y, v1.x, v1.y)
            && leftTurn(x, y, v1.x, v1.y, v2.x, v2.y)
            && leftTurn(x, y, v2.x, v2.y, v0.x, v0.y)) {
            v1.ear = false
            return
        }
    }

    v1.ear = true
}

function updateReflex(vs: readonly Vertex[], i: number) {
    console.log("update reflex", i, vs)
    const n = vs.length
    const v0 = vs[math.mod(i - 1, n)]
    const v1 = vs[i]
    const v2 = vs[math.mod(i + 1, n)]

    // is this a reflex vertex?
    // v1 is a reflex vertex if for ccw polygon a cw turn is made from v(i-1), vi, v(i+1)
    if (leftTurn(v0.x, v0.y, v1.x, v1.y, v2.x, v2.y)) {
        v1.reflex = false
    } else {
        v1.reflex = true
    }
}

function leftTurn(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): boolean {
    const ax = x2 - x0
    const ay = y2 - y0
    const bx = x1 - x0
    const by = y1 - y0
    return det(ax, ay, bx, by) > 0
}

function det(x0: number, y0: number, x1: number, y1: number): number {
    return x0 * y1 - y0 * x1
}

init()