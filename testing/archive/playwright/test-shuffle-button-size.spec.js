const { test, expect } = require('@playwright/test');

test.describe('Shuffle Button Size Tests', () => {
    test('shuffle button matches Start Over button size on desktop', async ({ page }) => {
        await page.goto('http://localhost:8085');
        await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

        // Get shuffle button dimensions
        const shuffleBtn = page.locator('#shuffle-rack');
        const shuffleBox = await shuffleBtn.boundingBox();

        // Force Start Over button visible for comparison
        await page.evaluate(() => {
            const btn = document.getElementById('start-over');
            if (btn) btn.style.display = 'flex';
        });

        // Get Start Over button dimensions
        const startOverBtn = page.locator('#start-over');
        const startOverBox = await startOverBtn.boundingBox();

        console.log('Desktop viewport:');
        console.log(`  Shuffle button: ${shuffleBox.width}x${shuffleBox.height}`);
        console.log(`  Start Over button: ${startOverBox.width}x${startOverBox.height}`);

        // Verify both are 22x22
        expect(Math.round(shuffleBox.width)).toBe(22);
        expect(Math.round(shuffleBox.height)).toBe(22);
        expect(Math.round(startOverBox.width)).toBe(22);
        expect(Math.round(startOverBox.height)).toBe(22);

        // Check stroke width matches
        const shuffleStroke = await shuffleBtn.locator('svg').getAttribute('stroke-width');
        const startOverStroke = await startOverBtn.locator('svg').getAttribute('stroke-width');

        expect(shuffleStroke).toBe('3');
        expect(startOverStroke).toBe('3');
        console.log(`  Both icons use stroke-width: 3 ✓`);
    });

    test('shuffle button maintains size on mobile', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('http://localhost:8085');
        await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

        // Get shuffle button dimensions on mobile
        const shuffleBtn = page.locator('#shuffle-rack');
        const shuffleBox = await shuffleBtn.boundingBox();

        // Force Start Over button visible
        await page.evaluate(() => {
            const btn = document.getElementById('start-over');
            if (btn) btn.style.display = 'flex';
        });

        const startOverBtn = page.locator('#start-over');
        const startOverBox = await startOverBtn.boundingBox();

        console.log('Mobile viewport (375x667):');
        console.log(`  Shuffle button: ${shuffleBox.width}x${shuffleBox.height}`);
        console.log(`  Start Over button: ${startOverBox.width}x${startOverBox.height}`);

        // Both should still be 22x22
        expect(Math.round(shuffleBox.width)).toBe(22);
        expect(Math.round(shuffleBox.height)).toBe(22);
        expect(Math.round(startOverBox.width)).toBe(22);
        expect(Math.round(startOverBox.height)).toBe(22);

        // Take screenshot for visual verification
        await page.screenshot({
            path: 'test-results/mobile-button-comparison.png',
            fullPage: false
        });
        console.log('📸 Mobile screenshot saved to test-results/mobile-button-comparison.png');
    });

    test('shuffle button visual appearance', async ({ page }) => {
        await page.goto('http://localhost:8085');
        await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

        const shuffleBtn = page.locator('#shuffle-rack');

        // Check computed styles
        const styles = await shuffleBtn.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
                width: computed.width,
                height: computed.height,
                borderRadius: computed.borderRadius,
                borderWidth: computed.borderWidth,
                borderColor: computed.borderColor
            };
        });

        console.log('Shuffle button computed styles:');
        console.log(`  Width: ${styles.width}`);
        console.log(`  Height: ${styles.height}`);
        console.log(`  Border radius: ${styles.borderRadius}`);
        console.log(`  Border: ${styles.borderWidth} ${styles.borderColor}`);

        expect(styles.width).toBe('22px');
        expect(styles.height).toBe('22px');
        expect(styles.borderRadius).toBe('50%');
    });
});