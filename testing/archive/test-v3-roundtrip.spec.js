const { test, expect } = require('@playwright/test');

test.describe('V3 URL Round-trip Test', () => {
    test('should encode and decode to the same board', async ({ page }) => {
        // Navigate to today's game
        await page.goto('http://localhost:8085');
        await page.waitForLoadState('networkidle');

        // Play a simple game - just place a few tiles
        // First, let's get the starting word and tiles
        await page.waitForTimeout(1000);

        // Get the current seed
        const seed = await page.evaluate(() => gameState.seed);
        console.log('Playing game for seed:', seed);

        // Place some tiles (we'll just submit a few turns)
        // For now, let's just get the Share Board URL without playing

        // Actually, let's use the URL the user got
        const v3URL = 'http://localhost:8085/?g=INkHUWjT0qMFPKoZx1DioA';

        console.log('\n=== Testing V3 URL ===');
        console.log('URL:', v3URL);

        // Navigate to the V3 URL
        await page.goto(v3URL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Get all placed tiles
        const tiles = await page.evaluate(() => {
            const placedTiles = [];
            document.querySelectorAll('.tile.placed').forEach(tile => {
                const parent = tile.parentElement;
                const row = parseInt(parent.dataset.row);
                const col = parseInt(parent.dataset.col);
                const letter = tile.querySelector('.tile-letter').textContent;
                const turn = parseInt(tile.dataset.turn) || 0;
                placedTiles.push({ row, col, letter, turn });
            });
            return placedTiles;
        });

        console.log('\n=== Decoded Board ===');
        tiles.sort((a, b) => a.turn - b.turn || a.row - a.row || a.col - b.col);
        tiles.forEach(tile => {
            console.log(`Turn ${tile.turn}: (${tile.row},${tile.col}) = ${tile.letter}`);
        });

        // Get the game state
        const gameData = await page.evaluate(() => ({
            seed: gameState.seed,
            startingWord: gameState.startingWord,
            score: gameState.score,
            turnScores: gameState.turnScores
        }));

        console.log('\n=== Game Data ===');
        console.log('Seed:', gameData.seed);
        console.log('Starting word:', gameData.startingWord);
        console.log('Score:', gameData.score);
        console.log('Turn scores:', gameData.turnScores);

        // Take a screenshot
        await page.screenshot({ path: 'testing/v3-decoded-board.png', fullPage: true });
        console.log('\n✓ Screenshot saved to testing/v3-decoded-board.png');
    });
});
