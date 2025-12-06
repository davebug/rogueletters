# Core Gameplay Test Suite Design

**Date**: January 20, 2025
**Purpose**: Validate essential game mechanics after major code changes
**Runtime**: 10-15 minutes
**Environment**: Local Docker (localhost:8085)

## Overview

This test suite validates WikiLetters' core gameplay mechanics by **actually playing through complete games** and comparing results against known-good baselines. Uses scenario-based testing with regression comparison to catch unintended side effects from code changes.

## Requirements Summary

### Test Goal
**Core gameplay validator** - Focused suite that validates essential game mechanics work correctly after any gameplay logic changes.

### Critical Mechanics Tested
1. **Word validation & dictionary** - Valid words accepted, invalid words rejected
2. **Scoring calculations** - Point values, multipliers (DL/TL/DW/TW), score totals
3. **Game completion flow** - End-game scenarios, final score, post-game UI

### Execution Environment
- **Local Docker only** (localhost:8085)
- Fast feedback loop during development
- No external dependencies

### Failure Handling
- **Regression comparison** - Compare current test results against baseline
- Highlights what broke since last known-good state
- Detailed diagnostic output with screenshots

## Architecture

### High-Level Design

```
Share URL → Extract Moves → Play Game → Capture Results → Compare Baseline → Report
```

### Key Components

1. **Scenario Definitions** (`testing/scenarios/`)
   - JSON files with game seed, expected moves, expected scores
   - Extracted from real game share URLs

2. **Baseline Store** (`testing/baselines/`)
   - Known-good results for each scenario
   - Used for regression comparison

3. **Test Runner** (`testing/core-gameplay-suite.spec.js`)
   - Playwright-based test orchestrator
   - Plays through each scenario turn-by-turn
   - Validates mechanics at each step

4. **Comparison Engine** (`testing/lib/compare-baselines.js`)
   - Diffs current results vs baseline
   - Identifies regressions and changes

5. **Report Generator** (`testing/lib/report-generator.js`)
   - Creates detailed failure reports
   - Captures screenshots on failures
   - Generates console summary

## Scenario Generation (From Share URLs)

### Share URL Structure

WikiLetters share URLs use V3 Base64URL compression format with `?g=` parameter:

```
https://letters.wiki/?g=IR4MKWILLFEE0qepRsnicUOc2scaiPpBUpNU5qA
```

**Decoded data includes**:
- `d`: Seed/date (e.g., "20251020")
- `w`: Starting word (e.g., "GRANDPA")
- `s`: Turn scores array (e.g., [22, 18, 30, 31, 28])
- `t`: Tiles with turn numbers (row, col, letter, turn, blank)

### Turn-by-Turn Data Extraction

The share URL contains `turnHistory` - complete move sequence for all 5 turns:

```javascript
// Extracted from: window.gameState.turnHistory
[
  {
    "tiles": [
      {"row": 5, "col": 3, "letter": "B"},
      {"row": 5, "col": 4, "letter": "O"},
      {"row": 5, "col": 5, "letter": "O"}
    ],
    "score": 22
  },
  {
    "tiles": [
      {"row": 3, "col": 7, "letter": "V"},
      {"row": 5, "col": 7, "letter": "L"},
      {"row": 6, "col": 7, "letter": "I"},
      {"row": 7, "col": 7, "letter": "D"}
    ],
    "score": 18
  }
  // ... turns 3-5
]
```

### Extraction Tool

**Usage**:
```bash
npm run extract-scenario -- "https://letters.wiki/?g=ABC123..." --name="high-score-example"
```

**Process**:
1. Load share URL in Chrome via superpowers-chrome skill
2. Wait for game to decode and load
3. Extract `window.gameState.turnHistory`
4. Extract expected scores from `window.gameState.turnScores`
5. Generate scenario JSON
6. Save to `testing/scenarios/{seed}-{name}.json`

### Scenario JSON Format

```json
{
  "name": "high-score-grandpa-129pts",
  "description": "High-scoring game with strategic multiplier usage (129 points)",
  "source": "https://letters.wiki/?g=IR4MKWILLFEE0qepRsnicUOc2scaiPpBUpNU5qA",
  "metadata": {
    "seed": "20251020",
    "startingWord": "GRANDPA",
    "dateStr": "October 20"
  },
  "expectedOutcomes": {
    "turnScores": [22, 18, 30, 31, 28],
    "finalScore": 129,
    "turnsCompleted": 5,
    "gameCompleted": true
  },
  "moves": [
    {
      "turn": 1,
      "tiles": [
        {"row": 5, "col": 3, "letter": "B"},
        {"row": 5, "col": 4, "letter": "O"},
        {"row": 5, "col": 5, "letter": "O"}
      ],
      "expectedScore": 22
    }
    // ... turns 2-5
  ],
  "testValidations": {
    "wordValidation": {
      "description": "All words formed should be valid",
      "wordsFormed": ["BOO", "VALID", "HAE", "SIP", "ZING"]
    },
    "scoringValidation": {
      "description": "Scoring must match expected values for each turn"
    },
    "gameCompletionValidation": {
      "description": "Game completes successfully after 5 turns"
    }
  }
}
```

### Initial Scenario Library

Build test library by playing games and extracting share URLs:

**Positive Test Scenarios** (valid gameplay):
- `simple-words-high-score.json` - Common 3-4 letter words, good scoring
- `edge-case-words.json` - Unusual/rare words, dictionary edge cases
- `multiplier-optimization.json` - Strategic use of DW/TW squares
- `quick-completion.json` - Fast 5-turn completion
- `perfect-game.json` - Maximum possible score scenario
- `high-score-grandpa-129pts.json` - Real 129-point game (already extracted)

**Negative Test Scenarios** (validation testing):
- `invalid-words.json` - Tests rejection of non-dictionary words (ZXQF, ASDFG, etc.)
- `illegal-placement-disconnected.json` - Tests rejection of tiles not connected to board
- `illegal-placement-overlap.json` - Tests rejection of placing on occupied squares
- `illegal-placement-gaps.json` - Tests rejection of words with gaps between tiles
- `invalid-first-turn.json` - Tests rejection of first turn not using starting word

## Test Execution Flow

### Test Methodology: Actually Playing the Game

**Key Principle**: Tests **actually play** through the game turn-by-turn to validate mechanics, not just load pre-rendered board states.

### Test Runner Implementation

```javascript
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Core Gameplay Validator', () => {

  // Load all scenarios
  const scenariosDir = path.join(__dirname, 'scenarios');
  const scenarios = fs.readdirSync(scenariosDir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(scenariosDir, f))));

  scenarios.forEach(scenario => {
    test(`${scenario.name} - ${scenario.description}`, async ({ page }) => {

      // 1. Extract expected moves from share URL
      await page.goto(scenario.source.replace('letters.wiki', 'localhost:8085'));
      await page.waitForSelector('#game-board');

      const expectedMoves = await page.evaluate(() => window.gameState.turnHistory);
      const expectedScores = expectedMoves.map(turn => turn.score);

      // 2. Start fresh game with same seed
      await page.goto(`http://localhost:8085/?seed=${scenario.metadata.seed}`);
      await page.waitForSelector('.tile-rack .tile');

      // 3. PLAY THROUGH EACH TURN
      for (let turnIndex = 0; turnIndex < expectedMoves.length; turnIndex++) {
        const turn = expectedMoves[turnIndex];

        console.log(`Playing Turn ${turnIndex + 1}: ${turn.tiles.length} tiles`);

        // Place each tile from this turn
        for (const tileToPlace of turn.tiles) {
          // Find tile in rack with matching letter
          const rackTile = await page.locator('.tile-rack .tile')
            .filter({ hasText: tileToPlace.letter })
            .first();

          // Click tile to select
          await rackTile.click();

          // Click board position
          await page.locator(
            `.board-cell[data-row="${tileToPlace.row}"][data-col="${tileToPlace.col}"]`
          ).click();
        }

        // Submit the word
        await page.click('#submit-word');
        await page.waitForTimeout(500);

        // VERIFY WORD VALIDATION (critical mechanic #1)
        const hasError = await page.locator('#error-modal').isVisible();
        expect(hasError, 'Word should be accepted').toBe(false);

        // VERIFY SCORING (critical mechanic #2)
        const actualScore = await page.evaluate(() =>
          gameState.turnScores[gameState.currentTurn - 2]
        );
        expect(actualScore, `Turn ${turnIndex + 1} score`).toBe(expectedScores[turnIndex]);

        console.log(`✓ Turn ${turnIndex + 1} complete: ${actualScore} points`);
      }

      // VERIFY GAME COMPLETION (critical mechanic #3)
      const finalState = await page.evaluate(() => ({
        isGameOver: gameState.isGameOver,
        currentTurn: gameState.currentTurn,
        finalScore: gameState.score,
        preGeneratedShareURL: gameState.preGeneratedShareURL
      }));

      expect(finalState.isGameOver).toBe(true);
      expect(finalState.currentTurn).toBe(6);
      expect(finalState.finalScore).toBe(scenario.expectedOutcomes.finalScore);

      console.log(`✓ Game completed: ${finalState.finalScore} points`);

      // VERIFY SHARE URL GENERATION & ROUND-TRIP
      // This ensures share functionality works and generates valid URLs
      expect(finalState.preGeneratedShareURL, 'Share URL should be generated').toBeTruthy();

      // Extract the share URL from the game completion popup
      const shareUrl = await page.evaluate(() => {
        const shareBtn = document.querySelector('#share-board-btn');
        return shareBtn ? shareBtn.dataset.shareUrl || gameState.preGeneratedShareURL : null;
      });

      expect(shareUrl, 'Share URL should exist').toBeTruthy();
      console.log(`Share URL: ${shareUrl}`);

      // ROUND-TRIP TEST: Load the generated share URL and verify it matches
      await page.goto(shareUrl.replace('letters.wiki', 'localhost:8085'));
      await page.waitForSelector('#game-board');
      await page.waitForTimeout(1000); // Wait for board to render

      const sharedGameState = await page.evaluate(() => ({
        seed: gameState.seed,
        turnScores: gameState.turnScores,
        finalScore: gameState.score,
        isGameOver: gameState.isGameOver,
        tilesPlaced: Array.from(document.querySelectorAll('.board-cell .tile')).length
      }));

      // Verify shared game matches original
      expect(sharedGameState.seed).toBe(scenario.metadata.seed);
      expect(sharedGameState.turnScores).toEqual(expectedScores);
      expect(sharedGameState.finalScore).toBe(finalState.finalScore);
      expect(sharedGameState.isGameOver).toBe(true);

      // Verify all tiles are present
      const originalTileCount = expectedMoves.reduce((sum, turn) => sum + turn.tiles.length, 0);
      const startingWordLength = scenario.metadata.startingWord.length;
      expect(sharedGameState.tilesPlaced).toBe(originalTileCount + startingWordLength);

      console.log(`✓ Share URL round-trip verified: ${sharedGameState.tilesPlaced} tiles loaded correctly`);

      // 4. Compare with baseline
      const comparison = compareGameStates(finalState, scenario);

      // 5. Save result for regression tracking
      saveTestResult(scenario.name, finalState, comparison);

      // 6. Assert all validations pass
      expect(comparison.passed, comparison.summary).toBe(true);
    });
  });
});
```

### What Gets Validated

**Per Turn**:
- ✅ Word is accepted (no error modal)
- ✅ Score matches expected value
- ✅ Turn advances correctly

**Per Game**:
- ✅ All 5 turns complete
- ✅ Final score matches expected
- ✅ Game ends properly (isGameOver = true)
- ✅ Share URL is generated
- ✅ Share URL loads correctly (round-trip test)
- ✅ Shared game matches original (scores, tiles, state)

**This tests ALL three critical mechanics PLUS share functionality**:
1. Word validation & dictionary
2. Scoring calculations
3. Game completion flow
4. **Share URL generation & round-trip verification**

### Negative Testing (Invalid Moves & Words)

**Purpose**: Verify that the game correctly **rejects** invalid moves and words.

**Negative Scenario Format**:
```json
{
  "name": "invalid-words",
  "description": "Tests rejection of non-dictionary words",
  "type": "negative",
  "metadata": {
    "seed": "20251020",
    "startingWord": "GRANDPA"
  },
  "invalidMoves": [
    {
      "turn": 1,
      "tiles": [
        {"row": 5, "col": 3, "letter": "Z"},
        {"row": 5, "col": 4, "letter": "X"},
        {"row": 5, "col": 5, "letter": "Q"},
        {"row": 5, "col": 6, "letter": "F"}
      ],
      "expectedError": "Word not found in dictionary",
      "shouldReject": true,
      "attemptedWord": "ZXQF"
    },
    {
      "turn": 1,
      "tiles": [
        {"row": 0, "col": 0, "letter": "X"}  // Disconnected from board
      ],
      "expectedError": "Tiles must connect",
      "shouldReject": true
    }
  ]
}
```

**Negative Test Execution**:
```javascript
// For negative scenarios
if (scenario.type === 'negative') {

  // Start fresh game
  await page.goto(`http://localhost:8085/?seed=${scenario.metadata.seed}`);
  await page.waitForSelector('.tile-rack .tile');

  // Try each invalid move
  for (const invalidMove of scenario.invalidMoves) {

    // Place tiles
    for (const tile of invalidMove.tiles) {
      await page.locator('.tile-rack .tile')
        .filter({ hasText: tile.letter })
        .first().click();
      await page.locator(
        `.board-cell[data-row="${tile.row}"][data-col="${tile.col}"]`
      ).click();
    }

    // Submit
    await page.click('#submit-word');
    await page.waitForTimeout(500);

    // VERIFY REJECTION
    const errorVisible = await page.locator('#error-modal').isVisible();
    expect(errorVisible, 'Error modal should appear').toBe(true);

    // VERIFY ERROR MESSAGE
    const errorMsg = await page.locator('#error-message').textContent();
    expect(errorMsg).toContain(invalidMove.expectedError);

    console.log(`✓ Correctly rejected: ${invalidMove.attemptedWord || 'invalid placement'}`);

    // Close error and recall tiles for next test
    await page.click('#close-error');
    await page.click('#recall-tiles');
  }
}
```

**What Negative Tests Validate**:
- ✅ Invalid words rejected (not in dictionary)
- ✅ Disconnected tile placements rejected
- ✅ Overlapping tiles rejected (placing on occupied squares)
- ✅ Words with gaps rejected
- ✅ First turn must use starting word
- ✅ Appropriate error messages shown
- ✅ Game state doesn't corrupt after rejection

**Negative Scenario Creation**:
Since invalid moves can't be extracted from share URLs (rejected moves aren't saved), these must be **manually defined** in JSON:

```bash
# Create negative scenario manually
cat > testing/scenarios/invalid-words.json <<EOF
{
  "name": "invalid-words",
  "type": "negative",
  ...
}
EOF
```

## Regression Comparison

### Baseline Storage

```
testing/baselines/
  ├── high-score-grandpa-129pts.baseline.json
  ├── simple-words.baseline.json
  └── edge-case-dictionary.baseline.json
```

**Baseline Format**:
```json
{
  "scenarioName": "high-score-grandpa-129pts",
  "lastUpdated": "2025-01-20T10:30:00Z",
  "expectedOutcomes": {
    "turnScores": [22, 18, 30, 31, 28],
    "finalScore": 129,
    "allWordsAccepted": true,
    "gameCompleted": true
  },
  "turnDetails": [
    {"turn": 1, "word": "BOO", "score": 22, "tilesPlaced": 3},
    {"turn": 2, "word": "VALID", "score": 18, "tilesPlaced": 4},
    {"turn": 3, "word": "HAE", "score": 30, "tilesPlaced": 3},
    {"turn": 4, "word": "SIP", "score": 31, "tilesPlaced": 3},
    {"turn": 5, "word": "ZING", "score": 28, "tilesPlaced": 3}
  ]
}
```

### Comparison Logic

```javascript
function compareAgainstBaseline(actualResults, baseline) {
  const differences = {
    passed: true,
    changes: []
  };

  // Compare turn-by-turn scores
  actualResults.turnScores.forEach((score, i) => {
    if (score !== baseline.expectedOutcomes.turnScores[i]) {
      differences.passed = false;
      differences.changes.push({
        type: 'score_mismatch',
        turn: i + 1,
        expected: baseline.expectedOutcomes.turnScores[i],
        actual: score,
        delta: score - baseline.expectedOutcomes.turnScores[i]
      });
    }
  });

  // Compare final score
  if (actualResults.finalScore !== baseline.expectedOutcomes.finalScore) {
    differences.passed = false;
    differences.changes.push({
      type: 'final_score_mismatch',
      expected: baseline.expectedOutcomes.finalScore,
      actual: actualResults.finalScore,
      delta: actualResults.finalScore - baseline.expectedOutcomes.finalScore
    });
  }

  // Check word validation
  if (actualResults.wordsRejected && actualResults.wordsRejected.length > 0) {
    differences.passed = false;
    differences.changes.push({
      type: 'word_rejection',
      rejectedWords: actualResults.wordsRejected
    });
  }

  return differences;
}
```

### Baseline Update Workflow

```bash
# When you intentionally change game mechanics:
npm run test:gameplay -- --update-baselines

# Reviews all changes and prompts for confirmation
# Updates baseline files with new expected values
```

## Failure Reporting

### Test Report Structure

```
testing/reports/
  ├── test-run-2025-01-20-153045.json
  ├── screenshots/
  │   ├── grandpa-turn3-failure.png
  │   └── qi-rejection.png
  └── latest.json (symlink to most recent)
```

**Report JSON**:
```json
{
  "timestamp": "2025-01-20T15:30:45Z",
  "environment": "localhost:8085",
  "summary": {
    "total": 12,
    "passed": 10,
    "failed": 2,
    "duration": "8m 34s"
  },
  "failures": [
    {
      "scenario": "high-score-grandpa-129pts",
      "turn": 3,
      "mechanic": "scoring",
      "expected": 30,
      "actual": 28,
      "delta": -2,
      "possibleCause": "Multiplier calculation changed",
      "screenshot": "reports/screenshots/grandpa-turn3-failure.png",
      "gameState": {
        "placedTiles": [...],
        "currentScore": 58
      }
    },
    {
      "scenario": "edge-case-dictionary",
      "turn": 2,
      "mechanic": "word_validation",
      "word": "QI",
      "expected": "accepted",
      "actual": "rejected",
      "errorMessage": "Word not found in dictionary",
      "screenshot": "reports/screenshots/qi-rejection.png"
    }
  ],
  "regressions": [
    {
      "scenario": "high-score-grandpa-129pts",
      "changedMetrics": [
        {
          "metric": "turn_3_score",
          "baseline": 30,
          "current": 28,
          "percentChange": -6.67
        }
      ]
    }
  ]
}
```

### Console Output

```
Core Gameplay Validator - Test Results
=====================================

✓ simple-words-high-score (8.2s)
✓ perfect-game-multipliers (12.4s)
✗ high-score-grandpa-129pts (9.1s)

  REGRESSION DETECTED: Scoring mismatch

  Turn 3: Expected 30 points, got 28 points (-2)
  Word: HAE
  Position: Vertical at row 6, col 6

  Possible causes:
  - Multiplier calculation changed
  - Tile values modified
  - Scoring algorithm updated

  Screenshot: reports/screenshots/grandpa-turn3-failure.png

  Previous runs:
    2025-01-19: ✓ 30 points
    2025-01-18: ✓ 30 points
    2025-01-17: ✓ 30 points

✗ edge-case-dictionary (6.8s)

  REGRESSION DETECTED: Word validation failure

  Turn 2: Word "QI" was rejected (expected: accepted)
  Error: "Word not found in dictionary"

  This word passed in all previous test runs.

  Possible causes:
  - Dictionary file changed
  - Word validation logic updated
  - API endpoint modified

=====================================
Summary: 10/12 passed (2 regressions detected)
Duration: 8m 34s

⚠️ REGRESSIONS DETECTED - Review changes before deploying
```

### Screenshot Capture

On any failure, automatically capture:
- Full board state
- Current tile rack
- Error modal (if visible)
- Score display
- Turn indicator
- Game state dump (in console logs)

Screenshots saved to: `testing/reports/screenshots/{scenario}-{turn}-failure.png`

## File Structure

```
testing/
├── core-gameplay-suite.spec.js       # Main test runner
├── scenarios/                         # Test scenarios (JSON)
│   ├── high-score-grandpa-129pts.json
│   ├── simple-words.json
│   ├── edge-case-dictionary.json
│   └── perfect-game-multipliers.json
├── baselines/                         # Known-good results
│   ├── high-score-grandpa-129pts.baseline.json
│   └── ...
├── reports/                           # Test run reports
│   ├── test-run-YYYY-MM-DD-HHmmss.json
│   ├── screenshots/
│   └── latest.json
├── lib/                               # Helper modules
│   ├── compare-baselines.js
│   ├── report-generator.js
│   └── screenshot-capture.js
└── tools/                             # Utilities
    └── extract-scenario.js            # Extract scenarios from share URLs
```

## Usage

### Running Tests

```bash
# Run all core gameplay tests
npm run test:gameplay

# Run specific scenario
npm run test:gameplay -- --grep="high-score-grandpa"

# Update baselines (after intentional changes)
npm run test:gameplay -- --update-baselines

# Generate detailed report
npm run test:gameplay -- --reporter=html
```

### Creating New Scenarios

```bash
# 1. Play a game and get the share URL
# 2. Extract scenario
npm run extract-scenario -- "https://letters.wiki/?g=ABC123..." --name="my-test-case"

# 3. Run test to establish baseline
npm run test:gameplay -- --grep="my-test-case"

# 4. Scenario is now part of the suite
```

## Benefits

### For Development
- Fast feedback (10-15 min) after gameplay changes
- Catch regressions before they reach production
- Clear diagnostics with screenshots
- Baseline comparison shows exactly what changed

### For Maintenance
- Easy to add new scenarios (just play a game)
- Scenarios are real gameplay, not synthetic tests
- Self-documenting (scenario JSON shows expected behavior)
- Can replay any completed game as a test

### For Confidence
- Tests actually play the game (not just API calls)
- Validates all three critical mechanics
- Regression tracking prevents accidental breakage
- Screenshots provide visual proof of failures

## Next Steps

1. **Phase 5**: Set up git worktree for implementation
2. **Phase 6**: Create detailed implementation plan
3. Implement extraction tool
4. Implement test runner
5. Create initial scenario library (5-10 scenarios)
6. Establish baselines
7. Integrate into development workflow
