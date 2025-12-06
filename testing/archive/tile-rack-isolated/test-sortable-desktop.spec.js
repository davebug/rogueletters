const { test, expect } = require('@playwright/test');
const path = require('path');

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

test.describe('SortableJS Desktop Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(TEST_URL);
        await page.waitForSelector('[data-testid="tile-rack"]');
        console.log('✅ Page loaded');
    });

    test('Desktop: Basic drag and drop', async ({ page }) => {
        console.log('\n🖥️  Desktop Basic Drag Test\n');
        let step = 1;

        // Initial state
        await waitAndCapture(page, 'desktop-1-initial', step++);
        const initialOrder = await getTileOrder(page);
        console.log('Initial:', initialOrder.join(' '));
        expect(initialOrder).toEqual(INITIAL_TILES);

        // Drag first tile (S) to end
        const firstTile = await page.locator('.tile').first();
        const lastTile = await page.locator('.tile').last();

        // Hover effect
        await firstTile.hover();
        await waitAndCapture(page, 'desktop-2-hover', step++);

        // Drag to end
        await firstTile.dragTo(lastTile, {
            targetPosition: { x: 40, y: 25 }
        });
        await waitAndCapture(page, 'desktop-3-after-drag', step++);

        const newOrder = await getTileOrder(page);
        console.log('After drag:', newOrder.join(' '));
        expect(newOrder[newOrder.length - 1]).toBe('S');
    });

    test('Desktop: Multiple sequential drags', async ({ page }) => {
        console.log('\n🖥️  Desktop Sequential Drags\n');
        let step = 10;

        await waitAndCapture(page, 'desktop-seq-1-initial', step++);

        // Drag 1: Move C to beginning
        const tileC = await page.locator('[data-testid^="tile-C"]').first();
        const firstPos = await page.locator('.tile').first();
        await tileC.dragTo(firstPos);
        await waitAndCapture(page, 'desktop-seq-2-C-moved', step++);

        // Drag 2: Move R to end
        const tileR = await page.locator('[data-testid^="tile-R"]').first();
        const lastPos = await page.locator('.tile').last();
        await tileR.dragTo(lastPos);
        await waitAndCapture(page, 'desktop-seq-3-R-moved', step++);

        // Drag 3: Move middle tile
        const tiles = await page.locator('.tile').all();
        if (tiles.length > 2) {
            const middle = Math.floor(tiles.length / 2);
            await tiles[middle].dragTo(tiles[0]);
            await waitAndCapture(page, 'desktop-seq-4-middle-moved', step++);
        }

        const finalOrder = await getTileOrder(page);
        console.log('Final order:', finalOrder.join(' '));
    });

    test('Desktop: Drag with precise mouse movements', async ({ page }) => {
        console.log('\n🖥️  Desktop Precise Mouse Test\n');
        let step = 20;

        await waitAndCapture(page, 'desktop-precise-1-initial', step++);

        const firstTile = await page.locator('.tile').first();
        const lastTile = await page.locator('.tile').last();

        const startBox = await firstTile.boundingBox();
        const endBox = await lastTile.boundingBox();

        // Manual mouse control for realistic drag
        const startX = startBox.x + startBox.width / 2;
        const startY = startBox.y + startBox.height / 2;
        const endX = endBox.x + endBox.width + 20;
        const endY = endBox.y + endBox.height / 2;

        // Move to start position
        await page.mouse.move(startX, startY);
        await waitAndCapture(page, 'desktop-precise-2-mouse-positioned', step++);

        // Press mouse button
        await page.mouse.down();
        await waitAndCapture(page, 'desktop-precise-3-mouse-down', step++);

        // Drag in steps (simulating real movement)
        const steps = 5;
        for (let i = 1; i <= steps; i++) {
            const progress = i / steps;
            const x = startX + (endX - startX) * progress;
            const y = startY + (endY - startY) * progress;
            await page.mouse.move(x, y);

            if (i === 1 || i === 3 || i === 5) {
                await waitAndCapture(page, `desktop-precise-4-drag-step-${i}`, step++);
            }
        }

        // Release
        await page.mouse.up();
        await waitAndCapture(page, 'desktop-precise-5-released', step++);

        const order = await getTileOrder(page);
        console.log('After precise drag:', order.join(' '));
    });

    test('Desktop: Rapid consecutive movements', async ({ page }) => {
        console.log('\n🖥️  Desktop Rapid Movement Test\n');
        let step = 30;

        await waitAndCapture(page, 'desktop-rapid-1-initial', step++);

        // Perform 5 rapid drags
        for (let i = 0; i < 5; i++) {
            const tiles = await page.locator('.tile').all();
            if (tiles.length > 1) {
                // Always move first to last
                await tiles[0].dragTo(tiles[tiles.length - 1], {
                    force: true,
                    timeout: 1000
                });
                await page.waitForTimeout(100); // Brief pause
                await takeScreenshot(page, `desktop-rapid-2-move-${i + 1}`, step++);
            }
        }

        const finalOrder = await getTileOrder(page);
        console.log('After rapid moves:', finalOrder.join(' '));
    });

    test('Desktop: Button interactions with drag', async ({ page }) => {
        console.log('\n🖥️  Desktop Buttons Test\n');
        let step = 40;

        // Initial state
        await waitAndCapture(page, 'desktop-btn-1-initial', step++);

        // Drag a tile
        const tiles = await page.locator('.tile').all();
        await tiles[0].dragTo(tiles[2]);
        await waitAndCapture(page, 'desktop-btn-2-after-drag', step++);

        // Shuffle
        await page.click('[data-testid="shuffle-btn"]');
        await page.waitForTimeout(200);
        await waitAndCapture(page, 'desktop-btn-3-shuffled', step++);

        // Add tile
        await page.click('[data-testid="add-tile-btn"]');
        await page.waitForTimeout(200);
        await waitAndCapture(page, 'desktop-btn-4-tile-added', step++);

        // Drag new tile
        const newTiles = await page.locator('.tile').all();
        await newTiles[newTiles.length - 1].dragTo(newTiles[0]);
        await waitAndCapture(page, 'desktop-btn-5-new-tile-moved', step++);

        // Remove tile
        await page.click('[data-testid="remove-tile-btn"]');
        await page.waitForTimeout(200);
        await waitAndCapture(page, 'desktop-btn-6-tile-removed', step++);

        // Reset
        await page.click('[data-testid="reset-btn"]');
        await page.waitForTimeout(200);
        await waitAndCapture(page, 'desktop-btn-7-reset', step++);

        const finalOrder = await getTileOrder(page);
        expect(finalOrder).toEqual(INITIAL_TILES);
        console.log('✅ Reset successful');
    });

    test('Desktop: Edge cases', async ({ page }) => {
        console.log('\n🖥️  Desktop Edge Cases\n');
        let step = 50;

        // Drag outside container
        const tile = await page.locator('.tile').first();
        const box = await tile.boundingBox();

        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(50, 50); // Far outside
        await waitAndCapture(page, 'desktop-edge-1-outside', step++);
        await page.mouse.up();

        // Very fast drag
        const firstTile = await page.locator('.tile').first();
        const lastTile = await page.locator('.tile').last();
        const startBox = await firstTile.boundingBox();
        const endBox = await lastTile.boundingBox();

        await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(endBox.x + endBox.width, endBox.y + endBox.height / 2, { steps: 1 });
        await page.mouse.up();
        await waitAndCapture(page, 'desktop-edge-2-fast-drag', step++);

        console.log('✅ Edge cases tested');
    });
});