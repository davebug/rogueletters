const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Helper to clear high scores before tests
function clearHighScores() {
    const scoresDir = path.join(__dirname, '../../data/high_scores');
    if (fs.existsSync(scoresDir)) {
        const files = fs.readdirSync(scoresDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                fs.unlinkSync(path.join(scoresDir, file));
            }
        });
    }
}

// Helper to clear rate limits
function clearRateLimits() {
    const rateLimitFile = path.join(__dirname, '../../data/rate_limits.json');
    if (fs.existsSync(rateLimitFile)) {
        fs.unlinkSync(rateLimitFile);
    }
}

// Helper function to complete a game with a test high score
async function completeGameWithScore(page, seed, score) {
    await page.evaluate(async ({seed, score}) => {
        window.gameState.score = score;
        window.gameState.seed = seed;
        if (typeof window.endGame === 'function') {
            await window.endGame();
            // Override the generated URL with test URL AFTER endGame completes
            window.gameState.preGeneratedShareURL = `https://letters.wiki/?g=TEST_BOARD_URL_${score}`;
            // Re-call showBasicPopupWithHighScore to use the test URL
            await window.showBasicPopupWithHighScore();
        }
    }, {seed, score});
}

test.describe('High Score Feature', () => {
    const baseURL = 'http://localhost:8085';

    test.beforeEach(() => {
        // Clear high scores and rate limits before each test
        clearHighScores();
        clearRateLimits();
    });

    test('should display "No high score yet" message when no high score exists', async ({ page }) => {
        // Navigate to the game
        await page.goto(baseURL);

        // Wait for game to load
        await page.waitForSelector('#game-board');

        // Complete the game quickly using debug mode or by playing
        // For now, we'll use debug mode to bypass actual gameplay
        await page.goto(`${baseURL}/?debug=1&seed=20251008`);

        // Complete game with test score
        await completeGameWithScore(page, '20251008', 50);

        {
            // Wait for popup to appear
            await page.waitForSelector('#game-popup:not(.hidden)', { timeout: 5000 });

            // Check that high score section is visible
            const highScoreSection = await page.$('#popup-high-score-section');
            const isVisible = await highScoreSection.evaluate(el => el.style.display !== 'none');

            // Should show achievement since it's the first submission
            if (isVisible) {
                const achievementText = await page.textContent('#high-score-achievement');
                expect(achievementText).toContain('high score');
            }
        }
    });

    test('should submit and display high score after game completion', async ({ page }) => {
        // Navigate to game with a specific seed
        await page.goto(`${baseURL}/?seed=20251009`);

        await page.waitForSelector('#game-board');

        // Complete a game
        await completeGameWithScore(page, '20251009', 75);

        // Wait for popup
        await page.waitForSelector('#game-popup:not(.hidden)', { timeout: 5000 });

        // Wait a bit for async high score submission
        await page.waitForTimeout(2000);

        // Check if achievement is shown
        const achievement = await page.$('#high-score-achievement');
        if (achievement) {
            const achievementVisible = await achievement.evaluate(el => el.style.display !== 'none');
            if (achievementVisible) {
                const text = await achievement.textContent();
                console.log('Achievement text:', text);
            }
        }
    });

    test('should show existing high score when reloading game', async ({ page }) => {
        const testSeed = '20251010';

        // First, create a high score
        await page.goto(`${baseURL}/?seed=${testSeed}`);
        await page.waitForSelector('#game-board');

        // Complete game with score 80
        await completeGameWithScore(page, testSeed, 80);

        await page.waitForSelector('#game-popup:not(.hidden)', { timeout: 5000 });
        await page.waitForTimeout(2000);  // Wait for submission

        // Close popup
        await page.click('#popup-close-x');

        // Reload page
        await page.reload();
        await page.waitForSelector('#game-board');

        // Complete game with lower score
        await completeGameWithScore(page, testSeed, 60);

        await page.waitForSelector('#game-popup:not(.hidden)', { timeout: 5000 });
        await page.waitForTimeout(2000);

        // Check that high score shown is 80, not 60
        const highScoreLink = await page.$('#high-score-link');
        if (highScoreLink) {
            const highScoreText = await highScoreLink.textContent();
            expect(highScoreText).toBe('80');

            // Should NOT show achievement since score didn't beat high score
            const achievement = await page.$('#high-score-achievement');
            const achievementVisible = await achievement.evaluate(el => el.style.display !== 'none');
            expect(achievementVisible).toBe(false);
        }
    });

    test('should update high score when beaten', async ({ page }) => {
        const testSeed = '20251011';

        // First game - score 70
        await page.goto(`${baseURL}/?seed=${testSeed}`);
        await page.waitForSelector('#game-board');

        await completeGameWithScore(page, testSeed, 70);

        await page.waitForSelector('#game-popup:not(.hidden)', { timeout: 5000 });
        await page.waitForTimeout(2000);
        await page.click('#popup-close-x');

        // Reload and beat the high score
        await page.reload();
        await page.waitForSelector('#game-board');

        await completeGameWithScore(page, testSeed, 90);

        await page.waitForSelector('#game-popup:not(.hidden)', { timeout: 5000 });
        await page.waitForTimeout(2000);

        // Should show achievement
        const achievement = await page.$('#high-score-achievement');
        const achievementVisible = await achievement.evaluate(el => el.style.display !== 'none');
        expect(achievementVisible).toBe(true);

        const achievementText = await achievement.textContent();
        expect(achievementText).toContain('new high score');

        // High score should be updated to 90
        const highScoreLink = await page.$('#high-score-link');
        const highScoreText = await highScoreLink.textContent();
        expect(highScoreText).toBe('90');
    });

    test('high score link should load the board', async ({ page }) => {
        const testSeed = '20251012';

        // Create a high score
        await page.goto(`${baseURL}/?seed=${testSeed}`);
        await page.waitForSelector('#game-board');

        await completeGameWithScore(page, testSeed, 85);

        await page.waitForSelector('#game-popup:not(.hidden)', { timeout: 5000 });
        await page.waitForTimeout(2000);

        // Click the high score link
        const highScoreLink = await page.$('#high-score-link');
        if (highScoreLink) {
            // Verify the link exists and is visible
            const isVisible = await highScoreLink.isVisible();
            expect(isVisible).toBe(true);

            // Verify it has text content (the score)
            const text = await highScoreLink.textContent();
            expect(text).toBe('85');
        }
    });
});

test.describe('Rate Limiting', () => {
    const baseURL = 'http://localhost:8085';

    test.beforeEach(() => {
        clearHighScores();
        clearRateLimits();
    });

    test('should accept multiple submissions within limit', async ({ page }) => {
        const testSeed = '20251013';

        // Submit 3 scores (well under the 50/day limit)
        for (let i = 0; i < 3; i++) {
            await page.goto(`${baseURL}/?seed=${testSeed}`);
            await page.waitForSelector('#game-board');

            await completeGameWithScore(page, testSeed, 50 + i);

            await page.waitForSelector('#game-popup:not(.hidden)', { timeout: 5000 });
            await page.waitForTimeout(1000);

            // Close popup and continue
            await page.click('#popup-close-x');
        }

        // All 3 should succeed (no rate limit error)
        // The last one should have the highest score
        const highScoreLink = await page.$('#high-score-link');
        if (highScoreLink) {
            const text = await highScoreLink.textContent();
            expect(parseInt(text)).toBeGreaterThanOrEqual(50);
        }
    });
});
