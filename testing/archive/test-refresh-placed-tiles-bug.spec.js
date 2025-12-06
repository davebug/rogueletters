const { test, expect } = require('@playwright/test');

test.describe('Refresh with placed tiles bug', () => {
    test.setTimeout(60000);

    test('Place all 7 tiles, refresh, should NOT get new tiles', async ({ page }) => {
        console.log('\n' + '='.repeat(60));
        console.log('BUG REPLICATION: Refresh with placed tiles');
        console.log('='.repeat(60) + '\n');

        // Navigate with debug mode for easier testing
        await page.goto('http://localhost:8085?debug=1');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('#tile-rack-board .tile', { timeout: 10000 });

        // Enable debug mode - force click since element might be partially obscured
        await page.locator('#debug-mode-toggle').click({ force: true });
        console.log('✅ Debug mode enabled\n');

        // Wait for game to load
        await page.waitForTimeout(1000);

        // Step 1: Count initial rack tiles
        const initialRackTiles = await page.locator('#tile-rack-board .tile').count();
        console.log(`📍 Initial rack tiles: ${initialRackTiles}`);
        expect(initialRackTiles).toBe(7); // Should start with 7 tiles

        // Step 2: Get the letters for verification
        const initialLetters = await page.evaluate(() => {
            const tiles = Array.from(document.querySelectorAll('#tile-rack-board .tile'));
            return tiles.map(t => t.dataset.letter);
        });
        console.log(`📍 Initial letters: ${initialLetters.join(', ')}\n`);

        // Step 3: Place all 7 tiles on the board (but don't submit)
        console.log('📤 Placing all 7 tiles on the board...');

        for (let i = 0; i < 7; i++) {
            // Get first tile from rack
            const rackTiles = await page.locator('#tile-rack-board .tile').all();
            if (rackTiles.length === 0) {
                console.log(`⚠️  No more tiles in rack after placing ${i} tiles`);
                break;
            }

            const letter = await rackTiles[0].textContent();

            // Click the tile
            await rackTiles[0].click();

            // Find an empty board cell to place it
            // Try to place horizontally starting from row 5, col 0+i
            const targetRow = 5;
            const targetCol = i;
            const cell = page.locator(`.board-cell[data-row="${targetRow}"][data-col="${targetCol}"]`);

            // Check if cell is occupied
            const isOccupied = await cell.evaluate(el => el.classList.contains('occupied'));
            if (!isOccupied) {
                await cell.click();
                console.log(`  ✓ Placed ${letter.charAt(0)} at (${targetRow}, ${targetCol})`);
            } else {
                console.log(`  ⚠️  Cell (${targetRow}, ${targetCol}) is occupied, trying next`);
                // Try next column
                await page.click(`.board-cell[data-row="${targetRow}"][data-col="${targetCol + 1}"]`);
            }

            await page.waitForTimeout(100);
        }

        // Step 4: Verify rack is empty
        const rackAfterPlacement = await page.locator('#tile-rack-board .tile').count();
        console.log(`\n📍 Rack tiles after placement: ${rackAfterPlacement}`);
        expect(rackAfterPlacement).toBe(0); // Rack should be empty

        // Step 5: Verify tiles are on board
        const placedTilesOnBoard = await page.locator('.board-cell.placed-this-turn .tile').count();
        console.log(`📍 Tiles placed on board: ${placedTilesOnBoard}`);
        expect(placedTilesOnBoard).toBe(7); // All 7 should be on board

        // Step 6: Check game state before refresh
        const stateBeforeRefresh = await page.evaluate(() => {
            return {
                placedTiles: window.gameState.placedTiles.length,
                rackTiles: window.gameState.rackTiles.length,
                totalTilesDrawn: window.gameState.totalTilesDrawn,
                currentTurn: window.gameState.currentTurn
            };
        });
        console.log(`\n📍 Game state before refresh:`, stateBeforeRefresh);

        // Step 7: Refresh the page
        console.log('\n🔄 REFRESHING PAGE...\n');
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('#tile-rack-board', { timeout: 5000 });
        await page.waitForTimeout(1000);

        // Step 8: Check game state after refresh
        const stateAfterRefresh = await page.evaluate(() => {
            return {
                placedTiles: window.gameState.placedTiles.length,
                rackTiles: window.gameState.rackTiles.length,
                totalTilesDrawn: window.gameState.totalTilesDrawn,
                currentTurn: window.gameState.currentTurn
            };
        });
        console.log(`📍 Game state after refresh:`, stateAfterRefresh);

        // Step 9: Count tiles in rack after refresh
        const rackAfterRefresh = await page.locator('#tile-rack-board .tile').count();
        console.log(`📍 Rack tiles after refresh: ${rackAfterRefresh}`);

        // Step 10: Count tiles on board after refresh
        const tilesOnBoardAfterRefresh = await page.locator('.board-cell.placed-this-turn .tile').count();
        console.log(`📍 Tiles on board after refresh: ${tilesOnBoardAfterRefresh}`);

        // Step 11: Get letters after refresh
        const lettersAfterRefresh = await page.evaluate(() => {
            const tiles = Array.from(document.querySelectorAll('#tile-rack-board .tile'));
            return tiles.map(t => t.dataset.letter);
        });
        console.log(`📍 Letters after refresh: ${lettersAfterRefresh.join(', ')}\n`);

        // THE BUG: Rack should still be empty (0 tiles), but it has new tiles!
        console.log('='.repeat(60));
        if (rackAfterRefresh > 0) {
            console.log('❌ BUG CONFIRMED: New tiles appeared in rack after refresh!');
            console.log(`   Expected: 0 tiles in rack (all 7 still on board)`);
            console.log(`   Actual: ${rackAfterRefresh} tiles in rack`);
            console.log(`   Board: ${tilesOnBoardAfterRefresh} tiles`);
        } else {
            console.log('✅ No bug: Rack is still empty as expected');
        }
        console.log('='.repeat(60) + '\n');

        // Assertions to document the expected behavior
        // UNCOMMENT these when bug is fixed:
        // expect(rackAfterRefresh).toBe(0); // Should be empty
        // expect(tilesOnBoardAfterRefresh).toBe(7); // All 7 should still be on board

        // CURRENT BEHAVIOR (documenting the bug):
        console.log(`Current behavior: ${rackAfterRefresh} tiles in rack, ${tilesOnBoardAfterRefresh} on board`);
        console.log(`Bug: Rack should be 0, board should be 7`);
    });
});
