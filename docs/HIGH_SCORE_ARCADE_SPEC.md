# Arcade-Style High Score Board Specification

## Concept: Classic Arcade High Scores

Like old-school video games where you enter your initials if you make the top 10!

## Core Features

### 1. Daily Top 10 Board
```
    DAILY HIGH SCORES - March 15, 2024

    1. AAA ......... 487 pts  [👁️ View]
    2. DJR ......... 465 pts  [👁️ View]
    3. MAX ......... 441 pts  [👁️ View]
    4. KEL ......... 429 pts  [👁️ View]
    5. BOB ......... 412 pts  [👁️ View]
    6. JEN ......... 398 pts  [👁️ View]
    7. TOM ......... 387 pts  [👁️ View]
    8. SAM ......... 374 pts  [👁️ View]
    9. LEO ......... 361 pts  [👁️ View]
   10. ZOE ......... 349 pts  [👁️ View]
```

### 2. Name Entry Screen (If You Qualify)
```
    🎉 NEW HIGH SCORE! 🎉

    You scored: 432 points
    You ranked: #4

    Enter your name:
    [_][_][_]

    [A B C D E F G H I J K L M]
    [N O P Q R S T U V W X Y Z]

    [SUBMIT]
```

### 3. Board Replay Feature
When clicking [View] next to a high score:
- Shows the exact final board state
- Displays all words they played
- Shows turn-by-turn breakdown
- "This is how DJR scored 465 points"

## Implementation Details

### Data Structure
```json
{
  "date": "2024-03-15",
  "highScores": [
    {
      "rank": 1,
      "name": "AAA",
      "score": 487,
      "boardState": [
        ["H","O","U","S","E","","","","","","","","","",""],
        ["","","","T","","","","","","","","","","",""],
        // ... full 15x15 board
      ],
      "wordsPlayed": [
        {"word": "STONE", "turn": 1, "score": 45},
        {"word": "QUIET", "turn": 2, "score": 67},
        {"word": "JUMPING", "turn": 3, "score": 89},
        {"word": "MIXED", "turn": 4, "score": 54},
        {"word": "ZEBRA", "turn": 5, "score": 71}
      ],
      "timestamp": "2024-03-15T09:23:45Z",
      "id": "hash_abc123"  // For replay lookup
    }
  ]
}
```

### UI Flow

#### After Game Completion
```javascript
function checkHighScore(finalScore) {
    // Get today's high scores
    const highScores = await getHighScores(todayDate);

    if (qualifiesForBoard(finalScore, highScores)) {
        showNameEntry(finalScore, getRank(finalScore, highScores));
    } else {
        showGameOver(finalScore);
        showHighScoresButton();  // Can still view the leaders
    }
}

function qualifiesForBoard(score, highScores) {
    return highScores.length < 10 || score > highScores[9].score;
}
```

#### Name Entry Interface
```javascript
function showNameEntry(score, rank) {
    const modal = `
        <div class="high-score-entry">
            <h2>🎉 HIGH SCORE #${rank}! 🎉</h2>
            <p>Your Score: ${score}</p>

            <div class="name-input">
                <input maxlength="1" id="char1" />
                <input maxlength="1" id="char2" />
                <input maxlength="1" id="char3" />
            </div>

            <div class="letter-grid">
                ${generateLetterButtons()}
            </div>

            <button onclick="submitHighScore()">SUBMIT</button>
            <button onclick="skipHighScore()">SKIP</button>
        </div>
    `;
}
```

#### Board Replay Viewer
```javascript
function viewHighScore(scoreId) {
    const scoreData = await getScoreDetails(scoreId);

    // Show their final board
    displayBoard(scoreData.boardState);

    // Show word list
    showWordList(scoreData.wordsPlayed);

    // Show stats
    showStats({
        totalScore: scoreData.score,
        avgPerTurn: scoreData.score / 5,
        bestWord: getBestWord(scoreData.wordsPlayed)
    });
}
```

## Storage Requirements

### Per High Score Entry
- Name: 3 bytes
- Score: 2 bytes (up to 65535)
- Board state: ~450 bytes (15x15 grid)
- Words played: ~100 bytes
- Metadata: ~50 bytes
- **Total**: ~600 bytes per entry

### Daily Storage
- 10 high scores × 600 bytes = 6KB
- Very manageable with JSON files!

## Privacy & Moderation

### Name Entry Rules
- 3 characters only (classic arcade style)
- Letters A-Z only
- No profanity filter needed (too short)
- Optional: Numbers allowed? Special chars?

### Anti-Abuse
- One submission per game
- No editing after submission
- Rate limiting (max 10 games/hour per IP?)
- No way to delete others' scores

## Enhanced Features (Future)

### All-Time Hall of Fame
```
    ALL-TIME HIGH SCORES

    1. MAX ... 623 pts ... Dec 25, 2023
    2. ACE ... 598 pts ... Jan 1, 2024
    3. PRO ... 587 pts ... Feb 14, 2024
```

### Statistics
- "AAA has the high score on 47 different days"
- "Most competitive day: March 15 (avg top-10: 425)"
- "Your personal best: 387 (Rank #8 on Feb 2)"

### Achievements
- "High Score Hero" - Make the board
- "Perfect 10" - Get exactly 10th place
- "Triple Crown" - High score 3 days in a row

## Implementation Approach

### Phase 1: Basic High Score Board
1. Store top 10 per day
2. Simple 3-letter name entry
3. Display board after game
4. No replay feature yet

### Phase 2: Add Replay Feature
1. Store full board state
2. Create replay viewer
3. Show word breakdown

### Phase 3: Enhanced Features
1. All-time records
2. Player statistics
3. Achievements

## File Storage Structure
```
/data/highscores/
├── 2024-03-15.json  # Daily high scores
├── 2024-03-16.json
├── ...
└── alltime.json     # Hall of fame
```

## Benefits Over Anonymous Leaderboard

1. **More Personal**: "That's MY name up there!"
2. **More Social**: "Hey BOB, nice score!"
3. **Learning Tool**: "How did AAA get 487?"
4. **Motivation**: "Just 20 more points to beat TOM"
5. **Classic Feel**: Nostalgic arcade vibes

## Questions

1. **Character Limit**: 3 letters (classic) or allow more?
2. **Character Set**: Just A-Z? Numbers? Symbols?
3. **Board Size**: Top 10? Top 5? Top 20?
4. **Replay Privacy**: Is it ok to show everyone's boards?
5. **Name Uniqueness**: Can multiple people be "AAA"?
6. **Edit/Delete**: Can players remove their scores?