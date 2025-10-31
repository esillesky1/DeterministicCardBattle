const CARD_TYPES = {
    "Goblin": { name: "Goblin", hp: 30, attack: 15, speed: 35, cost: 1 },
    "Skeleton": { name: "Skeleton", hp: 75, attack: 30, speed: 15, cost: 2 },
    "Archer": { name: "Archer", hp: 90, attack: 44, speed: 30, cost: 4 },
    "Wizard": { name: "Wizard", hp: 120, attack: 82, speed: 25, cost: 6 },
    "Knight": { name: "Knight", hp: 200, attack: 100, speed: 20, cost: 8 },
    "Wall": { name: "Wall", hp: 1500, attack: 0, speed: 0, cost: 6 },
};

const TEAM_NAMES = {
    PLAYER1: "Player 1",
    PLAYER2: "Player 2"
};

const GAME_CONSTANTS = {
    MAX_PLAYER_HP: 100,
    MAX_MANA: 10,
    STARTING_MANA: 3,
    DECK_SIZE: 20,
    FIELD_SIZE: 5
};

const VALID_DECK_TYPES = ['speedy', 'hardy', 'angry'];

const VALID_TARGET_STRATEGIES = ['target-mana', 'kill-shot', 'optimize-damage'];
