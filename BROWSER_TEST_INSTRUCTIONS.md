# Browser Testing Instructions

## ✅ Server is Running

The Docker container is rebuilt and running at: **http://localhost:8085**

lzstring library is installed in the container ✓

**Fix Applied:** Board URL extraction now correctly parses the compressed URL from `gameState.preGeneratedShareURL` ✓

---

## 🧪 Manual Testing Steps

### Test 1: First High Score

1. **Navigate to:** http://localhost:8085
2. **Open browser console** (F12 or Cmd+Option+I)
3. **Run this command to complete a game:**
   ```javascript
   // Set a test score and complete game
   gameState.score = 75;
   gameState.seed = '20251008';
   gameState.preGeneratedShareURL = 'eNqrVkrOT0lVslIKzy_KSVGyUgKzYnVUMHRiawUA59EIxg';
   endGame();
   ```

4. **Expected Result:**
   - Popup appears
   - Shows "🏆 First high score of the day!"
   - Shows "High Score: 75" (clickable link)

---

### Test 2: Beat the High Score

1. **Refresh the page**
2. **In console, complete game with HIGHER score:**
   ```javascript
   gameState.score = 90;
   gameState.seed = '20251008';
   gameState.preGeneratedShareURL = 'eNqrVkrOT0lVslIKzy_KSVGyUgKzYnVUMHRiawUA59EIxh';
   endGame();
   ```

3. **Expected Result:**
   - Popup shows "🏆 You got the new high score!"
   - Shows "Previous: 75"
   - High score link now shows 90

---

### Test 3: Don't Beat High Score

1. **Refresh page again**
2. **Complete with LOWER score:**
   ```javascript
   gameState.score = 60;
   gameState.seed = '20251008';
   gameState.preGeneratedShareURL = 'eNqrVkrOT0lVslIKzy_KSVGyUgKzYnVUMHRiawUA59EIxi';
   endGame();
   ```

3. **Expected Result:**
   - Popup shows high score: 90 (unchanged)
   - NO achievement message
   - Score comparison visible

---

### Test 4: Different Date

1. **Refresh page**
2. **Complete with different date:**
   ```javascript
   gameState.score = 50;
   gameState.seed = '20251009';  // Different date
   gameState.preGeneratedShareURL = 'eNqrVkrOT0lVslIKzy_KSVGyUgKzYnVUMHRiawUA59EIxj';
   endGame();
   ```

3. **Expected Result:**
   - Shows "First high score of the day!" for this new date
   - Each date has independent high scores

---

### Test 5: Play Normally

1. **Refresh page**
2. **Play a real game** (place tiles, submit words, etc.)
3. **When game completes naturally:**
   - High score should be fetched and displayed
   - If you beat it, achievement shows
   - All automatic, no manual action needed

---

## 🔍 Verify Data Storage

**Check if high score was saved:**
```bash
cat data/high_scores/20251008.json
```

**Expected output:**
```json
{
  "date": "20251008",
  "score": 90,
  "board_url": "eNqrVkrOT0lVslIKzy_KSVGyUgKzYnVUMHRiawUA59EIxh",
  "timestamp": "2025-10-08T..."
}
```

**Check rate limits:**
```bash
cat data/rate_limits.json
```

---

## 🧹 Clear Data

**Between tests:**
```bash
./clear_high_scores.sh
```

---

## 🐛 Debug Issues

**If popup doesn't show high score:**
1. Check browser console for errors
2. Check network tab for failed requests
3. Verify CGI endpoints are accessible:
   ```
   http://localhost:8085/cgi-bin/get_high_score.py?date=20251008
   ```

**If submission fails:**
1. Check Docker logs:
   ```bash
   docker logs letters-dev
   ```
2. Check Apache error log:
   ```bash
   docker exec letters-dev tail -f /usr/local/apache2/logs/error_log
   ```

**Common issues:**
- Board URL decompression fails: Use a real compressed URL from the game
- Rate limit exceeded: Clear rate_limits.json
- Permission errors: Check Docker container logs

---

## ✅ What to Look For

**Visual Indicators:**
- ✓ Gold gradient achievement box with trophy emoji
- ✓ Green clickable "High Score: XX" link
- ✓ Smooth celebration animation (0.5s scale)
- ✓ Previous score shown in small text

**Functionality:**
- ✓ Automatic fetch on game completion
- ✓ Automatic submission if score is higher
- ✓ High score link navigates to shared board
- ✓ Different dates have separate high scores
- ✓ Achievement only shows when score beaten

---

## 📊 Test Results Checklist

- [ ] First high score shows achievement
- [ ] Beating high score updates and shows achievement
- [ ] Not beating high score shows old score (no achievement)
- [ ] Different dates have independent high scores
- [ ] High score link is clickable
- [ ] Data persists between page refreshes
- [ ] Rate limiting works (50 submissions/day)
- [ ] Popup shows correctly styled
- [ ] No console errors
- [ ] Backend endpoints return valid JSON

---

## 🎯 Next Steps After Testing

If all tests pass:
1. Run Python unit tests: `python3 tests/test_high_scores.py`
2. Run Playwright tests: `npx playwright test tests/playwright/test-high-scores.spec.js`
3. Clear test data: `./clear_high_scores.sh`
4. Ready for production deployment

If tests fail:
- Check console errors
- Review Docker logs
- Verify lzstring is installed in container
- Check file permissions
