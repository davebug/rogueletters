#!/usr/bin/env node
/**
 * Test to confirm the rack reordering bug
 *
 * This script tests whether /letters.py and /get_rack.py return
 * racks in different orders when tiles have been reordered.
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8085/cgi-bin';
const TEST_SEED = '20251121';  // Today's seed
const TURN = 2;

async function testRackOrdering() {
    console.log('='.repeat(60));
    console.log('RACK REORDERING BUG TEST');
    console.log('='.repeat(60));
    console.log();

    // Step 1: Get initial rack from /letters.py (turn 1)
    console.log('Step 1: Get initial rack (turn 1)');
    const turn1Response = await fetch(`${API_BASE}/letters.py?seed=${TEST_SEED}&turn=1`);
    const turn1Data = await turn1Response.json();
    const originalRack = turn1Data.tiles;
    console.log('  Original rack:', originalRack);
    console.log();

    // Step 2: Simulate user reordering the rack
    const reorderedRack = [...originalRack].reverse();  // Simple reversal for testing
    console.log('Step 2: User reorders rack (simulated)');
    console.log('  Reordered rack:', reorderedRack);
    console.log();

    // Step 3: Simulate playing 2 tiles from the reordered rack
    // Let's say user played the first 2 tiles from their reordered view
    const tilesPlayed = reorderedRack.slice(0, 2);
    const remainingRack = reorderedRack.slice(2);
    console.log('Step 3: User plays 2 tiles from reordered rack');
    console.log('  Tiles played:', tilesPlayed);
    console.log('  Remaining in rack:', remainingRack);
    console.log();

    // Step 4: Get turn 2 rack from /letters.py with reordered rack_tiles
    console.log('Step 4: Get turn 2 rack from /letters.py (with reordered rack_tiles)');
    const lettersUrl = `${API_BASE}/letters.py?seed=${TEST_SEED}&turn=${TURN}&rack_tiles=${encodeURIComponent(JSON.stringify(remainingRack))}&tiles_drawn=7`;
    const lettersResponse = await fetch(lettersUrl);
    const lettersData = await lettersResponse.json();
    const rackFromLetters = lettersData.tiles;
    console.log('  Rack from /letters.py:', rackFromLetters);
    console.log();

    // Step 5: Get turn 2 rack from /get_rack.py with history
    console.log('Step 5: Get turn 2 rack from /get_rack.py (with play history)');
    const history = [tilesPlayed];  // History of what was played in turn 1
    const getRackUrl = `${API_BASE}/get_rack.py?seed=${TEST_SEED}&turn=${TURN}&history=${encodeURIComponent(JSON.stringify(history))}`;
    const getRackResponse = await fetch(getRackUrl);
    const getRackData = await getRackResponse.json();
    const rackFromGetRack = getRackData.rack;
    console.log('  Rack from /get_rack.py:', rackFromGetRack);
    console.log();

    // Step 6: Compare the two racks
    console.log('Step 6: Compare racks');
    console.log('  /letters.py rack:  ', rackFromLetters);
    console.log('  /get_rack.py rack: ', rackFromGetRack);
    console.log();

    // Check if they match
    const racksMatch = JSON.stringify(rackFromLetters) === JSON.stringify(rackFromGetRack);

    if (racksMatch) {
        console.log('✅ RACKS MATCH - No bug detected');
        console.log('   (Both endpoints return same order)');
    } else {
        console.log('❌ BUG CONFIRMED - RACKS DON\'T MATCH!');
        console.log('   /letters.py preserves user reordering');
        console.log('   /get_rack.py returns canonical order');
        console.log();
        console.log('   This explains why share URLs decode with wrong letters:');
        console.log('   - Encoding uses rack indices from /letters.py (reordered)');
        console.log('   - Decoding uses rack indices from /get_rack.py (canonical)');
        console.log('   - Same indices → different letters → WRONG DECODE');
    }

    console.log();
    console.log('='.repeat(60));

    process.exit(racksMatch ? 0 : 1);
}

testRackOrdering().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
