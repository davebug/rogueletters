# Daily Letters Game - Data Specifications

## Tile Specifications

### Letter Distribution and Values

| Letter | Quantity | Point Value | Percentage of Bag |
|--------|----------|-------------|-------------------|
| A      | 9        | 1           | 9%                |
| B      | 2        | 3           | 2%                |
| C      | 2        | 3           | 2%                |
| D      | 4        | 2           | 4%                |
| E      | 12       | 1           | 12%               |
| F      | 2        | 4           | 2%                |
| G      | 3        | 2           | 3%                |
| H      | 2        | 4           | 2%                |
| I      | 9        | 1           | 9%                |
| J      | 1        | 8           | 1%                |
| K      | 1        | 5           | 1%                |
| L      | 4        | 1           | 4%                |
| M      | 2        | 3           | 2%                |
| N      | 6        | 1           | 6%                |
| O      | 8        | 1           | 8%                |
| P      | 2        | 3           | 2%                |
| Q      | 1        | 10          | 1%                |
| R      | 6        | 1           | 6%                |
| S      | 4        | 1           | 4%                |
| T      | 6        | 1           | 6%                |
| U      | 4        | 1           | 4%                |
| V      | 2        | 4           | 2%                |
| W      | 2        | 4           | 2%                |
| X      | 1        | 8           | 1%                |
| Y      | 2        | 4           | 2%                |
| Z      | 1        | 10          | 1%                |
| Blank  | 2        | 0           | 2%                |
| **Total** | **100** |          | **100%**          |

### Tile Data Structure

```json
{
  "tile": {
    "letter": "A",
    "value": 1,
    "id": "tile_001",
    "isBlank": false,
    "blankAssignment": null
  }
}
```

### Tile Bag Initialization

```python
TILE_CONFIGURATION = [
    {"letter": "A", "value": 1, "count": 9},
    {"letter": "B", "value": 3, "count": 2},
    {"letter": "C", "value": 3, "count": 2},
    {"letter": "D", "value": 2, "count": 4},
    {"letter": "E", "value": 1, "count": 12},
    {"letter": "F", "value": 4, "count": 2},
    {"letter": "G", "value": 2, "count": 3},
    {"letter": "H", "value": 4, "count": 2},
    {"letter": "I", "value": 1, "count": 9},
    {"letter": "J", "value": 8, "count": 1},
    {"letter": "K", "value": 5, "count": 1},
    {"letter": "L", "value": 1, "count": 4},
    {"letter": "M", "value": 3, "count": 2},
    {"letter": "N", "value": 1, "count": 6},
    {"letter": "O", "value": 1, "count": 8},
    {"letter": "P", "value": 3, "count": 2},
    {"letter": "Q", "value": 10, "count": 1},
    {"letter": "R", "value": 1, "count": 6},
    {"letter": "S", "value": 1, "count": 4},
    {"letter": "T", "value": 1, "count": 6},
    {"letter": "U", "value": 1, "count": 4},
    {"letter": "V", "value": 4, "count": 2},
    {"letter": "W", "value": 4, "count": 2},
    {"letter": "X", "value": 8, "count": 1},
    {"letter": "Y", "value": 4, "count": 2},
    {"letter": "Z", "value": 10, "count": 1},
    {"letter": "_", "value": 0, "count": 2}  # Blank tiles
]
```

## Board Layout Specifications

### Board Dimensions
- **Size**: 15x15 grid (225 total squares)
- **Indexing**: 0-based (0-14 for both rows and columns)
- **Center**: Position (7,7)

### Special Square Positions

#### Triple Word Score (Red) - 8 squares
```python
TRIPLE_WORD_SQUARES = [
    (0, 0),   (0, 7),   (0, 14),
    (7, 0),             (7, 14),
    (14, 0),  (14, 7),  (14, 14)
]
```

#### Double Word Score (Pink) - 17 squares
```python
DOUBLE_WORD_SQUARES = [
    (1, 1),   (1, 13),
    (2, 2),   (2, 12),
    (3, 3),   (3, 11),
    (4, 4),   (4, 10),
    (7, 7),   # Center square
    (10, 4),  (10, 10),
    (11, 3),  (11, 11),
    (12, 2),  (12, 12),
    (13, 1),  (13, 13)
]
```

#### Triple Letter Score (Blue) - 12 squares
```python
TRIPLE_LETTER_SQUARES = [
    (1, 5),   (1, 9),
    (5, 1),   (5, 5),   (5, 9),   (5, 13),
    (9, 1),   (9, 5),   (9, 9),   (9, 13),
    (13, 5),  (13, 9)
]
```

#### Double Letter Score (Light Blue) - 24 squares
```python
DOUBLE_LETTER_SQUARES = [
    (0, 3),   (0, 11),
    (2, 6),   (2, 8),
    (3, 0),   (3, 7),   (3, 14),
    (6, 2),   (6, 6),   (6, 8),   (6, 12),
    (7, 3),   (7, 11),
    (8, 2),   (8, 6),   (8, 8),   (8, 12),
    (11, 0),  (11, 7),  (11, 14),
    (12, 6),  (12, 8),
    (14, 3),  (14, 11)
]
```

### Board Data Structure

```javascript
// Board state representation
const boardState = {
    grid: [
        [null, null, "A", null, ...],  // Row 0
        [null, "B", "P", null, ...],   // Row 1
        // ... 13 more rows
    ],
    multipliers: [
        ["TW", null, null, "DL", ...],  // Row 0
        [null, "DW", null, null, ...],  // Row 1
        // ... 13 more rows
    ],
    usedMultipliers: [
        [false, false, true, false, ...],  // Row 0
        [false, true, true, false, ...],   // Row 1
        // ... 13 more rows
    ]
};
```

### Visual Board Layout
```
    0   1   2   3   4   5   6   7   8   9   10  11  12  13  14
  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
0 │TW │   │   │DL │   │   │   │TW │   │   │   │DL │   │   │TW │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
1 │   │DW │   │   │   │TL │   │   │   │TL │   │   │   │DW │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
2 │   │   │DW │   │   │   │DL │   │DL │   │   │   │DW │   │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
3 │DL │   │   │DW │   │   │   │DL │   │   │   │DW │   │   │DL │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
4 │   │   │   │   │DW │   │   │   │   │   │DW │   │   │   │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
5 │   │TL │   │   │   │TL │   │   │   │TL │   │   │   │TL │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
6 │   │   │DL │   │   │   │DL │   │DL │   │   │   │DL │   │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
7 │TW │   │   │DL │   │   │   │★  │   │   │   │DL │   │   │TW │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
8 │   │   │DL │   │   │   │DL │   │DL │   │   │   │DL │   │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
9 │   │TL │   │   │   │TL │   │   │   │TL │   │   │   │TL │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
10│   │   │   │   │DW │   │   │   │   │   │DW │   │   │   │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
11│DL │   │   │DW │   │   │   │DL │   │   │   │DW │   │   │DL │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
12│   │   │DW │   │   │   │DL │   │DL │   │   │   │DW │   │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
13│   │DW │   │   │   │TL │   │   │   │TL │   │   │   │DW │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
14│TW │   │   │DL │   │   │   │TW │   │   │   │DL │   │   │TW │
  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘

Legend:
★  = Start (Center, Double Word)
TW = Triple Word Score
DW = Double Word Score
TL = Triple Letter Score
DL = Double Letter Score
```

## Scoring Specifications

### Base Letter Values
```javascript
const LETTER_VALUES = {
    'A': 1,  'B': 3,  'C': 3,  'D': 2,
    'E': 1,  'F': 4,  'G': 2,  'H': 4,
    'I': 1,  'J': 8,  'K': 5,  'L': 1,
    'M': 3,  'N': 1,  'O': 1,  'P': 3,
    'Q': 10, 'R': 1,  'S': 1,  'T': 1,
    'U': 1,  'V': 4,  'W': 4,  'X': 8,
    'Y': 4,  'Z': 10, '_': 0  // Blank
};
```

### Scoring Rules

#### Word Formation
- Minimum word length: 2 letters
- Words must connect to existing tiles (except first word)
- Words can be formed horizontally (left-to-right) or vertically (top-to-bottom)
- All connected letters must form valid words

#### Multiplier Application
```python
def calculate_word_score(word_tiles, positions, is_new_tile):
    """
    Calculate score for a single word

    word_tiles: List of tiles forming the word
    positions: List of (row, col) positions
    is_new_tile: List of booleans indicating newly placed tiles
    """
    word_score = 0
    word_multiplier = 1

    for i, tile in enumerate(word_tiles):
        letter_score = LETTER_VALUES[tile.letter]

        # Multipliers only apply to newly placed tiles
        if is_new_tile[i]:
            row, col = positions[i]
            multiplier = board.get_multiplier(row, col)

            if multiplier == 'DL':
                letter_score *= 2
            elif multiplier == 'TL':
                letter_score *= 3
            elif multiplier == 'DW':
                word_multiplier *= 2
            elif multiplier == 'TW':
                word_multiplier *= 3

        word_score += letter_score

    return word_score * word_multiplier
```

#### Bonus Scoring
- **Bingo Bonus**: Using all 7 tiles in one turn = +50 points
- **Cross-word Scoring**: Each perpendicular word formed also scores

### Score Calculation Example
```
Turn: Player places "QUIZ" horizontally, starting at (7,4)
- Q (7,4): 10 points × 1 = 10
- U (7,5): 1 point × 1 = 1
- I (7,6): 1 point × 1 = 1
- Z (7,7): 10 points × 2 (DW center) = 20
Word subtotal: 32 × 2 = 64 points

If this also forms "ZOO" vertically:
- Z (7,7): 10 points (already placed)
- O (8,7): 1 point × 1 = 1
- O (9,7): 1 point × 1 = 1
Additional word: 12 points

Total score for turn: 64 + 12 = 76 points
```

## Game State Data

### Complete Game State
```json
{
  "gameId": "2024-03-15",
  "date": "2024-03-15",
  "seed": 1234567890,
  "status": "in_progress",
  "currentTurn": 3,
  "maxTurns": 5,
  "score": 145,
  "board": {
    "grid": [[...]],
    "usedMultipliers": [[...]]
  },
  "playerRack": [
    {"letter": "A", "value": 1, "id": "tile_042"},
    {"letter": "T", "value": 1, "id": "tile_089"},
    // ... 5 more tiles
  ],
  "tileBagRemaining": 65,
  "wordsPlayed": [
    {
      "turn": 1,
      "word": "HELLO",
      "score": 24,
      "position": {"row": 7, "col": 5, "direction": "horizontal"}
    },
    {
      "turn": 2,
      "word": "WORLD",
      "score": 32,
      "position": {"row": 6, "col": 7, "direction": "vertical"}
    }
  ],
  "startingWord": {
    "word": "START",
    "position": {"row": 7, "col": 5, "direction": "horizontal"}
  }
}
```

### Turn State
```json
{
  "turnNumber": 3,
  "tilesPlaced": [
    {"letter": "Q", "position": {"row": 6, "col": 5}},
    {"letter": "U", "position": {"row": 6, "col": 6}},
    {"letter": "I", "position": {"row": 6, "col": 7}},
    {"letter": "T", "position": {"row": 6, "col": 8}}
  ],
  "wordsFormed": [
    {"word": "QUIT", "score": 26, "direction": "horizontal"},
    {"word": "IT", "score": 2, "direction": "vertical"}
  ],
  "totalScore": 28,
  "tilesDrawn": 4,
  "validationStatus": "valid"
}
```

## Starting Words Criteria

### Word Selection Pool
```python
STARTING_WORD_CRITERIA = {
    "length_range": (5, 7),
    "frequency_minimum": 1000,  # If using word frequency data
    "common_words": True,
    "exclude_patterns": [
        r".*[XQZ].*",  # Avoid high-value letters
        r".*SS$",      # Avoid double-S endings
        r"^[AEIOU]",   # Avoid starting with vowels
    ],
    "preferred_patterns": [
        r".*[AEIOU].*[AEIOU].*",  # At least 2 vowels
        r".*[RSTNL].*",           # Contains common consonants
    ]
}
```

### Sample Starting Words
```
WORLD, LIGHT, STONE, PAPER, HOUSE, WATER, BEACH, CLOUD,
DREAM, EARTH, FIELD, GRAPE, HAPPY, JUMPY, KNIFE, LEMON,
MANGO, NIGHT, OCEAN, PEACE, QUIET, RIVER, SMILE, TABLE,
UNDER, VOICE, WHEAT, YOUTH, ZEBRA, BRAIN, CHAIR, DANCE,
EMPTY, FRESH, GIANT, HEART, INDEX, JELLY, KINGS, LUCKY,
MONEY, NORTH, ORBIT, PLANT, QUEST, ROUND, SPACE, TIGER,
UNITE, VALUE, WALTZ, YOUTH, ZONES
```

## Dictionary Data Format

### Primary Dictionary Structure
```
# enable.txt (one word per line, uppercase)
AA
AAH
AAHED
AAHING
AAHS
AAL
AALII
AALIIS
AALS
...
ZYZZYVA
ZYZZYVAS
```

### Dictionary Metadata (Optional)
```json
{
  "version": "2024.1",
  "wordCount": 172820,
  "source": "ENABLE",
  "lastUpdated": "2024-01-01",
  "languages": ["en"],
  "wordLengthDistribution": {
    "2": 101,
    "3": 1292,
    "4": 5454,
    "5": 12478,
    // ...
    "15": 1765
  }
}
```

## Configuration Files

### Game Constants
```javascript
// config.js
export const CONFIG = {
    // Board
    BOARD_SIZE: 15,
    CENTER_POSITION: 7,

    // Tiles
    RACK_SIZE: 7,
    TOTAL_TILES: 100,
    BINGO_BONUS: 50,

    // Game
    MAX_TURNS: 5,
    MIN_WORD_LENGTH: 2,
    MAX_WORD_LENGTH: 15,

    // Timing
    TURN_TIME_LIMIT: null,  // No limit initially
    GAME_TIME_LIMIT: null,  // No limit initially

    // Display
    TILE_SIZE: 40,  // pixels
    BOARD_PADDING: 20,
    ANIMATION_DURATION: 300,  // ms

    // Storage
    LOCAL_STORAGE_KEY: 'dailyLettersGame',
    STATS_STORAGE_KEY: 'dailyLettersStats'
};
```

### Color Scheme
```css
:root {
    /* Board Colors */
    --color-tw: #ee392b;  /* Triple Word - Red */
    --color-dw: #f4a8a1;  /* Double Word - Pink */
    --color-tl: #0092cc;  /* Triple Letter - Blue */
    --color-dl: #6eb5d0;  /* Double Letter - Light Blue */
    --color-center: #f4a8a1;  /* Center Star - Pink */

    /* Tile Colors */
    --color-tile-bg: #f5deb3;  /* Wheat */
    --color-tile-text: #2c3e50;
    --color-tile-border: #8b7355;
    --color-tile-shadow: rgba(0,0,0,0.3);

    /* UI Colors */
    --color-valid: #27ae60;
    --color-invalid: #e74c3c;
    --color-highlight: #f39c12;
    --color-disabled: #95a5a6;
}
```