# Daily Letters - Final Implementation Specification

## All Decisions Made ✅

### Game Rules (Scrabble Official)
- First word must cross center (our starting word)
- All words must connect to existing tiles
- All formed words must be valid
- Multipliers apply to all words formed that turn
- 50-point bonus for using all 7 tiles

### Tile System
- **100 tiles total** (standard Scrabble distribution, no blanks)
- **Starting word CONSUMES tiles** from the bag
- **Deterministic order** via seeded random shuffle

### Tile Bag Implementation
```python
def setup_game(seed, date):
    # 1. Create all 100 tiles
    tiles = create_standard_tiles()  # 9 A's, 2 B's, etc.

    # 2. Shuffle with seed
    random.seed(seed)
    random.shuffle(tiles)

    # 3. Get starting word for this date
    starting_word = get_starting_word(date)  # e.g., "HOUSE"

    # 4. Remove starting word tiles from bag
    for letter in starting_word:
        tiles.remove(letter)  # Removes first occurrence

    # 5. Player draws first 7 from remaining tiles
    player_tiles = tiles[:7]
    remaining = tiles[7:]

    return starting_word, player_tiles, remaining
```

### Interaction Flow (Click-to-Build)
1. **Click tile in rack** → Tile highlights (selected)
2. **Click board square** → Tile places (ghost/tentative)
3. **Continue placing** → Build word tile by tile
4. **Click "Submit"** → Validate all words formed
5. **If valid** → Lock tiles, calculate score, draw new tiles
6. **If invalid** → Return tiles to rack, show error

### Visual Feedback (All Enabled)
- **Ghost tiles**: Semi-transparent while building
- **Valid squares**: Green highlight on hover
- **Tentative score**: Updates as you place tiles
- **Used multipliers**: Fade after use
- **Current word**: Yellow outline while building

### Dictionary Validation (Server-Side)
```python
# /cgi-bin/validate_word.py
def validate_placement(board, new_tiles):
    # Find all words formed
    words = find_all_words(board, new_tiles)

    # Check each against ENABLE dictionary
    for word in words:
        if not word in ENABLE_DICT:
            return {
                "valid": False,
                "invalid_word": word,
                "message": f"'{word}' is not a valid word"
            }

    # Calculate score if all valid
    score = calculate_score(words, new_tiles)
    return {
        "valid": True,
        "words": words,
        "score": score
    }
```

## Complete Technical Architecture

### Frontend State Management
```javascript
class GameState {
    constructor() {
        this.board = new Array(15).fill().map(() =>
            new Array(15).fill(null)
        );
        this.startingWord = null;
        this.playerRack = [];  // Current 7 tiles
        this.tilesRemaining = [];  // Rest of bag
        this.placedTiles = [];  // Current turn's placement
        this.currentTurn = 1;
        this.totalScore = 0;
        this.turnScores = [];
        this.retriesUsed = 0;
        this.gameDate = null;
        this.seed = null;
    }
}
```

### Tile Placement Logic
```javascript
class TilePlacement {
    constructor(gameState) {
        this.selectedTile = null;
        this.ghostTiles = [];  // Tentatively placed
    }

    selectTile(rackIndex) {
        this.selectedTile = rackIndex;
        highlightTile(rackIndex);
        showValidSquares();
    }

    placeOnBoard(row, col) {
        if (!isValidSquare(row, col)) {
            showError("Invalid placement");
            return;
        }

        // Add ghost tile
        this.ghostTiles.push({
            row, col,
            letter: this.selectedTile.letter,
            value: this.selectedTile.value
        });

        // Update tentative score
        updateScorePreview();

        // Remove from rack (temporarily)
        this.selectedTile = null;
    }

    submitWord() {
        // Send to server for validation
        validatePlacement(this.ghostTiles);
    }
}
```

### Word Finding Algorithm
```python
def find_all_words(board, new_tiles):
    """Find all words formed by new tile placement"""
    words = []

    # Check if new tiles form a horizontal word
    if forms_horizontal_line(new_tiles):
        word = get_horizontal_word(board, new_tiles)
        words.append(word)

        # Check each new tile for vertical cross-words
        for tile in new_tiles:
            cross = get_vertical_word_at(board, tile.row, tile.col)
            if len(cross) > 1:
                words.append(cross)

    # Check if new tiles form a vertical word
    elif forms_vertical_line(new_tiles):
        word = get_vertical_word(board, new_tiles)
        words.append(word)

        # Check each new tile for horizontal cross-words
        for tile in new_tiles:
            cross = get_horizontal_word_at(board, tile.row, tile.col)
            if len(cross) > 1:
                words.append(cross)

    return words
```

### Score Calculation
```python
def calculate_score(words, new_tiles, board):
    """Calculate score following Scrabble rules"""
    total_score = 0

    for word_data in words:
        word_score = 0
        word_multiplier = 1

        for tile in word_data.tiles:
            letter_score = LETTER_VALUES[tile.letter]

            # Only apply multipliers for newly placed tiles
            if tile in new_tiles:
                square = board[tile.row][tile.col]
                if square.type == 'DL':
                    letter_score *= 2
                elif square.type == 'TL':
                    letter_score *= 3
                elif square.type == 'DW':
                    word_multiplier *= 2
                elif square.type == 'TW':
                    word_multiplier *= 3

            word_score += letter_score

        word_score *= word_multiplier
        total_score += word_score

    # Bingo bonus
    if len(new_tiles) == 7:
        total_score += 50

    return total_score
```

## File Structure (Final)

```
/letters/
├── index.html                 # Game UI
├── css/
│   ├── game.css              # Main styles
│   └── mobile.css            # Mobile overrides
├── js/
│   ├── game.js               # Main game logic
│   ├── board.js              # Board management
│   ├── tiles.js              # Tile interactions
│   ├── validation.js         # Client-side helpers
│   └── state.js              # State management
├── cgi-bin/
│   ├── get_daily_game.py     # Initial game setup
│   ├── validate_word.py      # Word validation
│   └── submit_score.py       # Leaderboard (Phase 2)
├── data/
│   ├── enable.txt            # Dictionary
│   ├── starter_words.txt     # 200 words for MVP
│   └── profanity_filter.txt  # Minimal blocklist
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
└── scripts/
    └── letters_start.sh       # Dev startup

```

## Implementation Order

### Day 1: Foundation
1. Create Docker environment
2. Basic HTML structure
3. CSS grid board
4. Display starting word

### Day 2: Tiles
1. Tile rack display
2. Click to select
3. Click to place (ghost)
4. Visual feedback

### Day 3: Validation
1. Find words algorithm
2. Server validation endpoint
3. Score calculation
4. Error handling

### Day 4: Game Flow
1. Turn management
2. Tile refill
3. 5-turn limit
4. Game over state

### Day 5: Polish
1. Mobile optimization
2. Animations
3. Date handling
4. Share feature (basic)

## Ready to Code!

All unknowns resolved. Every decision documented. Let's build! 🚀