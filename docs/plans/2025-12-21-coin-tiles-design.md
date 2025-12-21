# Coin Tiles Design

**Date:** 2025-12-21
**Status:** Approved

## Overview

Add a new "coin tile" type to the shop that gives players $1 when first played in a valid word. Coin tiles have a green border and "$1" indicator.

## Requirements

- When played in a valid word, player gets a one-time $1 added to their bank
- Only triggers once per tile, ever (not on word extensions, multiple words, etc.)
- Green border instead of gold (buffed tiles)
- "$1" indicator styled like exchange button cost badge
- $1 indicator stays visible even after coin is claimed

## Data Model

**Tile object structure:**
```javascript
{
  letter: 'E',
  buffed: false,      // +1 point bonus (gold border)
  bonus: 0,           // point value bonus
  coinTile: true,     // $1 when played (green border)
  coinClaimed: false  // has the $1 been collected?
}
```

A tile is either buffed OR coinTile, never both.

**purchasedTiles array entries:**
```javascript
{ letter: 'E', bonus: 1 }           // buffed tile
{ letter: 'N', coinTile: true }     // coin tile
```

## Shop Changes

**Tile generation:**
- Each of 2 shop slots: 50% chance buffed, 50% chance coin tile
- New state: `shopTileTypes: ['buffed', 'coin']`

**Pricing:**
| Tile Type | Add to Bag | Replace |
|-----------|------------|---------|
| Buffed    | $2         | $3      |
| Coin      | $3         | $4      |

**Display:**
- Buffed: Gold border, "+1" label
- Coin: Green border, "$1" indicator, "$1 on play" label

## Gameplay Logic

**On `submitWord` (valid word accepted):**
1. Check each tile in `gameState.placedTiles` for this turn
2. If tile has `coinTile: true` AND `coinClaimed: false`:
   - Add $1 to `runState.coins`
   - Set `coinClaimed: true` on that tile
3. Save state

**Invariants:**
- Only tiles placed THIS turn can trigger reward
- Multiple coin tiles in one word = multiple $1 rewards
- `coinClaimed` persists across turns and refresh

## Visual Styling

**CSS:**
```css
.coin-tile {
  border: 2px solid var(--success-color) !important;
}

.coin-tile .tile-coin-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 9px;
  font-weight: 700;
  color: var(--success-color);
}
```

**Bag viewer:**
- Coin tiles show green border + $1 indicator (like buffed tiles show gold)

## State Persistence

**runState additions:**
- `shopTileTypes: ['buffed', 'coin']`

**gameState additions:**
- `coinClaimedPositions: [{row, col}, ...]`

**On restore:**
- Check tile positions against `coinClaimedPositions` to restore `coinClaimed: true`

## Files to Modify

| File | Changes |
|------|---------|
| `script.js` | Tile generation, shop logic, submitWord coin check, createTileElement, markBuffedTiles, persistence |
| `styles.css` | `.coin-tile`, `.tile-coin-indicator`, bag viewer coin tile styles |
| `index.html` | Possibly shop tile markup if needed |
