// Daily Letters - Game Logic

// Configuration for subdirectory deployment
const BASE_PATH = window.location.pathname.includes('/letters') ? '/letters' : '';
const API_BASE = `${BASE_PATH}/cgi-bin`;

// Game state
let gameState = {
    board: [],
    tiles: [],
    currentTurn: 1,
    maxTurns: 5,
    score: 0,
    turnScores: [],
    seed: null,
    dateStr: null,
    startingWord: null,
    placedTiles: [],
    turnHistory: [],
    isGameOver: false,
    hasSubmittedScore: false,
    debugMode: false,
    isSubmitting: false,  // Prevent double submission
    rackTiles: [],  // Track tiles currently on the rack
    totalTilesDrawn: 7,  // Track total tiles drawn from the bag (starts at 7 after turn 1)
    gameStartTime: null,  // Track when game started for analytics
    preGeneratedShareURL: null,  // Pre-generated shareable URL (created at game end)
    isNewHighScore: false  // Track if player got a new high score
};

// Run state for roguelike mode
let runState = {
    isRunMode: false,
    round: 1,
    maxRounds: 3,
    targetScore: 80,
    roundTargets: [80, 120, 180],
    runScore: 0,
    roundScores: [],
    runStartTime: null,
    runSeed: null
};

// ============================================================================
// RUN MANAGER
// ============================================================================

const runManager = {
    // Start a new run
    startRun() {
        runState.isRunMode = true;
        runState.round = 1;
        runState.targetScore = runState.roundTargets[0];
        runState.runScore = 0;
        runState.roundScores = [];
        runState.runStartTime = Date.now();
        runState.runSeed = Date.now(); // Use timestamp as run seed

        this.saveRunState();
        this.updateRunUI();
        this.hideAllRunPopups();

        // Reset game state for fresh round
        this.resetForNewRound();
    },

    // Check if round target was met (called from endGame)
    checkRoundComplete(score) {
        if (!runState.isRunMode) return false;

        runState.roundScores.push(score);
        runState.runScore += score;

        if (score >= runState.targetScore) {
            // Success!
            if (runState.round >= runState.maxRounds) {
                this.showVictory();
            } else {
                this.showRoundComplete(score);
            }
            return true;
        } else {
            // Failed
            this.showRunFailed(score);
            return false;
        }
    },

    // Advance to next round
    nextRound() {
        runState.round++;
        runState.targetScore = runState.roundTargets[runState.round - 1];

        this.saveRunState();
        this.updateRunUI();
        this.hideAllRunPopups();

        // Reset game for new round
        this.resetForNewRound();
    },

    // Reset game state for a new round (keeping run state)
    resetForNewRound() {
        // Reset game state
        gameState.board = [];
        gameState.tiles = [];
        gameState.currentTurn = 1;
        gameState.score = 0;
        gameState.turnScores = [];
        gameState.placedTiles = [];
        gameState.turnHistory = [];
        gameState.isGameOver = false;
        gameState.hasSubmittedScore = false;
        gameState.isSubmitting = false;
        gameState.rackTiles = [];
        gameState.totalTilesDrawn = 7;
        gameState.gameStartTime = Date.now();
        gameState.preGeneratedShareURL = null;
        gameState.isNewHighScore = false;

        // Generate new seed for this round
        gameState.seed = getTodaysSeed() + runState.round;
        gameState.dateStr = formatSeedToDate(gameState.seed);

        // Reinitialize the game board
        createBoard();
        fetchGameData(gameState.seed);

        // Reset UI
        document.getElementById('dateDisplay').textContent = `Round ${runState.round}`;
        updateTurnCounter();

        // Re-enable controls
        const submitBtn = document.getElementById('submit-word');
        const recallBtn = document.getElementById('recall-tiles');
        if (submitBtn) submitBtn.disabled = false;
        if (recallBtn) recallBtn.disabled = false;

        // Remove game-over classes
        const gameBoard = document.getElementById('game-board');
        const rackBoard = document.getElementById('tile-rack-board');
        if (gameBoard) gameBoard.classList.remove('game-over');
        if (rackBoard) rackBoard.classList.remove('game-over');

        // Hide share icon
        const shareIcon = document.getElementById('shareIcon');
        if (shareIcon) shareIcon.classList.add('hidden');
    },

    // Update run info display
    updateRunUI() {
        const runInfo = document.getElementById('run-info');
        const roundDisplay = document.getElementById('run-round');
        const targetDisplay = document.getElementById('run-target');

        if (runState.isRunMode) {
            runInfo.classList.remove('hidden');
            roundDisplay.textContent = `Round ${runState.round}/${runState.maxRounds}`;
            targetDisplay.textContent = `Target: ${runState.targetScore}`;
        } else {
            runInfo.classList.add('hidden');
        }
    },

    // Show round complete popup
    showRoundComplete(score) {
        const popup = document.getElementById('round-complete-popup');
        const scoreEl = document.getElementById('round-score-value');
        const targetEl = document.getElementById('round-target-value');
        const surplusEl = document.getElementById('round-surplus-value');

        const surplus = score - runState.targetScore;

        scoreEl.textContent = score;
        targetEl.textContent = runState.targetScore;
        surplusEl.textContent = `+${surplus}`;

        popup.classList.remove('hidden');
    },

    // Show run failed popup
    showRunFailed(score) {
        const popup = document.getElementById('run-failed-popup');
        const scoreEl = document.getElementById('failed-score-value');
        const targetEl = document.getElementById('failed-target-value');
        const deficitEl = document.getElementById('failed-deficit-value');
        const failAmount = document.getElementById('fail-amount');

        const deficit = runState.targetScore - score;

        scoreEl.textContent = score;
        targetEl.textContent = runState.targetScore;
        deficitEl.textContent = `-${deficit}`;
        failAmount.textContent = deficit;

        popup.classList.remove('hidden');

        // Clear run state
        runState.isRunMode = false;
        this.clearRunState();
    },

    // Show victory popup
    showVictory() {
        const popup = document.getElementById('run-victory-popup');
        const totalEl = document.getElementById('victory-total-value');
        const summaryEl = document.getElementById('victory-rounds-summary');

        totalEl.textContent = runState.runScore;

        // Build rounds summary
        let summary = '';
        runState.roundScores.forEach((score, i) => {
            const target = runState.roundTargets[i];
            const surplus = score - target;
            summary += `Round ${i + 1}: ${score}/${target} (+${surplus})<br>`;
        });
        summaryEl.innerHTML = summary;

        popup.classList.remove('hidden');

        // Clear run state
        runState.isRunMode = false;
        this.clearRunState();
    },

    // Show start run popup
    showStartRun() {
        document.getElementById('start-run-popup').classList.remove('hidden');
    },

    // Hide all run popups
    hideAllRunPopups() {
        document.getElementById('round-complete-popup')?.classList.add('hidden');
        document.getElementById('run-failed-popup')?.classList.add('hidden');
        document.getElementById('run-victory-popup')?.classList.add('hidden');
        document.getElementById('start-run-popup')?.classList.add('hidden');
    },

    // Save run state to localStorage
    saveRunState() {
        localStorage.setItem('rogueletters_run', JSON.stringify(runState));
    },

    // Load run state from localStorage
    loadRunState() {
        const saved = localStorage.getItem('rogueletters_run');
        if (saved) {
            const loaded = JSON.parse(saved);
            Object.assign(runState, loaded);
        }
    },

    // Clear run state from localStorage
    clearRunState() {
        localStorage.removeItem('rogueletters_run');
    }
};

// Board configuration
const BOARD_SIZE = 9;
const CENTER_POSITION = 4;

// Tile scores (classic word game values)
const TILE_SCORES = {
    'A': 1, 'E': 1, 'I': 1, 'O': 1, 'U': 1, 'L': 1, 'N': 1, 'S': 1, 'T': 1, 'R': 1,
    'D': 2, 'G': 2,
    'B': 3, 'C': 3, 'M': 3, 'P': 3,
    'F': 4, 'H': 4, 'V': 4, 'W': 4, 'Y': 4,
    'K': 5,
    'J': 8, 'X': 8,
    'Q': 10, 'Z': 10
};

// Board multipliers (adjusted for 9x9 board)
const MULTIPLIERS = {
    tripleWord: [[0,0], [0,8], [8,0], [8,8]], // Four corners are triple word
    doubleWord: [[1,1], [1,7], [7,1], [7,7]], // Inner diagonal positions
    tripleLetter: [[0,4], [2,2], [2,6], [4,0], [4,8], [6,2], [6,6], [8,4]], // Inner diamond plus N/S/E/W
    doubleLetter: [[3,3], [3,5], [5,3], [5,5]] // Remaining cross pattern
};

// ============================================================================
// ANALYTICS HELPER
// ============================================================================

const Analytics = {
    // Share events
    shareBoard: {
        started: (tileCount, turnCount) => {
            if (typeof gtag === 'function') {
                gtag('event', 'share_board_started', {
                    tile_count: tileCount,
                    turn_count: turnCount
                });
            }
        },
        success: (method, urlLength, tileCount, duration, fallbackReason = 'none') => {
            if (typeof gtag === 'function') {
                gtag('event', 'share_board_success', {
                    method: method,
                    url_length: urlLength,
                    tile_count: tileCount,
                    encoding_duration_ms: duration,
                    fallback_reason: fallbackReason
                });
            }
        },
        fallback: (method, urlLength, tileCount, duration, fallbackReason = 'none') => {
            if (typeof gtag === 'function') {
                gtag('event', 'share_board_fallback', {
                    method: method,
                    url_length: urlLength,
                    tile_count: tileCount,
                    encoding_duration_ms: duration,
                    fallback_reason: fallbackReason
                });
            }
        },
        minimal: (urlLength, tileCount, fallbackReason) => {
            if (typeof gtag === 'function') {
                gtag('event', 'share_board_minimal', {
                    method: 'seed_only',
                    url_length: urlLength,
                    tile_count: tileCount,
                    fallback_reason: fallbackReason
                });
            }
        },
        failed: (errorType, errorMessage) => {
            if (typeof gtag === 'function') {
                gtag('event', 'share_board_failed', {
                    error_type: errorType,
                    error_message: errorMessage
                });
            }
        }
    },

    // Share score events
    shareScore: {
        clicked: (score) => {
            if (typeof gtag === 'function') {
                gtag('event', 'share_score_clicked', {
                    score: score,
                    share_type: 'text_with_emojis'
                });
            }
        }
    },

    // Game lifecycle events
    game: {
        started: (seed, source, startingWord) => {
            if (typeof gtag === 'function') {
                gtag('event', 'game_started', {
                    seed: seed,
                    source: source,
                    starting_word: startingWord,
                    starting_word_length: startingWord.length
                });
            }
        },
        completed: (score, turnScores, totalWords, totalTiles, duration, startingWord) => {
            if (typeof gtag === 'function') {
                gtag('event', 'game_completed', {
                    final_score: score,
                    turn_scores: turnScores.join(','),
                    total_words: totalWords,
                    total_tiles_placed: totalTiles,
                    duration_seconds: Math.floor(duration / 1000),
                    starting_word: startingWord
                });
            }
        },
        abandoned: (turnsCompleted, score, reason) => {
            if (typeof gtag === 'function') {
                gtag('event', 'game_abandoned', {
                    turns_completed: turnsCompleted,
                    score_so_far: score,
                    reason: reason
                });
            }
        }
    },

    // Gameplay events
    word: {
        submitted: (turn, wordLength, tileCount, score, hasMultiplier, crossesStart) => {
            if (typeof gtag === 'function') {
                gtag('event', 'word_submitted', {
                    turn: turn,
                    word_length: wordLength,
                    tile_count: tileCount,
                    score: score,
                    uses_multiplier: hasMultiplier ? 'true' : 'false',
                    crosses_starting_word: crossesStart ? 'true' : 'false'
                });
            }
        },
        validationFailed: (turn, reason, attemptedLength) => {
            if (typeof gtag === 'function') {
                gtag('event', 'word_validation_failed', {
                    turn: turn,
                    reason: reason,
                    attempted_length: attemptedLength
                });
            }
        }
    },

    // Navigation events
    navigation: {
        startOver: (currentTurn, currentScore) => {
            if (typeof gtag === 'function') {
                gtag('event', 'start_over_clicked', {
                    current_turn: currentTurn,
                    current_score: currentScore
                });
            }
        },
        playTomorrow: (fromSeed, toSeed) => {
            if (typeof gtag === 'function') {
                gtag('event', 'play_tomorrow_clicked', {
                    from_seed: fromSeed,
                    to_seed: toSeed
                });
            }
        },
        sharedGameLoaded: (format, tileCount, sharedScore, duration) => {
            if (typeof gtag === 'function') {
                gtag('event', 'shared_game_loaded', {
                    format: format,
                    tile_count: tileCount,
                    shared_score: sharedScore,
                    decoding_duration_ms: duration
                });
            }
        }
    },

    // High score events
    highScore: {
        fetchStarted: (date) => {
            if (typeof gtag === 'function') {
                gtag('event', 'high_score_fetch_started', {
                    date: date
                });
            }
        },
        fetchSuccess: (date, highScore, yourScore) => {
            if (typeof gtag === 'function') {
                gtag('event', 'high_score_fetch_success', {
                    date: date,
                    high_score: highScore,
                    your_score: yourScore,
                    beat_high_score: yourScore > highScore
                });
            }
        },
        fetchFailed: (date, errorType) => {
            if (typeof gtag === 'function') {
                gtag('event', 'high_score_fetch_failed', {
                    date: date,
                    error_type: errorType
                });
            }
        },
        submissionStarted: (date, score) => {
            if (typeof gtag === 'function') {
                gtag('event', 'high_score_submission_started', {
                    date: date,
                    score: score
                });
            }
        },
        submissionSuccess: (date, score, isNewHighScore, previousScore = null) => {
            if (typeof gtag === 'function') {
                gtag('event', 'high_score_submission_success', {
                    date: date,
                    score: score,
                    is_new_high_score: isNewHighScore,
                    previous_score: previousScore,
                    improvement: previousScore ? score - previousScore : null
                });
            }
        },
        submissionFailed: (date, score, errorType) => {
            if (typeof gtag === 'function') {
                gtag('event', 'high_score_submission_failed', {
                    date: date,
                    score: score,
                    error_type: errorType
                });
            }
        },
        achievementShown: (score, previousScore = null) => {
            if (typeof gtag === 'function') {
                gtag('event', 'high_score_achievement_shown', {
                    score: score,
                    previous_score: previousScore,
                    is_first_score: previousScore === null
                });
            }
        },
        linkClicked: (highScore, yourScore) => {
            if (typeof gtag === 'function') {
                gtag('event', 'high_score_link_clicked', {
                    high_score: highScore,
                    your_score: yourScore
                });
            }
        }
    },

    // UI interaction events
    ui: {
        tilesRecalled: (turn, tileCount) => {
            if (typeof gtag === 'function') {
                gtag('event', 'tiles_recalled', {
                    turn: turn,
                    tile_count: tileCount
                });
            }
        },
        rackShuffled: (turn) => {
            if (typeof gtag === 'function') {
                gtag('event', 'rack_shuffled', {
                    turn: turn
                });
            }
        },
        popupShown: (score, scoreTitle) => {
            if (typeof gtag === 'function') {
                gtag('event', 'popup_shown', {
                    score: score,
                    score_title: scoreTitle
                });
            }
        },
        popupDismissed: (score, timeOpen, actionTaken) => {
            if (typeof gtag === 'function') {
                gtag('event', 'popup_dismissed', {
                    score: score,
                    time_open_ms: timeOpen,
                    action_taken: actionTaken
                });
            }
        }
    },

    // Error tracking
    error: (type, message, location, fatal = false) => {
        if (typeof gtag === 'function') {
            gtag('event', 'error_occurred', {
                error_type: type,
                error_message: message,
                error_location: location,
                fatal: fatal ? 'true' : 'false'
            });
        }
    }
};

// ============================================================================
// V3 URL Encoding/Decoding Utilities (45-character URLs)
// ============================================================================

// BitStream class for reading/writing variable-width bits
class BitStream {
    constructor(bytes = null) {
        this.bytes = bytes || [];
        this.bitPosition = 0;
    }

    // Write N bits to the stream
    writeBits(value, numBits) {
        for (let i = numBits - 1; i >= 0; i--) {
            const bit = (value >> i) & 1;
            const byteIndex = Math.floor(this.bitPosition / 8);
            const bitIndex = 7 - (this.bitPosition % 8);

            // Ensure byte exists
            while (this.bytes.length <= byteIndex) {
                this.bytes.push(0);
            }

            // Set bit
            if (bit) {
                this.bytes[byteIndex] |= (1 << bitIndex);
            }

            this.bitPosition++;
        }
    }

    // Read N bits from the stream
    readBits(numBits) {
        let value = 0;
        for (let i = 0; i < numBits; i++) {
            const byteIndex = Math.floor(this.bitPosition / 8);
            const bitIndex = 7 - (this.bitPosition % 8);

            if (byteIndex >= this.bytes.length) {
                throw new Error(`Attempted to read beyond end of bit stream`);
            }

            const bit = (this.bytes[byteIndex] >> bitIndex) & 1;
            value = (value << 1) | bit;
            this.bitPosition++;
        }
        return value;
    }

    // Get current byte array
    getBytes() {
        return new Uint8Array(this.bytes);
    }

    // Reset read position
    reset() {
        this.bitPosition = 0;
    }
}

// Date conversion: YYYYMMDD string to days since 2020-01-01
function dateToDaysSinceEpoch(dateStr) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6));
    const day = parseInt(dateStr.substring(6, 8));

    // Use UTC to avoid timezone issues
    const targetDate = Date.UTC(year, month - 1, day);
    const epochDate = Date.UTC(2020, 0, 1); // January 1, 2020

    const diffTime = targetDate - epochDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

// Days since epoch to YYYYMMDD string
function daysSinceEpochToDate(days) {
    const epochDate = Date.UTC(2020, 0, 1); // January 1, 2020
    const targetTime = epochDate + days * 24 * 60 * 60 * 1000;
    const targetDate = new Date(targetTime);

    const year = targetDate.getUTCFullYear();
    const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getUTCDate()).padStart(2, '0');

    return `${year}${month}${day}`;
}

// URL-safe Base64 encoding
function base64UrlEncode(bytes) {
    // Convert bytes to binary string
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }

    // Base64 encode and make URL-safe
    return btoa(binaryString)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// URL-safe Base64 decoding
function base64UrlDecode(str) {
    // Restore standard base64
    str = str.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    while (str.length % 4) {
        str += '=';
    }

    // Decode
    const binaryString = atob(str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
}

// Helper: Build V3 URL from tiles with rack indices
function buildV3URLFromTiles(tilesWithRackIdx) {
    // Encode to binary format
    const bitStream = new BitStream();

    // Date (14 bits)
    const daysSinceEpoch = dateToDaysSinceEpoch(gameState.seed);
    bitStream.writeBits(daysSinceEpoch, 14);

    // Tile count (5 bits)
    bitStream.writeBits(tilesWithRackIdx.length, 5);

    // Tiles (13 bits each: 7 position + 3 rackIdx + 3 turn)
    tilesWithRackIdx.forEach(tile => {
        const position = tile.row * 9 + tile.col;  // 0-80
        bitStream.writeBits(position, 7);
        bitStream.writeBits(tile.rackIdx, 3);
        bitStream.writeBits(tile.turn, 3);
    });

    // Convert to URL-safe Base64
    const bytes = bitStream.getBytes();
    const encoded = base64UrlEncode(bytes);

    // Build URL with new ?w= parameter (sorted format, enables rack caching)
    const url = `https://letters.wiki/?w=${encoded}`;

    console.log('[V3 Encoder] Generated URL (sorted format):', url);
    console.log('[V3 Encoder] URL length:', url.length);
    console.log('[V3 Encoder] Tiles encoded:', tilesWithRackIdx.length);

    return url;
}

// V3 Encoder: Build 45-character URL with rack indices
async function encodeV3URL() {
    try {
        // Build tile array from turn history
        const tiles = [];
        console.log('[V3 Encoder] Turn history:', JSON.parse(JSON.stringify(gameState.turnHistory)));

        gameState.turnHistory.forEach((turn, turnIndex) => {
            if (turn && turn.tiles) {
                console.log(`[V3 Encoder] Turn ${turnIndex + 1}: ${turn.tiles.length} tiles`);
                turn.tiles.forEach(tile => {
                    tiles.push({
                        row: tile.row,
                        col: tile.col,
                        letter: tile.letter,
                        turn: turnIndex + 1
                    });
                    console.log(`[V3 Encoder]   - (${tile.row},${tile.col}) = ${tile.letter}`);
                });
            }
        });

        if (tiles.length === 0) {
            console.error('[V3 Encoder] No tiles to encode');
            return null;
        }

        console.log('[V3 Encoder] Total tiles to encode:', tiles.length);

        // Group tiles by turn to fetch racks
        const tilesByTurn = {};
        tiles.forEach(tile => {
            if (!tilesByTurn[tile.turn]) {
                tilesByTurn[tile.turn] = [];
            }
            tilesByTurn[tile.turn].push(tile);
        });

        // FAST PATH: Check if all racks are cached (eliminates API calls!)
        // ENABLED: Alphabetical sorting in new ?w= format ensures cached racks work correctly!
        // /letters.py and /get_rack.py return different orders, but sorting makes them match
        const allRacksCached = gameState.turnHistory.every(turn => turn && turn.originalRack && turn.originalRack.length > 0);

        if (allRacksCached) {
            console.log('[V3 Encoder] ✓ All racks cached! Using fast path (no API calls)');
            const fastPathStart = Date.now();

            const tilesWithRackIdx = [];
            for (let turn = 1; turn <= 5; turn++) {
                const turnTiles = tilesByTurn[turn] || [];
                if (turnTiles.length === 0) continue;

                const rack = gameState.turnHistory[turn - 1].originalRack;
                // Sort rack alphabetically for new ?w= format (enables rack caching!)
                const sortedRack = [...rack].sort();
                console.log(`[V3 Encoder] Turn ${turn} rack (cached):`, rack);
                console.log(`[V3 Encoder] Turn ${turn} sorted rack:`, sortedRack);

                const usedIndices = new Set();
                turnTiles.forEach(tile => {
                    let rackIdx = -1;
                    for (let i = 0; i < sortedRack.length; i++) {
                        if (sortedRack[i] === tile.letter && !usedIndices.has(i)) {
                            rackIdx = i;
                            usedIndices.add(i);
                            break;
                        }
                    }

                    if (rackIdx === -1) {
                        console.error(`[V3 Encoder] Letter ${tile.letter} not found in rack for turn ${turn}`, rack);
                        throw new Error(`V3 encoding failed: Letter '${tile.letter}' not found in rack for turn ${turn}. This indicates a bug in rack caching.`);
                    }
                    tilesWithRackIdx.push({...tile, rackIdx});
                });
            }

            const fastPathDuration = Date.now() - fastPathStart;
            console.log(`[V3 Encoder] ✓ Fast path completed in ${fastPathDuration}ms (no API calls!)`);

            // Jump to encoding (skip API fetch section)
            return buildV3URLFromTiles(tilesWithRackIdx);
        }

        // SLOW PATH: Fetch racks via API (fallback for loaded games without cached racks)
        console.log('[V3 Encoder] Racks not cached, using API fallback (sequential fetch)');
        const tilesWithRackIdx = [];
        const playHistory = []; // Track actual tiles played each turn

        for (let turn = 1; turn <= 5; turn++) {
            const turnTiles = tilesByTurn[turn] || [];

            if (turnTiles.length === 0) continue;

            // Build history parameter (JSON array of previous turns' tiles)
            const historyParam = playHistory.length > 0 ? encodeURIComponent(JSON.stringify(playHistory)) : '';

            // Fetch rack for this turn with history
            let url = `${API_BASE}/get_rack.py?seed=${gameState.seed}&turn=${turn}`;
            if (historyParam) {
                url += `&history=${historyParam}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch rack for turn ${turn}`);
            }
            const data = await response.json();
            const rack = data.rack.slice(); // Copy rack
            // Sort rack alphabetically for new ?w= format
            const sortedRack = [...rack].sort();

            console.log(`[V3 Encoder] Turn ${turn} rack:`, rack);
            console.log(`[V3 Encoder] Turn ${turn} sorted rack:`, sortedRack);

            // For each tile played this turn, find its rack index
            const tilesPlayedThisTurn = [];
            const usedIndices = new Set(); // Track which rack positions we've used

            turnTiles.forEach(tile => {
                // Find the first unused index with this letter
                let rackIdx = -1;
                for (let i = 0; i < sortedRack.length; i++) {
                    if (sortedRack[i] === tile.letter && !usedIndices.has(i)) {
                        rackIdx = i;
                        usedIndices.add(i);
                        break;
                    }
                }

                if (rackIdx === -1) {
                    console.error(`[V3 Encoder] Letter ${tile.letter} not found in rack for turn ${turn}`, rack);
                    throw new Error(`V3 encoding failed: Letter '${tile.letter}' not found in rack for turn ${turn}. This indicates a bug in rack caching or API mismatch.`);
                }
                tilesWithRackIdx.push({...tile, rackIdx});
                tilesPlayedThisTurn.push(tile.letter);
            });

            // Track tiles played this turn for next turn's history
            playHistory.push(tilesPlayedThisTurn);
        }

        // Use shared encoding function
        return buildV3URLFromTiles(tilesWithRackIdx);

    } catch (err) {
        console.error('[V3 Encoder] Failed to encode:', err);
        return null;
    }
}

// V3 Decoder: Decode 45-character URL with rack indices
async function decodeV3URL(encodedData, isSortedFormat = false) {
    try {
        console.log(`[V3 Decoder] Decoding${isSortedFormat ? ' (sorted format)' : ' (legacy format)'}:`, encodedData);

        // Decode Base64 to bytes
        const bytes = base64UrlDecode(encodedData);
        const bitStream = new BitStream(Array.from(bytes));

        // Read date (14 bits)
        const daysSinceEpoch = bitStream.readBits(14);

        // Validate date range (should be 0-16383 for years 2020-2065)
        if (daysSinceEpoch < 0 || daysSinceEpoch > 16383) {
            throw new Error(`Invalid V3 data: date out of range (${daysSinceEpoch})`);
        }

        const seed = daysSinceEpochToDate(daysSinceEpoch);
        console.log('[V3 Decoder] Date decoded:', seed);

        // Validate seed format (YYYYMMDD)
        if (!/^\d{8}$/.test(seed)) {
            throw new Error(`Invalid V3 data: malformed date (${seed})`);
        }

        // Read tile count (5 bits)
        const tileCount = bitStream.readBits(5);

        // Validate tile count (max 35 tiles in a 5-turn game)
        if (tileCount > 35) {
            throw new Error(`Invalid V3 data: tile count too high (${tileCount})`);
        }

        console.log('[V3 Decoder] Tile count:', tileCount);

        // Read tiles (position, rackIdx, turn)
        const tiles = [];
        for (let i = 0; i < tileCount; i++) {
            const position = bitStream.readBits(7);
            const rackIdx = bitStream.readBits(3);
            const turn = bitStream.readBits(3);

            // Validate position (0-80 for 9x9 board)
            if (position > 80) {
                throw new Error(`Invalid V3 data: tile position out of range (${position})`);
            }

            // Validate turn (1-5)
            if (turn < 1 || turn > 5) {
                throw new Error(`Invalid V3 data: turn out of range (${turn})`);
            }

            const row = Math.floor(position / 9);
            const col = position % 9;

            tiles.push({ row, col, rackIdx, turn });
        }

        console.log('[V3 Decoder] Tiles decoded:', tiles);

        // Group tiles by turn
        const tilesByTurn = {};
        tiles.forEach(tile => {
            if (!tilesByTurn[tile.turn]) {
                tilesByTurn[tile.turn] = [];
            }
            tilesByTurn[tile.turn].push(tile);
        });

        // Fetch racks and convert rack indices to letters
        const tilesWithLetters = [];
        const playHistory = []; // Track actual tiles played each turn

        for (let turn = 1; turn <= 5; turn++) {
            const turnTiles = tilesByTurn[turn] || [];

            if (turnTiles.length === 0) continue;

            // Build history parameter (JSON array of previous turns' tiles)
            const historyParam = playHistory.length > 0 ? encodeURIComponent(JSON.stringify(playHistory)) : '';

            // Fetch rack for this turn with history
            let url = `${API_BASE}/get_rack.py?seed=${seed}&turn=${turn}`;
            if (historyParam) {
                url += `&history=${historyParam}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch rack for turn ${turn}`);
            }
            const data = await response.json();
            const rack = data.rack;
            // Apply sorting for new format (?w=) to match encoding
            const decodingRack = isSortedFormat ? [...rack].sort() : rack;

            console.log(`[V3 Decoder] Turn ${turn} rack:`, rack);
            if (isSortedFormat) {
                console.log(`[V3 Decoder] Turn ${turn} sorted rack:`, decodingRack);
            }

            // Convert rack indices to letters
            const tilesPlayedThisTurn = [];
            const usedIndices = new Set();
            turnTiles.forEach(tile => {
                // The encoder already assigned the correct rack index for this tile
                // (handling duplicate letters by finding first unused index with matching letter)
                // Decoder just needs to look up the letter at that index
                const letter = decodingRack[tile.rackIdx];

                // Validate the index is valid and not already used (defensive check)
                if (letter === undefined) {
                    console.error(`[V3 Decoder] Invalid rack index ${tile.rackIdx} for turn ${turn}. Rack:`, decodingRack);
                    throw new Error(`Invalid rack index ${tile.rackIdx} - rack only has ${decodingRack.length} positions`);
                }
                if (usedIndices.has(tile.rackIdx)) {
                    console.error(`[V3 Decoder] Duplicate rack index ${tile.rackIdx} for turn ${turn}. Rack:`, decodingRack);
                    throw new Error(`Rack index ${tile.rackIdx} used twice in same turn`);
                }

                usedIndices.add(tile.rackIdx);

                tilesWithLetters.push({
                    row: tile.row,
                    col: tile.col,
                    letter: letter,
                    turn: parseInt(turn)
                });

                tilesPlayedThisTurn.push(letter);
            });

            // Track tiles played this turn for next turn's history
            playHistory.push(tilesPlayedThisTurn);
        }

        console.log('[V3 Decoder] Tiles with letters:', tilesWithLetters);

        // Calculate scores using server endpoint
        const scoresResponse = await fetch(`${API_BASE}/calculate_scores.py`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tiles: tilesWithLetters, seed: seed })
        });

        if (!scoresResponse.ok) {
            throw new Error('Failed to calculate scores');
        }

        const scoresData = await scoresResponse.json();

        console.log('[V3 Decoder] Scores calculated:', scoresData);

        // Build game data in same format as V1
        const gameData = {
            d: seed,
            w: null,  // Will be fetched later
            t: tilesWithLetters.map(tile => [
                tile.row,
                tile.col,
                tile.letter,
                tile.turn,
                0  // blank flag
            ]),
            s: scoresData.scores
        };

        return gameData;

    } catch (err) {
        console.error('[V3 Decoder] Failed to decode:', err);
        throw err;
    }
}

// Load V3 shared game from URL
async function loadV3SharedGame(encodedParam, isSortedFormat = false) {
    const startTime = Date.now();

    try {
        console.log(`[V3 Load] Loading ${isSortedFormat ? 'sorted' : 'legacy'} V3 shared game`);

        // Decode the V3 URL (with or without sorting based on format)
        const gameData = await decodeV3URL(encodedParam, isSortedFormat);

        console.log('[V3 Load] Game data decoded:', gameData);

        // Fetch starting word (needed for display)
        const response = await fetch(`${API_BASE}/letters.py?seed=${gameData.d}`);

        // Check HTTP status before parsing JSON
        if (!response.ok) {
            throw new Error(`game_load_http_${response.status}`);
        }

        const data = await response.json();
        gameData.w = data.starting_word;

        // Set game state for shared game
        gameState.seed = gameData.d;
        gameState.dateStr = formatSeedToDate(gameData.d);
        gameState.startingWord = gameData.w;
        gameState.turnScores = gameData.s;
        gameState.score = gameData.s.reduce((sum, score) => sum + score, 0);
        gameState.isGameOver = true; // Shared games are always complete
        gameState.currentTurn = 6; // Beyond max turns

        console.log('[V3 Load] Date:', gameData.d);

        // Update UI
        document.getElementById('dateDisplay').textContent = gameState.dateStr;

        // Initialize boards
        createBoard();
        createRackBoard();

        // Render the shared board
        renderSharedBoard(gameData);

        // Don't show share icon - this is someone else's board

        // Track shared game loaded
        const tileCount = gameData.t ? gameData.t.length : 0;
        const duration = Date.now() - startTime;
        Analytics.navigation.sharedGameLoaded('v3', tileCount, gameState.score, duration);

        console.log('[V3 Load] V3 shared game loaded successfully');

    } catch (err) {
        console.error('[V3 Load] Failed to load V3 shared game:', err);
        // Re-throw so the caller can try fallback to LZ-String
        throw err;
    }
}

// Initialize game on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Proactively wait for LZ-String library to load (needed for share URLs)
    // This ensures it's ready by the time user finishes game and wants to share
    waitForLZString().then(loaded => {
        if (loaded) {
            console.log('[Init] LZ-String library ready for share functionality');
        } else {
            console.warn('[Init] LZ-String library failed to load - sharing may not work');
        }
    });

    initializeGame();
    setupEventListeners();

    // Prevent all scrolling on the page
    document.addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, { passive: false });

    // Check for debug mode in URL
    const urlParams = new URLSearchParams(window.location.search);
    // DEBUG MODE DISABLED IN PRODUCTION
    // Uncomment below to enable debug mode for local development
    /*
    if (urlParams.get('debug') === '1') {
        document.getElementById('debug-controls').style.display = 'block';
        const debugToggle = document.getElementById('debug-mode-toggle');
        debugToggle.addEventListener('change', (e) => {
            gameState.debugMode = e.target.checked;
            console.log('Debug mode:', gameState.debugMode ? 'ON' : 'OFF');
        });
    }
    */

    // Check for test_popup parameter to test different scores
    const testScore = urlParams.get('test_popup');
    if (testScore !== null) {
        setTimeout(() => {
            const score = parseInt(testScore) || 0;
            testPopup(score);
        }, 500);
    }

    // Expose for testing
    window.gameState = gameState;
    window.endGame = endGame;
    window.testPopup = testPopup;
    window.getScoreTitle = getScoreTitle;
    window.buildShareableGameData = buildShareableGameData;
    window.generateShareableURL = generateShareableURL;
    window.playThisDate = playThisDate;
});

async function initializeGame() {
    // Get or generate seed from URL
    const urlParams = new URLSearchParams(window.location.search);

    // Phase 3: Check for compressed game share (?g= legacy or ?w= sorted)
    const legacyParam = urlParams.get('g');  // V3 original (no sorting)
    const sortedParam = urlParams.get('w');  // V3 sorted (with rack caching)
    const compressedParam = sortedParam || legacyParam;
    const isSortedFormat = !!sortedParam;

    if (compressedParam) {
        console.log(`[Load] Detected ${isSortedFormat ? 'sorted (?w=)' : 'legacy (?g=)'} game share parameter`);
        try {
            await loadV3SharedGame(compressedParam, isSortedFormat);
            return; // Exit early - V3 shared game loading succeeded
        } catch (v3Error) {
            console.log('[Load] V3 decode failed, trying LZ-String format...', v3Error.message);
            try {
                await loadSharedGame(compressedParam);
                return; // Exit early - LZ-String shared game loading succeeded
            } catch (lzError) {
                console.error('[Load] Both V3 and LZ-String decode failed:', lzError);
                // Continue with normal game initialization
            }
        }
    }

    let seed = urlParams.get('seed');

    if (!seed) {
        // Use today's date in YYYYMMDD format
        seed = getTodaysSeed();

        // Preserve existing URL parameters while adding seed
        urlParams.set('seed', seed);
        const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?${urlParams.toString()}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }

    gameState.seed = seed;
    gameState.dateStr = formatSeedToDate(seed);

    // Update UI with date
    document.getElementById('dateDisplay').textContent = gameState.dateStr;

    // Try to load saved game state
    const stateLoaded = loadGameState();

    // Initialize boards
    createBoard();
    createRackBoard();

    // If state was loaded, restore the board
    if (stateLoaded) {
        restoreBoard();
        restoreTileRack();
        updateUI();

        // Update subtitle with high score if conditions met (regardless of completion status)
        await updateSubtitleWithHighScore();

        // If the loaded game was already complete, show the popup with high score
        if (gameState.isGameOver) {
            // Pre-generate share URL (needed for high score submission)
            await generateShareableBoardURL();

            await showBasicPopupWithHighScore();

            const shareIcon = document.getElementById('shareIcon');
            if (shareIcon) {
                shareIcon.classList.remove('hidden');
            }
        }
    } else {
        // Fetch game data from server
        fetchGameData(seed);
    }
}

function formatSeedToDate(seed) {
    // Convert YYYYMMDD to readable date
    const year = seed.substring(0, 4);
    const month = seed.substring(4, 6);
    const day = seed.substring(6, 8);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
    });
}

function createBoard() {
    const boardElement = document.getElementById('game-board');
    boardElement.innerHTML = '';

    // Only reset board if it doesn't already exist
    if (!gameState.board || gameState.board.length === 0) {
        gameState.board = [];
    }

    for (let row = 0; row < BOARD_SIZE; row++) {
        if (!gameState.board[row]) {
            gameState.board[row] = [];
        }
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'board-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            // Add multiplier classes
            const pos = `${row},${col}`;
            if (MULTIPLIERS.tripleWord.some(([r, c]) => r === row && c === col)) {
                cell.classList.add('triple-word');
                cell.innerHTML = '<span class="multiplier-text">TW</span>';
            } else if (MULTIPLIERS.doubleWord.some(([r, c]) => r === row && c === col)) {
                cell.classList.add('double-word');
                cell.innerHTML = '<span class="multiplier-text">DW</span>';
            } else if (MULTIPLIERS.tripleLetter.some(([r, c]) => r === row && c === col)) {
                cell.classList.add('triple-letter');
                cell.innerHTML = '<span class="multiplier-text">TL</span>';
            } else if (MULTIPLIERS.doubleLetter.some(([r, c]) => r === row && c === col)) {
                cell.classList.add('double-letter');
                cell.innerHTML = '<span class="multiplier-text">DL</span>';
            }

            boardElement.appendChild(cell);
            // Only set to null if there's no existing letter
            if (!gameState.board[row][col]) {
                gameState.board[row][col] = null;
            }
        }
    }
}

function fetchGameData(seed) {
    showLoading(true);

    fetch(`${API_BASE}/letters.py?seed=${seed}`)
        .then(response => {
            // Check HTTP status before parsing JSON
            if (!response.ok) {
                throw new Error(`game_init_http_${response.status}`);
            }
            return response.json();
        })
        .then(async data => {
            if (data.error) {
                showError(data.error);
                return;
            }

            gameState.startingWord = data.starting_word;
            gameState.tiles = data.tiles;
            gameState.wordContext = data.word_context;
            gameState.wikipediaUrl = data.wikipedia_url;

            // Save original rack at turn START (before shuffle/placement)
            // This prevents corruption when user shuffles after placing tiles
            gameState.turnStartRack = [...data.tiles];

            // Track game start time and fire analytics event
            gameState.gameStartTime = Date.now();
            Analytics.game.started(
                gameState.seed,
                'direct',  // User came directly, not from shared URL
                gameState.startingWord
            );

            // Place starting word on board
            placeStartingWord(data.starting_word);

            // Display initial tiles
            displayTiles(data.tiles);

            // Removed Wikipedia link functionality
            if (data.starting_word) {
                gameState.startingWord = data.starting_word;
            }

            // Update turn counter display
            updateTurnCounter();

            // Check if player has already played today
            checkPlayStatus();

            // Update subtitle with high score if conditions met
            await updateSubtitleWithHighScore();

            // Save initial state
            saveGameState();

            console.log('Game data loaded successfully, hiding loading overlay');
            showLoading(false);
        })
        .catch(error => {
            // Track error to analytics
            let errorType = 'game_init_network_error';
            if (error.message.startsWith('game_init_http_')) {
                errorType = error.message;
            } else if (error.name === 'SyntaxError') {
                errorType = 'game_init_json_parse_error';
            } else if (error.message) {
                errorType = 'game_init_' + error.message.substring(0, 40);
            }
            Analytics.error(errorType, error.message, 'fetchGameData', false);

            showError('Failed to load game. Please try again.');
            console.error('Error fetching game data:', error);
            showLoading(false);
        });
}

// Helper: Get today's seed in YYYYMMDD format
function getTodaysSeed() {
    const today = new Date();
    return today.getFullYear().toString() +
           (today.getMonth() + 1).toString().padStart(2, '0') +
           today.getDate().toString().padStart(2, '0');
}

// Update subtitle with high score if player has already finished today's game
async function updateSubtitleWithHighScore() {
    // Only proceed if this is today's game AND player has finished
    const todaysSeed = getTodaysSeed();
    const isToday = gameState.seed === todaysSeed;

    // Check if player has completed today's game
    // Check both saved game state AND the completion flag (for Start Over scenario)
    const savedState = localStorage.getItem('letters_game_state');
    const completedToday = localStorage.getItem('letters_completed_today');
    let isComplete = false;

    // Check saved game state
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            isComplete = parsed.isGameOver === true && parsed.seed === gameState.seed;
        } catch (e) {
            console.error('Error parsing localStorage for subtitle update:', e);
        }
    }

    // Also check if completion flag matches today's seed (for Start Over scenario)
    if (!isComplete && completedToday === todaysSeed) {
        isComplete = true;
    }

    // Cleanup: Remove old completion flags from previous days
    if (completedToday && completedToday !== todaysSeed) {
        localStorage.removeItem('letters_completed_today');
    }

    // Exit early if conditions not met
    if (!isToday || !isComplete) {
        return;
    }

    // Fetch high score
    try {
        const highScoreData = await fetchHighScore(gameState.seed);

        if (highScoreData && highScoreData.score && highScoreData.board_url) {
            // Update subtitle with clickable high score
            const subtitleEl = document.getElementById('subtitle');
            if (subtitleEl) {
                subtitleEl.innerHTML = `Today's High Score: <a href="${highScoreData.board_url}">${highScoreData.score}</a>`;
            }
        }
    } catch (error) {
        // Silent fail - just keep original subtitle
        console.error('Failed to update subtitle with high score:', error);
    }
}

function placeStartingWord(word) {
    const startCol = CENTER_POSITION - Math.floor(word.length / 2);

    for (let i = 0; i < word.length; i++) {
        const row = CENTER_POSITION;
        const col = startCol + i;
        gameState.board[row][col] = word[i];

        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);

        // Create tile element for starting word
        const tileDiv = document.createElement('div');
        tileDiv.className = 'tile placed';

        const letterSpan = document.createElement('span');
        letterSpan.className = 'tile-letter';
        letterSpan.textContent = word[i];

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'tile-value';
        scoreSpan.textContent = TILE_SCORES[word[i]] || 0;

        tileDiv.appendChild(letterSpan);
        tileDiv.appendChild(scoreSpan);

        // Clear any multiplier text and add tile
        cell.innerHTML = '';
        cell.appendChild(tileDiv);
        cell.classList.add('occupied');
    }
}

function createRackBoard() {
    const rackBoard = document.getElementById('tile-rack-board');
    rackBoard.innerHTML = '';

    // Create a 1x7 rack board
    const row = 0;
    for (let col = 0; col < 7; col++) {
        const cell = document.createElement('div');
        cell.className = 'board-cell rack-cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.id = `rack-${row}-${col}`;
        rackBoard.appendChild(cell);
    }
}

function displayTiles(tiles) {
    const rackBoard = document.getElementById('tile-rack-board');
    const cells = rackBoard.querySelectorAll('.rack-cell');

    // Clear all cells
    cells.forEach(cell => cell.innerHTML = '');

    // Update rackTiles in game state
    gameState.rackTiles = [...tiles];

    // Place tiles in all 7 rack cells (row 0, columns 0-6)
    tiles.forEach((letter, index) => {
        const cell = document.getElementById(`rack-0-${index}`); // Row 0, columns 0-6
        if (cell) {
            const tile = createTileElement(letter, index);
            cell.appendChild(tile);
        }
    });
}

function createTileElement(letter, index) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.letter = letter;
    tile.dataset.index = index;

    const letterSpan = document.createElement('span');
    letterSpan.className = 'tile-letter';
    letterSpan.textContent = letter;

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'tile-score';
    scoreSpan.textContent = TILE_SCORES[letter];

    tile.appendChild(letterSpan);
    tile.appendChild(scoreSpan);

    // Add click event for selection
    tile.addEventListener('click', handleTileClick);

    return tile;
}

function setupEventListeners() {
    // Board cell events
    document.getElementById('game-board').addEventListener('click', handleBoardClick);

    // Rack board events - handle clicks on empty cells
    document.getElementById('tile-rack-board').addEventListener('click', handleRackBoardClick);

    // Button events
    // Submit buttons are now integrated into the total score display
    document.getElementById('recall-tiles').addEventListener('click', recallTiles);
    document.getElementById('shuffle-rack').addEventListener('click', shuffleRack);
    document.getElementById('submit-score').addEventListener('click', submitScore);
    document.getElementById('share-game').addEventListener('click', shareGame);
    document.getElementById('start-over').addEventListener('click', startOver);
    document.getElementById('close-error').addEventListener('click', () => {
        document.getElementById('error-modal').style.display = 'none';
    });

    // Popup close handlers
    const popupCloseX = document.getElementById('popup-close-x');
    if (popupCloseX) {
        popupCloseX.addEventListener('click', () => {
            const popup = document.getElementById('game-popup');
            if (popup) {
                popup.classList.add('hidden');
            }
        });
    }

    // No backdrop clicking (WikiDates doesn't have backdrop)

    // Share buttons in popup
    const sharePopupBtn = document.getElementById('share-popup-btn');
    if (sharePopupBtn) {
        sharePopupBtn.addEventListener('click', shareGame);
    }

    const shareBoardBtn = document.getElementById('share-board-btn');
    if (shareBoardBtn) {
        shareBoardBtn.addEventListener('click', shareBoardGame);
    }

    // Share icon click handler (like WikiDates - shows the popup)
    const shareIconBtn = document.getElementById('shareIcon');
    if (shareIconBtn) {
        shareIconBtn.addEventListener('click', (event) => {
            event.preventDefault();

            // Pre-generate share URL if not already done
            if (!gameState.preGeneratedShareURL) {
                generateShareableBoardURL();
            }

            showBasicPopupWithHighScore();
        });
    }

    // Prevent clicking on the active tab
    const gameTabs = document.querySelectorAll('.game-tab');
    gameTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            if (tab.classList.contains('game-tab-active')) {
                e.preventDefault();
            }
        });
    });
}

// Tile selection handler
let selectedTile = null;
let selectedTilePosition = null; // Track if selected tile is from board
// Make available for debugging
window.selectedTile = null;

// New click-to-swap functionality for rack tiles
function handleRackClick(e) {
    // Don't allow rack interactions after game ends
    if (gameState.isGameOver) return;

    const tile = e.target.closest('.tile');
    if (!tile || !tile.parentElement?.classList.contains('rack-cell')) return;

    // If a tile was already selected
    if (selectedTile) {
        // If clicking the same tile, just deselect it
        if (selectedTile === tile) {
            selectedTile.classList.remove('selected');
            selectedTile = null;
            selectedTilePosition = null;
        }
        // If the selected tile is from the rack, swap positions
        else if (!selectedTilePosition) {
            swapTilesInRack(selectedTile, tile);
            selectedTile.classList.remove('selected');
            selectedTile = null;
        }
        // If selected tile is from board, ignore (board tiles can't be placed in rack directly)
        else {
            selectedTile.classList.remove('selected');
            selectedTile = tile;
            selectedTilePosition = null;
            tile.classList.add('selected');
        }
    } else {
        // Select this tile
        selectedTile = tile;
        selectedTilePosition = null;
        tile.classList.add('selected');
    }
}

function swapTilesInRack(tile1, tile2) {
    const cell1 = tile1.parentElement;
    const cell2 = tile2.parentElement;

    // Swap tiles in DOM
    const tempDiv = document.createElement('div');
    cell1.insertBefore(tempDiv, tile1);
    cell2.appendChild(tile1);
    cell1.appendChild(tile2);
    tempDiv.remove();

    // Rebuild rackTiles array from the current visual rack state
    // This prevents bugs when tiles have been placed on board (leaving gaps)
    const rackBoard = document.getElementById('tile-rack-board');
    const cells = rackBoard.querySelectorAll('.rack-cell');
    gameState.rackTiles = [];

    cells.forEach(cell => {
        const tile = cell.querySelector('.tile');
        if (tile && tile.dataset.letter) {
            gameState.rackTiles.push(tile.dataset.letter);
        }
    });

    // Save state
    saveGameState();
}

function handleTileClick(e) {
    e.stopPropagation(); // Prevent event bubbling

    // Don't allow tile interactions after game ends
    if (gameState.isGameOver) return;

    const tile = e.target.closest('.tile');
    if (!tile) return;

    // Check if it's a board tile or rack tile
    const parentCell = tile.parentElement;
    const isRackTile = parentCell?.classList.contains('rack-cell');
    const isBoardTile = parentCell?.classList.contains('board-cell') && !isRackTile; // board-cell but NOT rack-cell

    console.log('Tile clicked:', {
        isRackTile,
        isBoardTile,
        parentClasses: parentCell?.className,
        tileText: tile.querySelector('.tile-letter')?.textContent
    });

    if (isRackTile) {
        // Handle rack tile first since rack cells have both classes
        if (selectedTile) {
            // If clicking the same tile, just deselect it
            if (selectedTile === tile) {
                selectedTile.classList.remove('selected');
                selectedTile = null;
                selectedTilePosition = null;
            }
            // If the selected tile is from the rack, swap positions
            else if (!selectedTilePosition) {
                console.log('Swapping tiles:', selectedTile, tile);
                swapTilesInRack(selectedTile, tile);
                selectedTile.classList.remove('selected');
                selectedTile = null;
                window.selectedTile = null;
            }
            // If selected tile is from board, select this rack tile instead
            else {
                selectedTile.classList.remove('selected');
                selectedTile = tile;
                selectedTilePosition = null;
                tile.classList.add('selected');
            }
        } else {
            // Select this tile
            selectedTile = tile;
            window.selectedTile = tile; // For debugging
            selectedTilePosition = null;
            tile.classList.add('selected');
        }
    } else if (isBoardTile) {
        // It's a board tile - only allow selection if placed this turn
        if (!parentCell.classList.contains('placed-this-turn')) {
            return;
        }

        if (selectedTile === tile) {
            // Deselect
            selectedTile.classList.remove('selected');
            selectedTile = null;
            selectedTilePosition = null;
        } else {
            // Select this board tile
            if (selectedTile) {
                selectedTile.classList.remove('selected');
            }
            selectedTile = tile;
            selectedTilePosition = {
                row: parseInt(parentCell.dataset.row),
                col: parseInt(parentCell.dataset.col)
            };
            tile.classList.add('selected');
        }
    }
}

function handleBoardClick(e) {
    // Don't allow board interactions after game ends
    if (gameState.isGameOver) return;

    const cell = e.target.closest('.board-cell');
    if (!cell) return;

    // If clicking on a tile, let handleTileClick handle it
    if (e.target.closest('.tile')) {
        return;
    }

    // Check if cell is empty and we have a selected tile
    if (!cell.classList.contains('occupied') && selectedTile) {
        // If the selected tile is from the board, move it
        if (selectedTilePosition) {
            moveTileBetweenBoardPositions(selectedTilePosition, cell);
        } else {
            // Selected tile is from rack, place it on board
            placeTile(cell, selectedTile);
        }
    }
}

function handleRackBoardClick(e) {
    // Don't allow rack interactions after game ends
    if (gameState.isGameOver) return;

    const cell = e.target.closest('.rack-cell');
    if (!cell) return;

    // If clicking on a tile, let handleTileClick handle it
    if (e.target.closest('.tile')) {
        return;
    }

    // Check if cell is empty and we have a selected tile from the board
    if (!cell.querySelector('.tile') && selectedTile && selectedTilePosition) {
        // Clear selection before moving (tile will be destroyed)
        if (selectedTile) {
            selectedTile.classList.remove('selected');
        }
        // Move tile from board back to rack
        returnBoardTileToRack(selectedTilePosition);
        // Clear selection references
        selectedTile = null;
        selectedTilePosition = null;
    }
}

function moveTileBetweenBoardPositions(fromPos, toCell) {
    const toRow = parseInt(toCell.dataset.row);
    const toCol = parseInt(toCell.dataset.col);

    // Find the tile in placedTiles
    const tileIndex = gameState.placedTiles.findIndex(
        t => t.row === fromPos.row && t.col === fromPos.col
    );

    if (tileIndex === -1) return;

    // Get the tile data
    const tileData = gameState.placedTiles[tileIndex];

    // Clear old position
    const fromCell = document.querySelector(
        `.board-cell[data-row="${fromPos.row}"][data-col="${fromPos.col}"]`
    );
    const tile = fromCell.querySelector('.tile');

    fromCell.innerHTML = '';
    fromCell.classList.remove('occupied', 'placed-this-turn');
    gameState.board[fromPos.row][fromPos.col] = null;

    // Restore multiplier text at old position if needed
    const oldCellType = getCellType(fromPos.row, fromPos.col);
    if (oldCellType && oldCellType !== 'normal') {
        const multiplierSpan = document.createElement('span');
        multiplierSpan.className = 'multiplier-text';
        multiplierSpan.textContent = getMultiplierText(oldCellType);
        fromCell.appendChild(multiplierSpan);
    }

    // Update tile data with new position
    tileData.row = toRow;
    tileData.col = toCol;

    // Clear new position and place tile
    toCell.innerHTML = '';  // Clear any multiplier text
    toCell.appendChild(tile);
    toCell.classList.add('occupied', 'placed-this-turn');
    gameState.board[toRow][toCol] = tileData.letter;

    // Clear selection
    selectedTile.classList.remove('selected');
    selectedTile = null;
    selectedTilePosition = null;

    // Update preview and save state
    updateWordPreview();
    checkWordValidity();
    updatePotentialWordsSidebar();
    saveGameState();
}

function returnBoardTileToRack(fromPos) {
    const fromCell = document.querySelector(
        `.board-cell[data-row="${fromPos.row}"][data-col="${fromPos.col}"]`
    );

    if (!fromCell || !fromCell.classList.contains('placed-this-turn')) {
        // Can't remove tiles that weren't placed this turn
        return;
    }

    // Find the tile in placedTiles
    const tileIndex = gameState.placedTiles.findIndex(
        t => t.row === fromPos.row && t.col === fromPos.col
    );

    if (tileIndex === -1) return;

    // Get the tile data and remove from placedTiles
    const tileData = gameState.placedTiles.splice(tileIndex, 1)[0];

    // Get the tile element
    const tile = fromCell.querySelector('.tile');
    if (!tile) return;

    // Clear board position
    gameState.board[fromPos.row][fromPos.col] = null;
    fromCell.innerHTML = '';
    fromCell.classList.remove('occupied', 'placed-this-turn');

    // Restore multiplier text if needed
    const cellType = getCellType(fromPos.row, fromPos.col);
    if (cellType && cellType !== 'normal') {
        const multiplierSpan = document.createElement('span');
        multiplierSpan.className = 'multiplier-text';
        multiplierSpan.textContent = getMultiplierText(cellType);
        fromCell.appendChild(multiplierSpan);
    }

    // Add back to rackTiles array
    gameState.rackTiles.push(tileData.letter);

    // Create new tile element for rack
    const newTile = createTileElement(tileData.letter, gameState.rackTiles.length - 1);
    const rackBoard = document.getElementById('tile-rack-board');
    const firstEmptyCell = Array.from(rackBoard.querySelectorAll('.rack-cell'))
        .find(cell => !cell.querySelector('.tile'));
    if (firstEmptyCell) {
        firstEmptyCell.appendChild(newTile);
    }

    // Update preview and save state
    console.log('[DEBUG] returnBoardTileToRack: Updating displays after tile removal');
    updateWordPreview();
    checkWordValidity();
    updatePotentialWordsSidebar();
    saveGameState();
}

function returnTileToRack(cell, addToRack = true) {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const letter = gameState.board[row][col];

    if (!letter) return;

    // Clear from board
    gameState.board[row][col] = null;
    cell.innerHTML = '';
    cell.classList.remove('occupied', 'placed-this-turn');

    // Remove from placed tiles
    gameState.placedTiles = gameState.placedTiles.filter(
        t => !(t.row === row && t.col === col)
    );

    // Restore multiplier text if this is a special square
    restoreMultiplierText(cell, row, col);

    if (addToRack) {
        // Create new tile for rack
        const newTile = document.createElement('div');
        newTile.className = 'tile';
        newTile.dataset.letter = letter;
        newTile.draggable = true;

        const letterSpan = document.createElement('span');
        letterSpan.className = 'tile-letter';
        letterSpan.textContent = letter;

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'tile-score';
        scoreSpan.textContent = TILE_SCORES[letter] || 0;

        newTile.appendChild(letterSpan);
        newTile.appendChild(scoreSpan);

        // Add event listeners
        newTile.addEventListener('click', handleTileClick);
        newTile.addEventListener('dragstart', handleDragStart);
        newTile.addEventListener('dragend', handleDragEnd);

        // Add to rack
        const rackBoard = document.getElementById('tile-rack-board');
        const firstEmptyCell = Array.from(rackBoard.querySelectorAll('.rack-cell'))
            .find(cell => !cell.querySelector('.tile'));
        if (firstEmptyCell) {
            firstEmptyCell.appendChild(newTile);
        }
    }

    // Save game state and check validity
    saveGameState();
    checkWordValidity();
}

function isValidPlacement(row, col) {
    // Allow placement anywhere that's empty
    return gameState.board[row][col] === null;
}

function checkConnectivity() {
    // Check if placed tiles connect to existing board tiles
    if (gameState.placedTiles.length === 0) {
        return false;
    }

    // Check if this is the first play - must use center
    const hasExistingTiles = gameState.board.some((row, ri) =>
        row.some((cell, ci) =>
            cell !== null && !gameState.placedTiles.some(t => t.row === ri && t.col === ci)
        )
    );

    if (!hasExistingTiles) {
        // First play must use center square
        return gameState.placedTiles.some(t =>
            t.row === CENTER_POSITION && t.col === CENTER_POSITION
        );
    }

    // At least one tile must be adjacent to existing tiles
    for (const tile of gameState.placedTiles) {
        const row = tile.row;
        const col = tile.col;

        // Check adjacent cells for existing tiles (not from current placement)
        const adjacentToExisting =
            (row > 0 && gameState.board[row - 1][col] &&
             !gameState.placedTiles.some(t => t.row === row - 1 && t.col === col)) ||
            (row < BOARD_SIZE - 1 && gameState.board[row + 1][col] &&
             !gameState.placedTiles.some(t => t.row === row + 1 && t.col === col)) ||
            (col > 0 && gameState.board[row][col - 1] &&
             !gameState.placedTiles.some(t => t.row === row && t.col === col - 1)) ||
            (col < BOARD_SIZE - 1 && gameState.board[row][col + 1] &&
             !gameState.placedTiles.some(t => t.row === row && t.col === col + 1));

        if (adjacentToExisting) {
            return true;
        }
    }

    return false;
}

function placeTile(cell, tile) {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const letter = tile.dataset.letter || tile.textContent?.charAt(0); // Handle both rack and board tiles

    // Check if placement is valid (cell is empty)
    if (!isValidPlacement(row, col)) {
        return;
    }

    // Remove tile from its current location
    if (tile.parentElement?.classList.contains('rack-cell')) {
        // Get the letter before removing
        const removedLetter = tile.dataset.letter;

        // Reset opacity before removing
        tile.style.opacity = '';
        tile.remove();

        // Remove from rackTiles array
        const index = gameState.rackTiles.indexOf(removedLetter);
        if (index > -1) {
            gameState.rackTiles.splice(index, 1);
        }
    }

    // Place on board
    gameState.board[row][col] = letter;

    // Create tile element for the board
    const tileDiv = document.createElement('div');
    tileDiv.className = 'tile placed placed-this-turn';
    tileDiv.dataset.letter = letter;
    const letterSpan = document.createElement('span');
    letterSpan.className = 'tile-letter';
    letterSpan.textContent = letter;

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'tile-value';
    scoreSpan.textContent = TILE_SCORES[letter] || 0;

    tileDiv.appendChild(letterSpan);
    tileDiv.appendChild(scoreSpan);

    // Add click handler for board tiles
    tileDiv.addEventListener('click', handleTileClick);

    cell.innerHTML = '';
    cell.appendChild(tileDiv);
    cell.classList.add('occupied', 'placed-this-turn');

    // Track placed tile (don't save tile DOM element)
    gameState.placedTiles.push({ row, col, letter });

    // Save game state
    saveGameState();

    // Clear selection
    if (selectedTile) {
        selectedTile.classList.remove('selected');
    }
    selectedTile = null;

    // Check if word is valid for submission
    checkWordValidity();
    updateWordPreview();
}

// Board tile click handling is now integrated in handleTileClick function

function getCellType(row, col) {
    if (MULTIPLIERS.tripleWord.some(([r, c]) => r === row && c === col)) {
        return 'triple-word';
    } else if (MULTIPLIERS.doubleWord.some(([r, c]) => r === row && c === col)) {
        return 'double-word';
    } else if (MULTIPLIERS.tripleLetter.some(([r, c]) => r === row && c === col)) {
        return 'triple-letter';
    } else if (MULTIPLIERS.doubleLetter.some(([r, c]) => r === row && c === col)) {
        return 'double-letter';
    }
    return 'normal';
}

function getMultiplierText(cellType) {
    switch(cellType) {
        case 'triple-word': return 'TW';
        case 'double-word': return 'DW';
        case 'triple-letter': return 'TL';
        case 'double-letter': return 'DL';
        default: return '';
    }
}

function restoreMultiplierText(cell, row, col) {
    const cellType = getCellType(row, col);
    if (cellType && cellType !== 'normal' && cellType !== 'center') {
        const multiplierSpan = document.createElement('span');
        multiplierSpan.className = 'multiplier-text';
        multiplierSpan.textContent = getMultiplierText(cellType);
        cell.appendChild(multiplierSpan);
    }
}

function showInvalidPlacement(cell) {
    cell.classList.add('invalid-placement');
    setTimeout(() => {
        cell.classList.remove('invalid-placement');
    }, 500);
}

function updateWordPreview() {
    // Find all formed words and calculate score
    const words = findFormedWords();
    displayWordPreview(words);
}

function findFormedWords() {
    const words = [];

    console.log('[DEBUG] findFormedWords: placedTiles=', gameState.placedTiles);
    console.log('[DEBUG] findFormedWords: board state=', gameState.board);

    // Check each placed tile for words it forms
    gameState.placedTiles.forEach(({ row, col }) => {
        // Check horizontal word
        const hWord = getWordAt(row, col, 'horizontal');
        if (hWord && hWord.word.length > 1) {
            words.push(hWord);
        }

        // Check vertical word
        const vWord = getWordAt(row, col, 'vertical');
        if (vWord && vWord.word.length > 1) {
            words.push(vWord);
        }
    });

    // Remove duplicates
    const uniqueWords = [];
    const seen = new Set();
    words.forEach(word => {
        const key = `${word.word}-${word.startRow}-${word.startCol}-${word.direction}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueWords.push(word);
        }
    });

    return uniqueWords;
}

function getWordAt(row, col, direction) {
    let word = '';
    let startRow = row;
    let startCol = col;
    let positions = [];

    if (direction === 'horizontal') {
        // Find start of word
        while (startCol > 0 && gameState.board[row][startCol - 1]) {
            startCol--;
        }

        // Build word
        let c = startCol;
        while (c < BOARD_SIZE && gameState.board[row][c]) {
            word += gameState.board[row][c];
            positions.push({ row, col: c });
            c++;
        }
    } else {
        // Find start of word
        while (startRow > 0 && gameState.board[startRow - 1][col]) {
            startRow--;
        }

        // Build word
        let r = startRow;
        while (r < BOARD_SIZE && gameState.board[r][col]) {
            word += gameState.board[r][col];
            positions.push({ row: r, col });
            r++;
        }
    }

    if (word.length <= 1) return null;

    return {
        word,
        startRow,
        startCol,
        direction,
        positions,
        score: calculateWordScore(positions)
    };
}

function calculateWordScore(positions) {
    let score = 0;
    let wordMultiplier = 1;

    positions.forEach(({ row, col }) => {
        const letter = gameState.board[row][col];
        let letterScore = TILE_SCORES[letter] || 0;

        // Check if this is a newly placed tile for multipliers
        const isNew = gameState.placedTiles.some(t => t.row === row && t.col === col);
        if (isNew) {
            const cellType = getCellType(row, col);
            if (cellType === 'double-letter') {
                letterScore *= 2;
            } else if (cellType === 'triple-letter') {
                letterScore *= 3;
            } else if (cellType === 'double-word') {
                wordMultiplier *= 2;
            } else if (cellType === 'triple-word') {
                wordMultiplier *= 3;
            }
        }

        score += letterScore;
    });

    score *= wordMultiplier;

    // Add bingo bonus if all 7 tiles used IN THIS SPECIFIC WORD
    if (gameState.placedTiles.length === 7) {
        // Check if all 7 placed tiles are in this word
        const placedInThisWord = positions.filter(pos =>
            gameState.placedTiles.some(t => t.row === pos.row && t.col === pos.col)
        ).length;

        if (placedInThisWord === 7) {
            score += 50;
        }
    }

    return score;
}

function displayWordPreview(words) {
    // Remove any existing preview element
    let preview = document.getElementById('word-preview');
    if (preview) {
        preview.remove();
    }
    // Don't create or display word preview anymore
    return;
}

/**
 * Check if placed tiles form a straight line (horizontal or vertical, no gaps)
 * @returns {Object} { valid: boolean, message: string, invalidTiles: Array }
 */
function validateTilePlacement() {
    if (gameState.placedTiles.length === 0) {
        return { valid: true, message: '', invalidTiles: [] };
    }

    if (gameState.placedTiles.length === 1) {
        return { valid: true, message: '', invalidTiles: [] };
    }

    // Use placement order - first two tiles determine the row/column
    const firstTile = gameState.placedTiles[0];
    const secondTile = gameState.placedTiles[1];

    // Determine if we're going horizontal (same row) or vertical (same column)
    const isHorizontal = firstTile.row === secondTile.row;
    const isVertical = firstTile.col === secondTile.col;

    // If second tile is diagonal from first, both the direction is invalid
    if (!isHorizontal && !isVertical) {
        // Mark all tiles except the first as invalid (first establishes the base)
        const invalidTiles = gameState.placedTiles.slice(1).map(t => ({ row: t.row, col: t.col }));
        return { valid: false, message: 'Tiles placed each turn must be in one row/column', invalidTiles };
    }

    const invalidTiles = [];

    if (isHorizontal) {
        // All tiles must be in the same row as the first tile
        const targetRow = firstTile.row;
        const tilesInRow = gameState.placedTiles.filter(t => t.row === targetRow);

        // Mark tiles not in the target row as invalid
        gameState.placedTiles.forEach(t => {
            if (t.row !== targetRow) {
                invalidTiles.push({ row: t.row, col: t.col });
            }
        });

        if (invalidTiles.length > 0) {
            return { valid: false, message: 'Tiles placed each turn must be in one row/column', invalidTiles };
        }

        // Check for gaps in horizontal placement
        const cols = tilesInRow.map(t => t.col).sort((a, b) => a - b);
        const minCol = cols[0];
        const maxCol = cols[cols.length - 1];

        // Check each position between min and max for a tile (placed or existing)
        for (let col = minCol; col <= maxCol; col++) {
            const hasPlacedTile = tilesInRow.some(t => t.col === col);
            const hasExistingTile = gameState.board[targetRow][col] !== null;

            if (!hasPlacedTile && !hasExistingTile) {
                // There's a gap - mark all placed tiles as invalid
                return {
                    valid: false,
                    message: 'Tiles must form a continuous word without gaps',
                    invalidTiles: tilesInRow.map(t => ({ row: t.row, col: t.col }))
                };
            }
        }
    } else {
        // All tiles must be in the same column as the first tile
        const targetCol = firstTile.col;
        const tilesInCol = gameState.placedTiles.filter(t => t.col === targetCol);

        // Mark tiles not in the target column as invalid
        gameState.placedTiles.forEach(t => {
            if (t.col !== targetCol) {
                invalidTiles.push({ row: t.row, col: t.col });
            }
        });

        if (invalidTiles.length > 0) {
            return { valid: false, message: 'Tiles placed each turn must be in one row/column', invalidTiles };
        }

        // Check for gaps in vertical placement
        const rows = tilesInCol.map(t => t.row).sort((a, b) => a - b);
        const minRow = rows[0];
        const maxRow = rows[rows.length - 1];

        // Check each position between min and max for a tile (placed or existing)
        for (let row = minRow; row <= maxRow; row++) {
            const hasPlacedTile = tilesInCol.some(t => t.row === row);
            const hasExistingTile = gameState.board[row][targetCol] !== null;

            if (!hasPlacedTile && !hasExistingTile) {
                // There's a gap - mark all placed tiles as invalid
                return {
                    valid: false,
                    message: 'Tiles must form a continuous word without gaps',
                    invalidTiles: tilesInCol.map(t => ({ row: t.row, col: t.col }))
                };
            }
        }
    }

    // Check if tiles connect to existing board (skip on first turn)
    if (gameState.currentTurn > 1) {
        let hasConnection = false;

        for (const tile of gameState.placedTiles) {
            // Check all four adjacent cells
            const adjacentPositions = [
                { row: tile.row - 1, col: tile.col }, // above
                { row: tile.row + 1, col: tile.col }, // below
                { row: tile.row, col: tile.col - 1 }, // left
                { row: tile.row, col: tile.col + 1 }  // right
            ];

            for (const pos of adjacentPositions) {
                // Check bounds
                if (pos.row >= 0 && pos.row < gameState.board.length &&
                    pos.col >= 0 && pos.col < gameState.board[0].length) {
                    // Check if there's an existing tile (not placed this turn)
                    const hasExistingTile = gameState.board[pos.row][pos.col] !== null;
                    const isPlacedThisTurn = gameState.placedTiles.some(
                        t => t.row === pos.row && t.col === pos.col
                    );

                    if (hasExistingTile && !isPlacedThisTurn) {
                        hasConnection = true;
                        break;
                    }
                }
            }

            if (hasConnection) break;
        }

        if (!hasConnection) {
            return {
                valid: false,
                message: 'Word must connect to existing tiles',
                invalidTiles: gameState.placedTiles.map(t => ({ row: t.row, col: t.col }))
            };
        }
    }

    return { valid: true, message: '', invalidTiles: [] };
}

function updatePotentialWordsSidebar() {
    const potentialWordsDiv = document.getElementById('potential-words-list');

    // First check if tiles are in a valid straight line
    const placementValidation = validateTilePlacement();

    // Clear any existing invalid tile styling
    document.querySelectorAll('.board-cell.invalid-placement').forEach(cell => {
        cell.classList.remove('invalid-placement');
    });

    // Apply invalid-placement class to mark tiles with red letters (if any)
    if (!placementValidation.valid) {
        placementValidation.invalidTiles.forEach(({ row, col }) => {
            const cell = document.querySelector(`.board-cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('invalid-placement');
            }
        });
    }

    // Continue to show words even if placement is invalid
    const words = findFormedWords();
    console.log('[DEBUG] updatePotentialWordsSidebar called, words found:', words.length);

    // Single unified version for both desktop and mobile
    if (potentialWordsDiv) {
        if (words.length === 0) {
            potentialWordsDiv.innerHTML = '';
        } else {
            // Check validity of all words
            const wordStrings = words.map(w => w.word);
            if (wordStrings.length > 0) {
                fetch(`${API_BASE}/check_word.py?words=${encodeURIComponent(JSON.stringify(wordStrings))}`)
                    .then(response => {
                        // Check HTTP status before parsing JSON
                        if (!response.ok) {
                            throw new Error(`check_word_http_${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        let html = '';
                        let totalScore = 0;
                        let hasInvalidWords = false;

                        words.forEach(word => {
                            totalScore += word.score;
                            const isValid = data.results ? data.results[word.word] : true;
                            if (!isValid) hasInvalidWords = true;

                            html += `<span class="word-item ${isValid ? '' : 'invalid-word'}">
                                <span class="word-text">${word.word}</span>
                                <span class="word-score">${word.score}</span>
                            </span>`;
                        });

                        // Determine disabled state and message
                        let disabledClass = '';
                        let disabledReason = '';
                        let onclickHandler = 'submitWord()';
                        let disabledAttr = '';

                        if (!placementValidation.valid) {
                            // Invalid placement - show disabled but allow click for animation
                            disabledClass = ' disabled';
                            disabledReason = placementValidation.message;
                            onclickHandler = 'animateInvalidPlacementTiles()';
                            // Don't add disabled attribute - we want clicks to work
                        } else if (hasInvalidWords) {
                            // Invalid words - truly disable, no animation
                            disabledClass = ' disabled';
                            disabledReason = 'Invalid words present';
                            onclickHandler = '';
                            disabledAttr = 'disabled';
                        } else {
                            // Valid - enable with pulse
                            disabledClass = ' pulse-once';
                        }

                        // Make total score clickable as submit button
                        html += `<button class="total-score submit-score${disabledClass}"
                                 onclick="${onclickHandler}"
                                 title="${disabledReason || 'Submit Word'}"
                                 ${disabledAttr}>
                                 ${totalScore} pts ${disabledReason ? '✗' : '→'}
                                </button>`;
                        potentialWordsDiv.innerHTML = html;
                        console.log('[DEBUG] Set potential words HTML with validation:', html);
                    })
                    .catch(error => {
                        // Fallback: show words without validation on error
                        console.error('Error checking word validity:', error);

                        // Track error to analytics
                        let errorType = 'check_word_network_error';
                        if (error.message.startsWith('check_word_http_')) {
                            errorType = error.message;
                        } else if (error.name === 'SyntaxError') {
                            errorType = 'check_word_json_parse_error';
                        } else if (error.message) {
                            errorType = 'check_word_' + error.message.substring(0, 40);
                        }
                        Analytics.error(errorType, error.message, 'checkWordValidity', false);
                        let html = '';
                        let totalScore = 0;

                        words.forEach(word => {
                            totalScore += word.score;
                            html += `<span class="word-item">
                                <span class="word-text">${word.word}</span>
                                <span class="word-score">${word.score}</span>
                            </span>`;
                        });

                        // Still check placement validation in fallback
                        const isInvalidPlacement = !placementValidation.valid;
                        const disabledClass = isInvalidPlacement ? ' disabled' : ' pulse-once';
                        const onclickHandler = isInvalidPlacement ? 'animateInvalidPlacementTiles()' : 'submitWord()';
                        const titleText = isInvalidPlacement ? placementValidation.message : 'Submit Word';
                        // Don't add disabled attribute for invalid placement - we want clicks for animation
                        html += `<button class="total-score submit-score${disabledClass}"
                                 onclick="${onclickHandler}"
                                 title="${titleText}">${totalScore} pts ${isInvalidPlacement ? '✗' : '→'}</button>`;
                        potentialWordsDiv.innerHTML = html;
                    });
            }
        }
    }

    return;

    // This section is now handled above in the refactored function
}

function checkWordValidity() {
    // Show/hide buttons based on tile placement
    const hasTiles = gameState.placedTiles.length > 0;
    console.log('[DEBUG] checkWordValidity called, placedTiles:', gameState.placedTiles.length, 'hasTiles:', hasTiles);

    // Show/hide potential words container
    const potentialWords = document.getElementById('potential-words');
    if (potentialWords) {
        if (hasTiles) {
            potentialWords.classList.add('has-tiles');
            console.log('[DEBUG] Added has-tiles class to potential words');
        } else {
            potentialWords.classList.remove('has-tiles');
            console.log('[DEBUG] Removed has-tiles class from potential words');
        }
    }

    // Show recall button when tiles are placed
    const recallButton = document.getElementById('recall-tiles');
    if (recallButton) {
        if (hasTiles) {
            recallButton.style.display = 'flex';
            recallButton.style.opacity = '0';
            setTimeout(() => { recallButton.style.opacity = '1'; }, 10);
        } else {
            recallButton.style.opacity = '0';
            setTimeout(() => { recallButton.style.display = 'none'; }, 300);
        }
    }

    // Show/hide Start Over button based on game state
    const startOverBtn = document.getElementById('start-over');
    if (startOverBtn) {
        // Show only if score > 0 (meaning at least one word has been submitted)
        const shouldShow = gameState.score > 0;
        if (shouldShow) {
            startOverBtn.style.display = 'flex';
            startOverBtn.style.opacity = '0';
            setTimeout(() => { startOverBtn.style.opacity = '1'; }, 10);
        } else {
            startOverBtn.style.opacity = '0';
            setTimeout(() => { startOverBtn.style.display = 'none'; }, 300);
        }
    }

    // Update the potential words sidebar
    updatePotentialWordsSidebar();

    // Enable submit button (it's always enabled when visible)
    const submitBtn = document.getElementById('submit-word');
    if (submitBtn) {
        submitBtn.disabled = false;
    }
}

function shuffleRack() {
    // Don't allow shuffling after game ends
    if (gameState.isGameOver) return;

    // Track rack shuffled
    Analytics.ui.rackShuffled(gameState.currentTurn);

    const rackBoard = document.getElementById('tile-rack-board');
    const cells = Array.from(rackBoard.querySelectorAll('.rack-cell'));
    const tiles = cells.map(cell => cell.querySelector('.tile')).filter(tile => tile);

    // Fisher-Yates shuffle
    for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    // Clear cells and re-place tiles in new order
    cells.forEach(cell => cell.innerHTML = '');
    tiles.forEach((tile, index) => {
        if (cells[index]) {
            cells[index].appendChild(tile);
        }
    });

    // Update gameState to match new shuffled order
    const newRackOrder = tiles.map(tile => tile.dataset.letter);
    gameState.rackTiles = newRackOrder;

    // Save updated state to localStorage
    saveGameState();

    // Visual feedback
    tiles.forEach(tile => {
        tile.style.animation = 'shuffle-animation 0.3s ease';
        setTimeout(() => {
            tile.style.animation = '';
        }, 300);
    });
}

function recallTiles() {
    // Don't allow recalling tiles after game ends
    if (gameState.isGameOver) return;

    // Track tiles recalled
    Analytics.ui.tilesRecalled(gameState.currentTurn, gameState.placedTiles.length);

    gameState.placedTiles.forEach(({ row, col, letter }) => {
        // Clear from board
        gameState.board[row][col] = null;
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.innerHTML = '';
        cell.classList.remove('occupied', 'placed-this-turn');

        // Restore multiplier text if this is a special square
        restoreMultiplierText(cell, row, col);

        // Add back to rackTiles array
        gameState.rackTiles.push(letter);

        // Create new tile for rack
        const newTile = document.createElement('div');
        newTile.className = 'tile';
        newTile.dataset.letter = letter;
        const letterSpan = document.createElement('span');
        letterSpan.className = 'tile-letter';
        letterSpan.textContent = letter;

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'tile-value';
        scoreSpan.textContent = TILE_SCORES[letter] || 0;

        newTile.appendChild(letterSpan);
        newTile.appendChild(scoreSpan);

        // Add event listener
        newTile.addEventListener('click', handleTileClick);

        // Return to rack
        const rackBoard = document.getElementById('tile-rack-board');
        const firstEmptyCell = Array.from(rackBoard.querySelectorAll('.rack-cell'))
            .find(cell => !cell.querySelector('.tile'));
        if (firstEmptyCell) {
            firstEmptyCell.appendChild(newTile);
        }
    });

    gameState.placedTiles = [];
    checkWordValidity();  // This will also update the potential words sidebar
    saveGameState();
    updateWordPreview();
}

function submitWord() {
    // Don't allow submitting words after game ends
    if (gameState.isGameOver) return;

    // Prevent double submission
    if (gameState.isSubmitting) {
        console.log('[Submit] Already submitting, ignoring duplicate request');
        return;
    }

    // Note: Placement validation (straight line, gaps, connectivity) is now handled
    // client-side by validateTilePlacement() which prevents the submit button from
    // calling this function unless validation passes. Server-side validation below
    // provides security against console manipulation.

    // Set submission lock
    gameState.isSubmitting = true;

    // Validate word on server
    const placedWord = gameState.placedTiles.map(p => ({
        row: p.row,
        col: p.col,
        letter: p.letter
    }));

    fetch(`${API_BASE}/validate_word.py`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            seed: gameState.seed,
            board: gameState.board,
            placed_tiles: placedWord,
            debug_mode: gameState.debugMode
        })
    })
    .then(response => {
        // Check HTTP status before parsing JSON
        if (!response.ok) {
            const errorType = `validation_http_${response.status}`;
            throw new Error(errorType);
        }
        return response.json();
    })
    .then(data => {
        if (data.valid) {
            // Backend already includes +50 bingo bonus if 7 tiles used
            let turnScore = data.score;

            // Track word submitted - calculate metrics for analytics
            const wordLength = data.total_word_length || placedWord.length;
            const hasMultiplier = checkIfHasMultiplier(placedWord);
            const crossesStart = checkIfCrossesStartingWord(placedWord);

            Analytics.word.submitted(
                gameState.currentTurn,
                wordLength,
                placedWord.length,
                turnScore,
                hasMultiplier,
                crossesStart
            );

            // Update score
            gameState.score += turnScore;
            gameState.turnScores.push(turnScore);  // Save this turn's score

            // Note: Tiles have already been removed from rackTiles when placed on board
            // so gameState.rackTiles already contains only the tiles left in the rack

            // No need to update totalTilesDrawn here - it's updated in nextTurn

            // Save turn to history
            gameState.turnHistory.push({
                tiles: placedWord,
                score: turnScore,
                bingo: placedWord.length === 7,
                originalRack: gameState.turnStartRack || []  // Cache original rack from turn START (before shuffle/placement)
            });

            // Clear placed tiles tracking
            document.querySelectorAll('.placed-this-turn').forEach(cell => {
                cell.classList.remove('placed-this-turn');
            });
            gameState.placedTiles = [];

            // Clear the potential words display
            updatePotentialWordsSidebar();

            // Update UI including hiding recall button
            checkWordValidity();

            // Move to next turn
            nextTurn();

            // Clear submission lock after successful submission
            gameState.isSubmitting = false;
        } else {
            // Clear submission lock on validation failure
            gameState.isSubmitting = false;

            // Don't show error if game is already over
            if (!gameState.isGameOver) {
                // Track validation failure
                const reason = classifyValidationError(data.message || 'Invalid word placement');
                Analytics.word.validationFailed(
                    gameState.currentTurn,
                    reason,
                    placedWord.length
                );

                showError(data.message || 'Invalid word placement');
            }
        }
    })
    .catch(error => {
        // Clear submission lock on network error
        gameState.isSubmitting = false;

        // Don't show error if game is already over
        if (!gameState.isGameOver) {
            // More specific error categorization
            let errorType = 'validation_network_error';
            if (error.message.startsWith('validation_http_')) {
                errorType = error.message; // Use HTTP status code
            } else if (error.name === 'SyntaxError') {
                errorType = 'validation_json_parse_error';
            } else if (error.message) {
                errorType = 'validation_' + error.message.substring(0, 40);
            }
            Analytics.error(errorType, error.message, 'submitWord', false);
            showError('Failed to validate word');
        }
        console.error('Error validating word:', error);
    });
}

// Helper functions for analytics tracking

function checkIfHasMultiplier(placedTiles) {
    // Check if any placed tile is on a multiplier square
    for (const tile of placedTiles) {
        const row = tile.row;
        const col = tile.col;

        // Check if this position has any multiplier
        if (MULTIPLIERS.tripleWord.some(([r, c]) => r === row && c === col)) return true;
        if (MULTIPLIERS.doubleWord.some(([r, c]) => r === row && c === col)) return true;
        if (MULTIPLIERS.tripleLetter.some(([r, c]) => r === row && c === col)) return true;
        if (MULTIPLIERS.doubleLetter.some(([r, c]) => r === row && c === col)) return true;
    }
    return false;
}

function checkIfCrossesStartingWord(placedTiles) {
    // Check if any placed tile is in the same row as center position (where starting word is)
    const centerRow = CENTER_POSITION;
    return placedTiles.some(tile => tile.row === centerRow);
}

function classifyValidationError(errorMessage) {
    const msg = errorMessage.toLowerCase();
    if (msg.includes('dictionary') || msg.includes('not a valid word')) return 'not_in_dictionary';
    if (msg.includes('connect') || msg.includes('adjacent')) return 'disconnected';
    if (msg.includes('placement')) return 'invalid_placement';
    if (msg.includes('tiles')) return 'too_many_tiles';
    return 'other';
}

function nextTurn() {
    gameState.currentTurn++;

    // Update the footer squares before checking if game is over
    // This ensures the 5th turn's score is displayed
    updateFooterSquares();

    if (gameState.currentTurn > gameState.maxTurns) {
        endGame();
        return;
    }

    updateTurnCounter();

    // Get new tiles for next turn, passing current rack tiles and total tiles drawn
    const params = new URLSearchParams({
        seed: gameState.seed,
        turn: gameState.currentTurn,
        rack_tiles: JSON.stringify(gameState.rackTiles),
        tiles_drawn: gameState.totalTilesDrawn
    });

    fetch(`${API_BASE}/letters.py?${params.toString()}`)
        .then(response => {
            // Check HTTP status before parsing JSON
            if (!response.ok) {
                throw new Error(`next_turn_http_${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            gameState.tiles = data.tiles;
            // Update total tiles drawn (add the new tiles we just got)
            const newTilesCount = data.tiles.length - gameState.rackTiles.length;
            gameState.totalTilesDrawn += newTilesCount;

            // Save original rack at turn START (before shuffle/placement)
            // This prevents corruption when user shuffles after placing tiles
            gameState.turnStartRack = [...data.tiles];

            displayTiles(data.tiles);
            saveGameState();
        })
        .catch(error => {
            // Track error to analytics
            let errorType = 'next_turn_network_error';
            if (error.message.startsWith('next_turn_http_')) {
                errorType = error.message;
            } else if (error.name === 'SyntaxError') {
                errorType = 'next_turn_json_parse_error';
            } else if (error.message) {
                errorType = 'next_turn_' + error.message.substring(0, 40);
            }
            Analytics.error(errorType, error.message, 'nextTurn', false);

            showError('Failed to get tiles for next turn');
            console.error('Error fetching tiles:', error);
        });
}

async function endGame() {
    gameState.isGameOver = true;

    // Ensure the total score is properly calculated
    let totalScore = 0;
    if (gameState.turnScores && gameState.turnScores.length > 0) {
        totalScore = gameState.turnScores.reduce((sum, score) => sum + score, 0);
        gameState.score = totalScore; // Ensure gameState.score is accurate
    }

    saveGameState();

    // Mark that player has completed today's game (persists through Start Over)
    if (gameState.seed === getTodaysSeed()) {
        localStorage.setItem('letters_completed_today', gameState.seed);
    }

    // Disable game controls
    const submitBtn = document.getElementById('submit-word');
    const recallBtn = document.getElementById('recall-tiles');
    if (submitBtn) submitBtn.disabled = true;
    if (recallBtn) recallBtn.disabled = true;

    // Keep game container visible (Phase 1 change)
    // document.getElementById('game-container').style.display = 'none';

    // Don't show the old game over section (Phase 1 change)
    // document.getElementById('game-over-section').style.display = 'block';

    // Update footer squares one more time to ensure everything is displayed correctly
    updateFooterSquares();

    // Add visual indicator that game is over
    const gameBoard = document.getElementById('game-board');
    const rackBoard = document.getElementById('tile-rack-board');
    if (gameBoard) gameBoard.classList.add('game-over');
    if (rackBoard) rackBoard.classList.add('game-over');
    if (rackBoard) rackBoard.classList.add('game-over');

    // Phase 1: Show share icon (like WikiDates)
    const shareIcon = document.getElementById('shareIcon');
    if (shareIcon) {
        shareIcon.classList.remove('hidden');
    }

    // Track game completion
    const totalWords = gameState.turnHistory.filter(turn => turn && turn.tiles && turn.tiles.length > 0).length;
    const totalTiles = gameState.turnHistory.reduce((sum, turn) => {
        return sum + (turn && turn.tiles ? turn.tiles.length : 0);
    }, 0);
    const duration = gameState.gameStartTime ? Date.now() - gameState.gameStartTime : 0;

    Analytics.game.completed(
        gameState.score,
        gameState.turnScores,
        totalWords,
        totalTiles,
        duration,
        gameState.startingWord || 'unknown'
    );

    // Pre-generate shareable URL (needed for high score submission)
    await generateShareableBoardURL();

    // Update subtitle to show high score (since player just completed today's game)
    await updateSubtitleWithHighScore();

    // Show popup with high score check
    await showBasicPopupWithHighScore();
}

// New function for Phase 1: Show basic popup
function showBasicPopup() {
    const popup = document.getElementById('game-popup');
    const scoreElement = document.getElementById('popup-score-value');
    const titleElement = document.getElementById('popup-title');
    const score = gameState.score || 0;

    // Phase 2: Set dynamic title based on score
    const scoreTitle = getScoreTitle(score);
    if (titleElement) {
        titleElement.textContent = scoreTitle;
    }

    // Set the score
    if (scoreElement) {
        scoreElement.textContent = score;
    }

    // Track popup shown
    Analytics.ui.popupShown(score, scoreTitle);

    // Show the popup
    if (popup) {
        popup.classList.remove('hidden');
    }
}

// Phase 2: Get score-based title
function getScoreTitle(score) {
    if (score >= 160) return "Legendary!";
    if (score >= 140) return "Phenomenal!";
    if (score >= 120) return "Incredible!";
    if (score >= 100) return "Outstanding!";
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Great Work";
    if (score >= 40) return "Good Job";
    if (score >= 20) return "Nice Try";
    return "Game Complete";
}

// High Score Functions
async function fetchHighScore(date) {
    // Fetch the current high score for a date
    Analytics.highScore.fetchStarted(date);

    try {
        const response = await fetch(`${API_BASE}/get_high_score.py?date=${date}`);

        // Check HTTP status first
        if (!response.ok) {
            const errorType = `http_${response.status}`;
            console.error(`Failed to fetch high score: HTTP ${response.status}`);
            Analytics.highScore.fetchFailed(date, errorType);
            return null;
        }

        const data = await response.json();

        if (data.success && data.score !== null) {
            Analytics.highScore.fetchSuccess(date, data.score, gameState.score);
            return data;
        }
        return null;
    } catch (error) {
        console.error('Failed to fetch high score:', error);
        // More specific error types
        let errorType = 'network_error';
        if (error.name === 'SyntaxError') {
            errorType = 'json_parse_error';
        } else if (error.message) {
            errorType = error.message.substring(0, 50); // Limit length
        }
        Analytics.highScore.fetchFailed(date, errorType);
        return null;
    }
}

async function submitHighScore(date, score, boardUrl) {
    // Submit a high score
    Analytics.highScore.submissionStarted(date, score);

    try {
        const response = await fetch(`${API_BASE}/submit_high_score.py`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: date,
                score: score,
                board_url: boardUrl
            })
        });

        // Check HTTP status first
        if (!response.ok) {
            const errorType = `http_${response.status}`;
            console.error(`Failed to submit high score: HTTP ${response.status}`);
            Analytics.highScore.submissionFailed(date, score, errorType);
            return { success: false, error: errorType };
        }

        const data = await response.json();

        if (data.success) {
            Analytics.highScore.submissionSuccess(
                date,
                score,
                data.is_new_high_score,
                data.previous_score
            );
        } else {
            Analytics.highScore.submissionFailed(date, score, data.error || 'unknown_error');
        }

        return data;
    } catch (error) {
        console.error('Failed to submit high score:', error);
        // More specific error types
        let errorType = 'network_error';
        if (error.name === 'SyntaxError') {
            errorType = 'json_parse_error';
        } else if (error.message) {
            errorType = error.message.substring(0, 50);
        }
        Analytics.highScore.submissionFailed(date, score, errorType);
        return { success: false, error: errorType };
    }
}

// Helper function to format high score label with date
function formatHighScoreLabel(dateStr) {
    // dateStr is in format YYYYMMDD
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);

    const scoreDate = new Date(year, month - 1, day);
    const today = new Date();

    // Normalize to midnight for comparison
    today.setHours(0, 0, 0, 0);
    scoreDate.setHours(0, 0, 0, 0);

    if (scoreDate.getTime() === today.getTime()) {
        return "Today's High Score:";
    } else {
        // Format as "Month Day" (e.g., "October 9")
        const monthNames = ["January", "February", "March", "April", "May", "June",
                           "July", "August", "September", "October", "November", "December"];
        return `${monthNames[scoreDate.getMonth()]} ${scoreDate.getDate()} High Score:`;
    }
}

async function showBasicPopupWithHighScore() {
    // Show popup with high score integration
    const score = gameState.score || 0;
    const date = gameState.seed;

    console.log('[High Score] showBasicPopupWithHighScore called');
    console.log('[High Score] Your score:', score);
    console.log('[High Score] Date:', date);
    console.log('[High Score] preGeneratedShareURL:', gameState.preGeneratedShareURL);

    // Use the full share URL (contains ?g= or ?w= parameter)
    const boardUrl = gameState.preGeneratedShareURL || '';
    if (boardUrl) {
        console.log('[High Score] Board URL:', boardUrl.substring(0, 80) + '...');
    } else {
        console.log('[High Score] No preGeneratedShareURL available');
    }

    // Fetch current high score
    console.log('[High Score] Fetching current high score for date:', date);
    const highScoreData = await fetchHighScore(date);
    console.log('[High Score] Fetch result:', highScoreData);

    // Show the basic popup first
    showBasicPopup();

    // Update high score section
    const highScoreSection = document.getElementById('popup-high-score-section');
    const highScoreLink = document.getElementById('high-score-link');
    const highScoreLabel = document.getElementById('high-score-label');
    const highScoreAchievement = document.getElementById('high-score-achievement');

    if (highScoreData && highScoreData.score) {
        // High score exists, show it
        console.log('[High Score] Existing high score found:', highScoreData.score);

        // Update the label with date
        if (highScoreLabel) {
            highScoreLabel.textContent = formatHighScoreLabel(highScoreData.date);
        }

        if (highScoreLink) {
            highScoreLink.textContent = highScoreData.score;
            highScoreLink.onclick = (e) => {
                e.preventDefault();
                // Track high score link clicked
                Analytics.highScore.linkClicked(highScoreData.score, score);
                // Load the high score board (board_url is now full URL with ?g= or ?w=)
                window.location.href = highScoreData.board_url;
            };
        }

        if (highScoreSection) {
            console.log('[High Score] Showing high score section');
            highScoreSection.style.display = 'block';
        }

        // Check if user beat the high score
        console.log('[High Score] Checking if you beat it. Your score:', score, 'vs High score:', highScoreData.score, 'Has boardUrl?', !!boardUrl);
        if (score > highScoreData.score && boardUrl) {
            // Submit new high score (only if we have a valid compressed board URL)
            console.log('[High Score] Submitting new high score:', score);
            const result = await submitHighScore(date, score, boardUrl);
            console.log('[High Score] Submit result:', result);

            if (result.success && result.is_new_high_score) {
                // Track that player got high score (for share text)
                gameState.isNewHighScore = true;

                // Show achievement
                if (highScoreAchievement) {
                    const previousScore = result.previous_score;
                    if (previousScore) {
                        highScoreAchievement.innerHTML = `🏆 You got the new high score!<br><small>Previous: ${previousScore}</small>`;
                    } else {
                        highScoreAchievement.innerHTML = '🏆 First high score of the day!';
                    }
                    highScoreAchievement.style.display = 'block';

                    // Track achievement shown
                    Analytics.highScore.achievementShown(score, previousScore);
                }

                // Update the displayed high score
                if (highScoreLabel) {
                    highScoreLabel.textContent = formatHighScoreLabel(date);
                }

                if (highScoreLink) {
                    highScoreLink.textContent = score;
                    highScoreLink.onclick = (e) => {
                        e.preventDefault();
                        // Track high score link clicked
                        Analytics.highScore.linkClicked(score, score);
                        // Load current board (it's the new high score, boardUrl is full URL)
                        window.location.href = boardUrl;
                    };
                }
            }
        }
    } else if (boardUrl) {
        // No high score exists yet, submit this one (only if we have a valid compressed board URL)
        console.log('[High Score] No existing high score, submitting first score:', score);
        const result = await submitHighScore(date, score, boardUrl);
        console.log('[High Score] Submit result:', result);

        if (result.success && result.is_new_high_score) {
            // Track that player got high score (for share text)
            gameState.isNewHighScore = true;

            // Show achievement for first score
            if (highScoreAchievement) {
                highScoreAchievement.innerHTML = '🏆 You got the high score!';
                highScoreAchievement.style.display = 'block';

                // Track achievement shown (first score of the day)
                Analytics.highScore.achievementShown(score, null);
            }

            // Show the high score section
            if (highScoreLabel) {
                highScoreLabel.textContent = formatHighScoreLabel(date);
            }

            if (highScoreLink) {
                highScoreLink.textContent = score;
                highScoreLink.onclick = (e) => {
                    e.preventDefault();
                    // Track high score link clicked
                    Analytics.highScore.linkClicked(score, score);
                    // boardUrl is full URL with ?g= or ?w= parameter
                    window.location.href = boardUrl;
                };
            }

            if (highScoreSection) {
                console.log('[High Score] Showing high score section (first score)');
                highScoreSection.style.display = 'block';
            }
        }
    } else {
        console.log('[High Score] Not submitting - no boardUrl available');
    }
}

// Debug function for testing popup with different scores
function testPopup(score = null) {
    // Allow testing different score ranges
    if (score !== null) {
        gameState.score = score;
    }

    // Set some dummy turn scores for the feedback squares
    gameState.turnScores = [
        Math.floor(score * 0.15),
        Math.floor(score * 0.20),
        Math.floor(score * 0.25),
        Math.floor(score * 0.20),
        Math.floor(score * 0.20)
    ];

    // Simulate game end
    gameState.isGameOver = true;
    gameState.currentTurn = 5;

    // Update footer to show complete state
    updateFooterSquares();

    // Show the popup
    showBasicPopup();

    console.log(`Testing popup with score: ${gameState.score}`);
    console.log(`Title should be: ${getScoreTitle(gameState.score)}`);

    return `Popup shown with score ${score} - Title: ${getScoreTitle(score)}`;
}

function showGameFooter() {
    // This function references game-footer which doesn't exist in HTML
    // The actual footer is handled by updateFooterSquares()
    // Keeping this function for compatibility but it won't do anything
    const footer = document.getElementById('game-footer');
    if (!footer) {
        console.log('game-footer element not found, using regular footer instead');
        return;
    }

    footer.style.display = 'block';

    // Update feedback squares based on turn scores
    const squares = footer.querySelectorAll('.feedback-square');
    gameState.turnHistory.forEach((turn, i) => {
        if (i < squares.length && turn && turn.score) {
            const square = squares[i];
            if (turn.score >= 60) {
                square.classList.add('correct');
            } else if (turn.score >= 30) {
                square.classList.add('close');
            } else {
                square.classList.add('wrong');
            }
        }
    });

    // Add share button handler
    const footerShare = document.getElementById('footer-share');
    if (footerShare) {
        footerShare.addEventListener('click', shareGame);
    }
}

function checkPlayStatus() {
    // Check if player has already played today using browser fingerprinting
    const playerId = getPlayerId();

    fetch(`${API_BASE}/check_play.py?seed=${gameState.seed}&player=${playerId}`)
        .then(response => response.json())
        .then(data => {
            if (data.has_played) {
                // Show previous score and high scores only
                gameState.isGameOver = true;
                gameState.hasSubmittedScore = true;
                document.getElementById('game-container').style.display = 'none';
                document.getElementById('game-over-section').style.display = 'block';
                document.getElementById('final-score-display').textContent = data.previous_score;
                document.getElementById('score-submission').style.display = 'none';
                loadHighScores();
            }
        })
        .catch(error => {
            console.error('Error checking play status:', error);
        });
}

function getPlayerId() {
    // Simple browser fingerprinting for anonymous play tracking
    const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset()
    ].join('|');

    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    return Math.abs(hash).toString(16);
}

function submitScore() {
    let playerName = document.getElementById('player-name').value.trim().toUpperCase();

    // Default to AAA if empty
    if (!playerName) {
        playerName = 'AAA';
    }

    // Ensure exactly 3 characters (arcade style)
    if (playerName.length < 3) {
        playerName = playerName.padEnd(3, 'A');
    } else if (playerName.length > 3) {
        playerName = playerName.substring(0, 3);
    }

    // Submit score to server
    fetch(`${API_BASE}/submit_score.py`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            date: gameState.seed,
            name: playerName,
            score: gameState.score
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            gameState.hasSubmittedScore = true;
            document.getElementById('score-submission').style.display = 'none';
            loadHighScores();
        } else {
            showError(data.message || 'Failed to submit score');
        }
    })
    .catch(error => {
        showError('Failed to submit score');
        console.error('Error submitting score:', error);
    });
}

function loadHighScores() {
    document.getElementById('high-scores-section').style.display = 'block';

    fetch(`${API_BASE}/get_scores.py?date=${gameState.seed}`)
        .then(response => response.json())
        .then(data => {
            displayHighScores(data.scores);
        })
        .catch(error => {
            console.error('Error loading high scores:', error);
        });
}

function displayHighScores(scores) {
    const listElement = document.getElementById('high-scores-list');
    listElement.innerHTML = '';

    scores.forEach((score, index) => {
        const entry = document.createElement('div');
        entry.className = 'score-entry';
        entry.innerHTML = `
            <span class="score-rank">#${index + 1}</span>
            <span class="score-name">${score.name}</span>
            <span class="score-value">${score.score}</span>
        `;
        listElement.appendChild(entry);
    });
}

function startOver() {
    // Confirm with the user
    if (confirm('Start over? This will reset your current game.')) {
        // Track start over
        Analytics.navigation.startOver(gameState.currentTurn, gameState.score);

        // Preserve completion status for today before clearing
        if (gameState.isGameOver && gameState.seed === getTodaysSeed()) {
            localStorage.setItem('letters_completed_today', gameState.seed);
        }

        // Clear the saved game state
        localStorage.removeItem('letters_game_state');

        // Reset game state but keep the seed and starting word
        const seed = gameState.seed;
        const dateStr = gameState.dateStr;
        const startingWord = gameState.startingWord;

        // Reset all game variables
        gameState = {
            board: [],
            tiles: [],
            turnScores: [],
            currentTurn: 1,
            maxTurns: 5,
            score: 0,
            seed: seed,
            dateStr: dateStr,
            startingWord: startingWord,
            placedTiles: [],
            isSubmitting: false,  // Reset submission lock
            turnHistory: [],
            isGameOver: false,
            hasSubmittedScore: false,
            debugMode: gameState.debugMode, // Preserve debug mode if active
            rackTiles: [],
            totalTilesDrawn: 7
        };

        // Reload the page to start fresh
        window.location.reload();
    }
}

/**
 * Build minimal game data object for sharing
 * @returns {Object} Game data optimized for compression
 */
/**
 * Wait for LZ-String library to be loaded
 * @param {number} maxWaitMs - Maximum time to wait in milliseconds
 * @returns {Promise<boolean>} True if loaded, false if timeout
 */
function waitForLZString(maxWaitMs = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const checkInterval = 50; // Check every 50ms

        const checkLibrary = () => {
            if (typeof LZString !== 'undefined') {
                console.log('[Load] LZ-String loaded after', Date.now() - startTime, 'ms');
                resolve(true);
            } else if (Date.now() - startTime >= maxWaitMs) {
                console.error('[Load] LZ-String failed to load within', maxWaitMs, 'ms');
                resolve(false);
            } else {
                setTimeout(checkLibrary, checkInterval);
            }
        };

        checkLibrary();
    });
}

/**
 * Load and display a shared game from compressed URL parameter
 * @param {string} compressedParam - The ?g= parameter value (compressed game data)
 */
async function loadSharedGame(compressedParam) {
    const startTime = Date.now();

    try {
        console.log('[Load] Compressed data length:', compressedParam.length);

        // Wait for LZ-String library to be available
        const isLoaded = await waitForLZString();
        if (!isLoaded) {
            throw new Error('LZ-String library not loaded');
        }

        // Decompress game data
        const decompressed = LZString.decompressFromEncodedURIComponent(compressedParam);
        if (!decompressed) {
            throw new Error('Failed to decompress game data');
        }

        const gameData = JSON.parse(decompressed);
        console.log('[Load] Game data:', gameData);

        // Validate game data structure
        validateSharedGameData(gameData);

        // Set game state for shared game (date now comes from game data)
        gameState.seed = gameData.d;
        gameState.dateStr = formatSeedToDate(gameData.d);
        gameState.startingWord = gameData.w;
        gameState.turnScores = gameData.s;
        gameState.score = gameData.s.reduce((sum, score) => sum + score, 0);
        gameState.isGameOver = true; // Shared games are always complete
        gameState.currentTurn = 6; // Beyond max turns

        console.log('[Load] Date:', gameData.d);

        // Update UI
        document.getElementById('dateDisplay').textContent = gameState.dateStr;

        // Initialize boards
        createBoard();
        createRackBoard();

        // Render the shared board
        renderSharedBoard(gameData);

        // Don't show share icon - this is someone else's board

        // Track shared game loaded
        const tileCount = gameData.t ? gameData.t.length : 0;
        const duration = Date.now() - startTime;
        Analytics.navigation.sharedGameLoaded('lz_string', tileCount, gameState.score, duration);

        console.log('[Load] Shared game loaded successfully (popup hidden - board view only)');

    } catch (err) {
        console.error('[Load] Failed to load shared game:', err);
        Analytics.error('shared_game_load_error', err.message, 'loadSharedGame', false);

        showError(`Invalid share link: ${err.message}. Redirecting to today's game...`);

        // Redirect to today's game after error
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
    }
}

/**
 * Validate shared game data structure
 */
function validateSharedGameData(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid data type');
    }

    if (!/^\d{8}$/.test(data.d)) {
        throw new Error('Invalid date format');
    }

    if (typeof data.w !== 'string' || data.w.length < 3 || data.w.length > 15) {
        throw new Error('Invalid starting word');
    }

    if (!Array.isArray(data.t)) {
        throw new Error('Invalid tiles array');
    }

    if (!Array.isArray(data.s) || data.s.length !== 5) {
        throw new Error('Invalid scores array');
    }

    // Validate each tile
    data.t.forEach((tile, index) => {
        if (!Array.isArray(tile) || tile.length !== 5) {
            throw new Error(`Invalid tile format at index ${index}`);
        }
        const [row, col, letter, turn, blank] = tile;
        if (row < 0 || row >= 9 || col < 0 || col >= 9) {
            throw new Error(`Tile position out of bounds at index ${index}`);
        }
        if (!/^[A-Z]$/.test(letter)) {
            throw new Error(`Invalid letter at index ${index}`);
        }
        if (turn < 1 || turn > 5) {
            throw new Error(`Invalid turn number at index ${index}`);
        }
    });

    console.log('[Load] Validation passed');
}

/**
 * Render a shared game board from decompressed data
 */
function renderSharedBoard(gameData) {
    const boardElement = document.getElementById('game-board');

    // Place starting word
    placeStartingWord(gameData.w);

    // Build turnHistory for click handlers to work
    // Initialize turnHistory array with 5 empty turns
    gameState.turnHistory = Array.from({ length: 5 }, () => ({ tiles: [], score: 0 }));

    // Group tiles by turn
    gameData.t.forEach(([row, col, letter, turn, blank]) => {
        const turnIndex = turn - 1; // turn is 1-based, array is 0-based
        if (turnIndex >= 0 && turnIndex < 5) {
            gameState.turnHistory[turnIndex].tiles.push({ row, col, letter });
            gameState.turnHistory[turnIndex].score = gameData.s[turnIndex] || 0;
        }
    });

    // Place all tiles from the shared game
    gameData.t.forEach(([row, col, letter, turn, blank]) => {
        gameState.board[row][col] = letter;

        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (!cell) return;

        // Create tile element
        const tileDiv = document.createElement('div');
        tileDiv.className = 'tile placed';
        tileDiv.dataset.turn = turn;

        const letterSpan = document.createElement('span');
        letterSpan.className = 'tile-letter';
        letterSpan.textContent = letter;

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'tile-value';
        scoreSpan.textContent = TILE_SCORES[letter] || 0;

        tileDiv.appendChild(letterSpan);
        tileDiv.appendChild(scoreSpan);

        // Clear cell and add tile
        cell.innerHTML = '';
        cell.appendChild(tileDiv);
        cell.classList.add('occupied');
    });

    // Update footer squares with scores
    updateFooterSquares();

    // Hide rack since this is view-only
    const rackContainer = document.getElementById('tile-rack-container');
    if (rackContainer) {
        rackContainer.style.display = 'none';
    }

    // Add "Play This Date" button in the potential words area
    const potentialWords = document.getElementById('potential-words');
    const potentialWordsList = document.getElementById('potential-words-list');
    if (potentialWords && potentialWordsList) {
        const dateText = gameState.dateStr.split(' ').slice(0, 2).join(' '); // e.g., "October 5"
        potentialWordsList.innerHTML = `
            <button class="total-score play-this-date-btn" onclick="playThisDate()">
                Clear the board and play ${dateText} WikiLetters →
            </button>
        `;
        // Show the potential words area
        potentialWords.classList.add('has-tiles');
        potentialWords.style.display = 'flex';
    }

    console.log('[Load] Board rendered with', gameData.t.length, 'tiles');
    console.log('[Load] Turn history rebuilt for', gameState.turnHistory.filter(t => t.tiles.length > 0).length, 'turns');
}

/**
 * Clear shared board view and load the playable game for this date
 */
function playThisDate() {
    if (!gameState.seed) {
        console.error('[Play] No seed available');
        return;
    }

    console.log('[Play] Clearing shared game, loading playable game for', gameState.seed);

    // Clear local storage (any saved progress)
    localStorage.removeItem('letters_game_state');

    // Redirect to the game with just the seed parameter (playable mode)
    // Use replace() to ensure proper reload without browser history entry
    window.location.replace(`/?seed=${gameState.seed}`);
}

function buildShareableGameData() {
    const gameData = {
        d: gameState.seed,          // Date seed (YYYYMMDD)
        w: gameState.startingWord,  // Starting word
        t: [],  // Tiles array
        s: gameState.turnScores     // Scores per turn
    };

    // Flatten turn history into single tile array
    // Format: [row, col, letter, turn, blank]
    gameState.turnHistory.forEach((turn, turnIndex) => {
        if (turn && turn.tiles) {
            turn.tiles.forEach(tile => {
                gameData.t.push([
                    tile.row,
                    tile.col,
                    tile.letter,
                    turnIndex + 1,  // Turn number (1-5)
                    0  // Blank flag (0 = normal tile, 1 = blank - for future use)
                ]);
            });
        }
    });

    return gameData;
}

/**
 * Generate shareable URL with compressed game state
 * @returns {Promise<string|null>} Full shareable URL or null if compression fails
 */
async function generateShareableURL() {
    // Wait for LZ-String library to be available
    const isLoaded = await waitForLZString();
    if (!isLoaded) {
        console.error('LZ-String library not loaded');
        return null;
    }

    try {
        // Build minimal data object
        const gameData = buildShareableGameData();

        // Compress to URL-safe string
        const compressed = LZString.compressToEncodedURIComponent(
            JSON.stringify(gameData)
        );

        // Check if compression succeeded
        if (!compressed) {
            console.error('Compression returned null or empty string');
            return null;
        }

        // Build full URL with ?w= parameter (consistent with V3 encoder)
        const url = `https://letters.wiki/?w=${compressed}`;

        console.log('[Share] Generated URL:', url);
        console.log('[Share] URL length:', url.length);

        return url;

    } catch (err) {
        console.error('Failed to generate shareable URL:', err);
        return null;
    }
}

function shareGame() {
    // Generate color tiles based on turn scores
    const tiles = gameState.turnHistory.map(turn => {
        if (!turn || !turn.score) return '⬜';  // Empty if no score

        // Match the color coding from feedback squares
        if (turn.score >= 50) return '🟪';  // 50+ points - purple (amazing)
        if (turn.score >= 40) return '🟥';  // 40-49 points - red (excellent)
        if (turn.score >= 30) return '🟧';  // 30-39 points - orange (great)
        if (turn.score >= 20) return '🟨';  // 20-29 points - yellow/gold (good)
        if (turn.score >= 11) return '🟩';  // 11-19 points - green (medium)
        return '🟦';  // 1-10 points - blue (low)
    });

    // Pad with white squares if less than 5 turns
    while (tiles.length < 5) {
        tiles.push('⬜');
    }

    // Format date for sharing - "September 29" without year
    const dateParts = gameState.dateStr.split(' ');
    const monthAndDay = dateParts.slice(0, 2).join(' ');  // "September 29"

    // Share Score: Simple seed-only URL (links to today's game)
    // Add "!" after score if player got the high score
    const scoreText = gameState.isNewHighScore ? `${gameState.score}!` : gameState.score;
    const shareText = `WikiLetters for ${monthAndDay}:
${tiles.join('')} (${scoreText})
https://letters.wiki/?seed=${gameState.seed}`;

    // Get the button that was clicked (could be popup or footer share button)
    const shareBtn = document.getElementById('share-popup-btn') || document.getElementById('shareIcon');

    // Track share score clicked
    Analytics.shareScore.clicked(gameState.score);

    // Just use clipboard copy like WikiDates - no native share
    copyToClipboardWithFeedback(shareText, shareBtn);
}

// Pre-generate shareable board URL (called at game end for instant copying)
async function generateShareableBoardURL() {
    const startTime = Date.now();
    let shareURL = `https://letters.wiki/?seed=${gameState.seed}`;

    // Count tiles for analytics
    const tileCount = gameState.turnHistory.reduce((sum, turn) => {
        return sum + (turn && turn.tiles ? turn.tiles.length : 0);
    }, 0);

    let method = 'seed_only';
    let fallbackReason = 'none';

    try {
        // Try V3 encoding with 5-second timeout (sequential fetching needs more time)
        const v3URL = await Promise.race([
            encodeV3URL(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('V3 encoding timeout after 5 seconds')), 5000)
            )
        ]);

        if (v3URL && typeof v3URL === 'string' && v3URL.length > 0) {
            shareURL = v3URL;
            method = 'v3';
            console.log('[Share Board] Pre-generated V3 compressed URL:', shareURL.length, 'chars');
        } else {
            // V3 returned invalid data
            const errorMsg = v3URL === null ? 'V3 returned null' : `V3 returned invalid: ${typeof v3URL}`;
            console.warn('[Share Board] V3 encoding returned invalid result:', errorMsg);
            fallbackReason = 'v3_invalid_result';
            Analytics.shareBoard.failed('v3_invalid_result', errorMsg);
            throw new Error(errorMsg); // Fall through to LZ-String
        }
    } catch (err) {
        // V3 encoding failed or timed out - fall back to LZ-String
        const errorType = err.message.includes('timeout') ? 'v3_timeout' :
                         err.message.includes('invalid') ? 'v3_invalid_result' :
                         err.message.includes('memory') ? 'v3_memory_error' :
                         err.name === 'TypeError' ? 'v3_type_error' :
                         'v3_error';

        console.log('[Share Board] V3 encoding failed, trying LZ-String fallback...', errorType, err.message);
        fallbackReason = errorType;

        // Track V3 failure
        Analytics.shareBoard.failed(errorType, err.message);

        try {
            if (typeof generateShareableURL !== 'function') {
                console.warn('[Share Board] generateShareableURL not available, using seed-only fallback');
                Analytics.shareBoard.failed('lz_not_available', 'generateShareableURL function not found');
            } else if (typeof LZString === 'undefined') {
                // Check if LZ-String library is loaded
                console.warn('[Share Board] LZ-String library not loaded, using seed-only fallback');
                Analytics.shareBoard.failed('lz_library_missing', 'LZString global not defined');
            } else {
                // Try LZ-String with 3-second timeout
                const compressedURL = await Promise.race([
                    generateShareableURL(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('LZ-String timeout after 3 seconds')), 3000)
                    )
                ]);

                if (compressedURL && typeof compressedURL === 'string' && compressedURL.length > 0) {
                    shareURL = compressedURL;
                    method = 'lz_string';
                    console.log('[Share Board] Pre-generated LZ-String compressed URL:', shareURL.length, 'chars');
                } else {
                    const lzErrorMsg = compressedURL === null ? 'LZ-String returned null' : `LZ-String returned invalid: ${typeof compressedURL}`;
                    console.warn('[Share Board] LZ-String generation failed, using seed-only fallback');
                    Analytics.shareBoard.failed('lz_invalid_result', lzErrorMsg);
                }
            }
        } catch (lzErr) {
            // LZ-String failed - categorize the error
            const lzErrorType = lzErr.message.includes('timeout') ? 'lz_timeout' :
                               lzErr.message.includes('memory') ? 'lz_memory_error' :
                               lzErr.name === 'QuotaExceededError' ? 'lz_quota_exceeded' :
                               lzErr.name === 'TypeError' ? 'lz_type_error' :
                               'lz_error';

            console.error('[Share Board] LZ-String encoding also failed:', lzErrorType, lzErr.message);
            Analytics.shareBoard.failed(lzErrorType, lzErr.message);
            // shareURL already set to seed-only fallback at top
        }
    }

    // Store the pre-generated URL in gameState
    gameState.preGeneratedShareURL = shareURL;

    // Track if we fell back to seed-only (compression failed completely)
    if (method === 'seed_only' && fallbackReason !== 'none') {
        console.warn('[Share Board] All compression methods failed, using seed-only URL');
        Analytics.shareBoard.failed('all_compression_failed', `Fallback reason: ${fallbackReason}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[Share Board] URL pre-generated in ${duration}ms using ${method}`);

    // Enable the Share Board button now that URL is ready
    const shareBtn = document.getElementById('share-board-btn');
    if (shareBtn) {
        shareBtn.disabled = false;
        shareBtn.textContent = 'Share Board';
        console.log('[Share Board] Share Board button enabled');
    }
}

async function shareBoardGame() {
    // Share Board: Use pre-generated URL for instant copying (no async delays)
    const shareBtn = document.getElementById('share-board-btn');
    const originalText = shareBtn ? shareBtn.textContent : 'Share Board';

    // Use pre-generated URL or fall back to seed-only
    const shareURL = gameState.preGeneratedShareURL || `https://letters.wiki/?seed=${gameState.seed}`;

    // Count tiles for analytics
    const tileCount = gameState.turnHistory.reduce((sum, turn) => {
        return sum + (turn && turn.tiles ? turn.tiles.length : 0);
    }, 0);
    const turnCount = Math.max(gameState.currentTurn - 1, 0);

    // Track share board started
    Analytics.shareBoard.started(tileCount, turnCount);

    // Determine method from URL
    let method = 'seed_only';
    if (shareURL.includes('?g=') || shareURL.includes('?w=')) {
        method = 'v3';  // V3 format uses ?g= (legacy) or ?w= (sorted) parameter
    } else if (shareURL.includes('&s=')) {
        method = shareURL.includes('v3=') ? 'v3' : 'lz_string';
    }

    // Pass analytics data to track success/failure AFTER clipboard result
    copyToClipboardWithFeedback(shareURL, shareBtn, originalText, method, {
        tileCount,
        turnCount,
        urlLength: shareURL.length
    });
}

// WikiDates-style clipboard copy with button feedback
function copyToClipboardWithFeedback(text, button, originalText = null, method = null, analyticsData = null) {
    // Determine what text to restore BEFORE clipboard operation
    const textToRestore = button ? (originalText || button.textContent) : 'Share Board';

    // Determine success message based on compression method
    let successMessage = "Copied!";
    if (method === 'v3') {
        successMessage = "Copied!";  // Best case - V3 compressed
    } else if (method === 'lz_string') {
        successMessage = "Copied.";  // Good - LZ-String (longer but full board)
    } else if (method === 'seed_only') {
        successMessage = "Copied?";  // Partial - seed-only (just date)
    }

    // Check clipboard API availability
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        Analytics.shareBoard.failed('clipboard_not_available', 'navigator.clipboard.writeText not supported');
        if (button) {
            button.textContent = "Not Copied";
            setTimeout(() => { button.textContent = textToRestore; }, 1000);
        }
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        // Track appropriate event based on method (ONLY after clipboard succeeds)
        if (analyticsData) {
            if (method === 'v3') {
                Analytics.shareBoard.success(method, analyticsData.urlLength, analyticsData.tileCount, 0, 'none');
            } else if (method === 'lz_string') {
                Analytics.shareBoard.fallback(method, analyticsData.urlLength, analyticsData.tileCount, 0, 'v3_failed');
            } else if (method === 'seed_only') {
                Analytics.shareBoard.minimal(analyticsData.urlLength, analyticsData.tileCount, 'all_compression_failed');
            }
        }

        // Change button text based on method
        if (button) {
            button.textContent = successMessage;
            const duration = method === 'seed_only' ? 1500 : 1000;  // Longer display for "Copied?"
            setTimeout(() => {
                button.textContent = textToRestore;
            }, duration);
        }
    }).catch((err) => {
        console.error('Could not copy text: ', err);

        // Categorize clipboard errors
        const errorType = err.name === 'NotAllowedError' ? 'clipboard_permission_denied' :
                         err.name === 'SecurityError' ? 'clipboard_security_error' :
                         err.name === 'TypeError' ? 'clipboard_type_error' :
                         err.message.includes('gesture') ? 'clipboard_gesture_required' :
                         err.message.includes('document is not focused') ? 'clipboard_focus_required' :
                         'clipboard_error';

        Analytics.shareBoard.failed(errorType, err.message);

        // IMPORTANT: Restore button text even on error
        if (button) {
            button.textContent = "Not Copied";
            setTimeout(() => {
                button.textContent = textToRestore;
            }, 1000);
        } else {
            showMessage('Share failed');
        }
    });
}

function generateShareGrid() {
    // Generate colored tile representation of the game
    const colors = ['🟦', '🟩', '🟨', '🟧', '🟥'];
    return gameState.turnHistory.map((turn, i) => colors[i] || '⬜').join('');
}

function showLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-modal').style.display = 'flex';
}

function showMessage(message) {
    // Quick message display (could be improved with toast notification)
    const modal = document.getElementById('error-modal');
    document.getElementById('error-message').textContent = message;
    modal.style.display = 'flex';

    // Auto-close after 2 seconds
    const timeout = setTimeout(() => {
        modal.style.display = 'none';
    }, 2000);

    // Also allow manual close
    const closeBtn = document.getElementById('close-error');
    const closeHandler = () => {
        clearTimeout(timeout);
        modal.style.display = 'none';
        closeBtn.removeEventListener('click', closeHandler);
    };
    closeBtn.addEventListener('click', closeHandler);
}

// Future development: Display Wikipedia context about the starting word
// Currently hidden - will show quotes/information from Wikipedia about the word
function showWikipediaLink(word, context, url) {
    const contextDiv = document.getElementById('wikipedia-context');
    const textElement = document.getElementById('wiki-text');
    const linkElement = document.getElementById('wiki-link');

    if (contextDiv && textElement && linkElement) {
        textElement.innerHTML = `Today's starting word "<strong>${word}</strong>" is from this date in history: ${context}`;
        linkElement.href = url;
        contextDiv.style.display = 'block';
    }
}

function updateTurnCounter() {
    // Legacy turn counter support
    const turnCounter = document.getElementById('turn-counter');
    if (turnCounter) {
        turnCounter.textContent = `Turn ${gameState.currentTurn} of ${gameState.maxTurns}`;
    }

    // Update footer squares
    updateFooterSquares();
}

function updateFooterSquares() {
    // Update the footer squares to show turn progress and scores
    const squares = document.querySelectorAll('.feedback-square');
    const totalScoreElement = document.querySelector('.total-score-display .score-value');

    // Reset all squares
    squares.forEach((square, index) => {
        const turnNum = index + 1;
        square.classList.remove('current-turn', 'completed');

        // Remove old click handlers
        square.replaceWith(square.cloneNode(true));
    });

    // Get fresh references after cloning
    const newSquares = document.querySelectorAll('.feedback-square');

    newSquares.forEach((square, index) => {
        const turnNum = index + 1;

        if (turnNum < gameState.currentTurn) {
            // Completed turn - show score
            square.classList.add('completed');
            const turnScore = gameState.turnScores && gameState.turnScores[turnNum - 1] || 0;
            square.textContent = turnScore;

            // Add score-based color class
            square.classList.remove('score-low', 'score-medium', 'score-good', 'score-great', 'score-excellent', 'score-amazing');
            if (turnScore >= 50) {
                square.classList.add('score-amazing');
            } else if (turnScore >= 40) {
                square.classList.add('score-excellent');
            } else if (turnScore >= 30) {
                square.classList.add('score-great');
            } else if (turnScore >= 20) {
                square.classList.add('score-good');
            } else if (turnScore >= 11) {
                square.classList.add('score-medium');
            } else if (turnScore >= 1) {
                square.classList.add('score-low');
            }

            // Add click handler to show tiles from this turn
            square.addEventListener('click', () => {
                animateTurnTiles(turnNum - 1);
            });
        } else if (turnNum === gameState.currentTurn && gameState.currentTurn <= gameState.maxTurns) {
            // Current turn - show red outline
            square.classList.add('current-turn');
            square.textContent = '';
        } else {
            // Future turn
            square.textContent = '';
        }
    });

    // Update total score and show/hide the display
    const totalScoreDisplay = document.querySelector('.total-score-display');
    if (totalScoreDisplay) {
        if (gameState.score > 0) {
            // Show total score display with fade in
            if (totalScoreDisplay.style.display === 'none') {
                totalScoreDisplay.style.display = 'flex';
                totalScoreDisplay.style.opacity = '0';
                setTimeout(() => { totalScoreDisplay.style.opacity = '1'; }, 10);
            }
            if (totalScoreElement) {
                totalScoreElement.textContent = gameState.score;
            }
        } else {
            // Keep hidden if no score yet
            totalScoreDisplay.style.display = 'none';
        }
    }
}

function animateTurnTiles(turnIndex) {
    // Get the turn data
    const turn = gameState.turnHistory[turnIndex];
    if (!turn || !turn.tiles) return;

    // Get the clicked square and animate it
    const square = document.querySelector(`.feedback-square.turn-${turnIndex + 1}`);
    if (square) {
        square.classList.add('pop');
        setTimeout(() => square.classList.remove('pop'), 800);
    }

    // Animate the tiles placed during this turn
    turn.tiles.forEach(tileData => {
        const cell = document.querySelector(`[data-row="${tileData.row}"][data-col="${tileData.col}"]`);
        if (cell) {
            const tile = cell.querySelector('.tile');
            if (tile) {
                // Add pop animation
                tile.classList.add('pop');

                // Remove animation class after it completes
                setTimeout(() => {
                    tile.classList.remove('pop');
                }, 800);
            }
        }
    });
}

function animateInvalidPlacementTiles() {
    // Animate tiles with red letters (invalid placement)
    const invalidCells = document.querySelectorAll('.board-cell.invalid-placement');
    invalidCells.forEach(cell => {
        const tile = cell.querySelector('.tile');
        if (tile) {
            // Add pop animation
            tile.classList.add('pop');

            // Remove animation class after it completes
            setTimeout(() => {
                tile.classList.remove('pop');
            }, 800);
        }
    });
}

function saveGameState() {
    try {
        const stateToSave = {
            ...gameState,
            timestamp: Date.now()
        };
        localStorage.setItem('letters_game_state', JSON.stringify(stateToSave));
    } catch (error) {
        console.error('Failed to save game state:', error);
    }
}

function loadGameState() {
    try {
        const saved = localStorage.getItem('letters_game_state');
        if (saved) {
            const parsedState = JSON.parse(saved);
            // Check if it's the same day
            if (parsedState.seed === gameState.seed) {
                // VALIDATION: Check if saved tiles are valid before restoring
                const validLetters = /^[A-Z]$/;

                // Validate rackTiles array
                if (parsedState.rackTiles && Array.isArray(parsedState.rackTiles)) {
                    const hasInvalidTiles = parsedState.rackTiles.some(t =>
                        typeof t !== 'string' || !validLetters.test(t)
                    );
                    if (hasInvalidTiles) {
                        console.warn('Corrupted rackTiles in localStorage, discarding saved state');
                        return false;
                    }
                }

                // Validate tiles array
                if (parsedState.tiles && Array.isArray(parsedState.tiles)) {
                    const hasInvalidTiles = parsedState.tiles.some(t =>
                        typeof t !== 'string' || !validLetters.test(t)
                    );
                    if (hasInvalidTiles) {
                        console.warn('Corrupted tiles in localStorage, discarding saved state');
                        return false;
                    }
                }

                gameState = { ...gameState, ...parsedState };
                return true;
            }
        }
    } catch (error) {
        console.error('Failed to load game state:', error);
    }
    return false;
}

function restoreBoard() {
    // Restore board state from loaded game state
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const letter = gameState.board[row][col];
            if (letter) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const tileDiv = document.createElement('div');
                tileDiv.className = 'tile placed';

                const letterSpan = document.createElement('span');
                letterSpan.className = 'tile-letter';
                letterSpan.textContent = letter;

                const scoreSpan = document.createElement('span');
                scoreSpan.className = 'tile-value';
                scoreSpan.textContent = TILE_SCORES[letter] || 0;

                tileDiv.appendChild(letterSpan);
                tileDiv.appendChild(scoreSpan);
                cell.innerHTML = '';
                cell.appendChild(tileDiv);
                cell.classList.add('occupied');
            }
        }
    }

    // Restore placed tiles for current turn
    if (gameState.placedTiles && gameState.placedTiles.length > 0) {
        gameState.placedTiles.forEach(({ row, col }) => {
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('placed-this-turn');
                const tile = cell.querySelector('.tile');
                if (tile) {
                    tile.classList.add('placed-this-turn');
                }
            }
        });
    }
}

function restoreTileRack() {
    // Restore tiles in rack - use gameState.rackTiles directly
    // This array already has the correct tiles (tiles not yet placed on board)
    if (gameState.rackTiles && gameState.rackTiles.length > 0) {
        displayTiles(gameState.rackTiles);
    } else if (gameState.rackTiles && gameState.rackTiles.length === 0) {
        // Explicitly clear rack if rackTiles is empty array
        displayTiles([]);
    } else if (gameState.tiles && gameState.tiles.length > 0 && !gameState.rackTiles) {
        // Fallback for old saves without rackTiles
        // Create a count of placed tiles by letter
        const placedLetterCounts = {};
        if (gameState.placedTiles) {
            gameState.placedTiles.forEach(tile => {
                placedLetterCounts[tile.letter] = (placedLetterCounts[tile.letter] || 0) + 1;
            });
        }

        // Filter out tiles that have been placed
        const remainingTiles = [];
        const letterCounts = {};

        // Count tiles and subtract placed ones correctly
        gameState.tiles.forEach(letter => {
            if (!letterCounts[letter]) {
                letterCounts[letter] = 0;
            }
            letterCounts[letter]++;
        });

        // Subtract placed tiles
        Object.keys(placedLetterCounts).forEach(letter => {
            letterCounts[letter] = (letterCounts[letter] || 0) - placedLetterCounts[letter];
        });

        // Add remaining tiles to array
        Object.keys(letterCounts).forEach(letter => {
            for (let i = 0; i < letterCounts[letter]; i++) {
                remainingTiles.push(letter);
            }
        });

        displayTiles(remainingTiles);
    }
}

function updateUI() {
    // Update all UI elements
    // Score is now shown in footer
    // document.getElementById('current-score').textContent = gameState.score || 0;
    updateTurnCounter();

    // Show wikipedia context if available
    // Future development: Uncomment to show Wikipedia context
    // if (gameState.wikiUrl) {
    //     showWikipediaLink(gameState.startingWord || '', gameState.wikiText || '', gameState.wikiUrl);
    // }

    // Show/hide Start Over button based on game state
    const startOverBtn = document.getElementById('start-over');
    if (startOverBtn) {
        // Show only if score > 0 (meaning at least one word has been submitted)
        const shouldShow = gameState.score > 0;
        if (shouldShow) {
            startOverBtn.style.display = 'flex';
            startOverBtn.style.opacity = '0';
            setTimeout(() => { startOverBtn.style.opacity = '1'; }, 10);
        } else {
            startOverBtn.style.opacity = '0';
            setTimeout(() => { startOverBtn.style.display = 'none'; }, 300);
        }
    }

    // Show/hide Recall button based on placed tiles
    const recallBtn = document.getElementById('recall-tiles');
    if (recallBtn) {
        const shouldShowRecall = gameState.placedTiles.length > 0;
        if (shouldShowRecall) {
            recallBtn.style.display = 'flex';
            recallBtn.style.opacity = '0';
            setTimeout(() => { recallBtn.style.opacity = '1'; }, 10);
        } else {
            recallBtn.style.opacity = '0';
            setTimeout(() => { recallBtn.style.display = 'none'; }, 300);
        }
    }

    // Check submit button state
    checkWordValidity();
}