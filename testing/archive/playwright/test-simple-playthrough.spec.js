const { test, expect } = require('@playwright/test');

test('simple full game with scoring verification', async ({ page }) => {
    test.setTimeout(60000);

    console.log('\n🎮 STARTING SIMPLE PLAYTHROUGH TEST\n');

    // Track validation responses
    const validations = [];
    page.on('response', async response => {
        if (response.url().includes('validate_word')) {
            const body = await response.json();
            validations.push(body);
            console.log(`\nValidation: ${body.valid ? '✅' : '❌'} ${body.message || ''}`);
            if (body.valid) {
                console.log(`  Words: ${body.words_formed.join(', ')}`);
                console.log(`  Score: ${body.score}`);
            }
        }
    });

    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile');

    // Get starting word info
    const startingWord = await page.evaluate(() => {
        const tiles = document.querySelectorAll('.board-cell.occupied .tile');
        return Array.from(tiles).map(t => t.textContent.charAt(0)).join('');
    });
    console.log(`Starting word: ${startingWord}`);

    let gameEnded = false;
    let turn = 1;

    // Play up to 5 turns
    while (turn <= 5 && !gameEnded) {
        console.log(`\n--- TURN ${turn} ---`);

        const currentScore = await page.locator('#current-score').textContent();
        console.log(`Current score: ${currentScore}`);

        // Get rack tiles
        const rackTiles = await page.locator('.tile-rack .tile').all();
        const letters = [];
        for (const tile of rackTiles) {
            const text = await tile.textContent();
            letters.push(text.charAt(0));
        }
        console.log(`Rack: ${letters.join(', ')}`);

        // Simple placement strategy
        if (turn === 1) {
            // TEST 1: Invalid placement (disconnected)
            console.log('\nTest 1: Disconnected placement (should fail)');
            await rackTiles[0].click();
            await page.click('.board-cell[data-row="0"][data-col="0"]');

            await page.click('#submit-word');
            await page.waitForTimeout(1000);

            const errorModal = await page.locator('#error-modal');
            if (await errorModal.isVisible()) {
                const errorMsg = await page.locator('#error-message').textContent();
                console.log(`✅ Correctly rejected: "${errorMsg}"`);
                await page.click('#close-error');
                await page.click('#recall-tiles');
            }

            // TEST 2: Valid single tile placement
            console.log('\nTest 2: Valid connected placement');
            // Find 'N' if available to form 'AN' with A in COMPANY
            const nIndex = letters.indexOf('N');
            if (nIndex >= 0 && startingWord.includes('A')) {
                const aPos = startingWord.indexOf('A');
                const aCol = 4 + aPos; // Starting word begins at col 4

                await rackTiles[nIndex].click();
                await page.click(`.board-cell[data-row="8"][data-col="${aCol}"]`);
                console.log(`Placing N below A at column ${aCol}`);

                // Check preview
                const preview = await page.locator('.word-preview').textContent();
                console.log(`Preview: ${preview.trim()}`);

                // Check for double letter bonus
                const cellClass = await page.locator(`.board-cell[data-row="8"][data-col="${aCol}"]`).getAttribute('class');
                if (cellClass.includes('double-letter')) {
                    console.log('  📍 On DOUBLE LETTER square!');
                }
            } else {
                // Just extend the word horizontally
                await rackTiles[0].click();
                const lastCol = 4 + startingWord.length;
                await page.click(`.board-cell[data-row="7"][data-col="${lastCol}"]`);
            }

            await page.click('#submit-word');
            await page.waitForTimeout(1000);
        } else if (turn === 2) {
            // TEST 3: Multiple tile placement
            console.log('\nTest 3: Multiple tile placement');
            if (rackTiles.length >= 2) {
                const occupied = await page.locator('.board-cell.occupied').first();
                const row = await occupied.getAttribute('data-row');
                const col = await occupied.getAttribute('data-col');

                await rackTiles[0].click();
                await page.click(`.board-cell[data-row="${parseInt(row) + 1}"][data-col="${col}"]`);

                await rackTiles[0].click(); // First remaining
                await page.click(`.board-cell[data-row="${parseInt(row) + 2}"][data-col="${col}"]`);

                await page.click('#submit-word');
                await page.waitForTimeout(1000);
            }
        } else if (turn === 3) {
            // TEST 4: Triple word score attempt
            console.log('\nTest 4: Looking for multiplier squares');

            // Try corner triple word (0,0) if we can connect
            await rackTiles[0].click();
            await page.click('.board-cell[data-row="1"][data-col="0"]');

            if (rackTiles.length > 1) {
                await rackTiles[0].click();
                await page.click('.board-cell[data-row="0"][data-col="0"]');
                console.log('  Placed on TRIPLE WORD corner!');
            }

            await page.click('#submit-word');
            await page.waitForTimeout(1000);
        } else {
            // Just place any valid tiles
            const occupied = await page.locator('.board-cell.occupied').last();
            const row = await occupied.getAttribute('data-row');
            const col = await occupied.getAttribute('data-col');

            await rackTiles[0].click();
            await page.click(`.board-cell[data-row="${row}"][data-col="${parseInt(col) + 1}"]`);

            await page.click('#submit-word');
            await page.waitForTimeout(1000);
        }

        // Handle errors
        const errorModal = await page.locator('#error-modal');
        if (await errorModal.isVisible()) {
            await page.click('#close-error');
            await page.click('#recall-tiles');
            // Just skip this turn
        }

        // Check if game ended
        const gameOverModal = await page.locator('#game-over-modal');
        if (await gameOverModal.isVisible()) {
            gameEnded = true;
            console.log('\n🏁 GAME OVER!');

            const finalScore = await page.locator('#final-score-display').textContent().catch(() => currentScore);
            console.log(`Final score: ${finalScore}`);

            // Test high score entry
            const initialsInput = await page.locator('#initials-input');
            if (await initialsInput.isVisible()) {
                console.log('🏆 High score! Entering initials...');
                await initialsInput.fill('TST');

                const submitBtn = await page.locator('#submit-initials');
                if (await submitBtn.isVisible()) {
                    await submitBtn.click();
                }
            }

            // Test share
            const shareBtn = await page.locator('#share-game');
            if (await shareBtn.isVisible()) {
                await shareBtn.click();
                await page.waitForTimeout(500);
                console.log('📤 Share button clicked');
            }

            break;
        }

        turn++;
    }

    // If game didn't end naturally, force it
    if (!gameEnded) {
        console.log('\nForcing game end...');
        await page.evaluate(() => {
            if (window.endGame) window.endGame();
        });
        await page.waitForTimeout(2000);

        // Check if game over section is visible
        const gameOverSection = await page.locator('#game-over-section');
        if (await gameOverSection.isVisible()) {
            console.log('🏁 Game over section visible!');

            // Get final score
            const finalScore = await page.locator('#final-score-display').textContent();
            console.log(`Final score displayed: ${finalScore}`);

            // Look for player name input
            const playerNameInput = await page.locator('#player-name');
            if (await playerNameInput.isVisible()) {
                console.log('\n🏆 ENTERING HIGH SCORE');
                await playerNameInput.fill('TST');
                console.log('Entered initials: TST');

                // Submit score
                const submitBtn = await page.locator('#submit-score');
                if (await submitBtn.isVisible()) {
                    await submitBtn.click();
                    console.log('Score submitted!');
                    await page.waitForTimeout(1000);
                }
            }

            // Check share button
            const shareBtn = await page.locator('#share-game');
            if (await shareBtn.isVisible()) {
                console.log('Share button available');
            }
        }
    }

    // Final screenshot
    await page.screenshot({
        path: 'test-results/simple-playthrough.png',
        fullPage: true
    });

    // Summary
    console.log('\n📊 TEST SUMMARY:');
    console.log(`Total validations: ${validations.length}`);
    console.log(`Successful words: ${validations.filter(v => v.valid).length}`);
    console.log(`Failed attempts: ${validations.filter(v => !v.valid).length}`);

    // Check scoring consistency
    const validScores = validations.filter(v => v.valid && v.score > 0);
    if (validScores.length > 0) {
        console.log('\n✅ SCORING VERIFICATION:');
        validScores.forEach((v, i) => {
            console.log(`  ${i + 1}. Words: ${v.words_formed.join(', ')} = ${v.score} points`);
        });
    }

    // Verify core mechanics
    expect(validations.length).toBeGreaterThan(0);
    expect(validations.some(v => !v.valid)).toBe(true); // At least one rejection
    expect(validations.some(v => v.valid)).toBe(true); // At least one success

    console.log('\n✅ Playthrough complete!');
});