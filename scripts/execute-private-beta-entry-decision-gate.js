'use strict';
const { makeReport, requireFile, requireScript, readJson, action, pass, block, status, finish } = require('./lib/private-beta-resolution-utils');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = 'reports/generated/private-beta-entry-decision-gate-report.json';
const report = makeReport('private-beta-entry-decision-gate', 'private-beta-entry', 'Adjudicate private beta entry from visual, quality, staging and evidence reports.');
const gates = [
  { name: 'visualMatrix', script: 'execute:visual-correction-matrix:report', file: 'reports/generated/visual-correction-matrix-report.json', accepted: ['visual_correction_matrix_clear'] },
  { name: 'qualityMatrix', script: 'execute:quality-correction-matrix:report', file: 'reports/generated/quality-correction-matrix-report.json', accepted: ['quality_correction_matrix_clear'] },
  { name: 'stagingSecrets', script: 'execute:staging-external-secrets-checklist:report', file: 'reports/generated/staging-external-secrets-checklist-report.json', accepted: ['staging_external_secrets_checklist_ready'] },
  { name: 'entryResolution', script: 'execute:private-beta-entry-resolution-cycle:report', file: 'reports/generated/private-beta-entry-resolution-cycle-report.json', accepted: ['private_beta_entry_resolution_cycle_go'] },
  { name: 'evidenceAdjudicator', script: 'execute:private-beta-evidence-adjudicator:report', file: 'reports/generated/private-beta-evidence-adjudicator-report.json', accepted: ['private_beta_evidence_adjudicator_go'] }
];
main();
function main() {
  requireFile(report, 'docs/PRIVATE-BETA-ENTRY-DECISION-GATE-RUNBOOK.md');
  requireFile(report, 'tools/private-beta-one-command.windows.ps1');
  for (const gate of gates) requireScript(report, gate.script);
  report.gates = [];
  if (dryRun) {
    report.gates = gates.map(({ name, script, accepted }) => ({ name, script, accepted }));
    report.status = status(report, 'private_beta_entry_decision_plan_ready', 'private_beta_entry_decision_has_blockers');
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }
  for (const gate of gates) {
    const payload = readJson(gate.file);
    const gateResult = { name: gate.name, file: gate.file, status: payload && !payload.__parseError ? payload.status || 'missing_status' : payload && payload.__parseError ? 'invalid_json' : 'missing_report' };
    gateResult.accepted = gate.accepted.includes(gateResult.status);
    report.gates.push(gateResult);
    if (gateResult.accepted) pass(report, `${gate.name}.accepted`, { status: gateResult.status });
    else {
      block(report, `${gate.name} is ${gateResult.status}; accepted: ${gate.accepted.join(', ')}.`);
      action(report, { priority: 'P0', domain: gate.name, source: gate.file, summary: `Resolve ${gate.name} before private beta entry.`, command: `npm run ${gate.script}` });
    }
  }
  if (checkEnv) report.checkEnv = true;
  if (process.env.DOKE_PRIVATE_BETA_ENTRY_DECISION_CONFIRM !== 'enter-private-beta') block(report, 'DOKE_PRIVATE_BETA_ENTRY_DECISION_CONFIRM=enter-private-beta is required for GO.');
  report.status = status(report, 'private_beta_entry_decision_go', 'private_beta_entry_decision_no_go');
  report.decision = report.status === 'private_beta_entry_decision_go' ? 'GO' : 'NO_GO';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}
