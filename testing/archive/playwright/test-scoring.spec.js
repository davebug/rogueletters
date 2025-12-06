const { test, expect } = require('@playwright/test');

test('verify scoring calculations', async ({ page }) => {
    // Capture network responses to see scoring details
    page.on('response', async response => {
        if (response.url().includes('validate_word')) {
            const body = await response.json();
            console.log('\nValidation response:', JSON.stringify(body, null, 2));
        }
    });

    await page.goto('http://localhost:8085');

    // Wait for game to load
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

    console.log('✓ Game loaded\n');

    // Get starting score
    const initialScore = await page.locator('#current-score').textContent();
    console.log(`Initial score: ${initialScore}`);

    // Find "O" in COMPANY (column 8, row 7)
    // Place "N" below it to form "ON" vertically
    const tiles = await page.locator('.tile-rack .tile').all();
    let nTile = null;

    for (const tile of tiles) {
        const text = await tile.textContent();
        if (text.charAt(0) === 'N') {
            nTile = tile;
            break;
        }
    }

    if (nTile) {
        console.log('Placing N below O to form "ON"');
        await nTile.click();
        await page.click('.board-cell[data-row="8"][data-col="8"]');

        // Check the cell type of where we're placing
        const targetCell = await page.locator('.board-cell[data-row="8"][data-col="8"]');
        const cellClass = await targetCell.getAttribute('class');
        console.log(`Cell type: ${cellClass}`);

        // Check word preview
        await page.waitForTimeout(500);
        const previewText = await page.locator('.word-preview').textContent();
        console.log(`\nWord preview: ${previewText.replace(/\s+/g, ' ')}`);

        // Submit
        await page.click('#submit-word');
        await page.waitForTimeout(2000);

        // Check final score
        const finalScore = await page.locator('#current-score').textContent();
        console.log(`\nFinal score: ${finalScore}`);
        console.log(`Score increase: ${parseInt(finalScore) - parseInt(initialScore)}`);

        // Check turn
        const turn = await page.locator('#current-turn').textContent();
        console.log(`Turn: ${turn}`);
    }

    // Test 2: Place multiple tiles
    console.log('\n--- TEST 2: Multiple tile word ---');

    // Get new rack after refill
    const newTiles = await page.locator('.tile-rack .tile').all();
    console.log(`Tiles in rack: ${newTiles.length}`);

    // Try to place two tiles vertically from the N we just placed
    if (newTiles.length >= 2) {
        const tile1 = newTiles[0];
        const letter1 = await tile1.textContent();
        await tile1.click();
        await page.click('.board-cell[data-row="9"][data-col="8"]');
        console.log(`Placed ${letter1.charAt(0)} at row 9`);

        const tile2 = newTiles[1];
        const letter2 = await tile2.textContent();
        await tile2.click();
        await page.click('.board-cell[data-row="10"][data-col="8"]');
        console.log(`Placed ${letter2.charAt(0)} at row 10`);

        // Check word preview
        await page.waitForTimeout(500);
        const preview2 = await page.locator('.word-preview').textContent();
        console.log(`Word preview: ${preview2.replace(/\s+/g, ' ')}`);

        // Submit
        await page.click('#submit-word');
        await page.waitForTimeout(2000);

        const score2 = await page.locator('#current-score').textContent();
        console.log(`Score after second word: ${score2}`);
    }

    await page.screenshot({
        path: 'test-results/scoring-test.png',
        fullPage: true
    });
});