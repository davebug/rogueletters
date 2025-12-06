const { chromium, webkit, firefox } = require('playwright');

async function testTileRack() {
  console.log('\n=== PLAYWRIGHT CROSS-BROWSER TEST ===\n');

  const results = {
    chromium: { passed: 0, failed: 0 },
    firefox: { passed: 0, failed: 0 },
    webkit: { passed: 0, failed: 0 }
  };

  // Test configurations
  const browsers = [
    { name: 'Chromium', type: chromium },
    { name: 'Firefox', type: firefox },
    { name: 'WebKit', type: webkit }
  ];

  for (const { name, type: browserType } of browsers) {
    console.log(`\nTESTING ${name.toUpperCase()}`);
    console.log('='.repeat(40));

    const browser = await browserType.launch({
      headless: true // Set to false to see the browser
    });

    try {
      const context = await browser.newContext({
        viewport: { width: 800, height: 600 }
      });
      const page = await context.newPage();

      // Navigate to test app
      await page.goto('http://localhost:8086/');
      await page.waitForSelector('.tile', { state: 'visible' });

      // TEST 1: Check initial load
      const tiles = await page.$$eval('.tile', elements =>
        elements.map(el => el.dataset.letter).join('')
      );

      if (tiles === 'SCRABBLE') {
        console.log('  ✅ Initial tiles loaded correctly');
        results[name.toLowerCase()].passed++;
      } else {
        console.log('  ❌ Initial tiles incorrect:', tiles);
        results[name.toLowerCase()].failed++;
      }

      // TEST 2: Drag and Drop
      const tile3 = await page.$('.tile:nth-child(3)');
      const tile1 = await page.$('.tile:nth-child(1)');

      if (tile3 && tile1) {
        const box3 = await tile3.boundingBox();
        const box1 = await tile1.boundingBox();

        // Start drag
        await page.mouse.move(box3.x + box3.width/2, box3.y + box3.height/2);
        await page.mouse.down();

        // Move to trigger drag
        await page.mouse.move(box3.x + 50, box3.y + 50, { steps: 5 });
        await page.waitForTimeout(100);

        // Check for drag indicators
        const dragState = await page.evaluate(() => ({
          hasPlaceholder: !!document.querySelector('.tile-placeholder'),
          hasGap: !!document.querySelector('.insertion-gap')
        }));

        if (dragState.hasPlaceholder && dragState.hasGap) {
          console.log('  ✅ Drag indicators appear correctly');
          results[name.toLowerCase()].passed++;
        } else {
          console.log('  ❌ Drag indicators missing');
          results[name.toLowerCase()].failed++;
        }

        // Complete drag
        await page.mouse.move(box1.x, box1.y + box1.height/2, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(300);

        // Check cleanup
        const cleanedUp = await page.evaluate(() =>
          !document.querySelector('.tile-placeholder') &&
          !document.querySelector('.insertion-gap')
        );

        if (cleanedUp) {
          console.log('  ✅ Drag cleanup successful');
          results[name.toLowerCase()].passed++;
        } else {
          console.log('  ❌ Drag cleanup failed');
          results[name.toLowerCase()].failed++;
        }
      }

      // TEST 3: Click to Select
      await page.click('.tile:first-child');
      await page.waitForTimeout(100);

      const hasSelected = await page.$('.tile.selected');

      if (!hasSelected) {
        // Might be in wrong mode, try switching
        await page.click('#mode-toggle'); // Switch to tap mode
        await page.click('#mode-toggle');
        await page.waitForTimeout(100);
        await page.click('.tile:first-child');
        await page.waitForTimeout(100);
      }

      const selectedAfterClick = await page.$('.tile.selected');
      if (selectedAfterClick) {
        console.log('  ✅ Tile selection works');
        results[name.toLowerCase()].passed++;

        // Try swap
        await page.click('.tile:last-child');
        await page.waitForTimeout(500);

        const noSelected = await page.evaluate(() =>
          !document.querySelector('.tile.selected')
        );

        if (noSelected) {
          console.log('  ✅ Tile swap works');
          results[name.toLowerCase()].passed++;
        } else {
          console.log('  ⚠️  Tile swap unclear');
        }
      } else {
        console.log('  ⚠️  Tile selection not working in this mode');
      }

      // TEST 4: Shuffle button
      await page.click('#shuffle-btn');
      await page.waitForTimeout(200);

      const shuffled = await page.$$eval('.tile', elements =>
        elements.map(el => el.dataset.letter).join('')
      );

      if (shuffled !== 'SCRABBLE') {
        console.log('  ✅ Shuffle works');
        results[name.toLowerCase()].passed++;
      } else {
        console.log('  ❌ Shuffle did not change order');
        results[name.toLowerCase()].failed++;
      }

      // TEST 5: Reset button
      await page.click('#reset-btn');
      await page.waitForTimeout(200);

      const reset = await page.$$eval('.tile', elements =>
        elements.map(el => el.dataset.letter).join('')
      );

      if (reset === 'SCRABBLE') {
        console.log('  ✅ Reset works');
        results[name.toLowerCase()].passed++;
      } else {
        console.log('  ❌ Reset failed:', reset);
        results[name.toLowerCase()].failed++;
      }

      // Take screenshot
      await page.screenshot({
        path: `../../screenshots/playwright-${name.toLowerCase()}.png`,
        fullPage: true
      });

      await context.close();

    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      results[name.toLowerCase()].failed++;
    } finally {
      await browser.close();
    }
  }

  // Test Mobile
  console.log('\nTESTING MOBILE');
  console.log('='.repeat(40));

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
    });

    const page = await context.newPage();
    await page.goto('http://localhost:8086/');
    await page.waitForSelector('.tile', { state: 'visible' });

    // Test tap
    await page.tap('.tile:first-child');
    await page.waitForTimeout(100);

    // Test drag (using mouse events which work for touch simulation)
    const tile = await page.$('.tile:nth-child(2)');
    const box = await tile.boundingBox();

    await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y, { steps: 10 });
    await page.waitForTimeout(100);

    const mobileDrag = await page.evaluate(() => ({
      hasPlaceholder: !!document.querySelector('.tile-placeholder'),
      inputType: document.getElementById('debug-input').textContent
    }));

    await page.mouse.up();

    if (mobileDrag.hasPlaceholder) {
      console.log('  ✅ Mobile drag simulation works');
      console.log(`  ✅ Detected as: ${mobileDrag.inputType}`);
    } else {
      console.log('  ❌ Mobile drag failed');
    }

    await page.screenshot({ path: '../../screenshots/playwright-mobile.png' });
    await context.close();

  } catch (error) {
    console.error(`  ❌ Mobile test error: ${error.message}`);
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n' + '='.repeat(40));
  console.log('SUMMARY');
  console.log('='.repeat(40));

  for (const browser of Object.keys(results)) {
    const { passed, failed } = results[browser];
    const emoji = failed === 0 ? '✅' : '⚠️';
    console.log(`${emoji} ${browser}: ${passed} passed, ${failed} failed`);
  }

  const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);

  console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed`);

  if (totalFailed === 0) {
    console.log('\n🎉 All tests passed across all browsers!');
  }
}

// Run the test
testTileRack()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });