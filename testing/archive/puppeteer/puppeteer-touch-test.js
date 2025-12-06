const puppeteer = require('puppeteer');

async function testWithPuppeteer() {
  console.log('\n=== PUPPETEER TOUCH TEST ===\n');

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

  // Enable touch
  await page.setViewport({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true
  });

  try {
    // Navigate to the game
    await page.goto('http://localhost:8085?v=' + Date.now());
    await page.waitForSelector('#tile-rack .tile', { timeout: 5000 });

    console.log('1. Initial state:');

    const initialState = await page.evaluate(() => {
      return {
        tilesInRack: document.querySelectorAll('#tile-rack .tile').length,
        boardOccupied: document.querySelectorAll('.board-cell.occupied').length,
        submitVisible: document.querySelector('#mobile-submit-container')?.style.display !== 'none'
      };
    });
    console.log('   Tiles in rack:', initialState.tilesInRack);
    console.log('   Board occupied cells:', initialState.boardOccupied);
    console.log('   Submit visible:', initialState.submitVisible);

    console.log('\n2. Testing touch drag:');

    // Get first tile position
    const tileBox = await page.$eval('#tile-rack .tile:first-child', el => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2
      };
    });

    // Get target cell position (center of board)
    const cellBox = await page.$eval('.board-cell[data-row="7"][data-col="8"]', el => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2
      };
    });

    // Simulate touch drag
    await page.touchscreen.touchStart(tileBox.x, tileBox.y);
    await page.evaluate(() => new Promise(r => setTimeout(r, 100)));

    // Move in small steps to trigger drag
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      const x = tileBox.x + (cellBox.x - tileBox.x) * (i / steps);
      const y = tileBox.y + (cellBox.y - tileBox.y) * (i / steps);
      await page.touchscreen.touchMove(x, y);
      await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
    }

    await page.touchscreen.touchEnd();
    await page.evaluate(() => new Promise(r => setTimeout(r,500)));

    const afterDrag = await page.evaluate(() => {
      return {
        tilesInRack: document.querySelectorAll('#tile-rack .tile').length,
        placedTiles: gameState.placedTiles ? gameState.placedTiles.length : 0,
        mobilePotentialClass: document.querySelector('#mobile-potential-words')?.className,
        submitVisible: document.querySelector('#mobile-submit-container')?.style.display !== 'none'
      };
    });

    console.log('   Tiles in rack after drag:', afterDrag.tilesInRack);
    console.log('   Placed tiles:', afterDrag.placedTiles);
    console.log('   Mobile potential classes:', afterDrag.mobilePotentialClass);
    console.log('   Submit visible:', afterDrag.submitVisible);

    console.log('\n3. Testing tap to place:');

    // Try tap to select and place
    await page.tap('#tile-rack .tile:first-child');
    await page.evaluate(() => new Promise(r => setTimeout(r,200)));

    const afterTap1 = await page.evaluate(() => {
      const selected = document.querySelector('#tile-rack .tile.selected');
      return selected ? selected.dataset.letter : null;
    });
    console.log('   Selected tile:', afterTap1);

    // Find and tap an empty cell
    const emptyCell = await page.$('.board-cell:not(.occupied)');
    if (emptyCell) {
      await emptyCell.tap();
    } else {
      console.log('   No empty cells found!');
    }
    await page.evaluate(() => new Promise(r => setTimeout(r,500)));

    const afterTap2 = await page.evaluate(() => {
      return {
        tilesInRack: document.querySelectorAll('#tile-rack .tile').length,
        placedTiles: gameState.placedTiles ? gameState.placedTiles.length : 0
      };
    });
    console.log('   Tiles in rack after tap:', afterTap2.tilesInRack);
    console.log('   Placed tiles after tap:', afterTap2.placedTiles);

    console.log('\n4. Checking word detection:');

    const wordInfo = await page.evaluate(() => {
      // Force word check
      if (window.checkWordValidity) {
        window.checkWordValidity();
      }

      const wordsList = document.querySelector('#mobile-potential-words-list');
      return {
        hasWords: wordsList ? wordsList.children.length > 0 : false,
        content: wordsList ? wordsList.textContent : '',
        submitEnabled: document.querySelector('#mobile-submit-container button:not(:disabled)') !== null
      };
    });

    console.log('   Has words:', wordInfo.hasWords);
    console.log('   Words content:', wordInfo.content.substring(0, 50));
    console.log('   Submit enabled:', wordInfo.submitEnabled);

    // Take screenshot
    await page.screenshot({ path: 'puppeteer-test.png' });

    console.log('\n=== TEST COMPLETE ===\n');

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testWithPuppeteer().catch(console.error);