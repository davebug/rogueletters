# High Score Feature - Testing Guide

## What Was Implemented

### Backend (Python CGI)
1. **get_high_score.py** - Fetch high score for a date
2. **submit_high_score.py** - Submit/update high score with:
   - Simple rate limiting (50/day per IP)
   - Input validation (size, format, range)
   - Board URL decompression check
   - Atomic file writes
   - Auto-cleanup of rate limits

### Frontend (HTML/CSS/JS)
1. **index.html** - High score section added to popup
2. **styles.css** - High score and achievement styles (version 10.8)
3. **script.js** - Integration with endGame flow:
   - `fetchHighScore()` - Get current high score
   - `submitHighScore()` - Submit new score
   - `showBasicPopupWithHighScore()` - Display and handle high scores

### Testing
1. **test_high_scores.py** - Python unit tests
2. **test-high-scores.spec.js** - Playwright E2E tests
3. **clear_high_scores.sh** - Utility to clear data

### Data Storage
- `/data/high_scores/YYYYMMDD.json` - One file per date
- `/data/rate_limits.json` - IP rate limiting tracker

---

## Testing Steps

### 1. Install Dependencies

```bash
cd /Users/daverutledge/wikigames/letters

# Install lzstring for Python
pip3 install lzstring

# Or with uv (as per CLAUDE.md)
uv pip install lzstring
```

### 2. Start Local Development Server

```bash
# Rebuild container with new requirements
./letters_rebuild.sh

# Or start if not running
./letters_start.sh
```

Server should be at: `http://localhost:8085`

### 3. Manual Testing

#### Test 1: First High Score
1. Navigate to `http://localhost:8085`
2. Play a game (or use console to end game):
   ```javascript
   // In browser console
   gameState.score = 75;
   gameState.seed = '20251008';
   gameState.preGeneratedShareURL = 'test';
   endGame();
   ```
3. Check popup shows:
   - "🏆 First high score of the day!"
   - High Score link with your score

#### Test 2: Beat High Score
1. Refresh page
2. Complete game with HIGHER score:
   ```javascript
   gameState.score = 90;
   gameState.seed = '20251008';
   gameState.preGeneratedShareURL = 'test2';
   endGame();
   ```
3. Should show:
   - "🏆 You got the new high score! Previous: 75"
   - Updated high score: 90

#### Test 3: Don't Beat High Score
1. Refresh page
2. Complete game with LOWER score:
   ```javascript
   gameState.score = 60;
   gameState.seed = '20251008';
   gameState.preGeneratedShareURL = 'test3';
   endGame();
   ```
3. Should show:
   - High Score: 90 (unchanged)
   - NO achievement message

#### Test 4: Click High Score Link
1. After any test above
2. Click the "High Score: XX" link in popup
3. Should navigate to shared board URL

#### Test 5: Rate Limiting
```bash
# Try submitting 51 times (should reject last one)
for i in {1..51}; do
  curl -X POST http://localhost:8085/cgi-bin/submit_high_score.py \
    -H "Content-Type: application/json" \
    -d "{\"date\":\"20251009\",\"score\":$i,\"board_url\":\"test\"}"
  echo ""
done
```

Should see "Rate limit exceeded" on 51st request.

### 4. Run Unit Tests

```bash
cd /Users/daverutledge/wikigames/letters

# Run Python tests
python3 tests/test_high_scores.py
```

### 5. Run Playwright E2E Tests

```bash
# Ensure Playwright is installed
npx playwright install

# Run high score tests
npx playwright test tests/playwright/test-high-scores.spec.js
```

### 6. Clear Data Between Tests

```bash
./clear_high_scores.sh
```

---

## Verification Checklist

**Backend:**
- [ ] get_high_score.py returns 404 for non-existent dates
- [ ] get_high_score.py returns high score when it exists
- [ ] submit_high_score.py rejects invalid date formats
- [ ] submit_high_score.py rejects scores out of range (0-999)
- [ ] submit_high_score.py rejects oversized payloads
- [ ] submit_high_score.py enforces rate limiting (50/day)
- [ ] submit_high_score.py only updates if score is higher
- [ ] Board URL decompression validation works

**Frontend:**
- [ ] Popup shows high score when it exists
- [ ] Popup shows achievement when high score is beaten
- [ ] Popup shows "First high score" for first submission
- [ ] Clicking high score link loads that board
- [ ] No high score shown when none exists
- [ ] No achievement shown when high score not beaten

**Integration:**
- [ ] Score automatically submitted on game completion
- [ ] High score automatically fetched and displayed
- [ ] Multiple games for same date work correctly
- [ ] Different dates have separate high scores

---

## Known Issues / TODOs

1. **Board URL Validation** - Currently basic check, could add:
   - Actual LZ-String decompression (requires lzstring Python library)
   - Board state structure validation
   - See line ~240 in submit_high_score.py

2. **Error Handling** - Frontend silently fails on errors:
   - Could add user-facing error messages
   - Currently: if fetch fails, just don't show high score

3. **Localhost Only** - Current implementation is for localhost:
   - Before production: Test in Docker container
   - Verify permissions on /usr/local/apache2/data/high_scores
   - Test with actual compressed board URLs

---

## Debugging Tips

### Check if high score was saved:
```bash
cat data/high_scores/20251008.json
```

### Check rate limits:
```bash
cat data/rate_limits.json
```

### View Python errors:
```bash
# In Docker container
docker logs letters

# Or check Apache error log
docker exec letters tail -f /usr/local/apache2/logs/error_log
```

### Test CGI scripts directly:
```bash
# Test get
curl "http://localhost:8085/cgi-bin/get_high_score.py?date=20251008"

# Test submit
curl -X POST http://localhost:8085/cgi-bin/submit_high_score.py \
  -H "Content-Type: application/json" \
  -d '{"date":"20251008","score":85,"board_url":"eNqrVkrOT0lVslIKzy_KSVGyUgKzYnVUMHRiawUA59EIxg"}'
```

---

## Next Steps Before Production

1. **Test in Docker** - Rebuild and test container
2. **Test with Real Board URLs** - Use actual compressed game states
3. **Clear Test Data** - Run `./clear_high_scores.sh` before deploy
4. **Monitor First Week** - Watch for abuse, errors, issues
5. **Consider Adding** (future enhancements):
   - Decompression timeout (if needed)
   - Better error messages to users
   - Analytics tracking
   - Admin tools for viewing/clearing high scores

---

## Files Changed

**Added:**
- `cgi-bin/get_high_score.py`
- `cgi-bin/submit_high_score.py`
- `tests/test_high_scores.py`
- `tests/playwright/test-high-scores.spec.js`
- `clear_high_scores.sh`
- `data/high_scores/` (directory)
- `HIGH_SCORE_TESTING_GUIDE.md` (this file)

**Modified:**
- `requirements.txt` (added lzstring)
- `index.html` (added high score section to popup, CSS v10.8)
- `styles.css` (added high score styles)
- `script.js` (added high score functions, made endGame async)

**Not Changed:**
- `Dockerfile` (will need update to install requirements.txt)
- `httpd.conf` (no changes needed - using existing CGI setup)
