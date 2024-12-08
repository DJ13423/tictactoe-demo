const client = new KometAPI.Client('localhost:8080');
let broadcast = null;
let currentRoom = null;
let isMyTurn = false;
let gameBoard = ['', '', '', '', '', '', '', '', ''];
let gameActive = false;
let justSentJoin = false;

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
            document.getElementById('status').textContent = "Waiting for opponent...";
        } else {
            isMyTurn = false;
            gameActive = true;
            document.getElementById('status').textContent = "Opponent's turn (O)";
        }
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
                gameActive = true;
                document.getElementById('roomList').style.display = 'none';
                document.querySelector('.game-container').style.display = 'flex';
                document.getElementById('status').textContent = "Your turn (X)";
            }
            break;
            
        case 'room_status':
            if (message.players === 1) {
                isMyTurn = true;
                document.getElementById('status').textContent = "Waiting for opponent...";
                gameActive = false;
            } else if (message.players === 2) {
                gameActive = true;
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
    }
}

document.querySelectorAll('.cell').forEach(cell => {
    cell.addEventListener('click', () => handleCellClick(cell));
});

function handleCellClick(cell) {
    const index = cell.getAttribute('data-index');

    if (gameBoard[index] === '' && gameActive && isMyTurn) {
        makeMove(index, 'X');
        broadcast.send(JSON.stringify({
            type: 'move',
            index: index
        }));
    }
}

function handleOpponentMove(index) {
    if (gameBoard[index] === '' && gameActive) {
        makeMove(index, 'O');
    }
}

function makeMove(index, symbol) {
    gameBoard[index] = symbol;
    document.querySelector(`[data-index="${index}"]`).textContent = symbol;
    
    if (checkWin()) {
        gameActive = false;
        setTimeout(() => {
            showPopupAndReturnToMenu(symbol === 'X' ? "You win!" : "Opponent wins!");
        }, 500);
    } else if (checkDraw()) {
        gameActive = false;
        setTimeout(() => {
            showPopupAndReturnToMenu("It's a draw!");
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

// Initialize rooms when page loads
initializeRooms();
