const puppeteer = require('puppeteer');

async function testSimpleDragVerify() {
  console.log('\n=== SIMPLE DRAG VERIFICATION TEST ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1200,
      height: 800,
      isMobile: false,
      hasTouch: false
    }
  });

  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:8085/', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.tile', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1000));

    // Test 1: Initial state
    console.log('1. INITIAL STATE');
    const initial = await page.evaluate(() => {
      const tiles = document.querySelectorAll('#tile-rack .tile');
      return {
        tileCount: tiles.length,
        firstTileSize: tiles[0] ? tiles[0].getBoundingClientRect() : null,
        letters: Array.from(tiles).map(t => t.dataset.letter).join('')
      };
    });
    console.log(`   Tiles: ${initial.tileCount}`);
    console.log(`   Letters: ${initial.letters}`);
    console.log(`   Size: ${initial.firstTileSize?.width}x${initial.firstTileSize?.height}`);

    // Test 2: Start drag
    console.log('\n2. START DRAG');
    await page.evaluate(() => {
      const tile = document.querySelector('#tile-rack .tile:nth-child(3)');
      if (tile) {
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        window.draggedTile = tile;
        tile.dispatchEvent(dragStartEvent);
      }
    });

    await new Promise(r => setTimeout(r, 300)); // Wait for animations

    const dragStart = await page.evaluate(() => {
      const placeholder = document.querySelector('.tile-placeholder');
      const tiles = document.querySelectorAll('#tile-rack .tile');
      return {
        hasPlaceholder: placeholder !== null,
        placeholderActive: placeholder?.classList.contains('active'),
        placeholderWidth: placeholder ? window.getComputedStyle(placeholder).width : 'N/A',
        tileCount: tiles.length,
        firstTileSize: tiles[0] ? tiles[0].getBoundingClientRect() : null
      };
    });
    console.log(`   Placeholder created: ${dragStart.hasPlaceholder}`);
    console.log(`   Placeholder active: ${dragStart.placeholderActive}`);
    console.log(`   Placeholder width: ${dragStart.placeholderWidth}`);
    console.log(`   Tiles still: ${dragStart.tileCount}`);
    console.log(`   Tile size unchanged: ${dragStart.firstTileSize?.width}x${dragStart.firstTileSize?.height}`);

    // Test 3: Create insertion gap
    console.log('\n3. DRAG OVER RACK');
    await page.evaluate(() => {
      const rack = document.getElementById('tile-rack');
      const rect = rack.getBoundingClientRect();
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 200,
        clientY: rect.top + rect.height/2,
        dataTransfer: new DataTransfer()
      });
      rack.dispatchEvent(dragOverEvent);
    });

    await new Promise(r => setTimeout(r, 300));

    const dragOver = await page.evaluate(() => {
      const gap = document.querySelector('.insertion-gap');
      const placeholder = document.querySelector('.tile-placeholder');
      return {
        hasGap: gap !== null,
        gapActive: gap?.classList.contains('active'),
        gapWidth: gap ? window.getComputedStyle(gap).width : 'N/A',
        placeholderStillExists: placeholder !== null
      };
    });
    console.log(`   Insertion gap created: ${dragOver.hasGap}`);
    console.log(`   Gap active: ${dragOver.gapActive}`);
    console.log(`   Gap width: ${dragOver.gapWidth}`);
    console.log(`   Placeholder still exists: ${dragOver.placeholderStillExists}`);

    // Test 4: End drag
    console.log('\n4. END DRAG');
    await page.evaluate(() => {
      const tile = document.querySelector('.tile.dragging-source');
      if (tile) {
        const dragEndEvent = new DragEvent('dragend', {
          bubbles: true,
          cancelable: true
        });
        tile.dispatchEvent(dragEndEvent);
        window.draggedTile = null;
      }
    });

    // Check immediately
    const immediateEnd = await page.evaluate(() => {
      return {
        placeholder: document.querySelector('.tile-placeholder'),
        gap: document.querySelector('.insertion-gap')
      };
    });
    console.log(`   Immediately after: Placeholder=${immediateEnd.placeholder !== null}, Gap=${immediateEnd.gap !== null}`);

    // Wait for animation cleanup
    await new Promise(r => setTimeout(r, 500));

    const finalState = await page.evaluate(() => {
      const tiles = document.querySelectorAll('#tile-rack .tile');
      return {
        tileCount: tiles.length,
        noPlaceholder: document.querySelector('.tile-placeholder') === null,
        noGap: document.querySelector('.insertion-gap') === null,
        letters: Array.from(tiles).map(t => t.dataset.letter).join(''),
        firstTileSize: tiles[0] ? tiles[0].getBoundingClientRect() : null
      };
    });
    console.log(`   After cleanup: Placeholder removed=${finalState.noPlaceholder}, Gap removed=${finalState.noGap}`);
    console.log(`   Final tiles: ${finalState.tileCount}`);
    console.log(`   Final letters: ${finalState.letters}`);
    console.log(`   Final size: ${finalState.firstTileSize?.width}x${finalState.firstTileSize?.height}`);

    // Mobile test
    console.log('\n5. MOBILE TEST');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true
    });

    await mobilePage.goto('http://localhost:8085/', { waitUntil: 'networkidle2' });
    await mobilePage.waitForSelector('.tile', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1000));

    const mobileInitial = await mobilePage.evaluate(() => {
      const tiles = document.querySelectorAll('#tile-rack .tile');
      return {
        tileCount: tiles.length,
        firstTileSize: tiles[0] ? tiles[0].getBoundingClientRect() : null
      };
    });
    console.log(`   Mobile tiles: ${mobileInitial.tileCount}`);
    console.log(`   Mobile size: ${mobileInitial.firstTileSize?.width}x${mobileInitial.firstTileSize?.height}`);

    await mobilePage.close();

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('RESULTS:');
    const success = finalState.noPlaceholder && finalState.noGap &&
                   finalState.firstTileSize?.width === initial.firstTileSize?.width &&
                   finalState.firstTileSize?.height === initial.firstTileSize?.height;

    console.log(`✅ Gaps cleaned up: ${finalState.noPlaceholder && finalState.noGap}`);
    console.log(`✅ Tiles maintain size: ${finalState.firstTileSize?.width === initial.firstTileSize?.width}`);
    console.log(`✅ Overall: ${success ? 'WORKING' : 'ISSUES FOUND'}`);

  } finally {
    await browser.close();
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

testSimpleDragVerify().catch(console.error);