const { test, expect } = require('@playwright/test');

test.describe('Bingo bonus - exactly +50, not +100', () => {
    test.setTimeout(60000);

    test('7 tiles should give +50 bonus once (not doubled)', async ({ page }) => {
        console.log('\n' + '='.repeat(60));
        console.log('BINGO BONUS FIX TEST');
        console.log('='.repeat(60) + '\n');

        // Navigate with debug mode
        await page.goto('http://localhost:8085?debug=1');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('#tile-rack-board .tile', { timeout: 10000 });

        // Enable debug mode
        await page.locator('#debug-mode-toggle').click({ force: true });
        console.log('✅ Debug mode enabled\n');

        await page.waitForTimeout(1000);

        // Intercept backend response to capture the score
        let backendScore = null;
        let backendResponse = null;

        await page.route('**/cgi-bin/validate_word.py', async route => {
            const response = await route.fetch();
            const body = await response.text();
            backendResponse = JSON.parse(body);
            backendScore = backendResponse.score;

            console.log(`📡 Backend response:`);
            console.log(`   Valid: ${backendResponse.valid}`);
            console.log(`   Score: ${backendScore}`);
            console.log(`   Words formed: ${JSON.stringify(backendResponse.words_formed)}`);

            route.fulfill({ response, body });
        });

        // Get current score
        const scoreBefore = await page.evaluate(() => window.gameState.score);
        console.log(`\n📊 Game score before: ${scoreBefore}\n`);

        // Place all 7 tiles
        console.log('📤 Placing 7 tiles...');
        for (let i = 0; i < 7; i++) {
            const rackTiles = await page.locator('#tile-rack-board .tile').all();
            if (rackTiles.length === 0) break;

            const letter = await rackTiles[0].textContent();
            await rackTiles[0].click();

            await page.click(`.board-cell[data-row="5"][data-col="${i}"]`);
            console.log(`  ${i + 1}. Placed ${letter.charAt(0)}`);
            await page.waitForTimeout(50);
        }

        const tilesPlaced = await page.locator('.board-cell.placed-this-turn .tile').count();
        console.log(`\n✅ ${tilesPlaced} tiles placed\n`);
        expect(tilesPlaced).toBe(7);

        // Submit
        console.log('📤 Submitting...\n');
        await page.click('#submit-word');

        // Wait for submission to complete
        await page.waitForTimeout(2000);

        // Check if error modal appeared (shouldn't in debug mode)
        const errorModal = page.locator('#error-modal');
        const errorVisible = await errorModal.isVisible();
        if (errorVisible) {
            const errorMsg = await page.locator('#error-message').textContent();
            console.log(`⚠️  Error modal: ${errorMsg}`);
        }

        // Get score after
        const scoreAfter = await page.evaluate(() => window.gameState.score);
        const actualScoreAdded = scoreAfter - scoreBefore;

        console.log(`📊 Game score after: ${scoreAfter}`);
        console.log(`📊 Score added: ${actualScoreAdded}\n`);

        if (backendScore !== null) {
            console.log('='.repeat(60));
            console.log('ANALYSIS:');
            console.log(`  Backend calculated: ${backendScore} (includes +50 if 7 tiles)`);
            console.log(`  Frontend added to game: ${actualScoreAdded}`);
            console.log(`  Difference: ${actualScoreAdded - backendScore}`);

            if (actualScoreAdded === backendScore) {
                console.log('\n✅ CORRECT: Score matches backend exactly');
                console.log('   (No duplicate +50 bonus)');
            } else if (actualScoreAdded === backendScore + 50) {
                console.log('\n❌ BUG: Frontend added extra +50 on top of backend!');
                console.log(`   Expected: ${backendScore}`);
                console.log(`   Got: ${actualScoreAdded}`);
            } else {
                console.log(`\n⚠️  Unexpected difference: ${actualScoreAdded - backendScore}`);
            }
            console.log('='.repeat(60) + '\n');

            // This should PASS after fix
            expect(actualScoreAdded).toBe(backendScore);
        } else {
            throw new Error('Failed to capture backend response');
        }
    });
});
