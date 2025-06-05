document.addEventListener('DOMContentLoaded', () => {
    const chessboard = document.getElementById('chessboard');
    const whiteScoreDisplay = document.getElementById('white-score');
    const blackScoreDisplay = document.getElementById('black-score');
    const whiteCapturedPiecesDisplay = document.getElementById('white-captured-pieces');
    const blackCapturedPiecesDisplay = document.getElementById('black-captured-pieces');
    const turnIndicator = document.getElementById('turn-indicator');

    const boardSize = 8;
    let selectedPiece = null;
    let currentBoardState = []; // This will hold the current state of the board (e.g., [['r', 'n', ...], ...])
    let currentPlayer = 'white'; // Start with white's turn

    let whiteScore = 0;
    let blackScore = 0;
    let whiteCapturedPieces = [];
    let blackCapturedPieces = [];

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
        // The originalRow/Col will now refer to the current position of the piece
        pieceElement.dataset.originalRow = row;
        pieceElement.dataset.originalCol = col;

        if (pieceChar === pieceChar.toUpperCase()) {
            pieceElement.classList.add('white');
        } else {
            pieceElement.classList.add('black');
        }
        pieceElement.setAttribute('draggable', true);
        squareElement.appendChild(pieceElement);
    }

    function updateTurnIndicator() {
        turnIndicator.textContent = `It's ${currentPlayer}'s turn`;
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

    function isPathClear(startRow, startCol, endRow, endCol) {
        const rowDiff = endRow - startRow;
        const colDiff = endCol - startCol;

        // Horizontal move
        if (rowDiff === 0 && colDiff !== 0) {
            const step = colDiff > 0 ? 1 : -1;
            for (let c = startCol + step; c !== endCol; c += step) {
                if (currentBoardState[startRow][c] !== '') {
                    return false;
                }
            }
        }
        // Vertical move
        else if (colDiff === 0 && rowDiff !== 0) {
            const step = rowDiff > 0 ? 1 : -1;
            for (let r = startRow + step; r !== endRow; r += step) {
                if (currentBoardState[r][startCol] !== '') {
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
                if (currentBoardState[r][c] !== '') {
                    return false;
                }
                r += rowStep;
                c += colStep;
            }
        }
        return true;
    }

    function isValidMove(pieceChar, startRow, startCol, endRow, endCol) {
        const pieceColor = getPieceColor(pieceChar);
        const targetPieceChar = currentBoardState[endRow][endCol];
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
                        if (startRow === 6 && endRow === startRow - 2 && targetPieceChar === '' && currentBoardState[startRow - 1][startCol] === '') { // 2 squares from start
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
                        if (startRow === 1 && endRow === startRow + 2 && targetPieceChar === '' && currentBoardState[startRow + 1][startCol] === '') { // 2 squares from start
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
                // L-shape move: (2 squares in one direction, 1 square perpendicular)
                return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

            case 'b': // Bishop
                // Diagonal move
                return rowDiff === colDiff && isPathClear(startRow, startCol, endRow, endCol);

            case 'r': // Rook
                // Horizontal or Vertical move
                return (rowDiff === 0 || colDiff === 0) && isPathClear(startRow, startCol, endRow, endCol);

            case 'q': // Queen
                // Horizontal, Vertical, or Diagonal move
                return ((rowDiff === 0 || colDiff === 0) || (rowDiff === colDiff)) && isPathClear(startRow, startCol, endRow, endCol);

            case 'k': // King
                // Moves one square in any direction
                // A very basic check to prevent moving into a square attacked by an opponent.
                // This is a placeholder for a much more complex "is in check" logic.
                // For a full game, you'd need to simulate the move and then check if the king is attacked.
                // For now, this just prevents moving onto a square that would be immediately captured.
                return rowDiff <= 1 && colDiff <= 1;

            default:
                return false;
        }
    }

    // Function to highlight valid moves
    function highlightValidMoves(pieceElement) {
        const startRow = parseInt(pieceElement.parentElement.dataset.row);
        const startCol = parseInt(pieceElement.parentElement.dataset.col);
        const pieceChar = pieceElement.dataset.piece;

        document.querySelectorAll('.square').forEach(square => {
            const endRow = parseInt(square.dataset.row);
            const endCol = parseInt(square.dataset.col);

            if (isValidMove(pieceChar, startRow, startCol, endRow, endCol)) {
                square.classList.add('valid-move');
            }
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
        if (e.target.classList.contains('piece')) {
            const pieceColor = getPieceColor(e.target.dataset.piece);
            if (pieceColor !== currentPlayer) {
                e.preventDefault(); // Prevent dragging if it's not the current player's turn
                return;
            }

            // Remove any previous highlights
            removeValidMoveHighlights();

            selectedPiece = e.target;
            // Add a class to the selected piece for visual feedback
            selectedPiece.classList.add('selected-piece');

            selectedPiece.dataset.startRow = selectedPiece.parentElement.dataset.row; // Store starting square
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
        if (!selectedPiece) return;

        let targetSquare = e.target.closest('.square'); // Get the square element
        const startRow = parseInt(selectedPiece.dataset.startRow);
        const startCol = parseInt(selectedPiece.dataset.startCol);

        if (targetSquare) {
            const endRow = parseInt(targetSquare.dataset.row);
            const endCol = parseInt(targetSquare.dataset.col);
            const pieceChar = selectedPiece.dataset.piece;

            if (isValidMove(pieceChar, startRow, startCol, endRow, endCol)) {
                let capturedPieceChar = '';
                // Check for capture
                if (targetSquare.children.length > 0 && targetSquare.children[0].classList.contains('piece')) {
                    const existingPieceElement = targetSquare.children[0];
                    capturedPieceChar = existingPieceElement.dataset.piece;

                    // If it's a capture, update scores and captured pieces list
                    if (capturedPieceChar && piecePoints[capturedPieceChar]) {
                        if (currentPlayer === 'white') {
                            whiteScore += piecePoints[capturedPieceChar];
                            whiteCapturedPieces.push(capturedPieceChar.toLowerCase()); // Store lowercase for display
                        } else {
                            blackScore += piecePoints[capturedPieceChar];
                            blackCapturedPieces.push(capturedPieceChar.toUpperCase()); // Store uppercase for display
                        }
                        updateScoreDisplays();
                    }
                    targetSquare.removeChild(existingPieceElement); // Remove the captured piece
                }

                // Update the board visually
                targetSquare.appendChild(selectedPiece);

                // Update the internal board state
                currentBoardState[endRow][endCol] = pieceChar;
                currentBoardState[startRow][startCol] = '';

                // Update the selected piece's data- attributes for future moves
                selectedPiece.dataset.originalRow = endRow;
                selectedPiece.dataset.originalCol = endCol;
                selectedPiece.dataset.startRow = endRow; // Also update startRow/Col for consistency
                selectedPiece.dataset.startCol = endCol;

                // Switch turn
                currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
                updateTurnIndicator();
                console.log(`It's ${currentPlayer}'s turn.`);

            } else {
                console.log("Invalid move!");
                // Move the piece back to its original position if the move was invalid
                const originalSquare = document.querySelector(`[data-row="${startRow}"][data-col="${startCol}"]`);
                originalSquare.appendChild(selectedPiece);
            }
        }

        // Reset state after drop
        selectedPiece.style.opacity = '1';
        selectedPiece.classList.remove('dragging');
        selectedPiece.classList.remove('selected-piece'); // Remove selection highlight
        removeValidMoveHighlights(); // Clear highlights
        selectedPiece = null;
    });

    chessboard.addEventListener('dragend', (e) => {
        if (selectedPiece) {
            selectedPiece.style.opacity = '1';
            selectedPiece.classList.remove('dragging');
            selectedPiece.classList.remove('selected-piece'); // Ensure selection highlight is removed
            removeValidMoveHighlights(); // Ensure highlights are cleared
        }
        selectedPiece = null;
    });

    // Initialize the board
    createBoard();
});
