// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Debug Validation', () => {
  test('check validation flow', async ({ page }) => {
    // Listen for console messages and network
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', err => console.log('Page error:', err.message));

    // Monitor validation API calls
    page.on('response', response => {
      if (response.url().includes('validate_word.py')) {
        console.log('Validation response:', response.status());
        response.json().then(data => {
          console.log('Validation data:', JSON.stringify(data, null, 2));
        }).catch(() => {
          console.log('Response not JSON');
        });
      }
    });

    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForTimeout(1500);

    // Try disconnected placement
    console.log('Placing first tile...');
    await page.locator('#tile-rack .tile').first().click();
    await page.locator('[data-row="2"][data-col="2"]').click();

    console.log('Placing second tile...');
    await page.locator('#tile-rack .tile').first().click();
    await page.locator('[data-row="2"][data-col="3"]').click();

    // Check submit button state
    const submitEnabled = await page.locator('#submit-word').isEnabled();
    console.log('Submit button enabled:', submitEnabled);

    // Submit word
    console.log('Clicking submit...');
    await page.click('#submit-word');

    // Wait a bit for response
    await page.waitForTimeout(1000);

    // Check error modal visibility
    const modalVisible = await page.locator('#error-modal').isVisible();
    console.log('Error modal visible:', modalVisible);

    // Check modal style
    const modalStyle = await page.locator('#error-modal').getAttribute('style');
    console.log('Modal style:', modalStyle);

    // Check error message
    const errorMsg = await page.locator('#error-message').textContent();
    console.log('Error message:', errorMsg);
  });
});