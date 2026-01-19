# Starting Screen Design

## Overview

Add a starting screen that appears when returning to the game after 24+ hours. Frequent players skip straight to gameplay; returning players get a moment to reorient.

## UX Flow

```
Page Load
    │
    ▼
┌─────────────────────────┐
│ lastPlayTime exists?    │
└─────────────────────────┘
    │           │
   Yes          No
    │           │
    ▼           ▼
┌─────────────┐    Show Starting Screen
│ < 24 hours? │    (New player)
└─────────────┘
    │       │
   Yes      No
    │       │
    ▼       ▼
Go to     Show Starting Screen
Game      (Returning player)
```

## Starting Screen Layout

```
┌─────────────────────────────┐
│       ROGUELETTERS          │
│                             │
│   ▶ Continue Run            │
│     Set 2, Round 1 • $12    │
│                             │
│   ○ New Run                 │
│                             │
│   ⚙ Settings                │
│                             │
└─────────────────────────────┘
```

### Elements

1. **Title** - Game logo/name
2. **Continue Run** (if run exists)
   - Shows current progress: Set X, Round Y
   - Shows coins: $N
   - Primary button styling
3. **New Run**
   - Secondary styling if run exists
   - Primary if no run exists
   - Warns if abandoning existing run
4. **Settings** - Opens settings modal

## Implementation Details

### Time Tracking

```javascript
// On any turn submission or significant action:
localStorage.setItem('lastPlayTime', Date.now());

// On page load:
const lastPlay = localStorage.getItem('lastPlayTime');
const threshold = 24 * 60 * 60 * 1000; // 24 hours in ms

if (!lastPlay || (Date.now() - parseInt(lastPlay)) > threshold) {
    showStartingScreen();
} else {
    resumeGame();
}
```

### Run State Display

Pull from existing `runState`:
- `runState.set` → "Set X"
- `runState.round` → "Round Y"
- `runState.coins` → "$N"
- Check `localStorage.getItem('rogueletters_run')` for existence

### Button Actions

- **Continue Run**: Hide starting screen, resume game (current behavior)
- **New Run**:
  - If run exists: Confirm "Abandon current run?"
  - Reset run state, start fresh
- **Settings**: Open settings modal (already implemented)

## Phase 4 Extensions

When Phase 4 arrives, this screen gains:
- Gem balance display (top corner)
- Gem Shop button
- Run history/stats
- Unlocks showcase

## Files to Modify

- `index.html` - Add starting screen HTML
- `styles.css` - Starting screen styles
- `script.js` - Show/hide logic, time tracking

## Testing

1. Clear localStorage, load page → should see starting screen
2. Play a turn, reload within minutes → should go to game
3. Set lastPlayTime to 25 hours ago, reload → should see starting screen
4. Continue Run → resumes game
5. New Run with existing run → shows confirmation
