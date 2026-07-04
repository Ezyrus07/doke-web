'use strict';

const { makeReport, requireFile, readJson, block, pass, action, finish } = require('./lib/private-beta-resolution-utils');

const args = new Set(process.argv.slice(2));
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = 'reports/generated/private-beta-execution-bridge-report.json';
const report = makeReport('private-beta-execution-bridge', 'private-beta-closure', 'Create the final bridge from preparation into real workstation/staging execution.');

const requiredFiles = [
  'config/private-beta-execution-bridge-map.json',
  'tools/private-beta-execution-bridge.windows.ps1',
  'docs/PRIVATE-BETA-EXECUTION-BRIDGE-RUNBOOK.md'
];

for (const file of requiredFiles) requireFile(report, file);
const map = readJson('config/private-beta-execution-bridge-map.json') || {};

for (const command of map.mainCommands || []) pass(report, `bridge.command.declared.${command}`);
for (const env of map.requiredRealBetaEnv || []) {
  const [name, expected] = env.split('=');
  const actual = process.env[name];
  if (expected ? actual === expected : Boolean(actual)) pass(report, `env.${name}.present`);
  else block(report, `Real beta env missing: ${env}`);
}

report.summary = {
  mainCommands: (map.mainCommands || []).length,
  requiredRealBetaEnv: (map.requiredRealBetaEnv || []).length,
  windowsScript: map.localWorkstationScript || null
};
report.operatorNextCommand = 'powershell -ExecutionPolicy Bypass -File tools/private-beta-execution-bridge.windows.ps1';
report.actions.push({
  priority: 'P0',
  owner: 'operator',
  domain: 'workstation',
  source: 'tools/private-beta-execution-bridge.windows.ps1',
  summary: 'Run the execution bridge in Windows/VS Code before creating more preparation-only sprints.',
  command: report.operatorNextCommand
});
if (checkEnv) report.checkEnv = true;
report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_execution_bridge_ready_with_env_blockers' : 'private_beta_execution_bridge_ready_for_real_execution';
report.decision = 'NO_GO';
finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
