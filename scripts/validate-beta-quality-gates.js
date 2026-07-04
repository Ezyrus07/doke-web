'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BETA_QUALITY_GATES_REPORT_PATH || 'reports/generated/beta-quality-gates-report.json';
const requiredEvidence = [
  'reports/generated/beta-qa-matrix-report.json',
  'reports/generated/accessibility-audit-report.json',
  'reports/generated/performance-budget-report.json',
  'reports/generated/seo-readiness-report.json'
];
const report = {
  name: 'beta-quality-gates',
  generatedAt: new Date().toISOString(),
  objective: 'Gate accessibility, performance and SEO hardening before release candidate packaging.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  status: 'not_evaluated',
  budgets: {
    accessibility: 'no known keyboard traps, semantic page titles, form labels and focusable controls reviewed',
    performance: 'no new render-blocking visual assets, no unnecessary runtime provider activation, mock remains default',
    seo: 'page titles, descriptions, canonical public routes and indexable marketplace surfaces reviewed'
  },
  requiredEvidence,
  results: [],
  failures: []
};
main();
function main() {
  assertFile('docs/BETA-QUALITY-GATES-RUNBOOK.md');
  assertFile('docs/BETA-QA-MATRIX-RUNBOOK.md');
  if (dryRun) {
    pass('dry_run.quality_gate_plan_ready');
    report.status = 'beta_quality_gates_plan_ready';
    return finish();
  }
  for (const file of requiredEvidence) {
    if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing evidence report: ${file}`);
  }
  report.status = report.failures.length ? 'blocked_until_beta_quality_evidence_reports' : 'beta_quality_gates_ready_for_release_candidate_packaging';
  if (!report.failures.length) pass('quality_evidence_reports.validated');
  finish();
}
function assertFile(file) { if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function finish() { if (writeReport) { const absolute = path.join(root, reportPath); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`); } console.log(JSON.stringify(report, null, 2)); }
