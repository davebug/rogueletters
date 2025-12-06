# Undo Feature Analysis and Lessons Learned

## Overview
We attempted to implement a comprehensive undo feature for WikiLetters but encountered several challenges that made it more complex than anticipated.

## What We Tried

### Attempt 1: Individual Action Tracking
- **Approach**: Record every tile placement, movement, and swap as individual actions
- **Storage**: Each action stored type, tile, from position, to position, and rack order
- **Issues**:
  - Complex state management
  - Required tracking exact rack positions
  - Too granular for user needs

### Attempt 2: Simplified Two-Tier Undo
- **Approach**:
  1. First tap: Recall all unsubmitted tiles (like recall button)
  2. Second tap: Restore to previous turn state
- **Storage**: Compressed board state + rack tiles for each turn
- **Issues**:
  - Board clearing didn't work initially (restoreBoard only added tiles, didn't clear)
  - Fixed by updating restoreBoard to clear empty cells

### Attempt 3: Turn Snapshot System
- **Approach**: Save complete game state at the start of each turn
- **Storage**: Array of snapshots with board, rack, score, turn number, history
- **Issues**:
  - Confusion about when to save snapshots (before vs after submission)
  - Index calculation problems (which snapshot to restore)
  - Timing issues with async tile fetching

## Key Challenges

### 1. Snapshot Timing
- **Problem**: When exactly to capture state?
  - At game load? ✓
  - Before word submission?
  - After word submission?
  - After getting new tiles?
- **Lesson**: Need snapshots at turn START, not turn END

### 2. Snapshot Indexing
- **Problem**: Which snapshot to restore when undoing?
  - If on turn 2, should restore to turn 1's start
  - If on turn 3, should restore to turn 2's start
  - Arrays are 0-indexed but turns are 1-indexed
- **Lesson**: Need careful index calculation (currentTurn - 2)

### 3. State Restoration
- **Problem**: Restoring state must update EVERYTHING:
  - Board tiles (including clearing empty cells)
  - Rack tiles (in correct order)
  - Score and turn scores
  - Turn number
  - Turn history
  - UI elements (buttons, displays)
- **Lesson**: restoreBoard() needed to handle clearing, not just adding

### 4. Async Complexity
- **Problem**: Tiles are fetched asynchronously after word submission
  - Snapshot timing becomes tricky
  - State can be inconsistent during transition
- **Lesson**: Need to carefully coordinate async operations

## What Would Work

A simpler approach might be:
1. **Only allow undo of current turn** (recall tiles functionality)
2. **No multi-turn undo** (avoids snapshot complexity)
3. **Or save full game state after each action** (storage heavy but simple)

## Storage Optimization

We successfully implemented:
- **Compressed board storage**: Only store occupied cells (`{'7,5':'L', '7,6':'E'}`)
- **Efficient snapshots**: ~20-30 entries instead of 225 for board
- **Rack order preservation**: Important for user experience

## Code Remnants to Clean Up

If permanently abandoning undo:
- Remove undo button from UI
- Remove snapshot-related code
- Remove state compression functions (unless useful elsewhere)
- Clean up any debug logging

## Conclusion

The undo feature is more complex than it initially appears due to:
1. Multiple state components that must stay synchronized
2. Async operations that complicate timing
3. User expectations (undo should feel instantaneous and predictable)
4. Edge cases (first turn, last turn, failed submissions)

For now, the existing "recall tiles" and "start over" buttons provide sufficient functionality for most use cases without the complexity of a full undo system.