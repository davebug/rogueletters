#!/usr/bin/env node
/**
 * Comprehensive test for Option 3c: Alphabetical sorting during encode/decode
 *
 * Tests whether sorting racks alphabetically before assigning indices
 * fixes the rack reordering bug without changing backend or UX.
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8085/cgi-bin';
const TEST_SEED = '20251121';

// Color codes for output
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

let testsPassed = 0;
let testsFailed = 0;

function log(color, symbol, message) {
    console.log(`${color}${symbol}${RESET} ${message}`);
}

function pass(message) {
    testsPassed++;
    log(GREEN, '✓', message);
}

function fail(message) {
    testsFailed++;
    log(RED, '✗', message);
}

function info(message) {
    log(BLUE, 'ℹ', message);
}

function warn(message) {
    log(YELLOW, '⚠', message);
}

/**
 * Simulate the encoding logic with alphabetical sorting
 */
function simulateEncodingWithSorting(rack, lettersPlayed) {
    const sortedRack = [...rack].sort();
    const usedIndices = new Set();
    const indices = [];

    info(`  Original rack: ${JSON.stringify(rack)}`);
    info(`  Sorted rack:   ${JSON.stringify(sortedRack)}`);
    info(`  Letters to encode: ${JSON.stringify(lettersPlayed)}`);

    lettersPlayed.forEach(letter => {
        let rackIdx = -1;
        for (let i = 0; i < sortedRack.length; i++) {
            if (sortedRack[i] === letter && !usedIndices.has(i)) {
                rackIdx = i;
                usedIndices.add(i);
                break;
            }
        }
        if (rackIdx === -1) {
            fail(`    Letter '${letter}' not found in sorted rack!`);
        } else {
            info(`    '${letter}' → index ${rackIdx} in sorted rack`);
        }
        indices.push(rackIdx);
    });

    return indices;
}

/**
 * Simulate the decoding logic with alphabetical sorting
 */
function simulateDecodingWithSorting(rack, indices) {
    const sortedRack = [...rack].sort();
    const usedIndices = new Set();
    const letters = [];

    info(`  Original rack: ${JSON.stringify(rack)}`);
    info(`  Sorted rack:   ${JSON.stringify(sortedRack)}`);
    info(`  Indices to decode: ${JSON.stringify(indices)}`);

    indices.forEach((idx, i) => {
        // Use the index directly from sorted rack
        let actualIdx = idx;

        // Handle duplicate: find Nth occurrence of this position
        for (let j = 0; j < sortedRack.length; j++) {
            if (j === idx && !usedIndices.has(j)) {
                actualIdx = j;
                break;
            }
        }

        const letter = sortedRack[actualIdx] || sortedRack[idx] || '?';
        usedIndices.add(actualIdx);
        info(`    index ${idx} → '${letter}' from sorted rack`);
        letters.push(letter);
    });

    return letters;
}

/**
 * Test basic rack reordering scenario
 */
function testBasicReordering() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: Basic Rack Reordering (ALONE → OFLNE bug)');
    console.log('='.repeat(60));

    // User's reordered rack (what /letters.py returns after reordering)
    const reorderedRack = ['O', 'F', 'L', 'N', 'E', 'X', 'Y'];

    // Canonical rack (what /get_rack.py returns)
    const canonicalRack = ['A', 'E', 'F', 'L', 'N', 'O', 'X', 'Y'];  // Wait, ALONE needs 'A'!

    // Let me recalculate with the actual bug scenario
    // User has: A, L, O, N, E, X, Y (canonical from bag)
    // User reorders to: O, L, F, N, E, X, Y (wait, where did F come from?)

    // Let me use a more realistic scenario:
    // Canonical rack (from tile bag): ['A', 'E', 'L', 'N', 'O', 'T', 'Y']
    const canonicalRack2 = ['A', 'E', 'L', 'N', 'O', 'T', 'Y'];

    // User reorders visually to: ['O', 'A', 'L', 'N', 'E', 'T', 'Y']
    const reorderedRack2 = ['O', 'A', 'L', 'N', 'E', 'T', 'Y'];

    // User plays: ALONE (using reordered rack)
    const word = ['A', 'L', 'O', 'N', 'E'];

    console.log('\nScenario: User reordered rack before playing "ALONE"');
    console.log('Canonical order:', canonicalRack2);
    console.log('User reordered to:', reorderedRack2);
    console.log('User plays:', word);

    console.log('\n--- Encoding (uses reordered rack from /letters.py) ---');
    const encodedIndices = simulateEncodingWithSorting(reorderedRack2, word);

    console.log('\n--- Decoding (uses canonical rack from /get_rack.py) ---');
    const decodedLetters = simulateDecodingWithSorting(canonicalRack2, encodedIndices);

    console.log('\n--- Result ---');
    const encodedWord = word.join('');
    const decodedWord = decodedLetters.join('');

    console.log(`Encoded: ${encodedWord}`);
    console.log(`Decoded: ${decodedWord}`);

    if (encodedWord === decodedWord) {
        pass(`SUCCESS: "${encodedWord}" → "${decodedWord}" (match!)`);
        return true;
    } else {
        fail(`FAILURE: "${encodedWord}" → "${decodedWord}" (mismatch!)`);
        return false;
    }
}

/**
 * Test with duplicate letters
 */
function testDuplicateLetters() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Duplicate Letters');
    console.log('='.repeat(60));

    // Rack with duplicates
    const canonicalRack = ['A', 'A', 'E', 'L', 'N', 'O', 'T'];
    const reorderedRack = ['O', 'A', 'L', 'A', 'E', 'T', 'N'];

    // Play word using both A's: LANE (but using second A from reordered rack)
    const word = ['L', 'A', 'N', 'E'];

    console.log('\nScenario: Rack has 2 A\'s, user plays one');
    console.log('Canonical order:', canonicalRack);
    console.log('User reordered to:', reorderedRack);
    console.log('User plays:', word);

    console.log('\n--- Encoding (uses reordered rack) ---');
    const encodedIndices = simulateEncodingWithSorting(reorderedRack, word);

    console.log('\n--- Decoding (uses canonical rack) ---');
    const decodedLetters = simulateDecodingWithSorting(canonicalRack, encodedIndices);

    console.log('\n--- Result ---');
    const encodedWord = word.join('');
    const decodedWord = decodedLetters.join('');

    console.log(`Encoded: ${encodedWord}`);
    console.log(`Decoded: ${decodedWord}`);

    if (encodedWord === decodedWord) {
        pass(`SUCCESS: "${encodedWord}" → "${decodedWord}" (duplicates handled!)`);
        return true;
    } else {
        fail(`FAILURE: "${encodedWord}" → "${decodedWord}" (duplicate bug!)`);
        return false;
    }
}

/**
 * Test edge case: all same letter
 */
function testAllSameLetter() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: All Same Letter (extreme duplicate case)');
    console.log('='.repeat(60));

    const canonicalRack = ['A', 'A', 'A', 'A', 'A', 'A', 'A'];
    const reorderedRack = ['A', 'A', 'A', 'A', 'A', 'A', 'A'];  // Can't reorder!

    const word = ['A', 'A', 'A'];

    console.log('\nScenario: All tiles are the same letter');
    console.log('Canonical order:', canonicalRack);
    console.log('User reordered to:', reorderedRack);
    console.log('User plays:', word);

    console.log('\n--- Encoding ---');
    const encodedIndices = simulateEncodingWithSorting(reorderedRack, word);

    console.log('\n--- Decoding ---');
    const decodedLetters = simulateDecodingWithSorting(canonicalRack, encodedIndices);

    console.log('\n--- Result ---');
    const encodedWord = word.join('');
    const decodedWord = decodedLetters.join('');

    if (encodedWord === decodedWord) {
        pass(`SUCCESS: All same letter handled correctly`);
        return true;
    } else {
        fail(`FAILURE: All same letter failed`);
        return false;
    }
}

/**
 * Test with real API data
 */
async function testWithRealAPI() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: Real API Rack Comparison (from earlier test)');
    console.log('='.repeat(60));

    try {
        // Get turn 1 rack
        const turn1Response = await fetch(`${API_BASE}/letters.py?seed=${TEST_SEED}&turn=1`);
        const turn1Data = await turn1Response.json();
        const originalRack = turn1Data.tiles;

        // Simulate reordering
        const reorderedRack = [...originalRack].reverse();

        // Play 2 tiles
        const tilesPlayed = reorderedRack.slice(0, 2);
        const remainingRack = reorderedRack.slice(2);

        console.log('\nScenario: Real game with reordered rack');
        console.log('Original rack:', originalRack);
        console.log('User reordered to:', reorderedRack);
        console.log('Tiles played:', tilesPlayed);

        // Get turn 2 racks from both endpoints
        const lettersUrl = `${API_BASE}/letters.py?seed=${TEST_SEED}&turn=2&rack_tiles=${encodeURIComponent(JSON.stringify(remainingRack))}&tiles_drawn=7`;
        const lettersResponse = await fetch(lettersUrl);
        const lettersData = await lettersResponse.json();
        const rackFromLetters = lettersData.tiles;

        const history = [tilesPlayed];
        const getRackUrl = `${API_BASE}/get_rack.py?seed=${TEST_SEED}&turn=2&history=${encodeURIComponent(JSON.stringify(history))}`;
        const getRackResponse = await fetch(getRackUrl);
        const getRackData = await getRackResponse.json();
        const rackFromGetRack = getRackData.rack;

        console.log('\nRacks from endpoints:');
        console.log('  /letters.py:  ', rackFromLetters);
        console.log('  /get_rack.py: ', rackFromGetRack);

        // Sort both
        const sortedLettersRack = [...rackFromLetters].sort();
        const sortedGetRackRack = [...rackFromGetRack].sort();

        console.log('\nAfter alphabetical sorting:');
        console.log('  /letters.py:  ', sortedLettersRack);
        console.log('  /get_rack.py: ', sortedGetRackRack);

        const racksMatchAfterSorting = JSON.stringify(sortedLettersRack) === JSON.stringify(sortedGetRackRack);

        if (racksMatchAfterSorting) {
            pass('SUCCESS: Racks match after sorting!');
            return true;
        } else {
            fail('FAILURE: Racks still don\'t match after sorting');
            warn('  This means sorting alone won\'t fix the bug');
            return false;
        }

    } catch (err) {
        fail(`API test failed: ${err.message}`);
        return false;
    }
}

/**
 * Main test runner
 */
async function runAllTests() {
    console.log('\n' + '═'.repeat(60));
    console.log('OPTION 3C: ALPHABETICAL SORTING TEST SUITE');
    console.log('Testing if sorting racks during encode/decode fixes the bug');
    console.log('═'.repeat(60));

    testBasicReordering();
    testDuplicateLetters();
    testAllSameLetter();
    await testWithRealAPI();

    console.log('\n' + '═'.repeat(60));
    console.log('TEST SUMMARY');
    console.log('═'.repeat(60));
    console.log(`${GREEN}Passed: ${testsPassed}${RESET}`);
    console.log(`${RED}Failed: ${testsFailed}${RESET}`);

    if (testsFailed === 0) {
        console.log(`\n${GREEN}✓ ALL TESTS PASSED!${RESET}`);
        console.log('\nConclusion: Option 3c (alphabetical sorting) appears viable!');
        console.log('Next step: Implement in script.js and test with real gameplay.');
    } else {
        console.log(`\n${RED}✗ SOME TESTS FAILED${RESET}`);
        console.log('\nConclusion: Option 3c needs further investigation.');
    }
    console.log('═'.repeat(60) + '\n');

    process.exit(testsFailed === 0 ? 0 : 1);
}

runAllTests().catch(err => {
    console.error('Test suite crashed:', err);
    process.exit(1);
});
