# Screenshots Directory

This directory contains test screenshots from automated testing of the WikiLetters tile rack functionality.

## Current Screenshots

### Playwright Tests
- `playwright-chromium.png` - Chromium browser test results
- `playwright-firefox.png` - Firefox browser test results
- `playwright-webkit.png` - WebKit (Safari) browser test results
- `playwright-mobile.png` - Mobile touch simulation test

### Puppeteer Tests
- `tile-rack-test.png` - Main Puppeteer test output
- `tile-rack-chromium.png` - Chromium-specific test
- `tile-rack-firefox.png` - Firefox-specific test
- `tile-rack-webkit.png` - WebKit-specific test

## Archive Directory

The `archive/` subdirectory contains 36 older test screenshots from previous test runs. These are preserved for historical reference but are no longer actively used.

## Test Environments

Screenshots are generated from:
- **Main Game**: http://localhost:8085/
- **Tile Rack Test App**: http://localhost:8086/

## Updating Screenshots

Test scripts are configured to automatically save new screenshots to this directory:
- Puppeteer tests: `test-rack.js`
- Playwright tests: `test-playwright-simple.js`

All test scripts now use the path `../screenshots/` for saving new screenshots.