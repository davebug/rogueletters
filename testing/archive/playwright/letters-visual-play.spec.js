// @ts-check
const { test, expect } = require('@playwright/test');

// Slow down all actions so they're visible
test.use({
  // Launch browser in headed mode (visible)
  headless: false,

  // Slow down actions by 500ms so you can see what's happening
  slowMo: 500,

  // Set viewport
  viewport: { width: 1280, height: 720 },

  // Record video
  video: 'on',
});

test.describe('Letters Game - Visual Gameplay Demo', () => {
  test('Watch me play a complete turn', async ({ page }) => {
    console.log('🎮 Starting Letters game visual demo...');
    console.log('👀 You should see a browser window open!');

    // Navigate to the game
    await page.goto('http://localhost:8085/?seed=20250920');

    // Wait for game to load
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForTimeout(1000); // Pause to let you see the board

    console.log('📋 Game loaded! Looking at the board...');

    // Get the starting word
    const startingWord = await page.evaluate(() => {
      const cells = document.querySelectorAll('.board-cell.occupied');
      return Array.from(cells).map(cell => cell.textContent).join('');
    });
    console.log(`📝 Starting word is: ${startingWord}`);

    // Get available tiles
    const tiles = await page.evaluate(() => {
      const tileElements = document.querySelectorAll('#tile-rack .tile .tile-letter');
      return Array.from(tileElements).map(t => t.textContent);
    });
    console.log(`🎲 My tiles are: ${tiles.join(', ')}`);

    // Highlight the tile rack
    await page.locator('#tile-rack').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Let's try to form a word
    console.log('🤔 Thinking about what word to make...');
    await page.waitForTimeout(2000);

    // I have tiles: A, I, H, B, I, N, O
    // Starting word: KINGDOM
    // Let's try to make "BIND" connecting to the "D" in KINGDOM

    console.log('💡 I\'ll try to make "BIND" connecting to the D in KINGDOM');

    // Find the D in KINGDOM (should be at row 7, col 10)
    const kingdomCells = await page.locator('.board-cell.occupied').all();

    // First, let's place B above the D
    console.log('1️⃣ Selecting tile B...');
    const tileB = await page.locator('#tile-rack .tile').filter({ hasText: 'B' }).first();
    await tileB.click();
    await page.waitForTimeout(500);

    console.log('   Placing B above the D in KINGDOM...');
    await page.locator('.board-cell[data-row="6"][data-col="10"]').click();
    await page.waitForTimeout(1000);

    // Now select I
    console.log('2️⃣ Selecting tile I...');
    const tileI = await page.locator('#tile-rack .tile').filter({ hasText: 'I' }).first();
    await tileI.click();
    await page.waitForTimeout(500);

    console.log('   Placing I above the B...');
    await page.locator('.board-cell[data-row="5"][data-col="10"]').click();
    await page.waitForTimeout(1000);

    // Now select N
    console.log('3️⃣ Selecting tile N...');
    const tileN = await page.locator('#tile-rack .tile').filter({ hasText: 'N' }).first();
    await tileN.click();
    await page.waitForTimeout(500);

    console.log('   Placing N above the I...');
    await page.locator('.board-cell[data-row="4"][data-col="10"]').click();
    await page.waitForTimeout(1000);

    console.log('✅ Word formed: BIND (reading downward)');
    await page.waitForTimeout(2000);

    // Check if submit button is enabled
    const submitButton = page.locator('#submit-word');
    const isEnabled = await submitButton.isEnabled();

    if (isEnabled) {
      console.log('🎯 Submit button is enabled! Submitting word...');
      await submitButton.click();
      await page.waitForTimeout(2000);

      // Check for validation result
      const errorModal = await page.locator('#error-modal').isVisible();
      if (errorModal) {
        const errorMessage = await page.locator('#error-message').textContent();
        console.log(`❌ Word rejected: ${errorMessage}`);
      } else {
        // Check if score updated
        const newScore = await page.locator('#current-score').textContent();
        console.log(`✅ Word accepted! New score: ${newScore}`);
      }
    } else {
      console.log('⚠️ Submit button is still disabled');
    }

    console.log('🎮 Demo complete! Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);
  });

  test('Watch me try invalid word placement', async ({ page }) => {
    console.log('🎮 Demo 2: Trying invalid word placement...');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    console.log('❌ Let me try to place tiles that don\'t connect...');

    // Try to place a tile far from the starting word
    const firstTile = await page.locator('#tile-rack .tile').first();
    await firstTile.click();
    await page.waitForTimeout(500);

    console.log('   Trying to place in corner (invalid - not connected)...');
    await page.locator('.board-cell[data-row="0"][data-col="0"]').click();
    await page.waitForTimeout(1000);

    // Try another disconnected placement
    const secondTile = await page.locator('#tile-rack .tile').nth(1);
    await secondTile.click();
    await page.waitForTimeout(500);

    await page.locator('.board-cell[data-row="1"][data-col="0"]').click();
    await page.waitForTimeout(1000);

    // Try to submit
    console.log('🔴 Attempting to submit invalid placement...');
    const submitButton = page.locator('#submit-word');

    if (await submitButton.isEnabled()) {
      await submitButton.click();
      await page.waitForTimeout(2000);

      // Should see error
      const errorVisible = await page.locator('#error-modal').isVisible();
      if (errorVisible) {
        const errorMsg = await page.locator('#error-message').textContent();
        console.log(`✅ Correctly rejected: "${errorMsg}"`);
      }
    } else {
      console.log('✅ Submit button correctly disabled for invalid placement');
    }

    console.log('🎮 Demo complete!');
    await page.waitForTimeout(3000);
  });
});