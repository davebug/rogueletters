# Implementation Methodology - Daily Letters

## Overview

This document outlines the technical implementation approach for adding the missing features to Daily Letters. It covers architecture patterns, state management, testing strategies, and deployment methodologies to ensure robust, maintainable code.

## 1. Architecture Pattern

### Model-View-Controller (MVC) Approach

```javascript
// Model - Game State Management
class GameModel {
  constructor() {
    this.state = {
      board: this.initializeBoard(),
      rack: [],
      placedTiles: [],
      currentTurn: 1,
      score: 0,
      retries: 10,
      history: [],
      validPlacements: new Set(),
      gameStatus: 'active' // active, paused, complete
    };

    this.observers = [];
  }

  // State mutation methods
  placeTile(tile, row, col) {
    const placement = { tile, row, col, timestamp: Date.now() };
    this.state.placedTiles.push(placement);
    this.state.history.push({ type: 'place', data: placement });
    this.notifyObservers('tilePlaced', placement);
  }

  undo() {
    if (this.state.history.length === 0) return false;

    const lastAction = this.state.history.pop();
    switch (lastAction.type) {
      case 'place':
        this.undoPlacement(lastAction.data);
        break;
      case 'swap':
        this.undoSwap(lastAction.data);
        break;
    }

    this.notifyObservers('stateChanged', this.state);
    return true;
  }

  // Observer pattern for reactive updates
  subscribe(observer) {
    this.observers.push(observer);
  }

  notifyObservers(event, data) {
    this.observers.forEach(observer => observer.update(event, data));
  }
}

// View - UI Rendering
class GameView {
  constructor(model) {
    this.model = model;
    this.elements = this.cacheElements();
    this.bindEvents();
    model.subscribe(this);
  }

  cacheElements() {
    return {
      board: document.getElementById('game-board'),
      rack: document.getElementById('tile-rack'),
      score: document.getElementById('current-score'),
      turnCounter: document.getElementById('turn-counter'),
      submitBtn: document.getElementById('submit-word'),
      undoBtn: document.getElementById('undo-button'),
      shuffleBtn: document.getElementById('shuffle-button')
    };
  }

  update(event, data) {
    switch (event) {
      case 'tilePlaced':
        this.renderTilePlacement(data);
        break;
      case 'stateChanged':
        this.renderFullState(data);
        break;
      case 'scoreUpdated':
        this.animateScoreChange(data);
        break;
    }
  }

  renderTilePlacement(placement) {
    const cell = this.getBoardCell(placement.row, placement.col);
    const tileElement = this.createTileElement(placement.tile);
    cell.appendChild(tileElement);

    // Animate placement
    requestAnimationFrame(() => {
      tileElement.classList.add('tile-placed');
    });
  }
}

// Controller - User Input Handling
class GameController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.dragManager = new DragDropManager(this);
    this.keyboardManager = new KeyboardManager(this);
    this.initializeEventHandlers();
  }

  initializeEventHandlers() {
    // Tile selection
    this.view.elements.rack.addEventListener('click', (e) => {
      if (e.target.classList.contains('tile')) {
        this.selectTile(e.target);
      }
    });

    // Board placement
    this.view.elements.board.addEventListener('click', (e) => {
      if (e.target.classList.contains('board-cell')) {
        this.placeTileAtCell(e.target);
      }
    });

    // Game actions
    this.view.elements.submitBtn.addEventListener('click', () => {
      this.submitWord();
    });

    this.view.elements.undoBtn.addEventListener('click', () => {
      this.model.undo();
    });
  }

  selectTile(tileElement) {
    // Deselect previous
    document.querySelectorAll('.tile.selected').forEach(t =>
      t.classList.remove('selected')
    );

    tileElement.classList.add('selected');
    this.selectedTile = tileElement;
    this.updateValidPlacements();
  }

  updateValidPlacements() {
    const validCells = this.model.getValidPlacements(this.selectedTile);
    this.view.highlightValidCells(validCells);
  }
}
```

## 2. State Management Strategy

### Immutable State Updates

```javascript
class StateManager {
  constructor(initialState) {
    this.state = Object.freeze(initialState);
    this.history = [this.state];
    this.historyIndex = 0;
    this.maxHistorySize = 50;
  }

  updateState(updates) {
    // Create new state object, preserving immutability
    const newState = Object.freeze({
      ...this.state,
      ...updates,
      lastModified: Date.now()
    });

    // Manage history
    if (this.historyIndex < this.history.length - 1) {
      // Remove future history if we've undone and are making new changes
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(newState);

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }

    this.state = newState;
    this.persistState();

    return newState;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.state = this.history[this.historyIndex];
      return this.state;
    }
    return null;
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.state = this.history[this.historyIndex];
      return this.state;
    }
    return null;
  }

  // Local storage persistence
  persistState() {
    const stateToSave = {
      state: this.state,
      timestamp: Date.now(),
      version: '1.0.0'
    };

    try {
      localStorage.setItem('letters_game_state', JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to save state:', e);
      // Handle quota exceeded
      this.clearOldStates();
    }
  }

  loadState() {
    try {
      const saved = localStorage.getItem('letters_game_state');
      if (saved) {
        const { state, timestamp, version } = JSON.parse(saved);

        // Check if save is from today
        const savedDate = new Date(timestamp).toDateString();
        const today = new Date().toDateString();

        if (savedDate === today && this.isCompatibleVersion(version)) {
          this.state = state;
          this.history = [state];
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
    return false;
  }
}
```

### Event-Driven State Updates

```javascript
class EventBus {
  constructor() {
    this.events = {};
    this.queuedEvents = [];
    this.processing = false;
  }

  on(event, callback, priority = 0) {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push({ callback, priority });

    // Sort by priority
    this.events[event].sort((a, b) => b.priority - a.priority);
  }

  emit(event, data) {
    // Queue events to prevent recursive updates
    this.queuedEvents.push({ event, data });

    if (!this.processing) {
      this.processQueue();
    }
  }

  async processQueue() {
    this.processing = true;

    while (this.queuedEvents.length > 0) {
      const { event, data } = this.queuedEvents.shift();

      if (this.events[event]) {
        for (const { callback } of this.events[event]) {
          try {
            await callback(data);
          } catch (error) {
            console.error(`Error in event handler for ${event}:`, error);
          }
        }
      }
    }

    this.processing = false;
  }
}

// Usage
const eventBus = new EventBus();

eventBus.on('tile:placed', async (data) => {
  await validatePlacement(data);
  updateScore(data);
  checkWordCompletion();
});

eventBus.on('word:submitted', async (data) => {
  const result = await validateWord(data);
  if (result.valid) {
    updateGameState(result);
    showSuccessFeedback();
  } else {
    showErrorFeedback(result.message);
  }
});
```

## 3. Feature Implementation Patterns

### Drag and Drop Implementation

```javascript
class DragDropManager {
  constructor(gameController) {
    this.controller = gameController;
    this.draggedTile = null;
    this.ghostTile = null;
    this.validDropTargets = new Set();
    this.initializeDragDrop();
  }

  initializeDragDrop() {
    // Make tiles draggable
    document.querySelectorAll('.tile').forEach(tile => {
      tile.draggable = true;
      tile.addEventListener('dragstart', this.handleDragStart.bind(this));
      tile.addEventListener('dragend', this.handleDragEnd.bind(this));
    });

    // Set up drop zones
    document.querySelectorAll('.board-cell').forEach(cell => {
      cell.addEventListener('dragover', this.handleDragOver.bind(this));
      cell.addEventListener('drop', this.handleDrop.bind(this));
      cell.addEventListener('dragleave', this.handleDragLeave.bind(this));
    });
  }

  handleDragStart(e) {
    this.draggedTile = e.target;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);

    // Create ghost image
    this.createGhostImage(e);

    // Mark valid drop targets
    this.updateValidDropTargets();

    // Add dragging class
    e.target.classList.add('dragging');
  }

  createGhostImage(e) {
    this.ghostTile = e.target.cloneNode(true);
    this.ghostTile.classList.add('ghost-tile');
    document.body.appendChild(this.ghostTile);

    e.dataTransfer.setDragImage(this.ghostTile, 25, 25);
  }

  updateValidDropTargets() {
    const validCells = this.controller.model.getValidPlacements(this.draggedTile);

    validCells.forEach(({ row, col }) => {
      const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      if (cell) {
        cell.classList.add('valid-drop-target');
        this.validDropTargets.add(cell);
      }
    });
  }

  handleDragOver(e) {
    if (this.validDropTargets.has(e.target)) {
      e.preventDefault(); // Allow drop
      e.dataTransfer.dropEffect = 'move';
      e.target.classList.add('drag-over');
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  }

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    if (this.validDropTargets.has(e.target)) {
      const row = parseInt(e.target.dataset.row);
      const col = parseInt(e.target.dataset.col);

      this.controller.placeTile(this.draggedTile, row, col);
    }

    this.cleanup();
  }

  handleDragEnd(e) {
    this.cleanup();
  }

  cleanup() {
    // Remove classes
    document.querySelectorAll('.dragging').forEach(el =>
      el.classList.remove('dragging')
    );

    document.querySelectorAll('.valid-drop-target').forEach(el =>
      el.classList.remove('valid-drop-target')
    );

    document.querySelectorAll('.drag-over').forEach(el =>
      el.classList.remove('drag-over')
    );

    // Remove ghost
    if (this.ghostTile && this.ghostTile.parentNode) {
      this.ghostTile.parentNode.removeChild(this.ghostTile);
    }

    this.validDropTargets.clear();
    this.draggedTile = null;
    this.ghostTile = null;
  }
}
```

### Undo/Redo System

```javascript
class UndoRedoManager {
  constructor(gameModel) {
    this.model = gameModel;
    this.undoStack = [];
    this.redoStack = [];
    this.batchDepth = 0;
    this.currentBatch = null;
  }

  // Record an action
  recordAction(action) {
    const actionRecord = {
      type: action.type,
      data: this.cloneData(action.data),
      timestamp: Date.now(),
      inverse: this.getInverseAction(action)
    };

    if (this.batchDepth > 0) {
      // Add to current batch
      if (!this.currentBatch) {
        this.currentBatch = {
          type: 'batch',
          actions: []
        };
      }
      this.currentBatch.actions.push(actionRecord);
    } else {
      // Add as single action
      this.undoStack.push(actionRecord);

      // Clear redo stack when new action is performed
      this.redoStack = [];

      // Limit undo stack size
      if (this.undoStack.length > 50) {
        this.undoStack.shift();
      }
    }

    this.updateUI();
  }

  // Start batch operation
  beginBatch() {
    this.batchDepth++;
  }

  // End batch operation
  endBatch() {
    this.batchDepth--;

    if (this.batchDepth === 0 && this.currentBatch) {
      this.undoStack.push(this.currentBatch);
      this.currentBatch = null;
      this.redoStack = [];
      this.updateUI();
    }
  }

  // Perform undo
  undo() {
    if (!this.canUndo()) return false;

    const action = this.undoStack.pop();

    if (action.type === 'batch') {
      // Undo batch in reverse order
      for (let i = action.actions.length - 1; i >= 0; i--) {
        this.executeInverse(action.actions[i]);
      }
    } else {
      this.executeInverse(action);
    }

    this.redoStack.push(action);
    this.updateUI();

    return true;
  }

  // Perform redo
  redo() {
    if (!this.canRedo()) return false;

    const action = this.redoStack.pop();

    if (action.type === 'batch') {
      // Redo batch in original order
      for (const subAction of action.actions) {
        this.executeAction(subAction);
      }
    } else {
      this.executeAction(action);
    }

    this.undoStack.push(action);
    this.updateUI();

    return true;
  }

  // Get inverse action for undo
  getInverseAction(action) {
    switch (action.type) {
      case 'placeTile':
        return {
          type: 'removeTile',
          data: action.data
        };

      case 'removeTile':
        return {
          type: 'placeTile',
          data: action.data
        };

      case 'swapTiles':
        return {
          type: 'swapTiles',
          data: {
            tile1: action.data.tile2,
            tile2: action.data.tile1
          }
        };

      default:
        console.warn(`No inverse for action type: ${action.type}`);
        return null;
    }
  }

  executeInverse(action) {
    if (action.inverse) {
      this.model.executeAction(action.inverse, { skipRecord: true });
    }
  }

  executeAction(action) {
    this.model.executeAction(action, { skipRecord: true });
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  updateUI() {
    const undoBtn = document.getElementById('undo-button');
    const redoBtn = document.getElementById('redo-button');

    if (undoBtn) {
      undoBtn.disabled = !this.canUndo();
      undoBtn.title = this.canUndo() ?
        `Undo ${this.undoStack[this.undoStack.length - 1].type}` :
        'Nothing to undo';
    }

    if (redoBtn) {
      redoBtn.disabled = !this.canRedo();
      redoBtn.title = this.canRedo() ?
        `Redo ${this.redoStack[this.redoStack.length - 1].type}` :
        'Nothing to redo';
    }
  }

  // Deep clone data for immutability
  cloneData(data) {
    return JSON.parse(JSON.stringify(data));
  }
}
```

### Animation System

```javascript
class AnimationManager {
  constructor() {
    this.animations = new Map();
    this.running = false;
  }

  // Register animation sequences
  registerAnimation(name, sequence) {
    this.animations.set(name, sequence);
  }

  // Play animation
  async play(name, element, options = {}) {
    const sequence = this.animations.get(name);
    if (!sequence) {
      console.warn(`Animation '${name}' not found`);
      return;
    }

    const animation = element.animate(sequence.keyframes, {
      duration: options.duration || sequence.duration || 300,
      easing: options.easing || sequence.easing || 'ease-in-out',
      fill: options.fill || 'both',
      ...options
    });

    return animation.finished;
  }

  // Chain animations
  async sequence(animations) {
    for (const { name, element, options, parallel } of animations) {
      if (parallel) {
        // Run in parallel with next animation
        this.play(name, element, options);
      } else {
        // Wait for completion
        await this.play(name, element, options);
      }
    }
  }

  // Initialize standard animations
  initializeAnimations() {
    // Tile placement
    this.registerAnimation('tilePlacement', {
      keyframes: [
        { transform: 'scale(1.2) rotate(10deg)', opacity: 0.8 },
        { transform: 'scale(1) rotate(0)', opacity: 1 }
      ],
      duration: 300,
      easing: 'ease-out'
    });

    // Score increment
    this.registerAnimation('scoreIncrement', {
      keyframes: [
        { transform: 'scale(1)', color: 'var(--text-primary)' },
        { transform: 'scale(1.3)', color: 'var(--success-color)' },
        { transform: 'scale(1)', color: 'var(--text-primary)' }
      ],
      duration: 500
    });

    // Invalid placement shake
    this.registerAnimation('invalidShake', {
      keyframes: [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(0)' }
      ],
      duration: 500
    });

    // Tile recall
    this.registerAnimation('tileRecall', {
      keyframes: [
        { transform: 'scale(1) translateY(0)', opacity: 1 },
        { transform: 'scale(0.8) translateY(-20px)', opacity: 0.5 },
        { transform: 'scale(0.6) translateY(-40px)', opacity: 0 }
      ],
      duration: 300
    });

    // Shuffle
    this.registerAnimation('shuffle', {
      keyframes: [
        { transform: 'translateY(0) rotate(0)' },
        { transform: 'translateY(-30px) rotate(180deg)' },
        { transform: 'translateY(0) rotate(360deg)' }
      ],
      duration: 400
    });
  }
}

// Usage
const animationManager = new AnimationManager();
animationManager.initializeAnimations();

// Animate tile placement
async function animateTilePlacement(tileElement) {
  await animationManager.play('tilePlacement', tileElement);
}

// Animate score change
async function animateScoreChange(scoreElement, newScore) {
  scoreElement.textContent = newScore;
  await animationManager.play('scoreIncrement', scoreElement);
}

// Chain animations
async function animateWordSubmission(tiles, scoreElement) {
  await animationManager.sequence([
    ...tiles.map(tile => ({
      name: 'tilePlacement',
      element: tile,
      parallel: true
    })),
    {
      name: 'scoreIncrement',
      element: scoreElement
    }
  ]);
}
```

## 4. Testing Methodology

### Unit Testing Pattern

```javascript
// Jest test example
describe('GameModel', () => {
  let model;

  beforeEach(() => {
    model = new GameModel();
  });

  describe('tile placement', () => {
    test('should place tile on empty cell', () => {
      const tile = { letter: 'A', value: 1 };
      const result = model.placeTile(tile, 5, 5);

      expect(result).toBe(true);
      expect(model.state.board[5][5]).toEqual(tile);
      expect(model.state.placedTiles).toHaveLength(1);
    });

    test('should not place tile on occupied cell', () => {
      const tile1 = { letter: 'A', value: 1 };
      const tile2 = { letter: 'B', value: 3 };

      model.placeTile(tile1, 5, 5);
      const result = model.placeTile(tile2, 5, 5);

      expect(result).toBe(false);
      expect(model.state.board[5][5]).toEqual(tile1);
    });

    test('should validate tile placement rules', () => {
      // Set up board with existing word
      model.state.board[7][7] = { letter: 'C', value: 3 };

      const tile = { letter: 'A', value: 1 };

      // Valid placement (adjacent)
      expect(model.isValidPlacement(tile, 7, 8)).toBe(true);

      // Invalid placement (disconnected)
      expect(model.isValidPlacement(tile, 0, 0)).toBe(false);
    });
  });

  describe('undo/redo', () => {
    test('should undo last placement', () => {
      const tile = { letter: 'A', value: 1 };
      model.placeTile(tile, 5, 5);

      model.undo();

      expect(model.state.board[5][5]).toBe(null);
      expect(model.state.placedTiles).toHaveLength(0);
    });

    test('should redo after undo', () => {
      const tile = { letter: 'A', value: 1 };
      model.placeTile(tile, 5, 5);

      model.undo();
      model.redo();

      expect(model.state.board[5][5]).toEqual(tile);
      expect(model.state.placedTiles).toHaveLength(1);
    });
  });
});
```

### Integration Testing

```javascript
// Playwright integration test
describe('Tile Manipulation Features', () => {
  test('should allow tile recall by clicking', async ({ page }) => {
    await page.goto('http://localhost:8085');

    // Place a tile
    const tile = await page.locator('.tile').first();
    await tile.click();

    const cell = await page.locator('[data-row="8"][data-col="7"]');
    await cell.click();

    // Click to recall
    const placedTile = await cell.locator('.tile');
    await placedTile.click();

    // Verify tile returned to rack
    const rackTileCount = await page.locator('#tile-rack .tile').count();
    expect(rackTileCount).toBe(7);
  });

  test('should shuffle rack on button click', async ({ page }) => {
    await page.goto('http://localhost:8085');

    // Get initial tile order
    const initialOrder = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.tile-letter'))
        .map(el => el.textContent);
    });

    // Click shuffle
    await page.click('#shuffle-button');

    // Get new order
    const newOrder = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.tile-letter'))
        .map(el => el.textContent);
    });

    // Verify order changed but same tiles
    expect(newOrder).not.toEqual(initialOrder);
    expect(newOrder.sort()).toEqual(initialOrder.sort());
  });
});
```

### Performance Testing

```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = [];
  }

  // Measure function execution time
  measureFunction(name, fn) {
    return async (...args) => {
      const startTime = performance.now();

      try {
        const result = await fn(...args);
        const duration = performance.now() - startTime;

        this.recordMetric(name, duration);

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        this.recordMetric(name, duration, true);
        throw error;
      }
    };
  }

  // Record metric
  recordMetric(name, duration, error = false) {
    if (!this.metrics[name]) {
      this.metrics[name] = {
        count: 0,
        total: 0,
        min: Infinity,
        max: -Infinity,
        errors: 0
      };
    }

    const metric = this.metrics[name];
    metric.count++;
    metric.total += duration;
    metric.min = Math.min(metric.min, duration);
    metric.max = Math.max(metric.max, duration);

    if (error) {
      metric.errors++;
    }

    // Alert if performance degrades
    if (duration > this.getThreshold(name)) {
      console.warn(`Performance degradation in ${name}: ${duration.toFixed(2)}ms`);
    }
  }

  getThreshold(name) {
    const thresholds = {
      'placeTile': 50,
      'validateWord': 100,
      'submitWord': 500,
      'renderBoard': 16, // 60fps
      'shuffleRack': 100
    };

    return thresholds[name] || 100;
  }

  // Get performance report
  getReport() {
    const report = {};

    for (const [name, metric] of Object.entries(this.metrics)) {
      report[name] = {
        avgDuration: metric.total / metric.count,
        minDuration: metric.min,
        maxDuration: metric.max,
        callCount: metric.count,
        errorRate: metric.errors / metric.count
      };
    }

    return report;
  }
}

// Usage
const perfMonitor = new PerformanceMonitor();

// Wrap functions to monitor
const monitoredPlaceTile = perfMonitor.measureFunction('placeTile', placeTile);
const monitoredValidateWord = perfMonitor.measureFunction('validateWord', validateWord);
```

## 5. Progressive Enhancement Strategy

### Feature Detection and Fallbacks

```javascript
class FeatureDetector {
  constructor() {
    this.features = this.detectFeatures();
    this.applyPolyfills();
  }

  detectFeatures() {
    return {
      dragDrop: this.supportsDragDrop(),
      touch: this.supportsTouch(),
      webAnimations: this.supportsWebAnimations(),
      localStorage: this.supportsLocalStorage(),
      webWorkers: this.supportsWebWorkers(),
      clipboard: this.supportsClipboard(),
      vibration: this.supportsVibration()
    };
  }

  supportsDragDrop() {
    const div = document.createElement('div');
    return ('draggable' in div) && ('ondrop' in div);
  }

  supportsTouch() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  supportsWebAnimations() {
    return 'animate' in Element.prototype;
  }

  supportsLocalStorage() {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  supportsWebWorkers() {
    return typeof Worker !== 'undefined';
  }

  supportsClipboard() {
    return navigator.clipboard && navigator.clipboard.writeText;
  }

  supportsVibration() {
    return 'vibrate' in navigator;
  }

  applyPolyfills() {
    // Add requestAnimationFrame polyfill
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = (callback) => {
        return setTimeout(callback, 1000 / 60);
      };
    }

    // Add Array.from polyfill for older browsers
    if (!Array.from) {
      Array.from = function(arrayLike) {
        return Array.prototype.slice.call(arrayLike);
      };
    }
  }

  // Get appropriate implementation based on features
  getImplementation(feature) {
    switch (feature) {
      case 'tilePlacement':
        if (this.features.dragDrop && !this.features.touch) {
          return new DragDropPlacement();
        } else if (this.features.touch) {
          return new TouchPlacement();
        } else {
          return new ClickPlacement();
        }

      case 'animation':
        if (this.features.webAnimations) {
          return new WebAnimationAPI();
        } else {
          return new CSSAnimation();
        }

      case 'storage':
        if (this.features.localStorage) {
          return new LocalStorageManager();
        } else {
          return new CookieStorage();
        }

      default:
        return null;
    }
  }
}
```

### Graceful Degradation Example

```javascript
class TilePlacementManager {
  constructor() {
    this.detector = new FeatureDetector();
    this.initializePlacement();
  }

  initializePlacement() {
    if (this.detector.features.dragDrop) {
      this.enableDragDrop();
    }

    if (this.detector.features.touch) {
      this.enableTouch();
    }

    // Always enable click as fallback
    this.enableClick();

    // Enable keyboard for accessibility
    this.enableKeyboard();
  }

  enableDragDrop() {
    console.log('Enabling drag and drop');
    // Implementation shown earlier
  }

  enableTouch() {
    console.log('Enabling touch controls');

    let touchedTile = null;

    document.addEventListener('touchstart', (e) => {
      const tile = e.target.closest('.tile');
      if (tile) {
        touchedTile = tile;
        tile.classList.add('touched');
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (!touchedTile) return;

      e.preventDefault();

      const touch = e.touches[0];
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);

      if (elementBelow?.classList.contains('board-cell')) {
        elementBelow.classList.add('touch-hover');
      }
    });

    document.addEventListener('touchend', (e) => {
      if (!touchedTile) return;

      const touch = e.changedTouches[0];
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);

      if (elementBelow?.classList.contains('board-cell')) {
        this.placeTile(touchedTile, elementBelow);
      }

      // Cleanup
      document.querySelectorAll('.touch-hover').forEach(el =>
        el.classList.remove('touch-hover')
      );
      touchedTile.classList.remove('touched');
      touchedTile = null;
    });
  }

  enableClick() {
    console.log('Enabling click controls');
    // Basic click implementation as fallback
  }

  enableKeyboard() {
    console.log('Enabling keyboard controls');
    // Keyboard implementation
  }
}
```

## 6. Deployment Methodology

### Build Process

```javascript
// webpack.config.js
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      main: './src/index.js',
      polyfills: './src/polyfills.js'
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      clean: true
    },

    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    browsers: ['last 2 versions', 'ie >= 11']
                  },
                  modules: false
                }]
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'postcss-loader'
          ]
        }
      ]
    },

    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction
            }
          }
        }),
        new CssMinimizerPlugin()
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10
          }
        }
      }
    },

    plugins: [
      new MiniCssExtractPlugin({
        filename: isProduction ? '[name].[contenthash].css' : '[name].css'
      })
    ]
  };
};
```

### Feature Flag System

```javascript
class FeatureFlags {
  constructor() {
    this.flags = this.loadFlags();
    this.userGroups = this.getUserGroups();
  }

  loadFlags() {
    // In production, load from server
    // For development, use local config
    return {
      'drag-drop': {
        enabled: true,
        rollout: 100, // Percentage
        groups: ['all']
      },
      'keyboard-shortcuts': {
        enabled: true,
        rollout: 100,
        groups: ['all']
      },
      'undo-redo': {
        enabled: true,
        rollout: 100,
        groups: ['all']
      },
      'shuffle-rack': {
        enabled: true,
        rollout: 50, // A/B testing
        groups: ['beta']
      },
      'tile-exchange': {
        enabled: false, // Not yet implemented
        rollout: 0,
        groups: ['internal']
      }
    };
  }

  getUserGroups() {
    // Determine user groups based on various factors
    const groups = ['all'];

    // Check if beta user
    if (localStorage.getItem('beta_user') === 'true') {
      groups.push('beta');
    }

    // Check if internal user
    if (window.location.hostname === 'internal.letters.com') {
      groups.push('internal');
    }

    return groups;
  }

  isEnabled(featureName) {
    const flag = this.flags[featureName];

    if (!flag || !flag.enabled) {
      return false;
    }

    // Check group membership
    const inGroup = flag.groups.some(group =>
      group === 'all' || this.userGroups.includes(group)
    );

    if (!inGroup) {
      return false;
    }

    // Check rollout percentage
    if (flag.rollout < 100) {
      const userId = this.getUserId();
      const hash = this.hashString(userId + featureName);
      const percentage = (hash % 100) + 1;

      return percentage <= flag.rollout;
    }

    return true;
  }

  getUserId() {
    let userId = localStorage.getItem('user_id');

    if (!userId) {
      userId = this.generateUserId();
      localStorage.setItem('user_id', userId);
    }

    return userId;
  }

  generateUserId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// Usage
const featureFlags = new FeatureFlags();

if (featureFlags.isEnabled('drag-drop')) {
  initializeDragDrop();
}

if (featureFlags.isEnabled('keyboard-shortcuts')) {
  initializeKeyboard();
}
```

### Monitoring and Analytics

```javascript
class Analytics {
  constructor() {
    this.queue = [];
    this.batchSize = 10;
    this.flushInterval = 5000; // 5 seconds

    this.startBatching();
  }

  track(event, properties = {}) {
    const eventData = {
      event,
      properties: {
        ...properties,
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        userId: this.getUserId(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    };

    this.queue.push(eventData);

    // Flush if batch size reached
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  startBatching() {
    setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  async flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events })
      });
    } catch (error) {
      console.error('Failed to send analytics:', error);

      // Re-queue events on failure
      this.queue.unshift(...events);
    }
  }

  // Track specific game events
  trackGameEvent(action, details) {
    this.track('game_action', {
      action,
      ...details
    });
  }

  // Track feature usage
  trackFeatureUsage(feature, action) {
    this.track('feature_usage', {
      feature,
      action
    });
  }

  // Track errors
  trackError(error, context) {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      context
    });
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('session_id');

    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36);
      sessionStorage.setItem('session_id', sessionId);
    }

    return sessionId;
  }

  getUserId() {
    // Same as feature flags implementation
    return localStorage.getItem('user_id') || 'anonymous';
  }
}

// Initialize analytics
const analytics = new Analytics();

// Track game events
analytics.trackGameEvent('word_submitted', {
  word: 'EXAMPLE',
  score: 25,
  turn: 3
});

// Track feature usage
analytics.trackFeatureUsage('drag_drop', 'tile_placed');

// Error tracking
window.addEventListener('error', (event) => {
  analytics.trackError(event.error, {
    url: event.filename,
    line: event.lineno,
    column: event.colno
  });
});
```

## Summary

This implementation methodology provides:

1. **Clear Architecture**: MVC pattern with separation of concerns
2. **Robust State Management**: Immutable updates with undo/redo
3. **Feature Modularity**: Each feature as independent module
4. **Progressive Enhancement**: Feature detection with fallbacks
5. **Comprehensive Testing**: Unit, integration, and performance tests
6. **Safe Deployment**: Feature flags and gradual rollout
7. **Monitoring**: Analytics and error tracking

The methodology ensures that new features are added systematically, with proper testing and fallbacks, maintaining code quality and user experience across all platforms and browsers.