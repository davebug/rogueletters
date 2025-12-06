# URL Compression Optimization Analysis

## Current State
- **Current URL length**: 95 characters
- **Format**: `https://letters.wiki/?g=N4IgJiBcIEwAwwKwEY50SANCA7lEASgKoByJAogDIDKWIALlANoC62Azs8opvLz33gsAvkA`
- **Compression**: LZ-String with `compressToEncodedURIComponent()`
- **Data structure**: JSON with keys `d` (date), `w` (word), `t` (tiles array), `s` (scores array)

## Current Data Breakdown
```json
{
  "d": "20251005",           // 8 chars + quotes/key = ~16 bytes
  "w": "RUNNELS",            // 7 chars + quotes/key = ~15 bytes
  "t": [[4,4,"R",1,0],...],  // ~35 bytes per tile (7 tiles = ~245 bytes)
  "s": [20,25,18,22,15]      // ~20 bytes
}
```
**Uncompressed JSON**: ~296 bytes
**Compressed**: 82 characters (base64-like encoding)

---

## Optimization Strategies

### 1. **Binary Encoding Instead of JSON**

#### Approach
Convert game data to binary format, then base64/base85 encode.

**Binary Format:**
```
[8 bytes: date YYYYMMDD]
[1 byte: word length]
[N bytes: word letters]
[1 byte: number of tiles]
For each tile:
  [1 byte: row (0-8)]
  [1 byte: col (0-8)]
  [1 byte: letter (A=65...Z=90)]
  [1 byte: turn (1-5)]
[5 bytes: scores (1 byte each)]
```

**Example calculation:**
- Date: 8 bytes
- Word: 1 + 7 = 8 bytes
- Tiles: 1 + (7 × 4) = 29 bytes
- Scores: 5 bytes
- **Total: 51 bytes uncompressed**

**With Base85 encoding**: 51 bytes → ~63 characters
**With Base64 encoding**: 51 bytes → ~68 characters
**With gzip + Base64**: 51 bytes → ~45-50 characters

**Pros:**
- ✅ Much more compact than JSON (~50% reduction before compression)
- ✅ Compression works better on binary data
- ✅ Could achieve ~50-60 char URLs

**Cons:**
- ❌ Harder to debug (not human-readable)
- ❌ More complex encoding/decoding logic
- ❌ Breaking changes to existing shared URLs
- ❌ Browser support for binary operations varies

**Estimated URL length**: 50-65 characters

---

### 2. **Custom Base91/Base85 Encoding**

#### Approach
Use more efficient encoding than Base64's 64-character alphabet.

- **Base64**: 6 bits per character (64 chars)
- **Base85**: 6.3 bits per character (85 chars)
- **Base91**: 6.5 bits per character (91 chars)

**Pros:**
- ✅ 10-15% shorter than Base64 for same data
- ✅ URL-safe variants exist
- ✅ Works with existing JSON structure

**Cons:**
- ❌ Requires custom encoding library
- ❌ Less widely supported/tested
- ❌ Marginal improvement (~10-15 chars saved)

**Estimated URL length**: 70-80 characters

---

### 3. **Delta Encoding for Tiles**

#### Approach
Store first tile absolute position, then deltas for subsequent tiles.

**Current format**: `[[4,4,"R",1,0], [4,5,"U",1,0], ...]`
**Delta format**: `[4,4,"R",1, +0,+1,"U", ...]`

**Example:**
```
First tile: row=4, col=4, letter=R, turn=1
Second tile: Δrow=0, Δcol=+1, letter=U, turn=1 (assumed same)
Third tile: Δrow=0, Δcol=+1, letter=N, turn=1 (assumed same)
```

**Pros:**
- ✅ Reduces repeated position data
- ✅ 20-30% smaller for sequential placements
- ✅ Works well with LZ-String compression

**Cons:**
- ❌ Complex for non-sequential placements
- ❌ More decode logic needed
- ❌ Moderate complexity increase

**Estimated URL length**: 75-85 characters

---

### 4. **Server-Side Storage (Short Codes)**

#### Approach
Store game state server-side, return 6-8 character short code.

**Format**: `https://letters.wiki/?g=aB3xK2`

**Implementation:**
```python
# Server generates short ID
game_data = {...}
short_id = generate_id()  # "aB3xK2" (6 chars = 62^6 = 56B possibilities)
redis.set(f"game:{short_id}", json.dumps(game_data), ex=2592000)  # 30 day TTL
```

**Pros:**
- ✅ **Shortest possible URLs** (6-8 characters)
- ✅ Can track analytics (view counts, etc.)
- ✅ Can update/fix games retroactively
- ✅ Can add expiration/cleanup

**Cons:**
- ❌ **Requires backend infrastructure** (Redis/DB)
- ❌ **URLs can break** if server purges data
- ❌ **Storage costs** (millions of games)
- ❌ **Privacy concerns** (server sees all games)
- ❌ Doesn't work offline
- ❌ Single point of failure

**Estimated URL length**: 6-8 characters (+ domain/params = ~32 total)

---

### 5. **Hybrid: Client Compression + Optional Server Backup**

#### Approach
Use compressed URL by default, optionally save to server for shorter URL.

**User flow:**
1. Share button generates compressed URL (95 chars)
2. "Get shorter URL" button saves to server → 8 char code
3. Both URLs work forever

**Pros:**
- ✅ Best of both worlds
- ✅ No server dependency by default
- ✅ Opt-in server storage
- ✅ Fallback if server fails

**Cons:**
- ❌ Complex implementation
- ❌ Two code paths to maintain
- ❌ Still need server infrastructure

**Estimated URL length**: 95 chars (or 8 with server)

---

### 6. **Remove Redundant Data**

#### Approach
Eliminate data that can be derived or assumed.

**Current redundancy:**
- `blank` field: Always 0 (6 bytes wasted)
- Turn numbers: Usually sequential (compressible)
- Date: Could use relative days since epoch

**Optimized structure:**
```json
{
  "d": 1949,              // Days since Jan 1, 2020 (smaller number)
  "w": "RUNNELS",
  "t": [[4,4,"R"],[4,5,"U"],...],  // Remove turn & blank
  "s": [20,25,18,22,15]
}
```

**Infer turn from tile count:**
- Tiles 1-7: Turn 1
- Tiles 8-14: Turn 2
- Etc.

**Pros:**
- ✅ 15-20% data reduction
- ✅ Simple to implement
- ✅ No new libraries needed

**Cons:**
- ❌ Less flexible for future features
- ❌ Assumptions may break edge cases
- ❌ Harder to debug

**Estimated URL length**: 75-85 characters

---

### 7. **Brotli Compression**

#### Approach
Use Brotli instead of LZ-String (10-20% better compression).

**Pros:**
- ✅ Better compression ratio than LZ
- ✅ Native browser support (modern browsers)
- ✅ Drop-in replacement for LZ-String

**Cons:**
- ❌ Requires async/await (not in LZ-String)
- ❌ Browser support not universal (IE11 fails)
- ❌ Larger library size
- ❌ Only 10-15% improvement

**Estimated URL length**: 80-85 characters

---

### 8. **Single-Character Keys + Positional Data**

#### Approach
Use ultra-compact JSON with single-char keys and arrays.

**Current**: `{"d":"20251005","w":"RUNNELS","t":[[4,4,"R",1,0]],"s":[20]}`
**Optimized**: `[20251005,"RUNNELS",[[4,4,17,1]],[20]]`

- Remove all keys (use array positions)
- Encode letters as numbers: A=0, B=1, ..., Z=25 (saves quotes)
- Encode date as integer

**Pros:**
- ✅ Removes ~30 bytes of JSON syntax
- ✅ 20-30% smaller
- ✅ Still readable/debuggable

**Cons:**
- ❌ Position-dependent (fragile)
- ❌ Less self-documenting
- ❌ Breaking change

**Estimated URL length**: 70-80 characters

---

## Comparison Matrix

| Method | URL Length | Complexity | Reliability | Browser Support | Recommendation |
|--------|-----------|------------|-------------|-----------------|----------------|
| **Current (LZ-String + JSON)** | 95 | Low | High | 100% | ✅ Baseline |
| **Binary + Base85** | 55-65 | High | High | 95% | ⭐ Best compression |
| **Custom Base91** | 70-80 | Medium | Medium | 90% | ⚠️ Marginal gains |
| **Delta Encoding** | 75-85 | Medium | High | 100% | ⚠️ Moderate gain |
| **Server Short Codes** | 32 total | High | Medium | 100% | ⭐ Shortest, but dependencies |
| **Hybrid Approach** | 32-95 | Very High | High | 100% | ⚠️ Complex |
| **Remove Redundancy** | 75-85 | Low | High | 100% | ✅ Easy quick win |
| **Brotli** | 80-85 | Medium | High | 95% | ⚠️ Small improvement |
| **Array Format** | 70-80 | Low | High | 100% | ✅ Good tradeoff |

---

## Recommended Approach: Tiered Strategy

### Phase 1: Quick Wins (5-10 char reduction)
1. **Remove redundant fields** (blank=0, sequential turns)
2. **Switch to array format** instead of keyed JSON
3. **Encode date as days-since-epoch** (smaller number)

**Expected result**: 75-80 characters (15-20 char savings)

### Phase 2: Advanced Compression (20-30 char reduction)
1. **Binary encoding** with typed arrays
2. **Base85 encoding** for output
3. **Optional gzip** if browser supports

**Expected result**: 55-65 characters (30-40 char savings)

### Phase 3: Server Option (Optional)
1. **Add "Get Short URL" button** (opt-in)
2. **Server stores full game** with 7-char ID
3. **TTL of 1 year** (auto-cleanup)

**Expected result**: 32 characters total (63 char savings)

---

## Implementation Complexity vs Gain

```
                     Complexity
                         ↑
                         │
              Server     │
              Short      │
              Codes      │
                         │    Binary
                    Hybrid│    Encoding
                         │
                         │
                  Brotli │    Delta
                         │    Encoding
              Base91     │
                         │    Array Format
                         │    Remove Redundant
        Current          │
        ──────────────────┼────────────────────→
                         │                   Gain
                         │
                    10 chars    30 chars    60 chars
```

---

## Recommended Next Steps

### Option A: Conservative (Recommended)
**Remove redundant data + array format**
- Achieves: 75-80 character URLs (16% reduction)
- Effort: 2-4 hours implementation
- Risk: Low (backward compatible with new version)
- Breaking: Yes (old URLs won't work, but can version)

### Option B: Aggressive
**Binary encoding + Base85**
- Achieves: 55-65 character URLs (37% reduction)
- Effort: 8-16 hours implementation + testing
- Risk: Medium (encoding bugs could corrupt games)
- Breaking: Yes

### Option C: Hybrid
**Conservative first, then add server option**
- Achieves: 75 chars default, 32 chars optional
- Effort: 4 hours + server setup
- Risk: Medium (server dependency for short URLs)
- Breaking: Partial (can fallback to compressed)

---

## Decision Framework

**Choose Conservative if:**
- URL length < 100 chars is "good enough"
- Simplicity and reliability are priorities
- Want to avoid server infrastructure

**Choose Aggressive if:**
- Every character counts (SMS, QR codes)
- Willing to test thoroughly
- Have time for complex implementation

**Choose Hybrid if:**
- Want shortest possible URLs
- Can maintain server infrastructure
- Want analytics/tracking
- Need both offline and ultra-short options

---

## Compatibility Notes

All approaches should version the URL format:

**Current**: `?g=<data>`
**Version 2**: `?g2=<binary-data>` or `?v=2&g=<data>`
**Server**: `?s=<short-code>` or `?g=<7-char>`

This allows:
- ✅ Old URLs continue working
- ✅ New format is clearly versioned
- ✅ Graceful degradation
- ✅ A/B testing different methods

---

## Testing Requirements

Any new compression method must:
1. ✅ Compress and decompress 1000 random games successfully
2. ✅ Handle edge cases (max tiles, max scores, special chars)
3. ✅ Work across all target browsers
4. ✅ Degrade gracefully on failures
5. ✅ Have rollback mechanism
6. ✅ Maintain game state integrity 100%

---

---

## 🚀 BREAKTHROUGH: Deterministic Tile Generation

### The Key Insight
**The date seed determines EVERYTHING:**
- Starting word (always the same for a given date)
- Tile sequence (deterministic based on seed)
- Rack contents for each turn (derived from seed + previous plays)

### Revolutionary Optimization: Rack Index Encoding

**Current encoding** (per tile):
```json
[row, col, "R", turn]  // Letter takes space
```

**Optimized encoding** (per tile):
```json
[row, col, rack_index, turn]  // Which position in rack (0-6)
```

**Example:**
- Turn 1 rack: `[S,T,A,R,E,D,L]` (deterministic from seed)
- Player plays: S(4,5), A(4,6), E(4,7)
- **Current**: `[[4,5,"S",1], [4,6,"A",1], [4,7,"E",1]]`
- **Optimized**: `[[4,5,0,1], [4,6,2,1], [4,7,4,1]]`

### Data Savings

**Bit requirements per tile:**
- `row`: 0-8 → 4 bits
- `col`: 0-8 → 4 bits
- `rack_index`: 0-6 → 3 bits
- `turn`: 1-5 → 3 bits
- **Total: 14 bits per tile (1.75 bytes)**

**Current per tile**: ~10-12 bytes (with JSON formatting)

**Reduction**: **85% per tile!**

### Implementation Requirements

#### Option A: Client-Side RNG (Recommended)
Port the Python tile generation algorithm to JavaScript:

```javascript
function generateRackForTurn(seed, turnNumber, previousPlays) {
    // Seed-based RNG (same as Python)
    const rng = seedRandom(seed);
    const bag = createTileBag();

    // Remove tiles played in previous turns
    previousPlays.forEach(tile => removeFromBag(bag, tile));

    // Draw 7 tiles deterministically
    return drawTiles(bag, 7, rng);
}
```

**Pros:**
- ✅ No server dependency for decoding
- ✅ Works offline
- ✅ Ultra-compact encoding
- ✅ ~40-50 char URLs achievable

**Cons:**
- ❌ Must port Python RNG logic exactly
- ❌ RNG must be 100% identical to server
- ❌ Any RNG drift breaks everything

#### Option B: Server-Assisted Decode
Client asks server: "What's the rack for date X, turn Y?"

**Pros:**
- ✅ No RNG porting needed
- ✅ Always correct
- ✅ Same compression benefits

**Cons:**
- ❌ Requires server roundtrip
- ❌ Doesn't work offline
- ❌ Server dependency

### Ultra-Compact Format

Using rack indices + binary encoding:

```
Format: [date][tiles_bitstream][scores]

Date: 4 bytes (days since epoch)
Tiles: 14 bits × 7 tiles = 98 bits = 13 bytes
Scores: 5 bytes (1 per turn)
Total: 22 bytes → ~30 chars base64
```

**URL**: `https://letters.wiki/?g=<30-chars>`

**Total URL length: ~52 characters** (45% reduction from current 95!)

### Decision Tree

```
Can we port Python RNG to JS?
├─ YES → Use client-side generation
│         ✅ ~52 char URLs
│         ✅ Works offline
│         ⏰ 8-12 hours implementation
│
└─ NO → Use server-assisted decode
          ✅ ~52 char URLs
          ⚠️ Requires server
          ⏰ 4-6 hours implementation
```

### Testing Critical Path

1. **RNG Verification**: Generate 1000 test games
   - Python generates seed → rack sequence
   - JS generates same seed → MUST match exactly
   - Single mismatch = catastrophic failure

2. **Edge Cases**:
   - Games with swaps (affects tile sequence)
   - Multiple tiles from same rack position
   - Blank tiles (future feature)

3. **Backward Compatibility**:
   - Version URLs: `?g2=<compact>` vs `?g=<legacy>`
   - Fallback to full letter encoding if RNG fails

### Recommended Approach

**Phase 1: Verify Feasibility (2-4 hours)**
1. Port Python RNG to JavaScript
2. Test against 100 known seeds
3. Verify 100% match rate

**Phase 2: Implement (4-8 hours)**
1. Build rack-index encoder
2. Build binary packing (14 bits per tile)
3. Build decoder with RNG verification
4. Test extensively

**Phase 3: Deploy (2 hours)**
1. Add `?g2=` parameter support
2. Keep `?g=` for backward compatibility
3. A/B test both formats

### Expected Outcome

**Achievable URL length: ~52 characters**
- Domain + params: 23 chars
- Encoded data: 29 chars
- **Total: 52 chars (45% reduction!)**

### Risk Assessment

**Risk: RNG Mismatch**
- Impact: 🔴 CRITICAL (breaks all shared games)
- Likelihood: 🟡 Medium (depends on perfect port)
- Mitigation: Extensive testing + fallback to letter encoding

**Risk: Future Changes**
- Impact: 🟡 Medium (breaks if tile system changes)
- Likelihood: 🟢 Low (tile system is stable)
- Mitigation: Version URLs, maintain legacy support

---

## Final Recommendation (REVISED)

### Phase 1: Deterministic Rack Encoding (Breakthrough!)

1. **Port tile generation RNG** from Python to JavaScript
2. **Encode tiles as rack indices** (0-6) instead of letters
3. **Binary pack**: 14 bits per tile
4. **Base64 encode**: Result ~30 chars

**This gives:**
- **~52 character URLs** (45% reduction!)
- Foundation uses date-seed determinism
- Works offline (if RNG ported correctly)
- Massive compression win

### Fallback: Conservative Approach

If RNG porting proves too risky:
1. Implement array-based format: `[date,[word],[tiles],[scores]]`
2. Remove blank tile field (always 0)
3. Encode letters as numbers (A=0...Z=25)
4. Encode date as days since 2020-01-01

**This gives:**
- 75-80 character URLs (20% reduction)
- Low implementation risk
- 2-4 hours effort
- Maintains debuggability
- Foundation for future optimizations

**Then evaluate:**
- If 75 chars is good enough → done!
- If need shorter → add binary encoding (Phase 2)
- If need ultra-short → add server option (Phase 3)

---

## URL Length Goals

- **Current**: 95 chars ✅ (working)
- **Conservative goal**: 75 chars 📊 (20% reduction)
- **Aggressive goal**: 60 chars 🎯 (37% reduction)
- **Ultimate goal**: 32 chars 🚀 (66% reduction, requires server)

Each tier represents a meaningful improvement in shareability, QR code efficiency, and SMS length.
