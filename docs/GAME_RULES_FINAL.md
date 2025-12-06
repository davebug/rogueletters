# Daily Letters Game - Final Rules & Specifications

## Core Game Rules

### Starting Setup
- **First Word**: Automatically placed crossing the center square (7,7)
  - Follows Scrabble rules: horizontal or vertical through center
  - Word is thematically chosen based on the date (historical events, birthdays, etc.)
- **Player Tiles**: 7 tiles drawn from standard distribution
- **No Blank Tiles**: Removed from play for balance in 5-turn game

### Turn Rules
- **5 Turns Maximum**: Each player gets exactly 5 word placements
- **Word Validation Retries**: 10 total retries across all 5 turns
  - Invalid word attempts don't consume a turn
  - After 10 failed validations, subsequent invalid words forfeit the turn
- **No Tile Exchange**: Players must use the tiles they have
- **Tile Replenishment**: Draw back to 7 tiles after each valid word

### Word Formation Rules
- **Minimum Length**: 2 letters
- **Direction**: Horizontal (left-to-right) or vertical (top-to-bottom)
- **Connection Required**: All words after the first must connect to existing tiles
- **All Words Must Be Valid**: Every word formed (including cross-words) must be in dictionary
- **Profanity Filter**: Offensive words are excluded from valid dictionary

### Scoring Rules
- **Letter Values**: Standard Scrabble point values (A=1, Z=10, etc.)
- **Multipliers**:
  - Only apply to newly placed tiles
  - Letter multipliers apply before word multipliers
  - Used multipliers don't apply to future turns
- **Cross-Words**: All perpendicular words formed also score
- **Bingo Bonus**: +50 points for using all 7 tiles in one turn

## Share Feature Specification

### Share Format
```
Daily Letters #42 - March 15, 2024
🟥🟧🟨🟩🟦
Score: 247 (↑12 vs avg)

Play at: letters.domain.com/2024-03-15
```

### Tile Color Coding
The 5 colored tiles represent your 5 turns, with color indicating score level:
- 🟥 Red: Poor score (0-19 points)
- 🟧 Orange: Below average (20-39 points)
- 🟨 Yellow: Average (40-59 points)
- 🟩 Green: Good (60-79 points)
- 🟦 Blue: Excellent (80+ points)

*Note: These thresholds will be adjusted based on actual gameplay data*

### Score Comparison
- Shows difference from player's personal average
- Format: "↑12 vs avg" or "↓5 vs avg"
- New players show just the score until 5+ games played

## Statistics Tracking

### Core Stats (Stored Locally)
```javascript
{
  "currentStreak": 5,
  "maxStreak": 12,
  "totalGamesPlayed": 47,
  "totalScore": 11234,
  "averageScore": 239,
  "lastPlayed": "2024-03-15",
  "gameHistory": [
    {
      "date": "2024-03-15",
      "score": 247,
      "turns": [45, 23, 67, 89, 23],
      "completed": true
    }
  ]
}
```

### Display Stats
- **Current Streak**: Days played consecutively
- **Games Played**: Total lifetime games
- **Average Score**: Running average of all games
- **Today vs Average**: Comparison for motivation

## URL Structure & Navigation

### URL Patterns
- **Today's Game**: `letters.domain.com` or `letters.domain.com/today`
- **Specific Date**: `letters.domain.com/2024-03-15`
- **Any Historical Date**: `letters.domain.com/1999-12-31`
- **Future Dates**: Redirect to today's game

### Date Navigation
- Calendar picker for date selection
- Arrow buttons for previous/next day
- "Today" button to return to current puzzle
- URL updates without page reload

## Game State Persistence

### Local Storage Structure
```javascript
localStorage.setItem('dailyLetters_2024-03-15', {
  "turnNumber": 3,
  "score": 145,
  "board": [...],
  "playerTiles": [...],
  "wordsPlayed": [...],
  "retriesUsed": 4,
  "gameComplete": false,
  "timestamp": "2024-03-15T14:23:45Z"
});
```

### Persistence Rules
- Game state saves after each valid turn
- Refreshing browser restores exact game state
- "New Game" button clears state with confirmation
- Old game states auto-delete after 30 days
- Playing a different date doesn't affect other saved games

## Starting Word Database

### Database Structure
```python
# starting_words.json
{
  "01-01": {  # January 1st
    "words": [
      {"word": "FRESH", "reason": "New Year - Fresh Start", "year": 2024},
      {"word": "BEGIN", "reason": "New Beginnings", "year": 2025},
      {"word": "PARTY", "reason": "New Year's Eve parties", "year": 2026},
      # ... 97 more words for 100 years of puzzles
    ]
  },
  "03-14": {  # March 14th
    "words": [
      {"word": "RATIO", "reason": "Pi Day (3.14...)", "year": 2024},
      {"word": "CIRCLE", "reason": "Pi Day - Circle reference", "year": 2025},
      {"word": "ALBERT", "reason": "Einstein's Birthday", "year": 2026},
      # ... 97 more words
    ]
  },
  # ... all 366 days (including Feb 29)
}
```

### Word Selection Algorithm
```python
def get_starting_word(date):
    """Get starting word for a specific date"""
    month_day = date.strftime("%m-%d")
    year = date.year

    # Calculate which word to use (cycles every 100 years)
    word_index = (year - 2024) % 100

    word_data = starting_words[month_day]["words"][word_index]
    return word_data["word"]
```

### Wikipedia Integration for Word Generation
- One-time pull from Wikipedia's "On This Day" pages
- Extract notable events, births, deaths
- Generate thematic 5-7 letter words
- Manual curation for quality and appropriateness
- Store with reasoning for potential display

## Visual Celebrations ("Game Juice")

### Score-Based Celebrations
- **Good Word (40+ points)**: Subtle pulse animation on score
- **Great Word (60+ points)**: Brief firework particles from word
- **Excellent Word (80+ points)**: Screen-edge glow effect
- **Bingo (All 7 tiles)**: Special "BINGO!" badge animation

### Completion Celebrations
- **Game Complete**: Confetti animation
- **New Personal Best**: Gold shimmer effect
- **Streak Milestone** (7, 30, 100 days): Special badge display

### Implementation Notes
- CSS animations only (no JavaScript animations)
- Respect prefers-reduced-motion
- Duration under 1 second
- Non-blocking (player can continue immediately)

## Mobile Experience Priority

### Touch Interactions
- **Tile Selection**: Tap to select, tap board to place
- **Drag Alternative**: Press-hold-drag for tile movement
- **Word Validation**: Large "Submit Word" button
- **Zoom Control**: Pinch-to-zoom on board

### Responsive Design Breakpoints
```css
/* Mobile First Approach */
/* Base: 320px - 767px */
.board {
  width: 100vw;
  max-width: 500px;
}

/* Tablet: 768px - 1023px */
@media (min-width: 768px) {
  .board { max-width: 600px; }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  .board { max-width: 700px; }
}
```

### Mobile-Specific Features
- Board auto-centers on new word placement
- Tile rack at bottom of viewport (fixed position)
- Swipe left/right for date navigation
- Minimize scrolling requirements

## High Score System

### Daily Leaderboard
```javascript
// Stored server-side per date
{
  "date": "2024-03-15",
  "highScores": [
    {"score": 412, "id": "anon_hash_123", "time": "2024-03-15T08:23:45Z"},
    {"score": 398, "id": "anon_hash_456", "time": "2024-03-15T09:15:22Z"},
    {"score": 387, "id": "anon_hash_789", "time": "2024-03-15T07:45:12Z"},
    // ... top 100 scores
  ],
  "totalPlayers": 1523,
  "averageScore": 234,
  "medianScore": 228
}
```

### Privacy & Display
- **Anonymous Submission**: No usernames required
- **Hash-Based Identity**: Browser fingerprint for "your score" highlighting
- **Display Options**:
  - Top 10 scores
  - Your rank (e.g., "247 points - Rank #234 of 1,523")
  - Percentile (e.g., "Top 15% today!")
- **No Account Required**: Pure anonymous competition

### Submission Flow
1. Game complete → Auto-submit score
2. Receive rank and percentile
3. Option to view full leaderboard
4. Share includes rank if in top 100

## Error Handling Specifications

### Network Disconnection
- **During Word Validation**:
  - Cache dictionary locally after first load
  - Fall back to cached dictionary
  - Queue score submission for reconnection

### Server Errors
- **Graceful Degradation**:
  - If word validation fails: Allow play, validate on reconnect
  - If high scores fail: Store locally, sync later
  - If starting word fails: Use date-seeded backup word

### Browser Issues
- **Storage Quota Exceeded**: Clear games older than 30 days
- **Cookies Disabled**: Show warning, game still playable
- **JavaScript Disabled**: Show upgrade message

## Profanity Filter Implementation

### Dictionary Filtering
```python
# profanity_filter.txt - Common offensive words to exclude
# This list will be maintained separately and subtracted from ENABLE

def load_dictionary():
    valid_words = load_enable_dictionary()
    profanity = load_profanity_list()

    # Remove offensive words
    clean_dictionary = valid_words - profanity

    # Also filter starting words
    starting_words = [w for w in starting_words if w not in profanity]

    return clean_dictionary
```

### Sources for Filter
1. Common profanity lists from open source projects
2. Slur databases from content moderation tools
3. Manual additions based on user reports
4. Regular expression patterns for variants

## Tutorial Specification

### Non-Interactive Walkthrough
- **Step 1**: "Welcome to Daily Letters! Each day brings a new puzzle."
- **Step 2**: "You start with a word on the board and 7 letter tiles."
- **Step 3**: Animation of tiles being placed to form "WORLD"
- **Step 4**: Score calculation demonstration
- **Step 5**: "You have 5 turns to score as many points as possible!"
- **Step 6**: "Special squares multiply your score - use them wisely!"
- **Step 7**: "Share your results and compete on the daily leaderboard!"

### Navigation
- Next/Previous buttons
- Skip tutorial option
- Progress dots at bottom
- Auto-advance after 5 seconds (with pause option)

## Development Priorities (MVP)

### Must Have (Week 1-4)
1. ✅ Core game mechanics
2. ✅ Mobile-responsive design
3. ✅ Share functionality
4. ✅ Date-based URL system
5. ✅ Game state persistence
6. ✅ Word validation with retries
7. ✅ No blank tiles, no exchange

### Should Have (Week 5-6)
1. High score leaderboard
2. Visual celebrations
3. Profanity filter
4. Starting word database (initially random from curated list)

### Nice to Have (Post-Launch)
1. Tutorial walkthrough
2. Statistics display
3. Streak tracking
4. Wikipedia-themed starting words
5. Advanced animations