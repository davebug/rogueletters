const { test, expect } = require('@playwright/test');

test.describe('Word Preview and Score Features', () => {
    test('shows word preview and score as tiles are placed', async ({ page }) => {
        // Go to game
        await page.goto('http://localhost:8085');
        await page.waitForSelector('#game-board', { timeout: 10000 });

        // Wait for tiles to load
        await page.waitForSelector('.tile-rack .tile');

        // Initially, no word preview should be visible
        const previewInitial = await page.locator('.word-preview').isVisible();
        expect(previewInitial).toBe(false);

        // Place first tile next to starting word
        await page.click('.tile-rack .tile:first-child');
        await page.click('.board-cell[data-row="7"][data-col="8"]');

        // Now word preview should appear
        await page.waitForSelector('.word-preview', { state: 'visible' });

        // Check preview contains expected elements
        await expect(page.locator('.preview-words')).toContainText('Words:');
        await expect(page.locator('.preview-score')).toContainText('Total:');
        await expect(page.locator('.preview-score')).toContainText('points');

        // Get initial score
        const scoreText1 = await page.locator('.preview-score').textContent();
        const score1 = parseInt(scoreText1.match(/\d+/)[0]);
        console.log('Score after 1 tile:', score1);

        // Place second tile
        await page.click('.tile-rack .tile:first-child');
        await page.click('.board-cell[data-row="7"][data-col="9"]');

        // Score should update
        await page.waitForTimeout(500); // Wait for preview to update
        const scoreText2 = await page.locator('.preview-score').textContent();
        const score2 = parseInt(scoreText2.match(/\d+/)[0]);
        console.log('Score after 2 tiles:', score2);

        // Score should have increased
        expect(score2).toBeGreaterThan(score1);

        // Recall tiles should hide preview
        await page.click('#recall-tiles');
        await page.waitForTimeout(500);
        const previewAfterRecall = await page.locator('.word-preview').isVisible();
        expect(previewAfterRecall).toBe(false);
    });

    test('shows invalid placement warning', async ({ page }) => {
        await page.goto('http://localhost:8085');
        await page.waitForSelector('#game-board', { timeout: 10000 });
        await page.waitForSelector('.tile-rack .tile');

        // Try to place tile in invalid position (not connected)
        await page.click('.tile-rack .tile:first-child');

        // Try corner position (should be invalid)
        await page.click('.board-cell[data-row="0"][data-col="0"]');

        // Check for invalid placement class
        const hasInvalidClass = await page.locator('.board-cell[data-row="0"][data-col="0"]').evaluate(el => {
            return el.classList.contains('invalid-placement');
        });

        // The cell should briefly have invalid-placement class
        // Since it's removed after 500ms, we might not catch it, but tile shouldn't be placed
        await page.waitForTimeout(600);

        // Tile should not be placed there
        const tileInCorner = await page.locator('.board-cell[data-row="0"][data-col="0"] .tile').isVisible();
        expect(tileInCorner).toBe(false);

        // Tile should still be selected or in rack
        const tilesInRack = await page.locator('.tile-rack .tile').count();
        expect(tilesInRack).toBe(7); // All tiles should still be in rack
    });

    test('allows moving tiles between valid positions', async ({ page }) => {
        await page.goto('http://localhost:8085');
        await page.waitForSelector('#game-board', { timeout: 10000 });
        await page.waitForSelector('.tile-rack .tile');

        // Place tile in valid position
        await page.click('.tile-rack .tile:first-child');
        await page.click('.board-cell[data-row="7"][data-col="8"]');

        // Tile should be placed
        await expect(page.locator('.board-cell[data-row="7"][data-col="8"] .tile')).toBeVisible();

        // Click the placed tile to select it
        await page.click('.board-cell[data-row="7"][data-col="8"] .tile');

        // Move to another valid position
        await page.click('.board-cell[data-row="6"][data-col="7"]');

        // Tile should move
        await expect(page.locator('.board-cell[data-row="6"][data-col="7"] .tile')).toBeVisible();

        // Original position should be empty (just multiplier text if any)
        const originalHasTile = await page.locator('.board-cell[data-row="7"][data-col="8"] .tile').isVisible();
        expect(originalHasTile).toBe(false);
    });
});