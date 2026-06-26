#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CSS_ROOT = path.join(ROOT, 'assets', 'css');
const REPORT_PATHS = [
  path.join(ROOT, 'docs', 'validation', 'global-cycle-121-important-baseline-by-group-report.json'),
  path.join(ROOT, 'reports', 'generated', 'css-important', 'global-cycle-121-important-baseline-by-group-report.json'),
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full.endsWith('.css') ? [full] : [];
  });
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function groupFor(relativePath) {
  const normalized = relativePath.toLowerCase();
  if (normalized.includes('/service-card')) return 'service-card-baseline';
  if (normalized.includes('/core/')) return 'core';
  if (normalized.includes('/components/')) return 'components';
  if (normalized.includes('/patterns/')) return 'patterns';
  if (normalized.includes('/pages/')) return 'pages';
  if (normalized.includes('/layout/')) return 'layout';
  if (normalized.includes('/utilities/') || normalized.includes('/utils/')) return 'utilities';
  if (normalized.includes('/auth/')) return 'auth';
  if (normalized.includes('/mobile') || normalized.includes('mobile-')) return 'mobile-runtime';
  if (normalized.includes('/legacy/') || normalized.includes('legacy')) return 'legacy';
  if (normalized.includes('/vendor/') || normalized.includes('bootstrap') || normalized.includes('swiper')) return 'vendor-external';
  return 'other';
}

function riskFor(group, count) {
  if (count === 0) return 'none';
  if (group === 'service-card-baseline') return 'tracked-separately';
  if (['core', 'layout', 'pages', 'mobile-runtime'].includes(group)) return 'high';
  if (['components', 'patterns', 'auth'].includes(group)) return 'medium';
  if (['utilities', 'legacy', 'other'].includes(group)) return 'review';
  if (group === 'vendor-external') return 'do-not-touch';
  return 'review';
}

const files = walk(CSS_ROOT);
const groups = {};
const filesWithImportant = [];
let totalImportant = 0;
let outsideServiceCardImportant = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(/!important\b/g) || [];
  const count = matches.length;
  const relativePath = rel(file);
  const group = groupFor(relativePath);
  if (!groups[group]) groups[group] = { importantCount: 0, fileCount: 0, filesWithImportant: 0, risk: 'none', topFiles: [] };
  groups[group].fileCount += 1;
  groups[group].importantCount += count;
  if (count > 0) {
    groups[group].filesWithImportant += 1;
    groups[group].topFiles.push({ path: relativePath, importantCount: count });
    filesWithImportant.push({ path: relativePath, group, importantCount: count, risk: riskFor(group, count) });
  }
  totalImportant += count;
  if (group !== 'service-card-baseline') outsideServiceCardImportant += count;
}

for (const group of Object.keys(groups)) {
  groups[group].risk = riskFor(group, groups[group].importantCount);
  groups[group].topFiles.sort((a, b) => b.importantCount - a.importantCount);
  groups[group].topFiles = groups[group].topFiles.slice(0, 20);
}

filesWithImportant.sort((a, b) => b.importantCount - a.importantCount);

const report = {
  cycle: 121,
  name: 'important-baseline-by-group',
  status: 'passed',
  policy: {
    visualChangesAllowed: false,
    newImportantAllowed: false,
    removalApplied: false,
    note: 'This is a baseline only. It does not remove CSS or change visual behavior.',
  },
  summary: {
    cssFileCount: files.length,
    totalImportant,
    outsideServiceCardImportant,
    groupsWithImportant: Object.values(groups).filter((g) => g.importantCount > 0).length,
    filesWithImportant: filesWithImportant.length,
  },
  groups,
  topFiles: filesWithImportant.slice(0, 50),
};

for (const reportPath of REPORT_PATHS) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(`[global-cycle-121] important baseline by group: ${report.summary.totalImportant} !important declarations mapped.`);
