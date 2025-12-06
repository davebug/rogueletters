const { test, expect } = require('@playwright/test');

test('footer shows 5 turn squares with scoring system', async ({ page }) => {
    console.log('\n🎯 TESTING FOOTER SCORING SQUARES\n');

    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Check if we have exactly 5 squares
    const squares = await page.locator('.feedback-square').count();
    console.log(`Feedback squares count: ${squares} (should be 5)`);
    expect(squares).toBe(5);

    // Check first square has red outline (current turn)
    const firstSquare = await page.locator('.feedback-square.turn-1');
    const hasCurrentClass = await firstSquare.evaluate(el => el.classList.contains('current-turn'));
    console.log(`First square has current-turn class: ${hasCurrentClass ? '✅' : '❌'}`);
    expect(hasCurrentClass).toBe(true);

    // Check first square border color
    const borderColor = await firstSquare.evaluate(el =>
        window.getComputedStyle(el).borderColor
    );
    console.log(`First square border color: ${borderColor}`);
    expect(borderColor).toContain('231'); // RGB for red

    // Check total score display
    const totalScoreDisplay = await page.locator('.total-score-display');
    const totalScoreVisible = await totalScoreDisplay.isVisible();
    console.log(`Total score display visible: ${totalScoreVisible ? '✅' : '❌'}`);
    expect(totalScoreVisible).toBe(true);

    const scoreValue = await page.locator('.total-score-display .score-value');
    const initialScore = await scoreValue.textContent();
    console.log(`Initial score value: "${initialScore}"`);
    expect(initialScore).toBe('0');

    // Take screenshot
    await page.screenshot({ path: 'test-results/footer-scoring-system.png', fullPage: false });
    console.log('\n📸 Screenshot saved to test-results/footer-scoring-system.png');
});

test('footer squares update when turns complete', async ({ page }) => {
    console.log('\n🎯 TESTING SQUARE UPDATES ON TURN COMPLETION\n');

    await page.goto('http://localhost:8085?debug=1');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Simulate completing a turn with score
    await page.evaluate(() => {
        // Simulate turn 1 completion with score 25
        window.gameState.turnScores = [25];
        window.gameState.score = 25;
        window.gameState.currentTurn = 2;
        window.updateFooterSquares();
    });

    await page.waitForTimeout(500);

    // Check first square now shows score
    const firstSquare = await page.locator('.feedback-square.turn-1');
    const firstSquareText = await firstSquare.textContent();
    console.log(`First square text after turn 1: "${firstSquareText}"`);
    expect(firstSquareText).toBe('25');

    // Check first square has completed class
    const hasCompletedClass = await firstSquare.evaluate(el => el.classList.contains('completed'));
    console.log(`First square has completed class: ${hasCompletedClass ? '✅' : '❌'}`);
    expect(hasCompletedClass).toBe(true);

    // Check second square now has current-turn class
    const secondSquare = await page.locator('.feedback-square.turn-2');
    const secondHasCurrent = await secondSquare.evaluate(el => el.classList.contains('current-turn'));
    console.log(`Second square has current-turn class: ${secondHasCurrent ? '✅' : '❌'}`);
    expect(secondHasCurrent).toBe(true);

    // Check total score updated
    const scoreValue = await page.locator('.total-score-display .score-value');
    const totalScore = await scoreValue.textContent();
    console.log(`Total score after turn 1: "${totalScore}"`);
    expect(totalScore).toBe('25');

    // Simulate completing turn 2
    await page.evaluate(() => {
        window.gameState.turnScores = [25, 30];
        window.gameState.score = 55;
        window.gameState.currentTurn = 3;
        window.updateFooterSquares();
    });

    await page.waitForTimeout(500);

    // Check both squares show scores
    const secondSquareText = await secondSquare.textContent();
    console.log(`Second square text after turn 2: "${secondSquareText}"`);
    expect(secondSquareText).toBe('30');

    const updatedTotal = await scoreValue.textContent();
    console.log(`Total score after turn 2: "${updatedTotal}"`);
    expect(updatedTotal).toBe('55');

    // Take screenshot
    await page.screenshot({ path: 'test-results/footer-scoring-progress.png', fullPage: false });
    console.log('\n📸 Screenshot saved to test-results/footer-scoring-progress.png');
});