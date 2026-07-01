#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'reports', 'generated', 'mobile-drawer-visual-authority-report.json');
const CSS_ROOT = path.join(ROOT, 'assets', 'css');
const CANONICAL = 'assets/css/components/navigation/mobile-drawer-standard.css';
const APP_SHELL = 'assets/css/pages/app-shell.css';
const EXPECTED_IMPORT = '../components/navigation/mobile-drawer-standard.css?v=20260701-drawer-detail-contract-v1';

const forbiddenPatterns = [
  /\.home-mobile-drawer(?:__|[\s,{.#:[>]|$)/g,
  /\.mobile-drawer(?:__|[\s,{.#:[>]|$)/g,
  /\.app-mobile-drawer(?:__|[\s,{.#:[>]|$)/g,
  /\[data-mobile-home-drawer\]/g,
  /\[data-mobile-drawer\]/g,
  /\[data-mobile-drawer-panel\]/g,
  /\[data-mobile-drawer-backdrop\]/g,
  /\[data-mobile-drawer-authority/g,
  /body\.mobile-home-drawer-open/g,
  /body\.doke-mobile-drawer-open/g,
  /--doke-drawer-width\s*:/g,
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith('.css') ? [full] : [];
  });
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

const failures = [];
const owner = path.join(ROOT, CANONICAL);
if (!fs.existsSync(owner)) failures.push({ file: CANONICAL, reason: 'canonical-drawer-css-missing' });

const appShell = read(path.join(ROOT, APP_SHELL));
if (!appShell.includes(EXPECTED_IMPORT)) {
  failures.push({ file: APP_SHELL, reason: 'canonical-drawer-import-version-missing', expected: EXPECTED_IMPORT });
}

const cssFiles = walk(CSS_ROOT);
const foreignMatches = [];
for (const file of cssFiles) {
  const relative = rel(file);
  const clean = stripComments(read(file));
  if (relative === CANONICAL) continue;
  for (const pattern of forbiddenPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(clean))) {
      foreignMatches.push({ file: relative, token: match[0].trim(), index: match.index });
      if (foreignMatches.length > 40) break;
    }
    if (foreignMatches.length > 40) break;
  }
}

if (foreignMatches.length) {
  failures.push({ reason: 'drawer-anatomy-outside-canonical-css', matches: foreignMatches.slice(0, 40) });
}


const htmlFiles = fs.readdirSync(ROOT).filter((file) => file.endsWith('.html')).sort();
const scriptFailures = [];
for (const file of htmlFiles) {
  const html = read(path.join(ROOT, file));
  if (!html.includes('assets/js/ui/mobile-drawer-standard.js?v=20260701-drawer-detail-contract-v1')) {
    scriptFailures.push({ file, reason: 'canonical-drawer-script-version-missing' });
  }
}
if (scriptFailures.length) {
  failures.push({ reason: 'canonical-drawer-script-version-out-of-sync', matches: scriptFailures });
}

const canonicalCss = stripComments(read(owner));
if (/!important\b/.test(canonicalCss)) {
  failures.push({ file: CANONICAL, reason: 'canonical-drawer-css-contains-important' });
}

if (!canonicalCss.includes('--doke-drawer-width: clamp(236px, 66vw, 264px);')) {
  failures.push({ file: CANONICAL, reason: 'canonical-drawer-width-token-mismatch', expected: 'clamp(236px, 66vw, 264px)' });
}

const report = {
  status: failures.length ? 'failed' : 'passed',
  authority: CANONICAL,
  policy: {
    drawerAnatomyOwner: CANONICAL,
    pageCssMayNotStyleDrawerAnatomy: true,
    priorityFlagsAllowed: false,
  },
  summary: {
    cssFilesScanned: cssFiles.length,
    foreignDrawerSelectorCount: foreignMatches.length,
    failureCount: failures.length,
  },
  failures,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error(`[audit:mobile-drawer-visual-authority] failed (${failures.length} failures)`);
  process.exit(1);
}
console.log('[audit:mobile-drawer-visual-authority] ok');
console.log(`- report: ${path.relative(ROOT, OUT).replace(/\\/g, '/')}`);
