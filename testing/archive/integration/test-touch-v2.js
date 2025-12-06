const puppeteer = require('puppeteer');

async function testTouchV2() {
  console.log('\n=== TESTING WIKILETTERS-STYLE TOUCH ===\n');

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
    await page.goto('http://localhost:8085/touch-test-v2.html');
    await page.waitForSelector('.draggable');

    // Test configurations
    const configs = [
      { name: 'Default (threshold + clone)', threshold: true, clone: true, prevent: false },
      { name: 'No threshold', threshold: false, clone: true, prevent: false },
      { name: 'No clone', threshold: true, clone: false, prevent: false },
      { name: 'Prevent default early', threshold: true, clone: true, prevent: true },
      { name: 'Simple (no threshold/clone)', threshold: false, clone: false, prevent: false }
    ];

    for (const config of configs) {
      console.log(`\nTesting: ${config.name}`);
      console.log('=' .repeat(40));

      // Set configuration
      await page.evaluate((cfg) => {
        document.getElementById('useThreshold').checked = cfg.threshold;
        document.getElementById('useClone').checked = cfg.clone;
        document.getElementById('preventDefaultEarly').checked = cfg.prevent;
        // Clear log
        document.getElementById('log').innerHTML = '';
        window.logCount = 0;
      }, config);

      // Reset box position
      await page.evaluate(() => {
        const box1 = document.getElementById('box1');
        box1.style.left = '20px';
        box1.style.top = '20px';
        box1.style.transform = '';
        box1.style.opacity = '';
        box1.classList.remove('selected');
      });

      // Get positions
      const box1Pos = await page.$eval('#box1', el => {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + 30, y: rect.top + 30 };
      });

      const dropZonePos = await page.$eval('.drop-zone', el => {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + 150, y: rect.top + 50 };
      });

      // Perform drag
      await page.touchscreen.touchStart(box1Pos.x, box1Pos.y);
      await new Promise(r => setTimeout(r, 50));

      // Small movements (under threshold)
      await page.touchscreen.touchMove(box1Pos.x + 5, box1Pos.y + 5);
      await new Promise(r => setTimeout(r, 50));

      // Larger movement (over threshold)
      await page.touchscreen.touchMove(box1Pos.x + 20, box1Pos.y + 20);
      await new Promise(r => setTimeout(r, 50));

      // Move to drop zone
      await page.touchscreen.touchMove(dropZonePos.x, dropZonePos.y);
      await new Promise(r => setTimeout(r, 100));

      await page.touchscreen.touchEnd();
      await new Promise(r => setTimeout(r, 100));

      // Check results
      const result = await page.evaluate(() => {
        const logs = Array.from(document.querySelectorAll('.log-entry'))
          .map(el => el.textContent);

        const box1 = document.getElementById('box1');
        const finalRect = box1.getBoundingClientRect();

        return {
          logCount: logs.length,
          hasThresholdLog: logs.some(l => l.includes('threshold exceeded')),
          hasCloneLog: logs.some(l => l.includes('Clone created')),
          hasDropLog: logs.some(l => l.includes('Dropped')),
          finalPosition: { x: finalRect.left, y: finalRect.top },
          lastLog: logs[logs.length - 1] || 'No logs'
        };
      });

      console.log(`  Logs generated: ${result.logCount}`);
      console.log(`  Threshold detected: ${result.hasThresholdLog}`);
      console.log(`  Clone created: ${result.hasCloneLog}`);
      console.log(`  Drop successful: ${result.hasDropLog}`);
      console.log(`  Final position: (${result.finalPosition.x.toFixed(0)}, ${result.finalPosition.y.toFixed(0)})`);
      console.log(`  Last log: ${result.lastLog}`);
    }

    // Test tap (no movement)
    console.log('\nTesting: Tap without movement');
    console.log('=' .repeat(40));

    await page.evaluate(() => {
      document.getElementById('useThreshold').checked = true;
      document.getElementById('useClone').checked = true;
      document.getElementById('log').innerHTML = '';
      window.logCount = 0;
    });

    const tapPos = await page.$eval('#box2', el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + 30, y: rect.top + 30 };
    });

    await page.touchscreen.tap(tapPos.x, tapPos.y);
    await new Promise(r => setTimeout(r, 100));

    const tapResult = await page.evaluate(() => {
      const logs = Array.from(document.querySelectorAll('.log-entry'))
        .map(el => el.textContent);
      const box2 = document.getElementById('box2');
      return {
        isSelected: box2.classList.contains('selected'),
        hasTapLog: logs.some(l => l.includes('Tap detected')),
        lastLog: logs[logs.length - 1] || 'No logs'
      };
    });

    console.log(`  Box selected: ${tapResult.isSelected}`);
    console.log(`  Tap detected: ${tapResult.hasTapLog}`);
    console.log(`  Last log: ${tapResult.lastLog}`);

    await page.screenshot({ path: 'touch-v2-test.png' });

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

testTouchV2().catch(console.error);