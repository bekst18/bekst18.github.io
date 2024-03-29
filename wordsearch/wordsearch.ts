"use strict";
import * as dom from "../shared/dom.js";
import * as rand from "../shared/rand.js";
import * as array from "../shared/array.js";

interface WordSearchOptions {
    horizontal?: boolean,
    vertical?: boolean,
    diagonal?: boolean,
    reverse?: boolean,
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

interface CoordsRange {
    start: Coords
    end: Coords
}

const padding = 4;

interface LetterGridState {
    rows: number,
    cols: number,
    letters: string[],
}

class LetterGrid {
    letters: string[]

    constructor(readonly rows: number, readonly cols: number, letters?: string[]) {
        if (letters && letters.length !== rows * cols) {
            throw new Error("Invalid letters array length.");
        }

        this.letters = letters ?? array.generate(rows * cols, _ => "");
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

    toJSON(): LetterGridState {
        const data: LetterGridState = {
            rows: this.rows,
            cols: this.cols,
            letters: this.letters,
        };

        return data;
    }
}

interface WordSearch {
    grid: LetterGrid
    placements: CoordsRange[]
}

enum Activity {
    Settings,
    Results,
}

interface State {
    horizontal: boolean
    vertical: boolean
    diagonal: boolean
    reverse: boolean
    words: string[],
    remainingWords: string[],
    grid: LetterGridState
    placements: CoordsRange[]
    found: CoordsRange[]
    activity: Activity
}

function main() {
    const wordInput = dom.byId("word") as HTMLButtonElement;
    const settingsWordList = dom.byId("settingsWordList") as HTMLDivElement;
    const addWordButton = dom.byId("addWord") as HTMLButtonElement;
    const generateButton = dom.byId("generateButton") as HTMLButtonElement;
    const returnToSettingsButton = dom.byId("returnToSettings") as HTMLButtonElement;
    const resetButton = dom.byId("resetButton") as HTMLButtonElement;
    const horizontalCheckbox = dom.byId("horizontal") as HTMLInputElement;
    const verticalCheckbox = dom.byId("vertical") as HTMLInputElement;
    const diagonalCheckbox = dom.byId("diagonal") as HTMLInputElement;
    const reverseCheckbox = dom.byId("reverse") as HTMLInputElement;
    const settingsDiv = dom.byId("settings") as HTMLDivElement;
    const resultsDiv = dom.byId("results") as HTMLDivElement;
    const successDiv = dom.byId("success") as HTMLDivElement;
    const stateKey = "wordSearchState";
    const seed = rand.xmur3(new Date().toString());
    const rng = new rand.SFC32RNG(seed(), seed(), seed(), seed());
    const canvas = dom.byId("gridCanvas") as HTMLCanvasElement;
    const ctx = getContext2D(canvas);
    const resultsWordList = dom.byId("resultsWordList") as HTMLDivElement;
    let found = new Array<CoordsRange>();
    let words = new Set<string>();
    let remainingWords = new Set<string>();
    let grid = new LetterGrid(0, 0);
    let placements = new Array<CoordsRange>();
    let selectStartCoords: Coords | null = null;

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

        addSettingsWord()
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
        const target = evt.target as HTMLElement;
        if (!target) {
            return;
        }

        if (!target.matches("#settingsWordList .word")) {
            return;
        }

        const word = target.textContent ?? "";
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

    function getWordSearchOptions(): WordSearchOptions {
        const horizontal = horizontalCheckbox.checked;
        const vertical = verticalCheckbox.checked;
        const diagonal = diagonalCheckbox.checked;
        const reverse = reverseCheckbox.checked;

        return {
            horizontal,
            vertical,
            diagonal,
            reverse,
        }
    }

    function onCanvasPointerDown(ev: PointerEvent) {
        const xy = { x: ev.offsetX, y: ev.offsetY };
        selectStartCoords = canvasToGridCoords(ctx!, xy);
    }

    function onCanvasPointerUp(ev: PointerEvent) {
        if (!selectStartCoords) {
            return;
        }

        // check for word selection
        const xy = { x: ev.offsetX, y: ev.offsetY };
        const start = selectStartCoords;
        const end = canvasToGridCoords(ctx!, xy);
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

    function onCanvasPointerMove(ev: PointerEvent) {
        if (!selectStartCoords) {
            return;
        }

        const xy = { x: ev.offsetX, y: ev.offsetY };
        const coords = canvasToGridCoords(ctx!, xy);
        paint(canvas, ctx!, grid, found, { start: selectStartCoords!, end: coords });
    }

    function dragEnd() {
        selectStartCoords = null;
        paint(canvas, ctx!, grid, found, null);
    }

    function saveState() {
        const horizontal = horizontalCheckbox.checked;
        const vertical = verticalCheckbox.checked;
        const diagonal = diagonalCheckbox.checked;
        const reverse = reverseCheckbox.checked;
        const activity = settingsDiv.hidden ? Activity.Results : Activity.Settings;

        const state: State = {
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

        const state: State = JSON.parse(json);
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
        } else {
            settingsDiv.hidden = true;
            resultsDiv.hidden = false;
        }

        paint(canvas, ctx, grid, found);
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

function generateWordSearch(rng: rand.RNG, words: Set<string>, options: WordSearchOptions): WordSearch | null {
    const horizontal = options.horizontal ?? true;
    const vertical = options.vertical ?? true;
    const diagonal = options.diagonal ?? true;
    const reverse = options.reverse ?? true;
    const errorMessage = dom.byId("errorMessage") as HTMLDivElement;
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

function placeWords(
    rng: rand.RNG,
    grid: LetterGrid,
    words: Set<string>,
    horizontal: boolean,
    vertical: boolean,
    diagonal: boolean,
    reverse: boolean): CoordsRange[] | null {
    const dirs = getDirs(horizontal, vertical, diagonal, reverse);
    const placements = new Array<CoordsRange>();

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

function tryPlaceWord(rng: rand.RNG, grid: LetterGrid, dirs: Coords[], word: string): CoordsRange | null {
    const placement = tryFindWordPlacement(rng, grid, dirs, word);
    if (!placement) {
        return null;
    }

    placeWord(grid, word, placement);
    return placement;
}

function tryFindWordPlacement(rng: rand.RNG, grid: LetterGrid, directions: Coords[], word: string): CoordsRange | null {
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

function placeWord(grid: LetterGrid, word: string, placement: CoordsRange) {
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

function paint(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, grid: LetterGrid, found: CoordsRange[], selection: CoordsRange | null = null) {
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

    if (di === 0 && dj === 0) {
        return null;
    }

    if (di !== 0 && dj !== 0 && Math.abs(di) !== Math.abs(dj)) {
        return null;
    }

    return { i: Math.sign(di), j: Math.sign(dj) };
}

function removeUnselectedLetters(grid: LetterGrid, selections: CoordsRange[]) {
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

function selectionContains(selection: CoordsRange, ij: Coords): boolean {
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

function extractSelection(grid: LetterGrid, selection: CoordsRange): string {
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

function refreshWordList(div: HTMLDivElement, words: Set<string>, remainingWords: Set<string>) {
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
        wordDiv.appendChild(wordText)
        div.appendChild(wordDiv);
    }
}

main()