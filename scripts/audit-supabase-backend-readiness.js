#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) {
    failures.push(`Missing file: ${file}`);
    return '';
  }
  return fs.readFileSync(absolute, 'utf8');
}

function requireSnippets(file, snippets) {
  const source = read(file);
  snippets.forEach((snippet) => {
    if (!source.includes(snippet)) failures.push(`${file} missing snippet: ${snippet}`);
  });
}

function requireJson(file, validator) {
  const source = read(file);
  try {
    const parsed = JSON.parse(source);
    validator(parsed);
  } catch (error) {
    failures.push(`${file} is invalid JSON: ${error.message}`);
  }
}

requireSnippets('supabase/migrations/004_mvp_backend_security_foundation.sql', [
  'users_role_check',
  "'support'",
  'create table if not exists public.api_idempotency_keys',
  'create table if not exists public.receipts',
  'create table if not exists public.wallet_receivables',
  'create table if not exists public.withdrawals',
  'create table if not exists public.payment_disputes',
  'create table if not exists public.admin_audit_events',
  'enable row level security',
  'public.is_support_or_admin()',
  'public.claim_idempotency_key',
  'support resolves disputes',
  'support resolves withdrawals'
]);

requireSnippets('supabase/seed/002_mvp_controlled_seed.sql', [
  'cliente@doke.local',
  'profissional@doke.local',
  'suporte@doke.local',
  'admin@doke.local',
  'public.payment_disputes',
  'public.wallet_receivables',
  'public.withdrawals',
  'public.admin_audit_events',
  'DOKE-DEMO-RECEIPT-001'
]);

requireJson('backend/shared/contracts/api-actions.json', (contract) => {
  const actions = Array.isArray(contract.serverActions) ? contract.serverActions : [];
  const names = actions.map((action) => action.name);
  [
    'orders.accept',
    'messages.send',
    'disputes.release',
    'disputes.refund',
    'withdrawals.approve',
    'withdrawals.decline'
  ].forEach((name) => {
    if (!names.includes(name)) failures.push(`backend/shared/contracts/api-actions.json missing action: ${name}`);
  });
  const sensitiveActions = actions.filter((action) => /disputes\.(release|refund)|withdrawals\.(approve|decline|request)/.test(action.name));
  sensitiveActions.forEach((action) => {
    if (action.idempotencyRequired !== true) failures.push(`${action.name} must require idempotency`);
    if (action.auditRequired !== true) failures.push(`${action.name} must require audit`);
  });
  if (!Array.isArray(contract.roles) || !contract.roles.includes('support') || !contract.roles.includes('admin')) {
    failures.push('backend/shared/contracts/api-actions.json must include support and admin roles');
  }
});

requireSnippets('docs/SUPABASE-BACKEND-READINESS.md', [
  'Sprint 15',
  'idempotency',
  'RLS',
  'support/admin',
  'npm run audit:supabase-backend-readiness'
]);

requireSnippets('docs/BACKEND-INTEGRATION-PLAN.md', [
  'Sprint 15',
  'supabase/migrations/004_mvp_backend_security_foundation.sql',
  'api_idempotency_keys',
  'admin_audit_events'
]);

requireSnippets('docs/DATA-READY-CONTRACTS.md', [
  'Sprint 15',
  'Supabase backend readiness',
  'backend/shared/contracts/api-actions.json'
]);

requireSnippets('docs/ACTIVE-CONTRACTS-INDEX.md', [
  'docs/SUPABASE-BACKEND-READINESS.md',
  'audit:supabase-backend-readiness'
]);

requireSnippets('docs/VALIDATION.md', [
  'audit:supabase-backend-readiness',
  'Sprint 15'
]);

const packageJson = read('package.json');
try {
  const parsed = JSON.parse(packageJson);
  if (!parsed.scripts || parsed.scripts['audit:supabase-backend-readiness'] !== 'node scripts/audit-supabase-backend-readiness.js') {
    failures.push('package.json missing audit:supabase-backend-readiness script.');
  }
} catch (error) {
  failures.push(`package.json is invalid JSON: ${error.message}`);
}

if (failures.length) {
  console.error('Supabase backend readiness audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Supabase backend readiness audit passed.');
console.log('Backend remains gated; frontend provider default must remain mock until staging validation is complete.');
