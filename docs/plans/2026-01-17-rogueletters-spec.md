# RogueLetters Design Specification

> Generated from design interview on 2026-01-17

## Vision

A roguelike word puzzle game—"Balatro for Scrabble"—with 30-45 minute runs, meaningful build-crafting, and progression systems that reward mastery. The goal is to capture Balatro's addictive "one more run" feeling, build-crafting satisfaction, discovery loop, AND the joy of finding broken combos—all within a word-game format.

**Primary Design Concern**: Replayability. Runs must feel varied enough to sustain long-term engagement.

---

## Core Loop

### Structure
```
Run > Set > Round > Turn
- 5 Sets per run (victory at Set 5 completion)
- 3 Rounds per set
- 5 Turns per round (modifiable by boosts/effects)
- Round 3 of each set is a Boss Round (negative modifier)
```

### Targets (Current)
| Set | Round 1 | Round 2 | Round 3 (Boss) |
|-----|---------|---------|----------------|
| 1   | 40      | 60      | 80             |
| 2   | 100     | 150     | 200            |
| 3   | 250     | 375     | 500            |
| 4   | 650     | 975     | 1300           |
| 5+  | TBD     | TBD     | TBD            |

### Turn Mechanics
- Player has rack of 7 tiles (base, modifiable only by in-run boosts)
- Place tiles on board to form valid crossword-style words
- Submit to score, or exchange tiles
- **Exchange cost**: Costs coins equal to current set number (Set 1 = $1, Set 5 = $5)
- **No low-score warning**: Player is responsible for checking if word meets target
- **No unwinnable detection**: Play it out, no automatic forfeit offered

### Victory & Post-Victory
- Beating Set 5 = Victory
- Player choice at victory: "Retire victorious" OR "Continue for glory" (endless mode with escalating difficulty)

---

## Economy

### Coins (In-Run Currency)
- Earned each round: base payout + bonus for exceeding target
- Spent in shop between rounds
- Reset at run end

### Gems (Meta Currency)
- Earned at set completion (scales with set number)
- Persist forever across all runs
- Spent in Gem Shop for permanent upgrades
- **Reset option**: Spend 1 gem to reset all gem upgrades and try a different build

---

## Shop System

### Shop Screen
Appears after each round's earnings screen, before next round begins.

**6 Options per shop visit:**
1. **Tile Choice A** - Purchase a tile (Add to pool: cheaper, Replace existing: more expensive)
2. **Tile Choice B** - Second tile option
3. **Tile Set Upgrade** - Repeatable upgrade for current set (e.g., +1 to common letters)
4. **Boost Slot 1** - Random boost from pool
5. **Boost Slot 2** - Random boost from pool
6. **Boost Slot 3** - Random boost from pool

### Tile Purchases
- **Add option**: Tile joins draw pool (pool grows)
- **Replace option**: Swap for existing tile of same letter (pool stays fixed, higher cost)
- Both options available at different price points

### Tile Set Upgrades
- Always available in shop
- For Plastic set: +1 to random common letters
- **Unlimited purchases** with exponentially escalating cost
- Upgraded tiles show modified value with visual indicator (color/effect)

### Boosts

**Pool Structure:**
- Single pool (all boosts available from Round 1)
- Rarity tiers affect frequency: Common, Uncommon, Rare
- Many Rare and some Uncommon boosts require unlocking via achievements

**Boost Slots:**
- Player has maximum boost slots (TBD count)
- Boosts are **permanent for the run** once purchased
- When slots full, can **swap boost back to pool** (not destroyed) to take new one

**Current Boosts (Phase 2.5):**
- `extraTurn` - Overtime: +1 turn per round
- `extraRack` - Big Pockets: +1 rack capacity
- `basePayout` - Salary Bump: +$3 base payout
- `vowelBonus` - Vowel Power: +1 to all vowels

**Planned Boost Categories:**
- Score multipliers (letter bonuses, word length bonuses)
- Economy modifiers (coin generation, shop discounts)
- Turn/round modifiers
- High-risk/high-reward (e.g., disable word validation for big bonus)

---

## Boss Rounds

Round 3 of each set has a negative modifier.

**Reveal Timing**: Boss is revealed at set start (not surprise)
- Allows player to prepare in shop

**Example Boss Modifiers** (to be designed):
- Reduced rack size
- Cursed letter (must use specific letter each turn)
- No bonus squares
- Word restrictions (no 3-letter words)

---

## Tile System

### Tile Effects (Extensible via TILE_EFFECTS)
Tiles can have multiple effects simultaneously. Border goes to highest priority effect, all indicators display.

**Current Effects:**
- `buffed` - Enhanced value from shop upgrades
- `coin` - Gives bonus coins when played (**permanent**, always pays out)

**Planned Effects:**
- Pink (1.5x word multiplier)
- Red (+3 off special squares)
- Blue (+1 letter multiplier)
- Purple (+2 value, disappears if not played that turn)
- Black (+1 rack capacity while held)

### Tile Sets (Meta-Progression)
Unlocked via gems. **Each set has distinct playstyle**, not just cosmetic.

**Planned Sets:**
- Plastic (starter)
- Glass, Copper, Silver, Gold
- Ivory, Onyx, Ruby, Emerald, Amethyst
- Ghost, Glitch (high-risk mechanics)

---

## Board

### Layout
- Standard Scrabble-like bonus square arrangement
- **Fixed at run start**—always the same starting layout
- Boosts may modify board within a run

### Bonus Squares
- Double Letter (DL)
- Triple Letter (TL)
- Double Word (DW)
- Triple Word (TW)

---

## Meta-Progression (Gem Shop)

### What Persists Across Runs
- Gems (currency)
- Statistics (best run, total words, etc.)
- Unlocks/achievements

### Gem Shop Categories (Phase 4)
1. **Tile Sets** - Unlock new sets with distinct playstyles
2. **Starting Bonuses** - Begin runs with advantages
3. **Game Tweaks** - Rule modifications
4. **Board Enhancements** - Layout options

### Upgrade Philosophy
- Permanent investments (no individual refunds)
- **Full reset available**: Spend 1 gem to reset ALL upgrades
- Tiered upgrades (require previous tier)

---

## Unlock System

### Boost Unlocks
- Many boosts locked at start
- Unlocked by completing conditions (like Balatro joker unlocks)
- Examples: "Play a 7-letter word", "Score 500 in one turn", "Win a run"

### Progress Tracking
- **Depends on the unlock**:
  - Simple conditions may accumulate across runs
  - Impressive feats require completion in single run

### MVP Cut Option
If shipping early, boost unlock conditions can be cut (all boosts available from start).

---

## UI/UX

### HUD (Always Visible)
- Score / Target
- Turns remaining
- Current set/round
- Coins owned
- Active boosts

### Scoring Animation
- Show each boost's contribution **individually**
- Animation can speed up as more boosts are active

### Tile Display
- Upgraded tiles show modified value
- Color/effect indicates upgrade status
- All tile effect indicators visible (badges, glows)

### Potential Words Sidebar
- Shows all valid words currently formed on board
- **Safety net**: Prevents submitting invalid words
- Can be **disabled by specific boosts** (high-risk/high-reward design)
  - E.g., "Blindfold" boost: Disable validation, but +100 to all word scores

### End-of-Run Summary
- **Detailed stats breakdown**:
  - Words played, best word, longest word
  - Coins earned total
  - Sets/rounds completed
  - Gems earned
  - New unlocks achieved

---

## Balance Philosophy

### Power Ceiling
- **Potentially broken (fun)**: Allow degenerate combos for players who find them
- Balatro-style satisfaction of "breaking the game"
- Word game ceiling acknowledged—lean into creative boost design to compensate

### Target Scaling
- Must challenge even optimized builds
- Late-game targets should push limits

### Loss Experience
Player should feel both:
1. **Analytical**: "I should have done X differently"
2. **Progress-focused**: "At least I earned gems for next time"

---

## Technical Notes

### State Management
- `runState` - Run-level state (set, round, coins, boosts, tiles)
- `gameState` - Turn-level state (rack, board, score)
- `metaState` - Persistent state (gems, unlocks, stats) in localStorage

### Extensibility
- `TILE_EFFECTS` system for adding new tile types
- `BOOSTS` constant for adding new boosts
- Both designed for easy extension

---

## Implementation Phases

| Phase | Status | Key Features |
|-------|--------|--------------|
| 1. Core Loop | ✅ Complete | Sets, rounds, turns, targets |
| 2. Economy | ✅ Complete | Coins, earnings screens |
| 2.5 (Current) | ✅ Complete | Basic shop (2 tiles + 1 boost), 4 boosts |
| 3. Shop | 📋 Planned | Full 6-slot shop, tile set upgrade, boost pool |
| 4. Meta | 📋 Planned | Gems, gem shop, main menu, tile set unlocks |
| 5. Polish | 📋 Future | Boss rounds, boost unlocks, advanced tile effects |

---

## Open Questions

1. **Boost slot count**: How many permanent boost slots should player have?
2. **Set 5+ targets**: What are appropriate targets for endless mode?
3. **Specific boss designs**: What are the actual boss modifiers for each set?
4. **Tile set mechanics**: What makes Glass/Copper/etc. play differently?
5. **Rarity distribution**: What % of boosts are common/uncommon/rare?

---

## References

- `docs/plans/2025-12-06-rogueletters-roguelike-design.md` - Original design doc
- `docs/plans/2025-12-06-phase3-shop.md` - Phase 3 shop implementation plan
- `docs/plans/2025-12-06-phase4-meta-progression.md` - Phase 4 meta design
- `docs/plans/IDEAS.md` - Brainstorming scratchpad
- `.beads/issues.json` - Current tracked issues
