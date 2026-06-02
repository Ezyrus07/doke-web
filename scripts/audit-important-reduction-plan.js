const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'reports', 'generated', 'css-important', 'global-cycle-117-important-reduction-plan-report.json');
const CSS_ROOT = path.join(ROOT, 'assets', 'css');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith('.css') ? [full] : [];
  });
}
function rel(file) { return path.relative(ROOT, file).replace(/\\/g, '/'); }
function layer(file) {
  const r = rel(file);
  if (r.includes('/core/')) return 'core';
  if (r.includes('/components/')) return 'components';
  if (r.includes('/patterns/')) return 'patterns';
  if (r.includes('/pages/')) return 'pages';
  if (r.includes('/layout/')) return 'layout';
  return 'other';
}
function risk(file, count) {
  const r = rel(file);
  if (r.includes('service-card')) return 'excluded-service-card';
  if (r.includes('/core/') || r.includes('/layout/') || r.includes('shell') || r.includes('sidebar') || r.includes('header')) return 'high-baseline-required';
  if (count >= 25) return 'high-baseline-required';
  if (count >= 5) return 'medium-baseline-required';
  return 'low-review-candidate';
}

const files = walk(CSS_ROOT).map((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const count = (content.match(/!important\b/g) || []).length;
  return { file: rel(file), layer: layer(file), importantCount: count, risk: risk(file, count) };
}).filter((item) => item.importantCount > 0 && item.risk !== 'excluded-service-card');

const byRisk = files.reduce((acc, item) => { acc[item.risk] = (acc[item.risk] || 0) + item.importantCount; return acc; }, {});
const byLayer = files.reduce((acc, item) => { acc[item.layer] = (acc[item.layer] || 0) + item.importantCount; return acc; }, {});
const topFiles = [...files].sort((a, b) => b.importantCount - a.importantCount).slice(0, 25);
const lowRiskFiles = files.filter((item) => item.risk === 'low-review-candidate').map((item) => item.file);

const report = {
  cycle: 117,
  name: 'important reduction plan',
  status: 'passed',
  policy: {
    removalsApplied: false,
    serviceCardExcluded: true,
    baselineRequiredBeforeRemoval: true,
  },
  summary: {
    affectedFiles: files.length,
    totalImportantOutsideServiceCard: files.reduce((sum, item) => sum + item.importantCount, 0),
    byRisk,
    byLayer,
    lowRiskFileCount: lowRiskFiles.length,
  },
  topFiles,
  lowRiskFiles,
  recommendation: 'Start with low-review-candidate files only after screenshot/baseline for affected pages. Do not remove high-baseline-required declarations without visual coverage.',
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(`[global-cycle-117] !important reduction plan: passed (${files.length} files)`);
