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
        console.log(placements);
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
    canvas.addEventListener("mousedown", onCanvasMouseDown);
    canvas.addEventListener("mouseup", onCanvasMouseUp);
    canvas.addEventListener("mousemove", onCanvasMouseMouse);
    canvas.addEventListener("mouseleave", onCanvasMouseLeave);
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
    function onCanvasMouseDown(ev) {
        const xy = { x: ev.offsetX, y: ev.offsetY };
        selectStartCoords = canvasToGridCoords(ctx, xy);
    }
    function onCanvasMouseUp(ev) {
        var _a;
        if (!selectStartCoords) {
            return;
        }
        // check for word selection
        const xy = { x: ev.offsetX, y: ev.offsetY };
        const start = selectStartCoords;
        const end = canvasToGridCoords(ctx, xy);
        console.log(start, end, placements);
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
    function onCanvasMouseLeave() {
        dragEnd();
    }
    function onCanvasMouseMouse(ev) {
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
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
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
    console.log(di, dj);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZHNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndvcmRzZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDO0FBQ2IsT0FBTyxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQztBQUN4QyxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUM7QUFnQzVDLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQztBQUVsQixNQUFNLFVBQVU7SUFHWixZQUFxQixJQUFZLEVBQVcsSUFBWTtRQUFuQyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQVcsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNwRCxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxJQUFJLENBQUMsR0FBVztRQUNaLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsSUFBSSxDQUFDLEdBQVcsRUFBRSxFQUFVO1FBQ3hCLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDZixNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7U0FDakU7UUFFRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFRCxJQUFJLENBQUMsR0FBVyxFQUFFLEdBQVc7UUFDekIsT0FBTyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7SUFDakMsQ0FBQztJQUVELElBQUksQ0FBQyxHQUFXO1FBQ1osTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFD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O1FBQ1gsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDZDtJQUVELE9BQU8sS0FBSyxDQUFDO0FBQ2pCLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQWdCLEVBQUUsU0FBb0I7SUFDNUQsOEZBQThGO0lBQzlGLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDO0lBQ2pDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDL0IsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNOLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLEtBQUssTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFBO0tBQ25FO0lBRUQsd0JBQXdCO0lBQ3hCLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQztJQUMvQixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFFWCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRTtRQUN2RCxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFcEIsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsRUFBRTtZQUM1QixNQUFNO1NBQ1Q7UUFFRCxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNYLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQ2Q7SUFFRCxPQUFPLENBQUMsQ0FBQztBQUNiLENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG5pbXBvcnQgKiBhcyBkb20gZnJvbSBcIi4uL3NoYXJlZC9kb20uanNcIjtcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIjtcclxuaW1wb3J0ICogYXMgYXJyYXkgZnJvbSBcIi4uL3NoYXJlZC9hcnJheS5qc1wiO1xyXG5cclxuaW50ZXJmYWNlIFNldHRpbmdzIHtcclxuICAgIG1pblJvd3M6IG51bWJlclxyXG4gICAgbWluQ29sczogbnVtYmVyXHJcbiAgICBob3Jpem9udGFsOiBib29sZWFuXHJcbiAgICB2ZXJ0aWNhbDogYm9vbGVhblxyXG4gICAgZGlhZ29uYWw6IGJvb2xlYW5cclxuICAgIHJldmVyc2U6IGJvb2xlYW5cclxuICAgIHdvcmRzOiBzdHJpbmdbXSxcclxufVxyXG5cclxuLyoqXHJcbiAqIGEgcm93L2NvbHVtbiB3aXRoaW4gdGhlIGdyaWRcclxuICovXHJcbmludGVyZmFjZSBDb29yZHMge1xyXG4gICAgLyoqcm93IHdpdGhpbiBncmlkICovXHJcbiAgICBpOiBudW1iZXIsXHJcbiAgICAvKipjb2x1bW4gd2l0aGluIGdyaWQgKi9cclxuICAgIGo6IG51bWJlcixcclxufVxyXG5cclxuaW50ZXJmYWNlIFBvaW50IHtcclxuICAgIHg6IG51bWJlcixcclxuICAgIHk6IG51bWJlclxyXG59XHJcblxyXG5pbnRlcmZhY2UgU2VsZWN0aW9uIHtcclxuICAgIHN0YXJ0OiBDb29yZHNcclxuICAgIGVuZDogQ29vcmRzXHJcbn1cclxuXHJcbmNvbnN0IHBhZGRpbmcgPSA0O1xyXG5cclxuY2xhc3MgTGV0dGVyR3JpZCB7XHJcbiAgICBsZXR0ZXJzOiBzdHJpbmdbXVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvd3M6IG51bWJlciwgcmVhZG9ubHkgY29sczogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5sZXR0ZXJzID0gYXJyYXkuZ2VuZXJhdGUocm93cyAqIGNvbHMsIF8gPT4gXCJcIik7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0ZihpZHg6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubGV0dGVyc1tpZHhdO1xyXG4gICAgfVxyXG5cclxuICAgIHNldGYoaWR4OiBudW1iZXIsIGNoOiBzdHJpbmcpIHtcclxuICAgICAgICBpZiAoY2gubGVuZ3RoID4gMSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IGJlIGEgc2luZ2xlIGNoYXJhY3RlciBvciBlbXB0eSBzdHJpbmdcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5sZXR0ZXJzW2lkeF0gPSBjaDtcclxuICAgIH1cclxuXHJcbiAgICBmbGF0KHJvdzogbnVtYmVyLCBjb2w6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHJvdyAqIHRoaXMuY29scyArIGNvbDtcclxuICAgIH1cclxuXHJcbiAgICBoaWVyKGlkeDogbnVtYmVyKTogQ29vcmRzIHtcclxuICAgICAgICBjb25zdCBpID0gTWF0aC5mbG9vcihpZHggLyB0aGlzLmNvbHMpO1xyXG4gICAgICAgIGNvbnN0IGogPSBpZHggJSB0aGlzLmNvbHM7XHJcbiAgICAgICAgcmV0dXJuIHsgaSwgaiB9O1xyXG4gICAgfVxyXG5cclxuICAgIGdldChyb3c6IG51bWJlciwgY29sOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmdldGYodGhpcy5mbGF0KHJvdywgY29sKSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0KHJvdzogbnVtYmVyLCBjb2w6IG51bWJlciwgY2g6IHN0cmluZykge1xyXG4gICAgICAgIHRoaXMuc2V0Zih0aGlzLmZsYXQocm93LCBjb2wpLCBjaCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSBXb3JkU2VhcmNoIHtcclxuICAgIHdvcmRzOiBTZXQ8c3RyaW5nPlxyXG4gICAgZ3JpZDogTGV0dGVyR3JpZFxyXG4gICAgcGxhY2VtZW50czogU2VsZWN0aW9uW11cclxufVxyXG5cclxuZnVuY3Rpb24gbWFpbigpIHtcclxuICAgIGNvbnN0IHdvcmRJbnB1dCA9IGRvbS5ieUlkKFwid29yZFwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IHNldHRpbmdzV29yZExpc3QgPSBkb20uYnlJZChcInNldHRpbmdzV29yZExpc3RcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbiAgICBjb25zdCBhZGRXb3JkQnV0dG9uID0gZG9tLmJ5SWQoXCJhZGRXb3JkXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50O1xyXG4gICAgY29uc3QgZ2VuZXJhdGVCdXR0b24gPSBkb20uYnlJZChcImdlbmVyYXRlQnV0dG9uXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50O1xyXG4gICAgY29uc3Qgc2F2ZVNldHRpbmdzQnV0dG9uID0gZG9tLmJ5SWQoXCJzYXZlU2V0dGluZ3NcIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XHJcbiAgICBjb25zdCBsb2FkU2V0dGluZ3NCdXR0b24gPSBkb20uYnlJZChcImxvYWRTZXR0aW5nc1wiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IHJldHVyblRvU2V0dGluZ3NCdXR0b24gPSBkb20uYnlJZChcInJldHVyblRvU2V0dGluZ3NcIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XHJcbiAgICBjb25zdCByZXNldEJ1dHRvbiA9IGRvbS5ieUlkKFwicmVzZXRCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XHJcbiAgICBjb25zdCBtaW5Sb3dzSW5wdXQgPSBkb20uYnlJZChcIm1pblJvd3NcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IG1pbkNvbHNJbnB1dCA9IGRvbS5ieUlkKFwibWluQ29sc1wiKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgY29uc3QgaG9yaXpvbnRhbENoZWNrYm94ID0gZG9tLmJ5SWQoXCJob3Jpem9udGFsXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCB2ZXJ0aWNhbENoZWNrYm94ID0gZG9tLmJ5SWQoXCJ2ZXJ0aWNhbFwiKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgY29uc3QgZGlhZ29uYWxDaGVja2JveCA9IGRvbS5ieUlkKFwiZGlhZ29uYWxcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IHJldmVyc2VDaGVja2JveCA9IGRvbS5ieUlkKFwicmV2ZXJzZVwiKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgY29uc3Qgc2V0dGluZ3NEaXYgPSBkb20uYnlJZChcInNldHRpbmdzXCIpIGFzIEhUTUxEaXZFbGVtZW50O1xyXG4gICAgY29uc3QgcmVzdWx0c0RpdiA9IGRvbS5ieUlkKFwicmVzdWx0c1wiKSBhcyBIVE1MRGl2RWxlbWVudDtcclxuICAgIGNvbnN0IHN1Y2Nlc3NEaXYgPSBkb20uYnlJZChcInN1Y2Nlc3NcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbiAgICBjb25zdCBzZXR0aW5nc0tleSA9IFwid29yZFNlYXJjaFNldHRpbmdzXCI7XHJcbiAgICBjb25zdCBzZWVkID0gcmFuZC54bXVyMyhuZXcgRGF0ZSgpLnRvU3RyaW5nKCkpO1xyXG4gICAgY29uc3Qgcm5nID0gbmV3IHJhbmQuU0ZDMzJSTkcoc2VlZCgpLCBzZWVkKCksIHNlZWQoKSwgc2VlZCgpKTtcclxuICAgIGNvbnN0IGNhbnZhcyA9IGRvbS5ieUlkKFwiZ3JpZENhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudDtcclxuICAgIGNvbnN0IGN0eCA9IGdldENvbnRleHQyRChjYW52YXMpO1xyXG4gICAgY29uc3QgcmVzdWx0c1dvcmRMaXN0ID0gZG9tLmJ5SWQoXCJyZXN1bHRzV29yZExpc3RcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbiAgICBjb25zdCBzZWxlY3Rpb25zID0gbmV3IEFycmF5PFNlbGVjdGlvbj4oKTtcclxuICAgIGxldCB3b3JkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG4gICAgbGV0IGdyaWQgPSBuZXcgTGV0dGVyR3JpZCgwLCAwKTtcclxuICAgIGxldCBwbGFjZW1lbnRzID0gbmV3IEFycmF5PFNlbGVjdGlvbj4oKTtcclxuICAgIGxldCBzZWxlY3RTdGFydENvb3JkczogQ29vcmRzIHwgbnVsbCA9IG51bGw7XHJcblxyXG4gICAgbG9hZFNldHRpbmdzKCk7XHJcblxyXG4gICAgd29yZElucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChldnQpID0+IHtcclxuICAgICAgICBpZiAoZXZ0LmtleSAhPT0gXCJFbnRlclwiKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghd29yZElucHV0LnZhbHVlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFkZFdvcmQoc2V0dGluZ3NXb3JkTGlzdCwgd29yZElucHV0LnZhbHVlKTtcclxuICAgICAgICB3b3JkSW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgfSk7XHJcblxyXG4gICAgYWRkV29yZEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgXyA9PiB7XHJcbiAgICAgICAgaWYgKCF3b3JkSW5wdXQudmFsdWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWRkV29yZChzZXR0aW5nc1dvcmRMaXN0LCB3b3JkSW5wdXQudmFsdWUpO1xyXG4gICAgICAgIHdvcmRJbnB1dC52YWx1ZSA9IFwiXCI7XHJcbiAgICAgICAgd29yZElucHV0LmZvY3VzKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBnZW5lcmF0ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgXyA9PiB7XHJcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBnZXRTZXR0aW5ncygpO1xyXG4gICAgICAgIGxldCB3b3JkU2VhcmNoID0gZ2VuZXJhdGVXb3JkU2VhcmNoKHJuZywgc2V0dGluZ3MpO1xyXG4gICAgICAgIGlmICghd29yZFNlYXJjaCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzdWNjZXNzRGl2LmhpZGRlbiA9IHRydWU7XHJcbiAgICAgICAgd29yZHMgPSB3b3JkU2VhcmNoLndvcmRzO1xyXG4gICAgICAgIGdyaWQgPSB3b3JkU2VhcmNoLmdyaWQ7XHJcbiAgICAgICAgcGxhY2VtZW50cyA9IHdvcmRTZWFyY2gucGxhY2VtZW50cztcclxuICAgICAgICBjb25zb2xlLmxvZyhwbGFjZW1lbnRzKTtcclxuICAgICAgICBzZWxlY3Rpb25zLnNwbGljZSgwLCBzZWxlY3Rpb25zLmxlbmd0aCk7XHJcblxyXG4gICAgICAgIHNldHRpbmdzRGl2LmhpZGRlbiA9IHRydWU7XHJcbiAgICAgICAgcmVzdWx0c0Rpdi5oaWRkZW4gPSBmYWxzZTtcclxuICAgICAgICBwYWludChjYW52YXMsIGN0eCwgZ3JpZCwgc2VsZWN0aW9ucyk7XHJcblxyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbihyZXN1bHRzV29yZExpc3QpO1xyXG4gICAgICAgIGZvciAoY29uc3Qgd29yZCBvZiBzZXR0aW5ncy53b3Jkcykge1xyXG4gICAgICAgICAgICBhZGRXb3JkKHJlc3VsdHNXb3JkTGlzdCwgd29yZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgc2F2ZVNldHRpbmdzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBfID0+IHtcclxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGdldFNldHRpbmdzKCk7XHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oc2V0dGluZ3NLZXksIEpTT04uc3RyaW5naWZ5KHNldHRpbmdzKSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBsb2FkU2V0dGluZ3NCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGxvYWRTZXR0aW5ncyk7XHJcblxyXG4gICAgcmVzZXRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIF8gPT4ge1xyXG4gICAgICAgIG1pblJvd3NJbnB1dC52YWx1ZSA9IFwiXCI7XHJcbiAgICAgICAgbWluQ29sc0lucHV0LnZhbHVlID0gXCJcIjtcclxuXHJcbiAgICAgICAgdmFyIHdvcmREaXZzID0gQXJyYXkuZnJvbShzZXR0aW5nc1dvcmRMaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoXCIjc2V0dGluZ3NXb3JkTGlzdCAud29yZFwiKSk7XHJcbiAgICAgICAgZm9yIChjb25zdCBkaXYgb2Ygd29yZERpdnMpIHtcclxuICAgICAgICAgICAgZGl2LnJlbW92ZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVyblRvU2V0dGluZ3NCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIF8gPT4ge1xyXG4gICAgICAgIHNldHRpbmdzRGl2LmhpZGRlbiA9IGZhbHNlO1xyXG4gICAgICAgIHJlc3VsdHNEaXYuaGlkZGVuID0gdHJ1ZTtcclxuICAgIH0pO1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBldnQgPT4ge1xyXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGV2dC50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgaWYgKCF0YXJnZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0YXJnZXQubWF0Y2hlcyhcIiNzZXR0aW5nc1dvcmRMaXN0IC53b3JkXCIpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRhcmdldC5yZW1vdmUoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIG9uQ2FudmFzTW91c2VEb3duKTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBvbkNhbnZhc01vdXNlVXApO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgb25DYW52YXNNb3VzZU1vdXNlKTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2VsZWF2ZVwiLCBvbkNhbnZhc01vdXNlTGVhdmUpO1xyXG5cclxuICAgIGZ1bmN0aW9uIGdldFNldHRpbmdzKCk6IFNldHRpbmdzIHtcclxuICAgICAgICBjb25zdCBtaW5Sb3dzID0gcGFyc2VJbnQobWluUm93c0lucHV0LnZhbHVlKSB8fCAwO1xyXG4gICAgICAgIGNvbnN0IG1pbkNvbHMgPSBwYXJzZUludChtaW5Db2xzSW5wdXQudmFsdWUpIHx8IDA7XHJcbiAgICAgICAgY29uc3Qgd29yZHMgPSBbLi4uZ2V0V29yZHMoc2V0dGluZ3NXb3JkTGlzdCldO1xyXG4gICAgICAgIGNvbnN0IGhvcml6b250YWwgPSBob3Jpem9udGFsQ2hlY2tib3guY2hlY2tlZDtcclxuICAgICAgICBjb25zdCB2ZXJ0aWNhbCA9IHZlcnRpY2FsQ2hlY2tib3guY2hlY2tlZDtcclxuICAgICAgICBjb25zdCBkaWFnb25hbCA9IGRpYWdvbmFsQ2hlY2tib3guY2hlY2tlZDtcclxuICAgICAgICBjb25zdCByZXZlcnNlID0gcmV2ZXJzZUNoZWNrYm94LmNoZWNrZWQ7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIG1pblJvd3M6IG1pblJvd3MsXHJcbiAgICAgICAgICAgIG1pbkNvbHM6IG1pbkNvbHMsXHJcbiAgICAgICAgICAgIHdvcmRzOiB3b3JkcyxcclxuICAgICAgICAgICAgaG9yaXpvbnRhbDogaG9yaXpvbnRhbCxcclxuICAgICAgICAgICAgdmVydGljYWw6IHZlcnRpY2FsLFxyXG4gICAgICAgICAgICBkaWFnb25hbDogZGlhZ29uYWwsXHJcbiAgICAgICAgICAgIHJldmVyc2U6IHJldmVyc2UsXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGxvYWRTZXR0aW5ncygpIHtcclxuICAgICAgICBjb25zdCBqc29uID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oc2V0dGluZ3NLZXkpO1xyXG4gICAgICAgIGlmICghanNvbikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIk5vIHN0b3JlZCBzZXR0aW5ncyBmb3VuZFwiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBKU09OLnBhcnNlKGpzb24pIGFzIFNldHRpbmdzO1xyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbihzZXR0aW5nc1dvcmRMaXN0KTtcclxuXHJcbiAgICAgICAgaWYgKHNldHRpbmdzLm1pblJvd3MpIHtcclxuICAgICAgICAgICAgbWluUm93c0lucHV0LnZhbHVlID0gc2V0dGluZ3MubWluUm93cy50b1N0cmluZygpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG1pblJvd3NJbnB1dC52YWx1ZSA9IFwiXCI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc2V0dGluZ3MubWluQ29scykge1xyXG4gICAgICAgICAgICBtaW5Db2xzSW5wdXQudmFsdWUgPSBzZXR0aW5ncy5taW5Db2xzLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbWluQ29sc0lucHV0LnZhbHVlID0gXCJcIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGhvcml6b250YWxDaGVja2JveC5jaGVja2VkID0gc2V0dGluZ3MuaG9yaXpvbnRhbDtcclxuICAgICAgICB2ZXJ0aWNhbENoZWNrYm94LmNoZWNrZWQgPSBzZXR0aW5ncy52ZXJ0aWNhbDtcclxuICAgICAgICBkaWFnb25hbENoZWNrYm94LmNoZWNrZWQgPSBzZXR0aW5ncy5kaWFnb25hbDtcclxuICAgICAgICByZXZlcnNlQ2hlY2tib3guY2hlY2tlZCA9IHNldHRpbmdzLnJldmVyc2U7XHJcblxyXG4gICAgICAgIGlmICghc2V0dGluZ3Mud29yZHMpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChjb25zdCB3b3JkIG9mIHNldHRpbmdzLndvcmRzKSB7XHJcbiAgICAgICAgICAgIGFkZFdvcmQoc2V0dGluZ3NXb3JkTGlzdCwgd29yZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uQ2FudmFzTW91c2VEb3duKGV2OiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgeHkgPSB7IHg6IGV2Lm9mZnNldFgsIHk6IGV2Lm9mZnNldFkgfTtcclxuICAgICAgICBzZWxlY3RTdGFydENvb3JkcyA9IGNhbnZhc1RvR3JpZENvb3JkcyhjdHghLCB4eSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25DYW52YXNNb3VzZVVwKGV2OiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCFzZWxlY3RTdGFydENvb3Jkcykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjaGVjayBmb3Igd29yZCBzZWxlY3Rpb25cclxuICAgICAgICBjb25zdCB4eSA9IHsgeDogZXYub2Zmc2V0WCwgeTogZXYub2Zmc2V0WSB9O1xyXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gc2VsZWN0U3RhcnRDb29yZHM7XHJcbiAgICAgICAgY29uc3QgZW5kID0gY2FudmFzVG9HcmlkQ29vcmRzKGN0eCEsIHh5KTtcclxuICAgICAgICBjb25zb2xlLmxvZyhzdGFydCwgZW5kLCBwbGFjZW1lbnRzKTtcclxuICAgICAgICBjb25zdCBpZHggPSBwbGFjZW1lbnRzLmZpbmRJbmRleCh4ID0+XHJcbiAgICAgICAgICAgIChjb29yZHNFcXVhbCh4LnN0YXJ0LCBzdGFydCkgJiYgY29vcmRzRXF1YWwoeC5lbmQsIGVuZCkpXHJcbiAgICAgICAgICAgIHx8IChjb29yZHNFcXVhbCh4LnN0YXJ0LCBlbmQhKSAmJiBjb29yZHNFcXVhbCh4LmVuZCwgc3RhcnQpKSk7XHJcblxyXG4gICAgICAgIGlmIChpZHggPT09IC0xKSB7XHJcbiAgICAgICAgICAgIGRyYWdFbmQoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc2VsZWN0aW9uID0geyBzdGFydCwgZW5kIH07XHJcbiAgICAgICAgY29uc3Qgd29yZCA9IGV4dHJhY3RTZWxlY3Rpb24oZ3JpZCwgc2VsZWN0aW9uKVxyXG4gICAgICAgIHBsYWNlbWVudHMuc3BsaWNlKGlkeCwgMSk7XHJcblxyXG4gICAgICAgIGNvbnN0IHdvcmREaXYgPSBmaW5kV29yZEVsZW0ocmVzdWx0c1dvcmRMaXN0LCB3b3JkKTtcclxuICAgICAgICB3b3JkRGl2Py5jbGFzc0xpc3Q/LmFkZChcImZvdW5kXCIpO1xyXG4gICAgICAgIHNlbGVjdGlvbnMucHVzaChzZWxlY3Rpb24pO1xyXG4gICAgICAgIHdvcmRzLmRlbGV0ZSh3b3JkKTtcclxuXHJcbiAgICAgICAgLy8gY2hlY2sgZm9yIGNvbXBsZXRpb25cclxuICAgICAgICBpZiAod29yZHMuc2l6ZSA9PT0gMCkge1xyXG4gICAgICAgICAgICAvLyByZW1vdmUgYWxsIHVuc2VsZWN0ZWQgbGV0dGVyc1xyXG4gICAgICAgICAgICByZW1vdmVVbnNlbGVjdGVkTGV0dGVycyhncmlkLCBzZWxlY3Rpb25zKTtcclxuICAgICAgICAgICAgc3VjY2Vzc0Rpdi5oaWRkZW4gPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRyYWdFbmQoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvbkNhbnZhc01vdXNlTGVhdmUoKSB7XHJcbiAgICAgICAgZHJhZ0VuZCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uQ2FudmFzTW91c2VNb3VzZShldjogTW91c2VFdmVudCkge1xyXG4gICAgICAgIGlmICghc2VsZWN0U3RhcnRDb29yZHMpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgeHkgPSB7IHg6IGV2Lm9mZnNldFgsIHk6IGV2Lm9mZnNldFkgfTtcclxuICAgICAgICBjb25zdCBjb29yZHMgPSBjYW52YXNUb0dyaWRDb29yZHMoY3R4ISwgeHkpO1xyXG4gICAgICAgIHBhaW50KGNhbnZhcywgY3R4ISwgZ3JpZCwgc2VsZWN0aW9ucywgeyBzdGFydDogc2VsZWN0U3RhcnRDb29yZHMhLCBlbmQ6IGNvb3JkcyB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmFnRW5kKCkge1xyXG4gICAgICAgIHNlbGVjdFN0YXJ0Q29vcmRzID0gbnVsbDtcclxuICAgICAgICBwYWludChjYW52YXMsIGN0eCEsIGdyaWQsIHNlbGVjdGlvbnMsIG51bGwpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRXb3JkKHdvcmRMaXN0OiBIVE1MRGl2RWxlbWVudCwgd29yZDogc3RyaW5nKSB7XHJcbiAgICB3b3JkID0gd29yZC50cmltKCkudG9VcHBlckNhc2UoKTtcclxuXHJcbiAgICBjb25zdCB3b3JkcyA9IGdldFdvcmRzKHdvcmRMaXN0KTtcclxuICAgIHdvcmRzLmFkZCh3b3JkKTtcclxuXHJcbiAgICBjb25zdCBsaXN0ID0gWy4uLndvcmRzXTtcclxuICAgIGxpc3Quc29ydCgpO1xyXG5cclxuICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbih3b3JkTGlzdCk7XHJcbiAgICBmb3IgKGNvbnN0IHdvcmQgb2YgbGlzdCkge1xyXG4gICAgICAgIGNvbnN0IHdvcmREaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgICAgIHdvcmREaXYuY2xhc3NMaXN0LmFkZChcIndvcmRcIik7XHJcbiAgICAgICAgY29uc3Qgd29yZFRleHQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh3b3JkKTtcclxuICAgICAgICB3b3JkRGl2LmFwcGVuZENoaWxkKHdvcmRUZXh0KVxyXG4gICAgICAgIHdvcmRMaXN0LmFwcGVuZENoaWxkKHdvcmREaXYpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kV29yZEVsZW0od29yZExpc3Q6IEhUTUxEaXZFbGVtZW50LCB3b3JkOiBzdHJpbmcpOiBIVE1MRGl2RWxlbWVudCB8IG51bGwge1xyXG4gICAgd29yZCA9IHdvcmQudHJpbSgpLnRvVXBwZXJDYXNlKCk7XHJcblxyXG4gICAgY29uc3QgZWxlbXMgPSBBcnJheS5mcm9tKHdvcmRMaXN0LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTERpdkVsZW1lbnQ+KFwiLndvcmRcIikpO1xyXG4gICAgZm9yIChjb25zdCBlbGVtIG9mIGVsZW1zKSB7XHJcbiAgICAgICAgaWYgKGVsZW0udGV4dENvbnRlbnQgPT09IHdvcmQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVsZW07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRXb3Jkcyh3b3JkTGlzdDogSFRNTERpdkVsZW1lbnQpOiBTZXQ8c3RyaW5nPiB7XHJcbiAgICBjb25zdCB3b3JkcyA9IEFycmF5LmZyb20od29yZExpc3QucXVlcnlTZWxlY3RvckFsbChcIi53b3JkXCIpKVxyXG4gICAgICAgIC5tYXAoZGl2ID0+IGRpdj8udGV4dENvbnRlbnQ/LnRvVXBwZXJDYXNlKCkgPz8gXCJcIilcclxuICAgICAgICAuc29ydCgoeCwgeSkgPT4geS5sZW5ndGggLSB4Lmxlbmd0aCk7XHJcblxyXG4gICAgcmV0dXJuIG5ldyBTZXQod29yZHMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVdvcmRTZWFyY2gocm5nOiByYW5kLlJORywgc2V0dGluZ3M6IFNldHRpbmdzKTogV29yZFNlYXJjaCB8IG51bGwge1xyXG4gICAgY29uc3QgeyB3b3Jkczogd29yZHNBcnJheSwgbWluUm93cywgbWluQ29scywgaG9yaXpvbnRhbCwgdmVydGljYWwsIGRpYWdvbmFsLCByZXZlcnNlIH0gPSBzZXR0aW5ncztcclxuICAgIGNvbnN0IHdvcmRzID0gbmV3IFNldCh3b3Jkc0FycmF5KTtcclxuICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGRvbS5ieUlkKFwiZXJyb3JNZXNzYWdlXCIpIGFzIEhUTUxEaXZFbGVtZW50O1xyXG4gICAgZXJyb3JNZXNzYWdlLnRleHRDb250ZW50ID0gXCJcIjtcclxuXHJcbiAgICAvLyB2YWxpZGF0aW9uXHJcbiAgICAvLyBtdXN0IGNoZWNrIGF0IGxlYXN0IG9uZSBvZiB0aGUgZGlyZWN0aW9uYWwgY2hlY2tib3hlc1xyXG4gICAgaWYgKCFob3Jpem9udGFsICYmICF2ZXJ0aWNhbCAmJiAhZGlhZ29uYWwgJiYgIXJldmVyc2UpIHtcclxuICAgICAgICBlcnJvck1lc3NhZ2UudGV4dENvbnRlbnQgPSBcIk11c3QgY2hvb3NlIGF0IGxlYXN0IG9uZSBvZiBob3Jpem9udGFsLCB2ZXJ0aWNhbCwgZGlhZ29uYWwsIG9yIHJldmVyc2UuXCI7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbWF4UmV0cmllcyA9IDEyODtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWF4UmV0cmllczsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgZ3JpZCA9IG5ldyBMZXR0ZXJHcmlkKG1pblJvd3MgKyBpLCBtaW5Db2xzICsgaSk7XHJcbiAgICAgICAgY29uc3QgcGxhY2VtZW50cyA9IHBsYWNlV29yZHMocm5nLCBncmlkLCB3b3JkcywgaG9yaXpvbnRhbCwgdmVydGljYWwsIGRpYWdvbmFsLCByZXZlcnNlKTtcclxuICAgICAgICBpZiAocGxhY2VtZW50cykge1xyXG4gICAgICAgICAgICBmaWxsUmFuZG9tQ2hhcmFjdGVycyhybmcsIGdyaWQsIHdvcmRzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHdvcmRzLFxyXG4gICAgICAgICAgICAgICAgZ3JpZCxcclxuICAgICAgICAgICAgICAgIHBsYWNlbWVudHNcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXJyb3JNZXNzYWdlLnRleHRDb250ZW50ID0gXCJGYWlsZWQgdG8gZ2VuZXJhdGUgd29yZCBzZWFyY2ggLSBwbGVhc2UgbW9kaWZ5IHdvcmQgbGlzdCBhbmQvb3IgZ3JpZCBzaXplIGFuZCB0cnkgYWdhaW5cIjtcclxuICAgIHJldHVybiBudWxsO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZVdvcmRzKFxyXG4gICAgcm5nOiByYW5kLlJORyxcclxuICAgIGdyaWQ6IExldHRlckdyaWQsXHJcbiAgICB3b3JkczogU2V0PHN0cmluZz4sXHJcbiAgICBob3Jpem9udGFsOiBib29sZWFuLFxyXG4gICAgdmVydGljYWw6IGJvb2xlYW4sXHJcbiAgICBkaWFnb25hbDogYm9vbGVhbixcclxuICAgIHJldmVyc2U6IGJvb2xlYW4pOiBTZWxlY3Rpb25bXSB8IG51bGwge1xyXG4gICAgY29uc3QgZGlycyA9IGdldERpcnMoaG9yaXpvbnRhbCwgdmVydGljYWwsIGRpYWdvbmFsLCByZXZlcnNlKTtcclxuICAgIGNvbnN0IHBsYWNlbWVudHMgPSBuZXcgQXJyYXk8U2VsZWN0aW9uPigpO1xyXG5cclxuICAgIGZvciAoY29uc3Qgd29yZCBvZiB3b3Jkcykge1xyXG4gICAgICAgIGNvbnN0IHBsYWNlbWVudCA9IHRyeVBsYWNlV29yZChybmcsIGdyaWQsIGRpcnMsIHdvcmQpO1xyXG4gICAgICAgIGlmICghcGxhY2VtZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGxhY2VtZW50cy5wdXNoKHBsYWNlbWVudCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHBsYWNlbWVudHM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldERpcnMoaG9yaXpvbnRhbDogYm9vbGVhbiwgdmVydGljYWw6IGJvb2xlYW4sIGRpYWdvbmFsOiBib29sZWFuLCByZXZlcnNlOiBib29sZWFuKTogQ29vcmRzW10ge1xyXG4gICAgY29uc3QgZGlycyA9IG5ldyBBcnJheTxDb29yZHM+KCk7XHJcblxyXG4gICAgaWYgKGhvcml6b250YWwpIHtcclxuICAgICAgICBkaXJzLnB1c2goeyBpOiAwLCBqOiAxIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh2ZXJ0aWNhbCkge1xyXG4gICAgICAgIGRpcnMucHVzaCh7IGk6IDEsIGo6IDAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGRpYWdvbmFsKSB7XHJcbiAgICAgICAgZGlycy5wdXNoKHsgaTogMSwgajogMSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmV2ZXJzZSAmJiBob3Jpem9udGFsKSB7XHJcbiAgICAgICAgZGlycy5wdXNoKHsgaTogMCwgajogLTEgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJldmVyc2UgJiYgdmVydGljYWwpIHtcclxuICAgICAgICBkaXJzLnB1c2goeyBpOiAtMSwgajogMCB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmV2ZXJzZSAmJiBkaWFnb25hbCkge1xyXG4gICAgICAgIGRpcnMucHVzaCh7IGk6IDEsIGo6IC0xIH0pO1xyXG4gICAgICAgIGRpcnMucHVzaCh7IGk6IC0xLCBqOiAxIH0pO1xyXG4gICAgICAgIGRpcnMucHVzaCh7IGk6IC0xLCBqOiAtMSB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZGlycztcclxufVxyXG5cclxuZnVuY3Rpb24gdHJ5UGxhY2VXb3JkKHJuZzogcmFuZC5STkcsIGdyaWQ6IExldHRlckdyaWQsIGRpcnM6IENvb3Jkc1tdLCB3b3JkOiBzdHJpbmcpOiBTZWxlY3Rpb24gfCBudWxsIHtcclxuICAgIGNvbnN0IHBsYWNlbWVudCA9IHRyeUZpbmRXb3JkUGxhY2VtZW50KHJuZywgZ3JpZCwgZGlycywgd29yZCk7XHJcbiAgICBpZiAoIXBsYWNlbWVudCkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHBsYWNlV29yZChncmlkLCB3b3JkLCBwbGFjZW1lbnQpO1xyXG4gICAgcmV0dXJuIHBsYWNlbWVudDtcclxufVxyXG5cclxuZnVuY3Rpb24gdHJ5RmluZFdvcmRQbGFjZW1lbnQocm5nOiByYW5kLlJORywgZ3JpZDogTGV0dGVyR3JpZCwgZGlyZWN0aW9uczogQ29vcmRzW10sIHdvcmQ6IHN0cmluZyk6IFNlbGVjdGlvbiB8IG51bGwge1xyXG4gICAgY29uc3QgbWF4RGltID0gTWF0aC5tYXgoZ3JpZC5yb3dzLCBncmlkLmNvbHMpO1xyXG4gICAgaWYgKHdvcmQubGVuZ3RoID4gbWF4RGltKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGxcclxuICAgIH1cclxuXHJcbiAgICAvLyB0cnkgcGxhY2luZyBhdCBldmVyeSBwb3NzaWJsZSBjZWxsXHJcbiAgICBjb25zdCBncmlkQ29vcmRzID0gbmV3IEFycmF5PENvb3Jkcz4oKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ3JpZC5yb3dzOyArK2kpIHtcclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGdyaWQuY29sczsgKytqKSB7XHJcbiAgICAgICAgICAgIGdyaWRDb29yZHMucHVzaCh7IGksIGogfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGRpciA9IHJhbmQuY2hvb3NlKHJuZywgZGlyZWN0aW9ucyk7XHJcbiAgICByYW5kLnNodWZmbGUocm5nLCBncmlkQ29vcmRzKTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IHN0YXJ0IG9mIGdyaWRDb29yZHMpIHtcclxuICAgICAgICBpZiAoaXNWYWxpZFdvcmRQbGFjZW1lbnQoZ3JpZCwgd29yZCwgc3RhcnQsIGRpcikpIHtcclxuICAgICAgICAgICAgY29uc3QgZW5kID0ge1xyXG4gICAgICAgICAgICAgICAgaTogc3RhcnQuaSArIGRpci5pICogKHdvcmQubGVuZ3RoIC0gMSksXHJcbiAgICAgICAgICAgICAgICBqOiBzdGFydC5qICsgZGlyLmogKiAod29yZC5sZW5ndGggLSAxKSxcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdGFydCxcclxuICAgICAgICAgICAgICAgIGVuZCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmFsaWRXb3JkUGxhY2VtZW50KGdyaWQ6IExldHRlckdyaWQsIHdvcmQ6IHN0cmluZywgc3RhcnQ6IENvb3JkcywgZGlyOiBDb29yZHMpOiBib29sZWFuIHtcclxuICAgIGlmIChzdGFydC5pIDwgMCB8fCBzdGFydC5qIDwgMCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChzdGFydC5pID49IGdyaWQucm93cyB8fCBzdGFydC5qID49IGdyaWQucm93cykge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB7IGk6IGkwLCBqOiBqMCB9ID0gc3RhcnQ7XHJcbiAgICBjb25zdCBsZXR0ZXJzID0gd29yZC5zcGxpdChcIlwiKTtcclxuICAgIGNvbnN0IHN1Y2Nlc3MgPSBsZXR0ZXJzLmV2ZXJ5KChjaCwgaWR4KSA9PiB7XHJcbiAgICAgICAgY29uc3QgaSA9IGkwICsgZGlyLmkgKiBpZHg7XHJcbiAgICAgICAgY29uc3QgaiA9IGowICsgZGlyLmogKiBpZHg7XHJcblxyXG4gICAgICAgIGlmIChpIDwgMCB8fCBpID49IGdyaWQucm93cykge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaiA8IDAgfHwgaiA+PSBncmlkLmNvbHMpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGdyaWQuZ2V0KGksIGopID09PSBjaCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghZ3JpZC5nZXQoaSwgaikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBleGNlcHRpb246IGZ1bGwgb3ZlcmxhcCAoaS5lLiBwcmVmaXggb3ZlcmxhcHBpbmcgbG9uZ2VyIHdvcmQpIHNob3VsZCBub3QgYmUgY29uc2lkZXJlZCB2YWxpZFxyXG4gICAgaWYgKGxldHRlcnMuZXZlcnkoKGNoLCBpZHgpID0+IHtcclxuICAgICAgICBjb25zdCBpID0gaTAgKyBkaXIuaSAqIGlkeDtcclxuICAgICAgICBjb25zdCBqID0gajAgKyBkaXIuaiAqIGlkeDtcclxuICAgICAgICByZXR1cm4gZ3JpZC5nZXQoaSwgaikgPT09IGNoXHJcbiAgICB9KSkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzdWNjZXNzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZVdvcmQoZ3JpZDogTGV0dGVyR3JpZCwgd29yZDogc3RyaW5nLCBwbGFjZW1lbnQ6IFNlbGVjdGlvbikge1xyXG4gICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSBwbGFjZW1lbnQ7XHJcbiAgICBjb25zdCB7IGk6IGkwLCBqOiBqMCB9ID0gc3RhcnQ7XHJcbiAgICBjb25zdCBkaXIgPSBnZXREaXIoc3RhcnQsIGVuZCk7XHJcbiAgICBpZiAoIWRpcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBwbGFjZW1lbnQgZGlyICR7c3RhcnR9IC0gJHtlbmR9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbGV0dGVycyA9IHdvcmQuc3BsaXQoXCJcIik7XHJcbiAgICBsZXR0ZXJzLmZvckVhY2goKGNoLCBpZHgpID0+IHtcclxuICAgICAgICBjb25zdCBpID0gaTAgKyBkaXIuaSAqIGlkeDtcclxuICAgICAgICBjb25zdCBqID0gajAgKyBkaXIuaiAqIGlkeDtcclxuICAgICAgICBncmlkLnNldChpLCBqLCBjaCk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZmlsbFJhbmRvbUNoYXJhY3RlcnMocm5nOiByYW5kLlJORywgZ3JpZDogTGV0dGVyR3JpZCwgd29yZHM6IFNldDxzdHJpbmc+KSB7XHJcbiAgICAvLyBnZW5lcmF0ZSBjaGFyYWN0ZXIgbGlzdCBmcm9tIHdvcmRzXHJcblxyXG4gICAgLy8gZ2V0IGEgZmxhdCBsaXN0IG9mIGFsbCBsZXR0ZXJzIGluIGFsbCB3b3Jkc1xyXG4gICAgY29uc3QgY2hhcnNTZXQgPSBuZXcgU2V0PHN0cmluZz4oW1wiQVwiLCBcIkJcIiwgXCJDXCIsIFwiRFwiLCBcIkVcIiwgXCJGXCIsIFwiR1wiLCBcIkhcIiwgXCJJXCIsIFwiSlwiLCBcIktcIiwgXCJMXCIsIFwiTVwiLCBcIk5cIiwgXCJPXCIsIFwiUFwiLCBcIlFcIiwgXCJSXCIsIFwiU1wiLCBcIlRcIiwgXCJVXCIsIFwiVlwiLCBcIldcIiwgXCJYXCIsIFwiWVwiLCBcIlpcIl0pO1xyXG4gICAgd29yZHMuZm9yRWFjaCh3ID0+IHcuc3BsaXQoXCJcIikuZm9yRWFjaChjaCA9PiBjaGFyc1NldC5hZGQoY2gpKSk7XHJcbiAgICBjb25zdCBjaGFycyA9IFsuLi5jaGFyc1NldF07XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBncmlkLnJvd3M7ICsraSkge1xyXG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZ3JpZC5jb2xzOyArK2opIHtcclxuICAgICAgICAgICAgaWYgKGdyaWQuZ2V0KGksIGopKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgY2ggPSByYW5kLmNob29zZShybmcsIGNoYXJzKTtcclxuICAgICAgICAgICAgZ3JpZC5zZXQoaSwgaiwgY2gpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGFpbnQoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCwgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIGdyaWQ6IExldHRlckdyaWQsIHNlbGVjdGlvbnM6IFNlbGVjdGlvbltdLCBzZWxlY3Rpb246IFNlbGVjdGlvbiB8IG51bGwgPSBudWxsKSB7XHJcbiAgICBjb25zdCBmb250ID0gXCIyNHB4IG1vbm9zcGFjZVwiO1xyXG4gICAgY3R4LmZvbnQgPSBmb250O1xyXG4gICAgY29uc3QgbGV0dGVyU2l6ZSA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGg7XHJcbiAgICBjb25zdCBjZWxsU2l6ZSA9IGxldHRlclNpemUgKyBwYWRkaW5nICogMjtcclxuICAgIGNhbnZhcy53aWR0aCA9IGNlbGxTaXplICogZ3JpZC5jb2xzO1xyXG4gICAgY2FudmFzLmhlaWdodCA9IGNlbGxTaXplICogZ3JpZC5yb3dzO1xyXG4gICAgY2FudmFzLnN0eWxlLndpZHRoID0gYCR7Y2FudmFzLndpZHRofXB4YDtcclxuICAgIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBgJHtjYW52YXMuaGVpZ2h0fXB4YDtcclxuXHJcbiAgICBjdHguZm9udCA9IGZvbnQ7XHJcbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ3JpZC5yb3dzOyArK2kpIHtcclxuICAgICAgICBjb25zdCB5ID0gaSAqIGNlbGxTaXplICsgcGFkZGluZyArIGxldHRlclNpemU7XHJcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBncmlkLmNvbHM7ICsraikge1xyXG4gICAgICAgICAgICBjb25zdCB4ID0gaiAqIGNlbGxTaXplICsgcGFkZGluZztcclxuICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGdyaWQuZ2V0KGksIGopLCB4LCB5KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHNlbGVjdGlvbikge1xyXG4gICAgICAgIGNvbnN0IHh5MCA9IGdyaWRUb0NhbnZhc0Nvb3JkcyhjdHgsIHNlbGVjdGlvbi5zdGFydCk7XHJcbiAgICAgICAgY29uc3QgeHkxID0gZ3JpZFRvQ2FudmFzQ29vcmRzKGN0eCwgc2VsZWN0aW9uLmVuZCk7XHJcbiAgICAgICAgY29uc3QgeDAgPSB4eTAueCArIGNlbGxTaXplIC8gMjtcclxuICAgICAgICBjb25zdCB5MCA9IHh5MC55ICsgY2VsbFNpemUgLyAyO1xyXG4gICAgICAgIGNvbnN0IHgxID0geHkxLnggKyBjZWxsU2l6ZSAvIDI7XHJcbiAgICAgICAgY29uc3QgeTEgPSB4eTEueSArIGNlbGxTaXplIC8gMjtcclxuXHJcbiAgICAgICAgLy8gZG8gZ3JpZCBjb29yZHMgcmVwcmVzZW50IGEgc3RyYWlnaHQgbGluZT9cclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJlZFwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSA0O1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHgubW92ZVRvKHgwLCB5MCk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh4MSwgeTEpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IHNlbGVjdGlvbiBvZiBzZWxlY3Rpb25zKSB7XHJcbiAgICAgICAgY29uc3QgeHkwID0gZ3JpZFRvQ2FudmFzQ29vcmRzKGN0eCwgc2VsZWN0aW9uLnN0YXJ0KTtcclxuICAgICAgICBjb25zdCB4eTEgPSBncmlkVG9DYW52YXNDb29yZHMoY3R4LCBzZWxlY3Rpb24uZW5kKTtcclxuICAgICAgICBjb25zdCB4MCA9IHh5MC54ICsgY2VsbFNpemUgLyAyO1xyXG4gICAgICAgIGNvbnN0IHkwID0geHkwLnkgKyBjZWxsU2l6ZSAvIDI7XHJcbiAgICAgICAgY29uc3QgeDEgPSB4eTEueCArIGNlbGxTaXplIC8gMjtcclxuICAgICAgICBjb25zdCB5MSA9IHh5MS55ICsgY2VsbFNpemUgLyAyO1xyXG5cclxuICAgICAgICAvLyBkbyBncmlkIGNvb3JkcyByZXByZXNlbnQgYSBzdHJhaWdodCBsaW5lP1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgwLCAyNTUsIDAsIDAuNSlcIjtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gNDtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyh4MCwgeTApO1xyXG4gICAgICAgIGN0eC5saW5lVG8oeDEsIHkxKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbnZhc1RvR3JpZENvb3JkcyhjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgeHk6IFBvaW50KTogQ29vcmRzIHtcclxuICAgIGNvbnN0IGxldHRlclNpemUgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoO1xyXG4gICAgY29uc3QgY2VsbFNpemUgPSBsZXR0ZXJTaXplICsgcGFkZGluZyAqIDI7XHJcbiAgICBjb25zdCB7IHgsIHkgfSA9IHh5O1xyXG4gICAgY29uc3QgaSA9IE1hdGguZmxvb3IoKHkgLSBwYWRkaW5nKSAvIGNlbGxTaXplKTtcclxuICAgIGNvbnN0IGogPSBNYXRoLmZsb29yKCh4IC0gcGFkZGluZykgLyBjZWxsU2l6ZSk7XHJcbiAgICByZXR1cm4geyBpLCBqIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdyaWRUb0NhbnZhc0Nvb3JkcyhjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgaWo6IENvb3Jkcyk6IFBvaW50IHtcclxuICAgIGNvbnN0IGxldHRlclNpemUgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoO1xyXG4gICAgY29uc3QgY2VsbFNpemUgPSBsZXR0ZXJTaXplICsgcGFkZGluZyAqIDI7XHJcbiAgICBjb25zdCB7IGksIGogfSA9IGlqO1xyXG4gICAgY29uc3QgeCA9IGogKiBjZWxsU2l6ZTtcclxuICAgIGNvbnN0IHkgPSBpICogY2VsbFNpemU7XHJcbiAgICByZXR1cm4geyB4LCB5IH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldENvbnRleHQyRChjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50KTogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEIHtcclxuICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICBpZiAoIWN0eCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIGNhbnZhcyBzdXBwb3J0XCIpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBjdHg7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvb3Jkc0VxdWFsKGE6IENvb3JkcywgYjogQ29vcmRzKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gYS5pID09IGIuaSAmJiBhLmogPT0gYi5qO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXREaXIoaWowOiBDb29yZHMsIGlqMTogQ29vcmRzKTogQ29vcmRzIHwgbnVsbCB7XHJcbiAgICBjb25zdCBkaSA9IGlqMS5pIC0gaWowLmk7XHJcbiAgICBjb25zdCBkaiA9IGlqMS5qIC0gaWowLmo7XHJcblxyXG4gICAgY29uc29sZS5sb2coZGksIGRqKTtcclxuICAgIGlmIChkaSA9PT0gMCAmJiBkaiA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChkaSAhPT0gMCAmJiBkaiAhPT0gMCAmJiBNYXRoLmFicyhkaSkgIT09IE1hdGguYWJzKGRqKSkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7IGk6IE1hdGguc2lnbihkaSksIGo6IE1hdGguc2lnbihkaikgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlVW5zZWxlY3RlZExldHRlcnMoZ3JpZDogTGV0dGVyR3JpZCwgc2VsZWN0aW9uczogU2VsZWN0aW9uW10pIHtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ3JpZC5yb3dzOyArK2kpIHtcclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGdyaWQuY29sczsgKytqKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvb3JkcyA9IHsgaSwgaiB9O1xyXG4gICAgICAgICAgICBpZiAoc2VsZWN0aW9ucy5zb21lKHggPT4gc2VsZWN0aW9uQ29udGFpbnMoeCwgY29vcmRzKSkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBncmlkLnNldChpLCBqLCBcIiBcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzZWxlY3Rpb25Db250YWlucyhzZWxlY3Rpb246IFNlbGVjdGlvbiwgaWo6IENvb3Jkcyk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgZGlyID0gZ2V0RGlyKHNlbGVjdGlvbi5zdGFydCwgc2VsZWN0aW9uLmVuZCk7XHJcbiAgICBpZiAoIWRpcikge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB7IHN0YXJ0LCBlbmQgfSA9IHNlbGVjdGlvbjtcclxuICAgIGxldCB7IGksIGogfSA9IHN0YXJ0O1xyXG4gICAgd2hpbGUgKGkgPj0gMCAmJiBqID49IDApIHtcclxuICAgICAgICBpZiAoaSA9PSBpai5pICYmIGogPT0gaWouaikge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpID09PSBlbmQuaSAmJiBqID09PSBlbmQuaikge1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGkgKz0gZGlyLmk7XHJcbiAgICAgICAgaiArPSBkaXIuajtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RTZWxlY3Rpb24oZ3JpZDogTGV0dGVyR3JpZCwgc2VsZWN0aW9uOiBTZWxlY3Rpb24pOiBzdHJpbmcge1xyXG4gICAgLy8gY2hlY2sgZGlyZWN0aW9uIC0gaWYgaWowIHRvIGlqMSBpcyBub3QgaG9yaXpvbnRhbCwgdmVydGljYWwsIG9yIGRpYWdvbmFsLCBubyBtYXRjaCBwb3NzaWJsZVxyXG4gICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSBzZWxlY3Rpb247XHJcbiAgICBjb25zdCBkaXIgPSBnZXREaXIoc3RhcnQsIGVuZCk7XHJcbiAgICBpZiAoIWRpcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBzZWxlY3Rpb24gZGlyZWN0aW9uICR7c3RhcnR9IC0gJHtlbmR9YClcclxuICAgIH1cclxuXHJcbiAgICAvLyBleHRyYWN0IHNlbGVjdGVkIHdvcmRcclxuICAgIGxldCB7IGksIGogfSA9IHNlbGVjdGlvbi5zdGFydDtcclxuICAgIGxldCBzID0gXCJcIjtcclxuXHJcbiAgICB3aGlsZSAoaSA+PSAwICYmIGkgPCBncmlkLnJvd3MgJiYgaiA+PSAwICYmIGogPCBncmlkLmNvbHMpIHtcclxuICAgICAgICBzICs9IGdyaWQuZ2V0KGksIGopO1xyXG5cclxuICAgICAgICBpZiAoaSA9PT0gZW5kLmkgJiYgaiA9PT0gZW5kLmopIHtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpICs9IGRpci5pO1xyXG4gICAgICAgIGogKz0gZGlyLmo7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHM7XHJcbn1cclxuXHJcbm1haW4oKSJdfQ==