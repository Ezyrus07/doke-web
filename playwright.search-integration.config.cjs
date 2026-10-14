const path = require('node:path');
const captured = require('./playwright.p31.config.cjs');
const port = 5627;
const outputRoot = path.resolve(__dirname, 'outputs/search-ux-006/journey-b');
module.exports = {
  ...captured,
  reporter: [['list'], ['json', { outputFile: path.join(outputRoot, 'results.json') }]],
  outputDir: path.join(outputRoot, 'artifacts'),
  use: {
    ...captured.use,
    baseURL: `http://127.0.0.1:${port}`,
    launchOptions: { ignoreDefaultArgs: ['--no-sandbox'] },
  },
  webServer: {
    ...captured.webServer,
    command: `node scripts/serve-static-site.js --host=127.0.0.1 --port=${port}`,
    url: `http://127.0.0.1:${port}/index.html`,
    cwd: __dirname,
  },
};
