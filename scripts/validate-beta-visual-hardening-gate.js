'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BETA_VISUAL_HARDENING_REPORT_PATH || 'reports/generated/beta-visual-hardening-report.json';
const requiredEvidence = [
  'reports/generated/playwright-visual-baseline-report.json',
  'reports/generated/responsive-contract-report.json',
  'reports/generated/beta-critical-flow-screenshots-report.json'
];
const report = {
  name: 'beta-visual-hardening-gate',
  generatedAt: new Date().toISOString(),
  objective: 'Gate visual hardening after backend launch contracts without modifying current HTML/CSS in this sprint.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  changesVisualSurface: false,
  status: 'not_evaluated',
  requiredViewports: ['390x844', '608x926', '810x1080', '1024x768', '1280x800'],
  requiredEvidence,
  results: [],
  failures: []
};
main();
function main() {
  assertFile('docs/BETA-VISUAL-HARDENING-RUNBOOK.md');
  assertFile('docs/BASELINE-VISUAL-APPROVED.md');
  if (dryRun) {
    pass('dry_run.visual_hardening_plan_ready');
    report.status = 'beta_visual_hardening_plan_ready';
    return finish();
  }
  for (const file of requiredEvidence) {
    if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing visual evidence report: ${file}`);
  }
  report.status = report.failures.length ? 'blocked_until_beta_visual_evidence_reports' : 'beta_visual_hardening_ready_for_release_candidate_packaging';
  if (!report.failures.length) pass('visual_evidence_reports.validated');
  finish();
}
function assertFile(file) { if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function finish() { if (writeReport) { const absolute = path.join(root, reportPath); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`); } console.log(JSON.stringify(report, null, 2)); }
