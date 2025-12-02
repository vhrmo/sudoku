/**
 * Sudoku Game Implementation
 * Generates puzzles with three difficulty levels and supports possible numbers feature
 */

// Constants
const STORAGE_KEY = 'sudoku_game_state';
const DIFFICULTY_LEVELS = {
    low: { cellsToRemove: 30, name: 'Low' },
    medium: { cellsToRemove: 45, name: 'Medium' },
    high: { cellsToRemove: 55, name: 'High' }
};

// Game State
let gameState = {
    puzzle: [],
    solution: [],
    userValues: [],
    possibleNumbers: [],
    selectedCell: null,
    difficulty: 'low',
    startTime: null,
    elapsedTime: 0,
    isCompleted: false,
    showErrors: false
};

let timerInterval = null;
let lastKeyPress = { key: null, time: 0 };

// DOM Elements
let boardElement;
let difficultySelect;
let timerElement;
let statusElement;
let contextMenu;

/**
 * Initialize the game when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    boardElement = document.getElementById('sudoku-board');
    difficultySelect = document.getElementById('difficulty');
    timerElement = document.getElementById('timer');
    statusElement = document.getElementById('status');
    contextMenu = document.getElementById('context-menu');

    // Set up event listeners
    document.getElementById('new-game').addEventListener('click', startNewGame);
    document.getElementById('reset-game').addEventListener('click', resetGame);
    document.getElementById('clear-notes').addEventListener('click', clearAllNotes);
    document.getElementById('validate').addEventListener('click', validateBoard);
    difficultySelect.addEventListener('change', (e) => {
        gameState.difficulty = e.target.value;
    });

    // Context menu event listeners
    document.getElementById('auto-fill-cell').addEventListener('click', () => {
        if (gameState.selectedCell !== null) {
            autoFillPossibleNumbers(gameState.selectedCell);
            hideContextMenu();
        }
    });
    document.getElementById('clear-cell').addEventListener('click', () => {
        if (gameState.selectedCell !== null) {
            clearCell(gameState.selectedCell);
            hideContextMenu();
        }
    });

    // Global event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });

    // Load saved game or start new one
    if (!loadGameState()) {
        startNewGame();
    }
});

/**
 * Generate a complete valid Sudoku solution
 * @returns {number[][]} 9x9 grid with valid Sudoku solution
 */
function generateSolution() {
    const grid = Array(9).fill(null).map(() => Array(9).fill(0));
    fillGrid(grid);
    return grid;
}

/**
 * Fill the grid using backtracking algorithm
 * @param {number[][]} grid - The grid to fill
 * @returns {boolean} Whether the grid was successfully filled
 */
function fillGrid(grid) {
    const emptyCell = findEmptyCell(grid);
    if (!emptyCell) return true;

    const [row, col] = emptyCell;
    const numbers = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    for (const num of numbers) {
        if (isValidPlacement(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGrid(grid)) return true;
            grid[row][col] = 0;
        }
    }
    return false;
}

/**
 * Find an empty cell in the grid
 * @param {number[][]} grid - The grid to search
 * @returns {number[]|null} [row, col] of empty cell or null if none found
 */
function findEmptyCell(grid) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col] === 0) return [row, col];
        }
    }
    return null;
}

/**
 * Check if placing a number at given position is valid
 * @param {number[][]} grid - The grid to check
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} num - Number to place
 * @returns {boolean} Whether the placement is valid
 */
function isValidPlacement(grid, row, col, num) {
    // Check row
    for (let c = 0; c < 9; c++) {
        if (grid[row][c] === num) return false;
    }

    // Check column
    for (let r = 0; r < 9; r++) {
        if (grid[r][col] === num) return false;
    }

    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            if (grid[r][c] === num) return false;
        }
    }

    return true;
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Generate a Sudoku puzzle by removing cells from the solution
 * @param {number[][]} solution - Complete solution grid
 * @param {string} difficulty - Difficulty level
 * @returns {number[][]} Puzzle grid with some cells set to 0
 */
function generatePuzzle(solution, difficulty) {
    const puzzle = solution.map(row => [...row]);
    const cellsToRemove = DIFFICULTY_LEVELS[difficulty].cellsToRemove;
    
    // Create array of all cell positions and shuffle
    let positions = [];
    for (let i = 0; i < 81; i++) {
        positions.push(i);
    }
    positions = shuffleArray(positions);

    // Remove cells
    let removed = 0;
    for (const pos of positions) {
        if (removed >= cellsToRemove) break;
        const row = Math.floor(pos / 9);
        const col = pos % 9;
        puzzle[row][col] = 0;
        removed++;
    }

    return puzzle;
}

/**
 * Start a new game with the selected difficulty
 */
function startNewGame() {
    const difficulty = difficultySelect.value;
    
    gameState.solution = generateSolution();
    gameState.puzzle = generatePuzzle(gameState.solution, difficulty);
    gameState.userValues = gameState.puzzle.map(row => [...row]);
    gameState.possibleNumbers = Array(81).fill(null).map(() => new Set());
    gameState.selectedCell = null;
    gameState.difficulty = difficulty;
    gameState.startTime = Date.now();
    gameState.elapsedTime = 0;
    gameState.isCompleted = false;
    gameState.showErrors = false;

    statusElement.textContent = '';
    
    renderBoard();
    startTimer();
    saveGameState();
}

/**
 * Reset the current game to initial state
 */
function resetGame() {
    gameState.userValues = gameState.puzzle.map(row => [...row]);
    gameState.possibleNumbers = Array(81).fill(null).map(() => new Set());
    gameState.selectedCell = null;
    gameState.startTime = Date.now();
    gameState.elapsedTime = 0;
    gameState.isCompleted = false;
    gameState.showErrors = false;

    statusElement.textContent = '';
    
    renderBoard();
    startTimer();
    saveGameState();
}

/**
 * Clear all notes (possible numbers) from all cells
 */
function clearAllNotes() {
    gameState.possibleNumbers = Array(81).fill(null).map(() => new Set());
    renderBoard();
    saveGameState();
}

/**
 * Render the Sudoku board
 */
function renderBoard() {
    boardElement.innerHTML = '';

    for (let i = 0; i < 81; i++) {
        const row = Math.floor(i / 9);
        const col = i % 9;
        const cell = createCellElement(i, row, col);
        boardElement.appendChild(cell);
    }
}

/**
 * Create a cell element
 * @param {number} index - Cell index (0-80)
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {HTMLElement} Cell element
 */
function createCellElement(index, row, col) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = index;

    const puzzleValue = gameState.puzzle[row][col];
    const userValue = gameState.userValues[row][col];
    const possibleNums = gameState.possibleNumbers[index];

    if (puzzleValue !== 0) {
        // Initial (given) cell
        cell.classList.add('initial');
        cell.innerHTML = `<span class="main-value">${puzzleValue}</span>`;
    } else if (userValue !== 0) {
        // User-filled cell
        cell.classList.add('user-value');
        cell.innerHTML = `<span class="main-value">${userValue}</span>`;
        
        // Check if the value is correct (only show errors when showErrors is true)
        if (gameState.showErrors && userValue !== gameState.solution[row][col]) {
            cell.classList.add('error');
        }
    } else if (possibleNums.size > 0) {
        // Cell with possible numbers
        cell.innerHTML = createPossibleNumbersHTML(possibleNums);
    }

    if (index === gameState.selectedCell) {
        cell.classList.add('selected');
    }

    if (gameState.isCompleted) {
        cell.classList.add('completed');
    }

    // Event listeners
    cell.addEventListener('click', (e) => handleCellClick(index, e));
    cell.addEventListener('dblclick', () => handleCellDoubleClick(index));
    cell.addEventListener('contextmenu', (e) => handleCellContextMenu(index, e));

    return cell;
}

/**
 * Create HTML for possible numbers display
 * @param {Set} possibleNums - Set of possible numbers
 * @returns {string} HTML string
 */
function createPossibleNumbersHTML(possibleNums) {
    let html = '<div class="possible-numbers">';
    for (let n = 1; n <= 9; n++) {
        html += `<span>${possibleNums.has(n) ? n : ''}</span>`;
    }
    html += '</div>';
    return html;
}

/**
 * Handle cell click
 * @param {number} index - Cell index
 * @param {MouseEvent} e - Click event
 */
function handleCellClick(index, e) {
    hideContextMenu();
    
    const row = Math.floor(index / 9);
    const col = index % 9;
    
    // Don't allow selection of initial cells for editing
    gameState.selectedCell = index;
    renderBoard();
    saveGameState();
}

/**
 * Handle cell double click - auto-fill possible numbers or insert final number
 * If this is the last empty cell in its row, column, or 3x3 square, insert the final number.
 * Otherwise, auto-fill possible numbers.
 * @param {number} index - Cell index
 */
function handleCellDoubleClick(index) {
    const row = Math.floor(index / 9);
    const col = index % 9;

    // Don't process initial cells or cells with values
    if (gameState.puzzle[row][col] !== 0 || gameState.userValues[row][col] !== 0) {
        return;
    }

    // Check if this is the last empty cell in row, column, or square
    const isLastInRow = countEmptyCellsInRow(row) === 1;
    const isLastInCol = countEmptyCellsInColumn(col) === 1;
    const isLastInSquare = countEmptyCellsInSquare(row, col) === 1;

    if (isLastInRow || isLastInCol || isLastInSquare) {
        // Find the only valid number for this cell
        const finalNumber = findFinalNumber(row, col);
        if (finalNumber !== null) {
            setFinalValue(index, finalNumber);
            saveGameState();
            return;
        }
    }

    // Default behavior: auto-fill possible numbers
    autoFillPossibleNumbers(index);
}

/**
 * Count empty cells in a row
 * @param {number} row - Row index
 * @returns {number} Number of empty cells in the row
 */
function countEmptyCellsInRow(row) {
    let count = 0;
    for (let col = 0; col < 9; col++) {
        if (gameState.userValues[row][col] === 0) {
            count++;
        }
    }
    return count;
}

/**
 * Count empty cells in a column
 * @param {number} col - Column index
 * @returns {number} Number of empty cells in the column
 */
function countEmptyCellsInColumn(col) {
    let count = 0;
    for (let row = 0; row < 9; row++) {
        if (gameState.userValues[row][col] === 0) {
            count++;
        }
    }
    return count;
}

/**
 * Count empty cells in a 3x3 square
 * @param {number} row - Row index of a cell in the square
 * @param {number} col - Column index of a cell in the square
 * @returns {number} Number of empty cells in the square
 */
function countEmptyCellsInSquare(row, col) {
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    let count = 0;
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            if (gameState.userValues[r][c] === 0) {
                count++;
            }
        }
    }
    return count;
}

/**
 * Find the only valid number for a cell (used when it's the last empty cell in a group)
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {number|null} The final number if found, null otherwise
 */
function findFinalNumber(row, col) {
    const possible = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    // Remove numbers in the same row
    for (let c = 0; c < 9; c++) {
        possible.delete(gameState.userValues[row][c]);
    }

    // Remove numbers in the same column
    for (let r = 0; r < 9; r++) {
        possible.delete(gameState.userValues[r][col]);
    }

    // Remove numbers in the same 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            possible.delete(gameState.userValues[r][c]);
        }
    }

    // If exactly one number is possible, return it
    if (possible.size === 1) {
        return Array.from(possible)[0];
    }

    return null;
}

/**
 * Handle cell context menu
 * @param {number} index - Cell index
 * @param {MouseEvent} e - Context menu event
 */
function handleCellContextMenu(index, e) {
    e.preventDefault();
    gameState.selectedCell = index;
    renderBoard();
    showContextMenu(e.clientX, e.clientY);
}

/**
 * Handle keyboard input
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyDown(e) {
    if (gameState.selectedCell === null || gameState.isCompleted) return;

    const index = gameState.selectedCell;
    const row = Math.floor(index / 9);
    const col = index % 9;
    const key = e.key;
    const isInitialCell = gameState.puzzle[row][col] !== 0;

    // Handle arrow key navigation (works on all cells including pre-filled ones)
    let newSelectedCell = null;
    if (key === 'ArrowUp' && row > 0) {
        newSelectedCell = index - 9;
    } else if (key === 'ArrowDown' && row < 8) {
        newSelectedCell = index + 9;
    } else if (key === 'ArrowLeft' && col > 0) {
        newSelectedCell = index - 1;
    } else if (key === 'ArrowRight' && col < 8) {
        newSelectedCell = index + 1;
    }

    if (newSelectedCell !== null) {
        gameState.selectedCell = newSelectedCell;
        renderBoard();
        saveGameState();
        return;
    }

    // Don't allow editing initial cells
    if (isInitialCell) return;

    if (key >= '1' && key <= '9') {
        const num = parseInt(key);
        const now = Date.now();
        
        // Check for double-press (same key within 300ms) or shift key
        if (e.shiftKey || (lastKeyPress.key === key && now - lastKeyPress.time < 300)) {
            // Enter as final value
            setFinalValue(index, num);
        } else {
            // Toggle as possible number
            togglePossibleNumber(index, num);
        }
        
        lastKeyPress = { key, time: now };
    } else if (key === 'Delete' || key === 'Backspace') {
        clearCell(index);
    }

    saveGameState();
}

/**
 * Toggle a possible number for a cell
 * @param {number} index - Cell index
 * @param {number} num - Number to toggle
 */
function togglePossibleNumber(index, num) {
    const row = Math.floor(index / 9);
    const col = index % 9;

    // Clear the final value if there is one
    if (gameState.userValues[row][col] !== 0) {
        gameState.userValues[row][col] = 0;
    }

    if (gameState.possibleNumbers[index].has(num)) {
        gameState.possibleNumbers[index].delete(num);
    } else {
        gameState.possibleNumbers[index].add(num);
    }

    renderBoard();
}

/**
 * Set a final value for a cell
 * @param {number} index - Cell index
 * @param {number} num - Number to set
 */
function setFinalValue(index, num) {
    const row = Math.floor(index / 9);
    const col = index % 9;

    gameState.userValues[row][col] = num;
    gameState.possibleNumbers[index].clear();

    renderBoard();
    checkCompletion();
}

/**
 * Clear a cell's value and possible numbers
 * @param {number} index - Cell index
 */
function clearCell(index) {
    const row = Math.floor(index / 9);
    const col = index % 9;

    if (gameState.puzzle[row][col] === 0) {
        gameState.userValues[row][col] = 0;
        gameState.possibleNumbers[index].clear();
        renderBoard();
        saveGameState();
    }
}

/**
 * Auto-fill possible numbers for a cell
 * @param {number} index - Cell index
 */
function autoFillPossibleNumbers(index) {
    const row = Math.floor(index / 9);
    const col = index % 9;

    // Don't auto-fill initial cells or cells with values
    if (gameState.puzzle[row][col] !== 0 || gameState.userValues[row][col] !== 0) {
        return;
    }

    const possible = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    // Remove numbers in the same row
    for (let c = 0; c < 9; c++) {
        possible.delete(gameState.userValues[row][c]);
    }

    // Remove numbers in the same column
    for (let r = 0; r < 9; r++) {
        possible.delete(gameState.userValues[r][col]);
    }

    // Remove numbers in the same 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            possible.delete(gameState.userValues[r][c]);
        }
    }

    gameState.possibleNumbers[index] = possible;
    renderBoard();
    saveGameState();
}

/**
 * Check the board state
 * @returns {object} Object with allFilled, allCorrect, and hasErrors properties
 */
function checkBoardState() {
    let allFilled = true;
    let allCorrect = true;
    let hasErrors = false;
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const userValue = gameState.userValues[row][col];
            if (userValue === 0) {
                allFilled = false;
            }
            if (userValue !== gameState.solution[row][col]) {
                allCorrect = false;
                if (userValue !== 0) {
                    hasErrors = true;
                }
            }
        }
    }
    
    return { allFilled, allCorrect, hasErrors };
}

/**
 * Check if the puzzle is completed correctly
 */
function checkCompletion() {
    const { allFilled, allCorrect } = checkBoardState();

    // If all cells are filled, trigger validation
    if (allFilled) {
        gameState.showErrors = true;
        
        if (allCorrect) {
            // Puzzle completed correctly!
            gameState.isCompleted = true;
            stopTimer();
            statusElement.textContent = '🎉 Completed!';
        } else {
            statusElement.textContent = '❌ Some numbers are incorrect';
        }
        
        renderBoard();
        saveGameState();
    }
}

/**
 * Validate the board and show errors
 */
function validateBoard() {
    gameState.showErrors = true;
    
    const { hasErrors } = checkBoardState();
    
    if (hasErrors) {
        statusElement.textContent = '❌ Some numbers are incorrect';
    } else {
        statusElement.textContent = '✓ All entered numbers are correct';
    }
    
    renderBoard();
    saveGameState();
}

/**
 * Show the context menu at given position
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function showContextMenu(x, y) {
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.classList.add('visible');
}

/**
 * Hide the context menu
 */
function hideContextMenu() {
    contextMenu.classList.remove('visible');
}

/**
 * Start the game timer
 */
function startTimer() {
    stopTimer();
    gameState.startTime = Date.now() - gameState.elapsedTime;
    
    timerInterval = setInterval(() => {
        if (!gameState.isCompleted) {
            gameState.elapsedTime = Date.now() - gameState.startTime;
            updateTimerDisplay();
        }
    }, 1000);
}

/**
 * Stop the game timer
 */
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/**
 * Update the timer display
 */
function updateTimerDisplay() {
    const totalSeconds = Math.floor(gameState.elapsedTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    timerElement.textContent = `Time: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Save game state to localStorage
 */
function saveGameState() {
    const stateToSave = {
        puzzle: gameState.puzzle,
        solution: gameState.solution,
        userValues: gameState.userValues,
        possibleNumbers: gameState.possibleNumbers.map(set => Array.from(set)),
        selectedCell: gameState.selectedCell,
        difficulty: gameState.difficulty,
        elapsedTime: gameState.elapsedTime,
        isCompleted: gameState.isCompleted,
        showErrors: gameState.showErrors
    };

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
        console.error('Failed to save game state:', e);
    }
}

/**
 * Load game state from localStorage
 * @returns {boolean} Whether a saved state was found and loaded
 */
function loadGameState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return false;

        const parsed = JSON.parse(saved);
        
        gameState.puzzle = parsed.puzzle;
        gameState.solution = parsed.solution;
        gameState.userValues = parsed.userValues;
        gameState.possibleNumbers = parsed.possibleNumbers.map(arr => new Set(arr));
        gameState.selectedCell = parsed.selectedCell;
        gameState.difficulty = parsed.difficulty;
        gameState.elapsedTime = parsed.elapsedTime || 0;
        gameState.isCompleted = parsed.isCompleted || false;
        gameState.showErrors = parsed.showErrors || false;

        difficultySelect.value = gameState.difficulty;
        
        if (gameState.isCompleted) {
            statusElement.textContent = '🎉 Completed!';
        }
        
        renderBoard();
        updateTimerDisplay();
        
        if (!gameState.isCompleted) {
            startTimer();
        }

        return true;
    } catch (e) {
        console.error('Failed to load game state:', e);
        return false;
    }
}

/**
 * Export puzzle as JSON (for debugging/testing)
 * @returns {object} Puzzle data in JSON format
 */
function exportPuzzleAsJSON() {
    return {
        puzzle: gameState.puzzle,
        solution: gameState.solution,
        difficulty: gameState.difficulty,
        timestamp: new Date().toISOString()
    };
}


