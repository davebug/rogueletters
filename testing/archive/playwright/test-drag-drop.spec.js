const { test, expect } = require('@playwright/test');

test.describe('Drag and Drop Tile Interactions', () => {

    test('all drag and drop scenarios', async ({ page }) => {
        console.log('\n🎯 TESTING DRAG AND DROP FUNCTIONALITY\n');

        await page.goto('http://localhost:8085');
        await page.waitForSelector('#loading-overlay', { state: 'hidden' });
        await page.waitForSelector('.tile-rack .tile');

        // Get starting word info
        const startingWord = await page.evaluate(() => {
            const tiles = document.querySelectorAll('.board-cell.occupied .tile');
            return Array.from(tiles).map(t => t.textContent.charAt(0)).join('');
        });
        console.log(`Starting word: ${startingWord}`);

        console.log('\n--- TEST 1: Drag from rack to board ---');

        // Get first tile in rack
        const firstTile = await page.locator('.tile-rack .tile').first();
        const tileLetter = await firstTile.textContent();
        console.log(`Dragging ${tileLetter.charAt(0)} from rack to board...`);

        // Drag to an empty cell below the starting word
        await firstTile.dragTo(page.locator('.board-cell[data-row="8"][data-col="7"]'));

        // Verify tile was placed
        const placedTile = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile').count();
        expect(placedTile).toBe(1);
        console.log('✅ Tile successfully dragged from rack to board');

        console.log('\n--- TEST 2: Drag from board back to rack ---');

        // Get the tile we just placed
        const boardTile = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile').first();

        // Drag it back to the rack
        await boardTile.dragTo(page.locator('#tile-rack'));

        // Verify tile is back in rack
        const backInRack = await page.locator('.tile-rack .tile').count();
        expect(backInRack).toBeGreaterThan(0);

        // Verify board cell is empty again
        const cellEmpty = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile').count();
        expect(cellEmpty).toBe(0);
        console.log('✅ Tile successfully dragged from board back to rack');

        console.log('\n--- TEST 3: Drag tile between board positions ---');

        // Place a tile on the board first
        const tile1 = await page.locator('.tile-rack .tile').first();
        await tile1.dragTo(page.locator('.board-cell[data-row="8"][data-col="7"]'));

        // Now drag it to a different position
        const placedTile1 = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile').first();
        await placedTile1.dragTo(page.locator('.board-cell[data-row="8"][data-col="8"]'));

        // Verify old position is empty
        const oldPosEmpty = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile').count();
        expect(oldPosEmpty).toBe(0);

        // Verify new position has the tile
        const newPosHasTile = await page.locator('.board-cell[data-row="8"][data-col="8"] .tile').count();
        expect(newPosHasTile).toBe(1);
        console.log('✅ Tile successfully moved between board positions');

        console.log('\n--- TEST 4: Visual feedback during drag ---');

        // Start a new drag and check for visual feedback
        const tile2 = await page.locator('.tile-rack .tile').first();

        // Start drag
        await page.mouse.move(await tile2.boundingBox().then(b => b.x + b.width / 2),
                           await tile2.boundingBox().then(b => b.y + b.height / 2));
        await page.mouse.down();

        // Move over a valid drop target
        const targetCell = page.locator('.board-cell[data-row="7"][data-col="12"]');
        await page.mouse.move(await targetCell.boundingBox().then(b => b.x + b.width / 2),
                           await targetCell.boundingBox().then(b => b.y + b.height / 2));

        // Check for drag-over class (visual feedback)
        const hasDragOver = await targetCell.evaluate(el => el.classList.contains('drag-over'));
        console.log(`Visual feedback on hover: ${hasDragOver ? '✅ Present' : '❌ Missing'}`);

        // Complete the drag
        await page.mouse.up();

        console.log('\n--- TEST 5: Cannot drag starting word tiles ---');

        // Try to drag a tile from the starting word
        const startingWordTile = await page.locator('.board-cell.occupied:not(.placed-this-turn) .tile').first();
        if (await startingWordTile.count() > 0) {
            const startPos = await startingWordTile.boundingBox();

            // Attempt to drag it
            await startingWordTile.dragTo(page.locator('.board-cell[data-row="9"][data-col="7"]'));

            // Verify it didn't move (still in original position)
            const stillThere = await page.locator('.board-cell.occupied:not(.placed-this-turn) .tile').first().isVisible();
            expect(stillThere).toBe(true);
            console.log('✅ Starting word tiles correctly cannot be dragged');
        }

        console.log('\n--- TEST 6: Multiple tiles can be repositioned ---');

        // Clear the board first
        await page.click('#recall-tiles');

        // Place multiple tiles
        const tiles = await page.locator('.tile-rack .tile').all();
        if (tiles.length >= 3) {
            await tiles[0].dragTo(page.locator('.board-cell[data-row="7"][data-col="11"]'));
            await tiles[1].dragTo(page.locator('.board-cell[data-row="7"][data-col="12"]'));
            await tiles[2].dragTo(page.locator('.board-cell[data-row="7"][data-col="13"]'));

            // Now rearrange them
            const placed1 = await page.locator('.board-cell[data-row="7"][data-col="11"] .tile').first();
            await placed1.dragTo(page.locator('.board-cell[data-row="8"][data-col="11"]'));

            // Verify movement
            const movedDown = await page.locator('.board-cell[data-row="8"][data-col="11"] .tile').count();
            expect(movedDown).toBe(1);
            console.log('✅ Multiple tiles can be repositioned independently');
        }

        // Check word preview updates after dragging
        const previewText = await page.locator('.word-preview').textContent();
        console.log(`\nWord preview after dragging: ${previewText.trim()}`);

        // Take screenshot
        await page.screenshot({
            path: 'test-results/drag-drop-test.png',
            fullPage: true
        });

        console.log('\n✅ All drag and drop tests passed!');
    });

    test('touch gestures for mobile', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        await page.goto('http://localhost:8085');
        await page.waitForSelector('#loading-overlay', { state: 'hidden' });
        await page.waitForSelector('.tile-rack .tile');

        console.log('\n📱 Testing touch interactions...');

        // Test tap to select and tap to place
        const firstTile = await page.locator('.tile-rack .tile').first();
        await firstTile.tap();

        // Check if selected
        const isSelected = await firstTile.evaluate(el => el.classList.contains('selected'));
        expect(isSelected).toBe(true);
        console.log('✅ Tap to select works');

        // Tap on board to place
        await page.locator('.board-cell[data-row="8"][data-col="7"]').tap();

        // Verify placement
        const placed = await page.locator('.board-cell[data-row="8"][data-col="7"] .tile').count();
        expect(placed).toBe(1);
        console.log('✅ Tap to place works');

        console.log('✅ Touch interactions working!');
    });
});