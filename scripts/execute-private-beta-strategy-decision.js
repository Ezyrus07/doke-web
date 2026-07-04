'use strict';

const fs = require('fs');
const path = require('path');
const { makeReport, requireFile, readJson, summarizeReport, addReportSummary, block, pass, action, finish } = require('./lib/private-beta-resolution-utils');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = 'reports/generated/private-beta-strategy-decision-report.json';
const markdownPath = 'reports/generated/private-beta-strategy-decision.md';
const report = makeReport('private-beta-strategy-decision', 'private-beta-strategy', 'Choose between mock-first beta and real-backend-first beta before inviting users.');

requireFile(report, 'config/private-beta-execution-bridge-map.json');
requireFile(report, 'docs/PRIVATE-BETA-STRATEGY-DECISION-RUNBOOK.md');
const map = readJson('config/private-beta-execution-bridge-map.json') || {};
const strategy = process.env[map.strategyConfirmationEnv || 'DOKE_PRIVATE_BETA_STRATEGY'] || null;
const validStrategies = map.strategyValues || ['mock-first', 'real-backend-first'];
if (!strategy) block(report, `Strategy env missing: ${map.strategyConfirmationEnv || 'DOKE_PRIVATE_BETA_STRATEGY'}`);
else if (!validStrategies.includes(strategy)) block(report, `Unknown strategy: ${strategy}`);
else pass(report, `strategy.${strategy}.selected`);

const mockSummary = summarizeReport('reports/generated/mock-beta-option-package-report.json', ['mock_beta_option_package_ready_for_controlled_test']);
addReportSummary(report, 'Mock beta option', mockSummary);
const realReports = (map.evidenceReports || []).map((item) => ({ label: item.label, ...summarizeReport(item.file, item.readyStatuses || []) }));
for (const item of realReports) addReportSummary(report, `Real backend: ${item.label}`, item);
const realReady = realReports.length && realReports.every((item) => item.accepted);
if (strategy === 'mock-first') {
  if (!mockSummary.accepted) block(report, `Mock-first selected but mock package is not ready: ${mockSummary.status}`);
  action(report, { priority: 'P0', domain: 'strategy', summary: 'Run a controlled mock beta only; do not claim backend-real validation.', command: 'npm run execute:mock-beta-option-package:report' });
} else if (strategy === 'real-backend-first') {
  if (!realReady) block(report, 'Real-backend-first selected but real backend evidence is not complete.');
  action(report, { priority: 'P0', domain: 'strategy', summary: 'Bind Supabase/staging, generate visual/quality evidence, then rerun GO/NO-GO.', command: 'npm run execute:private-beta-entry-decision-gate:report' });
}

report.summary = { strategy, validStrategies, realReady, mockReady: mockSummary.accepted, realReadyReports: realReports.filter((item) => item.accepted).length, realReportCount: realReports.length };
report.markdownPath = markdownPath;
report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_strategy_decision_no_go' : strategy === 'mock-first' ? 'private_beta_strategy_mock_first_selected' : 'private_beta_strategy_real_backend_first_selected';
report.decision = report.status.includes('selected') ? 'GO' : 'NO_GO';
if (checkEnv) report.checkEnv = true;
if (!dryRun || writeReport) writeMarkdown(markdownPath, renderMarkdown(report, realReports, mockSummary));
finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);

function writeMarkdown(file, text) {
  const target = path.join(process.cwd(), file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}
function renderMarkdown(currentReport, realReports, mockSummary) {
  const lines = ['# Private Beta Strategy Decision', '', `Decision: **${currentReport.decision}**`, `Status: \`${currentReport.status}\``, `Selected strategy: \`${currentReport.summary.strategy || 'missing'}\``, '', '## Mock-first readiness', '', `- Mock package: \`${mockSummary.status}\``, '', '## Real-backend-first readiness', ''];
  for (const item of realReports) lines.push(`- ${item.label}: \`${item.status}\` — ${item.accepted ? 'ready' : 'blocked'}`);
  lines.push('', '## Recommendation', '');
  if (!currentReport.summary.strategy) lines.push('- Choose `DOKE_PRIVATE_BETA_STRATEGY=mock-first` or `DOKE_PRIVATE_BETA_STRATEGY=real-backend-first`.');
  else if (currentReport.summary.strategy === 'mock-first') lines.push('- Proceed only as a controlled product/UX test, not as backend-real launch.');
  else lines.push('- Do not invite users until all real backend evidence reports are accepted.');
  return `${lines.join('\n')}\n`;
}
