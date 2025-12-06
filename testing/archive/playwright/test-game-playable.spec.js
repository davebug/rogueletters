const { test, expect } = require('@playwright/test');

test.describe('WikiLetters Game Playability Tests', () => {

  test('Mobile view - Game is playable with debug mode', async ({ page }) => {
    // Set mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to letters.wiki with debug mode
    await page.goto('https://letters.wiki?debug=1');
    await page.waitForTimeout(2000);

    // Enable debug mode
    const debugToggle = page.locator('#debug-mode-toggle');
    await debugToggle.check();

    // Take screenshot of initial mobile state
    await page.screenshot({
      path: 'mobile-initial-state.png',
      fullPage: false
    });

    // Verify essential elements are visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#dateDisplay')).toBeVisible();
    await expect(page.locator('#game-board')).toBeVisible();
    await expect(page.locator('#tile-rack')).toBeVisible();

    // Check that tiles are in the rack
    const rackTiles = page.locator('#tile-rack .tile');
    const tileCount = await rackTiles.count();
    console.log(`Mobile: Found ${tileCount} tiles in rack`);
    expect(tileCount).toBeGreaterThan(0);

    // Try to drag a tile to the board
    const firstTile = rackTiles.first();
    const targetCell = page.locator('.board-cell').nth(112); // Center of board (7,7)

    await firstTile.dragTo(targetCell);
    await page.waitForTimeout(500);

    // Verify tile was placed
    const placedTile = page.locator('.board-cell').nth(112).locator('.tile');
    await expect(placedTile).toBeVisible();

    // Check shuffle button is visible and clickable
    const shuffleBtn = page.locator('#shuffle-rack');
    await expect(shuffleBtn).toBeVisible();

    // Take screenshot after tile placement
    await page.screenshot({
      path: 'mobile-tile-placed.png',
      fullPage: false
    });

    console.log('Mobile view test completed successfully');
  });

  test('Desktop view - Game is playable with debug mode', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to letters.wiki with debug mode
    await page.goto('https://letters.wiki?debug=1');
    await page.waitForTimeout(2000);

    // Enable debug mode
    const debugToggle = page.locator('#debug-mode-toggle');
    await debugToggle.check();

    // Take screenshot of initial desktop state
    await page.screenshot({
      path: 'desktop-initial-state.png',
      fullPage: false
    });

    // Verify essential elements are visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#dateDisplay')).toBeVisible();
    await expect(page.locator('#game-board')).toBeVisible();
    await expect(page.locator('#tile-rack')).toBeVisible();

    // Check rack dimensions
    const rackBox = await page.locator('#tile-rack').boundingBox();
    console.log(`Desktop rack dimensions: ${rackBox.width}x${rackBox.height}`);

    // Check that tiles are in the rack and are square
    const rackTiles = page.locator('#tile-rack .tile');
    const tileCount = await rackTiles.count();
    console.log(`Desktop: Found ${tileCount} tiles in rack`);
    expect(tileCount).toBeGreaterThan(0);

    // Check first tile dimensions
    const firstTileBox = await rackTiles.first().boundingBox();
    console.log(`Tile dimensions: ${firstTileBox.width}x${firstTileBox.height}`);
    expect(Math.abs(firstTileBox.width - firstTileBox.height)).toBeLessThan(2); // Should be square

    // Try to place multiple tiles to form a word
    const tiles = await rackTiles.all();
    const boardCells = page.locator('.board-cell');

    // Place first tile at center (7,7)
    await rackTiles.nth(0).dragTo(boardCells.nth(112));
    await page.waitForTimeout(300);

    // Place second tile to the right (7,8)
    await rackTiles.nth(0).dragTo(boardCells.nth(113));
    await page.waitForTimeout(300);

    // Check shuffle and recall buttons position
    const shuffleBtn = page.locator('#shuffle-rack');
    const recallBtn = page.locator('#recall-tiles');

    await expect(shuffleBtn).toBeVisible();
    const shuffleBox = await shuffleBtn.boundingBox();
    const rackRight = rackBox.x + rackBox.width;
    console.log(`Shuffle button distance from rack: ${shuffleBox.x - rackRight}px`);

    // Take screenshot after tile placement
    await page.screenshot({
      path: 'desktop-tiles-placed.png',
      fullPage: false
    });

    // Test recall button if visible
    const recallVisible = await recallBtn.isVisible();
    if (recallVisible) {
      await recallBtn.click();
      await page.waitForTimeout(500);
      console.log('Recall button clicked');
    }

    console.log('Desktop view test completed successfully');
  });

  test('Check CSS version and rack layout', async ({ page }) => {
    await page.goto('https://letters.wiki');

    // Check CSS version
    const cssLink = await page.locator('link[rel="stylesheet"]').getAttribute('href');
    console.log('CSS link:', cssLink);
    expect(cssLink).toContain('v=');

    // Check computed styles for rack
    const rackStyles = await page.locator('.tile-rack').evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        width: styles.width,
        minWidth: styles.minWidth,
        padding: styles.padding,
        gap: styles.gap
      };
    });

    console.log('Rack styles:', rackStyles);
  });
});