#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const tableMigration = read('supabase/migrations/106_financial_table_permission_authority.sql');
const rpcMigration = read('supabase/migrations/107_financial_rpc_authority.sql');
const operatorMigration = read('supabase/migrations/108_financial_operator_authority.sql');
const finalMigration = read('supabase/migrations/109_financial_final_permissions.sql');
const edge = read('supabase/functions/financial-operations/index.ts');
const repository = read('assets/js/repositories/finance-repository.js');

for (const table of ['api_idempotency_keys','wallets','wallet_bank_accounts','payments','transactions','wallet_receivables','withdrawals','payment_disputes','dispute_events','receipts','admin_audit_events']) {
  assert(tableMigration.includes(`revoke all privileges on table public.${table} from public, anon, authenticated, service_role`), `${table} must revoke broad grants.`);
}
assert(!/grant\s+(?:all|truncate|references|trigger)/i.test(tableMigration), 'Financial table migration must not regrant structural privileges.');
assert(tableMigration.includes('grant select on table public.wallets to authenticated'), 'Browser wallet access must be read-only.');
assert(!tableMigration.includes('grant select on table public.api_idempotency_keys to authenticated'), 'Idempotency table must remain server-only.');
assert(tableMigration.includes('drop policy if exists wallet_owner_inserts_bank_account'), 'Direct bank-account insert policy must be removed.');
assert(tableMigration.includes('drop policy if exists wallet_owner_updates_bank_account'), 'Direct bank-account update policy must be removed.');

for (const legacy of ['claim_idempotency_key','complete_idempotency_key','fail_idempotency_key','finance_resolve_order','record_order_payment','register_order_receivable','release_order_receivable','resolve_wallet_withdrawal','resolve_wallet_dispute']) {
  assert(rpcMigration.includes(`public.${legacy}`) && finalMigration.includes(`public.${legacy}`), `${legacy} must be locked and reasserted.`);
}
for (const selfService of ['save_wallet_bank_account','request_wallet_withdrawal','open_wallet_dispute','respond_wallet_dispute']) {
  assert(finalMigration.includes(`grant execute on function public.${selfService}`), `${selfService} must be explicitly granted to authenticated.`);
}
assert(rpcMigration.includes("private.require_active_financial_actor(v_actor, array['professional']::text[])"), 'Professional wallet actions must use canonical role authority.');
assert(rpcMigration.includes("private.require_active_financial_actor(v_actor, array['client']::text[])"), 'Client dispute actions must use canonical role authority.');
assert(operatorMigration.includes("array['support', 'admin']::text[]"), 'Operator decisions must require support/admin.');
assert(finalMigration.includes('alter default privileges for role postgres in schema public revoke execute on functions from public'), 'Future function grants must fail closed.');
assert(edge.includes('authClient.auth.getUser()'), 'Edge function must validate the bearer JWT.');
assert(edge.includes('.from("users")') && edge.includes('["support", "admin"].includes(role)'), 'Edge function must read canonical role/status.');
assert(edge.includes('resolve_wallet_withdrawal_internal') && edge.includes('resolve_wallet_dispute_internal'), 'Edge function must call service-only internal RPCs.');
assert(!repository.includes("callRpc('resolve_wallet_withdrawal'"), 'Frontend must not call legacy withdrawal resolution RPC directly.');
assert(!repository.includes("callRpc('resolve_wallet_dispute'"), 'Frontend must not call legacy dispute resolution RPC directly.');
assert(!repository.includes("callRpc('record_order_payment'"), 'Frontend must not materialize payment authority directly.');
assert(!repository.includes("callRpc('register_order_receivable'"), 'Frontend must not materialize receivables directly.');
assert(!repository.includes("callRpc('release_order_receivable'"), 'Frontend must not release escrow directly.');

console.log('Financial RPC authority contract passed.');
