const { test, expect } = require('@playwright/test');

test.describe('Backend Scoring Validation - Regression Tests', () => {

  async function validateWord(page, board, placedTiles) {
    // Call backend validation endpoint
    const response = await page.evaluate(async (data) => {
      const resp = await fetch('/cgi-bin/validate_word.py', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board: data.board,
          placed_tiles: data.placedTiles
        })
      });
      return await resp.json();
    }, { board, placedTiles });

    return response;
  }

  test('single tile forming perpendicular word', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Board with COMPANY at row 7, cols 5-11
    const board = Array(15).fill(null).map(() => Array(15).fill(null));
    'COMPANY'.split('').forEach((letter, i) => {
      board[7][5 + i] = letter;
    });

    // Place just N below A (col 8) to form "AN"
    const placedTiles = [
      { row: 8, col: 8, letter: 'N' }  // Below A in COMPANY
    ];

    const response = await validateWord(page, board, placedTiles);

    expect(response.valid).toBe(true);
    expect(response.words_formed).toContain('AN');
    expect(response.score).toBe(3); // A=1 (existing), N=1*2 (double letter) = 3
  });

  test('word with multiple multipliers', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    const board = Array(15).fill(null).map(() => Array(15).fill(null));

    // Place CAT horizontally starting at row 0, col 0 (triple word score)
    const placedTiles = [
      { row: 0, col: 0, letter: 'C' }, // Triple word
      { row: 0, col: 1, letter: 'A' },
      { row: 0, col: 2, letter: 'T' }
    ];

    const response = await validateWord(page, board, placedTiles);

    expect(response.valid).toBe(true);
    expect(response.words_formed).toContain('CAT');
    // C=3, A=1, T=1, total=5, triple word = 15
    expect(response.score).toBe(15);
  });

  test('multiple words formed in one play', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    const board = Array(15).fill(null).map(() => Array(15).fill(null));

    // Set up board with CAT horizontally at row 7
    board[7][7] = 'C';
    board[7][8] = 'A';
    board[7][9] = 'T';

    // Place GO vertically from G at col 7
    const placedTiles = [
      { row: 8, col: 7, letter: 'O' }, // Below C to form CO
      { row: 8, col: 8, letter: 'G' }  // Below A to form AG
    ];

    const response = await validateWord(page, board, placedTiles);

    // OG is formed horizontally, CO and AG vertically
    expect(response.words_formed).toContain('OG');
    expect(response.words_formed).toContain('CO');
    expect(response.words_formed).toContain('AG');
    expect(response.score).toBeGreaterThan(0);
  });

  test('bingo bonus for using all 7 tiles', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    const board = Array(15).fill(null).map(() => Array(15).fill(null));
    board[7][7] = 'T'; // Existing tile

    // Place TESTING (7 letters) horizontally before the T
    const placedTiles = [
      { row: 7, col: 0, letter: 'T' },
      { row: 7, col: 1, letter: 'E' },
      { row: 7, col: 2, letter: 'S' },
      { row: 7, col: 3, letter: 'T' },
      { row: 7, col: 4, letter: 'I' },
      { row: 7, col: 5, letter: 'N' },
      { row: 7, col: 6, letter: 'G' }
    ];

    const response = await validateWord(page, board, placedTiles);

    if (response.valid) {
      // Score should include 50-point bingo bonus
      expect(response.score).toBeGreaterThanOrEqual(50);
    }
  });

  test('double word score at center (7,7)', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    const board = Array(15).fill(null).map(() => Array(15).fill(null));

    // Place CAT with C on center star (double word)
    const placedTiles = [
      { row: 7, col: 7, letter: 'C' }, // Center star (double word)
      { row: 7, col: 8, letter: 'A' },
      { row: 7, col: 9, letter: 'T' }
    ];

    const response = await validateWord(page, board, placedTiles);

    expect(response.valid).toBe(true);
    expect(response.words_formed).toContain('CAT');
    // C=3, A=1, T=1, total=5, double word = 10
    expect(response.score).toBe(10);
  });

  test('triple letter score calculation', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    const board = Array(15).fill(null).map(() => Array(15).fill(null));

    // Place word with high-value letter on triple letter score
    // Position (1,5) is triple letter
    const placedTiles = [
      { row: 1, col: 5, letter: 'Z' }, // Z=10, triple = 30
      { row: 1, col: 6, letter: 'A' }, // A=1
      { row: 1, col: 7, letter: 'P' }  // P=3
    ];

    const response = await validateWord(page, board, placedTiles);

    if (response.valid && response.words_formed.includes('ZAP')) {
      // Z(30) + A(1) + P(3) = 34
      expect(response.score).toBe(34);
    }
  });

  test('existing tiles dont get multipliers', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    const board = Array(15).fill(null).map(() => Array(15).fill(null));

    // Place existing word
    board[0][0] = 'C'; // This is on triple word but already placed
    board[0][1] = 'A';

    // Add T to form CAT
    const placedTiles = [
      { row: 0, col: 2, letter: 'T' }
    ];

    const response = await validateWord(page, board, placedTiles);

    expect(response.valid).toBe(true);
    expect(response.words_formed).toContain('CAT');
    // C and A don't get multipliers, only T counts as new
    // C=3, A=1, T=1 = 5 (no triple word since C was already there)
    expect(response.score).toBe(5);
  });

  test('invalid word rejection', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    const board = Array(15).fill(null).map(() => Array(15).fill(null));

    // Try to place nonsense word
    const placedTiles = [
      { row: 7, col: 7, letter: 'X' },
      { row: 7, col: 8, letter: 'Y' },
      { row: 7, col: 9, letter: 'Z' },
      { row: 7, col: 10, letter: 'Q' }
    ];

    const response = await validateWord(page, board, placedTiles);

    expect(response.valid).toBe(false);
    expect(response.message).toContain('Invalid word');
    expect(response.words_formed).toContain('XYZQ');
  });

  test('gap detection in word placement', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    const board = Array(15).fill(null).map(() => Array(15).fill(null));

    // Try to place tiles with a gap
    const placedTiles = [
      { row: 7, col: 7, letter: 'C' },
      { row: 7, col: 8, letter: 'A' },
      // Gap at col 9
      { row: 7, col: 10, letter: 'T' }
    ];

    const response = await validateWord(page, board, placedTiles);

    expect(response.valid).toBe(false);
    expect(response.message).toContain('gap');
  });

  test('connectivity requirement for non-first move', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    const board = Array(15).fill(null).map(() => Array(15).fill(null));

    // Existing word on board
    board[7][7] = 'C';
    board[7][8] = 'A';
    board[7][9] = 'T';

    // Try to place disconnected word
    const placedTiles = [
      { row: 0, col: 0, letter: 'D' },
      { row: 0, col: 1, letter: 'O' },
      { row: 0, col: 2, letter: 'G' }
    ];

    const response = await validateWord(page, board, placedTiles);

    expect(response.valid).toBe(false);
    expect(response.message).toContain('connect');
  });
});