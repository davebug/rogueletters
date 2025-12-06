// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Debug LocalStorage', () => {
  test('check localStorage save and restore', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => console.log('Browser console:', msg.text()));

    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForTimeout(1500);

    // Place a tile
    console.log('Placing tile...');
    await page.locator('#tile-rack .tile').first().click();
    await page.locator('[data-row="8"][data-col="7"]').click();

    // Check localStorage was saved
    const savedState = await page.evaluate(() => {
      return localStorage.getItem('letters_game_state');
    });

    console.log('Saved state exists:', savedState !== null);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      console.log('Saved board[8][7]:', parsed.board[8][7]);
      console.log('Saved placedTiles:', parsed.placedTiles);
    }

    // Reload page
    console.log('Reloading page...');
    await page.reload();
    await page.waitForTimeout(1500);

    // Check if game state was loaded
    const loadedStateExists = await page.evaluate(() => {
      const state = localStorage.getItem('letters_game_state');
      if (state) {
        const parsed = JSON.parse(state);
        return {
          exists: true,
          currentTurn: parsed.currentTurn,
          board87: parsed.board && parsed.board[8] ? parsed.board[8][7] : null,
          placedTiles: parsed.placedTiles
        };
      }
      return { exists: false };
    });

    console.log('Loaded state exists:', loadedStateExists.exists);
    if (loadedStateExists.exists) {
      console.log('Loaded state currentTurn:', loadedStateExists.currentTurn);
      console.log('Loaded board[8][7]:', loadedStateExists.board87);
      console.log('Loaded placedTiles:', loadedStateExists.placedTiles);
    }

    // Check if tile is visually placed
    const tileVisible = await page.locator('[data-row="8"][data-col="7"] .tile').count();
    console.log('Tile visible on board:', tileVisible);

    // Check the cell content directly
    const cellContent = await page.locator('[data-row="8"][data-col="7"]').textContent();
    console.log('Cell content:', cellContent);
  });
});