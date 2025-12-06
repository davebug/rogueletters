const { test, expect } = require('@playwright/test');

test.describe('Mobile Debug Mode - Potential Words Interface', () => {
  test('Check potential words display and submission with tap interface', async ({ browser }) => {
    // Create mobile context
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE size
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      hasTouch: true,
      isMobile: true
    });
    const page = await context.newPage();

    // Enable debug mode on localhost
    await page.goto('http://localhost:8085?debug=true');
    await page.waitForTimeout(2000);

    console.log('=== Initial Game State ===');

    // Wait for game to load
    await page.waitForSelector('#tile-rack', { timeout: 10000 });

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/mobile-debug-initial.png', fullPage: true });

    // Get rack tiles
    const rackTiles = await page.locator('#tile-rack .tile').all();
    const rackTileInfo = [];
    for (let i = 0; i < rackTiles.length; i++) {
      const tile = rackTiles[i];
      const letter = await tile.textContent();
      rackTileInfo.push({
        letter: letter.trim(),
        index: i,
        element: tile
      });
    }
    console.log('Rack tiles:', rackTileInfo.map(t => ({ letter: t.letter, index: t.index })));

    // Find the starting word on the board
    const boardTiles = await page.locator('.board-cell .tile').all();
    const boardTileInfo = [];
    for (const tile of boardTiles) {
      const parent = await tile.locator('..').first();
      const row = await parent.getAttribute('data-row');
      const col = await parent.getAttribute('data-col');
      const letter = await tile.textContent();
      boardTileInfo.push({
        letter: letter.replace(/[0-9]/g, '').trim(),
        row: parseInt(row),
        col: parseInt(col)
      });
    }
    console.log('Starting word tiles:', boardTileInfo);

    console.log('\n=== Testing Tap-to-Select Interface ===');

    // Test the tap-to-select interface
    if (rackTileInfo.length > 0) {
      // Tap the first rack tile to select it
      const firstTile = rackTileInfo[0].element;
      await firstTile.tap();
      await page.waitForTimeout(500);

      // Check if tile is selected
      const isSelected = await firstTile.evaluate(el =>
        el.classList.contains('selected')
      );
      console.log(`Tile "${rackTileInfo[0].letter}" selected:`, isSelected);

      // Take screenshot showing selected tile
      await page.screenshot({ path: 'screenshots/mobile-debug-tile-selected.png', fullPage: true });

      // Find a valid placement location (adjacent to starting word if it exists)
      let targetRow, targetCol;
      if (boardTileInfo.length > 0) {
        const firstStartingTile = boardTileInfo[0];
        targetRow = firstStartingTile.row + 1;
        targetCol = firstStartingTile.col;
      } else {
        // No starting word, place at center
        targetRow = 7;
        targetCol = 7;
      }

      // Tap the target board square
      const targetSquare = page.locator(`.board-cell[data-row="${targetRow}"][data-col="${targetCol}"]`);
      console.log(`Tapping board square at row ${targetRow}, col ${targetCol}`);
      await targetSquare.tap();
      await page.waitForTimeout(500);

      // Check if tile was placed
      const tilePlaced = await targetSquare.locator('.tile').count() > 0;
      console.log('Tile placed on board:', tilePlaced);

      // Take screenshot after placing first tile
      await page.screenshot({ path: 'screenshots/mobile-debug-first-tile-placed.png', fullPage: true });
    }

    console.log('\n=== Checking Potential Words Display ===');

    // Check for mobile potential words section
    const mobilePotentialWords = await page.$('#potential-words-mobile');
    if (mobilePotentialWords) {
      const isVisible = await page.isVisible('#potential-words-mobile');
      console.log('Mobile potential words section visible:', isVisible);

      if (isVisible) {
        const content = await page.$eval('#potential-words-mobile', el => ({
          text: el.textContent,
          display: window.getComputedStyle(el).display,
          visibility: window.getComputedStyle(el).visibility,
          position: el.getBoundingClientRect()
        }));
        console.log('Mobile potential words:', content);
      }
    }

    // Check for regular potential words section
    const potentialWords = await page.$('#potential-words');
    if (potentialWords) {
      const isVisible = await page.isVisible('#potential-words');
      console.log('Regular potential words visible:', isVisible);

      if (isVisible) {
        const words = await page.$$eval('#potential-words .potential-word', elements =>
          elements.map(el => el.textContent)
        );
        console.log('Potential words found:', words);
      }
    }

    // Place a second tile to form a word
    if (rackTileInfo.length > 1) {
      console.log('\n=== Placing Second Tile ===');

      // Select second tile
      const secondTile = rackTileInfo[1].element;
      await secondTile.tap();
      await page.waitForTimeout(500);

      // Place it adjacent to first tile
      let targetRow2, targetCol2;
      if (boardTileInfo.length > 0) {
        targetRow2 = boardTileInfo[0].row + 2;
        targetCol2 = boardTileInfo[0].col;
      } else {
        targetRow2 = 7;
        targetCol2 = 8;
      }
      const targetSquare2 = page.locator(`.board-cell[data-row="${targetRow2}"][data-col="${targetCol2}"]`);

      await targetSquare2.tap();
      await page.waitForTimeout(500);

      // Take screenshot after placing second tile
      await page.screenshot({ path: 'screenshots/mobile-debug-two-tiles-placed.png', fullPage: true });
    }

    console.log('\n=== Checking Submit Interface ===');

    // Look for submit button (could be mobile-specific or regular)
    const submitSelectors = [
      '#submit-word',
      '#mobile-submit-word',
      '#submit-button',
      'button[type="submit"]'
    ];

    for (const selector of submitSelectors) {
      const element = await page.$(selector);
      if (element) {
        const info = await page.$eval(selector, el => ({
          id: el.id,
          text: el.textContent,
          disabled: el.disabled,
          display: window.getComputedStyle(el).display,
          visibility: window.getComputedStyle(el).visibility,
          position: el.getBoundingClientRect()
        }));
        console.log(`Found submit button:`, info);

        // Try clicking it in debug mode
        if (!info.disabled && info.visibility !== 'hidden') {
          console.log('Attempting to submit in debug mode...');
          await page.click(selector);
          await page.waitForTimeout(2000);

          // Check if submission worked
          const score = await page.$eval('#score', el => el.textContent);
          console.log('Score after submission:', score);

          // Take screenshot after submission
          await page.screenshot({ path: 'screenshots/mobile-debug-after-submit.png', fullPage: true });
          break;
        }
      }
    }

    // Check the footer area for any UI elements
    console.log('\n=== Checking Footer Area ===');
    const footer = await page.$('#footer');
    if (footer) {
      const footerContent = await page.$eval('#footer', el => ({
        text: el.textContent.substring(0, 100),
        hasButtons: el.querySelectorAll('button').length,
        display: window.getComputedStyle(el).display
      }));
      console.log('Footer content:', footerContent);
    }

    // Scroll to bottom to see if there are hidden UI elements
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/mobile-debug-scrolled-bottom.png', fullPage: true });

    // Check rack area for UI elements
    const rackContainer = await page.$('#tile-rack-container');
    if (rackContainer) {
      const rackInfo = await page.$eval('#tile-rack-container', el => ({
        children: Array.from(el.children).map(child => ({
          tag: child.tagName,
          id: child.id,
          class: child.className
        }))
      }));
      console.log('Rack container children:', rackInfo);
    }

    await context.close();
  });
});