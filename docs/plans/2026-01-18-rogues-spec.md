# Rogues System Specification

> Generated from deep-dive interview on 2026-01-18 (rl-45)

## Terminology

- **Rogues**: The powerups (formerly "boosts")
- **Rogues' Gallery**: The sidebar display showing currently owned rogues

---

## System Rules

### Collection Limits
- **Maximum 5 rogues** at a time
- Must **discard to buy new** when at max (no refund)
- Discarded rogues **immediately return to pool** (can appear in next shop)

### Shop Behavior
- **3 rogue offerings** per shop visit
- **All rogues available from Set 1** (pure RNG what appears)
- **No shop locking** - decide now or lose it
- Show all options even when at max (buying triggers discard prompt)

### Philosophy
- **Embrace broken combos** - finding OP synergies is the fun
- Rogues can **modify core UI elements** (like No Discard changing Exchange to Pass)

---

## Pricing & Rarity

| Rarity | Price | Frequency |
|--------|-------|-----------|
| Common | $4 | Most frequent |
| Uncommon | $5 | Less frequent |
| Rare | $6 | Least frequent |

### Rarity Assignments

**Rare ($6):**
- Endless Power
- Worder

**Uncommon ($5):**
- No Discard
- Bingo Wizard

**Common ($4):**
- Lone Ranger
- Wolf Pack
- High Value
- Top Deck
- Golden Diamond
- All-Round Letter

---

## UI/UX

### Sidebar Display
- Keep current layout, rename header to "Rogues' Gallery"
- **Rogue card highlights** when it triggers during gameplay (glow/animate)

### State Display
- Persistent state (e.g., All-Round Letter's 18/26 tracker) shown in **tooltip on tap/click**
- Not displayed directly on the card

### Score Breakdown
- Show rogue contributions individually in breakdown
- **Order: smallest bonus first, largest last** (builds drama)
- High Value shows separate line from buffed bonus: "Buffed: +1, High Value: +1"
- Worder shows multiplier: "Worder: ×1.56"

### Naming Style
- **"The [Title]"** format (e.g., The Gambler, The Wordsmith)
- **Name + mechanics only** - no flavor text

---

## Rogue Catalog

**Source of truth:** Individual rogue beads (rl-35 through rl-44)

| Bead | Rogue | Rarity | Price |
|------|-------|--------|-------|
| rl-35 | Lone Ranger | Common | $4 |
| rl-36 | Wolf Pack | Common | $4 |
| rl-37 | High Value | Common | $4 |
| rl-38 | No Discard | Uncommon | $5 |
| rl-39 | Top Deck | Common | $4 |
| rl-40 | Bingo Wizard | Uncommon | $5 |
| rl-41 | Worder | Rare | $6 |
| rl-42 | Golden Diamond | Common | $4 |
| rl-43 | All-Round Letter | Common | $4 |
| rl-44 | Endless Power | Rare | $6 |

Each bead contains: effect, rules, UI details, edge cases, and implementation notes.

---

## Interactions & Edge Cases

### General Stacking Rules
- **Turn modifiers always stack** - no caps
- **Flat bonuses stack** - all rogues add their contributions
- **Multiplicative effects multiply** - Worder × Pink tiles × word squares

### Notable Interactions
- **Lone Ranger + Vowel Power**: No interaction - both trigger independently
- **No Discard + Top Deck**: See tiles but can't swap them (interesting combo)

See individual rogue beads for specific edge cases and interactions.

---

## Implementation Notes

### Data Model
```javascript
runState.rogues = [];           // Array of rogue IDs owned (max 5)
runState.rogueState = {         // Persistent state for stateful rogues
    allRoundLetter: new Set(),  // Letters played this cycle
    // Add more as needed
};
```

### Discard Flow
1. Player clicks "Buy" on rogue when at max (5)
2. Modal: "Choose rogue to discard" showing current 5
3. Player selects rogue to discard
4. Discarded rogue returns to pool
5. New rogue added to collection

### Trigger Highlighting
- When rogue contributes to score, its card in sidebar briefly glows/animates
- Visual feedback helps player understand which rogues are firing

---

## References

- `.beads/issues.json` - Individual rogue beads (rl-35 through rl-44)
- `rl-34` - Rename boosts to Rogues (system rules)
- `rl-45` - Interview findings (completed)
- `docs/plans/2026-01-18-balatro-analysis.md` - Gap analysis that inspired rogue design
