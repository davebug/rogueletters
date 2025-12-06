const { test, expect } = require('@playwright/test');

test('compare WikiLetters and WikiDates headers pixel-by-pixel', async ({ page }) => {
    console.log('\n📸 COMPARING HEADERS PIXEL-BY-PIXEL\n');

    // Take screenshot of WikiLetters header
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForTimeout(500); // Let fonts load

    const lettersHeader = await page.locator('header').screenshot();
    console.log('✅ Captured WikiLetters header');

    // Take screenshot of WikiDates header
    await page.goto('http://localhost:8083');
    await page.waitForSelector('#loading', { state: 'hidden' });
    await page.waitForTimeout(500); // Let fonts load

    const datesHeader = await page.locator('header').screenshot();
    console.log('✅ Captured WikiDates header');

    // Get header dimensions
    const lettersBox = await page.goto('http://localhost:8085').then(async () => {
        await page.waitForSelector('#loading-overlay', { state: 'hidden' });
        return await page.locator('header').boundingBox();
    });

    const datesBox = await page.goto('http://localhost:8083').then(async () => {
        await page.waitForSelector('#loading', { state: 'hidden' });
        return await page.locator('header').boundingBox();
    });

    console.log('\n📏 Header dimensions:');
    console.log(`  WikiLetters: ${lettersBox.width}x${lettersBox.height}`);
    console.log(`  WikiDates: ${datesBox.width}x${datesBox.height}`);

    // Check if dimensions match
    if (lettersBox.height !== datesBox.height) {
        console.log(`\n❌ Height mismatch: WikiLetters=${lettersBox.height}px, WikiDates=${datesBox.height}px`);
    }

    // Save screenshots for visual comparison
    const fs = require('fs');
    fs.writeFileSync('test-results/letters-header.png', lettersHeader);
    fs.writeFileSync('test-results/dates-header.png', datesHeader);
    console.log('\n💾 Screenshots saved to test-results/ for inspection');

    // Use Playwright's visual comparison
    try {
        expect(lettersHeader).toMatchSnapshot('dates-header.png', { maxDiffPixels: 0 });
        console.log('\n✅ Headers are pixel-perfect identical!');
    } catch (e) {
        // If they don't match, get more details
        console.log('\n❌ Headers are NOT identical');

        // Try with some tolerance
        try {
            expect(lettersHeader).toMatchSnapshot('dates-header.png', { maxDiffPixels: 100 });
            console.log('   But they are very close (within 100 pixels difference)');
        } catch (e2) {
            console.log('   Significant visual differences detected');
        }

        // Compare specific elements
        await page.goto('http://localhost:8085');
        await page.waitForSelector('#loading-overlay', { state: 'hidden' });
        const lettersTitle = await page.locator('h1').boundingBox();
        const lettersDate = await page.locator('#dateDisplay').boundingBox();

        await page.goto('http://localhost:8083');
        await page.waitForSelector('#loading', { state: 'hidden' });
        const datesTitle = await page.locator('h1').boundingBox();
        const datesDate = await page.locator('#dateDisplay').boundingBox();

        console.log('\n📍 Element positions:');
        console.log('  h1 (WikiLetters):', `x=${lettersTitle.x}, y=${lettersTitle.y}`);
        console.log('  h1 (WikiDates):  ', `x=${datesTitle.x}, y=${datesTitle.y}`);
        console.log('  #dateDisplay (WikiLetters):', `x=${lettersDate.x}, y=${lettersDate.y}`);
        console.log('  #dateDisplay (WikiDates):  ', `x=${datesDate.x}, y=${datesDate.y}`);

        if (Math.abs(lettersTitle.y - datesTitle.y) > 1) {
            console.log(`\n  ⚠️ Title vertical position differs by ${Math.abs(lettersTitle.y - datesTitle.y)}px`);
        }
        if (Math.abs(lettersDate.y - datesDate.y) > 1) {
            console.log(`  ⚠️ Date vertical position differs by ${Math.abs(lettersDate.y - datesDate.y)}px`);
        }
    }
});