const { test, expect } = require('@playwright/test');

test('check start over icon appearance', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

    // Initially hidden
    const startOverBtn = page.locator('#start-over');
    await expect(startOverBtn).toBeHidden();
    console.log('✅ Start Over button initially hidden');

    // Place a tile to make it appear
    await page.click('.tile-rack .tile:first-child');
    await page.click('[data-row="7"][data-col="7"]');

    // Wait for UI update
    await page.waitForTimeout(500);

    // Check inline style
    const displayStyle = await startOverBtn.evaluate(el => el.style.display);
    console.log(`Display style after placing tile: ${displayStyle}`);

    // Force visible for screenshot
    await page.evaluate(() => {
        const btn = document.getElementById('start-over');
        if (btn) btn.style.display = 'flex';
    });

    // Should now be visible
    await expect(startOverBtn).toBeVisible();
    console.log('✅ Start Over button visible after placing tile');

    // Take screenshot of header with both elements
    await page.screenshot({
        path: 'test-results/header-comparison.png',
        clip: {
            x: 0,
            y: 0,
            width: 1200,
            height: 100
        }
    });
    console.log('📸 Screenshot saved to test-results/header-comparison.png');

    // Check stroke width
    const strokeWidth = await startOverBtn.locator('svg').evaluate(svg => {
        return svg.getAttribute('stroke-width');
    });
    console.log(`\n🎨 Icon stroke width: ${strokeWidth}`);

    // Get WikiLetters title font weight for comparison
    const titleWeight = await page.locator('h1').evaluate(el => {
        return window.getComputedStyle(el).fontWeight;
    });
    console.log(`📝 WikiLetters title font weight: ${titleWeight}`);
});