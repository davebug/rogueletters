# WikiLetters Popup Implementation - Phased Approach

## Phase 1: Basic Popup Structure (Test Foundation)
**Goal**: Get a basic popup showing when game ends

### 1.1 HTML Changes
```html
<!-- Add to index.html after error-modal -->
<div id="game-popup" class="hidden">
    <div class="popup-content">
        <h2 id="popup-title">Game Complete!</h2>
        <div id="popup-score">Score: <span id="score-value">0</span></div>
        <button id="close-popup" class="btn btn-secondary">Close</button>
    </div>
</div>
```

### 1.2 CSS Changes
```css
/* Add to styles.css */
#game-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    background-color: white;
    border: 2px solid #333;
    border-radius: 12px;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
    width: 320px;
    max-width: 90%;
    padding: 20px;
    text-align: center;
}

#game-popup.hidden {
    display: none;
}

/* Backdrop */
#game-popup::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: -1;
}
```

### 1.3 JavaScript Changes
```javascript
// Modify endGame() function
function endGame() {
    gameState.isGameOver = true;
    saveGameState();

    // Disable game controls
    document.getElementById('submit-word').disabled = true;
    document.getElementById('recall-tiles').disabled = true;

    // Show popup instead of game-over-section
    showBasicPopup();
}

function showBasicPopup() {
    const popup = document.getElementById('game-popup');
    document.getElementById('score-value').textContent = gameState.score;
    popup.classList.remove('hidden');
}

// Add close handler
document.getElementById('close-popup').addEventListener('click', () => {
    document.getElementById('game-popup').classList.add('hidden');
});
```

### 1.4 Testing Checkpoint ✓
- [ ] Game ends after 5 turns
- [ ] Popup appears with score
- [ ] Close button works
- [ ] Board stays visible behind popup
- [ ] Old game-over-section doesn't show

---

## Phase 2: Dynamic Titles & Score Display
**Goal**: Add score-based titles and better score presentation

### 2.1 JavaScript Changes
```javascript
function getScoreTitle(score) {
    if (score >= 160) return "🎉 Legendary!";
    if (score >= 140) return "⭐ Phenomenal!";
    if (score >= 120) return "🌟 Incredible!";
    if (score >= 100) return "✨ Outstanding!";
    if (score >= 80) return "👏 Excellent!";
    if (score >= 60) return "💪 Great Work!";
    if (score >= 40) return "👍 Good Job!";
    if (score >= 20) return "😊 Nice Try!";
    return "✅ Game Complete";
}

function showBasicPopup() {
    const popup = document.getElementById('game-popup');
    const score = gameState.score;

    // Set dynamic title
    document.getElementById('popup-title').textContent = getScoreTitle(score);
    document.getElementById('score-value').textContent = score;

    popup.classList.remove('hidden');
}
```

### 2.2 CSS Enhancement
```css
#popup-score {
    font-size: 32px;
    font-weight: bold;
    color: #2196F3;
    margin: 20px 0;
}
```

### 2.3 Testing Checkpoint ✓
- [ ] Title changes based on score
- [ ] Score displays prominently
- [ ] Emojis show correctly

---

## Phase 3: High Score Retrieval
**Goal**: Fetch and check if player qualifies for top 3

### 3.1 JavaScript - Add API Functions
```javascript
async function fetchHighScores() {
    try {
        const response = await fetch(`${API_BASE}/get_scores.py?date=${gameState.seed}`);
        const data = await response.json();
        return data.scores || [];
    } catch (error) {
        console.error('Failed to fetch scores:', error);
        return [];
    }
}

async function checkTop3Eligibility(score) {
    const scores = await fetchHighScores();
    const top3 = scores.slice(0, 3);
    return top3.length < 3 || score > (top3[2]?.score || 0);
}
```

### 3.2 Update Popup Logic
```javascript
async function showBasicPopup() {
    const popup = document.getElementById('game-popup');
    const score = gameState.score;

    document.getElementById('popup-title').textContent = getScoreTitle(score);
    document.getElementById('score-value').textContent = score;

    // Check eligibility (but don't act on it yet)
    const isTop3 = await checkTop3Eligibility(score);
    console.log('Qualifies for top 3?', isTop3);

    popup.classList.remove('hidden');
}
```

### 3.3 Testing Checkpoint ✓
- [ ] Console shows eligibility check
- [ ] No errors fetching scores
- [ ] Works with empty scoreboard

---

## Phase 4: Conditional Name Entry
**Goal**: Show name input only for top 3 scorers

### 4.1 HTML Update
```html
<div id="game-popup" class="hidden">
    <div class="popup-content">
        <h2 id="popup-title">Game Complete!</h2>
        <div id="popup-score">Score: <span id="score-value">0</span></div>

        <!-- Name entry section -->
        <div id="name-entry-section" class="hidden">
            <p>NEW HIGH SCORE!</p>
            <label>Enter your name:</label>
            <input type="text" id="player-name-input"
                   placeholder="AAA" maxlength="3"
                   style="text-transform: uppercase;">
            <div id="name-error" class="error-message"></div>
            <div class="popup-buttons">
                <button id="submit-name" class="btn btn-primary">Submit</button>
                <button id="skip-name" class="btn btn-secondary">Skip</button>
            </div>
        </div>

        <!-- Will add scores display here in Phase 5 -->

        <button id="close-popup" class="btn btn-secondary">Close</button>
    </div>
</div>
```

### 4.2 JavaScript Update
```javascript
async function showBasicPopup() {
    const popup = document.getElementById('game-popup');
    const score = gameState.score;

    document.getElementById('popup-title').textContent = getScoreTitle(score);
    document.getElementById('score-value').textContent = score;

    const isTop3 = await checkTop3Eligibility(score);

    if (isTop3) {
        showNameEntry();
    } else {
        // Will show scores in Phase 5
        document.getElementById('close-popup').style.display = 'block';
    }

    popup.classList.remove('hidden');
}

function showNameEntry() {
    document.getElementById('name-entry-section').classList.remove('hidden');
    document.getElementById('close-popup').style.display = 'none';
    document.getElementById('player-name-input').focus();
}
```

### 4.3 Testing Checkpoint ✓
- [ ] Name input shows for high scores
- [ ] Name input hidden for low scores
- [ ] Input auto-focuses
- [ ] Placeholder shows "AAA"

---

## Phase 5: Name Validation & Submission
**Goal**: Validate names and submit to server

### 5.1 JavaScript - Validation
```javascript
function isNameValid(name) {
    // Letters only
    if (!/^[A-Z]{3}$/.test(name)) {
        return { valid: false, error: 'Please use 3 letters only' };
    }

    // Profanity check
    const blocked = ['ASS', 'FAG', 'FUK', 'DAM', 'HEL', 'SHT'];
    if (blocked.includes(name)) {
        return { valid: false, error: 'Please choose a different name' };
    }

    return { valid: true };
}

document.getElementById('submit-name').addEventListener('click', async () => {
    const input = document.getElementById('player-name-input');
    const name = input.value.toUpperCase() || 'AAA';

    const validation = isNameValid(name);
    if (!validation.valid) {
        document.getElementById('name-error').textContent = validation.error;
        return;
    }

    // Submit score
    await submitHighScore(name);
});

async function submitHighScore(name) {
    try {
        const response = await fetch(`${API_BASE}/submit_score.py`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: gameState.seed,
                name: name,
                score: gameState.score
            })
        });

        if (response.ok) {
            // Will show scores in Phase 6
            console.log('Score submitted!');
        }
    } catch (error) {
        console.error('Failed to submit:', error);
    }
}
```

### 5.2 Testing Checkpoint ✓
- [ ] Valid names accepted
- [ ] Profanity blocked
- [ ] Non-letters blocked
- [ ] Error messages show
- [ ] Submission works

---

## Phase 6: High Scores Display
**Goal**: Show top 3 scores after submission

### 6.1 HTML Update
```html
<!-- Add after name-entry-section -->
<div id="scores-display-section" class="hidden">
    <h3>Today's Top Scores</h3>
    <ol id="top-scores-list"></ol>
    <button id="share-score" class="btn btn-primary">Share</button>
</div>
```

### 6.2 JavaScript - Display Scores
```javascript
async function showTopScores(highlightName = null) {
    // Hide name entry
    document.getElementById('name-entry-section').classList.add('hidden');

    // Fetch scores
    const scores = await fetchHighScores();
    const top3 = scores.slice(0, 3);

    // Build list
    const list = document.getElementById('top-scores-list');
    list.innerHTML = '';

    top3.forEach((entry, index) => {
        const li = document.createElement('li');

        // Highlight current player
        if (highlightName && entry.name === highlightName &&
            entry.score === gameState.score) {
            li.classList.add('current-player');
        }

        li.innerHTML = `${entry.name} - ${entry.score}`;
        list.appendChild(li);
    });

    // Show section
    document.getElementById('scores-display-section').classList.remove('hidden');
    document.getElementById('close-popup').style.display = 'block';
}

// Update submit handler
async function submitHighScore(name) {
    // ... existing submission code ...
    if (response.ok) {
        await showTopScores(name);
    }
}

// Update initial popup for non-top-3
async function showBasicPopup() {
    // ... existing code ...
    if (isTop3) {
        showNameEntry();
    } else {
        await showTopScores();  // Show scores immediately
    }
}
```

### 6.3 CSS for Highlighting
```css
.current-player {
    background-color: #ffeb3b;
    padding: 5px;
    border-radius: 4px;
    font-weight: bold;
}
```

### 6.4 Testing Checkpoint ✓
- [ ] Top 3 scores display
- [ ] Current player highlighted
- [ ] List formatted correctly
- [ ] Shows for both paths (submit & skip)

---

## Phase 7: Share Functionality
**Goal**: Implement share with score-based colors

### 7.1 JavaScript - Share Logic
```javascript
function generateShareText(playerName = null, rank = null) {
    // Get feedback squares colors
    const squares = gameState.turnScores.map(score => {
        if (score >= 60) return '🟩';
        if (score >= 30) return '🟨';
        if (score >= 15) return '🟧';
        return '🟥';
    }).join('');

    let text = `WikiLetters ${gameState.dateStr}\n`;
    text += `${squares}\n`;
    text += `Score: ${gameState.score}`;

    if (rank) {
        text += ` (Rank #${rank})`;
    }

    text += `\nPlay at: letters.wiki`;

    return text;
}

document.getElementById('share-score').addEventListener('click', () => {
    const text = generateShareText();

    if (navigator.share) {
        navigator.share({ text: text });
    } else {
        navigator.clipboard.writeText(text);
        // Simple feedback
        document.getElementById('share-score').textContent = 'Copied!';
        setTimeout(() => {
            document.getElementById('share-score').textContent = 'Share';
        }, 2000);
    }
});
```

### 7.2 Testing Checkpoint ✓
- [ ] Share generates correct text
- [ ] Colors match scores
- [ ] Clipboard fallback works
- [ ] Mobile share works

---

## Phase 8: Cleanup & Polish
**Goal**: Remove old code, add animations, finalize

### 8.1 Remove Old Elements
- [ ] Hide/remove `#game-over-section` from HTML
- [ ] Remove replay functionality
- [ ] Clean up unused JavaScript
- [ ] Add cache busting `?v=2.0`

### 8.2 Add Polish
```css
/* Fade in animation */
@keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, -45%); }
    to { opacity: 1; transform: translate(-50%, -50%); }
}

#game-popup:not(.hidden) {
    animation: fadeIn 0.3s ease-out;
}
```

### 8.3 Backdrop Click
```javascript
document.getElementById('game-popup').addEventListener('click', (e) => {
    if (e.target.id === 'game-popup') {
        const inNameEntry = !document.getElementById('name-entry-section')
                                  .classList.contains('hidden');
        if (!inNameEntry) {
            document.getElementById('game-popup').classList.add('hidden');
        }
    }
});
```

### 8.4 Final Testing Checklist ✓
- [ ] Old game-over section never shows
- [ ] Animations smooth
- [ ] Backdrop click works correctly
- [ ] Mobile responsive
- [ ] All paths tested

---

## Testing Strategy for Each Phase

1. **Make changes for the phase**
2. **Reload page (check cache busting)**
3. **Play quick game to trigger endGame**
4. **Verify expected behavior**
5. **Check console for errors**
6. **Test on mobile viewport**
7. **Only proceed when phase works**

## Quick Testing Tips

For faster testing, you can temporarily modify the game to end sooner:
```javascript
// Temporary: Make game end after 2 turns instead of 5
if (gameState.currentTurn >= 2) {  // Change back to 5 when done
    endGame();
}
```

Or trigger endGame directly in console:
```javascript
// In browser console
endGame();
```