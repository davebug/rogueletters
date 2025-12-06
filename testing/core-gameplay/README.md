# WikiLetters Core Gameplay Test Suite

Validates essential game mechanics by actually playing through complete games.

## What It Tests

- **Word Validation**: All words are accepted by the dictionary
- **Scoring Calculations**: Turn scores match expected values
- **Game Completion**: Games end properly after 5 turns
- **Share URL Generation**: URLs generate correctly and load the same game state

## Quick Start

### Prerequisites

1. Start the local Docker server:
   ```bash
   cd /Users/daverutledge/wikigames/letters
   ./letters_start.sh
   ```

2. Verify the server is running at http://localhost:8085

### Running Tests

```bash
# Run all tests (headless)
npm test

# Run with browser visible
npm run test:headed

# Run in debug mode (step through)
npm run test:debug

# Run with Playwright UI
npm run test:ui
```

## Adding New Test Scenarios

### Extract from Share URL

1. Play a game on letters.wiki or localhost
2. Copy the share URL from the completion popup
3. Extract the scenario:

```bash
npm run extract -- "https://letters.wiki/?g=ABC123..." --name="my-scenario-name"
```

This creates two files:
- `scenarios/YYYYMMDD-my-scenario-name.json` - Test scenario
- `baselines/YYYYMMDD-my-scenario-name.baseline.json` - Expected outcomes

### Scenario Types

**Positive Scenarios** (type: "positive")
- Valid games that should complete successfully
- Used for regression testing

**Negative Scenarios** (type: "negative")
- Invalid words or illegal placements
- Currently skipped - to be implemented later

## Test Execution Flow

1. **Extract Expected Moves**: Load share URL and extract turnHistory
2. **Start Fresh Game**: Load game with same seed
3. **Play Through**: Programmatically place tiles and submit each turn
4. **Verify**: Check word validation, scoring, and game completion
5. **Round-Trip**: Generate share URL and verify it loads correctly

## Directory Structure

```
core-gameplay/
├── scenarios/          # Test scenario JSON files
├── baselines/          # Known-good baseline files
├── lib/                # Helper modules (future)
├── tools/              # Extraction tools
├── reports/            # Test run reports (generated)
│   └── screenshots/    # Failure screenshots (generated)
└── core-gameplay-suite.spec.js  # Main test runner
```

## Typical Test Output

```
=== Testing: high-score-grandpa-129pts ===
Source: https://letters.wiki/?g=IR4MKWILLFEE0qepRsnicUOc2scaiPpBUpNU5qA
Expected score: 129

[1/5] Loading share URL to extract expected moves...
Expected moves extracted: 5 turns

[2/5] Starting fresh game...
Game loaded with seed: 20251020

[3/5] Playing through game turn-by-turn...
  Turn 1: Placing 3 tiles
  ✓ Turn 1 complete: 22 points (expected: 22)
  Turn 2: Placing 4 tiles
  ✓ Turn 2 complete: 18 points (expected: 18)
  ...

[4/5] Verifying game completion...
✓ Game completed: 129 points

[5/5] Verifying share URL generation and round-trip...
✓ Share URL round-trip verified: 23 tiles loaded correctly

=== ✓ high-score-grandpa-129pts PASSED ===

1 passed (24.3s)
```

## Troubleshooting

### "Server not running" errors
- Ensure Docker container is running: `./letters_start.sh`
- Check http://localhost:8085 loads in browser

### "Could not find tile" errors
- Scenario may not match the seed's tile distribution
- Re-extract the scenario from a fresh share URL

### Timeout errors
- Increase timeout values in core-gameplay-suite.spec.js
- Check browser dev tools for JavaScript errors

## Implementation Notes

- Uses Playwright for browser automation
- Tests run against localhost:8085 (Docker)
- Share URLs automatically converted from letters.wiki to localhost
- Each test is fully independent (no shared state)
- Scenarios extracted from real game playthroughs
