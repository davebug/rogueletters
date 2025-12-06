const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Pre-generated') || text.includes('URL:')) {
      consoleLogs.push(text);
    }
  });
  
  // Play the November 19 game (minimal - just place a few tiles)
  await page.goto('http://localhost:8085/?seed=20251119');
  await page.waitForSelector('#game-board');
  await page.waitForTimeout(2000);
  
  // Get the starting word
  const startWord = await page.evaluate(() => window.gameState.startingWord);
  console.log('Starting word:', startWord);
  
  // Force game completion for testing
  await page.evaluate(() => {
    // Mark as complete
    window.gameState.isGameOver = true;
    window.gameState.currentTurn = 6;
    window.gameState.score = 100;
  });
  
  // Trigger share URL generation
  const shareURL = await page.evaluate(async () => {
    await generateShareableBoardURL();
    return window.gameState.preGeneratedShareURL;
  });
  
  console.log('\nGenerated locally:', shareURL);
  console.log('User provided:     https://letters.wiki/?g=N4IgJiBcIEwAwwKwEZUE4QBoQHcogGkAJAQQBkBJAMRKxABcoBtJgZk3ZABEtlM4AupjaYALNlqY+g4e0TYAsr35CRANmwBRZTKZwp2ACpYYK4Xz4gASibNNTlyad3tLAYVu75l7ZmeqNSxs-O319EF92XWlsAHksKNVnbAA5BNDMAA5sDzE7PmyIrHFdU0KyYrt2QuM83XFCgGVK6JCQWvldfVMQSU6ktt9+oRAAZ2ZWPhhAtDEAdik1AQBfIA');
  
  console.log('\nMatch:', shareURL === 'https://letters.wiki/?g=N4IgJiBcIEwAwwKwEZUE4QBoQHcogGkAJAQQBkBJAMRKxABcoBtJgZk3ZABEtlM4AupjaYALNlqY+g4e0TYAsr35CRANmwBRZTKZwp2ACpYYK4Xz4gASibNNTlyad3tLAYVu75l7ZmeqNSxs-O319EF92XWlsAHksKNVnbAA5BNDMAA5sDzE7PmyIrHFdU0KyYrt2QuM83XFCgGVK6JCQWvldfVMQSU6ktt9+oRAAZ2ZWPhhAtDEAdik1AQBfIA');
  
  await browser.close();
})();
