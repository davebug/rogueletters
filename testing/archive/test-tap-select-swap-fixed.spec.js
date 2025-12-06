const { test, expect } = require('@playwright/test');

test.describe('Tap to Select and Swap Tiles', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the game with a test seed
        await page.goto('http://localhost:8085/?seed=20240101');

        // Wait for the game to load
        await page.waitForSelector('#tile-rack .tile', { timeout: 10000 });

        // Hide the footer that's blocking clicks
        await page.evaluate(() => {
            const footer = document.querySelector('footer');
            if (footer) footer.style.display = 'none';
            const feedbackFooter = document.getElementById('feedbackFooter');
            if (feedbackFooter) feedbackFooter.style.display = 'none';
        });

        // Verify tiles are loaded
        const tiles = await page.locator('#tile-rack .tile');
        const tileCount = await tiles.count();
        expect(tileCount).toBeGreaterThan(0);

        console.log(`Game loaded with ${tileCount} tiles in rack`);
    });

    test('should select a tile when tapped', async ({ page }) => {
        // Get the first tile in the rack
        const firstTile = page.locator('#tile-rack .tile').first();

        // Get the letter of the first tile for logging
        const firstLetter = await firstTile.getAttribute('data-letter');
        console.log(`Tapping first tile with letter: ${firstLetter}`);

        // Click (tap) the first tile
        await firstTile.click();

        // Verify the tile is selected
        await expect(firstTile).toHaveClass(/selected/);
        console.log('✓ First tile is selected');

        // Take a screenshot to verify visual selection
        await page.screenshot({ path: 'testing/screenshots/tile-selected.png' });
    });

    test('should deselect a tile when tapped again', async ({ page }) => {
        // Get the first tile
        const firstTile = page.locator('#tile-rack .tile').first();

        // Select the tile
        await firstTile.click();
        await expect(firstTile).toHaveClass(/selected/);
        console.log('✓ Tile selected');

        // Click the same tile again to deselect
        await firstTile.click();

        // Verify the tile is no longer selected
        await expect(firstTile).not.toHaveClass(/selected/);
        console.log('✓ Tile deselected');
    });

    test('should swap tiles when another rack tile is tapped', async ({ page }) => {
        // Get all tiles in the rack
        const tiles = page.locator('#tile-rack .tile');
        const tileCount = await tiles.count();

        if (tileCount < 2) {
            console.log('Not enough tiles to test swapping');
            return;
        }

        // Get the first and third tiles (to make the swap more visible)
        const firstTile = tiles.nth(0);
        const thirdTile = tiles.nth(2);

        // Get their initial letters
        const firstLetter = await firstTile.getAttribute('data-letter');
        const thirdLetter = await thirdTile.getAttribute('data-letter');
        console.log(`Initial positions - Position 1: ${firstLetter}, Position 3: ${thirdLetter}`);

        // Take initial screenshot
        await page.screenshot({ path: 'testing/screenshots/before-swap.png' });

        // Select the first tile
        await firstTile.click();
        await expect(firstTile).toHaveClass(/selected/);
        console.log(`✓ Selected tile ${firstLetter}`);

        // Click the third tile to swap
        await thirdTile.click();
        console.log('✓ Clicked second tile to trigger swap');

        // Wait a moment for the swap animation
        await page.waitForTimeout(500);

        // Verify the tiles have swapped positions
        // The first position should now have the third tile's letter
        const newFirstTile = tiles.nth(0);
        const newThirdTile = tiles.nth(2);

        const newFirstLetter = await newFirstTile.getAttribute('data-letter');
        const newThirdLetter = await newThirdTile.getAttribute('data-letter');

        console.log(`After swap - Position 1: ${newFirstLetter}, Position 3: ${newThirdLetter}`);

        // Verify the swap occurred
        expect(newFirstLetter).toBe(thirdLetter);
        expect(newThirdLetter).toBe(firstLetter);
        console.log('✓ Tiles successfully swapped positions');

        // Verify no tile is selected after swap
        const selectedTiles = await page.locator('#tile-rack .tile.selected').count();
        expect(selectedTiles).toBe(0);
        console.log('✓ No tiles remain selected after swap');

        // Take final screenshot
        await page.screenshot({ path: 'testing/screenshots/after-swap.png' });
    });

    test('should handle selecting different tiles sequentially', async ({ page }) => {
        const tiles = page.locator('#tile-rack .tile');
        const tileCount = await tiles.count();

        if (tileCount < 3) {
            console.log('Not enough tiles for this test');
            return;
        }

        // Select first tile
        const firstTile = tiles.nth(0);
        await firstTile.click();
        await expect(firstTile).toHaveClass(/selected/);
        console.log('✓ First tile selected');

        // Select second tile (should swap)
        const secondTile = tiles.nth(1);
        await secondTile.click();
        await page.waitForTimeout(300);

        // Verify no tiles are selected after swap
        await expect(firstTile).not.toHaveClass(/selected/);
        await expect(secondTile).not.toHaveClass(/selected/);
        console.log('✓ Tiles swapped and deselected');

        // Now select third tile
        const thirdTile = tiles.nth(2);
        await thirdTile.click();
        await expect(thirdTile).toHaveClass(/selected/);
        console.log('✓ Third tile selected');

        // Deselect by clicking it again
        await thirdTile.click();
        await expect(thirdTile).not.toHaveClass(/selected/);
        console.log('✓ Third tile deselected');
    });

    test('should maintain game state after swaps', async ({ page }) => {
        // Get all tiles and their initial order
        const tiles = page.locator('#tile-rack .tile');
        const initialOrder = [];
        const tileCount = await tiles.count();

        for (let i = 0; i < tileCount; i++) {
            const letter = await tiles.nth(i).getAttribute('data-letter');
            initialOrder.push(letter);
        }
        console.log('Initial tile order:', initialOrder.join(', '));

        // Perform multiple swaps
        // Swap first and last
        await tiles.first().click();
        await tiles.last().click();
        await page.waitForTimeout(300);
        console.log('✓ Swapped first and last tiles');

        // Swap middle tiles if we have enough
        if (tileCount >= 4) {
            await tiles.nth(1).click();
            await tiles.nth(2).click();
            await page.waitForTimeout(300);
            console.log('✓ Swapped middle tiles');
        }

        // Get final order
        const finalOrder = [];
        for (let i = 0; i < tileCount; i++) {
            const letter = await tiles.nth(i).getAttribute('data-letter');
            finalOrder.push(letter);
        }
        console.log('Final tile order:', finalOrder.join(', '));

        // Verify all original tiles are still present (just reordered)
        const sortedInitial = [...initialOrder].sort();
        const sortedFinal = [...finalOrder].sort();
        expect(sortedInitial).toEqual(sortedFinal);
        console.log('✓ All tiles preserved after swapping');

        // Take final screenshot
        await page.screenshot({ path: 'testing/screenshots/multiple-swaps.png' });
    });
});