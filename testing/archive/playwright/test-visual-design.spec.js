// @ts-check
const { test, expect, devices } = require('@playwright/test');

test.describe('Visual Design Verification', () => {

  test('desktop view matches design requirements', async ({ page }) => {
    console.log('\n=== DESKTOP VIEW TEST (1920x1080) ===\n');

    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForTimeout(2000);

    // Take screenshot for manual review
    await page.screenshot({ path: 'test-results/desktop-view.png', fullPage: true });

    // Check header
    console.log('Checking header...');
    const header = await page.locator('header');
    const headerVisible = await header.isVisible();
    expect(headerVisible).toBe(true);

    const title = await page.locator('header h1').textContent();
    console.log('✓ Game title:', title);
    expect(title).toBe('WikiLetters');

    const dateElement = await page.locator('.header-date').isVisible();
    console.log('✓ Date display visible:', dateElement);
    expect(dateElement).toBe(true);

    // Check game info section
    console.log('\nChecking game info section...');
    const turnCounter = await page.locator('#current-turn').textContent();
    console.log('✓ Turn counter:', turnCounter);
    expect(turnCounter).toMatch(/\d\/5/);

    const score = await page.locator('#current-score').textContent();
    console.log('✓ Score display:', score);

    const retries = await page.locator('#retries-left').textContent();
    console.log('✓ Retries counter:', retries);

    // Check board
    console.log('\nChecking game board...');
    const board = await page.locator('#game-board');
    const boardVisible = await board.isVisible();
    console.log('✓ Board visible:', boardVisible);
    expect(boardVisible).toBe(true);

    // Check board is 15x15
    const cells = await page.locator('.board-cell').count();
    console.log('✓ Board cells count:', cells);
    expect(cells).toBe(225); // 15x15

    // Check multiplier cells are visible
    const doubleWord = await page.locator('.board-cell.double-word').count();
    console.log('✓ Double word cells:', doubleWord);
    expect(doubleWord).toBeGreaterThan(0);

    const tripleWord = await page.locator('.board-cell.triple-word').count();
    console.log('✓ Triple word cells:', tripleWord);
    expect(tripleWord).toBeGreaterThan(0);

    // Check center star
    const center = await page.locator('.board-cell.center').count();
    console.log('✓ Center star cell:', center);
    expect(center).toBe(1);

    // Check tile rack
    console.log('\nChecking tile rack...');
    const tileRack = await page.locator('#tile-rack');
    const rackVisible = await tileRack.isVisible();
    console.log('✓ Tile rack visible:', rackVisible);
    expect(rackVisible).toBe(true);

    const tiles = await page.locator('#tile-rack .tile').count();
    console.log('✓ Tiles in rack:', tiles);
    expect(tiles).toBeGreaterThan(0);

    // Check control buttons
    console.log('\nChecking control buttons...');
    const submitBtn = await page.locator('#submit-word').isVisible();
    console.log('✓ Submit button visible:', submitBtn);
    expect(submitBtn).toBe(true);

    const recallBtn = await page.locator('#recall-tiles').isVisible();
    console.log('✓ Recall button visible:', recallBtn);
    expect(recallBtn).toBe(true);

    const shuffleBtn = await page.locator('#shuffle-rack').isVisible();
    console.log('✓ Shuffle button visible:', shuffleBtn);
    expect(shuffleBtn).toBe(true);

    const retryBtn = await page.locator('#retry-turn').isVisible();
    console.log('✓ Retry button visible:', retryBtn);
    expect(retryBtn).toBe(true);

    // Check layout is centered
    console.log('\nChecking layout...');
    const app = await page.locator('#app');
    const appBox = await app.boundingBox();
    console.log('✓ App container width:', appBox.width);
    expect(appBox.width).toBeLessThanOrEqual(900); // max-width: 900px

    // Check color scheme
    console.log('\nChecking visual style...');
    const headerBg = await header.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    console.log('✓ Header background:', headerBg);

    const boardBg = await board.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    console.log('✓ Board background:', boardBg);

    console.log('\n✅ Desktop view test complete!');
  });

  test('mobile view is responsive', async ({ page }) => {
    console.log('\n=== MOBILE VIEW TEST (iPhone 12) ===\n');

    // Use iPhone 12 viewport
    const iPhone = devices['iPhone 12'];
    await page.setViewportSize(iPhone.viewport);
    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/mobile-view.png', fullPage: true });

    // Check header is visible
    console.log('Checking mobile header...');
    const header = await page.locator('header');
    const headerVisible = await header.isVisible();
    console.log('✓ Header visible:', headerVisible);
    expect(headerVisible).toBe(true);

    // Check game board scales down
    console.log('\nChecking mobile board scaling...');
    const board = await page.locator('#game-board');
    const boardBox = await board.boundingBox();
    console.log('✓ Board width:', boardBox.width);
    expect(boardBox.width).toBeLessThan(400); // Should fit mobile width

    // Check cells are smaller on mobile
    const firstCell = await page.locator('.board-cell').first();
    const cellBox = await firstCell.boundingBox();
    console.log('✓ Cell size on mobile:', `${cellBox.width}x${cellBox.height}`);
    expect(cellBox.width).toBeLessThanOrEqual(20); // Mobile size from CSS

    // Check tile rack is visible
    console.log('\nChecking mobile tile rack...');
    const tileRack = await page.locator('#tile-rack');
    const rackVisible = await tileRack.isVisible();
    console.log('✓ Tile rack visible:', rackVisible);
    expect(rackVisible).toBe(true);

    // Check tiles are smaller on mobile
    const firstTile = await page.locator('#tile-rack .tile').first();
    if (await firstTile.count() > 0) {
      const tileBox = await firstTile.boundingBox();
      console.log('✓ Tile size on mobile:', `${tileBox.width}x${tileBox.height}`);
      expect(tileBox.width).toBeLessThanOrEqual(35); // Mobile size from CSS
    }

    // Check buttons stack vertically on mobile
    console.log('\nChecking mobile button layout...');
    const controls = await page.locator('#game-controls');
    const controlsStyle = await controls.evaluate(el =>
      window.getComputedStyle(el).flexDirection
    );
    console.log('✓ Controls flex direction:', controlsStyle);
    expect(controlsStyle).toBe('column'); // Should stack vertically

    // Check buttons are full width
    const submitBtn = await page.locator('#submit-word');
    const btnBox = await submitBtn.boundingBox();
    const controlsBox = await controls.boundingBox();
    console.log('✓ Button width:', btnBox.width, 'Container width:', controlsBox.width);
    expect(Math.abs(btnBox.width - controlsBox.width)).toBeLessThan(50); // Nearly full width

    // Check no horizontal scroll
    console.log('\nChecking for horizontal scroll...');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    console.log('✓ Body width:', bodyWidth, 'Viewport width:', viewportWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);

    console.log('\n✅ Mobile view test complete!');
  });

  test('visual elements match design requirements', async ({ page }) => {
    console.log('\n=== VISUAL ELEMENTS TEST ===\n');

    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForTimeout(2000);

    // Check Wikipedia-themed branding
    console.log('Checking Wikipedia branding...');
    const title = await page.locator('header h1').textContent();
    expect(title).toContain('WikiLetters');
    console.log('✓ WikiLetters branding present');

    // Check starting word is displayed
    console.log('\nChecking starting word display...');
    const startingWordCells = [];
    for (let col = 4; col <= 10; col++) {
      const cell = await page.locator(`[data-row="7"][data-col="${col}"]`);
      if (await cell.locator('.tile').count() > 0) {
        const letter = await cell.locator('.tile-letter').textContent();
        startingWordCells.push(letter);
      }
    }
    console.log('✓ Starting word on board:', startingWordCells.join(''));
    expect(startingWordCells.length).toBeGreaterThan(0);

    // Check color scheme matches design
    console.log('\nChecking color scheme...');

    // Check multiplier colors
    const doubleWordCell = await page.locator('.board-cell.double-word').first();
    const dwColor = await doubleWordCell.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    console.log('✓ Double word color:', dwColor);

    const tripleWordCell = await page.locator('.board-cell.triple-word').first();
    const twColor = await tripleWordCell.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    console.log('✓ Triple word color:', twColor);

    // Check gradient background
    const body = await page.locator('body');
    const bodyBg = await body.evaluate(el =>
      window.getComputedStyle(el).background
    );
    console.log('✓ Background gradient present:', bodyBg.includes('gradient'));

    // Check tile styling
    console.log('\nChecking tile design...');
    const tile = await page.locator('#tile-rack .tile').first();
    if (await tile.count() > 0) {
      const tileBg = await tile.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );
      console.log('✓ Tile background:', tileBg);

      const tileBorder = await tile.evaluate(el =>
        window.getComputedStyle(el).border
      );
      console.log('✓ Tile border:', tileBorder);

      // Check tile has letter and score
      const hasLetter = await tile.locator('.tile-letter').count() > 0;
      const hasScore = await tile.locator('.tile-score').count() > 0;
      console.log('✓ Tile has letter:', hasLetter, 'Has score:', hasScore);
      expect(hasLetter).toBe(true);
      expect(hasScore).toBe(true);
    }

    // Check animations are defined
    console.log('\nChecking animations...');
    const styleSheet = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets)
        .flatMap(sheet => {
          try {
            return Array.from(sheet.cssRules);
          } catch {
            return [];
          }
        });

      const animations = styles.filter(rule =>
        rule.cssText && rule.cssText.includes('@keyframes')
      );

      return animations.length > 0;
    });
    console.log('✓ Animations defined:', styleSheet);

    // Check hover effects
    console.log('\nChecking interactive effects...');
    const boardCell = await page.locator('.board-cell:not(.occupied)').first();
    await boardCell.hover();
    const hoverTransform = await boardCell.evaluate(el =>
      window.getComputedStyle(el).transform
    );
    console.log('✓ Board cell hover effect:', hoverTransform !== 'none');

    console.log('\n✅ Visual elements test complete!');
  });

  test('game over screen visual design', async ({ page }) => {
    console.log('\n=== GAME OVER SCREEN TEST ===\n');

    await page.goto('http://localhost:8085/?seed=20250120');
    await page.waitForTimeout(1500);

    // Trigger game over
    await page.evaluate(() => {
      window.gameState.score = 437;
      window.gameState.turnHistory = [
        { score: 85 }, { score: 92 }, { score: 78 },
        { score: 89 }, { score: 93 }
      ];
      window.endGame();
    });

    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'test-results/game-over-view.png', fullPage: true });

    console.log('Checking game over screen design...');

    // Check game over section is visible
    const gameOverSection = await page.locator('#game-over-section');
    const isVisible = await gameOverSection.isVisible();
    console.log('✓ Game over section visible:', isVisible);
    expect(isVisible).toBe(true);

    // Check score display formatting
    const scoreDisplay = await page.locator('#final-score-display');
    const scoreNumber = await scoreDisplay.locator('.final-score-number').textContent();
    const scoreLabel = await scoreDisplay.locator('.final-score-label').textContent();
    console.log('✓ Final score:', scoreNumber, scoreLabel);
    expect(scoreNumber).toBe('437');
    expect(scoreLabel).toBe('points');

    // Check arcade-style name input
    const nameInput = await page.locator('#player-name');
    const placeholder = await nameInput.getAttribute('placeholder');
    const maxLength = await nameInput.getAttribute('maxlength');
    const style = await nameInput.getAttribute('style');
    console.log('✓ Arcade name input - Placeholder:', placeholder, 'Max:', maxLength);
    expect(placeholder).toBe('AAA');
    expect(maxLength).toBe('3');
    expect(style).toContain('uppercase');

    // Check share button
    const shareBtn = await page.locator('#share-game');
    const shareVisible = await shareBtn.isVisible();
    console.log('✓ Share button visible:', shareVisible);
    expect(shareVisible).toBe(true);

    // Check high scores section appears
    const highScoresSection = await page.locator('#high-scores-section');
    const scoresVisible = await highScoresSection.isVisible();
    console.log('✓ High scores section visible:', scoresVisible);
    expect(scoresVisible).toBe(true);

    console.log('\n✅ Game over screen test complete!');
  });
});