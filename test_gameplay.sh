#!/bin/bash
# Quick script to run core gameplay tests
# Usage: ./test_gameplay.sh [options]

cd testing/core-gameplay

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing test dependencies..."
  npm install
fi

# Run tests with any passed arguments
npm test "$@"
