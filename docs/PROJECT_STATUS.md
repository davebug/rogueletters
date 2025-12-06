# WikiLetters Project Status
*Last Updated: September 21, 2025*

## 🚀 Current Status: BETA LIVE at letters.wiki

### What's Been Accomplished

#### Core Game Features
- ✅ Full word game with 7-tile rack
- ✅ 15x15 board with multiplier squares (DW, TW, DL, TL)
- ✅ Word validation via backend API
- ✅ Score tracking with color-coded feedback squares
- ✅ 5-turn game structure
- ✅ Daily seed-based word generation
- ✅ Share functionality with emoji grid
- ✅ Drag and drop tile placement
- ✅ Wikipedia-sourced starting words

#### UI Enhancements (Completed Sept 21)
- ✅ Score-based color coding for feedback squares:
  - 1-10: Blue (#1d4877)
  - 11-19: Green (#1b8a5a)
  - 20-29: Yellow (#fbb021)
  - 30-39: Orange (#f68838)
  - 40+: Red (#ee3e32)
- ✅ Realistic wood texture tile rack
- ✅ Start Over button (top-right, appears after first word)
- ✅ Recall button (left of rack, down arrow)
- ✅ Shuffle button (right of rack)
- ✅ All buttons 22px size with stroke-width: 3
- ✅ Fade in/out animations for dynamic UI elements
- ✅ Fixed rack width (doesn't shrink when tiles removed)

#### Bug Fixes (Completed Sept 21)
- ✅ Removed Wikipedia context area (was causing visual artifact)
- ✅ Hide "= 0" score until first word submitted
- ✅ Fixed multiplier text restoration when tiles removed
- ✅ Fixed multiplier hiding when dragging board-to-board

#### Deployment & Infrastructure
- ✅ GitHub repository (private): https://github.com/davebug/wikiletters
- ✅ Docker container deployed to Unraid (port 85)
- ✅ Cloudflare tunnel configured
- ✅ Live at https://letters.wiki
- ✅ Deployment scripts ready (letters_deploy.sh, letters_rebuild.sh, letters_start.sh)

### Known Issues & TODOs

#### 🟢 Quick Fixes (2-5 minutes each)
1. **Revise header subtitle**
   - Current: "Build words on the board using tiles from your rack"
   - Needs: Something shorter like "Daily word puzzle"

2. **Fix instruction text**
   - Current: "Each word connects to the Wikipedia-inspired starting word."
   - Needs: Actual instruction like "Connect new words to existing tiles"

3. **Remove remaining off-color rectangle**
   - Still visible on live site above board
   - Check for residual padding/background

4. **Make Potential Words background transparent**
   - Currently has background color
   - Should be transparent for cleaner look

#### 🟡 Medium Tasks (10-20 minutes)
5. **Move Submit button to right sidebar**
   - Currently below board
   - Should be below Potential Words list

6. **Enable mobile drag and drop**
   - Add touch event handlers
   - Test on actual mobile devices

7. **Rack tile reordering**
   - Allow dragging tiles within rack
   - Helps organize tiles to spot words

#### 🔴 Larger Features (20+ minutes)
8. **Smart tile placement**
   - Find nearest empty square when dropping on occupied space
   - Calculate distances, auto-place in best spot

9. **UI layout improvements**
   - Review three-column layout effectiveness
   - Improve mobile responsiveness

10. **Mobile viewport optimization (Major Challenge)**
   - Keep entire game visible without scrolling
   - Fit board, rack, potential words, scores, and submit button on one screen
   - Maintain board legibility (15x15 grid is challenging on small screens)
   - Possible solutions:
     - Pinch-to-zoom on board only
     - Collapsible potential words sidebar
     - Floating/overlay submit button
     - Landscape orientation optimization
     - Dynamic sizing based on viewport height
   - Will require significant CSS media queries and possibly JS viewport detection

### File Structure
```
/Users/daverutledge/wikigames/letters/
├── index.html          # Main game HTML
├── script.js           # Game logic (1700+ lines)
├── styles.css          # All styling (1300+ lines)
├── cgi-bin/
│   ├── letters.py      # Generate daily tiles
│   ├── validate_word.py # Word validation
│   ├── submit_score.py # Score submission
│   └── get_scores.py   # Retrieve high scores
├── data/
│   ├── bignouns.txt    # Word list for generation
│   └── highscores/     # Daily high score storage
├── Dockerfile          # Container configuration
├── httpd.conf          # Apache configuration
├── requirements.txt    # Python dependencies
├── TODO_BUGS.md        # Detailed bug/feature list
└── tests/              # Playwright test files
```

### Key Code Sections

#### JavaScript (script.js)
- Lines 4-5: API_BASE configuration
- Lines 988-1035: checkWordValidity() - controls button visibility
- Lines 1042-1099: recallTiles() - recall functionality
- Lines 1497-1569: updateFooterSquares() - score display logic
- Lines 1650-1684: updateUI() - main UI update function

#### CSS (styles.css)
- Lines 41-57: Start Over button styling
- Lines 482-606: Tile rack with wood texture
- Lines 613-662: Shuffle and Recall buttons
- Lines 1256-1264: Total score display
- Score color classes: .score-low, .score-medium, .score-good, .score-great, .score-excellent

### Testing
- Run locally: `./letters_start.sh` (port 8085)
- Deploy to production: `./letters_deploy.sh`
- Test suite: `npx playwright test`

### Important Notes
- Game uses seed-based generation (changes daily at midnight)
- Backend expects Python scripts in /cgi-bin/
- All multipliers work correctly in scoring
- Share functionality uses clipboard API
- localStorage saves game state

### Next Session Priorities
1. Fix the quick text/visual issues (10 min total)
2. Move submit button (10 min)
3. Add mobile drag support (15 min)
4. Test everything on actual mobile device

### Contact & Access
- Production: https://letters.wiki
- GitHub: https://github.com/davebug/wikiletters (private)
- Unraid: Container "letters" on port 85
- Cloudflare: Tunnel configured to 192.168.4.89:85

---
*Project ready for pause. All code committed to GitHub. Beta is live and playable.*