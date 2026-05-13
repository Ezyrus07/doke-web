const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const PAGES = fs.readdirSync(ROOT).filter((file) => file.endsWith('.html')).sort();
const report = { generatedAt: new Date().toISOString(), cycle: 158, pageCount: PAGES.length, pages: [], topbarCount: 0, absentTopbarCount: 0, status: 'passed' };
for (const page of PAGES) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const hasTopbar = /<header[^>]+(?:class=["'][^"']*(?:topbar|internal-page-topbar)[^"']*|data-shell-topbar)/i.test(html);
  const hasAppTopbar = /<header[^>]+class=["'][^"']*app-topbar[^"']*/i.test(html);
  if (hasTopbar) report.topbarCount += 1;
  if (!hasTopbar) report.absentTopbarCount += 1;
  report.pages.push({ page, hasTopbar, hasAppTopbar });
}
fs.mkdirSync(path.join(ROOT, 'docs/validation'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/validation/global-cycle-158-app-topbar-inventory-report.json'), JSON.stringify(report, null, 2));
console.log(`[app-topbar-inventory] topbars=${report.topbarCount} absent=${report.absentTopbarCount}`);
