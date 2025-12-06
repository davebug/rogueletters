const { test, expect } = require('@playwright/test');

test('footer is visible and matches WikiDates structure', async ({ page }) => {
    console.log('\n🦶 TESTING FOOTER VISIBILITY\n');

    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Check if footer exists and is visible
    const footer = await page.locator('footer');
    const isVisible = await footer.isVisible();
    console.log(`Footer visible: ${isVisible ? '✅' : '❌'}`);
    expect(isVisible).toBe(true);

    // Check footer position
    const footerBox = await footer.boundingBox();
    console.log(`\nFooter position:`);
    console.log(`  x: ${footerBox.x}, y: ${footerBox.y}`);
    console.log(`  width: ${footerBox.width}, height: ${footerBox.height}`);

    // Check feedback elements
    const feedbackFooter = await page.locator('#feedbackFooter').isVisible();
    console.log(`\nFeedbackFooter visible: ${feedbackFooter ? '✅' : '❌'}`);

    const feedbackSquares = await page.locator('.feedback-square').count();
    console.log(`Feedback squares count: ${feedbackSquares} (should be 8)`);
    expect(feedbackSquares).toBe(8);

    // Check share icon
    const shareIcon = await page.locator('#shareIcon');
    const shareIconExists = await shareIcon.count() > 0;
    console.log(`ShareIcon exists: ${shareIconExists ? '✅' : '❌'}`);

    // Check copyright text
    const copyrightText = await page.locator('footer p').textContent();
    console.log(`\nCopyright text: "${copyrightText}"`);
    expect(copyrightText).toContain('WikiLetters');

    // Take a screenshot
    await page.screenshot({ path: 'test-results/footer-visible.png', fullPage: true });
    console.log('\n📸 Full page screenshot saved to test-results/footer-visible.png');

    // Scroll to bottom to ensure footer is visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const footerScreenshot = await footer.screenshot();
    const fs = require('fs');
    fs.writeFileSync('test-results/footer-only.png', footerScreenshot);
    console.log('📸 Footer screenshot saved to test-results/footer-only.png');
});