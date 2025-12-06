const { test, expect } = require('@playwright/test');

test.describe('New Button UI', () => {
    test('buttons show/hide correctly based on tile placement', async ({ page }) => {
        await page.goto('http://localhost:8085');
        await page.waitForSelector('#game-board', { timeout: 10000 });
        await page.waitForSelector('.tile-rack .tile');

        // Initially, submit and recall buttons should be hidden
        await expect(page.locator('#submit-container')).not.toBeVisible();
        await expect(page.locator('#board-actions')).not.toBeVisible();

        // Shuffle button should always be visible
        await expect(page.locator('#shuffle-rack')).toBeVisible();

        // Place a tile
        await page.click('.tile-rack .tile:first-child');
        await page.click('.board-cell[data-row="7"][data-col="11"]');

        // Now submit and recall buttons should be visible
        await expect(page.locator('#submit-container')).toBeVisible();
        await expect(page.locator('#board-actions')).toBeVisible();

        // Test shuffle button
        const initialTileOrder = await page.locator('.tile-rack .tile').evaluateAll(
            tiles => tiles.map(t => t.dataset.letter)
        );

        await page.click('#shuffle-rack');
        await page.waitForTimeout(400); // Wait for animation

        const newTileOrder = await page.locator('.tile-rack .tile').evaluateAll(
            tiles => tiles.map(t => t.dataset.letter)
        );

        // Order should potentially be different (though could randomly be same)
        console.log('Initial order:', initialTileOrder);
        console.log('After shuffle:', newTileOrder);

        // Test recall button
        await page.click('#recall-tiles');
        await page.waitForTimeout(500);

        // Buttons should hide again
        await expect(page.locator('#submit-container')).not.toBeVisible();
        await expect(page.locator('#board-actions')).not.toBeVisible();

        // All tiles should be back in rack
        const rackTileCount = await page.locator('.tile-rack .tile').count();
        expect(rackTileCount).toBe(7);
    });

    test('buttons have proper icons and styling', async ({ page }) => {
        await page.goto('http://localhost:8085');
        await page.waitForSelector('#game-board', { timeout: 10000 });

        // Check shuffle button has SVG
        const shuffleSvg = await page.locator('#shuffle-rack svg').isVisible();
        expect(shuffleSvg).toBe(true);

        // Place a tile to show other buttons
        await page.click('.tile-rack .tile:first-child');
        await page.click('.board-cell[data-row="7"][data-col="11"]');

        // Check recall button has SVG and label
        const recallSvg = await page.locator('#recall-tiles svg').isVisible();
        const recallLabel = await page.locator('#recall-tiles .icon-label').textContent();
        expect(recallSvg).toBe(true);
        expect(recallLabel).toBe('Recall');

        // Check submit button has SVG
        const submitSvg = await page.locator('#submit-word svg').isVisible();
        const submitText = await page.locator('#submit-word').textContent();
        expect(submitSvg).toBe(true);
        expect(submitText).toContain('Submit Word');
    });

    test('mobile touch targets are adequate', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('http://localhost:8085');
        await page.waitForSelector('#game-board', { timeout: 10000 });

        // Check shuffle button size
        const shuffleBox = await page.locator('#shuffle-rack').boundingBox();
        console.log('Shuffle button:', shuffleBox.width, 'x', shuffleBox.height);
        expect(shuffleBox.height).toBeGreaterThanOrEqual(44);

        // Place tile to show other buttons
        await page.click('.tile-rack .tile:first-child');
        await page.click('.board-cell[data-row="7"][data-col="11"]');

        // Check recall button size
        const recallBox = await page.locator('#recall-tiles').boundingBox();
        console.log('Recall button:', recallBox.width, 'x', recallBox.height);
        expect(recallBox.height).toBeGreaterThanOrEqual(44);

        // Check submit button size
        const submitBox = await page.locator('#submit-word').boundingBox();
        console.log('Submit button:', submitBox.width, 'x', submitBox.height);
        expect(submitBox.height).toBeGreaterThanOrEqual(48);
    });
});