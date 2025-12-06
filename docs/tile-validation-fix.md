# Tile Validation Fix - Preventing Blank Tiles

## Problem

Users occasionally see blank tiles in their rack, which breaks the game. This happens when:

1. **localStorage corruption** - Browser crashes, code changes, or storage errors cause saved game state to contain `null` or invalid values
2. **State drift** - Page refreshes during gameplay cause mismatch between server and client tile tracking
3. **Client-side trust** - Current backend accepts `rack_tiles` from client without validation

The current architecture makes the client the source of truth for what tiles are in the rack, which is fragile.

## Root Cause

In `cgi-bin/letters.py` (lines 250-255):
```python
rack_tiles_str = form.getvalue('rack_tiles', '')
rack_tiles = json.loads(rack_tiles_str) if rack_tiles_str else []
tiles_drawn = int(form.getvalue('tiles_drawn', 0))
tiles = get_tiles_for_turn(seed, turn, starting_word, rack_tiles, tiles_drawn)
```

The backend blindly trusts whatever the client sends. If `rack_tiles` contains `null` or invalid values, they get passed through and displayed as blank tiles.

## Solution Philosophy

**Server should be authoritative on WHICH tiles exist**
- Server calculates correct tiles based on seed + turn
- Deterministic for fairness (everyone gets same tiles)
- Can't be corrupted by client state

**Client localStorage stores HOW tiles are arranged**
- User's preferred rack order is preserved
- If corrupted, user loses arrangement but not tiles
- Game remains playable even with localStorage issues

## Implementation

### Option 1: Simple Validation (Minimum Fix)

Add validation before trusting client data. If invalid, recalculate from scratch.

**File:** `cgi-bin/letters.py` (around line 250)

**Change:**
```python
# Parse client data
rack_tiles_str = form.getvalue('rack_tiles', '')
rack_tiles = json.loads(rack_tiles_str) if rack_tiles_str else []
tiles_drawn = int(form.getvalue('tiles_drawn', 0))

# VALIDATION: Check if all rack tiles are valid letters
valid_letters = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
if not all(isinstance(t, str) and t in valid_letters for t in rack_tiles):
    # Corrupted data detected - recalculate from scratch
    rack_tiles = []
    tiles_drawn = 7 * (turn - 1)  # Approximate tiles drawn based on turn

# Continue with existing logic
tiles = get_tiles_for_turn(seed, turn, starting_word, rack_tiles, tiles_drawn)
```

**Pros:**
- Minimal code change (5 lines)
- No frontend changes needed
- Preserves rack order in 99% of cases
- Prevents blank tiles completely

**Cons:**
- If corruption happens mid-game, user loses rack arrangement for that turn
- Approximation (`7 * (turn - 1)`) might not match exact tile draw history

### Option 2: Full Server-Side Calculation (Best Long-term)

Stop accepting `rack_tiles` from client entirely. Calculate correct rack from turn history.

**Requires:**
- Accept `turn_history` parameter (list of tiles placed each turn)
- Calculate tiles drawn = sum of tiles placed in previous turns
- Reconstruct current rack from pre-generated tile sequence

**Pros:**
- Completely deterministic
- Zero trust in client state
- Perfect tile accuracy

**Cons:**
- More code changes
- Need to send turn history on each request
- Larger refactor

## Recommendation

**Implement Option 1 immediately** - Simple, effective, low-risk fix that prevents blank tiles.

Consider Option 2 later if:
- Fairness/determinism becomes critical (e.g., competitive play)
- localStorage issues become more frequent
- Major refactor is already planned

## Testing

After implementing Option 1, test these scenarios:

1. **Normal gameplay** - Verify rack order is preserved across turns
2. **Corrupted localStorage** - Manually inject invalid data:
   ```javascript
   let state = JSON.parse(localStorage.getItem('letters_game_state'))
   state.rackTiles = ['A', null, 'E', undefined, 'T']
   localStorage.setItem('letters_game_state', JSON.stringify(state))
   // Refresh page - should NOT show blank tiles
   ```
3. **Mid-game refresh** - Place tiles, refresh browser, verify correct tiles appear

## User Workaround (Current System)

If users encounter blank tiles before this fix is deployed:
```javascript
localStorage.removeItem('letters_game_state')
// Then refresh the page
```

## Implementation Checklist

- [ ] Modify `cgi-bin/letters.py` with validation logic
- [ ] Test with normal gameplay
- [ ] Test with corrupted localStorage
- [ ] Test mid-game browser refresh
- [ ] Deploy to production
- [ ] Monitor for blank tile reports (should drop to zero)

## Future Improvements

- Add logging when corrupted data is detected (track frequency)
- Implement Option 2 for full deterministic tile generation
- Consider adding checksum to localStorage data to detect corruption early
