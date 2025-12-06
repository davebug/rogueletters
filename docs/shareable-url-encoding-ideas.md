# Shareable URL Encoding Ideas for Letters Game

Research-based approaches for encoding complete game state in a `letters.wiki` URL query string.
**Priority: Minimize URL length + widespread browser compatibility** (only date needs to be human-readable).

## Required Data
- Date (YYYYMMDD - 8 chars) - **MUST be human-readable**
- Starting word (variable length, 5-10 chars)
- Tile placements (position, letter, turn, blank flag for ~25-40 tiles)
- Scores for 5 turns (0-100 each)
- Turn info enables "click feedback square to highlight turn's tiles" feature

**Estimated raw data size:** ~75 bytes for typical 30-tile game

---

## Idea 1: Base64URL Binary ⭐ RECOMMENDED
**Example:** `?g=20251005-PUZZLE-QxFeEIxGX...kNz-PxWSHz`

**Format:**
- Date: `YYYYMMDD` (human-readable)
- Starting word: plain text
- Tiles: Each tile = 17 bits (8 pos, 5 letter, 3 turn, 1 blank) → pack into bytes → **Base64URL** encode
- Scores: 5 bytes (0-255 range) → Base64URL encode

**Pros:** No library, URL-safe (- and _ instead of + and /), native browser support, excellent compression
**Cons:** Manual bit manipulation required
**Est. Length:** 75-95 characters
**Compatibility:** ✅ 100% - all browsers support atob/btoa

---

## Idea 2: LZ-String (Optimized for URLs)
**Example:** `?g=20251005-MYewdgzgLgBAsg...KYwGYA`

**Format:**
- Date: `YYYYMMDD` (human-readable)
- Everything else: Create minimal object → `LZString.compressToEncodedURIComponent()`
  - Object: `{w:"PUZZLE",t:[[7,7,"E",0,0],[8,7,"X",0,0],...],s:[15,22,18,31,27]}`

**Pros:** Specifically designed for URL compression, often beats gzip for small data, automatic encoding
**Cons:** Requires ~3KB library
**Est. Length:** 50-75 characters
**Compatibility:** ✅ 100% - pure JavaScript, no dependencies

**Library:** `lz-string` (https://pieroxy.net/blog/pages/lz-string/index.html)

---

## Idea 3: MessagePack + Base64URL
**Example:** `?g=20251005-kqF3BlBVWlpMRYKh...dBXRxs`

**Format:**
- Date: `YYYYMMDD` (human-readable)
- Everything else: Create object → MessagePack.encode() → Base64URL
  - MessagePack: Binary JSON-like format, standardized, extremely compact

**Pros:** Standardized format (used by Redis, etc.), smaller than JSON, efficient binary packing
**Cons:** Requires ~10KB library (@msgpack/msgpack)
**Est. Length:** 60-80 characters
**Compatibility:** ✅ 100% - pure JavaScript

**Library:** `@msgpack/msgpack` (https://github.com/msgpack/msgpack-javascript)

---

## Idea 4: Variable-Length Quantity (VLQ) + Base64URL
**Example:** `?g=20251005-PUZZLE-gOEgPYCE...wl0PW-ejW`

**Format:**
- Date: `YYYYMMDD` (human-readable)
- Starting word: plain text
- Tiles: Encode position deltas + letters using VLQ (7 bits per byte, continuation bit)
  - First tile: absolute position
  - Subsequent: delta from previous (typically 1-15, saves bits)
- Scores: VLQ encoded

**Pros:** No library needed, efficient for sequential placements, variable length = optimal for data
**Cons:** Custom implementation, ~50 lines of code
**Est. Length:** 70-95 characters
**Compatibility:** ✅ 100% - pure JavaScript, used in source maps

---

## Idea 5: Brotli + Base64URL (Maximum Compression)
**Example:** `?g=20251005-G0YAABw...fHzBXI=`

**Format:**
- Date: `YYYYMMDD` (human-readable)
- Everything else: JSON → Brotli compress → Base64URL
  - Brotli: Modern compression, 15-20% better than gzip

**Pros:** Best compression available, standardized (RFC 7932)
**Cons:** Requires ~35KB library for compression/decompression in JavaScript
**Est. Length:** 45-70 characters
**Compatibility:** ⚠️ 95% - needs JavaScript library (native browser support only for HTTP, not arbitrary data)

**Library:** `brotli-wasm` or similar (~35KB)

---

## NEW Idea 6: Minimal JSON + Base64URL (Baseline)
**Example:** `?g=20251005-eyJ3IjoiUFVaWkxFIiwidCI6W1s3...RdfQ==`

**Format:**
- Date: `YYYYMMDD` (human-readable)
- Everything else: Ultra-minimal JSON → Base64URL (no compression)
  - JSON: `{"w":"PUZZLE","t":[[7,7,"E",0,0],...],"s":[15,22,18,31,27]}`
  - Use single-char keys, arrays instead of objects

**Pros:** Dead simple, no library, easy to debug, extend, and maintain
**Cons:** Larger than compressed options
**Est. Length:** 120-150 characters
**Compatibility:** ✅ 100% - native JSON + btoa

---

## NEW Idea 7: Huffman-Coded Letters + Base64URL
**Example:** `?g=20251005-PUZZLE-3hG9kX...pQm-PxWSHz`

**Format:**
- Date: `YYYYMMDD` (human-readable)
- Starting word: plain text
- Tiles: Use Huffman tree for letters (E/T/A/O/I/N = 3-4 bits, Q/Z/X = 7-8 bits)
  - Position: 8 bits
  - Letter: 3-8 bits (average ~4.5 bits for English)
  - Turn: 3 bits
- Scores: 7 bits each

**Pros:** Optimal bit usage for English letter frequency, no library needed
**Cons:** Custom implementation, ~100 lines, need to include Huffman tree or use static one
**Est. Length:** 65-85 characters
**Compatibility:** ✅ 100% - pure JavaScript

---

## NEW Idea 8: Run-Length Encoding (RLE) + Base64URL
**Example:** `?g=20251005-PUZZLE-7eE1:8eX1:7fU1...9iE2-FMIVr`

**Format:**
- Date: `YYYYMMDD` (human-readable)
- Starting word: plain text
- Tiles: Group consecutive placements, encode as `position:letter:count`
- Scores: Base36 (0-Z = 0-35)

**Pros:** Good for games with many consecutive placements, simple implementation
**Cons:** No benefit for scattered placements, variable effectiveness
**Est. Length:** 80-120 characters (highly variable)
**Compatibility:** ✅ 100% - pure JavaScript

---

## Comprehensive Comparison Matrix

| Approach | Length | Impl. Effort | Library Size | Speed | Compatibility | Best For |
|----------|--------|--------------|--------------|-------|---------------|----------|
| 1. Base64URL Binary | 80 | Medium | 0 KB | Fast | ✅ 100% | **Balance** |
| 2. LZ-String | 60 | Low | 3 KB | Fast | ✅ 100% | **Ease + Size** |
| 3. MessagePack+B64 | 70 | Low | 10 KB | Fast | ✅ 100% | Standardization |
| 4. VLQ+Base64URL | 80 | Medium | 0 KB | Medium | ✅ 100% | Sequential data |
| 5. Brotli+Base64URL | 55 | Low | 35 KB | Slow | ⚠️ 95% | Max compression |
| 6. JSON+Base64URL | 135 | Very Low | 0 KB | Very Fast | ✅ 100% | **Simplicity** |
| 7. Huffman+Base64URL | 75 | High | 0 KB | Medium | ✅ 100% | Optimization |
| 8. RLE+Base64URL | 100 | Low | 0 KB | Fast | ✅ 100% | Consecutive tiles |

---

## Final Recommendations

### 🥇 Best Overall: **LZ-String (Idea 2)**
- Smallest size with minimal complexity
- 3KB library is negligible
- Specifically designed for this use case
- Can switch to no-library option later if needed

### 🥈 Best No-Library: **Base64URL Binary (Idea 1)**
- Zero dependencies
- Good compression
- Native browser support
- Reasonable implementation effort

### 🥉 Best Simplicity: **Minimal JSON + Base64URL (Idea 6)**
- Start here to get feature working
- Easy to debug and extend
- Can optimize later

---

## Implementation Summary

### **LZ-String** (Recommended)
```javascript
// Encode
const gameData = {w: "PUZZLE", t: [[7,7,"E",0,0],...], s: [15,22,18,31,27]};
const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(gameData));
const url = `https://letters.wiki/share?g=20251005-${encoded}`;

// Decode
const [date, data] = params.g.split('-');
const gameData = JSON.parse(LZString.decompressFromEncodedURIComponent(data));
```

**Setup:**
1. Add `<script src="lz-string.min.js"></script>` (3KB)
2. Encode game state on share
3. Decode on page load
4. Render board from tile array with turn data

**Code needed:** ~50 lines total

---

### **Base64URL Binary** (No Library)
```javascript
// Encode
function packTile(row, col, letter, turn, blank) {
  // 8 bits pos | 5 bits letter | 3 bits turn | 1 bit blank = 17 bits
  const pos = row * 15 + col;
  const letterCode = letter.charCodeAt(0) - 65; // A=0, Z=25
  return (pos << 9) | (letterCode << 4) | (turn << 1) | blank;
}

// Decode
function unpackTile(bits17) {
  const pos = (bits17 >> 9) & 0xFF;
  const letter = String.fromCharCode(((bits17 >> 4) & 0x1F) + 65);
  const turn = (bits17 >> 1) & 0x7;
  const blank = bits17 & 0x1;
  return {row: Math.floor(pos/15), col: pos%15, letter, turn, blank};
}
```

**Setup:**
1. Implement bit packing/unpacking functions (~100 lines)
2. Pack all tiles into byte array
3. Convert to Base64URL using `btoa()` and character replacement
4. Decode using `atob()` and unpack bits

**Code needed:** ~150 lines total

---

### **Minimal JSON** (Simplest Start)
```javascript
// Encode
const gameData = {w:"PUZZLE", t:[[7,7,"E",0,0],...], s:[15,22,18,31,27]};
const encoded = btoa(JSON.stringify(gameData)).replace(/\+/g,'-').replace(/\//g,'_');
const url = `https://letters.wiki/share?g=20251005-${encoded}`;

// Decode
const [date, data] = params.g.split('-');
const decoded = atob(data.replace(/-/g,'+').replace(/_/g,'/'));
const gameData = JSON.parse(decoded);
```

**Setup:**
1. Collect game state into object
2. JSON.stringify + btoa + character replacement
3. Reverse on decode

**Code needed:** ~30 lines total

---

## Example Full URLs

**LZ-String (60 chars after date):**
```
https://letters.wiki/share?g=20251005-MYewdgzgLgBAsgSwLYwE4BMwFMAWADBAIbgCmMANgOZrEgA
```

**Base64URL Binary (80 chars after date):**
```
https://letters.wiki/share?g=20251005-PUZZLE-QxFeEIxGXJyAaKyBbMzCcNzDdOzEePz-PxWSHzVxRx
```

**Minimal JSON (135 chars after date):**
```
https://letters.wiki/share?g=20251005-eyJ3IjoiUFVaWkxFIiwidCI6W1s3LDcsIkUiLDAsMF1dLCJzIjpbMTUsMjIsMTgsMzEsMjddfQ==
```
