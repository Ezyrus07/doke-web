#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing file: ${file}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function requireSnippet(file, snippet) {
  const content = read(file);
  if (!content.includes(snippet)) failures.push(`${file} missing snippet: ${snippet}`);
}

function requireJs(file) {
  try {
    return require(path.join(root, file));
  } catch (error) {
    failures.push(`${file} cannot be required: ${error.message}`);
    return null;
  }
}

const walletHandlers = read('backend/modules/wallet/route-handlers.js');
[
  'handlers.getWalletSummary = handler',
  'handlers.listWalletTransactions = handler',
  'handlers.getWalletDashboard = handler',
  'handlers.getWalletMonthlyHistory = handler',
  'handlers.getReceivablesSchedule = handler',
  'handlers.getBankAccount = handler',
  'handlers.saveBankAccount = audited',
  'handlers.listReceivables = handler',
  'handlers.createReceivable = audited',
  'handlers.listWithdrawals = handler',
  'handlers.requestWithdrawal = audited',
  'handlers.listDisputes = handler',
  'handlers.openDispute = audited',
  'handlers.respondDispute = audited',
  'handlers.listReceipts = handler',
  'handlers.getReceipt = handler'
].forEach((snippet) => {
  if (!walletHandlers.includes(snippet)) failures.push(`wallet route handlers missing ${snippet}`);
});

const adminHandlers = read('backend/modules/admin/route-handlers.js');
[
  'handlers.approveWithdrawal = audited',
  'handlers.declineWithdrawal = audited',
  'handlers.releaseDispute = audited',
  'handlers.refundDispute = audited',
  'handlers.listAuditEvents = handler'
].forEach((snippet) => {
  if (!adminHandlers.includes(snippet)) failures.push(`admin route handlers missing ${snippet}`);
});

[
  'getWalletSummary',
  'listWalletTransactions',
  'getWalletDashboard',
  'getWalletMonthlyHistory',
  'getReceivablesSchedule',
  'getBankAccount',
  'saveBankAccount',
  'listReceivables',
  'createReceivable',
  'listWithdrawals',
  'requestWithdrawal',
  'approveWithdrawal',
  'declineWithdrawal',
  'listDisputes',
  'openDispute',
  'respondDispute',
  'releaseDispute',
  'refundDispute',
  'listReceipts',
  'getReceipt',
  'listAuditEvents',
  'recordAdminAuditEvent',
  "from('wallets')",
  "from('transactions')",
  "from('wallet_receivables')",
  "from('withdrawals')",
  "from('payment_disputes')",
  "from('receipts')",
  "from('wallet_bank_accounts')",
  "from('admin_audit_events')"
].forEach((snippet) => requireSnippet('backend/modules/wallet/wallet-service.js', snippet));

[
  'create table if not exists public.wallet_bank_accounts',
  'alter table public.wallet_bank_accounts enable row level security',
  'wallet owner saves bank account'
].forEach((snippet) => requireSnippet('supabase/migrations/005_wallet_runtime_foundation.sql', snippet));

const registry = requireJs('backend/shared/http/route-registry.js');
const loader = requireJs('backend/shared/http/module-route-loader.js');
if (registry && loader) {
  const expectedRoutes = [
    'wallet.summary',
    'wallet.transactions',
    'wallet.dashboard',
    'wallet.monthlyHistory',
    'wallet.receivablesSchedule',
    'wallet.bankAccount',
    'wallet.saveBankAccount',
    'receivables.list',
    'receivables.create',
    'withdrawals.list',
    'withdrawals.request',
    'withdrawals.approve',
    'withdrawals.decline',
    'disputes.list',
    'disputes.open',
    'disputes.respond',
    'disputes.release',
    'disputes.refund',
    'receipts.list',
    'receipts.get',
    'auditEvents.list'
  ];

  expectedRoutes.forEach((name) => {
    const route = registry.findRouteByName(name);
    if (!route) failures.push(`wallet/admin route missing from registry: ${name}`);
    if (route) {
      const handler = loader.getHandler(route.module, route.handler);
      if (typeof handler !== 'function') failures.push(`wallet/admin handler not loaded: ${route.module}.${route.handler}`);
    }
  });
}

requireSnippet('docs/STAGING-API-RUNTIME.md', 'Sprint 21');
requireSnippet('docs/STAGING-API-RUNTIME.md', 'GET /wallet');
requireSnippet('docs/STAGING-API-RUNTIME.md', 'POST /withdrawals');
requireSnippet('docs/STAGING-API-RUNTIME.md', 'POST /admin/disputes/:id/refund');
requireSnippet('docs/API-ENDPOINT-READINESS.md', 'wallet runtime');
requireSnippet('docs/BACKEND-INTEGRATION-PLAN.md', 'Sprint 21');
requireSnippet('docs/DATA-READY-CONTRACTS.md', 'audit:staging-wallet-runtime');
requireSnippet('docs/ACTIVE-CONTRACTS-INDEX.md', 'audit:staging-wallet-runtime');
requireSnippet('docs/VALIDATION.md', 'audit:staging-wallet-runtime');

const packageJson = JSON.parse(read('package.json') || '{}');
if (!packageJson.scripts || packageJson.scripts['audit:staging-wallet-runtime'] !== 'node scripts/audit-staging-wallet-runtime.js') {
  failures.push('package.json missing audit:staging-wallet-runtime script.');
}

if (failures.length) {
  console.error('audit:staging-wallet-runtime failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('audit:staging-wallet-runtime passed');
