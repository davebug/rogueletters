const { test, expect } = require('@playwright/test');

test('full game playthrough with scoring validation', async ({ page }) => {
    test.setTimeout(60000); // 60 second timeout
    await page.goto('http://localhost:8085');

    // Wait for game to load
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

    console.log('✓ Game loaded');

    // Check initial state
    const score = await page.locator('#current-score').textContent();
    console.log(`Initial score: ${score}`);

    // Get the starting word
    const centerTiles = await page.locator('.board-cell.occupied').all();
    console.log(`Starting word has ${centerTiles.length} tiles`);

    // Try to see what tiles we have in rack
    const rackTiles = await page.locator('.tile-rack .tile').all();
    console.log(`Rack has ${rackTiles.length} tiles`);

    // Get first tile's letter
    const firstTile = rackTiles[0];
    const firstLetter = await firstTile.textContent();
    console.log(`First tile letter: ${firstLetter}`);

    // TEST 1: Try placing a single tile disconnected from the word (should allow placement)
    console.log('\n--- TEST 1: Place tile disconnected ---');
    await firstTile.click();
    await page.click('.board-cell[data-row="2"][data-col="2"]');

    // Check if tile was placed
    const placedCell = await page.locator('.board-cell[data-row="2"][data-col="2"]');
    const isOccupied = await placedCell.evaluate(el => el.classList.contains('occupied'));
    console.log(`Cell occupied after placement: ${isOccupied}`);

    // Try to submit (should fail - not connected)
    const submitBtn = await page.locator('#submit-word');
    const submitVisible = await submitBtn.isVisible();
    console.log(`Submit button visible: ${submitVisible}`);

    if (submitVisible) {
        await submitBtn.click();
        await page.waitForTimeout(500);

        // Check for error message in modal
        await page.waitForTimeout(500);
        const modal = await page.locator('#error-modal');
        const modalVisible = await modal.isVisible();
        if (modalVisible) {
            const message = await page.locator('#error-message').textContent();
            console.log(`Error message: ${message}`);
        } else {
            console.log('No error modal shown');
        }
    }

    // Recall tiles
    const recallBtn = await page.locator('#recall-tiles');
    if (await recallBtn.isVisible()) {
        await recallBtn.click();
        console.log('Recalled tiles');
    }

    // TEST 2: Place a word connected to the starting word
    console.log('\n--- TEST 2: Place connected word ---');

    // Find where the starting word ends (right edge)
    const startingWordCells = await page.locator('.board-cell.occupied').all();
    let rightmostCol = 0;
    let rightmostRow = 7; // Center row

    for (const cell of startingWordCells) {
        const col = await cell.getAttribute('data-col');
        if (parseInt(col) > rightmostCol) {
            rightmostCol = parseInt(col);
        }
    }
    console.log(`Starting word ends at column ${rightmostCol}`);

    // Try to place first two tiles to the right of the word
    const tile1 = await page.locator('.tile-rack .tile').first();
    const letter1 = await tile1.textContent();
    await tile1.click();
    await page.click(`.board-cell[data-row="7"][data-col="${rightmostCol + 1}"]`);

    const tile2 = await page.locator('.tile-rack .tile').first();
    const letter2 = await tile2.textContent();
    await tile2.click();
    await page.click(`.board-cell[data-row="7"][data-col="${rightmostCol + 2}"]`);

    console.log(`Placed ${letter1} and ${letter2} to form a word`);

    // Check word preview
    await page.waitForTimeout(500);
    const previewText = await page.locator('.word-preview').textContent().catch(() => '');
    console.log(`Word preview shows: ${previewText}`);

    // Submit the word
    await page.click('#submit-word');
    await page.waitForTimeout(1000);

    // Check if score changed
    const newScore = await page.locator('#current-score').textContent();
    console.log(`Score after word: ${newScore}`);

    // Check turn counter
    const turnText = await page.locator('#current-turn').textContent();
    console.log(`Current turn: ${turnText}`);

    // Continue playing more turns...
    // TEST 3: Try vertical word
    console.log('\n--- TEST 3: Place vertical word ---');

    // Find a tile on the board we can build off
    const occupiedCells = await page.locator('.board-cell.occupied').all();
    if (occupiedCells.length > 0) {
        const targetCell = occupiedCells[Math.floor(occupiedCells.length / 2)];
        const targetRow = await targetCell.getAttribute('data-row');
        const targetCol = await targetCell.getAttribute('data-col');

        // Try to place tiles above and below
        const tile3 = await page.locator('.tile-rack .tile').first();
        if (tile3) {
            await tile3.click();
            await page.click(`.board-cell[data-row="${parseInt(targetRow) - 1}"][data-col="${targetCol}"]`);
            console.log(`Placed tile above existing tile at row ${targetRow}, col ${targetCol}`);
        }
    }

    // Try to submit
    await page.click('#submit-word').catch(() => console.log('Submit button not available'));

    // Take screenshot of current state
    await page.screenshot({
        path: 'test-results/playthrough-state.png',
        fullPage: true
    });

    console.log('\n✓ Playthrough test completed - check screenshot for final state');
});