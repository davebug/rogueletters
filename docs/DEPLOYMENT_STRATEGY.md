# Deployment Strategy for dates.wiki/letters

## Current Setup Analysis

WikiDates is deployed at dates.wiki (root level) using:
- Docker container (davebug/wikidates)
- Apache serving from `/usr/local/apache2/htdocs/`
- CGI scripts in `/usr/local/apache2/cgi-bin/`
- Port 83 on Unraid server

## Options for Adding Letters to dates.wiki/letters

### Option 1: Shared Container (Recommended for MVP)
Deploy Letters INSIDE the existing WikiDates container.

**Pros:**
- Minimal changes to existing setup
- Reuses existing infrastructure
- Easy to implement quickly

**Cons:**
- Couples the two games together
- Updates affect both games

**Implementation:**
1. Modify WikiDates Docker image to include Letters files
2. Create `/letters/` subdirectory structure
3. Update Apache config for subdirectory routing

### Option 2: Reverse Proxy Setup
Keep separate containers, use nginx/Apache to route.

**Pros:**
- Clean separation of concerns
- Independent deployments
- Better for long-term

**Cons:**
- More complex setup
- Requires proxy configuration
- Additional container to manage

### Option 3: Separate Subdomain
Deploy at letters.dates.wiki instead.

**Pros:**
- Completely independent
- Simplest deployment

**Cons:**
- Different from requested URL structure
- Requires DNS changes

## Recommended Approach: Modified WikiDates Container

### Step 1: Modify WikiDates Dockerfile

```dockerfile
# Add Letters files to existing WikiDates container
FROM httpd:2.4-bookworm

# ... existing WikiDates setup ...

# Create Letters subdirectory
RUN mkdir -p /usr/local/apache2/htdocs/letters
RUN mkdir -p /usr/local/apache2/cgi-bin/letters

# Copy Letters files
COPY letters/index.html /usr/local/apache2/htdocs/letters/
COPY letters/script.js /usr/local/apache2/htdocs/letters/
COPY letters/styles.css /usr/local/apache2/htdocs/letters/

# Copy Letters CGI scripts
COPY letters/cgi-bin/*.py /usr/local/apache2/cgi-bin/letters/

# Copy Letters data files
COPY letters/data /usr/local/apache2/data/letters/

# Ensure executable
RUN chmod +x /usr/local/apache2/cgi-bin/letters/*.py
```

### Step 2: Update Apache Configuration

```apache
# Add to httpd.conf

# Letters game subdirectory
Alias /letters "/usr/local/apache2/htdocs/letters"
<Directory "/usr/local/apache2/htdocs/letters">
    Options Indexes FollowSymLinks
    AllowOverride None
    Require all granted
</Directory>

# Letters CGI configuration
ScriptAlias /letters/cgi-bin/ "/usr/local/apache2/cgi-bin/letters/"
<Directory "/usr/local/apache2/cgi-bin/letters">
    AllowOverride None
    Options +ExecCGI
    AddHandler cgi-script .py
    Require all granted
</Directory>
```

### Step 3: Modify Letters JavaScript for Subdirectory

```javascript
// Update script.js to handle subdirectory paths

const BASE_PATH = '/letters';  // Add base path

// Update fetch calls
function fetchGameData(seed) {
    fetch(`${BASE_PATH}/cgi-bin/letters.py?seed=${seed}`)
        .then(response => response.json())
        // ...
}

// Update URL handling
function setURLParameter(seed) {
    const newurl = `${window.location.protocol}//${window.location.host}${BASE_PATH}/?seed=${seed}`;
    window.history.pushState({ path: newurl }, '', newurl);
}
```

## Development Workflow

### Local Testing with Subdirectory

Create a combined development script:

```bash
#!/bin/bash
# letters_start_subdirectory.sh

echo "Starting Letters in dates.wiki subdirectory mode..."

# Build combined image
docker build -f Dockerfile.combined -t dates-wiki-combined:dev .

# Run with both games
docker run -d --name dates-wiki-dev \
  -p 8083:80 \
  -v "$(pwd)/../wikidates:/usr/local/apache2/htdocs" \
  -v "$(pwd):/usr/local/apache2/htdocs/letters" \
  dates-wiki-combined:dev

echo "Access WikiDates at http://localhost:8083"
echo "Access Letters at http://localhost:8083/letters"
```

## Deployment Script

```bash
#!/bin/bash
# deploy_to_dates_wiki.sh

echo "Deploying Letters to dates.wiki/letters..."

# Step 1: Copy Letters files to WikiDates directory
cp -r ../letters ../wikidates/letters-temp

# Step 2: Build updated WikiDates image
cd ../wikidates
docker buildx build --platform linux/amd64 \
  -t davebug/wikidates:with-letters \
  -f Dockerfile.with-letters .

# Step 3: Push to Docker Hub
docker push davebug/wikidates:with-letters

# Step 4: Deploy to Unraid (using existing WikiDates deployment)
./wikidates_deploy.sh

# Cleanup
rm -rf letters-temp
```

## Alternative: Standalone Development First

For initial development, create standalone Letters at localhost:8085:

```bash
#!/bin/bash
# letters_start.sh (Standalone version)

echo "Starting Letters standalone for development..."

docker build -t letters:dev .

docker run -d --name letters-dev \
  -p 8085:80 \
  -v "$(pwd)/index.html:/usr/local/apache2/htdocs/index.html" \
  -v "$(pwd)/script.js:/usr/local/apache2/htdocs/script.js" \
  -v "$(pwd)/styles.css:/usr/local/apache2/htdocs/styles.css" \
  -v "$(pwd)/cgi-bin:/usr/local/apache2/cgi-bin" \
  letters:dev

echo "Letters running at http://localhost:8085"
```

Then later adapt for subdirectory deployment.

## URL Structure Considerations

### Development URLs:
- Standalone: `http://localhost:8085/?seed=20240315`
- Subdirectory: `http://localhost:8083/letters/?seed=20240315`

### Production URLs:
- Target: `https://dates.wiki/letters/?seed=20240315`
- Share link: `https://dates.wiki/letters/?seed=20240315`

### Required Code Changes:

1. **HTML**: Update asset paths
```html
<!-- From -->
<link rel="stylesheet" href="styles.css">
<script src="script.js"></script>

<!-- To -->
<link rel="stylesheet" href="/letters/styles.css">
<script src="/letters/script.js"></script>
```

2. **JavaScript**: Update API endpoints
```javascript
// From
fetch('/cgi-bin/letters.py')

// To
fetch('/letters/cgi-bin/letters.py')
```

3. **Python**: Update any absolute paths
```python
# From
dict_path = "/usr/local/apache2/data/enable.txt"

# To
dict_path = "/usr/local/apache2/data/letters/enable.txt"
```

## Recommendation

1. **Phase 1**: Develop Letters standalone (localhost:8085)
2. **Phase 2**: Test subdirectory mode locally
3. **Phase 3**: Deploy to dates.wiki/letters using modified WikiDates container
4. **Phase 4**: Later separate into independent containers if needed

This approach allows quick deployment while maintaining flexibility for future separation.