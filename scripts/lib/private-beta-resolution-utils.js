'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();

function absolute(file) {
  return path.join(root, file);
}

function exists(file) {
  return fs.existsSync(absolute(file));
}

function readJson(file) {
  const target = absolute(file);
  if (!fs.existsSync(target)) return null;
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    return { __parseError: error.message };
  }
}

function writeJson(file, payload) {
  const target = absolute(file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
}

function readText(file) {
  const target = absolute(file);
  return fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
}

function loadPackage() {
  return readJson('package.json') || { scripts: {} };
}

function hasScript(name) {
  const pkg = loadPackage();
  return Boolean(pkg.scripts && pkg.scripts[name]);
}

function requireFile(report, file) {
  if (exists(file)) pass(report, `${file}.present`);
  else fail(report, `Missing required file: ${file}`);
}

function requireScript(report, name) {
  if (hasScript(name)) pass(report, `script.${name}.present`);
  else fail(report, `Missing package script: ${name}`);
}

function pass(report, name, details = {}) {
  report.results.push({ name, status: 'passed', ...details });
}

function block(report, message, details = {}) {
  report.blockers.push({ message, ...details });
}

function fail(report, message, details = {}) {
  report.failures.push({ message, ...details });
}

function action(report, item) {
  report.actions.push({ priority: item.priority || 'P2', owner: item.owner || 'manual', domain: item.domain || report.domain || 'private-beta', source: item.source || null, summary: item.summary, evidence: item.evidence || null, command: item.command || null });
}

function normalizeMessages(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(normalizeMessages);
  if (typeof value === 'string') return [value];
  if (typeof value === 'object') {
    if (value.message) return [String(value.message)];
    if (value.name) return [String(value.name)];
    return [JSON.stringify(value)];
  }
  return [String(value)];
}

function summarizeReport(file, acceptedStatuses = []) {
  const payload = readJson(file);
  const summary = {
    file,
    present: Boolean(payload),
    validJson: Boolean(payload && !payload.__parseError),
    status: payload && !payload.__parseError ? payload.status || 'missing_status' : payload && payload.__parseError ? 'invalid_json' : 'missing_report',
    decision: payload && !payload.__parseError ? payload.decision || null : null,
    accepted: false,
    blockers: [],
    failures: []
  };
  if (!payload) {
    summary.blockers.push(`Missing report: ${file}`);
    return summary;
  }
  if (payload.__parseError) {
    summary.failures.push(`${file} is invalid JSON: ${payload.__parseError}`);
    return summary;
  }
  summary.accepted = acceptedStatuses.includes(summary.status);
  summary.blockers = normalizeMessages(payload.blockers);
  summary.failures = normalizeMessages(payload.failures);
  return summary;
}

function addReportSummary(report, label, summary) {
  report.reportSummaries.push({ label, ...summary });
  if (!summary.present) block(report, `${label}: missing report`, { file: summary.file });
  else if (!summary.validJson) fail(report, `${label}: invalid JSON`, { file: summary.file });
  else if (summary.accepted) pass(report, `${label}.status.accepted`, { status: summary.status });
  else block(report, `${label}: status ${summary.status} not accepted`, { file: summary.file, status: summary.status });
  for (const failure of summary.failures) fail(report, `${label}: ${failure}`, { file: summary.file });
}

function makeReport(name, domain, objective) {
  return {
    name,
    domain,
    generatedAt: new Date().toISOString(),
    objective,
    changesVisualSurface: false,
    performsExternalNetworkRequest: false,
    performsExternalMutation: false,
    status: 'not_evaluated',
    decision: 'NO_GO',
    reportSummaries: [],
    actions: [],
    results: [],
    blockers: [],
    failures: []
  };
}

function status(report, readyStatus, blockedStatus) {
  if (report.failures.length) return 'failed';
  return report.blockers.length || report.actions.length ? blockedStatus : readyStatus;
}

function finish(report, reportPath, writeReport, exitCode = 0) {
  if (writeReport) writeJson(reportPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(exitCode);
}

function loadResolutionMap(report) {
  const file = 'config/private-beta-resolution-map.json';
  requireFile(report, file);
  return readJson(file) || { reports: {}, readyStatuses: {} };
}

module.exports = {
  root,
  absolute,
  exists,
  readJson,
  writeJson,
  readText,
  requireFile,
  requireScript,
  pass,
  block,
  fail,
  action,
  summarizeReport,
  addReportSummary,
  makeReport,
  status,
  finish,
  loadResolutionMap,
  normalizeMessages
};
