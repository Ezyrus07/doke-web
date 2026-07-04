'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();

function absolute(file) {
  return path.join(root, file);
}

function fileExists(file) {
  return fs.existsSync(absolute(file));
}

function readJson(file, report) {
  const target = absolute(file);
  if (!fs.existsSync(target)) return null;
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    if (report) report.failures.push(`${file} is not valid JSON: ${error.message}`);
    return null;
  }
}

function writeJson(file, payload) {
  const target = absolute(file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
}

function loadPackage(report) {
  const payload = readJson('package.json', report);
  return payload || { scripts: {} };
}

function hasPackageScript(name, report) {
  const pkg = loadPackage(report);
  return Boolean(pkg.scripts && pkg.scripts[name]);
}

function requirePackageScript(name, report) {
  if (hasPackageScript(name, report)) pass(report, `script.${name}.present`);
  else fail(report, `Missing package script: ${name}`);
}

function requireFile(file, report) {
  if (fileExists(file)) pass(report, `${file}.present`);
  else fail(report, `Missing required file: ${file}`);
}

function summarizeReport(file, acceptedStatuses, report) {
  const payload = readJson(file, report);
  const summary = {
    file,
    present: Boolean(payload),
    status: payload ? payload.status || 'missing_status' : 'missing_report',
    decision: payload ? payload.decision || null : null,
    acceptedStatuses,
    accepted: false,
    blockers: [],
    failures: []
  };
  if (!payload) {
    summary.blockers.push(`Missing report: ${file}`);
    return summary;
  }
  summary.blockers = Array.isArray(payload.blockers) ? payload.blockers.slice() : [];
  summary.failures = Array.isArray(payload.failures) ? payload.failures.slice() : [];
  summary.accepted = acceptedStatuses.includes(summary.status);
  return summary;
}

function addSummaryResult(report, name, summary) {
  report.reportSummaries.push({ name, ...summary });
  if (summary.failures.length) {
    block(report, `${name} has failures in ${summary.file}.`);
  }
  if (summary.accepted) {
    pass(report, `${name}.status.accepted`, { status: summary.status });
  } else {
    block(report, `${name} status ${summary.status} is not accepted for GO.`);
  }
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function statusFrom(report, blockedStatus, readyStatus) {
  if (report.failures.length) return 'failed';
  if (report.blockers.length) return blockedStatus;
  return readyStatus;
}

function pass(report, name, details = {}) {
  report.results.push({ name, status: 'passed', ...details });
}

function block(report, message) {
  report.blockers.push(message);
}

function fail(report, message) {
  report.failures.push(message);
}

function finish(report, reportPath, writeReport, exitCode = 0) {
  if (writeReport) writeJson(reportPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(exitCode);
}

module.exports = {
  root,
  absolute,
  fileExists,
  readJson,
  writeJson,
  loadPackage,
  hasPackageScript,
  requirePackageScript,
  requireFile,
  summarizeReport,
  addSummaryResult,
  unique,
  statusFrom,
  pass,
  block,
  fail,
  finish
};
