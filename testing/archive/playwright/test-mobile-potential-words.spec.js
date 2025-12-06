const { test, expect } = require('@playwright/test');

test.describe('Mobile Potential Words Display', () => {

  test('Mobile - Potential words and submit button appear when tiles are placed', async ({ page }) => {
    // Set mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to letters.wiki
    await page.goto('https://letters.wiki');
    await page.waitForTimeout(3000);

    console.log('=== Initial State ===');

    // Check initial state - mobile potential words should be hidden
    const mobilePotentialWords = page.locator('#mobile-potential-words');
    const initialVisibility = await mobilePotentialWords.isVisible();
    console.log(`Mobile potential words initially visible: ${initialVisibility}`);

    // Take screenshot of initial state
    await page.screenshot({
      path: 'mobile-before-tile-placement.png',
      fullPage: true
    });

    // Get tiles from rack
    const rackTiles = page.locator('#tile-rack .tile');
    const tileCount = await rackTiles.count();
    console.log(`Found ${tileCount} tiles in rack`);

    // Try to place a tile on the board
    console.log('\n=== Placing Tile ===');
    const firstTile = rackTiles.first();
    const tileLetter = await firstTile.locator('.tile-letter').textContent();
    console.log(`Placing tile: ${tileLetter}`);

    // Place tile at center of board (row 7, col 7)
    const centerCell = page.locator('.board-cell').nth(112);
    await firstTile.dragTo(centerCell);
    await page.waitForTimeout(1000);

    // Check if tile was placed
    const placedTile = centerCell.locator('.tile');
    const tilePlaced = await placedTile.count() > 0;
    console.log(`Tile placed successfully: ${tilePlaced}`);

    // Now check if mobile potential words is visible
    console.log('\n=== After Tile Placement ===');
    const afterPlacementVisibility = await mobilePotentialWords.isVisible();
    console.log(`Mobile potential words visible after placement: ${afterPlacementVisibility}`);

    // Check if mobile submit button is visible
    const mobileSubmitBtn = page.locator('#mobile-submit-container #mobile-submit-word');
    const submitVisible = await mobileSubmitBtn.isVisible();
    console.log(`Mobile submit button visible: ${submitVisible}`);

    // Check the actual display style
    const displayStyle = await mobilePotentialWords.evaluate(el => {
      return window.getComputedStyle(el).display;
    });
    console.log(`Mobile potential words display style: ${displayStyle}`);

    // Check if right sidebar is hidden (should be on mobile)
    const rightSidebar = page.locator('#right-sidebar');
    const sidebarDisplay = await rightSidebar.evaluate(el => {
      return window.getComputedStyle(el).display;
    });
    console.log(`Right sidebar display: ${sidebarDisplay} (should be 'none' on mobile)`);

    // Get potential words content if visible
    if (afterPlacementVisibility) {
      const potentialWordsContent = await page.locator('#mobile-potential-words-list').textContent();
      console.log(`Potential words content: ${potentialWordsContent || 'empty'}`);
    }

    // Take screenshot after tile placement
    await page.screenshot({
      path: 'mobile-after-tile-placement.png',
      fullPage: true
    });

    // Take a focused screenshot of the area where potential words should be
    const rackContainer = page.locator('#tile-rack-container');
    const rackBox = await rackContainer.boundingBox();
    if (rackBox) {
      await page.screenshot({
        path: 'mobile-rack-area-closeup.png',
        clip: {
          x: 0,
          y: rackBox.y - 50,
          width: 375,
          height: 300
        }
      });
    }

    // Try placing another tile to form a word
    console.log('\n=== Placing Second Tile ===');
    const secondTile = rackTiles.first(); // First remaining tile
    const nextCell = page.locator('.board-cell').nth(113); // To the right
    await secondTile.dragTo(nextCell);
    await page.waitForTimeout(1000);

    // Check visibility again
    const afterSecondTile = await mobilePotentialWords.isVisible();
    console.log(`Mobile potential words visible after 2nd tile: ${afterSecondTile}`);

    // Final screenshot
    await page.screenshot({
      path: 'mobile-two-tiles-placed.png',
      fullPage: true
    });

    // Assert that potential words should be visible when tiles are placed
    if (tilePlaced) {
      expect(afterPlacementVisibility || afterSecondTile).toBe(true);
    }
  });

  test('Desktop - Verify right sidebar shows instead of mobile elements', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to letters.wiki
    await page.goto('https://letters.wiki');
    await page.waitForTimeout(3000);

    // Place a tile
    const firstTile = page.locator('#tile-rack .tile').first();
    const centerCell = page.locator('.board-cell').nth(112);
    await firstTile.dragTo(centerCell);
    await page.waitForTimeout(1000);

    // Check that mobile potential words is NOT visible on desktop
    const mobilePotentialWords = page.locator('#mobile-potential-words');
    const mobileVisible = await mobilePotentialWords.isVisible();
    console.log(`Mobile potential words visible on desktop: ${mobileVisible} (should be false)`);

    // Check that right sidebar IS visible on desktop
    const rightSidebar = page.locator('#right-sidebar');
    const sidebarVisible = await rightSidebar.isVisible();
    console.log(`Right sidebar visible on desktop: ${sidebarVisible} (should be true)`);

    // Check desktop submit button in sidebar
    const desktopSubmitBtn = page.locator('#submit-container #submit-word');
    const desktopSubmitVisible = await desktopSubmitBtn.isVisible();
    console.log(`Desktop submit button visible: ${desktopSubmitVisible}`);

    await page.screenshot({
      path: 'desktop-sidebar-visible.png',
      fullPage: false
    });

    // Assert correct visibility
    expect(mobileVisible).toBe(false);
    expect(sidebarVisible).toBe(true);
  });
});