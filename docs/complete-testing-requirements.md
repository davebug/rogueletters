# Complete Testing Requirements - Daily Letters

## Overview

This document defines all testing requirements that, when passed, confirm Daily Letters is a complete and functional game. Each test is designed to be executable via Playwright, ensuring Claude can run these tests automatically.

## Test Execution Strategy

All tests will be run using Playwright with the following structure:
1. **Setup**: Start with clean game state using specific seed
2. **Execute**: Perform test actions
3. **Verify**: Check expected outcomes
4. **Report**: Clear pass/fail with specific failure reasons

## 1. Core Game Mechanics Tests

### 1.1 Board Initialization
```javascript
// test: board-initialization.spec.js
test.describe('Board Initialization', () => {
  test('should create 15x15 board', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');

    const cellCount = await page.locator('.board-cell').count();
    expect(cellCount).toBe(225); // 15x15

    // Verify multiplier squares at correct positions
    const doubleWordCells = await page.locator('.double-word').count();
    const tripleWordCells = await page.locator('.triple-word').count();
    const doubleLetterCells = await page.locator('.double-letter').count();
    const tripleLetterCells = await page.locator('.triple-letter').count();

    expect(doubleWordCells).toBe(16);
    expect(tripleWordCells).toBe(8);
    expect(doubleLetterCells).toBe(24);
    expect(tripleLetterCells).toBe(12);
  });

  test('should place starting word from Wikipedia', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');

    // Check starting word exists
    const occupiedCells = await page.locator('.board-cell.occupied').count();
    expect(occupiedCells).toBeGreaterThan(0);
    expect(occupiedCells).toBeLessThanOrEqual(15);

    // Verify Wikipedia context is displayed
    const wikiContext = await page.locator('#wikipedia-context').textContent();
    expect(wikiContext).toContain('January 20');
  });

  test('should provide 7 tiles in rack', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');

    const tiles = await page.locator('#tile-rack .tile').count();
    expect(tiles).toBe(7);

    // Verify each tile has a letter and point value
    for (let i = 0; i < 7; i++) {
      const tile = page.locator('#tile-rack .tile').nth(i);
      const letter = await tile.locator('.tile-letter').textContent();
      const value = await tile.locator('.tile-value').textContent();

      expect(letter).toMatch(/^[A-Z]$/);
      expect(parseInt(value)).toBeGreaterThanOrEqual(1);
      expect(parseInt(value)).toBeLessThanOrEqual(10);
    }
  });
});
```

### 1.2 Tile Placement Rules
```javascript
// test: tile-placement-rules.spec.js
test.describe('Tile Placement Rules', () => {
  test('should enforce connection to existing tiles', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');

    // Try to place disconnected tile
    const tile = page.locator('#tile-rack .tile').first();
    await tile.click();

    // Click far from starting word
    await page.locator('[data-row="0"][data-col="0"]').click();

    // Verify tile not placed
    const cellContent = await page.locator('[data-row="0"][data-col="0"] .tile').count();
    expect(cellContent).toBe(0);

    // Try submit (should be disabled or show error)
    await page.click('#submit-word');

    const errorVisible = await page.locator('#error-modal').isVisible();
    if (errorVisible) {
      const errorMsg = await page.locator('#error-message').textContent();
      expect(errorMsg).toContain('connect');
    }
  });

  test('should enforce straight line placement', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');

    // Place tiles diagonally (invalid)
    await page.locator('#tile-rack .tile').nth(0).click();
    await page.locator('[data-row="8"][data-col="7"]').click();

    await page.locator('#tile-rack .tile').nth(0).click();
    await page.locator('[data-row="9"][data-col="8"]').click(); // Diagonal

    await page.click('#submit-word');

    const errorMsg = await page.locator('#error-message').textContent();
    expect(errorMsg).toContain('straight line');
  });

  test('should prevent gaps in words', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');

    // Place tiles with gap
    await page.locator('#tile-rack .tile').nth(0).click();
    await page.locator('[data-row="8"][data-col="4"]').click();

    // Skip col 5
    await page.locator('#tile-rack .tile').nth(0).click();
    await page.locator('[data-row="8"][data-col="6"]').click();

    await page.click('#submit-word');

    const errorMsg = await page.locator('#error-message').textContent();
    expect(errorMsg).toContain('gap');
  });

  test('should prevent overlapping existing tiles', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');

    // Try to place on occupied cell
    const occupiedCell = await page.locator('.board-cell.occupied').first();
    const row = await occupiedCell.getAttribute('data-row');
    const col = await occupiedCell.getAttribute('data-col');

    await page.locator('#tile-rack .tile').first().click();
    await occupiedCell.click();

    // Tile should remain in rack
    const rackTiles = await page.locator('#tile-rack .tile').count();
    expect(rackTiles).toBe(7);
  });
});
```

### 1.3 Word Validation
```javascript
// test: word-validation.spec.js
test.describe('Word Validation', () => {
  test('should accept valid dictionary words', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=test-valid');

    // Place a known valid word (CAT)
    // Assuming we have C, A, T in rack for this seed
    await placeWord(page, 'CAT', 8, 7, 'horizontal');

    await page.click('#submit-word');

    // Should be accepted
    const score = await page.locator('#current-score').textContent();
    expect(parseInt(score)).toBeGreaterThan(0);

    const turn = await page.locator('#turn-counter').textContent();
    expect(turn).toContain('2');
  });

  test('should reject invalid words', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=test-invalid');

    // Place invalid word (XQZ)
    await placeWord(page, 'XQZ', 8, 7, 'horizontal');

    await page.click('#submit-word');

    const errorVisible = await page.locator('#error-modal').isVisible();
    expect(errorVisible).toBe(true);

    const errorMsg = await page.locator('#error-message').textContent();
    expect(errorMsg).toContain('Invalid word');
  });

  test('should validate all perpendicular words formed', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=test-perpendicular');

    // Setup: Existing word KING at row 7
    // Place tiles to form invalid perpendicular word
    await page.locator('#tile-rack .tile').filter({ hasText: 'X' }).click();
    await page.locator('[data-row="8"][data-col="7"]').click(); // Forms KX vertically

    await page.click('#submit-word');

    const errorMsg = await page.locator('#error-message').textContent();
    expect(errorMsg).toContain('KX');
  });

  test('should reject profanity', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=test-profanity');

    // Attempt to place a profane word
    // This assumes we have the right letters for a test profane word
    await placeWord(page, 'DAMN', 8, 7, 'horizontal');

    await page.click('#submit-word');

    const errorMsg = await page.locator('#error-message').textContent();
    expect(errorMsg.toLowerCase()).toContain('appropriate');
  });
});
```

## 2. Scoring System Tests

### 2.1 Score Calculation
```javascript
// test: scoring-system.spec.js
test.describe('Scoring System', () => {
  test('should calculate base tile values correctly', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=score-test');

    // Place tiles with known values
    // A=1, B=3, C=3 forming ABC
    await placeWord(page, 'ABC', 8, 7, 'horizontal');

    const scorePreview = await page.locator('#score-preview').textContent();
    expect(parseInt(scorePreview)).toBe(7); // 1+3+3
  });

  test('should apply double word multiplier', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=multiplier-test');

    // Place word on double word square
    const doubleWordCell = await page.locator('.double-word').first();
    const row = await doubleWordCell.getAttribute('data-row');
    const col = await doubleWordCell.getAttribute('data-col');

    await placeWord(page, 'CAT', parseInt(row), parseInt(col), 'horizontal');

    await page.click('#submit-word');

    const score = await page.locator('#current-score').textContent();
    expect(parseInt(score)).toBe(10); // (3+1+1) * 2
  });

  test('should apply triple word multiplier', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=triple-test');

    const tripleWordCell = await page.locator('.triple-word').first();
    const row = await tripleWordCell.getAttribute('data-row');
    const col = await tripleWordCell.getAttribute('data-col');

    await placeWord(page, 'CAT', parseInt(row), parseInt(col), 'horizontal');

    await page.click('#submit-word');

    const score = await page.locator('#current-score').textContent();
    expect(parseInt(score)).toBe(15); // (3+1+1) * 3
  });

  test('should apply letter multipliers before word multipliers', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=letter-multiplier');

    // Place C on double letter, rest normal, whole word on double word
    // Score should be ((3*2)+1+1) * 2 = 16
    // Implementation depends on board layout
  });

  test('should award 50 point bonus for using all 7 tiles', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=bingo-test');

    // Place all 7 tiles
    await placeWord(page, 'EXAMPLE', 8, 4, 'horizontal'); // 7 letter word

    await page.click('#submit-word');

    const score = await page.locator('#current-score').textContent();
    // Base score + 50
    expect(parseInt(score)).toBeGreaterThanOrEqual(50);
  });
});
```

## 3. Game Flow Tests

### 3.1 Turn Management
```javascript
// test: turn-management.spec.js
test.describe('Turn Management', () => {
  test('should progress through 5 turns', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=turn-test');

    for (let turn = 1; turn <= 5; turn++) {
      const turnDisplay = await page.locator('#turn-counter').textContent();
      expect(turnDisplay).toContain(`Turn ${turn}`);

      // Play a valid word
      await playValidWord(page);
      await page.click('#submit-word');

      if (turn < 5) {
        // Verify new tiles drawn
        const tiles = await page.locator('#tile-rack .tile').count();
        expect(tiles).toBe(7);
      }
    }

    // Game should be complete
    const gameOver = await page.locator('#game-over-modal').isVisible();
    expect(gameOver).toBe(true);
  });

  test('should handle retry functionality', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=retry-test');

    const initialRetries = await page.locator('#retries-remaining').textContent();
    expect(initialRetries).toContain('10');

    // Play invalid word
    await placeWord(page, 'XYZ', 8, 7, 'horizontal');
    await page.click('#submit-word');

    // Use retry
    await page.click('#retry-button');

    const retriesAfter = await page.locator('#retries-remaining').textContent();
    expect(retriesAfter).toContain('9');

    // Tiles should be returned
    const tiles = await page.locator('#tile-rack .tile').count();
    expect(tiles).toBe(7);
  });

  test('should disable retry when none remaining', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=no-retry-test');

    // Use all retries
    for (let i = 0; i < 10; i++) {
      await placeWord(page, 'XYZ', 8, 7, 'horizontal');
      await page.click('#submit-word');
      await page.click('#retry-button');
    }

    // Try one more time
    await placeWord(page, 'XYZ', 8, 7, 'horizontal');
    await page.click('#submit-word');

    const retryButton = await page.locator('#retry-button');
    expect(await retryButton.isDisabled()).toBe(true);
  });
});
```

### 3.2 Game Over Conditions
```javascript
// test: game-over.spec.js
test.describe('Game Over Conditions', () => {
  test('should end after 5 turns completed', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=complete-test');

    // Complete 5 turns
    for (let i = 0; i < 5; i++) {
      await playValidWord(page);
      await page.click('#submit-word');
    }

    const gameOverModal = await page.locator('#game-over-modal').isVisible();
    expect(gameOverModal).toBe(true);

    const finalScore = await page.locator('#final-score').textContent();
    expect(parseInt(finalScore)).toBeGreaterThan(0);
  });

  test('should show high score entry for first play', async ({ page }) => {
    // Clear localStorage to simulate first play
    await page.evaluate(() => localStorage.clear());

    await page.goto('http://localhost:8085/?seed=highscore-test');

    // Complete game
    await completeGame(page);

    const nameInput = await page.locator('#player-name-input').isVisible();
    expect(nameInput).toBe(true);

    await page.fill('#player-name-input', 'TESTUSER');
    await page.click('#submit-score');

    const highScoreList = await page.locator('#high-scores').textContent();
    expect(highScoreList).toContain('TESTUSER');
  });

  test('should not allow high score on replay', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=replay-test');

    // Complete game once
    await completeGame(page);
    await page.fill('#player-name-input', 'FIRST');
    await page.click('#submit-score');

    // Reload and play again
    await page.reload();
    await completeGame(page);

    const nameInput = await page.locator('#player-name-input').isVisible();
    expect(nameInput).toBe(false);

    const message = await page.locator('#replay-message').textContent();
    expect(message).toContain('already played');
  });
});
```

## 4. UI Feature Tests

### 4.1 Tile Manipulation
```javascript
// test: tile-manipulation.spec.js
test.describe('Tile Manipulation Features', () => {
  test('should allow clicking placed tile to recall it', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=recall-test');

    // Place tile
    const tile = await page.locator('#tile-rack .tile').first();
    const letter = await tile.locator('.tile-letter').textContent();
    await tile.click();
    await page.locator('[data-row="8"][data-col="7"]').click();

    // Click placed tile to recall
    await page.locator('[data-row="8"][data-col="7"] .tile').click();

    // Verify tile back in rack
    const rackTiles = await page.locator('#tile-rack .tile').count();
    expect(rackTiles).toBe(7);

    const rackHasLetter = await page.locator(`#tile-rack .tile:has-text("${letter}")`).count();
    expect(rackHasLetter).toBeGreaterThan(0);
  });

  test('should provide recall all button', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=recall-all-test');

    // Place multiple tiles
    for (let i = 0; i < 3; i++) {
      await page.locator('#tile-rack .tile').first().click();
      await page.locator(`[data-row="8"][data-col="${7+i}"]`).click();
    }

    // Click recall all
    await page.click('#recall-tiles');

    const rackTiles = await page.locator('#tile-rack .tile').count();
    expect(rackTiles).toBe(7);
  });

  test('should allow shuffle rack', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=shuffle-test');

    const getOrder = async () => {
      const tiles = await page.locator('#tile-rack .tile .tile-letter').allTextContents();
      return tiles.join('');
    };

    const initialOrder = await getOrder();

    await page.click('#shuffle-button');

    const newOrder = await getOrder();

    // Same letters, potentially different order
    expect(newOrder.split('').sort().join('')).toBe(initialOrder.split('').sort().join(''));
  });

  test('should show turn counter', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=turn-display');

    const turnCounter = await page.locator('#turn-counter').isVisible();
    expect(turnCounter).toBe(true);

    const turnText = await page.locator('#turn-counter').textContent();
    expect(turnText).toMatch(/Turn \d of 5/);
  });
});
```

### 4.2 Visual Feedback
```javascript
// test: visual-feedback.spec.js
test.describe('Visual Feedback', () => {
  test('should highlight valid placement cells', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=highlight-test');

    // Select tile
    await page.locator('#tile-rack .tile').first().click();

    // Check for valid placement highlights
    const validCells = await page.locator('.valid-placement').count();
    expect(validCells).toBeGreaterThan(0);
  });

  test('should show invalid placement feedback', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=invalid-feedback');

    await page.locator('#tile-rack .tile').first().click();

    // Hover over occupied cell
    const occupiedCell = await page.locator('.board-cell.occupied').first();
    await occupiedCell.hover();

    const cursor = await occupiedCell.evaluate(el =>
      window.getComputedStyle(el).cursor
    );
    expect(cursor).toBe('not-allowed');
  });

  test('should animate score changes', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=score-animation');

    await playValidWord(page);

    // Check for animation class
    await page.click('#submit-word');

    const scoreElement = await page.locator('#current-score');
    const hasAnimation = await scoreElement.evaluate(el =>
      el.classList.contains('score-change') ||
      el.style.animation !== ''
    );
    expect(hasAnimation).toBe(true);
  });

  test('should show submit button state', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=submit-state');

    const submitBtn = await page.locator('#submit-word');

    // Initially disabled
    expect(await submitBtn.isDisabled()).toBe(true);

    // Place valid word
    await playValidWord(page);

    // Should be enabled
    expect(await submitBtn.isDisabled()).toBe(false);
  });
});
```

### 4.3 Undo/Redo Functionality
```javascript
// test: undo-redo.spec.js
test.describe('Undo/Redo Features', () => {
  test('should undo last tile placement', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=undo-test');

    // Place tile
    const letter = await page.locator('#tile-rack .tile').first().locator('.tile-letter').textContent();
    await page.locator('#tile-rack .tile').first().click();
    await page.locator('[data-row="8"][data-col="7"]').click();

    // Undo
    await page.click('#undo-button');

    // Verify tile back in rack
    const rackHasLetter = await page.locator(`#tile-rack .tile:has-text("${letter}")`).count();
    expect(rackHasLetter).toBe(1);

    // Cell should be empty
    const cellEmpty = await page.locator('[data-row="8"][data-col="7"] .tile').count();
    expect(cellEmpty).toBe(0);
  });

  test('should redo after undo', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=redo-test');

    // Place and undo
    await page.locator('#tile-rack .tile').first().click();
    await page.locator('[data-row="8"][data-col="7"]').click();
    await page.click('#undo-button');

    // Redo
    await page.click('#redo-button');

    // Tile should be back on board
    const cellHasTile = await page.locator('[data-row="8"][data-col="7"] .tile').count();
    expect(cellHasTile).toBe(1);
  });

  test('should support keyboard shortcut Ctrl+Z', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=keyboard-undo');

    // Place tile
    await page.locator('#tile-rack .tile').first().click();
    await page.locator('[data-row="8"][data-col="7"]').click();

    // Ctrl+Z
    await page.keyboard.press('Control+z');

    // Verify undone
    const rackTiles = await page.locator('#tile-rack .tile').count();
    expect(rackTiles).toBe(7);
  });
});
```

## 5. Keyboard Navigation Tests

```javascript
// test: keyboard-navigation.spec.js
test.describe('Keyboard Navigation', () => {
  test('should select tiles with number keys', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=keyboard-test');

    await page.keyboard.press('1');

    const firstTileSelected = await page.locator('#tile-rack .tile').first().evaluate(el =>
      el.classList.contains('selected')
    );
    expect(firstTileSelected).toBe(true);

    await page.keyboard.press('3');

    const thirdTileSelected = await page.locator('#tile-rack .tile').nth(2).evaluate(el =>
      el.classList.contains('selected')
    );
    expect(thirdTileSelected).toBe(true);
  });

  test('should navigate board with arrow keys', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=arrow-nav');

    // Select tile
    await page.keyboard.press('1');

    // Focus on board
    await page.locator('[data-row="7"][data-col="7"]').focus();

    // Navigate
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');

    // Place with Enter
    await page.keyboard.press('Enter');

    // Check tile placed at expected position
    const tilePlaced = await page.locator('[data-row="8"][data-col="8"] .tile').count();
    expect(tilePlaced).toBe(1);
  });

  test('should recall tiles with R key', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=keyboard-recall');

    // Place tiles
    await placeWord(page, 'CAT', 8, 7, 'horizontal');

    // Press R
    await page.keyboard.press('r');

    // All tiles should be back
    const rackTiles = await page.locator('#tile-rack .tile').count();
    expect(rackTiles).toBe(7);
  });

  test('should shuffle with S key', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=keyboard-shuffle');

    const getOrder = async () => {
      const tiles = await page.locator('#tile-rack .tile .tile-letter').allTextContents();
      return tiles.join('');
    };

    const initialOrder = await getOrder();

    await page.keyboard.press('s');

    const newOrder = await getOrder();

    // Check if order potentially changed
    expect(newOrder.split('').sort().join('')).toBe(initialOrder.split('').sort().join(''));
  });
});
```

## 6. State Persistence Tests

```javascript
// test: state-persistence.spec.js
test.describe('State Persistence', () => {
  test('should save game state to localStorage', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=persistence-test');

    // Play some moves
    await playValidWord(page);
    await page.click('#submit-word');

    const score = await page.locator('#current-score').textContent();

    // Check localStorage
    const savedState = await page.evaluate(() =>
      localStorage.getItem('letters_game_state')
    );

    expect(savedState).toBeTruthy();
    const state = JSON.parse(savedState);
    expect(state.player.score).toBe(parseInt(score));
  });

  test('should restore game on reload', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=restore-test');

    // Play moves
    await playValidWord(page);
    await page.click('#submit-word');

    const score = await page.locator('#current-score').textContent();
    const turn = await page.locator('#turn-counter').textContent();

    // Reload
    await page.reload();

    // Verify restored
    await expect(page.locator('#current-score')).toHaveText(score);
    await expect(page.locator('#turn-counter')).toHaveText(turn);
  });

  test('should clear state for new day', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250119');

    // Play game
    await playValidWord(page);
    await page.click('#submit-word');

    // Navigate to next day
    await page.goto('http://localhost:8085/?seed=20250120');

    // Should be fresh game
    const score = await page.locator('#current-score').textContent();
    expect(parseInt(score)).toBe(0);

    const turn = await page.locator('#turn-counter').textContent();
    expect(turn).toContain('Turn 1');
  });
});
```

## 7. Performance Tests

```javascript
// test: performance.spec.js
test.describe('Performance Requirements', () => {
  test('should place tiles within 50ms', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=perf-test');

    const measurements = [];

    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();

      await page.locator('#tile-rack .tile').first().click();
      await page.locator(`[data-row="8"][data-col="${7+i}"]`).click();

      const duration = Date.now() - startTime;
      measurements.push(duration);

      // Recall for next iteration
      await page.click('#recall-tiles');
    }

    const average = measurements.reduce((a, b) => a + b) / measurements.length;
    expect(average).toBeLessThan(50);
  });

  test('should validate words within 100ms', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=validate-perf');

    await playValidWord(page);

    const startTime = Date.now();
    await page.click('#submit-word');
    await page.waitForSelector('#turn-counter:has-text("Turn 2")');
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100);
  });

  test('should handle 100+ tiles on board', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=stress-test');

    // Simulate late game with many tiles
    await page.evaluate(() => {
      // Fill board programmatically
      for (let i = 0; i < 100; i++) {
        const row = Math.floor(i / 15);
        const col = i % 15;
        window.gameController.placeTileDirectly({ letter: 'A' }, row, col);
      }
    });

    // Should still be responsive
    const startTime = Date.now();
    await page.click('#shuffle-button');
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100);
  });
});
```

## 8. Accessibility Tests

```javascript
// test: accessibility.spec.js
test.describe('Accessibility Requirements', () => {
  test('should be fully keyboard navigable', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=a11y-keyboard');

    // Tab through all interactive elements
    const elements = [
      '#tile-rack .tile:first-child',
      '#submit-word',
      '#shuffle-button',
      '#recall-tiles',
      '#undo-button',
      '#redo-button'
    ];

    for (const selector of elements) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate((sel) =>
        document.activeElement.matches(sel),
        selector
      );
      expect(focused).toBe(true);
    }
  });

  test('should have ARIA labels', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=a11y-aria');

    const elements = [
      { selector: '#submit-word', label: 'Submit word' },
      { selector: '#shuffle-button', label: 'Shuffle tiles' },
      { selector: '#recall-tiles', label: 'Recall all tiles' },
      { selector: '#undo-button', label: 'Undo' },
      { selector: '#redo-button', label: 'Redo' }
    ];

    for (const { selector, label } of elements) {
      const ariaLabel = await page.locator(selector).getAttribute('aria-label');
      expect(ariaLabel).toBe(label);
    }
  });

  test('should announce game actions to screen readers', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=a11y-announce');

    // Monitor announcements
    await page.evaluate(() => {
      window.announcements = [];
      const original = window.announceToScreenReader;
      window.announceToScreenReader = (text) => {
        window.announcements.push(text);
        if (original) original(text);
      };
    });

    // Place tile
    await page.locator('#tile-rack .tile').first().click();
    await page.locator('[data-row="8"][data-col="7"]').click();

    const announcements = await page.evaluate(() => window.announcements);
    expect(announcements).toContain('Tile placed at row 8, column 7');
  });

  test('should support high contrast mode', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=a11y-contrast');

    // Toggle high contrast
    await page.keyboard.press('Control+Shift+H');

    // Check contrast ratios
    const hasHighContrast = await page.evaluate(() => {
      const body = document.body;
      return body.classList.contains('high-contrast') ||
             body.dataset.theme === 'high-contrast';
    });

    expect(hasHighContrast).toBe(true);
  });
});
```

## 9. Error Handling Tests

```javascript
// test: error-handling.spec.js
test.describe('Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=network-test');

    // Intercept and fail API calls
    await page.route('**/cgi-bin/validate_word.py', route => {
      route.abort();
    });

    await playValidWord(page);
    await page.click('#submit-word');

    // Should show error message
    const errorModal = await page.locator('#error-modal').isVisible();
    expect(errorModal).toBe(true);

    const errorMsg = await page.locator('#error-message').textContent();
    expect(errorMsg).toContain('network');
  });

  test('should handle invalid game state', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=invalid-state');

    // Corrupt state
    await page.evaluate(() => {
      const badState = { corrupted: true };
      localStorage.setItem('letters_game_state', JSON.stringify(badState));
    });

    await page.reload();

    // Should recover and start fresh
    const gameLoaded = await page.locator('#game-board').isVisible();
    expect(gameLoaded).toBe(true);

    const score = await page.locator('#current-score').textContent();
    expect(parseInt(score)).toBe(0);
  });

  test('should prevent invalid browser fingerprint manipulation', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=fingerprint-test');

    // Complete game once
    await completeGame(page);

    // Try to manipulate fingerprint
    await page.evaluate(() => {
      localStorage.removeItem('browser_fingerprint');
      localStorage.setItem('game_played_20250120', 'false');
    });

    await page.reload();
    await completeGame(page);

    // Should still detect as replay
    const nameInput = await page.locator('#player-name-input').isVisible();
    expect(nameInput).toBe(false);
  });
});
```

## 10. Integration Tests

```javascript
// test: integration.spec.js
test.describe('Full Integration Tests', () => {
  test('should complete full game with all features', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=integration-test');

    // Turn 1: Use shuffle
    await page.click('#shuffle-button');
    await playValidWord(page);
    await page.click('#submit-word');

    // Turn 2: Use undo/redo
    await page.locator('#tile-rack .tile').first().click();
    await page.locator('[data-row="9"][data-col="7"]').click();
    await page.click('#undo-button');
    await page.click('#redo-button');
    await playValidWord(page);
    await page.click('#submit-word');

    // Turn 3: Use recall
    await placeWord(page, 'DOG', 10, 7, 'horizontal');
    await page.click('#recall-tiles');
    await playValidWord(page);
    await page.click('#submit-word');

    // Turn 4: Use keyboard
    await page.keyboard.press('1');
    await page.keyboard.press('Enter');
    await playValidWord(page);
    await page.keyboard.press('Control+Enter');

    // Turn 5: Final turn
    await playValidWord(page);
    await page.click('#submit-word');

    // Verify game complete
    const gameOver = await page.locator('#game-over-modal').isVisible();
    expect(gameOver).toBe(true);

    const finalScore = await page.locator('#final-score').textContent();
    expect(parseInt(finalScore)).toBeGreaterThan(0);
  });
});
```

## Test Execution Script

```javascript
// run-all-tests.js
const { chromium } = require('@playwright/test');

async function runAllTests() {
  const results = {
    passed: [],
    failed: [],
    total: 0
  };

  const testSuites = [
    'board-initialization',
    'tile-placement-rules',
    'word-validation',
    'scoring-system',
    'turn-management',
    'game-over',
    'tile-manipulation',
    'visual-feedback',
    'undo-redo',
    'keyboard-navigation',
    'state-persistence',
    'performance',
    'accessibility',
    'error-handling',
    'integration'
  ];

  for (const suite of testSuites) {
    console.log(`Running ${suite} tests...`);

    try {
      await runTestSuite(suite);
      results.passed.push(suite);
      console.log(`✅ ${suite} passed`);
    } catch (error) {
      results.failed.push({ suite, error: error.message });
      console.log(`❌ ${suite} failed: ${error.message}`);
    }

    results.total++;
  }

  // Generate report
  console.log('\n=== TEST RESULTS ===');
  console.log(`Total: ${results.total}`);
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed tests:');
    results.failed.forEach(({ suite, error }) => {
      console.log(`  - ${suite}: ${error}`);
    });
  }

  // Determine if game is complete
  if (results.failed.length === 0) {
    console.log('\n✅ GAME IS COMPLETE AND FUNCTIONAL!');
  } else {
    console.log('\n❌ GAME NEEDS FIXES:');
    console.log('Priority fixes required for:');
    results.failed.forEach(({ suite }) => {
      console.log(`  - ${suite}`);
    });
  }

  return results;
}

// Helper function to run individual test suite
async function runTestSuite(suiteName) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  const command = `npx playwright test tests/${suiteName}.spec.js --reporter=json`;
  const { stdout, stderr } = await execAsync(command);

  const results = JSON.parse(stdout);

  if (results.failures > 0) {
    throw new Error(`${results.failures} tests failed`);
  }

  return results;
}

// Helper functions for tests
async function playValidWord(page) {
  // Find a valid word placement
  const validPlacement = await page.evaluate(() => {
    return window.gameController.findValidWordPlacement();
  });

  for (const { tile, row, col } of validPlacement) {
    await page.locator('#tile-rack .tile').nth(tile).click();
    await page.locator(`[data-row="${row}"][data-col="${col}"]`).click();
  }
}

async function placeWord(page, word, startRow, startCol, direction) {
  const letters = word.split('');

  for (let i = 0; i < letters.length; i++) {
    const tile = await page.locator(`#tile-rack .tile:has-text("${letters[i]}")`).first();
    await tile.click();

    const row = direction === 'horizontal' ? startRow : startRow + i;
    const col = direction === 'horizontal' ? startCol + i : startCol;

    await page.locator(`[data-row="${row}"][data-col="${col}"]`).click();
  }
}

async function completeGame(page) {
  for (let i = 0; i < 5; i++) {
    await playValidWord(page);
    await page.click('#submit-word');
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().then(results => {
    process.exit(results.failed.length > 0 ? 1 : 0);
  });
}

module.exports = { runAllTests, playValidWord, placeWord, completeGame };
```

## Summary Checklist

When all these tests pass, we have confirmed:

### ✅ **Core Game Mechanics**
- [ ] 15x15 board with correct multipliers
- [ ] Starting word from Wikipedia
- [ ] 7 tiles in rack
- [ ] All Scrabble placement rules enforced
- [ ] Dictionary validation working
- [ ] Scoring calculation correct

### ✅ **Game Flow**
- [ ] 5 turns progression
- [ ] 10 retries across game
- [ ] Game over conditions
- [ ] High score for first play only

### ✅ **Player Features**
- [ ] Tile recall (click to return)
- [ ] Recall all button
- [ ] Shuffle rack
- [ ] Turn counter display
- [ ] Visual feedback for placements
- [ ] Undo/Redo functionality

### ✅ **Advanced Features**
- [ ] Keyboard navigation (1-7, arrows, shortcuts)
- [ ] State persistence
- [ ] Error handling
- [ ] Performance requirements met
- [ ] Accessibility compliance

### ✅ **Integration**
- [ ] All features work together
- [ ] No feature conflicts
- [ ] Smooth user experience

**If all tests pass: Game is COMPLETE and ready for deployment!**
**If tests fail: We have specific, actionable items to fix.**