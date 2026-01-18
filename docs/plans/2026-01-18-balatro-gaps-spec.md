# Balatro Gaps Specification

> Generated from deep-dive interview on 2026-01-18

This spec addresses the 7 gap areas identified in the Balatro analysis, transforming RogueLetters from a straightforward word game into a roguelike with emergent builds, risk/reward tension, and long-term progression.

---

## 1. Rogue Synergies

### Philosophy
- Synergies are **hidden** - players discover combos through experimentation, not tooltips
- **Mix of interaction patterns**: trigger chains, conditional multipliers, resource generators
- **Pure enabler rogues** are critical - rogues that do nothing alone but unlock combos
- Rogue **slot position does NOT matter** - simpler system
- **Embrace broken combos** - 10x+ normal power ceiling is the goal

### New Synergy Rogues

#### The Echo
- **Effect**: Doubles another rogue's effect
- **Mechanic**: Player chooses which rogue to echo at **start of each round** (defaults to previous choice)
- **Rarity**: Rare

#### The Collector
- **Effect**: ×1.1 multiplier per rogue owned (×1.5 at max 5 rogues)
- **Synergy**: Rewards having many rogues
- **Rarity**: Uncommon

#### The Minter (buff-creator)
- **Effect**: Your 7th rack tile is always created with +1 buff
- **Synergy**: Combos with High Value (+1 per buffed tile)
- **Rarity**: Common

#### The Miser (contrarian)
- **Effect**: +$2 for each turn you use 1, 2, or 3 tiles
- **Synergy**: Combos with Lone Ranger for small-word economy build
- **Rarity**: Uncommon

#### The Opener (timing)
- **Effect**: ×2 multiplier on Turn 1 of each round
- **Synergy**: Rewards saving best word for round start
- **Rarity**: Rare

#### The Hoarder (state-based)
- **Effect**: Start each round with 1 point per $1 owned
- **Synergy**: Creates tension between spending coins and keeping them
- **Rarity**: Uncommon

### Multiplier Rogues (4-5 total for stacking)

Target: Enable 10x+ power through multiplicative stacking

1. **Worder** (existing): ×1.02 per unique letter played this run
2. **Word Length Mult**: ×1.1 per letter in word (×1.7 for 7-letter)
3. **Bonus Square Mult**: ×1.2 per bonus square used (DL/TL/DW/TW)
4. **Vowel Mult**: ×1.15 per vowel in word
5. **Consonant Mult**: ×1.15 per consonant in word

Multipliers **animate in sequence** during scoring (like Balatro).

### Rogue Editions

Editions are **very rare (~5%)** - exciting finds when they appear.

| Edition | Effect | Visual |
|---------|--------|--------|
| **Negative** | Doesn't count toward 5-slot limit | Dark/inverted |
| **Shadowy** | Adds ×mult to the rogue's effect | Purple glow |
| **Gilded** | Adds +coins to the rogue's effect | Gold border |
| **Corrupted** | 2× power, but can't discard it ever | Red corruption |

Any rogue can appear as any edition (randomly determined at shop generation).

---

## 2. Build Diversity

### 7 Archetypes

Builds are **emergent from RNG** - players adapt to what rogues appear. No explicit typing in UI - **flavor only** (names/art suggest affinity).

| Build | Core Rogues | Playstyle |
|-------|-------------|-----------|
| **Length** | Wolf Pack, Big Pockets, Word Length Mult | Long words, maximize tiles |
| **Economy** | Miser, Hoarder, Gilded rogues | Coin generation, late-game power |
| **Mult Stacking** | Worder + mult rogues, Shadowy editions | Multiplicative scaling |
| **Vowel** | Vowel Mult, +points per vowel rogues | Vowel-heavy words |
| **Small Word** | Lone Ranger, Miser, Endless Power | Volume over size |
| **Bonus Square** | Bonus Square Mult, board manipulators | Maximize DL/TL/DW/TW |
| **Hybrid** | Flexible rogues, The Collector | Adapt to offerings |

### Small Word Build Win Condition
- **Volume wins**: More turns (Endless Power) = more small words = more total points
- **Multipliers scale**: Small word mults stack high enough to compete
- Both paths viable simultaneously

### Vowel Build Mechanics
- Flat bonus rogues: +N points per vowel
- Multiplier rogues: ×mult per vowel
- Stack both for scaling power

### Bonus Square Build Mechanics
- Rogue that **adds** a random DL/TL each round
- Rogue that **upgrades** DL→TL or DW→TW

### Rogue Pool Size
- **40+ rogues** at launch
- **3 rogues per shop** (unchanged)
- Deep pool ensures runs feel different

---

## 3. Boss Tension

### Boss Reveal Timing
- Boss shown at **start of Set**
- Rounds 1-2 are preparation time
- Creates anticipation and strategic planning

### Boss Pool
- **15-20 bosses** total
- Most can appear in any Set
- Some are **late-game only** (Sets 4-5)
- **Once per Set** reroll maximum (via rogue)

### Boss Effect Categories

**Letter Restrictions:**
- **The Mumbler**: Vowels contribute 0 points (but still form valid words)
- **The Silencer**: Specific letters disabled

**Mechanic Restrictions:**
- **The Anchor**: One tile is always selected (can't unselect, must use in exchange or word)
- **The Editor**: Max 4 tiles placed per turn

### Boss Counters
- **No direct counters** for specific bosses
- **One rogue** can disable ALL boss effects (rare, expensive)
- Some rogues allow **boss reroll** (once per Set)

### Boss Rewards
- Standard round earnings ($3/$4/$5) apply
- No boss-specific bonus

---

## 4. Risk/Reward

### Shop Gambles
- **25% chance** for shops to have a "Gambler" section
- Strategic bets with concrete tradeoffs:
  - "Lose one turn next round, but +$5 if you win the round"
  - "Can't buy anything this Set, but +$15 if you beat the Set"

### Risky Rogues
- **Upkeep cost**: Some rogues cost $1/round to maintain
- **Corrupted edition**: 2× power but can't discard

### Lucky Tiles
- **Tile enhancement** (not separate tile type)
- Any tile can become Lucky via rogue or shop purchase
- Chance for big bonus when played

---

## 5. Tile Sets

### Overview
- **14 tile sets** with distinct mechanics
- **Passive effect** + **purchasable buff** per set
- Chosen at **start of run only** (locked in)
- Unlocked via **gems** (meta-progression)
- **Plastic** is the starter set (available immediately)

### Tile Set Catalog

| Set | Passive | Always-Available Buff |
|-----|---------|----------------------|
| **Plastic** | +1 point to rare letters (J/Q/X/Z) | +1 to 3 tiles of choice |
| **Wood** | +1 point to vowels | +3 to vowels (choose which 3) |
| **Stone** | +1 per consonant ÷ vowel count in word | Get 1 consonant of choice |
| **Glass** | 2× score but 50% chance to lose tile | Recover all broken tiles |
| **Copper** | 2×2 tile grid retriggers all 4 tiles | +2 per 2×2 grid formed |
| **Silver** | ×1.5 for words under 5 letters | +3 to 1 random tile |
| **Gold** | Start run with $10 | +$1 per play to random tile |
| **Ivory** | +$1/round, but 30% surplus rate | -2.5% surplus per $ |
| **Onyx** | +1 tile in rack | +1 per letter over 4 in word |
| **Ruby** | See next tile coming | +2 if word intersects previous |
| **Emerald** | +1 gem for Sets 3, 4, 5 beaten | +1 gem if you win (1×/set, Sets 1-3 only) |
| **Amethyst** | +1 shop option for rogues | +2 per rogue owned |
| **Ghost** | A/E interchangeable, I/O/U interchangeable, vowels -1 | Transform random letter to choice |
| **Glitch** | Random letter distribution (50%-200%) | Random buff from another set (changes each round) |

---

## 6. Discovery & Unlocks

### Unlock Breakdown
- **Tile Sets**: All locked except Plastic (unlocked via gems)
- **Rogues**: ~33% available at start, rest unlock via achievements (some via gems)

### Achievement Visibility
- **Easy achievements**: Visible requirements
- **Hard achievements**: Hints only ("Play an impressive word")

### Mid-Run Unlocks
- **Notification only** ("New rogue unlocked!")
- Available in **next run**, not current run

### Prestige Unlocks
- **Extreme achievements** exist for chase goals
- "Win 10 runs" or "Score 10000 in one turn" for rare rogues
- Mechanical rewards, not just cosmetic

---

## 7. One More Run Loop

### Already Strong
- 5 Sets × 3 Rounds creates good pacing
- Run length is appropriate

### Enhancements
- **Variety** through 40+ rogues and 14 tile sets
- **End-of-run summary** tells the story of your build (rl-19, implemented)
- **Emergent builds** ensure runs feel different

---

## Implementation Priority

| Feature | Complexity | Dependencies |
|---------|------------|--------------|
| Synergy rogues | Medium | Rogue system exists |
| Multiplier stacking + animation | Medium | Scoring animation exists |
| Rogue editions | Low | Rogue system exists |
| Boss system | High | UI for boss display |
| Tile sets | High | Meta-progression (gems) |
| Shop gambles | Low | Shop exists |
| Unlock system | Medium | Meta-progression (gems) |

### Suggested Order
1. Synergy rogues (adds depth to existing system)
2. Multiplier rogues + stacking animation
3. Boss system (Round 3 effects)
4. Rogue editions
5. Shop gambles (25% chance)
6. Tile sets (requires gem system)
7. Unlock system (requires gem system)

---

## References

- `docs/plans/2026-01-18-balatro-analysis.md` - Original gap analysis
- `docs/plans/2026-01-18-rogues-spec.md` - Current rogue system
- `docs/plans/2026-01-18-rogueletters-spec.md` - Overall game spec
