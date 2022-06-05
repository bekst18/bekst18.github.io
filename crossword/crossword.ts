import * as dom from "../shared/dom.js"
import * as rand from "../shared/rand.js"
import * as geo from "../shared/geo2d.js"

const STORAGE_KEY = "crossword_storage";

interface HintAnswer {
    hint: string,
    answer: string,
}

enum Direction {
    Across,
    Down,
}

interface Word {
    hint: string,
    answer: string,
    position: geo.Point,
    direction: Direction
}


function main() {
    let hintAnswers = new Array<HintAnswer>();
    const hintAnswerForm = dom.byId("hintAnswerForm") as HTMLFormElement;
    const hintInput = dom.byId("hint") as HTMLInputElement;
    const answerInput = dom.byId("answer") as HTMLInputElement;
    const hintAnswerTemplate = dom.byId("hintAnswerTemplate") as HTMLTemplateElement;
    const hintAnswerList = dom.byId("hintAnswers") as HTMLOListElement;
    const createButton = dom.byId("createButton") as HTMLButtonElement;
    const clearButton = dom.byId("clearButton") as HTMLButtonElement;
    const seed = rand.xmur3(new Date().toString());
    const rng = new rand.SFC32RNG(seed(), seed(), seed(), seed());
    const directions = [Direction.Across, Direction.Down];

    hintAnswerForm.addEventListener("submit", addHintAnswer);
    createButton.addEventListener("click", create);
    clearButton.addEventListener("click", clear);
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

    function rndDir(): Direction {
        return rand.choose(rng, directions);
    }

    function create() {
        // sort words from longest to shortest
        hintAnswers = hintAnswers.sort((a, b) => b.answer.length - a.answer.length);
        if (hintAnswers.length == 0) {
            alert("Please enter at least one hint and answer!");
            return;
        }

        // make all answers lowercase
        for (const ha of hintAnswers) {
            ha.answer = ha.answer.toLocaleLowerCase();
        }

        // place longest word at 0,0 randomly across/down
        const words = new Array<Word>();
        words.push(placeInitialWord(hintAnswers[0]));

        for (let i = 1; i < words.length; ++i) {
            let ha = hintAnswers[i];
            placeNextWord(words, ha);
        }
    }

    function placeInitialWord(hintAnswer: HintAnswer): Word {
        const direction = rndDir();
        const position = new geo.Point(0, 0);
        let { hint, answer } = hintAnswer;
        return {
            hint,
            answer,
            position,
            direction
        };
    }

    function placeNextWord(words: Word[], hintAnswer: HintAnswer): Word {
        // find next possible intersection with existing words
        const { hint, answer } = hintAnswer;
        for (const word of words) {
            // find next common letter
            const w = word.answer;
            for (let i = 0; i < w.length; ++i) {
                for (let j = 0; j < answer.length; ++i) {
                    if (w[i] === answer[j]) {
                        // try placing the word here

                    }
                }
            }
        }
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

        return new geo.Point(0, 0);
    }

    function getWordCharPosition(word: Word, i: number): geo.Point {
        const { position, direction } = word;
        const v = getDirectionVector(direction);
        return position.addPoint(v.mulScalar(i));
    }

    function isValidWordPosition(words: Word[], hint: string, answer: string, position: geo.Point): boolean {
        for (const word of words) {
            
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
}

main()

