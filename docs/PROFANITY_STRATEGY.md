# Profanity Filter Strategy

## Recommended Approach

### Three-Tier Filtering System

#### Tier 1: Absolutely Blocked (Always Filter)
- Explicit sexual terms
- Racial/ethnic slurs
- Hate speech terms
- Extremely offensive religious terms
- Graphic violence/death references

#### Tier 2: Context Blocked (Filter in Starting Words Only)
- Mild profanity (damn, hell, etc.)
- Anatomical terms that might be uncomfortable
- Drug/alcohol references
- Potentially offensive but common words

#### Tier 3: Allowed (Valid Scrabble Words)
- Medical/anatomical terms in clinical usage
- Words with dual meanings (asp, cock as in rooster)
- Historical/literary terms
- Foreign words in English dictionary

## Implementation Strategy

### Phase 1: Minimal Filter
```python
# Start with a small, curated list of the most offensive terms
BLOCKED_WORDS_ESSENTIAL = [
    # Only the most offensive terms that would never be acceptable
    # Approximately 50-100 words
]

def is_appropriate(word):
    """Check if word is appropriate for gameplay"""
    return word.upper() not in BLOCKED_WORDS_ESSENTIAL
```

### Phase 2: Enhanced Filter
```python
# Load from external file for easier maintenance
def load_profanity_filter():
    """Load tiered profanity lists"""
    with open('data/profanity_tier1.txt', 'r') as f:
        tier1 = set(line.strip().upper() for line in f)

    with open('data/profanity_tier2.txt', 'r') as f:
        tier2 = set(line.strip().upper() for line in f)

    return tier1, tier2

def is_valid_game_word(word, is_starting_word=False):
    """Check if word is appropriate for the game"""
    word = word.upper()

    # Always block tier 1
    if word in TIER1_BLOCKED:
        return False

    # Block tier 2 only for starting words
    if is_starting_word and word in TIER2_BLOCKED:
        return False

    return True
```

## Sources for Curation

### Better Alternatives to CMU List

1. **Google's "Bad Words" List**
   - More moderate and game-appropriate
   - About 400-500 words
   - Well-maintained

2. **Shutterstock's Profanity List**
   - Designed for content moderation
   - Categorized by severity
   - Regularly updated

3. **WordPress Comment Blacklist**
   - Community-maintained
   - Focused on actual problematic content
   - Not overly restrictive

### Manual Curation Process

1. Start with ENABLE dictionary
2. Remove words from curated profanity list
3. Manual review of edge cases:
   - Words like "FART", "POOP" - probably okay for word game
   - Words like "SEXY", "NUDE" - maybe filter from starting words only
   - Medical terms like "ANUS", "PENIS" - valid Scrabble words, allow in gameplay

## Testing Strategy

### Test Cases
```python
# Should ALWAYS be blocked
assert not is_valid_game_word("[explicit slur]")
assert not is_valid_game_word("[hate speech]")

# Should be blocked as starting words but allowed in gameplay
assert is_valid_game_word("DAMN", is_starting_word=False)
assert not is_valid_game_word("DAMN", is_starting_word=True)

# Should ALWAYS be allowed
assert is_valid_game_word("HELLO")
assert is_valid_game_word("WORLD")
assert is_valid_game_word("DUMB")  # Mild, but acceptable
```

## Community Feedback Approach

### Reporting System (Future)
- Allow users to report inappropriate words
- Review and add to filter as needed
- Balance between over-filtering and family-friendly

### False Positive Handling
- Maintain allowlist for incorrectly blocked words
- Example: "SCUNTHORPE" problem (contains substring)
- Use word boundaries in filtering

## Initial Implementation (MVP)

For initial launch, use a minimal approach:

```python
# profanity_filter.py
import re

# Only the most egregious terms (10-20 words)
CRITICAL_BLOCK_LIST = {
    # [Redacted - would contain only the worst slurs/profanity]
}

def is_profane(word):
    """Simple check for MVP"""
    return word.upper() in CRITICAL_BLOCK_LIST

def clean_dictionary(word_list):
    """Remove profane words from dictionary"""
    return [w for w in word_list if not is_profane(w)]
```

## Recommendation

1. **For MVP**: Use minimal filter (10-20 worst words only)
2. **Post-Launch**: Implement tiered system based on user feedback
3. **Long-term**: Build community-moderated list specific to game

## Legal/PR Considerations

- Err on side of allowing rather than over-censoring
- Clearly state "Family-friendly word game" in description
- Have clear process for word challenges/reports
- Don't make filtering the main focus - it should be invisible

## Alternative Approach: SOWPODS/TWL Already Filtered

Consider using official Scrabble dictionaries which already exclude offensive terms:
- TWL (Tournament Word List) - North American
- SOWPODS - International
- Already vetted for competitive play
- Balanced between comprehensive and appropriate

However, these have licensing considerations, so ENABLE + minimal filter is recommended.