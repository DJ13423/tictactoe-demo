const client = new KometAPI.Client('localhost:8080');
let broadcast = null;
let currentRoom = null;
let isMyTurn = false;
let gameBoard = ['', '', '', '', '', '', '', '', ''];
let gameActive = false;
let justSentJoin = false;
let playerCountInterval = null;

const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
];

// Initialize room list
async function initializeRooms() {
    const roomsContainer = document.querySelector('.rooms');
    for (let i = 1; i <= 15; i++) {
        const roomDiv = document.createElement('div');
        roomDiv.className = 'room-item';
        const count = await getRoomCount(i);
        
        roomDiv.innerHTML = `
            <span>Room ${i} <span id="room${i}-count">${count}/2</span></span>
            <button class="join-button" ${count >= 2 ? 'disabled' : ''} onclick="joinRoom(${i})">Join</button>
        `;
        roomsContainer.appendChild(roomDiv);
    }

    // Set up periodic room count updates
    setInterval(updateRoomCounts, 5000);
}

async function getRoomCount(roomNumber) {
    const response = await fetch(`http://${client.url}/api/${client.version}/broadcast/tictactoe-room-${roomNumber}/count`);
    return await response.json();
}

async function joinRoom(roomNumber) {
    // Check player count before joining
    const count = await getRoomCount(roomNumber);
    if (count >= 2) {
        alert("Room is full!");
        return;
    }

    currentRoom = roomNumber;
    broadcast = client.Broadcast(`tictactoe-room-${roomNumber}`);
    
    // Show board immediately after joining
    document.getElementById('roomList').style.display = 'none';
    document.querySelector('.game-container').style.display = 'flex';
    document.getElementById('status').textContent = "Waiting for opponent...";
    
    broadcast.connect();
    
    broadcast.addEventListener('open', () => {
        justSentJoin = true;
        broadcast.send(JSON.stringify({ type: 'join' }));
        setTimeout(() => {
            justSentJoin = false;
        }, 100);

        // Set initial game state based on player count
        if (count === 0) {
            isMyTurn = true;
            gameActive = false; // Don't allow moves until second player joins
            document.getElementById('status').textContent = "Waiting for opponent to join...";
        } else {
            isMyTurn = false;
            gameActive = true;
            document.getElementById('status').textContent = "Opponent's turn (O)";
        }

        // Start checking player count
        startPlayerCountCheck(roomNumber);
    });
    
    broadcast.addEventListener('message', handleMessage);
    broadcast.addEventListener('close', (event) => handleMessage(event));
}

function handleMessage(event) {
    // If the websocket is closed, it means the other player left
    if (event.type === 'close') {
        if (gameActive) {
            showPopupAndReturnToMenu("Opponent left the game!");
        }
        return;
    }

    const message = JSON.parse(event.data);
    
    switch (message.type) {
        case 'join':
            if (justSentJoin) {
                return;
            }
            if (!gameActive) {
                isMyTurn = true;
                gameActive = true; // Now enable moves as second player has joined
                document.getElementById('status').textContent = "Your turn (X)";
            }
            break;
            
        case 'room_status':
            if (message.players === 1) {
                isMyTurn = true;
                gameActive = false; // Disable moves if only one player
                document.getElementById('status').textContent = "Waiting for opponent to join...";
            } else if (message.players === 2) {
                gameActive = true; // Enable moves when two players
                document.getElementById('roomList').style.display = 'none';
                document.querySelector('.game-container').style.display = 'flex';
                if (isMyTurn) {
                    document.getElementById('status').textContent = "Your turn (X)";
                } else {
                    document.getElementById('status').textContent = "Opponent's turn (O)";
                }
            }
            break;
            
        case 'move':
            handleOpponentMove(message.index);
            break;

        // case 'game_over':
        //     gameActive = false;
        //     setTimeout(() => {
        //         let resultMessage;
        //         if (message.result === 'X_wins') {
        //             resultMessage = isMyTurn ? "Opponent wins!" : "You win!";
        //         } else if (message.result === 'O_wins') {
        //             resultMessage = isMyTurn ? "You win!" : "Opponent wins!";
        //         } else {
        //             resultMessage = "It's a draw!";
        //         }
        //         showPopupAndReturnToMenu(resultMessage);
        //         // Disconnect after showing the result
        //         if (broadcast) {
        //             broadcast.disconnect();
        //             broadcast = null;
        //         }
        //     }, 500);
        //     break;
    }
}

document.querySelectorAll('.cell').forEach(cell => {
    cell.addEventListener('click', () => handleCellClick(cell));
});

function handleCellClick(cell) {
    const index = cell.getAttribute('data-index');

    // Only allow moves if it's the player's turn AND game is active AND there are 2 players
    if (gameBoard[index] === '' && 
        gameActive && 
        isMyTurn) {
        makeMove(index, 'X');
        broadcast.send(JSON.stringify({
            type: 'move',
            index: index
        }));
    }
}

function handleOpponentMove(index) {
    if (gameBoard[index] === '' && gameActive) {
        gameBoard[index] = 'O';
        document.querySelector(`[data-index="${index}"]`).textContent = 'O';
        
        if (checkWin()) {
            gameActive = false;
            setTimeout(() => {
                showPopupAndReturnToMenu("You lost!");
                if (broadcast) {
                    broadcast.disconnect();
                    broadcast = null;
                }
            }, 500);
        } else if (checkDraw()) {
            gameActive = false;
            setTimeout(() => {
                showPopupAndReturnToMenu("It's a draw!");
                if (broadcast) {
                    broadcast.disconnect();
                    broadcast = null;
                }
            }, 500);
        } else {
            isMyTurn = !isMyTurn;
            document.getElementById('status').textContent = "Your turn (X)";
        }
    }
}

function makeMove(index, symbol) {
    gameBoard[index] = symbol;
    document.querySelector(`[data-index="${index}"]`).textContent = symbol;
    
    if (symbol === 'X' && checkWin()) {
        console.log("I won!")
        gameActive = false;
        setTimeout(() => {
            showPopupAndReturnToMenu("You win!");
            // Disconnect immediately after win
            if (broadcast) {
                broadcast.disconnect();
                broadcast = null;
            }
        }, 500);
    } else if (checkDraw()) {
        gameActive = false;
        setTimeout(() => {
            showPopupAndReturnToMenu("It's a draw!");
            // Disconnect immediately after draw
            if (broadcast) {
                broadcast.disconnect();
                broadcast = null;
            }
        }, 500);
    } else {
        isMyTurn = !isMyTurn;
        document.getElementById('status').textContent = 
            isMyTurn ? "Your turn (X)" : "Opponent's turn (O)";
    }
}

function checkWin() {
    return winningCombinations.some(combination => {
        return combination.every(index => {
            return gameBoard[index] === gameBoard[combination[0]] && gameBoard[index] !== '';
        });
    });
}

function checkDraw() {
    return gameBoard.every(cell => cell !== '');
}

function showPopupAndReturnToMenu(message) {
    // Clear the player count check interval
    if (playerCountInterval) {
        clearInterval(playerCountInterval);
        playerCountInterval = null;
    }
    
    alert(message);
    // Reset game state
    gameBoard = ['', '', '', '', '', '', '', '', ''];
    gameActive = false;
    isMyTurn = false;
    
    // Disconnect from current room
    if (broadcast) {
        broadcast.disconnect();
        broadcast = null;
    }
    
    // Clear the board
    document.querySelectorAll('.cell').forEach(cell => {
        cell.textContent = '';
    });
    
    // Show room list and hide game board
    document.getElementById('roomList').style.display = 'block';
    document.querySelector('.game-container').style.display = 'none';
}

// Add function to update room counts periodically
async function updateRoomCounts() {
    for (let i = 1; i <= 15; i++) {
        const count = await getRoomCount(i);
        const countElement = document.getElementById(`room${i}-count`);
        const joinButton = countElement.parentElement.parentElement.querySelector('.join-button');
        
        countElement.textContent = `${count}/2`;
        joinButton.disabled = count >= 2;
    }
}

// Add this function to check player count while in room
async function startPlayerCountCheck(roomNumber) {
    // Clear any existing interval
    if (playerCountInterval) {
        clearInterval(playerCountInterval);
    }
    
    playerCountInterval = setInterval(async () => {
        const count = await getRoomCount(roomNumber);
        if (count < 2 && gameActive) {
            showPopupAndReturnToMenu("Opponent left the game!");
            clearInterval(playerCountInterval);
        }
    }, 1000); // Check every second
}

// Initialize rooms when page loads
initializeRooms();

// Add event listener for leave button
document.getElementById('leaveButton').addEventListener('click', () => {
    showPopupAndReturnToMenu("You left the game");
});
