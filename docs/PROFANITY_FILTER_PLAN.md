# Profanity Filter Implementation Plan

## Smart Filtering Approach

Only filter words that exist in BOTH:
1. The profanity lists (CMU/biglou)
2. The ENABLE dictionary

This dramatically reduces the filter size since many offensive terms aren't valid Scrabble words.

## Implementation Strategy

### Step 1: Find Intersection
```python
def create_game_profanity_filter():
    """Create filter from intersection of profanity lists and ENABLE"""

    # Load ENABLE dictionary
    with open('dictionaries/enable.txt', 'r') as f:
        enable_words = set(line.strip().upper() for line in f)

    # Load profanity list
    with open('data/biglou-bad-words.txt', 'r') as f:
        profanity = set(line.strip().upper() for line in f)

    # Find intersection - only words that are in BOTH
    blocked_game_words = enable_words & profanity

    return blocked_game_words
```

### Step 2: Manual Review
After finding the intersection, manually review to create tiers:

```python
# Tier 1: Always block (even in gameplay)
ALWAYS_BLOCKED = {
    # Only the most offensive slurs that are also valid words
    # Probably 20-50 words maximum
}

# Tier 2: Block only as starting words
STARTING_WORD_BLOCKED = {
    # Mild profanity that's valid in Scrabble
    # Examples: DAMN, HELL, CRAP, PISS
    # These are fine for players to form, but not as the daily word
}

# Explicitly allowed despite being in profanity lists
ALLOWED_WORDS = {
    # Words with legitimate non-offensive meanings
    # Examples: ASS (donkey), COCK (rooster), BALLS (spheres)
}
```

## Expected Results

From ~1,400 words in profanity lists:
- Maybe 100-200 are actually in ENABLE
- Of those, only 20-50 are truly offensive
- Another 30-50 are mild profanity
- The rest have legitimate uses

## Examples of Filtering Decisions

### Will Be Blocked (Tier 1)
- Racial slurs that are valid Scrabble words
- Extreme sexual terms in the dictionary
- Offensive religious terms

### Will Be Blocked as Starting Words Only (Tier 2)
- DAMN, HELL (mild profanity)
- CRAP, PISS (bathroom terms)
- DRUNK, BOOZE (alcohol references)

### Will NOT Be Blocked
- ASS (animal)
- COCK (rooster)
- BALLS (sports equipment)
- BREAST (body part, food)
- Medical/anatomical terms

## File Structure

```
/letters/
├── data/
│   ├── profanity_tier1.txt    # Always blocked (~20-50 words)
│   ├── profanity_tier2.txt    # Starting words only (~30-50 words)
│   └── profanity_allowed.txt  # Explicitly allowed despite being in lists
```

## Code Implementation

```python
class ProfanityFilter:
    def __init__(self):
        self.tier1 = self.load_list('data/profanity_tier1.txt')
        self.tier2 = self.load_list('data/profanity_tier2.txt')
        self.allowed = self.load_list('data/profanity_allowed.txt')

    def load_list(self, filename):
        try:
            with open(filename, 'r') as f:
                return set(line.strip().upper() for line in f)
        except FileNotFoundError:
            return set()

    def is_appropriate(self, word, is_starting_word=False):
        word = word.upper()

        # Explicitly allowed words are always OK
        if word in self.allowed:
            return True

        # Tier 1 is never allowed
        if word in self.tier1:
            return False

        # Tier 2 only blocked as starting words
        if is_starting_word and word in self.tier2:
            return False

        return True
```

## Benefits of This Approach

1. **Much smaller filter** - Only words actually in the game
2. **Nuanced handling** - Different rules for starting vs gameplay
3. **Maintains gameplay** - Players can still spell most words
4. **Family-friendly** - Offensive content filtered appropriately
5. **Easy to adjust** - Simple text files to modify

## Process to Create Filter Files

1. Download ENABLE dictionary
2. Download profanity lists
3. Find intersection
4. Manually categorize into tiers
5. Test with sample games
6. Adjust based on feedback

## MVP Approach

For initial launch:
```python
# Just use a minimal hardcoded list
MINIMAL_BLOCK = {
    # 10-20 most offensive words that are in ENABLE
    # Add more based on user reports
}

def is_profane(word):
    return word.upper() in MINIMAL_BLOCK
```

## Future Enhancement

- User reporting system
- Community moderation
- Regular updates based on feedback
- Consider age-appropriate modes