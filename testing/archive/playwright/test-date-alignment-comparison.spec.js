const { test, expect } = require('@playwright/test');

test.describe('Date Alignment Comparison - Mobile', () => {
  test('Compare date position between letters.wiki and dates.wiki', async ({ page }) => {
    // Set mobile viewport (iPhone SE size)
    await page.setViewportSize({ width: 375, height: 667 });

    // First, check letters.wiki
    await page.goto('https://letters.wiki');
    await page.waitForTimeout(2000); // Wait for full load

    // Get the date element position on letters.wiki
    const lettersDateElement = page.locator('#dateDisplay');
    await expect(lettersDateElement).toBeVisible();

    const lettersDateBox = await lettersDateElement.boundingBox();
    const lettersDateText = await lettersDateElement.textContent();
    const lettersDateStyles = await lettersDateElement.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        marginTop: styles.marginTop,
        fontSize: styles.fontSize,
        top: el.offsetTop,
        position: styles.position
      };
    });

    // Take screenshot for letters.wiki
    await page.screenshot({ path: 'letters-wiki-mobile-header.png', clip: { x: 0, y: 0, width: 375, height: 150 } });

    console.log('Letters.wiki Date Position:');
    console.log('  Text:', lettersDateText);
    console.log('  Bounding Box:', lettersDateBox);
    console.log('  Styles:', lettersDateStyles);

    // Now check dates.wiki
    await page.goto('https://dates.wiki');
    await page.waitForTimeout(2000); // Wait for full load

    // Get the date element position on dates.wiki
    const datesDateElement = page.locator('#dateDisplay');
    await expect(datesDateElement).toBeVisible();

    const datesDateBox = await datesDateElement.boundingBox();
    const datesDateText = await datesDateElement.textContent();
    const datesDateStyles = await datesDateElement.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        marginTop: styles.marginTop,
        fontSize: styles.fontSize,
        top: el.offsetTop,
        position: styles.position
      };
    });

    // Take screenshot for dates.wiki
    await page.screenshot({ path: 'dates-wiki-mobile-header.png', clip: { x: 0, y: 0, width: 375, height: 150 } });

    console.log('\nDates.wiki Date Position:');
    console.log('  Text:', datesDateText);
    console.log('  Bounding Box:', datesDateBox);
    console.log('  Styles:', datesDateStyles);

    // Compare the positions
    console.log('\n=== COMPARISON ===');
    if (lettersDateBox && datesDateBox) {
      const yDifference = lettersDateBox.y - datesDateBox.y;
      const xDifference = lettersDateBox.x - datesDateBox.x;

      console.log(`Y-axis difference: ${yDifference}px (positive = letters is lower)`);
      console.log(`X-axis difference: ${xDifference}px`);

      if (Math.abs(yDifference) > 2) {
        console.log(`⚠️  MISALIGNED: Date text is ${Math.abs(yDifference)}px off vertically`);
      } else {
        console.log('✓ Date text is properly aligned vertically');
      }
    }

    // Also compare the h1 title positions
    const lettersH1 = await page.goto('https://letters.wiki');
    await page.waitForTimeout(1000);
    const lettersTitle = page.locator('h1');
    const lettersTitleBox = await lettersTitle.boundingBox();

    await page.goto('https://dates.wiki');
    await page.waitForTimeout(1000);
    const datesTitle = page.locator('h1');
    const datesTitleBox = await datesTitle.boundingBox();

    console.log('\n=== H1 TITLE COMPARISON ===');
    console.log('Letters h1 position:', lettersTitleBox);
    console.log('Dates h1 position:', datesTitleBox);

    if (lettersTitleBox && datesTitleBox) {
      const h1YDiff = lettersTitleBox.y - datesTitleBox.y;
      console.log(`H1 Y-axis difference: ${h1YDiff}px`);
    }
  });

  test('Desktop comparison for reference', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Check letters.wiki
    await page.goto('https://letters.wiki');
    await page.waitForTimeout(2000);

    const lettersDateElement = page.locator('#dateDisplay');
    const lettersDateBox = await lettersDateElement.boundingBox();

    await page.screenshot({ path: 'letters-wiki-desktop-header.png', clip: { x: 0, y: 0, width: 1280, height: 150 } });

    // Check dates.wiki
    await page.goto('https://dates.wiki');
    await page.waitForTimeout(2000);

    const datesDateElement = page.locator('#dateDisplay');
    const datesDateBox = await datesDateElement.boundingBox();

    await page.screenshot({ path: 'dates-wiki-desktop-header.png', clip: { x: 0, y: 0, width: 1280, height: 150 } });

    // Compare
    console.log('\n=== DESKTOP COMPARISON ===');
    console.log('Letters date position:', lettersDateBox);
    console.log('Dates date position:', datesDateBox);

    if (lettersDateBox && datesDateBox) {
      const yDifference = lettersDateBox.y - datesDateBox.y;
      console.log(`Y-axis difference: ${yDifference}px`);
    }
  });
});