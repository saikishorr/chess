document.addEventListener('DOMContentLoaded', () => {
    const chessboard = document.getElementById('chessboard');
    const boardSize = 8;
    let selectedPiece = null;

    // Chess piece representations (using Unicode symbols for simplicity)
    const pieces = {
        'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
        'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
    };

    // Initial board setup (FEN-like string for simplicity, only for starting position)
    // R = Rook, N = Knight, B = Bishop, Q = Queen, K = King, P = Pawn
    // Uppercase for White, Lowercase for Black
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
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.dataset.row = row;
                square.dataset.col = col;

                // Determine square color
                const isLight = (row + col) % 2 === 0;
                square.classList.add(isLight ? 'light' : 'dark');

                // Place pieces
                const pieceChar = initialBoard[row][col];
                if (pieceChar) {
                    const pieceElement = document.createElement('span');
                    pieceElement.classList.add('piece');
                    pieceElement.textContent = pieces[pieceChar];
                    pieceElement.dataset.piece = pieceChar; // Store piece type
                    pieceElement.dataset.originalRow = row; // Store original position
                    pieceElement.dataset.originalCol = col;
                    // Determine piece color based on case
                    if (pieceChar === pieceChar.toUpperCase()) {
                        pieceElement.classList.add('white');
                    } else {
                        pieceElement.classList.add('black');
                    }
                    pieceElement.setAttribute('draggable', true); // Make pieces draggable
                    square.appendChild(pieceElement);
                }

                chessboard.appendChild(square);
            }
        }
    }

    createBoard();

    // Drag and Drop Logic
    chessboard.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('piece')) {
            selectedPiece = e.target;
            // Store the ID of the dragged element (or its text content/data attributes)
            // e.dataTransfer.setData('text/plain', selectedPiece.dataset.piece); // Example of setting data
            e.target.classList.add('dragging');
            setTimeout(() => {
                // Hides the original piece while dragging, better for visual effect
                selectedPiece.style.opacity = '0';
            }, 0);
        }
    });

    chessboard.addEventListener('dragover', (e) => {
        e.preventDefault(); // Allow dropping
    });

    chessboard.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (e.target.classList.contains('square')) {
            // Optional: Add a visual cue to the square being hovered over
            // e.target.style.border = '2px dashed blue';
        }
    });

    chessboard.addEventListener('dragleave', (e) => {
        if (e.target.classList.contains('square')) {
            // Optional: Remove the visual cue
            // e.target.style.border = '';
        }
    });

    chessboard.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!selectedPiece) return;

        let targetSquare = e.target.closest('.square'); // Get the square element

        if (targetSquare) {
            // Basic validation: Check if dropping on a valid square
            const targetRow = parseInt(targetSquare.dataset.row);
            const targetCol = parseInt(targetSquare.dataset.col);

            // Here's where you would add your complex chess move validation:
            // 1. Is the move legal for the 'selectedPiece' type? (e.g., pawn forward, knight L-shape)
            // 2. Is the path blocked by other pieces?
            // 3. Is it your turn?
            // 4. Does the move put your own king in check?
            // 5. Is it a capture? If so, remove the captured piece.

            // For now, just move the piece if it's a valid square
            if (!targetSquare.hasChildNodes()) { // Only move if the target square is empty
                targetSquare.appendChild(selectedPiece);
            } else if (targetSquare.children[0].classList.contains('piece')) {
                // Simple capture logic: replace the existing piece
                // In a real game, you'd check if it's an opponent's piece and validate the capture.
                const existingPiece = targetSquare.children[0];
                if (existingPiece !== selectedPiece && existingPiece.classList[1] !== selectedPiece.classList[1]) { // If it's an opponent's piece
                    targetSquare.removeChild(existingPiece);
                    targetSquare.appendChild(selectedPiece);
                } else {
                    // Cannot drop on own piece
                    console.log("Cannot drop on your own piece.");
                    // Move the piece back to its original position
                    const originalSquare = document.querySelector(`[data-row="${selectedPiece.dataset.originalRow}"][data-col="${selectedPiece.dataset.originalCol}"]`);
                    originalSquare.appendChild(selectedPiece);
                }
            }
        }

        // Reset state after drop
        selectedPiece.style.opacity = '1'; // Make the piece visible again
        selectedPiece.classList.remove('dragging');
        selectedPiece = null;
    });

    chessboard.addEventListener('dragend', (e) => {
        // Ensure piece is visible and dragging class is removed even if not dropped on a valid target
        if (selectedPiece) {
            selectedPiece.style.opacity = '1';
            selectedPiece.classList.remove('dragging');
        }
        selectedPiece = null;
    });
});
