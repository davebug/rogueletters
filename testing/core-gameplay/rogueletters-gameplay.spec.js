/**
 * RogueLetters Core Gameplay Test Suite
 *
 * Validates essential game mechanics by playing through complete rounds:
 * - Word validation & dictionary
 * - Scoring calculations
 * - Round completion flow
 * - Target verification
 *
 * Uses scenarios with type: "rogueletters" from the scenarios directory.
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Load RogueLetters-specific scenarios
const scenariosDir = path.join(__dirname, 'scenarios');
const allScenarios = fs.existsSync(scenariosDir)
  ? fs.readdirSync(scenariosDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const content = fs.readFileSync(path.join(scenariosDir, f), 'utf8');
        return JSON.parse(content);
      })
  : [];

// Filter for RogueLetters scenarios only
const scenarios = allScenarios.filter(s => s.type === 'rogueletters');

console.log(`\nLoaded ${scenarios.length} RogueLetters test scenarios\n`);

// Skip if no scenarios found
if (scenarios.length === 0) {
  test.skip('No RogueLetters scenarios found', () => {
    console.log('Create scenarios using: npm run extract:rogue -- --name="my-scenario"');
  });
}

test.describe('RogueLetters Core Gameplay', () => {

  scenarios.forEach(scenario => {

    // Skip placeholder scenarios that have no moves
    if (!scenario.moves || scenario.moves.length === 0) {
      test.skip(`${scenario.name} - PLACEHOLDER (no moves)`, () => {
        console.log(`Skipping placeholder scenario: ${scenario.name}`);
        console.log('Generate real data with: npm run extract:rogue -- --name="scenario-name"');
      });
      return;
    }

    test(`${scenario.name} - ${scenario.description}`, async ({ page }) => {
      console.log(`\n=== Testing: ${scenario.name} ===`);
      console.log(`Seed: ${scenario.metadata.seed}`);
      console.log(`Target: ${scenario.metadata.targetScore}`);
      console.log(`Expected score: ${scenario.expectedOutcomes.finalScore}`);

      // 1. Start fresh game with the scenario's seed (bypass run mode for deterministic testing)
      console.log('\n[1/4] Loading game with seed...');
      await page.goto(`http://localhost:8086/?seed=${scenario.metadata.seed}&animate=0`);
      await page.waitForSelector('#game-board', { timeout: 15000 });
      await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
      await page.waitForFunction(() =>
        window.gameState && window.gameState.rackTiles && window.gameState.rackTiles.length > 0,
        { timeout: 15000 }
      );
      await page.waitForSelector('.tile', { timeout: 10000 });
      await page.waitForTimeout(500);

      // Verify starting word matches
      const startingWord = await page.evaluate(() => window.gameState.startingWord);
      expect(startingWord, 'Starting word should match').toBe(scenario.metadata.startingWord);
      console.log(`Starting word verified: ${startingWord}`);

      // 2. Play through each turn
      console.log('\n[2/4] Playing through round turn-by-turn...');

      for (let turnIndex = 0; turnIndex < scenario.moves.length; turnIndex++) {
        const turn = scenario.moves[turnIndex];

        // Skip empty turns (exchanges)
        if (!turn.tiles || turn.tiles.length === 0) {
          console.log(`  Turn ${turnIndex + 1}: Exchange (skipped)`);
          continue;
        }

        console.log(`\n  Turn ${turnIndex + 1}: Placing ${turn.tiles.length} tiles`);

        // Debug: Show available tiles
        const availableTiles = await page.evaluate(() => {
          return window.gameState.rackTiles.map(t => typeof t === 'object' ? t.letter : t).join(', ');
        });
        console.log(`  Available tiles: ${availableTiles}`);

        // Place each tile
        for (const tileToPlace of turn.tiles) {
          const lookingForBlank = tileToPlace.isBlank === true;
          const targetLetter = lookingForBlank ? '_' : tileToPlace.letter;

          const rackTiles = await page.locator('.tile:not(.placed)').all();
          let placed = false;

          for (const rackTile of rackTiles) {
            const letterEl = await rackTile.locator('.tile-letter');
            if (!letterEl) continue;

            const letter = await letterEl.textContent();
            const isBlankTile = await rackTile.evaluate(el => el.dataset.isBlank === 'true');
            const effectiveLetter = isBlankTile ? '_' : letter;

            if (effectiveLetter === targetLetter) {
              // Click tile to select
              await rackTile.click();
              await page.waitForTimeout(150);

              // Click board position
              await page.locator(
                `.board-cell:not(.rack-cell)[data-row="${tileToPlace.row}"][data-col="${tileToPlace.col}"]`
              ).click();
              await page.waitForTimeout(150);

              // Handle blank tile letter selection
              if (lookingForBlank) {
                const modal = page.locator('#blank-letter-modal');
                await modal.waitFor({ state: 'visible', timeout: 5000 });
                const letterButton = modal.locator('#letter-grid button').filter({
                  hasText: new RegExp(`^${tileToPlace.letter}$`)
                });
                await letterButton.click();
                await page.waitForTimeout(150);
                console.log(`    Placed blank as ${tileToPlace.letter} at (${tileToPlace.row}, ${tileToPlace.col})`);
              } else {
                console.log(`    Placed ${effectiveLetter} at (${tileToPlace.row}, ${tileToPlace.col})`);
              }

              placed = true;
              break;
            }
          }

          if (!placed) {
            const currentRack = await page.evaluate(() =>
              window.gameState.rackTiles.map(t => typeof t === 'object' ? t.letter : t)
            );
            throw new Error(`Could not find tile: ${targetLetter}. Rack: ${currentRack.join(', ')}`);
          }
        }

        // Submit the word
        console.log(`  Submitting word...`);
        const submitButton = page.locator('button.total-score').filter({ hasText: 'pts' });
        await submitButton.waitFor({ state: 'visible', timeout: 10000 });

        const buttonText = await submitButton.textContent();
        console.log(`  Submit button: ${buttonText.trim()}`);

        if (!buttonText.includes('→')) {
          throw new Error(`Word validation failed. Button shows: ${buttonText}`);
        }

        await submitButton.click();
        await page.waitForTimeout(800);

        // Verify no error modal
        const hasError = await page.locator('#error-modal').isVisible();
        expect(hasError, 'Word should be accepted').toBe(false);

        // Verify turn score
        const actualScore = await page.evaluate(() =>
          window.gameState.turnScores[window.gameState.currentTurn - 2]
        );

        expect(actualScore, `Turn ${turnIndex + 1} score`).toBe(turn.expectedScore);
        console.log(`  ✓ Turn ${turnIndex + 1}: ${actualScore} points`);
      }

      // 3. Verify round completion
      console.log('\n[3/4] Verifying outcomes...');

      const finalState = await page.evaluate(() => ({
        isGameOver: window.gameState.isGameOver,
        currentTurn: window.gameState.currentTurn,
        finalScore: window.gameState.score,
        turnScores: window.gameState.turnScores
      }));

      // Check round completion status matches expected
      expect(finalState.isGameOver, 'Round completion status should match').toBe(scenario.expectedOutcomes.roundComplete);
      expect(finalState.finalScore, 'Final score should match').toBe(scenario.expectedOutcomes.finalScore);

      console.log(`✓ Score verified: ${finalState.finalScore} points`);
      console.log(`  Turn scores: ${finalState.turnScores.join(', ')}`);
      console.log(`  Round complete: ${finalState.isGameOver}`);

      // 4. Verify target (if specified)
      if (scenario.metadata.targetScore !== undefined) {
        console.log('\n[4/4] Verifying target...');
        const targetMet = finalState.finalScore >= scenario.metadata.targetScore;
        expect(targetMet, 'Target status should match').toBe(scenario.expectedOutcomes.targetMet);
        console.log(`✓ Target ${scenario.metadata.targetScore}: ${targetMet ? 'MET' : 'MISSED'}`);
      }

      console.log(`\n=== ✓ ${scenario.name} PASSED ===\n`);
    });

  });

});
