const { test, expect } = require('@playwright/test');

test.describe('Final Mobile Potential Words Test', () => {
  test('Check if mobile potential words shows with has-tiles class', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to site
    await page.goto('https://letters.wiki');
    await page.waitForTimeout(3000);

    // Check script and CSS versions
    const scriptSrc = await page.locator('script[src*="script.js"]').getAttribute('src');
    const cssSrc = await page.locator('link[rel="stylesheet"]').getAttribute('href');
    console.log('Script version:', scriptSrc);
    console.log('CSS version:', cssSrc);

    // Check initial state
    const mobilePotentialWords = page.locator('#mobile-potential-words');
    const initialClasses = await mobilePotentialWords.getAttribute('class');
    console.log('Initial classes:', initialClasses || 'none');

    // Place a tile
    const firstTile = page.locator('#tile-rack .tile').first();
    const centerCell = page.locator('.board-cell').nth(112);
    await firstTile.dragTo(centerCell);
    await page.waitForTimeout(1000);

    // Check classes after tile placement
    const classesAfter = await mobilePotentialWords.getAttribute('class');
    console.log('Classes after tile placement:', classesAfter || 'none');

    // Check if has-tiles class was added
    const hasHasTilesClass = classesAfter && classesAfter.includes('has-tiles');
    console.log('Has "has-tiles" class:', hasHasTilesClass);

    // Check computed style
    const computedDisplay = await mobilePotentialWords.evaluate(el => {
      return window.getComputedStyle(el).display;
    });
    console.log('Computed display style:', computedDisplay);

    // Check actual visibility
    const isVisible = await mobilePotentialWords.isVisible();
    console.log('Is visible:', isVisible);

    // Check content
    const potentialWordsContent = await page.locator('#mobile-potential-words-list').textContent();
    console.log('Potential words content:', potentialWordsContent ? potentialWordsContent.substring(0, 100) : 'empty');

    // Take screenshot
    await page.screenshot({
      path: 'final-mobile-test.png',
      fullPage: false
    });

    // Assert that the class should be added
    expect(hasHasTilesClass).toBe(true);
  });
});