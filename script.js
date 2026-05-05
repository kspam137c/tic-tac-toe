const firebaseConfig = {
    apiKey: "AIzaSyCh9UWnYouHH2KtZHY270J5L84sptpQvIc",
    authDomain: "tictactoe-multiplayer-6f0e1.firebaseapp.com",
    databaseURL: "https://tictactoe-multiplayer-6f0e1-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tictactoe-multiplayer-6f0e1",
    storageBucket: "tictactoe-multiplayer-6f0e1.firebasestorage.app",
    messagingSenderId: "117134904101",
    appId: "1:117134904101:web:2bb2f9805f344d5e21e8cc"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let board = ["", "", "", "", "", "", "", "", ""];
let isGameActive = false;
let gameMode = ""; 
let myRole = "";   
let currentRoom = "";
let currentTurn = "X";
let currentStarter = "X"; 
let myName = "";
let friendName = "Friend";
let hostScore = 0;
let guestScore = 0;
let currentScreen = "menu"; 
let isIntentionallyLeaving = false;

window.onload = function() {
    const playerNameInput = document.getElementById('player-name');
    const playBotBtn = document.getElementById('play-bot');
    const createRoomBtn = document.getElementById('create-room');
    const joinRoomBtn = document.getElementById('join-room');
    const roomCodeInput = document.getElementById('room-code');
    const menuScreen = document.getElementById('menu-screen');
    const setupBox = document.getElementById('setup-box');
    const standardMenu = document.getElementById('standard-menu');
    const inviteMenu = document.getElementById('invite-menu');
    const inviteJoinBtn = document.getElementById('invite-join-btn');
    const inviteCancelBtn = document.getElementById('invite-cancel-btn');
    const lobbyBox = document.getElementById('lobby-box');
    const lobbyRoomId = document.getElementById('lobby-room-id');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const cancelLobbyBtn = document.getElementById('cancel-lobby-btn');
    const gameScreen = document.getElementById('game-screen');
    const cells = document.querySelectorAll('.cell');
    const statusText = document.getElementById('status-text');
    const scoreboardText = document.getElementById('scoreboard');
    const quitBtn = document.getElementById('quit-btn');
    const resultModal = document.getElementById('result-modal');
    const resultMessage = document.getElementById('result-message');
    const playAgainBtn = document.getElementById('play-again-btn');
    const acceptRematchBtn = document.getElementById('accept-rematch-btn');
    const rematchStatus = document.getElementById('rematch-status');
    const modalQuitBtn = document.getElementById('modal-quit-btn');
    const globalRematchModal = document.getElementById('global-rematch-modal');
    const globalAcceptBtn = document.getElementById('global-accept-btn');
    const globalDeclineBtn = document.getElementById('global-decline-btn');
    const notificationModal = document.getElementById('notification-modal');
    const notificationMessage = document.getElementById('notification-message');
    const notificationDetail = document.getElementById('notification-detail');
    const notificationCloseBtn = document.getElementById('notification-close-btn');

    function openNotificationModal(title, detail, color) {
        if (isIntentionallyLeaving) return;
        notificationMessage.innerText = title;
        notificationMessage.style.color = color || "#f8fafc";
        notificationDetail.innerText = detail;
        notificationModal.classList.remove('hidden');
    }

    function localQuitToMenu() {
        gameScreen.classList.add('hidden');
        lobbyBox.classList.add('hidden');
        setupBox.classList.remove('hidden');
        menuScreen.classList.remove('hidden');
        resultModal.classList.add('hidden');
        globalRematchModal.classList.add('hidden');
        notificationModal.classList.add('hidden');
        isGameActive = false;
        currentScreen = "menu";
        window.history.pushState({}, document.title, window.location.pathname);
        standardMenu.classList.remove('hidden');
        inviteMenu.classList.add('hidden');
    }

    function notifyAndLeave() {
        if (gameMode === "multiplayer" && currentRoom) {
            isIntentionallyLeaving = true;
            db.ref('rooms/' + currentRoom).update({ userLeft: myRole });
            setTimeout(() => {
                db.ref('rooms/' + currentRoom).remove();
                db.ref('rooms/' + currentRoom).off();
                currentRoom = "";
                localQuitToMenu();
            }, 500);
        } else { localQuitToMenu(); }
    }

    function updateScoreboard() {
        let xName = gameMode === "bot" ? myName : (myRole === "X" ? myName : friendName);
        let oName = gameMode === "bot" ? "Bot" : (myRole === "O" ? myName : friendName);
        scoreboardText.innerText = `${xName} (X): ${hostScore}  |  ${oName} (O): ${guestScore}`;
    }

    playBotBtn.onclick = () => {
        myName = playerNameInput.value.trim();
        if (!myName) return openNotificationModal("Error", "Enter your name!", "#ef4444");
        gameMode = "bot"; myRole = "X"; friendName = "Bot"; hostScore = 0; guestScore = 0;
        setupBox.classList.add('hidden'); menuScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden'); currentScreen = "game";
        startLocalGame();
    };

    createRoomBtn.onclick = () => {
        myName = playerNameInput.value.trim();
        if (!myName) return openNotificationModal("Error", "Enter your name!", "#ef4444");
        isIntentionallyLeaving = false;
        gameMode = "multiplayer"; myRole = "X";
        currentRoom = Math.floor(1000 + Math.random() * 9000).toString();
        db.ref('rooms/' + currentRoom).set({
            board: ["", "", "", "", "", "", "", "", ""],
            turn: "X", startingPlayer: "X", hostName: myName, guestName: "",
            hostScore: 0, guestScore: 0, rematchRequest: "", players: 1
        });
        db.ref('rooms/' + currentRoom).onDisconnect().remove();
        setupBox.classList.add('hidden'); lobbyBox.classList.remove('hidden');
        lobbyRoomId.innerText = currentRoom;
        setupMultiplayerListener();
    };

    joinRoomBtn.onclick = () => {
        myName = playerNameInput.value.trim();
        if (!myName) return openNotificationModal("Error", "Enter your name!", "#ef4444");
        isIntentionallyLeaving = false;
        const code = roomCodeInput.value.trim();
        db.ref('rooms/' + code).once('value').then((snapshot) => {
            if (snapshot.exists() && snapshot.val().players === 1) {
                gameMode = "multiplayer"; myRole = "O"; currentRoom = code;
                db.ref('rooms/' + currentRoom).update({ guestName: myName, players: 2 });
                setupMultiplayerListener();
            } else { openNotificationModal("Error", "Room not found."); }
        });
    };

    inviteJoinBtn.onclick = () => joinRoomBtn.onclick();
    inviteCancelBtn.onclick = localQuitToMenu;
    cancelLobbyBtn.onclick = notifyAndLeave;
    quitBtn.onclick = notifyAndLeave;
    modalQuitBtn.onclick = notifyAndLeave;
    globalDeclineBtn.onclick = notifyAndLeave;
    notificationCloseBtn.onclick = localQuitToMenu;

    playAgainBtn.onclick = () => {
        if (gameMode === "bot") {
            resultModal.classList.add('hidden');
            startLocalGame();
        } else {
            console.log("Requesting Rematch...");
            db.ref('rooms/' + currentRoom).update({ rematchRequest: myRole });
        }
    };

    globalAcceptBtn.onclick = acceptRematch;
    acceptRematchBtn.onclick = acceptRematch;

    function acceptRematch() {
        console.log("Accepting Rematch...");
        let nextStarter = currentStarter === "X" ? "O" : "X";
        db.ref('rooms/' + currentRoom).update({
            rematchRequest: "ACCEPTED",
            board: ["", "", "", "", "", "", "", "", ""],
            turn: nextStarter, startingPlayer: nextStarter
        });
    }

    function setupMultiplayerListener() {
        console.log("Listening to room: " + currentRoom);
        db.ref('rooms/' + currentRoom).on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            if (data.userLeft && data.userLeft !== myRole) {
                openNotificationModal("Game Over", friendName + " left.", "#ef4444");
                return;
            }

            friendName = myRole === "X" ? data.guestName : data.hostName;
            currentStarter = data.startingPlayer || "X";
            hostScore = data.hostScore || 0; guestScore = data.guestScore || 0;

            if (data.players === 2 && currentScreen === "menu") {
                menuScreen.classList.add('hidden'); lobbyBox.classList.add('hidden');
                gameScreen.classList.remove('hidden'); currentScreen = "game";
            }
            updateScoreboard();

            // --- REMATCH LOGIC ---
            const otherRole = myRole === "X" ? "O" : "X";
            
            if (data.rematchRequest === "ACCEPTED") {
                console.log("Rematch Accepted by both.");
                resultModal.classList.add('hidden');
                globalRematchModal.classList.add('hidden');
                if (currentScreen === "menu") {
                    menuScreen.classList.add('hidden'); gameScreen.classList.remove('hidden'); currentScreen = "game";
                }
                if (myRole === "X") db.ref('rooms/' + currentRoom).update({ rematchRequest: "" });
            } else if (data.rematchRequest === otherRole) {
                console.log("Friend requested rematch.");
                if (currentScreen === "menu") {
                    globalRematchModal.classList.remove('hidden');
                } else {
                    rematchStatus.innerText = friendName + " wants a rematch!";
                    rematchStatus.classList.remove('hidden');
                    acceptRematchBtn.classList.remove('hidden');
                    playAgainBtn.classList.add('hidden');
                }
            } else if (data.rematchRequest === myRole) {
                playAgainBtn.innerText = "Pending...";
                playAgainBtn.disabled = true;
            } else {
                playAgainBtn.innerText = "Ask for Rematch";
                playAgainBtn.disabled = false;
                playAgainBtn.style.opacity = "1";
            }

            board = data.board;
            currentTurn = data.turn;
            cells.forEach((cell, index) => {
                cell.innerText = board[index];
                cell.style.color = board[index] === "X" ? "#3b82f6" : "#10b981";
            });

            if (data.players === 2) {
                isGameActive = true;
                statusText.innerText = (currentTurn === myRole) ? "Your Turn!" : friendName + " is thinking...";
                checkMultiplayerWinner();
            }
        });
    }

    cells.forEach(cell => cell.onclick = function() {
        const index = this.getAttribute('data-index');
        if (board[index] !== "" || !isGameActive || currentTurn !== myRole) return;
        if (gameMode === "bot") {
            updateCell(this, index, "X", "#3b82f6");
            if (!checkWinnerLocal()) { currentTurn = "O"; setTimeout(botMove, 500); }
        } else {
            let newBoard = [...board]; newBoard[index] = myRole;
            db.ref('rooms/' + currentRoom).update({ board: newBoard, turn: myRole === "X" ? "O" : "X" });
        }
    });

    function updateCell(cell, index, player, color) { board[index] = player; cell.innerText = player; cell.style.color = color; }

    function startLocalGame() {
        board = ["", "", "", "", "", "", "", "", ""]; isGameActive = true; 
        currentTurn = "X"; cells.forEach(cell => cell.innerText = "");
        resultModal.classList.add('hidden'); updateScoreboard();
    }

    function checkMultiplayerWinner() {
        const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        let winner = "";
        for (let combo of wins) {
            const [a,b,c] = combo;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) { winner = board[a]; break; }
        }
        if (winner || !board.includes("")) {
            isGameActive = false;
            if (winner) {
                if (winner === myRole) {
                    resultMessage.innerText = "You Win! 🎉";
                    if (myRole === "X") db.ref('rooms/' + currentRoom).update({ hostScore: hostScore + 1 });
                    else db.ref('rooms/' + currentRoom).update({ guestScore: guestScore + 1 });
                } else resultMessage.innerText = "You Lose! 😢";
            } else resultMessage.innerText = "Draw! 🤝";
            
            playAgainBtn.classList.remove('hidden');
            acceptRematchBtn.classList.add('hidden');
            rematchStatus.classList.add('hidden');
            setTimeout(() => resultModal.classList.remove('hidden'), 300);
        }
    }

    function checkWinnerLocal() {
        const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (let combo of wins) {
            const [a,b,c] = combo;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                if (board[a] === "X") hostScore++; else guestScore++;
                updateScoreboard(); endGameLocal(board[a] === "X" ? "Win!" : "Lose!"); return true;
            }
        }
        if (!board.includes("")) { endGameLocal("Draw!"); return true; }
        return false;
    }

    function endGameLocal(msg) { isGameActive = false; resultMessage.innerText = msg; resultModal.classList.remove('hidden'); }
};