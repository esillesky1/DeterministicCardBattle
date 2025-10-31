class Game {
    constructor(p1DeckObj, p2DeckObj, seed = 42) {
        this.player1 = new Player(TEAM_NAMES.PLAYER1, p1DeckObj.cards, "p1", p1DeckObj.type, p1DeckObj.targetStrategy);
        this.player2 = new Player(TEAM_NAMES.PLAYER2, p2DeckObj.cards, "p2", p2DeckObj.type, p2DeckObj.targetStrategy);
        this.turnNumber = 0;
        this.gameLog = [];
        this.winner = null;
        Math.seedrandom(seed);
        this.updateTeamNames();
        this.updateDeckDisplay();
    }

    // Calculates diminishing synergy beyond 3 units (soft3p5 model)
    effectiveExtra(count) {
        const extra = Math.max(0, count - 1);
        const base = Math.min(extra, 2);          // full effect for first 2 extras
        const tail = Math.max(0, extra - 2) * 0.5; // 50% value beyond 3 units
        return base + tail;
    }

    // Generic tribal buff application
    // cardType: name of card to buff (e.g., "Goblin", "Skeleton")
    // statCallback: function(card, count, mult) that applies the buff to the card
    // animate: whether to show animations when buffing
    async applyTribalBuff(player, cardType, statCallback, animate = false) {
        const cards = player.field.filter(card => card && card.name === cardType && card.currentHp > 0);
        const cardCount = cards.length;
        
        if (cardCount > 0) {
            // Run all callbacks in parallel so animations happen simultaneously
            const promises = cards.map(card => 
                statCallback(card, cardCount, this.effectiveExtra(cardCount), animate)
            );
            await Promise.all(promises);
        }
        
        return cardCount;
    }

    // Apply Goblin attack buff based on number of Goblins on field
    async applyGoblinBuffs(player, animate = false) {
        await this.applyTribalBuff(player, "Goblin", async (goblin, goblinCount, effectiveExtra, shouldAnimate) => {
            const mult = 1 + 0.08 * effectiveExtra;
            const oldAttack = goblin.attackEff;
            const buffedAttack = Math.round(goblin.attack * mult);
            goblin.attackEff = buffedAttack;
            
            // Animate if requested and value changed
            if (shouldAnimate && oldAttack !== buffedAttack && goblinCount > 1) {
                await this.animateCardStat(goblin, 'ATK', '#27ae60');
                const diff = buffedAttack - oldAttack;
                if (diff > 0) {
                    const cardElement = this.getCardElement(goblin);
                    if (cardElement) {
                        sfx.play('bubbleBoing', {volume: 0.1});
                        this.showAnimatedText(cardElement, `+${diff}`, 'damage-number', '24px', '#27ae60');
                    }
                }
            }
            
            // Log only once for the first goblin
            if (goblinCount > 1 && player.field.indexOf(goblin) === player.field.findIndex(c => c && c.name === "Goblin")) {
                const percentBoost = Math.round((mult - 1) * 100);
                this.log(`👺 ${goblinCount} Goblins - Attack boosted by ${percentBoost}% (${goblin.attack} → ${buffedAttack})`);
            }
        }, animate);
    }

    // Apply Skeleton HP buff to ALL Skeletons based on number on field
    async applySkeletonBuffs(player, animate = false) {
        await this.applyTribalBuff(player, "Skeleton", async (skeleton, skeletonCount, effectiveExtra, shouldAnimate) => {
            const mult = 1 + 0.20 * effectiveExtra;
            
            // Get the base HP (from CARD_TYPES with deck type modifier)
            const baseStats = CARD_TYPES[skeleton.name];
            let baseHp = baseStats.hp;
            
            // Apply deck type modifier to base
            if (skeleton.deckType === 'hardy') {
                baseHp = Math.round(baseHp * 1.21);
            }
            
            // Calculate buffed HP
            const buffedMaxHp = Math.round(baseHp * mult);
            const oldMaxHp = skeleton.maxHp;
            
            // Maintain current HP ratio when updating maxHp
            const hpRatio = skeleton.currentHp / skeleton.maxHp;
            skeleton.maxHp = buffedMaxHp;
            skeleton.currentHp = Math.round(buffedMaxHp * hpRatio);
            
            // Animate if requested and value changed
            if (shouldAnimate && oldMaxHp !== buffedMaxHp && skeletonCount > 1) {
                await this.animateCardStat(skeleton, 'HP', '#51cf66');
                const diff = buffedMaxHp - oldMaxHp;
                if (diff > 0) {
                    const cardElement = this.getCardElement(skeleton);
                    if (cardElement) {
                        sfx.play('bubbleBoing');
                        this.showAnimatedText(cardElement, `+${diff}`, 'mana-gain', '24px', '#51cf66');
                    }
                }
            }
            
            // Log only once for the first skeleton
            if (skeletonCount > 1 && player.field.indexOf(skeleton) === player.field.findIndex(c => c && c.name === "Skeleton")) {
                const percentBoost = Math.round((mult - 1) * 100);
                this.log(`🦴 ${skeletonCount} Skeletons - HP boosted by ${percentBoost}% (${baseHp} → ${buffedMaxHp})`);
            }
        }, animate);
    }

    updateTeamNames() {
        const getDeckTypePill = (deckType) => {
            if (deckType === 'speedy') return '<span class="deck-pill deck-pill-speedy"><img src="images/lightning-bolt.png" alt="">Speedy</span>';
            if (deckType === 'hardy') return '<span class="deck-pill deck-pill-hardy"><img src="images/defense-shield.png" alt="">Hardy</span>';
            if (deckType === 'angry') return '<span class="deck-pill deck-pill-angry"><img src="images/attack-fist.png" alt="">Angry</span>';
            return '';
        };
        
        const getTargetStrategyPill = (strategy) => {
            if (strategy === 'target-mana') return '<span class="deck-pill deck-pill-target-mana"><img src="images/target.png" alt="">Target Mana</span>';
            if (strategy === 'optimize-damage') return '<span class="deck-pill deck-pill-optimize"><img src="images/graph.png" alt="">Optimize</span>';
            if (strategy === 'kill-shot') return '<span class="deck-pill deck-pill-kill-shot"><img src="images/skull.png" alt="">Kill Shot</span>';
            return '';
        };
        
        const p1TypePill = getDeckTypePill(this.player1.deckType);
        const p2TypePill = getDeckTypePill(this.player2.deckType);
        const p1StrategyPill = getTargetStrategyPill(this.player1.targetStrategy);
        const p2StrategyPill = getTargetStrategyPill(this.player2.targetStrategy);
        
        document.getElementById('p1Name').innerHTML = TEAM_NAMES.PLAYER1 + (p1TypePill ? ' ' + p1TypePill : '') + (p1StrategyPill ? ' ' + p1StrategyPill : '');
        document.getElementById('p2Name').innerHTML = TEAM_NAMES.PLAYER2 + (p2TypePill ? ' ' + p2TypePill : '') + (p2StrategyPill ? ' ' + p2StrategyPill : '');
        document.getElementById('p1DeckName').textContent = TEAM_NAMES.PLAYER1;
        document.getElementById('p2DeckName').textContent = TEAM_NAMES.PLAYER2;
    }

    log(message, highlight = false) {
        this.gameLog.push(message);
        const logDiv = document.getElementById('gameLog');
        if (logDiv) {
            const entry = document.createElement('div');
            entry.className = 'log-entry' + (highlight ? ' highlight' : '');
            entry.textContent = message;
            logDiv.appendChild(entry);
            logDiv.scrollTop = logDiv.scrollHeight;
        }
    }

    async animateCardDraw(playerPrefix) {
        const listId = playerPrefix === 'p1' ? 'player1DeckList' : 'player2DeckList';
        const list = document.getElementById(listId);
        const nextCard = list.querySelector('.next-card');
        
        if (nextCard) {
            nextCard.classList.add('drawing');
            await this.sleep(800);
        }
    }

    updateDeckDisplay() {
        const p1List = document.getElementById('player1DeckList');
        p1List.innerHTML = '';
        const p1CardsDrawn = this.player1.originalDeck.length - this.player1.deck.length;
        
        this.player1.originalDeck.forEach((cardType, index) => {
            const stats = CARD_TYPES[cardType];
            const div = document.createElement('div');
            const safeName = cardType.replace(/\s+/g, '');
            const imageName = cardType.toLowerCase().replace(/\s+/g, '');
            div.className = `deck-card deck-card-${safeName}`;
            
            if (index < p1CardsDrawn) {
                div.style.opacity = '0.3';
                div.style.textDecoration = 'line-through';
            } else if (index === p1CardsDrawn) {
                div.classList.add('next-card');
                if (stats.cost > this.player1.currentMana) {
                    div.classList.add('too-expensive');
                }
            }
            
            const isNextCard = index === p1CardsDrawn;
            
            div.innerHTML = `
                <div class="deck-card-mana">
                    <img src="images/mana.png" alt="Mana" class="deck-mana-icon">
                    <span class="deck-mana-value">${stats.cost}</span>
                </div>
                <img src="images/${imageName}.png" alt="${cardType}" class="deck-card-icon" onerror="this.style.display='none'">
                <div class="deck-card-content">
                    <span>${cardType}</span>
                    ${isNextCard ? '<span class="next-card-pill">Next</span>' : ''}
                </div>
            `;
            p1List.appendChild(div);
        });
        
        this.setTimeout(() => {
            const p1NextCard = p1List.querySelector('.next-card');
            if (p1NextCard) {
                p1NextCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);

        const p2List = document.getElementById('player2DeckList');
        p2List.innerHTML = '';
        const p2CardsDrawn = this.player2.originalDeck.length - this.player2.deck.length;
        
        this.player2.originalDeck.forEach((cardType, index) => {
            const stats = CARD_TYPES[cardType];
            const div = document.createElement('div');
            const safeName = cardType.replace(/\s+/g, '');
            const imageName = cardType.toLowerCase().replace(/\s+/g, '');
            div.className = `deck-card deck-card-${safeName}`;
            
            if (index < p2CardsDrawn) {
                div.style.opacity = '0.3';
                div.style.textDecoration = 'line-through';
            } else if (index === p2CardsDrawn) {
                div.classList.add('next-card');
                if (stats.cost > this.player2.currentMana) {
                    div.classList.add('too-expensive');
                }
            }
            
            const isNextCard = index === p2CardsDrawn;
            
            div.innerHTML = `
                <div class="deck-card-mana">
                    <img src="images/mana.png" alt="Mana" class="deck-mana-icon">
                    <span class="deck-mana-value">${stats.cost}</span>
                </div>
                <img src="images/${imageName}.png" alt="${cardType}" class="deck-card-icon" onerror="this.style.display='none'">
                <div class="deck-card-content">
                    <span>${cardType}</span>
                    ${isNextCard ? '<span class="next-card-pill">Next</span>' : ''}
                </div>
            `;
            p2List.appendChild(div);
        });
        
        this.setTimeout(() => {
            const p2NextCard = p2List.querySelector('.next-card');
            if (p2NextCard) {
                p2NextCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
    }

    async firstTurn() {
        this.log(`=== GAME START ===`, true);
        this.log(`Starting with ${GAME_CONSTANTS.STARTING_MANA} mana...`, true);
        
        this.player1.maxMana = GAME_CONSTANTS.STARTING_MANA;
        this.player1.currentMana = GAME_CONSTANTS.STARTING_MANA;
        this.player2.maxMana = GAME_CONSTANTS.STARTING_MANA;
        this.player2.currentMana = GAME_CONSTANTS.STARTING_MANA;
        
        this.turnNumber = 1;
        this.updateDisplay();
        this.updateDeckDisplay();
        
        await this.sleep(500);
        await this.drawPhase();
        await this.attackPhase();
        this.endTurn();
        this.updateDisplay();
    }

    async drawPhase() {
        this.log("\n--- DRAW PHASE ---", true);
        
        await this.drawCardsForPlayer(this.player1, 'p1');
        await this.drawCardsForPlayer(this.player2, 'p2');
        
        await this.equalizeCards();
    }
    
    async drawCardsForPlayer(player, prefix) {
        this.log(`${player.name}: ${player.currentMana}/${player.maxMana} mana available`);
        
        let drawnCards = 0;
        
        while (player.deck.length > 0 && player.cardsOnField() < GAME_CONSTANTS.FIELD_SIZE) {
            const nextCard = player.deck[0];
            
            if (player.canAfford(nextCard)) {
                sfx.play('drawCard');
                await this.animateCardDraw(prefix);
                const card = player.drawCard();
                player.spendMana(card.cost);
                
                player.placeCard(card);
                sfx.play('placeCard');
                drawnCards++;
                
                this.showManaCost(prefix, card.cost);
                this.log(`${player.name} draws ${card.name} (${card.cost} mana) - ${player.currentMana} mana left`);
                
                // Update display to show the card on the field
                this.updateDisplay();
                this.updateDeckDisplay();
                
                // Apply and animate tribal buffs in parallel with card entrance animation
                const buffPromise = (async () => {
                    // Small delay to let card entrance animation start
                    await this.sleep(150);
                    
                    // Apply and animate tribal buffs for the matching tribe
                    if (card.name === "Goblin") {
                        await this.applyGoblinBuffs(player, true);
                        await this.applySkeletonBuffs(player, false);
                    } else if (card.name === "Skeleton") {
                        await this.applyGoblinBuffs(player, false);
                        await this.applySkeletonBuffs(player, true);
                    } else {
                        // Other card types, just update stats without animation
                        await Promise.all([
                            this.applyGoblinBuffs(player, false),
                            this.applySkeletonBuffs(player, false)
                        ]);
                    }
                    
                    // Update stat text in DOM without recreating the card
                    this.updateCardStats(player);
                })();
                
                // Wait for animations to complete
                await buffPromise;
                
                await this.sleep(350);
            } else {
                this.log(`${player.name} cannot afford next card (${nextCard} costs ${CARD_TYPES[nextCard].cost} mana, has ${player.currentMana})`);
                break;
            }
        }
        
        if (drawnCards === 0) {
            this.log(`${player.name} cannot afford to draw any cards`);
            await this.showCannotAfford(prefix);
        }
        
        if (player.currentMana > 0 && player.deck.length > 0 && player.cardsOnField() < GAME_CONSTANTS.FIELD_SIZE) {
            this.log(`${player.name} has ${player.currentMana} mana remaining but cannot afford next card`);
        }
    }
    
    async equalizeCards() {
        const p1FieldCount = this.player1.cardsOnField();
        const p2FieldCount = this.player2.cardsOnField();
        
        if (p1FieldCount === p2FieldCount) {
            return;
        }
        
        let disadvantagedPlayer, advantagedPlayer, playerPrefix, fieldCount, opponentCount;
        
        if (p1FieldCount < p2FieldCount) {
            disadvantagedPlayer = this.player1;
            advantagedPlayer = this.player2;
            playerPrefix = 'p1';
            fieldCount = p1FieldCount;
            opponentCount = p2FieldCount;
        } else {
            disadvantagedPlayer = this.player2;
            advantagedPlayer = this.player1;
            playerPrefix = 'p2';
            fieldCount = p2FieldCount;
            opponentCount = p1FieldCount;
        }
        
        const cardDifference = opponentCount - fieldCount;
        const maxDrawable = Math.min(GAME_CONSTANTS.FIELD_SIZE - fieldCount, disadvantagedPlayer.deck.length, cardDifference);
        
        if (maxDrawable <= 0) {
            return;
        }
        
        this.log(`\n⚖️ EQUALIZATION: ${disadvantagedPlayer.name} has ${fieldCount} cards vs ${opponentCount}`, true);
        
        let cardsDrawn = 0;
        for (let i = 0; i < maxDrawable; i++) {
            if (disadvantagedPlayer.deck.length === 0) break;
            
            const nextCard = disadvantagedPlayer.deck[0];
            
            if (disadvantagedPlayer.canAfford(nextCard)) {
                await this.animateCardDraw(playerPrefix);
                const card = disadvantagedPlayer.drawCard();
                sfx.play('placeCard');
                disadvantagedPlayer.spendMana(card.cost);
                
                disadvantagedPlayer.placeCard(card);
                cardsDrawn++;
                
                this.showManaCost(playerPrefix, card.cost);
                this.log(`${disadvantagedPlayer.name} draws ${card.name} (${card.cost} mana - equalization)`);
                
                // Update display to show the card on the field
                this.updateDisplay();
                this.updateDeckDisplay();
                
                // Apply and animate tribal buffs in parallel with card entrance animation
                const buffPromise = (async () => {
                    // Small delay to let card entrance animation start
                    await this.sleep(150);
                    
                    // Apply and animate tribal buffs for the matching tribe
                    if (card.name === "Goblin") {
                        await this.applyGoblinBuffs(disadvantagedPlayer, true);
                        await this.applySkeletonBuffs(disadvantagedPlayer, false);
                    } else if (card.name === "Skeleton") {
                        await this.applyGoblinBuffs(disadvantagedPlayer, false);
                        await this.applySkeletonBuffs(disadvantagedPlayer, true);
                    } else {
                        // Other card types, just update stats without animation
                        await Promise.all([
                            this.applyGoblinBuffs(disadvantagedPlayer, false),
                            this.applySkeletonBuffs(disadvantagedPlayer, false)
                        ]);
                    }
                    
                    // Update stat text in DOM without recreating the card
                    this.updateCardStats(disadvantagedPlayer);
                })();
                
                // Wait for animations to complete
                await buffPromise;
                
                await this.sleep(250);
            } else {
                this.log(`${disadvantagedPlayer.name} cannot afford next card (${nextCard} costs ${CARD_TYPES[nextCard].cost} mana)`);
                break;
            }
        }
        
        if (cardsDrawn === 0) {
            this.log(`${disadvantagedPlayer.name} could not equalize - insufficient mana`);
        }
        
        await this.sleep(800);
    }

    buildAttackQueue() {
        const queue = [];
        
        this.player1.getActiveCards().forEach(card => {
            queue.push({ card, attacker: this.player1, defender: this.player2 });
        });
        
        this.player2.getActiveCards().forEach(card => {
            queue.push({ card, attacker: this.player2, defender: this.player1 });
        });
        
        queue.sort((a, b) => {
            if (b.card.speed !== a.card.speed) {
                return b.card.speed - a.card.speed;
            }
            return Math.random() - 0.5;
        });
        
        return queue;
    }

    findTarget(card, defender) {
        const targets = defender.getActiveCards();
        if (targets.length === 0) return null;
        
        const attacker = this.player1.field.includes(card) ? this.player1 : this.player2;
        const strategy = attacker.targetStrategy;
        
        if (strategy === 'target-mana') {
            return this.findTargetByMana(targets);
        } else if (strategy === 'optimize-damage') {
            return this.findTargetOptimizeDamage(card, targets);
        } else { // 'kill-shot' or default
            return this.findTargetKillShot(card, targets);
        }
    }
    
    handleTiebreakers(currentBest, candidate, useCostTiebreaker = true) {
        // Returns the better target based on tiebreaker rules:
        // 1. Higher mana cost (if useCostTiebreaker is true)
        // 2. Hasn't attacked yet
        
        if (useCostTiebreaker) {
            if (candidate.cost > currentBest.cost) {
                return candidate;
            } else if (candidate.cost < currentBest.cost) {
                return currentBest;
            }
            // Cost is tied, check attack status
        }
        
        // Both have same cost (or cost tiebreaker not used) - check attack status
        if (!candidate.hasAttacked && currentBest.hasAttacked) {
            return candidate;
        }
        
        return currentBest;
    }
    
    findTargetByMana(targets) {
        // Simply target the highest mana cost card
        let bestTarget = null;
        let maxCost = -1;
        
        for (let target of targets) {
            if (target.cost > maxCost) {
                maxCost = target.cost;
                bestTarget = target;
            } else if (target.cost === maxCost && bestTarget !== null) {
                // Cost is tied - use attack status tiebreaker only
                bestTarget = this.handleTiebreakers(bestTarget, target, false);
            }
        }
        
        return bestTarget;
    }
    
    findTargetOptimizeDamage(attacker, targets) {
        // Target the card that minimizes wasted damage (closest to attacker's attack value)
        let bestTarget = null;
        let minRemainingDamage = Infinity;
        let foundNoWastedDamageTarget = false;
        let closestDamage = Infinity;
        
        for (let target of targets) {
            const remainingDamage = (target.currentHp - attacker.attackEff)
            const netDamageDifference = Math.abs(remainingDamage)
            const wastedDamage = remainingDamage < 0;
            
            if (!wastedDamage) {
                foundNoWastedDamageTarget = true;
                if (remainingDamage < minRemainingDamage) {
                    minRemainingDamage = remainingDamage;
                    bestTarget = target;
                } else if (remainingDamage === minRemainingDamage) {
                    // Handle ties in the no-waste case
                    bestTarget = this.handleTiebreakers(bestTarget, target);
                }
            }
            else if (!foundNoWastedDamageTarget){
                if (netDamageDifference < closestDamage){
                    closestDamage = netDamageDifference;
                    bestTarget = target;
                } else if (netDamageDifference === closestDamage) {
                    // Waste is tied - use full tiebreakers (cost, then attack status)
                    bestTarget = this.handleTiebreakers(bestTarget, target);
                }
            }
        }
        
        return bestTarget;
    }
    
    findTargetKillShot(attacker, targets) {
        // Strategy: Minimize wasted damage by targeting highest HP
        // 1. If we can kill something, choose the strongest killable target
        // 2. If we can't kill anything, attack the strongest target overall
        // Tiebreakers: 1) highest mana cost, 2) hasn't attacked yet
        
        const killableTargets = targets.filter(t => attacker.attackEff >= t.currentHp);
        
        if (killableTargets.length > 0) {
            // We can kill something - choose the strongest killable target (highest HP)
            let bestTarget = null;
            let maxHp = -1;
            
            for (let target of killableTargets) {
                if (target.currentHp > maxHp) {
                    maxHp = target.currentHp;
                    bestTarget = target;
                } else if (target.currentHp === maxHp && bestTarget !== null) {
                    // HP is tied - use full tiebreakers
                    bestTarget = this.handleTiebreakers(bestTarget, target);
                }
            }
            
            return bestTarget;
        } else {
            // Can't kill anything - attack the strongest target (highest current HP)
            let bestTarget = null;
            let maxHp = -1;
            
            for (let target of targets) {
                if (target.currentHp > maxHp) {
                    maxHp = target.currentHp;
                    bestTarget = target;
                } else if (target.currentHp === maxHp && bestTarget !== null) {
                    // HP is tied - use full tiebreakers
                    bestTarget = this.handleTiebreakers(bestTarget, target);
                }
            }
            
            return bestTarget;
        }
    }

    getCardElement(card) {
        return document.querySelector(`[data-card-id="${card.id}"]`);
    }

    async createAttackArrow(attackerElement, targetElement, defender, attackingCard) {
        const gameBoard = document.getElementById('gameBoard');
        const attackerRect = attackerElement.getBoundingClientRect();
        const boardRect = gameBoard.getBoundingClientRect();
        
        let targetRect;
        if (targetElement) {
            targetRect = targetElement.getBoundingClientRect();
        } else {
            const hpBarId = defender === this.player1 ? 'p1HpBar' : 'p2HpBar';
            targetRect = document.getElementById(hpBarId).getBoundingClientRect();
        }
        
        const arrow = document.createElement('div');
        arrow.className = 'attack-arrow';
        
        const startX = attackerRect.left + attackerRect.width / 2 - boardRect.left;
        const startY = attackerRect.top + attackerRect.height / 2 - boardRect.top;
        const endX = targetRect.left + targetRect.width / 2 - boardRect.left;
        const endY = targetRect.top + targetRect.height / 2 - boardRect.top;
        
        const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
        
        arrow.style.left = `${startX - 40}px`;
        arrow.style.top = `${startY - 40}px`;
        arrow.style.setProperty('--rotation', `${angle}deg`);
        
        if (attackingCard.name === 'Wizard') {
            arrow.innerHTML = '<img src="images/magic-ball.png" alt="Fireball" class="projectile-sprite wizard-projectile">';
        } 
        else if (attackingCard.name === 'Archer') {
            arrow.innerHTML = '<img src="images/arrow-shot.png" alt="Arrow" class="projectile-sprite arrow-projectile">';
        } 
        else if (attackingCard.name === 'Knight') {
            arrow.innerHTML = '<img src="images/sword-attack.png" alt="Sword" class="projectile-sprite sword-projectile">';
        }
        else if (attackingCard.name === 'Goblin') {
            arrow.innerHTML = '<img src="images/goblin-attack.png" alt="Goblin Vomit" class="projectile-sprite goblin-projectile">';
        }
        else if (attackingCard.name === 'Skeleton') {
            arrow.innerHTML = '<img src="images/sword-attack.png" alt="Skeleton Attack" class="projectile-sprite sword-projectile">';
        }
        else {
            const uniqueId = Date.now() + Math.random();
            arrow.innerHTML = `
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="arrowGradient${uniqueId}" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style="stop-color:#ff0000;stop-opacity:1" />
                            <stop offset="50%" style="stop-color:#cc0000;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#8b0000;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <path d="M 10 40 L 10 60 L 65 60 L 65 70 L 90 50 L 65 30 L 65 40 Z" 
                          fill="url(#arrowGradient${uniqueId})" 
                          stroke="#000" 
                          stroke-width="6"
                          stroke-linejoin="round"/>
                    <path d="M 10 40 L 10 60 L 65 60 L 65 70 L 90 50 L 65 30 L 65 40 Z" 
                          fill="none" 
                          stroke="#fff" 
                          stroke-width="2"
                          stroke-linejoin="round"/>
                </svg>
            `;
        }
        
        gameBoard.appendChild(arrow);
        
        sfx.play('woosh', { startTime: 0.2, volume: 0.3 });
        this.setTimeout(() => arrow.classList.add('animating'), 10);
        
        const duration = fastAutoMode ? 300 : 600;
        const startTime = performance.now();
        
        const easeInOutQuart = (t) => {
            if (t < 0.15) {
                return (t / 0.15) * (t / 0.15) * 0.05;
            } else {
                const adjustedT = (t - 0.15) / 0.85;
                return 0.05 + adjustedT * adjustedT * adjustedT * 0.95;
            }
        };
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const linearProgress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOutQuart(linearProgress);
            
            const currentX = startX + (endX - startX) * easedProgress - 40;
            const currentY = startY + (endY - startY) * easedProgress - 40;
            
            arrow.style.left = `${currentX}px`;
            arrow.style.top = `${currentY}px`;
            
            if (linearProgress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.setTimeout(() => arrow.remove(), 100);
            }
        };
        
        requestAnimationFrame(animate);
    }

    showAnimatedText(targetElement, text, animationClass, fontSize = '32px', color = '#ff6b6b') {
        const rect = targetElement.getBoundingClientRect();
        const gameBoard = document.getElementById('gameBoard');
        const boardRect = gameBoard.getBoundingClientRect();
        
        const textElement = document.createElement('div');
        textElement.className = animationClass;
        textElement.textContent = text;
        textElement.style.fontSize = fontSize;
        textElement.style.color = color;
        textElement.style.left = `${rect.left + rect.width / 2 - boardRect.left}px`;
        textElement.style.top = `${rect.top - boardRect.top}px`;
        
        const randomRotation = (Math.random() - 0.5) * 30;
        textElement.style.setProperty('--initial-rotation', `${randomRotation}deg`);
        
        gameBoard.appendChild(textElement);
        
        this.setTimeout(() => textElement.remove(), 1000);
    }

    async showDamageNumber(targetElement, damage) {
        this.showAnimatedText(targetElement, `-${damage}`, 'damage-number', '32px', '#ff6b6b');
    }

    async showManaCost(playerPrefix, manaCost) {
        const manaDisplay = document.getElementById(`${playerPrefix}ManaText`).parentElement;
        this.showAnimatedText(manaDisplay, `-${manaCost}`, 'mana-cost', '28px', '#74c0fc');
    }

    async showManaGain(playerPrefix, manaGain) {
        const manaDisplay = document.getElementById(`${playerPrefix}ManaText`).parentElement;
        this.showAnimatedText(manaDisplay, `+${manaGain}`, 'mana-gain', '28px', '#51cf66');
        sfx.play('manaGain');
    }

    async showCannotAfford(playerPrefix) {
        const listId = playerPrefix === 'p1' ? 'player1DeckList' : 'player2DeckList';
        const list = document.getElementById(listId);
        const nextCard = list.querySelector('.next-card');
        
        if (nextCard) {
            sfx.play('noDraw', {startTime: 0.2});
            nextCard.classList.add('cannot-afford');
            await this.sleep(800);
            nextCard.classList.remove('cannot-afford');
        }
    }

    async showDirectDamage(playerName, damage) {
        const hpBar = playerName === this.player1.name 
            ? document.getElementById('p1HpBar')
            : document.getElementById('p2HpBar');
        
        const hpBarContainer = hpBar.parentElement;
        hpBarContainer.classList.add('taking-damage');
        
        this.showAnimatedText(hpBar, `-${damage} HP`, 'direct-damage', '48px', '#ff6b6b');
        
        this.setTimeout(() => {
            hpBarContainer.classList.remove('taking-damage');
        }, 1200);
    }

    async attackPhase() {
        this.log("\n--- ATTACK PHASE ---", true);
        
        // Reset all attackEff to base attack values
        this.player1.field.forEach(card => {
            if (card) card.attackEff = card.attack;
        });
        this.player2.field.forEach(card => {
            if (card) card.attackEff = card.attack;
        });
        
        // Apply tribal buffs for both players before attacks (no animations, all in parallel)
        await Promise.all([
            this.applyGoblinBuffs(this.player1, false),
            this.applyGoblinBuffs(this.player2, false),
            this.applySkeletonBuffs(this.player1, false),
            this.applySkeletonBuffs(this.player2, false)
        ]);
        
        // Update display to show buffed values
        this.updateDisplay();
        
        const queue = this.buildAttackQueue();
        
        if (queue.length === 0) {
            this.log("No active cards to attack!");
            return;
        }
        
        this.log(`Attack queue: ${queue.length} cards ready`);
        
        for (let {card, attacker, defender} of queue) {
            if (card.currentHp <= 0) continue;
            
            const attackerElement = this.getCardElement(card);
            if (!attackerElement) continue;
            
            attackerElement.classList.add('attacking');
            sfx.play('sine', { volume: 1.0 });
            sfx.play('sine', { volume: 1.0 });
            this.log(`⚔️ ${attacker.name}'s ${card.name} prepares to attack...`, true);
            await this.sleep(400);
            
            const target = this.findTarget(card, defender);
            
            if (target) {
                const targetElement = this.getCardElement(target);
                
                if (targetElement) {
                    targetElement.classList.add('being-targeted');
                    sfx.play('sine', { volume: 1.0 });
                    sfx.play('sine', { volume: 1.0 });
                    await this.sleep(300);
                    
                    await this.createAttackArrow(attackerElement, targetElement, defender, card);
                    
                    this.log(`${attacker.name}'s ${card.name} attacks ${defender.name}'s ${target.name} for ${card.attackEff} damage!`);
                    
                    await this.sleep(600);
                    
                    const died = target.takeDamage(card.attackEff);
                    
                    sfx.play('damage', { volume: 0.4 });
                    
                    targetElement.classList.remove('being-targeted');
                    targetElement.classList.add('taking-damage');
                    
                    const healthBar = targetElement.querySelector('.card-health-fill');
                    const healthText = targetElement.querySelector('.card-health-text');
                    const healthPercent = (target.currentHp / target.maxHp) * 100;
                    
                    if (healthBar) {
                        healthBar.style.width = `${healthPercent}%`;
                        if (healthPercent > 50) {
                            healthBar.style.backgroundColor = '#51cf66';
                        } else if (healthPercent > 25) {
                            healthBar.style.backgroundColor = '#ffd43b';
                        } else {
                            healthBar.style.backgroundColor = '#ff6b6b';
                        }
                    }
                    if (healthText) {
                        healthText.textContent = `${target.currentHp}/${target.maxHp}`;
                    }
                    
                    await this.showDamageNumber(targetElement, card.attackEff);
                    
                    if (died) {
                        this.log(`💀 ${defender.name}'s ${target.name} is destroyed!`);
                        
                        if (healthBar) {
                            healthBar.style.width = '0%';
                            healthBar.style.backgroundColor = '#ff6b6b';
                        }
                        if (healthText) {
                            healthText.textContent = `0/${target.maxHp}`;
                        }
                        
                        await this.sleep(300);
                        targetElement.classList.remove('taking-damage');
                        await this.animateCardDeath(target);
                        await this.slideCardsAfterDeath(defender, target);
                        defender.removeDeadCards();
                        this.updateDisplay();
                        await this.sleep(400);
                        this.cardsToSlide = null;
                    } else {
                        this.log(`${target.name}: ${target.currentHp}/${target.maxHp} HP remaining`);
                        await this.sleep(500);
                        targetElement.classList.remove('taking-damage');
                    }
                }
            } else {
                this.log(`💥 ${attacker.name}'s ${card.name} attacks ${defender.name} directly for ${card.attackEff} damage!`);
                
                await this.createAttackArrow(attackerElement, null, defender, card);
                await this.sleep(600);
                
                defender.hp -= card.attackEff;
                sfx.play('homeExplode', {duration: 2000, startTime: 0.5} );
                sfx.play('damage', { volume: 0.1 });
                await this.showDirectDamage(defender.name, card.attackEff);
                this.log(`${defender.name}: ${defender.hp} HP remaining`);
                this.updateDisplay();
                await this.sleep(600);
                
                if (defender.hp <= 0) {
                    this.log(`💀 ${defender.name} has been defeated!`);
                    attackerElement.classList.remove('attacking');
                    return;
                }
            }
            
            card.hasAttacked = true;
            attackerElement.classList.remove('attacking');
            this.updateDisplay();
            await this.sleep(300);
        }
        
        this.player1.removeDeadCards();
        this.player2.removeDeadCards();
        this.updateDisplay();
    }

    endTurn() {
    }

    checkWinCondition() {
        if (this.player1.hp <= 0) {
            this.winner = this.player2.name;
            this.showWinner();
            return true;
        }
        
        if (this.player2.hp <= 0) {
            this.winner = this.player1.name;
            this.showWinner();
            return true;
        }
        
        const p1Exhausted = this.player1.deck.length === 0 && this.player1.cardsOnField() === 0;
        const p2Exhausted = this.player2.deck.length === 0 && this.player2.cardsOnField() === 0;
        
        if (p1Exhausted && p2Exhausted) {
            if (this.player1.hp > this.player2.hp) {
                this.winner = this.player1.name;
            } else if (this.player2.hp > this.player1.hp) {
                this.winner = this.player2.name;
            } else {
                this.winner = "DRAW";
            }
            this.showWinner();
            return true;
        }
        
        return false;
    }

    async showWinner() {
        if (this.winner !== "DRAW") {
            sfx.play('applause');
            sfx.play('fanfare');
        }
        
        const overlay = document.createElement('div');
        overlay.className = 'win-overlay';
        overlay.id = 'winOverlay';
        
        if (this.winner !== "DRAW") {
            for (let i = 0; i < 100; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = `${Math.random() * 100}%`;
                confetti.style.animationDelay = `${Math.random() * 3}s`;
                confetti.style.backgroundColor = ['#ffd700', '#ff6b6b', '#51cf66', '#3b82f6', '#9b59b6'][Math.floor(Math.random() * 5)];
                overlay.appendChild(confetti);
            }
        }
        
        const container = document.createElement('div');
        container.className = 'win-container';
        
        const trophy = document.createElement('div');
        trophy.className = 'win-trophy';
        if (this.winner === "DRAW") {
            trophy.textContent = '🤝';
        } else {
            trophy.innerHTML = '<img src="images/trophy.png" alt="Victory" class="win-trophy-img">';
        }
        
        const title = document.createElement('div');
        title.className = 'win-title';
        title.textContent = this.winner === "DRAW" ? 'STALEMATE!' : `${this.winner} WINS`;
        
        const subtitle = document.createElement('div');
        subtitle.className = 'win-subtitle';
        if (this.winner !== "DRAW") {
            const winner = this.winner === this.player1.name ? this.player1 : this.player2;
            subtitle.textContent = `${winner.hp} HP Remaining`;
        } else {
            subtitle.textContent = 'No Victor';
        }
        
        const playAgainBtn = document.createElement('button');
        playAgainBtn.className = 'btn-play-again';
        playAgainBtn.textContent = 'Play Again';
        playAgainBtn.onclick = () => {
            overlay.classList.add('closing');
            setTimeout(() => {
                overlay.remove();
                resetGameState();
            }, 500);
        };
        
        container.appendChild(trophy);
        container.appendChild(title);
        container.appendChild(subtitle);
        container.appendChild(playAgainBtn);
        overlay.appendChild(container);
        
        document.body.appendChild(overlay);
        
        setTimeout(() => overlay.classList.add('active'), 10);
    }

    updateCardStats(player) {
        // Update only the stat values in existing card elements (doesn't recreate DOM)
        player.field.forEach(card => {
            if (!card) return;
            
            const cardElement = this.getCardElement(card);
            if (!cardElement) return;
            
            // Update attack stat
            const attackStat = Array.from(cardElement.querySelectorAll('.stat')).find(
                stat => stat.querySelector('.stat-label')?.textContent === 'ATK'
            );
            if (attackStat) {
                const attackValue = attackStat.querySelector('.stat-value');
                if (attackValue) {
                    attackValue.textContent = card.attackEff;
                }
                // Update boosted class
                if (card.deckType === 'angry' || card.attackEff > card.attack) {
                    attackStat.classList.add('boosted');
                } else {
                    attackStat.classList.remove('boosted');
                }
            }
            
            // Update HP bar
            const healthBar = cardElement.querySelector('.card-health-fill');
            const healthText = cardElement.querySelector('.card-health-text');
            const healthPercent = (card.currentHp / card.maxHp) * 100;
            
            if (healthBar) {
                healthBar.style.width = `${healthPercent}%`;
                if (healthPercent > 50) {
                    healthBar.style.backgroundColor = '#51cf66';
                } else if (healthPercent > 25) {
                    healthBar.style.backgroundColor = '#ffd43b';
                } else {
                    healthBar.style.backgroundColor = '#ff6b6b';
                }
            }
            if (healthText) {
                healthText.textContent = `${card.currentHp}/${card.maxHp}`;
            }
        });
    }

    updateDisplay() {
        document.getElementById('turnInfo').textContent = `Turn ${this.turnNumber}`;
        this.updatePlayerDisplay(this.player1, 'p1', 'player1Field');
        this.updatePlayerDisplay(this.player2, 'p2', 'player2Field');
    }

    updatePlayerDisplay(player, prefix, fieldId) {
        const hpPercent = Math.max(0, (player.hp / GAME_CONSTANTS.MAX_PLAYER_HP) * 100);
        const hpBar = document.getElementById(`${prefix}HpBar`);
        hpBar.style.width = `${hpPercent}%`;
        document.getElementById(`${prefix}HpText`).textContent = `${player.hp}/${GAME_CONSTANTS.MAX_PLAYER_HP}`;
        
        hpBar.className = 'hp-fill';
        if (hpPercent > 50) hpBar.classList.add('healthy');
        else if (hpPercent > 25) hpBar.classList.add('warning');
        
        document.getElementById(`${prefix}DeckCount`).textContent = `${player.deck.length}`;
        document.getElementById(`${prefix}ManaText`).textContent = `${player.currentMana}/${player.maxMana}`;
        
        const fieldDiv = document.getElementById(fieldId);
        
        const existingCardIds = new Set();
        fieldDiv.querySelectorAll('.card').forEach(card => {
            if (card.dataset.cardId) {
                existingCardIds.add(card.dataset.cardId);
            }
        });
        
        fieldDiv.innerHTML = '';
        
        for (let i = 0; i < GAME_CONSTANTS.FIELD_SIZE; i++) {
            if (player.field[i]) {
                const isNewCard = !existingCardIds.has(player.field[i].id.toString());
                const shouldSlide = this.cardsToSlide && this.cardsToSlide.has(player.field[i].id.toString());
                fieldDiv.appendChild(this.createCardElement(player.field[i], isNewCard, shouldSlide));
            } else {
                const emptySlot = document.createElement('div');
                emptySlot.className = 'empty-slot';
                fieldDiv.appendChild(emptySlot);
            }
        }
    }

    createCardElement(card, isNewCard = false, shouldSlide = false) {
        const cardDiv = document.createElement('div');
        const safeName = card.name.replace(/\s+/g, '');
        cardDiv.className = `card card-type-${safeName}`;
        if (isNewCard) {
            cardDiv.classList.add('card-entering');
        }
        if (shouldSlide) cardDiv.classList.add('card-sliding');
        cardDiv.dataset.cardId = card.id;
        
        const imageName = card.name.toLowerCase().replace(/\s+/g, '');
        const healthPercent = (card.currentHp / card.maxHp) * 100;
        const healthBarColor = healthPercent > 60 ? '#51cf66' : healthPercent > 30 ? '#ffd43b' : '#ff6b6b';
        
        // Determine which stat is boosted (deck type or tribal)
        const attackBoosted = (card.deckType === 'angry' || card.attackEff > card.attack) ? 'boosted' : '';
        const speedBoosted = card.deckType === 'speedy' ? 'boosted' : '';
        const hpBoosted = card.deckType === 'hardy' ? 'boosted' : '';
        
        cardDiv.innerHTML = `
            <div class="card-mana-cost">
                <img src="images/mana.png" alt="Mana" class="card-mana-icon">
                <span class="card-mana-value">${card.cost}</span>
            </div>
            ${!card.hasAttacked ? '<div class="card-attack-indicator"><img src="images/swords.png" alt="Ready" class="attack-icon"></div>' : ''}
            <div class="card-name">${card.name}</div>
            <div class="card-image-container">
                <img src="images/${imageName}.png" alt="${card.name}" class="card-image" onerror="this.style.display='none'">
            </div>
            <div class="card-stats">
                <div class="stat ${attackBoosted}">
                    <span class="stat-label">ATK</span>
                    <span class="stat-value">${card.attackEff}</span>
                </div>
                <div class="stat ${speedBoosted}">
                    <span class="stat-label">SPD</span>
                    <span class="stat-value">${card.speed}</span>
                </div>
            </div>
            <div class="card-health-bar ${hpBoosted}">
                <div class="card-health-fill" style="width: ${healthPercent}%; background-color: ${healthBarColor};">
                    <span class="card-health-text">${card.currentHp}/${card.maxHp}</span>
                </div>
            </div>
        `;
        
        return cardDiv;
    }

    async animateCardStat(card, statType, glowColor = '#ffd700') {
        const cardElement = this.getCardElement(card);
        if (!cardElement) return;
        
        let statElement = null;
        
        if (statType === 'ATK') {
            const stats = cardElement.querySelectorAll('.stat');
            statElement = Array.from(stats).find(stat => stat.querySelector('.stat-label')?.textContent === 'ATK');
        } else if (statType === 'SPD') {
            const stats = cardElement.querySelectorAll('.stat');
            statElement = Array.from(stats).find(stat => stat.querySelector('.stat-label')?.textContent === 'SPD');
        } else if (statType === 'HP') {
            statElement = cardElement.querySelector('.card-health-bar');
        }
        
        if (statElement) {
            statElement.style.setProperty('--stat-glow-color', glowColor);
            statElement.classList.add('stat-animating');
            sfx.play('smallUnsheath');
            
            await this.sleep(800);
            
            statElement.classList.remove('stat-animating');
        }
    }

    async animateCardDeath(card) {
        const cardElement = this.getCardElement(card);
        if (cardElement) {
            cardElement.classList.add('card-dying');
            sfx.play('demonDeath', {volume: 0.6});
            await this.sleep(800);
        }
    }

    async slideCardsAfterDeath(player, deadCard) {
        const deadCardIndex = player.field.indexOf(deadCard);
        if (deadCardIndex === -1) return;
        
        this.cardsToSlide = new Set();
        for (let i = deadCardIndex + 1; i < player.field.length; i++) {
            if (player.field[i]) {
                this.cardsToSlide.add(player.field[i].id.toString());
            }
        }
        
        if (this.cardsToSlide.size > 0) {
            await this.sleep(100);
        }
    }

    async animateDeadCards(player) {
        const deadCards = player.field.filter(c => c && c.currentHp <= 0);
        if (deadCards.length > 0) {
            const animations = deadCards.map(card => this.animateCardDeath(card));
            await Promise.all(animations);
        }
    }

    sleep(ms) {
        const adjustedMs = fastAutoMode ? ms / 2 : ms;
        return new Promise(resolve => setTimeout(resolve, adjustedMs));
    }

    setTimeout(callback, ms) {
        const adjustedMs = fastAutoMode ? ms / 2 : ms;
        return setTimeout(callback, adjustedMs);
    }

    async playTurn() {
        this.turnNumber++;
        
        this.player1.field.forEach(card => {
            if (card) card.resetAttackState();
        });
        this.player2.field.forEach(card => {
            if (card) card.resetAttackState();
        });
        
        const p1ManaIncrease = Math.min(1, GAME_CONSTANTS.MAX_MANA - this.player1.maxMana);
        const p2ManaIncrease = Math.min(1, GAME_CONSTANTS.MAX_MANA - this.player2.maxMana);
        
        if (p1ManaIncrease > 0) {
            this.showManaGain('p1', p1ManaIncrease);
        }
        if (p2ManaIncrease > 0) {
            this.showManaGain('p2', p2ManaIncrease);
        }
        
        this.player1.increaseMana();
        this.player2.increaseMana();
        
        this.updateDisplay();
        await this.sleep(800);
        
        const p1TotalCards = this.player1.deck.length + this.player1.cardsOnField();
        const p2TotalCards = this.player2.deck.length + this.player2.cardsOnField();
        
        if (p1TotalCards === 0 && p2TotalCards > 0) {
            this.winner = this.player2.name;
            this.log(`💀 ${this.player1.name} has no cards remaining!`);
            this.showWinner();
            return;
        }
        
        if (p2TotalCards === 0 && p1TotalCards > 0) {
            this.winner = this.player1.name;
            this.log(`💀 ${this.player2.name} has no cards remaining!`);
            this.showWinner();
            return;
        }
        
        await this.drawPhase();
        await this.attackPhase();
        this.endTurn();
        this.updateDisplay();
    }
}

