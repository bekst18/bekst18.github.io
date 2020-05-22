import * as rand from "../shared/rand.js"
import * as array from "../shared/array.js"

main()

function main() {
    const input = array.uniform(0, 10)
    const output = array.uniform(0, 18)
    const w0 = array.generate(input.length * output.length, () => 1 - Math.random() * 2)
    tick(input, output, w0)
}

function tick(input: number[], output: number[], w0: number[]) {
    // reset input / output
    input.fill(0)
    output.fill(0)

    // generate an input
    const [x, y] = randInput(input)

    // step 1
    input[x] = 1
    input[9] = 0
    process(input, output, w0)

    // step 2
    input.fill(0)
    input[y] = 1
    input[9] = 1
    process(input, output, w0)

    // evaluate output

    // learn?
    // how to adjust weights to get closer to correct answer based on q?

}

function process(input: number[], output: number[], w: number[]) {
    for (let i = 0; i < output.length; ++i) {
        const iOffset = i * input.length
        for (let j = 0; j < input.length; ++j) {
            const offset = iOffset + j
            output[i] += input[j] * w[offset]
        }
    }
}

function randInput(input: number[]): [number, number] {
    const x = rand.int(0, 10)
    const y = rand.int(0, 10)
    return [x, y]
}

function evalAdd(x: number, y: number, output: number[]): number {
    console.log(output)
    // find output
    const o = output.indexOf(output.reduce((x, y) => x > y ? x : y))
    const r = Math.abs(o - (x + y))
    console.log(x, y, o, r)
    return r
}