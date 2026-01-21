const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Test WITHOUT debug mode (production scenario)
    console.log('Testing hint in production mode (no debug)...');
    await page.goto('http://localhost:8086/');
    await page.waitForSelector('.board-cell');
    await page.waitForTimeout(500);
    
    // Add coins via exposed runState
    await page.evaluate(() => { runState.coins = 10; });
    
    // Trigger hint button visibility update
    await page.evaluate(() => {
        const btn = document.getElementById('hint-btn');
        if (btn) {
            btn.style.display = 'flex';
            btn.disabled = false;
            btn.classList.remove('cannot-afford');
        }
    });
    
    // Click hint
    await page.click('#hint-btn');
    await page.waitForTimeout(3000);
    
    // Check result
    const status = await page.$eval('#status', el => el.textContent);
    const highlights = await page.$$('.hint-highlight');
    
    console.log('Status:', status);
    console.log('Highlights:', highlights.length);
    console.log(status.startsWith('Hint:') ? '✓ PASS - Hint works in production!' : '✗ FAIL - ' + status);
    
    await browser.close();
})();
