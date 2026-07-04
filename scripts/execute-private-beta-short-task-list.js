'use strict';

const fs = require('fs');
const path = require('path');
const { makeReport, requireFile, readJson, summarizeReport, action, block, pass, finish } = require('./lib/private-beta-resolution-utils');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = 'reports/generated/private-beta-short-task-list-report.json';
const markdownPath = 'reports/generated/private-beta-short-task-list.md';
const report = makeReport('private-beta-short-task-list', 'private-beta-closure', 'Turn the current NO-GO into a short list of real tasks.');

requireFile(report, 'config/private-beta-execution-bridge-map.json');
requireFile(report, 'docs/PRIVATE-BETA-SHORT-TASK-LIST-RUNBOOK.md');
const map = readJson('config/private-beta-execution-bridge-map.json') || { evidenceReports: [], shortTasks: [] };
const openReports = [];
for (const item of map.evidenceReports || []) {
  const summary = summarizeReport(item.file, item.readyStatuses || []);
  if (summary.accepted) pass(report, `${item.label}.ready`);
  else openReports.push({ label: item.label, status: summary.status, file: item.file, blockers: summary.blockers });
}
const tasks = (map.shortTasks || []).map((task, index) => ({ id: `PB-${String(index + 1).padStart(2, '0')}`, ...task }));
for (const task of tasks) action(report, { priority: task.priority, domain: task.track, summary: task.title, command: task.command });
for (const item of openReports) block(report, `${item.label}: ${item.status}`, { file: item.file });
report.summary = { tasks: tasks.length, openReports: openReports.length };
report.tasks = tasks;
report.openReports = openReports;
report.markdownPath = markdownPath;
report.status = report.failures.length ? 'failed' : openReports.length ? 'private_beta_short_task_list_has_open_items' : 'private_beta_short_task_list_clear';
report.decision = report.status === 'private_beta_short_task_list_clear' ? 'GO' : 'NO_GO';
if (checkEnv) report.checkEnv = true;
if (!dryRun || writeReport) writeMarkdown(markdownPath, renderMarkdown(report, tasks, openReports));
finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);

function writeMarkdown(file, text) {
  const target = path.join(process.cwd(), file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}
function renderMarkdown(currentReport, tasks, openReports) {
  const lines = ['# Private Beta Short Task List', '', `Decision: **${currentReport.decision}**`, `Status: \`${currentReport.status}\``, '', '## Do these first', ''];
  for (const task of tasks) lines.push(`- **${task.id} / ${task.priority} / ${task.track}** — ${task.title}\n  - Command: \`${task.command}\``);
  lines.push('', '## Open evidence reports', '');
  if (!openReports.length) lines.push('- None.');
  else for (const item of openReports) lines.push(`- ${item.label}: \`${item.status}\` (${item.file})`);
  return `${lines.join('\n')}\n`;
}
