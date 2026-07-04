'use strict';

const { makeReport, requireFile, requireScript, readJson, action, pass, block, status, finish } = require('./lib/private-beta-resolution-utils');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = 'reports/generated/private-beta-simplified-local-flow-report.json';
const report = makeReport('private-beta-simplified-local-flow', 'private-beta-workstation', 'Validate the shortest safe local Windows/VS Code flow for evidence generation and human release-candidate review.');

main();

function main() {
  requireFile(report, 'config/private-beta-simplified-flow.json');
  requireFile(report, 'config/private-beta-human-rc-map.json');
  requireFile(report, 'tools/private-beta-simplified-flow.windows.ps1');
  requireFile(report, 'docs/PRIVATE-BETA-SIMPLIFIED-LOCAL-FLOW-RUNBOOK.md');

  const plan = readJson('config/private-beta-simplified-flow.json') || { phases: [] };
  report.phases = plan.phases || [];
  for (const phase of report.phases) {
    const script = String(phase.command || '').replace(/^npm run\s+/, '');
    if (script) requireScript(report, script);
    if (phase.expectedReport) {
      action(report, {
        priority: phase.id === 'one_screen_summary' || phase.id === 'human_rc_package' ? 'P1' : 'P0',
        domain: 'workstation',
        source: phase.id,
        summary: `Run phase: ${phase.title}.`,
        evidence: phase.expectedReport,
        command: phase.command
      });
    }
  }

  if (dryRun) report.dryRun = true;
  if (checkEnv) report.checkEnv = true;

  report.shortCommand = 'powershell -ExecutionPolicy Bypass -File tools/private-beta-simplified-flow.windows.ps1';
  action(report, {
    priority: 'P0',
    domain: 'workstation',
    summary: 'Run the simplified private beta flow from Windows PowerShell in the project root.',
    command: report.shortCommand,
    evidence: 'reports/generated/private-beta-one-screen-summary.md'
  });

  report.status = status(report, 'private_beta_simplified_local_flow_ready', 'private_beta_simplified_local_flow_has_manual_execution_steps');
  report.decision = 'NO_GO';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}
