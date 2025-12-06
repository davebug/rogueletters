const { test, expect } = require('@playwright/test');

test('debug word submission', async ({ page }) => {
    // Capture console logs
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', err => console.log('Page error:', err.message));

    // Also capture network responses
    page.on('response', response => {
        if (response.url().includes('validate_word')) {
            console.log(`\nValidate word response: ${response.status()}`);
            response.text().then(text => console.log('Response body:', text));
        }
    });

    await page.goto('http://localhost:8085');

    // Wait for game to load
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

    console.log('✓ Game loaded');

    // Find the starting word's rightmost position
    const startingWordCells = await page.locator('.board-cell.occupied').all();
    let rightmostCol = 0;
    for (const cell of startingWordCells) {
        const col = await cell.getAttribute('data-col');
        if (parseInt(col) > rightmostCol) {
            rightmostCol = parseInt(col);
        }
    }
    console.log(`Starting word ends at column ${rightmostCol}`);

    // Place two tiles to extend the word
    const tile1 = await page.locator('.tile-rack .tile').first();
    const letter1 = await tile1.textContent();
    await tile1.click();
    await page.click(`.board-cell[data-row="7"][data-col="${rightmostCol + 1}"]`);
    console.log(`Placed ${letter1} at column ${rightmostCol + 1}`);

    const tile2 = await page.locator('.tile-rack .tile').first();
    const letter2 = await tile2.textContent();
    await tile2.click();
    await page.click(`.board-cell[data-row="7"][data-col="${rightmostCol + 2}"]`);
    console.log(`Placed ${letter2} at column ${rightmostCol + 2}`);

    // Check word preview
    const previewText = await page.locator('.word-preview').textContent();
    console.log(`\nWord preview: ${previewText}`);

    // Get initial score
    const initialScore = await page.locator('#current-score').textContent();
    console.log(`\nInitial score: ${initialScore}`);

    // Submit the word
    console.log('\nSubmitting word...');
    await page.click('#submit-word');

    // Wait for potential response
    await page.waitForTimeout(2000);

    // Check final score
    const finalScore = await page.locator('#current-score').textContent();
    console.log(`Final score: ${finalScore}`);

    // Check if there's an error modal
    const errorModal = await page.locator('#error-modal');
    if (await errorModal.isVisible()) {
        const errorMsg = await page.locator('#error-message').textContent();
        console.log(`Error shown: ${errorMsg}`);
    }

    // Check if turn advanced
    const turn = await page.locator('#current-turn').textContent();
    console.log(`Turn: ${turn}`);

    // Take screenshot
    await page.screenshot({
        path: 'test-results/submit-debug.png',
        fullPage: true
    });
});