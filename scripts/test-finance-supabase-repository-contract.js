'use strict';

const fs = require('fs');
const assert = require('assert');

const repository = fs.readFileSync('assets/js/repositories/finance-repository.js', 'utf8');
const walletService = fs.readFileSync('assets/js/services/wallet-service.js', 'utf8');
const paymentService = fs.readFileSync('assets/js/services/payment-service.js', 'utf8');
const legacyMigration = fs.readFileSync('supabase/migrations/014_finance_wallet_shared_runtime.sql', 'utf8');
const authorityMigration = fs.readFileSync('supabase/migrations/107_financial_rpc_authority.sql', 'utf8');
const operatorMigration = fs.readFileSync('supabase/migrations/108_financial_operator_authority.sql', 'utf8');
const permissionMigration = fs.readFileSync('supabase/migrations/106_financial_table_permission_authority.sql', 'utf8');
const config = fs.readFileSync('assets/js/core/supabase-config.js', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert(repository.includes("PAYMENTS_TABLE = 'payments'"), 'Finance repository must use public.payments.');
assert(repository.includes("TRANSACTIONS_TABLE = 'transactions'"), 'Finance repository must use the wallet ledger.');
assert(repository.includes('data-doke-finance-provider'), 'Finance provider marker is required.');
assert(repository.includes('DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED'), 'Payment writes must fail closed until PSP authority exists.');
assert(!repository.includes("callRpc('register_order_receivable'"), 'Browser must not materialize receivables directly.');
assert(!repository.includes("callRpc('release_order_receivable'"), 'Browser must not release receivables directly.');
assert(repository.includes("callRpc('request_wallet_withdrawal'"), 'Withdrawal requests must be atomic.');
assert(repository.includes("callFinancialOperations('resolve_withdrawal'"), 'Withdrawal resolution must use the JWT-protected Edge Function.');
assert(repository.includes("callRpc('open_wallet_dispute'"), 'Disputes must be opened through RPC.');
assert(repository.includes('local-simulation'), 'Local financial fallback must be explicitly marked as simulation.');
assert(!repository.includes('synchronizePending'), 'Local financial simulations must not auto-promote to remote money movements.');
assert(walletService.includes('ensureRepositoryLoaded'), 'Wallet reads must hydrate the remote ledger before calculations.');
assert(paymentService.includes('localFinancialSimulation'), 'Payment provider status must expose simulation fallback.');
assert(config.includes('walletEnabled: true'), 'Wallet Supabase flag must be enabled.');
assert(config.includes('paymentsEnabled: true'), 'Payments Supabase flag must be enabled.');

assert(legacyMigration.includes('create table if not exists public.payments'), 'Canonical payments table is required.');
assert(permissionMigration.includes('payments_participants_select'), 'Payment participant RLS is required.');
assert(permissionMigration.includes('revoke all privileges on table public.payments from public, anon, authenticated, service_role'), 'Direct payment writes and structural grants must be blocked.');
assert(authorityMigration.includes('record_order_payment') && authorityMigration.includes('Locked legacy RPC'), 'Legacy payment RPC must be locked pending PSP authority.');
assert(authorityMigration.includes('register_order_receivable'), 'Legacy receivable RPC must be locked.');
assert(authorityMigration.includes('release_order_receivable'), 'Legacy escrow release RPC must be locked.');
assert(authorityMigration.includes('request_wallet_withdrawal'), 'Withdrawal request RPC is required.');
assert(operatorMigration.includes('resolve_wallet_withdrawal_internal'), 'Service-only withdrawal resolution RPC is required.');
assert(authorityMigration.includes('open_wallet_dispute'), 'Dispute opening RPC is required.');
assert(authorityMigration.includes('respond_wallet_dispute'), 'Dispute response RPC is required.');
assert(operatorMigration.includes('resolve_wallet_dispute_internal'), 'Service-only dispute resolution RPC is required.');
assert(legacyMigration.includes('pending_cents = pending_cents + v_payment.net_amount_cents'), 'Legacy escrow materialization remains documented for PSP migration.');
assert(operatorMigration.includes('balance_cents = balance_cents + v_transaction.net_amount_cents'), 'Operator dispute release must credit available balance atomically.');
assert(authorityMigration.includes('balance_cents = balance_cents - p_amount_cents'), 'Withdrawal must reserve available balance atomically.');
assert(!permissionMigration.includes('grant select on table public.wallets to anon'), 'Financial data must never be granted to anonymous users.');

[
  'carteira.html',
  'pagamento-profissional.html',
  'mensagens.html',
  'pedidos.html',
  'admin.html',
  'avaliacao-profissional.html'
].forEach((file) => {
  const html = fs.readFileSync(file, 'utf8');
  assert(/supabase-config\.js(?:\?[^\"']*)?/.test(html), `${file} must load the finance configuration.`);
  assert(/finance-repository\.js(?:\?[^\"']*)?/.test(html), `${file} must load the canonical finance repository.`);
});

assert.strictEqual(
  packageJson.scripts['test:finance-supabase-repository-contract'],
  'node scripts/test-finance-supabase-repository-contract.js',
  'Package script for the finance Supabase contract is required.'
);

console.log('Finance Supabase repository contract: PASS');
