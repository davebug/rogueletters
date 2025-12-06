const { test, expect } = require('@playwright/test');

test.describe('Mobile Word Submission Interface', () => {
  test('Examine potential words display and submission mechanism', async ({ browser }) => {
    // Create mobile context
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      hasTouch: true,
      isMobile: true
    });
    const page = await context.newPage();

    // Enable debug mode
    await page.goto('http://localhost:8085?debug=true');
    await page.waitForTimeout(2000);

    // Wait for game to load
    await page.waitForSelector('#tile-rack', { timeout: 10000 });

    // Get tiles and place them to form a word
    const rackTiles = await page.locator('#tile-rack .tile').all();
    const boardCells = await page.locator('.board-cell').all();

    console.log(`Found ${rackTiles.length} rack tiles`);

    // Place first tile
    if (rackTiles.length > 0) {
      await rackTiles[0].tap();
      await page.waitForTimeout(300);

      // Find center position or adjacent to starting word
      const centerCell = await page.locator('.board-cell[data-row="8"][data-col="4"]');
      await centerCell.tap();
      await page.waitForTimeout(500);
    }

    // Place second tile
    if (rackTiles.length > 1) {
      await rackTiles[0].tap(); // First remaining tile
      await page.waitForTimeout(300);

      const nextCell = await page.locator('.board-cell[data-row="9"][data-col="4"]');
      await nextCell.tap();
      await page.waitForTimeout(500);
    }

    console.log('\n=== Analyzing Potential Words Display ===');

    // Look for potential word display elements
    const selectors = [
      '.potential-word',
      '.word-display',
      '.word-preview',
      '#potential-words',
      '#word-formed',
      '[class*="potential"]',
      '[class*="word-display"]'
    ];

    for (const selector of selectors) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        for (const element of elements) {
          const text = await element.textContent();
          const isVisible = await element.isVisible();
          if (text && text.trim()) {
            console.log(`  - Text: "${text.trim()}", Visible: ${isVisible}`);
          }
        }
      }
    }

    // Check the area between board and rack
    const boardBottom = await page.locator('#board').boundingBox();
    const rackTop = await page.locator('#tile-rack').boundingBox();

    if (boardBottom && rackTop) {
      console.log(`\nSpace between board and rack: ${rackTop.y - (boardBottom.y + boardBottom.height)}px`);

      // Take a screenshot of just this area
      await page.screenshot({
        path: 'screenshots/mobile-potential-words-area.png',
        clip: {
          x: 0,
          y: boardBottom.y + boardBottom.height,
          width: 375,
          height: rackTop.y - (boardBottom.y + boardBottom.height)
        }
      });
    }

    // Look for any elements containing point values
    const pointElements = await page.locator('*:has-text("pts")').all();
    console.log(`\nFound ${pointElements.length} elements with "pts" text`);
    for (const element of pointElements) {
      const text = await element.textContent();
      const tagName = await element.evaluate(el => el.tagName);
      console.log(`  - ${tagName}: "${text.trim()}"`);
    }

    // Check for clickable/tappable elements in the potential words area
    const interactiveElements = await page.$$eval('button, [onclick], [role="button"]', elements =>
      elements.map(el => ({
        tag: el.tagName,
        id: el.id,
        class: el.className,
        text: el.textContent.substring(0, 30),
        visible: el.offsetParent !== null
      }))
    );
    console.log('\nInteractive elements:', interactiveElements.filter(e => e.visible));

    // Try to find and click submit mechanism
    console.log('\n=== Testing Submit Mechanism ===');

    // Look for the word display that shows points
    const wordWithPoints = await page.locator('*:has-text("6 pts")').first();
    if (await wordWithPoints.count() > 0) {
      console.log('Found word with points display');
      const bbox = await wordWithPoints.boundingBox();
      if (bbox) {
        console.log(`Position: x=${bbox.x}, y=${bbox.y}, width=${bbox.width}, height=${bbox.height}`);

        // Try tapping on it
        await wordWithPoints.tap();
        await page.waitForTimeout(1000);

        // Check if score changed
        const score = await page.locator('#score').textContent();
        console.log('Score after tapping word display:', score);
      }
    }

    // Take final screenshot
    await page.screenshot({ path: 'screenshots/mobile-submission-interface.png', fullPage: true });

    await context.close();
  });
});