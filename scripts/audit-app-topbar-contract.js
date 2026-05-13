const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const PAGES = fs.readdirSync(ROOT).filter((file) => file.endsWith('.html')).sort();
const failures = [];
const pages = [];
function headerMatch(html) { return html.match(/<header[\s\S]*?<\/header>/i); }
for (const page of PAGES) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const match = headerMatch(html);
  if (!match || !/(topbar|internal-page-topbar|data-shell-topbar)/i.test(match[0])) { pages.push({ page, status: 'absent-provisional' }); continue; }
  const header = match[0];
  const checks = {
    appTopbarClass: /class=["'][^"']*app-topbar[^"']*/i.test(header),
    shellHook: /data-shell-topbar/i.test(header),
    contractHook: /data-topbar-contract=["']desktop-app-topbar["']/i.test(header),
    leftSlot: /data-topbar-left/i.test(header),
    contextSlot: /data-topbar-context/i.test(header),
    actionsSlot: /data-topbar-actions/i.test(header),
    searchControl: /data-topbar-search-control/i.test(header),
    globalActions: /data-topbar-global-actions/i.test(header)
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) failures.push({ page, failed });
  pages.push({ page, status: failed.length ? 'failed' : 'passed', checks });
}
const report = { generatedAt: new Date().toISOString(), cycle: 159, pages, failureCount: failures.length, failures, status: failures.length ? 'failed' : 'passed' };
fs.mkdirSync(path.join(ROOT, 'docs/validation'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/validation/global-cycle-159-app-topbar-contract-report.json'), JSON.stringify(report, null, 2));
if (failures.length) { console.error('[app-topbar-contract] failed', JSON.stringify(failures, null, 2)); process.exit(1); }
console.log('[app-topbar-contract] passed');
