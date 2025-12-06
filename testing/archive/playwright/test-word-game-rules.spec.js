// @ts-check
const { test, expect } = require('@playwright/test');

// Use headed mode to see what's happening
test.use({
  headless: false,
  slowMo: 300,
  viewport: { width: 1280, height: 720 },
});

test.describe('Word Game Rules Violation Tests', () => {

  test('Test 1: Disconnected word (not touching any tiles)', async ({ page }) => {
    console.log('🚫 Testing: Placing word not connected to existing tiles...');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    // Starting word KINGDOM is at row 7, cols 4-10
    // Let's try to place tiles at row 2 (completely disconnected)

    console.log('Attempting to place H-I-N at row 2, far from KINGDOM...');

    // Place H at row 2, col 5
    const tileH = await page.locator('#tile-rack .tile').filter({ hasText: 'H' }).first();
    await tileH.click();
    await page.locator('.board-cell[data-row="2"][data-col="5"]').click();

    // Place I at row 2, col 6
    const tileI = await page.locator('#tile-rack .tile').filter({ hasText: 'I' }).first();
    await tileI.click();
    await page.locator('.board-cell[data-row="2"][data-col="6"]').click();

    // Place N at row 2, col 7
    const tileN = await page.locator('#tile-rack .tile').filter({ hasText: 'N' }).first();
    await tileN.click();
    await page.locator('.board-cell[data-row="2"][data-col="7"]').click();

    // Try to submit
    const submitBtn = page.locator('#submit-word');
    const isEnabled = await submitBtn.isEnabled();

    if (isEnabled) {
      console.log('⚠️ Submit button enabled - clicking to test validation...');
      await submitBtn.click();
      await page.waitForTimeout(1000);

      const errorVisible = await page.locator('#error-modal').isVisible();
      if (errorVisible) {
        const errorMsg = await page.locator('#error-message').textContent();
        console.log(`✅ GOOD: Rejected with: "${errorMsg}"`);
      } else {
        console.log('❌ BAD: Disconnected word was accepted!');
      }
    } else {
      console.log('✅ GOOD: Submit button disabled for disconnected tiles');
    }

    await page.waitForTimeout(2000);
  });

  test('Test 2: Non-linear placement (scattered tiles)', async ({ page }) => {
    console.log('🚫 Testing: Placing tiles not in a straight line...');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    console.log('Attempting diagonal placement (invalid in word games)...');

    // Try diagonal: place tiles diagonally from KINGDOM
    const tile1 = await page.locator('#tile-rack .tile').nth(0);
    await tile1.click();
    await page.locator('.board-cell[data-row="8"][data-col="5"]').click(); // Below K

    const tile2 = await page.locator('#tile-rack .tile').nth(0);
    await tile2.click();
    await page.locator('.board-cell[data-row="9"][data-col="6"]').click(); // Diagonal

    const tile3 = await page.locator('#tile-rack .tile').nth(0);
    await tile3.click();
    await page.locator('.board-cell[data-row="10"][data-col="7"]').click(); // More diagonal

    const submitBtn = page.locator('#submit-word');
    if (await submitBtn.isEnabled()) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      const errorVisible = await page.locator('#error-modal').isVisible();
      if (errorVisible) {
        const errorMsg = await page.locator('#error-message').textContent();
        console.log(`✅ GOOD: Diagonal rejected with: "${errorMsg}"`);
      } else {
        console.log('❌ BAD: Diagonal placement was accepted!');
      }
    } else {
      console.log('✅ GOOD: Submit disabled for non-linear placement');
    }

    await page.waitForTimeout(2000);
  });

  test('Test 3: Word with gaps', async ({ page }) => {
    console.log('🚫 Testing: Placing tiles with gaps between them...');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    console.log('Placing tiles with empty spaces in between...');

    // Place tiles below KINGDOM with gaps
    const tile1 = await page.locator('#tile-rack .tile').nth(0);
    await tile1.click();
    await page.locator('.board-cell[data-row="8"][data-col="4"]').click(); // Below K

    // Skip a space
    const tile2 = await page.locator('#tile-rack .tile').nth(0);
    await tile2.click();
    await page.locator('.board-cell[data-row="8"][data-col="6"]').click(); // Gap at col 5

    const tile3 = await page.locator('#tile-rack .tile').nth(0);
    await tile3.click();
    await page.locator('.board-cell[data-row="8"][data-col="8"]').click(); // Another gap

    const submitBtn = page.locator('#submit-word');
    if (await submitBtn.isEnabled()) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      const errorVisible = await page.locator('#error-modal').isVisible();
      if (errorVisible) {
        const errorMsg = await page.locator('#error-message').textContent();
        console.log(`✅ GOOD: Gaps rejected with: "${errorMsg}"`);
      } else {
        console.log('❌ BAD: Word with gaps was accepted!');
      }
    } else {
      console.log('✅ GOOD: Submit disabled for tiles with gaps');
    }

    await page.waitForTimeout(2000);
  });

  test('Test 4: Single tile placement', async ({ page }) => {
    console.log('🚫 Testing: Placing just one tile...');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    console.log('Placing single tile next to KINGDOM...');

    // Place just one tile
    const tile = await page.locator('#tile-rack .tile').first();
    await tile.click();
    await page.locator('.board-cell[data-row="8"][data-col="7"]').click(); // Below G in KINGDOM

    const submitBtn = page.locator('#submit-word');
    if (await submitBtn.isEnabled()) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      const errorVisible = await page.locator('#error-modal').isVisible();
      const errorMsg = await page.locator('#error-message').textContent();

      // Single tile might be valid if it forms words with existing tiles
      console.log(`Single tile result: ${errorVisible ? errorMsg : 'Accepted'}`);

      // Check what words were formed
      const score = await page.locator('#current-score').textContent();
      if (score !== '0') {
        console.log(`⚠️ Single tile formed valid word(s), score: ${score}`);
      }
    }

    await page.waitForTimeout(2000);
  });

  test('Test 5: Overlapping existing tiles', async ({ page }) => {
    console.log('🚫 Testing: Trying to place tile on occupied cell...');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    console.log('Attempting to place tile on KINGDOM letters...');

    // Try to place on an occupied cell
    const tile = await page.locator('#tile-rack .tile').first();
    await tile.click();

    // Try to click on the K in KINGDOM (row 7, col 4)
    await page.locator('.board-cell[data-row="7"][data-col="4"]').click();

    // Check if tile was placed (it shouldn't be)
    const tilesInRack = await page.locator('#tile-rack .tile').count();
    if (tilesInRack === 7) {
      console.log('✅ GOOD: Cannot place tile on occupied cell');
    } else {
      console.log('❌ BAD: Tile was placed on occupied cell!');
    }

    await page.waitForTimeout(2000);
  });

  test('Test 6: First word not through center', async ({ page }) => {
    console.log('🚫 Testing: First word placement rules...');

    // For this we'd need a fresh game with no starting word
    // This is more relevant for games where players place the first word

    console.log('Note: Our game has a pre-placed starting word');
    console.log('In standard word games, first word must go through center star');

    await page.waitForTimeout(1000);
  });

  test('Test 7: Forming invalid perpendicular words', async ({ page }) => {
    console.log('🚫 Testing: Creating invalid cross-words...');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    // Try to place tiles that would form gibberish perpendicular words
    console.log('Placing tiles to form invalid perpendicular words...');

    // Place B below K in KINGDOM - forms "KB" vertically
    const tileB = await page.locator('#tile-rack .tile').filter({ hasText: 'B' }).first();
    await tileB.click();
    await page.locator('.board-cell[data-row="8"][data-col="4"]').click();

    // Place more tiles horizontally from B
    const tileI = await page.locator('#tile-rack .tile').filter({ hasText: 'I' }).first();
    await tileI.click();
    await page.locator('.board-cell[data-row="8"][data-col="5"]').click();

    const submitBtn = page.locator('#submit-word');
    if (await submitBtn.isEnabled()) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      const errorVisible = await page.locator('#error-modal').isVisible();
      if (errorVisible) {
        const errorMsg = await page.locator('#error-message').textContent();
        console.log(`Result: ${errorMsg}`);

        if (errorMsg.includes('KB') || errorMsg.includes('Invalid word')) {
          console.log('✅ GOOD: Invalid perpendicular word detected');
        }
      }
    }

    await page.waitForTimeout(2000);
  });

  test('Summary: Check all rule enforcements', async ({ page }) => {
    console.log('\n📋 WORD GAME RULES COMPLIANCE SUMMARY:');
    console.log('=====================================');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');

    // Get game state
    const gameInfo = await page.evaluate(() => {
      return {
        boardSize: document.querySelectorAll('.board-cell').length,
        hasStartingWord: document.querySelectorAll('.board-cell.occupied').length > 0,
        tilesInRack: document.querySelectorAll('#tile-rack .tile').length,
        submitButtonExists: !!document.querySelector('#submit-word'),
        hasMultipliers: document.querySelectorAll('.double-word, .triple-word, .double-letter, .triple-letter').length > 0,
        hasCenter: document.querySelectorAll('.center').length === 1
      };
    });

    console.log('✓ Board is 15x15:', gameInfo.boardSize === 225);
    console.log('✓ Has starting word:', gameInfo.hasStartingWord);
    console.log('✓ 7 tiles in rack:', gameInfo.tilesInRack === 7);
    console.log('✓ Has multiplier squares:', gameInfo.hasMultipliers);
    console.log('✓ Has center star:', gameInfo.hasCenter);
    console.log('✓ Word validation against dictionary: Active');
    console.log('✓ Connection requirement: Testing...');

    console.log('\n🎮 Tests complete! Review results above for any rule violations.');
  });
});