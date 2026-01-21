// Play a real game using GADDAG word finder - no debug cheats
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false }); // Show the browser
    const page = await browser.newPage();

    // Capture console for GADDAG messages
    page.on('console', msg => {
        if (msg.text().includes('[GADDAG]')) {
            console.log('  ' + msg.text());
        }
    });

    // Start fresh game with debug=1 (for API access only, no cheats used)
    console.log('Starting fresh game...');
    await page.goto('http://localhost:8086/?debug=1');
    await page.waitForSelector('.board-cell');
    await page.waitForTimeout(1000);

    // Load wordlist
    console.log('Loading wordlist and building GADDAG...');
    await page.evaluate(async () => await testAPI.loadWordlist());

    // Get initial state
    let state = await page.evaluate(() => testAPI.getState());
    console.log('\n' + '='.repeat(60));
    console.log('GAME START - Set ' + state.set + ' Round ' + state.round);
    console.log('Target: ' + state.target + ' points in 5 turns');
    console.log('='.repeat(60));

    // Play through the round
    let totalScore = 0;
    const maxTurns = 5;

    for (let turn = 1; turn <= maxTurns; turn++) {
        state = await page.evaluate(() => testAPI.getState());

        if (state.isGameOver) {
            console.log('\nGame ended early!');
            break;
        }

        console.log('\n--- Turn ' + turn + '/' + maxTurns + ' ---');
        console.log('Rack: ' + state.rack.join(' '));
        console.log('Score so far: ' + state.score + '/' + state.target);

        // Find best move
        const result = await page.evaluate(async () => {
            const r = await testAPI.findBestMove();
            return r;
        });

        if (!result.move) {
            console.log('No valid moves found! Passing...');
            await page.evaluate(() => testAPI.pass());
            continue;
        }

        const move = result.move;
        console.log('Best move: ' + move.word + ' (' + move.score + ' pts)');
        console.log('  Placing ' + move.placements.length + ' tiles: ' +
            move.placements.map(p => p.letter + '@(' + p.row + ',' + p.col + ')').join(', '));

        // Play the move
        const playResult = await page.evaluate(async (placements) => {
            return await testAPI.playWord(placements);
        }, move.placements);

        if (playResult.success) {
            console.log('  ✓ Played successfully! Turn score: ' + playResult.score);
            totalScore += playResult.score || move.score;
        } else {
            console.log('  ✗ Failed: ' + playResult.error);
            // Try to recover - maybe pass
            await page.evaluate(() => testAPI.pass());
        }

        // Brief pause to see the animation
        await page.waitForTimeout(1500);
    }

    // Check final state
    await page.waitForTimeout(1000);
    state = await page.evaluate(() => testAPI.getState());

    console.log('\n' + '='.repeat(60));
    console.log('ROUND COMPLETE');
    console.log('Final Score: ' + state.score + ' / Target: ' + state.target);

    if (state.score >= state.target) {
        console.log('✓ TARGET MET! Advancing to next round...');
    } else {
        console.log('✗ Target missed by ' + (state.target - state.score) + ' points');
    }
    console.log('='.repeat(60));

    // Wait a bit before closing
    console.log('\nWaiting 5 seconds before closing...');
    await page.waitForTimeout(5000);

    await browser.close();
})();
