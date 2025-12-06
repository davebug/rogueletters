const { test, expect } = require('@playwright/test');

test('complete game with debug mode and high score submission', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for full game

    console.log('\n' + '='.repeat(60));
    console.log('🎮 FULL DEBUG MODE GAME WITH HIGH SCORE SUBMISSION');
    console.log('='.repeat(60) + '\n');

    // Navigate with debug mode enabled
    await page.goto('http://localhost:8085?debug=1');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile');

    // Enable debug mode
    const debugToggle = await page.locator('#debug-mode-toggle');
    await debugToggle.check();
    console.log('✅ Debug mode ENABLED\n');

    // Get starting word
    const startingWord = await page.evaluate(() => {
        const tiles = document.querySelectorAll('.board-cell.occupied .tile');
        return Array.from(tiles).map(t => t.textContent.charAt(0)).join('');
    });
    console.log(`📝 Starting word: ${startingWord}`);

    // Track error modals throughout the game
    let errorModalCount = 0;
    page.on('dialog', async dialog => {
        console.log(`⚠️ Dialog appeared: ${dialog.message()}`);
        await dialog.accept();
    });

    // Monitor for error modals
    page.on('response', async response => {
        // Check if error modal becomes visible
        const errorModal = await page.locator('#error-modal');
        if (await errorModal.isVisible()) {
            errorModalCount++;
            const errorMsg = await page.locator('#error-message').textContent();
            console.log(`\n❌ ERROR MODAL #${errorModalCount}: "${errorMsg}"`);

            // Close the error modal to continue
            const closeBtn = await page.locator('#close-error');
            if (await closeBtn.isVisible()) {
                await closeBtn.click();
                console.log('   Closed error modal\n');
            }
        }
    });

    let totalScore = 0;
    let wordsPlayed = [];

    // Play 5 turns with intentionally invalid words
    for (let turn = 1; turn <= 5; turn++) {
        console.log(`\n${'─'.repeat(40)}`);
        console.log(`TURN ${turn}/5`);
        console.log(`${'─'.repeat(40)}`);

        // Get current score
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

        // Clear any previously placed tiles
        const recallBtn = await page.locator('#recall-tiles');
        if (await recallBtn.isVisible()) {
            await recallBtn.click();
        }

        // Place tiles to form invalid words (since we're in debug mode, they should be accepted)
        let placed = false;

        if (rackTiles.length >= 2) {
            // Find an occupied cell to connect to
            const occupiedCells = await page.locator('.board-cell.occupied').all();

            if (occupiedCells.length > 0) {
                // Get position of first occupied cell
                const firstOccupied = occupiedCells[0];
                const row = parseInt(await firstOccupied.getAttribute('data-row'));
                const col = parseInt(await firstOccupied.getAttribute('data-col'));

                // Try to place tiles adjacent
                const patterns = [
                    { positions: [{r: row, c: col + 1}, {r: row, c: col + 2}] },
                    { positions: [{r: row + 1, c: col}, {r: row + 2, c: col}] },
                    { positions: [{r: row - 1, c: col}, {r: row - 2, c: col}] },
                    { positions: [{r: row, c: col - 1}, {r: row, c: col - 2}] }
                ];

                for (const pattern of patterns) {
                    if (placed) break;

                    let validPattern = true;
                    const placedLetters = [];

                    // Check if positions are valid and empty
                    for (const pos of pattern.positions) {
                        if (pos.r < 0 || pos.r >= 15 || pos.c < 0 || pos.c >= 15) {
                            validPattern = false;
                            break;
                        }

                        const cell = await page.locator(`.board-cell[data-row="${pos.r}"][data-col="${pos.c}"]`);
                        const isOccupied = await cell.evaluate(el => el.classList.contains('occupied'));
                        if (isOccupied) {
                            validPattern = false;
                            break;
                        }
                    }

                    if (validPattern && rackTiles.length >= pattern.positions.length) {
                        // Place tiles
                        for (let i = 0; i < pattern.positions.length; i++) {
                            const pos = pattern.positions[i];
                            const currentRackTiles = await page.locator('.tile-rack .tile').all();
                            if (currentRackTiles.length > 0) {
                                const letter = await currentRackTiles[0].textContent();
                                placedLetters.push(letter.charAt(0));
                                await currentRackTiles[0].click();
                                await page.click(`.board-cell[data-row="${pos.r}"][data-col="${pos.c}"]`);
                            }
                        }

                        const word = placedLetters.join('');
                        console.log(`Placing: "${word}" (intentionally invalid)`);

                        // Submit the word
                        await page.click('#submit-word');
                        await page.waitForTimeout(2000);

                        // Check if word was accepted (should be in debug mode)
                        const errorModal = await page.locator('#error-modal');
                        if (await errorModal.isVisible()) {
                            const errorMsg = await page.locator('#error-message').textContent();
                            console.log(`❌ Unexpected rejection: ${errorMsg}`);
                            await page.click('#close-error');
                            await page.click('#recall-tiles');
                        } else {
                            const newScore = await page.locator('#current-score').textContent();
                            const scoreIncrease = parseInt(newScore) - parseInt(currentScore);
                            console.log(`✅ Word accepted! Score +${scoreIncrease}`);
                            wordsPlayed.push(word);
                            totalScore = parseInt(newScore);
                            placed = true;
                        }
                    }
                }
            }
        }

        // If we couldn't place tiles, try to skip the turn
        if (!placed) {
            console.log('Could not place tiles this turn');
        }

        // Check if game ended early
        const gameOverSection = await page.locator('#game-over-section');
        if (await gameOverSection.isVisible()) {
            console.log('\n🏁 Game ended early!');
            break;
        }
    }

    // Force game end if it hasn't ended naturally
    const gameOverSection = await page.locator('#game-over-section');
    if (!await gameOverSection.isVisible()) {
        console.log('\n⏭️ Forcing game end...');
        await page.evaluate(() => {
            window.gameState.currentTurn = 5;
            window.gameState.isGameOver = true;
            if (window.endGame) window.endGame();
        });
        await page.waitForTimeout(2000);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏆 HIGH SCORE SUBMISSION PHASE');
    console.log('='.repeat(60));

    // Check if game over section is visible
    const gameOverVisible = await page.locator('#game-over-section').isVisible();
    console.log(`\nGame over section visible: ${gameOverVisible ? '✅' : '❌'}`);

    if (gameOverVisible) {
        // Get final score
        const finalScoreElement = await page.locator('#final-score-display');
        let finalScoreText = 'not found';
        if (await finalScoreElement.count() > 0) {
            finalScoreText = await finalScoreElement.textContent();
        }
        console.log(`Final score displayed: ${finalScoreText}`);

        // Look for player name input
        const playerNameInput = await page.locator('#player-name');
        const inputVisible = await playerNameInput.isVisible();
        console.log(`Player name input visible: ${inputVisible ? '✅' : '❌'}`);

        if (inputVisible) {
            console.log('\n📝 ENTERING INITIALS...');
            await playerNameInput.fill('DBG'); // Debug initials
            console.log('Entered: DBG');

            // Take screenshot before submission
            await page.screenshot({
                path: 'test-results/debug-highscore-before-submit.png',
                fullPage: true
            });

            // Look for submit button
            const submitBtn = await page.locator('#submit-score');
            const submitVisible = await submitBtn.isVisible();
            console.log(`Submit button visible: ${submitVisible ? '✅' : '❌'}`);

            if (submitVisible) {
                console.log('\n🚀 SUBMITTING SCORE...');

                // Monitor for error modal specifically during submission
                let submissionError = null;
                const errorPromise = new Promise((resolve) => {
                    const checkError = setInterval(async () => {
                        const errorModal = await page.locator('#error-modal');
                        if (await errorModal.isVisible()) {
                            const errorMsg = await page.locator('#error-message').textContent();
                            submissionError = errorMsg;
                            clearInterval(checkError);
                            resolve(errorMsg);
                        }
                    }, 100);

                    // Timeout after 5 seconds
                    setTimeout(() => {
                        clearInterval(checkError);
                        resolve(null);
                    }, 5000);
                });

                // Click submit
                await submitBtn.click();
                console.log('Clicked submit button');

                // Wait for either error or success
                const error = await errorPromise;

                if (error) {
                    console.log('\n' + '!'.repeat(60));
                    console.log('❌ ERROR MODAL APPEARED DURING SCORE SUBMISSION!');
                    console.log(`Error message: "${error}"`);
                    console.log('!'.repeat(60));

                    // Take screenshot of error
                    await page.screenshot({
                        path: 'test-results/debug-highscore-error.png',
                        fullPage: true
                    });

                    // Try to close error modal
                    const closeBtn = await page.locator('#close-error');
                    if (await closeBtn.isVisible()) {
                        await closeBtn.click();
                        console.log('Closed error modal');
                    }
                } else {
                    console.log('✅ Score submitted without error modal!');

                    // Check if high scores section appeared
                    const highScoresSection = await page.locator('#high-scores-section');
                    if (await highScoresSection.isVisible()) {
                        console.log('✅ High scores section displayed');
                    }
                }
            }
        }

        // Try share button
        console.log('\n📤 TESTING SHARE...');
        const shareBtn = await page.locator('#share-game');
        if (await shareBtn.isVisible()) {
            await shareBtn.click();
            console.log('✅ Share button clicked');
            await page.waitForTimeout(500);
        } else {
            console.log('Share button not visible');
        }
    }

    // Final screenshot
    await page.screenshot({
        path: 'test-results/debug-full-game-final.png',
        fullPage: true
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 GAME SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total score: ${totalScore}`);
    console.log(`Words played: ${wordsPlayed.length} (${wordsPlayed.join(', ')})`);
    console.log(`Error modals during game: ${errorModalCount}`);
    console.log(`Debug mode was: ENABLED`);

    // Assertions
    expect(wordsPlayed.length).toBeGreaterThan(0);
    console.log('\n✅ Debug mode full game test complete!');
});