'use strict';
const { spawnSync } = require('child_process');
const { makeReport, requireFile, requireScript, readJson, action, pass, block, status, finish } = require('./lib/private-beta-resolution-utils');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_PRIVATE_BETA_ENTRY_RESOLUTION_CYCLE_PATH || 'reports/generated/private-beta-entry-resolution-cycle-report.json';

const phases = [
  { name: 'workstationIngest', script: 'execute:private-beta-workstation-report-ingest:report', file: 'reports/generated/private-beta-workstation-report-ingest-report.json', accepted: ['private_beta_workstation_report_ingest_ready_for_resolution_backlogs'] },
  { name: 'visualResolution', script: 'execute:visual-resolution-backlog:report', file: 'reports/generated/visual-resolution-backlog-report.json', accepted: ['visual_resolution_backlog_clear'] },
  { name: 'qualityResolution', script: 'execute:quality-resolution-backlog:report', file: 'reports/generated/quality-resolution-backlog-report.json', accepted: ['quality_resolution_backlog_clear'] },
  { name: 'stagingResolution', script: 'execute:staging-resolution-backlog:report', file: 'reports/generated/staging-resolution-backlog-report.json', accepted: ['staging_resolution_backlog_clear'] },
  { name: 'evidenceAdjudicator', script: 'execute:private-beta-evidence-adjudicator:report', file: 'reports/generated/private-beta-evidence-adjudicator-report.json', accepted: ['private_beta_evidence_adjudicator_go'] }
];

const report = makeReport('private-beta-entry-resolution-cycle', 'private-beta-entry', 'Run report ingestion, resolution backlogs and the private beta evidence adjudicator as a controlled GO/NO-GO cycle.');

main();
function main() {
  requireFile(report, 'docs/PRIVATE-BETA-ENTRY-RESOLUTION-CYCLE-RUNBOOK.md');
  requireFile(report, 'tools/private-beta-resolution-cycle.windows.ps1');
  for (const phase of phases) requireScript(report, phase.script);
  if (dryRun) {
    report.phases = phases.map(({ name, script, accepted }) => ({ name, script, accepted }));
    report.status = status(report, 'private_beta_entry_resolution_cycle_plan_ready', 'private_beta_entry_resolution_cycle_has_blockers');
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }

  const runFull = process.env.DOKE_PRIVATE_BETA_ENTRY_RESOLUTION_RUN_FULL === '1';
  const selected = runFull ? phases : phases.filter((phase) => phase.name !== 'evidenceAdjudicator');
  if (!runFull && !checkEnv) block(report, 'DOKE_PRIVATE_BETA_ENTRY_RESOLUTION_RUN_FULL=1 is required before running the long entry adjudicator phase.');

  for (const phase of selected) {
    const result = runNpm(phase.script);
    report.commands = report.commands || [];
    report.commands.push({ phase: phase.name, ...result });
    result.exitCode === 0 ? pass(report, `${phase.name}.command.completed`) : block(report, `${phase.name} command exited with ${result.exitCode}.`);
    const payload = readJson(phase.file);
    if (!payload) {
      block(report, `${phase.name} report missing: ${phase.file}`);
      action(report, { priority: 'P0', domain: phase.name, source: phase.file, summary: `Generate ${phase.name} report.`, command: `npm run ${phase.script}` });
      continue;
    }
    if (phase.accepted.includes(payload.status)) pass(report, `${phase.name}.status.accepted`, { status: payload.status });
    else {
      block(report, `${phase.name} status ${payload.status} is not accepted.`);
      action(report, { priority: phase.name === 'evidenceAdjudicator' ? 'P0' : 'P1', domain: phase.name, source: phase.file, summary: `Resolve ${phase.name} status ${payload.status}.`, evidence: payload.decision || null });
    }
  }

  if (checkEnv) {
    report.status = status(report, 'private_beta_entry_resolution_cycle_environment_ready', 'private_beta_entry_resolution_cycle_environment_has_blockers');
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }

  if (process.env.DOKE_PRIVATE_BETA_ENTRY_RESOLUTION_CONFIRM !== 'resolve-private-beta-entry') block(report, 'DOKE_PRIVATE_BETA_ENTRY_RESOLUTION_CONFIRM=resolve-private-beta-entry is required for GO.');
  report.status = status(report, 'private_beta_entry_resolution_cycle_go', 'private_beta_entry_resolution_cycle_no_go');
  report.decision = report.status === 'private_beta_entry_resolution_cycle_go' ? 'GO' : 'NO_GO';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}

function runNpm(script) {
  const startedAt = Date.now();
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(command, ['run', script], { cwd: process.cwd(), encoding: 'utf8', shell: process.platform === 'win32', timeout: Number(process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || 300000), env: process.env });
  return { command: `npm run ${script}`, exitCode: typeof result.status === 'number' ? result.status : 124, durationMs: Date.now() - startedAt, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr), error: result.error ? result.error.message : null };
}
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-14); }
