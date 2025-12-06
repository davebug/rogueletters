const puppeteer = require('puppeteer');

async function testTouchPage() {
  console.log('\n=== TESTING SIMPLE TOUCH PAGE ===\n');

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
    // Navigate to the test page
    await page.goto('http://localhost:8085/touch-test.html');
    await page.waitForSelector('.draggable');

    console.log('1. Testing touchscreen.tap():');

    // Test simple tap
    await page.touchscreen.tap(100, 100);

    const tapLog = await page.evaluate(() => {
      const logs = document.querySelectorAll('.log-entry');
      return Array.from(logs).map(l => l.textContent).slice(-1)[0];
    });
    console.log('   Last log after tap:', tapLog);

    console.log('\n2. Testing touch drag:');

    // Get box1 position
    const box1 = await page.$('#box1');
    const box1Pos = await box1.boundingBox();
    console.log('   Box1 position:', box1Pos);

    // Get drop zone position
    const dropZonePos = await page.$eval('.drop-zone', el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
    });
    console.log('   Drop zone center:', dropZonePos);

    // Method 1: Using touchscreen API
    console.log('\n3. Method 1 - touchscreen.drag():');

    try {
      // Puppeteer doesn't have touchscreen.drag, so we simulate it
      await page.touchscreen.touchStart(box1Pos.x + 30, box1Pos.y + 30);

      // Move in steps
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const x = box1Pos.x + 30 + ((dropZonePos.x - box1Pos.x - 30) * i / steps);
        const y = box1Pos.y + 30 + ((dropZonePos.y - box1Pos.y - 30) * i / steps);
        await page.touchscreen.touchMove(x, y);
        await new Promise(r => setTimeout(r, 20));
      }

      await page.touchscreen.touchEnd();
    } catch (err) {
      console.log('   Error:', err.message);
    }

    // Check logs
    const dragLogs1 = await page.evaluate(() => {
      const logs = document.querySelectorAll('.log-entry');
      return Array.from(logs).slice(-5).map(l => l.textContent);
    });
    console.log('   Last 5 logs:', dragLogs1);

    console.log('\n4. Method 2 - CDP touch events:');

    // Use Chrome DevTools Protocol for more control
    const client = await page.target().createCDPSession();

    // Touch start
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{
        x: box1Pos.x + 30,
        y: box1Pos.y + 30,
        id: 0
      }]
    });

    // Touch move
    for (let i = 1; i <= 5; i++) {
      const x = box1Pos.x + 30 + ((dropZonePos.x - box1Pos.x - 30) * i / 5);
      const y = box1Pos.y + 30 + ((dropZonePos.y - box1Pos.y - 30) * i / 5);

      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{
          x: x,
          y: y,
          id: 0
        }]
      });
      await new Promise(r => setTimeout(r, 50));
    }

    // Touch end
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: []
    });

    const dragLogs2 = await page.evaluate(() => {
      const logs = document.querySelectorAll('.log-entry');
      return Array.from(logs).slice(-5).map(l => l.textContent);
    });
    console.log('   Last 5 logs after CDP:', dragLogs2);

    console.log('\n5. Check final position:');

    const finalPos = await page.evaluate(() => {
      const box1 = document.querySelector('#box1');
      const transform = box1.style.transform;
      const dropZones = document.querySelectorAll('.drop-zone');
      const droppedOn = Array.from(dropZones).find(z =>
        z.classList.contains('active') ||
        z.textContent.includes('dropped')
      );

      return {
        transform: transform || 'none',
        droppedOn: droppedOn ? droppedOn.textContent : null
      };
    });
    console.log('   Box1 transform:', finalPos.transform);
    console.log('   Dropped on:', finalPos.droppedOn);

    // Screenshot
    await page.screenshot({ path: 'touch-test-result.png' });

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

testTouchPage().catch(console.error);