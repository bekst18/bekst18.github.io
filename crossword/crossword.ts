import * as dom from "../shared/dom.js"
import * as rand from "../shared/rand.js"
import * as geo from "../shared/geo2d.js"

const STORAGE_KEY = "crossword_storage";
const CELL_INTERIOR_SIZE = 24;
const CELL_PADDING = 4;
const CELL_SIZE = CELL_INTERIOR_SIZE + CELL_PADDING * 2;
const MAX_GENS = 1000;

interface HintAnswer {
    hint: string,
    answer: string,
}

enum Direction {
    Across,
    Down,
}

interface Entry {
    num: number,
    hint: string,
    answer: string,
    pos: geo.Point,
    dir: Direction,
    solved: boolean,
}

class LetterMap {
    private data: Map<number, string>;

    constructor(public rows: number, public cols: number) {
        this.data = new Map<number, string>();
    }

    get(xy: geo.Point): string {
        const id = this.flat(xy);
        return this.data.get(id) ?? "";
    }

    set(xy: geo.Point, value: string) {
        const id = this.flat(xy);

        if (!value) {
            this.data.delete(id);
            return;
        }

        this.data.set(id, value);
    }

    keys(): geo.Point[] {
        return [...this.data.keys()].map(k => this.hier(k));
    }

    private flat(xy: geo.Point): number {
        return xy.y * this.cols + xy.x
    }

    private hier(n: number): geo.Point {
        const y = Math.floor(n / this.cols);
        const x = n - y * this.cols;
        return new geo.Point(x, y);
    }
}

class PointSet {
    private data: Set<number>;

    constructor(public rows: number, public cols: number) {
        this.data = new Set<number>();
    }

    has(xy: geo.Point): boolean {
        const id = this.flat(xy);
        return this.data.has(id);
    }

    add(xy: geo.Point) {
        const id = this.flat(xy);
        this.data.add(id);
    }

    keys(): geo.Point[] {
        return [...this.data].map(k => this.hier(k));
    }

    private flat(xy: geo.Point): number {
        return xy.y * this.cols + xy.x
    }

    private hier(n: number): geo.Point {
        const y = Math.floor(n / this.cols);
        const x = n - y * this.cols;
        return new geo.Point(x, y);
    }
}

interface Puzzle {
    entries: Entry[],
    hoverCoords: geo.Point | null,
    cursorCoords: geo.Point | null,
    cursorDir: Direction,
    grid: LetterMap,
}

enum Mode {
    Create,
    Play
}

interface AppState {
    mode: Mode,
    hintAnswers: HintAnswer[],
    puzzle: Puzzle,
}

function main() {
    let hintAnswers = new Array<HintAnswer>();

    const puzzle = <Puzzle>{
        entries: new Array<Entry>(),
        hoverCoords: null,
        cursorCoords: null,
        cursorDir: Direction.Across,
        grid: new LetterMap(0, 0),
    };

    const createUi = dom.byId("createUi") as HTMLDivElement;
    const playUi = dom.byId("playUi") as HTMLDivElement;
    const puzzleCanvas = dom.byId("puzzleCanvas") as HTMLCanvasElement;
    const puzzleContext = puzzleCanvas.getContext("2d") as CanvasRenderingContext2D;
    if (!puzzleContext) {
        throw new Error("Canvas element not supported")
    }

    const hintAnswerForm = dom.byId("hintAnswerForm") as HTMLFormElement;
    const hintInput = dom.byId("hint") as HTMLInputElement;
    const answerInput = dom.byId("answer") as HTMLInputElement;
    const hintAnswerTemplate = dom.byId("hintAnswerTemplate") as HTMLTemplateElement;
    const hintAnswerList = dom.byId("hintAnswers") as HTMLOListElement;
    const puzzleHintTemplate = dom.byId("puzzleHintTemplate") as HTMLTemplateElement;
    const puzzleHintAcrossList = dom.byId("puzzleHintsAcross") as HTMLOListElement;
    const puzzleHintDownList = dom.byId("puzzleHintsDown") as HTMLOListElement;
    const createButton = dom.byId("createButton") as HTMLButtonElement;
    const clearButton = dom.byId("clearButton") as HTMLButtonElement;
    const returnToCreate = dom.byId("returnToCreate") as HTMLLinkElement;
    // const seed = rand.xmur3(new Date().toString());
    // const rng = new rand.SFC32RNG(seed(), seed(), seed(), seed());
    const rng = new rand.SFC32RNG(1, 2, 3, 4);
    hintAnswerForm.addEventListener("submit", addHintAnswer);
    createButton.addEventListener("click", () => generate());
    clearButton.addEventListener("click", clear);
    returnToCreate.addEventListener("click", create);
    puzzleCanvas.addEventListener("pointermove", onPuzzlePointerMove);
    puzzleCanvas.addEventListener("pointerdown", onPuzzlePointerDown);
    puzzleCanvas.addEventListener("pointerout", onPuzzlePointerOut);
    puzzleCanvas.addEventListener("keydown", onPuzzleKeydown);

    dom.delegate(hintAnswerList, "click", ".delete-button", deleteHintAnswer);
    dom.delegate(puzzleHintAcrossList, "click", ".puzzle-hint-li", onPuzzleHintClick);
    dom.delegate(puzzleHintDownList, "click", ".puzzle-hint-li", onPuzzleHintClick);

    load();

    function addHintAnswer(e: Event) {
        e.preventDefault();

        const hint = hintInput.value;
        const answer = answerInput.value;
        if (!hint || !answer) {
            return
        }

        hintAnswers.push({ hint, answer });
        save();

        updateHintAnswerList();

        hintInput.value = "";
        answerInput.value = "";
        hintInput.focus();
    }

    function updateHintAnswerList() {
        dom.removeAllChildren(hintAnswerList);
        for (const hintAnswer of hintAnswers) {
            const fragment = hintAnswerTemplate.content.cloneNode(true) as DocumentFragment;
            const hintSpan = dom.bySelector(fragment, ".hint");
            const answerSpan = dom.bySelector(fragment, ".answer");
            hintSpan.textContent = hintAnswer.hint;
            answerSpan.textContent = hintAnswer.answer;
            hintAnswerList.appendChild(fragment);
        }
    }

    function clear() {
        hintAnswers = [];
        updateHintAnswerList();
        save();
    }

    function deleteHintAnswer(e: Event) {
        const target = e.target as HTMLElement;
        const li = target.closest(".hint-answer-li") as HTMLLIElement;
        const parent = li.parentElement;
        if (!parent) {
            return;
        }

        const index = Array.from(parent.children).indexOf(li);
        hintAnswers.splice(index, 1);
        save();
        updateHintAnswerList();
    }

    function load() {
        const jsonData = localStorage.getItem(STORAGE_KEY);
        if (!jsonData) {
            return;
        }

        hintAnswers = JSON.parse(jsonData) as [HintAnswer];
        updateHintAnswerList();

        if (hintAnswers.length > 0) {
            generate();
        }
    }

    function save() {
        const jsonData = JSON.stringify(hintAnswers);
        localStorage.setItem(STORAGE_KEY, jsonData);
    }

    function generate() {
        puzzle.entries = [];
        puzzle.entries = generatePuzzle(rng, hintAnswers);
        if (puzzle.entries.length === 0) {
            alert("Failed to generate puzzle");
            return;
        }

        const rows = Math.max(...puzzle.entries.map(x => x.pos.x + entryWidth(x)));
        const cols = Math.max(...puzzle.entries.map(x => x.pos.y + entryHeight(x)));
        puzzle.grid = new LetterMap(rows, cols);

        play();
    }

    function play() {
        createUi.hidden = true;
        playUi.hidden = false;
        puzzleCanvas.width = puzzleCanvas.clientWidth;
        puzzleCanvas.height = puzzleCanvas.clientHeight;
        updatePuzzleHintList();
        window.scrollTo({ left: 0, top: 0 });
        puzzleCanvas.focus();

        if (puzzle.entries.length > 0) {
            puzzle.cursorCoords = puzzle.entries[0].pos;
            puzzle.cursorDir = puzzle.entries[0].dir;
        }

        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
    }

    function create() {
        playUi.hidden = true;
        createUi.hidden = false;
    }

    function updatePuzzleHintList() {
        dom.removeAllChildren(puzzleHintAcrossList);
        dom.removeAllChildren(puzzleHintDownList);
        const entries = puzzle.entries;

        for (let i = 0; i < entries.length; ++i) {
            const entry = entries[i];
            const fragment = puzzleHintTemplate.content.cloneNode(true) as DocumentFragment;
            const hintLi = dom.bySelector(fragment, ".puzzle-hint-li") as HTMLLIElement;
            hintLi.textContent = `${entry.num}. ${entry.hint}`;
            hintLi.dataset.entryIndex = `${i}`;

            if (entry.solved) {
                hintLi.classList.add("solved");
            }

            if (entry.dir === Direction.Across) {
                puzzleHintAcrossList.appendChild(fragment)
            } else {
                puzzleHintDownList.appendChild(fragment)
            }
        }
    }

    function onPuzzlePointerMove(evt: PointerEvent) {
        const cxy = new geo.Point(evt.offsetX, evt.offsetY);
        puzzle.hoverCoords = canvasCoordsToCellCoords(cxy);
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
    }

    function onPuzzlePointerDown(evt: PointerEvent) {
        const xy = canvasCoordsToCellCoords(new geo.Point(evt.offsetX, evt.offsetY));
        const pdir = perp(puzzle.cursorDir);
        const entriesAtCell = findEntriesAtCell(puzzle.entries, xy);

        // no entries at cell, can't place cursor here
        if (!entriesAtCell.length) {
            return;
        }

        // switch directions if at same cell
        if (puzzle.cursorCoords && xy.equal(puzzle.cursorCoords) && entriesAtCell.some(x => x.dir === pdir)) {
            puzzle.cursorDir = pdir;
        }

        // if current cursor direction does not align with a word at the cell, switch direction
        if (!entriesAtCell.some(x => x.dir === puzzle.cursorDir)) {
            puzzle.cursorDir = perp(puzzle.cursorDir);
        }

        puzzle.cursorCoords = xy;
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
    }

    function onPuzzlePointerOut() {
        puzzle.hoverCoords = null;
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
    }

    function onPuzzleKeydown(evt: KeyboardEvent) {
        if (!puzzle.cursorCoords) {
            return;
        }

        const entriesAtCell = findEntriesAtCell(puzzle.entries, puzzle.cursorCoords);
        if (entriesAtCell.length === 0) {
            return;
        }

        const solvedAtCell = entriesAtCell.some(x => x.solved);
        if (!evt.key) {
            return;
        }

        // handle control/arrow keys
        if (evt.key === "Delete" && !solvedAtCell) {
            puzzle.grid.set(puzzle.cursorCoords, "");
            evt.preventDefault();
            drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
            return;
        }

        const v = getControlKeyVector(puzzle.cursorDir, evt.key, evt.shiftKey);
        if (v.x !== 0 || v.y !== 0) {
            const coords = puzzle.cursorCoords.addPoint(v);
            const entriesAtNewCell = findEntriesAtCell(puzzle.entries, coords);
            const solvedAtNewCell = entriesAtCell.some(x => x.solved);
            evt.preventDefault();

            if (evt.key === " " && !solvedAtCell) {
                puzzle.grid.set(puzzle.cursorCoords, "");
            }

            if (entriesAtNewCell.length > 0) {
                puzzle.cursorCoords = coords;
                if (evt.key === "Backspace" && !solvedAtNewCell) {
                    puzzle.grid.set(puzzle.cursorCoords, "");
                }

                drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
                return;
            }
        }

        if (evt.key.length > 1) {
            return;
        }

        if (evt.key.length !== 1 || !evt.key.match(/[a-z]/i)) {
            return;
        }

        const letter = evt.key.toUpperCase();

        if (entriesAtCell.some(x => x.solved) && letter !== puzzle.grid.get(puzzle.cursorCoords)) {
            return;
        }


        puzzle.grid.set(puzzle.cursorCoords, letter);

        // check for complete word
        let anySolved = false;
        for (const entry of entriesAtCell) {
            const solved = entrySolved(entry, puzzle.grid);
            if (!entry.solved && solved) {
                entry.solved = true;
                anySolved = true;
            }
        }

        // check for done
        if (puzzle.entries.every(e => e.solved)) {
            onPuzzleSolved();
        }

        // advance cursor
        if (anySolved) {
            const entry = nextUnsolvedEntry(puzzle.entries, entriesAtCell[0]);
            if (entry) {
                puzzle.cursorCoords = entry.pos;
                puzzle.cursorDir = entry.dir;
            }
        } else {
            const advancedCursor = puzzle.cursorCoords.addPoint(getDirectionVector(puzzle.cursorDir));
            if (findEntriesAtCell(puzzle.entries, advancedCursor).length > 0) {
                puzzle.cursorCoords = puzzle.cursorCoords.addPoint(getDirectionVector(puzzle.cursorDir));
            }
        }

        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
        updatePuzzleHintList();
    }

    function onPuzzleHintClick(e: Event) {
        const target = e.target as HTMLElement;
        const li = target.closest(".puzzle-hint-li") as HTMLLIElement;
        const entryIndexString = li?.dataset?.entryIndex;
        if (!entryIndexString) {
            return;
        }

        const entryIndex = parseInt(entryIndexString);
        const entry = puzzle.entries[entryIndex];
        puzzle.cursorCoords = entry.pos;
        puzzle.cursorDir = entry.dir;
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
        puzzleCanvas.focus();
    }

    function onPuzzleSolved() {
        alert("YOU SOLVED THE PUZZLE! BRAVO!");
    }
}

function rndDir(rng: rand.RNG): Direction {
    const directions = [Direction.Across, Direction.Down];
    return rand.choose(rng, directions);
}

function perp(dir: Direction): Direction {
    if (dir == Direction.Across) {
        return Direction.Down;
    }

    return Direction.Across;
}

function generatePuzzle(rng: rand.RNG, hintAnswers: HintAnswer[]): Entry[] {
    if (hintAnswers.length == 0) {
        alert("Please enter at least one hint and answer!");
        return [];
    }

    // make all answers lowercase
    for (const ha of hintAnswers) {
        ha.answer = ha.answer.toLocaleUpperCase();
    }

    // retry until successful (up to a certain amount)
    const puzzles = new Array<Entry[]>();
    for (let i = 0; i < MAX_GENS; ++i) {
        const entries = tryGeneratePuzzle(rng, hintAnswers);
        if (entries.length === 0) {
            continue;
        }

        puzzles.push(entries);
    }

    if (puzzles.length === 0) {
        return [];
    }

    const entries = puzzles.reduce((prev, cur) => calcScore(prev) < calcScore(cur) ? prev : cur);
    entries.sort((x, y) => {
        const dn = x.num - y.num;
        return dn === 0 ? x.dir - y.dir : dn;
    });

    shiftPuzzle(entries);
    return entries;
}

function tryGeneratePuzzle(rng: rand.RNG, hintAnswers: HintAnswer[]): Entry[] {
    rand.shuffle(rng, hintAnswers);

    // place longest word at 0,0 randomly across/down
    const entries = new Array<Entry>();
    entries.push(placeInitialEntry(rng, hintAnswers[0]));

    for (let i = 1; i < hintAnswers.length; ++i) {
        const ha = hintAnswers[i];
        const entry = placeNextEntry(entries, ha);
        if (entry) {
            entries.push(entry);
        } else {
            return [];
        }
    }

    return entries;
}

function shiftPuzzle(entries: Entry[]) {
    // shift the puzzle such that all words start >= (0, 0)
    const minX = Math.min(...entries.map(x => x.pos.x));
    const minY = Math.min(...entries.map(x => x.pos.y));
    const xy = new geo.Point(-minX, -minY);
    for (const entry of entries) {
        entry.pos = entry.pos.addPoint(xy);
    }
}

function calcScore(entries: Entry[]): number {
    // calculate puzzle score,
    // lower is better
    const x = Math.min(...entries.map(e => e.pos.x));
    const y = Math.min(...entries.map(e => e.pos.y));
    const w = Math.max(...entries.map(e => e.pos.x + entryWidth(e))) - x;
    const h = Math.max(...entries.map(e => e.pos.y + entryHeight(e))) - y;
    return w * h;
}

function placeInitialEntry(rng: rand.RNG, ha: HintAnswer): Entry {
    const { hint, answer } = ha;

    const dir = rndDir(rng);
    // const dir = Direction.Across;
    const pos = new geo.Point(0, 0);

    return {
        num: 1,
        hint,
        answer,
        pos,
        dir,
        solved: false,
    };
}

function placeNextEntry(entries: Entry[], ha: HintAnswer): Entry | undefined {
    const { hint, answer } = ha;

    // find next possible intersection with existing words
    for (const entry of entries) {
        // find next common letter
        for (let i = 0; i < entry.answer.length; ++i) {
            for (let j = 0; j < answer.length; ++j) {
                if (entry.answer[i] === answer[j]) {
                    // try placing the word here
                    // i = index in already placed word
                    // j = index in unplaced word
                    // if word is vertical, place horizontal
                    // if word is horizontal, place vertical
                    const commonPos = getCharPosition(entry.pos, entry.dir, i);
                    const dir = perp(entry.dir);
                    const pos = getStartPosition(commonPos, dir, j);
                    if (isValidWordPlacement(entries, answer, pos, dir)) {
                        // does another entry start here? if so, share it's num
                        // otherwise, use max + 1
                        const num = entries.filter(x => x.pos.equal(pos)).map(x => x.num)[0] ?? Math.max(...entries.map(x => x.num + 1)) ?? 1;
                        const e: Entry = {
                            num,
                            hint,
                            answer,
                            pos,
                            dir,
                            solved: false,
                        };

                        return e;
                    }
                }
            }
        }
    }

    // no placement found
    return;
}

function getDirectionVector(dir: Direction): geo.Point {
    switch (dir) {
        case Direction.Across:
            return new geo.Point(1, 0);
            break;
        case Direction.Down:
            return new geo.Point(0, 1);
            break;
    }

    throw new Error("Invalid directon");
}

function isValidWordPlacement(entries: Entry[], answer: string, pos: geo.Point, dir: Direction): boolean {
    // check for overlap
    // cases:
    // across/across
    // down/down
    // across/down
    // down/across (swap and make same case?)
    // any overlap at non-
    for (const entry of entries) {
        if (!isValidPlacement(entry.pos, entry.answer, entry.dir, pos, answer, dir)) {
            return false;
        }
    }

    return true;
}

function isValidPlacement(pos1: geo.Point, a1: string, dir1: Direction, pos2: geo.Point, a2: string, dir2: Direction): boolean {
    if (dir1 === Direction.Across && dir2 === Direction.Across) {
        return isValidPlacementAcrossAcross(pos1, a1, pos2, a2);
    } else if (dir1 === Direction.Down && dir2 === Direction.Down) {
        return isValidPlacementDownDown(pos1, a1, pos2, a2);
    } else if (dir1 === Direction.Across && dir2 === Direction.Down) {
        return isValidPlacementAcrossDown(pos1, a1, pos2, a2);
    }

    return isValidPlacementDownAcross(pos1, a1, pos2, a2);
}

function isValidPlacementAcrossAcross(pos1: geo.Point, a1: string, pos2: geo.Point, a2: string): boolean {
    // if y coords not touching, valid
    if (Math.abs(pos1.y - pos2.y) > 1) {
        return true;
    }

    // if x ranges not touching, valid
    if (pos1.x + a1.length + 1 < pos1.x || pos1.x > pos2.x + a2.length + 1) {
        return true;
    }

    return false;
}

function isValidPlacementDownDown(pos1: geo.Point, a1: string, pos2: geo.Point, a2: string): boolean {
    // if y coords not touching, valid
    if (Math.abs(pos1.x - pos2.x) > 1) {
        return true;
    }

    // if x ranges not touching, valid
    if (pos1.y + a1.length + 1 < pos1.y || pos1.y > pos2.y + a2.length + 1) {
        return true;
    }

    return false;
}

function isValidPlacementAcrossDown(pos1: geo.Point, a1: string, pos2: geo.Point, a2: string): boolean {
    // if no overlap on x-axis valid
    if (pos1.x + a1.length < pos2.x - 1 || pos1.x > pos2.x + 1) {
        return true;
    }

    // if no overlap on y-axis, valid
    if (pos1.y < pos2.y - 1 || pos1.y > pos2.y + a2.length + 1) {
        return true;
    }

    // if touching (ix outside of either word, not a valid placement)
    const ix = new geo.Point(pos2.x, pos1.y);
    if (
        ix.x < pos1.x || ix.x > pos1.x + a1.length
        || ix.y < pos2.y || ix.y > pos2.y + a2.length) {
        return false;
    }

    return a1[ix.x - pos1.x] === a2[ix.y - pos2.y];
}

function isValidPlacementDownAcross(pos1: geo.Point, a1: string, pos2: geo.Point, a2: string): boolean {
    return isValidPlacementAcrossDown(pos2, a2, pos1, a1);
}

function getCharPosition(startPosition: geo.Point, dir: Direction, index: number): geo.Point {
    const v = getDirectionVector(dir);
    return startPosition.addPoint(v.mulScalar(index));
}

function getStartPosition(charPosition: geo.Point, dir: Direction, index: number): geo.Point {
    // get the start position of a word given the position of a specified index
    const v = getDirectionVector(dir);
    return charPosition.subPoint(v.mulScalar(index));
}

function drawPuzzle(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, puzzle: Puzzle) {
    const letterFont = "bold 16px arial";
    const numberFont = "normal 10px arial";
    ctx.font = letterFont;
    const letterTextHeight = ctx.measureText("M").width;
    ctx.font = numberFont;
    const numberTextHeight = ctx.measureText("M").width;

    // draw background
    ctx.fillStyle = "black";
    const entries = puzzle.entries;
    const pw = Math.max(...entries.map(e => e.pos.x + entryWidth(e)));
    const ph = Math.max(...entries.map(e => e.pos.y + entryHeight(e)));
    const canvasWidth = pw * CELL_SIZE;
    const canvasHeight = ph * CELL_SIZE;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // draw letters and cells
    ctx.font = "bold 18px arial";
    for (const entry of entries) {
        const { pos, answer, dir } = entry;
        const v = getDirectionVector(dir);

        for (let i = 0; i < answer.length; ++i) {
            const p = pos.addPoint(v.mulScalar(i));
            const cx = p.x * CELL_SIZE;
            const cy = p.y * CELL_SIZE;

            ctx.fillStyle = "white";
            ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
            ctx.fillStyle = "black";

            ctx.font = "bold 18px arial";
            ctx.strokeRect(cx, cy, CELL_SIZE, CELL_SIZE);
        }
    }

    // draw numbers
    ctx.font = "normal 10px arial";
    for (const entry of entries) {
        // draw number
        const coords = entry.pos.mulScalar(CELL_SIZE);
        ctx.fillText(`${entry.num}`, coords.x + 2, coords.y + 2 + numberTextHeight);
    }

    // draw entered letters
    const grid = puzzle.grid;
    for (const cellCoords of grid.keys()) {
        const letter = grid.get(cellCoords);
        if (!letter) {
            continue;
        }

        const coords = cellCoordsToCanvasCoords(cellCoords).addPoint(new geo.Point(CELL_PADDING, CELL_PADDING));
        const metrics = ctx.measureText(letter);
        coords.x += CELL_INTERIOR_SIZE / 2.0;
        coords.y += CELL_INTERIOR_SIZE / 2.0;
        coords.y += letterTextHeight / 2.0;
        coords.x -= metrics.width / 2.0;
        ctx.font = "16px arial";
        ctx.fillText(letter, coords.x, coords.y);
    }

    // draw red where hovering
    if (puzzle.hoverCoords) {
        ctx.save();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "red";
        ctx.strokeRect(puzzle.hoverCoords.x * CELL_SIZE, puzzle.hoverCoords.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.restore();
    }

    // draw cursor
    if (puzzle.cursorCoords) {
        ctx.save();

        const canvasCoords = cellCoordsToCanvasCoords(puzzle.cursorCoords);
        ctx.lineWidth = 3;
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(canvasCoords.x + CELL_SIZE / 2.0, canvasCoords.y + CELL_SIZE / 2.0, 3, 0, Math.PI * 2);
        ctx.fill();

        // highlight word under cursor
        const entries = findEntriesAtCell(puzzle.entries, puzzle.cursorCoords).filter(x => x.dir === puzzle.cursorDir);
        for (const entry of entries) {
            ctx.strokeStyle = entry.solved ? "green" : "red";
            const { x, y } = cellCoordsToCanvasCoords(entry.pos);
            const width = entryWidth(entry) * CELL_SIZE;
            const height = entryHeight(entry) * CELL_SIZE;
            ctx.strokeRect(x, y, width, height);
        }

        ctx.restore();
    }
}

function entryWidth(entry: Entry): number {
    return entry.dir === Direction.Across ? entry.answer.length : 1;
}

function entryHeight(entry: Entry): number {
    return entry.dir === Direction.Down ? entry.answer.length : 1;
}

function canvasCoordsToCellCoords(xy: geo.Point): geo.Point {
    return xy.divScalar(CELL_SIZE).floor();
}

function cellCoordsToCanvasCoords(xy: geo.Point): geo.Point {
    return xy.mulScalar(CELL_SIZE);
}

function findEntriesAtCell(entries: Entry[], xy: geo.Point): Entry[] {
    return entries.filter(x => entryContainsPoint(x, xy));
}

function anyEntriesAtCell(entries: Entry[], xy: geo.Point): boolean {
    return findEntriesAtCell(entries, xy).length > 0;
}

function entryContainsPoint(entry: Entry, xy: geo.Point): boolean {
    return entry.dir === Direction.Across && xy.y === entry.pos.y && xy.x >= entry.pos.x && xy.x < entry.pos.x + entry.answer.length
        || entry.dir === Direction.Down && xy.x === entry.pos.x && xy.y >= entry.pos.y && xy.y < entry.pos.y + entry.answer.length;
}

function entrySolved(entry: Entry, grid: LetterMap): boolean {
    // check for complete word
    const v = getDirectionVector(entry.dir);
    for (let i = 0; i < entry.answer.length; ++i) {
        const coords = entry.pos.addPoint(v.mulScalar(i));
        if (entry.answer[i] !== grid.get(coords)) {
            return false;
        }
    }

    return true;
}

function getControlKeyVector(cursorDir: Direction, key: string, shift: boolean): geo.Point {
    if (key === "ArrowLeft") {
        return new geo.Point(-1, 0);
    } else if (key === "ArrowDown") {
        return new geo.Point(0, 1);
    } else if (key === "ArrowRight") {
        return new geo.Point(1, 0);
    } else if (key === "ArrowUp") {
        return new geo.Point(0, -1);
    } else if (key === "Backspace") {
        return new geo.Point(-1, 0);
    } else if (key === "Tab" && !shift) {
        return getDirectionVector(cursorDir);
    } else if (key === "Tab" && shift) {
        return getDirectionVector(cursorDir).neg();
    } else if (key === " ") {
        return getDirectionVector(cursorDir);
    }

    return new geo.Point(0, 0);
}

function nextUnsolvedEntry(entries: Entry[], entry: Entry): Entry | undefined {
    const offset = entries.indexOf(entry);
    if (offset < 0) {
        return;
    }

    for (let i = 1; i < entries.length; ++i) {
        const idx = (offset + i) % entries.length;
        const entry = entries[idx];
        if (!entry.solved) {
            return entry;
        }
    }
}

main()