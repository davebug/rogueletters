# Blank Tiles Investigation

## Overview

This document investigates how blank tiles could be implemented in WikiLetters. Blank tiles are a classic word game mechanic where a tile can represent any letter the player chooses, typically with zero point value.

**Key Discovery:** WikiLetters currently uses **exactly the same letter distribution as Scrabble** (98 tiles). We just need to add the 2 blank tiles to reach 100 total tiles, matching standard Scrabble perfectly. No tiles need to be removed!

## Current System Analysis

### Tile Generation
- Tiles are drawn from a bag of 100 tiles with fixed distribution (TILE_DISTRIBUTION)
- Starting word tiles are removed from the bag
- Remaining tiles are shuffled deterministically based on the daily seed
- Players draw up to 7 tiles per turn

### Tile Storage & Display
Each tile currently stores:
- **Letter**: A-Z (single character)
- **Score**: Point value from TILE_SCORES (1-10 points)
- **Position**: Row/col when placed on board
- **Turn**: Which turn it was played (1-5)

### V3 URL Encoding
Current encoding (13 bits per tile):
- **Position** (7 bits): row × 9 + col (0-80)
- **Rack Index** (3 bits): Which rack position (0-7)
- **Turn** (3 bits): Which turn (1-5)

The letter is **not stored** in the URL - it's derived from the rack index by:
1. Server regenerates the rack for that turn based on seed + play history
2. Client looks up rack[rackIdx] to get the letter

## Proposed Blank Tile Mechanics

### Gameplay Rules

1. **Tile Distribution**
   - Add 2 blank tiles to the bag (standard Scrabble has 2 blanks)
   - **Current**: 98 tiles (matches Scrabble letter distribution exactly)
   - **With blanks**: 100 tiles (98 letters + 2 blanks = standard Scrabble)
   - No need to remove any existing tiles!
   - Updated distribution: All current letters stay the same, just add BLANK: 2

2. **Playing a Blank**
   - Blank tiles remain unassigned in the rack (appear as empty tiles)
   - Player selects and drags/places blank like any other tile
   - **When placing on the board**, player must choose what letter it represents
   - Once placed, the blank displays the chosen letter but with visual distinction
   - The blank retains its chosen letter for word validation but scores 0 points

3. **Word Validation**
   - Blanks can represent any letter A-Z
   - Words formed with blanks are validated as if the blank is that letter
   - Example: Playing "QU?CK" (? = blank as 'I') validates as "QUICK"

4. **Scoring**
   - Blank tiles always contribute 0 points to the word score
   - Multipliers (DL, TL, DW, TW) still apply to position, but blank value is 0
   - Example: Blank on TL square = 0 × 3 = 0 points

## UI Requirements

### 1. Blank Tile Display in Rack

**Visual Design:**
```
┌────┐
│    │  ← Empty/blank (no letter shown)
│    │  ← No point value shown
└────┘
```

**CSS Changes:**
- New class `.tile.blank` with distinct background color (lighter/cream color)
- Completely empty - no text, no symbol
- Muted/lighter color scheme to distinguish from regular tiles
- Border style might differ (e.g., dashed or lighter color)

### 2. Letter Selection Dialog

When a blank tile is placed on the board, show a modal for letter selection:

**UI Mock:**
```
┌──────────────────────────────────┐
│  Choose Letter for Blank Tile    │
├──────────────────────────────────┤
│  [A] [B] [C] [D] [E] [F] [G]    │
│  [H] [I] [J] [K] [L] [M] [N]    │
│  [O] [P] [Q] [R] [S] [T] [U]    │
│  [V] [W] [X] [Y] [Z]             │
│                                   │
│  [Cancel]                        │
└──────────────────────────────────┘
```

**Interaction Flow:**
1. Player selects blank tile from rack (appears as empty tile)
2. Player drags/taps to place blank on board
3. **Letter selection modal appears** when blank is dropped on valid cell
4. Player clicks desired letter (A-Z) or presses Cancel
5. If letter chosen: Tile updates to show chosen letter with blank styling
6. If cancelled: Blank returns to rack as empty tile
7. Once placed and assigned, blank cannot be changed (must recall to rack first)

### 3. Blank Tile Display on Board

**Visual Design:**
```
┌────┐
│ Q  │  ← Shows assigned letter
│ ˙  │  ← Small dot/indicator that it's a blank
└────┘
```

**Styling:**
- Different background color (lighter/muted)
- Small indicator (dot, underline, or badge) showing it's a blank
- Letter shown normally but tile background distinguishes it
- Point value shows "0" or is omitted

### 4. Shared Game View

When viewing a shared game board:
- Blanks should be visually distinct
- Hover/tooltip could show "Blank tile used as [letter]"
- Maintain visual consistency with live gameplay

## Code Changes Required

### 1. Backend Changes

#### `cgi-bin/letters.py`

**Update TILE_DISTRIBUTION:**
```python
TILE_DISTRIBUTION = {
    'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2,
    'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2,
    'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1,
    'Y': 2, 'Z': 1,
    'BLANK': 2  # New - just add this line!
}
# Total: 98 letters + 2 blanks = 100 tiles (standard Scrabble)
```

**Update TILE_SCORES:**
```python
TILE_SCORES = {
    # ... existing scores ...
    'BLANK': 0  # New
}
```

**New functions needed:**
```python
def is_blank_tile(letter):
    """Check if a tile is a blank"""
    return letter == 'BLANK'

def validate_blank_assignment(letter):
    """Validate that assigned letter is A-Z"""
    return letter.isalpha() and len(letter) == 1
```

#### `cgi-bin/validate_word.py`

**Update calculate_score():**
```python
def calculate_score(board, placed_tiles, words_formed):
    # ... existing code ...

    for tile in placed_tiles:
        letter = tile['letter']
        is_blank = tile.get('isBlank', False)

        # Blanks always score 0
        if is_blank:
            tile_value = 0
        else:
            tile_value = TILE_SCORES.get(letter, 0)

        # Apply multipliers
        # ... rest of scoring logic
```

**Update word validation:**
- Words should validate using the assigned letter, not "BLANK"
- Extract actual letters from tiles, replacing blanks with their assigned letters

#### `cgi-bin/get_rack.py`

**Update response to indicate blanks:**
```python
def main():
    # ... existing code ...

    # Build rack with blank indicators
    rack_data = []
    for tile in rack:
        rack_data.append({
            'letter': tile,
            'isBlank': tile == 'BLANK'
        })

    print(json.dumps({
        'rack': [t['letter'] for t in rack_data],
        'blanks': [i for i, t in enumerate(rack_data) if t['isBlank']]
    }))
```

### 2. Frontend Changes

#### Data Structure Updates

**GameState additions:**
```javascript
gameState = {
    // ... existing fields ...
    // Note: Blanks in rack have NO assignment until placed on board
    // Assignment only happens during placement action
}
```

**Tile data structure:**
```javascript
{
    row: 4,
    col: 5,
    letter: 'Q',        // The assigned letter (for blanks)
    isBlank: true,      // New: indicates this is a blank tile
    turn: 1,
    rackIdx: 2
}
```

#### New Functions Needed

```javascript
// Create blank tile element
function createBlankTileElement(index) {
    const tile = document.createElement('div');
    tile.className = 'tile blank';
    tile.dataset.isBlank = 'true';
    tile.dataset.index = index;
    tile.dataset.letter = 'BLANK';
    tile.dataset.assignedLetter = '';  // Empty until assigned

    // No letter span - tile is completely empty
    // No score span - tile is completely empty

    return tile;
}

// Show letter selection modal (returns Promise)
function showBlankLetterSelector() {
    return new Promise((resolve) => {
        // Create/show modal with A-Z buttons
        const modal = document.getElementById('blank-letter-modal');
        modal.style.display = 'block';

        // On letter click: resolve(letter)
        // On cancel: resolve(null)
        // Modal closes after selection
    });
}

// Check if tile is blank
function isBlankTile(tile) {
    return tile.dataset.isBlank === 'true';
}

// Get effective letter (assigned letter for blanks, actual letter for others)
function getEffectiveLetter(tile) {
    if (isBlankTile(tile)) {
        return tile.dataset.assignedLetter || '';  // Empty string if unassigned
    }
    return tile.dataset.letter;
}
```

#### Event Handler Updates

**handleBoardClick() / handleTileDrop():**
```javascript
async function placeTileOnBoard(cell, tile) {
    // If this is a blank tile, show letter selector FIRST
    if (isBlankTile(tile)) {
        const assignedLetter = await showBlankLetterSelector();
        if (!assignedLetter) {
            // User cancelled - don't place tile
            return false;
        }
        tile.dataset.assignedLetter = assignedLetter;
    }

    // Now place the tile normally
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    // ... rest of placement logic ...
}
```

**validateWord():**
```javascript
async function validateWord(tiles) {
    // Build word using effective letters (assigned letter for blanks)
    const letters = tiles.map(t => getEffectiveLetter(t)).join('');

    // Include blank info in validation request
    const tilesData = tiles.map(t => ({
        row: parseInt(t.parentElement.dataset.row),
        col: parseInt(t.parentElement.dataset.col),
        letter: getEffectiveLetter(t),
        isBlank: isBlankTile(t)
    }));

    // ... rest of validation ...
}
```

### 3. V3 URL Encoding Changes

**Critical Challenge:** The current V3 encoding assumes the letter can be derived from the rack index. With blanks, we need to also encode **what letter the blank was assigned**.

#### Option 1: Add Blank Flag + Letter (14 bits per tile)

**New encoding format:**
```
Per tile: 14 bits total
- Position (7 bits): 0-80
- Rack Index (3 bits): 0-7
- Turn (3 bits): 1-5
- Is Blank (1 bit): 0 or 1
- If blank, assigned letter (5 bits): 0-25 (A-Z)
```

Wait, this doesn't work - we need conditional encoding.

#### Option 2: Variable-Length Encoding (RECOMMENDED)

**Approach:**
- First, encode a blank tile bitmap (1 bit per tile)
- Then, for blank tiles only, encode their assigned letters

**Binary format:**
```
[14 bits: date]
[5 bits: tile count]
[N bits: blank bitmap] (1 bit per tile, indicating if each is blank)
[For each tile:]
  [7 bits: position]
  [3 bits: rack index]
  [3 bits: turn]
  [IF blank: 5 bits: assigned letter (0-25 = A-Z)]
```

**Example with 8 tiles (2 blanks):**
```
Date: 14 bits
Count: 5 bits (value: 8)
Blanks: 8 bits (e.g., 00100010 = tiles 2 and 6 are blanks)

Tile 0: 13 bits (not blank)
Tile 1: 13 bits (not blank)
Tile 2: 13 + 5 = 18 bits (blank, assigned letter)
Tile 3: 13 bits (not blank)
Tile 4: 13 bits (not blank)
Tile 5: 13 bits (not blank)
Tile 6: 13 + 5 = 18 bits (blank, assigned letter)
Tile 7: 13 bits (not blank)

Total: 14 + 5 + 8 + (6×13) + (2×18) = 27 + 78 + 36 = 141 bits
Base64: ~24 characters (vs ~22 without blanks)
```

**URL Impact:**
- Without blanks: 8 tiles = ~44 chars
- With 2 blanks: 8 tiles = ~46 chars (+2 chars)
- Minimal impact for typical games

#### Code Changes for Encoding

**Encoder updates:**
```javascript
async function encodeV3URL() {
    // ... existing tile collection ...

    // Identify blanks
    const blankBitmap = tilesWithRackIdx.map(t => t.isBlank ? 1 : 0);

    const bitStream = new BitStream();
    bitStream.writeBits(daysSinceEpoch, 14);
    bitStream.writeBits(tilesWithRackIdx.length, 5);

    // Write blank bitmap
    blankBitmap.forEach(bit => bitStream.writeBits(bit, 1));

    // Write tile data
    tilesWithRackIdx.forEach(tile => {
        bitStream.writeBits(position, 7);
        bitStream.writeBits(tile.rackIdx, 3);
        bitStream.writeBits(tile.turn, 3);

        // If blank, write assigned letter
        if (tile.isBlank) {
            const letterCode = tile.letter.charCodeAt(0) - 65; // A=0, Z=25
            bitStream.writeBits(letterCode, 5);
        }
    });

    // ... rest of encoding ...
}
```

**Decoder updates:**
```javascript
async function decodeV3URL(encodedData) {
    // ... read date and count ...

    // Read blank bitmap
    const blankBitmap = [];
    for (let i = 0; i < tileCount; i++) {
        blankBitmap.push(bitStream.readBits(1));
    }

    // Read tiles
    const tiles = [];
    for (let i = 0; i < tileCount; i++) {
        const position = bitStream.readBits(7);
        const rackIdx = bitStream.readBits(3);
        const turn = bitStream.readBits(3);

        const isBlank = blankBitmap[i] === 1;
        let assignedLetter = null;

        if (isBlank) {
            const letterCode = bitStream.readBits(5);
            assignedLetter = String.fromCharCode(65 + letterCode); // 0=A, 25=Z
        }

        tiles.push({
            row: Math.floor(position / 9),
            col: position % 9,
            rackIdx,
            turn,
            isBlank,
            assignedLetter  // Will be used instead of rack letter if blank
        });
    }

    // ... rest of decoding ...
}
```

#### Server Endpoint Updates

**get_rack.py response:**
```python
# Need to tell client which tiles are blanks
{
    'rack': ['A', 'BLANK', 'E', 'R', 'S', 'T', 'BLANK'],
    'isBlank': [False, True, False, False, False, False, True]
}
```

**calculate_scores.py request:**
```python
# Tiles now include isBlank and assignedLetter
{
    'tiles': [
        {
            'row': 4,
            'col': 5,
            'letter': 'Q',        # Assigned letter
            'isBlank': True,      # This is a blank
            'turn': 1
        },
        # ... more tiles ...
    ],
    'seed': '20251005'
}
```

## CSS Changes Needed

```css
/* Blank tile in rack - unassigned */
.tile.blank {
    background: #e8e0d0;  /* Lighter/neutral color */
    border: 2px dashed #8b6f47;
}

.tile.blank .tile-letter {
    display: none;  /* No letter shown - completely empty */
}

.tile.blank .tile-score {
    display: none;  /* No score shown */
}

/* Blank tile - assigned letter */
.tile.blank.assigned {
    background: #d4c8b0;
    border: 2px solid #8b6f47;
}

.tile.blank.assigned .tile-letter::after {
    content: '˙';  /* Small dot indicator */
    position: absolute;
    bottom: 2px;
    right: 2px;
    font-size: 10px;
    color: #666;
}

/* Blank tile on board */
.tile.blank.placed {
    background: #c9bea5;
}

/* Letter selection modal */
.blank-letter-selector {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 10000;
}

.blank-letter-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 5px;
    margin: 10px 0;
}

.letter-choice {
    width: 40px;
    height: 40px;
    border: 2px solid #8b6f47;
    background: #f5e6d3;
    border-radius: 4px;
    cursor: pointer;
    font-size: 18px;
    font-weight: bold;
}

.letter-choice:hover {
    background: #e8dcc0;
    border-color: #ff9800;
}
```

## HTML Changes Needed

Add letter selection modal to index.html:

```html
<!-- Blank Tile Letter Selection Modal -->
<div id="blank-letter-modal" class="modal" style="display: none;">
    <div class="blank-letter-selector">
        <h3>Choose Letter for Blank Tile</h3>
        <div class="blank-letter-grid" id="letter-grid">
            <!-- A-Z buttons generated by JS -->
        </div>
        <button id="cancel-blank" class="btn btn-secondary">Cancel</button>
    </div>
</div>
```

## Implementation Phases

### Phase 1: Backend Foundation (No URL changes)
- Update TILE_DISTRIBUTION with 2 blanks
- Update TILE_SCORES with BLANK: 0
- Add isBlank field to tile data structures
- Update get_rack.py to indicate blank tiles
- Update validate_word.py to handle blank scoring
- Test with simple console logging

### Phase 2: Basic UI (No sharing yet)
- Add CSS for blank tiles
- Create letter selection modal
- Update createTileElement for blanks
- Implement blank assignment workflow
- Test gameplay without sharing

### Phase 3: URL Encoding
- Implement variable-length encoding with blank bitmap
- Update encodeV3URL with blank support
- Update decodeV3URL with blank support
- Update calculate_scores.py to handle blank data
- Test shared URLs with blank tiles

### Phase 4: Polish & Edge Cases
- Handle blank reassignment (changing mind before placing)
- Handle recalling blank tiles from board
- Add tooltips/help text explaining blanks
- Add keyboard shortcuts (1-26 for A-Z when blank selected)
- Analytics tracking for blank usage

## Edge Cases to Consider

1. **Recalling a placed blank**
   - Blank returns to rack and loses its assignment (becomes empty again)
   - Player must reassign when placing again
   - This is standard Scrabble behavior

2. **Cancelling blank placement**
   - Player places blank on board → letter selector appears
   - Player clicks "Cancel" → blank returns to rack as empty tile
   - This allows players to change their mind mid-placement

3. **Shuffling rack with unassigned blank**
   - Blank remains empty (no letter shown)
   - Position in rack changes but no assignment needed

4. **Starting word contains letter that would need blank**
   - Example: Starting word is "QUIZ" but bag has no Q left
   - Current system: This won't happen, starting words are pre-validated
   - With blanks: No change needed, validation already handles this

5. **Both blanks used as same letter**
   - Example: Two blanks both assigned as 'E'
   - Completely legal, no restrictions needed

6. **Blank in shared URL but rack regeneration fails**
   - If server can't regenerate rack (data corruption)
   - Fallback: Show error, can't display shared game

7. **Version compatibility**
   - Old URLs (without blank bitmap) still work fine
   - New URLs with blanks fail gracefully on old clients
   - Add version checking/migration if needed

## Testing Strategy

### Unit Tests
- [ ] Blank tile generation in tile bag
- [ ] Blank scoring (always 0 points)
- [ ] Blank assignment validation (A-Z only)
- [ ] Word validation with blanks
- [ ] V3 encoding with 0, 1, 2 blanks
- [ ] V3 decoding with blanks

### Integration Tests
- [ ] Draw blank from bag
- [ ] Assign letter to blank
- [ ] Place blank on board
- [ ] Score word containing blank
- [ ] Share game with blank tiles
- [ ] Load shared game with blanks
- [ ] Blank on multiplier square (TL, DW, etc.)

### Edge Case Tests
- [ ] Reassign blank before placing
- [ ] Recall blank from board
- [ ] Two blanks in same word
- [ ] Blank as high-value letter (Q, Z, X)
- [ ] Complete game using only blanks
- [ ] Max URL length with all blanks

## Performance Impact

### URL Size Analysis

**Current (no blanks):**
- 7 tiles: ~44 chars
- 15 tiles: ~58 chars
- 25 tiles: ~85 chars
- 35 tiles: ~100 chars

**With blanks (worst case: all blanks):**
- 7 tiles (all blank): ~48 chars (+4)
- 15 tiles (all blank): ~64 chars (+6)
- 25 tiles (all blank): ~93 chars (+8)
- 35 tiles (all blank): ~110 chars (+10)

**Realistic (2 blanks in entire game):**
- Impact: +1-2 characters total
- Negligible for most games

### Server Load
- get_rack.py: No change (already returns rack)
- calculate_scores.py: Minimal change (check isBlank flag)
- validate_word.py: No change (treats assigned letter as normal)

## User Experience Considerations

### Learning Curve
- Blank tiles are a **familiar mechanic** from Scrabble/Words With Friends
- Most players will understand immediately
- Add tooltip: "Blank tiles can be any letter but score 0 points"

### Strategic Depth
- Blanks add significant strategy:
  - Save for high-value letters (Q, X, Z)?
  - Use early for board position?
  - Combine with multipliers?
- Increases replayability and skill ceiling

### Accessibility
- Letter selection modal should be keyboard accessible
- Tab through A-Z, Enter to select
- ESC to cancel
- Screen reader support: "Blank tile, choose letter A through Z"

## Recommendation

**Should we implement blank tiles?**

**Pros:**
- Familiar mechanic, proven fun
- Adds strategic depth
- Minimal URL impact (+1-2 chars)
- Clean implementation with variable-length encoding
- Differentiates from basic word games

**Cons:**
- Moderate complexity (3-phase implementation)
- Requires UI modal (more screen space)
- Slightly longer URLs
- More edge cases to test

**Verdict: YES, implement in phases**

Start with Phase 1 (backend) and Phase 2 (UI) without sharing support. Gather player feedback. If positive, add Phase 3 (URL encoding) to complete the feature.

## Open Questions

1. Should blanks be visually distinct on the board? (Yes - small dot/underline)
2. Should shared games show blank indicators? (Yes - maintain visual consistency)
3. How to handle keyboard shortcuts? (Number keys 1-26 or arrow keys + Enter?)
4. Should analytics track blank usage patterns? (Yes - helps balance future changes)
5. Should tutorial explain blanks? (Yes - one-time tooltip on first blank draw)

## Next Steps

1. Review this document with team
2. Create GitHub issues for each phase
3. Update CLAUDE.md with blank tiles as next feature
4. Design mockups for letter selection modal
5. Begin Phase 1 implementation

---

**Document Status:** Investigation complete, ready for review
**Last Updated:** 2025-10-05
**Author:** Analysis based on current WikiLetters V3 implementation
