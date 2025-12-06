const { test, expect, devices } = require('@playwright/test');
const path = require('path');

// Test configuration
const TEST_URL = 'http://localhost:8086/sortable-tiles.html';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'sortable-tests');

// Helper function to take labeled screenshots
async function takeScreenshot(page, name, step) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${step.toString().padStart(2, '0')}-${name}-${timestamp}.png`;
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

// Helper to get tile visual positions
async function getTilePositions(page) {
    return await page.evaluate(() => window.getTilePositions());
}

// Helper to wait and take screenshot
async function waitAndCapture(page, name, step, delay = 500) {
    await page.waitForTimeout(delay);
    await takeScreenshot(page, name, step);
}

test.describe('SortableJS Tile Rack - Desktop', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(TEST_URL);
        await page.waitForSelector('[data-testid="tile-rack"]');
    });

    test('Desktop: Complete drag and drop interaction flow', async ({ page }) => {
        console.log('\n🖥️  Starting Desktop Drag & Drop Test\n');
        let step = 1;

        // Initial state
        await waitAndCapture(page, 'desktop-initial', step++);
        const initialOrder = await getTileOrder(page);
        console.log('Initial order:', initialOrder.join(', '));

        // Test 1: Drag first tile to last position
        console.log('\n📍 Test 1: Drag S to end');
        const firstTile = await page.locator('[data-testid^="tile-S"]').first();
        const lastTile = await page.locator('[data-testid^="tile-E"]').first();

        // Hover over tile before dragging
        await firstTile.hover();
        await waitAndCapture(page, 'desktop-hover-S', step++);

        // Start dragging
        await firstTile.hover();
        await page.mouse.down();
        await waitAndCapture(page, 'desktop-drag-start', step++);

        // Move halfway
        const firstBox = await firstTile.boundingBox();
        const lastBox = await lastTile.boundingBox();
        await page.mouse.move(
            firstBox.x + (lastBox.x - firstBox.x) / 2,
            firstBox.y + firstBox.height / 2
        );
        await waitAndCapture(page, 'desktop-drag-midway', step++);

        // Move to final position
        await page.mouse.move(lastBox.x + lastBox.width + 10, lastBox.y + lastBox.height / 2);
        await waitAndCapture(page, 'desktop-drag-over-target', step++);

        // Drop
        await page.mouse.up();
        await waitAndCapture(page, 'desktop-after-drop', step++);

        const orderAfterFirst = await getTileOrder(page);
        console.log('After moving S to end:', orderAfterFirst.join(', '));

        // Test 2: Drag middle tile to beginning
        console.log('\n📍 Test 2: Drag A to beginning');
        const middleTile = await page.locator('[data-testid^="tile-A"]').first();
        const newFirstTile = await page.locator('.tile').first();

        await middleTile.hover();
        await waitAndCapture(page, 'desktop-hover-A', step++);

        await middleTile.dragTo(newFirstTile, {
            force: true,
            targetPosition: { x: 5, y: 20 }
        });
        await waitAndCapture(page, 'desktop-after-A-move', step++);

        const orderAfterSecond = await getTileOrder(page);
        console.log('After moving A to start:', orderAfterSecond.join(', '));

        // Test 3: Rapid successive drags
        console.log('\n📍 Test 3: Rapid tile movements');

        for (let i = 0; i < 3; i++) {
            const tiles = await page.locator('.tile').all();
            if (tiles.length > 1) {
                await tiles[0].dragTo(tiles[tiles.length - 1]);
                await page.waitForTimeout(200);
                await takeScreenshot(page, `desktop-rapid-drag-${i + 1}`, step++);
            }
        }

        // Test 4: Button interactions
        console.log('\n📍 Test 4: Button controls');

        // Shuffle
        await page.click('[data-testid="shuffle-btn"]');
        await waitAndCapture(page, 'desktop-after-shuffle', step++);

        // Add tile
        await page.click('[data-testid="add-tile-btn"]');
        await waitAndCapture(page, 'desktop-after-add', step++);

        // Remove tile
        await page.click('[data-testid="remove-tile-btn"]');
        await waitAndCapture(page, 'desktop-after-remove', step++);

        // Reset
        await page.click('[data-testid="reset-btn"]');
        await waitAndCapture(page, 'desktop-after-reset', step++);

        // Final verification
        const finalOrder = await getTileOrder(page);
        expect(finalOrder).toEqual(INITIAL_TILES);
        console.log('✅ Desktop test completed successfully');
    });

    test('Desktop: Edge cases and stress test', async ({ page }) => {
        console.log('\n🖥️  Starting Desktop Edge Cases Test\n');
        let step = 50;

        // Test dragging outside bounds
        console.log('📍 Testing drag outside container');
        const tile = await page.locator('.tile').first();

        await tile.hover();
        await page.mouse.down();
        await page.mouse.move(100, 100); // Move outside rack
        await waitAndCapture(page, 'desktop-drag-outside', step++);
        await page.mouse.up();

        // Test very fast drag
        console.log('📍 Testing fast drag');
        const tiles = await page.locator('.tile').all();
        if (tiles.length > 2) {
            const start = await tiles[0].boundingBox();
            const end = await tiles[2].boundingBox();

            await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
            await page.mouse.down();
            await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 2 });
            await page.mouse.up();
            await waitAndCapture(page, 'desktop-fast-drag', step++);
        }
    });
});

test.describe('SortableJS Tile Rack - Mobile', () => {
    test.use({
        ...devices['iPhone 12'],
        hasTouch: true
    });

    test('Mobile: Complete touch interaction flow', async ({ page }) => {
        console.log('\n📱 Starting Mobile Touch Test\n');
        let step = 100;

        await page.goto(TEST_URL);
        await page.waitForSelector('[data-testid="tile-rack"]');

        // Initial mobile state
        await waitAndCapture(page, 'mobile-initial', step++);
        const initialOrder = await getTileOrder(page);
        console.log('Initial order:', initialOrder.join(', '));

        // Test 1: Touch drag first tile to last
        console.log('\n📍 Test 1: Touch drag S to end');
        const firstTile = await page.locator('[data-testid^="tile-S"]').first();
        const lastTile = await page.locator('[data-testid^="tile-E"]').first();

        const firstBox = await firstTile.boundingBox();
        const lastBox = await lastTile.boundingBox();

        // Touch and hold
        await page.touchscreen.tap(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
        await waitAndCapture(page, 'mobile-touch-S', step++);

        // Simulate touch drag with multiple steps for realism
        const startX = firstBox.x + firstBox.width / 2;
        const startY = firstBox.y + firstBox.height / 2;
        const endX = lastBox.x + lastBox.width + 10;
        const endY = lastBox.y + lastBox.height / 2;

        // Touch down
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await waitAndCapture(page, 'mobile-touch-start', step++);

        // Drag in steps (simulating finger movement)
        const steps = 5;
        for (let i = 1; i <= steps; i++) {
            const x = startX + ((endX - startX) / steps) * i;
            const y = startY + ((endY - startY) / steps) * i;
            await page.mouse.move(x, y);

            if (i === Math.floor(steps / 2)) {
                await waitAndCapture(page, 'mobile-drag-midway', step++);
            }
        }

        await waitAndCapture(page, 'mobile-drag-end-position', step++);

        // Release
        await page.mouse.up();
        await waitAndCapture(page, 'mobile-after-release', step++);

        const orderAfterFirst = await getTileOrder(page);
        console.log('After touch drag S to end:', orderAfterFirst.join(', '));

        // Test 2: Quick tap and drag
        console.log('\n📍 Test 2: Quick tap and drag');
        const middleTile = await page.locator('[data-testid^="tile-A"]').first();
        const targetTile = await page.locator('.tile').first();

        // Use Playwright's dragTo for touch
        await middleTile.dragTo(targetTile);
        await waitAndCapture(page, 'mobile-after-quick-drag', step++);

        // Test 3: Pinch/zoom gesture area (test touch handling)
        console.log('\n📍 Test 3: Testing touch responsiveness');

        // Multiple rapid taps
        const tile = await page.locator('.tile').nth(2);
        const box = await tile.boundingBox();

        for (let i = 0; i < 3; i++) {
            await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
            await page.waitForTimeout(100);
        }
        await waitAndCapture(page, 'mobile-after-taps', step++);

        // Test 4: Swipe gesture
        console.log('\n📍 Test 4: Swipe gesture');
        const swipeTile = await page.locator('.tile').first();
        const swipeBox = await swipeTile.boundingBox();

        // Simulate swipe
        await page.mouse.move(swipeBox.x + 10, swipeBox.y + swipeBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(swipeBox.x + 200, swipeBox.y + swipeBox.height / 2, { steps: 3 });
        await page.mouse.up();
        await waitAndCapture(page, 'mobile-after-swipe', step++);

        // Test 5: Button interactions on mobile
        console.log('\n📍 Test 5: Mobile button interactions');

        await page.tap('[data-testid="shuffle-btn"]');
        await waitAndCapture(page, 'mobile-after-shuffle', step++);

        await page.tap('[data-testid="add-tile-btn"]');
        await waitAndCapture(page, 'mobile-after-add', step++);

        await page.tap('[data-testid="reset-btn"]');
        await waitAndCapture(page, 'mobile-after-reset', step++);

        console.log('✅ Mobile test completed successfully');
    });

    test('Mobile: Portrait vs Landscape', async ({ page }) => {
        console.log('\n📱 Testing orientation changes\n');
        let step = 200;

        await page.goto(TEST_URL);
        await page.waitForSelector('[data-testid="tile-rack"]');

        // Portrait
        await page.setViewportSize({ width: 375, height: 812 });
        await waitAndCapture(page, 'mobile-portrait', step++);

        // Drag in portrait
        const tiles = await page.locator('.tile').all();
        if (tiles.length > 1) {
            await tiles[0].dragTo(tiles[1]);
            await waitAndCapture(page, 'mobile-portrait-after-drag', step++);
        }

        // Landscape
        await page.setViewportSize({ width: 812, height: 375 });
        await waitAndCapture(page, 'mobile-landscape', step++);

        // Drag in landscape
        const tilesLandscape = await page.locator('.tile').all();
        if (tilesLandscape.length > 1) {
            await tilesLandscape[1].dragTo(tilesLandscape[0]);
            await waitAndCapture(page, 'mobile-landscape-after-drag', step++);
        }
    });
});

test.describe('SortableJS Tile Rack - Tablet', () => {
    test.use({
        ...devices['iPad Pro'],
        hasTouch: true
    });

    test('Tablet: Touch interactions', async ({ page }) => {
        console.log('\n📱 Starting Tablet Test\n');
        let step = 300;

        await page.goto(TEST_URL);
        await page.waitForSelector('[data-testid="tile-rack"]');

        await waitAndCapture(page, 'tablet-initial', step++);

        // Test multi-finger scenarios
        const tiles = await page.locator('.tile').all();

        if (tiles.length > 2) {
            // Drag with larger touch area (tablet simulation)
            const firstBox = await tiles[0].boundingBox();
            const lastBox = await tiles[tiles.length - 1].boundingBox();

            await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
            await page.mouse.down();

            // Slower, more deliberate tablet drag
            for (let i = 0; i <= 10; i++) {
                const progress = i / 10;
                const x = firstBox.x + (lastBox.x - firstBox.x) * progress;
                const y = firstBox.y + (lastBox.y - firstBox.y) * progress;
                await page.mouse.move(x, y);

                if (i === 5) {
                    await waitAndCapture(page, 'tablet-drag-midway', step++);
                }
            }

            await page.mouse.up();
            await waitAndCapture(page, 'tablet-after-drag', step++);
        }

        console.log('✅ Tablet test completed');
    });
});

// Test to verify animations and transitions
test.describe('Visual Regression Tests', () => {
    test('Capture animation frames', async ({ page }) => {
        console.log('\n🎬 Capturing animation frames\n');
        let step = 400;

        await page.goto(TEST_URL);
        await page.waitForSelector('[data-testid="tile-rack"]');

        const tiles = await page.locator('.tile').all();
        if (tiles.length > 1) {
            const firstBox = await tiles[0].boundingBox();
            const lastBox = await tiles[1].boundingBox();

            // Start drag
            await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
            await page.mouse.down();

            // Capture multiple frames during animation
            const frames = 10;
            for (let i = 0; i <= frames; i++) {
                const progress = i / frames;
                const x = firstBox.x + (lastBox.x - firstBox.x) * progress;
                await page.mouse.move(x, firstBox.y + firstBox.height / 2);
                await page.screenshot({
                    path: path.join(SCREENSHOT_DIR, `animation-frame-${i.toString().padStart(2, '0')}.png`),
                    fullPage: false
                });
                await page.waitForTimeout(15); // ~60fps capture
            }

            await page.mouse.up();
        }

        console.log('✅ Animation frames captured');
    });
});

// Don't forget the initial tiles constant
const INITIAL_TILES = ['S', 'C', 'R', 'A', 'B', 'B', 'L', 'E'];