function updateButtonVisibility(gameActive) {
    const startBtn = document.getElementById('startGameBtn');
    const nextTurnBtn = document.getElementById('nextTurnBtn');
    const autoplayBtn = document.getElementById('autoplayBtn');
    
    if (gameActive) {
        startBtn.style.display = 'none';
        nextTurnBtn.style.display = 'inline-block';
        autoplayBtn.style.display = 'inline-block';
    } else {
        startBtn.style.display = 'inline-block';
        nextTurnBtn.style.display = 'none';
        autoplayBtn.style.display = 'none';
    }
}

function validateDecks(p1DeckObj, p2DeckObj) {
    const errors = [];
    
    if (p1DeckObj.cards.length !== GAME_CONSTANTS.DECK_SIZE) {
        errors.push(`${TEAM_NAMES.PLAYER1}: Has ${p1DeckObj.cards.length} cards (needs exactly ${GAME_CONSTANTS.DECK_SIZE})`);
    }
    
    if (p2DeckObj.cards.length !== GAME_CONSTANTS.DECK_SIZE) {
        errors.push(`${TEAM_NAMES.PLAYER2}: Has ${p2DeckObj.cards.length} cards (needs exactly ${GAME_CONSTANTS.DECK_SIZE})`);
    }
    
    const p1InvalidCards = p1DeckObj.cards.filter(cardType => !CARD_TYPES[cardType]);
    if (p1InvalidCards.length > 0) {
        const uniqueInvalid = [...new Set(p1InvalidCards)];
        errors.push(`${TEAM_NAMES.PLAYER1}: Invalid character(s): ${uniqueInvalid.join(', ')}`);
    }
    
    const p2InvalidCards = p2DeckObj.cards.filter(cardType => !CARD_TYPES[cardType]);
    if (p2InvalidCards.length > 0) {
        const uniqueInvalid = [...new Set(p2InvalidCards)];
        errors.push(`${TEAM_NAMES.PLAYER2}: Invalid character(s): ${uniqueInvalid.join(', ')}`);
    }
    
    // Validate deck types
    if (!VALID_DECK_TYPES.includes(p1DeckObj.type)) {
        errors.push(`${TEAM_NAMES.PLAYER1}: Invalid or missing deck type '${p1DeckObj.type}' (must be 'speedy', 'hardy', or 'angry')`);
    }
    if (!VALID_DECK_TYPES.includes(p2DeckObj.type)) {
        errors.push(`${TEAM_NAMES.PLAYER2}: Invalid or missing deck type '${p2DeckObj.type}' (must be 'speedy', 'hardy', or 'angry')`);
    }
    
    // Validate target strategies
    if (!VALID_TARGET_STRATEGIES.includes(p1DeckObj.targetStrategy)) {
        errors.push(`${TEAM_NAMES.PLAYER1}: Invalid or missing target strategy '${p1DeckObj.targetStrategy}' (must be 'target-mana', 'kill-shot', or 'optimize-damage')`);
    }
    if (!VALID_TARGET_STRATEGIES.includes(p2DeckObj.targetStrategy)) {
        errors.push(`${TEAM_NAMES.PLAYER2}: Invalid or missing target strategy '${p2DeckObj.targetStrategy}' (must be 'target-mana', 'kill-shot', or 'optimize-damage')`);
    }
    
    return errors;
}

async function showValidationModal(p1Deck, p2Deck, errors) {
    return new Promise((resolve) => {
        sfx.play('cardShuffle', { duration: 1200, startTime: 0.2 });
        const overlay = document.createElement('div');
        overlay.className = 'validation-overlay';
        
        const container = document.createElement('div');
        container.className = 'validation-container';
        
        const title = document.createElement('div');
        title.className = 'validation-title';
        title.textContent = 'Validating Decks';
        
        const scrollArea = document.createElement('div');
        scrollArea.className = 'card-scroll-area';
        
        const leftScroll = document.createElement('div');
        leftScroll.className = 'card-scroll left';
        
        const rightScroll = document.createElement('div');
        rightScroll.className = 'card-scroll right';
        
        p1Deck.forEach((cardType, index) => {
            const stats = CARD_TYPES[cardType];
            const imageName = cardType.toLowerCase().replace(/\s+/g, '');
            const card = document.createElement('div');
            card.className = 'scroll-card';
            if (!stats) {
                card.classList.add('invalid-card');
                card.innerHTML = `
                    <div class="scroll-card-mana">?</div>
                    <div style="color: #ff6b6b; font-weight: bold;">⚠️ ${cardType}</div>
                `;
            } else {
                card.innerHTML = `
                    <div class="scroll-card-mana">${stats.cost}</div>
                    <img src="images/${imageName}.png" alt="${cardType}" class="scroll-card-icon" onerror="this.style.display='none'">
                    <div>${cardType}</div>
                `;
            }
            card.style.animationDelay = `${index * 0.05}s`;
            leftScroll.appendChild(card);
        });
        
        p2Deck.forEach((cardType, index) => {
            const stats = CARD_TYPES[cardType];
            const imageName = cardType.toLowerCase().replace(/\s+/g, '');
            const card = document.createElement('div');
            card.className = 'scroll-card';
            if (!stats) {
                card.classList.add('invalid-card');
                card.innerHTML = `
                    <div class="scroll-card-mana">?</div>
                    <div style="color: #ff6b6b; font-weight: bold;">⚠️ ${cardType}</div>
                `;
            } else {
                card.innerHTML = `
                    <div class="scroll-card-mana">${stats.cost}</div>
                    <img src="images/${imageName}.png" alt="${cardType}" class="scroll-card-icon" onerror="this.style.display='none'">
                    <div>${cardType}</div>
                `;
            }
            card.style.animationDelay = `${index * 0.05}s`;
            rightScroll.appendChild(card);
        });
        
        scrollArea.appendChild(leftScroll);
        scrollArea.appendChild(rightScroll);
        
        container.appendChild(title);
        container.appendChild(scrollArea);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
        
        setTimeout(() => overlay.classList.add('active'), 10);
        
        setTimeout(() => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'validation-result';
            
            if (errors.length > 0) {
                resultDiv.innerHTML = `
                    <div class="result-icon error">⚠️</div>
                    <div class="result-title error">INVALID DECKS</div>
                    <div class="result-message">${errors.join('<br>')}</div>
                    <button class="btn-result" onclick="document.querySelector('.validation-overlay').remove(); turnInProgress = false;">Close</button>
                `;
            } else {
                resultDiv.innerHTML = `
                    <div class="result-icon success"><img src="images/swords.png" alt="Battle" class="result-icon-img"></div>
                    <div class="result-title success">GAME ON</div>
                    <div class="result-message">All decks are valid</div>
                `;
                sfx.play('unsheath', {volume: 0.3});
            }
            
            container.innerHTML = '';
            container.appendChild(resultDiv);
            
            if (errors.length === 0) {
                setTimeout(() => {
                    overlay.classList.add('closing');
                    setTimeout(() => {
                        overlay.remove();
                        resolve(true);
                    }, 300);
                }, 1500);
            }
        }, 1500);
    });
}

async function startGame() {
    // Stop any existing music before starting a new game
    sfx.stopMusic();
    
    globalCardId = 0;
    turnInProgress = true;
    autoplayActive = false;
    fastAutoMode = false;
    
    const p1DeckObj = createPlayer1Deck();
    const p2DeckObj = createPlayer2Deck();
    
    const errors = validateDecks(p1DeckObj, p2DeckObj);
    
    await showValidationModal(p1DeckObj.cards, p2DeckObj.cards, errors);
    
    if (errors.length > 0) {
        turnInProgress = false;
        return;
    }
    
    game = new Game(p1DeckObj, p2DeckObj, Date.now());
    
    updateButtonVisibility(true);
    
    // Start music for the new game
    sfx.playMusic();
    
    await game.firstTurn();
    
    turnInProgress = false;
}

async function nextTurn() {
    if (!game) {
        alert("Please start a game first!");
        return;
    }
    
    if (game.winner) {
        alert("Game is over! Start a new game.");
        return;
    }
    
    if (turnInProgress) {
        return;
    }
    
    if (game.checkWinCondition()) return;
    
    turnInProgress = true;
    const nextTurnBtn = document.getElementById('nextTurnBtn');
    const autoplayBtn = document.getElementById('autoplayBtn');
    nextTurnBtn.disabled = true;
    autoplayBtn.disabled = true;
    
    await game.playTurn();
    
    if (!game) {
        turnInProgress = false;
        return;
    }
    
    game.checkWinCondition();
    
    turnInProgress = false;
    nextTurnBtn.disabled = false;
    autoplayBtn.disabled = false;
}

async function toggleAutoplay() {
    if (!autoplayActive) {
        startAutoplay(false);
    } else if (!fastAutoMode) {
        startAutoplay(true);
    } else {
        stopAutoplay();
    }
}

function startAutoplay(fast = false) {
    autoplayActive = true;
    fastAutoMode = fast;
    const autoplayBtn = document.getElementById('autoplayBtn');
    const nextTurnBtn = document.getElementById('nextTurnBtn');
    
    if (fast) {
        autoplayBtn.textContent = 'Fast Auto';
        document.body.classList.add('fast-auto-mode');
    } else {
        autoplayBtn.textContent = 'Stop Auto';
        document.body.classList.remove('fast-auto-mode');
    }
    autoplayBtn.classList.remove('btn-primary');
    autoplayBtn.classList.add('btn-danger');
    nextTurnBtn.disabled = true;
    
    if (!fast) {
        runAutoplay();
    }
}

function stopAutoplay() {
    autoplayActive = false;
    fastAutoMode = false;
    document.body.classList.remove('fast-auto-mode');
    const autoplayBtn = document.getElementById('autoplayBtn');
    const nextTurnBtn = document.getElementById('nextTurnBtn');
    
    autoplayBtn.textContent = 'Auto Play';
    autoplayBtn.classList.remove('btn-danger');
    autoplayBtn.classList.add('btn-primary');
    nextTurnBtn.disabled = false;
}

async function runAutoplay() {
    while (autoplayActive && game && !game.winner) {
        if (turnInProgress) {
            const delay = fastAutoMode ? 50 : 100;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
        }
        
        if (game.checkWinCondition()) {
            stopAutoplay();
            return;
        }
        
        turnInProgress = true;
        await game.playTurn();
        
        if (!game) {
            turnInProgress = false;
            stopAutoplay();
            return;
        }
        
        if (game.checkWinCondition()) {
            turnInProgress = false;
            stopAutoplay();
            return;
        }
        
        turnInProgress = false;
        const delay = fastAutoMode ? 250 : 500;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    if (autoplayActive) {
        stopAutoplay();
    }
}

function resetGameState() {
    globalCardId = 0;
    game = null;
    autoplayActive = false;
    fastAutoMode = false;
    
    // Stop music when resetting game state
    sfx.stopMusic();
    
    document.getElementById('turnInfo').textContent = 'Click "Start New Game" to begin';
    document.getElementById('player1Field').innerHTML = '';
    document.getElementById('player2Field').innerHTML = '';
    document.getElementById('player1DeckList').innerHTML = '';
    document.getElementById('player2DeckList').innerHTML = '';
    
    document.getElementById('p1Name').textContent = 'Player 1';
    document.getElementById('p2Name').textContent = 'Player 2';
    document.getElementById('p1DeckName').textContent = 'Player 1';
    document.getElementById('p2DeckName').textContent = 'Player 2';
    
    const p1HpBar = document.getElementById('p1HpBar');
    p1HpBar.style.width = '100%';
    p1HpBar.className = 'hp-fill healthy';
    document.getElementById('p1HpText').textContent = `${GAME_CONSTANTS.MAX_PLAYER_HP}/${GAME_CONSTANTS.MAX_PLAYER_HP}`;
    document.getElementById('p1DeckCount').textContent = `${GAME_CONSTANTS.DECK_SIZE}`;
    document.getElementById('p1ManaText').textContent = '0/0';
    
    const p2HpBar = document.getElementById('p2HpBar');
    p2HpBar.style.width = '100%';
    p2HpBar.className = 'hp-fill healthy';
    document.getElementById('p2HpText').textContent = `${GAME_CONSTANTS.MAX_PLAYER_HP}/${GAME_CONSTANTS.MAX_PLAYER_HP}`;
    document.getElementById('p2DeckCount').textContent = `${GAME_CONSTANTS.DECK_SIZE}`;
    document.getElementById('p2ManaText').textContent = '0/0';
    
    updateButtonVisibility(false);
}

function debugP1Win() {
    if (!game || game.winner) return;
    game.winner = game.player1.name;
    game.showWinner();
}

function debugP2Win() {
    if (!game || game.winner) return;
    game.winner = game.player2.name;
    game.showWinner();
}

function debugDraw() {
    if (!game || game.winner) return;
    game.winner = "DRAW";
    game.showWinner();
}

document.addEventListener('keydown', (event) => {
    if (event.code === 'Enter') {
        event.preventDefault();
        if (!game || game.winner) {
            startGame();
        } else if (!turnInProgress) {
            nextTurn();
        }
    }
    
    if (event.code === 'Space') {
        event.preventDefault();
        if (game && !game.winner) {
            toggleAutoplay();
        }
    }
});

function toggleVolumeDropdown() {
    const dropdown = document.getElementById('volumeDropdown');
    dropdown.classList.toggle('active');
}

function updateSFXVolume(value) {
    const volume = value / 100;
    sfx.setVolume(volume);
    document.getElementById('sfxVolumeValue').textContent = `${value}%`;
}

function updateMusicVolume(value) {
    const volume = value / 100;
    sfx.setMusicVolume(volume);
    document.getElementById('musicVolumeValue').textContent = `${value}%`;
}

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
    const volumeControl = document.querySelector('.volume-control');
    const dropdown = document.getElementById('volumeDropdown');
    
    if (volumeControl && !volumeControl.contains(event.target) && dropdown.classList.contains('active')) {
        dropdown.classList.remove('active');
    }
});

