const { test, expect } = require('@playwright/test');

test.describe('Refresh bug fix - Multiple dates', () => {
    test.setTimeout(60000);

    // Test with different dates to ensure fix works across different tile configurations
    const testDates = [
        '20250927', // Sept 27, 2025
        '20250928', // Sept 28, 2025
        '20250929', // Sept 29, 2025
        '20251001', // Oct 1, 2025
        '20251005'  // Oct 5, 2025 (current)
    ];

    testDates.forEach(seed => {
        test(`Date ${seed}: Place all tiles, refresh, should NOT get new tiles`, async ({ page }) => {
            console.log('\n' + '='.repeat(60));
            console.log(`Testing seed: ${seed}`);
            console.log('='.repeat(60) + '\n');

            // Navigate with specific seed and debug mode
            await page.goto(`http://localhost:8085?seed=${seed}&debug=1`);
            await page.waitForLoadState('networkidle');
            await page.waitForSelector('#tile-rack-board .tile', { timeout: 10000 });

            // Enable debug mode
            await page.locator('#debug-mode-toggle').click({ force: true });
            await page.waitForTimeout(500);

            // Get starting word for logging
            const startingWord = await page.evaluate(() => window.gameState?.startingWord || 'unknown');
            console.log(`📍 Starting word: ${startingWord}`);

            // Count initial rack tiles
            const initialRackTiles = await page.locator('#tile-rack-board .tile').count();
            console.log(`📍 Initial rack tiles: ${initialRackTiles}`);
            expect(initialRackTiles).toBe(7);

            // Get the letters
            const initialLetters = await page.evaluate(() => {
                const tiles = Array.from(document.querySelectorAll('#tile-rack-board .tile'));
                return tiles.map(t => t.dataset.letter);
            });
            console.log(`📍 Initial letters: ${initialLetters.join(', ')}\n`);

            // Place all 7 tiles on the board
            console.log('📤 Placing all 7 tiles...');
            for (let i = 0; i < 7; i++) {
                const rackTiles = await page.locator('#tile-rack-board .tile').all();
                if (rackTiles.length === 0) break;

                const letter = await rackTiles[0].textContent();
                await rackTiles[0].click();

                // Place horizontally in row 5
                const targetRow = 5;
                const targetCol = i;
                const cell = page.locator(`.board-cell[data-row="${targetRow}"][data-col="${targetCol}"]`);

                const isOccupied = await cell.evaluate(el => el.classList.contains('occupied'));
                if (!isOccupied) {
                    await cell.click();
                    console.log(`  ✓ Placed ${letter.charAt(0)} at (${targetRow}, ${targetCol})`);
                } else {
                    // Try next column if occupied
                    await page.click(`.board-cell[data-row="${targetRow}"][data-col="${targetCol + 1}"]`);
                }

                await page.waitForTimeout(100);
            }

            // Verify rack is empty
            const rackAfterPlacement = await page.locator('#tile-rack-board .tile').count();
            console.log(`\n📍 Rack after placement: ${rackAfterPlacement}`);
            expect(rackAfterPlacement).toBe(0);

            // Verify tiles on board
            const placedTilesOnBoard = await page.locator('.board-cell.placed-this-turn .tile').count();
            console.log(`📍 Tiles on board: ${placedTilesOnBoard}`);
            expect(placedTilesOnBoard).toBe(7);

            // Get game state before refresh
            const stateBeforeRefresh = await page.evaluate(() => {
                return {
                    placedTiles: window.gameState.placedTiles.length,
                    rackTiles: window.gameState.rackTiles.length,
                    totalTilesDrawn: window.gameState.totalTilesDrawn
                };
            });
            console.log(`📍 State before refresh:`, stateBeforeRefresh);

            // REFRESH
            console.log('\n🔄 REFRESHING PAGE...\n');
            await page.reload();
            await page.waitForLoadState('networkidle');
            await page.waitForSelector('#tile-rack-board', { timeout: 5000 });
            await page.waitForTimeout(1000);

            // Get game state after refresh
            const stateAfterRefresh = await page.evaluate(() => {
                return {
                    placedTiles: window.gameState.placedTiles.length,
                    rackTiles: window.gameState.rackTiles.length,
                    totalTilesDrawn: window.gameState.totalTilesDrawn
                };
            });
            console.log(`📍 State after refresh:`, stateAfterRefresh);

            // Count rack tiles after refresh
            const rackAfterRefresh = await page.locator('#tile-rack-board .tile').count();
            console.log(`📍 Rack after refresh: ${rackAfterRefresh}`);

            // Count board tiles after refresh
            const tilesOnBoardAfterRefresh = await page.locator('.board-cell.placed-this-turn .tile').count();
            console.log(`📍 Board after refresh: ${tilesOnBoardAfterRefresh}`);

            // Get letters after refresh
            const lettersAfterRefresh = await page.evaluate(() => {
                const tiles = Array.from(document.querySelectorAll('#tile-rack-board .tile'));
                return tiles.map(t => t.dataset.letter);
            });
            console.log(`📍 Letters after refresh: ${lettersAfterRefresh.join(', ')}\n`);

            // VERIFY FIX
            console.log('='.repeat(60));
            if (rackAfterRefresh === 0) {
                console.log(`✅ PASS (${seed}): Rack is empty as expected`);
            } else {
                console.log(`❌ FAIL (${seed}): ${rackAfterRefresh} tiles appeared in rack!`);
            }
            console.log('='.repeat(60) + '\n');

            // Assertions
            expect(rackAfterRefresh).toBe(0);
            expect(tilesOnBoardAfterRefresh).toBe(7);
            expect(stateAfterRefresh.rackTiles).toBe(0);
            expect(stateAfterRefresh.placedTiles).toBe(7);
        });
    });
});
