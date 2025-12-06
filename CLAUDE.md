# RogueLetters

RogueLetters is a word puzzle game forked from WikiLetters. This project will evolve independently with its own unique features and gameplay mechanics.

## Development

- When making changes to css or js, use the cache-busting technique of implementing a version number in the html source
- Local development runs on port 8086: http://localhost:8086

## Quick Start

```bash
# Start development server
./rogueletters_start.sh

# Rebuild container (needed for Python changes)
./rogueletters_rebuild.sh

# Deploy to production
./rogueletters_deploy.sh
```

## Testing

### Core Gameplay Test Suite
Located in `testing/core-gameplay/`, this test suite validates essential game mechanics:
- Word validation & dictionary
- Scoring calculations
- Game completion flow
- Share URL generation & round-trip
- UI interactions (shuffle, recall, tile swap)

**When to run tests:**
- ✅ **Automatically:** Tests run automatically when you deploy with `./rogueletters_deploy.sh`
- ✅ **Before risky changes:** Making major changes to game logic, scoring, or word validation
- ✅ **After fixing bugs:** Verify the fix works and doesn't break other features
- ✅ **When adding features:** Ensure new features don't break existing gameplay

**How to run tests:**
```bash
cd testing/core-gameplay

# Run all tests (headless, fast)
npm test

# Run with browser visible (watch it play!)
npm run test:headed

# Run specific test suite
npm run test:gameplay    # Core gameplay only
npm run test:ui          # UI interactions only

# Debug mode (step through)
npm run test:debug
```

## Notes

- Do not deploy to production without checking with me first. We always want to check on the localhost version first.
- This project is independent from WikiLetters - changes here do not affect WikiLetters.
