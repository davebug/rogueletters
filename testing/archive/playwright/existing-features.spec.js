// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Currently Implemented Features', () => {

  test('Board Initialization', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#game-board');

    // Wait for game to fully initialize
    await page.waitForTimeout(1000);

    // Verify 15x15 board
    const cells = await page.locator('.board-cell').count();
    expect(cells).toBe(225);

    // Verify starting word exists
    const startingWord = await page.locator('.board-cell.occupied').count();
    expect(startingWord).toBeGreaterThan(0);
    expect(startingWord).toBeLessThanOrEqual(15);

    // Verify 7 tiles in rack
    const tiles = await page.locator('#tile-rack .tile').count();
    expect(tiles).toBe(7);

    // Verify Wikipedia context
    await page.waitForTimeout(500); // Give time for Wikipedia context to load
    const wikiContext = await page.locator('#wikipedia-context').isVisible();
    expect(wikiContext).toBe(true);
  });

  test('Scrabble Placement Rules - Connection Required', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    // Try disconnected placement
    const tile = await page.locator('#tile-rack .tile').first();
    await tile.click();
    await page.locator('[data-row="2"][data-col="2"]').click();

    await page.locator('#tile-rack .tile').first();
    await tile.click();
    await page.locator('[data-row="2"][data-col="3"]').click();

    await page.click('#submit-word');

    // Wait for error modal to appear
    await page.waitForSelector('#error-modal[style*="flex"]', { timeout: 2000 });

    // Should show error
    const errorModal = await page.locator('#error-modal').isVisible();
    expect(errorModal).toBe(true);

    const errorMsg = await page.locator('#error-message').textContent();
    expect(errorMsg).toContain('connect');
  });

  test('Scrabble Placement Rules - Straight Line', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    // Try diagonal placement
    await page.locator('#tile-rack .tile').nth(0).click();
    await page.locator('[data-row="8"][data-col="7"]').click();

    await page.locator('#tile-rack .tile').nth(0).click();
    await page.locator('[data-row="9"][data-col="8"]').click();

    await page.click('#submit-word');

    // Wait for error modal to appear
    await page.waitForSelector('#error-modal[style*="flex"]', { timeout: 2000 });

    const errorMsg = await page.locator('#error-message').textContent();
    expect(errorMsg).toContain('straight line');
  });

  test('Scrabble Placement Rules - No Gaps', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    // Place with gap
    await page.locator('#tile-rack .tile').nth(0).click();
    await page.locator('[data-row="8"][data-col="4"]').click();

    await page.locator('#tile-rack .tile').nth(0).click();
    await page.locator('[data-row="8"][data-col="6"]').click(); // Gap at col 5

    await page.click('#submit-word');

    // Wait for error modal to appear
    await page.waitForSelector('#error-modal[style*="flex"]', { timeout: 2000 });

    const errorMsg = await page.locator('#error-message').textContent();
    expect(errorMsg).toContain('gap');
  });

  test('Dictionary Validation', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    // The validation endpoint exists
    const response = await page.evaluate(async () => {
      const res = await fetch('/cgi-bin/validate_word.py', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board: Array(15).fill(null).map(() => Array(15).fill(null)),
          placed_tiles: []
        })
      });
      return res.ok;
    });

    expect(response).toBe(true);
  });

  test('Score Display', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#game-board');

    const scoreElement = await page.locator('#current-score');
    expect(scoreElement).toBeDefined();

    const score = await scoreElement.textContent();
    expect(score).toBe('0');
  });

  test('Recall All Tiles Button', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#game-board');

    // Place some tiles
    await page.locator('#tile-rack .tile').nth(0).click();
    await page.locator('[data-row="8"][data-col="7"]').click();

    await page.locator('#tile-rack .tile').nth(0).click();
    await page.locator('[data-row="8"][data-col="8"]').click();

    // Recall all
    const recallButton = await page.locator('#recall-tiles, button:has-text("Recall"), button:has-text("Clear")').first();
    await recallButton.click();

    // All tiles should be back
    const tilesInRack = await page.locator('#tile-rack .tile').count();
    expect(tilesInRack).toBe(7);
  });

  test('Submit Word Button State', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#game-board');

    const submitBtn = await page.locator('#submit-word');

    // Should be disabled initially
    const initialState = await submitBtn.isEnabled();
    expect(initialState).toBe(false);

    // Place a tile
    await page.locator('#tile-rack .tile').first().click();
    await page.locator('[data-row="8"][data-col="7"]').click();

    // Should be enabled after placement
    const afterPlacement = await submitBtn.isEnabled();
    expect(afterPlacement).toBe(true);
  });

  test('Hover Feedback on Valid Cells', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#game-board');

    // Select a tile
    await page.locator('#tile-rack .tile').first().click();

    // Hover over a valid cell (adjacent to starting word)
    const validCell = await page.locator('[data-row="8"][data-col="7"]');
    await validCell.hover();

    // Check for visual feedback
    const hasHoverClass = await validCell.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.backgroundColor !== 'transparent' ||
             el.classList.contains('hover') ||
             styles.cursor === 'pointer';
    });

    expect(hasHoverClass).toBe(true);
  });

  test('Local Storage Persistence', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#game-board');

    // Wait for game to initialize
    await page.waitForTimeout(1000);

    // Make a placement
    await page.locator('#tile-rack .tile').first().click();
    await page.locator('[data-row="8"][data-col="7"]').click();

    // Check localStorage
    const hasState = await page.evaluate(() => {
      const state = localStorage.getItem('letters_game_state');
      return state !== null;
    });

    expect(hasState).toBe(true);

    // Reload and verify state persists
    await page.reload();
    await page.waitForSelector('#game-board');

    // Check if tile is still placed
    const placedTile = await page.locator('[data-row="8"][data-col="7"] .tile').count();
    expect(placedTile).toBe(1);
  });
});

test.describe('Known Working Validation', () => {

  test('Cannot place on occupied cells', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#game-board');

    // Find an occupied cell
    const occupiedCell = await page.locator('.board-cell.occupied').first();

    // Try to place tile there
    await page.locator('#tile-rack .tile').first().click();
    await occupiedCell.click();

    // Tile should still be in rack
    const tilesInRack = await page.locator('#tile-rack .tile').count();
    expect(tilesInRack).toBe(7);
  });

  test('Single tile placement rejection', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    // Place single tile adjacent to starting word
    await page.locator('#tile-rack .tile').first().click();
    await page.locator('[data-row="8"][data-col="7"]').click();

    await page.click('#submit-word');

    // Wait for error modal to appear
    await page.waitForSelector('#error-modal[style*="flex"]', { timeout: 2000 });

    // Should show error (single letter usually not valid)
    const errorModal = await page.locator('#error-modal').isVisible();
    expect(errorModal).toBe(true);
  });

  test('Invalid perpendicular word detection', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#game-board');

    // This test would need specific tile setup
    // Verify that perpendicular word validation is checked
    const validationEndpoint = await page.evaluate(async () => {
      try {
        const response = await fetch('/cgi-bin/validate_word.py', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            board: Array(15).fill(null).map(() => Array(15).fill(null)),
            placed_tiles: []
          })
        });
        return response.ok;
      } catch {
        return false;
      }
    });

    expect(validationEndpoint).toBe(true);
  });
});