document.addEventListener('DOMContentLoaded', () => {
    const chessboard = document.getElementById('chessboard');
    const whiteScoreDisplay = document.getElementById('white-score');
    const blackScoreDisplay = document.getElementById('black-score');
    const whiteCapturedPiecesDisplay = document.getElementById('white-captured-pieces');
    const blackCapturedPiecesDisplay = document.getElementById('black-captured-pieces');
    const turnIndicator = document.getElementById('turn-indicator');

    const boardSize = 8;
    let selectedPiece = null;
    let currentBoardState = []; // This will hold the current state of the board
    let currentPlayer = 'white'; // Start with white's turn

    let whiteScore = 0;
    let blackScore = 0;
    let whiteCapturedPieces = [];
    let blackCapturedPieces = [];

    let gameOver = false; // New: Flag to indicate if the game has ended

    // Chess piece representations (Unicode symbols)
    const pieces = {
        'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
        'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
    };

    // Piece point values
    const piecePoints = {
        'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9,
        'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9
        // King points are not considered for capture
    };

    // Initial board setup
    const initialBoard = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];

    function createBoard() {
        // Initialize currentBoardState with the initial setup
        currentBoardState = initialBoard.map(row => [...row]); // Deep copy

        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.dataset.row = row;
                square.dataset.col = col;

                const isLight = (row + col) % 2 === 0;
                square.classList.add(isLight ? 'light' : 'dark');

                const pieceChar = currentBoardState[row][col];
                if (pieceChar) {
                    addPieceToSquare(square, pieceChar, row, col);
                }
                chessboard.appendChild(square);
            }
        }
        updateTurnIndicator();
        updateScoreDisplays();
    }

    // Helper to add a piece element to a square
    function addPieceToSquare(squareElement, pieceChar, row, col) {
        const pieceElement = document.createElement('span');
        pieceElement.classList.add('piece');
        pieceElement.textContent = pieces[pieceChar];
        pieceElement.dataset.piece = pieceChar;
        pieceElement.dataset.originalRow = row; // Current position
        pieceElement.dataset.originalCol = col;

        if (pieceChar === pieceChar.toUpperCase()) {
            pieceElement.classList.add('white');
        } else {
            pieceElement.classList.add('black');
        }
        pieceElement.setAttribute('draggable', true);
        squareElement.appendChild(pieceElement);
    }

    function updateTurnIndicator(message = null) {
        if (message) {
            turnIndicator.textContent = message;
        } else {
            turnIndicator.textContent = `It's ${currentPlayer}'s turn`;
        }
    }

    function updateScoreDisplays() {
        whiteScoreDisplay.textContent = `Score: ${whiteScore}`;
        blackScoreDisplay.textContent = `Score: ${blackScore}`;
        whiteCapturedPiecesDisplay.textContent = 'Captured: ' + whiteCapturedPieces.map(p => pieces[p]).join(' ');
        blackCapturedPiecesDisplay.textContent = 'Captured: ' + blackCapturedPieces.map(p => pieces[p]).join(' ');
    }

    // --- Move Validation Functions ---

    function getPieceColor(pieceChar) {
        if (!pieceChar) return null;
        return pieceChar === pieceChar.toUpperCase() ? 'white' : 'black';
    }

    // This function checks if a path is clear between two points.
    // It's used by Rook, Bishop, Queen. Knight and King don't use this.
    function isPathClear(startRow, startCol, endRow, endCol, board) {
        const rowDiff = endRow - startRow;
        const colDiff = endCol - startCol;

        // Horizontal move
        if (rowDiff === 0 && colDiff !== 0) {
            const step = colDiff > 0 ? 1 : -1;
            for (let c = startCol + step; c !== endCol; c += step) {
                if (board[startRow][c] !== '') {
                    return false;
                }
            }
        }
        // Vertical move
        else if (colDiff === 0 && rowDiff !== 0) {
            const step = rowDiff > 0 ? 1 : -1;
            for (let r = startRow + step; r !== endRow; r += step) {
                if (board[r][startCol] !== '') {
                    return false;
                }
            }
        }
        // Diagonal move
        else if (Math.abs(rowDiff) === Math.abs(colDiff) && rowDiff !== 0) {
            const rowStep = rowDiff > 0 ? 1 : -1;
            const colStep = colDiff > 0 ? 1 : -1;
            let r = startRow + rowStep;
            let c = startCol + colStep;
            while (r !== endRow && c !== endCol) {
                if (board[r][c] !== '') {
                    return false;
                }
                r += rowStep;
                c += colStep;
            }
        }
        return true;
    }

    /**
     * Checks if a move is valid based on general chess rules and specific piece rules.
     * @param {string} pieceChar - The character representing the piece (e.g., 'P', 'r').
     * @param {number} startRow - Starting row.
     * @param {number} startCol - Starting column.
     * @param {number} endRow - Ending row.
     * @param {number} endCol - Ending column.
     * @param {Array<Array<string>>} board - The current board state to validate against.
     * @returns {boolean} True if the move is generally valid, false otherwise.
     */
    function isValidPieceMove(pieceChar, startRow, startCol, endRow, endCol, board) {
        const pieceColor = getPieceColor(pieceChar);
        const targetPieceChar = board[endRow][endCol];
        const targetPieceColor = getPieceColor(targetPieceChar);

        // Cannot move to the same square
        if (startRow === endRow && startCol === endCol) {
            return false;
        }

        // Cannot capture your own piece
        if (targetPieceColor && pieceColor === targetPieceColor) {
            return false;
        }

        const rowDiff = Math.abs(endRow - startRow);
        const colDiff = Math.abs(endCol - startCol);

        switch (pieceChar.toLowerCase()) {
            case 'p': // Pawn
                // White Pawn (moves up, row decreases)
                if (pieceColor === 'white') {
                    if (startCol === endCol) { // Straight move
                        if (endRow === startRow - 1 && targetPieceChar === '') { // 1 square forward
                            return true;
                        }
                        if (startRow === 6 && endRow === startRow - 2 && targetPieceChar === '' && board[startRow - 1][startCol] === '') { // 2 squares from start
                            return true;
                        }
                    } else if (colDiff === 1 && endRow === startRow - 1) { // Capture diagonally
                        if (targetPieceColor && targetPieceColor === 'black') {
                            return true;
                        }
                    }
                }
                // Black Pawn (moves down, row increases)
                else if (pieceColor === 'black') {
                    if (startCol === endCol) { // Straight move
                        if (endRow === startRow + 1 && targetPieceChar === '') { // 1 square forward
                            return true;
                        }
                        if (startRow === 1 && endRow === startRow + 2 && targetPieceChar === '' && board[startRow + 1][startCol] === '') { // 2 squares from start
                            return true;
                        }
                    } else if (colDiff === 1 && endRow === startRow + 1) { // Capture diagonally
                        if (targetPieceColor && targetPieceColor === 'white') {
                            return true;
                        }
                    }
                }
                return false;

            case 'n': // Knight
                return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

            case 'b': // Bishop
                return rowDiff === colDiff && isPathClear(startRow, startCol, endRow, endCol, board);

            case 'r': // Rook
                return (rowDiff === 0 || colDiff === 0) && isPathClear(startRow, startCol, endRow, endCol, board);

            case 'q': // Queen
                return ((rowDiff === 0 || colDiff === 0) || (rowDiff === colDiff)) && isPathClear(startRow, startCol, endRow, startCol, board); // Fixed a bug here: Should be endCol for isPathClear

            case 'k': // King
                return rowDiff <= 1 && colDiff <= 1;

            default:
                return false;
        }
    }

    /**
     * Finds the King's position for a given color.
     * @param {string} kingColor - 'white' or 'black'.
     * @param {Array<Array<string>>} board - The current board state.
     * @returns {{row: number, col: number}|null} King's position or null if not found.
     */
    function findKingPosition(kingColor, board) {
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                const piece = board[r][c];
                if (piece.toLowerCase() === 'k' && getPieceColor(piece) === kingColor) {
                    return { row: r, col: c };
                }
            }
        }
        return null; // Should not happen in a valid game
    }

    /**
     * Checks if a specific square is attacked by pieces of a given color.
     * @param {number} targetRow - The row of the square to check.
     * @param {number} targetCol - The column of the square to check.
     * @param {string} attackingColor - The color of the pieces that might be attacking ('white' or 'black').
     * @param {Array<Array<string>>} board - The board state to analyze.
     * @returns {boolean} True if the square is attacked, false otherwise.
     */
    function isSquareAttacked(targetRow, targetCol, attackingColor, board) {
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                const piece = board[r][c];
                if (piece && getPieceColor(piece) === attackingColor) {
                    // Check if this piece can legally move to the target square
                    // We use isValidPieceMove for this virtual check
                    if (isValidPieceMove(piece, r, c, targetRow, targetCol, board)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Checks if a king of a specific color is currently in check.
     * @param {string} kingColor - The color of the king to check ('white' or 'black').
     * @param {Array<Array<string>>} board - The board state to analyze.
     * @returns {boolean} True if the king is in check, false otherwise.
     */
    function isKingInCheck(kingColor, board) {
        const kingPos = findKingPosition(kingColor, board);
        if (!kingPos) return false; // Should not happen

        const attackingColor = kingColor === 'white' ? 'black' : 'white';
        return isSquareAttacked(kingPos.row, kingPos.col, attackingColor, board);
    }

    /**
     * Checks if the given player is in checkmate.
     * This is the most complex function. It tests all possible legal moves
     * for the `kingColor` to see if any move gets them out of check.
     * @param {string} kingColor - The color of the king to check for checkmate.
     * @param {Array<Array<string>>} board - The current board state.
     * @returns {boolean} True if in checkmate, false otherwise.
     */
    function isCheckmate(kingColor, board) {
        // 1. If the king is not in check, it cannot be checkmate.
        if (!isKingInCheck(kingColor, board)) {
            return false;
        }

        // 2. Iterate through ALL pieces of the kingColor
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                const piece = board[r][c];
                if (piece && getPieceColor(piece) === kingColor) {
                    // 3. For each piece, try all possible moves (all 64 squares)
                    for (let newR = 0; newR < boardSize; newR++) {
                        for (let newC = 0; newC < boardSize; newC++) {
                            // If it's a valid move for that piece type...
                            if (isValidPieceMove(piece, r, c, newR, newC, board)) {
                                // 4. Simulate the move on a temporary board
                                const tempBoard = board.map(row => [...row]); // Deep copy
                                const capturedPiece = tempBoard[newR][newC]; // Store potentially captured piece
                                tempBoard[newR][newC] = piece;
                                tempBoard[r][c] = '';

                                // 5. Check if the king is still in check after this simulated move
                                if (!isKingInCheck(kingColor, tempBoard)) {
                                    // If the king is NOT in check, then there's a legal move
                                    // that gets the king out of check, so it's NOT checkmate.
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
        }

        // 6. If no legal move was found that gets the king out of check, it's checkmate.
        return true;
    }


    // Function to highlight valid moves
    function highlightValidMoves(pieceElement) {
        const startRow = parseInt(pieceElement.parentElement.dataset.row);
        const startCol = parseInt(pieceElement.parentElement.dataset.col);
        const pieceChar = pieceElement.dataset.piece;

        document.querySelectorAll('.square').forEach(square => {
            const endRow = parseInt(square.dataset.row);
            const endCol = parseInt(square.dataset.col);

            // Temporarily simulate the move to check for check
            const tempBoard = currentBoardState.map(row => [...row]);
            const tempPiece = tempBoard[startRow][startCol];
            const tempCapturedPiece = tempBoard[endRow][endCol];

            tempBoard[endRow][endCol] = tempPiece;
            tempBoard[startRow][startCol] = '';

            // Only highlight if the move is generally valid AND it doesn't put/leave own king in check
            if (isValidPieceMove(pieceChar, startRow, startCol, endRow, endCol, currentBoardState) &&
                !isKingInCheck(currentPlayer, tempBoard)) { // Check if king is safe AFTER the move
                square.classList.add('valid-move');
            }

            // Revert temp board (not strictly necessary here as tempBoard is local)
            // tempBoard[startRow][startCol] = tempPiece;
            // tempBoard[endRow][endCol] = tempCapturedPiece;
        });
    }

    // Function to remove highlighted moves
    function removeValidMoveHighlights() {
        document.querySelectorAll('.valid-move').forEach(square => {
            square.classList.remove('valid-move');
        });
    }

    // --- Drag and Drop Logic ---

    chessboard.addEventListener('dragstart', (e) => {
        if (gameOver) { // Prevent moves if game is over
            e.preventDefault();
            return;
        }

        if (e.target.classList.contains('piece')) {
            const pieceColor = getPieceColor(e.target.dataset.piece);
            if (pieceColor !== currentPlayer) {
                e.preventDefault(); // Prevent dragging if it's not the current player's turn
                return;
            }

            // Remove any previous highlights and selection
            removeValidMoveHighlights();
            if (selectedPiece) selectedPiece.classList.remove('selected-piece');

            selectedPiece = e.target;
            selectedPiece.classList.add('selected-piece');

            selectedPiece.dataset.startRow = selectedPiece.parentElement.dataset.row;
            selectedPiece.dataset.startCol = selectedPiece.parentElement.dataset.col;

            highlightValidMoves(selectedPiece); // Highlight valid moves for the selected piece

            e.target.classList.add('dragging');
            setTimeout(() => {
                selectedPiece.style.opacity = '0';
            }, 0);
        }
    });

    chessboard.addEventListener('dragover', (e) => {
        e.preventDefault(); // Allow dropping
    });

    chessboard.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!selectedPiece || gameOver) return;

        let targetSquare = e.target.closest('.square');
        const startRow = parseInt(selectedPiece.dataset.startRow);
        const startCol = parseInt(selectedPiece.dataset.startCol);

        if (targetSquare) {
            const endRow = parseInt(targetSquare.dataset.row);
            const endCol = parseInt(targetSquare.dataset.col);
            const pieceChar = selectedPiece.dataset.piece;

            // Simulate the potential move to check for king safety BEFORE actual move
            const tempBoard = currentBoardState.map(row => [...row]);
            const tempCapturedPieceChar = tempBoard[endRow][endCol];
            tempBoard[endRow][endCol] = pieceChar;
            tempBoard[startRow][startCol] = '';

            // Check if the move is valid for the piece type AND doesn't leave own king in check
            if (isValidPieceMove(pieceChar, startRow, startCol, endRow, endCol, currentBoardState) &&
                !isKingInCheck(currentPlayer, tempBoard)) {

                // If a piece was captured, update scores and lists
                if (targetSquare.children.length > 0 && targetSquare.children[0].classList.contains('piece')) {
                    const existingPieceElement = targetSquare.children[0];
                    const capturedPieceChar = existingPieceElement.dataset.piece;

                    if (capturedPieceChar && piecePoints[capturedPieceChar]) {
                        if (currentPlayer === 'white') {
                            whiteScore += piecePoints[capturedPieceChar];
                            whiteCapturedPieces.push(capturedPieceChar.toLowerCase());
                        } else {
                            blackScore += piecePoints[capturedPieceChar];
                            blackCapturedPieces.push(capturedPieceChar.toUpperCase());
                        }
                        updateScoreDisplays();
                    }
                    targetSquare.removeChild(existingPieceElement); // Remove the captured piece visually
                }

                // Update the board visually
                targetSquare.appendChild(selectedPiece);

                // Update the internal board state (use the values from the temp board now)
                currentBoardState = tempBoard;

                // Update the selected piece's data- attributes for future moves
                selectedPiece.dataset.originalRow = endRow;
                selectedPiece.dataset.originalCol = endCol;
                selectedPiece.dataset.startRow = endRow;
                selectedPiece.dataset.startCol = endCol;

                // Switch turn
                currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
                updateTurnIndicator();

                // Check for check or checkmate after the move
                const opponentColor = currentPlayer; // Current player is now the one whose turn just ended, so it's the opponent
                if (isKingInCheck(opponentColor, currentBoardState)) {
                    if (isCheckmate(opponentColor, currentBoardState)) {
                        gameOver = true;
                        updateTurnIndicator(`CHECKMATE! ${opponentColor === 'white' ? 'Black' : 'White'} wins!`);
                        console.log(`CHECKMATE! ${opponentColor === 'white' ? 'Black' : 'White'} wins!`);
                        // Optionally disable further drags
                        chessboard.removeEventListener('dragstart', handleDragStart); // You'd need to convert event listeners to named functions
                    } else {
                        updateTurnIndicator(`${opponentColor}'s King is in CHECK!`);
                        console.log(`${opponentColor}'s King is in CHECK!`);
                    }
                } else {
                    console.log(`It's ${currentPlayer}'s turn.`);
                }

            } else {
                console.log("Invalid move or leaves king in check!");
                // Move the piece back to its original position if the move was invalid
                const originalSquare = document.querySelector(`[data-row="${startRow}"][data-col="${startCol}"]`);
                originalSquare.appendChild(selectedPiece);
            }
        }

        // Reset state after drop
        selectedPiece.style.opacity = '1';
        selectedPiece.classList.remove('dragging');
        selectedPiece.classList.remove('selected-piece');
        removeValidMoveHighlights();
        selectedPiece = null;
    });

    chessboard.addEventListener('dragend', (e) => {
        if (selectedPiece) {
            selectedPiece.style.opacity = '1';
            selectedPiece.classList.remove('dragging');
            selectedPiece.classList.remove('selected-piece');
            removeValidMoveHighlights();
        }
        selectedPiece = null;
    });

    // Initial setup
    createBoard();
});
