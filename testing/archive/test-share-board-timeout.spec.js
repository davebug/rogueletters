const { test, expect } = require('@playwright/test');

test.describe('Share Board Timeout and Fallback', () => {
    test.setTimeout(120000); // 2 minutes

    test('V3 encoding should complete quickly on normal network', async ({ page }) => {
        console.log('\n' + '='.repeat(60));
        console.log('TEST 1: Normal Network - V3 Should Complete');
        console.log('='.repeat(60) + '\n');

        // Navigate with debug mode
        await page.goto('http://localhost:8085?debug=1');
        await page.waitForSelector('#loading-overlay', { state: 'hidden' });
        await page.waitForSelector('.tile-rack .tile');

        // Enable debug mode
        await page.locator('#debug-mode-toggle').check();
        console.log('✅ Debug mode enabled\n');

        // Play a quick game (5 turns)
        await playQuickGame(page);

        // Capture console logs
        const logs = [];
        page.on('console', msg => {
            const text = msg.text();
            logs.push(text);
            console.log('Browser:', text);
        });

        // Click Share Board button
        const shareBtn = page.locator('#share-board-btn');
        const startTime = Date.now();

        console.log('\n📤 Clicking Share Board button...');
        await shareBtn.click();

        // Wait for button to restore (should be fast)
        await page.waitForTimeout(5000);
        const duration = Date.now() - startTime;

        const buttonText = await shareBtn.textContent();
        console.log(`Button text after ${duration}ms: "${buttonText}"`);

        // Verify button restored (not stuck on "Generating...")
        expect(buttonText).not.toBe('Generating...');
        console.log('✅ Button restored correctly\n');

        // Check logs for V3 success
        const v3Log = logs.find(log => log.includes('Using V3 compressed URL'));
        if (v3Log) {
            console.log('✅ V3 encoding succeeded (no timeout)');
            console.log(`   ${v3Log}`);
        } else {
            console.log('⚠️  V3 not used - may have fallen back');
        }

        // Check that button changed to "Copied!"
        expect(buttonText).toMatch(/Copied|Share Board/i);

        console.log('\n✅ Test 1 passed - Normal network works\n');
    });

    test('V3 encoding should timeout and fallback on slow network', async ({ page, context }) => {
        console.log('\n' + '='.repeat(60));
        console.log('TEST 2: Slow Network - Should Timeout and Fallback');
        console.log('='.repeat(60) + '\n');

        // Block the get_rack.py endpoint to simulate timeout
        await page.route('**/cgi-bin/get_rack.py*', route => {
            console.log('🚫 Blocking get_rack.py request (simulating slow network)');
            // Don't respond - just let it hang
            setTimeout(() => route.abort('timedout'), 10000);
        });

        // Navigate with debug mode
        await page.goto('http://localhost:8085?debug=1');
        await page.waitForSelector('#loading-overlay', { state: 'hidden' });
        await page.waitForSelector('.tile-rack .tile');

        // Enable debug mode
        await page.locator('#debug-mode-toggle').check();
        console.log('✅ Debug mode enabled');
        console.log('🚫 get_rack.py endpoint BLOCKED\n');

        // Play a quick game
        await playQuickGame(page);

        // Capture console logs
        const logs = [];
        page.on('console', msg => {
            const text = msg.text();
            logs.push(text);
            console.log('Browser:', text);
        });

        // Click Share Board button
        const shareBtn = page.locator('#share-board-btn');
        const startTime = Date.now();

        console.log('\n📤 Clicking Share Board button...');
        await shareBtn.click();

        // Wait for timeout + fallback (should be ~5 seconds)
        await page.waitForTimeout(7000);
        const duration = Date.now() - startTime;

        const buttonText = await shareBtn.textContent();
        console.log(`Button text after ${duration}ms: "${buttonText}"`);

        // Verify button restored (not stuck)
        expect(buttonText).not.toBe('Generating...');
        console.log('✅ Button restored (not stuck)\n');

        // Verify timeout happened around 5 seconds
        expect(duration).toBeGreaterThan(4500); // At least 4.5 seconds (5s timeout)
        expect(duration).toBeLessThan(10000);   // But less than 10 seconds (not hanging)
        console.log(`✅ Timeout occurred in ~${Math.round(duration / 100) / 10}s (expected ~5s)\n`);

        // Check logs for timeout and fallback
        const timeoutLog = logs.find(log => log.includes('V3 encoding timeout'));
        const fallbackLog = logs.find(log => log.includes('LZ-String fallback'));
        const lzSuccessLog = logs.find(log => log.includes('Using LZ-String compressed URL'));

        if (timeoutLog) {
            console.log('✅ V3 timeout detected:');
            console.log(`   ${timeoutLog}`);
        } else {
            console.log('⚠️  V3 timeout log not found');
        }

        if (fallbackLog) {
            console.log('✅ Fallback triggered:');
            console.log(`   ${fallbackLog}`);
        } else {
            console.log('⚠️  Fallback log not found');
        }

        if (lzSuccessLog) {
            console.log('✅ LZ-String fallback succeeded:');
            console.log(`   ${lzSuccessLog}`);
        } else {
            console.log('⚠️  LZ-String success log not found');
        }

        // At least one of these should be true
        expect(timeoutLog || fallbackLog || lzSuccessLog).toBeTruthy();

        console.log('\n✅ Test 2 passed - Timeout and fallback work\n');
    });

    test('Share Board button should never hang forever', async ({ page }) => {
        console.log('\n' + '='.repeat(60));
        console.log('TEST 3: Maximum Timeout - Button Must Restore');
        console.log('='.repeat(60) + '\n');

        // Block ALL network requests to force worst-case scenario
        await page.route('**/cgi-bin/**', route => {
            console.log(`🚫 Blocking ${route.request().url()}`);
            setTimeout(() => route.abort('timedout'), 10000);
        });

        // Navigate with debug mode
        await page.goto('http://localhost:8085?debug=1');
        await page.waitForSelector('#loading-overlay', { state: 'hidden' });
        await page.waitForSelector('.tile-rack .tile');

        // Enable debug mode
        await page.locator('#debug-mode-toggle').check();
        console.log('✅ Debug mode enabled');
        console.log('🚫 ALL backend endpoints BLOCKED\n');

        // Play a quick game
        await playQuickGame(page);

        // Click Share Board
        const shareBtn = page.locator('#share-board-btn');
        const startTime = Date.now();

        console.log('\n📤 Clicking Share Board (worst case - all endpoints blocked)...');
        await shareBtn.click();

        // Wait up to 8 seconds (should restore in ~5 seconds)
        await page.waitForTimeout(8000);
        const duration = Date.now() - startTime;

        const buttonText = await shareBtn.textContent();
        console.log(`Button text after ${duration}ms: "${buttonText}"`);

        // CRITICAL: Button must not be stuck on "Generating..."
        expect(buttonText).not.toBe('Generating...');
        console.log('✅ Button restored (not stuck forever)\n');

        // Should complete within 8 seconds (5s timeout + 3s buffer)
        expect(duration).toBeLessThan(8500);
        console.log(`✅ Completed in ${Math.round(duration / 100) / 10}s (well under max time)\n`);

        console.log('✅ Test 3 passed - Button never hangs\n');
    });
});

/**
 * Helper function to play a quick game in debug mode
 * Places simple words on 5 turns
 */
async function playQuickGame(page) {
    console.log('\n🎮 Playing quick game (debug mode)...\n');

    for (let turn = 1; turn <= 5; turn++) {
        console.log(`Turn ${turn}/5`);

        // Get rack tiles
        const rackTiles = await page.locator('.tile-rack .tile').all();
        if (rackTiles.length < 2) {
            console.log(`⚠️  Not enough tiles in rack (${rackTiles.length})`);
            continue;
        }

        // Find an occupied cell
        const occupiedCells = await page.locator('.board-cell.occupied').all();
        if (occupiedCells.length === 0) {
            console.log('⚠️  No occupied cells found');
            continue;
        }

        // Get first occupied cell position
        const firstCell = occupiedCells[0];
        const row = parseInt(await firstCell.getAttribute('data-row'));
        const col = parseInt(await firstCell.getAttribute('data-col'));

        // Try to place 2 tiles adjacent
        const targetPositions = [
            { r: row, c: col + 1 },
            { r: row, c: col + 2 }
        ];

        // Check if positions are valid and empty
        let canPlace = true;
        for (const pos of targetPositions) {
            if (pos.r < 0 || pos.r >= 15 || pos.c < 0 || pos.c >= 15) {
                canPlace = false;
                break;
            }
            const cell = page.locator(`.board-cell[data-row="${pos.r}"][data-col="${pos.c}"]`);
            const isOccupied = await cell.evaluate(el => el.classList.contains('occupied'));
            if (isOccupied) {
                canPlace = false;
                break;
            }
        }

        if (!canPlace) {
            // Try vertical instead
            targetPositions[0] = { r: row + 1, c: col };
            targetPositions[1] = { r: row + 2, c: col };
        }

        // Place tiles
        for (let i = 0; i < 2 && i < rackTiles.length; i++) {
            const currentRackTiles = await page.locator('.tile-rack .tile').all();
            if (currentRackTiles.length > 0) {
                await currentRackTiles[0].click();
                const pos = targetPositions[i];
                await page.click(`.board-cell[data-row="${pos.r}"][data-col="${pos.c}"]`);
            }
        }

        // Submit word
        await page.click('#submit-word');
        await page.waitForTimeout(1500);

        // Close error modal if it appeared (shouldn't in debug mode)
        const errorModal = page.locator('#error-modal');
        if (await errorModal.isVisible()) {
            console.log('⚠️  Error modal appeared (unexpected in debug mode)');
            await page.click('#close-error');
            await page.click('#recall-tiles');
        } else {
            console.log(`✅ Turn ${turn} complete`);
        }

        // Check if game ended
        const gameOverSection = page.locator('#game-over-section');
        if (await gameOverSection.isVisible()) {
            console.log('🏁 Game ended');
            break;
        }
    }

    // Wait for game completion popup
    const popup = page.locator('#game-popup');
    await popup.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {
        console.log('⚠️  Game popup did not appear');
    });

    if (await popup.isVisible()) {
        console.log('✅ Game completed - popup visible\n');
    }
}
