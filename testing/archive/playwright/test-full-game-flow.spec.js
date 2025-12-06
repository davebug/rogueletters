const { test, expect } = require('@playwright/test');

test.describe('Full Game Flow Test', () => {
  test('Complete game flow from start to share', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    console.log('\n=== STARTING FULL GAME FLOW TEST ===\n');

    // Navigate to localhost with cache busting
    await page.goto('http://localhost:8085?v=' + Date.now());
    await page.waitForTimeout(2000);

    // 1. CHECK INITIAL STATE
    console.log('1. Checking initial game state...');

    const initialTileCount = await page.locator('#tile-rack .tile').count();
    console.log(`   Initial tiles in rack: ${initialTileCount}`);

    // Check if submit button is hidden initially
    const submitVisible = await page.locator('#mobile-submit-container').isVisible();
    console.log(`   Submit button initially visible: ${submitVisible}`);
    expect(submitVisible).toBe(false);

    // Get initial tiles
    const initialTiles = await page.locator('#tile-rack .tile').evaluateAll(tiles =>
      tiles.map(t => t.dataset.letter)
    );
    console.log(`   Initial tiles: ${initialTiles.join(', ')}`);

    // 2. PLACE TILES AND CHECK SUBMIT BUTTON
    console.log('\n2. Placing tiles on board...');

    // Place first 3 tiles on the board (simple horizontal word)
    for (let i = 0; i < 3 && i < initialTileCount; i++) {
      const tile = page.locator('#tile-rack .tile').first();
      const targetCell = page.locator('.board-cell').nth(112 + i); // Center row
      await tile.dragTo(targetCell);
      await page.waitForTimeout(500);
    }

    // Check submit button visibility after placing tiles
    const submitAfterPlacement = await page.locator('#mobile-submit-container').isVisible();
    console.log(`   Submit button after placement: ${submitAfterPlacement}`);

    // Check potential words display
    const potentialWords = await page.locator('#mobile-potential-words').isVisible();
    console.log(`   Potential words visible: ${potentialWords}`);

    // Get the word and score
    const wordInfo = await page.evaluate(() => {
      const wordList = document.querySelector('#mobile-potential-words-list');
      if (wordList) {
        const wordText = wordList.querySelector('.word-text')?.textContent;
        const wordScore = wordList.querySelector('.word-score')?.textContent;
        const totalScore = wordList.querySelector('.total-score')?.textContent;
        return { wordText, wordScore, totalScore };
      }
      return null;
    });
    console.log(`   Word formed: ${wordInfo?.wordText || 'none'}`);
    console.log(`   Word score: ${wordInfo?.wordScore || 'none'}`);
    console.log(`   Total score: ${wordInfo?.totalScore || 'none'}`);

    // 3. SUBMIT WORD AND CHECK TILE REPLACEMENT
    console.log('\n3. Submitting word...');

    const remainingTilesBeforeSubmit = await page.locator('#tile-rack .tile').count();
    console.log(`   Tiles in rack before submit: ${remainingTilesBeforeSubmit}`);

    // Click submit button
    if (submitAfterPlacement) {
      await page.locator('#mobile-submit-container button').click();
      await page.waitForTimeout(1000);
    }

    const remainingTilesAfterSubmit = await page.locator('#tile-rack .tile').count();
    console.log(`   Tiles in rack after submit: ${remainingTilesAfterSubmit}`);

    // Check if tiles were properly replaced (should be back to 7)
    const tilesReplaced = remainingTilesAfterSubmit === 7;
    console.log(`   Tiles properly replaced: ${tilesReplaced}`);

    // Check turn counter
    const currentTurn = await page.evaluate(() => {
      const currentSquare = document.querySelector('.feedback-square.current-turn');
      if (currentSquare) {
        const parent = currentSquare.parentElement;
        const squares = Array.from(parent.querySelectorAll('.feedback-square'));
        return squares.indexOf(currentSquare) + 1;
      }
      return 1;
    });
    console.log(`   Current turn: ${currentTurn}`);

    // Check first turn score
    const firstTurnScore = await page.locator('.feedback-square.completed').first().textContent();
    console.log(`   First turn score: ${firstTurnScore}`);

    // 4. PLAY REMAINING TURNS (simplified - just place and submit)
    console.log('\n4. Playing remaining turns...');

    for (let turn = 2; turn <= 5; turn++) {
      console.log(`\n   Turn ${turn}:`);

      // Place 3 tiles
      for (let i = 0; i < 3; i++) {
        const tile = page.locator('#tile-rack .tile').first();
        // Find empty cells
        const emptyCell = page.locator('.board-cell:not(.occupied)').first();
        await tile.dragTo(emptyCell);
        await page.waitForTimeout(300);
      }

      // Submit
      const submitBtn = page.locator('#mobile-submit-container button');
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(1000);
        console.log(`   Turn ${turn} submitted`);
      }
    }

    // 5. CHECK GAME OVER STATE
    console.log('\n5. Checking game over state...');

    // Wait for game over section
    await page.waitForTimeout(2000);

    const gameOverVisible = await page.locator('#game-over-section').isVisible();
    console.log(`   Game over section visible: ${gameOverVisible}`);

    if (gameOverVisible) {
      // Check final score display
      const finalScore = await page.locator('#final-score-display').textContent();
      console.log(`   Final score: ${finalScore}`);

      // Check if name input is present
      const nameInputVisible = await page.locator('#player-name').isVisible();
      console.log(`   Name input visible: ${nameInputVisible}`);

      // Check if submit score button is present
      const submitScoreVisible = await page.locator('#submit-score').isVisible();
      console.log(`   Submit score button visible: ${submitScoreVisible}`);

      // Check if share button is present
      const shareButtonVisible = await page.locator('#share-game').isVisible();
      console.log(`   Share button visible: ${shareButtonVisible}`);

      // 6. TEST HIGH SCORE SUBMISSION
      if (nameInputVisible && submitScoreVisible) {
        console.log('\n6. Testing high score submission...');

        await page.locator('#player-name').fill('TST');
        await page.locator('#submit-score').click();
        await page.waitForTimeout(1000);

        // Check if high scores section appears
        const highScoresVisible = await page.locator('#high-scores-section').isVisible();
        console.log(`   High scores section visible: ${highScoresVisible}`);
      }

      // 7. TEST SHARE FUNCTIONALITY
      if (shareButtonVisible) {
        console.log('\n7. Testing share functionality...');

        // Mock the clipboard API
        await page.evaluate(() => {
          window.clipboardText = '';
          navigator.clipboard = {
            writeText: (text) => {
              window.clipboardText = text;
              return Promise.resolve();
            }
          };
        });

        await page.locator('#share-game').click();
        await page.waitForTimeout(500);

        const copiedText = await page.evaluate(() => window.clipboardText);
        console.log(`   Share text copied: ${copiedText ? 'Yes' : 'No'}`);
        if (copiedText) {
          console.log(`   Share preview: ${copiedText.substring(0, 100)}...`);
        }
      }
    }

    // Take final screenshot
    await page.screenshot({
      path: 'full-game-flow-test.png',
      fullPage: false
    });

    console.log('\n=== GAME FLOW TEST COMPLETE ===\n');
  });
});