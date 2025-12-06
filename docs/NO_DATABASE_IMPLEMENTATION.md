# How This Works Without Accounts or Database

## The Complete System - File-Based Implementation

### What We're Storing (Just JSON Files)

```
/data/
├── plays/
│   ├── 2024-03-15.json    # Who played today
│   ├── 2024-03-16.json    # Who played yesterday
│   └── ...
└── highscores/
    ├── 2024-03-15.json    # Top 10 for today
    ├── 2024-03-16.json    # Top 10 for yesterday
    └── ...
```

## Step-by-Step: How A Game Works

### 1. Player Visits Site (First Time Today)

```javascript
// CLIENT: Check if they've played today
function checkPlayStatus() {
    const today = "2024-03-15";

    // Check localStorage
    const played = localStorage.getItem(`played_${today}`);

    if (played) {
        // They've played (at least on this browser)
        showPracticeMode();
    } else {
        // First time today (on this browser)
        startRealGame();
    }
}
```

### 2. Player Completes Game

```javascript
// CLIENT: Game ends, submit score
async function submitScore() {
    const score = 432;
    const boardState = getCurrentBoard();

    // Create a fingerprint (unique-ish identifier)
    const fingerprint = btoa(
        navigator.userAgent +
        screen.width +
        screen.height +
        new Date().getTimezoneOffset()
    ).substring(0, 20);  // Simple hash

    // Send to server
    const response = await fetch('/cgi-bin/submit_score.py', {
        method: 'POST',
        body: JSON.stringify({
            date: "2024-03-15",
            score: score,
            board: boardState,
            fingerprint: fingerprint
        })
    });

    const result = await response.json();
    // Result: { firstPlay: true, rank: 4, qualifies: true }
}
```

### 3. Server Processes Score

```python
# SERVER: /cgi-bin/submit_score.py
import json
import os
from datetime import datetime

def submit_score(request):
    data = json.loads(request.body)
    date = data['date']  # "2024-03-15"
    score = data['score']  # 432
    fingerprint = data['fingerprint']  # "x9kd02md..."

    # Step 1: Check if this player already played today
    plays_file = f"/data/plays/{date}.json"

    if os.path.exists(plays_file):
        with open(plays_file, 'r') as f:
            plays = json.load(f)
    else:
        plays = {}

    # Use fingerprint as player ID (no account needed!)
    player_id = fingerprint

    if player_id in plays:
        # They already played
        return {
            "firstPlay": False,
            "previousScore": plays[player_id]["score"]
        }

    # Step 2: Record this play
    plays[player_id] = {
        "score": score,
        "time": datetime.now().isoformat(),
        "board": data['board']
    }

    with open(plays_file, 'w') as f:
        json.dump(plays, f)

    # Step 3: Check if score qualifies for high score board
    highscores_file = f"/data/highscores/{date}.json"

    if os.path.exists(highscores_file):
        with open(highscores_file, 'r') as f:
            highscores = json.load(f)
    else:
        highscores = {"scores": []}

    # Check if top 10
    qualifies = len(highscores["scores"]) < 10 or score > highscores["scores"][-1]["score"]

    if qualifies:
        rank = sum(1 for s in highscores["scores"] if s["score"] > score) + 1

        return {
            "firstPlay": True,
            "qualifies": True,
            "rank": rank
        }

    return {
        "firstPlay": True,
        "qualifies": False,
        "score": score
    }
```

### 4. Player Enters Name (If Qualified)

```javascript
// CLIENT: Show name entry
function showNameEntry(rank) {
    const modal = `
        <div class="high-score-entry">
            <h2>HIGH SCORE #${rank}!</h2>
            <input type="text" id="playerName" maxlength="8" />
            <button onclick="saveName()">Submit</button>
        </div>
    `;

    document.body.innerHTML += modal;
}

async function saveName() {
    const name = document.getElementById('playerName').value;

    // Submit name to server
    await fetch('/cgi-bin/save_high_score.py', {
        method: 'POST',
        body: JSON.stringify({
            date: "2024-03-15",
            name: name,
            fingerprint: getFingerprint()
        })
    });
}
```

### 5. Server Saves High Score

```python
# SERVER: /cgi-bin/save_high_score.py
def save_high_score(request):
    data = json.loads(request.body)
    date = data['date']
    name = data['name']
    fingerprint = data['fingerprint']

    # Validate name (profanity check)
    if not is_appropriate_name(name):
        return {"error": "Invalid name"}

    # Get player's score from plays file
    plays_file = f"/data/plays/{date}.json"
    with open(plays_file, 'r') as f:
        plays = json.load(f)

    if fingerprint not in plays:
        return {"error": "No play recorded"}

    player_data = plays[fingerprint]

    # Update high scores
    highscores_file = f"/data/highscores/{date}.json"
    with open(highscores_file, 'r') as f:
        highscores = json.load(f)

    # Add new score
    new_entry = {
        "rank": 0,  # Will be calculated
        "name": name,
        "score": player_data["score"],
        "board": player_data["board"],
        "playerId": fingerprint
    }

    highscores["scores"].append(new_entry)

    # Sort and keep top 10
    highscores["scores"].sort(key=lambda x: x["score"], reverse=True)
    highscores["scores"] = highscores["scores"][:10]

    # Update ranks
    for i, entry in enumerate(highscores["scores"]):
        entry["rank"] = i + 1

    # Save
    with open(highscores_file, 'w') as f:
        json.dump(highscores, f)

    return {"success": True}
```

### 6. Viewing High Scores

```python
# SERVER: /cgi-bin/get_high_scores.py
def get_high_scores(request):
    date = request.params.get('date', today())
    highscores_file = f"/data/highscores/{date}.json"

    if not os.path.exists(highscores_file):
        return {"scores": []}

    with open(highscores_file, 'r') as f:
        return json.load(f)
```

### 7. Viewing Someone's Board

```python
# SERVER: /cgi-bin/get_board_replay.py
def get_board_replay(request):
    date = request.params.get('date')
    rank = request.params.get('rank')

    highscores_file = f"/data/highscores/{date}.json"
    with open(highscores_file, 'r') as f:
        highscores = json.load(f)

    # Find the score at this rank
    for entry in highscores["scores"]:
        if entry["rank"] == rank:
            return {
                "name": entry["name"],
                "score": entry["score"],
                "board": entry["board"]
            }

    return {"error": "Not found"}
```

## Why This Works Without a Database

### 1. **File System IS Our Database**
- Each day = 2 files (plays.json, highscores.json)
- Files are small (~10KB each)
- File system handles "queries" (reading files)
- OS handles file locking for concurrent writes

### 2. **No User Accounts Needed**
- Fingerprint = temporary ID (just for today)
- No login, no passwords, no email
- Player identity only matters for one day
- Tomorrow, fresh start for everyone

### 3. **Scale Analysis**
```
Daily players: 1,000
Data per player: 1KB
Daily storage: 1MB

Monthly storage: 30MB
Yearly storage: 365MB

This is TINY by modern standards!
```

## Limitations (And Why They're OK)

### What This Prevents ✅
- Refresh and replay: ✅ (localStorage + fingerprint)
- Clear cookies only: ✅ (fingerprint still matches)
- Incognito mode: ✅ (fingerprint similar enough)
- Casual cheating: ✅ (too much effort)

### What This Allows ❌
- Different device: ❌ (OK - different experience)
- Different browser: ❌ (OK - requires effort)
- VPN/IP change: ❌ (OK - fingerprint helps)
- Determined cheater: ❌ (OK - they work hard for it!)

## File Locking for Concurrent Writes

```python
import fcntl  # Unix/Linux
import json

def safe_write_json(filepath, data):
    """Write JSON with file locking to prevent corruption"""
    with open(filepath, 'r+') as f:
        # Lock file during read-modify-write
        fcntl.flock(f.fileno(), fcntl.LOCK_EX)

        # Read current data
        try:
            current = json.load(f)
        except:
            current = {}

        # Modify
        current.update(data)

        # Write back
        f.seek(0)
        json.dump(current, f)
        f.truncate()

        # Lock releases automatically
```

## Daily Cleanup (Optional Cron Job)

```bash
#!/bin/bash
# Clean up old play files (keep 30 days)
find /data/plays -name "*.json" -mtime +30 -delete
find /data/highscores -name "*.json" -mtime +365 -delete
```

## Why This Is Better Than a Database

1. **Simplicity**: No database setup, migrations, or maintenance
2. **Portability**: Just copy files to backup/move
3. **Debugging**: Can read/edit JSON directly
4. **Recovery**: One bad day doesn't break everything
5. **Cost**: No database server needed
6. **Matches WikiDates/WikiBirthdays**: Same pattern

## The Complete Data Flow

```
Player Opens Game
       ↓
Check localStorage → No previous play
       ↓
Play Game (432 pts)
       ↓
Submit to Server
       ↓
Server checks /data/plays/2024-03-15.json
       ↓
Not found → First play! ✅
       ↓
Add to plays file
       ↓
Check high scores → Rank #4!
       ↓
Return to client → Show name entry
       ↓
Player enters "DAVEJR"
       ↓
Server validates name
       ↓
Updates /data/highscores/2024-03-15.json
       ↓
Done! No database needed!
```

## Example Files After One Day

### /data/plays/2024-03-15.json
```json
{
  "fp_x9kd02md": {"score": 487, "time": "09:15:00", "board": [...]},
  "fp_m3nd82kd": {"score": 432, "time": "09:45:00", "board": [...]},
  "fp_92jd73nd": {"score": 234, "time": "10:15:00", "board": [...]},
  // ... ~1000 entries by end of day
}
```

### /data/highscores/2024-03-15.json
```json
{
  "scores": [
    {"rank": 1, "name": "MAXWELL", "score": 487, "board": [...], "playerId": "fp_x9kd02md"},
    {"rank": 2, "name": "SARAH", "score": 465, "board": [...], "playerId": "fp_k29d0s9d"},
    {"rank": 3, "name": "DAVEJR", "score": 432, "board": [...], "playerId": "fp_m3nd82kd"},
    // ... up to 10 entries
  ]
}
```

## Conclusion

This system works because:
1. **Each day is independent** (no cross-day queries needed)
2. **Data is small** (KB not GB)
3. **Queries are simple** (read one file)
4. **Identity is temporary** (just for one day)
5. **File system handles it fine** (it's what it's built for!)

No database or accounts required - just smart use of files! 🎯