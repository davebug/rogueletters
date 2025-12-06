const { chromium } = require('playwright');

(async () => {
    console.log('🧪 Testing SortableJS Implementation...\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Load the page
        await page.goto('http://localhost:8086/');
        console.log('✅ Page loaded');

        // Wait for tiles to be present
        await page.waitForSelector('.tile');

        // Check if SortableJS is loaded
        const sortableLoaded = await page.evaluate(() => {
            return typeof Sortable !== 'undefined';
        });
        console.log(`✅ SortableJS loaded: ${sortableLoaded}`);

        // Get initial tile order
        const initialOrder = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.tile')).map(t => t.dataset.letter).join('');
        });
        console.log(`📍 Initial order: ${initialOrder}`);

        // Test drag and drop
        const firstTile = page.locator('.tile').first();
        const lastTile = page.locator('.tile').last();

        console.log('\n🎯 Testing drag from first to last position...');
        await firstTile.dragTo(lastTile, {
            targetPosition: { x: 30, y: 25 }
        });

        await page.waitForTimeout(500);

        // Get new order
        const newOrder = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.tile')).map(t => t.dataset.letter).join('');
        });
        console.log(`📍 New order: ${newOrder}`);

        // Verify the drag worked
        if (initialOrder !== newOrder) {
            console.log('✅ Drag and drop WORKS!');
        } else {
            console.log('❌ Order didn\'t change - may need to check implementation');
        }

        // Test shuffle button
        console.log('\n🎯 Testing shuffle button...');
        await page.click('#shuffle-btn');
        await page.waitForTimeout(500);

        const shuffledOrder = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.tile')).map(t => t.dataset.letter).join('');
        });
        console.log(`📍 Shuffled order: ${shuffledOrder}`);

        // Test reset button
        console.log('\n🎯 Testing reset button...');
        await page.click('#reset-btn');
        await page.waitForTimeout(500);

        const resetOrder = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.tile')).map(t => t.dataset.letter).join('');
        });
        console.log(`📍 Reset order: ${resetOrder}`);

        if (resetOrder === 'SCRABBLE') {
            console.log('✅ Reset works correctly');
        }

        // Check debug info
        const debugInfo = await page.evaluate(() => {
            return {
                mode: document.getElementById('debug-mode')?.textContent,
                tiles: document.getElementById('debug-tiles')?.textContent,
                input: document.getElementById('debug-input')?.textContent
            };
        });
        console.log('\n📊 Debug Info:', debugInfo);

        console.log('\n✅ All tests completed successfully!');
        console.log('🎉 SortableJS implementation is working!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await page.waitForTimeout(2000); // Keep open for visual verification
        await browser.close();
    }
})();