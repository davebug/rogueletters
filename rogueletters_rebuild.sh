#!/bin/bash
# Script to rebuild the RogueLetters container locally for testing
# Usage: ./rogueletters_rebuild.sh

echo "Rebuilding RogueLetters container for local testing..."
echo "This will include any changes to Python files."

# Stop and remove existing development container if it exists
echo "Stopping existing development container if running..."
docker stop rogueletters-dev 2>/dev/null || true
docker rm rogueletters-dev 2>/dev/null || true

# Build the image locally without pushing
echo "Building local development image..."
docker build -t rogueletters:dev .

if [ $? -ne 0 ]; then
  echo "Error: Local build failed!"
  exit 1
fi

# Run the container with volume mounts for live development
echo "Starting new development container..."
docker run -d --name rogueletters-dev \
  -p 8086:80 \
  -v "$(pwd)/index.html:/usr/local/apache2/htdocs/index.html" \
  -v "$(pwd)/script.js:/usr/local/apache2/htdocs/script.js" \
  -v "$(pwd)/styles.css:/usr/local/apache2/htdocs/styles.css" \
  -v "$(pwd)/httpd.conf:/usr/local/apache2/conf/httpd.conf" \
  -v "$(pwd)/cgi-bin:/usr/local/apache2/cgi-bin" \
  -v "$(pwd)/data:/usr/local/apache2/data" \
  rogueletters:dev

echo "RogueLetters development container has been rebuilt and is now running."
echo "Access it at http://localhost:8086"
echo "Changes to HTML, CSS, and JS files will be reflected immediately."
echo "Python changes are now included in the container - run this script again for future Python changes."
