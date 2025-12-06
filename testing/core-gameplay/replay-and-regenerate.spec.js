const { test } = require('@playwright/test');

test('Replay user game and regenerate share URL', async ({ page }) => {
  const originalURL = 'https://letters.wiki/?g=N4IgJiBcIEwAwwKwEZUE4QBoQHcogGkAJAQQBkBJAMRKxABcoBtJgZk3ZABEtlM4AupjaYALNlqY+g4e0TYAsr35CRANmwBRZTKZwp2ACpYYK4Xz4gASibNNTlyad3tLAYVu75l7ZmeqNSxs-O319EF92XWlsAHksKNVnbAA5BNDMAA5sDzE7PmyIrHFdU0KyYrt2QuM83XFCgGVK6JCQWvldfVMQSU6ktt9+oRAAZ2ZWPhhAtDEAdik1AQBfIA';

  console.log('\n========================================');
  console.log('REPLAY AND REGENERATE TEST');
  console.log('========================================\n');

  // Step 1: Load the original URL
  console.log('Step 1: Loading original URL...');
  await page.goto(originalURL.replace('https://letters.wiki', 'http://localhost:8086'));
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
      isGameOver: gameState.isGameOver,
      preGeneratedURL: gameState.preGeneratedShareURL
    };
  });

  console.log('Game loaded:');
  console.log('  Seed:', gameInfo.seed);
  console.log('  Score:', gameInfo.score);
  console.log('  Tiles:', gameInfo.tilesPlaced);
  console.log('  Pre-generated URL:', gameInfo.preGeneratedURL ? 'Yes' : 'No');

  // Step 2: Generate a fresh share URL from this game state
  console.log('\nStep 2: Generating fresh share URL from loaded game...');

  const newURL = await page.evaluate(async () => {
    // Clear any pre-generated URL
    delete window.gameState.preGeneratedShareURL;

    // Generate fresh
    await generateShareableBoardURL();
    return window.gameState.preGeneratedShareURL;
  });

  console.log('\n========================================');
  console.log('URL COMPARISON');
  console.log('========================================');
  console.log('\nOriginal URL:');
  console.log(originalURL);
  console.log('Length:', originalURL.length);

  console.log('\nRegenerated URL:');
  console.log(newURL);
  console.log('Length:', newURL.length);

  console.log('\n----------------------------------------');
  if (originalURL === newURL) {
    console.log('✓ URLs MATCH - Encoding is consistent');
  } else {
    console.log('✗ URLs DIFFER - Encoding changed or has inconsistency');
    console.log('\nDifference in length:', newURL.length - originalURL.length, 'characters');

    // Extract just the encoded portions
    const origEncoded = originalURL.split('?g=')[1];
    const newEncoded = newURL.split('?g=')[1] || newURL.split('?seed=')[1];

    if (newEncoded) {
      console.log('\nOriginal encoded:', origEncoded.length, 'chars');
      console.log('New encoded:', newEncoded.length, 'chars');

      if (newURL.includes('?seed=')) {
        console.log('\n⚠️  WARNING: Regenerated URL is SEED-ONLY (V3 encoding failed!)');
      }
    }
  }
  console.log('========================================\n');
});
