const puppeteer = require('puppeteer');

async function testTouchV3() {
  console.log('\n=== TESTING GRID SYSTEM TOUCH (V3) ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true
    }
  });

  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:8085/touch-test-v3.html');
    await page.waitForSelector('.tile');

    // Test 1: Drag tile from rack to board
    console.log('\n1. Testing drag from rack to board cell');
    console.log('=' .repeat(40));

    // Clear log
    await page.evaluate(() => {
      document.getElementById('log').innerHTML = '';
      window.logCount = 0;
    });

    // Get first tile position in rack
    const tilePos = await page.$eval('.tile-rack .tile:first-child', el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
    });

    // Get target cell position (row 3, col 3)
    const targetCell = await page.$eval('.board-cell[data-row="3"][data-col="3"]', el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
    });

    // Perform drag
    await page.touchscreen.touchStart(tilePos.x, tilePos.y);
    await new Promise(r => setTimeout(r, 50));

    // Small movement (under threshold)
    await page.touchscreen.touchMove(tilePos.x + 5, tilePos.y + 5);
    await new Promise(r => setTimeout(r, 50));

    // Larger movement (over threshold)
    await page.touchscreen.touchMove(tilePos.x + 20, tilePos.y + 20);
    await new Promise(r => setTimeout(r, 50));

    // Move to target cell
    await page.touchscreen.touchMove(targetCell.x, targetCell.y);
    await new Promise(r => setTimeout(r, 100));

    await page.touchscreen.touchEnd();
    await new Promise(r => setTimeout(r, 100));

    // Check drag results
    const dragResult = await page.evaluate(() => {
      const logs = Array.from(document.querySelectorAll('.log-entry'))
        .map(el => el.textContent);

      const cell = document.querySelector('.board-cell[data-row="3"][data-col="3"]');
      const hasTile = cell.querySelector('.tile') !== null;
      const gameState = window.gameState || { board: [], placedTiles: [] };

      return {
        logCount: logs.length,
        hasStartLog: logs.some(l => l.includes('Touch start')),
        hasDragLog: logs.some(l => l.includes('Drag started')),
        hasPlaceLog: logs.some(l => l.includes('Placed')),
        cellHasTile: hasTile,
        boardState: gameState.board[3] ? gameState.board[3][3] : 'N/A',
        placedCount: gameState.placedTiles ? gameState.placedTiles.length : 0,
        lastLog: logs[logs.length - 1] || 'No logs'
      };
    });

    console.log(`  Logs generated: ${dragResult.logCount}`);
    console.log(`  Touch start detected: ${dragResult.hasStartLog}`);
    console.log(`  Drag started: ${dragResult.hasDragLog}`);
    console.log(`  Tile placed: ${dragResult.hasPlaceLog}`);
    console.log(`  Cell has tile: ${dragResult.cellHasTile}`);
    console.log(`  Board state at [3][3]: ${dragResult.boardState}`);
    console.log(`  Placed tiles count: ${dragResult.placedCount}`);
    console.log(`  Last log: ${dragResult.lastLog}`);

    // Test 2: Tap to select then tap to place
    console.log('\n2. Testing tap-to-select then tap-to-place');
    console.log('=' .repeat(40));

    // Clear log
    await page.evaluate(() => {
      document.getElementById('log').innerHTML = '';
      window.logCount = 0;
    });

    // Get second tile position
    const tile2Pos = await page.$eval('.tile-rack .tile:nth-child(2)', el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
    });

    // Tap to select tile
    await page.touchscreen.tap(tile2Pos.x, tile2Pos.y);
    await new Promise(r => setTimeout(r, 100));

    // Check selection
    const selectResult = await page.evaluate(() => {
      const tile = document.querySelector('.tile-rack .tile:nth-child(2)');
      return {
        isSelected: tile.classList.contains('selected'),
        letter: tile.dataset.letter
      };
    });
    console.log(`  Tile ${selectResult.letter} selected: ${selectResult.isSelected}`);

    // Get empty cell position
    const emptyCell = await page.$eval('.board-cell[data-row="5"][data-col="5"]', el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
    });

    // Tap to place
    await page.touchscreen.tap(emptyCell.x, emptyCell.y);
    await new Promise(r => setTimeout(r, 100));

    // Check placement
    const placeResult = await page.evaluate(() => {
      const cell = document.querySelector('.board-cell[data-row="5"][data-col="5"]');
      const tile = cell.querySelector('.tile');
      const gameState = window.gameState || { board: [], placedTiles: [] };
      return {
        hasTile: tile !== null,
        tileLetter: tile ? tile.dataset.letter : null,
        boardState: gameState.board[5] ? gameState.board[5][5] : 'N/A',
        placedCount: gameState.placedTiles ? gameState.placedTiles.length : 0
      };
    });

    console.log(`  Cell has tile: ${placeResult.hasTile}`);
    console.log(`  Tile letter: ${placeResult.tileLetter}`);
    console.log(`  Board state at [5][5]: ${placeResult.boardState}`);
    console.log(`  Total placed tiles: ${placeResult.placedCount}`);

    await page.screenshot({ path: 'touch-v3-test.png' });

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

testTouchV3().catch(console.error);