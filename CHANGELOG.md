# WikiLetters Changelog

## [1.0.0] - 2025-09-20

### Major Features Completed

#### 🎮 Game Completion Features
- **Rebranded to WikiLetters** - Changed from "Daily Letters" for future Wikipedia integration
- **Implemented game over screen** - Game properly ends after 5 turns with score display
- **Added share functionality** - Generates colored emoji tiles representing turn performance
- **Added shuffle button** - Fisher-Yates algorithm to randomize tile order in rack
- **Implemented bingo bonus** - +50 points for using all 7 tiles
- **Fixed retry mechanism** - Works correctly, decrements counter, fetches new tiles

#### 🏆 High Score System
- **Arcade-style 3-letter names** - Classic arcade game feel
- **Persistent storage** - Scores saved in `/data/highscores/YYYY-MM-DD.json`
- **Daily leaderboards** - Top 10 scores per day
- **Backend endpoints** - `submit_score.py` and `get_scores.py` implemented

#### 🎨 Visual Improvements
- **Woodgrain tile texture** - Subtle CSS gradients for realistic wood appearance
- **Lighter board squares** - Better contrast between tiles and board
- **Fixed center star** - No longer shows through placed tiles
- **Responsive design** - Works perfectly on mobile and desktop
- **Purple gradient background** - Professional game aesthetic

#### 🔧 Technical Improvements
- **URL seed parameter** - Auto-adds `?seed=YYYYMMDD` like WikiDates
- **ENABLE dictionary validation** - All starting words verified against 172,823 word list
- **Improved word extraction** - Gets common words from Wikipedia, not just proper nouns
- **Loading overlay fix** - Starts hidden, no more stuck loading screen
- **Consistent tile styling** - Same appearance in rack and on board

### Files Modified
- `index.html` - Rebranded title, arcade-style name input, shuffle button
- `script.js` - Game completion flow, share function, shuffle, bingo bonus, URL handling
- `styles.css` - Woodgrain textures, color improvements, responsive fixes
- `cgi-bin/submit_score.py` - Arcade-style high score submission
- `cgi-bin/get_scores.py` - Daily leaderboard retrieval
- `cgi-bin/fetch_date_words.py` - ENABLE dictionary validation, improved word extraction

### New Test Files
- `test-game-over.spec.js` - Game completion testing
- `test-turn-progression.spec.js` - Turn advancement validation
- `test-visual-design.spec.js` - Visual requirement verification
- `test-visual-screenshots.spec.js` - Comprehensive screenshot testing
- `test-seed-behavior.spec.js` - URL seed parameter testing

### Documentation Added
- `FEATURE_IMPLEMENTATION_STATUS.md` - Complete feature gap analysis
- `CRITICAL_FIXES_NEEDED.md` - Prioritized fix list

### What's Working
- ✅ Complete 5-turn game flow
- ✅ Score calculation with multipliers
- ✅ Wikipedia-sourced starting words
- ✅ Share results with emoji grid
- ✅ High score leaderboards
- ✅ Mobile responsive design
- ✅ Proper ENABLE dictionary validation
- ✅ Date-based daily puzzles

### Ready for Deployment
The game is now feature-complete for Option A (making the game completable) and ready for beta deployment at dates.wiki/letters!