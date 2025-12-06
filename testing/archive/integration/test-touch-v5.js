const puppeteer = require('puppeteer');

async function testTouchV5() {
  console.log('\n=== TESTING V5 - EXACT WIKILETTERS TOUCH ===\n');

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
    await page.goto('http://localhost:8085/touch-test-v5.html');
    await page.waitForSelector('.tile');

    // Test 1: Drag from rack to board
    console.log('\n1. Testing drag from rack to board');
    console.log('=' .repeat(40));

    // Clear log
    await page.evaluate(() => {
      document.getElementById('log').innerHTML = '';
      window.logCount = 0;
    });

    // Get first tile position in rack
    const tilePos = await page.$eval('#tile-rack .tile:first-child', el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
    });

    // Get empty cell position
    const targetCell = await page.$eval('.board-cell[data-row="10"][data-col="10"]', el => {
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

    // Check results
    const dragResult = await page.evaluate(() => {
      const logs = Array.from(document.querySelectorAll('.log-entry'))
        .map(el => el.textContent);
      const cell = document.querySelector('.board-cell[data-row="10"][data-col="10"]');
      const hasTile = cell.querySelector('.tile') !== null;

      return {
        logCount: logs.length,
        hasStartLog: logs.some(l => l.includes('Touch start')),
        hasThresholdLog: logs.some(l => l.includes('threshold exceeded')),
        hasPlaceLog: logs.some(l => l.includes('Placing')),
        cellHasTile: hasTile,
        cellHasPlacedThisTurn: cell.classList.contains('placed-this-turn'),
        lastLog: logs[logs.length - 1] || 'No logs'
      };
    });

    console.log(`  Logs: ${dragResult.logCount}`);
    console.log(`  Touch start: ${dragResult.hasStartLog}`);
    console.log(`  Threshold exceeded: ${dragResult.hasThresholdLog}`);
    console.log(`  Place log: ${dragResult.hasPlaceLog}`);
    console.log(`  Cell has tile: ${dragResult.cellHasTile}`);
    console.log(`  Cell marked placed-this-turn: ${dragResult.cellHasPlacedThisTurn}`);
    console.log(`  Last log: ${dragResult.lastLog}`);

    // Test 2: Try to move a starting word tile (should fail)
    console.log('\n2. Testing drag of starting word tile (should fail)');
    console.log('=' .repeat(40));

    // Clear log
    await page.evaluate(() => {
      document.getElementById('log').innerHTML = '';
      window.logCount = 0;
    });

    // Try to drag a starting word tile
    const startingTilePos = await page.$eval('.board-cell[data-row="7"][data-col="5"] .tile', el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
    });

    const emptyCell2 = await page.$eval('.board-cell[data-row="11"][data-col="11"]', el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
    });

    // Try to drag
    await page.touchscreen.touchStart(startingTilePos.x, startingTilePos.y);
    await new Promise(r => setTimeout(r, 50));
    await page.touchscreen.touchMove(startingTilePos.x + 20, startingTilePos.y + 20);
    await new Promise(r => setTimeout(r, 50));
    await page.touchscreen.touchMove(emptyCell2.x, emptyCell2.y);
    await new Promise(r => setTimeout(r, 100));
    await page.touchscreen.touchEnd();
    await new Promise(r => setTimeout(r, 100));

    const startingResult = await page.evaluate(() => {
      const logs = Array.from(document.querySelectorAll('.log-entry'))
        .map(el => el.textContent);
      return {
        hasError: logs.some(l => l.includes("Can't move")),
        lastLog: logs[logs.length - 1] || 'No logs'
      };
    });

    console.log(`  Error shown: ${startingResult.hasError}`);
    console.log(`  Last log: ${startingResult.lastLog}`);

    // Test 3: Move tile from board to board (after placing one)
    console.log('\n3. Testing board-to-board movement');
    console.log('=' .repeat(40));

    // First check if we have a tile on the board from test 1
    const hasTileOnBoard = await page.evaluate(() => {
      const cell = document.querySelector('.board-cell[data-row="10"][data-col="10"]');
      return cell.querySelector('.tile') !== null;
    });

    if (hasTileOnBoard) {
      // Clear log
      await page.evaluate(() => {
        document.getElementById('log').innerHTML = '';
        window.logCount = 0;
      });

      // Get position of the tile we placed
      const placedTilePos = await page.$eval('.board-cell[data-row="10"][data-col="10"] .tile', el => {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
      });

      // Get new empty cell
      const newCell = await page.$eval('.board-cell[data-row="12"][data-col="12"]', el => {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
      });

      // Drag from board to board
      await page.touchscreen.touchStart(placedTilePos.x, placedTilePos.y);
      await new Promise(r => setTimeout(r, 50));
      await page.touchscreen.touchMove(placedTilePos.x + 20, placedTilePos.y + 20);
      await new Promise(r => setTimeout(r, 50));
      await page.touchscreen.touchMove(newCell.x, newCell.y);
      await new Promise(r => setTimeout(r, 100));
      await page.touchscreen.touchEnd();
      await new Promise(r => setTimeout(r, 100));

      const moveResult = await page.evaluate(() => {
        const logs = Array.from(document.querySelectorAll('.log-entry'))
          .map(el => el.textContent);
        const oldCell = document.querySelector('.board-cell[data-row="10"][data-col="10"]');
        const newCell = document.querySelector('.board-cell[data-row="12"][data-col="12"]');

        return {
          hasMoveLog: logs.some(l => l.includes('Moving tile from')),
          oldCellEmpty: !oldCell.querySelector('.tile'),
          newCellHasTile: !!newCell.querySelector('.tile'),
          lastLog: logs[logs.length - 1] || 'No logs'
        };
      });

      console.log(`  Move log present: ${moveResult.hasMoveLog}`);
      console.log(`  Old cell empty: ${moveResult.oldCellEmpty}`);
      console.log(`  New cell has tile: ${moveResult.newCellHasTile}`);
      console.log(`  Last log: ${moveResult.lastLog}`);
    } else {
      console.log('  Skipped - no tile on board from test 1');
    }

    await page.screenshot({ path: 'touch-v5-test.png' });

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

testTouchV5().catch(console.error);