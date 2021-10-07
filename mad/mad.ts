import * as dom from "../shared/dom.js"
import * as channel from "../shared/channel.js"

const minPlaceholderLength = 16;

interface State {
    title: string
    template: string
}

enum TokenType {
    Text,
    Placeholder,
}

interface Token {
    type: TokenType,
    start: number,
    length: number,
}

class CreateUi {
    private readonly createDiv = dom.byId("createUi")
    private readonly form = dom.byId("createForm")
    private readonly titleInput = dom.byId("title") as HTMLInputElement
    private readonly templateInput = dom.byId("template") as HTMLTextAreaElement
    private readonly clearButton = dom.byId("clearButton")
    private readonly placeholderSelect = dom.byId("placeholders")
    public readonly create = new channel.Channel<[string, string]>()

    constructor() {
        this.form.addEventListener("submit", evt => this.submit(evt))
        this.clearButton.addEventListener("click", _ => this.clear())
        this.templateInput.addEventListener("input", e => this.input(e))
    }

    public show() {
        this.createDiv.hidden = false
    }

    public hide() {
        this.createDiv.hidden = true
    }

    public load(state: State) {
        this.titleInput.value = state.title
        this.templateInput.value = state.template
    }

    private submit(evt: Event) {
        evt.preventDefault()
        this.create.publish(this.titleInput.value, this.templateInput.value)
    }

    private clear() {
        this.templateInput.value = ""
    }
}

class PrintUi {
    private readonly printDiv = dom.byId("printUi")
    private readonly printTitle = dom.byId("printTitle")
    private readonly printContent = dom.byId("printContent")
    private readonly placeholderTemplate = dom.byId("placeholderTemplate") as HTMLTemplateElement
    private readonly returnToTemplateButton = dom.byId("returnToTemplate")
    public readonly returnToTemplate = new channel.Channel<[void]>()

    constructor() {
        this.returnToTemplateButton.addEventListener("click", _ => this.returnToTemplate.publish())
    }

    public show(title: string, template: string) {
        this.printDiv.hidden = false
        this.printTitle.textContent = title
        dom.removeAllChildren(this.printContent)
        let tokens = this.parseTemplate(template)

        for (const token of tokens) {
            const type = token.type
            const value = template.substr(token.start, token.length)

            switch (type) {
                case TokenType.Text:
                    this.appendText(value)
                    break;

                case TokenType.Placeholder:
                    this.appendPlaceholder(value)
                    break;
            }
        }
    }

    public hide() {
        this.printDiv.hidden = true
    }

    private parseTemplate(template: string): Token[] {
        let tokens = new Array<Token>();
        let i = 0;
        while (true) {
            const token = this.parseToken(template, i);
            tokens.push(token)
            i += token.length;

            if (i >= template.length) {
                break;
            }
        }

        return tokens
    }

    private parseToken(template: string, start: number): Token {
        // peek at next char
        const ch = template[start]
        if (ch !== '[') {
            return this.parseText(template, start);
        }

        return this.parsePlaceholder(template, start);
    }

    private parsePlaceholder(template: string, start: number): Token {
        for (let i = start; i < template.length; ++i) {
            const ch = template[i];
            if (ch == ']') {
                return {
                    type: TokenType.Placeholder,
                    start: start,
                    length: i - start + 1,
                }
            }
        }

        return {
            type: TokenType.Placeholder,
            start: start,
            length: template.length - start,
        }
    }

    private parseText(template: string, start: number): Token {
        for (let i = start; i < template.length; ++i) {
            const ch = template[i];
            if (ch == '[') {
                return {
                    type: TokenType.Text,
                    start: start,
                    length: i - start,
                }
            }
        }

        return {
            type: TokenType.Text,
            start: start,
            length: template.length - start,
        }
    }

    private appendText(text: string) {
        const node = document.createTextNode(text)
        this.printContent.append(node)
    }

    private appendPlaceholder(placeholder: string) {
        placeholder = this.formatPlaceholder(placeholder)
        const frag = this.placeholderTemplate.content.cloneNode(true) as DocumentFragment
        const textDiv = dom.bySelector(frag, ".placeholder-text");
        textDiv.textContent = placeholder
        this.printContent.append(frag)
    }

    private formatPlaceholder(placeholder: string) {
        if (placeholder.startsWith("[")) {
            placeholder = placeholder.substr(1)
        }

        if (placeholder.endsWith("]")) {
            placeholder = placeholder.substr(0, placeholder.length - 1);
        }

        placeholder = placeholder.trim()
        while (placeholder.length < minPlaceholderLength) {
            placeholder = ` ${placeholder} `;
        }

        return placeholder
    }
}

async function main() {
    const createUi = new CreateUi()
    const printUi = new PrintUi()
    const settingsKey = "madSettings"

    createUi.show()

    createUi.create.subcribe(onCreate)
    printUi.returnToTemplate.subcribe(onReturnToTemplate)

    const state = loadState()
    if (state) {
        createUi.load(state)
    }

    function onCreate(title: string, template: string) {
        createUi.hide()
        saveState({ title, template })
        printUi.show(title, template)
    }

    function onReturnToTemplate() {
        printUi.hide()
        createUi.show()
    }

    function loadState(): State | null {
        const json = localStorage.getItem(settingsKey)
        if (!json) {
            console.log("No stored settings found")
            return null
        }

        const state = JSON.parse(json) as State
        return state
    }

    function saveState(state: State) {
        localStorage.setItem(settingsKey, JSON.stringify(state))
    }
}

main()