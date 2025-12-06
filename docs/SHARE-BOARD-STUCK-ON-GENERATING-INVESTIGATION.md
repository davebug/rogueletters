# "Share Board" Button Stuck on "Generating..." - Investigation

## Reported Issue

User clicked "Share Board" button and it changed to "Generating..." but never changed to "Copied!" or restored to original text.

## Code Flow Analysis

When "Share Board" is clicked, this happens:

1. Button text changes to "Generating..."
2. `encodeV3URL()` is called (async function)
3. For each turn (1-5), fetches rack from server: `GET /cgi-bin/get_rack.py?seed=X&turn=N&history=...`
4. Encodes tiles to binary format
5. Returns compressed URL
6. Calls `copyToClipboardWithFeedback()` which restores button text

**If button is stuck on "Generating..."**, the likely cause is that `encodeV3URL()` never completes.

## Potential Root Causes

### 1. **Fetch Request Hanging (MOST LIKELY)**

**Code location:** `script.js:231`
```javascript
const response = await fetch(url);
if (!response.ok) {
    throw new Error(`Failed to fetch rack for turn ${turn}`);
}
```

**Problem:**
- No timeout on fetch requests
- If server is slow/unresponsive, fetch hangs forever
- If network is poor, request may never complete

**Evidence this is the issue:**
- fetch() has no built-in timeout by default
- Can hang indefinitely waiting for server response
- User would see "Generating..." forever

**How to verify:**
- Check browser DevTools → Network tab
- Look for pending/failed requests to `get_rack.py`
- Check if request is stuck in "pending" state

---

### 2. **CORS/Network Error Not Throwing**

**Problem:**
- Some network errors don't reject the fetch promise
- Browser might block cross-origin requests
- Could fail silently without throwing exception

**How to verify:**
- Check browser console for CORS errors
- Check if running from different domain (e.g., localhost vs production)

---

### 3. **Server Script Timeout/Error**

**Code location:** `cgi-bin/get_rack.py`

**Problem:**
- Python script might be hanging/crashing
- Apache CGI timeout
- Python dependencies missing
- Database/file access issues

**How to verify:**
- Check server logs: `ssh unraid "docker logs letters"`
- Look for Python errors or CGI timeouts
- Check if get_rack.py is executable and has correct shebang

---

### 4. **Large History Parameter Causing Issues**

**Code location:** `script.js:223`
```javascript
const historyParam = playHistory.length > 0 ? encodeURIComponent(JSON.stringify(playHistory)) : '';
```

**Problem:**
- If player placed many tiles, history JSON could be very large
- URL might exceed max query string length (2048 chars in some browsers)
- Server might reject oversized GET requests

**Example:**
- Turn 5 with full history of turns 1-4 could have:
  - Turn 1: 7 tiles
  - Turn 2: 7 tiles
  - Turn 3: 7 tiles
  - Turn 4: 7 tiles
  - JSON: `[["A","B","C",...], ["D","E",...], ...]`
  - Encoded: Could be 500+ characters

**How to verify:**
- Check Network tab for 414 (URI Too Long) errors
- Look at query string length in failed requests

---

### 5. **gameState.turnHistory Malformed**

**Code location:** `script.js:186-197`
```javascript
const tiles = [];
gameState.turnHistory.forEach((turn, turnIndex) => {
    if (turn && turn.tiles) {
        turn.tiles.forEach(tile => {
            tiles.push({
                row: tile.row,
                col: tile.col,
                letter: tile.letter,
                turn: turnIndex + 1
            });
        });
    }
});
```

**Problem:**
- If `gameState.turnHistory` is corrupted or has unexpected structure
- Missing properties could cause undefined errors
- Loop might never complete

**How to verify:**
- Check console for errors like "Cannot read property 'tiles' of undefined"
- Log `gameState.turnHistory` structure

---

### 6. **No Tiles Played Yet**

**Code location:** `script.js:197-200`
```javascript
if (tiles.length === 0) {
    console.error('[V3 Encoder] No tiles to encode');
    return null;
}
```

**Problem:**
- If no tiles have been placed, encoder returns `null`
- Falls back to seed-only URL (should still work)
- But if this path fails, button might not restore

**How to verify:**
- Check if user actually placed any tiles before sharing

---

## Debugging Steps

### For User's Browser (Console Commands)

Ask user to open DevTools (F12) and run:

```javascript
// Check if there are pending fetch requests
console.log('Checking network...');

// Check gameState
console.log('Game state:', {
    seed: gameState.seed,
    turnHistory: gameState.turnHistory,
    totalTiles: gameState.turnHistory.reduce((sum, turn) => sum + (turn?.tiles?.length || 0), 0)
});

// Try to manually trigger encoding with logging
encodeV3URL().then(url => {
    console.log('SUCCESS:', url);
}).catch(err => {
    console.error('FAILED:', err);
});
```

### Check Network Tab

1. Open DevTools → Network tab
2. Click "Share Board"
3. Look for requests to `get_rack.py`
4. Check status:
   - **Pending** = Request is hanging (timeout issue)
   - **Failed** = Network/CORS error
   - **200** = Succeeded (but check response body)
   - **500** = Server error
   - **414** = URI too long

### Check Console Logs

Look for these log messages:
- `[V3 Encoder] Total tiles to encode: X` - Should appear immediately
- `[V3 Encoder] Turn X rack: [...]` - Should appear for each turn
- `[V3 Encoder] Generated URL: ...` - Should appear at end
- `[V3 Encoder] Failed to encode: ...` - Error message

**If you see:**
- First log but no rack logs = Fetch is hanging on first request
- Some rack logs but not all = Hanging on specific turn
- No logs at all = Function never started (event listener issue?)

### Check Server Logs

```bash
ssh unraid "docker logs letters --tail 100"
```

Look for:
- Python errors in get_rack.py
- CGI timeout errors
- Permission denied errors
- Missing module errors

---

## Quick Fixes to Test

### Fix 1: Add Fetch Timeout

**Problem:** No timeout on fetch requests
**Solution:** Add AbortController with timeout

```javascript
// Create fetch with timeout
async function fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw err;
    }
}

// Use in encodeV3URL:
const response = await fetchWithTimeout(url, 10000); // 10 second timeout
```

### Fix 2: Better Error Handling

**Problem:** Errors might not bubble up properly
**Solution:** Add try/catch around entire shareBoardGame

```javascript
async function shareBoardGame() {
    const shareBtn = document.getElementById('share-board-btn');
    const originalText = shareBtn ? shareBtn.textContent : 'Share Board';

    if (shareBtn) {
        shareBtn.textContent = "Generating...";
    }

    try {
        const v3URL = await encodeV3URL();
        if (v3URL) {
            shareURL = v3URL;
        } else {
            // Fallback...
        }
    } catch (err) {
        console.error('[Share Board] Error:', err);
        // IMPORTANT: Restore button even on error
        if (shareBtn) {
            shareBtn.textContent = "Error - Try Again";
            setTimeout(() => {
                shareBtn.textContent = originalText;
            }, 2000);
        }
        return; // Don't copy to clipboard
    }

    copyToClipboardWithFeedback(shareURL, shareBtn, originalText);
}
```

### Fix 3: Add Loading Indicator

**Problem:** User has no feedback if request is slow
**Solution:** Show progress for each turn

```javascript
// Update button text with progress
if (shareBtn) {
    shareBtn.textContent = `Generating... (Turn ${turn}/5)`;
}
```

### Fix 4: Fallback to Simple URL

**Problem:** V3 encoding might fail
**Solution:** Always have a fallback

```javascript
async function shareBoardGame() {
    // ...

    // Start with simple seed URL as fallback
    let shareURL = `https://letters.wiki/?seed=${gameState.seed}`;

    try {
        // Try fancy V3 encoding
        const v3URL = await Promise.race([
            encodeV3URL(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);

        if (v3URL) {
            shareURL = v3URL;
        }
    } catch (err) {
        console.warn('[Share Board] Using fallback URL due to:', err.message);
        // shareURL already set to seed-only fallback
    }

    copyToClipboardWithFeedback(shareURL, shareBtn, originalText);
}
```

---

## Most Likely Scenario

Based on code analysis, **the most likely cause is:**

**Fetch request to `get_rack.py` is hanging due to:**
1. Slow server response
2. Network timeout
3. Server script error/hang

**Why this explains the symptoms:**
- Button changes to "Generating..." ✓
- `await fetch(url)` never resolves ✓
- Function never completes ✓
- Button text never restores ✓

**Quick test to confirm:**
Open DevTools → Network tab and look for pending `get_rack.py` requests.

---

## Recommended Immediate Actions

1. **Check user's browser console** - Look for errors
2. **Check user's network tab** - Look for pending/failed requests
3. **Check server logs** - `docker logs letters`
4. **Ask user to try again** - Might be transient network issue
5. **Test on same network** - Rule out network/firewall issues

## Recommended Code Fixes (Priority Order)

### Priority 1: Add Timeout to Fetch
Without this, button can hang forever. This is critical.

### Priority 2: Better Error Handling
Even if V3 fails, button should restore and provide fallback URL.

### Priority 3: Progress Feedback
Show which turn is being processed so user knows it's working.

### Priority 4: Server Monitoring
Add logging to get_rack.py to track performance and errors.

---

## Test Cases to Add

- [ ] Fetch timeout (simulate slow server)
- [ ] Server error (simulate 500 response)
- [ ] Network offline (simulate no connection)
- [ ] Large game (30+ tiles, long history)
- [ ] No tiles placed (empty game)
- [ ] CORS blocked (different origin)

---

## Follow-up Questions for User

1. Does the browser console show any errors?
2. Are there any pending network requests in DevTools?
3. Does it happen every time or just sometimes?
4. How many tiles had been placed?
5. What browser and version?
6. Mobile or desktop?
7. On same WiFi/network as before?

---

**Document Status:** Investigation complete, awaiting user feedback
**Last Updated:** 2025-10-05
**Priority:** HIGH - Affects core sharing functionality
