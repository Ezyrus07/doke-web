#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const runtime = fs.readFileSync(path.join(ROOT,'assets/js/core/runtime-config.js'),'utf8');
const features = fs.readFileSync(path.join(ROOT,'assets/js/core/feature-flags.js'),'utf8');
const app = fs.readFileSync(path.join(ROOT,'assets/js/core/app.js'),'utf8');
const map = JSON.parse(fs.readFileSync(path.join(ROOT,'docs/validation/global-cycle-154-shell-topbar-map-report.json'),'utf8'));
const blockers = [];
if (!/instantShellNavigation\s*:\s*false/.test(runtime)) blockers.push('instantShellNavigation must be false by default');
if (!/instantNavigation['"]?\s*:\s*['"]instantShellNavigation/.test(features)) blockers.push('instantNavigation alias missing');
if (!/if \(!isInstantShellNavigationEnabled\(\)\) return true;/.test(app)) blockers.push('app.js must bypass shell swap when flag is disabled');
const absentTopbars = map.pages.filter(p => !p.hasTopbar).map(p => p.file);
const notEligible = absentTopbars.concat(map.pages.filter(p => p.hasTopbar && !p.topbarStandardClass).map(p => p.file));
const report = {
  cycle:157,
  name:'partial-navigation-readiness',
  generatedAt:new Date().toISOString(),
  routeSwapDefault: 'disabled',
  routeSwapEligibleNow: false,
  absentTopbars,
  notEligible,
  blockers,
  decision: 'keep-native-navigation-until-topbar-visual-contract-is-normalized',
  status: blockers.length ? 'failed' : 'passed'
};
fs.writeFileSync(path.join(ROOT,'docs/validation/global-cycle-157-partial-navigation-readiness-report.json'), JSON.stringify(report,null,2));
if (blockers.length) { console.error('[audit:partial-navigation-readiness] failed', blockers); process.exit(1); }
console.log('[audit:partial-navigation-readiness] passed (route swap remains disabled)');
