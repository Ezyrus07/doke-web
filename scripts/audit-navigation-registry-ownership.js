#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const registryPath = 'assets/js/core/navigation-registry.js';
const consumers = [
  'assets/js/core/app.js',
  'assets/js/core/stable-shell-router.js',
  'assets/js/core/social-page-router.js',
  'assets/js/components/mobile-app-shell.js',
  'assets/js/ui/mobile-drawer-standard.js'
];
const forbidden = [
  'var SAFE_ROUTES', 'var NATIVE_ONLY_ROUTES', 'var HYDRATION_BARRIER_ROUTES',
  'var INTERNAL_DIRECT_HYDRATION_ROUTES', 'var PROFILE_ACTIVE_PATHS', 'var ROUTE_INIT',
  'PAGE_CONFIG =', 'FALLBACK_ROUTE_GROUPS', 'nativeOnlyPaths = new Set',
  'REGISTERED_INTERNAL_VIEW_PATHS'
];
const requiredApis = [
  'getRouteMetadata', 'isSafeRoute', 'isNativeOnlyRoute',
  'requiresHydrationBarrier', 'shouldCommitHydrationDirect',
  'getInitializers', 'getPriorityWarmRoutes', 'getInternalPaths'
];
const failures = [];
const registry = fs.readFileSync(path.join(ROOT, registryPath), 'utf8');
requiredApis.forEach((api) => {
  if (!registry.includes(api + ': ' + api)) failures.push('Registry does not expose ' + api + '.');
});
consumers.forEach((file) => {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  forbidden.forEach((marker) => {
    if (source.includes(marker)) failures.push(file + ' still owns route metadata marker: ' + marker);
  });
  if (!source.includes('DokeNavigationRegistry')) failures.push(file + ' does not consume DokeNavigationRegistry.');
});
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/frontend-structural-gates.json'), 'utf8'));
if ((config.baseline.routeRegistryDebtFiles || []).length) failures.push('FE-G01 route registry baseline is not empty.');
const reportPath = path.join(ROOT, 'reports/generated/navigation-registry-ownership-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify({ status: failures.length ? 'fail' : 'pass', failures, registryPath, consumers, requiredApis }, null, 2) + '\n');
if (failures.length) {
  console.error('[audit:navigation-registry-ownership] failed');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}
console.log('[audit:navigation-registry-ownership] passed');
