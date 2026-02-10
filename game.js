// ===== Configuration =====
const DIFFICULTIES = {
    easy:   { rows: 8,  cols: 8,  mines: 10 },
    medium: { rows: 12, cols: 12, mines: 25 },
    hard:   { rows: 16, cols: 16, mines: 50 },
};

let difficulty = 'easy';
let rows, cols, totalMines;
let board = [];       // 2D array of cell data
let revealed = 0;
let flagCount = 0;
let gameOver = false;
let firstClick = true;
let timerInterval = null;
let seconds = 0;

// ===== DOM references =====
const boardEl    = document.getElementById('game-board');
const bombCountEl = document.getElementById('bomb-count');
const timerEl    = document.getElementById('timer');
const resetBtn   = document.getElementById('reset-btn');
const bombOverlay = document.getElementById('bomb-overlay');
const winOverlay  = document.getElementById('win-overlay');
const diffBtns   = document.querySelectorAll('.diff-btn');

// ===== Init =====
function initGame() {
    const config = DIFFICULTIES[difficulty];
    rows = config.rows;
    cols = config.cols;
    totalMines = config.mines;

    board = [];
    revealed = 0;
    flagCount = 0;
    gameOver = false;
    firstClick = true;
    seconds = 0;
    clearInterval(timerInterval);
    timerInterval = null;
    timerEl.textContent = '⏱ 0:00';
    bombCountEl.textContent = '💖 ' + totalMines;

    // Create board data
    for (let r = 0; r < rows; r++) {
        board[r] = [];
        for (let c = 0; c < cols; c++) {
            board[r][c] = {
                mine: false,
                revealed: false,
                flagged: false,
                count: 0,
            };
        }
    }

    renderBoard();
}

// ===== Place mines (after first click) =====
function placeMines(safeR, safeC) {
    let placed = 0;
    while (placed < totalMines) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);

        // Don't place on the first-clicked cell or its neighbors
        if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
        if (board[r][c].mine) continue;

        board[r][c].mine = true;
        placed++;
    }

    // Calculate neighbor counts
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (board[r][c].mine) continue;
            let count = 0;
            forEachNeighbor(r, c, (nr, nc) => {
                if (board[nr][nc].mine) count++;
            });
            board[r][c].count = count;
        }
    }
}

// ===== Render =====
function renderBoard() {
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${cols}, 36px)`;

    // Adjust cell size for larger boards
    const cellSize = cols > 12 ? 28 : 36;
    boardEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;

            if (cellSize < 36) {
                cell.style.width = cellSize + 'px';
                cell.style.height = cellSize + 'px';
                cell.style.fontSize = '0.75rem';
            }

            cell.addEventListener('click', () => handleClick(r, c));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(r, c);
            });

            // Long-press for mobile
            let pressTimer;
            cell.addEventListener('touchstart', (e) => {
                pressTimer = setTimeout(() => {
                    e.preventDefault();
                    handleRightClick(r, c);
                }, 400);
            }, { passive: false });
            cell.addEventListener('touchend', () => clearTimeout(pressTimer));
            cell.addEventListener('touchmove', () => clearTimeout(pressTimer));

            boardEl.appendChild(cell);
        }
    }
}

// ===== Get cell DOM element =====
function getCellEl(r, c) {
    return boardEl.children[r * cols + c];
}

// ===== Neighbors helper =====
function forEachNeighbor(r, c, fn) {
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                fn(nr, nc);
            }
        }
    }
}

// ===== Click handlers =====
function handleClick(r, c) {
    if (gameOver) return;
    const data = board[r][c];
    if (data.revealed || data.flagged) return;

    // First click: place mines and start timer
    if (firstClick) {
        firstClick = false;
        placeMines(r, c);
        startTimer();
    }

    revealCell(r, c);
}

function handleRightClick(r, c) {
    if (gameOver) return;
    const data = board[r][c];
    if (data.revealed) return;

    data.flagged = !data.flagged;
    const cellEl = getCellEl(r, c);

    if (data.flagged) {
        cellEl.classList.add('flagged');
        flagCount++;
    } else {
        cellEl.classList.remove('flagged');
        flagCount--;
    }

    bombCountEl.textContent = '💖 ' + (totalMines - flagCount);
}

// ===== Reveal logic =====
function revealCell(r, c) {
    const data = board[r][c];
    if (data.revealed || data.flagged) return;

    data.revealed = true;
    revealed++;
    const cellEl = getCellEl(r, c);
    cellEl.classList.add('revealed');

    if (data.mine) {
        // BOOM — show all mines, then overlay
        cellEl.classList.add('mine-cell');
        cellEl.textContent = '💖';
        gameOver = true;
        clearInterval(timerInterval);
        revealAllMines();
        setTimeout(() => {
            bombOverlay.classList.remove('hidden');
        }, 600);
        return;
    }

    if (data.count > 0) {
        cellEl.textContent = data.count;
        cellEl.dataset.count = data.count;
    } else {
        // Flood-fill empty cells
        forEachNeighbor(r, c, (nr, nc) => {
            revealCell(nr, nc);
        });
    }

    // Check win condition
    if (revealed === rows * cols - totalMines) {
        gameOver = true;
        clearInterval(timerInterval);
        setTimeout(() => {
            winOverlay.classList.remove('hidden');
        }, 300);
    }
}

function revealAllMines() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (board[r][c].mine && !board[r][c].revealed) {
                const cellEl = getCellEl(r, c);
                cellEl.classList.add('revealed', 'mine-cell', 'mine-reveal');
                cellEl.textContent = '💖';
                cellEl.classList.remove('flagged');
            }
        }
    }
}

// ===== Timer =====
function startTimer() {
    timerInterval = setInterval(() => {
        seconds++;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        timerEl.textContent = `⏱ ${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

// ===== Overlays =====
function closeOverlay() {
    bombOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
}

// ===== Reset =====
function resetGame() {
    closeOverlay();
    initGame();
}

// ===== Difficulty buttons =====
diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.difficulty;
        resetGame();
    });
});

resetBtn.addEventListener('click', resetGame);

// ===== Floating hearts background =====
function createFloatingHearts() {
    const container = document.querySelector('.floating-hearts');
    const hearts = ['💕', '💖', '💗', '💘', '♥', '❤'];

    for (let i = 0; i < 15; i++) {
        const heart = document.createElement('span');
        heart.className = 'floating-heart';
        heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
        heart.style.left = Math.random() * 100 + '%';
        heart.style.animationDuration = (8 + Math.random() * 12) + 's';
        heart.style.animationDelay = Math.random() * 10 + 's';
        heart.style.fontSize = (0.8 + Math.random() * 1.2) + 'rem';
        container.appendChild(heart);
    }
}

// ===== Start =====
createFloatingHearts();
initGame();
