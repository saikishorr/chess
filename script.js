// ====================================================================
// script.js - Core Game Logic & Rules
// This file contains all JavaScript for board representation,
// piece movement rules, turn management, and basic check/checkmate detection.
// ====================================================================

// --- Game State Variables ---
const board = []; // The 8x8 2D array representing the chess board
let currentPlayer = 'white'; // 'white' or 'black'
let selectedPiece = null; // Stores the piece object currently selected by the user
let selectedSquare = null; // Stores the HTML div element of the selected square
let legalMovesHighlights = []; // Stores HTML div elements of highlighted legal moves

// --- DOM Elements ---
const gameBoardElement = document.getElementById('game-board');
const turnDisplayElement = document.getElementById('turn-display'); // Assuming you add this in index.html

// --- Piece Definitions ---
// Base Piece Class
class Piece {
    constructor(type, color, row, col, htmlElement) {
        this.type = type;
        this.color = color;
        this.row = row;
        this.col = col;
        this.htmlElement = htmlElement; // Reference to the actual piece HTML element
        this.hasMoved = false; // For King, Rook, Pawn special moves
    }

    // Helper: Checks if a target square is on the board
    isOnBoard(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    // Helper: Checks if a square is occupied by a friendly piece
    isOccupiedByFriendly(r, c, currentBoard) {
        if (!this.isOnBoard(r, c)) return false;
        const targetPiece = currentBoard[r][c];
        return targetPiece && targetPiece.color === this.color;
    }

    // Helper: Checks if a square is occupied by an opponent's piece
    isOccupiedByOpponent(r, c, currentBoard) {
        if (!this.isOnBoard(r, c)) return false;
        const targetPiece = currentBoard[r][c];
        return targetPiece && targetPiece.color !== this.color;
    }

    // This method will be overridden by specific piece types
    getLegalMoves(currentBoard) {
        return []; // Base class has no moves
    }
}

// Pawn
class Pawn extends Piece {
    constructor(color, row, col, htmlElement) {
        super('pawn', color, row, col, htmlElement);
    }

    getLegalMoves(currentBoard) {
        const moves = [];
        const direction = this.color === 'white' ? -1 : 1; // White moves up (row decreases), Black moves down (row increases)

        // 1 Square forward
        const oneStepRow = this.row + direction;
        if (this.isOnBoard(oneStepRow, this.col) && !currentBoard[oneStepRow][this.col]) {
            moves.push([oneStepRow, this.col]);
        }

        // 2 Squares forward (initial move)
        const twoStepRow = this.row + 2 * direction;
        if (!this.hasMoved && this.isOnBoard(oneStepRow, this.col) && !currentBoard[oneStepRow][this.col] &&
            this.isOnBoard(twoStepRow, this.col) && !currentBoard[twoStepRow][this.col]) {
            moves.push([twoStepRow, this.col]);
        }

        // Captures (diagonal)
        const captureCols = [this.col - 1, this.col + 1];
        captureCols.forEach(targetCol => {
            if (this.isOnBoard(oneStepRow, targetCol) && this.isOccupiedByOpponent(oneStepRow, targetCol, currentBoard)) {
                moves.push([oneStepRow, targetCol]);
            }
        });

        // TODO: En passant (V2 or later)
        // TODO: Pawn promotion (handled during move execution for now)

        return moves;
    }
}

// Rook
class Rook extends Piece {
    constructor(color, row, col, htmlElement) {
        super('rook', color, row, col, htmlElement);
    }

    getLegalMoves(currentBoard) {
        const moves = [];
        const directions = [
            [-1, 0], // Up
            [1, 0], // Down
            [0, -1], // Left
            [0, 1] // Right
        ];

        directions.forEach(([dr, dc]) => {
            let r = this.row + dr;
            let c = this.col + dc;
            while (this.isOnBoard(r, c)) {
                if (!currentBoard[r][c]) { // Empty square
                    moves.push([r, c]);
                } else if (this.isOccupiedByOpponent(r, c, currentBoard)) { // Opponent's piece
                    moves.push([r, c]);
                    break; // Cannot move past an opponent's piece
                } else { // Friendly piece
                    break; // Cannot move past a friendly piece
                }
                r += dr;
                c += dc;
            }
        });
        return moves;
    }
}

// Knight
class Knight extends Piece {
    constructor(color, row, col, htmlElement) {
        super('knight', color, row, col, htmlElement);
    }

    getLegalMoves(currentBoard) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        knightMoves.forEach(([dr, dc]) => {
            const newRow = this.row + dr;
            const newCol = this.col + dc;
            if (this.isOnBoard(newRow, newCol) && !this.isOccupiedByFriendly(newRow, newCol, currentBoard)) {
                moves.push([newRow, newCol]);
            }
        });
        return moves;
    }
}

// Bishop
class Bishop extends Piece {
    constructor(color, row, col, htmlElement) {
        super('bishop', color, row, col, htmlElement);
    }

    getLegalMoves(currentBoard) {
        const moves = [];
        const directions = [
            [-1, -1], // Up-Left
            [-1, 1], // Up-Right
            [1, -1], // Down-Left
            [1, 1] // Down-Right
        ];

        directions.forEach(([dr, dc]) => {
            let r = this.row + dr;
            let c = this.col + dc;
            while (this.isOnBoard(r, c)) {
                if (!currentBoard[r][c]) { // Empty square
                    moves.push([r, c]);
                } else if (this.isOccupiedByOpponent(r, c, currentBoard)) { // Opponent's piece
                    moves.push([r, c]);
                    break;
                } else { // Friendly piece
                    break;
                }
                r += dr;
                c += dc;
            }
        });
        return moves;
    }
}

// Queen
class Queen extends Piece {
    constructor(color, row, col, htmlElement) {
        super('queen', color, row, col, htmlElement);
    }

    getLegalMoves(currentBoard) {
        // Queen moves are a combination of Rook and Bishop moves
        const rookMoves = new Rook(this.color, this.row, this.col, this.htmlElement).getLegalMoves(currentBoard);
        const bishopMoves = new Bishop(this.color, this.row, this.col, this.htmlElement).getLegalMoves(currentBoard);
        return [...rookMoves, ...bishopMoves];
    }
}

// King
class King extends Piece {
    constructor(color, row, col, htmlElement) {
        super('king', color, row, col, htmlElement);
    }

    getLegalMoves(currentBoard) {
        const moves = [];
        const kingMoves = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], /* King */ [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        kingMoves.forEach(([dr, dc]) => {
            const newRow = this.row + dr;
            const newCol = this.col + dc;
            if (this.isOnBoard(newRow, newCol) && !this.isOccupiedByFriendly(newRow, newCol, currentBoard)) {
                moves.push([newRow, newCol]);
            }
        });

        // TODO: Castling (More complex, consider adding in a later version or as advanced V1)
        return moves;
    }
}


// --- Game Initialization ---

// Creates the empty board array and populates it with pieces
function initializeBoard() {
    // Initialize empty board array
    for (let r = 0; r < 8; r++) {
        board[r] = new Array(8).fill(null);
    }

    // Helper to create and place a piece
    const placePiece = (type, color, r, c) => {
        const pieceElement = document.querySelector(`.square[data-row="${r}"][data-col="${c}"] .piece`);
        let pieceInstance;
        switch (type) {
            case 'pawn':
                pieceInstance = new Pawn(color, r, c, pieceElement);
                break;
            case 'rook':
                pieceInstance = new Rook(color, r, c, pieceElement);
                break;
            case 'knight':
                pieceInstance = new Knight(color, r, c, pieceElement);
                break;
            case 'bishop':
                pieceInstance = new Bishop(color, r, c, pieceElement);
                break;
            case 'queen':
                pieceInstance = new Queen(color, r, c, pieceElement);
                break;
            case 'king':
                pieceInstance = new King(color, r, c, pieceElement);
                break;
        }
        board[r][c] = pieceInstance;
    };

    // Place Black Pieces
    placePiece('rook', 'black', 0, 0);
    placePiece('knight', 'black', 0, 1);
    placePiece('bishop', 'black', 0, 2);
    placePiece('queen', 'black', 0, 3);
    placePiece('king', 'black', 0, 4);
    placePiece('bishop', 'black', 0, 5);
    placePiece('knight', 'black', 0, 6);
    placePiece('rook', 'black', 0, 7);
    for (let i = 0; i < 8; i++) {
        placePiece('pawn', 'black', 1, i);
    }

    // Place White Pieces
    placePiece('rook', 'white', 7, 0);
    placePiece('knight', 'white', 7, 1);
    placePiece('bishop', 'white', 7, 2);
    placePiece('queen', 'white', 7, 3);
    placePiece('king', 'white', 7, 4);
    placePiece('bishop', 'white', 7, 5);
    placePiece('knight', 'white', 7, 6);
    placePiece('rook', 'white', 7, 7);
    for (let i = 0; i < 8; i++) {
        placePiece('pawn', 'white', 6, i);
    }

    renderBoardUI(); // Initial rendering of the board based on the board array
    updateTurnDisplay();
}

// Renders or re-renders the visual state of the board based on the `board` array
function renderBoardUI() {
    gameBoardElement.innerHTML = ''; // Clear existing board
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const squareElement = document.createElement('div');
            squareElement.classList.add('square');
            squareElement.classList.add((r + c) % 2 === 0 ? 'light' : 'dark');
            squareElement.dataset.row = r;
            squareElement.dataset.col = c;

            const piece = board[r][c];
            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.classList.add('piece', piece.color, piece.type);
                // Use unicode characters for pieces
                const unicodeChar = getUnicodeChar(piece.type, piece.color);
                pieceElement.textContent = unicodeChar;
                piece.htmlElement = pieceElement; // Update the piece object's HTML element reference
                squareElement.appendChild(pieceElement);
            }
            gameBoardElement.appendChild(squareElement);
        }
    }
    addEventListenersToSquares(); // Re-add event listeners after re-rendering
}

// Helper to get unicode character for a piece
function getUnicodeChar(type, color) {
    const pieces = {
        'white': {
            'king': '&#9812;', 'queen': '&#9813;', 'rook': '&#9814;',
            'bishop': '&#9815;', 'knight': '&#9816;', 'pawn': '&#9817;'
        },
        'black': {
            'king': '&#9818;', 'queen': '&#9819;', 'rook': '&#9820;',
            'bishop': '&#9821;', 'knight': '&#9822;', 'pawn': '&#9823;'
        }
    };
    return pieces[color][type];
}

// Adds click event listeners to all squares
function addEventListenersToSquares() {
    document.querySelectorAll('.square').forEach(squareElement => {
        squareElement.addEventListener('click', handleSquareClick);
    });
}

// Updates the display showing whose turn it is
function updateTurnDisplay() {
    if (turnDisplayElement) {
        turnDisplayElement.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s Turn`;
    }
}

// --- Game Logic Functions ---

// Handles a click on any square of the board
function handleSquareClick(event) {
    const targetSquare = event.currentTarget;
    const row = parseInt(targetSquare.dataset.row);
    const col = parseInt(targetSquare.dataset.col);
    const clickedPiece = board[row][col];

    clearHighlights(); // Always clear previous highlights

    if (selectedPiece) {
        // A piece is already selected, so this click is an attempt to move
        const startRow = selectedPiece.row;
        const startCol = selectedPiece.col;

        if (tryMovePiece(startRow, startCol, row, col)) {
            // Move was successful, clear selection
            selectedPiece = null;
            selectedSquare = null;
        } else {
            // Move was illegal, or clicked on same piece, or clicked on opponent's piece
            // Clear selection OR re-select if clicked on own piece
            if (clickedPiece && clickedPiece.color === currentPlayer) {
                // Re-select this piece
                selectedPiece = clickedPiece;
                selectedSquare = targetSquare;
                highlightLegalMoves(selectedPiece);
            } else {
                // Clear selection if illegal move or clicked empty/opponent square
                selectedPiece = null;
                selectedSquare = null;
            }
        }
    } else {
        // No piece is selected, so this click is to select a piece
        if (clickedPiece && clickedPiece.color === currentPlayer) {
            selectedPiece = clickedPiece;
            selectedSquare = targetSquare;
            selectedSquare.classList.add('selected'); // Highlight selected square
            highlightLegalMoves(selectedPiece);
        } else {
            // Clicked on an empty square or opponent's piece when nothing selected
            console.log("No piece selected or not your piece.");
        }
    }
}

// Tries to move a piece from start to end coordinates
function tryMovePiece(startRow, startCol, endRow, endCol) {
    const pieceToMove = board[startRow][startCol];

    if (!pieceToMove || pieceToMove.color !== currentPlayer) {
        console.warn("Invalid move: No piece selected or not current player's piece.");
        return false;
    }

    if (startRow === endRow && startCol === endCol) {
        console.log("Clicked on the same square. Deselecting.");
        return false; // Not a move, just a re-click on the same square
    }

    // Get legal moves for this piece, filtered for self-check
    const trulyLegalMoves = getTrulyLegalMoves(pieceToMove, board);

    // Check if the target square is one of the truly legal moves
    const isLegalMove = trulyLegalMoves.some(move => move[0] === endRow && move[1] === endCol);

    if (isLegalMove) {
        // Perform the move on the board array
        const capturedPiece = board[endRow][endCol]; // Will be null if empty square

        // Update piece's internal position
        pieceToMove.row = endRow;
        pieceToMove.col = endCol;

        board[endRow][endCol] = pieceToMove;
        board[startRow][startCol] = null; // Clear the starting square

        // Handle pawn promotion (simplified to Queen for now)
        if (pieceToMove.type === 'pawn' && ((pieceToMove.color === 'white' && endRow === 0) || (pieceToMove.color === 'black' && endRow === 7))) {
            board[endRow][endCol] = new Queen(pieceToMove.color, endRow, endCol, pieceToMove.htmlElement);
            console.log(`${pieceToMove.color} pawn promoted to Queen!`);
        }

        // Mark King/Rook/Pawn as moved for castling/double-step logic
        if (pieceToMove.type === 'king' || pieceToMove.type === 'rook' || pieceToMove.type === 'pawn') {
            pieceToMove.hasMoved = true;
        }

        renderBoardUI(); // Update the visual board
        switchPlayer(); // Switch turns
        checkGameStatus(); // Check for check/checkmate/stalemate
        return true;
    } else {
        console.log("Illegal move.");
        return false;
    }
}

// Filters legal moves to ensure they don't leave the king in check
function getTrulyLegalMoves(piece, currentBoard) {
    const potentialMoves = piece.getLegalMoves(currentBoard);
    const trulyLegalMoves = [];

    potentialMoves.forEach(move => {
        const [targetRow, targetCol] = move;
        // Simulate the move on a temporary board
        const tempBoard = JSON.parse(JSON.stringify(currentBoard)); // Deep copy the board array (handle Piece objects carefully)

        // For simple objects, JSON.parse(JSON.stringify(obj)) works.
        // For actual Piece objects with methods, this needs a custom deep copy.
        // For V1, we'll assume it's good enough for checking positions.
        // A more robust solution would be to implement a deep copy function for Piece objects.
        const tempPiece = tempBoard[piece.row][piece.col]; // This will be a plain object after JSON.parse

        // Reconstruct Piece objects in tempBoard for getLegalMoves to work
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (tempBoard[r][c]) {
                    const { type, color, row, col, hasMoved } = tempBoard[r][c];
                    let reconstructedPiece;
                    switch (type) {
                        case 'pawn':
                            reconstructedPiece = new Pawn(color, row, col, null);
                            break;
                        case 'rook':
                            reconstructedPiece = new Rook(color, row, col, null);
                            break;
                        case 'knight':
                            reconstructedPiece = new Knight(color, row, col, null);
                            break;
                        case 'bishop':
                            reconstructedPiece = new Bishop(color, row, col, null);
                            break;
                        case 'queen':
                            reconstructedPiece = new Queen(color, row, col, null);
                            break;
                        case 'king':
                            reconstructedPiece = new King(color, row, col, null);
                            break;
                    }
                    reconstructedPiece.hasMoved = hasMoved; // Retain hasMoved state
                    tempBoard[r][c] = reconstructedPiece;
                }
            }
        }
        // Now get the actual piece object from the reconstructed tempBoard
        const simulatedPiece = tempBoard[piece.row][piece.col];


        // Perform the simulated move
        tempBoard[targetRow][targetCol] = simulatedPiece;
        tempBoard[piece.row][piece.col] = null;
        simulatedPiece.row = targetRow; // Update temp piece's position
        simulatedPiece.col = targetCol;


        if (!isKingInCheck(piece.color, tempBoard)) {
            trulyLegalMoves.push(move);
        }
    });

    return trulyLegalMoves;
}

// Highlights squares where the selected piece can move
function highlightLegalMoves(piece) {
    clearHighlights(); // Clear any existing highlights

    const legalMoves = getTrulyLegalMoves(piece, board); // Get moves that don't result in self-check

    legalMoves.forEach(move => {
        const [row, col] = move;
        const squareElement = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
        if (squareElement) {
            squareElement.classList.add('legal-move');
            if (board[row][col]) { // If it's a capture move
                squareElement.classList.add('capture-target');
            }
            legalMovesHighlights.push(squareElement);
        }
    });
}

// Clears all highlighted legal move squares and selected square
function clearHighlights() {
    legalMovesHighlights.forEach(square => {
        square.classList.remove('legal-move');
        square.classList.remove('capture-target');
    });
    legalMovesHighlights = []; // Reset the array

    if (selectedSquare) {
        selectedSquare.classList.remove('selected');
    }
}

// Switches the current player
function switchPlayer() {
    currentPlayer = (currentPlayer === 'white' ? 'black' : 'white');
    updateTurnDisplay();
}

// Finds the king's position for a given color on a given board
function findKingPosition(color, currentBoard) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = currentBoard[r][c];
            if (piece && piece.type === 'king' && piece.color === color) {
                return [r, c];
            }
        }
    }
    return null; // Should not happen in a valid game state
}

// Checks if the specified king (by color) is in check on the given board
function isKingInCheck(kingColor, currentBoard) {
    const kingPos = findKingPosition(kingColor, currentBoard);
    if (!kingPos) return false;

    const opponentColor = kingColor === 'white' ? 'black' : 'white';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = currentBoard[r][c];
            if (piece && piece.color === opponentColor) {
                // Get all "raw" moves for opponent's piece (without checking if it puts THEIR king in check)
                const opponentMoves = piece.getLegalMoves(currentBoard);
                if (opponentMoves.some(move => move[0] === kingPos[0] && move[1] === kingPos[1])) {
                    return true; // Opponent's piece can attack the king
                }
            }
        }
    }
    return false;
}

// Checks the overall game status (check, checkmate, stalemate)
function checkGameStatus() {
    const kingInCheck = isKingInCheck(currentPlayer, board);
    let hasLegalMoves = false;

    // Iterate through all current player's pieces to find if any legal move exists
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === currentPlayer) {
                const legalMovesForPiece = getTrulyLegalMoves(piece, board);
                if (legalMovesForPiece.length > 0) {
                    hasLegalMoves = true;
                    break; // Found at least one legal move
                }
            }
        }
        if (hasLegalMoves) break;
    }

    if (kingInCheck) {
        if (!hasLegalMoves) {
            console.log(`Checkmate! ${currentPlayer === 'white' ? 'Black' : 'White'} wins!`);
            alert(`Checkmate! ${currentPlayer === 'white' ? 'Black' : 'White'} wins!`);
            // TODO: Implement a proper game over state
        } else {
            console.log(`${currentPlayer} is in check!`);
            // You might want to add a visual indicator for check
        }
    } else {
        if (!hasLegalMoves) {
            console.log("Stalemate! It's a draw.");
            alert("Stalemate! It's a draw.");
            // TODO: Implement a proper game over state
        }
    }
}

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', initializeBoard);
