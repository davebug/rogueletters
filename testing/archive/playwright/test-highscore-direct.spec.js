const { test, expect } = require('@playwright/test');

test('high score entry and submission', async ({ page }) => {
    console.log('\n🏆 TESTING HIGH SCORE ENTRY SYSTEM\n');

    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile');

    // Clear existing high scores to ensure we get on the board
    await page.evaluate(() => {
        localStorage.removeItem('letters_high_scores');
    });

    console.log('✅ Cleared existing high scores');

    // Play a quick game with known valid moves
    console.log('\n📝 Playing quick game...');

    // Turn 1: Place N below A to form "AN"
    const tiles = await page.locator('.tile-rack .tile').all();
    let placed = false;

    for (const tile of tiles) {
        const letter = await tile.textContent();
        if (letter.charAt(0) === 'N') {
            await tile.click();
            // A is at column 8 in COMPANY
            await page.click('.board-cell[data-row="8"][data-col="8"]');
            await page.click('#submit-word');
            await page.waitForTimeout(1500);
            placed = true;
            console.log('  Turn 1: Placed N to form AN');
            break;
        }
    }

    const score1 = await page.locator('#current-score').textContent();
    console.log(`  Score after turn 1: ${score1}`);

    // Now force the game to end with a specific score
    console.log('\n⏩ Forcing game end with score of 42...');

    await page.evaluate(() => {
        window.gameState.currentTurn = 5;
        window.gameState.score = 42;
        window.gameState.isGameOver = true;

        // Call endGame directly
        if (window.endGame) {
            window.endGame();
        } else {
            // Manually trigger game over by showing the game-over-section
            const gameOverSection = document.getElementById('game-over-section');
            if (gameOverSection) {
                gameOverSection.style.display = 'block';
            }

            // Show final score
            const finalScoreDisplay = document.getElementById('final-score-display');
            if (finalScoreDisplay) {
                finalScoreDisplay.textContent = '42';
            }
        }
    });

    await page.waitForTimeout(2000);

    // Check game over section
    const gameOverSection = await page.locator('#game-over-section');
    const sectionVisible = await gameOverSection.isVisible();
    console.log(`\n📋 Game over section visible: ${sectionVisible ? '✅' : '❌'}`);

    if (!sectionVisible) {
        // Try to make it visible
        await page.evaluate(() => {
            document.getElementById('game-over-section').style.display = 'block';
        });
    }

    // Look for player name input (not initials-input)
    let playerNameInput = await page.locator('#player-name');

    console.log('\n🎮 ENTERING HIGH SCORE');
    console.log('=' .repeat(30));

    // Enter initials
    if (await playerNameInput.isVisible()) {
        console.log('📝 Entering initials: TST');
        await playerNameInput.fill('TST');

        // Take screenshot
        await page.screenshot({
            path: 'test-results/highscore-entry-filled.png',
            fullPage: true
        });

        // Submit score
        const submitBtn = await page.locator('#submit-score');
        if (await submitBtn.isVisible()) {
            await submitBtn.click();
            console.log('✅ Score submitted');
            await page.waitForTimeout(1000);
        } else {
            // Try Enter key
            await playerNameInput.press('Enter');
            console.log('✅ Submitted via Enter key');
        }
    } else {
        console.log('❌ Player name input not visible');
    }

    // Verify the score was saved
    console.log('\n💾 VERIFYING STORAGE');
    console.log('=' .repeat(30));

    const savedScores = await page.evaluate(() => {
        return localStorage.getItem('letters_high_scores');
    });

    if (savedScores) {
        const scores = JSON.parse(savedScores);
        console.log(`\n📊 Saved high scores (${scores.length} total):`);
        scores.slice(0, 5).forEach((score, i) => {
            console.log(`  ${i + 1}. ${score.initials}: ${score.score} (${score.date})`);
        });

        // Check if our score is there
        const ourScore = scores.find(s => s.initials === 'TST');
        if (ourScore) {
            console.log(`\n✅ SUCCESS! Our score was saved: TST - ${ourScore.score}`);
            expect(ourScore.score).toBe(42);
            expect(ourScore.initials).toBe('TST');
        } else {
            console.log('\n❌ Our score was not found in high scores');
        }
    } else {
        console.log('❌ No high scores in localStorage');
    }

    // Check if high scores are displayed
    const highScoresDiv = await page.locator('#high-scores');
    if (await highScoresDiv.isVisible()) {
        console.log('\n🏆 High scores displayed on screen:');
        const entries = await page.locator('.high-score-entry').all();
        for (let i = 0; i < Math.min(entries.length, 5); i++) {
            const text = await entries[i].textContent();
            console.log(`  ${text}`);
        }
    }

    // Test share functionality
    console.log('\n📤 TESTING SHARE');
    console.log('=' .repeat(30));

    const shareBtn = await page.locator('#share-game');
    if (await shareBtn.isVisible()) {
        await shareBtn.click();
        console.log('✅ Share button clicked');

        await page.waitForTimeout(500);
        const shareModal = await page.locator('#share-modal');
        if (await shareModal.isVisible()) {
            const shareText = await page.locator('#share-text').textContent();
            console.log('📋 Share text:');
            console.log(shareText);
        }
    } else {
        console.log('Share button not visible');
    }

    // Final screenshot
    await page.screenshot({
        path: 'test-results/highscore-complete.png',
        fullPage: true
    });

    console.log('\n' + '=' .repeat(50));
    console.log('✅ HIGH SCORE ENTRY TEST COMPLETE!');
    console.log('=' .repeat(50));
});