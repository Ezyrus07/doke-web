#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const app = read('assets/js/core/app.js');
const runtime = read('assets/js/core/runtime-config.js');
const flags = read('assets/js/core/feature-flags.js');

const checks = [
  {
    name: 'runtime exposes instantShellNavigation flag',
    passed: /instantShellNavigation\s*:\s*true/.test(runtime)
  },
  {
    name: 'feature flags expose navigation aliases',
    passed: /instantNavigation:\s*['"]instantShellNavigation['"]/.test(flags) &&
      /shellNavigation:\s*['"]instantShellNavigation['"]/.test(flags) &&
      /routeSwap:\s*['"]instantShellNavigation['"]/.test(flags)
  },
  {
    name: 'router can be disabled by feature flag',
    passed: /isInstantShellNavigationEnabled/.test(app) && /if \(!isInstantShellNavigationEnabled\(\)\) return true;/.test(app)
  },
  {
    name: 'instant navigation syncs shell chrome before replacing page',
    passed: /syncShellFromDocument\(nextDoc\);\s*syncStandaloneUiFromDocument\(nextDoc\);\s*currentPage\.replaceWith\(nextPageNode\);/s.test(app)
  },
  {
    name: 'shell sync replaces full topbar from next document',
    passed: /currentTopbar\.replaceWith\(nextTopbar\.cloneNode\(true\)\);/.test(app)
  },
  {
    name: 'shell sync handles mobile scrim add replace remove',
    passed: /currentScrim && nextScrim/.test(app) && /currentScrim\.remove\(\)/.test(app) && /appendChild\(nextScrim\.cloneNode\(true\)\)/.test(app)
  }
];

const failed = checks.filter((check) => !check.passed);
const report = {
  audit: 'stable-shell-navigation',
  cycle: 152,
  status: failed.length ? 'failed' : 'passed',
  checks,
  summary: {
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length
  }
};

fs.mkdirSync(path.join(root, 'docs/validation'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'docs/validation/global-cycle-152-stable-shell-navigation-report.json'),
  JSON.stringify(report, null, 2) + '\n'
);

if (failed.length) {
  console.error('Stable shell navigation audit failed:');
  failed.forEach((check) => console.error(`- ${check.name}`));
  process.exit(1);
}

console.log('Stable shell navigation audit passed.');
