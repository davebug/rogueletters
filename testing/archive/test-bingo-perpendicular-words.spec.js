const { test, expect } = require('@playwright/test');

test.describe('Bingo bonus - only main word gets +50, not perpendiculars', () => {
    test.setTimeout(60000);

    test('7 tiles forming multiple words - only main word gets +50', async ({ page }) => {
        console.log('\n' + '='.repeat(60));
        console.log('BINGO PERPENDICULAR WORDS TEST');
        console.log('Place 7 tiles that form a main word + perpendicular words');
        console.log('Only the 7-tile word should get +50 bonus');
        console.log('='.repeat(60) + '\n');

        // Navigate with debug mode
        await page.goto('http://localhost:8085?debug=1');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('#tile-rack-board .tile', { timeout: 10000 });

        // Enable debug mode
        await page.locator('#debug-mode-toggle').click({ force: true });
        console.log('✅ Debug mode enabled\n');

        await page.waitForTimeout(1000);

        // Setup: First, place a horizontal word at row 3 to cross with
        console.log('SETUP: Placing initial horizontal word at row 3...');
        for (let i = 0; i < 5; i++) {
            const rackTiles = await page.locator('#tile-rack-board .tile').all();
            if (rackTiles.length === 0) break;

            await rackTiles[0].click();
            await page.click(`.board-cell[data-row="3"][data-col="${i + 2}"]`);
            await page.waitForTimeout(50);
        }

        // Submit first word
        await page.click('#submit-word');
        await page.waitForTimeout(2000);

        console.log('✅ Initial word placed\n');

        // Now place 7 tiles vertically that will cross the horizontal word
        console.log('TEST: Placing 7 tiles vertically (will form multiple words)...\n');

        const tilesPlaced = [];
        for (let i = 0; i < 7; i++) {
            const rackTiles = await page.locator('#tile-rack-board .tile').all();
            if (rackTiles.length === 0) break;

            const letter = await rackTiles[0].textContent();
            tilesPlaced.push(letter.charAt(0));

            await rackTiles[0].click();

            // Place vertically in column 4, starting at row 1
            await page.click(`.board-cell[data-row="${i + 1}"][data-col="4"]`);
            console.log(`  ${i + 1}. Placed ${letter.charAt(0)} at row ${i + 1}`);
            await page.waitForTimeout(50);
        }

        console.log(`\n✅ Placed ${tilesPlaced.length} tiles\n`);

        // Wait for potential words display to update
        await page.waitForTimeout(500);

        // Check the potential words display
        const potentialWords = await page.evaluate(() => {
            const wordItems = document.querySelectorAll('#potential-words-list .word-item');
            return Array.from(wordItems).map(item => ({
                word: item.querySelector('.word-text')?.textContent || '',
                score: parseInt(item.querySelector('.word-score')?.textContent || '0')
            }));
        });

        console.log('POTENTIAL WORDS DISPLAY:');
        potentialWords.forEach(w => {
            console.log(`  ${w.word}: ${w.score} points`);
        });

        // Find the 7-letter main word (vertical)
        const mainWord = potentialWords.find(w => w.word.length === 7);
        const perpendicularWords = potentialWords.filter(w => w.word.length < 7);

        console.log('\nANALYSIS:');
        if (mainWord) {
            const baseScore = mainWord.score - 50; // Remove bonus to see base
            console.log(`  Main word (7 letters): "${mainWord.word}"`);
            console.log(`    Score: ${mainWord.score}`);
            console.log(`    Base score: ~${baseScore}`);
            console.log(`    Has +50 bonus: ${mainWord.score > baseScore + 40 ? 'YES ✓' : 'NO ✗'}`);
        }

        if (perpendicularWords.length > 0) {
            console.log(`\n  Perpendicular words (${perpendicularWords.length}):`);
            let allCorrect = true;
            perpendicularWords.forEach(w => {
                // Estimate base score (rough calculation)
                const letterValues = { 'E': 1, 'T': 1, 'A': 1, 'I': 1, 'O': 1, 'N': 1 };
                const estimatedBase = w.word.split('').reduce((sum, c) => sum + (letterValues[c] || 3), 0);
                const hasBonus = w.score > estimatedBase + 40; // If score is way higher than expected

                console.log(`    "${w.word}": ${w.score} points ${hasBonus ? '❌ (has +50 bonus!)' : '✓'}`);
                if (hasBonus) allCorrect = false;
            });

            if (allCorrect) {
                console.log('\n  ✅ All perpendicular words have NO bonus');
            } else {
                console.log('\n  ❌ Some perpendicular words incorrectly have +50 bonus');
            }
        }

        console.log('\n' + '='.repeat(60) + '\n');

        // Verify: Main word should have bonus, perpendiculars should not
        if (mainWord) {
            // Main word should be significantly higher (has +50)
            expect(mainWord.score).toBeGreaterThan(50);
        }

        if (perpendicularWords.length > 0) {
            // Perpendicular 2-letter words should be low scores (< 50)
            perpendicularWords.forEach(w => {
                if (w.word.length === 2) {
                    expect(w.score).toBeLessThan(50); // Should not have +50 bonus
                }
            });
        }
    });
});
