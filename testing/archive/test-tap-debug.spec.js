const { test, expect } = require('@playwright/test');

test('debug tap functionality', async ({ page }) => {
    // Navigate to the game
    await page.goto('http://localhost:8085/?seed=20240101');

    // Wait for tiles to load
    await page.waitForSelector('#tile-rack .tile', { timeout: 10000 });

    // Get all tiles
    const tiles = await page.locator('#tile-rack .tile').all();
    console.log(`Found ${tiles.length} tiles`);

    if (tiles.length > 0) {
        // Get first tile info
        const firstTile = tiles[0];
        const letter = await firstTile.getAttribute('data-letter');
        const classes = await firstTile.getAttribute('class');
        console.log(`First tile: letter=${letter}, classes="${classes}"`);

        // Try clicking it
        console.log('Clicking first tile...');
        await firstTile.click();

        // Wait a moment
        await page.waitForTimeout(500);

        // Check classes after click
        const classesAfter = await firstTile.getAttribute('class');
        console.log(`After click: classes="${classesAfter}"`);

        // Check if it has selected class
        const hasSelected = classesAfter.includes('selected');
        console.log(`Has selected class: ${hasSelected}`);

        // Take screenshot
        await page.screenshot({ path: 'testing/screenshots/debug-click.png' });

        if (hasSelected) {
            console.log('✓ Tile selection working!');
        } else {
            console.log('✗ Tile not getting selected class');

            // Let's check if handleTileClick is defined
            const hasTileClick = await page.evaluate(() => {
                return typeof handleTileClick !== 'undefined';
            });
            console.log(`handleTileClick function exists: ${hasTileClick}`);

            // Check if handleRackClick is defined
            const hasRackClick = await page.evaluate(() => {
                return typeof handleRackClick !== 'undefined';
            });
            console.log(`handleRackClick function exists: ${hasRackClick}`);

            // Try calling handleTileClick directly
            await page.evaluate((index) => {
                const tiles = document.querySelectorAll('#tile-rack .tile');
                if (tiles[index]) {
                    const event = new Event('click', { bubbles: true });
                    tiles[index].dispatchEvent(event);
                }
            }, 0);

            await page.waitForTimeout(500);

            const classesAfterDirect = await firstTile.getAttribute('class');
            console.log(`After direct event dispatch: classes="${classesAfterDirect}"`);
        }
    }
});