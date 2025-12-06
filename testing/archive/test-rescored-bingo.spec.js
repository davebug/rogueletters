const { test, expect } = require('@playwright/test');

test.describe('RESCORED bingo bug - 7 tiles with existing letter', () => {
    test.setTimeout(60000);

    test('Form RESCORED using 7 tiles + existing C - should show +50 bonus', async ({ page }) => {
        console.log('\n' + '='.repeat(60));
        console.log('RESCORED BINGO TEST');
        console.log('Forming RESCORED vertically with 7 tiles + existing C');
        console.log('Should show +50 bonus in potential words display');
        console.log('='.repeat(60) + '\n');

        // Navigate to the specific date
        await page.goto('http://localhost:8085?seed=20251003&debug=1');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('#tile-rack-board .tile', { timeout: 10000 });

        // Enable debug mode
        await page.locator('#debug-mode-toggle').click({ force: true });
        console.log('✅ Debug mode enabled\n');

        await page.waitForTimeout(1000);

        // Get starting word
        const startingWord = await page.evaluate(() => window.gameState?.startingWord || 'unknown');
        console.log(`📍 Starting word: ${startingWord}`);

        // First, we need to find where CURACAO is on the board
        // Let me check the board state
        const boardInfo = await page.evaluate(() => {
            const board = window.gameState.board;
            // Find CURACAO
            for (let row = 0; row < board.length; row++) {
                for (let col = 0; col < board[row].length; col++) {
                    if (board[row][col] === 'C') {
                        // Check if it's part of CURACAO
                        let word = '';
                        let startCol = col;
                        // Go left to find start
                        while (startCol > 0 && board[row][startCol - 1]) startCol--;
                        // Build word
                        let c = startCol;
                        while (c < board[row].length && board[row][c]) {
                            word += board[row][c];
                            c++;
                        }
                        if (word === 'CURACAO') {
                            return { row, col, word, startCol };
                        }
                    }
                }
            }
            return null;
        });

        if (!boardInfo) {
            console.log('⚠️  CURACAO not found on board - may need to play a turn first');
            console.log('   This test assumes CURACAO is already on the board');
            return;
        }

        console.log(`📍 Found CURACAO at row ${boardInfo.row}, first C at col ${boardInfo.col}\n`);

        // Now place R, E, S above the C
        const cRow = boardInfo.row;
        const cCol = boardInfo.col;

        console.log('📤 Placing tiles to form RESCORED:\n');

        // We need tiles: R, E, S, O, R, E, D
        // Place them at positions to form vertical word with existing C

        const tilesToPlace = [
            { letter: 'R', row: cRow - 3, col: cCol, desc: 'R (above C)' },
            { letter: 'E', row: cRow - 2, col: cCol, desc: 'E (above C)' },
            { letter: 'S', row: cRow - 1, col: cCol, desc: 'S (above C)' },
            // C is already at cRow, cCol
            { letter: 'O', row: cRow + 1, col: cCol, desc: 'O (below C)' },
            { letter: 'R', row: cRow + 2, col: cCol, desc: 'R (below C)' },
            { letter: 'E', row: cRow + 3, col: cCol, desc: 'E (below C)' },
            { letter: 'D', row: cRow + 4, col: cCol, desc: 'D (below C)' }
        ];

        for (const { letter, row, col, desc } of tilesToPlace) {
            // Find a tile with this letter in rack
            const rackTiles = await page.locator('#tile-rack-board .tile').all();
            let found = false;

            for (const tile of rackTiles) {
                const tileText = await tile.textContent();
                if (tileText.charAt(0) === letter) {
                    await tile.click();
                    await page.click(`.board-cell[data-row="${row}"][data-col="${col}"]`);
                    console.log(`  ✓ Placed ${desc} at (${row}, ${col})`);
                    found = true;
                    await page.waitForTimeout(200);
                    break;
                }
            }

            if (!found) {
                console.log(`  ⚠️  Could not find ${letter} in rack`);
            }
        }

        // Wait for potential words display to update
        await page.waitForTimeout(1000);

        // Check how many tiles we placed
        const placedCount = await page.locator('.board-cell.placed-this-turn .tile').count();
        console.log(`\n📍 Total tiles placed: ${placedCount}`);

        // Get the potential words display
        const potentialWords = await page.evaluate(() => {
            const wordItems = document.querySelectorAll('#potential-words-list .word-item');
            return Array.from(wordItems).map(item => ({
                word: item.querySelector('.word-text')?.textContent || '',
                score: parseInt(item.querySelector('.word-score')?.textContent || '0')
            }));
        });

        console.log('\n📍 Potential words shown:');
        potentialWords.forEach(w => {
            console.log(`   ${w.word}: ${w.score} points`);
        });

        // Find RESCORED
        const rescored = potentialWords.find(w => w.word === 'RESCORED');

        console.log('\n' + '='.repeat(60));
        if (rescored) {
            console.log(`✅ Found RESCORED in potential words`);
            console.log(`   Score: ${rescored.score}`);

            // Rough calculation (without multipliers):
            // R=1, E=1, S=1, C=3, O=1, R=1, E=1, D=2 = 11 base points
            // + 50 bingo bonus = 61 minimum

            if (rescored.score >= 50) {
                console.log(`   ✓ Has +50 bonus (score >= 50)`);
            } else {
                console.log(`   ❌ BUG: Missing +50 bonus (score < 50)`);
                console.log(`   Expected: At least 61 (base ~11 + 50 bonus)`);
                console.log(`   Got: ${rescored.score}`);
            }
        } else {
            console.log('❌ RESCORED not found in potential words!');
            console.log('   Words found:', potentialWords.map(w => w.word).join(', '));
        }
        console.log('='.repeat(60) + '\n');

        // Check gameState
        const gameState = await page.evaluate(() => ({
            placedTiles: window.gameState.placedTiles.length,
            rackTiles: window.gameState.rackTiles.length
        }));
        console.log(`📍 Game state: ${gameState.placedTiles} placed, ${gameState.rackTiles} in rack\n`);

        // The bug: Even though 7 tiles were placed, RESCORED doesn't show +50
        expect(rescored).toBeTruthy();
        if (rescored) {
            expect(rescored.score).toBeGreaterThanOrEqual(50); // Should have bonus
        }
    });
});
