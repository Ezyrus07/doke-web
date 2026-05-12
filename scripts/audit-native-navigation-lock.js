#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [];
const add = (name, passed, details = {}) => checks.push({ name, passed: Boolean(passed), details });

const runtimeFile = 'assets/js/core/runtime-config.js';
const flagsFile = 'assets/js/core/feature-flags.js';
const appFile = 'assets/js/core/app.js';

const runtime = exists(runtimeFile) ? read(runtimeFile) : '';
const flags = exists(flagsFile) ? read(flagsFile) : '';
const app = exists(appFile) ? read(appFile) : '';

add('runtime-config exists', Boolean(runtime), { file: runtimeFile });
add('feature-flags exists', Boolean(flags), { file: flagsFile });
add('app exists', Boolean(app), { file: appFile });
add('instant shell navigation disabled by default', /instantShellNavigation\s*:\s*false/.test(runtime), { file: runtimeFile });
add('instant navigation aliases registered', ['instantNavigation', 'shellNavigation', 'routeSwap'].every((alias) => flags.includes(alias)), { file: flagsFile });
add('app has instant navigation guard helper', app.includes('isInstantShellNavigationEnabled'), { file: appFile });
add('shell swap bypasses when disabled', /!isInstantShellNavigationEnabled\(\)\)\s*return true/.test(app), { file: appFile });
add('DokeNavigate falls back to native navigation through bypass', app.includes('window.location.href = href') && app.includes('shouldBypassShellSwap(href)'), { file: appFile });

const failed = checks.filter((check) => !check.passed);
const report = {
  cycle: 153,
  name: 'native-navigation-lock',
  status: failed.length ? 'failed' : 'passed',
  rationale: 'Partial shell routing is locked off by default because it causes first-load/layout instability across HTML documents. Native navigation is the stable baseline until the HTML/CSS desktop phase is closed.',
  checks,
  failed
};

const outFile = path.join(root, 'docs/validation/global-cycle-153-native-navigation-lock-report.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n');

if (failed.length) {
  console.error('[audit:native-navigation-lock] failed');
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}

console.log('[audit:native-navigation-lock] passed');
