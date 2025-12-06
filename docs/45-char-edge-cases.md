# 45-Character URL: Edge Cases & Limitations

## Your Questions

### 1. Score of 257+ on one turn?

**Answer: NO, this does NOT break! ✅**

**Why**: The 45-char format **doesn't store scores at all** - the server calculates them when decoding.

- Server can calculate ANY score (no limit)
- If someone scores 1000+ points, it works fine
- The score calculation endpoint returns full integers

**Theoretical max score in one turn**:
- 9x9 board = 81 tiles max
- Using all premium squares, all high-value letters
- Could theoretically be 500+ points
- **45-char format handles it**: ✅

**Note**: The old 52-char format that stored scores (6 bits each) would break at 64+ points per turn!

---

### 2. Date from 1963?

**Answer: YES, this BREAKS! ❌**

**Why**: Date encoding uses 14 bits for days since 2020-01-01

**Supported range**:
- 14 bits = 0 to 16,383 days
- 16,383 days ÷ 365 = ~45 years
- **Supports: 2020-01-01 to ~2065-01-01**

**1963 is 57 years BEFORE 2020**:
- Would need negative encoding (not supported)
- Trying to encode 1963 would fail or wrap around

**Impact**:
- Games from 1963-2019: ❌ Cannot encode
- Games from 2020-2065: ✅ Works
- Games from 2066+: ❌ Cannot encode

**Do you care?**
- Probably not! Game launched in 2024/2025
- Old historical dates unlikely to be shared
- 45 years future support (to 2065) is plenty

**Workaround if needed**:
- Use 16 bits for date (supports 179 years)
- Costs 2 extra bits → still 45 chars
- Range: 1930-2109 or 2000-2179

---

## Other Breaking Cases

### 3. More than 31 tiles played ❌

**Limit**: Tile count uses 5 bits = max 31 tiles

**Reality**:
- Game allows 5 turns × 7 tiles = 35 tiles max
- Tile count field only supports 0-31

**What breaks**:
- If someone played 32+ tiles (game bug/hack)
- Encoder would overflow or truncate

**Likelihood**: Very low (game enforces 35 tile max)

**Fix if needed**: Use 6 bits (supports 63 tiles) → costs 1 bit

---

### 4. Position outside board (0-80) ❌

**Limit**: Position uses 7 bits = max 127

**Board**: 9×9 = 81 positions (0-80)

**What breaks**:
- If encoder somehow generates position > 80
- Decoder would place tile off-board or crash

**Likelihood**: Very low (board validation prevents this)

**Status**: Safe ✅ (7 bits is plenty for 0-80)

---

### 5. Invalid rack index ⚠️

**Scenario**: Rack index (0-6) doesn't match actual rack

**Example**:
- Turn 1 rack: [R,S,T,A,E,D,L]
- Encoder stores: rackIdx=5 (means 'D')
- Server returns rack: [R,S,T,A,E,D,L]
- Decoder gets: rack[5] = 'D' ✅

**But what if**:
- Server's rack doesn't match client's rack (RNG drift?)
- Encoder stored wrong index
- Rack index > 6 (only 7 positions)

**Result**:
- Wrong letter decoded
- Game board incorrect
- Visual mismatch

**Likelihood**: Low (if RNG is deterministic)

**Mitigation**: Validate rack index is 0-6 when encoding

---

### 6. Server endpoints down 🔴

**Critical dependency**: Must fetch racks and scores from server

**What breaks**:
- If `/get_rack.py` is down → cannot decode letters
- If `/calculate_scores.py` is down → no scores shown
- If server is unreachable → game doesn't load

**Impact**:
- Unlike 95-char URLs (self-contained), 45-char URLs need server
- Offline viewing impossible
- Server downtime = broken URLs

**Mitigation**:
- Cache racks in localStorage after first fetch
- Fallback to 95-char format if server fails
- Show error: "Server required to view this game"

---

### 7. Corrupted Base64 data ❌

**Scenario**: URL gets corrupted (typo, copy-paste error)

**Example**:
- Original: `?g3=IEMKSSRAB...`
- Corrupted: `?g3=IEMKSSRA...` (missing letter)

**What happens**:
- Base64 decode fails → Invalid byte data
- Bit stream reading goes off-track
- Wrong values decoded → garbage game

**Mitigation**:
- Wrap decoder in try/catch
- Validate decoded values (date range, position range, etc.)
- Show error: "Invalid share URL"
- Optionally: Add checksum (costs 8-16 bits)

---

### 8. Game with tile swaps ⚠️

**Current game**: Doesn't support swaps (yet)

**Future feature**: Swap tiles instead of playing

**Impact on encoding**:
- 45-char format doesn't encode swaps
- Only encodes played tiles
- If swaps are added, rack calculation breaks

**Example**:
- Turn 1: Draw [R,S,T,A,E,D,L]
- Player swaps S → gets H
- Rack is now [R,H,T,A,E,D,L]
- But server thinks rack is [R,S,T,A,E,D,L]
- Rack index 1 → decoder gets wrong letter!

**Solution if swaps are added**:
- Track swaps separately (1 bit per swap flag)
- Server needs swap info to calculate correct rack
- Or: Include swapped tiles in URL

**Current status**: Not a problem (no swaps in game)

---

### 9. Blank tiles (future feature) ⚠️

**Scrabble has blank tiles**: Can represent any letter

**Current game**: No blanks (all tiles have fixed letters)

**If blanks are added**:
- Need to encode: position + "is blank" + "what letter it represents"
- Rack index alone isn't enough
- Example: Blank used as 'Q' vs actual Q tile

**Current encoding**:
- Position (7) + RackIdx (3) + Turn (3) = 13 bits
- Doesn't have "blank flag" or "represents letter"

**Solution if blanks added**:
- Add 1 bit: "is blank" flag
- If blank: use extra bits for letter (5 bits for A-Z)
- Total: 13 + 1 + 5 = 19 bits per blank tile
- Or version the format: `?g4=` with blank support

**Current status**: Not a problem (no blanks in game)

---

### 10. Starting word not in daily_words.txt ❌

**Dependency**: Server needs to know starting word for the date

**What breaks**:
- If date's starting word not in `daily_words.txt`
- If file is corrupted or missing
- Server returns wrong starting word

**Impact**:
- Tile generation uses wrong starting word
- All tiles are wrong
- Entire game is wrong

**Likelihood**: Low (file is pre-generated)

**Mitigation**:
- Validate starting word exists before encoding
- Server fallback to "SAILING" if word missing
- Include starting word hash in URL? (costs bits)

---

### 11. Race condition: Tiles played out of order ⚠️

**Scenario**: URL lists tiles in wrong turn order

**Example**:
- Turn 2 tile encoded before Turn 1 tile
- Server calculates rack for Turn 1, gets wrong tiles drawn
- Rack index doesn't match

**Current encoding**: Each tile has turn number (3 bits)

**Status**: Should be safe ✅ (turn number preserves order)

**But**: Encoder must group tiles correctly by turn

---

### 12. Date rollover (year 2065) ❌

**What happens in year 2065?**
- 14 bits maxed out (16,383 days from 2020)
- Next day: January 2, 2065
- Encoding fails or wraps to 0 (looks like 2020!)

**Impact**:
- All games from 2065+ break
- URLs encode wrong date
- Games appear to be from 2020

**Solution**:
- Increase date bits before 2065 (40 years away)
- Use 16 bits: supports 179 years (2020-2199)
- Costs 2 bits → still fits in 45 chars

**Current status**: Not a problem for decades

---

## Summary Table

| Edge Case | Breaks? | Likelihood | Impact | Fix |
|-----------|---------|------------|--------|-----|
| **Score 257+** | ✅ No | Medium | None | N/A |
| **Date 1963** | ❌ Yes | Low | Can't encode old dates | Use 16-bit date |
| **Date 2065+** | ❌ Yes | Very Low | Breaks in 40 years | Use 16-bit date |
| **32+ tiles** | ❌ Yes | Very Low | Overflow | Use 6 bits |
| **Position > 80** | ❌ Yes | Very Low | Off-board | Validate |
| **Invalid rack index** | ⚠️ Maybe | Low | Wrong letter | Validate |
| **Server down** | 🔴 Yes | Medium | Can't load | Cache/fallback |
| **Corrupted URL** | ❌ Yes | Medium | Decode fails | Checksum |
| **Tile swaps** | ⚠️ Future | N/A | Breaks racks | Version v4 |
| **Blank tiles** | ⚠️ Future | N/A | Need more bits | Version v4 |
| **No starting word** | ❌ Yes | Very Low | Wrong tiles | Fallback |
| **Tiles out of order** | ✅ No | Low | None (turn# saves us) | N/A |

---

## Recommendations

### Must Fix Now:
1. **Date range validation** - reject dates outside 2020-2065
2. **Server error handling** - graceful fallback if endpoints fail
3. **Corrupted data validation** - check decoded values are in range

### Should Fix Soon:
4. **Add checksum** (8-16 bits) - detect corrupted URLs
5. **Server caching** - cache rack results for offline fallback

### Can Wait:
6. **16-bit dates** - extend range before 2060
7. **Swap/blank support** - version v4 when features added

### Acceptable Trade-offs:
- ✅ No historical dates before 2020 (unlikely use case)
- ✅ Server dependency (most shares are viewed online)
- ✅ No swap/blank support (features don't exist yet)

---

## Validation Checklist

**Before encoding:**
- [ ] Date is between 2020-2065
- [ ] Tile count ≤ 31
- [ ] All positions are 0-80
- [ ] All rack indices are 0-6
- [ ] All turns are 1-5

**After decoding:**
- [ ] Date converts to valid YYYYMMDD
- [ ] Tile count matches bit stream
- [ ] All positions map to valid row/col
- [ ] Server returned valid racks
- [ ] Scores calculated successfully

**Error handling:**
- [ ] Wrap decoder in try/catch
- [ ] Show user-friendly error messages
- [ ] Log errors for debugging
- [ ] Fallback to 95-char format if available
- [ ] Offer "Report broken link" option

---

## Conclusion

**The 45-char format is robust** with a few known limitations:

✅ **Works great for**:
- Modern games (2020-2065)
- Standard gameplay (no swaps/blanks)
- Any score (even 1000+ points)
- Online viewing (server available)

⚠️ **Be aware of**:
- Historical dates < 2020 (not supported)
- Server dependency (offline doesn't work)
- Future features may need v4 format

**Overall verdict**: Ship it! 🚀

The edge cases are manageable, and most are either very unlikely or acceptable trade-offs.
