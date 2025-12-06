const { test, expect } = require('@playwright/test');

test.describe('Tile Manipulation Features', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8085');
        await page.waitForSelector('#game-board', { timeout: 10000 });
    });

    test('can move tile from board back to rack', async ({ page }) => {
        // Wait for tiles to load
        await page.waitForSelector('.tile-rack .tile');

        // Get initial rack count
        const initialRackTiles = await page.locator('.tile-rack .tile').count();

        // Place a tile on board
        await page.click('.tile-rack .tile:first-child');
        await page.click('.board-cell[data-row="7"][data-col="8"]');

        // Verify tile was placed
        await expect(page.locator('.board-cell[data-row="7"][data-col="8"] .tile')).toBeVisible();

        // Click the placed tile to return it to rack
        await page.click('.board-cell[data-row="7"][data-col="8"] .tile');

        // Verify tile is back in rack
        const finalRackTiles = await page.locator('.tile-rack .tile').count();
        expect(finalRackTiles).toBe(initialRackTiles);

        // Verify cell is empty
        await expect(page.locator('.board-cell[data-row="7"][data-col="8"] .tile')).not.toBeVisible();
    });

    test('can move tile between board squares', async ({ page }) => {
        // Place a tile on board
        await page.click('.tile-rack .tile:first-child');
        await page.click('.board-cell[data-row="7"][data-col="8"]');

        // Select the placed tile
        await page.click('.board-cell[data-row="7"][data-col="8"] .tile');

        // Move it to another position
        await page.click('.board-cell[data-row="6"][data-col="7"]');

        // Verify tile moved
        await expect(page.locator('.board-cell[data-row="6"][data-col="7"] .tile')).toBeVisible();
        await expect(page.locator('.board-cell[data-row="7"][data-col="8"] .tile')).not.toBeVisible();
    });

    test('shows word preview and score', async ({ page }) => {
        // Place tiles to form a word
        const tiles = await page.locator('.tile-rack .tile').all();

        // Place first tile
        await tiles[0].click();
        await page.click('.board-cell[data-row="7"][data-col="8"]');

        // Check for word preview
        await expect(page.locator('.word-preview')).toBeVisible();
        await expect(page.locator('.preview-words')).toContainText('Words:');
        await expect(page.locator('.preview-score')).toContainText('Total:');

        // Place another tile
        if (tiles.length > 1) {
            await tiles[1].click();
            await page.click('.board-cell[data-row="7"][data-col="9"]');

            // Score should update
            await expect(page.locator('.preview-score')).toContainText('points');
        }
    });

    test('drag and drop works on desktop', async ({ page }) => {
        // Get a tile
        const tile = page.locator('.tile-rack .tile').first();
        const targetCell = page.locator('.board-cell[data-row="7"][data-col="8"]');

        // Drag tile to board
        await tile.dragTo(targetCell);

        // Verify placement
        await expect(targetCell.locator('.tile')).toBeVisible();
    });

    test('recall tiles button works', async ({ page }) => {
        // Place multiple tiles
        const tiles = await page.locator('.tile-rack .tile').all();

        await tiles[0].click();
        await page.click('.board-cell[data-row="7"][data-col="8"]');

        if (tiles.length > 1) {
            await tiles[1].click();
            await page.click('.board-cell[data-row="7"][data-col="9"]');
        }

        // Click recall button
        await page.click('#recall-tiles');

        // All tiles should be back in rack
        const rackTiles = await page.locator('.tile-rack .tile').count();
        expect(rackTiles).toBe(7); // Should have all 7 tiles back
    });

    test('saves tile placements on refresh', async ({ page }) => {
        // Place a tile
        await page.click('.tile-rack .tile:first-child');
        await page.click('.board-cell[data-row="7"][data-col="8"]');

        // Get the letter
        const letter = await page.locator('.board-cell[data-row="7"][data-col="8"] .tile-letter').textContent();

        // Refresh page
        await page.reload();
        await page.waitForSelector('#game-board');

        // Tile should still be there
        await expect(page.locator('.board-cell[data-row="7"][data-col="8"] .tile')).toBeVisible();
        const restoredLetter = await page.locator('.board-cell[data-row="7"][data-col="8"] .tile-letter').textContent();
        expect(restoredLetter).toBe(letter);
    });
});