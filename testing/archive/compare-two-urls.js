// Compare two share URLs to find differences
const http = require('http');

const original = 'IaZnIVyLfGADJpkBSmpcUwKGXETi1xgxZhQQFIdUASgRQA';  // Louis's broken URL
const recreation = 'IaZnIVyLfGADJpkRSmpdUwKHXETilxgzogJwWoUkAagRQA';  // User's recreation

// Base64 URL decode
function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return Buffer.from(str, 'base64');
}

// Bit stream reader
class BitStream {
    constructor(bytes) {
        this.bitString = '';
        for (let i = 0; i < bytes.length; i++) {
            this.bitString += bytes[i].toString(2).padStart(8, '0');
        }
        this.pos = 0;
    }
    readBits(n) {
        const val = parseInt(this.bitString.substring(this.pos, this.pos + n), 2);
        this.pos += n;
        return val;
    }
}

function decodeURL(encoded, label) {
    const bytes = base64UrlDecode(encoded);
    const bitStream = new BitStream(Array.from(bytes));

    const daysSinceEpoch = bitStream.readBits(14);
    const tileCount = bitStream.readBits(5);

    console.log(`\n=== ${label} ===`);
    console.log(`Date: ${daysSinceEpoch} days since epoch (Nov 23, 2025)`);
    console.log(`Tile count: ${tileCount}`);

    const tiles = [];
    for (let i = 0; i < tileCount; i++) {
        const position = bitStream.readBits(7);
        const rackIdx = bitStream.readBits(3);
        const turn = bitStream.readBits(3);
        const row = Math.floor(position / 9);
        const col = position % 9;
        tiles.push({ position, row, col, rackIdx, turn, index: i });
    }

    // Group by turn
    const tilesByTurn = {};
    tiles.forEach(tile => {
        if (!tilesByTurn[tile.turn]) tilesByTurn[tile.turn] = [];
        tilesByTurn[tile.turn].push(tile);
    });

    console.log('\nTiles by turn:');
    for (let turn = 1; turn <= 5; turn++) {
        const turnTiles = tilesByTurn[turn] || [];
        if (turnTiles.length > 0) {
            console.log(`  Turn ${turn}: ${turnTiles.length} tiles`);
            turnTiles.forEach(t => {
                console.log(`    [${t.index}] (${t.row},${t.col}) rackIdx=${t.rackIdx}`);
            });
        }
    }

    return tiles;
}

const originalTiles = decodeURL(original, "ORIGINAL (Louis's broken URL)");
const recreationTiles = decodeURL(recreation, "RECREATION (Your replay)");

// Compare tile by tile
console.log('\n=== COMPARISON ===');
console.log(`Original has ${originalTiles.length} tiles, Recreation has ${recreationTiles.length} tiles`);

if (originalTiles.length !== recreationTiles.length) {
    console.log('⚠️  Different number of tiles!');
}

const maxLen = Math.max(originalTiles.length, recreationTiles.length);
let differences = 0;

for (let i = 0; i < maxLen; i++) {
    const orig = originalTiles[i];
    const rec = recreationTiles[i];

    if (!orig) {
        console.log(`\nTile ${i}: EXTRA in recreation`);
        console.log(`  Recreation: (${rec.row},${rec.col}) rackIdx=${rec.rackIdx} turn=${rec.turn}`);
        differences++;
        continue;
    }

    if (!rec) {
        console.log(`\nTile ${i}: MISSING in recreation`);
        console.log(`  Original: (${orig.row},${orig.col}) rackIdx=${orig.rackIdx} turn=${orig.turn}`);
        differences++;
        continue;
    }

    // Check if they differ
    const posMatch = orig.row === rec.row && orig.col === rec.col;
    const rackIdxMatch = orig.rackIdx === rec.rackIdx;
    const turnMatch = orig.turn === rec.turn;

    if (!posMatch || !rackIdxMatch || !turnMatch) {
        console.log(`\nTile ${i}: DIFFERENT`);
        console.log(`  Original:    (${orig.row},${orig.col}) rackIdx=${orig.rackIdx} turn=${orig.turn}`);
        console.log(`  Recreation:  (${rec.row},${rec.col}) rackIdx=${rec.rackIdx} turn=${rec.turn}`);

        if (!posMatch) console.log(`    ⚠️  Position differs!`);
        if (!rackIdxMatch) console.log(`    ⚠️  Rack index differs (different letter)`);
        if (!turnMatch) console.log(`    ⚠️  Turn differs!`);

        differences++;
    }
}

if (differences === 0) {
    console.log('\n✓ All tiles match perfectly!');
} else {
    console.log(`\n⚠️  Found ${differences} differences`);
}

console.log('\n=== SCORE ANALYSIS ===');
console.log('Original score: 139 points');
console.log('Recreation score: 136 points');
console.log('Difference: 3 points');
console.log('\nPossible explanations for 3-point difference:');
console.log('- Different letter values (e.g., used D instead of A = 3 points)');
console.log('- Missed a premium square');
console.log('- Slightly different word placement');
