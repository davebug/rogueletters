# Phase 2: Economy Implementation Plan

**Date:** 2025-12-06
**Status:** Ready to implement

## Overview

Add coin economy to RogueLetters. Players earn coins after each round based on performance. No spending yet — that comes in Phase 3 (Shop).

## Economy Rules

### Base Payout (per round in a set)
| Round | Payout |
|-------|--------|
| 1     | $3     |
| 2     | $4     |
| 3     | $5     |

### Surplus Bonus
- +$1 for every 10 points above the target
- Formula: `Math.floor((score - target) / 10)`
- Example: Score 95, Target 60 → Surplus 35 → +$3

### No Interest
Keeping it simple. Coins just accumulate.

## UI Changes

### Header Update
Add coin display to header:
```
Set 1  |  Round 2/3  |  Turn 3/5  |  $12
```

### Earnings Screen (Full Page)
After round complete, replace game board with earnings screen:

```
┌─────────────────────────────────────────────────────────────┐
│  [Header stays visible: Set 1 | Round 1/3 | $6]            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     ROUND COMPLETE                          │
│                                                             │
│              Score: 95    Target: 60                        │
│              ─────────────────────────                      │
│              Surplus: +35 points                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  EARNINGS                                            │   │
│  │  ─────────                                           │   │
│  │  Round bonus:     $3                                 │   │
│  │  Surplus bonus:   $3  (+35 pts ÷ 10)                │   │
│  │                   ──                                 │   │
│  │  Total earned:    $6                                 │   │
│  │                                                      │   │
│  │  Bank: $0 → $6                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│              [ Continue ]                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Footer stays visible]                                     │
└─────────────────────────────────────────────────────────────┘
```

**Continue button:**
- If more rounds in set → Start next round
- If set complete → Show Set Complete screen (full page, same style)
- If run complete (Set 5 R3) → Skip earnings, go straight to Victory screen

**Header during earnings screen:**
Shows "Round Complete" instead of "Round 2/3"

**Surplus messaging:**
- Score > target: "Surplus: +35 points"
- Score = target: "Target reached!" (no surplus line, but still show base payout)

### Screen Visibility States

| State | Game Board | Full Screens | Popups |
|-------|------------|--------------|--------|
| Playing | Visible | Hidden | Hidden |
| Round Complete | Hidden | Earnings Screen | Hidden |
| Set Complete | Hidden | Set Complete Screen | Hidden |
| Run Failed | Hidden | Hidden | Run Failed Popup |
| Victory (Set 5 R3) | Hidden | Hidden | Victory Popup |

**Note:** Set Complete is now a full screen (same style as earnings), not a popup.
Run Failed and Victory remain as popups (existing implementation).

### Bank Animation

When showing "Bank: $6 → $12":
- Start with old value
- Count up to new value over ~1 second
- Satisfying "cha-ching" feel

## Implementation Tasks

### 1. State Changes

Add to `runState`:
```javascript
coins: 0,           // Current bank balance
lastEarnings: {     // Most recent round earnings (for display)
  base: 0,
  surplus: 0,
  total: 0
}
```

### 2. Earnings Calculation

New function in `runManager`:
```javascript
calculateEarnings(score, target, roundInSet) {
  const basePayout = [3, 4, 5][roundInSet - 1];  // $3, $4, $5
  const surplus = Math.max(0, score - target);
  const surplusBonus = Math.floor(surplus / 10);

  return {
    base: basePayout,
    surplus: surplusBonus,
    total: basePayout + surplusBonus,
    surplusPoints: surplus
  };
}
```

### 3. HTML Structure

Add new section to `index.html`:
```html
<div id="earnings-screen" class="full-screen hidden">
  <div class="earnings-container">
    <h2>ROUND COMPLETE</h2>

    <div class="score-summary">
      <span class="score-label">Score:</span>
      <span id="earnings-score">95</span>
      <span class="score-label">Target:</span>
      <span id="earnings-target">60</span>
    </div>

    <div class="surplus-display">
      Surplus: +<span id="earnings-surplus">35</span> points
    </div>

    <div class="earnings-breakdown">
      <h3>EARNINGS</h3>
      <div class="earnings-row">
        <span>Round bonus:</span>
        <span>$<span id="earnings-base">3</span></span>
      </div>
      <div class="earnings-row">
        <span>Surplus bonus:</span>
        <span>$<span id="earnings-surplus-bonus">3</span></span>
      </div>
      <div class="earnings-row total">
        <span>Total earned:</span>
        <span>$<span id="earnings-total">6</span></span>
      </div>
      <div class="bank-update">
        Bank: $<span id="bank-before">0</span> → $<span id="bank-after">6</span>
      </div>
    </div>

    <button id="earnings-continue-btn" class="primary-btn">Continue</button>
  </div>
</div>
```

### 4. CSS Styling

Style earnings screen to match roguelike theme:
- Full page (minus header/footer)
- Dark background matching existing theme
- Card-style earnings breakdown box
- Animated coin counter (bank update)

### 5. Flow Changes

Modify `runManager.checkRoundComplete()`:
1. Calculate earnings
2. Update `runState.coins`
3. Store `lastEarnings` for display
4. Hide game board
5. Show earnings screen
6. Wait for Continue click

Modify Continue button handler:
1. Hide earnings screen
2. Show game board
3. Call existing `nextRound()` or `nextSet()` logic

### 6. Header Coin Display

Update header to show: `$12` or `Bank: $12`

Update `runManager.updateRunUI()` to include coin display.

## Testing Checklist

- [ ] Complete round with score > target → See earnings screen
- [ ] Verify base payout: $3 for R1, $4 for R2, $5 for R3
- [ ] Verify surplus: 10-19 over = $1, 20-29 over = $2, etc.
- [ ] Verify bank accumulates across rounds
- [ ] Verify bank persists across page refresh (localStorage)
- [ ] Verify bank resets on new run
- [ ] Click Continue → Advances to next round
- [ ] Header shows current coin total
- [ ] Run failed → Bank resets to 0 on "Try Again"

## Files to Modify

1. `script.js` — runState, calculateEarnings, flow changes
2. `index.html` — Earnings screen HTML
3. `styles.css` — Earnings screen styling
4. `testing/core-gameplay/*.spec.js` — Add economy tests

## Also In Scope (Phase 2)

- Convert Set Complete popup → Full screen (same style as earnings)
- Flow after Round 3: Earnings screen → Continue → Set Complete screen → Start Next Set

## Out of Scope (Phase 3+)

- Shop screen
- Buying upgrades
- Modifier effects
- Currency symbol change (using $ for now, ✦ later)
