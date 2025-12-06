const puppeteer = require('puppeteer');

async function testActualGame() {
  console.log('\n=== TESTING ACTUAL WIKILETTERS GAME ===\n');

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
    // Clear cache to get new script version
    await page.goto('http://localhost:8085/', { waitUntil: 'networkidle2' });

    // Check script version
    const scriptVersion = await page.evaluate(() => {
      const scriptTag = document.querySelector('script[src*="script.js"]');
      return scriptTag ? scriptTag.src : 'not found';
    });
    console.log('Script version:', scriptVersion);

    // Wait for game to initialize
    await page.waitForSelector('.tile', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 500));

    // Test 1: Drag from rack to board
    console.log('\n1. Testing drag from rack to board');
    console.log('=' .repeat(40));

    // Get first tile position in rack
    const tilePos = await page.$eval('#tile-rack .tile:first-child', el => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width/2,
        y: rect.top + rect.height/2,
        letter: el.dataset.letter
      };
    });
    console.log(`  Dragging tile: ${tilePos.letter}`);

    // Find an empty cell (try multiple positions)
    let targetCell = null;
    for (let row of [8, 9, 10]) {
      for (let col of [8, 9, 10]) {
        const isEmpty = await page.evaluate((r, c) => {
          const cell = document.querySelector(`.board-cell[data-row="${r}"][data-col="${c}"]`);
          return cell && !cell.querySelector('.tile');
        }, row, col);

        if (isEmpty) {
          targetCell = await page.$eval(`.board-cell[data-row="${row}"][data-col="${col}"]`, el => {
            const rect = el.getBoundingClientRect();
            return {
              x: rect.left + rect.width/2,
              y: rect.top + rect.height/2,
              row: el.dataset.row,
              col: el.dataset.col
            };
          });
          break;
        }
      }
      if (targetCell) break;
    }

    if (!targetCell) {
      console.log('  No empty cells found nearby!');
      return;
    }

    console.log(`  Target cell: (${targetCell.row}, ${targetCell.col})`);

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
    await new Promise(r => setTimeout(r, 200));

    // Check if placement worked
    const placementResult = await page.evaluate((row, col) => {
      const cell = document.querySelector(`.board-cell[data-row="${row}"][data-col="${col}"]`);
      const tile = cell ? cell.querySelector('.tile') : null;
      return {
        hasTile: !!tile,
        letter: tile ? tile.dataset.letter : null,
        cellHasPlacedThisTurn: cell ? cell.classList.contains('placed-this-turn') : false
      };
    }, targetCell.row, targetCell.col);

    console.log(`  Placement successful: ${placementResult.hasTile}`);
    console.log(`  Letter placed: ${placementResult.letter}`);
    console.log(`  Cell marked placed-this-turn: ${placementResult.cellHasPlacedThisTurn}`);

    // Test 2: Move tile from board to another board position
    if (placementResult.hasTile) {
      console.log('\n2. Testing board-to-board movement');
      console.log('=' .repeat(40));

      await new Promise(r => setTimeout(r, 200));

      // Get position of the tile we just placed
      const placedTilePos = await page.$eval(
        `.board-cell[data-row="${targetCell.row}"][data-col="${targetCell.col}"] .tile`,
        el => {
          const rect = el.getBoundingClientRect();
          return {
            x: rect.left + rect.width/2,
            y: rect.top + rect.height/2
          };
        }
      );

      // Find another empty cell
      let newTarget = null;
      const newRow = parseInt(targetCell.row) + 1;
      const newCol = parseInt(targetCell.col) + 1;

      const isEmpty = await page.evaluate((r, c) => {
        const cell = document.querySelector(`.board-cell[data-row="${r}"][data-col="${c}"]`);
        return cell && !cell.querySelector('.tile');
      }, newRow, newCol);

      if (isEmpty) {
        newTarget = await page.$eval(`.board-cell[data-row="${newRow}"][data-col="${newCol}"]`, el => {
          const rect = el.getBoundingClientRect();
          return {
            x: rect.left + rect.width/2,
            y: rect.top + rect.height/2,
            row: el.dataset.row,
            col: el.dataset.col
          };
        });

        console.log(`  Moving from (${targetCell.row},${targetCell.col}) to (${newTarget.row},${newTarget.col})`);

        // Perform board-to-board drag
        await page.touchscreen.touchStart(placedTilePos.x, placedTilePos.y);
        await new Promise(r => setTimeout(r, 50));

        // Move past threshold
        await page.touchscreen.touchMove(placedTilePos.x + 15, placedTilePos.y + 15);
        await new Promise(r => setTimeout(r, 50));

        // Move to new cell
        await page.touchscreen.touchMove(newTarget.x, newTarget.y);
        await new Promise(r => setTimeout(r, 100));

        await page.touchscreen.touchEnd();
        await new Promise(r => setTimeout(r, 200));

        // Check results
        const moveResult = await page.evaluate((oldRow, oldCol, newRow, newCol) => {
          const oldCell = document.querySelector(`.board-cell[data-row="${oldRow}"][data-col="${oldCol}"]`);
          const newCell = document.querySelector(`.board-cell[data-row="${newRow}"][data-col="${newCol}"]`);

          return {
            oldCellEmpty: oldCell ? !oldCell.querySelector('.tile') : 'cell not found',
            newCellHasTile: newCell ? !!newCell.querySelector('.tile') : 'cell not found',
            newCellLetter: newCell && newCell.querySelector('.tile') ?
                          newCell.querySelector('.tile').dataset.letter : null
          };
        }, targetCell.row, targetCell.col, newTarget.row, newTarget.col);

        console.log(`  Old cell empty: ${moveResult.oldCellEmpty}`);
        console.log(`  New cell has tile: ${moveResult.newCellHasTile}`);
        console.log(`  Letter at new position: ${moveResult.newCellLetter}`);
      } else {
        console.log('  No empty cell found for board-to-board test');
      }
    }

    await page.screenshot({ path: 'actual-game-test.png' });

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

testActualGame().catch(console.error);