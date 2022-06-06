import * as dom from "../shared/dom.js"
import * as rand from "../shared/rand.js"
import * as geo from "../shared/geo2d.js"
import { canvas2Blob } from "../shared/imaging.js";

const STORAGE_KEY = "crossword_storage";

interface HintAnswer {
    hint: string,
    answer: string,
}

enum Direction {
    Across,
    Down,
}

interface Entry {
    hint: string,
    answer: string,
    pos: geo.Point,
    dir: Direction,
}

function main() {
    let hintAnswers = new Array<HintAnswer>();
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
    const rng = new rand.SFC32RNG(0, 0, 0, 0);
    hintAnswerForm.addEventListener("submit", addHintAnswer);
    createButton.addEventListener("click", () => create());
    clearButton.addEventListener("click", clear);

    returnToCreate.addEventListener("click", () => {
        playUi.hidden = true;
        createUi.hidden = false;
    });

    dom.delegate(hintAnswerList, "click", ".delete-button", deleteHintAnswer);

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
    }

    function save() {
        const jsonData = JSON.stringify(hintAnswers);
        localStorage.setItem(STORAGE_KEY, jsonData);
    }

    function create() {
        const puzzle = generatePuzzle(rng, hintAnswers);
        if (!puzzle) {
            alert("Failed to generate puzzle");
            return;
        }

        play(puzzle);
    }

    function play(entries: Entry[]) {
        createUi.hidden = true;
        playUi.hidden = false;
        puzzleCanvas.width = puzzleCanvas.clientWidth;
        puzzleCanvas.height = puzzleCanvas.clientHeight;
        drawPuzzle(puzzleCanvas, puzzleContext, entries);
        updatePuzzleHintAnswerList(entries);
    }

    function updatePuzzleHintAnswerList(entries: Entry[]) {
        dom.removeAllChildren(puzzleHintAcrossList);
        dom.removeAllChildren(puzzleHintDownList);

        for (let i = 0; i < entries.length; ++i) {
            const entry = entries[i];
            const fragment = puzzleHintTemplate.content.cloneNode(true) as DocumentFragment;
            const hintLi = dom.bySelector(fragment, ".puzzle-hint-li");
            hintLi.textContent = `${i + 1}. ${entry.hint}`;

            if (entry.dir === Direction.Across) {
                puzzleHintAcrossList.appendChild(fragment)
            } else {
                puzzleHintDownList.appendChild(fragment)
            }
        }
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
    for (let i = 0; i < 1000; ++i) {
        console.log(`Iteration ${i}`);
        const entries = tryGeneratePuzzle(rng, hintAnswers);
        if (entries.length === 0) {
            continue;
        }

        console.log("Success!");
        shiftPuzzle(entries);
        return entries;
    }

    throw new Error("Failed to generate puzzle!");
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
            console.log(`Failed to place '${ha.answer}'`);
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

function placeInitialEntry(rng: rand.RNG, ha: HintAnswer): Entry {
    const { hint, answer } = ha;

    const dir = rndDir(rng);
    // const dir = Direction.Across;
    const pos = new geo.Point(0, 0);

    return {
        hint,
        answer,
        pos,
        dir
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
                    if (isValidPlacement(entries, answer, pos, dir)) {
                        const e: Entry = {
                            hint,
                            answer,
                            pos,
                            dir,
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

function isValidPlacement(entries: Entry[], answer: string, pos: geo.Point, dir: Direction): boolean {
    // check for overlap
    // cases:
    // across/across
    // down/down
    // across/down
    // down/across (swap and make same case?)
    // any overlap at non-
    for (const entry of entries) {
        if (entry.dir === Direction.Across && dir === Direction.Across && !isValidPlacementAcrossAcross(entry.pos, entry.answer, pos, answer)) {
            return false;
        } else if (entry.dir === Direction.Down && dir === Direction.Down && !isValidPlacementDownDown(entry.pos, entry.answer, pos, answer)) {
            return false;
        } else if (entry.dir === Direction.Across && dir === Direction.Down && !isValidPlacementAcrossDown(entry.pos, entry.answer, pos, answer)) {
            return false;
        } else if (entry.dir === Direction.Down && dir === Direction.Across && !isValidPlacementAcrossDown(pos, answer, entry.pos, entry.answer)) {
            return false;
        }
    }

    return true;
}

function isValidPlacementAcrossAcross(pos1: geo.Point, a1: string, pos2: geo.Point, a2: string): boolean {
    // if y-coords are not the same, no overlap
    if (Math.abs(pos1.y - pos2.y) === 1) {
        return false;
    }

    if (pos1.y !== pos2.y) {
        return true;
    }

    return isValidPlacementSameAxis(pos1.x, a1, pos2.x, a2);
}

function isValidPlacementDownDown(pos1: geo.Point, a1: string, pos2: geo.Point, a2: string) {
    if (Math.abs(pos1.x - pos2.x) === 1) {
        return false;
    }

    // if x-coords are not the same, no overlap
    if (pos1.x !== pos2.x) {
        return true;
    }

    return isValidPlacementSameAxis(pos1.y, a1, pos2.y, a2);
}

function isValidPlacementSameAxis(p1: number, a1: string, p2: number, a2: string): boolean {
    const start = Math.max(p1, p2);
    const end = Math.min(p1 + a1.length, p2 + a2.length);

    for (let i = start; i < end; ++i) {
        // letters must be the same within overlapping region
        const i1 = i - p1;
        const i2 = i - p2;
        if (a1[i1] !== a2[i2]) {
            return false;
        }
    }

    return true;
}

function isValidPlacementAcrossDown(pos1: geo.Point, a1: string, pos2: geo.Point, a2: string): boolean {
    // can only overlap at a single intersection point
    // intersection is at:
    // (pos2.x, pos1.y)
    // intersection only exists if:
    // pos2.x is between start/end of a1
    // pos1.y is between start/end of a2
    const x = pos2.x;
    const y = pos1.y;

    if (x < pos1.x || x >= pos1.x + a1.length) {
        return true;
    }

    if (y < pos2.y || y >= pos2.y + a2.length) {
        return true;
    }

    const i1 = x - pos1.x;
    const i2 = y - pos2.y;
    return a1[i1] === a2[i2];
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

function drawPuzzle(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, entries: Entry[]) {
    const letterText = "bold 16px arial";
    const numberText = "normal 8px arial";
    ctx.font = letterText;
    const letterTextHeight = ctx.measureText("M").width;
    ctx.font = numberText;
    const numberTextHeight = ctx.measureText("M").width;

    ctx.fillStyle = "black";

    const padding = 4;
    const cellSize = letterTextHeight + padding * 2;
    const pw = Math.max(...entries.map(e => e.pos.x + entryWidth(e)));
    const ph = Math.max(...entries.map(e => e.pos.y + entryHeight(e)));
    const canvasWidth = pw * cellSize;
    const canvasHeight = ph * cellSize;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.fillRect(0, 0, pw * cellSize, ph * cellSize);
    for (let i = 0; i < entries.length; ++i) {
        const entry = entries[i];
        const { pos, answer, dir } = entry;
        const v = getDirectionVector(dir);

        for (let j = 0; j < answer.length; ++j) {
            const p = pos.addPoint(v.mulScalar(j));
            const cx = p.x * cellSize;
            const cy = p.y * cellSize;

            ctx.fillStyle = "white";
            ctx.fillRect(cx, cy, cellSize, cellSize);
            ctx.fillStyle = "black";

            // draw number
            if (j == 0) {
                ctx.font = "normal 8px arial";
                ctx.fillText(`${i + 1}`, cx + 1, cy + 1 + numberTextHeight);
            }

            ctx.font = "bold 16px arial";
            // ctx.fillText(answer[j], cx + padding, cy + padding + letterTextHeight);
            ctx.strokeRect(cx, cy, cellSize, cellSize);
        }
    }



    // size canvas to grid
}

function entryWidth(entry: Entry): number {
    return entry.dir === Direction.Across ? entry.answer.length : 1;
}

function entryHeight(entry: Entry): number {
    return entry.dir === Direction.Down ? entry.answer.length : 1;
}

main()