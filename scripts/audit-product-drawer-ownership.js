#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT = 'docs/validation/global-cycle-96-product-drawer-ownership-report.json';
const DRAWER_SRC = 'assets/js/pages/home/drawer.js';

const htmlFiles = fs.readdirSync(ROOT)
  .filter((file) => file.endsWith('.html'))
  .sort();

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
    scripts.push({ raw: match[0], attrs, src: srcMatch[1], normalizedSrc: normalizeSrc(srcMatch[1]) });
  }
  return scripts;
}

const usages = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const scripts = extractScripts(html).filter((script) => script.normalizedSrc === DRAWER_SRC);
  for (const script of scripts) {
    usages.push({
      page: file,
      src: script.src,
      hasDefer: /\bdefer\b/i.test(script.attrs),
      hasModule: /\btype=["']module["']/i.test(script.attrs),
      hasQuery: script.src.includes('?'),
      currentOwnerPath: 'pages/home',
      actualRole: 'shared-mobile-drawer-runtime',
      isHomePage: file === 'index.html',
      ownershipDecision: file === 'index.html' ? 'keep-behavior-home-entry' : 'cross-page-shared-runtime-candidate'
    });
  }
}

const crossPageUsages = usages.filter((usage) => !usage.isHomePage);
const report = {
  cycle: 96,
  name: 'product-drawer-ownership',
  generatedAt: new Date().toISOString(),
  scope: {
    type: 'ownership audit only',
    drawerSource: DRAWER_SRC,
    visualChanges: false,
    jsRemovalPerformed: false,
    physicalRenamePerformed: false
  },
  summary: {
    usageCount: usages.length,
    crossPageUsageCount: crossPageUsages.length,
    pages: usages.map((usage) => usage.page),
    risk: crossPageUsages.length > 0 ? 'path-name-mismatch-home-owned-file-used-as-shared-runtime' : 'home-only',
    recommendedNextAction: 'Normalize loading first; postpone physical rename until all drawer consumers are covered by a dedicated migration audit.'
  },
  usages
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), `${JSON.stringify(report, null, 2)}\n`);

console.log(`[cycle-96] Drawer usage count: ${report.summary.usageCount}`);
console.log(`[cycle-96] Cross-page usage count: ${report.summary.crossPageUsageCount}`);
console.log(`[cycle-96] Output: ${OUTPUT}`);

if (usages.length === 0) process.exitCode = 1;
