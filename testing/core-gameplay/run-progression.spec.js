/**
 * RogueLetters Run Progression Test Suite
 *
 * Tests the core run-mode mechanics that are critical for deployment:
 * - Fresh run initialization
 * - Target score escalation
 * - Round/Set advancement
 * - Earnings calculation
 * - State persistence across refresh
 */

const { test, expect } = require('@playwright/test');

// Target scores by set (from script.js)
const SET_TARGETS = [
  [40, 60, 80],      // Set 1
  [100, 150, 200],   // Set 2
  [250, 375, 500],   // Set 3
  [650, 975, 1300],  // Set 4+
];

// Base earnings by round
const BASE_EARNINGS = [3, 4, 5]; // Round 1, 2, 3

function getExpectedTarget(set, round) {
  const setIndex = Math.min(set - 1, SET_TARGETS.length - 1);
  return SET_TARGETS[setIndex][round - 1];
}

function calculateExpectedEarnings(score, target, round) {
  const base = BASE_EARNINGS[round - 1] || 3;
  const extra = Math.max(0, score - target);
  const bonusThreshold = Math.floor(target * 0.25);
  const extraBonus = bonusThreshold > 0 ? Math.floor(extra / bonusThreshold) : 0;
  return { base, extraBonus, total: base + extraBonus };
}

test.describe('Run Progression', () => {

  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test to ensure fresh state
    await page.goto('http://localhost:8086');
    await page.evaluate(() => {
      localStorage.removeItem('rogueLettersRunState');
      localStorage.removeItem('rogueLettersGameState');
    });
  });

  test('Fresh run initializes with correct state', async ({ page }) => {
    console.log('\n=== Testing Fresh Run Initialization ===');

    // Load game with debug params to trigger run mode (set=1 starts run mode)
    await page.goto('http://localhost:8086/?set=1&round=1&coins=0&animate=0');
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForTimeout(500);

    // Check run state
    const runState = await page.evaluate(() => ({
      isRunMode: window.runState?.isRunMode,
      set: window.runState?.set,
      round: window.runState?.round,
      targetScore: window.runState?.targetScore,
      coins: window.runState?.coins,
    }));

    console.log('Run state:', runState);

    expect(runState.isRunMode, 'Should be in run mode').toBe(true);
    expect(runState.set, 'Should start at Set 1').toBe(1);
    expect(runState.round, 'Should start at Round 1').toBe(1);
    expect(runState.targetScore, 'Target should be 40').toBe(40);
    expect(runState.coins, 'Should start with 0 coins').toBe(0);

    console.log('✓ Fresh run initialization correct\n');
  });

  test('Target scores escalate correctly by set and round', async ({ page }) => {
    console.log('\n=== Testing Target Score Escalation ===');

    await page.goto('http://localhost:8086/?animate=0');
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });

    // Test getTargetScore function directly
    const targetTests = await page.evaluate(() => {
      const results = [];
      for (let set = 1; set <= 5; set++) {
        for (let round = 1; round <= 3; round++) {
          results.push({
            set,
            round,
            target: getTargetScore(set, round)
          });
        }
      }
      return results;
    });

    console.log('Target scores by set/round:');
    for (const { set, round, target } of targetTests) {
      const expected = getExpectedTarget(set, round);
      console.log(`  Set ${set} Round ${round}: ${target} (expected: ${expected})`);
      expect(target, `Set ${set} Round ${round} target`).toBe(expected);
    }

    console.log('✓ Target escalation correct\n');
  });

  test('Earnings calculation is correct', async ({ page }) => {
    console.log('\n=== Testing Earnings Calculation ===');

    await page.goto('http://localhost:8086/?animate=0');
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });

    // Test cases: [score, target, round, expectedBase, expectedExtraBonus]
    const testCases = [
      // Round 1 (base $3), target 40, threshold 10
      { score: 40, target: 40, round: 1, expectedBase: 3, expectedExtraBonus: 0 },  // Exact
      { score: 50, target: 40, round: 1, expectedBase: 3, expectedExtraBonus: 1 },  // +10 = +$1
      { score: 60, target: 40, round: 1, expectedBase: 3, expectedExtraBonus: 2 },  // +20 = +$2

      // Round 2 (base $4), target 60, threshold 15
      { score: 60, target: 60, round: 2, expectedBase: 4, expectedExtraBonus: 0 },  // Exact
      { score: 75, target: 60, round: 2, expectedBase: 4, expectedExtraBonus: 1 },  // +15 = +$1

      // Round 3 (base $5), target 80, threshold 20
      { score: 100, target: 80, round: 3, expectedBase: 5, expectedExtraBonus: 1 }, // +20 = +$1
      { score: 120, target: 80, round: 3, expectedBase: 5, expectedExtraBonus: 2 }, // +40 = +$2
    ];

    for (const tc of testCases) {
      const earnings = await page.evaluate(({ score, target, round }) => {
        return calculateEarnings(score, target, round);
      }, tc);

      console.log(`  Score ${tc.score} on target ${tc.target} (R${tc.round}): $${earnings.base} + $${earnings.extraBonus} = $${earnings.total}`);

      expect(earnings.base, `Base for round ${tc.round}`).toBe(tc.expectedBase);
      expect(earnings.extraBonus, `Extra bonus for ${tc.score}/${tc.target}`).toBe(tc.expectedExtraBonus);
      expect(earnings.total).toBe(tc.expectedBase + tc.expectedExtraBonus);
    }

    console.log('✓ Earnings calculation correct\n');
  });

  test('Run state persists across page refresh', async ({ page }) => {
    console.log('\n=== Testing State Persistence ===');

    // Start a run at Set 2, Round 2 with 15 coins using URL params
    await page.goto('http://localhost:8086/?set=2&round=2&coins=15&animate=0');
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForTimeout(500);

    const stateBefore = await page.evaluate(() => ({
      set: window.runState.set,
      round: window.runState.round,
      coins: window.runState.coins,
      targetScore: window.runState.targetScore,
    }));
    console.log('State before refresh:', stateBefore);

    // Refresh the page
    await page.reload();
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForTimeout(500);

    const stateAfter = await page.evaluate(() => ({
      set: window.runState.set,
      round: window.runState.round,
      coins: window.runState.coins,
      targetScore: window.runState.targetScore,
    }));
    console.log('State after refresh:', stateAfter);

    expect(stateAfter.set, 'Set should persist').toBe(stateBefore.set);
    expect(stateAfter.round, 'Round should persist').toBe(stateBefore.round);
    expect(stateAfter.coins, 'Coins should persist').toBe(stateBefore.coins);
    expect(stateAfter.targetScore, 'Target should persist').toBe(stateBefore.targetScore);

    console.log('✓ State persistence works\n');
  });

  test('Seed-based game produces consistent starting word', async ({ page }) => {
    console.log('\n=== Testing Seed Consistency ===');

    const testSeed = '12345';

    // Load with seed
    await page.goto(`http://localhost:8086/?seed=${testSeed}&animate=0`);
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForTimeout(500);

    const word1 = await page.evaluate(() => window.gameState.startingWord);
    console.log(`First load with seed ${testSeed}: ${word1}`);

    // Reload with same seed
    await page.goto(`http://localhost:8086/?seed=${testSeed}&animate=0`);
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForTimeout(500);

    const word2 = await page.evaluate(() => window.gameState.startingWord);
    console.log(`Second load with seed ${testSeed}: ${word2}`);

    expect(word2, 'Same seed should produce same starting word').toBe(word1);

    console.log('✓ Seed consistency works\n');
  });

  test('Game state (board, rack) persists across refresh mid-turn', async ({ page }) => {
    console.log('\n=== Testing Mid-Turn State Persistence ===');

    // Start with a specific seed for reproducibility
    await page.goto('http://localhost:8086/?seed=55555&animate=0');
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForFunction(() =>
      window.gameState && window.gameState.rackTiles && window.gameState.rackTiles.length > 0,
      { timeout: 15000 }
    );
    await page.waitForTimeout(500);

    // Get initial state
    const initialState = await page.evaluate(() => ({
      startingWord: window.gameState.startingWord,
      rackTiles: window.gameState.rackTiles.map(t => typeof t === 'object' ? t.letter : t),
      turn: window.gameState.currentTurn,
      score: window.gameState.score,
    }));
    console.log('Initial state:', initialState);

    // Refresh the page
    await page.reload();
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForFunction(() =>
      window.gameState && window.gameState.rackTiles && window.gameState.rackTiles.length > 0,
      { timeout: 15000 }
    );
    await page.waitForTimeout(500);

    // Get state after refresh
    const refreshedState = await page.evaluate(() => ({
      startingWord: window.gameState.startingWord,
      rackTiles: window.gameState.rackTiles.map(t => typeof t === 'object' ? t.letter : t),
      turn: window.gameState.currentTurn,
      score: window.gameState.score,
    }));
    console.log('Refreshed state:', refreshedState);

    expect(refreshedState.startingWord, 'Starting word should persist').toBe(initialState.startingWord);
    expect(refreshedState.rackTiles.join(''), 'Rack should persist').toBe(initialState.rackTiles.join(''));
    expect(refreshedState.turn, 'Turn should persist').toBe(initialState.turn);
    expect(refreshedState.score, 'Score should persist').toBe(initialState.score);

    console.log('✓ Mid-turn state persistence works\n');
  });

});

test.describe('Run Advancement', () => {

  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('http://localhost:8086');
    await page.evaluate(() => {
      localStorage.removeItem('rogueLettersRunState');
      localStorage.removeItem('rogueLettersGameState');
    });
  });

  test('URL params correctly set run state for each round', async ({ page }) => {
    console.log('\n=== Testing Run State via URL Params ===');

    // Test Set 1 Round 1
    await page.goto('http://localhost:8086/?set=1&round=1&animate=0');
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });

    let state = await page.evaluate(() => ({
      set: window.runState.set,
      round: window.runState.round,
      target: window.runState.targetScore,
    }));
    console.log('Set 1 Round 1:', state);
    expect(state).toEqual({ set: 1, round: 1, target: 40 });

    // Test Set 1 Round 2
    await page.goto('http://localhost:8086/?set=1&round=2&animate=0');
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });

    state = await page.evaluate(() => ({
      set: window.runState.set,
      round: window.runState.round,
      target: window.runState.targetScore,
    }));
    console.log('Set 1 Round 2:', state);
    expect(state).toEqual({ set: 1, round: 2, target: 60 });

    // Test Set 1 Round 3
    await page.goto('http://localhost:8086/?set=1&round=3&animate=0');
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });

    state = await page.evaluate(() => ({
      set: window.runState.set,
      round: window.runState.round,
      target: window.runState.targetScore,
    }));
    console.log('Set 1 Round 3:', state);
    expect(state).toEqual({ set: 1, round: 3, target: 80 });

    console.log('✓ URL params correctly set run state\n');
  });

  test('URL params correctly set run state for Set 2', async ({ page }) => {
    console.log('\n=== Testing Set 2 Run State ===');

    // Test Set 2 Round 1
    await page.goto('http://localhost:8086/?set=2&round=1&animate=0');
    await page.waitForSelector('#game-board', { timeout: 15000 });
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });

    const state = await page.evaluate(() => ({
      set: window.runState.set,
      round: window.runState.round,
      target: window.runState.targetScore,
    }));
    console.log('Set 2 Round 1:', state);

    expect(state.set, 'Should be Set 2').toBe(2);
    expect(state.round, 'Should be Round 1').toBe(1);
    expect(state.target, 'Target should be 100').toBe(100);

    console.log('✓ Set 2 run state correct\n');
  });

});
