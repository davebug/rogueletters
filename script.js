// Daily Letters - Game Logic

// Configuration for subdirectory deployment
const BASE_PATH = window.location.pathname.includes('/letters') ? '/letters' : '';
const API_BASE = `${BASE_PATH}/cgi-bin`;

// ============================================================================
// TILE EFFECTS SYSTEM
// ============================================================================
// Extensible system for tile modifiers (buffed, coin, future types)
// Each effect can have: border color, indicator, and special behaviors
// Tiles can have multiple effects; border priority determines which border shows

const TILE_EFFECTS = {
    buffed: {
        id: 'buffed',
        cssClass: 'buffed-tile',
        borderPriority: 2,           // Higher = wins border when multiple effects
        datasetKey: 'buffed',        // data-buffed attribute
        // Buffed tiles show score in gold circle (handled via CSS)
        // No separate indicator element needed
        indicator: null,
    },
    coin: {
        id: 'coin',
        cssClass: 'coin-tile',
        borderPriority: 1,
        datasetKey: 'coinTile',      // data-coin-tile attribute
        indicator: {
            text: '$1',
            className: 'tile-coin-indicator',
            position: 'top-right',   // For future: different effects use different positions
        },
    },
    pink: {
        id: 'pink',
        cssClass: 'pink-tile',
        borderPriority: 3,           // Higher than buffed and coin
        datasetKey: 'pinkTile',      // data-pink-tile attribute
        indicator: {
            text: '×1.5',
            className: 'tile-pink-indicator',
            position: 'top-right',
        },
    },
    // Future effects can be added here:
    // double: { id: 'double', cssClass: 'double-tile', borderPriority: 4, indicator: { text: '2x', position: 'top-left' } },
    // wild: { id: 'wild', cssClass: 'wild-tile', borderPriority: 5, indicator: { text: '★', position: 'bottom-left' } },
};

// Get active effects from tile data (works with current data model)
function getActiveEffects(tileData) {
    if (!tileData || typeof tileData !== 'object') return [];
    const effects = [];
    if (tileData.buffed) effects.push('buffed');
    if (tileData.coinTile) effects.push('coin');
    if (tileData.pinkTile) effects.push('pink');
    return effects;
}

// Get effect data from tile data (for effect-specific properties)
function getEffectData(tileData) {
    if (!tileData || typeof tileData !== 'object') return {};
    return {
        buffed: tileData.buffed ? { bonus: tileData.bonus || 1 } : null,
        coin: tileData.coinTile ? { claimed: tileData.coinClaimed || false } : null,
        pink: tileData.pinkTile ? { multiplier: 1.5 } : null,
    };
}

// Apply effect styling to a tile DOM element
function applyTileEffects(tileElement, tileData) {
    // Clear existing effect styling first
    clearTileEffects(tileElement);

    const activeEffects = getActiveEffects(tileData);
    if (activeEffects.length === 0) return;

    // Determine which effect gets the border (highest priority wins)
    let borderEffectId = null;
    let maxPriority = -1;
    for (const effectId of activeEffects) {
        const effect = TILE_EFFECTS[effectId];
        if (effect && effect.borderPriority > maxPriority) {
            maxPriority = effect.borderPriority;
            borderEffectId = effectId;
        }
    }

    // Apply the winning border class
    if (borderEffectId) {
        tileElement.classList.add(TILE_EFFECTS[borderEffectId].cssClass);
    }

    // Apply each effect's dataset and indicator
    for (const effectId of activeEffects) {
        const effect = TILE_EFFECTS[effectId];
        if (!effect) continue;

        // Set dataset attribute
        tileElement.dataset[effect.datasetKey] = 'true';

        // Add indicator element if defined
        if (effect.indicator) {
            const indicator = document.createElement('span');
            indicator.className = effect.indicator.className;
            indicator.textContent = effect.indicator.text;
            tileElement.appendChild(indicator);
        }
    }

    // Set bonus for buffed tiles
    if (tileData.buffed) {
        tileElement.dataset.bonus = tileData.bonus || 1;
    }
}

// Clear all effect styling from a tile element
function clearTileEffects(tileElement) {
    for (const [effectId, effect] of Object.entries(TILE_EFFECTS)) {
        tileElement.classList.remove(effect.cssClass);
        tileElement.dataset[effect.datasetKey] = 'false';
        if (effect.indicator) {
            const indicator = tileElement.querySelector(`.${effect.indicator.className}`);
            if (indicator) indicator.remove();
        }
    }
    tileElement.dataset.bonus = '0';
}

// Get tile effect data from DOM element (reverse of applyTileEffects)
function getTileEffectsFromDom(tileElement) {
    return {
        buffed: tileElement.dataset.buffed === 'true',
        bonus: parseInt(tileElement.dataset.bonus) || 0,
        coinTile: tileElement.dataset.coinTile === 'true',
        pinkTile: tileElement.dataset.pinkTile === 'true',
    };
}

// Check if a tile has a specific effect
function hasTileEffect(tileElement, effectId) {
    const effect = TILE_EFFECTS[effectId];
    if (!effect) return false;
    return tileElement.dataset[effect.datasetKey] === 'true';
}

// Transfer effects from one tile element to another
function transferTileEffects(fromTile, toTile) {
    const effectData = getTileEffectsFromDom(fromTile);
    applyTileEffects(toTile, effectData);
}

// ============================================================================
// END TILE EFFECTS SYSTEM
// ============================================================================

// ============================================================================
// ROGUES SYSTEM
// ============================================================================
// Persistent modifiers (like Balatro's Jokers) that apply effects each round
// Player can hold up to maxRogueSlots rogues, kept until discarded or run ends

const ROGUES = {
    // Original rogues
    extraTurn: {
        id: 'extraTurn',
        name: 'Overtime',
        description: '+1 turn per round',
        rarity: 'uncommon',
        icon: '⏰',
    },
    extraRack: {
        id: 'extraRack',
        name: 'Big Pockets',
        description: '+1 rack capacity',
        rarity: 'uncommon',
        icon: '🎒',
    },
    basePayout: {
        id: 'basePayout',
        name: 'Salary Bump',
        description: '+$3 base payout',
        rarity: 'common',
        icon: '💵',
    },
    vowelBonus: {
        id: 'vowelBonus',
        name: 'Vowel Power',
        description: '+1 to all vowels',
        rarity: 'uncommon',
        icon: '🔤',
    },
    // Phase 3: Simple rogues
    goldenDiamond: {
        id: 'goldenDiamond',
        name: 'Golden Diamond',
        description: 'Earn $1 per 20% above target',
        rarity: 'common',
        icon: '💎',
    },
    endlessPower: {
        id: 'endlessPower',
        name: 'Endless Power',
        description: '+2 per word × current set',
        rarity: 'rare',
        icon: '⚡',
    },
    loneRanger: {
        id: 'loneRanger',
        name: 'Lone Ranger',
        description: '+6 if word has exactly 1 vowel',
        rarity: 'common',
        icon: '🤠',
    },
    highValue: {
        id: 'highValue',
        name: 'High Value',
        description: '+1 per upgraded tile in word',
        rarity: 'common',
        icon: '💰',
    },
    wolfPack: {
        id: 'wolfPack',
        name: 'Wolf Pack',
        description: '+3 per double letter pair',
        rarity: 'common',
        icon: '🐺',
    },
    // Phase 4: UI-modifying rogues
    noDiscard: {
        id: 'noDiscard',
        name: 'No Discard',
        description: 'Exchange → Pass (+2 turns)',
        rarity: 'uncommon',
        icon: '🚫',
    },
    bingoWizard: {
        id: 'bingoWizard',
        name: 'Bingo Wizard',
        description: 'Bingo with 6 tiles (+50)',
        rarity: 'uncommon',
        icon: '🎱',
    },
    // Phase 5: Complex rogues (state or UI additions)
    worder: {
        id: 'worder',
        name: 'Worder',
        description: '×1.25 per letter square used',
        rarity: 'rare',
        icon: '📝',
    },
    allRoundLetter: {
        id: 'allRoundLetter',
        name: 'All-Round Letter',
        description: '+1 for first use of each letter',
        rarity: 'common',
        icon: '🔄',
    },
    topDeck: {
        id: 'topDeck',
        name: 'Top Deck',
        description: 'See next 3 tiles in bag',
        rarity: 'common',
        icon: '👁️',
    },
    // Trade-off rogues
    heavyBackpack: {
        id: 'heavyBackpack',
        name: 'Heavy Backpack',
        description: '+2 rack size, -1 turn per round',
        rarity: 'uncommon',
        icon: '🏋️',
    },
    // Synergy rogues (Phase 3.5)
    collector: {
        id: 'collector',
        name: 'The Collector',
        description: '×1.1 per rogue owned',
        rarity: 'uncommon',
        icon: '🎭',
    },
    minter: {
        id: 'minter',
        name: 'The Minter',
        description: '7th tile each round is +1 buffed',
        rarity: 'common',
        icon: '🪙',
    },
    miser: {
        id: 'miser',
        name: 'The Miser',
        description: '+$2 for 1-3 tile turns',
        rarity: 'uncommon',
        icon: '🤑',
    },
    closer: {
        id: 'closer',
        name: 'The Closer',
        description: '×2 on last turn of each round',
        rarity: 'rare',
        icon: '🎬',
    },
    hoarder: {
        id: 'hoarder',
        name: 'The Hoarder',
        description: '+1 point per $1 at round start',
        rarity: 'uncommon',
        icon: '🐉',
    },
};

// Check if player has a specific rogue
function hasRogue(rogueId) {
    return runState.rogues && runState.rogues.includes(rogueId);
}

// Get current rack size based on rogues
function getRackSize() {
    let size = 7;
    if (hasRogue('extraRack')) size += 1;
    if (hasRogue('heavyBackpack')) size += 2;
    return size;
}

// Calculate rogue price based on rarity: Common $4, Uncommon $5, Rare $6
function getRoguePrice(rogueId) {
    const rogue = ROGUES[rogueId];
    if (!rogue) return 999;
    const rarityPrices = { common: 4, uncommon: 5, rare: 6 };
    return rarityPrices[rogue.rarity] || 5;
}

// Get display score for a tile (includes vowel rogue if active)
function getTileDisplayScore(letter, bonus = 0) {
    if (!letter || letter === '_') return '';
    const baseScore = TILE_SCORES[letter] || 0;
    const vowels = ['A', 'E', 'I', 'O', 'U'];
    const vowelBonus = hasRogue('vowelBonus') && vowels.includes(letter) ? 1 : 0;
    // Add tile set upgrade bonus (applies to all tiles of that letter)
    const tileSetBonus = (runState.tileSetUpgrades && runState.tileSetUpgrades[letter]) || 0;
    return baseScore + bonus + vowelBonus + tileSetBonus;
}

// ============================================================================
// END ROGUES SYSTEM
// ============================================================================

// Animation speed setting: '0.5x', '1x', '5x', '20x', 'skip'
// Persisted in localStorage
// Base speed (1x) is tuned for readability; multiplier applied to durations
let animationSpeed = localStorage.getItem('animationSpeed') || '1x';

function setAnimationSpeed(speed) {
    animationSpeed = speed;
    localStorage.setItem('animationSpeed', speed);
    updateAnimationSpeedUI();
}

function getAnimationSpeedMultiplier() {
    // Returns duration multiplier: higher = slower animations
    switch (animationSpeed) {
        case '0.5x': return 4;     // Half speed (4x duration)
        case '5x': return 0.4;    // 5x faster
        case '20x': return 0.1;   // 20x faster
        case 'skip': return 0;
        default: return 2;        // '1x' - base speed (2x original duration)
    }
}

function updateAnimationSpeedUI() {
    // Update label highlights
    const labels = document.querySelectorAll('.speed-labels span');
    labels.forEach(label => {
        label.classList.toggle('active', label.dataset.speed === animationSpeed);
    });

    // Position thumb on track (0%, 25%, 50%, 75%, 100% for 5 positions)
    const thumb = document.querySelector('.speed-thumb');
    if (thumb) {
        const positions = { '0.5x': 0, '1x': 25, '5x': 50, '20x': 75, 'skip': 100 };
        thumb.style.left = `${positions[animationSpeed] ?? 25}%`;
    }
}

function handleSpeedTrackClick(event) {
    const track = event.currentTarget;
    const rect = track.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percent = (clickX / rect.width) * 100;

    // Map click position to speed (5 zones)
    let speed;
    if (percent < 12.5) speed = '0.5x';
    else if (percent < 37.5) speed = '1x';
    else if (percent < 62.5) speed = '5x';
    else if (percent < 87.5) speed = '20x';
    else speed = 'skip';

    setAnimationSpeed(speed);
}

// Settings Modal Functions
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'flex';
        updateAnimationSpeedUI(); // Ensure buttons reflect current state
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function confirmAbandonRun() {
    closeSettingsModal();
    startOver(); // Reuses existing start over logic with confirmation
}

// ============================================================================
// BOTTOM SHEET COMPONENT
// Reusable slide-up sheet for contextual interactions
// ============================================================================

const bottomSheet = {
    element: null,
    backdrop: null,
    container: null,
    content: null,
    closeBtn: null,
    isOpen: false,
    onClose: null, // Callback when sheet closes

    init() {
        this.element = document.getElementById('bottom-sheet');
        if (!this.element) return;

        this.backdrop = this.element.querySelector('.bottom-sheet-backdrop');
        this.container = this.element.querySelector('.bottom-sheet-container');
        this.content = this.element.querySelector('.bottom-sheet-content');
        this.closeBtn = this.element.querySelector('.bottom-sheet-close');

        // Close on backdrop tap
        this.backdrop?.addEventListener('click', () => this.hide());

        // Close on X button
        this.closeBtn?.addEventListener('click', () => this.hide());
    },

    /**
     * Show the bottom sheet with custom content
     * @param {Object} options - Configuration options
     * @param {string} options.icon - Emoji/icon to display (optional)
     * @param {string} options.title - Header title
     * @param {string} options.description - Main description text
     * @param {string} options.detail - Secondary detail text (optional)
     * @param {string} options.html - Custom HTML content (overrides other content options)
     * @param {Array} options.actions - Array of button configs [{label, class, onClick, disabled}]
     * @param {Function} options.onClose - Callback when sheet closes
     */
    show(options = {}) {
        if (!this.element || !this.content) return;

        this.onClose = options.onClose || null;

        // Build content HTML
        let html = '';

        if (options.html) {
            // Use custom HTML directly
            html = options.html;
        } else {
            // Build standard layout
            if (options.icon || options.title) {
                html += '<div class="bottom-sheet-header">';
                if (options.icon) {
                    html += `<span class="bottom-sheet-icon">${options.icon}</span>`;
                }
                if (options.title) {
                    html += `<h3 class="bottom-sheet-title">${options.title}</h3>`;
                }
                html += '</div>';
            }

            if (options.description) {
                html += `<p class="bottom-sheet-desc">${options.description}</p>`;
            }

            if (options.detail) {
                html += `<p class="bottom-sheet-detail">${options.detail}</p>`;
            }

            if (options.actions && options.actions.length > 0) {
                html += '<div class="bottom-sheet-actions">';
                options.actions.forEach((action, index) => {
                    const btnClass = action.class || 'bottom-sheet-btn-primary';
                    const disabled = action.disabled ? 'disabled' : '';
                    const cannotAfford = action.cannotAfford ? 'cannot-afford' : '';
                    html += `<button class="bottom-sheet-btn ${btnClass} ${cannotAfford}" data-action-index="${index}" ${disabled}>${action.label}</button>`;
                });
                html += '</div>';
            }
        }

        this.content.innerHTML = html;

        // Attach action handlers
        if (options.actions) {
            this.content.querySelectorAll('[data-action-index]').forEach(btn => {
                const index = parseInt(btn.dataset.actionIndex);
                const action = options.actions[index];
                if (action && action.onClick) {
                    btn.addEventListener('click', () => {
                        action.onClick();
                        if (action.closeOnClick !== false) {
                            this.hide();
                        }
                    });
                }
            });
        }

        // Show the sheet
        this.element.classList.remove('hidden');
        // Trigger reflow for animation
        this.element.offsetHeight;
        this.element.classList.add('visible');
        this.isOpen = true;
    },

    hide() {
        if (!this.element || !this.isOpen) return;

        this.element.classList.remove('visible');
        this.isOpen = false;

        // Wait for animation before hiding
        setTimeout(() => {
            if (!this.isOpen) {
                this.element.classList.add('hidden');
                this.content.innerHTML = '';
                if (this.onClose) {
                    this.onClose();
                    this.onClose = null;
                }
            }
        }, 150);
    }
};

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
    isNewHighScore: false,  // Track if player got a new high score
    pendingBlankPlacement: null,  // Stores {cell, tile} when blank awaiting letter selection
    blankPositions: [],  // Track positions of blank tiles on the board [{row, col, letter}]
    tilesDrawnFromBag: [],  // All tile letters drawn from bag this round (for bag viewer)
    // Exchange state
    isExchangeMode: false,           // Currently in exchange modal?
    selectedForExchange: [],         // Tiles selected for exchange [{letter, isBlank, element}]
    exchangeCount: 0,                // Number of exchanges this round (resets each round)
    exchangeHistory: []              // Full history for deterministic reconstruction
};

// Run state for roguelike mode
// Hierarchy: Game > Set > Round > Turn
let runState = {
    isRunMode: false,
    // Set tracking (3 rounds per set)
    set: 1,                         // Current set (1-5+, can continue)
    maxSets: 5,                     // Nominal sets per game (then unlimited)
    // Round tracking (5 turns per round)
    round: 1,                       // Current round within set (1-3)
    maxRounds: 3,                   // Rounds per set
    targetScore: 40,                // Score needed this round
    // Target scores for each set (3 rounds each)
    // Set 1: 40, 60, 80 | Set 2: 100, 150, 200 | Set 3: 250, 375, 500 | Set 4: 650, 975, 1300
    setTargets: [
        [40, 60, 80],       // Set 1
        [100, 150, 200],    // Set 2
        [250, 375, 500],    // Set 3
        [650, 975, 1300]    // Set 4+
    ],
    // Scoring
    setScore: 0,                    // Cumulative score this set
    totalScore: 0,                  // Cumulative score entire game
    roundScores: [],                // Scores for each round this set
    // Economy
    coins: 0,                       // Current bank balance
    lastEarnings: null,             // Most recent round earnings (for display)
    // Shop
    purchasedTiles: [],             // Tiles bought from shop (e.g. [{letter: 'E', bonus: 1}])
    removedTiles: [],               // Tiles removed via "Replace" option (e.g. ['Q', 'Z'])
    buffedTilesDrawn: {},           // Count of buffed tiles per letter already drawn (e.g. {E: 1})
    // Meta
    runStartTime: null,
    runSeed: null,
    // Flow state - tracks which screen to show on refresh
    // Values: null, 'earnings', 'shop', 'setComplete'
    pendingScreen: null,
    pendingScore: null,  // Score to display on earnings screen
    // Shop tiles for current visit (persists across refresh)
    shopTiles: null,        // The 2 tiles offered this visit, e.g. ['E', 'N']
    shopTileTypes: null,    // Type of each shop tile, e.g. ['buffed', 'coin']
    shopPurchased: null,    // Which tiles have been purchased, e.g. [false, true]
    // Rogues (persistent Joker-like modifiers)
    rogues: [],             // Array of rogue IDs owned, e.g. ['extraTurn', 'vowelBonus']
    maxRogueSlots: 5,       // Max rogues player can hold
    shopRogues: [null, null, null],        // 3 rogue offerings (rogue IDs)
    shopRoguesPurchased: [false, false, false],  // Which rogues purchased this shop visit
    pendingRoguePurchase: null,  // Rogue ID pending when at max rogues (needs discard first)
    // Tile Set Upgrade system
    tileSetUpgradeCount: 0,     // Number of times tile set has been upgraded
    tileSetUpgrades: {},        // Map of letter -> bonus, e.g., {'E': 1, 'A': 1, 'T': 2}
    // Run statistics for end-of-run summary
    runStats: {
        wordsPlayed: 0,         // Total words submitted
        bestWord: null,         // {word: 'EXAMPLE', score: 42}
        longestWord: null,      // {word: 'EXAMPLE', length: 7}
        totalCoinsEarned: 0,    // Total coins earned (not just current balance)
        bingos: 0,              // Number of bingo bonuses
        roguesTriggered: {}     // Count of each rogue trigger, e.g., {loneRanger: 5, wolfPack: 2}
    }
};

// Helper to mark tiles as buffed/coin/pink when drawn from bag
// Takes array of letters (strings) or tile objects, returns array of tile objects with effect flags
function markBuffedTiles(tiles) {
    // If tiles are already objects with effect info (restored from localStorage), preserve it
    if (tiles.length > 0 && typeof tiles[0] === 'object' && tiles[0].letter) {
        return tiles.map(t => ({
            letter: t.letter,
            buffed: t.buffed || false,
            bonus: t.bonus || 0,
            coinTile: t.coinTile || false,
            pinkTile: t.pinkTile || false
        }));
    }

    // Otherwise, tiles are strings (fresh draw from server), calculate effect status
    if (!runState.purchasedTiles?.length) {
        // No purchased tiles, all tiles are normal
        return tiles.map(letter => ({ letter, buffed: false, bonus: 0, coinTile: false, pinkTile: false }));
    }

    // Count how many of each tile type we purchased per letter
    const buffedCounts = {};
    const coinCounts = {};
    const pinkCounts = {};
    for (const tile of runState.purchasedTiles) {
        const ltr = typeof tile === 'object' ? tile.letter : tile;
        if (tile.pinkTile) {
            pinkCounts[ltr] = (pinkCounts[ltr] || 0) + 1;
        } else if (tile.coinTile) {
            coinCounts[ltr] = (coinCounts[ltr] || 0) + 1;
        } else {
            buffedCounts[ltr] = (buffedCounts[ltr] || 0) + 1;
        }
    }

    // Initialize drawn counts if needed
    runState.buffedTilesDrawn = runState.buffedTilesDrawn || {};
    runState.coinTilesDrawn = runState.coinTilesDrawn || {};
    runState.pinkTilesDrawn = runState.pinkTilesDrawn || {};

    // Mark tiles - special tiles are drawn in priority order: pink, buffed, coin
    return tiles.map(letter => {
        // Check pink tiles first (highest priority)
        const pinkPurchased = pinkCounts[letter] || 0;
        const pinkAlreadyDrawn = runState.pinkTilesDrawn[letter] || 0;
        const pinkRemaining = pinkPurchased - pinkAlreadyDrawn;

        if (pinkRemaining > 0) {
            runState.pinkTilesDrawn[letter] = pinkAlreadyDrawn + 1;
            return { letter, buffed: false, bonus: 0, coinTile: false, pinkTile: true };
        }

        // Check buffed tiles next
        const buffedPurchased = buffedCounts[letter] || 0;
        const buffedAlreadyDrawn = runState.buffedTilesDrawn[letter] || 0;
        const buffedRemaining = buffedPurchased - buffedAlreadyDrawn;

        if (buffedRemaining > 0) {
            runState.buffedTilesDrawn[letter] = buffedAlreadyDrawn + 1;
            return { letter, buffed: true, bonus: 1, coinTile: false, pinkTile: false };
        }

        // Check coin tiles last
        const coinPurchased = coinCounts[letter] || 0;
        const coinAlreadyDrawn = runState.coinTilesDrawn[letter] || 0;
        const coinRemaining = coinPurchased - coinAlreadyDrawn;

        if (coinRemaining > 0) {
            runState.coinTilesDrawn[letter] = coinAlreadyDrawn + 1;
            return { letter, buffed: false, bonus: 0, coinTile: true, pinkTile: false };
        }

        return { letter, buffed: false, bonus: 0, coinTile: false, pinkTile: false };
    });
}

// ============================================================================
// RUN MANAGER
// ============================================================================

// Helper to get target score for a given set and round
function getTargetScore(set, round) {
    // Use the last set's targets for sets beyond what's defined
    const setIndex = Math.min(set - 1, runState.setTargets.length - 1);
    const targets = runState.setTargets[setIndex];
    return targets[round - 1];
}

// Calculate earnings for a completed round
// Base: $3 (R1), $4 (R2), $5 (R3) + $1 per 25% above target (20% with Golden Diamond)
function calculateEarnings(score, target, roundInSet) {
    const baseAmount = [3, 4, 5][roundInSet - 1] || 3;
    // Apply basePayout rogue: +$3 to base payout
    const salaryBumpBonus = hasRogue('basePayout') ? 3 : 0;
    const extra = Math.max(0, score - target);

    // $1 bonus for every 25% of target scored above target (20% with Golden Diamond)
    // e.g., 40 target = $1 per 10 extra (or $1 per 8 with Golden Diamond)
    const bonusPercent = hasRogue('goldenDiamond') ? 0.20 : 0.25;
    const bonusThreshold = Math.floor(target * bonusPercent);
    const extraBonus = bonusThreshold > 0 ? Math.floor(extra / bonusThreshold) : 0;

    return {
        base: baseAmount,
        salaryBumpBonus: salaryBumpBonus,
        extraBonus: extraBonus,
        total: baseAmount + salaryBumpBonus + extraBonus,
        extraPoints: extra,
        bonusThreshold: bonusThreshold,
        goldenDiamondActive: hasRogue('goldenDiamond')
    };
}

const runManager = {
    // Start a new run (game)
    startRun() {
        runState.isRunMode = true;
        runState.set = 1;
        runState.round = 1;
        runState.targetScore = getTargetScore(1, 1);
        runState.setScore = 0;
        runState.totalScore = 0;
        runState.roundScores = [];
        runState.coins = 0;
        runState.lastEarnings = null;
        runState.purchasedTiles = [];  // Reset shop purchases
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
        runState.setScore += score;
        runState.totalScore += score;

        if (score >= runState.targetScore) {
            // Success!
            // Check for final victory (Set 5 Round 3) - skip earnings, go straight to victory
            if (runState.round >= runState.maxRounds && runState.set >= runState.maxSets) {
                // Calculate and add final earnings silently
                const earnings = calculateEarnings(score, runState.targetScore, runState.round);
                runState.coins += earnings.total;
                runState.lastEarnings = earnings;
                this.saveRunState();
                this.showGameComplete(true);
            } else {
                // Show earnings screen
                this.showEarningsScreen(score);
            }
            return true;
        } else {
            // Failed - GAME OVER
            this.showGameComplete(false);
            return false;
        }
    },

    // Advance to next round
    nextRound() {
        runState.round++;
        runState.targetScore = getTargetScore(runState.set, runState.round);

        this.saveRunState();
        this.updateRunUI();
        this.hideAllRunPopups();

        // Reset game for new round
        this.resetForNewRound();
    },

    // Advance to next set (after completing all rounds in current set)
    nextSet() {
        runState.set++;
        runState.round = 1;
        runState.targetScore = getTargetScore(runState.set, 1);
        runState.setScore = 0;
        runState.roundScores = [];

        this.saveRunState();
        this.updateRunUI();
        this.hideAllRunPopups();

        // Reset game for new set
        this.resetForNewRound();
    },

    // Reset game state for a new round (keeping run state)
    resetForNewRound() {
        // Reset game state
        gameState.board = [];
        gameState.tiles = [];
        gameState.currentTurn = 1;
        gameState.score = 0;

        // The Hoarder: Start each round with 1 point per $1 owned
        if (hasRogue('hoarder') && runState.isRunMode && runState.coins > 0) {
            gameState.score = runState.coins;
            console.log(`[Hoarder] Starting round with ${runState.coins} points (from $${runState.coins})`);
        }

        gameState.turnScores = [];
        gameState.placedTiles = [];
        gameState.turnHistory = [];
        gameState.isGameOver = false;
        gameState.hasSubmittedScore = false;
        gameState.isSubmitting = false;
        gameState.rackTiles = [];
        gameState.gameStartTime = Date.now();
        gameState.preGeneratedShareURL = null;
        gameState.isNewHighScore = false;
        gameState.pendingBlankPlacement = null;
        gameState.blankPositions = [];
        gameState.tilesDrawnFromBag = [];
        // Reset exchange state for new round
        gameState.isExchangeMode = false;
        gameState.selectedForExchange = [];
        gameState.exchangeCount = 0;
        gameState.exchangeHistory = [];

        // Apply rogue effects
        // extraTurn: +1 turn per round
        // noDiscard: +2 turns (compensates for no exchange)
        // heavyBackpack: -1 turn per round
        gameState.maxTurns = 5 + (hasRogue('extraTurn') ? 1 : 0) + (hasRogue('noDiscard') ? 2 : 0) - (hasRogue('heavyBackpack') ? 1 : 0);
        // Rack size: base 7 + extraRack (+1) + heavyBackpack (+2)
        gameState.totalTilesDrawn = getRackSize();

        // Generate new seed for this round (as string for consistency)
        // Include set number so each set/round combo gets a unique seed
        const roundOffset = ((runState.set - 1) * runState.maxRounds) + runState.round;
        gameState.seed = String(runState.runSeed + roundOffset);
        gameState.dateStr = formatSeedToDate(gameState.seed);

        // Reinitialize the game boards
        createBoard();
        createRackBoard();
        fetchGameData(gameState.seed);

        // Reset UI (updateRunUI also renders rogues)
        this.updateRunUI();
        updateTurnCounter();
        updateFooterSquares();  // Reset feedback circles for new round

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

    // Update run info display in header
    updateRunUI() {
        const progressSet = document.getElementById('progress-set');
        const progressRound = document.getElementById('progress-round');
        const subtitle = document.getElementById('subtitle');

        if (runState.isRunMode) {
            if (progressRound) progressRound.textContent = `Round ${runState.round}`;
            if (progressSet) progressSet.textContent = `Set ${runState.set}`;

            // Update coin display
            this.updateCoinDisplay();

            const currentScore = gameState.score || 0;
            const remaining = runState.targetScore - currentScore;
            const turnsLeft = (gameState.maxTurns || 5) - (gameState.currentTurn || 1) + 1;

            // Update subtitle based on whether target is met
            if (subtitle) {
                if (remaining > 0) {
                    // Target not yet met
                    subtitle.innerHTML = `Score <span id="subtitle-target">${remaining}</span> in <span id="subtitle-turns">${turnsLeft}</span> turn${turnsLeft !== 1 ? 's' : ''} to advance`;
                } else {
                    // Target met - show points, bonus $ earned, and points to next $
                    const extra = Math.abs(remaining);
                    // Calculate bonus using same formula as calculateEarnings
                    const bonusPercent = hasRogue('goldenDiamond') ? 0.20 : 0.25;
                    const bonusThreshold = Math.floor(runState.targetScore * bonusPercent);
                    const bonusEarned = bonusThreshold > 0 ? Math.floor(extra / bonusThreshold) : 0;
                    const pointsInCurrentDollar = extra % bonusThreshold;
                    const pointsToNextDollar = bonusThreshold - pointsInCurrentDollar;
                    const ptLabel = pointsToNextDollar === 1 ? 'pt' : 'pts';
                    subtitle.innerHTML = `<span class="target-met">+${extra} pts extra (+$${bonusEarned})</span> — ${pointsToNextDollar} ${ptLabel} to next bonus $1`;
                }
            }

            // Always ensure rogues are visible
            this.renderRogueInventory();
        }
    },

    // Show round complete popup
    showRoundComplete(score) {
        const popup = document.getElementById('round-complete-popup');
        const scoreEl = document.getElementById('round-score-value');
        const targetEl = document.getElementById('round-target-value');
        const extraEl = document.getElementById('round-extra-value');

        const extra = score - runState.targetScore;

        scoreEl.textContent = score;
        targetEl.textContent = runState.targetScore;
        extraEl.textContent = `+${extra}`;

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
        this.resetRunState();
        this.clearRunState();
    },

    // Track word stats for end-of-run summary
    trackWordStats(formedWords, turnScore, breakdown) {
        if (!runState.isRunMode || !runState.runStats) return;

        const stats = runState.runStats;

        // Get the main word (longest formed word)
        if (formedWords.length > 0) {
            const mainWord = formedWords.reduce((a, b) =>
                a.positions.length > b.positions.length ? a : b
            );
            const wordText = mainWord.word;
            const wordLength = wordText.length;

            // Increment words played
            stats.wordsPlayed++;

            // Track best word (highest score)
            if (!stats.bestWord || turnScore > stats.bestWord.score) {
                stats.bestWord = { word: wordText, score: turnScore };
            }

            // Track longest word
            if (!stats.longestWord || wordLength > stats.longestWord.length) {
                stats.longestWord = { word: wordText, length: wordLength };
            }
        }

        // Track bingos from breakdown
        if (breakdown && breakdown.components) {
            breakdown.components.forEach(comp => {
                if (comp.id === 'bingo' || comp.id === 'bingoWizard') {
                    stats.bingos++;
                }
                // Track rogue triggers (excluding bingo which isn't a rogue)
                if (comp.id !== 'bingo' && ROGUES[comp.id]) {
                    stats.roguesTriggered[comp.id] = (stats.roguesTriggered[comp.id] || 0) + 1;
                }
            });
        }

        this.saveRunState();
    },

    // Track coins earned for stats
    trackCoinsEarned(amount) {
        if (!runState.isRunMode || !runState.runStats) return;
        runState.runStats.totalCoinsEarned += amount;
        this.saveRunState();
    },

    // Show final game complete popup (win or lose) with detailed summary
    showGameComplete(isVictory) {
        // Save values before resetting state
        const finalScore = runState.totalScore;
        const finalCoins = runState.coins;
        const finalSet = runState.set;
        const finalRound = runState.round;
        const stats = runState.runStats || {};
        const deficit = runState.targetScore - (gameState.score || 0);

        // Build the summary HTML
        const popup = document.getElementById('game-popup');
        const title = document.getElementById('popup-title');
        const scoreLabel = document.getElementById('popup-score-label');
        const scoreValue = document.getElementById('popup-score-value');

        // Title based on victory/defeat
        if (isVictory) {
            title.textContent = '🎉 Victory!';
        } else {
            title.textContent = 'Game Over';
        }

        // Build stats summary HTML
        let summaryHtml = '';

        if (isVictory) {
            summaryHtml += `<div style="color: #4ade80; font-size: 16px; margin-bottom: 12px;">You completed all 5 sets!</div>`;
        } else {
            summaryHtml += `<div style="color: #ef4444; font-size: 16px; margin-bottom: 12px;">Needed ${deficit} more to advance</div>`;
        }

        // Progress reached
        summaryHtml += `<div style="color: var(--text-muted); font-size: 14px; margin-bottom: 16px;">`;
        summaryHtml += `Reached Set ${finalSet} Round ${finalRound}`;
        summaryHtml += `</div>`;

        // Stats breakdown
        summaryHtml += `<div style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 12px; text-align: left;">`;

        // Words played
        summaryHtml += `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">`;
        summaryHtml += `<span style="color: var(--text-muted);">Words Played</span>`;
        summaryHtml += `<span style="color: var(--text-color); font-weight: bold;">${stats.wordsPlayed || 0}</span>`;
        summaryHtml += `</div>`;

        // Best word
        if (stats.bestWord) {
            summaryHtml += `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">`;
            summaryHtml += `<span style="color: var(--text-muted);">Best Word</span>`;
            summaryHtml += `<span style="color: #fbbf24; font-weight: bold;">${stats.bestWord.word} (${stats.bestWord.score} pts)</span>`;
            summaryHtml += `</div>`;
        }

        // Longest word
        if (stats.longestWord) {
            summaryHtml += `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">`;
            summaryHtml += `<span style="color: var(--text-muted);">Longest Word</span>`;
            summaryHtml += `<span style="color: #60a5fa; font-weight: bold;">${stats.longestWord.word} (${stats.longestWord.length} letters)</span>`;
            summaryHtml += `</div>`;
        }

        // Bingos
        if (stats.bingos > 0) {
            summaryHtml += `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">`;
            summaryHtml += `<span style="color: var(--text-muted);">🎯 Bingos</span>`;
            summaryHtml += `<span style="color: #a78bfa; font-weight: bold;">${stats.bingos}</span>`;
            summaryHtml += `</div>`;
        }

        // Coins earned
        summaryHtml += `<div style="display: flex; justify-content: space-between; padding: 4px 0;">`;
        summaryHtml += `<span style="color: var(--text-muted);">Total Coins Earned</span>`;
        summaryHtml += `<span style="color: #4ade80; font-weight: bold;">$${stats.totalCoinsEarned || finalCoins}</span>`;
        summaryHtml += `</div>`;

        summaryHtml += `</div>`;

        scoreLabel.innerHTML = summaryHtml;
        scoreValue.textContent = finalScore;

        popup.classList.remove('hidden');

        // Clear run state - game is over
        this.resetRunState();
        this.clearRunState();
    },

    // Show start run popup
    showStartRun() {
        document.getElementById('start-run-popup').classList.remove('hidden');
    },

    // Hide all run popups and screens
    hideAllRunPopups() {
        document.getElementById('round-complete-popup')?.classList.add('hidden');
        document.getElementById('run-failed-popup')?.classList.add('hidden');
        document.getElementById('run-victory-popup')?.classList.add('hidden');
        document.getElementById('start-run-popup')?.classList.add('hidden');
        document.getElementById('game-popup')?.classList.add('hidden');
        document.getElementById('earnings-screen')?.classList.add('hidden');
        document.getElementById('shop-screen')?.classList.add('hidden');
        document.getElementById('set-complete-screen')?.classList.add('hidden');
        // Show game container when hiding screens
        document.getElementById('game-container')?.classList.remove('hidden');
    },

    // Show the earnings screen (full page, replaces game board)
    showEarningsScreen(score, isRestore = false) {
        // Calculate earnings
        const earnings = calculateEarnings(score, runState.targetScore, runState.round);
        const previousCoins = isRestore ? (runState.coins - earnings.total) : runState.coins;

        // Update state (skip coin adding on restore - already saved)
        if (!isRestore) {
            runState.coins += earnings.total;
            runState.lastEarnings = earnings;
            runState.pendingScreen = 'earnings';
            runState.pendingScore = score;
            // Track coins earned for end-of-run summary
            this.trackCoinsEarned(earnings.total);
            this.saveRunState();
        }

        // Update header to show "Round Complete"
        const progressRound = document.getElementById('progress-round');
        if (progressRound) progressRound.textContent = 'Round Complete';

        // Hide game board, show earnings screen
        document.getElementById('game-container')?.classList.add('hidden');
        const earningsScreen = document.getElementById('earnings-screen');
        if (!earningsScreen) return;

        // Populate earnings data
        document.getElementById('earnings-score').textContent = score;
        document.getElementById('earnings-target').textContent = runState.targetScore;

        // Handle extra vs exact match
        const extraDisplay = document.getElementById('earnings-extra-display');
        const targetReachedDisplay = document.getElementById('earnings-target-reached');

        if (earnings.extraPoints > 0) {
            if (extraDisplay) {
                extraDisplay.classList.remove('hidden');
                document.getElementById('earnings-extra-points').textContent = earnings.extraPoints;
            }
            if (targetReachedDisplay) targetReachedDisplay.classList.add('hidden');
        } else {
            if (extraDisplay) extraDisplay.classList.add('hidden');
            if (targetReachedDisplay) targetReachedDisplay.classList.remove('hidden');
        }

        // Populate earnings breakdown
        document.getElementById('earnings-base').textContent = earnings.base;
        document.getElementById('earnings-extra-bonus').textContent = earnings.extraBonus;
        document.getElementById('earnings-bonus-threshold').textContent = earnings.bonusThreshold;
        document.getElementById('earnings-total').textContent = earnings.total;
        document.getElementById('bank-before').textContent = previousCoins;
        document.getElementById('bank-after').textContent = runState.coins;

        // Show/hide extra bonus row based on whether there's a bonus
        const extraBonusRow = document.getElementById('earnings-extra-row');
        if (extraBonusRow) {
            extraBonusRow.style.display = earnings.extraBonus > 0 ? 'flex' : 'none';
        }

        // Show/hide Salary Bump row based on whether player has the rogue
        const salaryBumpRow = document.getElementById('earnings-salary-bump-row');
        if (salaryBumpRow) {
            salaryBumpRow.style.display = earnings.salaryBumpBonus > 0 ? 'flex' : 'none';
        }

        // Update coin display in header
        this.updateCoinDisplay();

        // Show earnings screen
        earningsScreen.classList.remove('hidden');

        // Animate bank counter
        this.animateBankCounter(previousCoins, runState.coins);
    },

    // Handle Continue button from earnings screen
    continueFromEarnings() {
        this.hideAllRunPopups();
        this.showShopScreen();  // Always show shop after earnings
    },

    // ========================================================================
    // SHOP SYSTEM
    // ========================================================================

    // Shop state (reset each shop visit)
    shopTiles: [],           // The 2 tiles offered this visit
    shopTileTypes: [],       // Type of each tile: 'buffed' (+1 point) or 'coin' ($1 when played)
    shopPurchased: [false, false],  // Which tiles have been purchased
    pendingReplacementTileIndex: null,  // Index of tile being purchased via Replace (waiting for bag selection)

    // Generate random tiles for shop based on Scrabble distribution
    generateShopTiles() {
        // Build weighted array from distribution
        const weightedTiles = [];
        for (const [letter, count] of Object.entries(TILE_DISTRIBUTION)) {
            for (let i = 0; i < count; i++) {
                weightedTiles.push(letter);
            }
        }

        // Sanity check - if no tiles available, use fallback
        if (weightedTiles.length === 0) {
            console.error('[Shop] TILE_DISTRIBUTION is empty, using fallback');
            weightedTiles.push('E', 'A', 'I', 'O', 'N', 'R', 'T', 'L', 'S');
        }

        // Pick 2 random tiles
        this.shopTiles = [
            weightedTiles[Math.floor(Math.random() * weightedTiles.length)],
            weightedTiles[Math.floor(Math.random() * weightedTiles.length)]
        ];

        // Randomly assign tile types with weighted distribution
        // buffed (+1 point): 40%, coin ($1 when played): 40%, pink (1.5× word): 20%
        const pickTileType = () => {
            const roll = Math.random();
            if (roll < 0.4) return 'buffed';
            if (roll < 0.8) return 'coin';
            return 'pink';
        };
        this.shopTileTypes = [pickTileType(), pickTileType()];

        // Validate tiles - if undefined or empty, use fallback
        for (let i = 0; i < this.shopTiles.length; i++) {
            if (!this.shopTiles[i]) {
                console.error(`[Shop] Tile ${i} is invalid: "${this.shopTiles[i]}", using 'E'`);
                this.shopTiles[i] = 'E';
            }
        }

        console.log('[Shop] Generated tiles:', this.shopTiles, 'types:', this.shopTileTypes);
        this.shopPurchased = [false, false];

        // Persist to runState for refresh survival
        runState.shopTiles = this.shopTiles.slice();
        runState.shopTileTypes = this.shopTileTypes.slice();
        runState.shopPurchased = this.shopPurchased.slice();
    },

    // Generate 3 random rogues for shop (picks from unowned rogues)
    generateShopRogues() {
        // If player has max rogues, no rogues available
        if (runState.rogues.length >= runState.maxRogueSlots) {
            runState.shopRogues = [null, null, null];
            runState.shopRoguesPurchased = [false, false, false];
            return;
        }

        // Get list of unowned rogues
        const ownedRogues = runState.rogues || [];
        const availableRogues = Object.keys(ROGUES).filter(id => !ownedRogues.includes(id));

        if (availableRogues.length === 0) {
            // Player owns all rogues
            runState.shopRogues = [null, null, null];
            runState.shopRoguesPurchased = [false, false, false];
            return;
        }

        // Shuffle available rogues and pick up to 3
        const shuffled = [...availableRogues].sort(() => Math.random() - 0.5);
        runState.shopRogues = [
            shuffled[0] || null,
            shuffled[1] || null,
            shuffled[2] || null
        ];
        runState.shopRoguesPurchased = [false, false, false];
        console.log('[Shop] Generated rogues:', runState.shopRogues);
    },

    // Show the shop screen
    showShopScreen() {
        // Check if we have persisted shop tiles (from refresh)
        if (runState.shopTiles && runState.shopTiles.length === 2) {
            console.log('[Shop] Restoring persisted tiles:', runState.shopTiles, 'types:', runState.shopTileTypes);
            this.shopTiles = runState.shopTiles.slice();
            this.shopTileTypes = runState.shopTileTypes ? runState.shopTileTypes.slice() : ['buffed', 'buffed'];
            this.shopPurchased = runState.shopPurchased ? runState.shopPurchased.slice() : [false, false];
        } else {
            // Generate fresh tiles for this shop visit
            this.generateShopTiles();
        }

        // Generate rogue offerings if not already persisted
        const hasPersistedRogues = runState.shopRogues && runState.shopRogues.some(b => b !== null);
        const allPurchased = runState.shopRoguesPurchased && runState.shopRoguesPurchased.every(p => p);
        if (!hasPersistedRogues && !allPurchased) {
            this.generateShopRogues();
        }

        // Track that we're showing the shop (survives refresh)
        runState.pendingScreen = 'shop';
        this.saveRunState();

        // Hide game container, show shop screen
        document.getElementById('game-container')?.classList.add('hidden');
        const shopScreen = document.getElementById('shop-screen');
        if (!shopScreen) return;

        // Update coin display
        document.getElementById('shop-coins').textContent = runState.coins;

        // Update pool count
        const poolCount = 100 + (runState.purchasedTiles?.length || 0);
        document.getElementById('shop-pool-count').textContent = poolCount;

        // Update tile displays
        for (let i = 0; i < 2; i++) {
            const tile = this.shopTiles[i];
            const tileType = this.shopTileTypes[i] || 'buffed';
            const isBlank = tile === '_';
            const isCoinTile = tileType === 'coin';
            const isPinkTile = tileType === 'pink';
            const isBuffedTile = tileType === 'buffed';
            const baseScore = TILE_SCORES[tile] || 0;
            // Buffed tiles get +1 bonus, coin/pink tiles show base score
            // Blanks don't get +1 bonus (they're already powerful)
            const displayScore = isBlank ? 0 : (isBuffedTile ? baseScore + 1 : baseScore);
            const option = document.getElementById(`shop-tile-${i}`);
            const tileDisplay = document.getElementById(`shop-tile-display-${i}`);

            // Pricing: buffed = $1/$2, coin = $2/$3, pink = $3/$4
            const addCost = isPinkTile ? 3 : (isCoinTile ? 2 : 1);
            const replaceCost = isPinkTile ? 4 : (isCoinTile ? 3 : 2);

            // IMPORTANT: Reset classes FIRST before setting text content
            // The 'purchased' class sets width:0 and overflow:hidden which can prevent text rendering
            // We also disable transitions temporarily to avoid rendering issues
            if (option) {
                option.classList.add('no-transition');
                option.classList.remove('purchased', 'cannot-afford', 'cannot-afford-add', 'cannot-afford-replace');
                // Force reflow to apply changes immediately
                void option.offsetHeight;
            }

            // Reset inline styles that may have been set by purchase animation
            // The animation sets style.opacity = '0' which persists
            if (tileDisplay) {
                tileDisplay.style.opacity = '1';  // Force visible
                tileDisplay.style.transform = '';  // Clear any transform
                const letterContent = isBlank ? '' : tile;
                const scoreContent = isBlank ? '' : displayScore;
                // Add indicator for special tiles
                let indicator = '';
                if (isCoinTile) {
                    indicator = '<span class="tile-coin-indicator">$1</span>';
                } else if (isPinkTile) {
                    indicator = '<span class="tile-pink-indicator">×1.5</span>';
                }
                tileDisplay.innerHTML = `<span class="tile-letter" id="shop-tile-letter-${i}">${letterContent}</span><span class="tile-score" id="shop-tile-score-${i}">${scoreContent}</span>${indicator}`;
            }

            // Log for debugging
            console.log(`[Shop] Setting tile ${i}: letter="${tile}", type=${tileType}, score=${displayScore}, isBlank=${isBlank}`);

            // Toggle tile styling based on type
            if (tileDisplay) {
                tileDisplay.classList.remove('buffed-tile', 'coin-tile', 'pink-tile');
                if (!isBlank) {
                    if (isPinkTile) {
                        tileDisplay.classList.add('pink-tile');
                    } else if (isCoinTile) {
                        tileDisplay.classList.add('coin-tile');
                    } else {
                        tileDisplay.classList.add('buffed-tile');
                    }
                }
            }

            // Update the label based on tile type (hide for blanks)
            const buffLabel = document.getElementById(`shop-buff-label-${i}`);
            if (buffLabel) {
                if (isBlank) {
                    buffLabel.style.visibility = 'hidden';
                } else {
                    buffLabel.style.visibility = 'visible';
                    if (isPinkTile) {
                        buffLabel.textContent = '×1.5 word';
                        buffLabel.style.color = '#ff69b4';  // Pink color
                    } else if (isCoinTile) {
                        buffLabel.textContent = '$1 on play';
                        buffLabel.style.color = 'var(--success-color)';
                    } else {
                        buffLabel.textContent = '+1 value';
                        buffLabel.style.color = '#ffd700';
                    }
                }
            }

            // Update button labels with correct pricing
            const addBtn = document.getElementById(`shop-add-${i}`);
            const replaceBtn = document.getElementById(`shop-replace-${i}`);

            if (addBtn) addBtn.textContent = `Add $${addCost}`;
            if (replaceBtn) replaceBtn.textContent = `Replace $${replaceCost}`;

            // Check affordability based on tile type pricing
            if (runState.coins < addCost) {
                addBtn?.classList.add('cannot-afford');
                if (addBtn) addBtn.title = 'Not enough coins';
            } else {
                addBtn?.classList.remove('cannot-afford');
                if (addBtn) addBtn.title = '';
            }

            if (runState.coins < replaceCost) {
                replaceBtn?.classList.add('cannot-afford');
                if (replaceBtn) replaceBtn.title = 'Not enough coins';
            } else {
                replaceBtn?.classList.remove('cannot-afford');
                if (replaceBtn) replaceBtn.title = '';
            }
        }

        shopScreen.classList.remove('hidden');

        // Check if using compact layout
        const isCompactLayout = document.querySelector('.shop-compact') !== null;

        if (isCompactLayout) {
            // Use compact rendering
            this.renderCompactShopTiles();
            this.renderCompactShopRogues();
        } else {
            // Re-enable transitions after a frame (allows instant reset to complete)
            requestAnimationFrame(() => {
                document.getElementById('shop-tile-0')?.classList.remove('no-transition');
                document.getElementById('shop-tile-1')?.classList.remove('no-transition');
            });

            // Render tile set upgrade section
            this.renderTileSetUpgrade();

            // Render rogue section
            this.renderShopRogueSection();
        }
    },

    // Get tile set upgrade price: $3, $4, $5, $7, $10, then +$3 each
    getTileSetUpgradePrice() {
        const count = runState.tileSetUpgradeCount || 0;
        const prices = [3, 4, 5, 7, 10]; // First 5 prices
        if (count < prices.length) {
            return prices[count];
        }
        // After 5th upgrade: $10 + $3 per additional upgrade
        return 10 + (count - 4) * 3;
    },

    // 1-point letters that can be upgraded (each can only be upgraded once)
    ONE_POINT_LETTERS: ['E', 'A', 'I', 'O', 'N', 'R', 'T', 'L', 'S', 'U'],

    // Get letters that haven't been upgraded yet
    getUpgradeableLetters() {
        const upgraded = Object.keys(runState.tileSetUpgrades || {});
        return this.ONE_POINT_LETTERS.filter(letter => !upgraded.includes(letter));
    },

    // Render the tile set upgrade section
    renderTileSetUpgrade() {
        const card = document.getElementById('shop-upgrade-card');
        const btn = document.getElementById('shop-upgrade-btn');
        const status = document.getElementById('shop-upgrade-status');
        const desc = document.getElementById('shop-upgrade-desc');

        if (!card || !btn) return;

        const available = this.getUpgradeableLetters();
        const count = runState.tileSetUpgradeCount || 0;
        const soldOut = available.length === 0;

        if (soldOut) {
            // All 1-point letters upgraded
            btn.textContent = 'MAXED';
            btn.disabled = true;
            btn.classList.add('cannot-afford');
            card.classList.add('sold-out');
            desc.textContent = 'All 1-point tiles upgraded!';
        } else {
            const price = this.getTileSetUpgradePrice();
            const canAfford = runState.coins >= price;

            btn.textContent = `$${price}`;
            btn.disabled = !canAfford;
            card.classList.remove('sold-out');

            if (canAfford) {
                btn.classList.remove('cannot-afford');
                card.classList.remove('cannot-afford');
            } else {
                btn.classList.add('cannot-afford');
                card.classList.add('cannot-afford');
            }

            desc.textContent = `+1 to all of a random 1-pt letter (${available.length} left)`;
        }

        // Update status - show upgraded letters
        if (count > 0) {
            const upgradedLetters = Object.keys(runState.tileSetUpgrades || {}).sort().join(', ');
            status.textContent = `Upgraded: ${upgradedLetters}`;
        } else {
            status.textContent = 'No upgrades yet';
        }
    },

    // Purchase a tile set upgrade
    purchaseTileSetUpgrade() {
        bottomSheet.hide();  // Close bottom sheet if open
        const available = this.getUpgradeableLetters();
        if (available.length === 0) return; // All upgraded

        const price = this.getTileSetUpgradePrice();
        if (runState.coins < price) return;

        // Pick a random un-upgraded 1-point letter
        const letter = available[Math.floor(Math.random() * available.length)];

        // Apply upgrade (each letter only gets +1, tracked as upgraded)
        runState.coins -= price;
        runState.tileSetUpgradeCount = (runState.tileSetUpgradeCount || 0) + 1;
        if (!runState.tileSetUpgrades) runState.tileSetUpgrades = {};
        runState.tileSetUpgrades[letter] = 1; // All tiles of this letter now +1

        console.log(`[Shop] Tile upgrade: All ${letter}s now +1 (upgrade #${runState.tileSetUpgradeCount}), cost $${price}`);

        // Update displays
        document.getElementById('shop-coins').textContent = runState.coins;
        this.updateCoinDisplay();  // Update header coin display
        this.renderTileSetUpgrade();
        this.renderCompactShopTiles();  // Update compact shop display

        // Refresh all visible tile scores to show new values
        this.refreshAllTileScores();

        this.saveRunState();
    },

    // Refresh all visible tile score displays (after tile set upgrade or rogue change)
    refreshAllTileScores() {
        // Update rack tiles
        document.querySelectorAll('#rack .tile').forEach(tile => {
            const letter = tile.dataset.letter;
            const bonus = parseInt(tile.dataset.bonus) || 0;
            const scoreEl = tile.querySelector('.tile-score');
            if (scoreEl && letter && letter !== '_') {
                scoreEl.textContent = getTileDisplayScore(letter, bonus);
            }
        });

        // Update board tiles
        document.querySelectorAll('.board-cell .tile').forEach(tile => {
            const letter = tile.dataset.letter;
            const bonus = parseInt(tile.dataset.bonus) || 0;
            const scoreEl = tile.querySelector('.tile-score');
            if (scoreEl && letter && letter !== '_') {
                scoreEl.textContent = getTileDisplayScore(letter, bonus);
            }
        });

        // Update shop tile displays if visible
        for (let i = 0; i < 2; i++) {
            const scoreEl = document.getElementById(`shop-tile-score-${i}`);
            const letterEl = document.getElementById(`shop-tile-letter-${i}`);
            if (scoreEl && letterEl) {
                const letter = letterEl.textContent;
                const tileDisplay = document.getElementById(`shop-tile-display-${i}`);
                const bonus = tileDisplay?.dataset.bonus ? parseInt(tileDisplay.dataset.bonus) : 0;
                if (letter && letter !== '?') {
                    scoreEl.textContent = getTileDisplayScore(letter, bonus);
                }
            }
        }
    },

    // Render the rogue section in the shop (3 rogue slots)
    renderShopRogueSection() {
        const rogueSection = document.getElementById('shop-rogue-section');
        const rogueCardsContainer = document.getElementById('shop-rogue-cards');
        const rogueStatus = document.getElementById('shop-rogue-status');

        if (!rogueSection || !rogueCardsContainer) return;

        rogueSection.classList.remove('hidden');

        // Check if player has max rogues
        if (runState.rogues.length >= runState.maxRogueSlots) {
            rogueCardsContainer.innerHTML = '';
            rogueStatus.textContent = `Rogue inventory full (${runState.rogues.length}/${runState.maxRogueSlots})`;
            return;
        }

        // Check if no rogues available (all owned)
        const hasAnyRogue = runState.shopRogues && runState.shopRogues.some(b => b !== null);
        if (!hasAnyRogue) {
            rogueCardsContainer.innerHTML = '';
            rogueStatus.textContent = 'No rogues available';
            return;
        }

        rogueStatus.textContent = `Owned: ${runState.rogues.length}/${runState.maxRogueSlots}`;

        // Render 3 rogue cards
        rogueCardsContainer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const rogueId = runState.shopRogues[i];
            const purchased = runState.shopRoguesPurchased[i];

            // Create card element
            const card = document.createElement('div');
            card.className = 'shop-rogue-card';
            card.dataset.index = i;

            if (!rogueId) {
                // Empty slot
                card.classList.add('empty-slot');
                card.innerHTML = '<span class="empty-slot-text">—</span>';
            } else if (purchased) {
                // Already purchased
                card.classList.add('purchased');
                const rogue = ROGUES[rogueId];
                card.innerHTML = `
                    <div class="rogue-card-left">
                        <span class="rogue-icon">${rogue.icon}</span>
                        <div class="rogue-info">
                            <span class="rogue-name">${rogue.name}</span>
                            <span class="rogue-desc">${rogue.description}</span>
                        </div>
                    </div>
                    <span class="shop-rogue-sold">SOLD</span>
                `;
            } else {
                // Available for purchase
                const rogue = ROGUES[rogueId];
                const price = getRoguePrice(rogueId);
                const canAfford = runState.coins >= price;

                card.innerHTML = `
                    <div class="rogue-card-left">
                        <span class="rogue-icon">${rogue.icon}</span>
                        <div class="rogue-info">
                            <span class="rogue-name">${rogue.name}</span>
                            <span class="rogue-desc">${rogue.description}</span>
                        </div>
                    </div>
                    <button class="shop-rogue-buy-btn ${canAfford ? '' : 'cannot-afford'}"
                            data-index="${i}" ${canAfford ? '' : 'disabled'}>
                        Buy $${price}
                    </button>
                `;

                // Add click handler for buy button
                const buyBtn = card.querySelector('.shop-rogue-buy-btn');
                if (buyBtn) {
                    buyBtn.addEventListener('click', () => this.purchaseRogue(i));
                }
            }

            rogueCardsContainer.appendChild(card);
        }
    },

    // Purchase a shop rogue by index (0, 1, or 2)
    purchaseRogue(index) {
        bottomSheet.hide();  // Close bottom sheet if open
        const rogueId = runState.shopRogues[index];
        if (!rogueId || runState.shopRoguesPurchased[index]) return;

        const price = getRoguePrice(rogueId);
        if (runState.coins < price) return;

        // If at max rogues, show discard modal instead of blocking
        if (runState.rogues.length >= runState.maxRogueSlots) {
            runState.pendingRoguePurchase = { rogueId, shopIndex: index, price };
            this.saveRunState();
            this.showRogueDiscardModal(rogueId);
            return;
        }

        // Deduct coins and add rogue
        runState.coins -= price;
        runState.rogues.push(rogueId);
        runState.shopRoguesPurchased[index] = true;

        console.log('[Shop] Purchased rogue:', rogueId, 'for $' + price);
        this.saveRunState();

        // Update displays
        document.getElementById('shop-coins').textContent = runState.coins;
        this.updateCoinDisplay();  // Update header coin display
        this.renderShopRogueSection();
        this.renderCompactShopRogues();  // Update compact shop display
        this.renderRogueInventory();
    },

    // Show discard modal when trying to purchase at max capacity
    showRogueDiscardModal(newRogueId) {
        const newRogue = ROGUES[newRogueId];
        if (!newRogue) return;

        const modal = document.getElementById('rogue-discard-modal');
        if (!modal) return;

        // Show the new rogue being purchased
        const newRogueCard = document.getElementById('rogue-discard-new');
        newRogueCard.innerHTML = `
            <span class="rogue-icon">${newRogue.icon}</span>
            <div class="rogue-info">
                <span class="rogue-name">${newRogue.name}</span>
                <span class="rogue-desc">${newRogue.description}</span>
            </div>
        `;

        // Show current rogues as discard options
        const slotsContainer = document.getElementById('rogue-discard-slots');
        slotsContainer.innerHTML = '';

        for (const ownedRogueId of runState.rogues) {
            const rogue = ROGUES[ownedRogueId];
            if (!rogue) continue;

            const slot = document.createElement('div');
            slot.className = 'rogue-discard-slot';
            slot.dataset.rogueId = ownedRogueId;
            slot.innerHTML = `
                <div class="rogue-card-left">
                    <span class="rogue-icon">${rogue.icon}</span>
                    <div class="rogue-info">
                        <span class="rogue-name">${rogue.name}</span>
                        <span class="rogue-desc">${rogue.description}</span>
                    </div>
                </div>
                <span class="discard-label">DISCARD</span>
            `;

            slot.addEventListener('click', () => {
                this.completeRoguePurchaseWithDiscard(ownedRogueId);
            });

            slotsContainer.appendChild(slot);
        }

        modal.style.display = 'flex';
    },

    // Hide the discard modal
    hideRogueDiscardModal() {
        const modal = document.getElementById('rogue-discard-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        // Clear pending purchase if canceled
        runState.pendingRoguePurchase = null;
        this.saveRunState();
    },

    // Complete purchase after selecting a rogue to discard
    completeRoguePurchaseWithDiscard(discardRogueId) {
        const pending = runState.pendingRoguePurchase;
        if (!pending) return;

        // Remove the discarded rogue
        const discardIndex = runState.rogues.indexOf(discardRogueId);
        if (discardIndex === -1) return;
        runState.rogues.splice(discardIndex, 1);

        // Deduct coins and add new rogue
        runState.coins -= pending.price;
        runState.rogues.push(pending.rogueId);
        runState.shopRoguesPurchased[pending.shopIndex] = true;

        console.log('[Shop] Purchased rogue:', pending.rogueId, 'for $' + pending.price, '(discarded:', discardRogueId + ')');

        // Clear pending and save
        runState.pendingRoguePurchase = null;
        this.saveRunState();

        // Hide modal and update displays
        this.hideRogueDiscardModal();
        document.getElementById('shop-coins').textContent = runState.coins;
        this.updateCoinDisplay();  // Update header coin display
        this.renderShopRogueSection();
        this.renderCompactShopRogues();  // Update compact shop display
        this.renderRogueInventory();
    },

    // Render rogue inventory display (below rack during gameplay)
    renderRogueInventory() {
        const container = document.getElementById('rogue-inventory');
        const slotsContainer = document.getElementById('rogue-slots');
        if (!container || !slotsContainer) return;

        // Only show in run mode
        if (!runState.isRunMode) {
            container.classList.add('hidden');
            return;
        }

        // Show container
        container.classList.remove('hidden');

        // Build slots HTML
        let html = '';
        for (let i = 0; i < runState.maxRogueSlots; i++) {
            const rogueId = runState.rogues[i];
            if (rogueId && ROGUES[rogueId]) {
                const rogue = ROGUES[rogueId];
                html += `<div class="rogue-slot filled" data-rogue-id="${rogueId}" title="${rogue.name}: ${rogue.description}">
                    <span class="rogue-slot-icon">${rogue.icon}</span>
                </div>`;
            } else {
                html += `<div class="rogue-slot empty"></div>`;
            }
        }
        slotsContainer.innerHTML = html;

        // Add click handlers for filled slots
        slotsContainer.querySelectorAll('.rogue-slot.filled').forEach(slot => {
            slot.addEventListener('click', () => {
                const rogueId = slot.dataset.rogueId;
                if (rogueId) this.showRogueDetails(rogueId);
            });
        });

        // Update Top Deck display if that rogue is active
        this.renderTopDeck();
    },

    // ========================================================================
    // COMPACT SHOP LAYOUT (Bottom Sheet Interactions)
    // ========================================================================

    // Set up click handlers for compact shop items
    setupCompactShopHandlers() {
        // Tile items (2 tiles + upgrade)
        for (let i = 0; i < 2; i++) {
            const item = document.getElementById(`shop-tile-${i}`);
            if (item) {
                item.addEventListener('click', () => this.showTileBottomSheet(i));
            }
        }

        // Upgrade item
        const upgradeItem = document.getElementById('shop-upgrade-item');
        if (upgradeItem) {
            upgradeItem.addEventListener('click', () => this.showUpgradeBottomSheet());
        }

        // Rogue items
        for (let i = 0; i < 3; i++) {
            const item = document.getElementById(`shop-rogue-${i}`);
            if (item) {
                item.addEventListener('click', () => this.showRogueBottomSheet(i));
            }
        }

        // Bag icon in shop
        const bagBtn = document.getElementById('shop-bag-btn');
        if (bagBtn) {
            bagBtn.addEventListener('click', () => showBagViewer());
        }
    },

    // Render compact shop tiles (2 tiles + upgrade)
    renderCompactShopTiles() {
        for (let i = 0; i < 2; i++) {
            const tile = this.shopTiles[i];
            const tileType = this.shopTileTypes[i] || 'buffed';
            const purchased = this.shopPurchased[i];
            const isBlank = tile === '_';
            const isCoinTile = tileType === 'coin';
            const isPinkTile = tileType === 'pink';
            const isBuffedTile = tileType === 'buffed';
            const baseScore = TILE_SCORES[tile] || 0;
            const displayScore = isBlank ? 0 : (isBuffedTile ? baseScore + 1 : baseScore);

            const item = document.getElementById(`shop-tile-${i}`);
            const tileDisplay = document.getElementById(`shop-tile-display-${i}`);
            const label = document.getElementById(`shop-buff-label-${i}`);

            if (!item || !tileDisplay) continue;

            // Reset and update tile display
            tileDisplay.classList.remove('buffed-tile', 'coin-tile', 'pink-tile');
            if (!isBlank) {
                if (isPinkTile) tileDisplay.classList.add('pink-tile');
                else if (isCoinTile) tileDisplay.classList.add('coin-tile');
                else tileDisplay.classList.add('buffed-tile');
            }

            // Update tile content
            let indicator = '';
            if (isCoinTile) indicator = '<span class="tile-coin-indicator">$1</span>';
            else if (isPinkTile) indicator = '<span class="tile-pink-indicator">×1.5</span>';

            tileDisplay.innerHTML = `
                <span class="tile-letter">${isBlank ? '' : tile}</span>
                <span class="tile-score">${isBlank ? '' : displayScore}</span>
                ${indicator}
            `;

            // Update label
            if (label) {
                if (isBlank) {
                    label.textContent = 'Blank';
                    label.style.color = 'var(--text-muted)';
                } else if (isPinkTile) {
                    label.textContent = '×1.5';
                    label.style.color = '#ff69b4';
                } else if (isCoinTile) {
                    label.textContent = '$1';
                    label.style.color = 'var(--success-color)';
                } else {
                    label.textContent = '+1';
                    label.style.color = '#ffd700';
                }
            }

            // Update purchased state
            item.classList.toggle('purchased', purchased);

            // Check affordability
            const addCost = isPinkTile ? 3 : (isCoinTile ? 2 : 1);
            item.classList.toggle('cannot-afford', !purchased && runState.coins < addCost);
        }

        // Update upgrade item
        const upgradeItem = document.getElementById('shop-upgrade-item');
        if (upgradeItem) {
            const available = this.getUpgradeableLetters();
            const soldOut = available.length === 0;
            const price = this.getTileSetUpgradePrice();

            upgradeItem.classList.toggle('purchased', soldOut);
            upgradeItem.classList.toggle('cannot-afford', !soldOut && runState.coins < price);

            const label = upgradeItem.querySelector('.shop-item-label');
            if (label) {
                label.textContent = soldOut ? 'Maxed' : 'Upgrade';
            }
        }
    },

    // Render compact shop rogues (3 icons)
    renderCompactShopRogues() {
        for (let i = 0; i < 3; i++) {
            const rogueId = runState.shopRogues?.[i];
            const purchased = runState.shopRoguesPurchased?.[i];
            const item = document.getElementById(`shop-rogue-${i}`);
            const iconEl = document.getElementById(`shop-rogue-icon-${i}`);
            const priceEl = document.getElementById(`shop-rogue-price-${i}`);

            if (!item) continue;

            if (!rogueId) {
                // Empty slot
                item.classList.add('empty-slot');
                item.classList.remove('purchased', 'cannot-afford');
                if (iconEl) iconEl.textContent = '—';
                if (priceEl) priceEl.textContent = '';
            } else if (purchased) {
                // Purchased
                item.classList.add('purchased');
                item.classList.remove('empty-slot', 'cannot-afford');
                const rogue = ROGUES[rogueId];
                if (iconEl) iconEl.textContent = rogue?.icon || '?';
                if (priceEl) priceEl.textContent = '✓';
            } else {
                // Available
                item.classList.remove('empty-slot', 'purchased');
                const rogue = ROGUES[rogueId];
                const price = getRoguePrice(rogueId);
                if (iconEl) iconEl.textContent = rogue?.icon || '?';
                if (priceEl) priceEl.textContent = `$${price}`;
                item.classList.toggle('cannot-afford', runState.coins < price);
            }
        }
    },

    // Show bottom sheet for tile purchase
    showTileBottomSheet(index) {
        const tile = this.shopTiles[index];
        const tileType = this.shopTileTypes[index] || 'buffed';
        const purchased = this.shopPurchased[index];

        if (purchased) return;

        const isBlank = tile === '_';
        const isCoinTile = tileType === 'coin';
        const isPinkTile = tileType === 'pink';
        const isBuffedTile = tileType === 'buffed';
        const baseScore = TILE_SCORES[tile] || 0;
        const displayScore = isBlank ? 0 : (isBuffedTile ? baseScore + 1 : baseScore);

        // Pricing
        const addCost = isPinkTile ? 3 : (isCoinTile ? 2 : 1);
        const replaceCost = isPinkTile ? 4 : (isCoinTile ? 3 : 2);
        const canAffordAdd = runState.coins >= addCost;
        const canAffordReplace = runState.coins >= replaceCost;

        // Build description
        let desc = '';
        if (isBlank) {
            desc = 'A blank tile - can be any letter when played.';
        } else if (isPinkTile) {
            desc = `${tile} tile with ×1.5 word multiplier when played.`;
        } else if (isCoinTile) {
            desc = `${tile} tile that earns $1 when played.`;
        } else {
            desc = `${tile} tile with +1 bonus (${baseScore}→${displayScore} points).`;
        }

        bottomSheet.show({
            icon: isBlank ? '▢' : tile,
            title: isBlank ? 'Blank Tile' : `${tile} Tile`,
            description: desc,
            detail: 'Add to your bag, or replace a random base tile.',
            actions: [
                {
                    label: `Add $${addCost}`,
                    class: 'bottom-sheet-btn-primary',
                    cannotAfford: !canAffordAdd,
                    disabled: !canAffordAdd,
                    onClick: () => this.purchaseTile(index, 'add')
                },
                {
                    label: `Replace $${replaceCost}`,
                    class: 'bottom-sheet-btn-secondary',
                    cannotAfford: !canAffordReplace,
                    disabled: !canAffordReplace,
                    onClick: () => this.purchaseTile(index, 'replace')
                }
            ]
        });
    },

    // Show bottom sheet for upgrade purchase
    showUpgradeBottomSheet() {
        const available = this.getUpgradeableLetters();
        const soldOut = available.length === 0;

        if (soldOut) return;

        const price = this.getTileSetUpgradePrice();
        const canAfford = runState.coins >= price;
        const count = runState.tileSetUpgradeCount || 0;

        // Show current upgrades
        const upgrades = runState.tileSetUpgrades || {};
        const upgradeList = Object.entries(upgrades)
            .map(([letter, bonus]) => `${letter}(+${bonus})`)
            .join(', ') || 'None yet';

        bottomSheet.show({
            icon: '⬆️',
            title: 'Upgrade Tile Set',
            description: `Permanently +1 to a random common letter (${available.join(', ')}).`,
            detail: `Current upgrades: ${upgradeList}`,
            actions: [
                {
                    label: `Buy $${price}`,
                    class: 'bottom-sheet-btn-primary',
                    cannotAfford: !canAfford,
                    disabled: !canAfford,
                    onClick: () => this.purchaseTileSetUpgrade()
                }
            ]
        });
    },

    // Purchase tile via bottom sheet (wrapper for add/replace)
    purchaseTile(index, mode) {
        bottomSheet.hide();
        if (mode === 'add') {
            this.purchaseTileAdd(index);
        } else {
            this.purchaseTileReplace(index);
        }
        // Note: renderCompactShopTiles() is called in updateShopAfterPurchase()
        // after the animation completes
    },

    // Show bottom sheet for rogue purchase
    showRogueBottomSheet(index) {
        const rogueId = runState.shopRogues?.[index];
        const purchased = runState.shopRoguesPurchased?.[index];

        if (!rogueId || purchased) return;

        const rogue = ROGUES[rogueId];
        if (!rogue) return;

        const price = getRoguePrice(rogueId);
        const canAfford = runState.coins >= price;
        const atMaxRogues = runState.rogues.length >= runState.maxRogueSlots;

        bottomSheet.show({
            icon: rogue.icon,
            title: rogue.name,
            description: rogue.description,
            detail: atMaxRogues ? 'Inventory full - will replace a rogue' : '',
            actions: [
                {
                    label: `Buy $${price}`,
                    class: 'bottom-sheet-btn-primary',
                    cannotAfford: !canAfford,
                    disabled: !canAfford,
                    onClick: () => this.purchaseRogue(index)
                }
            ]
        });
    },

    // Show rogue details modal
    showRogueDetails(rogueId) {
        const rogue = ROGUES[rogueId];
        if (!rogue) return;

        // Check if we're in shop context (can discard)
        const inShopContext = document.getElementById('shop-screen')?.style.display !== 'none';

        const options = {
            icon: rogue.icon,
            title: rogue.name,
            description: rogue.description,
            actions: []
        };

        // Only show discard button in shop context
        if (inShopContext) {
            options.actions.push({
                label: 'Discard',
                class: 'bottom-sheet-btn-danger',
                onClick: () => this.discardRogue(rogueId)
            });
        }

        bottomSheet.show(options);
    },

    // Hide rogue details modal (legacy - now uses bottom sheet)
    hideRogueModal() {
        bottomSheet.hide();
    },

    // Discard a rogue from inventory
    discardRogue(rogueId) {
        const index = runState.rogues.indexOf(rogueId);
        if (index === -1) return;

        runState.rogues.splice(index, 1);
        console.log('[Rogue] Discarded:', rogueId);
        this.saveRunState();

        this.hideRogueModal();
        this.renderRogueInventory();
    },

    // Animate rogues that triggered on the current word
    animateTriggeredRogues(positions) {
        if (!runState.isRunMode || runState.rogues.length === 0) return;

        // Collect word data needed to check rogue triggers
        const wordLetters = positions.map(({ row, col }) => gameState.board[row][col]);
        const vowelsWithY = ['A', 'E', 'I', 'O', 'U', 'Y'];
        const vowelCount = wordLetters.filter(l => vowelsWithY.includes(l)).length;

        // Count buffed tiles
        let buffedTileCount = 0;
        positions.forEach(({ row, col }) => {
            const placedTile = gameState.placedTiles.find(t => t.row === row && t.col === col);
            if (placedTile?.bonus > 0) {
                buffedTileCount++;
            } else {
                const cell = document.querySelector(`.board-cell[data-row="${row}"][data-col="${col}"]`);
                const tileEl = cell?.querySelector('.tile');
                if (tileEl?.dataset.bonus && parseInt(tileEl.dataset.bonus) > 0) {
                    buffedTileCount++;
                }
            }
        });

        // Count double letter pairs
        let doublePairs = 0;
        for (let i = 0; i < wordLetters.length - 1; i++) {
            if (wordLetters[i] === wordLetters[i + 1]) {
                doublePairs++;
                i++;
            }
        }

        // Count DL/TL squares used
        let letterSquaresUsed = 0;
        positions.forEach(({ row, col }) => {
            const isNew = gameState.placedTiles.some(t => t.row === row && t.col === col);
            if (isNew) {
                const cellType = getCellType(row, col);
                if (cellType === 'double-letter' || cellType === 'triple-letter') {
                    letterSquaresUsed++;
                }
            }
        });

        // Count new letters for All-Round Letter
        let newLetterCount = 0;
        if (runState.lettersPlayedThisCycle) {
            wordLetters.forEach(letter => {
                if (!runState.lettersPlayedThisCycle.has(letter)) {
                    newLetterCount++;
                }
            });
        }

        // Check which rogues would trigger
        const triggeredRogues = [];

        // Check each possible rogue
        if (hasRogue('vowelBonus')) triggeredRogues.push('vowelBonus'); // Always triggers if any vowels
        if (hasRogue('endlessPower')) triggeredRogues.push('endlessPower'); // Always triggers
        if (hasRogue('loneRanger') && vowelCount === 1) triggeredRogues.push('loneRanger');
        if (hasRogue('highValue') && buffedTileCount > 0) triggeredRogues.push('highValue');
        if (hasRogue('wolfPack') && doublePairs > 0) triggeredRogues.push('wolfPack');
        if (hasRogue('worder') && letterSquaresUsed > 0) triggeredRogues.push('worder');
        if (hasRogue('allRoundLetter') && newLetterCount > 0) triggeredRogues.push('allRoundLetter');

        // Check bingo for bingoWizard
        const rackSize = getRackSize();
        // Bingo Wizard: always 6 tiles for bingo (not relative to rack size)
        const bingoThreshold = hasRogue('bingoWizard') ? 6 : rackSize;
        if (hasRogue('bingoWizard') && gameState.placedTiles.length >= bingoThreshold) {
            triggeredRogues.push('bingoWizard');
        }

        // Animate the triggered rogue slots
        triggeredRogues.forEach(rogueId => {
            const slot = document.querySelector(`.rogue-slot[data-rogue-id="${rogueId}"]`);
            if (slot) {
                // Remove class first to allow re-triggering
                slot.classList.remove('triggered');
                // Force reflow
                void slot.offsetWidth;
                // Add class to trigger animation
                slot.classList.add('triggered');
            }
        });
    },

    // Render Top Deck display (shows most likely next tiles from bag)
    renderTopDeck() {
        const container = document.getElementById('top-deck-display');
        const tilesContainer = document.getElementById('top-deck-tiles');
        if (!container || !tilesContainer) return;

        // Only show if Top Deck rogue is active and in run mode
        if (!hasRogue('topDeck') || !runState.isRunMode) {
            container.classList.add('hidden');
            return;
        }

        // Get remaining tiles in bag
        const remaining = getRemainingTiles();

        // Build array of [letter, count] and sort by count (most common first)
        const tileEntries = Object.entries(remaining)
            .filter(([letter, count]) => count > 0)
            .sort((a, b) => b[1] - a[1]);

        // Take top 3 most common tiles
        const topTiles = tileEntries.slice(0, 3);

        // Build display
        let html = '';
        topTiles.forEach(([letter, count]) => {
            const displayLetter = letter === '_' ? '' : letter;
            const isBlank = letter === '_';
            html += `<div class="top-deck-tile${isBlank ? ' blank' : ''}" title="${count} remaining">
                <span class="top-deck-letter">${displayLetter}</span>
                <span class="top-deck-count">×${count}</span>
            </div>`;
        });

        tilesContainer.innerHTML = html;
        container.classList.remove('hidden');
    },

    // Purchase a tile via "Add" - adds to bag, costs $2/$3/$4 based on type
    purchaseTileAdd(index) {
        const tileType = this.shopTileTypes[index] || 'buffed';
        const isCoinTile = tileType === 'coin';
        const isPinkTile = tileType === 'pink';
        // Add costs: buffed = $1, coin = $2, pink = $3
        const cost = isPinkTile ? 3 : (isCoinTile ? 2 : 1);

        if (runState.coins < cost || this.shopPurchased[index]) return;

        // Deduct coins and add tile
        const tile = this.shopTiles[index];
        const isBlank = tile === '_';
        runState.coins -= cost;
        runState.purchasedTiles = runState.purchasedTiles || [];

        // Set tile properties based on type (blanks don't get bonuses)
        if (isPinkTile) {
            runState.purchasedTiles.push({
                letter: tile,
                pinkTile: true
            });
        } else if (isCoinTile) {
            runState.purchasedTiles.push({
                letter: tile,
                coinTile: true
            });
        } else {
            runState.purchasedTiles.push({
                letter: tile,
                bonus: isBlank ? 0 : 1  // +1 point value, except blanks
            });
        }

        this.shopPurchased[index] = true;
        runState.shopPurchased = this.shopPurchased.slice();  // Persist for refresh
        this.saveRunState();

        // Animate tile to bag, then update UI
        this.animateTileToBag(index).then(() => {
            this.updateShopAfterPurchase(index);
        });
    },

    // Purchase a tile via "Replace" - costs $2/$3/$4 based on type, then pick a tile to remove
    purchaseTileReplace(index) {
        const tileType = this.shopTileTypes[index] || 'buffed';
        const isCoinTile = tileType === 'coin';
        const isPinkTile = tileType === 'pink';
        // Replace costs: buffed = $2, coin = $3, pink = $4
        const cost = isPinkTile ? 4 : (isCoinTile ? 3 : 2);

        if (runState.coins < cost || this.shopPurchased[index]) return;

        // Store pending replacement and show bag viewer for selection
        this.pendingReplacementTileIndex = index;

        // Show bag viewer in "replace mode" - clicking a tile will remove it
        showBagViewerForReplacement();
    },

    // Complete the replacement after user selects a tile from bag
    completeReplacement(letterToRemove) {
        const index = this.pendingReplacementTileIndex;
        if (index === null) return;

        const tileType = this.shopTileTypes[index] || 'buffed';
        const isCoinTile = tileType === 'coin';
        const isPinkTile = tileType === 'pink';
        const cost = isPinkTile ? 5 : (isCoinTile ? 4 : 3);

        // Deduct coins and add the new tile
        const tile = this.shopTiles[index];
        const isBlank = tile === '_';
        runState.coins -= cost;
        runState.purchasedTiles = runState.purchasedTiles || [];

        // Set tile properties based on type (blanks don't get bonuses)
        if (isPinkTile) {
            runState.purchasedTiles.push({
                letter: tile,
                pinkTile: true
            });
        } else if (isCoinTile) {
            runState.purchasedTiles.push({
                letter: tile,
                coinTile: true
            });
        } else {
            runState.purchasedTiles.push({
                letter: tile,
                bonus: isBlank ? 0 : 1  // +1 point value, except blanks
            });
        }

        // Track the removed tile
        runState.removedTiles = runState.removedTiles || [];
        runState.removedTiles.push(letterToRemove);

        this.shopPurchased[index] = true;
        runState.shopPurchased = this.shopPurchased.slice();  // Persist for refresh
        this.pendingReplacementTileIndex = null;
        this.saveRunState();

        // Hide bag viewer, animate removed tile flying out, then new tile flying in
        hideBagViewer();
        this.animateTileFromBag(letterToRemove).then(() => {
            return this.animateTileToBag(index);
        }).then(() => {
            this.updateShopAfterPurchase(index);
        });
    },

    // Cancel replacement mode
    cancelReplacement() {
        this.pendingReplacementTileIndex = null;
        hideBagViewer();
    },

    // Animate tile flying to the bag icon
    animateTileToBag(index) {
        const tileEl = document.getElementById(`shop-tile-display-${index}`);
        const bagIcon = document.getElementById('bag-viewer-btn');
        if (!tileEl || !bagIcon) return Promise.resolve();

        // Get positions
        const tileRect = tileEl.getBoundingClientRect();
        const bagRect = bagIcon.getBoundingClientRect();

        // Create a clone for animation
        const clone = tileEl.cloneNode(true);
        clone.id = '';
        clone.style.position = 'fixed';
        clone.style.left = tileRect.left + 'px';
        clone.style.top = tileRect.top + 'px';
        clone.style.width = tileRect.width + 'px';
        clone.style.height = tileRect.height + 'px';
        clone.style.margin = '0';
        clone.style.zIndex = '10000';
        clone.style.pointerEvents = 'none';
        clone.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        document.body.appendChild(clone);

        // Hide original tile immediately
        tileEl.style.opacity = '0';

        // Trigger animation after a frame
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                // Calculate target position (center of bag icon)
                const targetX = bagRect.left + bagRect.width / 2 - tileRect.width / 2;
                const targetY = bagRect.top + bagRect.height / 2 - tileRect.height / 2;

                clone.style.left = targetX + 'px';
                clone.style.top = targetY + 'px';
                clone.style.transform = 'scale(0.2)';
                clone.style.opacity = '0.5';

                // Clean up after animation
                setTimeout(() => {
                    clone.remove();
                    // Brief flash on bag icon
                    bagIcon.style.transform = 'scale(1.3)';
                    setTimeout(() => {
                        bagIcon.style.transform = '';
                    }, 150);
                    resolve();
                }, 500);
            });
        });
    },

    // Animate tile flying OUT of the bag icon (for replacement removal)
    animateTileFromBag(letter) {
        const bagIcon = document.getElementById('bag-viewer-btn');
        if (!bagIcon) return Promise.resolve();

        const bagRect = bagIcon.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Create a tile for the animation
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.style.position = 'fixed';
        tile.style.width = '40px';
        tile.style.height = '40px';
        tile.style.left = (bagRect.left + bagRect.width / 2 - 20) + 'px';
        tile.style.top = (bagRect.top + bagRect.height / 2 - 20) + 'px';
        tile.style.zIndex = '10000';
        tile.style.pointerEvents = 'none';
        tile.style.transform = 'scale(0.2)';
        tile.style.opacity = '0';
        tile.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        tile.style.display = 'flex';
        tile.style.alignItems = 'center';
        tile.style.justifyContent = 'center';
        tile.innerHTML = `<span class="tile-letter" style="font-size: 24px; font-weight: bold;">${letter === '_' ? '' : letter}</span>`;
        document.body.appendChild(tile);

        // Brief shrink on bag icon to show tile is leaving
        bagIcon.style.transform = 'scale(0.8)';
        setTimeout(() => {
            bagIcon.style.transform = '';
        }, 150);

        return new Promise(resolve => {
            // Phase 1: Grow large and move toward center (so user can see the letter)
            requestAnimationFrame(() => {
                tile.style.transform = 'scale(2.5)';
                tile.style.opacity = '1';
                tile.style.left = (viewportWidth / 2 - 50) + 'px';
                tile.style.top = (viewportHeight / 3) + 'px';

                // Phase 2: After a brief pause, fly off screen
                setTimeout(() => {
                    tile.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 1, 1)';
                    tile.style.transform = 'scale(1.5) rotate(-20deg)';
                    tile.style.opacity = '0';
                    tile.style.left = '-150px';
                    tile.style.top = (viewportHeight / 2) + 'px';

                    setTimeout(() => {
                        tile.remove();
                        resolve();
                    }, 400);
                }, 350);
            });
        });
    },

    // Update shop UI after a purchase
    updateShopAfterPurchase(index) {
        // Update coin displays (shop and header)
        document.getElementById('shop-coins').textContent = runState.coins;
        this.updateCoinDisplay();

        // Update pool count (purchased - removed = net change)
        const netTiles = (runState.purchasedTiles?.length || 0) - (runState.removedTiles?.length || 0);
        const poolCount = 100 + netTiles;
        document.getElementById('shop-pool-count').textContent = poolCount;

        // Mark as purchased
        const option = document.getElementById(`shop-tile-${index}`);
        option.classList.add('purchased');

        // Check if other tile is now unaffordable
        const otherIndex = index === 0 ? 1 : 0;
        if (!this.shopPurchased[otherIndex]) {
            const otherAddBtn = document.getElementById(`shop-add-${otherIndex}`);
            const otherReplaceBtn = document.getElementById(`shop-replace-${otherIndex}`);

            // Get actual costs for the other tile based on its type
            const otherType = this.shopTileTypes[otherIndex] || 'buffed';
            const otherIsCoin = otherType === 'coin';
            const otherIsPink = otherType === 'pink';
            const otherAddCost = otherIsPink ? 3 : (otherIsCoin ? 2 : 1);
            const otherReplaceCost = otherIsPink ? 4 : (otherIsCoin ? 3 : 2);

            if (runState.coins < otherAddCost) {
                otherAddBtn?.classList.add('cannot-afford');
                if (otherAddBtn) otherAddBtn.title = 'Not enough coins';
            }
            if (runState.coins < otherReplaceCost) {
                otherReplaceBtn?.classList.add('cannot-afford');
                if (otherReplaceBtn) otherReplaceBtn.title = 'Not enough coins';
            }
        }

        // Update header coin display too
        this.updateCoinDisplay();

        // Update compact shop display
        this.renderCompactShopTiles();
    },

    // Handle Continue button from shop screen
    continueFromShop() {
        this.hideAllRunPopups();

        // Clear shop state - only valid for this shop visit
        runState.shopTiles = null;
        runState.shopPurchased = null;
        runState.shopRogues = [null, null, null];
        runState.shopRoguesPurchased = [false, false, false];

        if (runState.round >= runState.maxRounds) {
            // Completed all rounds in this set - show set complete screen
            this.showSetCompleteScreen();
        } else {
            // Clear pending state before advancing to next round
            runState.pendingScreen = null;
            runState.pendingScore = null;
            this.saveRunState();
            // Advance to next round
            this.nextRound();
        }
    },

    // Show set complete screen (full page)
    showSetCompleteScreen() {
        // Track that we're showing set complete (survives refresh)
        runState.pendingScreen = 'setComplete';
        this.saveRunState();

        // Hide game container, show set complete screen
        document.getElementById('game-container')?.classList.add('hidden');
        const setCompleteScreen = document.getElementById('set-complete-screen');
        if (!setCompleteScreen) return;

        // Populate set data
        document.getElementById('set-complete-number').textContent = runState.set;

        // Populate round scores summary
        const summaryEl = document.getElementById('set-rounds-summary');
        if (summaryEl) {
            const roundsHtml = runState.roundScores.map((score, idx) =>
                `<div class="round-summary-row">Round ${idx + 1}: ${score} pts</div>`
            ).join('');
            summaryEl.innerHTML = roundsHtml;
        }

        // Show next set preview
        const nextSet = runState.set + 1;
        const nextSetIndex = Math.min(nextSet - 1, runState.setTargets.length - 1);
        const nextTargets = runState.setTargets[nextSetIndex];
        document.getElementById('next-set-number').textContent = nextSet;
        document.getElementById('next-set-targets').innerHTML = nextTargets.map((t, i) =>
            `<div class="target-preview">Round ${i + 1}: ${t} pts</div>`
        ).join('');

        setCompleteScreen.classList.remove('hidden');
    },

    // Handle Continue button from set complete screen
    continueFromSetComplete() {
        this.hideAllRunPopups();
        // Clear pending state before advancing to next set
        runState.pendingScreen = null;
        runState.pendingScore = null;
        runState.shopTiles = null;
        runState.shopPurchased = null;
        runState.shopRogues = [null, null, null];
        runState.shopRoguesPurchased = [false, false, false];
        this.saveRunState();
        this.nextSet();
    },

    // Animate the bank counter
    animateBankCounter(from, to) {
        const bankAfterEl = document.getElementById('bank-after');
        if (!bankAfterEl || from === to) return;

        const duration = 1000; // 1 second
        const startTime = performance.now();
        const diff = to - from;

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out quad
            const eased = 1 - (1 - progress) * (1 - progress);
            const current = Math.floor(from + diff * eased);

            bankAfterEl.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }

        requestAnimationFrame(animate);
    },

    // Update coin display in header
    updateCoinDisplay() {
        const coinDisplay = document.getElementById('progress-coins');
        if (coinDisplay) {
            coinDisplay.textContent = `$${runState.coins}`;
        }
    },

    // Save run state to localStorage
    saveRunState() {
        // Convert Set to Array for JSON serialization
        const stateToSave = { ...runState };
        if (runState.lettersPlayedThisCycle instanceof Set) {
            stateToSave.lettersPlayedThisCycle = Array.from(runState.lettersPlayedThisCycle);
        }
        localStorage.setItem('rogueletters_run', JSON.stringify(stateToSave));
    },

    // Load run state from localStorage
    loadRunState() {
        const saved = localStorage.getItem('rogueletters_run');
        if (saved) {
            const loaded = JSON.parse(saved);
            // Convert Array back to Set
            if (Array.isArray(loaded.lettersPlayedThisCycle)) {
                loaded.lettersPlayedThisCycle = new Set(loaded.lettersPlayedThisCycle);
            }
            Object.assign(runState, loaded);
        }
    },

    // Reset run state to initial values
    resetRunState() {
        runState.isRunMode = false;
        runState.set = 1;
        runState.round = 1;
        runState.targetScore = getTargetScore(1, 1);
        runState.setScore = 0;
        runState.totalScore = 0;
        runState.roundScores = [];
        runState.coins = 0;
        runState.lastEarnings = null;
        runState.purchasedTiles = [];
        runState.removedTiles = [];
        runState.runStartTime = null;
        runState.runSeed = null;
        runState.pendingScreen = null;
        runState.pendingScore = null;
        runState.shopTiles = null;
        runState.shopPurchased = null;
        runState.shopTileTypes = null;
        runState.shopRogues = [null, null, null];
        runState.shopRoguesPurchased = [false, false, false];
        runState.coinTilesDrawn = {};
        runState.tileSetUpgradeCount = 0;
        runState.tileSetUpgrades = {};
        runState.runStats = {
            wordsPlayed: 0,
            bestWord: null,
            longestWord: null,
            totalCoinsEarned: 0,
            bingos: 0,
            roguesTriggered: {}
        };
    },

    // Clear run state from localStorage
    clearRunState() {
        const container = document.getElementById('target-progress-container');
        if (container) container.classList.add('hidden');
        localStorage.removeItem('rogueletters_run');
    }
};

// ============================================================================
// TILE EXCHANGE SYSTEM
// Allows players to exchange tiles for coins (no turn cost, unlike WikiLetters)
// Cost scales with set: $1 (set 1), $2 (set 2), ... $5 (set 5+)
// ============================================================================

/**
 * Get exchange cost based on current set
 */
function getExchangeCost() {
    if (!runState.isRunMode) return 1;
    return Math.min(runState.set, 5);
}

/**
 * Check if player can afford to exchange
 */
function canAffordExchange() {
    return runState.coins >= getExchangeCost();
}

/**
 * Update exchange button visibility based on coins and tiles on board
 */
function updateExchangeButtonVisibility() {
    const exchangeBtn = document.getElementById('exchange-tiles');
    const recallBtn = document.getElementById('recall-tiles');
    if (!exchangeBtn) return;

    // Hide if game over, not in run mode, or tiles placed on board
    if (gameState.isGameOver || !runState.isRunMode || gameState.placedTiles.length > 0) {
        exchangeBtn.style.display = 'none';
        return;
    }

    // No Discard rogue: Exchange becomes free "Pass" button
    if (hasRogue('noDiscard')) {
        exchangeBtn.style.display = 'flex';
        exchangeBtn.classList.remove('cannot-afford');
        exchangeBtn.disabled = false;
        exchangeBtn.title = 'Pass turn';
        if (recallBtn) recallBtn.style.display = 'none';
        // Switch to pass icon
        const exchangeIcon = exchangeBtn.querySelector('.exchange-icon');
        const passIcon = exchangeBtn.querySelector('.pass-icon');
        if (exchangeIcon) exchangeIcon.style.display = 'none';
        if (passIcon) passIcon.style.display = '';
        // Hide cost badge
        const costBadge = exchangeBtn.querySelector('.exchange-cost');
        if (costBadge) costBadge.style.display = 'none';
        return;
    }

    // Always show exchange button (hide recall since no tiles on board)
    exchangeBtn.style.display = 'flex';
    exchangeBtn.title = 'Exchange tiles';
    if (recallBtn) recallBtn.style.display = 'none';
    // Ensure exchange icon is shown (not pass icon)
    const exchangeIcon = exchangeBtn.querySelector('.exchange-icon');
    const passIcon = exchangeBtn.querySelector('.pass-icon');
    if (exchangeIcon) exchangeIcon.style.display = '';
    if (passIcon) passIcon.style.display = 'none';

    // Ensure button text says "Exchange"
    const btnText = exchangeBtn.querySelector('.exchange-btn-text');
    if (btnText) btnText.textContent = 'Exchange';

    // Update cost badge
    const costBadge = exchangeBtn.querySelector('.exchange-cost');
    if (costBadge) {
        costBadge.style.display = '';
        costBadge.textContent = `$${getExchangeCost()}`;
    }

    // Gray out if can't afford, but always show
    if (!canAffordExchange()) {
        exchangeBtn.classList.add('cannot-afford');
        exchangeBtn.disabled = true;
        exchangeBtn.title = 'Not enough coins';
    } else {
        exchangeBtn.classList.remove('cannot-afford');
        exchangeBtn.disabled = false;
        exchangeBtn.title = '';
    }
}

/**
 * Enter exchange mode - open the modal (or pass turn if No Discard rogue active)
 */
function enterExchangeMode() {
    if (gameState.isGameOver) return;
    if (gameState.placedTiles.length > 0) return;

    // No Discard rogue: Pass the turn (no exchange, no cost) with confirmation
    if (hasRogue('noDiscard')) {
        const turnsRemaining = gameState.maxTurns - gameState.currentTurn + 1;
        const confirmMessage = turnsRemaining === 1
            ? 'Pass your final turn? This will end the round.'
            : `Pass this turn? (${turnsRemaining} turns remaining)`;

        if (!confirm(confirmMessage)) {
            return;
        }

        console.log('[Pass] Passing turn (No Discard rogue)');
        // Record a zero-score turn
        gameState.turnScores.push(0);
        gameState.currentTurn++;
        updateTurnCounter();
        checkEndOfTurn();
        return;
    }

    if (!canAffordExchange()) return;

    console.log('[Exchange] Entering exchange mode');

    // Clear any existing tile selection
    if (window.selectedTile) {
        window.selectedTile.classList.remove('selected');
        window.selectedTile = null;
    }

    gameState.isExchangeMode = true;
    gameState.selectedForExchange = [];

    // Render tiles in modal
    renderExchangeRack();

    // Update cost info
    const costInfo = document.getElementById('exchange-cost-info');
    if (costInfo) {
        costInfo.textContent = `Cost: $${getExchangeCost()} per exchange`;
    }

    // Show modal
    document.getElementById('exchange-modal').style.display = 'flex';

    // Update instruction and button state
    updateExchangeInstruction();
    updateConfirmButtonState();
}

/**
 * Render current rack tiles in the exchange modal
 */
function renderExchangeRack() {
    const exchangeRack = document.getElementById('exchange-rack');
    exchangeRack.innerHTML = '';

    const rackTiles = gameState.rackTiles || [];

    rackTiles.forEach((tileData, index) => {
        // Handle both string and object formats
        const letter = typeof tileData === 'object' ? tileData.letter : tileData;
        const isBlank = letter === '_';
        const isBuffed = typeof tileData === 'object' && tileData.buffed;
        const isCoinTile = typeof tileData === 'object' && tileData.coinTile;
        const bonus = typeof tileData === 'object' ? (tileData.bonus || 0) : 0;

        const tileEl = document.createElement('div');
        tileEl.className = 'tile';
        if (isBlank) tileEl.classList.add('blank-tile');
        tileEl.dataset.letter = letter;
        tileEl.dataset.isBlank = isBlank;
        tileEl.dataset.index = index;

        const letterSpan = document.createElement('span');
        letterSpan.className = 'tile-letter';
        letterSpan.textContent = isBlank ? '' : letter;

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'tile-score';
        const baseScore = TILE_SCORES[letter] || 0;
        scoreSpan.textContent = isBlank ? '' : (baseScore + bonus);

        tileEl.appendChild(letterSpan);
        tileEl.appendChild(scoreSpan);

        // Apply tile effects using centralized system
        applyTileEffects(tileEl, { buffed: isBuffed, bonus, coinTile: isCoinTile });

        tileEl.addEventListener('click', () => toggleTileForExchange(tileEl));

        exchangeRack.appendChild(tileEl);
    });
}

/**
 * Toggle tile selection for exchange
 */
function toggleTileForExchange(tileElement) {
    if (!gameState.isExchangeMode) return;

    const letter = tileElement.dataset.letter;
    const isBlank = tileElement.dataset.isBlank === 'true';

    // Check if already selected
    const existingIndex = gameState.selectedForExchange.findIndex(t => t.element === tileElement);

    if (existingIndex >= 0) {
        // Deselect
        gameState.selectedForExchange.splice(existingIndex, 1);
        tileElement.classList.remove('selected-for-exchange');
    } else {
        // Select
        gameState.selectedForExchange.push({ letter, isBlank, element: tileElement });
        tileElement.classList.add('selected-for-exchange');
    }

    updateExchangeInstruction();
    updateConfirmButtonState();
}

/**
 * Update exchange instruction text
 */
function updateExchangeInstruction() {
    const instruction = document.getElementById('exchange-instruction');
    const count = gameState.selectedForExchange.length;

    if (count === 0) {
        instruction.textContent = 'Tap tiles to exchange';
    } else if (count === 1) {
        instruction.textContent = '1 tile selected';
    } else {
        instruction.textContent = `${count} tiles selected`;
    }
}

/**
 * Update confirm button state
 */
function updateConfirmButtonState() {
    const confirmBtn = document.getElementById('confirm-exchange');
    confirmBtn.disabled = gameState.selectedForExchange.length === 0;
}

/**
 * Cancel exchange and close modal
 */
function cancelExchange() {
    console.log('[Exchange] Cancelling exchange');

    gameState.selectedForExchange = [];
    gameState.isExchangeMode = false;

    document.getElementById('exchange-modal').style.display = 'none';

    updateExchangeButtonVisibility();
}

/**
 * Confirm exchange - call backend and deduct coins
 */
async function confirmExchange() {
    if (gameState.selectedForExchange.length === 0) return;
    if (!canAffordExchange()) return;

    const cost = getExchangeCost();
    const tilesToExchange = gameState.selectedForExchange.map(t => t.letter);

    console.log('[Exchange] Exchanging', tilesToExchange.length, 'tiles for $' + cost);

    try {
        // Get purchased and removed tiles for correct bag generation
        const purchasedLetters = (runState.purchasedTiles || []).map(t => typeof t === 'object' ? t.letter : t);
        const removedLetters = runState.removedTiles || [];

        // Call backend to exchange tiles
        const rackSize = getRackSize();
        const params = new URLSearchParams({
            seed: gameState.seed,
            action: 'exchange',
            turn: gameState.currentTurn,
            tiles_to_exchange: JSON.stringify(tilesToExchange),
            rack_tiles: JSON.stringify(gameState.rackTiles.map(t => typeof t === 'object' ? t.letter : t)),
            tiles_drawn: gameState.totalTilesDrawn,
            exchange_count: gameState.exchangeCount,
            purchased_tiles: JSON.stringify(purchasedLetters),
            removed_tiles: JSON.stringify(removedLetters),
            rack_size: rackSize
        });

        const response = await fetch(`${API_BASE}/letters.py?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`Exchange failed: HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('[Exchange] Server response:', data);

        if (data.error) {
            throw new Error(data.error);
        }

        // Deduct coins
        runState.coins -= cost;
        runManager.updateCoinDisplay();
        runManager.saveRunState();

        // Update game state with new tiles from the server
        gameState.tiles = data.tiles;
        gameState.totalTilesDrawn = data.tiles_drawn;

        // Update tilesDrawnFromBag with the new tiles
        if (data.new_tiles) {
            gameState.tilesDrawnFromBag = [...(gameState.tilesDrawnFromBag || []), ...data.new_tiles];
        }

        // Record exchange in history
        gameState.exchangeHistory.push({
            tiles: tilesToExchange,
            at_drawn: gameState.totalTilesDrawn,
            exchange_count: gameState.exchangeCount
        });

        gameState.exchangeCount++;

        // Close modal
        gameState.selectedForExchange = [];
        gameState.isExchangeMode = false;
        document.getElementById('exchange-modal').style.display = 'none';

        // Small delay to let layout stabilize after modal closes
        await new Promise(r => setTimeout(r, 50));

        // Find the actual rack tiles to animate to bag
        // Match by letter - find tiles in rack that match the exchanged letters
        const rackBoard = document.getElementById('tile-rack-board');
        const allRackTiles = Array.from(rackBoard.querySelectorAll('.tile'));

        // Create a copy of letters to exchange (we'll remove matches as we find them)
        const lettersToMatch = [...tilesToExchange];
        const tilesToAnimateToBag = [];

        for (const tile of allRackTiles) {
            const tileLetter = tile.dataset.letter;
            const matchIndex = lettersToMatch.indexOf(tileLetter);
            if (matchIndex >= 0) {
                tilesToAnimateToBag.push(tile);
                lettersToMatch.splice(matchIndex, 1); // Remove matched letter
            }
        }

        // Animate exchanged tiles flying to the bag (and remove them from DOM)
        await animateTilesToBag(tilesToAnimateToBag);

        // Re-render the rack with new tiles, animating them from the bag
        // Calculate how many tiles were kept (not exchanged)
        const currentRackSize = getRackSize();
        const keptTileCount = currentRackSize - tilesToExchange.length;
        await displayTilesAnimated(data.tiles, keptTileCount);

        // Update exchange button visibility (may need to hide if can't afford another)
        updateExchangeButtonVisibility();

        // Save game state
        saveGameState();

    } catch (error) {
        console.error('[Exchange] Error:', error);
        showError('Exchange failed: ' + error.message);
    }
}

/**
 * Handle tile click during exchange mode
 * (Synced from WikiLetters for consistency)
 */
function handleExchangeTileClick(event) {
    if (!gameState.isExchangeMode) return;

    const tile = event.currentTarget;
    if (tile.classList.contains('tile')) {
        toggleTileForExchange(tile);
        event.stopPropagation();
    }
}

// Update target progress bar during run mode
function updateTargetProgress() {
    if (!runState.isRunMode) return;

    const container = document.getElementById('target-progress-container');
    const fill = document.getElementById('target-progress-fill');
    const text = document.getElementById('target-progress-text');

    if (!container) return;

    container.classList.remove('hidden');

    const current = gameState.score || 0;
    const target = runState.targetScore;
    const percentage = Math.min((current / target) * 100, 100);

    fill.style.width = `${percentage}%`;
    text.textContent = `${current}/${target}`;

    // Color based on progress
    fill.classList.remove('exceeded', 'danger');
    if (current >= target) {
        fill.classList.add('exceeded');
    } else if (percentage < 50 && gameState.currentTurn > 3) {
        fill.classList.add('danger');
    }
}

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
    'Q': 10, 'Z': 10,
    '_': 0  // Blank tiles
};

// Tile distribution for shop (same as Scrabble)
const TILE_DISTRIBUTION = {
    'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2,
    'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2,
    'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1,
    'Y': 2, 'Z': 1, '_': 2  // Blank tiles
};  // Total: 100 tiles

// Generate a random letter using standard tile distribution weights
// Used by The Minter rogue to create new tiles
function generateRandomTileLetter() {
    // Build weighted array (excluding blanks for minted tiles)
    const weighted = [];
    for (const [letter, count] of Object.entries(TILE_DISTRIBUTION)) {
        if (letter !== '_') {  // Don't mint blank tiles
            for (let i = 0; i < count; i++) {
                weighted.push(letter);
            }
        }
    }
    // Pick random letter from weighted array
    return weighted[Math.floor(Math.random() * weighted.length)];
}

// ============================================================================
// BAG VIEWER
// ============================================================================

let bagViewMode = 'remaining'; // 'remaining' or 'total'
let bagReplacementMode = false; // true when selecting a tile to remove for shop replacement

function showBagViewer() {
    bagReplacementMode = false;
    const popup = document.getElementById('bag-viewer-popup');
    if (!popup) return;

    // Reset header text
    const header = popup.querySelector('h2');
    if (header) header.textContent = 'Tile Bag';

    updateBagViewerGrid();
    popup.style.display = 'flex';
}

function showBagViewerForReplacement() {
    bagReplacementMode = true;
    bagViewMode = 'total'; // Show total bag when replacing

    const popup = document.getElementById('bag-viewer-popup');
    if (!popup) return;

    // Update header to indicate selection mode
    const header = popup.querySelector('h2');
    if (header) header.textContent = 'Select tile to remove';

    updateBagViewerGrid();
    popup.style.display = 'flex';
}

function updateBagViewerGrid() {
    // Calculate views
    const remaining = calculateRemainingTiles(); // What's not yet on board

    // Build total distribution (base + purchased - removed)
    const totalTiles = {};
    for (const [letter, count] of Object.entries(TILE_DISTRIBUTION)) {
        totalTiles[letter] = count;
    }
    for (const tile of (runState.purchasedTiles || [])) {
        const letter = typeof tile === 'object' ? tile.letter : tile;
        totalTiles[letter] = (totalTiles[letter] || 0) + 1;
    }
    for (const tile of (runState.removedTiles || [])) {
        totalTiles[tile] = Math.max(0, (totalTiles[tile] || 0) - 1);
    }

    // Calculate totals
    let totalRemaining = 0;
    const netTileChange = (runState.purchasedTiles?.length || 0) - (runState.removedTiles?.length || 0);
    let totalBag = 100 + netTileChange;
    for (const letter of Object.keys(TILE_DISTRIBUTION)) {
        totalRemaining += remaining[letter] || 0;
    }

    // Update summary: "X / Y tiles remaining" where Y is original bag
    document.getElementById('bag-remaining').textContent = totalRemaining;
    document.getElementById('bag-total').textContent = totalBag;

    // Update toggle button states (hide toggles in replacement mode)
    const toggleContainer = document.querySelector('.bag-toggle');
    if (toggleContainer) {
        toggleContainer.style.display = bagReplacementMode ? 'none' : 'flex';
    }
    document.getElementById('bag-toggle-remaining')?.classList.toggle('active', bagViewMode === 'remaining');
    document.getElementById('bag-toggle-total')?.classList.toggle('active', bagViewMode === 'total');

    // Choose which counts to display
    const displayCounts = bagViewMode === 'remaining' ? remaining : totalTiles;

    // Build grid of individual tiles (showing each tile separately)
    const grid = document.getElementById('bag-tiles-grid');
    grid.innerHTML = '';

    // Add replacement mode class to grid
    grid.classList.toggle('replacement-mode', bagReplacementMode);

    // Calculate how many buffed/coin tiles of each letter remain in the bag
    // Purchased tiles are either buffed or coin, minus the ones already drawn
    // Also track the bonus values for buffed tiles
    const buffedRemaining = {};
    const coinRemaining = {};
    const buffedBonusValues = {}; // Track bonus value per letter (e.g., {E: 1, A: 2})
    for (const tile of (runState.purchasedTiles || [])) {
        const letter = typeof tile === 'object' ? tile.letter : tile;
        const isCoinTile = typeof tile === 'object' && tile.coinTile;
        const bonus = typeof tile === 'object' ? (tile.bonus || 1) : 1;
        if (isCoinTile) {
            coinRemaining[letter] = (coinRemaining[letter] || 0) + 1;
        } else {
            buffedRemaining[letter] = (buffedRemaining[letter] || 0) + 1;
            // Track bonus value (use highest if multiple)
            buffedBonusValues[letter] = Math.max(buffedBonusValues[letter] || 0, bonus);
        }
    }
    // Subtract buffed tiles already drawn
    for (const [letter, count] of Object.entries(runState.buffedTilesDrawn || {})) {
        buffedRemaining[letter] = Math.max(0, (buffedRemaining[letter] || 0) - count);
    }
    // Subtract coin tiles already drawn
    for (const [letter, count] of Object.entries(runState.coinTilesDrawn || {})) {
        coinRemaining[letter] = Math.max(0, (coinRemaining[letter] || 0) - count);
    }

    // Calculate total purchased counts (for Total view - shows all purchased, not just remaining)
    const buffedTotal = {};
    const coinTotal = {};
    for (const tile of (runState.purchasedTiles || [])) {
        const letter = typeof tile === 'object' ? tile.letter : tile;
        const isCoinTile = typeof tile === 'object' && tile.coinTile;
        if (isCoinTile) {
            coinTotal[letter] = (coinTotal[letter] || 0) + 1;
        } else {
            buffedTotal[letter] = (buffedTotal[letter] || 0) + 1;
        }
    }

    // Create individual tiles for each letter, sorted alphabetically
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('');
    for (const letter of letters) {
        const count = displayCounts[letter] || 0;
        const score = TILE_SCORES[letter] || 0;
        // Remaining view: show tiles still in bag; Total view: show all purchased
        const buffedCount = bagViewMode === 'remaining' ? (buffedRemaining[letter] || 0) : (buffedTotal[letter] || 0);
        const coinCount = bagViewMode === 'remaining' ? (coinRemaining[letter] || 0) : (coinTotal[letter] || 0);

        // Create one mini-tile for each instance of this letter
        // Order: coin tiles first, then buffed tiles, then regular tiles
        for (let i = 0; i < count; i++) {
            const tile = document.createElement('div');
            tile.className = 'bag-mini-tile';

            // Determine tile type (coin tiles shown first, then buffed)
            const isCoinTile = i < coinCount;
            const isBuffed = !isCoinTile && i < (coinCount + buffedCount);

            if (isCoinTile) {
                tile.classList.add('coin-tile');
            } else if (isBuffed) {
                tile.classList.add('buffed-tile');
            }

            // In replacement mode, make tiles clickable
            if (bagReplacementMode) {
                tile.classList.add('selectable');
                tile.addEventListener('click', () => {
                    runManager.completeReplacement(letter);
                });
            }

            const letterSpan = document.createElement('span');
            letterSpan.className = 'bag-mini-tile-letter';
            letterSpan.textContent = letter === '_' ? '' : letter;

            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'bag-mini-tile-score';
            // Use getTileDisplayScore to include tile set upgrades, vowel rogue, etc.
            // For buffed tiles, pass the actual bonus value
            const tileBonus = isBuffed ? (buffedBonusValues[letter] || 1) : 0;
            scoreSpan.textContent = getTileDisplayScore(letter, tileBonus);

            tile.appendChild(letterSpan);
            tile.appendChild(scoreSpan);

            // Add $1 indicator for coin tiles (buffed tiles show score in gold circle via CSS)
            if (isCoinTile) {
                const coinIndicator = document.createElement('span');
                coinIndicator.className = 'bag-coin-indicator';
                coinIndicator.textContent = '$1';
                tile.appendChild(coinIndicator);
            }

            grid.appendChild(tile);
        }
    }
}

function setBagViewMode(mode) {
    bagViewMode = mode;
    updateBagViewerGrid();
}

function hideBagViewer() {
    // Cancel any pending replacement
    if (bagReplacementMode) {
        runManager.pendingReplacementTileIndex = null;
        bagReplacementMode = false;
    }
    const popup = document.getElementById('bag-viewer-popup');
    if (popup) popup.style.display = 'none';
}

function calculateRemainingTiles() {
    // Remaining = tiles still in the bag (not yet drawn)
    // = base distribution + purchased - removed - starting word - ALL tiles drawn from bag

    // Start with full distribution
    const remaining = {};
    for (const [letter, count] of Object.entries(TILE_DISTRIBUTION)) {
        remaining[letter] = count;
    }

    // Add purchased tiles
    for (const tile of (runState.purchasedTiles || [])) {
        const letter = typeof tile === 'object' ? tile.letter : tile;
        remaining[letter] = (remaining[letter] || 0) + 1;
    }

    // Subtract removed tiles (from shop "Replace" option)
    for (const tile of (runState.removedTiles || [])) {
        remaining[tile] = Math.max(0, (remaining[tile] || 0) - 1);
    }

    // Subtract starting word (on board from start)
    for (const letter of (gameState.startingWord || '')) {
        if (remaining[letter] > 0) remaining[letter]--;
    }

    // Subtract ALL tiles drawn from bag (includes rack tiles and tiles placed this turn)
    const tilesDrawn = gameState.tilesDrawnFromBag || [];
    for (const tile of tilesDrawn) {
        if (remaining[tile] > 0) remaining[tile]--;
    }

    return remaining;
}

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
    return url;
}

// V3 Encoder: Build 45-character URL with rack indices
async function encodeV3URL() {
    try {
        // Build tile array from turn history
        const tiles = [];

        gameState.turnHistory.forEach((turn, turnIndex) => {
            if (turn && turn.tiles) {
                turn.tiles.forEach(tile => {
                    tiles.push({
                        row: tile.row,
                        col: tile.col,
                        letter: tile.letter,
                        turn: turnIndex + 1
                    });
                });
            }
        });

        if (tiles.length === 0) {
            return null;
        }

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
            const tilesWithRackIdx = [];
            for (let turn = 1; turn <= 5; turn++) {
                const turnTiles = tilesByTurn[turn] || [];
                if (turnTiles.length === 0) continue;

                const rack = gameState.turnHistory[turn - 1].originalRack;
                // Sort rack alphabetically for new ?w= format (enables rack caching!)
                const sortedRack = [...rack].sort();

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

// ============================================================================
// V4 URL Encoding/Decoding (synced from WikiLetters)
// V4 encodes letters directly - no API calls needed for decoding
// ============================================================================

/**
 * Encode letter to 6-bit value
 * A-Z (normal) = 0-25, a-z (blank) = 26-51
 */
function encodeLetterV4(letter) {
    if (letter >= 'A' && letter <= 'Z') {
        return letter.charCodeAt(0) - 65; // A=0, B=1, ... Z=25
    } else if (letter >= 'a' && letter <= 'z') {
        return letter.charCodeAt(0) - 97 + 26; // a=26, b=27, ... z=51
    }
    console.error('[V4 Encoder] Invalid letter:', letter);
    return 0;
}

/**
 * Decode 6-bit value to letter
 * 0-25 = A-Z (normal), 26-51 = a-z (blank)
 */
function decodeLetterV4(value) {
    if (value < 26) {
        return String.fromCharCode(65 + value); // A-Z
    } else {
        return String.fromCharCode(97 + value - 26); // a-z (blank)
    }
}

/**
 * Build V4 URL from tiles with direct letters
 * Format: 16 bits per tile (position:7 + letter:6 + turn:3)
 */
function buildV4URL(tiles) {
    const bitStream = new BitStream();

    // Date (14 bits)
    const daysSinceEpoch = dateToDaysSinceEpoch(gameState.seed);
    bitStream.writeBits(daysSinceEpoch, 14);

    // Starting word length (4 bits, max 15 letters)
    const startingWord = gameState.startingWord || '';
    bitStream.writeBits(startingWord.length, 4);

    // Starting word letters (5 bits each, A=0 to Z=25)
    for (const char of startingWord) {
        const letterCode = char.toUpperCase().charCodeAt(0) - 65; // A=0, Z=25
        bitStream.writeBits(letterCode, 5);
    }

    // Tile count (5 bits)
    bitStream.writeBits(tiles.length, 5);

    // Tiles (16 bits each: 7 position + 6 letter + 3 turn)
    tiles.forEach(tile => {
        const position = tile.row * 9 + tile.col; // 0-80
        const letterCode = encodeLetterV4(tile.letter);
        bitStream.writeBits(position, 7);
        bitStream.writeBits(letterCode, 6);
        bitStream.writeBits(tile.turn, 3);
    });

    // Convert to URL-safe Base64
    const bytes = bitStream.getBytes();
    const encoded = base64UrlEncode(bytes);

    // Build URL with ?_= parameter (V4 format with direct letters)
    const baseUrl = window.location.origin + window.location.pathname;
    const url = `${baseUrl}?_=${encoded}`;
    return url;
}

/**
 * V4 Encoder: Build URL with direct letter encoding (no API calls needed)
 * Supports blank tiles (lowercase letters)
 */
function encodeV4URL() {
    try {
        // Build tile array from turn history
        const tiles = [];

        gameState.turnHistory.forEach((turn, turnIndex) => {
            if (turn && turn.tiles) {
                turn.tiles.forEach(tile => {
                    // Blank tiles are encoded as lowercase letters (26-51 in V4)
                    const encodedLetter = tile.isBlank ? tile.letter.toLowerCase() : tile.letter.toUpperCase();
                    tiles.push({
                        row: tile.row,
                        col: tile.col,
                        letter: encodedLetter,
                        turn: turnIndex + 1
                    });
                });
            }
        });

        if (tiles.length === 0) {
            console.error('[V4 Encoder] No tiles to encode');
            return null;
        }

        // V4 is simple - just encode all tiles directly (no rack lookup needed!)
        return buildV4URL(tiles);

    } catch (err) {
        console.error('[V4 Encoder] Failed to encode:', err);
        return null;
    }
}

/**
 * V4 Decoder: Decode URL with direct letter encoding
 * Format: date(14) + wordLen(4) + word(5*len) + tileCount(5) + tiles(16 each)
 * Supports blank tiles (lowercase letters = 26-51)
 * Still needs API call for score calculation
 */
async function decodeV4URL(encodedData) {
    try {
        // Decode Base64 to bytes
        const bytes = base64UrlDecode(encodedData);
        const bitStream = new BitStream(Array.from(bytes));

        // Read date (14 bits)
        const daysSinceEpoch = bitStream.readBits(14);

        // Validate date range (should be 0-16383 for years 2020-2065)
        if (daysSinceEpoch < 0 || daysSinceEpoch > 16383) {
            throw new Error(`Invalid V4 data: date out of range (${daysSinceEpoch})`);
        }

        const seed = daysSinceEpochToDate(daysSinceEpoch);

        // Validate seed format (YYYYMMDD)
        if (!/^\d{8}$/.test(seed)) {
            throw new Error(`Invalid V4 data: malformed date (${seed})`);
        }

        // Read starting word length (4 bits)
        const wordLength = bitStream.readBits(4);

        // Read starting word letters (5 bits each)
        let startingWord = '';
        for (let i = 0; i < wordLength; i++) {
            const letterCode = bitStream.readBits(5);
            startingWord += String.fromCharCode(65 + letterCode); // A=0 -> 'A'
        }

        // Read tile count (5 bits)
        const tileCount = bitStream.readBits(5);

        // Validate tile count (max 35 tiles in a 5-turn game)
        if (tileCount > 35) {
            throw new Error(`Invalid V4 data: tile count too high (${tileCount})`);
        }

        // Read tiles (position:7 + letter:6 + turn:3 = 16 bits each)
        const tilesWithLetters = [];
        for (let i = 0; i < tileCount; i++) {
            const position = bitStream.readBits(7);
            const letterCode = bitStream.readBits(6);
            const turn = bitStream.readBits(3);

            // Validate position (0-80 for 9x9 board)
            if (position > 80) {
                throw new Error(`Invalid V4 data: tile position out of range (${position})`);
            }

            // Validate turn (1-5)
            if (turn < 1 || turn > 5) {
                throw new Error(`Invalid V4 data: turn out of range (${turn})`);
            }

            const row = Math.floor(position / 9);
            const col = position % 9;
            const letter = decodeLetterV4(letterCode);
            const isBlank = letterCode >= 26; // 26-51 = blank tiles

            tilesWithLetters.push({ row, col, letter, turn, isBlank });
        }

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

        // Build game data in same format as other decoders
        const gameData = {
            d: seed,
            w: startingWord,  // Decoded from URL - no API call needed!
            t: tilesWithLetters.map(tile => [
                tile.row,
                tile.col,
                tile.letter,
                tile.turn,
                tile.isBlank ? 1 : 0  // blank flag
            ]),
            s: scoresData.scores
        };

        return gameData;

    } catch (err) {
        console.error('[V4 Decoder] Failed to decode:', err);
        throw err;
    }
}

/**
 * Load V4 shared game from URL
 */
async function loadV4SharedGame(encodedParam) {
    const startTime = Date.now();

    try {
        // Decode the V4 URL - starting word is encoded, no API calls needed!
        const gameData = await decodeV4URL(encodedParam);

        // Set game state for shared game
        gameState.seed = gameData.d;
        gameState.dateStr = formatSeedToDate(gameData.d);
        gameState.startingWord = gameData.w;
        gameState.turnScores = gameData.s;
        gameState.score = gameData.s.reduce((sum, score) => sum + score, 0);
        gameState.isGameOver = true; // Shared games are always complete
        gameState.currentTurn = 6; // Beyond max turns

        // Update UI
        const dateDisplay = document.getElementById('dateDisplay');
        if (dateDisplay) {
            dateDisplay.textContent = gameState.dateStr;
        }

        // Initialize boards
        createBoard();
        createRackBoard();

        // Render the shared board
        renderSharedBoard(gameData);

        // Track shared game loaded
        const tileCount = gameData.t ? gameData.t.length : 0;
        const duration = Date.now() - startTime;
        Analytics.navigation.sharedGameLoaded('v4', tileCount, gameState.score, duration);

    } catch (err) {
        console.error('[V4 Load] Failed to load:', err);
        throw err;
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

        // Update run UI if in run mode (dateDisplay removed)
        if (runState.isRunMode) {
            runManager.updateRunUI();
        }

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
    // Set copyright year dynamically
    const copyrightYear = document.getElementById('copyright-year');
    if (copyrightYear) copyrightYear.textContent = new Date().getFullYear();

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
    bottomSheet.init();
    runManager.setupCompactShopHandlers();

    // Initialize animation speed UI from localStorage
    updateAnimationSpeedUI();

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
    window.runState = runState;
    window.endGame = endGame;
    window.testPopup = testPopup;
    window.getScoreTitle = getScoreTitle;
    window.buildShareableGameData = buildShareableGameData;
    window.generateShareableURL = generateShareableURL;
    window.playThisDate = playThisDate;
});

async function initializeGame() {
    // Check for existing run or show start screen
    runManager.loadRunState();

    // Check if we have a seed parameter (test mode or direct link) - skip run mode popup
    const urlParams = new URLSearchParams(window.location.search);
    const hasSeedParam = urlParams.has('seed') || urlParams.has('g') || urlParams.has('w'); // 'g' is legacy share, 'w' is sorted share

    // Debug: ?shop=1 opens shop directly with $5 for testing
    if (urlParams.get('shop') === '1') {
        runState.coins = 5;
        runState.isRunMode = true;
        runManager.showShopScreen();
        return;
    }

    // Debug URL params: ?set=2&round=1&coins=5&turn=3
    // These override run state for testing specific scenarios
    const debugSet = urlParams.get('set');
    const debugRound = urlParams.get('round');
    const debugCoins = urlParams.get('coins');
    const debugTurn = urlParams.get('turn');

    if (debugSet || debugRound || debugCoins || debugTurn) {
        console.log('[Debug] Applying debug params:', { set: debugSet, round: debugRound, coins: debugCoins, turn: debugTurn });

        // Ensure run mode is active
        if (!runState.isRunMode) {
            runState.isRunMode = true;
            runState.runSeed = Date.now();
        }

        // Apply debug overrides
        if (debugSet) runState.set = parseInt(debugSet, 10);
        if (debugRound) runState.round = parseInt(debugRound, 10);
        if (debugCoins !== null && debugCoins !== undefined) runState.coins = parseInt(debugCoins, 10);
        if (debugTurn) gameState.currentTurn = parseInt(debugTurn, 10);

        // Recalculate target for the set/round
        runState.targetScore = getTargetScore(runState.set, runState.round);

        // Save and update UI
        runManager.saveRunState();
        runManager.updateRunUI();
    }

    // Check for pending screen (from refresh during earnings/shop/setComplete)
    if (runState.pendingScreen) {
        console.log('[Init] Restoring pending screen:', runState.pendingScreen);
        runManager.updateRunUI();

        switch (runState.pendingScreen) {
            case 'earnings':
                // Re-show earnings screen with saved score (isRestore=true skips coin adding)
                if (runState.pendingScore !== null) {
                    runManager.showEarningsScreen(runState.pendingScore, true);
                } else {
                    // Fallback: skip to shop if no score saved
                    runManager.showShopScreen();
                }
                return;
            case 'shop':
                runManager.showShopScreen();
                return;
            case 'setComplete':
                runManager.showSetCompleteScreen();
                return;
        }
    }

    if (runState.isRunMode) {
        // Resume existing run - calculate seed from runSeed + round
        gameState.seed = String(runState.runSeed + runState.round);
        runManager.updateRunUI();  // Also renders rogues
        // Continue to load game with the correct seed
    } else if (!hasSeedParam) {
        // Auto-start run mode - no popup needed
        // Header shows Set/Round/Turn and target score
        runManager.startRun();
        return; // startRun handles game initialization
    }

    // Get or generate seed from URL (moved up for hasSeedParam check)

    // Phase 3a: Check for V4 game share (?_= with direct letter encoding)
    const v4Param = urlParams.get('_');
    if (v4Param) {
        console.log('[Load] Detected V4 game share parameter (?_=)');
        try {
            await loadV4SharedGame(v4Param);
            return; // Exit early - V4 shared game loading succeeded
        } catch (v4Error) {
            console.error('[Load] V4 decode failed:', v4Error);
            // Continue with normal game initialization
        }
    }

    // Phase 3b: Check for V3 compressed game share (?g= legacy or ?w= sorted)
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

    // In run mode, ALWAYS use the calculated seed from runSeed + round
    // This ensures refreshing the page uses the correct round's seed
    if (runState.isRunMode) {
        seed = gameState.seed;  // Already calculated as String(runSeed + round)
    } else if (!seed) {
        // Use today's date in YYYYMMDD format
        seed = getTodaysSeed();
    }

    // Update URL with the correct seed
    if (urlParams.get('seed') !== seed) {
        urlParams.set('seed', seed);
        const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?${urlParams.toString()}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }

    gameState.seed = seed;
    gameState.dateStr = formatSeedToDate(seed);

    // Update run UI if in run mode (dateDisplay removed in favor of game-progress)
    if (runState.isRunMode) {
        runManager.updateRunUI();
    }

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

            // Share buttons hidden for RogueLetters - uncomment when sharing is implemented
            // const shareIcon = document.getElementById('shareIcon');
            // if (shareIcon) {
            //     shareIcon.classList.remove('hidden');
            // }
        }
    } else {
        // Fetch game data from server (needed for fresh load or after startOver)
        fetchGameData(seed);
    }
}

function formatSeedToDate(seed) {
    // Convert seed to string first
    const seedStr = String(seed);

    // Only format as date if it's in YYYYMMDD format (8 digits)
    if (seedStr.length === 8 && /^\d{8}$/.test(seedStr)) {
        const year = seedStr.substring(0, 4);
        const month = seedStr.substring(4, 6);
        const day = seedStr.substring(6, 8);
        const date = new Date(year, month - 1, day);

        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric'
        });
    }

    // For timestamp or other seeds, return empty string (run mode uses Set/Round display)
    return '';
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
            } else {
                // Regular squares get explicit class too (consistent with special squares)
                cell.classList.add('regular-square');
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

    // Include purchased and removed tiles for pool modifications
    const purchasedParam = runState.purchasedTiles?.length
        ? `&purchased_tiles=${encodeURIComponent(JSON.stringify(runState.purchasedTiles))}`
        : '';
    const removedParam = runState.removedTiles?.length
        ? `&removed_tiles=${encodeURIComponent(JSON.stringify(runState.removedTiles))}`
        : '';
    // The Minter: request one fewer tile from bag (we'll generate the 7th locally)
    const hasMinter = hasRogue('minter');
    const rackSize = getRackSize() - (hasMinter ? 1 : 0);
    fetch(`${API_BASE}/letters.py?seed=${seed}${purchasedParam}${removedParam}&rack_size=${rackSize}`)
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

            // The Minter: create the 7th tile with +1 buff
            if (hasMinter) {
                const mintedLetter = generateRandomTileLetter();
                // Add minted tile to rack (will be displayed with bonus)
                gameState.tiles.push(mintedLetter);
                // Track this minted tile so it shows up buffed
                if (!runState.mintedTilesThisRound) {
                    runState.mintedTilesThisRound = [];
                }
                runState.mintedTilesThisRound.push(mintedLetter);
                // Add to purchasedTiles so it persists in the bag for future rounds
                if (!runState.purchasedTiles) {
                    runState.purchasedTiles = [];
                }
                runState.purchasedTiles.push({ letter: mintedLetter, bonus: 1 });
                runManager.saveRunState();
                console.log(`[Minter] Created buffed tile: ${mintedLetter}`);
            }

            // Track tiles drawn from bag (for bag viewer)
            gameState.tilesDrawnFromBag = [...data.tiles];

            // Save original rack at turn START (before shuffle/placement)
            // This prevents corruption when user shuffles after placing tiles
            // Use gameState.tiles (not data.tiles) to include minted tile if applicable
            gameState.turnStartRack = [...gameState.tiles];

            // Track game start time and fire analytics event
            gameState.gameStartTime = Date.now();
            Analytics.game.started(
                gameState.seed,
                'direct',  // User came directly, not from shared URL
                gameState.startingWord
            );

            // Place starting word on board
            placeStartingWord(data.starting_word);

            // Display initial tiles with animation from bag
            displayTilesAnimated(data.tiles, 0);

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
        scoreSpan.textContent = getTileDisplayScore(word[i]);

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

    // Create a 1x7 or 1x8 rack board (8 with Big Pockets rogue)
    const rackSize = getRackSize();
    const row = 0;
    for (let col = 0; col < rackSize; col++) {
        const cell = document.createElement('div');
        cell.className = 'board-cell rack-cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.id = `rack-${row}-${col}`;
        rackBoard.appendChild(cell);
    }

    // Update CSS grid to accommodate extra cell if needed
    if (rackSize === 8) {
        rackBoard.style.gridTemplateColumns = 'repeat(8, 1fr)';
    } else {
        rackBoard.style.gridTemplateColumns = 'repeat(7, 1fr)';
    }
}

function displayTiles(tiles) {
    const rackBoard = document.getElementById('tile-rack-board');
    const cells = rackBoard.querySelectorAll('.rack-cell');

    // Clear all cells
    cells.forEach(cell => cell.innerHTML = '');

    // Mark which tiles are buffed (from shop purchases)
    const markedTiles = markBuffedTiles(tiles);

    // Update rackTiles in game state (now stores full tile objects)
    gameState.rackTiles = [...markedTiles];

    // Place tiles in all 7 rack cells (row 0, columns 0-6)
    markedTiles.forEach((tileData, index) => {
        const cell = document.getElementById(`rack-0-${index}`); // Row 0, columns 0-6
        if (cell) {
            const tile = createTileElement(tileData.letter, index, false, tileData.buffed, tileData.bonus, tileData.coinTile);
            cell.appendChild(tile);
        }
    });

    // Update Top Deck display if that rogue is active
    if (typeof runManager !== 'undefined' && runManager.renderTopDeck) {
        runManager.renderTopDeck();
    }
}

function createTileElement(letter, index, isBlank = false, buffed = false, bonus = 0, coinTile = false) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.letter = letter;
    tile.dataset.index = index;

    // Check if this is a blank tile (either '_' or explicit isBlank flag)
    const tileIsBlank = letter === '_' || isBlank;
    if (tileIsBlank) {
        tile.classList.add('blank-tile');
        tile.dataset.isBlank = 'true';
    }

    // Create letter span
    const letterSpan = document.createElement('span');
    letterSpan.className = 'tile-letter';
    if (tileIsBlank && letter === '_') {
        letterSpan.textContent = '';  // Empty in rack
    } else if (tileIsBlank) {
        letterSpan.textContent = letter.toUpperCase();  // Assigned blank shows letter
        letterSpan.classList.add('blank-letter');  // 70% opacity styling
    } else {
        letterSpan.textContent = letter;
    }

    // Create score span
    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'tile-score';
    scoreSpan.textContent = tileIsBlank ? '' : getTileDisplayScore(letter, bonus);

    tile.appendChild(letterSpan);
    tile.appendChild(scoreSpan);

    // Apply tile effects (buffed, coin, etc.) using centralized system
    applyTileEffects(tile, { buffed, bonus, coinTile });

    // Add click event for selection
    tile.addEventListener('click', handleTileClick);

    return tile;
}

// ============================================================================
// TILE ANIMATIONS
// ============================================================================
// Animation Standards (keep consistent across all tile animations):
//
// DURATIONS (by distance):
// - 400ms: Bag ↔ Rack (long distance, with scale effect)
// - 200ms: Rack ↔ Board (medium distance)
// - 100ms: Board ↔ Board, Rack ↔ Rack (short repositioning)
//
// MULTI-TILE STAGGER:
// - Stagger = duration / 7 (tiles overlap, card-dealing effect)
// - 400ms flight → 57ms stagger
// - 200ms flight → 29ms stagger
// - 100ms flight → 14ms stagger
//
// OTHER STANDARDS:
// - Easing: cubic-bezier(0.4, 0, 0.2, 1)
// - Bag animations: scale(0.2) ↔ scale(1), opacity(0) ↔ opacity(1)
// - Other animations: no scale, just position
// - Sizing: Match actual target cell dimensions
// - Initial paint delay: 16ms (one frame) for scale animations
// ============================================================================

// Universal tile animation function - use this for ALL tile animations
// Captures positions upfront, hides originals completely, animates clones
async function animateTileMovement(tiles, getTargetRect, options = {}) {
    const {
        duration = 200,
        stagger = 0,
        scale = 1,
        fade = false,
        cleanup = false,  // Remove tiles from DOM after animation
        shadow = true
    } = options;

    // Skip animation if URL has ?animate=0 (for testing)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('animate') === '0') {
        if (cleanup) tiles.forEach(tile => tile.remove());
        return;
    }

    if (tiles.length === 0) return;

    // STEP 1: Capture ALL source positions BEFORE anything else
    const tileData = tiles.map((tile, index) => ({
        tile,
        sourceRect: tile.getBoundingClientRect(),
        targetRect: getTargetRect(tile, index)
    }));

    // STEP 2: Clear selection state (only clear CSS classes, not the selectedTile variable)
    tiles.forEach(tile => tile.classList.remove('selected', 'selected-for-exchange'));

    // STEP 3: Hide originals (no delay - was causing offset issues on mobile)
    tileData.forEach(({ tile }) => {
        tile.style.display = 'none';
    });

    // STEP 4: Create clones and animate (preserve font sizes since clones lose parent context)
    const clones = tileData.map(({ tile, sourceRect, targetRect }) => {
        // Capture computed font sizes from original tile's children
        const letterEl = tile.querySelector('.tile-letter');
        const valueEl = tile.querySelector('.tile-value') || tile.querySelector('.tile-score');
        const letterFontSize = letterEl ? getComputedStyle(letterEl).fontSize : null;
        const valueFontSize = valueEl ? getComputedStyle(valueEl).fontSize : null;

        const clone = tile.cloneNode(true);

        // Reset clone styles completely
        clone.style.cssText = '';
        clone.style.position = 'fixed';
        clone.style.left = sourceRect.left + 'px';
        clone.style.top = sourceRect.top + 'px';
        clone.style.width = sourceRect.width + 'px';
        clone.style.height = sourceRect.height + 'px';
        clone.style.zIndex = '10000';
        clone.style.pointerEvents = 'none';
        clone.style.margin = '0';
        clone.style.display = 'flex';
        clone.style.visibility = 'visible';
        clone.style.opacity = '1';
        if (shadow) {
            clone.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        }
        clone.classList.remove('selected', 'selected-for-exchange');

        // Apply font sizes to clone's children
        const cloneLetter = clone.querySelector('.tile-letter');
        const cloneValue = clone.querySelector('.tile-value') || clone.querySelector('.tile-score');
        if (cloneLetter && letterFontSize) cloneLetter.style.fontSize = letterFontSize;
        if (cloneValue && valueFontSize) cloneValue.style.fontSize = valueFontSize;

        document.body.appendChild(clone);
        return { clone, targetRect, tile };
    });

    // STEP 5: Animate using Web Animations API (more reliable than CSS transitions)
    const animations = clones.map(({ clone, targetRect }, index) => {
        return new Promise(resolve => {
            setTimeout(() => {
                const animation = clone.animate([
                    {
                        left: clone.style.left,
                        top: clone.style.top,
                        width: clone.style.width,
                        height: clone.style.height,
                        opacity: 1,
                        transform: 'scale(1)'
                    },
                    {
                        left: targetRect.left + 'px',
                        top: targetRect.top + 'px',
                        width: targetRect.width + 'px',
                        height: targetRect.height + 'px',
                        opacity: fade ? 0 : 1,
                        transform: `scale(${scale})`
                    }
                ], {
                    duration,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    fill: 'forwards'
                });

                animation.onfinish = () => resolve();
            }, index * stagger);
        });
    });

    await Promise.all(animations);

    // STEP 6: Clean up
    clones.forEach(({ clone, tile }) => {
        clone.remove();
        if (cleanup) {
            tile.remove();
        }
    });
}

// Animate a tile flying from rack to a board cell (200ms per Rack ↔ Board standard)
async function animateTileRackToBoard(sourceTile, targetCell) {
    if (!sourceTile || !targetCell) return Promise.resolve();

    const targetRect = targetCell.getBoundingClientRect();

    await animateTileMovement([sourceTile], () => targetRect, {
        duration: 200,
        cleanup: false
    });
}

// Animate a tile flying from board cell to rack cell (200ms per Rack ↔ Board standard)
async function animateTileBoardToRack(boardCell, targetRackCell) {
    const tile = boardCell.querySelector('.tile');
    if (!tile || !targetRackCell) return Promise.resolve();

    const targetRect = targetRackCell.getBoundingClientRect();

    await animateTileMovement([tile], () => targetRect, {
        duration: 150,
        cleanup: false
    });
}

// Animate existing rack tiles sliding left to consolidate (fill gaps)
async function animateRackSlideLeft(existingTileCount) {
    if (existingTileCount === 0) return;

    const rackBoard = document.getElementById('tile-rack-board');
    const cells = rackBoard.querySelectorAll('.rack-cell');

    // Find all tiles currently in rack cells and their positions
    const tilesWithPositions = [];
    cells.forEach((cell, index) => {
        const tile = cell.querySelector('.tile');
        if (tile) {
            tilesWithPositions.push({
                tile: tile,
                currentIndex: index,
                rect: tile.getBoundingClientRect()
            });
        }
    });

    // If no tiles or tiles are already consolidated, nothing to animate
    if (tilesWithPositions.length === 0) return;

    // Check if tiles need to slide (are there gaps?)
    const needsSlide = tilesWithPositions.some((t, i) => t.currentIndex !== i);
    if (!needsSlide) return;

    // Get target positions (consolidated left: 0, 1, 2, ...)
    const targetRects = [];
    for (let i = 0; i < tilesWithPositions.length; i++) {
        const targetCell = document.getElementById(`rack-0-${i}`);
        if (targetCell) {
            targetRects.push(targetCell.getBoundingClientRect());
        }
    }

    // Create clone tiles for animation, hide originals (preserve font sizes)
    const clones = tilesWithPositions.map((t, newIndex) => {
        // Capture computed font sizes from original tile's children
        const letterEl = t.tile.querySelector('.tile-letter');
        const valueEl = t.tile.querySelector('.tile-value') || t.tile.querySelector('.tile-score');
        const letterFontSize = letterEl ? getComputedStyle(letterEl).fontSize : null;
        const valueFontSize = valueEl ? getComputedStyle(valueEl).fontSize : null;

        const clone = t.tile.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.left = t.rect.left + 'px';
        clone.style.top = t.rect.top + 'px';
        clone.style.width = t.rect.width + 'px';
        clone.style.height = t.rect.height + 'px';
        clone.style.zIndex = '9999';
        clone.style.pointerEvents = 'none';
        clone.style.margin = '0';
        clone.style.transition = 'left 0.1s cubic-bezier(0.4, 0, 0.2, 1)';

        // Apply font sizes to clone's children
        const cloneLetter = clone.querySelector('.tile-letter');
        const cloneValue = clone.querySelector('.tile-value') || clone.querySelector('.tile-score');
        if (cloneLetter && letterFontSize) cloneLetter.style.fontSize = letterFontSize;
        if (cloneValue && valueFontSize) cloneValue.style.fontSize = valueFontSize;

        document.body.appendChild(clone);
        t.tile.style.visibility = 'hidden';
        return { clone, targetRect: targetRects[newIndex] };
    });

    // Trigger slide animation
    await new Promise(resolve => {
        requestAnimationFrame(() => {
            clones.forEach(({ clone, targetRect }) => {
                clone.style.left = targetRect.left + 'px';
            });
            // Wait for animation to complete (100ms per Rack ↔ Rack standard)
            setTimeout(resolve, 100);
        });
    });

    // Clean up clones
    clones.forEach(({ clone }) => clone.remove());
}

// Animate a tile moving from one board cell to another (100ms for short repositioning)
// Returns a promise that resolves when animation completes
async function animateTileBoardToBoard(tile, fromCell, toCell) {
    if (!tile || !fromCell || !toCell) return Promise.resolve();

    const targetRect = toCell.getBoundingClientRect();

    await animateTileMovement([tile], () => targetRect, {
        duration: 100,
        cleanup: false
    });
}

// Animate two tiles swapping positions with bow-out paths (to avoid collision)
// Tiles curve away from each other perpendicular to the swap direction
// Returns a promise that resolves when animation completes
async function animateSwapWithArcs(tile1, rect1, tile2, rect2, duration = 200) {
    // Clear selection state FIRST (before capturing positions)
    tile1.classList.remove('selected');
    tile2.classList.remove('selected');
    if (typeof selectedTile !== 'undefined') selectedTile = null;

    // Capture positions AFTER selection cleared to avoid drift from .selected CSS
    rect1 = tile1.getBoundingClientRect();
    rect2 = tile2.getBoundingClientRect();

    // Hide both original tiles
    tile1.style.visibility = 'hidden';
    tile1.style.opacity = '0';
    tile2.style.visibility = 'hidden';
    tile2.style.opacity = '0';

    // Create clones
    const clone1 = tile1.cloneNode(true);
    const clone2 = tile2.cloneNode(true);

    // Style clones (preserve font sizes since clones lose parent context)
    [clone1, clone2].forEach((clone, i) => {
        const tile = i === 0 ? tile1 : tile2;
        const rect = i === 0 ? rect1 : rect2;

        // Capture computed font sizes from original tile's children
        const letterEl = tile.querySelector('.tile-letter');
        const valueEl = tile.querySelector('.tile-value') || tile.querySelector('.tile-score');
        const letterFontSize = letterEl ? getComputedStyle(letterEl).fontSize : null;
        const valueFontSize = valueEl ? getComputedStyle(valueEl).fontSize : null;

        clone.style.position = 'fixed';
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        clone.style.zIndex = '10000';
        clone.style.pointerEvents = 'none';
        clone.style.margin = '0';
        clone.style.visibility = 'visible';
        clone.style.opacity = '1';
        clone.style.transition = 'none';

        // Apply font sizes to clone's children
        const cloneLetter = clone.querySelector('.tile-letter');
        const cloneValue = clone.querySelector('.tile-value') || clone.querySelector('.tile-score');
        if (cloneLetter && letterFontSize) cloneLetter.style.fontSize = letterFontSize;
        if (cloneValue && valueFontSize) cloneValue.style.fontSize = valueFontSize;

        document.body.appendChild(clone);
    });

    // Calculate perpendicular offset for bow-out effect
    const deltaX = rect2.left - rect1.left;
    const deltaY = rect2.top - rect1.top;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const bowAmount = Math.max(20, distance * 0.25);

    // Perpendicular direction (normalized)
    const perpX = -deltaY / distance;
    const perpY = deltaX / distance;

    // Midpoint
    const midX = (rect1.left + rect2.left) / 2;
    const midY = (rect1.top + rect2.top) / 2;

    // Animate using Web Animations API with keyframes
    // tile1 bows out in +perpendicular direction
    const animation1 = clone1.animate([
        { left: rect1.left + 'px', top: rect1.top + 'px' },
        { left: (midX + perpX * bowAmount) + 'px', top: (midY + perpY * bowAmount) + 'px' },
        { left: rect2.left + 'px', top: rect2.top + 'px' }
    ], { duration, easing: 'ease-in-out', fill: 'forwards' });

    // tile2 bows out in -perpendicular direction
    const animation2 = clone2.animate([
        { left: rect2.left + 'px', top: rect2.top + 'px' },
        { left: (midX - perpX * bowAmount) + 'px', top: (midY - perpY * bowAmount) + 'px' },
        { left: rect1.left + 'px', top: rect1.top + 'px' }
    ], { duration, easing: 'ease-in-out', fill: 'forwards' });

    // Wait for both animations to complete
    await Promise.all([animation1.finished, animation2.finished]);

    // Restore visibility
    tile1.style.visibility = '';
    tile1.style.opacity = '';
    tile2.style.visibility = '';
    tile2.style.opacity = '';

    // Brief pause before removing clones to ensure smooth transition
    setTimeout(() => {
        clone1.remove();
        clone2.remove();
    }, 100);
}

// Animate tiles flying from rack to bag (for exchange)
// Returns a promise that resolves when all animations complete
async function animateTilesToBag(tiles) {
    const bagIcon = document.getElementById('bag-viewer-btn');
    if (!bagIcon || tiles.length === 0) {
        tiles.forEach(tile => tile.remove());
        return;
    }

    const bagRect = bagIcon.getBoundingClientRect();

    // Pulse bag icon
    bagIcon.style.transform = 'scale(1.2)';
    setTimeout(() => bagIcon.style.transform = '', 200);

    await animateTileMovement(tiles, (tile, index) => ({
        // Center on bag icon
        left: bagRect.left + bagRect.width / 2 - 25,
        top: bagRect.top + bagRect.height / 2 - 25,
        width: 50,
        height: 50
    }), {
        duration: 400,
        stagger: 57,
        scale: 0.2,
        fade: true,
        cleanup: true
    });
}

// Animate a tile flying from bag icon to a rack cell
function animateTileFromBagToRack(letter, rackIndex, isBlank = false, buffed = false, bonus = 0, coinTile = false) {
    const bagIcon = document.getElementById('bag-viewer-btn');
    const targetCell = document.getElementById(`rack-0-${rackIndex}`);
    if (!bagIcon || !targetCell) return Promise.resolve();

    const bagRect = bagIcon.getBoundingClientRect();
    const targetRect = targetCell.getBoundingClientRect();

    // Use target cell's actual size for the animated tile
    const tileWidth = targetRect.width;
    const tileHeight = targetRect.height;

    // Create tile for animation
    const tile = document.createElement('div');
    tile.className = 'tile';
    if (isBlank) tile.classList.add('blank-tile');
    tile.style.position = 'fixed';
    tile.style.width = tileWidth + 'px';
    tile.style.height = tileHeight + 'px';
    tile.style.left = (bagRect.left + bagRect.width / 2 - tileWidth / 2) + 'px';
    tile.style.top = (bagRect.top + bagRect.height / 2 - tileHeight / 2) + 'px';
    tile.style.zIndex = '10000';
    tile.style.pointerEvents = 'none';
    tile.style.transform = 'scale(0.2)';
    tile.style.opacity = '0';

    // Add letter and score
    const displayLetter = (letter === '_' || isBlank) ? '' : letter;
    const baseScore = (letter === '_' || isBlank) ? 0 : (TILE_SCORES[letter] || 0);
    const score = (letter === '_' || isBlank) ? '' : (baseScore + bonus);
    tile.innerHTML = `
        <span class="tile-letter">${displayLetter}</span>
        <span class="tile-score">${score}</span>
    `;

    // Apply tile effects using centralized system
    applyTileEffects(tile, { buffed, bonus, coinTile });

    document.body.appendChild(tile);

    // Pulse bag icon
    bagIcon.style.transform = 'scale(0.8)';
    setTimeout(() => bagIcon.style.transform = '', 100);

    return new Promise(resolve => {
        // Use setTimeout to ensure browser has painted the small state
        setTimeout(() => {
            // Grow AND fly at the same time
            tile.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            tile.style.left = targetRect.left + 'px';
            tile.style.top = targetRect.top + 'px';
            tile.style.transform = 'scale(1)';
            tile.style.opacity = '1';

            // Clean up and place real tile (wait for 400ms animation + buffer)
            setTimeout(() => {
                // Hide animated tile before removing to mask any position difference
                tile.style.opacity = '0';
                tile.remove();
                resolve();
            }, 420);
        }, 16); // One frame delay (~16ms) to let browser paint small state
    });
}

// Display tiles with animation from bag
// existingTileCount: number of tiles already on rack that should stay (not animate)
// - 0 = all tiles animate (game start)
// - > 0 = first N tiles slide left, then new tiles animate from bag
async function displayTilesAnimated(tiles, existingTileCount = 0) {
    const rackBoard = document.getElementById('tile-rack-board');
    const cells = rackBoard.querySelectorAll('.rack-cell');

    // Skip animation if URL has ?animate=0 (for testing)
    const urlParams = new URLSearchParams(window.location.search);
    const skipAnimation = urlParams.get('animate') === '0';

    // Mark which tiles are buffed (from shop purchases)
    const markedTiles = markBuffedTiles(tiles);

    if (skipAnimation) {
        // No animation - clear and place all tiles immediately
        cells.forEach(cell => cell.innerHTML = '');
        gameState.rackTiles = [...markedTiles];
        markedTiles.forEach((tileData, index) => {
            const cell = document.getElementById(`rack-0-${index}`);
            if (cell) {
                const isBlank = tileData.letter === '_';
                const tile = createTileElement(tileData.letter, index, isBlank, tileData.buffed, tileData.bonus, tileData.coinTile);
                cell.appendChild(tile);
            }
        });
        checkWordValidity();
        return;
    }

    // If there are existing tiles, animate them sliding left first
    if (existingTileCount > 0) {
        await animateRackSlideLeft(existingTileCount);
    }

    // Now clear all cells and place existing tiles at consolidated positions
    cells.forEach(cell => cell.innerHTML = '');
    gameState.rackTiles = [...markedTiles];

    // Place existing tiles immediately at their new positions (0, 1, 2, ...)
    for (let index = 0; index < existingTileCount && index < markedTiles.length; index++) {
        const tileData = markedTiles[index];
        const isBlank = tileData.letter === '_';
        const cell = document.getElementById(`rack-0-${index}`);
        if (cell) {
            const tile = createTileElement(tileData.letter, index, isBlank, tileData.buffed, tileData.bonus, tileData.coinTile);
            cell.appendChild(tile);
        }
    }

    // Animate only the NEW tiles from the bag
    // Overlapping animation: each tile starts when previous is 1/7 through flight
    const staggerDelay = 57; // ms between tile starts (1/7 of 400ms flight)

    const animations = [];
    for (let index = existingTileCount; index < markedTiles.length; index++) {
        const tileData = markedTiles[index];
        const isBlank = tileData.letter === '_';
        const delay = (index - existingTileCount) * staggerDelay;

        // Create a promise that handles the delayed animation and tile placement
        const animationPromise = new Promise(async (resolve) => {
            // Wait for staggered start
            if (delay > 0) {
                await new Promise(r => setTimeout(r, delay));
            }

            // Animate tile from bag to rack
            await animateTileFromBagToRack(tileData.letter, index, isBlank, tileData.buffed, tileData.bonus, tileData.coinTile);

            // Place real tile in cell
            const cell = document.getElementById(`rack-0-${index}`);
            if (cell) {
                const tile = createTileElement(tileData.letter, index, isBlank, tileData.buffed, tileData.bonus, tileData.coinTile);
                cell.appendChild(tile);
            }
            resolve();
        });
        animations.push(animationPromise);
    }

    // Wait for all animations to complete
    await Promise.all(animations);

    checkWordValidity();
}

// ============================================================================
// END TILE ANIMATIONS
// ============================================================================

// ============================================================================
// RACK VALIDATION (Defensive Checks)
// ============================================================================

/**
 * Get the canonical letter for a tile element.
 * Blanks are tracked as '_' not their assigned letter.
 */
function getCanonicalTileLetter(tile) {
    if (tile.dataset.isBlank === 'true') {
        return '_';
    }
    return tile.dataset.letter;
}

/**
 * Rebuild rackTiles array from DOM using canonical letters.
 * This ensures blanks are tracked as '_' not their assigned letter.
 */
function rebuildRackTilesFromDOM() {
    const rackBoard = document.getElementById('tile-rack-board');
    if (!rackBoard) return [];

    const cells = rackBoard.querySelectorAll('.rack-cell');
    const tiles = [];

    cells.forEach(cell => {
        const tile = cell.querySelector('.tile');
        if (tile) {
            tiles.push(getCanonicalTileLetter(tile));
        }
    });

    return tiles;
}

/**
 * Validate that current tiles (rack + board) match turn start.
 * Logs errors if tiles have changed unexpectedly.
 */
function validateRackConsistency(operation) {
    const canonical = gameState.turnStartRack;
    if (!canonical || canonical.length === 0) return true;

    // Get tiles currently on board (placed this turn)
    const boardTiles = gameState.placedTiles.map(t => t.isBlank ? '_' : t.letter);

    // Rebuild rack tiles from DOM to get canonical letters
    const rackTiles = rebuildRackTilesFromDOM();

    // Combine and sort for comparison
    const current = [...boardTiles, ...rackTiles].sort();

    // Handle canonical being array of objects or strings
    const expectedLetters = canonical.map(t => typeof t === 'object' ? t.letter : t);
    const expected = [...expectedLetters].sort();

    if (current.join(',') !== expected.join(',')) {
        console.error(`[RACK VALIDATION FAILED] ${operation}`);
        console.error(`  Expected: ${expected.join(',')}`);
        console.error(`  Got: ${current.join(',')}`);
        console.error(`  Board tiles: ${boardTiles.join(',')}`);
        console.error(`  Rack tiles: ${rackTiles.join(',')}`);
        return false;
    }

    if (gameState.debugMode) {
        console.log(`[RACK VALID] ${operation}: ${current.join(',')}`);
    }
    return true;
}

// ============================================================================
// END RACK VALIDATION
// ============================================================================

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
    document.getElementById('close-error').addEventListener('click', () => {
        document.getElementById('error-modal').style.display = 'none';
    });

    // Exchange tiles button and modal handlers
    document.getElementById('exchange-tiles')?.addEventListener('click', enterExchangeMode);
    document.getElementById('cancel-exchange')?.addEventListener('click', cancelExchange);
    document.getElementById('confirm-exchange')?.addEventListener('click', confirmExchange);

    // Popup close handlers
    const popupCloseX = document.getElementById('popup-close-x');
    if (popupCloseX) {
        popupCloseX.addEventListener('click', () => {
            const popup = document.getElementById('game-popup');
            if (popup) {
                popup.classList.add('hidden');
                // In run mode, closing game-over popup starts a new game
                if (!runState.isRunMode) {
                    // Run state was cleared, start fresh game
                    runManager.startRun();
                }
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

    // Run Mode Event Listeners
    document.getElementById('start-run-btn')?.addEventListener('click', () => {
        runManager.startRun();
    });

    document.getElementById('next-round-btn')?.addEventListener('click', () => {
        runManager.nextRound();
    });

    document.getElementById('try-again-btn')?.addEventListener('click', () => {
        runManager.hideAllRunPopups();
        runManager.showStartRun();
    });

    document.getElementById('next-set-btn')?.addEventListener('click', () => {
        runManager.hideAllRunPopups();
        runManager.nextSet();
    });

    // Earnings screen Continue button
    document.getElementById('earnings-continue-btn')?.addEventListener('click', () => {
        runManager.continueFromEarnings();
    });

    // Set Complete screen Continue button
    document.getElementById('set-continue-btn')?.addEventListener('click', () => {
        runManager.continueFromSetComplete();
    });

    // Shop screen buttons
    document.getElementById('shop-continue-btn')?.addEventListener('click', () => {
        runManager.continueFromShop();
    });
    document.getElementById('shop-add-0')?.addEventListener('click', () => {
        runManager.purchaseTileAdd(0);
    });
    document.getElementById('shop-add-1')?.addEventListener('click', () => {
        runManager.purchaseTileAdd(1);
    });
    document.getElementById('shop-replace-0')?.addEventListener('click', () => {
        runManager.purchaseTileReplace(0);
    });
    document.getElementById('shop-replace-1')?.addEventListener('click', () => {
        runManager.purchaseTileReplace(1);
    });
    document.getElementById('shop-upgrade-btn')?.addEventListener('click', () => {
        runManager.purchaseTileSetUpgrade();
    });

    // Rogue modal buttons
    document.getElementById('rogue-modal-close')?.addEventListener('click', () => {
        runManager.hideRogueModal();
    });
    document.getElementById('rogue-discard-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('rogue-modal');
        if (modal && modal.dataset.rogueId) {
            runManager.discardRogue(modal.dataset.rogueId);
        }
    });
    document.getElementById('rogue-modal')?.addEventListener('click', (e) => {
        // Close when clicking outside the content
        if (e.target.id === 'rogue-modal') runManager.hideRogueModal();
    });

    // Rogue discard modal buttons (when purchasing at max capacity)
    document.getElementById('rogue-discard-modal-close')?.addEventListener('click', () => {
        runManager.hideRogueDiscardModal();
    });
    document.getElementById('rogue-discard-cancel')?.addEventListener('click', () => {
        runManager.hideRogueDiscardModal();
    });
    document.getElementById('rogue-discard-modal')?.addEventListener('click', (e) => {
        // Close when clicking outside the content
        if (e.target.id === 'rogue-discard-modal') runManager.hideRogueDiscardModal();
    });

    // Bag viewer buttons
    document.getElementById('bag-viewer-btn')?.addEventListener('click', showBagViewer);
    document.getElementById('bag-close-btn')?.addEventListener('click', hideBagViewer);
    document.getElementById('bag-viewer-popup')?.addEventListener('click', (e) => {
        // Close when clicking outside the content
        if (e.target.id === 'bag-viewer-popup') hideBagViewer();
    });
    document.getElementById('bag-toggle-remaining')?.addEventListener('click', () => setBagViewMode('remaining'));
    document.getElementById('bag-toggle-total')?.addEventListener('click', () => setBagViewMode('total'));

    // Escape key closes bag viewer
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const bagPopup = document.getElementById('bag-viewer-popup');
            if (bagPopup && bagPopup.style.display !== 'none') {
                hideBagViewer();
            }
        }
    });

    // Close buttons for run popups
    document.querySelectorAll('#round-complete-popup .popup-close-btn, #run-failed-popup .popup-close-btn, #run-victory-popup .popup-close-btn, #start-run-popup .popup-close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.popup-content').parentElement.classList.add('hidden');
        });
    });

    // Initialize blank letter grid
    initLetterGrid();
}

// ============================================================================
// BLANK TILE FUNCTIONS
// ============================================================================

function initLetterGrid() {
    const letterGrid = document.getElementById('letter-grid');
    if (!letterGrid) return;

    letterGrid.innerHTML = '';
    for (let i = 0; i < 26; i++) {
        const letter = String.fromCharCode(65 + i); // A-Z
        const button = document.createElement('button');
        button.textContent = letter;
        button.addEventListener('click', () => handleBlankLetterSelection(letter));
        letterGrid.appendChild(button);
    }

    // Cancel button handler
    document.getElementById('cancel-blank-selection')?.addEventListener('click', hideBlankLetterModal);

    // Click outside modal content dismisses it
    const modal = document.getElementById('blank-letter-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            // Only dismiss if clicking the backdrop, not the modal content
            if (e.target === modal) {
                hideBlankLetterModal();
            }
        });
    }
}

function showBlankLetterModal(cell, tile) {
    gameState.pendingBlankPlacement = { cell, tile };
    const modal = document.getElementById('blank-letter-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideBlankLetterModal() {
    const modal = document.getElementById('blank-letter-modal');
    if (modal) {
        modal.style.display = 'none';
    }

    // Clear pending placement
    gameState.pendingBlankPlacement = null;

    // Deselect tile if selection was cancelled
    if (selectedTile) {
        selectedTile.classList.remove('selected');
        selectedTile = null;
    }
    selectedTilePosition = null;
}

async function handleBlankLetterSelection(letter) {
    if (!gameState.pendingBlankPlacement) {
        hideBlankLetterModal();
        return;
    }

    const { cell, tile, isChanging, isSwap, boardLetter, boardIsBlank, rackTile, boardPosition } = gameState.pendingBlankPlacement;

    // Hide modal first
    const modal = document.getElementById('blank-letter-modal');
    if (modal) {
        modal.style.display = 'none';
    }

    if (isSwap) {
        // Swapping blank from rack with a board tile
        // Safety check: if boardLetter is missing, abort the swap
        if (!boardLetter || !/^[A-Z]$/.test(boardLetter)) {
            console.error('Swap aborted: invalid boardLetter', boardLetter);
            gameState.pendingBlankPlacement = null;
            return;
        }

        // 1. Update the rack tile DOM to show the board letter (or blank if board was blank)
        if (boardIsBlank) {
            // Board tile was a blank - it reverts to unassigned blank in rack
            rackTile.dataset.letter = '_';
            rackTile.dataset.isBlank = 'true';
            rackTile.classList.add('blank-tile');
            rackTile.querySelector('.tile-letter').textContent = '';
            rackTile.querySelector('.tile-score').textContent = '';
        } else {
            // Board tile was a regular tile - it becomes that letter in rack
            rackTile.dataset.letter = boardLetter;
            rackTile.dataset.isBlank = 'false';
            rackTile.classList.remove('blank-tile');
            rackTile.querySelector('.tile-letter').textContent = boardLetter;
            rackTile.querySelector('.tile-score').textContent = getTileDisplayScore(boardLetter);
        }

        // 2. Update the board tile to show the blank with chosen letter
        const boardTile = cell.querySelector('.tile');
        if (boardTile) {
            boardTile.dataset.letter = letter;
            boardTile.dataset.isBlank = 'true';
            boardTile.classList.add('blank-tile');
            const letterSpan = boardTile.querySelector('.tile-letter');
            letterSpan.textContent = letter;
            letterSpan.classList.add('blank-letter');  // 70% opacity
            boardTile.querySelector('.tile-value').textContent = '';  // Blanks show no score
        }

        // 3. Update gameState.board
        gameState.board[boardPosition.row][boardPosition.col] = letter;

        // 4. Update gameState.placedTiles - mark as blank
        const placedTileIndex = gameState.placedTiles.findIndex(
            t => t.row === boardPosition.row && t.col === boardPosition.col
        );
        if (placedTileIndex !== -1) {
            gameState.placedTiles[placedTileIndex].letter = letter;
            gameState.placedTiles[placedTileIndex].isBlank = true;
        }

        // 5. Rebuild rackTiles array from DOM (preserving buffed info)
        const rackBoard = document.getElementById('tile-rack-board');
        const cells = rackBoard.querySelectorAll('.rack-cell');
        gameState.rackTiles = [];
        cells.forEach(rackCell => {
            const rackTileInCell = rackCell.querySelector('.tile');
            if (rackTileInCell && rackTileInCell.dataset.letter) {
                gameState.rackTiles.push({
                    letter: rackTileInCell.dataset.letter,
                    buffed: rackTileInCell.dataset.buffed === 'true',
                    bonus: parseInt(rackTileInCell.dataset.bonus) || 0,
                    coinTile: rackTileInCell.dataset.coinTile === 'true'
                });
            }
        });

        // 6. Clear pending and update displays
        gameState.pendingBlankPlacement = null;
        saveGameState();
        checkWordValidity();
        updateWordPreview();
        updatePotentialWordsSidebar();
        return;
    }

    if (isChanging) {
        // Changing an existing blank tile's letter
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        // Update board state
        gameState.board[row][col] = letter;

        // Update tile display
        tile.dataset.letter = letter;
        const letterSpan = tile.querySelector('.tile-letter');
        if (letterSpan) {
            letterSpan.textContent = letter;
        }

        // Update placedTiles array
        const placedTile = gameState.placedTiles.find(t => t.row === row && t.col === col);
        if (placedTile) {
            placedTile.letter = letter;
        }

        // Clear pending and selection
        gameState.pendingBlankPlacement = null;
        if (selectedTile) {
            selectedTile.classList.remove('selected');
            selectedTile = null;
        }
        selectedTilePosition = null;

        // Save and update
        saveGameState();
        checkWordValidity();
        updateWordPreview();
    } else {
        // New blank placement - clear pending state
        gameState.pendingBlankPlacement = null;
        await placeBlankTile(cell, tile, letter);
    }
}

function changeBlankLetter(cell, currentTile) {
    // Store the cell and tile for changing
    gameState.pendingBlankPlacement = {
        cell,
        tile: currentTile,
        isChanging: true,
        oldLetter: currentTile.dataset.letter
    };

    // Show the modal
    const modal = document.getElementById('blank-letter-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

async function placeBlankTile(cell, tile, assignedLetter) {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    // Validate assignedLetter is A-Z
    if (!assignedLetter || !/^[A-Z]$/.test(assignedLetter)) {
        console.error('placeBlankTile: invalid assignedLetter', assignedLetter);
        return;
    }

    // Check if placement is valid (cell is empty)
    if (!isValidPlacement(row, col)) {
        return;
    }

    // Animate tile flying from rack to board (before removing from DOM)
    const isFromRack = tile.parentElement?.classList.contains('rack-cell');
    if (isFromRack) {
        await animateTileRackToBoard(tile, cell);
    }

    // Remove tile from its current location
    if (isFromRack) {
        // Get the original letter (underscore) before removing
        const removedLetter = tile.dataset.letter;
        tile.style.opacity = '';
        tile.remove();

        // Remove from rackTiles array (find by letter since rackTiles stores objects)
        const index = gameState.rackTiles.findIndex(t =>
            (typeof t === 'object' ? t.letter : t) === removedLetter
        );
        if (index > -1) {
            gameState.rackTiles.splice(index, 1);
        }
    }

    // Place on board with assigned letter
    gameState.board[row][col] = assignedLetter;

    // Get buffed status from source tile (blanks can be buffed too)
    const isBuffed = tile.dataset.buffed === 'true';
    const bonus = parseInt(tile.dataset.bonus) || 0;
    const isCoinTile = tile.dataset.coinTile === 'true';
    const coinClaimed = tile.dataset.coinClaimed === 'true';

    // Create tile element for the board
    const tileDiv = document.createElement('div');
    tileDiv.className = 'tile placed placed-this-turn blank-tile';
    tileDiv.dataset.letter = assignedLetter;
    tileDiv.dataset.isBlank = 'true';
    tileDiv.dataset.coinClaimed = coinClaimed;

    const letterSpan = document.createElement('span');
    letterSpan.className = 'tile-letter blank-letter';
    letterSpan.textContent = assignedLetter;

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'tile-value';
    // Blanks normally show empty score, but buffed blanks show the bonus
    scoreSpan.textContent = bonus > 0 ? bonus : '';

    tileDiv.appendChild(letterSpan);
    tileDiv.appendChild(scoreSpan);

    // Apply tile effects using centralized system
    applyTileEffects(tileDiv, { buffed: isBuffed, bonus, coinTile: isCoinTile });

    // Add click handler for board tiles
    tileDiv.addEventListener('click', handleTileClick);

    cell.innerHTML = '';
    cell.appendChild(tileDiv);
    cell.classList.add('occupied', 'placed-this-turn');

    // Track placed tile with isBlank, buffed, and coinTile flags
    gameState.placedTiles.push({ row, col, letter: assignedLetter, isBlank: true, buffed: isBuffed, bonus, coinTile: isCoinTile, coinClaimed });

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

// Tile selection handler
let selectedTile = null;
let selectedTilePosition = null; // Track if selected tile is from board
// Make available for debugging
window.selectedTile = null;

// New click-to-swap functionality for rack tiles
async function handleRackClick(e) {
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
            await swapTilesInRack(selectedTile, tile);
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

async function swapTilesInRack(tile1, tile2) {
    // Clear selection FIRST to prevent race conditions during async operations
    if (selectedTile) {
        selectedTile.classList.remove('selected');
    }
    selectedTile = null;
    window.selectedTile = null;
    selectedTilePosition = null;

    const cell1 = tile1.parentElement;
    const cell2 = tile2.parentElement;

    // Animate the swap with arcs (positions captured inside after selection cleared)
    await animateSwapWithArcs(tile1, null, tile2, null, 200);

    // Swap tiles in DOM
    const tempDiv = document.createElement('div');
    cell1.insertBefore(tempDiv, tile1);
    cell2.appendChild(tile1);
    cell1.appendChild(tile2);
    tempDiv.remove();

    // Rebuild rackTiles array from the current visual rack state (preserving buffed info)
    // This prevents bugs when tiles have been placed on board (leaving gaps)
    const rackBoard = document.getElementById('tile-rack-board');
    const cells = rackBoard.querySelectorAll('.rack-cell');
    gameState.rackTiles = [];

    cells.forEach(cell => {
        const tile = cell.querySelector('.tile');
        if (tile && tile.dataset.letter) {
            gameState.rackTiles.push({
                letter: tile.dataset.letter,
                buffed: tile.dataset.buffed === 'true',
                bonus: parseInt(tile.dataset.bonus) || 0,
                coinTile: tile.dataset.coinTile === 'true'
            });
        }
    });

    // Save state
    saveGameState();
}

// Swap a rack tile with a board tile (placed-this-turn only)
async function swapRackAndBoardTile(rackTile, boardPosition) {
    // Clear selection FIRST to prevent race conditions during async operations
    if (selectedTile) {
        selectedTile.classList.remove('selected');
    }
    selectedTile = null;
    window.selectedTile = null;
    selectedTilePosition = null;

    const rackLetter = rackTile.dataset.letter;
    const rackIsBlank = rackTile.dataset.isBlank === 'true' || rackLetter === '_';

    // Capture rack tile's buffed/coin properties
    const rackIsBuffed = rackTile.dataset.buffed === 'true';
    const rackBonus = parseInt(rackTile.dataset.bonus) || 0;
    const rackIsCoinTile = rackTile.dataset.coinTile === 'true';

    // Get board cell and tile
    const boardCell = document.querySelector(
        `.board-cell[data-row="${boardPosition.row}"][data-col="${boardPosition.col}"]`
    );
    if (!boardCell || !boardCell.classList.contains('placed-this-turn')) return;

    const boardTile = boardCell.querySelector('.tile');
    if (!boardTile) return;
    const boardLetter = boardTile.dataset.letter;

    // Validate boardLetter exists
    if (!boardLetter || !/^[A-Z]$/.test(boardLetter)) {
        console.error('swapRackAndBoardTile: invalid boardLetter', boardLetter);
        return;
    }

    // Check if board tile is a blank and get all properties
    const placedTileIndex = gameState.placedTiles.findIndex(
        t => t.row === boardPosition.row && t.col === boardPosition.col
    );
    const boardTileData = placedTileIndex !== -1 ? gameState.placedTiles[placedTileIndex] : null;
    const boardIsBlank = boardTileData?.isBlank || false;
    const boardIsBuffed = boardTileData?.buffed || false;
    const boardBonus = boardTileData?.bonus || 0;
    const boardIsCoinTile = boardTileData?.coinTile || false;
    const boardCoinClaimed = boardTileData?.coinClaimed || false;

    // If rack tile is a blank, show letter selection modal for swap
    if (rackIsBlank) {
        // Store swap context and show modal
        gameState.pendingBlankPlacement = {
            cell: boardCell,
            tile: rackTile,
            isSwap: true,
            boardLetter: boardLetter,
            boardIsBlank: boardIsBlank,
            rackTile: rackTile,
            boardPosition: boardPosition
        };

        // Clear selection before showing modal
        if (selectedTile) {
            selectedTile.classList.remove('selected');
        }
        selectedTile = null;
        selectedTilePosition = null;

        // Show the letter selection modal
        const modal = document.getElementById('blank-letter-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
        return;
    }

    // Animate swap with arcs (positions captured inside after selection cleared)
    await animateSwapWithArcs(rackTile, null, boardTile, null, 200);

    // Update gameState.board with the rack letter
    gameState.board[boardPosition.row][boardPosition.col] = rackLetter;

    // Update gameState.placedTiles with rack tile's properties
    if (placedTileIndex !== -1) {
        gameState.placedTiles[placedTileIndex].letter = rackLetter;
        gameState.placedTiles[placedTileIndex].isBlank = false;
        gameState.placedTiles[placedTileIndex].buffed = rackIsBuffed;
        gameState.placedTiles[placedTileIndex].bonus = rackBonus;
        gameState.placedTiles[placedTileIndex].coinTile = rackIsCoinTile;
        gameState.placedTiles[placedTileIndex].coinClaimed = false; // Reset for new tile
    }

    // Update board tile DOM - transfer rack tile's properties
    boardTile.dataset.letter = rackLetter;
    boardTile.dataset.isBlank = 'false';
    boardTile.classList.remove('blank-tile');
    const boardLetterSpan = boardTile.querySelector('.tile-letter');
    boardLetterSpan.textContent = rackLetter;
    boardLetterSpan.classList.remove('blank-letter');
    boardTile.querySelector('.tile-value').textContent = getTileDisplayScore(rackLetter, rackBonus);

    // Transfer rack tile's effects to board tile using centralized system
    applyTileEffects(boardTile, { buffed: rackIsBuffed, bonus: rackBonus, coinTile: rackIsCoinTile });

    // Update rack tile DOM - transfer board tile's properties
    if (boardIsBlank) {
        rackTile.dataset.letter = '_';
        rackTile.dataset.isBlank = 'true';
        rackTile.classList.add('blank-tile');
        rackTile.querySelector('.tile-letter').textContent = '';
        rackTile.querySelector('.tile-score').textContent = '';
    } else {
        rackTile.dataset.letter = boardLetter;
        rackTile.dataset.isBlank = 'false';
        rackTile.classList.remove('blank-tile');
        rackTile.querySelector('.tile-letter').textContent = boardLetter;
        rackTile.querySelector('.tile-score').textContent = getTileDisplayScore(boardLetter, boardBonus);
    }

    // Transfer board tile's effects to rack tile using centralized system
    applyTileEffects(rackTile, { buffed: boardIsBuffed, bonus: boardBonus, coinTile: boardIsCoinTile })

    // Rebuild rackTiles array from DOM (preserving buffed/coin info)
    const rackBoard = document.getElementById('tile-rack-board');
    const cells = rackBoard.querySelectorAll('.rack-cell');
    gameState.rackTiles = [];
    cells.forEach(cell => {
        const tile = cell.querySelector('.tile');
        if (tile && tile.dataset.letter) {
            gameState.rackTiles.push({
                letter: tile.dataset.letter,
                buffed: tile.dataset.buffed === 'true',
                bonus: parseInt(tile.dataset.bonus) || 0,
                coinTile: tile.dataset.coinTile === 'true'
            });
        }
    });

    // Clear selection
    if (selectedTile) {
        selectedTile.classList.remove('selected');
    }
    selectedTile = null;
    selectedTilePosition = null;

    // Update displays and save
    updateWordPreview();
    checkWordValidity();
    updatePotentialWordsSidebar();
    saveGameState();
}

// Swap two board tiles (both placed-this-turn)
async function swapBoardTiles(position1, position2) {
    // Clear selection FIRST to prevent race conditions during async operations
    if (selectedTile) {
        selectedTile.classList.remove('selected');
    }
    selectedTile = null;
    window.selectedTile = null;
    selectedTilePosition = null;

    const cell1 = document.querySelector(
        `.board-cell[data-row="${position1.row}"][data-col="${position1.col}"]`
    );
    const cell2 = document.querySelector(
        `.board-cell[data-row="${position2.row}"][data-col="${position2.col}"]`
    );

    if (!cell1 || !cell2) return;
    if (!cell1.classList.contains('placed-this-turn') || !cell2.classList.contains('placed-this-turn')) return;

    const tile1 = cell1.querySelector('.tile');
    const tile2 = cell2.querySelector('.tile');
    if (!tile1 || !tile2) return;

    const letter1 = tile1.dataset.letter;
    const letter2 = tile2.dataset.letter;

    // Validate both letters exist
    if (!letter1 || !letter2) {
        console.error('swapBoardTiles: invalid letters', letter1, letter2);
        return;
    }

    // Animate swap (positions captured inside after selection cleared)
    await animateSwapWithArcs(tile1, null, tile2, null, 200);

    // Update gameState.board
    gameState.board[position1.row][position1.col] = letter2;
    gameState.board[position2.row][position2.col] = letter1;

    // Update gameState.placedTiles
    const idx1 = gameState.placedTiles.findIndex(
        t => t.row === position1.row && t.col === position1.col
    );
    const idx2 = gameState.placedTiles.findIndex(
        t => t.row === position2.row && t.col === position2.col
    );
    if (idx1 !== -1) gameState.placedTiles[idx1].letter = letter2;
    if (idx2 !== -1) gameState.placedTiles[idx2].letter = letter1;

    // Capture all tile properties BEFORE modifying
    const tile1IsBlank = tile1.dataset.isBlank === 'true';
    const tile2IsBlank = tile2.dataset.isBlank === 'true';
    const tile1IsBuffed = tile1.dataset.buffed === 'true';
    const tile2IsBuffed = tile2.dataset.buffed === 'true';
    const tile1Bonus = parseInt(tile1.dataset.bonus) || 0;
    const tile2Bonus = parseInt(tile2.dataset.bonus) || 0;
    const tile1IsCoinTile = tile1.dataset.coinTile === 'true';
    const tile2IsCoinTile = tile2.dataset.coinTile === 'true';

    // Also swap isBlank, buffed, bonus, coinTile status in placedTiles
    if (idx1 !== -1 && idx2 !== -1) {
        // Swap isBlank
        const tempIsBlank = gameState.placedTiles[idx1].isBlank;
        gameState.placedTiles[idx1].isBlank = gameState.placedTiles[idx2].isBlank;
        gameState.placedTiles[idx2].isBlank = tempIsBlank;
        // Swap buffed
        const tempBuffed = gameState.placedTiles[idx1].buffed;
        gameState.placedTiles[idx1].buffed = gameState.placedTiles[idx2].buffed;
        gameState.placedTiles[idx2].buffed = tempBuffed;
        // Swap bonus
        const tempBonus = gameState.placedTiles[idx1].bonus;
        gameState.placedTiles[idx1].bonus = gameState.placedTiles[idx2].bonus;
        gameState.placedTiles[idx2].bonus = tempBonus;
        // Swap coinTile
        const tempCoinTile = gameState.placedTiles[idx1].coinTile;
        gameState.placedTiles[idx1].coinTile = gameState.placedTiles[idx2].coinTile;
        gameState.placedTiles[idx2].coinTile = tempCoinTile;
        // Swap coinClaimed
        const tempCoinClaimed = gameState.placedTiles[idx1].coinClaimed;
        gameState.placedTiles[idx1].coinClaimed = gameState.placedTiles[idx2].coinClaimed;
        gameState.placedTiles[idx2].coinClaimed = tempCoinClaimed;
    }

    // Helper to update a tile's DOM with new properties
    function updateTileDom(tile, letter, isBlank, isBuffed, bonus, isCoinTile) {
        tile.dataset.letter = letter;
        const letterSpan = tile.querySelector('.tile-letter');
        letterSpan.textContent = letter;

        // Blank status
        if (isBlank) {
            tile.classList.add('blank-tile');
            tile.dataset.isBlank = 'true';
            letterSpan.classList.add('blank-letter');
        } else {
            tile.classList.remove('blank-tile');
            delete tile.dataset.isBlank;
            letterSpan.classList.remove('blank-letter');
        }

        // Apply tile effects using centralized system
        applyTileEffects(tile, { buffed: isBuffed, bonus, coinTile: isCoinTile });

        // Update score (buffed tiles show boosted score)
        const baseScore = TILE_SCORES[letter] || 0;
        tile.querySelector('.tile-value').textContent = isBlank ? '' : (baseScore + bonus);
    }

    // Update DOM for tile1 (gets tile2's properties)
    updateTileDom(tile1, letter2, tile2IsBlank, tile2IsBuffed, tile2Bonus, tile2IsCoinTile);

    // Update DOM for tile2 (gets tile1's properties)
    updateTileDom(tile2, letter1, tile1IsBlank, tile1IsBuffed, tile1Bonus, tile1IsCoinTile);

    // Clear selection
    if (selectedTile) {
        selectedTile.classList.remove('selected');
    }
    selectedTile = null;
    selectedTilePosition = null;

    // Update displays and save
    updateWordPreview();
    checkWordValidity();
    updatePotentialWordsSidebar();
    saveGameState();
}

// Move a rack tile to an empty rack cell
async function moveRackTileToEmptyCell(rackTile, emptyCell) {
    // Capture target position before move
    const targetRect = emptyCell.getBoundingClientRect();

    // Animate tile to new position
    await animateTileMovement([rackTile], () => targetRect, { duration: 150 });

    // Move tile in DOM and restore visibility
    emptyCell.appendChild(rackTile);
    rackTile.style.display = '';
    rackTile.style.visibility = '';
    rackTile.style.opacity = '';

    // Rebuild rackTiles array from DOM (preserving buffed/coin info)
    const rackBoard = document.getElementById('tile-rack-board');
    const cells = rackBoard.querySelectorAll('.rack-cell');
    gameState.rackTiles = [];
    cells.forEach(cell => {
        const tile = cell.querySelector('.tile');
        if (tile && tile.dataset.letter) {
            gameState.rackTiles.push({
                letter: tile.dataset.letter,
                buffed: tile.dataset.buffed === 'true',
                bonus: parseInt(tile.dataset.bonus) || 0,
                coinTile: tile.dataset.coinTile === 'true'
            });
        }
    });

    // Clear selection
    rackTile.classList.remove('selected');
    selectedTile = null;
    selectedTilePosition = null;

    // Save state
    saveGameState();
}

// Return a board tile to a specific rack cell (not just first empty)
async function returnBoardTileToSpecificRackCell(fromPos, targetRackCell) {
    const fromCell = document.querySelector(
        `.board-cell[data-row="${fromPos.row}"][data-col="${fromPos.col}"]`
    );

    if (!fromCell || !fromCell.classList.contains('placed-this-turn')) {
        return;
    }

    // Find the tile in placedTiles
    const tileIndex = gameState.placedTiles.findIndex(
        t => t.row === fromPos.row && t.col === fromPos.col
    );

    if (tileIndex === -1) return;

    // Get the tile data and remove from placedTiles
    const tileData = gameState.placedTiles.splice(tileIndex, 1)[0];

    // Animate tile flying from board to specific rack cell (200ms)
    await animateTileBoardToRack(fromCell, targetRackCell);

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

    // Create new tile element for the specific rack cell
    // Blanks revert to '_' when returned to rack
    const rackLetter = tileData.isBlank ? '_' : tileData.letter;
    const newTile = createTileElement(rackLetter, 0, tileData.isBlank, tileData.buffed || false, tileData.bonus || 0, tileData.coinTile || false);
    targetRackCell.appendChild(newTile);

    // Rebuild rackTiles array from DOM (preserving buffed/coin info)
    const rackBoard = document.getElementById('tile-rack-board');
    const cells = rackBoard.querySelectorAll('.rack-cell');
    gameState.rackTiles = [];
    cells.forEach(cell => {
        const tile = cell.querySelector('.tile');
        if (tile && tile.dataset.letter) {
            gameState.rackTiles.push({
                letter: tile.dataset.letter,
                buffed: tile.dataset.buffed === 'true',
                bonus: parseInt(tile.dataset.bonus) || 0,
                coinTile: tile.dataset.coinTile === 'true'
            });
        }
    });

    // Clear selection
    if (selectedTile) {
        selectedTile.classList.remove('selected');
    }
    selectedTile = null;
    selectedTilePosition = null;

    // Update displays and save
    updateWordPreview();
    checkWordValidity();
    updatePotentialWordsSidebar();
    saveGameState();
}

async function handleTileClick(e) {
    e.stopPropagation(); // Prevent event bubbling

    // Don't allow tile interactions after game ends
    if (gameState.isGameOver) return;

    const tile = e.target.closest('.tile');
    if (!tile) return;

    // Check if it's a board tile or rack tile
    const parentCell = tile.parentElement;
    const isRackTile = parentCell?.classList.contains('rack-cell');
    const isBoardTile = parentCell?.classList.contains('board-cell') && !isRackTile; // board-cell but NOT rack-cell

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
                await swapTilesInRack(selectedTile, tile);
                // Selection already cleared by swapTilesInRack
            }
            // If selected tile is from board, swap board tile with this rack tile
            else {
                await swapRackAndBoardTile(tile, selectedTilePosition);
                // Defensive: ensure potential words are updated after swap
                updatePotentialWordsSidebar();
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
            // Clicking same tile - if blank, show letter change modal; else deselect
            if (tile.dataset.isBlank === 'true') {
                // Second tap on blank - show letter change modal
                changeBlankLetter(parentCell, tile);
                selectedTile.classList.remove('selected');
                selectedTile = null;
                selectedTilePosition = null;
            } else {
                // Regular tile - just deselect
                selectedTile.classList.remove('selected');
                selectedTile = null;
                selectedTilePosition = null;
            }
        } else if (selectedTile && !selectedTilePosition) {
            // Rack tile is selected, swap with this board tile
            const boardPosition = {
                row: parseInt(parentCell.dataset.row),
                col: parseInt(parentCell.dataset.col)
            };
            await swapRackAndBoardTile(selectedTile, boardPosition);
            // Defensive: ensure potential words are updated after swap
            updatePotentialWordsSidebar();
        } else if (selectedTile && selectedTilePosition) {
            // Another board tile is selected, swap the two board tiles
            const newPosition = {
                row: parseInt(parentCell.dataset.row),
                col: parseInt(parentCell.dataset.col)
            };
            await swapBoardTiles(selectedTilePosition, newPosition);
            // Defensive: ensure potential words are updated after swap
            updatePotentialWordsSidebar();
        } else {
            // No tile selected, select this board tile
            selectedTile = tile;
            selectedTilePosition = {
                row: parseInt(parentCell.dataset.row),
                col: parseInt(parentCell.dataset.col)
            };
            tile.classList.add('selected');
        }
    }
}

async function handleBoardClick(e) {
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
            await moveTileBetweenBoardPositions(selectedTilePosition, cell);
        } else {
            // Selected tile is from rack, place it on board
            await placeTile(cell, selectedTile);
        }
    }
}

async function handleRackBoardClick(e) {
    // Don't allow rack interactions after game ends
    if (gameState.isGameOver) return;

    const cell = e.target.closest('.rack-cell');
    if (!cell) return;

    // If clicking on a tile, let handleTileClick handle it
    if (e.target.closest('.tile')) {
        return;
    }

    // Check if cell is empty and we have a selected tile
    if (!cell.querySelector('.tile') && selectedTile) {
        if (selectedTilePosition) {
            // Board tile selected - move it to this specific rack cell
            await returnBoardTileToSpecificRackCell(selectedTilePosition, cell);
        } else {
            // Rack tile selected - move it to this empty rack cell
            await moveRackTileToEmptyCell(selectedTile, cell);
        }
    }
}

async function moveTileBetweenBoardPositions(fromPos, toCell) {
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
    if (!fromCell) return;

    const tile = fromCell.querySelector('.tile');
    if (!tile) return;

    // Animate tile flying to new position
    await animateTileBoardToBoard(tile, fromCell, toCell);

    // Reset tile visibility after animation (display was set to 'none' by animateTileMovement)
    tile.style.display = '';
    tile.style.visibility = '';
    tile.style.opacity = '';

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

    // Clear selection (check if selectedTile exists - animation may have cleared it)
    if (selectedTile) {
        selectedTile.classList.remove('selected');
    }
    selectedTile = null;
    selectedTilePosition = null;

    // Update preview and save state
    updateWordPreview();
    checkWordValidity();
    updatePotentialWordsSidebar();
    saveGameState();
}

async function returnBoardTileToRack(fromPos) {
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

    // Find target rack cell BEFORE animation (first empty cell)
    const rackBoard = document.getElementById('tile-rack-board');
    const targetRackCell = Array.from(rackBoard.querySelectorAll('.rack-cell'))
        .find(cell => !cell.querySelector('.tile'));

    // Animate tile flying from board to rack (200ms)
    await animateTileBoardToRack(fromCell, targetRackCell);

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

    // Add back to rackTiles array - blanks revert to '_'
    const rackLetter = tileData.isBlank ? '_' : tileData.letter;
    gameState.rackTiles.push({
        letter: rackLetter,
        buffed: tileData.buffed || false,
        bonus: tileData.bonus || 0,
        coinTile: tileData.coinTile || false
    });

    // Create new tile element for rack - blanks show as empty tiles, preserve buffed/coin status
    const newTile = createTileElement(rackLetter, gameState.rackTiles.length - 1, tileData.isBlank, tileData.buffed || false, tileData.bonus || 0, tileData.coinTile || false);
    if (targetRackCell) {
        targetRackCell.appendChild(newTile);
    }

    // Update preview and save state
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

    // Find tile data before removing (to preserve effects)
    const tileData = gameState.placedTiles.find(t => t.row === row && t.col === col);
    const isBlank = tileData?.isBlank || false;
    const isBuffed = tileData?.buffed || false;
    const bonus = tileData?.bonus || 0;
    const isCoinTile = tileData?.coinTile || false;

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
        // Blanks revert to '_' when returned to rack
        const rackLetter = isBlank ? '_' : letter;

        // Create new tile using centralized function (handles effects automatically)
        const newTile = createTileElement(rackLetter, gameState.rackTiles.length, isBlank, isBuffed, bonus, isCoinTile);

        // Add to rack
        const rackBoard = document.getElementById('tile-rack-board');
        const firstEmptyCell = Array.from(rackBoard.querySelectorAll('.rack-cell'))
            .find(cell => !cell.querySelector('.tile'));
        if (firstEmptyCell) {
            firstEmptyCell.appendChild(newTile);
        }

        // Update rackTiles array (preserve effects)
        gameState.rackTiles.push({ letter: rackLetter, buffed: isBuffed, bonus: bonus, coinTile: isCoinTile });
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

async function placeTile(cell, tile) {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const letter = tile.dataset.letter || tile.textContent?.charAt(0); // Handle both rack and board tiles

    // Validate letter exists (except for blanks which use '_')
    if (!letter) {
        console.error('placeTile: tile has no letter', tile);
        return;
    }

    // Check if placement is valid (cell is empty)
    if (!isValidPlacement(row, col)) {
        return;
    }

    // Check if this is a blank tile - show letter selection modal
    if (letter === '_' || tile.dataset.isBlank === 'true') {
        showBlankLetterModal(cell, tile);
        return;  // Modal will handle the actual placement
    }

    // Get buffed/coin status from source tile (before any DOM changes)
    const isBuffed = tile.dataset.buffed === 'true';
    const bonus = parseInt(tile.dataset.bonus) || 0;
    const isCoinTile = tile.dataset.coinTile === 'true';
    const coinClaimed = tile.dataset.coinClaimed === 'true';
    const isFromRack = tile.parentElement?.classList.contains('rack-cell');

    // Animate tile flying from rack to board (if from rack)
    if (isFromRack) {
        await animateTileRackToBoard(tile, cell);
    }

    // Remove tile from its current location
    if (isFromRack) {
        // Get the letter before removing
        const removedLetter = tile.dataset.letter;

        // Reset opacity and display before removing
        tile.style.opacity = '';
        tile.style.display = '';
        tile.remove();

        // Remove from rackTiles array (find by letter since rackTiles stores objects)
        const index = gameState.rackTiles.findIndex(t =>
            (typeof t === 'object' ? t.letter : t) === removedLetter
        );
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
    tileDiv.dataset.coinClaimed = coinClaimed;

    const letterSpan = document.createElement('span');
    letterSpan.className = 'tile-letter';
    letterSpan.textContent = letter;

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'tile-value';
    scoreSpan.textContent = getTileDisplayScore(letter, bonus);

    tileDiv.appendChild(letterSpan);
    tileDiv.appendChild(scoreSpan);

    // Apply tile effects using centralized system
    applyTileEffects(tileDiv, { buffed: isBuffed, bonus, coinTile: isCoinTile });

    // Add click handler for board tiles
    tileDiv.addEventListener('click', handleTileClick);

    cell.innerHTML = '';
    cell.appendChild(tileDiv);
    cell.classList.add('occupied', 'placed-this-turn');

    // Track placed tile with buffed and coinTile info
    gameState.placedTiles.push({ row, col, letter, isBlank: false, buffed: isBuffed, bonus, coinTile: isCoinTile, coinClaimed });

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
    let pinkMultiplier = 1;  // Multiplier from pink tiles (1.5× per pink tile)

    // Track data for rogue effects
    let wordLetters = [];    // For Lone Ranger (vowel count) and Wolf Pack (doubles)
    let buffedTileCount = 0; // For High Value
    let letterSquaresUsed = 0; // For Worder (DL/TL squares)

    positions.forEach(({ row, col }) => {
        const letter = gameState.board[row][col];
        wordLetters.push(letter);

        // Check if this tile is a blank (blanks score 0 regardless of assigned letter)
        // Check both placedTiles (this turn) and blankPositions (previous turns)
        const placedTile = gameState.placedTiles.find(t => t.row === row && t.col === col);
        const isBlank = placedTile?.isBlank ||
            gameState.blankPositions?.some(b => b.row === row && b.col === col) || false;

        // Get bonus from buffed tiles (purchased from shop)
        // Check placedTiles first (this turn), then DOM element (previous turns)
        let tileBonus = 0;
        let isPinkTile = false;
        let isBuffedTile = false;
        if (placedTile?.bonus) {
            tileBonus = placedTile.bonus;
            isBuffedTile = true;
        }
        if (placedTile?.pinkTile) {
            isPinkTile = true;
        }

        // Also check DOM for tiles from previous turns
        if (!placedTile) {
            const cell = document.querySelector(`.board-cell[data-row="${row}"][data-col="${col}"]`);
            const tileEl = cell?.querySelector('.tile');
            if (tileEl?.dataset.bonus) {
                tileBonus = parseInt(tileEl.dataset.bonus) || 0;
                if (tileBonus > 0) isBuffedTile = true;
            }
            if (tileEl?.dataset.pinkTile === 'true') {
                isPinkTile = true;
            }
        }

        // Track buffed tiles for High Value rogue
        if (isBuffedTile) {
            buffedTileCount++;
        }

        // Apply pink tile multiplier (1.5× per pink tile in the word)
        if (isPinkTile) {
            pinkMultiplier *= 1.5;
        }

        // Calculate base letter score
        let letterScore = isBlank ? 0 : (TILE_SCORES[letter] || 0) + tileBonus;

        // Apply tile set upgrades
        if (!isBlank && runState.tileSetUpgrades && runState.tileSetUpgrades[letter]) {
            letterScore += runState.tileSetUpgrades[letter];
        }

        // Apply vowelBonus rogue: +1 to all vowels
        const vowels = ['A', 'E', 'I', 'O', 'U'];
        if (!isBlank && hasRogue('vowelBonus') && vowels.includes(letter)) {
            letterScore += 1;
        }

        // Check if this is a newly placed tile for multipliers
        const isNew = gameState.placedTiles.some(t => t.row === row && t.col === col);
        if (isNew) {
            const cellType = getCellType(row, col);
            if (cellType === 'double-letter') {
                letterScore *= 2;
                letterSquaresUsed++; // Track for Worder
            } else if (cellType === 'triple-letter') {
                letterScore *= 3;
                letterSquaresUsed++; // Track for Worder
            } else if (cellType === 'double-word') {
                wordMultiplier *= 2;
            } else if (cellType === 'triple-word') {
                wordMultiplier *= 3;
            }
        }

        score += letterScore;
    });

    // Apply word multiplier first (from 2W/3W squares)
    score *= wordMultiplier;

    // Apply pink tile multiplier last (1.5× per pink tile)
    score = Math.floor(score * pinkMultiplier);

    // ========== ROGUE BONUSES ==========

    // Endless Power: +2 per word × current set
    if (hasRogue('endlessPower') && runState.isRunMode) {
        score += runState.set * 2;
    }

    // Lone Ranger: +6 if word has exactly 1 vowel (including Y)
    if (hasRogue('loneRanger')) {
        const vowelsWithY = ['A', 'E', 'I', 'O', 'U', 'Y'];
        const vowelCount = wordLetters.filter(l => vowelsWithY.includes(l)).length;
        if (vowelCount === 1) {
            score += 6;
        }
    }

    // High Value: +1 per upgraded/buffed tile in word
    if (hasRogue('highValue') && buffedTileCount > 0) {
        score += buffedTileCount;
    }

    // Wolf Pack: +3 per consecutive double letter pair
    if (hasRogue('wolfPack') && wordLetters.length >= 2) {
        let doublePairs = 0;
        for (let i = 0; i < wordLetters.length - 1; i++) {
            if (wordLetters[i] === wordLetters[i + 1]) {
                doublePairs++;
                i++; // Skip next letter so "AAA" counts as 1 pair, not 2
            }
        }
        score += doublePairs * 3;
    }

    // Worder: ×1.25 per DL/TL square used
    if (hasRogue('worder') && letterSquaresUsed > 0) {
        const worderMultiplier = Math.pow(1.25, letterSquaresUsed);
        score = Math.floor(score * worderMultiplier);
    }

    // All-Round Letter: +1 for first use of each letter this cycle
    if (hasRogue('allRoundLetter') && runState.isRunMode) {
        // Initialize tracking if needed
        if (!runState.lettersPlayedThisCycle) {
            runState.lettersPlayedThisCycle = new Set();
        }

        let newLetterBonus = 0;
        wordLetters.forEach(letter => {
            if (!runState.lettersPlayedThisCycle.has(letter)) {
                newLetterBonus++;
                // Note: We don't add to the set here - that happens in submitWord
            }
        });
        score += newLetterBonus;
    }

    // ========== END ROGUE BONUSES ==========

    // Add bingo bonus if all tiles used IN THIS SPECIFIC WORD (7 or 8 with Big Pockets)
    // Bingo Wizard: Bingo triggers with 1 fewer tile (6 or 7)
    // Bingo: always 7 tiles (or 6 with Bingo Wizard) - not affected by Big Pockets
    const bingoThreshold = hasRogue('bingoWizard') ? 6 : 7;

    if (gameState.placedTiles.length >= bingoThreshold) {
        // Check if enough placed tiles are in this word
        const placedInThisWord = positions.filter(pos =>
            gameState.placedTiles.some(t => t.row === pos.row && t.col === pos.col)
        ).length;

        if (placedInThisWord >= bingoThreshold) {
            score += 50;
        }
    }

    return score;
}

/**
 * Calculate turn score breakdown for Balatro-style animation.
 * Processes ALL formed words and separates word-level vs turn-level bonuses.
 *
 * Returns: {
 *   words: [{
 *     word: "DOWNS",
 *     tiles: [{ row, col, letter, baseScore, letterMultiplier, finalScore, cellType, isNew }],
 *     wordMultiplier: 2,
 *     wordMultiplierCell: { row, col },  // Which cell triggered the DW/TW
 *     subtotal: 9,           // Sum of tiles before word mult
 *     wordTotal: 18,         // After word mult
 *     wordComponents: []     // Word-level rogues
 *   }],
 *   turnComponents: [],      // Turn-level rogues (bingo, etc.)
 *   total: number
 * }
 */
function calculateTurnScoreBreakdown(formedWords) {
    const breakdown = {
        words: [],
        turnComponents: [],
        total: 0
    };

    if (!formedWords || formedWords.length === 0) {
        return breakdown;
    }

    let turnTotal = 0;

    // Process each formed word
    formedWords.forEach(wordInfo => {
        const { word, positions } = wordInfo;

        const wordBreakdown = {
            word,
            tiles: [],
            wordMultiplier: 1,
            wordMultiplierCell: null,
            pinkMultiplier: 1,
            subtotal: 0,
            wordTotal: 0,
            wordComponents: []
        };

        let wordScore = 0;
        let wordMultiplier = 1;
        let pinkMultiplier = 1;
        let wordLetters = [];
        let buffedTileCount = 0;
        let letterSquaresUsed = 0;

        positions.forEach(({ row, col }) => {
            const letter = gameState.board[row][col];
            wordLetters.push(letter);

            const placedTile = gameState.placedTiles.find(t => t.row === row && t.col === col);
            const isBlank = placedTile?.isBlank ||
                gameState.blankPositions?.some(b => b.row === row && b.col === col) || false;

            let tileBonus = 0;
            let isPinkTile = false;
            let isBuffedTile = false;

            if (placedTile?.bonus) {
                tileBonus = placedTile.bonus;
                isBuffedTile = true;
            }
            if (placedTile?.pinkTile) {
                isPinkTile = true;
            }

            if (!placedTile) {
                const cell = document.querySelector(`.board-cell[data-row="${row}"][data-col="${col}"]`);
                const tileEl = cell?.querySelector('.tile');
                if (tileEl?.dataset.bonus) {
                    tileBonus = parseInt(tileEl.dataset.bonus) || 0;
                    if (tileBonus > 0) isBuffedTile = true;
                }
                if (tileEl?.dataset.pinkTile === 'true') {
                    isPinkTile = true;
                }
            }

            if (isBuffedTile) buffedTileCount++;
            if (isPinkTile) pinkMultiplier *= 1.5;

            // Calculate base score for this tile
            let baseLetterScore = isBlank ? 0 : (TILE_SCORES[letter] || 0) + tileBonus;

            if (!isBlank && runState.tileSetUpgrades && runState.tileSetUpgrades[letter]) {
                baseLetterScore += runState.tileSetUpgrades[letter];
            }

            // Vowel bonus
            const vowels = ['A', 'E', 'I', 'O', 'U'];
            if (!isBlank && hasRogue('vowelBonus') && vowels.includes(letter)) {
                baseLetterScore += 1;
            }

            // Track multipliers
            let letterMultiplier = 1;
            let cellType = 'normal';
            const isNew = gameState.placedTiles.some(t => t.row === row && t.col === col);

            if (isNew) {
                cellType = getCellType(row, col);
                if (cellType === 'double-letter') {
                    letterMultiplier = 2;
                    letterSquaresUsed++;
                } else if (cellType === 'triple-letter') {
                    letterMultiplier = 3;
                    letterSquaresUsed++;
                } else if (cellType === 'double-word') {
                    wordMultiplier *= 2;
                    wordBreakdown.wordMultiplierCell = { row, col };
                } else if (cellType === 'triple-word') {
                    wordMultiplier *= 3;
                    wordBreakdown.wordMultiplierCell = { row, col };
                }
            }

            const finalScore = baseLetterScore * letterMultiplier;
            wordScore += finalScore;

            wordBreakdown.tiles.push({
                row,
                col,
                letter,
                baseScore: baseLetterScore,
                letterMultiplier,
                finalScore,
                cellType,
                isNew,
                isPinkTile
            });
        });

        wordBreakdown.subtotal = wordScore;
        wordBreakdown.wordMultiplier = wordMultiplier;
        wordBreakdown.pinkMultiplier = pinkMultiplier;

        // Apply word multiplier
        wordScore *= wordMultiplier;
        wordScore = Math.floor(wordScore * pinkMultiplier);

        // ========== WORD-LEVEL ROGUE BONUSES ==========

        // Endless Power: +2 per word × current set
        if (hasRogue('endlessPower') && runState.isRunMode) {
            const bonus = runState.set * 2;
            wordScore += bonus;
            wordBreakdown.wordComponents.push({
                id: 'endlessPower',
                name: ROGUES.endlessPower.name,
                icon: ROGUES.endlessPower.icon,
                points: bonus
            });
        }

        // Lone Ranger: +6 if word has exactly 1 vowel (including Y)
        if (hasRogue('loneRanger')) {
            const vowelsWithY = ['A', 'E', 'I', 'O', 'U', 'Y'];
            const vowelCount = wordLetters.filter(l => vowelsWithY.includes(l)).length;
            if (vowelCount === 1) {
                wordScore += 6;
                wordBreakdown.wordComponents.push({
                    id: 'loneRanger',
                    name: ROGUES.loneRanger.name,
                    icon: ROGUES.loneRanger.icon,
                    points: 6
                });
            }
        }

        // High Value: +1 per upgraded/buffed tile in word
        if (hasRogue('highValue') && buffedTileCount > 0) {
            wordScore += buffedTileCount;
            wordBreakdown.wordComponents.push({
                id: 'highValue',
                name: ROGUES.highValue.name,
                icon: ROGUES.highValue.icon,
                points: buffedTileCount
            });
        }

        // Wolf Pack: +3 per consecutive double letter pair
        if (hasRogue('wolfPack') && wordLetters.length >= 2) {
            let doublePairs = 0;
            for (let i = 0; i < wordLetters.length - 1; i++) {
                if (wordLetters[i] === wordLetters[i + 1]) {
                    doublePairs++;
                    i++;
                }
            }
            if (doublePairs > 0) {
                const bonus = doublePairs * 3;
                wordScore += bonus;
                wordBreakdown.wordComponents.push({
                    id: 'wolfPack',
                    name: ROGUES.wolfPack.name,
                    icon: ROGUES.wolfPack.icon,
                    points: bonus
                });
            }
        }

        // Worder: ×1.25 per DL/TL square used
        if (hasRogue('worder') && letterSquaresUsed > 0) {
            const worderMultiplier = Math.pow(1.25, letterSquaresUsed);
            const beforeWorder = wordScore;
            wordScore = Math.floor(wordScore * worderMultiplier);
            const bonus = wordScore - beforeWorder;
            if (bonus > 0) {
                wordBreakdown.wordComponents.push({
                    id: 'worder',
                    name: ROGUES.worder.name,
                    icon: ROGUES.worder.icon,
                    points: bonus,
                    isMultiplier: true,
                    multiplierValue: worderMultiplier.toFixed(2)
                });
            }
        }

        wordBreakdown.wordTotal = wordScore;
        turnTotal += wordScore;
        breakdown.words.push(wordBreakdown);
    });

    // ========== TURN-LEVEL ROGUE BONUSES ==========

    // All-Round Letter: +1 for first use of each letter this cycle (turn-level, unique letters)
    if (hasRogue('allRoundLetter') && runState.isRunMode) {
        if (!runState.lettersPlayedThisCycle) {
            runState.lettersPlayedThisCycle = new Set();
        }
        // Collect all unique letters from all words in this turn
        const turnLetters = new Set();
        breakdown.words.forEach(w => w.tiles.forEach(t => turnLetters.add(t.letter)));

        let newLetterBonus = 0;
        turnLetters.forEach(letter => {
            if (!runState.lettersPlayedThisCycle.has(letter)) {
                newLetterBonus++;
            }
        });
        if (newLetterBonus > 0) {
            turnTotal += newLetterBonus;
            breakdown.turnComponents.push({
                id: 'allRoundLetter',
                name: ROGUES.allRoundLetter.name,
                icon: ROGUES.allRoundLetter.icon,
                points: newLetterBonus
            });
        }
    }

    // Bingo bonus (turn-level - uses all 7 tiles)
    const bingoThreshold = hasRogue('bingoWizard') ? 6 : 7;
    if (gameState.placedTiles.length >= bingoThreshold) {
        turnTotal += 50;
        breakdown.turnComponents.push({
            id: hasRogue('bingoWizard') ? 'bingoWizard' : 'bingo',
            name: hasRogue('bingoWizard') ? ROGUES.bingoWizard.name : 'Bingo!',
            icon: hasRogue('bingoWizard') ? ROGUES.bingoWizard.icon : '🎯',
            points: 50
        });
    }

    // ========== TURN-LEVEL MULTIPLIER ROGUES ==========

    // The Closer: ×2 on last turn of each round
    if (hasRogue('closer') && gameState.currentTurn === gameState.maxTurns) {
        const beforeCloser = turnTotal;
        turnTotal = Math.floor(turnTotal * 2);
        const bonus = turnTotal - beforeCloser;
        breakdown.turnComponents.push({
            id: 'closer',
            name: ROGUES.closer.name,
            icon: ROGUES.closer.icon,
            points: bonus,
            isMultiplier: true,
            multiplierValue: '2.00'
        });
    }

    // The Collector: ×1.1 per rogue owned
    if (hasRogue('collector') && runState.rogues && runState.rogues.length > 0) {
        const rogueCount = runState.rogues.length;
        const collectorMultiplier = Math.pow(1.1, rogueCount);
        const beforeCollector = turnTotal;
        turnTotal = Math.floor(turnTotal * collectorMultiplier);
        const bonus = turnTotal - beforeCollector;
        if (bonus > 0) {
            breakdown.turnComponents.push({
                id: 'collector',
                name: ROGUES.collector.name,
                icon: ROGUES.collector.icon,
                points: bonus,
                isMultiplier: true,
                multiplierValue: collectorMultiplier.toFixed(2)
            });
        }
    }

    breakdown.total = turnTotal;
    return breakdown;
}

/**
 * Calculate word score with detailed breakdown for Balatro-style animation
 * Returns: {
 *   tiles: [{ row, col, letter, baseScore, letterMultiplier, finalScore, cellType, isNew }],
 *   wordMultiplier: 2,           // Product of DW/TW
 *   pinkMultiplier: 1,           // Product of pink tile multipliers
 *   subtotal: 28,                // Sum of tile scores before word mult
 *   baseScore: 56,               // After word mult and pink mult
 *   components: [{id, name, icon, points}],  // Rogue bonuses
 *   total: 67
 * }
 */
function calculateWordScoreBreakdown(positions) {
    const breakdown = {
        tiles: [],       // Per-tile scoring details for animation
        wordMultiplier: 1,
        pinkMultiplier: 1,
        subtotal: 0,     // Sum before word multiplier
        baseScore: 0,
        components: [],  // Each rogue/bonus contribution
        total: 0
    };

    let score = 0;
    let wordMultiplier = 1;
    let pinkMultiplier = 1;

    // Track data for rogue effects
    let wordLetters = [];
    let buffedTileCount = 0;
    let letterSquaresUsed = 0;

    positions.forEach(({ row, col }) => {
        const letter = gameState.board[row][col];
        wordLetters.push(letter);

        const placedTile = gameState.placedTiles.find(t => t.row === row && t.col === col);
        const isBlank = placedTile?.isBlank ||
            gameState.blankPositions?.some(b => b.row === row && b.col === col) || false;

        let tileBonus = 0;
        let isPinkTile = false;
        let isBuffedTile = false;
        if (placedTile?.bonus) {
            tileBonus = placedTile.bonus;
            isBuffedTile = true;
        }
        if (placedTile?.pinkTile) {
            isPinkTile = true;
        }

        if (!placedTile) {
            const cell = document.querySelector(`.board-cell[data-row="${row}"][data-col="${col}"]`);
            const tileEl = cell?.querySelector('.tile');
            if (tileEl?.dataset.bonus) {
                tileBonus = parseInt(tileEl.dataset.bonus) || 0;
                if (tileBonus > 0) isBuffedTile = true;
            }
            if (tileEl?.dataset.pinkTile === 'true') {
                isPinkTile = true;
            }
        }

        if (isBuffedTile) buffedTileCount++;
        if (isPinkTile) pinkMultiplier *= 1.5;

        // Calculate base score for this tile (before letter multiplier)
        let baseLetterScore = isBlank ? 0 : (TILE_SCORES[letter] || 0) + tileBonus;

        if (!isBlank && runState.tileSetUpgrades && runState.tileSetUpgrades[letter]) {
            baseLetterScore += runState.tileSetUpgrades[letter];
        }

        // Vowel bonus is applied to base score
        const vowels = ['A', 'E', 'I', 'O', 'U'];
        if (!isBlank && hasRogue('vowelBonus') && vowels.includes(letter)) {
            baseLetterScore += 1;
        }

        // Track letter multiplier and cell type for this tile
        let letterMultiplier = 1;
        let cellType = 'normal';
        const isNew = gameState.placedTiles.some(t => t.row === row && t.col === col);

        if (isNew) {
            cellType = getCellType(row, col);
            if (cellType === 'double-letter') {
                letterMultiplier = 2;
                letterSquaresUsed++;
            } else if (cellType === 'triple-letter') {
                letterMultiplier = 3;
                letterSquaresUsed++;
            } else if (cellType === 'double-word') {
                wordMultiplier *= 2;
            } else if (cellType === 'triple-word') {
                wordMultiplier *= 3;
            }
        }

        const finalScore = baseLetterScore * letterMultiplier;
        score += finalScore;

        // Add tile details for animation
        breakdown.tiles.push({
            row,
            col,
            letter,
            baseScore: baseLetterScore,
            letterMultiplier,
            finalScore,
            cellType,
            isNew
        });
    });

    breakdown.subtotal = score;
    breakdown.wordMultiplier = wordMultiplier;
    breakdown.pinkMultiplier = pinkMultiplier;

    score *= wordMultiplier;
    score = Math.floor(score * pinkMultiplier);
    breakdown.baseScore = score;

    // ========== ROGUE BONUSES (tracked separately) ==========

    // Endless Power: +2 per word × current set
    if (hasRogue('endlessPower') && runState.isRunMode) {
        const bonus = runState.set * 2;
        score += bonus;
        breakdown.components.push({
            id: 'endlessPower',
            name: ROGUES.endlessPower.name,
            icon: ROGUES.endlessPower.icon,
            points: bonus
        });
    }

    // Lone Ranger: +6 if word has exactly 1 vowel (including Y)
    if (hasRogue('loneRanger')) {
        const vowelsWithY = ['A', 'E', 'I', 'O', 'U', 'Y'];
        const vowelCount = wordLetters.filter(l => vowelsWithY.includes(l)).length;
        if (vowelCount === 1) {
            score += 6;
            breakdown.components.push({
                id: 'loneRanger',
                name: ROGUES.loneRanger.name,
                icon: ROGUES.loneRanger.icon,
                points: 6
            });
        }
    }

    // High Value: +1 per upgraded/buffed tile in word
    if (hasRogue('highValue') && buffedTileCount > 0) {
        score += buffedTileCount;
        breakdown.components.push({
            id: 'highValue',
            name: ROGUES.highValue.name,
            icon: ROGUES.highValue.icon,
            points: buffedTileCount
        });
    }

    // Wolf Pack: +3 per consecutive double letter pair
    if (hasRogue('wolfPack') && wordLetters.length >= 2) {
        let doublePairs = 0;
        for (let i = 0; i < wordLetters.length - 1; i++) {
            if (wordLetters[i] === wordLetters[i + 1]) {
                doublePairs++;
                i++;
            }
        }
        if (doublePairs > 0) {
            const bonus = doublePairs * 3;
            score += bonus;
            breakdown.components.push({
                id: 'wolfPack',
                name: ROGUES.wolfPack.name,
                icon: ROGUES.wolfPack.icon,
                points: bonus
            });
        }
    }

    // Worder: ×1.25 per DL/TL square used
    if (hasRogue('worder') && letterSquaresUsed > 0) {
        const worderMultiplier = Math.pow(1.25, letterSquaresUsed);
        const beforeWorder = score;
        score = Math.floor(score * worderMultiplier);
        const bonus = score - beforeWorder;
        if (bonus > 0) {
            breakdown.components.push({
                id: 'worder',
                name: ROGUES.worder.name,
                icon: ROGUES.worder.icon,
                points: bonus,
                isMultiplier: true,
                multiplierValue: worderMultiplier.toFixed(2)
            });
        }
    }

    // All-Round Letter: +1 for first use of each letter this cycle
    if (hasRogue('allRoundLetter') && runState.isRunMode) {
        if (!runState.lettersPlayedThisCycle) {
            runState.lettersPlayedThisCycle = new Set();
        }
        let newLetterBonus = 0;
        wordLetters.forEach(letter => {
            if (!runState.lettersPlayedThisCycle.has(letter)) {
                newLetterBonus++;
            }
        });
        if (newLetterBonus > 0) {
            score += newLetterBonus;
            breakdown.components.push({
                id: 'allRoundLetter',
                name: ROGUES.allRoundLetter.name,
                icon: ROGUES.allRoundLetter.icon,
                points: newLetterBonus
            });
        }
    }

    // Bingo bonus
    const bingoThreshold = hasRogue('bingoWizard') ? 6 : 7;
    if (gameState.placedTiles.length >= bingoThreshold) {
        const placedInThisWord = positions.filter(pos =>
            gameState.placedTiles.some(t => t.row === pos.row && t.col === pos.col)
        ).length;

        if (placedInThisWord >= bingoThreshold) {
            score += 50;
            breakdown.components.push({
                id: hasRogue('bingoWizard') ? 'bingoWizard' : 'bingo',
                name: hasRogue('bingoWizard') ? ROGUES.bingoWizard.name : 'Bingo!',
                icon: hasRogue('bingoWizard') ? ROGUES.bingoWizard.icon : '🎯',
                points: 50
            });
        }
    }

    breakdown.total = score;
    return breakdown;
}

/**
 * Show animated score breakdown overlay
 * Always shows - fast (~500ms) for base only, longer with rogue bonuses
 */
function showScoreAnimation(breakdown, callback) {
    // Skip animation if no breakdown (non-run mode)
    if (!breakdown) {
        if (callback) callback();
        return;
    }

    // Create or get overlay
    let overlay = document.getElementById('score-animation-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'score-animation-overlay';
        overlay.className = 'score-animation-overlay';
        document.body.appendChild(overlay);
    }

    const hasComponents = breakdown.components.length > 0;

    // Build content
    let html = '<div class="score-animation-content">';

    if (hasComponents) {
        // Full breakdown with base + components + total
        html += `<div class="score-line score-base"><span class="score-label">Base</span><span class="score-value">${breakdown.baseScore}</span></div>`;

        breakdown.components.forEach((comp, i) => {
            const sign = comp.points >= 0 ? '+' : '';
            const multiplierNote = comp.isMultiplier ? ` (×${comp.multiplierValue})` : '';
            html += `<div class="score-line score-component" data-index="${i}" style="opacity: 0;">`;
            html += `<span class="score-label">${comp.icon} ${comp.name}${multiplierNote}</span>`;
            html += `<span class="score-value">${sign}${comp.points}</span>`;
            html += '</div>';
        });

        html += `<div class="score-line score-total" style="opacity: 0;"><span class="score-label">Total</span><span class="score-value">${breakdown.total}</span></div>`;
    } else {
        // Simple score flash - just show the total briefly
        html += `<div class="score-line score-total-only"><span class="score-value score-flash">${breakdown.total}</span></div>`;
    }

    html += '</div>';

    overlay.innerHTML = html;
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');

    if (hasComponents) {
        // Full animation with components
        const components = overlay.querySelectorAll('.score-component');
        const totalLine = overlay.querySelector('.score-total');

        // Speed up animation if many components (like Balatro)
        const baseDelay = breakdown.components.length > 3 ? 150 : 250;
        const componentDelay = breakdown.components.length > 5 ? 100 : baseDelay;

        let delay = 200; // Initial delay for base to be visible

        components.forEach((comp, i) => {
            setTimeout(() => {
                comp.style.opacity = '1';
                comp.classList.add('score-pop');
                // Also trigger rogue slot animation
                const rogueId = breakdown.components[i].id;
                const slot = document.querySelector(`.rogue-slot[data-rogue-id="${rogueId}"]`);
                if (slot) {
                    slot.classList.remove('triggered');
                    void slot.offsetWidth;
                    slot.classList.add('triggered');
                }
            }, delay);
            delay += componentDelay;
        });

        // Show total after all components
        setTimeout(() => {
            totalLine.style.opacity = '1';
            totalLine.classList.add('score-pop');
        }, delay);

        // Hide overlay and call callback
        setTimeout(() => {
            overlay.classList.remove('visible');
            overlay.classList.add('hidden');
            if (callback) callback();
        }, delay + 600);
    } else {
        // Quick flash animation - ~500ms total
        setTimeout(() => {
            overlay.classList.remove('visible');
            overlay.classList.add('hidden');
            if (callback) callback();
        }, 500);
    }
}

// ============ BALATRO-STYLE SCORING ANIMATION ============

/**
 * Clean up all Balatro animation elements from the DOM
 */
function cleanupBalatroAnimationElements() {
    document.querySelectorAll('.floating-score, .multiplier-flash, .word-multiplier-announce, .pink-multiplier-announce, .scoring-total-display, .rogue-bonus-float').forEach(el => el.remove());
    document.querySelectorAll('.tile.scoring, .tile.pink-scoring').forEach(tile => {
        tile.classList.remove('scoring', 'pink-scoring');
    });
}

/**
 * Create a floating score number at a tile's position
 * @param {HTMLElement} cell - The board cell element
 * @param {number} score - The score to display
 * @param {string} cellType - The cell type (for color coding)
 * @returns {HTMLElement} The floating score element
 */
function createFloatingScore(cell, score, cellType) {
    const rect = cell.getBoundingClientRect();
    const float = document.createElement('div');
    float.className = 'floating-score';
    if (cellType === 'double-letter' || cellType === 'triple-letter') {
        float.classList.add('letter-multiplied');
    }
    float.textContent = `+${score}`;
    float.style.left = `${rect.left + rect.width / 2}px`;
    float.style.top = `${rect.top}px`;
    document.body.appendChild(float);
    return float;
}

/**
 * Create a multiplier flash indicator near a tile
 * @param {HTMLElement} cell - The board cell element
 * @param {number} mult - The multiplier value (2 or 3)
 * @param {string} type - 'letter' or 'word'
 * @returns {HTMLElement} The multiplier flash element
 */
function createMultiplierFlash(cell, mult, type) {
    const rect = cell.getBoundingClientRect();
    const flash = document.createElement('div');
    flash.className = `multiplier-flash ${type}-mult`;
    flash.textContent = `×${mult}`;
    flash.style.left = `${rect.right - 5}px`;
    flash.style.top = `${rect.top - 5}px`;
    document.body.appendChild(flash);
    return flash;
}

/**
 * Show a centered word multiplier announcement
 * @param {number} mult - The word multiplier (2, 3, 4, 6, etc.)
 * @param {Array} tilePositions - Array of {row, col} for positioned display
 * @returns {HTMLElement} The announcement element
 */
function showWordMultiplierAnnouncement(mult, tilePositions) {
    const announce = document.createElement('div');
    announce.className = 'word-multiplier-announce';

    // Determine text based on multiplier
    let text = `×${mult} WORD!`;
    if (mult >= 6) {
        text = `×${mult} MASSIVE!`;
    } else if (mult >= 4) {
        text = `×${mult} DOUBLE WORD!`;
    }

    announce.textContent = text;

    // Position in center of the board area
    const board = document.getElementById('game-board');
    if (board) {
        const rect = board.getBoundingClientRect();
        announce.style.left = `${rect.left + rect.width / 2}px`;
        announce.style.top = `${rect.top + rect.height / 2}px`;
    }

    document.body.appendChild(announce);
    return announce;
}

/**
 * Show a pink multiplier announcement
 * @param {number} mult - The pink multiplier (1.5, 2.25, etc.)
 * @returns {HTMLElement} The announcement element
 */
function showPinkMultiplierAnnouncement(mult) {
    const announce = document.createElement('div');
    announce.className = 'pink-multiplier-announce';
    announce.textContent = `×${mult} PINK!`;

    // Position in center of the board area
    const board = document.getElementById('game-board');
    if (board) {
        const rect = board.getBoundingClientRect();
        announce.style.left = `${rect.left + rect.width / 2}px`;
        announce.style.top = `${rect.top + rect.height / 2}px`;
    }

    document.body.appendChild(announce);
    return announce;
}

/**
 * Create or update the running total display below the board
 * @param {number} total - Current running total
 * @param {boolean} isFinal - Whether this is the final total (triggers pop effect)
 * @returns {HTMLElement} The total display element
 */
function updateRunningTotalDisplay(total, isFinal = false) {
    let display = document.querySelector('.scoring-total-display');
    if (!display) {
        display = document.createElement('div');
        display.className = 'scoring-total-display';
        document.body.appendChild(display);
    }

    // Position centered horizontally with the board, vertically below the rack
    const board = document.getElementById('game-board');
    const rack = document.getElementById('tile-rack-container');
    if (board && rack) {
        const boardRect = board.getBoundingClientRect();
        const rackRect = rack.getBoundingClientRect();
        display.style.left = `${boardRect.left + boardRect.width / 2}px`;
        display.style.top = `${rackRect.bottom + 10}px`;
    } else if (board) {
        const rect = board.getBoundingClientRect();
        display.style.left = `${rect.left + rect.width / 2}px`;
        display.style.top = `${rect.bottom + 100}px`;
    }

    display.textContent = total;
    display.classList.remove('pop');
    if (isFinal) {
        // Trigger reflow then add pop class
        void display.offsetWidth;
        display.classList.add('pop', 'final');
    }

    return display;
}

/**
 * Show a floating bonus from a rogue trigger
 * @param {Object} component - The rogue component {id, name, icon, points}
 * @param {number} newTotal - The new running total after this bonus
 * @returns {HTMLElement} The floating bonus element
 */
function showRogueBonusFloat(component, newTotal) {
    const rogueSlot = document.querySelector(`.rogue-slot[data-rogue-id="${component.id}"]`);
    const float = document.createElement('div');
    float.className = 'rogue-bonus-float';

    const sign = component.points >= 0 ? '+' : '';
    float.innerHTML = `<span class="rogue-icon">${component.icon}</span><span class="bonus-value">${sign}${component.points}</span>`;

    if (rogueSlot) {
        const rect = rogueSlot.getBoundingClientRect();
        float.style.left = `${rect.left + rect.width / 2}px`;
        float.style.top = `${rect.top}px`;
    } else {
        // Fallback: position near the rogue inventory area
        const inventory = document.querySelector('.rogue-inventory');
        if (inventory) {
            const rect = inventory.getBoundingClientRect();
            float.style.left = `${rect.left + rect.width / 2}px`;
            float.style.top = `${rect.top}px`;
        }
    }

    document.body.appendChild(float);
    return float;
}

/**
 * Balatro-style tile-by-tile scoring animation for ALL formed words
 * @param {Object} breakdown - Turn breakdown from calculateTurnScoreBreakdown()
 * @param {Function} callback - Function to call when animation completes
 */
function showScoreAnimationBalatro(breakdown, callback) {
    // Skip animation if no breakdown (non-run mode)
    if (!breakdown || !breakdown.words || breakdown.words.length === 0) {
        if (callback) callback();
        return;
    }

    // Skip animation if URL has ?animate=0 (for testing)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('animate') === '0') {
        if (callback) callback();
        return;
    }

    // Check animation speed setting
    const speedMult = getAnimationSpeedMultiplier();

    // Skip animation entirely if speed is 'skip'
    if (speedMult === 0) {
        if (callback) callback();
        return;
    }

    // Clean up any previous animation elements
    cleanupBalatroAnimationElements();

    const { words, turnComponents, total } = breakdown;

    // Debug logging
    console.log('[Balatro Animation] Starting turn animation:', {
        speed: animationSpeed,
        words: words.map(w => ({
            word: w.word,
            tiles: w.tiles.length,
            wordMultiplier: w.wordMultiplier,
            wordTotal: w.wordTotal
        })),
        turnComponents: turnComponents.length,
        total
    });

    // Timing constants (adjusted by speed multiplier)
    // Base values tuned so 1x is a comfortable pace
    const TILE_STAGGER = Math.round(200 * speedMult);
    const TILE_ANIM_DURATION = Math.round(600 * speedMult);
    const WORD_MULT_DELAY = Math.round(1600 * speedMult);
    const WORD_GAP = Math.round(800 * speedMult);
    const COMPONENT_STAGGER = Math.round(600 * speedMult);
    const FINAL_POP_DURATION = Math.round(800 * speedMult);

    let currentDelay = 0;
    let runningTotal = 0;

    // Create running total display immediately
    updateRunningTotalDisplay(0);

    // ========== ANIMATE EACH WORD ==========
    words.forEach((wordData, wordIndex) => {
        const { word, tiles, wordMultiplier, wordMultiplierCell, pinkMultiplier, subtotal, wordTotal, wordComponents } = wordData;

        console.log(`[Balatro Animation] Word ${wordIndex + 1}: ${word} (×${wordMultiplier})`);

        // Track this word's running subtotal (before word multiplier)
        let wordSubtotal = 0;

        // Track pink tiles in this word for later animation
        const pinkTilesInWord = [];

        // ----- Tile-by-tile animation for this word -----
        tiles.forEach((tileData, tileIndex) => {
            const { row, col, baseScore, letterMultiplier, cellType, isPinkTile } = tileData;

            if (isPinkTile) {
                pinkTilesInWord.push({ row, col });
            }

            // Step 1: Show base tile score
            setTimeout(() => {
                const cell = document.querySelector(`.board-cell[data-row="${row}"][data-col="${col}"]`);
                const tile = cell?.querySelector('.tile');

                if (tile) {
                    // Add scoring class for shake/glow
                    tile.classList.add('scoring');
                    setTimeout(() => tile.classList.remove('scoring'), TILE_ANIM_DURATION + 100);
                }

                if (cell && baseScore > 0) {
                    // Show base score floating up
                    createFloatingScore(cell, baseScore, 'normal');
                }

                // Update running total with base score
                runningTotal += baseScore;
                wordSubtotal += baseScore;
                updateRunningTotalDisplay(runningTotal);
            }, currentDelay);

            currentDelay += TILE_STAGGER;

            // Step 2: If letter multiplier, show the bonus separately
            if (letterMultiplier > 1) {
                const multiplierBonus = baseScore * (letterMultiplier - 1);

                setTimeout(() => {
                    const cell = document.querySelector(`.board-cell[data-row="${row}"][data-col="${col}"]`);

                    if (cell && multiplierBonus > 0) {
                        // Show multiplier flash and bonus
                        createMultiplierFlash(cell, letterMultiplier, 'letter');
                        createFloatingScore(cell, multiplierBonus, cellType);
                    }

                    // Update running total with multiplier bonus
                    runningTotal += multiplierBonus;
                    wordSubtotal += multiplierBonus;
                    updateRunningTotalDisplay(runningTotal);
                }, currentDelay);

                currentDelay += TILE_STAGGER;
            }
        });

        // Small pause after all tiles in word
        currentDelay += TILE_ANIM_DURATION;

        // ----- Word multiplier announcement -----
        if (wordMultiplier > 1) {
            const capturedWordSubtotal = subtotal; // Capture for closure

            setTimeout(() => {
                // Show announcement centered on the word
                showWordMultiplierAnnouncement(wordMultiplier, tiles);

                // Flash the DW/TW cell if we know which one triggered it
                if (wordMultiplierCell) {
                    const multCell = document.querySelector(
                        `.board-cell[data-row="${wordMultiplierCell.row}"][data-col="${wordMultiplierCell.col}"]`
                    );
                    if (multCell) {
                        createMultiplierFlash(multCell, wordMultiplier, 'word');
                    }
                }

                // Animate the running total: subtract the word subtotal, then add back multiplied
                // Running total currently has the unmultiplied word tiles added
                // We need to show: runningTotal - subtotal + (subtotal * wordMultiplier)
                const bonusFromMult = capturedWordSubtotal * (wordMultiplier - 1);
                const startVal = runningTotal;
                const endVal = runningTotal + bonusFromMult;

                const steps = 8;
                const stepDuration = WORD_MULT_DELAY / steps;

                for (let i = 1; i <= steps; i++) {
                    setTimeout(() => {
                        const progress = i / steps;
                        const eased = 1 - Math.pow(1 - progress, 3);
                        updateRunningTotalDisplay(Math.floor(startVal + bonusFromMult * eased));
                    }, stepDuration * i);
                }

                runningTotal = endVal;
            }, currentDelay);

            currentDelay += WORD_MULT_DELAY + 100;
        }

        // ----- Pink multiplier for this word (if any) -----
        if (pinkMultiplier > 1) {
            const capturedPinkTiles = [...pinkTilesInWord];
            const capturedPinkMult = pinkMultiplier;

            setTimeout(() => {
                // Flash each pink tile
                capturedPinkTiles.forEach(({ row, col }) => {
                    const cell = document.querySelector(`.board-cell[data-row="${row}"][data-col="${col}"]`);
                    const tile = cell?.querySelector('.tile');
                    if (tile) {
                        tile.classList.add('pink-scoring');
                        setTimeout(() => tile.classList.remove('pink-scoring'), 300);
                    }
                    if (cell) {
                        createMultiplierFlash(cell, capturedPinkMult, 'pink');
                    }
                });

                // Show pink multiplier announcement
                showPinkMultiplierAnnouncement(capturedPinkMult);

                // Animate the bonus being added
                const wordTotalBeforePink = runningTotal;
                const bonusFromPink = Math.floor(wordTotalBeforePink * (capturedPinkMult - 1));
                const steps = 6;
                const stepDuration = 250 / steps;

                for (let i = 1; i <= steps; i++) {
                    setTimeout(() => {
                        const progress = i / steps;
                        const eased = 1 - Math.pow(1 - progress, 3);
                        updateRunningTotalDisplay(Math.floor(wordTotalBeforePink + bonusFromPink * eased));
                    }, stepDuration * i);
                }

                runningTotal += bonusFromPink;
            }, currentDelay);
            currentDelay += 350;
        }

        // ----- Word-level rogue bonuses -----
        wordComponents.forEach((component) => {
            setTimeout(() => {
                // Trigger rogue slot animation
                const slot = document.querySelector(`.rogue-slot[data-rogue-id="${component.id}"]`);
                if (slot) {
                    slot.classList.remove('triggered');
                    void slot.offsetWidth;
                    slot.classList.add('triggered');
                }

                // Show floating bonus
                showRogueBonusFloat(component, runningTotal + component.points);
                runningTotal += component.points;
                updateRunningTotalDisplay(runningTotal);
            }, currentDelay);

            currentDelay += COMPONENT_STAGGER;
        });

        // Gap between words
        if (wordIndex < words.length - 1) {
            currentDelay += WORD_GAP;
        }
    });

    // ========== TURN-LEVEL ROGUE BONUSES ==========
    if (turnComponents.length > 0) {
        currentDelay += 100; // Small gap before turn bonuses

        turnComponents.forEach((component) => {
            setTimeout(() => {
                const slot = document.querySelector(`.rogue-slot[data-rogue-id="${component.id}"]`);
                if (slot) {
                    slot.classList.remove('triggered');
                    void slot.offsetWidth;
                    slot.classList.add('triggered');
                }

                showRogueBonusFloat(component, runningTotal + component.points);
                runningTotal += component.points;
                updateRunningTotalDisplay(runningTotal);
            }, currentDelay);

            currentDelay += COMPONENT_STAGGER;
        });
    }

    // ========== FINAL TOTAL POP ==========
    setTimeout(() => {
        updateRunningTotalDisplay(total, true);
    }, currentDelay);

    currentDelay += FINAL_POP_DURATION;

    // ========== Cleanup and callback ==========
    setTimeout(() => {
        cleanupBalatroAnimationElements();
        if (callback) callback();
    }, currentDelay + 400);
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

    // For multiple tiles, check that they're in a valid line
    if (gameState.placedTiles.length > 1) {
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
    } // End of multi-tile line/gap checks

    // Check if tiles connect to existing board (required in RogueLetters since there's always a starting word)
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

    return { valid: true, message: '', invalidTiles: [] };
}

// Counter to handle async race conditions in sidebar updates
let sidebarRequestId = 0;

function updatePotentialWordsSidebar() {
    // Increment request ID to invalidate any pending async responses
    const thisRequestId = ++sidebarRequestId;

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

    // Single unified version for both desktop and mobile
    if (potentialWordsDiv) {
        if (words.length === 0) {
            potentialWordsDiv.innerHTML = '';
        } else {
            // Check validity of all words with retry and exponential backoff
            const wordStrings = words.map(w => w.word);
            if (wordStrings.length > 0) {
                const maxRetries = 3;
                const retryDelays = [200, 500, 1250]; // Exponential backoff

                const attemptValidation = (attempt = 0) => {
                    // Add 5 second timeout to prevent hanging requests
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 5000);

                    fetch(`${API_BASE}/check_word.py?words=${encodeURIComponent(JSON.stringify(wordStrings))}`, {
                        signal: controller.signal
                    })
                        .then(response => {
                            clearTimeout(timeout);
                            if (!response.ok) {
                                throw new Error(`check_word_http_${response.status}`);
                            }
                            return response.json();
                        })
                        .then(data => {
                            // Ignore stale response if a newer request was made
                            if (thisRequestId !== sidebarRequestId) return;

                            let html = '';
                            let totalScore = 0;
                            let hasInvalidWords = false;

                            // Check if bingo applies to any word
                            const rackSize = getRackSize();
                            // Bingo Wizard: always 6 tiles for bingo (not relative to rack size)
                            const bingoThreshold = hasRogue('bingoWizard') ? 6 : rackSize;

                            // Sort words by score (smallest to largest)
                            words.sort((a, b) => a.score - b.score);

                            words.forEach(word => {
                                totalScore += word.score;
                                const isValid = data.results ? data.results[word.word] : true;
                                if (!isValid) hasInvalidWords = true;

                                // Check if this word qualifies for bingo
                                let bingoTag = '';
                                if (gameState.placedTiles.length >= bingoThreshold) {
                                    const placedInThisWord = word.positions.filter(pos =>
                                        gameState.placedTiles.some(t => t.row === pos.row && t.col === pos.col)
                                    ).length;
                                    if (placedInThisWord >= bingoThreshold) {
                                        bingoTag = '<span class="bingo-tag">BINGO +50</span>';
                                    }
                                }

                                html += `<span class="word-item ${isValid ? '' : 'invalid-word'}">
                                    <span class="word-text">${word.word}${bingoTag}</span>
                                    <span class="word-score">${word.score}</span>
                                </span>`;
                            });

                            let disabledClass = '';
                            let disabledReason = '';
                            let onclickHandler = 'submitWord()';
                            let disabledAttr = '';

                            if (!placementValidation.valid) {
                                disabledClass = ' disabled';
                                disabledReason = placementValidation.message;
                                onclickHandler = 'animateInvalidPlacementTiles()';
                            } else if (hasInvalidWords) {
                                disabledClass = ' disabled';
                                disabledReason = 'Invalid words present';
                                onclickHandler = '';
                                disabledAttr = 'disabled';
                            } else {
                                disabledClass = ' pulse-once';
                            }

                            html += `<button class="total-score submit-score${disabledClass}"
                                     onclick="${onclickHandler}"
                                     title="${disabledReason || 'Submit Word'}"
                                     ${disabledAttr}>
                                     ${totalScore} pts ${disabledReason ? '✗' : '→'}
                                    </button>`;
                            potentialWordsDiv.innerHTML = html;
                        })
                        .catch(error => {
                            clearTimeout(timeout);

                            // Ignore stale response if a newer request was made
                            if (thisRequestId !== sidebarRequestId) return;

                            // Retry if attempts remaining
                            if (attempt < maxRetries) {
                                const delay = retryDelays[attempt] || retryDelays[retryDelays.length - 1];
                                setTimeout(() => attemptValidation(attempt + 1), delay);
                                return;
                            }

                            // Final failure - show disabled state
                            console.error('Error checking word validity after retries:', error);
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
                            // Sort words by score (smallest to largest)
                            words.sort((a, b) => a.score - b.score);
                            words.forEach(word => {
                                totalScore += word.score;
                                html += `<span class="word-item unvalidated">
                                    <span class="word-text">${word.word}</span>
                                    <span class="word-score">${word.score}</span>
                                </span>`;
                            });

                            const isInvalidPlacement = !placementValidation.valid;
                            const titleText = isInvalidPlacement ? placementValidation.message : 'Checking words...';
                            html += `<button class="total-score submit-score disabled"
                                     title="${titleText}"
                                     disabled>${totalScore} pts ⏳</button>`;
                            potentialWordsDiv.innerHTML = html;
                        });
                };

                attemptValidation();
            }
        }
    }

    return;

    // This section is now handled above in the refactored function
}

function checkWordValidity() {
    // Show/hide buttons based on tile placement
    const hasTiles = gameState.placedTiles.length > 0;

    // Show/hide potential words container
    const potentialWords = document.getElementById('potential-words');
    if (potentialWords) {
        if (hasTiles) {
            potentialWords.classList.add('has-tiles');
        } else {
            potentialWords.classList.remove('has-tiles');
        }
    }

    // Show recall button when tiles are placed, exchange button when no tiles and has coins
    const recallButton = document.getElementById('recall-tiles');
    const exchangeButton = document.getElementById('exchange-tiles');

    if (hasTiles) {
        // Tiles on board - show recall, hide exchange
        if (recallButton) {
            recallButton.style.display = 'flex';
            recallButton.style.opacity = '0';
            setTimeout(() => { recallButton.style.opacity = '1'; }, 10);
        }
        if (exchangeButton) {
            exchangeButton.style.display = 'none';
        }
    } else {
        // No tiles on board - hide recall, maybe show exchange
        if (recallButton) {
            recallButton.style.opacity = '0';
            setTimeout(() => { recallButton.style.display = 'none'; }, 300);
        }
        // Update exchange button visibility (handles coin check)
        updateExchangeButtonVisibility();
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

    // Update gameState to match new shuffled order (preserving buffed/coin info)
    const newRackOrder = tiles.map(tile => ({
        letter: tile.dataset.letter,
        buffed: tile.dataset.buffed === 'true',
        bonus: parseInt(tile.dataset.bonus) || 0,
        coinTile: tile.dataset.coinTile === 'true'
    }));
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

async function recallTiles() {
    // Don't allow recalling tiles after game ends
    if (gameState.isGameOver) return;

    // Nothing to recall
    if (gameState.placedTiles.length === 0) return;

    // Track tiles recalled
    Analytics.ui.tilesRecalled(gameState.currentTurn, gameState.placedTiles.length);

    // Find empty rack cells for targets
    const rackBoard = document.getElementById('tile-rack-board');
    const emptyCells = Array.from(rackBoard.querySelectorAll('.rack-cell'))
        .filter(cell => !cell.querySelector('.tile'));

    // Gather all tiles to animate
    const tilesToAnimate = [];
    gameState.placedTiles.forEach(({ row, col, letter, isBlank, buffed, bonus, coinTile }, index) => {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const tile = cell?.querySelector('.tile');
        if (tile && emptyCells[index]) {
            tilesToAnimate.push({
                tile,
                cell,
                targetCell: emptyCells[index],
                row, col, letter, isBlank, buffed, bonus, coinTile
            });
        }
    });

    // Animate all tiles flying back to rack simultaneously
    if (tilesToAnimate.length > 0) {
        const tiles = tilesToAnimate.map(t => t.tile);
        const getTargetRect = (tile, index) => {
            return tilesToAnimate[index].targetCell.getBoundingClientRect();
        };

        await animateTileMovement(tiles, getTargetRect, {
            duration: 200,
            stagger: 29,  // 200ms / 7 for card-dealing effect
            cleanup: false
        });
    }

    // Now do the actual DOM manipulation
    tilesToAnimate.forEach(({ tile, cell, targetCell, row, col, letter, isBlank, buffed, bonus, coinTile }) => {
        // Clear from board
        gameState.board[row][col] = null;
        cell.innerHTML = '';
        cell.classList.remove('occupied', 'placed-this-turn');

        // Restore multiplier text if this is a special square
        restoreMultiplierText(cell, row, col);

        // For blank tiles, restore as '_' (unassigned blank)
        const rackLetter = isBlank ? '_' : letter;

        // Add back to rackTiles array (preserving buffed/coin info)
        gameState.rackTiles.push({
            letter: rackLetter,
            buffed: buffed || false,
            bonus: bonus || 0,
            coinTile: coinTile || false
        });

        // Create new tile for rack using centralized function
        const newTile = createTileElement(rackLetter, gameState.rackTiles.length - 1, isBlank, buffed || false, bonus || 0, coinTile || false);

        // Place in rack
        targetCell.appendChild(newTile);
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
        letter: p.letter,
        isBlank: p.isBlank || false
    }));

    fetch(`${API_BASE}/validate_word.py`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            seed: gameState.seed,
            board: gameState.board,
            placed_tiles: placedWord,
            blank_positions: gameState.blankPositions || [],  // Blanks from previous turns
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

            // Calculate score breakdown for animation AND to get rogue multipliers
            // This must happen before we finalize the score, as turn-level rogues
            // (like The Closer) multiply the entire turn score
            const formedWords = findFormedWords();
            let turnBreakdown = null;
            if (runState.isRunMode && formedWords.length > 0) {
                // Calculate breakdown for ALL formed words (for Balatro-style animation)
                turnBreakdown = calculateTurnScoreBreakdown(formedWords);

                // Use the breakdown total as the actual score - it includes turn-level
                // multipliers like The Closer that the backend doesn't know about
                turnScore = turnBreakdown.total;
            }

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
            updateTargetProgress();
            runManager.updateRunUI();  // Update "X to go" display

            // Track word stats for end-of-run summary
            if (turnBreakdown) {
                const mainWordBreakdown = turnBreakdown.words.length > 0 ? {
                    baseScore: turnBreakdown.words[0].wordTotal,
                    components: turnBreakdown.words[0].wordComponents,
                    total: turnBreakdown.total
                } : null;
                runManager.trackWordStats(formedWords, turnScore, mainWordBreakdown);
            }

            // Award $1 for each unclaimed coin tile placed this turn
            let coinsEarned = 0;
            gameState.placedTiles.forEach(tile => {
                if (tile.coinTile && !tile.coinClaimed) {
                    coinsEarned++;
                    tile.coinClaimed = true;
                    // Track claimed position for persistence
                    if (!gameState.coinClaimedPositions) {
                        gameState.coinClaimedPositions = [];
                    }
                    gameState.coinClaimedPositions.push({ row: tile.row, col: tile.col });
                    // Update DOM tile to mark as claimed
                    const cell = document.querySelector(`.board-cell[data-row="${tile.row}"][data-col="${tile.col}"]`);
                    if (cell) {
                        const tileEl = cell.querySelector('.tile');
                        if (tileEl) {
                            tileEl.dataset.coinClaimed = 'true';
                        }
                    }
                }
            });
            if (coinsEarned > 0) {
                runState.coins += coinsEarned;
                runManager.updateRunUI();
                console.log(`[Coin Tiles] Earned $${coinsEarned} from coin tiles`);
            }

            // The Miser: +$2 for turns using 1, 2, or 3 tiles
            if (hasRogue('miser') && runState.isRunMode && placedWord.length >= 1 && placedWord.length <= 3) {
                runState.coins += 2;
                runManager.updateRunUI();
                console.log(`[Miser] Earned $2 for using ${placedWord.length} tile(s)`);
            }

            // Note: Tiles have already been removed from rackTiles when placed on board
            // so gameState.rackTiles already contains only the tiles left in the rack

            // No need to update totalTilesDrawn here - it's updated in nextTurn

            // Save turn to history
            const rackSizeForBingo = getRackSize();
            gameState.turnHistory.push({
                tiles: placedWord,
                score: turnScore,
                bingo: placedWord.length === rackSizeForBingo,
                originalRack: gameState.turnStartRack || []  // Cache original rack from turn START (before shuffle/placement)
            });

            // Store blank positions for future turns (blanks always score 0)
            placedWord.forEach(tile => {
                if (tile.isBlank) {
                    if (!gameState.blankPositions) {
                        gameState.blankPositions = [];
                    }
                    gameState.blankPositions.push({ row: tile.row, col: tile.col, letter: tile.letter });
                }
            });

            // All-Round Letter: Track letters played this cycle
            if (hasRogue('allRoundLetter') && runState.isRunMode) {
                if (!runState.lettersPlayedThisCycle) {
                    runState.lettersPlayedThisCycle = new Set();
                }
                // Add all letters from placed tiles
                placedWord.forEach(tile => {
                    runState.lettersPlayedThisCycle.add(tile.letter);
                });
                // Reset cycle when 18+ unique letters used (refresh the bonus)
                if (runState.lettersPlayedThisCycle.size >= 18) {
                    console.log('[All-Round Letter] Cycle complete! Resetting letter tracking.');
                    runState.lettersPlayedThisCycle = new Set();
                }
                runManager.saveRunState();
            }

            // Clear placed tiles tracking
            document.querySelectorAll('.placed-this-turn').forEach(cell => {
                cell.classList.remove('placed-this-turn');
            });
            gameState.placedTiles = [];

            // Clear the potential words display
            updatePotentialWordsSidebar();

            // Update UI including hiding recall button
            checkWordValidity();

            // Function to proceed to next turn
            const proceedToNextTurn = () => {
                nextTurn();
                gameState.isSubmitting = false;
            };

            // Show Balatro-style score animation, then move to next turn
            showScoreAnimationBalatro(turnBreakdown, proceedToNextTurn);
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
    // Extract just letters for server (rackTiles stores objects with buffed info)
    const rackLetters = gameState.rackTiles.map(t => typeof t === 'object' ? t.letter : t);
    const rackSize = getRackSize();
    const params = new URLSearchParams({
        seed: gameState.seed,
        turn: gameState.currentTurn,
        rack_tiles: JSON.stringify(rackLetters),
        tiles_drawn: gameState.totalTilesDrawn,
        purchased_tiles: JSON.stringify(runState.purchasedTiles || []),
        removed_tiles: JSON.stringify(runState.removedTiles || []),
        rack_size: rackSize
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

            // Track NEW tiles drawn from bag (skip the kept rack tiles)
            // The server returns rackTiles + newTiles, so slice off the rack portion
            const existingTileCount = gameState.rackTiles.length;
            const newTiles = data.tiles.slice(existingTileCount);
            gameState.tilesDrawnFromBag.push(...newTiles);

            // Save original rack at turn START (before shuffle/placement)
            // This prevents corruption when user shuffles after placing tiles
            gameState.turnStartRack = [...data.tiles];

            // Animate: existing tiles slide left, new tiles fly from bag
            displayTilesAnimated(data.tiles, existingTileCount);
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
        gameState.score = totalScore;
    }

    saveGameState();

    // Disable game controls
    const submitBtn = document.getElementById('submit-word');
    const recallBtn = document.getElementById('recall-tiles');
    if (submitBtn) submitBtn.disabled = true;
    if (recallBtn) recallBtn.disabled = true;

    // Update footer squares
    updateFooterSquares();

    // Add visual indicator that game is over
    const gameBoard = document.getElementById('game-board');
    const rackBoard = document.getElementById('tile-rack-board');
    if (gameBoard) gameBoard.classList.add('game-over');
    if (rackBoard) rackBoard.classList.add('game-over');

    // === RUN MODE HANDLING ===
    if (runState.isRunMode) {
        // Check if target was met - runManager handles all UI
        runManager.checkRoundComplete(totalScore);
        return; // Don't show normal completion UI in run mode
    }

    // === NORMAL MODE (non-run) ===
    // Mark that player has completed today's game
    if (gameState.seed === getTodaysSeed()) {
        localStorage.setItem('letters_completed_today', gameState.seed);
    }

    // Share buttons hidden for RogueLetters - uncomment when sharing is implemented
    // const shareIcon = document.getElementById('shareIcon');
    // if (shareIcon) {
    //     shareIcon.classList.remove('hidden');
    // }

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

    // Pre-generate shareable URL
    await generateShareableBoardURL();

    // Update subtitle to show high score
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
    if (confirm('Start a new game? This will reset everything including any tiles you bought.')) {
        // Track start over
        Analytics.navigation.startOver(gameState.currentTurn, gameState.score);

        // Clear all saved state
        localStorage.removeItem('letters_game_state');
        localStorage.removeItem('rogueletters_run');

        // Reload without seed parameter to get a fresh game
        window.location.href = window.location.pathname;
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

        // Update run UI if in run mode (dateDisplay removed)
        if (runState.isRunMode) {
            runManager.updateRunUI();
        }

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
            // Detect blank by flag or lowercase letter, store uppercase
            const isBlank = blank || (letter !== letter.toUpperCase());
            const upperLetter = String(letter).toUpperCase();
            gameState.turnHistory[turnIndex].tiles.push({ row, col, letter: upperLetter, isBlank });
            gameState.turnHistory[turnIndex].score = gameData.s[turnIndex] || 0;
        }
    });

    // Place all tiles from the shared game
    gameData.t.forEach(([row, col, letter, turn, isBlank]) => {
        // For blanks, letter comes as lowercase - convert to uppercase for display
        const displayLetter = String(letter).toUpperCase();
        gameState.board[row][col] = displayLetter;

        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (!cell) return;

        // Detect blank: either explicit flag or lowercase letter indicates blank
        const tileIsBlank = isBlank || (letter !== letter.toUpperCase());

        // Create tile element
        const tileDiv = document.createElement('div');
        tileDiv.className = 'tile placed';
        tileDiv.dataset.turn = turn;
        if (tileIsBlank) {
            tileDiv.classList.add('blank-tile');
            tileDiv.dataset.isBlank = 'true';
        }

        const letterSpan = document.createElement('span');
        letterSpan.className = 'tile-letter';
        if (tileIsBlank) {
            letterSpan.classList.add('blank-letter');  // 70% opacity
        }
        letterSpan.textContent = displayLetter;

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'tile-value';
        scoreSpan.textContent = tileIsBlank ? '' : getTileDisplayScore(displayLetter);

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
                    tile.isBlank ? 1 : 0  // Blank flag (0 = normal, 1 = blank)
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

    // Try V4 first (fastest - no API calls needed)
    try {
        const v4URL = encodeV4URL();
        if (v4URL && typeof v4URL === 'string' && v4URL.length > 0) {
            shareURL = v4URL;
            method = 'v4';
            console.log('[Share Board] Pre-generated V4 URL:', shareURL.length, 'chars');
        } else {
            throw new Error('V4 encoding returned invalid result');
        }
    } catch (v4Err) {
        console.log('[Share Board] V4 encoding failed, trying V3...', v4Err.message);
        fallbackReason = 'v4_failed';

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
    if (shareURL.includes('?_=')) {
        method = 'v4';  // V4 format uses ?_= parameter (direct letter encoding)
    } else if (shareURL.includes('?g=') || shareURL.includes('?w=')) {
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
    if (method === 'v4' || method === 'v3') {
        successMessage = "Copied!";  // Best case - V4 or V3 compressed
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

    // Update run UI header if in run mode
    if (runState.isRunMode) {
        runManager.updateRunUI();
    }

    // Update footer squares
    updateFooterSquares();
}

function updateFooterSquares() {
    // Update the footer squares to show turn progress and scores
    const feedbackRow = document.getElementById('feedbackRow');
    if (!feedbackRow) return;

    // Ensure correct number of squares for maxTurns
    let squares = feedbackRow.querySelectorAll('.feedback-square');
    const targetCount = gameState.maxTurns || 5;

    if (squares.length !== targetCount) {
        // Find insertion point (after shareIcon, before total-score-display)
        const shareIcon = feedbackRow.querySelector('#shareIcon');
        const totalScoreDisplay = feedbackRow.querySelector('.total-score-display');

        // Remove all existing squares
        squares.forEach(sq => sq.remove());

        // Create new squares
        for (let i = 1; i <= targetCount; i++) {
            const square = document.createElement('span');
            square.className = `feedback-square turn-${i}`;
            if (totalScoreDisplay) {
                feedbackRow.insertBefore(square, totalScoreDisplay);
            } else {
                feedbackRow.appendChild(square);
            }
        }

        // Update squares reference
        squares = feedbackRow.querySelectorAll('.feedback-square');
    }

    const totalScoreElement = document.querySelector('.total-score-display .score-value');

    // Reset all squares
    squares.forEach((square, index) => {
        const turnNum = index + 1;
        square.classList.remove('current-turn', 'completed', 'score-low', 'score-medium', 'score-good', 'score-great', 'score-excellent', 'score-amazing');
        square.textContent = '';

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
                const validTiles = /^[A-Z_]$/;  // A-Z or blank tile (_)

                // Validate rackTiles array (can be strings or objects with letter property)
                if (parsedState.rackTiles && Array.isArray(parsedState.rackTiles)) {
                    const hasInvalidTiles = parsedState.rackTiles.some(t => {
                        // Support both string format (old) and object format (new)
                        const letter = typeof t === 'object' ? t.letter : t;
                        return typeof letter !== 'string' || !validTiles.test(letter);
                    });
                    if (hasInvalidTiles) {
                        console.warn('Corrupted rackTiles in localStorage, discarding saved state');
                        return false;
                    }
                }

                // Validate tiles array
                if (parsedState.tiles && Array.isArray(parsedState.tiles)) {
                    const hasInvalidTiles = parsedState.tiles.some(t =>
                        typeof t !== 'string' || !validTiles.test(t)
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
                tileDiv.dataset.letter = letter;  // Required for swap operations

                // Check if this position is a blank tile
                const isBlank = gameState.blankPositions?.some(b => b.row === row && b.col === col) || false;
                if (isBlank) {
                    tileDiv.classList.add('blank-tile');
                    tileDiv.dataset.isBlank = 'true';
                }

                // Check if this position is a coin tile (already claimed)
                const isCoinTile = gameState.coinClaimedPositions?.some(c => c.row === row && c.col === col) || false;
                if (isCoinTile) {
                    tileDiv.classList.add('coin-tile');
                    tileDiv.dataset.coinTile = 'true';
                    tileDiv.dataset.coinClaimed = 'true';
                }

                const letterSpan = document.createElement('span');
                letterSpan.className = 'tile-letter';
                if (isBlank) {
                    letterSpan.classList.add('blank-letter');  // 70% opacity
                }
                letterSpan.textContent = letter;

                const scoreSpan = document.createElement('span');
                scoreSpan.className = 'tile-value';
                scoreSpan.textContent = isBlank ? '' : getTileDisplayScore(letter);

                tileDiv.appendChild(letterSpan);
                tileDiv.appendChild(scoreSpan);

                // Add $1 indicator for coin tiles
                if (isCoinTile) {
                    const coinIndicator = document.createElement('span');
                    coinIndicator.className = 'tile-coin-indicator';
                    coinIndicator.textContent = '$1';
                    tileDiv.appendChild(coinIndicator);
                }

                cell.innerHTML = '';
                cell.appendChild(tileDiv);
                cell.classList.add('occupied');
            }
        }
    }

    // Restore placed tiles for current turn (includes effect indicators)
    if (gameState.placedTiles && gameState.placedTiles.length > 0) {
        gameState.placedTiles.forEach(({ row, col, coinTile, coinClaimed, buffed, bonus }) => {
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('placed-this-turn');
                const tile = cell.querySelector('.tile');
                if (tile) {
                    tile.classList.add('placed-this-turn');
                    tile.dataset.coinClaimed = coinClaimed ? 'true' : 'false';
                    // Apply tile effects using centralized system
                    applyTileEffects(tile, { buffed, bonus: bonus || 0, coinTile });
                    // Add click handler for tile interactions
                    tile.addEventListener('click', handleTileClick);
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