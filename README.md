# Deterministic Card Battle: Rules & Mechanics Guide



**Version:** 1.3 (Tribal Synergy Update)

**Last Updated:** October 2025

**Author:** Jacob Wall & Eliza Sillesky



---



## 🎯 Overview



Deterministic Card Battle is a **turn-based strategy card game** where two players summon units to a shared battlefield and compete to reduce the opponent's HP to zero.

The game emphasizes **resource management**, **strategic deployment**, and **predictable combat resolution** — there's no randomness once the cards are played.



---



## 🧱 Core Concepts



* **Players:** Two players, each start with 100 HP.

* **Decks:** Each player uses a 20-card deck containing various unit types.

* **Units:** Each card has attributes: HP (health), Attack (damage), Speed (attack order), and Cost (mana required to summon).



---



## 💠 Game Constants



| Constant      | Value | Description                                |

| ------------- | ----- | ------------------------------------------ |

| MAX_PLAYER_HP | 100   | Starting health for both players.          |

| MAX_MANA      | 10    | Maximum mana a player can have.            |

| STARTING_MANA | 3     | Mana available at game start.              |

| DECK_SIZE     | 20    | Number of cards per deck.                  |

| FIELD_SIZE    | 5     | Maximum number of active units per player. |



---



## 🪄 Turn Structure



Each game consists of repeated turns until one player's HP reaches zero. Each turn has four phases:



1. **Deployment Phase** — Players summon units from the top of their deck using available mana until they do not have enough to play the next card (up to 5 on the field).

2. **Combat Preparation Phase** — Each unit's effective attack and speed are recalculated, including bonuses.

3. **Combat Phase** — Units with a higher speed attack first in order. If there's a tie, order is randomized slightly. Units defeated during combat are removed from the board immediately.

4. **Cleanup Phase** — Each player gains +1 mana.



---



## 🎯 Targeting Logic



| Strategy            | Behavior                                                                                              |

| ------------------- | ----------------------------------------------------------------------------------------------------- |

| **Optimize Damage** | Attacks the target whose remaining HP is closest to the unit's attack damage.                         |

| **Kill Shot**       | Prioritizes killing blows; attacks the highest HP enemy if no kill is possible.                       |

| **Target Mana**     | Prioritizes the highest-cost enemy unit; if there is a tie, target the tied unit with the highest HP. |



---



## 💎 Flavors (Unit Variants)



Each card can have a **flavor** modifier that adjusts its stats:



| Flavor     | Effect      | Description             |

| ---------- | ----------- | ----------------------- |

| **Speedy** | +6 Speed    | Acts faster each round. |

| **Hardy**  | +21% HP     | More survivable.        |

| **Angry**  | +20% Attack | Stronger offense.       |



---



## ⚙️ Unit Archetypes



| Type     | HP  | Attack | Speed | Cost | Role                       |

| -------- | --- | ------ | ----- | ---- | -------------------------- |

| Goblin   | 30  | 15     | 35    | 1    | Fast, cheap swarm attacker |

| Skeleton | 75  | 30     | 15    | 2    | Durable swarm defender     |

| Archer   | 90  | 44     | 30    | 4    | Midrange sniper            |

| Wizard   | 120 | 82     | 25    | 6    | Heavy ranged damage dealer |

| Knight   | 244 | 127    | 20    | 8    | Tanky, high-impact closer  |



---



## 🧬 Tribal Synergy System (v1.3)



### Goblin — *Mob Mentality*



* Each Goblin's **Attack** increases when more Goblins are alive on the same side.

* Bonus: **+8% Attack per effective extra Goblin**, using a soft cap system.



**Soft Cap Explanation:**



* Full bonus for the first two extra Goblins (3 total Goblins).

* Any Goblins beyond that give only half benefit.



  * Example: 4 Goblins = +24% Attack, 5 Goblins = +28% Attack.



**Applied:** Each combat round.



---



### Skeleton — *Bone Wall*



* Each Skeleton gains bonus **HP** when deployed, based on other Skeletons already alive.

* Bonus: **+20% HP per effective extra Skeleton**, also using the soft cap.



**Applied:** On deploy (not recalculated each turn).



* 1 Skeleton = 100% base HP

* 3 Skeletons = +40% HP for the third

* 4 Skeletons = +60% HP for the fourth



---



## 🧭 Victory Conditions



A player wins if:



* The opponent's HP reaches 0, **or**

* The opponent has no deployable units or cards remaining.



If both players reach 0 HP simultaneously → **Draw**.



---

