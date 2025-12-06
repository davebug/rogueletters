# State Management Architecture - Daily Letters

## Overview

This document defines the comprehensive state management architecture for Daily Letters, focusing on maintaining game state consistency, enabling complex features like undo/redo, and ensuring optimal performance.

## State Structure

### Complete Game State Schema

```javascript
const gameStateSchema = {
  // Core game data
  game: {
    id: String,           // Unique game ID (date-based)
    seed: String,         // YYYYMMDD seed
    startTime: Number,    // Timestamp when game started
    endTime: Number,      // Timestamp when game ended (null if active)
    status: String,       // 'not_started', 'active', 'paused', 'completed'
    mode: String          // 'normal', 'practice', 'challenge'
  },

  // Board state
  board: {
    cells: Array(15).fill(Array(15).fill(null)), // 15x15 grid
    startingWord: {
      word: String,
      position: { row: Number, col: Number },
      direction: String, // 'horizontal' or 'vertical'
      context: String    // Wikipedia context
    },
    multipliers: Map,    // Cell positions to multiplier types
    occupiedCells: Set,  // Set of "row,col" strings for quick lookup
  },

  // Player state
  player: {
    rack: Array(7),      // Current tiles in rack
    rackOrder: Array(7), // Indices for tile positions
    score: Number,
    turnsCompleted: Number,
    retriesUsed: Number,
    retriesRemaining: Number,
    wordsPlayed: Array,  // History of successfully played words
    fingerprint: String  // Browser fingerprint for first-play detection
  },

  // Current turn state
  currentTurn: {
    placedTiles: Array,  // Tiles placed this turn
    wordsFormed: Array,  // Words created this turn
    scorePreview: Number, // Potential score if submitted
    validationStatus: String, // 'unchecked', 'valid', 'invalid'
    validationMessage: String
  },

  // UI state
  ui: {
    selectedTile: Number | null,    // Index of selected rack tile
    hoveredCell: Object | null,     // {row, col} of hovered board cell
    draggedTile: Object | null,     // Tile being dragged
    validPlacements: Set,           // Set of valid cell positions
    invalidPlacements: Set,         // Set of invalid cell positions
    showHints: Boolean,
    showTimer: Boolean,
    theme: String,                  // 'light' or 'dark'
    soundEnabled: Boolean,
    animationsEnabled: Boolean
  },

  // History for undo/redo
  history: {
    past: Array,         // Previous states
    present: Object,     // Current state snapshot
    future: Array,       // States after undo
    maxSize: Number      // Maximum history size (default 50)
  },

  // Statistics
  statistics: {
    totalMoves: Number,
    undoCount: Number,
    redoCount: Number,
    shuffleCount: Number,
    recallCount: Number,
    timeElapsed: Number,
    pausedTime: Number
  },

  // Feature flags
  features: {
    dragDropEnabled: Boolean,
    keyboardEnabled: Boolean,
    undoRedoEnabled: Boolean,
    shuffleEnabled: Boolean,
    exchangeEnabled: Boolean,
    hintsEnabled: Boolean
  }
};
```

## State Management Patterns

### 1. Redux-like State Container

```javascript
class StateContainer {
  constructor(initialState, reducer) {
    this.state = initialState;
    this.reducer = reducer;
    this.listeners = new Set();
    this.middleware = [];
    this.isDispatching = false;
  }

  // Get current state (read-only)
  getState() {
    return Object.freeze(this.deepClone(this.state));
  }

  // Dispatch action to update state
  dispatch(action) {
    if (this.isDispatching) {
      throw new Error('Cannot dispatch while reducing');
    }

    this.isDispatching = true;

    try {
      // Run middleware
      let finalAction = action;
      for (const mw of this.middleware) {
        finalAction = mw(this)(this.dispatch.bind(this))(finalAction);
        if (!finalAction) return;
      }

      // Apply reducer
      const prevState = this.state;
      this.state = this.reducer(this.state, finalAction);

      // Notify listeners if state changed
      if (this.state !== prevState) {
        this.notifyListeners();
      }

      return finalAction;
    } finally {
      this.isDispatching = false;
    }
  }

  // Subscribe to state changes
  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    this.listeners.add(listener);

    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  // Add middleware
  use(middleware) {
    this.middleware.push(middleware);
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Deep clone helper
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Set) return new Set(Array.from(obj));
    if (obj instanceof Map) return new Map(Array.from(obj));

    const cloned = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      cloned[key] = this.deepClone(obj[key]);
    }

    return cloned;
  }
}
```

### 2. Action Types and Creators

```javascript
// Action types
const ActionTypes = {
  // Game actions
  START_GAME: 'START_GAME',
  END_GAME: 'END_GAME',
  PAUSE_GAME: 'PAUSE_GAME',
  RESUME_GAME: 'RESUME_GAME',

  // Tile actions
  SELECT_TILE: 'SELECT_TILE',
  DESELECT_TILE: 'DESELECT_TILE',
  PLACE_TILE: 'PLACE_TILE',
  REMOVE_TILE: 'REMOVE_TILE',
  RECALL_TILES: 'RECALL_TILES',
  SHUFFLE_RACK: 'SHUFFLE_RACK',
  EXCHANGE_TILES: 'EXCHANGE_TILES',
  REORDER_RACK: 'REORDER_RACK',

  // Word actions
  SUBMIT_WORD: 'SUBMIT_WORD',
  VALIDATE_WORD: 'VALIDATE_WORD',
  ACCEPT_WORD: 'ACCEPT_WORD',
  REJECT_WORD: 'REJECT_WORD',

  // Turn actions
  START_TURN: 'START_TURN',
  END_TURN: 'END_TURN',
  USE_RETRY: 'USE_RETRY',

  // UI actions
  SET_HOVERED_CELL: 'SET_HOVERED_CELL',
  SET_VALID_PLACEMENTS: 'SET_VALID_PLACEMENTS',
  TOGGLE_HINTS: 'TOGGLE_HINTS',
  TOGGLE_SOUND: 'TOGGLE_SOUND',
  TOGGLE_THEME: 'TOGGLE_THEME',

  // History actions
  UNDO: 'UNDO',
  REDO: 'REDO',
  SAVE_CHECKPOINT: 'SAVE_CHECKPOINT'
};

// Action creators
const ActionCreators = {
  // Tile placement
  placeTile: (tile, row, col) => ({
    type: ActionTypes.PLACE_TILE,
    payload: { tile, row, col, timestamp: Date.now() }
  }),

  removeTile: (row, col) => ({
    type: ActionTypes.REMOVE_TILE,
    payload: { row, col }
  }),

  selectTile: (index) => ({
    type: ActionTypes.SELECT_TILE,
    payload: { index }
  }),

  shuffleRack: () => ({
    type: ActionTypes.SHUFFLE_RACK,
    payload: { timestamp: Date.now() }
  }),

  // Word submission
  submitWord: () => ({
    type: ActionTypes.SUBMIT_WORD,
    payload: { timestamp: Date.now() }
  }),

  validateWord: (words) => ({
    type: ActionTypes.VALIDATE_WORD,
    payload: { words }
  }),

  // Complex actions (thunks)
  placeAndValidate: (tile, row, col) => {
    return (dispatch, getState) => {
      dispatch(ActionCreators.placeTile(tile, row, col));

      const state = getState();
      const words = extractWordsFormed(state);

      dispatch(ActionCreators.validateWord(words));
    };
  }
};
```

### 3. Reducer Implementation

```javascript
class GameReducer {
  constructor() {
    this.reducers = this.combineReducers({
      game: this.gameReducer,
      board: this.boardReducer,
      player: this.playerReducer,
      currentTurn: this.currentTurnReducer,
      ui: this.uiReducer,
      statistics: this.statisticsReducer
    });
  }

  // Main reducer
  reduce(state, action) {
    // Handle history actions separately
    if (action.type === ActionTypes.UNDO) {
      return this.handleUndo(state);
    }

    if (action.type === ActionTypes.REDO) {
      return this.handleRedo(state);
    }

    // Apply combined reducers
    const newState = this.reducers(state, action);

    // Update history after state change
    if (this.shouldSaveHistory(action)) {
      newState.history = this.updateHistory(state, newState);
    }

    return newState;
  }

  // Combine multiple reducers
  combineReducers(reducerMap) {
    return (state, action) => {
      let hasChanged = false;
      const nextState = {};

      for (const key in reducerMap) {
        const reducer = reducerMap[key];
        const prevSubState = state[key];
        const nextSubState = reducer(prevSubState, action);

        nextState[key] = nextSubState;
        hasChanged = hasChanged || nextSubState !== prevSubState;
      }

      // Preserve unchanged parts
      for (const key in state) {
        if (!nextState.hasOwnProperty(key)) {
          nextState[key] = state[key];
        }
      }

      return hasChanged ? nextState : state;
    };
  }

  // Board reducer
  boardReducer(state = {}, action) {
    switch (action.type) {
      case ActionTypes.PLACE_TILE: {
        const { tile, row, col } = action.payload;
        const newCells = state.cells.map(r => [...r]);
        newCells[row][col] = tile;

        const newOccupied = new Set(state.occupiedCells);
        newOccupied.add(`${row},${col}`);

        return {
          ...state,
          cells: newCells,
          occupiedCells: newOccupied
        };
      }

      case ActionTypes.REMOVE_TILE: {
        const { row, col } = action.payload;
        const newCells = state.cells.map(r => [...r]);
        newCells[row][col] = null;

        const newOccupied = new Set(state.occupiedCells);
        newOccupied.delete(`${row},${col}`);

        return {
          ...state,
          cells: newCells,
          occupiedCells: newOccupied
        };
      }

      case ActionTypes.RECALL_TILES: {
        // Remove all tiles placed this turn
        const newCells = state.cells.map(r => [...r]);
        const newOccupied = new Set(state.occupiedCells);

        // Implementation depends on tracking current turn tiles
        // ...

        return {
          ...state,
          cells: newCells,
          occupiedCells: newOccupied
        };
      }

      default:
        return state;
    }
  }

  // Player reducer
  playerReducer(state = {}, action) {
    switch (action.type) {
      case ActionTypes.PLACE_TILE: {
        const { tile } = action.payload;
        const newRack = state.rack.filter(t => t !== tile);

        return {
          ...state,
          rack: newRack
        };
      }

      case ActionTypes.REMOVE_TILE: {
        // Return tile to rack
        // Need to get tile from board state
        return state;
      }

      case ActionTypes.SHUFFLE_RACK: {
        const newRack = [...state.rack];
        const newOrder = this.fisherYatesShuffle(state.rackOrder);

        return {
          ...state,
          rackOrder: newOrder
        };
      }

      case ActionTypes.ACCEPT_WORD: {
        const { score, words } = action.payload;

        return {
          ...state,
          score: state.score + score,
          turnsCompleted: state.turnsCompleted + 1,
          wordsPlayed: [...state.wordsPlayed, ...words]
        };
      }

      default:
        return state;
    }
  }

  // Current turn reducer
  currentTurnReducer(state = {}, action) {
    switch (action.type) {
      case ActionTypes.PLACE_TILE: {
        const { tile, row, col } = action.payload;

        return {
          ...state,
          placedTiles: [...state.placedTiles, { tile, row, col }],
          validationStatus: 'unchecked'
        };
      }

      case ActionTypes.VALIDATE_WORD: {
        const { words } = action.payload;

        // Calculate score preview
        const scorePreview = this.calculateScore(words);

        return {
          ...state,
          wordsFormed: words,
          scorePreview,
          validationStatus: words.length > 0 ? 'valid' : 'invalid'
        };
      }

      case ActionTypes.END_TURN: {
        // Reset current turn
        return {
          placedTiles: [],
          wordsFormed: [],
          scorePreview: 0,
          validationStatus: 'unchecked',
          validationMessage: ''
        };
      }

      default:
        return state;
    }
  }

  // UI reducer
  uiReducer(state = {}, action) {
    switch (action.type) {
      case ActionTypes.SELECT_TILE: {
        return {
          ...state,
          selectedTile: action.payload.index
        };
      }

      case ActionTypes.DESELECT_TILE: {
        return {
          ...state,
          selectedTile: null
        };
      }

      case ActionTypes.SET_VALID_PLACEMENTS: {
        return {
          ...state,
          validPlacements: new Set(action.payload.valid),
          invalidPlacements: new Set(action.payload.invalid)
        };
      }

      case ActionTypes.TOGGLE_THEME: {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';

        return {
          ...state,
          theme: newTheme
        };
      }

      default:
        return state;
    }
  }

  // Statistics reducer
  statisticsReducer(state = {}, action) {
    switch (action.type) {
      case ActionTypes.PLACE_TILE:
        return {
          ...state,
          totalMoves: state.totalMoves + 1
        };

      case ActionTypes.UNDO:
        return {
          ...state,
          undoCount: state.undoCount + 1
        };

      case ActionTypes.SHUFFLE_RACK:
        return {
          ...state,
          shuffleCount: state.shuffleCount + 1
        };

      default:
        return state;
    }
  }

  // History management
  updateHistory(prevState, nextState) {
    const history = prevState.history || {
      past: [],
      present: prevState,
      future: [],
      maxSize: 50
    };

    const newHistory = {
      past: [...history.past, history.present],
      present: nextState,
      future: [],
      maxSize: history.maxSize
    };

    // Limit history size
    if (newHistory.past.length > history.maxSize) {
      newHistory.past.shift();
    }

    return newHistory;
  }

  handleUndo(state) {
    const { history } = state;

    if (!history || history.past.length === 0) {
      return state;
    }

    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);

    return {
      ...previous,
      history: {
        past: newPast,
        present: previous,
        future: [history.present, ...history.future],
        maxSize: history.maxSize
      }
    };
  }

  handleRedo(state) {
    const { history } = state;

    if (!history || history.future.length === 0) {
      return state;
    }

    const next = history.future[0];
    const newFuture = history.future.slice(1);

    return {
      ...next,
      history: {
        past: [...history.past, history.present],
        present: next,
        future: newFuture,
        maxSize: history.maxSize
      }
    };
  }

  shouldSaveHistory(action) {
    // Don't save history for certain actions
    const excludedActions = [
      ActionTypes.SET_HOVERED_CELL,
      ActionTypes.UNDO,
      ActionTypes.REDO,
      ActionTypes.SAVE_CHECKPOINT
    ];

    return !excludedActions.includes(action.type);
  }

  // Utility functions
  fisherYatesShuffle(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  calculateScore(words) {
    // Score calculation logic
    return words.reduce((total, word) => total + word.score, 0);
  }
}
```

## Middleware System

### 1. Logging Middleware

```javascript
const loggingMiddleware = (store) => (next) => (action) => {
  const prevState = store.getState();

  console.group(`Action: ${action.type}`);
  console.log('Previous State:', prevState);
  console.log('Action:', action);

  const result = next(action);

  const nextState = store.getState();
  console.log('Next State:', nextState);
  console.log('State Diff:', this.getStateDiff(prevState, nextState));
  console.groupEnd();

  return result;
};
```

### 2. Validation Middleware

```javascript
const validationMiddleware = (store) => (next) => (action) => {
  const state = store.getState();

  // Validate action before processing
  switch (action.type) {
    case ActionTypes.PLACE_TILE: {
      const { row, col } = action.payload;

      // Check if cell is already occupied
      if (state.board.occupiedCells.has(`${row},${col}`)) {
        console.error('Cannot place tile on occupied cell');
        return null; // Block action
      }

      // Check if placement is valid
      if (!isValidPlacement(state, row, col)) {
        console.error('Invalid tile placement');
        return null;
      }

      break;
    }

    case ActionTypes.SUBMIT_WORD: {
      // Check if there are placed tiles
      if (state.currentTurn.placedTiles.length === 0) {
        console.error('No tiles placed');
        return null;
      }

      break;
    }
  }

  return next(action);
};
```

### 3. Persistence Middleware

```javascript
const persistenceMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  const state = store.getState();

  // Debounced save to localStorage
  if (this.saveTimer) {
    clearTimeout(this.saveTimer);
  }

  this.saveTimer = setTimeout(() => {
    try {
      const stateToSave = {
        game: state.game,
        board: state.board,
        player: state.player,
        currentTurn: state.currentTurn,
        statistics: state.statistics,
        timestamp: Date.now()
      };

      localStorage.setItem('letters_game_state',
        JSON.stringify(stateToSave)
      );
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }, 1000);

  return result;
};
```

### 4. Analytics Middleware

```javascript
const analyticsMiddleware = (store) => (next) => (action) => {
  const startTime = performance.now();
  const result = next(action);
  const duration = performance.now() - startTime;

  // Track action metrics
  if (window.analytics) {
    window.analytics.track('game_action', {
      type: action.type,
      payload: action.payload,
      duration,
      timestamp: Date.now(),
      gameId: store.getState().game.id
    });
  }

  // Warn if action took too long
  if (duration > 16) { // Longer than one frame
    console.warn(`Slow action ${action.type}: ${duration.toFixed(2)}ms`);
  }

  return result;
};
```

## State Selectors

### Memoized Selectors

```javascript
class Selectors {
  constructor() {
    this.memoCache = new Map();
  }

  // Memoization wrapper
  memoize(fn, keyFn) {
    return (...args) => {
      const key = keyFn ? keyFn(...args) : JSON.stringify(args);

      if (this.memoCache.has(key)) {
        return this.memoCache.get(key);
      }

      const result = fn(...args);
      this.memoCache.set(key, result);

      return result;
    };
  }

  // Get valid placements for selected tile
  getValidPlacements = this.memoize((state) => {
    const { selectedTile } = state.ui;
    const { board, currentTurn } = state;

    if (selectedTile === null) {
      return new Set();
    }

    const validCells = new Set();

    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        if (this.isValidPlacement(board, currentTurn, row, col)) {
          validCells.add(`${row},${col}`);
        }
      }
    }

    return validCells;
  });

  // Get current score including preview
  getTotalScore = this.memoize((state) => {
    return state.player.score + state.currentTurn.scorePreview;
  });

  // Get words that would be formed
  getWordsFormed = this.memoize((state) => {
    const { board, currentTurn } = state;

    if (currentTurn.placedTiles.length === 0) {
      return [];
    }

    return extractWordsFromBoard(board, currentTurn.placedTiles);
  });

  // Get game progress
  getGameProgress = this.memoize((state) => {
    const { player, game } = state;

    return {
      turnsCompleted: player.turnsCompleted,
      turnsTotal: 5,
      percentComplete: (player.turnsCompleted / 5) * 100,
      retriesUsed: player.retriesUsed,
      retriesRemaining: player.retriesRemaining,
      isComplete: game.status === 'completed'
    };
  });

  // Get rack tiles in display order
  getRackTiles = this.memoize((state) => {
    const { rack, rackOrder } = state.player;

    return rackOrder.map(index => rack[index]).filter(Boolean);
  });

  // Check if can undo
  canUndo = (state) => {
    return state.history && state.history.past.length > 0;
  };

  // Check if can redo
  canRedo = (state) => {
    return state.history && state.history.future.length > 0;
  };

  // Check if can submit word
  canSubmitWord = this.memoize((state) => {
    const { currentTurn } = state;

    return currentTurn.placedTiles.length > 0 &&
           currentTurn.validationStatus === 'valid';
  });

  // Helper function for valid placement check
  isValidPlacement(board, currentTurn, row, col) {
    // Check if cell is empty
    if (board.cells[row][col] !== null) {
      return false;
    }

    // Check if connects to existing tiles
    const hasConnection = this.hasAdjacentTile(board, row, col) ||
                         this.connectsToPlacedTiles(currentTurn, row, col);

    // Check if forms valid line with other placed tiles
    const formsValidLine = this.checkLineFormation(
      currentTurn.placedTiles,
      row,
      col
    );

    return hasConnection && formsValidLine;
  }

  hasAdjacentTile(board, row, col) {
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;

      if (newRow >= 0 && newRow < 15 &&
          newCol >= 0 && newCol < 15 &&
          board.cells[newRow][newCol] !== null) {
        return true;
      }
    }

    return false;
  }

  connectsToPlacedTiles(currentTurn, row, col) {
    for (const placed of currentTurn.placedTiles) {
      const rowDiff = Math.abs(placed.row - row);
      const colDiff = Math.abs(placed.col - col);

      if ((rowDiff === 1 && colDiff === 0) ||
          (rowDiff === 0 && colDiff === 1)) {
        return true;
      }
    }

    return false;
  }

  checkLineFormation(placedTiles, newRow, newCol) {
    if (placedTiles.length === 0) {
      return true;
    }

    const allTiles = [...placedTiles, { row: newRow, col: newCol }];

    // Check if all in same row
    const rows = new Set(allTiles.map(t => t.row));
    const cols = new Set(allTiles.map(t => t.col));

    return rows.size === 1 || cols.size === 1;
  }

  // Clear memoization cache
  clearCache() {
    this.memoCache.clear();
  }
}
```

## State Synchronization

### Cross-Tab Synchronization

```javascript
class StateSynchronizer {
  constructor(store) {
    this.store = store;
    this.channel = new BroadcastChannel('letters_game_state');
    this.isLeader = false;
    this.tabId = this.generateTabId();

    this.initializeSync();
  }

  initializeSync() {
    // Listen for state changes from other tabs
    this.channel.addEventListener('message', (event) => {
      if (event.data.type === 'STATE_UPDATE' &&
          event.data.tabId !== this.tabId) {
        this.handleRemoteStateUpdate(event.data.state);
      }

      if (event.data.type === 'LEADER_ELECTION') {
        this.participateInElection();
      }
    });

    // Subscribe to local state changes
    this.store.subscribe((state) => {
      if (this.isLeader) {
        this.broadcastStateUpdate(state);
      }
    });

    // Elect leader tab
    this.electLeader();

    // Handle tab close
    window.addEventListener('beforeunload', () => {
      if (this.isLeader) {
        this.channel.postMessage({
          type: 'LEADER_RESIGNATION',
          tabId: this.tabId
        });
      }
    });
  }

  broadcastStateUpdate(state) {
    const message = {
      type: 'STATE_UPDATE',
      state: this.serializeState(state),
      tabId: this.tabId,
      timestamp: Date.now()
    };

    this.channel.postMessage(message);
  }

  handleRemoteStateUpdate(remoteState) {
    const deserializedState = this.deserializeState(remoteState);

    // Merge or replace state based on strategy
    this.store.dispatch({
      type: 'SYNC_STATE',
      payload: deserializedState
    });
  }

  electLeader() {
    // Simple leader election based on tab age
    const election = {
      type: 'LEADER_ELECTION',
      tabId: this.tabId,
      timestamp: Date.now()
    };

    this.channel.postMessage(election);

    // Wait for responses
    setTimeout(() => {
      // If no other tabs responded, become leader
      this.isLeader = true;
    }, 100);
  }

  participateInElection() {
    // Respond to election if we're older
    // Implementation details...
  }

  serializeState(state) {
    // Convert Sets and Maps to arrays for serialization
    return JSON.stringify(state, (key, value) => {
      if (value instanceof Set) {
        return { _type: 'Set', data: Array.from(value) };
      }
      if (value instanceof Map) {
        return { _type: 'Map', data: Array.from(value) };
      }
      return value;
    });
  }

  deserializeState(serialized) {
    return JSON.parse(serialized, (key, value) => {
      if (value && value._type === 'Set') {
        return new Set(value.data);
      }
      if (value && value._type === 'Map') {
        return new Map(value.data);
      }
      return value;
    });
  }

  generateTabId() {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## Performance Optimizations

### 1. State Update Batching

```javascript
class BatchedUpdates {
  constructor(store) {
    this.store = store;
    this.pendingUpdates = [];
    this.isProcessing = false;
    this.batchTimeout = null;
  }

  dispatch(action) {
    this.pendingUpdates.push(action);

    if (!this.batchTimeout) {
      this.batchTimeout = requestAnimationFrame(() => {
        this.processBatch();
      });
    }
  }

  processBatch() {
    if (this.isProcessing || this.pendingUpdates.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Combine similar actions
    const combinedActions = this.combineActions(this.pendingUpdates);

    // Dispatch as single batch action
    this.store.dispatch({
      type: 'BATCH_UPDATE',
      payload: combinedActions
    });

    this.pendingUpdates = [];
    this.batchTimeout = null;
    this.isProcessing = false;
  }

  combineActions(actions) {
    const combined = [];
    const tileplacements = [];

    for (const action of actions) {
      if (action.type === ActionTypes.PLACE_TILE) {
        tileplacements.push(action.payload);
      } else {
        // Flush tile placements if any
        if (tileplacements.length > 0) {
          combined.push({
            type: 'BATCH_PLACE_TILES',
            payload: [...tileplacements]
          });
          tileplacements.length = 0;
        }

        combined.push(action);
      }
    }

    // Flush remaining tile placements
    if (tileplacements.length > 0) {
      combined.push({
        type: 'BATCH_PLACE_TILES',
        payload: tileplacements
      });
    }

    return combined;
  }
}
```

### 2. Lazy State Computation

```javascript
class LazyStateComputation {
  constructor() {
    this.computedValues = new WeakMap();
  }

  // Compute expensive values only when needed
  getComputedValue(state, computeFn, cacheKey) {
    if (!this.computedValues.has(state)) {
      this.computedValues.set(state, new Map());
    }

    const cache = this.computedValues.get(state);

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const value = computeFn(state);
    cache.set(cacheKey, value);

    return value;
  }

  // Example: Compute valid words lazily
  getValidWords(state) {
    return this.getComputedValue(
      state,
      (s) => this.computeValidWords(s),
      'validWords'
    );
  }

  computeValidWords(state) {
    // Expensive computation
    const words = [];
    // ... extract and validate words
    return words;
  }
}
```

## Testing State Management

```javascript
// Test helpers
class StateTestUtils {
  static createMockState(overrides = {}) {
    return {
      game: {
        id: 'test-game',
        seed: '20250120',
        status: 'active',
        ...overrides.game
      },
      board: {
        cells: Array(15).fill(null).map(() => Array(15).fill(null)),
        occupiedCells: new Set(),
        ...overrides.board
      },
      player: {
        rack: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        score: 0,
        ...overrides.player
      },
      currentTurn: {
        placedTiles: [],
        ...overrides.currentTurn
      },
      ui: {
        selectedTile: null,
        ...overrides.ui
      }
    };
  }

  static dispatchAndWait(store, action) {
    return new Promise(resolve => {
      const unsubscribe = store.subscribe(() => {
        unsubscribe();
        resolve(store.getState());
      });

      store.dispatch(action);
    });
  }
}

// Example tests
describe('State Management', () => {
  let store;
  let reducer;

  beforeEach(() => {
    reducer = new GameReducer();
    store = new StateContainer(
      StateTestUtils.createMockState(),
      reducer.reduce.bind(reducer)
    );
  });

  test('should place tile and update state', async () => {
    const action = ActionCreators.placeTile({ letter: 'A', value: 1 }, 7, 7);

    const newState = await StateTestUtils.dispatchAndWait(store, action);

    expect(newState.board.cells[7][7]).toEqual({ letter: 'A', value: 1 });
    expect(newState.board.occupiedCells.has('7,7')).toBe(true);
    expect(newState.player.rack).toHaveLength(6);
  });

  test('should handle undo/redo correctly', async () => {
    // Place tile
    await StateTestUtils.dispatchAndWait(
      store,
      ActionCreators.placeTile({ letter: 'A', value: 1 }, 7, 7)
    );

    // Undo
    const undoState = await StateTestUtils.dispatchAndWait(
      store,
      { type: ActionTypes.UNDO }
    );

    expect(undoState.board.cells[7][7]).toBe(null);

    // Redo
    const redoState = await StateTestUtils.dispatchAndWait(
      store,
      { type: ActionTypes.REDO }
    );

    expect(redoState.board.cells[7][7]).toEqual({ letter: 'A', value: 1 });
  });
});
```

## Summary

This state management architecture provides:

1. **Predictable State Updates**: All state changes go through reducers
2. **Time-Travel Debugging**: Full undo/redo support with history
3. **Performance Optimization**: Memoized selectors and batched updates
4. **Cross-Tab Sync**: Multiple tabs stay in sync
5. **Middleware Pipeline**: Validation, logging, persistence, analytics
6. **Type Safety**: Clear action types and payload structures
7. **Testability**: Pure functions and isolated state logic

The architecture scales well from simple features to complex game mechanics while maintaining code maintainability and performance.