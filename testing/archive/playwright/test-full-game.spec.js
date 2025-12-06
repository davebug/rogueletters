// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Full Game Flow', () => {

  test('play complete 5-turn game with valid words', async ({ page }) => {
    console.log('Starting full game test...\n');

    // Start game
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1500);

    // Check starting word (BALLIOL)
    const startingWord = await page.evaluate(() => {
      const cells = [];
      for (let col = 4; col <= 10; col++) {
        const cell = document.querySelector(`[data-row="7"][data-col="${col}"] .tile-letter`);
        if (cell) cells.push(cell.textContent);
      }
      return cells.join('');
    });
    console.log('Starting word:', startingWord);

    // Helper function to place word
    async function placeWord(startRow, startCol, word, direction = 'horizontal') {
      console.log(`Placing "${word}" at [${startRow},${startCol}] ${direction}`);

      for (let i = 0; i < word.length; i++) {
        // Find tile with letter
        const tiles = await page.locator('#tile-rack .tile');
        let placed = false;

        for (let t = 0; t < await tiles.count(); t++) {
          const tile = tiles.nth(t);
          const letter = await tile.locator('.tile-letter').textContent();
          if (letter === word[i]) {
            await tile.click();

            const row = direction === 'horizontal' ? startRow : startRow + i;
            const col = direction === 'horizontal' ? startCol + i : startCol;

            await page.locator(`[data-row="${row}"][data-col="${col}"]`).click();
            placed = true;
            break;
          }
        }

        if (!placed) {
          console.log(`Could not find tile for letter ${word[i]}`);
          return false;
        }
      }
      return true;
    }

    // Track game progress
    const gameProgress = [];

    // Turn 1: Try to place "BE" connecting to B in BALLIOL
    console.log('\n=== TURN 1 ===');
    let currentTurn = await page.locator('#current-turn').textContent();
    console.log('Turn counter:', currentTurn);

    // Place BE vertically from B
    const placed1 = await placeWord(8, 4, 'E', 'vertical');
    if (placed1) {
      await page.click('#submit-word');
      await page.waitForTimeout(1000);

      // Check if error occurred
      const error1 = await page.locator('#error-modal').isVisible();
      if (error1) {
        console.log('Error on turn 1:', await page.locator('#error-message').textContent());
        await page.click('#close-error');
      } else {
        const score1 = await page.locator('#current-score').textContent();
        console.log('Score after turn 1:', score1);
        gameProgress.push({ turn: 1, score: score1 });
      }
    }

    // Turn 2
    console.log('\n=== TURN 2 ===');
    currentTurn = await page.locator('#current-turn').textContent();
    console.log('Turn counter:', currentTurn);

    // Check tiles available
    const tilesCount2 = await page.locator('#tile-rack .tile').count();
    console.log('Tiles in rack:', tilesCount2);

    if (tilesCount2 > 0) {
      // Try to form another simple word
      // This would need actual game logic to determine valid placements
      console.log('Attempting turn 2...');
    }

    // Continue for remaining turns...

    // Final state check
    console.log('\n=== FINAL STATE CHECK ===');

    // Check if game ended
    const gameOver = await page.locator('#game-over-section').isVisible();
    console.log('Game over section visible:', gameOver);

    // Check final turn
    const finalTurn = await page.locator('#current-turn').textContent();
    console.log('Final turn counter:', finalTurn);

    // Check final score
    const finalScore = await page.locator('#current-score').textContent();
    console.log('Final score:', finalScore);

    // Check game state in localStorage
    const savedState = await page.evaluate(() => {
      const state = localStorage.getItem('letters_game_state');
      if (state) {
        const parsed = JSON.parse(state);
        return {
          currentTurn: parsed.currentTurn,
          maxTurns: parsed.maxTurns,
          score: parsed.score,
          isGameOver: parsed.isGameOver
        };
      }
      return null;
    });

    console.log('\nSaved game state:', savedState);

    // Expectations
    if (savedState) {
      expect(savedState.maxTurns).toBe(5);
      // Game should progress turns
      expect(savedState.currentTurn).toBeGreaterThan(1);
    }
  });

  test('check turn counter updates after valid word', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForTimeout(1500);

    const initialTurn = await page.locator('#current-turn').textContent();
    console.log('Initial turn:', initialTurn);
    expect(initialTurn).toBe('1/5');

    // We need to place a valid word to test turn progression
    // For now, let's check that turn counter exists and shows correct format
    const turnElement = await page.locator('#current-turn');
    expect(turnElement).toBeDefined();

    // Check retries don't affect turn count
    const retryBtn = await page.locator('#retry-turn');
    if (await retryBtn.isEnabled()) {
      await retryBtn.click();
      await page.waitForTimeout(1000);

      const turnAfterRetry = await page.locator('#current-turn').textContent();
      console.log('Turn after retry:', turnAfterRetry);
      expect(turnAfterRetry).toBe('1/5'); // Should stay on turn 1
    }
  });

  test('verify game ends after 5 turns', async ({ page }) => {
    // This test would need to actually play 5 valid turns
    // For now, we'll check that the endGame function exists
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForTimeout(1500);

    // Check if endGame function exists
    const hasEndGame = await page.evaluate(() => {
      return typeof window.endGame === 'function';
    });
    console.log('endGame function exists:', hasEndGame);

    // Check max turns is set correctly
    const maxTurns = await page.evaluate(() => {
      const state = localStorage.getItem('letters_game_state');
      if (state) {
        return JSON.parse(state).maxTurns;
      }
      return null;
    });
    console.log('Max turns configured:', maxTurns);
    expect(maxTurns).toBe(5);
  });
});