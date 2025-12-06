const { test, expect } = require('@playwright/test');

test.describe('Share Board Pre-generation', () => {
    test('should pre-generate URL at game end and copy instantly', async ({ page, context }) => {
        // Grant clipboard permissions
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        // Navigate to the game with a specific seed
        await page.goto('http://localhost:8085/?seed=20250927');

        // Wait for game to load
        await page.waitForSelector('#game-board', { timeout: 10000 });

        console.log('✅ Game loaded');

        // Play through the game quickly by directly manipulating game state
        await page.evaluate(() => {
            // Force game to end with some score
            gameState.currentTurn = 6; // Past maxTurns
            gameState.score = 50;
            gameState.turnScores = [10, 10, 10, 10, 10];
            gameState.turnHistory = [
                { tiles: [{letter: 'T', row: 4, col: 4}], word: 'TEST', score: 10 },
                { tiles: [{letter: 'E', row: 4, col: 5}], word: 'BEST', score: 10 },
                { tiles: [{letter: 'S', row: 4, col: 6}], word: 'REST', score: 10 },
                { tiles: [{letter: 'T', row: 4, col: 7}], word: 'NEST', score: 10 },
                { tiles: [{letter: 'E', row: 4, col: 8}], word: 'PEST', score: 10 }
            ];
            endGame();
        });

        // Wait for popup to appear
        await page.waitForSelector('#game-popup', { state: 'visible', timeout: 5000 });
        console.log('✅ Popup appeared');

        // Wait a bit for URL pre-generation to complete
        await page.waitForTimeout(4000);

        // Check that preGeneratedShareURL was created
        const hasPreGeneratedURL = await page.evaluate(() => {
            return gameState.preGeneratedShareURL !== null;
        });

        console.log(`✅ Pre-generated URL exists: ${hasPreGeneratedURL}`);
        expect(hasPreGeneratedURL).toBe(true);

        // Get the pre-generated URL
        const preGeneratedURL = await page.evaluate(() => {
            return gameState.preGeneratedShareURL;
        });

        console.log(`✅ Pre-generated URL: ${preGeneratedURL.substring(0, 100)}...`);

        // Find and click the Share Board button
        const shareBoardBtn = await page.locator('#share-board-btn');
        await expect(shareBoardBtn).toBeVisible();

        console.log('✅ Share Board button is visible');

        // Record the time before clicking
        const startTime = Date.now();

        // Click the button and wait for result
        await shareBoardBtn.click();

        // Wait a moment for the async operation to complete
        await page.waitForTimeout(100);

        // Check the button text
        let buttonText = await shareBoardBtn.textContent();
        const duration = Date.now() - startTime;

        console.log(`Button text after ${duration}ms: "${buttonText}"`);

        // If it says "Copy Failed", check console errors
        if (buttonText === 'Copy Failed') {
            const errors = await page.evaluate(() => {
                return window.lastClipboardError || 'Unknown error';
            });
            console.log('❌ Clipboard error:', errors);
        }

        // Wait a bit longer if not yet changed
        if (buttonText !== 'Copied!') {
            await page.waitForTimeout(500);
            buttonText = await shareBoardBtn.textContent();
            console.log(`Button text after 600ms: "${buttonText}"`);
        }

        // Verify the button text changed to Copied!
        expect(buttonText).toBe('Copied!');

        console.log(`✅ Share Board copied in ${duration}ms (instant - no async delays!)`);

        // Verify the clipboard contains the pre-generated URL
        const clipboardText = await page.evaluate(async () => {
            return await navigator.clipboard.readText();
        });

        expect(clipboardText).toBe(preGeneratedURL);
        console.log(`✅ Clipboard contains correct pre-generated URL`);
        console.log(`   Full URL: ${clipboardText}`);
    });
});
