# WikiLetters Scoring Analysis & Fix Methodology

## Current Problem
Frontend and backend calculate scores differently, resulting in mismatched scores:
- **Frontend Preview**: Shows "AN (3)" - correctly calculates 3 points
- **Backend Validation**: Returns score=1 - incorrectly only counts new tiles

## Frontend Scoring (JavaScript - CORRECT)

### Algorithm (script.js)
1. **Find all formed words** (`findFormedWords()`):
   - For each placed tile, check horizontal and vertical words
   - Include ALL letters in the word (both new and existing)
   - Remove duplicate words

2. **Calculate score for each word** (`calculateWordScore()`):
   - For EACH letter in the word:
     - Base score from TILE_SCORES
     - If letter is newly placed:
       - Apply letter multipliers (2x or 3x)
       - Track word multipliers (2x or 3x)
   - Apply word multiplier to total
   - Add 50-point bonus for using all 7 tiles

### Example: Placing "N" below "O" to form "ON"
```
Word: ON (vertical)
O = 1 point (existing tile, no multiplier)
N = 1 point × 2 (new tile on double-letter) = 2 points
Total: 3 points
```

## Backend Scoring (Python - INCORRECT)

### Current Algorithm (validate_word.py:211-228)
```python
def calculate_score(board, placed_tiles):
    score = 0
    word_multiplier = 1

    for tile in placed_tiles:  # ONLY COUNTS NEW TILES!
        letter_score = TILE_SCORES.get(letter, 0)
        if row == 7 and col == 7:  # Only checks center
            word_multiplier *= 2
        score += letter_score

    return score * word_multiplier
```

### Problems:
1. **Only counts newly placed tiles** - ignores existing letters in formed words
2. **No multiplier detection** - only checks center star (7,7)
3. **No word identification** - doesn't know what words were formed
4. **No perpendicular word scoring** - misses cross-words

## Required Fix Methodology

### Step 1: Define Board Multiplier Map
```python
MULTIPLIERS = {
    # Double Letter Scores
    'DL': [(0,3), (0,11), (2,6), (2,8), ...],
    # Triple Letter Scores
    'TL': [(1,5), (1,9), (5,1), (5,5), ...],
    # Double Word Scores
    'DW': [(1,1), (2,2), (3,3), (4,4), ...],
    # Triple Word Scores
    'TW': [(0,0), (0,7), (0,14), (7,0), ...]
}
```

### Step 2: Enhance Word Extraction
Already done in `extract_words_formed()` - it finds all words correctly.

### Step 3: Rewrite calculate_score()
```python
def calculate_score(board, placed_tiles, words_formed):
    total_score = 0

    # Convert placed tiles to set for quick lookup
    placed_positions = {(t['row'], t['col']) for t in placed_tiles}

    for word_data in words_formed:
        word_score = 0
        word_multiplier = 1

        # Score each letter in the word
        for position in word_data['positions']:
            row, col = position
            letter = board[row][col]
            letter_score = TILE_SCORES.get(letter, 0)

            # Apply multipliers ONLY if this is a newly placed tile
            if (row, col) in placed_positions:
                cell_type = get_multiplier(row, col)
                if cell_type == 'DL':
                    letter_score *= 2
                elif cell_type == 'TL':
                    letter_score *= 3
                elif cell_type == 'DW':
                    word_multiplier *= 2
                elif cell_type == 'TW':
                    word_multiplier *= 3

            word_score += letter_score

        word_score *= word_multiplier
        total_score += word_score

    # Add bingo bonus
    if len(placed_tiles) == 7:
        total_score += 50

    return total_score
```

### Step 4: Extract Word Positions
Modify `extract_words_formed()` to return positions:
```python
def extract_words_formed(board, placed_tiles):
    words_formed = []
    # ... existing logic ...

    # Return word data with positions
    words_formed.append({
        'word': word_text,
        'positions': [(r, c) for r in range(start, end)]
    })
```

### Step 5: Add Multiplier Detection
```python
def get_multiplier(row, col):
    # Define the board layout
    if (row, col) in [(0,3), (0,11), ...]:
        return 'DL'
    elif (row, col) in [(1,5), (1,9), ...]:
        return 'TL'
    # ... etc
    return None
```

## Test Cases to Verify

1. **Single tile forming perpendicular word**:
   - Place N below O to form "ON"
   - Expected: 3 points (O=1, N=2 with double letter)

2. **Multiple tiles forming main word**:
   - Place "AT" after "C" to form "CAT"
   - Expected: C=3, A=1, T=1 = 5 points

3. **Word with multipliers**:
   - Place word crossing triple word score
   - Verify 3x multiplier applies

4. **Bingo bonus**:
   - Use all 7 tiles
   - Verify 50-point bonus added

## Implementation Priority

1. **HIGH**: Fix basic scoring to count all letters in formed words
2. **HIGH**: Add multiplier detection and application
3. **MEDIUM**: Ensure perpendicular words are scored
4. **LOW**: Add detailed scoring breakdown in response

## Validation
After implementation, run test suite to verify:
- Frontend preview matches backend score
- All Scrabble scoring rules are correctly applied
- Edge cases (single tiles, multiple words, multipliers) work correctly