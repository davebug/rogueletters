const { test, expect, devices } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Ensure screenshots directory exists
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'alphabetical-mobile');
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Helper to take labeled screenshots
async function captureState(page, name, step) {
    const filename = `${step.toString().padStart(3, '0')}-${name}.png`;
    await page.screenshot({
        path: path.join(SCREENSHOT_DIR, filename),
        fullPage: false
    });
    console.log(`📸 Captured: ${filename}`);
    return filename;
}

// Helper to get detailed tile information
async function getTileInfo(page) {
    return await page.evaluate(() => {
        const tiles = Array.from(document.querySelectorAll('.tile'));
        const rack = document.querySelector('#tile-rack');
        const rackRect = rack.getBoundingClientRect();

        return {
            order: tiles.map(t => t.dataset.letter).join(''),
            tiles: tiles.map(t => {
                const rect = t.getBoundingClientRect();
                const styles = window.getComputedStyle(t);
                return {
                    letter: t.dataset.letter,
                    width: rect.width,
                    height: rect.height,
                    isSquare: Math.abs(rect.width - rect.height) < 1,
                    left: rect.left,
                    top: rect.top,
                    transform: styles.transform,
                    opacity: styles.opacity,
                    position: {
                        x: rect.left - rackRect.left,
                        y: rect.top - rackRect.top
                    },
                    withinRack: rect.left >= rackRect.left &&
                               rect.right <= rackRect.right &&
                               rect.top >= rackRect.top &&
                               rect.bottom <= rackRect.bottom
                };
            }),
            rackBounds: {
                left: rackRect.left,
                right: rackRect.right,
                top: rackRect.top,
                bottom: rackRect.bottom,
                width: rackRect.width,
                height: rackRect.height
            }
        };
    });
}

// Helper to check for gaps during drag
async function checkGapDuringDrag(page) {
    return await page.evaluate(() => {
        const tiles = Array.from(document.querySelectorAll('.tile'));
        const gaps = [];

        // Check spacing between tiles
        for (let i = 0; i < tiles.length - 1; i++) {
            const rect1 = tiles[i].getBoundingClientRect();
            const rect2 = tiles[i + 1].getBoundingClientRect();
            const gap = rect2.left - (rect1.left + rect1.width);
            gaps.push({
                after: tiles[i].dataset.letter,
                before: tiles[i + 1].dataset.letter,
                gapSize: gap
            });
        }

        // Check for ghost element (SortableJS placeholder)
        const ghost = document.querySelector('.sortable-ghost');

        return {
            gaps,
            hasGhost: !!ghost,
            ghostPosition: ghost ? ghost.getBoundingClientRect() : null
        };
    });
}

test.use({ ...devices['iPhone 12'] });

test.describe('Mobile: Visual Validation Tests', () => {
    test('Verify tiles remain square on mobile', async ({ page }) => {
        console.log('\n📱 MOBILE TILE SQUARENESS TEST\n');
        let step = 101;

        await page.goto('http://localhost:8086/');
        await page.waitForSelector('.tile');

        // Check initial state
        console.log('📍 Initial State');
        await captureState(page, 'mobile-square-initial', step++);
        let info = await getTileInfo(page);

        console.log('Initial order:', info.order);
        info.tiles.forEach(t => {
            console.log(`  ${t.letter}: ${t.width.toFixed(1)}x${t.height.toFixed(1)} (square: ${t.isSquare})`);
        });

        expect(info.tiles.every(t => t.isSquare)).toBeTruthy();

        // Test touch drag
        console.log('\n📍 Touch Drag Test');
        const firstTile = page.locator('.tile').first();
        const lastTile = page.locator('.tile').last();

        await firstTile.dragTo(lastTile);
        await page.waitForTimeout(300);
        await captureState(page, 'mobile-square-after-drag', step++);

        info = await getTileInfo(page);
        console.log('After touch drag:');
        info.tiles.forEach(t => {
            console.log(`  ${t.letter}: ${t.width.toFixed(1)}x${t.height.toFixed(1)} (square: ${t.isSquare})`);
        });

        expect(info.tiles.every(t => t.isSquare)).toBeTruthy();
    });

    test('Verify tiles stay within rack bounds on mobile', async ({ page }) => {
        console.log('\n📱 MOBILE RACK BOUNDS TEST\n');
        let step = 110;

        await page.goto('http://localhost:8086/');
        await page.waitForSelector('.tile');

        await captureState(page, 'mobile-bounds-initial', step++);
        let info = await getTileInfo(page);

        console.log('Rack bounds:', info.rackBounds);
        console.log('All tiles within rack?', info.tiles.every(t => t.withinRack));
        expect(info.tiles.every(t => t.withinRack)).toBeTruthy();

        // Touch drag across rack
        const tiles = await page.locator('.tile').all();
        await tiles[0].dragTo(tiles[tiles.length - 1]);
        await page.waitForTimeout(300);
        await captureState(page, 'mobile-bounds-after-drag', step++);

        info = await getTileInfo(page);
        console.log('After drag - within rack?', info.tiles.every(t => t.withinRack));
        expect(info.tiles.every(t => t.withinRack)).toBeTruthy();
    });

    test('Verify gap behavior on mobile touch', async ({ page }) => {
        console.log('\n📱 MOBILE GAP MECHANICS TEST\n');
        let step = 120;

        await page.goto('http://localhost:8086/');
        await page.waitForSelector('.tile');

        const firstTile = page.locator('.tile').first();
        const middleTile = page.locator('.tile').nth(3);

        // Use touch drag for mobile
        await firstTile.dragTo(middleTile, {
            sourcePosition: { x: 20, y: 20 },
            targetPosition: { x: 20, y: 20 }
        });

        await page.waitForTimeout(300);
        await captureState(page, 'mobile-gap-after-drag', step++);

        const afterDropInfo = await getTileInfo(page);
        const normalGaps = [];
        for (let i = 0; i < afterDropInfo.tiles.length - 1; i++) {
            const gap = afterDropInfo.tiles[i + 1].left - (afterDropInfo.tiles[i].left + afterDropInfo.tiles[i].width);
            normalGaps.push(gap);
        }

        console.log('Gaps after touch drop:');
        console.log('  ', normalGaps.map(g => g.toFixed(0) + 'px').join(', '));

        // Check gaps are uniform (within 5px tolerance)
        const avgGap = normalGaps.reduce((a, b) => a + b) / normalGaps.length;
        const gapsUniform = normalGaps.every(g => Math.abs(g - avgGap) < 5);
        console.log(`  Gaps uniform? ${gapsUniform} (avg: ${avgGap.toFixed(0)}px)`);

        expect(gapsUniform).toBeTruthy();
    });

    test('Sort to alphabetical on mobile', async ({ page }) => {
        console.log('\n📱 MOBILE ALPHABETICAL SORT\n');
        let step = 130;

        await page.goto('http://localhost:8086/');
        await page.waitForSelector('.tile');

        await captureState(page, 'mobile-alpha-initial', step++);
        let info = await getTileInfo(page);
        console.log('Starting order:', info.order);

        // Move A to first position with touch
        console.log('\n1️⃣ Moving A to start (touch)');
        await page.locator('.tile').filter({ hasText: 'A' }).first()
            .dragTo(page.locator('.tile').first());
        await page.waitForTimeout(300);
        await captureState(page, 'mobile-alpha-after-A', step++);
        info = await getTileInfo(page);
        console.log('  Order:', info.order);
        console.log('  All square?', info.tiles.every(t => t.isSquare));

        // Test landscape orientation
        console.log('\n📱 Testing landscape mode');
        await page.setViewportSize({ width: 812, height: 375 });
        await page.waitForTimeout(500);
        await captureState(page, 'mobile-landscape', step++);

        info = await getTileInfo(page);
        console.log('  Landscape - all square?', info.tiles.every(t => t.isSquare));
        console.log('  Landscape - within rack?', info.tiles.every(t => t.withinRack));

        // Back to portrait
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(500);

        console.log('\n✅ Mobile Validation Complete');
        info = await getTileInfo(page);

        console.log('Final checks:');
        console.log('  All tiles square?', info.tiles.every(t => t.isSquare));
        console.log('  All tiles within rack?', info.tiles.every(t => t.withinRack));
        console.log('  Touch drag works?', info.order !== 'SCRABBLE');

        expect(info.tiles.every(t => t.isSquare)).toBeTruthy();
        expect(info.tiles.every(t => t.withinRack)).toBeTruthy();
    });
});