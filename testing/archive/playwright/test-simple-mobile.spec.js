const { test, expect } = require('@playwright/test');

test.describe('Simple Mobile Test', () => {
  test('Check JavaScript version and mobile detection', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to site
    await page.goto('https://letters.wiki');
    await page.waitForTimeout(2000);

    // Check if script tag has version parameter
    const scriptSrc = await page.locator('script[src*="script.js"]').getAttribute('src');
    console.log('Script src:', scriptSrc);
    expect(scriptSrc).toContain('v=');

    // Check window.innerWidth
    const innerWidth = await page.evaluate(() => window.innerWidth);
    console.log('Window.innerWidth:', innerWidth);

    // Check if mobile potential words exists in DOM
    const mobileElement = page.locator('#mobile-potential-words');
    const exists = await mobileElement.count() > 0;
    console.log('Mobile potential words element exists:', exists);

    // Check computed style
    if (exists) {
      const display = await mobileElement.evaluate(el => {
        return window.getComputedStyle(el).display;
      });
      console.log('Mobile potential words display:', display);
    }

    // Try placing a tile and check again
    const firstTile = page.locator('#tile-rack .tile').first();
    const centerCell = page.locator('.board-cell').nth(112);
    await firstTile.dragTo(centerCell);
    await page.waitForTimeout(1000);

    // Check display after tile placement
    const displayAfter = await mobileElement.evaluate(el => {
      return window.getComputedStyle(el).display;
    });
    console.log('Display after tile placement:', displayAfter);

    // Check actual visibility
    const isVisible = await mobileElement.isVisible();
    console.log('Is visible:', isVisible);

    // Take screenshot
    await page.screenshot({ path: 'simple-mobile-test.png', fullPage: false });
  });
});