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
        if (!evt.key) {
            return;
        }
        // handle arrow keys
        const v = getArrowKeyVector(evt.key);
        if (v.x !== 0 || v.y !== 0) {
            const coords = puzzle.cursorCoords.addPoint(v);
            if (anyEntriesAtCell(puzzle.entries, coords)) {
                puzzle.cursorCoords = coords;
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
            const entry = puzzle.entries.find(x => !x.solved);
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
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jvc3N3b3JkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3Jvc3N3b3JkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxHQUFHLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE1BQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFDO0FBQ3hDLE1BQU0sa0JBQWtCLEdBQUcsRUFBRSxDQUFDO0FBQzlCLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztBQUN2QixNQUFNLFNBQVMsR0FBRyxrQkFBa0IsR0FBRyxZQUFZLEdBQUcsQ0FBQyxDQUFDO0FBQ3hELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQztBQU90QixJQUFLLFNBR0o7QUFIRCxXQUFLLFNBQVM7SUFDViw2Q0FBTSxDQUFBO0lBQ04seUNBQUksQ0FBQTtBQUNSLENBQUMsRUFISSxTQUFTLEtBQVQsU0FBUyxRQUdiO0FBV0QsTUFBTSxTQUFTO0lBR1gsWUFBbUIsSUFBWSxFQUFTLElBQVk7UUFBakMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUFTLFNBQUksR0FBSixJQUFJLENBQVE7UUFDaEQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztJQUMxQyxDQUFDO0lBRUQsR0FBRyxDQUFDLEVBQWE7O1FBQ2IsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN6QixPQUFPLE1BQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLG1DQUFJLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRUQsR0FBRyxDQUFDLEVBQWEsRUFBRSxLQUFhO1FBQzVCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFekIsSUFBSSxD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QyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BELE1BQU0sRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZDLEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxFQUFFO1FBQ3pCLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDdEM7QUFDTCxDQUFDO0FBRUQsU0FBUyxTQUFTLENBQUMsT0FBZ0I7SUFDL0IsMEJBQTBCO0lBQzFCLGtCQUFrQjtJQUNsQixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JFLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FB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LFdBQVcsRUFBRTtRQUNyQixPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUMvQjtTQUFNLElBQUksR0FBRyxLQUFLLFdBQVcsRUFBRTtRQUM1QixPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDOUI7U0FBTSxJQUFJLEdBQUcsS0FBSyxZQUFZLEVBQUU7UUFDN0IsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQzlCO1NBQU0sSUFBSSxHQUFHLEtBQUssU0FBUyxFQUFFO1FBQzFCLE9BQU8sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQy9CO0lBQ0QsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQy9CLENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRvbSBmcm9tIFwiLi4vc2hhcmVkL2RvbS5qc1wiXHJcbmltcG9ydCAqIGFzIHJhbmQgZnJvbSBcIi4uL3NoYXJlZC9yYW5kLmpzXCJcclxuaW1wb3J0ICogYXMgZ2VvIGZyb20gXCIuLi9zaGFyZWQvZ2VvMmQuanNcIlxyXG5cclxuY29uc3QgU1RPUkFHRV9LRVkgPSBcImNyb3Nzd29yZF9zdG9yYWdlXCI7XHJcbmNvbnN0IENFTExfSU5URVJJT1JfU0laRSA9IDI0O1xyXG5jb25zdCBDRUxMX1BBRERJTkcgPSA0O1xyXG5jb25zdCBDRUxMX1NJWkUgPSBDRUxMX0lOVEVSSU9SX1NJWkUgKyBDRUxMX1BBRERJTkcgKiAyO1xyXG5jb25zdCBNQVhfR0VOUyA9IDEwMDA7XHJcblxyXG5pbnRlcmZhY2UgSGludEFuc3dlciB7XHJcbiAgICBoaW50OiBzdHJpbmcsXHJcbiAgICBhbnN3ZXI6IHN0cmluZyxcclxufVxyXG5cclxuZW51bSBEaXJlY3Rpb24ge1xyXG4gICAgQWNyb3NzLFxyXG4gICAgRG93bixcclxufVxyXG5cclxuaW50ZXJmYWNlIEVudHJ5IHtcclxuICAgIG51bTogbnVtYmVyLFxyXG4gICAgaGludDogc3RyaW5nLFxyXG4gICAgYW5zd2VyOiBzdHJpbmcsXHJcbiAgICBwb3M6IGdlby5Qb2ludCxcclxuICAgIGRpcjogRGlyZWN0aW9uLFxyXG4gICAgc29sdmVkOiBib29sZWFuLFxyXG59XHJcblxyXG5jbGFzcyBMZXR0ZXJNYXAge1xyXG4gICAgcHJpdmF0ZSBkYXRhOiBNYXA8bnVtYmVyLCBzdHJpbmc+O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyByb3dzOiBudW1iZXIsIHB1YmxpYyBjb2xzOiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLmRhdGEgPSBuZXcgTWFwPG51bWJlciwgc3RyaW5nPigpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldCh4eTogZ2VvLlBvaW50KTogc3RyaW5nIHtcclxuICAgICAgICBjb25zdCBpZCA9IHRoaXMuZmxhdCh4eSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YS5nZXQoaWQpID8/IFwiXCI7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0KHh5OiBnZW8uUG9pbnQsIHZhbHVlOiBzdHJpbmcpIHtcclxuICAgICAgICBjb25zdCBpZCA9IHRoaXMuZmxhdCh4eSk7XHJcblxyXG4gICAgICAgIGlmICghdmFsdWUpIHtcclxuICAgICAgICAgICAgdGhpcy5kYXRhLmRlbGV0ZShpZCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZGF0YS5zZXQoaWQsIHZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICBrZXlzKCk6IGdlby5Qb2ludFtdIHtcclxuICAgICAgICByZXR1cm4gWy4uLnRoaXMuZGF0YS5rZXlzKCldLm1hcChrID0+IHRoaXMuaGllcihrKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmbGF0KHh5OiBnZW8uUG9pbnQpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB4eS55ICogdGhpcy5jb2xzICsgeHkueFxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGllcihuOiBudW1iZXIpOiBnZW8uUG9pbnQge1xyXG4gICAgICAgIGNvbnN0IHkgPSBNYXRoLmZsb29yKG4gLyB0aGlzLmNvbHMpO1xyXG4gICAgICAgIGNvbnN0IHggPSBuIC0geSAqIHRoaXMuY29scztcclxuICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCh4LCB5KTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgUG9pbnRTZXQge1xyXG4gICAgcHJpdmF0ZSBkYXRhOiBTZXQ8bnVtYmVyPjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcm93czogbnVtYmVyLCBwdWJsaWMgY29sczogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5kYXRhID0gbmV3IFNldDxudW1iZXI+KCk7XHJcbiAgICB9XHJcblxyXG4gICAgaGFzKHh5OiBnZW8uUG9pbnQpOiBib29sZWFuIHtcclxuICAgICAgICBjb25zdCBpZCA9IHRoaXMuZmxhdCh4eSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YS5oYXMoaWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZCh4eTogZ2VvLlBvaW50KSB7XHJcbiAgICAgICAgY29uc3QgaWQgPSB0aGlzLmZsYXQoeHkpO1xyXG4gICAgICAgIHRoaXMuZGF0YS5hZGQoaWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGtleXMoKTogZ2VvLlBvaW50W10ge1xyXG4gICAgICAgIHJldHVybiBbLi4udGhpcy5kYXRhXS5tYXAoayA9PiB0aGlzLmhpZXIoaykpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZmxhdCh4eTogZ2VvLlBvaW50KTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4geHkueSAqIHRoaXMuY29scyArIHh5LnhcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhpZXIobjogbnVtYmVyKTogZ2VvLlBvaW50IHtcclxuICAgICAgICBjb25zdCB5ID0gTWF0aC5mbG9vcihuIC8gdGhpcy5jb2xzKTtcclxuICAgICAgICBjb25zdCB4ID0gbiAtIHkgKiB0aGlzLmNvbHM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoeCwgeSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSBQdXp6bGUge1xyXG4gICAgZW50cmllczogRW50cnlbXSxcclxuICAgIGhvdmVyQ29vcmRzOiBnZW8uUG9pbnQgfCBudWxsLFxyXG4gICAgY3Vyc29yQ29vcmRzOiBnZW8uUG9pbnQgfCBudWxsLFxyXG4gICAgY3Vyc29yRGlyOiBEaXJlY3Rpb24sXHJcbiAgICBncmlkOiBMZXR0ZXJNYXAsXHJcbn1cclxuXHJcbmVudW0gTW9kZSB7XHJcbiAgICBDcmVhdGUsXHJcbiAgICBQbGF5XHJcbn1cclxuXHJcbmludGVyZmFjZSBBcHBTdGF0ZSB7XHJcbiAgICBtb2RlOiBNb2RlLFxyXG4gICAgaGludEFuc3dlcnM6IEhpbnRBbnN3ZXJbXSxcclxuICAgIHB1enpsZTogUHV6emxlLFxyXG59XHJcblxyXG5mdW5jdGlvbiBtYWluKCkge1xyXG4gICAgbGV0IGhpbnRBbnN3ZXJzID0gbmV3IEFycmF5PEhpbnRBbnN3ZXI+KCk7XHJcblxyXG4gICAgY29uc3QgcHV6emxlID0gPFB1enpsZT57XHJcbiAgICAgICAgZW50cmllczogbmV3IEFycmF5PEVudHJ5PigpLFxyXG4gICAgICAgIGhvdmVyQ29vcmRzOiBudWxsLFxyXG4gICAgICAgIGN1cnNvckNvb3JkczogbnVsbCxcclxuICAgICAgICBjdXJzb3JEaXI6IERpcmVjdGlvbi5BY3Jvc3MsXHJcbiAgICAgICAgZ3JpZDogbmV3IExldHRlck1hcCgwLCAwKSxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgY3JlYXRlVWkgPSBkb20uYnlJZChcImNyZWF0ZVVpXCIpIGFzIEhUTUxEaXZFbGVtZW50O1xyXG4gICAgY29uc3QgcGxheVVpID0gZG9tLmJ5SWQoXCJwbGF5VWlcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbiAgICBjb25zdCBwdXp6bGVDYW52YXMgPSBkb20uYnlJZChcInB1enpsZUNhbnZhc1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudDtcclxuICAgIGNvbnN0IHB1enpsZUNvbnRleHQgPSBwdXp6bGVDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpIGFzIENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRDtcclxuICAgIGlmICghcHV6emxlQ29udGV4dCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbnZhcyBlbGVtZW50IG5vdCBzdXBwb3J0ZWRcIilcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBoaW50QW5zd2VyRm9ybSA9IGRvbS5ieUlkKFwiaGludEFuc3dlckZvcm1cIikgYXMgSFRNTEZvcm1FbGVtZW50O1xyXG4gICAgY29uc3QgaGludElucHV0ID0gZG9tLmJ5SWQoXCJoaW50XCIpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCBhbnN3ZXJJbnB1dCA9IGRvbS5ieUlkKFwiYW5zd2VyXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCBoaW50QW5zd2VyVGVtcGxhdGUgPSBkb20uYnlJZChcImhpbnRBbnN3ZXJUZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50O1xyXG4gICAgY29uc3QgaGludEFuc3dlckxpc3QgPSBkb20uYnlJZChcImhpbnRBbnN3ZXJzXCIpIGFzIEhUTUxPTGlzdEVsZW1lbnQ7XHJcbiAgICBjb25zdCBwdXp6bGVIaW50VGVtcGxhdGUgPSBkb20uYnlJZChcInB1enpsZUhpbnRUZW1wbGF0ZVwiKSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50O1xyXG4gICAgY29uc3QgcHV6emxlSGludEFjcm9zc0xpc3QgPSBkb20uYnlJZChcInB1enpsZUhpbnRzQWNyb3NzXCIpIGFzIEhUTUxPTGlzdEVsZW1lbnQ7XHJcbiAgICBjb25zdCBwdXp6bGVIaW50RG93bkxpc3QgPSBkb20uYnlJZChcInB1enpsZUhpbnRzRG93blwiKSBhcyBIVE1MT0xpc3RFbGVtZW50O1xyXG4gICAgY29uc3QgY3JlYXRlQnV0dG9uID0gZG9tLmJ5SWQoXCJjcmVhdGVCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XHJcbiAgICBjb25zdCBjbGVhckJ1dHRvbiA9IGRvbS5ieUlkKFwiY2xlYXJCdXR0b25cIikgYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XHJcbiAgICBjb25zdCByZXR1cm5Ub0NyZWF0ZSA9IGRvbS5ieUlkKFwicmV0dXJuVG9DcmVhdGVcIikgYXMgSFRNTExpbmtFbGVtZW50O1xyXG4gICAgLy8gY29uc3Qgc2VlZCA9IHJhbmQueG11cjMobmV3IERhdGUoKS50b1N0cmluZygpKTtcclxuICAgIC8vIGNvbnN0IHJuZyA9IG5ldyByYW5kLlNGQzMyUk5HKHNlZWQoKSwgc2VlZCgpLCBzZWVkKCksIHNlZWQoKSk7XHJcbiAgICBjb25zdCBybmcgPSBuZXcgcmFuZC5TRkMzMlJORygxLCAyLCAzLCA0KTtcclxuICAgIGhpbnRBbnN3ZXJGb3JtLmFkZEV2ZW50TGlzdGVuZXIoXCJzdWJtaXRcIiwgYWRkSGludEFuc3dlcik7XHJcbiAgICBjcmVhdGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IGdlbmVyYXRlKCkpO1xyXG4gICAgY2xlYXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNsZWFyKTtcclxuICAgIHJldHVyblRvQ3JlYXRlLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBjcmVhdGUpO1xyXG4gICAgcHV6emxlQ2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVybW92ZVwiLCBvblB1enpsZVBvaW50ZXJNb3ZlKTtcclxuICAgIHB1enpsZUNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmRvd25cIiwgb25QdXp6bGVQb2ludGVyRG93bik7XHJcbiAgICBwdXp6bGVDYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJvdXRcIiwgb25QdXp6bGVQb2ludGVyT3V0KTtcclxuICAgIHB1enpsZUNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBvblB1enpsZUtleWRvd24pO1xyXG5cclxuICAgIGRvbS5kZWxlZ2F0ZShoaW50QW5zd2VyTGlzdCwgXCJjbGlja1wiLCBcIi5kZWxldGUtYnV0dG9uXCIsIGRlbGV0ZUhpbnRBbnN3ZXIpO1xyXG4gICAgZG9tLmRlbGVnYXRlKHB1enpsZUhpbnRBY3Jvc3NMaXN0LCBcImNsaWNrXCIsIFwiLnB1enpsZS1oaW50LWxpXCIsIG9uUHV6emxlSGludENsaWNrKTtcclxuICAgIGRvbS5kZWxlZ2F0ZShwdXp6bGVIaW50RG93bkxpc3QsIFwiY2xpY2tcIiwgXCIucHV6emxlLWhpbnQtbGlcIiwgb25QdXp6bGVIaW50Q2xpY2spO1xyXG5cclxuICAgIGxvYWQoKTtcclxuXHJcbiAgICBmdW5jdGlvbiBhZGRIaW50QW5zd2VyKGU6IEV2ZW50KSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICBjb25zdCBoaW50ID0gaGludElucHV0LnZhbHVlO1xyXG4gICAgICAgIGNvbnN0IGFuc3dlciA9IGFuc3dlcklucHV0LnZhbHVlO1xyXG4gICAgICAgIGlmICghaGludCB8fCAhYW5zd2VyKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaGludEFuc3dlcnMucHVzaCh7IGhpbnQsIGFuc3dlciB9KTtcclxuICAgICAgICBzYXZlKCk7XHJcblxyXG4gICAgICAgIHVwZGF0ZUhpbnRBbnN3ZXJMaXN0KCk7XHJcblxyXG4gICAgICAgIGhpbnRJbnB1dC52YWx1ZSA9IFwiXCI7XHJcbiAgICAgICAgYW5zd2VySW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgICAgIGhpbnRJbnB1dC5mb2N1cygpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZUhpbnRBbnN3ZXJMaXN0KCkge1xyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbihoaW50QW5zd2VyTGlzdCk7XHJcbiAgICAgICAgZm9yIChjb25zdCBoaW50QW5zd2VyIG9mIGhpbnRBbnN3ZXJzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gaGludEFuc3dlclRlbXBsYXRlLmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnQ7XHJcbiAgICAgICAgICAgIGNvbnN0IGhpbnRTcGFuID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLmhpbnRcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGFuc3dlclNwYW4gPSBkb20uYnlTZWxlY3RvcihmcmFnbWVudCwgXCIuYW5zd2VyXCIpO1xyXG4gICAgICAgICAgICBoaW50U3Bhbi50ZXh0Q29udGVudCA9IGhpbnRBbnN3ZXIuaGludDtcclxuICAgICAgICAgICAgYW5zd2VyU3Bhbi50ZXh0Q29udGVudCA9IGhpbnRBbnN3ZXIuYW5zd2VyO1xyXG4gICAgICAgICAgICBoaW50QW5zd2VyTGlzdC5hcHBlbmRDaGlsZChmcmFnbWVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNsZWFyKCkge1xyXG4gICAgICAgIGhpbnRBbnN3ZXJzID0gW107XHJcbiAgICAgICAgdXBkYXRlSGludEFuc3dlckxpc3QoKTtcclxuICAgICAgICBzYXZlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVsZXRlSGludEFuc3dlcihlOiBFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIGNvbnN0IGxpID0gdGFyZ2V0LmNsb3Nlc3QoXCIuaGludC1hbnN3ZXItbGlcIikgYXMgSFRNTExJRWxlbWVudDtcclxuICAgICAgICBjb25zdCBwYXJlbnQgPSBsaS5wYXJlbnRFbGVtZW50O1xyXG4gICAgICAgIGlmICghcGFyZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGluZGV4ID0gQXJyYXkuZnJvbShwYXJlbnQuY2hpbGRyZW4pLmluZGV4T2YobGkpO1xyXG4gICAgICAgIGhpbnRBbnN3ZXJzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgc2F2ZSgpO1xyXG4gICAgICAgIHVwZGF0ZUhpbnRBbnN3ZXJMaXN0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbG9hZCgpIHtcclxuICAgICAgICBjb25zdCBqc29uRGF0YSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFNUT1JBR0VfS0VZKTtcclxuICAgICAgICBpZiAoIWpzb25EYXRhKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGhpbnRBbnN3ZXJzID0gSlNPTi5wYXJzZShqc29uRGF0YSkgYXMgW0hpbnRBbnN3ZXJdO1xyXG4gICAgICAgIHVwZGF0ZUhpbnRBbnN3ZXJMaXN0KCk7XHJcblxyXG4gICAgICAgIGlmIChoaW50QW5zd2Vycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGdlbmVyYXRlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNhdmUoKSB7XHJcbiAgICAgICAgY29uc3QganNvbkRhdGEgPSBKU09OLnN0cmluZ2lmeShoaW50QW5zd2Vycyk7XHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oU1RPUkFHRV9LRVksIGpzb25EYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZSgpIHtcclxuICAgICAgICBwdXp6bGUuZW50cmllcyA9IFtdO1xyXG4gICAgICAgIHB1enpsZS5lbnRyaWVzID0gZ2VuZXJhdGVQdXp6bGUocm5nLCBoaW50QW5zd2Vycyk7XHJcbiAgICAgICAgaWYgKHB1enpsZS5lbnRyaWVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICBhbGVydChcIkZhaWxlZCB0byBnZW5lcmF0ZSBwdXp6bGVcIik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHJvd3MgPSBNYXRoLm1heCguLi5wdXp6bGUuZW50cmllcy5tYXAoeCA9PiB4LnBvcy54ICsgZW50cnlXaWR0aCh4KSkpO1xyXG4gICAgICAgIGNvbnN0IGNvbHMgPSBNYXRoLm1heCguLi5wdXp6bGUuZW50cmllcy5tYXAoeCA9PiB4LnBvcy55ICsgZW50cnlIZWlnaHQoeCkpKTtcclxuICAgICAgICBwdXp6bGUuZ3JpZCA9IG5ldyBMZXR0ZXJNYXAocm93cywgY29scyk7XHJcblxyXG4gICAgICAgIHBsYXkoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwbGF5KCkge1xyXG4gICAgICAgIGNyZWF0ZVVpLmhpZGRlbiA9IHRydWU7XHJcbiAgICAgICAgcGxheVVpLmhpZGRlbiA9IGZhbHNlO1xyXG4gICAgICAgIHB1enpsZUNhbnZhcy53aWR0aCA9IHB1enpsZUNhbnZhcy5jbGllbnRXaWR0aDtcclxuICAgICAgICBwdXp6bGVDYW52YXMuaGVpZ2h0ID0gcHV6emxlQ2FudmFzLmNsaWVudEhlaWdodDtcclxuICAgICAgICB1cGRhdGVQdXp6bGVIaW50TGlzdCgpO1xyXG4gICAgICAgIHdpbmRvdy5zY3JvbGxUbyh7IGxlZnQ6IDAsIHRvcDogMCB9KTtcclxuICAgICAgICBwdXp6bGVDYW52YXMuZm9jdXMoKTtcclxuXHJcbiAgICAgICAgaWYgKHB1enpsZS5lbnRyaWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgcHV6emxlLmN1cnNvckNvb3JkcyA9IHB1enpsZS5lbnRyaWVzWzBdLnBvcztcclxuICAgICAgICAgICAgcHV6emxlLmN1cnNvckRpciA9IHB1enpsZS5lbnRyaWVzWzBdLmRpcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNyZWF0ZSgpIHtcclxuICAgICAgICBwbGF5VWkuaGlkZGVuID0gdHJ1ZTtcclxuICAgICAgICBjcmVhdGVVaS5oaWRkZW4gPSBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVQdXp6bGVIaW50TGlzdCgpIHtcclxuICAgICAgICBkb20ucmVtb3ZlQWxsQ2hpbGRyZW4ocHV6emxlSGludEFjcm9zc0xpc3QpO1xyXG4gICAgICAgIGRvbS5yZW1vdmVBbGxDaGlsZHJlbihwdXp6bGVIaW50RG93bkxpc3QpO1xyXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBwdXp6bGUuZW50cmllcztcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbnRyaWVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGVudHJ5ID0gZW50cmllc1tpXTtcclxuICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBwdXp6bGVIaW50VGVtcGxhdGUuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkgYXMgRG9jdW1lbnRGcmFnbWVudDtcclxuICAgICAgICAgICAgY29uc3QgaGludExpID0gZG9tLmJ5U2VsZWN0b3IoZnJhZ21lbnQsIFwiLnB1enpsZS1oaW50LWxpXCIpIGFzIEhUTUxMSUVsZW1lbnQ7XHJcbiAgICAgICAgICAgIGhpbnRMaS50ZXh0Q29udGVudCA9IGAke2VudHJ5Lm51bX0uICR7ZW50cnkuaGludH1gO1xyXG4gICAgICAgICAgICBoaW50TGkuZGF0YXNldC5lbnRyeUluZGV4ID0gYCR7aX1gO1xyXG5cclxuICAgICAgICAgICAgaWYgKGVudHJ5LnNvbHZlZCkge1xyXG4gICAgICAgICAgICAgICAgaGludExpLmNsYXNzTGlzdC5hZGQoXCJzb2x2ZWRcIik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChlbnRyeS5kaXIgPT09IERpcmVjdGlvbi5BY3Jvc3MpIHtcclxuICAgICAgICAgICAgICAgIHB1enpsZUhpbnRBY3Jvc3NMaXN0LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcHV6emxlSGludERvd25MaXN0LmFwcGVuZENoaWxkKGZyYWdtZW50KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uUHV6emxlUG9pbnRlck1vdmUoZXZ0OiBQb2ludGVyRXZlbnQpIHtcclxuICAgICAgICBjb25zdCBjeHkgPSBuZXcgZ2VvLlBvaW50KGV2dC5vZmZzZXRYLCBldnQub2Zmc2V0WSk7XHJcbiAgICAgICAgcHV6emxlLmhvdmVyQ29vcmRzID0gY2FudmFzQ29vcmRzVG9DZWxsQ29vcmRzKGN4eSk7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QdXp6bGVQb2ludGVyRG93bihldnQ6IFBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IHh5ID0gY2FudmFzQ29vcmRzVG9DZWxsQ29vcmRzKG5ldyBnZW8uUG9pbnQoZXZ0Lm9mZnNldFgsIGV2dC5vZmZzZXRZKSk7XHJcbiAgICAgICAgY29uc3QgcGRpciA9IHBlcnAocHV6emxlLmN1cnNvckRpcik7XHJcbiAgICAgICAgY29uc3QgZW50cmllc0F0Q2VsbCA9IGZpbmRFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCB4eSk7XHJcblxyXG4gICAgICAgIC8vIG5vIGVudHJpZXMgYXQgY2VsbCwgY2FuJ3QgcGxhY2UgY3Vyc29yIGhlcmVcclxuICAgICAgICBpZiAoIWVudHJpZXNBdENlbGwubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHN3aXRjaCBkaXJlY3Rpb25zIGlmIGF0IHNhbWUgY2VsbFxyXG4gICAgICAgIGlmIChwdXp6bGUuY3Vyc29yQ29vcmRzICYmIHh5LmVxdWFsKHB1enpsZS5jdXJzb3JDb29yZHMpICYmIGVudHJpZXNBdENlbGwuc29tZSh4ID0+IHguZGlyID09PSBwZGlyKSkge1xyXG4gICAgICAgICAgICBwdXp6bGUuY3Vyc29yRGlyID0gcGRpcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGlmIGN1cnJlbnQgY3Vyc29yIGRpcmVjdGlvbiBkb2VzIG5vdCBhbGlnbiB3aXRoIGEgd29yZCBhdCB0aGUgY2VsbCwgc3dpdGNoIGRpcmVjdGlvblxyXG4gICAgICAgIGlmICghZW50cmllc0F0Q2VsbC5zb21lKHggPT4geC5kaXIgPT09IHB1enpsZS5jdXJzb3JEaXIpKSB7XHJcbiAgICAgICAgICAgIHB1enpsZS5jdXJzb3JEaXIgPSBwZXJwKHB1enpsZS5jdXJzb3JEaXIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHV6emxlLmN1cnNvckNvb3JkcyA9IHh5O1xyXG4gICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uUHV6emxlUG9pbnRlck91dCgpIHtcclxuICAgICAgICBwdXp6bGUuaG92ZXJDb29yZHMgPSBudWxsO1xyXG4gICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uUHV6emxlS2V5ZG93bihldnQ6IEtleWJvYXJkRXZlbnQpIHtcclxuICAgICAgICBpZiAoIXB1enpsZS5jdXJzb3JDb29yZHMpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZW50cmllc0F0Q2VsbCA9IGZpbmRFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBwdXp6bGUuY3Vyc29yQ29vcmRzKTtcclxuICAgICAgICBpZiAoZW50cmllc0F0Q2VsbC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFldnQua2V5KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGhhbmRsZSBhcnJvdyBrZXlzXHJcbiAgICAgICAgY29uc3QgdiA9IGdldEFycm93S2V5VmVjdG9yKGV2dC5rZXkpO1xyXG4gICAgICAgIGlmICh2LnggIT09IDAgfHwgdi55ICE9PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvb3JkcyA9IHB1enpsZS5jdXJzb3JDb29yZHMuYWRkUG9pbnQodik7XHJcbiAgICAgICAgICAgIGlmIChhbnlFbnRyaWVzQXRDZWxsKHB1enpsZS5lbnRyaWVzLCBjb29yZHMpKSB7XHJcbiAgICAgICAgICAgICAgICBwdXp6bGUuY3Vyc29yQ29vcmRzID0gY29vcmRzO1xyXG4gICAgICAgICAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChldnQua2V5Lmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGV2dC5rZXkubGVuZ3RoICE9PSAxIHx8ICFldnQua2V5Lm1hdGNoKC9bYS16XS9pKSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBsZXR0ZXIgPSBldnQua2V5LnRvVXBwZXJDYXNlKCk7XHJcblxyXG4gICAgICAgIGlmIChlbnRyaWVzQXRDZWxsLnNvbWUoeCA9PiB4LnNvbHZlZCkgJiYgbGV0dGVyICE9PSBwdXp6bGUuZ3JpZC5nZXQocHV6emxlLmN1cnNvckNvb3JkcykpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHB1enpsZS5ncmlkLnNldChwdXp6bGUuY3Vyc29yQ29vcmRzLCBsZXR0ZXIpO1xyXG5cclxuICAgICAgICAvLyBjaGVjayBmb3IgY29tcGxldGUgd29yZFxyXG4gICAgICAgIGxldCBhbnlTb2x2ZWQgPSBmYWxzZTtcclxuICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXNBdENlbGwpIHtcclxuICAgICAgICAgICAgY29uc3Qgc29sdmVkID0gZW50cnlTb2x2ZWQoZW50cnksIHB1enpsZS5ncmlkKTtcclxuICAgICAgICAgICAgaWYgKCFlbnRyeS5zb2x2ZWQgJiYgc29sdmVkKSB7XHJcbiAgICAgICAgICAgICAgICBlbnRyeS5zb2x2ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgYW55U29sdmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY2hlY2sgZm9yIGRvbmVcclxuICAgICAgICBpZiAocHV6emxlLmVudHJpZXMuZXZlcnkoZSA9PiBlLnNvbHZlZCkpIHtcclxuICAgICAgICAgICAgb25QdXp6bGVTb2x2ZWQoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFkdmFuY2UgY3Vyc29yXHJcbiAgICAgICAgaWYgKGFueVNvbHZlZCkge1xyXG4gICAgICAgICAgICBjb25zdCBlbnRyeSA9IHB1enpsZS5lbnRyaWVzLmZpbmQoeCA9PiAheC5zb2x2ZWQpO1xyXG4gICAgICAgICAgICBpZiAoZW50cnkpIHtcclxuICAgICAgICAgICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBlbnRyeS5wb3M7XHJcbiAgICAgICAgICAgICAgICBwdXp6bGUuY3Vyc29yRGlyID0gZW50cnkuZGlyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc3QgYWR2YW5jZWRDdXJzb3IgPSBwdXp6bGUuY3Vyc29yQ29vcmRzLmFkZFBvaW50KGdldERpcmVjdGlvblZlY3RvcihwdXp6bGUuY3Vyc29yRGlyKSk7XHJcbiAgICAgICAgICAgIGlmIChmaW5kRW50cmllc0F0Q2VsbChwdXp6bGUuZW50cmllcywgYWR2YW5jZWRDdXJzb3IpLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHB1enpsZS5jdXJzb3JDb29yZHMgPSBwdXp6bGUuY3Vyc29yQ29vcmRzLmFkZFBvaW50KGdldERpcmVjdGlvblZlY3RvcihwdXp6bGUuY3Vyc29yRGlyKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRyYXdQdXp6bGUocHV6emxlQ2FudmFzLCBwdXp6bGVDb250ZXh0LCBwdXp6bGUpO1xyXG4gICAgICAgIHVwZGF0ZVB1enpsZUhpbnRMaXN0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QdXp6bGVIaW50Q2xpY2soZTogRXZlbnQpIHtcclxuICAgICAgICBjb25zdCB0YXJnZXQgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICBjb25zdCBsaSA9IHRhcmdldC5jbG9zZXN0KFwiLnB1enpsZS1oaW50LWxpXCIpIGFzIEhUTUxMSUVsZW1lbnQ7XHJcbiAgICAgICAgY29uc3QgZW50cnlJbmRleFN0cmluZyA9IGxpPy5kYXRhc2V0Py5lbnRyeUluZGV4O1xyXG4gICAgICAgIGlmICghZW50cnlJbmRleFN0cmluZykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlbnRyeUluZGV4ID0gcGFyc2VJbnQoZW50cnlJbmRleFN0cmluZyk7XHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBwdXp6bGUuZW50cmllc1tlbnRyeUluZGV4XTtcclxuICAgICAgICBwdXp6bGUuY3Vyc29yQ29vcmRzID0gZW50cnkucG9zO1xyXG4gICAgICAgIHB1enpsZS5jdXJzb3JEaXIgPSBlbnRyeS5kaXI7XHJcbiAgICAgICAgZHJhd1B1enpsZShwdXp6bGVDYW52YXMsIHB1enpsZUNvbnRleHQsIHB1enpsZSk7XHJcbiAgICAgICAgcHV6emxlQ2FudmFzLmZvY3VzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25QdXp6bGVTb2x2ZWQoKSB7XHJcbiAgICAgICAgYWxlcnQoXCJZT1UgU09MVkVEIFRIRSBQVVpaTEUhIEJSQVZPIVwiKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcm5kRGlyKHJuZzogcmFuZC5STkcpOiBEaXJlY3Rpb24ge1xyXG4gICAgY29uc3QgZGlyZWN0aW9ucyA9IFtEaXJlY3Rpb24uQWNyb3NzLCBEaXJlY3Rpb24uRG93bl07XHJcbiAgICByZXR1cm4gcmFuZC5jaG9vc2Uocm5nLCBkaXJlY3Rpb25zKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGVycChkaXI6IERpcmVjdGlvbik6IERpcmVjdGlvbiB7XHJcbiAgICBpZiAoZGlyID09IERpcmVjdGlvbi5BY3Jvc3MpIHtcclxuICAgICAgICByZXR1cm4gRGlyZWN0aW9uLkRvd247XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIERpcmVjdGlvbi5BY3Jvc3M7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlUHV6emxlKHJuZzogcmFuZC5STkcsIGhpbnRBbnN3ZXJzOiBIaW50QW5zd2VyW10pOiBFbnRyeVtdIHtcclxuICAgIGlmIChoaW50QW5zd2Vycy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgIGFsZXJ0KFwiUGxlYXNlIGVudGVyIGF0IGxlYXN0IG9uZSBoaW50IGFuZCBhbnN3ZXIhXCIpO1xyXG4gICAgICAgIHJldHVybiBbXTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBtYWtlIGFsbCBhbnN3ZXJzIGxvd2VyY2FzZVxyXG4gICAgZm9yIChjb25zdCBoYSBvZiBoaW50QW5zd2Vycykge1xyXG4gICAgICAgIGhhLmFuc3dlciA9IGhhLmFuc3dlci50b0xvY2FsZVVwcGVyQ2FzZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHJldHJ5IHVudGlsIHN1Y2Nlc3NmdWwgKHVwIHRvIGEgY2VydGFpbiBhbW91bnQpXHJcbiAgICBjb25zdCBwdXp6bGVzID0gbmV3IEFycmF5PEVudHJ5W10+KCk7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1BWF9HRU5TOyArK2kpIHtcclxuICAgICAgICBjb25zdCBlbnRyaWVzID0gdHJ5R2VuZXJhdGVQdXp6bGUocm5nLCBoaW50QW5zd2Vycyk7XHJcbiAgICAgICAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHV6emxlcy5wdXNoKGVudHJpZXMpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChwdXp6bGVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiBbXTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBlbnRyaWVzID0gcHV6emxlcy5yZWR1Y2UoKHByZXYsIGN1cikgPT4gY2FsY1Njb3JlKHByZXYpIDwgY2FsY1Njb3JlKGN1cikgPyBwcmV2IDogY3VyKTtcclxuICAgIGVudHJpZXMuc29ydCgoeCwgeSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGRuID0geC5udW0gLSB5Lm51bTtcclxuICAgICAgICByZXR1cm4gZG4gPT09IDAgPyB4LmRpciAtIHkuZGlyIDogZG47XHJcbiAgICB9KTtcclxuXHJcbiAgICBzaGlmdFB1enpsZShlbnRyaWVzKTtcclxuICAgIHJldHVybiBlbnRyaWVzO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0cnlHZW5lcmF0ZVB1enpsZShybmc6IHJhbmQuUk5HLCBoaW50QW5zd2VyczogSGludEFuc3dlcltdKTogRW50cnlbXSB7XHJcbiAgICByYW5kLnNodWZmbGUocm5nLCBoaW50QW5zd2Vycyk7XHJcblxyXG4gICAgLy8gcGxhY2UgbG9uZ2VzdCB3b3JkIGF0IDAsMCByYW5kb21seSBhY3Jvc3MvZG93blxyXG4gICAgY29uc3QgZW50cmllcyA9IG5ldyBBcnJheTxFbnRyeT4oKTtcclxuICAgIGVudHJpZXMucHVzaChwbGFjZUluaXRpYWxFbnRyeShybmcsIGhpbnRBbnN3ZXJzWzBdKSk7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBoaW50QW5zd2Vycy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGhhID0gaGludEFuc3dlcnNbaV07XHJcbiAgICAgICAgY29uc3QgZW50cnkgPSBwbGFjZU5leHRFbnRyeShlbnRyaWVzLCBoYSk7XHJcbiAgICAgICAgaWYgKGVudHJ5KSB7XHJcbiAgICAgICAgICAgIGVudHJpZXMucHVzaChlbnRyeSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZW50cmllcztcclxufVxyXG5cclxuZnVuY3Rpb24gc2hpZnRQdXp6bGUoZW50cmllczogRW50cnlbXSkge1xyXG4gICAgLy8gc2hpZnQgdGhlIHB1enpsZSBzdWNoIHRoYXQgYWxsIHdvcmRzIHN0YXJ0ID49ICgwLCAwKVxyXG4gICAgY29uc3QgbWluWCA9IE1hdGgubWluKC4uLmVudHJpZXMubWFwKHggPT4geC5wb3MueCkpO1xyXG4gICAgY29uc3QgbWluWSA9IE1hdGgubWluKC4uLmVudHJpZXMubWFwKHggPT4geC5wb3MueSkpO1xyXG4gICAgY29uc3QgeHkgPSBuZXcgZ2VvLlBvaW50KC1taW5YLCAtbWluWSk7XHJcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICBlbnRyeS5wb3MgPSBlbnRyeS5wb3MuYWRkUG9pbnQoeHkpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjU2NvcmUoZW50cmllczogRW50cnlbXSk6IG51bWJlciB7XHJcbiAgICAvLyBjYWxjdWxhdGUgcHV6emxlIHNjb3JlLFxyXG4gICAgLy8gbG93ZXIgaXMgYmV0dGVyXHJcbiAgICBjb25zdCB4ID0gTWF0aC5taW4oLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy54KSk7XHJcbiAgICBjb25zdCB5ID0gTWF0aC5taW4oLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy55KSk7XHJcbiAgICBjb25zdCB3ID0gTWF0aC5tYXgoLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy54ICsgZW50cnlXaWR0aChlKSkpIC0geDtcclxuICAgIGNvbnN0IGggPSBNYXRoLm1heCguLi5lbnRyaWVzLm1hcChlID0+IGUucG9zLnkgKyBlbnRyeUhlaWdodChlKSkpIC0geTtcclxuICAgIHJldHVybiB3ICogaDtcclxufVxyXG5cclxuZnVuY3Rpb24gcGxhY2VJbml0aWFsRW50cnkocm5nOiByYW5kLlJORywgaGE6IEhpbnRBbnN3ZXIpOiBFbnRyeSB7XHJcbiAgICBjb25zdCB7IGhpbnQsIGFuc3dlciB9ID0gaGE7XHJcblxyXG4gICAgY29uc3QgZGlyID0gcm5kRGlyKHJuZyk7XHJcbiAgICAvLyBjb25zdCBkaXIgPSBEaXJlY3Rpb24uQWNyb3NzO1xyXG4gICAgY29uc3QgcG9zID0gbmV3IGdlby5Qb2ludCgwLCAwKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIG51bTogMSxcclxuICAgICAgICBoaW50LFxyXG4gICAgICAgIGFuc3dlcixcclxuICAgICAgICBwb3MsXHJcbiAgICAgICAgZGlyLFxyXG4gICAgICAgIHNvbHZlZDogZmFsc2UsXHJcbiAgICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBwbGFjZU5leHRFbnRyeShlbnRyaWVzOiBFbnRyeVtdLCBoYTogSGludEFuc3dlcik6IEVudHJ5IHwgdW5kZWZpbmVkIHtcclxuICAgIGNvbnN0IHsgaGludCwgYW5zd2VyIH0gPSBoYTtcclxuXHJcbiAgICAvLyBmaW5kIG5leHQgcG9zc2libGUgaW50ZXJzZWN0aW9uIHdpdGggZXhpc3Rpbmcgd29yZHNcclxuICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgIC8vIGZpbmQgbmV4dCBjb21tb24gbGV0dGVyXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbnRyeS5hbnN3ZXIubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBhbnN3ZXIubGVuZ3RoOyArK2opIHtcclxuICAgICAgICAgICAgICAgIGlmIChlbnRyeS5hbnN3ZXJbaV0gPT09IGFuc3dlcltqXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRyeSBwbGFjaW5nIHRoZSB3b3JkIGhlcmVcclxuICAgICAgICAgICAgICAgICAgICAvLyBpID0gaW5kZXggaW4gYWxyZWFkeSBwbGFjZWQgd29yZFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGogPSBpbmRleCBpbiB1bnBsYWNlZCB3b3JkXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgd29yZCBpcyB2ZXJ0aWNhbCwgcGxhY2UgaG9yaXpvbnRhbFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHdvcmQgaXMgaG9yaXpvbnRhbCwgcGxhY2UgdmVydGljYWxcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21tb25Qb3MgPSBnZXRDaGFyUG9zaXRpb24oZW50cnkucG9zLCBlbnRyeS5kaXIsIGkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpciA9IHBlcnAoZW50cnkuZGlyKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb3MgPSBnZXRTdGFydFBvc2l0aW9uKGNvbW1vblBvcywgZGlyLCBqKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNWYWxpZFdvcmRQbGFjZW1lbnQoZW50cmllcywgYW5zd2VyLCBwb3MsIGRpcikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZG9lcyBhbm90aGVyIGVudHJ5IHN0YXJ0IGhlcmU/IGlmIHNvLCBzaGFyZSBpdCdzIG51bVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2UsIHVzZSBtYXggKyAxXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG51bSA9IGVudHJpZXMuZmlsdGVyKHggPT4geC5wb3MuZXF1YWwocG9zKSkubWFwKHggPT4geC5udW0pWzBdID8/IE1hdGgubWF4KC4uLmVudHJpZXMubWFwKHggPT4geC5udW0gKyAxKSkgPz8gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZTogRW50cnkgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoaW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5zd2VyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc29sdmVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBubyBwbGFjZW1lbnQgZm91bmRcclxuICAgIHJldHVybjtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0RGlyZWN0aW9uVmVjdG9yKGRpcjogRGlyZWN0aW9uKTogZ2VvLlBvaW50IHtcclxuICAgIHN3aXRjaCAoZGlyKSB7XHJcbiAgICAgICAgY2FzZSBEaXJlY3Rpb24uQWNyb3NzOlxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgxLCAwKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBEaXJlY3Rpb24uRG93bjpcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMCwgMSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgZGlyZWN0b25cIik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmFsaWRXb3JkUGxhY2VtZW50KGVudHJpZXM6IEVudHJ5W10sIGFuc3dlcjogc3RyaW5nLCBwb3M6IGdlby5Qb2ludCwgZGlyOiBEaXJlY3Rpb24pOiBib29sZWFuIHtcclxuICAgIC8vIGNoZWNrIGZvciBvdmVybGFwXHJcbiAgICAvLyBjYXNlczpcclxuICAgIC8vIGFjcm9zcy9hY3Jvc3NcclxuICAgIC8vIGRvd24vZG93blxyXG4gICAgLy8gYWNyb3NzL2Rvd25cclxuICAgIC8vIGRvd24vYWNyb3NzIChzd2FwIGFuZCBtYWtlIHNhbWUgY2FzZT8pXHJcbiAgICAvLyBhbnkgb3ZlcmxhcCBhdCBub24tXHJcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICBpZiAoIWlzVmFsaWRQbGFjZW1lbnQoZW50cnkucG9zLCBlbnRyeS5hbnN3ZXIsIGVudHJ5LmRpciwgcG9zLCBhbnN3ZXIsIGRpcikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNWYWxpZFBsYWNlbWVudChwb3MxOiBnZW8uUG9pbnQsIGExOiBzdHJpbmcsIGRpcjE6IERpcmVjdGlvbiwgcG9zMjogZ2VvLlBvaW50LCBhMjogc3RyaW5nLCBkaXIyOiBEaXJlY3Rpb24pOiBib29sZWFuIHtcclxuICAgIGlmIChkaXIxID09PSBEaXJlY3Rpb24uQWNyb3NzICYmIGRpcjIgPT09IERpcmVjdGlvbi5BY3Jvc3MpIHtcclxuICAgICAgICByZXR1cm4gaXNWYWxpZFBsYWNlbWVudEFjcm9zc0Fjcm9zcyhwb3MxLCBhMSwgcG9zMiwgYTIpO1xyXG4gICAgfSBlbHNlIGlmIChkaXIxID09PSBEaXJlY3Rpb24uRG93biAmJiBkaXIyID09PSBEaXJlY3Rpb24uRG93bikge1xyXG4gICAgICAgIHJldHVybiBpc1ZhbGlkUGxhY2VtZW50RG93bkRvd24ocG9zMSwgYTEsIHBvczIsIGEyKTtcclxuICAgIH0gZWxzZSBpZiAoZGlyMSA9PT0gRGlyZWN0aW9uLkFjcm9zcyAmJiBkaXIyID09PSBEaXJlY3Rpb24uRG93bikge1xyXG4gICAgICAgIHJldHVybiBpc1ZhbGlkUGxhY2VtZW50QWNyb3NzRG93bihwb3MxLCBhMSwgcG9zMiwgYTIpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBpc1ZhbGlkUGxhY2VtZW50RG93bkFjcm9zcyhwb3MxLCBhMSwgcG9zMiwgYTIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkUGxhY2VtZW50QWNyb3NzQWNyb3NzKHBvczE6IGdlby5Qb2ludCwgYTE6IHN0cmluZywgcG9zMjogZ2VvLlBvaW50LCBhMjogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAvLyBpZiB5IGNvb3JkcyBub3QgdG91Y2hpbmcsIHZhbGlkXHJcbiAgICBpZiAoTWF0aC5hYnMocG9zMS55IC0gcG9zMi55KSA+IDEpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBpZiB4IHJhbmdlcyBub3QgdG91Y2hpbmcsIHZhbGlkXHJcbiAgICBpZiAocG9zMS54ICsgYTEubGVuZ3RoICsgMSA8IHBvczEueCB8fCBwb3MxLnggPiBwb3MyLnggKyBhMi5sZW5ndGggKyAxKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkUGxhY2VtZW50RG93bkRvd24ocG9zMTogZ2VvLlBvaW50LCBhMTogc3RyaW5nLCBwb3MyOiBnZW8uUG9pbnQsIGEyOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIC8vIGlmIHkgY29vcmRzIG5vdCB0b3VjaGluZywgdmFsaWRcclxuICAgIGlmIChNYXRoLmFicyhwb3MxLnggLSBwb3MyLngpID4gMSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGlmIHggcmFuZ2VzIG5vdCB0b3VjaGluZywgdmFsaWRcclxuICAgIGlmIChwb3MxLnkgKyBhMS5sZW5ndGggKyAxIDwgcG9zMS55IHx8IHBvczEueSA+IHBvczIueSArIGEyLmxlbmd0aCArIDEpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmFsaWRQbGFjZW1lbnRBY3Jvc3NEb3duKHBvczE6IGdlby5Qb2ludCwgYTE6IHN0cmluZywgcG9zMjogZ2VvLlBvaW50LCBhMjogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAvLyBpZiBubyBvdmVybGFwIG9uIHgtYXhpcyB2YWxpZFxyXG4gICAgaWYgKHBvczEueCArIGExLmxlbmd0aCA8IHBvczIueCAtIDEgfHwgcG9zMS54ID4gcG9zMi54ICsgMSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGlmIG5vIG92ZXJsYXAgb24geS1heGlzLCB2YWxpZFxyXG4gICAgaWYgKHBvczEueSA8IHBvczIueSAtIDEgfHwgcG9zMS55ID4gcG9zMi55ICsgYTIubGVuZ3RoICsgMSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGlmIHRvdWNoaW5nIChpeCBvdXRzaWRlIG9mIGVpdGhlciB3b3JkLCBub3QgYSB2YWxpZCBwbGFjZW1lbnQpXHJcbiAgICBjb25zdCBpeCA9IG5ldyBnZW8uUG9pbnQocG9zMi54LCBwb3MxLnkpO1xyXG4gICAgaWYgKFxyXG4gICAgICAgIGl4LnggPCBwb3MxLnggfHwgaXgueCA+IHBvczEueCArIGExLmxlbmd0aFxyXG4gICAgICAgIHx8IGl4LnkgPCBwb3MyLnkgfHwgaXgueSA+IHBvczIueSArIGEyLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYTFbaXgueCAtIHBvczEueF0gPT09IGEyW2l4LnkgLSBwb3MyLnldO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1ZhbGlkUGxhY2VtZW50RG93bkFjcm9zcyhwb3MxOiBnZW8uUG9pbnQsIGExOiBzdHJpbmcsIHBvczI6IGdlby5Qb2ludCwgYTI6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIGlzVmFsaWRQbGFjZW1lbnRBY3Jvc3NEb3duKHBvczIsIGEyLCBwb3MxLCBhMSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldENoYXJQb3NpdGlvbihzdGFydFBvc2l0aW9uOiBnZW8uUG9pbnQsIGRpcjogRGlyZWN0aW9uLCBpbmRleDogbnVtYmVyKTogZ2VvLlBvaW50IHtcclxuICAgIGNvbnN0IHYgPSBnZXREaXJlY3Rpb25WZWN0b3IoZGlyKTtcclxuICAgIHJldHVybiBzdGFydFBvc2l0aW9uLmFkZFBvaW50KHYubXVsU2NhbGFyKGluZGV4KSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFN0YXJ0UG9zaXRpb24oY2hhclBvc2l0aW9uOiBnZW8uUG9pbnQsIGRpcjogRGlyZWN0aW9uLCBpbmRleDogbnVtYmVyKTogZ2VvLlBvaW50IHtcclxuICAgIC8vIGdldCB0aGUgc3RhcnQgcG9zaXRpb24gb2YgYSB3b3JkIGdpdmVuIHRoZSBwb3NpdGlvbiBvZiBhIHNwZWNpZmllZCBpbmRleFxyXG4gICAgY29uc3QgdiA9IGdldERpcmVjdGlvblZlY3RvcihkaXIpO1xyXG4gICAgcmV0dXJuIGNoYXJQb3NpdGlvbi5zdWJQb2ludCh2Lm11bFNjYWxhcihpbmRleCkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3UHV6emxlKGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQsIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCBwdXp6bGU6IFB1enpsZSkge1xyXG4gICAgY29uc3QgbGV0dGVyRm9udCA9IFwiYm9sZCAxNnB4IGFyaWFsXCI7XHJcbiAgICBjb25zdCBudW1iZXJGb250ID0gXCJub3JtYWwgMTBweCBhcmlhbFwiO1xyXG4gICAgY3R4LmZvbnQgPSBsZXR0ZXJGb250O1xyXG4gICAgY29uc3QgbGV0dGVyVGV4dEhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dChcIk1cIikud2lkdGg7XHJcbiAgICBjdHguZm9udCA9IG51bWJlckZvbnQ7XHJcbiAgICBjb25zdCBudW1iZXJUZXh0SGVpZ2h0ID0gY3R4Lm1lYXN1cmVUZXh0KFwiTVwiKS53aWR0aDtcclxuXHJcbiAgICAvLyBkcmF3IGJhY2tncm91bmRcclxuICAgIGN0eC5maWxsU3R5bGUgPSBcImJsYWNrXCI7XHJcbiAgICBjb25zdCBlbnRyaWVzID0gcHV6emxlLmVudHJpZXM7XHJcbiAgICBjb25zdCBwdyA9IE1hdGgubWF4KC4uLmVudHJpZXMubWFwKGUgPT4gZS5wb3MueCArIGVudHJ5V2lkdGgoZSkpKTtcclxuICAgIGNvbnN0IHBoID0gTWF0aC5tYXgoLi4uZW50cmllcy5tYXAoZSA9PiBlLnBvcy55ICsgZW50cnlIZWlnaHQoZSkpKTtcclxuICAgIGNvbnN0IGNhbnZhc1dpZHRoID0gcHcgKiBDRUxMX1NJWkU7XHJcbiAgICBjb25zdCBjYW52YXNIZWlnaHQgPSBwaCAqIENFTExfU0laRTtcclxuICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhc1dpZHRoO1xyXG4gICAgY2FudmFzLmhlaWdodCA9IGNhbnZhc0hlaWdodDtcclxuICAgIGN0eC5maWxsUmVjdCgwLCAwLCBjYW52YXNXaWR0aCwgY2FudmFzSGVpZ2h0KTtcclxuXHJcbiAgICAvLyBkcmF3IGxldHRlcnMgYW5kIGNlbGxzXHJcbiAgICBjdHguZm9udCA9IFwiYm9sZCAxOHB4IGFyaWFsXCI7XHJcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICBjb25zdCB7IHBvcywgYW5zd2VyLCBkaXIgfSA9IGVudHJ5O1xyXG4gICAgICAgIGNvbnN0IHYgPSBnZXREaXJlY3Rpb25WZWN0b3IoZGlyKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhbnN3ZXIubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgcCA9IHBvcy5hZGRQb2ludCh2Lm11bFNjYWxhcihpKSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGN4ID0gcC54ICogQ0VMTF9TSVpFO1xyXG4gICAgICAgICAgICBjb25zdCBjeSA9IHAueSAqIENFTExfU0laRTtcclxuXHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIndoaXRlXCI7XHJcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdChjeCwgY3ksIENFTExfU0laRSwgQ0VMTF9TSVpFKTtcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiYmxhY2tcIjtcclxuXHJcbiAgICAgICAgICAgIGN0eC5mb250ID0gXCJib2xkIDE4cHggYXJpYWxcIjtcclxuICAgICAgICAgICAgY3R4LnN0cm9rZVJlY3QoY3gsIGN5LCBDRUxMX1NJWkUsIENFTExfU0laRSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgbnVtYmVyc1xyXG4gICAgY3R4LmZvbnQgPSBcIm5vcm1hbCAxMHB4IGFyaWFsXCI7XHJcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICAvLyBkcmF3IG51bWJlclxyXG4gICAgICAgIGNvbnN0IGNvb3JkcyA9IGVudHJ5LnBvcy5tdWxTY2FsYXIoQ0VMTF9TSVpFKTtcclxuICAgICAgICBjdHguZmlsbFRleHQoYCR7ZW50cnkubnVtfWAsIGNvb3Jkcy54ICsgMiwgY29vcmRzLnkgKyAyICsgbnVtYmVyVGV4dEhlaWdodCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZHJhdyBlbnRlcmVkIGxldHRlcnNcclxuICAgIGNvbnN0IGdyaWQgPSBwdXp6bGUuZ3JpZDtcclxuICAgIGZvciAoY29uc3QgY2VsbENvb3JkcyBvZiBncmlkLmtleXMoKSkge1xyXG4gICAgICAgIGNvbnN0IGxldHRlciA9IGdyaWQuZ2V0KGNlbGxDb29yZHMpO1xyXG4gICAgICAgIGlmICghbGV0dGVyKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29vcmRzID0gY2VsbENvb3Jkc1RvQ2FudmFzQ29vcmRzKGNlbGxDb29yZHMpLmFkZFBvaW50KG5ldyBnZW8uUG9pbnQoQ0VMTF9QQURESU5HLCBDRUxMX1BBRERJTkcpKTtcclxuICAgICAgICBjb25zdCBtZXRyaWNzID0gY3R4Lm1lYXN1cmVUZXh0KGxldHRlcik7XHJcbiAgICAgICAgY29vcmRzLnggKz0gQ0VMTF9JTlRFUklPUl9TSVpFIC8gMi4wO1xyXG4gICAgICAgIGNvb3Jkcy55ICs9IENFTExfSU5URVJJT1JfU0laRSAvIDIuMDtcclxuICAgICAgICBjb29yZHMueSArPSBsZXR0ZXJUZXh0SGVpZ2h0IC8gMi4wO1xyXG4gICAgICAgIGNvb3Jkcy54IC09IG1ldHJpY3Mud2lkdGggLyAyLjA7XHJcbiAgICAgICAgY3R4LmZvbnQgPSBcIjE2cHggYXJpYWxcIjtcclxuICAgICAgICBjdHguZmlsbFRleHQobGV0dGVyLCBjb29yZHMueCwgY29vcmRzLnkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGRyYXcgcmVkIHdoZXJlIGhvdmVyaW5nXHJcbiAgICBpZiAocHV6emxlLmhvdmVyQ29vcmRzKSB7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMztcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJlZFwiO1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KHB1enpsZS5ob3ZlckNvb3Jkcy54ICogQ0VMTF9TSVpFLCBwdXp6bGUuaG92ZXJDb29yZHMueSAqIENFTExfU0laRSwgQ0VMTF9TSVpFLCBDRUxMX1NJWkUpO1xyXG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZHJhdyBjdXJzb3JcclxuICAgIGlmIChwdXp6bGUuY3Vyc29yQ29vcmRzKSB7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuXHJcbiAgICAgICAgY29uc3QgY2FudmFzQ29vcmRzID0gY2VsbENvb3Jkc1RvQ2FudmFzQ29vcmRzKHB1enpsZS5jdXJzb3JDb29yZHMpO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAzO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJlZFwiO1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguYXJjKGNhbnZhc0Nvb3Jkcy54ICsgQ0VMTF9TSVpFIC8gMi4wLCBjYW52YXNDb29yZHMueSArIENFTExfU0laRSAvIDIuMCwgMywgMCwgTWF0aC5QSSAqIDIpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcblxyXG4gICAgICAgIC8vIGhpZ2hsaWdodCB3b3JkIHVuZGVyIGN1cnNvclxyXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBmaW5kRW50cmllc0F0Q2VsbChwdXp6bGUuZW50cmllcywgcHV6emxlLmN1cnNvckNvb3JkcykuZmlsdGVyKHggPT4geC5kaXIgPT09IHB1enpsZS5jdXJzb3JEaXIpO1xyXG4gICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBlbnRyeS5zb2x2ZWQgPyBcImdyZWVuXCIgOiBcInJlZFwiO1xyXG4gICAgICAgICAgICBjb25zdCB7IHgsIHkgfSA9IGNlbGxDb29yZHNUb0NhbnZhc0Nvb3JkcyhlbnRyeS5wb3MpO1xyXG4gICAgICAgICAgICBjb25zdCB3aWR0aCA9IGVudHJ5V2lkdGgoZW50cnkpICogQ0VMTF9TSVpFO1xyXG4gICAgICAgICAgICBjb25zdCBoZWlnaHQgPSBlbnRyeUhlaWdodChlbnRyeSkgKiBDRUxMX1NJWkU7XHJcbiAgICAgICAgICAgIGN0eC5zdHJva2VSZWN0KHgsIHksIHdpZHRoLCBoZWlnaHQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZW50cnlXaWR0aChlbnRyeTogRW50cnkpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIGVudHJ5LmRpciA9PT0gRGlyZWN0aW9uLkFjcm9zcyA/IGVudHJ5LmFuc3dlci5sZW5ndGggOiAxO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlbnRyeUhlaWdodChlbnRyeTogRW50cnkpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIGVudHJ5LmRpciA9PT0gRGlyZWN0aW9uLkRvd24gPyBlbnRyeS5hbnN3ZXIubGVuZ3RoIDogMTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2FudmFzQ29vcmRzVG9DZWxsQ29vcmRzKHh5OiBnZW8uUG9pbnQpOiBnZW8uUG9pbnQge1xyXG4gICAgcmV0dXJuIHh5LmRpdlNjYWxhcihDRUxMX1NJWkUpLmZsb29yKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNlbGxDb29yZHNUb0NhbnZhc0Nvb3Jkcyh4eTogZ2VvLlBvaW50KTogZ2VvLlBvaW50IHtcclxuICAgIHJldHVybiB4eS5tdWxTY2FsYXIoQ0VMTF9TSVpFKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZmluZEVudHJpZXNBdENlbGwoZW50cmllczogRW50cnlbXSwgeHk6IGdlby5Qb2ludCk6IEVudHJ5W10ge1xyXG4gICAgcmV0dXJuIGVudHJpZXMuZmlsdGVyKHggPT4gZW50cnlDb250YWluc1BvaW50KHgsIHh5KSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFueUVudHJpZXNBdENlbGwoZW50cmllczogRW50cnlbXSwgeHk6IGdlby5Qb2ludCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIGZpbmRFbnRyaWVzQXRDZWxsKGVudHJpZXMsIHh5KS5sZW5ndGggPiAwO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlbnRyeUNvbnRhaW5zUG9pbnQoZW50cnk6IEVudHJ5LCB4eTogZ2VvLlBvaW50KTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gZW50cnkuZGlyID09PSBEaXJlY3Rpb24uQWNyb3NzICYmIHh5LnkgPT09IGVudHJ5LnBvcy55ICYmIHh5LnggPj0gZW50cnkucG9zLnggJiYgeHkueCA8IGVudHJ5LnBvcy54ICsgZW50cnkuYW5zd2VyLmxlbmd0aFxyXG4gICAgICAgIHx8IGVudHJ5LmRpciA9PT0gRGlyZWN0aW9uLkRvd24gJiYgeHkueCA9PT0gZW50cnkucG9zLnggJiYgeHkueSA+PSBlbnRyeS5wb3MueSAmJiB4eS55IDwgZW50cnkucG9zLnkgKyBlbnRyeS5hbnN3ZXIubGVuZ3RoO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlbnRyeVNvbHZlZChlbnRyeTogRW50cnksIGdyaWQ6IExldHRlck1hcCk6IGJvb2xlYW4ge1xyXG4gICAgLy8gY2hlY2sgZm9yIGNvbXBsZXRlIHdvcmRcclxuICAgIGNvbnN0IHYgPSBnZXREaXJlY3Rpb25WZWN0b3IoZW50cnkuZGlyKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZW50cnkuYW5zd2VyLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgY29vcmRzID0gZW50cnkucG9zLmFkZFBvaW50KHYubXVsU2NhbGFyKGkpKTtcclxuICAgICAgICBpZiAoZW50cnkuYW5zd2VyW2ldICE9PSBncmlkLmdldChjb29yZHMpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEFycm93S2V5VmVjdG9yKGtleTogc3RyaW5nKTogZ2VvLlBvaW50IHtcclxuICAgIGlmIChrZXkgPT09IFwiQXJyb3dMZWZ0XCIpIHtcclxuICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgtMSwgMCk7XHJcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gXCJBcnJvd0Rvd25cIikge1xyXG4gICAgICAgIHJldHVybiBuZXcgZ2VvLlBvaW50KDAsIDEpO1xyXG4gICAgfSBlbHNlIGlmIChrZXkgPT09IFwiQXJyb3dSaWdodFwiKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBnZW8uUG9pbnQoMSwgMCk7XHJcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gXCJBcnJvd1VwXCIpIHtcclxuICAgICAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgwLCAtMSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV3IGdlby5Qb2ludCgwLCAwKTtcclxufVxyXG5cclxubWFpbigpIl19