'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const migration = [137, 138, 139, 140, 141, 142, 143, 144]
  .map((number) => fs.readdirSync(path.join(root, 'supabase/migrations'))
    .find((file) => file.startsWith(`${number}_staging_finance_sandbox`)))
  .map((file) => read(`supabase/migrations/${file}`))
  .join('\n');
const edge = read('supabase/functions/staging-finance-sandbox/index.ts');
const operations = read('supabase/functions/staging-finance-sandbox/operations.mjs');
const config = read('assets/js/core/supabase-config.js');
const finance = read('assets/js/repositories/finance-repository.js');
const payments = read('assets/js/services/payment-service.js');
const transactionalCanary = read('supabase/tests/013_staging_finance_sandbox_authority_validation.sql');
const cleanupRunbook = read('supabase/tests/014_staging_finance_sandbox_runtime_cleanup.sql');

assert(migration.includes('execute_staging_finance_sandbox_internal'), 'Sandbox dispatcher migration is missing.');
assert(migration.includes("doke_project_url") && migration.includes('zwkczgewzbsorbrjuzpb'), 'Database sandbox must be pinned to the staging project URL.');
assert(migration.includes("v_action not in ('hold_payment', 'request_completion', 'release_payment')"), 'Sandbox action allowlist is incomplete.');
assert(migration.includes('record_order_payment') && migration.includes('register_order_receivable') && migration.includes('release_order_receivable'), 'Sandbox must reuse the canonical finance ledger functions.');
assert(migration.includes('revoke all on function public.execute_staging_finance_sandbox_internal'), 'Dispatcher must be revoked from browser roles.');
assert(migration.includes('grant execute on function public.execute_staging_finance_sandbox_internal') && migration.includes('to service_role'), 'Dispatcher must be service-role-only.');
assert(!migration.includes('grant execute on function public.execute_staging_finance_sandbox_internal(uuid, text, jsonb)\n  to authenticated'), 'Authenticated role must never execute the internal dispatcher directly.');

assert(edge.includes('authClient.auth.getUser()'), 'Edge Function must derive the actor from a validated user JWT.');
assert(edge.includes('projectRefFromUrl(supabaseUrl) !== STAGING_PROJECT_REF'), 'Edge Function must fail closed outside staging.');
assert(edge.includes('p_actor_id: actor.id'), 'Edge Function must supply the server-derived actor id.');
assert(!edge.includes('body.actorId') && !edge.includes('payload.actorId'), 'Actor id must not be accepted from the request body.');
assert(operations.includes("['hold_payment', 'request_completion', 'release_payment']"), 'Edge action allowlist is incomplete.');

assert(config.includes('financeSandboxEnabled: true'), 'Staging frontend must explicitly opt in to the finance sandbox.');
assert(config.includes('financeSandboxFunction: "staging-finance-sandbox"'), 'Staging frontend must name the sandbox Edge Function explicitly.');
assert(finance.includes("FINANCE_SANDBOX_PROJECT_REF = 'zwkczgewzbsorbrjuzpb'"), 'Frontend sandbox adapter must be pinned to staging.');
assert(finance.includes("client.functions.invoke(functionName"), 'Frontend must invoke the Edge Function instead of finance RPCs directly.');
assert(!finance.includes("callRpc('record_order_payment'"), 'Browser must not call payment materialization RPC directly.');
assert(!finance.includes("callRpc('register_order_receivable'"), 'Browser must not call receivable materialization RPC directly.');
assert(!finance.includes("callRpc('release_order_receivable'"), 'Browser must not release escrow directly.');
assert(payments.includes('confirmSandboxPaymentFlow'), 'Payment confirmation must route through the staging sandbox.');
assert(payments.includes('requestSandboxCompletionFlow'), 'Completion request must route through the staging sandbox.');
assert(payments.includes('releaseSandboxCompletionFlow'), 'Payment release must route through the staging sandbox.');
assert(transactionalCanary.includes("'assertions', 15"), 'Transactional canary must preserve the 15-assertion evidence contract.');
assert(transactionalCanary.includes('rollback;'), 'Transactional canary must always roll back.');
assert(cleanupRunbook.includes("finance_runtime_order_%"), 'Runtime cleanup must stay scoped to the dedicated canary namespace.');
assert(cleanupRunbook.includes('delete from public.wallet_receivables') && cleanupRunbook.includes('delete from public.transactions') && cleanupRunbook.includes('delete from public.payments'), 'Runtime cleanup must dismantle the ledger in referential order.');

console.log('Staging finance sandbox authority contract passed.');
