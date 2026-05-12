#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const runtime = read('assets/js/core/runtime-config.js');
const flags = read('assets/js/core/feature-flags.js');
const app = read('assets/js/core/app.js');

const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
const oldDrawerRefs = [];
const appRouterRisks = [];

for (const file of htmlFiles) {
  const source = read(file);
  if (source.includes('assets/js/pages/home/drawer.js')) {
    oldDrawerRefs.push(file);
  }
}

const checks = [
  {
    name: 'runtime-default-disables-instant-shell-navigation',
    pass: /instantShellNavigation\s*:\s*false/.test(runtime),
    detail: 'assets/js/core/runtime-config.js must keep instantShellNavigation disabled by default.'
  },
  {
    name: 'feature-flags-expose-instant-navigation-aliases',
    pass: ['instantNavigation', 'shellNavigation', 'routeSwap'].every((key) => flags.includes(key) && flags.includes('instantShellNavigation')),
    detail: 'feature flag aliases must point to instantShellNavigation for controlled future reactivation.'
  },
  {
    name: 'app-router-bypasses-shell-swap-when-flag-disabled',
    pass: app.includes('const isInstantShellNavigationEnabled') && app.includes('if (!isInstantShellNavigationEnabled()) return true;'),
    detail: 'app.js must not swap partial page content unless instantShellNavigation is explicitly enabled.'
  },
  {
    name: 'popstate-does-not-reload-when-native-navigation-default-is-disabled',
    pass: app.includes('if (!isInstantShellNavigationEnabled()) return;') && app.includes('window.addEventListener("popstate"'),
    detail: 'native browser history must be left alone when instant shell navigation is disabled.'
  },
  {
    name: 'drawer-imports-use-shared-ui-path',
    pass: oldDrawerRefs.length === 0,
    detail: oldDrawerRefs.length ? `Old drawer path still referenced in: ${oldDrawerRefs.join(', ')}` : 'No HTML references the legacy home drawer path.'
  },
  {
    name: 'shared-mobile-drawer-file-exists',
    pass: exists('assets/js/ui/mobile-drawer.js'),
    detail: 'assets/js/ui/mobile-drawer.js must exist.'
  }
];

const report = {
  cycle: 148,
  name: 'native-navigation-stability',
  generatedAt: new Date().toISOString(),
  status: checks.every((check) => check.pass) ? 'passed' : 'failed',
  checks,
  oldDrawerRefs,
  decision: {
    instantShellNavigation: false,
    reason: 'Full-document navigation is the safe default until all page-level CSS/JS lifecycle contracts are stable. This avoids first-load/partial-route layout drift that only normalizes after F5.'
  }
};

const output = path.join(root, 'docs/validation/global-cycle-148-native-navigation-stability-report.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2));

if (report.status !== 'passed') {
  console.error('[audit:native-navigation-stability] failed');
  for (const check of checks.filter((item) => !item.pass)) {
    console.error(`- ${check.name}: ${check.detail}`);
  }
  process.exit(1);
}

console.log('[audit:native-navigation-stability] passed');
