# Keyboard Shortcuts Specification - Daily Letters

## Overview

Keyboard shortcuts provide power users with faster gameplay and improve accessibility for users who cannot or prefer not to use a mouse. All shortcuts should be discoverable through the help menu and have visual indicators.

## Core Gameplay Shortcuts

### Tile Selection
| Key | Action | Notes |
|-----|--------|-------|
| `1-7` | Select tile from rack by position | Number corresponds to rack position left-to-right |
| `Tab` | Cycle through tiles in rack | Forward cycling |
| `Shift+Tab` | Cycle through tiles backwards | Reverse cycling |
| `Escape` | Deselect current tile | Returns focus to rack |

### Board Navigation (with tile selected)
| Key | Action | Notes |
|-----|--------|-------|
| `↑` `↓` `←` `→` | Navigate board cells | Moves cursor one cell at a time |
| `Ctrl+Arrow` | Jump to next valid placement | Skips invalid cells |
| `Home` | Jump to leftmost valid cell in row | Current row only |
| `End` | Jump to rightmost valid cell in row | Current row only |
| `Page Up` | Jump to top of current column | |
| `Page Down` | Jump to bottom of current column | |

### Tile Placement
| Key | Action | Notes |
|-----|--------|-------|
| `Enter` | Place tile at cursor position | Only if position is valid |
| `Space` | Place tile and advance | Places and moves to next valid spot |
| `Backspace` | Remove last placed tile | Returns to rack |
| `Delete` | Remove tile at cursor | If tile was placed this turn |

## Game Actions

### Word Submission
| Key | Action | Notes |
|-----|--------|-------|
| `Ctrl+Enter` | Submit word | Only when word is valid |
| `Alt+Enter` | Submit and continue | Fast play mode |

### Tile Management
| Key | Action | Notes |
|-----|--------|-------|
| `S` | Shuffle rack tiles | Randomize order |
| `R` | Recall all tiles | Return placed tiles to rack |
| `X` | Exchange tiles mode | Enter tile exchange selection |
| `Ctrl+Z` | Undo last action | |
| `Ctrl+Y` | Redo action | |
| `Ctrl+Shift+Z` | Undo all placements | Reset current turn |

### Game Controls
| Key | Action | Notes |
|-----|--------|-------|
| `?` or `F1` | Open help menu | |
| `H` | Toggle hints | Show/hide valid placements |
| `M` | Mute/unmute sounds | |
| `T` | Toggle theme | Light/dark mode |
| `P` | Pause timer | If timer is enabled |
| `N` | New game | With confirmation |

## Advanced Shortcuts

### Quick Placement Patterns
| Key | Action | Notes |
|-----|--------|-------|
| `Ctrl+H` | Place horizontally | Auto-places selected tiles horizontally |
| `Ctrl+V` | Place vertically | Auto-places selected tiles vertically |
| `Ctrl+B` | Best placement hint | Suggests highest scoring position |

### Rack Management
| Key | Action | Notes |
|-----|--------|-------|
| `[` | Move selected tile left in rack | |
| `]` | Move selected tile right in rack | |
| `Ctrl+[` | Move tile to start of rack | |
| `Ctrl+]` | Move tile to end of rack | |
| `Alt+Click` | Swap two tiles | Click two tiles to swap |

### View Controls
| Key | Action | Notes |
|-----|--------|-------|
| `+` or `=` | Zoom in | Increase board size |
| `-` | Zoom out | Decrease board size |
| `0` | Reset zoom | Return to default size |
| `F` | Toggle fullscreen | |
| `G` | Toggle grid lines | Show/hide cell borders |

## Accessibility Shortcuts

### Screen Reader Support
| Key | Action | Notes |
|-----|--------|-------|
| `Ctrl+Alt+B` | Read board state | Announces occupied cells |
| `Ctrl+Alt+S` | Read score and turn | |
| `Ctrl+Alt+R` | Read rack contents | |
| `Ctrl+Alt+W` | Read formed words | |
| `Ctrl+Alt+H` | Read help text | Context-sensitive help |

### High Contrast Mode
| Key | Action | Notes |
|-----|--------|-------|
| `Ctrl+Shift+H` | Toggle high contrast | |
| `Ctrl+Shift+C` | Cycle color schemes | For color blindness |

## Modal and Dialog Shortcuts

### When dialogs are open
| Key | Action | Notes |
|-----|--------|-------|
| `Escape` | Close dialog | |
| `Tab` | Navigate dialog elements | |
| `Enter` | Confirm/Primary action | |
| `Space` | Select focused element | |

## Implementation Details

### JavaScript Key Handler Structure
```javascript
class KeyboardController {
  constructor(game) {
    this.game = game;
    this.shortcuts = new Map();
    this.initializeShortcuts();
    this.attachListeners();
  }

  initializeShortcuts() {
    // Tile selection
    for (let i = 1; i <= 7; i++) {
      this.shortcuts.set(`${i}`, () => this.selectTile(i - 1));
    }

    // Navigation
    this.shortcuts.set('ArrowUp', () => this.navigate('up'));
    this.shortcuts.set('ArrowDown', () => this.navigate('down'));
    this.shortcuts.set('ArrowLeft', () => this.navigate('left'));
    this.shortcuts.set('ArrowRight', () => this.navigate('right'));

    // Actions
    this.shortcuts.set('Enter', () => this.placeTile());
    this.shortcuts.set('Escape', () => this.deselectTile());
    this.shortcuts.set('s', () => this.shuffleRack());
    this.shortcuts.set('r', () => this.recallTiles());

    // With modifiers
    this.shortcuts.set('ctrl+z', () => this.undo());
    this.shortcuts.set('ctrl+y', () => this.redo());
    this.shortcuts.set('ctrl+Enter', () => this.submitWord());
  }

  handleKeyDown(event) {
    const key = this.getKeyString(event);
    const handler = this.shortcuts.get(key);

    if (handler && !this.isInputFocused()) {
      event.preventDefault();
      handler();
    }
  }

  getKeyString(event) {
    const modifiers = [];
    if (event.ctrlKey || event.metaKey) modifiers.push('ctrl');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');

    const key = event.key.toLowerCase();
    return modifiers.length ?
      `${modifiers.join('+')}+${key}` : key;
  }

  isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement.tagName === 'INPUT' ||
           activeElement.tagName === 'TEXTAREA';
  }
}
```

### Visual Indicators

```css
/* Show keyboard hints on tiles */
.tile[data-key]::after {
  content: attr(data-key);
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  color: var(--hint-color);
  opacity: 0.5;
}

/* Highlight focused elements */
.keyboard-focus {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}

/* Show shortcuts in tooltips */
.btn[data-shortcut]::after {
  content: ' (' attr(data-shortcut) ')';
  font-size: 0.9em;
  opacity: 0.7;
}
```

### Help Menu Display

```html
<div id="keyboard-help" class="modal">
  <h2>Keyboard Shortcuts</h2>

  <section>
    <h3>Basic Controls</h3>
    <dl>
      <dt>1-7</dt>
      <dd>Select tile from rack</dd>
      <dt>Arrow Keys</dt>
      <dd>Navigate board</dd>
      <dt>Enter</dt>
      <dd>Place tile</dd>
      <dt>Escape</dt>
      <dd>Cancel selection</dd>
    </dl>
  </section>

  <section>
    <h3>Game Actions</h3>
    <dl>
      <dt>Ctrl+Enter</dt>
      <dd>Submit word</dd>
      <dt>S</dt>
      <dd>Shuffle rack</dd>
      <dt>R</dt>
      <dd>Recall tiles</dd>
      <dt>Ctrl+Z</dt>
      <dd>Undo</dd>
    </dl>
  </section>
</div>
```

## Testing Requirements

### Functional Testing
- All shortcuts work as specified
- Shortcuts don't interfere with normal typing
- Modifier keys work on all platforms (Ctrl/Cmd mapping)
- Shortcuts disabled when in text input fields

### Cross-browser Testing
- Chrome/Edge (Chromium)
- Firefox
- Safari (Mac special keys)
- Mobile browsers (on-screen keyboard)

### Accessibility Testing
- Screen reader compatibility
- Keyboard-only navigation possible
- Visual focus indicators present
- No keyboard traps

### Performance Testing
- No lag on rapid key presses
- Smooth animation transitions
- Efficient event handling

## Platform Considerations

### Windows/Linux
- Use `Ctrl` for primary modifier
- `Alt` for menu access
- Standard navigation keys

### macOS
- Map `Cmd` to `Ctrl` shortcuts
- Use `Option` for `Alt`
- Handle Mac-specific keys (fn, etc.)

### Touch/Mobile
- Show on-screen controls
- Gesture equivalents where appropriate
- Virtual keyboard considerations

## Documentation

### In-game Help
- Quick reference card (? key)
- Interactive tutorial
- Tooltips with shortcuts
- First-time user hints

### External Documentation
- Complete shortcut list
- Video tutorials
- Accessibility guide
- Power user tips

## Future Enhancements

### Version 2.0
- Customizable key bindings
- Macro recording
- Voice commands
- Gamepad support

### Version 3.0
- AI-assisted placement
- Gesture controls
- Eye tracking support
- Multi-language shortcuts