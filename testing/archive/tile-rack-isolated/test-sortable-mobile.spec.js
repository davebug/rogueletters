const { test, expect, devices } = require('@playwright/test');
const path = require('path');

// Use iPhone configuration
test.use({
    ...devices['iPhone 12'],
    hasTouch: true
});

// Test configuration
const TEST_URL = 'http://localhost:8086/sortable-tiles.html';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'sortable-tests');
const INITIAL_TILES = ['S', 'C', 'R', 'A', 'B', 'B', 'L', 'E'];

// Helper function to take labeled screenshots
async function takeScreenshot(page, name, step) {
    const timestamp = Date.now();
    const filename = `${step.toString().padStart(3, '0')}-${name}-${timestamp}.png`;
    await page.screenshot({
        path: path.join(SCREENSHOT_DIR, filename),
        fullPage: false
    });
    console.log(`📸 Screenshot: ${filename}`);
}

// Helper to get tile positions
async function getTileOrder(page) {
    return await page.evaluate(() => window.getTileOrder());
}

// Helper to wait and take screenshot
async function waitAndCapture(page, name, step, delay = 300) {
    await page.waitForTimeout(delay);
    await takeScreenshot(page, name, step);
}

test.describe('SortableJS Mobile Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(TEST_URL);
        await page.waitForSelector('[data-testid="tile-rack"]');
        console.log('✅ Mobile page loaded');
    });

    test('Mobile: Basic touch drag', async ({ page }) => {
        console.log('\n📱 Mobile Basic Touch Test\n');
        let step = 100;

        // Initial mobile view
        await waitAndCapture(page, 'mobile-1-initial', step++);
        const initialOrder = await getTileOrder(page);
        console.log('Initial:', initialOrder.join(' '));

        // Touch drag first tile to last
        const firstTile = await page.locator('.tile').first();
        const lastTile = await page.locator('.tile').last();

        // Tap to show interaction
        const firstBox = await firstTile.boundingBox();
        await page.tap(`[data-testid^="tile-S"]`);
        await waitAndCapture(page, 'mobile-2-tapped', step++);

        // Drag using touch simulation
        await firstTile.dragTo(lastTile);
        await waitAndCapture(page, 'mobile-3-after-drag', step++);

        const newOrder = await getTileOrder(page);
        console.log('After drag:', newOrder.join(' '));
        expect(newOrder[newOrder.length - 1]).toBe('S');
    });

    test('Mobile: Realistic finger drag simulation', async ({ page }) => {
        console.log('\n📱 Mobile Finger Simulation\n');
        let step = 110;

        await waitAndCapture(page, 'mobile-finger-1-initial', step++);

        const firstTile = await page.locator('.tile').first();
        const lastTile = await page.locator('.tile').last();
        const firstBox = await firstTile.boundingBox();
        const lastBox = await lastTile.boundingBox();

        const startX = firstBox.x + firstBox.width / 2;
        const startY = firstBox.y + firstBox.height / 2;
        const endX = lastBox.x + lastBox.width + 10;
        const endY = lastBox.y + lastBox.height / 2;

        // Touch down
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await waitAndCapture(page, 'mobile-finger-2-touch-down', step++);

        // Simulate finger drag with natural movement
        const dragSteps = [
            { x: startX + 20, y: startY },
            { x: startX + 50, y: startY - 5 },
            { x: startX + 100, y: startY },
            { x: startX + 150, y: startY + 3 },
            { x: endX, y: endY }
        ];

        for (let i = 0; i < dragSteps.length; i++) {
            await page.mouse.move(dragSteps[i].x, dragSteps[i].y);
            if (i === 2 || i === 4) {
                await waitAndCapture(page, `mobile-finger-3-drag-${i}`, step++);
            }
            await page.waitForTimeout(50);
        }

        // Release
        await page.mouse.up();
        await waitAndCapture(page, 'mobile-finger-4-released', step++);

        const order = await getTileOrder(page);
        console.log('After finger drag:', order.join(' '));
    });

    test('Mobile: Multiple touch interactions', async ({ page }) => {
        console.log('\n📱 Mobile Multiple Touch\n');
        let step = 120;

        await waitAndCapture(page, 'mobile-multi-1-initial', step++);

        // Touch interaction 1
        const tileC = await page.locator('[data-testid^="tile-C"]').first();
        const firstPos = await page.locator('.tile').first();
        await tileC.dragTo(firstPos);
        await waitAndCapture(page, 'mobile-multi-2-C-moved', step++);

        // Touch interaction 2
        const tileR = await page.locator('[data-testid^="tile-R"]').first();
        const lastPos = await page.locator('.tile').last();
        await tileR.dragTo(lastPos);
        await waitAndCapture(page, 'mobile-multi-3-R-moved', step++);

        // Touch interaction 3
        const tiles = await page.locator('.tile').all();
        if (tiles.length > 2) {
            await tiles[Math.floor(tiles.length / 2)].dragTo(tiles[0]);
            await waitAndCapture(page, 'mobile-multi-4-middle-moved', step++);
        }

        const finalOrder = await getTileOrder(page);
        console.log('Final order:', finalOrder.join(' '));
    });

    test('Mobile: Swipe gestures', async ({ page }) => {
        console.log('\n📱 Mobile Swipe Test\n');
        let step = 130;

        await waitAndCapture(page, 'mobile-swipe-1-initial', step++);

        const tile = await page.locator('.tile').nth(2);
        const box = await tile.boundingBox();

        // Quick swipe left
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x - 100, box.y + box.height / 2, { steps: 3 });
        await page.mouse.up();
        await waitAndCapture(page, 'mobile-swipe-2-left', step++);

        // Quick swipe right
        const tile2 = await page.locator('.tile').nth(1);
        const box2 = await tile2.boundingBox();
        await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
        await page.mouse.down();
        await page.mouse.move(box2.x + 150, box2.y + box2.height / 2, { steps: 3 });
        await page.mouse.up();
        await waitAndCapture(page, 'mobile-swipe-3-right', step++);

        console.log('✅ Swipe gestures tested');
    });

    test('Mobile: Button taps', async ({ page }) => {
        console.log('\n📱 Mobile Button Taps\n');
        let step = 140;

        await waitAndCapture(page, 'mobile-btn-1-initial', step++);

        // Tap shuffle
        await page.tap('[data-testid="shuffle-btn"]');
        await page.waitForTimeout(300);
        await waitAndCapture(page, 'mobile-btn-2-shuffled', step++);

        // Tap add
        await page.tap('[data-testid="add-tile-btn"]');
        await page.waitForTimeout(300);
        await waitAndCapture(page, 'mobile-btn-3-added', step++);

        // Drag new tile
        const tiles = await page.locator('.tile').all();
        await tiles[tiles.length - 1].dragTo(tiles[0]);
        await waitAndCapture(page, 'mobile-btn-4-new-tile-moved', step++);

        // Tap remove
        await page.tap('[data-testid="remove-tile-btn"]');
        await page.waitForTimeout(300);
        await waitAndCapture(page, 'mobile-btn-5-removed', step++);

        // Tap reset
        await page.tap('[data-testid="reset-btn"]');
        await page.waitForTimeout(300);
        await waitAndCapture(page, 'mobile-btn-6-reset', step++);

        const finalOrder = await getTileOrder(page);
        expect(finalOrder).toEqual(INITIAL_TILES);
        console.log('✅ Button taps successful');
    });

    test('Mobile: Portrait vs Landscape', async ({ page }) => {
        console.log('\n📱 Mobile Orientation Test\n');
        let step = 150;

        // Portrait
        await page.setViewportSize({ width: 375, height: 812 });
        await waitAndCapture(page, 'mobile-orient-1-portrait', step++);

        // Drag in portrait
        const tilesPortrait = await page.locator('.tile').all();
        await tilesPortrait[0].dragTo(tilesPortrait[2]);
        await waitAndCapture(page, 'mobile-orient-2-portrait-drag', step++);

        // Landscape
        await page.setViewportSize({ width: 812, height: 375 });
        await page.waitForTimeout(500); // Wait for reflow
        await waitAndCapture(page, 'mobile-orient-3-landscape', step++);

        // Drag in landscape
        const tilesLandscape = await page.locator('.tile').all();
        await tilesLandscape[1].dragTo(tilesLandscape[3]);
        await waitAndCapture(page, 'mobile-orient-4-landscape-drag', step++);

        // Back to portrait
        await page.setViewportSize({ width: 375, height: 812 });
        await page.waitForTimeout(500);
        await waitAndCapture(page, 'mobile-orient-5-back-portrait', step++);

        console.log('✅ Orientation changes tested');
    });

    test('Mobile: Rapid taps and drags', async ({ page }) => {
        console.log('\n📱 Mobile Rapid Interaction\n');
        let step = 160;

        await waitAndCapture(page, 'mobile-rapid-1-initial', step++);

        // Rapid taps
        for (let i = 0; i < 3; i++) {
            await page.tap(`[data-testid^="tile-"]`);
            await page.waitForTimeout(50);
        }
        await waitAndCapture(page, 'mobile-rapid-2-after-taps', step++);

        // Rapid drags
        for (let i = 0; i < 3; i++) {
            const tiles = await page.locator('.tile').all();
            if (tiles.length > 1) {
                await tiles[0].dragTo(tiles[tiles.length - 1], {
                    force: true,
                    timeout: 1000
                });
                await page.waitForTimeout(100);
                await takeScreenshot(page, `mobile-rapid-3-drag-${i}`, step++);
            }
        }

        console.log('✅ Rapid interactions tested');
    });
});