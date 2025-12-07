# RogueLetters

A roguelike word puzzle game - "Balatro for Scrabble". Forked from WikiLetters but evolving independently with run-based progression, escalating targets, and (eventually) modifiers/upgrades.

## Current State

**Phase 2 Complete:** Economy system working
- Dark roguelike theme (deep purple/black, stone-textured tiles, red accents)
- Set/Round/Turn structure with escalating score targets
- Run state persisted in localStorage
- Coin economy: $3/$4/$5 base per round + $1 per 10 surplus points
- Full-page earnings screen after each round
- Full-page set complete screen after Round 3

### Game Structure
```
Game > Set > Round > Turn
- 3 rounds per set
- 5 turns per round
- Targets escalate per set:
  Set 1: 40 → 60 → 80
  Set 2: 100 → 150 → 200
  Set 3: 250 → 375 → 500
  Set 4+: 650 → 975 → 1300
- Beat Set 5 = Victory (can continue for high score)
```

### Key Files
- `script.js` - Main game logic, includes `runState` and `runManager`
- `styles.css` - Dark roguelike theme
- `index.html` - UI structure including all popup screens

## Development

- Cache-busting: Update version numbers in HTML when changing CSS/JS
- Local dev: http://localhost:8086

```bash
./rogueletters_start.sh      # Start dev server
./rogueletters_rebuild.sh    # Rebuild container (Python changes)
./rogueletters_deploy.sh     # Deploy to production (runs tests first)
```

## Testing

```bash
cd testing/core-gameplay
npm test                     # Run all tests (headless)
npm run test:headed          # Watch tests run in browser
```

Tests run automatically on deploy. Run manually before risky changes.

## Documentation

- `docs/plans/2025-12-06-rogueletters-roguelike-design.md` - Full design doc
- `docs/plans/2025-12-06-phase1-vertical-slice.md` - Phase 1 implementation plan
- `docs/plans/IDEAS.md` - Brainstorming scratchpad for future features

## Next Up: Phase 3 (Shop)

See `docs/plans/IDEAS.md` for current thinking on:
- Shop structure (3 options, skipped items increase in price)
- Modifier/upgrade ideas

## Notes

- Do not deploy without checking localhost first
- Share buttons are hidden (random seed model doesn't support deterministic sharing)
- Wordlists are synced from WikiLetters at deploy time (single source of truth)
- This project shares code ancestry with WikiLetters but evolves independently
