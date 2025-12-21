#!/usr/bin/env node
/**
 * Automated Scenario Generator for RogueLetters
 *
 * Smart strategy: Use known valid 2-letter words to find guaranteed valid plays.
 * For each board letter, check if any rack tile can form a valid 2-letter word.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { TWO_LETTER_WORDS, findValid2LetterPlays } = require('../data/valid-words');

async function generateScenario(seed, scenarioName) {
  console.log(`\n=== Generating RogueLetters Scenario ===`);
  console.log(`Seed: ${seed}`);
  console.log(`Name: ${scenarioName}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Load game with seed and no animations
    await page.goto(`http://localhost:8086/?seed=${seed}&animate=0`);
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForFunction(() =>
      window.gameState && window.gameState.rackTiles && window.gameState.rackTiles.length > 0,
      { timeout: 15000 }
    );
    await page.waitForTimeout(500);

    const startingWord = await page.evaluate(() => window.gameState.startingWord);
    console.log(`Starting word: ${startingWord}`);

    // Play 5 turns
    for (let turn = 1; turn <= 5; turn++) {
      console.log(`\n--- Turn ${turn} ---`);

      // Get current rack tiles
      const rackTiles = await page.evaluate(() =>
        window.gameState.rackTiles.map(t => typeof t === 'object' ? t.letter : t)
      );
      console.log(`Rack: ${rackTiles.join(', ')}`);

      // Get board state with positions
      const boardState = await page.evaluate(() => {
        const board = window.gameState.board;
        const letters = [];
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (board[r][c] !== null) {
              letters.push({ letter: board[r][c], row: r, col: c });
            }
          }
        }
        return { board, letters };
      });

      // Debug: show actual board positions
      if (turn === 1) {
        console.log(`Board letters: ${boardState.letters.map(l => `${l.letter}@(${l.row},${l.col})`).join(', ')}`);
      }

      // Find all valid 2-letter plays
      const validPlays = [];

      for (const boardTile of boardState.letters) {
        const plays = findValid2LetterPlays(boardTile.letter, rackTiles);

        for (const play of plays) {
          // Determine target position based on direction
          // For horizontal words (left/right of board letter)
          const leftPos = { row: boardTile.row, col: boardTile.col - 1 };
          const rightPos = { row: boardTile.row, col: boardTile.col + 1 };
          // For vertical words (above/below board letter)
          const abovePos = { row: boardTile.row - 1, col: boardTile.col };
          const belowPos = { row: boardTile.row + 1, col: boardTile.col };

          // Check each position
          const positions = [
            { pos: leftPos, word: play.rackLetter + boardTile.letter, dir: 'left' },
            { pos: rightPos, word: boardTile.letter + play.rackLetter, dir: 'right' },
            { pos: abovePos, word: play.rackLetter + boardTile.letter, dir: 'above' },
            { pos: belowPos, word: boardTile.letter + play.rackLetter, dir: 'below' }
          ];

          for (const { pos, word, dir } of positions) {
            // Check if position is valid (in bounds and empty)
            if (pos.row >= 0 && pos.row < 9 && pos.col >= 0 && pos.col < 9) {
              if (boardState.board[pos.row][pos.col] === null) {
                // Check if the word formed is valid
                if (TWO_LETTER_WORDS.has(word.toUpperCase())) {
                  validPlays.push({
                    rackLetter: play.rackLetter,
                    targetRow: pos.row,
                    targetCol: pos.col,
                    word: word,
                    direction: dir,
                    boardLetter: boardTile.letter,
                    boardRow: boardTile.row,
                    boardCol: boardTile.col
                  });
                }
              }
            }
          }
        }
      }

      console.log(`  Found ${validPlays.length} potential 2-letter plays`);

      if (validPlays.length === 0) {
        console.log(`  No valid 2-letter plays found. Skipping turn...`);
        continue;
      }

      // Try each play until one works
      let turnComplete = false;
      const maxAttempts = Math.min(validPlays.length, 20); // Limit attempts

      for (let attempt = 0; attempt < maxAttempts && !turnComplete; attempt++) {
        const chosenPlay = validPlays[attempt];
        console.log(`  Attempt ${attempt + 1}: ${chosenPlay.rackLetter} at (${chosenPlay.targetRow}, ${chosenPlay.targetCol}) → "${chosenPlay.word}" (${chosenPlay.direction} of ${chosenPlay.boardLetter})`);

        // Find the rack tile index for this letter
        const tileIndex = await page.evaluate((letter) => {
          const tiles = document.querySelectorAll('#tile-rack-board .tile:not(.placed)');
          for (let i = 0; i < tiles.length; i++) {
            const tileLetter = tiles[i].dataset.letter;
            if (tileLetter === letter) return i;
          }
          return -1;
        }, chosenPlay.rackLetter);

        if (tileIndex === -1) {
          console.log(`    Could not find ${chosenPlay.rackLetter} in rack`);
          continue;
        }

        // Click the rack tile
        await page.evaluate((idx) => {
          const tiles = document.querySelectorAll('#tile-rack-board .tile:not(.placed)');
          if (tiles[idx]) tiles[idx].click();
        }, tileIndex);
        await page.waitForTimeout(150);

        // Click the target cell
        await page.evaluate(({row, col}) => {
          const cell = document.querySelector(
            `.board-cell:not(.rack-cell)[data-row="${row}"][data-col="${col}"]`
          );
          if (cell) cell.click();
        }, { row: chosenPlay.targetRow, col: chosenPlay.targetCol });
        await page.waitForTimeout(400);

        // Check if word is valid (button shows →)
        const btnText = await page.evaluate(() => {
          const btn = document.querySelector('button.total-score');
          return btn?.textContent || '';
        });

        if (btnText.includes('→')) {
          // Valid! Submit
          await page.evaluate(() => {
            document.querySelector('button.total-score')?.click();
          });
          await page.waitForTimeout(600);

          const score = await page.evaluate(() =>
            window.gameState.turnScores[window.gameState.turnScores.length - 1]
          );
          console.log(`  ✓ Turn ${turn} complete: ${score} points`);
          turnComplete = true;
        } else {
          // Invalid - recall tiles
          await page.evaluate(() => {
            const recallBtn = document.getElementById('recall-tiles');
            if (recallBtn) recallBtn.click();
          });
          await page.waitForTimeout(200);
        }
      }

      if (!turnComplete) {
        console.log(`  Could not complete turn after ${maxAttempts} attempts`);
      }

      // Check if game is over
      const isOver = await page.evaluate(() => window.gameState.isGameOver);
      if (isOver) {
        console.log(`\nRound complete!`);
        break;
      }
    }

    // Extract scenario data
    console.log(`\n--- Extracting scenario data ---`);

    const gameData = await page.evaluate(() => ({
      type: 'rogueletters',
      seed: window.gameState.seed,
      startingWord: window.gameState.startingWord,
      set: window.runState?.set || 1,
      round: window.runState?.round || 1,
      targetScore: window.runState?.targetScore || 40,
      turnHistory: window.gameState.turnHistory,
      turnScores: window.gameState.turnScores,
      finalScore: window.gameState.score,
      isRoundComplete: window.gameState.isGameOver
    }));

    console.log(`Final score: ${gameData.finalScore}`);
    console.log(`Turn scores: ${gameData.turnScores.join(', ')}`);
    console.log(`Turns completed: ${gameData.turnHistory.filter(t => t.tiles?.length > 0).length}`);

    if (gameData.turnHistory.filter(t => t.tiles?.length > 0).length === 0) {
      console.log(`\n⚠ Warning: No valid moves were found. Scenario will be a placeholder.`);
    }

    // Build and save scenario
    const scenario = {
      name: scenarioName,
      description: `Set ${gameData.set} Round ${gameData.round} - ${gameData.finalScore} points`,
      type: 'rogueletters',
      metadata: {
        seed: gameData.seed,
        startingWord: gameData.startingWord,
        set: gameData.set,
        round: gameData.round,
        targetScore: gameData.targetScore,
        extractedAt: new Date().toISOString(),
        generatedAutomatically: true
      },
      expectedOutcomes: {
        turnScores: gameData.turnScores,
        finalScore: gameData.finalScore,
        turnsCompleted: gameData.turnHistory.filter(t => t.tiles && t.tiles.length > 0).length,
        roundComplete: gameData.isRoundComplete,
        targetMet: gameData.finalScore >= gameData.targetScore
      },
      moves: gameData.turnHistory.map((turn, index) => ({
        turn: index + 1,
        tiles: turn.tiles || [],
        expectedScore: gameData.turnScores[index] || 0
      })),
      testValidations: {
        wordValidation: { description: "All words formed should be valid" },
        scoringValidation: { description: "Scoring must match expected values" },
        roundCompletionValidation: { description: "Round completes after 5 turns" },
        targetValidation: { description: `Score should ${gameData.finalScore >= gameData.targetScore ? 'meet' : 'be below'} target of ${gameData.targetScore}` }
      }
    };

    // Save scenario
    const scenariosDir = path.join(__dirname, '../scenarios');
    if (!fs.existsSync(scenariosDir)) {
      fs.mkdirSync(scenariosDir, { recursive: true });
    }
    const filename = `rogue-${scenarioName}.json`;
    const filepath = path.join(scenariosDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(scenario, null, 2));
    console.log(`\n✓ Scenario saved to: ${filepath}`);

    return scenario;

  } catch (error) {
    console.error('Error generating scenario:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Parse args
const args = process.argv.slice(2);
const seedArg = args.find(a => a.startsWith('--seed='));
const nameArg = args.find(a => a.startsWith('--name='));

const seed = seedArg ? seedArg.split('=')[1] : String(Date.now());
const name = nameArg ? nameArg.split('=')[1] : 'auto-generated';

generateScenario(seed, name)
  .then(() => {
    console.log('\nScenario generation complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed:', err);
    process.exit(1);
  });
