# Testing Methodology - Daily Letters

## Overview

This document outlines the comprehensive testing strategy for Daily Letters, covering unit tests, integration tests, E2E tests, performance testing, and accessibility testing. The methodology ensures high code quality, reliability, and user experience across all features.

## Testing Pyramid

```
         /\
        /E2E\       (5%) - Critical user journeys
       /----\
      / Intg \      (15%) - Component interactions
     /--------\
    /   Unit   \    (80%) - Individual functions/components
   /____________\
```

## 1. Unit Testing

### Test Structure

```javascript
// Standard test file structure: feature.test.js
describe('Feature Name', () => {
  // Setup and teardown
  beforeAll(() => {
    // One-time setup
  });

  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  afterAll(() => {
    // Final cleanup
  });

  // Group related tests
  describe('Specific Functionality', () => {
    test('should perform expected behavior', () => {
      // Arrange
      const input = setupTestData();

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toEqual(expectedOutput);
    });

    test('should handle edge cases', () => {
      // Test edge cases
    });

    test('should handle errors gracefully', () => {
      // Test error conditions
    });
  });
});
```

### Core Game Logic Tests

```javascript
// gameLogic.test.js
describe('Game Logic', () => {
  describe('Tile Placement', () => {
    let board;

    beforeEach(() => {
      board = createEmptyBoard();
    });

    test('should place tile on empty cell', () => {
      const tile = { letter: 'A', value: 1 };
      const result = placeTile(board, tile, 7, 7);

      expect(result.success).toBe(true);
      expect(board[7][7]).toEqual(tile);
    });

    test('should reject placement on occupied cell', () => {
      board[7][7] = { letter: 'B', value: 3 };
      const tile = { letter: 'A', value: 1 };

      const result = placeTile(board, tile, 7, 7);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cell already occupied');
    });

    test('should validate connection to existing tiles', () => {
      // Place initial tile
      board[7][7] = { letter: 'C', value: 3 };

      // Valid adjacent placement
      const validTile = { letter: 'A', value: 1 };
      expect(isValidPlacement(board, validTile, 7, 8)).toBe(true);

      // Invalid disconnected placement
      expect(isValidPlacement(board, validTile, 0, 0)).toBe(false);
    });

    test('should enforce linear placement rule', () => {
      const placedTiles = [
        { row: 7, col: 7 },
        { row: 7, col: 8 }
      ];

      // Valid: same row
      expect(isLinearPlacement(placedTiles, 7, 9)).toBe(true);

      // Invalid: diagonal
      expect(isLinearPlacement(placedTiles, 8, 9)).toBe(false);
    });

    test('should detect gaps in placement', () => {
      const board = createEmptyBoard();
      board[7][7] = { letter: 'A', value: 1 };
      // Gap at [7][8]
      board[7][9] = { letter: 'B', value: 3 };

      expect(hasGaps(board, 7, 7, 7, 9)).toBe(true);

      // Fill gap
      board[7][8] = { letter: 'C', value: 3 };
      expect(hasGaps(board, 7, 7, 7, 9)).toBe(false);
    });
  });

  describe('Word Validation', () => {
    const dictionary = new Set(['CAT', 'DOG', 'CATS', 'DOGS', 'ACT']);

    test('should validate single word', () => {
      expect(isValidWord('CAT', dictionary)).toBe(true);
      expect(isValidWord('XYZ', dictionary)).toBe(false);
    });

    test('should extract horizontal word', () => {
      const board = createBoardWithWord('CAT', 7, 7, 'horizontal');
      const word = extractWord(board, 7, 7, 'horizontal');

      expect(word).toBe('CAT');
    });

    test('should extract vertical word', () => {
      const board = createBoardWithWord('DOG', 7, 7, 'vertical');
      const word = extractWord(board, 7, 7, 'vertical');

      expect(word).toBe('DOG');
    });

    test('should find all formed words', () => {
      const board = createEmptyBoard();
      // Place C-A-T horizontally
      board[7][7] = { letter: 'C' };
      board[7][8] = { letter: 'A' };
      board[7][9] = { letter: 'T' };
      // Place A-C-T vertically through the A
      board[6][8] = { letter: 'A' };
      board[8][8] = { letter: 'T' };

      const words = findAllWords(board, [
        { row: 7, col: 7 },
        { row: 7, col: 8 },
        { row: 7, col: 9 }
      ]);

      expect(words).toContain('CAT');
      expect(words).toContain('ACT');
    });
  });

  describe('Score Calculation', () => {
    test('should calculate base tile score', () => {
      const tiles = [
        { letter: 'Q', value: 10 },
        { letter: 'U', value: 1 },
        { letter: 'I', value: 1 },
        { letter: 'Z', value: 10 }
      ];

      expect(calculateBaseScore(tiles)).toBe(22);
    });

    test('should apply word multipliers', () => {
      const baseScore = 20;
      const multipliers = [
        { type: 'double-word', applied: true },
        { type: 'triple-word', applied: true }
      ];

      expect(applyMultipliers(baseScore, multipliers)).toBe(120); // 20 * 2 * 3
    });

    test('should apply letter multipliers before word multipliers', () => {
      const tiles = [
        { letter: 'C', value: 3, multiplier: 'double-letter' },
        { letter: 'A', value: 1 },
        { letter: 'T', value: 1, multiplier: 'triple-letter' }
      ];

      // C=3*2=6, A=1, T=1*3=3, Total=10
      expect(calculateTileScores(tiles)).toBe(10);
    });

    test('should award 50 point bonus for using all 7 tiles', () => {
      const placedTiles = new Array(7).fill({ letter: 'A', value: 1 });
      const baseScore = 7;

      expect(calculateFinalScore(baseScore, placedTiles)).toBe(57);
    });
  });
});
```

### State Management Tests

```javascript
// stateManagement.test.js
describe('State Management', () => {
  let store;

  beforeEach(() => {
    store = createStore(gameReducer, initialState);
  });

  describe('Actions', () => {
    test('PLACE_TILE should update board and rack', () => {
      const tile = { letter: 'A', value: 1, index: 0 };
      const action = placeTileAction(tile, 7, 7);

      store.dispatch(action);
      const state = store.getState();

      expect(state.board.cells[7][7]).toEqual(tile);
      expect(state.player.rack).not.toContain(tile);
      expect(state.currentTurn.placedTiles).toHaveLength(1);
    });

    test('RECALL_TILES should return all tiles to rack', () => {
      // Place multiple tiles
      store.dispatch(placeTileAction(tiles[0], 7, 7));
      store.dispatch(placeTileAction(tiles[1], 7, 8));

      store.dispatch(recallTilesAction());
      const state = store.getState();

      expect(state.currentTurn.placedTiles).toHaveLength(0);
      expect(state.player.rack).toHaveLength(7);
    });

    test('SHUFFLE_RACK should reorder tiles', () => {
      const initialOrder = [...store.getState().player.rack];

      store.dispatch(shuffleRackAction());
      const newOrder = store.getState().player.rack;

      // Same tiles, potentially different order
      expect(newOrder.sort()).toEqual(initialOrder.sort());
      // Note: Can't guarantee order changed due to randomness
    });
  });

  describe('Selectors', () => {
    test('should compute valid placements', () => {
      const state = {
        board: createBoardWithWord('CAT', 7, 7, 'horizontal'),
        ui: { selectedTile: 0 },
        currentTurn: { placedTiles: [] }
      };

      const validPlacements = getValidPlacements(state);

      // Should include cells adjacent to existing word
      expect(validPlacements).toContain('6,7'); // Above C
      expect(validPlacements).toContain('8,7'); // Below C
      expect(validPlacements).toContain('7,10'); // After T
    });

    test('should memoize expensive computations', () => {
      const expensiveSelector = jest.fn(getWordsFormed);

      // Call multiple times with same state
      const state = store.getState();
      expensiveSelector(state);
      expensiveSelector(state);
      expensiveSelector(state);

      // Should only compute once
      expect(expensiveSelector).toHaveBeenCalledTimes(1);
    });
  });

  describe('Middleware', () => {
    test('validation middleware should block invalid actions', () => {
      const middleware = validationMiddleware(store);
      const next = jest.fn();

      // Try to place on occupied cell
      store.getState().board.cells[7][7] = { letter: 'X' };

      const invalidAction = placeTileAction({ letter: 'A' }, 7, 7);
      middleware(next)(invalidAction);

      expect(next).not.toHaveBeenCalled();
    });

    test('persistence middleware should save state', async () => {
      const saveStateSpy = jest.spyOn(Storage.prototype, 'setItem');

      store.dispatch(placeTileAction({ letter: 'A' }, 7, 7));

      // Wait for debounced save
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(saveStateSpy).toHaveBeenCalledWith(
        'letters_game_state',
        expect.any(String)
      );
    });
  });
});
```

## 2. Integration Testing

### Component Integration Tests

```javascript
// componentIntegration.test.js
describe('Component Integration', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  describe('Board and Tile Rack Integration', () => {
    test('should move tile from rack to board', () => {
      const game = new GameController(container);
      game.initialize();

      // Select tile from rack
      const rackTile = container.querySelector('.tile:first-child');
      const tileLetter = rackTile.textContent;

      fireEvent.click(rackTile);
      expect(rackTile).toHaveClass('selected');

      // Place on board
      const boardCell = container.querySelector('[data-row="7"][data-col="7"]');
      fireEvent.click(boardCell);

      // Verify tile moved
      expect(boardCell.textContent).toBe(tileLetter);
      expect(container.querySelectorAll('.rack .tile')).toHaveLength(6);
    });

    test('should highlight valid placements when tile selected', () => {
      const game = new GameController(container);
      game.initialize();

      // Add existing tile to board
      game.placeTile({ letter: 'A' }, 7, 7);

      // Select new tile
      const rackTile = container.querySelector('.tile:first-child');
      fireEvent.click(rackTile);

      // Check for highlighted cells
      const validCells = container.querySelectorAll('.valid-placement');
      expect(validCells.length).toBeGreaterThan(0);

      // Adjacent cells should be valid
      const adjacentCell = container.querySelector('[data-row="7"][data-col="8"]');
      expect(adjacentCell).toHaveClass('valid-placement');
    });
  });

  describe('Submit Word Flow', () => {
    test('should validate and submit word', async () => {
      const game = new GameController(container);
      game.initialize();

      // Spell out CAT
      placeWord(game, 'CAT', 7, 7, 'horizontal');

      const submitButton = container.querySelector('#submit-word');
      expect(submitButton).not.toBeDisabled();

      // Mock API response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({
            valid: true,
            score: 5,
            words_formed: ['CAT']
          })
        })
      );

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(container.querySelector('#current-score').textContent).toBe('5');
      });

      expect(container.querySelector('#turn-counter').textContent)
        .toContain('Turn 2');
    });

    test('should show error for invalid word', async () => {
      const game = new GameController(container);
      game.initialize();

      // Spell out invalid word
      placeWord(game, 'XYZ', 7, 7, 'horizontal');

      // Mock API response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({
            valid: false,
            message: 'Invalid word: XYZ'
          })
        })
      );

      const submitButton = container.querySelector('#submit-word');
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorModal = container.querySelector('#error-modal');
        expect(errorModal).toBeVisible();
        expect(errorModal.textContent).toContain('Invalid word: XYZ');
      });
    });
  });

  describe('Undo/Redo Integration', () => {
    test('should undo tile placement', () => {
      const game = new GameController(container);
      game.initialize();

      // Place tile
      const tile = selectTileFromRack(container, 0);
      placeTileOnBoard(container, 7, 7);

      expect(container.querySelectorAll('.rack .tile')).toHaveLength(6);

      // Undo
      const undoButton = container.querySelector('#undo-button');
      fireEvent.click(undoButton);

      expect(container.querySelectorAll('.rack .tile')).toHaveLength(7);
      expect(getBoardCell(container, 7, 7).textContent).toBe('');
    });

    test('should redo after undo', () => {
      const game = new GameController(container);
      game.initialize();

      // Place and undo
      placeTileOnBoard(container, 7, 7);
      fireEvent.click(container.querySelector('#undo-button'));

      // Redo
      const redoButton = container.querySelector('#redo-button');
      fireEvent.click(redoButton);

      expect(container.querySelectorAll('.rack .tile')).toHaveLength(6);
      expect(getBoardCell(container, 7, 7).textContent).not.toBe('');
    });
  });
});
```

## 3. End-to-End Testing

### Playwright E2E Tests

```javascript
// e2e/gameFlow.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Complete Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=test123');
    await page.waitForSelector('#game-board');
  });

  test('should play complete game', async ({ page }) => {
    // Turn 1: Play first word
    await playWord(page, [
      { tile: 0, row: 8, col: 7 },
      { tile: 1, row: 8, col: 8 },
      { tile: 2, row: 8, col: 9 }
    ]);

    await page.click('#submit-word');
    await expect(page.locator('#turn-counter')).toContainText('Turn 2');

    // Turn 2: Play crossing word
    await playWord(page, [
      { tile: 0, row: 7, col: 8 },
      { tile: 1, row: 9, col: 8 }
    ]);

    await page.click('#submit-word');
    await expect(page.locator('#turn-counter')).toContainText('Turn 3');

    // Continue until game complete
    for (let turn = 3; turn <= 5; turn++) {
      await playValidWord(page);
      await page.click('#submit-word');
    }

    // Check game over state
    await expect(page.locator('#game-over-modal')).toBeVisible();
    await expect(page.locator('#final-score')).toBeVisible();
  });

  test('should handle retry functionality', async ({ page }) => {
    // Play invalid word
    await playWord(page, [
      { tile: 0, row: 0, col: 0 },  // Disconnected
      { tile: 1, row: 0, col: 1 }
    ]);

    await page.click('#submit-word');
    await expect(page.locator('#error-modal')).toBeVisible();

    // Use retry
    await page.click('#retry-button');
    await expect(page.locator('#retries-remaining')).toContainText('9');

    // Tiles should be returned to rack
    const rackTiles = await page.locator('#tile-rack .tile').count();
    expect(rackTiles).toBe(7);
  });

  test('should persist game state on refresh', async ({ page }) => {
    // Play some tiles
    await playWord(page, [
      { tile: 0, row: 8, col: 7 },
      { tile: 1, row: 8, col: 8 }
    ]);

    const score = await page.locator('#current-score').textContent();

    // Refresh page
    await page.reload();
    await page.waitForSelector('#game-board');

    // Verify state restored
    await expect(page.locator('#current-score')).toHaveText(score);
    const placedTiles = await page.locator('.board-cell .tile').count();
    expect(placedTiles).toBeGreaterThan(0);
  });

  test('should show high scores after game', async ({ page }) => {
    // Complete game quickly for testing
    await completeGameQuickly(page);

    // Enter name for high score
    await page.fill('#player-name', 'TESTPLAY');
    await page.click('#submit-score');

    // Verify high score appears
    await expect(page.locator('.high-score-entry'))
      .toContainText('TESTPLAY');
  });
});

test.describe('Feature Tests', () => {
  test('shuffle rack functionality', async ({ page }) => {
    await page.goto('http://localhost:8085');

    const getLetterOrder = async () => {
      return await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.tile-letter'))
          .map(el => el.textContent);
      });
    };

    const initialOrder = await getLetterOrder();

    await page.click('#shuffle-button');

    const newOrder = await getLetterOrder();

    // Letters same but order potentially different
    expect(newOrder.sort()).toEqual(initialOrder.sort());
  });

  test('drag and drop tile placement', async ({ page }) => {
    await page.goto('http://localhost:8085');

    const tile = await page.locator('.tile').first();
    const targetCell = await page.locator('[data-row="8"][data-col="7"]');

    await tile.dragTo(targetCell);

    // Verify tile placed
    await expect(targetCell.locator('.tile')).toBeVisible();
  });

  test('keyboard navigation', async ({ page }) => {
    await page.goto('http://localhost:8085');

    // Select tile with number key
    await page.keyboard.press('1');
    await expect(page.locator('.tile').first()).toHaveClass(/selected/);

    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');

    // Place with Enter
    await page.keyboard.press('Enter');

    // Verify placement
    const placedTiles = await page.locator('.board-cell .tile').count();
    expect(placedTiles).toBeGreaterThan(0);
  });

  test('theme toggle', async ({ page }) => {
    await page.goto('http://localhost:8085');

    // Check initial theme
    const initialTheme = await page.evaluate(() =>
      document.body.dataset.theme
    );

    await page.click('#theme-toggle');

    // Verify theme changed
    const newTheme = await page.evaluate(() =>
      document.body.dataset.theme
    );

    expect(newTheme).not.toBe(initialTheme);
  });
});

// Helper functions
async function playWord(page, placements) {
  for (const { tile, row, col } of placements) {
    const tileElement = await page.locator('.tile').nth(tile);
    await tileElement.click();

    const cell = await page.locator(`[data-row="${row}"][data-col="${col}"]`);
    await cell.click();
  }
}

async function playValidWord(page) {
  // Find valid placement programmatically
  const validPlacement = await page.evaluate(() => {
    // Game logic to find valid word placement
    return findValidWordPlacement();
  });

  await playWord(page, validPlacement);
}

async function completeGameQuickly(page) {
  // Fast forward through 5 turns for testing
  for (let turn = 1; turn <= 5; turn++) {
    await page.evaluate(() => {
      // Directly manipulate game state for speed
      window.gameController.autoPlayTurn();
    });
  }
}
```

## 4. Performance Testing

### Performance Benchmarks

```javascript
// performance/benchmarks.js
describe('Performance Benchmarks', () => {
  const performanceThresholds = {
    tilePlacement: 50,      // ms
    wordValidation: 100,    // ms
    boardRender: 16,        // ms (60fps)
    stateUpdate: 10,        // ms
    shuffleRack: 50,        // ms
  };

  test('tile placement should be under 50ms', () => {
    const board = createLargeBoard();
    const measurements = [];

    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      placeTile(board, { letter: 'A' }, i % 15, Math.floor(i / 15));
      const duration = performance.now() - start;
      measurements.push(duration);
    }

    const average = measurements.reduce((a, b) => a + b) / measurements.length;
    const p95 = measurements.sort()[Math.floor(measurements.length * 0.95)];

    expect(average).toBeLessThan(performanceThresholds.tilePlacement);
    expect(p95).toBeLessThan(performanceThresholds.tilePlacement * 2);
  });

  test('word validation should be fast', () => {
    const dictionary = loadFullDictionary(); // 170k+ words
    const testWords = generateTestWords(1000);

    const start = performance.now();
    testWords.forEach(word => validateWord(word, dictionary));
    const duration = performance.now() - start;

    const perWord = duration / testWords.length;
    expect(perWord).toBeLessThan(performanceThresholds.wordValidation / 100);
  });

  test('board render should maintain 60fps', () => {
    const board = createComplexBoard();
    const measurements = [];

    for (let frame = 0; frame < 60; frame++) {
      const start = performance.now();
      renderBoard(board);
      const duration = performance.now() - start;
      measurements.push(duration);
    }

    const slowFrames = measurements.filter(d =>
      d > performanceThresholds.boardRender
    );

    // Less than 5% of frames should be slow
    expect(slowFrames.length).toBeLessThan(3);
  });

  test('state updates should be efficient', () => {
    const store = createStore();
    const measurements = [];

    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      store.dispatch({ type: 'UPDATE_SCORE', payload: i });
      const duration = performance.now() - start;
      measurements.push(duration);
    }

    const average = measurements.reduce((a, b) => a + b) / measurements.length;
    expect(average).toBeLessThan(performanceThresholds.stateUpdate);
  });
});

// Memory leak detection
describe('Memory Leak Detection', () => {
  test('should not leak memory on repeated tile placement', () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;

    for (let i = 0; i < 10000; i++) {
      const tile = createTile();
      const board = createBoard();
      placeTile(board, tile, 7, 7);
      removeTile(board, 7, 7);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // Allow for some memory growth but not excessive
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
  });

  test('should clean up event listeners', () => {
    const container = document.createElement('div');

    for (let i = 0; i < 100; i++) {
      const game = new GameController(container);
      game.initialize();
      game.destroy();
    }

    // Check that event listeners are removed
    const listeners = getEventListeners(container);
    expect(listeners.click?.length || 0).toBe(0);
  });
});
```

## 5. Accessibility Testing

### WCAG Compliance Tests

```javascript
// accessibility/a11y.test.js
const { test, expect } = require('@playwright/test');
const { injectAxe, checkA11y } = require('axe-playwright');

test.describe('Accessibility', () => {
  test('should meet WCAG AA standards', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await injectAxe(page);

    const results = await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true
      }
    });

    expect(results.violations).toHaveLength(0);
  });

  test('keyboard navigation should work throughout', async ({ page }) => {
    await page.goto('http://localhost:8085');

    // Tab through all interactive elements
    const interactiveElements = [
      '#tile-rack .tile',
      '#submit-word',
      '#shuffle-button',
      '#recall-button',
      '#undo-button',
      '#theme-toggle'
    ];

    for (const selector of interactiveElements) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() =>
        document.activeElement.matches(selector)
      );
      expect(focused).toBe(true);
    }
  });

  test('screen reader announcements', async ({ page }) => {
    await page.goto('http://localhost:8085');

    // Check for ARIA labels
    const submitButton = await page.locator('#submit-word');
    expect(await submitButton.getAttribute('aria-label')).toBeTruthy();

    // Check for live regions
    const scoreRegion = await page.locator('#current-score');
    expect(await scoreRegion.getAttribute('aria-live')).toBe('polite');

    // Verify announcements on actions
    await page.evaluate(() => {
      window.announcementLog = [];
      const originalAnnounce = window.announceToScreenReader;
      window.announceToScreenReader = (text) => {
        window.announcementLog.push(text);
        originalAnnounce(text);
      };
    });

    // Place a tile
    await page.click('.tile:first-child');
    await page.click('[data-row="8"][data-col="7"]');

    const announcements = await page.evaluate(() => window.announcementLog);
    expect(announcements).toContain('Tile placed at row 8, column 7');
  });

  test('color contrast ratios', async ({ page }) => {
    await page.goto('http://localhost:8085');

    const contrastIssues = await page.evaluate(() => {
      const issues = [];
      const elements = document.querySelectorAll('*');

      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const bg = styles.backgroundColor;
        const fg = styles.color;

        if (bg !== 'rgba(0, 0, 0, 0)' && fg) {
          const ratio = getContrastRatio(bg, fg);
          if (ratio < 4.5) { // WCAG AA standard
            issues.push({
              element: el.tagName,
              ratio,
              bg,
              fg
            });
          }
        }
      });

      return issues;
    });

    expect(contrastIssues).toHaveLength(0);
  });

  test('focus indicators visible', async ({ page }) => {
    await page.goto('http://localhost:8085');

    const elements = await page.$$('.tile, button, [role="button"]');

    for (const element of elements) {
      await element.focus();

      const hasOutline = await element.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.outlineWidth !== '0px' ||
               styles.boxShadow !== 'none';
      });

      expect(hasOutline).toBe(true);
    }
  });
});
```

## 6. Visual Regression Testing

### Percy/BackstopJS Configuration

```javascript
// visualRegression/config.js
module.exports = {
  scenarios: [
    {
      label: 'Game Board - Initial State',
      url: 'http://localhost:8085',
      selectors: ['#game-board'],
      delay: 1000
    },
    {
      label: 'Tile Rack',
      url: 'http://localhost:8085',
      selectors: ['#tile-rack'],
      delay: 500
    },
    {
      label: 'Tile Selected State',
      url: 'http://localhost:8085',
      clickSelector: '.tile:first-child',
      selectors: ['body'],
      delay: 500
    },
    {
      label: 'Valid Placements Highlighted',
      url: 'http://localhost:8085',
      onReady: async (page) => {
        await page.click('.tile:first-child');
      },
      selectors: ['#game-board'],
      delay: 500
    },
    {
      label: 'Dark Theme',
      url: 'http://localhost:8085',
      clickSelector: '#theme-toggle',
      selectors: ['body'],
      delay: 500
    },
    {
      label: 'Error Modal',
      url: 'http://localhost:8085',
      onReady: async (page) => {
        await page.evaluate(() => {
          showError('Test error message');
        });
      },
      selectors: ['#error-modal'],
      delay: 500
    }
  ],
  viewports: [
    { width: 320, height: 568 },  // iPhone SE
    { width: 768, height: 1024 }, // iPad
    { width: 1920, height: 1080 } // Desktop
  ]
};
```

## 7. Test Data Management

### Test Data Factories

```javascript
// testData/factories.js
class TestDataFactory {
  static createBoard(options = {}) {
    const {
      size = 15,
      startingWord = null,
      placedTiles = []
    } = options;

    const board = Array(size).fill(null).map(() =>
      Array(size).fill(null)
    );

    if (startingWord) {
      this.placeWordOnBoard(board, startingWord);
    }

    placedTiles.forEach(({ tile, row, col }) => {
      board[row][col] = tile;
    });

    return board;
  }

  static createTile(letter = 'A', value = null) {
    const defaultValues = {
      A: 1, E: 1, I: 1, O: 1, U: 1,
      L: 1, N: 1, S: 1, T: 1, R: 1,
      D: 2, G: 2, B: 3, C: 3, M: 3,
      P: 3, F: 4, H: 4, V: 4, W: 4,
      Y: 4, K: 5, J: 8, X: 8,
      Q: 10, Z: 10
    };

    return {
      letter,
      value: value || defaultValues[letter] || 1,
      id: Math.random().toString(36).substr(2, 9)
    };
  }

  static createRack(letters = 'ABCDEFG') {
    return letters.split('').map(letter => this.createTile(letter));
  }

  static createGameState(overrides = {}) {
    return {
      game: {
        id: 'test-game',
        seed: '20250120',
        status: 'active',
        ...overrides.game
      },
      board: this.createBoard(overrides.board),
      player: {
        rack: this.createRack(),
        score: 0,
        turnsCompleted: 0,
        ...overrides.player
      },
      currentTurn: {
        placedTiles: [],
        wordsFormed: [],
        ...overrides.currentTurn
      },
      ui: {
        selectedTile: null,
        ...overrides.ui
      }
    };
  }

  static generateValidWords(count = 10) {
    const validWords = [
      'CAT', 'DOG', 'BIRD', 'FISH', 'TREE',
      'HOUSE', 'WATER', 'LIGHT', 'SOUND', 'EARTH'
    ];

    return validWords.slice(0, count);
  }

  static generateInvalidWords(count = 10) {
    const invalid = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let i = 0; i < count; i++) {
      let word = '';
      const length = Math.floor(Math.random() * 5) + 3;

      for (let j = 0; j < length; j++) {
        word += chars[Math.floor(Math.random() * chars.length)];
      }

      invalid.push(word);
    }

    return invalid;
  }
}
```

## 8. Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.30.0-focal

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'

      - name: Install dependencies
        run: npm ci

      - name: Start application
        run: |
          npm run build
          npm run start &
          npx wait-on http://localhost:8085

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: playwright-report
          path: playwright-report/

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'

      - name: Install dependencies
        run: npm ci

      - name: Run performance tests
        run: npm run test:performance

      - name: Upload performance results
        uses: actions/upload-artifact@v2
        with:
          name: performance-report
          path: performance-report/

  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'

      - name: Install dependencies
        run: npm ci

      - name: Start application
        run: |
          npm run build
          npm run start &
          npx wait-on http://localhost:8085

      - name: Run accessibility tests
        run: npm run test:a11y

  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'

      - name: Install dependencies
        run: npm ci

      - name: Start application
        run: |
          npm run build
          npm run start &
          npx wait-on http://localhost:8085

      - name: Run visual tests
        run: npm run test:visual

      - name: Upload visual diffs
        if: failure()
        uses: actions/upload-artifact@v2
        with:
          name: visual-diffs
          path: backstop_data/diff/
```

## 9. Test Coverage Requirements

```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/core/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/dist/',
    '*.config.js'
  ]
};
```

## Summary

This testing methodology ensures:

1. **Comprehensive Coverage**: Unit, integration, E2E, performance, accessibility, and visual tests
2. **Fast Feedback**: Unit tests run quickly, integration tests catch issues early
3. **Reliability**: E2E tests verify critical user journeys work
4. **Performance**: Benchmarks ensure the game stays fast
5. **Accessibility**: WCAG compliance for all users
6. **Visual Consistency**: Catch unintended UI changes
7. **Continuous Quality**: Automated CI/CD pipeline
8. **Maintainability**: Clear test structure and data factories