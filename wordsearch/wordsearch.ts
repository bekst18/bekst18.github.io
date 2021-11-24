"use strict";
import * as dom from "../shared/dom.js";
import * as iter from "../shared/iter.js";
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

interface Placement {
    position: Coords
    direction: Coords
}

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

    get(row: number, col: number): string {
        return this.getf(this.flat(row, col));
    }

    set(row: number, col: number, ch: string) {
        this.setf(this.flat(row, col), ch);
    }
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
    const settingsKey = "wordSearchSettings";
    const gridCanvas = dom.byId("gridCanvas") as HTMLCanvasElement;
    let grid = new LetterGrid(0, 0);

    const ctx = gridCanvas.getContext("2d");
    if (!ctx) {
        throw new Error("No canvas support");
    }

    const seed = rand.xmur3(new Date().toString());
    const rng = new rand.SFC32RNG(seed(), seed(), seed(), seed());
    let drag = false;

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
        let maybeGrid = generateWordSearch(rng, settings);
        if (!maybeGrid) {
            return;
        }

        grid = maybeGrid
        settingsDiv.hidden = true;
        resultsDiv.hidden = false;
        paint(gridCanvas, ctx, grid)

        // TODO - fill in output word lsit
        const wordList = dom.byId("resultsWordList") as HTMLDivElement;
        dom.removeAllChildren(wordList);
        for (const word of settings.words) {
            addWord(wordList, word);
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

        if (!target.matches(".word")) {
            return;
        }

        target.remove();
    });

    // letterTable.addEventListener("mousedown", onLetterTableMouseDown);
    // letterTable.addEventListener("mouseup", onLetterTableMouseUp);
    // letterTable.addEventListener("mouseover", onLetterTableMouseOver);
    // letterTable.addEventListener("mouseleave", onLetterTableMouseLeave);

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
        }

        if (settings.minCols) {
            minColsInput.value = settings.minCols.toString();
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

    // function onLetterTableMouseDown(ev: MouseEvent) {
    //     drag = true;
    // }

    // function onLetterTableMouseUp(ev: MouseEvent) {
    //     onDragEnd();
    // }

    // function onLetterTableMouseLeave(ev: MouseEvent) {
    //     onDragEnd();
    // }

    // function onLetterTableMouseOver(ev: MouseEvent) {
    //     const td = ev.target as HTMLTableCellElement;
    //     if (!td) {
    //         return;
    //     }

    //     if (!drag) {
    //         return;
    //     }

    //     if (!td.matches("td")) {
    //         return;
    //     }

    //     const col = dom.getElementIndex(td);
    //     const row = dom.getElementIndex(td.closest("tr")!);
    //     console.log(row, col);

    //     td.classList.add("selected");
    // }

    // function onDragEnd() {
    //     drag = false;
    //     const cells = Array.from(letterTable.querySelectorAll("tbody td.selected"));
    //     for (const cell of cells) {
    //         cell.classList.remove("selected");
    //     }
    // }
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

function getWords(wordList: HTMLDivElement): Set<string> {
    const words = Array.from(wordList.querySelectorAll(".word"))
        .map(div => div?.textContent?.toUpperCase() ?? "")
        .sort((x, y) => y.length - x.length);

    return new Set(words);
}

function generateWordSearch(rng: rand.RNG, settings: Settings): LetterGrid | null {
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
        if (placeWords(rng, grid, words, horizontal, vertical, diagonal, reverse)) {
            fillRandomCharacters(rng, grid, words);
            return grid;
        }
    }

    errorMessage.textContent = "Failed to generate word search - please modify word list and/or grid size and try again";
    return null;
}

function placeWords(rng: rand.RNG, grid: LetterGrid, words: Set<string>, horizontal: boolean, vertical: boolean, diagonal: boolean, reverse: boolean) {
    const dirs = getDirs(horizontal, vertical, diagonal, reverse);
    const success = iter.all(words, word => tryPlaceWord(rng, grid, dirs, word));
    return success;
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

function tryPlaceWord(rng: rand.RNG, grid: LetterGrid, dirs: Coords[], word: string) {
    const placement = tryFindWordPlacement(rng, grid, dirs, word);
    if (!placement) {
        return false;
    }

    placeWord(grid, word, placement);
    return true;
}

function tryFindWordPlacement(rng: rand.RNG, grid: LetterGrid, directions: Coords[], word: string): Placement | null {
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

    const direction = rand.choose(rng, directions);
    rand.shuffle(rng, gridCoords);

    for (const position of gridCoords) {
        if (isValidWordPlacement(grid, word, position, direction)) {
            return {
                position,
                direction,
            };
        }
    }

    return null;
}

function isValidWordPlacement(grid: LetterGrid, word: string, position: Coords, direction: Coords) {
    const { i: i0, j: j0 } = position;
    if (i0 < 0 || j0 < 0) {
        return false
    }

    const extentI = word.length * direction.i;
    if (i0 + extentI > grid.rows || i0 + extentI < 0) {
        return false;
    }

    const extentJ = word.length * direction.j;
    if (j0 + extentJ > grid.cols || j0 + extentJ < 0) {
        return false;
    }

    const letters = word.split("");
    const success = letters.every((ch, idx) => {
        const i = i0 + direction.i * idx;
        const j = j0 + direction.j * idx;

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
        const i = i0 + direction.i * idx;
        const j = j0 + direction.j * idx;
        return grid.get(i, j) === ch
    })) {
        return false
    }

    return success;
}

function placeWord(grid: LetterGrid, word: string, placement: Placement) {
    const { position: { i: i0, j: j0 }, direction } = placement;
    const letters = word.split("");

    letters.forEach((ch, idx) => {
        const i = i0 + direction.i * idx;
        const j = j0 + direction.j * idx;
        grid.set(i, j, ch);
    });
}

function fillRandomCharacters(rng: rand.RNG, grid: LetterGrid, words: Set<string>) {
    // generate character list from words

    // get a flat list of all letters in all words
    const chars = new Array<string>();
    words.forEach(w => w.split("").forEach(ch => chars.push(ch)));

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

function paint(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, grid: LetterGrid) {
    const font = "24px monospace";
    ctx.font = font;
    const padding = 4;
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
}

main()