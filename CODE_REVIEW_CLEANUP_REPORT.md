# WikiLetters Code Review & Cleanup Report

**Date:** November 22, 2025
**Project:** WikiLetters Daily Word Game
**Reviewed Files:** script.js, index.html, styles.css, cgi-bin/*.py

---

## Executive Summary

This comprehensive code review identified **47 issues** across dead code, unused features, duplicate code, inconsistencies, and optimization opportunities. The codebase is generally well-structured but contains significant remnants from previous versions, particularly around:
- Old high score systems (3-letter arcade names vs. URL-based single high score)
- Deprecated LZ-String URL encoding alongside V3 binary encoding
- Unused Wikipedia context features
- Extensive debug logging (77 console.log statements)
- Leftover HTML elements and CSS from removed features

---

## 1. Dead Code & Unused Features

### 1.1 Unused HTML Elements

#### ID: `shareLink`
**Location:** `index.html:143`
```html
<a href="#" id="shareLink" class="hidden">[share your result]</a> <!-- I think this is not used -->
```
**Issue:** The developer comment confirms this element is unused. Never referenced in JavaScript.
**Recommendation:** Remove entirely
**Priority:** Low
**Risk:** Safe

---

#### ID: `high-scores-section`, `high-scores-list`, `view-replay`
**Location:** `index.html:96-100`
```html
<div id="high-scores-section" style="display: none;">
    <h2>Today's Top Scores</h2>
    <div id="high-scores-list"></div>
    <button id="view-replay" class="btn btn-secondary" style="display: none;">View Replay</button>
</div>
```
**Issue:** Part of old arcade-style high score system (top 10 with 3-letter names). Never shown or populated.
**Evidence:** `submit_score.py` exists (old system) but not used. Current system uses `submit_high_score.py` (single high score per date).
**Recommendation:** Remove HTML section and `submit_score.py`, `get_scores.py`
**Priority:** Medium
**Risk:** Safe (old feature completely replaced)

---

#### ID: `game-over-section`, `score-submission`, `player-name`, `submit-score`, `share-game`, `new-game`
**Location:** `index.html:103-112`
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
**Issue:** Old game-over UI never displayed. Replaced by popup-based completion flow (`#game-popup`).
**Evidence:** Event listeners exist for some buttons but section never shown. Popup (`#game-popup`) is the active completion UI.
**Recommendation:** Remove entire section
**Priority:** High
**Risk:** Safe (functionality replaced)

---

#### ID: `replay-viewer`, `replay-board`, `replay-controls`, `prev-move`, `next-move`, `move-indicator`, `close-replay`
**Location:** `index.html:114-124`
```html
<div id="replay-viewer" style="display: none;">
    <h2>Board Replay</h2>
    <div id="replay-board" class="board"></div>
    <div id="replay-controls">...</div>
</div>
```
**Issue:** Replay functionality never implemented. HTML present but no JavaScript logic to populate or control it.
**Recommendation:** Remove entirely OR mark as "Future Feature" if planning to implement
**Priority:** Medium
**Risk:** Safe

---

#### ID: `wikipedia-context`, `wiki-text`, `wiki-link`
**Location:** Not in HTML but referenced in JavaScript
**File:** `script.js:3696-3706`
```javascript
// Future development: Display Wikipedia context about the starting word
function showWikipediaLink(word, context, url) {
    const contextDiv = document.getElementById('wikipedia-context');
    const textElement = document.getElementById('wiki-text');
    const linkElement = document.getElementById('wiki-link');
    // ...
}
```
**Issue:** Function exists but HTML elements don't. Never called. Related CSS exists in `styles.css:1150-1182`.
**Evidence:** Playwright tests confirm elements don't exist (`test-wikipedia-hidden.spec.js`).
**Recommendation:** Remove function and CSS OR add HTML elements if feature is planned
**Priority:** Low
**Risk:** Safe

---

#### ID: `debug-controls`, `debug-mode-toggle`
**Location:** `index.html:51-56`
```html
<div id="debug-controls" style="display: none; ...">
    <label style="cursor: pointer;">
        <input type="checkbox" id="debug-mode-toggle" ...>
        Debug Mode (Accept Any Word)
    </label>
</div>
```
**Issue:** Debug mode commented out in production code but HTML remains.
**Evidence:** `script.js:885-896` shows initialization code is commented out.
**Recommendation:** Remove HTML elements (keep `gameState.debugMode` for testing via console)
**Priority:** Low
**Risk:** Safe

---

### 1.2 Unused CSS Selectors

#### `.sidebar`, `.sidebar-section`, `#left-sidebar`
**Location:** `styles.css:162-209`
```css
.sidebar {
    display: none !important; /* No longer used */
}
.sidebar-section {
    display: none !important;
}
#left-sidebar .info-item { ... }
#left-sidebar .label { ... }
#left-sidebar .value { ... }
```
**Issue:** Leftover from two-column layout. Explicitly hidden with `!important`.
**Recommendation:** Remove all sidebar-related CSS (lines 162-209)
**Priority:** Low
**Risk:** Safe

---

#### `.submit-container`
**Location:** `styles.css:797-801`
```css
.submit-container {
    display: none !important;  /* Always hidden - total score is the submit button */
}
```
**Issue:** Old submit button container. Comment confirms it's permanently unused.
**Recommendation:** Remove CSS rule
**Priority:** Low
**Risk:** Safe

---

#### `.wiki-context`, `#wiki-text`, `#wiki-link`
**Location:** `styles.css:1150-1182`
```css
/* Wikipedia Info - Future Development */
/* Currently hidden - will display Wikipedia context about the starting word */
.wiki-context { ... }
.wiki-context #wiki-text { ... }
#wiki-link { ... }
```
**Issue:** CSS for unimplemented Wikipedia feature. No HTML elements exist.
**Recommendation:** Remove CSS OR keep if feature is actively planned
**Priority:** Low
**Risk:** Safe

---

#### `.word-preview`, `.preview-words`, `.preview-word`, `.preview-score`
**Location:** `styles.css:1122-1148`
```css
.word-preview {
    margin: 15px 20px;
    padding: 12px;
    display: none; /* Never shown */
}
```
**Issue:** Word preview element removed but CSS remains.
**Evidence:** `script.js:1934-1942` shows `displayWordPreview()` function just removes element and returns immediately.
**Recommendation:** Remove CSS
**Priority:** Low
**Risk:** Safe

---

#### Duplicate `@keyframes pop`
**Location:** `styles.css:1372-1376` and `1439-1443`
```css
/* Line 1263 */
@keyframes pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}

/* Line 1372 */
@keyframes pop { /* DUPLICATE */ }

/* Line 1439 */
@keyframes pop { /* DUPLICATE */ }
```
**Issue:** Same animation defined three times with identical values.
**Recommendation:** Keep only first definition (line 1263), remove duplicates
**Priority:** Medium
**Risk:** Safe

---

### 1.3 Unused JavaScript Functions

#### `displayWordPreview(words)`
**Location:** `script.js:1934-1942`
```javascript
function displayWordPreview(words) {
    // Remove any existing preview element
    let preview = document.getElementById('word-preview');
    if (preview) {
        preview.remove();
    }
    // Don't create or display word preview anymore
    return;
}
```
**Issue:** Function does nothing except remove an element that doesn't exist.
**Recommendation:** Remove function and calls to `updateWordPreview()` (which calls this)
**Priority:** Medium
**Risk:** Moderate (verify no side effects from removal)

---

#### `showWikipediaLink(word, context, url)`
**Location:** `script.js:3696-3706`
**Issue:** Never called. HTML elements don't exist.
**Recommendation:** Remove function
**Priority:** Low
**Risk:** Safe

---

#### `loadHighScores()`, `displayHighScores(scores)`
**Location:** `script.js:3117-3144`
```javascript
function loadHighScores() {
    // Part of old arcade high score system
}

function displayHighScores(scores) {
    // Never called - HTML element doesn't exist
}
```
**Issue:** Functions for old arcade-style high score display (top 10 with 3-letter names).
**Recommendation:** Remove both functions
**Priority:** Medium
**Risk:** Safe

---

#### `checkPlayStatus()`, `getPlayerId()`
**Location:** `script.js:3032-3074`
```javascript
function checkPlayStatus() {
    // Called on init but does nothing
    // TODO: Implement play tracking
}

function getPlayerId() {
    // Generates/retrieves player ID but unused
}
```
**Issue:** Play status checking stubbed out but never implemented.
**Recommendation:** Remove both functions OR implement if needed for analytics
**Priority:** Low
**Risk:** Safe

---

#### `submitScore()`
**Location:** `script.js:3076-3115`
```javascript
function submitScore() {
    // Old arcade score submission (3-letter names)
    // Uses submit_score.py which is replaced by submit_high_score.py
}
```
**Issue:** Part of deprecated arcade-style high score system. Event listener exists (`script.js:1225`) but button doesn't exist in current HTML.
**Recommendation:** Remove function and event listener
**Priority:** Medium
**Risk:** Safe

---

#### `playThisDate()`
**Location:** `script.js:3413-3427`
```javascript
function playThisDate() {
    // Exposed globally but never called
    // Navigates to a specific date's game
}
```
**Issue:** Function exposed for testing (`window.playThisDate`) but not used anywhere.
**Recommendation:** Remove unless needed for manual testing
**Priority:** Low
**Risk:** Safe

---

#### `testPopup(score)`
**Location:** `script.js:2967-2996`
```javascript
function testPopup(score = null) {
    // Testing function for popup display
    // Exposed globally: window.testPopup
}
```
**Issue:** Testing function activated via URL parameter `?test_popup=X`. Never removed from production.
**Recommendation:** Keep but document as testing utility OR remove if not needed
**Priority:** Low
**Risk:** Safe (only triggered by URL param)

---

#### `showGameFooter()`
**Location:** `script.js:2998-3030`
```javascript
function showGameFooter() {
    // Legacy function that does nothing
    // Footer always visible now
}
```
**Issue:** Never called. Footer visibility handled via CSS.
**Recommendation:** Remove
**Priority:** Low
**Risk:** Safe

---

#### `handleRackClick(e)`
**Location:** `script.js:1283-1317`
```javascript
function handleRackClick(e) {
    // Old click-to-swap functionality
    // Replaced by handleRackBoardClick and handleTileClick
}
```
**Issue:** Function defined but never called. Functionality duplicated in `handleTileClick()`.
**Recommendation:** Remove
**Priority:** Medium
**Risk:** Safe

---

#### `returnTileToRack(cell, addToRack = true)`
**Location:** `script.js:1588-1643`
```javascript
function returnTileToRack(cell, addToRack = true) {
    // Old function for returning tiles to rack
    // Replaced by returnBoardTileToRack()
}
```
**Issue:** Never called. Duplicate functionality with `returnBoardTileToRack()`.
**Recommendation:** Remove
**Priority:** Medium
**Risk:** Safe

---

#### `generateShareGrid()`
**Location:** `script.js:3658-3662`
```javascript
function generateShareGrid() {
    // Generate colored tile representation of the game
    const colors = ['🟦', '🟩', '🟨', '🟧', '🟥'];
    return gameState.turnHistory.map((turn, i) => colors[i] || '⬜').join('');
}
```
**Issue:** Simplified version never called. More sophisticated emoji generation exists in `shareGame()`.
**Recommendation:** Remove
**Priority:** Low
**Risk:** Safe

---

### 1.4 Unused Python Scripts

#### `submit_score.py`
**Location:** `/Users/daverutledge/wikigames/letters/cgi-bin/submit_score.py`
**Issue:** Old arcade-style high score submission (3-letter names, top 10). Replaced by `submit_high_score.py` (single high score per date, URL-based).
**Evidence:** Uses different data directory (`highscores/` vs `high_scores/`) and different data structure.
**Recommendation:** Delete file
**Priority:** Medium
**Risk:** Safe (functionality replaced)

---

#### `get_scores.py`
**Location:** `/Users/daverutledge/wikigames/letters/cgi-bin/get_scores.py`
**Issue:** Retrieves arcade-style high scores (top 10 list). Never called by frontend.
**Recommendation:** Delete file
**Priority:** Medium
**Risk:** Safe

---

#### `check_word.py` (Possibly Redundant)
**Location:** `/Users/daverutledge/wikigames/letters/cgi-bin/check_word.py`
**Issue:** Checks multiple words against dictionary. Similar to `validate_word.py` but simpler.
**Evidence:** Both load the same dictionary (`enable.txt`). `check_word.py` only validates, `validate_word.py` validates + scores.
**Current Usage:** Called by `script.js:2124` in `updatePotentialWordsSidebar()` for live word validation.
**Recommendation:** **Keep** - serves different purpose (lightweight validation for UI feedback)
**Priority:** N/A
**Risk:** N/A

---

## 2. Leftover Code from Previous Versions

### 2.1 Commented Debug Code

#### Debug Mode Initialization
**Location:** `script.js:885-896`
```javascript
// Check for debug mode in URL
const urlParams = new URLSearchParams(window.location.search);
// DEBUG MODE DISABLED IN PRODUCTION
// Uncomment below to enable debug mode for local development
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
**Issue:** Commented code and HTML elements remain in production.
**Recommendation:** Remove HTML elements (`#debug-controls`, `#debug-mode-toggle`). Keep `gameState.debugMode` for console manipulation.
**Priority:** Low
**Risk:** Safe

---

### 2.2 Legacy URL Format Comments

#### LZ-String URL Format
**Location:** Throughout `script.js`
**Evidence:**
- `script.js:206-207`: CDN import for LZ-String library
- `script.js:867-873`: Proactive loading of LZ-String
- `script.js:3220-3288`: `loadSharedGame()` function for LZ-String decompression
- `script.js:3460-3495`: `generateShareableURL()` function for LZ-String compression

**Issue:** V3 binary encoding (45-char URLs) is now primary. LZ-String kept as fallback but adds complexity.
**Current Behavior:**
1. Primary: V3 encoding (`?g=` or `?w=` format, 45 chars)
2. Fallback: LZ-String (`&s=` format, ~200 chars)
3. Ultimate fallback: Seed-only (`?seed=YYYYMMDD`)

**Recommendation:** Consider deprecating LZ-String in future release (after transition period). For now, keep as fallback.
**Priority:** Low (future consideration)
**Risk:** Moderate (need to ensure all old shared URLs still work)

---

### 2.3 Old Event Listeners

#### `#submit-score` Listener
**Location:** `script.js:1225`
```javascript
document.getElementById('submit-score').addEventListener('click', submitScore);
```
**Issue:** Button doesn't exist in HTML. Throws error on page load.
**Evidence:** `#submit-score` only exists in hidden/unused `#game-over-section`.
**Recommendation:** Remove listener OR add null check
**Priority:** High
**Risk:** Safe

---

#### `#share-game` Listener
**Location:** `script.js:1226`
```javascript
document.getElementById('share-game').addEventListener('click', shareGame);
```
**Issue:** Same as above - button doesn't exist in active UI.
**Recommendation:** Remove listener OR add null check
**Priority:** High
**Risk:** Safe

---

### 2.4 Debug Logging

**Location:** Throughout `script.js`
**Count:** 77 `console.log()` statements

**Examples:**
```javascript
// script.js:467
console.log('[V3 Encoder] Generated URL (sorted format):', url);

// script.js:1581
console.log('[DEBUG] returnBoardTileToRack: Updating displays after tile removal');

// script.js:1813
console.log('[DEBUG] findFormedWords: placedTiles=', gameState.placedTiles);
```

**Issue:** Extensive logging in production adds noise to browser console.
**Recommendation:**
- Keep error logging (`console.error`)
- Remove or wrap debug logs in `if (DEBUG_MODE)` flag
- Consider using a logging library with levels (debug/info/warn/error)

**Priority:** Medium
**Risk:** Safe (cosmetic improvement)

---

## 3. Duplicate Code

### 3.1 Multiplier Type Checking

**Location:** JavaScript vs Python
**Files:**
- `script.js:1764-1774`: `getCellType(row, col)`
- `cgi-bin/validate_word.py:40-53`: `get_multiplier(row, col)`

**Issue:** Same multiplier positions defined in two places with slightly different formats.
**JavaScript:**
```javascript
const MULTIPLIERS = {
    tripleWord: [[0,0], [0,8], [8,0], [8,8]],
    doubleWord: [[1,1], [1,7], [7,1], [7,7]],
    tripleLetter: [[0,4], [2,2], [2,6], [4,0], [4,8], [6,2], [6,6], [8,4]],
    doubleLetter: [[3,3], [3,5], [5,3], [5,5]]
};
```
**Python:**
```python
DOUBLE_LETTER = [(3,3), (3,5), (5,3), (5,5)]
TRIPLE_LETTER = [(0,4), (2,2), (2,6), (4,0), (4,8), (6,2), (6,6), (8,4)]
DOUBLE_WORD = [(1,1), (1,7), (7,1), (7,7)]
TRIPLE_WORD = [(0,0), (0,8), (8,0), (8,8)]
```

**Recommendation:** Create shared constants file OR generate Python from JavaScript constants during build.
**Priority:** Medium
**Risk:** Moderate (ensure both stay in sync)

---

### 3.2 Tile Scores

**Location:** JavaScript vs Python
**Files:**
- `script.js:36-43`: `TILE_SCORES`
- `cgi-bin/validate_word.py:13-21`: `TILE_SCORES`

**Issue:** Same tile scoring defined in both languages. Risk of divergence.
**Recommendation:** Same as above - shared constants or generation.
**Priority:** Medium
**Risk:** Moderate

---

### 3.3 Word Formed Extraction

**Files:**
- `script.js:1810-1889`: `findFormedWords()` + `getWordAt()`
- `cgi-bin/validate_word.py:70-147`: `extract_words_formed()`

**Issue:** Similar logic for finding words on board. Client-side for UI, server-side for validation.
**Note:** This duplication is intentional (client preview + server validation), but divergence is a risk.
**Recommendation:** Add tests to ensure both produce same results for same board state.
**Priority:** Low
**Risk:** Low (intentional duplication)

---

## 4. Inconsistencies

### 4.1 Naming Conventions

#### Tile Return Functions
**Location:** `script.js`
- `returnBoardTileToRack(fromPos)` - Used
- `returnTileToRack(cell, addToRack)` - Unused
- `recallTiles()` - Used (returns ALL tiles)

**Issue:** Inconsistent naming for similar operations.
**Recommendation:** Standardize on pattern: `recallTile()` (singular) for one tile, `recallTiles()` (plural) for all.
**Priority:** Low
**Risk:** Safe (cleanup during refactoring)

---

#### High Score Data Directories
**Python Scripts:**
- `submit_score.py`: Uses `/data/highscores/` (old system)
- `submit_high_score.py`: Uses `/data/high_scores/` (new system)
- `get_scores.py`: Uses `/data/highscores/` (old system)
- `get_high_score.py`: Uses `/data/high_scores/` (new system)

**Issue:** Two different directory names for high score data.
**Recommendation:** After removing old system, ensure only `high_scores/` remains.
**Priority:** Medium
**Risk:** Safe (old system deprecated)

---

### 4.2 Event Handler Patterns

**Inconsistent Null Checks:**
```javascript
// Some handlers check for null:
const sharePopupBtn = document.getElementById('share-popup-btn');
if (sharePopupBtn) {
    sharePopupBtn.addEventListener('click', shareGame);
}

// Others don't:
document.getElementById('submit-score').addEventListener('click', submitScore);  // Throws if null
```

**Recommendation:** Add null checks to all event listener registrations OR use optional chaining.
**Priority:** Medium
**Risk:** Safe (prevents console errors)

---

### 4.3 Comment Styles

**Inconsistent Section Markers:**
```javascript
// Some sections use this style:
// ============================================================================
// ANALYTICS HELPER
// ============================================================================

// Others use this:
// V3 URL Encoding/Decoding Utilities (45-character URLs)

// Some use JSDoc:
/**
 * Check if placed tiles form a straight line (horizontal or vertical, no gaps)
 * @returns {Object} { valid: boolean, message: string, invalidTiles: Array }
 */
```

**Recommendation:** Standardize on JSDoc for functions, `// ===` markers for major sections.
**Priority:** Low
**Risk:** Safe (cosmetic)

---

## 5. Optimization Opportunities

### 5.1 Rack Caching for V3 Encoding

**Location:** `script.js:512-557`
**Current Implementation:**
```javascript
// FAST PATH: Check if all racks are cached (eliminates API calls!)
const allRacksCached = gameState.turnHistory.every(turn =>
    turn && turn.originalRack && turn.originalRack.length > 0
);

if (allRacksCached) {
    // Use cached racks - no API calls needed!
} else {
    // SLOW PATH: Fetch racks via API
}
```

**Issue:** Fast path works great, but naming could be clearer.
**Recommendation:** Rename `originalRack` to `cachedRack` for clarity.
**Priority:** Low
**Risk:** Safe

---

### 5.2 Feedback Square Click Handlers

**Location:** `script.js:3719-3793`
**Issue:** Event handlers cloned and re-attached on every UI update to remove old handlers.
```javascript
// Reset all squares
squares.forEach((square, index) => {
    // Remove old click handlers
    square.replaceWith(square.cloneNode(true));  // Nuclear option!
});
```

**Recommendation:** Use event delegation (single listener on parent) instead of individual listeners.
**Priority:** Medium
**Risk:** Moderate (refactoring required)

---

### 5.3 Potential Words Validation

**Location:** `script.js:2091-2223`
**Issue:** Fetches word validation on every tile placement. Could be debounced.
```javascript
fetch(`${API_BASE}/check_word.py?words=${encodeURIComponent(JSON.stringify(wordStrings))}`)
```

**Recommendation:** Debounce validation by 200ms to reduce API calls during rapid tile placement.
**Priority:** Low
**Risk:** Safe (improves performance)

---

### 5.4 LocalStorage Validation

**Location:** `script.js:3854-3894`
**Current:** Validates saved tiles on load to prevent corruption.
```javascript
// Validate rackTiles array
if (parsedState.rackTiles && Array.isArray(parsedState.rackTiles)) {
    const hasInvalidTiles = parsedState.rackTiles.some(t =>
        typeof t !== 'string' || !validLetters.test(t)
    );
    if (hasInvalidTiles) {
        console.warn('Corrupted rackTiles in localStorage, discarding saved state');
        return false;
    }
}
```

**Recommendation:** Add version number to saved state to detect incompatible changes.
**Priority:** Low
**Risk:** Safe

---

## 6. Deprecated Patterns

### 6.1 Query String Parsing

**Location:** Multiple places
**Current:**
```javascript
const urlParams = new URLSearchParams(window.location.search);
const seed = urlParams.get('seed');
```

**Issue:** Modern browsers support `URLSearchParams` well, but could use helper function.
**Recommendation:** Create `getURLParam(name)` helper to centralize parsing.
**Priority:** Low
**Risk:** Safe

---

### 6.2 Event Listener Removal Pattern

**Current:** Cloning elements to remove listeners
```javascript
square.replaceWith(square.cloneNode(true));  // Removes all event listeners
```

**Modern:** Use `AbortController` for listener management
```javascript
const controller = new AbortController();
element.addEventListener('click', handler, { signal: controller.signal });
// Later:
controller.abort();  // Removes listener
```

**Recommendation:** Refactor to use `AbortController` pattern for cleaner listener management.
**Priority:** Low
**Risk:** Low (requires refactoring)

---

### 6.3 Promise Race for Timeouts

**Location:** `script.js:3551-3556`
**Current:**
```javascript
const v3URL = await Promise.race([
    encodeV3URL(),
    new Promise((_, reject) =>
        setTimeout(() => reject(new Error('V3 encoding timeout after 5 seconds')), 5000)
    )
]);
```

**Modern:** Use `AbortSignal.timeout()` (newer browsers)
```javascript
const v3URL = await encodeV3URL({ signal: AbortSignal.timeout(5000) });
```

**Recommendation:** Keep current approach for broader browser support OR add polyfill.
**Priority:** Low
**Risk:** Low

---

## 7. Confusing Code / Documentation Needs

### 7.1 V3 URL Format Confusion

**Location:** `script.js:440-472`
**Issue:** Two V3 formats (`?g=` legacy, `?w=` sorted) with subtle differences.

```javascript
// Build URL with new ?w= parameter (sorted format, enables rack caching)
const url = `https://letters.wiki/?w=${encoded}`;
```

**Recommendation:** Add comprehensive comment explaining:
- `?g=` = V3 legacy format (original rack order)
- `?w=` = V3 sorted format (alphabetically sorted racks, enables caching)
- Both use identical encoding, only difference is rack sorting

**Priority:** High
**Risk:** Safe (documentation only)

---

### 7.2 Turn History Structure

**Location:** `script.js:2448-2454`
**Issue:** `turnHistory` structure not documented.
```javascript
gameState.turnHistory.push({
    tiles: placedWord,
    score: turnScore,
    bingo: placedWord.length === 7,
    originalRack: gameState.currentRack || []  // Cache for instant V3 encoding
});
```

**Recommendation:** Add JSDoc typedef for turn history structure:
```javascript
/**
 * @typedef {Object} TurnHistory
 * @property {Array<{row: number, col: number, letter: string}>} tiles - Tiles placed this turn
 * @property {number} score - Points scored this turn
 * @property {boolean} bingo - Whether all 7 tiles were used
 * @property {string[]} originalRack - Original 7 tiles before placement (for V3 encoding cache)
 */
```

**Priority:** Medium
**Risk:** Safe

---

### 7.3 Placement Validation Flow

**Location:** `script.js:1948-2089`
**Issue:** Complex multi-step validation not clearly explained.

**Flow:**
1. `validateTilePlacement()` - Client-side (straight line, gaps, connectivity)
2. `updatePotentialWordsSidebar()` - Shows preview with validation
3. `submitWord()` - Server-side validation via `validate_word.py`

**Recommendation:** Add flowchart comment or diagram showing validation steps.
**Priority:** Medium
**Risk:** Safe

---

### 7.4 Rack Tile Tracking

**Location:** Multiple places
**Variables:**
- `gameState.tiles` - Original 7 tiles from server
- `gameState.rackTiles` - Current tiles in rack (changes as tiles placed)
- `gameState.currentRack` - Cache of original rack for V3 encoding
- `gameState.turnHistory[].originalRack` - Historical original racks

**Issue:** Four different tile arrays with similar names. Easy to confuse.
**Recommendation:** Rename for clarity:
- `gameState.initialTiles` (was `tiles`)
- `gameState.rackTiles` (keep)
- `gameState.turnStartRack` (was `currentRack`)
- `turnHistory[].startingRack` (was `originalRack`)

**Priority:** Medium
**Risk:** Moderate (requires careful refactoring)

---

### 7.5 Analytics Event Naming

**Location:** `script.js:54-313`
**Issue:** Event names use different conventions.

**Inconsistency:**
- `share_board_started` (snake_case)
- `shareScore.clicked` (camelCase method names)
- `game_init_http_404` (mixed)

**Recommendation:** Standardize on snake_case for GA4 event names (recommended by Google).
**Priority:** Low
**Risk:** Safe (analytics only, no functional impact)

---

## 8. Security & Best Practices

### 8.1 Rate Limiting Implementation

**Location:** `cgi-bin/submit_high_score.py:24-75`
**Current:** MD5 hash of IP address for rate limiting.

```python
ip_key = hashlib.md5(ip_address.encode()).hexdigest()[:12]
```

**Issue:** MD5 is cryptographically broken. Not critical here (just obfuscation), but could use better hash.
**Recommendation:** Use `hashlib.sha256()` instead.
**Priority:** Low
**Risk:** Safe

---

### 8.2 Input Validation

**Location:** `cgi-bin/submit_high_score.py:184-245`
**Current:** Good validation for date, score, board URL.

**Recommendation:** Add CSRF protection for POST endpoints (currently none).
**Priority:** Medium
**Risk:** Moderate (security improvement)

---

### 8.3 Atomic File Writes

**Location:** `cgi-bin/submit_high_score.py:110-134`
**Current:** Excellent - uses atomic writes to prevent corruption.

**No changes needed.** ✅

---

## 9. Summary of Recommendations

### High Priority (Do First)

1. **Remove Old Game-Over UI** - Delete `#game-over-section` and related elements
2. **Fix Event Listener Errors** - Add null checks for `#submit-score`, `#share-game`
3. **Remove Unused High Score System** - Delete `submit_score.py`, `get_scores.py`, `#high-scores-section`
4. **Document V3 URL Formats** - Explain `?g=` vs `?w=` distinction

### Medium Priority (Important Cleanup)

5. **Remove Dead Functions** - `displayWordPreview()`, `loadHighScores()`, `submitScore()`, `handleRackClick()`, `returnTileToRack()`
6. **Remove Duplicate CSS** - `@keyframes pop` (keep only one), sidebar styles, submit-container
7. **Consolidate Debug Logging** - Wrap in debug flag or remove production logs
8. **Add CSRF Protection** - For POST endpoints (`submit_high_score.py`)

### Low Priority (Nice to Have)

9. **Remove Wikipedia Feature Code** - If not planning to implement
10. **Remove Replay Viewer HTML** - If not planning to implement
11. **Standardize Naming** - Tile return functions, event handler patterns
12. **Add Type Documentation** - JSDoc typedefs for turn history, game state
13. **Optimize Event Handlers** - Use event delegation for feedback squares
14. **Improve Analytics Naming** - Standardize on snake_case

---

## 10. Estimated Cleanup Impact

**Lines of Code Removed:**
- **HTML:** ~80 lines (unused sections, debug controls)
- **CSS:** ~120 lines (unused selectors, duplicates)
- **JavaScript:** ~300 lines (dead functions, debug logs)
- **Python:** ~140 lines (2 unused scripts)

**Total:** ~640 lines removed (~15% reduction)

**File Deletions:**
- `submit_score.py`
- `get_scores.py`

**Risk Assessment:**
- **Safe Changes:** 70% (HTML/CSS removal, obvious dead code)
- **Moderate Risk:** 25% (function removal, refactoring)
- **Risky Changes:** 5% (shared constants, validation flow changes)

---

## 11. Testing Checklist Before Cleanup

Before removing any code, verify:

- [ ] Run existing Playwright tests (`testing/core-gameplay/`)
- [ ] Test game completion flow (all 5 turns)
- [ ] Test share score functionality (emoji grid)
- [ ] Test share board functionality (V3 + LZ-String fallback)
- [ ] Test high score submission and retrieval
- [ ] Test localStorage save/restore
- [ ] Test tile placement validation
- [ ] Test word validation (valid/invalid words)
- [ ] Test rack shuffling
- [ ] Test tile recall
- [ ] Test start over functionality
- [ ] Test URL loading (`?seed=`, `?g=`, `?w=`)
- [ ] Test mobile layout (if applicable)

---

## Conclusion

The WikiLetters codebase is well-structured and functional, but carries significant technical debt from multiple feature iterations. The most impactful cleanup would be:

1. **Remove old high score system** (immediate value, low risk)
2. **Fix event listener errors** (prevents console errors)
3. **Remove dead functions** (improves maintainability)
4. **Clean up debug logging** (professional polish)

The codebase would benefit from a focused cleanup sprint targeting the high and medium priority items, which could reduce code by ~15% while improving clarity and maintainability.
