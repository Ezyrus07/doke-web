#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT = 'docs/validation/global-cycle-98-product-drawer-loading-report.json';
const DRAWER_SRC = 'assets/js/ui/mobile-drawer.js';
const LEGACY_DRAWER_SRC = 'assets/js/pages/home/drawer.js';

const htmlFiles = fs.readdirSync(ROOT)
  .filter((file) => file.endsWith('.html'))
  .sort();

function normalizeSrc(src) {
  return String(src || '').split('?')[0].split('#')[0];
}

const usages = [];
const failures = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const regex = /<script\b([^>]*)><\/script>/gi;
  let match;
  while ((match = regex.exec(html))) {
    const attrs = match[1] || '';
    const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = srcMatch[1];
    if (normalizeSrc(src) !== DRAWER_SRC && normalizeSrc(src) !== LEGACY_DRAWER_SRC) continue;
    const usage = {
      page: file,
      src,
      hasDefer: /\bdefer\b/i.test(attrs),
      hasModule: /\btype=["']module["']/i.test(attrs),
      hasQuery: src.includes('?')
    };
    usage.status = (usage.hasDefer || usage.hasModule) && !usage.hasQuery ? 'passed' : 'failed';
    usages.push(usage);
    if (usage.status !== 'passed') failures.push(usage);
  }
}

const report = {
  cycle: 98,
  name: 'product-drawer-loading',
  generatedAt: new Date().toISOString(),
  scope: {
    type: 'safe loading normalization gate',
    drawerSource: DRAWER_SRC,
    legacyDrawerSource: LEGACY_DRAWER_SRC,
    visualChanges: false,
    jsRemovalPerformed: false,
    orderChanged: false
  },
  summary: {
    usageCount: usages.length,
    failedUsageCount: failures.length,
    status: failures.length === 0 && usages.length > 0 ? 'passed' : 'failed'
  },
  usages,
  failures
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), `${JSON.stringify(report, null, 2)}\n`);

if (report.summary.status !== 'passed') {
  console.error(`[cycle-98] Drawer loading audit failed: ${failures.length} issue(s).`);
  process.exit(1);
}
console.log(`[cycle-98] Drawer loading audit passed: ${usages.length} usage(s).`);
