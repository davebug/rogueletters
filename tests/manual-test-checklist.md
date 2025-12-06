# Manual Testing Checklist for WikiLetters

## Desktop Browser Testing
Use Chrome DevTools to test on desktop with mobile simulation:

1. **Open Chrome DevTools** (F12)
2. **Toggle Device Toolbar** (Ctrl+Shift+M)
3. **Select iPhone 12/13 Pro** preset
4. **Enable touch simulation** (three dots menu → "Show touch cursor")

### Test Cases:

#### 1. Initial Load
- [ ] Board displays correctly with starting word
- [ ] 7 tiles appear in rack
- [ ] Submit button is hidden
- [ ] Turn indicator shows turn 1

#### 2. Tile Placement (Touch Drag)
- [ ] Can drag tile from rack
- [ ] Visual feedback during drag (ghost tile)
- [ ] Tile places on empty cell
- [ ] Tile removed from rack after placement
- [ ] Mobile potential words section appears
- [ ] Submit button appears

#### 3. Tile Placement (Tap)
- [ ] Tap tile to select (gets highlighted)
- [ ] Tap board cell to place
- [ ] Tile moves from rack to board
- [ ] UI updates same as drag

#### 4. Word Detection
- [ ] Valid words show in potential words
- [ ] Score displayed correctly
- [ ] Invalid placement disables submit

#### 5. Submit Word
- [ ] Submit button works
- [ ] Tiles consumed from rack
- [ ] New tiles added (back to 7)
- [ ] Score added to turn indicator
- [ ] Turn advances

#### 6. Game Completion
- [ ] After 5 turns, game over screen appears
- [ ] Final score displayed
- [ ] Name input works (3 letters)
- [ ] Submit score works
- [ ] Share button copies to clipboard

## Console Testing Commands

Open browser console and run these:

```javascript
// Check game state
console.log('Game State:', gameState);
console.log('Placed tiles:', gameState.placedTiles);
console.log('Current turn:', gameState.currentTurn);

// Test tile placement
const tile = document.querySelector('#tile-rack .tile');
const cell = document.querySelector('.board-cell[data-row="8"][data-col="7"]');
placeTile(cell, tile);

// Check if UI updated
console.log('Mobile potential words visible:',
  document.querySelector('#mobile-potential-words').classList.contains('has-tiles'));
console.log('Submit button visible:',
  document.querySelector('#mobile-submit-container').style.display !== 'none');

// Force check word validity
checkWordValidity();

// Check words found
console.log('Words found:', findFormedWords());

// Test submit (if valid word placed)
submitWord();

// Check new tiles
console.log('Rack tiles:', document.querySelectorAll('#tile-rack .tile').length);
```

## Automated Console Testing

```javascript
// Run full automated test in console
async function testGame() {
  const results = {};

  // Test 1: Initial state
  results.initialTiles = document.querySelectorAll('#tile-rack .tile').length;

  // Test 2: Place tiles to form word
  for (let i = 0; i < 3; i++) {
    const tile = document.querySelector('#tile-rack .tile');
    const cell = document.querySelector(`.board-cell[data-row="8"][data-col="${7+i}"]:not(.occupied)`);
    if (tile && cell) placeTile(cell, tile);
    await new Promise(r => setTimeout(r, 100));
  }

  // Test 3: Check UI updates
  results.tilesAfterPlacement = document.querySelectorAll('#tile-rack .tile').length;
  results.placedCount = gameState.placedTiles.length;
  results.submitVisible = document.querySelector('#mobile-submit-container').style.display !== 'none';

  // Test 4: Submit if valid
  if (results.submitVisible) {
    submitWord();
    await new Promise(r => setTimeout(r, 500));
    results.tilesAfterSubmit = document.querySelectorAll('#tile-rack .tile').length;
    results.currentTurn = gameState.currentTurn;
  }

  console.table(results);
  return results;
}

// Run it
testGame();
```

## Real Device Testing

### iOS Safari:
1. Connect iPhone to Mac
2. Open Safari on Mac
3. Develop menu → [Your iPhone] → localhost
4. Use Web Inspector to debug

### Android Chrome:
1. Enable USB debugging on phone
2. Open chrome://inspect on desktop
3. Click "inspect" next to your page
4. Use Remote DevTools

## Network Testing

```bash
# Monitor backend calls
curl -s "http://localhost:8085/cgi-bin/letters.py?seed=$(date +%Y%m%d)"

# Test word validation
curl -s "http://localhost:8085/cgi-bin/validate_word.py?word=TEST&seed=$(date +%Y%m%d)"

# Check dictionary
curl -s "http://localhost:8085/cgi-bin/check_dictionary.py?word=TEST"
```

## Error Monitoring

Add this to console to catch all errors:

```javascript
window.addEventListener('error', (e) => {
  console.error('Error caught:', e.message, e.filename, e.lineno, e.colno);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Promise rejected:', e.reason);
});
```