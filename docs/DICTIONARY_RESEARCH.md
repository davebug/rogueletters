# Dictionary Research and Recommendations

## Overview

For a Scrabble-like word game, we need a comprehensive, free, locally-hostable dictionary that provides fast word validation without external dependencies.

## Dictionary Options Analysis

### 1. ENABLE (Enhanced North American Benchmark Lexicon)

**Recommended - Primary Choice**

- **Word Count**: 172,820 words
- **License**: Public Domain
- **File Size**: ~2 MB uncompressed, ~600 KB compressed
- **Pros**:
  - Completely free and open
  - No licensing restrictions
  - Good balance of common and challenging words
  - Well-maintained and documented
  - Used by many word games
- **Cons**:
  - North American English only
  - Missing some modern slang/technical terms
- **Source**: https://github.com/dolph/dictionary

### 2. SCOWL (Spell Checker Oriented Word Lists)

**Recommended - Alternative Choice**

- **Word Count**: Variable (35,000 to 700,000+ depending on size)
- **License**: Public Domain / MIT-style
- **File Size**: 500 KB to 8 MB depending on variant
- **Pros**:
  - Highly customizable word lists
  - Multiple size options (10, 20, 35, 40, 50, 55, 60, 70, 80, 95)
  - Includes variants, accents, and spelling variations
  - Can exclude profanity, proper nouns
  - International English support
- **Cons**:
  - Requires configuration/filtering
  - May include non-game-appropriate words
- **Source**: http://wordlist.aspell.net/

### 3. Moby Word Lists

- **Word Count**: 354,984 words (Moby Words)
- **License**: Public Domain
- **File Size**: ~3.5 MB
- **Pros**:
  - Extensive word list
  - Includes hyphenated words
  - Public domain
- **Cons**:
  - Includes many obscure/archaic words
  - Larger file size
  - May be too comprehensive for casual play
- **Source**: Project Gutenberg

### 4. Google 10000 English

- **Word Count**: 10,000 - 20,000 words
- **License**: MIT (various implementations)
- **File Size**: ~100-200 KB
- **Pros**:
  - Very small file size
  - Common words only
  - Fast loading
- **Cons**:
  - Too limited for full gameplay
  - Missing many valid Scrabble words
  - Best used for starting words only
- **Use Case**: Starting word selection, not validation

### 5. TWL06 (Tournament Word List)

- **Word Count**: 178,691 words
- **License**: Proprietary (Hasbro/Mattel)
- **File Size**: ~2 MB
- **Pros**:
  - Official Scrabble tournament list (North America)
  - Well-balanced for competitive play
- **Cons**:
  - Legal restrictions
  - Not free for commercial use
  - Copyright concerns
- **Status**: Not recommended due to licensing

### 6. SOWPODS/CSW19

- **Word Count**: 279,496 words
- **License**: Proprietary (Collins)
- **File Size**: ~3 MB
- **Pros**:
  - International Scrabble standard
  - Most comprehensive
- **Cons**:
  - Proprietary/licensed
  - Not freely available
  - Copyright restrictions
- **Status**: Not recommended due to licensing

## Implementation Strategy

### Recommended Approach

1. **Primary Dictionary**: ENABLE
   - Use for main word validation
   - Public domain, no legal issues
   - Good balance for gameplay

2. **Starting Words**: Curated subset
   - Extract 500-1000 common 5-7 letter words
   - Use frequency data or Google 10000 as base
   - Manually review for appropriateness

3. **Dictionary Structure**:
```
dictionaries/
├── enable.txt           # Full ENABLE dictionary
├── starting_words.txt   # Curated starting words
└── profanity_filter.txt # Optional exclusion list
```

### Loading and Optimization

```python
class OptimizedDictionary:
    def __init__(self):
        self.words = set()
        self.by_length = defaultdict(set)
        self.prefixes = set()

    def load_enable(self, path='dictionaries/enable.txt'):
        """Load ENABLE dictionary with optimizations"""
        with open(path, 'r') as f:
            for line in f:
                word = line.strip().upper()
                if 2 <= len(word) <= 15:  # Valid game lengths
                    self.words.add(word)
                    self.by_length[len(word)].add(word)

                    # Build prefix tree for validation
                    for i in range(2, len(word)):
                        self.prefixes.add(word[:i])

    def is_valid_word(self, word):
        """O(1) lookup"""
        return word.upper() in self.words

    def has_valid_prefix(self, prefix):
        """Check if prefix could form valid word"""
        return prefix.upper() in self.prefixes
```

### Performance Considerations

1. **Memory Usage**:
   - ENABLE in memory: ~15-20 MB
   - Set structure: O(1) lookups
   - Prefix tree: Additional ~10 MB

2. **Load Time**:
   - Initial load: ~100-200ms
   - Can be cached in browser
   - Consider lazy loading

3. **Compression**:
   - Gzip dictionary: 600 KB transfer
   - Browser caching reduces repeat loads
   - Consider CDN for static files

## Dictionary Preparation

### Download and Setup Script

```bash
#!/bin/bash
# setup_dictionary.sh

# Create directory
mkdir -p dictionaries

# Download ENABLE
wget https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt \
     -O dictionaries/enable.txt

# Convert to uppercase
tr '[:lower:]' '[:upper:]' < dictionaries/enable.txt > dictionaries/enable_upper.txt
mv dictionaries/enable_upper.txt dictionaries/enable.txt

# Create compressed version
gzip -c dictionaries/enable.txt > dictionaries/enable.txt.gz

# Extract common starting words (5-7 letters)
grep -E '^.{5,7}$' dictionaries/enable.txt | head -1000 > dictionaries/starting_words_candidates.txt

echo "Dictionary setup complete!"
echo "Word count: $(wc -l < dictionaries/enable.txt)"
echo "Starting candidates: $(wc -l < dictionaries/starting_words_candidates.txt)"
```

### Validation Testing

```python
# test_dictionary.py
def test_dictionary_coverage():
    """Ensure dictionary has good coverage"""

    # Common words that must be present
    required_words = [
        'CAT', 'DOG', 'HELLO', 'WORLD', 'QUIZ', 'JAZZ',
        'QUICK', 'BROWN', 'FOX', 'JUMPS', 'LAZY', 'SPHINX'
    ]

    # Valid 2-letter words (important for gameplay)
    two_letter = [
        'AA', 'AB', 'AD', 'AE', 'AG', 'AH', 'AI', 'AL',
        'AM', 'AN', 'AR', 'AS', 'AT', 'AW', 'AX', 'AY',
        'BA', 'BE', 'BI', 'BO', 'BY', 'DE', 'DO', 'ED',
        'EF', 'EH', 'EL', 'EM', 'EN', 'ER', 'ES', 'ET',
        'EX', 'FA', 'FE', 'GO', 'HA', 'HE', 'HI', 'HM'
    ]

    dictionary = load_dictionary('dictionaries/enable.txt')

    # Check required words
    for word in required_words:
        assert word in dictionary, f"Missing common word: {word}"

    # Check 2-letter words
    for word in two_letter:
        assert word in dictionary, f"Missing 2-letter word: {word}"

    print(f"✓ Dictionary validated: {len(dictionary)} words")
```

## Alternative Approaches

### 1. Bloom Filter for Client-Side

For browser-based validation without sending full dictionary:

```javascript
class BloomFilter {
    constructor(size = 1000000, hashFunctions = 3) {
        this.size = size;
        this.storage = new Uint8Array(Math.ceil(size / 8));
        this.hashFunctions = hashFunctions;
    }

    add(word) {
        for (let i = 0; i < this.hashFunctions; i++) {
            const index = this.hash(word, i) % this.size;
            const byteIndex = Math.floor(index / 8);
            const bitIndex = index % 8;
            this.storage[byteIndex] |= (1 << bitIndex);
        }
    }

    might_contain(word) {
        for (let i = 0; i < this.hashFunctions; i++) {
            const index = this.hash(word, i) % this.size;
            const byteIndex = Math.floor(index / 8);
            const bitIndex = index % 8;
            if (!(this.storage[byteIndex] & (1 << bitIndex))) {
                return false;
            }
        }
        return true;  // Might have false positives
    }
}
```

### 2. Trie Structure for Prefix Validation

```javascript
class Trie {
    constructor() {
        this.root = {};
    }

    insert(word) {
        let node = this.root;
        for (const char of word) {
            if (!node[char]) {
                node[char] = {};
            }
            node = node[char];
        }
        node.isWord = true;
    }

    search(word) {
        let node = this.root;
        for (const char of word) {
            if (!node[char]) return false;
            node = node[char];
        }
        return node.isWord === true;
    }

    hasPrefix(prefix) {
        let node = this.root;
        for (const char of prefix) {
            if (!node[char]) return false;
            node = node[char];
        }
        return true;
    }
}
```

## Recommendations

### Primary Recommendation

1. **Use ENABLE dictionary** for word validation
   - Public domain, no legal issues
   - 172,820 words is sufficient
   - Well-tested in word games

2. **Implement server-side validation** for security
   - Client has compressed dictionary for offline play
   - Server validates for score submission

3. **Create curated starting word list**
   - 500-1000 common 5-7 letter words
   - Manually reviewed for appropriateness
   - Balanced difficulty

### Implementation Priority

1. **Phase 1**: Basic ENABLE integration
   - Simple set-based validation
   - Server-side only

2. **Phase 2**: Optimization
   - Add client-side validation
   - Implement prefetching
   - Add compression

3. **Phase 3**: Enhanced features
   - Prefix validation for hints
   - Word suggestions
   - Difficulty-based filtering

## Legal Considerations

### Safe Options
- ENABLE - Public Domain ✓
- SCOWL - Public Domain/MIT ✓
- Moby - Public Domain ✓
- Custom curated lists ✓

### Avoid
- TWL06 - Proprietary ✗
- SOWPODS/CSW - Proprietary ✗
- Direct Scrabble word lists ✗

### Attribution
Even for public domain, include attribution:
```
This game uses the ENABLE word list.
ENABLE is in the public domain.
```

## Testing Strategy

### Dictionary Validation Tests

```python
def validate_dictionary():
    """Comprehensive dictionary validation"""

    tests = {
        'min_words': 150000,
        'max_words': 200000,
        'has_two_letter': True,
        'has_q_without_u': ['QI', 'QAT', 'QOPH', 'QADI'],
        'common_words': ['HOUSE', 'WATER', 'LIGHT', 'WORLD'],
        'max_word_length': 15,
        'min_word_length': 2
    }

    # Run validation
    dictionary = load_dictionary()
    assert len(dictionary) >= tests['min_words']
    assert len(dictionary) <= tests['max_words']

    # Check word lengths
    lengths = {len(word) for word in dictionary}
    assert min(lengths) == tests['min_word_length']
    assert max(lengths) <= tests['max_word_length']

    return True
```

## Conclusion

**ENABLE dictionary is the recommended choice** for this project:
- Free and legal to use
- Appropriate size and coverage
- Well-documented and maintained
- No licensing concerns
- Used successfully in similar projects

Implementation should focus on efficient loading, caching, and validation both client-side (for responsiveness) and server-side (for security).