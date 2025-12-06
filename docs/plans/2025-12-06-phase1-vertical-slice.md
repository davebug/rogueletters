# Phase 1: Vertical Slice Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a minimal 3-round roguelike loop to validate the core concept - play 5-turn hands with escalating targets, advance or fail.

**Architecture:** Add a `runState` object alongside existing `gameState`. The run manager wraps the existing game completion flow, checking scores against targets instead of just ending. All run state stored in localStorage.

**Tech Stack:** Vanilla JavaScript (no new dependencies), CSS for new UI elements

---

## Pre-Implementation Setup

### Task 0: Update test port configuration

**Files:**
- Modify: `testing/core-gameplay/core-gameplay-suite.spec.js`
- Modify: `testing/core-gameplay/ui-interactions-suite.spec.js`

**Step 1: Update test URLs from 8085 to 8086**

Find and replace `localhost:8085` with `localhost:8086` in all test files:

```bash
cd testing/core-gameplay
sed -i '' 's/localhost:8085/localhost:8086/g' *.spec.js *.js
```

**Step 2: Verify tests run**

```bash
cd testing/core-gameplay && npm test
```

Expected: Tests pass (or fail for reasons unrelated to port)

**Step 3: Commit**

```bash
git add testing/
git commit -m "chore: update test port from 8085 to 8086 for RogueLetters"
```

---

## Task 1: Add Run State Object

**Files:**
- Modify: `script.js:8-29` (after gameState definition)

**Step 1: Add runState object after gameState**

After line 29 (closing brace of gameState), add:

```javascript
// Run state for roguelike mode
let runState = {
    isRunMode: false,           // Whether we're in a roguelike run
    round: 1,                   // Current round (1-3 for Phase 1)
    maxRounds: 3,               // Total rounds in a run
    targetScore: 80,            // Score needed to advance
    roundTargets: [80, 120, 180], // Target for each round
    runScore: 0,                // Cumulative score across all rounds
    roundScores: [],            // Score achieved each round
    runStartTime: null,         // When run started
    runSeed: null               // Seed for the run (for sharing)
};
```

**Step 2: Verify no syntax errors**

```bash
curl -s http://localhost:8086/ | grep -o "<title>.*</title>"
```

Expected: `<title>RogueLetters - A Daily Word Game</title>`

**Step 3: Commit**

```bash
git add script.js
git commit -m "feat: add runState object for roguelike mode"
```

---

## Task 2: Add Run Mode UI Elements to HTML

**Files:**
- Modify: `index.html`

**Step 1: Add run info bar in header**

After line 36 (`<div id="status"></div>`) and before `</header>`, add:

```html
	<!-- Run Mode Info (hidden by default) -->
	<div id="run-info" class="hidden">
		<span id="run-round">Round 1/3</span>
		<span id="run-target">Target: 80</span>
	</div>
```

**Step 2: Add run screens after game-popup (line 192)**

Before the LZ-String script tag (line 194), add:

```html
	<!-- Run Complete Screen (beat the round) -->
	<div id="round-complete-popup" class="hidden">
		<div class="popup-content">
			<button class="popup-close-btn" aria-label="Close">×</button>
			<h2>Round Complete!</h2>
			<div class="round-result">
				<div class="result-row">
					<span>Your Score:</span>
					<span id="round-score-value">0</span>
				</div>
				<div class="result-row">
					<span>Target:</span>
					<span id="round-target-value">80</span>
				</div>
				<div class="result-row surplus">
					<span>Surplus:</span>
					<span id="round-surplus-value">+0</span>
				</div>
			</div>
			<button id="next-round-btn" class="popup-btn popup-btn-primary">Next Round</button>
		</div>
	</div>

	<!-- Run Failed Screen (didn't hit target) -->
	<div id="run-failed-popup" class="hidden">
		<div class="popup-content">
			<h2>Run Failed</h2>
			<div class="round-result">
				<div class="result-row">
					<span>Your Score:</span>
					<span id="failed-score-value">0</span>
				</div>
				<div class="result-row">
					<span>Target:</span>
					<span id="failed-target-value">80</span>
				</div>
				<div class="result-row deficit">
					<span>Needed:</span>
					<span id="failed-deficit-value">-0</span>
				</div>
			</div>
			<p class="fail-message">You needed <span id="fail-amount">0</span> more points to advance.</p>
			<button id="try-again-btn" class="popup-btn popup-btn-primary">Try Again</button>
		</div>
	</div>

	<!-- Run Victory Screen (beat all rounds) -->
	<div id="run-victory-popup" class="hidden">
		<div class="popup-content">
			<h2>🎉 Victory!</h2>
			<p>You completed all 3 rounds!</p>
			<div class="round-result">
				<div class="result-row">
					<span>Total Score:</span>
					<span id="victory-total-value">0</span>
				</div>
			</div>
			<div id="victory-rounds-summary"></div>
			<button id="new-run-btn" class="popup-btn popup-btn-primary">New Run</button>
		</div>
	</div>

	<!-- Start Run Screen -->
	<div id="start-run-popup" class="hidden">
		<div class="popup-content">
			<h2>🎲 RogueLetters</h2>
			<p>Beat escalating score targets across 3 rounds.</p>
			<div class="targets-preview">
				<div class="target-item">Round 1: 80 pts</div>
				<div class="target-item">Round 2: 120 pts</div>
				<div class="target-item">Round 3: 180 pts</div>
			</div>
			<button id="start-run-btn" class="popup-btn popup-btn-primary">Start Run</button>
		</div>
	</div>
```

**Step 3: Verify HTML is valid**

```bash
curl -s http://localhost:8086/ | grep -c "run-info\|round-complete-popup\|run-failed-popup\|run-victory-popup\|start-run-popup"
```

Expected: `5`

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add HTML structure for run mode UI"
```

---

## Task 3: Add Run Mode CSS Styles

**Files:**
- Modify: `styles.css` (add at end of file)

**Step 1: Add run mode styles**

Append to end of styles.css:

```css
/* ============================================================================
   RUN MODE STYLES
   ============================================================================ */

/* Run Info Bar */
#run-info {
    display: flex;
    justify-content: center;
    gap: 20px;
    padding: 8px 16px;
    background: var(--accent);
    color: white;
    font-weight: bold;
    font-size: 14px;
}

#run-info.hidden {
    display: none;
}

#run-round, #run-target {
    display: inline-block;
}

/* Run Popup Shared Styles */
#round-complete-popup,
#run-failed-popup,
#run-victory-popup,
#start-run-popup {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

#round-complete-popup.hidden,
#run-failed-popup.hidden,
#run-victory-popup.hidden,
#start-run-popup.hidden {
    display: none;
}

/* Round Result Display */
.round-result {
    margin: 20px 0;
    padding: 15px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
}

.result-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 18px;
}

.result-row.surplus span:last-child {
    color: #4caf50;
    font-weight: bold;
}

.result-row.deficit span:last-child {
    color: #f44336;
    font-weight: bold;
}

/* Fail message */
.fail-message {
    color: #f44336;
    font-size: 16px;
    margin: 15px 0;
}

/* Targets Preview */
.targets-preview {
    margin: 20px 0;
    padding: 15px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
}

.target-item {
    padding: 8px 0;
    font-size: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.target-item:last-child {
    border-bottom: none;
}

/* Victory summary */
#victory-rounds-summary {
    margin: 15px 0;
    font-size: 14px;
    opacity: 0.8;
}

/* Progress bar for target */
.target-progress {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    margin-top: 10px;
    overflow: hidden;
}

.target-progress-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s ease;
}

.target-progress-fill.exceeded {
    background: #4caf50;
}

.target-progress-fill.danger {
    background: #f44336;
}
```

**Step 2: Update version in HTML to bust cache**

In index.html, update the CSS version number on line 16:
```html
<link rel="stylesheet" href="./styles.css?v=10.38">
```

**Step 3: Verify styles load**

```bash
curl -s http://localhost:8086/styles.css | grep -c "run-info\|round-result"
```

Expected: `2` or more

**Step 4: Commit**

```bash
git add styles.css index.html
git commit -m "feat: add CSS styles for run mode UI"
```

---

## Task 4: Implement Run Manager Functions

**Files:**
- Modify: `script.js` (add after runState definition, around line 45)

**Step 1: Add run manager functions**

After the runState object definition, add:

```javascript
// ============================================================================
// RUN MANAGER
// ============================================================================

const runManager = {
    // Start a new run
    startRun() {
        runState.isRunMode = true;
        runState.round = 1;
        runState.targetScore = runState.roundTargets[0];
        runState.runScore = 0;
        runState.roundScores = [];
        runState.runStartTime = Date.now();
        runState.runSeed = Date.now(); // Use timestamp as run seed

        this.saveRunState();
        this.updateRunUI();
        this.hideAllRunPopups();

        // Reset game state for fresh round
        this.resetForNewRound();
    },

    // Check if round target was met (called from endGame)
    checkRoundComplete(score) {
        if (!runState.isRunMode) return false;

        runState.roundScores.push(score);
        runState.runScore += score;

        if (score >= runState.targetScore) {
            // Success!
            if (runState.round >= runState.maxRounds) {
                this.showVictory();
            } else {
                this.showRoundComplete(score);
            }
            return true;
        } else {
            // Failed
            this.showRunFailed(score);
            return false;
        }
    },

    // Advance to next round
    nextRound() {
        runState.round++;
        runState.targetScore = runState.roundTargets[runState.round - 1];

        this.saveRunState();
        this.updateRunUI();
        this.hideAllRunPopups();

        // Reset game for new round
        this.resetForNewRound();
    },

    // Reset game state for a new round (keeping run state)
    resetForNewRound() {
        // Reset game state
        gameState.board = [];
        gameState.tiles = [];
        gameState.currentTurn = 1;
        gameState.score = 0;
        gameState.turnScores = [];
        gameState.placedTiles = [];
        gameState.turnHistory = [];
        gameState.isGameOver = false;
        gameState.hasSubmittedScore = false;
        gameState.isSubmitting = false;
        gameState.rackTiles = [];
        gameState.totalTilesDrawn = 7;
        gameState.gameStartTime = Date.now();
        gameState.preGeneratedShareURL = null;
        gameState.isNewHighScore = false;

        // Generate new seed for this round
        gameState.seed = getTodaysSeed() + runState.round;
        gameState.dateStr = formatSeedToDate(gameState.seed);

        // Reinitialize the game board
        createBoard();
        fetchGameData(gameState.seed);

        // Reset UI
        document.getElementById('dateDisplay').textContent = `Round ${runState.round}`;
        updateTurnCounter();

        // Re-enable controls
        const submitBtn = document.getElementById('submit-word');
        const recallBtn = document.getElementById('recall-tiles');
        if (submitBtn) submitBtn.disabled = false;
        if (recallBtn) recallBtn.disabled = false;

        // Remove game-over classes
        const gameBoard = document.getElementById('game-board');
        const rackBoard = document.getElementById('tile-rack-board');
        if (gameBoard) gameBoard.classList.remove('game-over');
        if (rackBoard) rackBoard.classList.remove('game-over');

        // Hide share icon
        const shareIcon = document.getElementById('shareIcon');
        if (shareIcon) shareIcon.classList.add('hidden');
    },

    // Update run info display
    updateRunUI() {
        const runInfo = document.getElementById('run-info');
        const roundDisplay = document.getElementById('run-round');
        const targetDisplay = document.getElementById('run-target');

        if (runState.isRunMode) {
            runInfo.classList.remove('hidden');
            roundDisplay.textContent = `Round ${runState.round}/${runState.maxRounds}`;
            targetDisplay.textContent = `Target: ${runState.targetScore}`;
        } else {
            runInfo.classList.add('hidden');
        }
    },

    // Show round complete popup
    showRoundComplete(score) {
        const popup = document.getElementById('round-complete-popup');
        const scoreEl = document.getElementById('round-score-value');
        const targetEl = document.getElementById('round-target-value');
        const surplusEl = document.getElementById('round-surplus-value');

        const surplus = score - runState.targetScore;

        scoreEl.textContent = score;
        targetEl.textContent = runState.targetScore;
        surplusEl.textContent = `+${surplus}`;

        popup.classList.remove('hidden');
    },

    // Show run failed popup
    showRunFailed(score) {
        const popup = document.getElementById('run-failed-popup');
        const scoreEl = document.getElementById('failed-score-value');
        const targetEl = document.getElementById('failed-target-value');
        const deficitEl = document.getElementById('failed-deficit-value');
        const failAmount = document.getElementById('fail-amount');

        const deficit = runState.targetScore - score;

        scoreEl.textContent = score;
        targetEl.textContent = runState.targetScore;
        deficitEl.textContent = `-${deficit}`;
        failAmount.textContent = deficit;

        popup.classList.remove('hidden');

        // Clear run state
        runState.isRunMode = false;
        this.clearRunState();
    },

    // Show victory popup
    showVictory() {
        const popup = document.getElementById('run-victory-popup');
        const totalEl = document.getElementById('victory-total-value');
        const summaryEl = document.getElementById('victory-rounds-summary');

        totalEl.textContent = runState.runScore;

        // Build rounds summary
        let summary = '';
        runState.roundScores.forEach((score, i) => {
            const target = runState.roundTargets[i];
            const surplus = score - target;
            summary += `Round ${i + 1}: ${score}/${target} (+${surplus})<br>`;
        });
        summaryEl.innerHTML = summary;

        popup.classList.remove('hidden');

        // Clear run state
        runState.isRunMode = false;
        this.clearRunState();
    },

    // Show start run popup
    showStartRun() {
        document.getElementById('start-run-popup').classList.remove('hidden');
    },

    // Hide all run popups
    hideAllRunPopups() {
        document.getElementById('round-complete-popup')?.classList.add('hidden');
        document.getElementById('run-failed-popup')?.classList.add('hidden');
        document.getElementById('run-victory-popup')?.classList.add('hidden');
        document.getElementById('start-run-popup')?.classList.add('hidden');
    },

    // Save run state to localStorage
    saveRunState() {
        localStorage.setItem('rogueletters_run', JSON.stringify(runState));
    },

    // Load run state from localStorage
    loadRunState() {
        const saved = localStorage.getItem('rogueletters_run');
        if (saved) {
            const loaded = JSON.parse(saved);
            Object.assign(runState, loaded);
        }
    },

    // Clear run state from localStorage
    clearRunState() {
        localStorage.removeItem('rogueletters_run');
    }
};
```

**Step 2: Verify no syntax errors**

```bash
curl -s http://localhost:8086/ | grep -o "<title>.*</title>"
```

Expected: `<title>RogueLetters - A Daily Word Game</title>`

**Step 3: Commit**

```bash
git add script.js
git commit -m "feat: implement runManager with core run logic"
```

---

## Task 5: Wire Up Run Mode Event Listeners

**Files:**
- Modify: `script.js` - add to setupEventListeners function (around line 1302)

**Step 1: Find setupEventListeners and add run mode listeners**

Add at the end of the setupEventListeners function (before its closing brace):

```javascript
    // Run Mode Event Listeners
    document.getElementById('start-run-btn')?.addEventListener('click', () => {
        runManager.startRun();
    });

    document.getElementById('next-round-btn')?.addEventListener('click', () => {
        runManager.nextRound();
    });

    document.getElementById('try-again-btn')?.addEventListener('click', () => {
        runManager.hideAllRunPopups();
        runManager.showStartRun();
    });

    document.getElementById('new-run-btn')?.addEventListener('click', () => {
        runManager.hideAllRunPopups();
        runManager.showStartRun();
    });

    // Close buttons for run popups
    document.querySelectorAll('#round-complete-popup .popup-close-btn, #run-failed-popup .popup-close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.popup-content').parentElement.classList.add('hidden');
        });
    });
```

**Step 2: Verify no syntax errors**

Reload the page and check console for errors.

**Step 3: Commit**

```bash
git add script.js
git commit -m "feat: wire up run mode event listeners"
```

---

## Task 6: Integrate Run Mode with Game Completion

**Files:**
- Modify: `script.js` - modify endGame function (line 2697)

**Step 1: Modify endGame to check run mode**

Replace the endGame function with:

```javascript
async function endGame() {
    gameState.isGameOver = true;

    // Ensure the total score is properly calculated
    let totalScore = 0;
    if (gameState.turnScores && gameState.turnScores.length > 0) {
        totalScore = gameState.turnScores.reduce((sum, score) => sum + score, 0);
        gameState.score = totalScore;
    }

    saveGameState();

    // Disable game controls
    const submitBtn = document.getElementById('submit-word');
    const recallBtn = document.getElementById('recall-tiles');
    if (submitBtn) submitBtn.disabled = true;
    if (recallBtn) recallBtn.disabled = true;

    // Update footer squares
    updateFooterSquares();

    // Add visual indicator that game is over
    const gameBoard = document.getElementById('game-board');
    const rackBoard = document.getElementById('tile-rack-board');
    if (gameBoard) gameBoard.classList.add('game-over');
    if (rackBoard) rackBoard.classList.add('game-over');

    // === RUN MODE HANDLING ===
    if (runState.isRunMode) {
        // Check if target was met - runManager handles all UI
        runManager.checkRoundComplete(totalScore);
        return; // Don't show normal completion UI in run mode
    }

    // === NORMAL MODE (non-run) ===
    // Mark that player has completed today's game
    if (gameState.seed === getTodaysSeed()) {
        localStorage.setItem('letters_completed_today', gameState.seed);
    }

    // Show share icon
    const shareIcon = document.getElementById('shareIcon');
    if (shareIcon) {
        shareIcon.classList.remove('hidden');
    }

    // Track game completion
    const totalWords = gameState.turnHistory.filter(turn => turn && turn.tiles && turn.tiles.length > 0).length;
    const totalTiles = gameState.turnHistory.reduce((sum, turn) => {
        return sum + (turn && turn.tiles ? turn.tiles.length : 0);
    }, 0);
    const duration = gameState.gameStartTime ? Date.now() - gameState.gameStartTime : 0;

    Analytics.game.completed(
        gameState.score,
        gameState.turnScores,
        totalWords,
        totalTiles,
        duration,
        gameState.startingWord || 'unknown'
    );

    // Pre-generate shareable URL
    await generateShareableBoardURL();

    // Update subtitle to show high score
    await updateSubtitleWithHighScore();

    // Show popup with high score check
    await showBasicPopupWithHighScore();
}
```

**Step 2: Verify game still works in normal mode**

Play a quick game to turn 5 and verify the completion popup shows.

**Step 3: Commit**

```bash
git add script.js
git commit -m "feat: integrate run mode check into endGame flow"
```

---

## Task 7: Add Run Mode Initialization

**Files:**
- Modify: `script.js` - modify initializeGame function (line 935)

**Step 1: Add run mode initialization at start of initializeGame**

At the start of initializeGame (after the opening brace), add:

```javascript
    // Check for existing run or show start screen
    runManager.loadRunState();

    if (runState.isRunMode) {
        // Resume existing run
        runManager.updateRunUI();
    } else {
        // Show start run popup after a brief delay
        setTimeout(() => {
            runManager.showStartRun();
        }, 500);
    }
```

**Step 2: Make the normal game load conditional**

Wrap the existing game load logic to only run if NOT in run mode (run mode handles its own initialization via startRun/nextRound).

Near the end of initializeGame, wrap the fetchGameData call:

```javascript
    // Only auto-load game data if not in run mode
    // (run mode handles game loading in startRun/nextRound)
    if (!runState.isRunMode) {
        // ... existing fetchGameData logic stays here
    }
```

**Step 3: Test the flow**

1. Open http://localhost:8086/
2. Should see "Start Run" popup
3. Click "Start Run"
4. Should see Round 1/3 in header, Target: 80
5. Play through 5 turns
6. Should see Round Complete or Run Failed based on score

**Step 4: Commit**

```bash
git add script.js
git commit -m "feat: add run mode initialization flow"
```

---

## Task 8: Add Target Progress Display to Footer

**Files:**
- Modify: `index.html` - add progress bar to footer
- Modify: `script.js` - update progress bar during gameplay

**Step 1: Add progress bar HTML to footer**

In index.html, after the total-score-display div (line 130), add:

```html
				<div id="target-progress-container" class="hidden">
					<div class="target-progress">
						<div id="target-progress-fill" class="target-progress-fill"></div>
					</div>
					<span id="target-progress-text">0/80</span>
				</div>
```

**Step 2: Add updateTargetProgress function to script.js**

Add this function near the run manager code:

```javascript
function updateTargetProgress() {
    if (!runState.isRunMode) return;

    const container = document.getElementById('target-progress-container');
    const fill = document.getElementById('target-progress-fill');
    const text = document.getElementById('target-progress-text');

    if (!container) return;

    container.classList.remove('hidden');

    const current = gameState.score || 0;
    const target = runState.targetScore;
    const percentage = Math.min((current / target) * 100, 100);

    fill.style.width = `${percentage}%`;
    text.textContent = `${current}/${target}`;

    // Color based on progress
    fill.classList.remove('exceeded', 'danger');
    if (current >= target) {
        fill.classList.add('exceeded');
    } else if (percentage < 50 && gameState.currentTurn > 3) {
        fill.classList.add('danger');
    }
}
```

**Step 3: Call updateTargetProgress after each word submission**

In the submitWord function, after `gameState.score += turnScore;` add:

```javascript
            updateTargetProgress();
```

**Step 4: Commit**

```bash
git add index.html script.js
git commit -m "feat: add target progress bar to footer during run mode"
```

---

## Task 9: Final Testing & Version Bump

**Files:**
- Modify: `index.html` - version bump

**Step 1: Update script version in HTML**

```html
<script src="./script.js?v=10.38"></script>
```

**Step 2: Run full test suite**

```bash
cd testing/core-gameplay && npm test
```

Expected: All tests pass

**Step 3: Manual testing checklist**

1. [ ] Start Run popup appears on fresh load
2. [ ] Clicking Start Run shows Round 1/3 header
3. [ ] Target: 80 displayed correctly
4. [ ] Progress bar updates as you score
5. [ ] Scoring 80+ shows Round Complete popup
6. [ ] Next Round button advances to Round 2
7. [ ] Round 2 has Target: 120
8. [ ] Scoring below target shows Run Failed
9. [ ] Try Again restarts from Round 1
10. [ ] Winning Round 3 shows Victory screen
11. [ ] New Run starts fresh run

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 vertical slice of roguelike mode

- 3 rounds with escalating targets (80/120/180)
- Run state stored in localStorage
- Round complete/failed/victory screens
- Target progress bar during gameplay
- Seamless integration with existing game flow"
```

---

## Summary

This plan implements a minimal roguelike vertical slice:

| Component | Status |
|-----------|--------|
| runState object | ✅ Task 1 |
| Run UI HTML | ✅ Task 2 |
| Run CSS styles | ✅ Task 3 |
| runManager logic | ✅ Task 4 |
| Event listeners | ✅ Task 5 |
| endGame integration | ✅ Task 6 |
| Initialization flow | ✅ Task 7 |
| Progress bar | ✅ Task 8 |
| Testing | ✅ Task 9 |

**Next Phase (Phase 2: Economy)** will add:
- Coins earned from surplus
- Interest mechanic
- Coin display in UI
