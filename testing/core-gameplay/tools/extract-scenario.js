#!/usr/bin/env node
/**
 * Scenario Extraction Tool
 *
 * Extracts test scenarios from WikiLetters share URLs
 *
 * Usage:
 *   node extract-scenario.js <shareUrl> --name=<scenarioName>
 *
 * Example:
 *   node extract-scenario.js "https://letters.wiki/?g=ABC123..." --name="high-score-example"
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function extractScenario(shareUrl, scenarioName) {
  console.log(`\nExtracting scenario from: ${shareUrl}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Load the share URL (use localhost for testing)
    const localUrl = shareUrl.replace('https://letters.wiki', 'http://localhost:8085');
    console.log(`Loading: ${localUrl}`);

    await page.goto(localUrl);
    await page.waitForSelector('#game-board', { timeout: 10000 });
    await page.waitForTimeout(1500); // Wait for game to fully load

    // Extract complete game data
    const gameData = await page.evaluate(() => {
      return {
        seed: window.gameState.seed,
        startingWord: window.gameState.startingWord,
        dateStr: window.gameState.dateStr,
        turnHistory: window.gameState.turnHistory,
        turnScores: window.gameState.turnScores,
        finalScore: window.gameState.score,
        isGameOver: window.gameState.isGameOver,
        currentTurn: window.gameState.currentTurn
      };
    });

    console.log(`\nExtracted game data:`);
    console.log(`  Seed: ${gameData.seed}`);
    console.log(`  Starting word: ${gameData.startingWord}`);
    console.log(`  Final score: ${gameData.finalScore}`);
    console.log(`  Turns: ${gameData.turnHistory.length}`);
    console.log(`  Turn scores: ${gameData.turnScores.join(', ')}`);

    // Build scenario JSON
    const scenario = {
      name: scenarioName,
      description: `Game from ${gameData.dateStr} - ${gameData.finalScore} points`,
      source: shareUrl,
      metadata: {
        seed: gameData.seed,
        startingWord: gameData.startingWord,
        dateStr: gameData.dateStr,
        extractedAt: new Date().toISOString()
      },
      expectedOutcomes: {
        turnScores: gameData.turnScores,
        finalScore: gameData.finalScore,
        turnsCompleted: gameData.turnHistory.filter(t => t.tiles && t.tiles.length > 0).length,
        gameCompleted: gameData.isGameOver
      },
      moves: gameData.turnHistory.map((turn, index) => ({
        turn: index + 1,
        tiles: turn.tiles || [],
        expectedScore: gameData.turnScores[index] || 0
      })),
      testValidations: {
        wordValidation: {
          description: "All words formed should be valid"
        },
        scoringValidation: {
          description: "Scoring must match expected values for each turn"
        },
        gameCompletionValidation: {
          description: "Game completes successfully after 5 turns"
        },
        shareUrlValidation: {
          description: "Share URL generates correctly and round-trip matches original"
        }
      }
    };

    // Save scenario file
    const scenariosDir = path.join(__dirname, '../scenarios');
    const scenarioFile = path.join(scenariosDir, `${gameData.seed}-${scenarioName}.json`);

    fs.writeFileSync(scenarioFile, JSON.stringify(scenario, null, 2));
    console.log(`\n✓ Scenario saved to: ${scenarioFile}`);

    // Also create initial baseline
    const baseline = {
      scenarioName: scenarioName,
      lastUpdated: new Date().toISOString(),
      expectedOutcomes: scenario.expectedOutcomes,
      turnDetails: scenario.moves.map((move, index) => ({
        turn: move.turn,
        score: move.expectedScore,
        tilesPlaced: move.tiles.length
      }))
    };

    const baselinesDir = path.join(__dirname, '../baselines');
    const baselineFile = path.join(baselinesDir, `${gameData.seed}-${scenarioName}.baseline.json`);

    fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
    console.log(`✓ Baseline saved to: ${baselineFile}`);

    console.log(`\n✓ Extraction complete!\n`);

    return scenario;

  } catch (error) {
    console.error('Error extracting scenario:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const shareUrl = args[0];
const nameArg = args.find(arg => arg.startsWith('--name='));
const scenarioName = nameArg ? nameArg.split('=')[1] : 'unnamed-scenario';

if (!shareUrl) {
  console.error('Usage: node extract-scenario.js <shareUrl> --name=<scenarioName>');
  console.error('Example: node extract-scenario.js "https://letters.wiki/?g=ABC123" --name="high-score"');
  process.exit(1);
}

// Run extraction
extractScenario(shareUrl, scenarioName)
  .then(() => {
    console.log('Scenario extraction successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Scenario extraction failed:', error);
    process.exit(1);
  });
