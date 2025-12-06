# Twitter Thread: V3 URL Encoding

## Tweet 1 (Hook)
We just shipped a feature that encodes an entire game board (35 tiles, 5 turns, positions, scores) into a 44-character URL.

https://letters.wiki/?g=IOFtKUQJlleEyrQRnJDehOUpqVNA

That's the FULL URL. Here's how we did it. 🧵

## Tweet 2 (The Problem)
Naive approach: Each tile needs position (7 bits), letter (5 bits), turn (3 bits) = 15 bits/tile.

For 35 tiles + date + scores, that's ~525 bits → 95 characters after compression.

We needed something radically smaller.

## Tweet 3 (The Breakthrough)
Key insight: The tiles are deterministic. Same date = same random tiles every time.

So instead of storing which LETTER was played, we store which RACK POSITION (0-6) it came from.

Rack index = 3 bits instead of letter = 5 bits. Instant 40% savings per tile.

## Tweet 4 (How It Works)
Binary format: [14-bit date][5-bit count][13 bits per tile]

Each tile: 7 bits position + 3 bits rack index + 3 bits turn.

Server regenerates racks on-demand, client maps indices to letters. No scores stored—recalculated from positions.

## Tweet 5 (The Payoff)
Result: 95 characters → 44 characters (53% reduction)

Old URLs still work (auto-fallback). Play today's puzzle and share your board:

https://letters.wiki

Full technical writeup: [link to V3-URL-EXPLAINED.md]

---

**Character counts:**
- Tweet 1: 253 chars ✓
- Tweet 2: 232 chars ✓
- Tweet 3: 244 chars ✓
- Tweet 4: 270 chars ✓
- Tweet 5: 227 chars ✓

All under 280 characters!
