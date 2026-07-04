'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BACKEND_REAL_OBSERVABILITY_REPORT_PATH || 'reports/generated/backend-real-observability-gate-report.json';
const requiredFiles = [
  'docs/BACKEND-REAL-OBSERVABILITY-RUNBOOK.md',
  'docs/BACKEND-REAL-COMPLETE-READINESS-RUNBOOK.md',
  'scripts/validate-backend-real-observability-gate.js',
  'scripts/audit-backend-real-observability-contract.js'
];
const requiredSignals = [
  'request_id', 'actor_id', 'actor_role', 'domain', 'action', 'idempotency_key_hash', 'status_code', 'latency_ms', 'rollback_marker'
];
const upstreamReports = [
  ['reports/generated/backend-real-multidomain-staging-execution-report.json', 'backend_real_multidomain_staging_execution_validated'],
  ['reports/generated/backend-real-e2e-local-runtime-report.json', 'backend_real_e2e_local_runtime_validated']
];
const report = { name: 'backend-real-observability-gate', generatedAt: new Date().toISOString(), status: 'not_evaluated', requiredSignals, results: [], warnings: [], failures: [] };

requiredFiles.forEach((file) => { if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required file: ${file}`); });
requiredSignals.forEach((signal) => record(`signal.required.${signal}`));
if (dryRun) { report.status = report.failures.length ? 'failed' : 'backend_real_observability_dry_run_ready'; finish(); }
else {
  const hasSink = Boolean(process.env.DOKE_BACKEND_REAL_OBSERVABILITY_LOG_SINK || process.env.DOKE_BACKEND_REAL_OBSERVABILITY_DRAIN_URL);
  if (!hasSink) report.warnings.push('No observability sink configured. Set DOKE_BACKEND_REAL_OBSERVABILITY_LOG_SINK or DOKE_BACKEND_REAL_OBSERVABILITY_DRAIN_URL.');
  let reportsOk = true;
  upstreamReports.forEach(([file, expectedStatus]) => {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) { reportsOk = false; report.warnings.push(`Missing upstream report: ${file}`); return; }
    const payload = JSON.parse(fs.readFileSync(full, 'utf8'));
    if (payload.status !== expectedStatus) { reportsOk = false; report.warnings.push(`${file} must have status ${expectedStatus}.`); }
  });
  report.status = hasSink && reportsOk && !report.failures.length ? 'backend_real_observability_ready_for_manual_staging_rollout' : 'blocked_until_backend_real_observability_prerequisites';
  finish();
}

function record(name) { report.results.push({ name, ok: true }); }
function finish() { if (writeReport) { const output = path.join(root, reportPath); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); } if (report.failures.length) { console.error(`[${report.name}] failed`); report.failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); } console.log(`[${report.name}] ${report.status}`); }
