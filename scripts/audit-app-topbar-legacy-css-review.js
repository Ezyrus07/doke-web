const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const CSS_ROOT = path.join(ROOT, 'assets/css');
const legacySignals = ['topbar-standard.css', 'header-desktop.css', 'desktop-topbar.css', 'internal-page-header.css'];
const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.css')) files.push(full);
  }
}
walk(CSS_ROOT);
const related = files.filter((file) => {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const css = fs.readFileSync(file, 'utf8');
  return legacySignals.some((signal) => rel.endsWith(signal)) || /\.topbar|internal-page-topbar|topbar__left|topbar__right|topbar__center/.test(css);
}).map((file) => path.relative(ROOT, file).replace(/\\/g, '/'));
const report = {
  generatedAt: new Date().toISOString(),
  cycle: 161,
  relatedTopbarCssCount: related.length,
  relatedTopbarCss: related,
  removedCssFiles: [],
  decision: 'no-removal-without-visual-baseline',
  status: 'passed'
};
fs.mkdirSync(path.join(ROOT, 'docs/validation'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/validation/global-cycle-161-app-topbar-legacy-css-review-report.json'), JSON.stringify(report, null, 2));
console.log(`[app-topbar-legacy-css-review] related=${related.length} removed=0`);
