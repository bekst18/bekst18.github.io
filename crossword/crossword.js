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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jvc3N3b3JkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3Jvc3N3b3JkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE1BQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFDO0FBQ3hDLE1BQU0sa0JBQWtCLEdBQUcsRUFBRSxDQUFDO0FBQzlCLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztBQUN2QixNQUFNLFNBQVMsR0FBRyxrQkFBa0IsR0FBRyxZQUFZLEdBQUcsQ0FBQyxDQUFDO0FBQ3hELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQztBQU90QixJQUFLLFNBR0o7QUFIRCxXQUFLLFNBQVM7SUFDViw2Q0FBTSxDQUFBO0lBQ04seUNBQUksQ0FBQTtBQUNSLENBQUMsRUFISSxTQUFTLEtBQVQsU0FBUyxRQUdiO0FBV0QsTUFBTSxTQUFTO0lBR1gsWUFBbUIsSUFBWSxFQUFTLElBQVk7UUFBakMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUFTLFNBQUksR0FBSixJQUFJLENBQVE7UUFDaEQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztJQUMxQyxDQUFDO0lBRUQsR0FBRyxDQUFDLEVBQWE7O1FBQ2IsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN6QixPQUFPLE1BQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLG1DQUFJLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRUQsR0FBRyxDQUFDLEVBQWEsRUFBRSxLQUFhO1FBQzVCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFekIsSUFBSSxD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QyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUU7UUFDckMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUMxQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDZixPQUFPLEtBQUssQ0FBQztTQUNoQjtLQUNKO0FBQ0wsQ0FBQztBQUVELElBQUksRUFBRSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZG9tIGZyb20gXCIuLi9zaGFyZWQvZG9tLmpzXCJcclxuaW1wb3J0ICogYXMgcmFuZCBmcm9tIFwiLi4vc2hhcmVkL3JhbmQuanNcIlxyXG5pbXBvcnQgKiBhcyBnZW8gZnJvbSBcIi4uL3NoYXJlZC9nZW8yZC5qc1wiXHJcblxyXG5jb25zdCBTVE9SQUdFX0tFWSA9IFwiY3Jvc3N3b3JkX3N0b3JhZ2VcIjtcclxuY29uc3QgQ0VMTF9JTlRFUklPUl9TSVpFID0gMjQ7XHJcbmNvbnN0IENFTExfUEFERElORyA9IDQ7XHJcbmNvbnN0IENFTExfU0laRSA9IENFTExfSU5URVJJT1JfU0laRSArIENFTExfUEFERElORyAqIDI7XHJcbmNvbnN0IE1BWF9HRU5TID0gMTAwMDtcclxuXHJcbmludGVyZmFjZSBIaW50QW5zd2VyIHtcclxuICAgIGhpbnQ6IHN0cmluZyxcclxuICAgIGFuc3dlcjogc3RyaW5nLFxyXG59XHJcblxyXG5lbnVtIERpcmVjdGlvbiB7XHJcbiAgICBBY3Jvc3MsXHJcbiAgICBEb3duLFxyXG59XHJcblxyXG5pbnRlcmZhY2UgRW50cnkge1xyXG4gICAgbnVtOiBudW1iZXIsXHJcbiAgICBoaW50OiBzdHJpbmcsXHJcbiAgICBhbnN3ZXI6IHN0cmluZyxcclxuICAgIHBvczogZ2VvLlBvaW50LFxyXG4gICAgZGlyOiBEaXJlY3Rpb24sXHJcbiAgICBzb2x2ZWQ6IGJvb2xlYW4sXHJcbn1cclxuXHJcbmNsYXNzIExldHRlck1hcCB7XHJcbiAgICBwcml2YXRlIGRhdGE6IE1hcDxudW1iZXIsIHN0cmluZz47XHJcblxyXG4gICAgY29uc3RydWN0b3IocHVibGljIHJvd3M6IG51bWJlciwgcHVibGljIGNvbHM6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMuZGF0YSA9IG5ldyBNYXA8bnVtYmVyLCBzdHJpbmc+KCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0KHh5OiBnZW8uUG9pbnQpOiBzdHJpbmcge1xyXG4gICAgICAgIGNvbnN0IGlkID0gdGhpcy5mbGF0KHh5KTtcclxuICAgICAgICByZXR1cm4gdGhpcy5kYXRhLmdldChpZCkgPz8gXCJcIjtcclxuICAgIH1cclxuXHJcbiAgICBzZXQoeHk6IGdlby5Qb2ludCwgdmFsdWU6IHN0cmluZykge1xyXG4gICAgICAgIGNvbnN0IGlkID0gdGhpcy5mbGF0KHh5KTtcclxuXHJcbiAgICAgICAgaWYgKCF2YWx1ZSkge1xyXG4gICAgICAgICAgICB0aGlzLmRhdGEuZGVsZXRlKGlkKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kYXRhLnNldChpZCwgdmFsdWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGtleXMoKTogZ2VvLlBvaW50W10ge1xyXG4gICAgICAgIHJldHVybiBbLi4udGhpcy5kYXRhLmtleXMoKV0ubWFwKGsgPT4gdGhpcy5oaWVyKGspKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZsYXQoeHk6IGdlby5Qb2ludCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHh5LnkgKiB0aGlzLmNvbHMgKyB4eS54XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoaWVyKG46IG51bWJlcik6IGdlby5Qb2ludCB7XHJcbiAgICAgICAgY29uc3QgeSA9IE1hdGguZmxvb3IobiAvIHRoaXMuY29scyk7XHJcbiAgICAgICAgY29uc3QgeCA9IG4gLSB5ICogdGhpcy5jb2xzO1xyXG4gICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KHgsIHkpO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBQb2ludFNldCB7XHJcbiAgICBwcml2YXRlIGRhdGE6IFNldDxudW1iZXI+O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyByb3dzOiBudW1iZXIsIHB1YmxpYyBjb2xzOiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLmRhdGEgPSBuZXcgU2V0PG51bWJlcj4oKTtcclxuICAgIH1cclxuXHJcbiAgICBoYXMoeHk6IGdlby5Qb2ludCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGNvbnN0IGlkID0gdGhpcy5mbGF0KHh5KTtcclxuICAgICAgICByZXR1cm4gdGhpcy5kYXRhLmhhcyhpZCk7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkKHh5OiBnZW8uUG9pbnQpIHtcclxuICAgICAgICBjb25zdCBpZCA9IHRoaXMuZmxhdCh4eSk7XHJcbiAgICAgICAgdGhpcy5kYXRhLmFkZChpZCk7XHJcbiAgICB9XHJcblxyXG4gICAga2V5cygpOiBnZW8uUG9pbnRbXSB7XHJcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLmRhdGFdLm1hcChrID0+IHRoaXMuaGllcihrKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmbGF0KHh5OiBnZW8uUG9pbnQpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB4eS55ICogdGhpcy5jb2xzICsgeHkueFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGllcihuOiBudW1iZXIpOiBnZW8uUG9pbnQge1xyXG4gICAgICAgIGNvbnN0IHkgPSBNYXRoLmZsb29yKG4gLyB0aGlzLmNvbHMpO1xyXG4gICAgICAgIGNvbnN0IHggPSBuIC0geSAqIHRoaXMuY29scztcclxuICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCh4LCB5KTtcclxuICAgIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIFB1enpsZSB7XHJcbiAgICBlbnRyaWVzOiBFbnRyeVtdLFxyXG4gICAgaG92ZXJDb29yZHM6IGdlby5Qb2ludCB8IG51bGwsXHJcbiAgICBjdXJzb3JDb29yZHM6IGdlby5Qb2ludCB8IG51bGwsXHJcbiAgICBjdXJzb3JEaXI6IERpcmVjdGlvbixcclxuICAgIGdyaWQ6IExldHRlck1hcCxcclxufVxyXG5cclxuZW51bSBNb2RlIHtcclxuICAgIENyZWF0ZSxcclxuICAgIFBsYXlcclxufVxyXG5cclxuaW50ZXJmYWNlIEFwcFN0YXRlIHtcclxuICAgIG1vZGU6IE1vZGUsXHJcbiAgICBoaW50QW5zd2VyczogSGludEFuc3dlcltdLFxyXG4gICAgcHV6emxlOiBQdXp6bGUsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1haW4oKSB7XHJcbiAgICBsZXQgaGludEFuc3dlcnMgPSBuZXcgQXJyYXk8SGludEFuc3dlcj4oKTtcclxuXHJcbiAgICBjb25zdCBwdXp6bGUgPSA8UHV6emxlPntcclxuICAgICAgICBlbnRyaWVzOiBuZXcgQXJyYXk8RW50cnk+KCksXHJcbiAgICAgICAgaG92ZXJDb29yZHM6IG51bGwsXHJcbiAgICAgICAgY3Vyc29yQ29vcmRzOiBudWxsLFxyXG4gICAgICAgIGN1cnNvckRpcjogRGlyZWN0aW9uLkFjcm9zcyxcclxuICAgICAgICBncmlkOiBuZXcgTGV0dGVyTWFwKDAsIDApLFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVVaSA9IGRvbS5ieUlkKFwiY3JlYXRlVWlcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbiAgICBjb25zdCBwbGF5VWkgPSBkb20uYnlJZChcInBsYXlVaVwiKSBhcyBIVE1MRGl2RWxlbWVudDtcclxuICAgIGNvbnN0IHB1enpsZUNhbnZhcyA9IGRvbS5ieUlkKFwicHV6emxlQ2FudmFzXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50O1xyXG4gICAgY29uc3QgcHV6emxlQ29udGV4dCA9IHB1enpsZUNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikgYXMgQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEO1xyXG4gICAgaWYgKCFwdXp6bGVDb250ZXh0KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FudmFzIGVsZW1lbnQgbm90IHN1cHBvcnRlZFwiKVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGhpbnRBbnN3ZXJGb3JtID0gZG9tLmJ5SWQoXCJoaW50QW5zd2VyRm9ybVwiKSBhcyBIVE1MRm9ybUVsZW1lbnQ7XHJcbiAgICBjb25zdCBoaW50SW5wdXQgPSBkb20uYnlJZChcImhpbnRcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGFuc3dlcklucHV0ID0gZG9tLmJ5SWQoXCJhbnN3ZXJcIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGhpbnRBbnN3ZXJUZW1wbGF0ZSA9IGRvbS5ieUlkKFwiaGludEFuc3dlclRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XHJcbiAgICBjb25zdCBoaW50QW5zd2VyTGlzdCA9IGRvbS5ieUlkKFwiaGludEFuc3dlcnNcIikgYXMgSFRNTE9MaXN0RWxlbWVudDtcclxuICAgIGNvbnN0IHB1enpsZUhpbnRUZW1wbGF0ZSA9IGRvbS5ieUlkKFwicHV6emxlSGludFRlbXBsYXRlXCIpIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XHJcbiAgICBjb25zdCBwdXp6bGVIaW50QWNyb3NzTGlzdCA9IGRvbS5ieUlkKFwicHV6emxlSGludHNBY3Jvc3NcIikgYXMgSFRNTE9MaXN0RWxlbWVudDtcclxuICAgIGNvbnN0IHB1enpsZUhpbnREb3duTGlzdCA9IGRvbS5ieUlkKFwicHV6emxlSGludHNEb3duXCIpIGFzIEhUTUxPTGlzdEVsZW1lbnQ7XHJcbiAgICBjb25zdCBjcmVhdGVCdXR0b24gPSBkb20uYnlJZChcImNyZWF0ZUJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IGNsZWFyQnV0dG9uID0gZG9tLmJ5SWQoXCJjbGVhckJ1dHRvblwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IHJldHVyblRvQ3JlYXRlID0gZG9tLmJ5SWQoXCJyZXR1cm5Ub0NyZWF0ZVwiKSBhcyBIVE1MTGlua0VsZW1lbnQ7XHJcbiAgICAvLyBjb25zdCBzZWVkID0gcmFuZC54bXVyMyhuZXcgRGF0ZSgpLnRvU3RyaW5nKCkpO1xyXG4gICAgLy8gY29uc3Qgcm5nID0gbmV3IHJhbmQuU0ZDMzJSTkcoc2VlZCgpLCBzZWVkKCksIHNlZWQoKSwgc2VlZCgpKTtcclxuICAgIGNvbnN0IHJuZyA9IG5ldyByYW5kLlNGQzMyUk5HKDEsIDIsIDMsIDQpO1xyXG4gICAgaGludEFuc3dlckZvcm0uYWRkRXZlbnRMaXN0ZW5lcihcInN1Ym1pdFwiLCBhZGRIaW50QW5zd2VyKTtcclxuICAgIGNyZWF0ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gZ2VuZXJhdGUoKSk7XHJcbiAgICBjbGVhckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY2xlYXIpO1xyXG4gICAgcmV0dXJuVG9DcmVhdGUuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNyZWF0ZSk7XHJcbiAgICBwdXp6bGVDYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJtb3ZlXCIsIG9uUHV6emxlUG9pbnRlck1vdmUpO1xyXG4gICAgcHV6emxlQ2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVyZG93blwiLCBvblB1enpsZVBvaW50ZXJEb3duKTtcclxuICAgIHB1enpsZUNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcm91dFwiLCBvblB1enpsZVBvaW50ZXJPdXQpO1xyXG4gICAgcHV6emxlQ2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIG9uUHV6emxlS2V5ZG93bik7XHJcblxyXG4gICAgZG9tLmRlbGVnYXRlKGhpbnRBbnN3ZXJMaXN0LCBcImNsaWNrXCIsIFwiLmRlbGV0ZS1idXR0b25cIiwgZGVsZXRlSGludEFuc3dlcik7XHJcbiAgICBkb20uZGVsZWdhdGUocHV6emxlSGludEFjcm9zc0xpc3QsIFwiY2xpY2tcIiwgXCIucHV6emxlLWhpbnQtbGlcIiwgb25QdXp6bGVIaW50Q2xpY2spO1xyXG4gICAgZG9tLmRlbGVnYXRlKHB1enpsZUhpbnREb3duTGlzdCwgXCJjbGlja1wiLCBcIi5wdXp6bGUtaGludC1saVwiLCBvblB1enpsZUhpbnRDbGljayk7XHJcblxyXG4gICAgbG9hZCgpO1xyXG5cclxuICAgIGZ1bmN0aW9uIGFkZEhpbnRBbnN3ZXIoZTogRXZlbnQpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGhpbnQgPSBoaW50SW5wdXQudmFsdWU7XHJcbiAgICAgICAgY29uc3QgYW5zd2VyID0gYW5zd2VySW5wdXQudmFsdWU7XHJcbiAgICAgICAgaWYgKCFoaW50IHx8ICFhbnN3ZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBoaW50QW5zd2Vycy5wdXNoKHsgaGludCwgYW5zd2VyIH0pO1xyXG4gICAgICAgIHNhdmUoKTtcclxuXHJcbiAgICAgICAgdXBkYXRlSGludEFuc3dlckxpc3QoKTtcclxuXHJcbiAgICAgICAgaGludElucHV0LnZhbHVlID0gXCJcIjtcclxuICAgICAgICBhbnN3ZXJJbnB1dC52YWx1ZSA9IFwiXCI7XHJcbiAgICAgICAgaGludElucHV0LmZvY3VzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlSGludEFuc3dlckxpc3QoKSB7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKGhpbnRBbnN3ZXJMaXN0KTtcclxuICAgICAgICBmb3IgKGNvbnN0IGhpbnRBbnN3ZXIgb2YgaGludEFuc3dlcnMpIHtcclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBoaW50QW5zd2VyVGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudDtcclxuICAgICAgICAgICAgY29uc3QgaGludFNwYW4gPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuaGludFwiKTtcclxuICAgICAgICAgICAgY29uc3QgYW5zd2VyU3BhbiA9IGRvbS5ieVNlbGVjdG9yKGZyYWdtZW50LCBcIi5hbnN3ZXJcIik7XHJcbiAgICAgICAgICAgIGhpbnRTcGFuLnRleHRDb250ZW50ID0gaGludEFuc3dlci5oaW50O1xyXG4gICAgICAgICAgICBhbnN3ZXJTcGFuLnRleHRDb250ZW50ID0gaGludEFuc3dlci5hbnN3ZXI7XHJcbiAgICAgICAgICAgIGhpbnRBbnN3ZXJMaXN0LmFwcGVuZENoaWxkKGZyYWdtZW50KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2xlYXIoKSB7XHJcbiAgICAgICAgaGludEFuc3dlcnMgPSBbXTtcclxuICAgICAgICB1cGRhdGVIaW50QW5zd2VyTGlzdCgpO1xyXG4gICAgICAgIHNhdmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWxldGVIaW50QW5zd2VyKGU6IEV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgY29uc3QgbGkgPSB0YXJnZXQuY2xvc2VzdChcIi5oaW50LWFuc3dlci1saVwiKSBhcyBIVE1MTElFbGVtZW50O1xyXG4gICAgICAgIGNvbnN0IHBhcmVudCA9IGxpLnBhcmVudEVsZW1lbnQ7XHJcbiAgICAgICAgaWYgKCFwYXJlbnQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaW5kZXggPSBBcnJheS5mcm9tKHBhcmVudC5jaGlsZHJlbikuaW5kZXhPZihsaSk7XHJcbiAgICAgICAgaGludEFuc3dlcnMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICBzYXZlKCk7XHJcbiAgICAgICAgdXBkYXRlSGludEFuc3dlckxpc3QoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBsb2FkKCkge1xyXG4gICAgICAgIGNvbnN0IGpzb25EYXRhID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oU1RPUkFHRV9LRVkpO1xyXG4gICAgICAgIGlmICghanNvbkRhdGEpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaGludEFuc3dlcnMgPSBKU09OLnBhcnNlKGpzb25EYXRhKSBhcyBbSGludEFuc3dlcl07XHJcbiAgICAgICAgdXBkYXRlSGludEFuc3dlckxpc3QoKTtcclxuXHJcbiAgICAgICAgaWYgKGhpbnRBbnN3ZXJzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgZ2VuZXJhdGUoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2F2ZSgpIHtcclxuICAgICAgICBjb25zdCBqc29uRGF0YSA9IEpTT04uc3RyaW5naWZ5KGhpbnRBbnN3ZXJzKTtcclxuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShTVE9SQUdFX0tFWSwganNvbkRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlKCkge1xyXG4gICAgICAgIHB1enpsZS5lbnRyaWVzID0gW107XHJcbiAgICAgICAgcHV6emxlLmVudHJpZXMgPSBnZW5lcmF0ZVB1enpsZShybmcsIGhpbnRBbnN3ZXJzKTtcclxuICAgICAgICBpZiAocHV6emxlLmVudHJpZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGFsZXJ0KFwiRmFpbGVkIHRvIGdlbmVyYXRlIHB1enpsZVwiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgcm93cyA9IE1hdGgubWF4KC4uLnB1enpsZS5lbnRyaWVzLm1hcCh4ID0+IHgucG9zLnggKyBlbnRyeVdpZHRoKHgpKSk7XHJcbiAgICAgICAgY29uc3QgY29scyA9IE1hdGgubWF4KC4uLnB1enpsZS5lbnRyaWVzLm1hcCh4ID0+IHgucG9zLnkgKyBlbnRyeUhlaWdodCh4KSkpO1xyXG4gICAgICAgIHB1enpsZS5ncmlkID0gbmV3IExldHRlck1hcChyb3dzLCBjb2xzKTtcclxuXHJcbiAgICAgICAgcGxheSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBsYXkoKSB7XHJcbiAgICAgICAgY3JlYXRlVWkuaGlkZGVuID0gdHJ1ZTtcclxuICAgICAgICBwbGF5VWkuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgcHV6emxlQ2FudmFzLndpZHRoID0gcHV6emxlQ2FudmFzLmNsaWVudFdpZHRoO1xyXG4gICAgICAgIHB1enpsZUNhbnZhcy5oZWlnaHQgPSBwdXp6bGVDYW52YXMuY2xpZW50SGVpZ2h0O1xyXG4gICAgICAgIHVwZGF0ZVB1enpsZUhpbnRMaXN0KCk7XHJcbiAgICAgICAgd2luZG93LnNjcm9sbFRvKHsgbGVmdDogMCwgdG9wOiAwIH0pO1xyXG4gICAgICAgIHB1enpsZUNhbnZhcy5mb2N1cygpO1xyXG5cclxuICAgICAgICBpZiAocHV6emxlLmVudHJpZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBwdXp6bGUuY3Vyc29yQ29vcmRzID0gcHV6emxlLmVudHJpZXNbMF0ucG9zO1xyXG4gICAgICAgICAgICBwdXp6bGUuY3Vyc29yRGlyID0gcHV6emxlLmVudHJpZXNbMF0uZGlyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY3JlYXRlKCkge1xyXG4gICAgICAgIHBsYXlVaS5oaWRkZW4gPSB0cnVlO1xyXG4gICAgICAgIGNyZWF0ZVVpLmhpZGRlbiA9IGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZVB1enpsZUhpbnRMaXN0KCkge1xyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbihwdXp6bGVIaW50QWNyb3NzTGlzdCk7XHJcbiAgICAgICAgZG9tLnJlbW92ZUFsbENoaWxkcmVuKHB1enpsZUhpbnREb3duTGlzdCk7XHJcbiAgICAgICAgY29uc3QgZW50cmllcyA9IHB1enpsZS5lbnRyaWVzO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVudHJpZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgZW50cnkgPSBlbnRyaWVzW2ldO1xyXG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IHB1enpsZUhpbnRUZW1wbGF0ZS5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50O1xyXG4gICAgICAgICAgICBjb25zdCBoaW50TGkgPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIucHV6emxlLWhpbnQtbGlcIikgYXMgSFRNTExJRWxlbWVudDtcclxuICAgICAgICAgICAgaGludExpLnRleHRDb250ZW50ID0gYCR7ZW50cnkubnVtfS4gJHtlbnRyeS5oaW50fWA7XHJcbiAgICAgICAgICAgIGhpbnRMaS5kYXRhc2V0LmVudHJ5SW5kZXggPSBgJHtpfWA7XHJcblxyXG4gICAgICAgICAgICBpZiAoZW50cnkuc29sdmVkKSB7XHJcbiAgICAgICAgICAgICAgICBoaW50TGkuY2xhc3NMaXN0LmFkZChcInNvbHZlZFwiKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGVudHJ5LmRpciA9PT0gRGlyZWN0aW9uLkFjcm9zcykge1xyXG4gICAgICAgICAgICAgICAgcHV6emxlSGludEFjcm9zc0xpc3QuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBwdXp6bGVIaW50RG93bkxpc3QuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QdXp6bGVQb2ludGVyTW92ZShldnQ6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IGN4eSA9IG5ldyBnZW8uUG9pbnQoZXZ0Lm9mZnNldFgsIGV2dC5vZmZzZXRZKTtcclxuICAgICAgICBwdXp6bGUuaG92ZXJDb29yZHMgPSBjYW52YXNDb29yZHNUb0NlbGxDb29yZHMoY3h5KTtcclxuICAgICAgICBkcmF3UHV6emxlKHB1enpsZUNhbnZhcywgcHV6emxlQ29udGV4dCwgcHV6emxlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvblB1enpsZVBvaW50ZXJEb3duKGV2dDogUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgeHkgPSBjYW52YXNDb29yZHNUb0NlbGxDb29yZHMobmV3IGdlby5Qb2ludChldnQub2Zmc2V0WCwgZXZ0Lm9mZnNldFkpKTtcclxuICAgICAgICBjb25zdCBwZGlyID0gcGVycChwdXp6bGUuY3Vyc29yRGlyKTtcclxuICAgICAgICBjb25zdCBlbnRyaWVzQXRDZWxsID0gZmluZEVudHJpZXNBdENlbGwocHV6emxlLmVudHJpZXMsIHh5KTtcclxuXHJcbiAgICAgICAgLy8gbm8gZW50cmllcyBhdCBjZWxsLCBjYW4ndCBwbGFjZSBjdXJzb3IgaGVyZVxyXG4gICAgICAgIGlmICghZW50cmllc0F0Q2VsbC5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc3dpdGNoIGRpcmVjdGlvbnMgaWYgYXQgc2FtZSBjZWxsXHJcbiAgICAgICAgaWYgKHB1enpsZS5jdXJzb3JDb29yZHMgJiYgeHkuZXF1YWwocHV6emxlLmN1cnNvckNvb3JkcykgJiYgZW50cmllc0F0Q2VsbC5zb21lKHggPT4geC5kaXIgPT09IHBkaXIpKSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5jdXJzb3JEaXIgPSBwZGlyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaWYgY3VycmVudCBjdXJzb3IgZGlyZWN0aW9uIGRvZXMgbm90IGFsaWduIHdpdGggYSB3b3JkIGF0IHRoZSBjZWxsLCBzd2l0Y2ggZGlyZWN0aW9uXHJcbiAgICAgICAgaWYgKCFlbnRyaWVzQXRDZWxsLnNvbWUoeCA9PiB4LmRpciA9PT0gcHV6emxlLmN1cnNvckRpcikpIHtcclxuICAgICAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IHBlcnAocHV6emxlLmN1cnNvckRpcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdXp6bGUuY3Vyc29yQ29vcmRzID0geHk7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QdXp6bGVQb2ludGVyT3V0KCkge1xyXG4gICAgICAgIHB1enpsZS5ob3ZlckNvb3JkcyA9IG51bGw7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QdXp6bGVLZXlkb3duKGV2dDogS2V5Ym9hcmRFdmVudCkge1xyXG4gICAgICAgIGlmICghcHV6emxlLmN1cnNvckNvb3Jkcykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlbnRyaWVzQXRDZWxsID0gZmluZEVudHJpZXNBdENlbGwocHV6emxlLmVudHJpZXMsIHB1enpsZS5jdXJzb3JDb29yZHMpO1xyXG4gICAgICAgIGlmIChlbnRyaWVzQXRDZWxsLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzb2x2ZWRBdENlbGwgPSBlbnRyaWVzQXRDZWxsLnNvbWUoeCA9PiB4LnNvbHZlZCk7XHJcbiAgICAgICAgaWYgKCFldnQua2V5KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhhbmRsZSBjb250cm9sL2Fycm93IGtleXNcclxuICAgICAgICBpZiAoZXZ0LmtleSA9PT0gXCJEZWxldGVcIiAmJiAhc29sdmVkQXRDZWxsKSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5ncmlkLnNldChwdXp6bGUuY3Vyc29yQ29vcmRzLCBcIlwiKTtcclxuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB2ID0gZ2V0Q29udHJvbEtleVZlY3RvcihwdXp6bGUuY3Vyc29yRGlyLCBldnQua2V5LCBldnQuc2hpZnRLZXkpO1xyXG4gICAgICAgIGlmICh2LnggIT09IDAgfHwgdi55ICE9PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvb3JkcyA9IHB1enpsZS5jdXJzb3JDb29yZHMuYWRkUG9pbnQodik7XHJcbiAgICAgICAgICAgIGNvbnN0IGVudHJpZXNBdE5ld0NlbGwgPSBmaW5kRW50cmllc0F0Q2VsbChwdXp6bGUuZW50cmllcywgY29vcmRzKTtcclxuICAgICAgICAgICAgY29uc3Qgc29sdmVkQXROZXdDZWxsID0gZW50cmllc0F0Q2VsbC5zb21lKHggPT4geC5zb2x2ZWQpO1xyXG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChldnQua2V5ID09PSBcIiBcIiAmJiAhc29sdmVkQXRDZWxsKSB7XHJcbiAgICAgICAgICAgICAgICBwdXp6bGUuZ3JpZC5zZXQocHV6emxlLmN1cnNvckNvb3JkcywgXCJcIik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChlbnRyaWVzQXROZXdDZWxsLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBjb29yZHM7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXZ0LmtleSA9PT0gXCJCYWNrc3BhY2VcIiAmJiAhc29sdmVkQXROZXdDZWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHV6emxlLmdyaWQuc2V0KHB1enpsZS5jdXJzb3JDb29yZHMsIFwiXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZXZ0LmtleS5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChldnQua2V5Lmxlbmd0aCAhPT0gMSB8fCAhZXZ0LmtleS5tYXRjaCgvW2Etel0vaSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbGV0dGVyID0gZXZ0LmtleS50b1VwcGVyQ2FzZSgpO1xyXG5cclxuICAgICAgICBpZiAoZW50cmllc0F0Q2VsbC5zb21lKHggPT4geC5zb2x2ZWQpICYmIGxldHRlciAhPT0gcHV6emxlLmdyaWQuZ2V0KHB1enpsZS5jdXJzb3JDb29yZHMpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwdXp6bGUuZ3JpZC5zZXQocHV6emxlLmN1cnNvckNvb3JkcywgbGV0dGVyKTtcclxuXHJcbiAgICAgICAgLy8gY2hlY2sgZm9yIGNvbXBsZXRlIHdvcmRcclxuICAgICAgICBsZXQgYW55U29sdmVkID0gZmFsc2U7XHJcbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzQXRDZWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNvbHZlZCA9IGVudHJ5U29sdmVkKGVudHJ5LCBwdXp6bGUuZ3JpZCk7XHJcbiAgICAgICAgICAgIGlmICghZW50cnkuc29sdmVkICYmIHNvbHZlZCkge1xyXG4gICAgICAgICAgICAgICAgZW50cnkuc29sdmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGFueVNvbHZlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGNoZWNrIGZvciBkb25lXHJcbiAgICAgICAgaWYgKHB1enpsZS5lbnRyaWVzLmV2ZXJ5KGUgPT4gZS5zb2x2ZWQpKSB7XHJcbiAgICAgICAgICAgIG9uUHV6emxlU29sdmVkKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhZHZhbmNlIGN1cnNvclxyXG4gICAgICAgIGlmIChhbnlTb2x2ZWQpIHtcclxuICAgICAgICAgICAgY29uc3QgZW50cnkgPSBuZXh0VW5zb2x2ZWRFbnRyeShwdXp6bGUuZW50cmllcywgZW50cmllc0F0Q2VsbFswXSk7XHJcbiAgICAgICAgICAgIGlmIChlbnRyeSkge1xyXG4gICAgICAgICAgICAgICAgcHV6emxlLmN1cnNvckNvb3JkcyA9IGVudHJ5LnBvcztcclxuICAgICAgICAgICAgICAgIHB1enpsZS5jdXJzb3JEaXIgPSBlbnRyeS5kaXI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zdCBhZHZhbmNlZEN1cnNvciA9IHB1enpsZS5jdXJzb3JDb29yZHMuYWRkUG9pbnQoZ2V0RGlyZWN0aW9uVmVjdG9yKHB1enpsZS5jdXJzb3JEaXIpKTtcclxuICAgICAgICAgICAgaWYgKGZpbmRFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBhZHZhbmNlZEN1cnNvcikubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcHV6emxlLmN1cnNvckNvb3JkcyA9IHB1enpsZS5jdXJzb3JDb29yZHMuYWRkUG9pbnQoZ2V0RGlyZWN0aW9uVmVjdG9yKHB1enpsZS5jdXJzb3JEaXIpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICAgICAgdXBkYXRlUHV6emxlSGludExpc3QoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvblB1enpsZUhpbnRDbGljayhlOiBFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIGNvbnN0IGxpID0gdGFyZ2V0LmNsb3Nlc3QoXCIucHV6emxlLWhpbnQtbGlcIikgYXMgSFRNTExJRWxlbWVudDtcclxuICAgICAgICBjb25zdCBlbnRyeUluZGV4U3RyaW5nID0gbGk/LmRhdGFzZXQ/LmVudHJ5SW5kZXg7XHJcbiAgICAgICAgaWYgKCFlbnRyeUluZGV4U3RyaW5nKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGVudHJ5SW5kZXggPSBwYXJzZUludChlbnRyeUluZGV4U3RyaW5nKTtcclxuICAgICAgICBjb25zdCBlbnRyeSA9IHB1enpsZS5lbnRyaWVzW2VudHJ5SW5kZXhdO1xyXG4gICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBlbnRyeS5wb3M7XHJcbiAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IGVudHJ5LmRpcjtcclxuICAgICAgICBkcmF3UHV6emxlKHB1enpsZUNhbnZhcywgcHV6emxlQ29udGV4dCwgcHV6emxlKTtcclxuICAgICAgICBwdXp6bGVDYW52YXMuZm9jdXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvblB1enpsZVNvbHZlZCgpIHtcclxuICAgICAgICBhbGVydChcIllPVSBTT0xWRUQgVEhFIFBVWlpMRSEgQlJBVk8hXCIpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBybmREaXIocm5nOiByYW5kLlJORyk6IERpcmVjdGlvbiB7XHJcbiAgICBjb25zdCBkaXJlY3Rpb25zID0gW0RpcmVjdGlvbi5BY3Jvc3MsIERpcmVjdGlvbi5Eb3duXTtcclxuICAgIHJldHVybiByYW5kLmNob29zZShybmcsIGRpcmVjdGlvbnMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwZXJwKGRpcjogRGlyZWN0aW9uKTogRGlyZWN0aW9uIHtcclxuICAgIGlmIChkaXIgPT0gRGlyZWN0aW9uLkFjcm9zcykge1xyXG4gICAgICAgIHJldHVybiBEaXJlY3Rpb24uRG93bjtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gRGlyZWN0aW9uLkFjcm9zcztcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVQdXp6bGUocm5nOiByYW5kLlJORywgaGludEFuc3dlcnM6IEhpbnRBbnN3ZXJbXSk6IEVudHJ5W10ge1xyXG4gICAgaWYgKGhpbnRBbnN3ZXJzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgYWxlcnQoXCJQbGVhc2UgZW50ZXIgYXQgbGVhc3Qgb25lIGhpbnQgYW5kIGFuc3dlciFcIik7XHJcbiAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIG1ha2UgYWxsIGFuc3dlcnMgbG93ZXJjYXNlXHJcbiAgICBmb3IgKGNvbnN0IGhhIG9mIGhpbnRBbnN3ZXJzKSB7XHJcbiAgICAgICAgaGEuYW5zd2VyID0gaGEuYW5zd2VyLnRvTG9jYWxlVXBwZXJDYXNlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcmV0cnkgdW50aWwgc3VjY2Vzc2Z1bCAodXAgdG8gYSBjZXJ0YWluIGFtb3VudClcclxuICAgIGNvbnN0IHB1enpsZXMgPSBuZXcgQXJyYXk8RW50cnlbXT4oKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTUFYX0dFTlM7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSB0cnlHZW5lcmF0ZVB1enpsZShybmcsIGhpbnRBbnN3ZXJzKTtcclxuICAgICAgICBpZiAoZW50cmllcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdXp6bGVzLnB1c2goZW50cmllcyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHB1enpsZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGVudHJpZXMgPSBwdXp6bGVzLnJlZHVjZSgocHJldiwgY3VyKSA9PiBjYWxjU2NvcmUocHJldikgPCBjYWxjU2NvcmUoY3VyKSA/IHByZXYgOiBjdXIpO1xyXG4gICAgZW50cmllcy5zb3J0KCh4LCB5KSA9PiB7XHJcbiAgICAgICAgY29uc3QgZG4gPSB4Lm51bSAtIHkubnVtO1xyXG4gICAgICAgIHJldHVybiBkbiA9PT0gMCA/IHguZGlyIC0geS5kaXIgOiBkbjtcclxuICAgIH0pO1xyXG5cclxuICAgIHNoaWZ0UHV6emxlKGVudHJpZXMpO1xyXG4gICAgcmV0dXJuIGVudHJpZXM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyeUdlbmVyYXRlUHV6emxlKHJuZzogcmFuZC5STkcsIGhpbnRBbnN3ZXJzOiBIaW50QW5zd2VyW10pOiBFbnRyeVtdIHtcclxuICAgIHJhbmQuc2h1ZmZsZShybmcsIGhpbnRBbnN3ZXJzKTtcclxuXHJcbiAgICAvLyBwbGFjZSBsb25nZXN0IHdvcmQgYXQgMCwwIHJhbmRvbWx5IGFjcm9zcy9kb3duXHJcbiAgICBjb25zdCBlbnRyaWVzID0gbmV3IEFycmF5PEVudHJ5PigpO1xyXG4gICAgZW50cmllcy5wdXNoKHBsYWNlSW5pdGlhbEVudHJ5KHJuZywgaGludEFuc3dlcnNbMF0pKTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IGhpbnRBbnN3ZXJzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgaGEgPSBoaW50QW5zd2Vyc1tpXTtcclxuICAgICAgICBjb25zdCBlbnRyeSA9IHBsYWNlTmV4dEVudHJ5KGVudHJpZXMsIGhhKTtcclxuICAgICAgICBpZiAoZW50cnkpIHtcclxuICAgICAgICAgICAgZW50cmllcy5wdXNoKGVudHJ5KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gW107XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBlbnRyaWVzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzaGlmdFB1enpsZShlbnRyaWVzOiBFbnRyeVtdKSB7XHJcbiAgICAvLyBzaGlmdCB0aGUgcHV6emxlIHN1Y2ggdGhhdCBhbGwgd29yZHMgc3RhcnQgPj0gKDAsIDApXHJcbiAgICBjb25zdCBtaW5YID0gTWF0aC5taW4oLi4uZW50cmllcy5tYXAoeCA9PiB4LnBvcy54KSk7XHJcbiAgICBjb25zdCBtaW5ZID0gTWF0aC5taW4oLi4uZW50cmllcy5tYXAoeCA9PiB4LnBvcy55KSk7XHJcbiAgICBjb25zdCB4eSA9IG5ldyBnZW8uUG9pbnQoLW1pblgsIC1taW5ZKTtcclxuICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgIGVudHJ5LnBvcyA9IGVudHJ5LnBvcy5hZGRQb2ludCh4eSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGNTY29yZShlbnRyaWVzOiBFbnRyeVtdKTogbnVtYmVyIHtcclxuICAgIC8vIGNhbGN1bGF0ZSBwdXp6bGUgc2NvcmUsXHJcbiAgICAvLyBsb3dlciBpcyBiZXR0ZXJcclxuICAgIGNvbnN0IHggPSBNYXRoLm1pbiguLi5lbnRyaWVzLm1hcChlID0+IGUucG9zLngpKTtcclxuICAgIGNvbnN0IHkgPSBNYXRoLm1pbiguLi5lbnRyaWVzLm1hcChlID0+IGUucG9zLnkpKTtcclxuICAgIGNvbnN0IHcgPSBNYXRoLm1heCguLi5lbnRyaWVzLm1hcChlID0+IGUucG9zLnggKyBlbnRyeVdpZHRoKGUpKSkgLSB4O1xyXG4gICAgY29uc3QgaCA9IE1hdGgubWF4KC4uLmVudHJpZXMubWFwKGUgPT4gZS5wb3MueSArIGVudHJ5SGVpZ2h0KGUpKSkgLSB5O1xyXG4gICAgcmV0dXJuIHcgKiBoO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZUluaXRpYWxFbnRyeShybmc6IHJhbmQuUk5HLCBoYTogSGludEFuc3dlcik6IEVudHJ5IHtcclxuICAgIGNvbnN0IHsgaGludCwgYW5zd2VyIH0gPSBoYTtcclxuXHJcbiAgICBjb25zdCBkaXIgPSBybmREaXIocm5nKTtcclxuICAgIC8vIGNvbnN0IGRpciA9IERpcmVjdGlvbi5BY3Jvc3M7XHJcbiAgICBjb25zdCBwb3MgPSBuZXcgZ2VvLlBvaW50KDAsIDApO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgbnVtOiAxLFxyXG4gICAgICAgIGhpbnQsXHJcbiAgICAgICAgYW5zd2VyLFxyXG4gICAgICAgIHBvcyxcclxuICAgICAgICBkaXIsXHJcbiAgICAgICAgc29sdmVkOiBmYWxzZSxcclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYWNlTmV4dEVudHJ5KGVudHJpZXM6IEVudHJ5W10sIGhhOiBIaW50QW5zd2VyKTogRW50cnkgfCB1bmRlZmluZWQge1xyXG4gICAgY29uc3QgeyBoaW50LCBhbnN3ZXIgfSA9IGhhO1xyXG5cclxuICAgIC8vIGZpbmQgbmV4dCBwb3NzaWJsZSBpbnRlcnNlY3Rpb24gd2l0aCBleGlzdGluZyB3b3Jkc1xyXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgLy8gZmluZCBuZXh0IGNvbW1vbiBsZXR0ZXJcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVudHJ5LmFuc3dlci5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGFuc3dlci5sZW5ndGg7ICsraikge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5LmFuc3dlcltpXSA9PT0gYW5zd2VyW2pdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdHJ5IHBsYWNpbmcgdGhlIHdvcmQgaGVyZVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGkgPSBpbmRleCBpbiBhbHJlYWR5IHBsYWNlZCB3b3JkXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaiA9IGluZGV4IGluIHVucGxhY2VkIHdvcmRcclxuICAgICAgICAgICAgICAgICAgICAvLyBpZiB3b3JkIGlzIHZlcnRpY2FsLCBwbGFjZSBob3Jpem9udGFsXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgd29yZCBpcyBob3Jpem9udGFsLCBwbGFjZSB2ZXJ0aWNhbFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbW1vblBvcyA9IGdldENoYXJQb3NpdGlvbihlbnRyeS5wb3MsIGVudHJ5LmRpciwgaSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlyID0gcGVycChlbnRyeS5kaXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvcyA9IGdldFN0YXJ0UG9zaXRpb24oY29tbW9uUG9zLCBkaXIsIGopO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1ZhbGlkV29yZFBsYWNlbWVudChlbnRyaWVzLCBhbnN3ZXIsIHBvcywgZGlyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkb2VzIGFub3RoZXIgZW50cnkgc3RhcnQgaGVyZT8gaWYgc28sIHNoYXJlIGl0J3MgbnVtXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgdXNlIG1heCArIDFcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbnVtID0gZW50cmllcy5maWx0ZXIoeCA9PiB4LnBvcy5lcXVhbChwb3MpKS5tYXAoeCA9PiB4Lm51bSlbMF0gPz8gTWF0aC5tYXgoLi4uZW50cmllcy5tYXAoeCA9PiB4Lm51bSArIDEpKSA/PyAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlOiBFbnRyeSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhpbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbnN3ZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb2x2ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIG5vIHBsYWNlbWVudCBmb3VuZFxyXG4gICAgcmV0dXJuO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXREaXJlY3Rpb25WZWN0b3IoZGlyOiBEaXJlY3Rpb24pOiBnZW8uUG9pbnQge1xyXG4gICAgc3dpdGNoIChkaXIpIHtcclxuICAgICAgICBjYXNlIERpcmVjdGlvbi5BY3Jvc3M6XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KDEsIDApO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIERpcmVjdGlvbi5Eb3duOlxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgwLCAxKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBkaXJlY3RvblwiKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFdvcmRQbGFjZW1lbnQoZW50cmllczogRW50cnlbXSwgYW5zd2VyOiBzdHJpbmcsIHBvczogZ2VvLlBvaW50LCBkaXI6IERpcmVjdGlvbik6IGJvb2xlYW4ge1xyXG4gICAgLy8gY2hlY2sgZm9yIG92ZXJsYXBcclxuICAgIC8vIGNhc2VzOlxyXG4gICAgLy8gYWNyb3NzL2Fjcm9zc1xyXG4gICAgLy8gZG93bi9kb3duXHJcbiAgICAvLyBhY3Jvc3MvZG93blxyXG4gICAgLy8gZG93bi9hY3Jvc3MgKHN3YXAgYW5kIG1ha2Ugc2FtZSBjYXNlPylcclxuICAgIC8vIGFueSBvdmVybGFwIGF0IG5vbi1cclxuICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgIGlmICghaXNWYWxpZFBsYWNlbWVudChlbnRyeS5wb3MsIGVudHJ5LmFuc3dlciwgZW50cnkuZGlyLCBwb3MsIGFuc3dlciwgZGlyKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkUGxhY2VtZW50KHBvczE6IGdlby5Qb2ludCwgYTE6IHN0cmluZywgZGlyMTogRGlyZWN0aW9uLCBwb3MyOiBnZW8uUG9pbnQsIGEyOiBzdHJpbmcsIGRpcjI6IERpcmVjdGlvbik6IGJvb2xlYW4ge1xyXG4gICAgaWYgKGRpcjEgPT09IERpcmVjdGlvbi5BY3Jvc3MgJiYgZGlyMiA9PT0gRGlyZWN0aW9uLkFjcm9zcykge1xyXG4gICAgICAgIHJldHVybiBpc1ZhbGlkUGxhY2VtZW50QWNyb3NzQWNyb3NzKHBvczEsIGExLCBwb3MyLCBhMik7XHJcbiAgICB9IGVsc2UgaWYgKGRpcjEgPT09IERpcmVjdGlvbi5Eb3duICYmIGRpcjIgPT09IERpcmVjdGlvbi5Eb3duKSB7XHJcbiAgICAgICAgcmV0dXJuIGlzVmFsaWRQbGFjZW1lbnREb3duRG93bihwb3MxLCBhMSwgcG9zMiwgYTIpO1xyXG4gICAgfSBlbHNlIGlmIChkaXIxID09PSBEaXJlY3Rpb24uQWNyb3NzICYmIGRpcjIgPT09IERpcmVjdGlvbi5Eb3duKSB7XHJcbiAgICAgICAgcmV0dXJuIGlzVmFsaWRQbGFjZW1lbnRBY3Jvc3NEb3duKHBvczEsIGExLCBwb3MyLCBhMik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGlzVmFsaWRQbGFjZW1lbnREb3duQWNyb3NzKHBvczEsIGExLCBwb3MyLCBhMik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmFsaWRQbGFjZW1lbnRBY3Jvc3NBY3Jvc3MocG9zMTogZ2VvLlBvaW50LCBhMTogc3RyaW5nLCBwb3MyOiBnZW8uUG9pbnQsIGEyOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIC8vIGlmIHkgY29vcmRzIG5vdCB0b3VjaGluZywgdmFsaWRcclxuICAgIGlmIChNYXRoLmFicyhwb3MxLnkgLSBwb3MyLnkpID4gMSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGlmIHggcmFuZ2VzIG5vdCB0b3VjaGluZywgdmFsaWRcclxuICAgIGlmIChwb3MxLnggKyBhMS5sZW5ndGggKyAxIDwgcG9zMS54IHx8IHBvczEueCA+IHBvczIueCArIGEyLmxlbmd0aCArIDEpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmFsaWRQbGFjZW1lbnREb3duRG93bihwb3MxOiBnZW8uUG9pbnQsIGExOiBzdHJpbmcsIHBvczI6IGdlby5Qb2ludCwgYTI6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgLy8gaWYgeSBjb29yZHMgbm90IHRvdWNoaW5nLCB2YWxpZFxyXG4gICAgaWYgKE1hdGguYWJzKHBvczEueCAtIHBvczIueCkgPiAxKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gaWYgeCByYW5nZXMgbm90IHRvdWNoaW5nLCB2YWxpZFxyXG4gICAgaWYgKHBvczEueSArIGExLmxlbmd0aCArIDEgPCBwb3MxLnkgfHwgcG9zMS55ID4gcG9zMi55ICsgYTIubGVuZ3RoICsgMSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFBsYWNlbWVudEFjcm9zc0Rvd24ocG9zMTogZ2VvLlBvaW50LCBhMTogc3RyaW5nLCBwb3MyOiBnZW8uUG9pbnQsIGEyOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIC8vIGlmIG5vIG92ZXJsYXAgb24geC1heGlzIHZhbGlkXHJcbiAgICBpZiAocG9zMS54ICsgYTEubGVuZ3RoIDwgcG9zMi54IC0gMSB8fCBwb3MxLnggPiBwb3MyLnggKyAxKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gaWYgbm8gb3ZlcmxhcCBvbiB5LWF4aXMsIHZhbGlkXHJcbiAgICBpZiAocG9zMS55IDwgcG9zMi55IC0gMSB8fCBwb3MxLnkgPiBwb3MyLnkgKyBhMi5sZW5ndGggKyAxKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gaWYgdG91Y2hpbmcgKGl4IG91dHNpZGUgb2YgZWl0aGVyIHdvcmQsIG5vdCBhIHZhbGlkIHBsYWNlbWVudClcclxuICAgIGNvbnN0IGl4ID0gbmV3IGdlby5Qb2ludChwb3MyLngsIHBvczEueSk7XHJcbiAgICBpZiAoXHJcbiAgICAgICAgaXgueCA8IHBvczEueCB8fCBpeC54ID4gcG9zMS54ICsgYTEubGVuZ3RoXHJcbiAgICAgICAgfHwgaXgueSA8IHBvczIueSB8fCBpeC55ID4gcG9zMi55ICsgYTIubGVuZ3RoKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhMVtpeC54IC0gcG9zMS54XSA9PT0gYTJbaXgueSAtIHBvczIueV07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmFsaWRQbGFjZW1lbnREb3duQWNyb3NzKHBvczE6IGdlby5Qb2ludCwgYTE6IHN0cmluZywgcG9zMjogZ2VvLlBvaW50LCBhMjogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gaXNWYWxpZFBsYWNlbWVudEFjcm9zc0Rvd24ocG9zMiwgYTIsIHBvczEsIGExKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Q2hhclBvc2l0aW9uKHN0YXJ0UG9zaXRpb246IGdlby5Qb2ludCwgZGlyOiBEaXJlY3Rpb24sIGluZGV4OiBudW1iZXIpOiBnZW8uUG9pbnQge1xyXG4gICAgY29uc3QgdiA9IGdldERpcmVjdGlvblZlY3RvcihkaXIpO1xyXG4gICAgcmV0dXJuIHN0YXJ0UG9zaXRpb24uYWRkUG9pbnQodi5tdWxTY2FsYXIoaW5kZXgpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U3RhcnRQb3NpdGlvbihjaGFyUG9zaXRpb246IGdlby5Qb2ludCwgZGlyOiBEaXJlY3Rpb24sIGluZGV4OiBudW1iZXIpOiBnZW8uUG9pbnQge1xyXG4gICAgLy8gZ2V0IHRoZSBzdGFydCBwb3NpdGlvbiBvZiBhIHdvcmQgZ2l2ZW4gdGhlIHBvc2l0aW9uIG9mIGEgc3BlY2lmaWVkIGluZGV4XHJcbiAgICBjb25zdCB2ID0gZ2V0RGlyZWN0aW9uVmVjdG9yKGRpcik7XHJcbiAgICByZXR1cm4gY2hhclBvc2l0aW9uLnN1YlBvaW50KHYubXVsU2NhbGFyKGluZGV4KSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdQdXp6bGUoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCwgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIHB1enpsZTogUHV6emxlKSB7XHJcbiAgICBjb25zdCBsZXR0ZXJGb250ID0gXCJib2xkIDE2cHggYXJpYWxcIjtcclxuICAgIGNvbnN0IG51bWJlckZvbnQgPSBcIm5vcm1hbCAxMHB4IGFyaWFsXCI7XHJcbiAgICBjdHguZm9udCA9IGxldHRlckZvbnQ7XHJcbiAgICBjb25zdCBsZXR0ZXJUZXh0SGVpZ2h0ID0gY3R4Lm1lYXN1cmVUZXh0KFwiTVwiKS53aWR0aDtcclxuICAgIGN0eC5mb250ID0gbnVtYmVyRm9udDtcclxuICAgIGNvbnN0IG51bWJlclRleHRIZWlnaHQgPSBjdHgubWVhc3VyZVRleHQoXCJNXCIpLndpZHRoO1xyXG5cclxuICAgIC8vIGRyYXcgYmFja2dyb3VuZFxyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiYmxhY2tcIjtcclxuICAgIGNvbnN0IGVudHJpZXMgPSBwdXp6bGUuZW50cmllcztcclxuICAgIGNvbnN0IHB3ID0gTWF0aC5tYXgoLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy54ICsgZW50cnlXaWR0aChlKSkpO1xyXG4gICAgY29uc3QgcGggPSBNYXRoLm1heCguLi5lbnRyaWVzLm1hcChlID0+IGUucG9zLnkgKyBlbnRyeUhlaWdodChlKSkpO1xyXG4gICAgY29uc3QgY2FudmFzV2lkdGggPSBwdyAqIENFTExfU0laRTtcclxuICAgIGNvbnN0IGNhbnZhc0hlaWdodCA9IHBoICogQ0VMTF9TSVpFO1xyXG4gICAgY2FudmFzLndpZHRoID0gY2FudmFzV2lkdGg7XHJcbiAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzSGVpZ2h0O1xyXG4gICAgY3R4LmZpbGxSZWN0KDAsIDAsIGNhbnZhc1dpZHRoLCBjYW52YXNIZWlnaHQpO1xyXG5cclxuICAgIC8vIGRyYXcgbGV0dGVycyBhbmQgY2VsbHNcclxuICAgIGN0eC5mb250ID0gXCJib2xkIDE4cHggYXJpYWxcIjtcclxuICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgIGNvbnN0IHsgcG9zLCBhbnN3ZXIsIGRpciB9ID0gZW50cnk7XHJcbiAgICAgICAgY29uc3QgdiA9IGdldERpcmVjdGlvblZlY3RvcihkaXIpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFuc3dlci5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBwID0gcG9zLmFkZFBvaW50KHYubXVsU2NhbGFyKGkpKTtcclxuICAgICAgICAgICAgY29uc3QgY3ggPSBwLnggKiBDRUxMX1NJWkU7XHJcbiAgICAgICAgICAgIGNvbnN0IGN5ID0gcC55ICogQ0VMTF9TSVpFO1xyXG5cclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwid2hpdGVcIjtcclxuICAgICAgICAgICAgY3R4LmZpbGxSZWN0KGN4LCBjeSwgQ0VMTF9TSVpFLCBDRUxMX1NJWkUpO1xyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiO1xyXG5cclxuICAgICAgICAgICAgY3R4LmZvbnQgPSBcImJvbGQgMThweCBhcmlhbFwiO1xyXG4gICAgICAgICAgICBjdHguc3Ryb2tlUmVjdChjeCwgY3ksIENFTExfU0laRSwgQ0VMTF9TSVpFKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZHJhdyBudW1iZXJzXHJcbiAgICBjdHguZm9udCA9IFwibm9ybWFsIDEwcHggYXJpYWxcIjtcclxuICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgIC8vIGRyYXcgbnVtYmVyXHJcbiAgICAgICAgY29uc3QgY29vcmRzID0gZW50cnkucG9zLm11bFNjYWxhcihDRUxMX1NJWkUpO1xyXG4gICAgICAgIGN0eC5maWxsVGV4dChgJHtlbnRyeS5udW19YCwgY29vcmRzLnggKyAyLCBjb29yZHMueSArIDIgKyBudW1iZXJUZXh0SGVpZ2h0KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBkcmF3IGVudGVyZWQgbGV0dGVyc1xyXG4gICAgY29uc3QgZ3JpZCA9IHB1enpsZS5ncmlkO1xyXG4gICAgZm9yIChjb25zdCBjZWxsQ29vcmRzIG9mIGdyaWQua2V5cygpKSB7XHJcbiAgICAgICAgY29uc3QgbGV0dGVyID0gZ3JpZC5nZXQoY2VsbENvb3Jkcyk7XHJcbiAgICAgICAgaWYgKCFsZXR0ZXIpIHtcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb29yZHMgPSBjZWxsQ29vcmRzVG9DYW52YXNDb29yZHMoY2VsbENvb3JkcykuYWRkUG9pbnQobmV3IGdlby5Qb2ludChDRUxMX1BBRERJTkcsIENFTExfUEFERElORykpO1xyXG4gICAgICAgIGNvbnN0IG1ldHJpY3MgPSBjdHgubWVhc3VyZVRleHQobGV0dGVyKTtcclxuICAgICAgICBjb29yZHMueCArPSBDRUxMX0lOVEVSSU9SX1NJWkUgLyAyLjA7XHJcbiAgICAgICAgY29vcmRzLnkgKz0gQ0VMTF9JTlRFUklPUl9TSVpFIC8gMi4wO1xyXG4gICAgICAgIGNvb3Jkcy55ICs9IGxldHRlclRleHRIZWlnaHQgLyAyLjA7XHJcbiAgICAgICAgY29vcmRzLnggLT0gbWV0cmljcy53aWR0aCAvIDIuMDtcclxuICAgICAgICBjdHguZm9udCA9IFwiMTZweCBhcmlhbFwiO1xyXG4gICAgICAgIGN0eC5maWxsVGV4dChsZXR0ZXIsIGNvb3Jkcy54LCBjb29yZHMueSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZHJhdyByZWQgd2hlcmUgaG92ZXJpbmdcclxuICAgIGlmIChwdXp6bGUuaG92ZXJDb29yZHMpIHtcclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAzO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmVkXCI7XHJcbiAgICAgICAgY3R4LnN0cm9rZVJlY3QocHV6emxlLmhvdmVyQ29vcmRzLnggKiBDRUxMX1NJWkUsIHB1enpsZS5ob3ZlckNvb3Jkcy55ICogQ0VMTF9TSVpFLCBDRUxMX1NJWkUsIENFTExfU0laRSk7XHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBkcmF3IGN1cnNvclxyXG4gICAgaWYgKHB1enpsZS5jdXJzb3JDb29yZHMpIHtcclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG5cclxuICAgICAgICBjb25zdCBjYW52YXNDb29yZHMgPSBjZWxsQ29vcmRzVG9DYW52YXNDb29yZHMocHV6emxlLmN1cnNvckNvb3Jkcyk7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDM7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmVkXCI7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5hcmMoY2FudmFzQ29vcmRzLnggKyBDRUxMX1NJWkUgLyAyLjAsIGNhbnZhc0Nvb3Jkcy55ICsgQ0VMTF9TSVpFIC8gMi4wLCAzLCAwLCBNYXRoLlBJICogMik7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuXHJcbiAgICAgICAgLy8gaGlnaGxpZ2h0IHdvcmQgdW5kZXIgY3Vyc29yXHJcbiAgICAgICAgY29uc3QgZW50cmllcyA9IGZpbmRFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBwdXp6bGUuY3Vyc29yQ29vcmRzKS5maWx0ZXIoeCA9PiB4LmRpciA9PT0gcHV6emxlLmN1cnNvckRpcik7XHJcbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGVudHJ5LnNvbHZlZCA/IFwiZ3JlZW5cIiA6IFwicmVkXCI7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgeCwgeSB9ID0gY2VsbENvb3Jkc1RvQ2FudmFzQ29vcmRzKGVudHJ5LnBvcyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gZW50cnlXaWR0aChlbnRyeSkgKiBDRUxMX1NJWkU7XHJcbiAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IGVudHJ5SGVpZ2h0KGVudHJ5KSAqIENFTExfU0laRTtcclxuICAgICAgICAgICAgY3R4LnN0cm9rZVJlY3QoeCwgeSwgd2lkdGgsIGhlaWdodCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjdHgucmVzdG9yZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBlbnRyeVdpZHRoKGVudHJ5OiBFbnRyeSk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gZW50cnkuZGlyID09PSBEaXJlY3Rpb24uQWNyb3NzID8gZW50cnkuYW5zd2VyLmxlbmd0aCA6IDE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVudHJ5SGVpZ2h0KGVudHJ5OiBFbnRyeSk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gZW50cnkuZGlyID09PSBEaXJlY3Rpb24uRG93biA/IGVudHJ5LmFuc3dlci5sZW5ndGggOiAxO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjYW52YXNDb29yZHNUb0NlbGxDb29yZHMoeHk6IGdlby5Qb2ludCk6IGdlby5Qb2ludCB7XHJcbiAgICByZXR1cm4geHkuZGl2U2NhbGFyKENFTExfU0laRSkuZmxvb3IoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2VsbENvb3Jkc1RvQ2FudmFzQ29vcmRzKHh5OiBnZW8uUG9pbnQpOiBnZW8uUG9pbnQge1xyXG4gICAgcmV0dXJuIHh5Lm11bFNjYWxhcihDRUxMX1NJWkUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kRW50cmllc0F0Q2VsbChlbnRyaWVzOiBFbnRyeVtdLCB4eTogZ2VvLlBvaW50KTogRW50cnlbXSB7XHJcbiAgICByZXR1cm4gZW50cmllcy5maWx0ZXIoeCA9PiBlbnRyeUNvbnRhaW5zUG9pbnQoeCwgeHkpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYW55RW50cmllc0F0Q2VsbChlbnRyaWVzOiBFbnRyeVtdLCB4eTogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gZmluZEVudHJpZXNBdENlbGwoZW50cmllcywgeHkpLmxlbmd0aCA+IDA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVudHJ5Q29udGFpbnNQb2ludChlbnRyeTogRW50cnksIHh5OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBlbnRyeS5kaXIgPT09IERpcmVjdGlvbi5BY3Jvc3MgJiYgeHkueSA9PT0gZW50cnkucG9zLnkgJiYgeHkueCA+PSBlbnRyeS5wb3MueCAmJiB4eS54IDwgZW50cnkucG9zLnggKyBlbnRyeS5hbnN3ZXIubGVuZ3RoXHJcbiAgICAgICAgfHwgZW50cnkuZGlyID09PSBEaXJlY3Rpb24uRG93biAmJiB4eS54ID09PSBlbnRyeS5wb3MueCAmJiB4eS55ID49IGVudHJ5LnBvcy55ICYmIHh5LnkgPCBlbnRyeS5wb3MueSArIGVudHJ5LmFuc3dlci5sZW5ndGg7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVudHJ5U29sdmVkKGVudHJ5OiBFbnRyeSwgZ3JpZDogTGV0dGVyTWFwKTogYm9vbGVhbiB7XHJcbiAgICAvLyBjaGVjayBmb3IgY29tcGxldGUgd29yZFxyXG4gICAgY29uc3QgdiA9IGdldERpcmVjdGlvblZlY3RvcihlbnRyeS5kaXIpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbnRyeS5hbnN3ZXIubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCBjb29yZHMgPSBlbnRyeS5wb3MuYWRkUG9pbnQodi5tdWxTY2FsYXIoaSkpO1xyXG4gICAgICAgIGlmIChlbnRyeS5hbnN3ZXJbaV0gIT09IGdyaWQuZ2V0KGNvb3JkcykpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Q29udHJvbEtleVZlY3RvcihjdXJzb3JEaXI6IERpcmVjdGlvbiwga2V5OiBzdHJpbmcsIHNoaWZ0OiBib29sZWFuKTogZ2VvLlBvaW50IHtcclxuICAgIGlmIChrZXkgPT09IFwiQXJyb3dMZWZ0XCIpIHtcclxuICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgtMSwgMCk7XHJcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gXCJBcnJvd0Rvd25cIikge1xyXG4gICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KDAsIDEpO1xyXG4gICAgfSBlbHNlIGlmIChrZXkgPT09IFwiQXJyb3dSaWdodFwiKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMSwgMCk7XHJcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gXCJBcnJvd1VwXCIpIHtcclxuICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgwLCAtMSk7XHJcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gXCJCYWNrc3BhY2VcIikge1xyXG4gICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KC0xLCAwKTtcclxuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBcIlRhYlwiICYmICFzaGlmdCkge1xyXG4gICAgICAgIHJldHVybiBnZXREaXJlY3Rpb25WZWN0b3IoY3Vyc29yRGlyKTtcclxuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBcIlRhYlwiICYmIHNoaWZ0KSB7XHJcbiAgICAgICAgcmV0dXJuIGdldERpcmVjdGlvblZlY3RvcihjdXJzb3JEaXIpLm5lZygpO1xyXG4gICAgfSBlbHNlIGlmIChrZXkgPT09IFwiIFwiKSB7XHJcbiAgICAgICAgcmV0dXJuIGdldERpcmVjdGlvblZlY3RvcihjdXJzb3JEaXIpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KDAsIDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBuZXh0VW5zb2x2ZWRFbnRyeShlbnRyaWVzOiBFbnRyeVtdLCBlbnRyeTogRW50cnkpOiBFbnRyeSB8IHVuZGVmaW5lZCB7XHJcbiAgICBjb25zdCBvZmZzZXQgPSBlbnRyaWVzLmluZGV4T2YoZW50cnkpO1xyXG4gICAgaWYgKG9mZnNldCA8IDApIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBlbnRyaWVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgaWR4ID0gKG9mZnNldCArIGkpICUgZW50cmllcy5sZW5ndGg7XHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBlbnRyaWVzW2lkeF07XHJcbiAgICAgICAgaWYgKCFlbnRyeS5zb2x2ZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVudHJ5O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxubWFpbigpIl19