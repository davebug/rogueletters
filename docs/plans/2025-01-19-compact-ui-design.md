# Compact UI Design - Balatro-Inspired Space Efficiency

## Overview

Redesign RogueLetters UI for maximum space efficiency, ensuring everything fits on screen without scrolling on iPhone SE (320 × 568pt). Inspired by Balatro's information density while keeping our portrait orientation and vector/SVG styling.

## Constraints

- **Target device**: iPhone SE 1st gen (320 × 568pt, ~460pt usable with browser chrome)
- **Orientation**: Portrait only (not landscape like Balatro)
- **Styling**: Vector/SVG (not pixel art)
- **Critical requirement**: No scrolling; submit/continue button always visible

---

## Balatro Reference Measurements

Research into Balatro's UI system revealed these key measurements:

### Card Dimensions
- **With padding**: 71 × 95 pixels at 1x scale
- **Without padding**: 69 × 93 pixels at 1x scale
- Cards are compact - roughly 0.8cm wide on mobile (noted as borderline small)

### Font System
- Uses **m6x11** pixel font throughout
- Recommended sizes: **16, 32, 48px** (multiples of 16 for crisp rendering)
- Text scale multipliers: **0.5×** and **0.75×** for secondary/tertiary text

### Spacing (Proportional Units)
Balatro uses relative units, not fixed pixels:
- Standard padding: **0.05** or **0.1** (very tight)
- Standard corner roundness: **0.1**
- Children in flex containers are equally distributed by default

### Base Resolution
- Locked at **2048 × 1152** (landscape)
- Everything scales proportionally from this base

### Key Insight
Balatro achieves density through **aggressive scaling** - secondary text at 50-75% of base size, minimal padding (5-10% of element size), and letting content breathe only where needed.

---

## Design Decisions

### Bottom Sheet as Universal Pattern

All contextual interactions use a bottom sheet component:
- Tap backdrop or X button to dismiss
- No swipe-to-dismiss (complexity not worth it for web)
- Drag handle visual (signals "this is a sheet")
- Max height: 50% viewport
- 150ms slide-up animation

**Converts to bottom sheet:**
- Shop tile purchases (Add/Replace)
- Shop rogue purchases
- Shop tile upgrade
- Rogue inventory details
- Rogue discard selection
- Bag viewer
- Blank tile letter selector
- Board cell explanations (DL/TL/DW/TW) - NEW feature

**Keeps current pattern:**
- Exchange modal (complex rack display needs full attention)
- Settings modal (traditional modal fits)
- Game popups (round complete, failed, victory - intentional takeover)
- Earnings/Set screens (full-page by design)

---

## Shop Screen Layout

### Target Layout (~180pt content + 44pt button = 224pt, leaves 236pt+ margin)

```
┌─────────────────────────────┐
│  $47                    [🎒]│  ← Coins (18px) left, bag icon right (24pt row)
├─────────────────────────────┤
│   [E]    [S]    [⬆]        │  ← 32px tiles + 8px labels (48pt row)
│   +1     +1    Upgrade      │
├─────────────────────────────┤
│  [🎭]   [🎲]   [💰]        │  ← 36px icons + 10px prices (54pt row)
│   $5     $7     $4          │
├─────────────────────────────┤
│                             │
│     (flexible space)        │  ← Breathing room (~50pt minimum)
│                             │
├─────────────────────────────┤
│      [ Continue ]           │  ← Fixed bottom bar (44pt)
└─────────────────────────────┘
```

**Vertical budget (iPhone SE, 460pt usable):**
- Header row: 24pt
- Tiles row: 48pt (32px tile + 8px label + 8px margin)
- Rogues row: 54pt (36px icon + 10px price + 8px margin)
- Section gaps: 8pt × 2 = 16pt
- Subtotal content: ~142pt
- Continue button: 44pt
- **Remaining for breathing room: 274pt** ✓ Plenty of margin

### Key Changes
- **No title** - coin amount top-left only (user knows they're in shop)
- **Bag icon** top-right - tappable for bag viewer bottom sheet
- **Tiles row**: 2 buffed tiles + upgrade icon, all same visual weight
- **Rogues row**: 3 icons only, no text/prices visible inline
- **All prices/descriptions** appear in bottom sheet on tap
- **Fixed continue button** pinned to bottom, always visible
- **Pool info hidden** - accessible via bag icon

---

## Shop Item Compact Display

### Tiles Row (3 items side-by-side)

```
   [E]        [S]        [⬆]
   +1         +1       Upgrade
```

- Tile size: **32px × 32px** (reduced from 36px)
- Buff badge: "+1" below in gold (**8px**, 0.5× scale)
- Upgrade: same size box with ⬆️ icon, "Upgrade" label below (8px)
- Gap between items: **16px** (5% of screen width)
- Purchased: grayed out, not tappable
- Cannot-afford: opacity 0.5

### Rogues Row (3 icons)

```
  [🎭]      [🎲]      [💰]
   $5        $7        $4
```

- Icon: **36px × 36px** circle with rogue emoji (reduced from 40px)
- Price below (**10px**, 0.6× scale)
- Border: purple (rogue accent color), **2px**
- Gap between items: **16px**
- Purchased: "✓" overlay, grayed
- Empty slot: dashed border, no price
- Cannot-afford: dimmed

### Visual Hierarchy
- Rogues slightly larger than tiles (36px vs 32px - premium items)
- Prices only on rogues; tiles show buff value
- Consistent 16px gaps throughout

---

## Bottom Sheet Content

### Shop Tile
```
─────
[E]  +1 value

Base: 1pt → New: 2pt
Adds a buffed E to your bag

[ Add $2 ]  [ Replace $3 ]
```

### Shop Rogue
```
─────
🎭  The Miser

+$2 per round if you end
with 0 exchanges remaining.

         [ Buy $5 ]
```

### Shop Upgrade
```
─────
⬆️  Upgrade Tile Set

Permanently +1 to a random
common letter (E,A,I,O,N,R,T,L,S,U)

Current upgrades: E(2), A(2)

         [ Buy $3 ]
```

### Inventory Rogue
```
─────
🎭  The Miser

+$2 per round if you end
with 0 exchanges remaining.

         (no button - info only)
         (or "Discard" in shop context)
```

### Board Cell
```
─────
DL  Double Letter

Doubles the point value of
the tile placed on this square.
```

### Blank Letter Selector
```
─────────────────────────────
      Select a letter

  A  B  C  D  E  F  G
  H  I  J  K  L  M  N
  O  P  Q  R  S  T  U
  V  W  X  Y  Z
─────────────────────────────
```
- 7 columns × 4 rows
- Letter buttons: **36px × 36px** (touchable minimum)
- Gap: **4px** (tight, Balatro-style)
- Total width: 7 × 36 + 6 × 4 = **276px** (fits 320px with 22px padding each side)
- Title: **14px** (0.9× scale)
- Tap letter → selects and auto-dismisses
- X button to cancel (top-right)

### Bag Viewer
- Scrollable tile list inside bottom sheet
- Toggle buttons (Remaining/Total) at top of sheet

---

## Global Style Reductions

Applying Balatro's scaling philosophy: base size for primary content, 0.75× for secondary, 0.5× for tertiary.

### Font Sizes (Using 16px Base)
| Element | Current | New | Scale |
|---------|---------|-----|-------|
| Screen titles (h2) | 28px | 18px | ~1.1× |
| Section headers | 18px | 14px | ~0.9× |
| Body text / buttons | 14-16px | 12px | 0.75× |
| Prices, labels | 11-12px | 10px | 0.6× |
| Tiny badges | 10px | 8px | 0.5× |

### Spacing (Balatro uses 5-10% of element size)
| Element | Current | New | Ratio |
|---------|---------|-----|-------|
| Screen padding | 30-40px | 12-16px | ~5% of 320px |
| Section margins | 20px | 8px | Minimal |
| Flex gaps | 12-16px | 6-8px | Tight |
| Button padding | 8-12px | 6px 10px | Compact |
| Card/tile internal | 12-16px | 4-6px | ~10% of element |

### Element Sizes (Reference: Balatro cards are 69×93px)
| Element | Current | New |
|---------|---------|-----|
| Shop tiles | 36×36px | 32×32px |
| Rogue icons | 40×40px | 36×36px |
| Continue button | ~44px tall | 40px tall |
| Bottom sheet drag handle | - | 32px wide, 4px tall |

---

## Other Screen Tweaks

### Gameplay Screen
- Rogue inventory icons: tappable → bottom sheet
- Board cells: tappable on special squares → bottom sheet explains multiplier
- No layout changes needed (already compact)

### Earnings Screen
- Keep full-page (celebration moment)
- Reduce fonts to match new baseline
- Continue button already at bottom

### Round/Set Popups
- Keep centered popup style
- Reduce padding to match tighter feel

---

## Implementation Plan

### New Components
1. **Bottom sheet component** (reusable)
   - HTML: container + backdrop + content area
   - CSS: slide-up animation, backdrop, positioning
   - JS: show/hide, tap-outside-to-dismiss

### Files to Modify
| File | Changes |
|------|---------|
| `index.html` | Add bottom sheet container, restructure shop HTML |
| `styles.css` | Bottom sheet styles, compact shop, global reductions |
| `script.js` | Bottom sheet logic, shop refactor, board cell handlers |

### Migration Order
1. Build bottom sheet component (test in isolation)
2. Refactor shop layout + bottom sheet purchases
3. Convert rogue inventory modal → bottom sheet
4. Convert bag viewer modal → bottom sheet
5. Convert blank letter modal → bottom sheet
6. Add board cell tap → bottom sheet
7. Apply global font/spacing reductions

### Testing
- iPhone SE viewport in Chrome DevTools (320 × 568)
- Verify no scrolling on shop
- Test all bottom sheet interactions
- Verify continue button always visible

---

## Sources

Balatro measurements researched from:
- [Fonts In Use - Balatro](https://fontsinuse.com/uses/65816/balatro-computer-game) - m6x11 font identification
- [Steam Discussion - Pixel Art Dimensions](https://steamcommunity.com/app/2379780/discussions/0/575995078023067463/) - Card dimensions (71×95px)
- [Steamodded UI Guide](https://github.com/Steamodded/smods/wiki/UI-Guide) - Proportional spacing system (0.05, 0.1 units)
- [Engadget - Mobile Port Review](https://www.engadget.com/gaming/balatro-is-an-almost-perfect-mobile-port-163050971.html) - Mobile UI adaptations
