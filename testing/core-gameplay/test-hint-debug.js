const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('  CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('  PAGE ERROR:', err.message));
    
    console.log('Loading page without debug mode...');
    await page.goto('http://localhost:8086/');
    await page.waitForSelector('.board-cell');
    await page.waitForTimeout(500);
    
    // Check what's available
    const checks = await page.evaluate(() => {
        return {
            hasLoadTestWordlist: typeof loadTestWordlist === 'function',
            hasFindAnchorSquares: typeof findAnchorSquares === 'function',
            hasGaddag: typeof gaddag !== 'undefined',
            hasTestWordlist: typeof testWordlist !== 'undefined',
            hasFindValidMovesCore: typeof findValidMovesCore === 'function',
            hasFindBestMoveInternal: typeof findBestMoveInternal === 'function',
        };
    });
    console.log('Function availability:', checks);
    
    await browser.close();
})();
