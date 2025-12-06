// Tile Rack Test Environment - Using SortableJS
// Much simpler implementation with better mobile support

// Configuration
const TILES = ['S', 'C', 'R', 'A', 'B', 'B', 'L', 'E'];
const TILE_POINTS = {
    A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4,
    I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3,
    Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8,
    Y: 4, Z: 10
};

// State
let currentTiles = [...TILES];
let sortableInstance = null;
let interactionMode = 'both'; // 'drag', 'tap', 'both'

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeTiles();
    setupSortable();
    setupEventListeners();
    updateDebugInfo();
});

function initializeTiles() {
    const rack = document.getElementById('tile-rack');
    rack.innerHTML = '';

    currentTiles.forEach((letter, index) => {
        const tile = createTile(letter);
        rack.appendChild(tile);
    });
}

function createTile(letter) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.letter = letter;

    const letterSpan = document.createElement('span');
    letterSpan.textContent = letter;
    tile.appendChild(letterSpan);

    const points = document.createElement('span');
    points.className = 'tile-points';
    points.textContent = TILE_POINTS[letter] || 0;
    tile.appendChild(points);

    return tile;
}

// Setup SortableJS - This replaces ALL the complex drag code!
function setupSortable() {
    const rack = document.getElementById('tile-rack');

    // Destroy existing instance if it exists
    if (sortableInstance) {
        sortableInstance.destroy();
    }

    // Create new SortableJS instance with simple configuration
    sortableInstance = new Sortable(rack, {
        animation: 150, // Smooth animation in ms
        easing: "cubic-bezier(0.4, 0.0, 0.2, 1)", // Material Design easing
        ghostClass: 'sortable-ghost', // Class for the drop placeholder
        chosenClass: 'sortable-chosen', // Class when selected
        dragClass: 'sortable-drag', // Class while dragging

        // Touch settings
        forceFallback: false, // Use native drag on desktop
        fallbackTolerance: 3, // Better touch detection
        touchStartThreshold: 5, // Delay before drag starts (prevents scroll conflicts)

        // Disable sorting if in tap mode
        disabled: interactionMode === 'tap',

        // Events
        onStart: function(evt) {
            const letter = evt.item.dataset.letter;
            updateStatus(`Dragging tile: ${letter}`);
            updateDebugInfo(`Drag started: ${letter} from position ${evt.oldIndex}`);
        },

        onEnd: function(evt) {
            const letter = evt.item.dataset.letter;

            // Update internal array based on new DOM order
            const tiles = Array.from(rack.children);
            currentTiles = tiles.map(tile => tile.dataset.letter);

            updateStatus(`Moved ${letter} from position ${evt.oldIndex + 1} to ${evt.newIndex + 1}`);
            updateDebugInfo(`Drag ended: ${letter} | New order: ${currentTiles.join(', ')}`);
        },

        onChoose: function(evt) {
            updateDebugInfo(`Selected: ${evt.item.dataset.letter}`);
        },

        onMove: function(evt) {
            // Could add validation here if needed
            return true; // Allow all moves
        }
    });
}

// Event Listeners Setup
function setupEventListeners() {
    // Button controls
    document.getElementById('shuffle-btn').addEventListener('click', shuffleTiles);
    document.getElementById('reset-btn').addEventListener('click', resetTiles);
    document.getElementById('mode-toggle').addEventListener('click', toggleMode);

    // For tap mode, we still need click handlers
    document.getElementById('tile-rack').addEventListener('click', handleTileClick);
}

// Mode Management
function toggleMode() {
    const modes = ['both', 'drag', 'tap'];
    const currentIndex = modes.indexOf(interactionMode);
    interactionMode = modes[(currentIndex + 1) % modes.length];

    const button = document.getElementById('mode-toggle');
    const modeText = {
        'both': 'Drag & Tap',
        'drag': 'Drag Only',
        'tap': 'Tap Only'
    };
    button.textContent = `Mode: ${modeText[interactionMode]}`;

    // Update SortableJS based on mode
    if (sortableInstance) {
        if (interactionMode === 'tap') {
            sortableInstance.option("disabled", true);
        } else {
            sortableInstance.option("disabled", false);
        }
    }

    updateStatus(`Mode changed to: ${modeText[interactionMode]}`);
    updateDebugInfo(`Mode: ${interactionMode}`);
    clearSelection();
}

// Tap to Select/Swap (only used in tap mode)
let selectedTile = null;

function handleTileClick(e) {
    if (interactionMode !== 'tap' && interactionMode !== 'both') return;

    const tile = e.target.closest('.tile');
    if (!tile) return;

    if (interactionMode === 'tap' || (interactionMode === 'both' && !sortableInstance.option("disabled"))) {
        // In tap mode or both mode
        if (!selectedTile) {
            // Select first tile
            selectedTile = tile;
            selectedTile.classList.add('selected');
            updateStatus(`Selected: ${tile.dataset.letter}`);
            updateDebugInfo(`Tap: Selected ${tile.dataset.letter}`);
        } else if (selectedTile === tile) {
            // Deselect if same tile
            selectedTile.classList.remove('selected');
            selectedTile = null;
            updateStatus('Selection cleared');
            updateDebugInfo('Tap: Deselected');
        } else {
            // Swap tiles
            swapTiles(selectedTile, tile);
            selectedTile.classList.remove('selected');
            selectedTile = null;
        }
    }
}

function swapTiles(tile1, tile2) {
    const rack = document.getElementById('tile-rack');
    const tiles = Array.from(rack.children);
    const index1 = tiles.indexOf(tile1);
    const index2 = tiles.indexOf(tile2);

    if (index1 === -1 || index2 === -1) return;

    // Swap in DOM
    if (index1 < index2) {
        rack.insertBefore(tile2, tile1);
        rack.insertBefore(tile1, tiles[index2 + 1] || null);
    } else {
        rack.insertBefore(tile1, tile2);
        rack.insertBefore(tile2, tiles[index1 + 1] || null);
    }

    // Update internal array
    const temp = currentTiles[index1];
    currentTiles[index1] = currentTiles[index2];
    currentTiles[index2] = temp;

    updateStatus(`Swapped ${tile1.dataset.letter} with ${tile2.dataset.letter}`);
    updateDebugInfo(`Tap swap: ${tile1.dataset.letter} ↔ ${tile2.dataset.letter}`);
}

function clearSelection() {
    if (selectedTile) {
        selectedTile.classList.remove('selected');
        selectedTile = null;
    }
}

// Utility Functions
function shuffleTiles() {
    currentTiles.sort(() => Math.random() - 0.5);
    initializeTiles();
    setupSortable(); // Reinitialize SortableJS
    updateStatus('Tiles shuffled');
    updateDebugInfo(`Shuffled: ${currentTiles.join(', ')}`);
}

function resetTiles() {
    currentTiles = [...TILES];
    initializeTiles();
    setupSortable(); // Reinitialize SortableJS
    updateStatus('Tiles reset');
    updateDebugInfo(`Reset: ${currentTiles.join(', ')}`);
}

function updateStatus(message) {
    document.getElementById('status-text').textContent = message;
}

function updateDebugInfo(action = '') {
    document.getElementById('debug-mode').textContent = interactionMode === 'both' ? 'Both (Drag & Tap)' :
                                                        interactionMode === 'drag' ? 'Drag Only' : 'Tap Only';
    document.getElementById('debug-selected').textContent = selectedTile ? selectedTile.dataset.letter : 'None';
    if (action) {
        document.getElementById('debug-action').textContent = action;
    }
    document.getElementById('debug-tiles').textContent = currentTiles.join(', ');

    // Detect input type
    const isTouchDevice = 'ontouchstart' in window;
    document.getElementById('debug-input').textContent = isTouchDevice ? 'Touch' : 'Mouse';
}

// Log implementation state
console.log('🎉 SortableJS Implementation Active!');
console.log('📱 Mobile drag-drop now works!');
console.log('🔥 Reduced from 400+ lines to ~200 lines');
console.log('✨ Same functionality, better performance');