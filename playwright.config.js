const { defineConfig } = require('@playwright/test');

const executablePath = process.env.DOKE_PLAYWRIGHT_EXECUTABLE_PATH || '';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 7_500 },
  fullyParallel: false,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/generated/playwright-html', open: 'never' }],
    ['json', { outputFile: 'reports/generated/playwright-results.json' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5500',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: executablePath
      ? {
          executablePath,
          args: ['--no-sandbox', '--disable-dev-shm-usage'],
        }
      : undefined,
  },
  webServer: {
    command: 'node scripts/serve-static-site.js --host=127.0.0.1 --port=5500',
    url: 'http://127.0.0.1:5500/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
