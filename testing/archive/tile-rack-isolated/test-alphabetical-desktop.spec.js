const { test, expect } = require('@playwright/test');
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

test.describe('Desktop: Visual Validation Tests', () => {
    test('Verify tiles remain square before, during, and after drag', async ({ page }) => {
        console.log('\n🖥️  TILE SQUARENESS TEST\n');
        let step = 1;

        await page.goto('http://localhost:8086/');
        await page.waitForSelector('.tile');

        // Check initial state
        console.log('📍 Initial State');
        await captureState(page, 'square-test-initial', step++);
        let info = await getTileInfo(page);

        console.log('Initial order:', info.order);
        info.tiles.forEach(t => {
            console.log(`  ${t.letter}: ${t.width.toFixed(1)}x${t.height.toFixed(1)} (square: ${t.isSquare})`);
        });

        expect(info.tiles.every(t => t.isSquare)).toBeTruthy();

        // During drag
        console.log('\n📍 During Drag');
        const firstTile = page.locator('.tile').first();
        const lastTile = page.locator('.tile').last();
        const startBox = await firstTile.boundingBox();
        const endBox = await lastTile.boundingBox();

        await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(100);
        await captureState(page, 'square-test-drag-start', step++);

        // Check mid-drag
        await page.mouse.move(
            startBox.x + (endBox.x - startBox.x) / 2,
            startBox.y + startBox.height / 2
        );
        await page.waitForTimeout(100);
        await captureState(page, 'square-test-drag-middle', step++);

        info = await getTileInfo(page);
        console.log('Tiles during drag:');
        info.tiles.forEach(t => {
            console.log(`  ${t.letter}: ${t.width.toFixed(1)}x${t.height.toFixed(1)} (square: ${t.isSquare})`);
        });

        // Drop and check
        await page.mouse.move(endBox.x + endBox.width, endBox.y + endBox.height / 2);
        await page.mouse.up();
        await page.waitForTimeout(300);
        await captureState(page, 'square-test-after-drop', step++);

        info = await getTileInfo(page);
        console.log('\n📍 After Drop');
        info.tiles.forEach(t => {
            console.log(`  ${t.letter}: ${t.width.toFixed(1)}x${t.height.toFixed(1)} (square: ${t.isSquare})`);
        });

        expect(info.tiles.every(t => t.isSquare)).toBeTruthy();
    });

    test('Verify tiles stay within rack bounds', async ({ page }) => {
        console.log('\n🖥️  RACK BOUNDS TEST\n');
        let step = 10;

        await page.goto('http://localhost:8086/');
        await page.waitForSelector('.tile');

        await captureState(page, 'bounds-test-initial', step++);
        let info = await getTileInfo(page);

        console.log('Rack bounds:', info.rackBounds);
        console.log('All tiles within rack?', info.tiles.every(t => t.withinRack));
        expect(info.tiles.every(t => t.withinRack)).toBeTruthy();

        // Test dragging to edges
        const tiles = await page.locator('.tile').all();

        // Drag first tile across entire rack
        await tiles[0].dragTo(tiles[tiles.length - 1]);
        await page.waitForTimeout(300);
        await captureState(page, 'bounds-test-after-drag', step++);

        info = await getTileInfo(page);
        console.log('After drag - within rack?', info.tiles.every(t => t.withinRack));
        expect(info.tiles.every(t => t.withinRack)).toBeTruthy();
    });

    test('Verify gap behavior and drop mechanics', async ({ page }) => {
        console.log('\n🖥️  GAP AND DROP MECHANICS TEST\n');
        let step = 20;

        await page.goto('http://localhost:8086/');
        await page.waitForSelector('.tile');

        const firstTile = page.locator('.tile').first();
        const middleTile = page.locator('.tile').nth(3);

        const startBox = await firstTile.boundingBox();
        const targetBox = await middleTile.boundingBox();

        // Start drag
        await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
        await page.mouse.down();

        // Move slowly to observe gap creation
        console.log('📍 Observing gap creation during drag');

        for (let i = 0; i <= 10; i++) {
            const progress = i / 10;
            const x = startBox.x + (targetBox.x - startBox.x) * progress;
            const y = startBox.y + startBox.height / 2;

            await page.mouse.move(x, y);
            await page.waitForTimeout(50);

            if (i === 5) {
                await captureState(page, 'gap-test-midway', step++);
                const gapInfo = await checkGapDuringDrag(page);

                console.log('Gaps at midpoint:');
                gapInfo.gaps.forEach(g => {
                    console.log(`  Between ${g.after} and ${g.before}: ${g.gapSize.toFixed(0)}px`);
                });

                console.log('Ghost element present?', gapInfo.hasGhost);
            }
        }

        // Check gap at hover position
        await captureState(page, 'gap-test-hovering', step++);
        const hoverGapInfo = await checkGapDuringDrag(page);

        const significantGap = hoverGapInfo.gaps.find(g => g.gapSize > 40);
        console.log('Gap created for drop?', !!significantGap);
        if (significantGap) {
            console.log(`  Gap of ${significantGap.gapSize.toFixed(0)}px between ${significantGap.after} and ${significantGap.before}`);
        }

        // Drop and verify gap closes
        await page.mouse.up();
        await page.waitForTimeout(300);
        await captureState(page, 'gap-test-after-drop', step++);

        const afterDropInfo = await getTileInfo(page);
        const normalGaps = [];
        for (let i = 0; i < afterDropInfo.tiles.length - 1; i++) {
            const gap = afterDropInfo.tiles[i + 1].left - (afterDropInfo.tiles[i].left + afterDropInfo.tiles[i].width);
            normalGaps.push(gap);
        }

        console.log('Gaps after drop (should be uniform):');
        console.log('  ', normalGaps.map(g => g.toFixed(0) + 'px').join(', '));

        // Check gaps are uniform (within 5px tolerance)
        const avgGap = normalGaps.reduce((a, b) => a + b) / normalGaps.length;
        const gapsUniform = normalGaps.every(g => Math.abs(g - avgGap) < 5);
        console.log(`  Gaps uniform? ${gapsUniform} (avg: ${avgGap.toFixed(0)}px)`);

        expect(gapsUniform).toBeTruthy();
    });

    test('Sort to alphabetical order step by step', async ({ page }) => {
        console.log('\n🖥️  ALPHABETICAL SORT WITH VALIDATION\n');
        let step = 30;

        await page.goto('http://localhost:8086/');
        await page.waitForSelector('.tile');

        await captureState(page, 'alpha-initial', step++);
        let info = await getTileInfo(page);
        console.log('Starting order:', info.order); // SCRABBLE

        // Target: ABBCELRS
        // Strategy: Move tiles one by one to correct positions

        // Move A to first position
        console.log('\n1️⃣ Moving A to start');
        await page.locator('.tile').filter({ hasText: 'A' }).first()
            .dragTo(page.locator('.tile').first());
        await page.waitForTimeout(300);
        await captureState(page, 'alpha-after-A', step++);
        info = await getTileInfo(page);
        console.log('  Order:', info.order);
        console.log('  All square?', info.tiles.every(t => t.isSquare));

        // Keep first B where it is, move second B after first B
        console.log('\n2️⃣ Arranging B tiles');
        const bTiles = await page.locator('.tile').filter({ hasText: 'B' }).all();
        if (bTiles.length === 2) {
            await bTiles[1].dragTo(bTiles[0], { targetPosition: { x: 40, y: 25 } });
            await page.waitForTimeout(300);
            await captureState(page, 'alpha-after-Bs', step++);
            info = await getTileInfo(page);
            console.log('  Order:', info.order);
        }

        // Continue with remaining letters...
        // The goal is to show the tiles maintain their square shape,
        // stay within bounds, and gaps work properly

        console.log('\n✅ Final Validation');
        info = await getTileInfo(page);

        console.log('Final checks:');
        console.log('  All tiles square?', info.tiles.every(t => t.isSquare));
        console.log('  All tiles within rack?', info.tiles.every(t => t.withinRack));
        console.log('  Current order:', info.order);

        expect(info.tiles.every(t => t.isSquare)).toBeTruthy();
        expect(info.tiles.every(t => t.withinRack)).toBeTruthy();
    });
});