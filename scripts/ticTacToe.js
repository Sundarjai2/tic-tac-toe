document.addEventListener("DOMContentLoaded", () => {
  const modeSelectScreen = document.getElementById("mode-select-screen"); // Screen for choosing game mode
  const gameScreen = document.getElementById("game-screen"); // Main game screen

  const btnHuman = document.getElementById("btn-human"); // 2 Players button
  const btnComputer = document.getElementById("btn-computer"); // Vs Computer button
  const difficultySelect = document.getElementById("difficulty-select"); // Difficulty selection container
  const btnEasy = document.getElementById("btn-easy"); // Easy difficulty button
  const btnMedium = document.getElementById("btn-medium"); // Medium difficulty button
  const btnHard = document.getElementById("btn-hard"); // Hard difficulty button

  const board = [...document.querySelectorAll(".board__cell")]; // Array of board cells (buttons)
  const statusDisplay = document.getElementById("game-status"); // Area for status messages (live region)
  const gameTitle = document.getElementById("game-title"); // Game title for focus management

  const btnReset = document.getElementById("btn-reset"); // Reset game button
  const btnBack = document.getElementById("btn-back"); // Back button to mode select screen
  const btnUndo = document.getElementById("btn-undo"); // Undo last move button

  // ===== Game State =====
  let boardState = Array(9).fill(""); // Tracks board: "", "X", or "O"
  let currentPlayer = "X"; // Current player: "X" or "O"
  let isGameActive = false; // Is the game currently active
  let vsComputer = false; // Are we playing against computer
  let difficulty = "easy"; // Computer difficulty ("easy", "medium", "hard")
  let winnerCombo = []; // Indices of winning cells if any
  let movesHistory = []; // Stack for moves to enable undo

  // ===== Winning Combinations =====
  const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Columns
    [0, 4, 8],
    [2, 4, 6], // Diagonals
  ];

  // ===== Accessibility Helpers =====

  /**
   * Updates aria-pressed attributes for button groups
   * @param {HTMLElement[]} buttonGroup - group of buttons
   * @param {HTMLElement} pressedButton - button to set pressed=true
   */
  function setAriaPressed(buttonGroup, pressedButton) {
    buttonGroup.forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        btn === pressedButton ? "true" : "false"
      );
    });
  }

  /**
   * Sets keyboard focus to the first button inside a container
   * @param {HTMLElement} element - container element
   */
  function focusFirstButtonIn(element) {
    const firstBtn = element.querySelector("button");
    if (firstBtn) firstBtn.focus();
  }

  // ===== Screen Control Functions =====

  /**
   * Show the mode selection screen and reset game state
   */
  function showModeSelect() {
    modeSelectScreen.style.display = "block";
    gameScreen.style.display = "none";
    difficultySelect.style.display = "none";
    isGameActive = false;
    movesHistory = [];
    focusFirstButtonIn(modeSelectScreen);
  }

  /**
   * Show the difficulty selection options for playing vs computer
   */
  function showDifficultySelect() {
    difficultySelect.style.display = "block";
    focusFirstButtonIn(difficultySelect);
  }

  /**
   * Initialize and show the game board screen for playing
   */
  function showGameScreen() {
    modeSelectScreen.style.display = "none";
    gameScreen.style.display = "block";
    isGameActive = true;
    currentPlayer = "X";
    boardState.fill("");
    winnerCombo = [];
    movesHistory = [];

    // Reset UI cells and accessibility states
    board.forEach((cell) => {
      cell.textContent = "";
      cell.disabled = false;
      cell.classList.remove("board__cell--win");
      cell.setAttribute("aria-disabled", "false");
    });
    updateStatus(`Player ${currentPlayer}'s turn`);
    updateUndoButton();
    gameTitle.focus();
  }

  // ===== Game Status & Result Handling =====

  /**
   * Update the status message area for users and screen readers
   * @param {string} message - status message to show
   */
  function updateStatus(message) {
    statusDisplay.textContent = message;
  }

  /**
   * Checks current board state for winner or draw
   * @returns {'X'|'O'|'draw'|null} - winner or draw or null if game ongoing
   */
  function checkResult() {
    for (const condition of winningConditions) {
      const [a, b, c] = condition;
      if (
        boardState[a] &&
        boardState[a] === boardState[b] &&
        boardState[a] === boardState[c]
      ) {
        winnerCombo = condition;
        return boardState[a]; // "X" or "O"
      }
    }
    if (boardState.every((cell) => cell !== "")) {
      return "draw";
    }
    return null; // No winner or draw yet
  }

  /**
   * Highlights winning cells with animation or color
   * Respects user prefers-reduced-motion settings
   */
  function highlightWinner() {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    winnerCombo.forEach((index) => {
      if (prefersReducedMotion) {
        board[index].style.backgroundColor = "#d4edda";
        board[index].style.color = "#155724";
      } else {
        board[index].classList.add("board__cell--win");
      }
      board[index].setAttribute("aria-disabled", "true");
    });
  }

  /**
   * Disable the board to prevent further moves
   */
  function disableBoard() {
    board.forEach((cell) => {
      cell.disabled = true;
      cell.setAttribute("aria-disabled", "true");
    });
  }

  // ===== Core Gameplay Functions =====

  /**
   * Handles placing a move at given index
   * @param {number} index - board cell index 0-8
   * @returns {boolean} - whether move was successful
   */
  function makeMove(index) {
    if (!isGameActive || boardState[index] !== "") return false;

    boardState[index] = currentPlayer;
    board[index].textContent = currentPlayer;
    board[index].disabled = true;
    board[index].setAttribute("aria-disabled", "true");

    // Announce move location for screen readers
    const row = Math.floor(index / 3) + 1;
    const col = (index % 3) + 1;
    updateStatus(`Player ${currentPlayer} placed at row ${row}, column ${col}`);

    // Record move for undo
    movesHistory.push({ player: currentPlayer, index });

    // Check for win or draw
    const result = checkResult();
    if (result) {
      if (result === "draw") {
        updateStatus("It's a draw!");
      } else {
        updateStatus(`Player ${result} wins! Congratulations!`);
        highlightWinner();
      }
      disableBoard();
      isGameActive = false;
      updateUndoButton();
      return true;
    }

    // Switch turns
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    updateStatus(`Player ${currentPlayer}'s turn`);
    updateUndoButton();
    return true;
  }

  /**
   * Undo the last move (for Back button)
   */
  function undoLastMove() {
    if (!movesHistory.length || !isGameActive) return;

    const lastMove = movesHistory.pop();
    boardState[lastMove.index] = "";
    board[lastMove.index].textContent = "";
    board[lastMove.index].disabled = false;
    board[lastMove.index].setAttribute("aria-disabled", "false");

    // Switch player back to the one who made the undone move
    currentPlayer = lastMove.player;
    updateStatus(`Undo last move. Player ${currentPlayer}'s turn.`);
    updateUndoButton();
  }

  // ===== AI / Computer Player Logic =====

  /**
   * Executes computer's move based on selected difficulty
   */
  function computerMove() {
    if (!isGameActive) return;

    let moveIndex;

    switch (difficulty) {
      case "easy":
        moveIndex = getRandomMove();
        break;
      case "medium":
        moveIndex = getMediumMove();
        break;
      case "hard":
        moveIndex = getBestMove();
        break;
      default:
        moveIndex = getRandomMove();
    }

    if (moveIndex !== null) {
      makeMove(moveIndex);
    }
  }

  /**
   * Easy AI: random empty cell
   * @returns {number|null} index of empty cell or null
   */
  function getRandomMove() {
    const emptyIndices = boardState
      .map((v, i) => (v === "" ? i : null))
      .filter((i) => i !== null);
    if (emptyIndices.length === 0) return null;
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }

  /**
   * Medium AI: tries to win, blocks opponent, else random
   * @returns {number|null} index of chosen move
   */
  function getMediumMove() {
    // Try to win
    let move = findWinningMove(currentPlayer);
    if (move !== null) return move;

    // Block opponent
    const opponent = currentPlayer === "X" ? "O" : "X";
    move = findWinningMove(opponent);
    if (move !== null) return move;

    // Else random
    return getRandomMove();
  }

  /**
   * Finds a winning move for the given player, or null if none
   * @param {'X'|'O'} player
   * @returns {number|null}
   */
  function findWinningMove(player) {
    for (const condition of winningConditions) {
      const [a, b, c] = condition;
      const values = [boardState[a], boardState[b], boardState[c]];
      if (
        values.filter((v) => v === player).length === 2 &&
        values.includes("")
      ) {
        const emptyIndex = condition[values.indexOf("")];
        return emptyIndex;
      }
    }
    return null;
  }

  /**
   * Hard AI: Minimax algorithm to choose optimal move
   * @returns {number|null} best move index or null
   */
  function getBestMove() {
    const player = currentPlayer;

    function minimax(newBoard, playerTurn) {
      const availSpots = newBoard
        .map((v, i) => (v === "" ? i : null))
        .filter((i) => i !== null);

      const winner = checkWinnerForMinimax(newBoard);
      if (winner === "X") return { score: player === "X" ? 10 : -10 };
      if (winner === "O") return { score: player === "O" ? 10 : -10 };
      if (availSpots.length === 0) return { score: 0 };

      const moves = [];

      for (const i of availSpots) {
        const move = { index: i };
        newBoard[i] = playerTurn;

        const result = minimax(newBoard, playerTurn === "X" ? "O" : "X");
        move.score = result.score;

        newBoard[i] = "";
        moves.push(move);
      }

      let bestMove;
      if (playerTurn === player) {
        // Maximize score for current player
        let bestScore = -Infinity;
        for (const m of moves) {
          if (m.score > bestScore) {
            bestScore = m.score;
            bestMove = m;
          }
        }
      } else {
        // Minimize score for opponent
        let bestScore = Infinity;
        for (const m of moves) {
          if (m.score < bestScore) {
            bestScore = m.score;
            bestMove = m;
          }
        }
      }
      return bestMove;
    }

    /**
     * Helper to check winner in minimax simulated board
     */
    function checkWinnerForMinimax(boardArr) {
      for (const condition of winningConditions) {
        const [a, b, c] = condition;
        if (
          boardArr[a] &&
          boardArr[a] === boardArr[b] &&
          boardArr[a] === boardArr[c]
        ) {
          return boardArr[a];
        }
      }
      if (boardArr.every((cell) => cell !== "")) return "draw";
      return null;
    }

    const best = minimax([...boardState], player);
    return best ? best.index : null;
  }

  /**
   * Handles user clicking or keyboard pressing on a board cell
   * @param {Event} e
   */
  function handleCellClick(e) {
    const index = Number(e.target.dataset.index);
    if (!makeMove(index)) return;

    // If playing against computer and it's computer's turn, trigger AI move after delay
    if (isGameActive && vsComputer && currentPlayer === "O") {
      setTimeout(computerMove, 400);
    }
  }

  /**
   * Resets the game to initial state with fresh board
   */
  function resetGame() {
    showGameScreen();
    updateUndoButton();
  }

  // Back to mode select - updated to reset game state
  function backToModeSelect() {
    // Reset all game state variables
    boardState.fill("");
    movesHistory = [];
    isGameActive = false;
    winnerCombo = [];
    currentPlayer = "X";
    vsComputer = false;

    // Clear board UI cells
    board.forEach((cell) => {
      cell.textContent = "";
      cell.disabled = false;
      cell.classList.remove("board__cell--win");
      cell.setAttribute("aria-disabled", "false");
    });

    // Reset difficulty select UI and buttons
    difficultySelect.style.display = "none";
    setAriaPressed([btnEasy, btnMedium, btnHard], null);

    // Show mode select screen
    showModeSelect();
  }

  function updateUndoButton() {
    if (movesHistory.length > 0 && isGameActive && !vsComputer) {
      btnUndo.style.display = "inline-block"; // show button
    } else {
      btnUndo.style.display = "none"; // hide button
    }
  }

  /**
   * Handles the Back button:
   * - If game is active, undo last move
   * - If game not active, go back to mode select
   */
  function handleBackButton() {
    if (isGameActive) {
      undoLastMove();
    } else {
      showModeSelect();
    }
  }

  // ===== Attach Event Listeners =====

  btnHuman.addEventListener("click", () => {
    vsComputer = false;
    setAriaPressed([btnHuman, btnComputer], btnHuman);
    difficultySelect.style.display = "none";
    showGameScreen();
  });

  btnComputer.addEventListener("click", () => {
    vsComputer = true;
    setAriaPressed([btnHuman, btnComputer], btnComputer);
    showDifficultySelect();
  });

  [btnEasy, btnMedium, btnHard].forEach((btn) => {
    btn.addEventListener("click", () => {
      difficulty = btn.id.replace("btn-", "");
      setAriaPressed([btnEasy, btnMedium, btnHard], btn);
      showGameScreen();
    });
  });

  board.forEach((cell) => {
    cell.addEventListener("click", handleCellClick);
    cell.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCellClick(e);
      }
    });
  });

  btnReset.addEventListener("click", resetGame);
  btnBack.addEventListener("click", backToModeSelect);
  btnUndo.addEventListener("click", () => {
    undoLastMove();
    updateUndoButton();
  });

  // ===== Initialize app by showing mode select screen =====
  showModeSelect();
});
