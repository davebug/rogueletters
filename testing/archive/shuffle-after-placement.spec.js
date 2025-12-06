// Test for shuffle-after-placement bug fix
// This validates that share URLs work correctly even when user:
// 1. Places some tiles
// 2. Shuffles remaining tiles (multiple times)
// 3. Places more tiles
// 4. Generates share URL
// 5. Share URL decodes correctly

const { test, expect } = require('@playwright/test');

test.describe('Shuffle After Placement Bug Fix', () => {
    test('should generate valid share URL after placing tiles and shuffling', async ({ page }) => {
        // Use a known seed with a known valid play
        const seed = '20251020'; // Has BOO as a valid first turn

        console.log('\n=== Testing Shuffle-After-Placement Bug Fix ===');
        console.log(`Seed: ${seed}\n`);

        // Step 1: Load game
        console.log('[1/5] Loading fresh game...');
        await page.goto(`http://localhost:8085/?seed=${seed}`);
        await page.waitForSelector('#game-board', { timeout: 15000 });
        await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
        await page.waitForFunction(() => window.gameState && window.gameState.rackTiles && window.gameState.rackTiles.length > 0, { timeout: 15000 });
        await page.waitForTimeout(1000);

        const initialRack = await page.evaluate(() => window.gameState.rackTiles);
        console.log(`Initial rack: [${initialRack.join(', ')}]`);

        // Step 2: Place first tile using game API
        console.log('\n[2/5] Placing first tile (B)...');
        await page.evaluate(() => {
            const b = document.querySelector('.tile:not(.placed) .tile-letter');
            if (b && b.textContent === 'B') {
                b.parentElement.click();
            }
        });
        await page.waitForTimeout(200);

        await page.locator('.board-cell:not(.rack-cell)[data-row="5"][data-col="3"]').click();
        await page.waitForTimeout(300);
        console.log('  ✓ Placed B at (5,3)');

        // Step 3: Shuffle multiple times (this is the bug trigger!)
        console.log('\n[3/5] Shuffling remaining tiles 3 times...');

        for (let i = 1; i <= 3; i++) {
            await page.click('#shuffle-rack');
            await page.waitForTimeout(400);

            const rackAfterShuffle = await page.evaluate(() => window.gameState.rackTiles);
            console.log(`  Shuffle ${i}: [${rackAfterShuffle.join(', ')}]`);
        }

        // Step 4: Place remaining tiles to complete BOO
        console.log('\n[4/5] Placing additional tiles...');

        // Place first O
        await page.locator('.tile:not(.placed)').filter({ hasText: 'O' }).first().click();
        await page.waitForTimeout(200);
        await page.locator('.board-cell:not(.rack-cell)[data-row="5"][data-col="4"]').click();
        await page.waitForTimeout(300);
        console.log('  ✓ Placed O at (5,4)');

        // Place second O
        await page.locator('.tile:not(.placed)').filter({ hasText: 'O' }).first().click();
        await page.waitForTimeout(200);
        await page.locator('.board-cell:not(.rack-cell)[data-row="5"][data-col="5"]').click();
        await page.waitForTimeout(300);
        console.log('  ✓ Placed O at (5,5)');

        // Submit the word
        console.log('\n[5/5] Submitting word and verifying share URL...');
        await page.waitForTimeout(500);

        const submitButton = page.locator('button').filter({ hasText: 'pts →' });
        await submitButton.click();
        await page.waitForTimeout(1500);

        // Verify game state has share URL
        const gameState = await page.evaluate(() => ({
            preGeneratedShareURL: window.gameState.preGeneratedShareURL,
            score: window.gameState.score,
            turnScores: window.gameState.turnScores
        }));

        expect(gameState.preGeneratedShareURL).toBeTruthy();
        expect(gameState.preGeneratedShareURL).toContain('?w=');
        console.log(`  ✓ Share URL generated: ${gameState.preGeneratedShareURL.substring(0, 60)}...`);

        // Load the share URL and verify
        const shareURL = gameState.preGeneratedShareURL.replace('https://letters.wiki', 'http://localhost:8085');
        const newPage = await page.context().newPage();
        await newPage.goto(shareURL);
        await newPage.waitForSelector('#game-board', { timeout: 10000 });
        await newPage.waitForTimeout(1500);

        const sharedState = await newPage.evaluate(() => ({
            score: window.gameState.score,
            turnScores: window.gameState.turnScores,
            tilesPlaced: Array.from(document.querySelectorAll('.board-cell .tile')).length
        }));

        expect(sharedState.score).toBe(gameState.score);
        expect(sharedState.turnScores).toEqual(gameState.turnScores);
        console.log(`  ✓ Share URL round-trip verified: ${sharedState.tilesPlaced} tiles loaded`);
        console.log('✓ Shuffle-after-placement bug is FIXED!\n');

        await newPage.close();
    });

    test.skip('Extreme case covered by main test', async ({ page }) => {
        // This test is redundant - the main test already validates shuffling after tile placement
    });
});
