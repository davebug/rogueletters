# WikiLetters - Bugs to Fix

## 🔴 HIGH PRIORITY: WikiDates-Style Popup Implementation
**Priority**: HIGH - This is the next major feature to implement
**Status**: Documented and ready for implementation
**Details**: See `/docs/POPUP_IMPLEMENTATION_PLAN.md` for full implementation guide

### Overview
- Replace full-screen game over with overlay popup (like WikiDates)
- Keep game board visible behind semi-transparent overlay
- Integrate all end-game features into popup (high scores, sharing, etc.)
- Add dynamic encouraging messages based on score
- Allow dismissing popup to review completed board

### Benefits
- Much better UX - less jarring transition
- Players can review their completed board
- More modern, polished feel matching WikiDates
- All features in one unified interface

**Time Estimate**: 6-10 hours
**Next Step**: Begin Phase 1 (HTML structure) when starting this feature

---

## Drag and Drop Issues with Special Squares

### Bug 1: Board-to-Board Dragging with Multipliers
**Issue**: When dragging a tile from one board position to another board position that has a multiplier (DW, TW, DL, TL):
- The multiplier text doesn't get properly hidden/replaced
- The multiplier text appears offset to the side of the tile
- **Expected**: Multiplier should be hidden when tile is placed on it
- **Current**: Works correctly when dragging from rack to multiplier square, but not board-to-board

### Bug 2: Multiplier Not Restored When Tile Removed
**Issue**: When dragging a tile OFF of a colored special square (pink DW, blue TW, etc.):
- The multiplier text (DW, TW, DL, TL) is not restored
- The square remains colored but without its label
- **Expected**: When tile is removed, the multiplier label should reappear
- **Current**: The special square loses its label permanently until page refresh

### Related Code Areas to Check
- `handleDrop()` function in script.js
- `placeTile()` function - how it handles existing board tiles
- `returnTileToRack()` function - should restore multiplier text
- CSS classes for special squares and their text display

### Test Cases Needed
1. Drag from rack → multiplier square (currently works ✓)
2. Drag from board → multiplier square (broken)
3. Drag from multiplier square → rack (multiplier not restored)
4. Drag from multiplier square → another square (multiplier not restored)

## Drag and Drop Enhancement - Smart Tile Placement

### Find Nearest Available Square on Drop
**Current**: If a tile is dropped on an occupied square, it returns to the rack
**Desired**: Tile should find the nearest available (empty) square and place there
**Implementation Ideas**:
- On drop, if target square is occupied, search for nearest empty square
- Use a spiral/radial search pattern from the drop point
- Calculate distance to all empty squares and choose the closest
- Animate the tile sliding to the chosen position for visual feedback
- Only return to rack if NO empty squares exist on the board

### Algorithm Approach
1. Get coordinates of attempted drop location
2. If occupied, get list of all empty squares
3. Calculate Euclidean distance from drop point to each empty square
4. Sort by distance and place tile in nearest empty square
5. Consider adding visual feedback (highlight chosen square briefly)

### Edge Cases
- What if all board squares are occupied?
- Should it prefer adjacent squares to existing tiles for valid word formation?
- Consider special squares (multipliers) - should they have priority?

## UI Layout Changes

### Move Potential Words Sidebar
**Current**: Potential Words list is in the right sidebar
**Desired**: Move to the right side of the board (needs clarification - already on right?)
**Tasks**:
- Review current layout and positioning
- Possibly restructure the three-column layout
- Ensure responsive design still works

### Relocate Submit Button
**Current**: Submit button appears below the board when tiles are placed
**Desired**: Move submit button below the Potential Words list
**Tasks**:
- Move submit-container div to right sidebar
- Adjust styling to fit within sidebar width
- Maintain fade in/out animation behavior
- Test button accessibility on mobile

### Related Files to Modify
- `index.html` - HTML structure changes
- `styles.css` - Layout and positioning updates
- `script.js` - May need to update element selectors if IDs change

## Visual Bug - Off-Color Rectangle Above Board

### Remove/Fix Discolored Area Above Game Board
**Current**: There's a slightly off-color rectangle visible above the board
**Location**: Where the Wikipedia context block was previously displayed
**Likely Cause**: The `#wikipedia-context` div is hidden but may still have background color or padding
**Tasks**:
- Inspect `#wikipedia-context` element and its styling
- Either fully remove the element or ensure it has no visual presence when hidden
- Check for any padding/margin on parent containers that might be showing through
- Verify no background color is applied when `display: none`

### Related Code
- `index.html` - Lines 60-65 (Wikipedia context block)
- `styles.css` - Any styles for `.wiki-context` or `#wikipedia-context`
- Remove or properly hide the Wikipedia context area

## Score Display Issue

### Hide "= 0" Until First Word Submitted
**Current**: The total score display ("= 0") shows immediately next to the 5 turn squares
**Desired**: Hide the "= 0" display until the first word is submitted
**Tasks**:
- Initially hide the `.total-score-display` element
- Show it only after `gameState.score > 0` (first word submitted)
- Apply fade in animation when it first appears
- Update the score value as normal once visible

### Implementation Notes
- Add initial `display: none` or `opacity: 0` to `.total-score-display`
- Update score display logic in `updateFooterSquares()` or `nextTurn()`
- Ensure it appears smoothly with the same fade animation as other UI elements

---
*Documented: 2025-09-21*
*To be fixed in next session*

# BETA LAUNCH CHECKLIST - Target: dates.wiki/letters

## Critical Fixes (Must Have for Beta)
- [ ] Fix drag-and-drop bugs with special squares (multipliers)
- [ ] Remove off-color rectangle above board (Wikipedia context remnant)
- [ ] Hide "= 0" score display until first word submitted

## Mobile Viewport Optimization (Major Challenge)

### Keep Full Game Visible Without Scrolling
**The Challenge**: Fit entire game on mobile screen without scrolling
- 15x15 board (225 squares) must stay legible
- Tile rack needs to be accessible
- Potential words list must be visible
- Score display needs to show
- Submit button must be reachable
- All within one viewport height

**Potential Solutions**:
1. **Dynamic board scaling**: Use viewport units to size board
   - Calculate maximum board size that fits: `min(100vw, calc(100vh - rack - header))`
   - Tiles scale proportionally

2. **Collapsible UI elements**:
   - Potential words as slide-out drawer
   - Expandable/collapsible rack

3. **Layout restructuring for mobile**:
   - Stack vertically vs three columns
   - Overlay patterns for secondary elements

4. **Touch optimizations**:
   - Pinch-to-zoom on board only (not whole page)
   - Tap to select, tap to place (instead of drag)

5. **Orientation-specific layouts**:
   - Portrait: Compact vertical stacking
   - Landscape: Use horizontal space better

**Implementation Notes**:
- Test on iPhone SE (375×667) as minimum target
- Use CSS Grid with `minmax()` for responsive sizing
- Consider `position: fixed` for rack and controls
- May need to reduce tile size significantly (currently 40px on desktop)

## Nice to Have (Can be post-beta)
- [ ] Smart tile placement (find nearest empty square)
- [ ] Move submit button to right sidebar
- [ ] Review Potential Words sidebar positioning
- [ ] Drag and drop reordering of tiles within the rack
  - Allow players to rearrange tile order in rack for easier word planning
  - Similar to traditional word game rack organization
  - Would need to handle drop zones between tiles

## Pre-Launch Testing
- [ ] Full gameplay test - complete 5 turn game
- [ ] Test on multiple browsers (Chrome, Safari, Firefox)
- [ ] Mobile responsiveness check
- [ ] Verify all animations and transitions work
- [ ] Test word validation with backend
- [ ] Verify scoring system accuracy

## Deployment Steps
- [ ] Set up deployment scripts similar to other WikiGames
- [ ] Configure Apache/Docker for dates.wiki/letters
- [ ] Update any API endpoints for production
- [ ] Test production deployment
- [ ] Verify SSL certificate works for subdomain

## Final Polish
- [ ] Remove debug mode from production
- [ ] Ensure Google Analytics is properly configured
- [ ] Test share functionality
- [ ] Verify daily word generation works correctly

**Target: Fully playable beta at dates.wiki/letters by end of day tomorrow**