#!/usr/bin/env node
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

function requireSnippets(file, snippets) {
  const content = read(file);
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${file} missing snippet: ${snippet}`);
  }
}

requireSnippets('assets/js/services/wallet-service.js', [
  'getWalletProviderStatus',
  'shouldUseWalletApi',
  "walletBoundaryList('walletSummary'",
  "walletBoundaryList('walletTransactions'",
  "walletBoundaryList('walletMonthlyDashboard'",
  "walletBoundaryList('walletReceivablesSchedule'",
  "walletBoundaryAction('walletSummary', 'saveBankAccount'",
  "walletBoundaryCreate('receivables'",
  "walletBoundaryCreate('withdrawals'",
  "walletBoundaryCreate('disputes'",
  "walletBoundaryAction('disputes', 'respond'",
  "walletBoundaryAction('withdrawals', actionName"
]);

requireSnippets('assets/js/services/api-repository-provider.js', [
  "walletSummary: '/wallet'",
  "walletMonthlyDashboard: '/wallet/dashboard'",
  "walletMonthlyHistory: '/wallet/monthly-history'",
  "walletReceivablesSchedule: '/wallet/receivables/schedule'",
  "walletBankAccount: '/wallet/bank-account'",
  "saveBankAccount: '/wallet/bank-account'",
  "approve: '/withdrawals/:id/approve'",
  "decline: '/withdrawals/:id/decline'",
  "release: '/admin/disputes/:id/release'",
  "refund: '/admin/disputes/:id/refund'"
]);

requireSnippets('assets/js/services/mock-repository-provider.js', [
  "wallet: 'walletSummary'",
  'mockWalletList',
  'mockWalletCreate',
  'mockWalletAction',
  'walletReceivablesSchedule',
  'walletBankAccount'
]);

requireSnippets('assets/js/contracts/backend-domain-contract.js', [
  'WALLET_TRANSACTION_TYPE',
  'RECEIPT_TYPE',
  'walletTransactionType',
  'receiptType'
]);

requireSnippets('docs/API-ADAPTER-CONTRACT.md', [
  'Sprint 12F',
  'GET /wallet',
  'POST /withdrawals/:id/approve',
  'POST /admin/disputes/:id/refund'
]);

requireSnippets('docs/BACKEND-INTEGRATION-PLAN.md', [
  'Sprint 12F',
  'Carteira/financeiro real controlado'
]);

const packageJson = read('package.json');
try {
  const parsed = JSON.parse(packageJson);
  if (!parsed.scripts || parsed.scripts['audit:wallet-api-contract'] !== 'node scripts/audit-wallet-api-contract.js') {
    failures.push('package.json missing audit:wallet-api-contract script.');
  }
} catch (error) {
  failures.push(`package.json is invalid JSON: ${error.message}`);
}

if (failures.length) {
  console.error('Wallet API contract audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Wallet API contract audit passed.');
console.log('Wallet provider default remains mock; API path is controlled by repositoryBoundary.');
