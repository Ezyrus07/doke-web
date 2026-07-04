'use strict';

const fs = require('fs');
const path = require('path');
const { makeReport, requireFile, pass, block, finish } = require('./lib/private-beta-resolution-utils');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = 'reports/generated/mock-beta-option-package-report.json';
const markdownPath = 'reports/generated/mock-beta-option-package.md';
const report = makeReport('mock-beta-option-package', 'private-beta-strategy', 'Define the mock/localStorage beta option without misrepresenting it as backend-real.');

requireFile(report, 'docs/MOCK-BETA-OPTION-PACKAGE-RUNBOOK.md');
const dataProvider = process.env.DOKE_DATA_PROVIDER || process.env.DOKE_DATA_PROVIDER_TARGET || 'mock';
if (dataProvider === 'mock') pass(report, 'mock.data_provider.default');
else block(report, `Data provider is not mock: ${dataProvider}`);

const disclaimers = [
  'Mock beta validates UX, service flow comprehension, and early marketplace behavior only.',
  'Mock beta does not validate production persistence, payments, KYC, escrow, Supabase RLS, or real notifications.',
  'Invite only controlled testers and label the experience as beta/prototype if data is not persisted by a real backend.'
];
const allowedScope = ['visual QA', 'client/professional flow rehearsal', 'anunciar/publicar/comunidade UX', 'copy/content review', 'first manual feedback'];
const blockedScope = ['real payments', 'real escrow', 'real KYC', 'real wallet balance', 'public launch', 'unbounded user invitation'];
report.summary = { allowedScope, blockedScope, disclaimers };
report.markdownPath = markdownPath;
report.status = report.failures.length ? 'failed' : report.blockers.length ? 'mock_beta_option_package_has_blockers' : 'mock_beta_option_package_ready_for_controlled_test';
report.decision = report.status === 'mock_beta_option_package_ready_for_controlled_test' ? 'GO' : 'NO_GO';
if (checkEnv) report.checkEnv = true;
if (!dryRun || writeReport) writeMarkdown(markdownPath, renderMarkdown(report, allowedScope, blockedScope, disclaimers));
finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);

function writeMarkdown(file, text) {
  const target = path.join(process.cwd(), file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}
function renderMarkdown(currentReport, allowedScope, blockedScope, disclaimers) {
  const lines = ['# Mock Beta Option Package', '', `Decision: **${currentReport.decision}**`, `Status: \`${currentReport.status}\``, '', '## Allowed scope', ''];
  for (const item of allowedScope) lines.push(`- ${item}`);
  lines.push('', '## Not allowed to claim as validated', '');
  for (const item of blockedScope) lines.push(`- ${item}`);
  lines.push('', '## Required wording/expectation', '');
  for (const item of disclaimers) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}
