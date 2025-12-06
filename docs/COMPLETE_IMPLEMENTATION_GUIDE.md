# Complete Implementation Guide - Following WikiDates Patterns

## Project Structure (Matching WikiDates)

```
/letters/
├── index.html                 # Main game page
├── script.js                  # JavaScript (like WikiDates)
├── styles.css                 # Styling (like WikiDates)
├── cgi-bin/
│   ├── letters.py            # Main game API (like wikidates.py)
│   ├── validate_word.py      # Word validation endpoint
│   └── submit_score.py       # High score submission
├── data/
│   ├── enable.txt            # Dictionary file
│   ├── starter_words.txt     # Initial words
│   ├── plays/                # Daily play tracking
│   └── highscores/           # Daily high scores
├── Dockerfile                 # Based on WikiDates
├── httpd.conf                # Apache config
├── requirements.txt          # Python dependencies
├── docker-compose.yml        # Development setup
└── letters_start.sh          # Startup script

```

## 1. Docker/Apache Setup (Copy from WikiDates)

### Dockerfile
```dockerfile
FROM httpd:2.4-bookworm

# Install Python and required dependencies
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

# Create the CGI directory in Apache
RUN mkdir -p /usr/local/apache2/cgi-bin

# Copy requirements.txt BEFORE creating the virtual environment
COPY requirements.txt /usr/local/apache2/cgi-bin/requirements.txt

# Create a virtual environment and install dependencies
RUN python3 -m venv /usr/local/apache2/cgi-bin/venv && \
    /usr/local/apache2/cgi-bin/venv/bin/pip install --no-cache-dir -r /usr/local/apache2/cgi-bin/requirements.txt

# Copy Letters web files to Apache's document root
COPY index.html script.js styles.css /usr/local/apache2/htdocs/

# Copy the Python scripts
COPY cgi-bin/*.py /usr/local/apache2/cgi-bin/

# Ensure Python scripts are executable
RUN chmod +x /usr/local/apache2/cgi-bin/*.py

# Add the correct shebang line automatically
RUN for file in /usr/local/apache2/cgi-bin/*.py; do \
    sed -i '1s|^.*$|#!/usr/local/apache2/cgi-bin/venv/bin/python3|' "$file"; \
done

# Copy dictionary and data files
COPY data /usr/local/apache2/data

# Enable CGI execution in Apache
COPY httpd.conf /usr/local/apache2/conf/httpd.conf

# Expose port 80 (maps to 8085 in docker-compose)
EXPOSE 80

# Start Apache in foreground
CMD ["httpd-foreground"]
```

### requirements.txt
```
# No external dependencies for MVP!
# Just using Python standard library
```

## 2. Python CGI Pattern (Following WikiDates)

### cgi-bin/letters.py (Main Endpoint)
```python
#!/usr/bin/env python3
import cgi
import cgitb
import json
import random
import hashlib
from datetime import datetime
import os

# Enable detailed error reporting for debugging (disable in production)
cgitb.enable()

# Output the HTTP header for JSON content
print("Content-Type: application/json\n")

# Initialize debug logs (like WikiDates)
debug_logs = []

def log_debug(message, **kwargs):
    """Helper function to log debugging messages."""
    log_entry = {"debug": message}
    log_entry.update(kwargs)
    debug_logs.append(log_entry)

def get_today_as_seed():
    """Generate today's date as a seed in YYYYMMDD format."""
    return datetime.now().strftime("%Y%m%d")

def load_dictionary():
    """Load ENABLE dictionary into memory"""
    dict_path = "/usr/local/apache2/data/enable.txt"
    with open(dict_path, 'r') as f:
        return set(line.strip().upper() for line in f)

def create_tile_bag():
    """Create standard Scrabble tile distribution (no blanks)"""
    tiles = []
    distribution = {
        'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2,
        'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2,
        'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1,
        'Y': 2, 'Z': 1
    }

    for letter, count in distribution.items():
        tiles.extend([letter] * count)

    return tiles

def get_starting_word(date_seed):
    """Get starting word for the given date"""
    # For MVP: Simple list of common words
    words_path = "/usr/local/apache2/data/starter_words.txt"
    with open(words_path, 'r') as f:
        words = [line.strip().upper() for line in f]

    # Use date seed to pick word
    random.seed(date_seed)
    return random.choice(words)

def setup_game(seed):
    """Setup game for the given seed (following WikiDates pattern)"""
    # Create and shuffle tile bag
    tiles = create_tile_bag()
    random.seed(seed)
    random.shuffle(tiles)

    # Get starting word
    starting_word = get_starting_word(seed)

    # Remove starting word tiles from bag
    remaining_tiles = tiles.copy()
    for letter in starting_word:
        if letter in remaining_tiles:
            remaining_tiles.remove(letter)

    # Player gets first 7 tiles
    player_tiles = remaining_tiles[:7]

    # Determine starting word position (horizontal through center)
    start_col = 7 - len(starting_word) // 2

    return {
        "startingWord": starting_word,
        "startingPosition": {
            "row": 7,
            "col": start_col,
            "direction": "horizontal"
        },
        "playerTiles": player_tiles,
        "tilesRemaining": len(remaining_tiles) - 7
    }

try:
    # Get the query string parameter 'seed' (like WikiDates)
    form = cgi.FieldStorage()
    seed = form.getvalue('seed', get_today_as_seed())  # Default to today's date if not provided

    # Validate seed format (YYYYMMDD)
    if len(seed) != 8 or not seed.isdigit():
        raise ValueError(f"Invalid seed format: {seed}. Expected YYYYMMDD.")

    log_debug("Processing game for seed", seed=seed)

    # Setup game
    game_data = setup_game(seed)

    # Return successful response (WikiDates pattern)
    response = {
        "status": "success",
        "seed": seed,
        "game": game_data,
        "debug": debug_logs if os.getenv("DEBUG") else []
    }

    print(json.dumps(response))

except Exception as e:
    # Error response (WikiDates pattern)
    error_response = {
        "status": "error",
        "message": str(e),
        "debug": debug_logs
    }
    print(json.dumps(error_response))
```

### cgi-bin/validate_word.py
```python
#!/usr/bin/env python3
import cgi
import cgitb
import json
import os

cgitb.enable()
print("Content-Type: application/json\n")

# Load dictionary once at module level
DICTIONARY = None

def load_dictionary():
    global DICTIONARY
    if DICTIONARY is None:
        dict_path = "/usr/local/apache2/data/enable.txt"
        with open(dict_path, 'r') as f:
            DICTIONARY = set(line.strip().upper() for line in f)
    return DICTIONARY

def calculate_word_score(word, row, col, direction, board):
    """Calculate Scrabble score for a word"""
    letter_values = {
        'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
        'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
        'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
        'Y': 4, 'Z': 10
    }

    # Simplified scoring for MVP
    score = sum(letter_values.get(letter, 0) for letter in word)
    return score

try:
    # Parse request
    form = cgi.FieldStorage()
    data = json.loads(form.getvalue('data', '{}'))

    words_to_validate = data.get('words', [])
    board_state = data.get('board', [])

    # Load dictionary
    dictionary = load_dictionary()

    # Validate each word
    results = []
    total_score = 0

    for word_data in words_to_validate:
        word = word_data['word'].upper()
        is_valid = word in dictionary

        if is_valid:
            score = calculate_word_score(
                word,
                word_data.get('row', 0),
                word_data.get('col', 0),
                word_data.get('direction', 'horizontal'),
                board_state
            )
            total_score += score
        else:
            score = 0

        results.append({
            "word": word,
            "valid": is_valid,
            "score": score
        })

    # Return response
    response = {
        "status": "success",
        "words": results,
        "totalScore": total_score,
        "allValid": all(r['valid'] for r in results)
    }

    print(json.dumps(response))

except Exception as e:
    error_response = {
        "status": "error",
        "message": str(e)
    }
    print(json.dumps(error_response))
```

## 3. JavaScript Pattern (Following WikiDates)

### script.js (Main Game Logic)
```javascript
// Global variables (like WikiDates)
let currentSeed = null;
let gameState = null;
let selectedTile = null;
let placedTiles = [];

// Extract seed from the URL (WikiDates pattern)
function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null;
}

// Update URL with the given seed (WikiDates pattern)
function setURLParameter(seed) {
    const newurl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?seed=${seed}`;
    window.history.pushState({ path: newurl }, '', newurl);
}

// Default to today's seed if none is provided (WikiDates pattern)
function getSeed() {
    let seed = getURLParameter('seed');
    if (!seed || !formatSeedAsDate(seed)) {
        const today = new Date();
        seed = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
        setURLParameter(seed);
    }
    return seed;
}

// Format seed as a readable date (WikiDates pattern)
function formatSeedAsDate(seed) {
    if (!/^\d{8}$/.test(seed)) {
        return null; // Invalid seed format
    }

    const year = parseInt(seed.slice(0, 4), 10);
    const month = parseInt(seed.slice(4, 6), 10) - 1; // JavaScript months are 0-based
    const day = parseInt(seed.slice(6, 8), 10);

    const date = new Date(year, month, day);

    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

// Initialize the game (WikiDates pattern)
function initGame() {
    const seed = getSeed();
    console.log("Using seed:", seed);

    // Display the formatted date (WikiDates pattern)
    const formattedDate = formatSeedAsDate(seed);
    const dateElement = document.getElementById("dateDisplay");
    if (formattedDate) {
        if (dateElement) {
            dateElement.textContent = `${formattedDate}`;

            // Check if this is today's puzzle
            const today = new Date();
            const todaySeed = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
            const isToday = seed === todaySeed;

            // Add "Play Today" link if not viewing today's puzzle
            if (!isToday) {
                const playTodayLink = document.createElement('a');
                playTodayLink.href = '/';
                playTodayLink.textContent = '[Today]';
                playTodayLink.style.marginLeft = '10px';
                playTodayLink.style.fontSize = '14px';
                playTodayLink.style.color = '#333344';
                dateElement.appendChild(playTodayLink);
            }
        }
        fetchGameData(seed); // Fetch game data if the seed is valid
    } else {
        if (dateElement) {
            dateElement.textContent = "Invalid Date";
        }
    }
}

// Fetch game data using the seed (WikiDates pattern)
function fetchGameData(seed) {
    fetch(`/cgi-bin/letters.py?seed=${seed}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                console.log("Game loaded successfully:", data.game);
                setupGame(data.game);
            } else {
                console.error("Error fetching game:", data.message);
            }
        })
        .catch(error => console.error("Error fetching game:", error));
}

// Setup the game board
function setupGame(gameData) {
    gameState = {
        startingWord: gameData.startingWord,
        startingPosition: gameData.startingPosition,
        playerTiles: gameData.playerTiles,
        board: createEmptyBoard(),
        score: 0,
        turnNumber: 1,
        maxTurns: 5
    };

    // Place starting word on board
    placeStartingWord();

    // Display player tiles
    displayPlayerTiles();

    // Initialize board display
    displayBoard();
}

// Create empty 15x15 board
function createEmptyBoard() {
    const board = [];
    for (let i = 0; i < 15; i++) {
        board.push(new Array(15).fill(null));
    }
    return board;
}

// Place starting word on board
function placeStartingWord() {
    const { startingWord, startingPosition } = gameState;
    const { row, col, direction } = startingPosition;

    for (let i = 0; i < startingWord.length; i++) {
        if (direction === 'horizontal') {
            gameState.board[row][col + i] = startingWord[i];
        } else {
            gameState.board[row + i][col] = startingWord[i];
        }
    }
}

// Display the game board
function displayBoard() {
    const boardElement = document.getElementById('gameBoard');
    boardElement.innerHTML = '';

    for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 15; col++) {
            const square = document.createElement('div');
            square.className = 'board-square';
            square.dataset.row = row;
            square.dataset.col = col;

            // Add multiplier classes
            const multiplier = getMultiplierType(row, col);
            if (multiplier) {
                square.classList.add(multiplier);
            }

            // Add tile if present
            if (gameState.board[row][col]) {
                square.textContent = gameState.board[row][col];
                square.classList.add('has-tile');
            }

            // Add click handler
            square.addEventListener('click', handleSquareClick);

            boardElement.appendChild(square);
        }
    }
}

// Get multiplier type for a square (Scrabble board layout)
function getMultiplierType(row, col) {
    // Triple word scores
    if ((row === 0 || row === 7 || row === 14) && (col === 0 || col === 7 || col === 14)) {
        if (!(row === 7 && col === 7)) {  // Not center
            return 'triple-word';
        }
    }

    // Center square (double word)
    if (row === 7 && col === 7) {
        return 'double-word center';
    }

    // Other multipliers would go here...
    // Simplified for MVP

    return null;
}

// Display player tiles in rack
function displayPlayerTiles() {
    const rackElement = document.getElementById('tileRack');
    rackElement.innerHTML = '';

    gameState.playerTiles.forEach((tile, index) => {
        const tileElement = document.createElement('div');
        tileElement.className = 'tile';
        tileElement.dataset.index = index;
        tileElement.textContent = tile;

        // Add letter value
        const value = getLetterValue(tile);
        const valueElement = document.createElement('span');
        valueElement.className = 'tile-value';
        valueElement.textContent = value;
        tileElement.appendChild(valueElement);

        // Add click handler
        tileElement.addEventListener('click', handleTileClick);

        rackElement.appendChild(tileElement);
    });
}

// Get Scrabble letter value
function getLetterValue(letter) {
    const values = {
        'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
        'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
        'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
        'Y': 4, 'Z': 10
    };
    return values[letter] || 0;
}

// Handle tile click (select for placement)
function handleTileClick(event) {
    // Deselect previous tile
    document.querySelectorAll('.tile.selected').forEach(t => t.classList.remove('selected'));

    // Select this tile
    event.target.classList.add('selected');
    selectedTile = {
        letter: event.target.textContent[0],  // First char (not value)
        index: parseInt(event.target.dataset.index)
    };

    // Highlight valid placement squares
    highlightValidSquares();
}

// Handle board square click (place tile)
function handleSquareClick(event) {
    if (!selectedTile) {
        console.log("No tile selected");
        return;
    }

    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);

    // Check if square is empty
    if (gameState.board[row][col]) {
        console.log("Square already occupied");
        return;
    }

    // Place tile (ghost/tentative)
    placeTileOnBoard(row, col, selectedTile.letter);

    // Remove from rack
    gameState.playerTiles.splice(selectedTile.index, 1);
    selectedTile = null;

    // Refresh displays
    displayPlayerTiles();
    displayBoard();
}

// Place tile on board (tentatively)
function placeTileOnBoard(row, col, letter) {
    placedTiles.push({ row, col, letter });
    gameState.board[row][col] = letter;

    // Update tentative score
    updateScorePreview();
}

// Submit word for validation
async function submitWord() {
    if (placedTiles.length === 0) {
        alert("Place tiles to form a word first!");
        return;
    }

    // Find all words formed
    const words = findAllFormedWords();

    // Validate with server
    const response = await fetch('/cgi-bin/validate_word.py', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(JSON.stringify({
            words: words,
            board: gameState.board
        }))}`
    });

    const result = await response.json();

    if (result.allValid) {
        // Success! Lock in the move
        gameState.score += result.totalScore;
        gameState.turnNumber++;
        placedTiles = [];

        // Check game over
        if (gameState.turnNumber > gameState.maxTurns) {
            endGame();
        } else {
            // Draw new tiles (simplified for MVP)
            alert(`Valid! Score: +${result.totalScore}`);
        }
    } else {
        // Invalid word(s)
        const invalidWords = result.words.filter(w => !w.valid).map(w => w.word);
        alert(`Invalid words: ${invalidWords.join(', ')}`);

        // Return tiles to rack
        returnTilesToRack();
    }
}

// Find all words formed by placed tiles
function findAllFormedWords() {
    // Simplified for MVP - just find the main word
    // Full implementation would check all cross-words too

    if (placedTiles.length === 0) return [];

    // Sort placed tiles by position
    placedTiles.sort((a, b) => {
        if (a.row === b.row) return a.col - b.col;
        return a.row - b.row;
    });

    // Determine if horizontal or vertical
    const isHorizontal = placedTiles.every(t => t.row === placedTiles[0].row);

    if (isHorizontal) {
        // Build horizontal word
        const row = placedTiles[0].row;
        let word = '';
        let startCol = placedTiles[0].col;

        // Find start of word (might include existing tiles)
        while (startCol > 0 && gameState.board[row][startCol - 1]) {
            startCol--;
        }

        // Build word
        for (let col = startCol; col < 15 && gameState.board[row][col]; col++) {
            word += gameState.board[row][col];
        }

        return [{ word, row, col: startCol, direction: 'horizontal' }];
    }

    // Similar logic for vertical...
    // Simplified for MVP

    return [];
}

// Initialize when page loads (WikiDates pattern)
window.addEventListener('DOMContentLoaded', initGame);
```

## 4. HTML Structure (Following WikiDates Pattern)

### index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, minimal-ui">
    <title>Daily Letters</title>
    <link rel="stylesheet" href="styles.css?1">
    <script src="script.js?1" defer></script>
</head>
<body>
    <header>
        <h1>Daily <span class="accent"><a href="/">Letters</a></span></h1>
        <div id="dateDisplay">Loading…</div>
        <div id="subtitle">5 turns to maximize your score!</div>
        <div id="status">
            <span id="score">Score: 0</span> |
            <span id="turn">Turn 1 of 5</span>
        </div>
    </header>

    <main>
        <section id="gameBoard" class="board">
            <!-- 15x15 grid generated by JavaScript -->
        </section>

        <section id="controls">
            <div id="tileRack" class="tile-rack">
                <!-- Player tiles -->
            </div>
            <button id="submitWord" onclick="submitWord()">Submit Word</button>
            <button id="clearTiles" onclick="clearPlacedTiles()">Clear</button>
        </section>
    </main>

    <footer>
        <div id="feedbackFooter">
            <div id="feedbackRow">
                <span class="feedback-square"></span>
                <span class="feedback-square"></span>
                <span class="feedback-square"></span>
                <span class="feedback-square"></span>
                <span class="feedback-square"></span>
                <a href="#" id="shareIcon" class="hidden" aria-label="Share your result">
                    <!-- Share icon SVG from WikiDates -->
                </a>
            </div>
        </div>
        <p>&copy; 2025 Daily Letters |
           <a href="https://donate.wikimedia.org">Give to Wikipedia</a>
        </p>
    </footer>

    <!-- High Score Modal (hidden initially) -->
    <div id="highScoreModal" class="modal hidden">
        <div class="modal-content">
            <h2>🎉 HIGH SCORE!</h2>
            <p>You ranked #<span id="rank"></span>!</p>
            <input type="text" id="playerName" maxlength="8" placeholder="Enter name">
            <button onclick="submitHighScore()">Submit</button>
        </div>
    </div>
</body>
</html>
```

## 5. Development Scripts (Following WikiDates)

### letters_start.sh
```bash
#!/bin/bash
# Start development container (like wikidates_start.sh)

echo "Starting Daily Letters development server..."

# Build and run with docker-compose
docker-compose -f docker-compose.yml up --build

echo "Daily Letters is running at http://localhost:8085"
```

### docker-compose.yml
```yaml
version: '3'
services:
  letters:
    build: .
    ports:
      - "8085:80"
    volumes:
      - ./:/usr/local/apache2/htdocs/
      - ./cgi-bin:/usr/local/apache2/cgi-bin/
      - ./data:/usr/local/apache2/data/
    environment:
      - DEBUG=1  # Enable debug logs in development
```

## Key Patterns We're Following from WikiDates

1. **URL Seed Pattern**: `?seed=YYYYMMDD` for date-based games
2. **CGI Structure**: Python scripts with JSON responses
3. **Error Handling**: Try/catch with debug logs
4. **Date Display**: "Month Day" format with [Today] link
5. **Docker Setup**: httpd:2.4 with Python CGI
6. **File Organization**: Simple flat structure
7. **No External Dependencies**: Using Python standard library
8. **Response Format**: `{"status": "success/error", "data": ...}`

## Implementation Timeline

### Day 1: Setup & Foundation
- [ ] Copy Docker setup from WikiDates
- [ ] Create basic HTML structure
- [ ] Set up Python CGI endpoint
- [ ] Test seed-based game generation

### Day 2: Board & Tiles
- [ ] Implement board display
- [ ] Create tile rack
- [ ] Add tile selection/placement
- [ ] Display starting word

### Day 3: Game Logic
- [ ] Word validation endpoint
- [ ] Score calculation
- [ ] Turn management
- [ ] Game over detection

### Day 4: High Scores
- [ ] First-play detection
- [ ] High score submission
- [ ] Name entry with profanity filter
- [ ] Board replay storage

### Day 5: Polish
- [ ] Mobile optimization
- [ ] Share functionality
- [ ] Visual feedback
- [ ] Testing & debugging

## Next Steps

1. Create the actual files following these patterns
2. Start with Dockerfile and basic setup
3. Get "Hello World" CGI working
4. Build incrementally from there