# WikiLetters Cleanup Priority Plan
## Ordered from Safest (Zero Risk) to Highest Risk

**Strategy:** Start with guaranteed-safe changes to build confidence, then tackle progressively riskier items.

---

## Phase 1: Zero-Risk Removals (Safe to do in one commit)

### 1.1 Remove Developer Comments Confirming Dead Code
**Risk:** 🟢 **None** - Just removing comments that confirm code is unused

**Files:**
- `index.html:130` - Remove comment `<!-- I think this is not used -->`
- `styles.css:162-209` - Comments say `/* No longer used */`, `/* Always hidden */`

**How to test:** Visual inspection only
**Estimated time:** 2 min
**Lines removed:** ~5

---

### 1.2 Remove Commented-Out Debug Code
**Risk:** 🟢 **None** - Already commented out, just cleaning up

**File:** `script.js:885-896`
```javascript
// DELETE THIS ENTIRE COMMENTED BLOCK:
/*
if (urlParams.get('debug') === '1') {
    document.getElementById('debug-controls').style.display = 'block';
    const debugToggle = document.getElementById('debug-mode-toggle');
    debugToggle.addEventListener('change', (e) => {
        gameState.debugMode = e.target.checked;
        console.log('Debug mode:', gameState.debugMode ? 'ON' : 'OFF');
    });
}
*/
```

**How to test:** Game still works
**Estimated time:** 1 min
**Lines removed:** ~12

---

### 1.3 Remove HTML Elements with Inline `style="display: none"`
**Risk:** 🟢 **None** - Never displayed, no JavaScript references

**File:** `index.html`

**Remove:**
```html
<!-- Line 130: Unused share link -->
<a href="#" id="shareLink" class="hidden">[share your result]</a>

<!-- Lines 37-43: Debug controls (already hidden) -->
<div id="debug-controls" style="display: none; ...">
    <label style="cursor: pointer;">
        <input type="checkbox" id="debug-mode-toggle" ...>
        Debug Mode (Accept Any Word)
    </label>
</div>
```

**How to test:**
```bash
npm test  # All tests should still pass
```
**Estimated time:** 2 min
**Lines removed:** ~10

---

## Phase 2: CSS Cleanup (Very Low Risk)

### 2.1 Remove CSS for Non-Existent HTML Elements
**Risk:** 🟢 **Very Low** - No HTML elements use these classes

**File:** `styles.css`

**Remove:**
```css
/* Lines 162-209: Sidebar styles (no HTML uses this) */
.sidebar { display: none !important; }
.sidebar-section { display: none !important; }
#left-sidebar .info-item { ... }
#left-sidebar .label { ... }
#left-sidebar .value { ... }

/* Lines 797-801: Submit container (confirmed always hidden) */
.submit-container {
    display: none !important;
}

/* Lines 1122-1148: Word preview (element removed, CSS remains) */
.word-preview {
    margin: 15px 20px;
    padding: 12px;
    display: none;
}
.preview-words { ... }
.preview-word { ... }
.preview-score { ... }
```

**How to test:**
1. Visual inspection (layout unchanged)
2. `npm test` (all tests pass)
3. Check mobile layout

**Estimated time:** 5 min
**Lines removed:** ~80

---

### 2.2 Remove Duplicate CSS Animations
**Risk:** 🟢 **Very Low** - Keeping first definition, removing duplicates

**File:** `styles.css`

**Keep:** Line 1263 (first definition)
```css
@keyframes pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}
```

**Remove:** Lines 1372-1376, 1439-1443 (exact duplicates)

**How to test:**
1. Click tiles (animation should still work)
2. Visual check

**Estimated time:** 2 min
**Lines removed:** ~10

---

### 2.3 Remove Wikipedia Feature CSS (If Not Planning to Implement)
**Risk:** 🟡 **Low** - Only remove if feature not planned

**File:** `styles.css:1150-1182`

**Remove:**
```css
/* Wikipedia Info - Future Development */
.wiki-context { ... }
.wiki-context #wiki-text { ... }
#wiki-link { ... }
```

**How to test:** Visual inspection
**Estimated time:** 2 min
**Lines removed:** ~35
**Decision needed:** Are you planning to add Wikipedia context feature?

---

## Phase 3: HTML Cleanup (Low Risk)

### 3.1 Remove Old Game-Over Section
**Risk:** 🟡 **Low** - Replaced by popup, but verify no references

**File:** `index.html:103-112`

**Remove:**
```html
<div id="game-over-section" style="display: none;">
    <h2>Game Complete!</h2>
    <div id="final-score-display"></div>
    <div id="score-submission">
        <input type="text" id="player-name" placeholder="AAA" maxlength="3" ...>
        <button id="submit-score" class="btn btn-primary">Submit Score</button>
    </div>
    <button id="share-game" class="btn btn-secondary">Share</button>
    <button id="new-game" class="btn btn-primary">Play Tomorrow's Game</button>
</div>
```

**How to test:**
1. Play complete game
2. Verify popup appears (not old section)
3. `npm test` (all tests pass)

**Estimated time:** 3 min
**Lines removed:** ~10

---

### 3.2 Remove Old High Score Section
**Risk:** 🟡 **Low** - Old arcade-style system, replaced by single high score

**File:** `index.html:96-100`

**Remove:**
```html
<div id="high-scores-section" style="display: none;">
    <h2>Today's Top Scores</h2>
    <div id="high-scores-list"></div>
    <button id="view-replay" class="btn btn-secondary" style="display: none;">View Replay</button>
</div>
```

**How to test:**
1. Complete game
2. Check high score displays in popup (new system)
3. `npm test`

**Estimated time:** 2 min
**Lines removed:** ~7

---

### 3.3 Remove Replay Viewer (If Not Planned)
**Risk:** 🟡 **Low** - Never implemented, no JS references

**File:** `index.html:114-124`

**Remove:**
```html
<div id="replay-viewer" style="display: none;">
    <h2>Board Replay</h2>
    <div id="replay-board" class="board"></div>
    <div id="replay-controls">
        <button id="prev-move" class="btn btn-secondary">Previous</button>
        <span id="move-indicator">Move 1/5</span>
        <button id="next-move" class="btn btn-secondary">Next</button>
        <button id="close-replay" class="btn btn-secondary">Close</button>
    </div>
</div>
```

**How to test:** Visual inspection
**Estimated time:** 2 min
**Lines removed:** ~13
**Decision needed:** Planning to add replay feature?

---

## Phase 4: JavaScript Dead Functions (Medium Risk)

### 4.1 Remove Stub Functions (Never Implemented)
**Risk:** 🟡 **Low-Medium** - Functions exist but do nothing

**File:** `script.js`

**Remove:**
```javascript
// Line 2998-3030: showGameFooter() - never called
function showGameFooter() {
    // Legacy function that does nothing
}

// Line 3032-3074: checkPlayStatus(), getPlayerId() - stubs
function checkPlayStatus() {
    // TODO: Implement play tracking
}
function getPlayerId() {
    // Generates/retrieves player ID but unused
}

// Line 3696-3706: showWikipediaLink() - never called
function showWikipediaLink(word, context, url) {
    // HTML elements don't exist
}

// Line 3413-3427: playThisDate() - testing function
function playThisDate() {
    // Exposed globally but never called
}

// Line 3658-3662: generateShareGrid() - simpler version, never called
function generateShareGrid() {
    // Replaced by more sophisticated version in shareGame()
}
```

**How to test:**
1. `npm test` (all tests pass)
2. Play complete game
3. Share board

**Estimated time:** 5 min
**Lines removed:** ~80

---

### 4.2 Remove displayWordPreview() and Related Code
**Risk:** 🟡 **Medium** - Called by updateWordPreview(), need to clean both

**File:** `script.js`

**Step 1:** Search for all calls to `updateWordPreview()` and `displayWordPreview()`
**Step 2:** Remove the functions and their calls

```javascript
// Lines 1934-1942: displayWordPreview()
function displayWordPreview(words) {
    let preview = document.getElementById('word-preview');
    if (preview) {
        preview.remove();
    }
    return;  // Does nothing else
}

// Find and remove: updateWordPreview() function
// Find and remove: All calls to updateWordPreview()
```

**How to test:**
1. `npm test`
2. Place tiles (verify no errors)
3. Check console for errors

**Estimated time:** 10 min
**Lines removed:** ~30

---

### 4.3 Remove Old High Score Functions
**Risk:** 🟡 **Medium** - Part of deprecated system, but verify no references

**File:** `script.js`

**Remove:**
```javascript
// Lines 3076-3115: submitScore() - old arcade submission
function submitScore() {
    // Uses submit_score.py (old system)
}

// Lines 3117-3144: loadHighScores(), displayHighScores()
function loadHighScores() {
    // Old arcade system
}
function displayHighScores(scores) {
    // Never called
}
```

**How to test:**
1. `npm test`
2. Complete game
3. Verify new high score system works
4. Check console for errors

**Estimated time:** 5 min
**Lines removed:** ~70

---

### 4.4 Remove Old Tile Functions (Duplicates)
**Risk:** 🟡 **Medium** - Unused duplicates of active functions

**File:** `script.js`

**Remove:**
```javascript
// Lines 1283-1317: handleRackClick() - replaced by handleTileClick()
function handleRackClick(e) {
    // Old click-to-swap functionality
}

// Lines 1588-1643: returnTileToRack() - replaced by returnBoardTileToRack()
function returnTileToRack(cell, addToRack = true) {
    // Old function for returning tiles
}
```

**Verify:** These functions are NOT called anywhere
**How to test:**
1. `npm test`
2. UI interactions test (shuffle, recall, swap)
3. Play complete game

**Estimated time:** 5 min
**Lines removed:** ~70

---

## Phase 5: Event Listener Cleanup (Medium-High Risk)

### 5.1 Fix Event Listeners for Non-Existent Elements
**Risk:** 🟠 **Medium-High** - Currently throws errors, need null checks

**File:** `script.js`

**Current (throws error):**
```javascript
// Line 1225
document.getElementById('submit-score').addEventListener('click', submitScore);

// Line 1226
document.getElementById('share-game').addEventListener('click', shareGame);
```

**Fix Option 1 - Add Null Checks:**
```javascript
const submitScoreBtn = document.getElementById('submit-score');
if (submitScoreBtn) {
    submitScoreBtn.addEventListener('click', submitScore);
}

const shareGameBtn = document.getElementById('share-game');
if (shareGameBtn) {
    shareGameBtn.addEventListener('click', shareGame);
}
```

**Fix Option 2 - Remove Entirely (if removing submitScore function):**
```javascript
// DELETE both lines (after confirming submitScore() is removed in Phase 4)
```

**How to test:**
1. Load page
2. Check console for no errors
3. `npm test`

**Estimated time:** 3 min
**Lines changed:** ~2-10

---

## Phase 6: Backend Cleanup (Medium Risk)

### 6.1 Delete Old High Score Python Scripts
**Risk:** 🟠 **Medium** - Files being removed, but not used by current system

**Files to delete:**
- `cgi-bin/submit_score.py` (old arcade submission)
- `cgi-bin/get_scores.py` (old arcade retrieval)

**Verification before deletion:**
```bash
# Verify these endpoints return 404 or aren't called
curl http://localhost:8085/cgi-bin/submit_score.py
curl http://localhost:8085/cgi-bin/get_scores.py

# Verify new system works
curl http://localhost:8085/cgi-bin/get_high_score.py?date=20251122
```

**How to test:**
1. Complete game
2. Submit high score (new system)
3. Retrieve high score (new system)
4. Verify old endpoints return 404
5. `npm test`

**Estimated time:** 5 min
**Files removed:** 2 (~140 lines)

---

## Phase 7: Debug Logging Cleanup (Low Risk, High Effort)

### 7.1 Remove or Wrap Debug Console Logs
**Risk:** 🟡 **Low** - Cosmetic improvement, no functional impact

**File:** `script.js` (77 console.log statements)

**Option 1 - Wrap in Debug Flag:**
```javascript
// Add at top of file
const DEBUG_MODE = false;

// Replace console.log with:
if (DEBUG_MODE) console.log('[V3 Encoder] Generated URL:', url);
```

**Option 2 - Remove Non-Critical Logs:**
- Keep: Error logs (`console.error`, `console.warn`)
- Remove: Debug logs (`[DEBUG]`, `[V3 Encoder]`, etc.)

**How to test:**
1. `npm test`
2. Check console is cleaner
3. Verify errors still show

**Estimated time:** 30 min
**Lines changed:** ~77

---

## Testing Checkpoints

### After Each Phase:

```bash
# 1. Run core tests
cd testing/core-gameplay
npm test

# Expected: 8 tests passing
# - 4 scenarios (complete games with backward compat)
# - 4 UI interactions (shuffle, recall, swap, high score)

# 2. Quick manual check
# - Load game
# - Place some tiles
# - Complete a game
# - Check for console errors

# 3. If any test fails:
# - Review the change
# - Check if it's expected
# - Revert if unexpected
```

### Final Verification:

```bash
# Run all tests
npm test

# Visual regression (optional)
# - Take screenshots before cleanup
# - Take screenshots after cleanup
# - Compare (should be identical)

# Deploy to staging/localhost
./letters_rebuild.sh

# Manual testing:
# - Play a complete game
# - Test share functionality
# - Test high scores
# - Test URL loading (?seed=, ?g=, ?w=)
```

---

## Summary by Phase

| Phase | Risk | Time | Lines | Tests Required |
|-------|------|------|-------|----------------|
| 1: Zero-Risk Removals | 🟢 None | 5 min | ~27 | Visual |
| 2: CSS Cleanup | 🟢 Very Low | 9 min | ~125 | Visual + npm test |
| 3: HTML Cleanup | 🟡 Low | 7 min | ~30 | npm test |
| 4: Dead Functions | 🟡 Medium | 25 min | ~250 | npm test + manual |
| 5: Event Listeners | 🟠 Med-High | 3 min | ~10 | npm test + console |
| 6: Backend Scripts | 🟠 Medium | 5 min | ~140 | npm test + API test |
| 7: Debug Logging | 🟡 Low | 30 min | ~77 | npm test |
| **TOTAL** | | **84 min** | **~659** | |

---

## Recommended Approach

**Day 1: Quick Wins (Phases 1-3)**
- Do all zero-risk and low-risk items
- Total time: ~21 minutes
- Lines removed: ~182
- Build confidence with safe changes

**Day 2: Medium Risk (Phases 4-5)**
- Remove dead functions
- Fix event listeners
- Total time: ~28 minutes
- Lines removed: ~330
- More impactful cleanup

**Day 3: Backend & Polish (Phases 6-7)**
- Delete old Python scripts
- Clean up debug logging
- Total time: ~35 minutes
- Lines removed: ~217
- Final polish

**Total cleanup: ~640 lines removed in ~1.5 hours of work**

---

## Abort Criteria

**STOP immediately if:**
- Any core gameplay test fails
- Console errors appear that weren't there before
- Visual layout breaks
- Share URLs stop working
- High scores break

**Then:**
1. Revert the last change
2. Investigate why it failed
3. Fix or skip that item
4. Continue with next phase
