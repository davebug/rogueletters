# Final Implementation Decisions for WikiLetters Popup

## Resolved Questions

### 1. High Scores API ✅
- **Status**: Fully working, no changes needed
- Backend keeps top 10, frontend displays top 3
- APIs at `/cgi-bin/get_scores.py` and `/cgi-bin/submit_score.py`

### 2. Tie Handling ✅
- **Decision**: Earlier submission wins (first come, first served)
- **Implementation**: Already handled by backend - timestamps ensure order

### 3. Feedback Colors for Share ✅
- **Decision**: Use score-based colors (like current Letters)
```javascript
// Share text will use:
🟩 = 60+ points (excellent)
🟨 = 30-59 points (good)
🟧 = 15-29 points (okay)
🟥 = 0-14 points (low)
```

### 4. Backdrop Behavior ✅
- **Decision**: Same as WikiDates
- Clicking backdrop closes popup (except during name entry)
- Require explicit action during name submission

### 5. Input Validation ✅
- **Letters only**: A-Z characters
- **Basic profanity filter**:
```javascript
const blockedWords = ['ASS', 'FAG', 'FUK', 'DAM', 'HEL', 'SHT'];
```
- Show error message if blocked word attempted

### 6. Feedback Method ✅
- **Decision**: No toast notifications for now
- Use inline messages or alerts for errors
- Can add toast later if needed

### 7. Cache Busting ✅
- **Decision**: Yes, implement version numbers
```html
<link rel="stylesheet" href="styles.css?v=2.0">
<script src="script.js?v=2.0"></script>
```

### 8. Testing ✅
- **Decision**: Don't over-engineer edge cases
- Test basic flow locally
- Handle edge cases as they arise in production

## Implementation Checklist

### Phase 1: HTML Structure
- [ ] Add popup div after error-modal
- [ ] Include both states (name entry, scores display)
- [ ] Add version numbers to CSS/JS imports

### Phase 2: CSS Styling
- [ ] Copy WikiDates popup styles
- [ ] Add styles for score display
- [ ] Add styles for name input
- [ ] Mobile-responsive design

### Phase 3: JavaScript Core
- [ ] Add `showGameCompletePopup()` function
- [ ] Add `checkHighScoreEligibility()` function
- [ ] Add profanity filter
- [ ] Wire up to `endGame()`

### Phase 4: State Management
- [ ] Show name entry if top 3
- [ ] Show scores immediately if not top 3
- [ ] Handle submit/skip buttons
- [ ] Highlight player's score

### Phase 5: Share Functionality
- [ ] Generate score-based color squares
- [ ] Include score and rank (if applicable)
- [ ] Copy to clipboard

### Phase 6: Cleanup
- [ ] Remove `#game-over-section` from HTML
- [ ] Remove replay functionality
- [ ] Remove "Play Tomorrow" button
- [ ] Update tests

## Simple Profanity Filter

```javascript
function isNameAllowed(name) {
    // Check if only letters
    if (!/^[A-Z]{3}$/.test(name)) {
        return false;
    }

    // Basic profanity check
    const blocked = ['ASS', 'FAG', 'FUK', 'DAM', 'HEL', 'SHT'];
    return !blocked.includes(name);
}

function handleNameSubmit() {
    const name = document.getElementById('playerNameInput').value.toUpperCase();

    if (!isNameAllowed(name)) {
        document.getElementById('nameError').textContent = 'Please choose a different name';
        return;
    }

    // Proceed with submission
    submitHighScore(name);
}
```

## Color Mapping for Share

```javascript
function getSquareColor(score) {
    if (score >= 60) return '🟩';
    if (score >= 30) return '🟨';
    if (score >= 15) return '🟧';
    return '🟥';
}

function generateShareText() {
    const squares = gameState.turnScores.map(score => getSquareColor(score)).join('');
    // Rest of share logic...
}
```

## No Over-Engineering

We're NOT implementing:
- Multi-tab detection
- Refresh state preservation
- Network retry logic
- Complex validation
- Loading states
- Toast notifications

Keep it simple, match WikiDates, ship it!