'use strict';

const fs = require('fs');
const path = require('path');
const { makeReport, requireFile, readJson, action, pass, block, fail, finish } = require('./lib/private-beta-resolution-utils');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = 'reports/generated/staging-security-manual-checklist-report.json';
const checklistPath = 'reports/generated/staging-security-manual-checklist.md';
const report = makeReport('staging-security-manual-checklist', 'staging-security', 'Create a manual checklist for staging, secrets, seed binding, rollback, and security review before private beta entry.');

const checks = [
  { id: 'environment_marker', priority: 'P0', env: 'DOKE_ENVIRONMENT', expected: 'staging', summary: 'Set DOKE_ENVIRONMENT=staging.' },
  { id: 'api_url', priority: 'P0', env: 'DOKE_STAGING_API_URL', summary: 'Set a staging/sandbox API URL, never production.' },
  { id: 'db_url', priority: 'P0', env: 'DOKE_SUPABASE_DB_URL', secret: true, summary: 'Set the Supabase staging DB URL through local env only.' },
  { id: 'seed_confirm', priority: 'P0', env: 'DOKE_STAGING_SEED_BINDER_CONFIRM', expected: 'bind-staging-seeds', summary: 'Confirm staging seed binding intentionally.' },
  { id: 'seed_execute', priority: 'P0', env: 'DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE', expected: '1', summary: 'Allow staging seed operator execution only after checking target.' },
  { id: 'network_flag', priority: 'P1', env: 'DOKE_BACKEND_REAL_STAGING_ALLOW_NETWORK', expected: '1', summary: 'Allow staging network only when target is verified.' },
  { id: 'mutation_flag', priority: 'P1', env: 'DOKE_BACKEND_REAL_STAGING_ALLOW_MUTATIONS', expected: '1', summary: 'Allow staging mutations only after seed backup and rollback path.' },
  { id: 'rollback_owner', priority: 'P0', env: 'DOKE_PRIVATE_BETA_ROLLBACK_OWNER', summary: 'Assign a human rollback owner.' },
  { id: 'support_owner', priority: 'P1', env: 'DOKE_PRIVATE_BETA_SUPPORT_OWNER', summary: 'Assign a support owner for beta users.' },
  { id: 'incident_channel', priority: 'P1', env: 'DOKE_PRIVATE_BETA_INCIDENT_CHANNEL', summary: 'Define incident channel before user entry.' },
  { id: 'security_reviewer', priority: 'P0', env: 'DOKE_SECURITY_REVIEWER', summary: 'Name the person responsible for security/secrets review.' }
];

main();

function main() {
  requireFile(report, 'docs/STAGING-SECURITY-MANUAL-CHECKLIST-RUNBOOK.md');
  requireFile(report, 'config/staging-seed-operator.env.example');
  requireFile(report, 'config/staging-real.env.example');
  const stagingEnvReport = readJson('reports/generated/staging-external-secrets-checklist-report.json');
  const stagingReviewReport = readJson('reports/generated/staging-evidence-review-report.json');

  const checklist = checks.map((check) => evaluateCheck(check));
  for (const item of checklist) {
    if (item.status === 'passed') pass(report, `staging_security.${item.id}.passed`);
    else {
      block(report, `${item.id}: ${item.summary}`);
      action(report, { priority: item.priority, domain: 'staging-security', source: item.id, summary: item.summary, command: item.command || null });
    }
  }

  if (stagingEnvReport && !stagingEnvReport.__parseError && String(stagingEnvReport.status || '').includes('ready')) pass(report, 'staging.externalSecrets.report.ready');
  else block(report, 'Staging external secrets report is not ready.', { file: 'reports/generated/staging-external-secrets-checklist-report.json' });
  if (stagingReviewReport && !stagingReviewReport.__parseError && String(stagingReviewReport.status || '').includes('ready')) pass(report, 'staging.review.report.ready');
  else block(report, 'Staging evidence review report is not ready.', { file: 'reports/generated/staging-evidence-review-report.json' });

  if (process.env.DOKE_STAGING_API_URL && looksProductionLike(process.env.DOKE_STAGING_API_URL)) fail(report, 'DOKE_STAGING_API_URL looks production-like; use a staging/sandbox/local target.');

  report.summary = {
    total: checklist.length,
    passed: checklist.filter((item) => item.status === 'passed').length,
    blocked: checklist.filter((item) => item.status !== 'passed').length,
    secretsPrinted: false
  };
  report.checklist = checklist.map((item) => ({ ...item, valuePreview: item.valuePreview }));
  report.checklistPath = checklistPath;
  if (!dryRun || writeReport) writeMarkdown(checklistPath, renderMarkdown(checklist, report.summary));
  if (checkEnv) report.checkEnv = true;
  report.status = report.failures.length ? 'failed' : report.blockers.length || report.actions.length ? 'staging_security_manual_checklist_has_open_items' : 'staging_security_manual_checklist_clear';
  report.decision = report.status === 'staging_security_manual_checklist_clear' ? 'GO' : 'NO_GO';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}

function evaluateCheck(check) {
  const actual = process.env[check.env];
  const ok = check.expected ? actual === check.expected : Boolean(actual);
  return {
    id: check.id,
    priority: check.priority,
    env: check.env,
    status: ok ? 'passed' : 'blocked',
    summary: check.summary,
    valuePreview: check.secret ? (actual ? '<set>' : '<missing>') : actual ? preview(actual) : '<missing>',
    command: `$env:${check.env}="${check.expected || '<value>'}"`
  };
}
function preview(value) {
  const text = String(value);
  if (text.length <= 18) return text;
  return `${text.slice(0, 10)}...${text.slice(-4)}`;
}
function looksProductionLike(url) {
  const text = String(url).toLowerCase();
  return text.includes('prod') || (!text.includes('staging') && !text.includes('stg') && !text.includes('sandbox') && !text.includes('localhost') && !text.includes('127.0.0.1') && !text.includes('preview'));
}
function writeMarkdown(file, text) {
  const target = path.join(process.cwd(), file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}
function renderMarkdown(checklist, summary) {
  const lines = ['# Staging + Security Manual Checklist', '', `Passed: ${summary.passed}/${summary.total}`, '', '| Priority | Check | Env | Status | Action |', '|---|---|---|---|---|'];
  for (const item of checklist) lines.push(`| ${item.priority} | ${item.id} | ${item.env} | ${item.status} | ${item.summary} |`);
  lines.push('', 'Secrets are never printed in full by this checklist.');
  return `${lines.join('\n')}\n`;
}
