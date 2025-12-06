// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Game Completion Flow', () => {

  test('check what happens after 5 turns', async ({ page }) => {
    console.log('Testing game completion after 5 turns...');

    // Start game with fixed seed
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1500);

    // Check initial state
    const initialTurn = await page.locator('#current-turn').textContent();
    console.log('Initial turn:', initialTurn);

    // Simulate 5 turns (place single tiles adjacent to center)
    for (let turn = 1; turn <= 5; turn++) {
      console.log(`\nTurn ${turn}:`);

      // Get current turn display
      const currentTurnText = await page.locator('#current-turn').textContent();
      console.log('Turn display:', currentTurnText);

      // Place a tile adjacent to existing tiles
      const tile = await page.locator('#tile-rack .tile').first();
      if (await tile.count() === 0) {
        console.log('No tiles available!');
        break;
      }

      const letter = await tile.locator('.tile-letter').textContent();
      console.log('Placing tile:', letter);

      await tile.click();

      // Try to find a valid placement spot
      let placed = false;
      const positions = [
        [8, 7], [8, 8], [8, 9], // Adjacent to center row
        [6, 7], [9, 7], // Above/below center
        [7, 6], [7, 8], // Left/right of center
      ];

      for (const [row, col] of positions) {
        const cell = page.locator(`[data-row="${row}"][data-col="${col}"]`);
        const isOccupied = await cell.locator('.tile').count() > 0;

        if (!isOccupied) {
          await cell.click();
          placed = true;
          console.log(`Placed at [${row},${col}]`);
          break;
        }
      }

      if (!placed) {
        console.log('Could not find valid placement!');
        break;
      }

      // Try to submit (might fail validation)
      const submitBtn = await page.locator('#submit-word');
      const isEnabled = await submitBtn.isEnabled();
      console.log('Submit button enabled:', isEnabled);

      if (isEnabled) {
        await submitBtn.click();
        await page.waitForTimeout(1000);

        // Check if error modal appeared
        const errorVisible = await page.locator('#error-modal').isVisible();
        if (errorVisible) {
          console.log('Validation error - recalling tiles');
          // Close error and recall tiles
          await page.click('#close-error');
          await page.click('#recall-tiles');

          // For testing, just place two tiles to make a valid word
          console.log('Attempting valid 2-letter word...');

          // This is simplified - in reality we'd need to form valid words
          // For now, let's just skip to see what happens after turns
        }
      }

      // Check for game over elements
      const gameOverSection = await page.locator('#game-over-section').isVisible();
      console.log('Game over section visible:', gameOverSection);

      if (gameOverSection) {
        console.log('Game ended after turn', turn);
        break;
      }
    }

    // Final checks
    console.log('\n=== Final State ===');

    // Check what UI elements are visible
    const elements = {
      'Game container': '#game-container',
      'Game over section': '#game-over-section',
      'High scores section': '#high-scores-section',
      'Submit score': '#submit-score',
      'Share button': '#share-game',
      'New game button': '#new-game',
      'Final score display': '#final-score-display'
    };

    for (const [name, selector] of Object.entries(elements)) {
      const visible = await page.locator(selector).isVisible();
      console.log(`${name}: ${visible ? 'VISIBLE' : 'not visible'}`);
    }

    // Check final score
    const finalScore = await page.locator('#current-score').textContent();
    console.log('Final score:', finalScore);

    // Check if game state indicates completion
    const gameState = await page.evaluate(() => {
      const state = localStorage.getItem('letters_game_state');
      return state ? JSON.parse(state) : null;
    });

    if (gameState) {
      console.log('Game state - Turn:', gameState.currentTurn);
      console.log('Game state - Max turns:', gameState.maxTurns);
      console.log('Game state - Score:', gameState.score);
    }
  });

  test('check share functionality', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForTimeout(1500);

    // Check if share button exists
    const shareButton = await page.locator('#share-game');
    const exists = await shareButton.count() > 0;
    console.log('Share button exists:', exists);

    if (exists) {
      const visible = await shareButton.isVisible();
      console.log('Share button visible:', visible);

      if (visible) {
        // Try to click it
        await shareButton.click();
        console.log('Clicked share button');

        // Check what happens
        await page.waitForTimeout(1000);
      }
    }
  });

  test('check high score submission', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForTimeout(1500);

    // Check for high score elements
    const elements = [
      '#player-name',
      '#submit-score',
      '#high-scores-list',
      '#view-replay'
    ];

    for (const selector of elements) {
      const element = await page.locator(selector);
      const exists = await element.count() > 0;
      const visible = exists ? await element.isVisible() : false;
      console.log(`${selector}: exists=${exists}, visible=${visible}`);
    }
  });

  test('check retry functionality', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForTimeout(1500);

    // Check retry button and counter
    const retryBtn = await page.locator('#retry-turn');
    const retriesLeft = await page.locator('#retries-left');

    const retryExists = await retryBtn.count() > 0;
    const retriesExists = await retriesLeft.count() > 0;

    console.log('Retry button exists:', retryExists);
    console.log('Retries counter exists:', retriesExists);

    if (retriesExists) {
      const count = await retriesLeft.textContent();
      console.log('Retries remaining:', count);
    }

    if (retryExists) {
      const enabled = await retryBtn.isEnabled();
      console.log('Retry button enabled:', enabled);

      if (enabled) {
        const initialRetries = await retriesLeft.textContent();
        await retryBtn.click();
        await page.waitForTimeout(1000);

        const newRetries = await retriesLeft.textContent();
        console.log(`Retries changed from ${initialRetries} to ${newRetries}`);
      }
    }
  });
});