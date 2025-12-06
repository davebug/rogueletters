# Missing Features - Daily Letters

Based on player testing conducted on 2025-01-20, this document outlines features that players expect but are currently missing from the game.

## Priority 1: Essential Features (Game Breaking)

### 1. Tile Recall/Pickup
**Current:** Once a tile is placed on the board, it cannot be moved or picked up
**Expected:** Click on a placed tile to return it to the rack
**Implementation:**
- Add click handler to placed tiles (`.board-cell .tile`)
- Check if tile was placed this turn (not part of starting word or previous turns)
- Return tile to rack and update game state
- Maintain original rack position if possible

### 2. Turn Counter Display
**Current:** No indication of which turn the player is on
**Expected:** Clear display showing "Turn X of 5"
**Implementation:**
- Add `<div id="turn-counter">Turn 1 of 5</div>` to UI
- Update after each successful word submission
- Style prominently near score display

### 3. Clear Visual Feedback for Invalid Placements
**Current:** No indication when hovering over invalid placement spots
**Expected:** Visual cue that a spot is invalid for tile placement
**Implementation:**
- Add CSS class `.invalid-placement` with red border or overlay
- Change cursor to `not-allowed` over invalid spots
- Apply when:
  - Cell is occupied
  - Cell would create disconnected word
  - Cell would violate placement rules

## Priority 2: Quality of Life Features

### 4. Shuffle Rack Button
**Current:** Tiles appear in fixed order, cannot be rearranged
**Expected:** Button to randomly shuffle tile order in rack
**Implementation:**
- Add "Shuffle" button below tile rack
- Fisher-Yates shuffle algorithm for randomization
- Maintain tile selection state if a tile is selected
- Keyboard shortcut: 'S' key

### 5. Undo Last Placement
**Current:** No way to undo the last tile placement
**Expected:** Undo button or keyboard shortcut to reverse last action
**Implementation:**
- Maintain placement history stack
- Add "Undo" button in controls
- Keyboard shortcuts: Ctrl+Z (Windows/Linux), Cmd+Z (Mac)
- Only allow undo for current turn's placements

### 6. Tile Rack Rearrangement
**Current:** Cannot reorder tiles in rack
**Expected:** Drag tiles to reorder them in rack
**Implementation:**
- Add drag-and-drop handlers to rack tiles
- Visual feedback during drag (ghost image, insertion point)
- Alternative: Click two tiles to swap positions
- Mobile: Long-press to enable reorder mode

### 7. Retry Button Visibility
**Current:** Retry button exists but not always visible/clear
**Expected:** Clear "Retry" button when retries are available
**Implementation:**
- Show remaining retries: "Retry (3 left)"
- Disable when no retries remain
- Visual emphasis (color change) when needed

## Priority 3: Enhanced User Experience

### 8. Keyboard Navigation
**Current:** No keyboard controls
**Expected:** Full keyboard navigation for accessibility
**Implementation:**
```
Number keys (1-7): Select tile from rack
Arrow keys: Navigate board when tile selected
Enter/Space: Place tile at current position
Escape: Deselect tile / Cancel placement
R: Recall all tiles
S: Shuffle rack
Ctrl/Cmd+Z: Undo
Tab: Navigate between UI elements
```

### 9. Tile Exchange Feature
**Current:** No way to exchange unwanted tiles
**Expected:** Option to skip turn and exchange tiles
**Implementation:**
- "Exchange" button (uses one turn)
- Select tiles to exchange (click to mark)
- Confirm exchange (returns tiles to bag, draws new ones)
- Track in game statistics

### 10. Help/Instructions Panel
**Current:** No in-game help
**Expected:** Accessible game rules and controls
**Implementation:**
- "?" or "Help" button in corner
- Modal overlay with:
  - Basic rules
  - Scoring explanation
  - Keyboard shortcuts
  - Tips and strategies

### 11. Game Timer
**Current:** No time tracking
**Expected:** Optional timer for speedrun challenges
**Implementation:**
- Display elapsed time
- Store best times in localStorage
- Optional countdown mode
- Pause functionality

### 12. Sound Effects Toggle
**Current:** No audio
**Expected:** Optional sound effects
**Implementation:**
- Tile placement sound
- Word validation (success/fail)
- Turn complete
- Game over
- Mute/unmute toggle

### 13. Theme Toggle
**Current:** Single theme
**Expected:** Light/dark mode toggle
**Implementation:**
- CSS variables for colors
- localStorage preference
- System preference detection
- Smooth transition animation

## Priority 4: Advanced Features

### 14. Drag and Drop Tiles
**Current:** Click to select, click to place
**Expected:** Drag tiles directly from rack to board
**Implementation:**
- HTML5 drag/drop API
- Touch events for mobile
- Visual feedback (tile follows cursor)
- Snap to grid
- Cancel on invalid drop

### 15. Word Preview
**Current:** Cannot see what word will be formed
**Expected:** Preview of complete word before submission
**Implementation:**
- Highlight all letters that form the word
- Show point value preview
- Indicate if word is valid (green) or invalid (red)

### 16. Placement Hints
**Current:** No guidance on valid placement spots
**Expected:** Highlight valid placement areas when tile selected
**Implementation:**
- Subtle highlight on all valid cells
- Stronger highlight on high-scoring positions
- Optional toggle for experienced players

### 17. Statistics Tracking
**Current:** Only tracks high score
**Expected:** Comprehensive statistics
**Implementation:**
- Average score
- Best word ever played
- Total games played
- Win/loss ratio (if target scores added)
- Favorite starting strategies

## Implementation Order

1. **Phase 1 (Critical):** Features 1-3
   - Tile recall
   - Turn counter
   - Invalid placement feedback

2. **Phase 2 (Core QoL):** Features 4-7
   - Shuffle button
   - Undo functionality
   - Rack rearrangement
   - Retry button visibility

3. **Phase 3 (Polish):** Features 8-13
   - Keyboard controls
   - Exchange tiles
   - Help panel
   - Timer
   - Sound
   - Themes

4. **Phase 4 (Enhanced):** Features 14-17
   - Drag and drop
   - Word preview
   - Hints
   - Statistics

## Technical Considerations

### State Management
- Need to track tile placement history for undo
- Separate "placed this turn" vs "committed" tiles
- Rack state must be reversible

### Mobile Responsiveness
- Touch-friendly tile sizing
- Gesture support for drag/drop
- Responsive button placement

### Performance
- Efficient DOM manipulation for tile movement
- Debounce hover events for placement feedback
- Optimize validation calls

### Accessibility
- Keyboard navigation is essential
- Screen reader support
- High contrast mode option
- Focus indicators

## Testing Requirements

- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile device testing (iOS, Android)
- Keyboard-only navigation testing
- Screen reader compatibility
- Performance testing with multiple tiles placed