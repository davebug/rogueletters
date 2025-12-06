# Detecting Repeat Plays - Implementation Guide

**Purpose:** Detect when a player has already played today's game on the same device, enabling features like:
- Show high score link only after completing the game
- Display previous score
- Prevent duplicate submissions
- Show "Play Again" vs "Play" messaging

**Last Updated:** November 22, 2025

---

## Current State

### ✅ What's Already Tracked (localStorage)

The game saves complete state to `localStorage.letters_game_state` including:

```javascript
{
    seed: "20251122",           // YYYYMMDD date
    isGameOver: true,           // Completion status
    turnHistory: [...],         // All 5 turns with tiles, scores, racks
    score: 132,                 // Final score
    hasSubmittedScore: true,    // Whether high score was submitted
    timestamp: 1700000000000,   // When saved
    // ... plus all game state (board, tiles, rack, etc.)
}
```

**Load/check logic:** `script.js:3854-3889`

```javascript
const saved = localStorage.getItem('letters_game_state');
if (saved) {
    const parsedState = JSON.parse(saved);
    if (parsedState.seed === gameState.seed) {
        // Same day - restore previous game
        gameState = { ...gameState, ...parsedState };
    }
}
```

### ⚠️ What's Not Implemented (server-side)

Stub functions exist but are disabled:
- `checkPlayStatus()` - script.js:3032
- `getPlayerId()` - script.js:3055 (browser fingerprinting)
- `check_play.py` - Backend stub (always returns `has_played: false`)

---

## Detection Confidence Levels

| Scenario | Detection Method | Confidence | Notes |
|----------|-----------------|------------|-------|
| Completed game (same browser) | `localStorage.isGameOver === true` | 95% | Most reliable |
| Started but not finished | `localStorage.turnHistory.length > 0` | 95% | Can detect partial plays |
| Incognito/private browsing | None | 0% | localStorage cleared between sessions |
| User cleared browser data | None | 0% | Intentional or automatic cleanup |
| Different browser (same device) | None | 0% | localStorage is browser-specific |
| Different device | None | 0% | No cross-device tracking |
| Cross-device with fingerprinting | `getPlayerId()` + backend | ~85% | Would require implementing check_play.py |

**Estimated miss rate:** 5-10% of actual repeat players won't be detected (privacy mode, cleared data, etc.)

---

## Recommended Implementation

### Helper Functions

Add these to `script.js`:

```javascript
/**
 * Check if user has started today's game
 * @returns {boolean} true if user has any progress on today's game
 */
function hasStartedToday() {
    try {
        const saved = localStorage.getItem('letters_game_state');
        if (!saved) return false;

        const state = JSON.parse(saved);
        const todaySeed = gameState.seed; // Current day's seed

        return state.seed === todaySeed &&
               state.turnHistory &&
               state.turnHistory.length > 0;
    } catch (error) {
        console.error('Error checking play status:', error);
        return false;
    }
}

/**
 * Check if user has completed today's game
 * @returns {boolean} true if user finished all 5 turns today
 */
function hasCompletedToday() {
    try {
        const saved = localStorage.getItem('letters_game_state');
        if (!saved) return false;

        const state = JSON.parse(saved);
        const todaySeed = gameState.seed;

        return state.seed === todaySeed &&
               state.isGameOver === true;
    } catch (error) {
        console.error('Error checking completion status:', error);
        return false;
    }
}

/**
 * Get user's previous score for today (if they've played)
 * @returns {number|null} score or null if not played
 */
function getTodaysScore() {
    try {
        const saved = localStorage.getItem('letters_game_state');
        if (!saved) return null;

        const state = JSON.parse(saved);
        const todaySeed = gameState.seed;

        if (state.seed === todaySeed && state.isGameOver) {
            return state.score;
        }
        return null;
    } catch (error) {
        console.error('Error getting today\'s score:', error);
        return null;
    }
}
```

### Use Case: Show High Score Link Only After Completion

**Problem:** Currently, high score links are visible before players complete the game, which can be confusing or spoiler-y.

**Solution:** Show high score link only if `hasCompletedToday() === true`

**Implementation locations:**

1. **Game completion popup** (already shows high score) - NO CHANGE NEEDED
   - Location: `script.js:2604` (`endGame()` function)
   - Already only shown after completion ✅

2. **Main game header/footer** (NEW FEATURE)
   - Add high score display to header or footer
   - Only show if `hasCompletedToday()`

```javascript
// Example: Add to game initialization or header update
function updateHighScoreDisplay() {
    const highScoreContainer = document.getElementById('header-high-score-link');

    if (hasCompletedToday()) {
        // Fetch today's high score
        fetch(`${API_BASE}/get_high_score.py?date=${gameState.seed}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.board_url) {
                    highScoreContainer.innerHTML = `
                        <a href="${data.board_url}" target="_blank" class="high-score-link">
                            🏆 Today's High Score: ${data.score}
                        </a>
                    `;
                    highScoreContainer.style.display = 'block';
                }
            });
    } else {
        // Hide until they complete the game
        highScoreContainer.style.display = 'none';
    }
}

// Call on page load and after game completion
window.addEventListener('load', updateHighScoreDisplay);
// Also call in endGame() function after setting isGameOver = true
```

3. **HTML Addition** (in header or footer section)

```html
<!-- Add to header or above footer -->
<div id="header-high-score-link" style="display: none; text-align: center; padding: 10px;">
    <!-- Populated by updateHighScoreDisplay() -->
</div>
```

4. **CSS Styling**

```css
.high-score-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #f0e6d2;
    border: 2px solid #8b6f47;
    border-radius: 8px;
    color: #4a3c28;
    text-decoration: none;
    font-weight: bold;
    transition: all 0.2s;
}

.high-score-link:hover {
    background: #e6d7bd;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
```

### Other Use Cases

**1. Welcome Back Message**
```javascript
if (hasStartedToday() && !hasCompletedToday()) {
    showMessage("Welcome back! You have a game in progress.");
}
```

**2. Score Comparison**
```javascript
const previousScore = getTodaysScore();
if (previousScore !== null) {
    showMessage(`Your previous score today: ${previousScore} points`);
}
```

**3. Play Again Button**
```javascript
const buttonText = hasCompletedToday() ? "Play Again" : "Play";
document.getElementById('play-button').textContent = buttonText;
```

**4. Prevent Duplicate High Score Submission**
```javascript
// Already implemented in script.js
if (gameState.hasSubmittedScore) {
    console.log('High score already submitted for today');
    return;
}
```

---

## Edge Cases & Considerations

### 1. localStorage Cleared
- **Scenario:** User clears browser data or uses incognito
- **Impact:** Will not detect previous play
- **Mitigation:** Accept 5-10% miss rate as acceptable for privacy-friendly approach
- **Alternative:** Implement server-side tracking (see below)

### 2. Multiple Browsers
- **Scenario:** User plays in Chrome, then Safari
- **Impact:** Each browser sees them as new player
- **Mitigation:** None needed - this is expected behavior
- **Note:** Could implement server-side tracking if cross-browser detection needed

### 3. Shared Device
- **Scenario:** Family shares device, multiple people play
- **Impact:** Second person sees first person's game
- **Mitigation:** Show "Clear Game" button or "Start Fresh" option
- **Note:** Consider adding user profiles in future

### 4. Date Rollover
- **Scenario:** User plays at 11:59 PM, new day starts
- **Impact:** Game should reset for new day
- **Current:** Already handled - seed check compares YYYYMMDD
- **Works correctly:** ✅

### 5. Share URL Loading
- **Scenario:** User loads someone else's share URL for today
- **Impact:** Overwrites their own game state
- **Current:** Share URLs set `isGameOver = true` (read-only)
- **Works correctly:** ✅ (share URLs are marked as complete, won't interfere)

---

## Server-Side Tracking (Optional Enhancement)

If you need more robust tracking (cross-browser, cross-device, catch incognito), implement the stubbed `check_play.py`:

### Backend Implementation

```python
#!/usr/bin/env python3
"""
Track plays by browser fingerprint
"""
import cgi
import json
import os
from pathlib import Path

DATA_DIR = Path("/usr/local/apache2/data/plays")

def main():
    form = cgi.FieldStorage()
    seed = form.getvalue('seed', '')
    player_id = form.getvalue('player', '')

    if not seed or not player_id:
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print()
        print(json.dumps({"error": "Missing parameters"}))
        return

    # Track play in file: data/plays/YYYYMMDD.json
    play_file = DATA_DIR / f"{seed}.json"

    # Check if player has already played
    plays = []
    if play_file.exists():
        with open(play_file, 'r') as f:
            plays = json.load(f)

    has_played = player_id in plays

    response = {
        "has_played": has_played,
        "play_count": len(plays)
    }

    print("Content-Type: application/json")
    print("Access-Control-Allow-Origin: *")
    print()
    print(json.dumps(response))

if __name__ == "__main__":
    main()
```

### Record Play After Completion

Add to `endGame()` function:

```javascript
async function endGame() {
    gameState.isGameOver = true;

    // Record play on server
    const playerId = getPlayerId();
    try {
        await fetch(`${API_BASE}/record_play.py?seed=${gameState.seed}&player=${playerId}`);
    } catch (error) {
        console.error('Failed to record play:', error);
        // Non-critical, continue anyway
    }

    // ... rest of endGame() logic
}
```

### Trade-offs

**Pros:**
- Cross-browser detection
- Works in incognito (sort of - fingerprint less reliable)
- Can catch ~85% vs ~95% with localStorage

**Cons:**
- More complexity
- Server-side storage needed
- Privacy concerns (fingerprinting)
- Not perfect (VPN/fingerprint randomizers defeat it)

**Recommendation:** Start with localStorage only. Add server-side if data shows high replay rate is causing issues (like duplicate high score submissions).

---

## Testing

### Manual Testing Checklist

- [ ] Complete a game, verify `localStorage.letters_game_state` exists
- [ ] Check `isGameOver === true` after completion
- [ ] Reload page, verify high score link appears
- [ ] Clear localStorage, verify high score link disappears
- [ ] Start game without finishing, verify `turnHistory.length > 0`
- [ ] Test date rollover (change system clock to next day)
- [ ] Load someone else's share URL, verify it doesn't break detection

### Automated Tests

Add to `testing/core-gameplay/`:

```javascript
test('hasCompletedToday() detects finished games', async ({ page }) => {
    // Complete a game
    await playCompleteGame(page);

    // Check detection
    const hasCompleted = await page.evaluate(() => {
        return window.hasCompletedToday();
    });

    expect(hasCompleted).toBe(true);
});

test('hasCompletedToday() returns false for unfinished games', async ({ page }) => {
    // Start but don't finish
    await startGame(page);

    const hasCompleted = await page.evaluate(() => {
        return window.hasCompletedToday();
    });

    expect(hasCompleted).toBe(false);
});
```

---

## Implementation Checklist

When implementing high score link on main page:

- [ ] Add helper functions (`hasStartedToday`, `hasCompletedToday`, `getTodaysScore`)
- [ ] Add HTML container for high score link
- [ ] Add CSS styling for high score link
- [ ] Add `updateHighScoreDisplay()` function
- [ ] Call on page load
- [ ] Call in `endGame()` after setting `isGameOver = true`
- [ ] Test with completed game
- [ ] Test with incomplete game
- [ ] Test with no game played
- [ ] Test after clearing localStorage
- [ ] Deploy and verify on production

---

## Future Enhancements

1. **User Profiles** - Allow multiple users on same device
2. **Play History** - Track all-time stats (games played, average score, best score)
3. **Streak Tracking** - Detect consecutive days played
4. **Social Features** - Compare scores with friends (requires server-side)
5. **Cross-Device Sync** - Require user accounts (significant architecture change)

---

## References

- **Current implementation:** `script.js:3842-3889` (saveGameState, loadGameState)
- **Game state object:** `script.js:8-29` (all tracked properties)
- **Stub server tracking:** `cgi-bin/check_play.py` (not implemented)
- **Fingerprinting:** `script.js:3055-3074` (getPlayerId function)
- **High score system:** `cgi-bin/get_high_score.py`, `cgi-bin/submit_high_score.py`

---

**Confidence Summary:** 95% reliable detection on same browser using localStorage alone. Acceptable for casual word game. Server-side tracking optional if higher confidence needed.
