#!/bin/bash
# Script to watch Claude play Letters game

echo "🎮 Letters Game - Watch Claude Play!"
echo "===================================="
echo ""
echo "This will open a browser window where you can watch me play the game."
echo "The browser will move slowly so you can see each action."
echo ""
echo "Make sure the Letters server is running on http://localhost:8085"
echo ""
echo "Press Enter to start watching..."
read

# Run the visual test
cd /Users/daverutledge/wikigames
npx @playwright/test test letters/tests/letters-visual-play.spec.js \
  --config letters/tests/playwright.config.js \
  --reporter=list \
  --headed \
  --workers=1

echo ""
echo "Demo complete! Videos saved in test-results/ if recording was enabled."