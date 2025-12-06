const { test } = require('@playwright/test');

test('Decode bloated URL to see what it contains', async ({ page }) => {
  await page.goto('http://localhost:8085');
  await page.waitForSelector('#game-board');

  const analysis = await page.evaluate(() => {
    const bloatedEncoded = 'N4IgJiBcIEwAwwKwEZUE4QBoQHcogGkAJAQQBkBJAMRKxABcoBtJgZk3ZABEtlM4AupjaYALNlqY+g4e0TYAsr35CRANmwBRZTKZwp2ACpYYK4Xz4gASibNNTlyad3tLAYVu75l7ZmeqNSxs-O319EF92XWlsAHksKNVnbAA5BNDMAA5sDzE7PmyIrHFdU0KyYrt2QuM83XFCgGVK6JCQWvldfVMQSU6ktt9+oRAAZ2ZWPhhAtDEAdik1AQBfIA';
    const compactEncoded = 'IZanoT9KAFCyBKFNE4jmS5JvUALEhkoxDhEQ1YjMWaCxQWpQ0A';

    // Helper function from the code
    function base64UrlDecode(str) {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const padding = (4 - (base64.length % 4)) % 4;
      const padded = base64 + '='.repeat(padding);
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    const bloatedBytes = base64UrlDecode(bloatedEncoded);
    const compactBytes = base64UrlDecode(compactEncoded);

    // Try to read as V3 format
    class BitStreamReader {
      constructor(bytes) {
        this.bytes = bytes;
        this.bitPosition = 0;
      }

      readBits(count) {
        let result = 0;
        for (let i = 0; i < count; i++) {
          const byteIndex = Math.floor(this.bitPosition / 8);
          const bitIndex = 7 - (this.bitPosition % 8);
          const bit = (this.bytes[byteIndex] >> bitIndex) & 1;
          result = (result << 1) | bit;
          this.bitPosition++;
        }
        return result;
      }
    }

    // Read bloated
    const bloatedReader = new BitStreamReader(bloatedBytes);
    const bloatedDate = bloatedReader.readBits(14);
    const bloatedTileCount = bloatedReader.readBits(5);

    // Read compact
    const compactReader = new BitStreamReader(compactBytes);
    const compactDate = compactReader.readBits(14);
    const compactTileCount = compactReader.readBits(5);

    return {
      bloated: {
        totalBytes: bloatedBytes.length,
        firstBytes: Array.from(bloatedBytes.slice(0, 20)),
        dateField: bloatedDate,
        tileCountField: bloatedTileCount,
        expectedBytesFor21Tiles: Math.ceil((14 + 5 + 21*13) / 8)
      },
      compact: {
        totalBytes: compactBytes.length,
        firstBytes: Array.from(compactBytes.slice(0, 20)),
        dateField: compactDate,
        tileCountField: compactTileCount,
        expectedBytesFor21Tiles: Math.ceil((14 + 5 + 21*13) / 8)
      }
    };
  });

  console.log('\n========================================');
  console.log('BLOATED URL ANALYSIS');
  console.log('========================================\n');

  console.log('BLOATED (what user got):');
  console.log('  Total bytes:', analysis.bloated.totalBytes);
  console.log('  Date field:', analysis.bloated.dateField);
  console.log('  Tile count field:', analysis.bloated.tileCountField);
  console.log('  First 20 bytes:', analysis.bloated.firstBytes.map(b => b.toString(16).padStart(2,'0')).join(' '));
  console.log('  Expected for 21 tiles:', analysis.bloated.expectedBytesFor21Tiles, 'bytes');
  console.log('  BLOAT FACTOR:', (analysis.bloated.totalBytes / analysis.bloated.expectedBytesFor21Tiles).toFixed(1) + 'x\n');

  console.log('COMPACT (regenerated):');
  console.log('  Total bytes:', analysis.compact.totalBytes);
  console.log('  Date field:', analysis.compact.dateField);
  console.log('  Tile count field:', analysis.compact.tileCountField);
  console.log('  First 20 bytes:', analysis.compact.firstBytes.map(b => b.toString(16).padStart(2,'0')).join(' '));

  console.log('\n========================================');
});
