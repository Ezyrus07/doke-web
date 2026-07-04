'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const files = ['scripts/validate-release-candidate-assembly-gate.js', 'docs/RELEASE-CANDIDATE-ASSEMBLY-RUNBOOK.md', 'docs/PRIVATE-BETA-RELEASE-CHECKLIST.md'];
const report = { name: 'release-candidate-assembly-gate-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
for (const file of files) {
  if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing file: ${file}`);
  else report.results.push({ name: `${file}.exists`, status: 'passed' });
}
const script = fs.existsSync(path.join(root, 'scripts/validate-release-candidate-assembly-gate.js')) ? fs.readFileSync(path.join(root, 'scripts/validate-release-candidate-assembly-gate.js'), 'utf8') : '';
if (!script.includes('release_candidate_assembly_ready_with_real_evidence_blockers')) report.failures.push('RC assembly must preserve blocker state when real evidence is missing.');
report.status = report.failures.length ? 'failed' : 'release_candidate_assembly_gate_audit_passed';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
