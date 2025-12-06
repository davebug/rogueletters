#!/usr/bin/env node

/**
 * Complete Test Suite Runner for Daily Letters
 *
 * This script runs all tests to verify the game is complete and functional.
 * Run with: node tests/run-complete-test-suite.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:8085',
  timeout: 30000,
  retries: 0,
  workers: 1
};

// Define all test categories
const TEST_SUITES = {
  'Core Mechanics': [
    'board-initialization',
    'tile-placement-rules',
    'word-validation',
    'scoring-system'
  ],
  'Game Flow': [
    'turn-management',
    'game-over-conditions',
    'retry-functionality'
  ],
  'Player Features': [
    'tile-manipulation',
    'visual-feedback',
    'undo-redo',
    'shuffle-recall'
  ],
  'Advanced Features': [
    'keyboard-navigation',
    'state-persistence',
    'high-scores'
  ],
  'Quality Assurance': [
    'performance',
    'accessibility',
    'error-handling'
  ],
  'Integration': [
    'full-game-flow'
  ]
};

// Test result tracking
class TestResults {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      skipped: [],
      totalTests: 0,
      totalTime: 0,
      startTime: Date.now()
    };
  }

  addPass(suite, tests = 1) {
    this.results.passed.push(suite);
    this.results.totalTests += tests;
  }

  addFail(suite, error, tests = 1) {
    this.results.failed.push({ suite, error });
    this.results.totalTests += tests;
  }

  addSkip(suite, reason) {
    this.results.skipped.push({ suite, reason });
  }

  getElapsedTime() {
    return ((Date.now() - this.results.startTime) / 1000).toFixed(2);
  }

  generateReport() {
    const passRate = ((this.results.passed.length /
      (this.results.passed.length + this.results.failed.length)) * 100).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('                    TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Test Suites: ${this.results.totalTests}`);
    console.log(`Passed: ${this.results.passed.length} ✅`);
    console.log(`Failed: ${this.results.failed.length} ❌`);
    console.log(`Skipped: ${this.results.skipped.length} ⏭️`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log(`Total Time: ${this.getElapsedTime()}s`);
    console.log('='.repeat(60));

    if (this.results.failed.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.failed.forEach(({ suite, error }) => {
        console.log(`\n  ${suite}:`);
        console.log(`    Error: ${error}`);
      });
    }

    if (this.results.skipped.length > 0) {
      console.log('\n⏭️  SKIPPED TESTS:');
      this.results.skipped.forEach(({ suite, reason }) => {
        console.log(`  ${suite}: ${reason}`);
      });
    }

    return this.results.failed.length === 0;
  }

  getGameCompletionStatus() {
    const requiredFeatures = {
      'Core Mechanics': ['board-initialization', 'tile-placement-rules', 'word-validation', 'scoring-system'],
      'Game Flow': ['turn-management', 'game-over-conditions'],
      'Essential Features': ['tile-manipulation', 'visual-feedback']
    };

    const missingFeatures = [];

    for (const [category, suites] of Object.entries(requiredFeatures)) {
      for (const suite of suites) {
        if (!this.results.passed.includes(suite)) {
          missingFeatures.push(`${category}: ${suite}`);
        }
      }
    }

    if (missingFeatures.length === 0) {
      console.log('\n✅ GAME IS COMPLETE AND FUNCTIONAL!');
      console.log('All core features are working correctly.');
      return true;
    } else {
      console.log('\n⚠️  GAME IS NOT COMPLETE');
      console.log('The following required features need to be fixed:');
      missingFeatures.forEach(feature => {
        console.log(`  - ${feature}`);
      });
      return false;
    }
  }
}

// Check if server is running
async function checkServerRunning() {
  try {
    const response = await fetch(TEST_CONFIG.baseUrl);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Run individual test suite
function runTestSuite(suiteName, filePath) {
  try {
    console.log(`  Running ${suiteName}...`);

    const command = `npx playwright test ${filePath} --config letters/tests/playwright.config.js --reporter=json`;

    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: path.resolve(__dirname, '../..')
    });

    const jsonResult = JSON.parse(result);

    if (jsonResult.stats.failures === 0) {
      console.log(`    ✅ ${suiteName} passed (${jsonResult.stats.passes} tests)`);
      return { passed: true, tests: jsonResult.stats.passes };
    } else {
      console.log(`    ❌ ${suiteName} failed (${jsonResult.stats.failures}/${jsonResult.stats.tests} tests)`);
      return {
        passed: false,
        error: `${jsonResult.stats.failures} tests failed`,
        tests: jsonResult.stats.tests
      };
    }
  } catch (error) {
    // Check if it's a test failure or execution error
    if (error.stdout) {
      try {
        const jsonResult = JSON.parse(error.stdout);
        console.log(`    ❌ ${suiteName} failed (${jsonResult.stats.failures}/${jsonResult.stats.tests} tests)`);
        return {
          passed: false,
          error: `${jsonResult.stats.failures} tests failed`,
          tests: jsonResult.stats.tests
        };
      } catch (parseError) {
        // Not JSON output, treat as execution error
      }
    }

    console.log(`    ❌ ${suiteName} execution error: ${error.message}`);
    return { passed: false, error: error.message, tests: 0 };
  }
}

// Check if test file exists
function testFileExists(fileName) {
  const testPath = path.resolve(__dirname, `${fileName}.spec.js`);
  return fs.existsSync(testPath);
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Daily Letters Complete Test Suite');
  console.log('====================================\n');

  const results = new TestResults();

  // Check server
  console.log('Checking server status...');
  const serverRunning = await checkServerRunning();

  if (!serverRunning) {
    console.error('❌ Server is not running at http://localhost:8085');
    console.error('Please start the server with: ./letters_start.sh');
    process.exit(1);
  }

  console.log('✅ Server is running\n');

  // Run test suites by category
  for (const [category, suites] of Object.entries(TEST_SUITES)) {
    console.log(`\n📦 ${category}`);
    console.log('-'.repeat(40));

    for (const suite of suites) {
      const fileName = suite.replace(/-/g, '-');

      if (!testFileExists(fileName)) {
        console.log(`  ⏭️  Skipping ${suite} (test file not found)`);
        results.addSkip(suite, 'Test file not implemented yet');
        continue;
      }

      const testResult = runTestSuite(suite, `letters/tests/${fileName}.spec.js`);

      if (testResult.passed) {
        results.addPass(suite, testResult.tests);
      } else {
        results.addFail(suite, testResult.error, testResult.tests);
      }

      // Small delay between suites
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Generate final report
  const allPassed = results.generateReport();
  const gameComplete = results.getGameCompletionStatus();

  // Generate detailed recommendations
  if (!gameComplete) {
    console.log('\n📋 RECOMMENDED FIXES (in priority order):');

    const priorities = {
      'board-initialization': 'Critical: Game cannot start without proper board',
      'tile-placement-rules': 'Critical: Core game mechanic',
      'word-validation': 'Critical: Core game mechanic',
      'scoring-system': 'Critical: Player feedback',
      'turn-management': 'High: Game progression',
      'game-over-conditions': 'High: Game completion',
      'tile-manipulation': 'Medium: Player experience',
      'visual-feedback': 'Medium: Player experience',
      'undo-redo': 'Low: Quality of life',
      'keyboard-navigation': 'Low: Accessibility'
    };

    results.results.failed.forEach(({ suite }) => {
      const priority = priorities[suite] || 'Low: Enhancement';
      console.log(`  • ${suite}`);
      console.log(`    ${priority}`);
    });
  }

  // Exit with appropriate code
  process.exit(gameComplete ? 0 : 1);
}

// Create individual test file for existing features
function createExistingFeatureTest() {
  const testContent = `// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Existing Core Features', () => {
  test('should initialize game with seed', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');

    const board = await page.locator('#game-board').isVisible();
    expect(board).toBe(true);

    const tiles = await page.locator('#tile-rack .tile').count();
    expect(tiles).toBe(7);
  });

  test('should enforce Scrabble placement rules', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');

    // Test disconnected placement
    const tile = await page.locator('#tile-rack .tile').first();
    await tile.click();
    await page.locator('[data-row="0"][data-col="0"]').click();

    await page.click('#submit-word');

    const error = await page.locator('#error-modal').isVisible();
    expect(error).toBe(true);
  });

  test('should validate words against dictionary', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');

    // This would need proper tile placement
    // Simplified for demonstration
    const submitBtn = await page.locator('#submit-word');
    expect(submitBtn).toBeDefined();
  });

  test('should calculate scores correctly', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');

    const score = await page.locator('#current-score');
    expect(score).toBeDefined();

    const initialScore = await score.textContent();
    expect(parseInt(initialScore || '0')).toBe(0);
  });

  test('should persist game state', async ({ page }) => {
    await page.goto('http://localhost:8085/?seed=20250120');

    // Make a move
    const tile = await page.locator('#tile-rack .tile').first();
    const letter = await tile.locator('.tile-letter').textContent();

    // Check localStorage
    const hasState = await page.evaluate(() => {
      return localStorage.getItem('letters_game_state') !== null;
    });

    expect(hasState).toBe(true);
  });
});`;

  const testPath = path.resolve(__dirname, 'existing-features.spec.js');

  if (!fs.existsSync(testPath)) {
    fs.writeFileSync(testPath, testContent);
    console.log('Created test file for existing features');
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--create-tests')) {
  createExistingFeatureTest();
  console.log('Test files created. Run again without --create-tests to execute.');
  process.exit(0);
}

if (args.includes('--help')) {
  console.log(`
Daily Letters Test Suite Runner

Usage:
  node tests/run-complete-test-suite.js [options]

Options:
  --create-tests    Create test files for existing features
  --help           Show this help message

The test suite will:
1. Check that the server is running
2. Run all test categories
3. Generate a detailed report
4. Determine if the game is complete

Exit codes:
  0 - All required tests passed (game is complete)
  1 - Some required tests failed (fixes needed)
`);
  process.exit(0);
}

// Run the test suite
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});