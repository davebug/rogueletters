# High Score Tracking Implementation Plan

## Quick Start - Which Approach?

### 🟢 Use **SIMPLE APPROACH** if:
- Expected traffic: **<1000 players/day** (most hobby projects)
- Effort: **6.5-8.5 hours**
- Security: **Simplified but adequate**
  - 50 submissions/day per IP rate limiting
  - Basic input validation
  - Auto-cleanup, fail-open design

### 🟠 Use **ROBUST APPROACH** if:
- Expected traffic: **>1000 players/day** (viral/commercial)
- Effort: **8-11 hours**
- Security: **Enterprise-grade**
  - 20 submissions/hour per IP (SHA256 hashing)
  - Decompression timeout with signal handling
  - Comprehensive attack testing

**→ For 100 players/day: Use SIMPLE APPROACH** (documented below)

---

## Overview
Implement a system to track and display the highest score achieved for each datestamp (daily puzzle), with the ability to view the board that achieved that score.

**Design Philosophy**: **Trust with Transparency + Zero Friction**
- Store submitted scores without server-side recalculation (much simpler)
- Anyone can click the high score to load and verify the actual board
- No attribution/names = no incentive to cheat
- Self-policing through transparent board sharing
- **Automatic submission** - no user action required
- **Automatic notification** - celebrate when user achieves high score

## User Experience

### Display
- **Only shown in completion popup** (not in header during play)
- Shows user's score vs. current high score
- If user beat high score → Shows celebration message
- High score is clickable → loads that board

### Flow
1. Player loads puzzle → No high score displayed (simpler UI)
2. Player completes game → Completion popup appears
3. **Automatically** fetch current high score for today
4. Show in popup: "Your Score: 87 | High Score: 72"
5. **Automatically** check if user's score beats high score
6. If yes → Submit in background + show "🏆 You got the new high score!"
7. If no → Just show current high score (clickable to view that board)

**Key Benefits:**
- Cleaner main UI (no header clutter)
- High score only relevant after completion
- Zero friction - all automatic on completion
- No page load performance impact (fetch only on completion)
- Minimal storage (~110 KB/year, only one score per date)

## Architecture

### Storage Design

**Recommended: JSON Files (Simple & Sufficient)**
- Directory: `data/high_scores/`
- File per date: `20251008.json`
```json
{
  "date": "20251008",
  "score": 87,
  "board_url": "eJxTYGBg4A...",
  "submitted_at": "2025-10-08T14:23:45Z"
}
```

**Why JSON over Database:**
- Simpler (no schema, no migrations)
- Human-readable (easy to inspect/debug)
- Easy backups (just copy directory)
- Atomic writes with temp file + rename
- One file per date = no queries needed
- Overkill avoided (not building a full leaderboard system)

### Backend Components (Python CGI)

#### 1. `cgi-bin/get_high_score.py`
**Purpose**: Retrieve the high score for a given date

**Parameters**:
- `date` (required): YYYYMMDD format

**Response**:
```json
{
  "success": true,
  "date": "20251008",
  "score": 87,
  "board_url": "eJxTYGBg4A..."
}
```

**Logic**:
1. Validate date format
2. Query database/file for the date
3. Return high score data or empty result if none exists

#### 2. `cgi-bin/submit_high_score.py`
**Purpose**: Submit a new score and update if it's higher than current

**Parameters**:
- `date` (required): YYYYMMDD format
- `score` (required): Integer score
- `board_url` (required): Compressed board state

**Response**:
```json
{
  "success": true,
  "is_new_high_score": true,
  "previous_score": 72,
  "new_score": 87
}
```

**Logic**:
1. Validate all parameters
2. **CRITICAL**: Decompress and validate the board URL
3. **CRITICAL**: Re-calculate the score from the board state
4. Verify recalculated score matches submitted score
5. Check if score > current high score for this date
6. If higher, update database/file atomically
7. Return result

### Score Validation (Trust with Transparency)

**Philosophy**: Don't recalculate scores server-side. Instead, rely on transparency - anyone can click the high score to see the actual board and verify it.

**Why This Works**:
- No names/attribution = no incentive to cheat
- Board URL is clickable = instant verification
- Cheater exposed immediately when board doesn't match score
- Much simpler implementation

**Minimal Validation**:
```python
def validate_board_url(board_url):
    """
    Just verify the board URL is valid/decompressible.
    Don't recalculate score - trust it.
    """
    try:
        decompressed = lzstring.decompress(board_url)
        data = json.loads(decompressed)
        # Basic structure check
        assert 'tiles' in data
        assert 'words' in data
        return True
    except:
        return False
```

**Edge Cases**:
- Someone submits garbage URL → Validation fails, rejected
- Someone steals another player's board URL → So what? Board is public anyway
- Obvious fake score (999) with real board → Anyone clicking sees the mismatch

### Frontend Components (JavaScript)

#### 1. On Game Completion (Main Flow)
```javascript
async function onGameComplete(userScore, boardUrl, date) {
    // 1. Fetch current high score
    const highScoreData = await fetchHighScore(date);
    const currentHighScore = highScoreData?.score || 0;

    // 2. Display completion popup with high score comparison
    showCompletionPopup(userScore, currentHighScore, highScoreData?.board_url);

    // 3. If user beat high score, auto-submit
    if (userScore > currentHighScore) {
        const result = await submitHighScore(date, userScore, boardUrl);

        if (result.success && result.is_new_high_score) {
            // Update popup to show achievement
            showNewHighScoreMessage(userScore, currentHighScore);
        }
    }
}
```

#### 2. Fetch High Score
```javascript
async function fetchHighScore(date) {
    const response = await fetch(`/cgi-bin/get_high_score.py?date=${date}`);
    const data = await response.json();
    return data.success ? data : null;
}
```

#### 3. Submit New High Score
```javascript
async function submitHighScore(date, score, boardUrl) {
    const response = await fetch('/cgi-bin/submit_high_score.py', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `date=${date}&score=${score}&board_url=${encodeURIComponent(boardUrl)}`
    });
    return await response.json();
}
```

#### 4. Completion Popup Display
```javascript
function showCompletionPopup(userScore, highScore, highScoreBoardUrl) {
    const popup = document.getElementById('completion-popup');

    let html = `<div class="score-display">Your Score: ${userScore}</div>`;

    if (highScore > 0) {
        html += `<div class="high-score-comparison">
            High Score: <a href="#" onclick="loadSharedBoard('${highScoreBoardUrl}')">${highScore}</a>
        </div>`;
    }

    popup.innerHTML = html;
    popup.style.display = 'block';
}

function showNewHighScoreMessage(newScore, previousScore) {
    const message = previousScore > 0
        ? `🏆 You got the new high score! (Previous: ${previousScore})`
        : `🏆 First high score of the day!`;

    const popup = document.getElementById('completion-popup');
    popup.innerHTML += `<div class="high-score-achievement">${message}</div>`;
}
```

**Edge Cases:**
- No high score exists yet (first play of day) → Show only user's score
- User didn't beat high score → Show "Your Score: 87 | High Score: 92" (clickable)
- User beat high score → Show celebration message + update high score display
- Fetch/submit fails → Degrade gracefully, show only user's score

#### 5. UI Integration Points
- **On game completion only** → `onGameComplete(userScore, boardUrl, date)`
- **No page load fetch** → Simpler, faster initial load
- **High score click** → `loadSharedBoard(boardUrl)` (reuse existing logic)

### UI Design

**Location**: Inside completion popup (shown after game ends)

```html
<div id="completion-popup" class="popup">
    <div class="score-display">Your Score: 87</div>

    <!-- If high score exists and user didn't beat it: -->
    <div class="high-score-comparison">
        High Score: <a href="#" onclick="loadSharedBoard('...')">92</a>
    </div>

    <!-- If user beat high score: -->
    <div class="high-score-achievement">
        🏆 You got the new high score! (Previous: 72)
    </div>

    <button class="share-button">Share</button>
</div>
```

**CSS**:
```css
.score-display {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 10px;
}

.high-score-comparison {
    font-size: 18px;
    color: #666;
    margin-bottom: 15px;
}

.high-score-comparison a {
    color: #4CAF50;
    text-decoration: underline;
    cursor: pointer;
}

.high-score-comparison a:hover {
    color: #45a049;
}

.high-score-achievement {
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

## Security Considerations ⚠️ CRITICAL

### ⚠️ Attack Vectors (Must Protect Against)

**1. Massive Payload Attack**
- Attacker sends 10MB board URL → fills disk
- Compression bomb: 1KB → 1GB decompressed → crashes server
- Spam: 10,000 submissions/second → DOS

**2. Data Injection**
- Malicious JSON in board URL
- Directory traversal in date parameter
- Arbitrary file writes

### 🛡️ Essential Security Measures (NOT OPTIONAL)

#### 1. Input Size Limits (CRITICAL)
```python
MAX_REQUEST_SIZE = 102400        # 100KB max request body
MAX_BOARD_URL_LENGTH = 50000     # 50KB compressed max
MAX_DECOMPRESSED_SIZE = 500000   # 500KB decompressed max
MAX_SCORE = 999                  # Reasonable score limit
MAX_FILE_SIZE = 1000000          # 1MB max JSON file
```

**Implementation:**
- Check `Content-Length` before reading request
- Reject oversized requests immediately (save CPU)
- Validate decompressed size to prevent bombs
- Delete files that exceed MAX_FILE_SIZE

#### 2. Rate Limiting (CRITICAL)

**Two Approaches Based on Traffic:**

##### A) Simple Approach (Low Traffic: <1000 players/day)
```python
MAX_SUBMISSIONS_PER_DAY = 50     # Per IP address
RATE_LIMIT_FILE = '/usr/local/apache2/data/rate_limits.json'

def check_rate_limit(ip_address):
    """Simple rate limiting: 50 submissions/day per IP"""

    # Optional: Hash IP for basic privacy
    ip_key = hashlib.md5(ip_address.encode()).hexdigest()[:12]

    now = time.time()
    day_ago = now - 86400  # 24 hours

    # Load or create rate limit data
    if os.path.exists(RATE_LIMIT_FILE):
        try:
            with open(RATE_LIMIT_FILE, 'r') as f:
                limits = json.load(f)
        except:
            limits = {}
    else:
        limits = {}

    # Get this IP's recent submissions (auto-cleanup old ones)
    if ip_key in limits:
        # Filter to only last 24 hours
        recent = [ts for ts in limits[ip_key] if ts > day_ago]

        # Check if exceeded limit
        if len(recent) >= MAX_SUBMISSIONS_PER_DAY:
            return False  # Rate limited

        # Add current timestamp
        limits[ip_key] = recent + [now]
    else:
        # First submission from this IP
        limits[ip_key] = [now]

    # Clean up old IPs (haven't submitted in 24h)
    limits = {k: v for k, v in limits.items() if any(ts > day_ago for ts in v)}

    # Save updated limits
    try:
        with open(RATE_LIMIT_FILE, 'w') as f:
            json.dump(limits, f)
    except:
        pass  # Fail open - if write fails, still allow submission

    return True  # Allowed
```

**Why This Works for Low Traffic:**
- Simple JSON file (one file, auto-cleanup)
- Generous limit (50/day vs 20/hour)
- Fail-open (graceful degradation)
- ~30-45 minutes to implement
- Minimal overhead

##### B) Robust Approach (High Traffic: >1000 players/day)
```python
MAX_SUBMISSIONS_PER_HOUR = 20    # Per IP address
RATE_LIMIT_FILE = '/usr/local/apache2/data/rate_limits.json'

def check_rate_limit(ip_address):
    # Hash IP for privacy
    ip_hash = hashlib.sha256(f"{ip_address}:SECRET_SALT".encode()).hexdigest()

    # Track last hour of submissions
    now = time.time()
    hour_ago = now - 3600

    # Load existing limits
    limits = load_limits()

    # Count recent submissions from this IP
    if ip_hash in limits:
        recent = [ts for ts in limits[ip_hash] if ts > hour_ago]
        if len(recent) >= MAX_SUBMISSIONS_PER_HOUR:
            return False  # REJECT
        limits[ip_hash] = recent + [now]
    else:
        limits[ip_hash] = [now]

    # Save atomically
    save_limits(limits)
    return True
```

**When to Use Robust Approach:**
- High traffic (>1000 players/day)
- Strict security requirements
- Need strong IP privacy (SHA256 hashing)
- Tighter limits (per-hour vs per-day)

**Why Essential (Either Approach):**
- Without rate limiting: server can be overwhelmed
- Prevents spam and abuse
- Low overhead for benefit provided

#### 3. Decompression Safety (CRITICAL)
```python
import signal

def decompress_with_timeout(board_url, timeout=5):
    """Decompress with timeout to prevent hang/DOS"""

    def timeout_handler(signum, frame):
        raise TimeoutError("Decompression timeout")

    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(timeout)

    try:
        decompressed = lzstring.decompress(board_url)
        signal.alarm(0)  # Cancel timeout

        if not decompressed:
            raise ValueError("Invalid compression")

        # Check decompressed size BEFORE parsing
        if len(decompressed) > MAX_DECOMPRESSED_SIZE:
            raise ValueError("Decompressed data too large")

        # Validate JSON structure
        board_data = json.loads(decompressed)
        if not isinstance(board_data, dict):
            raise ValueError("Invalid board structure")

        return board_data

    except TimeoutError:
        raise ValueError("Decompression timeout - possible bomb")
    finally:
        signal.alarm(0)  # Always cancel
```

**Why Essential:**
- Compression bombs can hang server indefinitely
- 5-second timeout prevents DOS
- Size check before parsing prevents memory exhaustion

#### 4. Input Validation (CRITICAL)
```python
def validate_submission(data):
    """Validate ALL inputs before processing"""

    # 1. Date format (prevent directory traversal)
    date = data.get('date', '')
    if not re.match(r'^\d{8}$', date):
        raise ValueError("Invalid date format")

    # Check date is reasonable (2020-2099)
    year = int(date[:4])
    if year < 2020 or year > 2099:
        raise ValueError("Invalid date range")

    # 2. Score validation
    score = int(data.get('score', 0))
    if score < 0 or score > MAX_SCORE:
        raise ValueError(f"Score must be 0-{MAX_SCORE}")

    # 3. Board URL length
    board_url = data.get('board_url', '')
    if len(board_url) > MAX_BOARD_URL_LENGTH:
        raise ValueError("Board URL too large")

    # 4. Board URL content (basic check)
    if not board_url or not isinstance(board_url, str):
        raise ValueError("Invalid board URL")

    return date, score, board_url
```

**Why Essential:**
- Date validation prevents directory traversal (`../../etc/passwd`)
- Score validation prevents nonsense data
- Board URL validation prevents payload attacks

#### 5. Atomic File Operations (CRITICAL)
```python
import tempfile
import shutil

def atomic_write(filepath, data):
    """Write file atomically to prevent corruption"""

    directory = os.path.dirname(filepath)

    # Write to temp file first
    with tempfile.NamedTemporaryFile(
        mode='w',
        delete=False,
        dir=directory,
        prefix='.tmp_'
    ) as tmp:
        json.dump(data, tmp, indent=2)
        tmp_path = tmp.name

    # Check file size before committing
    if os.path.getsize(tmp_path) > MAX_FILE_SIZE:
        os.remove(tmp_path)
        raise ValueError("Data exceeds maximum file size")

    # Atomic rename (overwrites existing)
    shutil.move(tmp_path, filepath)
```

**Why Essential:**
- Prevents corrupted files from concurrent writes
- File size check before commit prevents disk exhaustion
- Temp file cleanup on error

#### 6. Apache/Server Level Protection
```conf
# In httpd.conf or .htaccess:
LimitRequestBody 102400        # 100KB max (Apache enforces)
Timeout 30                     # 30 second request timeout
```

**Why Essential:**
- Enforced at web server level (defense in depth)
- Protects even if Python validation fails
- Prevents slow-loris attacks

### 🔍 Attack Scenario Testing

**Test these before deploying:**
```bash
# 1. Massive payload
curl -X POST http://localhost:8085/cgi-bin/submit_high_score.py \
  -d '{"date":"20251008","score":99,"board_url":"'$(python -c 'print("A"*100000)')'"}'

# Expected: Rejected (payload too large)

# 2. Invalid decompression
curl -X POST http://localhost:8085/cgi-bin/submit_high_score.py \
  -d '{"date":"20251008","score":99,"board_url":"INVALID_GARBAGE"}'

# Expected: Rejected (decompression failed)

# 3. Directory traversal
curl -X POST http://localhost:8085/cgi-bin/submit_high_score.py \
  -d '{"date":"../../etc/passwd","score":99,"board_url":"test"}'

# Expected: Rejected (invalid date format)

# 4. Rate limit
for i in {1..25}; do
  curl -X POST http://localhost:8085/cgi-bin/submit_high_score.py \
    -d '{"date":"20251008","score":'$i',"board_url":"test"}'
done

# Expected: First 20 succeed, rest rejected (rate limited)

# 5. Score out of range
curl -X POST http://localhost:8085/cgi-bin/submit_high_score.py \
  -d '{"date":"20251008","score":99999,"board_url":"test"}'

# Expected: Rejected (score > MAX_SCORE)
```

### 📋 Security Checklist (All Required)

**Before Deployment:**
- [ ] MAX_REQUEST_SIZE enforced
- [ ] MAX_BOARD_URL_LENGTH enforced
- [ ] MAX_DECOMPRESSED_SIZE checked
- [ ] Rate limiting per IP implemented
- [ ] Decompression timeout (5 seconds)
- [ ] Date format validation (regex)
- [ ] Score range validation (0-999)
- [ ] Atomic file writes
- [ ] File size check before commit
- [ ] Apache LimitRequestBody set
- [ ] All attack scenarios tested
- [ ] Monitoring/logging in place

**Monitoring (Recommended):**
- Log all rejected submissions
- Alert on >100 rejections/hour
- Track rate limit hits by IP
- Monitor disk usage in data directory

## Implementation Phases

### Phase 1: Backend Infrastructure
1. Create SQLite database schema or file structure
2. Implement `get_high_score.py` with basic retrieval
3. Implement `submit_high_score.py` with validation
4. Add score recalculation logic
5. Test backend endpoints independently

### Phase 2: Frontend Integration
1. Add high score display UI element
2. Implement fetch on page load
3. Add click handler to load board
4. Test with manual data

### Phase 3: Submission Flow
1. Add submission logic on game completion
2. Show notification for new high scores
3. Update UI dynamically after submission
4. Test end-to-end flow

### Phase 4: Polish & Security
1. Add rate limiting
2. Enhance validation (check for impossible scores)
3. Add error handling and user feedback
4. Monitor for abuse patterns

## Dependencies

### Python Libraries
- `json` (built-in) - for JSON file operations
- `lzstring` - for basic board URL validation (needs: `pip install lzstring`)
- `hashlib` (built-in) - optional, for IP hashing if rate limiting
- `os` (built-in) - for file operations

### JavaScript
- Reuse existing LZ-string library (already loaded from CDN)
- Reuse existing board loading logic

## Testing Strategy

### Backend Tests
1. Score validation with various board states
2. High score updates (only when higher)
3. Concurrent submission handling
4. Invalid data rejection
5. Anti-cheating validation

### Frontend Tests
1. High score display in completion popup
2. Click high score link to load that board
3. Automatic submission when user beats high score
4. "New high score" celebration message
5. Error handling (network failures, fetch timeouts, etc.)

### Integration Tests
1. Complete user flow: play → beat high score → see update
2. Multiple users competing for same date
3. Cross-browser compatibility
4. Mobile responsiveness

## Data Migration

### Initial Deployment
- Database starts empty
- High scores accumulate as users play
- No historical data to migrate

### Future Enhancements
- Export/import functionality for backups
- Analytics dashboard showing high score trends
- Leaderboard showing top scores across all dates

## Implementation Details (From Codebase Research)

### Current System Integration

**Popup Structure (index.html):**
- Popup already exists at lines 150-180
- Has score display section ready
- Just needs high score section inserted between score and buttons

**Game Flow (script.js):**
- `endGame()` → `generateShareableBoardURL()` → `showBasicPopup()`
- Board URL already generated: `gameState.preGeneratedShareURL`
- Date available: `gameState.seed` (YYYYMMDD format, e.g., "20251008")

**Data Directory:**
- Already created in Dockerfile: `/usr/local/apache2/data/highscores`
- Permissions already set: www-data:www-data, 755
- Can reuse or create separate `high_scores/` directory

**Dependencies:**
- Python 3.11 installed
- requirements.txt currently empty
- Need to add: `lzstring`

### Specific Code Changes

See `IMPLEMENTATION_ANSWERS.md` for:
- Exact line numbers to modify
- Complete code examples
- Testing procedures
- Deployment steps

## Resolved Questions

1. ✅ **Display date of high score?** → No, just the score and link
2. ✅ **Show who set it?** → No names (anonymous, as planned)
3. ✅ **What if multiple people tie?** → First submission wins (timestamp-based)
4. ✅ **Show "Your Best"?** → Not in initial implementation (requires tracking)
5. ✅ **How long to retain?** → Forever (JSON files are tiny, ~110KB/year)

## Estimated Effort

### Low Traffic Approach (<1000 players/day) - RECOMMENDED for most cases

- **Backend Development**: 3.5-4.5 hours
  - JSON file storage setup: 30 min
  - CGI scripts (get/submit): 1.5 hours
  - **Simplified security**: 1-1.5 hours
    - Input validation (size limits, regex)
    - Simple rate limiting (50/day per IP)
    - Basic decompression check
    - Atomic file operations
  - Testing: 1 hour

- **Frontend Development**: 3-4 hours
  - High score display UI: 1 hour
  - Automatic submission on completion: 1 hour
  - Achievement notification: 30 min
  - Integration & testing: 1-1.5 hours

- **Total**: 6.5-8.5 hours for secure, low-traffic implementation

### High Traffic Approach (>1000 players/day)

- **Backend Development**: 5-7 hours
  - JSON file storage setup: 30 min
  - CGI scripts (get/submit): 2-3 hours
  - **Robust security hardening**: 2-3 hours
    - Advanced rate limiting (20/hour, SHA256 hashing)
    - Decompression timeout with signal handling
    - Comprehensive validation
    - Attack scenario testing
  - Integration testing: 1 hour

- **Frontend Development**: 3-4 hours (same as above)

- **Total**: 8-11 hours for enterprise-grade implementation

---

**Security cannot be skipped** - without proper protections, this feature could:
- Fill disk with garbage data
- Crash server with decompression bombs
- Enable DOS attacks
- Allow arbitrary file writes

**Choose approach based on expected traffic** - low traffic version is adequate for most hobby projects

## Success Metrics

- High scores successfully tracked for each date
- Completion popup shows current high score (clickable)
- "New high score" celebration appears when user beats it
- Click-through to view high score board works reliably
- No performance impact on page load (fetch only on completion)
- Automatic submission works seamlessly (zero user friction)
