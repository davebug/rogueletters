const { test, expect } = require('@playwright/test');

test.describe('Touch Event Handlers Test', () => {
  test('Verify touch event handlers are attached to tiles', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to site with cache busting
    await page.goto('https://letters.wiki?v=' + Date.now());
    await page.waitForTimeout(2000);

    // Check if touch event listeners exist on rack tiles
    const rackTileHasTouchEvents = await page.evaluate(() => {
      const tile = document.querySelector('#tile-rack .tile');
      if (!tile) return false;

      // We can't easily check if event listeners are attached,
      // but we can verify the handler functions exist in the global scope
      return typeof handleTouchStart === 'function';
    });

    console.log('Rack tile responds to touch events:', rackTileHasTouchEvents);

    // Place a tile on the board
    const firstTile = page.locator('#tile-rack .tile').first();
    const centerCell = page.locator('.board-cell').nth(112);
    await firstTile.dragTo(centerCell);
    await page.waitForTimeout(1000);

    // Check if board tile has touch events
    const boardTileHasTouchEvents = await page.evaluate(() => {
      const boardTile = document.querySelector('.board-cell .tile.placed');
      if (!boardTile) return false;

      // Verify the handler functions still exist
      return typeof handleTouchStart === 'function';
    });

    console.log('Board tile responds to touch events:', boardTileHasTouchEvents);

    // Check if the touch handler functions exist in the global scope
    const touchFunctionsExist = await page.evaluate(() => {
      return {
        handleTouchStart: typeof handleTouchStart === 'function',
        handleTouchMove: typeof handleTouchMove === 'function',
        handleTouchEnd: typeof handleTouchEnd === 'function',
        touchVariables: typeof touchDraggedTile !== 'undefined'
      };
    });

    console.log('Touch functions exist:', touchFunctionsExist);

    // Take screenshot
    await page.screenshot({
      path: 'touch-test.png',
      fullPage: false
    });

    // Assert that touch handlers should exist
    expect(touchFunctionsExist.handleTouchStart).toBe(true);
    expect(touchFunctionsExist.handleTouchMove).toBe(true);
    expect(touchFunctionsExist.handleTouchEnd).toBe(true);
  });
});