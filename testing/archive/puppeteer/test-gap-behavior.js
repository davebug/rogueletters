const puppeteer = require('puppeteer');

async function testGapBehavior() {
  console.log('\n=== TESTING TILE RACK GAP BEHAVIOR ===\n');

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
    await page.goto('http://localhost:8085/', { waitUntil: 'networkidle2' });

    // Wait for game to initialize
    await page.waitForSelector('.tile', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 500));

    // Get initial rack state
    console.log('1. Initial rack state');
    console.log('=' .repeat(40));

    const initialState = await page.evaluate(() => {
      const tiles = Array.from(document.querySelectorAll('#tile-rack .tile'));
      return {
        tileCount: tiles.length,
        tileLetters: tiles.map(t => t.dataset.letter),
        rackChildren: document.getElementById('tile-rack').children.length
      };
    });

    console.log(`  Tiles in rack: ${initialState.tileCount}`);
    console.log(`  Letters: ${initialState.tileLetters.join(' ')}`);
    console.log(`  Total rack children: ${initialState.rackChildren}`);

    // Test 1: Start dragging a tile from middle of rack
    console.log('\n2. Testing drag from middle of rack');
    console.log('=' .repeat(40));

    // Pick the 3rd tile (index 2)
    const thirdTilePos = await page.$eval('#tile-rack .tile:nth-child(3)', el => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width/2,
        y: rect.top + rect.height/2,
        letter: el.dataset.letter
      };
    });

    console.log(`  Dragging tile: ${thirdTilePos.letter}`);

    // Start touch drag
    await page.touchscreen.touchStart(thirdTilePos.x, thirdTilePos.y);
    await new Promise(r => setTimeout(r, 50));

    // Move past threshold to trigger drag
    await page.touchscreen.touchMove(thirdTilePos.x + 15, thirdTilePos.y + 15);
    await new Promise(r => setTimeout(r, 50));

    // Check for placeholder creation
    const dragStartState = await page.evaluate(() => {
      const placeholder = document.querySelector('.tile-placeholder');
      const draggedTile = document.querySelector('.tile.dragging-source');
      const insertionGap = document.querySelector('.insertion-gap');
      const rack = document.getElementById('tile-rack');

      // Find position of placeholder in rack
      let placeholderIndex = -1;
      if (placeholder) {
        const children = Array.from(rack.children);
        placeholderIndex = children.indexOf(placeholder);
      }

      return {
        hasPlaceholder: placeholder !== null,
        placeholderIndex: placeholderIndex,
        hasDraggingTile: draggedTile !== null,
        hasInsertionGap: insertionGap !== null,
        rackHasActiveClass: rack.classList.contains('dragging-active'),
        totalRackChildren: rack.children.length
      };
    });

    console.log(`  Placeholder created: ${dragStartState.hasPlaceholder}`);
    console.log(`  Placeholder at index: ${dragStartState.placeholderIndex}`);
    console.log(`  Tile has dragging-source: ${dragStartState.hasDraggingTile}`);
    console.log(`  Rack has dragging-active: ${dragStartState.rackHasActiveClass}`);
    console.log(`  Rack children count: ${dragStartState.totalRackChildren}`);

    // Test 2: Move to different positions and check insertion gap
    console.log('\n3. Testing insertion gap at different positions');
    console.log('=' .repeat(40));

    // Move to the left side of rack
    const rackBounds = await page.$eval('#tile-rack', el => {
      const rect = el.getBoundingClientRect();
      return { left: rect.left, right: rect.right, y: rect.top + rect.height/2 };
    });

    // Move to far left
    await page.touchscreen.touchMove(rackBounds.left + 20, rackBounds.y);
    await new Promise(r => setTimeout(r, 100));

    const leftGapState = await page.evaluate(() => {
      const gap = document.querySelector('.insertion-gap');
      const rack = document.getElementById('tile-rack');

      if (!gap) return { hasGap: false };

      const children = Array.from(rack.children);
      const gapIndex = children.indexOf(gap);
      const firstTile = rack.querySelector('.tile');

      return {
        hasGap: true,
        gapIndex: gapIndex,
        isBeforeFirstTile: gap.nextSibling === firstTile,
        totalChildren: children.length
      };
    });

    console.log(`  Gap at far left: ${leftGapState.hasGap}`);
    console.log(`  Gap index: ${leftGapState.gapIndex}`);
    console.log(`  Gap before first tile: ${leftGapState.isBeforeFirstTile}`);

    // Move to far right
    await page.touchscreen.touchMove(rackBounds.right - 20, rackBounds.y);
    await new Promise(r => setTimeout(r, 100));

    const rightGapState = await page.evaluate(() => {
      const gap = document.querySelector('.insertion-gap');
      const rack = document.getElementById('tile-rack');

      if (!gap) return { hasGap: false };

      const children = Array.from(rack.children);
      const gapIndex = children.indexOf(gap);

      return {
        hasGap: true,
        gapIndex: gapIndex,
        isAtEnd: gap.nextSibling === null,
        totalChildren: children.length
      };
    });

    console.log(`  Gap at far right: ${rightGapState.hasGap}`);
    console.log(`  Gap index: ${rightGapState.gapIndex}`);
    console.log(`  Gap at end: ${rightGapState.isAtEnd}`);

    // Test 3: Drop the tile and check final state
    console.log('\n4. Testing drop and cleanup');
    console.log('=' .repeat(40));

    // Drop at current position (far right)
    await page.touchscreen.touchEnd();
    await new Promise(r => setTimeout(r, 200));

    const finalState = await page.evaluate(() => {
      const tiles = Array.from(document.querySelectorAll('#tile-rack .tile'));
      const placeholder = document.querySelector('.tile-placeholder');
      const insertionGap = document.querySelector('.insertion-gap');
      const draggingTile = document.querySelector('.tile.dragging-source');
      const rack = document.getElementById('tile-rack');

      return {
        tileCount: tiles.length,
        tileLetters: tiles.map(t => t.dataset.letter),
        hasPlaceholder: placeholder !== null,
        hasInsertionGap: insertionGap !== null,
        hasDraggingTile: draggingTile !== null,
        rackHasActiveClass: rack.classList.contains('dragging-active'),
        totalRackChildren: rack.children.length
      };
    });

    console.log(`  Final tile count: ${finalState.tileCount}`);
    console.log(`  Final order: ${finalState.tileLetters.join(' ')}`);
    console.log(`  Placeholder removed: ${!finalState.hasPlaceholder}`);
    console.log(`  Insertion gap removed: ${!finalState.hasInsertionGap}`);
    console.log(`  Dragging class removed: ${!finalState.hasDraggingTile}`);
    console.log(`  Rack active class removed: ${!finalState.rackHasActiveClass}`);

    // Check if the tile actually moved
    const tileMoved = initialState.tileLetters.join('') !== finalState.tileLetters.join('');
    console.log(`  Tile order changed: ${tileMoved}`);

    if (tileMoved) {
      console.log(`  Original: ${initialState.tileLetters.join(' ')}`);
      console.log(`  New:      ${finalState.tileLetters.join(' ')}`);
    }

    // Test 4: Test drag from board to rack
    console.log('\n5. Testing drag from board back to rack');
    console.log('=' .repeat(40));

    // First, place a tile on the board
    const firstTile = await page.$eval('#tile-rack .tile:first-child', el => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width/2,
        y: rect.top + rect.height/2,
        letter: el.dataset.letter
      };
    });

    // Find an empty board cell
    const emptyCell = await page.$eval('.board-cell[data-row="8"][data-col="8"]', el => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width/2,
        y: rect.top + rect.height/2
      };
    });

    // Drag tile to board
    await page.touchscreen.touchStart(firstTile.x, firstTile.y);
    await new Promise(r => setTimeout(r, 50));
    await page.touchscreen.touchMove(firstTile.x + 20, firstTile.y + 20);
    await new Promise(r => setTimeout(r, 50));
    await page.touchscreen.touchMove(emptyCell.x, emptyCell.y);
    await new Promise(r => setTimeout(r, 100));
    await page.touchscreen.touchEnd();
    await new Promise(r => setTimeout(r, 200));

    // Verify tile is on board
    const tileOnBoard = await page.evaluate(() => {
      const cell = document.querySelector('.board-cell[data-row="8"][data-col="8"]');
      return cell.querySelector('.tile') !== null;
    });

    console.log(`  Tile placed on board: ${tileOnBoard}`);

    await page.screenshot({ path: 'gap-behavior-test.png' });

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

testGapBehavior().catch(console.error);