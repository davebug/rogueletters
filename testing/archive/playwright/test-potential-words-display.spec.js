const { test, expect } = require('@playwright/test');

test('potential words display in right sidebar', async ({ page }) => {
    console.log('\n🔍 TESTING POTENTIAL WORDS DISPLAY\n');

    await page.goto('http://localhost:8085?debug=1');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Initially should show placeholder
    const placeholder = await page.locator('#potential-words-list .placeholder');
    const placeholderVisible = await placeholder.isVisible();
    console.log(`Initial placeholder visible: ${placeholderVisible ? '✅' : '❌'}`);
    expect(placeholderVisible).toBe(true);

    // Get starting word info
    const startingWord = await page.evaluate(() => {
        const tiles = document.querySelectorAll('.board-cell.starter .tile');
        return Array.from(tiles).map(t => t.querySelector('.tile-letter').textContent).join('');
    });
    console.log(`Starting word: "${startingWord}"`);

    // Simulate placing tiles to form a word
    console.log('\nSimulating tile placement...');
    await page.evaluate(() => {
        // Get some tiles from rack
        const rackTiles = document.querySelectorAll('#tile-rack .tile');
        if (rackTiles.length < 3) {
            // Create some test tiles if needed
            for (let i = 0; i < 3; i++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.letter = ['T', 'E', 'D'][i];
                tile.dataset.value = '1';
                tile.innerHTML = `
                    <span class="tile-letter">${['T', 'E', 'D'][i]}</span>
                    <span class="tile-score">1</span>
                `;
                document.getElementById('tile-rack').appendChild(tile);
            }
        }

        // Place tiles to form a word (e.g., extending from existing word)
        const placedTiles = [
            { row: 6, col: 7, letter: 'T', value: 1 },
            { row: 6, col: 8, letter: 'E', value: 1 },
            { row: 6, col: 9, letter: 'D', value: 1 }
        ];

        window.gameState.placedTiles = placedTiles;

        // Update board array AND place visual tiles
        placedTiles.forEach(t => {
            // Update the board array
            window.gameState.board[t.row][t.col] = t.letter;
            const cell = document.querySelector(`[data-row="${t.row}"][data-col="${t.col}"]`);
            if (cell) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.letter = t.letter;
                tile.dataset.value = t.value;
                tile.innerHTML = `
                    <span class="tile-letter">${t.letter}</span>
                    <span class="tile-score">${t.value}</span>
                `;
                cell.appendChild(tile);
            }
        });

        // Trigger update
        window.checkWordValidity();
    });

    await page.waitForTimeout(500);

    // Check if words are now displayed
    console.log('\nChecking potential words display...');

    const wordItems = await page.locator('.word-item').count();
    console.log(`Word items found: ${wordItems}`);

    if (wordItems > 0) {
        // Get first word details
        const firstWord = await page.locator('.word-text').first();
        const firstScore = await page.locator('.word-score').first();

        const wordText = await firstWord.textContent();
        const scoreText = await firstScore.textContent();

        console.log(`First word: "${wordText}" - ${scoreText}`);

        // Check total score
        const totalScore = await page.locator('.potential-words .total-score .value');
        if (await totalScore.count() > 0) {
            const total = await totalScore.textContent();
            console.log(`Total score shown: ${total}`);
        }
    } else {
        // If no words shown, check if there's still a placeholder
        const stillPlaceholder = await page.locator('#potential-words-list .placeholder').isVisible();
        console.log(`Still showing placeholder: ${stillPlaceholder}`);

        // Debug: check what findFormedWords returns
        const debugWords = await page.evaluate(() => {
            if (window.findFormedWords) {
                return window.findFormedWords();
            }
            return 'Function not found';
        });
        console.log('Debug - findFormedWords result:', JSON.stringify(debugWords, null, 2));
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/potential-words-sidebar.png', fullPage: false });
    console.log('\n📸 Screenshot saved to test-results/potential-words-sidebar.png');
});