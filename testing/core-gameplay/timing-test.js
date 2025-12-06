const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('V3 Encoder') || text.includes('fetched in') || text.includes('ms')) {
      consoleLogs.push(text);
    }
  });
  
  // Start a fresh game instead
  await page.goto('http://localhost:8086/?seed=20251017');
  
  // Wait for game to load
  await page.waitForSelector('#game-board', { timeout: 10000 });
  
  // Complete the game quickly by using the scenario data
  // Place tiles from the first turn of the October 17 scenario (OX for 38 points)
  await page.evaluate(() => {
    // Force game to completed state for testing
    window.gameState.turnsPlayed = 5;
    window.gameState.gameComplete = true;
    window.gameState.score = 186;
    window.showGameCompletePopup();
  });
  
  // Wait for popup and share button
  await page.waitForSelector('#share-board-btn:visible', { timeout: 10000 });
  
  // Click share board button to trigger encoding
  await page.click('#share-board-btn');
  
  // Wait for encoding to complete
  await page.waitForTimeout(3000);
  
  // Print captured logs
  console.log('\n=== V3 Encoder Timing Logs ===');
  if (consoleLogs.length === 0) {
    console.log('No V3 Encoder logs captured');
  } else {
    consoleLogs.forEach(log => console.log(log));
  }
  console.log('=== End Logs ===\n');
  
  await browser.close();
})();
