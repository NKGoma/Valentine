// ===== Configuration =====
const DIFFICULTIES = {
    easy:   { rows: 8,  cols: 8,  mines: 10 },
    medium: { rows: 12, cols: 12, mines: 25 },
    hard:   { rows: 16, cols: 16, mines: 50 },
};

let difficulty = 'easy';
let rows, cols, totalMines;
let board = [];
let revealed = 0;
let flagCount = 0;
let gameOver = false;
let firstClick = true;
let timerInterval = null;
let seconds = 0;

// ===== Partner photos (1–10) =====
const TOTAL_PHOTOS = 10;
const photoList = [];
for (let i = 1; i <= TOTAL_PHOTOS; i++) {
    photoList.push(`photos/photo${i}.png`);
}
let lastPhotoIndex = -1;

function getRandomPhoto() {
    // Pick a random photo, avoiding the same one twice in a row
    let idx;
    do {
        idx = Math.floor(Math.random() * photoList.length);
    } while (idx === lastPhotoIndex && photoList.length > 1);
    lastPhotoIndex = idx;
    return photoList[idx];
}

// ===== DOM references =====
const boardEl    = document.getElementById('game-board');
const bombCountEl = document.getElementById('bomb-count');
const timerEl    = document.getElementById('timer');
const resetBtn   = document.getElementById('reset-btn');
const bombOverlay = document.getElementById('bomb-overlay');
const winOverlay  = document.getElementById('win-overlay');
const diffBtns   = document.querySelectorAll('.diff-btn');

// ===== Calculate cell size to fit screen =====
function getCellSize() {
    // Available width = viewport minus container padding (10px each side) minus board padding (6px each side) minus board border (2px each side)
    const availableWidth = window.innerWidth - 20 - 12 - 4;
    // Total gap space = (cols - 1) * 2px gap
    const gapSpace = (cols - 1) * 2;
    const maxByWidth = Math.floor((availableWidth - gapSpace) / cols);

    // Also limit by height: leave room for header/controls/instructions (~220px)
    const availableHeight = window.innerHeight - 240;
    const vGapSpace = (rows - 1) * 2;
    const maxByHeight = Math.floor((availableHeight - vGapSpace) / rows);

    // Clamp between 22px and 40px
    return Math.max(22, Math.min(40, maxByWidth, maxByHeight));
}

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
    timerEl.textContent = '\u23F1 0:00';
    bombCountEl.textContent = '\uD83D\uDC96 ' + totalMines;

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
        if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
        if (board[r][c].mine) continue;
        board[r][c].mine = true;
        placed++;
    }

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
    const cellSize = getCellSize();
    const fontSize = cellSize <= 26 ? '0.65rem' : cellSize <= 32 ? '0.78rem' : '0.9rem';
    const flagSize = cellSize <= 26 ? '0.7rem' : '1rem';

    boardEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.style.width = cellSize + 'px';
            cell.style.height = cellSize + 'px';
            cell.style.fontSize = fontSize;

            // Desktop click
            cell.addEventListener('click', (e) => {
                // Ignore clicks that came from a touch (handled separately)
                if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
                handleClick(r, c);
            });

            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(r, c);
            });

            // Mobile touch handling
            let pressTimer = null;
            let didLongPress = false;
            let touchMoved = false;

            cell.addEventListener('touchstart', (e) => {
                touchMoved = false;
                didLongPress = false;
                pressTimer = setTimeout(() => {
                    didLongPress = true;
                    handleRightClick(r, c);
                }, 400);
            }, { passive: true });

            cell.addEventListener('touchmove', () => {
                touchMoved = true;
                clearTimeout(pressTimer);
            }, { passive: true });

            cell.addEventListener('touchend', (e) => {
                clearTimeout(pressTimer);
                if (touchMoved) return;
                if (didLongPress) {
                    // Already handled as flag — prevent the click
                    e.preventDefault();
                    return;
                }
                // Short tap — treat as reveal
                handleClick(r, c);
            });

            boardEl.appendChild(cell);
        }
    }

    // Store flagSize for use when flagging
    boardEl.dataset.flagSize = flagSize;
}

// ===== Sync DOM to board state (after re-render) =====
function syncBoardState() {
    const flagSize = boardEl.dataset.flagSize || '1rem';
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const data = board[r][c];
            const cellEl = getCellEl(r, c);
            if (!cellEl) continue;

            if (data.revealed) {
                cellEl.classList.add('revealed');
                if (data.mine) {
                    cellEl.classList.add('mine-cell');
                    cellEl.textContent = '\uD83D\uDC96';
                } else if (data.count > 0) {
                    cellEl.textContent = data.count;
                    cellEl.dataset.count = data.count;
                }
            } else if (data.flagged) {
                cellEl.classList.add('flagged');
                cellEl.textContent = '\uD83D\uDEA9';
                cellEl.style.fontSize = flagSize;
            }
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
    const flagSize = boardEl.dataset.flagSize || '1rem';

    if (data.flagged) {
        cellEl.classList.add('flagged');
        cellEl.textContent = '\uD83D\uDEA9';
        cellEl.style.fontSize = flagSize;
        flagCount++;
    } else {
        cellEl.classList.remove('flagged');
        cellEl.textContent = '';
        // Restore number font size
        const cellSize = parseInt(cellEl.style.width);
        cellEl.style.fontSize = cellSize <= 26 ? '0.65rem' : cellSize <= 32 ? '0.78rem' : '0.9rem';
        flagCount--;
    }

    bombCountEl.textContent = '\uD83D\uDC96 ' + (totalMines - flagCount);
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
        cellEl.classList.add('mine-cell');
        cellEl.textContent = '\uD83D\uDC96';
        gameOver = true;
        clearInterval(timerInterval);
        revealAllMines();
        setTimeout(() => {
            showBombOverlay();
        }, 600);
        return;
    }

    if (data.count > 0) {
        cellEl.textContent = data.count;
        cellEl.dataset.count = data.count;
    } else {
        forEachNeighbor(r, c, (nr, nc) => {
            revealCell(nr, nc);
        });
    }

    if (revealed === rows * cols - totalMines) {
        gameOver = true;
        clearInterval(timerInterval);
        setTimeout(() => {
            showWinOverlay();
        }, 300);
    }
}

function revealAllMines() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (board[r][c].mine && !board[r][c].revealed) {
                board[r][c].revealed = true;
                const cellEl = getCellEl(r, c);
                cellEl.classList.add('revealed', 'mine-cell', 'mine-reveal');
                cellEl.textContent = '\uD83D\uDC96';
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
        timerEl.textContent = `\u23F1 ${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

// ===== Bomb overlay with photo loading =====
function showBombOverlay() {
    const photoEl = document.getElementById('partner-photo');
    const fallback = document.getElementById('fallback-heart');
    const src = getRandomPhoto();

    // Try loading the image; show fallback if it fails
    const testImg = new Image();
    testImg.onload = function () {
        photoEl.src = src;
        photoEl.style.display = '';
        fallback.style.display = 'none';
        bombOverlay.classList.remove('hidden');
    };
    testImg.onerror = function () {
        photoEl.style.display = 'none';
        fallback.style.display = '';
        bombOverlay.classList.remove('hidden');
    };
    testImg.src = src;
}

// ===== Win overlay with photo loading =====
function showWinOverlay() {
    const photoEl = document.getElementById('win-photo');
    const fallback = document.getElementById('win-fallback');

    const testImg = new Image();
    testImg.onload = function () {
        photoEl.src = 'photos/win.png';
        photoEl.style.display = '';
        fallback.style.display = 'none';
        winOverlay.classList.remove('hidden');
    };
    testImg.onerror = function () {
        photoEl.style.display = 'none';
        fallback.style.display = '';
        winOverlay.classList.remove('hidden');
    };
    testImg.src = 'photos/win.png';
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

// ===== Resize handler =====
// Only resize cells in-place — don't recreate the board and lose game state
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const cellSize = getCellSize();
        const fontSize = cellSize <= 26 ? '0.65rem' : cellSize <= 32 ? '0.78rem' : '0.9rem';
        const flagSize = cellSize <= 26 ? '0.7rem' : '1rem';
        boardEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
        boardEl.dataset.flagSize = flagSize;

        for (let i = 0; i < boardEl.children.length; i++) {
            const cell = boardEl.children[i];
            cell.style.width = cellSize + 'px';
            cell.style.height = cellSize + 'px';
            // Flagged cells keep their flag size, others get number size
            if (cell.classList.contains('flagged')) {
                cell.style.fontSize = flagSize;
            } else {
                cell.style.fontSize = fontSize;
            }
        }
    }, 200);
});

// ===== Floating hearts background =====
function createFloatingHearts() {
    const container = document.querySelector('.floating-hearts');
    const hearts = ['\uD83D\uDC95', '\uD83D\uDC96', '\uD83D\uDC97', '\uD83D\uDC98', '\u2665', '\u2764'];

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

// ===== Background Music (YouTube) =====
let ytPlayer = null;
let musicPlaying = false;
const musicBtn = document.getElementById('music-btn');

// Called automatically by the YouTube IFrame API once it's ready
window.onYouTubeIframeAPIReady = function () {
    ytPlayer = new YT.Player('yt-player', {
        height: '0',
        width: '0',
        videoId: 'xfCuibCm0-w',
        playerVars: {
            autoplay: 0,
            loop: 1,
            playlist: 'xfCuibCm0-w', // required for loop to work
        },
        events: {
            onStateChange: function (e) {
                // If video ended unexpectedly, restart
                if (e.data === YT.PlayerState.ENDED) {
                    ytPlayer.playVideo();
                }
            }
        }
    });
};

musicBtn.addEventListener('click', () => {
    if (!ytPlayer || typeof ytPlayer.playVideo !== 'function') return;

    if (musicPlaying) {
        ytPlayer.pauseVideo();
        musicBtn.textContent = '\uD83D\uDD07';
        musicBtn.classList.remove('playing');
        musicPlaying = false;
    } else {
        ytPlayer.playVideo();
        musicBtn.textContent = '\uD83C\uDFB5';
        musicBtn.classList.add('playing');
        musicPlaying = true;
    }
});

// ===== Start =====
createFloatingHearts();
initGame();
