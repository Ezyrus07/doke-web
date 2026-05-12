const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-103-css-legacy-reform-blockers-report.json');
const cssDir = path.join(ROOT, 'assets/css');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full.endsWith('.css') ? [full] : [];
  });
}
const files = walk(cssDir);
const entries = files.map((filePath) => {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const text = fs.readFileSync(filePath, 'utf8');
  const importantCount = (text.match(/!important/g) || []).length;
  const legacyMarkers = (text.match(/legacy|old|deprecated|temporar|stage|reset-zero/gi) || []).length;
  const inlineRiskSelectors = (text.match(/\[style\]/g) || []).length;
  const category = rel.includes('/core/') ? 'core' : rel.includes('/components/') ? 'components' : rel.includes('/patterns/') ? 'patterns' : rel.includes('/pages/') ? 'pages' : 'other';
  return { file: rel, category, importantCount, legacyMarkers, inlineRiskSelectors };
}).filter((entry) => entry.importantCount || entry.legacyMarkers || entry.inlineRiskSelectors);
const byCategory = entries.reduce((acc, entry) => {
  acc[entry.category] = acc[entry.category] || { fileCount: 0, importantCount: 0, legacyMarkers: 0, inlineRiskSelectors: 0 };
  acc[entry.category].fileCount += 1;
  acc[entry.category].importantCount += entry.importantCount;
  acc[entry.category].legacyMarkers += entry.legacyMarkers;
  acc[entry.category].inlineRiskSelectors += entry.inlineRiskSelectors;
  return acc;
}, {});
const report = {
  cycle: 103,
  title: 'CSS legacy blockers before desktop reform',
  goal: 'Map CSS risk before desktop HTML reform without changing visual output.',
  status: 'passed',
  cssFileCount: files.length,
  riskFileCount: entries.length,
  byCategory,
  entries,
  recommendation: 'Use this map to choose CSS cleanup only with page baseline; do not batch-remove rules before desktop visual decisions.',
};
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
console.log(`[global-cycle-103] css legacy reform blockers: passed (${entries.length} risk files mapped)`);
