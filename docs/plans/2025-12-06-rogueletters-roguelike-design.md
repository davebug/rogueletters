# RogueLetters: Roguelike Design Document

**Date:** 2025-12-06
**Status:** Approved for implementation

## Overview

RogueLetters transforms WikiLetters into a roguelike experience, inspired by Balatro's treatment of poker. Players complete multiple rounds of the existing 5-turn word game, with escalating score targets, a shop for upgrades, and modifiers that change scoring rules.

## Core Concept

- **Balatro for Scrabble:** Take the proven WikiLetters word-placement gameplay and wrap it in roguelike progression
- **Run-based:** Each run is 8-10 rounds; fail to hit a target and the run ends
- **Build synergies:** Collect modifiers that stack and combo for high scores

## Architecture Decision

**Client-side run state** (like Balatro):
- All run state stored in browser localStorage
- Server only validates words (existing CGI, unchanged)
- Fast iteration, works offline, ship quickly
- Accept cheating risk for v1; can add server verification later

## Game Flow

```
START RUN
    └── Round 1 (Target: 80 points)
        ├── Play Hand (5 turns, existing WikiLetters gameplay)
        ├── Hit target? → Earn coins, advance
        └── Miss target? → GAME OVER
    └── Shop Phase
        ├── Choose 1 free reward from 3 options
        ├── View 3-4 purchasable upgrades
        └── Proceed when ready
    └── Round 2 (Target: 120 points)
        ... repeat ...
    └── Round 8 (Target: ~500 points)
        └── WIN → Show final score, offer to share
```

## Economy

### Income Sources

| Source | Amount | Notes |
|--------|--------|-------|
| Base payout | 5 coins | Every completed round |
| Surplus bonus | (score - target) ÷ 10 | Rewards exceeding target |
| Interest | +1 per 10 held, max +5 | Rewards hoarding |

### Example Round
- Target: 120, Score: 180, Holding: 30 coins
- Base: 5 coins
- Surplus: (180-120) ÷ 10 = 6 coins
- Interest: 30 ÷ 10 = 3 coins
- **Total: 14 coins**

### Design Rationale
- Players always use all 5 turns (consistent experience)
- Surplus rewards skill, not just "good enough"
- Interest creates strategic tension: spend vs. hoard

## Target Scaling

| Round | Target | Multiplier |
|-------|--------|------------|
| 1 | 80 | - |
| 2 | 112 | 1.4× |
| 3 | 157 | 1.4× |
| 4 | 220 | 1.4× |
| 5 | 308 | 1.4× |
| 6 | 431 | 1.4× |
| 7 | 604 | 1.4× |
| 8 | 845 | 1.4× |

*Note: Numbers will need balancing through playtesting*

## Shop & Rewards

### Free Reward Pick (after each round)
Choose 1 of 3 random modifiers. No cost, always happens.

### Shop
3-4 items available each round:
- **Modifiers:** Permanent scoring effects
- **Consumables:** One-time use (skip round, reroll shop)
- **Boosts:** Permanent stat increases

**Reroll:** Spend 5 coins to get new shop offerings.

## Modifier System

### Modifier Types

| Type | Example | Effect |
|------|---------|--------|
| Letter Boost | "Golden Q" | Q tiles worth 3× points |
| Word Bonus | "Long Haul" | +20 points for 6+ letter words |
| Multiplier | "Double Down" | 2× score on first word each hand |
| Tile Effect | "Lucky 7" | 7th tile placed gives +15 bonus |
| Combo | "Vowel Harmony" | +5 for each vowel in a word |

### Rarity Tiers
- **Common:** Small bonuses (+5, +10, minor effects)
- **Uncommon:** Stronger effects (1.5×, letter-specific boosts)
- **Rare:** Powerful (2×, conditional multipliers)

### Stacking Rules
1. Calculate base word score (existing WikiLetters logic)
2. Apply additive bonuses (+5, +10, etc.)
3. Apply multipliers (multiply together)
4. Round to integer

### Example
- Word "QUIZ" = 22 base points
- "Golden Q" (3× Q value): +20 extra
- "Double Down" (2× first word): ×2
- Final: (22 + 20) × 2 = **84 points**

## UI Changes

### During Hand
```
┌────────────────────────────────────────────────┐
│  RogueLetters          Round 3/8    💰 47      │
│                        Target: 180             │
├────────────────────────────────────────────────┤
│           [ Existing WikiLetters Board ]       │
│              [ Existing Tile Rack ]            │
├────────────────────────────────────────────────┤
│  Active Modifiers:                             │
│  🟡 Golden Q  🔵 Long Haul  🟢 Vowel Flow      │
├────────────────────────────────────────────────┤
│  Score: 95          Target: 180                │
│  ████████░░░░░░░░░░░░░░░░░░░░░  (53%)         │
└────────────────────────────────────────────────┘
```

### New Screens Needed
- Run start / menu
- Shop phase
- Reward pick
- Round complete
- Game over (failed run)
- Run complete (victory)

## Code Structure

```javascript
// Run state in localStorage
runState = {
  round: 1,
  coins: 0,
  targetScore: 80,
  abilities: [],
  inventory: [],
  seed: Date.now()
}

// New: Run manager wraps existing game
const runManager = {
  state: runState,
  startRun(),
  onHandComplete(score),
  showShop(),
  showRewardPick(),
  checkWinLose()
}

// Existing WikiLetters game logic - mostly untouched
```

## Reuse from WikiLetters

**Unchanged:**
- Board and tile rack UI
- Word placement mechanics
- Word validation (server CGI)
- Base scoring logic
- Shuffle, recall, submit buttons

**Modified:**
- Scoring display (add modifier effects)
- Game complete flow (check target, not just end game)
- Header/footer (add run info)

## Phased Implementation

### Phase 1: Vertical Slice
Bare minimum to prove the loop:
- 3 rounds with targets (80 → 120 → 180)
- Existing 5-turn hand gameplay
- Hit target → advance, miss → game over
- No shop, no modifiers, no coins
- Simple UI: round counter, target display, win/lose screens

**Goal:** Validate that run structure feels fun

### Phase 2: Economy
- Add coins (base + surplus scoring)
- Add interest mechanic
- Display coin counter
- Still no shop (just accumulate)

**Goal:** Validate economy math works

### Phase 3: Shop & Rewards
- Between-round shop screen
- Free reward pick (choose 1 of 3)
- Purchasable items (placeholder effects)
- Reroll mechanic

**Goal:** Validate pacing is right

### Phase 4: Modifiers
- Implement modifier system
- Start with 5-6 basic modifiers
- Modifiers affect scoring
- Display active modifiers

**Goal:** Validate modifiers are fun and balanced

### Phase 5: Polish & Expand
- More modifiers (15-20 total)
- Rarity tiers
- Balance tuning
- Expand to 8 rounds
- Visual polish

## Meta-Progression (Future)

Not in v1, but design to support:
- Unlockable modifiers (win runs to unlock new ones)
- Different starting decks/tile distributions
- Challenge modes (seeded runs, daily challenges)

## Open Questions for Playtesting

1. Is 1.4× scaling too aggressive or too easy?
2. Should coins carry between rounds or reset?
3. How many modifiers before it's overwhelming?
4. What's the right shop size (3 vs 4 vs 5 items)?
5. Should there be a way to remove modifiers?

## Success Criteria

- Runs feel meaningfully different based on modifier choices
- Clear sense of progression through rounds
- Strategic depth in shop decisions
- "One more run" appeal
