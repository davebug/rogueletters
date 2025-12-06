# First-Play-Only High Score System

## Challenge
Detect and enforce "only your first play counts" without user accounts

## Detection Methods (Layered Approach)

### Layer 1: Browser Fingerprinting
```javascript
function generatePlayerFingerprint() {
    const fingerprint = {
        // Browser characteristics
        userAgent: navigator.userAgent,
        language: navigator.language,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

        // Canvas fingerprinting (very unique)
        canvas: getCanvasFingerprint(),

        // WebGL fingerprinting
        webgl: getWebGLFingerprint(),

        // Font detection
        fonts: getInstalledFonts()
    };

    // Hash all characteristics together
    return hashObject(fingerprint);
}

function getCanvasFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint 🎮', 2, 2);
    return canvas.toDataURL().slice(-50);  // Last 50 chars are unique
}
```

### Layer 2: LocalStorage Tracking
```javascript
function markGamePlayed(date) {
    const key = `played_${date}`;
    localStorage.setItem(key, 'true');

    // Also store completion details
    localStorage.setItem(`game_${date}`, JSON.stringify({
        score: finalScore,
        time: new Date().toISOString(),
        fingerprint: generatePlayerFingerprint()
    }));
}

function hasPlayedToday(date) {
    return localStorage.getItem(`played_${date}`) === 'true';
}
```

### Layer 3: Server-Side Tracking
```python
def check_first_play(request, date):
    """Check if this player has already played today"""

    # Generate unique ID from request
    player_id = generate_player_id(
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent'),
        fingerprint=request.json.get('fingerprint')
    )

    # Check today's plays
    plays_file = f"/data/plays/{date}.json"
    if os.path.exists(plays_file):
        with open(plays_file, 'r') as f:
            plays = json.load(f)
            if player_id in plays:
                return False, plays[player_id]['score']

    return True, None
```

### Layer 4: Cookie Tracking
```javascript
function setPlayedCookie(date) {
    document.cookie = `played_${date}=true; expires=${getEndOfDay()}; path=/`;
}

function hasPlayedCookie(date) {
    return document.cookie.includes(`played_${date}=true`);
}
```

## Implementation Strategy

### When Game Starts
```javascript
async function initializeGame() {
    const today = getTodayDate();

    // Check if already played
    if (hasPlayedToday(today)) {
        showAlreadyPlayedMessage();
        loadPracticeMode();  // Let them play for fun
        return;
    }

    // Start regular game
    startGame();
}
```

### When Game Ends
```javascript
async function submitScore(score, boardState) {
    const fingerprint = generatePlayerFingerprint();

    const response = await fetch('/cgi-bin/submit_score.py', {
        method: 'POST',
        body: JSON.stringify({
            date: today,
            score: score,
            boardState: boardState,
            fingerprint: fingerprint,
            firstPlay: !hasPlayedToday(today)
        })
    });

    const result = await response.json();

    if (result.firstPlay) {
        // Mark as played
        markGamePlayed(today);
        setPlayedCookie(today);

        // Check if high score
        if (result.qualifiesForHighScore) {
            showNameEntry(result.rank);
        }
    } else {
        showPracticeResult(score, result.firstPlayScore);
    }
}
```

### Server-Side Validation
```python
def submit_score(request):
    data = request.json
    player_id = generate_player_id(request)

    # Check if first play
    is_first, previous_score = check_first_play(request, data['date'])

    if is_first:
        # Record the play
        record_play(player_id, data['date'], data['score'])

        # Check high score eligibility
        if qualifies_for_high_score(data['score'], data['date']):
            return {
                'firstPlay': True,
                'qualifiesForHighScore': True,
                'rank': get_rank(data['score'], data['date'])
            }
    else:
        return {
            'firstPlay': False,
            'firstPlayScore': previous_score,
            'message': 'Practice play - your first score was ' + str(previous_score)
        }
```

## User Experience

### First Play
```
Game Ends
Score: 432 points!

✅ First play recorded
Checking high scores...

🎉 NEW HIGH SCORE - Rank #4!
Enter your name: [________]
```

### Subsequent Plays (Practice Mode)
```
Game Ends
Score: 465 points!

Practice Mode
Your official score today: 432 (Rank #4)
This score: 465 (+33 improvement!)

[View High Scores] [Play Tomorrow]
```

## Bypass Prevention

### What This Stops
- ✅ Refreshing page and replaying
- ✅ Clearing cookies only
- ✅ Using incognito mode (fingerprint still similar)
- ✅ Multiple plays from same device

### What This Doesn't Stop
- ❌ Different devices (phone + computer)
- ❌ Different browsers (Chrome + Firefox)
- ❌ VPN/IP changes (but fingerprint helps)
- ❌ Technical users who modify fingerprint

### Acceptable Trade-offs
- 95% of players will be honest
- Cheating requires significant effort
- Multiple devices is somewhat fair (different play experience)

## Name Entry with Profanity Filter

### 8-Character Name Validation
```python
def validate_high_score_name(name):
    """Strict validation for high score names"""

    # Length check
    if len(name) < 1 or len(name) > 8:
        return False, "Name must be 1-8 characters"

    # Character check (letters, numbers, limited symbols)
    if not re.match(r'^[A-Za-z0-9_\-\.]+$', name):
        return False, "Only letters, numbers, and .-_ allowed"

    # Profanity check (more strict for public display)
    if contains_profanity(name.upper()):
        return False, "Please choose a different name"

    # Check against variations
    variations = [
        name.upper(),
        name.replace('1', 'I'),
        name.replace('0', 'O'),
        name.replace('5', 'S'),
        name.replace('3', 'E'),
    ]

    for variant in variations:
        if variant in BLOCKED_NAMES:
            return False, "Please choose a different name"

    return True, "Valid name"
```

### Blocked Names List
```python
BLOCKED_NAMES = {
    # Explicit profanity (even partial)
    # Common variations and leetspeak
    # Offensive terms
    # Also block:
    "ADMIN", "SYSTEM", "WINNER", "LOSER",
    "FIRST", "BEST", "WORST", "CHEAT"
}
```

## Storage Structure

### Daily Plays Tracking
```json
// /data/plays/2024-03-15.json
{
  "player_abc123": {
    "score": 432,
    "time": "09:15:23",
    "qualified": true,
    "name": "DAVEJR"
  },
  "player_def456": {
    "score": 287,
    "time": "10:32:11",
    "qualified": false
  }
}
```

### Daily High Scores
```json
// /data/highscores/2024-03-15.json
{
  "scores": [
    {
      "rank": 1,
      "name": "MAXWELL",
      "score": 487,
      "playerId": "player_xyz789",
      "boardState": [...],
      "wordsPlayed": [...]
    }
  ]
}
```

## Benefits

1. **Fair Competition**: Everyone gets one real shot
2. **Practice Allowed**: Can still play for fun/learning
3. **No Registration**: Friction-free experience
4. **Reasonably Secure**: Hard enough to bypass
5. **Educational**: Can review their first play

## Limitations Acknowledged

- Power users can bypass with effort
- Multiple devices work (acceptable)
- Not cryptographically secure (acceptable for word game)

Good enough for a fun daily word game! 🎮