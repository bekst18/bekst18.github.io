"use strict";
import * as dom from "../shared/dom.js";
import * as rand from "../shared/rand.js";
import * as array from "../shared/array.js";
const padding = 4;
class LetterGrid {
    constructor(rows, cols, letters) {
        this.rows = rows;
        this.cols = cols;
        if (letters && letters.length !== rows * cols) {
            throw new Error("Invalid letters array length.");
        }
        this.letters = letters !== null && letters !== void 0 ? letters : array.generate(rows * cols, _ => "");
    }
    getf(idx) {
        return this.letters[idx];
    }
    setf(idx, ch) {
        if (ch.length > 1) {
            throw new Error("Must be a single character or empty string");
        }
        return this.letters[idx] = ch;
    }
    flat(row, col) {
        return row * this.cols + col;
    }
    hier(idx) {
        const i = Math.floor(idx / this.cols);
        const j = idx % this.cols;
        return { i, j };
    }
    get(row, col) {
        return this.getf(this.flat(row, col));
    }
    set(row, col, ch) {
        this.setf(this.flat(row, col), ch);
    }
    toJSON() {
        const data = {
            rows: this.rows,
            cols: this.cols,
            letters: this.letters,
        };
        return data;
    }
}
var Activity;
(function (Activity) {
    Activity[Activity["Settings"] = 0] = "Settings";
    Activity[Activity["Results"] = 1] = "Results";
})(Activity || (Activity = {}));
function main() {
    const wordInput = dom.byId("word");
    const settingsWordList = dom.byId("settingsWordList");
    const addWordButton = dom.byId("addWord");
    const generateButton = dom.byId("generateButton");
    const returnToSettingsButton = dom.byId("returnToSettings");
    const resetButton = dom.byId("resetButton");
    const horizontalCheckbox = dom.byId("horizontal");
    const verticalCheckbox = dom.byId("vertical");
    const diagonalCheckbox = dom.byId("diagonal");
    const reverseCheckbox = dom.byId("reverse");
    const settingsDiv = dom.byId("settings");
    const resultsDiv = dom.byId("results");
    const successDiv = dom.byId("success");
    const stateKey = "wordSearchState";
    const seed = rand.xmur3(new Date().toString());
    const rng = new rand.SFC32RNG(seed(), seed(), seed(), seed());
    const canvas = dom.byId("gridCanvas");
    const ctx = getContext2D(canvas);
    const resultsWordList = dom.byId("resultsWordList");
    let found = new Array();
    let words = new Set();
    let remainingWords = new Set();
    let grid = new LetterGrid(0, 0);
    let placements = new Array();
    let selectStartCoords = null;
    loadState();
    wordInput.addEventListener("keydown", (evt) => {
        if (evt.key !== "Enter") {
            return;
        }
        addSettingsWord();
    });
    addWordButton.addEventListener("click", _ => {
        if (!wordInput.value) {
            return;
        }
        addSettingsWord();
        wordInput.focus();
    });
    horizontalCheckbox.addEventListener("change", saveState);
    verticalCheckbox.addEventListener("change", saveState);
    diagonalCheckbox.addEventListener("change", saveState);
    reverseCheckbox.addEventListener("change", saveState);
    generateButton.addEventListener("click", _ => {
        const options = getWordSearchOptions();
        let wordSearch = generateWordSearch(rng, words, options);
        if (!wordSearch) {
            return;
        }
        remainingWords = new Set(words);
        successDiv.hidden = true;
        grid = wordSearch.grid;
        placements = wordSearch.placements;
        found.splice(0, found.length);
        settingsDiv.hidden = true;
        resultsDiv.hidden = false;
        saveState();
        paint(canvas, ctx, grid, found);
        refreshWordList(resultsWordList, words, remainingWords);
    });
    resetButton.addEventListener("click", _ => {
        words.clear();
        refreshWordList(settingsWordList, words, words);
        saveState();
    });
    returnToSettingsButton.addEventListener("click", _ => {
        settingsDiv.hidden = false;
        resultsDiv.hidden = true;
        saveState();
    });
    document.addEventListener("click", evt => {
        var _a;
        const target = evt.target;
        if (!target) {
            return;
        }
        if (!target.matches("#settingsWordList .word")) {
            return;
        }
        const word = (_a = target.textContent) !== null && _a !== void 0 ? _a : "";
        words.delete(word);
        refreshWordList(settingsWordList, words, words);
        saveState();
    });
    canvas.addEventListener("pointerdown", onCanvasPointerDown, false);
    canvas.addEventListener("pointerup", onCanvasPointerUp, false);
    canvas.addEventListener("pointermove", onCanvasPointerMove, false);
    canvas.addEventListener("pointerleave", onCanvasPointerLeave, false);
    function addSettingsWord() {
        if (!wordInput.value) {
            return;
        }
        const word = wordInput.value.trim().toUpperCase();
        words.add(word);
        refreshWordList(settingsWordList, words, words);
        wordInput.value = "";
        saveState();
    }
    function getWordSearchOptions() {
        const horizontal = horizontalCheckbox.checked;
        const vertical = verticalCheckbox.checked;
        const diagonal = diagonalCheckbox.checked;
        const reverse = reverseCheckbox.checked;
        return {
            horizontal,
            vertical,
            diagonal,
            reverse,
        };
    }
    function onCanvasPointerDown(ev) {
        const xy = { x: ev.offsetX, y: ev.offsetY };
        selectStartCoords = canvasToGridCoords(ctx, xy);
    }
    function onCanvasPointerUp(ev) {
        var _a;
        if (!selectStartCoords) {
            return;
        }
        // check for word selection
        const xy = { x: ev.offsetX, y: ev.offsetY };
        const start = selectStartCoords;
        const end = canvasToGridCoords(ctx, xy);
        const idx = placements.findIndex(x => (coordsEqual(x.start, start) && coordsEqual(x.end, end))
            || (coordsEqual(x.start, end) && coordsEqual(x.end, start)));
        if (idx === -1) {
            dragEnd();
            return;
        }
        const selection = { start, end };
        const word = extractSelection(grid, selection);
        placements.splice(idx, 1);
        const wordDiv = findWordElem(resultsWordList, word);
        (_a = wordDiv === null || wordDiv === void 0 ? void 0 : wordDiv.classList) === null || _a === void 0 ? void 0 : _a.add("found");
        found.push(selection);
        remainingWords.delete(word);
        // check for completion
        if (remainingWords.size === 0) {
            // remove all unselected letters
            removeUnselectedLetters(grid, found);
            successDiv.hidden = false;
        }
        saveState();
        dragEnd();
    }
    function onCanvasPointerLeave() {
        dragEnd();
    }
    function onCanvasPointerMove(ev) {
        if (!selectStartCoords) {
            return;
        }
        const xy = { x: ev.offsetX, y: ev.offsetY };
        const coords = canvasToGridCoords(ctx, xy);
        paint(canvas, ctx, grid, found, { start: selectStartCoords, end: coords });
    }
    function dragEnd() {
        selectStartCoords = null;
        paint(canvas, ctx, grid, found, null);
    }
    function saveState() {
        const horizontal = horizontalCheckbox.checked;
        const vertical = verticalCheckbox.checked;
        const diagonal = diagonalCheckbox.checked;
        const reverse = reverseCheckbox.checked;
        const activity = settingsDiv.hidden ? Activity.Results : Activity.Settings;
        const state = {
            horizontal,
            vertical,
            diagonal,
            reverse,
            words: [...words],
            remainingWords: [...remainingWords],
            grid: grid.toJSON(),
            placements,
            found,
            activity,
        };
        localStorage.setItem(stateKey, JSON.stringify(state));
    }
    function loadState() {
        const json = localStorage.getItem(stateKey);
        if (!json) {
            console.log("No state found.");
            return;
        }
        const state = JSON.parse(json);
        console.log(state);
        dom.removeAllChildren(settingsWordList);
        horizontalCheckbox.checked = state.horizontal;
        verticalCheckbox.checked = state.vertical;
        diagonalCheckbox.checked = state.diagonal;
        reverseCheckbox.checked = state.reverse;
        words = new Set(state.words);
        remainingWords = new Set(state.remainingWords);
        refreshWordList(settingsWordList, words, words);
        refreshWordList(resultsWordList, words, remainingWords);
        successDiv.hidden = remainingWords.size !== 0;
        grid = new LetterGrid(state.grid.rows, state.grid.cols, state.grid.letters);
        placements = state.placements;
        found = state.found;
        if (state.activity === Activity.Settings) {
            settingsDiv.hidden = false;
            resultsDiv.hidden = true;
        }
        else {
            settingsDiv.hidden = true;
            resultsDiv.hidden = false;
        }
        paint(canvas, ctx, grid, found);
    }
}
function findWordElem(wordList, word) {
    word = word.trim().toUpperCase();
    const elems = Array.from(wordList.querySelectorAll(".word"));
    for (const elem of elems) {
        if (elem.textContent === word) {
            return elem;
        }
    }
    return null;
}
function generateWordSearch(rng, words, options) {
    var _a, _b, _c, _d;
    const horizontal = (_a = options.horizontal) !== null && _a !== void 0 ? _a : true;
    const vertical = (_b = options.vertical) !== null && _b !== void 0 ? _b : true;
    const diagonal = (_c = options.diagonal) !== null && _c !== void 0 ? _c : true;
    const reverse = (_d = options.reverse) !== null && _d !== void 0 ? _d : true;
    const errorMessage = dom.byId("errorMessage");
    errorMessage.textContent = "";
    if (words.size == 0) {
        errorMessage.textContent = "At least one word must be added to the word list.";
        return null;
    }
    // validation
    // must check at least one of the directional checkboxes
    if (!horizontal && !vertical && !diagonal && !reverse) {
        errorMessage.textContent = "Must choose at least one of horizontal, vertical, diagonal, or reverse.";
        return null;
    }
    // keep increasing grid size until words can be placed
    let size = 3;
    while (true) {
        const grid = new LetterGrid(size, size);
        const placements = placeWords(rng, grid, words, horizontal, vertical, diagonal, reverse);
        if (placements) {
            fillRandomCharacters(rng, grid, words);
            return {
                grid,
                placements
            };
        }
        ++size;
    }
}
function placeWords(rng, grid, words, horizontal, vertical, diagonal, reverse) {
    const dirs = getDirs(horizontal, vertical, diagonal, reverse);
    const placements = new Array();
    for (const word of words) {
        const placement = tryPlaceWord(rng, grid, dirs, word);
        if (!placement) {
            return null;
        }
        placements.push(placement);
    }
    return placements;
}
function getDirs(horizontal, vertical, diagonal, reverse) {
    const dirs = new Array();
    if (horizontal) {
        dirs.push({ i: 0, j: 1 });
    }
    if (vertical) {
        dirs.push({ i: 1, j: 0 });
    }
    if (diagonal) {
        dirs.push({ i: 1, j: 1 });
    }
    if (reverse && horizontal) {
        dirs.push({ i: 0, j: -1 });
    }
    if (reverse && vertical) {
        dirs.push({ i: -1, j: 0 });
    }
    if (reverse && diagonal) {
        dirs.push({ i: 1, j: -1 });
        dirs.push({ i: -1, j: 1 });
        dirs.push({ i: -1, j: -1 });
    }
    return dirs;
}
function tryPlaceWord(rng, grid, dirs, word) {
    const placement = tryFindWordPlacement(rng, grid, dirs, word);
    if (!placement) {
        return null;
    }
    placeWord(grid, word, placement);
    return placement;
}
function tryFindWordPlacement(rng, grid, directions, word) {
    const maxDim = Math.max(grid.rows, grid.cols);
    if (word.length > maxDim) {
        return null;
    }
    // try placing at every possible cell
    const gridCoords = new Array();
    for (let i = 0; i < grid.rows; ++i) {
        for (let j = 0; j < grid.cols; ++j) {
            gridCoords.push({ i, j });
        }
    }
    const dir = rand.choose(rng, directions);
    rand.shuffle(rng, gridCoords);
    for (const start of gridCoords) {
        if (isValidWordPlacement(grid, word, start, dir)) {
            const end = {
                i: start.i + dir.i * (word.length - 1),
                j: start.j + dir.j * (word.length - 1),
            };
            return {
                start,
                end,
            };
        }
    }
    return null;
}
function isValidWordPlacement(grid, word, start, dir) {
    if (start.i < 0 || start.j < 0) {
        return false;
    }
    if (start.i >= grid.rows || start.j >= grid.rows) {
        return false;
    }
    const { i: i0, j: j0 } = start;
    const letters = word.split("");
    const success = letters.every((ch, idx) => {
        const i = i0 + dir.i * idx;
        const j = j0 + dir.j * idx;
        if (i < 0 || i >= grid.rows) {
            return false;
        }
        if (j < 0 || j >= grid.cols) {
            return false;
        }
        if (grid.get(i, j) === ch) {
            return true;
        }
        if (!grid.get(i, j)) {
            return true;
        }
        return false;
    });
    // exception: full overlap (i.e. prefix overlapping longer word) should not be considered valid
    if (letters.every((ch, idx) => {
        const i = i0 + dir.i * idx;
        const j = j0 + dir.j * idx;
        return grid.get(i, j) === ch;
    })) {
        return false;
    }
    return success;
}
function placeWord(grid, word, placement) {
    const { start, end } = placement;
    const { i: i0, j: j0 } = start;
    const dir = getDir(start, end);
    if (!dir) {
        throw new Error(`Invalid placement dir ${start} - ${end}`);
    }
    const letters = word.split("");
    letters.forEach((ch, idx) => {
        const i = i0 + dir.i * idx;
        const j = j0 + dir.j * idx;
        grid.set(i, j, ch);
    });
}
function fillRandomCharacters(rng, grid, words) {
    // generate character list from words
    // get a flat list of all letters in all words
    const charsSet = new Set(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]);
    words.forEach(w => w.split("").forEach(ch => charsSet.add(ch)));
    const chars = [...charsSet];
    for (let i = 0; i < grid.rows; ++i) {
        for (let j = 0; j < grid.cols; ++j) {
            if (grid.get(i, j)) {
                continue;
            }
            const ch = rand.choose(rng, chars);
            grid.set(i, j, ch);
        }
    }
}
function paint(canvas, ctx, grid, found, selection = null) {
    const font = "24px monospace";
    ctx.font = font;
    const letterSize = ctx.measureText("M").width;
    const cellSize = letterSize + padding * 2;
    canvas.width = cellSize * grid.cols;
    canvas.height = cellSize * grid.rows;
    // canvas.style.width = `${canvas.width}px`;
    // canvas.style.height = `${canvas.height}px`;
    ctx.font = font;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    for (let i = 0; i < grid.rows; ++i) {
        const y = i * cellSize + padding + letterSize;
        for (let j = 0; j < grid.cols; ++j) {
            const x = j * cellSize + padding;
            ctx.fillText(grid.get(i, j), x, y);
        }
    }
    if (selection) {
        const xy0 = gridToCanvasCoords(ctx, selection.start);
        const xy1 = gridToCanvasCoords(ctx, selection.end);
        const x0 = xy0.x + cellSize / 2;
        const y0 = xy0.y + cellSize / 2;
        const x1 = xy1.x + cellSize / 2;
        const y1 = xy1.y + cellSize / 2;
        // do grid coords represent a straight line?
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    }
    for (const selection of found) {
        const xy0 = gridToCanvasCoords(ctx, selection.start);
        const xy1 = gridToCanvasCoords(ctx, selection.end);
        const x0 = xy0.x + cellSize / 2;
        const y0 = xy0.y + cellSize / 2;
        const x1 = xy1.x + cellSize / 2;
        const y1 = xy1.y + cellSize / 2;
        // do grid coords represent a straight line?
        ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    }
}
function canvasToGridCoords(ctx, xy) {
    const letterSize = ctx.measureText("M").width;
    const cellSize = letterSize + padding * 2;
    const { x, y } = xy;
    const i = Math.floor((y - padding) / cellSize);
    const j = Math.floor((x - padding) / cellSize);
    return { i, j };
}
function gridToCanvasCoords(ctx, ij) {
    const letterSize = ctx.measureText("M").width;
    const cellSize = letterSize + padding * 2;
    const { i, j } = ij;
    const x = j * cellSize;
    const y = i * cellSize;
    return { x, y };
}
function getContext2D(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("No canvas support");
    }
    return ctx;
}
function coordsEqual(a, b) {
    return a.i == b.i && a.j == b.j;
}
function getDir(ij0, ij1) {
    const di = ij1.i - ij0.i;
    const dj = ij1.j - ij0.j;
    if (di === 0 && dj === 0) {
        return null;
    }
    if (di !== 0 && dj !== 0 && Math.abs(di) !== Math.abs(dj)) {
        return null;
    }
    return { i: Math.sign(di), j: Math.sign(dj) };
}
function removeUnselectedLetters(grid, selections) {
    for (let i = 0; i < grid.rows; ++i) {
        for (let j = 0; j < grid.cols; ++j) {
            const coords = { i, j };
            if (selections.some(x => selectionContains(x, coords))) {
                continue;
            }
            grid.set(i, j, " ");
        }
    }
}
function selectionContains(selection, ij) {
    const dir = getDir(selection.start, selection.end);
    if (!dir) {
        return false;
    }
    const { start, end } = selection;
    let { i, j } = start;
    while (i >= 0 && j >= 0) {
        if (i == ij.i && j == ij.j) {
            return true;
        }
        if (i === end.i && j === end.j) {
            break;
        }
        i += dir.i;
        j += dir.j;
    }
    return false;
}
function extractSelection(grid, selection) {
    // check direction - if ij0 to ij1 is not horizontal, vertical, or diagonal, no match possible
    const { start, end } = selection;
    const dir = getDir(start, end);
    if (!dir) {
        throw new Error(`Invalid selection direction ${start} - ${end}`);
    }
    // extract selected word
    let { i, j } = selection.start;
    let s = "";
    while (i >= 0 && i < grid.rows && j >= 0 && j < grid.cols) {
        s += grid.get(i, j);
        if (i === end.i && j === end.j) {
            break;
        }
        i += dir.i;
        j += dir.j;
    }
    return s;
}
function refreshWordList(div, words, remainingWords) {
    const list = [...words];
    list.sort();
    dom.removeAllChildren(div);
    for (const word of list) {
        const wordDiv = document.createElement("div");
        wordDiv.classList.add("word");
        if (!remainingWords.has(word)) {
            wordDiv.classList.add("found");
        }
        const wordText = document.createTextNode(word);
        wordDiv.appendChild(wordText);
        div.appendChild(wordDiv);
    }
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZHNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndvcmRzZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDO0FBQ2IsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQztBQUN4QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUM7QUE2QjVDLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQztBQVFsQixNQUFNLFVBQVU7SUFHWixZQUFxQixJQUFZLEVBQVcsSUFBWSxFQUFFLE9BQWtCO1FBQXZELFNBQUksR0FBSixJQUFJLENBQVE7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ3BELElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssSUFBSSxHQUFHLElBQUksRUFBRTtZQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7U0FDcEQ7UUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sYUFBUCxPQUFPLGNBQVAsT0FBTyxHQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFFRCxJQUFJLENBQUMsR0FBVztRQUNaLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsSUFBSSxDQUFDLEdBQVcsRUFBRSxFQUFVO1FBQ3hCLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDZixNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7U0FDakU7UUFFRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFRCxJQUFJLENBQUMsR0FBVyxF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LENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUU5QixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMzQixPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNsQztRQUVELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0MsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM3QixHQUFHLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQzVCO0FBQ0wsQ0FBQztBQUVELElBQUksRUFBRSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XHJcbmltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiO1xyXG5pbXBvcnQgKiBhcyByYW5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiO1xyXG5pbXBvcnQgKiBhcyBhcnJheSBmcm9tIFwiLi4vc2hhcmVkL2FycmF5LmpzXCI7XHJcblxyXG5pbnRlcmZhY2UgV29yZFNlYXJjaE9wdGlvbnMge1xyXG4gICAgaG9yaXpvbnRhbD86IGJvb2xlYW4sXHJcbiAgICB2ZXJ0aWNhbD86IGJvb2xlYW4sXHJcbiAgICBkaWFnb25hbD86IGJvb2xlYW4sXHJcbiAgICByZXZlcnNlPzogYm9vbGVhbixcclxufVxyXG5cclxuLyoqXHJcbiAqIGEgcm93L2NvbHVtbiB3aXRoaW4gdGhlIGdyaWRcclxuICovXHJcbmludGVyZmFjZSBDb29yZHMge1xyXG4gICAgLyoqcm93IHdpdGhpbiBncmlkICovXHJcbiAgICBpOiBudW1iZXIsXHJcbiAgICAvKipjb2x1bW4gd2l0aGluIGdyaWQgKi9cclxuICAgIGo6IG51bWJlcixcclxufVxyXG5cclxuaW50ZXJmYWNlIFBvaW50IHtcclxuICAgIHg6IG51bWJlcixcclxuICAgIHk6IG51bWJlclxyXG59XHJcblxyXG5pbnRlcmZhY2UgQ29vcmRzUmFuZ2Uge1xyXG4gICAgc3RhcnQ6IENvb3Jkc1xyXG4gICAgZW5kOiBDb29yZHNcclxufVxyXG5cclxuY29uc3QgcGFkZGluZyA9IDQ7XHJcblxyXG5pbnRlcmZhY2UgTGV0dGVyR3JpZFN0YXRlIHtcclxuICAgIHJvd3M6IG51bWJlcixcclxuICAgIGNvbHM6IG51bWJlcixcclxuICAgIGxldHRlcnM6IHN0cmluZ1tdLFxyXG59XHJcblxyXG5jbGFzcyBMZXR0ZXJHcmlkIHtcclxuICAgIGxldHRlcnM6IHN0cmluZ1tdXHJcblxyXG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgcm93czogbnVtYmVyLCByZWFkb25seSBjb2xzOiBudW1iZXIsIGxldHRlcnM/OiBzdHJpbmdbXSkge1xyXG4gICAgICAgIGlmIChsZXR0ZXJzICYmIGxldHRlcnMubGVuZ3RoICE9PSByb3dzICogY29scykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGxldHRlcnMgYXJyYXkgbGVuZ3RoLlwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubGV0dGVycyA9IGxldHRlcnMgPz8gYXJyYXkuZ2VuZXJhdGUocm93cyAqIGNvbHMsIF8gPT4gXCJcIik7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0ZihpZHg6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubGV0dGVyc1tpZHhdO1xyXG4gICAgfVxyXG5cclxuICAgIHNldGYoaWR4OiBudW1iZXIsIGNoOiBzdHJpbmcpIHtcclxuICAgICAgICBpZiAoY2gubGVuZ3RoID4gMSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IGJlIGEgc2luZ2xlIGNoYXJhY3RlciBvciBlbXB0eSBzdHJpbmdcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5sZXR0ZXJzW2lkeF0gPSBjaDtcclxuICAgIH1cclxuXHJcbiAgICBmbGF0KHJvdzogbnVtYmVyLCBjb2w6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHJvdyAqIHRoaXMuY29scyArIGNvbDtcclxuICAgIH1cclxuXHJcbiAgICBoaWVyKGlkeDogbnVtYmVyKTogQ29vcmRzIHtcclxuICAgICAgICBjb25zdCBpID0gTWF0aC5mbG9vcihpZHggLyB0aGlzLmNvbHMpO1xyXG4gICAgICAgIGNvbnN0IGogPSBpZHggJSB0aGlzLmNvbHM7XHJcbiAgICAgICAgcmV0dXJuIHsgaSwgaiB9O1xyXG4gICAgfVxyXG5cclxuICAgIGdldChyb3c6IG51bWJlciwgY29sOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmdldGYodGhpcy5mbGF0KHJvdywgY29sKSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0KHJvdzogbnVtYmVyLCBjb2w6IG51bWJlciwgY2g6IHN0cmluZykge1xyXG4gICAgICAgIHRoaXMuc2V0Zih0aGlzLmZsYXQocm93LCBjb2wpLCBjaCk7XHJcbiAgICB9XHJcblxyXG4gICAgdG9KU09OKCk6IExldHRlckdyaWRTdGF0ZSB7XHJcbiAgICAgICAgY29uc3QgZGF0YTogTGV0dGVyR3JpZFN0YXRlID0ge1xyXG4gICAgICAgICAgICByb3dzOiB0aGlzLnJvd3MsXHJcbiAgICAgICAgICAgIGNvbHM6IHRoaXMuY29scyxcclxuICAgICAgICAgICAgbGV0dGVyczogdGhpcy5sZXR0ZXJzLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgV29yZFNlYXJjaCB7XHJcbiAgICBncmlkOiBMZXR0ZXJHcmlkXHJcbiAgICBwbGFjZW1lbnRzOiBDb29yZHNSYW5nZVtdXHJcbn1cclxuXHJcbmVudW0gQWN0aXZpdHkge1xyXG4gICAgU2V0dGluZ3MsXHJcbiAgICBSZXN1bHRzLFxyXG59XHJcblxyXG5pbnRlcmZhY2UgU3RhdGUge1xyXG4gICAgaG9yaXpvbnRhbDogYm9vbGVhblxyXG4gICAgdmVydGljYWw6IGJvb2xlYW5cclxuICAgIGRpYWdvbmFsOiBib29sZWFuXHJcbiAgICByZXZlcnNlOiBib29sZWFuXHJcbiAgICB3b3Jkczogc3RyaW5nW10sXHJcbiAgICByZW1haW5pbmdXb3Jkczogc3RyaW5nW10sXHJcbiAgICBncmlkOiBMZXR0ZXJHcmlkU3RhdGVcclxuICAgIHBsYWNlbWVudHM6IENvb3Jkc1JhbmdlW11cclxuICAgIGZvdW5kOiBDb29yZHNSYW5nZVtdXHJcbiAgICBhY3Rpdml0eTogQWN0aXZpdHlcclxufVxyXG5cclxuZnVuY3Rpb24gbWFpbigpIHtcclxuICAgIGNvbnN0IHdvcmRJbnB1dCA9IGRvbS5ieUlkKFwid29yZFwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IHNldHRpbmdzV29yZExpc3QgPSBkb20uYnlJZChcInNldHRpbmdzV29yZExpc3RcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbiAgICBjb25zdCBhZGRXb3JkQnV0dG9uID0gZG9tLmJ5SWQoXCJhZGRXb3JkXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50O1xyXG4gICAgY29uc3QgZ2VuZXJhdGVCdXR0b24gPSBkb20uYnlJZChcImdlbmVyYXRlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50O1xyXG4gICAgY29uc3QgcmV0dXJuVG9TZXR0aW5nc0J1dHRvbiA9IGRvbS5ieUlkKFwicmV0dXJuVG9TZXR0aW5nc1wiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IHJlc2V0QnV0dG9uID0gZG9tLmJ5SWQoXCJyZXNldEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IGhvcml6b250YWxDaGVja2JveCA9IGRvbS5ieUlkKFwiaG9yaXpvbnRhbFwiKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgY29uc3QgdmVydGljYWxDaGVja2JveCA9IGRvbS5ieUlkKFwidmVydGljYWxcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGRpYWdvbmFsQ2hlY2tib3ggPSBkb20uYnlJZChcImRpYWdvbmFsXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCByZXZlcnNlQ2hlY2tib3ggPSBkb20uYnlJZChcInJldmVyc2VcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IHNldHRpbmdzRGl2ID0gZG9tLmJ5SWQoXCJzZXR0aW5nc1wiKSBhcyBIVE1MRGl2RWxlbWVudDtcclxuICAgIGNvbnN0IHJlc3VsdHNEaXYgPSBkb20uYnlJZChcInJlc3VsdHNcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbiAgICBjb25zdCBzdWNjZXNzRGl2ID0gZG9tLmJ5SWQoXCJzdWNjZXNzXCIpIGFzIEhUTUxEaXZFbGVtZW50O1xyXG4gICAgY29uc3Qgc3RhdGVLZXkgPSBcIndvcmRTZWFyY2hTdGF0ZVwiO1xyXG4gICAgY29uc3Qgc2VlZCA9IHJhbmQueG11cjMobmV3IERhdGUoKS50b1N0cmluZygpKTtcclxuICAgIGNvbnN0IHJuZyA9IG5ldyByYW5kLlNGQzMyUk5HKHNlZWQoKSwgc2VlZCgpLCBzZWVkKCksIHNlZWQoKSk7XHJcbiAgICBjb25zdCBjYW52YXMgPSBkb20uYnlJZChcImdyaWRDYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XHJcbiAgICBjb25zdCBjdHggPSBnZXRDb250ZXh0MkQoY2FudmFzKTtcclxuICAgIGNvbnN0IHJlc3VsdHNXb3JkTGlzdCA9IGRvbS5ieUlkKFwicmVzdWx0c1dvcmRMaXN0XCIpIGFzIEhUTUxEaXZFbGVtZW50O1xyXG4gICAgbGV0IGZvdW5kID0gbmV3IEFycmF5PENvb3Jkc1JhbmdlPigpO1xyXG4gICAgbGV0IHdvcmRzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcbiAgICBsZXQgcmVtYWluaW5nV29yZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuICAgIGxldCBncmlkID0gbmV3IExldHRlckdyaWQoMCwgMCk7XHJcbiAgICBsZXQgcGxhY2VtZW50cyA9IG5ldyBBcnJheTxDb29yZHNSYW5nZT4oKTtcclxuICAgIGxldCBzZWxlY3RTdGFydENvb3JkczogQ29vcmRzIHwgbnVsbCA9IG51bGw7XHJcblxyXG4gICAgbG9hZFN0YXRlKCk7XHJcblxyXG4gICAgd29yZElucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChldnQpID0+IHtcclxuICAgICAgICBpZiAoZXZ0LmtleSAhPT0gXCJFbnRlclwiKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFkZFNldHRpbmdzV29yZCgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgYWRkV29yZEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgXyA9PiB7XHJcbiAgICAgICAgaWYgKCF3b3JkSW5wdXQudmFsdWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWRkU2V0dGluZ3NXb3JkKClcclxuICAgICAgICB3b3JkSW5wdXQuZm9jdXMoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGhvcml6b250YWxDaGVja2JveC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIHNhdmVTdGF0ZSk7XHJcbiAgICB2ZXJ0aWNhbENoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgc2F2ZVN0YXRlKTtcclxuICAgIGRpYWdvbmFsQ2hlY2tib3guYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBzYXZlU3RhdGUpO1xyXG4gICAgcmV2ZXJzZUNoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgc2F2ZVN0YXRlKTtcclxuXHJcbiAgICBnZW5lcmF0ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgXyA9PiB7XHJcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IGdldFdvcmRTZWFyY2hPcHRpb25zKCk7XHJcbiAgICAgICAgbGV0IHdvcmRTZWFyY2ggPSBnZW5lcmF0ZVdvcmRTZWFyY2gocm5nLCB3b3Jkcywgb3B0aW9ucyk7XHJcbiAgICAgICAgaWYgKCF3b3JkU2VhcmNoKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlbWFpbmluZ1dvcmRzID0gbmV3IFNldCh3b3Jkcyk7XHJcbiAgICAgICAgc3VjY2Vzc0Rpdi5oaWRkZW4gPSB0cnVlO1xyXG4gICAgICAgIGdyaWQgPSB3b3JkU2VhcmNoLmdyaWQ7XHJcbiAgICAgICAgcGxhY2VtZW50cyA9IHdvcmRTZWFyY2gucGxhY2VtZW50cztcclxuICAgICAgICBmb3VuZC5zcGxpY2UoMCwgZm91bmQubGVuZ3RoKTtcclxuXHJcbiAgICAgICAgc2V0dGluZ3NEaXYuaGlkZGVuID0gdHJ1ZTtcclxuICAgICAgICByZXN1bHRzRGl2LmhpZGRlbiA9IGZhbHNlO1xyXG4gICAgICAgIHNhdmVTdGF0ZSgpO1xyXG5cclxuICAgICAgICBwYWludChjYW52YXMsIGN0eCwgZ3JpZCwgZm91bmQpO1xyXG4gICAgICAgIHJlZnJlc2hXb3JkTGlzdChyZXN1bHRzV29yZExpc3QsIHdvcmRzLCByZW1haW5pbmdXb3Jkcyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgXyA9PiB7XHJcbiAgICAgICAgd29yZHMuY2xlYXIoKTtcclxuICAgICAgICByZWZyZXNoV29yZExpc3Qoc2V0dGluZ3NXb3JkTGlzdCwgd29yZHMsIHdvcmRzKTtcclxuICAgICAgICBzYXZlU3RhdGUoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVyblRvU2V0dGluZ3NCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIF8gPT4ge1xyXG4gICAgICAgIHNldHRpbmdzRGl2LmhpZGRlbiA9IGZhbHNlO1xyXG4gICAgICAgIHJlc3VsdHNEaXYuaGlkZGVuID0gdHJ1ZTtcclxuICAgICAgICBzYXZlU3RhdGUoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBldnQgPT4ge1xyXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGV2dC50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgaWYgKCF0YXJnZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0YXJnZXQubWF0Y2hlcyhcIiNzZXR0aW5nc1dvcmRMaXN0IC53b3JkXCIpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHdvcmQgPSB0YXJnZXQudGV4dENvbnRlbnQgPz8gXCJcIjtcclxuICAgICAgICB3b3Jkcy5kZWxldGUod29yZCk7XHJcbiAgICAgICAgcmVmcmVzaFdvcmRMaXN0KHNldHRpbmdzV29yZExpc3QsIHdvcmRzLCB3b3Jkcyk7XHJcbiAgICAgICAgc2F2ZVN0YXRlKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIG9uQ2FudmFzUG9pbnRlckRvd24sIGZhbHNlKTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcnVwXCIsIG9uQ2FudmFzUG9pbnRlclVwLCBmYWxzZSk7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJtb3ZlXCIsIG9uQ2FudmFzUG9pbnRlck1vdmUsIGZhbHNlKTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmxlYXZlXCIsIG9uQ2FudmFzUG9pbnRlckxlYXZlLCBmYWxzZSk7XHJcblxyXG4gICAgZnVuY3Rpb24gYWRkU2V0dGluZ3NXb3JkKCkge1xyXG4gICAgICAgIGlmICghd29yZElucHV0LnZhbHVlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHdvcmQgPSB3b3JkSW5wdXQudmFsdWUudHJpbSgpLnRvVXBwZXJDYXNlKCk7XHJcbiAgICAgICAgd29yZHMuYWRkKHdvcmQpO1xyXG4gICAgICAgIHJlZnJlc2hXb3JkTGlzdChzZXR0aW5nc1dvcmRMaXN0LCB3b3Jkcywgd29yZHMpO1xyXG4gICAgICAgIHdvcmRJbnB1dC52YWx1ZSA9IFwiXCI7XHJcbiAgICAgICAgc2F2ZVN0YXRlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0V29yZFNlYXJjaE9wdGlvbnMoKTogV29yZFNlYXJjaE9wdGlvbnMge1xyXG4gICAgICAgIGNvbnN0IGhvcml6b250YWwgPSBob3Jpem9udGFsQ2hlY2tib3guY2hlY2tlZDtcclxuICAgICAgICBjb25zdCB2ZXJ0aWNhbCA9IHZlcnRpY2FsQ2hlY2tib3guY2hlY2tlZDtcclxuICAgICAgICBjb25zdCBkaWFnb25hbCA9IGRpYWdvbmFsQ2hlY2tib3guY2hlY2tlZDtcclxuICAgICAgICBjb25zdCByZXZlcnNlID0gcmV2ZXJzZUNoZWNrYm94LmNoZWNrZWQ7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGhvcml6b250YWwsXHJcbiAgICAgICAgICAgIHZlcnRpY2FsLFxyXG4gICAgICAgICAgICBkaWFnb25hbCxcclxuICAgICAgICAgICAgcmV2ZXJzZSxcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25DYW52YXNQb2ludGVyRG93bihldjogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgeHkgPSB7IHg6IGV2Lm9mZnNldFgsIHk6IGV2Lm9mZnNldFkgfTtcclxuICAgICAgICBzZWxlY3RTdGFydENvb3JkcyA9IGNhbnZhc1RvR3JpZENvb3JkcyhjdHghLCB4eSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25DYW52YXNQb2ludGVyVXAoZXY6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGlmICghc2VsZWN0U3RhcnRDb29yZHMpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY2hlY2sgZm9yIHdvcmQgc2VsZWN0aW9uXHJcbiAgICAgICAgY29uc3QgeHkgPSB7IHg6IGV2Lm9mZnNldFgsIHk6IGV2Lm9mZnNldFkgfTtcclxuICAgICAgICBjb25zdCBzdGFydCA9IHNlbGVjdFN0YXJ0Q29vcmRzO1xyXG4gICAgICAgIGNvbnN0IGVuZCA9IGNhbnZhc1RvR3JpZENvb3JkcyhjdHghLCB4eSk7XHJcbiAgICAgICAgY29uc3QgaWR4ID0gcGxhY2VtZW50cy5maW5kSW5kZXgoeCA9PlxyXG4gICAgICAgICAgICAoY29vcmRzRXF1YWwoeC5zdGFydCwgc3RhcnQpICYmIGNvb3Jkc0VxdWFsKHguZW5kLCBlbmQpKVxyXG4gICAgICAgICAgICB8fCAoY29vcmRzRXF1YWwoeC5zdGFydCwgZW5kISkgJiYgY29vcmRzRXF1YWwoeC5lbmQsIHN0YXJ0KSkpO1xyXG5cclxuICAgICAgICBpZiAoaWR4ID09PSAtMSkge1xyXG4gICAgICAgICAgICBkcmFnRW5kKCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHNlbGVjdGlvbiA9IHsgc3RhcnQsIGVuZCB9O1xyXG4gICAgICAgIGNvbnN0IHdvcmQgPSBleHRyYWN0U2VsZWN0aW9uKGdyaWQsIHNlbGVjdGlvbilcclxuICAgICAgICBwbGFjZW1lbnRzLnNwbGljZShpZHgsIDEpO1xyXG5cclxuICAgICAgICBjb25zdCB3b3JkRGl2ID0gZmluZFdvcmRFbGVtKHJlc3VsdHNXb3JkTGlzdCwgd29yZCk7XHJcbiAgICAgICAgd29yZERpdj8uY2xhc3NMaXN0Py5hZGQoXCJmb3VuZFwiKTtcclxuICAgICAgICBmb3VuZC5wdXNoKHNlbGVjdGlvbik7XHJcbiAgICAgICAgcmVtYWluaW5nV29yZHMuZGVsZXRlKHdvcmQpO1xyXG5cclxuICAgICAgICAvLyBjaGVjayBmb3IgY29tcGxldGlvblxyXG4gICAgICAgIGlmIChyZW1haW5pbmdXb3Jkcy5zaXplID09PSAwKSB7XHJcbiAgICAgICAgICAgIC8vIHJlbW92ZSBhbGwgdW5zZWxlY3RlZCBsZXR0ZXJzXHJcbiAgICAgICAgICAgIHJlbW92ZVVuc2VsZWN0ZWRMZXR0ZXJzKGdyaWQsIGZvdW5kKTtcclxuICAgICAgICAgICAgc3VjY2Vzc0Rpdi5oaWRkZW4gPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNhdmVTdGF0ZSgpO1xyXG4gICAgICAgIGRyYWdFbmQoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvbkNhbnZhc1BvaW50ZXJMZWF2ZSgpIHtcclxuICAgICAgICBkcmFnRW5kKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25DYW52YXNQb2ludGVyTW92ZShldjogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCFzZWxlY3RTdGFydENvb3Jkcykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB4eSA9IHsgeDogZXYub2Zmc2V0WCwgeTogZXYub2Zmc2V0WSB9O1xyXG4gICAgICAgIGNvbnN0IGNvb3JkcyA9IGNhbnZhc1RvR3JpZENvb3JkcyhjdHghLCB4eSk7XHJcbiAgICAgICAgcGFpbnQoY2FudmFzLCBjdHghLCBncmlkLCBmb3VuZCwgeyBzdGFydDogc2VsZWN0U3RhcnRDb29yZHMhLCBlbmQ6IGNvb3JkcyB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmFnRW5kKCkge1xyXG4gICAgICAgIHNlbGVjdFN0YXJ0Q29vcmRzID0gbnVsbDtcclxuICAgICAgICBwYWludChjYW52YXMsIGN0eCEsIGdyaWQsIGZvdW5kLCBudWxsKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzYXZlU3RhdGUoKSB7XHJcbiAgICAgICAgY29uc3QgaG9yaXpvbnRhbCA9IGhvcml6b250YWxDaGVja2JveC5jaGVja2VkO1xyXG4gICAgICAgIGNvbnN0IHZlcnRpY2FsID0gdmVydGljYWxDaGVja2JveC5jaGVja2VkO1xyXG4gICAgICAgIGNvbnN0IGRpYWdvbmFsID0gZGlhZ29uYWxDaGVja2JveC5jaGVja2VkO1xyXG4gICAgICAgIGNvbnN0IHJldmVyc2UgPSByZXZlcnNlQ2hlY2tib3guY2hlY2tlZDtcclxuICAgICAgICBjb25zdCBhY3Rpdml0eSA9IHNldHRpbmdzRGl2LmhpZGRlbiA/IEFjdGl2aXR5LlJlc3VsdHMgOiBBY3Rpdml0eS5TZXR0aW5ncztcclxuXHJcbiAgICAgICAgY29uc3Qgc3RhdGU6IFN0YXRlID0ge1xyXG4gICAgICAgICAgICBob3Jpem9udGFsLFxyXG4gICAgICAgICAgICB2ZXJ0aWNhbCxcclxuICAgICAgICAgICAgZGlhZ29uYWwsXHJcbiAgICAgICAgICAgIHJldmVyc2UsXHJcbiAgICAgICAgICAgIHdvcmRzOiBbLi4ud29yZHNdLFxyXG4gICAgICAgICAgICByZW1haW5pbmdXb3JkczogWy4uLnJlbWFpbmluZ1dvcmRzXSxcclxuICAgICAgICAgICAgZ3JpZDogZ3JpZC50b0pTT04oKSxcclxuICAgICAgICAgICAgcGxhY2VtZW50cyxcclxuICAgICAgICAgICAgZm91bmQsXHJcbiAgICAgICAgICAgIGFjdGl2aXR5LFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKHN0YXRlS2V5LCBKU09OLnN0cmluZ2lmeShzdGF0ZSkpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGxvYWRTdGF0ZSgpIHtcclxuICAgICAgICBjb25zdCBqc29uID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oc3RhdGVLZXkpO1xyXG4gICAgICAgIGlmICghanNvbikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIk5vIHN0YXRlIGZvdW5kLlwiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc3RhdGU6IFN0YXRlID0gSlNPTi5wYXJzZShqc29uKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhzdGF0ZSk7XHJcblxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbihzZXR0aW5nc1dvcmRMaXN0KTtcclxuXHJcbiAgICAgICAgaG9yaXpvbnRhbENoZWNrYm94LmNoZWNrZWQgPSBzdGF0ZS5ob3Jpem9udGFsO1xyXG4gICAgICAgIHZlcnRpY2FsQ2hlY2tib3guY2hlY2tlZCA9IHN0YXRlLnZlcnRpY2FsO1xyXG4gICAgICAgIGRpYWdvbmFsQ2hlY2tib3guY2hlY2tlZCA9IHN0YXRlLmRpYWdvbmFsO1xyXG4gICAgICAgIHJldmVyc2VDaGVja2JveC5jaGVja2VkID0gc3RhdGUucmV2ZXJzZTtcclxuXHJcbiAgICAgICAgd29yZHMgPSBuZXcgU2V0KHN0YXRlLndvcmRzKTtcclxuICAgICAgICByZW1haW5pbmdXb3JkcyA9IG5ldyBTZXQoc3RhdGUucmVtYWluaW5nV29yZHMpO1xyXG4gICAgICAgIHJlZnJlc2hXb3JkTGlzdChzZXR0aW5nc1dvcmRMaXN0LCB3b3Jkcywgd29yZHMpO1xyXG4gICAgICAgIHJlZnJlc2hXb3JkTGlzdChyZXN1bHRzV29yZExpc3QsIHdvcmRzLCByZW1haW5pbmdXb3Jkcyk7XHJcblxyXG4gICAgICAgIHN1Y2Nlc3NEaXYuaGlkZGVuID0gcmVtYWluaW5nV29yZHMuc2l6ZSAhPT0gMDtcclxuICAgICAgICBncmlkID0gbmV3IExldHRlckdyaWQoc3RhdGUuZ3JpZC5yb3dzLCBzdGF0ZS5ncmlkLmNvbHMsIHN0YXRlLmdyaWQubGV0dGVycyk7XHJcbiAgICAgICAgcGxhY2VtZW50cyA9IHN0YXRlLnBsYWNlbWVudHM7XHJcbiAgICAgICAgZm91bmQgPSBzdGF0ZS5mb3VuZDtcclxuXHJcbiAgICAgICAgaWYgKHN0YXRlLmFjdGl2aXR5ID09PSBBY3Rpdml0eS5TZXR0aW5ncykge1xyXG4gICAgICAgICAgICBzZXR0aW5nc0Rpdi5oaWRkZW4gPSBmYWxzZTtcclxuICAgICAgICAgICAgcmVzdWx0c0Rpdi5oaWRkZW4gPSB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNldHRpbmdzRGl2LmhpZGRlbiA9IHRydWU7XHJcbiAgICAgICAgICAgIHJlc3VsdHNEaXYuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwYWludChjYW52YXMsIGN0eCwgZ3JpZCwgZm91bmQpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kV29yZEVsZW0od29yZExpc3Q6IEhUTUxEaXZFbGVtZW50LCB3b3JkOiBzdHJpbmcpOiBIVE1MRGl2RWxlbWVudCB8IG51bGwge1xyXG4gICAgd29yZCA9IHdvcmQudHJpbSgpLnRvVXBwZXJDYXNlKCk7XHJcblxyXG4gICAgY29uc3QgZWxlbXMgPSBBcnJheS5mcm9tKHdvcmRMaXN0LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTERpdkVsZW1lbnQ+KFwiLndvcmRcIikpO1xyXG4gICAgZm9yIChjb25zdCBlbGVtIG9mIGVsZW1zKSB7XHJcbiAgICAgICAgaWYgKGVsZW0udGV4dENvbnRlbnQgPT09IHdvcmQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVsZW07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVdvcmRTZWFyY2gocm5nOiByYW5kLlJORywgd29yZHM6IFNldDxzdHJpbmc+LCBvcHRpb25zOiBXb3JkU2VhcmNoT3B0aW9ucyk6IFdvcmRTZWFyY2ggfCBudWxsIHtcclxuICAgIGNvbnN0IGhvcml6b250YWwgPSBvcHRpb25zLmhvcml6b250YWwgPz8gdHJ1ZTtcclxuICAgIGNvbnN0IHZlcnRpY2FsID0gb3B0aW9ucy52ZXJ0aWNhbCA/PyB0cnVlO1xyXG4gICAgY29uc3QgZGlhZ29uYWwgPSBvcHRpb25zLmRpYWdvbmFsID8/IHRydWU7XHJcbiAgICBjb25zdCByZXZlcnNlID0gb3B0aW9ucy5yZXZlcnNlID8/IHRydWU7XHJcbiAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBkb20uYnlJZChcImVycm9yTWVzc2FnZVwiKSBhcyBIVE1MRGl2RWxlbWVudDtcclxuICAgIGVycm9yTWVzc2FnZS50ZXh0Q29udGVudCA9IFwiXCI7XHJcblxyXG4gICAgaWYgKHdvcmRzLnNpemUgPT0gMCkge1xyXG4gICAgICAgIGVycm9yTWVzc2FnZS50ZXh0Q29udGVudCA9IFwiQXQgbGVhc3Qgb25lIHdvcmQgbXVzdCBiZSBhZGRlZCB0byB0aGUgd29yZCBsaXN0LlwiO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHZhbGlkYXRpb25cclxuICAgIC8vIG11c3QgY2hlY2sgYXQgbGVhc3Qgb25lIG9mIHRoZSBkaXJlY3Rpb25hbCBjaGVja2JveGVzXHJcbiAgICBpZiAoIWhvcml6b250YWwgJiYgIXZlcnRpY2FsICYmICFkaWFnb25hbCAmJiAhcmV2ZXJzZSkge1xyXG4gICAgICAgIGVycm9yTWVzc2FnZS50ZXh0Q29udGVudCA9IFwiTXVzdCBjaG9vc2UgYXQgbGVhc3Qgb25lIG9mIGhvcml6b250YWwsIHZlcnRpY2FsLCBkaWFnb25hbCwgb3IgcmV2ZXJzZS5cIjtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBrZWVwIGluY3JlYXNpbmcgZ3JpZCBzaXplIHVudGlsIHdvcmRzIGNhbiBiZSBwbGFjZWRcclxuICAgIGxldCBzaXplID0gMztcclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgY29uc3QgZ3JpZCA9IG5ldyBMZXR0ZXJHcmlkKHNpemUsIHNpemUpO1xyXG4gICAgICAgIGNvbnN0IHBsYWNlbWVudHMgPSBwbGFjZVdvcmRzKHJuZywgZ3JpZCwgd29yZHMsIGhvcml6b250YWwsIHZlcnRpY2FsLCBkaWFnb25hbCwgcmV2ZXJzZSk7XHJcbiAgICAgICAgaWYgKHBsYWNlbWVudHMpIHtcclxuICAgICAgICAgICAgZmlsbFJhbmRvbUNoYXJhY3RlcnMocm5nLCBncmlkLCB3b3Jkcyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBncmlkLFxyXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50c1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgKytzaXplO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZVdvcmRzKFxyXG4gICAgcm5nOiByYW5kLlJORyxcclxuICAgIGdyaWQ6IExldHRlckdyaWQsXHJcbiAgICB3b3JkczogU2V0PHN0cmluZz4sXHJcbiAgICBob3Jpem9udGFsOiBib29sZWFuLFxyXG4gICAgdmVydGljYWw6IGJvb2xlYW4sXHJcbiAgICBkaWFnb25hbDogYm9vbGVhbixcclxuICAgIHJldmVyc2U6IGJvb2xlYW4pOiBDb29yZHNSYW5nZVtdIHwgbnVsbCB7XHJcbiAgICBjb25zdCBkaXJzID0gZ2V0RGlycyhob3Jpem9udGFsLCB2ZXJ0aWNhbCwgZGlhZ29uYWwsIHJldmVyc2UpO1xyXG4gICAgY29uc3QgcGxhY2VtZW50cyA9IG5ldyBBcnJheTxDb29yZHNSYW5nZT4oKTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IHdvcmQgb2Ygd29yZHMpIHtcclxuICAgICAgICBjb25zdCBwbGFjZW1lbnQgPSB0cnlQbGFjZVdvcmQocm5nLCBncmlkLCBkaXJzLCB3b3JkKTtcclxuICAgICAgICBpZiAoIXBsYWNlbWVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHBsYWNlbWVudHMucHVzaChwbGFjZW1lbnQpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwbGFjZW1lbnRzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXREaXJzKGhvcml6b250YWw6IGJvb2xlYW4sIHZlcnRpY2FsOiBib29sZWFuLCBkaWFnb25hbDogYm9vbGVhbiwgcmV2ZXJzZTogYm9vbGVhbik6IENvb3Jkc1tdIHtcclxuICAgIGNvbnN0IGRpcnMgPSBuZXcgQXJyYXk8Q29vcmRzPigpO1xyXG5cclxuICAgIGlmIChob3Jpem9udGFsKSB7XHJcbiAgICAgICAgZGlycy5wdXNoKHsgaTogMCwgajogMSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodmVydGljYWwpIHtcclxuICAgICAgICBkaXJzLnB1c2goeyBpOiAxLCBqOiAwIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChkaWFnb25hbCkge1xyXG4gICAgICAgIGRpcnMucHVzaCh7IGk6IDEsIGo6IDEgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJldmVyc2UgJiYgaG9yaXpvbnRhbCkge1xyXG4gICAgICAgIGRpcnMucHVzaCh7IGk6IDAsIGo6IC0xIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChyZXZlcnNlICYmIHZlcnRpY2FsKSB7XHJcbiAgICAgICAgZGlycy5wdXNoKHsgaTogLTEsIGo6IDAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJldmVyc2UgJiYgZGlhZ29uYWwpIHtcclxuICAgICAgICBkaXJzLnB1c2goeyBpOiAxLCBqOiAtMSB9KTtcclxuICAgICAgICBkaXJzLnB1c2goeyBpOiAtMSwgajogMSB9KTtcclxuICAgICAgICBkaXJzLnB1c2goeyBpOiAtMSwgajogLTEgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGRpcnM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeVBsYWNlV29yZChybmc6IHJhbmQuUk5HLCBncmlkOiBMZXR0ZXJHcmlkLCBkaXJzOiBDb29yZHNbXSwgd29yZDogc3RyaW5nKTogQ29vcmRzUmFuZ2UgfCBudWxsIHtcclxuICAgIGNvbnN0IHBsYWNlbWVudCA9IHRyeUZpbmRXb3JkUGxhY2VtZW50KHJuZywgZ3JpZCwgZGlycywgd29yZCk7XHJcbiAgICBpZiAoIXBsYWNlbWVudCkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHBsYWNlV29yZChncmlkLCB3b3JkLCBwbGFjZW1lbnQpO1xyXG4gICAgcmV0dXJuIHBsYWNlbWVudDtcclxufVxyXG5cclxuZnVuY3Rpb24gdHJ5RmluZFdvcmRQbGFjZW1lbnQocm5nOiByYW5kLlJORywgZ3JpZDogTGV0dGVyR3JpZCwgZGlyZWN0aW9uczogQ29vcmRzW10sIHdvcmQ6IHN0cmluZyk6IENvb3Jkc1JhbmdlIHwgbnVsbCB7XHJcbiAgICBjb25zdCBtYXhEaW0gPSBNYXRoLm1heChncmlkLnJvd3MsIGdyaWQuY29scyk7XHJcbiAgICBpZiAod29yZC5sZW5ndGggPiBtYXhEaW0pIHtcclxuICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIC8vIHRyeSBwbGFjaW5nIGF0IGV2ZXJ5IHBvc3NpYmxlIGNlbGxcclxuICAgIGNvbnN0IGdyaWRDb29yZHMgPSBuZXcgQXJyYXk8Q29vcmRzPigpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBncmlkLnJvd3M7ICsraSkge1xyXG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZ3JpZC5jb2xzOyArK2opIHtcclxuICAgICAgICAgICAgZ3JpZENvb3Jkcy5wdXNoKHsgaSwgaiB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGlyID0gcmFuZC5jaG9vc2Uocm5nLCBkaXJlY3Rpb25zKTtcclxuICAgIHJhbmQuc2h1ZmZsZShybmcsIGdyaWRDb29yZHMpO1xyXG5cclxuICAgIGZvciAoY29uc3Qgc3RhcnQgb2YgZ3JpZENvb3Jkcykge1xyXG4gICAgICAgIGlmIChpc1ZhbGlkV29yZFBsYWNlbWVudChncmlkLCB3b3JkLCBzdGFydCwgZGlyKSkge1xyXG4gICAgICAgICAgICBjb25zdCBlbmQgPSB7XHJcbiAgICAgICAgICAgICAgICBpOiBzdGFydC5pICsgZGlyLmkgKiAod29yZC5sZW5ndGggLSAxKSxcclxuICAgICAgICAgICAgICAgIGo6IHN0YXJ0LmogKyBkaXIuaiAqICh3b3JkLmxlbmd0aCAtIDEpLFxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN0YXJ0LFxyXG4gICAgICAgICAgICAgICAgZW5kLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFdvcmRQbGFjZW1lbnQoZ3JpZDogTGV0dGVyR3JpZCwgd29yZDogc3RyaW5nLCBzdGFydDogQ29vcmRzLCBkaXI6IENvb3Jkcyk6IGJvb2xlYW4ge1xyXG4gICAgaWYgKHN0YXJ0LmkgPCAwIHx8IHN0YXJ0LmogPCAwKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHN0YXJ0LmkgPj0gZ3JpZC5yb3dzIHx8IHN0YXJ0LmogPj0gZ3JpZC5yb3dzKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHsgaTogaTAsIGo6IGowIH0gPSBzdGFydDtcclxuICAgIGNvbnN0IGxldHRlcnMgPSB3b3JkLnNwbGl0KFwiXCIpO1xyXG4gICAgY29uc3Qgc3VjY2VzcyA9IGxldHRlcnMuZXZlcnkoKGNoLCBpZHgpID0+IHtcclxuICAgICAgICBjb25zdCBpID0gaTAgKyBkaXIuaSAqIGlkeDtcclxuICAgICAgICBjb25zdCBqID0gajAgKyBkaXIuaiAqIGlkeDtcclxuXHJcbiAgICAgICAgaWYgKGkgPCAwIHx8IGkgPj0gZ3JpZC5yb3dzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChqIDwgMCB8fCBqID49IGdyaWQuY29scykge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZ3JpZC5nZXQoaSwgaikgPT09IGNoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFncmlkLmdldChpLCBqKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGV4Y2VwdGlvbjogZnVsbCBvdmVybGFwIChpLmUuIHByZWZpeCBvdmVybGFwcGluZyBsb25nZXIgd29yZCkgc2hvdWxkIG5vdCBiZSBjb25zaWRlcmVkIHZhbGlkXHJcbiAgICBpZiAobGV0dGVycy5ldmVyeSgoY2gsIGlkeCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGkgPSBpMCArIGRpci5pICogaWR4O1xyXG4gICAgICAgIGNvbnN0IGogPSBqMCArIGRpci5qICogaWR4O1xyXG4gICAgICAgIHJldHVybiBncmlkLmdldChpLCBqKSA9PT0gY2hcclxuICAgIH0pKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHN1Y2Nlc3M7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlV29yZChncmlkOiBMZXR0ZXJHcmlkLCB3b3JkOiBzdHJpbmcsIHBsYWNlbWVudDogQ29vcmRzUmFuZ2UpIHtcclxuICAgIGNvbnN0IHsgc3RhcnQsIGVuZCB9ID0gcGxhY2VtZW50O1xyXG4gICAgY29uc3QgeyBpOiBpMCwgajogajAgfSA9IHN0YXJ0O1xyXG4gICAgY29uc3QgZGlyID0gZ2V0RGlyKHN0YXJ0LCBlbmQpO1xyXG4gICAgaWYgKCFkaXIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcGxhY2VtZW50IGRpciAke3N0YXJ0fSAtICR7ZW5kfWApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGxldHRlcnMgPSB3b3JkLnNwbGl0KFwiXCIpO1xyXG4gICAgbGV0dGVycy5mb3JFYWNoKChjaCwgaWR4KSA9PiB7XHJcbiAgICAgICAgY29uc3QgaSA9IGkwICsgZGlyLmkgKiBpZHg7XHJcbiAgICAgICAgY29uc3QgaiA9IGowICsgZGlyLmogKiBpZHg7XHJcbiAgICAgICAgZ3JpZC5zZXQoaSwgaiwgY2gpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbGxSYW5kb21DaGFyYWN0ZXJzKHJuZzogcmFuZC5STkcsIGdyaWQ6IExldHRlckdyaWQsIHdvcmRzOiBTZXQ8c3RyaW5nPikge1xyXG4gICAgLy8gZ2VuZXJhdGUgY2hhcmFjdGVyIGxpc3QgZnJvbSB3b3Jkc1xyXG5cclxuICAgIC8vIGdldCBhIGZsYXQgbGlzdCBvZiBhbGwgbGV0dGVycyBpbiBhbGwgd29yZHNcclxuICAgIGNvbnN0IGNoYXJzU2V0ID0gbmV3IFNldDxzdHJpbmc+KFtcIkFcIiwgXCJCXCIsIFwiQ1wiLCBcIkRcIiwgXCJFXCIsIFwiRlwiLCBcIkdcIiwgXCJIXCIsIFwiSVwiLCBcIkpcIiwgXCJLXCIsIFwiTFwiLCBcIk1cIiwgXCJOXCIsIFwiT1wiLCBcIlBcIiwgXCJRXCIsIFwiUlwiLCBcIlNcIiwgXCJUXCIsIFwiVVwiLCBcIlZcIiwgXCJXXCIsIFwiWFwiLCBcIllcIiwgXCJaXCJdKTtcclxuICAgIHdvcmRzLmZvckVhY2godyA9PiB3LnNwbGl0KFwiXCIpLmZvckVhY2goY2ggPT4gY2hhcnNTZXQuYWRkKGNoKSkpO1xyXG4gICAgY29uc3QgY2hhcnMgPSBbLi4uY2hhcnNTZXRdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ3JpZC5yb3dzOyArK2kpIHtcclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGdyaWQuY29sczsgKytqKSB7XHJcbiAgICAgICAgICAgIGlmIChncmlkLmdldChpLCBqKSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNoID0gcmFuZC5jaG9vc2Uocm5nLCBjaGFycyk7XHJcbiAgICAgICAgICAgIGdyaWQuc2V0KGksIGosIGNoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhaW50KGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQsIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCBncmlkOiBMZXR0ZXJHcmlkLCBmb3VuZDogQ29vcmRzUmFuZ2VbXSwgc2VsZWN0aW9uOiBDb29yZHNSYW5nZSB8IG51bGwgPSBudWxsKSB7XHJcbiAgICBjb25zdCBmb250ID0gXCIyNHB4IG1vbm9zcGFjZVwiO1xyXG4gICAgY3R4LmZvbnQgPSBmb250O1xyXG4gICAgY29uc3QgbGV0dGVyU2l6ZSA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGg7XHJcbiAgICBjb25zdCBjZWxsU2l6ZSA9IGxldHRlclNpemUgKyBwYWRkaW5nICogMjtcclxuICAgIGNhbnZhcy53aWR0aCA9IGNlbGxTaXplICogZ3JpZC5jb2xzO1xyXG4gICAgY2FudmFzLmhlaWdodCA9IGNlbGxTaXplICogZ3JpZC5yb3dzO1xyXG4gICAgLy8gY2FudmFzLnN0eWxlLndpZHRoID0gYCR7Y2FudmFzLndpZHRofXB4YDtcclxuICAgIC8vIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBgJHtjYW52YXMuaGVpZ2h0fXB4YDtcclxuXHJcbiAgICBjdHguZm9udCA9IGZvbnQ7XHJcbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ3JpZC5yb3dzOyArK2kpIHtcclxuICAgICAgICBjb25zdCB5ID0gaSAqIGNlbGxTaXplICsgcGFkZGluZyArIGxldHRlclNpemU7XHJcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBncmlkLmNvbHM7ICsraikge1xyXG4gICAgICAgICAgICBjb25zdCB4ID0gaiAqIGNlbGxTaXplICsgcGFkZGluZztcclxuICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGdyaWQuZ2V0KGksIGopLCB4LCB5KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHNlbGVjdGlvbikge1xyXG4gICAgICAgIGNvbnN0IHh5MCA9IGdyaWRUb0NhbnZhc0Nvb3JkcyhjdHgsIHNlbGVjdGlvbi5zdGFydCk7XHJcbiAgICAgICAgY29uc3QgeHkxID0gZ3JpZFRvQ2FudmFzQ29vcmRzKGN0eCwgc2VsZWN0aW9uLmVuZCk7XHJcbiAgICAgICAgY29uc3QgeDAgPSB4eTAueCArIGNlbGxTaXplIC8gMjtcclxuICAgICAgICBjb25zdCB5MCA9IHh5MC55ICsgY2VsbFNpemUgLyAyO1xyXG4gICAgICAgIGNvbnN0IHgxID0geHkxLnggKyBjZWxsU2l6ZSAvIDI7XHJcbiAgICAgICAgY29uc3QgeTEgPSB4eTEueSArIGNlbGxTaXplIC8gMjtcclxuXHJcbiAgICAgICAgLy8gZG8gZ3JpZCBjb29yZHMgcmVwcmVzZW50IGEgc3RyYWlnaHQgbGluZT9cclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJlZFwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSA0O1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHgubW92ZVRvKHgwLCB5MCk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh4MSwgeTEpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IHNlbGVjdGlvbiBvZiBmb3VuZCkge1xyXG4gICAgICAgIGNvbnN0IHh5MCA9IGdyaWRUb0NhbnZhc0Nvb3JkcyhjdHgsIHNlbGVjdGlvbi5zdGFydCk7XHJcbiAgICAgICAgY29uc3QgeHkxID0gZ3JpZFRvQ2FudmFzQ29vcmRzKGN0eCwgc2VsZWN0aW9uLmVuZCk7XHJcbiAgICAgICAgY29uc3QgeDAgPSB4eTAueCArIGNlbGxTaXplIC8gMjtcclxuICAgICAgICBjb25zdCB5MCA9IHh5MC55ICsgY2VsbFNpemUgLyAyO1xyXG4gICAgICAgIGNvbnN0IHgxID0geHkxLnggKyBjZWxsU2l6ZSAvIDI7XHJcbiAgICAgICAgY29uc3QgeTEgPSB4eTEueSArIGNlbGxTaXplIC8gMjtcclxuXHJcbiAgICAgICAgLy8gZG8gZ3JpZCBjb29yZHMgcmVwcmVzZW50IGEgc3RyYWlnaHQgbGluZT9cclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMCwgMjU1LCAwLCAwLjUpXCI7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDQ7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5tb3ZlVG8oeDAsIHkwKTtcclxuICAgICAgICBjdHgubGluZVRvKHgxLCB5MSk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYW52YXNUb0dyaWRDb29yZHMoY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIHh5OiBQb2ludCk6IENvb3JkcyB7XHJcbiAgICBjb25zdCBsZXR0ZXJTaXplID0gY3R4Lm1lYXN1cmVUZXh0KFwiTVwiKS53aWR0aDtcclxuICAgIGNvbnN0IGNlbGxTaXplID0gbGV0dGVyU2l6ZSArIHBhZGRpbmcgKiAyO1xyXG4gICAgY29uc3QgeyB4LCB5IH0gPSB4eTtcclxuICAgIGNvbnN0IGkgPSBNYXRoLmZsb29yKCh5IC0gcGFkZGluZykgLyBjZWxsU2l6ZSk7XHJcbiAgICBjb25zdCBqID0gTWF0aC5mbG9vcigoeCAtIHBhZGRpbmcpIC8gY2VsbFNpemUpO1xyXG4gICAgcmV0dXJuIHsgaSwgaiB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBncmlkVG9DYW52YXNDb29yZHMoY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIGlqOiBDb29yZHMpOiBQb2ludCB7XHJcbiAgICBjb25zdCBsZXR0ZXJTaXplID0gY3R4Lm1lYXN1cmVUZXh0KFwiTVwiKS53aWR0aDtcclxuICAgIGNvbnN0IGNlbGxTaXplID0gbGV0dGVyU2l6ZSArIHBhZGRpbmcgKiAyO1xyXG4gICAgY29uc3QgeyBpLCBqIH0gPSBpajtcclxuICAgIGNvbnN0IHggPSBqICogY2VsbFNpemU7XHJcbiAgICBjb25zdCB5ID0gaSAqIGNlbGxTaXplO1xyXG4gICAgcmV0dXJuIHsgeCwgeSB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDb250ZXh0MkQoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCk6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCB7XHJcbiAgICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgaWYgKCFjdHgpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBjYW52YXMgc3VwcG9ydFwiKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gY3R4O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb29yZHNFcXVhbChhOiBDb29yZHMsIGI6IENvb3Jkcyk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIGEuaSA9PSBiLmkgJiYgYS5qID09IGIuajtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0RGlyKGlqMDogQ29vcmRzLCBpajE6IENvb3Jkcyk6IENvb3JkcyB8IG51bGwge1xyXG4gICAgY29uc3QgZGkgPSBpajEuaSAtIGlqMC5pO1xyXG4gICAgY29uc3QgZGogPSBpajEuaiAtIGlqMC5qO1xyXG5cclxuICAgIGlmIChkaSA9PT0gMCAmJiBkaiA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChkaSAhPT0gMCAmJiBkaiAhPT0gMCAmJiBNYXRoLmFicyhkaSkgIT09IE1hdGguYWJzKGRqKSkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7IGk6IE1hdGguc2lnbihkaSksIGo6IE1hdGguc2lnbihkaikgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlVW5zZWxlY3RlZExldHRlcnMoZ3JpZDogTGV0dGVyR3JpZCwgc2VsZWN0aW9uczogQ29vcmRzUmFuZ2VbXSkge1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBncmlkLnJvd3M7ICsraSkge1xyXG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZ3JpZC5jb2xzOyArK2opIHtcclxuICAgICAgICAgICAgY29uc3QgY29vcmRzID0geyBpLCBqIH07XHJcbiAgICAgICAgICAgIGlmIChzZWxlY3Rpb25zLnNvbWUoeCA9PiBzZWxlY3Rpb25Db250YWlucyh4LCBjb29yZHMpKSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGdyaWQuc2V0KGksIGosIFwiIFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNlbGVjdGlvbkNvbnRhaW5zKHNlbGVjdGlvbjogQ29vcmRzUmFuZ2UsIGlqOiBDb29yZHMpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IGRpciA9IGdldERpcihzZWxlY3Rpb24uc3RhcnQsIHNlbGVjdGlvbi5lbmQpO1xyXG4gICAgaWYgKCFkaXIpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSBzZWxlY3Rpb247XHJcbiAgICBsZXQgeyBpLCBqIH0gPSBzdGFydDtcclxuICAgIHdoaWxlIChpID49IDAgJiYgaiA+PSAwKSB7XHJcbiAgICAgICAgaWYgKGkgPT0gaWouaSAmJiBqID09IGlqLmopIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaSA9PT0gZW5kLmkgJiYgaiA9PT0gZW5kLmopIHtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpICs9IGRpci5pO1xyXG4gICAgICAgIGogKz0gZGlyLmo7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0U2VsZWN0aW9uKGdyaWQ6IExldHRlckdyaWQsIHNlbGVjdGlvbjogQ29vcmRzUmFuZ2UpOiBzdHJpbmcge1xyXG4gICAgLy8gY2hlY2sgZGlyZWN0aW9uIC0gaWYgaWowIHRvIGlqMSBpcyBub3QgaG9yaXpvbnRhbCwgdmVydGljYWwsIG9yIGRpYWdvbmFsLCBubyBtYXRjaCBwb3NzaWJsZVxyXG4gICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSBzZWxlY3Rpb247XHJcbiAgICBjb25zdCBkaXIgPSBnZXREaXIoc3RhcnQsIGVuZCk7XHJcbiAgICBpZiAoIWRpcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBzZWxlY3Rpb24gZGlyZWN0aW9uICR7c3RhcnR9IC0gJHtlbmR9YClcclxuICAgIH1cclxuXHJcbiAgICAvLyBleHRyYWN0IHNlbGVjdGVkIHdvcmRcclxuICAgIGxldCB7IGksIGogfSA9IHNlbGVjdGlvbi5zdGFydDtcclxuICAgIGxldCBzID0gXCJcIjtcclxuXHJcbiAgICB3aGlsZSAoaSA+PSAwICYmIGkgPCBncmlkLnJvd3MgJiYgaiA+PSAwICYmIGogPCBncmlkLmNvbHMpIHtcclxuICAgICAgICBzICs9IGdyaWQuZ2V0KGksIGopO1xyXG5cclxuICAgICAgICBpZiAoaSA9PT0gZW5kLmkgJiYgaiA9PT0gZW5kLmopIHtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpICs9IGRpci5pO1xyXG4gICAgICAgIGogKz0gZGlyLmo7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlZnJlc2hXb3JkTGlzdChkaXY6IEhUTUxEaXZFbGVtZW50LCB3b3JkczogU2V0PHN0cmluZz4sIHJlbWFpbmluZ1dvcmRzOiBTZXQ8c3RyaW5nPikge1xyXG4gICAgY29uc3QgbGlzdCA9IFsuLi53b3Jkc107XHJcbiAgICBsaXN0LnNvcnQoKTtcclxuXHJcbiAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4oZGl2KTtcclxuICAgIGZvciAoY29uc3Qgd29yZCBvZiBsaXN0KSB7XHJcbiAgICAgICAgY29uc3Qgd29yZERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICAgICAgd29yZERpdi5jbGFzc0xpc3QuYWRkKFwid29yZFwiKTtcclxuXHJcbiAgICAgICAgaWYgKCFyZW1haW5pbmdXb3Jkcy5oYXMod29yZCkpIHtcclxuICAgICAgICAgICAgd29yZERpdi5jbGFzc0xpc3QuYWRkKFwiZm91bmRcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB3b3JkVGV4dCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHdvcmQpO1xyXG4gICAgICAgIHdvcmREaXYuYXBwZW5kQ2hpbGQod29yZFRleHQpXHJcbiAgICAgICAgZGl2LmFwcGVuZENoaWxkKHdvcmREaXYpO1xyXG4gICAgfVxyXG59XHJcblxyXG5tYWluKCkiXX0=