# Daily Letters Game - Technical Architecture

## System Architecture

### Overview
Following the established patterns from WikiDates and WikiBirthdays, this game will use:
- **Frontend**: Static HTML/CSS/JavaScript
- **Backend**: Python CGI scripts
- **Server**: Apache HTTP Server (httpd:2.4)
- **Containerization**: Docker for development and deployment
- **Deployment**: SSH-based deployment to Unraid

## Seeded Random Generation

### Date-Based Seed Implementation

Following the WikiDates/WikiBirthdays pattern:

```python
import hashlib
from datetime import datetime, timezone

def get_daily_seed():
    """Generate consistent seed for current UTC date"""
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    return int(hashlib.md5(today.encode()).hexdigest(), 16)

def seed_random(date_string=None):
    """Initialize random with date-based seed"""
    if date_string is None:
        date_string = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    seed = int(hashlib.md5(date_string.encode()).hexdigest(), 16)
    random.seed(seed)
    return seed
```

### Seeded Game Elements

```python
class DailyGameGenerator:
    def __init__(self, date_string=None):
        self.seed = seed_random(date_string)
        self.tile_bag = self._initialize_tile_bag()

    def get_starting_word(self):
        """Select starting word from curated list"""
        words = self.load_starting_words()  # 5-7 letter common words
        return random.choice(words)

    def get_starting_position(self, word):
        """Determine placement of starting word"""
        # Always crosses center (7,7)
        if random.choice([True, False]):
            # Horizontal
            start_col = 7 - len(word) // 2
            return (7, start_col, 'horizontal')
        else:
            # Vertical
            start_row = 7 - len(word) // 2
            return (start_row, 7, 'vertical')

    def draw_tiles(self, count=7):
        """Draw tiles from bag (deterministic based on seed)"""
        drawn = []
        for _ in range(min(count, len(self.tile_bag))):
            tile = self.tile_bag.pop()
            drawn.append(tile)
        return drawn
```

## Dictionary System

### Local Dictionary Storage

```python
class DictionaryManager:
    def __init__(self, dict_path='dictionaries/enable.txt'):
        self.valid_words = set()
        self.load_dictionary(dict_path)

    def load_dictionary(self, path):
        """Load word list into memory for fast lookup"""
        with open(path, 'r') as f:
            self.valid_words = {
                word.strip().upper()
                for word in f.readlines()
            }

    def is_valid_word(self, word):
        """O(1) lookup for word validation"""
        return word.upper() in self.valid_words

    def get_word_list_by_length(self, min_len=2, max_len=15):
        """Get filtered word list for starting words"""
        return [
            word for word in self.valid_words
            if min_len <= len(word) <= max_len
        ]
```

### Dictionary Options Research

1. **ENABLE (Enhanced North American Benchmark Lexicon)**
   - ~173,000 words
   - Public domain
   - Good for general play
   - File size: ~2MB

2. **CSW19 (Collins Scrabble Words)**
   - ~280,000 words
   - Official Scrabble dictionary
   - Licensing considerations

3. **TWL06 (Tournament Word List)**
   - ~178,000 words
   - North American Scrabble
   - Licensing considerations

4. **Open Source Options**
   - Aspell dictionaries (various languages)
   - SCOWL (Spell Checker Oriented Word Lists)
   - Google 10000 English (common words only)

## Game State Management

### Frontend State

```javascript
class GameState {
    constructor() {
        this.board = new Array(15).fill().map(() => new Array(15).fill(null));
        this.playerTiles = [];
        this.score = 0;
        this.turnNumber = 1;
        this.maxTurns = 5;
        this.currentWord = [];
        this.seedData = null;
        this.retriesUsed = 0;
        this.maxRetries = 10;
        this.turnScores = [];
        this.wordsPlayed = [];
        this.gameDate = null;
    }

    async initializeDaily(dateString = null) {
        // Use provided date or today
        const date = dateString || new Date().toISOString().split('T')[0];
        this.gameDate = date;

        // Check for saved state first
        if (this.loadFromLocalStorage(date)) {
            return; // Game restored from save
        }

        // Fetch daily game data from backend
        const response = await fetch(`/cgi-bin/get_daily_game.py?date=${date}`);
        const data = await response.json();

        this.seedData = data;
        this.placeStartingWord(data.startingWord, data.position);
        this.playerTiles = data.initialTiles;
    }

    saveToLocalStorage() {
        const state = {
            board: this.board,
            tiles: this.playerTiles,
            score: this.score,
            turn: this.turnNumber,
            date: this.gameDate,
            retriesUsed: this.retriesUsed,
            turnScores: this.turnScores,
            wordsPlayed: this.wordsPlayed,
            timestamp: new Date().toISOString()
        };

        // Save with date-specific key
        localStorage.setItem(`dailyLetters_${this.gameDate}`, JSON.stringify(state));

        // Clean up old games (30+ days)
        this.cleanOldGames();
    }

    loadFromLocalStorage(date) {
        const saved = localStorage.getItem(`dailyLetters_${date}`);
        if (saved) {
            const state = JSON.parse(saved);
            this.board = state.board;
            this.playerTiles = state.tiles;
            this.score = state.score;
            this.turnNumber = state.turn;
            this.retriesUsed = state.retriesUsed || 0;
            this.turnScores = state.turnScores || [];
            this.wordsPlayed = state.wordsPlayed || [];
            this.gameDate = date;
            return true;
        }
        return false;
    }

    cleanOldGames() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('dailyLetters_')) {
                const gameDate = key.replace('dailyLetters_', '');
                if (new Date(gameDate) < cutoffDate) {
                    localStorage.removeItem(key);
                }
            }
        });
    }
}
```

### Backend API Endpoints

```python
# /cgi-bin/get_daily_game.py
def get_daily_game(date_string=None):
    """Generate or retrieve daily game configuration"""
    if date_string:
        # Parse date from query parameter
        date = datetime.strptime(date_string, '%Y-%m-%d')
    else:
        date = datetime.now(timezone.utc)

    generator = DailyGameGenerator(date.strftime('%Y-%m-%d'))
    starting_word_manager = StartingWordManager()

    starting_word = starting_word_manager.get_word_for_date(date)
    position = generator.get_starting_position(starting_word)
    initial_tiles = generator.draw_tiles(7)

    return {
        'date': date.strftime('%Y-%m-%d'),
        'startingWord': starting_word,
        'position': position,
        'initialTiles': initial_tiles,
        'gameNumber': (date - datetime(2024, 1, 1)).days + 1
    }

# /cgi-bin/validate_word.py
def validate_word(word):
    """Check if word is valid"""
    dictionary = DictionaryManager()
    profanity_filter = ProfanityFilter()

    # Check dictionary and profanity
    is_valid = dictionary.is_valid_word(word) and not profanity_filter.is_profane(word)

    return {
        'word': word,
        'valid': is_valid,
        'score': calculate_word_score(word) if is_valid else 0
    }

# /cgi-bin/submit_score.py
def submit_score(date, score, turn_scores):
    """Submit score to daily leaderboard"""
    leaderboard = LeaderboardManager()

    # Generate anonymous ID from browser fingerprint
    anon_id = generate_anon_hash(request.headers)

    rank = leaderboard.add_score(date, score, anon_id, turn_scores)

    return {
        'rank': rank,
        'totalPlayers': leaderboard.get_player_count(date),
        'percentile': leaderboard.get_percentile(date, score),
        'dailyAverage': leaderboard.get_average(date)
    }

# /cgi-bin/get_leaderboard.py
def get_leaderboard(date):
    """Get top scores for a specific date"""
    leaderboard = LeaderboardManager()

    return {
        'date': date,
        'topScores': leaderboard.get_top_scores(date, limit=100),
        'totalPlayers': leaderboard.get_player_count(date),
        'averageScore': leaderboard.get_average(date),
        'medianScore': leaderboard.get_median(date)
    }
```

## Board and Scoring Engine

### Board Manager

```javascript
class BoardManager {
    constructor() {
        this.grid = new Array(15).fill().map(() => new Array(15).fill(null));
        this.multipliers = this.initializeMultipliers();
    }

    initializeMultipliers() {
        const mult = new Array(15).fill().map(() => new Array(15).fill(null));

        // Triple Word Scores
        const tws = [[0,0], [0,7], [0,14], [7,0], [7,14], [14,0], [14,7], [14,14]];
        tws.forEach(([r,c]) => mult[r][c] = 'TW');

        // Double Word Scores (diagonal pattern)
        const dws = [[1,1], [2,2], [3,3], [4,4], [1,13], [2,12], [3,11], [4,10],
                     [13,1], [12,2], [11,3], [10,4], [13,13], [12,12], [11,11], [10,10],
                     [7,7]]; // center
        dws.forEach(([r,c]) => mult[r][c] = 'DW');

        // Triple Letter Scores
        const tls = [[1,5], [1,9], [5,1], [5,5], [5,9], [5,13],
                     [9,1], [9,5], [9,9], [9,13], [13,5], [13,9]];
        tls.forEach(([r,c]) => mult[r][c] = 'TL');

        // Double Letter Scores
        const dls = [[0,3], [0,11], [2,6], [2,8], [3,0], [3,7], [3,14],
                     [6,2], [6,6], [6,8], [6,12], [7,3], [7,11],
                     [8,2], [8,6], [8,8], [8,12], [11,0], [11,7], [11,14],
                     [12,6], [12,8], [14,3], [14,11]];
        dls.forEach(([r,c]) => mult[r][c] = 'DL');

        return mult;
    }

    placeWord(word, startRow, startCol, direction) {
        // Validate placement
        if (!this.isValidPlacement(word, startRow, startCol, direction)) {
            return false;
        }

        // Place tiles
        for (let i = 0; i < word.length; i++) {
            const row = direction === 'horizontal' ? startRow : startRow + i;
            const col = direction === 'horizontal' ? startCol + i : startCol;
            this.grid[row][col] = word[i];
        }

        return true;
    }

    calculateScore(word, startRow, startCol, direction, newTilePositions) {
        let wordScore = 0;
        let wordMultiplier = 1;

        for (let i = 0; i < word.length; i++) {
            const row = direction === 'horizontal' ? startRow : startRow + i;
            const col = direction === 'horizontal' ? startCol + i : startCol;

            let letterScore = LETTER_VALUES[word[i]];

            // Only apply multipliers for newly placed tiles
            if (newTilePositions.some(pos => pos.row === row && pos.col === col)) {
                const mult = this.multipliers[row][col];

                if (mult === 'DL') letterScore *= 2;
                if (mult === 'TL') letterScore *= 3;
                if (mult === 'DW') wordMultiplier *= 2;
                if (mult === 'TW') wordMultiplier *= 3;
            }

            wordScore += letterScore;
        }

        wordScore *= wordMultiplier;

        // Check for bingo (all 7 tiles used)
        if (newTilePositions.length === 7) {
            wordScore += 50;
        }

        return wordScore;
    }
}
```

## Data Structures

### Tile Definition

```javascript
const LETTER_VALUES = {
    'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
    'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
    'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
    'Y': 4, 'Z': 10, '_': 0  // Blank tile
};

const TILE_DISTRIBUTION = {
    'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2,
    'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2,
    'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1,
    'Y': 2, 'Z': 1, '_': 2
};
```

### Game Configuration

```python
# config.py
GAME_CONFIG = {
    'board_size': 15,
    'initial_tiles': 7,
    'max_turns': 5,
    'bingo_bonus': 50,
    'min_word_length': 2,
    'starting_word_length': (5, 7),
    'dictionary_path': 'dictionaries/enable.txt',
    'timezone': 'UTC'
}

# Starting words criteria
STARTING_WORDS_CONFIG = {
    'min_length': 5,
    'max_length': 7,
    'common_words_only': True,
    'exclude_obscure': True,
    'frequency_threshold': 1000  # If using frequency data
}
```

## File Structure

```
/letters/
├── index.html                 # Main game page
├── css/
│   ├── game.css              # Game styling
│   ├── mobile.css            # Mobile-specific styles
│   └── animations.css        # Visual celebrations
├── js/
│   ├── game.js               # Main game logic
│   ├── board.js              # Board management
│   ├── state.js              # State management
│   ├── ui.js                 # UI interactions
│   ├── share.js              # Share functionality
│   └── celebrations.js       # Visual effects
├── cgi-bin/
│   ├── get_daily_game.py     # Daily game generator
│   ├── validate_word.py      # Word validation
│   ├── submit_score.py       # Leaderboard submission
│   └── get_leaderboard.py    # Get high scores
├── data/
│   ├── starting_words.json   # 36,600 themed words
│   └── profanity_filter.txt  # Excluded words
├── dictionaries/
│   ├── enable.txt            # Primary dictionary
│   └── enable.txt.gz         # Compressed for client
├── docker/
│   ├── Dockerfile            # Container definition
│   └── docker-compose.yml    # Development setup
├── scripts/
│   ├── letters_start.sh      # Start development
│   ├── letters_rebuild.sh    # Rebuild container
│   ├── letters_deploy.sh     # Deploy to production
│   └── generate_words.py     # Wikipedia word extraction
└── tests/
    ├── test_generator.py      # Test seed generation
    ├── test_dictionary.py     # Test word validation
    ├── test_scoring.py        # Test scoring logic
    └── test_leaderboard.py    # Test high scores
```

## Development Workflow

### Local Development
```bash
# Start development container (port 8085)
./letters_start.sh

# Access at http://localhost:8085
```

### Testing
```bash
# Run Python tests
python -m pytest tests/

# Run JavaScript tests (if added)
npm test
```

### Deployment
```bash
# Deploy to production
./letters_deploy.sh
```

## Performance Considerations

### Frontend Optimization
- Minimize dictionary lookups by validating on submit only
- Cache board state in memory
- Use CSS transforms for drag-and-drop
- Lazy load sound effects and animations

### Backend Optimization
- Load dictionary once into memory
- Pre-generate daily games at midnight UTC
- Cache validated words per session
- Use binary search for sorted word lists

### Dictionary Loading
- Consider splitting dictionary by word length
- Implement bloom filter for quick rejection
- Use trie structure for prefix validation
- Compress dictionary file with gzip

## Security Considerations

### Input Validation
- Sanitize all word inputs
- Validate board positions
- Check turn numbers against expected sequence
- Prevent replay attacks with timestamp validation

### State Management
- Sign game state with HMAC
- Validate tile ownership
- Prevent tile duplication
- Check score calculations server-side

## Monitoring and Analytics

### Metrics to Track
- Daily active users
- Game completion rate
- Average score per day
- Word validation attempts
- Most common words played
- Browser/device statistics

### Error Handling
- Log dictionary load failures
- Track invalid word attempts
- Monitor CGI timeout issues
- Alert on deployment failures