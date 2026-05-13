const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const cssPath = path.join(ROOT, 'assets/css/patterns/app-topbar.css');
const corePath = path.join(ROOT, 'assets/css/core/index.css');
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
const core = fs.existsSync(corePath) ? fs.readFileSync(corePath, 'utf8') : '';
const checks = { cssExists: fs.existsSync(cssPath), importedByCoreIndex: /patterns\/app-topbar\.css/.test(core), noImportant: !/!important/.test(css), hasLeftSlotSelector: /app-topbar__left/.test(css), hasContextSlotSelector: /app-topbar__context/.test(css), hasRightSlotSelector: /app-topbar__right/.test(css), hasDesktopMediaQuery: /@media\s*\(min-width:\s*761px\)/.test(css) };
const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = { generatedAt: new Date().toISOString(), cycle: 160, checks, failures, status: failures.length ? 'failed' : 'passed' };
fs.mkdirSync(path.join(ROOT, 'docs/validation'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/validation/global-cycle-160-app-topbar-css-ownership-report.json'), JSON.stringify(report, null, 2));
if (failures.length) { console.error('[app-topbar-css-ownership] failed', failures.join(', ')); process.exit(1); }
console.log('[app-topbar-css-ownership] passed');
