// Tile Rack Test Environment - Drag/Drop & Tap/Swap
// Supports both desktop (mouse) and mobile (touch) interactions

// Configuration
const DRAG_THRESHOLD = 10; // pixels before drag starts
const TAP_MAX_DURATION = 300; // ms to distinguish tap from drag
const TILES = ['S', 'C', 'R', 'A', 'B', 'B', 'L', 'E'];
const TILE_POINTS = {
    A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4,
    I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3,
    Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8,
    Y: 4, Z: 10
};

// State
let selectedTile = null;
let draggedTile = null;
let touchDraggedTile = null;
let interactionMode = 'both'; // 'drag', 'tap', 'both'
let tapStartTime = null;
let tapStartPos = { x: 0, y: 0 };
let isDragging = false;
let touchClone = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeTiles();
    setupEventListeners();
    updateDebugInfo();
});

function initializeTiles() {
    const rack = document.getElementById('tile-rack');
    rack.innerHTML = '';

    TILES.forEach((letter, index) => {
        const tile = createTile(letter);
        rack.appendChild(tile);
    });
}

function createTile(letter) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.draggable = true;
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

// Event Listeners Setup
function setupEventListeners() {
    const rack = document.getElementById('tile-rack');

    // Desktop events
    rack.addEventListener('mousedown', handleMouseDown);
    rack.addEventListener('dragstart', handleDragStart);
    rack.addEventListener('dragover', handleDragOver);
    rack.addEventListener('drop', handleDrop);
    rack.addEventListener('dragend', handleDragEnd);

    // Touch events
    rack.addEventListener('touchstart', handleTouchStart, { passive: false });
    rack.addEventListener('touchmove', handleTouchMove, { passive: false });
    rack.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Button controls
    document.getElementById('shuffle-btn').addEventListener('click', shuffleTiles);
    document.getElementById('reset-btn').addEventListener('click', resetTiles);
    document.getElementById('mode-toggle').addEventListener('click', toggleMode);
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

    updateStatus(`Mode changed to: ${modeText[interactionMode]}`);
    updateDebugInfo();
    clearSelection();
}

// Mouse/Desktop Interactions
function handleMouseDown(e) {
    const tile = e.target.closest('.tile');
    if (!tile) return;

    tapStartTime = Date.now();
    tapStartPos = { x: e.clientX, y: e.clientY };

    updateDebugInfo('Mouse down');
}

function handleDragStart(e) {
    const tile = e.target.closest('.tile');
    if (!tile || interactionMode === 'tap') {
        e.preventDefault();
        return;
    }

    isDragging = true;
    draggedTile = tile;

    // Create placeholder
    const rack = document.getElementById('tile-rack');
    const placeholder = document.createElement('div');
    placeholder.className = 'tile-placeholder';
    rack.insertBefore(placeholder, tile);

    setTimeout(() => {
        placeholder.classList.add('active');
        tile.classList.add('dragging-source');
        rack.classList.add('dragging-active');

        // Don't create insertion gap initially - wait for mouse movement
    }, 10);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tile.dataset.letter);

    updateStatus('Dragging tile...');
    updateDebugInfo('Drag started');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rack = document.getElementById('tile-rack');
    updateRackDropIndicator(e, rack);
}

function handleDrop(e) {
    e.preventDefault();

    if (!draggedTile) return;

    const rack = document.getElementById('tile-rack');
    const insertionGap = rack.querySelector('.insertion-gap');

    if (insertionGap) {
        rack.insertBefore(draggedTile, insertionGap);
    }

    cleanupDrag();
    updateStatus('Tile dropped');
    updateDebugInfo('Drop completed');
}

function handleDragEnd(e) {
    // Check if this was actually a click (tap)
    const duration = Date.now() - tapStartTime;
    const tile = e.target.closest('.tile');

    if (duration < TAP_MAX_DURATION && !isDragging && interactionMode !== 'drag') {
        handleTileClick(tile);
    }

    cleanupDrag();
    isDragging = false;
}

// Touch/Mobile Interactions
function handleTouchStart(e) {
    const touch = e.touches[0];
    const tile = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.tile');

    if (!tile) return;

    tapStartTime = Date.now();
    tapStartPos = { x: touch.clientX, y: touch.clientY };
    touchDraggedTile = tile;

    updateDebugInfo('Touch start');
}

function handleTouchMove(e) {
    if (!touchDraggedTile || interactionMode === 'tap') return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - tapStartPos.x;
    const deltaY = touch.clientY - tapStartPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > DRAG_THRESHOLD) {
        e.preventDefault();

        if (!isDragging) {
            isDragging = true;
            startTouchDrag(touchDraggedTile, touch);
        }

        if (touchClone) {
            touchClone.style.transform =
                `translate(${touch.clientX - tapStartPos.x}px, ${touch.clientY - tapStartPos.y}px)`;

            const rack = document.getElementById('tile-rack');
            updateRackDropIndicator({ clientX: touch.clientX }, rack);
        }

        updateDebugInfo('Touch dragging');
    }
}

function handleTouchEnd(e) {
    const duration = Date.now() - tapStartTime;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - tapStartPos.x;
    const deltaY = touch.clientY - tapStartPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (duration < TAP_MAX_DURATION && distance < DRAG_THRESHOLD && interactionMode !== 'drag') {
        // This was a tap
        handleTileClick(touchDraggedTile);
    } else if (isDragging) {
        // Complete the drag
        completeTouchDrag();
    }

    cleanupTouch();
    isDragging = false;
    updateDebugInfo('Touch end');
}

function startTouchDrag(tile, touch) {
    const rack = document.getElementById('tile-rack');

    // Create placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'tile-placeholder';
    rack.insertBefore(placeholder, tile);

    // Create clone for dragging
    touchClone = tile.cloneNode(true);
    touchClone.style.position = 'fixed';
    touchClone.style.zIndex = '1000';
    touchClone.style.left = `${tapStartPos.x - 25}px`;
    touchClone.style.top = `${tapStartPos.y - 25}px`;
    touchClone.style.opacity = '0.8';
    touchClone.style.pointerEvents = 'none';
    document.body.appendChild(touchClone);

    tile.classList.add('dragging-source');
    rack.classList.add('dragging-active');

    setTimeout(() => {
        placeholder.classList.add('active');

        // Create initial insertion gap
        const event = { clientX: touch.clientX };
        updateRackDropIndicator(event, rack);
    }, 10);

    updateStatus('Dragging tile...');
}

function completeTouchDrag() {
    const rack = document.getElementById('tile-rack');
    const insertionGap = rack.querySelector('.insertion-gap');

    if (insertionGap && touchDraggedTile) {
        rack.insertBefore(touchDraggedTile, insertionGap);
    }

    updateStatus('Tile dropped');
}

// Tap to Select/Swap
function handleTileClick(tile) {
    if (!tile || interactionMode === 'drag') return;

    if (!selectedTile) {
        // First selection
        selectedTile = tile;
        tile.classList.add('selected');
        updateStatus(`Selected: ${tile.dataset.letter}`);
    } else if (selectedTile === tile) {
        // Deselect
        tile.classList.remove('selected');
        selectedTile = null;
        updateStatus('Deselected');
    } else {
        // Swap tiles
        swapTiles(selectedTile, tile);
        selectedTile.classList.remove('selected');
        selectedTile = null;
        updateStatus('Tiles swapped!');
    }

    updateDebugInfo('Tile clicked');
}

function swapTiles(tile1, tile2) {
    tile1.classList.add('swapping');
    tile2.classList.add('swapping');

    const temp = document.createElement('div');
    tile1.parentNode.insertBefore(temp, tile1);
    tile2.parentNode.insertBefore(tile1, tile2);
    temp.parentNode.insertBefore(tile2, temp);
    temp.remove();

    setTimeout(() => {
        tile1.classList.remove('swapping');
        tile2.classList.remove('swapping');
    }, 400);
}

// Rack Drop Indicator
function updateRackDropIndicator(e, rack) {
    if (!rack) return;

    const currentDraggedTile = draggedTile || touchDraggedTile;
    if (!currentDraggedTile) return;

    // Remove existing insertion gap
    const existingGap = rack.querySelector('.insertion-gap');
    if (existingGap) {
        existingGap.remove();
    }

    const tiles = Array.from(rack.children).filter(el =>
        el.classList.contains('tile') && el !== currentDraggedTile
    );

    const mouseX = e.clientX;
    let insertBefore = null;

    // Find insertion point
    for (let tile of tiles) {
        const rect = tile.getBoundingClientRect();
        if (mouseX < rect.left + rect.width / 2) {
            insertBefore = tile;
            break;
        }
    }

    // Create and insert gap
    const gap = document.createElement('div');
    gap.className = 'insertion-gap';

    if (insertBefore) {
        rack.insertBefore(gap, insertBefore);
    } else {
        rack.appendChild(gap);
    }

    setTimeout(() => {
        gap.classList.add('active');
    }, 10);

    // Update tile shifts
    updateTileShifts(rack, gap, currentDraggedTile);
}

function updateTileShifts(rack, gap, draggedTile) {
    const tiles = Array.from(rack.children).filter(el =>
        el.classList.contains('tile') && el !== draggedTile
    );

    tiles.forEach(tile => {
        tile.classList.remove('shift-left', 'shift-right');
    });

    // This is simplified - in production you'd calculate actual shifts
    // based on placeholder and gap positions
}

// Cleanup functions
function cleanupDrag() {
    const rack = document.getElementById('tile-rack');

    if (draggedTile) {
        draggedTile.classList.remove('dragging-source');
        draggedTile = null;
    }

    rack.classList.remove('dragging-active');

    // Remove gaps with animation
    const gaps = rack.querySelectorAll('.tile-placeholder.active, .insertion-gap.active');
    gaps.forEach(gap => {
        gap.classList.remove('active');
        setTimeout(() => gap.remove(), 250);
    });

    // Remove any inactive gaps immediately
    rack.querySelectorAll('.tile-placeholder:not(.active), .insertion-gap:not(.active)')
        .forEach(gap => gap.remove());

    // Clear tile shifts
    rack.querySelectorAll('.tile').forEach(tile => {
        tile.classList.remove('shift-left', 'shift-right');
    });
}

function cleanupTouch() {
    if (touchClone) {
        touchClone.remove();
        touchClone = null;
    }

    if (touchDraggedTile) {
        touchDraggedTile.classList.remove('dragging-source');
        touchDraggedTile = null;
    }

    cleanupDrag();
}

function clearSelection() {
    if (selectedTile) {
        selectedTile.classList.remove('selected');
        selectedTile = null;
    }
}

// Utility functions
function shuffleTiles() {
    const rack = document.getElementById('tile-rack');
    const tiles = Array.from(rack.querySelectorAll('.tile'));

    // Fisher-Yates shuffle
    for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        rack.insertBefore(tiles[j], tiles[i].nextSibling);
        rack.insertBefore(tiles[i], tiles[j].nextSibling);
    }

    updateStatus('Tiles shuffled');
    updateDebugInfo('Shuffled');
}

function resetTiles() {
    initializeTiles();
    clearSelection();
    updateStatus('Tiles reset');
    updateDebugInfo('Reset');
}

function updateStatus(message) {
    document.getElementById('status-text').textContent = message;
}

function updateDebugInfo(action = null) {
    const rack = document.getElementById('tile-rack');
    const tiles = Array.from(rack.querySelectorAll('.tile'));
    const letters = tiles.map(t => t.dataset.letter).join('');

    document.getElementById('debug-mode').textContent = interactionMode;
    document.getElementById('debug-selected').textContent =
        selectedTile ? selectedTile.dataset.letter : 'None';
    document.getElementById('debug-action').textContent = action || 'None';
    document.getElementById('debug-input').textContent =
        'ontouchstart' in window ? 'Touch' : 'Mouse';
    document.getElementById('debug-tiles').textContent = letters;
}