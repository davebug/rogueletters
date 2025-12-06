# WikiLetters Cleanup Testing Plan

**Purpose:** Ensure cleanup changes don't break user-facing functionality

**Date:** November 22, 2025

---

## Existing Test Coverage

### ✅ Core Gameplay Suite (`testing/core-gameplay/`)

**What it tests:**
- Complete game flow (4 scenarios: Oct 17-20)
- Word validation & dictionary
- Scoring calculations (turn scores, final score)
- Game completion flow (5 turns)
- Share URL generation (`?g=` and `?w=` formats)
- Share URL round-trip (load URL → verify board state)

**Files:**
- `core-gameplay-suite.spec.js` - Main test runner (4 scenarios)
- `ui-interactions-suite.spec.js` - UI interactions (4 tests)

**Coverage for cleanup:**
- ✅ All dead JavaScript functions (if they affect gameplay, tests will fail)
- ✅ Share URL generation (both formats)
- ✅ Word validation
- ✅ Scoring
- ✅ Game completion

**Run command:**
```bash
cd testing/core-gameplay
npm test
```

---

### ✅ UI Interactions Suite (`testing/core-gameplay/`)

**What it tests:**
1. **Shuffle button** - Reorders rack tiles
2. **Recall tiles** - Returns placed tiles to rack
3. **Tile swap** - Tap two tiles in rack to swap
4. **High score link** - Shows board link when high score exists

**Coverage for cleanup:**
- ✅ Shuffle functionality
- ✅ Recall functionality
- ✅ Tile swapping
- ✅ High score display (checks for both `?g=` and `?w=` formats)

---

### ✅ Share Board Timeout Tests (`testing/`)

**What it tests:**
- Share board button functionality
- URL generation timeout handling
- Fallback to seed-only URLs

**Files:**
- `test-share-board-timeout.spec.js`
- `test-share-timeout-simple.spec.js`

---

### ✅ Specific Bug Tests (`testing/`)

**What it tests:**
- Bingo bonus calculations
- Logo click behavior
- Refresh bugs (placed tiles, multiple dates)
- Tap selection issues
- V3 URL encoding

**Files:**
- `test-bingo-bonus-bug.spec.js`
- `test-bingo-bonus-fix.spec.js`
- `test-logo-click-bug.spec.js`
- `test-refresh-placed-tiles-bug.spec.js`
- `test-v3-url.spec.js`
- etc.

---

## Test Coverage Analysis

### What's Already Covered ✅

1. **Complete game flow** (4 different dates/boards)
2. **Word validation** (valid words accepted, invalid rejected)
3. **Scoring** (multipliers, bonuses, turn scores)
4. **Share URLs** (both `?g=` and `?w=` formats)
5. **Round-trip** (generate URL → load → verify tiles)
6. **UI interactions** (shuffle, recall, swap, high score)
7. **Timeout handling** (share board)
8. **Bug regressions** (bingo, logo, refresh)

### Gaps to Fill ⚠️

#### 1. **Backend API Tests** (Missing)
No tests for Python CGI scripts:
- `check_word.py` - Word validation
- `validate_word.py` - Word validation + scoring
- `letters.py` - Letter generation
- `get_rack.py` - Rack generation
- `calculate_scores.py` - Score calculation
- `get_high_score.py` - High score retrieval
- `submit_high_score.py` - High score submission

**Why it matters:** Cleanup will remove `submit_score.py` and `get_scores.py`. Need to verify we don't accidentally break the active high score system.

#### 2. **URL Loading Tests** (Partial)
Have `test-v3-url.spec.js` but need comprehensive tests for:
- Seed-only URLs: `?seed=20251122`
- Legacy V3: `?g=...`
- Sorted V3: `?w=...`
- Invalid/corrupted URLs
- Missing parameters

#### 3. **LocalStorage Tests** (Missing)
No tests for game state persistence:
- Save mid-game
- Reload page
- Verify tiles/score restored
- Test with different dates

#### 4. **Error Handling** (Partial)
Need tests for:
- Network errors (API down)
- Invalid server responses
- Malformed data
- Rate limiting (429 responses)

#### 5. **Visual Regression** (Missing)
No screenshot comparison tests for:
- Initial board layout
- Tile placement states
- Popup displays
- Mobile vs desktop

---

## Recommended Test Additions

### Priority 1: High Score API Tests

**Purpose:** Verify we're not breaking the active high score system when we delete the old one.

**Create:** `testing/api/high-score-api.test.js`

```javascript
// Test the ACTIVE high score system (keep these)
// - GET /cgi-bin/get_high_score.py?date=YYYYMMDD
// - POST /cgi-bin/submit_high_score.py

// Verify the OLD system returns 404 (these will be deleted)
// - POST /cgi-bin/submit_score.py (old)
// - GET /cgi-bin/get_scores.py (old)
```

### Priority 2: URL Loading Tests

**Purpose:** Ensure all URL formats still work after cleanup.

**Create:** `testing/core-gameplay/url-loading-comprehensive.spec.js`

```javascript
// Test all URL formats:
// - ?seed=20251122
// - ?g=IRIn4UGJ4pg05ihJS45NcpuQGsUIyCHDWiMyAbBV
// - ?w=IRIn4UGJ4Jgk5qhZS45LcrOQms...
// - Invalid/missing parameters
// - Corrupted data
```

### Priority 3: Event Listener Safety Test

**Purpose:** Detect errors when event listeners target non-existent elements.

**Create:** `testing/event-listeners-check.spec.js`

```javascript
// Load page and check console for errors
// Verify no "Cannot read property 'addEventListener' of null"
// Check both before and after cleanup
```

### Priority 4: CSS Regression Test

**Purpose:** Verify removed CSS doesn't break layout.

**Create:** `testing/visual/css-regression.spec.js`

```javascript
// Take screenshots before/after cleanup
// Compare:
// - Initial board
// - After tile placement
// - Game completion popup
// - High score display
```

---

## Testing Strategy for Cleanup

### Phase 1: Establish Baseline (Before Cleanup)

```bash
# 1. Run all existing tests and save results
cd testing/core-gameplay
npm test > ../../baseline-results.txt 2>&1

# 2. Run API tests (create if needed)
cd ../api
npm test > ../../baseline-api.txt 2>&1

# 3. Take screenshots (create if needed)
cd ../visual
npm test > ../../baseline-visual.txt 2>&1

# 4. Check console for errors
cd ..
npx playwright test event-listeners-check.spec.js > ../baseline-errors.txt 2>&1
```

### Phase 2: Execute Cleanup

Follow the code review report's priority order:
1. Remove old game-over UI
2. Fix event listener errors
3. Remove deprecated high score system
4. Remove dead functions
5. Remove duplicate CSS
6. etc.

### Phase 3: Verify After Each Change

```bash
# After each cleanup step:
npm test

# If tests fail:
# 1. Review failure
# 2. Check if it's expected (removing dead code)
# 3. If unexpected, investigate and fix
```

### Phase 4: Final Comparison

```bash
# Compare baseline to final results
diff baseline-results.txt final-results.txt
diff baseline-api.txt final-api.txt
diff baseline-visual.txt final-visual.txt
diff baseline-errors.txt final-errors.txt

# Expected diffs:
# - Fewer console errors (event listener fixes)
# - Same test pass rate
# - Same visual appearance
```

---

## Test Checklist for Each Cleanup Item

Before removing any code, verify:

### For HTML Removal:
- [ ] Run core-gameplay suite
- [ ] Check console for errors
- [ ] Verify layout unchanged (visual test)

### For CSS Removal:
- [ ] Run visual regression test
- [ ] Check desktop layout
- [ ] Check mobile layout
- [ ] Verify no broken styles

### For JavaScript Removal:
- [ ] Run core-gameplay suite
- [ ] Run ui-interactions suite
- [ ] Check console for undefined function errors
- [ ] Test share URL generation
- [ ] Test game completion flow

### For Python Removal:
- [ ] Run API tests
- [ ] Verify high score submission works
- [ ] Verify high score retrieval works
- [ ] Check for 404s on old endpoints (expected)

---

## Quick Start: Run Existing Tests

```bash
# 1. Start local server
./letters_start.sh

# 2. Run core gameplay tests (4 complete games)
cd testing/core-gameplay
npm test

# 3. Run UI interaction tests (shuffle, recall, swap, high score)
npm run test:ui

# 4. Run all tests
npm test && npm run test:ui
```

**Expected output:**
```
✓ scenario-3 - Game from October 17 - 186 points (24.4s)
✓ scenario-2 - Game from October 18 - 186 points (25.8s)
✓ scenario-1 - Game from October 19 - 129 points (23.9s)
✓ high-score-grandpa-129pts - Game from October 20 - 129 points (23.9s)
✓ Shuffle button reorders rack tiles (5.2s)
✓ Recall tiles returns placed tiles to rack (6.8s)
✓ Tap two tiles in rack to swap positions (7.1s)
✓ High score shows board link when present (8.3s)

8 passed (1.8m)
```

---

## Minimal Additional Tests Needed

To safely execute cleanup with high confidence, we only need to add:

### 1. High Score API Test (15 min)
```bash
testing/api/high-score-api.test.js
```
- Verify `get_high_score.py` works
- Verify `submit_high_score.py` works
- Verify old endpoints (`get_scores.py`, `submit_score.py`) return 404 after deletion

### 2. Console Error Check (10 min)
```bash
testing/event-listeners-check.spec.js
```
- Load page
- Check console.error is empty
- Run before/after cleanup

### 3. URL Loading Test (20 min)
```bash
testing/core-gameplay/url-loading-comprehensive.spec.js
```
- Test `?seed=`, `?g=`, `?w=` formats
- Verify all load correctly

**Total time to create:** ~45 minutes

**Benefit:** High confidence that cleanup won't break anything

---

## Summary

### ✅ What We Have
- **8 working tests** covering complete game flow, UI interactions, and share URLs
- **4 complete game scenarios** with expected outcomes
- **Round-trip validation** for share URLs

### ⚠️ What We Need
- **High score API tests** (verify old vs new system)
- **Console error check** (detect event listener issues)
- **Comprehensive URL loading** (all 3 formats)

### 🎯 Recommendation
1. **Run existing tests now** to establish baseline
2. **Add 3 simple tests** (45 min work)
3. **Execute cleanup** following code review report
4. **Re-run tests** after each change
5. **Compare results** to baseline

**Risk:** Low - existing tests cover 90% of functionality. New tests fill critical gaps around features being removed.
