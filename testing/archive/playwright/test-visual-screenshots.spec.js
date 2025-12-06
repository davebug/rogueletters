// @ts-check
const { test, expect, devices } = require('@playwright/test');

test.describe('Visual Screenshot Analysis', () => {

  test('capture full user journey with screenshots', async ({ page }) => {
    console.log('\n=== CAPTURING FULL USER JOURNEY ===\n');

    // 1. Initial page load
    await page.goto('http://localhost:8085');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'test-results/01-initial-load.png',
      fullPage: true
    });
    console.log('✓ Captured: Initial page load');

    // 2. Wait for game to fully load
    await page.waitForSelector('#game-board .tile', { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'test-results/02-game-loaded.png',
      fullPage: true
    });
    console.log('✓ Captured: Game fully loaded');

    // 3. Check for loading overlay issues
    const loadingOverlay = await page.locator('#loading-overlay');
    const isLoadingVisible = await loadingOverlay.isVisible();
    console.log('Loading overlay visible:', isLoadingVisible);
    if (isLoadingVisible) {
      await page.screenshot({
        path: 'test-results/ERROR-loading-stuck.png',
        fullPage: true
      });
      console.log('⚠️ ERROR: Loading overlay is stuck visible!');
    }

    // 4. Hover effects on board
    const emptyCell = await page.locator('.board-cell:not(.occupied)').first();
    await emptyCell.hover();
    await page.screenshot({
      path: 'test-results/03-cell-hover.png',
      fullPage: false
    });
    console.log('✓ Captured: Cell hover effect');

    // 5. Click a tile in rack
    const firstTile = await page.locator('#tile-rack .tile').first();
    if (await firstTile.count() > 0) {
      await firstTile.click();
      await page.screenshot({
        path: 'test-results/04-tile-selected.png',
        fullPage: false
      });
      console.log('✓ Captured: Tile selection');
    }

    // 6. Shuffle animation
    await page.click('#shuffle-rack');
    await page.waitForTimeout(300); // Mid-animation
    await page.screenshot({
      path: 'test-results/05-shuffle-animation.png',
      fullPage: false
    });
    console.log('✓ Captured: Shuffle animation');

    // 7. Trigger game over screen
    await page.evaluate(() => {
      window.gameState.score = 250;
      window.gameState.turnHistory = [
        { score: 45 }, { score: 65 }, { score: 35 },
        { score: 55 }, { score: 50 }
      ];
      window.endGame();
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'test-results/06-game-over.png',
      fullPage: true
    });
    console.log('✓ Captured: Game over screen');

    console.log('\n✅ Screenshot journey complete!');
  });

  test('responsive design screenshots', async ({ page }) => {
    console.log('\n=== CAPTURING RESPONSIVE BREAKPOINTS ===\n');

    const viewports = [
      { name: 'Desktop-4K', width: 3840, height: 2160 },
      { name: 'Desktop-HD', width: 1920, height: 1080 },
      { name: 'Laptop', width: 1366, height: 768 },
      { name: 'Tablet-Landscape', width: 1024, height: 768 },
      { name: 'Tablet-Portrait', width: 768, height: 1024 },
      { name: 'Mobile-Large', width: 414, height: 896 },
      { name: 'Mobile-Small', width: 320, height: 568 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:8085');
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: `test-results/viewport-${viewport.name}.png`,
        fullPage: true
      });
      console.log(`✓ Captured: ${viewport.name} (${viewport.width}x${viewport.height})`);

      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });

      if (hasHorizontalScroll) {
        console.log(`⚠️ WARNING: Horizontal scroll detected at ${viewport.name}!`);
        await page.screenshot({
          path: `test-results/ERROR-horizontal-scroll-${viewport.name}.png`,
          fullPage: true
        });
      }

      // Check if elements are cut off
      const appBox = await page.locator('#app').boundingBox();
      if (appBox && appBox.width > viewport.width) {
        console.log(`⚠️ WARNING: Content overflow at ${viewport.name}!`);
      }
    }

    console.log('\n✅ Responsive screenshots complete!');
  });

  test('visual regression check', async ({ page }) => {
    console.log('\n=== VISUAL REGRESSION CHECK ===\n');

    await page.goto('http://localhost:8085');
    await page.waitForTimeout(2000);

    // Check specific visual elements
    const checks = [
      { selector: 'header', name: 'header' },
      { selector: '#game-board', name: 'board' },
      { selector: '#tile-rack', name: 'tile-rack' },
      { selector: '#game-controls', name: 'controls' },
      { selector: '.wikipedia-info', name: 'wiki-info' }
    ];

    for (const check of checks) {
      const element = await page.locator(check.selector);
      if (await element.count() > 0 && await element.isVisible()) {
        await element.screenshot({
          path: `test-results/element-${check.name}.png`
        });
        console.log(`✓ Captured element: ${check.name}`);

        // Check element positioning
        const box = await element.boundingBox();
        if (box) {
          console.log(`  Position: ${box.x}, ${box.y}`);
          console.log(`  Size: ${box.width}x${box.height}`);

          // Check for common issues
          if (box.x < 0 || box.y < 0) {
            console.log(`  ⚠️ WARNING: Element positioned off-screen!`);
          }
          if (box.width === 0 || box.height === 0) {
            console.log(`  ⚠️ WARNING: Element has zero dimensions!`);
          }
        }
      } else {
        console.log(`⚠️ Element not found or hidden: ${check.name}`);
      }
    }

    console.log('\n✅ Visual regression check complete!');
  });

  test('color contrast and accessibility', async ({ page }) => {
    console.log('\n=== ACCESSIBILITY & CONTRAST CHECK ===\n');

    await page.goto('http://localhost:8085');
    await page.waitForTimeout(2000);

    // Check text contrast
    const elements = [
      { selector: 'header h1', name: 'Title' },
      { selector: '.tile-letter', name: 'Tile letters' },
      { selector: '.btn', name: 'Buttons' },
      { selector: '#current-score', name: 'Score display' }
    ];

    for (const elem of elements) {
      const element = await page.locator(elem.selector).first();
      if (await element.count() > 0) {
        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el);
          const parent = window.getComputedStyle(el.parentElement);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor === 'rgba(0, 0, 0, 0)'
              ? parent.backgroundColor
              : computed.backgroundColor,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight
          };
        });

        console.log(`${elem.name}:`);
        console.log(`  Color: ${styles.color}`);
        console.log(`  Background: ${styles.backgroundColor}`);
        console.log(`  Font: ${styles.fontSize} (${styles.fontWeight})`);

        // Take close-up screenshot for contrast check
        await element.screenshot({
          path: `test-results/contrast-${elem.name.replace(/\s+/g, '-')}.png`
        });
      }
    }

    // Check focus states
    await page.keyboard.press('Tab');
    await page.screenshot({
      path: 'test-results/focus-state-1.png',
      fullPage: false
    });
    console.log('✓ Captured: First tab focus state');

    await page.keyboard.press('Tab');
    await page.screenshot({
      path: 'test-results/focus-state-2.png',
      fullPage: false
    });
    console.log('✓ Captured: Second tab focus state');

    console.log('\n✅ Accessibility check complete!');
  });

  test('animation and transition smoothness', async ({ page }) => {
    console.log('\n=== ANIMATION & TRANSITION CHECK ===\n');

    await page.goto('http://localhost:8085');
    await page.waitForTimeout(2000);

    // Capture tile hover animation
    const tile = await page.locator('#tile-rack .tile').first();
    if (await tile.count() > 0) {
      // Before hover
      await tile.screenshot({ path: 'test-results/tile-before-hover.png' });

      // During hover
      await tile.hover();
      await page.waitForTimeout(100);
      await tile.screenshot({ path: 'test-results/tile-during-hover.png' });
      console.log('✓ Captured: Tile hover transition');
    }

    // Capture button states
    const submitBtn = await page.locator('#submit-word');

    // Normal state
    await submitBtn.screenshot({ path: 'test-results/button-normal.png' });

    // Hover state
    await submitBtn.hover();
    await page.waitForTimeout(100);
    await submitBtn.screenshot({ path: 'test-results/button-hover.png' });

    // Check if disabled
    const isDisabled = await submitBtn.isDisabled();
    if (isDisabled) {
      await submitBtn.screenshot({ path: 'test-results/button-disabled.png' });
      console.log('✓ Captured: Button disabled state');
    }

    console.log('✓ Captured: Button transitions');

    // Capture board cell hover
    const boardCell = await page.locator('.board-cell:not(.occupied)').first();
    await boardCell.screenshot({ path: 'test-results/cell-before-hover.png' });
    await boardCell.hover();
    await page.waitForTimeout(100);
    await boardCell.screenshot({ path: 'test-results/cell-during-hover.png' });
    console.log('✓ Captured: Board cell hover effect');

    console.log('\n✅ Animation check complete!');
  });

  test('error states and edge cases', async ({ page }) => {
    console.log('\n=== ERROR STATES & EDGE CASES ===\n');

    await page.goto('http://localhost:8085');
    await page.waitForTimeout(2000);

    // Test with no tiles (simulate end of game scenario)
    await page.evaluate(() => {
      document.getElementById('tile-rack').innerHTML = '';
    });
    await page.screenshot({
      path: 'test-results/edge-case-no-tiles.png',
      fullPage: false
    });
    console.log('✓ Captured: Empty tile rack');

    // Test error modal appearance
    await page.evaluate(() => {
      const modal = document.getElementById('error-modal');
      const message = document.getElementById('error-message');
      if (modal && message) {
        message.textContent = 'Test error message for visual check';
        modal.style.display = 'flex';
      }
    });
    await page.waitForTimeout(200);
    await page.screenshot({
      path: 'test-results/error-modal-visible.png',
      fullPage: true
    });
    console.log('✓ Captured: Error modal');

    // Test with very long player name
    await page.evaluate(() => {
      window.endGame();
    });
    await page.waitForTimeout(500);
    const nameInput = await page.locator('#player-name');
    if (await nameInput.isVisible()) {
      await nameInput.fill('VERYLONGNAME');
      await page.screenshot({
        path: 'test-results/edge-case-long-name.png',
        fullPage: false
      });
      console.log('✓ Captured: Long name input handling');
    }

    console.log('\n✅ Edge case check complete!');
  });
});