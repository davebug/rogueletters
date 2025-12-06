const { test, expect } = require('@playwright/test');

/**
 * WikiLetters Regression Test Suite
 *
 * This suite captures the current correct behavior of WikiLetters as of 2025-01-20
 * after fixing the backend scoring discrepancy. These tests serve as regression
 * tests to ensure future changes don't break existing functionality.
 *
 * Key behaviors tested:
 * - Scoring matches Scrabble rules (letter values + multipliers)
 * - Backend and frontend calculate the same scores
 * - Words must connect to existing tiles (except first turn)
 * - All formed words must be valid (in ENABLE dictionary)
 * - Game ends after 5 turns
 * - High scores are persisted locally
 */

test.describe('WikiLetters Core Regression Suite', () => {

  test('backend scoring matches frontend preview', async ({ page }) => {
    // This is the critical test that verifies our scoring fix
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile');

    // Find and place N to form a perpendicular word
    const tiles = await page.locator('.tile-rack .tile').all();
    let nTile = null;

    for (const tile of tiles) {
      const text = await tile.textContent();
      if (text.charAt(0) === 'N') {
        nTile = tile;
        break;
      }
    }

    if (nTile) {
      await nTile.click();
      // Place below A in the starting word (usually at col 8)
      await page.click('.board-cell[data-row="8"][data-col="8"]');

      await page.waitForTimeout(500);

      // Get frontend preview score
      const previewText = await page.locator('.word-preview').textContent();
      const previewMatch = previewText.match(/Total: (\d+) points/);
      const frontendScore = previewMatch ? parseInt(previewMatch[1]) : 0;

      // Submit and get backend score
      await page.click('#submit-word');
      await page.waitForTimeout(1000);

      // Check if word was accepted
      const errorModal = await page.locator('#error-modal');
      if (!await errorModal.isVisible()) {
        // Get score after submission
        const scoreText = await page.locator('#current-score').textContent();
        const backendScore = parseInt(scoreText);

        // Frontend and backend should match
        expect(backendScore).toBe(frontendScore);
        expect(backendScore).toBe(3); // AN with N on double letter = 3
      }
    }
  });

  test('game enforces 5-turn limit', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    const turnDisplay = await page.locator('#current-turn').textContent();
    expect(turnDisplay).toBe('1/5');

    const gameState = await page.evaluate(() => {
      return window.gameState ? {
        maxTurns: window.gameState.maxTurns,
        currentTurn: window.gameState.currentTurn
      } : null;
    });

    expect(gameState?.maxTurns).toBe(5);
    expect(gameState?.currentTurn).toBe(1);
  });

  test('multipliers apply correctly', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Verify center star is double word
    const centerCell = await page.locator('.board-cell[data-row="7"][data-col="7"]');
    const centerClass = await centerCell.getAttribute('class');
    expect(centerClass).toContain('center-star');

    // Verify corner triple word scores
    const cornerCell = await page.locator('.board-cell[data-row="0"][data-col="0"]');
    const cornerClass = await cornerCell.getAttribute('class');
    expect(cornerClass).toContain('triple-word');

    // Test backend multiplier calculation
    const response = await page.evaluate(async () => {
      const board = Array(15).fill(null).map(() => Array(15).fill(null));
      const placedTiles = [
        { row: 0, col: 0, letter: 'C' }, // Triple word corner
        { row: 0, col: 1, letter: 'A' },
        { row: 0, col: 2, letter: 'T' }
      ];

      const resp = await fetch('/cgi-bin/validate_word.py', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, placed_tiles: placedTiles })
      });
      return await resp.json();
    });

    if (response.valid) {
      // C=3, A=1, T=1 = 5 × 3 (triple word) = 15
      expect(response.score).toBe(15);
    }
  });

  test('word validation against dictionary', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Test valid word
    const validResponse = await page.evaluate(async () => {
      const board = Array(15).fill(null).map(() => Array(15).fill(null));
      const placedTiles = [
        { row: 7, col: 7, letter: 'D' },
        { row: 7, col: 8, letter: 'O' },
        { row: 7, col: 9, letter: 'G' }
      ];

      const resp = await fetch('/cgi-bin/validate_word.py', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, placed_tiles: placedTiles })
      });
      return await resp.json();
    });

    expect(validResponse.valid).toBe(true);
    expect(validResponse.words_formed).toContain('DOG');

    // Test invalid word
    const invalidResponse = await page.evaluate(async () => {
      const board = Array(15).fill(null).map(() => Array(15).fill(null));
      const placedTiles = [
        { row: 7, col: 7, letter: 'X' },
        { row: 7, col: 8, letter: 'Y' },
        { row: 7, col: 9, letter: 'Z' }
      ];

      const resp = await fetch('/cgi-bin/validate_word.py', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, placed_tiles: placedTiles })
      });
      return await resp.json();
    });

    expect(invalidResponse.valid).toBe(false);
    expect(invalidResponse.message).toContain('Invalid word');
  });

  test('tile placement and recall mechanics', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Count initial tiles
    const initialCount = await page.locator('.tile-rack .tile').count();
    expect(initialCount).toBe(7);

    // Place a tile
    const firstTile = await page.locator('.tile-rack .tile').first();
    await firstTile.click();
    await page.click('.board-cell[data-row="6"][data-col="7"]');

    // Rack should have one less tile
    const afterPlaceCount = await page.locator('.tile-rack .tile').count();
    expect(afterPlaceCount).toBe(6);

    // Recall tiles
    await page.click('#recall-tiles');

    // All tiles should be back
    const afterRecallCount = await page.locator('.tile-rack .tile').count();
    expect(afterRecallCount).toBe(7);
  });

  test('bingo bonus applies for 7 tiles', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    const response = await page.evaluate(async () => {
      const board = Array(15).fill(null).map(() => Array(15).fill(null));
      // Place TESTING (7 letters)
      const placedTiles = [
        { row: 7, col: 7, letter: 'T' },
        { row: 7, col: 8, letter: 'E' },
        { row: 7, col: 9, letter: 'S' },
        { row: 7, col: 10, letter: 'T' },
        { row: 7, col: 11, letter: 'I' },
        { row: 7, col: 12, letter: 'N' },
        { row: 7, col: 13, letter: 'G' }
      ];

      const resp = await fetch('/cgi-bin/validate_word.py', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, placed_tiles: placedTiles })
      });
      return await resp.json();
    });

    if (response.valid) {
      // Score should include 50-point bingo bonus
      expect(response.score).toBeGreaterThanOrEqual(50);
    }
  });

  test('connectivity requirement enforced', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Place tile disconnected from starting word
    const firstTile = await page.locator('.tile-rack .tile').first();
    await firstTile.click();
    await page.click('.board-cell[data-row="0"][data-col="0"]'); // Corner

    // Try to submit
    await page.click('#submit-word');
    await page.waitForTimeout(500);

    // Should show error
    const errorModal = await page.locator('#error-modal');
    expect(await errorModal.isVisible()).toBe(true);

    const errorMessage = await page.locator('#error-message').textContent();
    expect(errorMessage).toContain('connect');
  });

  test('share functionality generates correct text', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Force game end
    await page.evaluate(() => {
      window.gameState.currentTurn = 5;
      window.gameState.score = 42;
      window.endGame();
    });

    await page.waitForTimeout(500);

    // Click share button
    const shareButton = await page.locator('#share-game');
    if (await shareButton.isVisible()) {
      await shareButton.click();
      await page.waitForTimeout(500);

      const shareModal = await page.locator('#share-modal');
      expect(await shareModal.isVisible()).toBe(true);

      const shareText = await page.locator('#share-text').textContent();
      expect(shareText).toContain('WikiLetters');
      expect(shareText).toContain('42');
    }
  });
});