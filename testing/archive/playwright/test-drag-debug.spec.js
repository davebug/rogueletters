const { test, expect } = require('@playwright/test');

test('debug drag from board to rack', async ({ page }) => {
    console.log('\n🔍 DEBUG: DRAG FROM BOARD TO RACK\n');

    // Add console listener to see browser console logs
    page.on('console', msg => {
        if (msg.type() === 'log') {
            console.log('Browser log:', msg.text());
        }
    });

    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile');

    // Inject debugging code
    await page.evaluate(() => {
        // Override returnBoardTileToRack to add logging
        const original = window.returnBoardTileToRack;
        window.returnBoardTileToRack = function(fromPos) {
            console.log('returnBoardTileToRack called with:', fromPos);
            if (original) {
                return original.call(this, fromPos);
            }
        };

        // Override handleDrop to add logging
        const originalDrop = window.handleDrop;
        window.handleDrop = function(e) {
            const rack = e.target.closest('#tile-rack');
            console.log('handleDrop: rack element found?', !!rack);
            console.log('handleDrop: draggedFromBoard?', window.draggedFromBoard);
            if (originalDrop) {
                return originalDrop.call(this, e);
            }
        };
    });

    // Place a tile on the board
    console.log('Placing tile on board...');
    const firstTile = await page.locator('.tile-rack .tile').first();
    await firstTile.click();
    await page.click('.board-cell[data-row="8"][data-col="7"]');

    // Verify placement
    const placed = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile').count();
    console.log(`Tile placed: ${placed === 1 ? '✅' : '❌'}`);

    // Check class
    const hasClass = await page.locator('.board-cell[data-row="8"][data-col="7"]').evaluate(
        el => el.classList.contains('placed-this-turn')
    );
    console.log(`Has placed-this-turn: ${hasClass ? '✅' : '❌'}`);

    // Now manually trigger drag events to debug
    console.log('\nManually triggering drag events...');

    await page.evaluate(() => {
        const tile = document.querySelector('.board-cell[data-row="8"][data-col="7"] .tile');
        const rack = document.getElementById('tile-rack');

        if (!tile || !rack) {
            console.log('ERROR: tile or rack not found');
            return;
        }

        // Simulate dragstart
        const dragStartEvent = new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer()
        });
        tile.dispatchEvent(dragStartEvent);
        console.log('Dispatched dragstart');

        // Check state after dragstart
        console.log('After dragstart - draggedFromBoard:', window.draggedFromBoard);
        console.log('After dragstart - selectedTile:', window.selectedTile);

        // Simulate dragover on rack
        const dragOverEvent = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer()
        });
        rack.dispatchEvent(dragOverEvent);
        console.log('Dispatched dragover on rack');

        // Simulate drop on rack
        const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer()
        });
        rack.dispatchEvent(dropEvent);
        console.log('Dispatched drop on rack');
    });

    await page.waitForTimeout(1000);

    // Check result
    const stillOnBoard = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile').count();
    console.log(`\nTile still on board: ${stillOnBoard === 1 ? '❌ YES' : '✅ NO'}`);

    const gameState = await page.evaluate(() => ({
        board87: window.gameState.board[8][7],
        placedTiles: window.gameState.placedTiles,
        tiles: window.gameState.tiles
    }));

    console.log('\nGameState after drag:');
    console.log('  board[8][7]:', gameState.board87);
    console.log('  placedTiles:', JSON.stringify(gameState.placedTiles));
    console.log('  tiles:', JSON.stringify(gameState.tiles));
});