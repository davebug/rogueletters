# Adding Words to the WikiLetters Dictionary

This document describes the complete process for adding new words to the ENABLE dictionary used by WikiLetters, including all deployment considerations and common pitfalls.

## Overview

WikiLetters uses the ENABLE word list (`data/enable.txt`) for word validation. The list contains 172,860+ words in alphabetical order, one per line, all lowercase.

## Word Validation Rule

⚠️ **AUTHORITATIVE SOURCE**: When adding or removing words from the dictionary, **ALWAYS verify against the official Merriam-Webster Scrabble dictionary**:

🔗 **https://scrabble.merriam.com/**

- ✅ **ADD** words that are marked as "playable" on scrabble.merriam.com
- ❌ **REMOVE** words that are marked as "not a playable word" on scrabble.merriam.com
- This is the official North American Scrabble dictionary used in tournaments
- It is more authoritative than other online Scrabble word checkers

**Example verification:**
```bash
# Check if "email" is valid:
# Navigate to: https://scrabble.merriam.com/finder/email
# Look for "EMAIL is a playable word" or "EMAIL is not a playable word"
```

## Important Architecture Note

⚠️ **CRITICAL**: The production deployment uses a Docker volume mount that persists the `enable.txt` file outside the container:

```
-v /mnt/user/appdata/letters/data:/usr/local/apache2/data
```

This means:
- Simply rebuilding the Docker image is NOT sufficient
- You must update BOTH the git repository AND the persistent storage on the server
- The persistent file takes precedence over the file in the Docker image

## Complete Process

### Step 1: Update the Local File

1. **Navigate to the letters directory:**
   ```bash
   cd /Users/daverutledge/wikigames/letters
   ```

2. **Find the insertion point:**
   ```bash
   # Search for words near where your word should be alphabetically
   grep -n "^ema" data/enable.txt
   ```

3. **Edit the file:**
   - Open `data/enable.txt`
   - Insert the new word in alphabetical order (lowercase)
   - Example: Insert "email" between "emalangeni" and "emanate"

4. **Verify the change:**
   ```bash
   # Check word was added
   grep -n "^email$" data/enable.txt

   # Verify word count increased by 1
   wc -l data/enable.txt
   # Should show 172881 (or current count + 1)

   # Check alphabetical order around insertion point
   sed -n '47638,47645p' data/enable.txt
   ```

### Step 2: Commit to Git Repository

```bash
git add data/enable.txt
git commit -m 'Add "email" to ENABLE word list'
git push origin main
```

**Repository:** `https://github.com/davebug/wikiletters.git`

### Step 3: Deploy to Production

⚠️ **Two-Step Process Required:**

#### 3a. Update the Persistent Storage on Unraid

This is the CRITICAL step that was initially missed. The persistent storage must be updated manually:

```bash
# Copy the updated file to the Unraid server
scp -i ~/.ssh/id_unraid data/enable.txt root@unraid:/mnt/user/appdata/letters/data/enable.txt

# Verify the update on the server
ssh -i ~/.ssh/id_unraid root@unraid "wc -l /mnt/user/appdata/letters/data/enable.txt"
ssh -i ~/.ssh/id_unraid root@unraid "grep -n '^email$' /mnt/user/appdata/letters/data/enable.txt"
```

#### 3b. Restart the Container

The container must be restarted to reload the word list from the updated file:

```bash
ssh -i ~/.ssh/id_unraid root@unraid "docker restart letters"
```

#### 3c. (Optional) Update the Docker Image

While not strictly necessary (since the persistent volume takes precedence), it's good practice to keep the Docker image in sync:

```bash
# Build for the correct architecture (amd64)
docker buildx build --platform linux/amd64 --no-cache -t davebug/letters:latest --push .
```

**Note:** The `--no-cache` flag is important to ensure the updated `enable.txt` is copied into the image.

### Step 4: Verify the Deployment

1. **Check the word count in the running container:**
   ```bash
   ssh -i ~/.ssh/id_unraid root@unraid "docker exec letters wc -l /usr/local/apache2/data/enable.txt"
   # Should show 172881 (or expected new count)
   ```

2. **Verify the word is present:**
   ```bash
   ssh -i ~/.ssh/id_unraid root@unraid "docker exec letters grep -n '^email$' /usr/local/apache2/data/enable.txt"
   # Should show: 47641:email (or similar)
   ```

3. **Test via the API:**
   ```bash
   curl -s 'http://192.168.4.89:85/cgi-bin/check_word.py?words=%5B%22EMAIL%22%5D' | python3 -m json.tool
   ```

   Expected response:
   ```json
   {
       "results": {
           "EMAIL": true
       }
   }
   ```

4. **Test in the live game:**
   - Go to https://letters.wiki/
   - Try to play the word in an actual game
   - Verify it's accepted as valid

## Why Docker Image Rebuilding Alone Doesn't Work

When we first attempted to deploy by only rebuilding and redeploying the Docker image, it failed because:

1. **Volume Mount Precedence:** The `-v /mnt/user/appdata/letters/data:/usr/local/apache2/data` mount overrides the `/usr/local/apache2/data/` directory in the image
2. **Persistent Storage:** Files in the mounted volume persist across container recreations
3. **Cache Issues:** Docker may use cached layers during build, not copying the updated file

## Common Pitfalls

### 1. Docker Build Cache
If you rebuild without `--no-cache`, Docker may use a cached layer that has the old `enable.txt`:
```bash
# Wrong - may use cached layer
docker build -t davebug/letters:latest .

# Correct - forces fresh copy
docker buildx build --platform linux/amd64 --no-cache -t davebug/letters:latest --push .
```

### 2. Platform Mismatch
Building on an M1/M2 Mac (arm64) creates an arm64 image by default, which won't run properly on the Unraid server (amd64):
```bash
# Always specify the platform
docker buildx build --platform linux/amd64 -t davebug/letters:latest --push .
```

### 3. Forgetting to Update Persistent Storage
This is the most critical mistake. The word will appear in the git repo and Docker image, but won't work in production:
```bash
# ALWAYS update persistent storage
scp -i ~/.ssh/id_unraid data/enable.txt root@unraid:/mnt/user/appdata/letters/data/enable.txt
```

### 4. Not Restarting the Container
The word list is loaded into memory when the container starts. Changes to the file aren't reflected until restart:
```bash
# MUST restart after updating the file
ssh -i ~/.ssh/id_unraid root@unraid "docker restart letters"
```

## How Word Validation Works

1. **Loading:** `cgi-bin/check_word.py` loads `enable.txt` at startup (line 13-24)
2. **Conversion:** Words are converted to uppercase and stored in a set
3. **Validation:** Incoming words are uppercased and checked against the set
4. **Response:** Returns JSON with validation results

```python
# From check_word.py
VALID_WORDS = set()
dict_path = "/usr/local/apache2/data/enable.txt"

with open(dict_path, 'r') as f:
    VALID_WORDS = {word.strip().upper() for word in f}
```

## Quick Reference: Add a Word

```bash
# 1. Local: Add word to enable.txt (alphabetically, lowercase)
# 2. Local: Commit and push
git add data/enable.txt
git commit -m 'Add "WORD" to ENABLE word list'
git push origin main

# 3. Server: Update persistent storage
scp -i ~/.ssh/id_unraid data/enable.txt root@unraid:/mnt/user/appdata/letters/data/enable.txt

# 4. Server: Restart container
ssh -i ~/.ssh/id_unraid root@unraid "docker restart letters"

# 5. Verify
curl -s 'http://192.168.4.89:85/cgi-bin/check_word.py?words=%5B%22WORD%22%5D'
```

## File Format

- **Format:** Plain text, one word per line
- **Case:** Lowercase only
- **Order:** Strict alphabetical order
- **Encoding:** UTF-8
- **Line Endings:** Unix (LF)
- **No empty lines:** File should end with the last word

## Example Recent Additions

- **"mosh"** - Added October 10, 2025 (commit d7fdab1)
- **"bento"** - Added October 19, 2025 (commit 29871d2)
- **"email"** - Added October 19, 2025 (commit 91f42d4)

## Troubleshooting

### Word Still Not Accepted After Deployment

1. **Check persistent storage:**
   ```bash
   ssh -i ~/.ssh/id_unraid root@unraid "grep -n '^yourword$' /mnt/user/appdata/letters/data/enable.txt"
   ```

2. **Check container sees the file:**
   ```bash
   ssh -i ~/.ssh/id_unraid root@unraid "docker exec letters grep -n '^yourword$' /usr/local/apache2/data/enable.txt"
   ```

3. **Verify container was restarted:**
   ```bash
   ssh -i ~/.ssh/id_unraid root@unraid "docker ps --filter 'name=letters' --format '{{.Status}}'"
   # Should show "Up X minutes" with recent restart time
   ```

4. **Test API directly:**
   ```bash
   curl -s 'http://192.168.4.89:85/cgi-bin/check_word.py?words=%5B%22YOURWORD%22%5D'
   ```

### Container Won't Start After Update

Check logs:
```bash
ssh -i ~/.ssh/id_unraid root@unraid "docker logs letters --tail 50"
```

Common issues:
- Platform mismatch (arm64 vs amd64)
- Python script errors
- File permission issues

## Related Files

- `data/enable.txt` - The word list (172,881 words)
- `cgi-bin/check_word.py` - Word validation API
- `cgi-bin/validate_word.py` - Additional validation logic
- `letters_deploy.sh` - Deployment script (doesn't handle persistent storage update)

## Notes for Future Improvements

Consider updating `letters_deploy.sh` to automatically sync `enable.txt` to persistent storage:

```bash
# Add to deployment script
echo "Syncing enable.txt to persistent storage..."
scp data/enable.txt root@unraid:/mnt/user/appdata/letters/data/enable.txt
```

This would make the process more foolproof for future word additions.
