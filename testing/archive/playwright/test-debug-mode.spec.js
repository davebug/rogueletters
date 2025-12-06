const { test, expect } = require('@playwright/test');

test('debug mode allows invalid words', async ({ page }) => {
    test.setTimeout(60000);

    console.log('\n🐛 TESTING DEBUG MODE\n');

    // Navigate with debug mode enabled
    await page.goto('http://localhost:8085?debug=1');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile');

    // Verify debug controls are visible
    const debugControls = await page.locator('#debug-controls');
    expect(await debugControls.isVisible()).toBe(true);
    console.log('✅ Debug controls visible');

    // Enable debug mode
    const debugToggle = await page.locator('#debug-mode-toggle');
    await debugToggle.check();
    console.log('✅ Debug mode enabled');

    // Get starting word info
    const startingWord = await page.evaluate(() => {
        const tiles = document.querySelectorAll('.board-cell.occupied .tile');
        return Array.from(tiles).map(t => t.textContent.charAt(0)).join('');
    });
    console.log(`Starting word: ${startingWord}`);

    // Get rack tiles
    const rackTiles = await page.locator('.tile-rack .tile').all();
    const letters = [];
    for (const tile of rackTiles) {
        const text = await tile.textContent();
        letters.push(text.charAt(0));
    }
    console.log(`Rack: ${letters.join(', ')}`);

    console.log('\n--- TEST: Submit invalid word with debug mode ---');

    // Place tiles to form an invalid word like "XYZ" or "QQQ"
    // Just place first three tiles in a row
    if (rackTiles.length >= 3) {
        // Place tiles horizontally below the starting word
        await rackTiles[0].click();
        await page.click('.board-cell[data-row="8"][data-col="7"]');

        await rackTiles[0].click(); // Get next tile (index shifted after first placement)
        await page.click('.board-cell[data-row="8"][data-col="8"]');

        await rackTiles[0].click(); // Get next tile
        await page.click('.board-cell[data-row="8"][data-col="9"]');

        // Get the "word" we formed
        const placedLetters = [];
        for (let col = 7; col <= 9; col++) {
            const cell = await page.locator(`.board-cell[data-row="8"][data-col="${col}"] .tile-letter`);
            if (await cell.count() > 0) {
                placedLetters.push(await cell.textContent());
            }
        }
        const formedWord = placedLetters.join('');
        console.log(`Attempting to play: "${formedWord}" (likely invalid)`);

        // Submit the word
        await page.click('#submit-word');
        await page.waitForTimeout(2000);

        // Check if it was accepted (no error modal should appear)
        const errorModal = await page.locator('#error-modal');
        const hasError = await errorModal.isVisible();

        if (!hasError) {
            console.log(`✅ Word "${formedWord}" accepted in debug mode!`);

            // Check if score increased
            const score = await page.locator('#current-score').textContent();
            console.log(`Score: ${score}`);
            expect(parseInt(score)).toBeGreaterThan(0);
        } else {
            const errorMsg = await page.locator('#error-message').textContent();
            console.log(`❌ Unexpected error: ${errorMsg}`);
            // This shouldn't happen in debug mode unless there's a connectivity issue
            expect(hasError).toBe(false);
        }
    }

    console.log('\n--- TEST: Disable debug mode and try invalid word ---');

    // Disable debug mode
    await debugToggle.uncheck();
    console.log('Debug mode disabled');

    // Try to place more tiles to form another invalid word
    const remainingTiles = await page.locator('.tile-rack .tile').all();
    if (remainingTiles.length >= 2) {
        await remainingTiles[0].click();
        await page.click('.board-cell[data-row="6"][data-col="4"]');

        await remainingTiles[0].click();
        await page.click('.board-cell[data-row="6"][data-col="5"]');

        // Submit
        await page.click('#submit-word');
        await page.waitForTimeout(2000);

        // Should get an error now
        const errorModal = await page.locator('#error-modal');
        const hasError = await errorModal.isVisible();

        if (hasError) {
            const errorMsg = await page.locator('#error-message').textContent();
            console.log(`✅ Word correctly rejected without debug mode: "${errorMsg}"`);
            expect(errorMsg).toContain('Invalid word');
        }
    }

    // Take screenshot
    await page.screenshot({
        path: 'test-results/debug-mode-test.png',
        fullPage: true
    });

    console.log('\n✅ Debug mode test complete!');
});

test('debug mode not visible without query parameter', async ({ page }) => {
    console.log('\n🔒 Testing debug mode security\n');

    // Navigate without debug parameter
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Debug controls should NOT be visible
    const debugControls = await page.locator('#debug-controls');
    expect(await debugControls.isVisible()).toBe(false);
    console.log('✅ Debug controls correctly hidden without ?debug=1');
});