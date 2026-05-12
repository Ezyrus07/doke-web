#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const requiredDoc = 'docs/SHELL-TOPBAR-CONTRACT.md';
const doc = fs.existsSync(path.join(ROOT, requiredDoc)) ? fs.readFileSync(path.join(ROOT, requiredDoc),'utf8') : '';
const checks = [
  ['doc exists', Boolean(doc)],
  ['app shell hook documented', doc.includes('data-shell-region="app"')],
  ['main hook documented', doc.includes('data-shell-main')],
  ['topbar hook documented', doc.includes('data-shell-topbar')],
  ['native navigation guard documented', doc.includes('instantShellNavigation: false')],
  ['no route swap by default documented', /not allowed by default|não/i.test(doc)]
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
const report = { cycle:155, name:'shell-topbar-contract', generatedAt:new Date().toISOString(), checks: checks.map(([name,passed])=>({name,passed})), status: failed.length ? 'failed' : 'passed', failed };
fs.writeFileSync(path.join(ROOT,'docs/validation/global-cycle-155-shell-topbar-contract-report.json'), JSON.stringify(report,null,2));
if (failed.length) { console.error('[audit:shell-topbar-contract] failed', failed); process.exit(1); }
console.log('[audit:shell-topbar-contract] passed');
