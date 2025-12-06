# Daily Letters

A daily word puzzle game where all players worldwide receive the same puzzle each day.

## Play

- **Production**: https://letters.wiki
- **Development**: http://localhost:8085

## 🔴 Next Priority Feature

**WikiDates-Style Popup Implementation** - Transform the game completion experience to use an overlay popup (like WikiDates) instead of replacing the entire game view. This keeps the board visible and provides a more polished, modern UX. See `/docs/POPUP_IMPLEMENTATION_PLAN.md` for implementation details.

## Quick Start

```bash
# Start development server
./letters_start.sh

# Rebuild after Python changes
./letters_rebuild.sh

# Deploy to production
./letters_deploy.sh
```

## Project Structure

```
/letters/
├── README.md              # This file
├── index.html             # Main game page
├── script.js              # Game logic
├── styles.css             # Styling
│
├── cgi-bin/               # Python backend
│   ├── letters.py         # Main game API
│   ├── validate_word.py   # Word validation
│   └── submit_score.py    # High score submission
│
├── data/                  # Game data files
│   ├── enable.txt         # Dictionary (ENABLE)
│   ├── starter_words.txt  # Starting words list
│   ├── plays/             # Daily play tracking
│   └── highscores/        # Daily high scores
│
├── docs/                  # Documentation
│   ├── BUILD_PLAN.md      # Development roadmap
│   ├── GAME_DESIGN.md     # Game mechanics
│   └── ...                # Additional docs
│
├── tests/                 # Test files
│   ├── test_game.py       # Python tests
│   └── test_ui.js         # JavaScript tests
│
├── archive/               # Old versions/backups
│
├── Docker files
├── Dockerfile             # Container definition
├── docker-compose.yml     # Development setup
├── httpd.conf             # Apache configuration
├── requirements.txt       # Python dependencies
│
└── Scripts
    ├── letters_start.sh    # Start development
    ├── letters_rebuild.sh  # Rebuild container
    └── letters_deploy.sh   # Deploy to production
```

## Game Rules

- 15x15 board with letter and word multipliers
- 5 turns to maximize your score
- 7 tiles per turn (no blanks)
- Classic word game scoring
- Daily seed ensures same game for all players
- Top 10 scores displayed with board replay

## Development

### Technologies
- Frontend: Vanilla HTML/CSS/JavaScript
- Backend: Python CGI (no external dependencies)
- Server: Apache httpd:2.4
- Container: Docker

### Key Features
- Date-based seeding (same game worldwide)
- First-play-only high scores
- Board replay for top scores
- Mobile responsive
- No database required (JSON file storage)

### Testing
```bash
# Run Python tests
python -m pytest tests/

# Manual testing
# Visit http://localhost:8085/?seed=20240315
```

## Deployment

Follows the same pattern as WikiDates and WikiBirthdays:
- Docker container on Unraid
- SSH-based deployment
- Automatic backups

## Credits

Part of the Wiki Games collection:
- [WikiDates](https://dates.wiki)
- [WikiBirthdays](https://birthdays.wiki)
- [WikiGrids](https://grids.wiki)
- [WikiTiles](https://tiles.wiki)

## License

Copyright 2025 - All rights reserved