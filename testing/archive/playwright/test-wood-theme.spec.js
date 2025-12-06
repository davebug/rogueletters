const { test, expect } = require('@playwright/test');

test('capture wood theme appearance', async ({ page }) => {
    await page.goto('http://localhost:8085');

    // Wait for game to fully load - loading overlay should be hidden
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

    // Capture full page
    await page.screenshot({
        path: 'test-results/wood-theme-desktop.png',
        fullPage: true
    });
    console.log('✓ Captured desktop with wood theme');

    // Mobile view
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
        path: 'test-results/wood-theme-mobile.png',
        fullPage: true
    });
    console.log('✓ Captured mobile with wood theme');

    // Place a tile to see the buttons
    await page.click('.tile-rack .tile:first-child');
    await page.click('.board-cell[data-row="7"][data-col="11"]');

    await page.waitForTimeout(500);

    await page.screenshot({
        path: 'test-results/wood-theme-with-tile.png',
        fullPage: true
    });
    console.log('✓ Captured with tile placed and buttons visible');
});