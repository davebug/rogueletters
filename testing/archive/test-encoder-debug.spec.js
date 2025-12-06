const { test, expect } = require('@playwright/test');

test.describe('V3 Encoder Debug', () => {
    test('should show turnHistory structure', async ({ page }) => {
        await page.goto('http://localhost:8085');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Get turnHistory structure
        const turnHistory = await page.evaluate(() => {
            return JSON.stringify(gameState.turnHistory, null, 2);
        });

        console.log('\n=== Turn History Structure ===');
        console.log(turnHistory);

        // Get the actual tiles array that encoder would build
        const tilesArray = await page.evaluate(() => {
            const tiles = [];
            gameState.turnHistory.forEach((turn, turnIndex) => {
                if (turn && turn.tiles) {
                    turn.tiles.forEach(tile => {
                        tiles.push({
                            row: tile.row,
                            col: tile.col,
                            letter: tile.letter,
                            turn: turnIndex + 1
                        });
                    });
                }
            });
            return tiles;
        });

        console.log('\n=== Tiles Array (what encoder sees) ===');
        tilesArray.forEach((tile, i) => {
            console.log(`Tile ${i+1}: (${tile.row},${tile.col}) = ${tile.letter} turn=${tile.turn}`);
        });
    });
});
