// @ts-check
const { test, expect } = require('@playwright/test');

// Use headed mode to see what's happening
test.use({
  headless: false,
  slowMo: 300,
  viewport: { width: 1280, height: 720 },
});

test.describe('Expected Player Features', () => {

  test('Test 1: Rearranging tiles on rack', async ({ page }) => {
    console.log('🎯 Testing: Can I rearrange tiles on my rack?');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    // Get initial tile order
    const initialTiles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#tile-rack .tile .tile-letter'))
        .map(t => t.textContent);
    });
    console.log(`Initial rack: ${initialTiles.join(', ')}`);

    // Try to drag first tile to last position
    const firstTile = await page.locator('#tile-rack .tile').first();
    const lastTile = await page.locator('#tile-rack .tile').last();

    console.log('Attempting to drag first tile to last position...');
    await firstTile.dragTo(lastTile);
    await page.waitForTimeout(500);

    // Check if tiles reordered
    const afterDragTiles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#tile-rack .tile .tile-letter'))
        .map(t => t.textContent);
    });

    if (JSON.stringify(initialTiles) !== JSON.stringify(afterDragTiles)) {
      console.log(`✅ GOOD: Tiles rearranged to: ${afterDragTiles.join(', ')}`);
    } else {
      console.log('❌ MISSING FEATURE: Cannot rearrange tiles on rack');
    }

    // Try clicking tiles in different order to see if that rearranges
    console.log('\nTrying to click tiles to rearrange...');
    const tile3 = await page.locator('#tile-rack .tile').nth(2);
    const tile1 = await page.locator('#tile-rack .tile').nth(0);

    await tile3.click();
    await page.waitForTimeout(200);
    await tile1.click();
    await page.waitForTimeout(200);

    const afterClickTiles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#tile-rack .tile .tile-letter'))
        .map(t => t.textContent);
    });

    if (JSON.stringify(initialTiles) !== JSON.stringify(afterClickTiles)) {
      console.log(`✅ Tiles can be rearranged by clicking`);
    } else {
      console.log('❌ Clicking doesn\'t rearrange tiles');
    }

    await page.waitForTimeout(1000);
  });

  test('Test 2: Moving placed tile to different position', async ({ page }) => {
    console.log('🎯 Testing: Can I move a tile after placing it on board?');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    // Place a tile on the board
    const firstTile = await page.locator('#tile-rack .tile').first();
    const tileLetter = await firstTile.locator('.tile-letter').textContent();
    console.log(`Placing tile ${tileLetter} on board...`);

    await firstTile.click();
    await page.locator('.board-cell[data-row="8"][data-col="7"]').click();
    await page.waitForTimeout(500);

    // Try to click the placed tile to pick it up
    console.log('Trying to click placed tile to pick it up...');
    const placedTile = await page.locator('.board-cell[data-row="8"][data-col="7"]');
    await placedTile.click();
    await page.waitForTimeout(500);

    // Check if tile was picked up (returned to rack or selected)
    const tilesInRack = await page.locator('#tile-rack .tile').count();
    if (tilesInRack === 7) {
      console.log('✅ GOOD: Tile returned to rack when clicked');
    } else {
      // Try to place it elsewhere
      console.log('Trying to move to different position...');
      await page.locator('.board-cell[data-row="6"][data-col="10"]').click();
      await page.waitForTimeout(500);

      // Check if tile moved
      const oldPosEmpty = await page.evaluate(() => {
        const cell = document.querySelector('.board-cell[data-row="8"][data-col="7"]');
        return !cell.querySelector('.tile');
      });

      const newPosHasTile = await page.evaluate(() => {
        const cell = document.querySelector('.board-cell[data-row="6"][data-col="10"]');
        return !!cell.querySelector('.tile');
      });

      if (oldPosEmpty && newPosHasTile) {
        console.log('✅ GOOD: Tile can be moved to different position');
      } else {
        console.log('❌ MISSING FEATURE: Cannot move placed tiles');
      }
    }

    // Try dragging placed tile
    console.log('\nTrying to drag placed tile...');
    const placedCell = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile').first();
    const targetCell = await page.locator('.board-cell[data-row="6"][data-col="10"]');

    try {
      await placedCell.dragTo(targetCell);
      await page.waitForTimeout(500);
      console.log('Drag attempted - checking result...');
    } catch (e) {
      console.log('❌ Cannot drag placed tiles');
    }

    await page.waitForTimeout(1000);
  });

  test('Test 3: Recall all tiles back to rack', async ({ page }) => {
    console.log('🎯 Testing: Can I recall all placed tiles?');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    // Place multiple tiles
    console.log('Placing 3 tiles on board...');

    const tile1 = await page.locator('#tile-rack .tile').nth(0);
    await tile1.click();
    await page.locator('.board-cell[data-row="8"][data-col="7"]').click();

    const tile2 = await page.locator('#tile-rack .tile').nth(0);
    await tile2.click();
    await page.locator('.board-cell[data-row="8"][data-col="8"]').click();

    const tile3 = await page.locator('#tile-rack .tile').nth(0);
    await tile3.click();
    await page.locator('.board-cell[data-row="8"][data-col="9"]').click();

    await page.waitForTimeout(500);

    // Look for recall/reset button
    console.log('Looking for Recall/Reset/Clear button...');

    const recallButton = await page.locator('button:has-text("Recall"), button:has-text("Reset"), button:has-text("Clear"), #recall-tiles, #reset-tiles, #clear-board').first();

    if (await recallButton.isVisible()) {
      console.log('✅ GOOD: Found recall button');
      await recallButton.click();
      await page.waitForTimeout(500);

      const tilesInRack = await page.locator('#tile-rack .tile').count();
      if (tilesInRack === 7) {
        console.log('✅ All tiles returned to rack');
      }
    } else {
      console.log('❌ MISSING FEATURE: No recall/reset button found');

      // Check if there's a keyboard shortcut
      console.log('Trying keyboard shortcuts (R, Escape, Backspace)...');
      await page.keyboard.press('r');
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(300);

      const finalTileCount = await page.locator('#tile-rack .tile').count();
      if (finalTileCount === 7) {
        console.log('✅ GOOD: Keyboard shortcut recalled tiles');
      } else {
        console.log('❌ No way to recall all tiles at once');
      }
    }

    await page.waitForTimeout(1000);
  });

  test('Test 4: Undo last tile placement', async ({ page }) => {
    console.log('🎯 Testing: Can I undo my last tile placement?');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    // Place a tile
    const firstTile = await page.locator('#tile-rack .tile').first();
    const tileLetter = await firstTile.locator('.tile-letter').textContent();
    console.log(`Placing tile ${tileLetter}...`);

    await firstTile.click();
    await page.locator('.board-cell[data-row="8"][data-col="7"]').click();
    await page.waitForTimeout(500);

    // Try Ctrl+Z / Cmd+Z
    console.log('Trying undo shortcuts (Ctrl+Z / Cmd+Z)...');
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);

    let tilesInRack = await page.locator('#tile-rack .tile').count();
    if (tilesInRack === 7) {
      console.log('✅ GOOD: Ctrl+Z undid placement');
    } else {
      // Try Cmd+Z for Mac
      await page.keyboard.press('Meta+z');
      await page.waitForTimeout(300);

      tilesInRack = await page.locator('#tile-rack .tile').count();
      if (tilesInRack === 7) {
        console.log('✅ GOOD: Cmd+Z undid placement');
      } else {
        // Look for undo button
        const undoButton = await page.locator('button:has-text("Undo"), #undo-button').first();
        if (await undoButton.isVisible()) {
          await undoButton.click();
          console.log('✅ GOOD: Undo button available');
        } else {
          console.log('❌ MISSING FEATURE: No undo functionality');
        }
      }
    }

    await page.waitForTimeout(1000);
  });

  test('Test 5: Keyboard navigation', async ({ page }) => {
    console.log('🎯 Testing: Can I use keyboard to play?');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    // Try number keys to select tiles
    console.log('Trying number keys (1-7) to select tiles...');
    await page.keyboard.press('1');
    await page.waitForTimeout(300);

    const selectedTile = await page.evaluate(() => {
      return document.querySelector('#tile-rack .tile.selected') !== null;
    });

    if (selectedTile) {
      console.log('✅ GOOD: Number keys select tiles');

      // Try arrow keys to navigate board
      console.log('Trying arrow keys to navigate board...');
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      const tilePlaced = await page.evaluate(() => {
        return document.querySelectorAll('.board-cell .tile').length > 0;
      });

      if (tilePlaced) {
        console.log('✅ GOOD: Arrow keys and Enter place tiles');
      } else {
        console.log('❌ Arrow key navigation not working');
      }
    } else {
      console.log('❌ MISSING FEATURE: No keyboard controls');
    }

    // Test Tab navigation
    console.log('\nTrying Tab key navigation...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    const activeElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    console.log(`Active element after Tab: ${activeElement}`);

    await page.waitForTimeout(1000);
  });

  test('Test 6: Shuffle tiles in rack', async ({ page }) => {
    console.log('🎯 Testing: Can I shuffle my rack tiles?');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    const initialTiles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#tile-rack .tile .tile-letter'))
        .map(t => t.textContent);
    });
    console.log(`Initial rack: ${initialTiles.join(', ')}`);

    // Look for shuffle button
    console.log('Looking for Shuffle button...');
    const shuffleButton = await page.locator('button:has-text("Shuffle"), #shuffle-tiles, #shuffle-rack').first();

    if (await shuffleButton.isVisible()) {
      await shuffleButton.click();
      await page.waitForTimeout(500);

      const shuffledTiles = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#tile-rack .tile .tile-letter'))
          .map(t => t.textContent);
      });

      if (JSON.stringify(initialTiles) !== JSON.stringify(shuffledTiles)) {
        console.log(`✅ GOOD: Tiles shuffled to: ${shuffledTiles.join(', ')}`);
      } else {
        console.log('⚠️ Shuffle button exists but tiles didn\'t change');
      }
    } else {
      console.log('❌ MISSING FEATURE: No shuffle button');

      // Try keyboard shortcut
      console.log('Trying \'S\' key for shuffle...');
      await page.keyboard.press('s');
      await page.waitForTimeout(500);

      const afterKeyTiles = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#tile-rack .tile .tile-letter'))
          .map(t => t.textContent);
      });

      if (JSON.stringify(initialTiles) !== JSON.stringify(afterKeyTiles)) {
        console.log('✅ GOOD: \'S\' key shuffles tiles');
      } else {
        console.log('❌ No shuffle functionality');
      }
    }

    await page.waitForTimeout(1000);
  });

  test('Test 7: Exchange/swap tiles', async ({ page }) => {
    console.log('🎯 Testing: Can I exchange tiles for new ones?');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    // Look for exchange button
    console.log('Looking for Exchange/Swap button...');
    const exchangeButton = await page.locator('button:has-text("Exchange"), button:has-text("Swap"), #exchange-tiles').first();

    if (await exchangeButton.isVisible()) {
      console.log('✅ GOOD: Exchange button found');

      const initialTiles = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#tile-rack .tile .tile-letter'))
          .map(t => t.textContent);
      });

      await exchangeButton.click();
      await page.waitForTimeout(500);

      // Check if we can select tiles to exchange
      console.log('Trying to select tiles for exchange...');
      const firstTile = await page.locator('#tile-rack .tile').first();
      await firstTile.click();
      await page.waitForTimeout(300);

      // Look for confirm exchange button
      const confirmButton = await page.locator('button:has-text("Confirm"), button:has-text("Exchange Selected")').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        console.log('✅ Can select and exchange specific tiles');
      }
    } else {
      console.log('❌ MISSING FEATURE: No tile exchange option');
      console.log('(Note: In Scrabble, exchanging uses a turn)');
    }

    await page.waitForTimeout(1000);
  });

  test('Test 8: Visual feedback and hints', async ({ page }) => {
    console.log('🎯 Testing: Visual feedback for valid placements');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');
    await page.waitForTimeout(1000);

    // Select a tile
    const firstTile = await page.locator('#tile-rack .tile').first();
    await firstTile.click();
    await page.waitForTimeout(300);

    console.log('Checking for placement hints...');

    // Hover over valid placement spots
    const validSpot = await page.locator('.board-cell[data-row="8"][data-col="7"]');
    await validSpot.hover();
    await page.waitForTimeout(300);

    // Check for visual feedback
    const hasHoverEffect = await page.evaluate(() => {
      const cell = document.querySelector('.board-cell[data-row="8"][data-col="7"]');
      const styles = window.getComputedStyle(cell);
      // Check if cell has different background or border on hover
      return styles.backgroundColor !== 'transparent' ||
             styles.borderColor !== 'rgb(0, 0, 0)' ||
             cell.classList.contains('valid-placement') ||
             cell.classList.contains('hover');
    });

    if (hasHoverEffect) {
      console.log('✅ GOOD: Visual feedback on hover');
    } else {
      console.log('❌ MISSING: No hover feedback for valid placements');
    }

    // Check for invalid placement feedback
    console.log('Checking invalid placement feedback...');
    const invalidSpot = await page.locator('.board-cell[data-row="0"][data-col="0"]');
    await invalidSpot.hover();
    await page.waitForTimeout(300);

    const hasInvalidFeedback = await page.evaluate(() => {
      const cell = document.querySelector('.board-cell[data-row="0"][data-col="0"]');
      return cell.classList.contains('invalid-placement') ||
             cell.style.cursor === 'not-allowed';
    });

    if (hasInvalidFeedback) {
      console.log('✅ GOOD: Visual feedback for invalid placements');
    } else {
      console.log('❌ MISSING: No feedback for invalid placements');
    }

    await page.waitForTimeout(1000);
  });

  test('Summary: Feature availability check', async ({ page }) => {
    console.log('\n📋 PLAYER FEATURES SUMMARY:');
    console.log('===========================');

    await page.goto('http://localhost:8085/?seed=20250920');
    await page.waitForSelector('#game-board');

    // Check what UI elements exist
    const features = await page.evaluate(() => {
      return {
        hasSubmitButton: !!document.querySelector('#submit-word'),
        hasRetryButton: !!document.querySelector('#retry-button'),
        hasScoreDisplay: !!document.querySelector('#current-score'),
        hasTurnDisplay: !!document.querySelector('#turn-display'),
        hasTimer: !!document.querySelector('#timer, .timer'),
        hasInstructions: !!document.querySelector('.instructions, #help, #how-to-play'),
        hasSoundToggle: !!document.querySelector('#sound-toggle, .sound-toggle'),
        hasThemeToggle: !!document.querySelector('#theme-toggle, .theme-toggle'),
        tileRackInteractive: document.querySelector('#tile-rack .tile')?.style.cursor === 'pointer',
        boardInteractive: true
      };
    });

    console.log('Core features present:');
    console.log('✓ Submit button:', features.hasSubmitButton);
    console.log('✓ Retry button:', features.hasRetryButton);
    console.log('✓ Score display:', features.hasScoreDisplay);
    console.log('✓ Turn counter:', features.hasTurnDisplay);
    console.log('? Timer display:', features.hasTimer || 'Not found');
    console.log('? Instructions/Help:', features.hasInstructions || 'Not found');
    console.log('? Sound toggle:', features.hasSoundToggle || 'Not found');
    console.log('? Theme toggle:', features.hasThemeToggle || 'Not found');

    console.log('\n🎮 Testing complete! Review results for missing QoL features.');
  });
});