const { test, expect } = require('@playwright/test');

test('debug word preview feature', async ({ page }) => {
    // Go to game
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#game-board', { timeout: 10000 });

    // Wait for tiles to load and starting word to be placed
    await page.waitForSelector('.tile-rack .tile');
    await page.waitForTimeout(1000);

    // Log starting word position
    const startingCells = await page.locator('.board-cell.occupied:not(.placed-this-turn)').all();
    console.log('Starting word tiles:', startingCells.length);

    // Check game state
    const gameState = await page.evaluate(() => window.gameState);
    console.log('Current turn:', gameState.currentTurn);
    console.log('Placed tiles:', gameState.placedTiles);
    console.log('Starting word:', gameState.startingWord);

    // Place a tile next to starting word
    const firstTile = await page.locator('.tile-rack .tile').first();
    const letter = await firstTile.locator('.tile-letter').textContent();
    console.log('Placing tile:', letter);

    await firstTile.click();

    // Find where starting word ends (assuming horizontal)
    // COMPANY is at row 7, cols 4-10, so place at col 11
    await page.click('.board-cell[data-row="7"][data-col="11"]');

    // Wait a moment
    await page.waitForTimeout(500);

    // Check if tile was placed
    const placedTile = await page.locator('.board-cell[data-row="7"][data-col="11"] .tile').isVisible();
    console.log('Tile placed at col 11:', placedTile);

    // Check game state again
    const updatedState = await page.evaluate(() => window.gameState);
    console.log('Placed tiles after placement:', updatedState.placedTiles);
    console.log('Board row 7:', updatedState.board[7]);

    // Check if word preview exists
    const previewExists = await page.locator('#word-preview').count();
    console.log('Word preview element exists:', previewExists);

    if (previewExists > 0) {
        const isVisible = await page.locator('#word-preview').isVisible();
        console.log('Word preview visible:', isVisible);

        if (isVisible) {
            const wordsText = await page.locator('.preview-words').textContent();
            const scoreText = await page.locator('.preview-score').textContent();
            console.log('Preview words:', wordsText);
            console.log('Preview score:', scoreText);
        }
    }

    // Try calling updateWordPreview manually
    const result = await page.evaluate(() => {
        if (typeof updateWordPreview === 'function') {
            updateWordPreview();
            return 'Called updateWordPreview';
        }
        return 'Function not found';
    });
    console.log('Manual update result:', result);

    // Check again after manual call
    if (previewExists > 0) {
        const isVisible = await page.locator('#word-preview').isVisible();
        console.log('Word preview visible after manual call:', isVisible);
    }
});