"use strict";

init();
function init() {
    const wordInput = document.getElementById("word");
    const settingsWordList = document.getElementById("settingsWordList");
    const addWordButton = document.getElementById("addWord");
    const generateButton = document.getElementById("generateButton");
    const saveSettingsButton = document.getElementById("saveSettings");
    const loadSettingsButton = document.getElementById("loadSettings");
    const returnToSettingsButton = document.getElementById("returnToSettings");
    const resetButton = document.getElementById("resetButton");
    const widthInput = document.getElementById("width");
    const heightInput = document.getElementById("height");
    const horizontalCheckbox = document.getElementById("horizontal");
    const verticalCheckbox = document.getElementById("vertical");
    const diagonalCheckbox = document.getElementById("diagonal");
    const reverseCheckbox = document.getElementById("reverse");
    const settingsDiv = document.getElementById("settings");
    const resultsDiv = document.getElementById("results");
    const settingsKey = "wordSearchSettings";
    loadSettings();

    wordInput.addEventListener("keydown", (evt) => {
        if (evt.key !== "Enter") {
            return;
        }

        var input = evt.target;
        if (!input.value) {
            return;
        }

        addWord(settingsWordList, input.value);
        wordInput.value = "";
    });

    addWordButton.addEventListener("click", (evt) => {
        if (!wordInput.value) {
            return;
        }

        addWord(settingsWordList, wordInput.value);
        wordInput.value = "";
        wordInput.focus();
    });

    generateButton.addEventListener("click", evt => {
        const settings = getSettings();
        const success = generateWordSearch(settings);

        if (success) {
            settingsDiv.hidden = true;
            resultsDiv.hidden = false;
        }
    });

    saveSettingsButton.addEventListener("click", evt => {
        const settings = getSettings();
        localStorage.setItem(settingsKey, JSON.stringify(settings));
    });

    loadSettingsButton.addEventListener("click", loadSettings);

    resetButton.addEventListener("click", (evt) => {
        widthInput.value = 24;
        heightInput.value = 20;

        var wordDivs = settingsWordList.querySelectorAll("#settingsWordList .word");
        for (const div of wordDivs) {
            div.remove();
        }
    });

    returnToSettingsButton.addEventListener("click", evt => {
        settingsDiv.hidden = false;
        resultsDiv.hidden = true;
    });

    document.addEventListener("click", (evt) => {
        const target = evt.target;
        if (!target.matches(".word")) {
            return;
        }

        target.remove();
    });

    function getSettings() {
        const width = parseInt(widthInput.value) || 32;
        const height = parseInt(heightInput.value) || 32;
        const words = getWords(settingsWordList);
        const horizontal = horizontalCheckbox.checked;
        const vertical = verticalCheckbox.checked;
        const diagonal = diagonalCheckbox.checked;
        const reverse = reverseCheckbox.checked;

        return {
            width: width,
            height: height,
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

        const settings = JSON.parse(json);
        removeChildren(settingsWordList);
        widthInput.value = settings.width;
        heightInput.value = settings.height;
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
}

function addWord(wordList, word) {
    word = word.trim().toUpperCase();
    let words = getWords(wordList);
    words.push(word)

    const wordsObj = {};
    for (const word of words) {
        wordsObj[word] = true
    }

    words = []
    for (const word in wordsObj) {
        words.push(word)
    }

    words.sort()

    removeChildren(wordList);
    for (const word of words) {
        const wordDiv = document.createElement("div");
        wordDiv.classList.add("word");
        const wordText = document.createTextNode(word);
        wordDiv.appendChild(wordText)
        wordList.appendChild(wordDiv);
    }
}

function getWords(wordList) {
    var words = [...wordList.querySelectorAll(".word")]
        .map(div => div.textContent.toUpperCase())
        .sort((x, y) => y.length - x.length);

    return words;
}

function generateWordSearch(settings) {
    const { words, width, height, horizontal, vertical, diagonal, reverse } = settings;
    const table = document.getElementById("letterTable");
    const wordList = document.getElementById("resultsWordList");
    const body = table.tBodies[0];
    const errorMessage = document.getElementById("errorMessage");
    errorMessage.textContent = "";

    // validation
    // must check at least one of the directional checkboxes
    if (!horizontal && !vertical && !diagonal && !reverse) {
        errorMessage.textContent = "Must choose at least one of horizontal, vertical, diagonal, or reverse.";
        return false;
    }

    const maxRetries = 128;
    let success = false;
    for (let i = 0; i < maxRetries; ++i) {
        const grid = createGrid(body, width, height);
        if (placeWords(grid, words, horizontal, vertical, diagonal, reverse)) {
            fillRandomCharacters(grid, words);
            success = true;
            break;
        }
    }

    if (success) {
        removeChildren(wordList);
        for (const word of words) {
            addWord(wordList, word);
        }
    } else {
        errorMessage.textContent = "Failed to place all words. Please increase grid size or remove some words and try again";
    }

    return success;
}

function createGrid(body, width, height) {
    const cells = [];
    body.innerHTML = "";
    for (let i = 0; i < height; ++i) {
        const tr = document.createElement("tr");
        for (let j = 0; j < width; ++j) {
            const td = document.createElement("td");
            const text = document.createTextNode("");
            td.appendChild(text);
            tr.appendChild(td);
            cells.push(td);
        }
        body.appendChild(tr);
    }

    function checkRange(i, j) {
        if (i < 0) {
            throw `i has value ${i}, i must be > 0`
        }

        if (j < 0) {
            throw `j has value ${j}, j must be > 0`
        }

        if (i >= height) {
            throw `i has value ${i}, i must be >= ${height}`
        }

        if (j >= width) {
            throw `j has value ${j}, i must be >= ${width}`
        }
    }

    function at(i, j) {
        checkRange(i, j)
        return cells[i * width + j];
    }

    function get(i, j) {
        const letter = at(i, j).textContent;
        return letter;
    }

    function set(i, j, ch) {
        at(i, j).textContent = ch;
    }

    return {
        get at() { return at; },
        get get() { return get; },
        get set() { return set; },
        get width() { return width; },
        get height() { return height; }
    };
}

function placeWords(grid, words, horizontal, vertical, diagonal, reverse) {
    const dirs = getDirs(horizontal, vertical, diagonal, reverse);
    const success = words.every(word => tryPlaceWord(grid, dirs, word));
    return success;
}

function getDirs(horizontal, vertical, diagonal, reverse) {
    const dirs = [];

    if (horizontal) {
        dirs.push({ x: 1, y: 0 });
    }

    if (vertical) {
        dirs.push({ x: 0, y: 1 });
    }

    if (diagonal) {
        dirs.push({ x: 1, y: 1 });
    }

    if (reverse && horizontal) {
        dirs.push({ x: -1, y: 0 });
    }

    if (reverse && vertical) {
        dirs.push({ x: 0, y: -1 });
    }

    if (reverse && diagonal) {
        dirs.push({ x: -1, y: 1 });
        dirs.push({ x: 1, y: -1 });
        dirs.push({ x: -1, y: -1 });
    }

    return dirs;
}

function tryPlaceWord(grid, dirs, word) {
    const placement = tryFindWordPlacement(grid, dirs, word);
    if (!placement.success) {
        return false;
    }

    placeWord(grid, word, placement);
    return true;
}

function tryFindWordPlacement(grid, dirs, word) {
    if (word.length > grid.width && word.length > grid.height) {
        console.log(`${word} with length ${word.length} is too long to be placed in any direction`);
        return false
    }

    // try placing at every possible cell
    const allCoords = [];
    for (let i = 0; i < grid.height; ++i) {
        for (let j = 0; j < grid.width; ++j) {
            allCoords.push({ x: j, y: i });
        }
    }

    const dir = choose(dirs);
    shuffle(allCoords);

    for (const coords of allCoords) {
        const { x, y } = coords;

        if (isValidWordPlacement(grid, word, x, y, dir)) {
            return {
                success: true,
                x: x,
                y: y,
                dir: dir,
            };
        }
    }

    return {
        success: false,
    };
}

function isValidWordPlacement(grid, word, x0, y0, dir) {
    if (x0 < 0 || y0 < 0) {
        return false
    }

    const extentX = word.length * dir.x;
    if (x0 + extentX > grid.width || x0 + extentX < 0) {
        return false;
    }

    const extentY = word.length * dir.y;
    if (y0 + extentY > grid.height || y0 + extentY < 0) {
        return false;
    }

    const letters = word.split("");
    const success = letters.every((ch, i) => {
        const x = x0 + dir.x * i;
        const y = y0 + dir.y * i;
        if (grid.get(y, x) === ch) {
            return true;
        }

        if (!grid.get(y, x)) {
            return true;
        }
    });

    return success;
}

function placeWord(grid, word, placement) {
    const { x: x0, y: y0, dir } = placement;
    const letters = word.split("");

    letters.forEach((ch, i) => {
        const x = x0 + dir.x * i;
        const y = y0 + dir.y * i;
        grid.set(y, x, ch);
    });
}

function fillRandomCharacters(grid, words) {
    let chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ";

    if (words.some(w => /\d/.test(w))) {
        chars += "0123456789";
    }

    if (words.some(w => /-/.test(w))) {
        chars += "-";
    }

    if (words.some(w => /\./.test(w))) {
        chars += ".";
    }

    if (words.some(w => /\s/.test(w))) {
        chars += " ";
    }

    if (words.some(w => /'/.test(w))) {
        chars += "'";
    }

    for (let i = 0; i < grid.height; ++i) {
        for (let j = 0; j < grid.width; ++j) {
            if (grid.get(i, j)) {
                continue;
            }

            const ch = choose(chars);
            grid.set(i, j, ch);
        }
    }
}

function rrange(min, max) {
    const range = max - min;
    return Math.floor(Math.random(range) * range + min);
}

function choose(list) {
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
}

function shuffle(a) {
    for (let i = a.length - 1; i >= 0; --i) {
        const j = Math.floor(Math.random() * i);
        const tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }

    return a;
};

function removeChildren(node) {
    while (node.firstChild) {
        node.removeChild(node.lastChild);
    }
}