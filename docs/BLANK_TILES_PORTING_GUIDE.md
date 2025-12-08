# Blank Tiles Porting Guide: WikiLetters → RogueLetters

This document details the changes needed to port blank tile functionality from WikiLetters to RogueLetters.

## Overview

Blank tiles are wild cards that can represent any letter but score 0 points. Standard Scrabble has 2 blank tiles per game.

**Key behaviors:**
- Blanks appear as empty tiles in the rack
- When placed, a modal asks which letter the blank should represent
- The assigned letter shows at 70% opacity
- Blanks score 0 points, even when forming high-value letters like Q or Z
- Blanks from previous turns continue to score 0 in new words

---

## 1. Backend: `cgi-bin/letters.py`

### Add blanks to tile distribution

```python
# Change this:
TILE_DISTRIBUTION = {
    'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2,
    'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2,
    'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1,
    'Y': 2, 'Z': 1
}

# To this:
TILE_DISTRIBUTION = {
    'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2,
    'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2,
    'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1,
    'Y': 2, 'Z': 1, '_': 2  # Blank tiles
}
```

### Update tile validation to accept blanks

```python
# Change this:
valid_letters = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
if not all(isinstance(t, str) and t in valid_letters for t in rack_tiles):

# To this:
valid_tiles = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ_')
if not all(isinstance(t, str) and t in valid_tiles for t in rack_tiles):
```

---

## 2. Backend: `cgi-bin/validate_word.py`

### Add blank to TILE_SCORES

```python
TILE_SCORES = {
    # ... existing scores ...
    'Q': 10, 'Z': 10,
    '_': 0  # Blank tiles score 0 points
}
```

### Update calculate_score function signature

```python
def calculate_score(board, placed_tiles, words_formed, existing_blank_positions=None):
```

### Add blank position tracking (after placed_positions)

```python
# Convert placed tiles to set for quick lookup
placed_positions = {(t['row'], t['col']) for t in placed_tiles}

# Track blank tile positions (blanks score 0 regardless of letter)
# Include both blanks placed this turn AND blanks from previous turns
blank_positions = {(t['row'], t['col']) for t in placed_tiles if t.get('isBlank', False)}

# Add blanks from previous turns
if existing_blank_positions:
    for blank in existing_blank_positions:
        blank_positions.add((blank['row'], blank['col']))
```

### Update letter scoring to check for blanks

```python
# Change this:
letter_score = TILE_SCORES.get(letter.upper(), 0)

# To this:
# Blank tiles score 0 points
if (row, col) in blank_positions:
    letter_score = 0
else:
    letter_score = TILE_SCORES.get(letter.upper(), 0)
```

### Read blank_positions from POST data

```python
board = data.get('board', [])
placed_tiles = data.get('placed_tiles', [])
blank_positions = data.get('blank_positions', [])  # ADD THIS LINE
debug_mode = data.get('debug_mode', False)
```

### Pass blank_positions to calculate_score

```python
# Change this:
response["score"] = calculate_score(board, placed_tiles, words_formed)

# To this:
response["score"] = calculate_score(board, placed_tiles, words_formed, blank_positions)
```

---

## 3. HTML: Add Blank Letter Modal

Add this after the error modal in `index.html`:

```html
<!-- Blank Tile Letter Selection Modal -->
<div id="blank-letter-modal" class="modal" style="display: none;">
    <div class="modal-content blank-letter-modal-content">
        <h3>Choose a Letter</h3>
        <div id="letter-grid" class="letter-grid">
            <!-- A-Z buttons generated dynamically -->
        </div>
        <button id="cancel-blank-selection" class="btn btn-secondary">Cancel</button>
    </div>
</div>
```

---

## 4. CSS: Add Blank Tile Styles

Add to `styles.css`:

```css
/* Blank Tiles - empty in rack, 70% opacity letter when assigned */
.tile.blank-tile {
    /* Same appearance as regular tile, just empty */
}

/* Letter on an assigned blank tile - 70% opacity */
.tile .tile-letter.blank-letter {
    opacity: 0.7;
}

/* Blank Letter Selection Modal */
.blank-letter-modal-content h3 {
    color: var(--text-dark);
    margin-bottom: 20px;
}

.letter-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    margin-bottom: 20px;
    max-width: 280px;
    margin-left: auto;
    margin-right: auto;
}

.letter-grid button {
    width: 36px;
    height: 36px;
    font-size: 16px;
    font-weight: bold;
    color: #333;
    background: var(--tile-bg);
    border: 2px solid var(--tile-border);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
    -webkit-appearance: none;  /* Prevent iOS Safari default styling */
}

.letter-grid button:hover {
    background: #ffd700;
    border-color: #daa520;
    transform: scale(1.1);
}

.letter-grid button:active {
    transform: scale(0.95);
}
```

---

## 5. JavaScript: `script.js`

This is the largest set of changes. Key additions:

### A. Add to gameState initialization

```javascript
const gameState = {
    // ... existing properties ...
    pendingBlankPlacement: null,  // Stores {cell, tile} when blank awaiting letter selection
    blankPositions: []  // Track positions of blank tiles on the board [{row, col, letter}]
};
```

### B. Add to TILE_SCORES

```javascript
const TILE_SCORES = {
    // ... existing scores ...
    '_': 0  // Blank tiles
};
```

### C. Initialize letter grid (call in init)

```javascript
function initLetterGrid() {
    const letterGrid = document.getElementById('letter-grid');
    if (!letterGrid) return;

    letterGrid.innerHTML = '';
    for (let i = 0; i < 26; i++) {
        const letter = String.fromCharCode(65 + i); // A-Z
        const button = document.createElement('button');
        button.textContent = letter;
        button.addEventListener('click', () => handleBlankLetterSelection(letter));
        letterGrid.appendChild(button);
    }

    // Cancel button handler
    document.getElementById('cancel-blank-selection')?.addEventListener('click', cancelBlankPlacement);
}
```

### D. Blank tile modal functions

```javascript
function showBlankLetterModal(cell, tile) {
    document.getElementById('blank-letter-modal').style.display = 'flex';
    gameState.pendingBlankPlacement = { cell, tile };
}

function handleBlankLetterSelection(letter) {
    const { cell, tile } = gameState.pendingBlankPlacement;
    document.getElementById('blank-letter-modal').style.display = 'none';
    placeBlankTile(cell, tile, letter);
    gameState.pendingBlankPlacement = null;
}

function cancelBlankPlacement() {
    document.getElementById('blank-letter-modal').style.display = 'none';
    // Return tile to rack if needed
    gameState.pendingBlankPlacement = null;
}

function placeBlankTile(cell, tile, assignedLetter) {
    // Place the tile with the assigned letter
    // Similar to regular placeTile but with isBlank: true
    // Letter displays at 70% opacity
    // Score shows empty (not 0)
}
```

### E. Update tile rendering for blanks

When creating tile elements:
```javascript
// Check if blank
const isBlank = letter === '_' || tile.isBlank;
if (isBlank) {
    tileDiv.classList.add('blank-tile');
    tileDiv.dataset.isBlank = 'true';
}

// Letter span
const letterSpan = document.createElement('span');
letterSpan.className = 'tile-letter';
if (isBlank && !assignedLetter) {
    letterSpan.textContent = '';  // Empty in rack
} else if (isBlank) {
    letterSpan.textContent = assignedLetter;
    letterSpan.classList.add('blank-letter');  // 70% opacity
}

// Score span - blanks show empty
scoreSpan.textContent = isBlank ? '' : (TILE_SCORES[letter] || 0);
```

### F. Update placeTile to detect blanks

```javascript
function placeTile(cell, tile) {
    const letter = tile.dataset.letter;
    const isBlank = letter === '_' || tile.dataset.isBlank === 'true';

    if (isBlank) {
        showBlankLetterModal(cell, tile);
        return;  // Don't place yet - wait for letter selection
    }

    // ... rest of placement logic ...

    // Track placed tile with isBlank flag
    gameState.placedTiles.push({ row, col, letter, isBlank: false });
}
```

### G. Update calculateWordScore to check blankPositions

```javascript
function calculateWordScore(positions) {
    positions.forEach(({ row, col }) => {
        const letter = gameState.board[row][col];

        // Check both placedTiles (this turn) and blankPositions (previous turns)
        const placedTile = gameState.placedTiles.find(t => t.row === row && t.col === col);
        const isBlank = placedTile?.isBlank ||
            gameState.blankPositions?.some(b => b.row === row && b.col === col) || false;

        let letterScore = isBlank ? 0 : (TILE_SCORES[letter] || 0);
        // ... rest of scoring ...
    });
}
```

### H. Send blank_positions to server in submitWord

```javascript
fetch(`${API_BASE}/validate_word.py`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        seed: gameState.seed,
        board: gameState.board,
        placed_tiles: placedWord,
        blank_positions: gameState.blankPositions || [],  // ADD THIS
        debug_mode: gameState.debugMode
    })
})
```

### I. Store blank positions after word submission

```javascript
// After successful word submission, track blank positions
placedWord.forEach(tile => {
    if (tile.isBlank) {
        if (!gameState.blankPositions) {
            gameState.blankPositions = [];
        }
        gameState.blankPositions.push({ row: tile.row, col: tile.col, letter: tile.letter });
    }
});
```

---

## 6. URL Encoding (if sharing is supported)

RogueLetters already has the 5-element tile format `[row, col, letter, turn, blank]` prepared. The blank flag just needs to be set to 1 for blank tiles instead of always 0.

For V4-style encoding with blanks:
- Regular letters: A-Z encoded as 0-25
- Blank letters: a-z encoded as 26-51 (lowercase indicates blank)

---

## Testing Checklist

- [ ] Blank tiles appear in rack (2 per game)
- [ ] Blank tiles show empty in rack (no letter, no score)
- [ ] Clicking blank on board opens letter selection modal
- [ ] Selected letter shows at 70% opacity
- [ ] Blank scores 0 on first placement (even Q, Z)
- [ ] Blank on DW/TW still applies word multiplier, but letter contributes 0
- [ ] Words using previous turn's blank still score blank as 0
- [ ] Preview score matches submitted score for blanks
- [ ] Blank positions persist across turns
- [ ] Share URLs encode/decode blanks correctly (if applicable)
