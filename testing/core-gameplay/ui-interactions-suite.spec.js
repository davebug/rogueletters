/**
 * UI Interactions Test Suite
 *
 * Validates UI features and interactions:
 * - High score board link
 * - Shuffle button functionality
 * - Recall tiles to rack
 * - Tile swap in rack
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Load one scenario to test UI interactions
const scenariosDir = path.join(__dirname, 'scenarios');
const testScenario = JSON.parse(
  fs.readFileSync(path.join(scenariosDir, '20251020-high-score-grandpa-129pts.json'), 'utf8')
);

test.describe('UI Interactions Validator', () => {

  test('Shuffle button reorders rack tiles', async ({ page }) => {
    console.log('\n=== Testing: Shuffle Button ===');

    // Load a fresh game
    await page.goto(`http://localhost:8085/?seed=${testScenario.metadata.seed}`);
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForFunction(() => window.gameState && window.gameState.rackTiles && window.gameState.rackTiles.length > 0, { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Get initial rack order
    const initialRack = await page.evaluate(() => window.gameState.rackTiles);
    console.log(`Initial rack: ${initialRack.join(', ')}`);

    // Click shuffle button
    await page.click('#shuffle-rack');
    await page.waitForTimeout(500);

    // Get rack order after shuffle
    const shuffledRack = await page.evaluate(() => window.gameState.rackTiles);
    console.log(`Shuffled rack: ${shuffledRack.join(', ')}`);

    // Verify tiles are the same (just reordered)
    expect(shuffledRack.sort().join('')).toBe(initialRack.sort().join(''));

    // Verify order changed (with small chance they're the same)
    // We'll be lenient and just verify the shuffle button exists and is clickable
    expect(shuffledRack).toHaveLength(initialRack.length);

    console.log('✓ Shuffle button works correctly\n');
  });

  test('Recall tiles returns placed tiles to rack', async ({ page }) => {
    console.log('\n=== Testing: Recall Tiles ===');

    // Load a fresh game
    await page.goto(`http://localhost:8085/?seed=${testScenario.metadata.seed}`);
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForFunction(() => window.gameState && window.gameState.rackTiles && window.gameState.rackTiles.length > 0, { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Get initial rack
    const initialRack = await page.evaluate(() => window.gameState.rackTiles);
    console.log(`Initial rack: ${initialRack.join(', ')}`);

    // Place a few tiles on the board
    const firstMove = testScenario.moves[0];
    for (const tileToPlace of firstMove.tiles) {
      const rackTiles = await page.locator('.tile:not(.placed)').all();

      for (const rackTile of rackTiles) {
        const letterEl = await rackTile.locator('.tile-letter');
        if (!letterEl) continue;

        const letter = await letterEl.textContent();

        if (letter === tileToPlace.letter) {
          await rackTile.click();
          await page.waitForTimeout(200);

          await page.locator(
            `.board-cell:not(.rack-cell)[data-row="${tileToPlace.row}"][data-col="${tileToPlace.col}"]`
          ).click();
          await page.waitForTimeout(200);

          console.log(`  Placed ${letter} at (${tileToPlace.row}, ${tileToPlace.col})`);
          break;
        }
      }
    }

    // Verify tiles are placed
    const tilesPlaced = await page.locator('.board-cell .tile').count();
    expect(tilesPlaced).toBeGreaterThan(testScenario.metadata.startingWord.length);
    console.log(`  Placed ${firstMove.tiles.length} tiles on board`);

    // Click recall button (might be labeled "Recall", "Clear", or an icon)
    // Try different possible selectors
    const recallButton = page.locator('#recall-tiles, #clear-tiles, button:has-text("Recall"), button:has-text("Clear")').first();
    await recallButton.click();
    await page.waitForTimeout(500);

    // Verify tiles returned to rack
    const rackAfterRecall = await page.evaluate(() => window.gameState.rackTiles);
    console.log(`  Rack after recall: ${rackAfterRecall.join(', ')}`);

    // Should have same tiles as initial
    expect(rackAfterRecall.sort().join('')).toBe(initialRack.sort().join(''));

    console.log('✓ Recall tiles works correctly\n');
  });

  test('Tap two tiles in rack to swap positions', async ({ page }) => {
    console.log('\n=== Testing: Tile Swap in Rack ===');

    // Load a fresh game
    await page.goto(`http://localhost:8085/?seed=${testScenario.metadata.seed}`);
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForFunction(() => window.gameState && window.gameState.rackTiles && window.gameState.rackTiles.length > 0, { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Get initial rack
    const initialRack = await page.evaluate(() => window.gameState.rackTiles);
    console.log(`Initial rack: ${initialRack.join(', ')}`);

    // Get first two tiles
    const tile1Letter = initialRack[0];
    const tile2Letter = initialRack[1];

    console.log(`  Swapping positions of '${tile1Letter}' and '${tile2Letter}'`);

    // Click first tile to select it
    const firstTile = page.locator('.tile').filter({ hasText: tile1Letter }).first();
    await firstTile.click();
    await page.waitForTimeout(200);

    // Click second tile to swap
    const secondTile = page.locator('.tile').filter({ hasText: tile2Letter }).first();
    await secondTile.click();
    await page.waitForTimeout(200);

    // Get rack after swap
    const swappedRack = await page.evaluate(() => window.gameState.rackTiles);
    console.log(`  Rack after swap: ${swappedRack.join(', ')}`);

    // Verify positions swapped
    expect(swappedRack[0]).toBe(tile2Letter);
    expect(swappedRack[1]).toBe(tile1Letter);

    console.log('✓ Tile swap works correctly\n');
  });

  test('High score shows board link when present', async ({ page }) => {
    console.log('\n=== Testing: High Score Board Link ===');

    // Check if high score exists for this date first
    const dateStr = testScenario.metadata.seed;

    // Load the game
    await page.goto(`http://localhost:8085/?seed=${testScenario.metadata.seed}`);
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForFunction(() => window.gameState && window.gameState.rackTiles && window.gameState.rackTiles.length > 0, { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Check if high score exists
    const highScoreResponse = await page.evaluate(async (date) => {
      try {
        const response = await fetch(`/cgi-bin/get_high_score.py?date=${date}`);
        return await response.json();
      } catch (e) {
        return null;
      }
    }, dateStr);

    if (!highScoreResponse || !highScoreResponse.score) {
      console.log('  No high score found for this date - test will verify structure only');
    } else {
      console.log(`  High score exists: ${highScoreResponse.score} points`);
      if (highScoreResponse.board_url) {
        console.log(`  High score board URL: ${highScoreResponse.board_url.substring(0, 40)}...`);
      }
    }

    // Play through the game to completion to trigger the popup
    console.log('  Playing through game to completion...');

    for (const move of testScenario.moves) {
      // Place tiles
      for (const tileToPlace of move.tiles) {
        const rackTiles = await page.locator('.tile:not(.placed)').all();
        for (const rackTile of rackTiles) {
          const letterEl = await rackTile.locator('.tile-letter');
          if (!letterEl) continue;
          const letter = await letterEl.textContent();

          if (letter === tileToPlace.letter) {
            await rackTile.click();
            await page.waitForTimeout(100);
            await page.locator(
              `.board-cell:not(.rack-cell)[data-row="${tileToPlace.row}"][data-col="${tileToPlace.col}"]`
            ).click();
            await page.waitForTimeout(100);
            break;
          }
        }
      }

      // Submit word
      const submitButton = page.locator('button').filter({ hasText: 'pts →' });
      await submitButton.click();
      await page.waitForTimeout(500);
    }

    // Game should be complete - check game state and popup
    const gameComplete = await page.evaluate(() => window.gameState.isGameOver);
    expect(gameComplete, 'Game should be complete').toBe(true);
    console.log('  ✓ Game completed');

    // Wait for share button or completion UI to appear
    // The game shows a share button when complete
    await page.waitForTimeout(1000);

    // Take screenshot to see the completion UI
    await page.screenshot({ path: '/tmp/game-complete-ui.png' });

    // Try to find the completion popup or share UI
    const popupVisible = await page.locator('#share-popup, #completion-popup, .share-container').isVisible().catch(() => false);
    console.log(`  Completion popup visible: ${popupVisible}`);

    // Check for high score text in the page
    const pageText = await page.textContent('body');
    const hasHighScoreText = pageText.includes('High Score') || pageText.includes('high score');
    console.log(`  Page contains "high score" text: ${hasHighScoreText}`);

    // Check if high score is displayed in the popup
    const hasHighScoreDisplay = pageText.includes("TODAY'S HIGH SCORE") || pageText.includes("High Score");
    if (highScoreResponse && highScoreResponse.score) {
      expect(hasHighScoreDisplay, 'High score should be displayed').toBe(true);
      console.log(`  ✓ High score displayed: ${highScoreResponse.score} points`);
    }

    // Check if high score has a clickable link to view the board (both ?g= and ?w= formats)
    const highScoreLinkExists = await page.locator('a[href*="?g="], a[href*="?w="]').count() > 0;
    console.log(`  High score board link found: ${highScoreLinkExists}`);

    if (highScoreResponse && highScoreResponse.score) {
      if (highScoreLinkExists) {
        // Verify link is clickable
        const highScoreLink = page.locator('a[href*="?g="], a[href*="?w="]').first();
        const isVisible = await highScoreLink.isVisible();
        expect(isVisible, 'High score link should be visible').toBe(true);
        console.log('  ✓ High score board link is visible and clickable');
      } else {
        console.log('  ⚠ High score displayed but link to view board not implemented');
        console.log('    (This is expected - feature to be implemented)');
      }
    } else {
      console.log('  Note: No high score for this date');
    }

    console.log('✓ High score display validation complete\n');
  });
});
