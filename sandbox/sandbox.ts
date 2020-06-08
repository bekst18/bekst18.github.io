import * as array from "../shared/array.js"
import * as noise from "../shared/noise.js"
import * as audio from "../shared/audio.js"
init()

function init() {
    document.addEventListener("click", play)
    document.addEventListener("keydown", play)
}

async function play() {
    const ac = new AudioContext()
    const buffer = await audio.loadAudio(ac, "../breakout/assets/impact1.wav")
    const src = ac.createBufferSource()
    src.buffer = buffer
    src.connect(ac.destination)
    src.start()
}