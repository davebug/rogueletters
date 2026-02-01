# Rogue Review

Audit of all 20 rogues. Tested 2026-02-01.

## Summary

| Status | Count |
|--------|-------|
| Working | 19 |
| Fixed this session | 1 (Top Deck) |

## Rogues

### Overtime (extraTurn) — WORKING
+1 turn per round. Adds 1 to `maxTurns` in `resetForNewRound()`.

### Big Pockets (extraRack) — WORKING
+1 rack capacity. `getRackSize()` returns 8 when active.

### Heavy Backpack (heavyBackpack) — WORKING
+2 rack size, -1 turn per round. Hold 9 tiles but only get 4 turns.

### Salary Bump (basePayout) — WORKING
+$3 base payout. Applied in earnings calculation.

### Vowel Power (vowelBonus) — WORKING
+1 to all vowels (A, E, I, O, U). Applied in `calculateWordScore()`, `getEffectiveTileScore()`, display scores, and bag viewer.

### Golden Diamond (goldenDiamond) — WORKING
Earn $1 per 20% above target (vs normal 25%). Changes bonus threshold.

### Endless Power (endlessPower) — WORKING
+2 per word x current set. Set 1 = +2, Set 5 = +10. Applied in all scoring functions.

### Lone Ranger (loneRanger) — WORKING
+6 if word has exactly 1 vowel. Y counts as vowel.

### High Value (highValue) — WORKING
+1 per shop-bought tile in word. Counts tiles with `buffed`, `coinTile`, or `pinkTile` markers.

### Wolf Pack (wolfPack) — WORKING
+3 per double letter pair (adjacent matching letters). COFFEE = 2 pairs (FF + EE) = +6. AAA = 1 pair.

### No Discard (noDiscard) — WORKING
Exchange becomes Pass (+2 turns). Removes exchange modal, shows Pass button with confirmation.

### Bingo Wizard (bingoWizard) — WORKING
Bingo with 6 tiles (+50). Lowers bingo threshold from 7 to 6.

### Worder (worder) — WORKING
x1.25 per letter square used (DL/TL). Two letter squares = x1.5625.

### All-Round Letter (allRoundLetter) — WORKING (minor concern)
+1 for first use of each letter, resets after 18 unique letters. Tracks in `runState.lettersPlayedThisCycle`.

**Note:** The cycle Set persists across rounds — not cleared in `resetForNewRound()`. This may be intentional (run-long tracking) but unclear from description. If it should reset per round, needs a fix.

### Top Deck (topDeck) — FIXED
See next 3 tiles in bag. Shows the 3 most common remaining tile letters.

**Bug found:** `renderTopDeck()` called `getRemainingTiles()` which doesn't exist. Fixed to `calculateRemainingTiles()`. Also added `renderTopDeck()` call to `displayTilesAnimated()` so it updates after word submission.

### The Collector (collector) — WORKING
x1.1 per rogue owned. Applied as turn-level multiplier. 4 rogues = x1.46.

### The Minter (minter) — WORKING
7th tile each round is +1 buffed. Requests 1 fewer tile from backend, generates the extra tile locally with weighted random selection.

### The Miser (miser) — WORKING
+$2 for 1-3 tile turns. Awarded immediately after playing short words.

### The Closer (closer) — WORKING
x2 on last turn of each round. Doubles entire turn score when `currentTurn === maxTurns`.

### The Hoarder (hoarder) — WORKING
+1 point per $1 at round start. Sets starting score equal to coin count.

## Known Issues (not rogue-specific)

### Hint system: blank tiles ignored
The GADDAG move generator doesn't handle blank tiles (`_`). When a blank is in the rack, it's skipped because the GADDAG tree has no `_` children. The other rack tiles still work, but the blank is never used in hint suggestions.

### Hint system: test-wordlist.json missing in production
The deploy script's volume mount shadows the container's data directory. `test-wordlist.json` wasn't copied to the persistent volume. Fixed in deploy script — needs redeploy.
