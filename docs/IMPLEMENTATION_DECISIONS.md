# Implementation Decisions - Based on WikiDates/WikiBirthdays Patterns

## URL and Date Handling (Following Wiki Games Pattern)

### URL Structure
```javascript
// WikiDates/WikiBirthdays pattern:
// Default: https://domain.com/ (today's game)
// Specific date: https://domain.com/?seed=20240315
// Seed format: YYYYMMDD (8 digits)

function getSeed() {
    let seed = getURLParameter('seed');
    if (!seed || !formatSeedAsDate(seed)) {
        const today = new Date();
        seed = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
        setURLParameter(seed);
    }
    return seed;
}
```

### Date Display
- Show formatted date: "March 15" (month and day only, no year shown)
- Add [Today] link if viewing past puzzle
- No game number - the date IS the identifier

## Share Functionality (Following Wiki Pattern)

### Share Format
```
Daily Letters for March 15:
🟥🟧🟨🟩🟦
Score: 247
https://letters.domain.com/?seed=20240315
```

### Share Implementation
- Share icon appears after game completion
- Click to copy to clipboard
- Show "Score copied to clipboard!" confirmation
- Text reverts after 2 seconds

## Game Flow Decisions

### Initial Load
1. **Loading State**: Show "Loading…" in date display (like WikiDates)
2. **Rack Order**: Tiles displayed as drawn (random order)
3. **No Shuffle Button**: Keep it simple, tiles stay as dealt

### Tile Placement
1. **Placement Method**: Click tile to select, click board to place
2. **Tentative Placement**: Tiles appear semi-transparent until submitted
3. **Undo Functionality**: Click placed tile to return to rack
4. **Score Preview**: Show potential score before submission

### Word Validation
1. **Visual Feedback**:
   - Submitting: Disable button, show spinner
   - Valid: Flash green, add score with animation
   - Invalid: Shake tiles, show error message below board
2. **Retry Counter**: Show only after first failure: "9 retries remaining"
3. **Cross-word Validation**: All formed words must be valid

### Score Display
1. **Running Total**: Large score at top
2. **Turn Score**: "+23" animation when word submitted
3. **No Detailed Breakdown**: Keep it simple
4. **Bingo Bonus**: Special "BINGO! +50" animation

### Game End
1. **Completion Screen**: Modal popup (like WikiDates/WikiBirthdays)
2. **Content**:
   - "Puzzle Complete!"
   - Final score
   - Rank: "#45 of 234 players today"
   - Share button
3. **Board Review**: Keep board visible behind modal

## Mobile Interaction Decisions

### Touch Controls
- **Primary**: Tap tile, then tap board square
- **Alternative**: Touch-and-drag for power users
- **Board Zoom**: Pinch to zoom, auto-center on placement
- **Rack Position**: Fixed bottom, doesn't scroll

## Visual Feedback Decisions

### Board Indicators
- **Valid Placement**: Light green highlight on hover
- **Invalid Placement**: Red outline if breaking rules
- **Used Multipliers**: Fade to gray after use
- **Current Word**: Yellow highlight for tiles being placed

### Animations
- **Tile Draw**: Slide into rack (200ms)
- **Score Addition**: Number rolls up (300ms)
- **Word Valid**: Green pulse (200ms)
- **Bingo**: Confetti burst (CSS only)

## State Management

### Auto-save Triggers
- After each valid word submission
- Not after individual tile placements
- Include full board state and tile positions

### Resume Behavior
- No "Welcome back" message - just restore state
- If date changed, start new game
- Clear button shows confirmation: "Start new game? Current progress will be lost."

## Edge Cases Handling

### No Valid Moves
- Extremely rare with 7 tiles and 5 turns
- If occurs: "No valid moves available. Game over."
- Still submit score

### Network Issues
- Cache dictionary locally after first load
- Queue score submission for reconnection
- Show "Playing offline" indicator

### Midnight Crossing
- Game continues with current date
- New games after midnight use new date
- No forced refresh

## UI Elements to Implement

### Header
```
Daily Letters                    [?]
March 15                      [Today]
```

### Game Info Bar
```
Score: 247        Turn 3 of 5
```

### Error Messages
- Invalid word: "Not a valid word" (inline, red)
- Network error: "Connection lost. Playing offline."
- No retries: "No retries remaining"

### Footer
- Feedback squares (5 colored based on turn scores)
- Share icon (appears on completion)
- Copyright and links (matching other games)

## What We DON'T Need (Simplification)

1. **No Settings Menu**: No preferences to configure
2. **No Tutorial on First Load**: Help button available if needed
3. **No Sound Effects**: Visual feedback only
4. **No Statistics Display**: Just current game
5. **No Detailed Score Breakdown**: Total score only
6. **No Timer Display**: Untimed gameplay
7. **No Leaderboard Button**: Auto-submit, show rank in completion popup
8. **No Previous/Next Day Arrows**: Change date via URL only

## Implementation Priority

### Phase 1 (Core Game)
1. Board rendering and tile display
2. Basic tile placement
3. Word validation
4. Score calculation
5. 5-turn gameplay

### Phase 2 (Polish)
1. Date-based seeding
2. Share functionality
3. Animations and feedback
4. Mobile optimization
5. Game state persistence

### Phase 3 (Social)
1. Anonymous leaderboard
2. Rank display
3. Visual celebrations
4. Historical puzzle access

## CSS Classes to Match Wiki Games

```css
.hidden { display: none; }
.accent { color: var(--accent-color); }
.feedback-square { /* colored squares */ }
.correct { background: green; }
.incorrect { background: red; }
.pop { /* animation for emphasis */ }
```

## Testing Checklist

- [ ] Date changes at midnight UTC
- [ ] Share format copies correctly
- [ ] Game state persists through refresh
- [ ] Mobile touch works smoothly
- [ ] Offline play functions
- [ ] Historical dates accessible
- [ ] Retries count correctly
- [ ] Score calculates accurately
- [ ] All edge cases handled