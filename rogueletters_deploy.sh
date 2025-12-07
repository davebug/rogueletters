#!/bin/bash
# Standalone RogueLetters deployment script (for future independent deployment)
# Usage: ./rogueletters_deploy.sh [options]
#
# This will be used when RogueLetters moves to its own domain

# Default configuration
UNRAID_HOST="unraid"
CONTAINER_NAME="rogueletters"
IMAGE_NAME="davebug/rogueletters"
PORT="86"  # Default port for standalone RogueLetters

# Function to display help
show_help() {
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -h, --help                 Show this help message"
  echo "  -s, --server HOSTNAME      Specify Unraid server hostname (default: unraid)"
  echo "  -p, --port PORT            Specify container port (default: 86)"
  echo ""
  echo "Example:"
  echo "  $0 --server unraid.local --port 87"
  exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      ;;
    -s|--server)
      UNRAID_HOST="$2"
      shift 2
      ;;
    -p|--port)
      PORT="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      ;;
  esac
done

echo "=== RogueLetters Full Deployment (Standalone) ==="
echo "Local: Build and push to Docker Hub"
echo "Remote: Deploy to Unraid at ${UNRAID_HOST}"
echo "Container port: ${PORT}"
echo ""

# Function to handle errors
handle_error() {
  echo "ERROR: $1"
  exit 1
}

# Step 0: Run test suite before deployment
echo "=== Step 0: Running Core Gameplay Tests ==="
echo "Validating game mechanics before deployment..."
echo ""

cd testing/core-gameplay || handle_error "Could not find testing/core-gameplay directory"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing test dependencies..."
  npm install || handle_error "Failed to install test dependencies"
fi

# Run the tests
npm test

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ DEPLOYMENT ABORTED: Tests failed!"
  echo ""
  echo "Fix the failing tests before deploying to production."
  echo "To deploy anyway (not recommended), edit rogueletters_deploy.sh"
  exit 1
fi

echo ""
echo "✅ All tests passed! Proceeding with deployment..."
echo ""

# Return to root directory
cd ../..

# Step 1: Build the image with cross-platform support
echo "Building RogueLetters image for production..."
docker buildx build --platform linux/amd64 -t ${IMAGE_NAME}:latest . || handle_error "RogueLetters build failed!"

# Step 2: Push to Docker Hub
echo "Pushing RogueLetters image to Docker Hub..."
docker buildx build --platform linux/amd64 -t ${IMAGE_NAME}:latest --push . || handle_error "Failed to push RogueLetters image to Docker Hub!"

# Tag with date for versioning
DATE_TAG=$(date +"%Y%m%d")
echo "Tagging image with date: $DATE_TAG"
docker buildx build --platform linux/amd64 -t ${IMAGE_NAME}:$DATE_TAG --push .

echo "Local build and push completed successfully!"
echo ""

# Step 3: Deploy to Unraid via SSH
echo "Deploying to Unraid server..."
echo "Connecting to ${UNRAID_HOST} using SSH..."

# Create a temporary deployment script
TMP_SCRIPT=$(mktemp)
cat > ${TMP_SCRIPT} << EOF
#!/bin/bash
echo "=== Deploying RogueLetters on Unraid ==="
echo "Started at: \$(date)"

# Check if there's a previous container and get its logs before stopping
if docker inspect ${CONTAINER_NAME} >/dev/null 2>&1; then
  echo "Getting logs from previous container before stopping..."
  docker logs ${CONTAINER_NAME} > /tmp/rogueletters_previous_logs.txt 2>&1
  echo "Last 20 log entries from previous container:"
  tail -n 20 /tmp/rogueletters_previous_logs.txt

  echo "Checking container stats before stopping..."
  docker stats ${CONTAINER_NAME} --no-stream
fi

# Stop the current container
echo "Stopping current ${CONTAINER_NAME} container..."
docker stop ${CONTAINER_NAME} 2>/dev/null || true

# Backup the stable container if it exists
if docker inspect ${CONTAINER_NAME}-stable >/dev/null 2>&1; then
  echo "Removing previous stable backup..."
  docker rm ${CONTAINER_NAME}-stable 2>/dev/null || true
fi

# Rename current container to stable for backup
if docker inspect ${CONTAINER_NAME} >/dev/null 2>&1; then
  echo "Creating backup of current container..."
  docker rename ${CONTAINER_NAME} ${CONTAINER_NAME}-stable 2>/dev/null || true
fi

# Pull the latest image
echo "Pulling latest ${IMAGE_NAME} image..."
docker pull ${IMAGE_NAME}:latest

if [ \$? -ne 0 ]; then
  echo "Error: Failed to pull latest ${IMAGE_NAME} image!"
  exit 1
fi

# Create data directories if they don't exist
echo "Ensuring data directories exist..."
mkdir -p /mnt/user/appdata/rogueletters/data/plays
mkdir -p /mnt/user/appdata/rogueletters/data/highscores
chmod -R 755 /mnt/user/appdata/rogueletters

# Sync wordlist files from WikiLetters (single source of truth)
echo "Syncing wordlist files from WikiLetters..."
if [ -d /mnt/user/appdata/letters/data ]; then
  cp /mnt/user/appdata/letters/data/enable.txt /mnt/user/appdata/rogueletters/data/ 2>/dev/null && echo "  Copied enable.txt"
  cp /mnt/user/appdata/letters/data/daily_words.txt /mnt/user/appdata/rogueletters/data/ 2>/dev/null && echo "  Copied daily_words.txt"
  cp /mnt/user/appdata/letters/data/starter_words.txt /mnt/user/appdata/rogueletters/data/ 2>/dev/null && echo "  Copied starter_words.txt"
else
  echo "  Warning: WikiLetters data not found, using bundled wordlists"
fi

# Start new container with restart policy and persistent data
echo "Starting new ${CONTAINER_NAME} container..."
docker run -d --name ${CONTAINER_NAME} \\
  --restart unless-stopped \\
  --log-opt max-size=10m \\
  --log-opt max-file=3 \\
  --memory=512m \\
  --memory-swap=1g \\
  -p ${PORT}:80 \\
  -v /mnt/user/appdata/rogueletters/data:/usr/local/apache2/data \\
  ${IMAGE_NAME}:latest

if [ \$? -ne 0 ]; then
  echo "Error: Failed to start new ${CONTAINER_NAME} container!"
  echo "Attempting to restore previous version..."
  docker rename ${CONTAINER_NAME}-stable ${CONTAINER_NAME} 2>/dev/null || true
  docker start ${CONTAINER_NAME} 2>/dev/null || true
  exit 1
fi

# Create monitoring script if it doesn't exist
if [ ! -f /root/monitor_rogueletters.sh ]; then
  echo "Creating RogueLetters monitoring script..."
  cat > /root/monitor_rogueletters.sh << 'MONSCRIPT'
#!/bin/bash
# Monitor script for RogueLetters container
# Add to crontab with: */15 * * * * /bin/bash /root/monitor_rogueletters.sh

LOG_FILE="/root/rogueletters_monitor.log"
CONTAINER="rogueletters"

echo "\$(date): Checking \$CONTAINER status..." >> \$LOG_FILE

# Check if container is running
if ! docker ps | grep -q \$CONTAINER; then
  echo "\$(date): \$CONTAINER is not running! Attempting to restart..." >> \$LOG_FILE

  # Capture logs before restart
  echo "Last 50 log entries before restart:" >> \$LOG_FILE
  docker logs --tail 50 \$CONTAINER >> \$LOG_FILE 2>&1

  # Restart container
  docker start \$CONTAINER

  if [ \$? -eq 0 ]; then
    echo "\$(date): \$CONTAINER successfully restarted." >> \$LOG_FILE
  else
    echo "\$(date): Failed to restart \$CONTAINER!" >> \$LOG_FILE
  fi

  # Get container stats after restart attempt
  echo "Container stats after restart attempt:" >> \$LOG_FILE
  docker stats \$CONTAINER --no-stream >> \$LOG_FILE 2>&1
else
  # Container is running, log status every hour
  HOUR=\$(date +%H)
  MIN=\$(date +%M)
  if [ "\$MIN" == "00" ]; then
    echo "\$(date): \$CONTAINER is running normally." >> \$LOG_FILE
    echo "Current container stats:" >> \$LOG_FILE
    docker stats \$CONTAINER --no-stream >> \$LOG_FILE 2>&1
  fi
fi
MONSCRIPT

  chmod +x /root/monitor_rogueletters.sh

  # Add to crontab if not already there
  if ! crontab -l | grep -q "monitor_rogueletters.sh"; then
    (crontab -l 2>/dev/null; echo "*/15 * * * * /bin/bash /root/monitor_rogueletters.sh") | crontab -
    echo "Added monitoring script to crontab."
  fi
fi

echo ""
echo "=== RogueLetters deployment completed successfully! ==="
echo "Completed at: \$(date)"
echo ""
echo "The container is now running with:"
echo "- Automatic restart policy"
echo "- Memory limits (512MB with 1GB swap)"
echo "- Log rotation (10MB max size, 3 files max)"
echo "- Persistent data volume at /mnt/user/appdata/rogueletters"
echo "- Monitoring script running every 15 minutes"
echo ""
echo "Monitor logs can be viewed with: cat /root/rogueletters_monitor.log"
EOF

# Make the temporary script executable
chmod +x ${TMP_SCRIPT}

# Copy the script to the remote server and execute it
scp ${TMP_SCRIPT} ${UNRAID_HOST}:/tmp/deploy_rogueletters.sh || handle_error "Failed to copy deployment script to Unraid"
ssh ${UNRAID_HOST} "bash /tmp/deploy_rogueletters.sh" || handle_error "Remote deployment failed"

# Clean up the temporary script
rm ${TMP_SCRIPT}
ssh ${UNRAID_HOST} "rm /tmp/deploy_rogueletters.sh" 2>/dev/null || true

echo ""
echo "=== Full deployment completed successfully! ==="
echo "RogueLetters has been built, pushed to Docker Hub, and deployed to Unraid"
echo "It should be accessible at http://${UNRAID_HOST}:${PORT}"
echo "Data is persisted at /mnt/user/appdata/rogueletters on the Unraid server"
