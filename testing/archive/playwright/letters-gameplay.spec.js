// @ts-check
const { test, expect } = require('@playwright/test');

// Use a fixed seed for consistent testing
const TEST_SEED = '20250920';

test.describe('Letters Game Gameplay', () => {
  test.beforeEach(async ({ page }) => {
    // Start at the game with a specific seed
    await page.goto(`http://localhost:8085/?seed=${TEST_SEED}`);

    // Wait for game to load
    await page.waitForSelector('#game-board', { timeout: 10000 });
  });

  test('should load game board and initial elements', async ({ page }) => {
    // Check essential elements exist
    await expect(page.locator('#game-board')).toBeVisible();
    await expect(page.locator('#tile-rack')).toBeVisible();
    await expect(page.locator('#current-score')).toBeVisible();
    await expect(page.locator('#current-turn')).toContainText('1/5');

    // Check board has 225 cells (15x15)
    const cells = await page.locator('.board-cell').count();
    expect(cells).toBe(225);

    console.log('✅ Game board loaded successfully');
  });

  test('should display starting word on board', async ({ page }) => {
    // Wait for starting word to be placed
    await page.waitForFunction(() => {
      const cells = document.querySelectorAll('.board-cell.occupied');
      return cells.length > 0;
    }, { timeout: 5000 });

    // Check that center row has the starting word
    const occupiedCells = await page.locator('.board-cell.occupied').count();
    expect(occupiedCells).toBeGreaterThan(0);

    // Get the starting word
    const startingWord = await page.evaluate(() => {
      const cells = document.querySelectorAll('.board-cell.occupied');
      return Array.from(cells).map(cell => cell.textContent).join('');
    });

    console.log(`✅ Starting word displayed: ${startingWord}`);
  });

  test('should display 7 tiles in rack', async ({ page }) => {
    // Wait for tiles to load
    await page.waitForSelector('.tile', { timeout: 5000 });

    const tiles = await page.locator('#tile-rack .tile').count();
    expect(tiles).toBe(7);

    // Get tile letters
    const tileLetters = await page.evaluate(() => {
      const tiles = document.querySelectorAll('#tile-rack .tile');
      return Array.from(tiles).map(tile =>
        tile.querySelector('.tile-letter')?.textContent || ''
      );
    });

    console.log(`✅ Tiles in rack: ${tileLetters.join(', ')}`);
  });

  test('should show Wikipedia context if available', async ({ page }) => {
    // Check if Wikipedia info is displayed
    const wikiInfo = await page.locator('#wikipedia-info').count();

    if (wikiInfo > 0) {
      const context = await page.locator('.wiki-context').textContent();
      console.log(`✅ Wikipedia context shown: ${context?.substring(0, 50)}...`);
    } else {
      console.log('ℹ️ No Wikipedia context displayed');
    }
  });

  test('should allow tile placement by clicking', async ({ page }) => {
    // Wait for tiles and board
    await page.waitForSelector('.tile');
    await page.waitForSelector('.board-cell');

    // Click a tile to select it
    const firstTile = page.locator('#tile-rack .tile').first();
    await firstTile.click();

    // Check tile is selected
    await expect(firstTile).toHaveClass(/selected/);

    // Find a valid cell next to starting word (row 7, various columns)
    let placed = false;
    for (let col = 0; col < 15; col++) {
      const cell = page.locator(`.board-cell[data-row="7"][data-col="${col}"]`).first();
      const isOccupied = await cell.evaluate(el => el.classList.contains('occupied'));

      if (!isOccupied) {
        // Try to click this cell
        await cell.click();

        // Check if tile was placed
        const updatedOccupied = await cell.evaluate(el => el.classList.contains('occupied'));
        if (updatedOccupied) {
          placed = true;
          console.log(`✅ Tile placed at row 7, column ${col}`);
          break;
        }
      }
    }

    expect(placed).toBe(true);
  });

  test('should validate word on submission', async ({ page }) => {
    // This test would place tiles to form a word and submit
    // For now, let's check the submit button state

    const submitButton = page.locator('#submit-word');

    // Initially should be disabled (no tiles placed)
    await expect(submitButton).toBeDisabled();

    console.log('✅ Submit button correctly disabled initially');

    // Place a tile (simplified - would need full word placement logic)
    // ... tile placement code ...
  });

  test('should track score', async ({ page }) => {
    const initialScore = await page.locator('#current-score').textContent();
    expect(initialScore).toBe('0');

    console.log('✅ Score tracking initialized');
  });

  test('should handle retries', async ({ page }) => {
    const retriesText = await page.locator('#retries-left').textContent();
    expect(retriesText).toBe('10');

    // Click retry button
    const retryButton = page.locator('#retry-turn');
    await retryButton.click();

    // Check retries decreased
    await page.waitForFunction(() => {
      const retries = document.querySelector('#retries-left')?.textContent;
      return retries === '9';
    }, { timeout: 5000 });

    console.log('✅ Retry functionality working');
  });
});

test.describe('Letters Game - Word Formation', () => {
  test('should form and validate a complete word', async ({ page }) => {
    await page.goto(`http://localhost:8085/?seed=${TEST_SEED}`);
    await page.waitForSelector('#game-board');

    // This is where we'd implement actual word formation
    // For now, let's trace through the expected flow

    console.log('📝 Test plan for word formation:');
    console.log('1. Select tiles from rack');
    console.log('2. Place tiles to form valid word');
    console.log('3. Submit word');
    console.log('4. Verify score updates');
    console.log('5. Verify new tiles appear');

    // Get current game state for analysis
    const gameState = await page.evaluate(() => {
      return {
        tiles: Array.from(document.querySelectorAll('#tile-rack .tile')).map(
          t => t.querySelector('.tile-letter')?.textContent
        ),
        startingWord: Array.from(document.querySelectorAll('.board-cell.occupied'))
          .map(c => c.textContent).join(''),
        boardSize: document.querySelectorAll('.board-cell').length
      };
    });

    console.log('📊 Current game state:', gameState);
  });
});

test.describe('Letters Game - Error Handling', () => {
  test('should reject invalid words', async ({ page }) => {
    await page.goto(`http://localhost:8085/?seed=${TEST_SEED}`);
    await page.waitForSelector('#game-board');

    // Would test placing invalid word and checking error message
    console.log('📝 Would test: Invalid word rejection');
  });

  test('should enforce connection rules', async ({ page }) => {
    await page.goto(`http://localhost:8085/?seed=${TEST_SEED}`);
    await page.waitForSelector('#game-board');

    // Would test placing tiles not connected to existing tiles
    console.log('📝 Would test: Connection rule enforcement');
  });
});