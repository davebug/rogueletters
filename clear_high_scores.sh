#!/bin/bash
# Clear high scores and rate limits
# Use this before deploying to production to start fresh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HIGH_SCORES_DIR="${SCRIPT_DIR}/data/high_scores"
RATE_LIMITS_FILE="${SCRIPT_DIR}/data/rate_limits.json"

echo "🧹 Clearing high scores and rate limits..."

# Clear high scores
if [ -d "$HIGH_SCORES_DIR" ]; then
    echo "  Removing high score files from: $HIGH_SCORES_DIR"
    rm -f "$HIGH_SCORES_DIR"/*.json
    echo "  ✓ High scores cleared"
else
    echo "  ⚠️  High scores directory not found: $HIGH_SCORES_DIR"
fi

# Clear rate limits
if [ -f "$RATE_LIMITS_FILE" ]; then
    echo "  Removing rate limits file: $RATE_LIMITS_FILE"
    rm -f "$RATE_LIMITS_FILE"
    echo "  ✓ Rate limits cleared"
else
    echo "  ℹ️  Rate limits file not found (this is OK)"
fi

echo ""
echo "✅ Done! High scores and rate limits have been cleared."
echo ""
echo "Note: This only clears LOCAL data. To clear production data:"
echo "  1. SSH into your production server"
echo "  2. Run: docker exec letters rm -f /usr/local/apache2/data/high_scores/*.json"
echo "  3. Run: docker exec letters rm -f /usr/local/apache2/data/rate_limits.json"
