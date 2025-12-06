#!/bin/bash
# Script to deploy RogueLetters to dates.wiki/rogueletters (subdirectory deployment)
# This modifies the WikiDates container to include RogueLetters
# Usage: ./rogueletters_deploy_subdirectory.sh

echo "=== RogueLetters Subdirectory Deployment to dates.wiki/rogueletters ==="
echo "This will update the WikiDates container to include RogueLetters"
echo ""

# Function to handle errors
handle_error() {
  echo "ERROR: $1"
  exit 1
}

# Step 1: Prepare RogueLetters files for integration
echo "Preparing RogueLetters files for integration..."

# Create temporary staging directory
STAGING_DIR="../wikidates/rogueletters_integration"
rm -rf $STAGING_DIR 2>/dev/null
mkdir -p $STAGING_DIR

# Copy RogueLetters files to staging
cp -r . $STAGING_DIR/
cd $STAGING_DIR

# Step 2: Create modified Dockerfile for WikiDates + RogueLetters
echo "Creating combined Dockerfile..."
cat > ../Dockerfile.with-rogueletters << 'EOF'
FROM httpd:2.4-bookworm

# Install Python and dependencies (WikiDates requirements)
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create Python virtual environment
RUN python3 -m venv /usr/local/apache2/venv

# Copy and install WikiDates Python requirements
COPY requirements.txt /requirements.txt
RUN /usr/local/apache2/venv/bin/pip install --no-cache-dir -r /requirements.txt

# Copy WikiDates files (root level)
COPY index.html /usr/local/apache2/htdocs/
COPY script.js /usr/local/apache2/htdocs/
COPY styles.css /usr/local/apache2/htdocs/

# Copy WikiDates CGI script
COPY wikidates.py /usr/local/apache2/cgi-bin/
RUN chmod +x /usr/local/apache2/cgi-bin/wikidates.py

# Create RogueLetters subdirectories
RUN mkdir -p /usr/local/apache2/htdocs/rogueletters
RUN mkdir -p /usr/local/apache2/cgi-bin/rogueletters
RUN mkdir -p /usr/local/apache2/data/rogueletters

# Copy RogueLetters files
COPY rogueletters_integration/index.html /usr/local/apache2/htdocs/rogueletters/
COPY rogueletters_integration/script.js /usr/local/apache2/htdocs/rogueletters/
COPY rogueletters_integration/styles.css /usr/local/apache2/htdocs/rogueletters/

# Copy RogueLetters CGI scripts
COPY rogueletters_integration/cgi-bin/*.py /usr/local/apache2/cgi-bin/rogueletters/
RUN chmod +x /usr/local/apache2/cgi-bin/rogueletters/*.py

# Copy RogueLetters data files if they exist
COPY rogueletters_integration/data/* /usr/local/apache2/data/rogueletters/ 2>/dev/null || true

# Copy Apache configuration with subdirectory support
COPY httpd-with-rogueletters.conf /usr/local/apache2/conf/httpd.conf

# Ensure proper permissions
RUN chown -R www-data:www-data /usr/local/apache2/htdocs
RUN chown -R www-data:www-data /usr/local/apache2/cgi-bin
RUN chown -R www-data:www-data /usr/local/apache2/data

# Expose port 80
EXPOSE 80
EOF

# Step 3: Create Apache config with RogueLetters subdirectory support
echo "Creating Apache configuration with subdirectory support..."
cp ../httpd.conf ../httpd-with-rogueletters.conf

# Append RogueLetters configuration to httpd.conf
cat >> ../httpd-with-rogueletters.conf << 'EOF'

# RogueLetters game subdirectory configuration
Alias /rogueletters "/usr/local/apache2/htdocs/rogueletters"
<Directory "/usr/local/apache2/htdocs/rogueletters">
    Options Indexes FollowSymLinks
    AllowOverride None
    Require all granted
</Directory>

# RogueLetters CGI configuration
ScriptAlias /rogueletters/cgi-bin/ "/usr/local/apache2/cgi-bin/rogueletters/"
<Directory "/usr/local/apache2/cgi-bin/rogueletters">
    AllowOverride None
    Options +ExecCGI
    AddHandler cgi-script .py
    Require all granted
    SetEnv PYTHONPATH /usr/local/apache2/venv/lib/python3.11/site-packages
</Directory>
EOF

# Step 4: Update RogueLetters JavaScript for subdirectory paths
echo "Updating RogueLetters JavaScript for subdirectory deployment..."
sed -i.bak 's|/cgi-bin/|/rogueletters/cgi-bin/|g' script.js
sed -i.bak 's|href="styles.css"|href="/rogueletters/styles.css"|g' index.html
sed -i.bak 's|src="script.js"|src="/rogueletters/script.js"|g' index.html

# Add BASE_PATH to script.js if not already there
if ! grep -q "const BASE_PATH" script.js; then
  cat > script_temp.js << 'EOF'
const BASE_PATH = '/rogueletters';

EOF
  cat script.js >> script_temp.js
  mv script_temp.js script.js
fi

# Step 5: Build and push combined image
cd ../
echo "Building combined WikiDates + RogueLetters image..."
docker buildx build --platform linux/amd64 \
  -f Dockerfile.with-rogueletters \
  -t davebug/wikidates:with-rogueletters .

if [ $? -ne 0 ]; then
  handle_error "Build failed!"
fi

echo "Pushing to Docker Hub..."
docker buildx build --platform linux/amd64 \
  -f Dockerfile.with-rogueletters \
  -t davebug/wikidates:with-rogueletters \
  --push .

if [ $? -ne 0 ]; then
  handle_error "Push failed!"
fi

# Step 6: Deploy using WikiDates deployment script
echo "Deploying to production..."
echo "Note: This will update the WikiDates container to include RogueLetters"
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Temporarily modify wikidates_deploy.sh to use new image
  sed -i.bak 's|davebug/wikidates:latest|davebug/wikidates:with-rogueletters|g' wikidates_deploy.sh

  ./wikidates_deploy.sh

  # Restore original wikidates_deploy.sh
  mv wikidates_deploy.sh.bak wikidates_deploy.sh
else
  echo "Deployment cancelled."
fi

# Cleanup
echo "Cleaning up temporary files..."
rm -rf rogueletters_integration
rm -f Dockerfile.with-rogueletters
rm -f httpd-with-rogueletters.conf

echo ""
echo "=== Deployment Complete ==="
echo "WikiDates is accessible at https://dates.wiki"
echo "RogueLetters is accessible at https://dates.wiki/rogueletters"
