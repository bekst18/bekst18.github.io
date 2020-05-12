import * as dom from "../shared/dom.js";
import * as util from "../shared/util.js";
init();
const state = {
    currentModule: null,
    currentPassage: null,
    currentChoice: null
};
function init() {
    initLoadUi();
    initPlayUi();
}
function initLoadUi() {
    const fileDropBox = dom.byId("fileDropBox");
    const fileInput = dom.byId("fileInput");
    const fileButton = dom.byId("fileButton");
    const urlInput = dom.byId("urlInput");
    const loadButton = dom.byId("urlButton");
    fileButton.addEventListener("click", () => {
        fileInput.click();
    });
    fileDropBox.addEventListener("dragenter", onDragEnterOver);
    fileDropBox.addEventListener("dragover", onDragEnterOver);
    fileDropBox.addEventListener("drop", onFileDrop);
    fileInput.addEventListener("change", () => {
        if (!fileInput.files) {
            return;
        }
        processFiles(fileInput.files);
    });
    loadButton.addEventListener("click", () => {
        clearErrorMessages();
        const url = urlInput.value;
        if (!url) {
            appendErrorMessage("A valid url is required");
            return;
        }
        loadFromUrl(url);
    });
    // for now - debug current game
    loadFromUrl("ana.cyoa.json");
}
function initPlayUi() {
    const choices = dom.byId("choices");
    const tryAgain = dom.byId("tryAgain");
    const nextPassage = dom.byId("nextPassage");
    dom.delegate(choices, "click", ".choice", (ev) => {
        if (!state.currentModule) {
            return;
        }
        if (!state.currentPassage) {
            return;
        }
        const choiceIdx = dom.getElementIndex(ev.target);
        const choice = state.currentPassage.choices[choiceIdx];
        handleChoice(state.currentModule, choice);
    });
    tryAgain.addEventListener("click", () => {
        if (!state.currentModule) {
            return;
        }
        loadModule(state.currentModule);
    });
    nextPassage.addEventListener("click", () => {
        var _a, _b;
        const passageId = (_a = state === null || state === void 0 ? void 0 : state.currentChoice) === null || _a === void 0 ? void 0 : _a.passageId;
        if (!passageId) {
            return;
        }
        const passage = (_b = state.currentModule) === null || _b === void 0 ? void 0 : _b.passages[passageId];
        if (!passage) {
            return;
        }
        loadPassage(passage);
    });
}
function loadFromString(json) {
    const module = util.tryf(() => (JSON.parse(json)));
    if (module instanceof Error) {
        appendErrorMessage(module.message);
        return;
    }
    if (!validateModule(module)) {
        return;
    }
    // module is valid - proceed
    loadModule(module);
}
function onDragEnterOver(ev) {
    ev.stopPropagation();
    ev.preventDefault();
}
function onFileDrop(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    if (ev.dataTransfer == null) {
        return;
    }
    processFiles(ev.dataTransfer.files);
}
async function loadFromUrl(url) {
    const response = await util.tryf(() => fetch(url));
    if (response instanceof Error) {
        appendErrorMessage(response.message);
        return;
    }
    if (response.status != 200) {
        appendErrorMessage(`Could not load ${url}, unsuccessful response: ${response.status} - ${response.statusText}.`);
        return;
    }
    const json = await response.text();
    loadFromString(json);
}
async function processFiles(files) {
    if (files.length == 0) {
        return;
    }
    const file = files[0];
    const json = await file.text();
    loadFromString(json);
}
function loadModule(module) {
    state.currentModule = module;
    const loadUi = dom.byId("loadUi");
    const playUi = dom.byId("playUi");
    loadUi.hidden = true;
    playUi.hidden = false;
    // load module title
    const moduleTitle = dom.byId("moduleTitle");
    moduleTitle.textContent = module.title;
    // load initial passage
    const intro = module.passages["intro"];
    loadPassage(intro);
}
function loadPassage(passage) {
    const passageTitle = dom.byId("passageTitle");
    const passageBody = dom.byId("passageBody");
    const choicesDiv = dom.byId("choices");
    dom.removeAllChildren(choicesDiv);
    passageTitle.textContent = passage.title;
    passageBody.textContent = passage.body;
    const template = dom.byId("choiceTemplate");
    for (const choice of passage.choices) {
        const fragment = template.content.cloneNode(true);
        const choiceDiv = dom.bySelector(fragment, ".choice");
        choiceDiv.textContent = choice.body;
        choicesDiv.appendChild(fragment);
    }
    const tryAgain = dom.byId("tryAgain");
    const end = dom.byId("end");
    const nextPassage = dom.byId("nextPassage");
    nextPassage.hidden = true;
    if (passage.choices.length == 0) {
        end.hidden = false;
        tryAgain.hidden = false;
    }
    else {
        end.hidden = true;
        tryAgain.hidden = true;
    }
    state.currentPassage = passage;
}
function loadTransition(choice) {
    const passageTitle = dom.byId("passageTitle");
    const passageBody = dom.byId("passageBody");
    const choicesDiv = dom.byId("choices");
    dom.removeAllChildren(choicesDiv);
    passageTitle.textContent = "";
    passageBody.textContent = choice.transition;
    const tryAgain = dom.byId("tryAgain");
    const end = dom.byId("end");
    const nextPassage = dom.byId("nextPassage");
    if (choice.passageId) {
        nextPassage.hidden = false;
        end.hidden = true;
        tryAgain.hidden = true;
    }
    else {
        end.hidden = false;
        tryAgain.hidden = false;
        nextPassage.hidden = true;
    }
    state.currentChoice = choice;
}
function clearErrorMessages() {
    const errorsDiv = dom.byId("errors");
    dom.removeAllChildren(errorsDiv);
}
function validateModule(module) {
    clearErrorMessages();
    if (!module) {
        appendErrorMessage("No module was found - .json file should contain a top level module object.");
        return false;
    }
    if (!module.title) {
        appendErrorMessage("Module title is required.");
        return false;
    }
    if (!module.description) {
        appendErrorMessage("Module description is required.");
        return false;
    }
    if (!module.passages) {
        appendErrorMessage("Module must contain at least one passage.");
        return false;
    }
    const passages = Object.values(module.passages);
    let valid = true;
    for (const passage of passages) {
        const passageValid = validatePassage(module, passage);
        valid = valid && passageValid;
    }
    return valid;
}
function validatePassage(module, passage) {
    var _a;
    let valid = true;
    if (!passage.body) {
        appendErrorMessage("Each passage must have a body.");
        valid = false;
    }
    passage.choices = (_a = passage.choices) !== null && _a !== void 0 ? _a : [];
    for (const choice of passage.choices) {
        const choiceValid = validateChoice(module, choice);
        valid = valid && choiceValid;
    }
    return valid;
}
function validateChoice(module, choice) {
    let valid = true;
    if (!choice.body) {
        appendErrorMessage("Each choice must have a body.");
        valid = false;
    }
    if (!choice.passageId && !choice.transition) {
        appendErrorMessage("Each choice must have either a passageId or a transition.");
        valid = false;
    }
    if (choice.passageId && !(choice.passageId in module.passages)) {
        appendErrorMessage(`Could not find passage with id of ${choice.passageId}`);
        valid = false;
    }
    return valid;
}
function appendErrorMessage(error) {
    console.log(error);
    const errorsDiv = dom.byId("errors");
    const div = document.createElement("div");
    div.classList.add("error-message");
    div.textContent = error;
    errorsDiv.appendChild(div);
}
function handleChoice(module, choice) {
    if (choice.transition) {
        loadTransition(choice);
        return;
    }
    const passageId = choice.passageId;
    if (!passageId) {
        throw Error(`No transition or passageId for choice: ${choice.body}`);
    }
    const passage = module.passages[passageId];
    if (!passage) {
        throw Error(`Missing passage for choice: ${choice.body} with id ${passageId}`);
    }
    loadPassage(passage);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3lvYS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImN5b2EudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQTtBQUN2QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFBO0FBRXpDLElBQUksRUFBRSxDQUFBO0FBMEJOLE1BQU0sS0FBSyxHQUFVO0lBQ2pCLGFBQWEsRUFBRSxJQUFJO0lBQ25CLGNBQWMsRUFBRSxJQUFJO0lBQ3BCLGFBQWEsRUFBRSxJQUFJO0NBQ3RCLENBQUE7QUFFRCxTQUFTLElBQUk7SUFDVCxVQUFVLEVBQUUsQ0FBQTtJQUNaLFVBQVUsRUFBRSxDQUFBO0FBQ2hCLENBQUM7QUFFRCxTQUFTLFVBQVU7SUFDZixNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBbUIsQ0FBQTtJQUM3RCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBcUIsQ0FBQTtJQUMzRCxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBc0IsQ0FBQTtJQUM5RCxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBcUIsQ0FBQTtJQUN6RCxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBc0IsQ0FBQTtJQUU3RCxVQUFVLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUN0QyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDckIsQ0FBQyxDQUFDLENBQUE7SUFFRixXQUFXLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxDQUFBO0lBQzFELFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUE7SUFDekQsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMs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LENBQUMsR0FBRyxDQUFDLENBQUE7QUFDOUIsQ0FBQztBQUVELFNBQVMsWUFBWSxDQUFDLE1BQWMsRUFBRSxNQUFjO0lBQ2hELElBQUksTUFBTSxDQUFDLFVBQVUsRUFBRTtRQUNuQixjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEIsT0FBTTtLQUNUO0lBRUQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQTtJQUNsQyxJQUFJLENBQUMsU0FBUyxFQUFFO1FBQ1osTUFBTSxLQUFLLENBQUMsMENBQTBDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO0tBQ3ZFO0lBRUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUMxQyxJQUFJLENBQUMsT0FBTyxFQUFFO1FBQ1YsTUFBTSxLQUFLLENBQUMsK0JBQStCLE1BQU0sQ0FBQyxJQUFJLFlBQVksU0FBUyxFQUFFLENBQUMsQ0FBQTtLQUNqRjtJQUVELFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUN4QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tIFwiLi4vc2hhcmVkL3V0aWwuanNcIlxyXG5cclxuaW5pdCgpXHJcblxyXG5pbnRlcmZhY2UgTW9kdWxlIHtcclxuICAgIHRpdGxlOiBzdHJpbmdcclxuICAgIGRlc2NyaXB0aW9uOiBzdHJpbmdcclxuICAgIHBhc3NhZ2VzOiBSZWNvcmQ8c3RyaW5nLCBQYXNzYWdlPlxyXG59XHJcblxyXG5pbnRlcmZhY2UgUGFzc2FnZSB7XHJcbiAgICB0aXRsZTogc3RyaW5nXHJcbiAgICBib2R5OiBzdHJpbmdcclxuICAgIGNob2ljZXM6IENob2ljZVtdXHJcbn1cclxuXHJcbmludGVyZmFjZSBDaG9pY2Uge1xyXG4gICAgYm9keTogc3RyaW5nXHJcbiAgICB0cmFuc2l0aW9uOiBzdHJpbmdcclxuICAgIHBhc3NhZ2VJZDogc3RyaW5nXHJcbn1cclxuXHJcbmludGVyZmFjZSBTdGF0ZSB7XHJcbiAgICBjdXJyZW50TW9kdWxlOiBudWxsIHwgTW9kdWxlXHJcbiAgICBjdXJyZW50UGFzc2FnZTogbnVsbCB8IFBhc3NhZ2VcclxuICAgIGN1cnJlbnRDaG9pY2U6IG51bGwgfCBDaG9pY2VcclxufVxyXG5cclxuY29uc3Qgc3RhdGU6IFN0YXRlID0ge1xyXG4gICAgY3VycmVudE1vZHVsZTogbnVsbCxcclxuICAgIGN1cnJlbnRQYXNzYWdlOiBudWxsLFxyXG4gICAgY3VycmVudENob2ljZTogbnVsbFxyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0KCkge1xyXG4gICAgaW5pdExvYWRVaSgpXHJcbiAgICBpbml0UGxheVVpKClcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdExvYWRVaSgpIHtcclxuICAgIGNvbnN0IGZpbGVEcm9wQm94ID0gZG9tLmJ5SWQoXCJmaWxlRHJvcEJveFwiKSBhcyBIVE1MRGl2RWxlbWVudFxyXG4gICAgY29uc3QgZmlsZUlucHV0ID0gZG9tLmJ5SWQoXCJmaWxlSW5wdXRcIikgYXMgSFRNTElucHV0RWxlbWVudFxyXG4gICAgY29uc3QgZmlsZUJ1dHRvbiA9IGRvbS5ieUlkKFwiZmlsZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG4gICAgY29uc3QgdXJsSW5wdXQgPSBkb20uYnlJZChcInVybElucHV0XCIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcclxuICAgIGNvbnN0IGxvYWRCdXR0b24gPSBkb20uYnlJZChcInVybEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudFxyXG5cclxuICAgIGZpbGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICBmaWxlSW5wdXQuY2xpY2soKVxyXG4gICAgfSlcclxuXHJcbiAgICBmaWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2VudGVyXCIsIG9uRHJhZ0VudGVyT3ZlcilcclxuICAgIGZpbGVEcm9wQm94LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnb3ZlclwiLCBvbkRyYWdFbnRlck92ZXIpXHJcbiAgICBmaWxlRHJvcEJveC5hZGRFdmVudExpc3RlbmVyKFwiZHJvcFwiLCBvbkZpbGVEcm9wKVxyXG5cclxuICAgIGZpbGVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHtcclxuICAgICAgICBpZiAoIWZpbGVJbnB1dC5maWxlcykge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb2Nlc3NGaWxlcyhmaWxlSW5wdXQuZmlsZXMpXHJcbiAgICB9KVxyXG5cclxuICAgIGxvYWRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICBjbGVhckVycm9yTWVzc2FnZXMoKVxyXG5cclxuICAgICAgICBjb25zdCB1cmwgPSB1cmxJbnB1dC52YWx1ZVxyXG4gICAgICAgIGlmICghdXJsKSB7XHJcbiAgICAgICAgICAgIGFwcGVuZEVycm9yTWVzc2FnZShcIkEgdmFsaWQgdXJsIGlzIHJlcXVpcmVkXCIpXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZEZyb21VcmwodXJsKVxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBmb3Igbm93IC0gZGVidWcgY3VycmVudCBnYW1lXHJcbiAgICBsb2FkRnJvbVVybChcImFuYS5jeW9hLmpzb25cIilcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdFBsYXlVaSgpIHtcclxuICAgIGNvbnN0IGNob2ljZXMgPSBkb20uYnlJZChcImNob2ljZXNcIilcclxuICAgIGNvbnN0IHRyeUFnYWluID0gZG9tLmJ5SWQoXCJ0cnlBZ2FpblwiKVxyXG4gICAgY29uc3QgbmV4dFBhc3NhZ2UgID0gZG9tLmJ5SWQoXCJuZXh0UGFzc2FnZVwiKVxyXG5cclxuICAgIGRvbS5kZWxlZ2F0ZShjaG9pY2VzLCBcImNsaWNrXCIsIFwiLmNob2ljZVwiLCAoZXYpID0+IHtcclxuICAgICAgICBpZiAoIXN0YXRlLmN1cnJlbnRNb2R1bGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXN0YXRlLmN1cnJlbnRQYXNzYWdlKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY2hvaWNlSWR4ID0gZG9tLmdldEVsZW1lbnRJbmRleChldi50YXJnZXQgYXMgRWxlbWVudClcclxuICAgICAgICBjb25zdCBjaG9pY2UgPSBzdGF0ZS5jdXJyZW50UGFzc2FnZS5jaG9pY2VzW2Nob2ljZUlkeF1cclxuICAgICAgICBoYW5kbGVDaG9pY2Uoc3RhdGUuY3VycmVudE1vZHVsZSwgY2hvaWNlKVxyXG4gICAgfSlcclxuXHJcbiAgICB0cnlBZ2Fpbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgIGlmICghc3RhdGUuY3VycmVudE1vZHVsZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxvYWRNb2R1bGUoc3RhdGUuY3VycmVudE1vZHVsZSlcclxuICAgIH0pXHJcblxyXG4gICAgbmV4dFBhc3NhZ2UuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICBjb25zdCBwYXNzYWdlSWQgPSBzdGF0ZT8uY3VycmVudENob2ljZT8ucGFzc2FnZUlkXHJcbiAgICAgICAgaWYgKCFwYXNzYWdlSWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBwYXNzYWdlID0gc3RhdGUuY3VycmVudE1vZHVsZT8ucGFzc2FnZXNbcGFzc2FnZUlkXVxyXG4gICAgICAgIGlmICghcGFzc2FnZSkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxvYWRQYXNzYWdlKHBhc3NhZ2UpXHJcbiAgICB9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkRnJvbVN0cmluZyhqc29uOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IG1vZHVsZSA9IHV0aWwudHJ5ZigoKSA9PiA8TW9kdWxlPihKU09OLnBhcnNlKGpzb24pKSlcclxuICAgIGlmIChtb2R1bGUgaW5zdGFuY2VvZiBFcnJvcikge1xyXG4gICAgICAgIGFwcGVuZEVycm9yTWVzc2FnZShtb2R1bGUubWVzc2FnZSlcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXZhbGlkYXRlTW9kdWxlKG1vZHVsZSkpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICAvLyBtb2R1bGUgaXMgdmFsaWQgLSBwcm9jZWVkXHJcbiAgICBsb2FkTW9kdWxlKG1vZHVsZSlcclxufVxyXG5cclxuZnVuY3Rpb24gb25EcmFnRW50ZXJPdmVyKGV2OiBEcmFnRXZlbnQpIHtcclxuICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICBldi5wcmV2ZW50RGVmYXVsdCgpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9uRmlsZURyb3AoZXY6IERyYWdFdmVudCkge1xyXG4gICAgZXYuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxuXHJcbiAgICBpZiAoZXYuZGF0YVRyYW5zZmVyID09IG51bGwpIHtcclxuICAgICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzRmlsZXMoZXYuZGF0YVRyYW5zZmVyLmZpbGVzKVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBsb2FkRnJvbVVybCh1cmw6IHN0cmluZykge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB1dGlsLnRyeWYoKCkgPT4gZmV0Y2godXJsKSlcclxuICAgIGlmIChyZXNwb25zZSBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgICAgYXBwZW5kRXJyb3JNZXNzYWdlKHJlc3BvbnNlLm1lc3NhZ2UpXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyAhPSAyMDApIHtcclxuICAgICAgICBhcHBlbmRFcnJvck1lc3NhZ2UoYENvdWxkIG5vdCBsb2FkICR7dXJsfSwgdW5zdWNjZXNzZnVsIHJlc3BvbnNlOiAke3Jlc3BvbnNlLnN0YXR1c30gLSAke3Jlc3BvbnNlLnN0YXR1c1RleHR9LmApXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QganNvbiA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKVxyXG4gICAgbG9hZEZyb21TdHJpbmcoanNvbilcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0ZpbGVzKGZpbGVzOiBGaWxlTGlzdCkge1xyXG4gICAgaWYgKGZpbGVzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZmlsZSA9IGZpbGVzWzBdXHJcbiAgICBjb25zdCBqc29uID0gYXdhaXQgZmlsZS50ZXh0KClcclxuICAgIGxvYWRGcm9tU3RyaW5nKGpzb24pXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRNb2R1bGUobW9kdWxlOiBNb2R1bGUpIHtcclxuICAgIHN0YXRlLmN1cnJlbnRNb2R1bGUgPSBtb2R1bGVcclxuICAgIGNvbnN0IGxvYWRVaSA9IGRvbS5ieUlkKFwibG9hZFVpXCIpO1xyXG4gICAgY29uc3QgcGxheVVpID0gZG9tLmJ5SWQoXCJwbGF5VWlcIik7XHJcbiAgICBsb2FkVWkuaGlkZGVuID0gdHJ1ZTtcclxuICAgIHBsYXlVaS5oaWRkZW4gPSBmYWxzZTtcclxuXHJcbiAgICAvLyBsb2FkIG1vZHVsZSB0aXRsZVxyXG4gICAgY29uc3QgbW9kdWxlVGl0bGUgPSBkb20uYnlJZChcIm1vZHVsZVRpdGxlXCIpXHJcbiAgICBtb2R1bGVUaXRsZS50ZXh0Q29udGVudCA9IG1vZHVsZS50aXRsZVxyXG5cclxuICAgIC8vIGxvYWQgaW5pdGlhbCBwYXNzYWdlXHJcbiAgICBjb25zdCBpbnRybyA9IG1vZHVsZS5wYXNzYWdlc1tcImludHJvXCJdXHJcbiAgICBsb2FkUGFzc2FnZShpbnRybylcclxufVxyXG5cclxuZnVuY3Rpb24gbG9hZFBhc3NhZ2UocGFzc2FnZTogUGFzc2FnZSkge1xyXG4gICAgY29uc3QgcGFzc2FnZVRpdGxlID0gZG9tLmJ5SWQoXCJwYXNzYWdlVGl0bGVcIilcclxuICAgIGNvbnN0IHBhc3NhZ2VCb2R5ID0gZG9tLmJ5SWQoXCJwYXNzYWdlQm9keVwiKVxyXG4gICAgY29uc3QgY2hvaWNlc0RpdiA9IGRvbS5ieUlkKFwiY2hvaWNlc1wiKVxyXG4gICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKGNob2ljZXNEaXYpXHJcblxyXG4gICAgcGFzc2FnZVRpdGxlLnRleHRDb250ZW50ID0gcGFzc2FnZS50aXRsZVxyXG4gICAgcGFzc2FnZUJvZHkudGV4dENvbnRlbnQgPSBwYXNzYWdlLmJvZHlcclxuXHJcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IGRvbS5ieUlkKFwiY2hvaWNlVGVtcGxhdGVcIikgYXMgSFRNTFRlbXBsYXRlRWxlbWVudFxyXG4gICAgZm9yIChjb25zdCBjaG9pY2Ugb2YgcGFzc2FnZS5jaG9pY2VzKSB7XHJcbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0ZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50XHJcbiAgICAgICAgY29uc3QgY2hvaWNlRGl2ID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLmNob2ljZVwiKSBhcyBIVE1MRWxlbWVudFxyXG4gICAgICAgIGNob2ljZURpdi50ZXh0Q29udGVudCA9IGNob2ljZS5ib2R5XHJcbiAgICAgICAgY2hvaWNlc0Rpdi5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0cnlBZ2FpbiA9IGRvbS5ieUlkKFwidHJ5QWdhaW5cIilcclxuICAgIGNvbnN0IGVuZCA9IGRvbS5ieUlkKFwiZW5kXCIpXHJcbiAgICBjb25zdCBuZXh0UGFzc2FnZSA9IGRvbS5ieUlkKFwibmV4dFBhc3NhZ2VcIilcclxuXHJcbiAgICBuZXh0UGFzc2FnZS5oaWRkZW4gPSB0cnVlXHJcbiAgICBpZiAocGFzc2FnZS5jaG9pY2VzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgZW5kLmhpZGRlbiA9IGZhbHNlXHJcbiAgICAgICAgdHJ5QWdhaW4uaGlkZGVuID0gZmFsc2VcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZW5kLmhpZGRlbiA9IHRydWVcclxuICAgICAgICB0cnlBZ2Fpbi5oaWRkZW4gPSB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGUuY3VycmVudFBhc3NhZ2UgPSBwYXNzYWdlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRUcmFuc2l0aW9uKGNob2ljZTogQ2hvaWNlKSB7XHJcbiAgICBjb25zdCBwYXNzYWdlVGl0bGUgPSBkb20uYnlJZChcInBhc3NhZ2VUaXRsZVwiKVxyXG4gICAgY29uc3QgcGFzc2FnZUJvZHkgPSBkb20uYnlJZChcInBhc3NhZ2VCb2R5XCIpXHJcbiAgICBjb25zdCBjaG9pY2VzRGl2ID0gZG9tLmJ5SWQoXCJjaG9pY2VzXCIpXHJcbiAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4oY2hvaWNlc0RpdilcclxuXHJcbiAgICBwYXNzYWdlVGl0bGUudGV4dENvbnRlbnQgPSBcIlwiXHJcbiAgICBwYXNzYWdlQm9keS50ZXh0Q29udGVudCA9IGNob2ljZS50cmFuc2l0aW9uXHJcblxyXG4gICAgY29uc3QgdHJ5QWdhaW4gPSBkb20uYnlJZChcInRyeUFnYWluXCIpXHJcbiAgICBjb25zdCBlbmQgPSBkb20uYnlJZChcImVuZFwiKVxyXG4gICAgY29uc3QgbmV4dFBhc3NhZ2UgPSBkb20uYnlJZChcIm5leHRQYXNzYWdlXCIpXHJcblxyXG4gICAgaWYgKGNob2ljZS5wYXNzYWdlSWQpIHtcclxuICAgICAgICBuZXh0UGFzc2FnZS5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIGVuZC5oaWRkZW4gPSB0cnVlXHJcbiAgICAgICAgdHJ5QWdhaW4uaGlkZGVuID0gdHJ1ZVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBlbmQuaGlkZGVuID0gZmFsc2VcclxuICAgICAgICB0cnlBZ2Fpbi5oaWRkZW4gPSBmYWxzZVxyXG4gICAgICAgIG5leHRQYXNzYWdlLmhpZGRlbiA9IHRydWVcclxuICAgIH1cclxuXHJcbiAgICBzdGF0ZS5jdXJyZW50Q2hvaWNlID0gY2hvaWNlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFyRXJyb3JNZXNzYWdlcygpIHtcclxuICAgIGNvbnN0IGVycm9yc0RpdiA9IGRvbS5ieUlkKFwiZXJyb3JzXCIpXHJcbiAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4oZXJyb3JzRGl2KVxyXG59XHJcblxyXG5mdW5jdGlvbiB2YWxpZGF0ZU1vZHVsZShtb2R1bGU6IE1vZHVsZSk6IGJvb2xlYW4ge1xyXG4gICAgY2xlYXJFcnJvck1lc3NhZ2VzKClcclxuXHJcbiAgICBpZiAoIW1vZHVsZSkge1xyXG4gICAgICAgIGFwcGVuZEVycm9yTWVzc2FnZShcIk5vIG1vZHVsZSB3YXMgZm91bmQgLSAuanNvbiBmaWxlIHNob3VsZCBjb250YWluIGEgdG9wIGxldmVsIG1vZHVsZSBvYmplY3QuXCIpXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFtb2R1bGUudGl0bGUpIHtcclxuICAgICAgICBhcHBlbmRFcnJvck1lc3NhZ2UoXCJNb2R1bGUgdGl0bGUgaXMgcmVxdWlyZWQuXCIpXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFtb2R1bGUuZGVzY3JpcHRpb24pIHtcclxuICAgICAgICBhcHBlbmRFcnJvck1lc3NhZ2UoXCJNb2R1bGUgZGVzY3JpcHRpb24gaXMgcmVxdWlyZWQuXCIpXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFtb2R1bGUucGFzc2FnZXMpIHtcclxuICAgICAgICBhcHBlbmRFcnJvck1lc3NhZ2UoXCJNb2R1bGUgbXVzdCBjb250YWluIGF0IGxlYXN0IG9uZSBwYXNzYWdlLlwiKVxyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHBhc3NhZ2VzID0gT2JqZWN0LnZhbHVlcyhtb2R1bGUucGFzc2FnZXMpXHJcbiAgICBsZXQgdmFsaWQgPSB0cnVlXHJcbiAgICBmb3IgKGNvbnN0IHBhc3NhZ2Ugb2YgcGFzc2FnZXMpIHtcclxuICAgICAgICBjb25zdCBwYXNzYWdlVmFsaWQgPSB2YWxpZGF0ZVBhc3NhZ2UobW9kdWxlLCBwYXNzYWdlKVxyXG4gICAgICAgIHZhbGlkID0gdmFsaWQgJiYgcGFzc2FnZVZhbGlkXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZhbGlkXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHZhbGlkYXRlUGFzc2FnZShtb2R1bGU6IE1vZHVsZSwgcGFzc2FnZTogUGFzc2FnZSk6IGJvb2xlYW4ge1xyXG4gICAgbGV0IHZhbGlkID0gdHJ1ZVxyXG4gICAgaWYgKCFwYXNzYWdlLmJvZHkpIHtcclxuICAgICAgICBhcHBlbmRFcnJvck1lc3NhZ2UoXCJFYWNoIHBhc3NhZ2UgbXVzdCBoYXZlIGEgYm9keS5cIilcclxuICAgICAgICB2YWxpZCA9IGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcGFzc2FnZS5jaG9pY2VzID0gcGFzc2FnZS5jaG9pY2VzID8/IFtdXHJcbiAgICBmb3IgKGNvbnN0IGNob2ljZSBvZiBwYXNzYWdlLmNob2ljZXMpIHtcclxuICAgICAgICBjb25zdCBjaG9pY2VWYWxpZCA9IHZhbGlkYXRlQ2hvaWNlKG1vZHVsZSwgY2hvaWNlKVxyXG4gICAgICAgIHZhbGlkID0gdmFsaWQgJiYgY2hvaWNlVmFsaWRcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmFsaWRcclxufVxyXG5cclxuZnVuY3Rpb24gdmFsaWRhdGVDaG9pY2UobW9kdWxlOiBNb2R1bGUsIGNob2ljZTogQ2hvaWNlKTogYm9vbGVhbiB7XHJcbiAgICBsZXQgdmFsaWQgPSB0cnVlXHJcbiAgICBpZiAoIWNob2ljZS5ib2R5KSB7XHJcbiAgICAgICAgYXBwZW5kRXJyb3JNZXNzYWdlKFwiRWFjaCBjaG9pY2UgbXVzdCBoYXZlIGEgYm9keS5cIilcclxuICAgICAgICB2YWxpZCA9IGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFjaG9pY2UucGFzc2FnZUlkICYmICFjaG9pY2UudHJhbnNpdGlvbikge1xyXG4gICAgICAgIGFwcGVuZEVycm9yTWVzc2FnZShcIkVhY2ggY2hvaWNlIG11c3QgaGF2ZSBlaXRoZXIgYSBwYXNzYWdlSWQgb3IgYSB0cmFuc2l0aW9uLlwiKVxyXG4gICAgICAgIHZhbGlkID0gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBpZiAoY2hvaWNlLnBhc3NhZ2VJZCAmJiAhKGNob2ljZS5wYXNzYWdlSWQgaW4gbW9kdWxlLnBhc3NhZ2VzKSkge1xyXG4gICAgICAgIGFwcGVuZEVycm9yTWVzc2FnZShgQ291bGQgbm90IGZpbmQgcGFzc2FnZSB3aXRoIGlkIG9mICR7Y2hvaWNlLnBhc3NhZ2VJZH1gKVxyXG4gICAgICAgIHZhbGlkID0gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmFsaWRcclxufVxyXG5cclxuZnVuY3Rpb24gYXBwZW5kRXJyb3JNZXNzYWdlKGVycm9yOiBzdHJpbmcpIHtcclxuICAgIGNvbnNvbGUubG9nKGVycm9yKVxyXG4gICAgY29uc3QgZXJyb3JzRGl2ID0gZG9tLmJ5SWQoXCJlcnJvcnNcIik7XHJcbiAgICBjb25zdCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgZGl2LmNsYXNzTGlzdC5hZGQoXCJlcnJvci1tZXNzYWdlXCIpXHJcbiAgICBkaXYudGV4dENvbnRlbnQgPSBlcnJvclxyXG4gICAgZXJyb3JzRGl2LmFwcGVuZENoaWxkKGRpdilcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlQ2hvaWNlKG1vZHVsZTogTW9kdWxlLCBjaG9pY2U6IENob2ljZSkge1xyXG4gICAgaWYgKGNob2ljZS50cmFuc2l0aW9uKSB7XHJcbiAgICAgICAgbG9hZFRyYW5zaXRpb24oY2hvaWNlKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHBhc3NhZ2VJZCA9IGNob2ljZS5wYXNzYWdlSWRcclxuICAgIGlmICghcGFzc2FnZUlkKSB7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoYE5vIHRyYW5zaXRpb24gb3IgcGFzc2FnZUlkIGZvciBjaG9pY2U6ICR7Y2hvaWNlLmJvZHl9YClcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBwYXNzYWdlID0gbW9kdWxlLnBhc3NhZ2VzW3Bhc3NhZ2VJZF1cclxuICAgIGlmICghcGFzc2FnZSkge1xyXG4gICAgICAgIHRocm93IEVycm9yKGBNaXNzaW5nIHBhc3NhZ2UgZm9yIGNob2ljZTogJHtjaG9pY2UuYm9keX0gd2l0aCBpZCAke3Bhc3NhZ2VJZH1gKVxyXG4gICAgfVxyXG5cclxuICAgIGxvYWRQYXNzYWdlKHBhc3NhZ2UpXHJcbn0iXX0=