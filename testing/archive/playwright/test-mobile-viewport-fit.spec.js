const { test, expect } = require('@playwright/test');

test.describe('Mobile Viewport Fit', () => {
  test('Check if all elements fit in mobile viewport', async ({ browser }) => {
    // Create mobile context
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      hasTouch: true,
      isMobile: true
    });
    const page = await context.newPage();

    // Enable debug mode
    await page.goto('http://localhost:8085?debug=true');
    await page.waitForTimeout(2000);

    // Wait for game to load
    await page.waitForSelector('#tile-rack', { timeout: 10000 });

    console.log('=== Viewport and Element Positions ===');

    // Get viewport dimensions
    const viewport = await page.viewportSize();
    console.log(`Viewport: ${viewport.width}x${viewport.height}`);

    // Get positions of key elements
    const elements = [
      { name: 'Header', selector: 'header' },
      { name: 'Board', selector: '#board' },
      { name: 'Board Container', selector: '#board-container' },
      { name: 'Tile Rack Container', selector: '#tile-rack-container' },
      { name: 'Tile Rack', selector: '#tile-rack' },
      { name: 'Mobile Potential Words', selector: '#mobile-potential-words' },
      { name: 'Footer', selector: '#footer' }
    ];

    for (const elem of elements) {
      const element = await page.$(elem.selector);
      if (element) {
        const box = await element.boundingBox();
        if (box) {
          console.log(`${elem.name}:`);
          console.log(`  Position: y=${box.y}, height=${box.height}`);
          console.log(`  Bottom: ${box.y + box.height}`);

          // Check if element is within viewport
          const inViewport = box.y < viewport.height && (box.y + box.height) > 0;
          const fullyVisible = box.y >= 0 && (box.y + box.height) <= viewport.height;
          console.log(`  In viewport: ${inViewport}, Fully visible: ${fullyVisible}`);
        }

        // Also check display style
        const display = await element.evaluate(el => window.getComputedStyle(el).display);
        if (display === 'none') {
          console.log(`  Display: none (hidden)`);
        }
      } else {
        console.log(`${elem.name}: Not found`);
      }
    }

    // Place tiles to trigger potential words display
    console.log('\n=== After Placing Tiles ===');

    const rackTiles = await page.locator('#tile-rack .tile').all();
    if (rackTiles.length > 0) {
      // Place first tile
      await rackTiles[0].tap();
      await page.waitForTimeout(300);
      await page.locator('.board-cell[data-row="8"][data-col="4"]').tap();
      await page.waitForTimeout(500);

      // Place second tile
      if (rackTiles.length > 1) {
        await rackTiles[0].tap(); // First remaining
        await page.waitForTimeout(300);
        await page.locator('.board-cell[data-row="9"][data-col="4"]').tap();
        await page.waitForTimeout(500);
      }
    }

    // Check mobile potential words visibility after placing tiles
    const mobilePotentialWords = await page.$('#mobile-potential-words');
    if (mobilePotentialWords) {
      const hasClass = await mobilePotentialWords.evaluate(el => el.classList.contains('has-tiles'));
      console.log(`Mobile potential words has 'has-tiles' class: ${hasClass}`);

      const box = await mobilePotentialWords.boundingBox();
      if (box) {
        console.log('Mobile Potential Words after tiles placed:');
        console.log(`  Position: y=${box.y}, height=${box.height}`);
        console.log(`  Bottom: ${box.y + box.height}`);
        console.log(`  Visible in viewport: ${box.y < viewport.height && box.y >= 0}`);
      }

      // Check actual visibility
      const isVisible = await mobilePotentialWords.isVisible();
      console.log(`  Actually visible: ${isVisible}`);

      // Get computed styles
      const styles = await mobilePotentialWords.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          height: computed.height
        };
      });
      console.log('  Computed styles:', styles);
    }

    // Check total content height
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`\nTotal body height: ${bodyHeight}px`);
    console.log(`Viewport height: ${viewport.height}px`);
    console.log(`Content exceeds viewport: ${bodyHeight > viewport.height}`);

    // Take screenshots
    await page.screenshot({ path: 'screenshots/mobile-viewport-analysis.png', fullPage: false });
    await page.screenshot({ path: 'screenshots/mobile-full-page.png', fullPage: true });

    await context.close();
  });
});