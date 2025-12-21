#!/usr/bin/env node
/**
 * RogueLetters Scenario Extraction Tool
 *
 * Two modes of operation:
 *
 * 1. INTERACTIVE MODE (default):
 *    Opens a browser with a fresh game, you play through it,
 *    then it extracts the scenario data.
 *
 *    Usage: node extract-rogueletters-scenario.js --name="my-scenario"
 *
 * 2. SEED MODE:
 *    Uses a specific seed for reproducibility.
 *
 *    Usage: node extract-rogueletters-scenario.js --seed=1700000000001 --name="my-scenario"
 *
 * 3. CONSOLE SNIPPET MODE:
 *    Prints a code snippet to paste in the browser console.
 *
 *    Usage: node extract-rogueletters-scenario.js --snippet
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Console snippet for manual extraction
const CONSOLE_SNIPPET = `
// RogueLetters Scenario Extraction - Paste this in browser console after completing a round
(function() {
  const data = {
    type: 'rogueletters',
    seed: gameState.seed,
    startingWord: gameState.startingWord,
    set: runState?.set || 1,
    round: runState?.round || 1,
    targetScore: runState?.targetScore || 40,
    turnHistory: gameState.turnHistory,
    turnScores: gameState.turnScores,
    finalScore: gameState.score,
    isRoundComplete: gameState.isGameOver,
    coins: runState?.coins || 0,
    rackTilesAtStart: gameState.turnHistory?.[0]?.originalRack || []
  };

  // Calculate earnings if in run mode
  if (runState?.isRunMode && gameState.isGameOver) {
    const roundInSet = ((runState.round - 1) % 3) + 1;
    const basePayout = [3, 4, 5][roundInSet - 1] || 3;
    const extra = Math.max(0, gameState.score - runState.targetScore);
    const bonusThreshold = Math.floor(runState.targetScore * 0.25);
    const extraBonus = bonusThreshold > 0 ? Math.floor(extra / bonusThreshold) : 0;
    data.earnings = {
      base: basePayout,
      extraPoints: extra,
      bonusThreshold: bonusThreshold,
      extraBonus: extraBonus,
      total: basePayout + extraBonus
    };
    data.targetMet = gameState.score >= runState.targetScore;
  }

  console.log('\\n=== RogueLetters Scenario Data ===');
  console.log('Copy the JSON below and save to a scenario file:\\n');
  console.log(JSON.stringify(data, null, 2));
  console.log('\\n=================================\\n');

  // Also copy to clipboard if available
  if (navigator.clipboard) {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      .then(() => console.log('Copied to clipboard!'))
      .catch(() => console.log('Could not copy to clipboard - manually copy above'));
  }

  return data;
})();
`;

async function extractInteractive(options = {}) {
  const { seed, scenarioName } = options;

  console.log('\n=== RogueLetters Scenario Extraction ===\n');

  const browser = await chromium.launch({
    headless: false,  // Need to see the game to play it
    slowMo: 50
  });
  const page = await browser.newPage();

  try {
    // Build URL
    let url = 'http://localhost:8086/';
    const params = [];
    if (seed) {
      params.push(`seed=${seed}`);
    }
    // Keep animations for interactive play
    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    console.log(`Loading: ${url}`);
    console.log(seed ? `Using seed: ${seed}` : 'Using random seed (new game)');
    console.log('\n>>> Play through the round, then press ENTER here to extract <<<\n');

    await page.goto(url);
    await page.waitForSelector('#game-board', { timeout: 15000 });

    // Wait for user to play and press enter
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    await new Promise(resolve => {
      rl.question('Press ENTER when you have completed the round...', () => {
        rl.close();
        resolve();
      });
    });

    // Extract game data
    console.log('\nExtracting scenario data...');

    const gameData = await page.evaluate(() => {
      const data = {
        type: 'rogueletters',
        seed: window.gameState.seed,
        startingWord: window.gameState.startingWord,
        set: window.runState?.set || 1,
        round: window.runState?.round || 1,
        targetScore: window.runState?.targetScore || 40,
        isRunMode: window.runState?.isRunMode || false,
        turnHistory: window.gameState.turnHistory,
        turnScores: window.gameState.turnScores,
        finalScore: window.gameState.score,
        isRoundComplete: window.gameState.isGameOver,
        coins: window.runState?.coins || 0
      };

      // Calculate earnings if in run mode
      if (window.runState?.isRunMode && window.gameState.isGameOver) {
        const roundInSet = ((window.runState.round - 1) % 3) + 1;
        const basePayout = [3, 4, 5][roundInSet - 1] || 3;
        const extra = Math.max(0, window.gameState.score - window.runState.targetScore);
        const bonusThreshold = Math.floor(window.runState.targetScore * 0.25);
        const extraBonus = bonusThreshold > 0 ? Math.floor(extra / bonusThreshold) : 0;
        data.earnings = {
          base: basePayout,
          extraPoints: extra,
          bonusThreshold: bonusThreshold,
          extraBonus: extraBonus,
          total: basePayout + extraBonus
        };
        data.targetMet = window.gameState.score >= window.runState.targetScore;
      }

      return data;
    });

    console.log('\n--- Extracted Data ---');
    console.log(`  Seed: ${gameData.seed}`);
    console.log(`  Starting word: ${gameData.startingWord}`);
    console.log(`  Set ${gameData.set}, Round ${gameData.round}`);
    console.log(`  Target: ${gameData.targetScore}`);
    console.log(`  Final score: ${gameData.finalScore}`);
    console.log(`  Target met: ${gameData.targetMet !== undefined ? gameData.targetMet : 'N/A'}`);
    console.log(`  Turns completed: ${gameData.turnHistory.length}`);
    console.log(`  Turn scores: ${gameData.turnScores.join(', ')}`);
    if (gameData.earnings) {
      console.log(`  Earnings: $${gameData.earnings.total} (base: $${gameData.earnings.base}, bonus: $${gameData.earnings.extraBonus})`);
    }

    // Build scenario JSON
    const scenario = buildScenario(gameData, scenarioName);

    // Save files
    saveScenarioFiles(scenario, gameData.seed, scenarioName);

    console.log('\n✓ Extraction complete!\n');

    return scenario;

  } catch (error) {
    console.error('Error extracting scenario:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

function buildScenario(gameData, scenarioName) {
  const targetMet = gameData.targetMet !== undefined ? gameData.targetMet :
    (gameData.finalScore >= gameData.targetScore);

  return {
    name: scenarioName,
    description: `Set ${gameData.set} Round ${gameData.round} - ${gameData.finalScore} points`,
    type: 'rogueletters',
    metadata: {
      seed: gameData.seed,
      startingWord: gameData.startingWord,
      set: gameData.set,
      round: gameData.round,
      targetScore: gameData.targetScore,
      extractedAt: new Date().toISOString()
    },
    expectedOutcomes: {
      turnScores: gameData.turnScores,
      finalScore: gameData.finalScore,
      turnsCompleted: gameData.turnHistory.filter(t => t.tiles && t.tiles.length > 0).length,
      roundComplete: gameData.isRoundComplete,
      targetMet: targetMet,
      earnings: gameData.earnings || null
    },
    moves: gameData.turnHistory.map((turn, index) => ({
      turn: index + 1,
      tiles: turn.tiles || [],
      expectedScore: gameData.turnScores[index] || 0
    })),
    testValidations: {
      wordValidation: {
        description: "All words formed should be valid in ENABLE dictionary"
      },
      scoringValidation: {
        description: "Scoring must match expected values for each turn"
      },
      roundCompletionValidation: {
        description: "Round completes after 5 turns"
      },
      targetValidation: {
        description: `Score should ${targetMet ? 'meet or exceed' : 'be below'} target of ${gameData.targetScore}`
      }
    }
  };
}

function saveScenarioFiles(scenario, seed, scenarioName) {
  const scenariosDir = path.join(__dirname, '../scenarios');
  const baselinesDir = path.join(__dirname, '../baselines');

  // Ensure directories exist
  if (!fs.existsSync(scenariosDir)) fs.mkdirSync(scenariosDir, { recursive: true });
  if (!fs.existsSync(baselinesDir)) fs.mkdirSync(baselinesDir, { recursive: true });

  // Use a sanitized filename
  const filename = `rogue-${scenarioName}`;

  // Save scenario
  const scenarioFile = path.join(scenariosDir, `${filename}.json`);
  fs.writeFileSync(scenarioFile, JSON.stringify(scenario, null, 2));
  console.log(`\n✓ Scenario saved to: ${scenarioFile}`);

  // Save baseline
  const baseline = {
    scenarioName: scenarioName,
    type: 'rogueletters',
    lastUpdated: new Date().toISOString(),
    expectedOutcomes: scenario.expectedOutcomes,
    turnDetails: scenario.moves.map((move) => ({
      turn: move.turn,
      score: move.expectedScore,
      tilesPlaced: move.tiles.length
    }))
  };

  const baselineFile = path.join(baselinesDir, `${filename}.baseline.json`);
  fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
  console.log(`✓ Baseline saved to: ${baselineFile}`);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
RogueLetters Scenario Extraction Tool

Usage:
  node extract-rogueletters-scenario.js [options]

Options:
  --name=<name>     Name for the scenario (required for extraction)
  --seed=<seed>     Specific seed to use (optional, uses random if not provided)
  --snippet         Print console snippet for manual extraction
  --help, -h        Show this help

Examples:
  # Interactive extraction - play the game, then press ENTER
  node extract-rogueletters-scenario.js --name="set1-round1-pass"

  # With specific seed for reproducibility
  node extract-rogueletters-scenario.js --seed=1700000000001 --name="deterministic-test"

  # Get console snippet for manual extraction in browser
  node extract-rogueletters-scenario.js --snippet
`);
  process.exit(0);
}

if (args.includes('--snippet')) {
  console.log('\n=== Console Snippet for Manual Extraction ===');
  console.log('Paste this in browser console after completing a round:\n');
  console.log(CONSOLE_SNIPPET);
  process.exit(0);
}

// Get options
const nameArg = args.find(arg => arg.startsWith('--name='));
const seedArg = args.find(arg => arg.startsWith('--seed='));

const scenarioName = nameArg ? nameArg.split('=')[1] : null;
const seed = seedArg ? seedArg.split('=')[1] : null;

if (!scenarioName) {
  console.error('Error: --name=<scenarioName> is required');
  console.error('Run with --help for usage information');
  process.exit(1);
}

// Run extraction
extractInteractive({ seed, scenarioName })
  .then(() => {
    console.log('Scenario extraction successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Scenario extraction failed:', error);
    process.exit(1);
  });
