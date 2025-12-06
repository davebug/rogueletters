const { test, expect } = require('@playwright/test');

test.describe('Logo click bug - HEADED test', () => {
    test.setTimeout(120000);

    test('Visual test: Place 7 tiles, click logo', async ({ page }) => {
        console.log('\n' + '='.repeat(60));
        console.log('HEADED TEST: Logo Click Bug');
        console.log('='.repeat(60) + '\n');

        // Navigate to production
        await page.goto('https://letters.wiki/?seed=20251005');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        console.log('✅ Page loaded\n');

        // Clear localStorage to start fresh
        await page.evaluate(() => {
            localStorage.clear();
            console.log('localStorage cleared');
        });

        // Reload after clearing localStorage
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Check version
        const version = await page.evaluate(() => {
            const script = document.querySelector('script[src*="script.js"]');
            return script ? script.src : 'not found';
        });
        console.log(`📍 Script version: ${version}\n`);

        // Wait for tiles to load
        await page.waitForSelector('#tile-rack-board .tile', { timeout: 10000 });

        const initialTiles = await page.locator('#tile-rack-board .tile').count();
        console.log(`📍 Initial tiles in rack: ${initialTiles}`);

        // Get initial letters
        const initialLetters = await page.evaluate(() => {
            const tiles = Array.from(document.querySelectorAll('#tile-rack-board .tile'));
            return tiles.map(t => t.dataset.letter);
        });
        console.log(`📍 Initial letters: ${initialLetters.join(', ')}\n`);

        console.log('⏸️  PAUSE: Showing initial state (5 seconds)...');
        await page.waitForTimeout(5000);

        // Place all 7 tiles
        console.log('\n📤 Placing all 7 tiles on the board...\n');
        for (let i = 0; i < 7; i++) {
            await page.waitForTimeout(500); // Slower for visual

            const rackTiles = await page.locator('#tile-rack-board .tile').all();
            if (rackTiles.length === 0) {
                console.log(`⚠️  No more tiles in rack after ${i} placements`);
                break;
            }

            const letter = await rackTiles[0].textContent();
            console.log(`  ${i + 1}. Clicking tile: ${letter.charAt(0)}`);

            await rackTiles[0].click();
            await page.waitForTimeout(300);

            console.log(`     Clicking board cell (5, ${i})`);
            await page.click(`.board-cell[data-row="5"][data-col="${i}"]`);
            await page.waitForTimeout(300);

            // Check rack count
            const currentRack = await page.locator('#tile-rack-board .tile').count();
            console.log(`     Rack now has: ${currentRack} tiles`);
        }

        await page.waitForTimeout(1000);

        // Check final state before navigation
        const rackBeforeNav = await page.locator('#tile-rack-board .tile').count();
        const boardBeforeNav = await page.locator('.board-cell.placed-this-turn .tile').count();

        console.log(`\n📍 BEFORE navigation:`);
        console.log(`   Rack: ${rackBeforeNav} tiles`);
        console.log(`   Board: ${boardBeforeNav} tiles`);

        // Check gameState
        const stateBefore = await page.evaluate(() => {
            return {
                rackTiles: window.gameState?.rackTiles || [],
                placedTiles: window.gameState?.placedTiles?.length || 0
            };
        });
        console.log(`   gameState.rackTiles: ${JSON.stringify(stateBefore.rackTiles)}`);
        console.log(`   gameState.placedTiles: ${stateBefore.placedTiles}`);

        // Check localStorage
        const lsBefore = await page.evaluate(() => {
            const saved = localStorage.getItem('letters_game_state');
            if (saved) {
                const state = JSON.parse(saved);
                return {
                    rackTiles: state.rackTiles || [],
                    placedTiles: state.placedTiles?.length || 0
                };
            }
            return null;
        });
        console.log(`   localStorage.rackTiles: ${JSON.stringify(lsBefore?.rackTiles)}`);
        console.log(`   localStorage.placedTiles: ${lsBefore?.placedTiles}`);

        console.log('\n⏸️  PAUSE: About to click WikiLetters logo (5 seconds)...');
        await page.waitForTimeout(5000);

        // Click logo
        console.log('\n🔗 Clicking WikiLetters logo...\n');
        await page.click('header h1 a');

        // Wait for navigation
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Check after navigation
        const rackAfterNav = await page.locator('#tile-rack-board .tile').count();
        const boardAfterNav = await page.locator('.board-cell.placed-this-turn .tile').count();

        console.log(`📍 AFTER navigation:`);
        console.log(`   Rack: ${rackAfterNav} tiles`);
        console.log(`   Board: ${boardAfterNav} tiles`);

        // Get letters if any appeared
        const lettersAfter = await page.evaluate(() => {
            const tiles = Array.from(document.querySelectorAll('#tile-rack-board .tile'));
            return tiles.map(t => t.dataset.letter);
        });
        console.log(`   Letters in rack: ${JSON.stringify(lettersAfter)}`);

        // Check gameState after
        const stateAfter = await page.evaluate(() => {
            return {
                rackTiles: window.gameState?.rackTiles || [],
                placedTiles: window.gameState?.placedTiles?.length || 0
            };
        });
        console.log(`   gameState.rackTiles: ${JSON.stringify(stateAfter.rackTiles)}`);
        console.log(`   gameState.placedTiles: ${stateAfter.placedTiles}`);

        console.log('\n' + '='.repeat(60));
        if (rackAfterNav === 0) {
            console.log('✅ PASS: No tiles in rack (correct)');
        } else {
            console.log(`❌ BUG: ${rackAfterNav} tile(s) appeared in rack!`);
            console.log(`   Letters: ${lettersAfter.join(', ')}`);
        }
        console.log('='.repeat(60));

        console.log('\n⏸️  PAUSE: Test complete, showing final state (10 seconds)...');
        await page.waitForTimeout(10000);

        // Final assertion
        expect(rackAfterNav).toBe(0);
    });
});
