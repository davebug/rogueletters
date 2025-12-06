const { test, expect } = require('@playwright/test');

test.describe('Game Click Flow Test', () => {
  test('Test game using click interactions', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    console.log('\n=== CLICK-BASED GAME TEST ===\n');

    // Navigate to localhost
    await page.goto('http://localhost:8085?v=' + Date.now());
    await page.waitForTimeout(2000);

    // 1. CHECK INITIAL STATE
    console.log('1. Initial state:');
    const initialTiles = await page.locator('#tile-rack .tile').count();
    console.log(`   Tiles in rack: ${initialTiles}`);

    // Check mobile potential words visibility classes
    const mobilePotentialClasses = await page.locator('#mobile-potential-words').getAttribute('class');
    console.log(`   Mobile potential words classes: ${mobilePotentialClasses || 'none'}`);

    // 2. TRY CLICK TO SELECT AND PLACE
    console.log('\n2. Testing click to select/place:');

    // Click first tile to select it
    await page.locator('#tile-rack .tile').first().click();
    await page.waitForTimeout(500);

    const selectedTile = await page.locator('#tile-rack .tile.selected').count();
    console.log(`   Selected tiles: ${selectedTile}`);

    // Click center board cell to place
    const centerCell = page.locator('.board-cell').nth(112);
    await centerCell.click();
    await page.waitForTimeout(500);

    // Check if tile was placed
    const placedTiles = await page.locator('.board-cell.occupied').count();
    console.log(`   Placed tiles on board: ${placedTiles}`);

    const remainingRackTiles = await page.locator('#tile-rack .tile').count();
    console.log(`   Remaining rack tiles: ${remainingRackTiles}`);

    // 3. CHECK MOBILE UI UPDATES
    console.log('\n3. Checking mobile UI updates:');

    // Check if mobile potential words got has-tiles class
    const updatedClasses = await page.locator('#mobile-potential-words').getAttribute('class');
    console.log(`   Mobile potential words classes: ${updatedClasses || 'none'}`);
    const hasTilesClass = updatedClasses && updatedClasses.includes('has-tiles');
    console.log(`   Has 'has-tiles' class: ${hasTilesClass}`);

    // Check computed visibility
    const potentialWordsVisible = await page.locator('#mobile-potential-words').isVisible();
    console.log(`   Potential words visible: ${potentialWordsVisible}`);

    // Check submit button
    const submitVisible = await page.locator('#mobile-submit-container').isVisible();
    console.log(`   Submit button visible: ${submitVisible}`);

    // 4. CHECK GAME STATE
    console.log('\n4. Checking game state:');

    const gameState = await page.evaluate(() => {
      if (window.gameState) {
        return {
          placedTiles: window.gameState.placedTiles?.length || 0,
          currentTurn: window.gameState.currentTurn,
          totalScore: window.gameState.totalScore,
          boardHasTiles: window.gameState.board?.some(row => row.some(cell => cell !== null))
        };
      }
      return null;
    });

    if (gameState) {
      console.log(`   Placed tiles in state: ${gameState.placedTiles}`);
      console.log(`   Current turn: ${gameState.currentTurn}`);
      console.log(`   Total score: ${gameState.totalScore}`);
      console.log(`   Board has tiles: ${gameState.boardHasTiles}`);
    }

    // 5. MANUALLY TRIGGER WORD CHECK
    console.log('\n5. Manually checking word validity:');

    await page.evaluate(() => {
      if (window.checkWordValidity) {
        window.checkWordValidity();
      }
    });
    await page.waitForTimeout(500);

    // Check again
    const submitAfterCheck = await page.locator('#mobile-submit-container').isVisible();
    console.log(`   Submit button after manual check: ${submitAfterCheck}`);

    // Get word info
    const wordInfo = await page.evaluate(() => {
      const container = document.querySelector('#mobile-potential-words-list');
      if (container) {
        return {
          hasContent: container.children.length > 0,
          text: container.textContent
        };
      }
      return null;
    });
    console.log(`   Word info: ${JSON.stringify(wordInfo)}`);

    // Take screenshot
    await page.screenshot({
      path: 'game-click-test.png',
      fullPage: false
    });

    console.log('\n=== TEST COMPLETE ===\n');
  });
});