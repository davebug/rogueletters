# WikiLetters V3 URL Encoding - How We Fit a Complete Game in 44 Characters

## What Is This?

WikiLetters is a daily word game where you play 5 turns on a 9x9 board with letter tiles. When you finish a game, you can share your exact board layout with friends via a URL.

**The challenge:** A complete game has ~35 tiles placed across 5 turns, each with a position, letter, and turn number. How do you encode all that data into a short, shareable URL?

**Our solution:** 44 characters total. That's the *entire* URL including `https://letters.wiki/?g=`

Example: `https://letters.wiki/?g=IOFtKUQJlleEyrQRnJDehOUpqVNA`

## Why This Is Hard

A naive approach might encode each tile as:
- Position (0-80 on a 9x9 board): 7 bits
- Letter (A-Z): 5 bits
- Turn (1-5): 3 bits
- **Total per tile: 15 bits**

For 7 tiles across 5 turns: 7 tiles × 15 bits × 5 turns = **525 bits minimum**

Add the date, scores, and base64 encoding overhead, and you're looking at **95+ characters** (which was our V1 implementation using LZ-String compression).

## The Breakthrough: Rack-Index Encoding

Here's the key insight: **The tiles are deterministic.**

Given a date seed, we can regenerate the exact same sequence of random tiles every time. So instead of storing which *letter* was played, we store which *rack position* (0-6) it came from.

### Example:

**Turn 1:**
- Server generates rack: `[R, O, E, S, E, D, R]`
- Player places the letter `O` at position (4, 5)
- We encode: `position=41, rackIdx=1, turn=1` (13 bits)
- ✅ Instead of storing the letter 'O' (5 bits), we store index 1 (3 bits)

**Turn 2:**
- Server knows: Turn 1 used rack position 1 ('O')
- Server generates: `[R, E, S, E, D, R, L]` (next tile drawn: 'L')
- Player places 'R' at position (5, 3)
- We encode: `position=48, rackIdx=0, turn=2` (13 bits)

### Why This Works:

1. **Python's RNG is deterministic** - Same seed = same tiles every time
2. **We track play history** - Server knows which tiles were used in previous turns
3. **Rack indices are smaller** - 3 bits instead of 5 bits per tile
4. **No need to store scores** - Server recalculates them from tile positions

## The Encoding Format

### Binary Structure (bit-level packing):

```
[14 bits: date] [5 bits: tile count] [13 bits per tile: position + rackIdx + turn]
```

### Date Encoding (14 bits):
- Days since 2020-01-01 (supports years 2020-2065)
- `20251005` → 2104 days → `0b10000011000` → 14 bits

### Tile Encoding (13 bits each):
- **Position** (7 bits): row × 9 + col (0-80 for 9×9 board)
- **Rack Index** (3 bits): Which position in rack (0-7)
- **Turn** (3 bits): Which turn (1-5)

### Example Encoding:
```
Game on 2025-10-05 with 8 tiles:
Date: 2104 days = 0b10000011000 (14 bits)
Count: 8 tiles = 0b01000 (5 bits)
Tile 1: pos=41, rack=1, turn=1 = 0b0101001 001 001 (13 bits)
Tile 2: pos=48, rack=0, turn=2 = 0b0110000 000 010 (13 bits)
... 6 more tiles ...

Total: 14 + 5 + (8 × 13) = 123 bits = 16 bytes
Base64-encode: 16 bytes → 22 characters
Final URL: https://letters.wiki/?g=IOFtKUQJlleEyrQRnJDehOUpqVNA (44 chars)
```

## Server-Assisted Decoding

When you click a shared URL:

1. **Client extracts date and tiles** from binary data
2. **For each turn**, client asks server:
   - "Given seed 20251005 and this play history, what was the rack for turn 1?"
   - Server: `["R", "O", "E", "S", "E", "D", "R"]`
3. **Client maps rack indices to letters:**
   - Tile at rackIdx=1 → 'O'
   - Tile at rackIdx=0 → 'R'
4. **Server recalculates scores** from final tile positions
5. **Client renders the complete game board**

## Clever Details

### Duplicate Letter Handling
If a rack has `[E, E, R]` and you play two E's, we track which rack positions were used:
```javascript
const usedIndices = new Set();
// First E uses index 0
// Second E uses index 1 (skips 0, already used)
```

### Validation
The decoder validates all data to detect corruption:
- Date must be in range 2020-2065
- Tile count must be ≤ 35
- Positions must be ≤ 80 (9×9 board)
- Turns must be 1-5

### Backward Compatibility
Old 95-character LZ-String URLs still work:
```javascript
// Try V3 format first
try {
    await decodeV3URL(param);
} catch {
    // Fallback to old LZ-String format
    loadSharedGame(param);
}
```

## The Results

| Version | Format | Length | Savings |
|---------|--------|--------|---------|
| V1 | LZ-String JSON | 95 chars | baseline |
| V2 | LZ-String with embedded date | 95 chars | 0% |
| V3 | Binary rack-index encoding | 44 chars | **53%** |

**From 95 characters to 44 characters** - more than half the size!

## Try It Yourself

Play today's game at https://letters.wiki and click "Share Board" when you're done. You'll get a URL like:

```
https://letters.wiki/?g=IOFtKUQJlleEyrQRnJDehOUpqVNA
```

The entire game board - every tile you placed across 5 turns, with scores calculated - all in 44 characters.

## Technical Stack

- **Frontend**: Vanilla JavaScript with custom BitStream class for binary encoding
- **Backend**: Python CGI scripts (`get_rack.py`, `calculate_scores.py`)
- **Encoding**: Custom binary format → Base64 URL-safe
- **Server**: Apache httpd in Docker on Unraid

---

*Built with ☕ and deterministic randomness*
