'use strict';

const fs = require('fs');
const assert = require('assert');

const repository = fs.readFileSync('assets/js/repositories/finance-repository.js', 'utf8');
const walletService = fs.readFileSync('assets/js/services/wallet-service.js', 'utf8');
const paymentService = fs.readFileSync('assets/js/services/payment-service.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/014_finance_wallet_shared_runtime.sql', 'utf8');
const config = fs.readFileSync('assets/js/core/supabase-config.js', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert(repository.includes("PAYMENTS_TABLE = 'payments'"), 'Finance repository must use public.payments.');
assert(repository.includes("TRANSACTIONS_TABLE = 'transactions'"), 'Finance repository must use the wallet ledger.');
assert(repository.includes('data-doke-finance-provider'), 'Finance provider marker is required.');
assert(repository.includes("callRpc('record_order_payment'"), 'Payment writes must use the guarded RPC.');
assert(repository.includes("callRpc('register_order_receivable'"), 'Escrow registration must use the guarded RPC.');
assert(repository.includes("callRpc('release_order_receivable'"), 'Escrow release must use the guarded RPC.');
assert(repository.includes("callRpc('request_wallet_withdrawal'"), 'Withdrawal requests must be atomic.');
assert(repository.includes("callRpc('resolve_wallet_withdrawal'"), 'Withdrawal resolution must be server-side.');
assert(repository.includes("callRpc('open_wallet_dispute'"), 'Disputes must be opened through RPC.');
assert(repository.includes('local-simulation'), 'Local financial fallback must be explicitly marked as simulation.');
assert(!repository.includes('synchronizePending'), 'Local financial simulations must not auto-promote to remote money movements.');
assert(walletService.includes('ensureRepositoryLoaded'), 'Wallet reads must hydrate the remote ledger before calculations.');
assert(paymentService.includes('localFinancialSimulation'), 'Payment provider status must expose simulation fallback.');
assert(config.includes('walletEnabled: true'), 'Wallet Supabase flag must be enabled.');
assert(config.includes('paymentsEnabled: true'), 'Payments Supabase flag must be enabled.');

assert(migration.includes('create table if not exists public.payments'), 'Canonical payments table is required.');
assert(migration.includes('payments_participants_select'), 'Payment participant RLS is required.');
assert(migration.includes('revoke insert, update, delete on public.payments from authenticated'), 'Direct payment writes must be blocked.');
assert(migration.includes('record_order_payment'), 'Payment RPC is required.');
assert(migration.includes('register_order_receivable'), 'Escrow registration RPC is required.');
assert(migration.includes('release_order_receivable'), 'Escrow release RPC is required.');
assert(migration.includes('request_wallet_withdrawal'), 'Withdrawal request RPC is required.');
assert(migration.includes('resolve_wallet_withdrawal'), 'Withdrawal resolution RPC is required.');
assert(migration.includes('open_wallet_dispute'), 'Dispute opening RPC is required.');
assert(migration.includes('respond_wallet_dispute'), 'Dispute response RPC is required.');
assert(migration.includes('resolve_wallet_dispute'), 'Dispute resolution RPC is required.');
assert(migration.includes('pending_cents = pending_cents + v_payment.net_amount_cents'), 'Escrow registration must increment pending balance atomically.');
assert(migration.includes('balance_cents = balance_cents + v_transaction.net_amount_cents'), 'Escrow release must credit available balance atomically.');
assert(migration.includes('balance_cents = balance_cents - p_amount_cents'), 'Withdrawal must reserve available balance atomically.');
assert(!migration.includes('to anon'), 'Financial data must never be exposed to anonymous users.');

[
  'carteira.html',
  'pagamento-profissional.html',
  'mensagens.html',
  'pedidos.html',
  'admin.html',
  'avaliacao-profissional.html'
].forEach((file) => {
  const html = fs.readFileSync(file, 'utf8');
  assert(html.includes('supabase-config.js?v=20260718-finance-backend-v1'), `${file} must load the current finance configuration.`);
  assert(html.includes('finance-repository.js?v=20260718-finance-supabase-v1'), `${file} must load the canonical finance repository.`);
});

assert.strictEqual(
  packageJson.scripts['test:finance-supabase-repository-contract'],
  'node scripts/test-finance-supabase-repository-contract.js',
  'Package script for the finance Supabase contract is required.'
);

console.log('Finance Supabase repository contract: PASS');
