const client = new KometAPI.Client('localhost:8080');
const broadcast = client.Broadcast('tictactoe-room');
let playerSymbol = null;
let currentPlayer = 'X';
let gameBoard = ['', '', '', '', '', '', '', '', ''];
let gameActive = true;

const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
];

// Connect to the broadcast room
broadcast.connect();

// Handle player assignment
broadcast.addEventListener('open', () => {
    // Request player assignment
    broadcast.send(JSON.stringify({ type: 'join' }));
});

broadcast.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
        case 'player_assign':
            playerSymbol = message.symbol;
            document.getElementById('status').textContent = 
                playerSymbol === 'X' ? "You are X - Your turn!" : "You are O - Waiting for X";
            break;
            
        case 'move':
            handleOpponentMove(message.index);
            break;
            
        case 'game_reset':
            resetGame();
            break;
    }
});

document.querySelectorAll('.cell').forEach(cell => {
    cell.addEventListener('click', () => handleCellClick(cell));
});

function handleCellClick(cell) {
    const index = cell.getAttribute('data-index');

    // Only allow moves if it's the player's turn
    if (gameBoard[index] === '' && 
        gameActive && 
        currentPlayer === playerSymbol) {
        
        makeMove(index);
        
        // Send move to opponent
        broadcast.send(JSON.stringify({
            type: 'move',
            index: index
        }));
    }
}

function handleOpponentMove(index) {
    if (gameBoard[index] === '' && gameActive) {
        makeMove(index);
    }
}

function makeMove(index) {
    gameBoard[index] = currentPlayer;
    document.querySelector(`[data-index="${index}"]`).textContent = currentPlayer;
    
    if (checkWin()) {
        document.getElementById('status').textContent = 
            currentPlayer === playerSymbol ? "You win!" : "Opponent wins!";
        gameActive = false;
    } else if (checkDraw()) {
        document.getElementById('status').textContent = "It's a draw!";
        gameActive = false;
    } else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        if (currentPlayer === playerSymbol) {
            document.getElementById('status').textContent = "Your turn!";
        } else {
            document.getElementById('status').textContent = "Opponent's turn";
        }
    }
}

function checkWin() {
    return winningCombinations.some(combination => {
        return combination.every(index => {
            return gameBoard[index] === currentPlayer;
        });
    });
}

function checkDraw() {
    return gameBoard.every(cell => cell !== '');
}

function resetGame() {
    currentPlayer = 'X';
    gameBoard = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    
    document.querySelectorAll('.cell').forEach(cell => {
        cell.textContent = '';
    });
    
    document.getElementById('status').textContent = 
        playerSymbol === 'X' ? "You are X - Your turn!" : "You are O - Waiting for X";
        
    broadcast.send(JSON.stringify({ type: 'game_reset' }));
}
