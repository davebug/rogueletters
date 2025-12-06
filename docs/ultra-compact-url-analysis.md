# Ultra-Compact URL: Beyond Rack Indices

## Starting Point (Rack Index Encoding)
- **Current**: 52 characters total
- Per tile: 14 bits (row:4, col:4, rack_idx:3, turn:3)
- Date: 32 bits
- Scores: 40 bits (5 × 8 bits)
- Total: 170 bits ≈ 22 bytes ≈ 30 base64 chars

---

## Additional Optimizations

### 1. **Single Position Value** (Save 1 bit per tile)

**Current**: Row (0-8) + Col (0-8) = 4 + 4 = 8 bits

**Optimized**: Position as single value 0-80 = 7 bits
```
position = row × 9 + col
row = position ÷ 9
col = position % 9
```

**Savings**: 1 bit × 7 tiles = 7 bits

---

### 2. **Compact Score Encoding** (Save 10 bits total)

**Current**: 5 scores × 8 bits = 40 bits (supports 0-255)

**Reality**: Scores rarely exceed 60
- 6 bits supports 0-63 range ✅

**Optimized**: 5 scores × 6 bits = 30 bits

**Savings**: 10 bits

---

### 3. **Eliminate Turn Field with Grouping** (Save 21 bits!)

**Current**: Each tile stores turn number (3 bits)

**Insight**: We can group tiles by turn with counts!

**Format**:
```
[turn1_count: 3 bits][turn1_tiles...][turn2_count: 3 bits][turn2_tiles...]
```

**Example game**: 3 tiles turn 1, 2 tiles turn 2, 2 tiles turn 3

**Current encoding**:
- 7 tiles × 3 bits (turn) = 21 bits

**Optimized encoding**:
- 5 turn counts × 3 bits = 15 bits
- No turn field per tile

**Savings**: 21 - 15 = 6 bits

BUT: This saves less than keeping turn field because we need counts.

**Better approach**: Infer turn from position in stream
- First N tiles = turn 1
- Next M tiles = turn 2
- Use score array length (5) to know turn boundaries

Actually no - we need to know which tiles go with which turn for scoring!

**Keep turn field**: More reliable, only 3 bits

---

### 4. **Relative Date Encoding** (Save ~18 bits)

**Current**: Date as YYYYMMDD = 8 digits = needs ~27 bits for integer

**Actually current**: Days since epoch (e.g., 2020-01-01)
- Days from 2020-01-01 to 2030-12-31 ≈ 4000 days
- Needs 12 bits (2^12 = 4096)

**But currently using**: 32 bits (4 bytes) - wasteful!

**Optimized**:
- 12 bits for date (supports 11 years from epoch)
- OR 14 bits (supports 45 years)

**Savings**: 32 - 14 = 18 bits

---

### 5. **Word-Pattern Encoding** (Conditional savings)

**Observation**: Most plays place tiles in a line (horizontal/vertical word)

**Pattern 1 - Sequential word**:
```
Normal: [pos][rack_idx][turn] × N tiles
Optimized: [start_pos][direction][rack_idx₁][rack_idx₂]...[turn]
```

**Example**: Playing "CAT" horizontally at (4,5)
- **Normal**:
  - [4,5,rackIdx_C,1][4,6,rackIdx_A,1][4,7,rackIdx_T,1] = 14×3 = 42 bits
- **Optimized**:
  - [position:7][dir:1][rackIdx_C:3][rackIdx_A:3][rackIdx_T:3][turn:3] = 20 bits

**Savings**: 22 bits for 3-letter word!

**Implementation**:
- Detect if tiles form sequential line
- Use flag bit: 0=normal, 1=word pattern
- Conditional encoding based on pattern

**Complexity**: High
**Average savings**: ~15-20 bits per game (if 50% of tiles form words)

---

### 6. **Variable-Length Position Encoding** (Advanced)

**Observation**: Tiles placed near center (row/col 3-5) are most common

**Approach**: Huffman-like encoding
- Center positions (3-5, 3-5): Use fewer bits
- Edge positions: Use more bits

**Example distribution**:
- Positions 30-50 (center area): 3-4 bits
- Positions 0-29, 51-80 (edges): 6-7 bits

**Average case**: ~5 bits vs 7 bits (saves 2 bits per tile)

**Cons**:
- Complex encoding table
- Decoder overhead
- Marginal gains for complexity

---

### 7. **Arithmetic Coding** (Best compression)

Instead of fixed-bit fields, use arithmetic coding:
- Treats entire game as single number
- Optimal compression based on probability
- Modern alternative: ANS (Asymmetric Numeral Systems)

**Theoretical limit** (Shannon entropy):
- Position entropy: ~6.3 bits (assuming 81 positions uniform)
- Rack index: ~2.8 bits (7 choices)
- Turn: ~2.3 bits (5 choices)
- Scores: ~5.5 bits (assuming 0-60 range)

**Minimum possible**: ~120-130 bits for full game (vs current 170)

**Cons**:
- Very complex implementation
- Decoder requires arithmetic precision
- Library size (5-10KB)

---

### 8. **Eliminate Scores Entirely** (Save 40 bits!)

**Radical idea**: Don't store scores, recalculate them!

**Server-assisted score calculation**:
1. Client sends positions + rack indices
2. Server decodes rack indices → letters
3. Server validates words and calculates scores
4. Return game state with scores

**Pros**:
- ✅ Saves 40 bits (scores array)
- ✅ Server already has scoring logic
- ✅ Validates game integrity

**Cons**:
- ❌ Another server roundtrip (already doing rack lookup)
- ❌ Can't display score until server responds
- ⚠️ Server must recalculate word scores (more CPU)

**Verdict**: Worth it! Server already helping with rack decode.

---

## Optimized Encoding V2

**Apply optimizations 1, 2, 4, 8**:

```
Date:        14 bits  (days since epoch, 45 years)
Tiles:       7 tiles × (7 pos + 3 rack_idx + 3 turn) = 91 bits
Scores:      0 bits (calculated by server)
Total:       105 bits ≈ 14 bytes ≈ 19 base64 chars
```

**URL length**: `https://letters.wiki/?g2=` (26 chars) + 19 chars = **45 chars total!**

**Reduction**: 95 → 45 = **53% shorter!**

---

## Ultra-Optimized V3 (With Word Patterns)

**Add optimization 5 (word patterns)**:

Assuming 50% of tiles form sequential words:
- 3-4 tiles as patterns: saves ~15-20 bits
- Total: 105 - 17 = **88 bits ≈ 12 bytes ≈ 16 base64 chars**

**URL length**: **42 chars total!**

**Reduction**: 95 → 42 = **56% shorter!**

---

## Comparison Matrix

| Approach | Total Bits | Base64 Chars | URL Length | Complexity | Savings |
|----------|-----------|--------------|------------|------------|---------|
| **Current (JSON + LZ)** | ~760 | 82 | 95 | Low | - |
| **Rack indices** | 170 | 30 | 52 | Medium | 45% |
| **+ Basic optimizations** | 105 | 19 | 45 | Medium | 53% |
| **+ Word patterns** | 88 | 16 | 42 | High | 56% |
| **+ Arithmetic coding** | 70 | 12 | 38 | Very High | 60% |

---

## Recommended Approach: Optimized V2

**Implement these 4 optimizations**:

1. ✅ **Rack indices** (not letters)
2. ✅ **Single position value** (7 bits vs 8)
3. ✅ **Compact date** (14 bits vs 32)
4. ✅ **Server-calculated scores** (0 bits vs 40)

**Result**: 45-character URLs (53% reduction)

**Implementation effort**: 8-10 hours
- Rack decode endpoint: 3 hours
- Score calculation endpoint: 2 hours
- Binary packing/unpacking: 3 hours
- Testing: 2 hours

---

## Binary Format Specification

### V2 Format (105 bits)

```
Byte 0-1:  Date (14 bits) + spare (2 bits)
Byte 2:    Tile count (5 bits) + spare (3 bits)

For each tile (13 bits):
  - Position (7 bits): 0-80 grid position
  - Rack index (3 bits): 0-6 position in rack
  - Turn (3 bits): 1-5

Example encoding (3 tiles):
  Date:  14 bits = 0b00011110001010
  Count: 5 bits  = 0b00011 (3 tiles)
  Tile 1: pos=40(0b0101000) rack=2(0b010) turn=1(0b001)
  Tile 2: pos=41(0b0101001) rack=4(0b100) turn=1(0b001)
  Tile 3: pos=42(0b0101010) rack=0(0b000) turn=1(0b001)
```

**Packing in JavaScript**:
```javascript
function packGameV2(seed, tiles) {
    const bits = [];

    // Date (14 bits)
    const date = seedToDaysSinceEpoch(seed);
    pushBits(bits, date, 14);

    // Tile count (5 bits)
    pushBits(bits, tiles.length, 5);

    // Tiles (13 bits each)
    tiles.forEach(({row, col, rackIdx, turn}) => {
        const pos = row * 9 + col;
        pushBits(bits, pos, 7);
        pushBits(bits, rackIdx, 3);
        pushBits(bits, turn, 3);
    });

    // Convert bits to bytes
    const bytes = bitsToBytes(bits);

    // Base64 encode
    return btoa(String.fromCharCode(...bytes));
}
```

---

## Testing Requirements

1. **Bit-packing accuracy**: Pack/unpack 1000 games, verify 100% match
2. **Server decode**: Verify rack lookups match actual game racks
3. **Score calculation**: Verify server scores match client scores
4. **Edge cases**:
   - Games with 0 tiles played (forfeit)
   - Games with max tiles (35)
   - All edge positions (corners)
   - Date wraparound (year boundaries)

---

## Deployment Strategy

### Phase 1: V1 (Rack indices, current scores)
- URL: 52 chars
- Keep scores in URL for now
- Get rack-index system working
- Deploy as `?g2=`

### Phase 2: V2 (Add optimizations)
- URL: 45 chars
- Remove scores (server calculates)
- Optimize date to 14 bits
- Single position value (7 bits)
- Deploy as `?g3=`

### Phase 3: V3 (Optional word patterns)
- URL: 42 chars
- Detect sequential word patterns
- Conditional encoding
- Deploy as `?g4=`

**Maintain all versions**:
- `?g=` - Original (95 chars)
- `?g2=` - Rack indices (52 chars)
- `?g3=` - Optimized (45 chars)
- `?g4=` - Ultra-compact (42 chars)

---

## Ultimate Theoretical Limit

Using arithmetic coding + all optimizations:
- **38-40 characters** (60% reduction)
- Requires complex encoder/decoder
- ~10KB library overhead
- Probably not worth it

---

## Final Recommendation

**Target: 45-character URLs** (53% reduction)

**Implement V2 with these optimizations**:
1. Rack indices (not letters)
2. Position as single value (7 bits)
3. Date as 14-bit days-since-epoch
4. Server-calculated scores (0 bits stored)

**Why stop here?**
- ✅ Excellent compression (53% reduction)
- ✅ Reasonable complexity (8-10 hours)
- ✅ Reliable (server-assisted)
- ✅ URL fits easily in SMS, tweets, QR codes

**Further optimization (word patterns → 42 chars) not worth complexity**:
- Marginal gain (3 chars)
- High implementation complexity
- Conditional encoding = harder debugging
- Better to keep it simple

---

## Next Steps

1. ✅ Create `/cgi-bin/get_rack.py` - return rack for seed/turn
2. ✅ Create `/cgi-bin/calculate_scores.py` - score calculation
3. ✅ Implement binary packing (105 bits format)
4. ✅ Build encoder/decoder
5. ✅ Test with 100+ games
6. ✅ Deploy as `?g3=<compact>` format

**Expected final result**: 45-character shareable URLs! 🎉
