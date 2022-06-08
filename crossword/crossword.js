import * as dom from "../shared/dom.js";
import * as rand from "../shared/rand.js";
import * as geo from "../shared/geo2d.js";
const STORAGE_KEY = "crossword_storage";
const CELL_INTERIOR_SIZE = 24;
const CELL_PADDING = 4;
const CELL_SIZE = CELL_INTERIOR_SIZE + CELL_PADDING * 2;
const MAX_GENS = 10000;
var Direction;
(function (Direction) {
    Direction[Direction["Across"] = 0] = "Across";
    Direction[Direction["Down"] = 1] = "Down";
})(Direction || (Direction = {}));
class LetterMap {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.data = new Map();
    }
    get(xy) {
        var _a;
        const id = this.flat(xy);
        return (_a = this.data.get(id)) !== null && _a !== void 0 ? _a : "";
    }
    set(xy, value) {
        const id = this.flat(xy);
        if (!value) {
            this.data.delete(id);
            return;
        }
        this.data.set(id, value);
    }
    keys() {
        return [...this.data.keys()].map(k => this.hier(k));
    }
    save() {
        return {
            rows: this.rows,
            cols: this.cols,
            data: [...this.data],
        };
    }
    flat(xy) {
        return xy.y * this.cols + xy.x;
    }
    hier(n) {
        const y = Math.floor(n / this.cols);
        const x = n - y * this.cols;
        return new geo.Point(x, y);
    }
    static load(state) {
        const map = new LetterMap(state.rows, state.cols);
        for (const [k, v] of state.data) {
            map.set(map.hier(k), v);
        }
        return map;
    }
}
var Mode;
(function (Mode) {
    Mode[Mode["Create"] = 0] = "Create";
    Mode[Mode["Play"] = 1] = "Play";
})(Mode || (Mode = {}));
function main() {
    let hintAnswers = new Array();
    let puzzle = {
        entries: new Array(),
        hoverCoords: null,
        cursorCoords: null,
        cursorDir: Direction.Across,
        grid: new LetterMap(0, 0),
        print: false,
    };
    const createUi = dom.byId("createUi");
    const playUi = dom.byId("playUi");
    const puzzleCanvas = dom.byId("puzzleCanvas");
    const puzzleContext = puzzleCanvas.getContext("2d");
    if (!puzzleContext) {
        throw new Error("Canvas element not supported");
    }
    const hintAnswerForm = dom.byId("hintAnswerForm");
    const hintInput = dom.byId("hint");
    const answerInput = dom.byId("answer");
    const hintAnswerTemplate = dom.byId("hintAnswerTemplate");
    const hintAnswerList = dom.byId("hintAnswers");
    const puzzleHintTemplate = dom.byId("puzzleHintTemplate");
    const puzzleHintAcrossList = dom.byId("puzzleHintsAcross");
    const puzzleHintDownList = dom.byId("puzzleHintsDown");
    const createButton = dom.byId("createButton");
    const clearButton = dom.byId("clearButton");
    const returnToCreate = dom.byId("returnToCreate");
    const playInput = dom.byId("playInput");
    const seed = rand.xmur3(new Date().toString());
    const rng = new rand.SFC32RNG(seed(), seed(), seed(), seed());
    hintAnswerForm.addEventListener("submit", addHintAnswer);
    createButton.addEventListener("click", () => generate());
    clearButton.addEventListener("click", clear);
    returnToCreate.addEventListener("click", create);
    puzzleCanvas.addEventListener("pointermove", onPuzzlePointerMove);
    puzzleCanvas.addEventListener("pointerdown", onPuzzlePointerDown);
    puzzleCanvas.addEventListener("pointerout", onPuzzlePointerOut);
    playInput.addEventListener("keydown", onPlayInputKeydown);
    playInput.addEventListener("input", onPlayInputInput);
    dom.delegate(hintAnswerList, "click", ".delete-button", deleteHintAnswer);
    dom.delegate(puzzleHintAcrossList, "click", ".puzzle-hint-li", onPuzzleHintClick);
    dom.delegate(puzzleHintDownList, "click", ".puzzle-hint-li", onPuzzleHintClick);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    load();
    function addHintAnswer(e) {
        e.preventDefault();
        const hint = hintInput.value;
        const answer = answerInput.value;
        if (!hint || !answer) {
            return;
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
            const fragment = hintAnswerTemplate.content.cloneNode(true);
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
    function deleteHintAnswer(e) {
        const target = e.target;
        const li = target.closest(".hint-answer-li");
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
        const app = loadApp(JSON.parse(jsonData));
        hintAnswers = app.hintAnswers;
        puzzle = app.puzzle;
        updateHintAnswerList();
        if (app.mode === Mode.Create) {
            create();
        }
        else {
            play();
        }
    }
    function save() {
        const mode = playUi.hidden ? Mode.Create : Mode.Play;
        const state = saveApp({
            hintAnswers,
            mode,
            puzzle,
        });
        const jsonData = JSON.stringify(state);
        localStorage.setItem(STORAGE_KEY, jsonData);
    }
    function saveApp(app) {
        return {
            mode: Mode[app.mode],
            hintAnswers: app.hintAnswers,
            puzzle: savePuzzle(app.puzzle),
        };
    }
    function savePuzzle(puzzle) {
        var _a;
        return {
            entries: puzzle.entries.map(saveEntry),
            cursorCoords: (_a = puzzle.cursorCoords) === null || _a === void 0 ? void 0 : _a.save(),
            cursorDir: Direction[puzzle.cursorDir],
            grid: puzzle.grid.save(),
        };
    }
    function saveEntry(entry) {
        return {
            num: entry.num,
            hint: entry.hint,
            answer: entry.answer,
            pos: entry.pos.save(),
            dir: Direction[entry.dir],
            solved: entry.solved,
        };
    }
    function loadApp(state) {
        return {
            mode: Mode[state.mode],
            hintAnswers: state.hintAnswers,
            puzzle: loadPuzzle(state.puzzle),
        };
    }
    function loadPuzzle(state) {
        return {
            entries: state.entries.map(loadEntry),
            hoverCoords: null,
            cursorCoords: state.cursorCoords ? geo.Point.load(state.cursorCoords) : null,
            cursorDir: Direction[state.cursorDir],
            grid: LetterMap.load(state.grid),
            print: false,
        };
    }
    function loadEntry(state) {
        return {
            num: state.num,
            hint: state.hint,
            answer: state.answer,
            pos: geo.Point.load(state.pos),
            dir: Direction[state.dir],
            solved: state.solved,
        };
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
        playInput.focus({ preventScroll: true });
        if (puzzle.entries.length > 0 && !puzzle.cursorCoords) {
            puzzle.cursorCoords = puzzle.entries[0].pos;
            puzzle.cursorDir = puzzle.entries[0].dir;
        }
        save();
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
    }
    function create() {
        playUi.hidden = true;
        createUi.hidden = false;
        puzzle = {
            entries: new Array(),
            hoverCoords: null,
            cursorCoords: null,
            cursorDir: Direction.Across,
            grid: new LetterMap(0, 0),
            print: false,
        };
        save();
    }
    function updatePuzzleHintList() {
        dom.removeAllChildren(puzzleHintAcrossList);
        dom.removeAllChildren(puzzleHintDownList);
        const entries = puzzle.entries;
        for (let i = 0; i < entries.length; ++i) {
            const entry = entries[i];
            const fragment = puzzleHintTemplate.content.cloneNode(true);
            const hintLi = dom.bySelector(fragment, ".puzzle-hint-li");
            hintLi.textContent = `${entry.num}. ${entry.hint}`;
            hintLi.dataset.entryIndex = `${i}`;
            if (entry.solved) {
                hintLi.classList.add("solved");
            }
            if (entry.dir === Direction.Across) {
                puzzleHintAcrossList.appendChild(fragment);
            }
            else {
                puzzleHintDownList.appendChild(fragment);
            }
        }
    }
    function onPuzzlePointerMove(evt) {
        const cxy = new geo.Point(evt.offsetX, evt.offsetY);
        puzzle.hoverCoords = canvasCoordsToCellCoords(cxy);
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
    }
    function onPuzzlePointerDown(evt) {
        evt.preventDefault();
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
        playInput.focus({ preventScroll: true });
        save();
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
    }
    function onPuzzlePointerOut() {
        puzzle.hoverCoords = null;
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
    }
    function onPlayInputKeydown(evt) {
        if (!puzzle.cursorCoords) {
            return;
        }
        if (!evt.key) {
            return;
        }
        const keys = new Set(["Tab", "Delete", "RightArrow", "UpArrow", "LeftArrow", "DownArrow", "Backspace"]);
        if (!keys.has(evt.key)) {
            return;
        }
        // DELETE - delete current char
        const entriesAtCell = findEntriesAtCell(puzzle.entries, puzzle.cursorCoords);
        const solvedAtCell = entriesAtCell.some(x => x.solved);
        if (evt.key === "Delete" && !solvedAtCell) {
            puzzle.grid.set(puzzle.cursorCoords, "");
        }
        if (evt.key === "Tab" && !evt.shiftKey) {
            advanceCursor();
        }
        if (evt.key === "Tab" && evt.shiftKey) {
            backupCursor();
        }
        const v = getArrowKeyVector(evt.key);
        if (v.x !== 0 || v.y !== 0) {
            const coords = puzzle.cursorCoords.addPoint(v);
            if (anyEntriesAtCell(puzzle.entries, coords)) {
                puzzle.cursorCoords = coords;
                adjustCursor();
            }
        }
        if (evt.key === "Backspace") {
            backupCursor();
            if (!findEntriesAtCell(puzzle.entries, puzzle.cursorCoords).some(x => x.solved)) {
                puzzle.grid.set(puzzle.cursorCoords, "");
            }
        }
        evt.preventDefault();
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
        save();
    }
    function onPuzzleHintClick(e) {
        var _a;
        const target = e.target;
        const li = target.closest(".puzzle-hint-li");
        const entryIndexString = (_a = li === null || li === void 0 ? void 0 : li.dataset) === null || _a === void 0 ? void 0 : _a.entryIndex;
        if (!entryIndexString) {
            return;
        }
        const entryIndex = parseInt(entryIndexString);
        const entry = puzzle.entries[entryIndex];
        puzzle.cursorCoords = entry.pos;
        puzzle.cursorDir = entry.dir;
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
        save();
        playInput.focus({ preventScroll: true });
    }
    function onPuzzleSolved() {
        alert("YOU SOLVED THE PUZZLE! BRAVO!");
    }
    function onBeforePrint() {
        puzzle.print = true;
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
    }
    function onAfterPrint() {
        puzzle.print = false;
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
    }
    function onPlayInputInput(e) {
        const evt = e;
        playInput.value = "";
        if (!evt.data) {
            return;
        }
        if (!puzzle.cursorCoords) {
            return;
        }
        const entriesAtCell = findEntriesAtCell(puzzle.entries, puzzle.cursorCoords);
        if (entriesAtCell.length === 0) {
            return;
        }
        const letter = evt.data.toUpperCase();
        if (letter.length > 1 || !(letter.match(/[A-Z]/))) {
            return;
        }
        if (entriesAtCell.some(x => x.solved) && letter !== puzzle.grid.get(puzzle.cursorCoords)) {
            return;
        }
        puzzle.grid.set(puzzle.cursorCoords, letter);
        // check for complete word
        for (const entry of entriesAtCell) {
            entry.solved = entrySolved(entry, puzzle.grid);
        }
        // check for done
        if (puzzle.entries.every(e => e.solved)) {
            onPuzzleSolved();
        }
        advanceCursor();
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
        updatePuzzleHintList();
        save();
    }
    function advanceCursor() {
        if (!puzzle.cursorCoords) {
            return;
        }
        const advancedCursor = puzzle.cursorCoords.addPoint(getDirectionVector(puzzle.cursorDir));
        if (anyEntriesAtCell(puzzle.entries, advancedCursor)) {
            puzzle.cursorCoords = advancedCursor;
            adjustCursor();
            return;
        }
        const cursorEntry = findCursorEntry();
        if (!cursorEntry) {
            puzzle.cursorCoords = null;
            return;
        }
        const entry = nextEntry(puzzle.entries, cursorEntry);
        if (!entry) {
            adjustCursor();
            return;
        }
        puzzle.cursorCoords = entry.pos;
        puzzle.cursorDir = entry.dir;
    }
    function backupCursor() {
        if (!puzzle.cursorCoords) {
            return;
        }
        const backedCursor = puzzle.cursorCoords.addPoint(getDirectionVector(puzzle.cursorDir).neg());
        if (anyEntriesAtCell(puzzle.entries, backedCursor)) {
            puzzle.cursorCoords = backedCursor;
            adjustCursor();
            return;
        }
        const cursorEntry = findCursorEntry();
        if (!cursorEntry) {
            puzzle.cursorCoords = null;
            return;
        }
        const entry = prevEntry(puzzle.entries, cursorEntry);
        if (!entry) {
            adjustCursor();
            return;
        }
        puzzle.cursorCoords = entry.pos.addPoint(getDirectionVector(entry.dir).mulScalar(entry.answer.length - 1));
        puzzle.cursorDir = entry.dir;
    }
    function adjustCursor() {
        if (!puzzle.cursorCoords) {
            return;
        }
        const entries = findEntriesAtCell(puzzle.entries, puzzle.cursorCoords);
        if (entries.length === 0) {
            puzzle.cursorCoords = null;
        }
        if (!entries.some(e => e.dir === puzzle.cursorDir)) {
            puzzle.cursorDir = perp(puzzle.cursorDir);
        }
    }
    function findCursorEntry() {
        if (!puzzle.cursorCoords) {
            return;
        }
        return findEntriesAtCell(puzzle.entries, puzzle.cursorCoords).find(x => x.dir === puzzle.cursorDir);
    }
}
function rndDir(rng) {
    const directions = [Direction.Across, Direction.Down];
    return rand.choose(rng, directions);
}
function perp(dir) {
    if (dir == Direction.Across) {
        return Direction.Down;
    }
    return Direction.Across;
}
function generatePuzzle(rng, hintAnswers) {
    if (hintAnswers.length == 0) {
        alert("Please enter at least one hint and answer!");
        return [];
    }
    // make all answers lowercase
    for (const ha of hintAnswers) {
        ha.answer = ha.answer.toLocaleUpperCase();
    }
    // retry until successful (up to a certain amount)
    const puzzles = new Array();
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
function tryGeneratePuzzle(rng, hintAnswers) {
    rand.shuffle(rng, hintAnswers);
    // place longest word at 0,0 randomly across/down
    const entries = new Array();
    entries.push(placeInitialEntry(rng, hintAnswers[0]));
    for (let i = 1; i < hintAnswers.length; ++i) {
        const ha = hintAnswers[i];
        const entry = placeNextEntry(entries, ha);
        if (entry) {
            entries.push(entry);
        }
        else {
            return [];
        }
    }
    return entries;
}
function shiftPuzzle(entries) {
    // shift the puzzle such that all words start >= (0, 0)
    const minX = Math.min(...entries.map(x => x.pos.x));
    const minY = Math.min(...entries.map(x => x.pos.y));
    const xy = new geo.Point(-minX, -minY);
    for (const entry of entries) {
        entry.pos = entry.pos.addPoint(xy);
    }
}
function calcScore(entries) {
    // calculate puzzle score,
    // lower is better
    const x = Math.min(...entries.map(e => e.pos.x));
    const y = Math.min(...entries.map(e => e.pos.y));
    const w = Math.max(...entries.map(e => e.pos.x + entryWidth(e))) - x;
    const h = Math.max(...entries.map(e => e.pos.y + entryHeight(e))) - y;
    return w * h;
}
function placeInitialEntry(rng, ha) {
    const { hint, answer } = ha;
    const dir = rndDir(rng);
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
function placeNextEntry(entries, ha) {
    var _a, _b;
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
                        const num = (_b = (_a = entries.filter(x => x.pos.equal(pos)).map(x => x.num)[0]) !== null && _a !== void 0 ? _a : Math.max(...entries.map(x => x.num + 1))) !== null && _b !== void 0 ? _b : 1;
                        const e = {
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
function getDirectionVector(dir) {
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
function isValidWordPlacement(entries, answer, pos, dir) {
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
function isValidPlacement(pos1, a1, dir1, pos2, a2, dir2) {
    if (dir1 === Direction.Across && dir2 === Direction.Across) {
        return isValidPlacementAcrossAcross(pos1, a1, pos2, a2);
    }
    else if (dir1 === Direction.Down && dir2 === Direction.Down) {
        return isValidPlacementDownDown(pos1, a1, pos2, a2);
    }
    else if (dir1 === Direction.Across && dir2 === Direction.Down) {
        return isValidPlacementAcrossDown(pos1, a1, pos2, a2);
    }
    return isValidPlacementDownAcross(pos1, a1, pos2, a2);
}
function isValidPlacementAcrossAcross(pos1, a1, pos2, a2) {
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
function isValidPlacementDownDown(pos1, a1, pos2, a2) {
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
function isValidPlacementAcrossDown(pos1, a1, pos2, a2) {
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
    if (ix.x < pos1.x || ix.x > pos1.x + a1.length
        || ix.y < pos2.y || ix.y > pos2.y + a2.length) {
        return false;
    }
    return a1[ix.x - pos1.x] === a2[ix.y - pos2.y];
}
function isValidPlacementDownAcross(pos1, a1, pos2, a2) {
    return isValidPlacementAcrossDown(pos2, a2, pos1, a1);
}
function getCharPosition(startPosition, dir, index) {
    const v = getDirectionVector(dir);
    return startPosition.addPoint(v.mulScalar(index));
}
function getStartPosition(charPosition, dir, index) {
    // get the start position of a word given the position of a specified index
    const v = getDirectionVector(dir);
    return charPosition.subPoint(v.mulScalar(index));
}
function drawPuzzle(canvas, ctx, puzzle) {
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
    if (puzzle.hoverCoords && !puzzle.print) {
        ctx.save();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "red";
        ctx.strokeRect(puzzle.hoverCoords.x * CELL_SIZE, puzzle.hoverCoords.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.restore();
    }
    // draw cursor
    if (puzzle.cursorCoords && !puzzle.print) {
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
function entryWidth(entry) {
    return entry.dir === Direction.Across ? entry.answer.length : 1;
}
function entryHeight(entry) {
    return entry.dir === Direction.Down ? entry.answer.length : 1;
}
function canvasCoordsToCellCoords(xy) {
    return xy.divScalar(CELL_SIZE).floor();
}
function cellCoordsToCanvasCoords(xy) {
    return xy.mulScalar(CELL_SIZE);
}
function findEntriesAtCell(entries, xy) {
    return entries.filter(x => entryContainsPoint(x, xy));
}
function anyEntriesAtCell(entries, xy) {
    return findEntriesAtCell(entries, xy).length > 0;
}
function entryContainsPoint(entry, xy) {
    return entry.dir === Direction.Across && xy.y === entry.pos.y && xy.x >= entry.pos.x && xy.x < entry.pos.x + entry.answer.length
        || entry.dir === Direction.Down && xy.x === entry.pos.x && xy.y >= entry.pos.y && xy.y < entry.pos.y + entry.answer.length;
}
function entrySolved(entry, grid) {
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
function getArrowKeyVector(key) {
    if (key === "ArrowLeft") {
        return new geo.Point(-1, 0);
    }
    else if (key === "ArrowDown") {
        return new geo.Point(0, 1);
    }
    else if (key === "ArrowRight") {
        return new geo.Point(1, 0);
    }
    else if (key === "ArrowUp") {
        return new geo.Point(0, -1);
    }
    return new geo.Point(0, 0);
}
function nextEntry(entries, entry) {
    const offset = entries.indexOf(entry);
    if (offset < 0) {
        return;
    }
    const index = (offset + 1) % entries.length;
    return entries[index];
}
function prevEntry(entries, entry) {
    const offset = entries.indexOf(entry);
    if (offset < 0) {
        return;
    }
    let index = (offset - 1);
    if (index < 0) {
        index = entries.length - 1;
    }
    return entries[index];
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jvc3N3b3JkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3Jvc3N3b3JkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE1BQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFDO0FBQ3hDLE1BQU0sa0JBQWtCLEdBQUcsRUFBRSxDQUFDO0FBQzlCLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztBQUN2QixNQUFNLFNBQVMsR0FBRyxrQkFBa0IsR0FBRyxZQUFZLEdBQUcsQ0FBQyxDQUFDO0FBQ3hELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQztBQU92QixJQUFLLFNBR0o7QUFIRCxXQUFLLFNBQVM7SUFDViw2Q0FBTSxDQUFBO0lBQ04seUNBQUksQ0FBQTtBQUNSLENBQUMsRUFISSxTQUFTLEtBQVQsU0FBUyxRQUdiO0FBaUJELE1BQU0sU0FBUztJQUdYLFlBQW1CLElBQVksRUFBUyxJQUFZO1FBQWpDLFNBQUksR0FBSixJQUFJLENBQVE7UUFBUyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ2hELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7SUFDMUMsQ0FBQztJQUVELEdBQUcsQ0FBQyxFQUFhOztRQUNiLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDekIsT0FBTyxNQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxtQ0FBSSxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVELEdBQUcsQ0FBQyxFQUFhLEVBQUUsS0FBYTtRQUM1QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXpCLElBQUks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LFNBQVMsQ0FBQyxPQUFnQixFQUFFLEtBQVk7SUFDN0MsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN0QyxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDWixPQUFPO0tBQ1Y7SUFFRCxNQUFNLEtBQUssR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO0lBQzVDLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzFCLENBQUM7QUFFRCxTQUFTLFNBQVMsQ0FBQyxPQUFnQixFQUFFLEtBQVk7SUFDN0MsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN0QyxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDWixPQUFPO0tBQ1Y7SUFFRCxJQUFJLEtBQUssR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN6QixJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUU7UUFDWCxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7S0FDOUI7SUFFRCxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMxQixDQUFDO0FBRUQsSUFBSSxFQUFFLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBkb20gZnJvbSBcIi4uL3NoYXJlZC9kb20uanNcIlxyXG5pbXBvcnQgKiBhcyByYW5kIGZyb20gXCIuLi9zaGFyZWQvcmFuZC5qc1wiXHJcbmltcG9ydCAqIGFzIGdlbyBmcm9tIFwiLi4vc2hhcmVkL2dlbzJkLmpzXCJcclxuXHJcbmNvbnN0IFNUT1JBR0VfS0VZID0gXCJjcm9zc3dvcmRfc3RvcmFnZVwiO1xyXG5jb25zdCBDRUxMX0lOVEVSSU9SX1NJWkUgPSAyNDtcclxuY29uc3QgQ0VMTF9QQURESU5HID0gNDtcclxuY29uc3QgQ0VMTF9TSVpFID0gQ0VMTF9JTlRFUklPUl9TSVpFICsgQ0VMTF9QQURESU5HICogMjtcclxuY29uc3QgTUFYX0dFTlMgPSAxMDAwMDtcclxuXHJcbmludGVyZmFjZSBIaW50QW5zd2VyIHtcclxuICAgIGhpbnQ6IHN0cmluZyxcclxuICAgIGFuc3dlcjogc3RyaW5nLFxyXG59XHJcblxyXG5lbnVtIERpcmVjdGlvbiB7XHJcbiAgICBBY3Jvc3MsXHJcbiAgICBEb3duLFxyXG59XHJcblxyXG5pbnRlcmZhY2UgRW50cnkge1xyXG4gICAgbnVtOiBudW1iZXIsXHJcbiAgICBoaW50OiBzdHJpbmcsXHJcbiAgICBhbnN3ZXI6IHN0cmluZyxcclxuICAgIHBvczogZ2VvLlBvaW50LFxyXG4gICAgZGlyOiBEaXJlY3Rpb24sXHJcbiAgICBzb2x2ZWQ6IGJvb2xlYW4sXHJcbn1cclxuXHJcbmludGVyZmFjZSBMZXR0ZXJNYXBTYXZlU3RhdGUge1xyXG4gICAgcm93czogbnVtYmVyLFxyXG4gICAgY29sczogbnVtYmVyLFxyXG4gICAgZGF0YTogW251bWJlciwgc3RyaW5nXVtdLFxyXG59XHJcblxyXG5jbGFzcyBMZXR0ZXJNYXAge1xyXG4gICAgcHJpdmF0ZSBkYXRhOiBNYXA8bnVtYmVyLCBzdHJpbmc+O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyByb3dzOiBudW1iZXIsIHB1YmxpYyBjb2xzOiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLmRhdGEgPSBuZXcgTWFwPG51bWJlciwgc3RyaW5nPigpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldCh4eTogZ2VvLlBvaW50KTogc3RyaW5nIHtcclxuICAgICAgICBjb25zdCBpZCA9IHRoaXMuZmxhdCh4eSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YS5nZXQoaWQpID8/IFwiXCI7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0KHh5OiBnZW8uUG9pbnQsIHZhbHVlOiBzdHJpbmcpIHtcclxuICAgICAgICBjb25zdCBpZCA9IHRoaXMuZmxhdCh4eSk7XHJcblxyXG4gICAgICAgIGlmICghdmFsdWUpIHtcclxuICAgICAgICAgICAgdGhpcy5kYXRhLmRlbGV0ZShpZCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZGF0YS5zZXQoaWQsIHZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICBrZXlzKCk6IGdlby5Qb2ludFtdIHtcclxuICAgICAgICByZXR1cm4gWy4uLnRoaXMuZGF0YS5rZXlzKCldLm1hcChrID0+IHRoaXMuaGllcihrKSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2F2ZSgpOiBMZXR0ZXJNYXBTYXZlU3RhdGUge1xyXG4gICAgICAgIHJldHVybiA8TGV0dGVyTWFwU2F2ZVN0YXRlPntcclxuICAgICAgICAgICAgcm93czogdGhpcy5yb3dzLFxyXG4gICAgICAgICAgICBjb2xzOiB0aGlzLmNvbHMsXHJcbiAgICAgICAgICAgIGRhdGE6IFsuLi50aGlzLmRhdGFdLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmbGF0KHh5OiBnZW8uUG9pbnQpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB4eS55ICogdGhpcy5jb2xzICsgeHkueFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGllcihuOiBudW1iZXIpOiBnZW8uUG9pbnQge1xyXG4gICAgICAgIGNvbnN0IHkgPSBNYXRoLmZsb29yKG4gLyB0aGlzLmNvbHMpO1xyXG4gICAgICAgIGNvbnN0IHggPSBuIC0geSAqIHRoaXMuY29scztcclxuICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCh4LCB5KTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgbG9hZChzdGF0ZTogTGV0dGVyTWFwU2F2ZVN0YXRlKTogTGV0dGVyTWFwIHtcclxuICAgICAgICBjb25zdCBtYXAgPSBuZXcgTGV0dGVyTWFwKHN0YXRlLnJvd3MsIHN0YXRlLmNvbHMpO1xyXG4gICAgICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIHN0YXRlLmRhdGEpIHtcclxuICAgICAgICAgICAgbWFwLnNldChtYXAuaGllcihrKSwgdik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbWFwO1xyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgUHV6emxlIHtcclxuICAgIGVudHJpZXM6IEVudHJ5W10sXHJcbiAgICBob3ZlckNvb3JkczogZ2VvLlBvaW50IHwgbnVsbCxcclxuICAgIGN1cnNvckNvb3JkczogZ2VvLlBvaW50IHwgbnVsbCxcclxuICAgIGN1cnNvckRpcjogRGlyZWN0aW9uLFxyXG4gICAgZ3JpZDogTGV0dGVyTWFwLFxyXG4gICAgcHJpbnQ6IGJvb2xlYW4sXHJcbn1cclxuXHJcbmVudW0gTW9kZSB7XHJcbiAgICBDcmVhdGUsXHJcbiAgICBQbGF5LFxyXG59XHJcblxyXG5pbnRlcmZhY2UgQXBwIHtcclxuICAgIG1vZGU6IE1vZGUsXHJcbiAgICBoaW50QW5zd2VyczogSGludEFuc3dlcltdLFxyXG4gICAgcHV6emxlOiBQdXp6bGUsXHJcbn1cclxuXHJcbmludGVyZmFjZSBBcHBTYXZlU3RhdGUge1xyXG4gICAgbW9kZTogc3RyaW5nLFxyXG4gICAgaGludEFuc3dlcnM6IEhpbnRBbnN3ZXJbXSxcclxuICAgIHB1enpsZTogUHV6emxlU2F2ZVN0YXRlLFxyXG59XHJcblxyXG5pbnRlcmZhY2UgUHV6emxlU2F2ZVN0YXRlIHtcclxuICAgIGVudHJpZXM6IEVudHJ5U2F2ZVN0YXRlW10sXHJcbiAgICBjdXJzb3JDb29yZHM6IFtudW1iZXIsIG51bWJlcl0gfCBudWxsLFxyXG4gICAgY3Vyc29yRGlyOiBzdHJpbmcsXHJcbiAgICBncmlkOiBMZXR0ZXJNYXBTYXZlU3RhdGUsXHJcbn1cclxuXHJcbmludGVyZmFjZSBFbnRyeVNhdmVTdGF0ZSB7XHJcbiAgICBudW06IG51bWJlcixcclxuICAgIGhpbnQ6IHN0cmluZyxcclxuICAgIGFuc3dlcjogc3RyaW5nLFxyXG4gICAgcG9zOiBbbnVtYmVyLCBudW1iZXJdLFxyXG4gICAgZGlyOiBzdHJpbmcsXHJcbiAgICBzb2x2ZWQ6IGJvb2xlYW4sXHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBtYWluKCkge1xyXG4gICAgbGV0IGhpbnRBbnN3ZXJzID0gbmV3IEFycmF5PEhpbnRBbnN3ZXI+KCk7XHJcblxyXG4gICAgbGV0IHB1enpsZSA9IDxQdXp6bGU+e1xyXG4gICAgICAgIGVudHJpZXM6IG5ldyBBcnJheTxFbnRyeT4oKSxcclxuICAgICAgICBob3ZlckNvb3JkczogbnVsbCxcclxuICAgICAgICBjdXJzb3JDb29yZHM6IG51bGwsXHJcbiAgICAgICAgY3Vyc29yRGlyOiBEaXJlY3Rpb24uQWNyb3NzLFxyXG4gICAgICAgIGdyaWQ6IG5ldyBMZXR0ZXJNYXAoMCwgMCksXHJcbiAgICAgICAgcHJpbnQ6IGZhbHNlLFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVVaSA9IGRvbS5ieUlkKFwiY3JlYXRlVWlcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbiAgICBjb25zdCBwbGF5VWkgPSBkb20uYnlJZChcInBsYXlVaVwiKSBhcyBIVE1MRGl2RWxlbWVudDtcclxuICAgIGNvbnN0IHB1enpsZUNhbnZhcyA9IGRvbS5ieUlkKFwicHV6emxlQ2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50O1xyXG4gICAgY29uc3QgcHV6emxlQ29udGV4dCA9IHB1enpsZUNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikgYXMgQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEO1xyXG4gICAgaWYgKCFwdXp6bGVDb250ZXh0KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FudmFzIGVsZW1lbnQgbm90IHN1cHBvcnRlZFwiKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGhpbnRBbnN3ZXJGb3JtID0gZG9tLmJ5SWQoXCJoaW50QW5zd2VyRm9ybVwiKSBhcyBIVE1MRm9ybUVsZW1lbnQ7XHJcbiAgICBjb25zdCBoaW50SW5wdXQgPSBkb20uYnlJZChcImhpbnRcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGFuc3dlcklucHV0ID0gZG9tLmJ5SWQoXCJhbnN3ZXJcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGhpbnRBbnN3ZXJUZW1wbGF0ZSA9IGRvbS5ieUlkKFwiaGludEFuc3dlclRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XHJcbiAgICBjb25zdCBoaW50QW5zd2VyTGlzdCA9IGRvbS5ieUlkKFwiaGludEFuc3dlcnNcIikgYXMgSFRNTE9MaXN0RWxlbWVudDtcclxuICAgIGNvbnN0IHB1enpsZUhpbnRUZW1wbGF0ZSA9IGRvbS5ieUlkKFwicHV6emxlSGludFRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XHJcbiAgICBjb25zdCBwdXp6bGVIaW50QWNyb3NzTGlzdCA9IGRvbS5ieUlkKFwicHV6emxlSGludHNBY3Jvc3NcIikgYXMgSFRNTE9MaXN0RWxlbWVudDtcclxuICAgIGNvbnN0IHB1enpsZUhpbnREb3duTGlzdCA9IGRvbS5ieUlkKFwicHV6emxlSGludHNEb3duXCIpIGFzIEhUTUxPTGlzdEVsZW1lbnQ7XHJcbiAgICBjb25zdCBjcmVhdGVCdXR0b24gPSBkb20uYnlJZChcImNyZWF0ZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IGNsZWFyQnV0dG9uID0gZG9tLmJ5SWQoXCJjbGVhckJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IHJldHVyblRvQ3JlYXRlID0gZG9tLmJ5SWQoXCJyZXR1cm5Ub0NyZWF0ZVwiKSBhcyBIVE1MTGlua0VsZW1lbnQ7XHJcbiAgICBjb25zdCBwbGF5SW5wdXQgPSBkb20uYnlJZChcInBsYXlJbnB1dFwiKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgY29uc3Qgc2VlZCA9IHJhbmQueG11cjMobmV3IERhdGUoKS50b1N0cmluZygpKTtcclxuICAgIGNvbnN0IHJuZyA9IG5ldyByYW5kLlNGQzMyUk5HKHNlZWQoKSwgc2VlZCgpLCBzZWVkKCksIHNlZWQoKSk7XHJcbiAgICBoaW50QW5zd2VyRm9ybS5hZGRFdmVudExpc3RlbmVyKFwic3VibWl0XCIsIGFkZEhpbnRBbnN3ZXIpO1xyXG4gICAgY3JlYXRlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiBnZW5lcmF0ZSgpKTtcclxuICAgIGNsZWFyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBjbGVhcik7XHJcbiAgICByZXR1cm5Ub0NyZWF0ZS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY3JlYXRlKTtcclxuICAgIHB1enpsZUNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcm1vdmVcIiwgb25QdXp6bGVQb2ludGVyTW92ZSk7XHJcbiAgICBwdXp6bGVDYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIG9uUHV6emxlUG9pbnRlckRvd24pO1xyXG4gICAgcHV6emxlQ2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVyb3V0XCIsIG9uUHV6emxlUG9pbnRlck91dCk7XHJcbiAgICBwbGF5SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgb25QbGF5SW5wdXRLZXlkb3duKTtcclxuICAgIHBsYXlJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgb25QbGF5SW5wdXRJbnB1dCk7XHJcblxyXG4gICAgZG9tLmRlbGVnYXRlKGhpbnRBbnN3ZXJMaXN0LCBcImNsaWNrXCIsIFwiLmRlbGV0ZS1idXR0b25cIiwgZGVsZXRlSGludEFuc3dlcik7XHJcbiAgICBkb20uZGVsZWdhdGUocHV6emxlSGludEFjcm9zc0xpc3QsIFwiY2xpY2tcIiwgXCIucHV6emxlLWhpbnQtbGlcIiwgb25QdXp6bGVIaW50Q2xpY2spO1xyXG4gICAgZG9tLmRlbGVnYXRlKHB1enpsZUhpbnREb3duTGlzdCwgXCJjbGlja1wiLCBcIi5wdXp6bGUtaGludC1saVwiLCBvblB1enpsZUhpbnRDbGljayk7XHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXByaW50XCIsIG9uQmVmb3JlUHJpbnQpO1xyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJhZnRlcnByaW50XCIsIG9uQWZ0ZXJQcmludCk7XHJcblxyXG4gICAgbG9hZCgpO1xyXG5cclxuICAgIGZ1bmN0aW9uIGFkZEhpbnRBbnN3ZXIoZTogRXZlbnQpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGhpbnQgPSBoaW50SW5wdXQudmFsdWU7XHJcbiAgICAgICAgY29uc3QgYW5zd2VyID0gYW5zd2VySW5wdXQudmFsdWU7XHJcbiAgICAgICAgaWYgKCFoaW50IHx8ICFhbnN3ZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBoaW50QW5zd2Vycy5wdXNoKHsgaGludCwgYW5zd2VyIH0pO1xyXG4gICAgICAgIHNhdmUoKTtcclxuXHJcbiAgICAgICAgdXBkYXRlSGludEFuc3dlckxpc3QoKTtcclxuXHJcbiAgICAgICAgaGludElucHV0LnZhbHVlID0gXCJcIjtcclxuICAgICAgICBhbnN3ZXJJbnB1dC52YWx1ZSA9IFwiXCI7XHJcbiAgICAgICAgaGludElucHV0LmZvY3VzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlSGludEFuc3dlckxpc3QoKSB7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKGhpbnRBbnN3ZXJMaXN0KTtcclxuICAgICAgICBmb3IgKGNvbnN0IGhpbnRBbnN3ZXIgb2YgaGludEFuc3dlcnMpIHtcclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBoaW50QW5zd2VyVGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudDtcclxuICAgICAgICAgICAgY29uc3QgaGludFNwYW4gPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaGludFwiKTtcclxuICAgICAgICAgICAgY29uc3QgYW5zd2VyU3BhbiA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5hbnN3ZXJcIik7XHJcbiAgICAgICAgICAgIGhpbnRTcGFuLnRleHRDb250ZW50ID0gaGludEFuc3dlci5oaW50O1xyXG4gICAgICAgICAgICBhbnN3ZXJTcGFuLnRleHRDb250ZW50ID0gaGludEFuc3dlci5hbnN3ZXI7XHJcbiAgICAgICAgICAgIGhpbnRBbnN3ZXJMaXN0LmFwcGVuZENoaWxkKGZyYWdtZW50KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2xlYXIoKSB7XHJcbiAgICAgICAgaGludEFuc3dlcnMgPSBbXTtcclxuICAgICAgICB1cGRhdGVIaW50QW5zd2VyTGlzdCgpO1xyXG4gICAgICAgIHNhdmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWxldGVIaW50QW5zd2VyKGU6IEV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgY29uc3QgbGkgPSB0YXJnZXQuY2xvc2VzdChcIi5oaW50LWFuc3dlci1saVwiKSBhcyBIVE1MTElFbGVtZW50O1xyXG4gICAgICAgIGNvbnN0IHBhcmVudCA9IGxpLnBhcmVudEVsZW1lbnQ7XHJcbiAgICAgICAgaWYgKCFwYXJlbnQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaW5kZXggPSBBcnJheS5mcm9tKHBhcmVudC5jaGlsZHJlbikuaW5kZXhPZihsaSk7XHJcbiAgICAgICAgaGludEFuc3dlcnMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICBzYXZlKCk7XHJcbiAgICAgICAgdXBkYXRlSGludEFuc3dlckxpc3QoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBsb2FkKCkge1xyXG4gICAgICAgIGNvbnN0IGpzb25EYXRhID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oU1RPUkFHRV9LRVkpO1xyXG4gICAgICAgIGlmICghanNvbkRhdGEpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgYXBwID0gbG9hZEFwcChKU09OLnBhcnNlKGpzb25EYXRhKSBhcyBBcHBTYXZlU3RhdGUpO1xyXG4gICAgICAgIGhpbnRBbnN3ZXJzID0gYXBwLmhpbnRBbnN3ZXJzO1xyXG4gICAgICAgIHB1enpsZSA9IGFwcC5wdXp6bGU7XHJcbiAgICAgICAgdXBkYXRlSGludEFuc3dlckxpc3QoKTtcclxuXHJcbiAgICAgICAgaWYgKGFwcC5tb2RlID09PSBNb2RlLkNyZWF0ZSkge1xyXG4gICAgICAgICAgICBjcmVhdGUoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBwbGF5KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNhdmUoKSB7XHJcbiAgICAgICAgY29uc3QgbW9kZSA9IHBsYXlVaS5oaWRkZW4gPyBNb2RlLkNyZWF0ZSA6IE1vZGUuUGxheTtcclxuICAgICAgICBjb25zdCBzdGF0ZSA9IHNhdmVBcHAoe1xyXG4gICAgICAgICAgICBoaW50QW5zd2VycyxcclxuICAgICAgICAgICAgbW9kZSxcclxuICAgICAgICAgICAgcHV6emxlLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBqc29uRGF0YSA9IEpTT04uc3RyaW5naWZ5KHN0YXRlKTtcclxuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShTVE9SQUdFX0tFWSwganNvbkRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNhdmVBcHAoYXBwOiBBcHApOiBBcHBTYXZlU3RhdGUge1xyXG4gICAgICAgIHJldHVybiA8QXBwU2F2ZVN0YXRlPntcclxuICAgICAgICAgICAgbW9kZTogTW9kZVthcHAubW9kZV0sXHJcbiAgICAgICAgICAgIGhpbnRBbnN3ZXJzOiBhcHAuaGludEFuc3dlcnMsXHJcbiAgICAgICAgICAgIHB1enpsZTogc2F2ZVB1enpsZShhcHAucHV6emxlKSxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNhdmVQdXp6bGUocHV6emxlOiBQdXp6bGUpOiBQdXp6bGVTYXZlU3RhdGUge1xyXG4gICAgICAgIHJldHVybiA8UHV6emxlU2F2ZVN0YXRlPntcclxuICAgICAgICAgICAgZW50cmllczogcHV6emxlLmVudHJpZXMubWFwKHNhdmVFbnRyeSksXHJcbiAgICAgICAgICAgIGN1cnNvckNvb3JkczogcHV6emxlLmN1cnNvckNvb3Jkcz8uc2F2ZSgpLFxyXG4gICAgICAgICAgICBjdXJzb3JEaXI6IERpcmVjdGlvbltwdXp6bGUuY3Vyc29yRGlyXSxcclxuICAgICAgICAgICAgZ3JpZDogcHV6emxlLmdyaWQuc2F2ZSgpLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2F2ZUVudHJ5KGVudHJ5OiBFbnRyeSk6IEVudHJ5U2F2ZVN0YXRlIHtcclxuICAgICAgICByZXR1cm4gPEVudHJ5U2F2ZVN0YXRlPntcclxuICAgICAgICAgICAgbnVtOiBlbnRyeS5udW0sXHJcbiAgICAgICAgICAgIGhpbnQ6IGVudHJ5LmhpbnQsXHJcbiAgICAgICAgICAgIGFuc3dlcjogZW50cnkuYW5zd2VyLFxyXG4gICAgICAgICAgICBwb3M6IGVudHJ5LnBvcy5zYXZlKCksXHJcbiAgICAgICAgICAgIGRpcjogRGlyZWN0aW9uW2VudHJ5LmRpcl0sXHJcbiAgICAgICAgICAgIHNvbHZlZDogZW50cnkuc29sdmVkLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbG9hZEFwcChzdGF0ZTogQXBwU2F2ZVN0YXRlKTogQXBwIHtcclxuICAgICAgICByZXR1cm4gPEFwcD57XHJcbiAgICAgICAgICAgIG1vZGU6IE1vZGVbc3RhdGUubW9kZSBhcyBrZXlvZiB0eXBlb2YgTW9kZV0sXHJcbiAgICAgICAgICAgIGhpbnRBbnN3ZXJzOiBzdGF0ZS5oaW50QW5zd2VycyxcclxuICAgICAgICAgICAgcHV6emxlOiBsb2FkUHV6emxlKHN0YXRlLnB1enpsZSksXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBsb2FkUHV6emxlKHN0YXRlOiBQdXp6bGVTYXZlU3RhdGUpOiBQdXp6bGUge1xyXG4gICAgICAgIHJldHVybiA8UHV6emxlPntcclxuICAgICAgICAgICAgZW50cmllczogc3RhdGUuZW50cmllcy5tYXAobG9hZEVudHJ5KSxcclxuICAgICAgICAgICAgaG92ZXJDb29yZHM6IG51bGwsXHJcbiAgICAgICAgICAgIGN1cnNvckNvb3Jkczogc3RhdGUuY3Vyc29yQ29vcmRzID8gZ2VvLlBvaW50LmxvYWQoc3RhdGUuY3Vyc29yQ29vcmRzKSA6IG51bGwsXHJcbiAgICAgICAgICAgIGN1cnNvckRpcjogRGlyZWN0aW9uW3N0YXRlLmN1cnNvckRpciBhcyBrZXlvZiB0eXBlb2YgRGlyZWN0aW9uXSxcclxuICAgICAgICAgICAgZ3JpZDogTGV0dGVyTWFwLmxvYWQoc3RhdGUuZ3JpZCksXHJcbiAgICAgICAgICAgIHByaW50OiBmYWxzZSxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGxvYWRFbnRyeShzdGF0ZTogRW50cnlTYXZlU3RhdGUpOiBFbnRyeSB7XHJcbiAgICAgICAgcmV0dXJuIDxFbnRyeT57XHJcbiAgICAgICAgICAgIG51bTogc3RhdGUubnVtLFxyXG4gICAgICAgICAgICBoaW50OiBzdGF0ZS5oaW50LFxyXG4gICAgICAgICAgICBhbnN3ZXI6IHN0YXRlLmFuc3dlcixcclxuICAgICAgICAgICAgcG9zOiBnZW8uUG9pbnQubG9hZChzdGF0ZS5wb3MpLFxyXG4gICAgICAgICAgICBkaXI6IERpcmVjdGlvbltzdGF0ZS5kaXIgYXMga2V5b2YgdHlwZW9mIERpcmVjdGlvbl0sXHJcbiAgICAgICAgICAgIHNvbHZlZDogc3RhdGUuc29sdmVkLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGUoKSB7XHJcbiAgICAgICAgcHV6emxlLmVudHJpZXMgPSBbXTtcclxuICAgICAgICBwdXp6bGUuZW50cmllcyA9IGdlbmVyYXRlUHV6emxlKHJuZywgaGludEFuc3dlcnMpO1xyXG4gICAgICAgIGlmIChwdXp6bGUuZW50cmllcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgYWxlcnQoXCJGYWlsZWQgdG8gZ2VuZXJhdGUgcHV6emxlXCIpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCByb3dzID0gTWF0aC5tYXgoLi4ucHV6emxlLmVudHJpZXMubWFwKHggPT4geC5wb3MueCArIGVudHJ5V2lkdGgoeCkpKTtcclxuICAgICAgICBjb25zdCBjb2xzID0gTWF0aC5tYXgoLi4ucHV6emxlLmVudHJpZXMubWFwKHggPT4geC5wb3MueSArIGVudHJ5SGVpZ2h0KHgpKSk7XHJcbiAgICAgICAgcHV6emxlLmdyaWQgPSBuZXcgTGV0dGVyTWFwKHJvd3MsIGNvbHMpO1xyXG5cclxuICAgICAgICBwbGF5KCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGxheSgpIHtcclxuICAgICAgICBjcmVhdGVVaS5oaWRkZW4gPSB0cnVlO1xyXG4gICAgICAgIHBsYXlVaS5oaWRkZW4gPSBmYWxzZTtcclxuICAgICAgICBwdXp6bGVDYW52YXMud2lkdGggPSBwdXp6bGVDYW52YXMuY2xpZW50V2lkdGg7XHJcbiAgICAgICAgcHV6emxlQ2FudmFzLmhlaWdodCA9IHB1enpsZUNhbnZhcy5jbGllbnRIZWlnaHQ7XHJcbiAgICAgICAgdXBkYXRlUHV6emxlSGludExpc3QoKTtcclxuICAgICAgICB3aW5kb3cuc2Nyb2xsVG8oeyBsZWZ0OiAwLCB0b3A6IDAgfSk7XHJcbiAgICAgICAgcGxheUlucHV0LmZvY3VzKHtwcmV2ZW50U2Nyb2xsOiB0cnVlfSk7XHJcblxyXG4gICAgICAgIGlmIChwdXp6bGUuZW50cmllcy5sZW5ndGggPiAwICYmICFwdXp6bGUuY3Vyc29yQ29vcmRzKSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBwdXp6bGUuZW50cmllc1swXS5wb3M7XHJcbiAgICAgICAgICAgIHB1enpsZS5jdXJzb3JEaXIgPSBwdXp6bGUuZW50cmllc1swXS5kaXI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzYXZlKCk7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY3JlYXRlKCkge1xyXG4gICAgICAgIHBsYXlVaS5oaWRkZW4gPSB0cnVlO1xyXG4gICAgICAgIGNyZWF0ZVVpLmhpZGRlbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBwdXp6bGUgPSA8UHV6emxlPntcclxuICAgICAgICAgICAgZW50cmllczogbmV3IEFycmF5PEVudHJ5PigpLFxyXG4gICAgICAgICAgICBob3ZlckNvb3JkczogbnVsbCxcclxuICAgICAgICAgICAgY3Vyc29yQ29vcmRzOiBudWxsLFxyXG4gICAgICAgICAgICBjdXJzb3JEaXI6IERpcmVjdGlvbi5BY3Jvc3MsXHJcbiAgICAgICAgICAgIGdyaWQ6IG5ldyBMZXR0ZXJNYXAoMCwgMCksXHJcbiAgICAgICAgICAgIHByaW50OiBmYWxzZSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBzYXZlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlUHV6emxlSGludExpc3QoKSB7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHB1enpsZUhpbnRBY3Jvc3NMaXN0KTtcclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4ocHV6emxlSGludERvd25MaXN0KTtcclxuICAgICAgICBjb25zdCBlbnRyaWVzID0gcHV6emxlLmVudHJpZXM7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZW50cmllcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBlbnRyeSA9IGVudHJpZXNbaV07XHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gcHV6emxlSGludFRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnQ7XHJcbiAgICAgICAgICAgIGNvbnN0IGhpbnRMaSA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5wdXp6bGUtaGludC1saVwiKSBhcyBIVE1MTElFbGVtZW50O1xyXG4gICAgICAgICAgICBoaW50TGkudGV4dENvbnRlbnQgPSBgJHtlbnRyeS5udW19LiAke2VudHJ5LmhpbnR9YDtcclxuICAgICAgICAgICAgaGludExpLmRhdGFzZXQuZW50cnlJbmRleCA9IGAke2l9YDtcclxuXHJcbiAgICAgICAgICAgIGlmIChlbnRyeS5zb2x2ZWQpIHtcclxuICAgICAgICAgICAgICAgIGhpbnRMaS5jbGFzc0xpc3QuYWRkKFwic29sdmVkXCIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZW50cnkuZGlyID09PSBEaXJlY3Rpb24uQWNyb3NzKSB7XHJcbiAgICAgICAgICAgICAgICBwdXp6bGVIaW50QWNyb3NzTGlzdC5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHB1enpsZUhpbnREb3duTGlzdC5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvblB1enpsZVBvaW50ZXJNb3ZlKGV2dDogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgY3h5ID0gbmV3IGdlby5Qb2ludChldnQub2Zmc2V0WCwgZXZ0Lm9mZnNldFkpO1xyXG4gICAgICAgIHB1enpsZS5ob3ZlckNvb3JkcyA9IGNhbnZhc0Nvb3Jkc1RvQ2VsbENvb3JkcyhjeHkpO1xyXG4gICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uUHV6emxlUG9pbnRlckRvd24oZXZ0OiBQb2ludGVyRXZlbnQpIHtcclxuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBjb25zdCB4eSA9IGNhbnZhc0Nvb3Jkc1RvQ2VsbENvb3JkcyhuZXcgZ2VvLlBvaW50KGV2dC5vZmZzZXRYLCBldnQub2Zmc2V0WSkpO1xyXG4gICAgICAgIGNvbnN0IHBkaXIgPSBwZXJwKHB1enpsZS5jdXJzb3JEaXIpO1xyXG4gICAgICAgIGNvbnN0IGVudHJpZXNBdENlbGwgPSBmaW5kRW50cmllc0F0Q2VsbChwdXp6bGUuZW50cmllcywgeHkpO1xyXG5cclxuICAgICAgICAvLyBubyBlbnRyaWVzIGF0IGNlbGwsIGNhbid0IHBsYWNlIGN1cnNvciBoZXJlXHJcbiAgICAgICAgaWYgKCFlbnRyaWVzQXRDZWxsLmxlbmd0aCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzd2l0Y2ggZGlyZWN0aW9ucyBpZiBhdCBzYW1lIGNlbGxcclxuICAgICAgICBpZiAocHV6emxlLmN1cnNvckNvb3JkcyAmJiB4eS5lcXVhbChwdXp6bGUuY3Vyc29yQ29vcmRzKSAmJiBlbnRyaWVzQXRDZWxsLnNvbWUoeCA9PiB4LmRpciA9PT0gcGRpcikpIHtcclxuICAgICAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IHBkaXI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpZiBjdXJyZW50IGN1cnNvciBkaXJlY3Rpb24gZG9lcyBub3QgYWxpZ24gd2l0aCBhIHdvcmQgYXQgdGhlIGNlbGwsIHN3aXRjaCBkaXJlY3Rpb25cclxuICAgICAgICBpZiAoIWVudHJpZXNBdENlbGwuc29tZSh4ID0+IHguZGlyID09PSBwdXp6bGUuY3Vyc29yRGlyKSkge1xyXG4gICAgICAgICAgICBwdXp6bGUuY3Vyc29yRGlyID0gcGVycChwdXp6bGUuY3Vyc29yRGlyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSB4eTtcclxuICAgICAgICBwbGF5SW5wdXQuZm9jdXMoe3ByZXZlbnRTY3JvbGw6IHRydWV9KTtcclxuICAgICAgICBzYXZlKCk7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QdXp6bGVQb2ludGVyT3V0KCkge1xyXG4gICAgICAgIHB1enpsZS5ob3ZlckNvb3JkcyA9IG51bGw7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QbGF5SW5wdXRLZXlkb3duKGV2dDogS2V5Ym9hcmRFdmVudCkge1xyXG4gICAgICAgIGlmICghcHV6emxlLmN1cnNvckNvb3Jkcykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIWV2dC5rZXkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qga2V5cyA9IG5ldyBTZXQoW1wiVGFiXCIsIFwiRGVsZXRlXCIsIFwiUmlnaHRBcnJvd1wiLCBcIlVwQXJyb3dcIiwgXCJMZWZ0QXJyb3dcIiwgXCJEb3duQXJyb3dcIiwgXCJCYWNrc3BhY2VcIl0pO1xyXG4gICAgICAgIGlmICgha2V5cy5oYXMoZXZ0LmtleSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gREVMRVRFIC0gZGVsZXRlIGN1cnJlbnQgY2hhclxyXG4gICAgICAgIGNvbnN0IGVudHJpZXNBdENlbGwgPSBmaW5kRW50cmllc0F0Q2VsbChwdXp6bGUuZW50cmllcywgcHV6emxlLmN1cnNvckNvb3Jkcyk7XHJcbiAgICAgICAgY29uc3Qgc29sdmVkQXRDZWxsID0gZW50cmllc0F0Q2VsbC5zb21lKHggPT4geC5zb2x2ZWQpO1xyXG5cclxuICAgICAgICBpZiAoZXZ0LmtleSA9PT0gXCJEZWxldGVcIiAmJiAhc29sdmVkQXRDZWxsKSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5ncmlkLnNldChwdXp6bGUuY3Vyc29yQ29vcmRzLCBcIlwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChldnQua2V5ID09PSBcIlRhYlwiICYmICFldnQuc2hpZnRLZXkpIHtcclxuICAgICAgICAgICAgYWR2YW5jZUN1cnNvcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGV2dC5rZXkgPT09IFwiVGFiXCIgJiYgZXZ0LnNoaWZ0S2V5KSB7XHJcbiAgICAgICAgICAgIGJhY2t1cEN1cnNvcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdiA9IGdldEFycm93S2V5VmVjdG9yKGV2dC5rZXkpO1xyXG4gICAgICAgIGlmICh2LnggIT09IDAgfHwgdi55ICE9PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvb3JkcyA9IHB1enpsZS5jdXJzb3JDb29yZHMuYWRkUG9pbnQodik7XHJcbiAgICAgICAgICAgIGlmIChhbnlFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBjb29yZHMpKSB7XHJcbiAgICAgICAgICAgICAgICBwdXp6bGUuY3Vyc29yQ29vcmRzID0gY29vcmRzO1xyXG4gICAgICAgICAgICAgICAgYWRqdXN0Q3Vyc29yKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChldnQua2V5ID09PSBcIkJhY2tzcGFjZVwiKSB7XHJcbiAgICAgICAgICAgIGJhY2t1cEN1cnNvcigpO1xyXG4gICAgICAgICAgICBpZiAoIWZpbmRFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBwdXp6bGUuY3Vyc29yQ29vcmRzKS5zb21lKHggPT4geC5zb2x2ZWQpKSB7XHJcbiAgICAgICAgICAgICAgICBwdXp6bGUuZ3JpZC5zZXQocHV6emxlLmN1cnNvckNvb3JkcywgXCJcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgICAgIHNhdmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvblB1enpsZUhpbnRDbGljayhlOiBFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIGNvbnN0IGxpID0gdGFyZ2V0LmNsb3Nlc3QoXCIucHV6emxlLWhpbnQtbGlcIikgYXMgSFRNTExJRWxlbWVudDtcclxuICAgICAgICBjb25zdCBlbnRyeUluZGV4U3RyaW5nID0gbGk/LmRhdGFzZXQ/LmVudHJ5SW5kZXg7XHJcbiAgICAgICAgaWYgKCFlbnRyeUluZGV4U3RyaW5nKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGVudHJ5SW5kZXggPSBwYXJzZUludChlbnRyeUluZGV4U3RyaW5nKTtcclxuICAgICAgICBjb25zdCBlbnRyeSA9IHB1enpsZS5lbnRyaWVzW2VudHJ5SW5kZXhdO1xyXG4gICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBlbnRyeS5wb3M7XHJcbiAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IGVudHJ5LmRpcjtcclxuICAgICAgICBkcmF3UHV6emxlKHB1enpsZUNhbnZhcywgcHV6emxlQ29udGV4dCwgcHV6emxlKTtcclxuICAgICAgICBzYXZlKCk7XHJcbiAgICAgICAgcGxheUlucHV0LmZvY3VzKHtwcmV2ZW50U2Nyb2xsOiB0cnVlfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QdXp6bGVTb2x2ZWQoKSB7XHJcbiAgICAgICAgYWxlcnQoXCJZT1UgU09MVkVEIFRIRSBQVVpaTEUhIEJSQVZPIVwiKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvbkJlZm9yZVByaW50KCkge1xyXG4gICAgICAgIHB1enpsZS5wcmludCA9IHRydWU7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25BZnRlclByaW50KCkge1xyXG4gICAgICAgIHB1enpsZS5wcmludCA9IGZhbHNlO1xyXG4gICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uUGxheUlucHV0SW5wdXQoZTogRXZlbnQpIHtcclxuICAgICAgICBjb25zdCBldnQgPSBlIGFzIElucHV0RXZlbnQ7XHJcbiAgICAgICAgcGxheUlucHV0LnZhbHVlID0gXCJcIjtcclxuXHJcbiAgICAgICAgaWYgKCFldnQuZGF0YSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXB1enpsZS5jdXJzb3JDb29yZHMpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZW50cmllc0F0Q2VsbCA9IGZpbmRFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBwdXp6bGUuY3Vyc29yQ29vcmRzKTtcclxuICAgICAgICBpZiAoZW50cmllc0F0Q2VsbC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbGV0dGVyID0gZXZ0LmRhdGEudG9VcHBlckNhc2UoKTtcclxuICAgICAgICBpZiAobGV0dGVyLmxlbmd0aCA+IDEgfHwgIShsZXR0ZXIubWF0Y2goL1tBLVpdLykpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlbnRyaWVzQXRDZWxsLnNvbWUoeCA9PiB4LnNvbHZlZCkgJiYgbGV0dGVyICE9PSBwdXp6bGUuZ3JpZC5nZXQocHV6emxlLmN1cnNvckNvb3JkcykpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHV6emxlLmdyaWQuc2V0KHB1enpsZS5jdXJzb3JDb29yZHMsIGxldHRlcik7XHJcblxyXG4gICAgICAgIC8vIGNoZWNrIGZvciBjb21wbGV0ZSB3b3JkXHJcbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzQXRDZWxsKSB7XHJcbiAgICAgICAgICAgIGVudHJ5LnNvbHZlZCA9IGVudHJ5U29sdmVkKGVudHJ5LCBwdXp6bGUuZ3JpZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjaGVjayBmb3IgZG9uZVxyXG4gICAgICAgIGlmIChwdXp6bGUuZW50cmllcy5ldmVyeShlID0+IGUuc29sdmVkKSkge1xyXG4gICAgICAgICAgICBvblB1enpsZVNvbHZlZCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWR2YW5jZUN1cnNvcigpO1xyXG4gICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgICAgIHVwZGF0ZVB1enpsZUhpbnRMaXN0KCk7XHJcbiAgICAgICAgc2F2ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkdmFuY2VDdXJzb3IoKSB7XHJcbiAgICAgICAgaWYgKCFwdXp6bGUuY3Vyc29yQ29vcmRzKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGFkdmFuY2VkQ3Vyc29yID0gcHV6emxlLmN1cnNvckNvb3Jkcy5hZGRQb2ludChnZXREaXJlY3Rpb25WZWN0b3IocHV6emxlLmN1cnNvckRpcikpO1xyXG4gICAgICAgIGlmIChhbnlFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBhZHZhbmNlZEN1cnNvcikpIHtcclxuICAgICAgICAgICAgcHV6emxlLmN1cnNvckNvb3JkcyA9IGFkdmFuY2VkQ3Vyc29yO1xyXG4gICAgICAgICAgICBhZGp1c3RDdXJzb3IoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY3Vyc29yRW50cnkgPSBmaW5kQ3Vyc29yRW50cnkoKTtcclxuICAgICAgICBpZiAoIWN1cnNvckVudHJ5KSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBudWxsO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlbnRyeSA9IG5leHRFbnRyeShwdXp6bGUuZW50cmllcywgY3Vyc29yRW50cnkpO1xyXG4gICAgICAgIGlmICghZW50cnkpIHtcclxuICAgICAgICAgICAgYWRqdXN0Q3Vyc29yKCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBlbnRyeS5wb3M7XHJcbiAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IGVudHJ5LmRpcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBiYWNrdXBDdXJzb3IoKSB7XHJcbiAgICAgICAgaWYgKCFwdXp6bGUuY3Vyc29yQ29vcmRzKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGJhY2tlZEN1cnNvciA9IHB1enpsZS5jdXJzb3JDb29yZHMuYWRkUG9pbnQoZ2V0RGlyZWN0aW9uVmVjdG9yKHB1enpsZS5jdXJzb3JEaXIpLm5lZygpKTtcclxuICAgICAgICBpZiAoYW55RW50cmllc0F0Q2VsbChwdXp6bGUuZW50cmllcywgYmFja2VkQ3Vyc29yKSkge1xyXG4gICAgICAgICAgICBwdXp6bGUuY3Vyc29yQ29vcmRzID0gYmFja2VkQ3Vyc29yO1xyXG4gICAgICAgICAgICBhZGp1c3RDdXJzb3IoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY3Vyc29yRW50cnkgPSBmaW5kQ3Vyc29yRW50cnkoKTtcclxuICAgICAgICBpZiAoIWN1cnNvckVudHJ5KSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBudWxsO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlbnRyeSA9IHByZXZFbnRyeShwdXp6bGUuZW50cmllcywgY3Vyc29yRW50cnkpO1xyXG4gICAgICAgIGlmICghZW50cnkpIHtcclxuICAgICAgICAgICAgYWRqdXN0Q3Vyc29yKCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBlbnRyeS5wb3MuYWRkUG9pbnQoZ2V0RGlyZWN0aW9uVmVjdG9yKGVudHJ5LmRpcikubXVsU2NhbGFyKGVudHJ5LmFuc3dlci5sZW5ndGggLSAxKSk7XHJcbiAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IGVudHJ5LmRpcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGp1c3RDdXJzb3IoKSB7XHJcbiAgICAgICAgaWYgKCFwdXp6bGUuY3Vyc29yQ29vcmRzKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBmaW5kRW50cmllc0F0Q2VsbChwdXp6bGUuZW50cmllcywgcHV6emxlLmN1cnNvckNvb3Jkcyk7XHJcbiAgICAgICAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFlbnRyaWVzLnNvbWUoZSA9PiBlLmRpciA9PT0gcHV6emxlLmN1cnNvckRpcikpIHtcclxuICAgICAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IHBlcnAocHV6emxlLmN1cnNvckRpcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbmRDdXJzb3JFbnRyeSgpOiBFbnRyeSB8IHVuZGVmaW5lZCB7XHJcbiAgICAgICAgaWYgKCFwdXp6bGUuY3Vyc29yQ29vcmRzKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmaW5kRW50cmllc0F0Q2VsbChwdXp6bGUuZW50cmllcywgcHV6emxlLmN1cnNvckNvb3JkcykuZmluZCh4ID0+IHguZGlyID09PSBwdXp6bGUuY3Vyc29yRGlyKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcm5kRGlyKHJuZzogcmFuZC5STkcpOiBEaXJlY3Rpb24ge1xyXG4gICAgY29uc3QgZGlyZWN0aW9ucyA9IFtEaXJlY3Rpb24uQWNyb3NzLCBEaXJlY3Rpb24uRG93bl07XHJcbiAgICByZXR1cm4gcmFuZC5jaG9vc2Uocm5nLCBkaXJlY3Rpb25zKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGVycChkaXI6IERpcmVjdGlvbik6IERpcmVjdGlvbiB7XHJcbiAgICBpZiAoZGlyID09IERpcmVjdGlvbi5BY3Jvc3MpIHtcclxuICAgICAgICByZXR1cm4gRGlyZWN0aW9uLkRvd247XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIERpcmVjdGlvbi5BY3Jvc3M7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlUHV6emxlKHJuZzogcmFuZC5STkcsIGhpbnRBbnN3ZXJzOiBIaW50QW5zd2VyW10pOiBFbnRyeVtdIHtcclxuICAgIGlmIChoaW50QW5zd2Vycy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgIGFsZXJ0KFwiUGxlYXNlIGVudGVyIGF0IGxlYXN0IG9uZSBoaW50IGFuZCBhbnN3ZXIhXCIpO1xyXG4gICAgICAgIHJldHVybiBbXTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBtYWtlIGFsbCBhbnN3ZXJzIGxvd2VyY2FzZVxyXG4gICAgZm9yIChjb25zdCBoYSBvZiBoaW50QW5zd2Vycykge1xyXG4gICAgICAgIGhhLmFuc3dlciA9IGhhLmFuc3dlci50b0xvY2FsZVVwcGVyQ2FzZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHJldHJ5IHVudGlsIHN1Y2Nlc3NmdWwgKHVwIHRvIGEgY2VydGFpbiBhbW91bnQpXHJcbiAgICBjb25zdCBwdXp6bGVzID0gbmV3IEFycmF5PEVudHJ5W10+KCk7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1BWF9HRU5TOyArK2kpIHtcclxuICAgICAgICBjb25zdCBlbnRyaWVzID0gdHJ5R2VuZXJhdGVQdXp6bGUocm5nLCBoaW50QW5zd2Vycyk7XHJcbiAgICAgICAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHV6emxlcy5wdXNoKGVudHJpZXMpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChwdXp6bGVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiBbXTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBlbnRyaWVzID0gcHV6emxlcy5yZWR1Y2UoKHByZXYsIGN1cikgPT4gY2FsY1Njb3JlKHByZXYpIDwgY2FsY1Njb3JlKGN1cikgPyBwcmV2IDogY3VyKTtcclxuICAgIGVudHJpZXMuc29ydCgoeCwgeSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGRuID0geC5udW0gLSB5Lm51bTtcclxuICAgICAgICByZXR1cm4gZG4gPT09IDAgPyB4LmRpciAtIHkuZGlyIDogZG47XHJcbiAgICB9KTtcclxuXHJcbiAgICBzaGlmdFB1enpsZShlbnRyaWVzKTtcclxuICAgIHJldHVybiBlbnRyaWVzO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0cnlHZW5lcmF0ZVB1enpsZShybmc6IHJhbmQuUk5HLCBoaW50QW5zd2VyczogSGludEFuc3dlcltdKTogRW50cnlbXSB7XHJcbiAgICByYW5kLnNodWZmbGUocm5nLCBoaW50QW5zd2Vycyk7XHJcblxyXG4gICAgLy8gcGxhY2UgbG9uZ2VzdCB3b3JkIGF0IDAsMCByYW5kb21seSBhY3Jvc3MvZG93blxyXG4gICAgY29uc3QgZW50cmllcyA9IG5ldyBBcnJheTxFbnRyeT4oKTtcclxuICAgIGVudHJpZXMucHVzaChwbGFjZUluaXRpYWxFbnRyeShybmcsIGhpbnRBbnN3ZXJzWzBdKSk7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBoaW50QW5zd2Vycy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGhhID0gaGludEFuc3dlcnNbaV07XHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBwbGFjZU5leHRFbnRyeShlbnRyaWVzLCBoYSk7XHJcbiAgICAgICAgaWYgKGVudHJ5KSB7XHJcbiAgICAgICAgICAgIGVudHJpZXMucHVzaChlbnRyeSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZW50cmllcztcclxufVxyXG5cclxuZnVuY3Rpb24gc2hpZnRQdXp6bGUoZW50cmllczogRW50cnlbXSkge1xyXG4gICAgLy8gc2hpZnQgdGhlIHB1enpsZSBzdWNoIHRoYXQgYWxsIHdvcmRzIHN0YXJ0ID49ICgwLCAwKVxyXG4gICAgY29uc3QgbWluWCA9IE1hdGgubWluKC4uLmVudHJpZXMubWFwKHggPT4geC5wb3MueCkpO1xyXG4gICAgY29uc3QgbWluWSA9IE1hdGgubWluKC4uLmVudHJpZXMubWFwKHggPT4geC5wb3MueSkpO1xyXG4gICAgY29uc3QgeHkgPSBuZXcgZ2VvLlBvaW50KC1taW5YLCAtbWluWSk7XHJcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICBlbnRyeS5wb3MgPSBlbnRyeS5wb3MuYWRkUG9pbnQoeHkpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjU2NvcmUoZW50cmllczogRW50cnlbXSk6IG51bWJlciB7XHJcbiAgICAvLyBjYWxjdWxhdGUgcHV6emxlIHNjb3JlLFxyXG4gICAgLy8gbG93ZXIgaXMgYmV0dGVyXHJcbiAgICBjb25zdCB4ID0gTWF0aC5taW4oLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy54KSk7XHJcbiAgICBjb25zdCB5ID0gTWF0aC5taW4oLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy55KSk7XHJcbiAgICBjb25zdCB3ID0gTWF0aC5tYXgoLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy54ICsgZW50cnlXaWR0aChlKSkpIC0geDtcclxuICAgIGNvbnN0IGggPSBNYXRoLm1heCguLi5lbnRyaWVzLm1hcChlID0+IGUucG9zLnkgKyBlbnRyeUhlaWdodChlKSkpIC0geTtcclxuICAgIHJldHVybiB3ICogaDtcclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VJbml0aWFsRW50cnkocm5nOiByYW5kLlJORywgaGE6IEhpbnRBbnN3ZXIpOiBFbnRyeSB7XHJcbiAgICBjb25zdCB7IGhpbnQsIGFuc3dlciB9ID0gaGE7XHJcbiAgICBjb25zdCBkaXIgPSBybmREaXIocm5nKTtcclxuICAgIGNvbnN0IHBvcyA9IG5ldyBnZW8uUG9pbnQoMCwgMCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBudW06IDEsXHJcbiAgICAgICAgaGludCxcclxuICAgICAgICBhbnN3ZXIsXHJcbiAgICAgICAgcG9zLFxyXG4gICAgICAgIGRpcixcclxuICAgICAgICBzb2x2ZWQ6IGZhbHNlLFxyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VOZXh0RW50cnkoZW50cmllczogRW50cnlbXSwgaGE6IEhpbnRBbnN3ZXIpOiBFbnRyeSB8IHVuZGVmaW5lZCB7XHJcbiAgICBjb25zdCB7IGhpbnQsIGFuc3dlciB9ID0gaGE7XHJcblxyXG4gICAgLy8gZmluZCBuZXh0IHBvc3NpYmxlIGludGVyc2VjdGlvbiB3aXRoIGV4aXN0aW5nIHdvcmRzXHJcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICAvLyBmaW5kIG5leHQgY29tbW9uIGxldHRlclxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZW50cnkuYW5zd2VyLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgYW5zd2VyLmxlbmd0aDsgKytqKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkuYW5zd2VyW2ldID09PSBhbnN3ZXJbal0pIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyB0cnkgcGxhY2luZyB0aGUgd29yZCBoZXJlXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaSA9IGluZGV4IGluIGFscmVhZHkgcGxhY2VkIHdvcmRcclxuICAgICAgICAgICAgICAgICAgICAvLyBqID0gaW5kZXggaW4gdW5wbGFjZWQgd29yZFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHdvcmQgaXMgdmVydGljYWwsIHBsYWNlIGhvcml6b250YWxcclxuICAgICAgICAgICAgICAgICAgICAvLyBpZiB3b3JkIGlzIGhvcml6b250YWwsIHBsYWNlIHZlcnRpY2FsXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tbW9uUG9zID0gZ2V0Q2hhclBvc2l0aW9uKGVudHJ5LnBvcywgZW50cnkuZGlyLCBpKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXIgPSBwZXJwKGVudHJ5LmRpcik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9zID0gZ2V0U3RhcnRQb3NpdGlvbihjb21tb25Qb3MsIGRpciwgaik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVmFsaWRXb3JkUGxhY2VtZW50KGVudHJpZXMsIGFuc3dlciwgcG9zLCBkaXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRvZXMgYW5vdGhlciBlbnRyeSBzdGFydCBoZXJlPyBpZiBzbywgc2hhcmUgaXQncyBudW1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCB1c2UgbWF4ICsgMVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBudW0gPSBlbnRyaWVzLmZpbHRlcih4ID0+IHgucG9zLmVxdWFsKHBvcykpLm1hcCh4ID0+IHgubnVtKVswXSA/PyBNYXRoLm1heCguLi5lbnRyaWVzLm1hcCh4ID0+IHgubnVtICsgMSkpID8/IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGU6IEVudHJ5ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGludCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuc3dlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvbHZlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gbm8gcGxhY2VtZW50IGZvdW5kXHJcbiAgICByZXR1cm47XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldERpcmVjdGlvblZlY3RvcihkaXI6IERpcmVjdGlvbik6IGdlby5Qb2ludCB7XHJcbiAgICBzd2l0Y2ggKGRpcikge1xyXG4gICAgICAgIGNhc2UgRGlyZWN0aW9uLkFjcm9zczpcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMSwgMCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgRGlyZWN0aW9uLkRvd246XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KDAsIDEpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxuXHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGRpcmVjdG9uXCIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkV29yZFBsYWNlbWVudChlbnRyaWVzOiBFbnRyeVtdLCBhbnN3ZXI6IHN0cmluZywgcG9zOiBnZW8uUG9pbnQsIGRpcjogRGlyZWN0aW9uKTogYm9vbGVhbiB7XHJcbiAgICAvLyBjaGVjayBmb3Igb3ZlcmxhcFxyXG4gICAgLy8gY2FzZXM6XHJcbiAgICAvLyBhY3Jvc3MvYWNyb3NzXHJcbiAgICAvLyBkb3duL2Rvd25cclxuICAgIC8vIGFjcm9zcy9kb3duXHJcbiAgICAvLyBkb3duL2Fjcm9zcyAoc3dhcCBhbmQgbWFrZSBzYW1lIGNhc2U/KVxyXG4gICAgLy8gYW55IG92ZXJsYXAgYXQgbm9uLVxyXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgaWYgKCFpc1ZhbGlkUGxhY2VtZW50KGVudHJ5LnBvcywgZW50cnkuYW5zd2VyLCBlbnRyeS5kaXIsIHBvcywgYW5zd2VyLCBkaXIpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmFsaWRQbGFjZW1lbnQocG9zMTogZ2VvLlBvaW50LCBhMTogc3RyaW5nLCBkaXIxOiBEaXJlY3Rpb24sIHBvczI6IGdlby5Qb2ludCwgYTI6IHN0cmluZywgZGlyMjogRGlyZWN0aW9uKTogYm9vbGVhbiB7XHJcbiAgICBpZiAoZGlyMSA9PT0gRGlyZWN0aW9uLkFjcm9zcyAmJiBkaXIyID09PSBEaXJlY3Rpb24uQWNyb3NzKSB7XHJcbiAgICAgICAgcmV0dXJuIGlzVmFsaWRQbGFjZW1lbnRBY3Jvc3NBY3Jvc3MocG9zMSwgYTEsIHBvczIsIGEyKTtcclxuICAgIH0gZWxzZSBpZiAoZGlyMSA9PT0gRGlyZWN0aW9uLkRvd24gJiYgZGlyMiA9PT0gRGlyZWN0aW9uLkRvd24pIHtcclxuICAgICAgICByZXR1cm4gaXNWYWxpZFBsYWNlbWVudERvd25Eb3duKHBvczEsIGExLCBwb3MyLCBhMik7XHJcbiAgICB9IGVsc2UgaWYgKGRpcjEgPT09IERpcmVjdGlvbi5BY3Jvc3MgJiYgZGlyMiA9PT0gRGlyZWN0aW9uLkRvd24pIHtcclxuICAgICAgICByZXR1cm4gaXNWYWxpZFBsYWNlbWVudEFjcm9zc0Rvd24ocG9zMSwgYTEsIHBvczIsIGEyKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gaXNWYWxpZFBsYWNlbWVudERvd25BY3Jvc3MocG9zMSwgYTEsIHBvczIsIGEyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFBsYWNlbWVudEFjcm9zc0Fjcm9zcyhwb3MxOiBnZW8uUG9pbnQsIGExOiBzdHJpbmcsIHBvczI6IGdlby5Qb2ludCwgYTI6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgLy8gaWYgeSBjb29yZHMgbm90IHRvdWNoaW5nLCB2YWxpZFxyXG4gICAgaWYgKE1hdGguYWJzKHBvczEueSAtIHBvczIueSkgPiAxKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gaWYgeCByYW5nZXMgbm90IHRvdWNoaW5nLCB2YWxpZFxyXG4gICAgaWYgKHBvczEueCArIGExLmxlbmd0aCArIDEgPCBwb3MxLnggfHwgcG9zMS54ID4gcG9zMi54ICsgYTIubGVuZ3RoICsgMSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFBsYWNlbWVudERvd25Eb3duKHBvczE6IGdlby5Qb2ludCwgYTE6IHN0cmluZywgcG9zMjogZ2VvLlBvaW50LCBhMjogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAvLyBpZiB5IGNvb3JkcyBub3QgdG91Y2hpbmcsIHZhbGlkXHJcbiAgICBpZiAoTWF0aC5hYnMocG9zMS54IC0gcG9zMi54KSA+IDEpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBpZiB4IHJhbmdlcyBub3QgdG91Y2hpbmcsIHZhbGlkXHJcbiAgICBpZiAocG9zMS55ICsgYTEubGVuZ3RoICsgMSA8IHBvczEueSB8fCBwb3MxLnkgPiBwb3MyLnkgKyBhMi5sZW5ndGggKyAxKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkUGxhY2VtZW50QWNyb3NzRG93bihwb3MxOiBnZW8uUG9pbnQsIGExOiBzdHJpbmcsIHBvczI6IGdlby5Qb2ludCwgYTI6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgLy8gaWYgbm8gb3ZlcmxhcCBvbiB4LWF4aXMgdmFsaWRcclxuICAgIGlmIChwb3MxLnggKyBhMS5sZW5ndGggPCBwb3MyLnggLSAxIHx8IHBvczEueCA+IHBvczIueCArIDEpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBpZiBubyBvdmVybGFwIG9uIHktYXhpcywgdmFsaWRcclxuICAgIGlmIChwb3MxLnkgPCBwb3MyLnkgLSAxIHx8IHBvczEueSA+IHBvczIueSArIGEyLmxlbmd0aCArIDEpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBpZiB0b3VjaGluZyAoaXggb3V0c2lkZSBvZiBlaXRoZXIgd29yZCwgbm90IGEgdmFsaWQgcGxhY2VtZW50KVxyXG4gICAgY29uc3QgaXggPSBuZXcgZ2VvLlBvaW50KHBvczIueCwgcG9zMS55KTtcclxuICAgIGlmIChcclxuICAgICAgICBpeC54IDwgcG9zMS54IHx8IGl4LnggPiBwb3MxLnggKyBhMS5sZW5ndGhcclxuICAgICAgICB8fCBpeC55IDwgcG9zMi55IHx8IGl4LnkgPiBwb3MyLnkgKyBhMi5sZW5ndGgpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGExW2l4LnggLSBwb3MxLnhdID09PSBhMltpeC55IC0gcG9zMi55XTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFBsYWNlbWVudERvd25BY3Jvc3MocG9zMTogZ2VvLlBvaW50LCBhMTogc3RyaW5nLCBwb3MyOiBnZW8uUG9pbnQsIGEyOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBpc1ZhbGlkUGxhY2VtZW50QWNyb3NzRG93bihwb3MyLCBhMiwgcG9zMSwgYTEpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDaGFyUG9zaXRpb24oc3RhcnRQb3NpdGlvbjogZ2VvLlBvaW50LCBkaXI6IERpcmVjdGlvbiwgaW5kZXg6IG51bWJlcik6IGdlby5Qb2ludCB7XHJcbiAgICBjb25zdCB2ID0gZ2V0RGlyZWN0aW9uVmVjdG9yKGRpcik7XHJcbiAgICByZXR1cm4gc3RhcnRQb3NpdGlvbi5hZGRQb2ludCh2Lm11bFNjYWxhcihpbmRleCkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTdGFydFBvc2l0aW9uKGNoYXJQb3NpdGlvbjogZ2VvLlBvaW50LCBkaXI6IERpcmVjdGlvbiwgaW5kZXg6IG51bWJlcik6IGdlby5Qb2ludCB7XHJcbiAgICAvLyBnZXQgdGhlIHN0YXJ0IHBvc2l0aW9uIG9mIGEgd29yZCBnaXZlbiB0aGUgcG9zaXRpb24gb2YgYSBzcGVjaWZpZWQgaW5kZXhcclxuICAgIGNvbnN0IHYgPSBnZXREaXJlY3Rpb25WZWN0b3IoZGlyKTtcclxuICAgIHJldHVybiBjaGFyUG9zaXRpb24uc3ViUG9pbnQodi5tdWxTY2FsYXIoaW5kZXgpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd1B1enpsZShjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50LCBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgcHV6emxlOiBQdXp6bGUpIHtcclxuICAgIGNvbnN0IGxldHRlckZvbnQgPSBcImJvbGQgMTZweCBhcmlhbFwiO1xyXG4gICAgY29uc3QgbnVtYmVyRm9udCA9IFwibm9ybWFsIDEwcHggYXJpYWxcIjtcclxuICAgIGN0eC5mb250ID0gbGV0dGVyRm9udDtcclxuICAgIGNvbnN0IGxldHRlclRleHRIZWlnaHQgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoO1xyXG4gICAgY3R4LmZvbnQgPSBudW1iZXJGb250O1xyXG4gICAgY29uc3QgbnVtYmVyVGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGg7XHJcblxyXG4gICAgLy8gZHJhdyBiYWNrZ3JvdW5kXHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiO1xyXG4gICAgY29uc3QgZW50cmllcyA9IHB1enpsZS5lbnRyaWVzO1xyXG4gICAgY29uc3QgcHcgPSBNYXRoLm1heCguLi5lbnRyaWVzLm1hcChlID0+IGUucG9zLnggKyBlbnRyeVdpZHRoKGUpKSk7XHJcbiAgICBjb25zdCBwaCA9IE1hdGgubWF4KC4uLmVudHJpZXMubWFwKGUgPT4gZS5wb3MueSArIGVudHJ5SGVpZ2h0KGUpKSk7XHJcbiAgICBjb25zdCBjYW52YXNXaWR0aCA9IHB3ICogQ0VMTF9TSVpFO1xyXG4gICAgY29uc3QgY2FudmFzSGVpZ2h0ID0gcGggKiBDRUxMX1NJWkU7XHJcbiAgICBjYW52YXMud2lkdGggPSBjYW52YXNXaWR0aDtcclxuICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXNIZWlnaHQ7XHJcbiAgICBjdHguZmlsbFJlY3QoMCwgMCwgY2FudmFzV2lkdGgsIGNhbnZhc0hlaWdodCk7XHJcblxyXG4gICAgLy8gZHJhdyBsZXR0ZXJzIGFuZCBjZWxsc1xyXG4gICAgY3R4LmZvbnQgPSBcImJvbGQgMThweCBhcmlhbFwiO1xyXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgY29uc3QgeyBwb3MsIGFuc3dlciwgZGlyIH0gPSBlbnRyeTtcclxuICAgICAgICBjb25zdCB2ID0gZ2V0RGlyZWN0aW9uVmVjdG9yKGRpcik7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYW5zd2VyLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHAgPSBwb3MuYWRkUG9pbnQodi5tdWxTY2FsYXIoaSkpO1xyXG4gICAgICAgICAgICBjb25zdCBjeCA9IHAueCAqIENFTExfU0laRTtcclxuICAgICAgICAgICAgY29uc3QgY3kgPSBwLnkgKiBDRUxMX1NJWkU7XHJcblxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJ3aGl0ZVwiO1xyXG4gICAgICAgICAgICBjdHguZmlsbFJlY3QoY3gsIGN5LCBDRUxMX1NJWkUsIENFTExfU0laRSk7XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImJsYWNrXCI7XHJcblxyXG4gICAgICAgICAgICBjdHguZm9udCA9IFwiYm9sZCAxOHB4IGFyaWFsXCI7XHJcbiAgICAgICAgICAgIGN0eC5zdHJva2VSZWN0KGN4LCBjeSwgQ0VMTF9TSVpFLCBDRUxMX1NJWkUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBkcmF3IG51bWJlcnNcclxuICAgIGN0eC5mb250ID0gXCJub3JtYWwgMTBweCBhcmlhbFwiO1xyXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgLy8gZHJhdyBudW1iZXJcclxuICAgICAgICBjb25zdCBjb29yZHMgPSBlbnRyeS5wb3MubXVsU2NhbGFyKENFTExfU0laRSk7XHJcbiAgICAgICAgY3R4LmZpbGxUZXh0KGAke2VudHJ5Lm51bX1gLCBjb29yZHMueCArIDIsIGNvb3Jkcy55ICsgMiArIG51bWJlclRleHRIZWlnaHQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgZW50ZXJlZCBsZXR0ZXJzXHJcbiAgICBjb25zdCBncmlkID0gcHV6emxlLmdyaWQ7XHJcbiAgICBmb3IgKGNvbnN0IGNlbGxDb29yZHMgb2YgZ3JpZC5rZXlzKCkpIHtcclxuICAgICAgICBjb25zdCBsZXR0ZXIgPSBncmlkLmdldChjZWxsQ29vcmRzKTtcclxuICAgICAgICBpZiAoIWxldHRlcikge1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvb3JkcyA9IGNlbGxDb29yZHNUb0NhbnZhc0Nvb3JkcyhjZWxsQ29vcmRzKS5hZGRQb2ludChuZXcgZ2VvLlBvaW50KENFTExfUEFERElORywgQ0VMTF9QQURESU5HKSk7XHJcbiAgICAgICAgY29uc3QgbWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dChsZXR0ZXIpO1xyXG4gICAgICAgIGNvb3Jkcy54ICs9IENFTExfSU5URVJJT1JfU0laRSAvIDIuMDtcclxuICAgICAgICBjb29yZHMueSArPSBDRUxMX0lOVEVSSU9SX1NJWkUgLyAyLjA7XHJcbiAgICAgICAgY29vcmRzLnkgKz0gbGV0dGVyVGV4dEhlaWdodCAvIDIuMDtcclxuICAgICAgICBjb29yZHMueCAtPSBtZXRyaWNzLndpZHRoIC8gMi4wO1xyXG4gICAgICAgIGN0eC5mb250ID0gXCIxNnB4IGFyaWFsXCI7XHJcbiAgICAgICAgY3R4LmZpbGxUZXh0KGxldHRlciwgY29vcmRzLngsIGNvb3Jkcy55KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBkcmF3IHJlZCB3aGVyZSBob3ZlcmluZ1xyXG4gICAgaWYgKHB1enpsZS5ob3ZlckNvb3JkcyAmJiAhcHV6emxlLnByaW50KSB7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMztcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJlZFwiO1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KHB1enpsZS5ob3ZlckNvb3Jkcy54ICogQ0VMTF9TSVpFLCBwdXp6bGUuaG92ZXJDb29yZHMueSAqIENFTExfU0laRSwgQ0VMTF9TSVpFLCBDRUxMX1NJWkUpO1xyXG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZHJhdyBjdXJzb3JcclxuICAgIGlmIChwdXp6bGUuY3Vyc29yQ29vcmRzICYmICFwdXp6bGUucHJpbnQpIHtcclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG5cclxuICAgICAgICBjb25zdCBjYW52YXNDb29yZHMgPSBjZWxsQ29vcmRzVG9DYW52YXNDb29yZHMocHV6emxlLmN1cnNvckNvb3Jkcyk7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDM7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmVkXCI7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5hcmMoY2FudmFzQ29vcmRzLnggKyBDRUxMX1NJWkUgLyAyLjAsIGNhbnZhc0Nvb3Jkcy55ICsgQ0VMTF9TSVpFIC8gMi4wLCAzLCAwLCBNYXRoLlBJICogMik7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuXHJcbiAgICAgICAgLy8gaGlnaGxpZ2h0IHdvcmQgdW5kZXIgY3Vyc29yXHJcbiAgICAgICAgY29uc3QgZW50cmllcyA9IGZpbmRFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBwdXp6bGUuY3Vyc29yQ29vcmRzKS5maWx0ZXIoeCA9PiB4LmRpciA9PT0gcHV6emxlLmN1cnNvckRpcik7XHJcbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGVudHJ5LnNvbHZlZCA/IFwiZ3JlZW5cIiA6IFwicmVkXCI7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgeCwgeSB9ID0gY2VsbENvb3Jkc1RvQ2FudmFzQ29vcmRzKGVudHJ5LnBvcyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gZW50cnlXaWR0aChlbnRyeSkgKiBDRUxMX1NJWkU7XHJcbiAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IGVudHJ5SGVpZ2h0KGVudHJ5KSAqIENFTExfU0laRTtcclxuICAgICAgICAgICAgY3R4LnN0cm9rZVJlY3QoeCwgeSwgd2lkdGgsIGhlaWdodCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjdHgucmVzdG9yZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBlbnRyeVdpZHRoKGVudHJ5OiBFbnRyeSk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gZW50cnkuZGlyID09PSBEaXJlY3Rpb24uQWNyb3NzID8gZW50cnkuYW5zd2VyLmxlbmd0aCA6IDE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVudHJ5SGVpZ2h0KGVudHJ5OiBFbnRyeSk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gZW50cnkuZGlyID09PSBEaXJlY3Rpb24uRG93biA/IGVudHJ5LmFuc3dlci5sZW5ndGggOiAxO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjYW52YXNDb29yZHNUb0NlbGxDb29yZHMoeHk6IGdlby5Qb2ludCk6IGdlby5Qb2ludCB7XHJcbiAgICByZXR1cm4geHkuZGl2U2NhbGFyKENFTExfU0laRSkuZmxvb3IoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2VsbENvb3Jkc1RvQ2FudmFzQ29vcmRzKHh5OiBnZW8uUG9pbnQpOiBnZW8uUG9pbnQge1xyXG4gICAgcmV0dXJuIHh5Lm11bFNjYWxhcihDRUxMX1NJWkUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kRW50cmllc0F0Q2VsbChlbnRyaWVzOiBFbnRyeVtdLCB4eTogZ2VvLlBvaW50KTogRW50cnlbXSB7XHJcbiAgICByZXR1cm4gZW50cmllcy5maWx0ZXIoeCA9PiBlbnRyeUNvbnRhaW5zUG9pbnQoeCwgeHkpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYW55RW50cmllc0F0Q2VsbChlbnRyaWVzOiBFbnRyeVtdLCB4eTogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gZmluZEVudHJpZXNBdENlbGwoZW50cmllcywgeHkpLmxlbmd0aCA+IDA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVudHJ5Q29udGFpbnNQb2ludChlbnRyeTogRW50cnksIHh5OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBlbnRyeS5kaXIgPT09IERpcmVjdGlvbi5BY3Jvc3MgJiYgeHkueSA9PT0gZW50cnkucG9zLnkgJiYgeHkueCA+PSBlbnRyeS5wb3MueCAmJiB4eS54IDwgZW50cnkucG9zLnggKyBlbnRyeS5hbnN3ZXIubGVuZ3RoXHJcbiAgICAgICAgfHwgZW50cnkuZGlyID09PSBEaXJlY3Rpb24uRG93biAmJiB4eS54ID09PSBlbnRyeS5wb3MueCAmJiB4eS55ID49IGVudHJ5LnBvcy55ICYmIHh5LnkgPCBlbnRyeS5wb3MueSArIGVudHJ5LmFuc3dlci5sZW5ndGg7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVudHJ5U29sdmVkKGVudHJ5OiBFbnRyeSwgZ3JpZDogTGV0dGVyTWFwKTogYm9vbGVhbiB7XHJcbiAgICAvLyBjaGVjayBmb3IgY29tcGxldGUgd29yZFxyXG4gICAgY29uc3QgdiA9IGdldERpcmVjdGlvblZlY3RvcihlbnRyeS5kaXIpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbnRyeS5hbnN3ZXIubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCBjb29yZHMgPSBlbnRyeS5wb3MuYWRkUG9pbnQodi5tdWxTY2FsYXIoaSkpO1xyXG4gICAgICAgIGlmIChlbnRyeS5hbnN3ZXJbaV0gIT09IGdyaWQuZ2V0KGNvb3JkcykpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0QXJyb3dLZXlWZWN0b3Ioa2V5OiBzdHJpbmcpOiBnZW8uUG9pbnQge1xyXG4gICAgaWYgKGtleSA9PT0gXCJBcnJvd0xlZnRcIikge1xyXG4gICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KC0xLCAwKTtcclxuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBcIkFycm93RG93blwiKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMCwgMSk7XHJcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gXCJBcnJvd1JpZ2h0XCIpIHtcclxuICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgxLCAwKTtcclxuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBcIkFycm93VXBcIikge1xyXG4gICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KDAsIC0xKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgwLCAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbmV4dEVudHJ5KGVudHJpZXM6IEVudHJ5W10sIGVudHJ5OiBFbnRyeSk6IEVudHJ5IHwgdW5kZWZpbmVkIHtcclxuICAgIGNvbnN0IG9mZnNldCA9IGVudHJpZXMuaW5kZXhPZihlbnRyeSk7XHJcbiAgICBpZiAob2Zmc2V0IDwgMCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBpbmRleCA9IChvZmZzZXQgKyAxKSAlIGVudHJpZXMubGVuZ3RoO1xyXG4gICAgcmV0dXJuIGVudHJpZXNbaW5kZXhdO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwcmV2RW50cnkoZW50cmllczogRW50cnlbXSwgZW50cnk6IEVudHJ5KTogRW50cnkgfCB1bmRlZmluZWQge1xyXG4gICAgY29uc3Qgb2Zmc2V0ID0gZW50cmllcy5pbmRleE9mKGVudHJ5KTtcclxuICAgIGlmIChvZmZzZXQgPCAwKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBpbmRleCA9IChvZmZzZXQgLSAxKTtcclxuICAgIGlmIChpbmRleCA8IDApIHtcclxuICAgICAgICBpbmRleCA9IGVudHJpZXMubGVuZ3RoIC0gMTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZW50cmllc1tpbmRleF07XHJcbn1cclxuXHJcbm1haW4oKSJdfQ==