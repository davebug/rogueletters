const { test, expect } = require('@playwright/test');

test('start over button resets game', async ({ page }) => {
    console.log('\n🔄 TESTING START OVER FUNCTIONALITY\n');

    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile');

    // Get initial game state
    const startingWord = await page.evaluate(() => {
        const tiles = document.querySelectorAll('.board-cell.occupied .tile');
        return Array.from(tiles).map(t => t.textContent.charAt(0)).join('');
    });
    console.log(`Starting word: ${startingWord}`);

    // Play a few moves
    console.log('\nPlaying some moves...');

    // Place first tile
    const firstTile = await page.locator('.tile-rack .tile').first();
    const firstLetter = await firstTile.textContent();
    await firstTile.click();
    await page.click('.board-cell[data-row="8"][data-col="7"]');

    // Submit word
    await page.click('#submit-word');
    await page.waitForTimeout(1500);

    // Check if word was accepted (if not, just continue)
    const errorModal = await page.locator('#error-modal');
    if (await errorModal.isVisible()) {
        await page.click('#close-error');
        await page.click('#recall-tiles');
    }

    // Get current state
    const beforeReset = await page.evaluate(() => ({
        score: document.getElementById('current-score').textContent,
        turn: document.getElementById('current-turn').textContent,
        tilesInRack: document.querySelectorAll('.tile-rack .tile').length,
        placedTilesCount: window.gameState.placedTiles.length,
        boardTilesCount: document.querySelectorAll('.board-cell.placed-this-turn').length
    }));

    console.log('\nGame state before reset:');
    console.log(`  Score: ${beforeReset.score}`);
    console.log(`  Turn: ${beforeReset.turn}`);
    console.log(`  Tiles in rack: ${beforeReset.tilesInRack}`);
    console.log(`  Placed tiles: ${beforeReset.placedTilesCount}`);
    console.log(`  Board tiles from turns: ${beforeReset.boardTilesCount}`);

    // Click Start Over button
    console.log('\n🔄 Clicking Start Over button...');

    // Set up dialog handler for the confirmation
    page.once('dialog', async dialog => {
        console.log(`Confirmation dialog: "${dialog.message()}"`);
        await dialog.accept();
    });

    await page.click('#start-over');

    // Wait for page to reload
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile');

    console.log('Page reloaded after start over');

    // Check that game has been reset
    const afterReset = await page.evaluate(() => ({
        score: document.getElementById('current-score').textContent,
        turn: document.getElementById('current-turn').textContent,
        tilesInRack: document.querySelectorAll('.tile-rack .tile').length,
        placedTilesCount: window.gameState.placedTiles.length,
        boardTilesCount: document.querySelectorAll('.board-cell.placed-this-turn').length,
        currentTurn: window.gameState.currentTurn,
        turnHistory: window.gameState.turnHistory.length
    }));

    // Verify starting word is the same
    const newStartingWord = await page.evaluate(() => {
        const tiles = document.querySelectorAll('.board-cell.occupied .tile');
        return Array.from(tiles).map(t => t.textContent.charAt(0)).join('');
    });

    console.log('\n📊 Game state after reset:');
    console.log(`  Score: ${afterReset.score}`);
    console.log(`  Turn: ${afterReset.turn}`);
    console.log(`  Tiles in rack: ${afterReset.tilesInRack}`);
    console.log(`  Placed tiles: ${afterReset.placedTilesCount}`);
    console.log(`  Board tiles from turns: ${afterReset.boardTilesCount}`);
    console.log(`  Starting word: ${newStartingWord}`);

    // Assertions
    expect(afterReset.score).toBe('0');
    expect(afterReset.turn).toBe('1/5');
    expect(afterReset.tilesInRack).toBe(7); // Should have full rack
    expect(afterReset.placedTilesCount).toBe(0);
    expect(afterReset.boardTilesCount).toBe(0);
    expect(afterReset.currentTurn).toBe(1);
    expect(afterReset.turnHistory).toBe(0);
    expect(newStartingWord).toBe(startingWord); // Same starting word

    console.log('\n✅ Start Over button successfully resets the game!');
});

test('start over preserves seed and date', async ({ page }) => {
    console.log('\n📅 Testing that Start Over preserves seed/date\n');

    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Get initial seed and date
    const initialInfo = await page.evaluate(() => ({
        seed: window.gameState.seed,
        date: window.gameState.dateStr,
        url: window.location.href
    }));

    console.log(`Initial seed: ${initialInfo.seed}`);
    console.log(`Initial date: ${initialInfo.date}`);

    // Click Start Over
    page.once('dialog', async dialog => {
        await dialog.accept();
    });

    await page.click('#start-over');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Get seed and date after reset
    const afterInfo = await page.evaluate(() => ({
        seed: window.gameState.seed,
        date: window.gameState.dateStr,
        url: window.location.href
    }));

    console.log(`\nAfter reset seed: ${afterInfo.seed}`);
    console.log(`After reset date: ${afterInfo.date}`);

    // Should have the same seed and date
    expect(afterInfo.seed).toBe(initialInfo.seed);
    expect(afterInfo.date).toBe(initialInfo.date);
    expect(afterInfo.url).toContain(`seed=${initialInfo.seed}`);

    console.log('\n✅ Seed and date preserved after Start Over!');
});