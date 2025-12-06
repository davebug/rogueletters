const { test, expect } = require('@playwright/test');

test('three-column layout displays correctly', async ({ page }) => {
    console.log('\n🔍 TESTING THREE-COLUMN LAYOUT\n');

    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Check if all three columns exist
    const leftSidebar = await page.locator('#left-sidebar');
    const centerArea = await page.locator('#center-game-area');
    const rightSidebar = await page.locator('#right-sidebar');

    const leftVisible = await leftSidebar.isVisible();
    const centerVisible = await centerArea.isVisible();
    const rightVisible = await rightSidebar.isVisible();

    console.log(`Left sidebar visible: ${leftVisible ? '✅' : '❌'}`);
    console.log(`Center area visible: ${centerVisible ? '✅' : '❌'}`);
    console.log(`Right sidebar visible: ${rightVisible ? '✅' : '❌'}`);

    expect(leftVisible).toBe(true);
    expect(centerVisible).toBe(true);
    expect(rightVisible).toBe(true);

    // Check left sidebar content
    const turnLabel = await page.locator('#left-sidebar .label').first();
    const turnValue = await page.locator('#current-turn');
    const scoreValue = await page.locator('#current-score');

    console.log(`\nLeft sidebar content:`);
    console.log(`  Turn label: "${await turnLabel.textContent()}"`);
    console.log(`  Turn value: "${await turnValue.textContent()}"`);
    console.log(`  Score value: "${await scoreValue.textContent()}"`);

    // Check Start Over button is in sidebar
    const startOverBtn = await page.locator('#start-over');
    const startOverParent = await startOverBtn.evaluate(el => el.parentElement?.parentElement?.id);
    console.log(`  Start Over button parent: ${startOverParent === 'left-sidebar' ? '✅ in sidebar' : '❌ not in sidebar'}`);
    expect(startOverParent).toBe('left-sidebar');

    // Check right sidebar content
    const potentialWordsTitle = await page.locator('#right-sidebar h3');
    const titleText = await potentialWordsTitle.textContent();
    console.log(`\nRight sidebar content:`);
    console.log(`  Title: "${titleText}"`);

    const placeholder = await page.locator('#potential-words-list .placeholder');
    const placeholderText = await placeholder.textContent();
    console.log(`  Placeholder: "${placeholderText}"`);

    // Check layout positioning
    const leftBox = await leftSidebar.boundingBox();
    const centerBox = await centerArea.boundingBox();
    const rightBox = await rightSidebar.boundingBox();

    console.log(`\nLayout positioning:`);
    console.log(`  Left sidebar: x=${leftBox.x}, width=${leftBox.width}`);
    console.log(`  Center area: x=${centerBox.x}, width=${centerBox.width}`);
    console.log(`  Right sidebar: x=${rightBox.x}, width=${rightBox.width}`);

    // Verify columns are properly arranged (left < center < right)
    const isProperlyArranged = leftBox.x < centerBox.x && centerBox.x < rightBox.x;
    console.log(`  Properly arranged: ${isProperlyArranged ? '✅' : '❌'}`);
    expect(isProperlyArranged).toBe(true);

    // Take screenshot
    await page.screenshot({ path: 'test-results/three-column-layout.png', fullPage: false });
    console.log('\n📸 Screenshot saved to test-results/three-column-layout.png');
});

test('sidebar updates with potential words when tiles placed', async ({ page }) => {
    console.log('\n🔍 TESTING SIDEBAR WORD UPDATES\n');

    await page.goto('http://localhost:8085?debug=1');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Initial state - should show placeholder
    let placeholderVisible = await page.locator('#potential-words-list .placeholder').isVisible();
    console.log(`Initial placeholder visible: ${placeholderVisible ? '✅' : '❌'}`);
    expect(placeholderVisible).toBe(true);

    // Place some tiles on the board
    await page.evaluate(() => {
        // Simulate placing tiles to form a word
        window.gameState.placedTiles = [
            { row: 7, col: 7, letter: 'T', value: 1, isStarter: false },
            { row: 7, col: 8, letter: 'E', value: 1, isStarter: false },
            { row: 7, col: 9, letter: 'S', value: 1, isStarter: false },
            { row: 7, col: 10, letter: 'T', value: 1, isStarter: false }
        ];

        // Trigger the update
        window.checkWordValidity();
    });

    await page.waitForTimeout(500);

    // Check if potential words are now displayed
    const wordItems = await page.locator('.word-item').count();
    console.log(`Word items displayed: ${wordItems}`);

    if (wordItems > 0) {
        const firstWord = await page.locator('.word-text').first();
        const firstScore = await page.locator('.word-score').first();

        console.log(`  First word: "${await firstWord.textContent()}"`);
        console.log(`  First score: "${await firstScore.textContent()}"`);

        // Check total score
        const totalScore = await page.locator('.total-score .value');
        if (await totalScore.count() > 0) {
            console.log(`  Total score: "${await totalScore.textContent()}"`);
        }
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/sidebar-with-words.png', fullPage: false });
    console.log('\n📸 Screenshot saved to test-results/sidebar-with-words.png');
});

test('responsive layout on mobile', async ({ page }) => {
    console.log('\n🔍 TESTING RESPONSIVE MOBILE LAYOUT\n');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:8085');
    await page.waitForSelector('#loading-overlay', { state: 'hidden' });

    // Check if layout is stacked vertically
    const leftSidebar = await page.locator('#left-sidebar').boundingBox();
    const centerArea = await page.locator('#center-game-area').boundingBox();
    const rightSidebar = await page.locator('#right-sidebar').boundingBox();

    console.log(`Mobile layout:`);
    console.log(`  Left sidebar: y=${leftSidebar.y}, height=${leftSidebar.height}`);
    console.log(`  Center area: y=${centerArea.y}, height=${centerArea.height}`);
    console.log(`  Right sidebar: y=${rightSidebar.y}, height=${rightSidebar.height}`);

    // Verify stacking (left above center above right)
    const isStacked = leftSidebar.y < centerArea.y && centerArea.y < rightSidebar.y;
    console.log(`  Vertically stacked: ${isStacked ? '✅' : '❌'}`);
    expect(isStacked).toBe(true);

    // Check that sidebars take full width
    const viewportWidth = 375;
    const sidebarUsesFullWidth = leftSidebar.width > viewportWidth * 0.9;
    console.log(`  Full width sidebars: ${sidebarUsesFullWidth ? '✅' : '❌'} (${leftSidebar.width}px)`);

    // Take screenshot
    await page.screenshot({ path: 'test-results/mobile-three-column.png', fullPage: true });
    console.log('\n📸 Screenshot saved to test-results/mobile-three-column.png');
});