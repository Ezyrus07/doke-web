'use strict';

const { spawnSync } = require('child_process');
const {
  readJson,
  requireFile,
  requirePackageScript,
  pass,
  block,
  finish
} = require('./lib/private-beta-evidence-utils');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_PRIVATE_BETA_EVIDENCE_ADJUDICATOR_REPORT_PATH || 'reports/generated/private-beta-evidence-adjudicator-report.json';

const phases = [
  { name: 'reportInterpreter', script: 'execute:private-beta-report-interpreter:report', file: 'reports/generated/private-beta-report-interpreter-report.json', accepted: ['private_beta_report_interpreter_ready_for_entry_gate'] },
  { name: 'visualFindings', script: 'execute:visual-findings-triage:report', file: 'reports/generated/visual-findings-triage-report.json', accepted: ['visual_findings_triage_ready_for_private_beta_entry'] },
  { name: 'qualityFindings', script: 'execute:quality-findings-triage:report', file: 'reports/generated/quality-findings-triage-report.json', accepted: ['quality_findings_triage_ready_for_private_beta_entry'] },
  { name: 'stagingEvidence', script: 'execute:staging-evidence-review:report', file: 'reports/generated/staging-evidence-review-report.json', accepted: ['staging_evidence_review_ready_for_private_beta_entry'] },
  { name: 'realEntryRepeat', script: 'execute:private-beta-real-entry-repeat:report', file: 'reports/generated/private-beta-real-entry-repeat-report.json', accepted: ['private_beta_real_entry_repeat_go'] }
];

const report = {
  name: 'private-beta-evidence-adjudicator',
  generatedAt: new Date().toISOString(),
  objective: 'Adjudicate private beta evidence after visual, quality, staging and real-entry reports have been interpreted.',
  changesVisualSurface: false,
  performsExternalNetworkRequest: process.env.DOKE_ADJUDICATOR_RUN_FULL === '1',
  performsExternalMutation: process.env.DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE === '1',
  dryRun,
  checkEnv,
  status: 'not_evaluated',
  decision: 'NO_GO',
  commands: [],
  results: [],
  blockers: [],
  failures: []
};

main();

function main() {
  requireFile('docs/PRIVATE-BETA-EVIDENCE-ADJUDICATOR-RUNBOOK.md', report);
  for (const phase of phases) requirePackageScript(phase.script, report);

  if (dryRun) {
    report.phases = phases.map(({ name, script, accepted }) => ({ name, script, accepted }));
    report.status = report.failures.length ? 'failed' : 'private_beta_evidence_adjudicator_plan_ready';
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }

  const runFull = process.env.DOKE_ADJUDICATOR_RUN_FULL === '1';
  const selected = runFull ? phases : phases.filter((phase) => phase.name !== 'realEntryRepeat');
  if (!runFull && !checkEnv) block(report, 'DOKE_ADJUDICATOR_RUN_FULL=1 is required before executing the long private beta real-entry repeat phase.');

  for (const phase of selected) {
    const result = runNpm(phase.script);
    report.commands.push({ phase: phase.name, ...result });
    result.exitCode === 0 ? pass(report, `${phase.name}.command.completed`) : block(report, `${phase.name} command exited with ${result.exitCode}.`);
    const payload = readJson(phase.file, report);
    if (!payload) {
      block(report, `${phase.name} report missing: ${phase.file}.`);
      continue;
    }
    phase.accepted.includes(payload.status) ? pass(report, `${phase.name}.status.accepted`, { status: payload.status }) : block(report, `${phase.name} status ${payload.status} is not accepted.`);
    if (payload.decision && payload.decision !== 'GO' && phase.name === 'realEntryRepeat') block(report, `realEntryRepeat decision is ${payload.decision}.`);
  }

  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_evidence_adjudicator_environment_has_blockers' : 'private_beta_evidence_adjudicator_environment_ready';
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }

  if (process.env.DOKE_PRIVATE_BETA_ADJUDICATOR_CONFIRM !== 'adjudicate-private-beta-go') block(report, 'DOKE_PRIVATE_BETA_ADJUDICATOR_CONFIRM=adjudicate-private-beta-go is required for GO.');
  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_evidence_adjudicator_no_go' : 'private_beta_evidence_adjudicator_go';
  report.decision = report.status === 'private_beta_evidence_adjudicator_go' ? 'GO' : 'NO_GO';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}

function runNpm(script) {
  const startedAt = Date.now();
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(command, ['run', script], { cwd: process.cwd(), encoding: 'utf8', shell: process.platform === 'win32', timeout: Number(process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || 300000), env: process.env });
  return { command: `npm run ${script}`, exitCode: typeof result.status === 'number' ? result.status : 124, durationMs: Date.now() - startedAt, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr), error: result.error ? result.error.message : null };
}
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-16); }
