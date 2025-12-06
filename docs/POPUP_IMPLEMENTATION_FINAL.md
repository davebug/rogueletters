# WikiLetters Popup Implementation - Final Design

## Overview
Transform WikiLetters' game completion from a full-page replacement to a WikiDates-style popup overlay. This document represents the final, simplified design based on WikiDates' proven approach.

## Design Decisions

### What We're Keeping
- Numerical score display (always visible in popup)
- Top 3 high scores (reduced from top 10 for mobile)
- High score submission for top 3 performers only
- Share functionality with score and rank
- Feedback squares in footer only (like WikiDates)

### What We're Removing
- The entire `#game-over-section` (second page)
- "Play Tomorrow's Game" button
- View Replay feature entirely
- Duplicate feedback squares in end screen

## Popup States

### State 1: High Score Entry (Top 3 Only)
Only shown if player's score qualifies for top 3:
```
┌─────────────────────────┐
│  [Dynamic Title]        │
│                         │
│  Your Score: 142        │
│                         │
│  NEW HIGH SCORE!        │
│  Enter your name:       │
│  [AAA] (input)          │
│                         │
│  [Submit] [Skip]        │
└─────────────────────────┘
```

### State 2: Final View (All Players)
Shown immediately for non-top-3 scores, or after submission/skip for top 3:
```
┌─────────────────────────┐
│  [Dynamic Title]        │
│                         │
│  Your Score: 142        │
│                         │
│  Today's Top Scores:    │
│  1. ABC - 186           │
│  2. YOU - 142 ← (highlighted if applicable)
│  3. XYZ - 128           │
│                         │
│  [Share] [Close]        │
└─────────────────────────┘
```

## Score-Based Dynamic Titles
Following WikiDates' pattern of dynamic messaging:

| Score Range | Title Message |
|------------|---------------|
| 0-19       | Game Complete |
| 20-39      | Nice Try!     |
| 40-59      | Good Job!     |
| 60-79      | Great Work!   |
| 80-99      | Excellent!    |
| 100-119    | Outstanding!  |
| 120-139    | Incredible!   |
| 140-159    | Phenomenal!   |
| 160+       | Legendary!    |

## Implementation Steps

### Phase 1: HTML Structure
Following WikiDates' approach exactly:

**IMPORTANT: Add cache-busting version numbers to CSS/JS:**
```html
<link rel="stylesheet" href="styles.css?v=2.0">
<script src="script.js?v=2.0"></script>
```

```html
<!-- Add after error-modal, matching WikiDates structure -->
<div id="popup" class="hidden">
    <div class="popup-content">
        <h2 id="popupTitle"></h2>
        <div id="popupScore" class="score-display"></div>

        <!-- High Score Entry (conditional) -->
        <div id="highScoreEntry" class="hidden">
            <p>NEW HIGH SCORE!</p>
            <label>Enter your name:</label>
            <input type="text" id="playerNameInput"
                   placeholder="AAA" maxlength="3"
                   style="text-transform: uppercase;">
            <div id="nameError" class="error-message"></div>
            <div class="popup-buttons">
                <button id="submitScore" class="btn btn-primary">Submit</button>
                <button id="skipScore" class="btn btn-secondary">Skip</button>
            </div>
        </div>

        <!-- High Scores Display (conditional) -->
        <div id="highScoresDisplay" class="hidden">
            <h3>Today's Top Scores:</h3>
            <ol id="topScoresList"></ol>
        </div>

        <!-- Action Buttons -->
        <div class="popup-buttons">
            <button id="shareButton" class="btn btn-primary hidden">Share</button>
            <button id="closePopup" class="btn btn-secondary">Close</button>
        </div>
    </div>
</div>
```

### Phase 2: CSS Styling
Adapting WikiDates' popup styles:

```css
/* Base popup styles from WikiDates */
#popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    background-color: var(--white);
    border: 2px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
    width: 320px;
    max-width: 90%;
    max-height: 80vh;
    overflow-y: auto;
}

#popup.hidden {
    display: none;
}

#popup .popup-content {
    padding: 20px;
    text-align: center;
}

/* Semi-transparent backdrop */
#popup::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: -1;
}

/* Score display */
.score-display {
    font-size: 48px;
    font-weight: bold;
    color: var(--primary);
    margin: 20px 0;
}

/* High score entry */
#playerNameInput {
    width: 100px;
    font-size: 24px;
    font-weight: bold;
    text-align: center;
    padding: 10px;
    margin: 10px 0;
    border: 2px solid var(--border);
    border-radius: 4px;
}

/* High scores list */
#topScoresList {
    list-style: none;
    padding: 0;
    margin: 20px 0;
    text-align: left;
    max-width: 200px;
    margin-left: auto;
    margin-right: auto;
}

#topScoresList li {
    padding: 8px 0;
    border-bottom: 1px solid var(--border-light);
    display: flex;
    justify-content: space-between;
}

#topScoresList li.current-player {
    background-color: var(--highlight);
    font-weight: bold;
    padding: 8px 10px;
    margin: 0 -10px;
    border-radius: 4px;
}

/* Buttons */
.popup-buttons {
    margin-top: 20px;
    display: flex;
    gap: 10px;
    justify-content: center;
}

/* Error message */
.error-message {
    color: #d32f2f;
    font-size: 14px;
    margin-top: 5px;
    min-height: 20px;
}

/* Mobile adjustments */
@media (max-width: 480px) {
    #popup {
        width: 95%;
        max-height: 70vh;
    }

    .score-display {
        font-size: 36px;
    }
}
```

### Phase 3: JavaScript Implementation
Following WikiDates' pattern:

```javascript
// Main popup display function (like WikiDates' showPopup)
function showGameCompletePopup() {
    const popup = document.getElementById('popup');
    const score = gameState.score;

    // Set dynamic title based on score
    const title = getScoreTitle(score);
    document.getElementById('popupTitle').textContent = title;

    // Display score
    document.getElementById('popupScore').textContent = score;

    // Check if score qualifies for top 3
    checkHighScoreEligibility(score).then(qualifies => {
        if (qualifies) {
            showHighScoreEntry();
        } else {
            showFinalScores();
        }
    });

    // Show popup (WikiDates style)
    popup.classList.remove('hidden');
}

// Get dynamic title based on score
function getScoreTitle(score) {
    if (score >= 160) return "Legendary!";
    if (score >= 140) return "Phenomenal!";
    if (score >= 120) return "Incredible!";
    if (score >= 100) return "Outstanding!";
    if (score >= 80) return "Excellent!";
    if (score >= 60) return "Great Work!";
    if (score >= 40) return "Good Job!";
    if (score >= 20) return "Nice Try!";
    return "Game Complete";
}

// Validate name input
function isNameAllowed(name) {
    // Check if only letters A-Z
    if (!/^[A-Z]{3}$/.test(name)) {
        return { valid: false, error: 'Please use 3 letters only' };
    }

    // Basic profanity check
    const blocked = ['ASS', 'FAG', 'FUK', 'DAM', 'HEL', 'SHT'];
    if (blocked.includes(name)) {
        return { valid: false, error: 'Please choose a different name' };
    }

    return { valid: true };
}

// Show high score entry form
function showHighScoreEntry() {
    document.getElementById('highScoreEntry').classList.remove('hidden');
    document.getElementById('highScoresDisplay').classList.add('hidden');
    document.getElementById('shareButton').classList.add('hidden');

    // Auto-focus input
    const input = document.getElementById('playerNameInput');
    input.value = '';
    input.focus();

    // Handle submit
    document.getElementById('submitScore').onclick = async () => {
        const name = input.value.toUpperCase() || 'AAA';

        // Validate name
        const validation = isNameAllowed(name);
        if (!validation.valid) {
            document.getElementById('nameError').textContent = validation.error;
            return;
        }

        await submitHighScore(name, gameState.score);
        showFinalScores(name);
    };

    // Handle skip
    document.getElementById('skipScore').onclick = () => {
        showFinalScores();
    };
}

// Show final scores view
async function showFinalScores(playerName = null) {
    document.getElementById('highScoreEntry').classList.add('hidden');
    document.getElementById('highScoresDisplay').classList.remove('hidden');
    document.getElementById('shareButton').classList.remove('hidden');

    // Fetch and display top 3 scores
    const scores = await fetchHighScores();
    const topThree = scores.slice(0, 3);

    const list = document.getElementById('topScoresList');
    list.innerHTML = '';

    topThree.forEach((entry, index) => {
        const li = document.createElement('li');

        // Highlight current player's entry
        if (playerName && entry.name === playerName && entry.score === gameState.score) {
            li.classList.add('current-player');
        }

        li.innerHTML = `
            <span>${index + 1}. ${entry.name}</span>
            <span>${entry.score}</span>
        `;
        list.appendChild(li);
    });

    // Set up share button
    document.getElementById('shareButton').onclick = () => {
        shareGameResult(playerName, topThree);
    };
}

// Check if score qualifies for top 3
async function checkHighScoreEligibility(score) {
    const scores = await fetchHighScores();
    return scores.length < 3 || score > scores[2].score;
}

// Submit high score
async function submitHighScore(name, score) {
    const response = await fetch('/cgi-bin/submit_score.py', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            seed: gameState.seed,
            name: name,
            score: score,
            play_data: gameState.playData
        })
    });
    return response.json();
}

// Share functionality (WikiDates style)
function shareGameResult(playerName, topScores) {
    const feedback = Array.from(document.querySelectorAll('#feedbackRow .feedback-square'))
        .map(square => {
            const score = parseInt(square.dataset.score || '0');
            if (score >= 60) return '🟩';
            if (score >= 30) return '🟨';
            if (score >= 15) return '🟧';
            return '🟥';
        })
        .join('');

    let shareText = `WikiLetters ${gameState.dateStr}\n`;
    shareText += `${feedback}\n`;
    shareText += `Score: ${gameState.score}`;

    // Add rank if player made top 3
    if (playerName) {
        const rank = topScores.findIndex(s => s.name === playerName && s.score === gameState.score) + 1;
        if (rank > 0) {
            shareText += ` (Rank #${rank})`;
        }
    }

    shareText += `\n\nPlay at: letters.wiki`;

    // Use native share or clipboard (like WikiDates)
    if (navigator.share) {
        navigator.share({ text: shareText });
    } else {
        navigator.clipboard.writeText(shareText);
        showToast('Copied to clipboard!');
    }
}

// Modify endGame function
function endGame() {
    gameState.isGameOver = true;
    saveGameState();

    // Disable game interactions
    document.getElementById('submit-word').disabled = true;
    document.getElementById('recall-tiles').disabled = true;

    // Show footer with final feedback
    showGameFooter();

    // Show popup instead of switching pages
    showGameCompletePopup();
}

// Close popup handler
document.getElementById('closePopup').onclick = () => {
    document.getElementById('popup').classList.add('hidden');
};

// Backdrop click handler (WikiDates style)
document.getElementById('popup').addEventListener('click', (e) => {
    // Only close if clicking backdrop, not content
    if (e.target.id === 'popup') {
        // Don't close during name entry
        const isEnteringName = !document.getElementById('highScoreEntry').classList.contains('hidden');
        if (!isEnteringName) {
            document.getElementById('popup').classList.add('hidden');
        }
    }
});
```

### Phase 4: High Scores API Integration

```javascript
// Fetch high scores from server
async function fetchHighScores() {
    try {
        const response = await fetch(`/cgi-bin/get_highscores.py?seed=${gameState.seed}`);
        const data = await response.json();
        return data.scores || [];
    } catch (error) {
        console.error('Failed to fetch high scores:', error);
        return [];
    }
}

// Toast notification (WikiDates style)
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }, 100);
}
```

### Phase 5: Clean Up

1. **Remove from HTML:**
   - Entire `#game-over-section` div
   - `#replay-viewer` div
   - Any replay-related buttons

2. **Remove from JavaScript:**
   - Replay functionality
   - Old game-over display logic
   - Tomorrow's game navigation

3. **Update Tests:**
   - Change checks for `#game-over-section` to `#popup`
   - Update visibility assertions

## Testing Checklist

- [ ] Popup appears when game ends
- [ ] Correct dynamic title based on score
- [ ] Score displays properly
- [ ] High score entry only shows for top 3 qualifiers
- [ ] Name input auto-focuses on mobile
- [ ] Skip button works correctly
- [ ] Top 3 scores display correctly
- [ ] Current player's score is highlighted
- [ ] Share button copies correct format
- [ ] Close button works
- [ ] Board remains visible behind popup
- [ ] Mobile responsive at various sizes
- [ ] Keyboard accessible (ESC to close)

## Migration Strategy

1. **Keep old code temporarily:**
   - Comment out `#game-over-section` display in endGame()
   - Keep HTML structure until popup is verified

2. **Test in parallel:**
   - Add feature flag to toggle between old and new

3. **Gradual rollout:**
   - Test locally first
   - Deploy to staging
   - Monitor for issues
   - Full deployment

## Benefits Over Current Implementation

1. **Better UX:** Less jarring, board stays visible
2. **Simplified:** No page navigation, single cohesive experience
3. **Mobile-friendly:** Top 3 instead of top 10, optimized for small screens
4. **Consistent:** Matches WikiDates' proven pattern
5. **Cleaner:** Removes unnecessary features (replay, tomorrow button)

## Notes

- This implementation closely follows WikiDates' `showPopup()` pattern
- The multi-state handling is simplified to just two states
- All animations and transitions should match WikiDates for consistency
- Error handling should gracefully fall back to showing scores without submission