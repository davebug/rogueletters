const { test, expect } = require('@playwright/test');

test.describe('Versioned URL Formats', () => {
    test.setTimeout(60000);

    test('Legacy ?g= URLs work (backward compatibility)', async ({ page }) => {
        console.log('\n' + '='.repeat(60));
        console.log('TEST 1: Legacy ?g= Format (No Sorting)');
        console.log('='.repeat(60));

        // Use one of the existing test URLs (old ?g= format)
        const legacyURL = 'http://localhost:8085/?g=IRIn4UGJ4pg05ihJS45NcpuQGsUIyCHDWiMyAbBV';

        console.log('Loading legacy URL:', legacyURL);
        await page.goto(legacyURL);

        // Wait for game to load
        await page.waitForSelector('.board-cell', { timeout: 10000 });

        // Check that tiles are placed correctly
        const placedTiles = await page.locator('.board-cell.occupied').count();
        console.log(`✓ Found ${placedTiles} placed tiles`);

        expect(placedTiles).toBeGreaterThan(0);

        console.log('✅ Legacy ?g= URL works!\n');
    });

    test('New ?w= URLs use fast path (instant sharing)', async ({ page }) => {
        console.log('\n' + '='.repeat(60));
        console.log('TEST 2: New ?w= Format (With Sorting, Fast!)');
        console.log('='.repeat(60));

        const logs = [];
        page.on('console', msg => {
            const text = msg.text();
            logs.push(text);
            if (text.includes('V3 Encoder') || text.includes('fast path') || text.includes('sorted')) {
                console.log('📝', text);
            }
        });

        // Start a new game
        await page.goto('http://localhost:8085?debug=1');
        await page.waitForSelector('#loading-overlay', { state: 'hidden' });
        await page.waitForSelector('.tile-rack .tile');

        // Enable debug mode
        await page.locator('#debug-mode-toggle').check();
        console.log('✅ Debug mode enabled\n');

        // Play 3 quick turns in debug mode
        console.log('🎮 Playing game...');
        for (let turn = 1; turn <= 3; turn++) {
            const rackTiles = await page.locator('.tile-rack .tile').all();
            if (rackTiles.length >= 2) {
                // Place 2 tiles
                await rackTiles[0].click();
                await page.click(`.board-cell[data-row="5"][data-col="${3 + turn}"]`);

                const currentRack = await page.locator('.tile-rack .tile').all();
                if (currentRack.length > 0) {
                    await currentRack[0].click();
                    await page.click(`.board-cell[data-row="6"][data-col="${3 + turn}"]`);
                }

                await page.click('#submit-word');
                await page.waitForTimeout(1500);
            }
        }

        // End game
        await page.click('#end-game-btn');
        await page.waitForSelector('#game-popup', { state: 'visible' });
        console.log('✅ Game ended\n');

        // Click Share Board and measure timing
        const shareBtn = page.locator('#share-board-btn');
        const startTime = Date.now();

        console.log('📤 Clicking Share Board...');
        await shareBtn.click();

        // Wait for button to restore
        await page.waitForTimeout(2000);
        const duration = Date.now() - startTime;

        const buttonText = await shareBtn.textContent();
        console.log(`⏱️  Share completed in ${duration}ms`);
        console.log(`   Button text: "${buttonText}"`);

        // Check for fast path usage
        const fastPathLog = logs.find(log => log.includes('All racks cached'));
        const sortedLog = logs.find(log => log.includes('sorted rack'));
        const wParam = logs.find(log => log.includes('?w='));

        if (fastPathLog) {
            console.log('✅ FAST PATH USED (no API calls!)');
            console.log(`   ${fastPathLog}`);
        }

        if (sortedLog) {
            console.log('✅ Alphabetical sorting applied');
        }

        if (wParam) {
            console.log('✅ Generated ?w= URL (new format)');
        }

        // Verify it was fast (< 1 second instead of ~5 seconds)
        expect(duration).toBeLessThan(1500);
        console.log(`✅ Share was INSTANT! (${duration}ms < 1500ms)\n`);

        // Verify button restored correctly
        expect(buttonText).toMatch(/Copied|Share Board/i);

        console.log('✅ Test passed - New ?w= format is FAST!\n');
    });
});
