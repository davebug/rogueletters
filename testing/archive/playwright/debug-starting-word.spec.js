// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Debug Starting Word', () => {
  test('check why starting word is not appearing', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', err => console.log('Page error:', err.message));

    await page.goto('http://localhost:8085/?seed=20250120');

    // Wait a bit for the game to load
    await page.waitForTimeout(2000);

    // Check if API call was made
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/cgi-bin/letters.py?seed=20250120');
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    console.log('API Response:', JSON.stringify(apiResponse, null, 2));

    // Check game state
    const gameState = await page.evaluate(() => {
      return window.gameState || null;
    });

    console.log('Game State:', JSON.stringify(gameState, null, 2));

    // Check if starting word cells exist
    const occupiedCells = await page.locator('.board-cell.occupied').count();
    console.log('Occupied cells:', occupiedCells);

    // Check for tiles in specific positions
    for (let col = 0; col < 15; col++) {
      const cellContent = await page.locator(`[data-row="7"][data-col="${col}"] .tile`).count();
      if (cellContent > 0) {
        const letter = await page.locator(`[data-row="7"][data-col="${col}"] .tile-letter`).textContent();
        console.log(`Cell [7,${col}]: ${letter}`);
      }
    }

    // Check if board element exists
    const boardExists = await page.locator('#game-board').isVisible();
    console.log('Board exists:', boardExists);

    const boardCellCount = await page.locator('.board-cell').count();
    console.log('Board cell count:', boardCellCount);
  });
});