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
        var wordDivs = Array.from(settingsWordList.querySelectorAll("#settingsWordList .word"));
        for (const div of wordDivs) {
            div.remove();
        }
    });
    returnToSettingsButton.addEventListener("click", _ => {
        settingsDiv.hidden = false;
        resultsDiv.hidden = true;
        saveState();
    });
    document.addEventListener("click", evt => {
        const target = evt.target;
        if (!target) {
            return;
        }
        if (!target.matches("#settingsWordList .word")) {
            return;
        }
        target.remove();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZHNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndvcmRzZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDO0FBQ2IsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQztBQUN4QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUM7QUE2QjVDLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQztBQVFsQixNQUFNLFVBQVU7SUFHWixZQUFxQixJQUFZLEVBQVcsSUFBWSxFQUFFLE9BQWtCO1FBQXZELFNBQUksR0FBSixJQUFJLENBQVE7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ3BELElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssSUFBSSxHQUFHLElBQUksRUFBRTtZQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7U0FDcEQ7UUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sYUFBUCxPQUFPLGNBQVAsT0FBTyxHQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFFRCxJQUFJLENBQUMsR0FBVztRQUNaLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsSUFBSSxDQUFDLEdBQVcsRUFBRSxFQUFVO1FBQ3hCLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDZixNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7U0FDakU7UUFFRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFRCxJQUFJLENBQUMsR0FBVyxF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RUFBRTtZQUMzQixPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNsQztRQUVELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0MsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM3QixHQUFHLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQzVCO0FBQ0wsQ0FBQztBQUVELElBQUksRUFBRSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XHJcbmltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiO1xyXG5pbXBvcnQgKiBhcyByYW5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiO1xyXG5pbXBvcnQgKiBhcyBhcnJheSBmcm9tIFwiLi4vc2hhcmVkL2FycmF5LmpzXCI7XHJcblxyXG5pbnRlcmZhY2UgV29yZFNlYXJjaE9wdGlvbnMge1xyXG4gICAgaG9yaXpvbnRhbD86IGJvb2xlYW4sXHJcbiAgICB2ZXJ0aWNhbD86IGJvb2xlYW4sXHJcbiAgICBkaWFnb25hbD86IGJvb2xlYW4sXHJcbiAgICByZXZlcnNlPzogYm9vbGVhbixcclxufVxyXG5cclxuLyoqXHJcbiAqIGEgcm93L2NvbHVtbiB3aXRoaW4gdGhlIGdyaWRcclxuICovXHJcbmludGVyZmFjZSBDb29yZHMge1xyXG4gICAgLyoqcm93IHdpdGhpbiBncmlkICovXHJcbiAgICBpOiBudW1iZXIsXHJcbiAgICAvKipjb2x1bW4gd2l0aGluIGdyaWQgKi9cclxuICAgIGo6IG51bWJlcixcclxufVxyXG5cclxuaW50ZXJmYWNlIFBvaW50IHtcclxuICAgIHg6IG51bWJlcixcclxuICAgIHk6IG51bWJlclxyXG59XHJcblxyXG5pbnRlcmZhY2UgQ29vcmRzUmFuZ2Uge1xyXG4gICAgc3RhcnQ6IENvb3Jkc1xyXG4gICAgZW5kOiBDb29yZHNcclxufVxyXG5cclxuY29uc3QgcGFkZGluZyA9IDQ7XHJcblxyXG5pbnRlcmZhY2UgTGV0dGVyR3JpZFN0YXRlIHtcclxuICAgIHJvd3M6IG51bWJlcixcclxuICAgIGNvbHM6IG51bWJlcixcclxuICAgIGxldHRlcnM6IHN0cmluZ1tdLFxyXG59XHJcblxyXG5jbGFzcyBMZXR0ZXJHcmlkIHtcclxuICAgIGxldHRlcnM6IHN0cmluZ1tdXHJcblxyXG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgcm93czogbnVtYmVyLCByZWFkb25seSBjb2xzOiBudW1iZXIsIGxldHRlcnM/OiBzdHJpbmdbXSkge1xyXG4gICAgICAgIGlmIChsZXR0ZXJzICYmIGxldHRlcnMubGVuZ3RoICE9PSByb3dzICogY29scykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGxldHRlcnMgYXJyYXkgbGVuZ3RoLlwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubGV0dGVycyA9IGxldHRlcnMgPz8gYXJyYXkuZ2VuZXJhdGUocm93cyAqIGNvbHMsIF8gPT4gXCJcIik7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0ZihpZHg6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubGV0dGVyc1tpZHhdO1xyXG4gICAgfVxyXG5cclxuICAgIHNldGYoaWR4OiBudW1iZXIsIGNoOiBzdHJpbmcpIHtcclxuICAgICAgICBpZiAoY2gubGVuZ3RoID4gMSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IGJlIGEgc2luZ2xlIGNoYXJhY3RlciBvciBlbXB0eSBzdHJpbmdcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5sZXR0ZXJzW2lkeF0gPSBjaDtcclxuICAgIH1cclxuXHJcbiAgICBmbGF0KHJvdzogbnVtYmVyLCBjb2w6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHJvdyAqIHRoaXMuY29scyArIGNvbDtcclxuICAgIH1cclxuXHJcbiAgICBoaWVyKGlkeDogbnVtYmVyKTogQ29vcmRzIHtcclxuICAgICAgICBjb25zdCBpID0gTWF0aC5mbG9vcihpZHggLyB0aGlzLmNvbHMpO1xyXG4gICAgICAgIGNvbnN0IGogPSBpZHggJSB0aGlzLmNvbHM7XHJcbiAgICAgICAgcmV0dXJuIHsgaSwgaiB9O1xyXG4gICAgfVxyXG5cclxuICAgIGdldChyb3c6IG51bWJlciwgY29sOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmdldGYodGhpcy5mbGF0KHJvdywgY29sKSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0KHJvdzogbnVtYmVyLCBjb2w6IG51bWJlciwgY2g6IHN0cmluZykge1xyXG4gICAgICAgIHRoaXMuc2V0Zih0aGlzLmZsYXQocm93LCBjb2wpLCBjaCk7XHJcbiAgICB9XHJcblxyXG4gICAgdG9KU09OKCk6IExldHRlckdyaWRTdGF0ZSB7XHJcbiAgICAgICAgY29uc3QgZGF0YTogTGV0dGVyR3JpZFN0YXRlID0ge1xyXG4gICAgICAgICAgICByb3dzOiB0aGlzLnJvd3MsXHJcbiAgICAgICAgICAgIGNvbHM6IHRoaXMuY29scyxcclxuICAgICAgICAgICAgbGV0dGVyczogdGhpcy5sZXR0ZXJzLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgV29yZFNlYXJjaCB7XHJcbiAgICBncmlkOiBMZXR0ZXJHcmlkXHJcbiAgICBwbGFjZW1lbnRzOiBDb29yZHNSYW5nZVtdXHJcbn1cclxuXHJcbmVudW0gQWN0aXZpdHkge1xyXG4gICAgU2V0dGluZ3MsXHJcbiAgICBSZXN1bHRzLFxyXG59XHJcblxyXG5pbnRlcmZhY2UgU3RhdGUge1xyXG4gICAgaG9yaXpvbnRhbDogYm9vbGVhblxyXG4gICAgdmVydGljYWw6IGJvb2xlYW5cclxuICAgIGRpYWdvbmFsOiBib29sZWFuXHJcbiAgICByZXZlcnNlOiBib29sZWFuXHJcbiAgICB3b3Jkczogc3RyaW5nW10sXHJcbiAgICByZW1haW5pbmdXb3Jkczogc3RyaW5nW10sXHJcbiAgICBncmlkOiBMZXR0ZXJHcmlkU3RhdGVcclxuICAgIHBsYWNlbWVudHM6IENvb3Jkc1JhbmdlW11cclxuICAgIGZvdW5kOiBDb29yZHNSYW5nZVtdXHJcbiAgICBhY3Rpdml0eTogQWN0aXZpdHlcclxufVxyXG5cclxuZnVuY3Rpb24gbWFpbigpIHtcclxuICAgIGNvbnN0IHdvcmRJbnB1dCA9IGRvbS5ieUlkKFwid29yZFwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IHNldHRpbmdzV29yZExpc3QgPSBkb20uYnlJZChcInNldHRpbmdzV29yZExpc3RcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbiAgICBjb25zdCBhZGRXb3JkQnV0dG9uID0gZG9tLmJ5SWQoXCJhZGRXb3JkXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50O1xyXG4gICAgY29uc3QgZ2VuZXJhdGVCdXR0b24gPSBkb20uYnlJZChcImdlbmVyYXRlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50O1xyXG4gICAgY29uc3QgcmV0dXJuVG9TZXR0aW5nc0J1dHRvbiA9IGRvbS5ieUlkKFwicmV0dXJuVG9TZXR0aW5nc1wiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IHJlc2V0QnV0dG9uID0gZG9tLmJ5SWQoXCJyZXNldEJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IGhvcml6b250YWxDaGVja2JveCA9IGRvbS5ieUlkKFwiaG9yaXpvbnRhbFwiKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgY29uc3QgdmVydGljYWxDaGVja2JveCA9IGRvbS5ieUlkKFwidmVydGljYWxcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGRpYWdvbmFsQ2hlY2tib3ggPSBkb20uYnlJZChcImRpYWdvbmFsXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCByZXZlcnNlQ2hlY2tib3ggPSBkb20uYnlJZChcInJldmVyc2VcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IHNldHRpbmdzRGl2ID0gZG9tLmJ5SWQoXCJzZXR0aW5nc1wiKSBhcyBIVE1MRGl2RWxlbWVudDtcclxuICAgIGNvbnN0IHJlc3VsdHNEaXYgPSBkb20uYnlJZChcInJlc3VsdHNcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbiAgICBjb25zdCBzdWNjZXNzRGl2ID0gZG9tLmJ5SWQoXCJzdWNjZXNzXCIpIGFzIEhUTUxEaXZFbGVtZW50O1xyXG4gICAgY29uc3Qgc3RhdGVLZXkgPSBcIndvcmRTZWFyY2hTdGF0ZVwiO1xyXG4gICAgY29uc3Qgc2VlZCA9IHJhbmQueG11cjMobmV3IERhdGUoKS50b1N0cmluZygpKTtcclxuICAgIGNvbnN0IHJuZyA9IG5ldyByYW5kLlNGQzMyUk5HKHNlZWQoKSwgc2VlZCgpLCBzZWVkKCksIHNlZWQoKSk7XHJcbiAgICBjb25zdCBjYW52YXMgPSBkb20uYnlJZChcImdyaWRDYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XHJcbiAgICBjb25zdCBjdHggPSBnZXRDb250ZXh0MkQoY2FudmFzKTtcclxuICAgIGNvbnN0IHJlc3VsdHNXb3JkTGlzdCA9IGRvbS5ieUlkKFwicmVzdWx0c1dvcmRMaXN0XCIpIGFzIEhUTUxEaXZFbGVtZW50O1xyXG4gICAgbGV0IGZvdW5kID0gbmV3IEFycmF5PENvb3Jkc1JhbmdlPigpO1xyXG4gICAgbGV0IHdvcmRzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcbiAgICBsZXQgcmVtYWluaW5nV29yZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuICAgIGxldCBncmlkID0gbmV3IExldHRlckdyaWQoMCwgMCk7XHJcbiAgICBsZXQgcGxhY2VtZW50cyA9IG5ldyBBcnJheTxDb29yZHNSYW5nZT4oKTtcclxuICAgIGxldCBzZWxlY3RTdGFydENvb3JkczogQ29vcmRzIHwgbnVsbCA9IG51bGw7XHJcblxyXG4gICAgbG9hZFN0YXRlKCk7XHJcblxyXG4gICAgd29yZElucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChldnQpID0+IHtcclxuICAgICAgICBpZiAoZXZ0LmtleSAhPT0gXCJFbnRlclwiKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFkZFNldHRpbmdzV29yZCgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgYWRkV29yZEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgXyA9PiB7XHJcbiAgICAgICAgaWYgKCF3b3JkSW5wdXQudmFsdWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWRkU2V0dGluZ3NXb3JkKClcclxuICAgICAgICB3b3JkSW5wdXQuZm9jdXMoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGhvcml6b250YWxDaGVja2JveC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIHNhdmVTdGF0ZSk7XHJcbiAgICB2ZXJ0aWNhbENoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgc2F2ZVN0YXRlKTtcclxuICAgIGRpYWdvbmFsQ2hlY2tib3guYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBzYXZlU3RhdGUpO1xyXG4gICAgcmV2ZXJzZUNoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgc2F2ZVN0YXRlKTtcclxuXHJcbiAgICBnZW5lcmF0ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgXyA9PiB7XHJcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IGdldFdvcmRTZWFyY2hPcHRpb25zKCk7XHJcbiAgICAgICAgbGV0IHdvcmRTZWFyY2ggPSBnZW5lcmF0ZVdvcmRTZWFyY2gocm5nLCB3b3Jkcywgb3B0aW9ucyk7XHJcbiAgICAgICAgaWYgKCF3b3JkU2VhcmNoKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlbWFpbmluZ1dvcmRzID0gbmV3IFNldCh3b3Jkcyk7XHJcbiAgICAgICAgc3VjY2Vzc0Rpdi5oaWRkZW4gPSB0cnVlO1xyXG4gICAgICAgIGdyaWQgPSB3b3JkU2VhcmNoLmdyaWQ7XHJcbiAgICAgICAgcGxhY2VtZW50cyA9IHdvcmRTZWFyY2gucGxhY2VtZW50cztcclxuICAgICAgICBmb3VuZC5zcGxpY2UoMCwgZm91bmQubGVuZ3RoKTtcclxuXHJcbiAgICAgICAgc2V0dGluZ3NEaXYuaGlkZGVuID0gdHJ1ZTtcclxuICAgICAgICByZXN1bHRzRGl2LmhpZGRlbiA9IGZhbHNlO1xyXG4gICAgICAgIHNhdmVTdGF0ZSgpO1xyXG5cclxuICAgICAgICBwYWludChjYW52YXMsIGN0eCwgZ3JpZCwgZm91bmQpO1xyXG4gICAgICAgIHJlZnJlc2hXb3JkTGlzdChyZXN1bHRzV29yZExpc3QsIHdvcmRzLCByZW1haW5pbmdXb3Jkcyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgXyA9PiB7XHJcbiAgICAgICAgdmFyIHdvcmREaXZzID0gQXJyYXkuZnJvbShzZXR0aW5nc1dvcmRMaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoXCIjc2V0dGluZ3NXb3JkTGlzdCAud29yZFwiKSk7XHJcbiAgICAgICAgZm9yIChjb25zdCBkaXYgb2Ygd29yZERpdnMpIHtcclxuICAgICAgICAgICAgZGl2LnJlbW92ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuVG9TZXR0aW5nc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgXyA9PiB7XHJcbiAgICAgICAgc2V0dGluZ3NEaXYuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgcmVzdWx0c0Rpdi5oaWRkZW4gPSB0cnVlO1xyXG4gICAgICAgIHNhdmVTdGF0ZSgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGV2dCA9PiB7XHJcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXZ0LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICBpZiAoIXRhcmdldCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXRhcmdldC5tYXRjaGVzKFwiI3NldHRpbmdzV29yZExpc3QgLndvcmRcIikpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGFyZ2V0LnJlbW92ZSgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVyZG93blwiLCBvbkNhbnZhc1BvaW50ZXJEb3duLCBmYWxzZSk7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJ1cFwiLCBvbkNhbnZhc1BvaW50ZXJVcCwgZmFsc2UpO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVybW92ZVwiLCBvbkNhbnZhc1BvaW50ZXJNb3ZlLCBmYWxzZSk7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJsZWF2ZVwiLCBvbkNhbnZhc1BvaW50ZXJMZWF2ZSwgZmFsc2UpO1xyXG5cclxuICAgIGZ1bmN0aW9uIGFkZFNldHRpbmdzV29yZCgpIHtcclxuICAgICAgICBpZiAoIXdvcmRJbnB1dC52YWx1ZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB3b3JkID0gd29yZElucHV0LnZhbHVlLnRyaW0oKS50b1VwcGVyQ2FzZSgpO1xyXG4gICAgICAgIHdvcmRzLmFkZCh3b3JkKTtcclxuICAgICAgICByZWZyZXNoV29yZExpc3Qoc2V0dGluZ3NXb3JkTGlzdCwgd29yZHMsIHdvcmRzKTtcclxuICAgICAgICB3b3JkSW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgICAgIHNhdmVTdGF0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdldFdvcmRTZWFyY2hPcHRpb25zKCk6IFdvcmRTZWFyY2hPcHRpb25zIHtcclxuICAgICAgICBjb25zdCBob3Jpem9udGFsID0gaG9yaXpvbnRhbENoZWNrYm94LmNoZWNrZWQ7XHJcbiAgICAgICAgY29uc3QgdmVydGljYWwgPSB2ZXJ0aWNhbENoZWNrYm94LmNoZWNrZWQ7XHJcbiAgICAgICAgY29uc3QgZGlhZ29uYWwgPSBkaWFnb25hbENoZWNrYm94LmNoZWNrZWQ7XHJcbiAgICAgICAgY29uc3QgcmV2ZXJzZSA9IHJldmVyc2VDaGVja2JveC5jaGVja2VkO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBob3Jpem9udGFsLFxyXG4gICAgICAgICAgICB2ZXJ0aWNhbCxcclxuICAgICAgICAgICAgZGlhZ29uYWwsXHJcbiAgICAgICAgICAgIHJldmVyc2UsXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uQ2FudmFzUG9pbnRlckRvd24oZXY6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IHh5ID0geyB4OiBldi5vZmZzZXRYLCB5OiBldi5vZmZzZXRZIH07XHJcbiAgICAgICAgc2VsZWN0U3RhcnRDb29yZHMgPSBjYW52YXNUb0dyaWRDb29yZHMoY3R4ISwgeHkpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uQ2FudmFzUG9pbnRlclVwKGV2OiBQb2ludGVyRXZlbnQpIHtcclxuICAgICAgICBpZiAoIXNlbGVjdFN0YXJ0Q29vcmRzKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGNoZWNrIGZvciB3b3JkIHNlbGVjdGlvblxyXG4gICAgICAgIGNvbnN0IHh5ID0geyB4OiBldi5vZmZzZXRYLCB5OiBldi5vZmZzZXRZIH07XHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBzZWxlY3RTdGFydENvb3JkcztcclxuICAgICAgICBjb25zdCBlbmQgPSBjYW52YXNUb0dyaWRDb29yZHMoY3R4ISwgeHkpO1xyXG4gICAgICAgIGNvbnN0IGlkeCA9IHBsYWNlbWVudHMuZmluZEluZGV4KHggPT5cclxuICAgICAgICAgICAgKGNvb3Jkc0VxdWFsKHguc3RhcnQsIHN0YXJ0KSAmJiBjb29yZHNFcXVhbCh4LmVuZCwgZW5kKSlcclxuICAgICAgICAgICAgfHwgKGNvb3Jkc0VxdWFsKHguc3RhcnQsIGVuZCEpICYmIGNvb3Jkc0VxdWFsKHguZW5kLCBzdGFydCkpKTtcclxuXHJcbiAgICAgICAgaWYgKGlkeCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgZHJhZ0VuZCgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzZWxlY3Rpb24gPSB7IHN0YXJ0LCBlbmQgfTtcclxuICAgICAgICBjb25zdCB3b3JkID0gZXh0cmFjdFNlbGVjdGlvbihncmlkLCBzZWxlY3Rpb24pXHJcbiAgICAgICAgcGxhY2VtZW50cy5zcGxpY2UoaWR4LCAxKTtcclxuXHJcbiAgICAgICAgY29uc3Qgd29yZERpdiA9IGZpbmRXb3JkRWxlbShyZXN1bHRzV29yZExpc3QsIHdvcmQpO1xyXG4gICAgICAgIHdvcmREaXY/LmNsYXNzTGlzdD8uYWRkKFwiZm91bmRcIik7XHJcbiAgICAgICAgZm91bmQucHVzaChzZWxlY3Rpb24pO1xyXG4gICAgICAgIHJlbWFpbmluZ1dvcmRzLmRlbGV0ZSh3b3JkKTtcclxuXHJcbiAgICAgICAgLy8gY2hlY2sgZm9yIGNvbXBsZXRpb25cclxuICAgICAgICBpZiAocmVtYWluaW5nV29yZHMuc2l6ZSA9PT0gMCkge1xyXG4gICAgICAgICAgICAvLyByZW1vdmUgYWxsIHVuc2VsZWN0ZWQgbGV0dGVyc1xyXG4gICAgICAgICAgICByZW1vdmVVbnNlbGVjdGVkTGV0dGVycyhncmlkLCBmb3VuZCk7XHJcbiAgICAgICAgICAgIHN1Y2Nlc3NEaXYuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzYXZlU3RhdGUoKTtcclxuICAgICAgICBkcmFnRW5kKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25DYW52YXNQb2ludGVyTGVhdmUoKSB7XHJcbiAgICAgICAgZHJhZ0VuZCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uQ2FudmFzUG9pbnRlck1vdmUoZXY6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGlmICghc2VsZWN0U3RhcnRDb29yZHMpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgeHkgPSB7IHg6IGV2Lm9mZnNldFgsIHk6IGV2Lm9mZnNldFkgfTtcclxuICAgICAgICBjb25zdCBjb29yZHMgPSBjYW52YXNUb0dyaWRDb29yZHMoY3R4ISwgeHkpO1xyXG4gICAgICAgIHBhaW50KGNhbnZhcywgY3R4ISwgZ3JpZCwgZm91bmQsIHsgc3RhcnQ6IHNlbGVjdFN0YXJ0Q29vcmRzISwgZW5kOiBjb29yZHMgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZHJhZ0VuZCgpIHtcclxuICAgICAgICBzZWxlY3RTdGFydENvb3JkcyA9IG51bGw7XHJcbiAgICAgICAgcGFpbnQoY2FudmFzLCBjdHghLCBncmlkLCBmb3VuZCwgbnVsbCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2F2ZVN0YXRlKCkge1xyXG4gICAgICAgIGNvbnN0IGhvcml6b250YWwgPSBob3Jpem9udGFsQ2hlY2tib3guY2hlY2tlZDtcclxuICAgICAgICBjb25zdCB2ZXJ0aWNhbCA9IHZlcnRpY2FsQ2hlY2tib3guY2hlY2tlZDtcclxuICAgICAgICBjb25zdCBkaWFnb25hbCA9IGRpYWdvbmFsQ2hlY2tib3guY2hlY2tlZDtcclxuICAgICAgICBjb25zdCByZXZlcnNlID0gcmV2ZXJzZUNoZWNrYm94LmNoZWNrZWQ7XHJcbiAgICAgICAgY29uc3QgYWN0aXZpdHkgPSBzZXR0aW5nc0Rpdi5oaWRkZW4gPyBBY3Rpdml0eS5SZXN1bHRzIDogQWN0aXZpdHkuU2V0dGluZ3M7XHJcblxyXG4gICAgICAgIGNvbnN0IHN0YXRlOiBTdGF0ZSA9IHtcclxuICAgICAgICAgICAgaG9yaXpvbnRhbCxcclxuICAgICAgICAgICAgdmVydGljYWwsXHJcbiAgICAgICAgICAgIGRpYWdvbmFsLFxyXG4gICAgICAgICAgICByZXZlcnNlLFxyXG4gICAgICAgICAgICB3b3JkczogWy4uLndvcmRzXSxcclxuICAgICAgICAgICAgcmVtYWluaW5nV29yZHM6IFsuLi5yZW1haW5pbmdXb3Jkc10sXHJcbiAgICAgICAgICAgIGdyaWQ6IGdyaWQudG9KU09OKCksXHJcbiAgICAgICAgICAgIHBsYWNlbWVudHMsXHJcbiAgICAgICAgICAgIGZvdW5kLFxyXG4gICAgICAgICAgICBhY3Rpdml0eSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShzdGF0ZUtleSwgSlNPTi5zdHJpbmdpZnkoc3RhdGUpKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBsb2FkU3RhdGUoKSB7XHJcbiAgICAgICAgY29uc3QganNvbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKHN0YXRlS2V5KTtcclxuICAgICAgICBpZiAoIWpzb24pIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJObyBzdGF0ZSBmb3VuZC5cIik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHN0YXRlOiBTdGF0ZSA9IEpTT04ucGFyc2UoanNvbik7XHJcbiAgICAgICAgY29uc29sZS5sb2coc3RhdGUpO1xyXG5cclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4oc2V0dGluZ3NXb3JkTGlzdCk7XHJcblxyXG4gICAgICAgIGhvcml6b250YWxDaGVja2JveC5jaGVja2VkID0gc3RhdGUuaG9yaXpvbnRhbDtcclxuICAgICAgICB2ZXJ0aWNhbENoZWNrYm94LmNoZWNrZWQgPSBzdGF0ZS52ZXJ0aWNhbDtcclxuICAgICAgICBkaWFnb25hbENoZWNrYm94LmNoZWNrZWQgPSBzdGF0ZS5kaWFnb25hbDtcclxuICAgICAgICByZXZlcnNlQ2hlY2tib3guY2hlY2tlZCA9IHN0YXRlLnJldmVyc2U7XHJcblxyXG4gICAgICAgIHdvcmRzID0gbmV3IFNldChzdGF0ZS53b3Jkcyk7XHJcbiAgICAgICAgcmVtYWluaW5nV29yZHMgPSBuZXcgU2V0KHN0YXRlLnJlbWFpbmluZ1dvcmRzKTtcclxuICAgICAgICByZWZyZXNoV29yZExpc3Qoc2V0dGluZ3NXb3JkTGlzdCwgd29yZHMsIHdvcmRzKTtcclxuICAgICAgICByZWZyZXNoV29yZExpc3QocmVzdWx0c1dvcmRMaXN0LCB3b3JkcywgcmVtYWluaW5nV29yZHMpO1xyXG5cclxuICAgICAgICBzdWNjZXNzRGl2LmhpZGRlbiA9IHJlbWFpbmluZ1dvcmRzLnNpemUgIT09IDA7XHJcbiAgICAgICAgZ3JpZCA9IG5ldyBMZXR0ZXJHcmlkKHN0YXRlLmdyaWQucm93cywgc3RhdGUuZ3JpZC5jb2xzLCBzdGF0ZS5ncmlkLmxldHRlcnMpO1xyXG4gICAgICAgIHBsYWNlbWVudHMgPSBzdGF0ZS5wbGFjZW1lbnRzO1xyXG4gICAgICAgIGZvdW5kID0gc3RhdGUuZm91bmQ7XHJcblxyXG4gICAgICAgIGlmIChzdGF0ZS5hY3Rpdml0eSA9PT0gQWN0aXZpdHkuU2V0dGluZ3MpIHtcclxuICAgICAgICAgICAgc2V0dGluZ3NEaXYuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHJlc3VsdHNEaXYuaGlkZGVuID0gdHJ1ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzZXR0aW5nc0Rpdi5oaWRkZW4gPSB0cnVlO1xyXG4gICAgICAgICAgICByZXN1bHRzRGl2LmhpZGRlbiA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGFpbnQoY2FudmFzLCBjdHgsIGdyaWQsIGZvdW5kKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZmluZFdvcmRFbGVtKHdvcmRMaXN0OiBIVE1MRGl2RWxlbWVudCwgd29yZDogc3RyaW5nKTogSFRNTERpdkVsZW1lbnQgfCBudWxsIHtcclxuICAgIHdvcmQgPSB3b3JkLnRyaW0oKS50b1VwcGVyQ2FzZSgpO1xyXG5cclxuICAgIGNvbnN0IGVsZW1zID0gQXJyYXkuZnJvbSh3b3JkTGlzdC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxEaXZFbGVtZW50PihcIi53b3JkXCIpKTtcclxuICAgIGZvciAoY29uc3QgZWxlbSBvZiBlbGVtcykge1xyXG4gICAgICAgIGlmIChlbGVtLnRleHRDb250ZW50ID09PSB3b3JkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVXb3JkU2VhcmNoKHJuZzogcmFuZC5STkcsIHdvcmRzOiBTZXQ8c3RyaW5nPiwgb3B0aW9uczogV29yZFNlYXJjaE9wdGlvbnMpOiBXb3JkU2VhcmNoIHwgbnVsbCB7XHJcbiAgICBjb25zdCBob3Jpem9udGFsID0gb3B0aW9ucy5ob3Jpem9udGFsID8/IHRydWU7XHJcbiAgICBjb25zdCB2ZXJ0aWNhbCA9IG9wdGlvbnMudmVydGljYWwgPz8gdHJ1ZTtcclxuICAgIGNvbnN0IGRpYWdvbmFsID0gb3B0aW9ucy5kaWFnb25hbCA/PyB0cnVlO1xyXG4gICAgY29uc3QgcmV2ZXJzZSA9IG9wdGlvbnMucmV2ZXJzZSA/PyB0cnVlO1xyXG4gICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZG9tLmJ5SWQoXCJlcnJvck1lc3NhZ2VcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbiAgICBlcnJvck1lc3NhZ2UudGV4dENvbnRlbnQgPSBcIlwiO1xyXG5cclxuICAgIGlmICh3b3Jkcy5zaXplID09IDApIHtcclxuICAgICAgICBlcnJvck1lc3NhZ2UudGV4dENvbnRlbnQgPSBcIkF0IGxlYXN0IG9uZSB3b3JkIG11c3QgYmUgYWRkZWQgdG8gdGhlIHdvcmQgbGlzdC5cIjtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvLyB2YWxpZGF0aW9uXHJcbiAgICAvLyBtdXN0IGNoZWNrIGF0IGxlYXN0IG9uZSBvZiB0aGUgZGlyZWN0aW9uYWwgY2hlY2tib3hlc1xyXG4gICAgaWYgKCFob3Jpem9udGFsICYmICF2ZXJ0aWNhbCAmJiAhZGlhZ29uYWwgJiYgIXJldmVyc2UpIHtcclxuICAgICAgICBlcnJvck1lc3NhZ2UudGV4dENvbnRlbnQgPSBcIk11c3QgY2hvb3NlIGF0IGxlYXN0IG9uZSBvZiBob3Jpem9udGFsLCB2ZXJ0aWNhbCwgZGlhZ29uYWwsIG9yIHJldmVyc2UuXCI7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgLy8ga2VlcCBpbmNyZWFzaW5nIGdyaWQgc2l6ZSB1bnRpbCB3b3JkcyBjYW4gYmUgcGxhY2VkXHJcbiAgICBsZXQgc2l6ZSA9IDM7XHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgIGNvbnN0IGdyaWQgPSBuZXcgTGV0dGVyR3JpZChzaXplLCBzaXplKTtcclxuICAgICAgICBjb25zdCBwbGFjZW1lbnRzID0gcGxhY2VXb3JkcyhybmcsIGdyaWQsIHdvcmRzLCBob3Jpem9udGFsLCB2ZXJ0aWNhbCwgZGlhZ29uYWwsIHJldmVyc2UpO1xyXG4gICAgICAgIGlmIChwbGFjZW1lbnRzKSB7XHJcbiAgICAgICAgICAgIGZpbGxSYW5kb21DaGFyYWN0ZXJzKHJuZywgZ3JpZCwgd29yZHMpO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgZ3JpZCxcclxuICAgICAgICAgICAgICAgIHBsYWNlbWVudHNcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICsrc2l6ZTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VXb3JkcyhcclxuICAgIHJuZzogcmFuZC5STkcsXHJcbiAgICBncmlkOiBMZXR0ZXJHcmlkLFxyXG4gICAgd29yZHM6IFNldDxzdHJpbmc+LFxyXG4gICAgaG9yaXpvbnRhbDogYm9vbGVhbixcclxuICAgIHZlcnRpY2FsOiBib29sZWFuLFxyXG4gICAgZGlhZ29uYWw6IGJvb2xlYW4sXHJcbiAgICByZXZlcnNlOiBib29sZWFuKTogQ29vcmRzUmFuZ2VbXSB8IG51bGwge1xyXG4gICAgY29uc3QgZGlycyA9IGdldERpcnMoaG9yaXpvbnRhbCwgdmVydGljYWwsIGRpYWdvbmFsLCByZXZlcnNlKTtcclxuICAgIGNvbnN0IHBsYWNlbWVudHMgPSBuZXcgQXJyYXk8Q29vcmRzUmFuZ2U+KCk7XHJcblxyXG4gICAgZm9yIChjb25zdCB3b3JkIG9mIHdvcmRzKSB7XHJcbiAgICAgICAgY29uc3QgcGxhY2VtZW50ID0gdHJ5UGxhY2VXb3JkKHJuZywgZ3JpZCwgZGlycywgd29yZCk7XHJcbiAgICAgICAgaWYgKCFwbGFjZW1lbnQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwbGFjZW1lbnRzLnB1c2gocGxhY2VtZW50KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcGxhY2VtZW50cztcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0RGlycyhob3Jpem9udGFsOiBib29sZWFuLCB2ZXJ0aWNhbDogYm9vbGVhbiwgZGlhZ29uYWw6IGJvb2xlYW4sIHJldmVyc2U6IGJvb2xlYW4pOiBDb29yZHNbXSB7XHJcbiAgICBjb25zdCBkaXJzID0gbmV3IEFycmF5PENvb3Jkcz4oKTtcclxuXHJcbiAgICBpZiAoaG9yaXpvbnRhbCkge1xyXG4gICAgICAgIGRpcnMucHVzaCh7IGk6IDAsIGo6IDEgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHZlcnRpY2FsKSB7XHJcbiAgICAgICAgZGlycy5wdXNoKHsgaTogMSwgajogMCB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZGlhZ29uYWwpIHtcclxuICAgICAgICBkaXJzLnB1c2goeyBpOiAxLCBqOiAxIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChyZXZlcnNlICYmIGhvcml6b250YWwpIHtcclxuICAgICAgICBkaXJzLnB1c2goeyBpOiAwLCBqOiAtMSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmV2ZXJzZSAmJiB2ZXJ0aWNhbCkge1xyXG4gICAgICAgIGRpcnMucHVzaCh7IGk6IC0xLCBqOiAwIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChyZXZlcnNlICYmIGRpYWdvbmFsKSB7XHJcbiAgICAgICAgZGlycy5wdXNoKHsgaTogMSwgajogLTEgfSk7XHJcbiAgICAgICAgZGlycy5wdXNoKHsgaTogLTEsIGo6IDEgfSk7XHJcbiAgICAgICAgZGlycy5wdXNoKHsgaTogLTEsIGo6IC0xIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBkaXJzO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0cnlQbGFjZVdvcmQocm5nOiByYW5kLlJORywgZ3JpZDogTGV0dGVyR3JpZCwgZGlyczogQ29vcmRzW10sIHdvcmQ6IHN0cmluZyk6IENvb3Jkc1JhbmdlIHwgbnVsbCB7XHJcbiAgICBjb25zdCBwbGFjZW1lbnQgPSB0cnlGaW5kV29yZFBsYWNlbWVudChybmcsIGdyaWQsIGRpcnMsIHdvcmQpO1xyXG4gICAgaWYgKCFwbGFjZW1lbnQpIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBwbGFjZVdvcmQoZ3JpZCwgd29yZCwgcGxhY2VtZW50KTtcclxuICAgIHJldHVybiBwbGFjZW1lbnQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeUZpbmRXb3JkUGxhY2VtZW50KHJuZzogcmFuZC5STkcsIGdyaWQ6IExldHRlckdyaWQsIGRpcmVjdGlvbnM6IENvb3Jkc1tdLCB3b3JkOiBzdHJpbmcpOiBDb29yZHNSYW5nZSB8IG51bGwge1xyXG4gICAgY29uc3QgbWF4RGltID0gTWF0aC5tYXgoZ3JpZC5yb3dzLCBncmlkLmNvbHMpO1xyXG4gICAgaWYgKHdvcmQubGVuZ3RoID4gbWF4RGltKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGxcclxuICAgIH1cclxuXHJcbiAgICAvLyB0cnkgcGxhY2luZyBhdCBldmVyeSBwb3NzaWJsZSBjZWxsXHJcbiAgICBjb25zdCBncmlkQ29vcmRzID0gbmV3IEFycmF5PENvb3Jkcz4oKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ3JpZC5yb3dzOyArK2kpIHtcclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGdyaWQuY29sczsgKytqKSB7XHJcbiAgICAgICAgICAgIGdyaWRDb29yZHMucHVzaCh7IGksIGogfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGRpciA9IHJhbmQuY2hvb3NlKHJuZywgZGlyZWN0aW9ucyk7XHJcbiAgICByYW5kLnNodWZmbGUocm5nLCBncmlkQ29vcmRzKTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IHN0YXJ0IG9mIGdyaWRDb29yZHMpIHtcclxuICAgICAgICBpZiAoaXNWYWxpZFdvcmRQbGFjZW1lbnQoZ3JpZCwgd29yZCwgc3RhcnQsIGRpcikpIHtcclxuICAgICAgICAgICAgY29uc3QgZW5kID0ge1xyXG4gICAgICAgICAgICAgICAgaTogc3RhcnQuaSArIGRpci5pICogKHdvcmQubGVuZ3RoIC0gMSksXHJcbiAgICAgICAgICAgICAgICBqOiBzdGFydC5qICsgZGlyLmogKiAod29yZC5sZW5ndGggLSAxKSxcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdGFydCxcclxuICAgICAgICAgICAgICAgIGVuZCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmFsaWRXb3JkUGxhY2VtZW50KGdyaWQ6IExldHRlckdyaWQsIHdvcmQ6IHN0cmluZywgc3RhcnQ6IENvb3JkcywgZGlyOiBDb29yZHMpOiBib29sZWFuIHtcclxuICAgIGlmIChzdGFydC5pIDwgMCB8fCBzdGFydC5qIDwgMCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChzdGFydC5pID49IGdyaWQucm93cyB8fCBzdGFydC5qID49IGdyaWQucm93cykge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB7IGk6IGkwLCBqOiBqMCB9ID0gc3RhcnQ7XHJcbiAgICBjb25zdCBsZXR0ZXJzID0gd29yZC5zcGxpdChcIlwiKTtcclxuICAgIGNvbnN0IHN1Y2Nlc3MgPSBsZXR0ZXJzLmV2ZXJ5KChjaCwgaWR4KSA9PiB7XHJcbiAgICAgICAgY29uc3QgaSA9IGkwICsgZGlyLmkgKiBpZHg7XHJcbiAgICAgICAgY29uc3QgaiA9IGowICsgZGlyLmogKiBpZHg7XHJcblxyXG4gICAgICAgIGlmIChpIDwgMCB8fCBpID49IGdyaWQucm93cykge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaiA8IDAgfHwgaiA+PSBncmlkLmNvbHMpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGdyaWQuZ2V0KGksIGopID09PSBjaCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghZ3JpZC5nZXQoaSwgaikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBleGNlcHRpb246IGZ1bGwgb3ZlcmxhcCAoaS5lLiBwcmVmaXggb3ZlcmxhcHBpbmcgbG9uZ2VyIHdvcmQpIHNob3VsZCBub3QgYmUgY29uc2lkZXJlZCB2YWxpZFxyXG4gICAgaWYgKGxldHRlcnMuZXZlcnkoKGNoLCBpZHgpID0+IHtcclxuICAgICAgICBjb25zdCBpID0gaTAgKyBkaXIuaSAqIGlkeDtcclxuICAgICAgICBjb25zdCBqID0gajAgKyBkaXIuaiAqIGlkeDtcclxuICAgICAgICByZXR1cm4gZ3JpZC5nZXQoaSwgaikgPT09IGNoXHJcbiAgICB9KSkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzdWNjZXNzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZVdvcmQoZ3JpZDogTGV0dGVyR3JpZCwgd29yZDogc3RyaW5nLCBwbGFjZW1lbnQ6IENvb3Jkc1JhbmdlKSB7XHJcbiAgICBjb25zdCB7IHN0YXJ0LCBlbmQgfSA9IHBsYWNlbWVudDtcclxuICAgIGNvbnN0IHsgaTogaTAsIGo6IGowIH0gPSBzdGFydDtcclxuICAgIGNvbnN0IGRpciA9IGdldERpcihzdGFydCwgZW5kKTtcclxuICAgIGlmICghZGlyKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHBsYWNlbWVudCBkaXIgJHtzdGFydH0gLSAke2VuZH1gKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBsZXR0ZXJzID0gd29yZC5zcGxpdChcIlwiKTtcclxuICAgIGxldHRlcnMuZm9yRWFjaCgoY2gsIGlkeCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGkgPSBpMCArIGRpci5pICogaWR4O1xyXG4gICAgICAgIGNvbnN0IGogPSBqMCArIGRpci5qICogaWR4O1xyXG4gICAgICAgIGdyaWQuc2V0KGksIGosIGNoKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaWxsUmFuZG9tQ2hhcmFjdGVycyhybmc6IHJhbmQuUk5HLCBncmlkOiBMZXR0ZXJHcmlkLCB3b3JkczogU2V0PHN0cmluZz4pIHtcclxuICAgIC8vIGdlbmVyYXRlIGNoYXJhY3RlciBsaXN0IGZyb20gd29yZHNcclxuXHJcbiAgICAvLyBnZXQgYSBmbGF0IGxpc3Qgb2YgYWxsIGxldHRlcnMgaW4gYWxsIHdvcmRzXHJcbiAgICBjb25zdCBjaGFyc1NldCA9IG5ldyBTZXQ8c3RyaW5nPihbXCJBXCIsIFwiQlwiLCBcIkNcIiwgXCJEXCIsIFwiRVwiLCBcIkZcIiwgXCJHXCIsIFwiSFwiLCBcIklcIiwgXCJKXCIsIFwiS1wiLCBcIkxcIiwgXCJNXCIsIFwiTlwiLCBcIk9cIiwgXCJQXCIsIFwiUVwiLCBcIlJcIiwgXCJTXCIsIFwiVFwiLCBcIlVcIiwgXCJWXCIsIFwiV1wiLCBcIlhcIiwgXCJZXCIsIFwiWlwiXSk7XHJcbiAgICB3b3Jkcy5mb3JFYWNoKHcgPT4gdy5zcGxpdChcIlwiKS5mb3JFYWNoKGNoID0+IGNoYXJzU2V0LmFkZChjaCkpKTtcclxuICAgIGNvbnN0IGNoYXJzID0gWy4uLmNoYXJzU2V0XTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGdyaWQucm93czsgKytpKSB7XHJcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBncmlkLmNvbHM7ICsraikge1xyXG4gICAgICAgICAgICBpZiAoZ3JpZC5nZXQoaSwgaikpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjaCA9IHJhbmQuY2hvb3NlKHJuZywgY2hhcnMpO1xyXG4gICAgICAgICAgICBncmlkLnNldChpLCBqLCBjaCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwYWludChjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50LCBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgZ3JpZDogTGV0dGVyR3JpZCwgZm91bmQ6IENvb3Jkc1JhbmdlW10sIHNlbGVjdGlvbjogQ29vcmRzUmFuZ2UgfCBudWxsID0gbnVsbCkge1xyXG4gICAgY29uc3QgZm9udCA9IFwiMjRweCBtb25vc3BhY2VcIjtcclxuICAgIGN0eC5mb250ID0gZm9udDtcclxuICAgIGNvbnN0IGxldHRlclNpemUgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoO1xyXG4gICAgY29uc3QgY2VsbFNpemUgPSBsZXR0ZXJTaXplICsgcGFkZGluZyAqIDI7XHJcbiAgICBjYW52YXMud2lkdGggPSBjZWxsU2l6ZSAqIGdyaWQuY29scztcclxuICAgIGNhbnZhcy5oZWlnaHQgPSBjZWxsU2l6ZSAqIGdyaWQucm93cztcclxuICAgIC8vIGNhbnZhcy5zdHlsZS53aWR0aCA9IGAke2NhbnZhcy53aWR0aH1weGA7XHJcbiAgICAvLyBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gYCR7Y2FudmFzLmhlaWdodH1weGA7XHJcblxyXG4gICAgY3R4LmZvbnQgPSBmb250O1xyXG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiYmxhY2tcIjtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGdyaWQucm93czsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgeSA9IGkgKiBjZWxsU2l6ZSArIHBhZGRpbmcgKyBsZXR0ZXJTaXplO1xyXG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZ3JpZC5jb2xzOyArK2opIHtcclxuICAgICAgICAgICAgY29uc3QgeCA9IGogKiBjZWxsU2l6ZSArIHBhZGRpbmc7XHJcbiAgICAgICAgICAgIGN0eC5maWxsVGV4dChncmlkLmdldChpLCBqKSwgeCwgeSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChzZWxlY3Rpb24pIHtcclxuICAgICAgICBjb25zdCB4eTAgPSBncmlkVG9DYW52YXNDb29yZHMoY3R4LCBzZWxlY3Rpb24uc3RhcnQpO1xyXG4gICAgICAgIGNvbnN0IHh5MSA9IGdyaWRUb0NhbnZhc0Nvb3JkcyhjdHgsIHNlbGVjdGlvbi5lbmQpO1xyXG4gICAgICAgIGNvbnN0IHgwID0geHkwLnggKyBjZWxsU2l6ZSAvIDI7XHJcbiAgICAgICAgY29uc3QgeTAgPSB4eTAueSArIGNlbGxTaXplIC8gMjtcclxuICAgICAgICBjb25zdCB4MSA9IHh5MS54ICsgY2VsbFNpemUgLyAyO1xyXG4gICAgICAgIGNvbnN0IHkxID0geHkxLnkgKyBjZWxsU2l6ZSAvIDI7XHJcblxyXG4gICAgICAgIC8vIGRvIGdyaWQgY29vcmRzIHJlcHJlc2VudCBhIHN0cmFpZ2h0IGxpbmU/XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZWRcIjtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gNDtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyh4MCwgeTApO1xyXG4gICAgICAgIGN0eC5saW5lVG8oeDEsIHkxKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCBzZWxlY3Rpb24gb2YgZm91bmQpIHtcclxuICAgICAgICBjb25zdCB4eTAgPSBncmlkVG9DYW52YXNDb29yZHMoY3R4LCBzZWxlY3Rpb24uc3RhcnQpO1xyXG4gICAgICAgIGNvbnN0IHh5MSA9IGdyaWRUb0NhbnZhc0Nvb3JkcyhjdHgsIHNlbGVjdGlvbi5lbmQpO1xyXG4gICAgICAgIGNvbnN0IHgwID0geHkwLnggKyBjZWxsU2l6ZSAvIDI7XHJcbiAgICAgICAgY29uc3QgeTAgPSB4eTAueSArIGNlbGxTaXplIC8gMjtcclxuICAgICAgICBjb25zdCB4MSA9IHh5MS54ICsgY2VsbFNpemUgLyAyO1xyXG4gICAgICAgIGNvbnN0IHkxID0geHkxLnkgKyBjZWxsU2l6ZSAvIDI7XHJcblxyXG4gICAgICAgIC8vIGRvIGdyaWQgY29vcmRzIHJlcHJlc2VudCBhIHN0cmFpZ2h0IGxpbmU/XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDAsIDI1NSwgMCwgMC41KVwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSA0O1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHgubW92ZVRvKHgwLCB5MCk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh4MSwgeTEpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2FudmFzVG9HcmlkQ29vcmRzKGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCB4eTogUG9pbnQpOiBDb29yZHMge1xyXG4gICAgY29uc3QgbGV0dGVyU2l6ZSA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGg7XHJcbiAgICBjb25zdCBjZWxsU2l6ZSA9IGxldHRlclNpemUgKyBwYWRkaW5nICogMjtcclxuICAgIGNvbnN0IHsgeCwgeSB9ID0geHk7XHJcbiAgICBjb25zdCBpID0gTWF0aC5mbG9vcigoeSAtIHBhZGRpbmcpIC8gY2VsbFNpemUpO1xyXG4gICAgY29uc3QgaiA9IE1hdGguZmxvb3IoKHggLSBwYWRkaW5nKSAvIGNlbGxTaXplKTtcclxuICAgIHJldHVybiB7IGksIGogfTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ3JpZFRvQ2FudmFzQ29vcmRzKGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCBpajogQ29vcmRzKTogUG9pbnQge1xyXG4gICAgY29uc3QgbGV0dGVyU2l6ZSA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGg7XHJcbiAgICBjb25zdCBjZWxsU2l6ZSA9IGxldHRlclNpemUgKyBwYWRkaW5nICogMjtcclxuICAgIGNvbnN0IHsgaSwgaiB9ID0gaWo7XHJcbiAgICBjb25zdCB4ID0gaiAqIGNlbGxTaXplO1xyXG4gICAgY29uc3QgeSA9IGkgKiBjZWxsU2l6ZTtcclxuICAgIHJldHVybiB7IHgsIHkgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Q29udGV4dDJEKGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpOiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQge1xyXG4gICAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgIGlmICghY3R4KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gY2FudmFzIHN1cHBvcnRcIik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGN0eDtcclxufVxyXG5cclxuZnVuY3Rpb24gY29vcmRzRXF1YWwoYTogQ29vcmRzLCBiOiBDb29yZHMpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBhLmkgPT0gYi5pICYmIGEuaiA9PSBiLmo7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldERpcihpajA6IENvb3JkcywgaWoxOiBDb29yZHMpOiBDb29yZHMgfCBudWxsIHtcclxuICAgIGNvbnN0IGRpID0gaWoxLmkgLSBpajAuaTtcclxuICAgIGNvbnN0IGRqID0gaWoxLmogLSBpajAuajtcclxuXHJcbiAgICBpZiAoZGkgPT09IDAgJiYgZGogPT09IDApIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZGkgIT09IDAgJiYgZGogIT09IDAgJiYgTWF0aC5hYnMoZGkpICE9PSBNYXRoLmFicyhkaikpIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geyBpOiBNYXRoLnNpZ24oZGkpLCBqOiBNYXRoLnNpZ24oZGopIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZVVuc2VsZWN0ZWRMZXR0ZXJzKGdyaWQ6IExldHRlckdyaWQsIHNlbGVjdGlvbnM6IENvb3Jkc1JhbmdlW10pIHtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ3JpZC5yb3dzOyArK2kpIHtcclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGdyaWQuY29sczsgKytqKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvb3JkcyA9IHsgaSwgaiB9O1xyXG4gICAgICAgICAgICBpZiAoc2VsZWN0aW9ucy5zb21lKHggPT4gc2VsZWN0aW9uQ29udGFpbnMoeCwgY29vcmRzKSkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBncmlkLnNldChpLCBqLCBcIiBcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzZWxlY3Rpb25Db250YWlucyhzZWxlY3Rpb246IENvb3Jkc1JhbmdlLCBpajogQ29vcmRzKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCBkaXIgPSBnZXREaXIoc2VsZWN0aW9uLnN0YXJ0LCBzZWxlY3Rpb24uZW5kKTtcclxuICAgIGlmICghZGlyKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHsgc3RhcnQsIGVuZCB9ID0gc2VsZWN0aW9uO1xyXG4gICAgbGV0IHsgaSwgaiB9ID0gc3RhcnQ7XHJcbiAgICB3aGlsZSAoaSA+PSAwICYmIGogPj0gMCkge1xyXG4gICAgICAgIGlmIChpID09IGlqLmkgJiYgaiA9PSBpai5qKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGkgPT09IGVuZC5pICYmIGogPT09IGVuZC5qKSB7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaSArPSBkaXIuaTtcclxuICAgICAgICBqICs9IGRpci5qO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdFNlbGVjdGlvbihncmlkOiBMZXR0ZXJHcmlkLCBzZWxlY3Rpb246IENvb3Jkc1JhbmdlKTogc3RyaW5nIHtcclxuICAgIC8vIGNoZWNrIGRpcmVjdGlvbiAtIGlmIGlqMCB0byBpajEgaXMgbm90IGhvcml6b250YWwsIHZlcnRpY2FsLCBvciBkaWFnb25hbCwgbm8gbWF0Y2ggcG9zc2libGVcclxuICAgIGNvbnN0IHsgc3RhcnQsIGVuZCB9ID0gc2VsZWN0aW9uO1xyXG4gICAgY29uc3QgZGlyID0gZ2V0RGlyKHN0YXJ0LCBlbmQpO1xyXG4gICAgaWYgKCFkaXIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgc2VsZWN0aW9uIGRpcmVjdGlvbiAke3N0YXJ0fSAtICR7ZW5kfWApXHJcbiAgICB9XHJcblxyXG4gICAgLy8gZXh0cmFjdCBzZWxlY3RlZCB3b3JkXHJcbiAgICBsZXQgeyBpLCBqIH0gPSBzZWxlY3Rpb24uc3RhcnQ7XHJcbiAgICBsZXQgcyA9IFwiXCI7XHJcblxyXG4gICAgd2hpbGUgKGkgPj0gMCAmJiBpIDwgZ3JpZC5yb3dzICYmIGogPj0gMCAmJiBqIDwgZ3JpZC5jb2xzKSB7XHJcbiAgICAgICAgcyArPSBncmlkLmdldChpLCBqKTtcclxuXHJcbiAgICAgICAgaWYgKGkgPT09IGVuZC5pICYmIGogPT09IGVuZC5qKSB7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaSArPSBkaXIuaTtcclxuICAgICAgICBqICs9IGRpci5qO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZWZyZXNoV29yZExpc3QoZGl2OiBIVE1MRGl2RWxlbWVudCwgd29yZHM6IFNldDxzdHJpbmc+LCByZW1haW5pbmdXb3JkczogU2V0PHN0cmluZz4pIHtcclxuICAgIGNvbnN0IGxpc3QgPSBbLi4ud29yZHNdO1xyXG4gICAgbGlzdC5zb3J0KCk7XHJcblxyXG4gICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKGRpdik7XHJcbiAgICBmb3IgKGNvbnN0IHdvcmQgb2YgbGlzdCkge1xyXG4gICAgICAgIGNvbnN0IHdvcmREaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgICAgIHdvcmREaXYuY2xhc3NMaXN0LmFkZChcIndvcmRcIik7XHJcblxyXG4gICAgICAgIGlmICghcmVtYWluaW5nV29yZHMuaGFzKHdvcmQpKSB7XHJcbiAgICAgICAgICAgIHdvcmREaXYuY2xhc3NMaXN0LmFkZChcImZvdW5kXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgd29yZFRleHQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh3b3JkKTtcclxuICAgICAgICB3b3JkRGl2LmFwcGVuZENoaWxkKHdvcmRUZXh0KVxyXG4gICAgICAgIGRpdi5hcHBlbmRDaGlsZCh3b3JkRGl2KTtcclxuICAgIH1cclxufVxyXG5cclxubWFpbigpIl19