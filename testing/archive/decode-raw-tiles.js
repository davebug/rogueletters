// Decode raw tile data from the URL to see exact bit values
const encoded = 'IaZnIVyLfGADJpkBSmpcUwKGXETi1xgxZhQQFIdUASgRQA';

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

const bytes = base64UrlDecode(encoded);
const bitStream = new BitStream(Array.from(bytes));

// Read header
const daysSinceEpoch = bitStream.readBits(14);
const tileCount = bitStream.readBits(5);

console.log('Date (days since epoch):', daysSinceEpoch);
console.log('Tile count:', tileCount);
console.log('\nAll tiles:');

// Read all tiles
for (let i = 0; i < tileCount; i++) {
    const position = bitStream.readBits(7);
    const rackIdx = bitStream.readBits(3);
    const turn = bitStream.readBits(3);
    const row = Math.floor(position / 9);
    const col = position % 9;
    console.log(`Tile ${i}: position=${position} (row=${row}, col=${col}), rackIdx=${rackIdx}, turn=${turn}`);
}

// Filter Turn 2 tiles
console.log('\n=== Turn 2 tiles only ===');
const bitStream2 = new BitStream(Array.from(bytes));
bitStream2.readBits(14); // skip date
bitStream2.readBits(5);  // skip count

for (let i = 0; i < tileCount; i++) {
    const position = bitStream2.readBits(7);
    const rackIdx = bitStream2.readBits(3);
    const turn = bitStream2.readBits(3);
    const row = Math.floor(position / 9);
    const col = position % 9;

    if (turn === 2) {
        console.log(`Row ${row}, Col ${col}: rackIdx=${rackIdx}`);
    }
}
