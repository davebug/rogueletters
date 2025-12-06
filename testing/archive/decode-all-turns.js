// Decode all 5 turns from the URL with definitive letters only
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
                    reject(new Error(`JSON parse error: ${e.message}`));
                }
            });
        }).on('error', reject);
    });
}

async function decodeAllTurns() {
    const bytes = base64UrlDecode(encoded);
    const bitStream = new BitStream(Array.from(bytes));

    const daysSinceEpoch = bitStream.readBits(14);
    const epoch = new Date('2020-01-01');
    const targetDate = new Date(epoch);
    targetDate.setDate(targetDate.getDate() + daysSinceEpoch);
    const seed = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}${String(targetDate.getDate()).padStart(2, '0')}`;

    const tileCount = bitStream.readBits(5);

    // Read all tiles
    const tiles = [];
    for (let i = 0; i < tileCount; i++) {
        const position = bitStream.readBits(7);
        const rackIdx = bitStream.readBits(3);
        const turn = bitStream.readBits(3);
        const row = Math.floor(position / 9);
        const col = position % 9;
        tiles.push({ row, col, rackIdx, turn });
    }

    // Group by turn
    const tilesByTurn = {};
    tiles.forEach(tile => {
        if (!tilesByTurn[tile.turn]) tilesByTurn[tile.turn] = [];
        tilesByTurn[tile.turn].push(tile);
    });

    // Decode each turn
    const playHistory = [];

    for (let turn = 1; turn <= 5; turn++) {
        const turnTiles = tilesByTurn[turn] || [];
        if (turnTiles.length === 0) continue;

        // Fetch rack with correct history
        const historyParam = playHistory.length > 0 ? encodeURIComponent(JSON.stringify(playHistory)) : '';
        let url = `${API_BASE}/get_rack.py?seed=${seed}&turn=${turn}`;
        if (historyParam) url += `&history=${historyParam}`;

        const data = await fetchUrl(url);
        const rack = data.rack;
        const sortedRack = [...rack].sort();

        console.log(`\n=== TURN ${turn} ===`);
        console.log(`Rack: [${rack.join(', ')}]`);
        console.log(`Sorted: [${sortedRack.join(', ')}]`);

        // Check for duplicate rackIdx 0
        const rackIdxCounts = {};
        turnTiles.forEach(t => {
            rackIdxCounts[t.rackIdx] = (rackIdxCounts[t.rackIdx] || 0) + 1;
        });

        const hasDuplicates = Object.values(rackIdxCounts).some(count => count > 1);
        if (hasDuplicates) {
            console.log(`⚠️  CORRUPTED: Duplicate rackIdx detected!`);
        }

        // Decode letters
        const decodedLetters = [];
        turnTiles.forEach(tile => {
            const letter = sortedRack[tile.rackIdx];
            const isDuplicate = rackIdxCounts[tile.rackIdx] > 1;
            const certain = !hasDuplicates && letter !== undefined;

            decodedLetters.push({
                pos: `(${tile.row},${tile.col})`,
                letter: certain ? letter : '?',
                certain: certain
            });
        });

        console.log('Tiles:');
        decodedLetters.forEach(d => {
            const marker = d.certain ? '✓' : '?';
            console.log(`  ${d.pos}: ${d.letter} ${marker}`);
        });

        // Only add to history if we're certain
        if (!hasDuplicates) {
            playHistory.push(decodedLetters.map(d => d.letter));
        } else {
            // Can't reliably continue - history is corrupted
            console.log('⚠️  Cannot decode remaining turns reliably due to corrupted history');
            break;
        }
    }
}

decodeAllTurns().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
