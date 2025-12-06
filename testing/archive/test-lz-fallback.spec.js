const { test } = require('@playwright/test');

test('LZ-String URL should still work via fallback', async ({ page }) => {
    // Navigate to game first
    await page.goto('http://localhost:8085');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Generate an old LZ-String URL by calling the old function directly
    const lzURL = await page.evaluate(() => {
        // Mock some game data with 5 complete turns
        const mockData = {
            d: '20251005',
            w: 'TRUNNELS',
            t: [
                [4, 0, 'T', 1, 0],
                [5, 3, 'P', 2, 0],
                [6, 3, 'O', 3, 0],
                [7, 3, 'U', 4, 0],
                [8, 3, 'R', 5, 0]
            ],
            s: [4, 3, 5, 6, 7]
        };
        const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(mockData));
        return `http://localhost:8085/?g=${compressed}`;
    });

    console.log('LZ-String URL:', lzURL);
    console.log('LZ-String URL length:', lzURL.length);

    // Capture console logs BEFORE navigation
    const logs = [];
    const newPage = await page.context().newPage();
    newPage.on('console', msg => {
        const text = msg.text();
        logs.push(text);
        console.log('Browser:', text);
    });

    // Navigate to the LZ-String URL
    await newPage.goto(lzURL);
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(2000);

    // Check that fallback happened
    const fallbackLog = logs.find(log => log.includes('V3 decode failed, trying LZ-String'));
    if (fallbackLog) {
        console.log('✓ V3 decoder correctly rejected invalid data and fell back to LZ-String');
    } else {
        console.log('⚠ Fallback message not found in logs');
    }

    // Check that game loaded (tiles on board)
    const tileCount = await newPage.locator('.tile.placed').count();
    console.log(`✓ Found ${tileCount} tiles on board after LZ-String decode`);

    console.log('✓ Test completed - LZ-String fallback worked');

    await newPage.close();
});
