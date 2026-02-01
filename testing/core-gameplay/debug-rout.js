const { chromium } = require('playwright');

/**
 * Debug why GADDAG doesn't find ROUT.
 * Board: REALISM on row 4, RIF below A (row 5, cols 3-5)
 * Rack: R, O, T, U, N, N, T
 * Expected: ROUT horizontal at row 3, cols 5-8 (above ISM in REALISM)
 */
async function debugRout() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://localhost:8086/?debug=1&seed=55555');
    await page.waitForSelector('.board-cell', { timeout: 5000 });
    await page.waitForTimeout(1500);

    // Trigger GADDAG build by calling findValidMoves first
    await page.evaluate(async () => await window.testAPI.findValidMoves());

    const result = await page.evaluate(async () => {
        // Set up exact board state
        for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++)
                gameState.board[r][c] = null;

        const realism = 'REALISM';
        for (let i = 0; i < realism.length; i++)
            gameState.board[4][1 + i] = realism[i];

        gameState.board[5][3] = 'R';
        gameState.board[5][4] = 'I';
        gameState.board[5][5] = 'F';

        gameState.rackTiles = ['R', 'O', 'T', 'U', 'N', 'N', 'T'];

        const board = gameState.board;
        const BOARD_SIZE = 9;

        // 1. Check anchors
        const anchors = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c]) continue;
                const adj = (r > 0 && board[r-1][c]) || (r < 8 && board[r+1][c]) ||
                            (c > 0 && board[r][c-1]) || (c < 8 && board[r][c+1]);
                if (adj) anchors.push({r, c});
            }
        }
        const anchor35 = anchors.find(a => a.r === 3 && a.c === 5);

        // 2. Check cross-checks at key positions for ROUT at row 3, cols 5-8
        const crossInfo = {};
        for (let c = 5; c <= 8; c++) {
            // Vertical: what's above and below (3, c)?
            let above = '', below = '';
            for (let r = 2; r >= 0 && board[r][c]; r--) above = board[r][c] + above;
            for (let r = 4; r < 9 && board[r][c]; r++) below += board[r][c];
            crossInfo[`3,${c}`] = { above, below, crossWord: above + '?' + below };
        }

        // 3. Check if GADDAG has ROUT path
        const hasRout = gaddag.root.children['R']?.children['+']?.children['O']?.children['U']?.children['T']?.isTerminal;

        // 4. Check testWordlist
        const wordChecks = {
            ROUT: testWordlist?.has('ROUT'),
            RIF: testWordlist?.has('RIF'),
            OS: testWordlist?.has('OS'),
            UM: testWordlist?.has('UM'),
        };

        // 5. Compute actual cross-checks using GADDAG method
        const cc = gaddag.computeCrossChecks(board, BOARD_SIZE);
        const crossChecks = {};
        for (let c = 5; c <= 8; c++) {
            const key = `3,${c}`;
            const set = cc[key];
            crossChecks[key] = set ? { size: set.size, hasR: set.has('R'), hasO: set.has('O'),
                hasU: set.has('U'), hasT: set.has('T'), letters: [...set].sort().join('') } : 'NO CONSTRAINT';
        }

        // 6. Run the actual move search
        const allResult = await window.testAPI.findValidMoves();
        const moves = allResult.moves || [];
        const routMoves = moves.filter(m => m.word === 'ROUT');

        // 7. Look for any moves at row 3
        const row3moves = moves.filter(m => m.placements.some(p => p.row === 3));

        return {
            anchorAt35: !!anchor35,
            totalAnchors: anchors.length,
            anchorsRow3: anchors.filter(a => a.r === 3).map(a => `(${a.r},${a.c})`),
            crossInfo,
            gaddagHasRout: hasRout,
            wordChecks,
            crossChecks,
            routFound: routMoves.length,
            totalMoves: moves.length,
            row3moves: row3moves.slice(0, 10).map(m => `${m.word}(${m.score}) ${m.direction} @ ${m.placements.map(p => `${p.letter}(${p.row},${p.col})`).join(' ')}`),
            top5: moves.slice(0, 5).map(m => `${m.word}(${m.score})`)
        };
    });

    console.log('\n═══ DIAGNOSTIC RESULTS ═══');
    console.log('\n1. Anchors:');
    console.log(`   Total: ${result.totalAnchors}`);
    console.log(`   Row 3: ${result.anchorsRow3.join(', ')}`);
    console.log(`   (3,5) is anchor: ${result.anchorAt35}`);

    console.log('\n2. Cross-word context at ROUT positions (row 3):');
    Object.entries(result.crossInfo).forEach(([key, info]) => {
        console.log(`   ${key}: above="${info.above}" below="${info.below}" → ${info.crossWord}`);
    });

    console.log('\n3. GADDAG has R+OUT path:', result.gaddagHasRout);

    console.log('\n4. Words in testWordlist:', JSON.stringify(result.wordChecks));

    console.log('\n5. Cross-check sets at ROUT positions:');
    Object.entries(result.crossChecks).forEach(([key, info]) => {
        if (typeof info === 'string') {
            console.log(`   ${key}: ${info}`);
        } else {
            console.log(`   ${key}: ${info.size} letters allowed [${info.letters}]`);
            console.log(`          R:${info.hasR} O:${info.hasO} U:${info.hasU} T:${info.hasT}`);
        }
    });

    console.log('\n6. ROUT found by search:', result.routFound > 0 ? `YES (${result.routFound} moves)` : 'NO');
    console.log(`   Total moves: ${result.totalMoves}`);
    console.log(`   Top 5: ${result.top5.join(', ')}`);

    console.log('\n7. All moves at row 3:');
    if (result.row3moves.length) {
        result.row3moves.forEach(m => console.log(`   ${m}`));
    } else {
        console.log('   NONE');
    }

    await browser.close();
}

debugRout().catch(console.error);
