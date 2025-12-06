const { test, expect } = require('@playwright/test');

test.describe('Current Layout Tests', () => {
  const testUrl = 'http://localhost:8085';

  test('Desktop layout - two column, no left sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(testUrl);

    // Check that the main container has two-column layout class
    const gameContainer = await page.locator('#game-container');
    await expect(gameContainer).toHaveClass(/two-column-layout/);

    // Check that left sidebar doesn't exist or is hidden
    const leftSidebar = page.locator('#left-sidebar');
    await expect(leftSidebar).not.toBeVisible();

    // Check that right sidebar is visible on desktop
    const rightSidebar = page.locator('#right-sidebar');
    await expect(rightSidebar).toBeVisible();

    // Check board is visible and sized correctly
    const board = page.locator('#game-board');
    await expect(board).toBeVisible();

    // Check that potential words list is in right sidebar
    const potentialWords = page.locator('#right-sidebar #potential-words-list');
    await expect(potentialWords).toBeVisible();

    // Check submit button is in right sidebar (when tiles placed)
    const submitContainer = page.locator('#right-sidebar #submit-container');
    await expect(submitContainer).toBeAttached();
  });

  test('Mobile layout - single column, portrait only', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.goto(testUrl);

    // Check that right sidebar is hidden on mobile
    const rightSidebar = page.locator('#right-sidebar');
    await expect(rightSidebar).not.toBeVisible();

    // Check board is smaller on mobile
    const boardCells = page.locator('.board-cell').first();
    await expect(boardCells).toBeVisible();
    const cellBox = await boardCells.boundingBox();
    expect(cellBox.width).toBeLessThanOrEqual(20);

    // Check mobile potential words container exists
    const mobilePotentialWords = page.locator('#mobile-potential-words');
    await expect(mobilePotentialWords).toBeAttached();

    // Check rack tiles are sized for touch
    const rackTile = page.locator('.tile-rack .tile').first();
    const tileBox = await rackTile.boundingBox();
    expect(tileBox.width).toBeGreaterThanOrEqual(35);
  });

  test('Landscape warning on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 }); // Landscape
    await page.goto(testUrl);

    // Check for landscape warning message
    const bodyBefore = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.body, '::before');
      return styles.content;
    });

    // Should show warning message in landscape on small screens
    expect(bodyBefore).toContain('rotate');
  });

  test('Drag and drop tile rearrangement in rack', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(testUrl);
    await page.waitForTimeout(1000);

    // Get initial tile positions
    const firstTile = page.locator('.tile-rack .tile').first();
    const secondTile = page.locator('.tile-rack .tile').nth(1);

    const firstLetter = await firstTile.locator('.tile-letter').textContent();
    const secondLetter = await secondTile.locator('.tile-letter').textContent();

    // Drag first tile to second position
    await firstTile.dragTo(secondTile);
    await page.waitForTimeout(500);

    // Check that tiles swapped positions
    const newFirstTile = page.locator('.tile-rack .tile').first();
    const newFirstLetter = await newFirstTile.locator('.tile-letter').textContent();

    const newSecondTile = page.locator('.tile-rack .tile').nth(1);
    const newSecondLetter = await newSecondTile.locator('.tile-letter').textContent();

    expect(newFirstLetter).toBe(secondLetter);
    expect(newSecondLetter).toBe(firstLetter);
  });

  test('Submit button shows arrow icon', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(testUrl);

    // Place a tile to show submit button
    const firstTile = page.locator('.tile-rack .tile').first();
    const centerCell = page.locator('.board-cell[data-row="7"][data-col="7"]');
    await firstTile.dragTo(centerCell);
    await page.waitForTimeout(500);

    // Check submit button is visible and has arrow icon
    const submitButton = page.locator('#submit-word');
    await expect(submitButton).toBeVisible();

    const svgPath = submitButton.locator('svg path');
    await expect(svgPath).toHaveAttribute('d', 'M5 12h14M12 5l7 7-7 7');
  });

  test('Mobile potential words display horizontally', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(testUrl);

    // Place tiles to form a word
    const firstTile = page.locator('.tile-rack .tile').first();
    const centerCell = page.locator('.board-cell[data-row="7"][data-col="7"]');
    await firstTile.click();
    await centerCell.click();
    await page.waitForTimeout(500);

    // Check mobile potential words container is visible
    const mobilePotentialWords = page.locator('#mobile-potential-words');
    await expect(mobilePotentialWords).toBeVisible();

    // Check that word items are displayed inline
    const wordItems = page.locator('#mobile-potential-words .word-item');
    const count = await wordItems.count();
    if (count > 0) {
      const firstItem = wordItems.first();
      await expect(firstItem).toHaveCSS('display', 'inline-flex');
    }
  });

  test('Vertical spacing is minimal', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(testUrl);

    // Check main padding
    const main = page.locator('main');
    const mainPadding = await main.evaluate(el =>
      window.getComputedStyle(el).paddingTop
    );
    expect(parseInt(mainPadding)).toBeLessThanOrEqual(100);

    // Check board margin
    const boardContainer = page.locator('#board-container');
    const boardMargin = await boardContainer.evaluate(el =>
      window.getComputedStyle(el).marginBottom
    );
    expect(parseInt(boardMargin)).toBeLessThanOrEqual(10);

    // Check rack margin
    const rackContainer = page.locator('#tile-rack-container');
    const rackMargin = await rackContainer.evaluate(el =>
      window.getComputedStyle(el).marginBottom
    );
    expect(parseInt(rackMargin)).toBeLessThanOrEqual(10);
  });
});