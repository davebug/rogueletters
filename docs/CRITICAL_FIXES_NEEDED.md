# Critical Fixes Needed - Daily Letters

## 🔴 CRITICAL: Game Breaking Issues

### 1. Turn Progression Works But Needs Valid Words
**Status:** The turn system works correctly when valid words are submitted
**Problem:** Testing is difficult because forming valid words manually is hard
**Solution:**
- Turn progression code is correct
- Need better test helpers to form valid words programmatically
- Consider adding debug mode with relaxed validation for testing

### 2. Game Never Ends - No Game Over Screen
**Current:** Game has endGame() function but UI elements are hidden
**Problem:** When turn 5 completes, game over section doesn't show
**Fix Required:**
```javascript
function endGame() {
    gameState.isGameOver = true;

    // Show game over section
    document.getElementById('game-over-section').style.display = 'block';
    document.getElementById('game-container').style.display = 'none';

    // Display final score
    document.getElementById('final-score-display').textContent =
        `Final Score: ${gameState.score}`;

    // Check for high score
    checkHighScore(gameState.score);
}
```

### 3. Share Feature Not Implemented
**Current:** Button exists but no functionality
**Required Implementation:**
```javascript
function shareGame() {
    const tiles = generateTileColors(); // Based on turn scores
    const text = `Daily Letters - ${gameState.dateStr}\n` +
                `${tiles}\n` +
                `Score: ${gameState.score}\n\n` +
                `Play at: letters.domain.com`;

    if (navigator.share) {
        navigator.share({ text });
    } else {
        navigator.clipboard.writeText(text);
        showMessage('Copied to clipboard!');
    }
}
```

### 4. High Score System Missing
**Current:** HTML elements exist but no backend
**Required:**
- `/cgi-bin/submit_score.py` endpoint
- `/cgi-bin/get_scores.py` endpoint
- Storage in `/data/highscores/YYYY-MM-DD.json`
- Name entry interface activation

### 5. Retry System Partially Working
**Current:** Decrements counter but doesn't get new tiles properly
**Fix:** Update retry to properly fetch new tiles from server

## 🟡 IMPORTANT: Core Feature Gaps

### 6. No Bingo Bonus
**Missing:** +50 points for using all 7 tiles
**Implementation:**
```javascript
if (placedWord.length === 7) {
    score += 50;
    showMessage('BINGO! +50 points!');
}
```

### 7. Individual Tile Recall Missing
**Current:** Can only recall all tiles
**Required:** Click individual placed tile to return to rack

### 8. No Shuffle Button
**Missing:** Button to randomize tile order in rack
**Simple Fix:** Add button and Fisher-Yates shuffle

### 9. No Keyboard Navigation
**Missing:** Arrow keys, number keys, shortcuts
**Impact:** Accessibility issue

### 10. No Help/Tutorial
**Missing:** Instructions for new players
**Required:** Modal with rules and controls

## 🟢 MINOR: Quality of Life

### 11. Visual Celebrations Missing
- No animations for good words
- No confetti on game complete
- No streak celebrations

### 12. Statistics Not Tracked
- No average score
- No personal best
- No games played counter

### 13. Theme Toggle Missing
- No dark mode
- No color preferences

### 14. Mobile Experience Basic
- Touch controls not optimized
- No pinch-to-zoom
- No swipe navigation

## Implementation Priority Order

### Phase 1: Make Game Completable (TODAY)
1. ✅ Fix turn progression (DONE - works with valid words)
2. **Implement game over screen**
3. **Add share functionality**
4. **Fix retry mechanism**

### Phase 2: Core Features (TOMORROW)
1. **High score system**
2. **Individual tile recall**
3. **Bingo bonus**
4. **Shuffle button**

### Phase 3: Polish (DAY 3)
1. **Help/tutorial modal**
2. **Keyboard navigation**
3. **Visual celebrations**
4. **Statistics tracking**

## Test Coverage Needed

### Critical Tests to Add:
```javascript
// 1. Test game completion
test('game ends after 5 valid turns', async () => {
    // Play 5 turns with valid words
    // Verify game over screen appears
    // Check final score display
});

// 2. Test share functionality
test('share button generates correct text', async () => {
    // Complete game
    // Click share
    // Verify text format
});

// 3. Test high score submission
test('high scores save and display', async () => {
    // Complete game with good score
    // Enter name
    // Verify appears in leaderboard
});

// 4. Test retry mechanism
test('retry gets new tiles', async () => {
    // Click retry
    // Verify new tiles appear
    // Verify retry count decreases
});

// 5. Test bingo bonus
test('using all 7 tiles adds 50 points', async () => {
    // Place 7-letter word
    // Verify +50 bonus applied
});
```

## Quick Win Implementations

### 1. Game Over Screen (15 minutes)
```javascript
// In endGame() function
document.getElementById('game-over-section').style.display = 'block';
document.getElementById('final-score-display').innerHTML =
    `<h2>Final Score: ${gameState.score}</h2>`;
```

### 2. Share Button (20 minutes)
```javascript
document.getElementById('share-game').addEventListener('click', () => {
    const colors = gameState.turnHistory.map(turn => {
        if (turn.score >= 80) return '🟦';
        if (turn.score >= 60) return '🟩';
        if (turn.score >= 40) return '🟨';
        if (turn.score >= 20) return '🟧';
        return '🟥';
    }).join('');

    const text = `Daily Letters - ${gameState.dateStr}\n${colors}\nScore: ${gameState.score}`;
    navigator.clipboard.writeText(text);
    showMessage('Copied to clipboard!');
});
```

### 3. Shuffle Button (10 minutes)
```javascript
function shuffleRack() {
    const tiles = Array.from(document.querySelectorAll('#tile-rack .tile'));
    for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    const rack = document.getElementById('tile-rack');
    rack.innerHTML = '';
    tiles.forEach(tile => rack.appendChild(tile));
}
```

### 4. Bingo Bonus (15 minutes)
```javascript
// In submitWord() after calculating score
if (placedWord.length === 7) {
    data.score += 50;
    showMessage('BINGO! +50 bonus points!');
    // Add visual celebration
}
```

## Conclusion

The game core is solid but incomplete. The highest priority is making the game finishable with proper end-game experience. All the UI elements exist but need to be connected to functionality. With 2-3 hours of focused work, the game could have all Phase 1 features complete and be fully playable.