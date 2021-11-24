"use strict";
import * as dom from "../shared/dom.js";
import * as rand from "../shared/rand.js";
import * as array from "../shared/array.js";
const padding = 4;
class LetterGrid {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.letters = array.generate(rows * cols, _ => "");
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
}
function main() {
    const wordInput = dom.byId("word");
    const settingsWordList = dom.byId("settingsWordList");
    const addWordButton = dom.byId("addWord");
    const generateButton = dom.byId("generateButton");
    const saveSettingsButton = dom.byId("saveSettings");
    const loadSettingsButton = dom.byId("loadSettings");
    const returnToSettingsButton = dom.byId("returnToSettings");
    const resetButton = dom.byId("resetButton");
    const minRowsInput = dom.byId("minRows");
    const minColsInput = dom.byId("minCols");
    const horizontalCheckbox = dom.byId("horizontal");
    const verticalCheckbox = dom.byId("vertical");
    const diagonalCheckbox = dom.byId("diagonal");
    const reverseCheckbox = dom.byId("reverse");
    const settingsDiv = dom.byId("settings");
    const resultsDiv = dom.byId("results");
    const successDiv = dom.byId("success");
    const settingsKey = "wordSearchSettings";
    const seed = rand.xmur3(new Date().toString());
    const rng = new rand.SFC32RNG(seed(), seed(), seed(), seed());
    const canvas = dom.byId("gridCanvas");
    const ctx = getContext2D(canvas);
    const resultsWordList = dom.byId("resultsWordList");
    const selections = new Array();
    let words = new Set();
    let grid = new LetterGrid(0, 0);
    let placements = new Array();
    let selectStartCoords = null;
    loadSettings();
    wordInput.addEventListener("keydown", (evt) => {
        if (evt.key !== "Enter") {
            return;
        }
        if (!wordInput.value) {
            return;
        }
        addWord(settingsWordList, wordInput.value);
        wordInput.value = "";
    });
    addWordButton.addEventListener("click", _ => {
        if (!wordInput.value) {
            return;
        }
        addWord(settingsWordList, wordInput.value);
        wordInput.value = "";
        wordInput.focus();
    });
    generateButton.addEventListener("click", _ => {
        const settings = getSettings();
        let wordSearch = generateWordSearch(rng, settings);
        if (!wordSearch) {
            return;
        }
        successDiv.hidden = true;
        words = wordSearch.words;
        grid = wordSearch.grid;
        placements = wordSearch.placements;
        selections.splice(0, selections.length);
        settingsDiv.hidden = true;
        resultsDiv.hidden = false;
        paint(canvas, ctx, grid, selections);
        dom.removeAllChildren(resultsWordList);
        for (const word of settings.words) {
            addWord(resultsWordList, word);
        }
    });
    saveSettingsButton.addEventListener("click", _ => {
        const settings = getSettings();
        localStorage.setItem(settingsKey, JSON.stringify(settings));
    });
    loadSettingsButton.addEventListener("click", loadSettings);
    resetButton.addEventListener("click", _ => {
        minRowsInput.value = "";
        minColsInput.value = "";
        var wordDivs = Array.from(settingsWordList.querySelectorAll("#settingsWordList .word"));
        for (const div of wordDivs) {
            div.remove();
        }
    });
    returnToSettingsButton.addEventListener("click", _ => {
        settingsDiv.hidden = false;
        resultsDiv.hidden = true;
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
    function getSettings() {
        const minRows = parseInt(minRowsInput.value) || 0;
        const minCols = parseInt(minColsInput.value) || 0;
        const words = [...getWords(settingsWordList)];
        const horizontal = horizontalCheckbox.checked;
        const vertical = verticalCheckbox.checked;
        const diagonal = diagonalCheckbox.checked;
        const reverse = reverseCheckbox.checked;
        return {
            minRows: minRows,
            minCols: minCols,
            words: words,
            horizontal: horizontal,
            vertical: vertical,
            diagonal: diagonal,
            reverse: reverse,
        };
    }
    function loadSettings() {
        const json = localStorage.getItem(settingsKey);
        if (!json) {
            console.log("No stored settings found");
            return;
        }
        const settings = JSON.parse(json);
        dom.removeAllChildren(settingsWordList);
        if (settings.minRows) {
            minRowsInput.value = settings.minRows.toString();
        }
        else {
            minRowsInput.value = "";
        }
        if (settings.minCols) {
            minColsInput.value = settings.minCols.toString();
        }
        else {
            minColsInput.value = "";
        }
        horizontalCheckbox.checked = settings.horizontal;
        verticalCheckbox.checked = settings.vertical;
        diagonalCheckbox.checked = settings.diagonal;
        reverseCheckbox.checked = settings.reverse;
        if (!settings.words) {
            return;
        }
        for (const word of settings.words) {
            addWord(settingsWordList, word);
        }
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
        selections.push(selection);
        words.delete(word);
        // check for completion
        if (words.size === 0) {
            // remove all unselected letters
            removeUnselectedLetters(grid, selections);
            successDiv.hidden = false;
        }
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
        paint(canvas, ctx, grid, selections, { start: selectStartCoords, end: coords });
    }
    function dragEnd() {
        selectStartCoords = null;
        paint(canvas, ctx, grid, selections, null);
    }
}
function addWord(wordList, word) {
    word = word.trim().toUpperCase();
    const words = getWords(wordList);
    words.add(word);
    const list = [...words];
    list.sort();
    dom.removeAllChildren(wordList);
    for (const word of list) {
        const wordDiv = document.createElement("div");
        wordDiv.classList.add("word");
        const wordText = document.createTextNode(word);
        wordDiv.appendChild(wordText);
        wordList.appendChild(wordDiv);
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
function getWords(wordList) {
    const words = Array.from(wordList.querySelectorAll(".word"))
        .map(div => { var _a, _b; return (_b = (_a = div === null || div === void 0 ? void 0 : div.textContent) === null || _a === void 0 ? void 0 : _a.toUpperCase()) !== null && _b !== void 0 ? _b : ""; })
        .sort((x, y) => y.length - x.length);
    return new Set(words);
}
function generateWordSearch(rng, settings) {
    const { words: wordsArray, minRows, minCols, horizontal, vertical, diagonal, reverse } = settings;
    const words = new Set(wordsArray);
    const errorMessage = dom.byId("errorMessage");
    errorMessage.textContent = "";
    // validation
    // must check at least one of the directional checkboxes
    if (!horizontal && !vertical && !diagonal && !reverse) {
        errorMessage.textContent = "Must choose at least one of horizontal, vertical, diagonal, or reverse.";
        return null;
    }
    const maxRetries = 128;
    for (let i = 0; i < maxRetries; ++i) {
        const grid = new LetterGrid(minRows + i, minCols + i);
        const placements = placeWords(rng, grid, words, horizontal, vertical, diagonal, reverse);
        if (placements) {
            fillRandomCharacters(rng, grid, words);
            return {
                words,
                grid,
                placements
            };
        }
    }
    errorMessage.textContent = "Failed to generate word search - please modify word list and/or grid size and try again";
    return null;
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
function paint(canvas, ctx, grid, selections, selection = null) {
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
    for (const selection of selections) {
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
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZHNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndvcmRzZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDO0FBQ2IsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQztBQUN4QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUM7QUFnQzVDLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQztBQUVsQixNQUFNLFVBQVU7SUFHWixZQUFxQixJQUFZLEVBQVcsSUFBWTtRQUFuQyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQVcsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNwRCxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxJQUFJLENBQUMsR0FBVztRQUNaLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsSUFBSSxDQUFDLEdBQVcsRUFBRSxFQUFVO1FBQ3hCLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDZixNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7U0FDakU7UUFFRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFRCxJQUFJLENBQUMsR0FBVyxFQUFFLEdBQVc7UUFDekIsT0FBTyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7SUFDakMsQ0FBQztJQUVELElBQUksQ0FBQyxHQUFXO1FBQ1osTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFD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QUFFLEdBQUcsQ0FBQyxDQUFDO0lBQy9CLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDTixNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixLQUFLLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQTtLQUNuRTtJQUVELHdCQUF3QjtJQUN4QixJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUM7SUFDL0IsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBRVgsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUU7UUFDdkQsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBCLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDNUIsTUFBTTtTQUNUO1FBRUQsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDWCxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztLQUNkO0lBRUQsT0FBTyxDQUFDLENBQUM7QUFDYixDQUFDO0FBRUQsSUFBSSxFQUFFLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCI7XHJcbmltcG9ydCAqIGFzIHJhbmQgZnJvbSBcIi4uL3NoYXJlZC9yYW5kLmpzXCI7XHJcbmltcG9ydCAqIGFzIGFycmF5IGZyb20gXCIuLi9zaGFyZWQvYXJyYXkuanNcIjtcclxuXHJcbmludGVyZmFjZSBTZXR0aW5ncyB7XHJcbiAgICBtaW5Sb3dzOiBudW1iZXJcclxuICAgIG1pbkNvbHM6IG51bWJlclxyXG4gICAgaG9yaXpvbnRhbDogYm9vbGVhblxyXG4gICAgdmVydGljYWw6IGJvb2xlYW5cclxuICAgIGRpYWdvbmFsOiBib29sZWFuXHJcbiAgICByZXZlcnNlOiBib29sZWFuXHJcbiAgICB3b3Jkczogc3RyaW5nW10sXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBhIHJvdy9jb2x1bW4gd2l0aGluIHRoZSBncmlkXHJcbiAqL1xyXG5pbnRlcmZhY2UgQ29vcmRzIHtcclxuICAgIC8qKnJvdyB3aXRoaW4gZ3JpZCAqL1xyXG4gICAgaTogbnVtYmVyLFxyXG4gICAgLyoqY29sdW1uIHdpdGhpbiBncmlkICovXHJcbiAgICBqOiBudW1iZXIsXHJcbn1cclxuXHJcbmludGVyZmFjZSBQb2ludCB7XHJcbiAgICB4OiBudW1iZXIsXHJcbiAgICB5OiBudW1iZXJcclxufVxyXG5cclxuaW50ZXJmYWNlIFNlbGVjdGlvbiB7XHJcbiAgICBzdGFydDogQ29vcmRzXHJcbiAgICBlbmQ6IENvb3Jkc1xyXG59XHJcblxyXG5jb25zdCBwYWRkaW5nID0gNDtcclxuXHJcbmNsYXNzIExldHRlckdyaWQge1xyXG4gICAgbGV0dGVyczogc3RyaW5nW11cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihyZWFkb25seSByb3dzOiBudW1iZXIsIHJlYWRvbmx5IGNvbHM6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMubGV0dGVycyA9IGFycmF5LmdlbmVyYXRlKHJvd3MgKiBjb2xzLCBfID0+IFwiXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldGYoaWR4OiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmxldHRlcnNbaWR4XTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRmKGlkeDogbnVtYmVyLCBjaDogc3RyaW5nKSB7XHJcbiAgICAgICAgaWYgKGNoLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBiZSBhIHNpbmdsZSBjaGFyYWN0ZXIgb3IgZW1wdHkgc3RyaW5nXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubGV0dGVyc1tpZHhdID0gY2g7XHJcbiAgICB9XHJcblxyXG4gICAgZmxhdChyb3c6IG51bWJlciwgY29sOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiByb3cgKiB0aGlzLmNvbHMgKyBjb2w7XHJcbiAgICB9XHJcblxyXG4gICAgaGllcihpZHg6IG51bWJlcik6IENvb3JkcyB7XHJcbiAgICAgICAgY29uc3QgaSA9IE1hdGguZmxvb3IoaWR4IC8gdGhpcy5jb2xzKTtcclxuICAgICAgICBjb25zdCBqID0gaWR4ICUgdGhpcy5jb2xzO1xyXG4gICAgICAgIHJldHVybiB7IGksIGogfTtcclxuICAgIH1cclxuXHJcbiAgICBnZXQocm93OiBudW1iZXIsIGNvbDogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5nZXRmKHRoaXMuZmxhdChyb3csIGNvbCkpO1xyXG4gICAgfVxyXG5cclxuICAgIHNldChyb3c6IG51bWJlciwgY29sOiBudW1iZXIsIGNoOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLnNldGYodGhpcy5mbGF0KHJvdywgY29sKSwgY2gpO1xyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgV29yZFNlYXJjaCB7XHJcbiAgICB3b3JkczogU2V0PHN0cmluZz5cclxuICAgIGdyaWQ6IExldHRlckdyaWRcclxuICAgIHBsYWNlbWVudHM6IFNlbGVjdGlvbltdXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1haW4oKSB7XHJcbiAgICBjb25zdCB3b3JkSW5wdXQgPSBkb20uYnlJZChcIndvcmRcIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XHJcbiAgICBjb25zdCBzZXR0aW5nc1dvcmRMaXN0ID0gZG9tLmJ5SWQoXCJzZXR0aW5nc1dvcmRMaXN0XCIpIGFzIEhUTUxEaXZFbGVtZW50O1xyXG4gICAgY29uc3QgYWRkV29yZEJ1dHRvbiA9IGRvbS5ieUlkKFwiYWRkV29yZFwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IGdlbmVyYXRlQnV0dG9uID0gZG9tLmJ5SWQoXCJnZW5lcmF0ZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IHNhdmVTZXR0aW5nc0J1dHRvbiA9IGRvbS5ieUlkKFwic2F2ZVNldHRpbmdzXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50O1xyXG4gICAgY29uc3QgbG9hZFNldHRpbmdzQnV0dG9uID0gZG9tLmJ5SWQoXCJsb2FkU2V0dGluZ3NcIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XHJcbiAgICBjb25zdCByZXR1cm5Ub1NldHRpbmdzQnV0dG9uID0gZG9tLmJ5SWQoXCJyZXR1cm5Ub1NldHRpbmdzXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50O1xyXG4gICAgY29uc3QgcmVzZXRCdXR0b24gPSBkb20uYnlJZChcInJlc2V0QnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50O1xyXG4gICAgY29uc3QgbWluUm93c0lucHV0ID0gZG9tLmJ5SWQoXCJtaW5Sb3dzXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCBtaW5Db2xzSW5wdXQgPSBkb20uYnlJZChcIm1pbkNvbHNcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGhvcml6b250YWxDaGVja2JveCA9IGRvbS5ieUlkKFwiaG9yaXpvbnRhbFwiKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgY29uc3QgdmVydGljYWxDaGVja2JveCA9IGRvbS5ieUlkKFwidmVydGljYWxcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGRpYWdvbmFsQ2hlY2tib3ggPSBkb20uYnlJZChcImRpYWdvbmFsXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCByZXZlcnNlQ2hlY2tib3ggPSBkb20uYnlJZChcInJldmVyc2VcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IHNldHRpbmdzRGl2ID0gZG9tLmJ5SWQoXCJzZXR0aW5nc1wiKSBhcyBIVE1MRGl2RWxlbWVudDtcclxuICAgIGNvbnN0IHJlc3VsdHNEaXYgPSBkb20uYnlJZChcInJlc3VsdHNcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbiAgICBjb25zdCBzdWNjZXNzRGl2ID0gZG9tLmJ5SWQoXCJzdWNjZXNzXCIpIGFzIEhUTUxEaXZFbGVtZW50O1xyXG4gICAgY29uc3Qgc2V0dGluZ3NLZXkgPSBcIndvcmRTZWFyY2hTZXR0aW5nc1wiO1xyXG4gICAgY29uc3Qgc2VlZCA9IHJhbmQueG11cjMobmV3IERhdGUoKS50b1N0cmluZygpKTtcclxuICAgIGNvbnN0IHJuZyA9IG5ldyByYW5kLlNGQzMyUk5HKHNlZWQoKSwgc2VlZCgpLCBzZWVkKCksIHNlZWQoKSk7XHJcbiAgICBjb25zdCBjYW52YXMgPSBkb20uYnlJZChcImdyaWRDYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XHJcbiAgICBjb25zdCBjdHggPSBnZXRDb250ZXh0MkQoY2FudmFzKTtcclxuICAgIGNvbnN0IHJlc3VsdHNXb3JkTGlzdCA9IGRvbS5ieUlkKFwicmVzdWx0c1dvcmRMaXN0XCIpIGFzIEhUTUxEaXZFbGVtZW50O1xyXG4gICAgY29uc3Qgc2VsZWN0aW9ucyA9IG5ldyBBcnJheTxTZWxlY3Rpb24+KCk7XHJcbiAgICBsZXQgd29yZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuICAgIGxldCBncmlkID0gbmV3IExldHRlckdyaWQoMCwgMCk7XHJcbiAgICBsZXQgcGxhY2VtZW50cyA9IG5ldyBBcnJheTxTZWxlY3Rpb24+KCk7XHJcbiAgICBsZXQgc2VsZWN0U3RhcnRDb29yZHM6IENvb3JkcyB8IG51bGwgPSBudWxsO1xyXG5cclxuICAgIGxvYWRTZXR0aW5ncygpO1xyXG5cclxuICAgIHdvcmRJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZXZ0KSA9PiB7XHJcbiAgICAgICAgaWYgKGV2dC5rZXkgIT09IFwiRW50ZXJcIikge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXdvcmRJbnB1dC52YWx1ZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhZGRXb3JkKHNldHRpbmdzV29yZExpc3QsIHdvcmRJbnB1dC52YWx1ZSk7XHJcbiAgICAgICAgd29yZElucHV0LnZhbHVlID0gXCJcIjtcclxuICAgIH0pO1xyXG5cclxuICAgIGFkZFdvcmRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIF8gPT4ge1xyXG4gICAgICAgIGlmICghd29yZElucHV0LnZhbHVlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFkZFdvcmQoc2V0dGluZ3NXb3JkTGlzdCwgd29yZElucHV0LnZhbHVlKTtcclxuICAgICAgICB3b3JkSW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgICAgIHdvcmRJbnB1dC5mb2N1cygpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgZ2VuZXJhdGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIF8gPT4ge1xyXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gZ2V0U2V0dGluZ3MoKTtcclxuICAgICAgICBsZXQgd29yZFNlYXJjaCA9IGdlbmVyYXRlV29yZFNlYXJjaChybmcsIHNldHRpbmdzKTtcclxuICAgICAgICBpZiAoIXdvcmRTZWFyY2gpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3VjY2Vzc0Rpdi5oaWRkZW4gPSB0cnVlO1xyXG4gICAgICAgIHdvcmRzID0gd29yZFNlYXJjaC53b3JkcztcclxuICAgICAgICBncmlkID0gd29yZFNlYXJjaC5ncmlkO1xyXG4gICAgICAgIHBsYWNlbWVudHMgPSB3b3JkU2VhcmNoLnBsYWNlbWVudHM7XHJcbiAgICAgICAgc2VsZWN0aW9ucy5zcGxpY2UoMCwgc2VsZWN0aW9ucy5sZW5ndGgpO1xyXG5cclxuICAgICAgICBzZXR0aW5nc0Rpdi5oaWRkZW4gPSB0cnVlO1xyXG4gICAgICAgIHJlc3VsdHNEaXYuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgcGFpbnQoY2FudmFzLCBjdHgsIGdyaWQsIHNlbGVjdGlvbnMpO1xyXG5cclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4ocmVzdWx0c1dvcmRMaXN0KTtcclxuICAgICAgICBmb3IgKGNvbnN0IHdvcmQgb2Ygc2V0dGluZ3Mud29yZHMpIHtcclxuICAgICAgICAgICAgYWRkV29yZChyZXN1bHRzV29yZExpc3QsIHdvcmQpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHNhdmVTZXR0aW5nc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgXyA9PiB7XHJcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBnZXRTZXR0aW5ncygpO1xyXG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKHNldHRpbmdzS2V5LCBKU09OLnN0cmluZ2lmeShzZXR0aW5ncykpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgbG9hZFNldHRpbmdzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBsb2FkU2V0dGluZ3MpO1xyXG5cclxuICAgIHJlc2V0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBfID0+IHtcclxuICAgICAgICBtaW5Sb3dzSW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgICAgIG1pbkNvbHNJbnB1dC52YWx1ZSA9IFwiXCI7XHJcblxyXG4gICAgICAgIHZhciB3b3JkRGl2cyA9IEFycmF5LmZyb20oc2V0dGluZ3NXb3JkTGlzdC5xdWVyeVNlbGVjdG9yQWxsKFwiI3NldHRpbmdzV29yZExpc3QgLndvcmRcIikpO1xyXG4gICAgICAgIGZvciAoY29uc3QgZGl2IG9mIHdvcmREaXZzKSB7XHJcbiAgICAgICAgICAgIGRpdi5yZW1vdmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm5Ub1NldHRpbmdzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBfID0+IHtcclxuICAgICAgICBzZXR0aW5nc0Rpdi5oaWRkZW4gPSBmYWxzZTtcclxuICAgICAgICByZXN1bHRzRGl2LmhpZGRlbiA9IHRydWU7XHJcbiAgICB9KTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZXZ0ID0+IHtcclxuICAgICAgICBjb25zdCB0YXJnZXQgPSBldnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIGlmICghdGFyZ2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGFyZ2V0Lm1hdGNoZXMoXCIjc2V0dGluZ3NXb3JkTGlzdCAud29yZFwiKSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0YXJnZXQucmVtb3ZlKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIG9uQ2FudmFzUG9pbnRlckRvd24sIGZhbHNlKTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcnVwXCIsIG9uQ2FudmFzUG9pbnRlclVwLCBmYWxzZSk7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJtb3ZlXCIsIG9uQ2FudmFzUG9pbnRlck1vdmUsIGZhbHNlKTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmxlYXZlXCIsIG9uQ2FudmFzUG9pbnRlckxlYXZlLCBmYWxzZSk7XHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0U2V0dGluZ3MoKTogU2V0dGluZ3Mge1xyXG4gICAgICAgIGNvbnN0IG1pblJvd3MgPSBwYXJzZUludChtaW5Sb3dzSW5wdXQudmFsdWUpIHx8IDA7XHJcbiAgICAgICAgY29uc3QgbWluQ29scyA9IHBhcnNlSW50KG1pbkNvbHNJbnB1dC52YWx1ZSkgfHwgMDtcclxuICAgICAgICBjb25zdCB3b3JkcyA9IFsuLi5nZXRXb3JkcyhzZXR0aW5nc1dvcmRMaXN0KV07XHJcbiAgICAgICAgY29uc3QgaG9yaXpvbnRhbCA9IGhvcml6b250YWxDaGVja2JveC5jaGVja2VkO1xyXG4gICAgICAgIGNvbnN0IHZlcnRpY2FsID0gdmVydGljYWxDaGVja2JveC5jaGVja2VkO1xyXG4gICAgICAgIGNvbnN0IGRpYWdvbmFsID0gZGlhZ29uYWxDaGVja2JveC5jaGVja2VkO1xyXG4gICAgICAgIGNvbnN0IHJldmVyc2UgPSByZXZlcnNlQ2hlY2tib3guY2hlY2tlZDtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgbWluUm93czogbWluUm93cyxcclxuICAgICAgICAgICAgbWluQ29sczogbWluQ29scyxcclxuICAgICAgICAgICAgd29yZHM6IHdvcmRzLFxyXG4gICAgICAgICAgICBob3Jpem9udGFsOiBob3Jpem9udGFsLFxyXG4gICAgICAgICAgICB2ZXJ0aWNhbDogdmVydGljYWwsXHJcbiAgICAgICAgICAgIGRpYWdvbmFsOiBkaWFnb25hbCxcclxuICAgICAgICAgICAgcmV2ZXJzZTogcmV2ZXJzZSxcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbG9hZFNldHRpbmdzKCkge1xyXG4gICAgICAgIGNvbnN0IGpzb24gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShzZXR0aW5nc0tleSk7XHJcbiAgICAgICAgaWYgKCFqc29uKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTm8gc3RvcmVkIHNldHRpbmdzIGZvdW5kXCIpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IEpTT04ucGFyc2UoanNvbikgYXMgU2V0dGluZ3M7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHNldHRpbmdzV29yZExpc3QpO1xyXG5cclxuICAgICAgICBpZiAoc2V0dGluZ3MubWluUm93cykge1xyXG4gICAgICAgICAgICBtaW5Sb3dzSW5wdXQudmFsdWUgPSBzZXR0aW5ncy5taW5Sb3dzLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbWluUm93c0lucHV0LnZhbHVlID0gXCJcIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzZXR0aW5ncy5taW5Db2xzKSB7XHJcbiAgICAgICAgICAgIG1pbkNvbHNJbnB1dC52YWx1ZSA9IHNldHRpbmdzLm1pbkNvbHMudG9TdHJpbmcoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBtaW5Db2xzSW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaG9yaXpvbnRhbENoZWNrYm94LmNoZWNrZWQgPSBzZXR0aW5ncy5ob3Jpem9udGFsO1xyXG4gICAgICAgIHZlcnRpY2FsQ2hlY2tib3guY2hlY2tlZCA9IHNldHRpbmdzLnZlcnRpY2FsO1xyXG4gICAgICAgIGRpYWdvbmFsQ2hlY2tib3guY2hlY2tlZCA9IHNldHRpbmdzLmRpYWdvbmFsO1xyXG4gICAgICAgIHJldmVyc2VDaGVja2JveC5jaGVja2VkID0gc2V0dGluZ3MucmV2ZXJzZTtcclxuXHJcbiAgICAgICAgaWYgKCFzZXR0aW5ncy53b3Jkcykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHdvcmQgb2Ygc2V0dGluZ3Mud29yZHMpIHtcclxuICAgICAgICAgICAgYWRkV29yZChzZXR0aW5nc1dvcmRMaXN0LCB3b3JkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25DYW52YXNQb2ludGVyRG93bihldjogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgeHkgPSB7IHg6IGV2Lm9mZnNldFgsIHk6IGV2Lm9mZnNldFkgfTtcclxuICAgICAgICBzZWxlY3RTdGFydENvb3JkcyA9IGNhbnZhc1RvR3JpZENvb3JkcyhjdHghLCB4eSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25DYW52YXNQb2ludGVyVXAoZXY6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGlmICghc2VsZWN0U3RhcnRDb29yZHMpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY2hlY2sgZm9yIHdvcmQgc2VsZWN0aW9uXHJcbiAgICAgICAgY29uc3QgeHkgPSB7IHg6IGV2Lm9mZnNldFgsIHk6IGV2Lm9mZnNldFkgfTtcclxuICAgICAgICBjb25zdCBzdGFydCA9IHNlbGVjdFN0YXJ0Q29vcmRzO1xyXG4gICAgICAgIGNvbnN0IGVuZCA9IGNhbnZhc1RvR3JpZENvb3JkcyhjdHghLCB4eSk7XHJcbiAgICAgICAgY29uc3QgaWR4ID0gcGxhY2VtZW50cy5maW5kSW5kZXgoeCA9PlxyXG4gICAgICAgICAgICAoY29vcmRzRXF1YWwoeC5zdGFydCwgc3RhcnQpICYmIGNvb3Jkc0VxdWFsKHguZW5kLCBlbmQpKVxyXG4gICAgICAgICAgICB8fCAoY29vcmRzRXF1YWwoeC5zdGFydCwgZW5kISkgJiYgY29vcmRzRXF1YWwoeC5lbmQsIHN0YXJ0KSkpO1xyXG5cclxuICAgICAgICBpZiAoaWR4ID09PSAtMSkge1xyXG4gICAgICAgICAgICBkcmFnRW5kKCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHNlbGVjdGlvbiA9IHsgc3RhcnQsIGVuZCB9O1xyXG4gICAgICAgIGNvbnN0IHdvcmQgPSBleHRyYWN0U2VsZWN0aW9uKGdyaWQsIHNlbGVjdGlvbilcclxuICAgICAgICBwbGFjZW1lbnRzLnNwbGljZShpZHgsIDEpO1xyXG5cclxuICAgICAgICBjb25zdCB3b3JkRGl2ID0gZmluZFdvcmRFbGVtKHJlc3VsdHNXb3JkTGlzdCwgd29yZCk7XHJcbiAgICAgICAgd29yZERpdj8uY2xhc3NMaXN0Py5hZGQoXCJmb3VuZFwiKTtcclxuICAgICAgICBzZWxlY3Rpb25zLnB1c2goc2VsZWN0aW9uKTtcclxuICAgICAgICB3b3Jkcy5kZWxldGUod29yZCk7XHJcblxyXG4gICAgICAgIC8vIGNoZWNrIGZvciBjb21wbGV0aW9uXHJcbiAgICAgICAgaWYgKHdvcmRzLnNpemUgPT09IDApIHtcclxuICAgICAgICAgICAgLy8gcmVtb3ZlIGFsbCB1bnNlbGVjdGVkIGxldHRlcnNcclxuICAgICAgICAgICAgcmVtb3ZlVW5zZWxlY3RlZExldHRlcnMoZ3JpZCwgc2VsZWN0aW9ucyk7XHJcbiAgICAgICAgICAgIHN1Y2Nlc3NEaXYuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkcmFnRW5kKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25DYW52YXNQb2ludGVyTGVhdmUoKSB7XHJcbiAgICAgICAgZHJhZ0VuZCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uQ2FudmFzUG9pbnRlck1vdmUoZXY6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGlmICghc2VsZWN0U3RhcnRDb29yZHMpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgeHkgPSB7IHg6IGV2Lm9mZnNldFgsIHk6IGV2Lm9mZnNldFkgfTtcclxuICAgICAgICBjb25zdCBjb29yZHMgPSBjYW52YXNUb0dyaWRDb29yZHMoY3R4ISwgeHkpO1xyXG4gICAgICAgIHBhaW50KGNhbnZhcywgY3R4ISwgZ3JpZCwgc2VsZWN0aW9ucywgeyBzdGFydDogc2VsZWN0U3RhcnRDb29yZHMhLCBlbmQ6IGNvb3JkcyB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmFnRW5kKCkge1xyXG4gICAgICAgIHNlbGVjdFN0YXJ0Q29vcmRzID0gbnVsbDtcclxuICAgICAgICBwYWludChjYW52YXMsIGN0eCEsIGdyaWQsIHNlbGVjdGlvbnMsIG51bGwpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRXb3JkKHdvcmRMaXN0OiBIVE1MRGl2RWxlbWVudCwgd29yZDogc3RyaW5nKSB7XHJcbiAgICB3b3JkID0gd29yZC50cmltKCkudG9VcHBlckNhc2UoKTtcclxuXHJcbiAgICBjb25zdCB3b3JkcyA9IGdldFdvcmRzKHdvcmRMaXN0KTtcclxuICAgIHdvcmRzLmFkZCh3b3JkKTtcclxuXHJcbiAgICBjb25zdCBsaXN0ID0gWy4uLndvcmRzXTtcclxuICAgIGxpc3Quc29ydCgpO1xyXG5cclxuICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih3b3JkTGlzdCk7XHJcbiAgICBmb3IgKGNvbnN0IHdvcmQgb2YgbGlzdCkge1xyXG4gICAgICAgIGNvbnN0IHdvcmREaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgICAgIHdvcmREaXYuY2xhc3NMaXN0LmFkZChcIndvcmRcIik7XHJcbiAgICAgICAgY29uc3Qgd29yZFRleHQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh3b3JkKTtcclxuICAgICAgICB3b3JkRGl2LmFwcGVuZENoaWxkKHdvcmRUZXh0KVxyXG4gICAgICAgIHdvcmRMaXN0LmFwcGVuZENoaWxkKHdvcmREaXYpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kV29yZEVsZW0od29yZExpc3Q6IEhUTUxEaXZFbGVtZW50LCB3b3JkOiBzdHJpbmcpOiBIVE1MRGl2RWxlbWVudCB8IG51bGwge1xyXG4gICAgd29yZCA9IHdvcmQudHJpbSgpLnRvVXBwZXJDYXNlKCk7XHJcblxyXG4gICAgY29uc3QgZWxlbXMgPSBBcnJheS5mcm9tKHdvcmRMaXN0LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTERpdkVsZW1lbnQ+KFwiLndvcmRcIikpO1xyXG4gICAgZm9yIChjb25zdCBlbGVtIG9mIGVsZW1zKSB7XHJcbiAgICAgICAgaWYgKGVsZW0udGV4dENvbnRlbnQgPT09IHdvcmQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVsZW07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRXb3Jkcyh3b3JkTGlzdDogSFRNTERpdkVsZW1lbnQpOiBTZXQ8c3RyaW5nPiB7XHJcbiAgICBjb25zdCB3b3JkcyA9IEFycmF5LmZyb20od29yZExpc3QucXVlcnlTZWxlY3RvckFsbChcIi53b3JkXCIpKVxyXG4gICAgICAgIC5tYXAoZGl2ID0+IGRpdj8udGV4dENvbnRlbnQ/LnRvVXBwZXJDYXNlKCkgPz8gXCJcIilcclxuICAgICAgICAuc29ydCgoeCwgeSkgPT4geS5sZW5ndGggLSB4Lmxlbmd0aCk7XHJcblxyXG4gICAgcmV0dXJuIG5ldyBTZXQod29yZHMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVdvcmRTZWFyY2gocm5nOiByYW5kLlJORywgc2V0dGluZ3M6IFNldHRpbmdzKTogV29yZFNlYXJjaCB8IG51bGwge1xyXG4gICAgY29uc3QgeyB3b3Jkczogd29yZHNBcnJheSwgbWluUm93cywgbWluQ29scywgaG9yaXpvbnRhbCwgdmVydGljYWwsIGRpYWdvbmFsLCByZXZlcnNlIH0gPSBzZXR0aW5ncztcclxuICAgIGNvbnN0IHdvcmRzID0gbmV3IFNldCh3b3Jkc0FycmF5KTtcclxuICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGRvbS5ieUlkKFwiZXJyb3JNZXNzYWdlXCIpIGFzIEhUTUxEaXZFbGVtZW50O1xyXG4gICAgZXJyb3JNZXNzYWdlLnRleHRDb250ZW50ID0gXCJcIjtcclxuXHJcbiAgICAvLyB2YWxpZGF0aW9uXHJcbiAgICAvLyBtdXN0IGNoZWNrIGF0IGxlYXN0IG9uZSBvZiB0aGUgZGlyZWN0aW9uYWwgY2hlY2tib3hlc1xyXG4gICAgaWYgKCFob3Jpem9udGFsICYmICF2ZXJ0aWNhbCAmJiAhZGlhZ29uYWwgJiYgIXJldmVyc2UpIHtcclxuICAgICAgICBlcnJvck1lc3NhZ2UudGV4dENvbnRlbnQgPSBcIk11c3QgY2hvb3NlIGF0IGxlYXN0IG9uZSBvZiBob3Jpem9udGFsLCB2ZXJ0aWNhbCwgZGlhZ29uYWwsIG9yIHJldmVyc2UuXCI7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbWF4UmV0cmllcyA9IDEyODtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWF4UmV0cmllczsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgZ3JpZCA9IG5ldyBMZXR0ZXJHcmlkKG1pblJvd3MgKyBpLCBtaW5Db2xzICsgaSk7XHJcbiAgICAgICAgY29uc3QgcGxhY2VtZW50cyA9IHBsYWNlV29yZHMocm5nLCBncmlkLCB3b3JkcywgaG9yaXpvbnRhbCwgdmVydGljYWwsIGRpYWdvbmFsLCByZXZlcnNlKTtcclxuICAgICAgICBpZiAocGxhY2VtZW50cykge1xyXG4gICAgICAgICAgICBmaWxsUmFuZG9tQ2hhcmFjdGVycyhybmcsIGdyaWQsIHdvcmRzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHdvcmRzLFxyXG4gICAgICAgICAgICAgICAgZ3JpZCxcclxuICAgICAgICAgICAgICAgIHBsYWNlbWVudHNcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXJyb3JNZXNzYWdlLnRleHRDb250ZW50ID0gXCJGYWlsZWQgdG8gZ2VuZXJhdGUgd29yZCBzZWFyY2ggLSBwbGVhc2UgbW9kaWZ5IHdvcmQgbGlzdCBhbmQvb3IgZ3JpZCBzaXplIGFuZCB0cnkgYWdhaW5cIjtcclxuICAgIHJldHVybiBudWxsO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZVdvcmRzKFxyXG4gICAgcm5nOiByYW5kLlJORyxcclxuICAgIGdyaWQ6IExldHRlckdyaWQsXHJcbiAgICB3b3JkczogU2V0PHN0cmluZz4sXHJcbiAgICBob3Jpem9udGFsOiBib29sZWFuLFxyXG4gICAgdmVydGljYWw6IGJvb2xlYW4sXHJcbiAgICBkaWFnb25hbDogYm9vbGVhbixcclxuICAgIHJldmVyc2U6IGJvb2xlYW4pOiBTZWxlY3Rpb25bXSB8IG51bGwge1xyXG4gICAgY29uc3QgZGlycyA9IGdldERpcnMoaG9yaXpvbnRhbCwgdmVydGljYWwsIGRpYWdvbmFsLCByZXZlcnNlKTtcclxuICAgIGNvbnN0IHBsYWNlbWVudHMgPSBuZXcgQXJyYXk8U2VsZWN0aW9uPigpO1xyXG5cclxuICAgIGZvciAoY29uc3Qgd29yZCBvZiB3b3Jkcykge1xyXG4gICAgICAgIGNvbnN0IHBsYWNlbWVudCA9IHRyeVBsYWNlV29yZChybmcsIGdyaWQsIGRpcnMsIHdvcmQpO1xyXG4gICAgICAgIGlmICghcGxhY2VtZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGxhY2VtZW50cy5wdXNoKHBsYWNlbWVudCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHBsYWNlbWVudHM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldERpcnMoaG9yaXpvbnRhbDogYm9vbGVhbiwgdmVydGljYWw6IGJvb2xlYW4sIGRpYWdvbmFsOiBib29sZWFuLCByZXZlcnNlOiBib29sZWFuKTogQ29vcmRzW10ge1xyXG4gICAgY29uc3QgZGlycyA9IG5ldyBBcnJheTxDb29yZHM+KCk7XHJcblxyXG4gICAgaWYgKGhvcml6b250YWwpIHtcclxuICAgICAgICBkaXJzLnB1c2goeyBpOiAwLCBqOiAxIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh2ZXJ0aWNhbCkge1xyXG4gICAgICAgIGRpcnMucHVzaCh7IGk6IDEsIGo6IDAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGRpYWdvbmFsKSB7XHJcbiAgICAgICAgZGlycy5wdXNoKHsgaTogMSwgajogMSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmV2ZXJzZSAmJiBob3Jpem9udGFsKSB7XHJcbiAgICAgICAgZGlycy5wdXNoKHsgaTogMCwgajogLTEgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJldmVyc2UgJiYgdmVydGljYWwpIHtcclxuICAgICAgICBkaXJzLnB1c2goeyBpOiAtMSwgajogMCB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmV2ZXJzZSAmJiBkaWFnb25hbCkge1xyXG4gICAgICAgIGRpcnMucHVzaCh7IGk6IDEsIGo6IC0xIH0pO1xyXG4gICAgICAgIGRpcnMucHVzaCh7IGk6IC0xLCBqOiAxIH0pO1xyXG4gICAgICAgIGRpcnMucHVzaCh7IGk6IC0xLCBqOiAtMSB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZGlycztcclxufVxyXG5cclxuZnVuY3Rpb24gdHJ5UGxhY2VXb3JkKHJuZzogcmFuZC5STkcsIGdyaWQ6IExldHRlckdyaWQsIGRpcnM6IENvb3Jkc1tdLCB3b3JkOiBzdHJpbmcpOiBTZWxlY3Rpb24gfCBudWxsIHtcclxuICAgIGNvbnN0IHBsYWNlbWVudCA9IHRyeUZpbmRXb3JkUGxhY2VtZW50KHJuZywgZ3JpZCwgZGlycywgd29yZCk7XHJcbiAgICBpZiAoIXBsYWNlbWVudCkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHBsYWNlV29yZChncmlkLCB3b3JkLCBwbGFjZW1lbnQpO1xyXG4gICAgcmV0dXJuIHBsYWNlbWVudDtcclxufVxyXG5cclxuZnVuY3Rpb24gdHJ5RmluZFdvcmRQbGFjZW1lbnQocm5nOiByYW5kLlJORywgZ3JpZDogTGV0dGVyR3JpZCwgZGlyZWN0aW9uczogQ29vcmRzW10sIHdvcmQ6IHN0cmluZyk6IFNlbGVjdGlvbiB8IG51bGwge1xyXG4gICAgY29uc3QgbWF4RGltID0gTWF0aC5tYXgoZ3JpZC5yb3dzLCBncmlkLmNvbHMpO1xyXG4gICAgaWYgKHdvcmQubGVuZ3RoID4gbWF4RGltKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGxcclxuICAgIH1cclxuXHJcbiAgICAvLyB0cnkgcGxhY2luZyBhdCBldmVyeSBwb3NzaWJsZSBjZWxsXHJcbiAgICBjb25zdCBncmlkQ29vcmRzID0gbmV3IEFycmF5PENvb3Jkcz4oKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ3JpZC5yb3dzOyArK2kpIHtcclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGdyaWQuY29sczsgKytqKSB7XHJcbiAgICAgICAgICAgIGdyaWRDb29yZHMucHVzaCh7IGksIGogfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGRpciA9IHJhbmQuY2hvb3NlKHJuZywgZGlyZWN0aW9ucyk7XHJcbiAgICByYW5kLnNodWZmbGUocm5nLCBncmlkQ29vcmRzKTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IHN0YXJ0IG9mIGdyaWRDb29yZHMpIHtcclxuICAgICAgICBpZiAoaXNWYWxpZFdvcmRQbGFjZW1lbnQoZ3JpZCwgd29yZCwgc3RhcnQsIGRpcikpIHtcclxuICAgICAgICAgICAgY29uc3QgZW5kID0ge1xyXG4gICAgICAgICAgICAgICAgaTogc3RhcnQuaSArIGRpci5pICogKHdvcmQubGVuZ3RoIC0gMSksXHJcbiAgICAgICAgICAgICAgICBqOiBzdGFydC5qICsgZGlyLmogKiAod29yZC5sZW5ndGggLSAxKSxcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdGFydCxcclxuICAgICAgICAgICAgICAgIGVuZCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmFsaWRXb3JkUGxhY2VtZW50KGdyaWQ6IExldHRlckdyaWQsIHdvcmQ6IHN0cmluZywgc3RhcnQ6IENvb3JkcywgZGlyOiBDb29yZHMpOiBib29sZWFuIHtcclxuICAgIGlmIChzdGFydC5pIDwgMCB8fCBzdGFydC5qIDwgMCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChzdGFydC5pID49IGdyaWQucm93cyB8fCBzdGFydC5qID49IGdyaWQucm93cykge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB7IGk6IGkwLCBqOiBqMCB9ID0gc3RhcnQ7XHJcbiAgICBjb25zdCBsZXR0ZXJzID0gd29yZC5zcGxpdChcIlwiKTtcclxuICAgIGNvbnN0IHN1Y2Nlc3MgPSBsZXR0ZXJzLmV2ZXJ5KChjaCwgaWR4KSA9PiB7XHJcbiAgICAgICAgY29uc3QgaSA9IGkwICsgZGlyLmkgKiBpZHg7XHJcbiAgICAgICAgY29uc3QgaiA9IGowICsgZGlyLmogKiBpZHg7XHJcblxyXG4gICAgICAgIGlmIChpIDwgMCB8fCBpID49IGdyaWQucm93cykge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaiA8IDAgfHwgaiA+PSBncmlkLmNvbHMpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGdyaWQuZ2V0KGksIGopID09PSBjaCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghZ3JpZC5nZXQoaSwgaikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBleGNlcHRpb246IGZ1bGwgb3ZlcmxhcCAoaS5lLiBwcmVmaXggb3ZlcmxhcHBpbmcgbG9uZ2VyIHdvcmQpIHNob3VsZCBub3QgYmUgY29uc2lkZXJlZCB2YWxpZFxyXG4gICAgaWYgKGxldHRlcnMuZXZlcnkoKGNoLCBpZHgpID0+IHtcclxuICAgICAgICBjb25zdCBpID0gaTAgKyBkaXIuaSAqIGlkeDtcclxuICAgICAgICBjb25zdCBqID0gajAgKyBkaXIuaiAqIGlkeDtcclxuICAgICAgICByZXR1cm4gZ3JpZC5nZXQoaSwgaikgPT09IGNoXHJcbiAgICB9KSkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzdWNjZXNzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZVdvcmQoZ3JpZDogTGV0dGVyR3JpZCwgd29yZDogc3RyaW5nLCBwbGFjZW1lbnQ6IFNlbGVjdGlvbikge1xyXG4gICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSBwbGFjZW1lbnQ7XHJcbiAgICBjb25zdCB7IGk6IGkwLCBqOiBqMCB9ID0gc3RhcnQ7XHJcbiAgICBjb25zdCBkaXIgPSBnZXREaXIoc3RhcnQsIGVuZCk7XHJcbiAgICBpZiAoIWRpcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBwbGFjZW1lbnQgZGlyICR7c3RhcnR9IC0gJHtlbmR9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbGV0dGVycyA9IHdvcmQuc3BsaXQoXCJcIik7XHJcbiAgICBsZXR0ZXJzLmZvckVhY2goKGNoLCBpZHgpID0+IHtcclxuICAgICAgICBjb25zdCBpID0gaTAgKyBkaXIuaSAqIGlkeDtcclxuICAgICAgICBjb25zdCBqID0gajAgKyBkaXIuaiAqIGlkeDtcclxuICAgICAgICBncmlkLnNldChpLCBqLCBjaCk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZmlsbFJhbmRvbUNoYXJhY3RlcnMocm5nOiByYW5kLlJORywgZ3JpZDogTGV0dGVyR3JpZCwgd29yZHM6IFNldDxzdHJpbmc+KSB7XHJcbiAgICAvLyBnZW5lcmF0ZSBjaGFyYWN0ZXIgbGlzdCBmcm9tIHdvcmRzXHJcblxyXG4gICAgLy8gZ2V0IGEgZmxhdCBsaXN0IG9mIGFsbCBsZXR0ZXJzIGluIGFsbCB3b3Jkc1xyXG4gICAgY29uc3QgY2hhcnNTZXQgPSBuZXcgU2V0PHN0cmluZz4oW1wiQVwiLCBcIkJcIiwgXCJDXCIsIFwiRFwiLCBcIkVcIiwgXCJGXCIsIFwiR1wiLCBcIkhcIiwgXCJJXCIsIFwiSlwiLCBcIktcIiwgXCJMXCIsIFwiTVwiLCBcIk5cIiwgXCJPXCIsIFwiUFwiLCBcIlFcIiwgXCJSXCIsIFwiU1wiLCBcIlRcIiwgXCJVXCIsIFwiVlwiLCBcIldcIiwgXCJYXCIsIFwiWVwiLCBcIlpcIl0pO1xyXG4gICAgd29yZHMuZm9yRWFjaCh3ID0+IHcuc3BsaXQoXCJcIikuZm9yRWFjaChjaCA9PiBjaGFyc1NldC5hZGQoY2gpKSk7XHJcbiAgICBjb25zdCBjaGFycyA9IFsuLi5jaGFyc1NldF07XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBncmlkLnJvd3M7ICsraSkge1xyXG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZ3JpZC5jb2xzOyArK2opIHtcclxuICAgICAgICAgICAgaWYgKGdyaWQuZ2V0KGksIGopKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgY2ggPSByYW5kLmNob29zZShybmcsIGNoYXJzKTtcclxuICAgICAgICAgICAgZ3JpZC5zZXQoaSwgaiwgY2gpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGFpbnQoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCwgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIGdyaWQ6IExldHRlckdyaWQsIHNlbGVjdGlvbnM6IFNlbGVjdGlvbltdLCBzZWxlY3Rpb246IFNlbGVjdGlvbiB8IG51bGwgPSBudWxsKSB7XHJcbiAgICBjb25zdCBmb250ID0gXCIyNHB4IG1vbm9zcGFjZVwiO1xyXG4gICAgY3R4LmZvbnQgPSBmb250O1xyXG4gICAgY29uc3QgbGV0dGVyU2l6ZSA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGg7XHJcbiAgICBjb25zdCBjZWxsU2l6ZSA9IGxldHRlclNpemUgKyBwYWRkaW5nICogMjtcclxuICAgIGNhbnZhcy53aWR0aCA9IGNlbGxTaXplICogZ3JpZC5jb2xzO1xyXG4gICAgY2FudmFzLmhlaWdodCA9IGNlbGxTaXplICogZ3JpZC5yb3dzO1xyXG4gICAgLy8gY2FudmFzLnN0eWxlLndpZHRoID0gYCR7Y2FudmFzLndpZHRofXB4YDtcclxuICAgIC8vIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBgJHtjYW52YXMuaGVpZ2h0fXB4YDtcclxuXHJcbiAgICBjdHguZm9udCA9IGZvbnQ7XHJcbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ3JpZC5yb3dzOyArK2kpIHtcclxuICAgICAgICBjb25zdCB5ID0gaSAqIGNlbGxTaXplICsgcGFkZGluZyArIGxldHRlclNpemU7XHJcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBncmlkLmNvbHM7ICsraikge1xyXG4gICAgICAgICAgICBjb25zdCB4ID0gaiAqIGNlbGxTaXplICsgcGFkZGluZztcclxuICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGdyaWQuZ2V0KGksIGopLCB4LCB5KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHNlbGVjdGlvbikge1xyXG4gICAgICAgIGNvbnN0IHh5MCA9IGdyaWRUb0NhbnZhc0Nvb3JkcyhjdHgsIHNlbGVjdGlvbi5zdGFydCk7XHJcbiAgICAgICAgY29uc3QgeHkxID0gZ3JpZFRvQ2FudmFzQ29vcmRzKGN0eCwgc2VsZWN0aW9uLmVuZCk7XHJcbiAgICAgICAgY29uc3QgeDAgPSB4eTAueCArIGNlbGxTaXplIC8gMjtcclxuICAgICAgICBjb25zdCB5MCA9IHh5MC55ICsgY2VsbFNpemUgLyAyO1xyXG4gICAgICAgIGNvbnN0IHgxID0geHkxLnggKyBjZWxsU2l6ZSAvIDI7XHJcbiAgICAgICAgY29uc3QgeTEgPSB4eTEueSArIGNlbGxTaXplIC8gMjtcclxuXHJcbiAgICAgICAgLy8gZG8gZ3JpZCBjb29yZHMgcmVwcmVzZW50IGEgc3RyYWlnaHQgbGluZT9cclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJlZFwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSA0O1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHgubW92ZVRvKHgwLCB5MCk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh4MSwgeTEpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IHNlbGVjdGlvbiBvZiBzZWxlY3Rpb25zKSB7XHJcbiAgICAgICAgY29uc3QgeHkwID0gZ3JpZFRvQ2FudmFzQ29vcmRzKGN0eCwgc2VsZWN0aW9uLnN0YXJ0KTtcclxuICAgICAgICBjb25zdCB4eTEgPSBncmlkVG9DYW52YXNDb29yZHMoY3R4LCBzZWxlY3Rpb24uZW5kKTtcclxuICAgICAgICBjb25zdCB4MCA9IHh5MC54ICsgY2VsbFNpemUgLyAyO1xyXG4gICAgICAgIGNvbnN0IHkwID0geHkwLnkgKyBjZWxsU2l6ZSAvIDI7XHJcbiAgICAgICAgY29uc3QgeDEgPSB4eTEueCArIGNlbGxTaXplIC8gMjtcclxuICAgICAgICBjb25zdCB5MSA9IHh5MS55ICsgY2VsbFNpemUgLyAyO1xyXG5cclxuICAgICAgICAvLyBkbyBncmlkIGNvb3JkcyByZXByZXNlbnQgYSBzdHJhaWdodCBsaW5lP1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgwLCAyNTUsIDAsIDAuNSlcIjtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gNDtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyh4MCwgeTApO1xyXG4gICAgICAgIGN0eC5saW5lVG8oeDEsIHkxKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbnZhc1RvR3JpZENvb3JkcyhjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgeHk6IFBvaW50KTogQ29vcmRzIHtcclxuICAgIGNvbnN0IGxldHRlclNpemUgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoO1xyXG4gICAgY29uc3QgY2VsbFNpemUgPSBsZXR0ZXJTaXplICsgcGFkZGluZyAqIDI7XHJcbiAgICBjb25zdCB7IHgsIHkgfSA9IHh5O1xyXG4gICAgY29uc3QgaSA9IE1hdGguZmxvb3IoKHkgLSBwYWRkaW5nKSAvIGNlbGxTaXplKTtcclxuICAgIGNvbnN0IGogPSBNYXRoLmZsb29yKCh4IC0gcGFkZGluZykgLyBjZWxsU2l6ZSk7XHJcbiAgICByZXR1cm4geyBpLCBqIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdyaWRUb0NhbnZhc0Nvb3JkcyhjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgaWo6IENvb3Jkcyk6IFBvaW50IHtcclxuICAgIGNvbnN0IGxldHRlclNpemUgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoO1xyXG4gICAgY29uc3QgY2VsbFNpemUgPSBsZXR0ZXJTaXplICsgcGFkZGluZyAqIDI7XHJcbiAgICBjb25zdCB7IGksIGogfSA9IGlqO1xyXG4gICAgY29uc3QgeCA9IGogKiBjZWxsU2l6ZTtcclxuICAgIGNvbnN0IHkgPSBpICogY2VsbFNpemU7XHJcbiAgICByZXR1cm4geyB4LCB5IH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldENvbnRleHQyRChjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KTogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEIHtcclxuICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICBpZiAoIWN0eCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIGNhbnZhcyBzdXBwb3J0XCIpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBjdHg7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvb3Jkc0VxdWFsKGE6IENvb3JkcywgYjogQ29vcmRzKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gYS5pID09IGIuaSAmJiBhLmogPT0gYi5qO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXREaXIoaWowOiBDb29yZHMsIGlqMTogQ29vcmRzKTogQ29vcmRzIHwgbnVsbCB7XHJcbiAgICBjb25zdCBkaSA9IGlqMS5pIC0gaWowLmk7XHJcbiAgICBjb25zdCBkaiA9IGlqMS5qIC0gaWowLmo7XHJcblxyXG4gICAgaWYgKGRpID09PSAwICYmIGRqID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGRpICE9PSAwICYmIGRqICE9PSAwICYmIE1hdGguYWJzKGRpKSAhPT0gTWF0aC5hYnMoZGopKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHsgaTogTWF0aC5zaWduKGRpKSwgajogTWF0aC5zaWduKGRqKSB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVVbnNlbGVjdGVkTGV0dGVycyhncmlkOiBMZXR0ZXJHcmlkLCBzZWxlY3Rpb25zOiBTZWxlY3Rpb25bXSkge1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBncmlkLnJvd3M7ICsraSkge1xyXG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZ3JpZC5jb2xzOyArK2opIHtcclxuICAgICAgICAgICAgY29uc3QgY29vcmRzID0geyBpLCBqIH07XHJcbiAgICAgICAgICAgIGlmIChzZWxlY3Rpb25zLnNvbWUoeCA9PiBzZWxlY3Rpb25Db250YWlucyh4LCBjb29yZHMpKSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGdyaWQuc2V0KGksIGosIFwiIFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNlbGVjdGlvbkNvbnRhaW5zKHNlbGVjdGlvbjogU2VsZWN0aW9uLCBpajogQ29vcmRzKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCBkaXIgPSBnZXREaXIoc2VsZWN0aW9uLnN0YXJ0LCBzZWxlY3Rpb24uZW5kKTtcclxuICAgIGlmICghZGlyKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHsgc3RhcnQsIGVuZCB9ID0gc2VsZWN0aW9uO1xyXG4gICAgbGV0IHsgaSwgaiB9ID0gc3RhcnQ7XHJcbiAgICB3aGlsZSAoaSA+PSAwICYmIGogPj0gMCkge1xyXG4gICAgICAgIGlmIChpID09IGlqLmkgJiYgaiA9PSBpai5qKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGkgPT09IGVuZC5pICYmIGogPT09IGVuZC5qKSB7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaSArPSBkaXIuaTtcclxuICAgICAgICBqICs9IGRpci5qO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdFNlbGVjdGlvbihncmlkOiBMZXR0ZXJHcmlkLCBzZWxlY3Rpb246IFNlbGVjdGlvbik6IHN0cmluZyB7XHJcbiAgICAvLyBjaGVjayBkaXJlY3Rpb24gLSBpZiBpajAgdG8gaWoxIGlzIG5vdCBob3Jpem9udGFsLCB2ZXJ0aWNhbCwgb3IgZGlhZ29uYWwsIG5vIG1hdGNoIHBvc3NpYmxlXHJcbiAgICBjb25zdCB7IHN0YXJ0LCBlbmQgfSA9IHNlbGVjdGlvbjtcclxuICAgIGNvbnN0IGRpciA9IGdldERpcihzdGFydCwgZW5kKTtcclxuICAgIGlmICghZGlyKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHNlbGVjdGlvbiBkaXJlY3Rpb24gJHtzdGFydH0gLSAke2VuZH1gKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGV4dHJhY3Qgc2VsZWN0ZWQgd29yZFxyXG4gICAgbGV0IHsgaSwgaiB9ID0gc2VsZWN0aW9uLnN0YXJ0O1xyXG4gICAgbGV0IHMgPSBcIlwiO1xyXG5cclxuICAgIHdoaWxlIChpID49IDAgJiYgaSA8IGdyaWQucm93cyAmJiBqID49IDAgJiYgaiA8IGdyaWQuY29scykge1xyXG4gICAgICAgIHMgKz0gZ3JpZC5nZXQoaSwgaik7XHJcblxyXG4gICAgICAgIGlmIChpID09PSBlbmQuaSAmJiBqID09PSBlbmQuaikge1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGkgKz0gZGlyLmk7XHJcbiAgICAgICAgaiArPSBkaXIuajtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcztcclxufVxyXG5cclxubWFpbigpIl19