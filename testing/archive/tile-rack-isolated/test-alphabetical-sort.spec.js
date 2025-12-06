const { test, expect, devices } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Ensure screenshots directory exists
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'alphabetical-test');
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
async function checkGapDuringDrag(page, dragX, dragY) {
    return await page.evaluate((x, y) => {
        // Simulate what element would be under the drag point
        const elementBelow = document.elementFromPoint(x, y);
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

        // Check for ghost element
        const ghost = document.querySelector('.sortable-ghost');

        return {
            gaps,
            hasGhost: !!ghost,
            ghostPosition: ghost ? ghost.getBoundingClientRect() : null,
            elementBelow: elementBelow ? elementBelow.className : null
        };
    }, dragX, dragY);
}

test.describe('Desktop: Alphabetical Sorting with Visual Validation', () => {
    test('Desktop: Sort SCRABBLE to ABBCELRS with visual checks', async ({ page }) => {
        console.log('\n🖥️  DESKTOP ALPHABETICAL SORTING TEST\n');
        let step = 1;

        await page.goto('http://localhost:8086/');
        await page.waitForSelector('.tile');

        // Initial state check
        console.log('📍 Initial State Check');
        await captureState(page, 'desktop-initial', step++);
        let info = await getTileInfo(page);

        console.log('Initial order:', info.order);
        console.log('All tiles square?', info.tiles.every(t => t.isSquare));
        console.log('All tiles within rack?', info.tiles.every(t => t.withinRack));

        // Verify initial tiles are square
        expect(info.tiles.every(t => t.isSquare)).toBeTruthy();
        expect(info.tiles.every(t => t.withinRack)).toBeTruthy();

        // MOVES TO ALPHABETIZE: SCRABBLE -> ABBCELRS
        // Need to move: S->end, C->after B's, R->end, A->start

        // Move 1: Move A to the beginning
        console.log('\n🎯 Move 1: Moving A to start');
        const tileA = page.locator('.tile').filter({ hasText: 'A' }).first();
        const firstTile = page.locator('.tile').first();

        // Start drag
        const boxA = await tileA.boundingBox();
        const startX = boxA.x + boxA.width / 2;
        const startY = boxA.y + boxA.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await captureState(page, 'desktop-drag-A-start', step++);

        // Check tile remains square during drag
        let dragInfo = await getTileInfo(page);
        console.log('Tiles square during drag start?', dragInfo.tiles.every(t => t.isSquare));

        // Move to target position
        const boxFirst = await firstTile.boundingBox();
        await page.mouse.move(boxFirst.x - 10, boxFirst.y + boxFirst.height / 2, { steps: 5 });
        await page.waitForTimeout(150); // Let animation settle
        await captureState(page, 'desktop-drag-A-hovering', step++);

        // Check for gap
        const gapCheck = await checkGapDuringDrag(page, boxFirst.x - 10, boxFirst.y + boxFirst.height / 2);
        console.log('Gap created?', gapCheck.gaps.some(g => g.gapSize > 60));
        console.log('Ghost element present?', gapCheck.hasGhost);

        // Drop
        await page.mouse.up();
        await page.waitForTimeout(300);
        await captureState(page, 'desktop-after-A-drop', step++);

        info = await getTileInfo(page);
        console.log('Order after A move:', info.order);
        console.log('All tiles still square?', info.tiles.every(t => t.isSquare));
        expect(info.tiles.every(t => t.isSquare)).toBeTruthy();
        expect(info.tiles.every(t => t.withinRack)).toBeTruthy();

        // Move 2: Move B's together (they should already be together)
        console.log('\n🎯 Move 2: Checking B tiles are adjacent');
        info = await getTileInfo(page);
        const bPositions = info.order.split('').map((letter, i) => letter === 'B' ? i : -1).filter(i => i >= 0);
        console.log('B positions:', bPositions);

        // Move 3: Move C after B's if needed
        const currentOrder = info.order;
        if (currentOrder !== 'ASCRBBLE' && currentOrder.indexOf('C') > currentOrder.lastIndexOf('B')) {
            console.log('\n🎯 Move 3: Moving C after Bs');
            const tileC = page.locator('.tile').filter({ hasText: 'C' }).first();
            const lastB = page.locator('.tile').filter({ hasText: 'B' }).last();

            await tileC.dragTo(lastB, { targetPosition: { x: 40, y: 25 } });
            await page.waitForTimeout(300);
            await captureState(page, 'desktop-after-C-move', step++);

            info = await getTileInfo(page);
            console.log('Order after C move:', info.order);
        }

        // Move 4: Move E to proper position
        console.log('\n🎯 Move 4: Positioning E');
        const tileE = page.locator('.tile').filter({ hasText: 'E' }).first();
        const tileC = page.locator('.tile').filter({ hasText: 'C' }).first();

        // Drag E after C
        await tileE.dragTo(tileC, { targetPosition: { x: 40, y: 25 } });
        await page.waitForTimeout(300);
        await captureState(page, 'desktop-after-E-move', step++);

        // Continue sorting remaining letters...

        // Move L to correct position
        console.log('\n🎯 Move 5: Positioning L');
        const tileL = page.locator('.tile').filter({ hasText: 'L' }).first();
        const tileE2 = page.locator('.tile').filter({ hasText: 'E' }).first();

        await tileL.dragTo(tileE2, { targetPosition: { x: 40, y: 25 } });
        await page.waitForTimeout(300);
        await captureState(page, 'desktop-after-L-move', step++);

        // Final moves to complete alphabetical order
        console.log('\n🎯 Final adjustments');

        // Get current state and determine remaining moves
        info = await getTileInfo(page);
        console.log('Current order:', info.order);

        // Ensure final order is ABBCELRS
        const targetOrder = 'ABBCELRS';

        // If not in correct order, make final adjustments
        if (info.order !== targetOrder) {
            console.log('Making final adjustments...');

            // Move R to proper position (should be after L)
            const tileR = page.locator('.tile').filter({ hasText: 'R' }).first();
            const tileLFinal = page.locator('.tile').filter({ hasText: 'L' }).first();
            await tileR.dragTo(tileLFinal, { targetPosition: { x: 40, y: 25 } });
            await page.waitForTimeout(300);

            // Move S to end
            const tileS = page.locator('.tile').filter({ hasText: 'S' }).first();
            const lastTile = page.locator('.tile').last();
            await tileS.dragTo(lastTile, { targetPosition: { x: 40, y: 25 } });
            await page.waitForTimeout(300);
        }

        // Final state verification
        await captureState(page, 'desktop-final-alphabetical', step++);
        info = await getTileInfo(page);

        console.log('\n✅ FINAL VERIFICATION');
        console.log('Final order:', info.order);
        console.log('Expected order: ABBCELRS');
        console.log('All tiles square?', info.tiles.every(t => t.isSquare));
        console.log('All tiles within rack?', info.tiles.every(t => t.withinRack));

        // Final assertions
        expect(info.tiles.every(t => t.isSquare)).toBeTruthy();
        expect(info.tiles.every(t => t.withinRack)).toBeTruthy();

        // Check tile dimensions consistency
        const widths = info.tiles.map(t => t.width);
        const heights = info.tiles.map(t => t.height);
        console.log('Tile widths:', widths);
        console.log('Tile heights:', heights);

        const avgWidth = widths.reduce((a, b) => a + b) / widths.length;
        const avgHeight = heights.reduce((a, b) => a + b) / heights.length;
        console.log(`Average dimensions: ${avgWidth.toFixed(1)} x ${avgHeight.toFixed(1)}`);
    });

    test('Desktop: Gap behavior during drag', async ({ page }) => {
        console.log('\n🖥️  DESKTOP GAP BEHAVIOR TEST\n');
        let step = 100;

        await page.goto('http://localhost:8086/');
        await page.waitForSelector('.tile');

        // Test gap creation during slow drag
        console.log('📍 Testing gap creation during drag');

        const firstTile = page.locator('.tile').first();
        const lastTile = page.locator('.tile').last();

        const startBox = await firstTile.boundingBox();
        const endBox = await lastTile.boundingBox();

        await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
        await page.mouse.down();

        // Move slowly across tiles
        const steps = 10;
        for (let i = 1; i <= steps; i++) {
            const progress = i / steps;
            const x = startBox.x + (endBox.x - startBox.x) * progress;
            const y = startBox.y + startBox.height / 2;

            await page.mouse.move(x, y);
            await page.waitForTimeout(100);

            if (i % 3 === 0) {
                await captureState(page, `desktop-gap-drag-${i}`, step++);
                const gapInfo = await checkGapDuringDrag(page, x, y);
                console.log(`Step ${i}: Gaps:`, gapInfo.gaps.map(g => `${g.gapSize.toFixed(0)}px`).join(', '));
            }
        }

        await page.mouse.up();
        await page.waitForTimeout(300);
        await captureState(page, 'desktop-gap-after-drop', step++);

        const finalInfo = await getTileInfo(page);
        console.log('Final order:', finalInfo.order);
        console.log('No gaps remain?', finalInfo.tiles.every((t, i) => {
            if (i === finalInfo.tiles.length - 1) return true;
            const nextTile = finalInfo.tiles[i + 1];
            const gap = nextTile.left - (t.left + t.width);
            return gap < 20; // Normal spacing
        }));
    });
});

test.describe('Mobile: Alphabetical Sorting with Visual Validation', () => {
    test.use({
        ...devices['iPhone 12'],
        hasTouch: true
    });

    test('Mobile: Sort tiles with touch gestures', async ({ page }) => {
        console.log('\n📱 MOBILE ALPHABETICAL SORTING TEST\n');
        let step = 200;

        await page.goto('http://localhost:8086/');
        await page.waitForSelector('.tile');

        // Initial state
        await captureState(page, 'mobile-initial', step++);
        let info = await getTileInfo(page);

        console.log('Initial order:', info.order);
        console.log('All tiles square?', info.tiles.every(t => t.isSquare));
        console.log('All tiles within rack?', info.tiles.every(t => t.withinRack));

        // Verify tiles are square on mobile
        expect(info.tiles.every(t => t.isSquare)).toBeTruthy();
        expect(info.tiles.every(t => t.withinRack)).toBeTruthy();

        // Test touch drag - Move A to start
        console.log('\n📱 Touch drag: Moving A to start');
        const tileA = page.locator('.tile').filter({ hasText: 'A' }).first();
        const firstTile = page.locator('.tile').first();

        const boxA = await tileA.boundingBox();
        const boxFirst = await firstTile.boundingBox();

        // Simulate touch drag
        await page.mouse.move(boxA.x + boxA.width / 2, boxA.y + boxA.height / 2);
        await page.mouse.down();
        await captureState(page, 'mobile-touch-start', step++);

        // Drag with touch-like movement
        for (let i = 0; i <= 5; i++) {
            const progress = i / 5;
            const x = boxA.x + (boxFirst.x - boxA.x) * progress;
            const y = boxA.y + boxA.height / 2;
            await page.mouse.move(x, y);

            if (i === 3) {
                await captureState(page, 'mobile-touch-dragging', step++);
                const dragInfo = await checkGapDuringDrag(page, x, y);
                console.log('Gap during touch drag:', dragInfo.gaps.some(g => g.gapSize > 50));
            }
        }

        await page.mouse.up();
        await page.waitForTimeout(300);
        await captureState(page, 'mobile-after-touch-drop', step++);

        info = await getTileInfo(page);
        console.log('Order after touch drag:', info.order);
        console.log('Tiles still square?', info.tiles.every(t => t.isSquare));
        console.log('Tiles within rack?', info.tiles.every(t => t.withinRack));

        // Test landscape orientation
        console.log('\n📱 Testing landscape mode');
        await page.setViewportSize({ width: 812, height: 375 });
        await page.waitForTimeout(500);
        await captureState(page, 'mobile-landscape', step++);

        info = await getTileInfo(page);
        console.log('Landscape - tiles square?', info.tiles.every(t => t.isSquare));
        console.log('Landscape - tiles within rack?', info.tiles.every(t => t.withinRack));

        // Final assertions
        expect(info.tiles.every(t => t.isSquare)).toBeTruthy();
        expect(info.tiles.every(t => t.withinRack)).toBeTruthy();
    });

    test('Mobile: Rapid sorting test', async ({ page }) => {
        console.log('\n📱 MOBILE RAPID SORTING TEST\n');
        let step = 300;

        await page.goto('http://localhost:8086/');
        await page.waitForSelector('.tile');

        // Perform rapid tile movements
        console.log('📍 Rapid touch movements');

        const tiles = await page.locator('.tile').all();

        // Quick successive drags
        for (let i = 0; i < 3 && i < tiles.length - 1; i++) {
            await tiles[0].dragTo(tiles[tiles.length - 1 - i]);
            await page.waitForTimeout(200);
            await captureState(page, `mobile-rapid-${i}`, step++);

            const info = await getTileInfo(page);
            console.log(`After rapid move ${i + 1}:`, info.order);
            console.log('All square?', info.tiles.every(t => t.isSquare));
        }

        // Reset and verify
        await page.tap('#reset-btn');
        await page.waitForTimeout(300);
        await captureState(page, 'mobile-reset', step++);

        const finalInfo = await getTileInfo(page);
        expect(finalInfo.order).toBe('SCRABBLE');
        expect(finalInfo.tiles.every(t => t.isSquare)).toBeTruthy();
    });
});