#!/usr/bin/env node
/*
 * Doke active legacy structures inventory.
 *
 * This is intentionally an inventory gate, not a cleanup script. It does not
 * delete files or rewrite HTML. The goal is to make legacy/transition layers
 * visible before any CSS/shell/router work starts.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const generatedReportsDir = path.join(root, 'reports', 'generated');
const reportPath = path.join(generatedReportsDir, 'active-legacy-structures-report.json');

const bannedNameTokens = [
  'fix',
  'hotfix',
  'match',
  'parity',
  'final',
  'rescue',
  'adjustment',
  'cleanup',
  'polish',
  'normalization',
  'legacy',
  'redesign',
  'standardization',
  'repair'
];

const authorityGroups = {
  shell: ['shell', 'app-shell', 'mobile-app-shell', 'desktop-shell', 'stable-shell'],
  header: ['header', 'topbar', 'app-header'],
  rail: ['rail', 'width', 'page-width'],
  scroll: ['scroll', 'safari'],
  cards: ['card', 'marketplace', 'worker', 'publication'],
  mobile: ['mobile', 'tablet', 'ipad', 'responsive'],
  router: ['router', 'route', 'navigation'],
  home: ['home', 'index']
};

const htmlLinkRe = /<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi;
const scriptRe = /<script\b[^>]*\bsrc=["']([^"']+\.js(?:\?[^"']*)?)["'][^>]*>/gi;
const importRe = /@import\s+(?:url\()?['"]?([^'"\);]+\.css(?:\?[^'"\)]*)?)['"]?\)?/gi;

function walk(dir, predicate, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
      walk(full, predicate, output);
    } else if (predicate(full)) {
      output.push(full);
    }
  }
  return output;
}

function rel(full) {
  return path.relative(root, full).replace(/\\/g, '/');
}

function stripQuery(value) {
  return value.replace(/\?.*$/, '').replace(/^\.\//, '');
}

function normalizeCssImport(imported, fromAsset) {
  const clean = stripQuery(imported);
  if (clean.startsWith('/')) return clean.replace(/^\/+/, '');
  if (clean.startsWith('assets/')) return clean;
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromAsset), clean));
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function findAll(regex, text) {
  const out = [];
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(text))) out.push(match[1]);
  return out;
}

function tokenMatches(filePath) {
  const base = path.basename(filePath).toLowerCase();
  return bannedNameTokens.filter((token) => new RegExp(`(^|[-_.])${token}($|[-_.])`).test(base));
}

function classify(filePath) {
  const value = filePath.toLowerCase();
  return Object.fromEntries(
    Object.entries(authorityGroups).map(([group, tokens]) => [
      group,
      tokens.some((token) => value.includes(token))
    ])
  );
}

const htmlFiles = walk(root, (file) => file.endsWith('.html'));
const cssFiles = walk(path.join(root, 'assets', 'css'), (file) => file.endsWith('.css'));
const jsFiles = walk(path.join(root, 'assets', 'js'), (file) => file.endsWith('.js'));

const pages = htmlFiles.map((file) => {
  const text = read(file);
  const css = findAll(htmlLinkRe, text).map(stripQuery);
  const js = findAll(scriptRe, text).map(stripQuery);
  return {
    page: rel(file),
    cssCount: css.length,
    jsCount: js.length,
    css,
    js,
    cssBannedNames: css
      .map((asset) => ({ asset, tokens: tokenMatches(asset) }))
      .filter((item) => item.tokens.length),
    jsBannedNames: js
      .map((asset) => ({ asset, tokens: tokenMatches(asset) }))
      .filter((item) => item.tokens.length)
  };
});

const activeCss = new Set(pages.flatMap((page) => page.css));
const activeJs = new Set(pages.flatMap((page) => page.js));
const cssReferencedByImport = new Map();

const cssInventory = cssFiles.map((file) => {
  const relative = rel(file);
  const text = read(file);
  const imports = findAll(importRe, text).map((imported) => normalizeCssImport(imported, relative));
  for (const imported of imports) {
    if (!cssReferencedByImport.has(imported)) cssReferencedByImport.set(imported, []);
    cssReferencedByImport.get(imported).push(relative);
  }
  const importantCount = (text.match(/!important/g) || []).length;
  const bannedTokens = tokenMatches(relative);
  const stats = fs.statSync(file);
  return {
    file: relative,
    activeDirectLink: activeCss.has(relative),
    importedByActiveOrKnownCss: false,
    sizeBytes: stats.size,
    importCount: imports.length,
    importantCount,
    bannedTokens,
    authority: classify(relative),
    imports
  };
});

const knownCssByPath = new Map(cssInventory.map((item) => [item.file, item]));
for (const item of cssInventory) {
  if (!item.activeDirectLink) continue;
  const stack = [...item.imports];
  const seen = new Set();
  while (stack.length) {
    const imported = stack.pop();
    if (seen.has(imported)) continue;
    seen.add(imported);
    const target = knownCssByPath.get(imported);
    if (!target) continue;
    target.importedByActiveOrKnownCss = true;
    for (const nested of target.imports) stack.push(nested);
  }
}

const jsInventory = jsFiles.map((file) => {
  const relative = rel(file);
  return {
    file: relative,
    activeDirectScript: activeJs.has(relative),
    sizeBytes: fs.statSync(file).size,
    bannedTokens: tokenMatches(relative),
    authority: classify(relative)
  };
});

const activeOrImportedCss = cssInventory.filter((item) => item.activeDirectLink || item.importedByActiveOrKnownCss);
const activeLegacyCss = activeOrImportedCss.filter((item) => item.bannedTokens.length);
const activeLegacyJs = jsInventory.filter((item) => item.activeDirectScript && item.bannedTokens.length);
const inactiveLegacyCss = cssInventory.filter((item) => !item.activeDirectLink && !item.importedByActiveOrKnownCss && item.bannedTokens.length);
const highRiskActiveCss = activeOrImportedCss
  .filter((item) => item.sizeBytes >= 50000 || item.importantCount >= 100 || item.importCount >= 10)
  .sort((a, b) => (b.importantCount - a.importantCount) || (b.sizeBytes - a.sizeBytes));

const pageRisk = pages
  .map((page) => {
    const linkedStats = page.css.map((asset) => knownCssByPath.get(asset)).filter(Boolean);
    const totalCssBytes = linkedStats.reduce((sum, item) => sum + item.sizeBytes, 0);
    const totalImportant = linkedStats.reduce((sum, item) => sum + item.importantCount, 0);
    const totalImports = linkedStats.reduce((sum, item) => sum + item.importCount, 0);
    return {
      page: page.page,
      cssCount: page.cssCount,
      jsCount: page.jsCount,
      totalDirectCssBytes: totalCssBytes,
      totalDirectImportant: totalImportant,
      totalDirectImports: totalImports,
      activeLegacyCssLinks: page.cssBannedNames,
      activeLegacyJsLinks: page.jsBannedNames
    };
  })
  .sort((a, b) => (b.cssCount - a.cssCount) || (b.totalDirectImportant - a.totalDirectImportant));

const authorityCollisions = Object.keys(authorityGroups).map((group) => {
  const activeFiles = activeOrImportedCss
    .filter((item) => item.authority[group])
    .map((item) => item.file)
    .sort();
  return { group, activeCssFiles: activeFiles, count: activeFiles.length };
}).filter((entry) => entry.count >= 2);

const warnings = [];
if (activeLegacyCss.length) warnings.push(`${activeLegacyCss.length} active/imported CSS files have legacy/remediation naming tokens.`);
if (activeLegacyJs.length) warnings.push(`${activeLegacyJs.length} active JS files have legacy/remediation naming tokens.`);
if (highRiskActiveCss.length) warnings.push(`${highRiskActiveCss.length} active/imported CSS files exceed size, import, or !important risk thresholds.`);
if (pageRisk.some((page) => page.cssCount >= 40)) warnings.push('Some pages still load 40+ direct CSS files.');
if (authorityCollisions.length) warnings.push('Multiple active CSS files claim the same shell/header/rail/mobile/card authority groups.');

const report = {
  ok: false,
  status: 'inventory-with-structural-debt',
  checkedAt: new Date().toISOString(),
  totals: {
    htmlFiles: htmlFiles.length,
    cssFiles: cssFiles.length,
    jsFiles: jsFiles.length,
    activeDirectCss: activeCss.size,
    activeDirectJs: activeJs.size,
    activeOrImportedCss: activeOrImportedCss.length,
    activeLegacyCss: activeLegacyCss.length,
    activeLegacyJs: activeLegacyJs.length,
    inactiveLegacyCss: inactiveLegacyCss.length,
    highRiskActiveCss: highRiskActiveCss.length
  },
  thresholds: {
    highRiskCssSizeBytes: 50000,
    highRiskImportantCount: 100,
    highRiskImportCount: 10,
    pageDirectCssWarningCount: 40
  },
  warnings,
  highestRiskPages: pageRisk.slice(0, 12),
  highestRiskActiveCss: highRiskActiveCss.slice(0, 30).map(({ imports, ...rest }) => rest),
  activeLegacyCss: activeLegacyCss.map(({ imports, ...rest }) => rest),
  activeLegacyJs,
  inactiveLegacyCss: inactiveLegacyCss.map(({ imports, ...rest }) => rest),
  authorityCollisions,
  pageAssets: pages,
  nextSteps: [
    'Do not delete legacy CSS only by name. First remove or replace direct HTML links/import chains with proof.',
    'Start with index.html/home because it combines high CSS import count, card rails, mobile shell, and route transition visibility.',
    'Treat shell/header/rail as separate authorities. Do not add a new final/fix CSS layer.',
    'For ChatGPT/Codex changes, require this audit report plus AGENTS.md before any CSS/router edit.'
  ]
};

fs.mkdirSync(generatedReportsDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');

console.log(`[active-legacy-structures] ${report.status}`);
console.log(`- pages: ${report.totals.htmlFiles}`);
console.log(`- css files: ${report.totals.cssFiles} (${report.totals.activeDirectCss} direct, ${report.totals.activeOrImportedCss} active/imported)`);
console.log(`- js files: ${report.totals.jsFiles} (${report.totals.activeDirectJs} direct)`);
console.log(`- active legacy/remediation css: ${report.totals.activeLegacyCss}`);
console.log(`- active legacy/remediation js: ${report.totals.activeLegacyJs}`);
console.log(`- high risk active css: ${report.totals.highRiskActiveCss}`);
console.log(`- report: ${path.relative(root, reportPath).replace(/\\/g, '/')}`);
