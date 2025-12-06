# 45-Character URL Implementation Plan

## Goal
Reduce shareable URLs from 95 characters to 45 characters (53% reduction) using:
- Rack indices instead of letters
- Server-assisted decoding
- Optimized binary encoding
- Server-calculated scores

**Target URL**: `https://letters.wiki/?g3=<19-char-data>`

---

## Technical Specification

### Binary Format (105 bits total)

```
Bits 0-13:   Date (14 bits) - days since 2020-01-01
Bits 14-18:  Tile count (5 bits) - supports 0-31 tiles

For each tile (13 bits):
  Bits 0-6:  Position (7 bits) - grid position 0-80
  Bits 7-9:  Rack index (3 bits) - position in rack 0-6
  Bits 10-12: Turn (3 bits) - turn number 1-5

Total: 14 + 5 + (7 × 13) = 110 bits (round up to 14 bytes)
Base64: 14 bytes → ~19 characters
```

### Example Encoding

**Game data:**
- Date: 2025-10-05 (2083 days since 2020-01-01)
- 3 tiles: (4,5) rack[2] turn 1, (4,6) rack[4] turn 1, (4,7) rack[0] turn 1

**Binary:**
```
Date:     2083 = 0b00100000100011 (14 bits)
Count:    3    = 0b00011 (5 bits)
Tile 1:   pos=41, rack=2, turn=1
          41 = 0b0101001 (7 bits)
          2  = 0b010 (3 bits)
          1  = 0b001 (3 bits)
          Combined: 0b0101001010001
... (tiles 2 and 3)

Total: 110 bits → 14 bytes
Base64: "IEMKSSRAB..." (19 chars)
Final URL: https://letters.wiki/?g3=IEMKSSRAB...
```

---

## Phase 1: Server Infrastructure (4 hours)

### 1.1 Get Rack Endpoint

**File**: `/cgi-bin/get_rack.py`

```python
#!/usr/bin/env python3
import cgi
import json
from letters import get_starting_word, get_all_tiles_for_day

def get_rack_for_turn(seed, turn, tiles_played_before):
    """
    Get rack contents for a specific turn

    Args:
        seed: Game seed (YYYYMMDD)
        turn: Turn number (1-5)
        tiles_played_before: List of letters played in previous turns

    Returns:
        List of 7 letters in the rack
    """
    starting_word = get_starting_word(seed)
    all_tiles = get_all_tiles_for_day(seed, starting_word)

    if turn == 1:
        # First turn: first 7 tiles
        return all_tiles[:7]

    # Calculate which tiles have been drawn
    tiles_drawn = 7  # Turn 1 initial draw

    # Add tiles from previous turns (tiles_played = tiles_drawn)
    # This assumes all tiles played are from the rack (no swaps)
    tiles_drawn += len(tiles_played_before)

    # Current rack = remaining tiles from turn 1 + new draws
    # tiles_played_before tells us what's NOT in rack anymore
    rack = []
    tile_index = 7  # Start after turn 1's initial 7

    # Get next tiles from the bag
    while len(rack) < 7 and tile_index < len(all_tiles):
        rack.append(all_tiles[tile_index])
        tile_index += 1

    return rack

def main():
    form = cgi.FieldStorage()
    seed = form.getvalue('seed', '')
    turn = int(form.getvalue('turn', 1))

    # Parse previously played tiles (for rack calculation)
    tiles_played_str = form.getvalue('played', '[]')
    tiles_played = json.loads(tiles_played_str)

    rack = get_rack_for_turn(seed, turn, tiles_played)

    response = {
        'seed': seed,
        'turn': turn,
        'rack': rack
    }

    print("Content-Type: application/json")
    print("Access-Control-Allow-Origin: *")
    print()
    print(json.dumps(response))

if __name__ == "__main__":
    main()
```

**Test:**
```bash
curl "http://localhost:8085/cgi-bin/get_rack.py?seed=20251005&turn=1"
# Expected: {"seed":"20251005","turn":1,"rack":["R","S","T","A","E","D","L"]}
```

### 1.2 Calculate Scores Endpoint

**File**: `/cgi-bin/calculate_scores.py`

```python
#!/usr/bin/env python3
import cgi
import json
from validate_word import calculate_word_score, find_words_formed

def calculate_turn_scores(seed, tiles_by_turn, board_state):
    """
    Calculate scores for all turns

    Args:
        seed: Game seed
        tiles_by_turn: {1: [{row, col, letter}], 2: [...], ...}
        board_state: Current board state after each turn

    Returns:
        List of scores [turn1_score, turn2_score, ...]
    """
    scores = []

    for turn in range(1, 6):
        if turn not in tiles_by_turn:
            scores.append(0)
            continue

        turn_tiles = tiles_by_turn[turn]

        # Find all words formed by this turn's tiles
        words = find_words_formed(turn_tiles, board_state[turn])

        # Calculate total score for this turn
        turn_score = sum(calculate_word_score(word) for word in words)
        scores.append(turn_score)

    return scores

def main():
    form = cgi.FieldStorage()

    # Parse input
    data_str = form.getvalue('data', '{}')
    data = json.loads(data_str)

    seed = data.get('seed', '')
    tiles = data.get('tiles', [])  # [{row, col, letter, turn}, ...]

    # Group tiles by turn
    tiles_by_turn = {}
    for tile in tiles:
        turn = tile['turn']
        if turn not in tiles_by_turn:
            tiles_by_turn[turn] = []
        tiles_by_turn[turn].append(tile)

    # Build board state for each turn (simplified)
    # In production, would need full validation logic
    board_states = {}
    current_board = [[None] * 9 for _ in range(9)]

    for turn in sorted(tiles_by_turn.keys()):
        for tile in tiles_by_turn[turn]:
            current_board[tile['row']][tile['col']] = tile['letter']
        board_states[turn] = [row[:] for row in current_board]  # Copy

    scores = calculate_turn_scores(seed, tiles_by_turn, board_states)

    response = {
        'scores': scores,
        'total': sum(scores)
    }

    print("Content-Type: application/json")
    print("Access-Control-Allow-Origin: *")
    print()
    print(json.dumps(response))

if __name__ == "__main__":
    main()
```

**Test:**
```bash
curl -X POST http://localhost:8085/cgi-bin/calculate_scores.py \
  -d 'data={"seed":"20251005","tiles":[{"row":4,"col":5,"letter":"R","turn":1}]}'
# Expected: {"scores":[1,0,0,0,0],"total":1}
```

---

## Phase 2: Client-Side Encoding (3 hours)

### 2.1 Bit Manipulation Utilities

**File**: `script.js` (add utilities)

```javascript
// Bit manipulation utilities
class BitStream {
    constructor(sizeInBits) {
        this.bytes = new Uint8Array(Math.ceil(sizeInBits / 8));
        this.bitPos = 0;
    }

    writeBits(value, numBits) {
        for (let i = numBits - 1; i >= 0; i--) {
            const bit = (value >> i) & 1;
            const byteIndex = Math.floor(this.bitPos / 8);
            const bitIndex = 7 - (this.bitPos % 8);

            if (bit) {
                this.bytes[byteIndex] |= (1 << bitIndex);
            }

            this.bitPos++;
        }
    }

    readBits(numBits) {
        let value = 0;

        for (let i = 0; i < numBits; i++) {
            const byteIndex = Math.floor(this.bitPos / 8);
            const bitIndex = 7 - (this.bitPos % 8);
            const bit = (this.bytes[byteIndex] >> bitIndex) & 1;

            value = (value << 1) | bit;
            this.bitPos++;
        }

        return value;
    }

    toBase64() {
        return btoa(String.fromCharCode(...this.bytes));
    }

    static fromBase64(base64) {
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const stream = new BitStream(bytes.length * 8);
        stream.bytes = bytes;
        return stream;
    }
}

// Date conversion
function dateToEpochDays(yyyymmdd) {
    const year = parseInt(yyyymmdd.substring(0, 4));
    const month = parseInt(yyyymmdd.substring(4, 6));
    const day = parseInt(yyyymmdd.substring(6, 8));

    const date = new Date(year, month - 1, day);
    const epoch = new Date(2020, 0, 1);  // Jan 1, 2020

    const diffMs = date - epoch;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
}

function epochDaysToDate(days) {
    const epoch = new Date(2020, 0, 1);
    const date = new Date(epoch.getTime() + days * 24 * 60 * 60 * 1000);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
}

// Position conversion
function positionToRowCol(pos) {
    return {
        row: Math.floor(pos / 9),
        col: pos % 9
    };
}

function rowColToPosition(row, col) {
    return row * 9 + col;
}
```

### 2.2 Encoder Function

```javascript
function encodeGameV3(gameState) {
    // Calculate total bits needed
    const tileCount = gameState.turnHistory.reduce((sum, turn) =>
        sum + (turn.tiles ? turn.tiles.length : 0), 0
    );

    const totalBits = 14 + 5 + (tileCount * 13);
    const stream = new BitStream(totalBits);

    // Write date (14 bits)
    const epochDays = dateToEpochDays(gameState.seed);
    stream.writeBits(epochDays, 14);

    // Write tile count (5 bits)
    stream.writeBits(tileCount, 5);

    // Write tiles
    gameState.turnHistory.forEach((turn, turnIndex) => {
        if (!turn.tiles) return;

        turn.tiles.forEach(tile => {
            const pos = rowColToPosition(tile.row, tile.col);
            const rackIdx = turn.rack ? turn.rack.indexOf(tile.letter) : 0;

            stream.writeBits(pos, 7);        // Position
            stream.writeBits(rackIdx, 3);    // Rack index
            stream.writeBits(turnIndex + 1, 3);  // Turn
        });
    });

    return stream.toBase64();
}

function generateShareableURLV3() {
    try {
        const encoded = encodeGameV3(gameState);
        const url = `https://letters.wiki/?g3=${encoded}`;

        console.log('[Share V3] Generated URL:', url);
        console.log('[Share V3] URL length:', url.length);

        return url;
    } catch (err) {
        console.error('Failed to generate V3 URL:', err);
        return null;
    }
}
```

---

## Phase 3: Client-Side Decoding (3 hours)

### 3.1 Decoder Function

```javascript
async function decodeGameV3(encoded) {
    const stream = BitStream.fromBase64(encoded);

    // Read date (14 bits)
    const epochDays = stream.readBits(14);
    const seed = epochDaysToDate(epochDays);

    // Read tile count (5 bits)
    const tileCount = stream.readBits(5);

    // Read tiles (need to fetch racks to decode)
    const tiles = [];
    for (let i = 0; i < tileCount; i++) {
        const pos = stream.readBits(7);
        const rackIdx = stream.readBits(3);
        const turn = stream.readBits(3);

        const {row, col} = positionToRowCol(pos);

        tiles.push({row, col, rackIdx, turn});
    }

    // Group tiles by turn
    const tilesByTurn = {};
    tiles.forEach(tile => {
        if (!tilesByTurn[tile.turn]) {
            tilesByTurn[tile.turn] = [];
        }
        tilesByTurn[tile.turn].push(tile);
    });

    // Fetch racks for all turns (parallel)
    const rackPromises = Object.keys(tilesByTurn).map(async turn => {
        // Build list of previously played tiles for this turn
        const prevTiles = [];
        for (let t = 1; t < turn; t++) {
            if (tilesByTurn[t]) {
                // We'll need letters from previous turns
                // This is a bit circular - we need racks to get letters
                // Solution: fetch racks sequentially
            }
        }

        const response = await fetch(
            `/cgi-bin/get_rack.py?seed=${seed}&turn=${turn}`
        );
        const data = await response.json();
        return {turn, rack: data.rack};
    });

    const racks = await Promise.all(rackPromises);

    // Map rack indices to letters
    const decodedTiles = [];
    tiles.forEach(tile => {
        const rackData = racks.find(r => r.turn == tile.turn);
        const letter = rackData.rack[tile.rackIdx];

        decodedTiles.push({
            row: tile.row,
            col: tile.col,
            letter: letter,
            turn: tile.turn
        });
    });

    // Fetch scores
    const scoreResponse = await fetch('/cgi-bin/calculate_scores.py', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            seed: seed,
            tiles: decodedTiles
        })
    });
    const scoreData = await scoreResponse.json();

    return {
        seed: seed,
        tiles: decodedTiles,
        scores: scoreData.scores,
        totalScore: scoreData.total
    };
}

async function loadSharedGameV3(encoded) {
    try {
        showLoading(true);

        const gameData = await decodeGameV3(encoded);

        // Set game state
        gameState.seed = gameData.seed;
        gameState.dateStr = formatSeedToDate(gameData.seed);
        gameState.turnScores = gameData.scores;
        gameState.score = gameData.totalScore;
        gameState.isGameOver = true;

        // Render board
        createBoard();
        renderSharedBoardV3(gameData.tiles);

        showLoading(false);

        console.log('[Load V3] Game loaded successfully');

    } catch (err) {
        console.error('[Load V3] Failed:', err);
        showError('Failed to load shared game');
        showLoading(false);
    }
}
```

### 3.2 URL Detection

```javascript
function initializeGame() {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for V3 compressed format
    const g3Param = urlParams.get('g3');
    if (g3Param) {
        loadSharedGameV3(g3Param);
        return;
    }

    // Check for V2 compressed format (existing)
    const g2Param = urlParams.get('g2');
    if (g2Param) {
        loadSharedGameV2(g2Param);
        return;
    }

    // Check for V1 compressed format (existing)
    const gParam = urlParams.get('g');
    if (gParam) {
        loadSharedGame(gParam);
        return;
    }

    // Normal game initialization
    // ...
}
```

---

## Phase 4: Testing (2 hours)

### 4.1 Unit Tests

**File**: `test-45-char-encoding.spec.js`

```javascript
const { test, expect } = require('@playwright/test');

test.describe('45-char URL Encoding', () => {

    test('should encode and decode game correctly', async ({ page }) => {
        // Complete a test game
        await page.goto('http://localhost:8085/?test_popup=100');
        await page.waitForSelector('#game-popup:not(.hidden)');

        // Generate V3 URL
        const v3URL = await page.evaluate(() => {
            return window.generateShareableURLV3();
        });

        console.log('V3 URL:', v3URL);
        expect(v3URL.length).toBeLessThan(50);
        expect(v3URL).toContain('?g3=');

        // Load the V3 URL
        await page.goto(v3URL.replace('https://letters.wiki', 'http://localhost:8085'));
        await page.waitForTimeout(2000);

        // Verify board matches
        const loadedScore = await page.evaluate(() => window.gameState?.score);
        expect(loadedScore).toBeGreaterThan(0);
    });

    test('bit operations should be reversible', async ({ page }) => {
        await page.goto('http://localhost:8085/');

        const testResult = await page.evaluate(() => {
            // Test date encoding
            const seed = '20251005';
            const days = dateToEpochDays(seed);
            const decoded = epochDaysToDate(days);

            // Test position encoding
            const pos = rowColToPosition(4, 5);
            const {row, col} = positionToRowCol(pos);

            return {
                seedMatch: seed === decoded,
                positionMatch: row === 4 && col === 5,
                days: days
            };
        });

        expect(testResult.seedMatch).toBe(true);
        expect(testResult.positionMatch).toBe(true);
    });

    test('should handle edge cases', async ({ page }) => {
        await page.goto('http://localhost:8085/');

        const edgeCases = await page.evaluate(() => {
            const tests = [];

            // Corner positions
            tests.push(positionToRowCol(0));   // {0,0}
            tests.push(positionToRowCol(80));  // {8,8}

            // Date edges
            const epoch = dateToEpochDays('20200101');
            const future = dateToEpochDays('20301231');

            return {
                corner1: tests[0],
                corner2: tests[1],
                epochDays: epoch,
                futureDays: future
            };
        });

        expect(edgeCases.corner1.row).toBe(0);
        expect(edgeCases.corner1.col).toBe(0);
        expect(edgeCases.corner2.row).toBe(8);
        expect(edgeCases.corner2.col).toBe(8);
    });
});
```

### 4.2 Integration Tests

```javascript
test.describe('45-char URL Integration', () => {

    test('should fetch racks correctly', async ({ page }) => {
        const rack = await page.evaluate(async () => {
            const response = await fetch(
                'http://localhost:8085/cgi-bin/get_rack.py?seed=20251005&turn=1'
            );
            return await response.json();
        });

        expect(rack.rack).toHaveLength(7);
        expect(rack.seed).toBe('20251005');
    });

    test('should calculate scores correctly', async ({ page }) => {
        const scores = await page.evaluate(async () => {
            const response = await fetch(
                'http://localhost:8085/cgi-bin/calculate_scores.py',
                {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        seed: '20251005',
                        tiles: [{row: 4, col: 5, letter: 'R', turn: 1}]
                    })
                }
            );
            return await response.json();
        });

        expect(scores.scores).toHaveLength(5);
    });
});
```

---

## Phase 5: Deployment (1 hour)

### 5.1 Deployment Checklist

- [ ] Deploy server endpoints (`get_rack.py`, `calculate_scores.py`)
- [ ] Update `script.js` with V3 encoding/decoding
- [ ] Update share button to use V3 format
- [ ] Add version detection in `initializeGame()`
- [ ] Test all URL formats still work (`?g=`, `?g2=`, `?g3=`)
- [ ] Update cache-busting version numbers
- [ ] Deploy to production

### 5.2 Backward Compatibility

**Maintain all URL formats:**

```javascript
// Share button generates latest format
function shareBoardGame() {
    const url = generateShareableURLV3() || // Try V3
                generateShareableURLV2() || // Fallback V2
                generateShareableURL();     // Fallback V1

    copyToClipboardWithFeedback(url, button);
}

// URL detection supports all versions
function initializeGame() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('g3')) loadSharedGameV3(params.get('g3'));
    else if (params.has('g2')) loadSharedGameV2(params.get('g2'));
    else if (params.has('g')) loadSharedGame(params.get('g'));
    else normalGameInit();
}
```

### 5.3 Version Update

```html
<!-- index.html -->
<link rel="stylesheet" href="./styles.css?v=9.1">
<script src="./script.js?v=8.0"></script>
```

---

## Timeline

### Day 1: Server Infrastructure (4 hours)
- ☐ Create `get_rack.py` endpoint
- ☐ Create `calculate_scores.py` endpoint
- ☐ Test both endpoints manually
- ☐ Write Python unit tests

### Day 2: Client Encoding (3 hours)
- ☐ Implement bit manipulation utilities
- ☐ Implement encoder (V3)
- ☐ Test encoding with sample games
- ☐ Verify Base64 output

### Day 3: Client Decoding (3 hours)
- ☐ Implement decoder (V3)
- ☐ Implement rack fetching logic
- ☐ Implement score fetching logic
- ☐ Test round-trip (encode → decode)

### Day 4: Testing & Deployment (3 hours)
- ☐ Write Playwright tests
- ☐ Test 100+ games end-to-end
- ☐ Fix any bugs found
- ☐ Deploy to production
- ☐ Monitor for errors

**Total: 13 hours** (rounded up from 10 for buffer)

---

## Success Metrics

✅ **URL length**: < 50 characters
✅ **Load time**: < 300ms worst case
✅ **Accuracy**: 100% game reconstruction
✅ **Backward compat**: All old URLs still work
✅ **Error rate**: < 0.1% failed decodes

---

## Rollback Plan

If issues arise:

1. **Disable V3 generation**: Comment out `generateShareableURLV3()`
2. **V3 URLs still decode**: Keep decoder active
3. **Fall back to V1/V2**: Use previous format for new shares
4. **Fix and redeploy**: Address issues, test, re-enable

**No shared URLs are lost** - all versions remain supported!

---

## Next Steps

1. ✅ Review this implementation plan
2. ☐ Get approval to proceed
3. ☐ Set up development branch
4. ☐ Begin Day 1 tasks (server endpoints)
5. ☐ Track progress with daily checkins

Ready to start implementation? 🚀
