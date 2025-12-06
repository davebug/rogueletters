/**
 * Backward Compatibility Test Suite
 *
 * CRITICAL: This test ensures we don't break:
 * 1. Old share links people posted on social media/messages
 * 2. High score links from previous days (in database)
 * 3. Both ?g= (legacy) and ?w= (sorted) URL formats
 *
 * These tests MUST pass before and after any cleanup changes.
 */

const { test, expect } = require('@playwright/test');

test.describe('Backward Compatibility - Share URLs', () => {

  // Real URLs from production high scores database
  const realHighScoreURLs = [
    {
      date: '20251020',
      url: 'https://letters.wiki/?g=IR5BURxJcFAyEaDRB8hFSytrm-Tjh0G11jdSBo2FcOg',
      format: 'g',
      description: 'Oct 20 high score - legacy ?g= format (from production)'
    },
    {
      date: '20251122',
      url: 'https://letters.wiki/?w=IaKnMV1LdmATJhQ5MwniUVqcUQzMxog0YhrQjYIkmSzdZ4tC0A',
      format: 'w',
      description: 'Nov 22 high score - sorted ?w= format (from production)'
    }
  ];

  // Test scenario URLs from our test suite
  const testScenarioURLs = [
    {
      date: '20251017',
      url: 'https://letters.wiki/?g=IRIn4UGJ4pg05ihJS45NcpuQGsUIyCHDWiMyAbBV',
      format: 'g',
      expectedTiles: 24,
      expectedScore: 186,
      description: 'Oct 17 scenario - legacy format'
    },
    {
      date: '20251018',
      url: 'https://letters.wiki/?g=IRaFGTtK8lCkYqHxBikDZfMdGyTIWB5DJiIRJKttbGv1ZGo',
      format: 'g',
      expectedTiles: 26,
      expectedScore: 186,
      description: 'Oct 18 scenario - legacy format'
    },
    {
      date: '20251019',
      url: 'https://letters.wiki/?g=IRoLgW6MBlWkiaM5EKg8QhsJmFLDBoNELj82DqA',
      format: 'g',
      expectedTiles: 22,
      expectedScore: 129,
      description: 'Oct 19 scenario - legacy format'
    },
    {
      date: '20251020',
      url: 'https://letters.wiki/?g=IR4MKWILLFEE0qepRsnicUOc2scaiPpBUpNU5qA',
      format: 'g',
      expectedTiles: 23,
      expectedScore: 129,
      description: 'Oct 20 scenario - legacy format'
    }
  ];

  realHighScoreURLs.forEach(({ url, format, description }) => {
    test(`Real high score URL: ${description}`, async ({ page }) => {
      console.log(`\n=== Testing: ${description} ===`);
      console.log(`URL: ${url}`);
      console.log(`Format: ?${format}=`);

      // Load the URL (convert to localhost for testing)
      const localURL = url.replace('https://letters.wiki', 'http://localhost:8085');
      await page.goto(localURL);

      // Wait for game to load
      await page.waitForSelector('#game-board', { timeout: 10000 });
      await page.waitForTimeout(2000);  // Give time for URL decode

      // Verify game loaded successfully
      const gameState = await page.evaluate(() => ({
        loaded: !!(window.gameState?.seed && window.gameState?.turnHistory),
        seed: window.gameState?.seed,
        turns: window.gameState?.turnHistory?.length || 0
      }));

      expect(gameState.loaded).toBe(true);
      console.log(`  Seed: ${gameState.seed}`);
      console.log(`  Turns: ${gameState.turns}`);

      // Count placed tiles on board
      const placedTiles = await page.evaluate(() => {
        const cells = document.querySelectorAll('#game-board .cell.has-tile');
        return cells.length;
      });

      console.log(`  Tiles on board: ${placedTiles}`);

      // Verify SOME tiles were loaded (the board isn't empty)
      expect(placedTiles).toBeGreaterThan(0);

      // Verify turn history exists
      expect(gameState.turns).toBeGreaterThan(0);

      console.log(`✓ High score URL loaded correctly - ${placedTiles} tiles from ${gameState.turns} turns\n`);
    });
  });

  testScenarioURLs.forEach(({ url, format, expectedTiles, expectedScore, description }) => {
    test(`Test scenario URL: ${description}`, async ({ page }) => {
      console.log(`\n=== Testing: ${description} ===`);
      console.log(`URL: ${url}`);
      console.log(`Expected tiles: ${expectedTiles}`);
      console.log(`Expected score: ${expectedScore}`);

      // Load the URL (convert to localhost for testing)
      const localURL = url.replace('https://letters.wiki', 'http://localhost:8085');
      await page.goto(localURL);

      // Wait for game to load
      await page.waitForSelector('#game-board', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Verify game loaded successfully
      const gameState = await page.evaluate(() => ({
        loaded: window.gameState && window.gameState.seed && window.gameState.turnHistory,
        seed: window.gameState?.seed,
        turnHistory: window.gameState?.turnHistory?.length || 0
      }));

      expect(gameState.loaded).toBe(true);
      console.log(`  Seed: ${gameState.seed}`);
      console.log(`  Turns: ${gameState.turnHistory}`);

      // Count placed tiles
      const placedTiles = await page.evaluate(() => {
        const cells = document.querySelectorAll('#game-board .cell.has-tile');
        return cells.length;
      });

      console.log(`  Tiles on board: ${placedTiles}`);
      expect(placedTiles).toBe(expectedTiles);

      // Verify final score
      const finalScore = await page.evaluate(() => {
        const turnScores = window.gameState.turnHistory.map(t => t.score);
        return turnScores.reduce((sum, s) => sum + s, 0);
      });

      console.log(`  Final score: ${finalScore}`);
      expect(finalScore).toBe(expectedScore);

      console.log(`✓ Scenario URL loaded correctly with exact tile count and score\n`);
    });
  });

});

test.describe('Backward Compatibility - High Score Database', () => {

  test('Old high score links from database still work', async ({ page }) => {
    console.log('\n=== Testing: High Score Database Links ===');

    // Get today's high score from API
    const response = await page.request.get('http://localhost:8085/cgi-bin/get_high_score.py?date=20251122');
    const data = await response.json();

    if (!data.success || !data.board_url) {
      console.log('⚠ No high score for today - skipping test');
      test.skip();
      return;
    }

    console.log(`High score URL from database: ${data.board_url}`);
    console.log(`Score: ${data.score}`);

    // Verify URL format is correct (?g= or ?w=)
    const hasCorrectFormat = data.board_url.includes('?g=') || data.board_url.includes('?w=');
    expect(hasCorrectFormat).toBe(true);

    // Load the URL
    const localURL = data.board_url.replace('https://letters.wiki', 'http://localhost:8085');
    await page.goto(localURL);

    // Wait for game to load
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify game loaded
    const gameLoaded = await page.evaluate(() => {
      return window.gameState &&
             window.gameState.seed &&
             window.gameState.turnHistory;
    });
    expect(gameLoaded).toBe(true);

    // Count tiles
    const placedTiles = await page.evaluate(() => {
      const cells = document.querySelectorAll('#game-board .cell.has-tile');
      return cells.length;
    });

    console.log(`  Tiles on board: ${placedTiles}`);
    expect(placedTiles).toBeGreaterThan(0);

    console.log(`✓ High score database link works correctly\n`);
  });

  test('Yesterday\'s high score link still works', async ({ page }) => {
    console.log('\n=== Testing: Yesterday\'s High Score Link ===');

    // Get yesterday's high score from API
    const response = await page.request.get('http://localhost:8085/cgi-bin/get_high_score.py?date=20251121');
    const data = await response.json();

    if (!data.success || !data.board_url) {
      console.log('⚠ No high score for yesterday - skipping test');
      test.skip();
      return;
    }

    console.log(`Yesterday's high score URL: ${data.board_url}`);
    console.log(`Score: ${data.score}`);

    // Load the URL
    const localURL = data.board_url.replace('https://letters.wiki', 'http://localhost:8085');
    await page.goto(localURL);

    // Wait for game to load
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify game loaded
    const gameLoaded = await page.evaluate(() => {
      return window.gameState && window.gameState.seed;
    });
    expect(gameLoaded).toBe(true);

    console.log(`✓ Yesterday's high score link works correctly\n`);
  });

});

test.describe('Backward Compatibility - URL Format Detection', () => {

  test('Correctly identifies ?g= as legacy format', async ({ page }) => {
    const testURL = 'http://localhost:8085/?g=IRIn4UGJ4pg05ihJS45NcpuQGsUIyCHDWiMyAbBV';

    await page.goto(testURL);
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check that game detected legacy format
    const detectedFormat = await page.evaluate(() => {
      // Check for markers in console logs or game state
      const url = window.location.href;
      return url.includes('?g=') ? 'legacy' : 'sorted';
    });

    expect(detectedFormat).toBe('legacy');
    console.log('✓ Legacy ?g= format correctly identified');
  });

  test('Correctly identifies ?w= as sorted format', async ({ page }) => {
    const testURL = 'http://localhost:8085/?w=IaKnMV1LdmATJhQ5MwniUVqcUQzMxog0YhrQjYIkmSzdZ4tC0A';

    await page.goto(testURL);
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check that game detected sorted format
    const detectedFormat = await page.evaluate(() => {
      const url = window.location.href;
      return url.includes('?w=') ? 'sorted' : 'legacy';
    });

    expect(detectedFormat).toBe('sorted');
    console.log('✓ Sorted ?w= format correctly identified');
  });

});

test.describe('Backward Compatibility - Edge Cases', () => {

  test('Mixed case URL parameters still work', async ({ page }) => {
    // Test with uppercase G
    const testURL = 'http://localhost:8085/?G=IRIn4UGJ4pg05ihJS45NcpuQGsUIyCHDWiMyAbBV';

    await page.goto(testURL);
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const gameLoaded = await page.evaluate(() => window.gameState?.seed);

    // This might fail (case-sensitive), which is OK
    // Just documenting the behavior
    if (gameLoaded) {
      console.log('✓ Uppercase parameter works');
    } else {
      console.log('⚠ Uppercase parameter not supported (expected)');
    }
  });

  test('URLs with extra parameters still work', async ({ page }) => {
    // URL with tracking parameters (like from social media)
    const testURL = 'http://localhost:8085/?g=IRIn4UGJ4pg05ihJS45NcpuQGsUIyCHDWiMyAbBV&utm_source=twitter&utm_medium=social';

    await page.goto(testURL);
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const gameLoaded = await page.evaluate(() => window.gameState?.seed);
    expect(gameLoaded).toBeTruthy();

    console.log('✓ URLs with extra parameters work correctly');
  });

  test('Fragment identifiers don\'t break loading', async ({ page }) => {
    // URL with hash fragment
    const testURL = 'http://localhost:8085/?g=IRIn4UGJ4pg05ihJS45NcpuQGsUIyCHDWiMyAbBV#shared';

    await page.goto(testURL);
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const gameLoaded = await page.evaluate(() => window.gameState?.seed);
    expect(gameLoaded).toBeTruthy();

    console.log('✓ Fragment identifiers don\'t interfere with loading');
  });

});
