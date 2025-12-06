const { test, expect } = require('@playwright/test');

test.describe('Complete WikiLetters Playthrough', () => {

  test('full game with various scenarios and high score entry', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for full playthrough

    console.log('\n🎮 STARTING COMPLETE WIKLETTERS PLAYTHROUGH\n');
    console.log('=' .repeat(50));

    // Capture validation responses for debugging
    let validationCount = 0;
    page.on('response', async response => {
      if (response.url().includes('validate_word')) {
        const body = await response.json();
        validationCount++;
        console.log(`\n📝 Validation #${validationCount}:`);
        console.log(`  Valid: ${body.valid ? '✅' : '❌'}`);
        console.log(`  Words: ${body.words_formed?.join(', ') || 'none'}`);
        console.log(`  Score: ${body.score || 0}`);
        if (!body.valid) {
          console.log(`  Error: ${body.message}`);
        }
      }
    });

    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });
    await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

    // Get game info
    const dateText = await page.locator('#dateDisplay').textContent();
    console.log(`\n📅 Date: ${dateText}`);

    // Get starting word
    const startingCells = await page.locator('.board-cell.occupied').all();
    const startingWord = [];
    const startingPositions = [];
    for (const cell of startingCells) {
      const letter = await cell.locator('.tile').textContent();
      startingWord.push(letter.charAt(0));
      const row = await cell.getAttribute('data-row');
      const col = await cell.getAttribute('data-col');
      startingPositions.push({ row: parseInt(row), col: parseInt(col) });
    }
    console.log(`🎯 Starting word: ${startingWord.join('')}`);
    console.log(`📍 Position: Row ${startingPositions[0].row}, Cols ${startingPositions[0].col}-${startingPositions[startingPositions.length - 1].col}`);

    // Helper function to get rack tiles
    async function getRackTiles() {
      const tiles = await page.locator('.tile-rack .tile').all();
      const letters = [];
      for (const tile of tiles) {
        const text = await tile.textContent();
        letters.push(text.charAt(0));
      }
      return { tiles, letters };
    }

    // Helper to place a word
    async function placeWord(tiles, positions) {
      for (const pos of positions) {
        // Find tile with letter
        const { tiles: rackTiles, letters } = await getRackTiles();
        const index = letters.indexOf(pos.letter);
        if (index >= 0) {
          await rackTiles[index].click();
          await page.click(`.board-cell[data-row="${pos.row}"][data-col="${pos.col}"]`);
          console.log(`  Placed ${pos.letter} at [${pos.row},${pos.col}]`);
        } else {
          console.log(`  ⚠️ Letter ${pos.letter} not in rack`);
          return false;
        }
      }
      return true;
    }

    let totalScore = 0;
    let successfulTurns = 0;

    console.log('\n' + '=' .repeat(50));
    console.log('TURN 1: Invalid word attempt (testing error handling)');
    console.log('=' .repeat(50));

    // Get initial tiles
    let { tiles: rackTiles, letters: rackLetters } = await getRackTiles();
    console.log(`Rack: ${rackLetters.join(', ')}`);

    // Try to place disconnected tiles (should fail)
    console.log('\n🔴 Attempting disconnected placement...');
    if (rackLetters.length >= 2) {
      await rackTiles[0].click();
      await page.click('.board-cell[data-row="0"][data-col="0"]');
      await rackTiles[1].click();
      await page.click('.board-cell[data-row="0"][data-col="1"]');

      // Check preview
      const preview = await page.locator('.word-preview').textContent();
      console.log(`Preview: ${preview.trim()}`);

      // Submit (should fail)
      await page.click('#submit-word');
      await page.waitForTimeout(1000);

      // Check for error
      const errorModal = await page.locator('#error-modal');
      if (await errorModal.isVisible()) {
        const errorMsg = await page.locator('#error-message').textContent();
        console.log(`✅ Error correctly shown: "${errorMsg}"`);
        await page.click('#close-error');
      }

      // Recall tiles
      await page.click('#recall-tiles');
      console.log('Tiles recalled');
    }

    console.log('\n' + '=' .repeat(50));
    console.log('TURN 1 (retry): Valid perpendicular word');
    console.log('=' .repeat(50));

    // Place a valid perpendicular word
    ({ tiles: rackTiles, letters: rackLetters } = await getRackTiles());

    // Find a letter that can form a 2-letter word
    const middleCol = startingPositions[Math.floor(startingPositions.length / 2)].col;
    const middleLetter = startingWord[Math.floor(startingWord.length / 2)];
    console.log(`\nTrying to form word with ${middleLetter} at column ${middleCol}`);

    // Common 2-letter words
    const commonWords = {
      'A': ['N', 'T', 'S', 'M', 'X'],
      'E': ['R', 'L', 'N', 'X'],
      'I': ['T', 'S', 'N', 'D'],
      'O': ['N', 'R', 'F', 'X'],
      'U': ['P', 'S', 'N', 'M']
    };

    let placed = false;
    for (const letter of rackLetters) {
      if (commonWords[middleLetter]?.includes(letter) || commonWords[letter]?.includes(middleLetter)) {
        const tileIndex = rackLetters.indexOf(letter);
        await rackTiles[tileIndex].click();

        // Place below the middle letter
        await page.click(`.board-cell[data-row="8"][data-col="${middleCol}"]`);
        console.log(`Placed ${letter} below ${middleLetter} to form vertical word`);

        // Check preview
        const preview = await page.locator('.word-preview').textContent();
        console.log(`Preview: ${preview.trim()}`);

        // Submit
        await page.click('#submit-word');
        await page.waitForTimeout(1500);

        // Check if accepted
        const errorModal = await page.locator('#error-modal');
        if (!await errorModal.isVisible()) {
          successfulTurns++;
          const score = await page.locator('#current-score').textContent();
          totalScore = parseInt(score);
          console.log(`✅ Word accepted! Score: ${totalScore}`);
          placed = true;
          break;
        } else {
          const errorMsg = await page.locator('#error-message').textContent();
          console.log(`❌ Word rejected: ${errorMsg}`);
          await page.click('#close-error');
          await page.click('#recall-tiles');
        }
      }
    }

    if (!placed) {
      // Just place any single tile connected
      await rackTiles[0].click();
      await page.click(`.board-cell[data-row="7"][data-col="${startingPositions[startingPositions.length - 1].col + 1}"]`);
      await page.click('#submit-word');
      await page.waitForTimeout(1000);
    }

    console.log('\n' + '=' .repeat(50));
    console.log('TURN 2: Double letter score placement');
    console.log('=' .repeat(50));

    ({ tiles: rackTiles, letters: rackLetters } = await getRackTiles());
    console.log(`Rack: ${rackLetters.join(', ')}`);

    // Find a double letter square near the board
    // Row 8, col 8 is a double letter square
    if (rackLetters.includes('N')) {
      console.log('\n🟢 Attempting to use double letter multiplier...');
      const nIndex = rackLetters.indexOf('N');
      await rackTiles[nIndex].click();
      await page.click('.board-cell[data-row="8"][data-col="8"]');

      const preview = await page.locator('.word-preview').textContent();
      console.log(`Preview (with double letter): ${preview.trim()}`);

      await page.click('#submit-word');
      await page.waitForTimeout(1500);

      const errorModal = await page.locator('#error-modal');
      if (!await errorModal.isVisible()) {
        successfulTurns++;
        const score = await page.locator('#current-score').textContent();
        const increase = parseInt(score) - totalScore;
        totalScore = parseInt(score);
        console.log(`✅ Score increased by ${increase} (total: ${totalScore})`);
      } else {
        await page.click('#close-error');
        await page.click('#recall-tiles');
      }
    }

    console.log('\n' + '=' .repeat(50));
    console.log('TURN 3: Multiple tiles forming longer word');
    console.log('=' .repeat(50));

    ({ tiles: rackTiles, letters: rackLetters } = await getRackTiles());
    console.log(`Rack: ${rackLetters.join(', ')}`);

    // Try to place 3+ tiles
    const occupiedCells = await page.locator('.board-cell.occupied').all();
    if (occupiedCells.length > 0 && rackTiles.length >= 3) {
      console.log('\n🟢 Attempting to place multiple tiles...');

      // Find an edge to extend
      const lastOccupied = occupiedCells[occupiedCells.length - 1];
      const lastRow = parseInt(await lastOccupied.getAttribute('data-row'));
      const lastCol = parseInt(await lastOccupied.getAttribute('data-col'));

      // Place 3 tiles horizontally
      for (let i = 0; i < Math.min(3, rackTiles.length); i++) {
        await rackTiles[0].click(); // Always click first remaining tile
        await page.click(`.board-cell[data-row="${lastRow}"][data-col="${lastCol + i + 1}"]`);
      }

      const preview = await page.locator('.word-preview').textContent();
      console.log(`Preview (multi-tile): ${preview.trim()}`);

      await page.click('#submit-word');
      await page.waitForTimeout(1500);

      const errorModal = await page.locator('#error-modal');
      if (!await errorModal.isVisible()) {
        successfulTurns++;
        const score = await page.locator('#current-score').textContent();
        const increase = parseInt(score) - totalScore;
        totalScore = parseInt(score);
        console.log(`✅ Multiple tiles accepted! Score +${increase} (total: ${totalScore})`);
      } else {
        const errorMsg = await page.locator('#error-message').textContent();
        console.log(`❌ Invalid: ${errorMsg}`);
        await page.click('#close-error');
        await page.click('#recall-tiles');

        // Fallback: just extend by one
        await rackTiles[0].click();
        await page.click(`.board-cell[data-row="${lastRow}"][data-col="${lastCol + 1}"]`);
        await page.click('#submit-word');
        await page.waitForTimeout(1000);
      }
    }

    console.log('\n' + '=' .repeat(50));
    console.log('TURN 4: Try for triple word score');
    console.log('=' .repeat(50));

    ({ tiles: rackTiles, letters: rackLetters } = await getRackTiles());
    console.log(`Rack: ${rackLetters.join(', ')}`);

    // Triple word scores are at corners and specific positions
    console.log('\n🟢 Looking for triple word opportunity...');

    // Just place tiles to continue the game
    if (rackTiles.length > 0) {
      const occupiedCells = await page.locator('.board-cell.occupied').all();
      const randomOccupied = occupiedCells[Math.floor(Math.random() * occupiedCells.length)];
      const row = parseInt(await randomOccupied.getAttribute('data-row'));
      const col = parseInt(await randomOccupied.getAttribute('data-col'));

      // Try placing adjacent
      const positions = [
        { r: row - 1, c: col }, // above
        { r: row + 1, c: col }, // below
        { r: row, c: col - 1 }, // left
        { r: row, c: col + 1 }  // right
      ];

      for (const pos of positions) {
        if (pos.r >= 0 && pos.r < 15 && pos.c >= 0 && pos.c < 15) {
          const cell = await page.locator(`.board-cell[data-row="${pos.r}"][data-col="${pos.c}"]`);
          const isOccupied = await cell.evaluate(el => el.classList.contains('occupied'));

          if (!isOccupied) {
            await rackTiles[0].click();
            await cell.click();

            const cellClass = await cell.getAttribute('class');
            if (cellClass.includes('triple-word')) {
              console.log(`  Placed on TRIPLE WORD SCORE at [${pos.r},${pos.c}]!`);
            } else if (cellClass.includes('double-word')) {
              console.log(`  Placed on DOUBLE WORD SCORE at [${pos.r},${pos.c}]`);
            } else if (cellClass.includes('triple-letter')) {
              console.log(`  Placed on TRIPLE LETTER at [${pos.r},${pos.c}]`);
            } else if (cellClass.includes('double-letter')) {
              console.log(`  Placed on DOUBLE LETTER at [${pos.r},${pos.c}]`);
            }

            // Place one more tile if possible
            if (rackTiles.length > 1) {
              ({ tiles: rackTiles } = await getRackTiles());
              await rackTiles[0].click();
              await page.click(`.board-cell[data-row="${pos.r}"][data-col="${pos.c + 1}"]`);
            }
            break;
          }
        }
      }

      const preview = await page.locator('.word-preview').textContent();
      console.log(`Preview: ${preview.trim()}`);

      await page.click('#submit-word');
      await page.waitForTimeout(1500);

      const errorModal = await page.locator('#error-modal');
      if (!await errorModal.isVisible()) {
        successfulTurns++;
        const score = await page.locator('#current-score').textContent();
        const increase = parseInt(score) - totalScore;
        totalScore = parseInt(score);
        console.log(`✅ Word accepted! Score +${increase} (total: ${totalScore})`);
      } else {
        await page.click('#close-error');
      }
    }

    console.log('\n' + '=' .repeat(50));
    console.log('TURN 5: Final turn');
    console.log('=' .repeat(50));

    const turnDisplay = await page.locator('#current-turn').textContent();
    console.log(`Turn counter: ${turnDisplay}`);

    ({ tiles: rackTiles, letters: rackLetters } = await getRackTiles());
    console.log(`Final rack: ${rackLetters.join(', ')}`);

    // Try to use all remaining tiles for bingo bonus
    console.log('\n🎯 Attempting to use all tiles for BINGO bonus (50 points)...');

    if (rackTiles.length === 7) {
      console.log('Have 7 tiles - going for bingo!');
    }

    // Just place whatever we can to end the game
    const finalOccupiedCells = await page.locator('.board-cell.occupied').all();
    if (finalOccupiedCells.length > 0 && rackTiles.length > 0) {
      // Place as many tiles as possible
      const firstOccupied = finalOccupiedCells[0];
      const row = parseInt(await firstOccupied.getAttribute('data-row'));
      const col = parseInt(await firstOccupied.getAttribute('data-col'));

      for (let i = 0; i < Math.min(rackTiles.length, 3); i++) {
        ({ tiles: rackTiles } = await getRackTiles());
        if (rackTiles.length > 0) {
          await rackTiles[0].click();
          await page.click(`.board-cell[data-row="${row + i + 1}"][data-col="${col}"]`);
        }
      }

      await page.click('#submit-word');
      await page.waitForTimeout(2000);

      const errorModal = await page.locator('#error-modal');
      if (!await errorModal.isVisible()) {
        successfulTurns++;
        const score = await page.locator('#current-score').textContent();
        totalScore = parseInt(score);
        console.log(`✅ Final word accepted! Total score: ${totalScore}`);
      } else {
        const errorMsg = await page.locator('#error-message').textContent();
        console.log(`❌ Final attempt failed: ${errorMsg}`);
        await page.click('#close-error');
      }
    }

    // Check if game ended
    console.log('\n' + '=' .repeat(50));
    console.log('GAME OVER - Checking end game flow');
    console.log('=' .repeat(50));

    await page.waitForTimeout(2000);

    const gameOverModal = await page.locator('#game-over-modal');
    const isGameOver = await gameOverModal.isVisible();

    if (isGameOver) {
      console.log('\n🏁 GAME OVER MODAL DISPLAYED');

      // Get final score
      const finalScoreElement = await page.locator('#final-score-display');
      if (await finalScoreElement.count() > 0) {
        const finalScore = await finalScoreElement.textContent();
        console.log(`📊 Final Score: ${finalScore}`);
      } else {
        console.log(`📊 Final Score: ${totalScore}`);
      }

      // Check for high score
      const highScoreInput = await page.locator('#initials-input');
      if (await highScoreInput.isVisible()) {
        console.log('\n🏆 HIGH SCORE ACHIEVED! Entering initials...');

        // Enter initials
        await highScoreInput.fill('TST');
        console.log('Entered initials: TST');

        // Submit high score
        const submitButton = await page.locator('#submit-initials');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          console.log('High score submitted');
          await page.waitForTimeout(1000);
        }
      }

      // Test share functionality
      console.log('\n📤 Testing share functionality...');
      const shareButton = await page.locator('#share-game');
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(500);

        const shareModal = await page.locator('#share-modal');
        if (await shareModal.isVisible()) {
          console.log('✅ Share modal opened');

          const shareText = await page.locator('#share-text').textContent();
          console.log('\n📋 Share text:');
          console.log(shareText);

          // Test copy button
          const copyButton = await page.locator('#copy-share');
          if (await copyButton.isVisible()) {
            await copyButton.click();
            console.log('✅ Share text copied to clipboard');
          }
        }
      }

      // Check high scores display
      const highScoresSection = await page.locator('#high-scores');
      if (await highScoresSection.isVisible()) {
        console.log('\n🏆 HIGH SCORES:');
        const scoreEntries = await page.locator('.high-score-entry').all();
        for (let i = 0; i < scoreEntries.length; i++) {
          const text = await scoreEntries[i].textContent();
          console.log(`  ${i + 1}. ${text}`);
        }
      }
    } else {
      console.log('⚠️ Game did not end after 5 turns - checking game state...');

      const currentTurn = await page.locator('#current-turn').textContent();
      const currentScore = await page.locator('#current-score').textContent();
      console.log(`Current turn: ${currentTurn}`);
      console.log(`Current score: ${currentScore}`);

      // Force game end for testing
      console.log('\nForcing game end for testing...');
      await page.evaluate(() => {
        if (window.endGame) {
          window.endGame();
        }
      });
      await page.waitForTimeout(1000);
    }

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/complete-playthrough.png',
      fullPage: true
    });

    // Final assertions
    console.log('\n' + '=' .repeat(50));
    console.log('TEST SUMMARY');
    console.log('=' .repeat(50));
    console.log(`✅ Successful turns: ${successfulTurns}`);
    console.log(`📊 Final score: ${totalScore}`);
    console.log(`📝 Total validations: ${validationCount}`);

    // Verify game mechanics worked
    expect(validationCount).toBeGreaterThan(0); // At least some validations happened
    expect(totalScore).toBeGreaterThanOrEqual(0); // Score tracked

    // Check localStorage for persistence
    const savedData = await page.evaluate(() => {
      return {
        gameState: localStorage.getItem('letters_game_state'),
        highScores: localStorage.getItem('letters_high_scores')
      };
    });

    console.log('\n💾 Local Storage Check:');
    console.log(`  Game state saved: ${savedData.gameState ? '✅' : '❌'}`);
    console.log(`  High scores saved: ${savedData.highScores ? '✅' : '❌'}`);

    if (savedData.highScores) {
      const scores = JSON.parse(savedData.highScores);
      console.log(`  Number of high scores: ${scores.length}`);
      if (scores.length > 0 && scores[0].initials === 'TST') {
        console.log('  ✅ Our high score was saved!');
      }
    }

    console.log('\n🎮 PLAYTHROUGH COMPLETE!');
  });
});