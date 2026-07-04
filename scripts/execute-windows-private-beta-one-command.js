'use strict';
const { makeReport, requireFile, requireScript, readJson, action, pass, block, status, finish } = require('./lib/private-beta-resolution-utils');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = 'reports/generated/windows-private-beta-one-command-report.json';
const report = makeReport('windows-private-beta-one-command', 'private-beta-workstation', 'Validate the single Windows/VS Code evidence runner and summarize the ordered private beta evidence phases.');
main();
function main() {
  requireFile(report, 'config/private-beta-one-command-plan.json');
  requireFile(report, 'tools/private-beta-one-command.windows.ps1');
  requireFile(report, 'docs/WINDOWS-PRIVATE-BETA-ONE-COMMAND-RUNBOOK.md');
  const plan = readJson('config/private-beta-one-command-plan.json') || { phases: [] };
  report.phases = plan.phases || [];
  for (const phase of report.phases) {
    const script = String(phase.command || '').replace(/^npm run\s+/, '');
    if (script) requireScript(report, script);
    if (phase.requiresManualEnv) {
      for (const envName of phase.requiresManualEnv) {
        if (process.env[envName]) pass(report, `${phase.id}.${envName}.present`);
        else {
          block(report, `${envName} is not set for ${phase.id}.`);
          action(report, { priority: 'P1', domain: phase.id, summary: `Set ${envName} only when the related evidence has been manually verified.`, evidence: phase.evidence });
        }
      }
    }
  }
  if (dryRun) report.dryRun = true;
  if (checkEnv) report.checkEnv = true;
  action(report, { priority: 'P0', domain: 'workstation', summary: 'Run tools/private-beta-one-command.windows.ps1 from PowerShell in the Doke project root.', command: 'powershell -ExecutionPolicy Bypass -File tools/private-beta-one-command.windows.ps1' });
  report.status = status(report, 'windows_private_beta_one_command_ready', 'windows_private_beta_one_command_has_manual_blockers');
  report.decision = report.status === 'windows_private_beta_one_command_ready' ? 'GO' : 'NO_GO';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}
