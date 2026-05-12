#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const checks = [
  ['audit:shell-topbar-map', 'npm', ['run','audit:shell-topbar-map']],
  ['audit:shell-topbar-contract', 'npm', ['run','audit:shell-topbar-contract']],
  ['audit:shell-topbar-standardization', 'npm', ['run','audit:shell-topbar-standardization']],
  ['audit:partial-navigation-readiness', 'npm', ['run','audit:partial-navigation-readiness']]
];
const results = [];
for (const [name, cmd, args] of checks) {
  const res = spawnSync(cmd, args, {cwd: ROOT, stdio:'inherit', shell: process.platform === 'win32'});
  results.push({name, status: res.status === 0 ? 'passed' : 'failed'});
  if (res.status !== 0) break;
}
const failed = results.filter(r=>r.status !== 'passed');
const report = {cycle:'154-157', name:'shell-header-consistency-suite', generatedAt:new Date().toISOString(), results, status: failed.length ? 'failed' : 'passed'};
fs.writeFileSync(path.join(ROOT,'docs/validation/global-cycle-154-157-shell-header-consistency-suite-report.json'), JSON.stringify(report,null,2));
if (failed.length) process.exit(1);
console.log('[audit:shell-header-consistency-suite] passed');
