# Testing Archive

This directory contains old test files and debugging scripts from September-November 2025 development. All files here are **inactive** and kept for historical reference only.

## Active Test Suite

The current, maintained test suite is: **`testing/core-gameplay/`**

Run with: `cd testing/core-gameplay && npm test`

---

## What's Archived Here

### Development Testing Directories

#### 📁 **playwright/** (75+ files)
Early development E2E tests created while building game features:
- UI element testing (footer, header, wood theme)
- Drag-and-drop experiments (multiple iterations)
- Feature testing (high scores, word preview, potential words)
- Game mechanics iterations (full game flow, completion, scoring)

**Why archived**: Replaced by focused `core-gameplay/` suite that runs on every deployment.

#### 📁 **puppeteer/** (8 files)
Tests using Puppeteer before switching to Playwright:
- Gap behavior and animations
- Drag-and-drop testing
- Touch event handling

**Why archived**: Migrated to Playwright for cross-browser support.

#### 📁 **tile-rack-isolated/** (extensive)
Standalone testing environment for evaluating drag-and-drop libraries:
- Demo implementations (SortableJS, Dragula, HTML5 native)
- Comparison documents and analysis
- 100+ UI test screenshots
- Isolated test server

**Why archived**: Library evaluation complete, implementation chosen and integrated into main game.

#### 📁 **integration/** (5 files)
Early integration tests:
- test-touch-v3.js, test-touch-v4.js, test-touch-v5.js
- test-actual-game.js
- run-complete-test-suite.js

**Why archived**: Superseded by `core-gameplay/` test scenarios.

#### 📁 **unit/** (empty)
Reserved directory for future unit tests (never used).

---

### Nov 23, 2025 - Shuffle Bug Investigation

#### The Bug
User Louis Gray shared a URL that failed with error:
```
Invalid share link: Unexpected token 'a', "a✳✳" is not valid JSON
```

URL: `https://letters.wiki/?w=IaZnIVyLfGADJpkBSmpcUwKGXETi1xgxZhQQFIdUASgRQA`

#### Root Cause
Bug occurred when user:
1. Placed some tiles
2. Shuffled remaining tiles
3. Placed more tiles
4. Generated share URL

Shuffle updated `gameState.currentRack` to only remaining tiles (e.g., 5 instead of 7). Encoder couldn't find placed tiles → assigned duplicate `rackIdx: 0` → V3 decoder rejected → fell back to LZ-String → garbage output.

#### The Fix
**Commit**: 419e7cf - "Fix share URL corruption from shuffle-after-placement (v10.29)"

1. Created `turnStartRack` - immutable snapshot at turn START
2. Changed turn history to use `turnStartRack` instead of `currentRack`
3. Removed all `currentRack` code (dead code)
4. Changed encoder to fail fast with clear error

**Files Modified**: script.js (lines 1070, 2304-2306, 2449, 2579, 543-547, 604-608)

#### Debugging Scripts
- **test-v3-decode-issue.js** - Initial bug reproduction
- **decode-all-turns.js** - Decode all 5 turns with certainty markers
- **decode-raw-tiles.js** - Bit-level decoding of URL structure
- **compare-two-urls.js** - Full comparison of broken vs recreation URLs
- **compare-positions-only.js** - Compare tile coordinates only
- **shuffle-after-placement.spec.js** - Incomplete test case (has selector issues)

#### What We Learned
Despite corruption, decoded from broken URL:
- **Date**: November 23, 2025 (seed: 20251123)
- **Starting word**: ARGYLE (horizontal, row 4)
- **Turn 1**: PANZER (vertical, column 1, rows 3-8) - 34 points
- **Turn 2-5**: Corrupted cascade from Turn 2 corruption

User recreation: 136 points vs original 139 (3 point difference)
- 15/19 tiles matched exact positions (79% accuracy)
- Different letters due to corruption

**Status**: ✅ Fixed and deployed Nov 23, 2025

---

### Sept-Oct 2025 - Bug-Specific Tests

Tests created to debug specific issues during development. All bugs fixed and validated by core gameplay suite.

#### Bingo Bonus Bug (Oct 2025)
- test-bingo-bonus-bug.spec.js
- test-bingo-bonus-fix.spec.js
- test-bingo-perpendicular-words.spec.js
- test-rescored-bingo.spec.js

**Issue**: Bingo bonus applied twice (+100 instead of +50)

#### Logo Click Bug (Oct 2025)
- test-logo-click-bug.spec.js
- test-logo-click-headed.spec.js

**Issue**: Clicking logo with all tiles placed caused unexpected behavior

#### Share URL Issues (Oct-Nov 2025)
- test-share-board-pregenerate.spec.js
- test-share-board-timeout.spec.js
- test-share-timeout-simple.spec.js
- test-versioned-urls.spec.js
- test-encoder-debug.spec.js
- test-lz-fallback.spec.js
- test-v3-roundtrip.spec.js
- test-v3-url.spec.js

**Issues**: Share URL generation timeouts and encoding problems

#### UI Interaction Bugs (Sept-Oct 2025)
- test-click-handler.spec.js
- test-tap-debug.spec.js
- test-tap-puppeteer.js
- test-tap-select-swap-fixed.spec.js
- test-tap-select-swap.spec.js

**Issues**: Touch/click event handling on mobile

#### Refresh/State Management Bugs (Oct 2025)
- test-refresh-multiple-dates.spec.js
- test-refresh-placed-tiles-bug.spec.js

**Issues**: State preservation across page refreshes

#### Rack Reordering Investigation (Nov 21, 2025)
- test-backward-compat.js
- test-option-3c-sorting.js
- test-rack-reordering-bug.js

**Investigation**: Exploring solutions for rack reordering bugs and backward compatibility

---

## Screenshots

- **v3-decoded-board.png** - V3 URL decoder visual verification
- **v3-url-test.png** - V3 URL encoding test output

---

## Notes

All bugs referenced in these files have been fixed and deployed. These files provide historical context for how specific issues were investigated and resolved during development.

The consolidated `core-gameplay/` test suite now validates all game functionality and runs automatically on every deployment.
