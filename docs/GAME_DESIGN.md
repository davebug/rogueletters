# Daily Letters Game - Design Document

## Game Overview

A single-player daily word puzzle game inspired by classic word tile games, where all players worldwide receive the same puzzle each day based on the date as a random seed.

### Core Concept
- **Daily Challenge**: One puzzle per day, same for all players globally
- **Seeded Randomization**: Uses date stamp as seed (following WikiDates/WikiBirthdays pattern)
- **Solo Play**: Single-player experience focused on maximizing score
- **Limited Turns**: 5 turns per game (may evolve from initial design)

## Game Mechanics

### Starting State
- **Board**: 15x15 grid matching classic word game dimensions
- **Initial Word**: Random word placed on board (generated from seed)
- **Player Tiles**: 7 letter tiles in hand
- **Turn Limit**: 5 turns to maximize score

### Gameplay Loop
1. Player receives 7 tiles at start
2. Board displays a pre-placed starting word
3. Player forms words using tiles, connecting to existing words
4. Valid words are checked against dictionary
5. Score calculated based on letter values and board multipliers
6. New tiles drawn to refill hand (up to 7)
7. Repeat for 5 turns
8. Final score displayed with sharing capability

### Winning Conditions
- No win/lose state - goal is to maximize score
- Compare scores with friends via share feature
- Potential for statistics tracking (average score, personal best)

## Board Specifications

### Dimensions
- 15x15 grid (225 squares total)
- Matches standard word game board

### Special Squares (Classic Layout)
- **Triple Word Score (TWS)**: Corner squares and center edges
  - Positions: (0,0), (0,7), (0,14), (7,0), (7,14), (14,0), (14,7), (14,14)
- **Double Word Score (DWS)**: Diagonal patterns from center
  - 17 total squares in standard pattern
- **Triple Letter Score (TLS)**:
  - 12 squares in specific pattern
- **Double Letter Score (DLS)**:
  - 24 squares distributed across board
- **Center Square**: Starting position (7,7) - typically DWS

## Letter Tiles

### Distribution (Following Scrabble)
```
A×9, B×2, C×2, D×4, E×12, F×2, G×3, H×2, I×9, J×1, K×1, L×4, M×2,
N×6, O×8, P×2, Q×1, R×6, S×4, T×6, U×4, V×2, W×2, X×1, Y×2, Z×1
Blank×2 (can be any letter, worth 0 points)
Total: 100 tiles
```

### Point Values (Scrabble Standard)
```
1 point: A, E, I, O, U, L, N, S, T, R
2 points: D, G
3 points: B, C, M, P
4 points: F, H, V, W, Y
5 points: K
8 points: J, X
10 points: Q, Z
0 points: Blank
```

## Scoring System

### Base Scoring
- Letter values as specified above
- Word multipliers apply to entire word score
- Letter multipliers apply before word multipliers
- Multipliers only count on the turn the tile is placed

### Bonus Scoring
- Using all 7 tiles: +50 points (Scrabble "bingo" rule)
- Potential daily challenges for bonus points

## Daily Seed System

### Seed Generation
```javascript
// Following WikiDates pattern
const today = new Date();
const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
const seed = hashFunction(dateString);
```

### Seeded Elements
1. Starting word selection
2. Initial tile draw
3. Subsequent tile draws (predetermined sequence)
4. Board orientation of starting word

### Consistency Requirements
- Same seed produces identical game for all players
- Timezone handling to ensure global synchronization
- Seed changes at midnight UTC

## Technical Requirements

### Dictionary
- **Requirements**:
  - Free/open-source
  - Locally hostable for speed
  - Comprehensive word list
  - Fast lookup performance
  - Compact file size

- **Options to Investigate**:
  - ENABLE (Enhanced North American Benchmark Lexicon)
  - SOWPODS (Scrabble tournament word list)
  - TWL (Tournament Word List)
  - Open-source alternatives (Aspell, Hunspell dictionaries)

### Frontend Technologies
- HTML5/CSS3/JavaScript
- No framework initially (vanilla JS)
- Canvas or CSS Grid for board rendering
- Local storage for game state
- Share API for results sharing

### Backend Requirements
- Minimal backend (CGI Python following wiki games pattern)
- Dictionary validation
- Daily seed generation
- Statistics tracking (optional phase 2)

## User Interface

### Board Display
- Visual grid with clear square boundaries
- Color coding for special squares
- Clear letter display with point values
- Highlight valid placement areas
- Show connecting words

### Player Controls
- Drag-and-drop or click-to-place tiles
- Tile rack at bottom of screen
- Submit word button
- Undo/reset turn option
- Shuffle rack option

### Information Display
- Current score
- Turn counter (X of 5)
- Timer (optional)
- Word validation feedback
- Best word of the day (optional)

## Development Phases

### Phase 1: Core Game
- Basic board and tile rendering
- Dictionary integration
- Word validation logic
- Scoring system
- Daily seed implementation

### Phase 2: Polish
- Animations and transitions
- Sound effects (optional)
- Tutorial/help system
- Mobile responsiveness
- Share functionality

### Phase 3: Enhanced Features
- Statistics tracking
- Leaderboards (anonymous)
- Achievements/streaks
- Historical puzzles (premium?)
- Difficulty modes

## Considerations for Evolution

### Potential Modifications
1. **Smaller Board**: 11x11 or 9x9 for quicker games
2. **Turn Variations**: 3, 5, or 7 turns based on testing
3. **Tile Count**: Fewer tiles (5 or 6) for increased difficulty
4. **Special Tiles**: Power-ups or special abilities
5. **Theme Days**: Special rules on weekends/holidays

### Balancing Factors
- Game duration (target: 5-10 minutes)
- Difficulty curve
- Replayability without repetition
- Score ranges for satisfaction
- Mobile vs desktop experience

## Success Metrics

### Player Engagement
- Daily active users
- Completion rate
- Share rate
- Return player percentage

### Game Quality
- Average game duration
- Score distribution
- Word variety
- Dictionary hit rate

## Open Questions

1. How to handle the starting word placement? Center? Random position?
2. Should blank tiles be included in a 5-turn game?
3. How to prevent "solving" via brute force?
4. Should there be a hint system?
5. How to handle invalid word feedback?
6. Offline play capability?
7. How to generate starting words fairly?