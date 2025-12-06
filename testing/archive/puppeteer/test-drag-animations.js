const puppeteer = require('puppeteer');

async function testDragAnimations() {
  console.log('\n=== TESTING DRAG ANIMATIONS ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1200,
      height: 800,
      isMobile: false,
      hasTouch: false
    }
  });

  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:8085/', { waitUntil: 'networkidle2' });

    // Wait for game to load
    await page.waitForSelector('.tile', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1000));

    console.log('1. Testing tile disappearance on drag start');
    console.log('=' .repeat(40));

    // Get first tile in rack
    const tile = await page.$('#tile-rack .tile:first-child');
    const tileBounds = await tile.boundingBox();

    // Trigger drag using dispatchEvent
    await page.evaluate(() => {
      const tile = document.querySelector('#tile-rack .tile:first-child');
      if (tile) {
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        tile.dispatchEvent(dragStartEvent);
      }
    });

    // Check if tile has dragging-source class and placeholder exists
    const dragState = await page.evaluate(() => {
      const firstTile = document.querySelector('#tile-rack .tile:first-child');
      const placeholder = document.querySelector('.tile-placeholder');
      const rack = document.getElementById('tile-rack');

      return {
        hasDraggingClass: firstTile ? firstTile.classList.contains('dragging-source') : false,
        hasPlaceholder: placeholder !== null,
        hasRackActiveClass: rack ? rack.classList.contains('dragging-active') : false
      };
    });

    console.log(`  Tile has dragging-source class: ${dragState.hasDraggingClass}`);
    console.log(`  Placeholder created: ${dragState.hasPlaceholder}`);
    console.log(`  Rack has dragging-active class: ${dragState.hasRackActiveClass}`);

    // Move over rack to see indicators
    console.log('\n2. Testing rack drop indicators');
    console.log('=' .repeat(40));

    const rack = await page.$('#tile-rack');
    const rackBounds = await rack.boundingBox();

    // Trigger dragover event at different positions
    await page.evaluate((x, y) => {
      const rack = document.getElementById('tile-rack');
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        dataTransfer: new DataTransfer()
      });
      rack.dispatchEvent(dragOverEvent);
    }, rackBounds.x + 100, rackBounds.y + rackBounds.height/2);

    await new Promise(r => setTimeout(r, 500));

    const gapState1 = await page.evaluate(() => {
      const insertionGap = document.querySelector('.insertion-gap');
      return {
        hasInsertionGap: insertionGap !== null,
        placeholder: document.querySelector('.tile-placeholder') !== null
      };
    });
    console.log(`  Insertion gap visible (position 1): ${gapState1.hasInsertionGap}`);
    console.log(`  Placeholder still present: ${gapState1.placeholder}`);

    // End drag
    await page.evaluate(() => {
      const tile = document.querySelector('#tile-rack .tile:first-child');
      if (tile) {
        const dragEndEvent = new DragEvent('dragend', {
          bubbles: true,
          cancelable: true
        });
        tile.dispatchEvent(dragEndEvent);
      }
    });

    await new Promise(r => setTimeout(r, 500));

    // Check cleanup
    console.log('\n3. Testing cleanup after drag');
    console.log('=' .repeat(40));

    const cleanupState = await page.evaluate(() => {
      return {
        draggingSource: document.querySelectorAll('.dragging-source').length,
        placeholders: document.querySelectorAll('.tile-placeholder').length,
        insertionGaps: document.querySelectorAll('.insertion-gap').length,
        hasActiveClass: document.getElementById('tile-rack').classList.contains('dragging-active')
      };
    });

    console.log(`  Remaining dragging-source elements: ${cleanupState.draggingSource}`);
    console.log(`  Remaining placeholders: ${cleanupState.placeholders}`);
    console.log(`  Remaining insertion gaps: ${cleanupState.insertionGaps}`);
    console.log(`  Rack still has dragging-active class: ${cleanupState.hasActiveClass}`);

    await page.screenshot({ path: 'drag-animation-test.png' });

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

testDragAnimations().catch(console.error);