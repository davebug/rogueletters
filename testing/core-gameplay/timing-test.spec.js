const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Capture V3 encoding timing', async ({ page }) => {
  // Capture ALL console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(msg.text());
  });
  
  // Load scenario data
  const scenarioFile = path.join(__dirname, 'scenarios', '20251017-scenario-3.json');
  const scenario = JSON.parse(fs.readFileSync(scenarioFile, 'utf8'));
  
  console.log('\n=== Loading scenario and playing through ===');
  
  // Load game with seed
  await page.goto(`http://localhost:8086/?seed=${scenario.metadata.seed}`);
  await page.waitForSelector('#game-board', { timeout: 10000 });
  await page.waitForTimeout(1500);
  
  // Play through all turns
  for (const move of scenario.moves) {
    // Place each tile
    for (const tile of move.tiles) {
      // Click the letter in the rack
      await page.click(`#tile-rack .tile:has-text("${tile.letter}"):not(.placed)`, { timeout: 5000 });
      // Click the board cell
      await page.click(`#game-board .cell[data-row="${tile.row}"][data-col="${tile.col}"]`);
      await page.waitForTimeout(100);
    }
    
    // Submit the word
    await page.click('#submit-btn');
    await page.waitForTimeout(800);
  }
  
  // Wait for completion popup
  await page.waitForSelector('#share-board-btn:visible', { timeout: 10000 });
  await page.waitForTimeout(500);
  
  console.log('\n=== Clicking Share Board button to trigger V3 encoding ===');
  
  // Click share board
  await page.click('#share-board-btn');
  
  // Wait for encoding to complete
  await page.waitForTimeout(3000);
  
  // Print V3 Encoder timing logs
  console.log('\n\n========================================');
  console.log('V3 ENCODER TIMING RESULTS');
  console.log('========================================\n');
  
  const v3Logs = consoleLogs.filter(log => 
    log.includes('V3 Encoder') ||
    log.includes('Fetching') ||
    log.includes('fetched in') ||
    log.includes('ms (parallel') ||
    log.includes('Average per rack')
  );
  
  if (v3Logs.length === 0) {
    console.log('⚠️  No V3 Encoder logs found!');
  } else {
    v3Logs.forEach(log => console.log(log));
  }
  
  console.log('\n========================================\n');
});
