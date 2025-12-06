const { test, expect } = require('@playwright/test');

test.describe('Visual Check - Mobile and Desktop', () => {
  const testUrl = 'http://localhost:8085';

  test('Desktop view screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(testUrl);
    await page.waitForTimeout(1000);

    // Take screenshot of initial state
    await page.screenshot({ path: 'desktop-initial.png', fullPage: true });
    console.log('Desktop initial screenshot saved');

    // Place a tile to show submit button
    const firstTile = page.locator('.tile-rack .tile').first();
    const centerCell = page.locator('.board-cell[data-row="7"][data-col="7"]');

    // Try click method for placing tile
    await firstTile.click();
    await centerCell.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'desktop-with-tile.png', fullPage: true });
    console.log('Desktop with tile placed screenshot saved');

    // Check layout elements
    const rightSidebar = page.locator('#right-sidebar');
    await expect(rightSidebar).toBeVisible();
    console.log('✓ Right sidebar is visible on desktop');

    const gameContainer = await page.locator('#game-container');
    const classes = await gameContainer.getAttribute('class');
    console.log('Game container classes:', classes);
  });

  test('Mobile portrait view screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(testUrl);
    await page.waitForTimeout(1000);

    // Take screenshot of initial state
    await page.screenshot({ path: 'mobile-initial.png', fullPage: true });
    console.log('Mobile initial screenshot saved');

    // Place a tile
    const firstTile = page.locator('.tile-rack .tile').first();
    const centerCell = page.locator('.board-cell[data-row="7"][data-col="7"]');

    await firstTile.click();
    await centerCell.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'mobile-with-tile.png', fullPage: true });
    console.log('Mobile with tile placed screenshot saved');

    // Check mobile layout
    const rightSidebar = page.locator('#right-sidebar');
    const isRightSidebarVisible = await rightSidebar.isVisible();
    console.log('Right sidebar visible on mobile:', isRightSidebarVisible);

    // Check if mobile potential words shows up
    const mobilePotentialWords = page.locator('#mobile-potential-words');
    const isMobilePotentialVisible = await mobilePotentialWords.isVisible();
    console.log('Mobile potential words visible:', isMobilePotentialVisible);

    // Check board cell size
    const boardCell = page.locator('.board-cell').first();
    const cellBox = await boardCell.boundingBox();
    console.log('Board cell size on mobile:', cellBox?.width, 'x', cellBox?.height);
  });

  test('Mobile landscape warning screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto(testUrl);
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'mobile-landscape.png', fullPage: true });
    console.log('Mobile landscape screenshot saved');

    // Check if warning is shown
    const bodyContent = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.body, '::before');
      return {
        content: styles.content,
        display: styles.display,
        zIndex: styles.zIndex
      };
    });
    console.log('Landscape warning styles:', bodyContent);
  });

  test('Test tile drag and drop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(testUrl);
    await page.waitForTimeout(1000);

    const rack = page.locator('.tile-rack');
    const tiles = rack.locator('.tile');
    const tileCount = await tiles.count();
    console.log('Number of tiles in rack:', tileCount);

    if (tileCount >= 2) {
      const firstTile = tiles.first();
      const secondTile = tiles.nth(1);

      const firstText = await firstTile.textContent();
      const secondText = await secondTile.textContent();
      console.log('First tile:', firstText);
      console.log('Second tile:', secondText);

      // Try to drag first to second
      await firstTile.hover();
      await page.mouse.down();
      await secondTile.hover();
      await page.mouse.up();
      await page.waitForTimeout(500);

      const newFirstText = await tiles.first().textContent();
      const newSecondText = await tiles.nth(1).textContent();
      console.log('After drag - First tile:', newFirstText);
      console.log('After drag - Second tile:', newSecondText);
    }
  });
});