# Testing Share Board 3-Second Timeout Fix

## What Changed

Added a 3-second timeout to V3 URL encoding with automatic fallback to LZ-String compression.

**Before:**
- V3 encoding could hang forever
- Button stuck on "Generating..."
- No fallback triggered

**After:**
- V3 encoding times out after 3 seconds
- Automatically falls back to LZ-String
- Button always restores to normal state

---

## Testing Scenarios

### Test 1: Normal Fast Network (Should Use V3)

**Setup:** Desktop with good WiFi

**Steps:**
1. Play a complete game (5 turns)
2. Click "Share Board"
3. Watch console logs

**Expected Result:**
- Button says "Generating..." for ~1-2 seconds
- Console: `[Share Board] Using V3 compressed URL: 71 chars`
- Button changes to "Copied!"
- URL in clipboard is ~44-100 chars (starts with `https://letters.wiki/?g=I...`)

**What this tests:** V3 completes within 3 seconds, no timeout

---

### Test 2: Simulated Slow Network (Should Timeout → LZ Fallback)

**Setup:** Chrome DevTools Network Throttling

**Steps:**
1. Open DevTools (F12) → Network tab
2. Set throttling to "Slow 3G" or "Offline" (dropdown at top)
3. Play a complete game (5 turns)
4. Click "Share Board"
5. Watch console logs

**Expected Result:**
- Button says "Generating..." for exactly 3 seconds
- Console: `[Share Board] V3 encoding failed/timeout, trying LZ-String fallback...`
- Console: `[Share Board] Using LZ-String compressed URL: 120 chars`
- Button changes to "Copied!"
- URL in clipboard is ~95-140 chars (starts with `https://letters.wiki/?g=N4Ig...`)

**What this tests:** Timeout triggers at 3 seconds, fallback works

**Screenshots:**

Setting throttling:
```
DevTools → Network → Throttling dropdown → "Slow 3G"
```

---

### Test 3: Simulated Server Failure (Should Fall Back Twice)

**Setup:** Block the server endpoint

**Steps:**
1. Open DevTools (F12) → Console
2. Run this code to break the server endpoint:
   ```javascript
   // Temporarily break get_rack.py
   const originalFetch = window.fetch;
   window.fetch = function(url, ...args) {
       if (url.includes('get_rack.py')) {
           return Promise.reject(new Error('Simulated server failure'));
       }
       return originalFetch(url, ...args);
   };
   ```
3. Play a complete game
4. Click "Share Board"
5. Watch console logs

**Expected Result:**
- Button says "Generating..." briefly
- Console: `[Share Board] V3 encoding failed/timeout, trying LZ-String fallback...`
- Console: `[Share Board] Using LZ-String compressed URL: 120 chars`
- Button changes to "Copied!"
- URL still works (LZ-String doesn't need server)

**Restore:**
```javascript
window.location.reload();  // Reload to restore normal fetch
```

**What this tests:** Server failure is handled gracefully

---

### Test 4: Mobile Phone (Real-World Scenario)

**Setup:** Actual phone on cellular data

**Steps:**
1. Navigate to https://letters.wiki on phone
2. Play a complete game
3. Click "Share Board"
4. If it takes >2 seconds, you're likely seeing the real issue

**Expected Result:**
- Either V3 completes (~1-3 seconds)
- Or times out and shows LZ-String fallback (~3 seconds)
- Button NEVER stays stuck on "Generating..."

**What this tests:** Real-world mobile network conditions

---

### Test 5: Fast V3 Still Works (No Regression)

**Setup:** Desktop, localhost or good production connection

**Steps:**
1. Start local dev: `./letters_start.sh`
2. Navigate to http://localhost:8085
3. Play a complete game
4. Click "Share Board"
5. Watch console logs

**Expected Result:**
- Button says "Generating..." for <1 second
- Console: `[Share Board] Using V3 compressed URL: 71 chars`
- URL is short (< 100 chars)
- No timeout, no fallback

**What this tests:** Fast case still uses V3 (not over-aggressive timeout)

---

## How to Read Console Logs

### Success - V3 Completed
```
[V3 Encoder] Total tiles to encode: 19
[V3 Encoder] Turn 1 rack: ["T","R","U","N","E","L","S"]
[V3 Encoder] Turn 2 rack: ["P","O","U","R","T","N","E"]
...
[V3 Encoder] Generated URL: https://letters.wiki/?g=IOJryW...
[Share Board] Using V3 compressed URL: 71 chars
```
✅ V3 worked, no timeout

---

### Timeout - Fallback to LZ-String
```
[V3 Encoder] Total tiles to encode: 19
[V3 Encoder] Turn 1 rack: ["T","R","U","N","E","L","S"]
[Share Board] V3 encoding failed/timeout, trying LZ-String fallback... V3 encoding timeout after 3 seconds
[Share Board] Using LZ-String compressed URL: 119 chars
```
✅ V3 timed out, fallback worked

---

### Error - Network Failure
```
[V3 Encoder] Total tiles to encode: 19
[V3 Encoder] Failed to encode: Error: Failed to fetch rack for turn 1
[Share Board] V3 encoding failed/timeout, trying LZ-String fallback... Failed to fetch rack for turn 1
[Share Board] Using LZ-String compressed URL: 119 chars
```
✅ Network error caught, fallback worked

---

## Manual Testing Checklist

- [ ] Test 1: Normal network → V3 works (~1-2 sec)
- [ ] Test 2: Throttled network → Timeout at 3 sec → LZ fallback
- [ ] Test 3: Broken server → LZ fallback
- [ ] Test 4: Mobile phone → Button never hangs
- [ ] Test 5: Localhost → V3 still fast
- [ ] Verify shared URLs load correctly in all cases
- [ ] Verify button text always restores (never stuck on "Generating...")

---

## Automated Test (Playwright)

```javascript
const { test, expect } = require('@playwright/test');

test('Share Board timeout and fallback', async ({ page }) => {
    // Block network to force timeout
    await page.route('**/get_rack.py*', route => route.abort());

    await page.goto('http://localhost:8085');
    await page.waitForLoadState('networkidle');

    // Play a game (simplified)
    // ... place some tiles ...

    // Capture console logs
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    // Click share board
    const shareBtn = page.locator('#share-board-btn');
    await shareBtn.click();

    // Wait for button to restore (should happen within 3-4 seconds)
    await page.waitForTimeout(4000);

    // Verify logs show timeout and fallback
    const timeoutLog = logs.find(log => log.includes('V3 encoding timeout'));
    const fallbackLog = logs.find(log => log.includes('LZ-String fallback'));

    expect(timeoutLog).toBeTruthy();
    expect(fallbackLog).toBeTruthy();

    // Verify button restored
    const buttonText = await shareBtn.textContent();
    expect(buttonText).not.toBe('Generating...');
});
```

---

## What to Look For (Red Flags)

❌ **Bad:** Button stuck on "Generating..." for >5 seconds
✅ **Good:** Button changes within 3-4 seconds

❌ **Bad:** Console error with no fallback attempt
✅ **Good:** Error logged, fallback triggered

❌ **Bad:** Clipboard empty after "Copied!" shows
✅ **Good:** Clipboard has valid URL

❌ **Bad:** Shared URL fails to load
✅ **Good:** Both V3 and LZ-String URLs load correctly

---

## Production Testing (After Deploy)

After deploying to production:

1. **Test from mobile phone:**
   - Open https://letters.wiki on phone (cellular data)
   - Complete game, click "Share Board"
   - Should complete in <5 seconds

2. **Test shared URL:**
   - Paste the URL in a new tab
   - Game board should load correctly
   - Score should match

3. **Monitor logs:**
   - `ssh unraid "docker logs letters --tail 100 -f"`
   - Look for patterns of get_rack.py requests
   - Should see 5 consecutive requests per share

4. **Ask friend to test:**
   - Have friend try on their phone
   - Ask if button completes or gets stuck
   - If still stuck → more debugging needed

---

## Deployment Steps

1. **Commit changes:**
   ```bash
   git add script.js index.html
   git commit -m "Add 3-second timeout to V3 encoding with LZ-String fallback"
   git push
   ```

2. **Deploy to production:**
   ```bash
   ./letters_deploy.sh
   ```

3. **Test immediately:**
   - Open https://letters.wiki
   - Complete a game
   - Click "Share Board"
   - Verify it works

4. **Monitor for issues:**
   - Check server logs for errors
   - Ask friend to test on phone
   - Watch for user reports

---

## Rollback Plan (If Issues)

If something breaks:

```bash
git revert HEAD
git push
./letters_deploy.sh
```

This will restore the previous version without the timeout.

---

## Success Metrics

After 24 hours in production:

- ✅ No user reports of stuck "Generating..." button
- ✅ Server logs show no increase in errors
- ✅ Shared URLs still work correctly
- ✅ Friend confirms it works on mobile

If all green → Success! 🎉

---

## Next Steps (After This Works)

Once timeout fix is validated:
1. Add analytics tracking to measure timeout rate
2. Adjust timeout if needed (based on data)
3. Consider progress indicator ("Turn 3/5...")
4. Document final timeout value

---

**Testing Status:** Ready for manual testing
**Deploy Risk:** Low (has fallback, only changes timing)
**Recommended Test:** Test 2 (throttled network) before deploying
