# Shared Code Architecture: WikiLetters + RogueLetters

This document outlines a plan for sharing code between WikiLetters and RogueLetters.

---

## ⚠️ CRITICAL SAFETY PRINCIPLE

**WikiLetters is PRODUCTION. Real people play it daily. It must NEVER break.**

Any shared code mechanism MUST follow these rules:

1. **WikiLetters is the source of truth** - Code flows FROM WikiLetters TO RogueLetters, never the reverse
2. **WikiLetters deploy is INDEPENDENT** - Deploying WikiLetters must never depend on RogueLetters state
3. **No shared mutable state** - Each game has its own data directory, high scores, etc.
4. **RogueLetters is the experiment** - If something breaks, it breaks RogueLetters first
5. **Test on RogueLetters first** - New shared code should deploy to RogueLetters before WikiLetters

---

## Current State

### Repository Structure
```
wikigames/
├── letters/           # WikiLetters (https://github.com/davebug/wikiletters)
│   ├── script.js      # 5,206 lines
│   ├── styles.css     # 1,692 lines
│   ├── index.html
│   ├── cgi-bin/       # Python CGI scripts
│   ├── data/          # Dictionary, rate limits
│   └── Dockerfile
│
├── rogueletters/      # RogueLetters (https://github.com/davebug/rogueletters)
│   ├── script.js      # 5,505 lines (+300 for roguelike mechanics)
│   ├── styles.css     # 2,139 lines (+447 for roguelike UI)
│   ├── index.html
│   ├── cgi-bin/       # Python CGI scripts (mostly identical)
│   ├── data/          # Dictionary, rate limits
│   └── Dockerfile
```

### Deployment Infrastructure
- **Docker**: Both use identical `httpd:2.4-bookworm` base images
- **Unraid**: Both deploy to Unraid server via SSH
- **Cloudflare**: Both use Cloudflare for DNS/CDN
- **Ports**: WikiLetters (85), RogueLetters (varies)

### CGI File Audit (December 2024)

| File | Status | Notes |
|------|--------|-------|
| `validate_word.py` | ✅ IDENTICAL | Core scoring, blank tile handling |
| `check_word.py` | ✅ IDENTICAL | Dictionary lookup |
| `get_rack.py` | ✅ IDENTICAL | Tile generation |
| `calculate_scores.py` | ✅ IDENTICAL | Score calculation |
| `get_high_score.py` | ✅ IDENTICAL | High score retrieval |
| `submit_high_score.py` | ✅ IDENTICAL | High score submission |
| `get_scores.py` | ✅ IDENTICAL | Leaderboard |
| `submit_score.py` | ✅ IDENTICAL | Score submission |
| `check_play.py` | ✅ IDENTICAL | Play status check |
| `fetch_wikipedia_words.py` | ✅ IDENTICAL | Word fetching |
| `generate_daily_words.py` | ✅ IDENTICAL | Daily word generation |
| `letters.py` | ⚠️ DIFFERS | Game init, tile distribution |

**11 of 12 CGI files are identical.** Only `letters.py` differs (intentionally - different game modes).

### Code Overlap Analysis

| Component | Overlap | Notes |
|-----------|---------|-------|
| `cgi-bin/*.py` | 11/12 identical | Only letters.py differs |
| Core JS (tiles, board, scoring) | ~90% shared | Blank tiles, word validation, etc. |
| JS (game-specific) | Unique | V4 encoding (Letters), roguelike mechanics (Rogue) |
| CSS (core) | ~80% shared | Tiles, board, modals |
| CSS (game-specific) | Unique | Roguelike target bars, run UI |

---

## Options for Shared Code

### Option 1: Git Submodules (Recommended for CGI)

**Structure:**
```
wikigames/
├── shared-letters-core/     # New repo for shared code
│   ├── cgi-bin/
│   │   ├── validate_word.py
│   │   ├── check_word.py
│   │   ├── get_rack.py
│   │   └── ...
│   └── data/
│       └── enable.txt
│
├── letters/
│   ├── shared/              # Git submodule → shared-letters-core
│   ├── cgi-bin/
│   │   └── letters.py       # Game-specific only
│   └── ...
│
├── rogueletters/
│   ├── shared/              # Git submodule → shared-letters-core
│   ├── cgi-bin/
│   │   └── letters.py       # Game-specific only
│   └── ...
```

**Pros:**
- Clear separation of shared vs game-specific
- Single source of truth for shared code
- Changes propagate via submodule update
- Works with existing Docker/deployment

**Cons:**
- Submodule management overhead
- Need to update Dockerfiles to copy from `shared/`
- Two repos to update when changing shared code

### Option 2: Monorepo with Symlinks

**Structure:**
```
wikigames/
├── shared/
│   ├── cgi-bin/
│   │   ├── validate_word.py
│   │   ├── check_word.py
│   │   └── ...
│   ├── js/
│   │   ├── core-tiles.js
│   │   ├── core-scoring.js
│   │   └── core-blanks.js
│   └── css/
│       ├── tiles.css
│       └── board.css
│
├── letters/
│   ├── cgi-bin → ../shared/cgi-bin  # Symlink
│   ├── script.js                     # Imports from shared
│   └── ...
│
├── rogueletters/
│   ├── cgi-bin → ../shared/cgi-bin  # Symlink
│   └── ...
```

**Pros:**
- No submodule management
- Changes immediately visible in both games
- Easy local development

**Cons:**
- Symlinks don't work in Docker build context
- Requires build step to resolve symlinks
- Git tracks symlinks differently across OS

### Option 3: NPM Package for JS (Future)

**Structure:**
```
# Published as @wikigames/letters-core
letters-core/
├── src/
│   ├── tiles.js
│   ├── scoring.js
│   ├── blanks.js
│   └── index.js
├── dist/
│   └── letters-core.min.js
└── package.json

# In each game
letters/
├── package.json          # depends on @wikigames/letters-core
├── script.js             # imports from letters-core
└── ...
```

**Pros:**
- Standard JS dependency management
- Versioned releases
- Tree-shaking possible

**Cons:**
- Significant refactor of script.js
- Need build tooling (webpack/rollup)
- Overkill for current project size

### Option 4: Docker Multi-Stage Build with Shared Base

**Structure:**
```dockerfile
# shared-letters-base/Dockerfile
FROM httpd:2.4-bookworm AS letters-base
# Install Python, copy shared CGI scripts
COPY shared/cgi-bin/*.py /usr/local/apache2/cgi-bin/
COPY shared/data/*.txt /usr/local/apache2/data/

# letters/Dockerfile
FROM letters-base AS letters
COPY letters.py /usr/local/apache2/cgi-bin/
COPY *.html script.js styles.css /usr/local/apache2/htdocs/

# rogueletters/Dockerfile
FROM letters-base AS rogueletters
COPY letters.py /usr/local/apache2/cgi-bin/
COPY *.html script.js styles.css /usr/local/apache2/htdocs/
```

**Pros:**
- Clean Docker layer caching
- Shared base image on Docker Hub
- Game-specific layers on top

**Cons:**
- Need to publish base image to registry
- Two-step build process
- Base image changes require rebuild of both games

---

## Recommended Approach: Hybrid

Given the current setup, I recommend a **phased approach**:

### Phase 1: Shared CGI Scripts (Git Submodule)

1. Create `https://github.com/davebug/letters-shared` repo
2. Move these files to shared repo:
   - `cgi-bin/validate_word.py`
   - `cgi-bin/check_word.py`
   - `cgi-bin/get_rack.py`
   - `cgi-bin/calculate_scores.py`
   - `cgi-bin/get_high_score.py`
   - `cgi-bin/submit_high_score.py`
   - `data/enable.txt`
3. Add as submodule to both games
4. Update Dockerfiles:
   ```dockerfile
   COPY shared/cgi-bin/*.py /usr/local/apache2/cgi-bin/
   COPY cgi-bin/*.py /usr/local/apache2/cgi-bin/  # Game-specific overrides
   ```

### Phase 2: Shared Docker Base Image

1. Create `davebug/letters-base` Docker image
2. Push to Docker Hub
3. Update game Dockerfiles to use base image
4. Base image contains: Python, Apache config, shared CGI scripts, dictionary

### Phase 3: Modular JavaScript (Optional)

Only if codebase grows significantly:
1. Extract core functions to separate files
2. Use simple concatenation or ES modules
3. Keep game-specific code in main script.js

---

## Implementation Details

### Submodule Setup (Phase 1)

```bash
# Create shared repo
mkdir letters-shared && cd letters-shared
git init
# Copy shared files
cp ../letters/cgi-bin/validate_word.py cgi-bin/
cp ../letters/cgi-bin/check_word.py cgi-bin/
# ... etc
git add . && git commit -m "Initial shared code"
git remote add origin https://github.com/davebug/letters-shared.git
git push -u origin main

# Add to WikiLetters
cd ../letters
git submodule add https://github.com/davebug/letters-shared.git shared
git commit -m "Add shared code submodule"

# Add to RogueLetters
cd ../rogueletters
git submodule add https://github.com/davebug/letters-shared.git shared
git commit -m "Add shared code submodule"
```

### Updated Dockerfile

```dockerfile
FROM httpd:2.4-bookworm

# Install Python
RUN apt-get update && apt-get install -y python3=3.11.2-1+b1 python3-pip && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip3 install --break-system-packages -r /tmp/requirements.txt

# Create directories
RUN mkdir -p /usr/local/apache2/cgi-bin /usr/local/apache2/data

# Copy SHARED CGI scripts first
COPY shared/cgi-bin/*.py /usr/local/apache2/cgi-bin/

# Copy GAME-SPECIFIC CGI scripts (overrides shared)
COPY cgi-bin/*.py /usr/local/apache2/cgi-bin/

# Copy shared data
COPY shared/data/*.txt /usr/local/apache2/data/

# Copy game-specific data (overrides/additions)
COPY data/*.txt /usr/local/apache2/data/

# Copy web files
COPY *.html script.js styles.css /usr/local/apache2/htdocs/

# Set permissions and configure Apache
RUN chmod +x /usr/local/apache2/cgi-bin/*.py
COPY httpd.conf /usr/local/apache2/conf/httpd.conf
RUN chown -R www-data:www-data /usr/local/apache2/data

EXPOSE 80
CMD ["httpd-foreground"]
```

### Updated Deploy Script

```bash
# In letters_deploy.sh / rogueletters_deploy.sh
# Add before docker build:
git submodule update --init --recursive
```

### Sync Workflow

When updating shared code:

```bash
# 1. Update shared repo
cd letters-shared
# make changes
git commit -am "Fix blank tile scoring"
git push

# 2. Update WikiLetters
cd ../letters
git submodule update --remote shared
git add shared
git commit -m "Update shared code"
./letters_deploy.sh

# 3. Update RogueLetters
cd ../rogueletters
git submodule update --remote shared
git add shared
git commit -m "Update shared code"
./rogueletters_deploy.sh
```

---

## Files to Share vs Keep Separate

### Shared (Phase 1)

| File | Reason |
|------|--------|
| `validate_word.py` | Core scoring logic, blank handling |
| `check_word.py` | Dictionary lookup |
| `get_rack.py` | Tile generation |
| `calculate_scores.py` | Score calculation |
| `get_high_score.py` | High score retrieval |
| `submit_high_score.py` | High score submission |
| `data/enable.txt` | Word dictionary |

### Game-Specific (Keep Separate)

| File | Reason |
|------|--------|
| `letters.py` | Different tile distribution per game |
| `script.js` | V4 encoding (Letters), roguelike (Rogue) |
| `styles.css` | Different UI themes |
| `index.html` | Different structure |
| `data/rate_limits.json` | Per-game limits |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Submodule complexity | Document workflow, add npm script shortcuts |
| Breaking changes | Version shared code, test both games |
| Merge conflicts | Keep game-specific code truly separate |
| Docker build issues | Test submodule cloning in CI |

---

## Important: What's Already Shared

Looking at `rogueletters_deploy.sh` lines 161-169, **data files are already shared at the Unraid level**:

```bash
# Sync wordlist files from WikiLetters (single source of truth)
if [ -d /mnt/user/appdata/letters/data ]; then
  cp /mnt/user/appdata/letters/data/enable.txt /mnt/user/appdata/rogueletters/data/
  cp /mnt/user/appdata/letters/data/daily_words.txt /mnt/user/appdata/rogueletters/data/
  cp /mnt/user/appdata/letters/data/starter_words.txt /mnt/user/appdata/rogueletters/data/
```

This means:
- Dictionary (`enable.txt`) is already single-source from WikiLetters
- No need for submodules for data files
- Runtime data is already handled

**The remaining shared code is CGI scripts.** These are baked into the Docker image at build time.

---

## Honest Assessment of Submodule Approach

### Will It Work?

**Yes, but with caveats:**

1. **Build context**: `docker buildx build .` includes all files in current directory. If submodule is initialized, `shared/cgi-bin/*.py` exists and `COPY` works.

2. **Fresh clone problem**:
   ```bash
   git clone https://github.com/davebug/rogueletters.git
   cd rogueletters
   docker build .  # FAILS - shared/ is empty!

   # Must do this first:
   git submodule update --init --recursive
   docker build .  # Works
   ```

3. **Deploy script change required**:
   ```bash
   # Add to deploy script BEFORE docker buildx:
   git submodule update --init --recursive
   ```

4. **Cloudflare/Unraid**: No impact - they only see the running container, not how it was built.

### Simpler Alternative: Pre-Build Copy

Since both repos exist on the developer's Mac, we could skip submodules entirely:

```bash
# In rogueletters_deploy.sh, before docker build:
echo "Syncing shared CGI scripts from WikiLetters..."
cp ../letters/cgi-bin/validate_word.py cgi-bin/
cp ../letters/cgi-bin/check_word.py cgi-bin/
cp ../letters/cgi-bin/get_rack.py cgi-bin/
# etc.
```

**Pros:**
- No submodule complexity
- Works with existing flow
- Files are versioned in each repo (can diverge if needed)

**Cons:**
- Must remember to sync before deploy
- Could add a diff check to warn of differences
- Duplicated files in git history

---

## Revised Recommendation

Given the current setup, I'd suggest:

### Option A: Manual Sync with Diff Check (Simplest)

Add to deploy scripts:
```bash
# Before build, check if shared files are in sync
echo "Checking CGI script sync status..."
for file in validate_word.py check_word.py get_rack.py; do
  if ! diff -q "../letters/cgi-bin/$file" "cgi-bin/$file" >/dev/null 2>&1; then
    echo "WARNING: $file differs from WikiLetters!"
    echo "Run: cp ../letters/cgi-bin/$file cgi-bin/"
  fi
done
```

### Option B: Auto-Sync at Build Time (Automated)

Add to deploy scripts:
```bash
# Before build, sync from WikiLetters
SHARED_FILES="validate_word.py check_word.py get_rack.py calculate_scores.py"
for file in $SHARED_FILES; do
  cp "../letters/cgi-bin/$file" "cgi-bin/$file"
done
git diff --stat cgi-bin/  # Show what changed
```

### Option C: Git Submodules (Most Correct)

Use submodules as originally planned, but:
1. Add `git submodule update --init --recursive` to deploy scripts
2. Document the workflow clearly
3. Consider a pre-commit hook to remind about submodule updates

---

## Next Steps

1. **Decide** - Which option (A, B, or C) fits your workflow best?
2. **Audit** - Run diff on all CGI files to confirm which are truly identical
3. **Implement** - Add chosen sync mechanism to deploy scripts
4. **Test** - Do a full deploy of both games
5. **Document** - Update CLAUDE.md with the workflow
