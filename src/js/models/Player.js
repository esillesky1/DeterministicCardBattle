class Player {
    constructor(name, deck, playerId, deckType = null, targetStrategy = null) {
        this.name = name;
        this.playerId = playerId;
        this.deckType = deckType; // Required: 'speedy', 'hardy', or 'angry'
        this.targetStrategy = targetStrategy; // Required: 'target-mana', 'kill-shot', or 'optimize-damage'
        this.originalDeck = [...deck];
        this.deck = [...deck];
        this.field = Array(GAME_CONSTANTS.FIELD_SIZE).fill(null);
        this.hp = GAME_CONSTANTS.MAX_PLAYER_HP;
        this.maxMana = 0;
        this.currentMana = 0;
        this.discardPile = [];
    }

    drawCard() {
        if (this.deck.length > 0) {
            const cardType = this.deck.shift();
            return new Card(cardType, this.playerId, this.deckType);
        }
        return null;
    }

    placeCard(card) {
        for (let i = 0; i < GAME_CONSTANTS.FIELD_SIZE; i++) {
            if (this.field[i] === null) {
                this.field[i] = card;
                return true;
            }
        }
        return false;
    }
    
    canAfford(cardOrType) {
        const cost = typeof cardOrType === 'string' ? CARD_TYPES[cardOrType].cost : cardOrType.cost;
        return this.currentMana >= cost;
    }
    
    spendMana(amount) {
        this.currentMana -= amount;
    }
    
    refillMana() {
        this.currentMana = this.maxMana;
    }
    
    increaseMana() {
        if (this.maxMana < GAME_CONSTANTS.MAX_MANA) {
            this.maxMana++;
        }
        this.currentMana = this.maxMana;
    }

    slideCardsLeft() {
        const cards = this.field.filter(c => c !== null);
        this.field = [...cards, ...Array(GAME_CONSTANTS.FIELD_SIZE - cards.length).fill(null)];
    }

    removeDeadCards() {
        for (let i = 0; i < GAME_CONSTANTS.FIELD_SIZE; i++) {
            if (this.field[i] && this.field[i].currentHp <= 0) {
                this.discardPile.push(this.field[i]);
                this.field[i] = null;
            }
        }
        this.slideCardsLeft();
    }

    getActiveCards() {
        return this.field.filter(c => c && c.isActive);
    }

    getAllCards() {
        return this.field.filter(c => c !== null);
    }

    cardsOnField() {
        return this.field.filter(c => c !== null).length;
    }

    activateAllCards() {
        this.field.forEach(card => {
            if (card) card.activate();
        });
    }
}

