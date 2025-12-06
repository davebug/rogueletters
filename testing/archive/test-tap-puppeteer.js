const puppeteer = require('puppeteer');

async function runTests() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set viewport for consistency
    await page.setViewport({ width: 1280, height: 800 });

    try {
        console.log('Starting Puppeteer tests...\n');

        // Navigate to the game
        await page.goto('http://localhost:8085/?seed=20240101', {
            waitUntil: 'networkidle2'
        });

        // Wait for tiles to load
        await page.waitForSelector('#tile-rack .tile', { timeout: 10000 });

        // Hide footer to avoid interference
        await page.evaluate(() => {
            const footer = document.querySelector('footer');
            if (footer) footer.style.display = 'none';
            const feedbackFooter = document.getElementById('feedbackFooter');
            if (feedbackFooter) feedbackFooter.style.display = 'none';
        });

        // Get initial tile count
        const tileCount = await page.evaluate(() => {
            return document.querySelectorAll('#tile-rack .tile').length;
        });
        console.log(`✓ Game loaded with ${tileCount} tiles\n`);

        // Test 1: Select a tile
        console.log('Test 1: Selecting a tile');
        const firstTileData = await page.evaluate(() => {
            const tile = document.querySelector('#tile-rack .tile');
            return {
                letter: tile.getAttribute('data-letter'),
                classesBefore: tile.className
            };
        });
        console.log(`  - First tile letter: ${firstTileData.letter}`);
        console.log(`  - Classes before click: "${firstTileData.classesBefore}"`);

        // Click the first tile
        await page.click('#tile-rack .tile:first-child');

        // Check if selected
        const afterSelect = await page.evaluate(() => {
            const tile = document.querySelector('#tile-rack .tile');
            return {
                classes: tile.className,
                hasSelected: tile.classList.contains('selected'),
                selectedTileVar: window.selectedTile !== null
            };
        });
        console.log(`  - Classes after click: "${afterSelect.classes}"`);
        console.log(`  - Has selected class: ${afterSelect.hasSelected}`);
        console.log(`  - selectedTile variable set: ${afterSelect.selectedTileVar}`);

        if (afterSelect.hasSelected) {
            console.log('  ✓ Tile selection works!\n');
        } else {
            console.log('  ✗ Tile selection failed\n');
        }

        // Test 2: Deselect the tile
        console.log('Test 2: Deselecting the tile');

        // Wait a bit for any animations
        await new Promise(r => setTimeout(r, 500));

        // Try clicking again with different methods
        console.log('  - Attempting deselection click...');

        // Method 1: Regular click
        await page.click('#tile-rack .tile:first-child');
        await new Promise(r => setTimeout(r, 200));

        const afterDeselect1 = await page.evaluate(() => {
            const tile = document.querySelector('#tile-rack .tile');
            return {
                classes: tile.className,
                hasSelected: tile.classList.contains('selected')
            };
        });
        console.log(`  - After regular click: selected=${afterDeselect1.hasSelected}`);

        if (!afterDeselect1.hasSelected) {
            console.log('  ✓ Deselection works with regular click!\n');
        } else {
            // Try Method 2: Force click with JavaScript
            console.log('  - Regular click failed, trying JavaScript click...');

            await page.evaluate(() => {
                const tile = document.querySelector('#tile-rack .tile');
                tile.click();
            });
            await new Promise(r => setTimeout(r, 200));

            const afterDeselect2 = await page.evaluate(() => {
                const tile = document.querySelector('#tile-rack .tile');
                return {
                    classes: tile.className,
                    hasSelected: tile.classList.contains('selected')
                };
            });
            console.log(`  - After JS click: selected=${afterDeselect2.hasSelected}`);

            if (!afterDeselect2.hasSelected) {
                console.log('  ✓ Deselection works with JS click!\n');
            } else {
                console.log('  ✗ Deselection not working\n');

                // Debug: Check what's happening in handleTileClick
                const debugInfo = await page.evaluate(() => {
                    const tile = document.querySelector('#tile-rack .tile');
                    const event = new MouseEvent('click', { bubbles: true });

                    // Log what happens when we dispatch the event
                    const before = {
                        selected: tile.classList.contains('selected'),
                        selectedTileVar: window.selectedTile
                    };

                    tile.dispatchEvent(event);

                    const after = {
                        selected: tile.classList.contains('selected'),
                        selectedTileVar: window.selectedTile
                    };

                    return { before, after };
                });
                console.log('  Debug info:', JSON.stringify(debugInfo, null, 2));
            }
        }

        // Test 3: Swap tiles
        console.log('Test 3: Swapping tiles');

        // First, ensure we have a clean state
        await page.evaluate(() => {
            // Deselect any selected tiles
            document.querySelectorAll('.tile.selected').forEach(t => {
                t.classList.remove('selected');
            });
            window.selectedTile = null;
            window.selectedTilePosition = null;
        });

        // Get initial positions
        const initialOrder = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#tile-rack .tile')).map(t =>
                t.getAttribute('data-letter')
            );
        });
        console.log(`  - Initial order: ${initialOrder.join(', ')}`);

        // Select first tile
        await page.click('#tile-rack .tile:nth-child(1)');
        await new Promise(r => setTimeout(r, 100));

        const firstSelected = await page.evaluate(() => {
            const tile = document.querySelector('#tile-rack .tile:nth-child(1)');
            return tile.classList.contains('selected');
        });
        console.log(`  - First tile selected: ${firstSelected}`);

        // Click third tile to swap
        await page.click('#tile-rack .tile:nth-child(3)');
        await new Promise(r => setTimeout(r, 500)); // Wait for swap animation

        // Check new order
        const newOrder = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#tile-rack .tile')).map(t =>
                t.getAttribute('data-letter')
            );
        });
        console.log(`  - New order: ${newOrder.join(', ')}`);

        // Verify swap occurred
        if (newOrder[0] === initialOrder[2] && newOrder[2] === initialOrder[0]) {
            console.log('  ✓ Tiles swapped successfully!\n');
        } else {
            console.log('  ✗ Swap did not occur as expected\n');
        }

        // Test 4: Check CSS animation impact
        console.log('Test 4: Checking CSS animations');

        // Get animation details
        const animationInfo = await page.evaluate(() => {
            const tile = document.querySelector('#tile-rack .tile');
            tile.classList.add('selected');
            const styles = window.getComputedStyle(tile);
            return {
                animation: styles.animation,
                animationName: styles.animationName,
                animationDuration: styles.animationDuration,
                transform: styles.transform
            };
        });
        console.log('  - Animation details:', animationInfo);

        // Check if animation causes instability
        const boundingBoxBefore = await page.evaluate(() => {
            const tile = document.querySelector('#tile-rack .tile.selected');
            const rect = tile.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        });

        await new Promise(r => setTimeout(r, 100));

        const boundingBoxAfter = await page.evaluate(() => {
            const tile = document.querySelector('#tile-rack .tile.selected');
            const rect = tile.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        });

        const sizeChanged = boundingBoxBefore.width !== boundingBoxAfter.width ||
                           boundingBoxBefore.height !== boundingBoxAfter.height;
        console.log(`  - Size changed during animation: ${sizeChanged}`);
        console.log(`  - Before: ${boundingBoxBefore.width}x${boundingBoxBefore.height}`);
        console.log(`  - After: ${boundingBoxAfter.width}x${boundingBoxAfter.height}`);

        if (sizeChanged) {
            console.log('  ⚠️ Animation causes size changes - this may affect test stability\n');
        } else {
            console.log('  ✓ Animation does not affect size\n');
        }

        // Take final screenshot
        await page.screenshot({ path: 'testing/screenshots/puppeteer-final.png' });
        console.log('Screenshot saved to testing/screenshots/puppeteer-final.png');

    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await browser.close();
    }
}

// Run the tests
runTests().then(() => {
    console.log('\nPuppeteer tests completed');
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});