# Versioned URL Format Documentation

## Overview

WikiLetters uses a versioned URL system to enable instant sharing while maintaining backward compatibility with all existing share URLs.

## URL Formats

### Legacy Format: `?g=` (V3 Original)

**Example:** `https://letters.wiki/?g=IRIn4UGJ4pg05ihJS45NcpuQGsUIyCHDWiMyAbBV`

**Characteristics:**
- All URLs created before November 2025
- Decodes without alphabetical sorting
- Slower sharing (~5 seconds, sequential API calls)
- **Guaranteed to work forever** (backward compatible)

**Use Case:**
- All existing shared URLs
- Fallback for games loaded from old links

### New Format: `?w=` (V3 Sorted)

**Example:** `https://letters.wiki/?w=IRIn4UGJ4pg05ihJS45NcpuQGsUIyCHDWiMyAbBV`

**Characteristics:**
- All URLs created after November 2025
- Uses alphabetical rack sorting
- **Instant sharing** (~0ms, no API calls via rack caching)
- Same URL length as legacy format

**Use Case:**
- All newly generated share URLs
- Optimal user experience (instant sharing)

## Technical Details

### The Problem We Solved

**Root Cause:**
When users manually reordered tiles in their rack, share URLs would decode with wrong letters.

**Why It Happened:**
1. `/letters.py` endpoint preserves user's tile reordering
2. `/get_rack.py` endpoint returns tiles in canonical (seed-based) order
3. Same letters, different positions → rack indices mismatch → wrong decoded letters

**Example Bug:**
- User plays "ALONE"
- After reordering tiles, share URL decodes as "OFLNE"
- Same letters, wrong positions!

### The Solution: Alphabetical Sorting

**Insight:**
Both `/letters.py` and `/get_rack.py` return the SAME letters, just in different order. If we sort both alphabetically, they become identical!

**Implementation:**
- New `?w=` URLs apply alphabetical sorting during encoding AND decoding
- Both endpoints' racks become identical after sorting
- Rack indices now point to correct letters

**Example:**
```javascript
// User's reordered rack
['O', 'F', 'L', 'N', 'E', 'X', 'Y']

// API canonical rack
['A', 'E', 'F', 'L', 'N', 'O', 'X', 'Y']

// AFTER sorting (both identical!)
['A', 'E', 'F', 'L', 'N', 'O', 'X', 'Y']  ✅
```

### Why Versioned URLs?

**Why not just update all URLs to use sorting?**
That would break ALL existing share URLs! Every URL already shared would decode with wrong letters.

**The versioned approach:**
- Old `?g=` URLs keep working (no sorting)
- New `?w=` URLs use sorting (faster!)
- Perfect backward compatibility
- Graceful migration as old URLs naturally age out

## Implementation

### URL Detection (initializeGame)

```javascript
const legacyParam = urlParams.get('g');  // V3 original (no sorting)
const sortedParam = urlParams.get('w');  // V3 sorted (with caching)
const compressedParam = sortedParam || legacyParam;
const isSortedFormat = !!sortedParam;

await loadV3SharedGame(compressedParam, isSortedFormat);
```

### Encoding (encodeV3URL)

**Always generates new `?w=` format:**

```javascript
// Fast path (cached racks) - ENABLED!
const allRacksCached = gameState.turnHistory.every(turn =>
    turn && turn.originalRack && turn.originalRack.length > 0
);

if (allRacksCached) {
    // Sort rack alphabetically before assigning indices
    const sortedRack = [...rack].sort();

    // Find rack index in sorted rack
    for (let i = 0; i < sortedRack.length; i++) {
        if (sortedRack[i] === tile.letter && !usedIndices.has(i)) {
            rackIdx = i;
            // ...
        }
    }
}

// Generate URL with ?w= parameter
const url = `https://letters.wiki/?w=${encoded}`;
```

### Decoding (decodeV3URL)

**Handles both formats:**

```javascript
async function decodeV3URL(encodedData, isSortedFormat = false) {
    // ... decode bits ...

    // Fetch rack from API
    const rack = data.rack;

    // Apply sorting for new format
    const decodingRack = isSortedFormat ? [...rack].sort() : rack;

    // Use decodingRack to look up letters from indices
    const letter = decodingRack[rackIdx];
}
```

## Benefits

### For Users

✅ **Instant sharing** - Share button completes in ~0ms (was ~5s)
✅ **Backward compatible** - All old URLs still work
✅ **Unchanged gameplay** - Can still reorder tiles during play
✅ **No visible changes** - Everything works the same, just faster

### For Developers

✅ **Rack caching re-enabled** - No API calls during sharing
✅ **Clean versioning** - Easy to add more formats (`?x=`, `?y=`, etc.)
✅ **Maintainable** - Clear separation between legacy and new code
✅ **Testable** - Both formats tested independently

## Performance

### Legacy `?g=` URLs

**Encoding:**
- 5 API calls to `/get_rack.py` (sequential, ~1s each)
- Total: ~5 seconds

**Decoding:**
- 5 API calls to `/get_rack.py` (sequential)
- Total: ~5 seconds

### New `?w=` URLs

**Encoding:**
- **0 API calls** (uses cached racks!)
- Total: ~0ms (instant!)

**Decoding:**
- 5 API calls to `/get_rack.py` (sequential)
- Total: ~5 seconds
- *Note: Decoding can't use cache because we don't know what was played yet*

## Testing

### Core Gameplay Tests

All 4 test scenarios use legacy `?g=` URLs to verify backward compatibility:

```bash
cd testing/core-gameplay
npm test
```

**Results:**
```
✓ scenario-3 (186 points)
✓ scenario-2 (186 points)
✓ scenario-1 (129 points)
✓ high-score-grandpa-129pts (129 points)

4 passed (1.6m)
```

### Manual Testing

1. Play a game to completion
2. Click "Share Board" button
3. Verify instant response (~0ms)
4. Check URL starts with `?w=`
5. Load the URL in new tab
6. Verify board displays correctly

## Future Enhancements

### Additional Format Versions

If we need new encoding strategies in the future:

- `?g=` - V3 original (no sorting)
- `?w=` - V3 sorted (current)
- `?x=` - Future format v4
- `?y=` - Future format v5
- `?z=` - Future format v6

Each parameter name represents a different encoding/decoding strategy, all backward compatible.

### Potential Improvements

**Server-side rack sorting:**
Could make `/letters.py` and `/get_rack.py` both return alphabetically sorted racks, eliminating the need for client-side sorting. However, this would require backend changes and still wouldn't fix existing `?g=` URLs.

**Cache decoding:**
Could cache racks during decoding to make loading shared games faster on subsequent views. However, first load would still need API calls to fetch racks.

## Migration Timeline

### November 2025 - Launch
- Deploy versioned URL system
- All new URLs use `?w=` format
- Legacy `?g=` URLs still work

### 1 Month Later
- Majority of active shares use `?w=` format
- Old `?g=` URLs gradually age out naturally

### 6 Months Later
- Nearly all active shares use `?w=` format
- Legacy `?g=` URLs maintained indefinitely for old links

## Troubleshooting

### "Share URL shows wrong letters"

**Cause:** User shared a `?g=` URL (legacy format) after reordering tiles

**Solution:** This is fixed in new `?w=` URLs. Old URLs may have this issue if created before November 2025.

### "Share button takes 5 seconds"

**Cause:** Rack caching disabled or failed

**Check:**
1. Look for console log: "All racks cached! Using fast path"
2. If missing, racks weren't cached during gameplay
3. Should only happen when loading shared games

### "Old share URL doesn't work"

**This should never happen!** Legacy `?g=` URLs are maintained indefinitely.

**Debug:**
1. Check URL parameter (should be `?g=...`)
2. Check console for decoding errors
3. Verify URL wasn't corrupted

## Related Files

- `script.js` - Main implementation (encodeV3URL, decodeV3URL)
- `testing/core-gameplay/` - Backward compatibility tests
- `testing/test-versioned-urls.spec.js` - Format-specific tests
- `CLAUDE.md` - Project guidelines

## Version History

- **v10.27** (November 2025) - Versioned URL system with `?w=` format
- **v10.26** (November 2025) - Reverted Option 3c (sorting broke backward compat)
- **v10.25** (November 2025) - Hotfix: Disabled rack caching (ALONE→OFLNE bug)
- **v10.x** (Earlier) - Original V3 URL format with `?g=` parameter
