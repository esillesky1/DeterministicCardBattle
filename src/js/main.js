let game = null;
let globalCardId = 0;
let turnInProgress = false;
let autoplayActive = false;
let fastAutoMode = false;

document.getElementById('p1HpText').textContent = `${GAME_CONSTANTS.MAX_PLAYER_HP}/${GAME_CONSTANTS.MAX_PLAYER_HP}`;
document.getElementById('p2HpText').textContent = `${GAME_CONSTANTS.MAX_PLAYER_HP}/${GAME_CONSTANTS.MAX_PLAYER_HP}`;
document.getElementById('p1DeckCount').textContent = `${GAME_CONSTANTS.DECK_SIZE}`;
document.getElementById('p2DeckCount').textContent = `${GAME_CONSTANTS.DECK_SIZE}`;

