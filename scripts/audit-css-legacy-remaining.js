const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CSS_ROOT = path.join(ROOT, 'assets', 'css');
const OUT = path.join(ROOT, 'docs', 'validation', 'global-cycle-109-css-legacy-remaining-report.json');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function classify(file, content) {
  const relative = rel(file);
  const name = path.basename(relative).toLowerCase();
  const directory = path.dirname(relative).toLowerCase();
  const flags = [];

  if (/legacy|old|backup|deprecated|removed|unused/.test(relative.toLowerCase())) flags.push('explicit-legacy-marker');
  if (/stage\d+|v\d+|final|fix|hotfix|ajuste|novo|redesign/.test(name)) flags.push('version-or-temporary-name-marker');
  if (/!important/.test(content)) flags.push('important-declaration');
  if (/^assets\/css\/pages\//.test(relative)) flags.push('page-owned-css');
  if (/^assets\/css\/components\//.test(relative)) flags.push('component-owned-css');
  if (/^assets\/css\/patterns\//.test(relative)) flags.push('pattern-owned-css');
  if (/^assets\/css\/core\//.test(relative)) flags.push('core-owned-css');
  if (/^assets\/css\/(?!core\/|components\/|patterns\/|pages\/)/.test(relative)) flags.push('root-or-misc-css');
  if (/mobile|responsive|desktop|tablet/.test(name)) flags.push('viewport-specific-css');

  let risk = 'low';
  if (flags.includes('explicit-legacy-marker') || flags.includes('root-or-misc-css')) risk = 'high';
  else if (flags.includes('version-or-temporary-name-marker') || flags.includes('important-declaration')) risk = 'medium';

  let recommendedAction = 'keep-under-owner';
  if (risk === 'high') recommendedAction = 'review-before-desktop-phase';
  if (risk === 'medium') recommendedAction = 'baseline-before-edit';
  if (flags.includes('explicit-legacy-marker')) recommendedAction = 'archive-or-remove-only-after-baseline';

  return { file: relative, risk, flags, recommendedAction };
}

const cssFiles = walk(CSS_ROOT).filter((file) => file.endsWith('.css')).sort();
const items = cssFiles.map((file) => classify(file, read(file)));
const byRisk = items.reduce((acc, item) => {
  acc[item.risk] = (acc[item.risk] || 0) + 1;
  return acc;
}, {});
const byAction = items.reduce((acc, item) => {
  acc[item.recommendedAction] = (acc[item.recommendedAction] || 0) + 1;
  return acc;
}, {});
const flagCounts = items.flatMap((item) => item.flags).reduce((acc, flag) => {
  acc[flag] = (acc[flag] || 0) + 1;
  return acc;
}, {});

const report = {
  cycle: 109,
  name: 'css legacy remaining audit',
  status: 'passed',
  policy: {
    removedCss: false,
    visualChanges: false,
    requiresBaselineBeforeRemoval: true,
  },
  summary: {
    totalCssFiles: cssFiles.length,
    byRisk,
    byAction,
    flagCounts,
  },
  items,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(`[global-cycle-109] css legacy remaining: passed (${cssFiles.length} css files mapped)`);
