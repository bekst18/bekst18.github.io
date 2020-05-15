import * as dom from "../shared/dom.js"

const outputDiv = dom.byId("output")

enum MessageStyle {
    none,
    error,
    warning,
    info
}

export function write(message: string, style: MessageStyle = MessageStyle.none) {
    const div = document.createElement("div")
    div.textContent = message
    div.classList.add("message")

    if (style) {
        div.classList.add(`message-${MessageStyle[style]}`)
    }

    outputDiv.appendChild(div)
    outputDiv.scrollTop = outputDiv.scrollHeight
}

export function info(message: string) {
    write(message, MessageStyle.info)
}

export function error(message: string) {
    write(message, MessageStyle.error)
}

export function warning(message: string) {
    write(message, MessageStyle.warning)
}