# Performance Comparison: 52-char vs 45-char URLs

## Network Performance

### 52-char Version (Rack Indices + Scores)
**Server Calls on Decode:**
```
Turn 1: GET /get_rack.py?seed=20251005&turn=1  (~50ms)
Turn 2: GET /get_rack.py?seed=20251005&turn=2  (~50ms)
Turn 3: GET /get_rack.py?seed=20251005&turn=3  (~50ms)
Turn 4: GET /get_rack.py?seed=20251005&turn=4  (~50ms)
Turn 5: GET /get_rack.py?seed=20251005&turn=5  (~50ms)
Total: 5 requests × 50ms = ~250ms (if sequential)
      5 requests × 50ms = ~50ms (if parallel)
```

**Data already has scores** - display immediately ✅

### 45-char Version (No Scores)
**Option A: Separate Score Endpoint**
```
Rack fetching: 5 requests = ~50ms parallel
Score calc:    1 request  = ~30ms
Total: ~80ms
```

**Option B: Bundled Score Calculation**
```
GET /get_rack.py?seed=20251005&turn=1&calc_score=true
  → Returns: {rack: [...], score: 25}

Still 5 requests × 60ms = ~60ms parallel
```

**Option C: Single Score Endpoint After Racks**
```
1. Fetch all racks: ~50ms
2. Decode all tiles: ~5ms client-side
3. POST /calculate_scores.py with all tiles: ~40ms
Total: ~95ms
```

## Performance Impact Summary

| Metric | 52-char | 45-char (Best Case) | 45-char (Worst Case) | Difference |
|--------|---------|---------------------|----------------------|------------|
| **Server calls** | 5 | 5 | 6 | +0 to +1 |
| **Total latency** | ~50ms | ~60ms | ~95ms | +10ms to +45ms |
| **Data transfer** | ~1.2KB | ~1KB | ~1.3KB | Similar |
| **Client CPU** | Low | Low | Low | Negligible |

**Verdict**: 45-char adds **10-45ms latency** (barely noticeable)

---

## Client-Side Performance

### Bit Manipulation Complexity

**52-char Unpacking:**
```javascript
// Simple byte-aligned fields
const date = buffer.readUInt32BE(0);      // 4 bytes
for (let i = 0; i < tileCount; i++) {
    const offset = 4 + (i * 2);
    const row = buffer.readUInt8(offset) >> 4;     // 4 bits
    const col = buffer.readUInt8(offset) & 0x0F;   // 4 bits
    const rackIdx = buffer.readUInt8(offset + 1) >> 5;  // 3 bits
    const turn = (buffer.readUInt8(offset + 1) >> 2) & 0x07; // 3 bits
}
```
**Time**: ~0.1ms for 7 tiles

**45-char Unpacking:**
```javascript
// Bit-level operations (not byte-aligned)
const dateBits = readBits(buffer, 0, 14);  // 14 bits
const date = daysSinceEpochToDate(dateBits);

for (let i = 0; i < tileCount; i++) {
    const offset = 14 + 5 + (i * 13);
    const pos = readBits(buffer, offset, 7);      // 7 bits
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    const rackIdx = readBits(buffer, offset + 7, 3);  // 3 bits
    const turn = readBits(buffer, offset + 10, 3);    // 3 bits
}
```
**Time**: ~0.3ms for 7 tiles

**Difference**: +0.2ms (negligible)

---

## Encoding Performance

### 52-char Encoding
```javascript
// Byte-aligned packing
buffer.writeUInt32BE(date, 0);
for (let i = 0; i < tiles.length; i++) {
    const offset = 4 + (i * 2);
    buffer.writeUInt8((row << 4) | col, offset);
    buffer.writeUInt8((rackIdx << 5) | (turn << 2), offset + 1);
}
```
**Time**: ~0.1ms

### 45-char Encoding
```javascript
// Bit-level packing
writeBits(buffer, 0, date, 14);
writeBits(buffer, 14, tileCount, 5);
for (let i = 0; i < tiles.length; i++) {
    const offset = 19 + (i * 13);
    const pos = row * 9 + col;
    writeBits(buffer, offset, pos, 7);
    writeBits(buffer, offset + 7, rackIdx, 3);
    writeBits(buffer, offset + 10, turn, 3);
}
```
**Time**: ~0.3ms

**Difference**: +0.2ms (negligible)

---

## Real-World Impact

### Loading a Shared Game

**52-char URL:**
```
1. Parse URL (0.1ms)
2. Base64 decode (0.2ms)
3. Unpack binary (0.1ms)
4. Fetch racks - parallel (50ms) ← DOMINANT
5. Render board (2ms)
Total: ~52ms
```

**45-char URL:**
```
1. Parse URL (0.1ms)
2. Base64 decode (0.1ms)
3. Unpack binary (0.3ms)
4. Fetch racks + scores (60ms) ← DOMINANT
5. Render board (2ms)
Total: ~62ms
```

**Perceived difference**: +10ms (imperceptible to humans)

---

## Server-Side Load

### Score Calculation Cost

**Simplified calculation** (per turn):
```python
def calculate_turn_score(tiles, board):
    # Find words formed
    words = find_words(tiles, board)  # ~1ms

    # Calculate score
    score = sum(score_word(w) for w in words)  # ~0.5ms

    return score  # Total: ~1.5ms
```

**Full game**: 5 turns × 1.5ms = ~7.5ms server CPU

**Current server capacity**: Handles 100+ req/sec
**Impact**: Minimal (< 1% CPU increase)

---

## Bandwidth Comparison

### URL Size
- 52 chars: 52 bytes
- 45 chars: 45 bytes
- **Savings**: 7 bytes (13%)

### Request Sizes
**52-char (5 rack requests):**
```
Request:  GET /get_rack.py?seed=20251005&turn=1  (~80 bytes)
Response: {"rack":["R","S","T","A","E","D","L"]} (~40 bytes)
Total per turn: 120 bytes
Total all turns: 600 bytes
```

**45-char (5 rack + 1 score):**
```
Rack requests: 5 × 120 = 600 bytes
Score request: GET /calc_scores (100 bytes)
              POST with tile data (150 bytes)
              Response: {"scores":[20,25,18,22,15]} (40 bytes)
Total: 890 bytes
```

**Bandwidth increase**: +290 bytes (48%)

---

## Trade-off Analysis

### 52-char Version
**Pros:**
- ✅ Faster loading (~50ms)
- ✅ Less bandwidth (600 bytes)
- ✅ Simpler bit operations
- ✅ Scores display immediately

**Cons:**
- ❌ Longer URLs (7 extra chars)
- ❌ Stores scores in URL (40 bits)

### 45-char Version
**Pros:**
- ✅ Shorter URLs (7 chars saved)
- ✅ Server validates game integrity
- ✅ More compact encoding

**Cons:**
- ❌ Slightly slower (+10-45ms)
- ❌ More bandwidth (+290 bytes)
- ❌ More complex bit operations
- ❌ Score delay on display

---

## Recommendations by Use Case

### Use 52-char if:
- ⚡ **Speed matters** (competitive leaderboards)
- 📊 **Analytics matter** (want instant display)
- 🔌 **Offline fallback** desired (scores in URL)
- 🎯 **Simplicity** preferred

### Use 45-char if:
- 📱 **SMS/QR codes** (every char counts)
- 🔗 **Twitter/social** (character limits)
- ✅ **Game validation** important (server verifies)
- 🎯 **Ultimate compression** needed

---

## Performance Recommendation

**Go with 52-char version** unless:
1. You need absolute shortest URLs possible
2. Character count is critical constraint
3. 7 characters makes real difference

**Why 52-char wins:**
- ✅ 10-45ms faster (noticeable on slow connections)
- ✅ 48% less bandwidth
- ✅ Simpler implementation
- ✅ Scores display instantly
- **Only cost**: 7 extra characters (13% longer)

---

## Hybrid Approach

**Best of both worlds:**

```javascript
function shareGame(preferShort = false) {
    if (preferShort) {
        return generate45CharURL();  // No scores
    } else {
        return generate52CharURL();  // With scores
    }
}
```

**UI:**
```
[Share Board] → 52-char (default, fast)
[Get Short URL] → 45-char (opt-in, slower)
```

Users choose speed vs size!

---

## Final Verdict

**52-char is better for most users**
- Imperceptibly longer (7 chars)
- Noticeably faster (10-45ms)
- Less server load
- Simpler code

**45-char only if you NEED it**
- SMS character limits
- QR code density
- Tweet character restrictions

**Recommendation**: Implement 52-char first, add 45-char as optional "ultra-compact" mode later if needed.
