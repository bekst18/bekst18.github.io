export async function loadAudio(ac: AudioContext, url: string) {
    const response = await fetch(url)
    const data = await response.arrayBuffer()
    const buffer = await ac.decodeAudioData(data)
    return buffer
}