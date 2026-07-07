'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BACKEND_REAL_OBSERVABILITY_REPORT_PATH || 'reports/generated/backend-real-observability-gate-report.json';
const postRotationEvidencePath = 'reports/generated/backend-real-multidomain-post-rotation-evidence-report.json';
const legacyMultidomainReportPath = 'reports/generated/backend-real-multidomain-staging-execution-report.json';
const requiredFiles = [
  'docs/BACKEND-REAL-OBSERVABILITY-RUNBOOK.md',
  'docs/BACKEND-REAL-COMPLETE-READINESS-RUNBOOK.md',
  'scripts/validate-backend-real-observability-gate.js',
  'scripts/audit-backend-real-observability-contract.js',
  'scripts/write-backend-real-multidomain-evidence-report.js'
];
const requiredSignals = [
  'request_id', 'actor_id', 'actor_role', 'domain', 'action', 'idempotency_key_hash', 'status_code', 'latency_ms', 'rollback_marker'
];
const upstreamReports = [
  ['reports/generated/backend-real-e2e-local-runtime-report.json', 'backend_real_e2e_local_runtime_validated']
];
const report = { name: 'backend-real-observability-gate', generatedAt: new Date().toISOString(), status: 'not_evaluated', requiredSignals, results: [], warnings: [], failures: [] };

requiredFiles.forEach((file) => { if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required file: ${file}`); });
requiredSignals.forEach((signal) => record(`signal.required.${signal}`));
if (dryRun) { report.status = report.failures.length ? 'failed' : 'backend_real_observability_dry_run_ready'; finish(); }
else {
  const hasSink = validateObservabilitySink();
  let reportsOk = true;
  upstreamReports.forEach(([file, expectedStatus]) => {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) { reportsOk = false; report.warnings.push(`Missing upstream report: ${file}`); return; }
    const payload = JSON.parse(fs.readFileSync(full, 'utf8'));
    if (payload.status !== expectedStatus) { reportsOk = false; report.warnings.push(`${file} must have status ${expectedStatus}.`); }
  });
  if (!validateMultidomainEvidence()) reportsOk = false;
  report.status = hasSink && reportsOk && !report.failures.length ? 'backend_real_observability_ready_for_manual_staging_rollout' : 'blocked_until_backend_real_observability_prerequisites';
  finish();
}

function validateObservabilitySink() {
  const localSink = String(process.env.DOKE_BACKEND_REAL_OBSERVABILITY_LOG_SINK || '').trim();
  const drainUrl = String(process.env.DOKE_BACKEND_REAL_OBSERVABILITY_DRAIN_URL || '').trim();
  if (!localSink && !drainUrl) {
    report.warnings.push('No observability sink configured. Set DOKE_BACKEND_REAL_OBSERVABILITY_LOG_SINK or DOKE_BACKEND_REAL_OBSERVABILITY_DRAIN_URL.');
    return false;
  }
  if (localSink) return validateLocalLogSink(localSink);
  record('observability_drain_url.configured');
  return true;
}

function validateLocalLogSink(localSink) {
  if (/^https?:\/\//i.test(localSink)) {
    report.warnings.push('DOKE_BACKEND_REAL_OBSERVABILITY_LOG_SINK must be a local file path, not a remote URL.');
    return false;
  }
  const full = path.resolve(root, localSink);
  const generatedDir = path.resolve(root, 'reports/generated');
  const relative = path.relative(generatedDir, full);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    report.warnings.push('DOKE_BACKEND_REAL_OBSERVABILITY_LOG_SINK must be under reports/generated/.');
    return false;
  }
  if (path.extname(full) !== '.ndjson') {
    report.warnings.push('DOKE_BACKEND_REAL_OBSERVABILITY_LOG_SINK must point to an .ndjson file.');
    return false;
  }
  if (!fs.existsSync(full)) {
    report.warnings.push(`DOKE_BACKEND_REAL_OBSERVABILITY_LOG_SINK file does not exist: ${localSink}`);
    return false;
  }
  return validateLocalLogSinkEvents(full, localSink);
}

function validateLocalLogSinkEvents(full, localSink) {
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) {
    report.warnings.push(`DOKE_BACKEND_REAL_OBSERVABILITY_LOG_SINK is empty: ${localSink}`);
    return false;
  }
  for (const [index, line] of lines.entries()) {
    let event;
    try {
      event = JSON.parse(line);
    } catch (error) {
      report.warnings.push(`DOKE_BACKEND_REAL_OBSERVABILITY_LOG_SINK has invalid JSON on line ${index + 1}: ${error.message}`);
      return false;
    }
    const missing = requiredSignals.filter((signal) => event[signal] === undefined || event[signal] === null || event[signal] === '');
    if (missing.length) {
      report.warnings.push(`DOKE_BACKEND_REAL_OBSERVABILITY_LOG_SINK line ${index + 1} is missing required signals: ${missing.join(', ')}.`);
      return false;
    }
    if (containsSensitiveKey(event)) {
      report.warnings.push(`DOKE_BACKEND_REAL_OBSERVABILITY_LOG_SINK line ${index + 1} contains a sensitive-looking key.`);
      return false;
    }
  }
  record('observability_local_log_sink.validated');
  return true;
}

function validateMultidomainEvidence() {
  const evidenceFull = path.join(root, postRotationEvidencePath);
  if (fs.existsSync(evidenceFull)) return validatePostRotationEvidence(JSON.parse(fs.readFileSync(evidenceFull, 'utf8')));

  const legacyFull = path.join(root, legacyMultidomainReportPath);
  if (!fs.existsSync(legacyFull)) {
    report.warnings.push(`Missing upstream report: ${postRotationEvidencePath} or ${legacyMultidomainReportPath}`);
    return false;
  }
  return validateLegacyMultidomainReport(JSON.parse(fs.readFileSync(legacyFull, 'utf8')));
}

function validatePostRotationEvidence(payload) {
  const run = payload.validatedRun || {};
  const withdrawal = run.withdrawal || {};
  const cleanup = run.cleanupAfterExecution || {};
  const residues = cleanup.residues || {};
  const endpoints = Array.isArray(run.endpointsExercised) ? run.endpointsExercised : [];
  const missing = [];

  if (payload.status !== 'backend_real_multidomain_staging_execution_validated') missing.push('status');
  if (payload.evidenceSource !== 'manual_post_rotation_validated_run') missing.push('evidenceSource');
  if (payload.executionWasNotRepeated !== true) missing.push('executionWasNotRepeated');
  if (payload.networkRequestsPerformed !== false) missing.push('networkRequestsPerformed=false');
  if (payload.mutationsPerformed !== false) missing.push('mutationsPerformed=false');
  if (payload.frontendActivationActivated !== false) missing.push('frontendActivationActivated=false');
  if (run.notificationReadAllExecuted !== false) missing.push('notificationReadAllExecuted=false');
  if (endpoints.includes('POST /notifications/read-all')) missing.push('no read-all endpoint');
  if (withdrawal.skipped !== true || withdrawal.reason !== 'insufficient_available_balance_for_optional_withdrawal') missing.push('withdrawal skipped reason');
  if (cleanup.stagingResiduesZero !== true) missing.push('cleanup stagingResiduesZero');
  for (const [table, count] of Object.entries(residues)) {
    if (Number(count) !== 0) missing.push(`cleanup residue ${table}`);
  }
  ['order', 'conversation', 'message', 'notification'].forEach((name) => {
    if (!isUuid(run.ids && run.ids[name])) missing.push(`id.${name}`);
  });

  if (missing.length) {
    report.warnings.push(`${postRotationEvidencePath} is incomplete or unsafe: ${missing.join(', ')}.`);
    return false;
  }
  record('post_rotation_multidomain_evidence.validated');
  return true;
}

function validateLegacyMultidomainReport(payload) {
  let ok = true;
  const plan = Array.isArray(payload.plan) ? payload.plan : [];
  const withdrawalStep = plan.find((step) => String(step).startsWith('POST /withdrawals'));
  if (payload.status !== 'backend_real_multidomain_staging_execution_validated') {
    ok = false;
    report.warnings.push(`${legacyMultidomainReportPath} must have status backend_real_multidomain_staging_execution_validated.`);
  }
  if (plan.includes('POST /notifications/read-all')) {
    ok = false;
    report.warnings.push(`${legacyMultidomainReportPath} contains deprecated POST /notifications/read-all.`);
  }
  if (withdrawalStep === 'POST /withdrawals') {
    ok = false;
    report.warnings.push(`${legacyMultidomainReportPath} treats POST /withdrawals as mandatory instead of conditional.`);
  }
  if (ok) record('legacy_multidomain_report.validated');
  return ok;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function containsSensitiveKey(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => {
    if (/(password|secret|token|authorization|cookie|apikey|api_key)/i.test(key)) return true;
    return containsSensitiveKey(child);
  });
}

function record(name) { report.results.push({ name, ok: true }); }
function finish() { if (writeReport) { const output = path.join(root, reportPath); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); } if (report.failures.length) { console.error(`[${report.name}] failed`); report.failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); } console.log(`[${report.name}] ${report.status}`); }
