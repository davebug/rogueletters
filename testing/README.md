# WikiLetters Testing

## Active Test Suite

**Location**: `testing/core-gameplay/`

The core gameplay test suite validates all essential game mechanics through automated browser testing.

### Running Tests

```bash
cd testing/core-gameplay

# Run all tests (headless, fast)
npm test

# Run with browser visible (watch it play!)
npm run test:headed

# Run specific suite
npm run test:gameplay    # Core gameplay scenarios
npm run test:ui          # UI interactions

# Debug mode (step through)
npm run test:debug
```

### Test Coverage

The test suite includes:
- **4 complete game scenarios** (Oct 17-20, 2025)
- Word validation & dictionary
- Scoring calculations (including bingo bonus)
- Game completion flow
- Share URL generation & round-trip
- UI interactions (shuffle, recall, tile placement)

**Runtime**: ~1.6 minutes for full suite

### Deployment Integration

Tests run automatically during deployment via `./letters_deploy.sh`

## Directory Structure

```
testing/
├── core-gameplay/       # ✅ Active test suite (maintained)
│   ├── core-gameplay-suite.spec.js
│   ├── ui-interactions-suite.spec.js
│   ├── package.json
│   └── scenarios/
├── archive/            # 📚 Historical tests & debugging scripts
│   └── README.md
└── screenshots/        # Test output screenshots
```

## Adding New Test Scenarios

To extract a new test scenario from a share URL:

```bash
cd testing/core-gameplay
npm run extract -- "https://letters.wiki/?g=ABC123..." --name="scenario-name"
```

This will create a new scenario file that can be integrated into the test suite.

## Archive

Old test files from development (Sept-Nov 2025) have been archived to `testing/archive/`. These include:
- Playwright/Puppeteer experiments (100+ files)
- Bug-specific debugging tests
- Tile rack drag-and-drop library evaluations
- Integration test iterations

See `testing/archive/README.md` for details.

## Main Game Server

Start local server: `./letters_start.sh`
Access at: http://localhost:8085/
