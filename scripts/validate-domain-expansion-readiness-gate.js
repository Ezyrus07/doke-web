'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_DOMAIN_EXPANSION_READINESS_REPORT_PATH || 'reports/generated/domain-expansion-readiness-gate-report.json';
const domains = ['anunciar', 'publicar', 'comunidade'];
const endpointPlan = {
  anunciar: ['GET /service-listings', 'POST /service-listings', 'PATCH /service-listings/:id', 'POST /service-listings/:id/publish'],
  publicar: ['GET /publications', 'POST /publications', 'PATCH /publications/:id', 'POST /publications/:id/publish'],
  comunidade: ['GET /community/posts', 'POST /community/posts', 'POST /community/posts/:id/comments', 'POST /community/posts/:id/reactions']
};
const upstreamReports = [
  ['reports/generated/backend-real-complete-readiness-gate-report.json', 'backend_real_complete_ready_for_manual_domain_expansion'],
  ['reports/generated/backend-real-observability-gate-report.json', 'backend_real_observability_ready_for_manual_staging_rollout']
];
const report = { name: 'domain-expansion-readiness-gate', generatedAt: new Date().toISOString(), status: 'not_evaluated', domains, endpointPlan, results: [], warnings: [], failures: [] };

['docs/DOMAIN-EXPANSION-RUNBOOK.md', 'docs/BACKEND-INTEGRATION-PLAN.md', 'docs/DATA-READY-CONTRACTS.md', 'package.json'].forEach((file) => {
  if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required file: ${file}`);
});
domains.forEach((domain) => record(`domain.planned.${domain}`));
Object.entries(endpointPlan).forEach(([domain, endpoints]) => endpoints.forEach((endpoint) => record(`endpoint.planned.${domain}.${endpoint}`)));
if (dryRun) { report.status = report.failures.length ? 'failed' : 'domain_expansion_readiness_dry_run_ready'; finish(); }
else {
  let reportsOk = true;
  upstreamReports.forEach(([file, expectedStatus]) => {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) { reportsOk = false; report.warnings.push(`Missing upstream report: ${file}`); return; }
    const payload = JSON.parse(fs.readFileSync(full, 'utf8'));
    if (payload.status !== expectedStatus) { reportsOk = false; report.warnings.push(`${file} must have status ${expectedStatus}.`); }
  });
  report.status = reportsOk && !report.failures.length ? 'domain_expansion_ready_for_manual_contract_sprints' : 'blocked_until_backend_real_and_observability_reports';
  finish();
}

function record(name) { report.results.push({ name, ok: true }); }
function finish() { if (writeReport) { const output = path.join(root, reportPath); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); } if (report.failures.length) { console.error(`[${report.name}] failed`); report.failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); } console.log(`[${report.name}] ${report.status}`); }
