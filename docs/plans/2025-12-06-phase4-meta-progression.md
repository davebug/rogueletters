# Phase 4: Meta-Progression (Gems & Permanent Upgrades)

**Date:** 2025-12-06
**Status:** Brainstorming
**Depends on:** Phase 3 (Shop)

## Overview

Add meta-progression to RogueLetters. Players earn gems by completing sets, which persist forever across runs. Gems are spent in a Gem Shop (accessible only between runs) on permanent upgrades that affect all future runs.

This is what makes it feel like a roguelike — progress even when you lose.

## Core Concepts

### Two Currencies

| Currency | Earned | Spent | Persists |
|----------|--------|-------|----------|
| Coins ($) | Each round | In-run shop | Within run only |
| Gems (◆) | Each set completion | Gem shop | Forever |

### Gem Economy

**Earning Gems:**
| Event | Gems |
|-------|------|
| Complete Set 1 | 1 |
| Complete Set 2 | 2 |
| Complete Set 3 | 3 |
| Complete Set 4 | 4 |
| Complete Set 5 (Victory) | 5 |
| Full run bonus | +5 |

- Full winning run = 1+2+3+4+5+5 = **20 gems**
- Loss at Set 3 = 1+2 = **3 gems** (still progress!)
- Loss at Set 1 Round 2 = **0 gems** (must complete a set)

**Design Note:** Gems are earned at set completion, shown on the Set Complete screen. This creates a satisfying "bank the gems" moment before moving on.

## Game Flow Changes

### Current Flow (Phase 3)
```
[Game starts immediately]
  └── Run → Rounds → Shop → ... → Victory/Defeat → [Refresh to restart]
```

### New Flow (Phase 4)
```
Main Menu
  ├── Start Run → Run → ... → Run Ends → [Gems earned] → Main Menu
  └── Gem Shop → Browse/buy permanent upgrades → Main Menu
```

## UI Components

### 1. Main Menu (New Screen)

First thing players see. Simple, dark, matches roguelike theme.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     ROGUELETTERS                            │
│                                                             │
│                    ◆ 47 gems                                │
│                                                             │
│                  [ Start Run ]                              │
│                                                             │
│                  [ Gem Shop ]                               │
│                                                             │
│              ─────────────────────                          │
│              Best Run: Set 4 Round 2                        │
│              Total Runs: 23                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Elements:**
- Title
- Gem counter (always visible)
- Start Run button → begins a new run
- Gem Shop button → opens gem shop
- Stats (optional): best run, total runs played

### 2. Set Complete Screen (Modified)

Add gem earning display to existing Set Complete screen:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     SET 2 COMPLETE                          │
│                                                             │
│                  ┌─────────────────┐                        │
│                  │  ◆ +2 gems      │                        │
│                  │  Bank: 12 → 14  │                        │
│                  └─────────────────┘                        │
│                                                             │
│                  [ Continue to Set 3 ]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Note:** No "total score" displayed — it doesn't affect gameplay. The gem moment is the focus.

### 3. Run Complete Screens (Modified)

**Victory Screen:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      VICTORY!                               │
│                                                             │
│              You completed all 5 sets!                      │
│                                                             │
│              ┌─────────────────────────┐                    │
│              │  Gems Earned This Run   │                    │
│              │  ─────────────────────  │                    │
│              │  Set 1:        ◆ 1      │                    │
│              │  Set 2:        ◆ 2      │                    │
│              │  Set 3:        ◆ 3      │                    │
│              │  Set 4:        ◆ 4      │                    │
│              │  Set 5:        ◆ 5      │                    │
│              │  Victory bonus: ◆ 5     │                    │
│              │  ─────────────────────  │                    │
│              │  Total:        ◆ 20     │                    │
│              │                         │                    │
│              │  Gem Bank: 47 → 67      │                    │
│              └─────────────────────────┘                    │
│                                                             │
│                  [ Return to Menu ]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Defeat Screen:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     RUN FAILED                              │
│                                                             │
│              Failed at Set 3, Round 2                       │
│                                                             │
│              ┌─────────────────────────┐                    │
│              │  Gems Earned This Run   │                    │
│              │  ─────────────────────  │                    │
│              │  Set 1:        ◆ 1      │                    │
│              │  Set 2:        ◆ 2      │                    │
│              │  ─────────────────────  │                    │
│              │  Total:        ◆ 3      │                    │
│              │                         │                    │
│              │  Gem Bank: 47 → 50      │                    │
│              └─────────────────────────┘                    │
│                                                             │
│                  [ Return to Menu ]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4. Gem Shop (New Screen)

Grid of purchasable permanent upgrades. Owned items show checkmarks.

```
┌─────────────────────────────────────────────────────────────┐
│  [ ← Back ]                                    ◆ 47 gems    │
├─────────────────────────────────────────────────────────────┤
│                        GEM SHOP                             │
│                                                             │
│  TILE SETS                                                  │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│  │ Glass         │ │ Copper        │ │ Ivory         │     │
│  │               │ │               │ │               │     │
│  │ ◆ 15          │ │ ◆ 20          │ │ ◆ 25          │     │
│  │ [ Unlock ]    │ │ [ Unlock ]    │ │ 🔒 Locked     │     │
│  └───────────────┘ └───────────────┘ └───────────────┘     │
│                                                             │
│  STARTING BONUSES                                           │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│  │ Nest Egg I    │ │ Nest Egg II   │ │ Head Start    │     │
│  │ Start +$3     │ │ Start +$5     │ │ Random mod    │     │
│  │ ✓ Owned       │ │ ◆ 10          │ │ ◆ 30          │     │
│  └───────────────┘ └───────────────┘ └───────────────┘     │
│                                                             │
│  GAME TWEAKS                                                │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│  │ Sixth Sense   │ │ Big Hands     │ │ Generous      │     │
│  │ +1 turn/round │ │ +1 tile/rack  │ │ Targets -10   │     │
│  │ ◆ 50          │ │ ◆ 50          │ │ ◆ 40          │     │
│  └───────────────┘ └───────────────┘ └───────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click unlocked item → Purchase confirmation → Deduct gems
- Click owned item → Shows "Already owned"
- Click locked item → Shows unlock requirements
- Insufficient gems → Item appears dimmed, shows "Need ◆ X more"

**Upgrade Tiers:**
Some items have tiers (I → II → III). Must own previous tier to buy next.

## State Management

### New: Meta State (persists forever)

```javascript
const metaState = {
  gems: 0,
  totalRuns: 0,
  bestRun: { set: 0, round: 0 },

  // Permanent upgrades owned
  upgrades: {
    // Tile sets: 0 = locked, 1/2/3 = tier owned
    tileSets: {
      glass: 0,
      copper: 0,
      ivory: 0,
      obsidian: 0
    },

    // Starting bonuses
    nestEgg: 0,        // 0/1/2/3 = none/$3/$5/$8
    headStart: false,
    loadedRack: false,

    // Pool expansions
    deepPockets: false,
    wordsmith: false,
    architect: false,

    // Game tweaks
    sixthSense: false,  // +1 turn per round
    bigHands: false,    // +1 tile in rack
    generousTargets: false,  // -10 all targets
    interest: false,    // +1 per $10 between rounds

    // Board enhancements
    reinforcedLetters: false,  // DL ×2.5
    fortifiedWords: false,     // DW ×2.5
    tripleThreat: false,       // TL ×3.5
    powerWords: false          // TW ×3.5
  }
};
```

**Storage:** `localStorage.setItem('rogueletters_meta', JSON.stringify(metaState))`

Separate from `runState` which resets each run.

### Run State Changes

Add gem tracking to `runState`:

```javascript
runState: {
  // ... existing fields ...
  gemsEarnedThisRun: 0,  // Accumulates as sets complete
  setsCompleted: []       // [1, 2] = completed sets 1 and 2
}
```

## Implementation Tasks

### 1. Meta State System

- [ ] Create `metaState` object structure
- [ ] Add `loadMetaState()` / `saveMetaState()` functions
- [ ] Initialize on first visit (gems: 0, no upgrades)
- [ ] Never reset (separate from run state)

### 2. Main Menu Screen

- [ ] Add HTML structure for main menu
- [ ] Style to match roguelike theme
- [ ] Show gem count
- [ ] "Start Run" button → hides menu, starts run
- [ ] "Gem Shop" button → shows gem shop
- [ ] Show on page load (not during active run)
- [ ] Show after run ends

### 3. Gem Earning

- [ ] Calculate gems at set completion (set number = gems)
- [ ] Add victory bonus (+5) on Set 5 completion
- [ ] Update `metaState.gems` immediately (don't wait for run end)
- [ ] Track `gemsEarnedThisRun` in runState
- [ ] Display gems earned on Set Complete screen
- [ ] Display gem summary on Victory/Defeat screens

### 4. Gem Shop Screen

- [ ] Add HTML structure for gem shop
- [ ] Grid layout for upgrade cards
- [ ] Show gem cost, owned status, locked status
- [ ] Purchase flow: click → confirm → deduct gems → update state
- [ ] Dim items player can't afford
- [ ] Handle tiered upgrades (must own previous tier)
- [ ] Back button → return to main menu

### 5. Apply Permanent Upgrades

Upgrades must affect gameplay:

- [ ] `nestEgg`: Add starting coins in `startNewRun()`
- [ ] `headStart`: Add random modifier at run start
- [ ] `sixthSense`: `turnsPerRound = 6` instead of 5
- [ ] `bigHands`: `rackSize = 8` instead of 7
- [ ] `generousTargets`: Subtract 10 from all target calculations
- [ ] `interest`: Add bonus coins between rounds
- [ ] Board multiplier upgrades: Modify DL/DW/TL/TW calculations
- [ ] Tile set unlocks: Enable in Phase 3 shop

### 6. Run End Flow

- [ ] Victory → Show gem summary → "Return to Menu" button
- [ ] Defeat → Show gem summary → "Return to Menu" button
- [ ] Remove "Try Again" (goes to menu instead)
- [ ] Update `metaState.totalRuns` and `metaState.bestRun`

### 7. Stats Tracking (Optional)

- [ ] Track total runs played
- [ ] Track best run (furthest set/round)
- [ ] Display on main menu
- [ ] Consider: lifetime stats screen?

## Pricing Guide (Tentative)

| Upgrade | Cost | Notes |
|---------|------|-------|
| Tile Set Unlock | ◆ 15-25 | Glass cheaper, Obsidian expensive |
| Tile Set Upgrade (II) | ◆ 20 | Must own base |
| Tile Set Upgrade (III) | ◆ 30 | Must own II |
| Nest Egg I ($3) | ◆ 5 | Cheap starter |
| Nest Egg II ($5) | ◆ 10 | Must own I |
| Nest Egg III ($8) | ◆ 20 | Must own II |
| Head Start | ◆ 30 | Random modifier at start |
| Pool Expansions | ◆ 15 each | Unlock shop pools |
| Game Tweaks | ◆ 40-50 | Expensive, powerful |
| Board Enhancements | ◆ 25-35 | Moderate power |

**Balance Goal:**
- First useful upgrade: ~5-10 runs (even with losses)
- Full unlock: 50+ runs
- Should always feel like there's something to work toward

## Testing Checklist

- [ ] Main menu shows on first visit
- [ ] Start Run → begins game, hides menu
- [ ] Complete Set 1 → earn 1 gem, shown on Set Complete screen
- [ ] Gems persist after page refresh
- [ ] Gems persist after run ends
- [ ] Run failed → shows gem summary → return to menu
- [ ] Victory → shows full gem breakdown (+5 bonus) → return to menu
- [ ] Gem Shop shows all upgrades with correct prices
- [ ] Can purchase upgrade when gems sufficient
- [ ] Cannot purchase when gems insufficient (dimmed)
- [ ] Purchased upgrades show as owned
- [ ] Tiered upgrades require previous tier
- [ ] Permanent upgrades affect gameplay:
  - [ ] Nest Egg adds starting coins
  - [ ] Sixth Sense gives 6 turns per round
  - [ ] Big Hands gives 8 tiles in rack
  - [ ] Generous Targets reduces all targets by 10
  - [ ] Board upgrades change multipliers

## Files to Create/Modify

**New:**
- `meta.js` — Meta state management (or add to script.js)

**Modify:**
- `script.js` — Game flow, upgrade effects
- `index.html` — Main menu, gem shop HTML
- `styles.css` — Main menu, gem shop styling

## Out of Scope

- Prestige / New Game+ (Phase 5+)
- Ascension levels
- Achievements
- Leaderboards

## Open Questions

- Should gem shop be scrollable or paginated if many upgrades?
- Purchase confirmation popup or instant buy?
- Sound effects for gem earning / spending?
- Should there be a "reset progress" option?
- How to handle backwards compatibility if player has existing runs?
