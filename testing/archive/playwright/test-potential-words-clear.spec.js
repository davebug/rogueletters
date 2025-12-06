const { test, expect } = require('@playwright/test');

test('potential words clear after submission', async ({ page }) => {
    console.log('\n🔍 TESTING POTENTIAL WORDS CLEAR ON SUBMIT\n');

    await page.goto('http://localhost:8085?debug=1');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Simulate placing tiles
    console.log('Placing tiles to form words...');
    await page.evaluate(() => {
        // Place tiles to form a word
        const placedTiles = [
            { row: 6, col: 7, letter: 'C', value: 3 },
            { row: 6, col: 8, letter: 'A', value: 1 },
            { row: 6, col: 9, letter: 'T', value: 1 }
        ];

        window.gameState.placedTiles = placedTiles;

        // Update board array
        placedTiles.forEach(t => {
            window.gameState.board[t.row][t.col] = t.letter;

            // Place visual tiles
            const cell = document.querySelector(`[data-row="${t.row}"][data-col="${t.col}"]`);
            if (cell) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.innerHTML = `
                    <span class="tile-letter">${t.letter}</span>
                    <span class="tile-score">${t.value}</span>
                `;
                cell.appendChild(tile);
                cell.classList.add('placed-this-turn');
            }
        });

        // Update displays
        window.checkWordValidity();
    });

    await page.waitForTimeout(500);

    // Check words are displayed
    let wordCount = await page.locator('.word-item').count();
    console.log(`Words displayed before submit: ${wordCount}`);
    expect(wordCount).toBeGreaterThan(0);

    // Simulate successful word submission
    console.log('\nSimulating word submission...');
    await page.evaluate(() => {
        // Simulate what happens after successful submission
        // Clear placed tiles
        document.querySelectorAll('.placed-this-turn').forEach(cell => {
            cell.classList.remove('placed-this-turn');
        });
        window.gameState.placedTiles = [];

        // Update the sidebar
        window.updatePotentialWordsSidebar();

        // Simulate moving to next turn
        window.gameState.currentTurn++;
        window.updateTurnCounter();
    });

    await page.waitForTimeout(500);

    // Check words are cleared
    wordCount = await page.locator('.word-item').count();
    console.log(`Words displayed after submit: ${wordCount}`);
    expect(wordCount).toBe(0);

    // Check placeholder is back
    const placeholder = await page.locator('#potential-words-list .placeholder');
    const placeholderVisible = await placeholder.isVisible();
    console.log(`Placeholder visible after submit: ${placeholderVisible ? '✅' : '❌'}`);
    expect(placeholderVisible).toBe(true);

    // Take screenshot
    await page.screenshot({ path: 'test-results/potential-words-cleared.png', fullPage: false });
    console.log('\n📸 Screenshot saved to test-results/potential-words-cleared.png');
});

test('potential words clear when recalling tiles', async ({ page }) => {
    console.log('\n🔍 TESTING POTENTIAL WORDS CLEAR ON RECALL\n');

    await page.goto('http://localhost:8085?debug=1');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Simulate placing tiles
    console.log('Placing tiles to form words...');
    await page.evaluate(() => {
        // Place tiles
        const placedTiles = [
            { row: 7, col: 5, letter: 'D', value: 2 },
            { row: 7, col: 6, letter: 'O', value: 1 },
            { row: 7, col: 7, letter: 'G', value: 2 }
        ];

        window.gameState.placedTiles = placedTiles;

        placedTiles.forEach(t => {
            window.gameState.board[t.row][t.col] = t.letter;
            const cell = document.querySelector(`[data-row="${t.row}"][data-col="${t.col}"]`);
            if (cell) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.innerHTML = `
                    <span class="tile-letter">${t.letter}</span>
                    <span class="tile-score">${t.value}</span>
                `;
                cell.appendChild(tile);
            }
        });

        window.checkWordValidity();
    });

    await page.waitForTimeout(500);

    // Check words are displayed
    let wordCount = await page.locator('.word-item').count();
    console.log(`Words displayed before recall: ${wordCount}`);
    expect(wordCount).toBeGreaterThan(0);

    // Click recall button (if visible) or simulate recall
    console.log('\nRecalling tiles...');
    const recallButton = page.locator('#recall-tiles');
    if (await recallButton.isVisible()) {
        await recallButton.click();
    } else {
        // Simulate recall if button not visible
        await page.evaluate(() => {
            if (window.recallTiles) {
                window.recallTiles();
            }
        });
    }

    await page.waitForTimeout(500);

    // Check words are cleared
    wordCount = await page.locator('.word-item').count();
    console.log(`Words displayed after recall: ${wordCount}`);
    expect(wordCount).toBe(0);

    // Check placeholder is back
    const placeholder = await page.locator('#potential-words-list .placeholder');
    const placeholderVisible = await placeholder.isVisible();
    console.log(`Placeholder visible after recall: ${placeholderVisible ? '✅' : '❌'}`);
    expect(placeholderVisible).toBe(true);
});