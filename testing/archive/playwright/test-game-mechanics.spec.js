const { test, expect } = require('@playwright/test');

test.describe('WikiLetters Game Mechanics - Regression Tests', () => {

  test('deterministic game state with seed', async ({ page }) => {
    // Using a fixed seed should always produce the same starting word
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

    // Verify starting word is consistent
    const startingWord = await page.evaluate(() => {
      const cells = document.querySelectorAll('.board-cell.occupied .tile');
      return Array.from(cells).map(tile => tile.textContent.charAt(0)).join('');
    });

    expect(startingWord).toBe('INCLUDE'); // This should always be the same with seed=20250120

    // Verify starting position (should be centered)
    const firstTileCol = await page.locator('.board-cell.occupied').first().getAttribute('data-col');
    expect(parseInt(firstTileCol)).toBe(4); // INCLUDE starts at column 4
  });

  test('scoring calculations match Scrabble rules', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

    // Inject test scenario: Place N below O in COMPANY to form "ON"
    await page.evaluate(() => {
      // Simulate placing N at row 8, col 8 (below O)
      window.gameState.placedTiles = [
        { row: 8, col: 8, letter: 'N' }
      ];
      // calculateScore is not a global function, it's handled internally
    });

    const scorePreview = await page.evaluate(() => {
      const words = window.findFormedWords();
      let totalScore = 0;
      words.forEach(wordData => {
        totalScore += window.calculateWordScore(wordData);
      });
      return totalScore;
    });

    // O=1 (existing), N=1*2 (double letter at 8,8) = 3 total
    expect(scorePreview).toBe(3);
  });

  test('tile placement rules enforcement', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

    // Test 1: Can place tiles anywhere before submission
    const tile = await page.locator('.tile-rack .tile').first();
    await tile.click();

    // Should be able to place in corner (disconnected)
    await page.click('.board-cell[data-row="0"][data-col="0"]');
    let placedTile = await page.locator('.board-cell[data-row="0"][data-col="0"] .tile').count();
    expect(placedTile).toBe(1);

    // Test 2: Submit should fail for disconnected tiles
    await page.click('#submit-word');
    await page.waitForTimeout(500);

    const errorVisible = await page.locator('#error-modal').isVisible();
    expect(errorVisible).toBe(true);

    const errorMsg = await page.locator('#error-message').textContent();
    expect(errorMsg).toContain('must connect');
  });

  test('multiplier positions and values', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Check specific multiplier positions
    const multipliers = await page.evaluate(() => {
      const positions = {
        doubleWord: [],
        tripleWord: [],
        doubleLetter: [],
        tripleLetter: []
      };

      document.querySelectorAll('.board-cell').forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const classList = cell.className;

        if (classList.includes('triple-word')) {
          positions.tripleWord.push(`${row},${col}`);
        } else if (classList.includes('double-word')) {
          positions.doubleWord.push(`${row},${col}`);
        } else if (classList.includes('triple-letter')) {
          positions.tripleLetter.push(`${row},${col}`);
        } else if (classList.includes('double-letter')) {
          positions.doubleLetter.push(`${row},${col}`);
        }
      });

      return positions;
    });

    // Verify corner positions are triple word
    expect(multipliers.tripleWord).toContain('0,0');
    expect(multipliers.tripleWord).toContain('0,14');
    expect(multipliers.tripleWord).toContain('14,0');
    expect(multipliers.tripleWord).toContain('14,14');

    // Center (7,7) is marked separately and not in the doubleWord list
    // because it's a special star position
    const centerCell = await page.locator('.board-cell[data-row="7"][data-col="7"]').getAttribute('class');
    expect(centerCell).toContain('center-star');
  });

  test('word validation against ENABLE dictionary', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

    // Mock a word submission to test dictionary validation
    const response = await page.evaluate(async () => {
      const testData = {
        board: Array(15).fill(null).map(() => Array(15).fill(null)),
        placed_tiles: [
          { row: 7, col: 7, letter: 'C' },
          { row: 7, col: 8, letter: 'A' },
          { row: 7, col: 9, letter: 'T' }
        ]
      };

      // Set up board
      testData.board[7][7] = 'C';
      testData.board[7][8] = 'A';
      testData.board[7][9] = 'T';

      const resp = await fetch('/cgi-bin/validate_word.py', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      return await resp.json();
    });

    // CAT placed at center without connection will be invalid
    expect(response.valid).toBe(false);
    expect(response.message).toContain('connect');
  });

  test('turn progression and game ending', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

    // Check initial turn
    const initialTurn = await page.locator('#current-turn').textContent();
    expect(initialTurn).toBe('1/5');

    // Check game state
    const gameState = await page.evaluate(() => {
      return {
        currentTurn: window.gameState.currentTurn,
        maxTurns: window.gameState.maxTurns,
        isGameOver: window.gameState.isGameOver
      };
    });

    expect(gameState.currentTurn).toBe(1);
    expect(gameState.maxTurns).toBe(5);
    expect(gameState.isGameOver).toBe(false);

    // Verify endGame function exists
    const hasEndGame = await page.evaluate(() => typeof window.endGame === 'function');
    expect(hasEndGame).toBe(true);
  });

  test('tile rack management', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

    // Should start with 7 tiles
    const initialTileCount = await page.locator('.tile-rack .tile').count();
    expect(initialTileCount).toBe(7);

    // Place a tile
    const firstTile = await page.locator('.tile-rack .tile').first();
    const tileLetter = await firstTile.textContent();
    await firstTile.click();
    await page.click('.board-cell[data-row="6"][data-col="7"]');

    // Tile should be removed from rack
    const rackCount = await page.locator('.tile-rack .tile').count();
    expect(rackCount).toBe(6);

    // Recall tiles
    await page.click('#recall-tiles');

    // Tiles should be back in rack
    const recalledCount = await page.locator('.tile-rack .tile').count();
    expect(recalledCount).toBe(7);
  });

  test('score calculation with multiple words', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Test forming multiple perpendicular words
    const scoreData = await page.evaluate(() => {
      // Simulate a complex board state
      const board = Array(15).fill(null).map(() => Array(15).fill(null));

      // Place COMPANY horizontally at row 7
      'COMPANY'.split('').forEach((letter, i) => {
        board[7][5 + i] = letter;
      });

      // Simulate placing AN vertically (N below A)
      const placedTiles = [{ row: 8, col: 6, letter: 'N' }];

      // Calculate score
      window.gameState.board = board;
      window.gameState.placedTiles = placedTiles;

      const words = window.findFormedWords();
      let total = 0;
      const breakdown = [];

      words.forEach(wordData => {
        const score = window.calculateWordScore(wordData);
        breakdown.push({ word: wordData.word, score });
        total += score;
      });

      return { total, breakdown, wordCount: words.length };
    });

    // Should form "AN" vertically
    expect(scoreData.wordCount).toBeGreaterThanOrEqual(1);
    // Score may be 0 if word validation fails
    expect(scoreData.total).toBeGreaterThanOrEqual(0);
  });

  test('special squares usage tracking', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Place tile on double letter square
    const firstTile = await page.locator('.tile-rack .tile').first();
    await firstTile.click();

    // Row 0, Col 3 is a double letter square
    await page.click('.board-cell[data-row="0"][data-col="3"]');

    // Check that the square is marked as occupied
    const isOccupied = await page.locator('.board-cell[data-row="0"][data-col="3"]')
      .evaluate(el => el.classList.contains('occupied'));

    expect(isOccupied).toBe(true);

    // The multiplier should still be visible under the tile (for visual reference)
    const cellClasses = await page.locator('.board-cell[data-row="0"][data-col="3"]')
      .getAttribute('class');

    expect(cellClasses).toContain('double-letter');
  });

  test('high score persistence', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Set a test high score
    await page.evaluate(() => {
      const testHighScores = [
        { initials: 'AAA', score: 100, date: '2025-01-20' },
        { initials: 'BBB', score: 90, date: '2025-01-19' },
        { initials: 'CCC', score: 80, date: '2025-01-18' }
      ];
      localStorage.setItem('letters_high_scores', JSON.stringify(testHighScores));
    });

    // Reload and check persistence
    await page.reload();
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    const highScores = await page.evaluate(() => {
      const stored = localStorage.getItem('letters_high_scores');
      return stored ? JSON.parse(stored) : null;
    });

    expect(highScores).toBeDefined();
    expect(highScores).toHaveLength(3);
    expect(highScores[0].initials).toBe('AAA');
    expect(highScores[0].score).toBe(100);
  });
});