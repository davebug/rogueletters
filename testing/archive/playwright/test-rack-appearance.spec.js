const { test, expect } = require('@playwright/test');

test('tile rack appearance check', async ({ page }) => {
    await page.goto('http://localhost:8085');
    await page.waitForSelector('.tile-rack .tile', { timeout: 10000 });

    // Get rack and tile dimensions
    const rackInfo = await page.evaluate(() => {
        const rack = document.querySelector('.tile-rack');
        const tile = document.querySelector('.tile-rack .tile');
        const rackRect = rack.getBoundingClientRect();
        const tileRect = tile.getBoundingClientRect();
        const rackStyles = window.getComputedStyle(rack);

        return {
            rackHeight: rackRect.height,
            rackTop: rackRect.top,
            rackBottom: rackRect.bottom,
            rackPaddingTop: rackStyles.paddingTop,
            rackPaddingBottom: rackStyles.paddingBottom,
            tileHeight: tileRect.height,
            tileTop: tileRect.top,
            tileBottom: tileRect.bottom,
            tilesExtendAbove: tileRect.top < rackRect.top,
            extendAmount: rackRect.top - tileRect.top
        };
    });

    console.log('\n📏 RACK DIMENSIONS:');
    console.log(`Rack height: ${rackInfo.rackHeight}px`);
    console.log(`Rack padding: top=${rackInfo.rackPaddingTop}, bottom=${rackInfo.rackPaddingBottom}`);
    console.log(`Tile height: ${rackInfo.tileHeight}px`);
    console.log(`\n📍 POSITIONING:`);
    console.log(`Rack top: ${rackInfo.rackTop}px, bottom: ${rackInfo.rackBottom}px`);
    console.log(`Tile top: ${rackInfo.tileTop}px, bottom: ${rackInfo.tileBottom}px`);
    console.log(`\n✅ TILES EXTEND ABOVE RACK: ${rackInfo.tilesExtendAbove}`);
    if (rackInfo.extendAmount > 0) {
        console.log(`Tiles extend ${rackInfo.extendAmount}px above rack`);
    }

    // Take screenshot
    await page.screenshot({
        path: 'test-results/rack-appearance.png',
        clip: {
            x: 100,
            y: 500,
            width: 800,
            height: 150
        }
    });
    console.log('\n📸 Screenshot saved to test-results/rack-appearance.png');
});