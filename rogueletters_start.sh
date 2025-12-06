#!/bin/bash
# Script to start RogueLetters locally for testing
# Usage: ./rogueletters_start.sh

echo "Starting RogueLetters locally for testing..."

# Check if container exists and is running
CONTAINER_RUNNING=$(docker ps -q -f name=rogueletters-dev)
CONTAINER_EXISTS=$(docker ps -a -q -f name=rogueletters-dev)

if [ -n "$CONTAINER_RUNNING" ]; then
  echo "RogueLetters development container is already running."
  echo "Access it at http://localhost:8086"
  echo "Note: Python file changes require rebuilding the container with ./rogueletters_rebuild.sh"
  exit 0
fi

if [ -n "$CONTAINER_EXISTS" ]; then
  echo "Starting existing RogueLetters development container..."
  docker start rogueletters-dev
else
  echo "Creating new RogueLetters development container..."
  # Build the image if it doesn't exist
  if ! docker images | grep -q "rogueletters:dev"; then
    echo "Building RogueLetters development image..."
    docker build -t rogueletters:dev .
  fi

  # Run the container with volume mounts for live development
  docker run -d --name rogueletters-dev \
    -p 8086:80 \
    -v "$(pwd)/index.html:/usr/local/apache2/htdocs/index.html" \
    -v "$(pwd)/script.js:/usr/local/apache2/htdocs/script.js" \
    -v "$(pwd)/styles.css:/usr/local/apache2/htdocs/styles.css" \
    -v "$(pwd)/httpd.conf:/usr/local/apache2/conf/httpd.conf" \
    -v "$(pwd)/cgi-bin:/usr/local/apache2/cgi-bin" \
    -v "$(pwd)/data:/usr/local/apache2/data" \
    rogueletters:dev
fi

echo "RogueLetters development container is now running."
echo "Access it at http://localhost:8086"
echo "Changes to HTML, CSS, and JS files will be reflected immediately."
echo "Note: Python file changes require rebuilding the container with ./rogueletters_rebuild.sh"
