const puppeteer = require('puppeteer');

async function captureScreenshotsDuringDrag() {
  console.log('\n=== DRAG SCREENSHOT ANALYSIS TEST ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    slowMo: 0, // No slowdown for precise timing
    defaultViewport: {
      width: 1200,
      height: 800,
      deviceScaleFactor: 2 // High quality screenshots
    }
  });

  try {
    const page = await browser.newPage();

    // Test isolated tile rack
    console.log('Testing isolated tile rack...');
    await page.goto('http://localhost:8086/', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.tile', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 500));

    // Take baseline screenshot
    await page.screenshot({
      path: '../../screenshots/analysis-1-baseline.png',
      fullPage: false
    });
    console.log('  ✅ Screenshot 1: Baseline (before drag)');

    // Get tile positions
    const thirdTile = await page.$('.tile:nth-child(3)');
    const firstTile = await page.$('.tile:nth-child(1)');
    const thirdBox = await thirdTile.boundingBox();
    const firstBox = await firstTile.boundingBox();

    // START DRAG
    await page.mouse.move(thirdBox.x + thirdBox.width/2, thirdBox.y + thirdBox.height/2);
    await page.mouse.down();

    // Small movement to trigger drag
    await page.mouse.move(thirdBox.x + thirdBox.width/2 + 15, thirdBox.y + 15, { steps: 3 });
    await new Promise(r => setTimeout(r, 300)); // Wait for animations to complete

    // SCREENSHOT 2: Just after drag starts (should show placeholder)
    await page.screenshot({
      path: '../../screenshots/analysis-2-drag-started.png',
      fullPage: false
    });
    console.log('  ✅ Screenshot 2: Drag started (placeholder should appear)');

    // Move further to show dragged tile
    await page.mouse.move(thirdBox.x + thirdBox.width/2 + 50, thirdBox.y - 30, { steps: 5 });
    await new Promise(r => setTimeout(r, 100));

    // SCREENSHOT 3: Tile being dragged above rack
    await page.screenshot({
      path: '../../screenshots/analysis-3-dragging-above.png',
      fullPage: false
    });
    console.log('  ✅ Screenshot 3: Dragging above rack');

    // Move over first position
    await page.mouse.move(firstBox.x - 10, firstBox.y + firstBox.height/2, { steps: 10 });
    await new Promise(r => setTimeout(r, 100));

    // SCREENSHOT 4: Hovering over drop position (gap should be visible)
    await page.screenshot({
      path: '../../screenshots/analysis-4-hover-drop-position.png',
      fullPage: false
    });
    console.log('  ✅ Screenshot 4: Hovering over drop position (gap visible)');

    // Move to middle of rack
    const midX = (firstBox.x + thirdBox.x) / 2;
    await page.mouse.move(midX, firstBox.y + firstBox.height/2, { steps: 5 });
    await new Promise(r => setTimeout(r, 100));

    // SCREENSHOT 5: Middle position
    await page.screenshot({
      path: '../../screenshots/analysis-5-middle-position.png',
      fullPage: false
    });
    console.log('  ✅ Screenshot 5: Middle of rack');

    // Drop the tile
    await page.mouse.up();
    await new Promise(r => setTimeout(r, 300)); // Wait for animation

    // SCREENSHOT 6: After drop (should be cleaned up)
    await page.screenshot({
      path: '../../screenshots/analysis-6-after-drop.png',
      fullPage: false
    });
    console.log('  ✅ Screenshot 6: After drop (cleaned up)');

    // ANALYSIS: Check tile dimensions during drag
    console.log('\n=== TILE DIMENSION ANALYSIS ===\n');

    // Start another drag for analysis
    await page.mouse.move(thirdBox.x + thirdBox.width/2, thirdBox.y + thirdBox.height/2);
    await page.mouse.down();
    await page.mouse.move(thirdBox.x + 50, thirdBox.y - 30, { steps: 5 });
    await new Promise(r => setTimeout(r, 300)); // Wait for animations to complete

    const tileAnalysis = await page.evaluate(() => {
      const tiles = Array.from(document.querySelectorAll('.tile'));
      const placeholder = document.querySelector('.tile-placeholder');
      const gap = document.querySelector('.insertion-gap');

      return {
        tileCount: tiles.length,
        tileDimensions: tiles.map(t => ({
          letter: t.dataset.letter,
          width: t.offsetWidth,
          height: t.offsetHeight,
          isSquare: t.offsetWidth === t.offsetHeight,
          computedTransform: window.getComputedStyle(t).transform
        })),
        placeholder: placeholder ? {
          width: placeholder.offsetWidth,
          hasActiveClass: placeholder.classList.contains('active'),
          computedWidth: window.getComputedStyle(placeholder).width
        } : null,
        gap: gap ? {
          width: gap.offsetWidth,
          hasActiveClass: gap.classList.contains('active'),
          computedWidth: window.getComputedStyle(gap).width
        } : null
      };
    });

    console.log('Tile Analysis During Drag:');
    console.log(`  Total tiles: ${tileAnalysis.tileCount}`);

    console.log('\n  Individual tile dimensions:');
    tileAnalysis.tileDimensions.forEach(tile => {
      const squareIcon = tile.isSquare ? '✅' : '❌';
      console.log(`    ${tile.letter}: ${tile.width}x${tile.height} ${squareIcon} ${tile.isSquare ? 'Square' : 'NOT SQUARE!'}`);
    });

    if (tileAnalysis.placeholder) {
      console.log('\n  Placeholder:');
      console.log(`    Width: ${tileAnalysis.placeholder.width}px`);
      console.log(`    Active: ${tileAnalysis.placeholder.hasActiveClass}`);
      console.log(`    Computed: ${tileAnalysis.placeholder.computedWidth}`);
    }

    if (tileAnalysis.gap) {
      console.log('\n  Insertion Gap:');
      console.log(`    Width: ${tileAnalysis.gap.width}px`);
      console.log(`    Active: ${tileAnalysis.gap.hasActiveClass}`);
      console.log(`    Computed: ${tileAnalysis.gap.computedWidth}`);
    }

    await page.mouse.up();

    // Test on main game
    console.log('\n=== TESTING MAIN GAME ===\n');
    await page.goto('http://localhost:8085/', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.tile', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1000));

    // Take screenshot of main game rack
    await page.screenshot({
      path: '../../screenshots/analysis-7-main-game.png',
      fullPage: false,
      clip: {
        x: 0,
        y: 400, // Focus on rack area
        width: 1200,
        height: 200
      }
    });
    console.log('  ✅ Screenshot 7: Main game rack');

    // Do a drag in main game
    const mainTile = await page.$('.tile:nth-child(2)');
    if (mainTile) {
      const box = await mainTile.boundingBox();
      await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y - 30, { steps: 5 });
      await new Promise(r => setTimeout(r, 100));

      await page.screenshot({
        path: '../../screenshots/analysis-8-main-game-dragging.png',
        fullPage: false,
        clip: {
          x: 0,
          y: 350,
          width: 1200,
          height: 300
        }
      });
      console.log('  ✅ Screenshot 8: Main game during drag');

      await page.mouse.up();
    }

    console.log('\n=== SUMMARY ===');
    console.log('✅ Created 8 analysis screenshots in screenshots directory');
    console.log('✅ Check for:');
    console.log('   - Tiles remaining square during all states');
    console.log('   - Placeholder gap appearing immediately');
    console.log('   - Insertion gap showing at correct position');
    console.log('   - Clean transitions between states');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

// Run the analysis
captureScreenshotsDuringDrag().catch(console.error);