# Project Structure Guide

## Directory Layout (Matching WikiDates/WikiBirthdays)

```
/letters/
│
├── 📄 Core Files (Root Level - Like WikiDates)
│   ├── index.html             # Main game page
│   ├── script.js              # Game logic (single file like WikiDates)
│   ├── styles.css             # Styling
│   ├── README.md              # Project overview
│   └── .gitignore             # Git exclusions
│
├── 📦 Docker/Deployment (Root Level - Like WikiDates)
│   ├── Dockerfile             # Container definition
│   ├── docker-compose.yml     # Development setup
│   ├── docker-compose.dev.yml # Alternative dev config
│   ├── httpd.conf             # Apache configuration
│   └── requirements.txt       # Python dependencies (empty for now)
│
├── 🚀 Scripts (Root Level - Like WikiDates)
│   ├── letters_start.sh       # Start development server
│   ├── letters_rebuild.sh     # Rebuild after changes
│   ├── letters_deploy.sh      # Deploy to production
│   └── enhanced_monitor.sh    # (Future) Health monitoring
│
├── 📂 cgi-bin/                # Backend scripts
│   ├── letters.py             # Main game API (like wikidates.py)
│   ├── validate_word.py       # Word validation endpoint
│   ├── submit_score.py        # High score submission
│   └── venv/                  # Python virtual environment
│
├── 📂 data/                   # Game data (Like WikiBirthdays)
│   ├── enable.txt             # ENABLE dictionary
│   ├── starter_words.txt      # Curated starting words
│   ├── profanity_filter.txt   # Blocked words
│   ├── plays/                 # Daily play tracking
│   │   └── YYYY-MM-DD.json    # One file per day
│   └── highscores/            # Daily high scores
│       └── YYYY-MM-DD.json    # One file per day
│
├── 📂 docs/                   # Documentation (Organized)
│   ├── PROJECT_STRUCTURE.md   # This file
│   ├── BUILD_PLAN.md          # Development roadmap
│   ├── GAME_DESIGN.md         # Game mechanics
│   ├── TECHNICAL_ARCHITECTURE.md
│   ├── IMPLEMENTATION_GUIDE.md
│   └── ... (other docs)
│
├── 📂 tests/                  # Test files
│   ├── test_seed.py           # Test seed generation
│   ├── test_scoring.py        # Test score calculation
│   ├── test_validation.py     # Test word validation
│   └── test_integration.py    # End-to-end tests
│
└── 📂 archive/                # Old versions/experiments
    └── (backup files)
```

## File Naming Conventions (Following Wiki Games)

### Scripts
- `letters_*.sh` - All Letters-specific scripts
- Lowercase with underscores

### Python Files
- `letters.py` - Main file named after game
- Descriptive names with underscores
- CGI scripts must be executable

### Data Files
- Date format: `YYYY-MM-DD.json`
- Text files: `.txt` extension
- JSON for structured data

## Key Differences from Other Wiki Games

### Like WikiDates:
- Single `script.js` file (not split)
- Single `styles.css` file
- URL seed pattern `?seed=YYYYMMDD`
- CGI response format

### Like WikiBirthdays:
- `/data/` directory for game data
- JSON file per day
- Pre-generated content option

### Unique to Letters:
- Dictionary files in `/data/`
- Two-tier storage (plays + highscores)
- Board replay data storage
- No external Python dependencies (yet)

## Development Workflow

### File Creation Order:
1. **Docker Setup** (copy from WikiDates)
   - Dockerfile
   - httpd.conf
   - docker-compose.yml

2. **Core Files**
   - index.html
   - styles.css
   - script.js

3. **Backend**
   - cgi-bin/letters.py
   - cgi-bin/validate_word.py

4. **Data**
   - data/enable.txt (download)
   - data/starter_words.txt (create)

5. **Scripts**
   - letters_start.sh
   - letters_rebuild.sh

## Storage Patterns

### Daily Files
```
/data/plays/2024-03-15.json
{
  "player_hash_1": {"score": 432, "time": "09:15:00"},
  "player_hash_2": {"score": 287, "time": "10:30:00"}
}

/data/highscores/2024-03-15.json
{
  "scores": [
    {"rank": 1, "name": "MAXWELL", "score": 487, "board": [...]}
  ]
}
```

### Configuration Files
- No database configuration needed
- No external service configs
- Everything is file-based

## Version Control

### Track in Git:
- All code files
- Documentation
- Docker configs
- Empty data directories

### Don't Track (.gitignore):
- Generated JSON files in data/
- Python cache files
- Local development files
- Dictionary file (too large)

## Deployment Structure

Same structure deployed to production, with:
- `/data/` persisted between deployments
- Logs written to `/var/log/`
- Static files served by Apache
- CGI scripts executed by Python