document.addEventListener('DOMContentLoaded', () => {
    const chessboard = document.getElementById('chessboard');
    const whiteScoreDisplay = document.getElementById('white-score');
    const blackScoreDisplay = document.getElementById('black-score');
    const whiteCapturedPiecesDisplay = document.getElementById('white-captured-pieces');
    const blackCapturedPiecesDisplay = document.getElementById('black-captured-pieces');
    const turnIndicator = document.getElementById('turn-indicator');
    const undoButton = document.getElementById('undo-button'); // Get the undo button

    // Initialize chess.js game instance
    const game = new Chess(); // This will manage your board state and rules

    const boardSize = 8;
    let selectedPieceElement = null; // Renamed to avoid confusion with pieceChar
    // currentBoardState, currentPlayer, gameOver will now be managed by chess.js game object

    let whiteScore = 0;
    let blackScore = 0;
    let whiteCapturedPieces = [];
    let blackCapturedPieces = [];

    // Store the last move made by *either* player
    // This is to implement the "one undo move is applicable" rule for the opponent
    // We store the game's FEN *before* the move, so we can revert if needed.
    let lastMoveState = null; 

    // Chess piece representations (Unicode symbols)
    // IMPORTANT: chess.js uses standard FEN notation for pieces ('p', 'r', 'n', 'b', 'q', 'k' for black lowercase, 'P', 'R', 'N', 'B', 'Q', 'K' for white uppercase)
    const pieceSymbols = {
        'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
        'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
    };

    // Piece point values (for captured pieces display)
    const piecePoints = {
        'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9,
        'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9
    };

    // --- Board Rendering and UI Updates ---

    // Function to render the board based on the current game.board() state
    function renderBoard() {
        chessboard.innerHTML = ''; // Clear existing board
        const board = game.board(); // Get the 2D array representation from chess.js

        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.dataset.row = row;
                square.dataset.col = col;
                square.dataset.squareId = String.fromCharCode(97 + col) + (8 - row); // e.g., 'a8', 'h1' for chess.js

                const isLight = (row + col) % 2 === 0;
                square.classList.add(isLight ? 'light' : 'dark');

                const piece = board[row][col];
                if (piece) {
                    addPieceToSquare(square, piece.type, piece.color, row, col);
                }
                chessboard.appendChild(square);
            }
        }
        updateGameStatus();
        updateScoreDisplays();
        updateUndoButtonState();
    }

    // Helper to add a piece element to a square
    function addPieceToSquare(squareElement, pieceType, pieceColor, row, col) {
        const pieceChar = pieceColor === 'w' ? pieceType.toUpperCase() : pieceType.toLowerCase();
        
        const pieceElement = document.createElement('span');
        pieceElement.classList.add('piece');
        pieceElement.textContent = pieceSymbols[pieceChar];
        pieceElement.dataset.pieceType = pieceType; // 'p', 'n', 'b', etc.
        pieceElement.dataset.pieceColor = pieceColor; // 'w' or 'b'
        pieceElement.dataset.squareId = String.fromCharCode(97 + col) + (8 - row); // e.g., 'a8', 'h1'

        if (pieceColor === 'w') {
            pieceElement.classList.add('white');
        } else {
            pieceElement.classList.add('black');
        }
        pieceElement.setAttribute('draggable', true);
        squareElement.appendChild(pieceElement);
    }

    // --- UI Update Functions ---

    function updateGameStatus() {
        let status = '';
        const turn = game.turn(); // 'w' or 'b'
        const fullMoveNumber = game.history().length; // Approximately, a half-move count

        if (game.isCheckmate()) {
            status = `CHECKMATE! ${turn === 'w' ? 'Black' : 'White'} wins!`;
            // game.isGameOver() will be true
        } else if (game.isDraw()) {
            status = 'Game over, drawn position';
        } else {
            status = `It's ${turn === 'w' ? 'White' : 'Black'}'s turn`;
            if (game.isCheck()) {
                status += `, ${turn === 'w' ? 'White' : 'Black'}'s King is in CHECK!`;
            }
        }
        turnIndicator.textContent = status;
    }

    function updateScoreDisplays() {
        whiteScoreDisplay.textContent = `Score: ${whiteScore}`;
        blackScoreDisplay.textContent = `Score: ${blackScore}`;
        whiteCapturedPiecesDisplay.textContent = 'Captured: ' + whiteCapturedPieces.map(p => pieceSymbols[p]).join(' ');
        blackCapturedPiecesDisplay.textContent = 'Captured: ' + blackCapturedPieces.map(p => pieceSymbols[p]).join(' ');
    }

    function updateUndoButtonState() {
        // Enable undo if there's a lastMoveState to revert to
        // and if the game is not over.
        undoButton.disabled = !lastMoveState || game.isGameOver();
    }

    // --- Highlighting Logic ---

    function highlightValidMoves(sourceSquareId) {
        // Get all legal moves for the piece on the source square
        const moves = game.moves({
            square: sourceSquareId,
            verbose: true // Get detailed move objects
        });

        // Add highlight class to target squares
        moves.forEach(move => {
            const targetSquare = document.querySelector(`[data-square-id="${move.to}"]`);
            if (targetSquare) {
                targetSquare.classList.add('valid-move');
                // Optional: Differentiate captures if you want (e.g., different color)
                if (move.flags.includes('c') || move.flags.includes('e')) { // 'c' for capture, 'e' for en passant
                    targetSquare.classList.add('capture-move');
                }
            }
        });
    }

    function removeValidMoveHighlights() {
        document.querySelectorAll('.valid-move').forEach(square => {
            square.classList.remove('valid-move');
        });
        document.querySelectorAll('.capture-move').forEach(square => {
            square.classList.remove('capture-move');
        });
    }

    // --- Drag and Drop Logic ---

    chessboard.addEventListener('dragstart', (e) => {
        if (game.isGameOver()) { // Prevent drags if game is over
            e.preventDefault();
            return;
        }

        if (e.target.classList.contains('piece')) {
            const pieceColor = e.target.dataset.pieceColor;
            // Allow drag only if it's the current player's piece
            if (pieceColor !== game.turn()) {
                e.preventDefault();
                return;
            }

            removeValidMoveHighlights();
            if (selectedPieceElement) selectedPieceElement.classList.remove('selected-piece');

            selectedPieceElement = e.target;
            selectedPieceElement.classList.add('selected-piece');
            
            // Store the source square ID for the drag operation
            e.dataTransfer.setData('text/plain', selectedPieceElement.dataset.squareId);
            
            highlightValidMoves(selectedPieceElement.dataset.squareId);

            e.target.classList.add('dragging');
            setTimeout(() => {
                selectedPieceElement.style.opacity = '0';
            }, 0);
        }
    });

    chessboard.addEventListener('dragover', (e) => {
        e.preventDefault(); // Allow dropping
        // Optional: Add a class to hovered valid squares during dragover for better UX
        // if (e.target.closest('.square').classList.contains('valid-move')) {
        //     e.target.closest('.square').classList.add('drag-hover');
        // }
    });

    // chessboard.addEventListener('dragleave', (e) => {
    //     // Optional: Remove drag-hover class
    //     document.querySelectorAll('.drag-hover').forEach(s => s.classList.remove('drag-hover'));
    // });

    chessboard.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!selectedPieceElement || game.isGameOver()) return;

        let targetSquareElement = e.target.closest('.square');
        if (!targetSquareElement) {
            // If dropped outside a square, revert piece to original position
            const originalSquare = document.querySelector(`[data-square-id="${selectedPieceElement.dataset.squareId}"]`);
            originalSquare.appendChild(selectedPieceElement);
            resetDragState();
            return;
        }

        const sourceSquareId = selectedPieceElement.dataset.squareId;
        const targetSquareId = targetSquareElement.dataset.squareId;

        // Ensure the target square is a valid move highlight
        if (!targetSquareElement.classList.contains('valid-move')) {
            console.log("Invalid drop target.");
            const originalSquare = document.querySelector(`[data-square-id="${sourceSquareId}"]`);
            originalSquare.appendChild(selectedPieceElement); // Snap back
            resetDragState();
            return;
        }

        // --- Make the move using chess.js ---
        const moveAttempt = game.move({
            from: sourceSquareId,
            to: targetSquareId,
            // You might need a promotion UI here for pawns reaching the 8th/1st rank
            // For now, it will auto-promote to queen by default in chess.js if not specified
            promotion: 'q' 
        });

        if (moveAttempt) {
            console.log("Move successful:", moveAttempt);

            // Store the state *before* this move for potential undo
            lastMoveState = {
                fen: game.fen(), // Store current FEN (after the move)
                turn: game.turn() // This is the *next* player's turn
            };
            
            // Check for captured piece
            if (moveAttempt.captured) {
                const capturedPieceChar = moveAttempt.captured; // e.g., 'p', 'b', 'q'
                const capturedColor = moveAttempt.color === 'w' ? 'b' : 'w'; // Color of the captured piece

                // Update scores and captured pieces lists
                if (capturedColor === 'b') { // White captured Black's piece
                    whiteScore += piecePoints[capturedPieceChar.toLowerCase()];
                    whiteCapturedPieces.push(capturedPieceChar.toLowerCase());
                } else { // Black captured White's piece
                    blackScore += piecePoints[capturedPieceChar.toUpperCase()];
                    blackCapturedPieces.push(capturedPieceChar.toUpperCase());
                }
            }

            renderBoard(); // Re-render the entire board based on new game state
            // Undo button state is updated by renderBoard -> updateUndoButtonState

        } else {
            console.log("Invalid move (chess.js rejected).");
            // If move failed, snap piece back
            const originalSquare = document.querySelector(`[data-square-id="${sourceSquareId}"]`);
            originalSquare.appendChild(selectedPieceElement);
        }

        resetDragState();
    });

    chessboard.addEventListener('dragend', (e) => {
        resetDragState();
    });

    function resetDragState() {
        if (selectedPieceElement) {
            selectedPieceElement.style.opacity = '1';
            selectedPieceElement.classList.remove('dragging');
            selectedPieceElement.classList.remove('selected-piece');
        }
        removeValidMoveHighlights();
        selectedPieceElement = null;
    }

    // --- Undo Button Logic ---
    undoButton.addEventListener('click', () => {
        if (!undoButton.disabled) {
            const undoneMove = game.undo(); // undoes the last move
            if (undoneMove) {
                console.log("Undone move:", undoneMove);

                // Revert score and captured pieces logic
                if (undoneMove.captured) {
                    const capturedPieceChar = undoneMove.captured;
                    const capturerColor = undoneMove.color; // The color of the piece that captured

                    if (capturerColor === 'w') { // White was the capturer, so decrement white's score
                        whiteScore -= piecePoints[capturedPieceChar.toLowerCase()];
                        // Remove the last instance of the captured piece from white's list
                        const index = whiteCapturedPieces.lastIndexOf(capturedPieceChar.toLowerCase());
                        if (index > -1) {
                            whiteCapturedPieces.splice(index, 1);
                        }
                    } else { // Black was the capturer, so decrement black's score
                        blackScore -= piecePoints[capturedPieceChar.toUpperCase()];
                        // Remove the last instance of the captured piece from black's list
                        const index = blackCapturedPieces.lastIndexOf(capturedPieceChar.toUpperCase());
                        if (index > -1) {
                            blackCapturedPieces.splice(index, 1);
                        }
                    }
                }
                
                // Clear lastMoveState after an undo, as the move it referred to is gone
                lastMoveState = null;
                renderBoard(); // Re-render the board to reflect the undone move
            } else {
                console.warn("No move to undo.");
            }
        }
    });

    // Initial setup
    renderBoard(); // Render the board for the first time
});
