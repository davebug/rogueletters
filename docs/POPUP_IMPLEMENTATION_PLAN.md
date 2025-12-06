# WikiLetters Popup Implementation Plan

## Overview
Transform WikiLetters' game completion experience from a full-screen replacement to a WikiDates-style overlay popup that keeps the game board visible while providing all end-game functionality including high scores.

## Current State (WikiLetters)
- Game board completely hidden on completion
- Separate "Game Complete" section replaces game view
- High score submission with 3-letter name input
- Share functionality
- "Play Tomorrow's Game" button
- No way to review the completed board after game ends

## Target State (WikiDates-style)
- Game board remains visible
- Overlay popup appears on completion
- All functionality integrated into popup
- Can dismiss popup to review completed board
- More modern, less disruptive UX

## Implementation Plan

### Phase 1: HTML Structure

#### Add Popup Container
```html
<!-- Add after error-modal, before closing body tag -->
<div id="game-popup" class="hidden">
    <div class="popup-content">
        <!-- Dynamic content will be inserted here -->
    </div>
</div>
```

#### Popup Content States
The popup will have different views/states:

1. **Initial Completion View**
   - Dynamic title (based on score)
   - Final score display
   - Feedback squares summary
   - Action buttons

2. **High Score Submission View**
   - Score display
   - Name input (AAA format)
   - Submit button
   - Skip option

3. **High Scores Display View**
   - Top 10 scores list
   - Player's rank highlighted if applicable
   - Share button
   - New game button

### Phase 2: CSS Styling

#### Popup Base Styles
```css
#game-popup {
    position: fixed;
    top: 50vh;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    background-color: #f9f9f9;
    border: 2px solid #333;
    border-radius: 12px;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
    width: 320px;
    max-width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    transition: all 0.3s ease;
}

#game-popup.hidden {
    display: none;
}

#game-popup .popup-content {
    padding: 20px;
    text-align: center;
}

/* Semi-transparent overlay behind popup */
#game-popup::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: -1;
}
```

### Phase 3: JavaScript Implementation

#### Core Functions

1. **showGameCompletePopup()**
```javascript
function showGameCompletePopup() {
    const popup = document.getElementById('game-popup');
    const content = popup.querySelector('.popup-content');

    // Calculate score tier and message
    const scoreMessage = getScoreMessage(gameState.score);
    const title = getCompletionTitle(gameState.score);

    // Build initial view HTML
    content.innerHTML = `
        <h2>${title}</h2>
        <div class="score-display">
            <div class="score-number">${gameState.score}</div>
            <div class="score-label">points</div>
        </div>
        <div class="feedback-summary">
            ${generateFeedbackSummary()}
        </div>
        <div class="popup-actions">
            <button id="submit-high-score" class="btn btn-primary">Submit Score</button>
            <button id="view-scores" class="btn btn-secondary">View High Scores</button>
            <button id="share-result" class="btn btn-secondary">Share</button>
            <button id="close-popup" class="popup-close">×</button>
        </div>
    `;

    // Show popup
    popup.classList.remove('hidden');

    // Attach event handlers
    attachPopupHandlers();

    // Check if score qualifies for high scores
    checkHighScoreEligibility();
}
```

2. **High Score Submission View**
```javascript
function showHighScoreSubmission() {
    const content = document.querySelector('#game-popup .popup-content');

    content.innerHTML = `
        <h2>New High Score!</h2>
        <div class="score-display">
            <div class="score-number">${gameState.score}</div>
            <div class="score-label">points</div>
        </div>
        <div class="name-input-container">
            <label>Enter your name:</label>
            <input type="text" id="player-name"
                   placeholder="AAA"
                   maxlength="3"
                   style="text-transform: uppercase;">
            <button id="confirm-submit" class="btn btn-primary">Submit</button>
            <button id="skip-submit" class="btn btn-secondary">Skip</button>
        </div>
    `;

    // Focus on input
    document.getElementById('player-name').focus();
}
```

3. **High Scores Display View**
```javascript
function showHighScoresView(highlightName = null) {
    const content = document.querySelector('#game-popup .popup-content');

    // Fetch and display high scores
    fetchHighScores().then(scores => {
        content.innerHTML = `
            <h2>Today's High Scores</h2>
            <div class="high-scores-list">
                ${generateHighScoresList(scores, highlightName)}
            </div>
            <div class="popup-actions">
                <button id="share-with-rank" class="btn btn-primary">Share</button>
                <button id="play-tomorrow" class="btn btn-secondary">Play Tomorrow</button>
                <button id="review-board" class="btn btn-secondary">Review Board</button>
            </div>
        `;
    });
}
```

#### Dynamic Messaging System

```javascript
function getCompletionTitle(score) {
    if (score >= 300) return "🎉 Incredible!";
    if (score >= 250) return "🌟 Outstanding!";
    if (score >= 200) return "Excellent Work!";
    if (score >= 150) return "Great Job!";
    if (score >= 100) return "Well Done!";
    if (score >= 50) return "Good Effort!";
    return "Game Complete!";
}

function generateFeedbackSummary() {
    // Generate visual summary of turn scores
    const squares = gameState.turnHistory.map((turn, i) => {
        const score = turn.score;
        let className = 'feedback-mini';
        if (score >= 60) className += ' excellent';
        else if (score >= 30) className += ' good';
        else className += ' low';
        return `<span class="${className}" title="Turn ${i+1}: ${score} points"></span>`;
    }).join('');

    return `<div class="feedback-row-mini">${squares}</div>`;
}
```

### Phase 4: Integration Points

#### Modify endGame() Function
```javascript
function endGame() {
    gameState.isGameOver = true;
    saveGameState();

    // Keep game visible, just disable interactions
    document.getElementById('submit-word').disabled = true;
    document.getElementById('recall-tiles').disabled = true;

    // Show footer with feedback
    showGameFooter();

    // Show popup instead of hiding game
    showGameCompletePopup();
}
```

#### Popup Dismissal/Navigation
```javascript
function dismissPopup() {
    document.getElementById('game-popup').classList.add('hidden');
    // Game board remains visible for review
}

function reviewBoard() {
    dismissPopup();
    // Optionally scroll to board or highlight final state
}

function playTomorrow() {
    // Calculate tomorrow's seed
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowSeed = formatDateAsSeed(tomorrow);

    // Redirect to tomorrow's game
    window.location.href = `?seed=${tomorrowSeed}`;
}
```

### Phase 5: High Score Integration

#### API Calls
```javascript
async function checkHighScoreEligibility() {
    const scores = await fetchHighScores();
    const qualifies = scores.length < 10 ||
                     gameState.score > scores[scores.length - 1].score;

    if (qualifies) {
        // Automatically transition to submission view
        setTimeout(() => showHighScoreSubmission(), 1500);
    }
}

async function submitHighScore(name) {
    const response = await fetch(`${API_BASE}/submit_score.py`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            seed: gameState.seed,
            name: name.toUpperCase(),
            score: gameState.score,
            play_data: gameState.playData
        })
    });

    if (response.ok) {
        // Show high scores with player's entry highlighted
        showHighScoresView(name);
    }
}
```

### Phase 6: Share Functionality Enhancement

```javascript
function shareGameResult(includeRank = false) {
    const tiles = generateEmojiTiles();
    let shareText = `WikiLetters ${gameState.dateStr}\n`;
    shareText += `${tiles.join('')}\n`;
    shareText += `Score: ${gameState.score}`;

    if (includeRank) {
        shareText += ` (Rank #${gameState.rank}/10)`;
    }

    shareText += `\n\nPlay at: letters.wiki/?seed=${gameState.seed}`;

    if (navigator.share) {
        navigator.share({
            title: 'WikiLetters',
            text: shareText
        });
    } else {
        navigator.clipboard.writeText(shareText);
        showToast('Score copied to clipboard!');
    }
}
```

### Phase 7: Animations & Polish

#### Popup Entrance Animation
```css
@keyframes popupEnter {
    from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.8);
    }
    to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
}

#game-popup:not(.hidden) {
    animation: popupEnter 0.3s ease-out;
}
```

#### Score Counter Animation
```javascript
function animateScore(element, target, duration = 1000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 16);
}
```

## Migration Strategy

### Step 1: Preserve Existing Functionality
- Keep current game-over-section hidden but intact initially
- Implement popup alongside existing code
- Test thoroughly before removing old code

### Step 2: Progressive Enhancement
1. Implement basic popup with completion message
2. Add high score submission within popup
3. Add high scores display
4. Add animations and polish
5. Remove old game-over-section

### Step 3: Testing Checklist
- [ ] Popup appears correctly on game completion
- [ ] Score displays and animates properly
- [ ] High score submission works
- [ ] High scores display correctly
- [ ] Share functionality works from popup
- [ ] Popup can be dismissed to review board
- [ ] Tomorrow's game navigation works
- [ ] Mobile responsive design
- [ ] Keyboard accessibility (ESC to close, TAB navigation)
- [ ] Error handling for failed API calls

## Benefits

1. **Improved UX**: Less jarring transition, board remains visible
2. **Modern Feel**: Overlay pattern is more contemporary
3. **Better Review**: Players can dismiss popup to study their board
4. **Unified Experience**: All end-game features in one place
5. **Consistency**: Matches WikiDates' polished approach

## Technical Considerations

1. **Z-index Management**: Ensure popup appears above all game elements
2. **Mobile Responsiveness**: Popup must work on small screens
3. **Accessibility**: Keyboard navigation and screen reader support
4. **Error States**: Handle API failures gracefully
5. **State Management**: Track which popup view is active

## Future Enhancements

1. **Statistics View**: Add a stats tab showing average score, streak, etc.
2. **Achievements**: Show badges or milestones achieved
3. **Social Features**: Compare with friends' scores
4. **Replay Sharing**: Share a link to watch the game replay
5. **Tutorial**: First-time player guidance in popup

## Timeline Estimate

- Phase 1-2 (HTML/CSS): 1 hour
- Phase 3-4 (Core JS): 2-3 hours
- Phase 5 (High Scores): 1-2 hours
- Phase 6-7 (Polish): 1-2 hours
- Testing & Refinement: 1-2 hours

**Total: 6-10 hours of development**