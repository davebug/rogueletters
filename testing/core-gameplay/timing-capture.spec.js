const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Capture V3 encoding timing from existing scenario', async ({ page }) => {
  const v3Logs = [];

  // Capture console logs with V3 Encoder timing
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('V3 Encoder') || text.includes('fetched in') || text.includes('ms (parallel') || text.includes('Average per rack')) {
      v3Logs.push(text);
    }
  });

  // Load and run the existing test scenario
  const scenarioFile = path.join(__dirname, 'scenarios', '20251017-scenario-3.json');
  const scenario = JSON.parse(fs.readFileSync(scenarioFile, 'utf8'));

  // Extract expected moves from share URL
  await page.goto(scenario.source.replace('https://letters.wiki', 'http://localhost:8085'));
  await page.waitForSelector('#game-board', { timeout: 10000 });
  await page.waitForTimeout(1500);

  const expectedMoves = await page.evaluate(() => window.gameState.turnHistory);

  // Start fresh game
  await page.goto(`http://localhost:8085/?seed=${scenario.metadata.seed}`);
  await page.waitForSelector('#game-board', { timeout: 15000 });
  await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
  await page.waitForFunction(() => window.gameState && window.gameState.rackTiles && window.gameState.rackTiles.length > 0, { timeout: 15000 });
  await page.waitForSelector('.tile', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Play through each turn (using exact logic from existing tests)
  for (let turnIndex = 0; turnIndex < expectedMoves.length; turnIndex++) {
    const turn = expectedMoves[turnIndex];

    for (const tileToPlace of turn.tiles) {
      const rackTiles = await page.locator('.tile:not(.placed)').all();
      let placed = false;

      for (const rackTile of rackTiles) {
        const letterEl = await rackTile.locator('.tile-letter');
        if (!letterEl) continue;
        const letter = await letterEl.textContent();

        if (letter === tileToPlace.letter) {
          await rackTile.click();
          await page.waitForTimeout(200);
          await page.locator(`.board-cell:not(.rack-cell)[data-row="${tileToPlace.row}"][data-col="${tileToPlace.col}"]`).click();
          await page.waitForTimeout(200);
          placed = true;
          break;
        }
      }

      if (!placed) {
        const currentRack = await page.evaluate(() => window.gameState.rackTiles);
        throw new Error(`Could not find tile: ${tileToPlace.letter}. Rack: ${currentRack.join(', ')}`);
      }
    }

    await page.waitForTimeout(500);
    const submitButton = page.locator('button').filter({ hasText: 'pts →' });
    await submitButton.click();
    await page.waitForTimeout(1000);
  }

  // Wait for encoding to complete
  await page.waitForTimeout(3000);

  // Print captured timing logs
  console.log('\n\n╔════════════════════════════════════════════╗');
  console.log('║   V3 ENCODER TIMING RESULTS (PARALLEL)   ║');
  console.log('╚════════════════════════════════════════════╝\n');

  if (v3Logs.length === 0) {
    console.log('⚠️  No V3 Encoder logs captured');
  } else {
    v3Logs.forEach(log => console.log('  ' + log));
  }

  console.log('\n' + '═'.repeat(46) + '\n');
});
