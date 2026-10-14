const path = require('node:path');
const base = require('./playwright.config.js');
const outputRoot = path.resolve(__dirname, '../../outputs/P3.1/targeted-browser');
const port = 5621;
module.exports = {
  ...base,
  testDir: path.join(__dirname, 'tests/e2e'),
  testMatch: 'marketplace-journey.spec.js',
  grep: /(?:^| )synthetic journey with memory fixture bridge at 1366px$/,
  workers: 1,
  retries: 0,
  fullyParallel: false,
  reporter: [['list'], ['json', { outputFile: path.join(outputRoot, 'results.json') }]],
  outputDir: path.join(outputRoot, 'artifacts'),
  use: {
    ...base.use,
    browserName: 'chromium',
    channel: 'msedge',
    headless: true,
    launchOptions: {},
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on',
    screenshot: 'on',
    video: 'off',
  },
  webServer: {
    command: `node scripts/serve-static-site.js --host=127.0.0.1 --port=${port}`,
    cwd: __dirname,
    url: `http://127.0.0.1:${port}/index.html`,
    reuseExistingServer: false,
    timeout: base.webServer.timeout,
    env: { ...process.env, DOKE_PLAYWRIGHT_LIVE_SEARCH: '0', DOKE_E2E_DISABLE_REMOTE_SERVICES: '1' },
  },
};
