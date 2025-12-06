# WikiDates Features NOT Suitable for WikiLetters

## Critical Differences to Preserve

### 1. ❌ **Scroll-Based Interaction Model**
**WikiDates:** Gap selection triggered by scroll position relative to viewport center
**WikiLetters MUST KEEP:** Direct drag-and-drop with cursor/finger control

**Why NOT to implement:**
- WikiLetters requires precise tile placement at specific positions
- Users need immediate visual feedback where their finger/cursor is
- Scroll-based selection would break the intuitive drag metaphor
- Board game mechanics require direct manipulation, not indirect scrolling

### 2. ❌ **Single Active Gap System**
**WikiDates:** Only ONE gap can be highlighted at a time
**WikiLetters MUST KEEP:** Multiple gaps (placeholder + insertion indicator)

**Why NOT to implement:**
- Users need to see WHERE tile came from (placeholder gap)
- Users need to see WHERE tile is going (insertion gap)
- Removing the placeholder would lose position context
- Single gap would make reordering confusing

### 3. ❌ **Click-to-Place Mechanism**
**WikiDates:** Click card → card animates to highlighted gap
**WikiLetters MUST KEEP:** Full drag-and-drop control

**Why NOT to implement:**
- Scrabble-style games require precise tile positioning
- Click-to-place removes player control over exact placement
- Would break board-to-board tile movement
- Would eliminate the tactile feel of moving pieces

### 4. ❌ **Viewport-Center Detection**
**WikiDates:** Gap selection based on viewport center, not cursor
**WikiLetters MUST KEEP:** Cursor/touch position determines insertion point

**Why NOT to implement:**
```javascript
// WikiDates - BAD for WikiLetters
const viewportCenter = window.innerHeight / 2;
const distance = Math.abs(gapCenter - viewportCenter);

// WikiLetters - MUST KEEP
const insertIndex = getInsertionIndex(event.clientX);
```

### 5. ❌ **Fixed Vertical Expansion**
**WikiDates:** Gaps expand vertically (0px → 120px height)
**WikiLetters MUST KEEP:** Horizontal tile arrangement

**Why NOT to implement:**
- Tile racks are horizontal, not vertical
- Vertical expansion would break rack layout
- Would require complete UI restructure
- Goes against Scrabble game conventions

### 6. ❌ **Delayed Gap Highlighting**
**WikiDates:** 2-second delay after scroll for gap highlight
**WikiLetters MUST KEEP:** Instant feedback during drag

**Why NOT to implement:**
```javascript
// WikiDates - BAD for WikiLetters
setTimeout(() => {
    highlightClosestGap();
}, 2000); // 2-second delay

// WikiLetters - MUST KEEP
// Immediate update on drag/touchmove
updateRackDropIndicator(e, rack);
```

### 7. ❌ **Permanent Gap Elements**
**WikiDates:** Gap divs exist permanently in DOM between cards
**WikiLetters SHOULD NOT:** Create gaps dynamically only when dragging

**Why NOT to implement:**
- Permanent gaps would clutter the DOM
- Tiles should appear contiguous when not dragging
- Dynamic creation is more performant
- Cleaner HTML structure

### 8. ❌ **Auto-Placement Logic**
**WikiDates:** Cards can auto-place after timeout
**WikiLetters MUST NOT:** No automatic tile placement

**Why NOT to implement:**
- Players must have full control over tile placement
- Auto-placement would interfere with strategy
- Could cause accidental moves
- Breaks competitive game integrity

## Features to AVOID

### 🚫 **Gap Background Colors**
**WikiDates:** Uses `background: #708090CC` for highlighted gaps
**WikiLetters:** Keep subtle borders only

```css
/* WikiDates - TOO HEAVY */
.gap.highlight {
    background: #708090CC;
}

/* WikiLetters - KEEP SUBTLE */
.insertion-gap {
    border: 2px dashed #4CAF50;
    background: transparent; /* or very subtle */
}
```

### 🚫 **Rotated Text Labels**
**WikiDates:** Shows rotated "before/after" text
**WikiLetters:** Not needed - letters speak for themselves

```css
/* WikiDates - UNNECESSARY */
.gap.highlight::after {
    content: attr(data-text);
    transform: rotate(-90deg);
}
```

### 🚫 **Large Gap Sizes**
**WikiDates:** 120px gap height
**WikiLetters:** Keep gap size equal to tile size (40-46px)

### 🚫 **Complex Z-Index Management**
**WikiDates:** Multiple z-index layers for gaps
**WikiLetters:** Simpler layering sufficient

## What WikiLetters MUST Preserve

### ✅ **Direct Manipulation**
- Tiles move WITH cursor/finger
- Immediate visual feedback
- No intermediary selection states

### ✅ **Dual Gap System**
```javascript
// MUST KEEP both gaps
const placeholder = createPlaceholder(); // Where tile was
const insertion = createInsertionGap(); // Where tile goes
```

### ✅ **Free Movement**
- Tiles can move anywhere on board
- Rack-to-board movement
- Board-to-board movement
- Board-to-rack returns

### ✅ **Instant Feedback**
- No delays in visual updates
- Immediate gap creation
- Real-time position updates

### ✅ **Horizontal Layout**
- Tiles arranged left-to-right
- Gaps appear inline with tiles
- No vertical expansion

## Summary: What to Take vs What to Leave

### ✅ **TAKE from WikiDates:**
- Smooth CSS transitions (but horizontal, not vertical)
- Animation timing (0.3-0.5s feels natural)
- Debouncing concept (prevent jitter)
- Visual polish (subtle animations)

### ❌ **LEAVE in WikiDates:**
- Scroll-based interaction
- Single gap system
- Click-to-place
- Viewport-center detection
- Vertical expansion
- Auto-placement
- Delayed feedback
- Rotated text labels

## The Core Principle

**WikiDates** is about **sequential placement** in a **linear timeline**:
- One card at a time
- One valid position
- Scroll to select
- Click to confirm

**WikiLetters** is about **strategic arrangement** in **2D space**:
- Multiple tiles in play
- Many valid positions
- Drag to explore
- Drop to commit

These fundamental differences mean WikiLetters should adopt WikiDates' **animation quality** but NOT its **interaction model**.