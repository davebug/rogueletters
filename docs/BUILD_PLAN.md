# Daily Letters - Build Plan

## Configuration Confirmed

- **Temporary URL**: https://dates.wiki/letters/
- **Port**: 8085 (development)
- **Stack**: Apache httpd:2.4 + Python CGI (matching other games)
- **Share URL**: Will use `https://dates.wiki/letters/?seed=20240315` for now

## Phase 1 Build Order (Ready to Start)

### 1. Project Structure Setup
```
/letters/
├── index.html
├── css/
│   └── game.css
├── js/
│   └── game.js
├── cgi-bin/
│   └── get_daily_game.py
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
└── scripts/
    └── letters_start.sh
```

### 2. Core Components to Build

#### A. HTML Structure (index.html)
- 15x15 board grid
- Tile rack (7 tiles)
- Score display
- Turn counter
- Date display with [Today] link

#### B. Board Rendering (game.js)
- Grid creation with multipliers
- Tile placement logic
- Visual feedback system

#### C. Basic Backend (get_daily_game.py)
- Date-based seed generation
- Starting word placement
- Initial tile distribution

#### D. Docker Setup
- Based on WikiDates/WikiBirthdays config
- Port 8085
- Python + Apache setup

### 3. Initial Data Files

#### A. Starter Words (Phase 1)
```python
# 200 common 5-7 letter words for MVP
STARTER_WORDS = [
    "WORLD", "LIGHT", "STONE", "PAPER", "HOUSE",
    "WATER", "BEACH", "CLOUD", "DREAM", "EARTH",
    # ... 190 more
]
```

#### B. Dictionary (Phase 1)
- Use ENABLE dictionary
- Minimal profanity filter (10-20 words)
- Load into memory for fast validation

### 4. MVP Features (Week 1-2)

#### Must Have
- ✅ 15x15 board with word game multipliers
- ✅ 7-tile rack
- ✅ Tile placement (click to select, click to place)
- ✅ Word validation against ENABLE
- ✅ Score calculation
- ✅ 5-turn limit
- ✅ Date-based seeding
- ✅ Basic mobile support

#### Won't Have (Yet)
- ❌ Leaderboard
- ❌ Share functionality (Phase 2)
- ❌ Animations
- ❌ State persistence
- ❌ Historical puzzles
- ❌ Wikipedia-themed words

## Implementation Questions Resolved

1. **Tile Distribution**: Standard word game distribution (100 tiles, no blanks)
2. **Starting Word**: Random 5-7 letter word, through center
3. **Validation Retries**: 10 total across 5 turns
4. **UI Feedback**: Simple inline messages
5. **Score Display**: Running total only
6. **Mobile**: Click to place (no drag initially)

## Next Steps

### Today's Focus
1. Create basic file structure
2. Set up Docker environment
3. Build HTML board layout
4. Implement basic tile display

### Tomorrow
1. Add tile interaction
2. Implement word validation
3. Create scoring logic
4. Test basic gameplay

### By End of Week
1. Complete 5-turn game flow
2. Add date-based seeding
3. Basic mobile responsiveness
4. Initial testing

## Development Commands

```bash
# Start development
cd /Users/daverutledge/wikigames/letters
./letters_start.sh

# Access game
open http://localhost:8085

# Test with specific date
open "http://localhost:8085/?seed=20240315"
```

## Success Criteria for Phase 1

- [ ] Can play complete 5-turn game
- [ ] Words validate correctly
- [ ] Score calculates accurately
- [ ] Same seed = same game
- [ ] Works on mobile (basic)
- [ ] No major bugs

## Ready to Code!

All decisions made. Documentation complete. Let's build!