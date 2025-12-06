# WikiLetters Analytics Events Plan

## Current Setup

- Google Analytics 4 installed: `G-GD024HNJRK`
- `gtag.js` loaded in `index.html`
- **No custom events currently tracked**

## Goals

1. Understand user behavior and engagement
2. Measure feature success (V3 URLs, sharing, scoring)
3. Track errors and performance issues
4. Optimize game mechanics based on data
5. Monitor conversion funnel (play → complete → share)

---

## Proposed Events

### 1. Game Lifecycle Events

#### `game_started`
**When:** Page loads and game initializes
**Parameters:**
```javascript
gtag('event', 'game_started', {
    seed: gameState.seed,              // "20251005"
    source: 'direct|shared_url|seed_url',
    starting_word: gameState.startingWord,
    starting_word_length: gameState.startingWord.length
});
```
**Why:** Track DAU, understand traffic sources (shared games vs direct)

#### `game_completed`
**When:** Player finishes turn 5
**Parameters:**
```javascript
gtag('event', 'game_completed', {
    final_score: gameState.score,
    turn_scores: gameState.turnScores.join(','),  // "4,5,6,8,12"
    total_words: totalWordsPlayed,
    total_tiles_placed: totalTilesPlaced,
    duration_seconds: Math.floor((endTime - startTime) / 1000),
    starting_word: gameState.startingWord
});
```
**Why:** Track completion rate, score distribution, session length

#### `game_abandoned`
**When:** User closes page before completing
**Parameters:**
```javascript
gtag('event', 'game_abandoned', {
    turns_completed: gameState.currentTurn - 1,
    score_so_far: gameState.score,
    reason: 'page_unload|start_over|new_date'
});
```
**Why:** Understand drop-off rate, which turns players quit

---

### 2. Share Events

#### `share_score_clicked`
**When:** "Share Score" button clicked
**Parameters:**
```javascript
gtag('event', 'share_score_clicked', {
    score: gameState.score,
    share_type: 'text_with_emojis'  // Current implementation
});
```
**Why:** Track social sharing engagement

#### `share_board_started`
**When:** "Share Board" button clicked
**Parameters:**
```javascript
gtag('event', 'share_board_started', {
    tile_count: tiles.length,
    turn_count: Math.max(...tiles.map(t => t.turn))
});
```
**Why:** Track intent to share (even if it fails)

#### `share_board_success`
**When:** URL successfully generated and copied
**Parameters:**
```javascript
gtag('event', 'share_board_success', {
    method: 'v3|lz_string|seed_only',
    url_length: url.length,
    tile_count: tiles.length,
    encoding_duration_ms: duration,
    fallback_reason: 'none|v3_timeout|v3_error|lz_error'  // if fallback was used
});
```
**Why:** Track success rate, URL size, performance, fallback usage

#### `share_board_failed`
**When:** All URL generation methods fail
**Parameters:**
```javascript
gtag('event', 'share_board_failed', {
    error_type: 'v3_timeout|network_error|encoding_error',
    error_message: err.message
});
```
**Why:** Track failure rate and reasons

---

### 3. Gameplay Events

#### `word_submitted`
**When:** Player submits a word (any turn)
**Parameters:**
```javascript
gtag('event', 'word_submitted', {
    turn: gameState.currentTurn,
    word_length: totalLetters,
    tile_count: placedTiles.length,
    score: turnScore,
    uses_multiplier: hasMultiplier ? 'true' : 'false',
    crosses_starting_word: crossesStart ? 'true' : 'false'
});
```
**Why:** Understand word complexity, scoring patterns

#### `word_validation_failed`
**When:** Word submission rejected
**Parameters:**
```javascript
gtag('event', 'word_validation_failed', {
    turn: gameState.currentTurn,
    reason: 'not_in_dictionary|invalid_placement|disconnected|too_many_tiles',
    attempted_word: word,  // Optional - could be privacy concern
    attempted_length: word.length
});
```
**Why:** Track friction points, common errors

#### `tiles_recalled`
**When:** Player recalls tiles from board
**Parameters:**
```javascript
gtag('event', 'tiles_recalled', {
    turn: gameState.currentTurn,
    tile_count: recalledTiles.length
});
```
**Why:** Track UX friction, indecision

#### `rack_shuffled`
**When:** Player shuffles rack
**Parameters:**
```javascript
gtag('event', 'rack_shuffled', {
    turn: gameState.currentTurn
});
```
**Why:** Track how often players need to reorganize

---

### 4. Navigation Events

#### `start_over_clicked`
**When:** Player clicks "Start Over" button
**Parameters:**
```javascript
gtag('event', 'start_over_clicked', {
    current_turn: gameState.currentTurn,
    current_score: gameState.score
});
```
**Why:** Track restart rate, frustration points

#### `play_tomorrow_clicked`
**When:** Player clicks "Play Tomorrow's Game"
**Parameters:**
```javascript
gtag('event', 'play_tomorrow_clicked', {
    from_seed: oldSeed,
    to_seed: newSeed
});
```
**Why:** Track feature usage (are people playing future games?)

#### `shared_game_loaded`
**When:** Player loads a shared game URL
**Parameters:**
```javascript
gtag('event', 'shared_game_loaded', {
    format: 'v3|lz_string|seed_only',
    tile_count: tiles.length,
    shared_score: totalScore,
    decoding_duration_ms: duration
});
```
**Why:** Track viral growth, which share format is most used

---

### 5. Score Submission Events

#### `score_submission_started`
**When:** Player enters name and clicks submit
**Parameters:**
```javascript
gtag('event', 'score_submission_started', {
    score: gameState.score,
    name_length: playerName.length
});
```
**Why:** Track leaderboard engagement intent

#### `score_submission_success`
**When:** Score successfully saved to server
**Parameters:**
```javascript
gtag('event', 'score_submission_success', {
    score: gameState.score,
    rank: rank,  // If server returns ranking
    is_high_score: isTopScore ? 'true' : 'false'
});
```
**Why:** Track leaderboard participation

#### `score_submission_failed`
**When:** Score submission fails
**Parameters:**
```javascript
gtag('event', 'score_submission_failed', {
    score: gameState.score,
    error_type: 'network|server|profanity|duplicate'
});
```
**Why:** Track submission errors

---

### 6. Performance Events

#### `page_load_complete`
**When:** Game fully loaded and playable
**Parameters:**
```javascript
gtag('event', 'page_load_complete', {
    load_duration_ms: performance.timing.loadEventEnd - performance.timing.navigationStart,
    device_type: isMobile ? 'mobile' : 'desktop'
});
```
**Why:** Track performance issues

#### `api_request_slow`
**When:** Any API request takes >2 seconds
**Parameters:**
```javascript
gtag('event', 'api_request_slow', {
    endpoint: 'get_rack|validate_word|letters',
    duration_ms: duration,
    succeeded: response.ok ? 'true' : 'false'
});
```
**Why:** Identify server performance issues

#### `v3_encoding_performance`
**When:** V3 URL encoding completes (success or timeout)
**Parameters:**
```javascript
gtag('event', 'v3_encoding_performance', {
    duration_ms: duration,
    tile_count: tiles.length,
    turn_count: maxTurn,
    fetch_count: fetchCount,
    result: 'success|timeout|error'
});
```
**Why:** Optimize V3 encoding, validate timeout choice

---

### 7. Error Events

#### `error_occurred`
**When:** Any caught error
**Parameters:**
```javascript
gtag('event', 'error_occurred', {
    error_type: 'network|validation|encoding|server',
    error_message: err.message,
    error_location: 'shareBoardGame|encodeV3URL|validateWord',
    fatal: isFatal ? 'true' : 'false'
});
```
**Why:** Track all errors for debugging

#### `network_offline`
**When:** Detect offline state
**Parameters:**
```javascript
gtag('event', 'network_offline', {
    during_action: 'gameplay|sharing|loading'
});
```
**Why:** Understand offline usage patterns

---

### 8. Feature Usage Events

#### `debug_mode_enabled`
**When:** Player enables debug mode (?debug=1)
**Parameters:**
```javascript
gtag('event', 'debug_mode_enabled', {
    seed: gameState.seed
});
```
**Why:** Track testing/debugging usage

#### `popup_shown`
**When:** Game completion popup appears
**Parameters:**
```javascript
gtag('event', 'popup_shown', {
    score: gameState.score,
    score_title: scoreTitle  // "Outstanding!", "Great!", etc.
});
```
**Why:** Track popup engagement

#### `popup_dismissed`
**When:** Player closes popup
**Parameters:**
```javascript
gtag('event', 'popup_dismissed', {
    score: gameState.score,
    time_open_ms: duration,
    action_taken: 'share_score|share_board|close|none'
});
```
**Why:** Track popup effectiveness

---

## Event Naming Conventions

- Use **snake_case** for event names (GA4 standard)
- Use **snake_case** for parameter names
- Keep event names **concise but descriptive**
- Use past tense verbs: `game_completed`, `word_submitted`, not `complete_game`, `submit_word`
- Prefix related events: `share_*`, `score_*`, `game_*`

## Parameter Guidelines

- **Always include context:** seed, turn, score when relevant
- **Use strings for booleans:** `'true'` / `'false'` (GA4 requirement)
- **Limit string length:** Keep under 100 chars
- **No PII:** Don't track full words (privacy), only length/patterns
- **Use enums:** Predefined values like `'v3|lz_string|seed_only'` for easier querying

## Privacy Considerations

**Do NOT track:**
- Player names (leaderboard submissions)
- Full words played (could identify users)
- IP addresses (GA4 does this automatically, we don't need to)
- Email addresses

**OK to track:**
- Aggregate patterns (word lengths, scores)
- Anonymous gameplay data
- Feature usage
- Performance metrics

## Implementation Priority

### Phase 1: Critical Events (Ship Immediately)
- ✅ `share_board_success` / `share_board_failed`
- ✅ `game_completed`
- ✅ `shared_game_loaded`
- ✅ `error_occurred`

**Why:** These directly impact the V3 URL feature we just shipped

### Phase 2: Engagement Events (Next Week)
- `game_started`
- `word_submitted`
- `word_validation_failed`
- `score_submission_success`

**Why:** Understand user engagement and friction

### Phase 3: Optional Events (Later)
- `tiles_recalled`
- `rack_shuffled`
- `popup_shown` / `popup_dismissed`
- `api_request_slow`

**Why:** Nice to have, not critical

## Code Structure

Create helper function for consistent tracking:

```javascript
// Analytics helper
const Analytics = {
    // Share events
    shareBoard: {
        started: (tileCount, turnCount) => {
            gtag('event', 'share_board_started', {
                tile_count: tileCount,
                turn_count: turnCount
            });
        },
        success: (method, urlLength, tiles, duration, fallbackReason = 'none') => {
            gtag('event', 'share_board_success', {
                method: method,
                url_length: urlLength,
                tile_count: tiles.length,
                encoding_duration_ms: duration,
                fallback_reason: fallbackReason
            });
        },
        failed: (errorType, errorMessage) => {
            gtag('event', 'share_board_failed', {
                error_type: errorType,
                error_message: errorMessage
            });
        }
    },

    // Game events
    game: {
        started: (seed, source, startingWord) => {
            gtag('event', 'game_started', {
                seed: seed,
                source: source,
                starting_word: startingWord,
                starting_word_length: startingWord.length
            });
        },
        completed: (score, turnScores, words, tiles, duration) => {
            gtag('event', 'game_completed', {
                final_score: score,
                turn_scores: turnScores.join(','),
                total_words: words,
                total_tiles_placed: tiles,
                duration_seconds: Math.floor(duration / 1000)
            });
        }
    },

    // Error tracking
    error: (type, message, location, fatal = false) => {
        gtag('event', 'error_occurred', {
            error_type: type,
            error_message: message,
            error_location: location,
            fatal: fatal ? 'true' : 'false'
        });
    }
};
```

## Usage Example

```javascript
async function shareBoardGame() {
    const startTime = Date.now();
    const tiles = getTilesFromHistory();

    // Track intent
    Analytics.shareBoard.started(tiles.length, 5);

    try {
        // Try V3 with timeout
        const v3URL = await Promise.race([
            encodeV3URL(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('V3 timeout')), 3000)
            )
        ]);

        const duration = Date.now() - startTime;

        if (v3URL) {
            // V3 succeeded
            Analytics.shareBoard.success('v3', v3URL.length, tiles, duration, 'none');
            copyToClipboard(v3URL);
        }
    } catch (err) {
        // V3 failed, try fallback
        const lzURL = generateShareableURL();
        const duration = Date.now() - startTime;

        if (lzURL) {
            // Fallback succeeded
            Analytics.shareBoard.success('lz_string', lzURL.length, tiles, duration, 'v3_timeout');
            copyToClipboard(lzURL);
        } else {
            // Total failure
            Analytics.shareBoard.failed('all_methods_failed', err.message);
        }
    }
}
```

## Analytics Queries (What We'll Be Able to Answer)

With these events in place, we can answer:

1. **"How many people complete the game?"**
   - `game_completed` count / `game_started` count

2. **"What's the average score?"**
   - AVG(`game_completed.final_score`)

3. **"How often does V3 timeout?"**
   - COUNT(`share_board_success` WHERE `fallback_reason` = 'v3_timeout')

4. **"Is 3 seconds the right timeout?"**
   - AVG(`v3_encoding_performance.duration_ms`)
   - P95(`v3_encoding_performance.duration_ms`)

5. **"What % of games are shared?"**
   - `share_board_success` count / `game_completed` count

6. **"Which URL format is most used?"**
   - COUNT(`share_board_success`) GROUP BY `method`

7. **"Where do users drop off?"**
   - `game_abandoned` GROUP BY `turns_completed`

8. **"What's the score distribution?"**
   - HISTOGRAM(`game_completed.final_score`)

9. **"How many shared games are loaded?"**
   - `shared_game_loaded` count
   - Viral coefficient: `shared_game_loaded` / `share_board_success`

10. **"Mobile vs Desktop performance?"**
    - `share_board_success.encoding_duration_ms` GROUP BY device_type

## Testing Analytics

Before shipping:

```javascript
// Test event in console
gtag('event', 'test_event', {
    test_param: 'test_value'
});

// Check in GA4 DebugView:
// https://analytics.google.com/analytics/web/#/a{ACCOUNT_ID}/p{PROPERTY_ID}/realtime/debugview
```

## Maintenance

- **Review events quarterly** - Are we using this data?
- **Deprecate unused events** - Remove if not providing value
- **Update as features change** - New parameters for new features
- **Document changes** - Update this file when adding/removing events

---

**Document Status:** Planning complete, ready for implementation
**Priority Events to Implement:** Phase 1 (share + game completion + errors)
**Estimated Implementation Time:** 2-3 hours for Phase 1
**Last Updated:** 2025-10-05
