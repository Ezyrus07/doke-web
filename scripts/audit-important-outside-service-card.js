const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CSS_ROOT = path.join(ROOT, 'assets', 'css');
const OUT = path.join(ROOT, 'docs', 'validation', 'global-cycle-111-important-outside-service-card-report.json');

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

function owner(relative) {
  if (/service-card/i.test(relative)) return 'service-card';
  if (relative.startsWith('assets/css/core/')) return 'core';
  if (relative.startsWith('assets/css/components/')) return 'components';
  if (relative.startsWith('assets/css/patterns/')) return 'patterns';
  if (relative.startsWith('assets/css/pages/')) return 'pages';
  return 'misc';
}

const items = [];
for (const file of walk(CSS_ROOT).filter((item) => item.endsWith('.css')).sort()) {
  const content = fs.readFileSync(file, 'utf8');
  const relative = rel(file);
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes('!important')) {
      items.push({
        file: relative,
        line: index + 1,
        owner: owner(relative),
        outsideServiceCard: owner(relative) !== 'service-card',
        sample: line.trim().slice(0, 220),
        recommendedAction: owner(relative) === 'service-card' ? 'keep-under-existing-baseline' : 'review-with-visual-baseline-before-removal',
      });
    }
  });
}

const outside = items.filter((item) => item.outsideServiceCard);
const byOwner = items.reduce((acc, item) => {
  acc[item.owner] = (acc[item.owner] || 0) + 1;
  return acc;
}, {});
const outsideByFile = outside.reduce((acc, item) => {
  acc[item.file] = (acc[item.file] || 0) + 1;
  return acc;
}, {});

const report = {
  cycle: 111,
  name: 'important declarations outside service-card',
  status: 'passed',
  policy: {
    removedImportant: false,
    visualChanges: false,
    requiresVisualBaselineBeforeRemoval: true,
  },
  summary: {
    totalImportantDeclarations: items.length,
    outsideServiceCardDeclarations: outside.length,
    affectedOutsideFiles: Object.keys(outsideByFile).length,
    byOwner,
  },
  outsideByFile,
  items,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(`[global-cycle-111] important outside service-card: passed (${outside.length} outside declarations mapped)`);
