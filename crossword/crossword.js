import * as dom from "../shared/dom.js";
import * as rand from "../shared/rand.js";
import * as geo from "../shared/geo2d.js";
const STORAGE_KEY = "crossword_storage";
const CELL_INTERIOR_SIZE = 24;
const CELL_PADDING = 4;
const CELL_SIZE = CELL_INTERIOR_SIZE + CELL_PADDING * 2;
const MAX_GENS = 1000;
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
    flat(xy) {
        return xy.y * this.cols + xy.x;
    }
    hier(n) {
        const y = Math.floor(n / this.cols);
        const x = n - y * this.cols;
        return new geo.Point(x, y);
    }
}
class PointSet {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.data = new Set();
    }
    has(xy) {
        const id = this.flat(xy);
        return this.data.has(id);
    }
    add(xy) {
        const id = this.flat(xy);
        this.data.add(id);
    }
    keys() {
        return [...this.data].map(k => this.hier(k));
    }
    flat(xy) {
        return xy.y * this.cols + xy.x;
    }
    hier(n) {
        const y = Math.floor(n / this.cols);
        const x = n - y * this.cols;
        return new geo.Point(x, y);
    }
}
var Mode;
(function (Mode) {
    Mode[Mode["Create"] = 0] = "Create";
    Mode[Mode["Play"] = 1] = "Play";
})(Mode || (Mode = {}));
function main() {
    let hintAnswers = new Array();
    const puzzle = {
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
        hintAnswers = JSON.parse(jsonData);
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
        }
        else {
            const advancedCursor = puzzle.cursorCoords.addPoint(getDirectionVector(puzzle.cursorDir));
            if (findEntriesAtCell(puzzle.entries, advancedCursor).length > 0) {
                puzzle.cursorCoords = puzzle.cursorCoords.addPoint(getDirectionVector(puzzle.cursorDir));
            }
        }
        drawPuzzle(puzzleCanvas, puzzleContext, puzzle);
        updatePuzzleHintList();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jvc3N3b3JkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3Jvc3N3b3JkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE1BQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFDO0FBQ3hDLE1BQU0sa0JBQWtCLEdBQUcsRUFBRSxDQUFDO0FBQzlCLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztBQUN2QixNQUFNLFNBQVMsR0FBRyxrQkFBa0IsR0FBRyxZQUFZLEdBQUcsQ0FBQyxDQUFDO0FBQ3hELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQztBQU90QixJQUFLLFNBR0o7QUFIRCxXQUFLLFNBQVM7SUFDViw2Q0FBTSxDQUFBO0lBQ04seUNBQUksQ0FBQTtBQUNSLENBQUMsRUFISSxTQUFTLEtBQVQsU0FBUyxRQUdiO0FBV0QsTUFBTSxTQUFTO0lBR1gsWUFBbUIsSUFBWSxFQUFTLElBQVk7UUFBakMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUFTLFNBQUksR0FBSixJQUFJLENBQVE7UUFDaEQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztJQUMxQyxDQUFDO0lBRUQsR0FBRyxDQUFDLEVBQWE7O1FBQ2IsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN6QixPQUFPLE1BQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLG1DQUFJLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRUQsR0FBRyxDQUFDLEVBQWEsRUFBRSxLQUFhO1FBQzVCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFekIsSUFBSSxD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RUFBRTtRQUMvQixPQUFPLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0tBQzlDO1NBQU0sSUFBSSxHQUFHLEtBQUssR0FBRyxFQUFFO1FBQ3BCLE9BQU8sa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDeEM7SUFFRCxPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsT0FBZ0IsRUFBRSxLQUFZO0lBQ3JELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdEMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ1osT0FBTztLQUNWO0lBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUU7UUFDckMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUMxQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDZixPQUFPLEtBQUssQ0FBQztTQUNoQjtLQUNKO0FBQ0wsQ0FBQztBQUVELElBQUksRUFBRSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcblxyXG5jb25zdCBTVE9SQUdFX0tFWSA9IFwiY3Jvc3N3b3JkX3N0b3JhZ2VcIjtcclxuY29uc3QgQ0VMTF9JTlRFUklPUl9TSVpFID0gMjQ7XHJcbmNvbnN0IENFTExfUEFERElORyA9IDQ7XHJcbmNvbnN0IENFTExfU0laRSA9IENFTExfSU5URVJJT1JfU0laRSArIENFTExfUEFERElORyAqIDI7XHJcbmNvbnN0IE1BWF9HRU5TID0gMTAwMDtcclxuXHJcbmludGVyZmFjZSBIaW50QW5zd2VyIHtcclxuICAgIGhpbnQ6IHN0cmluZyxcclxuICAgIGFuc3dlcjogc3RyaW5nLFxyXG59XHJcblxyXG5lbnVtIERpcmVjdGlvbiB7XHJcbiAgICBBY3Jvc3MsXHJcbiAgICBEb3duLFxyXG59XHJcblxyXG5pbnRlcmZhY2UgRW50cnkge1xyXG4gICAgbnVtOiBudW1iZXIsXHJcbiAgICBoaW50OiBzdHJpbmcsXHJcbiAgICBhbnN3ZXI6IHN0cmluZyxcclxuICAgIHBvczogZ2VvLlBvaW50LFxyXG4gICAgZGlyOiBEaXJlY3Rpb24sXHJcbiAgICBzb2x2ZWQ6IGJvb2xlYW4sXHJcbn1cclxuXHJcbmNsYXNzIExldHRlck1hcCB7XHJcbiAgICBwcml2YXRlIGRhdGE6IE1hcDxudW1iZXIsIHN0cmluZz47XHJcblxyXG4gICAgY29uc3RydWN0b3IocHVibGljIHJvd3M6IG51bWJlciwgcHVibGljIGNvbHM6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMuZGF0YSA9IG5ldyBNYXA8bnVtYmVyLCBzdHJpbmc+KCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0KHh5OiBnZW8uUG9pbnQpOiBzdHJpbmcge1xyXG4gICAgICAgIGNvbnN0IGlkID0gdGhpcy5mbGF0KHh5KTtcclxuICAgICAgICByZXR1cm4gdGhpcy5kYXRhLmdldChpZCkgPz8gXCJcIjtcclxuICAgIH1cclxuXHJcbiAgICBzZXQoeHk6IGdlby5Qb2ludCwgdmFsdWU6IHN0cmluZykge1xyXG4gICAgICAgIGNvbnN0IGlkID0gdGhpcy5mbGF0KHh5KTtcclxuXHJcbiAgICAgICAgaWYgKCF2YWx1ZSkge1xyXG4gICAgICAgICAgICB0aGlzLmRhdGEuZGVsZXRlKGlkKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kYXRhLnNldChpZCwgdmFsdWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGtleXMoKTogZ2VvLlBvaW50W10ge1xyXG4gICAgICAgIHJldHVybiBbLi4udGhpcy5kYXRhLmtleXMoKV0ubWFwKGsgPT4gdGhpcy5oaWVyKGspKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZsYXQoeHk6IGdlby5Qb2ludCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHh5LnkgKiB0aGlzLmNvbHMgKyB4eS54XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoaWVyKG46IG51bWJlcik6IGdlby5Qb2ludCB7XHJcbiAgICAgICAgY29uc3QgeSA9IE1hdGguZmxvb3IobiAvIHRoaXMuY29scyk7XHJcbiAgICAgICAgY29uc3QgeCA9IG4gLSB5ICogdGhpcy5jb2xzO1xyXG4gICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KHgsIHkpO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBQb2ludFNldCB7XHJcbiAgICBwcml2YXRlIGRhdGE6IFNldDxudW1iZXI+O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyByb3dzOiBudW1iZXIsIHB1YmxpYyBjb2xzOiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLmRhdGEgPSBuZXcgU2V0PG51bWJlcj4oKTtcclxuICAgIH1cclxuXHJcbiAgICBoYXMoeHk6IGdlby5Qb2ludCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGNvbnN0IGlkID0gdGhpcy5mbGF0KHh5KTtcclxuICAgICAgICByZXR1cm4gdGhpcy5kYXRhLmhhcyhpZCk7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkKHh5OiBnZW8uUG9pbnQpIHtcclxuICAgICAgICBjb25zdCBpZCA9IHRoaXMuZmxhdCh4eSk7XHJcbiAgICAgICAgdGhpcy5kYXRhLmFkZChpZCk7XHJcbiAgICB9XHJcblxyXG4gICAga2V5cygpOiBnZW8uUG9pbnRbXSB7XHJcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLmRhdGFdLm1hcChrID0+IHRoaXMuaGllcihrKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmbGF0KHh5OiBnZW8uUG9pbnQpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB4eS55ICogdGhpcy5jb2xzICsgeHkueFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGllcihuOiBudW1iZXIpOiBnZW8uUG9pbnQge1xyXG4gICAgICAgIGNvbnN0IHkgPSBNYXRoLmZsb29yKG4gLyB0aGlzLmNvbHMpO1xyXG4gICAgICAgIGNvbnN0IHggPSBuIC0geSAqIHRoaXMuY29scztcclxuICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCh4LCB5KTtcclxuICAgIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIFB1enpsZSB7XHJcbiAgICBlbnRyaWVzOiBFbnRyeVtdLFxyXG4gICAgaG92ZXJDb29yZHM6IGdlby5Qb2ludCB8IG51bGwsXHJcbiAgICBjdXJzb3JDb29yZHM6IGdlby5Qb2ludCB8IG51bGwsXHJcbiAgICBjdXJzb3JEaXI6IERpcmVjdGlvbixcclxuICAgIGdyaWQ6IExldHRlck1hcCxcclxuICAgIHByaW50OiBib29sZWFuLFxyXG59XHJcblxyXG5lbnVtIE1vZGUge1xyXG4gICAgQ3JlYXRlLFxyXG4gICAgUGxheVxyXG59XHJcblxyXG5pbnRlcmZhY2UgQXBwU3RhdGUge1xyXG4gICAgbW9kZTogTW9kZSxcclxuICAgIGhpbnRBbnN3ZXJzOiBIaW50QW5zd2VyW10sXHJcbiAgICBwdXp6bGU6IFB1enpsZSxcclxufVxyXG5cclxuZnVuY3Rpb24gbWFpbigpIHtcclxuICAgIGxldCBoaW50QW5zd2VycyA9IG5ldyBBcnJheTxIaW50QW5zd2VyPigpO1xyXG5cclxuICAgIGNvbnN0IHB1enpsZSA9IDxQdXp6bGU+e1xyXG4gICAgICAgIGVudHJpZXM6IG5ldyBBcnJheTxFbnRyeT4oKSxcclxuICAgICAgICBob3ZlckNvb3JkczogbnVsbCxcclxuICAgICAgICBjdXJzb3JDb29yZHM6IG51bGwsXHJcbiAgICAgICAgY3Vyc29yRGlyOiBEaXJlY3Rpb24uQWNyb3NzLFxyXG4gICAgICAgIGdyaWQ6IG5ldyBMZXR0ZXJNYXAoMCwgMCksXHJcbiAgICAgICAgcHJpbnQ6IGZhbHNlLFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVVaSA9IGRvbS5ieUlkKFwiY3JlYXRlVWlcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbiAgICBjb25zdCBwbGF5VWkgPSBkb20uYnlJZChcInBsYXlVaVwiKSBhcyBIVE1MRGl2RWxlbWVudDtcclxuICAgIGNvbnN0IHB1enpsZUNhbnZhcyA9IGRvbS5ieUlkKFwicHV6emxlQ2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50O1xyXG4gICAgY29uc3QgcHV6emxlQ29udGV4dCA9IHB1enpsZUNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikgYXMgQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEO1xyXG4gICAgaWYgKCFwdXp6bGVDb250ZXh0KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FudmFzIGVsZW1lbnQgbm90IHN1cHBvcnRlZFwiKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGhpbnRBbnN3ZXJGb3JtID0gZG9tLmJ5SWQoXCJoaW50QW5zd2VyRm9ybVwiKSBhcyBIVE1MRm9ybUVsZW1lbnQ7XHJcbiAgICBjb25zdCBoaW50SW5wdXQgPSBkb20uYnlJZChcImhpbnRcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGFuc3dlcklucHV0ID0gZG9tLmJ5SWQoXCJhbnN3ZXJcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGhpbnRBbnN3ZXJUZW1wbGF0ZSA9IGRvbS5ieUlkKFwiaGludEFuc3dlclRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XHJcbiAgICBjb25zdCBoaW50QW5zd2VyTGlzdCA9IGRvbS5ieUlkKFwiaGludEFuc3dlcnNcIikgYXMgSFRNTE9MaXN0RWxlbWVudDtcclxuICAgIGNvbnN0IHB1enpsZUhpbnRUZW1wbGF0ZSA9IGRvbS5ieUlkKFwicHV6emxlSGludFRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XHJcbiAgICBjb25zdCBwdXp6bGVIaW50QWNyb3NzTGlzdCA9IGRvbS5ieUlkKFwicHV6emxlSGludHNBY3Jvc3NcIikgYXMgSFRNTE9MaXN0RWxlbWVudDtcclxuICAgIGNvbnN0IHB1enpsZUhpbnREb3duTGlzdCA9IGRvbS5ieUlkKFwicHV6emxlSGludHNEb3duXCIpIGFzIEhUTUxPTGlzdEVsZW1lbnQ7XHJcbiAgICBjb25zdCBjcmVhdGVCdXR0b24gPSBkb20uYnlJZChcImNyZWF0ZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IGNsZWFyQnV0dG9uID0gZG9tLmJ5SWQoXCJjbGVhckJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IHJldHVyblRvQ3JlYXRlID0gZG9tLmJ5SWQoXCJyZXR1cm5Ub0NyZWF0ZVwiKSBhcyBIVE1MTGlua0VsZW1lbnQ7XHJcbiAgICAvLyBjb25zdCBzZWVkID0gcmFuZC54bXVyMyhuZXcgRGF0ZSgpLnRvU3RyaW5nKCkpO1xyXG4gICAgLy8gY29uc3Qgcm5nID0gbmV3IHJhbmQuU0ZDMzJSTkcoc2VlZCgpLCBzZWVkKCksIHNlZWQoKSwgc2VlZCgpKTtcclxuICAgIGNvbnN0IHJuZyA9IG5ldyByYW5kLlNGQzMyUk5HKDEsIDIsIDMsIDQpO1xyXG4gICAgaGludEFuc3dlckZvcm0uYWRkRXZlbnRMaXN0ZW5lcihcInN1Ym1pdFwiLCBhZGRIaW50QW5zd2VyKTtcclxuICAgIGNyZWF0ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gZ2VuZXJhdGUoKSk7XHJcbiAgICBjbGVhckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY2xlYXIpO1xyXG4gICAgcmV0dXJuVG9DcmVhdGUuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNyZWF0ZSk7XHJcbiAgICBwdXp6bGVDYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJtb3ZlXCIsIG9uUHV6emxlUG9pbnRlck1vdmUpO1xyXG4gICAgcHV6emxlQ2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVyZG93blwiLCBvblB1enpsZVBvaW50ZXJEb3duKTtcclxuICAgIHB1enpsZUNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcm91dFwiLCBvblB1enpsZVBvaW50ZXJPdXQpO1xyXG4gICAgcHV6emxlQ2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIG9uUHV6emxlS2V5ZG93bik7XHJcblxyXG4gICAgZG9tLmRlbGVnYXRlKGhpbnRBbnN3ZXJMaXN0LCBcImNsaWNrXCIsIFwiLmRlbGV0ZS1idXR0b25cIiwgZGVsZXRlSGludEFuc3dlcik7XHJcbiAgICBkb20uZGVsZWdhdGUocHV6emxlSGludEFjcm9zc0xpc3QsIFwiY2xpY2tcIiwgXCIucHV6emxlLWhpbnQtbGlcIiwgb25QdXp6bGVIaW50Q2xpY2spO1xyXG4gICAgZG9tLmRlbGVnYXRlKHB1enpsZUhpbnREb3duTGlzdCwgXCJjbGlja1wiLCBcIi5wdXp6bGUtaGludC1saVwiLCBvblB1enpsZUhpbnRDbGljayk7XHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXByaW50XCIsIG9uQmVmb3JlUHJpbnQpO1xyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJhZnRlcnByaW50XCIsIG9uQWZ0ZXJQcmludCk7XHJcblxyXG4gICAgbG9hZCgpO1xyXG5cclxuICAgIGZ1bmN0aW9uIGFkZEhpbnRBbnN3ZXIoZTogRXZlbnQpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGhpbnQgPSBoaW50SW5wdXQudmFsdWU7XHJcbiAgICAgICAgY29uc3QgYW5zd2VyID0gYW5zd2VySW5wdXQudmFsdWU7XHJcbiAgICAgICAgaWYgKCFoaW50IHx8ICFhbnN3ZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBoaW50QW5zd2Vycy5wdXNoKHsgaGludCwgYW5zd2VyIH0pO1xyXG4gICAgICAgIHNhdmUoKTtcclxuXHJcbiAgICAgICAgdXBkYXRlSGludEFuc3dlckxpc3QoKTtcclxuXHJcbiAgICAgICAgaGludElucHV0LnZhbHVlID0gXCJcIjtcclxuICAgICAgICBhbnN3ZXJJbnB1dC52YWx1ZSA9IFwiXCI7XHJcbiAgICAgICAgaGludElucHV0LmZvY3VzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlSGludEFuc3dlckxpc3QoKSB7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKGhpbnRBbnN3ZXJMaXN0KTtcclxuICAgICAgICBmb3IgKGNvbnN0IGhpbnRBbnN3ZXIgb2YgaGludEFuc3dlcnMpIHtcclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBoaW50QW5zd2VyVGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudDtcclxuICAgICAgICAgICAgY29uc3QgaGludFNwYW4gPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaGludFwiKTtcclxuICAgICAgICAgICAgY29uc3QgYW5zd2VyU3BhbiA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5hbnN3ZXJcIik7XHJcbiAgICAgICAgICAgIGhpbnRTcGFuLnRleHRDb250ZW50ID0gaGludEFuc3dlci5oaW50O1xyXG4gICAgICAgICAgICBhbnN3ZXJTcGFuLnRleHRDb250ZW50ID0gaGludEFuc3dlci5hbnN3ZXI7XHJcbiAgICAgICAgICAgIGhpbnRBbnN3ZXJMaXN0LmFwcGVuZENoaWxkKGZyYWdtZW50KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2xlYXIoKSB7XHJcbiAgICAgICAgaGludEFuc3dlcnMgPSBbXTtcclxuICAgICAgICB1cGRhdGVIaW50QW5zd2VyTGlzdCgpO1xyXG4gICAgICAgIHNhdmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWxldGVIaW50QW5zd2VyKGU6IEV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgY29uc3QgbGkgPSB0YXJnZXQuY2xvc2VzdChcIi5oaW50LWFuc3dlci1saVwiKSBhcyBIVE1MTElFbGVtZW50O1xyXG4gICAgICAgIGNvbnN0IHBhcmVudCA9IGxpLnBhcmVudEVsZW1lbnQ7XHJcbiAgICAgICAgaWYgKCFwYXJlbnQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaW5kZXggPSBBcnJheS5mcm9tKHBhcmVudC5jaGlsZHJlbikuaW5kZXhPZihsaSk7XHJcbiAgICAgICAgaGludEFuc3dlcnMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICBzYXZlKCk7XHJcbiAgICAgICAgdXBkYXRlSGludEFuc3dlckxpc3QoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBsb2FkKCkge1xyXG4gICAgICAgIGNvbnN0IGpzb25EYXRhID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oU1RPUkFHRV9LRVkpO1xyXG4gICAgICAgIGlmICghanNvbkRhdGEpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaGludEFuc3dlcnMgPSBKU09OLnBhcnNlKGpzb25EYXRhKSBhcyBbSGludEFuc3dlcl07XHJcbiAgICAgICAgdXBkYXRlSGludEFuc3dlckxpc3QoKTtcclxuXHJcbiAgICAgICAgaWYgKGhpbnRBbnN3ZXJzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgZ2VuZXJhdGUoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2F2ZSgpIHtcclxuICAgICAgICBjb25zdCBqc29uRGF0YSA9IEpTT04uc3RyaW5naWZ5KGhpbnRBbnN3ZXJzKTtcclxuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShTVE9SQUdFX0tFWSwganNvbkRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlKCkge1xyXG4gICAgICAgIHB1enpsZS5lbnRyaWVzID0gW107XHJcbiAgICAgICAgcHV6emxlLmVudHJpZXMgPSBnZW5lcmF0ZVB1enpsZShybmcsIGhpbnRBbnN3ZXJzKTtcclxuICAgICAgICBpZiAocHV6emxlLmVudHJpZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGFsZXJ0KFwiRmFpbGVkIHRvIGdlbmVyYXRlIHB1enpsZVwiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgcm93cyA9IE1hdGgubWF4KC4uLnB1enpsZS5lbnRyaWVzLm1hcCh4ID0+IHgucG9zLnggKyBlbnRyeVdpZHRoKHgpKSk7XHJcbiAgICAgICAgY29uc3QgY29scyA9IE1hdGgubWF4KC4uLnB1enpsZS5lbnRyaWVzLm1hcCh4ID0+IHgucG9zLnkgKyBlbnRyeUhlaWdodCh4KSkpO1xyXG4gICAgICAgIHB1enpsZS5ncmlkID0gbmV3IExldHRlck1hcChyb3dzLCBjb2xzKTtcclxuXHJcbiAgICAgICAgcGxheSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBsYXkoKSB7XHJcbiAgICAgICAgY3JlYXRlVWkuaGlkZGVuID0gdHJ1ZTtcclxuICAgICAgICBwbGF5VWkuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgcHV6emxlQ2FudmFzLndpZHRoID0gcHV6emxlQ2FudmFzLmNsaWVudFdpZHRoO1xyXG4gICAgICAgIHB1enpsZUNhbnZhcy5oZWlnaHQgPSBwdXp6bGVDYW52YXMuY2xpZW50SGVpZ2h0O1xyXG4gICAgICAgIHVwZGF0ZVB1enpsZUhpbnRMaXN0KCk7XHJcbiAgICAgICAgd2luZG93LnNjcm9sbFRvKHsgbGVmdDogMCwgdG9wOiAwIH0pO1xyXG4gICAgICAgIHB1enpsZUNhbnZhcy5mb2N1cygpO1xyXG5cclxuICAgICAgICBpZiAocHV6emxlLmVudHJpZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBwdXp6bGUuY3Vyc29yQ29vcmRzID0gcHV6emxlLmVudHJpZXNbMF0ucG9zO1xyXG4gICAgICAgICAgICBwdXp6bGUuY3Vyc29yRGlyID0gcHV6emxlLmVudHJpZXNbMF0uZGlyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY3JlYXRlKCkge1xyXG4gICAgICAgIHBsYXlVaS5oaWRkZW4gPSB0cnVlO1xyXG4gICAgICAgIGNyZWF0ZVVpLmhpZGRlbiA9IGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZVB1enpsZUhpbnRMaXN0KCkge1xyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbihwdXp6bGVIaW50QWNyb3NzTGlzdCk7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHB1enpsZUhpbnREb3duTGlzdCk7XHJcbiAgICAgICAgY29uc3QgZW50cmllcyA9IHB1enpsZS5lbnRyaWVzO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVudHJpZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgZW50cnkgPSBlbnRyaWVzW2ldO1xyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHB1enpsZUhpbnRUZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50O1xyXG4gICAgICAgICAgICBjb25zdCBoaW50TGkgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIucHV6emxlLWhpbnQtbGlcIikgYXMgSFRNTExJRWxlbWVudDtcclxuICAgICAgICAgICAgaGludExpLnRleHRDb250ZW50ID0gYCR7ZW50cnkubnVtfS4gJHtlbnRyeS5oaW50fWA7XHJcbiAgICAgICAgICAgIGhpbnRMaS5kYXRhc2V0LmVudHJ5SW5kZXggPSBgJHtpfWA7XHJcblxyXG4gICAgICAgICAgICBpZiAoZW50cnkuc29sdmVkKSB7XHJcbiAgICAgICAgICAgICAgICBoaW50TGkuY2xhc3NMaXN0LmFkZChcInNvbHZlZFwiKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGVudHJ5LmRpciA9PT0gRGlyZWN0aW9uLkFjcm9zcykge1xyXG4gICAgICAgICAgICAgICAgcHV6emxlSGludEFjcm9zc0xpc3QuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBwdXp6bGVIaW50RG93bkxpc3QuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QdXp6bGVQb2ludGVyTW92ZShldnQ6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IGN4eSA9IG5ldyBnZW8uUG9pbnQoZXZ0Lm9mZnNldFgsIGV2dC5vZmZzZXRZKTtcclxuICAgICAgICBwdXp6bGUuaG92ZXJDb29yZHMgPSBjYW52YXNDb29yZHNUb0NlbGxDb29yZHMoY3h5KTtcclxuICAgICAgICBkcmF3UHV6emxlKHB1enpsZUNhbnZhcywgcHV6emxlQ29udGV4dCwgcHV6emxlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvblB1enpsZVBvaW50ZXJEb3duKGV2dDogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgeHkgPSBjYW52YXNDb29yZHNUb0NlbGxDb29yZHMobmV3IGdlby5Qb2ludChldnQub2Zmc2V0WCwgZXZ0Lm9mZnNldFkpKTtcclxuICAgICAgICBjb25zdCBwZGlyID0gcGVycChwdXp6bGUuY3Vyc29yRGlyKTtcclxuICAgICAgICBjb25zdCBlbnRyaWVzQXRDZWxsID0gZmluZEVudHJpZXNBdENlbGwocHV6emxlLmVudHJpZXMsIHh5KTtcclxuXHJcbiAgICAgICAgLy8gbm8gZW50cmllcyBhdCBjZWxsLCBjYW4ndCBwbGFjZSBjdXJzb3IgaGVyZVxyXG4gICAgICAgIGlmICghZW50cmllc0F0Q2VsbC5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc3dpdGNoIGRpcmVjdGlvbnMgaWYgYXQgc2FtZSBjZWxsXHJcbiAgICAgICAgaWYgKHB1enpsZS5jdXJzb3JDb29yZHMgJiYgeHkuZXF1YWwocHV6emxlLmN1cnNvckNvb3JkcykgJiYgZW50cmllc0F0Q2VsbC5zb21lKHggPT4geC5kaXIgPT09IHBkaXIpKSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5jdXJzb3JEaXIgPSBwZGlyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaWYgY3VycmVudCBjdXJzb3IgZGlyZWN0aW9uIGRvZXMgbm90IGFsaWduIHdpdGggYSB3b3JkIGF0IHRoZSBjZWxsLCBzd2l0Y2ggZGlyZWN0aW9uXHJcbiAgICAgICAgaWYgKCFlbnRyaWVzQXRDZWxsLnNvbWUoeCA9PiB4LmRpciA9PT0gcHV6emxlLmN1cnNvckRpcikpIHtcclxuICAgICAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IHBlcnAocHV6emxlLmN1cnNvckRpcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdXp6bGUuY3Vyc29yQ29vcmRzID0geHk7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QdXp6bGVQb2ludGVyT3V0KCkge1xyXG4gICAgICAgIHB1enpsZS5ob3ZlckNvb3JkcyA9IG51bGw7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QdXp6bGVLZXlkb3duKGV2dDogS2V5Ym9hcmRFdmVudCkge1xyXG4gICAgICAgIGlmICghcHV6emxlLmN1cnNvckNvb3Jkcykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlbnRyaWVzQXRDZWxsID0gZmluZEVudHJpZXNBdENlbGwocHV6emxlLmVudHJpZXMsIHB1enpsZS5jdXJzb3JDb29yZHMpO1xyXG4gICAgICAgIGlmIChlbnRyaWVzQXRDZWxsLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzb2x2ZWRBdENlbGwgPSBlbnRyaWVzQXRDZWxsLnNvbWUoeCA9PiB4LnNvbHZlZCk7XHJcbiAgICAgICAgaWYgKCFldnQua2V5KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhhbmRsZSBjb250cm9sL2Fycm93IGtleXNcclxuICAgICAgICBpZiAoZXZ0LmtleSA9PT0gXCJEZWxldGVcIiAmJiAhc29sdmVkQXRDZWxsKSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5ncmlkLnNldChwdXp6bGUuY3Vyc29yQ29vcmRzLCBcIlwiKTtcclxuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB2ID0gZ2V0Q29udHJvbEtleVZlY3RvcihwdXp6bGUuY3Vyc29yRGlyLCBldnQua2V5LCBldnQuc2hpZnRLZXkpO1xyXG4gICAgICAgIGlmICh2LnggIT09IDAgfHwgdi55ICE9PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvb3JkcyA9IHB1enpsZS5jdXJzb3JDb29yZHMuYWRkUG9pbnQodik7XHJcbiAgICAgICAgICAgIGNvbnN0IGVudHJpZXNBdE5ld0NlbGwgPSBmaW5kRW50cmllc0F0Q2VsbChwdXp6bGUuZW50cmllcywgY29vcmRzKTtcclxuICAgICAgICAgICAgY29uc3Qgc29sdmVkQXROZXdDZWxsID0gZW50cmllc0F0Q2VsbC5zb21lKHggPT4geC5zb2x2ZWQpO1xyXG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChldnQua2V5ID09PSBcIiBcIiAmJiAhc29sdmVkQXRDZWxsKSB7XHJcbiAgICAgICAgICAgICAgICBwdXp6bGUuZ3JpZC5zZXQocHV6emxlLmN1cnNvckNvb3JkcywgXCJcIik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChlbnRyaWVzQXROZXdDZWxsLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBjb29yZHM7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXZ0LmtleSA9PT0gXCJCYWNrc3BhY2VcIiAmJiAhc29sdmVkQXROZXdDZWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHV6emxlLmdyaWQuc2V0KHB1enpsZS5jdXJzb3JDb29yZHMsIFwiXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZXZ0LmtleS5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChldnQua2V5Lmxlbmd0aCAhPT0gMSB8fCAhZXZ0LmtleS5tYXRjaCgvW2Etel0vaSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbGV0dGVyID0gZXZ0LmtleS50b1VwcGVyQ2FzZSgpO1xyXG5cclxuICAgICAgICBpZiAoZW50cmllc0F0Q2VsbC5zb21lKHggPT4geC5zb2x2ZWQpICYmIGxldHRlciAhPT0gcHV6emxlLmdyaWQuZ2V0KHB1enpsZS5jdXJzb3JDb29yZHMpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwdXp6bGUuZ3JpZC5zZXQocHV6emxlLmN1cnNvckNvb3JkcywgbGV0dGVyKTtcclxuXHJcbiAgICAgICAgLy8gY2hlY2sgZm9yIGNvbXBsZXRlIHdvcmRcclxuICAgICAgICBsZXQgYW55U29sdmVkID0gZmFsc2U7XHJcbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzQXRDZWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNvbHZlZCA9IGVudHJ5U29sdmVkKGVudHJ5LCBwdXp6bGUuZ3JpZCk7XHJcbiAgICAgICAgICAgIGlmICghZW50cnkuc29sdmVkICYmIHNvbHZlZCkge1xyXG4gICAgICAgICAgICAgICAgZW50cnkuc29sdmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGFueVNvbHZlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGNoZWNrIGZvciBkb25lXHJcbiAgICAgICAgaWYgKHB1enpsZS5lbnRyaWVzLmV2ZXJ5KGUgPT4gZS5zb2x2ZWQpKSB7XHJcbiAgICAgICAgICAgIG9uUHV6emxlU29sdmVkKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhZHZhbmNlIGN1cnNvclxyXG4gICAgICAgIGlmIChhbnlTb2x2ZWQpIHtcclxuICAgICAgICAgICAgY29uc3QgZW50cnkgPSBuZXh0VW5zb2x2ZWRFbnRyeShwdXp6bGUuZW50cmllcywgZW50cmllc0F0Q2VsbFswXSk7XHJcbiAgICAgICAgICAgIGlmIChlbnRyeSkge1xyXG4gICAgICAgICAgICAgICAgcHV6emxlLmN1cnNvckNvb3JkcyA9IGVudHJ5LnBvcztcclxuICAgICAgICAgICAgICAgIHB1enpsZS5jdXJzb3JEaXIgPSBlbnRyeS5kaXI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zdCBhZHZhbmNlZEN1cnNvciA9IHB1enpsZS5jdXJzb3JDb29yZHMuYWRkUG9pbnQoZ2V0RGlyZWN0aW9uVmVjdG9yKHB1enpsZS5jdXJzb3JEaXIpKTtcclxuICAgICAgICAgICAgaWYgKGZpbmRFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBhZHZhbmNlZEN1cnNvcikubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcHV6emxlLmN1cnNvckNvb3JkcyA9IHB1enpsZS5jdXJzb3JDb29yZHMuYWRkUG9pbnQoZ2V0RGlyZWN0aW9uVmVjdG9yKHB1enpsZS5jdXJzb3JEaXIpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICAgICAgdXBkYXRlUHV6emxlSGludExpc3QoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvblB1enpsZUhpbnRDbGljayhlOiBFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIGNvbnN0IGxpID0gdGFyZ2V0LmNsb3Nlc3QoXCIucHV6emxlLWhpbnQtbGlcIikgYXMgSFRNTExJRWxlbWVudDtcclxuICAgICAgICBjb25zdCBlbnRyeUluZGV4U3RyaW5nID0gbGk/LmRhdGFzZXQ/LmVudHJ5SW5kZXg7XHJcbiAgICAgICAgaWYgKCFlbnRyeUluZGV4U3RyaW5nKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGVudHJ5SW5kZXggPSBwYXJzZUludChlbnRyeUluZGV4U3RyaW5nKTtcclxuICAgICAgICBjb25zdCBlbnRyeSA9IHB1enpsZS5lbnRyaWVzW2VudHJ5SW5kZXhdO1xyXG4gICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBlbnRyeS5wb3M7XHJcbiAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IGVudHJ5LmRpcjtcclxuICAgICAgICBkcmF3UHV6emxlKHB1enpsZUNhbnZhcywgcHV6emxlQ29udGV4dCwgcHV6emxlKTtcclxuICAgICAgICBwdXp6bGVDYW52YXMuZm9jdXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvblB1enpsZVNvbHZlZCgpIHtcclxuICAgICAgICBhbGVydChcIllPVSBTT0xWRUQgVEhFIFBVWlpMRSEgQlJBVk8hXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uQmVmb3JlUHJpbnQoKSB7XHJcbiAgICAgICAgcHV6emxlLnByaW50ID0gdHJ1ZTtcclxuICAgICAgICBkcmF3UHV6emxlKHB1enpsZUNhbnZhcywgcHV6emxlQ29udGV4dCwgcHV6emxlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvbkFmdGVyUHJpbnQoKSB7XHJcbiAgICAgICAgcHV6emxlLnByaW50ID0gZmFsc2U7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJuZERpcihybmc6IHJhbmQuUk5HKTogRGlyZWN0aW9uIHtcclxuICAgIGNvbnN0IGRpcmVjdGlvbnMgPSBbRGlyZWN0aW9uLkFjcm9zcywgRGlyZWN0aW9uLkRvd25dO1xyXG4gICAgcmV0dXJuIHJhbmQuY2hvb3NlKHJuZywgZGlyZWN0aW9ucyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBlcnAoZGlyOiBEaXJlY3Rpb24pOiBEaXJlY3Rpb24ge1xyXG4gICAgaWYgKGRpciA9PSBEaXJlY3Rpb24uQWNyb3NzKSB7XHJcbiAgICAgICAgcmV0dXJuIERpcmVjdGlvbi5Eb3duO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBEaXJlY3Rpb24uQWNyb3NzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVB1enpsZShybmc6IHJhbmQuUk5HLCBoaW50QW5zd2VyczogSGludEFuc3dlcltdKTogRW50cnlbXSB7XHJcbiAgICBpZiAoaGludEFuc3dlcnMubGVuZ3RoID09IDApIHtcclxuICAgICAgICBhbGVydChcIlBsZWFzZSBlbnRlciBhdCBsZWFzdCBvbmUgaGludCBhbmQgYW5zd2VyIVwiKTtcclxuICAgICAgICByZXR1cm4gW107XHJcbiAgICB9XHJcblxyXG4gICAgLy8gbWFrZSBhbGwgYW5zd2VycyBsb3dlcmNhc2VcclxuICAgIGZvciAoY29uc3QgaGEgb2YgaGludEFuc3dlcnMpIHtcclxuICAgICAgICBoYS5hbnN3ZXIgPSBoYS5hbnN3ZXIudG9Mb2NhbGVVcHBlckNhc2UoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyByZXRyeSB1bnRpbCBzdWNjZXNzZnVsICh1cCB0byBhIGNlcnRhaW4gYW1vdW50KVxyXG4gICAgY29uc3QgcHV6emxlcyA9IG5ldyBBcnJheTxFbnRyeVtdPigpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNQVhfR0VOUzsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgZW50cmllcyA9IHRyeUdlbmVyYXRlUHV6emxlKHJuZywgaGludEFuc3dlcnMpO1xyXG4gICAgICAgIGlmIChlbnRyaWVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1enpsZXMucHVzaChlbnRyaWVzKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocHV6emxlcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm4gW107XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZW50cmllcyA9IHB1enpsZXMucmVkdWNlKChwcmV2LCBjdXIpID0+IGNhbGNTY29yZShwcmV2KSA8IGNhbGNTY29yZShjdXIpID8gcHJldiA6IGN1cik7XHJcbiAgICBlbnRyaWVzLnNvcnQoKHgsIHkpID0+IHtcclxuICAgICAgICBjb25zdCBkbiA9IHgubnVtIC0geS5udW07XHJcbiAgICAgICAgcmV0dXJuIGRuID09PSAwID8geC5kaXIgLSB5LmRpciA6IGRuO1xyXG4gICAgfSk7XHJcblxyXG4gICAgc2hpZnRQdXp6bGUoZW50cmllcyk7XHJcbiAgICByZXR1cm4gZW50cmllcztcclxufVxyXG5cclxuZnVuY3Rpb24gdHJ5R2VuZXJhdGVQdXp6bGUocm5nOiByYW5kLlJORywgaGludEFuc3dlcnM6IEhpbnRBbnN3ZXJbXSk6IEVudHJ5W10ge1xyXG4gICAgcmFuZC5zaHVmZmxlKHJuZywgaGludEFuc3dlcnMpO1xyXG5cclxuICAgIC8vIHBsYWNlIGxvbmdlc3Qgd29yZCBhdCAwLDAgcmFuZG9tbHkgYWNyb3NzL2Rvd25cclxuICAgIGNvbnN0IGVudHJpZXMgPSBuZXcgQXJyYXk8RW50cnk+KCk7XHJcbiAgICBlbnRyaWVzLnB1c2gocGxhY2VJbml0aWFsRW50cnkocm5nLCBoaW50QW5zd2Vyc1swXSkpO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgaGludEFuc3dlcnMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCBoYSA9IGhpbnRBbnN3ZXJzW2ldO1xyXG4gICAgICAgIGNvbnN0IGVudHJ5ID0gcGxhY2VOZXh0RW50cnkoZW50cmllcywgaGEpO1xyXG4gICAgICAgIGlmIChlbnRyeSkge1xyXG4gICAgICAgICAgICBlbnRyaWVzLnB1c2goZW50cnkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBbXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGVudHJpZXM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNoaWZ0UHV6emxlKGVudHJpZXM6IEVudHJ5W10pIHtcclxuICAgIC8vIHNoaWZ0IHRoZSBwdXp6bGUgc3VjaCB0aGF0IGFsbCB3b3JkcyBzdGFydCA+PSAoMCwgMClcclxuICAgIGNvbnN0IG1pblggPSBNYXRoLm1pbiguLi5lbnRyaWVzLm1hcCh4ID0+IHgucG9zLngpKTtcclxuICAgIGNvbnN0IG1pblkgPSBNYXRoLm1pbiguLi5lbnRyaWVzLm1hcCh4ID0+IHgucG9zLnkpKTtcclxuICAgIGNvbnN0IHh5ID0gbmV3IGdlby5Qb2ludCgtbWluWCwgLW1pblkpO1xyXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgZW50cnkucG9zID0gZW50cnkucG9zLmFkZFBvaW50KHh5KTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY1Njb3JlKGVudHJpZXM6IEVudHJ5W10pOiBudW1iZXIge1xyXG4gICAgLy8gY2FsY3VsYXRlIHB1enpsZSBzY29yZSxcclxuICAgIC8vIGxvd2VyIGlzIGJldHRlclxyXG4gICAgY29uc3QgeCA9IE1hdGgubWluKC4uLmVudHJpZXMubWFwKGUgPT4gZS5wb3MueCkpO1xyXG4gICAgY29uc3QgeSA9IE1hdGgubWluKC4uLmVudHJpZXMubWFwKGUgPT4gZS5wb3MueSkpO1xyXG4gICAgY29uc3QgdyA9IE1hdGgubWF4KC4uLmVudHJpZXMubWFwKGUgPT4gZS5wb3MueCArIGVudHJ5V2lkdGgoZSkpKSAtIHg7XHJcbiAgICBjb25zdCBoID0gTWF0aC5tYXgoLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy55ICsgZW50cnlIZWlnaHQoZSkpKSAtIHk7XHJcbiAgICByZXR1cm4gdyAqIGg7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlSW5pdGlhbEVudHJ5KHJuZzogcmFuZC5STkcsIGhhOiBIaW50QW5zd2VyKTogRW50cnkge1xyXG4gICAgY29uc3QgeyBoaW50LCBhbnN3ZXIgfSA9IGhhO1xyXG5cclxuICAgIGNvbnN0IGRpciA9IHJuZERpcihybmcpO1xyXG4gICAgLy8gY29uc3QgZGlyID0gRGlyZWN0aW9uLkFjcm9zcztcclxuICAgIGNvbnN0IHBvcyA9IG5ldyBnZW8uUG9pbnQoMCwgMCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBudW06IDEsXHJcbiAgICAgICAgaGludCxcclxuICAgICAgICBhbnN3ZXIsXHJcbiAgICAgICAgcG9zLFxyXG4gICAgICAgIGRpcixcclxuICAgICAgICBzb2x2ZWQ6IGZhbHNlLFxyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VOZXh0RW50cnkoZW50cmllczogRW50cnlbXSwgaGE6IEhpbnRBbnN3ZXIpOiBFbnRyeSB8IHVuZGVmaW5lZCB7XHJcbiAgICBjb25zdCB7IGhpbnQsIGFuc3dlciB9ID0gaGE7XHJcblxyXG4gICAgLy8gZmluZCBuZXh0IHBvc3NpYmxlIGludGVyc2VjdGlvbiB3aXRoIGV4aXN0aW5nIHdvcmRzXHJcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICAvLyBmaW5kIG5leHQgY29tbW9uIGxldHRlclxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZW50cnkuYW5zd2VyLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgYW5zd2VyLmxlbmd0aDsgKytqKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkuYW5zd2VyW2ldID09PSBhbnN3ZXJbal0pIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyB0cnkgcGxhY2luZyB0aGUgd29yZCBoZXJlXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaSA9IGluZGV4IGluIGFscmVhZHkgcGxhY2VkIHdvcmRcclxuICAgICAgICAgICAgICAgICAgICAvLyBqID0gaW5kZXggaW4gdW5wbGFjZWQgd29yZFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHdvcmQgaXMgdmVydGljYWwsIHBsYWNlIGhvcml6b250YWxcclxuICAgICAgICAgICAgICAgICAgICAvLyBpZiB3b3JkIGlzIGhvcml6b250YWwsIHBsYWNlIHZlcnRpY2FsXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tbW9uUG9zID0gZ2V0Q2hhclBvc2l0aW9uKGVudHJ5LnBvcywgZW50cnkuZGlyLCBpKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXIgPSBwZXJwKGVudHJ5LmRpcik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9zID0gZ2V0U3RhcnRQb3NpdGlvbihjb21tb25Qb3MsIGRpciwgaik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVmFsaWRXb3JkUGxhY2VtZW50KGVudHJpZXMsIGFuc3dlciwgcG9zLCBkaXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRvZXMgYW5vdGhlciBlbnRyeSBzdGFydCBoZXJlPyBpZiBzbywgc2hhcmUgaXQncyBudW1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCB1c2UgbWF4ICsgMVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBudW0gPSBlbnRyaWVzLmZpbHRlcih4ID0+IHgucG9zLmVxdWFsKHBvcykpLm1hcCh4ID0+IHgubnVtKVswXSA/PyBNYXRoLm1heCguLi5lbnRyaWVzLm1hcCh4ID0+IHgubnVtICsgMSkpID8/IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGU6IEVudHJ5ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGludCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuc3dlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvbHZlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gbm8gcGxhY2VtZW50IGZvdW5kXHJcbiAgICByZXR1cm47XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldERpcmVjdGlvblZlY3RvcihkaXI6IERpcmVjdGlvbik6IGdlby5Qb2ludCB7XHJcbiAgICBzd2l0Y2ggKGRpcikge1xyXG4gICAgICAgIGNhc2UgRGlyZWN0aW9uLkFjcm9zczpcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMSwgMCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgRGlyZWN0aW9uLkRvd246XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KDAsIDEpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxuXHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGRpcmVjdG9uXCIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkV29yZFBsYWNlbWVudChlbnRyaWVzOiBFbnRyeVtdLCBhbnN3ZXI6IHN0cmluZywgcG9zOiBnZW8uUG9pbnQsIGRpcjogRGlyZWN0aW9uKTogYm9vbGVhbiB7XHJcbiAgICAvLyBjaGVjayBmb3Igb3ZlcmxhcFxyXG4gICAgLy8gY2FzZXM6XHJcbiAgICAvLyBhY3Jvc3MvYWNyb3NzXHJcbiAgICAvLyBkb3duL2Rvd25cclxuICAgIC8vIGFjcm9zcy9kb3duXHJcbiAgICAvLyBkb3duL2Fjcm9zcyAoc3dhcCBhbmQgbWFrZSBzYW1lIGNhc2U/KVxyXG4gICAgLy8gYW55IG92ZXJsYXAgYXQgbm9uLVxyXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgaWYgKCFpc1ZhbGlkUGxhY2VtZW50KGVudHJ5LnBvcywgZW50cnkuYW5zd2VyLCBlbnRyeS5kaXIsIHBvcywgYW5zd2VyLCBkaXIpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmFsaWRQbGFjZW1lbnQocG9zMTogZ2VvLlBvaW50LCBhMTogc3RyaW5nLCBkaXIxOiBEaXJlY3Rpb24sIHBvczI6IGdlby5Qb2ludCwgYTI6IHN0cmluZywgZGlyMjogRGlyZWN0aW9uKTogYm9vbGVhbiB7XHJcbiAgICBpZiAoZGlyMSA9PT0gRGlyZWN0aW9uLkFjcm9zcyAmJiBkaXIyID09PSBEaXJlY3Rpb24uQWNyb3NzKSB7XHJcbiAgICAgICAgcmV0dXJuIGlzVmFsaWRQbGFjZW1lbnRBY3Jvc3NBY3Jvc3MocG9zMSwgYTEsIHBvczIsIGEyKTtcclxuICAgIH0gZWxzZSBpZiAoZGlyMSA9PT0gRGlyZWN0aW9uLkRvd24gJiYgZGlyMiA9PT0gRGlyZWN0aW9uLkRvd24pIHtcclxuICAgICAgICByZXR1cm4gaXNWYWxpZFBsYWNlbWVudERvd25Eb3duKHBvczEsIGExLCBwb3MyLCBhMik7XHJcbiAgICB9IGVsc2UgaWYgKGRpcjEgPT09IERpcmVjdGlvbi5BY3Jvc3MgJiYgZGlyMiA9PT0gRGlyZWN0aW9uLkRvd24pIHtcclxuICAgICAgICByZXR1cm4gaXNWYWxpZFBsYWNlbWVudEFjcm9zc0Rvd24ocG9zMSwgYTEsIHBvczIsIGEyKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gaXNWYWxpZFBsYWNlbWVudERvd25BY3Jvc3MocG9zMSwgYTEsIHBvczIsIGEyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFBsYWNlbWVudEFjcm9zc0Fjcm9zcyhwb3MxOiBnZW8uUG9pbnQsIGExOiBzdHJpbmcsIHBvczI6IGdlby5Qb2ludCwgYTI6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgLy8gaWYgeSBjb29yZHMgbm90IHRvdWNoaW5nLCB2YWxpZFxyXG4gICAgaWYgKE1hdGguYWJzKHBvczEueSAtIHBvczIueSkgPiAxKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gaWYgeCByYW5nZXMgbm90IHRvdWNoaW5nLCB2YWxpZFxyXG4gICAgaWYgKHBvczEueCArIGExLmxlbmd0aCArIDEgPCBwb3MxLnggfHwgcG9zMS54ID4gcG9zMi54ICsgYTIubGVuZ3RoICsgMSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFBsYWNlbWVudERvd25Eb3duKHBvczE6IGdlby5Qb2ludCwgYTE6IHN0cmluZywgcG9zMjogZ2VvLlBvaW50LCBhMjogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAvLyBpZiB5IGNvb3JkcyBub3QgdG91Y2hpbmcsIHZhbGlkXHJcbiAgICBpZiAoTWF0aC5hYnMocG9zMS54IC0gcG9zMi54KSA+IDEpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBpZiB4IHJhbmdlcyBub3QgdG91Y2hpbmcsIHZhbGlkXHJcbiAgICBpZiAocG9zMS55ICsgYTEubGVuZ3RoICsgMSA8IHBvczEueSB8fCBwb3MxLnkgPiBwb3MyLnkgKyBhMi5sZW5ndGggKyAxKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkUGxhY2VtZW50QWNyb3NzRG93bihwb3MxOiBnZW8uUG9pbnQsIGExOiBzdHJpbmcsIHBvczI6IGdlby5Qb2ludCwgYTI6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgLy8gaWYgbm8gb3ZlcmxhcCBvbiB4LWF4aXMgdmFsaWRcclxuICAgIGlmIChwb3MxLnggKyBhMS5sZW5ndGggPCBwb3MyLnggLSAxIHx8IHBvczEueCA+IHBvczIueCArIDEpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBpZiBubyBvdmVybGFwIG9uIHktYXhpcywgdmFsaWRcclxuICAgIGlmIChwb3MxLnkgPCBwb3MyLnkgLSAxIHx8IHBvczEueSA+IHBvczIueSArIGEyLmxlbmd0aCArIDEpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBpZiB0b3VjaGluZyAoaXggb3V0c2lkZSBvZiBlaXRoZXIgd29yZCwgbm90IGEgdmFsaWQgcGxhY2VtZW50KVxyXG4gICAgY29uc3QgaXggPSBuZXcgZ2VvLlBvaW50KHBvczIueCwgcG9zMS55KTtcclxuICAgIGlmIChcclxuICAgICAgICBpeC54IDwgcG9zMS54IHx8IGl4LnggPiBwb3MxLnggKyBhMS5sZW5ndGhcclxuICAgICAgICB8fCBpeC55IDwgcG9zMi55IHx8IGl4LnkgPiBwb3MyLnkgKyBhMi5sZW5ndGgpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGExW2l4LnggLSBwb3MxLnhdID09PSBhMltpeC55IC0gcG9zMi55XTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFBsYWNlbWVudERvd25BY3Jvc3MocG9zMTogZ2VvLlBvaW50LCBhMTogc3RyaW5nLCBwb3MyOiBnZW8uUG9pbnQsIGEyOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBpc1ZhbGlkUGxhY2VtZW50QWNyb3NzRG93bihwb3MyLCBhMiwgcG9zMSwgYTEpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDaGFyUG9zaXRpb24oc3RhcnRQb3NpdGlvbjogZ2VvLlBvaW50LCBkaXI6IERpcmVjdGlvbiwgaW5kZXg6IG51bWJlcik6IGdlby5Qb2ludCB7XHJcbiAgICBjb25zdCB2ID0gZ2V0RGlyZWN0aW9uVmVjdG9yKGRpcik7XHJcbiAgICByZXR1cm4gc3RhcnRQb3NpdGlvbi5hZGRQb2ludCh2Lm11bFNjYWxhcihpbmRleCkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTdGFydFBvc2l0aW9uKGNoYXJQb3NpdGlvbjogZ2VvLlBvaW50LCBkaXI6IERpcmVjdGlvbiwgaW5kZXg6IG51bWJlcik6IGdlby5Qb2ludCB7XHJcbiAgICAvLyBnZXQgdGhlIHN0YXJ0IHBvc2l0aW9uIG9mIGEgd29yZCBnaXZlbiB0aGUgcG9zaXRpb24gb2YgYSBzcGVjaWZpZWQgaW5kZXhcclxuICAgIGNvbnN0IHYgPSBnZXREaXJlY3Rpb25WZWN0b3IoZGlyKTtcclxuICAgIHJldHVybiBjaGFyUG9zaXRpb24uc3ViUG9pbnQodi5tdWxTY2FsYXIoaW5kZXgpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd1B1enpsZShjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50LCBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgcHV6emxlOiBQdXp6bGUpIHtcclxuICAgIGNvbnN0IGxldHRlckZvbnQgPSBcImJvbGQgMTZweCBhcmlhbFwiO1xyXG4gICAgY29uc3QgbnVtYmVyRm9udCA9IFwibm9ybWFsIDEwcHggYXJpYWxcIjtcclxuICAgIGN0eC5mb250ID0gbGV0dGVyRm9udDtcclxuICAgIGNvbnN0IGxldHRlclRleHRIZWlnaHQgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoO1xyXG4gICAgY3R4LmZvbnQgPSBudW1iZXJGb250O1xyXG4gICAgY29uc3QgbnVtYmVyVGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGg7XHJcblxyXG4gICAgLy8gZHJhdyBiYWNrZ3JvdW5kXHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiO1xyXG4gICAgY29uc3QgZW50cmllcyA9IHB1enpsZS5lbnRyaWVzO1xyXG4gICAgY29uc3QgcHcgPSBNYXRoLm1heCguLi5lbnRyaWVzLm1hcChlID0+IGUucG9zLnggKyBlbnRyeVdpZHRoKGUpKSk7XHJcbiAgICBjb25zdCBwaCA9IE1hdGgubWF4KC4uLmVudHJpZXMubWFwKGUgPT4gZS5wb3MueSArIGVudHJ5SGVpZ2h0KGUpKSk7XHJcbiAgICBjb25zdCBjYW52YXNXaWR0aCA9IHB3ICogQ0VMTF9TSVpFO1xyXG4gICAgY29uc3QgY2FudmFzSGVpZ2h0ID0gcGggKiBDRUxMX1NJWkU7XHJcbiAgICBjYW52YXMud2lkdGggPSBjYW52YXNXaWR0aDtcclxuICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXNIZWlnaHQ7XHJcbiAgICBjdHguZmlsbFJlY3QoMCwgMCwgY2FudmFzV2lkdGgsIGNhbnZhc0hlaWdodCk7XHJcblxyXG4gICAgLy8gZHJhdyBsZXR0ZXJzIGFuZCBjZWxsc1xyXG4gICAgY3R4LmZvbnQgPSBcImJvbGQgMThweCBhcmlhbFwiO1xyXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgY29uc3QgeyBwb3MsIGFuc3dlciwgZGlyIH0gPSBlbnRyeTtcclxuICAgICAgICBjb25zdCB2ID0gZ2V0RGlyZWN0aW9uVmVjdG9yKGRpcik7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYW5zd2VyLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHAgPSBwb3MuYWRkUG9pbnQodi5tdWxTY2FsYXIoaSkpO1xyXG4gICAgICAgICAgICBjb25zdCBjeCA9IHAueCAqIENFTExfU0laRTtcclxuICAgICAgICAgICAgY29uc3QgY3kgPSBwLnkgKiBDRUxMX1NJWkU7XHJcblxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJ3aGl0ZVwiO1xyXG4gICAgICAgICAgICBjdHguZmlsbFJlY3QoY3gsIGN5LCBDRUxMX1NJWkUsIENFTExfU0laRSk7XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImJsYWNrXCI7XHJcblxyXG4gICAgICAgICAgICBjdHguZm9udCA9IFwiYm9sZCAxOHB4IGFyaWFsXCI7XHJcbiAgICAgICAgICAgIGN0eC5zdHJva2VSZWN0KGN4LCBjeSwgQ0VMTF9TSVpFLCBDRUxMX1NJWkUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBkcmF3IG51bWJlcnNcclxuICAgIGN0eC5mb250ID0gXCJub3JtYWwgMTBweCBhcmlhbFwiO1xyXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgLy8gZHJhdyBudW1iZXJcclxuICAgICAgICBjb25zdCBjb29yZHMgPSBlbnRyeS5wb3MubXVsU2NhbGFyKENFTExfU0laRSk7XHJcbiAgICAgICAgY3R4LmZpbGxUZXh0KGAke2VudHJ5Lm51bX1gLCBjb29yZHMueCArIDIsIGNvb3Jkcy55ICsgMiArIG51bWJlclRleHRIZWlnaHQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgZW50ZXJlZCBsZXR0ZXJzXHJcbiAgICBjb25zdCBncmlkID0gcHV6emxlLmdyaWQ7XHJcbiAgICBmb3IgKGNvbnN0IGNlbGxDb29yZHMgb2YgZ3JpZC5rZXlzKCkpIHtcclxuICAgICAgICBjb25zdCBsZXR0ZXIgPSBncmlkLmdldChjZWxsQ29vcmRzKTtcclxuICAgICAgICBpZiAoIWxldHRlcikge1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvb3JkcyA9IGNlbGxDb29yZHNUb0NhbnZhc0Nvb3JkcyhjZWxsQ29vcmRzKS5hZGRQb2ludChuZXcgZ2VvLlBvaW50KENFTExfUEFERElORywgQ0VMTF9QQURESU5HKSk7XHJcbiAgICAgICAgY29uc3QgbWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dChsZXR0ZXIpO1xyXG4gICAgICAgIGNvb3Jkcy54ICs9IENFTExfSU5URVJJT1JfU0laRSAvIDIuMDtcclxuICAgICAgICBjb29yZHMueSArPSBDRUxMX0lOVEVSSU9SX1NJWkUgLyAyLjA7XHJcbiAgICAgICAgY29vcmRzLnkgKz0gbGV0dGVyVGV4dEhlaWdodCAvIDIuMDtcclxuICAgICAgICBjb29yZHMueCAtPSBtZXRyaWNzLndpZHRoIC8gMi4wO1xyXG4gICAgICAgIGN0eC5mb250ID0gXCIxNnB4IGFyaWFsXCI7XHJcbiAgICAgICAgY3R4LmZpbGxUZXh0KGxldHRlciwgY29vcmRzLngsIGNvb3Jkcy55KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBkcmF3IHJlZCB3aGVyZSBob3ZlcmluZ1xyXG4gICAgaWYgKHB1enpsZS5ob3ZlckNvb3JkcyAmJiAhcHV6emxlLnByaW50KSB7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMztcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJlZFwiO1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KHB1enpsZS5ob3ZlckNvb3Jkcy54ICogQ0VMTF9TSVpFLCBwdXp6bGUuaG92ZXJDb29yZHMueSAqIENFTExfU0laRSwgQ0VMTF9TSVpFLCBDRUxMX1NJWkUpO1xyXG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZHJhdyBjdXJzb3JcclxuICAgIGlmIChwdXp6bGUuY3Vyc29yQ29vcmRzICYmICFwdXp6bGUucHJpbnQpIHtcclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG5cclxuICAgICAgICBjb25zdCBjYW52YXNDb29yZHMgPSBjZWxsQ29vcmRzVG9DYW52YXNDb29yZHMocHV6emxlLmN1cnNvckNvb3Jkcyk7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDM7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmVkXCI7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5hcmMoY2FudmFzQ29vcmRzLnggKyBDRUxMX1NJWkUgLyAyLjAsIGNhbnZhc0Nvb3Jkcy55ICsgQ0VMTF9TSVpFIC8gMi4wLCAzLCAwLCBNYXRoLlBJICogMik7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuXHJcbiAgICAgICAgLy8gaGlnaGxpZ2h0IHdvcmQgdW5kZXIgY3Vyc29yXHJcbiAgICAgICAgY29uc3QgZW50cmllcyA9IGZpbmRFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBwdXp6bGUuY3Vyc29yQ29vcmRzKS5maWx0ZXIoeCA9PiB4LmRpciA9PT0gcHV6emxlLmN1cnNvckRpcik7XHJcbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGVudHJ5LnNvbHZlZCA/IFwiZ3JlZW5cIiA6IFwicmVkXCI7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgeCwgeSB9ID0gY2VsbENvb3Jkc1RvQ2FudmFzQ29vcmRzKGVudHJ5LnBvcyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gZW50cnlXaWR0aChlbnRyeSkgKiBDRUxMX1NJWkU7XHJcbiAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IGVudHJ5SGVpZ2h0KGVudHJ5KSAqIENFTExfU0laRTtcclxuICAgICAgICAgICAgY3R4LnN0cm9rZVJlY3QoeCwgeSwgd2lkdGgsIGhlaWdodCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjdHgucmVzdG9yZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBlbnRyeVdpZHRoKGVudHJ5OiBFbnRyeSk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gZW50cnkuZGlyID09PSBEaXJlY3Rpb24uQWNyb3NzID8gZW50cnkuYW5zd2VyLmxlbmd0aCA6IDE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVudHJ5SGVpZ2h0KGVudHJ5OiBFbnRyeSk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gZW50cnkuZGlyID09PSBEaXJlY3Rpb24uRG93biA/IGVudHJ5LmFuc3dlci5sZW5ndGggOiAxO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjYW52YXNDb29yZHNUb0NlbGxDb29yZHMoeHk6IGdlby5Qb2ludCk6IGdlby5Qb2ludCB7XHJcbiAgICByZXR1cm4geHkuZGl2U2NhbGFyKENFTExfU0laRSkuZmxvb3IoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2VsbENvb3Jkc1RvQ2FudmFzQ29vcmRzKHh5OiBnZW8uUG9pbnQpOiBnZW8uUG9pbnQge1xyXG4gICAgcmV0dXJuIHh5Lm11bFNjYWxhcihDRUxMX1NJWkUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kRW50cmllc0F0Q2VsbChlbnRyaWVzOiBFbnRyeVtdLCB4eTogZ2VvLlBvaW50KTogRW50cnlbXSB7XHJcbiAgICByZXR1cm4gZW50cmllcy5maWx0ZXIoeCA9PiBlbnRyeUNvbnRhaW5zUG9pbnQoeCwgeHkpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYW55RW50cmllc0F0Q2VsbChlbnRyaWVzOiBFbnRyeVtdLCB4eTogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gZmluZEVudHJpZXNBdENlbGwoZW50cmllcywgeHkpLmxlbmd0aCA+IDA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVudHJ5Q29udGFpbnNQb2ludChlbnRyeTogRW50cnksIHh5OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBlbnRyeS5kaXIgPT09IERpcmVjdGlvbi5BY3Jvc3MgJiYgeHkueSA9PT0gZW50cnkucG9zLnkgJiYgeHkueCA+PSBlbnRyeS5wb3MueCAmJiB4eS54IDwgZW50cnkucG9zLnggKyBlbnRyeS5hbnN3ZXIubGVuZ3RoXHJcbiAgICAgICAgfHwgZW50cnkuZGlyID09PSBEaXJlY3Rpb24uRG93biAmJiB4eS54ID09PSBlbnRyeS5wb3MueCAmJiB4eS55ID49IGVudHJ5LnBvcy55ICYmIHh5LnkgPCBlbnRyeS5wb3MueSArIGVudHJ5LmFuc3dlci5sZW5ndGg7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVudHJ5U29sdmVkKGVudHJ5OiBFbnRyeSwgZ3JpZDogTGV0dGVyTWFwKTogYm9vbGVhbiB7XHJcbiAgICAvLyBjaGVjayBmb3IgY29tcGxldGUgd29yZFxyXG4gICAgY29uc3QgdiA9IGdldERpcmVjdGlvblZlY3RvcihlbnRyeS5kaXIpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbnRyeS5hbnN3ZXIubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCBjb29yZHMgPSBlbnRyeS5wb3MuYWRkUG9pbnQodi5tdWxTY2FsYXIoaSkpO1xyXG4gICAgICAgIGlmIChlbnRyeS5hbnN3ZXJbaV0gIT09IGdyaWQuZ2V0KGNvb3JkcykpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Q29udHJvbEtleVZlY3RvcihjdXJzb3JEaXI6IERpcmVjdGlvbiwga2V5OiBzdHJpbmcsIHNoaWZ0OiBib29sZWFuKTogZ2VvLlBvaW50IHtcclxuICAgIGlmIChrZXkgPT09IFwiQXJyb3dMZWZ0XCIpIHtcclxuICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgtMSwgMCk7XHJcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gXCJBcnJvd0Rvd25cIikge1xyXG4gICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KDAsIDEpO1xyXG4gICAgfSBlbHNlIGlmIChrZXkgPT09IFwiQXJyb3dSaWdodFwiKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMSwgMCk7XHJcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gXCJBcnJvd1VwXCIpIHtcclxuICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgwLCAtMSk7XHJcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gXCJCYWNrc3BhY2VcIikge1xyXG4gICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KC0xLCAwKTtcclxuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBcIlRhYlwiICYmICFzaGlmdCkge1xyXG4gICAgICAgIHJldHVybiBnZXREaXJlY3Rpb25WZWN0b3IoY3Vyc29yRGlyKTtcclxuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBcIlRhYlwiICYmIHNoaWZ0KSB7XHJcbiAgICAgICAgcmV0dXJuIGdldERpcmVjdGlvblZlY3RvcihjdXJzb3JEaXIpLm5lZygpO1xyXG4gICAgfSBlbHNlIGlmIChrZXkgPT09IFwiIFwiKSB7XHJcbiAgICAgICAgcmV0dXJuIGdldERpcmVjdGlvblZlY3RvcihjdXJzb3JEaXIpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KDAsIDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBuZXh0VW5zb2x2ZWRFbnRyeShlbnRyaWVzOiBFbnRyeVtdLCBlbnRyeTogRW50cnkpOiBFbnRyeSB8IHVuZGVmaW5lZCB7XHJcbiAgICBjb25zdCBvZmZzZXQgPSBlbnRyaWVzLmluZGV4T2YoZW50cnkpO1xyXG4gICAgaWYgKG9mZnNldCA8IDApIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBlbnRyaWVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgaWR4ID0gKG9mZnNldCArIGkpICUgZW50cmllcy5sZW5ndGg7XHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBlbnRyaWVzW2lkeF07XHJcbiAgICAgICAgaWYgKCFlbnRyeS5zb2x2ZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVudHJ5O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxubWFpbigpIl19