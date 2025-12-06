const { test, expect } = require('@playwright/test');

test.describe('Bingo bonus bug - should only get +50 once', () => {
    test.setTimeout(60000);

    test('Placing 7 tiles should give exactly +50 bonus, not +100', async ({ page }) => {
        console.log('\n' + '='.repeat(60));
        console.log('BINGO BONUS BUG TEST');
        console.log('='.repeat(60) + '\n');

        // Navigate with debug mode
        await page.goto('http://localhost:8085?debug=1');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('#tile-rack-board .tile', { timeout: 10000 });

        // Enable debug mode
        await page.locator('#debug-mode-toggle').click({ force: true });
        console.log('✅ Debug mode enabled\n');

        await page.waitForTimeout(1000);

        // Capture backend response
        let backendScore = null;
        page.on('response', async response => {
            if (response.url().includes('validate_word.py')) {
                const data = await response.json();
                if (data.valid) {
                    backendScore = data.score;
                    console.log(`📡 Backend returned score: ${backendScore}`);
                }
            }
        });

        // Get current score before placing word
        const scoreBefore = await page.evaluate(() => window.gameState.score);
        console.log(`📊 Score before: ${scoreBefore}`);

        // Place all 7 tiles in a row (debug mode accepts any word)
        console.log('\n📤 Placing all 7 tiles...');
        for (let i = 0; i < 7; i++) {
            const rackTiles = await page.locator('#tile-rack-board .tile').all();
            if (rackTiles.length === 0) break;

            const letter = await rackTiles[0].textContent();
            await rackTiles[0].click();

            // Place horizontally in row 5
            const targetRow = 5;
            const targetCol = i;
            await page.click(`.board-cell[data-row="${targetRow}"][data-col="${targetCol}"]`);
            console.log(`  ✓ Placed ${letter.charAt(0)} at (${targetRow}, ${targetCol})`);

            await page.waitForTimeout(100);
        }

        // Verify 7 tiles placed
        const tilesPlaced = await page.locator('.board-cell.placed-this-turn .tile').count();
        console.log(`\n📍 Tiles placed: ${tilesPlaced}`);
        expect(tilesPlaced).toBe(7);

        // Submit the word
        console.log('📤 Submitting word...\n');
        await page.click('#submit-word');
        await page.waitForTimeout(2000);

        // Get score after submission
        const scoreAfter = await page.evaluate(() => window.gameState.score);
        const scoreDiff = scoreAfter - scoreBefore;

        console.log(`📊 Score after: ${scoreAfter}`);
        console.log(`📊 Score difference: ${scoreDiff}`);

        if (backendScore !== null) {
            console.log(`\n🔍 Analysis:`);
            console.log(`   Backend score: ${backendScore}`);
            console.log(`   Actual score added: ${scoreDiff}`);
            console.log(`   Difference: ${scoreDiff - backendScore}`);

            if (scoreDiff === backendScore) {
                console.log(`\n✅ CORRECT: Score matches backend (no duplicate bonus)`);
            } else if (scoreDiff === backendScore + 50) {
                console.log(`\n❌ BUG CONFIRMED: Frontend added extra +50 bonus!`);
                console.log(`   Expected: ${backendScore} (backend already includes +50)`);
                console.log(`   Got: ${scoreDiff} (frontend added another +50)`);
            } else {
                console.log(`\n⚠️  Unexpected score difference: ${scoreDiff - backendScore}`);
            }

            // The bug: frontend adds +50 on top of backend's +50
            // So scoreDiff = backendScore + 50 (WRONG)
            // Should be: scoreDiff = backendScore (CORRECT)

            // This assertion will FAIL until bug is fixed
            expect(scoreDiff).toBe(backendScore);
        } else {
            console.log('\n⚠️  Could not capture backend response');
        }

        console.log('\n' + '='.repeat(60) + '\n');
    });
});
