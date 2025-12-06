# Word Finder Tool - Feasibility Analysis

## Overview
A tool that finds all possible valid words given:
1. Player's 7 tiles in rack
2. Current board state
3. Scrabble placement rules

## Implementation Approaches

### Approach 1: Brute Force (Simplest)
```python
def find_all_possible_words(rack, board):
    """Find all valid words that can be made"""
    possible_words = []

    # For each valid anchor point on board
    for row, col in get_anchor_squares(board):
        # Try each permutation of rack tiles
        for perm in get_permutations(rack, 1, 7):
            # Try horizontal
            if can_place_horizontal(perm, row, col, board):
                word = form_word_horizontal(perm, row, col, board)
                if is_valid_word(word) and all_cross_words_valid():
                    possible_words.append({
                        'word': word,
                        'position': (row, col),
                        'direction': 'H',
                        'score': calculate_score(word)
                    })

            # Try vertical
            # ... similar logic

    return sorted(possible_words, key=lambda x: x['score'], reverse=True)
```

**Pros**: Straightforward, guaranteed to find all words
**Cons**: Computationally expensive (7! = 5,040 permutations × many positions)

### Approach 2: Trie-Based Search (Smarter)
```python
class TrieWordFinder:
    def __init__(self, dictionary):
        self.trie = build_trie(dictionary)

    def find_words(self, rack, board):
        """Use trie to efficiently find valid words"""
        words = []

        for row, col in get_anchor_squares(board):
            # Build words left-to-right using trie
            self.extend_right(row, col, rack, board, self.trie.root, "", words)

        return words

    def extend_right(self, row, col, rack, board, node, word_so_far, results):
        """Recursively build words using trie"""
        # If current position has a tile already
        if board[row][col]:
            letter = board[row][col]
            if letter in node.children:
                self.extend_right(row, col+1, rack, board,
                                node.children[letter], word_so_far + letter, results)
        else:
            # Try each tile from rack
            for i, tile in enumerate(rack):
                if tile in node.children:
                    # Check if cross-word would be valid
                    if is_valid_cross_word(row, col, tile, board):
                        new_rack = rack[:i] + rack[i+1:]
                        self.extend_right(row, col+1, new_rack, board,
                                        node.children[tile], word_so_far + tile, results)
```

**Pros**: Much faster, prunes invalid paths early
**Cons**: More complex to implement

### Approach 3: Pattern Matching (Fastest)
```python
def find_words_by_pattern(rack, board):
    """Find words that match board patterns"""

    # Pre-compute all possible letter combinations from rack
    rack_combinations = generate_combinations(rack)  # "AELRSTT" -> ["A", "AE", "AEL", ...]

    # For each anchor position, determine pattern
    patterns = []
    for row, col in get_anchor_squares(board):
        # e.g., "HO_SE" where _ can be filled
        pattern = get_pattern(row, col, board)
        patterns.append((pattern, row, col))

    # Match patterns against dictionary
    matches = []
    for pattern, row, col in patterns:
        matching_words = find_words_matching_pattern(pattern, rack_combinations)
        matches.extend(matching_words)

    return matches
```

**Pros**: Very fast with pre-computed patterns
**Cons**: Complex pattern matching logic

## Feasibility Assessment

### Performance Considerations

**Board Positions to Check**: ~50-100 anchor points typically
**Rack Permutations**: Up to 7! = 5,040
**Dictionary Size**: ~170,000 words

**Estimated Time**:
- Brute Force: 2-5 seconds
- Trie-Based: 100-500ms
- Pattern Match: 50-200ms

### Integration Options

#### Option A: Hint Button (Server-Side)
```javascript
// Client
async function getHint() {
    const response = await fetch('/cgi-bin/find_words.py', {
        method: 'POST',
        body: JSON.stringify({
            rack: playerRack,
            board: boardState
        })
    });
    const hints = await response.json();
    showTopHints(hints.slice(0, 5));  // Show top 5 options
}
```

#### Option B: Real-Time Suggestions (Client-Side)
```javascript
// Would need to load dictionary in browser
class WordFinder {
    constructor(dictionary) {
        this.dict = new Set(dictionary);
        this.trie = buildTrie(dictionary);
    }

    findWords(rack, board) {
        // Lighter-weight algorithm for client
        // Maybe just check specific positions
    }
}
```

#### Option C: Progressive Disclosure
```javascript
// Show hints gradually
function showHints(level) {
    switch(level) {
        case 1: // Show best position
            highlightBestAnchor();
            break;
        case 2: // Show possible length
            showMessage("Try a 5-letter word");
            break;
        case 3: // Show first letter
            showMessage("Try starting with 'S'");
            break;
        case 4: // Show full word
            showWord("STONE");
            break;
    }
}
```

## Implementation Recommendation

### Phase 1: Basic Hint System (MVP)
```python
def get_best_move(rack, board):
    """Find single best scoring move"""
    best = None
    best_score = 0

    # Simplified search - only check obvious positions
    for row, col in get_high_value_anchors(board):
        # Only check common patterns
        for word in get_common_words_from_rack(rack):
            if can_place_word(word, row, col, board):
                score = calculate_score(word, row, col, board)
                if score > best_score:
                    best = (word, row, col, score)

    return best
```

### Phase 2: Full Word Finder
- Implement trie-based search
- Cache results for common board states
- Optimize for mobile performance

### Phase 3: AI Opponent Mode
- Use word finder to create computer opponent
- Difficulty levels (play nth-best word)
- Teaching mode with explanations

## UI/UX Considerations

### Hint Presentation Options

1. **Subtle Hints**
   - Flash an anchor square
   - Highlight tiles that make words
   - Show word length indicator

2. **Direct Hints**
   - "Best word: STONE (45 points)"
   - Show placement position
   - Demonstrate with ghost tiles

3. **Teaching Mode**
   - Explain why it's the best move
   - Show alternative options
   - Compare scores

### Controls
```javascript
// Progressive hint button
<button onclick="getHint()">
    💡 Hint (3 remaining)
</button>

// Or keyboard shortcut
document.addEventListener('keydown', (e) => {
    if (e.key === 'h') showHint();
});
```

## Performance Optimizations

1. **Pre-compute Common Patterns**
   ```python
   COMMON_PATTERNS = {
       "ING": ["SING", "RING", "KING", ...],
       "ED": ["RED", "BED", "SHED", ...],
       # etc.
   }
   ```

2. **Cache Board Analysis**
   ```python
   @lru_cache(maxsize=1000)
   def get_anchor_squares(board_hash):
       # Cache anchor point calculation
   ```

3. **Limit Search Depth**
   ```python
   MAX_WORDS_TO_CHECK = 100  # Stop after finding enough
   ```

## Conclusion

**Feasibility: HIGH** ✅

**Recommended Implementation**:
1. Start with server-side hint button (Phase 1)
2. Find top 3-5 moves using simplified algorithm
3. Add progressive hints for teaching
4. Optimize algorithm over time

**Benefits**:
- Helps stuck players
- Educational tool
- Reduces frustration
- Could power "best possible score" stats

**Estimated Time**:
- Basic version: 1-2 days
- Full version: 3-5 days
- Optimized version: 1-2 weeks

Should we plan to include this in Phase 2?