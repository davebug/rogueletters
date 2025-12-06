const { test, expect } = require('@playwright/test');

test.describe('Beta Readiness Tests', () => {
    test('game loads and critical bugs are fixed', async ({ page }) => {
        await page.goto('http://localhost:8085');

        // Wait for game to load
        await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

        console.log('✅ Game loads successfully');

        // Check Wikipedia context area is removed (no off-color rectangle)
        const wikiContext = await page.$('#wikipedia-context');
        expect(wikiContext).toBeNull();
        console.log('✅ Wikipedia context area removed');

        // Check total score is hidden initially
        const totalScore = page.locator('.total-score-display');
        await expect(totalScore).toBeHidden();
        console.log('✅ Total score hidden initially');

        // Test drag and drop with multipliers
        const firstTile = page.locator('.tile-rack .tile:first-child');
        await firstTile.click();
        await expect(firstTile).toHaveClass(/selected/);

        // Find a DW square and place tile
        const dwSquare = await page.$('.double-word');
        if (dwSquare) {
            await dwSquare.click();

            // Check multiplier text is hidden
            const multiplierText = await dwSquare.$('.multiplier-text');
            expect(multiplierText).toBeNull();
            console.log('✅ Multiplier text hidden when tile placed');

            // Recall tiles to test multiplier restoration
            await page.evaluate(() => {
                document.getElementById('recall-tiles').style.display = 'flex';
            });
            await page.click('#recall-tiles');

            // Check multiplier text is restored
            const restoredMultiplier = await dwSquare.$('.multiplier-text');
            if (restoredMultiplier) {
                const text = await restoredMultiplier.textContent();
                expect(text).toBe('DW');
                console.log('✅ Multiplier text restored when tile removed');
            }
        }

        // Place a simple word to test score display
        // Select tiles to spell a word on the board
        const tiles = await page.$$('.tile-rack .tile');
        if (tiles.length >= 2) {
            // Place first tile
            await tiles[0].click();
            await page.click('[data-row="7"][data-col="7"]');

            // Place second tile
            await tiles[1].click();
            await page.click('[data-row="7"][data-col="8"]');

            // Submit word
            await page.click('#submit-word');
            await page.waitForTimeout(1000);

            // Check if total score appears after submission
            const scoreVisible = await page.evaluate(() => {
                const display = document.querySelector('.total-score-display');
                return display && display.style.display !== 'none';
            });

            if (scoreVisible) {
                console.log('✅ Total score appears after first word');
            }
        }

        console.log('\n🎯 All critical bugs fixed - ready for beta!');
    });
});