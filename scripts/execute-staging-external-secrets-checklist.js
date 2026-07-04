'use strict';
const fs = require('fs');
const path = require('path');
const { makeReport, requireFile, action, pass, block, status, finish, writeJson } = require('./lib/private-beta-resolution-utils');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = 'reports/generated/staging-external-secrets-checklist-report.json';
const checklistPath = 'reports/generated/staging-external-secrets-checklist.json';
const mdPath = 'reports/generated/staging-external-secrets-checklist.md';
const required = [
  { name: 'DOKE_ENVIRONMENT', expected: 'staging', secret: false },
  { name: 'DOKE_STAGING_API_URL', marker: true, secret: false },
  { name: 'DOKE_SUPABASE_DB_URL', secret: true },
  { name: 'DOKE_STAGING_SEED_BINDER_CONFIRM', expected: 'bind-staging-seeds', secret: false },
  { name: 'DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE', expected: '1', secret: false }
];
const optional = [
  { name: 'DOKE_STAGING_SERVICE_ROLE_KEY', secret: true },
  { name: 'DOKE_STAGING_ANON_KEY', secret: true },
  { name: 'DOKE_STAGING_PROJECT_REF', secret: false },
  { name: 'DOKE_STAGING_SECRETS_OWNER', secret: false },
  { name: 'DOKE_STAGING_APPROVED_BY', secret: false }
];
const safeMarkers = ['localhost', '127.0.0.1', 'staging', 'stg', 'preview', 'sandbox', 'local'];
const report = makeReport('staging-external-secrets-checklist', 'staging', 'Validate staging environment variable presence without printing secrets and produce an external secrets checklist.');
main();
function main() {
  requireFile(report, 'docs/STAGING-EXTERNAL-SECRETS-CHECKLIST-RUNBOOK.md');
  const rows = [];
  for (const item of required) rows.push(evaluate(item, true));
  for (const item of optional) rows.push(evaluate(item, false));
  const blockers = rows.filter((row) => row.required && row.status !== 'ready');
  for (const row of rows) {
    if (row.status === 'ready') pass(report, `${row.name}.ready`);
    else if (row.required) {
      block(report, `${row.name} is ${row.status}.`);
      action(report, { priority: 'P0', domain: 'staging', source: row.name, summary: `Provide ${row.name} from your external secret manager or local shell only.`, evidence: row.reason });
    }
  }
  if (!process.env.DOKE_STAGING_SECRETS_OWNER) block(report, 'DOKE_STAGING_SECRETS_OWNER is recommended before staging binding.');
  report.checklistPath = checklistPath;
  report.markdownPath = mdPath;
  report.summary = { required: required.length, optional: optional.length, blocked: blockers.length };
  if (!dryRun || writeReport) {
    writeJson(checklistPath, { generatedAt: new Date().toISOString(), rows });
    fs.writeFileSync(path.join(process.cwd(), mdPath), renderMarkdown(rows));
  }
  if (checkEnv) report.checkEnv = true;
  report.status = status(report, 'staging_external_secrets_checklist_ready', 'staging_external_secrets_checklist_has_blockers');
  report.decision = report.status === 'staging_external_secrets_checklist_ready' ? 'GO' : 'NO_GO';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}
function evaluate(item, required) {
  const value = process.env[item.name] || '';
  let statusValue = value ? 'ready' : 'missing';
  let reason = value ? 'present' : 'missing';
  if (value && item.expected && value !== item.expected) { statusValue = 'invalid'; reason = `expected ${item.expected}`; }
  if (value && item.marker && !safeMarkers.some((marker) => value.toLowerCase().includes(marker))) { statusValue = 'unsafe_url'; reason = 'URL does not include a staging/local/sandbox marker'; }
  if (value && /prod|production/i.test(value) && !/nonprod|not-production/i.test(value)) { statusValue = 'unsafe_url'; reason = 'value appears production-like'; }
  return { name: item.name, required, secret: Boolean(item.secret), status: statusValue, reason, valuePreview: value ? mask(value, item.secret) : null };
}
function mask(value, secret) {
  if (!secret) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
function renderMarkdown(rows) {
  const lines = ['# Staging External Secrets Checklist', '', 'Do not commit real secrets. Set them in the shell/session or an external secret manager.', '', '| Env | Required | Secret | Status | Notes |', '|---|---|---|---|---|'];
  for (const row of rows) lines.push(`| ${row.name} | ${row.required ? 'yes' : 'no'} | ${row.secret ? 'yes' : 'no'} | ${row.status} | ${row.reason} |`);
  return `${lines.join('\n')}\n`;
}
