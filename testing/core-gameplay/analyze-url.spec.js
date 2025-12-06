const { test } = require('@playwright/test');

test('Analyze user URL', async ({ page }) => {
  const userURL = 'https://letters.wiki/?g=N4IgJiBcIEwAwwKwEZUE4QBoQHcogGkAJAQQBkBJAMRKxABcoBtJgZk3ZABEtlM4AupjaYALNlqY+g4e0TYAsr35CRANmwBRZTKZwp2ACpYYK4Xz4gASibNNTlyad3tLAYVu75l7ZmeqNSxs-O319EF92XWlsAHksKNVnbAA5BNDMAA5sDzE7PmyIrHFdU0KyYrt2QuM83XFCgGVK6JCQWvldfVMQSU6ktt9+oRAAZ2ZWPhhAtDEAdik1AQBfIA';

  await page.goto(userURL.replace('https://letters.wiki', 'http://localhost:8086'));
  await page.waitForSelector('#game-board', { timeout: 10000 });
  await page.waitForTimeout(2000);

  const gameInfo = await page.evaluate(() => {
    const tileCount = gameState.turnHistory.reduce((sum, turn) => {
      return sum + (turn && turn.tiles ? turn.tiles.length : 0);
    }, 0);

    return {
      seed: gameState.seed,
      score: gameState.score,
      turns: gameState.currentTurn - 1,
      tilesPlaced: tileCount,
      turnHistory: gameState.turnHistory.map(turn => ({
        tiles: turn.tiles ? turn.tiles.length : 0,
        score: turn.score
      }))
    };
  });

  console.log('\n========================================');
  console.log('USER URL ANALYSIS');
  console.log('========================================');
  console.log('Seed:', gameInfo.seed);
  console.log('Final Score:', gameInfo.score);
  console.log('Turns Completed:', gameInfo.turns);
  console.log('Total Tiles Placed:', gameInfo.tilesPlaced);
  console.log('\nTurn Breakdown:');
  gameInfo.turnHistory.forEach((turn, i) => {
    if (turn.tiles > 0) {
      console.log(`  Turn ${i + 1}: ${turn.tiles} tiles, ${turn.score} points`);
    }
  });
  console.log('\nURL Stats:');
  console.log('  Encoded length: 255 characters');
  console.log('  Binary size: 191 bytes');
  console.log('  Bytes per tile:', (191 / gameInfo.tilesPlaced).toFixed(1));
  console.log('========================================\n');
});
