const { test, expect } = require('@playwright/test');

test('test valid word placements', async ({ page }) => {
    test.setTimeout(60000);

    // Capture console logs
    page.on('console', msg => {
        if (msg.text().includes('Error')) {
            console.log('Browser error:', msg.text());
        }
    });

    await page.goto('http://localhost:8085');

    // Wait for game to load
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

    console.log('✓ Game loaded\n');

    // Get all rack tiles
    const rackTiles = await page.locator('.tile-rack .tile').all();
    const tileLetters = [];
    for (const tile of rackTiles) {
        const letter = await tile.textContent();
        tileLetters.push(letter.charAt(0)); // Just the letter, not the score
    }
    console.log(`Available tiles: ${tileLetters.join(', ')}`);

    // Get the starting word
    const startingCells = await page.locator('.board-cell.occupied').all();
    const startingWord = [];
    for (const cell of startingCells) {
        const tileLetter = await cell.locator('.tile').textContent();
        startingWord.push(tileLetter.charAt(0));
    }
    console.log(`Starting word: ${startingWord.join('')}\n`);

    // TEST 1: Build a perpendicular word using one of the starting word's letters
    console.log('--- TEST 1: Perpendicular word ---');

    // Find a good letter to build off (preferably a vowel)
    let targetRow = 7, targetCol = -1;
    const vowels = ['A', 'E', 'I', 'O', 'U'];
    for (let i = 0; i < startingWord.length; i++) {
        if (vowels.includes(startingWord[i])) {
            targetCol = 7 + i; // Starting word begins at col 7
            console.log(`Building off '${startingWord[i]}' at column ${targetCol}`);
            break;
        }
    }

    if (targetCol === -1) {
        // No vowel found, use middle letter
        targetCol = 7 + Math.floor(startingWord.length / 2);
        console.log(`Building off middle letter at column ${targetCol}`);
    }

    // Try to build a simple 2-letter word vertically
    // Common 2-letter words: IT, IS, AT, TO, DO, GO, NO, SO, WE, HE, ME, BE
    const commonTwoLetters = {
        'I': ['T', 'S', 'N'],
        'A': ['T', 'S', 'N', 'M'],
        'O': ['N', 'R', 'F'],
        'E': ['R', 'L', 'N'],
        'T': ['O', 'I'],
        'D': ['O'],
        'G': ['O'],
        'N': ['O'],
        'S': ['O'],
        'W': ['E'],
        'H': ['E'],
        'M': ['E'],
        'B': ['E']
    };

    // Find which tiles can form a word with the target letter
    const targetLetter = startingWord[targetCol - 7];
    let tileToPlace = null;
    let placeAbove = true;

    // Check if we have a tile that can form a word
    for (const tile of tileLetters) {
        if (commonTwoLetters[targetLetter]?.includes(tile)) {
            tileToPlace = tile;
            placeAbove = false; // Place below to form word
            break;
        }
        if (commonTwoLetters[tile]?.includes(targetLetter)) {
            tileToPlace = tile;
            placeAbove = true; // Place above to form word
            break;
        }
    }

    if (tileToPlace) {
        console.log(`Attempting to place '${tileToPlace}' ${placeAbove ? 'above' : 'below'} '${targetLetter}'`);

        // Find the tile in the rack
        let tileIndex = -1;
        for (let i = 0; i < rackTiles.length; i++) {
            const letter = await rackTiles[i].textContent();
            if (letter.charAt(0) === tileToPlace) {
                tileIndex = i;
                break;
            }
        }

        if (tileIndex >= 0) {
            // Place the tile
            await rackTiles[tileIndex].click();
            const newRow = placeAbove ? targetRow - 1 : targetRow + 1;
            await page.click(`.board-cell[data-row="${newRow}"][data-col="${targetCol}"]`);
            console.log(`Placed '${tileToPlace}' at row ${newRow}, col ${targetCol}`);

            // Check word preview
            await page.waitForTimeout(500);
            const previewText = await page.locator('.word-preview').textContent();
            console.log(`Word preview: ${previewText.replace(/\s+/g, ' ')}`);

            // Submit the word
            console.log('Submitting word...');
            await page.click('#submit-word');
            await page.waitForTimeout(2000);

            // Check score
            const score = await page.locator('#current-score').textContent();
            console.log(`Score after submission: ${score}`);

            // Check for errors
            const errorModal = await page.locator('#error-modal');
            if (await errorModal.isVisible()) {
                const errorMsg = await page.locator('#error-message').textContent();
                console.log(`Error: ${errorMsg}`);
                // Close the modal
                await page.click('#close-error');
            } else {
                console.log('✓ Word accepted!');
            }
        }
    } else {
        console.log('Could not find suitable tiles to form a common 2-letter word');
    }

    // Take screenshot
    await page.screenshot({
        path: 'test-results/valid-words-test.png',
        fullPage: true
    });

    console.log('\n✓ Test completed - check screenshot for final state');
});