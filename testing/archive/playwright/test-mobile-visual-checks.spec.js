// @ts-check
const { test, expect, devices } = require('@playwright/test');

test.describe('Mobile Visual Checks', () => {

  test('mobile portrait view visual inspection', async ({ page }) => {
    console.log('\n=== MOBILE PORTRAIT VISUAL CHECK ===\n');

    // iPhone 12 Pro
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:8085');
    await page.waitForTimeout(2000);

    // Full page screenshot
    await page.screenshot({
      path: 'test-results/mobile-portrait-full.png',
      fullPage: true
    });
    console.log('✓ Captured: iPhone 12 Pro portrait view');

    // Check specific elements
    const board = await page.locator('#game-board');
    await board.screenshot({
      path: 'test-results/mobile-portrait-board.png'
    });
    console.log('✓ Captured: Mobile board close-up');

    // Check tile rack
    const tileRack = await page.locator('#tile-rack');
    await tileRack.screenshot({
      path: 'test-results/mobile-portrait-rack.png'
    });
    console.log('✓ Captured: Mobile tile rack');

    // Check controls
    const controls = await page.locator('#game-controls');
    await controls.screenshot({
      path: 'test-results/mobile-portrait-controls.png'
    });
    console.log('✓ Captured: Mobile controls');

    // Check for layout issues
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    console.log(`Body width: ${bodyWidth}, Viewport: ${viewportWidth}`);

    if (bodyWidth > viewportWidth) {
      console.log('⚠️ WARNING: Horizontal scroll detected!');
      await page.screenshot({
        path: 'test-results/ERROR-mobile-horizontal-scroll.png',
        fullPage: true
      });
    }

    // Check text readability
    const wikiText = await page.locator('.wiki-context');
    if (await wikiText.isVisible()) {
      const fontSize = await wikiText.evaluate(el =>
        window.getComputedStyle(el).fontSize
      );
      console.log(`Wikipedia text size: ${fontSize}`);
    }
  });

  test('mobile landscape view visual inspection', async ({ page }) => {
    console.log('\n=== MOBILE LANDSCAPE VISUAL CHECK ===\n');

    // iPhone 12 Pro landscape
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('http://localhost:8085');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'test-results/mobile-landscape-full.png',
      fullPage: true
    });
    console.log('✓ Captured: iPhone landscape view');

    // Check if board fits
    const boardBox = await page.locator('#game-board').boundingBox();
    console.log(`Board dimensions in landscape: ${boardBox.width}x${boardBox.height}`);

    // Check if controls are visible
    const controlsVisible = await page.locator('#game-controls').isVisible();
    console.log(`Controls visible in landscape: ${controlsVisible}`);
  });

  test('small mobile device (iPhone SE)', async ({ page }) => {
    console.log('\n=== SMALL MOBILE DEVICE CHECK ===\n');

    // iPhone SE (smallest common device)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:8085');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'test-results/mobile-small-full.png',
      fullPage: true
    });
    console.log('✓ Captured: iPhone SE (small screen)');

    // Check if all elements fit
    const elements = ['#game-board', '#tile-rack', '#game-controls'];
    for (const selector of elements) {
      const elem = await page.locator(selector);
      const box = await elem.boundingBox();
      const isVisible = await elem.isVisible();
      console.log(`${selector}: ${isVisible ? 'visible' : 'hidden'}, width: ${box?.width}`);
    }
  });

  test('tablet view (iPad)', async ({ page }) => {
    console.log('\n=== TABLET VIEW CHECK ===\n');

    // iPad
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:8085');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'test-results/tablet-portrait.png',
      fullPage: true
    });
    console.log('✓ Captured: iPad portrait');

    // Check board scaling
    const boardCells = await page.locator('.board-cell').first();
    const cellSize = await boardCells.boundingBox();
    console.log(`Tablet cell size: ${cellSize.width}x${cellSize.height}`);
  });

  test('mobile interaction areas', async ({ page }) => {
    console.log('\n=== MOBILE TOUCH TARGETS CHECK ===\n');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:8085');
    await page.waitForTimeout(2000);

    // Check button sizes (should be at least 44x44 for mobile)
    const buttons = await page.locator('.btn');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const box = await btn.boundingBox();
      const text = await btn.textContent();
      console.log(`Button "${text}": ${box.width}x${box.height}px`);

      if (box.height < 44) {
        console.log(`  ⚠️ WARNING: Button too small for mobile (min 44px)`);
      }
    }

    // Check tile touch targets
    const tile = await page.locator('#tile-rack .tile').first();
    if (await tile.count() > 0) {
      const tileBox = await tile.boundingBox();
      console.log(`Tile size: ${tileBox.width}x${tileBox.height}px`);

      if (tileBox.width < 35) {
        console.log(`  ⚠️ WARNING: Tiles might be too small for touch`);
      }
    }

    // Check board cell touch targets
    const cell = await page.locator('.board-cell').first();
    const cellBox = await cell.boundingBox();
    console.log(`Board cell size: ${cellBox.width}x${cellBox.height}px`);
  });

  test('mobile game over screen', async ({ page }) => {
    console.log('\n=== MOBILE GAME OVER SCREEN CHECK ===\n');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:8085');
    await page.waitForTimeout(1500);

    // Trigger game over
    await page.evaluate(() => {
      window.gameState.score = 350;
      window.endGame();
    });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'test-results/mobile-game-over.png',
      fullPage: true
    });
    console.log('✓ Captured: Mobile game over screen');

    // Check arcade name input on mobile
    const nameInput = await page.locator('#player-name');
    const inputBox = await nameInput.boundingBox();
    console.log(`Name input size: ${inputBox.width}x${inputBox.height}px`);

    // Check share button
    const shareBtn = await page.locator('#share-game');
    const shareBox = await shareBtn.boundingBox();
    console.log(`Share button: ${shareBox.width}x${shareBox.height}px`);
  });

  test('mobile visual comparison', async ({ page }) => {
    console.log('\n=== MOBILE VISUAL COMPARISON ===\n');

    const devices = [
      { name: 'iPhone-12', width: 390, height: 844 },
      { name: 'iPhone-SE', width: 375, height: 667 },
      { name: 'Pixel-5', width: 393, height: 851 },
      { name: 'Galaxy-S21', width: 384, height: 854 }
    ];

    for (const device of devices) {
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto('http://localhost:8085');
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: `test-results/mobile-${device.name}.png`,
        fullPage: false  // Just viewport
      });
      console.log(`✓ Captured: ${device.name} (${device.width}x${device.height})`);
    }
  });

  test('mobile performance check', async ({ page }) => {
    console.log('\n=== MOBILE PERFORMANCE CHECK ===\n');

    await page.setViewportSize({ width: 390, height: 844 });

    // Start performance measurement
    await page.goto('http://localhost:8085');

    // Measure initial load time
    const loadTime = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return perf.loadEventEnd - perf.fetchStart;
    });
    console.log(`Page load time: ${loadTime}ms`);

    // Check animation smoothness
    await page.click('#shuffle-rack');
    await page.waitForTimeout(100);

    // Check for janky animations
    const animationCheck = await page.evaluate(() => {
      const tiles = document.querySelectorAll('#tile-rack .tile');
      return tiles.length > 0;
    });
    console.log(`Shuffle animation tiles present: ${animationCheck}`);

    // Test tile placement performance
    const tile = await page.locator('#tile-rack .tile').first();
    if (await tile.count() > 0) {
      await tile.click();
      const cell = await page.locator('.board-cell:not(.occupied)').first();
      await cell.click();
      console.log('✓ Tile placement interaction tested');
    }
  });
});