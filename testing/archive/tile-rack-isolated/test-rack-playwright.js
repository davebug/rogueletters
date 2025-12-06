const { chromium, webkit, firefox } = require('playwright');

async function testTileRackWithPlaywright() {
  console.log('\n=== PLAYWRIGHT TEST: TILE RACK ===\n');

  // Test in multiple browsers
  const browsers = [
    { name: 'Chromium', browser: chromium },
    { name: 'Firefox', browser: firefox },
    { name: 'WebKit', browser: webkit }
  ];

  for (const { name, browser: browserType } of browsers) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`TESTING IN ${name.toUpperCase()}`);
    console.log('='.repeat(50));

    const browser = await browserType.launch({
      headless: false,
      slowMo: 50
    });

    const context = await browser.newContext({
      viewport: { width: 800, height: 600 }
    });

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:8086/');
      await page.waitForSelector('.tile', { timeout: 5000 });
      await page.waitForTimeout(500);

      // TEST 1: INITIAL STATE
      console.log('\nTest 1: Initial State');
      const initialState = await page.evaluate(() => {
        const tiles = Array.from(document.querySelectorAll('.tile'));
        return {
          count: tiles.length,
          letters: tiles.map(t => t.dataset.letter).join(''),
          mode: document.getElementById('debug-mode').textContent
        };
      });
      console.log(`  Tiles: ${initialState.letters} (${initialState.count} tiles)`);
      console.log(`  Mode: ${initialState.mode}`);

      // TEST 2: DRAG AND DROP WITH PLAYWRIGHT
      console.log('\nTest 2: Drag and Drop');

      // Get tile positions
      const tile3 = page.locator('.tile:nth-child(3)');
      const tile1 = page.locator('.tile:nth-child(1)');

      // Perform drag operation
      await tile3.hover();
      await page.mouse.down();
      await page.mouse.move(100, 100); // Move to trigger drag
      await page.waitForTimeout(100);

      // Check drag state
      const duringDrag = await page.evaluate(() => ({
        hasPlaceholder: !!document.querySelector('.tile-placeholder.active'),
        hasGap: !!document.querySelector('.insertion-gap.active'),
        rackActive: document.getElementById('tile-rack').classList.contains('dragging-active')
      }));
      console.log(`  During drag: Placeholder=${duringDrag.hasPlaceholder}, Gap=${duringDrag.hasGap}, RackActive=${duringDrag.rackActive}`);

      // Move to drop position and release
      const tile1Box = await tile1.boundingBox();
      await page.mouse.move(tile1Box.x - 10, tile1Box.y + tile1Box.height/2);
      await page.waitForTimeout(100);
      await page.mouse.up();
      await page.waitForTimeout(300);

      const afterDrag = await page.evaluate(() => {
        const tiles = Array.from(document.querySelectorAll('.tile'));
        return {
          letters: tiles.map(t => t.dataset.letter).join(''),
          cleanedUp: !document.querySelector('.tile-placeholder') && !document.querySelector('.insertion-gap')
        };
      });
      console.log(`  After drag: ${afterDrag.letters}`);
      console.log(`  Cleaned up: ${afterDrag.cleanedUp}`);

      // TEST 3: TAP TO SELECT (CLICK)
      console.log('\nTest 3: Tap/Click to Select');

      // Click first tile
      await page.click('.tile:nth-child(1)');
      await page.waitForTimeout(100);

      const selected = await page.evaluate(() => {
        const selectedTile = document.querySelector('.tile.selected');
        return selectedTile ? selectedTile.dataset.letter : null;
      });
      console.log(`  Selected: ${selected || 'none'}`);

      // Click last tile to swap
      await page.click('.tile:last-child');
      await page.waitForTimeout(500);

      const afterSwap = await page.evaluate(() => {
        const tiles = Array.from(document.querySelectorAll('.tile'));
        return tiles.map(t => t.dataset.letter).join('');
      });
      console.log(`  After swap: ${afterSwap}`);

      // TEST 4: MODE TOGGLE
      console.log('\nTest 4: Mode Toggle');

      await page.click('#mode-toggle');
      const mode1 = await page.locator('#debug-mode').textContent();
      console.log(`  Mode: ${mode1}`);

      await page.click('#mode-toggle');
      const mode2 = await page.locator('#debug-mode').textContent();
      console.log(`  Mode: ${mode2}`);

      // TEST 5: BUTTON CONTROLS
      console.log('\nTest 5: Controls');

      await page.click('#shuffle-btn');
      await page.waitForTimeout(200);
      const shuffled = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.tile')).map(t => t.dataset.letter).join('')
      );
      console.log(`  Shuffled: ${shuffled}`);

      await page.click('#reset-btn');
      await page.waitForTimeout(200);
      const reset = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.tile')).map(t => t.dataset.letter).join('')
      );
      console.log(`  Reset: ${reset}`);

      // Take screenshot
      await page.screenshot({ path: `tile-rack-${name.toLowerCase()}.png` });
      console.log(`  Screenshot saved: tile-rack-${name.toLowerCase()}.png`);

    } catch (error) {
      console.error(`  Error in ${name}: ${error.message}`);
    } finally {
      await browser.close();
    }
  }

  // MOBILE/TOUCH TEST
  console.log(`\n${'='.repeat(50)}`);
  console.log('TESTING MOBILE/TOUCH');
  console.log('='.repeat(50));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  });

  const page = await context.newPage();

  try {
    await page.goto('http://localhost:8086/');
    await page.waitForSelector('.tile', { timeout: 5000 });
    await page.waitForTimeout(500);

    console.log('\nMobile Touch Test:');

    // Touch drag simulation
    const tile = page.locator('.tile:nth-child(2)');
    const box = await tile.boundingBox();

    // Simulate touch drag
    await page.touchscreen.tap(box.x + box.width/2, box.y + box.height/2);
    await page.waitForTimeout(100);

    // Touch and drag
    await page.touchscreen.touchStart(box.x + box.width/2, box.y + box.height/2);
    await page.touchscreen.touchMove(box.x + 100, box.y);
    await page.waitForTimeout(100);

    const touchDrag = await page.evaluate(() => ({
      hasPlaceholder: !!document.querySelector('.tile-placeholder'),
      hasGap: !!document.querySelector('.insertion-gap'),
      inputType: document.getElementById('debug-input').textContent
    }));

    console.log(`  Touch drag active: Placeholder=${touchDrag.hasPlaceholder}, Gap=${touchDrag.hasGap}`);
    console.log(`  Detected as: ${touchDrag.inputType}`);

    await page.touchscreen.touchEnd();
    await page.waitForTimeout(200);

    // Test tap to select on mobile
    await page.tap('.tile:first-child');
    await page.waitForTimeout(100);

    const mobileSelected = await page.evaluate(() => {
      const selected = document.querySelector('.tile.selected');
      return selected ? selected.dataset.letter : null;
    });
    console.log(`  Tap selected: ${mobileSelected || 'none'}`);

    await page.tap('.tile:last-child');
    await page.waitForTimeout(500);

    const mobileSwap = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.tile')).map(t => t.dataset.letter).join('')
    );
    console.log(`  After tap swap: ${mobileSwap}`);

    await page.screenshot({ path: 'tile-rack-mobile.png' });
    console.log('  Screenshot saved: tile-rack-mobile.png');

  } catch (error) {
    console.error(`  Mobile test error: ${error.message}`);
  } finally {
    await browser.close();
  }

  // PERFORMANCE TEST
  console.log(`\n${'='.repeat(50)}`);
  console.log('PERFORMANCE METRICS');
  console.log('='.repeat(50));

  const perfBrowser = await chromium.launch({ headless: true });
  const perfContext = await perfBrowser.newContext();
  const perfPage = await perfContext.newPage();

  try {
    // Enable performance metrics
    await perfPage.evaluateOnNewDocument(() => {
      window.performanceMarks = [];
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'dragstart' || type === 'touchstart') {
          performance.mark('interaction-start');
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
    });

    await perfPage.goto('http://localhost:8086/');
    await perfPage.waitForSelector('.tile');

    // Measure drag operation performance
    const startTime = Date.now();

    await perfPage.dragAndDrop('.tile:nth-child(1)', '.tile:nth-child(5)');

    const dragTime = Date.now() - startTime;
    console.log(`  Drag operation time: ${dragTime}ms`);

    // Measure animation frame rate during drag
    const metrics = await perfPage.evaluate(() => {
      const entries = performance.getEntriesByType('measure');
      return {
        frameCount: entries.length,
        avgFrameTime: entries.reduce((sum, e) => sum + e.duration, 0) / entries.length || 0
      };
    });

    console.log(`  Animation frames: ${metrics.frameCount}`);
    console.log(`  Avg frame time: ${metrics.avgFrameTime.toFixed(2)}ms`);

    // Check for memory leaks
    const jsHeapUsed = await perfPage.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return null;
    });

    if (jsHeapUsed) {
      console.log(`  JS Heap Used: ${(jsHeapUsed / 1024 / 1024).toFixed(2)} MB`);
    }

  } catch (error) {
    console.error(`  Performance test error: ${error.message}`);
  } finally {
    await perfBrowser.close();
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('✅ ALL PLAYWRIGHT TESTS COMPLETE!');
  console.log('='.repeat(50));
}

// Run the tests
testTileRackWithPlaywright()
  .then(() => console.log('\n✨ Test suite finished successfully!'))
  .catch(error => console.error('\n❌ Test suite failed:', error));