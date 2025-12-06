const { test, expect } = require('@playwright/test');

test('wikipedia context block is hidden', async ({ page }) => {
    console.log('\n🔍 TESTING WIKIPEDIA CONTEXT VISIBILITY\n');

    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Check if wikipedia-context element exists but is hidden
    const wikiContext = await page.locator('#wikipedia-context');
    const exists = await wikiContext.count() > 0;
    console.log(`Wikipedia context element exists in DOM: ${exists ? '✅' : '❌'}`);

    if (exists) {
        // Check if it's hidden
        const isVisible = await wikiContext.isVisible();
        console.log(`Wikipedia context is visible: ${isVisible ? '❌ FAIL - Should be hidden!' : '✅ Correctly hidden'}`);
        expect(isVisible).toBe(false);

        // Check the style attribute
        const styleAttr = await wikiContext.getAttribute('style');
        console.log(`Style attribute: "${styleAttr}"`);
        expect(styleAttr).toContain('display: none');

        // Check computed styles
        const display = await wikiContext.evaluate(el =>
            window.getComputedStyle(el).display
        );
        console.log(`Computed display value: "${display}"`);
        expect(display).toBe('none');

        // Verify child elements also exist but are hidden
        const wikiText = await page.locator('#wiki-text');
        const wikiLink = await page.locator('#wiki-link');

        const textExists = await wikiText.count() > 0;
        const linkExists = await wikiLink.count() > 0;

        console.log(`\nChild elements:`);
        console.log(`  wiki-text exists: ${textExists ? '✅' : '❌'}`);
        console.log(`  wiki-link exists: ${linkExists ? '✅' : '❌'}`);

        if (textExists) {
            const textVisible = await wikiText.isVisible();
            console.log(`  wiki-text visible: ${textVisible ? '❌' : '✅ hidden'}`);
            expect(textVisible).toBe(false);
        }

        if (linkExists) {
            const linkVisible = await wikiLink.isVisible();
            console.log(`  wiki-link visible: ${linkVisible ? '❌' : '✅ hidden'}`);
            expect(linkVisible).toBe(false);
        }
    }

    // Take a screenshot to visually confirm
    await page.screenshot({
        path: 'test-results/wikipedia-context-hidden.png',
        clip: { x: 0, y: 100, width: 1280, height: 200 }
    });
    console.log('\n📸 Screenshot saved to test-results/wikipedia-context-hidden.png');
    console.log('   (Should show game area without any Wikipedia quote)');
});