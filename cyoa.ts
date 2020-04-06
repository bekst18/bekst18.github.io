import * as util from "./util.js"

init()

interface Module {
    title: string
    desc: string
    passages: Passage[]
}

interface Passage {
    id: string
    title: string
    desc: string
    choices: Choice[]
}

interface Choice {
    desc: string
    passageId: string
}

interface State {
    currentModule: null | Module
}

const state: State = {
    currentModule: null
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
    loadFromUrl("cyoa.json")
}

function initPlayUi() {
    const choices = util.byId("choices")
    util.delegate(choices, "click", ".choice", (ev) => {
        if (!state.currentModule) {
            return
        }

        handleChoice(state.currentModule, ev.target as HTMLDivElement)
    })
}

function loadFromString(json: string) {
    const module = <Module>(JSON.parse(json))
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
    try {
        const response = await fetch(url)
        const json = await response.text()
        loadFromString(json)

    }
    catch (x) {
        if (x instanceof Error) {
            appendErrorMessage(x.message)
        } else {
            appendErrorMessage(x)
        }
    }
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
    const intro = module.passages[0]
    loadPassage(intro)
}

function loadPassage(passage: Passage) {
    console.log(passage)
    const passageTitle = util.byId("passageTitle")
    const passageDesc = util.byId("passageDesc")
    const choicesDiv = util.byId("choices")
    util.removeAllChildren(choicesDiv)

    passageTitle.textContent = passage.title
    passageDesc.textContent = passage.desc

    const template = util.byId("choiceTemplate") as HTMLTemplateElement
    for (const choice of passage.choices) {
        const fragment = template.content.cloneNode(true) as DocumentFragment
        const choiceDiv = util.bySelector(fragment, ".choice") as HTMLElement
        choiceDiv.dataset.passageId = choice.passageId
        choiceDiv.textContent = choice.desc
        choicesDiv.appendChild(fragment)
    }
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

    if (!module.desc) {
        appendErrorMessage("Module desc is required.")
        return false
    }

    if (!module.passages) {
        appendErrorMessage("Module must contain at least one passage.")
        return false
    }

    for (const passage of module.passages) {
        validatePassage(module, passage)
    }

    return true
}

function validatePassage(module: Module, passage: Passage) {
    passage.id = (passage.id ?? "").toUpperCase().trim()

    if (!passage.desc) {
        appendErrorMessage("Each passage must have a description.")
    }

    passage.choices = passage.choices ?? []
    for (const choice of passage.choices) {
        validateChoice(module, choice)
    }
}

function validateChoice(module: Module, choice: Choice) {
    if (!choice.desc) {
        appendErrorMessage("Each choice must have a description.")
    }

    if (!choice.passageId) {
        appendErrorMessage("Each choice must have a passageId.")
    } else if (!findPassageById(module, choice.passageId)) {
        appendErrorMessage(`Could not passage with id of ${choice.passageId}`)
    }
}

function findPassageById(module: Module, id: string): (Passage | undefined) {
    id = id.toUpperCase().trim()
    return module.passages.find(p => p.id.toUpperCase() == id)
}

function appendErrorMessage(error: string) {
    const errorsDiv = util.byId("errors");
    const div = document.createElement("div");
    div.classList.add("error-message")
    div.textContent = error
    errorsDiv.appendChild(div)
}

function handleChoice(module: Module, choice: HTMLDivElement) {
    const passageId = choice.dataset.passageId
    if (!passageId) {
        throw Error(`Missing passage for choice: ${choice.textContent}`)
    }

    const passage = findPassageById(module, passageId)
    if (!passage) {
        throw Error(`Missing passage for choice: ${choice.textContent} with id ${passageId}`)
    }

    loadPassage(passage)
}