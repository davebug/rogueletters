const { test, expect } = require('@playwright/test');

test('clicking completed turn squares animates tiles', async ({ page }) => {
    console.log('\n🎯 TESTING SQUARE CLICK ANIMATIONS\n');

    await page.goto('http://localhost:8085?debug=1');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Simulate a completed turn with specific tiles
    await page.evaluate(() => {
        // Place tiles for turn 1
        const turn1Tiles = [
            { row: 7, col: 7, letter: 'T' },
            { row: 7, col: 8, letter: 'E' },
            { row: 7, col: 9, letter: 'S' },
            { row: 7, col: 10, letter: 'T' }
        ];

        // Add turn to history
        window.gameState.turnHistory = [{
            tiles: turn1Tiles,
            score: 25,
            bingo: false
        }];

        // Update game state
        window.gameState.turnScores = [25];
        window.gameState.score = 25;
        window.gameState.currentTurn = 2;

        // Place tiles on board (for visualization)
        turn1Tiles.forEach(t => {
            const cell = document.querySelector(`[data-row="${t.row}"][data-col="${t.col}"]`);
            if (cell) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.innerHTML = `
                    <span class="tile-letter">${t.letter}</span>
                    <span class="tile-score">1</span>
                `;
                cell.appendChild(tile);
            }
        });

        // Update footer squares
        window.updateFooterSquares();
    });

    await page.waitForTimeout(500);

    // Check that first square shows score
    const firstSquare = await page.locator('.feedback-square.turn-1');
    const scoreText = await firstSquare.textContent();
    console.log(`First square shows score: ${scoreText}`);
    expect(scoreText).toBe('25');

    // Check square has completed class and is clickable
    const hasCompleted = await firstSquare.evaluate(el => el.classList.contains('completed'));
    console.log(`First square has completed class: ${hasCompleted ? '✅' : '❌'}`);
    expect(hasCompleted).toBe(true);

    // Click the completed square
    console.log('\nClicking completed square...');
    await firstSquare.click();

    // Check if square got pop animation
    const squareHasPop = await firstSquare.evaluate(el => el.classList.contains('pop'));
    console.log(`Square has pop animation: ${squareHasPop ? '✅' : '❌'}`);

    // Check if tiles have pop animation
    const tilesWithAnimation = await page.evaluate(() => {
        const tiles = document.querySelectorAll('.board-cell .tile.pop');
        return tiles.length;
    });
    console.log(`Tiles with pop animation: ${tilesWithAnimation}`);

    // Wait for animation to complete
    await page.waitForTimeout(900);

    // Check animations have been removed
    const animationsCleared = await page.evaluate(() => {
        const poppedElements = document.querySelectorAll('.pop');
        return poppedElements.length === 0;
    });
    console.log(`Animations cleared after completion: ${animationsCleared ? '✅' : '❌'}`);
    expect(animationsCleared).toBe(true);

    // Take screenshot during hover
    await firstSquare.hover();
    await page.screenshot({ path: 'test-results/square-hover.png', fullPage: false });
    console.log('\n📸 Screenshot saved to test-results/square-hover.png');
});

test('multiple turns can be animated independently', async ({ page }) => {
    console.log('\n🎯 TESTING MULTIPLE TURN ANIMATIONS\n');

    await page.goto('http://localhost:8085?debug=1');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Simulate multiple completed turns
    await page.evaluate(() => {
        // Turn 1 tiles
        const turn1Tiles = [
            { row: 7, col: 6, letter: 'C', value: 3 },
            { row: 7, col: 7, letter: 'A', value: 1 },
            { row: 7, col: 8, letter: 'T', value: 1 }
        ];

        // Turn 2 tiles (vertical word)
        const turn2Tiles = [
            { row: 6, col: 8, letter: 'A', value: 1 },
            { row: 8, col: 8, letter: 'E', value: 1 }
        ];

        // Add turns to history
        window.gameState.turnHistory = [
            { tiles: turn1Tiles, score: 15, bingo: false },
            { tiles: turn2Tiles, score: 10, bingo: false }
        ];

        // Update game state
        window.gameState.turnScores = [15, 10];
        window.gameState.score = 25;
        window.gameState.currentTurn = 3;

        // Place all tiles on board
        [...turn1Tiles, ...turn2Tiles].forEach(t => {
            const cell = document.querySelector(`[data-row="${t.row}"][data-col="${t.col}"]`);
            if (cell) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.innerHTML = `
                    <span class="tile-letter">${t.letter}</span>
                    <span class="tile-score">${t.value || 1}</span>
                `;
                cell.appendChild(tile);
            }
        });

        // Update footer squares
        window.updateFooterSquares();
    });

    // Click first turn square
    console.log('Clicking turn 1 square...');
    await page.locator('.feedback-square.turn-1').click();

    const turn1TilesAnimated = await page.evaluate(() => {
        const tiles = document.querySelectorAll('[data-row="7"] .tile.pop');
        return tiles.length;
    });
    console.log(`Turn 1 tiles animated: ${turn1TilesAnimated}`);
    expect(turn1TilesAnimated).toBeGreaterThan(0);

    await page.waitForTimeout(900);

    // Click second turn square
    console.log('\nClicking turn 2 square...');
    await page.locator('.feedback-square.turn-2').click();

    const turn2TilesAnimated = await page.evaluate(() => {
        const tiles = document.querySelectorAll('[data-col="8"] .tile.pop');
        return tiles.length;
    });
    console.log(`Turn 2 tiles animated: ${turn2TilesAnimated}`);
    expect(turn2TilesAnimated).toBeGreaterThan(0);

    // Take screenshot
    await page.screenshot({ path: 'test-results/multiple-turn-animation.png', fullPage: false });
    console.log('\n📸 Screenshot saved to test-results/multiple-turn-animation.png');
});