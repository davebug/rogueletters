const { test, expect } = require('@playwright/test');

test('debug mode parameter detection', async ({ page }) => {
    console.log('\n🐛 Testing debug mode parameter detection\n');

    // Navigate with debug mode enabled
    await page.goto('http://localhost:8085?debug=1');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Check if URL parameter is detected
    const debugDetected = await page.evaluate(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('debug');
    });
    console.log(`URL debug parameter: ${debugDetected}`);
    expect(debugDetected).toBe('1');

    // Check if debug controls element exists
    const debugControlsExists = await page.evaluate(() => {
        return document.getElementById('debug-controls') !== null;
    });
    console.log(`Debug controls element exists: ${debugControlsExists}`);
    expect(debugControlsExists).toBe(true);

    // Check current display style
    const displayStyle = await page.evaluate(() => {
        const el = document.getElementById('debug-controls');
        return el ? el.style.display : 'not found';
    });
    console.log(`Debug controls display style: ${displayStyle}`);

    // Check if our JavaScript ran
    const gameStateDebugMode = await page.evaluate(() => {
        return window.gameState ? window.gameState.debugMode : 'gameState not found';
    });
    console.log(`gameState.debugMode: ${gameStateDebugMode}`);

    // Try to manually show the debug controls
    await page.evaluate(() => {
        const el = document.getElementById('debug-controls');
        if (el) {
            el.style.display = 'block';
        }
    });

    // Verify it's now visible
    const debugControls = await page.locator('#debug-controls');
    const isVisible = await debugControls.isVisible();
    console.log(`Debug controls visible after manual show: ${isVisible}`);
    expect(isVisible).toBe(true);

    // Enable debug mode
    const debugToggle = await page.locator('#debug-mode-toggle');
    await debugToggle.check();

    // Verify debug mode is enabled
    const debugEnabled = await page.evaluate(() => {
        return window.gameState.debugMode;
    });
    console.log(`Debug mode enabled: ${debugEnabled}`);
    expect(debugEnabled).toBe(true);
});