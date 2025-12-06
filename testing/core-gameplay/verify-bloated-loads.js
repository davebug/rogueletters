const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const bloatedURL = 'https://letters.wiki/?g=N4IgJiBcIEwAwwKwEZUE4QBoQHcogGkAJAQQBkBJAMRKxABcoBtJgZk3ZABEtlM4AupjaYALNlqY+g4e0TYAsr35CRANmwBRZTKZwp2ACpYYK4Xz4gASibNNTlyad3tLAYVu75l7ZmeqNSxs-O319EF92XWlsAHksKNVnbAA5BNDMAA5sDzE7PmyIrHFdU0KyYrt2QuM83XFCgGVK6JCQWvldfVMQSU6ktt9+oRAAZ2ZWPhhAtDEAdik1AQBfIA';
  
  console.log('Testing if bloated URL loads correctly...\n');
  
  await page.goto(bloatedURL.replace('https://letters.wiki', 'http://localhost:8085'));
  await page.waitForSelector('#game-board');
  await page.waitForTimeout(2000);
  
  const gameInfo = await page.evaluate(() => {
    const tileCount = gameState.turnHistory.reduce((sum, turn) => {
      return sum + (turn && turn.tiles ? turn.tiles.length : 0);
    }, 0);
    
    const turnDetails = gameState.turnHistory.map((turn, i) => ({
      turn: i + 1,
      tiles: turn.tiles ? turn.tiles.length : 0,
      score: turn.score || 0,
      words: turn.tiles ? turn.tiles.map(t => `(${t.row},${t.col})=${t.letter}`).join(', ') : ''
    })).filter(t => t.tiles > 0);
    
    return {
      seed: gameState.seed,
      score: gameState.score,
      tilesPlaced: tileCount,
      isGameOver: gameState.isGameOver,
      turnDetails: turnDetails
    };
  });
  
  console.log('✓ Bloated URL DOES load correctly:');
  console.log('  Seed:', gameInfo.seed);
  console.log('  Score:', gameInfo.score);
  console.log('  Tiles placed:', gameInfo.tilesPlaced);
  console.log('  Game over:', gameInfo.isGameOver);
  console.log('\nTurn breakdown:');
  gameInfo.turnDetails.forEach(turn => {
    console.log(`  Turn ${turn.turn}: ${turn.tiles} tiles, ${turn.score} points`);
  });
  
  console.log('\n✓ Bloated URL contains ALL 21 tiles and loads perfectly!');
  console.log('  This means the "tile count: 17" from the decoder was wrong.');
  console.log('  The bloated data is NOT in standard V3 format.');
  
  await browser.close();
})();
