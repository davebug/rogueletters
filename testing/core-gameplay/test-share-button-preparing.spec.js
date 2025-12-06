/**
 * Share Button "Preparing..." State Test
 *
 * Validates the Share Board button behavior in the completion popup:
 * - Button starts as disabled with "Preparing..." text
 * - Button enables after URL pre-generation completes
 * - Records timing (should be <50ms on fast devices)
 * - Verifies proper copy feedback
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Load one scenario to test with
const scenariosDir = path.join(__dirname, 'scenarios');
const testScenario = JSON.parse(
  fs.readFileSync(path.join(scenariosDir, '20251020-high-score-grandpa-129pts.json'), 'utf8')
);

test.describe('Share Button Preparing State', () => {

  test('Share Board button shows "Preparing..." then enables', async ({ page }) => {
    console.log('\n=== Testing: Share Button Preparing State ===');

    // Listen to console messages from the page
    page.on('console', msg => {
      if (msg.text().includes('[Share Board]')) {
        console.log(`  [Browser Console] ${msg.text()}`);
      }
    });

    // 1. Load the share URL to get expected moves
    console.log('\n[1/3] Loading share URL to extract moves...');
    await page.goto(testScenario.source.replace('https://letters.wiki', 'http://localhost:8086'));
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForTimeout(1500);

    const expectedMoves = await page.evaluate(() => window.gameState.turnHistory);
    console.log(`Expected moves extracted: ${expectedMoves.length} turns`);

    // 2. Start fresh game
    console.log('\n[2/3] Playing through game...');
    await page.goto(`http://localhost:8086/?seed=${testScenario.metadata.seed}`);
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForFunction(() => window.gameState && window.gameState.rackTiles && window.gameState.rackTiles.length > 0, { timeout: 15000 });
    await page.waitForSelector('.tile', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Play through all turns
    for (let turnIndex = 0; turnIndex < expectedMoves.length; turnIndex++) {
      const turn = expectedMoves[turnIndex];
      console.log(`  Turn ${turnIndex + 1}: Placing ${turn.tiles.length} tiles`);

      // Place each tile
      for (const tileToPlace of turn.tiles) {
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
            break;
          }
        }
      }

      // Submit word
      const submitButton = page.locator('button').filter({ hasText: 'pts →' });
      await submitButton.click();
      await page.waitForTimeout(1000);
    }

    console.log('  ✓ Game completed');

    // 3. Check Share Board button state
    console.log('\n[3/3] Checking Share Board button state...');

    // Wait for popup to appear
    await page.waitForSelector('#game-popup:not(.hidden)', { timeout: 5000 });
    console.log('  ✓ Popup appeared');

    // IMMEDIATELY check button state (should be "Preparing..." and disabled)
    const shareBtn = page.locator('#share-board-btn');

    // Check initial state AS FAST AS POSSIBLE
    const initialText = await shareBtn.textContent();
    const initialDisabled = await shareBtn.isDisabled();

    console.log(`\n  Initial button state:`);
    console.log(`    Text: "${initialText}"`);
    console.log(`    Disabled: ${initialDisabled}`);

    // Note: On very fast devices, the button might already be enabled by the time we check
    // So we'll accept either "Preparing..." or "Share Board", but verify the transition

    // Wait for button to enable (if not already)
    const startTime = Date.now();

    await page.waitForFunction(() => {
      const btn = document.getElementById('share-board-btn');
      return btn && !btn.disabled && btn.textContent === 'Share Board';
    }, { timeout: 10000 });

    const enabledTime = Date.now() - startTime;

    // Check final state
    const finalText = await shareBtn.textContent();
    const finalDisabled = await shareBtn.isDisabled();

    console.log(`\n  Final button state (after ${enabledTime}ms):`);
    console.log(`    Text: "${finalText}"`);
    console.log(`    Disabled: ${finalDisabled}`);

    // Verify final state
    expect(finalText, 'Button text should be "Share Board"').toBe('Share Board');
    expect(finalDisabled, 'Button should be enabled').toBe(false);

    console.log(`  ✓ Button enabled after ${enabledTime}ms`);

    if (enabledTime < 50) {
      console.log(`  ✓ Fast device: minimal "Preparing..." time (<50ms)`);
    } else {
      console.log(`  ⚠ Slower device: "Preparing..." visible for ${enabledTime}ms`);
    }

    // Click the button and verify copy feedback
    console.log('\n  Clicking Share Board button...');
    await shareBtn.click();
    await page.waitForTimeout(500);

    const copiedText = await shareBtn.textContent();
    console.log(`    After click: "${copiedText}"`);

    // Should show one of the valid feedback messages
    const validFeedback = ['Copied!', 'Copied.', 'Copied?', 'Not Copied', 'Copy Failed'];
    expect(validFeedback, `Button should show copy feedback`).toContain(copiedText);

    console.log(`  ✓ Copy feedback displayed: "${copiedText}"`);

    console.log('\n=== ✓ Share Button Preparing State Test PASSED ===\n');
  });

  test('Share Board button "Preparing..." state visible with artificial delay', async ({ page }) => {
    console.log('\n=== Testing: Share Button Preparing State (with artificial delay) ===');

    // Listen to console messages
    page.on('console', msg => {
      if (msg.text().includes('[Share Board]')) {
        console.log(`  [Browser Console] ${msg.text()}`);
      }
    });

    // 1. Load the share URL to get expected moves
    console.log('\n[1/3] Loading share URL to extract moves...');
    await page.goto(testScenario.source.replace('https://letters.wiki', 'http://localhost:8086'));
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForTimeout(1500);

    const expectedMoves = await page.evaluate(() => window.gameState.turnHistory);
    console.log(`Expected moves extracted: ${expectedMoves.length} turns`);

    // 2. Start fresh game and INJECT delay into pre-generation
    console.log('\n[2/3] Playing through game (with artificial delay)...');
    await page.goto(`http://localhost:8086/?seed=${testScenario.metadata.seed}`);
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForFunction(() => window.gameState && window.gameState.rackTiles && window.gameState.rackTiles.length > 0, { timeout: 15000 });
    await page.waitForSelector('.tile', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // INJECT ARTIFICIAL DELAY into generateShareableBoardURL
    await page.evaluate(() => {
      const originalGenerate = window.generateShareableBoardURL;
      window.generateShareableBoardURL = async function() {
        console.log('[Share Board] Starting pre-generation with 2s artificial delay...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        return originalGenerate.call(this);
      };
    });

    // Play through all turns
    for (let turnIndex = 0; turnIndex < expectedMoves.length; turnIndex++) {
      const turn = expectedMoves[turnIndex];

      for (const tileToPlace of turn.tiles) {
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
            break;
          }
        }
      }

      const submitButton = page.locator('button').filter({ hasText: 'pts →' });
      await submitButton.click();
      await page.waitForTimeout(1000);
    }

    console.log('  ✓ Game completed');

    // 3. Check Share Board button state (should see "Preparing..." due to delay)
    console.log('\n[3/3] Checking Share Board button state with delay...');

    // Wait for popup
    await page.waitForSelector('#game-popup:not(.hidden)', { timeout: 5000 });
    console.log('  ✓ Popup appeared');

    // Check IMMEDIATE button state (should be "Preparing..." and disabled)
    const shareBtn = page.locator('#share-board-btn');

    const initialText = await shareBtn.textContent();
    const initialDisabled = await shareBtn.isDisabled();

    console.log(`\n  Initial button state:`);
    console.log(`    Text: "${initialText}"`);
    console.log(`    Disabled: ${initialDisabled}`);

    // With 2s delay, we SHOULD see "Preparing..." state
    expect(initialText, 'Button should start as "Preparing..." with delay').toBe('Preparing...');
    expect(initialDisabled, 'Button should start disabled').toBe(true);

    console.log('  ✓ Confirmed "Preparing..." state is visible');

    // Wait for button to enable
    const startTime = Date.now();

    await page.waitForFunction(() => {
      const btn = document.getElementById('share-board-btn');
      return btn && !btn.disabled && btn.textContent === 'Share Board';
    }, { timeout: 10000 });

    const enabledTime = Date.now() - startTime;

    const finalText = await shareBtn.textContent();
    const finalDisabled = await shareBtn.isDisabled();

    console.log(`\n  Final button state (after ${enabledTime}ms):`);
    console.log(`    Text: "${finalText}"`);
    console.log(`    Disabled: ${finalDisabled}`);

    expect(finalText, 'Button text should be "Share Board"').toBe('Share Board');
    expect(finalDisabled, 'Button should be enabled').toBe(false);

    // Should take at least 1 second due to artificial delay (2s delay minus polling interval)
    expect(enabledTime).toBeGreaterThan(900); // At least 0.9s (accounting for polling)
    console.log(`  ✓ Button enabled after ${enabledTime}ms (verified state transition works)`);

    console.log('\n=== ✓ Share Button Preparing State (Delayed) Test PASSED ===\n');
  });

  test('Share Board button works after page refresh (bug fix)', async ({ page }) => {
    console.log('\n=== Testing: Share Button After Refresh (Bug Fix) ===');

    // Listen to console messages
    page.on('console', msg => {
      if (msg.text().includes('[Share Board]')) {
        console.log(`  [Browser Console] ${msg.text()}`);
      }
    });

    // 1. Extract expected moves from share URL
    console.log('\n[1/4] Loading share URL to extract expected moves...');
    await page.goto(testScenario.source.replace('https://letters.wiki', 'http://localhost:8086'));
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForTimeout(1500);

    const expectedMoves = await page.evaluate(() => window.gameState.turnHistory);
    console.log(`Expected moves extracted: ${expectedMoves.length} turns`);

    // 2. Start fresh game and play through to completion (this saves to localStorage)
    console.log('\n[2/4] Playing through game to completion...');
    await page.goto(`http://localhost:8086/?seed=${testScenario.metadata.seed}`);
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForFunction(() => window.gameState && window.gameState.rackTiles && window.gameState.rackTiles.length > 0, { timeout: 15000 });
    await page.waitForSelector('.tile', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Play through all turns
    for (let turnIndex = 0; turnIndex < expectedMoves.length; turnIndex++) {
      const turn = expectedMoves[turnIndex];

      for (const tileToPlace of turn.tiles) {
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
            break;
          }
        }
      }

      const submitButton = page.locator('button').filter({ hasText: 'pts →' });
      await submitButton.click();
      await page.waitForTimeout(1000);
    }

    console.log('  ✓ Game completed');

    // Close the popup (we'll refresh and check it appears again)
    await page.waitForSelector('#game-popup:not(.hidden)', { timeout: 5000 });
    const popupCloseBtn = page.locator('#popup-close-x');
    await popupCloseBtn.click();
    await page.waitForTimeout(500);
    console.log('  ✓ Popup closed');

    // 3. Refresh the page (game should reload from localStorage)
    console.log('\n[3/4] Refreshing page to reload from localStorage...');
    await page.reload();
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Wait for popup to auto-show for completed game
    await page.waitForSelector('#game-popup:not(.hidden)', { timeout: 5000 });
    console.log('  ✓ Popup appeared after refresh');

    // 4. Check button state (should be enabled or will become enabled shortly)
    console.log('\n[4/4] Checking Share Board button state after refresh...');
    const shareBtn = page.locator('#share-board-btn');

    // Wait for button to enable (should be fast since game is already complete)
    await page.waitForFunction(() => {
      const btn = document.getElementById('share-board-btn');
      return btn && !btn.disabled && btn.textContent === 'Share Board';
    }, { timeout: 5000 });

    const finalText = await shareBtn.textContent();
    const finalDisabled = await shareBtn.isDisabled();

    console.log(`  Button state after refresh:`);
    console.log(`    Text: "${finalText}"`);
    console.log(`    Disabled: ${finalDisabled}`);

    expect(finalText, 'Button should be "Share Board" after refresh').toBe('Share Board');
    expect(finalDisabled, 'Button should be enabled after refresh').toBe(false);

    console.log('  ✓ Button properly enabled after page refresh');

    // 4. Verify it actually works
    await shareBtn.click();
    await page.waitForTimeout(500);

    const copiedText = await shareBtn.textContent();
    console.log(`  After click: "${copiedText}"`);

    const validFeedback = ['Copied!', 'Copied.', 'Copied?', 'Not Copied', 'Copy Failed'];
    expect(validFeedback, `Button should show copy feedback`).toContain(copiedText);

    console.log('  ✓ Button click works correctly after refresh');

    console.log('\n=== ✓ Share Button After Refresh Test PASSED ===\n');
  });
});
