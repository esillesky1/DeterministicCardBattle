class Card {
    constructor(cardType, playerId, deckType = null) {
        const stats = CARD_TYPES[cardType];
        this.name = stats.name;
        
        // Start with base stats
        this.speed = stats.speed;
        this.attack = stats.attack;
        this.maxHp = stats.hp;
        
        // Apply deck-type boosts
        this.deckType = deckType;
        if (deckType === 'speedy' && cardType != "Wall") {
            this.speed += 6;
        } else if (deckType === 'hardy') {
            this.maxHp = Math.round(this.maxHp * 1.21);
        } else if (deckType === 'angry') {
            this.attack = Math.round(this.attack * 1.204);
        }
        
        this.currentHp = this.maxHp;
        
        this.cost = stats.cost;
        this.isActive = true;
        this.hasAttacked = false;
        this.id = `${playerId}-${globalCardId++}`;
        
        // Effective stats (can be modified by tribal buffs)
        this.attackEff = this.attack;
    }

    takeDamage(damage) {
        this.currentHp -= damage;
        return this.currentHp <= 0;
    }

    activate() {
        this.isActive = true;
    }

    resetAttackState() {
        this.hasAttacked = false;
    }
}

