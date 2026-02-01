const { chromium } = require('playwright');

/**
 * Full hint system test - exercises:
 * 1. Debug mode $100 coins
 * 2. Hint button visibility & affordability
 * 3. Using hint - word display & gold highlights
 * 4. Coin deduction on successful hint
 * 5. Hint clears when tile placed
 * 6. Cannot-afford state when broke
 */
async function testHintFull() {
    const headed = process.argv.includes('--headed');
    const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 300 : 0 });
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

    page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error') console.log('  BROWSER ERROR:', text);
        if (text.includes('[Debug]') || text.includes('[RunState]')) console.log('  BROWSER:', text);
    });
    page.on('pageerror', err => console.log('  PAGE ERROR:', err.message));

    let passed = 0;
    let failed = 0;

    function assert(condition, label) {
        if (condition) {
            console.log(`  ✓ ${label}`);
            passed++;
        } else {
            console.log(`  ✗ FAIL: ${label}`);
            failed++;
        }
    }

    try {
        // ──────────────────────────────────────────
        console.log('\n═══ TEST 1: Game loads in debug mode ═══');
        // ?debug=1 alone should now enter run mode with $100 coins
        await page.goto('http://localhost:8086/?debug=1');
        await page.waitForSelector('.board-cell', { timeout: 5000 });
        await page.waitForTimeout(1000);

        const hasDebug = await page.evaluate(() => !!window.testAPI);
        assert(hasDebug, 'testAPI available in debug mode');

        const startWord = await page.evaluate(() => gameState.board[4].filter(Boolean).join(''));
        console.log(`  Board starter word: ${startWord}`);
        assert(startWord.length >= 3, 'Starter word placed on board');

        const rack = await page.evaluate(() => gameState.rackTiles.map(t => typeof t === 'object' ? t.letter : t));
        console.log(`  Rack tiles: ${rack.join(', ')}`);
        assert(rack.length === 7, 'Rack has 7 tiles');

        // ──────────────────────────────────────────
        console.log('\n═══ TEST 2: Debug mode gives $100 in run mode ═══');
        const isRunMode = await page.evaluate(() => runState.isRunMode);
        assert(isRunMode, 'Game is in run mode');

        const coins = await page.evaluate(() => runState.coins);
        console.log(`  Starting coins: $${coins}`);
        assert(coins >= 10, 'Have enough coins to test hints ($100 from debug)');

        // ──────────────────────────────────────────
        console.log('\n═══ TEST 3: Hint button visibility ═══');
        const hintBtn = await page.$('#hint-btn');
        assert(hintBtn !== null, 'Hint button exists in DOM');

        const btnDisplay = await page.evaluate(() => {
            const btn = document.getElementById('hint-btn');
            return window.getComputedStyle(btn).display;
        });
        console.log(`  Hint button display: ${btnDisplay}`);
        assert(btnDisplay !== 'none', 'Hint button is visible when in run mode');

        const isDisabled = await page.evaluate(() => document.getElementById('hint-btn').disabled);
        assert(!isDisabled, 'Hint button is enabled (can afford $3)');

        const hasCannotAfford = await page.evaluate(() =>
            document.getElementById('hint-btn').classList.contains('cannot-afford')
        );
        assert(!hasCannotAfford, 'No cannot-afford class when coins >= 3');

        // ──────────────────────────────────────────
        console.log('\n═══ TEST 4: Use hint - find best word ═══');
        const coinsBefore = await page.evaluate(() => runState.coins);
        console.log(`  Coins before hint: $${coinsBefore}`);

        // Click the hint button
        await page.click('#hint-btn');
        await page.waitForTimeout(3000); // GADDAG needs time to build + search

        const status = await page.$eval('#status', el => el.textContent);
        console.log(`  Status message: "${status}"`);
        assert(status.startsWith('Hint:'), 'Status shows hint result');

        // Parse the hint word and score
        const hintMatch = status.match(/Hint: (\w+) \((\d+) pts?\)/);
        if (hintMatch) {
            console.log(`  Hint word: ${hintMatch[1]}, Score: ${hintMatch[2]} pts`);
            assert(hintMatch[1].length >= 2, 'Hint word is at least 2 letters');
            assert(parseInt(hintMatch[2]) > 0, 'Hint score is positive');
        } else {
            assert(false, `Could not parse hint from: "${status}"`);
        }

        // Check gold highlights on board
        const highlights = await page.$$('.hint-highlight');
        console.log(`  Highlighted cells: ${highlights.length}`);
        assert(highlights.length > 0, 'Board cells are highlighted with gold');

        // Check ghost tiles
        const ghosts = await page.$$('.hint-ghost-tile');
        console.log(`  Ghost letter tiles: ${ghosts.length}`);
        assert(ghosts.length > 0, 'Ghost letter tiles are displayed');

        // ──────────────────────────────────────────
        console.log('\n═══ TEST 5: Coins deducted ═══');
        const coinsAfter = await page.evaluate(() => runState.coins);
        console.log(`  Coins after hint: $${coinsAfter}`);
        assert(coinsAfter === coinsBefore - 3, `Coins deducted by $3 (${coinsBefore} → ${coinsAfter})`);

        // ──────────────────────────────────────────
        console.log('\n═══ TEST 6: Hint clears when tile placed ═══');
        // Place a tile on the board to clear the hint
        const placed = await page.evaluate(() => {
            // Find the first rack tile and a valid empty cell
            const rackTiles = document.querySelectorAll('.rack-tile');
            if (rackTiles.length === 0) return false;

            // Simulate clicking a rack tile then an empty board cell
            rackTiles[0].click();
            return true;
        });

        if (placed) {
            await page.waitForTimeout(500);
            // Check if a board cell is available to click
            const emptyCellClicked = await page.evaluate(() => {
                const cells = document.querySelectorAll('.board-cell:not(.has-tile)');
                for (const cell of cells) {
                    // Find a cell adjacent to existing tiles
                    const row = parseInt(cell.dataset.row);
                    const col = parseInt(cell.dataset.col);
                    if (row >= 3 && row <= 5 && col >= 1 && col <= 7) {
                        cell.click();
                        return true;
                    }
                }
                return false;
            });

            if (emptyCellClicked) {
                await page.waitForTimeout(500);
                const highlightsAfter = await page.$$('.hint-highlight');
                const ghostsAfter = await page.$$('.hint-ghost-tile');
                console.log(`  Highlights after tile placed: ${highlightsAfter.length}`);
                console.log(`  Ghosts after tile placed: ${ghostsAfter.length}`);
                assert(highlightsAfter.length === 0, 'Hint highlights cleared after placing tile');
                assert(ghostsAfter.length === 0, 'Ghost tiles cleared after placing tile');
            } else {
                console.log('  (skipping - could not find adjacent empty cell)');
            }

            // Recall tiles to reset
            await page.evaluate(() => {
                if (typeof recallTiles === 'function') recallTiles();
            });
            await page.waitForTimeout(300);
        }

        // ──────────────────────────────────────────
        console.log('\n═══ TEST 7: Use hint again (verify repeatable) ═══');
        // Make sure hint button is visible again
        await page.evaluate(() => updateHintButtonVisibility());
        await page.waitForTimeout(200);

        const coins2Before = await page.evaluate(() => runState.coins);
        await page.click('#hint-btn');
        await page.waitForTimeout(2000);

        const status2 = await page.$eval('#status', el => el.textContent);
        console.log(`  Second hint: "${status2}"`);
        assert(status2.startsWith('Hint:'), 'Second hint works');

        const coins2After = await page.evaluate(() => runState.coins);
        assert(coins2After === coins2Before - 3, `Coins deducted again ($${coins2Before} → $${coins2After})`);

        // ──────────────────────────────────────────
        console.log('\n═══ TEST 8: Cannot-afford state ═══');
        // Set coins to $2 (below the $3 hint cost)
        await page.evaluate(() => {
            runState.coins = 2;
            runManager.updateCoinDisplay();
            // Clear any existing hint first
            clearHintHighlight();
            updateHintButtonVisibility();
        });
        await page.waitForTimeout(300);

        const isDisabledNow = await page.evaluate(() => document.getElementById('hint-btn').disabled);
        assert(isDisabledNow, 'Hint button is disabled when coins < $3');

        const hasCannotAffordNow = await page.evaluate(() =>
            document.getElementById('hint-btn').classList.contains('cannot-afford')
        );
        assert(hasCannotAffordNow, 'Button has cannot-afford class when broke');

        const costColor = await page.evaluate(() => {
            const cost = document.querySelector('.hint-cost');
            return window.getComputedStyle(cost).color;
        });
        console.log(`  Cost badge color when broke: ${costColor}`);

        // ──────────────────────────────────────────
        console.log('\n═══ TEST 9: Hint hidden when tiles on board ═══');
        // Restore coins, place a tile, check button hides
        await page.evaluate(() => {
            runState.coins = 50;
            runManager.updateCoinDisplay();
        });

        // Place a tile
        const tilePlaced = await page.evaluate(() => {
            const rackTiles = document.querySelectorAll('.rack-tile');
            if (rackTiles.length === 0) return false;
            rackTiles[0].click();
            const cells = document.querySelectorAll('.board-cell:not(.has-tile)');
            for (const cell of cells) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                if (row >= 3 && row <= 5 && col >= 1 && col <= 7) {
                    cell.click();
                    return true;
                }
            }
            return false;
        });

        if (tilePlaced) {
            await page.waitForTimeout(300);
            const btnDisplayAfterPlace = await page.evaluate(() => {
                return document.getElementById('hint-btn').style.display;
            });
            console.log(`  Hint button display after placing tile: "${btnDisplayAfterPlace}"`);
            assert(btnDisplayAfterPlace === 'none', 'Hint button hidden when tiles on board');

            // Recall and check it comes back
            await page.evaluate(() => {
                if (typeof recallTiles === 'function') recallTiles();
            });
            await page.waitForTimeout(300);
            const btnDisplayAfterRecall = await page.evaluate(() => {
                updateHintButtonVisibility();
                return window.getComputedStyle(document.getElementById('hint-btn')).display;
            });
            assert(btnDisplayAfterRecall !== 'none', 'Hint button reappears after recalling tiles');
        }

        // ──────────────────────────────────────────
        console.log('\n═══ TEST 10: GADDAG performance ═══');
        const perf = await page.evaluate(async () => {
            const start = performance.now();
            const result = await window.testAPI.findValidMoves();
            const elapsed = performance.now() - start;
            return {
                moveCount: result.moves?.length || 0,
                timeMs: Math.round(elapsed),
                topMoves: result.moves?.slice(0, 5).map(m => `${m.word} (${m.score}pts)`)
            };
        });
        console.log(`  Found ${perf.moveCount} valid moves in ${perf.timeMs}ms`);
        console.log(`  Top 5: ${perf.topMoves?.join(', ')}`);
        assert(perf.moveCount > 0, 'GADDAG finds valid moves');
        assert(perf.timeMs < 5000, `Search completes in reasonable time (${perf.timeMs}ms < 5000ms)`);

    } catch (err) {
        console.log(`\n  ✗ UNEXPECTED ERROR: ${err.message}`);
        failed++;
    }

    // ──────────────────────────────────────────
    console.log('\n════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('════════════════════════════════════\n');

    if (headed) {
        console.log('Browser staying open for inspection. Press Ctrl+C to close.');
        await new Promise(() => {}); // Keep open
    } else {
        await browser.close();
    }

    process.exit(failed > 0 ? 1 : 0);
}

testHintFull().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
