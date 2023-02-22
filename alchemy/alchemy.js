document.addEventListener("DOMContentLoaded", init);

function init() {
    const addImg = document.getElementById("addImage");
    const questionSrc = addImg.src;
    const fileUpload = document.getElementById("fileUpload");
    const elementList = document.getElementById("elementList");
    const recipeList = document.getElementById("recipeList");
    const discoveredElementsList = document.getElementById("discoveredElements");
    const elementNameInput = document.getElementById("elementName");
    const newElementForm = document.getElementById("newElementForm");
    const newRecipeForm = document.getElementById("newRecipeForm");
    const newRecipeElem1Img = document.getElementById("newRecipeElem1Img");
    const newRecipeElem2Img = document.getElementById("newRecipeElem2Img");
    const newRecipeResultImg = document.getElementById("newRecipeResultImg");
    const newRecipeElem1Name = document.getElementById("newRecipeElem1Name");
    const newRecipeElem2Name = document.getElementById("newRecipeElem2Name");
    const newRecipeResultName = document.getElementById("newRecipeResultName");
    const startElementList = document.getElementById("startElements");
    const elementTemplate = document.getElementById("elementTemplate");
    const recipeTemplate = document.getElementById("recipeTemplate");
    const playButton = document.getElementById("playButton");
    const createButton = document.getElementById("createButton");
    const canvas = document.querySelector("canvas");
    const createUi = document.getElementById("createUi");
    const playUi = document.getElementById("playUi");
    const workbenchDiv = document.getElementById("workbench");
    const trashDiv = document.getElementById("trash");
    const ctx = canvas.getContext("2d");
    const elements = new Map();
    const recipes = new Map();
    const startElements = new Set();
    const discoveredElements = new Set();
    const clearAllButton = document.getElementById("clearAll");
    let workbenchDragElem = null;

    fileUpload.addEventListener("change", fileInputChange);
    newElementForm.addEventListener("submit", newElementFormSubmit);
    newRecipeForm.addEventListener("submit", newRecipeFormSubmit);
    elementList.addEventListener("dragstart", elementDragStart);
    startElementList.addEventListener("dragstart", startElementDragStart);
    recipeList.addEventListener("dragstart", recipeDragStart);
    discoveredElementsList.addEventListener("dragstart", discoveredElementDragStart);
    playButton.addEventListener("click", playClick);
    createButton.addEventListener("click", createClick);
    trashDiv.addEventListener("dragover", trashDragOver);
    trashDiv.addEventListener("drop", trashDrop);
    clearAllButton.addEventListener("click", clearAll);

    for (const elem of document.querySelectorAll(".element-drag-container")) {
        elem.addEventListener("dragover", elementDragOver);
        elem.addEventListener("drop", elementDrop);
    }

    startElementList.addEventListener("dragover", startElementsDragOver);
    startElementList.addEventListener("drop", startElementsDrop);
    workbenchDiv.addEventListener("dragstart", workbenchDragStart);
    workbenchDiv.addEventListener("dragover", workbenchDragOver);
    workbenchDiv.addEventListener("drop", workbenchDrop);

    loadState();

    function fileInputChange() {
        if (fileUpload.files.length == 0) {
            return;
        }

        const file = fileUpload.files[0];
        const url = URL.createObjectURL(file);
        addImg.src = url;
    }

    function newElementFormSubmit(e) {
        e.preventDefault();

        const name = elementNameInput.value;
        const imageUrl = imgToDataUrl(addImg);
        elements.set(name, {
            name,
            imageUrl,
        });

        updateElementList();
        addImg.src = questionSrc;
        newElementForm.reset();

        saveState();
    }

    function recipeId(elem1Name, elem2Name) {
        return elem1Name + "_" + elem2Name;
    }

    function newRecipeFormSubmit(e) {
        e.preventDefault();

        const elem1 = newRecipeElem1Name.textContent;
        const elem2 = newRecipeElem2Name.textContent;
        const result = newRecipeResultName.textContent;
        const id = recipeId(elem1, elem2);
        recipes.set(id, { id, elem1, elem2, result });
        newRecipeElem1Img.src = "";
        newRecipeElem1Name.textContent = "?";
        newRecipeElem2Img.src = "";
        newRecipeElem2Name.textContent = "?";
        newRecipeResultImg.src = "";
        newRecipeResultName.textContent = "?";
        newRecipeForm.reset();

        updateRecipeList();
        saveState();
    }

    function updateElementList() {
        const a = [...elements.values()];
        a.sort((a, b) => a.name > b.name ? 1 : 2);

        removeAllChildren(elementList);
        const template = elementTemplate.content;
        for (const elem of a) {
            const div = template.cloneNode(true).querySelector("div.element");
            div.dataset.name = elem.name;
            const img = div.querySelector(".element-img");
            const nameSpan = div.querySelector(".element-name");
            img.src = elem.imageUrl;
            nameSpan.textContent = elem.name;
            elementList.appendChild(div);
        }
    }

    function updateRecipeList() {
        removeAllChildren(recipeList);
        const template = recipeTemplate.content;
        const a = [...recipes.values()];
        a.sort((a, b) => a.elem1 > b.elem1 || a.elem1 == b.elem1 && a.elem2 > b.elem2 ? 1 : -1);

        for (const recipe of a) {
            const div = template.cloneNode(true).querySelector(".recipe");
            div.dataset.id = recipe.id;
            const img1 = div.querySelector(".element1 .element-img");
            const name1 = div.querySelector(".element1 .element-name");
            const img2 = div.querySelector(".element2 .element-img");
            const name2 = div.querySelector(".element2 .element-name");
            const img3 = div.querySelector(".result .element-img");
            const name3 = div.querySelector(".result .element-name");
            const elem1 = elements.get(recipe.elem1);
            const elem2 = elements.get(recipe.elem2);
            const result = elements.get(recipe.result);
            img1.src = elem1.imageUrl;
            name1.textContent = elem1.name;
            img2.src = elem2.imageUrl;
            name2.textContent = elem2.name;
            img3.src = result.imageUrl;
            name3.textContent = result.name;
            recipeList.appendChild(div);
        }
    }

    function updateStartElementList() {
        // remove any duplicates
        const a = [...startElements];
        a.sort();

        removeAllChildren(startElementList);
        const template = elementTemplate.content;
        for (const name of a) {
            const div = template.cloneNode(true).querySelector(".element");
            const img = div.querySelector(".element-img");
            const nameSpan = div.querySelector(".element-name");
            const elem = elements.get(name);
            div.dataset.name = elem.name;
            img.src = elem.imageUrl;
            nameSpan.textContent = elem.name;
            startElementList.appendChild(div);
        }
    }

    function updateDiscoveredElementList() {
        removeAllChildren(discoveredElementsList);
        const template = elementTemplate.content;
        const a = [...discoveredElements];
        a.sort((a, b) => a.name > b.name ? 1 : -1);

        for (const name of a) {
            const elem = elements.get(name);
            if (!elem) {
                continue;
            }

            const div = template.cloneNode(true).querySelector(".element");
            div.dataset.name = elem.name;
            const img = div.querySelector(".element-img");
            const nameSpan = div.querySelector(".element-name");
            img.src = elem.imageUrl;
            nameSpan.textContent = elem.name;
            discoveredElementsList.appendChild(div);
        }
    }

    function removeAllChildren(elem) {
        while (elem.firstChild) {
            elem.removeChild(elem.firstChild)
        }
    }

    function elementDragStart(e) {
        const elem = e.target.closest(".element");
        const name = elem.querySelector(".element-name").textContent;
        e.dataTransfer.effectAllowed = "copyMove";
        const data = { type: "element", name };
        e.dataTransfer.setData("application/json", JSON.stringify(data));
    }

    function startElementDragStart(e) {
        const elem = e.target.closest(".element");
        const name = elem.querySelector(".element-name").textContent;
        e.dataTransfer.effectAllowed = "copyMove";
        const data = { type: "startElement", name };
        e.dataTransfer.setData("application/json", JSON.stringify(data));
    }

    function elementDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy"
    }

    function elementDrop(e) {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        const elem = elements.get(data.name);
        const elemImg = e.target.closest(".element-drag-container");
        const elemDiv = elemImg.closest(".element");
        const elemName = elemDiv.querySelector(".element-name");
        elemImg.src = elem.imageUrl;
        elemName.textContent = elem.name;
    }

    function recipeDragStart(e) {
        const elem = e.target.closest(".recipe");
        const id = elem.dataset.id;
        e.dataTransfer.effectAllowed = "copyMove";
        const data = { type: "recipe", id };
        e.dataTransfer.setData("application/json", JSON.stringify(data));
    }

    function startElementsDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy"
    }

    function startElementsDrop(e) {
        e.preventDefault();

        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        startElements.add(data.name);
        updateStartElementList();
        saveState();
    }

    function discoveredElementDragStart(e) {
        const elem = e.target.closest(".element");
        const name = elem.querySelector(".element-name").textContent;
        e.dataTransfer.effectAllowed = "copy";
        const data = { type: "element", name };
        e.dataTransfer.setData("application/json", JSON.stringify(data));
    }

    function workbenchDragStart(e) {
        const elem = e.target.closest(".element");
        const name = elem.dataset.name;
        e.dataTransfer.effectAllowed = "move";
        const data = { type: "workbenchElement", name, elem };
        e.dataTransfer.setData("application/json", JSON.stringify(data));
        workbenchDragElem = elem;
    }

    function workbenchDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copyMove";
    }

    function workbenchDrop(e) {
        e.preventDefault();

        if (workbenchDragElem) {
            workbenchDragElem.remove();
        }

        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        const elem = elements.get(data.name);
        const template = elementTemplate.content;
        const div = template.cloneNode(true).querySelector("div.element");
        const bounds = workbenchDiv.getBoundingClientRect();
        div.dataset.name = elem.name;
        div.style.position = "absolute";
        div.style.left = (e.clientX - bounds.left - 27) + "px";
        div.style.top = (e.clientY - bounds.top + 2) + "px";
        const img = div.querySelector(".element-img");
        const nameSpan = div.querySelector(".element-name");
        img.src = elem.imageUrl;
        nameSpan.textContent = elem.name;

        workbenchDiv.appendChild(div);

        // check for overlap
        const elemBounds = div.getBoundingClientRect();
        for (const child of workbenchDiv.children) {
            if (child === div) {
                continue;
            }

            const childBounds = child.getBoundingClientRect();
            if (elemBounds.right < childBounds.left || elemBounds.left > childBounds.right) {
                continue;
            }

            if (elemBounds.bottom < childBounds.top || elemBounds.top > childBounds.bottom) {
                continue;
            }

            // overlap! search recipes for match
            const elem1 = elem;
            const elem2 = elements.get(child.dataset.name);
            const recipe = [...recipes.values()].find(x => x.elem1 === elem1.name && x.elem2 === elem2.name || x.elem2 === elem1.name && x.elem1 === elem2.name);
            if (!recipe) {
                continue;
            }

            div.remove();
            child.remove();

            if (!discoveredElements.has(recipe.result)) {
                discoveredElements.add(recipe.result);
                updateDiscoveredElementList();
                saveState();
            }
        }
    }

    function trashDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }

    function trashDrop(e) {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData("application/json"));

        switch (data.type) {
            case "element":
                tryDeleteElement(data.name);
                break;

            case "recipe":
                recipes.delete(data.id);
                updateRecipeList();
                break;

            case "startElement":
                startElements.delete(data.name);
                updateStartElementList();
                break;
        }
    }

    function tryDeleteElement(name) {
        // also delete any recipes that use this element
        const keys = new Set();
        for (const [k, v] of recipes) {
            if (v.elem1 === name || v.elem2 === name || v.result === name) {
                keys.add(k);
            }
        }

        for (const k of keys) {
            recipes.delete(k);
        }

        // if a starting element, delete it
        startElements.delete(name);
        elements.delete(name);

        updateStartElementList();
        updateRecipeList();
        updateElementList();

        saveState();
    }

    function saveState() {
        const state = JSON.stringify({
            elements: [...elements.values()],
            recipes: [...recipes.values()],
            startElements: [...startElements],
            discoveredElements: [...discoveredElements]
        });

        localStorage.setItem("state", state);
    }

    function loadState() {
        const state = localStorage.getItem("state");
        if (!state) {
            return;
        }

        const stateObj = JSON.parse(state);
        stateObj.elements = stateObj.elements || [];
        stateObj.recipes = stateObj.recipes || [];
        stateObj.startElements = stateObj.startElements || [];
        stateObj.discoveredElements = stateObj.discoveredElements || [];

        for (const element of stateObj.elements) {
            elements.set(element.name, element);
        }

        for (const recipe of stateObj.recipes) {
            recipes.set(recipe.id, recipe);
        }

        for (const name of stateObj.startElements) {
            startElements.add(name);
        }

        for (const name of stateObj.discoveredElements) {
            discoveredElements.add(name);
        }

        updateElementList();
        updateRecipeList();
        updateStartElementList();
        updateDiscoveredElementList();
    }

    function clearState() {
        const state = localStorage.clear();
    }

    function imgToDataUrl(img) {
        ctx.drawImage(img, 0, 0, 50, 50);
        return canvas.toDataURL();
    }

    function playClick() {
        playUi.hidden = false;
        playUi.style.display = "flex";
        createUi.hidden = true;
        createUi.style.display = "none";

        // remove any elements that no longer exist
        const discovered = [...discoveredElements];
        for (elem of discovered) {
            if (!elements.has(elem)) {
                discoveredElements.remove(elem);
            }
        }

        // for now, clear all elements on play    
        discoveredElements.clear();
        for (const startElement of startElements) {
            discoveredElements.add(startElement);
        }

        // // DEBUG
        // for (const element of elements.values()) {
        //     discoveredElements.add(element.name);
        // }

        updateDiscoveredElementList();
    }

    function createClick() {
        playUi.hidden = false;
        playUi.style.display = "none";
        createUi.hidden = true;
        createUi.style.display = "flex";
    }

    function clearAll() {
        if (!confirm("Are you sure you want to delete all elements and recipes?")) {
            return;
        }

        // clear the storage, and all state
        localStorage.removeItem("state");
        startElements.clear();
        discoveredElements.clear();
        recipes.clear();
        elements.clear();
        updateElementList();
        updateRecipeList();
        updateStartElementList();
        updateDiscoveredElementList();
    }
}    