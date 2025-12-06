const { test, expect } = require('@playwright/test');

test('compare WikiLetters and WikiDates headers', async ({ page }) => {
    // Capture WikiLetters
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('#game-board', { timeout: 10000 });

    await page.screenshot({
        path: 'test-results/wikiletters-current.png',
        fullPage: true
    });
    console.log('✓ Captured WikiLetters');

    // Capture WikiDates
    await page.goto('https://dates.wiki');
    await page.waitForTimeout(2000); // Give WikiDates time to load

    await page.screenshot({
        path: 'test-results/wikidates-current.png',
        fullPage: true
    });
    console.log('✓ Captured WikiDates');
});