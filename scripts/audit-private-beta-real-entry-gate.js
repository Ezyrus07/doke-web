'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const report = { name: 'private-beta-real-entry-gate-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
const files = ['scripts/execute-private-beta-real-entry-gate.js', 'docs/PRIVATE-BETA-REAL-ENTRY-GATE-RUNBOOK.md'];
const scripts = ['execute:private-beta-real-entry-gate:dry-run', 'execute:private-beta-real-entry-gate:check-env', 'execute:private-beta-real-entry-gate:report'];
main();
function main() {
  for (const file of files) fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing ${file}`);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const script of scripts) pkg.scripts && pkg.scripts[script] ? pass(`script.${script}.present`) : fail(`Missing script ${script}`);
  const src = fs.readFileSync(path.join(root, 'scripts/execute-private-beta-real-entry-gate.js'), 'utf8');
  /DOKE_PRIVATE_BETA_REAL_ENTRY_CONFIRM/.test(src) ? pass('manual.entry.confirm.required') : fail('Private beta real entry gate must require manual confirm.');
  /decision: 'NO_GO'/.test(src) ? pass('default.decision.no_go') : fail('Private beta real entry gate must default to NO_GO.');
  report.status = report.failures.length ? 'failed' : 'private_beta_real_entry_gate_audit_passed';
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.failures.length ? 1 : 0);
}
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }
