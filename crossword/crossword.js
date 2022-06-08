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
    const seed = rand.xmur3(new Date().toString());
    const rng = new rand.SFC32RNG(seed(), seed(), seed(), seed());
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
        puzzleCanvas.focus();
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
        save();
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
    }
    function onPuzzlePointerOut() {
        puzzle.hoverCoords = null;
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
    }
    function onPuzzleKeydown(evt) {
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
            save();
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
                save();
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
        }
        else {
            const advancedCursor = puzzle.cursorCoords.addPoint(getDirectionVector(puzzle.cursorDir));
            if (findEntriesAtCell(puzzle.entries, advancedCursor).length > 0) {
                puzzle.cursorCoords = puzzle.cursorCoords.addPoint(getDirectionVector(puzzle.cursorDir));
            }
        }
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
        updatePuzzleHintList();
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
        puzzleCanvas.focus();
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
function getControlKeyVector(cursorDir, key, shift) {
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
    else if (key === "Backspace") {
        return new geo.Point(-1, 0);
    }
    else if (key === "Tab" && !shift) {
        return getDirectionVector(cursorDir);
    }
    else if (key === "Tab" && shift) {
        return getDirectionVector(cursorDir).neg();
    }
    else if (key === " ") {
        return getDirectionVector(cursorDir);
    }
    return new geo.Point(0, 0);
}
function nextUnsolvedEntry(entries, entry) {
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
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jvc3N3b3JkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3Jvc3N3b3JkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE1BQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFDO0FBQ3hDLE1BQU0sa0JBQWtCLEdBQUcsRUFBRSxDQUFDO0FBQzlCLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztBQUN2QixNQUFNLFNBQVMsR0FBRyxrQkFBa0IsR0FBRyxZQUFZLEdBQUcsQ0FBQyxDQUFDO0FBQ3hELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQztBQU92QixJQUFLLFNBR0o7QUFIRCxXQUFLLFNBQVM7SUFDViw2Q0FBTSxDQUFBO0lBQ04seUNBQUksQ0FBQTtBQUNSLENBQUMsRUFISSxTQUFTLEtBQVQsU0FBUyxRQUdiO0FBaUJELE1BQU0sU0FBUztJQUdYLFlBQW1CLElBQVksRUFBUyxJQUFZO1FBQWpDLFNBQUksR0FBSixJQUFJLENBQVE7UUFBUyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ2hELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7SUFDMUMsQ0FBQztJQUVELEdBQUcsQ0FBQyxFQUFhOztRQUNiLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDekIsT0FBTyxNQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxtQ0FBSSxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVELEdBQUcsQ0FBQyxFQUFhLEVBQUUsS0FBYTtRQUM1QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXpCLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDUixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNyQixPQUFPO1NBQ1Y7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVELElBQUk7UUFDQSxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxJQUFJO1FBQ0EsT0FBMkI7WUFDdkIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ3ZCLENBQUM7SUFDTixDQUFDO0lBRU8sSUFBSSxDQUFDLEVBQWE7UUFDdEIsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRU8sSUFBSSxDQUFDLENBQVM7UUFDbEIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUM1QixPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBeUI7UUFDakMsTUFBTSxHQUFHLEdBQUcsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEQsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUU7WUFDN0IsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzNCO1FBRUQsT0FBTyxHQUFHLENBQUM7SUFDZixDQUFDO0NBQ0o7QUFXRCxJQUFLLElBR0o7QUFIRCxXQUFLLElBQUk7SUFDTCxtQ0FBTSxDQUFBO0lBQ04sK0JBQUksQ0FBQTtBQUNSLENBQUMsRUFISSxJQUFJLEtBQUosSUFBSSxRQUdSO0FBK0JELFNBQVMsSUFBSTtJQUNULElBQUksV0FBVyxHQUFHLElBQUksS0FBSyxFQUFjLENBQUM7SUFFMUMsSUFBSSxNQUFNLEdBQVc7UUFDakIsT0FBTyxFQUFFLElBQUksS0FBSyxFQUFTO1FBQzNCLFdBQVcsRUFBRSxJQUFJO1FBQ2pCLFlBQVksRUFBRSxJQUFJO1FBQ2xCLFNBQVMsRUFBRSxTQUFTLENBQUMsTUFBTTtRQUMzQixJQUFJLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN6QixLQUFLLEVBQUUsS0FBSztLQUNmLENBQUM7SUFFRixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBbUIsQ0FBQztJQUN4RCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBbUIsQ0FBQztJQUNwRCxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBc0IsQ0FBQztJQUNuRSxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBNkIsQ0FBQztJQUNoRixJQUFJLENBQUMsYUFBYSxFQUFFO1FBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQTtLQUNsRDtJQUVELE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQW9CLENBQUM7SUFDckUsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQXFCLENBQUM7SUFDdkQsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQXFCLENBQUM7SUFDM0QsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUF3QixDQUFDO0lBQ2pGLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFxQixDQUFDO0lBQ25FLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBd0IsQ0FBQztJQUNqRixNQUFNLG9CQUFvQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQXFCLENBQUM7SUFDL0UsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFxQixDQUFDO0lBQzNFLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFzQixDQUFDO0lBQ25FLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFzQixDQUFDO0lBQ2pFLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQW9CLENBQUM7SUFDckUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDL0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDOUQsY0FBYyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUN6RCxZQUFZLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDekQsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM3QyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2pELFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUNsRSxZQUFZLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFDbEUsWUFBWSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2hFLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFFMUQsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDMUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUNsRixHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQ2hGLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDdEQsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztJQUVwRCxJQUFJLEVBQUUsQ0FBQztJQUVQLFNBQVMsYUFBYSxDQUFDLENBQVE7UUFDM0IsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRW5CLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUM7UUFDN0IsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQztRQUNqQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2xCLE9BQU07U0FDVDtRQUVELFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUNuQyxJQUFJLEVBQUUsQ0FBQztRQUVQLG9CQUFvQixFQUFFLENBQUM7UUFFdkIsU0FBUyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDckIsV0FBVyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDdkIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxTQUFTLG9CQUFvQjtRQUN6QixHQUFHLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDdEMsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUU7WUFDbEMsTUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQXFCLENBQUM7WUFDaEYsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbkQsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDdkQsUUFBUSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3ZDLFVBQVUsQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUMzQyxjQUFjLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3hDO0lBQ0wsQ0FBQztJQUVELFNBQVMsS0FBSztRQUNWLFdBQVcsR0FBRyxFQUFFLENBQUM7UUFDakIsb0JBQW9CLEVBQUUsQ0FBQztRQUN2QixJQUFJLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxTQUFTLGdCQUFnQixDQUFDLENBQVE7UUFDOUIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQXFCLENBQUM7UUFDdkMsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBa0IsQ0FBQztRQUM5RCxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDO1FBQ2hDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDVCxPQUFPO1NBQ1Y7UUFFRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdEQsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0IsSUFBSSxFQUFFLENBQUM7UUFDUCxvQkFBb0IsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFRCxTQUFTLElBQUk7UUFDVCxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDWCxPQUFPO1NBQ1Y7UUFFRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQWlCLENBQUMsQ0FBQztRQUMxRCxXQUFXLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQztRQUM5QixNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUNwQixvQkFBb0IsRUFBRSxDQUFDO1FBRXZCLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQzFCLE1BQU0sRUFBRSxDQUFDO1NBQ1o7YUFBTTtZQUNILElBQUksRUFBRSxDQUFDO1NBQ1Y7SUFDTCxDQUFDO0lBRUQsU0FBUyxJQUFJO1FBQ1QsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztRQUNyRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUM7WUFDbEIsV0FBVztZQUNYLElBQUk7WUFDSixNQUFNO1NBQ1QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxZQUFZLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQsU0FBUyxPQUFPLENBQUMsR0FBUTtRQUNyQixPQUFxQjtZQUNqQixJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDcEIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxXQUFXO1lBQzVCLE1BQU0sRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztTQUNqQyxDQUFDO0lBQ04sQ0FBQztJQUVELFNBQVMsVUFBVSxDQUFDLE1BQWM7O1FBQzlCLE9BQXdCO1lBQ3BCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDdEMsWUFBWSxFQUFFLE1BQUEsTUFBTSxDQUFDLFlBQVksMENBQUUsSUFBSSxFQUFFO1lBQ3pDLFNBQVMsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztZQUN0QyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7U0FDM0IsQ0FBQztJQUNOLENBQUM7SUFFRCxTQUFTLFNBQVMsQ0FBQyxLQUFZO1FBQzNCLE9BQXVCO1lBQ25CLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRztZQUNkLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNoQixNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07WUFDcEIsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO1lBQ3JCLEdBQUcsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztZQUN6QixNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07U0FDdkIsQ0FBQztJQUNOLENBQUM7SUFFRCxTQUFTLE9BQU8sQ0FBQyxLQUFtQjtRQUNoQyxPQUFZO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBeUIsQ0FBQztZQUMzQyxXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7WUFDOUIsTUFBTSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1NBQ25DLENBQUM7SUFDTixDQUFDO0lBRUQsU0FBUyxVQUFVLENBQUMsS0FBc0I7UUFDdEMsT0FBZTtZQUNYLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDckMsV0FBVyxFQUFFLElBQUk7WUFDakIsWUFBWSxFQUFFLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtZQUM1RSxTQUFTLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxTQUFtQyxDQUFDO1lBQy9ELElBQUksRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDaEMsS0FBSyxFQUFFLEtBQUs7U0FDZixDQUFDO0lBQ04sQ0FBQztJQUVELFNBQVMsU0FBUyxDQUFDLEtBQXFCO1FBQ3BDLE9BQWM7WUFDVixHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7WUFDZCxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDaEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO1lBQ3BCLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO1lBQzlCLEdBQUcsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQTZCLENBQUM7WUFDbkQsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO1NBQ3ZCLENBQUM7SUFDTixDQUFDO0lBRUQsU0FBUyxRQUFRO1FBQ2IsTUFBTSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDcEIsTUFBTSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2xELElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzdCLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1lBQ25DLE9BQU87U0FDVjtRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0UsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RSxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV4QyxJQUFJLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxTQUFTLElBQUk7UUFDVCxRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztRQUN2QixNQUFNLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUN0QixZQUFZLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUM7UUFDOUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUMsWUFBWSxDQUFDO1FBQ2hELG9CQUFvQixFQUFFLENBQUM7UUFDdkIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDckMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRXJCLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRTtZQUNuRCxNQUFNLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7U0FDNUM7UUFFRCxJQUFJLEVBQUUsQ0FBQztRQUNQLFVBQVUsQ0FBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRCxTQUFTLE1BQU07UUFDWCxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztRQUNyQixRQUFRLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUN4QixJQUFJLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxTQUFTLG9CQUFvQjtRQUN6QixHQUFHLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUM1QyxHQUFHLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMxQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO1FBRS9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQ3JDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QixNQUFNLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBcUIsQ0FBQztZQUNoRixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBa0IsQ0FBQztZQUM1RSxNQUFNLENBQUMsV0FBVyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsS0FBSyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbkQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUVuQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUU7Z0JBQ2QsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDbEM7WUFFRCxJQUFJLEtBQUssQ0FBQyxHQUFHLEtBQUssU0FBUyxDQUFDLE1BQU0sRUFBRTtnQkFDaEMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO2FBQzdDO2lCQUFNO2dCQUNILGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTthQUMzQztTQUNKO0lBQ0wsQ0FBQztJQUVELFNBQVMsbUJBQW1CLENBQUMsR0FBaUI7UUFDMUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLEdBQUcsd0JBQXdCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkQsVUFBVSxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELFNBQVMsbUJBQW1CLENBQUMsR0FBaUI7UUFDMUMsTUFBTSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDN0UsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwQyxNQUFNLGFBQWEsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRTVELDhDQUE4QztRQUM5QyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUN2QixPQUFPO1NBQ1Y7UUFFRCxvQ0FBb0M7UUFDcEMsSUFBSSxNQUFNLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxFQUFFO1lBQ2pHLE1BQU0sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1NBQzNCO1FBRUQsdUZBQXVGO1FBQ3ZGLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDdEQsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzdDO1FBRUQsTUFBTSxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUM7UUFDekIsSUFBSSxFQUFFLENBQUM7UUFDUCxVQUFVLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQsU0FBUyxrQkFBa0I7UUFDdkIsTUFBTSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDMUIsVUFBVSxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELFNBQVMsZUFBZSxDQUFDLEdBQWtCO1FBQ3ZDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFO1lBQ3RCLE9BQU87U0FDVjtRQUVELE1BQU0sYUFBYSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzdFLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDNUIsT0FBTztTQUNWO1FBRUQsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRTtZQUNWLE9BQU87U0FDVjtRQUVELDRCQUE0QjtRQUM1QixJQUFJLEdBQUcsQ0FBQyxHQUFHLEtBQUssUUFBUSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ3ZDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDekMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3JCLElBQUksRUFBRSxDQUFDO1lBQ1AsVUFBVSxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDaEQsT0FBTztTQUNWO1FBRUQsTUFBTSxDQUFDLEdBQUcsbUJBQW1CLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2RSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3hCLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9DLE1BQU0sZ0JBQWdCLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNuRSxNQUFNLGVBQWUsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFELEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUVyQixJQUFJLEdBQUcsQ0FBQyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFO2dCQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQzVDO1lBRUQsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUM3QixNQUFNLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQztnQkFDN0IsSUFBSSxHQUFHLENBQUMsR0FBRyxLQUFLLFdBQVcsSUFBSSxDQUFDLGVBQWUsRUFBRTtvQkFDN0MsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDNUM7Z0JBRUQsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsVUFBVSxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ2hELE9BQU87YUFDVjtTQUNKO1FBRUQsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDcEIsT0FBTztTQUNWO1FBRUQsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNsRCxPQUFPO1NBQ1Y7UUFFRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRXJDLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxNQUFNLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFO1lBQ3RGLE9BQU87U0FDVjtRQUdELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFN0MsMEJBQTBCO1FBQzFCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN0QixLQUFLLE1BQU0sS0FBSyxJQUFJLGFBQWEsRUFBRTtZQUMvQixNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxNQUFNLEVBQUU7Z0JBQ3pCLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO2dCQUNwQixTQUFTLEdBQUcsSUFBSSxDQUFDO2FBQ3BCO1NBQ0o7UUFFRCxpQkFBaUI7UUFDakIsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNyQyxjQUFjLEVBQUUsQ0FBQztTQUNwQjtRQUVELGlCQUFpQjtRQUNqQixJQUFJLFNBQVMsRUFBRTtZQUNYLE1BQU0sS0FBSyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEUsSUFBSSxLQUFLLEVBQUU7Z0JBQ1AsTUFBTSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDO2dCQUNoQyxNQUFNLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUM7YUFDaEM7U0FDSjthQUFNO1lBQ0gsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDMUYsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQzlELE1BQU0sQ0FBQyxZQUFZLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7YUFDNUY7U0FDSjtRQUVELFVBQVUsQ0FBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2hELG9CQUFvQixFQUFFLENBQUM7UUFDdkIsSUFBSSxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBQyxDQUFROztRQUMvQixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBcUIsQ0FBQztRQUN2QyxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFrQixDQUFDO1FBQzlELE1BQU0sZ0JBQWdCLEdBQUcsTUFBQSxFQUFFLGFBQUYsRUFBRSx1QkFBRixFQUFFLENBQUUsT0FBTywwQ0FBRSxVQUFVLENBQUM7UUFDakQsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQ25CLE9BQU87U0FDVjtRQUVELE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQztRQUM3QixVQUFVLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNoRCxJQUFJLEVBQUUsQ0FBQztRQUNQLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRUQsU0FBUyxjQUFjO1FBQ25CLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCxTQUFTLGFBQWE7UUFDbEIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDcEIsVUFBVSxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELFNBQVMsWUFBWTtRQUNqQixNQUFNLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNyQixVQUFVLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNwRCxDQUFDO0FBQ0wsQ0FBQztBQUVELFNBQVMsTUFBTSxDQUFDLEdBQWE7SUFDekIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0RCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFFRCxTQUFTLElBQUksQ0FBQyxHQUFjO0lBQ3hCLElBQUksR0FBRyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUU7UUFDekIsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDO0tBQ3pCO0lBRUQsT0FBTyxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQzVCLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxHQUFhLEVBQUUsV0FBeUI7SUFDNUQsSUFBSSxXQUFXLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtRQUN6QixLQUFLLENBQUMsNENBQTRDLENBQUMsQ0FBQztRQUNwRCxPQUFPLEVBQUUsQ0FBQztLQUNiO0lBRUQsNkJBQTZCO0lBQzdCLEtBQUssTUFBTSxFQUFFLElBQUksV0FBVyxFQUFFO1FBQzFCLEVBQUUsQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0tBQzdDO0lBRUQsa0RBQWtEO0lBQ2xELE1BQU0sT0FBTyxHQUFHLElBQUksS0FBSyxFQUFXLENBQUM7SUFDckMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRTtRQUMvQixNQUFNLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDcEQsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN0QixTQUFTO1NBQ1o7UUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ3pCO0lBRUQsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUN0QixPQUFPLEVBQUUsQ0FBQztLQUNiO0lBRUQsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDN0YsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNsQixNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFDekIsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUN6QyxDQUFDLENBQUMsQ0FBQztJQUVILFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyQixPQUFPLE9BQU8sQ0FBQztBQUNuQixDQUFDO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxHQUFhLEVBQUUsV0FBeUI7SUFDL0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFFL0IsaURBQWlEO0lBQ2pELE1BQU0sT0FBTyxHQUFHLElBQUksS0FBSyxFQUFTLENBQUM7SUFDbkMsT0FBTyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVyRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUN6QyxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUIsTUFBTSxLQUFLLEdBQUcsY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMxQyxJQUFJLEtBQUssRUFBRTtZQUNQLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDdkI7YUFBTTtZQUNILE9BQU8sRUFBRSxDQUFDO1NBQ2I7S0FDSjtJQUVELE9BQU8sT0FBTyxDQUFDO0FBQ25CLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxPQUFnQjtJQUNqQyx1REFBdUQ7SUFDdkQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEQsTUFBTSxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdkMsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLEVBQUU7UUFDekIsS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUN0QztBQUNMLENBQUM7QUFFRCxTQUFTLFNBQVMsQ0FBQyxPQUFnQjtJQUMvQiwwQkFBMEI7SUFDMUIsa0JBQWtCO0lBQ2xCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0RSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDakIsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsR0FBYSxFQUFFLEVBQWM7SUFDcEQsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUM7SUFFNUIsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3hCLGdDQUFnQztJQUNoQyxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRWhDLE9BQU87UUFDSCxHQUFHLEVBQUUsQ0FBQztRQUNOLElBQUk7UUFDSixNQUFNO1FBQ04sR0FBRztRQUNILEdBQUc7UUFDSCxNQUFNLEVBQUUsS0FBSztLQUNoQixDQUFDO0FBQ04sQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLE9BQWdCLEVBQUUsRUFBYzs7SUFDcEQsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUM7SUFFNUIsc0RBQXNEO0lBQ3RELEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxFQUFFO1FBQ3pCLDBCQUEwQjtRQUMxQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDMUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUU7Z0JBQ3BDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQy9CLDRCQUE0QjtvQkFDNUIsbUNBQW1DO29CQUNuQyw2QkFBNkI7b0JBQzdCLHdDQUF3QztvQkFDeEMsd0NBQXdDO29CQUN4QyxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUMzRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUM1QixNQUFNLEdBQUcsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNoRCxJQUFJLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFO3dCQUNqRCx1REFBdUQ7d0JBQ3ZELHlCQUF5Qjt3QkFDekIsTUFBTSxHQUFHLEdBQUcsTUFBQSxNQUFBLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsbUNBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLG1DQUFJLENBQUMsQ0FBQzt3QkFDdEgsTUFBTSxDQUFDLEdBQVU7NEJBQ2IsR0FBRzs0QkFDSCxJQUFJOzRCQUNKLE1BQU07NEJBQ04sR0FBRzs0QkFDSCxHQUFHOzRCQUNILE1BQU0sRUFBRSxLQUFLO3lCQUNoQixDQUFDO3dCQUVGLE9BQU8sQ0FBQyxDQUFDO3FCQUNaO2lCQUNKO2FBQ0o7U0FDSjtLQUNKO0lBRUQscUJBQXFCO0lBQ3JCLE9BQU87QUFDWCxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxHQUFjO0lBQ3RDLFFBQVEsR0FBRyxFQUFFO1FBQ1QsS0FBSyxTQUFTLENBQUMsTUFBTTtZQUNqQixPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDM0IsTUFBTTtRQUNWLEtBQUssU0FBUyxDQUFDLElBQUk7WUFDZixPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDM0IsTUFBTTtLQUNiO0lBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLE9BQWdCLEVBQUUsTUFBYyxFQUFFLEdBQWMsRUFBRSxHQUFjO0lBQzFGLG9CQUFvQjtJQUNwQixTQUFTO0lBQ1QsZ0JBQWdCO0lBQ2hCLFlBQVk7SUFDWixjQUFjO0lBQ2QseUNBQXlDO0lBQ3pDLHNCQUFzQjtJQUN0QixLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sRUFBRTtRQUN6QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRTtZQUN6RSxPQUFPLEtBQUssQ0FBQztTQUNoQjtLQUNKO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsSUFBZSxFQUFFLEVBQVUsRUFBRSxJQUFlLEVBQUUsSUFBZSxFQUFFLEVBQVUsRUFBRSxJQUFlO0lBQ2hILElBQUksSUFBSSxLQUFLLFNBQVMsQ0FBQyxNQUFNLElBQUksSUFBSSxLQUFLLFNBQVMsQ0FBQyxNQUFNLEVBQUU7UUFDeEQsT0FBTyw0QkFBNEIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztLQUMzRDtTQUFNLElBQUksSUFBSSxLQUFLLFNBQVMsQ0FBQyxJQUFJLElBQUksSUFBSSxLQUFLLFNBQVMsQ0FBQyxJQUFJLEVBQUU7UUFDM0QsT0FBTyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztLQUN2RDtTQUFNLElBQUksSUFBSSxLQUFLLFNBQVMsQ0FBQyxNQUFNLElBQUksSUFBSSxLQUFLLFNBQVMsQ0FBQyxJQUFJLEVBQUU7UUFDN0QsT0FBTywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztLQUN6RDtJQUVELE9BQU8sMEJBQTBCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDMUQsQ0FBQztBQUVELFNBQVMsNEJBQTRCLENBQUMsSUFBZSxFQUFFLEVBQVUsRUFBRSxJQUFlLEVBQUUsRUFBVTtJQUMxRixrQ0FBa0M7SUFDbEMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUMvQixPQUFPLElBQUksQ0FBQztLQUNmO0lBRUQsa0NBQWtDO0lBQ2xDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNwRSxPQUFPLElBQUksQ0FBQztLQUNmO0lBRUQsT0FBTyxLQUFLLENBQUM7QUFDakIsQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUMsSUFBZSxFQUFFLEVBQVUsRUFBRSxJQUFlLEVBQUUsRUFBVTtJQUN0RixrQ0FBa0M7SUFDbEMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUMvQixPQUFPLElBQUksQ0FBQztLQUNmO0lBRUQsa0NBQWtDO0lBQ2xDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNwRSxPQUFPLElBQUksQ0FBQztLQUNmO0lBRUQsT0FBTyxLQUFLLENBQUM7QUFDakIsQ0FBQztBQUVELFNBQVMsMEJBQTBCLENBQUMsSUFBZSxFQUFFLEVBQVUsRUFBRSxJQUFlLEVBQUUsRUFBVTtJQUN4RixnQ0FBZ0M7SUFDaEMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUN4RCxPQUFPLElBQUksQ0FBQztLQUNmO0lBRUQsaUNBQWlDO0lBQ2pDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDeEQsT0FBTyxJQUFJLENBQUM7S0FDZjtJQUVELGlFQUFpRTtJQUNqRSxNQUFNLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekMsSUFDSSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNO1dBQ3ZDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sRUFBRTtRQUMvQyxPQUFPLEtBQUssQ0FBQztLQUNoQjtJQUVELE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRCxDQUFDO0FBRUQsU0FBUywwQkFBMEIsQ0FBQyxJQUFlLEVBQUUsRUFBVSxFQUFFLElBQWUsRUFBRSxFQUFVO0lBQ3hGLE9BQU8sMEJBQTBCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDMUQsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLGFBQXdCLEVBQUUsR0FBYyxFQUFFLEtBQWE7SUFDNUUsTUFBTSxDQUFDLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbEMsT0FBTyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUN0RCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxZQUF1QixFQUFFLEdBQWMsRUFBRSxLQUFhO0lBQzVFLDJFQUEyRTtJQUMzRSxNQUFNLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNsQyxPQUFPLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxNQUF5QixFQUFFLEdBQTZCLEVBQUUsTUFBYztJQUN4RixNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQztJQUNyQyxNQUFNLFVBQVUsR0FBRyxtQkFBbUIsQ0FBQztJQUN2QyxHQUFHLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztJQUN0QixNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ3BELEdBQUcsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO0lBQ3RCLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFFcEQsa0JBQWtCO0lBQ2xCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO0lBQ3hCLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7SUFDL0IsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuRSxNQUFNLFdBQVcsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDO0lBQ25DLE1BQU0sWUFBWSxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUM7SUFDcEMsTUFBTSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUM7SUFDM0IsTUFBTSxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUM7SUFDN0IsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUU5Qyx5QkFBeUI7SUFDekIsR0FBRyxDQUFDLElBQUksR0FBRyxpQkFBaUIsQ0FBQztJQUM3QixLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sRUFBRTtRQUN6QixNQUFNLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFDbkMsTUFBTSxDQUFDLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFbEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDcEMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUM7WUFDM0IsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUM7WUFFM0IsR0FBRyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7WUFDeEIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMzQyxHQUFHLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQztZQUV4QixHQUFHLENBQUMsSUFBSSxHQUFHLGlCQUFpQixDQUFDO1lBQzdCLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7U0FDaEQ7S0FDSjtJQUVELGVBQWU7SUFDZixHQUFHLENBQUMsSUFBSSxHQUFHLG1CQUFtQixDQUFDO0lBQy9CLEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxFQUFFO1FBQ3pCLGNBQWM7UUFDZCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5QyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLENBQUM7S0FDL0U7SUFFRCx1QkFBdUI7SUFDdkIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztJQUN6QixLQUFLLE1BQU0sVUFBVSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNsQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDVCxTQUFTO1NBQ1o7UUFFRCxNQUFNLE1BQU0sR0FBRyx3QkFBd0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ3hHLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLENBQUMsSUFBSSxrQkFBa0IsR0FBRyxHQUFHLENBQUM7UUFDckMsTUFBTSxDQUFDLENBQUMsSUFBSSxrQkFBa0IsR0FBRyxHQUFHLENBQUM7UUFDckMsTUFBTSxDQUFDLENBQUMsSUFBSSxnQkFBZ0IsR0FBRyxHQUFHLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQztRQUNoQyxHQUFHLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQztRQUN4QixHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUM1QztJQUVELDBCQUEwQjtJQUMxQixJQUFJLE1BQU0sQ0FBQyxXQUFXLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFO1FBQ3JDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNYLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsU0FBUyxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekcsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO0tBQ2pCO0lBRUQsY0FBYztJQUNkLElBQUksTUFBTSxDQUFDLFlBQVksSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUU7UUFDdEMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRVgsTUFBTSxZQUFZLEdBQUcsd0JBQXdCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ25FLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoQixHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUcsU0FBUyxHQUFHLEdBQUcsRUFBRSxZQUFZLENBQUMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9GLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVYLDhCQUE4QjtRQUM5QixNQUFNLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvRyxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sRUFBRTtZQUN6QixHQUFHLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQ2pELE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsd0JBQXdCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3JELE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxTQUFTLENBQUM7WUFDNUMsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLFNBQVMsQ0FBQztZQUM5QyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3ZDO1FBRUQsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO0tBQ2pCO0FBQ0wsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLEtBQVk7SUFDNUIsT0FBTyxLQUFLLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEUsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLEtBQVk7SUFDN0IsT0FBTyxLQUFLLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEUsQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUMsRUFBYTtJQUMzQyxPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDM0MsQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUMsRUFBYTtJQUMzQyxPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDbkMsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsT0FBZ0IsRUFBRSxFQUFhO0lBQ3RELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzFELENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLE9BQWdCLEVBQUUsRUFBYTtJQUNyRCxPQUFPLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLEtBQVksRUFBRSxFQUFhO0lBQ25ELE9BQU8sS0FBSyxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTTtXQUN6SCxLQUFLLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDbkksQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLEtBQVksRUFBRSxJQUFlO0lBQzlDLDBCQUEwQjtJQUMxQixNQUFNLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDeEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQzFDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRCxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN0QyxPQUFPLEtBQUssQ0FBQztTQUNoQjtLQUNKO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsU0FBb0IsRUFBRSxHQUFXLEVBQUUsS0FBYztJQUMxRSxJQUFJLEdBQUcsS0FBSyxXQUFXLEVBQUU7UUFDckIsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDL0I7U0FBTSxJQUFJLEdBQUcsS0FBSyxXQUFXLEVBQUU7UUFDNUIsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQzlCO1NBQU0sSUFBSSxHQUFHLEtBQUssWUFBWSxFQUFFO1FBQzdCLE9BQU8sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUM5QjtTQUFNLElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRTtRQUMxQixPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMvQjtTQUFNLElBQUksR0FBRyxLQUFLLFdBQVcsRUFBRTtRQUM1QixPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUMvQjtTQUFNLElBQUksR0FBRyxLQUFLLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRTtRQUNoQyxPQUFPLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ3hDO1NBQU0sSUFBSSxHQUFHLEtBQUssS0FBSyxJQUFJLEtBQUssRUFBRTtRQUMvQixPQUFPLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0tBQzlDO1NBQU0sSUFBSSxHQUFHLEtBQUssR0FBRyxFQUFFO1FBQ3BCLE9BQU8sa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDeEM7SUFFRCxPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsT0FBZ0IsRUFBRSxLQUFZO0lBQ3JELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdEMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ1osT0FBTztLQUNWO0lBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUU7UUFDckMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUMxQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDZixPQUFPLEtBQUssQ0FBQztTQUNoQjtLQUNKO0FBQ0wsQ0FBQztBQUVELElBQUksRUFBRSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcblxyXG5jb25zdCBTVE9SQUdFX0tFWSA9IFwiY3Jvc3N3b3JkX3N0b3JhZ2VcIjtcclxuY29uc3QgQ0VMTF9JTlRFUklPUl9TSVpFID0gMjQ7XHJcbmNvbnN0IENFTExfUEFERElORyA9IDQ7XHJcbmNvbnN0IENFTExfU0laRSA9IENFTExfSU5URVJJT1JfU0laRSArIENFTExfUEFERElORyAqIDI7XHJcbmNvbnN0IE1BWF9HRU5TID0gMTAwMDA7XHJcblxyXG5pbnRlcmZhY2UgSGludEFuc3dlciB7XHJcbiAgICBoaW50OiBzdHJpbmcsXHJcbiAgICBhbnN3ZXI6IHN0cmluZyxcclxufVxyXG5cclxuZW51bSBEaXJlY3Rpb24ge1xyXG4gICAgQWNyb3NzLFxyXG4gICAgRG93bixcclxufVxyXG5cclxuaW50ZXJmYWNlIEVudHJ5IHtcclxuICAgIG51bTogbnVtYmVyLFxyXG4gICAgaGludDogc3RyaW5nLFxyXG4gICAgYW5zd2VyOiBzdHJpbmcsXHJcbiAgICBwb3M6IGdlby5Qb2ludCxcclxuICAgIGRpcjogRGlyZWN0aW9uLFxyXG4gICAgc29sdmVkOiBib29sZWFuLFxyXG59XHJcblxyXG5pbnRlcmZhY2UgTGV0dGVyTWFwU2F2ZVN0YXRlIHtcclxuICAgIHJvd3M6IG51bWJlcixcclxuICAgIGNvbHM6IG51bWJlcixcclxuICAgIGRhdGE6IFtudW1iZXIsIHN0cmluZ11bXSxcclxufVxyXG5cclxuY2xhc3MgTGV0dGVyTWFwIHtcclxuICAgIHByaXZhdGUgZGF0YTogTWFwPG51bWJlciwgc3RyaW5nPjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcm93czogbnVtYmVyLCBwdWJsaWMgY29sczogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5kYXRhID0gbmV3IE1hcDxudW1iZXIsIHN0cmluZz4oKTtcclxuICAgIH1cclxuXHJcbiAgICBnZXQoeHk6IGdlby5Qb2ludCk6IHN0cmluZyB7XHJcbiAgICAgICAgY29uc3QgaWQgPSB0aGlzLmZsYXQoeHkpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRhdGEuZ2V0KGlkKSA/PyBcIlwiO1xyXG4gICAgfVxyXG5cclxuICAgIHNldCh4eTogZ2VvLlBvaW50LCB2YWx1ZTogc3RyaW5nKSB7XHJcbiAgICAgICAgY29uc3QgaWQgPSB0aGlzLmZsYXQoeHkpO1xyXG5cclxuICAgICAgICBpZiAoIXZhbHVlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZGF0YS5kZWxldGUoaWQpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRhdGEuc2V0KGlkLCB2YWx1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAga2V5cygpOiBnZW8uUG9pbnRbXSB7XHJcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLmRhdGEua2V5cygpXS5tYXAoayA9PiB0aGlzLmhpZXIoaykpO1xyXG4gICAgfVxyXG5cclxuICAgIHNhdmUoKTogTGV0dGVyTWFwU2F2ZVN0YXRlIHtcclxuICAgICAgICByZXR1cm4gPExldHRlck1hcFNhdmVTdGF0ZT57XHJcbiAgICAgICAgICAgIHJvd3M6IHRoaXMucm93cyxcclxuICAgICAgICAgICAgY29sczogdGhpcy5jb2xzLFxyXG4gICAgICAgICAgICBkYXRhOiBbLi4udGhpcy5kYXRhXSxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZmxhdCh4eTogZ2VvLlBvaW50KTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4geHkueSAqIHRoaXMuY29scyArIHh5LnhcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhpZXIobjogbnVtYmVyKTogZ2VvLlBvaW50IHtcclxuICAgICAgICBjb25zdCB5ID0gTWF0aC5mbG9vcihuIC8gdGhpcy5jb2xzKTtcclxuICAgICAgICBjb25zdCB4ID0gbiAtIHkgKiB0aGlzLmNvbHM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoeCwgeSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGxvYWQoc3RhdGU6IExldHRlck1hcFNhdmVTdGF0ZSk6IExldHRlck1hcCB7XHJcbiAgICAgICAgY29uc3QgbWFwID0gbmV3IExldHRlck1hcChzdGF0ZS5yb3dzLCBzdGF0ZS5jb2xzKTtcclxuICAgICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBzdGF0ZS5kYXRhKSB7XHJcbiAgICAgICAgICAgIG1hcC5zZXQobWFwLmhpZXIoayksIHYpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1hcDtcclxuICAgIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIFB1enpsZSB7XHJcbiAgICBlbnRyaWVzOiBFbnRyeVtdLFxyXG4gICAgaG92ZXJDb29yZHM6IGdlby5Qb2ludCB8IG51bGwsXHJcbiAgICBjdXJzb3JDb29yZHM6IGdlby5Qb2ludCB8IG51bGwsXHJcbiAgICBjdXJzb3JEaXI6IERpcmVjdGlvbixcclxuICAgIGdyaWQ6IExldHRlck1hcCxcclxuICAgIHByaW50OiBib29sZWFuLFxyXG59XHJcblxyXG5lbnVtIE1vZGUge1xyXG4gICAgQ3JlYXRlLFxyXG4gICAgUGxheSxcclxufVxyXG5cclxuaW50ZXJmYWNlIEFwcCB7XHJcbiAgICBtb2RlOiBNb2RlLFxyXG4gICAgaGludEFuc3dlcnM6IEhpbnRBbnN3ZXJbXSxcclxuICAgIHB1enpsZTogUHV6emxlLFxyXG59XHJcblxyXG5pbnRlcmZhY2UgQXBwU2F2ZVN0YXRlIHtcclxuICAgIG1vZGU6IHN0cmluZyxcclxuICAgIGhpbnRBbnN3ZXJzOiBIaW50QW5zd2VyW10sXHJcbiAgICBwdXp6bGU6IFB1enpsZVNhdmVTdGF0ZSxcclxufVxyXG5cclxuaW50ZXJmYWNlIFB1enpsZVNhdmVTdGF0ZSB7XHJcbiAgICBlbnRyaWVzOiBFbnRyeVNhdmVTdGF0ZVtdLFxyXG4gICAgY3Vyc29yQ29vcmRzOiBbbnVtYmVyLCBudW1iZXJdIHwgbnVsbCxcclxuICAgIGN1cnNvckRpcjogc3RyaW5nLFxyXG4gICAgZ3JpZDogTGV0dGVyTWFwU2F2ZVN0YXRlLFxyXG59XHJcblxyXG5pbnRlcmZhY2UgRW50cnlTYXZlU3RhdGUge1xyXG4gICAgbnVtOiBudW1iZXIsXHJcbiAgICBoaW50OiBzdHJpbmcsXHJcbiAgICBhbnN3ZXI6IHN0cmluZyxcclxuICAgIHBvczogW251bWJlciwgbnVtYmVyXSxcclxuICAgIGRpcjogc3RyaW5nLFxyXG4gICAgc29sdmVkOiBib29sZWFuLFxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gbWFpbigpIHtcclxuICAgIGxldCBoaW50QW5zd2VycyA9IG5ldyBBcnJheTxIaW50QW5zd2VyPigpO1xyXG5cclxuICAgIGxldCBwdXp6bGUgPSA8UHV6emxlPntcclxuICAgICAgICBlbnRyaWVzOiBuZXcgQXJyYXk8RW50cnk+KCksXHJcbiAgICAgICAgaG92ZXJDb29yZHM6IG51bGwsXHJcbiAgICAgICAgY3Vyc29yQ29vcmRzOiBudWxsLFxyXG4gICAgICAgIGN1cnNvckRpcjogRGlyZWN0aW9uLkFjcm9zcyxcclxuICAgICAgICBncmlkOiBuZXcgTGV0dGVyTWFwKDAsIDApLFxyXG4gICAgICAgIHByaW50OiBmYWxzZSxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgY3JlYXRlVWkgPSBkb20uYnlJZChcImNyZWF0ZVVpXCIpIGFzIEhUTUxEaXZFbGVtZW50O1xyXG4gICAgY29uc3QgcGxheVVpID0gZG9tLmJ5SWQoXCJwbGF5VWlcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbiAgICBjb25zdCBwdXp6bGVDYW52YXMgPSBkb20uYnlJZChcInB1enpsZUNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudDtcclxuICAgIGNvbnN0IHB1enpsZUNvbnRleHQgPSBwdXp6bGVDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIGFzIENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRDtcclxuICAgIGlmICghcHV6emxlQ29udGV4dCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbnZhcyBlbGVtZW50IG5vdCBzdXBwb3J0ZWRcIilcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBoaW50QW5zd2VyRm9ybSA9IGRvbS5ieUlkKFwiaGludEFuc3dlckZvcm1cIikgYXMgSFRNTEZvcm1FbGVtZW50O1xyXG4gICAgY29uc3QgaGludElucHV0ID0gZG9tLmJ5SWQoXCJoaW50XCIpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCBhbnN3ZXJJbnB1dCA9IGRvbS5ieUlkKFwiYW5zd2VyXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCBoaW50QW5zd2VyVGVtcGxhdGUgPSBkb20uYnlJZChcImhpbnRBbnN3ZXJUZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50O1xyXG4gICAgY29uc3QgaGludEFuc3dlckxpc3QgPSBkb20uYnlJZChcImhpbnRBbnN3ZXJzXCIpIGFzIEhUTUxPTGlzdEVsZW1lbnQ7XHJcbiAgICBjb25zdCBwdXp6bGVIaW50VGVtcGxhdGUgPSBkb20uYnlJZChcInB1enpsZUhpbnRUZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50O1xyXG4gICAgY29uc3QgcHV6emxlSGludEFjcm9zc0xpc3QgPSBkb20uYnlJZChcInB1enpsZUhpbnRzQWNyb3NzXCIpIGFzIEhUTUxPTGlzdEVsZW1lbnQ7XHJcbiAgICBjb25zdCBwdXp6bGVIaW50RG93bkxpc3QgPSBkb20uYnlJZChcInB1enpsZUhpbnRzRG93blwiKSBhcyBIVE1MT0xpc3RFbGVtZW50O1xyXG4gICAgY29uc3QgY3JlYXRlQnV0dG9uID0gZG9tLmJ5SWQoXCJjcmVhdGVCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XHJcbiAgICBjb25zdCBjbGVhckJ1dHRvbiA9IGRvbS5ieUlkKFwiY2xlYXJCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XHJcbiAgICBjb25zdCByZXR1cm5Ub0NyZWF0ZSA9IGRvbS5ieUlkKFwicmV0dXJuVG9DcmVhdGVcIikgYXMgSFRNTExpbmtFbGVtZW50O1xyXG4gICAgY29uc3Qgc2VlZCA9IHJhbmQueG11cjMobmV3IERhdGUoKS50b1N0cmluZygpKTtcclxuICAgIGNvbnN0IHJuZyA9IG5ldyByYW5kLlNGQzMyUk5HKHNlZWQoKSwgc2VlZCgpLCBzZWVkKCksIHNlZWQoKSk7XHJcbiAgICBoaW50QW5zd2VyRm9ybS5hZGRFdmVudExpc3RlbmVyKFwic3VibWl0XCIsIGFkZEhpbnRBbnN3ZXIpO1xyXG4gICAgY3JlYXRlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiBnZW5lcmF0ZSgpKTtcclxuICAgIGNsZWFyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBjbGVhcik7XHJcbiAgICByZXR1cm5Ub0NyZWF0ZS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY3JlYXRlKTtcclxuICAgIHB1enpsZUNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcm1vdmVcIiwgb25QdXp6bGVQb2ludGVyTW92ZSk7XHJcbiAgICBwdXp6bGVDYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIG9uUHV6emxlUG9pbnRlckRvd24pO1xyXG4gICAgcHV6emxlQ2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVyb3V0XCIsIG9uUHV6emxlUG9pbnRlck91dCk7XHJcbiAgICBwdXp6bGVDYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgb25QdXp6bGVLZXlkb3duKTtcclxuXHJcbiAgICBkb20uZGVsZWdhdGUoaGludEFuc3dlckxpc3QsIFwiY2xpY2tcIiwgXCIuZGVsZXRlLWJ1dHRvblwiLCBkZWxldGVIaW50QW5zd2VyKTtcclxuICAgIGRvbS5kZWxlZ2F0ZShwdXp6bGVIaW50QWNyb3NzTGlzdCwgXCJjbGlja1wiLCBcIi5wdXp6bGUtaGludC1saVwiLCBvblB1enpsZUhpbnRDbGljayk7XHJcbiAgICBkb20uZGVsZWdhdGUocHV6emxlSGludERvd25MaXN0LCBcImNsaWNrXCIsIFwiLnB1enpsZS1oaW50LWxpXCIsIG9uUHV6emxlSGludENsaWNrKTtcclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiYmVmb3JlcHJpbnRcIiwgb25CZWZvcmVQcmludCk7XHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImFmdGVycHJpbnRcIiwgb25BZnRlclByaW50KTtcclxuXHJcbiAgICBsb2FkKCk7XHJcblxyXG4gICAgZnVuY3Rpb24gYWRkSGludEFuc3dlcihlOiBFdmVudCkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgY29uc3QgaGludCA9IGhpbnRJbnB1dC52YWx1ZTtcclxuICAgICAgICBjb25zdCBhbnN3ZXIgPSBhbnN3ZXJJbnB1dC52YWx1ZTtcclxuICAgICAgICBpZiAoIWhpbnQgfHwgIWFuc3dlcikge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGhpbnRBbnN3ZXJzLnB1c2goeyBoaW50LCBhbnN3ZXIgfSk7XHJcbiAgICAgICAgc2F2ZSgpO1xyXG5cclxuICAgICAgICB1cGRhdGVIaW50QW5zd2VyTGlzdCgpO1xyXG5cclxuICAgICAgICBoaW50SW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgICAgIGFuc3dlcklucHV0LnZhbHVlID0gXCJcIjtcclxuICAgICAgICBoaW50SW5wdXQuZm9jdXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVIaW50QW5zd2VyTGlzdCgpIHtcclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4oaGludEFuc3dlckxpc3QpO1xyXG4gICAgICAgIGZvciAoY29uc3QgaGludEFuc3dlciBvZiBoaW50QW5zd2Vycykge1xyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IGhpbnRBbnN3ZXJUZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50O1xyXG4gICAgICAgICAgICBjb25zdCBoaW50U3BhbiA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5oaW50XCIpO1xyXG4gICAgICAgICAgICBjb25zdCBhbnN3ZXJTcGFuID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLmFuc3dlclwiKTtcclxuICAgICAgICAgICAgaGludFNwYW4udGV4dENvbnRlbnQgPSBoaW50QW5zd2VyLmhpbnQ7XHJcbiAgICAgICAgICAgIGFuc3dlclNwYW4udGV4dENvbnRlbnQgPSBoaW50QW5zd2VyLmFuc3dlcjtcclxuICAgICAgICAgICAgaGludEFuc3dlckxpc3QuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjbGVhcigpIHtcclxuICAgICAgICBoaW50QW5zd2VycyA9IFtdO1xyXG4gICAgICAgIHVwZGF0ZUhpbnRBbnN3ZXJMaXN0KCk7XHJcbiAgICAgICAgc2F2ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlbGV0ZUhpbnRBbnN3ZXIoZTogRXZlbnQpIHtcclxuICAgICAgICBjb25zdCB0YXJnZXQgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICBjb25zdCBsaSA9IHRhcmdldC5jbG9zZXN0KFwiLmhpbnQtYW5zd2VyLWxpXCIpIGFzIEhUTUxMSUVsZW1lbnQ7XHJcbiAgICAgICAgY29uc3QgcGFyZW50ID0gbGkucGFyZW50RWxlbWVudDtcclxuICAgICAgICBpZiAoIXBhcmVudCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBpbmRleCA9IEFycmF5LmZyb20ocGFyZW50LmNoaWxkcmVuKS5pbmRleE9mKGxpKTtcclxuICAgICAgICBoaW50QW5zd2Vycy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIHNhdmUoKTtcclxuICAgICAgICB1cGRhdGVIaW50QW5zd2VyTGlzdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGxvYWQoKSB7XHJcbiAgICAgICAgY29uc3QganNvbkRhdGEgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShTVE9SQUdFX0tFWSk7XHJcbiAgICAgICAgaWYgKCFqc29uRGF0YSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBhcHAgPSBsb2FkQXBwKEpTT04ucGFyc2UoanNvbkRhdGEpIGFzIEFwcFNhdmVTdGF0ZSk7XHJcbiAgICAgICAgaGludEFuc3dlcnMgPSBhcHAuaGludEFuc3dlcnM7XHJcbiAgICAgICAgcHV6emxlID0gYXBwLnB1enpsZTtcclxuICAgICAgICB1cGRhdGVIaW50QW5zd2VyTGlzdCgpO1xyXG5cclxuICAgICAgICBpZiAoYXBwLm1vZGUgPT09IE1vZGUuQ3JlYXRlKSB7XHJcbiAgICAgICAgICAgIGNyZWF0ZSgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHBsYXkoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2F2ZSgpIHtcclxuICAgICAgICBjb25zdCBtb2RlID0gcGxheVVpLmhpZGRlbiA/IE1vZGUuQ3JlYXRlIDogTW9kZS5QbGF5O1xyXG4gICAgICAgIGNvbnN0IHN0YXRlID0gc2F2ZUFwcCh7XHJcbiAgICAgICAgICAgIGhpbnRBbnN3ZXJzLFxyXG4gICAgICAgICAgICBtb2RlLFxyXG4gICAgICAgICAgICBwdXp6bGUsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGpzb25EYXRhID0gSlNPTi5zdHJpbmdpZnkoc3RhdGUpO1xyXG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFNUT1JBR0VfS0VZLCBqc29uRGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2F2ZUFwcChhcHA6IEFwcCk6IEFwcFNhdmVTdGF0ZSB7XHJcbiAgICAgICAgcmV0dXJuIDxBcHBTYXZlU3RhdGU+e1xyXG4gICAgICAgICAgICBtb2RlOiBNb2RlW2FwcC5tb2RlXSxcclxuICAgICAgICAgICAgaGludEFuc3dlcnM6IGFwcC5oaW50QW5zd2VycyxcclxuICAgICAgICAgICAgcHV6emxlOiBzYXZlUHV6emxlKGFwcC5wdXp6bGUpLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2F2ZVB1enpsZShwdXp6bGU6IFB1enpsZSk6IFB1enpsZVNhdmVTdGF0ZSB7XHJcbiAgICAgICAgcmV0dXJuIDxQdXp6bGVTYXZlU3RhdGU+e1xyXG4gICAgICAgICAgICBlbnRyaWVzOiBwdXp6bGUuZW50cmllcy5tYXAoc2F2ZUVudHJ5KSxcclxuICAgICAgICAgICAgY3Vyc29yQ29vcmRzOiBwdXp6bGUuY3Vyc29yQ29vcmRzPy5zYXZlKCksXHJcbiAgICAgICAgICAgIGN1cnNvckRpcjogRGlyZWN0aW9uW3B1enpsZS5jdXJzb3JEaXJdLFxyXG4gICAgICAgICAgICBncmlkOiBwdXp6bGUuZ3JpZC5zYXZlKCksXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzYXZlRW50cnkoZW50cnk6IEVudHJ5KTogRW50cnlTYXZlU3RhdGUge1xyXG4gICAgICAgIHJldHVybiA8RW50cnlTYXZlU3RhdGU+e1xyXG4gICAgICAgICAgICBudW06IGVudHJ5Lm51bSxcclxuICAgICAgICAgICAgaGludDogZW50cnkuaGludCxcclxuICAgICAgICAgICAgYW5zd2VyOiBlbnRyeS5hbnN3ZXIsXHJcbiAgICAgICAgICAgIHBvczogZW50cnkucG9zLnNhdmUoKSxcclxuICAgICAgICAgICAgZGlyOiBEaXJlY3Rpb25bZW50cnkuZGlyXSxcclxuICAgICAgICAgICAgc29sdmVkOiBlbnRyeS5zb2x2ZWQsXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBsb2FkQXBwKHN0YXRlOiBBcHBTYXZlU3RhdGUpOiBBcHAge1xyXG4gICAgICAgIHJldHVybiA8QXBwPntcclxuICAgICAgICAgICAgbW9kZTogTW9kZVtzdGF0ZS5tb2RlIGFzIGtleW9mIHR5cGVvZiBNb2RlXSxcclxuICAgICAgICAgICAgaGludEFuc3dlcnM6IHN0YXRlLmhpbnRBbnN3ZXJzLFxyXG4gICAgICAgICAgICBwdXp6bGU6IGxvYWRQdXp6bGUoc3RhdGUucHV6emxlKSxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGxvYWRQdXp6bGUoc3RhdGU6IFB1enpsZVNhdmVTdGF0ZSk6IFB1enpsZSB7XHJcbiAgICAgICAgcmV0dXJuIDxQdXp6bGU+e1xyXG4gICAgICAgICAgICBlbnRyaWVzOiBzdGF0ZS5lbnRyaWVzLm1hcChsb2FkRW50cnkpLFxyXG4gICAgICAgICAgICBob3ZlckNvb3JkczogbnVsbCxcclxuICAgICAgICAgICAgY3Vyc29yQ29vcmRzOiBzdGF0ZS5jdXJzb3JDb29yZHMgPyBnZW8uUG9pbnQubG9hZChzdGF0ZS5jdXJzb3JDb29yZHMpIDogbnVsbCxcclxuICAgICAgICAgICAgY3Vyc29yRGlyOiBEaXJlY3Rpb25bc3RhdGUuY3Vyc29yRGlyIGFzIGtleW9mIHR5cGVvZiBEaXJlY3Rpb25dLFxyXG4gICAgICAgICAgICBncmlkOiBMZXR0ZXJNYXAubG9hZChzdGF0ZS5ncmlkKSxcclxuICAgICAgICAgICAgcHJpbnQ6IGZhbHNlLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbG9hZEVudHJ5KHN0YXRlOiBFbnRyeVNhdmVTdGF0ZSk6IEVudHJ5IHtcclxuICAgICAgICByZXR1cm4gPEVudHJ5PntcclxuICAgICAgICAgICAgbnVtOiBzdGF0ZS5udW0sXHJcbiAgICAgICAgICAgIGhpbnQ6IHN0YXRlLmhpbnQsXHJcbiAgICAgICAgICAgIGFuc3dlcjogc3RhdGUuYW5zd2VyLFxyXG4gICAgICAgICAgICBwb3M6IGdlby5Qb2ludC5sb2FkKHN0YXRlLnBvcyksXHJcbiAgICAgICAgICAgIGRpcjogRGlyZWN0aW9uW3N0YXRlLmRpciBhcyBrZXlvZiB0eXBlb2YgRGlyZWN0aW9uXSxcclxuICAgICAgICAgICAgc29sdmVkOiBzdGF0ZS5zb2x2ZWQsXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZSgpIHtcclxuICAgICAgICBwdXp6bGUuZW50cmllcyA9IFtdO1xyXG4gICAgICAgIHB1enpsZS5lbnRyaWVzID0gZ2VuZXJhdGVQdXp6bGUocm5nLCBoaW50QW5zd2Vycyk7XHJcbiAgICAgICAgaWYgKHB1enpsZS5lbnRyaWVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICBhbGVydChcIkZhaWxlZCB0byBnZW5lcmF0ZSBwdXp6bGVcIik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHJvd3MgPSBNYXRoLm1heCguLi5wdXp6bGUuZW50cmllcy5tYXAoeCA9PiB4LnBvcy54ICsgZW50cnlXaWR0aCh4KSkpO1xyXG4gICAgICAgIGNvbnN0IGNvbHMgPSBNYXRoLm1heCguLi5wdXp6bGUuZW50cmllcy5tYXAoeCA9PiB4LnBvcy55ICsgZW50cnlIZWlnaHQoeCkpKTtcclxuICAgICAgICBwdXp6bGUuZ3JpZCA9IG5ldyBMZXR0ZXJNYXAocm93cywgY29scyk7XHJcblxyXG4gICAgICAgIHBsYXkoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwbGF5KCkge1xyXG4gICAgICAgIGNyZWF0ZVVpLmhpZGRlbiA9IHRydWU7XHJcbiAgICAgICAgcGxheVVpLmhpZGRlbiA9IGZhbHNlO1xyXG4gICAgICAgIHB1enpsZUNhbnZhcy53aWR0aCA9IHB1enpsZUNhbnZhcy5jbGllbnRXaWR0aDtcclxuICAgICAgICBwdXp6bGVDYW52YXMuaGVpZ2h0ID0gcHV6emxlQ2FudmFzLmNsaWVudEhlaWdodDtcclxuICAgICAgICB1cGRhdGVQdXp6bGVIaW50TGlzdCgpO1xyXG4gICAgICAgIHdpbmRvdy5zY3JvbGxUbyh7IGxlZnQ6IDAsIHRvcDogMCB9KTtcclxuICAgICAgICBwdXp6bGVDYW52YXMuZm9jdXMoKTtcclxuXHJcbiAgICAgICAgaWYgKHB1enpsZS5lbnRyaWVzLmxlbmd0aCA+IDAgJiYgIXB1enpsZS5jdXJzb3JDb29yZHMpIHtcclxuICAgICAgICAgICAgcHV6emxlLmN1cnNvckNvb3JkcyA9IHB1enpsZS5lbnRyaWVzWzBdLnBvcztcclxuICAgICAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IHB1enpsZS5lbnRyaWVzWzBdLmRpcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNhdmUoKTtcclxuICAgICAgICBkcmF3UHV6emxlKHB1enpsZUNhbnZhcywgcHV6emxlQ29udGV4dCwgcHV6emxlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjcmVhdGUoKSB7XHJcbiAgICAgICAgcGxheVVpLmhpZGRlbiA9IHRydWU7XHJcbiAgICAgICAgY3JlYXRlVWkuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgc2F2ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZVB1enpsZUhpbnRMaXN0KCkge1xyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbihwdXp6bGVIaW50QWNyb3NzTGlzdCk7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHB1enpsZUhpbnREb3duTGlzdCk7XHJcbiAgICAgICAgY29uc3QgZW50cmllcyA9IHB1enpsZS5lbnRyaWVzO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVudHJpZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgZW50cnkgPSBlbnRyaWVzW2ldO1xyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHB1enpsZUhpbnRUZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50O1xyXG4gICAgICAgICAgICBjb25zdCBoaW50TGkgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIucHV6emxlLWhpbnQtbGlcIikgYXMgSFRNTExJRWxlbWVudDtcclxuICAgICAgICAgICAgaGludExpLnRleHRDb250ZW50ID0gYCR7ZW50cnkubnVtfS4gJHtlbnRyeS5oaW50fWA7XHJcbiAgICAgICAgICAgIGhpbnRMaS5kYXRhc2V0LmVudHJ5SW5kZXggPSBgJHtpfWA7XHJcblxyXG4gICAgICAgICAgICBpZiAoZW50cnkuc29sdmVkKSB7XHJcbiAgICAgICAgICAgICAgICBoaW50TGkuY2xhc3NMaXN0LmFkZChcInNvbHZlZFwiKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGVudHJ5LmRpciA9PT0gRGlyZWN0aW9uLkFjcm9zcykge1xyXG4gICAgICAgICAgICAgICAgcHV6emxlSGludEFjcm9zc0xpc3QuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBwdXp6bGVIaW50RG93bkxpc3QuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QdXp6bGVQb2ludGVyTW92ZShldnQ6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IGN4eSA9IG5ldyBnZW8uUG9pbnQoZXZ0Lm9mZnNldFgsIGV2dC5vZmZzZXRZKTtcclxuICAgICAgICBwdXp6bGUuaG92ZXJDb29yZHMgPSBjYW52YXNDb29yZHNUb0NlbGxDb29yZHMoY3h5KTtcclxuICAgICAgICBkcmF3UHV6emxlKHB1enpsZUNhbnZhcywgcHV6emxlQ29udGV4dCwgcHV6emxlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvblB1enpsZVBvaW50ZXJEb3duKGV2dDogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgeHkgPSBjYW52YXNDb29yZHNUb0NlbGxDb29yZHMobmV3IGdlby5Qb2ludChldnQub2Zmc2V0WCwgZXZ0Lm9mZnNldFkpKTtcclxuICAgICAgICBjb25zdCBwZGlyID0gcGVycChwdXp6bGUuY3Vyc29yRGlyKTtcclxuICAgICAgICBjb25zdCBlbnRyaWVzQXRDZWxsID0gZmluZEVudHJpZXNBdENlbGwocHV6emxlLmVudHJpZXMsIHh5KTtcclxuXHJcbiAgICAgICAgLy8gbm8gZW50cmllcyBhdCBjZWxsLCBjYW4ndCBwbGFjZSBjdXJzb3IgaGVyZVxyXG4gICAgICAgIGlmICghZW50cmllc0F0Q2VsbC5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc3dpdGNoIGRpcmVjdGlvbnMgaWYgYXQgc2FtZSBjZWxsXHJcbiAgICAgICAgaWYgKHB1enpsZS5jdXJzb3JDb29yZHMgJiYgeHkuZXF1YWwocHV6emxlLmN1cnNvckNvb3JkcykgJiYgZW50cmllc0F0Q2VsbC5zb21lKHggPT4geC5kaXIgPT09IHBkaXIpKSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5jdXJzb3JEaXIgPSBwZGlyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaWYgY3VycmVudCBjdXJzb3IgZGlyZWN0aW9uIGRvZXMgbm90IGFsaWduIHdpdGggYSB3b3JkIGF0IHRoZSBjZWxsLCBzd2l0Y2ggZGlyZWN0aW9uXHJcbiAgICAgICAgaWYgKCFlbnRyaWVzQXRDZWxsLnNvbWUoeCA9PiB4LmRpciA9PT0gcHV6emxlLmN1cnNvckRpcikpIHtcclxuICAgICAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IHBlcnAocHV6emxlLmN1cnNvckRpcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdXp6bGUuY3Vyc29yQ29vcmRzID0geHk7XHJcbiAgICAgICAgc2F2ZSgpO1xyXG4gICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uUHV6emxlUG9pbnRlck91dCgpIHtcclxuICAgICAgICBwdXp6bGUuaG92ZXJDb29yZHMgPSBudWxsO1xyXG4gICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uUHV6emxlS2V5ZG93bihldnQ6IEtleWJvYXJkRXZlbnQpIHtcclxuICAgICAgICBpZiAoIXB1enpsZS5jdXJzb3JDb29yZHMpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZW50cmllc0F0Q2VsbCA9IGZpbmRFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBwdXp6bGUuY3Vyc29yQ29vcmRzKTtcclxuICAgICAgICBpZiAoZW50cmllc0F0Q2VsbC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc29sdmVkQXRDZWxsID0gZW50cmllc0F0Q2VsbC5zb21lKHggPT4geC5zb2x2ZWQpO1xyXG4gICAgICAgIGlmICghZXZ0LmtleSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBoYW5kbGUgY29udHJvbC9hcnJvdyBrZXlzXHJcbiAgICAgICAgaWYgKGV2dC5rZXkgPT09IFwiRGVsZXRlXCIgJiYgIXNvbHZlZEF0Q2VsbCkge1xyXG4gICAgICAgICAgICBwdXp6bGUuZ3JpZC5zZXQocHV6emxlLmN1cnNvckNvb3JkcywgXCJcIik7XHJcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBzYXZlKCk7XHJcbiAgICAgICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB2ID0gZ2V0Q29udHJvbEtleVZlY3RvcihwdXp6bGUuY3Vyc29yRGlyLCBldnQua2V5LCBldnQuc2hpZnRLZXkpO1xyXG4gICAgICAgIGlmICh2LnggIT09IDAgfHwgdi55ICE9PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvb3JkcyA9IHB1enpsZS5jdXJzb3JDb29yZHMuYWRkUG9pbnQodik7XHJcbiAgICAgICAgICAgIGNvbnN0IGVudHJpZXNBdE5ld0NlbGwgPSBmaW5kRW50cmllc0F0Q2VsbChwdXp6bGUuZW50cmllcywgY29vcmRzKTtcclxuICAgICAgICAgICAgY29uc3Qgc29sdmVkQXROZXdDZWxsID0gZW50cmllc0F0Q2VsbC5zb21lKHggPT4geC5zb2x2ZWQpO1xyXG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChldnQua2V5ID09PSBcIiBcIiAmJiAhc29sdmVkQXRDZWxsKSB7XHJcbiAgICAgICAgICAgICAgICBwdXp6bGUuZ3JpZC5zZXQocHV6emxlLmN1cnNvckNvb3JkcywgXCJcIik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChlbnRyaWVzQXROZXdDZWxsLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBjb29yZHM7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXZ0LmtleSA9PT0gXCJCYWNrc3BhY2VcIiAmJiAhc29sdmVkQXROZXdDZWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHV6emxlLmdyaWQuc2V0KHB1enpsZS5jdXJzb3JDb29yZHMsIFwiXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNhdmUoKTtcclxuICAgICAgICAgICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZXZ0LmtleS5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChldnQua2V5Lmxlbmd0aCAhPT0gMSB8fCAhZXZ0LmtleS5tYXRjaCgvW2Etel0vaSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbGV0dGVyID0gZXZ0LmtleS50b1VwcGVyQ2FzZSgpO1xyXG5cclxuICAgICAgICBpZiAoZW50cmllc0F0Q2VsbC5zb21lKHggPT4geC5zb2x2ZWQpICYmIGxldHRlciAhPT0gcHV6emxlLmdyaWQuZ2V0KHB1enpsZS5jdXJzb3JDb29yZHMpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwdXp6bGUuZ3JpZC5zZXQocHV6emxlLmN1cnNvckNvb3JkcywgbGV0dGVyKTtcclxuXHJcbiAgICAgICAgLy8gY2hlY2sgZm9yIGNvbXBsZXRlIHdvcmRcclxuICAgICAgICBsZXQgYW55U29sdmVkID0gZmFsc2U7XHJcbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzQXRDZWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNvbHZlZCA9IGVudHJ5U29sdmVkKGVudHJ5LCBwdXp6bGUuZ3JpZCk7XHJcbiAgICAgICAgICAgIGlmICghZW50cnkuc29sdmVkICYmIHNvbHZlZCkge1xyXG4gICAgICAgICAgICAgICAgZW50cnkuc29sdmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGFueVNvbHZlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGNoZWNrIGZvciBkb25lXHJcbiAgICAgICAgaWYgKHB1enpsZS5lbnRyaWVzLmV2ZXJ5KGUgPT4gZS5zb2x2ZWQpKSB7XHJcbiAgICAgICAgICAgIG9uUHV6emxlU29sdmVkKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhZHZhbmNlIGN1cnNvclxyXG4gICAgICAgIGlmIChhbnlTb2x2ZWQpIHtcclxuICAgICAgICAgICAgY29uc3QgZW50cnkgPSBuZXh0VW5zb2x2ZWRFbnRyeShwdXp6bGUuZW50cmllcywgZW50cmllc0F0Q2VsbFswXSk7XHJcbiAgICAgICAgICAgIGlmIChlbnRyeSkge1xyXG4gICAgICAgICAgICAgICAgcHV6emxlLmN1cnNvckNvb3JkcyA9IGVudHJ5LnBvcztcclxuICAgICAgICAgICAgICAgIHB1enpsZS5jdXJzb3JEaXIgPSBlbnRyeS5kaXI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zdCBhZHZhbmNlZEN1cnNvciA9IHB1enpsZS5jdXJzb3JDb29yZHMuYWRkUG9pbnQoZ2V0RGlyZWN0aW9uVmVjdG9yKHB1enpsZS5jdXJzb3JEaXIpKTtcclxuICAgICAgICAgICAgaWYgKGZpbmRFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBhZHZhbmNlZEN1cnNvcikubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcHV6emxlLmN1cnNvckNvb3JkcyA9IHB1enpsZS5jdXJzb3JDb29yZHMuYWRkUG9pbnQoZ2V0RGlyZWN0aW9uVmVjdG9yKHB1enpsZS5jdXJzb3JEaXIpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICAgICAgdXBkYXRlUHV6emxlSGludExpc3QoKTtcclxuICAgICAgICBzYXZlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QdXp6bGVIaW50Q2xpY2soZTogRXZlbnQpIHtcclxuICAgICAgICBjb25zdCB0YXJnZXQgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICBjb25zdCBsaSA9IHRhcmdldC5jbG9zZXN0KFwiLnB1enpsZS1oaW50LWxpXCIpIGFzIEhUTUxMSUVsZW1lbnQ7XHJcbiAgICAgICAgY29uc3QgZW50cnlJbmRleFN0cmluZyA9IGxpPy5kYXRhc2V0Py5lbnRyeUluZGV4O1xyXG4gICAgICAgIGlmICghZW50cnlJbmRleFN0cmluZykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlbnRyeUluZGV4ID0gcGFyc2VJbnQoZW50cnlJbmRleFN0cmluZyk7XHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBwdXp6bGUuZW50cmllc1tlbnRyeUluZGV4XTtcclxuICAgICAgICBwdXp6bGUuY3Vyc29yQ29vcmRzID0gZW50cnkucG9zO1xyXG4gICAgICAgIHB1enpsZS5jdXJzb3JEaXIgPSBlbnRyeS5kaXI7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICAgICAgc2F2ZSgpO1xyXG4gICAgICAgIHB1enpsZUNhbnZhcy5mb2N1cygpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uUHV6emxlU29sdmVkKCkge1xyXG4gICAgICAgIGFsZXJ0KFwiWU9VIFNPTFZFRCBUSEUgUFVaWkxFISBCUkFWTyFcIik7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25CZWZvcmVQcmludCgpIHtcclxuICAgICAgICBwdXp6bGUucHJpbnQgPSB0cnVlO1xyXG4gICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uQWZ0ZXJQcmludCgpIHtcclxuICAgICAgICBwdXp6bGUucHJpbnQgPSBmYWxzZTtcclxuICAgICAgICBkcmF3UHV6emxlKHB1enpsZUNhbnZhcywgcHV6emxlQ29udGV4dCwgcHV6emxlKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcm5kRGlyKHJuZzogcmFuZC5STkcpOiBEaXJlY3Rpb24ge1xyXG4gICAgY29uc3QgZGlyZWN0aW9ucyA9IFtEaXJlY3Rpb24uQWNyb3NzLCBEaXJlY3Rpb24uRG93bl07XHJcbiAgICByZXR1cm4gcmFuZC5jaG9vc2Uocm5nLCBkaXJlY3Rpb25zKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGVycChkaXI6IERpcmVjdGlvbik6IERpcmVjdGlvbiB7XHJcbiAgICBpZiAoZGlyID09IERpcmVjdGlvbi5BY3Jvc3MpIHtcclxuICAgICAgICByZXR1cm4gRGlyZWN0aW9uLkRvd247XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIERpcmVjdGlvbi5BY3Jvc3M7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlUHV6emxlKHJuZzogcmFuZC5STkcsIGhpbnRBbnN3ZXJzOiBIaW50QW5zd2VyW10pOiBFbnRyeVtdIHtcclxuICAgIGlmIChoaW50QW5zd2Vycy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgIGFsZXJ0KFwiUGxlYXNlIGVudGVyIGF0IGxlYXN0IG9uZSBoaW50IGFuZCBhbnN3ZXIhXCIpO1xyXG4gICAgICAgIHJldHVybiBbXTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBtYWtlIGFsbCBhbnN3ZXJzIGxvd2VyY2FzZVxyXG4gICAgZm9yIChjb25zdCBoYSBvZiBoaW50QW5zd2Vycykge1xyXG4gICAgICAgIGhhLmFuc3dlciA9IGhhLmFuc3dlci50b0xvY2FsZVVwcGVyQ2FzZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHJldHJ5IHVudGlsIHN1Y2Nlc3NmdWwgKHVwIHRvIGEgY2VydGFpbiBhbW91bnQpXHJcbiAgICBjb25zdCBwdXp6bGVzID0gbmV3IEFycmF5PEVudHJ5W10+KCk7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1BWF9HRU5TOyArK2kpIHtcclxuICAgICAgICBjb25zdCBlbnRyaWVzID0gdHJ5R2VuZXJhdGVQdXp6bGUocm5nLCBoaW50QW5zd2Vycyk7XHJcbiAgICAgICAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHV6emxlcy5wdXNoKGVudHJpZXMpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChwdXp6bGVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiBbXTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBlbnRyaWVzID0gcHV6emxlcy5yZWR1Y2UoKHByZXYsIGN1cikgPT4gY2FsY1Njb3JlKHByZXYpIDwgY2FsY1Njb3JlKGN1cikgPyBwcmV2IDogY3VyKTtcclxuICAgIGVudHJpZXMuc29ydCgoeCwgeSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGRuID0geC5udW0gLSB5Lm51bTtcclxuICAgICAgICByZXR1cm4gZG4gPT09IDAgPyB4LmRpciAtIHkuZGlyIDogZG47XHJcbiAgICB9KTtcclxuXHJcbiAgICBzaGlmdFB1enpsZShlbnRyaWVzKTtcclxuICAgIHJldHVybiBlbnRyaWVzO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0cnlHZW5lcmF0ZVB1enpsZShybmc6IHJhbmQuUk5HLCBoaW50QW5zd2VyczogSGludEFuc3dlcltdKTogRW50cnlbXSB7XHJcbiAgICByYW5kLnNodWZmbGUocm5nLCBoaW50QW5zd2Vycyk7XHJcblxyXG4gICAgLy8gcGxhY2UgbG9uZ2VzdCB3b3JkIGF0IDAsMCByYW5kb21seSBhY3Jvc3MvZG93blxyXG4gICAgY29uc3QgZW50cmllcyA9IG5ldyBBcnJheTxFbnRyeT4oKTtcclxuICAgIGVudHJpZXMucHVzaChwbGFjZUluaXRpYWxFbnRyeShybmcsIGhpbnRBbnN3ZXJzWzBdKSk7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBoaW50QW5zd2Vycy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGhhID0gaGludEFuc3dlcnNbaV07XHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBwbGFjZU5leHRFbnRyeShlbnRyaWVzLCBoYSk7XHJcbiAgICAgICAgaWYgKGVudHJ5KSB7XHJcbiAgICAgICAgICAgIGVudHJpZXMucHVzaChlbnRyeSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZW50cmllcztcclxufVxyXG5cclxuZnVuY3Rpb24gc2hpZnRQdXp6bGUoZW50cmllczogRW50cnlbXSkge1xyXG4gICAgLy8gc2hpZnQgdGhlIHB1enpsZSBzdWNoIHRoYXQgYWxsIHdvcmRzIHN0YXJ0ID49ICgwLCAwKVxyXG4gICAgY29uc3QgbWluWCA9IE1hdGgubWluKC4uLmVudHJpZXMubWFwKHggPT4geC5wb3MueCkpO1xyXG4gICAgY29uc3QgbWluWSA9IE1hdGgubWluKC4uLmVudHJpZXMubWFwKHggPT4geC5wb3MueSkpO1xyXG4gICAgY29uc3QgeHkgPSBuZXcgZ2VvLlBvaW50KC1taW5YLCAtbWluWSk7XHJcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICBlbnRyeS5wb3MgPSBlbnRyeS5wb3MuYWRkUG9pbnQoeHkpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjU2NvcmUoZW50cmllczogRW50cnlbXSk6IG51bWJlciB7XHJcbiAgICAvLyBjYWxjdWxhdGUgcHV6emxlIHNjb3JlLFxyXG4gICAgLy8gbG93ZXIgaXMgYmV0dGVyXHJcbiAgICBjb25zdCB4ID0gTWF0aC5taW4oLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy54KSk7XHJcbiAgICBjb25zdCB5ID0gTWF0aC5taW4oLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy55KSk7XHJcbiAgICBjb25zdCB3ID0gTWF0aC5tYXgoLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy54ICsgZW50cnlXaWR0aChlKSkpIC0geDtcclxuICAgIGNvbnN0IGggPSBNYXRoLm1heCguLi5lbnRyaWVzLm1hcChlID0+IGUucG9zLnkgKyBlbnRyeUhlaWdodChlKSkpIC0geTtcclxuICAgIHJldHVybiB3ICogaDtcclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VJbml0aWFsRW50cnkocm5nOiByYW5kLlJORywgaGE6IEhpbnRBbnN3ZXIpOiBFbnRyeSB7XHJcbiAgICBjb25zdCB7IGhpbnQsIGFuc3dlciB9ID0gaGE7XHJcblxyXG4gICAgY29uc3QgZGlyID0gcm5kRGlyKHJuZyk7XHJcbiAgICAvLyBjb25zdCBkaXIgPSBEaXJlY3Rpb24uQWNyb3NzO1xyXG4gICAgY29uc3QgcG9zID0gbmV3IGdlby5Qb2ludCgwLCAwKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIG51bTogMSxcclxuICAgICAgICBoaW50LFxyXG4gICAgICAgIGFuc3dlcixcclxuICAgICAgICBwb3MsXHJcbiAgICAgICAgZGlyLFxyXG4gICAgICAgIHNvbHZlZDogZmFsc2UsXHJcbiAgICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZU5leHRFbnRyeShlbnRyaWVzOiBFbnRyeVtdLCBoYTogSGludEFuc3dlcik6IEVudHJ5IHwgdW5kZWZpbmVkIHtcclxuICAgIGNvbnN0IHsgaGludCwgYW5zd2VyIH0gPSBoYTtcclxuXHJcbiAgICAvLyBmaW5kIG5leHQgcG9zc2libGUgaW50ZXJzZWN0aW9uIHdpdGggZXhpc3Rpbmcgd29yZHNcclxuICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgIC8vIGZpbmQgbmV4dCBjb21tb24gbGV0dGVyXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbnRyeS5hbnN3ZXIubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBhbnN3ZXIubGVuZ3RoOyArK2opIHtcclxuICAgICAgICAgICAgICAgIGlmIChlbnRyeS5hbnN3ZXJbaV0gPT09IGFuc3dlcltqXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRyeSBwbGFjaW5nIHRoZSB3b3JkIGhlcmVcclxuICAgICAgICAgICAgICAgICAgICAvLyBpID0gaW5kZXggaW4gYWxyZWFkeSBwbGFjZWQgd29yZFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGogPSBpbmRleCBpbiB1bnBsYWNlZCB3b3JkXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgd29yZCBpcyB2ZXJ0aWNhbCwgcGxhY2UgaG9yaXpvbnRhbFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHdvcmQgaXMgaG9yaXpvbnRhbCwgcGxhY2UgdmVydGljYWxcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21tb25Qb3MgPSBnZXRDaGFyUG9zaXRpb24oZW50cnkucG9zLCBlbnRyeS5kaXIsIGkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpciA9IHBlcnAoZW50cnkuZGlyKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb3MgPSBnZXRTdGFydFBvc2l0aW9uKGNvbW1vblBvcywgZGlyLCBqKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNWYWxpZFdvcmRQbGFjZW1lbnQoZW50cmllcywgYW5zd2VyLCBwb3MsIGRpcikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZG9lcyBhbm90aGVyIGVudHJ5IHN0YXJ0IGhlcmU/IGlmIHNvLCBzaGFyZSBpdCdzIG51bVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2UsIHVzZSBtYXggKyAxXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG51bSA9IGVudHJpZXMuZmlsdGVyKHggPT4geC5wb3MuZXF1YWwocG9zKSkubWFwKHggPT4geC5udW0pWzBdID8/IE1hdGgubWF4KC4uLmVudHJpZXMubWFwKHggPT4geC5udW0gKyAxKSkgPz8gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZTogRW50cnkgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoaW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5zd2VyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc29sdmVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBubyBwbGFjZW1lbnQgZm91bmRcclxuICAgIHJldHVybjtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0RGlyZWN0aW9uVmVjdG9yKGRpcjogRGlyZWN0aW9uKTogZ2VvLlBvaW50IHtcclxuICAgIHN3aXRjaCAoZGlyKSB7XHJcbiAgICAgICAgY2FzZSBEaXJlY3Rpb24uQWNyb3NzOlxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgxLCAwKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBEaXJlY3Rpb24uRG93bjpcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMCwgMSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgZGlyZWN0b25cIik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmFsaWRXb3JkUGxhY2VtZW50KGVudHJpZXM6IEVudHJ5W10sIGFuc3dlcjogc3RyaW5nLCBwb3M6IGdlby5Qb2ludCwgZGlyOiBEaXJlY3Rpb24pOiBib29sZWFuIHtcclxuICAgIC8vIGNoZWNrIGZvciBvdmVybGFwXHJcbiAgICAvLyBjYXNlczpcclxuICAgIC8vIGFjcm9zcy9hY3Jvc3NcclxuICAgIC8vIGRvd24vZG93blxyXG4gICAgLy8gYWNyb3NzL2Rvd25cclxuICAgIC8vIGRvd24vYWNyb3NzIChzd2FwIGFuZCBtYWtlIHNhbWUgY2FzZT8pXHJcbiAgICAvLyBhbnkgb3ZlcmxhcCBhdCBub24tXHJcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICBpZiAoIWlzVmFsaWRQbGFjZW1lbnQoZW50cnkucG9zLCBlbnRyeS5hbnN3ZXIsIGVudHJ5LmRpciwgcG9zLCBhbnN3ZXIsIGRpcikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFBsYWNlbWVudChwb3MxOiBnZW8uUG9pbnQsIGExOiBzdHJpbmcsIGRpcjE6IERpcmVjdGlvbiwgcG9zMjogZ2VvLlBvaW50LCBhMjogc3RyaW5nLCBkaXIyOiBEaXJlY3Rpb24pOiBib29sZWFuIHtcclxuICAgIGlmIChkaXIxID09PSBEaXJlY3Rpb24uQWNyb3NzICYmIGRpcjIgPT09IERpcmVjdGlvbi5BY3Jvc3MpIHtcclxuICAgICAgICByZXR1cm4gaXNWYWxpZFBsYWNlbWVudEFjcm9zc0Fjcm9zcyhwb3MxLCBhMSwgcG9zMiwgYTIpO1xyXG4gICAgfSBlbHNlIGlmIChkaXIxID09PSBEaXJlY3Rpb24uRG93biAmJiBkaXIyID09PSBEaXJlY3Rpb24uRG93bikge1xyXG4gICAgICAgIHJldHVybiBpc1ZhbGlkUGxhY2VtZW50RG93bkRvd24ocG9zMSwgYTEsIHBvczIsIGEyKTtcclxuICAgIH0gZWxzZSBpZiAoZGlyMSA9PT0gRGlyZWN0aW9uLkFjcm9zcyAmJiBkaXIyID09PSBEaXJlY3Rpb24uRG93bikge1xyXG4gICAgICAgIHJldHVybiBpc1ZhbGlkUGxhY2VtZW50QWNyb3NzRG93bihwb3MxLCBhMSwgcG9zMiwgYTIpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBpc1ZhbGlkUGxhY2VtZW50RG93bkFjcm9zcyhwb3MxLCBhMSwgcG9zMiwgYTIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkUGxhY2VtZW50QWNyb3NzQWNyb3NzKHBvczE6IGdlby5Qb2ludCwgYTE6IHN0cmluZywgcG9zMjogZ2VvLlBvaW50LCBhMjogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAvLyBpZiB5IGNvb3JkcyBub3QgdG91Y2hpbmcsIHZhbGlkXHJcbiAgICBpZiAoTWF0aC5hYnMocG9zMS55IC0gcG9zMi55KSA+IDEpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBpZiB4IHJhbmdlcyBub3QgdG91Y2hpbmcsIHZhbGlkXHJcbiAgICBpZiAocG9zMS54ICsgYTEubGVuZ3RoICsgMSA8IHBvczEueCB8fCBwb3MxLnggPiBwb3MyLnggKyBhMi5sZW5ndGggKyAxKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkUGxhY2VtZW50RG93bkRvd24ocG9zMTogZ2VvLlBvaW50LCBhMTogc3RyaW5nLCBwb3MyOiBnZW8uUG9pbnQsIGEyOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIC8vIGlmIHkgY29vcmRzIG5vdCB0b3VjaGluZywgdmFsaWRcclxuICAgIGlmIChNYXRoLmFicyhwb3MxLnggLSBwb3MyLngpID4gMSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGlmIHggcmFuZ2VzIG5vdCB0b3VjaGluZywgdmFsaWRcclxuICAgIGlmIChwb3MxLnkgKyBhMS5sZW5ndGggKyAxIDwgcG9zMS55IHx8IHBvczEueSA+IHBvczIueSArIGEyLmxlbmd0aCArIDEpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmFsaWRQbGFjZW1lbnRBY3Jvc3NEb3duKHBvczE6IGdlby5Qb2ludCwgYTE6IHN0cmluZywgcG9zMjogZ2VvLlBvaW50LCBhMjogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAvLyBpZiBubyBvdmVybGFwIG9uIHgtYXhpcyB2YWxpZFxyXG4gICAgaWYgKHBvczEueCArIGExLmxlbmd0aCA8IHBvczIueCAtIDEgfHwgcG9zMS54ID4gcG9zMi54ICsgMSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGlmIG5vIG92ZXJsYXAgb24geS1heGlzLCB2YWxpZFxyXG4gICAgaWYgKHBvczEueSA8IHBvczIueSAtIDEgfHwgcG9zMS55ID4gcG9zMi55ICsgYTIubGVuZ3RoICsgMSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGlmIHRvdWNoaW5nIChpeCBvdXRzaWRlIG9mIGVpdGhlciB3b3JkLCBub3QgYSB2YWxpZCBwbGFjZW1lbnQpXHJcbiAgICBjb25zdCBpeCA9IG5ldyBnZW8uUG9pbnQocG9zMi54LCBwb3MxLnkpO1xyXG4gICAgaWYgKFxyXG4gICAgICAgIGl4LnggPCBwb3MxLnggfHwgaXgueCA+IHBvczEueCArIGExLmxlbmd0aFxyXG4gICAgICAgIHx8IGl4LnkgPCBwb3MyLnkgfHwgaXgueSA+IHBvczIueSArIGEyLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYTFbaXgueCAtIHBvczEueF0gPT09IGEyW2l4LnkgLSBwb3MyLnldO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkUGxhY2VtZW50RG93bkFjcm9zcyhwb3MxOiBnZW8uUG9pbnQsIGExOiBzdHJpbmcsIHBvczI6IGdlby5Qb2ludCwgYTI6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIGlzVmFsaWRQbGFjZW1lbnRBY3Jvc3NEb3duKHBvczIsIGEyLCBwb3MxLCBhMSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldENoYXJQb3NpdGlvbihzdGFydFBvc2l0aW9uOiBnZW8uUG9pbnQsIGRpcjogRGlyZWN0aW9uLCBpbmRleDogbnVtYmVyKTogZ2VvLlBvaW50IHtcclxuICAgIGNvbnN0IHYgPSBnZXREaXJlY3Rpb25WZWN0b3IoZGlyKTtcclxuICAgIHJldHVybiBzdGFydFBvc2l0aW9uLmFkZFBvaW50KHYubXVsU2NhbGFyKGluZGV4KSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFN0YXJ0UG9zaXRpb24oY2hhclBvc2l0aW9uOiBnZW8uUG9pbnQsIGRpcjogRGlyZWN0aW9uLCBpbmRleDogbnVtYmVyKTogZ2VvLlBvaW50IHtcclxuICAgIC8vIGdldCB0aGUgc3RhcnQgcG9zaXRpb24gb2YgYSB3b3JkIGdpdmVuIHRoZSBwb3NpdGlvbiBvZiBhIHNwZWNpZmllZCBpbmRleFxyXG4gICAgY29uc3QgdiA9IGdldERpcmVjdGlvblZlY3RvcihkaXIpO1xyXG4gICAgcmV0dXJuIGNoYXJQb3NpdGlvbi5zdWJQb2ludCh2Lm11bFNjYWxhcihpbmRleCkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3UHV6emxlKGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQsIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCBwdXp6bGU6IFB1enpsZSkge1xyXG4gICAgY29uc3QgbGV0dGVyRm9udCA9IFwiYm9sZCAxNnB4IGFyaWFsXCI7XHJcbiAgICBjb25zdCBudW1iZXJGb250ID0gXCJub3JtYWwgMTBweCBhcmlhbFwiO1xyXG4gICAgY3R4LmZvbnQgPSBsZXR0ZXJGb250O1xyXG4gICAgY29uc3QgbGV0dGVyVGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGg7XHJcbiAgICBjdHguZm9udCA9IG51bWJlckZvbnQ7XHJcbiAgICBjb25zdCBudW1iZXJUZXh0SGVpZ2h0ID0gY3R4Lm1lYXN1cmVUZXh0KFwiTVwiKS53aWR0aDtcclxuXHJcbiAgICAvLyBkcmF3IGJhY2tncm91bmRcclxuICAgIGN0eC5maWxsU3R5bGUgPSBcImJsYWNrXCI7XHJcbiAgICBjb25zdCBlbnRyaWVzID0gcHV6emxlLmVudHJpZXM7XHJcbiAgICBjb25zdCBwdyA9IE1hdGgubWF4KC4uLmVudHJpZXMubWFwKGUgPT4gZS5wb3MueCArIGVudHJ5V2lkdGgoZSkpKTtcclxuICAgIGNvbnN0IHBoID0gTWF0aC5tYXgoLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy55ICsgZW50cnlIZWlnaHQoZSkpKTtcclxuICAgIGNvbnN0IGNhbnZhc1dpZHRoID0gcHcgKiBDRUxMX1NJWkU7XHJcbiAgICBjb25zdCBjYW52YXNIZWlnaHQgPSBwaCAqIENFTExfU0laRTtcclxuICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhc1dpZHRoO1xyXG4gICAgY2FudmFzLmhlaWdodCA9IGNhbnZhc0hlaWdodDtcclxuICAgIGN0eC5maWxsUmVjdCgwLCAwLCBjYW52YXNXaWR0aCwgY2FudmFzSGVpZ2h0KTtcclxuXHJcbiAgICAvLyBkcmF3IGxldHRlcnMgYW5kIGNlbGxzXHJcbiAgICBjdHguZm9udCA9IFwiYm9sZCAxOHB4IGFyaWFsXCI7XHJcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICBjb25zdCB7IHBvcywgYW5zd2VyLCBkaXIgfSA9IGVudHJ5O1xyXG4gICAgICAgIGNvbnN0IHYgPSBnZXREaXJlY3Rpb25WZWN0b3IoZGlyKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhbnN3ZXIubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgcCA9IHBvcy5hZGRQb2ludCh2Lm11bFNjYWxhcihpKSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGN4ID0gcC54ICogQ0VMTF9TSVpFO1xyXG4gICAgICAgICAgICBjb25zdCBjeSA9IHAueSAqIENFTExfU0laRTtcclxuXHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIndoaXRlXCI7XHJcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdChjeCwgY3ksIENFTExfU0laRSwgQ0VMTF9TSVpFKTtcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiYmxhY2tcIjtcclxuXHJcbiAgICAgICAgICAgIGN0eC5mb250ID0gXCJib2xkIDE4cHggYXJpYWxcIjtcclxuICAgICAgICAgICAgY3R4LnN0cm9rZVJlY3QoY3gsIGN5LCBDRUxMX1NJWkUsIENFTExfU0laRSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgbnVtYmVyc1xyXG4gICAgY3R4LmZvbnQgPSBcIm5vcm1hbCAxMHB4IGFyaWFsXCI7XHJcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICAvLyBkcmF3IG51bWJlclxyXG4gICAgICAgIGNvbnN0IGNvb3JkcyA9IGVudHJ5LnBvcy5tdWxTY2FsYXIoQ0VMTF9TSVpFKTtcclxuICAgICAgICBjdHguZmlsbFRleHQoYCR7ZW50cnkubnVtfWAsIGNvb3Jkcy54ICsgMiwgY29vcmRzLnkgKyAyICsgbnVtYmVyVGV4dEhlaWdodCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZHJhdyBlbnRlcmVkIGxldHRlcnNcclxuICAgIGNvbnN0IGdyaWQgPSBwdXp6bGUuZ3JpZDtcclxuICAgIGZvciAoY29uc3QgY2VsbENvb3JkcyBvZiBncmlkLmtleXMoKSkge1xyXG4gICAgICAgIGNvbnN0IGxldHRlciA9IGdyaWQuZ2V0KGNlbGxDb29yZHMpO1xyXG4gICAgICAgIGlmICghbGV0dGVyKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29vcmRzID0gY2VsbENvb3Jkc1RvQ2FudmFzQ29vcmRzKGNlbGxDb29yZHMpLmFkZFBvaW50KG5ldyBnZW8uUG9pbnQoQ0VMTF9QQURESU5HLCBDRUxMX1BBRERJTkcpKTtcclxuICAgICAgICBjb25zdCBtZXRyaWNzID0gY3R4Lm1lYXN1cmVUZXh0KGxldHRlcik7XHJcbiAgICAgICAgY29vcmRzLnggKz0gQ0VMTF9JTlRFUklPUl9TSVpFIC8gMi4wO1xyXG4gICAgICAgIGNvb3Jkcy55ICs9IENFTExfSU5URVJJT1JfU0laRSAvIDIuMDtcclxuICAgICAgICBjb29yZHMueSArPSBsZXR0ZXJUZXh0SGVpZ2h0IC8gMi4wO1xyXG4gICAgICAgIGNvb3Jkcy54IC09IG1ldHJpY3Mud2lkdGggLyAyLjA7XHJcbiAgICAgICAgY3R4LmZvbnQgPSBcIjE2cHggYXJpYWxcIjtcclxuICAgICAgICBjdHguZmlsbFRleHQobGV0dGVyLCBjb29yZHMueCwgY29vcmRzLnkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgcmVkIHdoZXJlIGhvdmVyaW5nXHJcbiAgICBpZiAocHV6emxlLmhvdmVyQ29vcmRzICYmICFwdXp6bGUucHJpbnQpIHtcclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAzO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmVkXCI7XHJcbiAgICAgICAgY3R4LnN0cm9rZVJlY3QocHV6emxlLmhvdmVyQ29vcmRzLnggKiBDRUxMX1NJWkUsIHB1enpsZS5ob3ZlckNvb3Jkcy55ICogQ0VMTF9TSVpFLCBDRUxMX1NJWkUsIENFTExfU0laRSk7XHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBkcmF3IGN1cnNvclxyXG4gICAgaWYgKHB1enpsZS5jdXJzb3JDb29yZHMgJiYgIXB1enpsZS5wcmludCkge1xyXG4gICAgICAgIGN0eC5zYXZlKCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGNhbnZhc0Nvb3JkcyA9IGNlbGxDb29yZHNUb0NhbnZhc0Nvb3JkcyhwdXp6bGUuY3Vyc29yQ29vcmRzKTtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMztcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZWRcIjtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmFyYyhjYW52YXNDb29yZHMueCArIENFTExfU0laRSAvIDIuMCwgY2FudmFzQ29vcmRzLnkgKyBDRUxMX1NJWkUgLyAyLjAsIDMsIDAsIE1hdGguUEkgKiAyKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgICAgICAvLyBoaWdobGlnaHQgd29yZCB1bmRlciBjdXJzb3JcclxuICAgICAgICBjb25zdCBlbnRyaWVzID0gZmluZEVudHJpZXNBdENlbGwocHV6emxlLmVudHJpZXMsIHB1enpsZS5jdXJzb3JDb29yZHMpLmZpbHRlcih4ID0+IHguZGlyID09PSBwdXp6bGUuY3Vyc29yRGlyKTtcclxuICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gZW50cnkuc29sdmVkID8gXCJncmVlblwiIDogXCJyZWRcIjtcclxuICAgICAgICAgICAgY29uc3QgeyB4LCB5IH0gPSBjZWxsQ29vcmRzVG9DYW52YXNDb29yZHMoZW50cnkucG9zKTtcclxuICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBlbnRyeVdpZHRoKGVudHJ5KSAqIENFTExfU0laRTtcclxuICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gZW50cnlIZWlnaHQoZW50cnkpICogQ0VMTF9TSVpFO1xyXG4gICAgICAgICAgICBjdHguc3Ryb2tlUmVjdCh4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVudHJ5V2lkdGgoZW50cnk6IEVudHJ5KTogbnVtYmVyIHtcclxuICAgIHJldHVybiBlbnRyeS5kaXIgPT09IERpcmVjdGlvbi5BY3Jvc3MgPyBlbnRyeS5hbnN3ZXIubGVuZ3RoIDogMTtcclxufVxyXG5cclxuZnVuY3Rpb24gZW50cnlIZWlnaHQoZW50cnk6IEVudHJ5KTogbnVtYmVyIHtcclxuICAgIHJldHVybiBlbnRyeS5kaXIgPT09IERpcmVjdGlvbi5Eb3duID8gZW50cnkuYW5zd2VyLmxlbmd0aCA6IDE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbnZhc0Nvb3Jkc1RvQ2VsbENvb3Jkcyh4eTogZ2VvLlBvaW50KTogZ2VvLlBvaW50IHtcclxuICAgIHJldHVybiB4eS5kaXZTY2FsYXIoQ0VMTF9TSVpFKS5mbG9vcigpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjZWxsQ29vcmRzVG9DYW52YXNDb29yZHMoeHk6IGdlby5Qb2ludCk6IGdlby5Qb2ludCB7XHJcbiAgICByZXR1cm4geHkubXVsU2NhbGFyKENFTExfU0laRSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbmRFbnRyaWVzQXRDZWxsKGVudHJpZXM6IEVudHJ5W10sIHh5OiBnZW8uUG9pbnQpOiBFbnRyeVtdIHtcclxuICAgIHJldHVybiBlbnRyaWVzLmZpbHRlcih4ID0+IGVudHJ5Q29udGFpbnNQb2ludCh4LCB4eSkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhbnlFbnRyaWVzQXRDZWxsKGVudHJpZXM6IEVudHJ5W10sIHh5OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBmaW5kRW50cmllc0F0Q2VsbChlbnRyaWVzLCB4eSkubGVuZ3RoID4gMDtcclxufVxyXG5cclxuZnVuY3Rpb24gZW50cnlDb250YWluc1BvaW50KGVudHJ5OiBFbnRyeSwgeHk6IGdlby5Qb2ludCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIGVudHJ5LmRpciA9PT0gRGlyZWN0aW9uLkFjcm9zcyAmJiB4eS55ID09PSBlbnRyeS5wb3MueSAmJiB4eS54ID49IGVudHJ5LnBvcy54ICYmIHh5LnggPCBlbnRyeS5wb3MueCArIGVudHJ5LmFuc3dlci5sZW5ndGhcclxuICAgICAgICB8fCBlbnRyeS5kaXIgPT09IERpcmVjdGlvbi5Eb3duICYmIHh5LnggPT09IGVudHJ5LnBvcy54ICYmIHh5LnkgPj0gZW50cnkucG9zLnkgJiYgeHkueSA8IGVudHJ5LnBvcy55ICsgZW50cnkuYW5zd2VyLmxlbmd0aDtcclxufVxyXG5cclxuZnVuY3Rpb24gZW50cnlTb2x2ZWQoZW50cnk6IEVudHJ5LCBncmlkOiBMZXR0ZXJNYXApOiBib29sZWFuIHtcclxuICAgIC8vIGNoZWNrIGZvciBjb21wbGV0ZSB3b3JkXHJcbiAgICBjb25zdCB2ID0gZ2V0RGlyZWN0aW9uVmVjdG9yKGVudHJ5LmRpcik7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVudHJ5LmFuc3dlci5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGNvb3JkcyA9IGVudHJ5LnBvcy5hZGRQb2ludCh2Lm11bFNjYWxhcihpKSk7XHJcbiAgICAgICAgaWYgKGVudHJ5LmFuc3dlcltpXSAhPT0gZ3JpZC5nZXQoY29vcmRzKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDb250cm9sS2V5VmVjdG9yKGN1cnNvckRpcjogRGlyZWN0aW9uLCBrZXk6IHN0cmluZywgc2hpZnQ6IGJvb2xlYW4pOiBnZW8uUG9pbnQge1xyXG4gICAgaWYgKGtleSA9PT0gXCJBcnJvd0xlZnRcIikge1xyXG4gICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KC0xLCAwKTtcclxuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBcIkFycm93RG93blwiKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMCwgMSk7XHJcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gXCJBcnJvd1JpZ2h0XCIpIHtcclxuICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgxLCAwKTtcclxuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBcIkFycm93VXBcIikge1xyXG4gICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KDAsIC0xKTtcclxuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBcIkJhY2tzcGFjZVwiKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoLTEsIDApO1xyXG4gICAgfSBlbHNlIGlmIChrZXkgPT09IFwiVGFiXCIgJiYgIXNoaWZ0KSB7XHJcbiAgICAgICAgcmV0dXJuIGdldERpcmVjdGlvblZlY3RvcihjdXJzb3JEaXIpO1xyXG4gICAgfSBlbHNlIGlmIChrZXkgPT09IFwiVGFiXCIgJiYgc2hpZnQpIHtcclxuICAgICAgICByZXR1cm4gZ2V0RGlyZWN0aW9uVmVjdG9yKGN1cnNvckRpcikubmVnKCk7XHJcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gXCIgXCIpIHtcclxuICAgICAgICByZXR1cm4gZ2V0RGlyZWN0aW9uVmVjdG9yKGN1cnNvckRpcik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMCwgMCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5leHRVbnNvbHZlZEVudHJ5KGVudHJpZXM6IEVudHJ5W10sIGVudHJ5OiBFbnRyeSk6IEVudHJ5IHwgdW5kZWZpbmVkIHtcclxuICAgIGNvbnN0IG9mZnNldCA9IGVudHJpZXMuaW5kZXhPZihlbnRyeSk7XHJcbiAgICBpZiAob2Zmc2V0IDwgMCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IGVudHJpZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCBpZHggPSAob2Zmc2V0ICsgaSkgJSBlbnRyaWVzLmxlbmd0aDtcclxuICAgICAgICBjb25zdCBlbnRyeSA9IGVudHJpZXNbaWR4XTtcclxuICAgICAgICBpZiAoIWVudHJ5LnNvbHZlZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZW50cnk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5tYWluKCkiXX0=