const puppeteer = require('puppeteer');

async function testTouchV4() {
  console.log('\n=== TESTING V4 WITH STARTING WORDS ===\n');

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
    await page.goto('http://localhost:8085/touch-test-v4.html');
    await page.waitForSelector('.tile');

    // Test 1: Check starting words are placed
    console.log('\n1. Checking starting words');
    console.log('=' .repeat(40));

    const startingWords = await page.evaluate(() => {
      const cells = document.querySelectorAll('.board-cell.starting-word');
      return {
        count: cells.length,
        hasHello: Array.from(cells).some(c => {
          const tile = c.querySelector('.tile');
          return tile && tile.dataset.letter === 'H';
        }),
        hasWorld: Array.from(cells).some(c => {
          const tile = c.querySelector('.tile');
          return tile && tile.dataset.letter === 'W';
        })
      };
    });

    console.log(`  Starting word cells: ${startingWords.count}`);
    console.log(`  Has 'HELLO': ${startingWords.hasHello}`);
    console.log(`  Has 'WORLD': ${startingWords.hasWorld}`);

    // Test 2: Drag tile from rack to empty cell
    console.log('\n2. Testing drag to empty cell');
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

    // Get empty cell position (row 10, col 10)
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

    // Check drag results
    const dragResult = await page.evaluate(() => {
      const logs = Array.from(document.querySelectorAll('.log-entry'))
        .map(el => el.textContent);

      const cell = document.querySelector('.board-cell[data-row="10"][data-col="10"]');
      const hasTile = cell.querySelector('.tile') !== null;

      return {
        logCount: logs.length,
        hasStartLog: logs.some(l => l.includes('Touch start')),
        hasDragLog: logs.some(l => l.includes('Drag started')),
        hasPlaceLog: logs.some(l => l.includes('Placed')),
        cellHasTile: hasTile,
        lastLog: logs[logs.length - 1] || 'No logs'
      };
    });

    console.log(`  Logs generated: ${dragResult.logCount}`);
    console.log(`  Touch start detected: ${dragResult.hasStartLog}`);
    console.log(`  Drag started: ${dragResult.hasDragLog}`);
    console.log(`  Tile placed: ${dragResult.hasPlaceLog}`);
    console.log(`  Cell has tile: ${dragResult.cellHasTile}`);
    console.log(`  Last log: ${dragResult.lastLog}`);

    // Test 3: Try to drag to occupied cell
    console.log('\n3. Testing drag to occupied cell');
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

    // Try to drag to starting word cell (row 7, col 5 - first letter of HELLO)
    const occupiedCell = await page.$eval('.board-cell[data-row="7"][data-col="5"]', el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
    });

    // Perform drag
    await page.touchscreen.touchStart(tile2Pos.x, tile2Pos.y);
    await new Promise(r => setTimeout(r, 50));

    // Move past threshold
    await page.touchscreen.touchMove(tile2Pos.x + 20, tile2Pos.y + 20);
    await new Promise(r => setTimeout(r, 50));

    // Move to occupied cell
    await page.touchscreen.touchMove(occupiedCell.x, occupiedCell.y);
    await new Promise(r => setTimeout(r, 100));

    await page.touchscreen.touchEnd();
    await new Promise(r => setTimeout(r, 100));

    // Check results
    const occupiedResult = await page.evaluate(() => {
      const logs = Array.from(document.querySelectorAll('.log-entry'))
        .map(el => el.textContent);

      return {
        hasErrorLog: logs.some(l => l.includes('occupied')),
        lastLog: logs[logs.length - 1] || 'No logs'
      };
    });

    console.log(`  Occupied error shown: ${occupiedResult.hasErrorLog}`);
    console.log(`  Last log: ${occupiedResult.lastLog}`);

    await page.screenshot({ path: 'touch-v4-test.png' });

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

testTouchV4().catch(console.error);