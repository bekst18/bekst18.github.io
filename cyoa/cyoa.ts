import * as util from "../shared/util.js"

init()

interface Module {
    title: string
    description: string
    passages: Record<string, Passage>
}

interface Passage {
    title: string
    body: string
    choices: Choice[]
}

interface Choice {
    body: string
    transition: string
    passageId: string
}

interface State {
    currentModule: null | Module
    currentPassage: null | Passage
    currentChoice: null | Choice
}

const state: State = {
    currentModule: null,
    currentPassage: null,
    currentChoice: null
}

function init() {
    initLoadUi()
    initPlayUi()
}

function initLoadUi() {
    const fileDropBox = util.byId("fileDropBox") as HTMLDivElement
    const fileInput = util.byId("fileInput") as HTMLInputElement
    const fileButton = util.byId("fileButton") as HTMLButtonElement
    const urlInput = util.byId("urlInput") as HTMLInputElement
    const loadButton = util.byId("urlButton") as HTMLButtonElement

    fileButton.addEventListener("click", () => {
        fileInput.click()
    })

    fileDropBox.addEventListener("dragenter", onDragEnterOver)
    fileDropBox.addEventListener("dragover", onDragEnterOver)
    fileDropBox.addEventListener("drop", onFileDrop)

    fileInput.addEventListener("change", () => {
        if (!fileInput.files) {
            return
        }

        processFiles(fileInput.files)
    })

    loadButton.addEventListener("click", () => {
        clearErrorMessages()

        const url = urlInput.value
        if (!url) {
            appendErrorMessage("A valid url is required")
            return
        }

        loadFromUrl(url)
    })

    // for now - debug current game
    loadFromUrl("ana.cyoa.json")
}

function initPlayUi() {
    const choices = util.byId("choices")
    const tryAgain = util.byId("tryAgain")
    const nextPassage  = util.byId("nextPassage")

    util.delegate(choices, "click", ".choice", (ev) => {
        if (!state.currentModule) {
            return
        }

        if (!state.currentPassage) {
            return
        }

        const choiceIdx = util.getElementIndex(ev.target as Element)
        const choice = state.currentPassage.choices[choiceIdx]
        handleChoice(state.currentModule, choice)
    })

    tryAgain.addEventListener("click", () => {
        if (!state.currentModule) {
            return
        }

        loadModule(state.currentModule)
    })

    nextPassage.addEventListener("click", () => {
        const passageId = state?.currentChoice?.passageId
        if (!passageId) {
            return
        }

        const passage = state.currentModule?.passages[passageId]
        if (!passage) {
            return
        }

        loadPassage(passage)
    })
}

function loadFromString(json: string) {
    const module = util.tryf(() => <Module>(JSON.parse(json)))
    if (module instanceof Error) {
        appendErrorMessage(module.message)
        return
    }

    if (!validateModule(module)) {
        return
    }

    // module is valid - proceed
    loadModule(module)
}

function onDragEnterOver(ev: DragEvent) {
    ev.stopPropagation()
    ev.preventDefault()
}

function onFileDrop(ev: DragEvent) {
    ev.stopPropagation()
    ev.preventDefault()

    if (ev.dataTransfer == null) {
        return
    }

    processFiles(ev.dataTransfer.files)
}

async function loadFromUrl(url: string) {
    const response = await util.tryf(() => fetch(url))
    if (response instanceof Error) {
        appendErrorMessage(response.message)
        return
    }

    if (response.status != 200) {
        appendErrorMessage(`Could not load ${url}, unsuccessful response: ${response.status} - ${response.statusText}.`)
        return
    }

    const json = await response.text()
    loadFromString(json)
}

async function processFiles(files: FileList) {
    if (files.length == 0) {
        return
    }

    const file = files[0]
    const json = await file.text()
    loadFromString(json)
}

function loadModule(module: Module) {
    state.currentModule = module
    const loadUi = util.byId("loadUi");
    const playUi = util.byId("playUi");
    loadUi.hidden = true;
    playUi.hidden = false;

    // load module title
    const moduleTitle = util.byId("moduleTitle")
    moduleTitle.textContent = module.title

    // load initial passage
    const intro = module.passages["intro"]
    loadPassage(intro)
}

function loadPassage(passage: Passage) {
    const passageTitle = util.byId("passageTitle")
    const passageBody = util.byId("passageBody")
    const choicesDiv = util.byId("choices")
    util.removeAllChildren(choicesDiv)

    passageTitle.textContent = passage.title
    passageBody.textContent = passage.body

    const template = util.byId("choiceTemplate") as HTMLTemplateElement
    for (const choice of passage.choices) {
        const fragment = template.content.cloneNode(true) as DocumentFragment
        const choiceDiv = util.bySelector(fragment, ".choice") as HTMLElement
        choiceDiv.textContent = choice.body
        choicesDiv.appendChild(fragment)
    }

    const tryAgain = util.byId("tryAgain")
    const end = util.byId("end")
    const nextPassage = util.byId("nextPassage")

    nextPassage.hidden = true
    if (passage.choices.length == 0) {
        end.hidden = false
        tryAgain.hidden = false
    } else {
        end.hidden = true
        tryAgain.hidden = true
    }

    state.currentPassage = passage
}

function loadTransition(choice: Choice) {
    const passageTitle = util.byId("passageTitle")
    const passageBody = util.byId("passageBody")
    const choicesDiv = util.byId("choices")
    util.removeAllChildren(choicesDiv)

    passageTitle.textContent = ""
    passageBody.textContent = choice.transition

    const tryAgain = util.byId("tryAgain")
    const end = util.byId("end")
    const nextPassage = util.byId("nextPassage")

    if (choice.passageId) {
        nextPassage.hidden = false
        end.hidden = true
        tryAgain.hidden = true
    } else {
        end.hidden = false
        tryAgain.hidden = false
        nextPassage.hidden = true
    }

    state.currentChoice = choice
}

function clearErrorMessages() {
    const errorsDiv = util.byId("errors")
    util.removeAllChildren(errorsDiv)
}

function validateModule(module: Module): boolean {
    clearErrorMessages()

    if (!module) {
        appendErrorMessage("No module was found - .json file should contain a top level module object.")
        return false
    }

    if (!module.title) {
        appendErrorMessage("Module title is required.")
        return false
    }

    if (!module.description) {
        appendErrorMessage("Module description is required.")
        return false
    }

    if (!module.passages) {
        appendErrorMessage("Module must contain at least one passage.")
        return false
    }

    const passages = Object.values(module.passages)
    let valid = true
    for (const passage of passages) {
        const passageValid = validatePassage(module, passage)
        valid = valid && passageValid
    }

    return valid
}

function validatePassage(module: Module, passage: Passage): boolean {
    let valid = true
    if (!passage.body) {
        appendErrorMessage("Each passage must have a body.")
        valid = false
    }

    passage.choices = passage.choices ?? []
    for (const choice of passage.choices) {
        const choiceValid = validateChoice(module, choice)
        valid = valid && choiceValid
    }

    return valid
}

function validateChoice(module: Module, choice: Choice): boolean {
    let valid = true
    if (!choice.body) {
        appendErrorMessage("Each choice must have a body.")
        valid = false
    }

    if (!choice.passageId && !choice.transition) {
        appendErrorMessage("Each choice must have either a passageId or a transition.")
        valid = false
    }

    if (choice.passageId && !(choice.passageId in module.passages)) {
        appendErrorMessage(`Could not find passage with id of ${choice.passageId}`)
        valid = false
    }

    return valid
}

function appendErrorMessage(error: string) {
    console.log(error)
    const errorsDiv = util.byId("errors");
    const div = document.createElement("div");
    div.classList.add("error-message")
    div.textContent = error
    errorsDiv.appendChild(div)
}

function handleChoice(module: Module, choice: Choice) {
    if (choice.transition) {
        loadTransition(choice)
        return
    }

    const passageId = choice.passageId
    if (!passageId) {
        throw Error(`No transition or passageId for choice: ${choice.body}`)
    }

    const passage = module.passages[passageId]
    if (!passage) {
        throw Error(`Missing passage for choice: ${choice.body} with id ${passageId}`)
    }

    loadPassage(passage)
}