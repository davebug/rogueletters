const { test, expect } = require('@playwright/test');

test('verify click handlers are attached', async ({ page }) => {
    // Navigate to the game
    await page.goto('http://localhost:8085/?seed=20240101');

    // Wait for tiles to load
    await page.waitForSelector('#tile-rack .tile', { timeout: 10000 });

    // Hide footer
    await page.evaluate(() => {
        const footer = document.querySelector('footer');
        if (footer) footer.style.display = 'none';
        const feedbackFooter = document.getElementById('feedbackFooter');
        if (feedbackFooter) feedbackFooter.style.display = 'none';
    });

    // Check if the click handler functions exist
    const functionsExist = await page.evaluate(() => {
        return {
            handleTileClick: typeof handleTileClick !== 'undefined',
            handleRackClick: typeof handleRackClick !== 'undefined',
            handleBoardClick: typeof handleBoardClick !== 'undefined',
            selectedTile: typeof selectedTile !== 'undefined'
        };
    });
    console.log('Functions exist:', functionsExist);

    // Check if event listeners are attached
    const firstTileHasListeners = await page.evaluate(() => {
        const firstTile = document.querySelector('#tile-rack .tile');
        if (!firstTile) return false;

        // Get all event listeners (this only works in debug mode)
        // Let's try clicking it programmatically
        return true;
    });
    console.log('First tile found:', firstTileHasListeners);

    // Try clicking directly through JavaScript
    const clickResult = await page.evaluate(() => {
        const firstTile = document.querySelector('#tile-rack .tile');
        if (!firstTile) return { error: 'No tile found' };

        const letter = firstTile.getAttribute('data-letter');
        const classesBefore = firstTile.className;

        // Try clicking
        firstTile.click();

        const classesAfter = firstTile.className;
        const selectedTileValue = window.selectedTile;

        return {
            letter,
            classesBefore,
            classesAfter,
            hasSelectedClass: classesAfter.includes('selected'),
            selectedTileExists: selectedTileValue !== null && selectedTileValue !== undefined,
            selectedTileIsFirstTile: selectedTileValue === firstTile
        };
    });
    console.log('Direct click result:', clickResult);

    // Try calling handleTileClick directly
    const directCallResult = await page.evaluate(() => {
        const firstTile = document.querySelector('#tile-rack .tile');
        if (!firstTile || typeof handleTileClick === 'undefined') {
            return { error: 'Function or tile not found' };
        }

        // Create a fake event
        const fakeEvent = {
            target: firstTile,
            currentTarget: firstTile,
            closest: (selector) => {
                if (selector === '.tile') return firstTile;
                if (selector === '.board-cell') return null;
                return firstTile.closest(selector);
            }
        };

        // Call the function
        handleTileClick(fakeEvent);

        return {
            classesAfter: firstTile.className,
            hasSelectedClass: firstTile.className.includes('selected'),
            selectedTileExists: window.selectedTile !== null && window.selectedTile !== undefined
        };
    });
    console.log('Direct function call result:', directCallResult);

    // Check the rack click handler
    const rackClickResult = await page.evaluate(() => {
        const rack = document.getElementById('tile-rack');
        const firstTile = rack?.querySelector('.tile');
        if (!firstTile || typeof handleRackClick === 'undefined') {
            return { error: 'Rack or function not found' };
        }

        // Reset selectedTile
        if (window.selectedTile) {
            window.selectedTile.classList.remove('selected');
            window.selectedTile = null;
        }

        // Create event for rack click
        const fakeEvent = {
            target: firstTile,
            currentTarget: rack,
            closest: (selector) => {
                if (selector === '.tile') return firstTile;
                return firstTile.closest(selector);
            }
        };

        handleRackClick(fakeEvent);

        return {
            classesAfter: firstTile.className,
            hasSelectedClass: firstTile.className.includes('selected'),
            selectedTileExists: window.selectedTile !== null && window.selectedTile !== undefined,
            selectedTileIsFirstTile: window.selectedTile === firstTile
        };
    });
    console.log('Rack click handler result:', rackClickResult);

    // Take screenshot
    await page.screenshot({ path: 'testing/screenshots/handler-test.png' });
});