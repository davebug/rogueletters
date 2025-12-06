const { test, expect } = require('@playwright/test');

test('compare footer feedback squares positioning in both games', async ({ page }) => {
    console.log('\n🔍 COMPARING FOOTER SQUARES POSITIONING\n');

    // Test WikiLetters BEFORE playing
    console.log('=== WikiLetters (Before Playing) ===');
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    const lettersFooter = await page.locator('#feedbackFooter').boundingBox();
    const lettersRow = await page.locator('#feedbackRow').boundingBox();
    const lettersShareIcon = await page.locator('#shareIcon');
    const lettersShareIconVisible = await lettersShareIcon.isVisible();
    const lettersShareIconClass = await lettersShareIcon.getAttribute('class');

    console.log(`Footer width: ${lettersFooter.width}`);
    console.log(`FeedbackRow position: x=${lettersRow.x}, width=${lettersRow.width}`);
    console.log(`FeedbackRow distance from left edge: ${lettersRow.x}px`);
    console.log(`ShareIcon visible: ${lettersShareIconVisible}`);
    console.log(`ShareIcon classes: ${lettersShareIconClass}`);

    // Check first square color
    const lettersFirstSquare = await page.locator('.feedback-square').first();
    const lettersFirstSquareColor = await lettersFirstSquare.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
    );
    console.log(`First square color: ${lettersFirstSquareColor}`);

    // Test WikiDates BEFORE playing
    console.log('\n=== WikiDates (Before Playing) ===');
    await page.goto('http://localhost:8083');
    await page.waitForSelector('#loading', { state: 'hidden' });

    const datesFooter = await page.locator('#feedbackFooter').boundingBox();
    const datesRow = await page.locator('#feedbackRow').boundingBox();
    const datesShareIcon = await page.locator('#shareIcon');
    const datesShareIconVisible = await datesShareIcon.isVisible();
    const datesShareIconClass = await datesShareIcon.getAttribute('class');

    console.log(`Footer width: ${datesFooter.width}`);
    console.log(`FeedbackRow position: x=${datesRow.x}, width=${datesRow.width}`);
    console.log(`FeedbackRow distance from left edge: ${datesRow.x}px`);
    console.log(`ShareIcon visible: ${datesShareIconVisible}`);
    console.log(`ShareIcon classes: ${datesShareIconClass}`);

    // Check first square color
    const datesFirstSquare = await page.locator('.feedback-square').first();
    const datesFirstSquareColor = await datesFirstSquare.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
    );
    console.log(`First square color: ${datesFirstSquareColor}`);

    // Now simulate playing WikiDates to see if positioning changes
    console.log('\n=== WikiDates (After Playing - Simulated) ===');

    // Try to play a card to change game state
    await page.evaluate(() => {
        // Simulate game completion by adding classes
        const squares = document.querySelectorAll('.feedback-square');
        if (squares.length > 0) {
            squares[0].classList.add('correct');
            squares[1].classList.add('incorrect');
        }
        // Try to unhide shareIcon
        const shareIcon = document.getElementById('shareIcon');
        if (shareIcon) {
            shareIcon.classList.remove('hidden');
        }
    });

    await page.waitForTimeout(500);

    const datesRowAfter = await page.locator('#feedbackRow').boundingBox();
    const datesShareIconVisibleAfter = await datesShareIcon.isVisible();

    console.log(`FeedbackRow position after: x=${datesRowAfter.x}, width=${datesRowAfter.width}`);
    console.log(`FeedbackRow distance from left edge after: ${datesRowAfter.x}px`);
    console.log(`ShareIcon visible after: ${datesShareIconVisibleAfter}`);

    // Check updated square colors
    const datesFirstSquareAfter = await page.locator('.feedback-square').first();
    const datesFirstSquareColorAfter = await datesFirstSquareAfter.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
    );
    console.log(`First square color after: ${datesFirstSquareColorAfter}`);

    // Compare positioning
    console.log('\n=== COMPARISON ===');
    const lettersDiff = Math.abs(lettersRow.x - datesRow.x);
    console.log(`Position difference (before playing): ${lettersDiff}px`);

    if (lettersDiff < 5) {
        console.log('✅ Squares are in the same position in both games');
    } else {
        console.log(`⚠️ Squares differ by ${lettersDiff}px`);
    }

    // Take screenshots
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.screenshot({ path: 'test-results/letters-footer-before.png', clip: lettersFooter });

    await page.goto('http://localhost:8083');
    await page.waitForSelector('#loading', { state: 'hidden' });
    await page.screenshot({ path: 'test-results/dates-footer-before.png', clip: datesFooter });

    console.log('\n📸 Screenshots saved to test-results/');
});