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
        title: "",
        entries: new Array(),
        hoverCoords: null,
        cursorCoords: null,
        cursorDir: Direction.Across,
        grid: new LetterMap(0, 0),
        print: false,
    };
    const createUi = dom.byId("createUi");
    const playUi = dom.byId("playUi");
    const puzzleTitle = dom.byId("puzzleTitle");
    const puzzleCanvas = dom.byId("puzzleCanvas");
    const puzzleContext = puzzleCanvas.getContext("2d");
    if (!puzzleContext) {
        throw new Error("Canvas element not supported");
    }
    const titleInput = dom.byId("title");
    const hintAnswerForm = dom.byId("hintAnswerForm");
    const hintInput = dom.byId("hint");
    const answerInput = dom.byId("answer");
    const hintAnswerTemplate = dom.byId("hintAnswerTemplate");
    const hintAnswerTable = dom.byId("hintAnswers");
    const puzzleHintTemplate = dom.byId("puzzleHintTemplate");
    const puzzleHintAcrossList = dom.byId("puzzleHintsAcross");
    const puzzleHintDownList = dom.byId("puzzleHintsDown");
    const createForm = dom.byId("createForm");
    const clearButton = dom.byId("clearButton");
    const returnToCreate = dom.byId("returnToCreate");
    const playInput = dom.byId("playInput");
    const seed = rand.xmur3(new Date().toString());
    const rng = new rand.SFC32RNG(seed(), seed(), seed(), seed());
    hintAnswerForm.addEventListener("submit", addHintAnswer);
    createForm.addEventListener("submit", generate);
    clearButton.addEventListener("click", clear);
    returnToCreate.addEventListener("click", create);
    puzzleCanvas.addEventListener("pointermove", onPuzzlePointerMove);
    puzzleCanvas.addEventListener("pointerdown", onPuzzlePointerDown);
    puzzleCanvas.addEventListener("pointerout", onPuzzlePointerOut);
    playInput.addEventListener("keydown", onPlayInputKeydown);
    playInput.addEventListener("input", onPlayInputInput);
    dom.delegate(hintAnswerTable, "click", ".delete-button", deleteHintAnswer);
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
        dom.removeAllChildren(hintAnswerTable);
        for (const hintAnswer of hintAnswers) {
            const fragment = hintAnswerTemplate.content.cloneNode(true);
            const hintSpan = dom.bySelector(fragment, ".hint");
            const answerSpan = dom.bySelector(fragment, ".answer");
            hintSpan.textContent = hintAnswer.hint;
            answerSpan.textContent = hintAnswer.answer;
            hintAnswerTable.appendChild(fragment);
        }
    }
    function clear() {
        puzzle.title = "";
        titleInput.textContent = "(Unknown)";
        hintAnswers = [];
        updateHintAnswerList();
        save();
    }
    function deleteHintAnswer(e) {
        const target = e.target;
        const tr = target.closest(".hint-answer-tr");
        const parent = tr.parentElement;
        if (!parent) {
            return;
        }
        const index = Array.from(parent.children).indexOf(tr);
        hintAnswers.splice(index, 1);
        save();
        updateHintAnswerList();
    }
    function load() {
        var _a;
        const jsonData = localStorage.getItem(STORAGE_KEY);
        if (!jsonData) {
            return;
        }
        const app = loadApp(JSON.parse(jsonData));
        hintAnswers = app.hintAnswers;
        puzzle = app.puzzle;
        titleInput.value = (_a = puzzle.title) !== null && _a !== void 0 ? _a : "";
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
            title: puzzle.title,
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
            title: state.title,
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
    function generate(e) {
        e.preventDefault();
        puzzle.title = titleInput.value;
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
        puzzleTitle.textContent = puzzle.title;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jvc3N3b3JkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3Jvc3N3b3JkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE1BQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFDO0FBQ3hDLE1BQU0sa0JBQWtCLEdBQUcsRUFBRSxDQUFDO0FBQzlCLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztBQUN2QixNQUFNLFNBQVMsR0FBRyxrQkFBa0IsR0FBRyxZQUFZLEdBQUcsQ0FBQyxDQUFDO0FBQ3hELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQztBQU92QixJQUFLLFNBR0o7QUFIRCxXQUFLLFNBQVM7SUFDViw2Q0FBTSxDQUFBO0lBQ04seUNBQUksQ0FBQTtBQUNSLENBQUMsRUFISSxTQUFTLEtBQVQsU0FBUyxRQUdiO0FBaUJELE1BQU0sU0FBUztJQUdYLFlBQW1CLElBQVksRUFBUyxJQUFZO1FBQWpDLFNBQUksR0FBSixJQUFJLENBQVE7UUFBUyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ2hELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7SUFDMUMsQ0FBQztJQUVELEdBQUcsQ0FBQyxFQUFhOztRQUNiLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDekIsT0FBTyxNQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxtQ0FBSSxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVELEdBQUcsQ0FBQyxFQUFhLEVBQUUsS0FBYTtRQUM1QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXpCLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDUixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNyQixPQUFPO1NBQ1Y7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVELElBQUk7UUFDQSxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxJQUFJO1FBQ0EsT0FBMkI7WUFDdkIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ3ZCLENBQUM7SUFDTixDQUFDO0lBRU8sSUFBSSxDQUFDLEVBQWE7UUFDdEIsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRU8sSUFBSSxDQUFDLENBQVM7UUFDbEIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUM1QixPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBeUI7UUFDakMsTUFBTSxHQUFHLEdBQUcsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEQsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUU7WUFDN0IsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzNCO1FBRUQsT0FBTyxHQUFHLENBQUM7SUFDZixDQUFDO0NBQ0o7QUFZRCxJQUFLLElBR0o7QUFIRCxXQUFLLElBQUk7SUFDTCxtQ0FBTSxDQUFBO0lBQ04sK0JBQUksQ0FBQTtBQUNSLENBQUMsRUFISSxJQUFJLEtBQUosSUFBSSxRQUdSO0FBZ0NELFNBQVMsSUFBSTtJQUNULElBQUksV0FBVyxHQUFHLElBQUksS0FBSyxFQUFjLENBQUM7SUFFMUMsSUFBSSxNQUFNLEdBQVc7UUFDakIsS0FBSyxFQUFFLEVBQUU7UUFDVCxPQUFPLEVBQUUsSUFBSSxLQUFLLEVBQVM7UUFDM0IsV0FBVyxFQUFFLElBQUk7UUFDakIsWUFBWSxFQUFFLElBQUk7UUFDbEIsU0FBUyxFQUFFLFNBQVMsQ0FBQyxNQUFNO1FBQzNCLElBQUksRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3pCLEtBQUssRUFBRSxLQUFLO0tBQ2YsQ0FBQztJQUVGLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFtQixDQUFDO0lBQ3hELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFtQixDQUFDO0lBQ3BELE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUF1QixDQUFDO0lBQ2xFLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFzQixDQUFDO0lBQ25FLE1BQU0sYUFBYSxHQUFHLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUE2QixDQUFDO0lBQ2hGLElBQUksQ0FBQyxhQUFhLEVBQUU7UUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO0tBQ2xEO0lBRUQsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQXFCLENBQUM7SUFDekQsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBb0IsQ0FBQztJQUNyRSxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBcUIsQ0FBQztJQUN2RCxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBcUIsQ0FBQztJQUMzRCxNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQXdCLENBQUM7SUFDakYsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQXFCLENBQUM7SUFDcEUsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUF3QixDQUFDO0lBQ2pGLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBcUIsQ0FBQztJQUMvRSxNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQXFCLENBQUM7SUFDM0UsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQXNCLENBQUM7SUFDL0QsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQXNCLENBQUM7SUFDakUsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBb0IsQ0FBQztJQUNyRSxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBcUIsQ0FBQztJQUM1RCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUMvQyxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUM5RCxjQUFjLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ3pELFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDaEQsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM3QyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2pELFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUNsRSxZQUFZLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFDbEUsWUFBWSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2hFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUMxRCxTQUFTLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFFdEQsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDM0UsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUNsRixHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQ2hGLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDdEQsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztJQUVwRCxJQUFJLEVBQUUsQ0FBQztJQUVQLFNBQVMsYUFBYSxDQUFDLENBQVE7UUFDM0IsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRW5CLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUM7UUFDN0IsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQztRQUNqQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2xCLE9BQU07U0FDVDtRQUVELFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUNuQyxJQUFJLEVBQUUsQ0FBQztRQUVQLG9CQUFvQixFQUFFLENBQUM7UUFFdkIsU0FBUyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDckIsV0FBVyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDdkIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxTQUFTLG9CQUFvQjtRQUN6QixHQUFHLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDdkMsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUU7WUFDbEMsTUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQXFCLENBQUM7WUFDaEYsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbkQsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDdkQsUUFBUSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3ZDLFVBQVUsQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUMzQyxlQUFlLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3pDO0lBQ0wsQ0FBQztJQUVELFNBQVMsS0FBSztRQUNWLE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLFVBQVUsQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQ3JDLFdBQVcsR0FBRyxFQUFFLENBQUM7UUFDakIsb0JBQW9CLEVBQUUsQ0FBQztRQUN2QixJQUFJLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxTQUFTLGdCQUFnQixDQUFDLENBQVE7UUFDOUIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQXFCLENBQUM7UUFDdkMsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBd0IsQ0FBQztRQUNwRSxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDO1FBQ2hDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDVCxPQUFPO1NBQ1Y7UUFFRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdEQsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0IsSUFBSSxFQUFFLENBQUM7UUFDUCxvQkFBb0IsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFRCxTQUFTLElBQUk7O1FBQ1QsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ1gsT0FBTztTQUNWO1FBRUQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFpQixDQUFDLENBQUM7UUFDMUQsV0FBVyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUM7UUFDOUIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7UUFDcEIsVUFBVSxDQUFDLEtBQUssR0FBRyxNQUFBLE1BQU0sQ0FBQyxLQUFLLG1DQUFJLEVBQUUsQ0FBQztRQUN0QyxvQkFBb0IsRUFBRSxDQUFDO1FBRXZCLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQzFCLE1BQU0sRUFBRSxDQUFDO1NBQ1o7YUFBTTtZQUNILElBQUksRUFBRSxDQUFDO1NBQ1Y7SUFDTCxDQUFDO0lBRUQsU0FBUyxJQUFJO1FBQ1QsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztRQUNyRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUM7WUFDbEIsV0FBVztZQUNYLElBQUk7WUFDSixNQUFNO1NBQ1QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxZQUFZLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQsU0FBUyxPQUFPLENBQUMsR0FBUTtRQUNyQixPQUFxQjtZQUNqQixJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDcEIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxXQUFXO1lBQzVCLE1BQU0sRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztTQUNqQyxDQUFDO0lBQ04sQ0FBQztJQUVELFNBQVMsVUFBVSxDQUFDLE1BQWM7O1FBQzlCLE9BQXdCO1lBQ3BCLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSztZQUNuQixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ3RDLFlBQVksRUFBRSxNQUFBLE1BQU0sQ0FBQyxZQUFZLDBDQUFFLElBQUksRUFBRTtZQUN6QyxTQUFTLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7WUFDdEMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO1NBQzNCLENBQUM7SUFDTixDQUFDO0lBRUQsU0FBUyxTQUFTLENBQUMsS0FBWTtRQUMzQixPQUF1QjtZQUNuQixHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7WUFDZCxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDaEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO1lBQ3BCLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtZQUNyQixHQUFHLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7WUFDekIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO1NBQ3ZCLENBQUM7SUFDTixDQUFDO0lBRUQsU0FBUyxPQUFPLENBQUMsS0FBbUI7UUFDaEMsT0FBWTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQXlCLENBQUM7WUFDM0MsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO1lBQzlCLE1BQU0sRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztTQUNuQyxDQUFDO0lBQ04sQ0FBQztJQUVELFNBQVMsVUFBVSxDQUFDLEtBQXNCO1FBQ3RDLE9BQWU7WUFDWCxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7WUFDbEIsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNyQyxXQUFXLEVBQUUsSUFBSTtZQUNqQixZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO1lBQzVFLFNBQVMsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQW1DLENBQUM7WUFDL0QsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztZQUNoQyxLQUFLLEVBQUUsS0FBSztTQUNmLENBQUM7SUFDTixDQUFDO0lBRUQsU0FBUyxTQUFTLENBQUMsS0FBcUI7UUFDcEMsT0FBYztZQUNWLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRztZQUNkLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNoQixNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07WUFDcEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7WUFDOUIsR0FBRyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBNkIsQ0FBQztZQUNuRCxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07U0FDdkIsQ0FBQztJQUNOLENBQUM7SUFFRCxTQUFTLFFBQVEsQ0FBQyxDQUFRO1FBQ3RCLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNuQixNQUFNLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUM7UUFDaEMsTUFBTSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDcEIsTUFBTSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2xELElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzdCLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1lBQ25DLE9BQU87U0FDVjtRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0UsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RSxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV4QyxJQUFJLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxTQUFTLElBQUk7UUFDVCxRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztRQUN2QixNQUFNLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUN0QixXQUFXLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDdkMsb0JBQW9CLEVBQUUsQ0FBQztRQUN2QixNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNyQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUMsYUFBYSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7UUFFdkMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFO1lBQ25ELE1BQU0sQ0FBQyxZQUFZLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDNUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztTQUM1QztRQUVELElBQUksRUFBRSxDQUFDO1FBQ1AsVUFBVSxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELFNBQVMsTUFBTTtRQUNYLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLFFBQVEsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBRXhCLE1BQU0sR0FBVztZQUNiLE9BQU8sRUFBRSxJQUFJLEtBQUssRUFBUztZQUMzQixXQUFXLEVBQUUsSUFBSTtZQUNqQixZQUFZLEVBQUUsSUFBSTtZQUNsQixTQUFTLEVBQUUsU0FBUyxDQUFDLE1BQU07WUFDM0IsSUFBSSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDekIsS0FBSyxFQUFFLEtBQUs7U0FDZixDQUFDO1FBRUYsSUFBSSxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsU0FBUyxvQkFBb0I7UUFDekIsR0FBRyxDQUFDLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDNUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDMUMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUUvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtZQUNyQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekIsTUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQXFCLENBQUM7WUFDaEYsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLENBQWtCLENBQUM7WUFDNUUsTUFBTSxDQUFDLFdBQVcsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLEtBQUssS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25ELE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFFbkMsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFO2dCQUNkLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQ2xDO1lBRUQsSUFBSSxLQUFLLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQyxNQUFNLEVBQUU7Z0JBQ2hDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTthQUM3QztpQkFBTTtnQkFDSCxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUE7YUFDM0M7U0FDSjtJQUNMLENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFDLEdBQWlCO1FBQzFDLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxHQUFHLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25ELFVBQVUsQ0FBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFDLEdBQWlCO1FBQzFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNyQixNQUFNLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUM3RSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sYUFBYSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFNUQsOENBQThDO1FBQzlDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3ZCLE9BQU87U0FDVjtRQUVELG9DQUFvQztRQUNwQyxJQUFJLE1BQU0sQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDLEVBQUU7WUFDakcsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7U0FDM0I7UUFFRCx1RkFBdUY7UUFDdkYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUN0RCxNQUFNLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDN0M7UUFFRCxNQUFNLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUN6QixTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUMsYUFBYSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7UUFDdkMsSUFBSSxFQUFFLENBQUM7UUFDUCxVQUFVLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQsU0FBUyxrQkFBa0I7UUFDdkIsTUFBTSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDMUIsVUFBVSxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELFNBQVMsa0JBQWtCLENBQUMsR0FBa0I7UUFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUU7WUFDdEIsT0FBTztTQUNWO1FBRUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7WUFDVixPQUFPO1NBQ1Y7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDeEcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3BCLE9BQU87U0FDVjtRQUVELCtCQUErQjtRQUMvQixNQUFNLGFBQWEsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM3RSxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXZELElBQUksR0FBRyxDQUFDLEdBQUcsS0FBSyxRQUFRLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDdkMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQztTQUM1QztRQUVELElBQUksR0FBRyxDQUFDLEdBQUcsS0FBSyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFO1lBQ3BDLGFBQWEsRUFBRSxDQUFDO1NBQ25CO1FBRUQsSUFBSSxHQUFHLENBQUMsR0FBRyxLQUFLLEtBQUssSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFO1lBQ25DLFlBQVksRUFBRSxDQUFDO1NBQ2xCO1FBRUQsTUFBTSxDQUFDLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDeEIsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0MsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFO2dCQUMxQyxNQUFNLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQztnQkFDN0IsWUFBWSxFQUFFLENBQUM7YUFDbEI7U0FDSjtRQUVELElBQUksR0FBRyxDQUFDLEdBQUcsS0FBSyxXQUFXLEVBQUU7WUFDekIsWUFBWSxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUM3RSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQzVDO1NBQ0o7UUFFRCxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDckIsVUFBVSxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDaEQsSUFBSSxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBQyxDQUFROztRQUMvQixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBcUIsQ0FBQztRQUN2QyxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFrQixDQUFDO1FBQzlELE1BQU0sZ0JBQWdCLEdBQUcsTUFBQSxFQUFFLGFBQUYsRUFBRSx1QkFBRixFQUFFLENBQUUsT0FBTywwQ0FBRSxVQUFVLENBQUM7UUFDakQsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQ25CLE9BQU87U0FDVjtRQUVELE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQztRQUM3QixVQUFVLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNoRCxJQUFJLEVBQUUsQ0FBQztRQUNQLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBQyxhQUFhLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsU0FBUyxjQUFjO1FBQ25CLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCxTQUFTLGFBQWE7UUFDbEIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDcEIsVUFBVSxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELFNBQVMsWUFBWTtRQUNqQixNQUFNLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNyQixVQUFVLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxDQUFRO1FBQzlCLE1BQU0sR0FBRyxHQUFHLENBQWUsQ0FBQztRQUM1QixTQUFTLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUVyQixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtZQUNYLE9BQU87U0FDVjtRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFO1lBQ3RCLE9BQU87U0FDVjtRQUVELE1BQU0sYUFBYSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzdFLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDNUIsT0FBTztTQUNWO1FBRUQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN0QyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUU7WUFDL0MsT0FBTztTQUNWO1FBRUQsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDdEYsT0FBTztTQUNWO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUU3QywwQkFBMEI7UUFDMUIsS0FBSyxNQUFNLEtBQUssSUFBSSxhQUFhLEVBQUU7WUFDL0IsS0FBSyxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNsRDtRQUVELGlCQUFpQjtRQUNqQixJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3JDLGNBQWMsRUFBRSxDQUFDO1NBQ3BCO1FBRUQsYUFBYSxFQUFFLENBQUM7UUFDaEIsVUFBVSxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDaEQsb0JBQW9CLEVBQUUsQ0FBQztRQUN2QixJQUFJLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxTQUFTLGFBQWE7UUFDbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUU7WUFDdEIsT0FBTztTQUNWO1FBRUQsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDMUYsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxFQUFFO1lBQ2xELE1BQU0sQ0FBQyxZQUFZLEdBQUcsY0FBYyxDQUFDO1lBQ3JDLFlBQVksRUFBRSxDQUFDO1lBQ2YsT0FBTztTQUNWO1FBRUQsTUFBTSxXQUFXLEdBQUcsZUFBZSxFQUFFLENBQUM7UUFDdEMsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNkLE1BQU0sQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1lBQzNCLE9BQU87U0FDVjtRQUVELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3JELElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDUixZQUFZLEVBQUUsQ0FBQztZQUNmLE9BQU87U0FDVjtRQUVELE1BQU0sQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQztRQUNoQyxNQUFNLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDakMsQ0FBQztJQUVELFNBQVMsWUFBWTtRQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRTtZQUN0QixPQUFPO1NBQ1Y7UUFFRCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUM5RixJQUFJLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLEVBQUU7WUFDaEQsTUFBTSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7WUFDbkMsWUFBWSxFQUFFLENBQUM7WUFDZixPQUFPO1NBQ1Y7UUFFRCxNQUFNLFdBQVcsR0FBRyxlQUFlLEVBQUUsQ0FBQztRQUN0QyxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ2QsTUFBTSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7WUFDM0IsT0FBTztTQUNWO1FBRUQsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDckQsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNSLFlBQVksRUFBRSxDQUFDO1lBQ2YsT0FBTztTQUNWO1FBRUQsTUFBTSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0csTUFBTSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxTQUFTLFlBQVk7UUFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUU7WUFDdEIsT0FBTztTQUNWO1FBRUQsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdkUsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN0QixNQUFNLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztTQUM5QjtRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDaEQsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzdDO0lBQ0wsQ0FBQztJQUVELFNBQVMsZUFBZTtRQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRTtZQUN0QixPQUFPO1NBQ1Y7UUFFRCxPQUFPLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3hHLENBQUM7QUFDTCxDQUFDO0FBRUQsU0FBUyxNQUFNLENBQUMsR0FBYTtJQUN6QixNQUFNLFVBQVUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDeEMsQ0FBQztBQUVELFNBQVMsSUFBSSxDQUFDLEdBQWM7SUFDeEIsSUFBSSxHQUFHLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRTtRQUN6QixPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUM7S0FDekI7SUFFRCxPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFDNUIsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLEdBQWEsRUFBRSxXQUF5QjtJQUM1RCxJQUFJLFdBQVcsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1FBQ3pCLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO1FBQ3BELE9BQU8sRUFBRSxDQUFDO0tBQ2I7SUFFRCw2QkFBNkI7SUFDN0IsS0FBSyxNQUFNLEVBQUUsSUFBSSxXQUFXLEVBQUU7UUFDMUIsRUFBRSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUM7S0FDN0M7SUFFRCxrREFBa0Q7SUFDbEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxLQUFLLEVBQVcsQ0FBQztJQUNyQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQy9CLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNwRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3RCLFNBQVM7U0FDWjtRQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDekI7SUFFRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ3RCLE9BQU8sRUFBRSxDQUFDO0tBQ2I7SUFFRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3RixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ2xCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUN6QixPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUFDO0lBRUgsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3JCLE9BQU8sT0FBTyxDQUFDO0FBQ25CLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLEdBQWEsRUFBRSxXQUF5QjtJQUMvRCxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUUvQixpREFBaUQ7SUFDakQsTUFBTSxPQUFPLEdBQUcsSUFBSSxLQUFLLEVBQVMsQ0FBQztJQUNuQyxPQUFPLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXJELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQ3pDLE1BQU0sRUFBRSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQixNQUFNLEtBQUssR0FBRyxjQUFjLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzFDLElBQUksS0FBSyxFQUFFO1lBQ1AsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUN2QjthQUFNO1lBQ0gsT0FBTyxFQUFFLENBQUM7U0FDYjtLQUNKO0lBRUQsT0FBTyxPQUFPLENBQUM7QUFDbkIsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLE9BQWdCO0lBQ2pDLHVEQUF1RDtJQUN2RCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwRCxNQUFNLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QyxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sRUFBRTtRQUN6QixLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQ3RDO0FBQ0wsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLE9BQWdCO0lBQy9CLDBCQUEwQjtJQUMxQixrQkFBa0I7SUFDbEIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakQsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakQsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNyRSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNqQixDQUFDO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxHQUFhLEVBQUUsRUFBYztJQUNwRCxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQztJQUM1QixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDeEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUVoQyxPQUFPO1FBQ0gsR0FBRyxFQUFFLENBQUM7UUFDTixJQUFJO1FBQ0osTUFBTTtRQUNOLEdBQUc7UUFDSCxHQUFHO1FBQ0gsTUFBTSxFQUFFLEtBQUs7S0FDaEIsQ0FBQztBQUNOLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxPQUFnQixFQUFFLEVBQWM7O0lBQ3BELE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDO0lBRTVCLHNEQUFzRDtJQUN0RCxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sRUFBRTtRQUN6QiwwQkFBMEI7UUFDMUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQzFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO2dCQUNwQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUMvQiw0QkFBNEI7b0JBQzVCLG1DQUFtQztvQkFDbkMsNkJBQTZCO29CQUM3Qix3Q0FBd0M7b0JBQ3hDLHdDQUF3QztvQkFDeEMsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDM0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDNUIsTUFBTSxHQUFHLEdBQUcsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDaEQsSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRTt3QkFDakQsdURBQXVEO3dCQUN2RCx5QkFBeUI7d0JBQ3pCLE1BQU0sR0FBRyxHQUFHLE1BQUEsTUFBQSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLG1DQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxtQ0FBSSxDQUFDLENBQUM7d0JBQ3RILE1BQU0sQ0FBQyxHQUFVOzRCQUNiLEdBQUc7NEJBQ0gsSUFBSTs0QkFDSixNQUFNOzRCQUNOLEdBQUc7NEJBQ0gsR0FBRzs0QkFDSCxNQUFNLEVBQUUsS0FBSzt5QkFDaEIsQ0FBQzt3QkFFRixPQUFPLENBQUMsQ0FBQztxQkFDWjtpQkFDSjthQUNKO1NBQ0o7S0FDSjtJQUVELHFCQUFxQjtJQUNyQixPQUFPO0FBQ1gsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsR0FBYztJQUN0QyxRQUFRLEdBQUcsRUFBRTtRQUNULEtBQUssU0FBUyxDQUFDLE1BQU07WUFDakIsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNCLE1BQU07UUFDVixLQUFLLFNBQVMsQ0FBQyxJQUFJO1lBQ2YsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNCLE1BQU07S0FDYjtJQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUN4QyxDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxPQUFnQixFQUFFLE1BQWMsRUFBRSxHQUFjLEVBQUUsR0FBYztJQUMxRixvQkFBb0I7SUFDcEIsU0FBUztJQUNULGdCQUFnQjtJQUNoQixZQUFZO0lBQ1osY0FBYztJQUNkLHlDQUF5QztJQUN6QyxzQkFBc0I7SUFDdEIsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLEVBQUU7UUFDekIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLEVBQUU7WUFDekUsT0FBTyxLQUFLLENBQUM7U0FDaEI7S0FDSjtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQWUsRUFBRSxFQUFVLEVBQUUsSUFBZSxFQUFFLElBQWUsRUFBRSxFQUFVLEVBQUUsSUFBZTtJQUNoSCxJQUFJLElBQUksS0FBSyxTQUFTLENBQUMsTUFBTSxJQUFJLElBQUksS0FBSyxTQUFTLENBQUMsTUFBTSxFQUFFO1FBQ3hELE9BQU8sNEJBQTRCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDM0Q7U0FBTSxJQUFJLElBQUksS0FBSyxTQUFTLENBQUMsSUFBSSxJQUFJLElBQUksS0FBSyxTQUFTLENBQUMsSUFBSSxFQUFFO1FBQzNELE9BQU8sd0JBQXdCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDdkQ7U0FBTSxJQUFJLElBQUksS0FBSyxTQUFTLENBQUMsTUFBTSxJQUFJLElBQUksS0FBSyxTQUFTLENBQUMsSUFBSSxFQUFFO1FBQzdELE9BQU8sMEJBQTBCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDekQ7SUFFRCxPQUFPLDBCQUEwQixDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQzFELENBQUM7QUFFRCxTQUFTLDRCQUE0QixDQUFDLElBQWUsRUFBRSxFQUFVLEVBQUUsSUFBZSxFQUFFLEVBQVU7SUFDMUYsa0NBQWtDO0lBQ2xDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDL0IsT0FBTyxJQUFJLENBQUM7S0FDZjtJQUVELGtDQUFrQztJQUNsQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDcEUsT0FBTyxJQUFJLENBQUM7S0FDZjtJQUVELE9BQU8sS0FBSyxDQUFDO0FBQ2pCLENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLElBQWUsRUFBRSxFQUFVLEVBQUUsSUFBZSxFQUFFLEVBQVU7SUFDdEYsa0NBQWtDO0lBQ2xDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDL0IsT0FBTyxJQUFJLENBQUM7S0FDZjtJQUVELGtDQUFrQztJQUNsQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDcEUsT0FBTyxJQUFJLENBQUM7S0FDZjtJQUVELE9BQU8sS0FBSyxDQUFDO0FBQ2pCLENBQUM7QUFFRCxTQUFTLDBCQUEwQixDQUFDLElBQWUsRUFBRSxFQUFVLEVBQUUsSUFBZSxFQUFFLEVBQVU7SUFDeEYsZ0NBQWdDO0lBQ2hDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDeEQsT0FBTyxJQUFJLENBQUM7S0FDZjtJQUVELGlDQUFpQztJQUNqQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3hELE9BQU8sSUFBSSxDQUFDO0tBQ2Y7SUFFRCxpRUFBaUU7SUFDakUsTUFBTSxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLElBQ0ksRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTTtXQUN2QyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLEVBQUU7UUFDL0MsT0FBTyxLQUFLLENBQUM7S0FDaEI7SUFFRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQztBQUVELFNBQVMsMEJBQTBCLENBQUMsSUFBZSxFQUFFLEVBQVUsRUFBRSxJQUFlLEVBQUUsRUFBVTtJQUN4RixPQUFPLDBCQUEwQixDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQzFELENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxhQUF3QixFQUFFLEdBQWMsRUFBRSxLQUFhO0lBQzVFLE1BQU0sQ0FBQyxHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2xDLE9BQU8sYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDdEQsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsWUFBdUIsRUFBRSxHQUFjLEVBQUUsS0FBYTtJQUM1RSwyRUFBMkU7SUFDM0UsTUFBTSxDQUFDLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbEMsT0FBTyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUNyRCxDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsTUFBeUIsRUFBRSxHQUE2QixFQUFFLE1BQWM7SUFDeEYsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUM7SUFDckMsTUFBTSxVQUFVLEdBQUcsbUJBQW1CLENBQUM7SUFDdkMsR0FBRyxDQUFDLElBQUksR0FBRyxVQUFVLENBQUM7SUFDdEIsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUNwRCxHQUFHLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztJQUN0QixNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBRXBELGtCQUFrQjtJQUNsQixHQUFHLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQztJQUN4QixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO0lBQy9CLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkUsTUFBTSxXQUFXLEdBQUcsRUFBRSxHQUFHLFNBQVMsQ0FBQztJQUNuQyxNQUFNLFlBQVksR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDO0lBQ3BDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDO0lBQzNCLE1BQU0sQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDO0lBQzdCLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFFOUMseUJBQXlCO0lBQ3pCLEdBQUcsQ0FBQyxJQUFJLEdBQUcsaUJBQWlCLENBQUM7SUFDN0IsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLEVBQUU7UUFDekIsTUFBTSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRWxDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQ3BDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDO1lBQzNCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDO1lBRTNCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO1lBQ3hCLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDM0MsR0FBRyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7WUFFeEIsR0FBRyxDQUFDLElBQUksR0FBRyxpQkFBaUIsQ0FBQztZQUM3QixHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1NBQ2hEO0tBQ0o7SUFFRCxlQUFlO0lBQ2YsR0FBRyxDQUFDLElBQUksR0FBRyxtQkFBbUIsQ0FBQztJQUMvQixLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sRUFBRTtRQUN6QixjQUFjO1FBQ2QsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDO0tBQy9FO0lBRUQsdUJBQXVCO0lBQ3ZCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDekIsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDbEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1QsU0FBUztTQUNaO1FBRUQsTUFBTSxNQUFNLEdBQUcsd0JBQXdCLENBQUMsVUFBVSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUN4RyxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxDQUFDLElBQUksa0JBQWtCLEdBQUcsR0FBRyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxDQUFDLElBQUksa0JBQWtCLEdBQUcsR0FBRyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxDQUFDLElBQUksZ0JBQWdCLEdBQUcsR0FBRyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxDQUFDLElBQUksT0FBTyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUM7UUFDaEMsR0FBRyxDQUFDLElBQUksR0FBRyxZQUFZLENBQUM7UUFDeEIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDNUM7SUFFRCwwQkFBMEI7SUFDMUIsSUFBSSxNQUFNLENBQUMsV0FBVyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRTtRQUNyQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDWCxHQUFHLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQztRQUNsQixHQUFHLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztRQUN4QixHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLFNBQVMsRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3pHLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztLQUNqQjtJQUVELGNBQWM7SUFDZCxJQUFJLE1BQU0sQ0FBQyxZQUFZLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFO1FBQ3RDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVYLE1BQU0sWUFBWSxHQUFHLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNuRSxHQUFHLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQztRQUNsQixHQUFHLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN0QixHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUMsR0FBRyxTQUFTLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMvRixHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFWCw4QkFBOEI7UUFDOUIsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDL0csS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLEVBQUU7WUFDekIsR0FBRyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUNqRCxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyRCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsU0FBUyxDQUFDO1lBQzVDLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxTQUFTLENBQUM7WUFDOUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztTQUN2QztRQUVELEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztLQUNqQjtBQUNMLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxLQUFZO0lBQzVCLE9BQU8sS0FBSyxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BFLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxLQUFZO0lBQzdCLE9BQU8sS0FBSyxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xFLENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLEVBQWE7SUFDM0MsT0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQzNDLENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLEVBQWE7SUFDM0MsT0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ25DLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLE9BQWdCLEVBQUUsRUFBYTtJQUN0RCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUMxRCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxPQUFnQixFQUFFLEVBQWE7SUFDckQsT0FBTyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztBQUNyRCxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxLQUFZLEVBQUUsRUFBYTtJQUNuRCxPQUFPLEtBQUssQ0FBQyxHQUFHLEtBQUssU0FBUyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU07V0FDekgsS0FBSyxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQ25JLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxLQUFZLEVBQUUsSUFBZTtJQUM5QywwQkFBMEI7SUFDMUIsTUFBTSxDQUFDLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUMxQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEQsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDdEMsT0FBTyxLQUFLLENBQUM7U0FDaEI7S0FDSjtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLEdBQVc7SUFDbEMsSUFBSSxHQUFHLEtBQUssV0FBVyxFQUFFO1FBQ3JCLE9BQU8sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQy9CO1NBQU0sSUFBSSxHQUFHLEtBQUssV0FBVyxFQUFFO1FBQzVCLE9BQU8sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUM5QjtTQUFNLElBQUksR0FBRyxLQUFLLFlBQVksRUFBRTtRQUM3QixPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDOUI7U0FBTSxJQUFJLEdBQUcsS0FBSyxTQUFTLEVBQUU7UUFDMUIsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDL0I7SUFFRCxPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLE9BQWdCLEVBQUUsS0FBWTtJQUM3QyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RDLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNaLE9BQU87S0FDVjtJQUVELE1BQU0sS0FBSyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFDNUMsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDMUIsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLE9BQWdCLEVBQUUsS0FBWTtJQUM3QyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RDLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNaLE9BQU87S0FDVjtJQUVELElBQUksS0FBSyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3pCLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRTtRQUNYLEtBQUssR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztLQUM5QjtJQUVELE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzFCLENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIHJhbmQgZnJvbSBcIi4uL3NoYXJlZC9yYW5kLmpzXCJcclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvMmQuanNcIlxyXG5cclxuY29uc3QgU1RPUkFHRV9LRVkgPSBcImNyb3Nzd29yZF9zdG9yYWdlXCI7XHJcbmNvbnN0IENFTExfSU5URVJJT1JfU0laRSA9IDI0O1xyXG5jb25zdCBDRUxMX1BBRERJTkcgPSA0O1xyXG5jb25zdCBDRUxMX1NJWkUgPSBDRUxMX0lOVEVSSU9SX1NJWkUgKyBDRUxMX1BBRERJTkcgKiAyO1xyXG5jb25zdCBNQVhfR0VOUyA9IDEwMDAwO1xyXG5cclxuaW50ZXJmYWNlIEhpbnRBbnN3ZXIge1xyXG4gICAgaGludDogc3RyaW5nLFxyXG4gICAgYW5zd2VyOiBzdHJpbmcsXHJcbn1cclxuXHJcbmVudW0gRGlyZWN0aW9uIHtcclxuICAgIEFjcm9zcyxcclxuICAgIERvd24sXHJcbn1cclxuXHJcbmludGVyZmFjZSBFbnRyeSB7XHJcbiAgICBudW06IG51bWJlcixcclxuICAgIGhpbnQ6IHN0cmluZyxcclxuICAgIGFuc3dlcjogc3RyaW5nLFxyXG4gICAgcG9zOiBnZW8uUG9pbnQsXHJcbiAgICBkaXI6IERpcmVjdGlvbixcclxuICAgIHNvbHZlZDogYm9vbGVhbixcclxufVxyXG5cclxuaW50ZXJmYWNlIExldHRlck1hcFNhdmVTdGF0ZSB7XHJcbiAgICByb3dzOiBudW1iZXIsXHJcbiAgICBjb2xzOiBudW1iZXIsXHJcbiAgICBkYXRhOiBbbnVtYmVyLCBzdHJpbmddW10sXHJcbn1cclxuXHJcbmNsYXNzIExldHRlck1hcCB7XHJcbiAgICBwcml2YXRlIGRhdGE6IE1hcDxudW1iZXIsIHN0cmluZz47XHJcblxyXG4gICAgY29uc3RydWN0b3IocHVibGljIHJvd3M6IG51bWJlciwgcHVibGljIGNvbHM6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMuZGF0YSA9IG5ldyBNYXA8bnVtYmVyLCBzdHJpbmc+KCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0KHh5OiBnZW8uUG9pbnQpOiBzdHJpbmcge1xyXG4gICAgICAgIGNvbnN0IGlkID0gdGhpcy5mbGF0KHh5KTtcclxuICAgICAgICByZXR1cm4gdGhpcy5kYXRhLmdldChpZCkgPz8gXCJcIjtcclxuICAgIH1cclxuXHJcbiAgICBzZXQoeHk6IGdlby5Qb2ludCwgdmFsdWU6IHN0cmluZykge1xyXG4gICAgICAgIGNvbnN0IGlkID0gdGhpcy5mbGF0KHh5KTtcclxuXHJcbiAgICAgICAgaWYgKCF2YWx1ZSkge1xyXG4gICAgICAgICAgICB0aGlzLmRhdGEuZGVsZXRlKGlkKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kYXRhLnNldChpZCwgdmFsdWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGtleXMoKTogZ2VvLlBvaW50W10ge1xyXG4gICAgICAgIHJldHVybiBbLi4udGhpcy5kYXRhLmtleXMoKV0ubWFwKGsgPT4gdGhpcy5oaWVyKGspKTtcclxuICAgIH1cclxuXHJcbiAgICBzYXZlKCk6IExldHRlck1hcFNhdmVTdGF0ZSB7XHJcbiAgICAgICAgcmV0dXJuIDxMZXR0ZXJNYXBTYXZlU3RhdGU+e1xyXG4gICAgICAgICAgICByb3dzOiB0aGlzLnJvd3MsXHJcbiAgICAgICAgICAgIGNvbHM6IHRoaXMuY29scyxcclxuICAgICAgICAgICAgZGF0YTogWy4uLnRoaXMuZGF0YV0sXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZsYXQoeHk6IGdlby5Qb2ludCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHh5LnkgKiB0aGlzLmNvbHMgKyB4eS54XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoaWVyKG46IG51bWJlcik6IGdlby5Qb2ludCB7XHJcbiAgICAgICAgY29uc3QgeSA9IE1hdGguZmxvb3IobiAvIHRoaXMuY29scyk7XHJcbiAgICAgICAgY29uc3QgeCA9IG4gLSB5ICogdGhpcy5jb2xzO1xyXG4gICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KHgsIHkpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBsb2FkKHN0YXRlOiBMZXR0ZXJNYXBTYXZlU3RhdGUpOiBMZXR0ZXJNYXAge1xyXG4gICAgICAgIGNvbnN0IG1hcCA9IG5ldyBMZXR0ZXJNYXAoc3RhdGUucm93cywgc3RhdGUuY29scyk7XHJcbiAgICAgICAgZm9yIChjb25zdCBbaywgdl0gb2Ygc3RhdGUuZGF0YSkge1xyXG4gICAgICAgICAgICBtYXAuc2V0KG1hcC5oaWVyKGspLCB2KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtYXA7XHJcbiAgICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSBQdXp6bGUge1xyXG4gICAgdGl0bGU6IHN0cmluZyxcclxuICAgIGVudHJpZXM6IEVudHJ5W10sXHJcbiAgICBob3ZlckNvb3JkczogZ2VvLlBvaW50IHwgbnVsbCxcclxuICAgIGN1cnNvckNvb3JkczogZ2VvLlBvaW50IHwgbnVsbCxcclxuICAgIGN1cnNvckRpcjogRGlyZWN0aW9uLFxyXG4gICAgZ3JpZDogTGV0dGVyTWFwLFxyXG4gICAgcHJpbnQ6IGJvb2xlYW4sXHJcbn1cclxuXHJcbmVudW0gTW9kZSB7XHJcbiAgICBDcmVhdGUsXHJcbiAgICBQbGF5LFxyXG59XHJcblxyXG5pbnRlcmZhY2UgQXBwIHtcclxuICAgIG1vZGU6IE1vZGUsXHJcbiAgICBoaW50QW5zd2VyczogSGludEFuc3dlcltdLFxyXG4gICAgcHV6emxlOiBQdXp6bGUsXHJcbn1cclxuXHJcbmludGVyZmFjZSBBcHBTYXZlU3RhdGUge1xyXG4gICAgbW9kZTogc3RyaW5nLFxyXG4gICAgaGludEFuc3dlcnM6IEhpbnRBbnN3ZXJbXSxcclxuICAgIHB1enpsZTogUHV6emxlU2F2ZVN0YXRlLFxyXG59XHJcblxyXG5pbnRlcmZhY2UgUHV6emxlU2F2ZVN0YXRlIHtcclxuICAgIHRpdGxlOiBzdHJpbmcsXHJcbiAgICBlbnRyaWVzOiBFbnRyeVNhdmVTdGF0ZVtdLFxyXG4gICAgY3Vyc29yQ29vcmRzOiBbbnVtYmVyLCBudW1iZXJdIHwgbnVsbCxcclxuICAgIGN1cnNvckRpcjogc3RyaW5nLFxyXG4gICAgZ3JpZDogTGV0dGVyTWFwU2F2ZVN0YXRlLFxyXG59XHJcblxyXG5pbnRlcmZhY2UgRW50cnlTYXZlU3RhdGUge1xyXG4gICAgbnVtOiBudW1iZXIsXHJcbiAgICBoaW50OiBzdHJpbmcsXHJcbiAgICBhbnN3ZXI6IHN0cmluZyxcclxuICAgIHBvczogW251bWJlciwgbnVtYmVyXSxcclxuICAgIGRpcjogc3RyaW5nLFxyXG4gICAgc29sdmVkOiBib29sZWFuLFxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gbWFpbigpIHtcclxuICAgIGxldCBoaW50QW5zd2VycyA9IG5ldyBBcnJheTxIaW50QW5zd2VyPigpO1xyXG5cclxuICAgIGxldCBwdXp6bGUgPSA8UHV6emxlPntcclxuICAgICAgICB0aXRsZTogXCJcIixcclxuICAgICAgICBlbnRyaWVzOiBuZXcgQXJyYXk8RW50cnk+KCksXHJcbiAgICAgICAgaG92ZXJDb29yZHM6IG51bGwsXHJcbiAgICAgICAgY3Vyc29yQ29vcmRzOiBudWxsLFxyXG4gICAgICAgIGN1cnNvckRpcjogRGlyZWN0aW9uLkFjcm9zcyxcclxuICAgICAgICBncmlkOiBuZXcgTGV0dGVyTWFwKDAsIDApLFxyXG4gICAgICAgIHByaW50OiBmYWxzZSxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgY3JlYXRlVWkgPSBkb20uYnlJZChcImNyZWF0ZVVpXCIpIGFzIEhUTUxEaXZFbGVtZW50O1xyXG4gICAgY29uc3QgcGxheVVpID0gZG9tLmJ5SWQoXCJwbGF5VWlcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbiAgICBjb25zdCBwdXp6bGVUaXRsZSA9IGRvbS5ieUlkKFwicHV6emxlVGl0bGVcIikgYXMgSFRNTEhlYWRpbmdFbGVtZW50O1xyXG4gICAgY29uc3QgcHV6emxlQ2FudmFzID0gZG9tLmJ5SWQoXCJwdXp6bGVDYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XHJcbiAgICBjb25zdCBwdXp6bGVDb250ZXh0ID0gcHV6emxlQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKSBhcyBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ7XHJcbiAgICBpZiAoIXB1enpsZUNvbnRleHQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW52YXMgZWxlbWVudCBub3Qgc3VwcG9ydGVkXCIpXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdGl0bGVJbnB1dCA9IGRvbS5ieUlkKFwidGl0bGVcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGhpbnRBbnN3ZXJGb3JtID0gZG9tLmJ5SWQoXCJoaW50QW5zd2VyRm9ybVwiKSBhcyBIVE1MRm9ybUVsZW1lbnQ7XHJcbiAgICBjb25zdCBoaW50SW5wdXQgPSBkb20uYnlJZChcImhpbnRcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGFuc3dlcklucHV0ID0gZG9tLmJ5SWQoXCJhbnN3ZXJcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGhpbnRBbnN3ZXJUZW1wbGF0ZSA9IGRvbS5ieUlkKFwiaGludEFuc3dlclRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XHJcbiAgICBjb25zdCBoaW50QW5zd2VyVGFibGUgPSBkb20uYnlJZChcImhpbnRBbnN3ZXJzXCIpIGFzIEhUTUxUYWJsZUVsZW1lbnQ7XHJcbiAgICBjb25zdCBwdXp6bGVIaW50VGVtcGxhdGUgPSBkb20uYnlJZChcInB1enpsZUhpbnRUZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50O1xyXG4gICAgY29uc3QgcHV6emxlSGludEFjcm9zc0xpc3QgPSBkb20uYnlJZChcInB1enpsZUhpbnRzQWNyb3NzXCIpIGFzIEhUTUxPTGlzdEVsZW1lbnQ7XHJcbiAgICBjb25zdCBwdXp6bGVIaW50RG93bkxpc3QgPSBkb20uYnlJZChcInB1enpsZUhpbnRzRG93blwiKSBhcyBIVE1MT0xpc3RFbGVtZW50O1xyXG4gICAgY29uc3QgY3JlYXRlRm9ybSA9IGRvbS5ieUlkKFwiY3JlYXRlRm9ybVwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IGNsZWFyQnV0dG9uID0gZG9tLmJ5SWQoXCJjbGVhckJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IHJldHVyblRvQ3JlYXRlID0gZG9tLmJ5SWQoXCJyZXR1cm5Ub0NyZWF0ZVwiKSBhcyBIVE1MTGlua0VsZW1lbnQ7XHJcbiAgICBjb25zdCBwbGF5SW5wdXQgPSBkb20uYnlJZChcInBsYXlJbnB1dFwiKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgY29uc3Qgc2VlZCA9IHJhbmQueG11cjMobmV3IERhdGUoKS50b1N0cmluZygpKTtcclxuICAgIGNvbnN0IHJuZyA9IG5ldyByYW5kLlNGQzMyUk5HKHNlZWQoKSwgc2VlZCgpLCBzZWVkKCksIHNlZWQoKSk7XHJcbiAgICBoaW50QW5zd2VyRm9ybS5hZGRFdmVudExpc3RlbmVyKFwic3VibWl0XCIsIGFkZEhpbnRBbnN3ZXIpO1xyXG4gICAgY3JlYXRlRm9ybS5hZGRFdmVudExpc3RlbmVyKFwic3VibWl0XCIsIGdlbmVyYXRlKTtcclxuICAgIGNsZWFyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBjbGVhcik7XHJcbiAgICByZXR1cm5Ub0NyZWF0ZS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY3JlYXRlKTtcclxuICAgIHB1enpsZUNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcm1vdmVcIiwgb25QdXp6bGVQb2ludGVyTW92ZSk7XHJcbiAgICBwdXp6bGVDYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIG9uUHV6emxlUG9pbnRlckRvd24pO1xyXG4gICAgcHV6emxlQ2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVyb3V0XCIsIG9uUHV6emxlUG9pbnRlck91dCk7XHJcbiAgICBwbGF5SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgb25QbGF5SW5wdXRLZXlkb3duKTtcclxuICAgIHBsYXlJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgb25QbGF5SW5wdXRJbnB1dCk7XHJcblxyXG4gICAgZG9tLmRlbGVnYXRlKGhpbnRBbnN3ZXJUYWJsZSwgXCJjbGlja1wiLCBcIi5kZWxldGUtYnV0dG9uXCIsIGRlbGV0ZUhpbnRBbnN3ZXIpO1xyXG4gICAgZG9tLmRlbGVnYXRlKHB1enpsZUhpbnRBY3Jvc3NMaXN0LCBcImNsaWNrXCIsIFwiLnB1enpsZS1oaW50LWxpXCIsIG9uUHV6emxlSGludENsaWNrKTtcclxuICAgIGRvbS5kZWxlZ2F0ZShwdXp6bGVIaW50RG93bkxpc3QsIFwiY2xpY2tcIiwgXCIucHV6emxlLWhpbnQtbGlcIiwgb25QdXp6bGVIaW50Q2xpY2spO1xyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJiZWZvcmVwcmludFwiLCBvbkJlZm9yZVByaW50KTtcclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiYWZ0ZXJwcmludFwiLCBvbkFmdGVyUHJpbnQpO1xyXG5cclxuICAgIGxvYWQoKTtcclxuXHJcbiAgICBmdW5jdGlvbiBhZGRIaW50QW5zd2VyKGU6IEV2ZW50KSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICBjb25zdCBoaW50ID0gaGludElucHV0LnZhbHVlO1xyXG4gICAgICAgIGNvbnN0IGFuc3dlciA9IGFuc3dlcklucHV0LnZhbHVlO1xyXG4gICAgICAgIGlmICghaGludCB8fCAhYW5zd2VyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaGludEFuc3dlcnMucHVzaCh7IGhpbnQsIGFuc3dlciB9KTtcclxuICAgICAgICBzYXZlKCk7XHJcblxyXG4gICAgICAgIHVwZGF0ZUhpbnRBbnN3ZXJMaXN0KCk7XHJcblxyXG4gICAgICAgIGhpbnRJbnB1dC52YWx1ZSA9IFwiXCI7XHJcbiAgICAgICAgYW5zd2VySW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgICAgIGhpbnRJbnB1dC5mb2N1cygpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZUhpbnRBbnN3ZXJMaXN0KCkge1xyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbihoaW50QW5zd2VyVGFibGUpO1xyXG4gICAgICAgIGZvciAoY29uc3QgaGludEFuc3dlciBvZiBoaW50QW5zd2Vycykge1xyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IGhpbnRBbnN3ZXJUZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50O1xyXG4gICAgICAgICAgICBjb25zdCBoaW50U3BhbiA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5oaW50XCIpO1xyXG4gICAgICAgICAgICBjb25zdCBhbnN3ZXJTcGFuID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLmFuc3dlclwiKTtcclxuICAgICAgICAgICAgaGludFNwYW4udGV4dENvbnRlbnQgPSBoaW50QW5zd2VyLmhpbnQ7XHJcbiAgICAgICAgICAgIGFuc3dlclNwYW4udGV4dENvbnRlbnQgPSBoaW50QW5zd2VyLmFuc3dlcjtcclxuICAgICAgICAgICAgaGludEFuc3dlclRhYmxlLmFwcGVuZENoaWxkKGZyYWdtZW50KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2xlYXIoKSB7XHJcbiAgICAgICAgcHV6emxlLnRpdGxlID0gXCJcIjtcclxuICAgICAgICB0aXRsZUlucHV0LnRleHRDb250ZW50ID0gXCIoVW5rbm93bilcIjtcclxuICAgICAgICBoaW50QW5zd2VycyA9IFtdO1xyXG4gICAgICAgIHVwZGF0ZUhpbnRBbnN3ZXJMaXN0KCk7XHJcbiAgICAgICAgc2F2ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlbGV0ZUhpbnRBbnN3ZXIoZTogRXZlbnQpIHtcclxuICAgICAgICBjb25zdCB0YXJnZXQgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICBjb25zdCB0ciA9IHRhcmdldC5jbG9zZXN0KFwiLmhpbnQtYW5zd2VyLXRyXCIpIGFzIEhUTUxUYWJsZVJvd0VsZW1lbnQ7XHJcbiAgICAgICAgY29uc3QgcGFyZW50ID0gdHIucGFyZW50RWxlbWVudDtcclxuICAgICAgICBpZiAoIXBhcmVudCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBpbmRleCA9IEFycmF5LmZyb20ocGFyZW50LmNoaWxkcmVuKS5pbmRleE9mKHRyKTtcclxuICAgICAgICBoaW50QW5zd2Vycy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIHNhdmUoKTtcclxuICAgICAgICB1cGRhdGVIaW50QW5zd2VyTGlzdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGxvYWQoKSB7XHJcbiAgICAgICAgY29uc3QganNvbkRhdGEgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShTVE9SQUdFX0tFWSk7XHJcbiAgICAgICAgaWYgKCFqc29uRGF0YSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBhcHAgPSBsb2FkQXBwKEpTT04ucGFyc2UoanNvbkRhdGEpIGFzIEFwcFNhdmVTdGF0ZSk7XHJcbiAgICAgICAgaGludEFuc3dlcnMgPSBhcHAuaGludEFuc3dlcnM7XHJcbiAgICAgICAgcHV6emxlID0gYXBwLnB1enpsZTtcclxuICAgICAgICB0aXRsZUlucHV0LnZhbHVlID0gcHV6emxlLnRpdGxlID8/IFwiXCI7XHJcbiAgICAgICAgdXBkYXRlSGludEFuc3dlckxpc3QoKTtcclxuXHJcbiAgICAgICAgaWYgKGFwcC5tb2RlID09PSBNb2RlLkNyZWF0ZSkge1xyXG4gICAgICAgICAgICBjcmVhdGUoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBwbGF5KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNhdmUoKSB7XHJcbiAgICAgICAgY29uc3QgbW9kZSA9IHBsYXlVaS5oaWRkZW4gPyBNb2RlLkNyZWF0ZSA6IE1vZGUuUGxheTtcclxuICAgICAgICBjb25zdCBzdGF0ZSA9IHNhdmVBcHAoe1xyXG4gICAgICAgICAgICBoaW50QW5zd2VycyxcclxuICAgICAgICAgICAgbW9kZSxcclxuICAgICAgICAgICAgcHV6emxlLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBqc29uRGF0YSA9IEpTT04uc3RyaW5naWZ5KHN0YXRlKTtcclxuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShTVE9SQUdFX0tFWSwganNvbkRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNhdmVBcHAoYXBwOiBBcHApOiBBcHBTYXZlU3RhdGUge1xyXG4gICAgICAgIHJldHVybiA8QXBwU2F2ZVN0YXRlPntcclxuICAgICAgICAgICAgbW9kZTogTW9kZVthcHAubW9kZV0sXHJcbiAgICAgICAgICAgIGhpbnRBbnN3ZXJzOiBhcHAuaGludEFuc3dlcnMsXHJcbiAgICAgICAgICAgIHB1enpsZTogc2F2ZVB1enpsZShhcHAucHV6emxlKSxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNhdmVQdXp6bGUocHV6emxlOiBQdXp6bGUpOiBQdXp6bGVTYXZlU3RhdGUge1xyXG4gICAgICAgIHJldHVybiA8UHV6emxlU2F2ZVN0YXRlPntcclxuICAgICAgICAgICAgdGl0bGU6IHB1enpsZS50aXRsZSxcclxuICAgICAgICAgICAgZW50cmllczogcHV6emxlLmVudHJpZXMubWFwKHNhdmVFbnRyeSksXHJcbiAgICAgICAgICAgIGN1cnNvckNvb3JkczogcHV6emxlLmN1cnNvckNvb3Jkcz8uc2F2ZSgpLFxyXG4gICAgICAgICAgICBjdXJzb3JEaXI6IERpcmVjdGlvbltwdXp6bGUuY3Vyc29yRGlyXSxcclxuICAgICAgICAgICAgZ3JpZDogcHV6emxlLmdyaWQuc2F2ZSgpLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2F2ZUVudHJ5KGVudHJ5OiBFbnRyeSk6IEVudHJ5U2F2ZVN0YXRlIHtcclxuICAgICAgICByZXR1cm4gPEVudHJ5U2F2ZVN0YXRlPntcclxuICAgICAgICAgICAgbnVtOiBlbnRyeS5udW0sXHJcbiAgICAgICAgICAgIGhpbnQ6IGVudHJ5LmhpbnQsXHJcbiAgICAgICAgICAgIGFuc3dlcjogZW50cnkuYW5zd2VyLFxyXG4gICAgICAgICAgICBwb3M6IGVudHJ5LnBvcy5zYXZlKCksXHJcbiAgICAgICAgICAgIGRpcjogRGlyZWN0aW9uW2VudHJ5LmRpcl0sXHJcbiAgICAgICAgICAgIHNvbHZlZDogZW50cnkuc29sdmVkLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbG9hZEFwcChzdGF0ZTogQXBwU2F2ZVN0YXRlKTogQXBwIHtcclxuICAgICAgICByZXR1cm4gPEFwcD57XHJcbiAgICAgICAgICAgIG1vZGU6IE1vZGVbc3RhdGUubW9kZSBhcyBrZXlvZiB0eXBlb2YgTW9kZV0sXHJcbiAgICAgICAgICAgIGhpbnRBbnN3ZXJzOiBzdGF0ZS5oaW50QW5zd2VycyxcclxuICAgICAgICAgICAgcHV6emxlOiBsb2FkUHV6emxlKHN0YXRlLnB1enpsZSksXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBsb2FkUHV6emxlKHN0YXRlOiBQdXp6bGVTYXZlU3RhdGUpOiBQdXp6bGUge1xyXG4gICAgICAgIHJldHVybiA8UHV6emxlPntcclxuICAgICAgICAgICAgdGl0bGU6IHN0YXRlLnRpdGxlLFxyXG4gICAgICAgICAgICBlbnRyaWVzOiBzdGF0ZS5lbnRyaWVzLm1hcChsb2FkRW50cnkpLFxyXG4gICAgICAgICAgICBob3ZlckNvb3JkczogbnVsbCxcclxuICAgICAgICAgICAgY3Vyc29yQ29vcmRzOiBzdGF0ZS5jdXJzb3JDb29yZHMgPyBnZW8uUG9pbnQubG9hZChzdGF0ZS5jdXJzb3JDb29yZHMpIDogbnVsbCxcclxuICAgICAgICAgICAgY3Vyc29yRGlyOiBEaXJlY3Rpb25bc3RhdGUuY3Vyc29yRGlyIGFzIGtleW9mIHR5cGVvZiBEaXJlY3Rpb25dLFxyXG4gICAgICAgICAgICBncmlkOiBMZXR0ZXJNYXAubG9hZChzdGF0ZS5ncmlkKSxcclxuICAgICAgICAgICAgcHJpbnQ6IGZhbHNlLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbG9hZEVudHJ5KHN0YXRlOiBFbnRyeVNhdmVTdGF0ZSk6IEVudHJ5IHtcclxuICAgICAgICByZXR1cm4gPEVudHJ5PntcclxuICAgICAgICAgICAgbnVtOiBzdGF0ZS5udW0sXHJcbiAgICAgICAgICAgIGhpbnQ6IHN0YXRlLmhpbnQsXHJcbiAgICAgICAgICAgIGFuc3dlcjogc3RhdGUuYW5zd2VyLFxyXG4gICAgICAgICAgICBwb3M6IGdlby5Qb2ludC5sb2FkKHN0YXRlLnBvcyksXHJcbiAgICAgICAgICAgIGRpcjogRGlyZWN0aW9uW3N0YXRlLmRpciBhcyBrZXlvZiB0eXBlb2YgRGlyZWN0aW9uXSxcclxuICAgICAgICAgICAgc29sdmVkOiBzdGF0ZS5zb2x2ZWQsXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZShlOiBFdmVudCkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBwdXp6bGUudGl0bGUgPSB0aXRsZUlucHV0LnZhbHVlO1xyXG4gICAgICAgIHB1enpsZS5lbnRyaWVzID0gW107XHJcbiAgICAgICAgcHV6emxlLmVudHJpZXMgPSBnZW5lcmF0ZVB1enpsZShybmcsIGhpbnRBbnN3ZXJzKTtcclxuICAgICAgICBpZiAocHV6emxlLmVudHJpZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGFsZXJ0KFwiRmFpbGVkIHRvIGdlbmVyYXRlIHB1enpsZVwiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgcm93cyA9IE1hdGgubWF4KC4uLnB1enpsZS5lbnRyaWVzLm1hcCh4ID0+IHgucG9zLnggKyBlbnRyeVdpZHRoKHgpKSk7XHJcbiAgICAgICAgY29uc3QgY29scyA9IE1hdGgubWF4KC4uLnB1enpsZS5lbnRyaWVzLm1hcCh4ID0+IHgucG9zLnkgKyBlbnRyeUhlaWdodCh4KSkpO1xyXG4gICAgICAgIHB1enpsZS5ncmlkID0gbmV3IExldHRlck1hcChyb3dzLCBjb2xzKTtcclxuXHJcbiAgICAgICAgcGxheSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBsYXkoKSB7XHJcbiAgICAgICAgY3JlYXRlVWkuaGlkZGVuID0gdHJ1ZTtcclxuICAgICAgICBwbGF5VWkuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgcHV6emxlVGl0bGUudGV4dENvbnRlbnQgPSBwdXp6bGUudGl0bGU7XHJcbiAgICAgICAgdXBkYXRlUHV6emxlSGludExpc3QoKTtcclxuICAgICAgICB3aW5kb3cuc2Nyb2xsVG8oeyBsZWZ0OiAwLCB0b3A6IDAgfSk7XHJcbiAgICAgICAgcGxheUlucHV0LmZvY3VzKHtwcmV2ZW50U2Nyb2xsOiB0cnVlfSk7XHJcblxyXG4gICAgICAgIGlmIChwdXp6bGUuZW50cmllcy5sZW5ndGggPiAwICYmICFwdXp6bGUuY3Vyc29yQ29vcmRzKSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBwdXp6bGUuZW50cmllc1swXS5wb3M7XHJcbiAgICAgICAgICAgIHB1enpsZS5jdXJzb3JEaXIgPSBwdXp6bGUuZW50cmllc1swXS5kaXI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzYXZlKCk7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY3JlYXRlKCkge1xyXG4gICAgICAgIHBsYXlVaS5oaWRkZW4gPSB0cnVlO1xyXG4gICAgICAgIGNyZWF0ZVVpLmhpZGRlbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBwdXp6bGUgPSA8UHV6emxlPntcclxuICAgICAgICAgICAgZW50cmllczogbmV3IEFycmF5PEVudHJ5PigpLFxyXG4gICAgICAgICAgICBob3ZlckNvb3JkczogbnVsbCxcclxuICAgICAgICAgICAgY3Vyc29yQ29vcmRzOiBudWxsLFxyXG4gICAgICAgICAgICBjdXJzb3JEaXI6IERpcmVjdGlvbi5BY3Jvc3MsXHJcbiAgICAgICAgICAgIGdyaWQ6IG5ldyBMZXR0ZXJNYXAoMCwgMCksXHJcbiAgICAgICAgICAgIHByaW50OiBmYWxzZSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBzYXZlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlUHV6emxlSGludExpc3QoKSB7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHB1enpsZUhpbnRBY3Jvc3NMaXN0KTtcclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4ocHV6emxlSGludERvd25MaXN0KTtcclxuICAgICAgICBjb25zdCBlbnRyaWVzID0gcHV6emxlLmVudHJpZXM7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZW50cmllcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBlbnRyeSA9IGVudHJpZXNbaV07XHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gcHV6emxlSGludFRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnQ7XHJcbiAgICAgICAgICAgIGNvbnN0IGhpbnRMaSA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5wdXp6bGUtaGludC1saVwiKSBhcyBIVE1MTElFbGVtZW50O1xyXG4gICAgICAgICAgICBoaW50TGkudGV4dENvbnRlbnQgPSBgJHtlbnRyeS5udW19LiAke2VudHJ5LmhpbnR9YDtcclxuICAgICAgICAgICAgaGludExpLmRhdGFzZXQuZW50cnlJbmRleCA9IGAke2l9YDtcclxuXHJcbiAgICAgICAgICAgIGlmIChlbnRyeS5zb2x2ZWQpIHtcclxuICAgICAgICAgICAgICAgIGhpbnRMaS5jbGFzc0xpc3QuYWRkKFwic29sdmVkXCIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZW50cnkuZGlyID09PSBEaXJlY3Rpb24uQWNyb3NzKSB7XHJcbiAgICAgICAgICAgICAgICBwdXp6bGVIaW50QWNyb3NzTGlzdC5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHB1enpsZUhpbnREb3duTGlzdC5hcHBlbmRDaGlsZChmcmFnbWVudClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvblB1enpsZVBvaW50ZXJNb3ZlKGV2dDogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgY3h5ID0gbmV3IGdlby5Qb2ludChldnQub2Zmc2V0WCwgZXZ0Lm9mZnNldFkpO1xyXG4gICAgICAgIHB1enpsZS5ob3ZlckNvb3JkcyA9IGNhbnZhc0Nvb3Jkc1RvQ2VsbENvb3JkcyhjeHkpO1xyXG4gICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uUHV6emxlUG9pbnRlckRvd24oZXZ0OiBQb2ludGVyRXZlbnQpIHtcclxuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBjb25zdCB4eSA9IGNhbnZhc0Nvb3Jkc1RvQ2VsbENvb3JkcyhuZXcgZ2VvLlBvaW50KGV2dC5vZmZzZXRYLCBldnQub2Zmc2V0WSkpO1xyXG4gICAgICAgIGNvbnN0IHBkaXIgPSBwZXJwKHB1enpsZS5jdXJzb3JEaXIpO1xyXG4gICAgICAgIGNvbnN0IGVudHJpZXNBdENlbGwgPSBmaW5kRW50cmllc0F0Q2VsbChwdXp6bGUuZW50cmllcywgeHkpO1xyXG5cclxuICAgICAgICAvLyBubyBlbnRyaWVzIGF0IGNlbGwsIGNhbid0IHBsYWNlIGN1cnNvciBoZXJlXHJcbiAgICAgICAgaWYgKCFlbnRyaWVzQXRDZWxsLmxlbmd0aCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzd2l0Y2ggZGlyZWN0aW9ucyBpZiBhdCBzYW1lIGNlbGxcclxuICAgICAgICBpZiAocHV6emxlLmN1cnNvckNvb3JkcyAmJiB4eS5lcXVhbChwdXp6bGUuY3Vyc29yQ29vcmRzKSAmJiBlbnRyaWVzQXRDZWxsLnNvbWUoeCA9PiB4LmRpciA9PT0gcGRpcikpIHtcclxuICAgICAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IHBkaXI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpZiBjdXJyZW50IGN1cnNvciBkaXJlY3Rpb24gZG9lcyBub3QgYWxpZ24gd2l0aCBhIHdvcmQgYXQgdGhlIGNlbGwsIHN3aXRjaCBkaXJlY3Rpb25cclxuICAgICAgICBpZiAoIWVudHJpZXNBdENlbGwuc29tZSh4ID0+IHguZGlyID09PSBwdXp6bGUuY3Vyc29yRGlyKSkge1xyXG4gICAgICAgICAgICBwdXp6bGUuY3Vyc29yRGlyID0gcGVycChwdXp6bGUuY3Vyc29yRGlyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSB4eTtcclxuICAgICAgICBwbGF5SW5wdXQuZm9jdXMoe3ByZXZlbnRTY3JvbGw6IHRydWV9KTtcclxuICAgICAgICBzYXZlKCk7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QdXp6bGVQb2ludGVyT3V0KCkge1xyXG4gICAgICAgIHB1enpsZS5ob3ZlckNvb3JkcyA9IG51bGw7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QbGF5SW5wdXRLZXlkb3duKGV2dDogS2V5Ym9hcmRFdmVudCkge1xyXG4gICAgICAgIGlmICghcHV6emxlLmN1cnNvckNvb3Jkcykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIWV2dC5rZXkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qga2V5cyA9IG5ldyBTZXQoW1wiVGFiXCIsIFwiRGVsZXRlXCIsIFwiUmlnaHRBcnJvd1wiLCBcIlVwQXJyb3dcIiwgXCJMZWZ0QXJyb3dcIiwgXCJEb3duQXJyb3dcIiwgXCJCYWNrc3BhY2VcIl0pO1xyXG4gICAgICAgIGlmICgha2V5cy5oYXMoZXZ0LmtleSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gREVMRVRFIC0gZGVsZXRlIGN1cnJlbnQgY2hhclxyXG4gICAgICAgIGNvbnN0IGVudHJpZXNBdENlbGwgPSBmaW5kRW50cmllc0F0Q2VsbChwdXp6bGUuZW50cmllcywgcHV6emxlLmN1cnNvckNvb3Jkcyk7XHJcbiAgICAgICAgY29uc3Qgc29sdmVkQXRDZWxsID0gZW50cmllc0F0Q2VsbC5zb21lKHggPT4geC5zb2x2ZWQpO1xyXG5cclxuICAgICAgICBpZiAoZXZ0LmtleSA9PT0gXCJEZWxldGVcIiAmJiAhc29sdmVkQXRDZWxsKSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5ncmlkLnNldChwdXp6bGUuY3Vyc29yQ29vcmRzLCBcIlwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChldnQua2V5ID09PSBcIlRhYlwiICYmICFldnQuc2hpZnRLZXkpIHtcclxuICAgICAgICAgICAgYWR2YW5jZUN1cnNvcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGV2dC5rZXkgPT09IFwiVGFiXCIgJiYgZXZ0LnNoaWZ0S2V5KSB7XHJcbiAgICAgICAgICAgIGJhY2t1cEN1cnNvcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdiA9IGdldEFycm93S2V5VmVjdG9yKGV2dC5rZXkpO1xyXG4gICAgICAgIGlmICh2LnggIT09IDAgfHwgdi55ICE9PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvb3JkcyA9IHB1enpsZS5jdXJzb3JDb29yZHMuYWRkUG9pbnQodik7XHJcbiAgICAgICAgICAgIGlmIChhbnlFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBjb29yZHMpKSB7XHJcbiAgICAgICAgICAgICAgICBwdXp6bGUuY3Vyc29yQ29vcmRzID0gY29vcmRzO1xyXG4gICAgICAgICAgICAgICAgYWRqdXN0Q3Vyc29yKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChldnQua2V5ID09PSBcIkJhY2tzcGFjZVwiKSB7XHJcbiAgICAgICAgICAgIGJhY2t1cEN1cnNvcigpO1xyXG4gICAgICAgICAgICBpZiAoIWZpbmRFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBwdXp6bGUuY3Vyc29yQ29vcmRzKS5zb21lKHggPT4geC5zb2x2ZWQpKSB7XHJcbiAgICAgICAgICAgICAgICBwdXp6bGUuZ3JpZC5zZXQocHV6emxlLmN1cnNvckNvb3JkcywgXCJcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgICAgIHNhdmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvblB1enpsZUhpbnRDbGljayhlOiBFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIGNvbnN0IGxpID0gdGFyZ2V0LmNsb3Nlc3QoXCIucHV6emxlLWhpbnQtbGlcIikgYXMgSFRNTExJRWxlbWVudDtcclxuICAgICAgICBjb25zdCBlbnRyeUluZGV4U3RyaW5nID0gbGk/LmRhdGFzZXQ/LmVudHJ5SW5kZXg7XHJcbiAgICAgICAgaWYgKCFlbnRyeUluZGV4U3RyaW5nKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGVudHJ5SW5kZXggPSBwYXJzZUludChlbnRyeUluZGV4U3RyaW5nKTtcclxuICAgICAgICBjb25zdCBlbnRyeSA9IHB1enpsZS5lbnRyaWVzW2VudHJ5SW5kZXhdO1xyXG4gICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBlbnRyeS5wb3M7XHJcbiAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IGVudHJ5LmRpcjtcclxuICAgICAgICBkcmF3UHV6emxlKHB1enpsZUNhbnZhcywgcHV6emxlQ29udGV4dCwgcHV6emxlKTtcclxuICAgICAgICBzYXZlKCk7XHJcbiAgICAgICAgcGxheUlucHV0LmZvY3VzKHtwcmV2ZW50U2Nyb2xsOiB0cnVlfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QdXp6bGVTb2x2ZWQoKSB7XHJcbiAgICAgICAgYWxlcnQoXCJZT1UgU09MVkVEIFRIRSBQVVpaTEUhIEJSQVZPIVwiKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvbkJlZm9yZVByaW50KCkge1xyXG4gICAgICAgIHB1enpsZS5wcmludCA9IHRydWU7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25BZnRlclByaW50KCkge1xyXG4gICAgICAgIHB1enpsZS5wcmludCA9IGZhbHNlO1xyXG4gICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uUGxheUlucHV0SW5wdXQoZTogRXZlbnQpIHtcclxuICAgICAgICBjb25zdCBldnQgPSBlIGFzIElucHV0RXZlbnQ7XHJcbiAgICAgICAgcGxheUlucHV0LnZhbHVlID0gXCJcIjtcclxuXHJcbiAgICAgICAgaWYgKCFldnQuZGF0YSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXB1enpsZS5jdXJzb3JDb29yZHMpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZW50cmllc0F0Q2VsbCA9IGZpbmRFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBwdXp6bGUuY3Vyc29yQ29vcmRzKTtcclxuICAgICAgICBpZiAoZW50cmllc0F0Q2VsbC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbGV0dGVyID0gZXZ0LmRhdGEudG9VcHBlckNhc2UoKTtcclxuICAgICAgICBpZiAobGV0dGVyLmxlbmd0aCA+IDEgfHwgIShsZXR0ZXIubWF0Y2goL1tBLVpdLykpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlbnRyaWVzQXRDZWxsLnNvbWUoeCA9PiB4LnNvbHZlZCkgJiYgbGV0dGVyICE9PSBwdXp6bGUuZ3JpZC5nZXQocHV6emxlLmN1cnNvckNvb3JkcykpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHV6emxlLmdyaWQuc2V0KHB1enpsZS5jdXJzb3JDb29yZHMsIGxldHRlcik7XHJcblxyXG4gICAgICAgIC8vIGNoZWNrIGZvciBjb21wbGV0ZSB3b3JkXHJcbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzQXRDZWxsKSB7XHJcbiAgICAgICAgICAgIGVudHJ5LnNvbHZlZCA9IGVudHJ5U29sdmVkKGVudHJ5LCBwdXp6bGUuZ3JpZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjaGVjayBmb3IgZG9uZVxyXG4gICAgICAgIGlmIChwdXp6bGUuZW50cmllcy5ldmVyeShlID0+IGUuc29sdmVkKSkge1xyXG4gICAgICAgICAgICBvblB1enpsZVNvbHZlZCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWR2YW5jZUN1cnNvcigpO1xyXG4gICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgICAgIHVwZGF0ZVB1enpsZUhpbnRMaXN0KCk7XHJcbiAgICAgICAgc2F2ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkdmFuY2VDdXJzb3IoKSB7XHJcbiAgICAgICAgaWYgKCFwdXp6bGUuY3Vyc29yQ29vcmRzKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGFkdmFuY2VkQ3Vyc29yID0gcHV6emxlLmN1cnNvckNvb3Jkcy5hZGRQb2ludChnZXREaXJlY3Rpb25WZWN0b3IocHV6emxlLmN1cnNvckRpcikpO1xyXG4gICAgICAgIGlmIChhbnlFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBhZHZhbmNlZEN1cnNvcikpIHtcclxuICAgICAgICAgICAgcHV6emxlLmN1cnNvckNvb3JkcyA9IGFkdmFuY2VkQ3Vyc29yO1xyXG4gICAgICAgICAgICBhZGp1c3RDdXJzb3IoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY3Vyc29yRW50cnkgPSBmaW5kQ3Vyc29yRW50cnkoKTtcclxuICAgICAgICBpZiAoIWN1cnNvckVudHJ5KSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBudWxsO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlbnRyeSA9IG5leHRFbnRyeShwdXp6bGUuZW50cmllcywgY3Vyc29yRW50cnkpO1xyXG4gICAgICAgIGlmICghZW50cnkpIHtcclxuICAgICAgICAgICAgYWRqdXN0Q3Vyc29yKCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBlbnRyeS5wb3M7XHJcbiAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IGVudHJ5LmRpcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBiYWNrdXBDdXJzb3IoKSB7XHJcbiAgICAgICAgaWYgKCFwdXp6bGUuY3Vyc29yQ29vcmRzKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGJhY2tlZEN1cnNvciA9IHB1enpsZS5jdXJzb3JDb29yZHMuYWRkUG9pbnQoZ2V0RGlyZWN0aW9uVmVjdG9yKHB1enpsZS5jdXJzb3JEaXIpLm5lZygpKTtcclxuICAgICAgICBpZiAoYW55RW50cmllc0F0Q2VsbChwdXp6bGUuZW50cmllcywgYmFja2VkQ3Vyc29yKSkge1xyXG4gICAgICAgICAgICBwdXp6bGUuY3Vyc29yQ29vcmRzID0gYmFja2VkQ3Vyc29yO1xyXG4gICAgICAgICAgICBhZGp1c3RDdXJzb3IoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY3Vyc29yRW50cnkgPSBmaW5kQ3Vyc29yRW50cnkoKTtcclxuICAgICAgICBpZiAoIWN1cnNvckVudHJ5KSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBudWxsO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlbnRyeSA9IHByZXZFbnRyeShwdXp6bGUuZW50cmllcywgY3Vyc29yRW50cnkpO1xyXG4gICAgICAgIGlmICghZW50cnkpIHtcclxuICAgICAgICAgICAgYWRqdXN0Q3Vyc29yKCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBlbnRyeS5wb3MuYWRkUG9pbnQoZ2V0RGlyZWN0aW9uVmVjdG9yKGVudHJ5LmRpcikubXVsU2NhbGFyKGVudHJ5LmFuc3dlci5sZW5ndGggLSAxKSk7XHJcbiAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IGVudHJ5LmRpcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGp1c3RDdXJzb3IoKSB7XHJcbiAgICAgICAgaWYgKCFwdXp6bGUuY3Vyc29yQ29vcmRzKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBmaW5kRW50cmllc0F0Q2VsbChwdXp6bGUuZW50cmllcywgcHV6emxlLmN1cnNvckNvb3Jkcyk7XHJcbiAgICAgICAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFlbnRyaWVzLnNvbWUoZSA9PiBlLmRpciA9PT0gcHV6emxlLmN1cnNvckRpcikpIHtcclxuICAgICAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IHBlcnAocHV6emxlLmN1cnNvckRpcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbmRDdXJzb3JFbnRyeSgpOiBFbnRyeSB8IHVuZGVmaW5lZCB7XHJcbiAgICAgICAgaWYgKCFwdXp6bGUuY3Vyc29yQ29vcmRzKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmaW5kRW50cmllc0F0Q2VsbChwdXp6bGUuZW50cmllcywgcHV6emxlLmN1cnNvckNvb3JkcykuZmluZCh4ID0+IHguZGlyID09PSBwdXp6bGUuY3Vyc29yRGlyKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcm5kRGlyKHJuZzogcmFuZC5STkcpOiBEaXJlY3Rpb24ge1xyXG4gICAgY29uc3QgZGlyZWN0aW9ucyA9IFtEaXJlY3Rpb24uQWNyb3NzLCBEaXJlY3Rpb24uRG93bl07XHJcbiAgICByZXR1cm4gcmFuZC5jaG9vc2Uocm5nLCBkaXJlY3Rpb25zKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGVycChkaXI6IERpcmVjdGlvbik6IERpcmVjdGlvbiB7XHJcbiAgICBpZiAoZGlyID09IERpcmVjdGlvbi5BY3Jvc3MpIHtcclxuICAgICAgICByZXR1cm4gRGlyZWN0aW9uLkRvd247XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIERpcmVjdGlvbi5BY3Jvc3M7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlUHV6emxlKHJuZzogcmFuZC5STkcsIGhpbnRBbnN3ZXJzOiBIaW50QW5zd2VyW10pOiBFbnRyeVtdIHtcclxuICAgIGlmIChoaW50QW5zd2Vycy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgIGFsZXJ0KFwiUGxlYXNlIGVudGVyIGF0IGxlYXN0IG9uZSBoaW50IGFuZCBhbnN3ZXIhXCIpO1xyXG4gICAgICAgIHJldHVybiBbXTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBtYWtlIGFsbCBhbnN3ZXJzIGxvd2VyY2FzZVxyXG4gICAgZm9yIChjb25zdCBoYSBvZiBoaW50QW5zd2Vycykge1xyXG4gICAgICAgIGhhLmFuc3dlciA9IGhhLmFuc3dlci50b0xvY2FsZVVwcGVyQ2FzZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHJldHJ5IHVudGlsIHN1Y2Nlc3NmdWwgKHVwIHRvIGEgY2VydGFpbiBhbW91bnQpXHJcbiAgICBjb25zdCBwdXp6bGVzID0gbmV3IEFycmF5PEVudHJ5W10+KCk7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1BWF9HRU5TOyArK2kpIHtcclxuICAgICAgICBjb25zdCBlbnRyaWVzID0gdHJ5R2VuZXJhdGVQdXp6bGUocm5nLCBoaW50QW5zd2Vycyk7XHJcbiAgICAgICAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHV6emxlcy5wdXNoKGVudHJpZXMpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChwdXp6bGVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiBbXTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBlbnRyaWVzID0gcHV6emxlcy5yZWR1Y2UoKHByZXYsIGN1cikgPT4gY2FsY1Njb3JlKHByZXYpIDwgY2FsY1Njb3JlKGN1cikgPyBwcmV2IDogY3VyKTtcclxuICAgIGVudHJpZXMuc29ydCgoeCwgeSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGRuID0geC5udW0gLSB5Lm51bTtcclxuICAgICAgICByZXR1cm4gZG4gPT09IDAgPyB4LmRpciAtIHkuZGlyIDogZG47XHJcbiAgICB9KTtcclxuXHJcbiAgICBzaGlmdFB1enpsZShlbnRyaWVzKTtcclxuICAgIHJldHVybiBlbnRyaWVzO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0cnlHZW5lcmF0ZVB1enpsZShybmc6IHJhbmQuUk5HLCBoaW50QW5zd2VyczogSGludEFuc3dlcltdKTogRW50cnlbXSB7XHJcbiAgICByYW5kLnNodWZmbGUocm5nLCBoaW50QW5zd2Vycyk7XHJcblxyXG4gICAgLy8gcGxhY2UgbG9uZ2VzdCB3b3JkIGF0IDAsMCByYW5kb21seSBhY3Jvc3MvZG93blxyXG4gICAgY29uc3QgZW50cmllcyA9IG5ldyBBcnJheTxFbnRyeT4oKTtcclxuICAgIGVudHJpZXMucHVzaChwbGFjZUluaXRpYWxFbnRyeShybmcsIGhpbnRBbnN3ZXJzWzBdKSk7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBoaW50QW5zd2Vycy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGhhID0gaGludEFuc3dlcnNbaV07XHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBwbGFjZU5leHRFbnRyeShlbnRyaWVzLCBoYSk7XHJcbiAgICAgICAgaWYgKGVudHJ5KSB7XHJcbiAgICAgICAgICAgIGVudHJpZXMucHVzaChlbnRyeSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZW50cmllcztcclxufVxyXG5cclxuZnVuY3Rpb24gc2hpZnRQdXp6bGUoZW50cmllczogRW50cnlbXSkge1xyXG4gICAgLy8gc2hpZnQgdGhlIHB1enpsZSBzdWNoIHRoYXQgYWxsIHdvcmRzIHN0YXJ0ID49ICgwLCAwKVxyXG4gICAgY29uc3QgbWluWCA9IE1hdGgubWluKC4uLmVudHJpZXMubWFwKHggPT4geC5wb3MueCkpO1xyXG4gICAgY29uc3QgbWluWSA9IE1hdGgubWluKC4uLmVudHJpZXMubWFwKHggPT4geC5wb3MueSkpO1xyXG4gICAgY29uc3QgeHkgPSBuZXcgZ2VvLlBvaW50KC1taW5YLCAtbWluWSk7XHJcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICBlbnRyeS5wb3MgPSBlbnRyeS5wb3MuYWRkUG9pbnQoeHkpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjU2NvcmUoZW50cmllczogRW50cnlbXSk6IG51bWJlciB7XHJcbiAgICAvLyBjYWxjdWxhdGUgcHV6emxlIHNjb3JlLFxyXG4gICAgLy8gbG93ZXIgaXMgYmV0dGVyXHJcbiAgICBjb25zdCB4ID0gTWF0aC5taW4oLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy54KSk7XHJcbiAgICBjb25zdCB5ID0gTWF0aC5taW4oLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy55KSk7XHJcbiAgICBjb25zdCB3ID0gTWF0aC5tYXgoLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy54ICsgZW50cnlXaWR0aChlKSkpIC0geDtcclxuICAgIGNvbnN0IGggPSBNYXRoLm1heCguLi5lbnRyaWVzLm1hcChlID0+IGUucG9zLnkgKyBlbnRyeUhlaWdodChlKSkpIC0geTtcclxuICAgIHJldHVybiB3ICogaDtcclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VJbml0aWFsRW50cnkocm5nOiByYW5kLlJORywgaGE6IEhpbnRBbnN3ZXIpOiBFbnRyeSB7XHJcbiAgICBjb25zdCB7IGhpbnQsIGFuc3dlciB9ID0gaGE7XHJcbiAgICBjb25zdCBkaXIgPSBybmREaXIocm5nKTtcclxuICAgIGNvbnN0IHBvcyA9IG5ldyBnZW8uUG9pbnQoMCwgMCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBudW06IDEsXHJcbiAgICAgICAgaGludCxcclxuICAgICAgICBhbnN3ZXIsXHJcbiAgICAgICAgcG9zLFxyXG4gICAgICAgIGRpcixcclxuICAgICAgICBzb2x2ZWQ6IGZhbHNlLFxyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VOZXh0RW50cnkoZW50cmllczogRW50cnlbXSwgaGE6IEhpbnRBbnN3ZXIpOiBFbnRyeSB8IHVuZGVmaW5lZCB7XHJcbiAgICBjb25zdCB7IGhpbnQsIGFuc3dlciB9ID0gaGE7XHJcblxyXG4gICAgLy8gZmluZCBuZXh0IHBvc3NpYmxlIGludGVyc2VjdGlvbiB3aXRoIGV4aXN0aW5nIHdvcmRzXHJcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICAvLyBmaW5kIG5leHQgY29tbW9uIGxldHRlclxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZW50cnkuYW5zd2VyLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgYW5zd2VyLmxlbmd0aDsgKytqKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkuYW5zd2VyW2ldID09PSBhbnN3ZXJbal0pIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyB0cnkgcGxhY2luZyB0aGUgd29yZCBoZXJlXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaSA9IGluZGV4IGluIGFscmVhZHkgcGxhY2VkIHdvcmRcclxuICAgICAgICAgICAgICAgICAgICAvLyBqID0gaW5kZXggaW4gdW5wbGFjZWQgd29yZFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHdvcmQgaXMgdmVydGljYWwsIHBsYWNlIGhvcml6b250YWxcclxuICAgICAgICAgICAgICAgICAgICAvLyBpZiB3b3JkIGlzIGhvcml6b250YWwsIHBsYWNlIHZlcnRpY2FsXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tbW9uUG9zID0gZ2V0Q2hhclBvc2l0aW9uKGVudHJ5LnBvcywgZW50cnkuZGlyLCBpKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXIgPSBwZXJwKGVudHJ5LmRpcik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9zID0gZ2V0U3RhcnRQb3NpdGlvbihjb21tb25Qb3MsIGRpciwgaik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVmFsaWRXb3JkUGxhY2VtZW50KGVudHJpZXMsIGFuc3dlciwgcG9zLCBkaXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRvZXMgYW5vdGhlciBlbnRyeSBzdGFydCBoZXJlPyBpZiBzbywgc2hhcmUgaXQncyBudW1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCB1c2UgbWF4ICsgMVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBudW0gPSBlbnRyaWVzLmZpbHRlcih4ID0+IHgucG9zLmVxdWFsKHBvcykpLm1hcCh4ID0+IHgubnVtKVswXSA/PyBNYXRoLm1heCguLi5lbnRyaWVzLm1hcCh4ID0+IHgubnVtICsgMSkpID8/IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGU6IEVudHJ5ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGludCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuc3dlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvbHZlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gbm8gcGxhY2VtZW50IGZvdW5kXHJcbiAgICByZXR1cm47XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldERpcmVjdGlvblZlY3RvcihkaXI6IERpcmVjdGlvbik6IGdlby5Qb2ludCB7XHJcbiAgICBzd2l0Y2ggKGRpcikge1xyXG4gICAgICAgIGNhc2UgRGlyZWN0aW9uLkFjcm9zczpcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMSwgMCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgRGlyZWN0aW9uLkRvd246XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KDAsIDEpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxuXHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGRpcmVjdG9uXCIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkV29yZFBsYWNlbWVudChlbnRyaWVzOiBFbnRyeVtdLCBhbnN3ZXI6IHN0cmluZywgcG9zOiBnZW8uUG9pbnQsIGRpcjogRGlyZWN0aW9uKTogYm9vbGVhbiB7XHJcbiAgICAvLyBjaGVjayBmb3Igb3ZlcmxhcFxyXG4gICAgLy8gY2FzZXM6XHJcbiAgICAvLyBhY3Jvc3MvYWNyb3NzXHJcbiAgICAvLyBkb3duL2Rvd25cclxuICAgIC8vIGFjcm9zcy9kb3duXHJcbiAgICAvLyBkb3duL2Fjcm9zcyAoc3dhcCBhbmQgbWFrZSBzYW1lIGNhc2U/KVxyXG4gICAgLy8gYW55IG92ZXJsYXAgYXQgbm9uLVxyXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgaWYgKCFpc1ZhbGlkUGxhY2VtZW50KGVudHJ5LnBvcywgZW50cnkuYW5zd2VyLCBlbnRyeS5kaXIsIHBvcywgYW5zd2VyLCBkaXIpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmFsaWRQbGFjZW1lbnQocG9zMTogZ2VvLlBvaW50LCBhMTogc3RyaW5nLCBkaXIxOiBEaXJlY3Rpb24sIHBvczI6IGdlby5Qb2ludCwgYTI6IHN0cmluZywgZGlyMjogRGlyZWN0aW9uKTogYm9vbGVhbiB7XHJcbiAgICBpZiAoZGlyMSA9PT0gRGlyZWN0aW9uLkFjcm9zcyAmJiBkaXIyID09PSBEaXJlY3Rpb24uQWNyb3NzKSB7XHJcbiAgICAgICAgcmV0dXJuIGlzVmFsaWRQbGFjZW1lbnRBY3Jvc3NBY3Jvc3MocG9zMSwgYTEsIHBvczIsIGEyKTtcclxuICAgIH0gZWxzZSBpZiAoZGlyMSA9PT0gRGlyZWN0aW9uLkRvd24gJiYgZGlyMiA9PT0gRGlyZWN0aW9uLkRvd24pIHtcclxuICAgICAgICByZXR1cm4gaXNWYWxpZFBsYWNlbWVudERvd25Eb3duKHBvczEsIGExLCBwb3MyLCBhMik7XHJcbiAgICB9IGVsc2UgaWYgKGRpcjEgPT09IERpcmVjdGlvbi5BY3Jvc3MgJiYgZGlyMiA9PT0gRGlyZWN0aW9uLkRvd24pIHtcclxuICAgICAgICByZXR1cm4gaXNWYWxpZFBsYWNlbWVudEFjcm9zc0Rvd24ocG9zMSwgYTEsIHBvczIsIGEyKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gaXNWYWxpZFBsYWNlbWVudERvd25BY3Jvc3MocG9zMSwgYTEsIHBvczIsIGEyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFBsYWNlbWVudEFjcm9zc0Fjcm9zcyhwb3MxOiBnZW8uUG9pbnQsIGExOiBzdHJpbmcsIHBvczI6IGdlby5Qb2ludCwgYTI6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgLy8gaWYgeSBjb29yZHMgbm90IHRvdWNoaW5nLCB2YWxpZFxyXG4gICAgaWYgKE1hdGguYWJzKHBvczEueSAtIHBvczIueSkgPiAxKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gaWYgeCByYW5nZXMgbm90IHRvdWNoaW5nLCB2YWxpZFxyXG4gICAgaWYgKHBvczEueCArIGExLmxlbmd0aCArIDEgPCBwb3MxLnggfHwgcG9zMS54ID4gcG9zMi54ICsgYTIubGVuZ3RoICsgMSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFBsYWNlbWVudERvd25Eb3duKHBvczE6IGdlby5Qb2ludCwgYTE6IHN0cmluZywgcG9zMjogZ2VvLlBvaW50LCBhMjogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAvLyBpZiB5IGNvb3JkcyBub3QgdG91Y2hpbmcsIHZhbGlkXHJcbiAgICBpZiAoTWF0aC5hYnMocG9zMS54IC0gcG9zMi54KSA+IDEpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBpZiB4IHJhbmdlcyBub3QgdG91Y2hpbmcsIHZhbGlkXHJcbiAgICBpZiAocG9zMS55ICsgYTEubGVuZ3RoICsgMSA8IHBvczEueSB8fCBwb3MxLnkgPiBwb3MyLnkgKyBhMi5sZW5ndGggKyAxKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkUGxhY2VtZW50QWNyb3NzRG93bihwb3MxOiBnZW8uUG9pbnQsIGExOiBzdHJpbmcsIHBvczI6IGdlby5Qb2ludCwgYTI6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgLy8gaWYgbm8gb3ZlcmxhcCBvbiB4LWF4aXMgdmFsaWRcclxuICAgIGlmIChwb3MxLnggKyBhMS5sZW5ndGggPCBwb3MyLnggLSAxIHx8IHBvczEueCA+IHBvczIueCArIDEpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBpZiBubyBvdmVybGFwIG9uIHktYXhpcywgdmFsaWRcclxuICAgIGlmIChwb3MxLnkgPCBwb3MyLnkgLSAxIHx8IHBvczEueSA+IHBvczIueSArIGEyLmxlbmd0aCArIDEpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBpZiB0b3VjaGluZyAoaXggb3V0c2lkZSBvZiBlaXRoZXIgd29yZCwgbm90IGEgdmFsaWQgcGxhY2VtZW50KVxyXG4gICAgY29uc3QgaXggPSBuZXcgZ2VvLlBvaW50KHBvczIueCwgcG9zMS55KTtcclxuICAgIGlmIChcclxuICAgICAgICBpeC54IDwgcG9zMS54IHx8IGl4LnggPiBwb3MxLnggKyBhMS5sZW5ndGhcclxuICAgICAgICB8fCBpeC55IDwgcG9zMi55IHx8IGl4LnkgPiBwb3MyLnkgKyBhMi5sZW5ndGgpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGExW2l4LnggLSBwb3MxLnhdID09PSBhMltpeC55IC0gcG9zMi55XTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFBsYWNlbWVudERvd25BY3Jvc3MocG9zMTogZ2VvLlBvaW50LCBhMTogc3RyaW5nLCBwb3MyOiBnZW8uUG9pbnQsIGEyOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBpc1ZhbGlkUGxhY2VtZW50QWNyb3NzRG93bihwb3MyLCBhMiwgcG9zMSwgYTEpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDaGFyUG9zaXRpb24oc3RhcnRQb3NpdGlvbjogZ2VvLlBvaW50LCBkaXI6IERpcmVjdGlvbiwgaW5kZXg6IG51bWJlcik6IGdlby5Qb2ludCB7XHJcbiAgICBjb25zdCB2ID0gZ2V0RGlyZWN0aW9uVmVjdG9yKGRpcik7XHJcbiAgICByZXR1cm4gc3RhcnRQb3NpdGlvbi5hZGRQb2ludCh2Lm11bFNjYWxhcihpbmRleCkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTdGFydFBvc2l0aW9uKGNoYXJQb3NpdGlvbjogZ2VvLlBvaW50LCBkaXI6IERpcmVjdGlvbiwgaW5kZXg6IG51bWJlcik6IGdlby5Qb2ludCB7XHJcbiAgICAvLyBnZXQgdGhlIHN0YXJ0IHBvc2l0aW9uIG9mIGEgd29yZCBnaXZlbiB0aGUgcG9zaXRpb24gb2YgYSBzcGVjaWZpZWQgaW5kZXhcclxuICAgIGNvbnN0IHYgPSBnZXREaXJlY3Rpb25WZWN0b3IoZGlyKTtcclxuICAgIHJldHVybiBjaGFyUG9zaXRpb24uc3ViUG9pbnQodi5tdWxTY2FsYXIoaW5kZXgpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd1B1enpsZShjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50LCBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgcHV6emxlOiBQdXp6bGUpIHtcclxuICAgIGNvbnN0IGxldHRlckZvbnQgPSBcImJvbGQgMTZweCBhcmlhbFwiO1xyXG4gICAgY29uc3QgbnVtYmVyRm9udCA9IFwibm9ybWFsIDEwcHggYXJpYWxcIjtcclxuICAgIGN0eC5mb250ID0gbGV0dGVyRm9udDtcclxuICAgIGNvbnN0IGxldHRlclRleHRIZWlnaHQgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoO1xyXG4gICAgY3R4LmZvbnQgPSBudW1iZXJGb250O1xyXG4gICAgY29uc3QgbnVtYmVyVGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGg7XHJcblxyXG4gICAgLy8gZHJhdyBiYWNrZ3JvdW5kXHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiO1xyXG4gICAgY29uc3QgZW50cmllcyA9IHB1enpsZS5lbnRyaWVzO1xyXG4gICAgY29uc3QgcHcgPSBNYXRoLm1heCguLi5lbnRyaWVzLm1hcChlID0+IGUucG9zLnggKyBlbnRyeVdpZHRoKGUpKSk7XHJcbiAgICBjb25zdCBwaCA9IE1hdGgubWF4KC4uLmVudHJpZXMubWFwKGUgPT4gZS5wb3MueSArIGVudHJ5SGVpZ2h0KGUpKSk7XHJcbiAgICBjb25zdCBjYW52YXNXaWR0aCA9IHB3ICogQ0VMTF9TSVpFO1xyXG4gICAgY29uc3QgY2FudmFzSGVpZ2h0ID0gcGggKiBDRUxMX1NJWkU7XHJcbiAgICBjYW52YXMud2lkdGggPSBjYW52YXNXaWR0aDtcclxuICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXNIZWlnaHQ7XHJcbiAgICBjdHguZmlsbFJlY3QoMCwgMCwgY2FudmFzV2lkdGgsIGNhbnZhc0hlaWdodCk7XHJcblxyXG4gICAgLy8gZHJhdyBsZXR0ZXJzIGFuZCBjZWxsc1xyXG4gICAgY3R4LmZvbnQgPSBcImJvbGQgMThweCBhcmlhbFwiO1xyXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgY29uc3QgeyBwb3MsIGFuc3dlciwgZGlyIH0gPSBlbnRyeTtcclxuICAgICAgICBjb25zdCB2ID0gZ2V0RGlyZWN0aW9uVmVjdG9yKGRpcik7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYW5zd2VyLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHAgPSBwb3MuYWRkUG9pbnQodi5tdWxTY2FsYXIoaSkpO1xyXG4gICAgICAgICAgICBjb25zdCBjeCA9IHAueCAqIENFTExfU0laRTtcclxuICAgICAgICAgICAgY29uc3QgY3kgPSBwLnkgKiBDRUxMX1NJWkU7XHJcblxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJ3aGl0ZVwiO1xyXG4gICAgICAgICAgICBjdHguZmlsbFJlY3QoY3gsIGN5LCBDRUxMX1NJWkUsIENFTExfU0laRSk7XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImJsYWNrXCI7XHJcblxyXG4gICAgICAgICAgICBjdHguZm9udCA9IFwiYm9sZCAxOHB4IGFyaWFsXCI7XHJcbiAgICAgICAgICAgIGN0eC5zdHJva2VSZWN0KGN4LCBjeSwgQ0VMTF9TSVpFLCBDRUxMX1NJWkUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBkcmF3IG51bWJlcnNcclxuICAgIGN0eC5mb250ID0gXCJub3JtYWwgMTBweCBhcmlhbFwiO1xyXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgLy8gZHJhdyBudW1iZXJcclxuICAgICAgICBjb25zdCBjb29yZHMgPSBlbnRyeS5wb3MubXVsU2NhbGFyKENFTExfU0laRSk7XHJcbiAgICAgICAgY3R4LmZpbGxUZXh0KGAke2VudHJ5Lm51bX1gLCBjb29yZHMueCArIDIsIGNvb3Jkcy55ICsgMiArIG51bWJlclRleHRIZWlnaHQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgZW50ZXJlZCBsZXR0ZXJzXHJcbiAgICBjb25zdCBncmlkID0gcHV6emxlLmdyaWQ7XHJcbiAgICBmb3IgKGNvbnN0IGNlbGxDb29yZHMgb2YgZ3JpZC5rZXlzKCkpIHtcclxuICAgICAgICBjb25zdCBsZXR0ZXIgPSBncmlkLmdldChjZWxsQ29vcmRzKTtcclxuICAgICAgICBpZiAoIWxldHRlcikge1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvb3JkcyA9IGNlbGxDb29yZHNUb0NhbnZhc0Nvb3JkcyhjZWxsQ29vcmRzKS5hZGRQb2ludChuZXcgZ2VvLlBvaW50KENFTExfUEFERElORywgQ0VMTF9QQURESU5HKSk7XHJcbiAgICAgICAgY29uc3QgbWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dChsZXR0ZXIpO1xyXG4gICAgICAgIGNvb3Jkcy54ICs9IENFTExfSU5URVJJT1JfU0laRSAvIDIuMDtcclxuICAgICAgICBjb29yZHMueSArPSBDRUxMX0lOVEVSSU9SX1NJWkUgLyAyLjA7XHJcbiAgICAgICAgY29vcmRzLnkgKz0gbGV0dGVyVGV4dEhlaWdodCAvIDIuMDtcclxuICAgICAgICBjb29yZHMueCAtPSBtZXRyaWNzLndpZHRoIC8gMi4wO1xyXG4gICAgICAgIGN0eC5mb250ID0gXCIxNnB4IGFyaWFsXCI7XHJcbiAgICAgICAgY3R4LmZpbGxUZXh0KGxldHRlciwgY29vcmRzLngsIGNvb3Jkcy55KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBkcmF3IHJlZCB3aGVyZSBob3ZlcmluZ1xyXG4gICAgaWYgKHB1enpsZS5ob3ZlckNvb3JkcyAmJiAhcHV6emxlLnByaW50KSB7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMztcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJlZFwiO1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KHB1enpsZS5ob3ZlckNvb3Jkcy54ICogQ0VMTF9TSVpFLCBwdXp6bGUuaG92ZXJDb29yZHMueSAqIENFTExfU0laRSwgQ0VMTF9TSVpFLCBDRUxMX1NJWkUpO1xyXG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZHJhdyBjdXJzb3JcclxuICAgIGlmIChwdXp6bGUuY3Vyc29yQ29vcmRzICYmICFwdXp6bGUucHJpbnQpIHtcclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG5cclxuICAgICAgICBjb25zdCBjYW52YXNDb29yZHMgPSBjZWxsQ29vcmRzVG9DYW52YXNDb29yZHMocHV6emxlLmN1cnNvckNvb3Jkcyk7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDM7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmVkXCI7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5hcmMoY2FudmFzQ29vcmRzLnggKyBDRUxMX1NJWkUgLyAyLjAsIGNhbnZhc0Nvb3Jkcy55ICsgQ0VMTF9TSVpFIC8gMi4wLCAzLCAwLCBNYXRoLlBJICogMik7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuXHJcbiAgICAgICAgLy8gaGlnaGxpZ2h0IHdvcmQgdW5kZXIgY3Vyc29yXHJcbiAgICAgICAgY29uc3QgZW50cmllcyA9IGZpbmRFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBwdXp6bGUuY3Vyc29yQ29vcmRzKS5maWx0ZXIoeCA9PiB4LmRpciA9PT0gcHV6emxlLmN1cnNvckRpcik7XHJcbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGVudHJ5LnNvbHZlZCA/IFwiZ3JlZW5cIiA6IFwicmVkXCI7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgeCwgeSB9ID0gY2VsbENvb3Jkc1RvQ2FudmFzQ29vcmRzKGVudHJ5LnBvcyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gZW50cnlXaWR0aChlbnRyeSkgKiBDRUxMX1NJWkU7XHJcbiAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IGVudHJ5SGVpZ2h0KGVudHJ5KSAqIENFTExfU0laRTtcclxuICAgICAgICAgICAgY3R4LnN0cm9rZVJlY3QoeCwgeSwgd2lkdGgsIGhlaWdodCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjdHgucmVzdG9yZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBlbnRyeVdpZHRoKGVudHJ5OiBFbnRyeSk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gZW50cnkuZGlyID09PSBEaXJlY3Rpb24uQWNyb3NzID8gZW50cnkuYW5zd2VyLmxlbmd0aCA6IDE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVudHJ5SGVpZ2h0KGVudHJ5OiBFbnRyeSk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gZW50cnkuZGlyID09PSBEaXJlY3Rpb24uRG93biA/IGVudHJ5LmFuc3dlci5sZW5ndGggOiAxO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjYW52YXNDb29yZHNUb0NlbGxDb29yZHMoeHk6IGdlby5Qb2ludCk6IGdlby5Qb2ludCB7XHJcbiAgICByZXR1cm4geHkuZGl2U2NhbGFyKENFTExfU0laRSkuZmxvb3IoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2VsbENvb3Jkc1RvQ2FudmFzQ29vcmRzKHh5OiBnZW8uUG9pbnQpOiBnZW8uUG9pbnQge1xyXG4gICAgcmV0dXJuIHh5Lm11bFNjYWxhcihDRUxMX1NJWkUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kRW50cmllc0F0Q2VsbChlbnRyaWVzOiBFbnRyeVtdLCB4eTogZ2VvLlBvaW50KTogRW50cnlbXSB7XHJcbiAgICByZXR1cm4gZW50cmllcy5maWx0ZXIoeCA9PiBlbnRyeUNvbnRhaW5zUG9pbnQoeCwgeHkpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYW55RW50cmllc0F0Q2VsbChlbnRyaWVzOiBFbnRyeVtdLCB4eTogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gZmluZEVudHJpZXNBdENlbGwoZW50cmllcywgeHkpLmxlbmd0aCA+IDA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVudHJ5Q29udGFpbnNQb2ludChlbnRyeTogRW50cnksIHh5OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBlbnRyeS5kaXIgPT09IERpcmVjdGlvbi5BY3Jvc3MgJiYgeHkueSA9PT0gZW50cnkucG9zLnkgJiYgeHkueCA+PSBlbnRyeS5wb3MueCAmJiB4eS54IDwgZW50cnkucG9zLnggKyBlbnRyeS5hbnN3ZXIubGVuZ3RoXHJcbiAgICAgICAgfHwgZW50cnkuZGlyID09PSBEaXJlY3Rpb24uRG93biAmJiB4eS54ID09PSBlbnRyeS5wb3MueCAmJiB4eS55ID49IGVudHJ5LnBvcy55ICYmIHh5LnkgPCBlbnRyeS5wb3MueSArIGVudHJ5LmFuc3dlci5sZW5ndGg7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVudHJ5U29sdmVkKGVudHJ5OiBFbnRyeSwgZ3JpZDogTGV0dGVyTWFwKTogYm9vbGVhbiB7XHJcbiAgICAvLyBjaGVjayBmb3IgY29tcGxldGUgd29yZFxyXG4gICAgY29uc3QgdiA9IGdldERpcmVjdGlvblZlY3RvcihlbnRyeS5kaXIpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbnRyeS5hbnN3ZXIubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCBjb29yZHMgPSBlbnRyeS5wb3MuYWRkUG9pbnQodi5tdWxTY2FsYXIoaSkpO1xyXG4gICAgICAgIGlmIChlbnRyeS5hbnN3ZXJbaV0gIT09IGdyaWQuZ2V0KGNvb3JkcykpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0QXJyb3dLZXlWZWN0b3Ioa2V5OiBzdHJpbmcpOiBnZW8uUG9pbnQge1xyXG4gICAgaWYgKGtleSA9PT0gXCJBcnJvd0xlZnRcIikge1xyXG4gICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KC0xLCAwKTtcclxuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBcIkFycm93RG93blwiKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMCwgMSk7XHJcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gXCJBcnJvd1JpZ2h0XCIpIHtcclxuICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgxLCAwKTtcclxuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBcIkFycm93VXBcIikge1xyXG4gICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KDAsIC0xKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgwLCAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbmV4dEVudHJ5KGVudHJpZXM6IEVudHJ5W10sIGVudHJ5OiBFbnRyeSk6IEVudHJ5IHwgdW5kZWZpbmVkIHtcclxuICAgIGNvbnN0IG9mZnNldCA9IGVudHJpZXMuaW5kZXhPZihlbnRyeSk7XHJcbiAgICBpZiAob2Zmc2V0IDwgMCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBpbmRleCA9IChvZmZzZXQgKyAxKSAlIGVudHJpZXMubGVuZ3RoO1xyXG4gICAgcmV0dXJuIGVudHJpZXNbaW5kZXhdO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwcmV2RW50cnkoZW50cmllczogRW50cnlbXSwgZW50cnk6IEVudHJ5KTogRW50cnkgfCB1bmRlZmluZWQge1xyXG4gICAgY29uc3Qgb2Zmc2V0ID0gZW50cmllcy5pbmRleE9mKGVudHJ5KTtcclxuICAgIGlmIChvZmZzZXQgPCAwKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBpbmRleCA9IChvZmZzZXQgLSAxKTtcclxuICAgIGlmIChpbmRleCA8IDApIHtcclxuICAgICAgICBpbmRleCA9IGVudHJpZXMubGVuZ3RoIC0gMTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZW50cmllc1tpbmRleF07XHJcbn1cclxuXHJcbm1haW4oKSJdfQ==