const { test, expect } = require('@playwright/test');

test('check word formation logic', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForSelector('.tile-rack .tile');
    await page.waitForTimeout(1000);

    // Place a tile
    await page.locator('.tile-rack .tile').first().click();
    await page.click('.board-cell[data-row="7"][data-col="11"]');

    // Check what words are found
    const words = await page.evaluate(() => {
        const words = findFormedWords();
        return words;
    });

    console.log('Words found:', JSON.stringify(words, null, 2));

    // Check the word at position manually
    const wordInfo = await page.evaluate(() => {
        const word = getWordAt(7, 11, 'horizontal');
        return word;
    });

    console.log('Word at 7,11 horizontal:', JSON.stringify(wordInfo, null, 2));

    // Check vertical
    const wordInfoV = await page.evaluate(() => {
        const word = getWordAt(7, 11, 'vertical');
        return word;
    });

    console.log('Word at 7,11 vertical:', JSON.stringify(wordInfoV, null, 2));

    // Check display function
    const displayTest = await page.evaluate(() => {
        const testWords = [{
            word: 'COMPANYA',
            score: 25,
            startRow: 7,
            startCol: 4,
            direction: 'horizontal'
        }];
        displayWordPreview(testWords);
        return document.getElementById('word-preview')?.style.display;
    });

    console.log('Display after manual call:', displayTest);
});