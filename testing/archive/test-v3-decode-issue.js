// Test V3 URL decoding for the reported failing URL
// URL: https://letters.wiki/?w=IaZnIVyLfGADJpkBSmpcUwKGXETi1xgxZhQQFIdUASgRQA

const http = require('http');

const encoded = 'IaZnIVyLfGADJpkBSmpcUwKGXETi1xgxZhQQFIdUASgRQA';
const API_BASE = 'http://localhost:8085/cgi-bin';

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

// Convert days since epoch to date
function daysSinceEpochToDate(days) {
    const epoch = new Date('2020-01-01');
    const targetDate = new Date(epoch);
    targetDate.setDate(targetDate.getDate() + days);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
}

// Fetch helper
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`JSON parse error: ${e.message}. Data: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

async function testDecode() {
    console.log('Testing V3 URL decode for:', encoded);
    console.log('Format: sorted (?w=)\n');

    try {
        // Decode Base64
        const bytes = base64UrlDecode(encoded);
        const bitStream = new BitStream(Array.from(bytes));

        // Read date
        const daysSinceEpoch = bitStream.readBits(14);
        const seed = daysSinceEpochToDate(daysSinceEpoch);
        console.log('✓ Date decoded:', seed);

        // Read tile count
        const tileCount = bitStream.readBits(5);
        console.log('✓ Tile count:', tileCount);

        // Read tiles
        const tiles = [];
        for (let i = 0; i < tileCount; i++) {
            const position = bitStream.readBits(7);
            const rackIdx = bitStream.readBits(3);
            const turn = bitStream.readBits(3);
            const row = Math.floor(position / 9);
            const col = position % 9;
            tiles.push({ row, col, rackIdx, turn });
        }
        console.log('✓ Tiles decoded:', tiles.length, 'tiles\n');

        // Group by turn
        const tilesByTurn = {};
        tiles.forEach(tile => {
            if (!tilesByTurn[tile.turn]) tilesByTurn[tile.turn] = [];
            tilesByTurn[tile.turn].push(tile);
        });

        // Fetch racks and decode letters
        const tilesWithLetters = [];
        const playHistory = [];

        for (let turn = 1; turn <= 5; turn++) {
            const turnTiles = tilesByTurn[turn] || [];
            if (turnTiles.length === 0) continue;

            // Build history parameter
            const historyParam = playHistory.length > 0 ? encodeURIComponent(JSON.stringify(playHistory)) : '';

            // Fetch rack
            let url = `${API_BASE}/get_rack.py?seed=${seed}&turn=${turn}`;
            if (historyParam) url += `&history=${historyParam}`;

            console.log(`Fetching rack for turn ${turn}...`);
            const data = await fetchUrl(url);
            const rack = data.rack;

            // Apply sorting for ?w= format
            const decodingRack = [...rack].sort();

            console.log(`  Original rack: [${rack.join(', ')}]`);
            console.log(`  Sorted rack:   [${decodingRack.join(', ')}]`);

            // Decode tiles
            const tilesPlayedThisTurn = [];
            const usedIndices = new Set();

            turnTiles.forEach(tile => {
                const letter = decodingRack[tile.rackIdx];

                if (letter === undefined) {
                    throw new Error(`Invalid rack index ${tile.rackIdx} for turn ${turn}. Rack has ${decodingRack.length} positions`);
                }
                if (usedIndices.has(tile.rackIdx)) {
                    throw new Error(`Duplicate rack index ${tile.rackIdx} in turn ${turn}`);
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

            console.log(`  Tiles played:  [${tilesPlayedThisTurn.join(', ')}]\n`);
            playHistory.push(tilesPlayedThisTurn);
        }

        console.log('✓ All tiles decoded successfully!');
        console.log(`✓ Total tiles with letters: ${tilesWithLetters.length}`);
        console.log('\n=== DECODING SUCCEEDED ===');

    } catch (err) {
        console.error('\n✗ DECODING FAILED:', err.message);
        console.error('Stack:', err.stack);
        process.exit(1);
    }
}

testDecode();
