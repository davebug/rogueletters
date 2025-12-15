/**
 * Core Gameplay Test Suite
 *
 * Validates essential game mechanics by actually playing through complete games:
 * - Word validation & dictionary
 * - Scoring calculations
 * - Game completion flow
 * - Share URL generation & round-trip
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Load all scenarios
const scenariosDir = path.join(__dirname, 'scenarios');
const scenarios = fs.readdirSync(scenariosDir)
  .filter(f => f.endsWith('.json'))
  .map(f => {
    const content = fs.readFileSync(path.join(scenariosDir, f), 'utf8');
    return JSON.parse(content);
  });

console.log(`\nLoaded ${scenarios.length} test scenarios\n`);

test.describe('Core Gameplay Validator', () => {

  scenarios.forEach(scenario => {
    // Skip negative scenarios for now (will add later)
    if (scenario.type === 'negative') {
      test.skip(`${scenario.name} - ${scenario.description}`, () => {});
      return;
    }

    test(`${scenario.name} - ${scenario.description}`, async ({ page }) => {
      console.log(`\n=== Testing: ${scenario.name} ===`);
      console.log(`Source: ${scenario.source}`);
      console.log(`Expected score: ${scenario.expectedOutcomes.finalScore}`);

      // 1. Extract expected moves from share URL
      console.log('\n[1/5] Loading share URL to extract expected moves...');
      await page.goto(scenario.source.replace('https://letters.wiki', 'http://localhost:8086'));
      await page.waitForSelector('#game-board', { timeout: 10000 });
      await page.waitForTimeout(1500);

      const expectedMoves = await page.evaluate(() => window.gameState.turnHistory);
      const expectedScores = expectedMoves.map(turn => turn.score);

      console.log(`Expected moves extracted: ${expectedMoves.length} turns`);

      // 2. Start fresh game with same seed
      console.log('\n[2/5] Starting fresh game...');
      await page.goto(`http://localhost:8086/?seed=${scenario.metadata.seed}`);
      await page.waitForSelector('#game-board', { timeout: 15000 });

      // Wait for loading overlay to disappear
      await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });

      // Wait for game state to initialize
      await page.waitForFunction(() => window.gameState && window.gameState.rackTiles && window.gameState.rackTiles.length > 0, { timeout: 15000 });

      // Wait for tile elements to render
      await page.waitForSelector('.tile', { timeout: 10000 });

      await page.waitForTimeout(1000);

      console.log(`Game loaded with seed: ${scenario.metadata.seed}`);

      // 3. PLAY THROUGH EACH TURN
      console.log('\n[3/5] Playing through game turn-by-turn...');

      for (let turnIndex = 0; turnIndex < expectedMoves.length; turnIndex++) {
        const turn = expectedMoves[turnIndex];

        console.log(`\n  Turn ${turnIndex + 1}: Placing ${turn.tiles.length} tiles`);

        // Debug: Check what tiles are available (handles both string and object formats)
        const availableTiles = await page.evaluate(() => {
          return window.gameState.rackTiles.map(t => typeof t === 'object' ? t.letter : t).join(', ');
        });
        console.log(`  Available tiles in rack: ${availableTiles}`);

        // Debug: Check what we're trying to place
        const tilesToPlace = turn.tiles.map(t => t.letter).join('');
        console.log(`  Trying to place: ${tilesToPlace}`);

        // Place each tile from this turn
        for (const tileToPlace of turn.tiles) {
          // Find tile in rack with matching letter
          const rackTiles = await page.locator('.tile:not(.placed)').all();
          let placed = false;

          for (const rackTile of rackTiles) {
            const letterEl = await rackTile.locator('.tile-letter');
            if (!letterEl) continue;

            const letter = await letterEl.textContent();

            if (letter === tileToPlace.letter) {
              // Click tile to select
              await rackTile.click();
              await page.waitForTimeout(200);

              // Click board position (exclude rack cells)
              await page.locator(
                `.board-cell:not(.rack-cell)[data-row="${tileToPlace.row}"][data-col="${tileToPlace.col}"]`
              ).click();
              await page.waitForTimeout(200);

              placed = true;
              console.log(`    Placed ${letter} at (${tileToPlace.row}, ${tileToPlace.col})`);
              break;
            }
          }

          if (!placed) {
            // Get current rack state for debugging (handles both string and object formats)
            const currentRack = await page.evaluate(() =>
              window.gameState.rackTiles.map(t => typeof t === 'object' ? t.letter : t)
            );
            throw new Error(`Could not find tile with letter: ${tileToPlace.letter}. Current rack: ${currentRack.join(', ')}`);
          }
        }

        // Submit the word - try multiple possible selectors
        console.log(`  Submitting word...`);

        // Wait a bit for UI to update
        await page.waitForTimeout(500);

        // Find submit button (it shows "X pts →")
        const submitButton = page.locator('button').filter({ hasText: 'pts →' });
        await submitButton.click();
        console.log(`  Clicked submit button`);

        await page.waitForTimeout(1000);

        // VERIFY WORD VALIDATION (critical mechanic #1)
        const hasError = await page.locator('#error-modal').isVisible();
        expect(hasError, 'Word should be accepted (no error modal)').toBe(false);

        // VERIFY SCORING (critical mechanic #2)
        const actualScore = await page.evaluate(() =>
          gameState.turnScores[gameState.currentTurn - 2]
        );

        expect(actualScore, `Turn ${turnIndex + 1} score should match expected`).toBe(expectedScores[turnIndex]);

        console.log(`  ✓ Turn ${turnIndex + 1} complete: ${actualScore} points (expected: ${expectedScores[turnIndex]})`);
      }

      // 4. VERIFY GAME COMPLETION (critical mechanic #3)
      console.log('\n[4/5] Verifying game completion...');

      const finalState = await page.evaluate(() => ({
        isGameOver: gameState.isGameOver,
        currentTurn: gameState.currentTurn,
        finalScore: gameState.score,
        preGeneratedShareURL: gameState.preGeneratedShareURL
      }));

      expect(finalState.isGameOver, 'Game should be over').toBe(true);
      expect(finalState.currentTurn, 'Should be on turn 6').toBe(6);
      expect(finalState.finalScore, 'Final score should match expected').toBe(scenario.expectedOutcomes.finalScore);

      console.log(`✓ Game completed: ${finalState.finalScore} points`);

      // 5. VERIFY SHARE URL GENERATION & ROUND-TRIP
      console.log('\n[5/5] Verifying share URL generation and round-trip...');

      expect(finalState.preGeneratedShareURL, 'Share URL should be generated').toBeTruthy();
      console.log(`Share URL generated: ${finalState.preGeneratedShareURL.substring(0, 50)}...`);

      // Load the generated share URL and verify it matches
      await page.goto(finalState.preGeneratedShareURL.replace('https://letters.wiki', 'http://localhost:8086'));
      await page.waitForSelector('#game-board', { timeout: 10000 });
      await page.waitForTimeout(1500);

      const sharedGameState = await page.evaluate(() => ({
        seed: gameState.seed,
        turnScores: gameState.turnScores,
        finalScore: gameState.score,
        isGameOver: gameState.isGameOver,
        tilesPlaced: Array.from(document.querySelectorAll('.board-cell .tile')).length
      }));

      // Verify shared game matches original
      expect(sharedGameState.seed, 'Shared game seed should match').toBe(scenario.metadata.seed);
      expect(sharedGameState.turnScores, 'Shared game turn scores should match').toEqual(expectedScores);
      expect(sharedGameState.finalScore, 'Shared game final score should match').toBe(finalState.finalScore);
      expect(sharedGameState.isGameOver, 'Shared game should be over').toBe(true);

      // Verify all tiles are present
      const originalTileCount = expectedMoves.reduce((sum, turn) => sum + turn.tiles.length, 0);
      const startingWordLength = scenario.metadata.startingWord.length;
      expect(sharedGameState.tilesPlaced, 'All tiles should be present').toBe(originalTileCount + startingWordLength);

      console.log(`✓ Share URL round-trip verified: ${sharedGameState.tilesPlaced} tiles loaded correctly`);

      console.log(`\n=== ✓ ${scenario.name} PASSED ===\n`);
    });
  });
});
