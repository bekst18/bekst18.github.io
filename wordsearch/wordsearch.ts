"use strict";
import * as dom from "../shared/dom.js";
import * as rand from "../shared/rand.js";
import * as array from "../shared/array.js";

interface Settings {
    minRows: number
    minCols: number
    horizontal: boolean
    vertical: boolean
    diagonal: boolean
    reverse: boolean
    words: string[],
}

/**
 * a row/column within the grid
 */
interface Coords {
    /**row within grid */
    i: number,
    /**column within grid */
    j: number,
}

interface Point {
    x: number,
    y: number
}

interface Selection {
    start: Coords
    end: Coords
}

const padding = 4;

class LetterGrid {
    letters: string[]

    constructor(readonly rows: number, readonly cols: number) {
        this.letters = array.generate(rows * cols, _ => "");
    }

    getf(idx: number): string {
        return this.letters[idx];
    }

    setf(idx: number, ch: string) {
        if (ch.length > 1) {
            throw new Error("Must be a single character or empty string");
        }

        return this.letters[idx] = ch;
    }

    flat(row: number, col: number): number {
        return row * this.cols + col;
    }

    hier(idx: number): Coords {
        const i = Math.floor(idx / this.cols);
        const j = idx % this.cols;
        return { i, j };
    }

    get(row: number, col: number): string {
        return this.getf(this.flat(row, col));
    }

    set(row: number, col: number, ch: string) {
        this.setf(this.flat(row, col), ch);
    }
}

interface WordSearch {
    words: Set<string>
    grid: LetterGrid
    placements: Selection[]
}

function main() {
    const wordInput = dom.byId("word") as HTMLButtonElement;
    const settingsWordList = dom.byId("settingsWordList") as HTMLDivElement;
    const addWordButton = dom.byId("addWord") as HTMLButtonElement;
    const generateButton = dom.byId("generateButton") as HTMLButtonElement;
    const saveSettingsButton = dom.byId("saveSettings") as HTMLButtonElement;
    const loadSettingsButton = dom.byId("loadSettings") as HTMLButtonElement;
    const returnToSettingsButton = dom.byId("returnToSettings") as HTMLButtonElement;
    const resetButton = dom.byId("resetButton") as HTMLButtonElement;
    const minRowsInput = dom.byId("minRows") as HTMLInputElement;
    const minColsInput = dom.byId("minCols") as HTMLInputElement;
    const horizontalCheckbox = dom.byId("horizontal") as HTMLInputElement;
    const verticalCheckbox = dom.byId("vertical") as HTMLInputElement;
    const diagonalCheckbox = dom.byId("diagonal") as HTMLInputElement;
    const reverseCheckbox = dom.byId("reverse") as HTMLInputElement;
    const settingsDiv = dom.byId("settings") as HTMLDivElement;
    const resultsDiv = dom.byId("results") as HTMLDivElement;
    const successDiv = dom.byId("success") as HTMLDivElement;
    const settingsKey = "wordSearchSettings";
    const seed = rand.xmur3(new Date().toString());
    const rng = new rand.SFC32RNG(seed(), seed(), seed(), seed());
    const canvas = dom.byId("gridCanvas") as HTMLCanvasElement;
    const ctx = getContext2D(canvas);
    const resultsWordList = dom.byId("resultsWordList") as HTMLDivElement;
    const selections = new Array<Selection>();
    let words = new Set<string>();
    let grid = new LetterGrid(0, 0);
    let placements = new Array<Selection>();
    let selectStartCoords: Coords | null = null;

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
        const target = evt.target as HTMLElement;
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

    function getSettings(): Settings {
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
        }
    }

    function loadSettings() {
        const json = localStorage.getItem(settingsKey);
        if (!json) {
            console.log("No stored settings found");
            return;
        }

        const settings = JSON.parse(json) as Settings;
        dom.removeAllChildren(settingsWordList);

        if (settings.minRows) {
            minRowsInput.value = settings.minRows.toString();
        } else {
            minRowsInput.value = "";
        }

        if (settings.minCols) {
            minColsInput.value = settings.minCols.toString();
        } else {
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

    function onCanvasMouseDown(ev: MouseEvent) {
        const xy = { x: ev.offsetX, y: ev.offsetY };
        selectStartCoords = canvasToGridCoords(ctx!, xy);
    }

    function onCanvasMouseUp(ev: MouseEvent) {
        if (!selectStartCoords) {
            return;
        }

        // check for word selection
        const xy = { x: ev.offsetX, y: ev.offsetY };
        const start = selectStartCoords;
        const end = canvasToGridCoords(ctx!, xy);
        console.log(start, end, placements);
        const idx = placements.findIndex(x =>
            (coordsEqual(x.start, start) && coordsEqual(x.end, end))
            || (coordsEqual(x.start, end!) && coordsEqual(x.end, start)));

        if (idx === -1) {
            dragEnd();
            return;
        }

        const selection = { start, end };
        const word = extractSelection(grid, selection)
        placements.splice(idx, 1);

        const wordDiv = findWordElem(resultsWordList, word);
        wordDiv?.classList?.add("found");
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

    function onCanvasMouseMouse(ev: MouseEvent) {
        if (!selectStartCoords) {
            return;
        }

        const xy = { x: ev.offsetX, y: ev.offsetY };
        const coords = canvasToGridCoords(ctx!, xy);
        paint(canvas, ctx!, grid, selections, { start: selectStartCoords!, end: coords });
    }

    function dragEnd() {
        selectStartCoords = null;
        paint(canvas, ctx!, grid, selections, null);
    }
}

function addWord(wordList: HTMLDivElement, word: string) {
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
        wordDiv.appendChild(wordText)
        wordList.appendChild(wordDiv);
    }
}

function findWordElem(wordList: HTMLDivElement, word: string): HTMLDivElement | null {
    word = word.trim().toUpperCase();

    const elems = Array.from(wordList.querySelectorAll<HTMLDivElement>(".word"));
    for (const elem of elems) {
        if (elem.textContent === word) {
            return elem;
        }
    }

    return null;
}

function getWords(wordList: HTMLDivElement): Set<string> {
    const words = Array.from(wordList.querySelectorAll(".word"))
        .map(div => div?.textContent?.toUpperCase() ?? "")
        .sort((x, y) => y.length - x.length);

    return new Set(words);
}

function generateWordSearch(rng: rand.RNG, settings: Settings): WordSearch | null {
    const { words: wordsArray, minRows, minCols, horizontal, vertical, diagonal, reverse } = settings;
    const words = new Set(wordsArray);
    const errorMessage = dom.byId("errorMessage") as HTMLDivElement;
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

function placeWords(
    rng: rand.RNG,
    grid: LetterGrid,
    words: Set<string>,
    horizontal: boolean,
    vertical: boolean,
    diagonal: boolean,
    reverse: boolean): Selection[] | null {
    const dirs = getDirs(horizontal, vertical, diagonal, reverse);
    const placements = new Array<Selection>();

    for (const word of words) {
        const placement = tryPlaceWord(rng, grid, dirs, word);
        if (!placement) {
            return null;
        }

        placements.push(placement);
    }

    return placements;
}

function getDirs(horizontal: boolean, vertical: boolean, diagonal: boolean, reverse: boolean): Coords[] {
    const dirs = new Array<Coords>();

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

function tryPlaceWord(rng: rand.RNG, grid: LetterGrid, dirs: Coords[], word: string): Selection | null {
    const placement = tryFindWordPlacement(rng, grid, dirs, word);
    if (!placement) {
        return null;
    }

    placeWord(grid, word, placement);
    return placement;
}

function tryFindWordPlacement(rng: rand.RNG, grid: LetterGrid, directions: Coords[], word: string): Selection | null {
    const maxDim = Math.max(grid.rows, grid.cols);
    if (word.length > maxDim) {
        return null
    }

    // try placing at every possible cell
    const gridCoords = new Array<Coords>();
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

function isValidWordPlacement(grid: LetterGrid, word: string, start: Coords, dir: Coords): boolean {
    if (start.i < 0 || start.j < 0) {
        return false
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
        return grid.get(i, j) === ch
    })) {
        return false
    }

    return success;
}

function placeWord(grid: LetterGrid, word: string, placement: Selection) {
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

function fillRandomCharacters(rng: rand.RNG, grid: LetterGrid, words: Set<string>) {
    // generate character list from words

    // get a flat list of all letters in all words
    const charsSet = new Set<string>(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]);
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

function paint(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, grid: LetterGrid, selections: Selection[], selection: Selection | null = null) {
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

function canvasToGridCoords(ctx: CanvasRenderingContext2D, xy: Point): Coords {
    const letterSize = ctx.measureText("M").width;
    const cellSize = letterSize + padding * 2;
    const { x, y } = xy;
    const i = Math.floor((y - padding) / cellSize);
    const j = Math.floor((x - padding) / cellSize);
    return { i, j };
}

function gridToCanvasCoords(ctx: CanvasRenderingContext2D, ij: Coords): Point {
    const letterSize = ctx.measureText("M").width;
    const cellSize = letterSize + padding * 2;
    const { i, j } = ij;
    const x = j * cellSize;
    const y = i * cellSize;
    return { x, y };
}

function getContext2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("No canvas support");
    }

    return ctx;
}

function coordsEqual(a: Coords, b: Coords): boolean {
    return a.i == b.i && a.j == b.j;
}

function getDir(ij0: Coords, ij1: Coords): Coords | null {
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

function removeUnselectedLetters(grid: LetterGrid, selections: Selection[]) {
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

function selectionContains(selection: Selection, ij: Coords): boolean {
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

function extractSelection(grid: LetterGrid, selection: Selection): string {
    // check direction - if ij0 to ij1 is not horizontal, vertical, or diagonal, no match possible
    const { start, end } = selection;
    const dir = getDir(start, end);
    if (!dir) {
        throw new Error(`Invalid selection direction ${start} - ${end}`)
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

main()