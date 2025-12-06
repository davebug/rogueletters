const { test, expect } = require('@playwright/test');

test.describe('Direct JavaScript Game Test', () => {
  test('Test game by directly calling JS functions', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:8085?v=' + Date.now());
    await page.waitForTimeout(2000);

    console.log('\n=== DIRECT JS TESTING ===\n');

    // 1. Test by directly calling game functions
    console.log('1. Testing direct function calls:');

    const gameTest = await page.evaluate(() => {
      const results = {};

      // Get initial state
      results.initialTiles = gameState.rackTiles ? [...gameState.rackTiles] : [];
      results.initialRackCount = document.querySelectorAll('#tile-rack .tile').length;

      // Directly place a tile using the game's internal functions
      const firstTile = document.querySelector('#tile-rack .tile');
      const centerCell = document.querySelector('.board-cell[data-row="7"][data-col="7"]');

      if (firstTile && centerCell && window.placeTile) {
        // Call the placeTile function directly
        window.placeTile(centerCell, firstTile);

        results.afterPlacement = {
          rackCount: document.querySelectorAll('#tile-rack .tile').length,
          placedTiles: gameState.placedTiles ? [...gameState.placedTiles] : [],
          boardOccupied: document.querySelectorAll('.board-cell.occupied').length
        };
      }

      // Check word validity
      if (window.checkWordValidity) {
        window.checkWordValidity();
        results.wordsValid = gameState.isValidPlacement || false;
      }

      // Check UI updates
      results.ui = {
        mobilePotentialWordsClass: document.querySelector('#mobile-potential-words')?.className,
        submitButtonVisible: document.querySelector('#mobile-submit-container')?.style.display !== 'none',
        potentialWordsContent: document.querySelector('#mobile-potential-words-list')?.children.length > 0
      };

      return results;
    });

    console.log('Results:', JSON.stringify(gameTest, null, 2));

    // 2. Test submit functionality
    console.log('\n2. Testing submit:');

    const submitTest = await page.evaluate(() => {
      // Try to submit the word
      if (window.submitWord) {
        window.submitWord();

        return {
          currentTurn: gameState.currentTurn,
          totalScore: gameState.totalScore,
          turnsCompleted: gameState.turns ? gameState.turns.length : 0,
          rackRefilled: document.querySelectorAll('#tile-rack .tile').length
        };
      }
      return null;
    });

    console.log('Submit results:', JSON.stringify(submitTest, null, 2));

    // 3. Test game completion
    console.log('\n3. Simulating game completion:');

    const completionTest = await page.evaluate(() => {
      // Force game to end state for testing
      gameState.currentTurn = 6;

      if (window.endGame) {
        window.endGame();

        return {
          gameOverVisible: document.querySelector('#game-over-section')?.style.display !== 'none',
          finalScore: document.querySelector('#final-score-display')?.textContent,
          shareButtonExists: !!document.querySelector('#share-game'),
          submitScoreExists: !!document.querySelector('#submit-score')
        };
      }
      return null;
    });

    console.log('Completion results:', JSON.stringify(completionTest, null, 2));
  });
});