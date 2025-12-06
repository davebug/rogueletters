const { test, expect } = require('@playwright/test');

test('simple drag from board to rack test', async ({ page }) => {
    console.log('\n🎯 TESTING SIMPLE DRAG FROM BOARD TO RACK\n');

    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile');

    // Step 1: Place a tile on the board by clicking
    console.log('Step 1: Placing tile on board...');
    const firstTile = await page.locator('.tile-rack .tile').first();
    const tileLetter = await firstTile.textContent();
    console.log(`  Tile letter: ${tileLetter.charAt(0)}`);

    // Click tile to select
    await firstTile.click();

    // Click board cell to place
    await page.click('.board-cell[data-row="8"][data-col="7"]');

    // Verify tile is on board
    const tileOnBoard = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile').count();
    console.log(`  Tile on board: ${tileOnBoard === 1 ? '✅' : '❌'}`);
    expect(tileOnBoard).toBe(1);

    // Check if cell has placed-this-turn class
    const hasPlacedClass = await page.locator('.board-cell[data-row="8"][data-col="7"]').evaluate(
        el => el.classList.contains('placed-this-turn')
    );
    console.log(`  Has placed-this-turn class: ${hasPlacedClass ? '✅' : '❌'}`);

    // Step 2: Try to drag it back to rack
    console.log('\nStep 2: Dragging tile back to rack...');
    const boardTile = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile');

    // Log tile properties before drag
    const tileInfo = await boardTile.evaluate(el => ({
        draggable: el.draggable,
        classes: Array.from(el.classList),
        parent: el.parentElement?.className
    }));
    console.log('  Tile info:', JSON.stringify(tileInfo, null, 2));

    // Try dragging back to rack
    await boardTile.dragTo(page.locator('#tile-rack'));

    await page.waitForTimeout(1000);

    // Check if tile is still on board
    const stillOnBoard = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile').count();
    console.log(`  Tile still on board: ${stillOnBoard === 1 ? '❌' : '✅'}`);

    // Check if tile is in rack
    const rackTileCount = await page.locator('.tile-rack .tile').count();
    console.log(`  Tiles in rack: ${rackTileCount}`);

    // Debug: Check gameState
    const gameStateInfo = await page.evaluate(() => ({
        placedTiles: window.gameState.placedTiles,
        tiles: window.gameState.tiles,
        board87: window.gameState.board[8][7]
    }));
    console.log('\n  GameState debug:');
    console.log('    placedTiles:', JSON.stringify(gameStateInfo.placedTiles));
    console.log('    tiles:', JSON.stringify(gameStateInfo.tiles));
    console.log('    board[8][7]:', gameStateInfo.board87);

    expect(stillOnBoard).toBe(0);
    console.log('\n✅ Test complete!');
});