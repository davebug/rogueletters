const { test, expect } = require('@playwright/test');

test.describe('WikiLetters logo click with all tiles placed', () => {
    test.setTimeout(60000);

    test('Place all 7 tiles, click logo, should NOT add tile to rack', async ({ page }) => {
        console.log('\n' + '='.repeat(60));
        console.log('LOGO CLICK BUG TEST');
        console.log('Place all 7 tiles, click WikiLetters logo');
        console.log('Rack should stay empty after navigation');
        console.log('='.repeat(60) + '\n');

        // Navigate with specific seed
        await page.goto('http://localhost:8085?seed=20251005');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('#tile-rack-board .tile', { timeout: 10000 });
        await page.waitForTimeout(1000);

        console.log('📍 Initial page load complete\n');

        // Count initial tiles
        const initialRackTiles = await page.locator('#tile-rack-board .tile').count();
        console.log(`📍 Initial rack tiles: ${initialRackTiles}`);
        expect(initialRackTiles).toBe(7);

        // Place all 7 tiles on the board
        console.log('\n📤 Placing all 7 tiles on board...');
        for (let i = 0; i < 7; i++) {
            const rackTiles = await page.locator('#tile-rack-board .tile').all();
            if (rackTiles.length === 0) break;

            const letter = await rackTiles[0].textContent();
            await rackTiles[0].click();
            await page.click(`.board-cell[data-row="5"][data-col="${i}"]`);
            console.log(`  ${i + 1}. Placed ${letter.charAt(0)}`);
            await page.waitForTimeout(100);
        }

        // Verify rack is empty
        const rackAfterPlacement = await page.locator('#tile-rack-board .tile').count();
        console.log(`\n📍 Rack after placement: ${rackAfterPlacement}`);
        expect(rackAfterPlacement).toBe(0);

        // Verify tiles on board
        const tilesOnBoard = await page.locator('.board-cell.placed-this-turn .tile').count();
        console.log(`📍 Tiles on board: ${tilesOnBoard}`);
        expect(tilesOnBoard).toBe(7);

        // Check gameState before navigation
        const stateBefore = await page.evaluate(() => {
            return {
                rackTiles: window.gameState.rackTiles,
                placedTiles: window.gameState.placedTiles.length,
                seed: window.gameState.seed
            };
        });
        console.log(`\n📍 State before navigation:`);
        console.log(`   rackTiles: ${JSON.stringify(stateBefore.rackTiles)}`);
        console.log(`   placedTiles: ${stateBefore.placedTiles}`);
        console.log(`   seed: ${stateBefore.seed}`);

        // Check localStorage before navigation
        const localStorageBefore = await page.evaluate(() => {
            const saved = localStorage.getItem('letters_game_state');
            if (saved) {
                const state = JSON.parse(saved);
                return {
                    rackTiles: state.rackTiles,
                    placedTiles: state.placedTiles ? state.placedTiles.length : 0,
                    seed: state.seed
                };
            }
            return null;
        });
        console.log(`\n📍 localStorage before navigation:`);
        console.log(`   rackTiles: ${JSON.stringify(localStorageBefore?.rackTiles)}`);
        console.log(`   placedTiles: ${localStorageBefore?.placedTiles}`);

        // Click the WikiLetters logo
        console.log('\n🔗 Clicking WikiLetters logo...\n');
        await page.click('header h1 a');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        // Check URL after navigation
        const url = page.url();
        console.log(`📍 URL after navigation: ${url}`);

        // Check gameState after navigation
        const stateAfter = await page.evaluate(() => {
            return {
                rackTiles: window.gameState.rackTiles,
                placedTiles: window.gameState.placedTiles.length,
                seed: window.gameState.seed
            };
        });
        console.log(`\n📍 State after navigation:`);
        console.log(`   rackTiles: ${JSON.stringify(stateAfter.rackTiles)}`);
        console.log(`   placedTiles: ${stateAfter.placedTiles}`);
        console.log(`   seed: ${stateAfter.seed}`);

        // Count tiles in rack after navigation
        const rackAfterNavigation = await page.locator('#tile-rack-board .tile').count();
        console.log(`\n📍 Rack tiles after navigation: ${rackAfterNavigation}`);

        // Count tiles on board after navigation
        const boardAfterNavigation = await page.locator('.board-cell.placed-this-turn .tile').count();
        console.log(`📍 Board tiles after navigation: ${boardAfterNavigation}`);

        // Get letters in rack after navigation
        const lettersInRack = await page.evaluate(() => {
            const tiles = Array.from(document.querySelectorAll('#tile-rack-board .tile'));
            return tiles.map(t => t.dataset.letter || t.textContent.charAt(0));
        });
        console.log(`📍 Letters in rack: ${JSON.stringify(lettersInRack)}\n`);

        // THE BUG
        console.log('='.repeat(60));
        if (rackAfterNavigation === 0) {
            console.log('✅ PASS: Rack is still empty');
        } else {
            console.log(`❌ BUG CONFIRMED: ${rackAfterNavigation} tile(s) appeared in rack!`);
            console.log(`   Expected: 0 tiles in rack`);
            console.log(`   Got: ${rackAfterNavigation} tiles in rack`);
            console.log(`   Letters: ${lettersInRack.join(', ')}`);
        }
        console.log('='.repeat(60) + '\n');

        // Assertions
        expect(rackAfterNavigation).toBe(0);
        expect(boardAfterNavigation).toBe(7);
        expect(stateAfter.rackTiles).toEqual([]);
    });
});
