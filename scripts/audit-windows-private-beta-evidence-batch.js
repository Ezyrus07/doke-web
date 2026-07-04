'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const report = {
  name: 'windows-private-beta-evidence-batch-audit',
  generatedAt: new Date().toISOString(),
  status: 'not_evaluated',
  results: [],
  failures: []
};

main();

function main() {
  requiredFile('scripts/execute-windows-private-beta-evidence-batch.js');
  requiredFile('docs/WINDOWS-PRIVATE-BETA-EVIDENCE-BATCH-RUNBOOK.md');
  requiredFile('config/private-beta-workstation.env.example');
  requiredPackageScript('audit:windows-private-beta-evidence-batch');
  requiredPackageScript('execute:windows-private-beta-evidence-batch:dry-run');
  requiredPackageScript('execute:windows-private-beta-evidence-batch:check-env');
  requiredPackageScript('execute:windows-private-beta-evidence-batch:report');
  assertNoHardcodedSecrets('config/private-beta-workstation.env.example');
  assertNoProductionUrl('config/private-beta-workstation.env.example');
  report.status = report.failures.length ? 'failed' : 'windows_private_beta_evidence_batch_audit_passed';
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.failures.length ? 1 : 0);
}

function requiredFile(file) { fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function requiredPackageScript(name) { const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); pkg.scripts && pkg.scripts[name] ? pass(`script.${name}.present`) : fail(`Missing package script: ${name}`); }
function assertNoHardcodedSecrets(file) { const text = read(file); /sk-[a-zA-Z0-9]|supabase\.[a-z0-9-]+\.co|postgres:\/\/[^.]+:[^@]+@/i.test(text) ? fail(`${file} appears to contain a secret or concrete Supabase URL.`) : pass(`${file}.no-hardcoded-secret`); }
function assertNoProductionUrl(file) { const text = read(file); /https:\/\/[^\s#]*(prod|production)[^\s#]*/i.test(text) ? fail(`${file} appears to contain a production URL.`) : pass(`${file}.no-production-url`); }
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }
