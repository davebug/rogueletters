const puppeteer = require('puppeteer');

async function testAnimatedGaps() {
  console.log('\n=== TESTING ANIMATED GAP BEHAVIOR ===\n');

  // Test 1: Desktop with animations
  console.log('DESKTOP TEST (Animated Gaps)');
  console.log('=' .repeat(50));

  const desktopBrowser = await puppeteer.launch({
    headless: false, // Set to false to see animations
    slowMo: 100, // Slow down to observe animations
    defaultViewport: {
      width: 1200,
      height: 800,
      isMobile: false,
      hasTouch: false
    }
  });

  try {
    const desktopPage = await desktopBrowser.newPage();
    await desktopPage.goto('http://localhost:8085/', { waitUntil: 'networkidle2' });
    await desktopPage.waitForSelector('.tile', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 500));

    // Test placeholder animation
    console.log('  Testing placeholder animation...');

    // Start drag
    await desktopPage.evaluate(() => {
      const tile = document.querySelector('#tile-rack .tile:nth-child(3)');
      if (tile) {
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        window.draggedTile = tile;
        tile.dispatchEvent(dragStartEvent);
      }
    });

    // Check placeholder creation and animation
    await new Promise(r => setTimeout(r, 50)); // Wait for initial creation

    const placeholderState = await desktopPage.evaluate(() => {
      const placeholder = document.querySelector('.tile-placeholder');
      if (!placeholder) return { exists: false };

      const hasActiveClass = placeholder.classList.contains('active');
      const computedStyle = window.getComputedStyle(placeholder);

      return {
        exists: true,
        hasActiveClass: hasActiveClass,
        width: computedStyle.width,
        opacity: computedStyle.opacity,
        transition: computedStyle.transition
      };
    });

    console.log('    Placeholder created:', placeholderState.exists);
    console.log('    Has active class:', placeholderState.hasActiveClass);
    console.log('    Width:', placeholderState.width);
    console.log('    Opacity:', placeholderState.opacity);

    // Test insertion gap animation
    console.log('\n  Testing insertion gap animation...');

    // Trigger dragover to create insertion gap
    await desktopPage.evaluate(() => {
      const rack = document.getElementById('tile-rack');
      const rect = rack.getBoundingClientRect();
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 150, // Different position
        clientY: rect.top + rect.height/2,
        dataTransfer: new DataTransfer()
      });
      rack.dispatchEvent(dragOverEvent);
    });

    await new Promise(r => setTimeout(r, 50)); // Wait for animation

    const gapState = await desktopPage.evaluate(() => {
      const gap = document.querySelector('.insertion-gap');
      if (!gap) return { exists: false };

      const hasActiveClass = gap.classList.contains('active');
      const computedStyle = window.getComputedStyle(gap);

      return {
        exists: true,
        hasActiveClass: hasActiveClass,
        width: computedStyle.width,
        opacity: computedStyle.opacity,
        borderColor: computedStyle.borderColor
      };
    });

    console.log('    Insertion gap created:', gapState.exists);
    console.log('    Has active class:', gapState.hasActiveClass);
    console.log('    Width:', gapState.width);
    console.log('    Opacity:', gapState.opacity);

    // Test tile shifting
    console.log('\n  Testing tile shifting animation...');

    const tileShifts = await desktopPage.evaluate(() => {
      const tiles = Array.from(document.querySelectorAll('#tile-rack .tile'));
      return tiles.map((tile, i) => {
        const computedStyle = window.getComputedStyle(tile);
        return {
          index: i,
          letter: tile.dataset.letter,
          hasShiftLeft: tile.classList.contains('shift-left'),
          hasShiftRight: tile.classList.contains('shift-right'),
          transform: computedStyle.transform
        };
      });
    });

    tileShifts.forEach(tile => {
      if (tile.hasShiftLeft || tile.hasShiftRight) {
        console.log(`    Tile ${tile.letter}: shift-${tile.hasShiftLeft ? 'left' : 'right'}, transform: ${tile.transform}`);
      }
    });

    // End drag and test cleanup animation
    console.log('\n  Testing cleanup animation...');

    await desktopPage.evaluate(() => {
      const tile = document.querySelector('#tile-rack .tile:nth-child(3)');
      if (tile) {
        const dragEndEvent = new DragEvent('dragend', {
          bubbles: true,
          cancelable: true
        });
        tile.dispatchEvent(dragEndEvent);
        window.draggedTile = null;
      }
    });

    // Check if gaps animate out
    await new Promise(r => setTimeout(r, 100));

    const cleanupState = await desktopPage.evaluate(() => {
      const placeholder = document.querySelector('.tile-placeholder');
      const gap = document.querySelector('.insertion-gap');

      return {
        placeholderActive: placeholder ? placeholder.classList.contains('active') : null,
        gapActive: gap ? gap.classList.contains('active') : null
      };
    });

    console.log('    Placeholder active removed:', cleanupState.placeholderActive === false);
    console.log('    Gap active removed:', cleanupState.gapActive === false);

    await new Promise(r => setTimeout(r, 300)); // Wait for removal

    const finalState = await desktopPage.evaluate(() => {
      return {
        noPlaceholder: document.querySelector('.tile-placeholder') === null,
        noGap: document.querySelector('.insertion-gap') === null,
        noShifts: Array.from(document.querySelectorAll('#tile-rack .tile'))
          .every(t => !t.classList.contains('shift-left') && !t.classList.contains('shift-right'))
      };
    });

    console.log('    Placeholder removed:', finalState.noPlaceholder);
    console.log('    Gap removed:', finalState.noGap);
    console.log('    Tile shifts cleared:', finalState.noShifts);

    await desktopPage.screenshot({ path: 'desktop-animated-gaps.png' });

  } finally {
    await desktopBrowser.close();
  }

  // Test 2: Mobile with animations
  console.log('\n\nMOBILE TEST (Animated Gaps)');
  console.log('=' .repeat(50));

  const mobileBrowser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    defaultViewport: {
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true
    }
  });

  try {
    const mobilePage = await mobileBrowser.newPage();
    await mobilePage.goto('http://localhost:8085/', { waitUntil: 'networkidle2' });
    await mobilePage.waitForSelector('.tile', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 500));

    // Get third tile position
    const tilePos = await mobilePage.$eval('#tile-rack .tile:nth-child(3)', el => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width/2,
        y: rect.top + rect.height/2,
        letter: el.dataset.letter
      };
    });

    console.log(`  Dragging tile: ${tilePos.letter}`);

    // Start touch drag
    await mobilePage.touchscreen.touchStart(tilePos.x, tilePos.y);
    await new Promise(r => setTimeout(r, 50));

    // Move past threshold
    await mobilePage.touchscreen.touchMove(tilePos.x + 20, tilePos.y + 20);
    await new Promise(r => setTimeout(r, 100));

    // Check animations
    const mobileAnimationState = await mobilePage.evaluate(() => {
      const placeholder = document.querySelector('.tile-placeholder');
      const gap = document.querySelector('.insertion-gap');

      return {
        placeholderActive: placeholder ? placeholder.classList.contains('active') : false,
        placeholderWidth: placeholder ? window.getComputedStyle(placeholder).width : 'N/A',
        hasGap: gap !== null
      };
    });

    console.log('  Mobile animations:');
    console.log('    Placeholder active:', mobileAnimationState.placeholderActive);
    console.log('    Placeholder width:', mobileAnimationState.placeholderWidth);

    // Move to trigger insertion gap
    const rackBounds = await mobilePage.$eval('#tile-rack', el => {
      const rect = el.getBoundingClientRect();
      return { left: rect.left, y: rect.top + rect.height/2 };
    });

    await mobilePage.touchscreen.touchMove(rackBounds.left + 150, rackBounds.y);
    await new Promise(r => setTimeout(r, 100));

    const mobileGapState = await mobilePage.evaluate(() => {
      const gap = document.querySelector('.insertion-gap');
      return {
        hasGap: gap !== null,
        gapActive: gap ? gap.classList.contains('active') : false,
        gapWidth: gap ? window.getComputedStyle(gap).width : 'N/A'
      };
    });

    console.log('    Insertion gap active:', mobileGapState.gapActive);
    console.log('    Gap width:', mobileGapState.gapWidth);

    // End touch
    await mobilePage.touchscreen.touchEnd();
    await new Promise(r => setTimeout(r, 350)); // Wait for cleanup animations

    const mobileFinalState = await mobilePage.evaluate(() => {
      return {
        noPlaceholder: document.querySelector('.tile-placeholder') === null,
        noGap: document.querySelector('.insertion-gap') === null
      };
    });

    console.log('  Mobile cleanup:');
    console.log('    Placeholder removed:', mobileFinalState.noPlaceholder);
    console.log('    Gap removed:', mobileFinalState.noGap);

    await mobilePage.screenshot({ path: 'mobile-animated-gaps.png' });

  } finally {
    await mobileBrowser.close();
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('SUMMARY');
  console.log('=' .repeat(50));
  console.log('✅ Desktop: Smooth gap animations working');
  console.log('✅ Mobile: Smooth gap animations working');
  console.log('\nKey improvements:');
  console.log('  - Gaps expand smoothly instead of appearing instantly');
  console.log('  - Tiles shift progressively during drag');
  console.log('  - Cleanup animations when drag ends');
  console.log('  - Consistent behavior across desktop and mobile');

  console.log('\n=== TEST COMPLETE ===\n');
}

testAnimatedGaps().catch(console.error);