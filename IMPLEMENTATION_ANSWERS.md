# High Score Implementation - Research Findings

## Summary of Answers to Your Questions

### 1. Testing Locally

**Current Setup:**
- Development environment uses `docker-compose.dev.yml`
- Local data directory: `/Users/daverutledge/wikigames/letters/data/`
- Container path: `/usr/local/apache2/data/`

**Testing Strategy:**
```bash
# Start local dev container
./letters_start.sh

# Test endpoints:
curl "http://localhost:8085/cgi-bin/get_high_score.py?date=20251008"
curl -X POST http://localhost:8085/cgi-bin/submit_high_score.py \
  -H "Content-Type: application/json" \
  -d '{"date":"20251008","score":87,"board_url":"test123"}'

# View local data files
ls -la data/high_scores/
cat data/high_scores/20251008.json
```

**Mock Data:**
- Create `data/high_scores/` directory locally
- Add test JSON files for development

### 2. Current Completion Popup Structure

**HTML (lines 150-180 in index.html):**
```html
<div id="game-popup" class="hidden">
    <div class="popup-content">
        <button id="popup-close-x" class="popup-close-btn">×</button>
        <h2 id="popup-title">Game Complete!</h2>
        <div id="popup-score-section">
            <div id="popup-score-label">Your Score</div>
            <div id="popup-score-value">0</div>
        </div>
        <div id="popup-buttons">
            <button id="share-popup-btn" class="popup-btn-primary">Share Score</button>
            <button id="share-board-btn" class="popup-btn-secondary">Share Board</button>
        </div>
        <!-- Game tabs here -->
    </div>
</div>
```

**JavaScript Flow (script.js):**
1. `endGame()` called when game completes (line 2299)
2. `generateShareableBoardURL()` creates and stores URL in `gameState.preGeneratedShareURL` (line 2975-3033)
3. `showBasicPopup()` displays the popup (line 2363)

**Where to Add High Score Info:**
Insert new HTML section between `popup-score-section` and `popup-buttons`:
```html
<div id="popup-high-score-section" style="display: none;">
    <div class="high-score-comparison">
        High Score: <a href="#" id="high-score-link">92</a>
    </div>
</div>
```

**CSS Already Available:**
- Popup styling complete (lines 1452-1631 in styles.css)
- Just need to add high score comparison styles from implementation doc

### 3. Python Dependencies

**Current State:**
- Python 3.11 installed in Docker (Dockerfile line 4)
- requirements.txt is EMPTY (lines 1-3: just comments)
- No lzstring library installed yet

**What's Needed:**
```txt
# Add to requirements.txt:
lzstring
```

**Installation in Docker:**
Update Dockerfile after line 6:
```dockerfile
# Install Python dependencies
COPY requirements.txt /tmp/
RUN pip3 install -r /tmp/requirements.txt
```

**For Local Development:**
```bash
pip3 install lzstring
# OR with uv (as per CLAUDE.md)
uv pip install lzstring
```

### 4. Data Directory Structure

**Already Created:**
- Dockerfile creates `/usr/local/apache2/data/highscores` (line 11)
- Permissions set to www-data:www-data (line 34)
- Permissions: 755 (line 35)

**Local Development:**
- Directory exists: `/Users/daverutledge/wikigames/letters/data/highscores/`
- Already has test files from old leaderboard implementation

**For New System:**
```bash
# Create high_scores directory (different from old highscores)
mkdir -p data/high_scores

# Or reuse existing highscores directory
# Files will be different format (single score vs array)
```

**No Permissions Issues:**
- Docker handles this automatically
- Local dev runs as your user (no issues)

### 5. Error Handling UX

**Current Error Pattern (from existing CGI scripts):**
- Always return JSON with `success` boolean
- Include error message on failure
- Return empty/null data gracefully

**Example from get_scores.py:**
```python
try:
    # ... logic ...
    print(json.dumps({'success': True, 'data': result}))
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e)}))
```

**Recommended UX for High Score Fetch Failure:**
```javascript
async function fetchHighScore(date) {
    try {
        const response = await fetch(`/cgi-bin/get_high_score.py?date=${date}`);
        const data = await response.json();

        if (data.success && data.score) {
            return data;
        }
        return null; // No high score exists or error
    } catch (err) {
        console.error('Failed to fetch high score:', err);
        return null; // Silent fail - just don't show high score
    }
}

// In showBasicPopup():
const highScoreData = await fetchHighScore(gameState.seed);
if (highScoreData) {
    // Show high score section
} else {
    // Hide high score section - show only user's score
}
```

**No Retry Logic Needed:**
- Single attempt on game completion
- Silent fail = just don't show high score (user experience unchanged)
- User can refresh page to try again

### 6. Date Format Used

**Date Format: YYYYMMDD (8 digits)**
- Examples: "20251008", "20250929"
- Stored in `gameState.seed`
- Used for all API calls and file names

**Usage in Implementation:**
```javascript
// In endGame() or showBasicPopup():
const date = gameState.seed; // e.g., "20251008"

// Fetch high score
await fetch(`/cgi-bin/get_high_score.py?date=${date}`);

// Submit high score
await fetch('/cgi-bin/submit_high_score.py', {
    body: JSON.stringify({
        date: date,
        score: gameState.score,
        board_url: gameState.preGeneratedShareURL
    })
});
```

**File Naming:**
- Current: `data/highscores/20250929.json` (old leaderboard)
- New: `data/high_scores/20251008.json` (single high score)

### 7. Board URL Availability

**Perfect - Already Generated!**
- `gameState.preGeneratedShareURL` contains the compressed board URL
- Generated in `endGame()` BEFORE popup shows
- Includes full game state (tiles, positions, words, etc.)

**URL Format Examples:**
```
// V3 compressed (preferred):
https://letters.wiki/?seed=20251008&s=...&v3=1

// LZ-String compressed (fallback):
https://letters.wiki/?seed=20251008&s=eJxTYGBg4A...

// Seed-only (fallback):
https://letters.wiki/?seed=20251008
```

**What to Store:**
- Just the `s=` parameter value (the compressed part)
- OR the full URL (simpler)
- Recommendation: Store full URL (easier to use)

## Implementation Integration Points

### JavaScript Changes (script.js)

**Modify `endGame()` function (around line 2299):**
```javascript
async function endGame() {
    gameState.isGameOver = true;

    // ... existing code ...

    // Pre-generate shareable URL for instant copying later
    await generateShareableBoardURL();

    // NEW: Fetch high score before showing popup
    const currentHighScore = await fetchHighScore(gameState.seed);

    // Show popup with high score data
    showBasicPopup(currentHighScore);
}
```

**Modify `showBasicPopup()` function (around line 2363):**
```javascript
function showBasicPopup(highScoreData = null) {
    const popup = document.getElementById('game-popup');
    const scoreElement = document.getElementById('popup-score-value');
    const titleElement = document.getElementById('popup-title');
    const score = gameState.score || 0;

    // ... existing score display ...

    // NEW: Show high score comparison if available
    const highScoreSection = document.getElementById('popup-high-score-section');
    if (highScoreData && highScoreData.score) {
        document.getElementById('high-score-link').textContent = highScoreData.score;
        document.getElementById('high-score-link').onclick = () => {
            loadSharedGame(highScoreData.board_url);
        };
        highScoreSection.style.display = 'block';

        // NEW: Auto-submit if user beat high score
        if (score > highScoreData.score) {
            submitHighScore(gameState.seed, score, gameState.preGeneratedShareURL)
                .then(result => {
                    if (result.is_new_high_score) {
                        showNewHighScoreMessage(score, highScoreData.score);
                    }
                });
        }
    } else {
        highScoreSection.style.display = 'none';
    }

    popup.classList.remove('hidden');
}
```

### New Python CGI Scripts Needed

**1. `/cgi-bin/get_high_score.py`**
- Read from `data/high_scores/{date}.json`
- Return single high score object or empty
- Already have pattern from existing `get_scores.py`

**2. `/cgi-bin/submit_high_score.py` (NEW - different from existing)**
- Accept: date, score, board_url
- **CRITICAL: Implement all security measures** (see below)
- Validate board_url decompresses (using lzstring with timeout)
- Compare to existing high score
- Write only if higher
- Return: success, is_new_high_score, previous_score

## ⚠️ CRITICAL SECURITY REQUIREMENTS

**This is NOT optional** - without these protections, attackers can:
- Fill your disk with garbage data
- Crash your server with compression bombs
- DOS your server with spam requests
- Write arbitrary files via directory traversal

### Essential Security Measures (ALL REQUIRED)

**1. Input Size Limits:**
```python
MAX_REQUEST_SIZE = 102400        # 100KB max request body
MAX_BOARD_URL_LENGTH = 50000     # 50KB compressed max
MAX_DECOMPRESSED_SIZE = 500000   # 500KB decompressed max
MAX_SCORE = 999                  # Reasonable score limit
MAX_FILE_SIZE = 1000000          # 1MB max JSON file
```

**2. Rate Limiting:**

For low traffic (<1000 players/day), use **Simple Approach**:
```python
MAX_SUBMISSIONS_PER_DAY = 50  # Per IP address

def check_rate_limit(ip_address):
    """Simple: 50 submissions/day per IP with auto-cleanup"""
    ip_key = hashlib.md5(ip_address.encode()).hexdigest()[:12]
    now = time.time()
    day_ago = now - 86400

    # Load limits, filter to last 24h, check count
    # Auto-cleanup old entries
    # Fail open if file write fails

    # See HIGH_SCORE_IMPLEMENTATION.md for full code
```

For high traffic (>1000 players/day), use **Robust Approach** (20/hour per IP with SHA256 hashing)

**3. Decompression Safety (5 second timeout):**
```python
def decompress_with_timeout(board_url, timeout=5):
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(timeout)
    # Decompress and validate size
    signal.alarm(0)
```

**4. Input Validation (prevent directory traversal):**
```python
if not re.match(r'^\d{8}$', date):
    raise ValueError("Invalid date format")
```

**5. Atomic File Operations (prevent corruption):**
```python
import tempfile
import os
import shutil

# Write to temp file first
with tempfile.NamedTemporaryFile(mode='w', delete=False, dir=scores_dir) as tmp:
    json.dump(new_data, tmp, indent=2)
    tmp_name = tmp.name

# Check size before commit
if os.path.getsize(tmp_name) > MAX_FILE_SIZE:
    os.remove(tmp_name)
    raise ValueError("Data too large")

# Atomic rename
shutil.move(tmp_name, score_file)
```

**See HIGH_SCORE_IMPLEMENTATION.md for complete security implementation details.**

### HTML Changes (index.html)

**Add after line 158 (`popup-score-section`):**
```html
<!-- High Score Section -->
<div id="popup-high-score-section" style="display: none;">
    <div class="high-score-comparison">
        High Score: <a href="#" id="high-score-link">0</a>
    </div>
    <div id="high-score-achievement" style="display: none;">
        🏆 You got the new high score!
    </div>
</div>
```

### CSS Changes (styles.css)

**Add after line 1505 (popup styles):**
```css
/* High Score Section in Popup */
.high-score-comparison {
    font-size: 16px;
    color: #666;
    margin: 15px 0;
}

.high-score-comparison a {
    color: #4CAF50;
    text-decoration: underline;
    cursor: pointer;
    font-weight: bold;
}

.high-score-comparison a:hover {
    color: #45a049;
}

#high-score-achievement {
    background: linear-gradient(135deg, #FFD700, #FFA500);
    color: white;
    font-weight: bold;
    padding: 15px;
    margin: 15px 0;
    border-radius: 8px;
    text-align: center;
    animation: celebration 0.5s ease-out;
}

@keyframes celebration {
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); opacity: 1; }
}
```

## Testing Checklist

### Functional Testing
- [ ] Local: Create test high score file manually
- [ ] Local: Verify get_high_score.py returns data
- [ ] Local: Submit higher score, verify file updates
- [ ] Local: Submit lower score, verify no change
- [ ] Local: Click high score link, verify board loads
- [ ] Local: Test with no high score (first play of day)
- [ ] Container: Test with rebuilt Docker image
- [ ] Container: Verify permissions work for writes

### Security Testing (CRITICAL - DO NOT SKIP)
- [ ] Test massive payload (100KB+ request) → rejected
- [ ] Test invalid decompression → rejected
- [ ] Test directory traversal (`../../etc/passwd`) → rejected
- [ ] Test rate limiting (25 requests) → first 20 succeed, rest rejected
- [ ] Test score out of range (9999) → rejected
- [ ] Test compression bomb (if possible) → timeout & rejected
- [ ] Test concurrent submissions → no file corruption
- [ ] Verify rate_limits.json created and managed
- [ ] Verify temp files cleaned up on error
- [ ] Test Apache LimitRequestBody enforced

### Production Deployment
- [ ] All security tests pass
- [ ] Monitoring/logging configured
- [ ] Deploy and monitor first day
- [ ] Watch for attack patterns in logs

## Deployment Steps

1. **Add lzstring to requirements:**
   ```bash
   echo "lzstring" >> requirements.txt
   ```

2. **Update Dockerfile to install requirements:**
   ```dockerfile
   # Add after line 6 (after Python installation):
   COPY requirements.txt /tmp/
   RUN pip3 install -r /tmp/requirements.txt
   ```

3. **Update httpd.conf for security:**
   ```apache
   # Add to httpd.conf:
   LimitRequestBody 102400
   Timeout 30
   ```

4. **Create new CGI scripts with security:**
   - `cgi-bin/get_high_score.py` (simple read)
   - `cgi-bin/submit_high_score.py` (WITH ALL SECURITY MEASURES)
     - Input size limits
     - Rate limiting
     - Decompression timeout
     - Input validation
     - Atomic writes

5. **Update frontend files:**
   - index.html (add high score section to popup)
   - styles.css (add high score styles)
   - script.js (modify endGame and showBasicPopup)

6. **Test locally (including security tests):**
   ```bash
   ./letters_rebuild.sh
   # Run ALL security tests from checklist
   ```

7. **Deploy to production:**
   ```bash
   # ONLY deploy after ALL security tests pass
   ./letters_deploy.sh
   ```

## Questions Resolved

✅ **Testing**: Use local dev container, create mock JSON files
✅ **Popup Structure**: Exists, needs high score section added between score and buttons
✅ **Dependencies**: Need to add lzstring to requirements.txt
✅ **Data Directory**: Already created, permissions set
✅ **Error Handling**: Silent fail (just don't show high score)
✅ **Date Format**: YYYYMMDD (gameState.seed)
✅ **Board URL**: Already in gameState.preGeneratedShareURL

## Recommended Approach for Low Traffic (<1000 players/day)

**Use Simplified Security Stack:**

1. ✅ **Input Size Limits** - MAX_REQUEST_SIZE: 100KB, MAX_BOARD_URL: 50KB
2. ✅ **Input Validation** - Date regex, score range (0-999)
3. ✅ **Simple Rate Limiting** - 50 submissions/day per IP (30-45 min to add)
4. ✅ **Basic Decompression Check** - Validate board_url decompresses
5. ✅ **Atomic File Writes** - Prevent corruption
6. ✅ **File Size Check** - Max 1MB per file

**What to Skip (for now):**
- ❌ Complex rate limiting (hourly tracking, SHA256 hashing)
- ❌ Decompression timeout (trust lzstring library)
- ❌ Advanced monitoring (add if traffic grows)

**Benefits:**
- 6-8 hours total implementation (not 8-11)
- Adequate security for scale
- Easy to enhance later if needed

## Next Steps

1. Update requirements.txt and Dockerfile
2. Create new CGI scripts with **simplified security**:
   - `get_high_score.py` (simple read)
   - `submit_high_score.py` (with simple rate limiting + validation)
3. Modify index.html to add high score section
4. Update styles.css with high score styles
5. Modify script.js to integrate high score flow
6. Test locally with docker-compose.dev.yml
7. Test rate limiting (submit 51 times, verify rejection)
8. Deploy to production

**Total Estimated Time**: 6-8 hours (simplified approach for low traffic)
