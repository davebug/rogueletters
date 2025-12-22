# RogueLetters

A roguelike word puzzle game - "Balatro for Scrabble". Forked from WikiLetters but evolving independently with run-based progression, escalating targets, and (eventually) modifiers/upgrades.

## Current State

**Phase 2 Complete:** Economy system working
- Dark roguelike theme (deep purple/black, stone-textured tiles, red accents)
- Set/Round/Turn structure with escalating score targets
- Run state persisted in localStorage
- Coin economy: $3/$4/$5 base per round + $1 per 10 extra points
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

### Adding New Tile Types

Tile effects (buffed, coin, etc.) use the `TILE_EFFECTS` system at top of `script.js`. To add a new tile type:

1. **Add to TILE_EFFECTS config:**
```javascript
newEffect: {
    id: 'newEffect',
    cssClass: 'new-effect-tile',      // Border styling class
    borderPriority: 3,                 // Higher = wins when multiple effects
    datasetKey: 'newEffect',           // data-new-effect attribute
    indicator: {                       // null if no indicator needed
        text: '★',
        className: 'tile-new-indicator',
        position: 'top-left',          // top-right, top-left, bottom-right, bottom-left
    },
},
```

2. **Add CSS in styles.css:**
```css
.new-effect-tile { border: 2px solid var(--your-color) !important; }
.tile-new-indicator { /* position styles */ }
```

3. **Update data model** - add property to tile objects (e.g., `newEffect: true`)

4. **Update helper functions** if needed:
   - `getActiveEffects()` - check for new property
   - `markBuffedTiles()` - if effect comes from shop purchases

Tiles can have multiple effects - border goes to highest priority, all indicators show.

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
- `docs/plans/2025-12-06-phase2-economy.md` - Phase 2 implementation plan
- `docs/plans/2025-12-06-phase4-meta-progression.md` - Phase 4 design (gems, permanent upgrades)
- `docs/plans/IDEAS.md` - Brainstorming scratchpad for future features

## Phase Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Core Loop | ✅ Complete | Sets, rounds, turns, escalating targets |
| 2. Economy | ✅ Complete | Coins, earnings screens, extra bonus |
| 3. Shop | 📋 Planned | In-run shop, spend coins on modifiers |
| 4. Meta-Progression | 📋 Planned | Gems, main menu, permanent upgrades |

### Next Up: Phase 3 (Shop)
- Shop screen after earnings (before next round)
- 4 options: tile set upgrade + 3 random modifiers
- Spend coins on in-run enhancements
- See `docs/plans/IDEAS.md` for modifier ideas

### Future: Phase 4 (Meta-Progression)
- Main menu (new entry point)
- Gems earned at set completion (persist forever)
- Gem shop between runs for permanent upgrades
- Tile set unlocks, starting bonuses, game rule tweaks
- See `docs/plans/2025-12-06-phase4-meta-progression.md`

## Notes

- Do not deploy without checking localhost first
- Share buttons are hidden (random seed model doesn't support deterministic sharing)
- Wordlists are synced from WikiLetters at deploy time (single source of truth)
- This project shares code ancestry with WikiLetters but evolves independently
