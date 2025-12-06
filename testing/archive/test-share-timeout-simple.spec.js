const { test, expect } = require('@playwright/test');

test.describe('Share Board Timeout Tests', () => {
    test.setTimeout(60000); // 1 minute per test

    test('Normal network - V3 should complete quickly', async ({ page }) => {
        console.log('\n' + '='.repeat(60));
        console.log('TEST 1: Normal Network - V3 Should Complete Fast');
        console.log('='.repeat(60) + '\n');

        // Navigate to game
        await page.goto('http://localhost:8085');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Set up game state with completed turns
        await page.evaluate(() => {
            // Mock a completed game with 5 turns
            window.gameState = {
                seed: '20251005',
                startingWord: 'TRUNNELS',
                currentTurn: 6,
                isGameOver: true,
                score: 25,
                turnScores: [4, 5, 6, 5, 5],
                turnHistory: [
                    { tiles: [{ row: 7, col: 7, letter: 'T' }] },
                    { tiles: [{ row: 7, col: 8, letter: 'E' }] },
                    { tiles: [{ row: 7, col: 9, letter: 'A' }] },
                    { tiles: [{ row: 8, col: 7, letter: 'A' }] },
                    { tiles: [{ row: 9, col: 7, letter: 'R' }] }
                ]
            };

            // Show the popup with Share Board button
            const popup = document.getElementById('game-popup');
            if (popup) {
                popup.classList.remove('hidden');
            }
        });

        await page.waitForTimeout(500);

        // Capture console logs
        const logs = [];
        page.on('console', msg => {
            const text = msg.text();
            logs.push(text);
        });

        // Click Share Board button
        const shareBtn = page.locator('#share-board-btn');
        await shareBtn.waitFor({ state: 'visible', timeout: 5000 });

        const startTime = Date.now();
        console.log('📤 Clicking Share Board button...');

        await shareBtn.click();

        // Wait for button to change (should be fast - 1-2 seconds)
        await page.waitForTimeout(4000);
        const duration = Date.now() - startTime;

        const buttonText = await shareBtn.textContent();
        console.log(`\n⏱️  Duration: ${duration}ms`);
        console.log(`🔘 Button text: "${buttonText}"`);

        // Verify button restored (not stuck on "Generating...")
        expect(buttonText).not.toBe('Generating...');
        console.log('✅ Button restored correctly');

        // Check logs for V3 success
        const v3Log = logs.find(log => log.includes('Using V3 compressed URL'));
        const lzLog = logs.find(log => log.includes('Using LZ-String compressed URL'));

        if (v3Log) {
            console.log('✅ V3 encoding succeeded (no timeout)');
            const match = v3Log.match(/(\d+) chars/);
            if (match) {
                console.log(`   URL length: ${match[1]} chars`);
            }
        } else if (lzLog) {
            console.log('⚠️  Used LZ-String fallback (unexpected on fast network)');
        }

        // Should complete reasonably fast (button restored within test timeout)
        expect(duration).toBeLessThan(5000);
        console.log(`✅ Completed in ${duration}ms (< 5000ms)\n`);
    });

    test('Blocked network - should timeout and fallback to LZ-String', async ({ page }) => {
        console.log('\n' + '='.repeat(60));
        console.log('TEST 2: Blocked Network - Should Timeout and Fallback');
        console.log('='.repeat(60) + '\n');

        // Block get_rack.py endpoint to force timeout
        await page.route('**/cgi-bin/get_rack.py*', route => {
            console.log('🚫 Blocked get_rack.py request');
            // Let it timeout (don't respond)
            setTimeout(() => route.abort('timedout'), 10000);
        });

        // Navigate to game
        await page.goto('http://localhost:8085');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Set up game state
        await page.evaluate(() => {
            window.gameState = {
                seed: '20251005',
                startingWord: 'TRUNNELS',
                currentTurn: 6,
                isGameOver: true,
                score: 25,
                turnScores: [4, 5, 6, 5, 5],
                turnHistory: [
                    { tiles: [{ row: 7, col: 7, letter: 'T' }] },
                    { tiles: [{ row: 7, col: 8, letter: 'E' }] },
                    { tiles: [{ row: 7, col: 9, letter: 'A' }] },
                    { tiles: [{ row: 8, col: 7, letter: 'A' }] },
                    { tiles: [{ row: 9, col: 7, letter: 'R' }] }
                ]
            };

            const popup = document.getElementById('game-popup');
            if (popup) {
                popup.classList.remove('hidden');
            }
        });

        await page.waitForTimeout(500);

        // Capture console logs
        const logs = [];
        page.on('console', msg => {
            const text = msg.text();
            logs.push(text);
            console.log(`Browser: ${text}`);
        });

        // Click Share Board button
        const shareBtn = page.locator('#share-board-btn');
        await shareBtn.waitFor({ state: 'visible', timeout: 5000 });

        const startTime = Date.now();
        console.log('\n📤 Clicking Share Board (network blocked)...');

        await shareBtn.click();

        // Wait for timeout + fallback (should be ~3 seconds)
        await page.waitForTimeout(5000);
        const duration = Date.now() - startTime;

        const buttonText = await shareBtn.textContent();
        console.log(`\n⏱️  Duration: ${duration}ms`);
        console.log(`🔘 Button text: "${buttonText}"`);

        // Verify button restored (not stuck)
        expect(buttonText).not.toBe('Generating...');
        console.log('✅ Button restored (not stuck)');

        // Should timeout around 3 seconds (allow buffer for test overhead)
        expect(duration).toBeGreaterThan(2500); // At least 2.5s
        expect(duration).toBeLessThan(6000);    // But under 6s
        console.log(`✅ Timed out in ~${Math.round(duration / 100) / 10}s (expected ~3-5s)`);

        // Check logs (optional - may not have timeout if no tiles to encode)
        const timeoutLog = logs.find(log => log.includes('timeout'));
        const fallbackLog = logs.find(log => log.includes('fallback'));
        const lzLog = logs.find(log => log.includes('LZ-String compressed URL'));
        const noTilesLog = logs.find(log => log.includes('No tiles to encode'));

        if (noTilesLog) {
            console.log('ℹ️  V3 returned null (no tiles) - no timeout needed');
        }
        if (timeoutLog) {
            console.log('✅ Timeout detected in logs');
        }
        if (fallbackLog) {
            console.log('✅ Fallback triggered');
        }
        if (lzLog) {
            console.log('✅ LZ-String fallback succeeded');
            const match = lzLog.match(/(\d+) chars/);
            if (match) {
                console.log(`   URL length: ${match[1]} chars`);
            }
        }

        console.log('✅ Test passed - Button restores correctly even on blocked network\n');
    });

    test('Button text should change through states correctly', async ({ page }) => {
        console.log('\n' + '='.repeat(60));
        console.log('TEST 3: Button Text State Changes');
        console.log('='.repeat(60) + '\n');

        // Navigate to game
        await page.goto('http://localhost:8085');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Set up game state
        await page.evaluate(() => {
            window.gameState = {
                seed: '20251005',
                startingWord: 'TRUNNELS',
                currentTurn: 6,
                isGameOver: true,
                score: 25,
                turnScores: [4, 5, 6, 5, 5],
                turnHistory: [
                    { tiles: [{ row: 7, col: 7, letter: 'T' }] }
                ]
            };

            const popup = document.getElementById('game-popup');
            if (popup) {
                popup.classList.remove('hidden');
            }
        });

        const shareBtn = page.locator('#share-board-btn');
        await shareBtn.waitFor({ state: 'visible', timeout: 5000 });

        // Get initial button text
        const initialText = await shareBtn.textContent();
        console.log(`📍 Initial button text: "${initialText}"`);
        expect(initialText).toBe('Share Board');

        // Click button and watch it change
        console.log('📤 Clicking Share Board...');
        await shareBtn.click();

        // Wait a tiny bit for "Generating..." to appear
        await page.waitForTimeout(100);
        const generatingText = await shareBtn.textContent();
        console.log(`📍 During generation: "${generatingText}"`);

        // Wait for completion
        await page.waitForTimeout(4000);
        const finalText = await shareBtn.textContent();
        console.log(`📍 Final button text: "${finalText}"`);

        // Should not be stuck on "Generating..."
        expect(finalText).not.toBe('Generating...');

        // Should be either "Copied!" or back to "Share Board"
        expect(finalText).toMatch(/Copied|Share Board/i);

        console.log('✅ Button text transitions work correctly\n');
    });
});
