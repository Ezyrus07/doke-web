#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT = 'docs/validation/global-cycle-106-shared-mobile-drawer-handoff-report.json';
const DRAWER_SRC = 'assets/js/ui/mobile-drawer.js';
const LEGACY_DRAWER_SRC = 'assets/js/pages/home/drawer.js';
const HANDOFF_DOC = 'docs/GLOBAL-CYCLES-CLOSURE-HANDOFF.md';

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function normalizeSrc(src) {
  return String(src || '').split('?')[0].split('#')[0];
}

function extractScripts(html) {
  const scripts = [];
  const regex = /<script\b([^>]*)><\/script>/gi;
  let match;
  while ((match = regex.exec(html))) {
    const attrs = match[1] || '';
    const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    scripts.push({ attrs, src: srcMatch[1], normalizedSrc: normalizeSrc(srcMatch[1]) });
  }
  return scripts;
}

const htmlFiles = fs.readdirSync(ROOT).filter((file) => file.endsWith('.html')).sort();
const usages = [];
for (const file of htmlFiles) {
  const scripts = extractScripts(read(file)).filter((script) => script.normalizedSrc === DRAWER_SRC || script.normalizedSrc === LEGACY_DRAWER_SRC);
  scripts.forEach((script) => usages.push({
    page: file,
    src: script.src,
    hasDefer: /\bdefer\b/i.test(script.attrs),
    normalizedSrc: script.normalizedSrc,
    currentPathOwner: script.normalizedSrc === DRAWER_SRC ? 'ui' : 'pages/home',
    actualRuntimeRole: 'shared-mobile-drawer',
    migrationDecision: script.normalizedSrc === DRAWER_SRC ? 'migrated-to-shared-ui-path' : 'legacy-path-still-pending-removal'
  }));
}

const report = {
  cycle: 106,
  title: 'Shared mobile drawer handoff',
  goal: 'Record the cross-page drawer ownership mismatch without risky physical rename.',
  scope: {
    visualChanges: false,
    responsiveWork: false,
    physicalRenamePerformed: true,
    jsRemovalPerformed: false,
    drawerSource: DRAWER_SRC,
    legacyDrawerSource: LEGACY_DRAWER_SRC,
  },
  checks: {
    drawerFileExists: fs.existsSync(path.join(ROOT, DRAWER_SRC)),
    handoffDocExists: fs.existsSync(path.join(ROOT, HANDOFF_DOC)),
    drawerHasConsumers: usages.length > 0,
    allUsagesDefer: usages.every((usage) => usage.hasDefer),
    crossPageSharedRuntimeConfirmed: usages.some((usage) => usage.page !== 'index.html'),
  },
  summary: {
    usageCount: usages.length,
    pages: usages.map((usage) => usage.page),
    recommendedFutureAction: 'Remove legacy drawer source after applying the cycle and confirming no legacy imports remain.',
  },
  usages,
};

const failed = Object.entries(report.checks).filter(([, value]) => !value).map(([name]) => name);
report.status = failed.length === 0 ? 'passed' : 'failed';
report.failedChecks = failed;

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), `${JSON.stringify(report, null, 2)}\n`);

console.log(`[global-cycle-106] shared mobile drawer handoff: ${report.status}`);
console.log(`[global-cycle-106] drawer usages: ${report.summary.usageCount}`);
if (report.status !== 'passed') process.exit(1);
