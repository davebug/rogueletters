// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Seed and Date Behavior', () => {

  test('URL automatically includes today seed parameter', async ({ page }) => {
    console.log('\n=== Testing URL seed parameter ===\n');

    // Navigate without seed
    await page.goto('http://localhost:8085');
    await page.waitForTimeout(1000);

    // Check URL was updated with seed
    const url = page.url();
    console.log('Current URL:', url);

    // Should have seed parameter
    expect(url).toContain('?seed=');

    // Get today's date in YYYYMMDD format
    const today = new Date();
    const expectedSeed = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');

    console.log('Expected seed for today:', expectedSeed);
    expect(url).toContain(`seed=${expectedSeed}`);

    // Check date display matches
    const dateDisplay = await page.locator('#current-date').textContent();
    console.log('Date displayed in header:', dateDisplay);

    // For September 20, 2025
    if (expectedSeed === '20250920') {
      expect(dateDisplay).toContain('September 20, 2025');

      // Check starting word is KINGDOM (for this date)
      const startingWord = await page.evaluate(() => {
        const cells = [];
        for (let col = 4; col <= 10; col++) {
          const cell = document.querySelector(`[data-row="7"][data-col="${col}"] .tile-letter`);
          if (cell) cells.push(cell.textContent);
        }
        return cells.join('');
      });
      console.log('Starting word:', startingWord);
      expect(startingWord).toBe('KINGDOM');
    }
  });

  test('preserves explicit seed in URL', async ({ page }) => {
    console.log('\n=== Testing explicit seed preservation ===\n');

    // Navigate with specific seed
    await page.goto('http://localhost:8085?seed=20250101');
    await page.waitForTimeout(1000);

    // Check URL still has the same seed
    const url = page.url();
    console.log('URL with explicit seed:', url);
    expect(url).toContain('seed=20250101');

    // Check date display
    const dateDisplay = await page.locator('#current-date').textContent();
    console.log('Date display for seed 20250101:', dateDisplay);
    expect(dateDisplay).toContain('January 1, 2025');

    // Starting word should be different
    const startingWord = await page.evaluate(() => {
      const cells = [];
      for (let col = 3; col <= 11; col++) {
        const cell = document.querySelector(`[data-row="7"][data-col="${col}"] .tile-letter`);
        if (cell) cells.push(cell.textContent);
      }
      return cells.join('');
    });
    console.log('Starting word for Jan 1:', startingWord);
    expect(startingWord).not.toBe('KINGDOM');
  });

  test('back button behavior with seed', async ({ page }) => {
    console.log('\n=== Testing browser history ===\n');

    // Go to page without seed
    await page.goto('http://localhost:8085');
    await page.waitForTimeout(1000);

    const urlAfterRedirect = page.url();
    console.log('URL after auto-redirect:', urlAfterRedirect);

    // Navigate to a different seed
    await page.goto('http://localhost:8085?seed=20250101');
    await page.waitForTimeout(1000);

    // Go back
    await page.goBack();
    await page.waitForTimeout(1000);

    const urlAfterBack = page.url();
    console.log('URL after going back:', urlAfterBack);

    // Should be today's seed
    const today = new Date();
    const expectedSeed = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');

    expect(urlAfterBack).toContain(`seed=${expectedSeed}`);
  });
});