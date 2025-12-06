const { test, expect } = require('@playwright/test');

test.describe('V3 URL Encoding/Decoding', () => {
    test('should load and decode V3 shared game URL', async ({ page }) => {
        const v3URL = 'http://localhost:8085/?g=INkHUWjI0qMFPKoZx1DioA';

        // Capture console logs
        const consoleLogs = [];
        page.on('console', msg => {
            const text = msg.text();
            consoleLogs.push(text);
            console.log('Browser console:', text);
        });

        // Navigate to V3 URL
        await page.goto(v3URL);

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Wait a bit for async decoding
        await page.waitForTimeout(2000);

        // Check that V3 decoder was called
        const v3DecoderLogs = consoleLogs.filter(log => log.includes('[V3 Decoder]'));
        expect(v3DecoderLogs.length).toBeGreaterThan(0);

        // Check that date was decoded
        const dateLogs = consoleLogs.filter(log => log.includes('Date decoded'));
        expect(dateLogs.length).toBeGreaterThan(0);
        console.log('✓ Date decoded successfully');

        // Check that tiles were decoded
        const tileLogs = consoleLogs.filter(log => log.includes('Tiles decoded'));
        expect(tileLogs.length).toBeGreaterThan(0);
        console.log('✓ Tiles decoded successfully');

        // Check that game loaded successfully
        const successLogs = consoleLogs.filter(log => log.includes('V3 shared game loaded successfully'));
        expect(successLogs.length).toBeGreaterThan(0);
        console.log('✓ V3 shared game loaded successfully');

        // Check that board has tiles
        const tiles = await page.locator('.tile.placed').count();
        expect(tiles).toBeGreaterThan(0);
        console.log(`✓ Found ${tiles} placed tiles on board`);

        // Check that board is visible
        const board = await page.locator('#game-board').isVisible();
        expect(board).toBe(true);
        console.log('✓ Game board is visible');

        // Take a screenshot
        await page.screenshot({ path: 'testing/v3-url-test.png', fullPage: true });
        console.log('✓ Screenshot saved to testing/v3-url-test.png');
    });

    test('should handle invalid V3 URL gracefully', async ({ page }) => {
        const invalidURL = 'http://localhost:8085/?g=INVALID';

        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push(msg.text());
        });

        await page.goto(invalidURL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Should see error logs
        const errorLogs = consoleLogs.filter(log =>
            log.includes('Failed to decode') ||
            log.includes('Invalid V3') ||
            log.includes('error')
        );

        console.log('Error handling test - found error logs:', errorLogs.length > 0 ? 'yes' : 'no');
    });
});
