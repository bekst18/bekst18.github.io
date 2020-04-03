"use strict";

init();
function init() {
    const generateButton = document.getElementById("generateButton");
    const saveSettingsButton = document.getElementById("saveSettings");
    const loadSettingsButton = document.getElementById("loadSettings");
    const returnToSettingsButton = document.getElementById("returnToSettings");
    const resetButton = document.getElementById("resetButton");
    const widthInput = document.getElementById("width");
    const heightInput = document.getElementById("height");
    const settingsDiv = document.getElementById("settings");
    const resultsDiv = document.getElementById("results");
    const settingsKey = "mazeSettings";

    loadSettings();

    generateButton.addEventListener("click", evt => {
        const settings = getSettings();
        const success = generateMaze(settings);

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
        widthInput.value = 16;
        heightInput.value = 16;
    });

    returnToSettingsButton.addEventListener("click", evt => {
        settingsDiv.hidden = false;
        resultsDiv.hidden = true;
    });

    function getSettings() {
        const width = parseInt(widthInput.value) || 32;
        const height = parseInt(heightInput.value) || 32;

        return {
            width: width,
            height: height
        };
    }

    function loadSettings() {
        const json = localStorage.getItem(settingsKey);
        if (!json) {
            console.log("No stored settings found");
            return;
        }

        const settings = JSON.parse(json);
        widthInput.value = settings.width;
        heightInput.value = settings.height;
    }
}

function getWords(wordList) {
    var words = [...wordList.querySelectorAll(".word")]
        .map(div => div.textContent.toUpperCase())
        .sort((x, y) => y.length - x.length);

    return words;
}

function generateMaze(settings) {
    const { width, height } = settings;
    const errorMessage = document.getElementById("errorMessage");
    errorMessage.textContent = "";

    const grid = createGrid(width, height);
    const start = chooseStart(grid);
    const goal = chooseGoal(grid);
    randomExplore(grid, start, goal);

    // close off dead-end cells
    for (const cell of grid) {
        if ((cell.northWall ? 1 : 0) + (cell.eastWall ? 1 : 0) + (cell.southWall ? 1 : 0) + (cell.westWall ? 1 : 0) > 2) {
            cell.northWall = true;
            cell.westWall = true;
            cell.southWall = true;
            cell.eastWall = true;
        }
    }

    grid.update();
    return true;
}

function createGrid(width, height) {
    const cells = [];
    const mazeDiv = document.getElementById("maze");
    removeChildren(mazeDiv);

    mazeDiv.style.gridTemplateColumns = range(width).map(() => "auto").join(" ");

    for (let i = 0; i < height; ++i) {
        for (let j = 0; j < width; ++j) {
            const cellDiv = document.createElement("div");
            cellDiv.classList.add("maze-cell");
            mazeDiv.appendChild(cellDiv);
            const cell = {
                elem: cellDiv,
                i: i,
                j: j,
                northWall: true,
                westWall: true,
                southWall: true,
                eastWall: true,
                explored: false,
            };

            cells.push(cell);
        }
    }

    update();

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
        return cells[flat(i, j)];
    }

    function update() {
        for (const cell of cells) {
            const elem = cell.elem;

            // fill in dead-end cells
            if (cell.northWall && cell.eastWall && cell.southWall && cell.westWall) {
                elem.style.backgroundColor = "darkblue";
            } else {
                elem.style.backgroundColor = "";
            }

            elem.style.borderTop = getBorderStyle(cell.northWall);
            elem.style.borderRight = getBorderStyle(cell.eastWall);
            elem.style.borderBottom = getBorderStyle(cell.southWall);
            elem.style.borderLeft = getBorderStyle(cell.westWall);
        }
    }

    function getBorderStyle(wall) {
        if (wall) {
            return ".125em solid darkblue";
        } else {
            return "";
        }
    }

    function flat(i, j) {
        return i * width + j;
    }

    function unexplore() {
        for (const cell of cells) {
            cell.explored = false;
        }
    }

    function* visit() {
        for (let i = 0; i < height; ++i) {
            for (let j = 0; j < width; ++j) {
                yield at(i, j);
            }
        }
    }

    return {
        get at() { return at; },
        get width() { return width; },
        get height() { return height; },
        get flat() { return flat; },
        get update() { return update; },
        get visit() { return visit; },
        [Symbol.iterator]: function* () {
            for (const cell of cells) {
                yield cell;
            }
        }
    };
}

function getDirs() {
    const dirs = [
        { i: 0, j: -1 },
        { i: 0, j: 1 },
        { i: -1, j: 0 },
        { i: 1, j: 0 }
    ];

    return dirs;
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

function range(a, b, step) {
    if (typeof b === "undefined") {
        b = a;
        a = 0;
    }

    if (!step && b < a) {
        step = -1;
    }

    if (!step && b > a) {
        step = 1;
    }

    const ns = [];
    for (let i = a; i != b; i += step) {
        ns.push(i);
    }

    return ns;
}

function times(n, f) {
    range(n).forEach(f);
}

function chooseStart(grid) {
    const i = rrange(0, grid.height - 1);
    const start = grid.at(i, 0);
    start.westWall = false;
    start.elem.classList.add("start-cell");
    return start;
}

function chooseGoal(grid) {
    const i = rrange(0, grid.height - 1);
    const goal = grid.at(i, grid.width - 1);
    goal.eastWall = false;
    goal.elem.classList.add("goal-cell");
    return goal;
}

function randomExplore(grid, start, goal) {
    const dirs = getDirs();

    let i = start.i;
    let j = start.j;
    const stack = [grid.at(i, j)];

    while (stack.length > 0) {
        const cell = stack.pop();
        if (cell === goal) {
            continue;
        }
        
        const { i, j } = cell;

        shuffle(dirs);
        for (const dir of dirs) {
            const ii = i + dir.i;
            const jj = j + dir.j;

            if (ii < 0) {
                continue;
            }

            if (ii >= grid.height) {
                continue;
            }

            if (jj < 0) {
                continue;
            }

            if (jj >= grid.width) {
                continue;
            }

            const nextCell = grid.at(ii, jj);
            if (nextCell.explored) {
                continue;
            }

            nextCell.explored = true;

            if (dir.i === -1) {
                cell.northWall = false;
                nextCell.southWall = false;
            } else if (dir.i === 1) {
                cell.southWall = false;
                nextCell.northWall = false;
            } else if (dir.j === -1) {
                cell.westWall = false;
                nextCell.eastWall = false;
            } else if (dir.j === 1) {
                cell.eastWall = false;
                nextCell.westWall = false;
            }

            stack.push(nextCell);
        }
    }
}