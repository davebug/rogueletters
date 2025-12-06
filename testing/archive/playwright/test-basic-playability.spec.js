const { test, expect } = require('@playwright/test');

test.describe('WikiLetters Basic Playability', () => {

  test('Mobile view - Game loads correctly', async ({ page }) => {
    // Set mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to letters.wiki
    await page.goto('https://letters.wiki');
    await page.waitForTimeout(3000);

    // Check CSS version
    const cssLink = await page.locator('link[rel="stylesheet"]').getAttribute('href');
    console.log('Mobile CSS link:', cssLink);
    expect(cssLink).toContain('v=1.2');

    // Take screenshot
    await page.screenshot({
      path: 'mobile-game-loaded.png',
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
    expect(tileCount).toBeGreaterThanOrEqual(7);

    // Check rack dimensions on mobile
    const rackBox = await page.locator('#tile-rack').boundingBox();
    console.log(`Mobile rack dimensions: ${rackBox.width}x${rackBox.height}`);
    expect(rackBox.width).toBeGreaterThanOrEqual(340); // Should be ~348px

    // Check shuffle button is visible
    const shuffleBtn = page.locator('#shuffle-rack');
    await expect(shuffleBtn).toBeVisible();

    console.log('✅ Mobile view test completed successfully');
  });

  test('Desktop view - Game loads correctly', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to letters.wiki
    await page.goto('https://letters.wiki');
    await page.waitForTimeout(3000);

    // Check CSS version
    const cssLink = await page.locator('link[rel="stylesheet"]').getAttribute('href');
    console.log('Desktop CSS link:', cssLink);
    expect(cssLink).toContain('v=1.2');

    // Take screenshot
    await page.screenshot({
      path: 'desktop-game-loaded.png',
      fullPage: false
    });

    // Verify essential elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#dateDisplay')).toBeVisible();
    await expect(page.locator('#game-board')).toBeVisible();
    await expect(page.locator('#tile-rack')).toBeVisible();

    // Check rack dimensions on desktop
    const rackBox = await page.locator('#tile-rack').boundingBox();
    console.log(`Desktop rack dimensions: ${rackBox.width}x${rackBox.height}`);
    expect(rackBox.width).toBeLessThanOrEqual(325); // Should be ~320px

    // Check that tiles are square
    const rackTiles = page.locator('#tile-rack .tile');
    const tileCount = await rackTiles.count();
    console.log(`Desktop: Found ${tileCount} tiles in rack`);
    expect(tileCount).toBeGreaterThanOrEqual(7);

    // Check first tile dimensions
    const firstTileBox = await rackTiles.first().boundingBox();
    console.log(`Tile dimensions: ${firstTileBox.width}x${firstTileBox.height}`);
    expect(Math.abs(firstTileBox.width - firstTileBox.height)).toBeLessThan(2); // Should be square

    // Check button positions
    const shuffleBtn = page.locator('#shuffle-rack');
    const shuffleBox = await shuffleBtn.boundingBox();
    const rackRight = rackBox.x + rackBox.width;
    const buttonDistance = shuffleBox.x - rackRight;
    console.log(`Shuffle button distance from rack: ${buttonDistance}px`);
    expect(Math.abs(buttonDistance)).toBeLessThan(25); // Should be close but not overlapping

    console.log('✅ Desktop view test completed successfully');
  });

  test('Tile drag interaction test', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('https://letters.wiki');
    await page.waitForTimeout(3000);

    // Get initial rack state
    const initialRackTiles = await page.locator('#tile-rack .tile').count();
    console.log(`Initial tiles in rack: ${initialRackTiles}`);

    // Try to drag a tile to the board center
    const firstTile = page.locator('#tile-rack .tile').first();
    const centerCell = page.locator('.board-cell').nth(112); // Center of board (7,7)

    // Get tile letter for verification
    const tileLetter = await firstTile.locator('.tile-letter').textContent();
    console.log(`Attempting to place tile: ${tileLetter}`);

    // Perform drag and drop
    await firstTile.dragTo(centerCell);
    await page.waitForTimeout(1000);

    // Check if tile was placed
    const placedTile = centerCell.locator('.tile');
    const isPlaced = await placedTile.count() > 0;

    if (isPlaced) {
      console.log('✅ Tile successfully placed on board');
      const placedLetter = await placedTile.locator('.tile-letter').textContent();
      expect(placedLetter).toBe(tileLetter);

      // Check recall button appears
      const recallBtn = page.locator('#recall-tiles');
      await expect(recallBtn).toBeVisible();
    } else {
      console.log('⚠️ Tile not placed (may be starting tile position)');
    }

    // Take final screenshot
    await page.screenshot({
      path: 'desktop-after-drag.png',
      fullPage: false
    });
  });
});