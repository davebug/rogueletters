// Compare just the positions (coordinates) of tiles
const original = 'IaZnIVyLfGADJpkBSmpcUwKGXETi1xgxZhQQFIdUASgRQA';
const recreation = 'IaZnIVyLfGADJpkRSmpdUwKHXETilxgzogJwWoUkAagRQA';

function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return Buffer.from(str, 'base64');
}

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

function decodePositions(encoded) {
    const bytes = base64UrlDecode(encoded);
    const bitStream = new BitStream(Array.from(bytes));

    bitStream.readBits(14); // skip date
    const tileCount = bitStream.readBits(5);

    const positions = [];
    for (let i = 0; i < tileCount; i++) {
        const position = bitStream.readBits(7);
        const rackIdx = bitStream.readBits(3);
        const turn = bitStream.readBits(3);
        const row = Math.floor(position / 9);
        const col = position % 9;
        positions.push({ row, col, turn });
    }

    return positions;
}

const origPos = decodePositions(original);
const recPos = decodePositions(recreation);

console.log('=== POSITION COMPARISON ===\n');
console.log('Tile | Original       | Recreation     | Match?');
console.log('-----|----------------|----------------|-------');

let allMatch = true;
for (let i = 0; i < Math.max(origPos.length, recPos.length); i++) {
    const orig = origPos[i];
    const rec = recPos[i];

    const match = orig && rec && orig.row === rec.row && orig.col === rec.col && orig.turn === rec.turn;
    allMatch = allMatch && match;

    const origStr = orig ? `(${orig.row},${orig.col}) T${orig.turn}` : 'MISSING';
    const recStr = rec ? `(${rec.row},${rec.col}) T${rec.turn}` : 'MISSING';
    const matchStr = match ? '✓' : '✗';

    console.log(`${String(i).padStart(4)} | ${origStr.padEnd(14)} | ${recStr.padEnd(14)} | ${matchStr}`);
}

console.log('\n' + '='.repeat(60));
if (allMatch) {
    console.log('✅ ALL COORDINATES MATCH PERFECTLY!');
} else {
    console.log('❌ COORDINATES DO NOT MATCH');

    // Count mismatches
    let mismatches = 0;
    for (let i = 0; i < origPos.length; i++) {
        const orig = origPos[i];
        const rec = recPos[i];
        if (!rec || orig.row !== rec.row || orig.col !== rec.col || orig.turn !== rec.turn) {
            mismatches++;
        }
    }
    console.log(`   ${mismatches} tiles have different positions`);
}
