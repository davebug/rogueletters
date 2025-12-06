const { test, expect } = require('@playwright/test');

test.describe('Mobile Board Viewport Test', () => {
  test('Check if board is fully visible in viewport', async ({ page }) => {
    // Set mobile viewport (iPhone 12/13 size)
    await page.setViewportSize({ width: 390, height: 844 });

    // Navigate to localhost
    await page.goto('http://localhost:8085');
    await page.waitForTimeout(2000);

    // Get board element dimensions and position
    const boardInfo = await page.evaluate(() => {
      const board = document.querySelector('.board');
      const container = document.querySelector('#board-container');
      const boardRect = board.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Get computed styles
      const boardStyles = window.getComputedStyle(board);
      const containerStyles = window.getComputedStyle(container);

      // Get cell size
      const firstCell = document.querySelector('.board-cell');
      const cellRect = firstCell ? firstCell.getBoundingClientRect() : null;

      return {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        board: {
          width: boardRect.width,
          height: boardRect.height,
          left: boardRect.left,
          right: boardRect.right,
          top: boardRect.top,
          bottom: boardRect.bottom,
          padding: boardStyles.padding,
          margin: boardStyles.margin
        },
        container: {
          width: containerRect.width,
          height: containerRect.height,
          left: containerRect.left,
          right: containerRect.right,
          padding: containerStyles.padding,
          margin: containerStyles.margin
        },
        cell: cellRect ? {
          width: cellRect.width,
          height: cellRect.height
        } : null,
        isFullyVisible: {
          horizontal: boardRect.left >= 0 && boardRect.right <= window.innerWidth,
          vertical: boardRect.top >= 0 && boardRect.bottom <= window.innerHeight,
          rightEdge: window.innerWidth - boardRect.right,
          leftEdge: boardRect.left
        }
      };
    });

    console.log('Viewport:', boardInfo.viewport);
    console.log('Board dimensions:', boardInfo.board);
    console.log('Container dimensions:', boardInfo.container);
    console.log('Cell size:', boardInfo.cell);
    console.log('Fully visible?', boardInfo.isFullyVisible);
    console.log('Space on left:', boardInfo.isFullyVisible.leftEdge, 'px');
    console.log('Space on right:', boardInfo.isFullyVisible.rightEdge, 'px');

    // Take screenshot
    await page.screenshot({
      path: 'board-viewport-test.png',
      fullPage: false
    });

    // Test different phone sizes
    const phoneSizes = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12/13', width: 390, height: 844 },
      { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
      { name: 'Pixel 5', width: 393, height: 851 }
    ];

    for (const phone of phoneSizes) {
      await page.setViewportSize({ width: phone.width, height: phone.height });
      await page.waitForTimeout(500);

      const visibility = await page.evaluate(() => {
        const board = document.querySelector('.board');
        const rect = board.getBoundingClientRect();
        return {
          boardWidth: rect.width,
          viewportWidth: window.innerWidth,
          fitsHorizontally: rect.left >= 0 && rect.right <= window.innerWidth,
          overflow: rect.right > window.innerWidth ? rect.right - window.innerWidth : 0
        };
      });

      console.log(`\n${phone.name} (${phone.width}x${phone.height}):`);
      console.log(`  Board width: ${visibility.boardWidth}px`);
      console.log(`  Fits horizontally: ${visibility.fitsHorizontally}`);
      if (!visibility.fitsHorizontally) {
        console.log(`  Overflow: ${visibility.overflow}px`);
      }
    }
  });
});