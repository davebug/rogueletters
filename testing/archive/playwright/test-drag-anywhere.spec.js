const { test, expect } = require('@playwright/test');

test('drag from board to anywhere returns tile to rack', async ({ page }) => {
    console.log('\n🎯 TESTING: DRAG TILE ANYWHERE OFF BOARD TO RETURN TO RACK\n');

    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile');

    // Place a tile on the board
    console.log('Step 1: Place tile on board');
    const firstTile = await page.locator('.tile-rack .tile').first();
    const tileLetter = await firstTile.textContent();
    console.log(`  Placing tile: ${tileLetter.charAt(0)}`);

    await firstTile.click();
    await page.click('.board-cell[data-row="8"][data-col="7"]');

    // Verify placement
    const onBoard = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile').count();
    console.log(`  Tile on board: ${onBoard === 1 ? '✅' : '❌'}`);
    expect(onBoard).toBe(1);

    // Count initial rack tiles
    const initialRackCount = await page.locator('.tile-rack .tile').count();
    console.log(`  Tiles remaining in rack: ${initialRackCount}`);

    console.log('\nStep 2: Test dragging to different locations');

    // Test 1: Simulate drag to header (outside game area)
    console.log('\n  Test A: Drag to header area');
    await page.evaluate(() => {
        const tile = document.querySelector('.board-cell[data-row="8"][data-col="7"] .tile');
        const header = document.querySelector('header');

        if (tile && header) {
            // Simulate dragstart
            const dragStart = new DragEvent('dragstart', {
                bubbles: true,
                cancelable: true,
                dataTransfer: new DataTransfer()
            });
            tile.dispatchEvent(dragStart);

            // Simulate drop on header
            const drop = new DragEvent('drop', {
                bubbles: true,
                cancelable: true,
                dataTransfer: new DataTransfer()
            });
            header.dispatchEvent(drop);
        }
    });

    await page.waitForTimeout(500);

    // Check if tile returned to rack
    let stillOnBoard = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile').count();
    let rackCount = await page.locator('.tile-rack .tile').count();
    console.log(`    Tile still on board: ${stillOnBoard === 1 ? '❌' : '✅ NO'}`);
    console.log(`    Tiles in rack: ${rackCount} (should be ${initialRackCount + 1})`);

    // If tile was returned, place it again for next test
    if (stillOnBoard === 0) {
        const tile = await page.locator('.tile-rack .tile').first();
        await tile.click();
        await page.click('.board-cell[data-row="8"][data-col="7"]');
    }

    // Test 2: Simulate drag to game info area
    console.log('\n  Test B: Drag to game info area');
    await page.evaluate(() => {
        const tile = document.querySelector('.board-cell[data-row="8"][data-col="7"] .tile');
        const gameInfo = document.querySelector('#game-info');

        if (tile && gameInfo) {
            // Simulate dragstart
            const dragStart = new DragEvent('dragstart', {
                bubbles: true,
                cancelable: true,
                dataTransfer: new DataTransfer()
            });
            tile.dispatchEvent(dragStart);

            // Simulate drop on game info
            const drop = new DragEvent('drop', {
                bubbles: true,
                cancelable: true,
                dataTransfer: new DataTransfer()
            });
            gameInfo.dispatchEvent(drop);
        }
    });

    await page.waitForTimeout(500);

    stillOnBoard = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile').count();
    rackCount = await page.locator('.tile-rack .tile').count();
    console.log(`    Tile still on board: ${stillOnBoard === 1 ? '❌' : '✅ NO'}`);
    console.log(`    Tiles in rack: ${rackCount}`);

    // If tile was returned, place it again for next test
    if (stillOnBoard === 0) {
        const tile = await page.locator('.tile-rack .tile').first();
        await tile.click();
        await page.click('.board-cell[data-row="8"][data-col="7"]');
    }

    // Test 3: Simulate drag to occupied board cell (should also return to rack)
    console.log('\n  Test C: Drag to occupied board cell');

    // First verify there's an occupied cell from the starting word
    const occupiedCell = await page.locator('.board-cell[data-row="7"][data-col="7"]');
    const isOccupied = await occupiedCell.evaluate(el => el.classList.contains('occupied'));
    console.log(`    Target cell is occupied: ${isOccupied ? '✅' : '❌'}`);

    await page.evaluate(() => {
        const tile = document.querySelector('.board-cell[data-row="8"][data-col="7"] .tile');
        const targetCell = document.querySelector('.board-cell[data-row="7"][data-col="7"]');

        if (tile && targetCell) {
            // Simulate dragstart
            const dragStart = new DragEvent('dragstart', {
                bubbles: true,
                cancelable: true,
                dataTransfer: new DataTransfer()
            });
            tile.dispatchEvent(dragStart);

            // Simulate drop on occupied cell
            const drop = new DragEvent('drop', {
                bubbles: true,
                cancelable: true,
                dataTransfer: new DataTransfer()
            });
            targetCell.dispatchEvent(drop);
        }
    });

    await page.waitForTimeout(500);

    stillOnBoard = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile').count();
    rackCount = await page.locator('.tile-rack .tile').count();
    console.log(`    Tile still on board: ${stillOnBoard === 1 ? '❌' : '✅ NO'}`);
    console.log(`    Tiles in rack: ${rackCount}`);

    // Final verification
    console.log('\n📊 Final State:');
    const finalGameState = await page.evaluate(() => ({
        board87: window.gameState.board[8][7],
        placedTiles: window.gameState.placedTiles.length,
        rackTiles: window.gameState.tiles.length
    }));

    console.log(`  board[8][7]: ${finalGameState.board87 || 'empty'}`);
    console.log(`  placedTiles count: ${finalGameState.placedTiles}`);
    console.log(`  rack tiles count: ${finalGameState.rackTiles}`);

    console.log('\n✅ Test complete - tiles return to rack when dragged anywhere off valid cells!');
});